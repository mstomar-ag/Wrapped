import { describe, it, expect, beforeEach, afterEach } from "vitest";
import crypto from "node:crypto";
import { verifySlackSignature } from "./verify";

const SECRET = "test-secret-abcdef";

const sign = (body: string, ts: string) =>
  "v0=" + crypto.createHmac("sha256", SECRET).update(`v0:${ts}:${body}`).digest("hex");

describe("verifySlackSignature", () => {
  beforeEach(() => {
    process.env.SLACK_SIGNING_SECRET = SECRET;
  });
  afterEach(() => {
    delete process.env.SLACK_SIGNING_SECRET;
  });

  it("accepts a valid signature", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const body = "text=hi";
    expect(verifySlackSignature(body, ts, sign(body, ts))).toBe(true);
  });

  it("rejects a tampered body", () => {
    const ts = Math.floor(Date.now() / 1000).toString();
    const body = "text=hi";
    expect(verifySlackSignature("text=evil", ts, sign(body, ts))).toBe(false);
  });

  it("rejects stale timestamps (>5min)", () => {
    const ts = (Math.floor(Date.now() / 1000) - 60 * 10).toString();
    const body = "text=hi";
    expect(verifySlackSignature(body, ts, sign(body, ts))).toBe(false);
  });

  it("rejects when secret is unset", () => {
    delete process.env.SLACK_SIGNING_SECRET;
    expect(verifySlackSignature("x", "1", "v0=abc")).toBe(false);
  });
});
