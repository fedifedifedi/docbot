import { describe, expect, it } from "vitest";
import { thresholdWindow } from "@/lib/search/threshold";

describe("thresholdWindow", () => {
  it("places the threshold between the best off-topic score and the worst right-chunk score", () => {
    const window = thresholdWindow([0.88, 0.86, 0.9], [0.8, 0.82]);
    expect(window.floor).toBe(0.82);
    expect(window.ceiling).toBe(0.86);
    expect(window.margin).toBeCloseTo(0.04);
    expect(window.suggested).toBeCloseTo(0.84);
  });

  it("reports that no threshold works when the groups overlap", () => {
    const window = thresholdWindow([0.83, 0.9], [0.85]);
    expect(window.margin).toBeLessThan(0);
    expect(window.suggested).toBeNull();
  });

  it("needs both kinds of questions", () => {
    expect(() => thresholdWindow([], [0.8])).toThrow();
    expect(() => thresholdWindow([0.9], [])).toThrow();
  });
});
