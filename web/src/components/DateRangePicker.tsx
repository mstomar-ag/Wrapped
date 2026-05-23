import { useState, useEffect } from "react";

export type RangeValue =
  | { kind: "preset"; window: string }
  | { kind: "custom"; from: string; to: string };

const PRESETS = [
  { value: "last-week", label: "Last week" },
  { value: "yesterday", label: "Yesterday" },
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
  const [from, setFrom] = useState<string>(value.kind === "custom" ? value.from : joinDate?.slice(0, 10) ?? isoDate(new Date(Date.now() - 30 * 86400000)));
  const [to, setTo] = useState<string>(value.kind === "custom" ? value.to : today);

  useEffect(() => {
    if (mode === "custom") onChange({ kind: "custom", from, to });
  }, [mode, from, to]);

  return (
    <div className="card">
      <div className="row" style={{ marginBottom: 12 }}>
        <button
          className={mode === "preset" ? "" : "ghost"}
          onClick={() => {
            setMode("preset");
            if (value.kind === "preset") onChange(value);
            else onChange({ kind: "preset", window: "last-week" });
          }}
        >
          Preset
        </button>
        <button
          className={mode === "custom" ? "" : "ghost"}
          onClick={() => {
            setMode("custom");
            onChange({ kind: "custom", from, to });
          }}
        >
          Custom range
        </button>
        {joinDate && (
          <button
            className="ghost"
            onClick={() => {
              setMode("custom");
              setFrom(joinDate.slice(0, 10));
              setTo(today);
              onChange({ kind: "custom", from: joinDate.slice(0, 10), to: today });
            }}
          >
            Since joined
          </button>
        )}
      </div>

      {mode === "preset" ? (
        <select
          value={value.kind === "preset" ? value.window : "last-week"}
          onChange={(e) => onChange({ kind: "preset", window: e.target.value })}
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
            <input type="date" value={from} max={to} onChange={(e) => setFrom(e.target.value)} style={{ width: "100%" }} />
          </div>
          <div style={{ flex: 1 }}>
            <label>To</label>
            <input type="date" value={to} min={from} max={today} onChange={(e) => setTo(e.target.value)} style={{ width: "100%" }} />
          </div>
        </div>
      )}
    </div>
  );
};
