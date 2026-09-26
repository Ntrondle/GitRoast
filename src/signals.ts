import type { PrMetadata, Signals } from "./types.js";

const SMALL_WORDS = /\b(typo|small|minor|quick|tweak|nit)\b/i;
const WIP_WORDS = /\b(wip|fix|oops|again|typo)\b/i;

function localTime(iso: string, timeZone: string): { weekday: string; hour: number } {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone,
    weekday: "short",
    hour: "numeric",
    hourCycle: "h23",
  }).formatToParts(new Date(iso));
  const weekday = parts.find((p) => p.type === "weekday")?.value ?? "";
  const hour = Number(parts.find((p) => p.type === "hour")?.value ?? "12");
  return { weekday, hour };
}

export function computeSignals(meta: PrMetadata, timeZone: string): Signals {
  const linesChanged = meta.additions + meta.deletions;
  const isHuge = linesChanged > 1000 || meta.changedFiles > 30;
  const wipCommits = meta.commitMessages.filter((m) => WIP_WORDS.test(m)).length;
  const { weekday, hour } = localTime(meta.createdAt, timeZone);
  const titleAndLabels = [meta.title, ...meta.labels].join(" ");

  return {
    linesChanged,
    wipCommits,
    isHuge,
    isTiny: linesChanged < 10,
    titleUndersells: isHuge && SMALL_WORDS.test(meta.title),
    isRevert: /^revert\b/i.test(meta.title.trim()) || meta.labels.some((l) => /revert/i.test(l)),
    isRefactor: /refactor/i.test(titleAndLabels),
    isFridayEvening: weekday === "Fri" && hour >= 16,
    isLateNight: hour < 5,
    hasWipCommits: wipCommits >= 3,
    deletesMoreThanAdds: meta.deletions > 2 * meta.additions && meta.deletions > 100,
    noDescription: meta.body.trim().length < 20,
    manyCommits: meta.commitMessages.length > 20,
  };
}
