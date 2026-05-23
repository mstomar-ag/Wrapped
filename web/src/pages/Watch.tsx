import { useEffect, useRef, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ArchiveEntry } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import { fmtRange } from "../format";

export const Watch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<ArchiveEntry | null>(null);
  const [videoError, setVideoError] = useState(false);
  const polling = useRef(false);

  useEffect(() => {
    if (!id) return;
    setVideoError(false);
    let alive = true;

    const refresh = async () => {
      try {
        const e = await api.getArchiveEntry(id);
        if (!alive) return;
        setEntry(e);
        if (e.status === "ready" || e.status === "failed") polling.current = false;
      } catch {
        if (alive) setEntry(null);
      }
    };

    polling.current = true;
    refresh();
    const t = setInterval(() => {
      if (polling.current) void refresh();
    }, 2000);

    return () => {
      alive = false;
      clearInterval(t);
    };
  }, [id]);

  if (!entry) return <p className="muted">Loading…</p>;

  const canPlay = entry.status === "ready" && entry.hasVideo !== false;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1>{entry.subjectName}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {entry.windowLabel ?? fmtRange(entry.windowFrom, entry.windowTo)}
          </p>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {canPlay && id ? (
        <video
          key={id}
          controls
          preload="metadata"
          playsInline
          style={{ width: "100%", maxWidth: 480, borderRadius: 14, background: "#000" }}
          src={api.videoUrl(id)}
          onError={() => setVideoError(true)}
        />
      ) : entry.status === "ready" ? (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <strong>Video unavailable.</strong>
          <p className="muted" style={{ marginTop: 6 }}>
            {videoError || entry.hasVideo === false
              ? "The MP4 is missing on this machine (often a Docker vs local path). Generate again from this environment."
              : "Could not load the video."}
          </p>
        </div>
      ) : entry.status === "failed" ? (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <strong>Render failed.</strong>
          <p className="muted" style={{ marginTop: 6 }}>{entry.error ?? "Unknown error."}</p>
        </div>
      ) : (
        <div className="card">
          <div
            style={{
              height: 8,
              borderRadius: 99,
              background: "var(--panel-2)",
              overflow: "hidden",
              marginBottom: 12,
            }}
          >
            <div
              style={{
                height: "100%",
                width: `${entry.progress ?? 5}%`,
                background: "linear-gradient(90deg, var(--accent), var(--warn))",
                transition: "width 0.3s",
              }}
            />
          </div>
          <span className="spinner" /> &nbsp;
          {entry.progressMessage ?? "Rendering…"} ({entry.progress ?? 0}%)
        </div>
      )}

      <div className="row" style={{ marginTop: 24 }}>
        <Link to="/archive"><button className="ghost">Back to archive</button></Link>
        <Link to="/generate"><button>Generate another</button></Link>
      </div>
    </>
  );
};
