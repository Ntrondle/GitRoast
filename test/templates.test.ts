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

  it("has generic templates for PRs with no signal", () => {
    expect(templates.filter((t) => t.rule.all.length === 0).length).toBeGreaterThanOrEqual(5);
  });

  it("gives every template the same priority as the others on its signal", () => {
    const bySignal = new Map<string, Set<number>>();
    for (const t of templates) {
      const key = t.rule.all.join("+");
      bySignal.set(key, (bySignal.get(key) ?? new Set()).add(t.rule.priority));
    }
    for (const [signal, priorities] of bySignal) expect([...priorities], signal).toHaveLength(1);
  });

  it("offers at least two templates for every signal", () => {
    const counts = new Map<string, number>();
    for (const t of templates) for (const s of t.rule.all) counts.set(s, (counts.get(s) ?? 0) + 1);
    for (const [signal, n] of counts) expect(n, signal).toBeGreaterThanOrEqual(2);
  });

  it("writes a distinct description for every template", () => {
    const descriptions = templates.map((t) => t.description);
    expect(new Set(descriptions).size).toBe(descriptions.length);
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
