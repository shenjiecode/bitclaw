import { useState } from "react";
import {
  useConnectionStore,
  statusSummaryText,
} from "../../stores/connection";

export function ConfigPage() {
  const {
    status,
    picoStatus,
    error,
    discover,
    connect,
    disconnect,
    setCustomPath,
  } = useConnectionStore();

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-6 shrink-0 border-b border-hairline-subtle">
        <h2 className="text-title font-medium tracking-[-0.018em] text-ink">
          Settings
        </h2>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="max-w-lg mx-auto py-8 px-6 space-y-8">
          {/* PicoClaw Status */}
          <section className="space-y-3">
            <h3
              className="text-[11px] font-medium uppercase tracking-[0.06em]"
              style={{ color: "var(--color-ink-tertiary)" }}
            >
              PicoClaw Status
            </h3>

            <div
              className="rounded-md p-4 space-y-4"
              style={{
                backgroundColor: "var(--color-ground)",
                border: "1px solid var(--color-hairline-subtle)",
              }}
            >
              {/* Status indicator */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{
                      backgroundColor: isConnected
                        ? "var(--color-accent)"
                        : picoStatus?.pico_enabled
                          ? "var(--color-ink-secondary)"
                          : "var(--color-ink-tertiary)",
                      opacity: isConnecting ? 0.45 : 1,
                      animation: isConnecting
                        ? "pulse-opacity 1.2s ease-in-out infinite"
                        : "none",
                    }}
                  />
                  <div>
                    <p className="text-[15px] font-medium text-ink">
                      {isConnected
                        ? "Connected"
                        : isConnecting
                          ? "Connecting…"
                          : picoStatus
                            ? statusSummaryText(picoStatus.status_summary)
                            : "Not discovered"}
                    </p>
                    {picoStatus?.binary_path && (
                      <p className="text-[11px] text-ink-tertiary mt-0.5 font-mono truncate max-w-[300px]">
                        {picoStatus.binary_path}
                      </p>
                    )}
                    {picoStatus?.config_path && (
                      <p className="text-[11px] text-ink-tertiary font-mono truncate max-w-[300px]">
                        {picoStatus.config_path}
                      </p>
                    )}
                  </div>
                </div>

                {picoStatus?.ws_url && (
                  <code className="text-[11px] text-ink-tertiary font-mono bg-surface px-1.5 py-0.5 rounded-sm">
                    {picoStatus.ws_url}
                  </code>
                )}
              </div>

              {/* Error */}
              {error && (
                <p
                  className="text-[12px] px-2 py-1 rounded-sm"
                  style={{ color: "var(--color-destructive)" }}
                >
                  {error}
                </p>
              )}

              {/* Pico config info */}
              {picoStatus && (
                <div
                  className="text-[12px] space-y-1 px-2 py-1.5 rounded-sm"
                  style={{ color: "var(--color-ink-secondary)" }}
                >
                  <p>
                    Pico Channel:{" "}
                    <span
                      style={{
                        color: picoStatus.pico_enabled
                          ? "var(--color-accent)"
                          : "var(--color-ink-tertiary)",
                      }}
                    >
                      {picoStatus.pico_enabled ? "Enabled" : "Disabled"}
                    </span>
                  </p>
                  <p>
                    Token:{" "}
                    <span
                      style={{
                        color: picoStatus.has_token
                          ? "var(--color-accent)"
                          : "var(--color-ink-tertiary)",
                      }}
                    >
                      {picoStatus.has_token
                        ? "Configured"
                        : "Not in config.json (may be in .security.yml)"}
                    </span>
                  </p>
                  {picoStatus.model_name && (
                    <p>
                      Model:{" "}
                      <span className="font-mono">{picoStatus.model_name}</span>
                    </p>
                  )}
                  <p>
                    Gateway:{" "}
                    <span className="font-mono">
                      {picoStatus.gateway_host}:{picoStatus.gateway_port}
                    </span>
                  </p>
                </div>
              )}

              {/* Status hint for non-ready states */}
              {picoStatus &&
                !isConnected &&
                typeof picoStatus.status_summary === "string" && (
                  <StatusHint summary={picoStatus.status_summary} />
                )}

              {/* Actions */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => discover()}
                  disabled={isConnecting}
                  className="px-3.5 py-1.5 rounded-sm text-[13px] font-medium transition-colors duration-150 disabled:opacity-40"
                  style={{
                    backgroundColor: "var(--color-accent)",
                    color: "#fff",
                  }}
                  onMouseEnter={(e) => {
                    if (!isConnecting)
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "var(--color-accent-hover)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLElement).style.backgroundColor =
                      "var(--color-accent)";
                  }}
                >
                  {picoStatus ? "Re-scan" : "Discover"}
                </button>

                {picoStatus?.pico_enabled && !isConnected && (
                  <button
                    onClick={() => connect()}
                    disabled={isConnecting}
                    className="px-3.5 py-1.5 rounded-sm text-[13px] transition-colors duration-150 disabled:opacity-40"
                    style={{
                      color: "var(--color-ink-secondary)",
                      border: "1px solid var(--color-hairline)",
                    }}
                    onMouseEnter={(e) => {
                      if (!isConnecting)
                        (e.currentTarget as HTMLElement).style.backgroundColor =
                          "var(--color-ground)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                    }}
                  >
                    Connect
                  </button>
                )}

                {isConnected && (
                  <button
                    onClick={() => disconnect()}
                    className="px-3.5 py-1.5 rounded-sm text-[13px] transition-colors duration-150"
                    style={{
                      color: "var(--color-destructive)",
                      border: "1px solid rgba(196, 74, 62, 0.2)",
                    }}
                    onMouseEnter={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "rgba(196, 74, 62, 0.06)";
                    }}
                    onMouseLeave={(e) => {
                      (e.currentTarget as HTMLElement).style.backgroundColor =
                        "transparent";
                    }}
                  >
                    Disconnect
                  </button>
                )}
              </div>
            </div>
          </section>

          {/* Custom Binary Path */}
          <section className="space-y-3">
            <h3
              className="text-[11px] font-medium uppercase tracking-[0.06em]"
              style={{ color: "var(--color-ink-tertiary)" }}
            >
              PicoClaw Binary Path
            </h3>
            <CustomPathInput
              currentPath={picoStatus?.binary_path ?? null}
              onSetPath={setCustomPath}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

function StatusHint({ summary }: { summary: string }) {
  const hints: Record<string, string> = {
    binary_not_found:
      "PicoClaw binary not found. Install PicoClaw or set a custom path above.",
    config_not_found:
      "PicoClaw config not found. Run 'picoclaw gateway' at least once to initialize.",
    pico_not_enabled:
      "Pico Channel is not enabled. Edit your PicoClaw config.json and set channel_list.pico.enabled to true.",
    pico_enabled_no_token:
      "Pico Channel is enabled but no token found in config.json. Token may be in .security.yml. Try connecting.",
  };

  const text = hints[summary];
  if (!text) return null;

  return (
    <p
      className="text-[12px] px-2 py-1.5 rounded-sm leading-relaxed"
      style={{
        color: "var(--color-ink-secondary)",
        backgroundColor: "var(--color-surface)",
      }}
    >
      💡 {text}
    </p>
  );
}

function CustomPathInput({
  currentPath,
  onSetPath,
}: {
  currentPath: string | null;
  onSetPath: (path: string | null) => Promise<void>;
}) {
  const [value, setValue] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) {
      await onSetPath(trimmed);
      setValue("");
    }
  }

  async function handleClear() {
    await onSetPath(null);
    setValue("");
  }

  return (
    <div className="space-y-2">
      {currentPath && (
        <div className="flex items-center justify-between">
          <p className="text-[12px] font-mono text-ink-secondary truncate max-w-[300px]">
            {currentPath}
          </p>
          <button
            onClick={handleClear}
            className="text-[11px] text-ink-tertiary hover:text-destructive transition-colors shrink-0 ml-2"
          >
            Reset
          </button>
        </div>
      )}
      <form onSubmit={handleSubmit} className="flex gap-2">
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          type="text"
          placeholder="/path/to/picoclaw"
          className="flex-1 px-3 py-2 rounded-sm text-[13px] font-mono transition-colors duration-150 focus:outline-none"
          style={{
            backgroundColor: "var(--color-ground)",
            border: "1px solid var(--color-hairline)",
            color: "var(--color-ink)",
          }}
          onFocus={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--color-accent)";
          }}
          onBlur={(e) => {
            (e.currentTarget as HTMLElement).style.borderColor =
              "var(--color-hairline)";
          }}
        />
        <button
          type="submit"
          disabled={!value.trim()}
          className="px-4 py-2 rounded-sm text-[13px] font-medium transition-colors duration-150 shrink-0 disabled:opacity-40"
          style={{
            backgroundColor: "var(--color-accent)",
            color: "#fff",
          }}
          onMouseEnter={(e) => {
            if (value.trim())
              (e.currentTarget as HTMLElement).style.backgroundColor =
                "var(--color-accent-hover)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.backgroundColor =
              "var(--color-accent)";
          }}
        >
          Set
        </button>
      </form>
      <p className="text-[11px] text-ink-tertiary">
        Leave empty to auto-detect from PATH and common install locations.
      </p>
    </div>
  );
}
