import { describe, it, expect } from "vitest";
import { buildWrappedData } from "./aggregator";
import { Member } from "./members/types";
import { AllSignals } from "./collectors/types";

const member: Member = {
  id: "alice",
  name: "Alice",
  socials: { slack: { handle: "alice", userId: "U1" }, github: { username: "alice" } },
};

const win = { start: new Date("2026-05-15"), end: new Date("2026-05-22") };

const emptySignals: AllSignals = {
  slack: null,
  github: null,
  x: null,
  linkedin: null,
  email: null,
};

describe("buildWrappedData", () => {
  it("falls back to dummy values when all collectors are null", () => {
    const data = buildWrappedData(member, win, emptySignals);
    expect(data.name).toBe("Alice");
    expect(data.numbers.messages).toBeGreaterThan(0);
  });

  it("applies LLM copy overrides over heuristics", () => {
    const data = buildWrappedData(member, win, emptySignals, {
      weekTitle: "Cracked",
      vibe: "Pure throughput.",
    });
    expect(data.weekTitle).toBe("Cracked");
    expect(data.vibe).toBe("Pure throughput.");
  });

  it("uses real github data when present", () => {
    const data = buildWrappedData(
      member,
      win,
      {
        ...emptySignals,
        github: {
          commitCount: 12,
          additions: 100,
          deletions: 50,
          topCommit: { repo: "x/y", sha: "abc1234", message: "fix", additions: 10, deletions: 5 },
        },
      },
    );
    expect(data.numbers.commits).toBe(12);
    expect(data.commit.repo).toBe("x/y");
  });
});
