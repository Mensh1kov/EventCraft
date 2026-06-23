import React, { useCallback, useEffect, useRef, useState } from "react";
import { observer } from "mobx-react";
import { useParams } from "next/navigation";
import { Sparkles, X, Send, Trash2, GripVertical } from "lucide-react";
import MarkdownIt from "markdown-it";
import { cn } from "@plane/utils";

const md = new MarkdownIt({ breaks: true, linkify: false });
import { useAiChat } from "@/hooks/store/use-ai-chat";
import type { TAiChatMessage } from "@/store/ai-chat.store";

const MIN_WIDTH = 320;
const MAX_WIDTH = 860;
const DEFAULT_WIDTH = 384;

const MessageBubble = ({ message }: { message: TAiChatMessage }) => {
  const isUser = message.role === "user";
  return (
    <div className={cn("flex w-full", isUser ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "text-sm max-w-[80%] rounded-xl px-3 py-2",
          isUser ? "bg-accent-primary text-white" : "bg-surface-2 text-primary"
        )}
      >
        {isUser ? (
          <p className="break-words whitespace-pre-wrap">{message.content}</p>
        ) : (
          <div
            className="prose-sm prose-p:my-1 prose-p:leading-relaxed prose-headings:font-semibold prose-headings:mt-3 prose-headings:mb-1 prose-ul:my-1 prose-ul:pl-4 prose-ol:my-1 prose-ol:pl-4 prose-li:my-0.5 prose-strong:font-semibold prose-code:rounded prose-code:bg-black/10 prose-code:px-1 prose-code:py-0.5 prose-code:text-xs prose-code:font-mono prose-pre:rounded-lg prose-pre:bg-black/10 prose-pre:p-3 prose-pre:text-xs prose-pre:overflow-x-auto prose-hr:my-2 prose-hr:border-white/20 max-w-none break-words text-inherit prose"
            // eslint-disable-next-line react/no-danger
            dangerouslySetInnerHTML={{ __html: md.render(message.content) }}
          />
        )}
        {message.actions && message.actions.length > 0 && (
          <div className="mt-2 space-y-1 border-t border-white/20 pt-2">
            {message.actions.map((action) => (
              <div key={action.tool} className="text-xs opacity-80">
                ✅ {action.result}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

const TypingIndicator = () => (
  <div className="flex items-center justify-start gap-2.5 py-1">
    <div className="flex items-center justify-center rounded-full bg-accent-primary/10 p-1.5">
      <Sparkles className="h-3.5 w-3.5 animate-pulse text-accent-primary" />
    </div>
    <div className="flex items-center gap-1.5 rounded-2xl bg-surface-2 px-4 py-2.5">
      <span className="h-2 w-2 animate-bounce rounded-full bg-accent-primary [animation-delay:0ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-accent-primary [animation-delay:150ms]" />
      <span className="h-2 w-2 animate-bounce rounded-full bg-accent-primary [animation-delay:300ms]" />
      <span className="text-xs ml-1.5 text-secondary">думаю...</span>
    </div>
  </div>
);

export const AiChatPanel = observer(function AiChatPanel() {
  const { workspaceSlug } = useParams();
  const { isOpen, isLoading, messages, togglePanel, sendMessage, clearMessages } = useAiChat();
  const [input, setInput] = useState("");
  const [width, setWidth] = useState(DEFAULT_WIDTH);
  const isDragging = useRef(false);
  const startX = useRef(0);
  const startWidth = useRef(DEFAULT_WIDTH);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    if (isOpen) inputRef.current?.focus();
  }, [isOpen]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || isLoading || !workspaceSlug) return;
    setInput("");
    await sendMessage(workspaceSlug.toString(), text);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") togglePanel(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, togglePanel]);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startX.current = e.clientX;
      startWidth.current = width;
      document.body.style.cursor = "col-resize";
      document.body.style.userSelect = "none";
    },
    [width]
  );

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current) return;
      const delta = startX.current - e.clientX;
      const next = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, startWidth.current + delta));
      setWidth(next);
    };
    const onMouseUp = () => {
      if (!isDragging.current) return;
      isDragging.current = false;
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", onMouseUp);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", onMouseUp);
    };
  }, []);

  if (!isOpen) return null;

  return (
    <div
      className="shadow-xl fixed top-0 right-0 z-30 flex h-screen flex-col border-l border-subtle bg-surface-1"
      style={{ width }}
    >
      {/* Resize handle */}
      <div
        role="separator"
        aria-orientation="vertical"
        onMouseDown={onMouseDown}
        className="cursor-col-resize-group absolute top-0 left-0 flex h-full w-1 items-center justify-center transition-colors hover:bg-accent-primary/20"
        title="Потяни, чтобы изменить размер"
      >
        <GripVertical className="h-4 w-4 text-secondary opacity-0 transition-opacity group-hover:opacity-100" />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between border-b border-subtle px-4 py-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-accent-primary" />
          <span className="text-sm font-medium text-primary">AI Assistant</span>
        </div>
        <div className="flex items-center gap-1">
          {messages.length > 0 && (
            <button
              onClick={clearMessages}
              className="rounded p-1 text-secondary hover:bg-layer-transparent-hover hover:text-primary"
              title="Очистить чат"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          )}
          <button
            onClick={() => togglePanel(false)}
            className="rounded p-1 text-secondary hover:bg-layer-transparent-hover hover:text-primary"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-3">
        {messages.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 text-center">
            <Sparkles className="h-8 w-8 text-accent-primary opacity-50" />
            <p className="text-sm text-secondary">Чем могу помочь?</p>
            <div className="space-y-2">
              {["Покажи все проекты", "Создай задачу «Найти кейтеринг»", "Какие задачи на этой неделе?"].map((hint) => (
                <button
                  key={hint}
                  onClick={() => setInput(hint)}
                  className="text-xs hover:border-accent-primary block w-full rounded-lg border border-subtle px-3 py-2 text-left text-secondary hover:text-primary"
                >
                  {hint}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isLoading && <TypingIndicator />}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="border-t border-subtle p-3">
        <div className="focus-within:border-accent-primary flex items-end gap-2 rounded-xl border border-subtle bg-surface-2 px-3 py-2">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Напиши запрос... (Enter — отправить)"
            rows={1}
            className="text-sm max-h-32 flex-1 resize-none bg-transparent text-primary outline-none placeholder:text-secondary"
            style={{ height: "auto" }}
            onInput={(e) => {
              const el = e.currentTarget;
              el.style.height = "auto";
              el.style.height = `${el.scrollHeight}px`;
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            className="rounded-lg p-1.5 text-accent-primary hover:bg-layer-transparent-hover disabled:opacity-40"
          >
            <Send className="h-4 w-4" />
          </button>
        </div>
        <p className="text-xs mt-1 text-center text-secondary">Shift+Enter — новая строка · Esc — закрыть</p>
      </div>
    </div>
  );
});
