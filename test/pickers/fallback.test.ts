import { describe, expect, it, vi } from "vitest";
import { FallbackPicker } from "../../src/pickers/fallback.js";
import { templates } from "../../src/templates.js";
import type { Picker, PickResult } from "../../src/types.js";
import { makeMeta, makeSignals } from "../fixtures.js";

function stub(name: string, result: PickResult | null | Error): Picker {
  return {
    name,
    pick: vi.fn(async () => {
      if (result instanceof Error) throw result;
      return result;
    }),
  };
}

const run = (p: FallbackPicker) => p.pick(makeMeta(), makeSignals(), templates);

describe("FallbackPicker", () => {
  it("returns the first non-null result and skips later pickers", async () => {
    const later = stub("rules", { templateId: "fry", confidence: 1, source: "rules" });
    const picker = new FallbackPicker([stub("jev", { templateId: "gb", confidence: 0.9, source: "jev" }), later]);
    expect((await run(picker))?.source).toBe("jev");
    expect(later.pick).not.toHaveBeenCalled();
  });

  it("moves on when a picker returns null", async () => {
    const picker = new FallbackPicker([stub("jev", null), stub("von", null), stub("rules", { templateId: "fry", confidence: 1, source: "rules" })]);
    expect((await run(picker))?.source).toBe("rules");
  });

  it("logs and moves on when a picker throws", async () => {
    const log = vi.fn();
    const picker = new FallbackPicker([stub("von", new Error("boom")), stub("rules", { templateId: "fry", confidence: 1, source: "rules" })], log);
    expect((await run(picker))?.source).toBe("rules");
    expect(log).toHaveBeenCalledWith("von threw: boom");
  });

  it("returns null when every picker declines", async () => {
    expect(await run(new FallbackPicker([stub("jev", null)]))).toBeNull();
  });
});
