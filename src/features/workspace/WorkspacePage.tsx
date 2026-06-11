import { useEffect, useState, useCallback } from "react";
import { useWorkspaceStore } from "../../stores/workspace";
import { useConnectionStore } from "../../stores/connection";

/* ─── Main Page ──────────────────────────────────────────── */

export function WorkspacePage() {
  const { picoStatus } = useConnectionStore();
  const hasConfig = picoStatus !== null;
  const {
    files,
    breadcrumbs,
    currentDir,
    editingFile,
    loading,
    error,
    listFiles,
    openFile,
  } = useWorkspaceStore();

  // Load root when config is available
  useEffect(() => {
    if (hasConfig) {
      listFiles(null);
    }
  }, [hasConfig, listFiles]);

  // Navigate into a folder
  const handleNavigate = useCallback(
    (relPath: string) => {
      listFiles(relPath);
    },
    [listFiles]
  );

  // Click breadcrumb
  const handleBreadcrumb = useCallback(
    (relPath: string) => {
      listFiles(relPath || null);
    },
    [listFiles]
  );

  if (!hasConfig) {
    return (
      <div className="flex flex-col h-full">
        <Header />
        <div className="flex-1 flex items-center justify-center">
          <EmptyState message="Discover PicoClaw first (Settings)" />
        </div>
      </div>
    );
  }

  // File editor mode
  if (editingFile) {
    return (
      <div className="flex flex-col h-full">
        <FileEditor />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <Header>
        <ActionBar currentDir={currentDir} />
      </Header>

      {/* Breadcrumbs */}
      {breadcrumbs.length > 0 && (
        <div
          className="flex items-center gap-1 px-6 py-1.5 border-b border-hairline-subtle text-[12px] overflow-x-auto shrink-0"
          style={{ color: "var(--color-ink-tertiary)" }}
        >
          {breadcrumbs.map((bc, i) => (
            <span key={bc.rel_path} className="flex items-center gap-1 shrink-0">
              {i > 0 && (
                <span style={{ color: "var(--color-ink-tertiary)" }}>/</span>
              )}
              <button
                onClick={() => handleBreadcrumb(bc.rel_path)}
                className="hover:underline transition-colors"
                style={{
                  color:
                    i === breadcrumbs.length - 1
                      ? "var(--color-ink)"
                      : "var(--color-ink-tertiary)",
                }}
              >
                {bc.name}
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Column headers */}
      {files.length > 0 && (
        <div
          className="flex items-center gap-3 px-6 py-1.5 border-b border-hairline-subtle shrink-0"
          style={{ color: "var(--color-ink-tertiary)" }}
        >
          <span className="w-5 shrink-0" />
          <span className="flex-1 text-[11px] font-medium uppercase tracking-[0.05em]">
            Name
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.05em] w-20 text-right">
            Size
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.05em] w-36 text-right">
            Modified
          </span>
          <span className="w-24" /> {/* actions spacer */}
        </div>
      )}

      {/* Error */}
      {error && (
        <div
          className="mx-6 mt-3 px-3 py-2 rounded-sm text-[12px]"
          style={{ color: "var(--color-destructive)" }}
        >
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-[13px]" style={{ color: "var(--color-ink-tertiary)" }}>
            Loading…
          </p>
        </div>
      )}

      {/* File list */}
      {!loading && files.length > 0 && (
        <div className="flex-1 overflow-y-auto py-0.5">
          {files.map((f) => (
            <FileRow
              key={f.path}
              file={f}
              onNavigate={handleNavigate}
              onOpen={openFile}
            />
          ))}
        </div>
      )}

      {/* Empty */}
      {!loading && files.length === 0 && !error && (
        <div className="flex-1 flex items-center justify-center">
          <EmptyState message="Empty folder" />
        </div>
      )}
    </div>
  );
}

/* ─── Header ─────────────────────────────────────────────── */

function Header({ children }: { children?: React.ReactNode }) {
  return (
    <div className="h-14 flex items-center gap-3 px-6 shrink-0 border-b border-hairline-subtle">
      <h2 className="text-title font-medium tracking-[-0.018em] text-ink">
        Workspace
      </h2>
      <div className="flex-1" />
      {children}
    </div>
  );
}

/* ─── File Row ───────────────────────────────────────────── */

function FileRow({
  file,
  onNavigate,
  onOpen,
}: {
  file: import("../../stores/workspace").FileInfo;
  onNavigate: (relPath: string) => void;
  onOpen: (path: string) => void;
}) {
  const [showActions, setShowActions] = useState(false);
  const { deleteItem, renameItem } = useWorkspaceStore();
  const [renaming, setRenaming] = useState(false);
  const [newName, setNewName] = useState(file.name);

  function handleClick() {
    if (file.is_dir) {
      onNavigate(file.rel_path);
    } else {
      onOpen(file.path);
    }
  }

  async function handleDelete(e: React.MouseEvent) {
    e.stopPropagation();
    const label = file.is_dir ? "folder" : "file";
    if (!confirm(`Delete ${label} "${file.name}"?`)) return;
    await deleteItem(file.path);
  }

  function startRename(e: React.MouseEvent) {
    e.stopPropagation();
    setNewName(file.name);
    setRenaming(true);
  }

  async function confirmRename() {
    if (newName.trim() && newName !== file.name) {
      await renameItem(file.path, newName.trim());
    }
    setRenaming(false);
  }

  return (
    <div
      className="flex items-center gap-3 px-6 py-[7px] cursor-pointer select-none transition-colors duration-100 group"
      onClick={renaming ? undefined : handleClick}
      onMouseEnter={(e) => {
        setShowActions(true);
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--color-ground)";
      }}
      onMouseLeave={(e) => {
        setShowActions(false);
        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
    >
      {/* Icon */}
      <span
        className="w-5 shrink-0 text-center text-[14px]"
        style={{ color: "var(--color-ink-tertiary)" }}
      >
        {file.is_dir ? "📁" : fileIcon(file.name)}
      </span>

      {/* Name */}
      {renaming ? (
        <input
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") confirmRename();
            if (e.key === "Escape") setRenaming(false);
          }}
          onBlur={confirmRename}
          autoFocus
          onClick={(e) => e.stopPropagation()}
          className="flex-1 text-[13px] font-mono px-1 py-0.5 rounded-sm focus:outline-none"
          style={{
            backgroundColor: "var(--color-surface)",
            border: "1px solid var(--color-accent)",
            color: "var(--color-ink)",
          }}
        />
      ) : (
        <span className="flex-1 text-[13px] text-ink truncate">
          {file.name}
        </span>
      )}

      {/* Size */}
      {!file.is_dir && (
        <span className="text-[11px] text-ink-tertiary w-20 text-right font-mono shrink-0">
          {formatSize(file.size)}
        </span>
      )}
      {file.is_dir && <span className="w-20 shrink-0" />}

      {/* Modified */}
      <span className="text-[11px] text-ink-tertiary w-36 text-right shrink-0">
        {file.modified}
      </span>

      {/* Actions */}
      <div className="w-24 shrink-0 flex items-center justify-end gap-1">
        {showActions && !renaming && (
          <>
            <ActionButton onClick={startRename} title="Rename">
              ✏️
            </ActionButton>
            <ActionButton onClick={handleDelete} title="Delete">
              🗑️
            </ActionButton>
          </>
        )}
      </div>
    </div>
  );
}

function ActionButton({
  onClick,
  title,
  children,
}: {
  onClick: (e: React.MouseEvent) => void;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      title={title}
      className="w-6 h-6 rounded-sm flex items-center justify-center text-[12px] opacity-70 hover:opacity-100 transition-opacity"
      style={{ backgroundColor: "var(--color-surface)" }}
    >
      {children}
    </button>
  );
}

/* ─── Action Bar (New File, New Folder) ──────────────────── */

function ActionBar({ currentDir }: { currentDir: string | null }) {
  const { createFile, createFolder, workspaceRoot } = useWorkspaceStore();
  const [showNewFile, setShowNewFile] = useState(false);
  const [showNewFolder, setShowNewFolder] = useState(false);
  const [inputValue, setInputValue] = useState("");

  const basePath = currentDir
    ? `${workspaceRoot}/${currentDir}`
    : workspaceRoot;

  async function confirmNewFile() {
    const name = inputValue.trim();
    if (!name) return;
    const fullPath = `${basePath}/${name}`;
    await createFile(fullPath);
    setInputValue("");
    setShowNewFile(false);
  }

  async function confirmNewFolder() {
    const name = inputValue.trim();
    if (!name) return;
    const fullPath = `${basePath}/${name}`;
    await createFolder(fullPath);
    setInputValue("");
    setShowNewFolder(false);
  }

  return (
    <div className="flex items-center gap-1.5">
      {showNewFile && (
        <div className="flex items-center gap-1.5">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmNewFile();
              if (e.key === "Escape") {
                setShowNewFile(false);
                setInputValue("");
              }
            }}
            placeholder="filename.ext"
            autoFocus
            className="w-32 px-2 py-1 rounded-sm text-[12px] font-mono focus:outline-none"
            style={{
              backgroundColor: "var(--color-ground)",
              border: "1px solid var(--color-accent)",
              color: "var(--color-ink)",
            }}
          />
          <SmallBtn onClick={confirmNewFile}>OK</SmallBtn>
          <SmallBtn
            onClick={() => {
              setShowNewFile(false);
              setInputValue("");
            }}
          >
            ✕
          </SmallBtn>
        </div>
      )}
      {showNewFolder && (
        <div className="flex items-center gap-1.5">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") confirmNewFolder();
              if (e.key === "Escape") {
                setShowNewFolder(false);
                setInputValue("");
              }
            }}
            placeholder="folder-name"
            autoFocus
            className="w-32 px-2 py-1 rounded-sm text-[12px] font-mono focus:outline-none"
            style={{
              backgroundColor: "var(--color-ground)",
              border: "1px solid var(--color-accent)",
              color: "var(--color-ink)",
            }}
          />
          <SmallBtn onClick={confirmNewFolder}>OK</SmallBtn>
          <SmallBtn
            onClick={() => {
              setShowNewFolder(false);
              setInputValue("");
            }}
          >
            ✕
          </SmallBtn>
        </div>
      )}
      {!showNewFile && !showNewFolder && (
        <>
          <SmallBtn onClick={() => setShowNewFile(true)}>+ File</SmallBtn>
          <SmallBtn onClick={() => setShowNewFolder(true)}>+ Folder</SmallBtn>
        </>
      )}
    </div>
  );
}

