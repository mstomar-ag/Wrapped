import { useEffect, useState } from "react";
import { api, ArchiveEntry } from "../api";

const PHASE_ORDER = ["queued", "collecting", "copy", "aggregating", "rendering", "finishing"] as const;

const phaseLabel = (phase?: string) => {
  switch (phase) {
    case "queued":
      return "Queued";
    case "collecting":
      return "Collecting signals";
    case "copy":
      return "Writing copy";
    case "aggregating":
      return "Aggregating stats";
    case "rendering":
      return "Rendering video";
    case "finishing":
      return "Finishing up";
    default:
      return "Working";
  }
};

export const WrapProgress: React.FC<{
  entryId: string;
  subjectName: string;
  windowLabel?: string;
  onDone: (entry: ArchiveEntry) => void;
  onFailed: (error: string) => void;
}> = ({ entryId, subjectName, windowLabel, onDone, onFailed }) => {
  const [entry, setEntry] = useState<ArchiveEntry | null>(null);

  useEffect(() => {
    let alive = true;
    const poll = async () => {
      try {
        const e = await api.getArchiveEntry(entryId);
        if (!alive) return;
        setEntry(e);
        if (e.status === "ready") onDone(e);
        if (e.status === "failed") onFailed(e.error ?? "Render failed");
      } catch {
        /* retry */
      }
    };
    poll();
    const t = setInterval(poll, 800);
    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [entryId, onDone, onFailed]);

  const progress = entry?.progress ?? 2;
  const message = entry?.progressMessage ?? "Starting…";
  const phase = entry?.phase;

  return (
    <div className="card" style={{ maxWidth: 520 }}>
      <h2 style={{ marginTop: 0 }}>Cooking {subjectName}&apos;s reel</h2>
      {windowLabel && (
        <p className="muted" style={{ marginTop: -4 }}>
          Window: {windowLabel}
        </p>
      )}

      <div
        style={{
          height: 10,
          borderRadius: 99,
          background: "var(--panel-2)",
          overflow: "hidden",
          margin: "20px 0 12px",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${progress}%`,
            background: "linear-gradient(90deg, var(--accent), var(--warn))",
            transition: "width 0.4s ease",
          }}
        />
      </div>

      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <strong>{progress}%</strong>
        <span className="muted">{phaseLabel(phase)}</span>
      </div>

      <p style={{ margin: "0 0 16px", minHeight: 24 }}>{message}</p>

      <div className="gap-8" style={{ flexWrap: "wrap", marginBottom: 8 }}>
        {PHASE_ORDER.map((p) => {
          const currentIdx = phase
            ? PHASE_ORDER.indexOf(phase as (typeof PHASE_ORDER)[number])
            : 0;
          const pIdx = PHASE_ORDER.indexOf(p);
          const done = currentIdx >= 0 && pIdx >= 0 && pIdx < currentIdx;
          const active = p === phase;
          return (
            <span
              key={p}
              style={{
                fontSize: 11,
                padding: "4px 8px",
                borderRadius: 8,
                border: "1px solid var(--border)",
                background: active ? "var(--accent)" : done ? "var(--panel-2)" : "transparent",
                color: active ? "#fff" : "var(--muted)",
                opacity: done || active ? 1 : 0.45,
              }}
            >
              {phaseLabel(p)}
            </span>
          );
        })}
      </div>

      <p className="muted" style={{ fontSize: 12, marginTop: 12, marginBottom: 0 }}>
        First render can take 1–2 minutes while Remotion bundles. Re-rendering the same stats is instant from cache.
      </p>
    </div>
  );
};
