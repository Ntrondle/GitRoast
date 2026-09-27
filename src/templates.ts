import type { Template } from "./types.js";

export const templates: Template[] = [
  {
    id: "mordor",
    name: "One Does Not Simply",
    lines: 2,
    description: "The title calls the change small, minor or a typo fix, but the PR is actually huge.",
    rule: { all: ["titleUndersells"], priority: 100 },
    captions: [
      ["One does not simply", "call {lineCount} a small change"],
      ["One does not simply", "fix a typo with {lineCount}"],
    ],
  },
  {
    id: "fine",
    name: "This Is Fine",
    lines: 2,
    description: "A risky change opened late on a Friday while the author acts calm.",
    rule: { all: ["isFridayEvening"], priority: 90 },
    captions: [
      ["Opening a PR on Friday evening", "This is fine"],
      ["{lineCount} to review before the weekend", "This is fine"],
    ],
  },
  {
    id: "rollsafe",
    name: "Roll Safe",
    lines: 2,
    description: "Opened in the middle of the night, as if nobody will be awake to review it.",
    rule: { all: ["isLateNight"], priority: 80 },
    captions: [
      ["Can't get review comments", "if everyone is asleep"],
      ["Can't break prod", "if you push in the middle of the night"],
    ],
  },
  {
    id: "success",
    name: "Success Kid",
    lines: 2,
    description: "Deletes far more code than it adds; a satisfying cleanup.",
    rule: { all: ["deletesMoreThanAdds"], priority: 75 },
    captions: [
      ["Deleted {deletions} lines", "and nothing broke (yet)"],
      ["Removed {deletions} lines of code", "Best kind of PR"],
    ],
  },
  {
    id: "same",
    name: "They're The Same Picture",
    lines: 3,
    description: "A revert that undoes an earlier change, bringing the code back to where it was.",
    rule: { all: ["isRevert"], priority: 72 },
    captions: [
      ["main before the PR", "main after the revert", "They're the same picture"],
    ],
  },
  {
    id: "noidea",
    name: "I Have No Idea What I'm Doing",
    lines: 2,
    description: "Many commits named wip, fix, oops or again; trial and error until it worked.",
    rule: { all: ["hasWipCommits"], priority: 70 },
    captions: [
      ["{wipCommitCount} called 'fix', 'wip' or 'oops'", "I have no idea what I'm doing"],
      ["wip, fix, oops, fix again", "I have no idea what I'm doing"],
    ],
  },
  {
    id: "buzz",
    name: "X, X Everywhere",
    lines: 2,
    description: "A huge change spread across a very large number of files.",
    rule: { all: ["isHuge"], priority: 65 },
    captions: [
      ["Changes", "Changes everywhere"],
      ["Merge conflicts", "Merge conflicts everywhere"],
    ],
  },
  {
    id: "gb",
    name: "Galaxy Brain",
    lines: 4,
    description: "A refactor or rewrite, possibly escalating into over-engineering.",
    rule: { all: ["isRefactor"], priority: 60 },
    captions: [
      ["Fix the bug", "Refactor the module", "Rewrite the whole app", "Change {lineCount} to fix one bug"],
    ],
  },
  {
    id: "yallgot",
    name: "Y'all Got Any More of Them",
    lines: 2,
    description: "An unusually long list of commits in a single pull request.",
    rule: { all: ["manyCommits"], priority: 55 },
    captions: [
      ["Y'all got any more of them", "commits?"],
      ["{commitCount} in one PR?", "Y'all got any more of them?"],
    ],
  },
  {
    id: "cmm",
    name: "Change My Mind",
    lines: 1,
    description: "The PR has no description or almost none; reviewers must guess what it does.",
    rule: { all: ["noDescription"], priority: 50 },
    captions: [
      ["This PR explains itself"],
      ["The code is the documentation"],
    ],
  },
  {
    id: "bihw",
    name: "But It's Honest Work",
    lines: 2,
    description: "A tiny change of only a few lines; small but useful.",
    rule: { all: ["isTiny"], priority: 40 },
    captions: [
      ["It ain't much", "but it's honest work"],
      ["It's only {lineCount}", "but it's honest work"],
    ],
  },
  {
    id: "fry",
    name: "Futurama Fry",
    lines: 2,
    description: "An ordinary pull request with nothing unusual; a generic looks-good-to-me.",
    rule: { all: [], priority: 0 },
    captions: [
      ["Not sure if this PR is ready", "or I just want to approve it"],
      ["Not sure if I reviewed this", "or just scrolled to the bottom"],
    ],
  },
];
