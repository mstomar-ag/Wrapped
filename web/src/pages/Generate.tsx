import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ArchiveEntry, Member } from "../api";
import { DateRangePicker, RangeValue } from "../components/DateRangePicker";
import { WrapProgress } from "../components/WrapProgress";

export const Generate: React.FC = () => {
  const navigate = useNavigate();
  const [members, setMembers] = useState<Member[]>([]);
  const [selected, setSelected] = useState<string>("");
  const [range, setRange] = useState<RangeValue>({ kind: "preset", window: "last-week" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{ id: string; windowLabel?: string } | null>(null);

  useEffect(() => {
    api.listMembers().then((r) => {
      setMembers(r.members);
      if (r.members[0]) setSelected(r.members[0].id);
    });
  }, []);

  const submit = async () => {
    if (!selected) return;
    setBusy(true);
    setError(null);
    try {
      const body: { member: string; from?: string; to?: string; window?: string } =
        range.kind === "custom"
          ? { member: selected, from: range.from, to: range.to }
          : { member: selected, window: range.window };
      const { id, windowLabel } = await api.generate(body);
      setJob({ id, windowLabel });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  const member = members.find((m) => m.id === selected);

  if (job && member) {
    return (
      <WrapProgress
        entryId={job.id}
        subjectName={member.name}
        windowLabel={job.windowLabel}
        onDone={(entry: ArchiveEntry) => navigate(`/archive/${entry.id}`)}
        onFailed={(msg) => {
          setError(msg);
          setJob(null);
          setBusy(false);
        }}
      />
    );
  }

  return (
    <>
      <h1>Generate a wrap</h1>
      <p className="muted">Pick a teammate and a time range. We collect signals from all configured sources and render a 25-second reel.</p>

      <div className="grid" style={{ gap: 20, maxWidth: 640 }}>
        <div>
          <label>Member</label>
          <select value={selected} onChange={(e) => setSelected(e.target.value)} style={{ width: "100%" }}>
            {members.map((m) => (
              <option key={m.id} value={m.id}>
                {m.name} {m.role ? `· ${m.role}` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label>Time range</label>
          <DateRangePicker value={range} onChange={setRange} joinDate={member?.joinDate} />
        </div>

        {error && <div style={{ color: "var(--accent)" }}>{error}</div>}

        <div>
          <button type="button" onClick={submit} disabled={busy || !selected}>
            {busy ? (
              <>
                <span className="spinner" /> &nbsp;Starting…
              </>
            ) : (
              "Generate"
            )}
          </button>
        </div>
      </div>
    </>
  );
};
