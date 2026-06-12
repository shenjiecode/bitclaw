import { useEffect, useRef, useState } from "react";
import { useChatStore, initChatListener, type ChatMessage } from "../../stores/chat";
import { useConnectionStore } from "../../stores/connection";

export function ChatPage() {
  const isConnected = useConnectionStore((s) => s.status === "connected");
  const {
    currentSessionKey,
    messages,
    loading,
    sending,
    error,
    loadSessions,
    sendMessage,
  } = useChatStore();

  useEffect(() => { initChatListener(); }, []);
  useEffect(() => { if (isConnected) loadSessions(); }, [isConnected]);

  if (!isConnected) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center">
            <p className="text-[14px]" style={{ color: "var(--color-ink-tertiary)" }}>
              {useConnectionStore.getState().picoStatus?.binary_path
                ? "请先连接 PicoClaw"
                : "请先在设置中配置 PicoClaw 路径"}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header />

      {/* 消息列表 */}
      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[13px]" style={{ color: "var(--color-ink-tertiary)" }}>加载中…</p>
          </div>
        ) : messages.length === 0 ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-[14px]" style={{ color: "var(--color-ink-tertiary)" }}>
              {currentSessionKey ? "暂无消息" : "发送消息开始新对话"}
            </p>
          </div>
        ) : (
          <div className="max-w-2xl mx-auto py-6 px-6 space-y-1">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            {sending && <TypingIndicator />}
          </div>
        )}
      </div>

      {/* 错误提示 */}
      {error && (
        <div
          className="mx-6 mb-2 px-3 py-2 rounded-sm text-[12px]"
          style={{ color: "var(--color-destructive)", backgroundColor: "rgba(196, 74, 62, 0.05)" }}
        >
          {error}
        </div>
      )}

      {/* 输入框 */}
      <MessageInput onSend={sendMessage} disabled={sending} />
    </div>
  );
}

/* ─── 顶栏 ───────────────────────────────────────────────── */

function Header() {
  return (
    <div className="h-14 flex items-center gap-3 px-6 shrink-0 border-b border-hairline-subtle">
      <h2 className="text-title font-medium tracking-[-0.018em] text-ink">聊天</h2>
    </div>
  );
}

/* ─── 消息气泡 ───────────────────────────────────────────── */

