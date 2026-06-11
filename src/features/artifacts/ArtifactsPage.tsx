/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

interface Artifact {
  id: string;
  name: string;
  kind: "file" | "link" | "note";
  summary: string;
  createdAt: string;
}

/* ------------------------------------------------------------------ */
/*  Artifact Card                                                      */
/* ------------------------------------------------------------------ */

function Card({ item }: { item: Artifact }) {
  return (
    <div
      className="rounded-sm px-4 py-3 transition-colors duration-150 cursor-pointer"
      style={{
        backgroundColor: "var(--color-ground)",
        border: "1px solid var(--color-hairline-subtle)",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--color-surface)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--color-hairline)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.backgroundColor =
          "var(--color-ground)";
        (e.currentTarget as HTMLElement).style.borderColor =
          "var(--color-hairline-subtle)";
      }}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-[14px] font-medium text-ink truncate">
            {item.name}
          </p>
          <p className="text-[13px] text-ink-secondary mt-0.5 line-clamp-2 leading-relaxed">
            {item.summary}
          </p>
        </div>
        <span
          className="text-[11px] shrink-0 whitespace-nowrap mt-0.5"
          style={{ color: "var(--color-ink-tertiary)" }}
        >
          {item.createdAt}
        </span>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  Empty State                                                        */
/* ------------------------------------------------------------------ */

function EmptyArtifacts() {
  return (
    <div className="flex-1 flex items-center justify-center">
      <div className="text-center max-w-[280px]">
        <p className="text-[15px] leading-relaxed text-ink-secondary">
          No artifacts yet.
        </p>
        <p className="text-[13px] mt-2 text-ink-tertiary leading-relaxed">
          Items from your conversations will appear here.
        </p>
      </div>
    </div>
  );
}

/* ------------------------------------------------------------------ */
/*  ArtifactsPage                                                      */
/* ------------------------------------------------------------------ */

export function ArtifactsPage() {
  const items: Artifact[] = []; // TODO: fetch from store / WebSocket

  const hasItems = items.length > 0;

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="h-14 flex items-center justify-between px-6 shrink-0 border-b border-hairline-subtle">
        <div className="flex items-center gap-3">
          <h2 className="text-title font-medium tracking-[-0.018em] text-ink">
            Artifacts
          </h2>
          <span className="text-[13px] text-ink-tertiary select-none">
            {items.length} {items.length === 1 ? "item" : "items"}
          </span>
        </div>
      </div>

      {/* List or empty */}
      {hasItems ? (
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-2">
          {items.map((item) => (
            <Card key={item.id} item={item} />
          ))}
        </div>
      ) : (
        <EmptyArtifacts />
      )}
    </div>
  );
}
