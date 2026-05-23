import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api, Member } from "../api";

const blank = (): Partial<Member> => ({
  id: "",
  name: "",
  socials: {},
});

export const Members: React.FC = () => {
  const [members, setMembers] = useState<Member[]>([]);
  const [adding, setAdding] = useState(false);
  const [draft, setDraft] = useState<Partial<Member>>(blank());

  const refresh = () => api.listMembers().then((r) => setMembers(r.members));
  useEffect(() => { refresh(); }, []);

  const save = async () => {
    if (!draft.id || !draft.name) return;
    await api.upsertMember(draft as Member);
    setAdding(false);
    setDraft(blank());
    refresh();
  };

  return (
    <>
      <div className="row" style={{ justifyContent: "space-between" }}>
        <h1>Members</h1>
        <button onClick={() => setAdding(true)}>Add member</button>
      </div>
      <p className="muted">Teammates who can be wrapped. Public handles only — no tokens.</p>

      {adding && (
        <div className="card" style={{ marginBottom: 16 }}>
          <h2 style={{ marginTop: 0 }}>New member</h2>
          <div className="grid" style={{ gap: 12 }}>
            <div className="gap-16">
              <div style={{ flex: 1 }}>
                <label>ID (slug)</label>
                <input value={draft.id} onChange={(e) => setDraft({ ...draft, id: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Name</label>
                <input value={draft.name} onChange={(e) => setDraft({ ...draft, name: e.target.value })} style={{ width: "100%" }} />
              </div>
            </div>
            <div className="gap-16">
              <div style={{ flex: 1 }}>
                <label>Role</label>
                <input value={draft.role ?? ""} onChange={(e) => setDraft({ ...draft, role: e.target.value })} style={{ width: "100%" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>Join date (for "since-joined" wraps)</label>
                <input type="date" value={draft.joinDate?.slice(0, 10) ?? ""} onChange={(e) => setDraft({ ...draft, joinDate: e.target.value })} style={{ width: "100%" }} />
              </div>
            </div>
            <div className="gap-16">
              <div style={{ flex: 1 }}>
                <label>Slack handle</label>
                <input value={draft.socials?.slack?.handle ?? ""} onChange={(e) => setDraft({ ...draft, socials: { ...draft.socials, slack: { ...draft.socials?.slack, handle: e.target.value } } })} style={{ width: "100%" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>GitHub username</label>
                <input value={draft.socials?.github?.username ?? ""} onChange={(e) => setDraft({ ...draft, socials: { ...draft.socials, github: { username: e.target.value } } })} style={{ width: "100%" }} />
              </div>
            </div>
            <div className="gap-16">
              <div style={{ flex: 1 }}>
                <label>Email</label>
                <input value={draft.socials?.email ?? ""} onChange={(e) => setDraft({ ...draft, socials: { ...draft.socials, email: e.target.value } })} style={{ width: "100%" }} />
              </div>
              <div style={{ flex: 1 }}>
                <label>X handle</label>
                <input value={draft.socials?.x?.handle ?? ""} onChange={(e) => setDraft({ ...draft, socials: { ...draft.socials, x: { handle: e.target.value } } })} style={{ width: "100%" }} />
              </div>
            </div>
            <div className="row">
              <button onClick={save}>Save</button>
              <button className="ghost" onClick={() => { setAdding(false); setDraft(blank()); }}>Cancel</button>
            </div>
          </div>
        </div>
      )}

      <div className="card" style={{ padding: 0, overflow: "hidden" }}>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Role</th>
              <th>Slack</th>
              <th>GitHub</th>
              <th>Email</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {members.map((m) => (
              <tr key={m.id}>
                <td><Link to={`/members/${m.id}`}>{m.name}</Link></td>
                <td className="muted">{m.role ?? "—"}</td>
                <td className="muted">{m.socials.slack?.handle ?? "—"}</td>
                <td className="muted">{m.socials.github?.username ?? "—"}</td>
                <td className="muted">{m.socials.email ?? "—"}</td>
                <td><Link to={`/members/${m.id}`}><button className="ghost">Open</button></Link></td>
              </tr>
            ))}
            {members.length === 0 && (
              <tr><td colSpan={6} className="muted" style={{ padding: 40, textAlign: "center" }}>No members. Add one to begin.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
};
