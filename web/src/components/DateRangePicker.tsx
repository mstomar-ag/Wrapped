import { useEffect, useState } from "react";
import { api } from "../api";

export type RangeValue =
  | { kind: "preset"; window: string }
  | { kind: "custom"; from: string; to: string };

const PRESETS = [
  { value: "last-week", label: "Last 7 days" },
  { value: "yesterday", label: "Yesterday only" },
  { value: "this-month", label: "This month" },
  { value: "last-month", label: "Last month" },
  { value: "last-quarter", label: "Last 90 days" },
  { value: "all-time", label: "Last year" },
];

const isoDate = (d: Date) => d.toISOString().slice(0, 10);

export const DateRangePicker: React.FC<{
  value: RangeValue;
  onChange: (v: RangeValue) => void;
  joinDate?: string;
}> = ({ value, onChange, joinDate }) => {
  const [mode, setMode] = useState<"preset" | "custom">(value.kind);
  const today = isoDate(new Date());
  const defaultFrom = joinDate?.slice(0, 10) ?? isoDate(new Date(Date.now() - 7 * 86400000));
  const [from, setFrom] = useState(value.kind === "custom" ? value.from : defaultFrom);
  const [to, setTo] = useState(value.kind === "custom" ? value.to : today);
  const [preview, setPreview] = useState<string>("");

  const loadPreview = async (next: RangeValue) => {
    try {
      const r = await api.previewWindow(
        next.kind === "custom"
          ? { from: next.from, to: next.to, joinDate }
          : { window: next.window, joinDate },
      );
      setPreview(r.label);
    } catch {
      setPreview("");
    }
  };

  useEffect(() => {
    void loadPreview(value);
  }, [value, joinDate]);

  const pickPreset = (window: string) => {
    setMode("preset");
    const next = { kind: "preset" as const, window };
    onChange(next);
    void loadPreview(next);
  };

  const pickCustom = (f: string, t: string) => {
    setMode("custom");
    const next = { kind: "custom" as const, from: f, to: t };
    onChange(next);
    void loadPreview(next);
  };

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <button type="button" className={mode === "preset" ? "" : "ghost"} onClick={() => pickPreset(value.kind === "preset" ? value.window : "last-week")}>
          Preset
        </button>
        <button
          type="button"
          className={mode === "custom" ? "" : "ghost"}
          onClick={() => pickCustom(from, to)}
        >
          Custom range
        </button>
        {joinDate && (
          <button
            type="button"
            className="ghost"
            onClick={() => {
              pickCustom(joinDate.slice(0, 10), today);
            }}
          >
            Since joined
          </button>
        )}
      </div>

      {mode === "preset" ? (
        <select
          value={value.kind === "preset" ? value.window : "last-week"}
          onChange={(e) => pickPreset(e.target.value)}
          style={{ width: "100%" }}
        >
          {PRESETS.map((p) => (
            <option key={p.value} value={p.value}>
              {p.label}
            </option>
          ))}
        </select>
      ) : (
        <div className="gap-16">
          <div style={{ flex: 1 }}>
            <label>From</label>
            <input
              type="date"
              value={from}
              max={to}
              onChange={(e) => {
                setFrom(e.target.value);
                pickCustom(e.target.value, to);
              }}
              style={{ width: "100%" }}
            />
          </div>
          <div style={{ flex: 1 }}>
            <label>To</label>
            <input
              type="date"
              value={to}
              min={from}
              max={today}
              onChange={(e) => {
                setTo(e.target.value);
                pickCustom(from, e.target.value);
              }}
              style={{ width: "100%" }}
            />
          </div>
        </div>
      )}

      {preview && (
        <p className="muted" style={{ marginTop: 12, marginBottom: 0, fontSize: 13 }}>
          Data window: <strong style={{ color: "var(--accent-2)" }}>{preview}</strong>
        </p>
      )}
    </div>
  );
};
