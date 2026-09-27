import type { BooleanSignal, Template } from "./types.js";

// Higher wins. Every template on a signal shares its priority, and the rules picker rotates between them.
const PRIORITY: Record<BooleanSignal, number> = {
  titleUndersells: 100,
  isHotfix: 95,
  isFridayEvening: 90,
  isLateNight: 80,
  isWeekend: 78,
  isSecurity: 77,
  deletesMoreThanAdds: 75,
  isRevert: 72,
  hasWipCommits: 70,
  isWipTitle: 69,
  isMassive: 68,
  isHuge: 65,
  hasMergeCommits: 63,
  isRefactor: 60,
  isMassRename: 58,
  manyCommits: 55,
  isDependencyBump: 54,
  isRelease: 53,
  isCi: 52,
  titleShouting: 51,
  noDescription: 50,
  vagueTitle: 49,
  longDescription: 48,
  isPerformance: 47,
  isRename: 46,
  isCleanup: 45,
  isTests: 44,
  isDocs: 43,
  isMondayMorning: 42,
  isTiny: 40,
  singleCommit: 35,
  isBugFix: 30,
  isFeature: 25,
};

const on = (signal: BooleanSignal) => ({ all: [signal], priority: PRIORITY[signal] });
const generic = { all: [], priority: 0 };