function MessageBubble({ msg }: { msg: ChatMessage }) {
  // 💭 思考
  if (msg.role === "thought") {
    return (
      <div className="py-2">
        <details className="group">
          <summary className="text-[11px] font-medium tracking-[0.03em] cursor-pointer select-none" style={{ color: "var(--color-ink-tertiary)" }}>
            💭 思考过程…
          </summary>
          <div className="mt-1.5 px-3 py-2 rounded-sm text-[12px] leading-relaxed whitespace-pre-wrap"
            style={{ color: "var(--color-ink-tertiary)", backgroundColor: "var(--color-surface)", borderLeft: "2px solid var(--color-ink-tertiary)" }}>
            {msg.content}
          </div>
        </details>
      </div>
    );
  }

  // 🔧 工具调用
  if (msg.role === "tool_calls") {
    const calls = msg.toolCallsData || [];
    return (
      <div className="py-1.5">
        <details className="group">
          <summary
            className="px-3 py-2 rounded-sm text-[12px] flex items-center gap-2 cursor-pointer select-none"
            style={{ color: "var(--color-ink-tertiary)", backgroundColor: "var(--color-surface)" }}
          >
            <span>🔧</span>
            <span className="font-medium">工具调用（{calls.length}）</span>
          </summary>
          <div className="mt-1 space-y-1 px-3">
            {calls.map((call: any, idx: number) => (
              <div key={idx} className="py-1.5 border-b border-hairline-subtle last:border-0">
                <p className="text-[11px] font-medium" style={{ color: "var(--color-accent)" }}>
                  {call.function?.name || call.name || `工具 ${idx + 1}`}
                </p>
                {call.function?.arguments && (
                  <pre className="text-[10px] mt-1 whitespace-pre-wrap break-all max-h-24 overflow-y-auto" style={{ color: "var(--color-ink-tertiary)" }}>
                    {formatToolArgs(call.function.arguments)}
                  </pre>
                )}
              </div>
            ))}
          </div>
        </details>
      </div>
    );
  }

  // ⚙️ 工具结果
  if (msg.role === "tool") {
    if (!msg.content.trim()) return null;
    return (
      <div className="py-0.5">
        <details className="group">
          <summary className="text-[11px] cursor-pointer select-none" style={{ color: "var(--color-ink-tertiary)" }}>
            ⚙️ 工具返回结果
          </summary>
          <pre className="mt-1 px-3 py-2 rounded-sm text-[11px] leading-relaxed overflow-x-auto whitespace-pre-wrap max-h-48 overflow-y-auto"
            style={{ color: "var(--color-ink-secondary)", backgroundColor: "var(--color-surface)" }}>
            {msg.content}
          </pre>
        </details>
      </div>
    );
  }

  // 👤 用户消息 — 右对齐 + 右侧头像（微信风格）
  if (msg.role === "user") {
    return (
      <div className="py-3 flex justify-end items-start gap-2.5">
        <div className="max-w-[70%]">
          <div className="px-4 py-2.5 rounded-xl rounded-tr-sm text-[14px] leading-relaxed whitespace-pre-wrap break-words"
            style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}>
            {msg.content}
          </div>
        </div>
        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-medium mt-0.5"
          style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}>
          我
        </div>
      </div>
    );
  }

  // 🤖 AI 消息 — 左侧头像
  return (
    <div className="py-3">
      <div className="flex gap-3">
        <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-medium mt-0.5"
          style={{ backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>
          AI
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-[10px] font-medium tracking-[0.03em] mb-1" style={{ color: "var(--color-ink-tertiary)" }}>
            助手
          </p>
          <div className="text-[14px] leading-relaxed whitespace-pre-wrap break-words" style={{ color: "var(--color-ink)" }}>
            {msg.content}
          </div>
        </div>
      </div>
    </div>
  );
}

/* ─── 打字指示器 ─────────────────────────────────────────── */

function TypingIndicator() {
  return (
    <div className="py-3 flex items-center gap-3">
      <div className="w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-[11px] font-medium"
        style={{ backgroundColor: "var(--color-accent-subtle)", color: "var(--color-accent)" }}>
        AI
      </div>
      <div className="flex gap-1">
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "var(--color-ink-tertiary)", animationDelay: "0ms" }} />
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "var(--color-ink-tertiary)", animationDelay: "150ms" }} />
        <span className="w-1.5 h-1.5 rounded-full animate-bounce" style={{ backgroundColor: "var(--color-ink-tertiary)", animationDelay: "300ms" }} />
      </div>
    </div>
  );
}

/* ─── 消息输入框 ─────────────────────────────────────────── */

function MessageInput({ onSend, disabled }: { onSend: (text: string) => Promise<void>; disabled: boolean }) {
  const [text, setText] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    const el = textareaRef.current;
    if (el) {
      el.style.height = "auto";
      el.style.height = Math.min(el.scrollHeight, 160) + "px";
    }
  }, [text]);

  async function handleSend() {
    const trimmed = text.trim();
    if (!trimmed || disabled) return;
    setText("");
    await onSend(trimmed);
  }

  function handleKey(e: React.KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  return (
    <div className="shrink-0 px-6 py-4 border-t border-hairline-subtle" style={{ backgroundColor: "var(--color-surface)" }}>
      <div className="flex items-end gap-3 max-w-2xl mx-auto rounded-md px-4 py-3"
        style={{ backgroundColor: "var(--color-ground)", border: "1px solid var(--color-hairline)" }}>
        <textarea
          ref={textareaRef}
          value={text}
          onChange={(e) => setText(e.target.value)}
          onKeyDown={handleKey}
          placeholder="输入消息…（Enter 发送，Shift+Enter 换行）"
          rows={1}
          disabled={disabled}
          className="flex-1 resize-none text-[14px] leading-relaxed focus:outline-none disabled:opacity-40"
          style={{ backgroundColor: "transparent", color: "var(--color-ink)", maxHeight: "160px" }}
        />
        <button
          onClick={handleSend}
          disabled={!text.trim() || disabled}
          className="shrink-0 w-8 h-8 rounded-sm flex items-center justify-center transition-colors duration-150 disabled:opacity-30"
          style={{ backgroundColor: "var(--color-accent)", color: "#fff" }}
        >
          <svg className="w-4 h-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
            <line x1="22" y1="2" x2="11" y2="13" />
            <polygon points="22 2 15 22 11 13 2 9 22 2" />
          </svg>
        </button>
      </div>
    </div>
  );
}

/* ─── 工具函数 ───────────────────────────────────────────── */

/** 格式化工具调用的参数（尝试美化 JSON） */
function formatToolArgs(args: string): string {
  try {
    const obj = JSON.parse(args);
    return JSON.stringify(obj, null, 2);
  } catch {
    return args;
  }
}
