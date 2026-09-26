import { describe, expect, it } from "vitest";
import { RulesPicker } from "../../src/pickers/rules.js";
import { templates } from "../../src/templates.js";
import type { Template } from "../../src/types.js";
import { makeMeta, makeSignals } from "../fixtures.js";

const picker = new RulesPicker();

describe("RulesPicker", () => {
  it("picks the generic template when no signal is set", async () => {
    expect(await picker.pick(makeMeta(), makeSignals(), templates)).toEqual({ templateId: "fry", confidence: 1, source: "rules" });
  });

  it("picks the highest-priority matching template", async () => {
    const signals = makeSignals({ isHuge: true, titleUndersells: true, isFridayEvening: true });
    expect((await picker.pick(makeMeta(), signals, templates)).templateId).toBe("mordor");
  });

  it.each([
    ["isFridayEvening", "fine"],
    ["isLateNight", "rollsafe"],
    ["deletesMoreThanAdds", "success"],
    ["isRevert", "same"],
    ["hasWipCommits", "noidea"],
    ["isHuge", "buzz"],
    ["isRefactor", "gb"],
    ["manyCommits", "yallgot"],
    ["noDescription", "cmm"],
    ["isTiny", "bihw"],
  ] as const)("maps %s to %s", async (signal, id) => {
    expect((await picker.pick(makeMeta(), makeSignals({ [signal]: true }), templates)).templateId).toBe(id);
  });

  it("throws when the catalog has no generic template", async () => {
    const noGeneric: Template[] = templates.filter((t) => t.rule.all.length > 0);
    await expect(picker.pick(makeMeta(), makeSignals(), noGeneric)).rejects.toThrow(/generic template/);
  });
});
