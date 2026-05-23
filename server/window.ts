import { DateWindow } from "./collectors/types";

// Cap to keep API/render costs sane. A year is the deepest we'll look back.
const MAX_WINDOW_DAYS = 365;

const clamp = (win: DateWindow): DateWindow => {
  const days = (win.end.getTime() - win.start.getTime()) / (24 * 3600 * 1000);
  if (days > MAX_WINDOW_DAYS) {
    win.start = new Date(win.end.getTime() - MAX_WINDOW_DAYS * 24 * 3600 * 1000);
  }
  return win;
};

const labelOf = (win: DateWindow): string => {
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  const a = win.start.toLocaleDateString("en-US", opts);
  const b = win.end.toLocaleDateString("en-US", opts);
  return `${a} – ${b}`;
};

export const labelWindow = labelOf;

// Preset keywords
export const PRESETS = [
  "yesterday",
  "today",
  "last-week",
  "this-month",
  "last-month",
  "last-quarter",
  "all-time",
] as const;
export type WindowPreset = (typeof PRESETS)[number];

export const parseWindow = (token: string | undefined, now = new Date()): DateWindow => {
  const end = new Date(now);
  const start = new Date(now);
  switch ((token ?? "last-week").toLowerCase()) {
    case "yesterday":
      start.setDate(start.getDate() - 1);
      start.setHours(0, 0, 0, 0);
      end.setDate(end.getDate() - 1);
      end.setHours(23, 59, 59, 999);
      break;
    case "today":
      start.setHours(0, 0, 0, 0);
      break;
    case "this-month":
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      break;
    case "last-month":
      start.setMonth(start.getMonth() - 1);
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      end.setDate(0);
      end.setHours(23, 59, 59, 999);
      break;
    case "last-quarter":
      start.setDate(start.getDate() - 90);
      break;
    case "all-time":
      start.setMonth(start.getMonth() - 12);
      break;
    case "last-week":
    default:
      start.setDate(start.getDate() - 7);
      break;
  }
  return clamp({ start, end });
};

// Custom range: ISO strings or YYYY-MM-DD. Supports "from..to" syntax.
export const parseRange = (from: string, to?: string): DateWindow => {
  let f = from;
  let t = to;
  if (!t && from.includes("..")) [f, t] = from.split("..");
  const start = new Date(f);
  const end = t ? new Date(t) : new Date();
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid date range "${from}${to ? `..${to}` : ""}" — use ISO or YYYY-MM-DD`);
  }
  if (start >= end) throw new Error("`from` must be before `to`");
  return clamp({ start, end });
};

// "since-2024-12-01" or "since-joined" with a member.joinDate fallback
export const parseSince = (token: string, joinDate?: Date): DateWindow => {
  const m = token.match(/^since-(.+)$/i);
  if (!m) throw new Error("Use since-YYYY-MM-DD or since-joined");
  const tail = m[1];
  if (tail === "joined") {
    if (!joinDate) throw new Error("Member has no joinDate set");
    return clamp({ start: joinDate, end: new Date() });
  }
  return parseRange(tail);
};

// One-stop parser that picks the right strategy for any input string.
export const parseAny = (raw: string | undefined, joinDate?: Date): DateWindow => {
  if (!raw) return parseWindow(undefined);
  const trimmed = raw.trim();
  if (trimmed.startsWith("since-")) return parseSince(trimmed, joinDate);
  if (trimmed.includes("..")) return parseRange(trimmed);
  return parseWindow(trimmed);
};