export const templates: Template[] = [
  // ---------- titleUndersells: "small fix" on a huge diff ----------
  {
    id: "mordor",
    name: "One Does Not Simply",
    lines: 2,
    description: "The title calls the change small, minor or a typo fix, but the PR is actually huge.",
    rule: on("titleUndersells"),
    captions: [
      ["One does not simply", "call {lineCount} a small change"],
      ["One does not simply", "fix a typo with {lineCount}"],
    ],
  },
  {
    id: "inigo",
    name: "Inigo Montoya",
    lines: 2,
    description: "The title uses a word like 'small' or 'quick' that clearly does not describe this enormous diff.",
    rule: on("titleUndersells"),
    captions: [
      ["You keep using that word, 'small'", "I do not think it means what you think it means"],
      ["'Quick fix', {lineCount}", "I do not think it means what you think it means"],
    ],
  },
  {
    id: "dbg",
    name: "Expectation vs. Reality",
    lines: 2,
    description: "What the modest title promises versus the massive change reviewers actually get.",
    rule: on("titleUndersells"),
    captions: [
      ["The title: '{title}'", "The diff: {lineCount}"],
      ["Expecting a typo fix", "Getting {fileCount}"],
    ],
  },
  {
    id: "ackbar",
    name: "It's A Trap!",
    lines: 2,
    description: "An innocent-sounding title luring reviewers into a huge review.",
    rule: on("titleUndersells"),
    captions: [
      ["'Just a small change'", "It's a trap!"],
      ["A 'quick fix' touching {fileCount}", "It's a trap!"],
    ],
  },

  // ---------- isHotfix: urgent production fix ----------
  {
    id: "live",
    name: "Do It Live!",
    lines: 2,
    description: "An urgent hotfix going out without the usual staging or careful process.",
    rule: on("isHotfix"),
    captions: [
      ["No time for staging", "We'll do it live!"],
      ["Hotfix straight to production?", "Do it live!"],
    ],
  },
  {
    id: "aint-got-time",
    name: "Sweet Brown",
    lines: 2,
    description: "An emergency fix where nobody has time to wait for the full review and CI cycle.",
    rule: on("isHotfix"),
    captions: [
      ["Waiting for CI on a hotfix?", "Ain't nobody got time for that"],
      ["A full review during an outage?", "Ain't nobody got time for that"],
    ],
  },
  {
    id: "panik-kalm-panik",
    name: "Panik Kalm Panik",
    lines: 3,
    description: "Production broke, a fix arrived, and now the fix itself needs to survive review.",
    rule: on("isHotfix"),
    captions: [
      ["Production is down", "The hotfix is ready", "The hotfix needs a review"],
      ["Urgent bug report", "Found the one-line fix", "It's in code nobody understands"],
    ],
  },
  {
    id: "wddth",
    name: "We Don't Do That Here",
    lines: 2,
    description: "A rushed urgent fix tempting someone to skip the rules, like pushing straight to main.",
    rule: on("isHotfix"),
    captions: [
      ["Pushing straight to main because it's urgent", "We don't do that here"],
      ["Skipping tests because it's a hotfix", "We don't do that here"],
    ],
  },
  {
    id: "headaches",
    name: "Types of Headaches",
    lines: 1,
    description: "The worst kind of stress: fixing something that is broken in production right now.",
    rule: on("isHotfix"),
    captions: [["Hotfix in production"], ["Production outage"]],
  },

  // ---------- isFridayEvening ----------
  {
    id: "fine",
    name: "This Is Fine",
    lines: 2,
    description: "A risky change opened late on a Friday while the author acts calm.",
    rule: on("isFridayEvening"),
    captions: [
      ["Opening a PR on Friday evening", "This is fine"],
      ["{lineCount} to review before the weekend", "This is fine"],
    ],
  },
  {
    id: "ski",
    name: "Super Cool Ski Instructor",
    lines: 2,
    description: "A warning that merging or deploying on a Friday evening will ruin someone's weekend.",
    rule: on("isFridayEvening"),
    captions: [
      ["If you merge this on Friday evening", "You're gonna have a bad time"],
      ["Deploying on a Friday", "You're gonna have a bad time"],
    ],
  },
  {
    id: "regret",
    name: "I Immediately Regret This Decision",
    lines: 2,
    description: "Opening a PR right before the weekend and instantly realising it was a mistake.",
    rule: on("isFridayEvening"),
    captions: [
      ["Opened a PR at the end of Friday", "I immediately regret this decision"],
      ["Merging before the weekend", "I immediately regret this decision"],
    ],
  },
  {
    id: "winter",
    name: "Winter Is Coming",
    lines: 2,
    description: "A Friday evening change that promises weekend pager alerts.",
    rule: on("isFridayEvening"),
    captions: [
      ["Brace yourselves", "Weekend alerts are coming"],
      ["Friday evening PR", "On-call is coming"],
    ],
  },
  {
    id: "jw",
    name: "Probably Not a Good Idea",
    lines: 2,
    description: "Someone calmly pointing out that merging this late on a Friday is unwise.",
    rule: on("isFridayEvening"),
    captions: [
      ["You're merging this on Friday evening?", "Probably not a good idea"],
      ["{lineCount} right before the weekend?", "Probably not a good idea"],
    ],
  },

  // ---------- isLateNight ----------
  {
    id: "rollsafe",
    name: "Roll Safe",
    lines: 2,
    description: "Opened in the middle of the night, as if nobody will be awake to review it.",
    rule: on("isLateNight"),
    captions: [
      ["Can't get review comments", "if everyone is asleep"],
      ["Can't break prod", "if you push in the middle of the night"],
    ],
  },
  {
    id: "whatyear",
    name: "What Year Is It?",
    lines: 2,
    description: "An exhausted author surfacing from a coding session that ran deep into the night.",
    rule: on("isLateNight"),
    captions: [
      ["Finally opens the PR", "What year is it?"],
      ["Pushed the last commit at night", "What day is it?"],
    ],
  },
  {
    id: "harold",
    name: "Hide the Pain Harold",
    lines: 2,
    description: "Smiling through the pain of working on code in the middle of the night.",
    rule: on("isLateNight"),
    captions: [
      ["Opening a PR in the middle of the night", "I'm fine. Everything is fine."],
      ["Still coding at this hour", "Totally a healthy work-life balance"],
    ],
  },

  // ---------- isWeekend ----------
  {
    id: "officespace",
    name: "That Would Be Great",
    lines: 2,
    description: "A PR opened on the weekend, quietly expecting someone to review it before Monday.",
    rule: on("isWeekend"),
    captions: [
      ["If you could review this over the weekend", "That'd be great"],
      ["Yeah, if you could just approve this on Sunday", "That'd be great"],
    ],
  },
  {
    id: "kermit",
    name: "But That's None of My Business",
    lines: 2,
    description: "Noticing that someone is coding on their weekend, and deciding not to comment.",
    rule: on("isWeekend"),
    captions: [
      ["Opening PRs on a Saturday", "But that's none of my business"],
      ["Someone is coding on the weekend", "But that's none of my business"],
    ],
  },
  {
    id: "fwp",
    name: "First World Problems",
    lines: 2,
    description: "The weekend is here, yet the author is still stuck in their pull requests.",
    rule: on("isWeekend"),
    captions: [
      ["It's the weekend", "and I'm still opening PRs"],
      ["Finally free time", "spends it rebasing"],
    ],
  },

  // ---------- isSecurity ----------
  {
    id: "morpheus",
    name: "Matrix Morpheus",
    lines: 2,
    description: "A security fix revealing that the code was less safe than everyone believed.",
    rule: on("isSecurity"),
    captions: [
      ["What if I told you", "the input was never sanitized"],
      ["What if I told you", "this was exploitable the whole time"],
    ],
  },
  {
    id: "snek",
    name: "Skeptical Snake",
    lines: 2,
    description: "A reviewer reading a security change with extra suspicion, checking everything twice.",
    rule: on("isSecurity"),
    captions: [
      ["When the PR says 'security fix'", "and you read every line twice"],
      ["Reviewing a security patch", "Trust nothing"],
    ],
  },
  {
    id: "ants",
    name: "Do You Want Ants?",
    lines: 2,
    description: "A reminder that skipping this kind of security hardening is how vulnerabilities happen.",
    rule: on("isSecurity"),
    captions: [
      ["Don't escape user input?", "Because that's how you get XSS"],
      ["Skip the security review?", "Because that's how you get CVEs"],
    ],
  },

  // ---------- deletesMoreThanAdds ----------
  {
    id: "success",
    name: "Success Kid",
    lines: 2,
    description: "Deletes far more code than it adds; a satisfying cleanup.",
    rule: on("deletesMoreThanAdds"),
    captions: [
      ["Deleted {deletions} lines", "and nothing broke (yet)"],
      ["Removed {deletions} lines of code", "Best kind of PR"],
    ],
  },
  {
    id: "feelsgood",
    name: "Feels Good",
    lines: 2,
    description: "The pure satisfaction of removing a large amount of code.",
    rule: on("deletesMoreThanAdds"),
    captions: [
      ["Deleting {deletions} lines", "Feels good"],
      ["Net negative lines of code", "Feels good"],
    ],
  },
  {
    id: "gone",
    name: "And It's Gone",
    lines: 2,
    description: "A big chunk of code that existed a moment ago has simply been deleted.",
    rule: on("deletesMoreThanAdds"),
    captions: [
      ["{deletions} lines of code", "...and it's gone"],
      ["That module we kept around just in case", "...and it's gone"],
    ],
  },

  // ---------- isRevert ----------
  {
    id: "same",
    name: "They're The Same Picture",
    lines: 3,
    description: "A revert that undoes an earlier change, bringing the code back to where it was.",
    rule: on("isRevert"),
    captions: [["main before the PR", "main after the revert", "They're the same picture"]],
  },
  {
    id: "hagrid",
    name: "I Should Not Have Said That",
    lines: 2,
    description: "Regretting a previous merge so much that it now has to be reverted.",
    rule: on("isRevert"),
    captions: [
      ["", "I should not have merged that"],
      ["Reverting it already", "I should not have merged that"],
    ],
  },
  {
    id: "ch",
    name: "Captain Hindsight",
    lines: 2,
    description: "Hindsight advice about what would have prevented the change that is now being reverted.",
    rule: on("isRevert"),
    captions: [
      ["If you wanted to avoid this revert", "you should have added tests"],
      ["If you didn't want to revert it", "you shouldn't have merged it on Friday"],
    ],
  },

  // ---------- hasWipCommits ----------
  {
    id: "noidea",
    name: "I Have No Idea What I'm Doing",
    lines: 2,
    description: "Many commits named wip, fix, oops or again; trial and error until it worked.",
    rule: on("hasWipCommits"),
    captions: [
      ["{wipCommitCount} called 'fix', 'wip' or 'oops'", "I have no idea what I'm doing"],
      ["wip, fix, oops, fix again", "I have no idea what I'm doing"],
    ],
  },
  {
    id: "firsttry",
    name: "First Try!",
    lines: 2,
    description: "Ironically celebrating getting it right on the first try after many 'fix again' commits.",
    rule: on("hasWipCommits"),
    captions: [
      ["After {wipCommitCount} of 'fix'", "First try!"],
      ["'fix', 'fix again', 'actually fix'", "First try!"],
    ],
  },
  {
    id: "kombucha",
    name: "Kombucha Girl",
    lines: 2,
    description: "Trying a fix, hating the result, and trying again in yet another commit.",
    rule: on("hasWipCommits"),
    captions: [
      ["Trying a fix", "Trying the fix again"],
      ["Commit: 'fix'", "Commit: 'fix for real this time'"],
    ],
  },
  {
    id: "tried",
    name: "At Least You Tried",
    lines: 2,
    description: "A gentle pat on the back for the many attempts visible in the commit history.",
    rule: on("hasWipCommits"),
    captions: [
      ["{wipCommitCount} called 'fix'", "At least you tried"],
      ["Commit history full of 'oops'", "At least you tried"],
    ],
  },

  // ---------- isWipTitle ----------
  {
    id: "box",
    name: "What's in the Box!?",
    lines: 2,
    description: "A PR marked work in progress, so nobody knows what state it is actually in.",
    rule: on("isWipTitle"),
    captions: [
      ["A PR titled 'WIP'", "What's in the box!?"],
      ["Reviewing a work-in-progress PR", "What's in the box!?"],
    ],
  },
  {
    id: "cake",
    name: "Office Space Milton",
    lines: 2,
    description: "A reviewer who was promised finished work and received a work-in-progress PR instead.",
    rule: on("isWipTitle"),
    captions: [
      ["", "I was told this PR would be ready"],
      ["Requested a review", "I was told there would be finished code"],
    ],
  },
  {
    id: "fetch",
    name: "Stop Trying to Make Fetch Happen",
    lines: 2,
    description: "Another WIP or do-not-merge PR that keeps getting pushed for attention.",
    rule: on("isWipTitle"),
    captions: [
      ["Stop trying to make 'WIP' PRs happen", "It's not going to happen"],
      ["Stop trying to merge 'do not merge'", "It's not going to happen"],
    ],
  },

  // ---------- isMassive: over 5000 lines ----------
  {
    id: "toohigh",
    name: "The Rent Is Too Damn High",
    lines: 2,
    description: "A pull request so enormous that the line count itself is the problem.",
    rule: on("isMassive"),
    captions: [
      ["The line count is", "too damn high!"],
      ["{lineCount} in one PR?", "That's too damn high!"],
    ],
  },
  {
    id: "michael-scott",
    name: "Michael Scott No God No",
    lines: 2,
    description: "A reviewer's horrified reaction to being assigned a gigantic pull request.",
    rule: on("isMassive"),
    captions: [
      ["Reviewer sees {lineCount}", "No, God! No! God, please, no!"],
      ["'Can you review my PR real quick?'", "Noooooooooooo!"],
    ],
  },

  // ---------- isHuge ----------
  {
    id: "buzz",
    name: "X, X Everywhere",
    lines: 2,
    description: "A huge change spread across a very large number of files.",
    rule: on("isHuge"),
    captions: [
      ["Changes", "Changes everywhere"],
      ["Merge conflicts", "Merge conflicts everywhere"],
    ],
  },
  {
    id: "xy",
    name: "X All the Y",
    lines: 2,
    description: "An enthusiastic author who decided to change everything at once.",
    rule: on("isHuge"),
    captions: [
      ["Change", "all the files!"],
      ["Refactor", "all the things!"],
    ],
  },
  {
    id: "stonks",
    name: "Stonks",
    lines: 2,
    description: "Proudly treating a big line count as if it were an achievement.",
    rule: on("isHuge"),
    captions: [
      ["{lineCount} changed", "Stonks"],
      ["Lines of code going up", "Stonks"],
    ],
  },
  {
    id: "patrick",
    name: "Push It Somewhere Else Patrick",
    lines: 2,
    description: "Solving everything by cramming many unrelated changes into one big PR.",
    rule: on("isHuge"),
    captions: [
      ["Why don't we take all the changes", "and put them in one PR"],
      ["Why don't we take {fileCount}", "and ask for one review"],
    ],
  },

  // ---------- hasMergeCommits ----------
  {
    id: "yodawg",
    name: "Xzibit Yo Dawg",
    lines: 2,
    description: "A branch that merged main into itself over and over.",
    rule: on("hasMergeCommits"),
    captions: [
      ["Yo dawg, I heard you like merges", "so I merged main into your branch"],
      ["Yo dawg, I merged main", "so you can merge while you merge"],
    ],
  },
  {
    id: "spiderman",
    name: "Spider-Man Pointing at Spider-Man",
    lines: 2,
    description: "Two branches that keep merging into each other until nobody knows which is which.",
    rule: on("hasMergeCommits"),
    captions: [
      ["main", "my branch"],
      ["Merge main into branch", "Merge branch into main"],
    ],
  },
  {
    id: "sadfrog",
    name: "Feels Bad Man",
    lines: 2,
    description: "Resolving merge conflicts yet again.",
    rule: on("hasMergeCommits"),
    captions: [
      ["Merge conflicts again", "Feels bad man"],
      ["Merged main for the third time", "Feels bad man"],
    ],
  },

  // ---------- isRefactor ----------
  {
    id: "gb",
    name: "Galaxy Brain",
    lines: 4,
    description: "A refactor or rewrite, possibly escalating into over-engineering.",
    rule: on("isRefactor"),
    captions: [["Fix the bug", "Refactor the module", "Rewrite the whole app", "Change {lineCount} to fix one bug"]],
  },
  {
    id: "midwit",
    name: "Midwit",
    lines: 3,
    description: "A refactor where the simple solution was fine, but someone insisted on a grand design.",
    rule: on("isRefactor"),
    captions: [
      ["Just fix the bug", "No! We need a plugin system and three layers of abstraction first!", "Just fix the bug"],
      ["Keep it simple", "No! Rewrite it with dependency injection!", "Keep it simple"],
    ],
  },
  {
    id: "noah",
    name: "What the Hell Is This?",
    lines: 4,
    description: "A refactor that invented a strange new abstraction nobody asked for.",
    rule: on("isRefactor"),
    captions: [
      ["Class", "Function", "AbstractFunctionFactory", "What the hell is this?"],
      ["Module", "Service", "ServiceModuleProvider", "What the hell is this?"],
    ],
  },
  {
    id: "ive",
    name: "Jony Ive Redesigns Things",
    lines: 2,
    description: "Presenting a rewrite of working code as a beautiful redesign.",
    rule: on("isRefactor"),
    captions: [
      ["We rewrote it from scratch", "We think you'll love it"],
      ["Same behavior, new abstractions", "We think you'll love it"],
    ],
  },
  {
    id: "gandalf",
    name: "Confused Gandalf",
    lines: 2,
    description: "Refactoring old code the author wrote long ago and no longer recognises.",
    rule: on("isRefactor"),
    captions: [
      ["Refactoring my own code from last year", "I have no memory of this place"],
      ["Opening the module to refactor it", "I have no memory of this place"],
    ],
  },

  // ---------- isMassRename: many files, few lines each ----------
  {
    id: "handshake",
    name: "Epic Handshake",
    lines: 3,
    description: "Many files touched with tiny changes each, like a rename or reformat nobody reads closely.",
    rule: on("isMassRename"),
    captions: [
      ["Author", "Reviewer", "Not reading {fileCount} of renames"],
      ["Author", "Reviewer", "Trusting the formatter"],
    ],
  },
  {
    id: "ds",
    name: "Daily Struggle",
    lines: 3,
    description: "Agonising over a small change that must be repeated across many files.",
    rule: on("isMassRename"),
    captions: [
      ["Rename it in one file", "Rename it in {fileCount}", "Me"],
      ["Leave the bad name", "Touch {fileCount}", "Me"],
    ],
  },

  // ---------- manyCommits ----------
  {
    id: "yallgot",
    name: "Y'all Got Any More of Them",
    lines: 2,
    description: "An unusually long list of commits in a single pull request.",
    rule: on("manyCommits"),
    captions: [
      ["Y'all got any more of them", "commits?"],
      ["{commitCount} in one PR?", "Y'all got any more of them?"],
    ],
  },
  {
    id: "oprah",
    name: "Oprah You Get a Car",
    lines: 2,
    description: "Handing out commits generously, one for every tiny step.",
    rule: on("manyCommits"),
    captions: [
      ["You get a commit!", "Everybody gets a commit!"],
      ["{commitCount}!", "Everybody gets a commit!"],
    ],
  },
  {
    id: "stop-it",
    name: "Stop It, Get Some Help",
    lines: 2,
    description: "Pleading with an author who cannot stop adding commits to one PR.",
    rule: on("manyCommits"),
    captions: [
      ["{commitCount} in one PR", "Stop it. Get some help."],
      ["Another commit?", "Stop it. Get some help."],
    ],
  },

  // ---------- isDependencyBump ----------
  {
    id: "older",
    name: "An Older Code Sir",
    lines: 2,
    description: "A dependency that was very out of date finally being updated.",
    rule: on("isDependencyBump"),
    captions: [
      ["It's an older version, sir", "but it checks out"],
      ["That dependency was from another era", "but it checks out"],
    ],
  },
  {
    id: "balloon",
    name: "Running Away Balloon",
    lines: 3,
    description: "A stable build about to be dragged away by a dependency update.",
    rule: on("isDependencyBump"),
    captions: [
      ["Stable build", "Stable build", "Dependency update"],
      ["Green CI", "Green CI", "Minor version bump"],
    ],
  },
  {
    id: "lrv",
    name: "Laundry Room Viking",
    lines: 2,
    description: "Updating dependencies turned out to be far more painful than promised.",
    rule: on("isDependencyBump"),
    captions: [
      ["Update the dependencies, they said", "It will be easy, they said"],
      ["It's just a patch version, they said", "Nothing will break, they said"],
    ],
  },

  // ---------- isRelease ----------
  {
    id: "happening",
    name: "It's Happening",
    lines: 2,
    description: "Excitement that a release is finally going out.",
    rule: on("isRelease"),
    captions: [
      ["Release day", "It's happening!"],
      ["A new version", "It's happening!"],
    ],
  },
  {
    id: "money",
    name: "Shut Up and Take My Money!",
    lines: 2,
    description: "Users eager to get their hands on the new release.",
    rule: on("isRelease"),
    captions: [
      ["A new release?", "Shut up and take my money!"],
      ["Changelog looks good", "Shut up and take my money!"],
    ],
  },
  {
    id: "sohot",
    name: "So Hot Right Now",
    lines: 2,
    description: "A fresh release that is the newest, hottest version.",
    rule: on("isRelease"),
    captions: [
      ["This release is", "so hot right now"],
      ["The new version is", "so hot right now"],
    ],
  },

  // ---------- isCi ----------
  {
    id: "crowd",
    name: "Soccer Celebration in a Bar",
    lines: 2,
    description: "The whole team cheering because the CI pipeline finally passed.",
    rule: on("isCi"),
    captions: [
      ["Push the CI fix", "It finally turns green"],
      ["Re-run the pipeline", "It passes"],
    ],
  },
  {
    id: "cryingfloor",
    name: "Crying on Floor",
    lines: 2,
    description: "Coping with a CI pipeline that keeps failing.",
    rule: on("isCi"),
    captions: [
      ["It's okay", "Let's just re-run the pipeline"],
      ["CI failed again", "It's fine, it's just flaky"],
    ],
  },
  {
    id: "blb",
    name: "Bad Luck Brian",
    lines: 2,
    description: "Fixing the build only for CI to find something new to fail on.",
    rule: on("isCi"),
    captions: [
      ["Fixes the CI pipeline", "CI finds three new failures"],
      ["Makes the build green", "Runner goes offline"],
    ],
  },

  // ---------- titleShouting ----------
  {
    id: "sparta",
    name: "This Is Sparta!",
    lines: 2,
    description: "A pull request title written in all caps or with many exclamation marks.",
    rule: on("titleShouting"),
    captions: [
      ["THIS. IS.", "A PR TITLE!"],
      ["WHY ARE WE", "SHOUTING?!"],
    ],
  },
  {
    id: "seagull",
    name: "Inhaling Seagull",
    lines: 2,
    description: "An author who has escalated to yelling to get the PR noticed.",
    rule: on("titleShouting"),
    captions: [
      ["new pr", "PLEASE REVIEW MY PR!!!"],
      ["could you", "MERGE IT ALREADY!!!"],
    ],
  },

  // ---------- noDescription ----------
  {
    id: "cmm",
    name: "Change My Mind",
    lines: 1,
    description: "The PR has no description or almost none; reviewers must guess what it does.",
    rule: on("noDescription"),
    captions: [["This PR explains itself"], ["The code is the documentation"]],
  },
  {
    id: "afraid",
    name: "Afraid to Ask Andy",
    lines: 2,
    description: "A reviewer who has no idea what the undescribed PR does and is too embarrassed to ask.",
    rule: on("noDescription"),
    captions: [
      ["I don't know what this PR does", "and at this point I'm too afraid to ask"],
      ["No description, {fileCount} changed", "and at this point I'm too afraid to ask"],
    ],
  },
  {
    id: "philosoraptor",
    name: "Philosoraptor",
    lines: 2,
    description: "Pondering the deep question of what a PR with no description is for.",
    rule: on("noDescription"),
    captions: [
      ["If a PR has no description", "does it even do anything?"],
      ["If nobody knows what it does", "is it still a feature?"],
    ],
  },

  // ---------- vagueTitle ----------
  {
    id: "pigeon",
    name: "Is This a Pigeon?",
    lines: 3,
    description: "A title so vague, like 'update' or 'fix', that it is mistaken for a description.",
    rule: on("vagueTitle"),
    captions: [
      ["Me", "A PR titled '{title}'", "Is this a description?"],
      ["Author", "The word '{title}'", "Is this a PR title?"],
    ],
  },
  {
    id: "wonka",
    name: "Condescending Wonka",
    lines: 2,
    description: "Sarcastic praise for an uninformative, one-word PR title.",
    rule: on("vagueTitle"),
    captions: [
      ["Oh, the PR is called '{title}'?", "Please, tell me more"],
      ["A one-word title?", "How wonderfully detailed"],
    ],
  },
  {
    id: "bad",
    name: "You Should Feel Bad",
    lines: 2,
    description: "Scolding a PR title that says nothing about the change.",
    rule: on("vagueTitle"),
    captions: [
      ["Your PR title is '{title}'", "and you should feel bad"],
      ["This PR title is vague", "and you should feel bad"],
    ],
  },
  {
    id: "cbg",
    name: "Comic Book Guy",
    lines: 2,
    description: "A pedantic verdict that this is the least informative PR title ever written.",
    rule: on("vagueTitle"),
    captions: [
      ["'{title}'", "Worst PR title ever"],
      ["", "Worst PR title ever"],
    ],
  },

  // ---------- longDescription ----------
  {
    id: "interesting",
    name: "The Most Interesting Man in the World",
    lines: 2,
    description: "A PR with a remarkably long, essay-sized description.",
    rule: on("longDescription"),
    captions: [
      ["I don't always write PR descriptions", "but when I do, they're essays"],
      ["I don't always explain my changes", "but when I do, it takes a scroll wheel"],
    ],
  },
  {
    id: "dodgson",
    name: "See? Nobody Cares",
    lines: 2,
    description: "A lovingly detailed description that most reviewers will skip.",
    rule: on("longDescription"),
    captions: [
      ["We've got a detailed PR description here!", "See? Nobody cares"],
      ["Wrote a design doc in the PR", "See? Nobody cares"],
    ],
  },

  // ---------- isPerformance ----------
  {
    id: "vince",
    name: "Vince McMahon Reaction",
    lines: 3,
    description: "Escalating excitement at each step of a speed optimisation.",
    rule: on("isPerformance"),
    captions: [
      ["Faster loops", "Parallel requests", "Caching everything"],
      ["10% faster", "2x faster", "It was a missing index"],
    ],
  },
  {
    id: "saltbae",
    name: "Salt Bae",
    lines: 2,
    description: "Sprinkling caching or optimisations everywhere with great flair.",
    rule: on("isPerformance"),
    captions: [
      ["Adding caching", "to everything"],
      ["Performance fixes", "with a little memoization on top"],
    ],
  },

  // ---------- isRename ----------
  {
    id: "pooh",
    name: "Tuxedo Winnie the Pooh",
    lines: 2,
    description: "A plain rename or file move presented as something much fancier.",
    rule: on("isRename"),
    captions: [
      ["Renaming a file", "Semantic reorganization of the module structure"],
      ["Moving some code", "Architectural realignment"],
    ],
  },
  {
    id: "prop3",
    name: "Too Confusing, Too Extreme",
    lines: 1,
    description: "The notoriously hard problem of naming things, now in PR form.",
    rule: on("isRename"),
    captions: [["Naming things"], ["Renaming things again"]],
  },

  // ---------- isCleanup ----------
  {
    id: "khaby-lame",
    name: "Khaby Lame Shrug",
    lines: 2,
    description: "The obvious simple answer to unused or dead code: delete it.",
    rule: on("isCleanup"),
    captions: [
      ["Dead code?", "Just delete it"],
      ["Unused function?", "Remove it"],
    ],
  },
  {
    id: "bilbo",
    name: "Why Shouldn't I Keep It",
    lines: 2,
    description: "Clinging to old code for too long before finally cleaning it up.",
    rule: on("isCleanup"),
    captions: [
      ["That code we might need someday", "Why shouldn't I keep it?"],
      ["After all these years", "why did we keep it?"],
    ],
  },

  // ---------- isTests ----------
  {
    id: "crazypills",
    name: "I Feel Like I'm Taking Crazy Pills",
    lines: 2,
    description: "Tests that pass locally and fail in CI, or are flaky for no clear reason.",
    rule: on("isTests"),
    captions: [
      ["Passes locally, fails in CI", "I feel like I'm taking crazy pills"],
      ["The test is flaky again", "I feel like I'm taking crazy pills"],
    ],
  },
  {
    id: "soa",
    name: "Seal of Approval",
    lines: 2,
    description: "Genuine approval for a PR that adds or improves tests.",
    rule: on("isTests"),
    captions: [
      ["A PR that adds tests", "Seal of approval"],
      ["More test coverage", "Seal of approval"],
    ],
  },
  {
    id: "sohappy",
    name: "I Would Be So Happy",
    lines: 2,
    description: "Wishing every PR came with tests like this one.",
    rule: on("isTests"),
    captions: [
      ["If every PR had tests", "I would be so happy"],
      ["If these tests stay green", "I would be so happy"],
    ],
  },
  {
    id: "joker",
    name: "It's Simple, Kill the Batman",
    lines: 2,
    description: "The tempting shortcut of deleting or skipping a troublesome test.",
    rule: on("isTests"),
    captions: [
      ["It's simple", "delete the flaky test"],
      ["It's simple", "mark it as skipped"],
    ],
  },

  // ---------- isDocs ----------
  {
    id: "agnes",
    name: "Agnes Harkness Winking",
    lines: 2,
    description: "Pretending to have read the documentation that this PR updates.",
    rule: on("isDocs"),
    captions: [
      ["", "I have read the documentation"],
      ["", "Yes, I read the whole README"],
    ],
  },
  {
    id: "remembers",
    name: "Pepperidge Farm Remembers",
    lines: 2,
    description: "Nostalgia for a time when the docs matched the code.",
    rule: on("isDocs"),
    captions: [
      ["Remember when the docs were accurate?", "Pepperidge Farm remembers"],
      ["Remember when the README was updated?", "Pepperidge Farm remembers"],
    ],
  },

  // ---------- isMondayMorning ----------
  {
    id: "grumpycat",
    name: "Grumpy Cat",
    lines: 2,
    description: "Grumpy about reviewing a pull request first thing on a Monday morning.",
    rule: on("isMondayMorning"),
    captions: [
      ["A PR on Monday morning", "No."],
      ["Review this before coffee?", "No."],
    ],
  },
  {
    id: "slap",
    name: "Will Smith Slapping Chris Rock",
    lines: 2,
    description: "The weekend mood getting abruptly interrupted by Monday's review queue.",
    rule: on("isMondayMorning"),
    captions: [
      ["Me trying to enjoy the weekend", "Monday morning review requests"],
      ["My weekend calm", "This PR at 9am"],
    ],
  },

  // ---------- isTiny ----------
  {
    id: "bihw",
    name: "But It's Honest Work",
    lines: 2,
    description: "A tiny change of only a few lines; small but useful.",
    rule: on("isTiny"),
    captions: [
      ["It ain't much", "but it's honest work"],
      ["It's only {lineCount}", "but it's honest work"],
    ],
  },
  {
    id: "center",
    name: "What Is This, a Center for Ants?!",
    lines: 2,
    description: "A pull request so small it looks like it was made for ants.",
    rule: on("isTiny"),
    captions: [
      ["What is this", "a pull request for ants?"],
      ["{lineCount}?", "What is this, a PR for ants?"],
    ],
  },
  {
    id: "nice",
    name: "So I Got That Goin' for Me",
    lines: 2,
    description: "Finding comfort in how quick this small PR will be to review.",
    rule: on("isTiny"),
    captions: [
      ["Only {lineCount} to review", "So I got that goin' for me, which is nice"],
      ["A small PR", "So I got that goin' for me, which is nice"],
    ],
  },
  {
    id: "jetpack",
    name: "Nothing To Do Here",
    lines: 2,
    description: "A change so small that reviewing it barely requires any effort.",
    rule: on("isTiny"),
    captions: [
      ["", "Nothing to review here"],
      ["{lineCount} changed", "Nothing to do here"],
    ],
  },

  // ---------- singleCommit ----------
  {
    id: "fa",
    name: "Forever Alone",
    lines: 2,
    description: "A pull request made of exactly one lonely commit.",
    rule: on("singleCommit"),
    captions: [
      ["One commit", "Forever alone"],
      ["Just one commit in this PR", "Forever alone"],
    ],
  },
  {
    id: "chosen",
    name: "You Were the Chosen One!",
    lines: 2,
    description: "The single commit that carries the whole PR on its own.",
    rule: on("singleCommit"),
    captions: [
      ["One commit to do it all", "You were the chosen one!"],
      ["The only commit", "You were the chosen one!"],
    ],
  },

  // ---------- isBugFix ----------
  {
    id: "reveal",
    name: "Scooby Doo Reveal",
    lines: 4,
    description: "Unmasking the real, embarrassingly simple cause behind a bug.",
    rule: on("isBugFix"),
    captions: [
      ["The mysterious bug", "Let's see who you really are...", "A missing null check", "I knew it!"],
      ["The race condition", "Let's see who you really are...", "An off-by-one error", "I knew it!"],
    ],
  },
  {
    id: "astronaut",
    name: "Always Has Been",
    lines: 4,
    description: "Discovering that the bug has been there all along.",
    rule: on("isBugFix"),
    captions: [
      ["Wait, this was broken the whole time?", "Always has been", "Developer", "Git blame"],
      ["Wait, it's a typo?", "Always has been", "Me", "The bug"],
    ],
  },
  {
    id: "exit",
    name: "Left Exit 12 Off Ramp",
    lines: 3,
    description: "Swerving away from fixing the root cause toward a quick workaround.",
    rule: on("isBugFix"),
    captions: [
      ["Fix the root cause", "Add another if statement", "Me"],
      ["Understand the bug", "Wrap it in try/catch", "Me"],
    ],
  },
  {
    id: "dwight",
    name: "Schrute Facts",
    lines: 2,
    description: "A pedantic correction that no bug fix is ever truly small.",
    rule: on("isBugFix"),
    captions: [
      ["It's a small bug fix?", "False. There are no small bug fixes."],
      ["It works on my machine?", "False. It works on no machine."],
    ],
  },
  {
    id: "gru",
    name: "Gru's Plan",
    lines: 4,
    description: "A bug fix plan that ends with more bugs than it started with.",
    rule: on("isBugFix"),
    captions: [
      ["Find the bug", "Fix the bug", "Create two new bugs", "Create two new bugs"],
      ["Open a PR", "Fix the bug", "Break the tests", "Break the tests"],
    ],
  },
  {
    id: "scc",
    name: "Sudden Clarity Clarence",
    lines: 2,
    description: "The moment of realisation where the real cause of a bug suddenly becomes clear.",
    rule: on("isBugFix"),
    captions: [
      ["Wait", "the bug was in the test all along"],
      ["Oh no", "it was a caching issue"],
    ],
  },
  {
    id: "facepalm",
    name: "Facepalm",
    lines: 2,
    description: "Exasperation at how trivial the bug turned out to be.",
    rule: on("isBugFix"),
    captions: [
      ["The bug was a missing semicolon", "I can't even"],
      ["Three days of debugging, one-line fix", "I can't even"],
    ],
  },

  // ---------- isFeature ----------
  {
    id: "drake",
    name: "Drakeposting",
    lines: 2,
    description: "Preferring to build new features over fixing old bugs.",
    rule: on("isFeature"),
    captions: [
      ["Fixing old bugs", "Building new features"],
      ["Finishing the backlog", "Starting something new"],
    ],
  },
  {
    id: "db",
    name: "Distracted Boyfriend",
    lines: 3,
    description: "A developer distracted by a shiny new feature while existing work waits.",
    rule: on("isFeature"),
    captions: [
      ["New feature", "Me", "The bug backlog"],
      ["A shiny new idea", "The team", "The roadmap"],
    ],
  },
  {
    id: "right",
    name: "Anakin and Padme",
    lines: 5,
    description: "A new feature shipped with the promise that tests will be added later.",
    rule: on("isFeature"),
    captions: [
      ["Senior developer", "Junior developer", "New feature, no tests", "We'll add tests later, right?", "We'll add tests later, right?"],
      ["Reviewer", "Author", "Feature flag on by default", "We'll turn it off if it breaks, right?", "We'll turn it off if it breaks, right?"],
    ],
  },
  {
    id: "bender",
    name: "I'm Going to Build My Own Theme Park",
    lines: 2,
    description: "Enthusiastically building a new feature with every bell and whistle.",
    rule: on("isFeature"),
    captions: [
      ["I'm going to build my own feature", "with blackjack and feature flags"],
      ["Fine, I'll add it myself", "with tests and a config option"],
    ],
  },
  {
    id: "spirit",
    name: "Fake Spirit Halloween Costume",
    lines: 5,
    description: "Listing what a new feature PR really includes, bugs and missing tests and all.",
    rule: on("isFeature"),
    captions: [
      ["New feature PR", "Includes:", "- One feature", "- Two new bugs", "- Zero tests"],
      ["{fileCount} changed", "Includes:", "- A shiny button", "- A config flag", "- A TODO"],
    ],
  },

  // ---------- generic: nothing unusual ----------
  {
    id: "fry",
    name: "Futurama Fry",
    lines: 2,
    description: "An ordinary pull request with nothing unusual; a generic looks-good-to-me.",
    rule: generic,
    captions: [
      ["Not sure if this PR is ready", "or I just want to approve it"],
      ["Not sure if I reviewed this", "or just scrolled to the bottom"],
    ],
  },
  {
    id: "keanu",
    name: "Conspiracy Keanu",
    lines: 2,
    description: "An ordinary PR prompting an idle, philosophical thought about code review.",
    rule: generic,
    captions: [
      ["What if code review", "was the friends we made along the way?"],
      ["What if LGTM", "actually means 'let's get this merged'?"],
    ],
  },
  {
    id: "both",
    name: "Why Not Both?",
    lines: 2,
    description: "A reviewer torn between approving and requesting changes on a routine PR.",
    rule: generic,
    captions: [
      ["Approve or request changes?", "Why not both?"],
      ["Squash or merge commit?", "Why not both?"],
    ],
  },
  {
    id: "waygd",
    name: "What Are Ya Gonna Do?",
    lines: 2,
    description: "Shrugging acceptance of yet another PR in the review queue.",
    rule: generic,
    captions: [
      ["Another PR in the queue", "What are ya gonna do?"],
      ["Yeah, it needs a review", "What are ya gonna do?"],
    ],
  },
  {
    id: "mb",
    name: "Member Berries",
    lines: 2,
    description: "Nostalgia for simpler times in the codebase.",
    rule: generic,
    captions: [
      ["'Member", "when the build took one minute?"],
      ["'Member", "when this repo had one file?"],
    ],
  },
  {
    id: "stew",
    name: "Baby, You've Got a Stew Going",
    lines: 2,
    description: "Encouraging a developer who has a nice, ordinary PR cooking.",
    rule: generic,
    captions: [
      ["", "Baby, you've got a PR going!"],
      ["{fileCount} changed", "Baby, you've got a stew going!"],
    ],
  },
  {
    id: "home",
    name: "We Have Food at Home",
    lines: 3,
    description: "Asking for a thorough review and getting a lazy one instead.",
    rule: generic,
    captions: [
      ["Me: Can we get a real code review?", "Team: We have code review at home.", "Code review at home: LGTM"],
      ["Me: Can we write tests?", "Team: We have tests at home.", "Tests at home: console.log"],
    ],
  },
  {
    id: "drowning",
    name: "Drowning High Five",
    lines: 3,
    description: "Asking for a review, and teammates replying with their own review requests.",
    rule: generic,
    captions: [
      ["Me asking for a review", "Teammates", "Can you review mine too?"],
      ["Me asking for help", "The team", "Same bug here!"],
    ],
  },
  {
    id: "touch",
    name: "Principal Skinner",
    lines: 2,
    description: "An author convinced the tooling is wrong rather than their code.",
    rule: generic,
    captions: [
      ["Am I so out of touch?", "No, it's the linter that's wrong"],
      ["Is my code the problem?", "No, it's the compiler that's wrong"],
    ],
  },
  {
    id: "cb",
    name: "Confession Bear",
    lines: 2,
    description: "Confessing a small, relatable code review sin.",
    rule: generic,
    captions: [
      ["I approve PRs", "without running them locally"],
      ["I sometimes read", "only the PR title"],
    ],
  },
  {
    id: "ss",
    name: "Scumbag Steve",
    lines: 2,
    description: "Classic bad reviewer behavior on an otherwise normal PR.",
    rule: generic,
    captions: [
      ["Requests changes", "goes on vacation"],
      ["Asks for a review", "never replies to comments"],
    ],
  },
  {
    id: "sb",
    name: "Scumbag Brain",
    lines: 2,
    description: "A developer's brain remembering all the wrong things about the code.",
    rule: generic,
    captions: [
      ["Remembers every bug from 2019", "forgets what this PR was for"],
      ["Remembers the whole API", "forgets to push the last commit"],
    ],
  },
  {
    id: "say",
    name: "Say the Line, Bart!",
    lines: 2,
    description: "Waiting for the senior engineer's inevitable answer to a routine question.",
    rule: generic,
    captions: [
      ["Say the line, senior engineer!", "It depends."],
      ["Say the line, reviewer!", "LGTM"],
    ],
  },
  {
    id: "puffin",
    name: "Unpopular Opinion Puffin",
    lines: 2,
    description: "An unpopular opinion about everyday development practices.",
    rule: generic,
    captions: [
      ["Unpopular opinion:", "reviewing PRs is fun"],
      ["Unpopular opinion:", "tabs are fine"],
    ],
  },
  {
    id: "red",
    name: "Is That What We're Going to Do Today?",
    lines: 2,
    description: "Wryly noting that today's plan is apparently opening pull requests.",
    rule: generic,
    captions: [
      ["Oh, is that what we're going to do today?", "Open pull requests?"],
      ["Oh, is that what we're doing?", "Changing {fileCount}?"],
    ],
  },
  {
    id: "wishes",
    name: "Genie Rules",
    lines: 1,
    description: "Wishing for the impossible in code review.",
    rule: generic,
    captions: [["I wish for a PR with no review comments"], ["I wish for CI that never flakes"]],
  },
  {
    id: "oag",
    name: "Overly Attached Girlfriend",
    lines: 2,
    description: "An author eagerly watching for any sign that their PR is being reviewed.",
    rule: generic,
    captions: [
      ["I saw you opened my PR", "Why haven't you approved it yet?"],
      ["You were online", "and didn't review my PR"],
    ],
  },
  {
    id: "mw",
    name: "I Guarantee It",
    lines: 2,
    description: "Confidently promising that this ordinary PR will merge without trouble.",
    rule: generic,
    captions: [
      ["You're gonna like the way this merges", "I guarantee it"],
      ["You're gonna like this diff", "I guarantee it"],
    ],
  },
  {
    id: "boat",
    name: "I Should Buy a Boat Cat",
    lines: 2,
    description: "Idly daydreaming while waiting for a routine PR to be reviewed.",
    rule: generic,
    captions: [
      ["Waiting for review", "I should buy a boat"],
      ["PR opened", "I should buy a boat"],
    ],
  },
  {
    id: "ggg",
    name: "Good Guy Greg",
    lines: 2,
    description: "Praising an author who did everything a reviewer could hope for.",
    rule: generic,
    captions: [
      ["Opens a PR", "writes a clear description"],
      ["Gets review comments", "fixes them all the same day"],
    ],
  },
  {
    id: "captain",
    name: "I Am the Captain Now",
    lines: 2,
    description: "An author confidently taking ownership of a piece of the codebase.",
    rule: generic,
    captions: [
      ["Look at me", "I am the code owner now"],
      ["Opened my first PR here", "I am the maintainer now"],
    ],
  },
  {
    id: "awesome",
    name: "Socially Awesome Penguin",
    lines: 2,
    description: "A small win in everyday development that went surprisingly well.",
    rule: generic,
    captions: [
      ["Opens a PR", "CI passes on the first run"],
      ["Asks for a review", "gets it within the hour"],
    ],
  },
  {
    id: "awkward",
    name: "Socially Awkward Penguin",
    lines: 2,
    description: "A small, relatable awkward moment in code review.",
    rule: generic,
    captions: [
      ["Leaves a review comment", "it's a typo in my own suggestion"],
      ["Requests changes", "realises it was my code"],
    ],
  },
];
