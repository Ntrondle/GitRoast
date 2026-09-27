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
    ["isMassive", { additions: 4000, deletions: 1500 }, "isMassive"],
    ["isHotfix", { title: "Hotfix: login loop" }, "isHotfix"],
    ["isHotfix by label", { labels: ["urgent"] }, "isHotfix"],
    ["isSecurity", { title: "Patch XSS in comment preview" }, "isSecurity"],
    ["isWeekend", { createdAt: "2026-09-26T10:00:00Z" }, "isWeekend"], // Sat 12:00 Zurich
    ["isMondayMorning", { createdAt: "2026-09-28T07:00:00Z" }, "isMondayMorning"], // Mon 09:00 Zurich
    ["isWipTitle", { title: "[WIP] New settings page" }, "isWipTitle"],
    ["hasMergeCommits", { commitMessages: ["Merge branch 'main' into feat", "work", "Merge branch 'main' into feat"] }, "hasMergeCommits"],
    ["isMassRename", { changedFiles: 24, additions: 30, deletions: 30 }, "isMassRename"],
    ["isDependencyBump", { title: "Bump probot from 14.3.2 to 14.4.0" }, "isDependencyBump"],
    ["isDependencyBump by label", { labels: ["dependencies"] }, "isDependencyBump"],
    ["isRelease", { title: "Release v1.4.0" }, "isRelease"],
    ["isCi", { title: "Cache node_modules in the CI workflow" }, "isCi"],
    ["titleShouting", { title: "PLEASE MERGE THIS NOW" }, "titleShouting"],
    ["titleShouting by exclamation marks", { title: "It works!!!" }, "titleShouting"],
    ["vagueTitle", { title: "Update" }, "vagueTitle"],
    ["longDescription", { body: "x".repeat(2001) }, "longDescription"],
    ["isPerformance", { title: "Speed up signal computation" }, "isPerformance"],
    ["isRename", { title: "Rename collector to reader" }, "isRename"],
    ["isCleanup", { title: "Remove unused helpers" }, "isCleanup"],
    ["isTests", { title: "Cover the fallback picker with tests" }, "isTests"],
    ["isDocs", { title: "Clarify the README install steps" }, "isDocs"],
    ["singleCommit", { commitMessages: ["one"] }, "singleCommit"],
    ["isBugFix", { title: "Fix crash on empty body" }, "isBugFix"],
    ["isFeature", { title: "Add Slack notifications" }, "isFeature"],
    ["isFeature by conventional prefix", { title: "feat: Slack notifications" }, "isFeature"],
  ];

  it.each(cases)("%s", (_label, overrides, signal) => {
    expect(computeSignals(makeMeta(overrides), TZ)[signal]).toBe(true);
  });

  it("isMassive also counts as isHuge", () => {
    const s = computeSignals(makeMeta({ additions: 6000 }), TZ);
    expect([s.isMassive, s.isHuge]).toEqual([true, true]);
  });

  it("does not call a normal PR shouting or vague", () => {
    const s = computeSignals(makeMeta({ title: "Add CI cache for npm" }), TZ);
    expect([s.titleShouting, s.vagueTitle]).toEqual([false, false]);
  });

  it("does not treat a merge commit alone as merge-heavy", () => {
    expect(computeSignals(makeMeta({ commitMessages: ["Merge branch 'main'", "work"] }), TZ).hasMergeCommits).toBe(false);
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
    expect(s.singleCommit).toBe(false);
  });
});
