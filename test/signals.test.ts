import { describe, expect, it } from "vitest";
import { computeSignals } from "../src/signals.js";
import type { BooleanSignal, PrMetadata } from "../src/types.js";
import { makeMeta } from "./fixtures.js";

const TZ = "Europe/Zurich";

describe("computeSignals", () => {
  it("flags nothing for a plain PR", () => {
    const s = computeSignals(makeMeta(), TZ);
    const flagged = Object.entries(s).filter(([, v]) => v === true).map(([k]) => k);
    expect(flagged).toEqual([]);
    expect(s.linesChanged).toBe(50);
  });

  const cases: Array<[string, Partial<PrMetadata>, BooleanSignal]> = [
    ["isHuge by lines", { additions: 900, deletions: 200 }, "isHuge"],
    ["isHuge by files", { changedFiles: 31 }, "isHuge"],
    ["isTiny", { additions: 5, deletions: 4 }, "isTiny"],
    ["isRevert by title", { title: "Revert \"Add retry\"" }, "isRevert"],
    ["isRevert by label", { labels: ["revert"] }, "isRevert"],
    ["isRefactor by label", { labels: ["refactor"] }, "isRefactor"],
    ["isRefactor by title", { title: "Refactor webhook client" }, "isRefactor"],
    ["isFridayEvening", { createdAt: "2026-09-25T15:30:00Z" }, "isFridayEvening"], // Fri 17:30 Zurich
    ["isLateNight", { createdAt: "2026-09-22T01:00:00Z" }, "isLateNight"], // Tue 03:00 Zurich
    ["hasWipCommits", { commitMessages: ["wip", "fix", "oops", "done"] }, "hasWipCommits"],
    ["deletesMoreThanAdds", { additions: 20, deletions: 300 }, "deletesMoreThanAdds"],
    ["noDescription", { body: "  fixes it " }, "noDescription"],
    ["manyCommits", { commitMessages: Array.from({ length: 21 }, (_, i) => `step ${i}`) }, "manyCommits"],
  ];

  it.each(cases)("%s", (_label, overrides, signal) => {
    expect(computeSignals(makeMeta(overrides), TZ)[signal]).toBe(true);
  });

  it("titleUndersells needs both a small word and a huge change", () => {
    expect(computeSignals(makeMeta({ title: "small typo fix" }), TZ).titleUndersells).toBe(false);
    const huge = makeMeta({ title: "small typo fix", changedFiles: 47, additions: 2310, deletions: 1894 });
    expect(computeSignals(huge, TZ).titleUndersells).toBe(true);
  });

  it("does not treat Friday 15:59 local time as evening", () => {
    expect(computeSignals(makeMeta({ createdAt: "2026-09-25T13:59:00Z" }), TZ).isFridayEvening).toBe(false);
  });

  it("uses the configured time zone", () => {
    // 2026-09-25T15:30Z is Friday 17:30 in Zurich but Friday 11:30 in New York.
    const meta = makeMeta({ createdAt: "2026-09-25T15:30:00Z" });
    expect(computeSignals(meta, "America/New_York").isFridayEvening).toBe(false);
  });

  it("counts wip-style commits", () => {
    const s = computeSignals(makeMeta({ commitMessages: ["WIP", "Fix tests", "final"] }), TZ);
    expect(s.wipCommits).toBe(2);
    expect(s.hasWipCommits).toBe(false);
  });

  // Review focus: an empty PR with no body, labels or commits must not crash.
  it("handles an empty body, no labels and zero commits", () => {
    const s = computeSignals(
      makeMeta({ body: "", labels: [], commitMessages: [], changedFiles: 0, additions: 0, deletions: 0 }),
      TZ,
    );
    expect(s.noDescription).toBe(true);
    expect(s.isTiny).toBe(true);
    expect(s.wipCommits).toBe(0);
  });
});
