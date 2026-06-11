import { useState, useEffect } from "react";
import { open } from "@tauri-apps/plugin-dialog";
import { invoke } from "@tauri-apps/api/core";
import {
  useConnectionStore,
  statusSummaryText,
  type CandidatePath,
} from "../../stores/connection";

type SettingsTab = "general" | "config" | "security";

export function ConfigPage() {
  const [tab, setTab] = useState<SettingsTab>("general");

  return (
    <div className="flex flex-col h-full">
      {/* Header with tabs */}
      <div
        className="h-14 flex items-center gap-6 px-6 shrink-0 border-b border-hairline-subtle"
      >
        <h2 className="text-title font-medium tracking-[-0.018em] text-ink">
          Settings
        </h2>
        <nav className="flex items-center gap-1">
          <TabButton active={tab === "general"} onClick={() => setTab("general")}>
            General
          </TabButton>
          <TabButton active={tab === "config"} onClick={() => setTab("config")}>
            config.json
          </TabButton>
          <TabButton active={tab === "security"} onClick={() => setTab("security")}>
            .security.yml
          </TabButton>
        </nav>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto">
        {tab === "general" && <GeneralTab />}
        {tab === "config" && <ConfigEditorTab />}
        {tab === "security" && <SecurityEditorTab />}
      </div>
    </div>
  );
}

