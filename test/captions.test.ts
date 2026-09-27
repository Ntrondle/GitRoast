import { describe, expect, it } from "vitest";
import { buildCaption, escapeMemegen, slotValues } from "../src/captions.js";
import type { Template } from "../src/types.js";
import { makeMeta, makeSignals } from "./fixtures.js";

const template: Template = {
  id: "buzz",
  name: "X, X Everywhere",
  lines: 2,
  description: "",
  rule: { all: ["isHuge"], priority: 1 },
  captions: [
    ["{files} files", "{files} files everywhere"],
    ["{title}", "by {author}"],
  ],
};

describe("escapeMemegen", () => {
  it.each([
    ["hello world", "hello_world"],
    ["snake_case", "snake__case"],
    ["well-known", "well--known"],
    ["why?", "why~q"],
    ["a & b", "a_~a_b"],
    ["100%", "100~p"],
    ["#42", "~h42"],
    ["a/b", "a~sb"],
    ["a\\b", "a~bb"],
    ["<div>", "~ldiv~g"],
    ['say "hi"', "say_''hi''"],
    ["two\nlines", "two~nlines"],
    ["", "_"],
    ["   ", "_"],
  ])("escapes %j as %j", (input, expected) => {
    expect(escapeMemegen(input)).toBe(expected);
  });

  it("percent-encodes unicode and emoji", () => {
    expect(escapeMemegen("café 🔥")).toBe("caf%C3%A9_%F0%9F%94%A5");
  });

  // Review focus: a title full of memegen and URL special characters must give a valid path segment.
  it("never leaves a raw / ? # or space in the output", () => {
    const out = escapeMemegen("Fix #12: 100% / C++ <tag>? & more");
    expect(out).not.toMatch(/[\/?# ]/);
  });
});

describe("buildCaption", () => {
  const only = (caption: string[]): Template => ({ ...template, captions: [caption] });

  it("fills slots and builds the memegen URL", () => {
    const c = buildCaption(only(["{files} files", "{files} files everywhere"]), makeMeta({ changedFiles: 47 }), makeSignals());
    expect(c.lines).toEqual(["47 files", "47 files everywhere"]);
    expect(c.text).toBe("47 files / 47 files everywhere");
    expect(c.url).toBe("https://api.memegen.link/images/buzz/47_files/47_files_everywhere.png");
  });

  it("picks the same caption for the same PR every time", () => {
    const meta = makeMeta({ number: 3 });
    expect(buildCaption(template, meta, makeSignals())).toEqual(buildCaption(template, meta, makeSignals()));
  });

  it("uses every caption across PR numbers", () => {
    const seen = new Set<string>();
    for (let number = 1; number <= 20; number++) seen.add(buildCaption(template, makeMeta({ number, title: "Add cache" }), makeSignals()).text);
    expect(seen.size).toBe(2);
  });

  it("leaves blank text boxes out of the text version", () => {
    const c = buildCaption(only(["", "Nothing to review here"]), makeMeta(), makeSignals());
    expect(c.text).toBe("Nothing to review here");
    expect(c.url).toBe("https://api.memegen.link/images/buzz/_/Nothing_to_review_here.png");
  });

  it("truncates long slot values to 60 characters", () => {
    const c = buildCaption(only(["{title}", "by {author}"]), makeMeta({ title: "x".repeat(200) }), makeSignals());
    expect(c.lines[0]).toHaveLength(60);
    expect(c.lines[0]?.endsWith("…")).toBe(true);
  });

  it("leaves unknown slots untouched", () => {
    expect(buildCaption(only(["{nope}", "ok"]), makeMeta(), makeSignals()).lines[0]).toBe("{nope}");
  });
});

describe("slotValues", () => {
  it("adds the noun to counts, singular for one", () => {
    const one = slotValues(makeMeta({ changedFiles: 1, commitMessages: ["fix"] }), makeSignals({ linesChanged: 1, wipCommits: 1 }));
    expect([one.lineCount, one.fileCount, one.commitCount, one.wipCommitCount]).toEqual(["1 line", "1 file", "1 commit", "1 commit"]);
    const many = slotValues(makeMeta({ changedFiles: 3 }), makeSignals({ linesChanged: 0, wipCommits: 4 }));
    expect([many.lineCount, many.fileCount, many.commitCount, many.wipCommitCount]).toEqual(["0 lines", "3 files", "2 commits", "4 commits"]);
  });

  it("formats large numbers with thousands separators", () => {
    const v = slotValues(makeMeta({ changedFiles: 1204, additions: 12000, deletions: 3400 }), makeSignals({ linesChanged: 15400 }));
    expect([v.lines, v.lineCount, v.fileCount, v.additions, v.deletions]).toEqual(["15,400", "15,400 lines", "1,204 files", "12,000", "3,400"]);
  });
});
