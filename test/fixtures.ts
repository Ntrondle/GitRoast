import type { PrMetadata, Signals } from "../src/types.js";

// A plain Tuesday-morning PR that triggers no signal.
export function makeMeta(overrides: Partial<PrMetadata> = {}): PrMetadata {
  return {
    number: 7,
    title: "Retry webhook deliveries with backoff",
    body: "Retries failed webhook deliveries with exponential backoff.",
    labels: [],
    changedFiles: 3,
    additions: 40,
    deletions: 10,
    commitMessages: ["add retry", "add tests"],
    createdAt: "2026-09-22T08:00:00Z", // Tuesday 10:00 Europe/Zurich
    author: "octocat",
    ...overrides,
  };
}

export function makeSignals(overrides: Partial<Signals> = {}): Signals {
  return {
    linesChanged: 50,
    wipCommits: 0,
    isHuge: false,
    isTiny: false,
    titleUndersells: false,
    isRevert: false,
    isRefactor: false,
    isFridayEvening: false,
    isLateNight: false,
    hasWipCommits: false,
    deletesMoreThanAdds: false,
    noDescription: false,
    manyCommits: false,
    isMassive: false,
    isHotfix: false,
    isSecurity: false,
    isWeekend: false,
    isMondayMorning: false,
    isWipTitle: false,
    hasMergeCommits: false,
    isMassRename: false,
    isDependencyBump: false,
    isRelease: false,
    isCi: false,
    titleShouting: false,
    vagueTitle: false,
    longDescription: false,
    isPerformance: false,
    isRename: false,
    isCleanup: false,
    isTests: false,
    isDocs: false,
    singleCommit: false,
    isBugFix: false,
    isFeature: false,
    ...overrides,
  };
}