/* ─── Tab Button ─────────────────────────────────────────── */

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-3 py-1.5 rounded-sm text-[12px] font-medium transition-colors duration-150"
      style={{
        color: active ? "var(--color-ink)" : "var(--color-ink-tertiary)",
        backgroundColor: active ? "var(--color-ground)" : "transparent",
      }}
    >
      {children}
    </button>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  General Tab                                                  */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function GeneralTab() {
  const {
    status,
    picoStatus,
    scanResult,
    gatewayRunning,
    gatewayDetection,
    error,
    discover,
    scan,
    startGateway,
    stopGateway,
    connect,
    disconnect,
    setCustomPath,
  } = useConnectionStore();

  const isConnected = status === "connected";
  const isConnecting = status === "connecting";

  return (
    <div className="max-w-lg mx-auto py-8 px-6 space-y-8">
      {/* Global error */}
      {error && (
        <div
          className="px-4 py-3 rounded-md text-[13px]"
          style={{
            color: "var(--color-destructive)",
            backgroundColor: "rgba(196, 74, 62, 0.06)",
            border: "1px solid rgba(196, 74, 62, 0.15)",
          }}
        >
          {error}
        </div>
      )}

      {/* PicoClaw Binary */}
      <section className="space-y-3">
        <SectionLabel>PicoClaw Binary</SectionLabel>
        <BinaryPathCard
          currentPath={picoStatus?.binary_path ?? null}
          scanResult={scanResult}
          onSetPath={setCustomPath}
          onScan={scan}
          onDiscover={discover}
        />
      </section>

      {/* Gateway */}
      {picoStatus?.binary_path && (
        <section className="space-y-3">
          <SectionLabel>Gateway</SectionLabel>
          <GatewayCard
            running={gatewayRunning}
            detection={gatewayDetection}
            onStart={startGateway}
            onStop={stopGateway}
          />
        </section>
      )}

      {/* Connection */}
      <section className="space-y-3">
        <SectionLabel>Connection</SectionLabel>
        <ConnectionCard
          isConnected={isConnected}
          isConnecting={isConnecting}
          picoStatus={picoStatus}
          error={error}
          onConnect={connect}
          onDisconnect={disconnect}
        />
      </section>
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Config Editor Tab                                            */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function ConfigEditorTab() {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const dirty = content !== original;

  useEffect(() => { loadConfig(); }, []);

  async function loadConfig() {
    setLoading(true);
    try {
      const config = await invoke<object>("read_picoclaw_config", {});
      const formatted = JSON.stringify(config, null, 2);
      setContent(formatted);
      setOriginal(formatted);
      setParseError(null);
    } catch (e) {
      setToast(String(e));
    }
    setLoading(false);
  }

  function handleChange(text: string) {
    setContent(text);
    // Validate JSON in real-time
    try {
      JSON.parse(text);
      setParseError(null);
    } catch (e) {
      setParseError(String(e).replace("JSON.parse: ", "").replace("SyntaxError: ", ""));
    }
  }

  async function handleSave() {
    setSaving(true);
    try {
      const parsed = JSON.parse(content);
      await invoke("write_picoclaw_config", { config: parsed });
      const formatted = JSON.stringify(parsed, null, 2);
      setContent(formatted);
      setOriginal(formatted);
      setParseError(null);
      flashToast("Saved");
      // Re-discover since config may have changed
      await useConnectionStore.getState().discover();
    } catch (e) {
      flashToast(`Failed: ${e}`);
    }
    setSaving(false);
  }

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px]" style={{ color: "var(--color-ink-tertiary)" }}>Loading…</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-2 shrink-0 border-b border-hairline-subtle">
        <span className="text-[12px] font-mono" style={{ color: "var(--color-ink-tertiary)" }}>
          ~/.picoclaw/config.json
        </span>
        <div className="flex-1" />
        {dirty && (
          <span className="text-[11px]" style={{ color: "var(--color-ink-tertiary)" }}>
            • modified
          </span>
        )}
        <SmallBtn onClick={loadConfig} disabled={saving}>
          Reload
        </SmallBtn>
        <SmallBtn onClick={handleSave} disabled={!dirty || !!parseError || saving} accent>
          {saving ? "Saving…" : "Save"}
        </SmallBtn>
      </div>

      {/* Parse error */}
      {parseError && (
        <div
          className="px-6 py-2 text-[12px] shrink-0"
          style={{ color: "var(--color-destructive)", backgroundColor: "rgba(196, 74, 62, 0.05)" }}
        >
          Invalid JSON: {parseError}
        </div>
      )}

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => handleChange(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            if (dirty && !parseError) handleSave();
          }
        }}
        spellCheck={false}
        className="flex-1 w-full px-6 py-4 font-mono text-[13px] leading-relaxed resize-none focus:outline-none"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-ink)",
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          className="absolute bottom-4 right-6 text-[12px] px-3 py-1.5 rounded-sm"
          style={{
            backgroundColor: "var(--color-ground)",
            border: "1px solid var(--color-hairline-subtle)",
            color: "var(--color-ink-secondary)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */
/*  Security Editor Tab                                          */
/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */

function SecurityEditorTab() {
  const [content, setContent] = useState("");
  const [original, setOriginal] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [exists, setExists] = useState(true);

  const dirty = content !== original;

  useEffect(() => { loadSecurity(); }, []);

  async function loadSecurity() {
    setLoading(true);
    try {
      const result = await invoke<string | null>("read_security_yml", {});
      if (result === null) {
        setExists(false);
        setContent("");
        setOriginal("");
      } else {
        setExists(true);
        setContent(result);
        setOriginal(result);
      }
    } catch (e) {
      setToast(String(e));
    }
    setLoading(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      await invoke("write_security_yml", { content });
      setOriginal(content);
      setExists(true);
      flashToast("Saved");
    } catch (e) {
      flashToast(`Failed: ${e}`);
    }
    setSaving(false);
  }

  function flashToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 2500);
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-[13px]" style={{ color: "var(--color-ink-tertiary)" }}>Loading…</p>
      </div>
    );
  }

  if (!exists && !dirty) {
    return (
      <div className="max-w-lg mx-auto py-8 px-6 space-y-4">
        <SectionLabel>.security.yml</SectionLabel>
        <Card>
          <p className="text-[13px]" style={{ color: "var(--color-ink-tertiary)" }}>
            No <code className="font-mono">.security.yml</code> found. It will be created when you save.
          </p>
          <SmallBtn onClick={() => { setContent("channel_list:\n  pico:\n    settings:\n      token: \"\"\n"); }} accent>
            Create with template
          </SmallBtn>
        </Card>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Toolbar */}
      <div className="flex items-center gap-3 px-6 py-2 shrink-0 border-b border-hairline-subtle">
        <span className="text-[12px] font-mono" style={{ color: "var(--color-ink-tertiary)" }}>
          ~/.picoclaw/.security.yml
        </span>
        {dirty && (
          <span className="text-[11px]" style={{ color: "var(--color-ink-tertiary)" }}>
            • modified
          </span>
        )}
        <div className="flex-1" />
        <SmallBtn onClick={loadSecurity} disabled={saving}>Reload</SmallBtn>
        <SmallBtn onClick={handleSave} disabled={!dirty || saving} accent>
          {saving ? "Saving…" : "Save"}
        </SmallBtn>
      </div>

      {/* Warning */}
      <div
        className="px-6 py-2 text-[12px] shrink-0 flex items-center gap-2"
        style={{ backgroundColor: "rgba(180, 130, 20, 0.06)", color: "var(--color-ink-secondary)" }}
      >
        ⚠️ This file contains sensitive tokens. Handle with care.
      </div>

      {/* Editor */}
      <textarea
        value={content}
        onChange={(e) => setContent(e.target.value)}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key === "s") {
            e.preventDefault();
            if (dirty) handleSave();
          }
        }}
        spellCheck={false}
        className="flex-1 w-full px-6 py-4 font-mono text-[13px] leading-relaxed resize-none focus:outline-none"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-ink)",
        }}
      />

      {/* Toast */}
      {toast && (
        <div
          className="absolute bottom-4 right-6 text-[12px] px-3 py-1.5 rounded-sm"
          style={{
            backgroundColor: "var(--color-ground)",
            border: "1px solid var(--color-hairline-subtle)",
            color: "var(--color-ink-secondary)",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}

/* ─── Shared small components ────────────────────────────── */

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3
      className="text-[11px] font-medium uppercase tracking-[0.06em]"
      style={{ color: "var(--color-ink-tertiary)" }}
    >
      {children}
    </h3>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-md p-4 space-y-4"
      style={{
        backgroundColor: "var(--color-ground)",
        border: "1px solid var(--color-hairline-subtle)",
      }}
    >
      {children}
    </div>
  );
}

function SmallBtn({
  children,
  onClick,
  disabled = false,
  accent = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="px-3 py-1 rounded-sm text-[12px] font-medium transition-colors duration-150 disabled:opacity-40"
      style={{
        backgroundColor: accent ? "var(--color-accent)" : "transparent",
        color: accent ? "#fff" : "var(--color-ink-secondary)",
        border: accent ? "none" : "1px solid var(--color-hairline)",
        cursor: disabled ? "default" : "pointer",
      }}
    >
      {children}
    </button>
  );
}

function SmallButton({
  children,
  onClick,
  disabled = false,
  accent = false,
  destructive = false,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  accent?: boolean;
  destructive?: boolean;
}) {
  const base: React.CSSProperties = {
    padding: "5px 12px",
    borderRadius: "4px",
    fontSize: "12px",
    fontWeight: 500,
    transition: "all 0.15s",
    opacity: disabled ? 0.4 : 1,
    cursor: disabled ? "default" : "pointer",
  };

  const variant: React.CSSProperties = accent
    ? { backgroundColor: "var(--color-accent)", color: "#fff" }
    : destructive
      ? { color: "var(--color-destructive)", border: "1px solid rgba(196, 74, 62, 0.2)" }
      : { color: "var(--color-ink-secondary)", border: "1px solid var(--color-hairline)" };

  return (
    <button onClick={onClick} disabled={disabled} style={{ ...base, ...variant }}>
      {children}
    </button>
  );
}

function DetailRow({ label, value, accent, mono }: {
  label: string; value: string; accent?: boolean; mono?: boolean;
}) {
  return (
    <p>
      {label}:{" "}
      <span
        style={{ color: accent ? "var(--color-accent)" : "var(--color-ink-tertiary)" }}
        className={mono ? "font-mono" : ""}
      >
        {value}
      </span>
    </p>
  );
}

function StatusHint({ summary }: { summary: string }) {
  const hints: Record<string, string> = {
    binary_not_found: "PicoClaw binary not found. Click Auto Scan or set a custom path above.",
    config_not_found: "Config not found. Run 'picoclaw gateway' at least once to initialize.",
    pico_not_enabled: "Pico Channel not enabled. Edit config.json: channel_list.pico.enabled = true.",
    pico_enabled_no_token: "Pico Channel enabled but no token in config.json. Token may be in .security.yml — try connecting.",
  };
  const text = hints[summary];
  if (!text) return null;
  return (
    <p
      className="text-[12px] px-2 py-1.5 rounded-sm leading-relaxed"
      style={{ color: "var(--color-ink-secondary)", backgroundColor: "var(--color-surface)" }}
    >
      💡 {text}
    </p>
  );
}

/* ─── General Tab sub-components ─────────────────────────── */

function GatewayCard({ running, detection, onStart, onStop }: {
  running: boolean;
  detection: import("../../stores/connection").GatewayDetection | null;
  onStart: () => Promise<void>;
  onStop: () => Promise<void>;
}) {
  const isExternal = detection === "running_external";
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: running ? "var(--color-accent)" : "var(--color-ink-tertiary)" }} />
        <div className="flex-1">
          <span className="text-[13px] text-ink">
            {running
              ? isExternal ? "Running (external process)" : "Running"
              : "Stopped"}
          </span>
          {isExternal && (
            <p className="text-[11px] mt-0.5" style={{ color: "var(--color-ink-tertiary)" }}>
              A picoclaw gateway is already running. Start will kill it and restart.
            </p>
          )}
        </div>
        {running ? (
          !isExternal ? (
            <SmallButton onClick={onStop} destructive>Stop</SmallButton>
          ) : (
            <SmallButton onClick={onStart} accent>Restart</SmallButton>
          )
        ) : (
          <SmallButton onClick={onStart} accent>Start</SmallButton>
        )}
      </div>
    </Card>
  );
}

