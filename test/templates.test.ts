import { describe, expect, it } from "vitest";
import { templates } from "../src/templates.js";
import { makeSignals } from "./fixtures.js";

const KNOWN_SLOTS = new Set([
  "files",
  "lines",
  "additions",
  "deletions",
  "commits",
  "lineCount",
  "fileCount",
  "commitCount",
  "wipCommitCount",
  "title",
  "author",
]);

describe("template catalog", () => {
  it("has unique ids and no id named 'other'", () => {
    const ids = templates.map((t) => t.id);
    expect(new Set(ids).size).toBe(ids.length);
    expect(ids).not.toContain("other");
  });

  it("has exactly one generic template", () => {
    expect(templates.filter((t) => t.rule.all.length === 0)).toHaveLength(1);
  });

  it("gives every template at least one caption with exactly `lines` entries", () => {
    for (const t of templates) {
      expect(t.captions.length, t.id).toBeGreaterThan(0);
      for (const c of t.captions) expect(c, t.id).toHaveLength(t.lines);
    }
  });

  it("uses only known slots", () => {
    for (const t of templates) {
      for (const line of t.captions.flat()) {
        for (const [, slot] of line.matchAll(/\{(\w+)\}/g)) expect(KNOWN_SLOTS, `${t.id}: ${slot}`).toContain(slot);
      }
    }
  });

  // A bare count slot followed by a noun reads "1 lines" for a one-line PR; use the *Count slots instead.
  it("never puts a plural noun after a bare count slot", () => {
    for (const t of templates) {
      for (const line of t.captions.flat()) expect(line, t.id).not.toMatch(/\{(files|lines|commits)\} (file|line|commit)s\b/);
    }
  });

  it("only references real boolean signals in rules", () => {
    const booleanSignals = Object.entries(makeSignals()).filter(([, v]) => typeof v === "boolean").map(([k]) => k);
    for (const t of templates) for (const s of t.rule.all) expect(booleanSignals, t.id).toContain(s);
  });

  it("covers every boolean signal with at least one template", () => {
    const covered = new Set(templates.flatMap((t) => t.rule.all));
    const booleanSignals = Object.entries(makeSignals()).filter(([, v]) => typeof v === "boolean").map(([k]) => k);
    expect([...booleanSignals].filter((s) => !covered.has(s as never))).toEqual([]);
  });
});
