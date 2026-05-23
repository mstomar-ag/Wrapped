import { describe, it, expect } from "vitest";
import { parseWindow } from "./window";

const ONE_DAY_MS = 24 * 3600 * 1000;

describe("parseWindow", () => {
  const now = new Date("2026-05-22T10:00:00Z");

  it("defaults to last 7 days", () => {
    const w = parseWindow(undefined, now);
    const days = (w.end.getTime() - w.start.getTime()) / ONE_DAY_MS;
    expect(days).toBeCloseTo(7, 1);
  });

  it("yesterday is a one-day local window in the past", () => {
    const w = parseWindow("yesterday", now);
    expect(w.start.getTime()).toBeLessThan(now.getTime());
    expect(w.end.getTime()).toBeLessThan(now.getTime());
    const spanMs = w.end.getTime() - w.start.getTime();
    expect(spanMs).toBeLessThan(ONE_DAY_MS);
    expect(spanMs).toBeGreaterThan(ONE_DAY_MS - 1000);
  });

  it("this-month starts on day 1 (local time)", () => {
    const w = parseWindow("this-month", now);
    expect(w.start.getDate()).toBe(1);
    expect(w.start.getHours()).toBe(0);
  });

  it("is case-insensitive", () => {
    const a = parseWindow("LAST-WEEK", now);
    const b = parseWindow("last-week", now);
    expect(a.start.getTime()).toBe(b.start.getTime());
  });
});