function ConnectionCard({ isConnected, isConnecting, picoStatus, error, onConnect, onDisconnect }: {
  isConnected: boolean; isConnecting: boolean;
  picoStatus: import("../../stores/connection").PicoClawStatus | null;
  error: string | null;
  onConnect: () => Promise<void>; onDisconnect: () => Promise<void>;
}) {
  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full shrink-0"
          style={{
            backgroundColor: isConnected ? "var(--color-accent)" : picoStatus?.pico_enabled ? "var(--color-ink-secondary)" : "var(--color-ink-tertiary)",
            opacity: isConnecting ? 0.45 : 1,
            animation: isConnecting ? "pulse-opacity 1.2s ease-in-out infinite" : "none",
          }} />
        <p className="text-[15px] font-medium text-ink">
          {isConnected ? "Connected" : isConnecting ? "Connecting…" : picoStatus ? statusSummaryText(picoStatus.status_summary) : "Not discovered"}
        </p>
      </div>
      {error && <p className="text-[12px] px-2 py-1 rounded-sm" style={{ color: "var(--color-destructive)" }}>{error}</p>}
      {picoStatus && (
        <div className="text-[12px] space-y-1 px-2 py-1.5 rounded-sm" style={{ color: "var(--color-ink-secondary)" }}>
          <DetailRow label="Pico Channel" value={picoStatus.pico_enabled ? "Enabled" : "Disabled"} accent={picoStatus.pico_enabled} />
          <DetailRow label="Token" value={picoStatus.has_token ? "Configured" : "Not in config.json"} accent={picoStatus.has_token} />
          {picoStatus.model_name && <DetailRow label="Model" value={picoStatus.model_name} mono />}
          <DetailRow label="Gateway" value={`${picoStatus.gateway_host}:${picoStatus.gateway_port}`} mono />
          {picoStatus.ws_url && <DetailRow label="WebSocket" value={picoStatus.ws_url} mono />}
        </div>
      )}
      {picoStatus && !isConnected && typeof picoStatus.status_summary === "string" && <StatusHint summary={picoStatus.status_summary} />}
      <div className="flex gap-2 pt-1">
        {picoStatus?.pico_enabled && !isConnected && (
          <SmallButton onClick={onConnect} disabled={isConnecting} accent>{isConnecting ? "Connecting…" : "Connect"}</SmallButton>
        )}
        {isConnected && <SmallButton onClick={onDisconnect} destructive>Disconnect</SmallButton>}
      </div>
    </Card>
  );
}

