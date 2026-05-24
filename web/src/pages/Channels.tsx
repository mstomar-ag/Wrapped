import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api, ArchiveEntry } from "../api";
import { DateRangePicker, RangeValue } from "../components/DateRangePicker";
import { WrapProgress } from "../components/WrapProgress";

export const Channels: React.FC = () => {
  const navigate = useNavigate();
  const [channel, setChannel] = useState<string>("");
  const [range, setRange] = useState<RangeValue>({ kind: "preset", window: "last-week" });
  const [quality, setQuality] = useState<"standard" | "high">("standard");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [job, setJob] = useState<{ id: string; windowLabel?: string } | null>(null);

  const submit = async () => {
    if (!channel.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        range.kind === "custom"
          ? { channel: channel.trim(), from: range.from, to: range.to, quality }
          : { channel: channel.trim(), window: range.window, quality };
      const res = await api.channelWrap(body);
      setJob({ id: res.id, windowLabel: (res as { windowLabel?: string }).windowLabel });
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  if (job) {
    return (
      <WrapProgress
        entryId={job.id}
        subjectName={`#${channel.replace(/^#/, "")}`}
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
      <h1>Wrap a channel</h1>
      <p className="muted">
        Pick a Slack channel and a time range. We summarize the channel's chatter —
        top posters, busiest hours, biggest thread. (No GitHub data — channels are
        Slack-only.)
      </p>

      <div className="grid" style={{ gap: 20, maxWidth: 640 }}>
        <div>
          <label>Channel</label>
          <input
            placeholder="wrapped-test"
            value={channel}
            onChange={(e) => setChannel(e.target.value)}
            style={{ width: "100%" }}
          />
          <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
            Channel name (with or without the <code>#</code>). The bot must already be a
            member of the channel. Paste a channel ID (<code>C…</code>) if you have one.
          </p>
        </div>

        <div>
          <label>Time range</label>
          <DateRangePicker value={range} onChange={setRange} />
        </div>

        <div>
          <label>Quality</label>
          <select
            value={quality}
            onChange={(e) => setQuality(e.target.value as "standard" | "high")}
            style={{ width: "100%" }}
          >
            <option value="standard">Standard — 720×1280 (default, ~1 min)</option>
            <option value="high">High — 1080×1920 (~2× render time)</option>
          </select>
        </div>

        {error && <div style={{ color: "var(--accent)" }}>{error}</div>}

        <div>
          <button type="button" onClick={submit} disabled={busy || !channel.trim()}>
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
