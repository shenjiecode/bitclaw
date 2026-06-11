import { useState } from "react";
import { useConnectionStore } from "./stores/connection";
import { ChatPage } from "./features/chat/ChatPage";
import { ArtifactsPage } from "./features/artifacts/ArtifactsPage";
import { WorkspacePage } from "./features/workspace/WorkspacePage";
import { ConfigPage } from "./features/config/ConfigPage";
import { IconChat, IconFolder, IconPackage, IconSettings } from "./components/icons";

type Page = "chat" | "artifacts" | "workspace" | "config";

const navItems: { id: Page; icon: typeof IconChat; label: string }[] = [
  { id: "chat", icon: IconChat, label: "Chat" },
  { id: "artifacts", icon: IconPackage, label: "Artifacts" },
  { id: "workspace", icon: IconFolder, label: "Workspace" },
  { id: "config", icon: IconSettings, label: "Settings" },
];

function App() {
  const [page, setPage] = useState<Page>("chat");
  const { status, picoStatus, gatewayRunning, gatewayDetection, discover, startGateway, stopGateway } = useConnectionStore();

  // Auto-discover on first mount if not yet discovered
  if (!picoStatus && status === "disconnected") {
    discover();
  }

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="flex h-screen bg-surface text-ink overflow-hidden">
      {/* Sidebar — like a book's table of contents page */}
      <aside
        className="w-50 shrink-0 flex flex-col select-none"
        style={{
          backgroundColor: "var(--color-ground)",
          borderRight: "1px solid var(--color-hairline-subtle)",
        }}
      >
        {/* App title */}
        <div className="h-14 flex items-center px-4">
          <span
            className="text-title font-medium tracking-[-0.018em]"
            style={{ color: "var(--color-ink)" }}
          >
            BitClaw
          </span>
        </div>

        {/* Navigation */}
        <nav className="flex-1 px-2.5 py-1 space-y-px">
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = page === item.id;
            return (
              <button
                key={item.id}
                onClick={() => setPage(item.id)}
                className="flex items-center gap-2.5 w-full text-left px-2.5 py-1.5 rounded-sm text-[13px] leading-none transition-colors duration-150"
                style={{
                  color: active
                    ? "var(--color-accent)"
                    : "var(--color-ink-secondary)",
                  backgroundColor: active
                    ? "var(--color-accent-subtle)"
                    : "transparent",
                }}
                onMouseEnter={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "rgba(0,0,0,0.03)";
                }}
                onMouseLeave={(e) => {
                  if (!active)
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "transparent";
                }}
              >
                <Icon
                  className="w-[18px] h-[18px] shrink-0"
                  style={{
                    color: active
                      ? "var(--color-accent)"
                      : "var(--color-ink-tertiary)",
                    transition: "color 150ms ease",
                  }}
                />
                <span className={active ? "font-medium" : ""}>
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Gateway & Connection status */}
        <div className="mx-2.5 mb-3 space-y-1">
          {/* Gateway */}
          <div
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-sm text-[11px] leading-none"
            style={{
              color: picoStatus ? "var(--color-ink-secondary)" : "var(--color-ink-tertiary)",
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: gatewayRunning ? "var(--color-accent)" : "var(--color-ink-tertiary)",
              }}
            />
            <span className="flex-1 truncate">
              {gatewayRunning
                ? gatewayDetection === "running_external"
                  ? "Gateway (external)"
                  : "Gateway"
                : "Gateway"}
            </span>
            {picoStatus?.binary_path && (
              gatewayRunning ? (
                gatewayDetection === "running_managed" ? (
                  <button
                    onClick={(e) => { e.stopPropagation(); stopGateway(); }}
                    className="opacity-60 hover:opacity-100 transition-opacity"
                    style={{ color: "var(--color-destructive)" }}
                  >
                    Stop
                  </button>
                ) : null
              ) : (
                <button
                  onClick={(e) => { e.stopPropagation(); startGateway(); }}
                  className="opacity-60 hover:opacity-100 transition-opacity"
                  style={{ color: "var(--color-accent)" }}
                >
                  Start
                </button>
              )
            )}
          </div>

          {/* Connection */}
          <button
            onClick={() => setPage("config")}
            className="flex items-center gap-2 w-full px-2.5 py-1.5 rounded-sm text-[11px] leading-none transition-colors duration-150 cursor-pointer border-0 bg-transparent text-left"
            style={{
              color: isConnected ? "var(--color-accent)" : "var(--color-ink-tertiary)",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "rgba(0,0,0,0.03)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
            }}
          >
            <span
              className="w-1.5 h-1.5 rounded-full shrink-0"
              style={{
                backgroundColor: isConnected ? "var(--color-accent)" : "var(--color-ink-tertiary)",
                opacity: isConnecting ? 0.45 : 1,
                animation: isConnecting ? "pulse-opacity 1.2s ease-in-out infinite" : "none",
              }}
            />
            <span className="truncate">
              {isConnected ? "Connected" : isConnecting ? "Connecting…" : "Not connected"}
            </span>
          </button>
        </div>
      </aside>

      {/* Main content */}
      <main className="flex-1 flex flex-col min-w-0 bg-surface">
        <div
          key={page}
          className="flex-1 flex flex-col min-h-0"
          style={{ animation: "page-enter 200ms ease-out both" }}
        >
          {page === "chat" && <ChatPage />}
          {page === "artifacts" && <ArtifactsPage />}
          {page === "workspace" && <WorkspacePage />}
          {page === "config" && <ConfigPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
