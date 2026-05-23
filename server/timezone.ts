/** All calendar boundaries and labels use India Standard Time (UTC+5:30, no DST). */
export const APP_TIMEZONE = process.env.APP_TIMEZONE ?? "Asia/Kolkata";

const YMD_FMT = new Intl.DateTimeFormat("en-CA", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
});

const LABEL_FMT = new Intl.DateTimeFormat("en-IN", {
  timeZone: APP_TIMEZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
});

const SHORT_FMT = new Intl.DateTimeFormat("en-IN", {
  timeZone: APP_TIMEZONE,
  month: "short",
  day: "numeric",
});

/** YYYY-MM-DD in APP_TIMEZONE. */
export const calendarYmd = (d: Date): string => YMD_FMT.format(d);

export const addCalendarDays = (ymd: string, days: number): string => {
  const anchor = istStartOfDay(ymd);
  return calendarYmd(new Date(anchor.getTime() + days * 86400000));
};

/** UTC instant for 00:00:00.000 on a calendar day in IST. */
export const istStartOfDay = (ymd: string): Date => new Date(`${ymd}T00:00:00+05:30`);

/** UTC instant for 23:59:59.999 on a calendar day in IST. */
export const istEndOfDay = (ymd: string): Date => new Date(`${ymd}T23:59:59.999+05:30`);

export const formatLabelDate = (d: Date): string => LABEL_FMT.format(d);

export const formatShortDate = (d: Date): string => SHORT_FMT.format(d);

export const formatDateTime = (d: Date): string =>
  new Intl.DateTimeFormat("en-IN", {
    timeZone: APP_TIMEZONE,
    dateStyle: "medium",
    timeStyle: "short",
  }).format(d);

/** Hour 0–23 in APP_TIMEZONE for a UTC instant.
 * Uses explicit IST offset math (UTC+5:30, no DST) so we don't depend on
 * Intl's locale-specific "1-24 vs 0-23" quirks. */
export const hourInAppTz = (d: Date): number => {
  const istMs = d.getTime() + 5.5 * 60 * 60 * 1000;
  return new Date(istMs).getUTCHours();
};

export const SLACK_WRAP_ETA =
  "first render often takes 1–2 min; repeats with the same stats are near-instant from cache";
