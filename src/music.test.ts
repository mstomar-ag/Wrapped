import { describe, it, expect } from "vitest";
import { pickTrack, TRACKS } from "./music";

describe("pickTrack", () => {
  it("returns a known track", () => {
    expect(TRACKS).toContain(pickTrack("anyone"));
  });

  it("is deterministic for the same seed", () => {
    expect(pickTrack("alice")).toBe(pickTrack("alice"));
  });

  it("spreads across different seeds", () => {
    const picks = new Set(["a", "b", "c", "d", "e", "f", "g", "h"].map(pickTrack));
    expect(picks.size).toBeGreaterThan(1);
  });
});
