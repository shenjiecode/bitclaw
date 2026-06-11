import { create } from "zustand";

export interface Artifact {
  id: string;
  name: string;
  filePath: string;
  createdAt: string;
  tags: string[];
}

interface ArtifactsState {
  artifacts: Artifact[];
  loading: boolean;

  fetchArtifacts: () => Promise<void>;
  addArtifact: (artifact: Omit<Artifact, "id" | "createdAt">) => Promise<void>;
  removeArtifact: (id: string) => Promise<void>;
}

export const useArtifactsStore = create<ArtifactsState>((set) => ({
  artifacts: [],
  loading: false,

  fetchArtifacts: async () => {
    set({ loading: true });
    try {
      const { invoke } = await import("@tauri-apps/api/core");
      const artifacts = await invoke<Artifact[]>("list_artifacts");
      set({ artifacts });
    } catch {
      // TODO: handle error
    } finally {
      set({ loading: false });
    }
  },

  addArtifact: async (artifact) => {
    const { invoke } = await import("@tauri-apps/api/core");
    const created = await invoke<Artifact>("create_artifact", { artifact });
    set((s) => ({ artifacts: [...s.artifacts, created] }));
  },

  removeArtifact: async (id) => {
    const { invoke } = await import("@tauri-apps/api/core");
    await invoke("delete_artifact", { id });
    set((s) => ({ artifacts: s.artifacts.filter((a) => a.id !== id) }));
  },
}));
