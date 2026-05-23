import { DateWindow } from "./collectors/types";
import {
  APP_TIMEZONE,
  addCalendarDays,
  calendarYmd,
  formatLabelDate,
  istEndOfDay,
  istStartOfDay,
} from "./timezone";

// Cap to keep API/render costs sane. A year is the deepest we'll look back.
const MAX_WINDOW_DAYS = 365;

const clamp = (win: DateWindow): DateWindow => {
  const days = (win.end.getTime() - win.start.getTime()) / (24 * 3600 * 1000);
  if (days > MAX_WINDOW_DAYS) {
    win.start = new Date(win.end.getTime() - MAX_WINDOW_DAYS * 24 * 3600 * 1000);
  }
  return win;
};

const labelOf = (win: DateWindow): string =>
  `${formatLabelDate(win.start)} – ${formatLabelDate(win.end)}`;

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

/** Parse presets using IST calendar days (see APP_TIMEZONE). */
export const parseWindow = (token: string | undefined, now = new Date()): DateWindow => {
  const today = calendarYmd(now);
  let start: Date;
  let end: Date;

  switch ((token ?? "last-week").toLowerCase()) {
    case "yesterday": {
      const y = addCalendarDays(today, -1);
      start = istStartOfDay(y);
      end = istEndOfDay(y);
      break;
    }
    case "today":
      start = istStartOfDay(today);
      end = istEndOfDay(today);
      break;
    case "this-month": {
      const [y, m] = today.split("-");
      start = istStartOfDay(`${y}-${m}-01`);
      end = istEndOfDay(today);
      break;
    }
    case "last-month": {
      const firstThisMonth = istStartOfDay(`${today.slice(0, 7)}-01`);
      end = new Date(firstThisMonth.getTime() - 1);
      const lastDay = calendarYmd(end);
      start = istStartOfDay(`${lastDay.slice(0, 7)}-01`);
      end = istEndOfDay(lastDay);
      break;
    }
    case "last-quarter": {
      const startYmd = addCalendarDays(today, -90);
      start = istStartOfDay(startYmd);
      end = istEndOfDay(today);
      break;
    }
    case "all-time": {
      const startYmd = addCalendarDays(today, -365);
      start = istStartOfDay(startYmd);
      end = istEndOfDay(today);
      break;
    }
    case "last-week":
    default: {
      const startYmd = addCalendarDays(today, -7);
      start = istStartOfDay(startYmd);
      end = istEndOfDay(today);
      break;
    }
  }
  return clamp({ start, end });
};

// Custom range: ISO strings or YYYY-MM-DD interpreted as IST calendar days.
export const parseRange = (from: string, to?: string): DateWindow => {
  let f = from;
  let t = to;
  if (!t && from.includes("..")) [f, t] = from.split("..");
  const startYmd = f.slice(0, 10);
  const endYmd = (t ?? f).slice(0, 10);
  const start = istStartOfDay(startYmd);
  const end = istEndOfDay(endYmd);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    throw new Error(`Invalid date range "${from}${to ? `..${to}` : ""}" — use ISO or YYYY-MM-DD`);
  }
  if (start > end) throw new Error("`from` must be on or before `to`");
  return clamp({ start, end });
};

// "since-2024-12-01" or "since-joined" with a member.joinDate fallback
export const parseSince = (token: string, joinDate?: Date): DateWindow => {
  const m = token.match(/^since-(.+)$/i);
  if (!m) throw new Error("Use since-YYYY-MM-DD or since-joined");
  const tail = m[1];
  if (tail === "joined") {
    if (!joinDate) throw new Error("Member has no joinDate set");
    return clamp({ start: joinDate, end: istEndOfDay(calendarYmd(new Date())) });
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

export { APP_TIMEZONE };
