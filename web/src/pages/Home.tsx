import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ArchiveEntry, Member } from "../api";
import { StatusBadge } from "../components/StatusBadge";
import { fmtDateTime, fmtRange } from "../format";

const dedupeRecent = (entries: ArchiveEntry[]): ArchiveEntry[] => {
  const out: ArchiveEntry[] = [];
  const keys = new Set<string>();
  for (const e of entries) {
    const key = `${e.kind}|${e.subject}|${e.windowFrom}|${e.windowTo}`;
    if (keys.has(key)) continue;
    keys.add(key);
    out.push(e);
  }
  return out;
};

export const Home: React.FC = () => {
  const [recent, setRecent] = useState<ArchiveEntry[]>([]);
  const [members, setMembers] = useState<Member[]>([]);

  useEffect(() => {
    api.listArchive({ limit: 12 }).then((r) => setRecent(dedupeRecent(r.entries).slice(0, 6)));
    api.listMembers().then((r) => setMembers(r.members));
  }, []);

  return (
    <>
      <h1>Wrapped</h1>
      <p className="muted">A weekly highlight reel of your team&apos;s work, on demand.</p>

      <div className="row row-wrap" style={{ marginBottom: 32 }}>
        <Link to="/generate"><button>Generate a wrap</button></Link>
        <Link to="/channels"><button className="ghost">Wrap a channel</button></Link>
        <Link to="/members"><button className="ghost">Manage members</button></Link>
      </div>

      <h2>Recent</h2>
      {recent.length === 0 ? (
        <p className="muted">No wraps yet. Generate one to get started.</p>
      ) : (
        <div className="recent-grid">
          {recent.map((e) => (
            <Link key={e.id} to={`/archive/${e.id}`} style={{ color: "inherit" }}>
              <div className="card" style={{ cursor: "pointer" }}>
                <div className="row" style={{ justifyContent: "space-between", marginBottom: 8 }}>
                  <strong style={{ fontSize: 18 }}>{e.subjectName}</strong>
                  <StatusBadge status={e.status} />
                </div>
                <div className="muted" style={{ fontSize: 13 }}>
                  {e.windowLabel ?? fmtRange(e.windowFrom, e.windowTo)}
                </div>
                {e.status === "ready" && e.hasVideo === false && (
                  <div style={{ fontSize: 12, marginTop: 8, color: "var(--accent)" }}>
                    Video missing — regenerate
                  </div>
                )}
                <div className="muted" style={{ fontSize: 12, marginTop: 8 }}>
                  {fmtDateTime(e.createdAt)} IST
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}

      <h2>Team</h2>
      <div className="grid grid-4">
        {members.map((m) => (
          <Link key={m.id} to={`/members/${m.id}`} style={{ color: "inherit" }}>
            <div className="card">
              <strong style={{ fontSize: 16 }}>{m.name}</strong>
              <div className="muted" style={{ fontSize: 12, marginTop: 6 }}>{m.role ?? "Teammate"}</div>
            </div>
          </Link>
        ))}
      </div>
    </>
  );
};
