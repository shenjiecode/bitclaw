import { useState, useEffect } from "react";
import { useConnectionStore } from "./stores/connection";
import { useChatStore, initChatListener } from "./stores/chat";
import { ChatPage } from "./features/chat/ChatPage";
import { ArtifactsPage } from "./features/artifacts/ArtifactsPage";
import { WorkspacePage } from "./features/workspace/WorkspacePage";
import { ConfigPage } from "./features/config/ConfigPage";
import { IconChat, IconFolder, IconPackage, IconSettings } from "./components/icons";

type Page = "chat" | "artifacts" | "workspace" | "config";

function App() {
  const [page, setPage] = useState<Page>("chat");
  const { status, picoStatus, gatewayRunning, gatewayDetection, discover, startGateway, stopGateway } = useConnectionStore();
  const isConnected = status === "connected";

  // Auto-discover on first mount
  useEffect(() => { discover(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Init chat listener + load sessions when connected
  const { sessions, currentSessionKey, loadSessions, selectSession, deleteSession, newChat } = useChatStore();

  useEffect(() => { initChatListener(); }, []);

  useEffect(() => {
    if (isConnected) loadSessions();
  }, [isConnected]);

  function handleNewChat() {
    newChat();
    setPage("chat");
  }

  function handleSelectSession(key: string, uuid: string) {
    selectSession(key, uuid);
    setPage("chat");
  }

  // picoclaw 状态判断
  const hasBinary = !!picoStatus?.binary_path;
  const statusSummary = typeof picoStatus?.status_summary === "string"
    ? picoStatus.status_summary
    : null;

  return (
    <div className="flex h-screen bg-surface text-ink overflow-hidden">
      {/* Sidebar */}
      <aside
        className="w-50 shrink-0 flex flex-col select-none"
        style={{
          backgroundColor: "var(--color-ground)",
          borderRight: "1px solid var(--color-hairline-subtle)",
        }}
      >
        {/* App title */}
        <div className="h-14 flex items-center px-4">
          <span className="text-title font-medium tracking-[-0.018em]" style={{ color: "var(--color-ink)" }}>
            BitClaw
          </span>
        </div>

        {/* Navigation */}
        <nav className="px-2.5 py-1 space-y-px">
          <NavItem
            icon={<IconChat className="w-[18px] h-[18px] shrink-0" />}
            label="新聊天"
            active={page === "chat"}
            onClick={handleNewChat}
          />
          <NavItem
            icon={<IconPackage className="w-[18px] h-[18px] shrink-0" />}
            label="制品"
            active={page === "artifacts"}
            onClick={() => setPage("artifacts")}
          />

          <NavItem
            icon={<IconFolder className="w-[18px] h-[18px] shrink-0" />}
            label="工作区"
            active={page === "workspace"}
            onClick={() => setPage("workspace")}
          />

          <NavItem
            icon={<IconSettings className="w-[18px] h-[18px] shrink-0" />}
            label="设置"
            active={page === "config"}
            onClick={() => setPage("config")}
          />
        </nav>

        {/* Recent sessions */}
        {hasBinary && (
          <RecentSessions
            sessions={sessions}
            currentKey={currentSessionKey}
            onSelect={handleSelectSession}
            onDelete={deleteSession}
          />
        )}

        {/* Spacer */}
        <div className="flex-1" />

        {/* Status area */}
        <div className="mx-2.5 mb-3 space-y-1">

          {/* 未找到 PicoClaw 提示 */}
          {!hasBinary && picoStatus && (
            <button
              onClick={() => setPage("config")}
              className="flex items-center gap-2 w-full px-2.5 py-2 rounded-sm text-[11px] leading-snug transition-colors duration-150 cursor-pointer border-0 bg-transparent text-left"
              style={{ color: "var(--color-warning)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-warning)" }} />
              <span className="flex-1">未检测到 PicoClaw，点击设置路径</span>
            </button>
          )}

          {/* 配置有问题的提示 */}
          {hasBinary && statusSummary && statusSummary !== "ready_to_connect" && statusSummary !== "binary_not_found" && !isConnected && (
            <button
              onClick={() => setPage("config")}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-sm text-[11px] leading-none transition-colors duration-150 cursor-pointer border-0 bg-transparent text-left"
              style={{ color: "var(--color-ink-tertiary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: "var(--color-warning)" }} />
              <span className="flex-1 truncate">{statusSummaryLabel(statusSummary)}</span>
            </button>
          )}

          {/* Gateway */}
          {hasBinary && (
            <div className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-[11px] leading-none"
              style={{ color: "var(--color-ink-secondary)" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{ backgroundColor: gatewayRunning ? "var(--color-accent)" : "var(--color-ink-tertiary)" }} />
              <span className="flex-1 truncate">
                {gatewayRunning
                  ? gatewayDetection === "running_external" ? "网关（外部）" : "网关"
                  : "网关"}
              </span>
              {picoStatus?.binary_path && (
                gatewayRunning
                  ? gatewayDetection === "running_managed"
                    ? <button onClick={(e) => { e.stopPropagation(); stopGateway(); }} className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--color-destructive)" }}>停止</button>
                    : null
                  : <button onClick={(e) => { e.stopPropagation(); startGateway(); }} className="opacity-60 hover:opacity-100 transition-opacity" style={{ color: "var(--color-accent)" }}>启动</button>
              )}
            </div>
          )}

          {/* Connection */}
          {hasBinary && (
            <button
              onClick={() => setPage("config")}
              className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-sm text-[11px] leading-none transition-colors duration-150 cursor-pointer border-0 bg-transparent text-left"
              style={{ color: isConnected ? "var(--color-accent)" : "var(--color-ink-tertiary)" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.03)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
            >
              <span className="w-1.5 h-1.5 rounded-full shrink-0"
                style={{
                  backgroundColor: isConnected ? "var(--color-accent)" : "var(--color-ink-tertiary)",
                  opacity: status === "connecting" ? 0.45 : 1,
                  animation: status === "connecting" ? "pulse-opacity 1.2s ease-in-out infinite" : "none",
                }} />
              <span className="truncate">
                {isConnected ? "已连接" : status === "connecting" ? "连接中…" : "未连接"}
              </span>
            </button>
          )}
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface">
        <div key={page} className="flex-1 flex flex-col min-h-0" style={{ animation: "page-enter 200ms ease-out both" }}>
          {page === "chat" && <ChatPage />}
          {page === "artifacts" && <ArtifactsPage />}
          {page === "workspace" && <WorkspacePage />}
          {page === "config" && <ConfigPage />}
        </div>
      </main>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function statusSummaryLabel(s: string): string {
  const map: Record<string, string> = {
    config_not_found: "配置文件未找到",
    pico_not_enabled: "Pico 通道未启用",
    pico_enabled_no_token: "缺少 Token",
  };
  return map[s] ?? s;
}

/* ─── Nav Item ───────────────────────────────────────────── */

function NavItem({ icon, label, active, onClick }: {
  icon: React.ReactNode;
  label: string;
  active: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-sm text-[13px] leading-none transition-colors duration-150"
      style={{
        color: active ? "var(--color-accent)" : "var(--color-ink-secondary)",
        backgroundColor: active ? "var(--color-accent-subtle)" : "transparent",
      }}
      onMouseEnter={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.03)";
      }}
      onMouseLeave={(e) => {
        if (!active) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
    >
      <span style={{ color: active ? "var(--color-accent)" : "var(--color-ink-tertiary)", transition: "color 150ms ease" }}>
        {icon}
      </span>
      <span className={active ? "font-medium" : ""}>{label}</span>
    </button>
  );
}

/* ─── Recent Sessions (collapsible) ──────────────────────── */

function RecentSessions({ sessions, currentKey, onSelect, onDelete }: {
  sessions: import("./stores/chat").SessionMeta[];
  currentKey: string | null;
  onSelect: (key: string, uuid: string) => void;
  onDelete: (key: string) => void;
}) {
  const [expanded, setExpanded] = useState(true);

  return (
    <div className="mt-2 mx-1.5">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 w-full text-left px-2 py-1 rounded-sm text-[11px] font-medium uppercase tracking-[0.06em] transition-colors duration-150"
        style={{ color: "var(--color-ink-tertiary)" }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.03)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.backgroundColor = "transparent"; }}
      >
        <span
          className="text-[10px] transition-transform duration-150"
          style={{ transform: expanded ? "rotate(90deg)" : "rotate(0deg)" }}
        >
          ▸
        </span>
        <span>最近</span>
        <span className="ml-auto opacity-60">{sessions.length}</span>
      </button>

      {/* Session list */}
      {expanded && sessions.length > 0 && (
        <div className="space-y-px mt-0.5">
          {sessions.map((s) => {
            const isActive = s.key === currentKey;
            return (
              <div key={s.key} className="group relative">
                <button
                  onClick={() => onSelect(s.key, s.session_uuid)}
                  className="w-full text-left px-3 py-2 rounded-sm text-[12px] transition-colors duration-100 pr-8"
                  style={{
                    backgroundColor: isActive ? "var(--color-accent-subtle)" : "transparent",
                    color: isActive ? "var(--color-accent)" : "var(--color-ink-secondary)",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.03)";
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
                  }}
                >
                  <p className="truncate leading-snug">
                    {s.summary || "无标题"}
                  </p>
                  <p className="text-[10px] mt-0.5 truncate" style={{ color: "var(--color-ink-tertiary)" }}>
                    {s.message_count} 条消息 · {formatDate(s.updated_at)}
                  </p>
                </button>

                {/* Delete button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("确定删除该会话？")) onDelete(s.key);
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 opacity-0 group-hover:opacity-60 hover:!opacity-100 transition-opacity text-[12px] w-5 h-5 flex items-center justify-center rounded-sm"
                  style={{ color: "var(--color-ink-tertiary)" }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-destructive)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.color = "var(--color-ink-tertiary)"; }}
                >
                  ×
                </button>
              </div>
            );
          })}
        </div>
      )}

      {expanded && sessions.length === 0 && (
        <p className="text-[11px] px-3 py-2" style={{ color: "var(--color-ink-tertiary)" }}>
          暂无会话
        </p>
      )}
    </div>
  );
}

function formatDate(iso: string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    if (diffMins < 1) return "刚刚";
    if (diffMins < 60) return `${diffMins}分钟前`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}小时前`;
    const diffDays = Math.floor(diffHours / 24);
    if (diffDays < 7) return `${diffDays}天前`;
    return d.toLocaleDateString();
  } catch { return ""; }
}

export default App;
