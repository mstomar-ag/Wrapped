const APP_TIMEZONE = "Asia/Kolkata";

const dateFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: APP_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
});

const dateTimeFmt = new Intl.DateTimeFormat("en-IN", {
  timeZone: APP_TIMEZONE,
  dateStyle: "medium",
  timeStyle: "short",
});

export const fmtDate = (iso: string) => dateFmt.format(new Date(iso));

export const fmtDateTime = (iso: string) => dateTimeFmt.format(new Date(iso));

export const fmtRange = (from: string, to: string) => `${fmtDate(from)} → ${fmtDate(to)}`;
