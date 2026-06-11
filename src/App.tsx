import { useState } from "react";
import { useConnectionStore } from "./stores/connection";
import { ChatPage } from "./features/chat/ChatPage";
import { ArtifactsPage } from "./features/artifacts/ArtifactsPage";
import { FilesPage } from "./features/files/FilesPage";
import { ConfigPage } from "./features/config/ConfigPage";
import { IconChat, IconFolder, IconPackage, IconSettings } from "./components/icons";

type Page = "chat" | "artifacts" | "files" | "config";

const navItems: { id: Page; icon: typeof IconChat; label: string }[] = [
  { id: "chat", icon: IconChat, label: "Chat" },
  { id: "artifacts", icon: IconPackage, label: "Artifacts" },
  { id: "files", icon: IconFolder, label: "Files" },
  { id: "config", icon: IconSettings, label: "Settings" },
];

function App() {
  const [page, setPage] = useState<Page>("chat");
  const { status, picoStatus, discover } = useConnectionStore();

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

        {/* Connection status */}
        <button
          onClick={() => setPage("config")}
          className="flex items-center gap-2 mx-2.5 mb-3 px-2.5 py-1.5 rounded-sm text-[11px] leading-none transition-colors duration-150 cursor-pointer border-0 bg-transparent w-auto text-left"
          style={{
            color: isConnected
              ? "var(--color-accent)"
              : "var(--color-ink-tertiary)",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "rgba(0,0,0,0.03)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "transparent";
          }}
        >
          <span
            className="w-1.5 h-1.5 rounded-full shrink-0"
            style={{
              backgroundColor: isConnected
                ? "var(--color-accent)"
                : "var(--color-ink-tertiary)",
              opacity: isConnecting ? 0.45 : 1,
              animation: isConnecting
                ? "pulse-opacity 1.2s ease-in-out infinite"
                : "none",
            }}
          />
          <span className="truncate">
            {isConnected
              ? "Connected"
              : isConnecting
                ? "Connecting…"
                : "Disconnected"}
          </span>
        </button>
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
          {page === "files" && <FilesPage />}
          {page === "config" && <ConfigPage />}
        </div>
      </main>
    </div>
  );
}

export default App;
