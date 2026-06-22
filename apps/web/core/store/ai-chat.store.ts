import { action, makeObservable, observable, runInAction } from "mobx";
// services
import { AIService } from "@plane/services";
import type { TChatRawMessage, TChatToolAction } from "@plane/services";

let messageCounter = 0;
const generateId = (): string => `msg-${Date.now()}-${++messageCounter}`;

const aiService = new AIService();

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

  constructor() {
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