function SmallBtn({
  onClick,
  children,
}: {
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="px-2.5 py-1 rounded-sm text-[11px] font-medium transition-colors duration-150"
      style={{
        color: "var(--color-ink-secondary)",
        border: "1px solid var(--color-hairline)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--color-ground)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor = "transparent";
      }}
    >
      {children}
    </button>
  );
}

/* ─── File Editor ────────────────────────────────────────── */

function FileEditor() {
  const { editingFile, saveFile, closeEditor, error } = useWorkspaceStore();
  const [content, setContent] = useState(editingFile?.content ?? "");
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    if (editingFile) {
      setContent(editingFile.content);
      setDirty(false);
    }
  }, [editingFile?.path]); // only reset on file change, not content

  if (!editingFile) return null;
  const file = editingFile;

  async function handleSave() {
    await saveFile(file.path, content);
    setDirty(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if ((e.metaKey || e.ctrlKey) && e.key === "s") {
      e.preventDefault();
      handleSave();
    }
  }

  return (
    <>
      {/* Editor header */}
      <div className="h-14 flex items-center gap-3 px-6 shrink-0 border-b border-hairline-subtle">
        <button
          onClick={closeEditor}
          className="text-[13px] transition-colors"
          style={{ color: "var(--color-ink-tertiary)" }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLElement).style.color = "var(--color-ink)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLElement).style.color =
              "var(--color-ink-tertiary)";
          }}
        >
          ← Back
        </button>
        <span className="text-[13px] font-mono text-ink truncate">
          {file.name}
        </span>
        <span className="text-[11px] font-mono" style={{ color: "var(--color-ink-tertiary)" }}>
          {formatSize(file.size)}
        </span>
        {dirty && (
          <span className="text-[11px]" style={{ color: "var(--color-ink-tertiary)" }}>
            • modified
          </span>
        )}
        <div className="flex-1" />
        <SmallBtn onClick={handleSave}>Save</SmallBtn>
        <span className="text-[10px]" style={{ color: "var(--color-ink-tertiary)" }}>
          ⌘S
        </span>
      </div>

      {error && (
        <div
          className="mx-6 mt-3 px-3 py-2 rounded-sm text-[12px]"
          style={{ color: "var(--color-destructive)" }}
        >
          {error}
        </div>
      )}

      <textarea
        value={content}
        onChange={(e) => {
          setContent(e.target.value);
          setDirty(true);
        }}
        onKeyDown={handleKeyDown}
        spellCheck={false}
        className="flex-1 w-full px-6 py-4 font-mono text-[13px] leading-relaxed resize-none focus:outline-none"
        style={{
          backgroundColor: "var(--color-surface)",
          color: "var(--color-ink)",
        }}
      />
    </>
  );
}

/* ─── Empty state ────────────────────────────────────────── */

function EmptyState({ message }: { message: string }) {
  return (
    <div className="text-center max-w-[280px]">
      <p className="text-[15px] leading-relaxed text-ink-secondary">{message}</p>
    </div>
  );
}

/* ─── Helpers ────────────────────────────────────────────── */

function formatSize(bytes: number): string {
  if (!bytes || bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  const val = bytes / Math.pow(1024, i);
  return `${val.toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}

function fileIcon(name: string): string {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  const map: Record<string, string> = {
    ts: "🟦",
    tsx: "🟦",
    js: "🟨",
    json: "📋",
    md: "📝",
    txt: "📄",
    rs: "🦀",
    py: "🐍",
    toml: "⚙️",
    yaml: "⚙️",
    yml: "⚙️",
    html: "🌐",
    css: "🎨",
    sql: "🗃️",
    sh: "🔧",
  };
  return map[ext] ?? "📄";
}
