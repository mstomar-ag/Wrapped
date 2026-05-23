import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { api, ArchiveEntry, Member } from "../api";
import { StatusBadge } from "../components/StatusBadge";

export const MemberDetail: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [member, setMember] = useState<Member | null>(null);
  const [history, setHistory] = useState<ArchiveEntry[]>([]);

  const refresh = async () => {
    if (!id) return;
    setMember(await api.getMember(id));
    setHistory((await api.listArchive({ subject: id, limit: 50 })).entries);
  };

  useEffect(() => {
    refresh();
  }, [id]);

  if (!member) return <p className="muted">Loading…</p>;

  return (
    <>
      <Link to="/members" className="muted">
        ← Members
      </Link>
      <h1 style={{ marginTop: 8 }}>{member.name}</h1>
      <p className="muted">
        {member.role ?? "Teammate"} · joined{" "}
        {member.joinDate ? new Date(member.joinDate).toLocaleDateString() : "—"}
      </p>

      <h2>Handles</h2>
      <div className="card" style={{ padding: 16 }}>
        <table>
          <tbody>
            <tr>
              <th>Slack</th>
              <td>{member.socials.slack?.handle ?? "—"}</td>
            </tr>
            <tr>
              <th>GitHub</th>
              <td>{member.socials.github?.username ?? "—"}</td>
            </tr>
            <tr>
              <th>X</th>
              <td>{member.socials.x?.handle ?? "—"}</td>
            </tr>
            <tr>
              <th>Email</th>
              <td>{member.socials.email ?? "—"}</td>
            </tr>
            <tr>
              <th>LinkedIn</th>
              <td>{member.socials.linkedin?.handle ?? "—"}</td>
            </tr>
          </tbody>
        </table>
      </div>

      {/* Linked accounts (LinkedIn/Google OAuth) is intentionally hidden —
          the underlying flow isn't wired yet. Bring back when v2 self-link ships. */}

      <h2>Wrap history</h2>
      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Range</th>
              <th>Created</th>
              <th>Status</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {history.map((e) => (
              <tr key={e.id}>
                <td>
                  {new Date(e.windowFrom).toLocaleDateString()} →{" "}
                  {new Date(e.windowTo).toLocaleDateString()}
                </td>
                <td className="muted">{new Date(e.createdAt).toLocaleString()}</td>
                <td>
                  <StatusBadge status={e.status} />
                </td>
                <td>
                  <Link to={`/archive/${e.id}`}>
                    <button className="ghost">Open</button>
                  </Link>
                </td>
              </tr>
            ))}
            {history.length === 0 && (
              <tr>
                <td colSpan={4} className="muted" style={{ padding: 30, textAlign: "center" }}>
                  No wraps yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};
