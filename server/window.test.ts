import { describe, it, expect } from "vitest";
import { parseWindow } from "./window";
import { addCalendarDays, calendarYmd, istEndOfDay, istStartOfDay } from "./timezone";

const ONE_DAY_MS = 24 * 3600 * 1000;

describe("parseWindow", () => {
  const now = new Date("2026-05-22T10:00:00Z");

  it("defaults to last 7 IST calendar days", () => {
    const w = parseWindow(undefined, now);
    const days = (w.end.getTime() - w.start.getTime()) / ONE_DAY_MS;
    expect(days).toBeGreaterThanOrEqual(7);
    expect(days).toBeLessThanOrEqual(8.1);
    expect(w.end).toEqual(istEndOfDay(calendarYmd(now)));
    expect(w.start).toEqual(istStartOfDay(addCalendarDays(calendarYmd(now), -7)));
  });

  it("yesterday is one full IST day before today", () => {
    const yesterday = addCalendarDays(calendarYmd(now), -1);
    const w = parseWindow("yesterday", now);
    expect(w.start).toEqual(istStartOfDay(yesterday));
    expect(w.end).toEqual(istEndOfDay(yesterday));
  });

  it("this-month starts on the 1st in IST", () => {
    const w = parseWindow("this-month", now);
    expect(w.start).toEqual(istStartOfDay("2026-05-01"));
    expect(w.end).toEqual(istEndOfDay(calendarYmd(now)));
  });

  it("is case-insensitive", () => {
    const a = parseWindow("LAST-WEEK", now);
    const b = parseWindow("last-week", now);
    expect(a.start.getTime()).toBe(b.start.getTime());
  });
});
