import { describe, it, expect } from "vitest";
import { buildScenes } from "./Wrapped";
import { DUMMY, EMPTY_COMMIT } from "./data";
import type { WrappedData } from "./data";

describe("buildScenes", () => {
  it("includes CommitScene for demo data with code activity", () => {
    const names = buildScenes(DUMMY).map((s) => s.Comp.name);
    expect(names).toContain("CommitScene");
  });

  it("skips CommitScene for slack-only member wraps", () => {
    const slackOnly: WrappedData = {
      ...DUMMY,
      numbers: { messages: 400, commits: 0, linesChanged: 0 },
      commit: EMPTY_COMMIT,
    };
    const names = buildScenes(slackOnly).map((s) => s.Comp.name);
    expect(names).not.toContain("CommitScene");
  });
});