function BinaryPathCard({ currentPath, scanResult, onSetPath, onScan, onDiscover }: {
  currentPath: string | null;
  scanResult: { candidates: CandidatePath[] } | null;
  onSetPath: (path: string | null) => Promise<void>;
  onScan: () => Promise<void>;
  onDiscover: () => Promise<void>;
}) {
  const [customInput, setCustomInput] = useState("");
  const [scanning, setScanning] = useState(false);
  const [showCandidates, setShowCandidates] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const foundPaths = scanResult?.candidates.filter((c) => c.exists && c.is_executable) ?? [];

  function flashToast(msg: string) { setToast(msg); setTimeout(() => setToast(null), 2000); }

  async function handleScan() {
    setScanning(true);
    await onScan();
    setScanning(false);
    setShowCandidates(true);
    const result = useConnectionStore.getState().scanResult;
    if (result) {
      const found = result.candidates.filter((c) => c.exists && c.is_executable);
      if (found.length === 1 && !currentPath) {
        await onSetPath(found[0].path);
        await onDiscover();
        flashToast(`Auto-selected: ${found[0].path}`);
      }
    }
  }

  async function handleManualSet() {
    const trimmed = customInput.trim();
    if (!trimmed) return;
    try { await onSetPath(trimmed); setCustomInput(""); await onDiscover(); flashToast("Path applied"); }
    catch (e) { flashToast(`Failed: ${e}`); }
  }

  async function handleBrowse() {
    const selected = await open({ multiple: false, directory: false, title: "Select PicoClaw Binary" });
    if (typeof selected === "string" && selected) { await onSetPath(selected); await onDiscover(); flashToast(`Selected: ${selected}`); }
  }

  async function handleClear() { await onSetPath(null); await onDiscover(); flashToast("Reset to auto-detect"); }

  async function handlePickCandidate(path: string) { await onSetPath(path); setShowCandidates(false); await onDiscover(); flashToast(`Selected: ${path}`); }

  return (
    <Card>
      <div className="flex items-center gap-3">
        <span className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: currentPath ? "var(--color-accent)" : "var(--color-ink-tertiary)" }} />
        <div className="flex-1 min-w-0">
          {currentPath ? (
            <div className="flex items-center justify-between gap-2">
              <code className="text-[13px] font-mono text-ink truncate">{currentPath}</code>
              <button onClick={handleClear} className="text-[11px] text-ink-tertiary hover:text-destructive transition-colors shrink-0">Reset</button>
            </div>
          ) : (
            <p className="text-[13px]" style={{ color: "var(--color-ink-tertiary)" }}>Not found — click Auto Scan or set manually</p>
          )}
        </div>
      </div>
      <div className="flex gap-2">
        <input value={customInput} onChange={(e) => setCustomInput(e.target.value)}
          onKeyDown={async (e) => { if (e.key === "Enter") await handleManualSet(); }}
          type="text" placeholder="/path/to/picoclaw"
          className="flex-1 px-3 py-2 rounded-sm text-[13px] font-mono transition-colors duration-150 focus:outline-none"
          style={{ backgroundColor: "var(--color-ground)", border: "1px solid var(--color-hairline)", color: "var(--color-ink)" }}
          onFocus={(e) => { e.currentTarget.style.borderColor = "var(--color-accent)"; }}
          onBlur={(e) => { e.currentTarget.style.borderColor = "var(--color-hairline)"; }} />
        <SmallButton onClick={handleManualSet} disabled={!customInput.trim()} accent>Apply</SmallButton>
        <SmallButton onClick={handleBrowse}>Browse…</SmallButton>
      </div>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          <SmallButton onClick={handleScan} disabled={scanning}>{scanning ? "Scanning…" : "Auto Scan"}</SmallButton>
          {scanResult && (
            <button onClick={() => setShowCandidates(!showCandidates)}
              className="text-[11px] hover:underline transition-colors" style={{ color: "var(--color-ink-tertiary)" }}>
              {showCandidates ? "Hide" : "Show"} scan results
            </button>
          )}
        </div>
        {showCandidates && scanResult && (
          <div className="rounded-sm text-[12px] max-h-48 overflow-auto"
            style={{ backgroundColor: "var(--color-surface)", border: "1px solid var(--color-hairline-subtle)" }}>
            {foundPaths.length > 0 && (
              <div className="px-3 py-2 space-y-1.5">
                <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: "var(--color-accent)" }}>Found ({foundPaths.length})</p>
                {foundPaths.map((c) => (
                  <CandidateRow key={c.path} candidate={c} isCurrent={c.path === currentPath} onPick={() => handlePickCandidate(c.path)} />
                ))}
              </div>
            )}
            {scanResult.candidates.filter((c) => !c.exists).length > 0 && (
              <div className="px-3 py-2 space-y-1 border-t border-hairline-subtle">
                <p className="text-[10px] uppercase tracking-wide font-medium" style={{ color: "var(--color-ink-tertiary)" }}>Not found</p>
                {scanResult.candidates.filter((c) => !c.exists).map((c) => (
                  <CandidateRow key={c.path} candidate={c} onPick={undefined} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
      {toast && (
        <div className="text-[12px] px-3 py-1.5 rounded-sm transition-opacity"
          style={{ backgroundColor: "var(--color-surface)", color: "var(--color-ink-secondary)", border: "1px solid var(--color-hairline-subtle)" }}>
          ✓ {toast}
        </div>
      )}
    </Card>
  );
}

function CandidateRow({ candidate, isCurrent, onPick }: {
  candidate: CandidatePath; isCurrent?: boolean; onPick?: () => void;
}) {
  return (
    <div className="flex items-center gap-2 group py-0.5">
      <span className="w-1.5 h-1.5 rounded-full shrink-0"
        style={{ backgroundColor: candidate.exists ? "var(--color-accent)" : "var(--color-ink-tertiary)" }} />
      <code className="font-mono truncate flex-1 text-[11px]"
        style={{ color: candidate.exists ? "var(--color-ink)" : "var(--color-ink-tertiary)" }} title={candidate.path}>
        {candidate.path}
      </code>
      <span className="text-[10px] shrink-0" style={{ color: "var(--color-ink-tertiary)" }}>{candidate.source}</span>
      {onPick && !isCurrent && (
        <button onClick={onPick} className="text-[11px] opacity-0 group-hover:opacity-100 transition-opacity shrink-0 cursor-pointer"
          style={{ color: "var(--color-accent)" }}>Select</button>
      )}
      {isCurrent && <span className="text-[10px] font-medium shrink-0" style={{ color: "var(--color-accent)" }}>✓ current</span>}
    </div>
  );
}
