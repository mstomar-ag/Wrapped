import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ArchiveEntry } from "../api";
import { StatusBadge } from "../components/StatusBadge";

export const Watch: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [entry, setEntry] = useState<ArchiveEntry | null>(null);

  useEffect(() => {
    if (!id) return;
    const refresh = () => api.getArchiveEntry(id).then(setEntry).catch(() => null);
    refresh();
    const t = setInterval(() => {
      if (entry?.status !== "ready" && entry?.status !== "failed") refresh();
    }, 2500);
    return () => clearInterval(t);
  }, [id, entry?.status]);

  if (!entry) return <p className="muted">Loading…</p>;

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between", marginBottom: 16 }}>
        <div>
          <h1>{entry.subjectName}</h1>
          <p className="muted" style={{ margin: 0 }}>
            {new Date(entry.windowFrom).toLocaleDateString()} → {new Date(entry.windowTo).toLocaleDateString()}
          </p>
        </div>
        <StatusBadge status={entry.status} />
      </div>

      {entry.status === "ready" && id ? (
        <video controls autoPlay style={{ width: "100%", maxWidth: 480, borderRadius: 14, background: "#000" }} src={api.videoUrl(id)} />
      ) : entry.status === "failed" ? (
        <div className="card" style={{ borderColor: "var(--accent)" }}>
          <strong>Render failed.</strong>
          <p className="muted" style={{ marginTop: 6 }}>{entry.error ?? "Unknown error."}</p>
        </div>
      ) : (
        <div className="card">
          <span className="spinner" /> &nbsp; Rendering… this usually takes about 30 seconds.
        </div>
      )}

      <div className="row" style={{ marginTop: 24 }}>
        <Link to="/archive"><button className="ghost">Back to archive</button></Link>
        <Link to="/generate"><button>Generate another</button></Link>
      </div>
    </>
  );
};
