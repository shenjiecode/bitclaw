import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

export interface FileInfo {
  name: string;
  path: string;
  rel_path: string;
  is_dir: boolean;
  size: number;
  modified: string;
}

export interface Breadcrumb {
  name: string;
  rel_path: string;
}

export interface FileContent {
  name: string;
  path: string;
  content: string;
  size: number;
  modified: string;
}

interface WorkspaceState {
  files: FileInfo[];
  breadcrumbs: Breadcrumb[];
  workspaceRoot: string;
  currentDir: string | null; // relative path
  editingFile: FileContent | null;
  loading: boolean;
  error: string | null;

  // Actions
  listFiles: (dirPath?: string | null) => Promise<void>;
  openFile: (filePath: string) => Promise<void>;
  saveFile: (filePath: string, content: string) => Promise<void>;
  createFile: (filePath: string, content?: string) => Promise<void>;
  createFolder: (dirPath: string) => Promise<void>;
  deleteItem: (filePath: string) => Promise<void>;
  renameItem: (oldPath: string, newName: string) => Promise<void>;
  closeEditor: () => void;
  navigateUp: () => Promise<void>;
}

export const useWorkspaceStore = create<WorkspaceState>((set, get) => ({
  files: [],
  breadcrumbs: [],
  workspaceRoot: "",
  currentDir: null,
  editingFile: null,
  loading: false,
  error: null,

  listFiles: async (dirPath?: string | null) => {
    set({ loading: true, error: null, editingFile: null });
    try {
      const result = await invoke<{
        files: FileInfo[];
        breadcrumbs: Breadcrumb[];
        workspace_root: string;
      }>("list_workspace_files", {
        dirPath: dirPath || null,
      });
      set({
        files: result.files,
        breadcrumbs: result.breadcrumbs,
        workspaceRoot: result.workspace_root,
        currentDir: dirPath ?? null,
        loading: false,
      });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  openFile: async (filePath: string) => {
    set({ loading: true, error: null });
    try {
      const content = await invoke<FileContent>("read_workspace_file", {
        filePath,
      });
      set({ editingFile: content, loading: false });
    } catch (e) {
      set({ error: String(e), loading: false });
    }
  },

  saveFile: async (filePath: string, content: string) => {
    try {
      await invoke("write_workspace_file", { filePath, content });
      // Refresh the file info
      const updated = await invoke<FileContent>("read_workspace_file", {
        filePath,
      });
      set({ editingFile: updated });
    } catch (e) {
      set({ error: String(e) });
    }
  },

  createFile: async (filePath: string, content = "") => {
    try {
      await invoke("write_workspace_file", { filePath, content });
      await get().listFiles(get().currentDir);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  createFolder: async (dirPath: string) => {
    try {
      await invoke("create_directory", { dirPath });
      await get().listFiles(get().currentDir);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  deleteItem: async (filePath: string) => {
    try {
      await invoke("delete_workspace_item", { filePath });
      // If we deleted the currently open file, close editor
      if (get().editingFile?.path === filePath) {
        set({ editingFile: null });
      }
      await get().listFiles(get().currentDir);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  renameItem: async (oldPath: string, newName: string) => {
    try {
      await invoke("rename_workspace_item", { oldPath, newName });
      // If we renamed the currently open file, update it
      const editing = get().editingFile;
      if (editing && editing.path === oldPath) {
        const parent = oldPath.substring(
          0,
          oldPath.lastIndexOf("/") + 1
        );
        set({ editingFile: { ...editing, name: newName, path: parent + newName } });
      }
      await get().listFiles(get().currentDir);
    } catch (e) {
      set({ error: String(e) });
    }
  },

  closeEditor: () => set({ editingFile: null }),

  navigateUp: async () => {
    const { currentDir } = get();
    if (!currentDir) return;
    const parent = currentDir.includes("/")
      ? currentDir.substring(0, currentDir.lastIndexOf("/"))
      : null;
    await get().listFiles(parent);
  },
}));
