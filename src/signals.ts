import type { PrMetadata, Signals } from "./types.js";

const SMALL_WORDS = /\b(typo|small|minor|quick|tweak|nit)\b/i;
const WIP_WORDS = /\b(wip|fix|oops|again|typo)\b/i;
const MERGE_COMMIT = /^Merge (branch|remote-tracking branch|pull request)\b/;

// Matched against the title and labels together.
const TOPICS = {
  isHotfix: /\b(hotfix|hot-fix|urgent|asap|critical|emergency|outage|incident)\b/i,
  isSecurity: /\b(security|secure|cve|vulnerabilit(y|ies)|xss|csrf|injection|exploit)\b/i,
  isDependencyBump: /\b(bump|bumps|dependabot|renovate|dependenc(y|ies)|deps)\b/i,
  isRelease: /\b(release|releases|v\d+\.\d+(\.\d+)?|changelog)\b/i,
  isCi: /\b(ci|cd|pipeline|workflows?|github actions)\b/i,
  isPerformance: /\b(perf|performance|faster|speed ?up|optimi[sz]e[sd]?|cach(e|es|ing))\b/i,
  isRename: /\b(rename[sd]?|renaming|move[sd]?|moving)\b/i,
  isCleanup: /\b(clean ?up|remove[sd]?|delete[sd]?|unused|dead code|drop)\b/i,
  isTests: /\b(tests?|specs?|coverage|flaky)\b/i,
  isDocs: /\b(docs?|documentation|readme|comments?|guide)\b/i,
} as const;

const WIP_TITLE = /^\s*(\[?wip\]?|draft|do not merge|dnm)\b/i;
const VAGUE_TITLE = /^\s*(update[sd]?|changes?|fix(es)?|stuff|misc|tweaks?|wip|minor|small fix|improvements?|cleanup|refactor|test|asdf|\.+)\s*\.?\s*$/i;
const BUG_FIX = /^\s*(fix(es|ed)?|bugfix|bug)\b|^\s*fix(\(.*\))?:/i;
const FEATURE = /^\s*(feat(ure)?(\(.*\))?:|add(s|ed)?\b|introduce[sd]?\b|implement(s|ed)?\b|support\b|new\b)/i;

function isShouting(title: string): boolean {
  if (/!{2,}/.test(title)) return true;
  const letters = title.replace(/[^A-Za-z]/g, "");
  return letters.length >= 8 && letters.replace(/[^A-Z]/g, "").length / letters.length > 0.8;
}

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

  const topic = (re: RegExp) => re.test(titleAndLabels);

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
    isMassive: linesChanged > 5000,
    isHotfix: topic(TOPICS.isHotfix),
    isSecurity: topic(TOPICS.isSecurity),
    isWeekend: weekday === "Sat" || weekday === "Sun",
    isMondayMorning: weekday === "Mon" && hour >= 5 && hour < 11,
    isWipTitle: WIP_TITLE.test(meta.title),
    hasMergeCommits: meta.commitMessages.filter((m) => MERGE_COMMIT.test(m)).length >= 2,
    isMassRename: meta.changedFiles >= 10 && linesChanged <= meta.changedFiles * 4,
    isDependencyBump: topic(TOPICS.isDependencyBump),
    isRelease: topic(TOPICS.isRelease),
    isCi: topic(TOPICS.isCi),
    titleShouting: isShouting(meta.title),
    vagueTitle: VAGUE_TITLE.test(meta.title),
    longDescription: meta.body.length > 2000,
    isPerformance: topic(TOPICS.isPerformance),
    isRename: topic(TOPICS.isRename),
    isCleanup: topic(TOPICS.isCleanup),
    isTests: topic(TOPICS.isTests),
    isDocs: topic(TOPICS.isDocs),
    singleCommit: meta.commitMessages.length === 1,
    isBugFix: BUG_FIX.test(meta.title),
    isFeature: FEATURE.test(meta.title),
  };
}
