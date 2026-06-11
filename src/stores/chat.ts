import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import { listen, type UnlistenFn } from "@tauri-apps/api/event";

export interface SessionMeta {
  key: string;
  summary: string;
  message_count: number;
  channel: string;
  session_uuid: string;
  created_at: string;
  updated_at: string;
}

export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "thought" | "tool_calls" | "tool" | "system";
  content: string;
  timestamp: number;
  /** For assistant messages that get updated (streaming). */
  updated?: boolean;
  /** Raw tool_calls data for tool_calls messages. */
  toolCallsData?: any[];
}

interface ChatState {
  sessions: SessionMeta[];
  currentSessionKey: string | null;
  currentSessionUuid: string | null;
  messages: ChatMessage[];
  loading: boolean;
  sending: boolean;
  error: string | null;

  loadSessions: () => Promise<void>;
  selectSession: (key: string, uuid: string) => Promise<void>;
  deleteSession: (key: string) => Promise<void>;
  newChat: () => void;
  sendMessage: (content: string) => Promise<void>;
  _unlisten?: UnlistenFn;
}

let msgCounter = 0;

export const useChatStore = create<ChatState>((set, get) => ({
  sessions: [],
  currentSessionKey: null,
  currentSessionUuid: null,
  messages: [],
  loading: false,
  sending: false,
  error: null,

  loadSessions: async () => {
    try {
      const sessions = await invoke<SessionMeta[]>("list_sessions");
      set({ sessions });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  selectSession: async (key: string, uuid: string) => {
    set({ loading: true, error: null, currentSessionKey: key, currentSessionUuid: uuid, messages: [] });
    try {
      const raw = await invoke<{ role: string; content: string; reasoning?: string; tool_calls?: any }[]>("list_session_messages", { sessionKey: key });
      const messages: ChatMessage[] = [];
      raw.forEach((m, i) => {
        // Add reasoning as a separate thought message
        if (m.reasoning) {
          messages.push({
            id: `hist-thought-${i}`,
            role: "thought",
            content: m.reasoning,
            timestamp: 0,
          });
        }
        // Add tool_calls indicator
        if (m.tool_calls) {
          const calls = Array.isArray(m.tool_calls) ? m.tool_calls : [];
          messages.push({
            id: `hist-toolcalls-${i}`,
            role: "tool_calls",
            content: "",
            timestamp: 0,
            toolCallsData: calls,
          });
        }
        // Add the message itself (skip if content empty and it's a tool_calls assistant msg)
        if (m.content || !m.tool_calls) {
          messages.push({
            id: `hist-${i}`,
            role: normalizeRole(m.role),
            content: m.content,
            timestamp: 0,
          });
        }
      });
      set({ messages, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  deleteSession: async (key: string) => {
    try {
      await invoke("delete_session", { sessionKey: key });
      const { currentSessionKey } = get();
      if (currentSessionKey === key) {
        set({ currentSessionKey: null, currentSessionUuid: null, messages: [] });
      }
      await get().loadSessions();
    } catch (e) {
      set({ error: String(e) });
    }
  },

  newChat: () => {
    set({
      currentSessionKey: null,
      currentSessionUuid: null,
      messages: [],
      error: null,
    });
  },

  sendMessage: async (content: string) => {
    const { currentSessionUuid } = get();
    const userMsg: ChatMessage = {
      id: `user-${++msgCounter}`,
      role: "user",
      content,
      timestamp: Date.now(),
    };
    set((s) => ({ messages: [...s.messages, userMsg], sending: true, error: null }));

    // Send via WebSocket through the connection store
    const msg = {
      type: "message.send",
      session_id: currentSessionUuid || undefined,
      timestamp: Date.now(),
      payload: { content },
    };

    try {
      await invoke("send_picoclaw_message", { message: JSON.stringify(msg) });
    } catch (e) {
      set({ sending: false, error: String(e) });
    }
  },
}));

// Normalize picoclaw roles to our display roles
function normalizeRole(role: string): ChatMessage["role"] {
  switch (role) {
    case "user": return "user";
    case "assistant": return "assistant";
    case "tool": return "tool";
    case "system": return "system";
    default: return "assistant";
  }
}

// Listen for incoming WS messages and route them to the chat store
export async function initChatListener() {
  const store = useChatStore;
  if (store.getState()._unlisten) return;

  const unlisten = await listen<string>("picoclaw:message", (event) => {
    let parsed: any;
    try { parsed = JSON.parse(event.payload); } catch { return; }

    const type = parsed.type;
    const payload = parsed.payload || {};

    if (type === "message.create") {
      const kind = payload.kind || "";
      const content = payload.content || "";
      const messageId = payload.message_id || `msg-${++msgCounter}`;

      let role: ChatMessage["role"] = "assistant";
      if (kind === "thought") role = "thought";
      else if (kind === "tool_calls") role = "tool_calls";

      const msg: ChatMessage = {
        id: messageId,
        role,
        content,
        timestamp: parsed.timestamp || Date.now(),
      };

      store.setState((s) => {
        // If this message_id already exists, skip (dedup)
        if (s.messages.find((m) => m.id === messageId)) return s;
        return { messages: [...s.messages, msg], sending: false };
      });

      // Update session list after first response in new chat
      if (!store.getState().currentSessionKey) {
        const sessionId = parsed.session_id;
        if (sessionId) {
          store.setState({ currentSessionUuid: sessionId });
        }
        store.getState().loadSessions();
      }
    } else if (type === "message.update") {
      const messageId = payload.message_id;
      const content = payload.content || "";

      store.setState((s) => ({
        messages: s.messages.map((m) =>
          m.id === messageId ? { ...m, content, updated: true } : m
        ),
      }));
    } else if (type === "message.delete") {
      const messageId = payload.message_id;
      store.setState((s) => ({
        messages: s.messages.filter((m) => m.id !== messageId),
      }));
    } else if (type === "error") {
      const errMsg = payload.message || "Unknown error";
      store.setState({ error: errMsg, sending: false });
    }
  });

  store.setState({ _unlisten: unlisten });
}
