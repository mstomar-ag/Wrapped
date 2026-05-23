import { describe, it, expect } from "vitest";
import { buildRenderFileName, slugifyDisplayName } from "./render-path";

describe("render-path", () => {
  it("slugifies display names", () => {
    expect(slugifyDisplayName("Mayank Singh Tomar")).toBe("mayank_singh_tomar");
    expect(slugifyDisplayName("#all-agrim")).toBe("channel_all_agrim");
  });

  it("builds member_display_name_timestamp.mp4", () => {
    const at = new Date("2026-05-23T10:58:26.000Z");
    expect(buildRenderFileName("Mayank Singh Tomar", at)).toBe(
      "mayank_singh_tomar_20260523_105826.mp4",
    );
  });
});
