import { create } from "zustand";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core";

// Mirrors the Rust PicoStatusSummary enum
export type PicoStatusSummary =
  | "binary_not_found"
  | "config_not_found"
  | "pico_not_enabled"
  | "pico_enabled_no_token"
  | "ready_to_connect"
  | { config_error: string };

export interface PicoClawStatus {
  binary_path: string | null;
  config_path: string | null;
  pico_enabled: boolean;
  has_token: boolean;
  gateway_host: string;
  gateway_port: number;
  ws_url: string | null;
  model_name: string | null;
  status_summary: PicoStatusSummary;
}

interface ConnectionState {
  status: "disconnected" | "connecting" | "connected";
  picoStatus: PicoClawStatus | null;
  error: string | null;

  discover: () => Promise<void>;
  connect: () => Promise<void>;
  disconnect: () => Promise<void>;
  send: (content: string) => Promise<void>;
  setCustomPath: (path: string | null) => Promise<void>;

  // Internal
  _unlistenWs?: UnlistenFn;
  _unlistenStatus?: UnlistenFn;
}

export const useConnectionStore = create<ConnectionState>((set, get) => ({
  status: "disconnected",
  picoStatus: null,
  error: null,

  discover: async () => {
    set({ error: null });
    try {
      const status = await invoke<PicoClawStatus>("discover_picoclaw");
      set({ picoStatus: status });

      // Auto-connect if ready
      if (
        typeof status.status_summary === "string" &&
        status.status_summary === "ready_to_connect"
      ) {
        get().connect();
      }
    } catch (e) {
      set({ error: String(e) });
    }
  },

  connect: async () => {
    const { picoStatus, status: currentStatus } = get();
    if (currentStatus === "connected" || currentStatus === "connecting") return;

    if (!picoStatus?.ws_url) {
      set({ error: "No WebSocket URL available. Check PicoClaw config." });
      return;
    }

    set({ status: "connecting", error: null });

    try {
      // Try to get token from config
      let token: string | null = null;
      try {
        token = await invoke<string | null>("get_pico_token", {});
      } catch {
        // Token may be in .security.yml which we can't read — try without token
      }

      // Set up event listeners before connecting
      const unlistenMsg = await listen<string>("picoclaw:message", (event) => {
        // Forward to subscribers
        window.dispatchEvent(
          new CustomEvent("bitclaw:ws-message", { detail: event.payload })
        );
      });

      const unlistenStatus = await listen<string>(
        "picoclaw:connection-status",
        (event) => {
          if (event.payload === "connected") {
            set({ status: "connected", error: null });
          } else {
            set({ status: "disconnected" });
            get()._unlistenWs?.();
            get()._unlistenStatus?.();
            set({ _unlistenWs: undefined, _unlistenStatus: undefined });
          }
        }
      );

      set({ _unlistenWs: unlistenMsg, _unlistenStatus: unlistenStatus });

      await invoke("connect_picoclaw", {
        url: picoStatus.ws_url,
        token: token || undefined,
      });
    } catch (e) {
      set({
        status: "disconnected",
        error: String(e),
      });
      get()._unlistenWs?.();
      get()._unlistenStatus?.();
      set({ _unlistenWs: undefined, _unlistenStatus: undefined });
    }
  },

  disconnect: async () => {
    try {
      await invoke("disconnect_picoclaw");
    } catch {
      // Ignore disconnect errors
    }
    get()._unlistenWs?.();
    get()._unlistenStatus?.();
    set({
      status: "disconnected",
      _unlistenWs: undefined,
      _unlistenStatus: undefined,
    });
  },

  send: async (content: string) => {
    const msg = {
      type: "message.send",
      timestamp: Date.now(),
      payload: { content },
    };
    await invoke("send_picoclaw_message", { message: JSON.stringify(msg) });
  },

  setCustomPath: async (path: string | null) => {
    await invoke("set_picoclaw_binary_path", { path });
    // Re-discover with new path
    await get().discover();
  },
}));

/** Helper to get status summary as readable string. */
export function statusSummaryText(summary: PicoStatusSummary): string {
  if (typeof summary === "string") {
    const map: Record<string, string> = {
      binary_not_found: "PicoClaw not found",
      config_not_found: "Config file not found",
      pico_not_enabled: "Pico Channel not enabled",
      pico_enabled_no_token: "Pico Channel enabled (no token in config.json)",
      ready_to_connect: "Ready to connect",
    };
    return map[summary] ?? summary;
  }
  return `Config error: ${summary.config_error}`;
}
