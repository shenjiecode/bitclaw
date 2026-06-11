/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface FileItem {
  name: string;
  path: string;
  kind: "file" | "folder";
  size?: string;
  modifiedAt?: string;
}

/* ------------------------------------------------------------------ */
/*  File Row                                                           */
/* ------------------------------------------------------------------ */

function Row({ file }: { file: FileItem }) {
  const isFolder = file.kind === "folder";

  return (
    <div
      className="flex items-center gap-3 px-3 py-2 rounded-sm transition-colors duration-150 cursor-pointer select-none"
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--color-ground)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "transparent";
      }}
    >
      {/* Icon */}
      <span
        className="shrink-0 text-[15px] leading-none"
        style={{ color: "var(--color-ink-tertiary)" }}
      >
        {isFolder ? "▸" : "—"}
      </span>

      {/* Name */}
      <span className="flex-1 text-[14px] text-ink truncate">
        {file.name}
      </span>

      {/* Meta */}
      {file.size && (
        <span className="text-[11px] text-ink-tertiary shrink-0 w-16 text-right font-mono">
          {file.size}
        </span>
      )}
      {file.modifiedAt && (
        <span className="text-[11px] text-ink-tertiary shrink-0 w-24 text-right">
          {file.modifiedAt}
        </span>
      )}
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyFiles() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[280px]">
        <p className="text-[15px] leading-relaxed text-ink-secondary">
          No workspace files.
        </p>
        <p className="text-[13px] mt-2 text-ink-tertiary leading-relaxed">
          Connect to PicoClaw to browse files.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  FilesPage                                                          */
/* ------------------------------------------------------------------ */

export function FilesPage() {
  const files: FileItem[] = []; // TODO: fetch from store / WebSocket

  const hasFiles = files.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 flex items-center gap-3 px-6 shrink-0 border-b border-hairline-subtle">
        <h2 className="text-title font-medium tracking-[-0.018em] text-ink">
          Files
        </h2>
        <span className="text-[13px] text-ink-tertiary select-none">
          Workspace
        </span>
      </div>

      {/* Column headers (only when files exist) */}
      {hasFiles && (
        <div
          className="flex items-center gap-3 px-6 py-2 border-b border-hairline-subtle"
          style={{ color: "var(--color-ink-tertiary)" }}
        >
          <span className="shrink-0 w-5" />
          <span className="flex-1 text-[11px] font-medium uppercase tracking-[0.05em]">
            Name
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.05em] w-16 text-right">
            Size
          </span>
          <span className="text-[11px] font-medium uppercase tracking-[0.05em] w-24 text-right">
            Modified
          </span>
        </div>
      )}

      {/* List or empty */}
      {hasFiles ? (
        <div className="flex-1 overflow-y-auto py-1">
          {files.map((f, i) => (
            <Row key={f.path || i} file={f} />
          ))}
        </div>
      ) : (
        <EmptyFiles />
      )}
    </div>
  );
}
