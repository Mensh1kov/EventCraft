import { action, makeObservable, observable, runInAction } from "mobx";
// services
import { AIService } from "@plane/services";
import type { TChatRawMessage, TChatToolAction } from "@plane/services";
import type { CoreRootStore } from "./root.store";

let messageCounter = 0;
const generateId = (): string => `msg-${Date.now()}-${++messageCounter}`;

const aiService = new AIService();

// Tools that mutate data the UI needs to reflect immediately after the AI responds.
const REFETCH_MAP: Record<string, (root: CoreRootStore, workspaceSlug: string) => void> = {
  create_project: (root, slug) => root.projectRoot.project.fetchProjects(slug),
  create_event_from_template: (root, slug) => root.projectRoot.project.fetchProjects(slug),
  create_issue: (root, slug) => root.projectRoot.project.fetchProjects(slug),
  create_vendor: (root, slug) => root.vendor.fetchVendors(slug),
  update_vendor: (root, slug) => root.vendor.fetchVendors(slug),
  delete_vendor: (root, slug) => root.vendor.fetchVendors(slug),
  // link_vendor_to_issue: issue-level SWR cache is invalidated via revalidateIfStale on open
};

export type TAiChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  actions?: TChatToolAction[];
};

export interface IAiChatStore {
  // observables
  isOpen: boolean;
  isLoading: boolean;
  messages: TAiChatMessage[];
  // actions
  togglePanel: (open?: boolean) => void;
  sendMessage: (workspaceSlug: string, content: string) => Promise<void>;
  clearMessages: () => void;
}

export class AiChatStore implements IAiChatStore {
  // observables
  isOpen: boolean = false;
  isLoading: boolean = false;
  messages: TAiChatMessage[] = [];
  // Provider-specific raw history kept opaque to the UI. Echoed back on every
  // request so the LLM still sees prior tool_use / tool_result blocks (and the
  // UUIDs they carry) instead of starting fresh and hallucinating IDs.
  rawHistory: TChatRawMessage[] = [];

  constructor(private rootStore: CoreRootStore) {
    makeObservable(this, {
      isOpen: observable.ref,
      isLoading: observable.ref,
      messages: observable,
      togglePanel: action,
      sendMessage: action,
      clearMessages: action,
    });
  }

  togglePanel = (open?: boolean) => {
    this.isOpen = open !== undefined ? open : !this.isOpen;
  };

  sendMessage = async (workspaceSlug: string, content: string) => {
    const userMessage: TAiChatMessage = {
      id: generateId(),
      role: "user",
      content,
    };

    const outgoingHistory: TChatRawMessage[] = [...this.rawHistory, { role: "user", content }];

    runInAction(() => {
      this.messages.push(userMessage);
      this.isLoading = true;
    });

    try {
      const result = await aiService.chat(workspaceSlug, { messages: outgoingHistory });

      runInAction(() => {
        this.messages.push({
          id: generateId(),
          role: "assistant",
          content: result.response,
          actions: result.actions,
        });
        // Trust the server's view of the conversation: it includes the assistant
        // tool_use blocks we never want the model to lose.
        this.rawHistory = result.messages ?? outgoingHistory;
      });

      // Trigger refetches for tools that mutated server-side data.
      const toolsUsed = new Set(result.actions?.map((a: TChatToolAction) => a.tool) ?? []);
      for (const tool of toolsUsed) {
        REFETCH_MAP[tool]?.(this.rootStore, workspaceSlug);
      }
    } catch {
      runInAction(() => {
        this.messages.push({
          id: generateId(),
          role: "assistant",
          content: "Произошла ошибка. Попробуй ещё раз.",
        });
        // Roll back the optimistic user turn so a retry doesn't double-post it.
        this.rawHistory = outgoingHistory.slice(0, -1);
      });
    } finally {
      runInAction(() => {
        this.isLoading = false;
      });
    }
  };

  clearMessages = () => {
    this.messages = [];
    this.rawHistory = [];
  };
}
