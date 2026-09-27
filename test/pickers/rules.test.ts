import { describe, expect, it } from "vitest";
import { RulesPicker } from "../../src/pickers/rules.js";
import { templates } from "../../src/templates.js";
import type { BooleanSignal, Template } from "../../src/types.js";
import { makeMeta, makeSignals } from "../fixtures.js";

const picker = new RulesPicker();
const byId = new Map(templates.map((t) => [t.id, t]));

const t = (id: string, all: BooleanSignal[], priority: number): Template => ({
  id,
  name: id,
  lines: 1,
  description: "",
  rule: { all, priority },
  captions: [["x"]],
});

describe("RulesPicker", () => {
  it("picks a generic template when no signal is set", async () => {
    const pick = await picker.pick(makeMeta(), makeSignals(), templates);
    expect(byId.get(pick.templateId)?.rule.all).toEqual([]);
    expect(pick).toMatchObject({ confidence: 1, source: "rules" });
  });

  it("picks from the highest-priority matching signal", async () => {
    const signals = makeSignals({ isHuge: true, titleUndersells: true, isFridayEvening: true });
    for (let number = 1; number <= 20; number++) {
      const pick = await picker.pick(makeMeta({ number }), signals, templates);
      expect(byId.get(pick.templateId)?.rule.all, `#${number}`).toEqual(["titleUndersells"]);
    }
  });

  it("rotates between templates that share the top priority, by PR number", async () => {
    const catalog = [t("a", ["isHuge"], 5), t("b", ["isHuge"], 5), t("c", ["isHuge"], 5), t("low", ["isHuge"], 1), t("gen", [], 0)];
    const signals = makeSignals({ isHuge: true });
    const picked = new Set<string>();
    for (let number = 1; number <= 30; number++) picked.add((await picker.pick(makeMeta({ number }), signals, catalog)).templateId);
    expect([...picked].sort()).toEqual(["a", "b", "c"]);
  });

  it("gives the same PR the same template every time", async () => {
    const signals = makeSignals({ isTiny: true });
    const first = await picker.pick(makeMeta({ number: 42 }), signals, templates);
    expect(await picker.pick(makeMeta({ number: 42 }), signals, templates)).toEqual(first);
  });

  it("reaches every template in the catalog for its own signal", async () => {
    for (const template of templates) {
      const signals = makeSignals(Object.fromEntries(template.rule.all.map((s) => [s, true])));
      const seen = new Set<string>();
      for (let number = 1; number <= 300; number++) seen.add((await picker.pick(makeMeta({ number }), signals, templates)).templateId);
      expect(seen, template.id).toContain(template.id);
    }
  });

  it("throws when the catalog has no generic template", async () => {
    const noGeneric: Template[] = templates.filter((t) => t.rule.all.length > 0);
    await expect(picker.pick(makeMeta(), makeSignals(), noGeneric)).rejects.toThrow(/generic template/);
  });
});
