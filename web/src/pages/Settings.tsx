import { useEffect, useState } from "react";
import { api, ScheduleConfig } from "../api";

export const Settings: React.FC = () => {
  const [cfg, setCfg] = useState<ScheduleConfig | null>(null);
  const [savedAt, setSavedAt] = useState<string | null>(null);

  useEffect(() => { api.getSchedule().then(setCfg); }, []);

  const save = async () => {
    if (!cfg) return;
    const next = await api.updateSchedule(cfg);
    setCfg(next);
    setSavedAt(new Date().toLocaleTimeString());
  };

  const runNow = async () => {
    await api.runNow();
    alert("Started a weekly run. Check Archive in a moment.");
  };

  if (!cfg) return <p className="muted">Loading…</p>;

  return (
    <>
      <h1>Settings</h1>
      <p className="muted">Configure the weekly auto-wrap job that DMs everyone their own reel.</p>

      <div className="card" style={{ maxWidth: 640 }}>
        <div className="grid" style={{ gap: 14 }}>
          <label>
            <input
              type="checkbox"
              checked={cfg.enabled}
              onChange={(e) => setCfg({ ...cfg, enabled: e.target.checked })}
            /> &nbsp; Enable weekly auto-wrap
          </label>

          <div>
            <label>Cron schedule</label>
            <input
              value={cfg.cron}
              onChange={(e) => setCfg({ ...cfg, cron: e.target.value })}
              style={{ width: "100%" }}
              placeholder="0 17 * * 5"
            />
            <p className="muted" style={{ fontSize: 12, marginTop: 6 }}>
              Default <code>0 17 * * 5</code> runs Fridays at 5pm. <a href="https://crontab.guru" target="_blank" rel="noreferrer">crontab.guru</a> for help.
            </p>
          </div>

          <div>
            <label>Window</label>
            <select value={cfg.window} onChange={(e) => setCfg({ ...cfg, window: e.target.value })} style={{ width: "100%" }}>
              <option value="last-week">Last week</option>
              <option value="last-month">Last month</option>
              <option value="last-quarter">Last 90 days</option>
            </select>
          </div>

          <div>
            <label>Post to</label>
            <select value={cfg.postTo} onChange={(e) => setCfg({ ...cfg, postTo: e.target.value as "dm" | "channel" })} style={{ width: "100%" }}>
              <option value="dm">Direct message each member</option>
              <option value="channel">A specific channel</option>
            </select>
          </div>

          {cfg.postTo === "channel" && (
            <div>
              <label>Channel ID</label>
              <input
                value={cfg.channelId ?? ""}
                onChange={(e) => setCfg({ ...cfg, channelId: e.target.value })}
                style={{ width: "100%" }}
                placeholder="C01234ABCDE"
              />
            </div>
          )}

          <div>
            <label>Timezone (optional)</label>
            <input
              value={cfg.timezone ?? ""}
              onChange={(e) => setCfg({ ...cfg, timezone: e.target.value })}
              style={{ width: "100%" }}
              placeholder="America/Los_Angeles"
            />
          </div>

          <div className="row">
            <button onClick={save}>Save</button>
            <button className="ghost" onClick={runNow}>Run now</button>
            {savedAt && <span className="muted">Saved at {savedAt}</span>}
          </div>
        </div>
      </div>
    </>
  );
};
