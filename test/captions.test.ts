import { describe, expect, it } from "vitest";
import { buildCaption, escapeMemegen } from "../src/captions.js";
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
  it("fills slots and builds the memegen URL", () => {
    const c = buildCaption(template, makeMeta({ number: 2, changedFiles: 47 }), makeSignals());
    expect(c.lines).toEqual(["47 files", "47 files everywhere"]);
    expect(c.text).toBe("47 files / 47 files everywhere");
    expect(c.url).toBe("https://api.memegen.link/images/buzz/47_files/47_files_everywhere.png");
  });

  it("picks the caption deterministically from the PR number", () => {
    const meta = makeMeta({ number: 3, title: "Add cache" });
    expect(buildCaption(template, meta, makeSignals()).lines).toEqual(["Add cache", "by octocat"]);
    expect(buildCaption(template, meta, makeSignals())).toEqual(buildCaption(template, meta, makeSignals()));
  });

  it("truncates long slot values to 60 characters", () => {
    const c = buildCaption(template, makeMeta({ number: 1, title: "x".repeat(200) }), makeSignals());
    expect(c.lines[0]).toHaveLength(60);
    expect(c.lines[0]?.endsWith("…")).toBe(true);
  });

  it("leaves unknown slots untouched", () => {
    const t: Template = { ...template, captions: [["{nope}", "ok"]] };
    expect(buildCaption(t, makeMeta(), makeSignals()).lines[0]).toBe("{nope}");
  });
});
