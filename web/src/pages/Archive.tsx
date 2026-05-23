import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, ArchiveEntry } from "../api";
import { StatusBadge } from "../components/StatusBadge";

export const Archive: React.FC = () => {
  const [entries, setEntries] = useState<ArchiveEntry[]>([]);
  const [kind, setKind] = useState<string>("");

  const refresh = () => api.listArchive({ kind: kind || undefined, limit: 200 }).then((r) => setEntries(r.entries));

  useEffect(() => {
    refresh();
    const t = setInterval(refresh, 4000);
    return () => clearInterval(t);
  }, [kind]);

  const del = async (id: string) => {
    if (!confirm("Delete this wrap?")) return;
    await api.deleteArchive(id);
    refresh();
  };

  return (
    <>
      <h1>Archive</h1>
      <p className="muted">Every wrap ever generated. Click any to play.</p>

      <div className="row" style={{ marginBottom: 16 }}>
        <select value={kind} onChange={(e) => setKind(e.target.value)}>
          <option value="">All</option>
          <option value="member">Members</option>
          <option value="channel">Channels</option>
        </select>
      </div>

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Subject</th>
              <th>Range</th>
              <th>Created</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {entries.map((e) => (
              <tr key={e.id}>
                <td>
                  <Link to={`/archive/${e.id}`}>{e.subjectName}</Link>
                </td>
                <td className="muted">
                  {new Date(e.windowFrom).toLocaleDateString()} → {new Date(e.windowTo).toLocaleDateString()}
                </td>
                <td className="muted">{new Date(e.createdAt).toLocaleString()}</td>
                <td><StatusBadge status={e.status} /></td>
                <td><button className="ghost" onClick={() => del(e.id)}>Delete</button></td>
              </tr>
            ))}
            {entries.length === 0 && (
              <tr><td colSpan={5} className="muted" style={{ padding: 40, textAlign: "center" }}>No wraps yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};
