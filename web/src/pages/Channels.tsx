import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api";
import { DateRangePicker, RangeValue } from "../components/DateRangePicker";

export const Channels: React.FC = () => {
  const navigate = useNavigate();
  const [channel, setChannel] = useState("");
  const [range, setRange] = useState<RangeValue>({ kind: "preset", window: "last-week" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!channel.trim()) return;
    setBusy(true);
    setError(null);
    try {
      const body =
        range.kind === "custom"
          ? { channel: channel.trim(), from: range.from, to: range.to }
          : { channel: channel.trim(), window: range.window };
      const { id } = await api.channelWrap(body);
      navigate(`/archive/${id}`);
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  };

  return (
    <>
      <h1>Wrap a channel</h1>
      <p className="muted">
        Generate a reel for an entire Slack channel — top posters, busiest hours, biggest thread.
        Channel posts <strong>only happen via Slack slash command</strong>; wraps generated here stay
        in the centralized archive.
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
            Channel <strong>name</strong> (with or without <code>#</code>), or paste the channel ID if
            you have it. The bot must be a member of the channel.
          </p>
        </div>

        <div>
          <label>Time range</label>
          <DateRangePicker value={range} onChange={setRange} />
        </div>

        {error && <div style={{ color: "var(--accent)" }}>{error}</div>}

        <div>
          <button onClick={submit} disabled={busy || !channel.trim()}>
            {busy ? (
              <>
                <span className="spinner" /> &nbsp; Queueing…
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
