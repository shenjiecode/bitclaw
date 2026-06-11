import { useState, useRef, useEffect } from "react";
import { IconSend } from "../../components/icons";

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Message {
  id: string;
  role: "user" | "assistant";
  text: string;
  time: string;
}

/* ------------------------------------------------------------------ */
/*  Message Bubble                                                     */
/* ------------------------------------------------------------------ */

function Bubble({ msg }: { msg: Message }) {
  const isUser = msg.role === "user";

  return (
    <div
      className={`flex ${isUser ? "justify-end" : "justify-start"} mb-4`}
    >
      <div
        className="max-w-[70%] rounded-sm px-4 py-2.5"
        style={{
          backgroundColor: isUser
            ? "var(--color-accent-subtle)"
            : "var(--color-ground)",
          border: isUser
            ? "none"
            : "1px solid var(--color-hairline-subtle)",
        }}
      >
        <p
          className="text-[14px] leading-relaxed"
          style={{ color: "var(--color-ink)" }}
        >
          {msg.text}
        </p>
        <p
          className="text-[11px] mt-1"
          style={{ color: "var(--color-ink-tertiary)" }}
        >
          {msg.time}
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyChat() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[300px]">
        <p className="text-[15px] leading-relaxed text-ink-secondary">
          Connect to PicoClaw to start a conversation.
        </p>
        <p className="text-[13px] mt-2 text-ink-tertiary leading-relaxed">
          Your messages and responses will appear here.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ChatPage                                                           */
/* ------------------------------------------------------------------ */

export function ChatPage() {
  const [messages, _setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  /* Auto-resize textarea */
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 160) + "px";
  }, [input]);

  const hasMessages = messages.length > 0;

  function handleSend() {
    const trimmed = input.trim();
    if (!trimmed) return;
    // TODO: send via WebSocket
    setInput("");
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
    }
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-6 shrink-0 border-b border-hairline-subtle">
        <h2 className="text-title font-medium tracking-[-0.018em] text-ink">
          Chat
        </h2>
        <span className="text-[13px] text-ink-tertiary select-none">
          Conversation with PicoClaw
        </span>
      </div>

      {/* Messages or empty state */}
      {hasMessages ? (
        <div className="flex-1 overflow-y-auto px-5 py-4">
          {messages.map((m) => (
            <Bubble key={m.id} msg={m} />
          ))}
          <div ref={messagesEndRef} />
        </div>
      ) : (
        <EmptyChat />
      )}

      {/* Input area */}
      <div className="px-5 pb-4 pt-2 shrink-0">
        <div
          className="flex items-end gap-2 rounded-sm px-3 py-2 transition-colors duration-150"
          style={{
            backgroundColor: "var(--color-ground)",
            border: isFocused
              ? "1px solid var(--color-accent)"
              : "1px solid var(--color-hairline)",
          }}
        >
          <textarea
            ref={textareaRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder="Message…"
            rows={1}
            className="flex-1 resize-none bg-transparent text-[15px] py-1.5 leading-snug focus:outline-none"
            style={{
              fontFamily: "inherit",
              color: "var(--color-ink)",
            }}
          />
          <button
            onClick={handleSend}
            disabled={!input.trim()}
            className="shrink-0 px-3 py-1.5 rounded-sm text-[13px] font-medium transition-colors duration-150 disabled:cursor-not-allowed"
            style={{
              backgroundColor: input.trim()
                ? "var(--color-accent)"
                : "var(--color-hairline)",
              color: input.trim() ? "#fff" : "var(--color-ink-tertiary)",
            }}
            onMouseEnter={(e) => {
              if (input.trim())
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--color-accent-hover)";
            }}
            onMouseLeave={(e) => {
              if (input.trim())
                (e.currentTarget as HTMLElement).style.backgroundColor =
                  "var(--color-accent)";
            }}
          >
            <IconSend className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}
