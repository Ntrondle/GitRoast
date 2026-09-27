import { chooseIndex } from "../choose.js";
import type { Picker, PickResult, PrMetadata, Signals, Template } from "../types.js";

export class RulesPicker implements Picker {
  readonly name = "rules";

  async pick(meta: PrMetadata, signals: Signals, templates: Template[]): Promise<PickResult> {
    const matches = templates.filter((t) => t.rule.all.length > 0 && t.rule.all.every((s) => signals[s]));
    const top = Math.max(...matches.map((t) => t.rule.priority));
    // Several templates can share a priority; rotate between them so the same signal doesn't always get the same meme.
    const candidates = matches.length > 0 ? matches.filter((t) => t.rule.priority === top) : templates.filter((t) => t.rule.all.length === 0);
    if (candidates.length === 0) throw new Error("template catalog has no generic template (rule.all = [])");
    const chosen = candidates[chooseIndex(`pr:${meta.number}`, candidates.length)]!;
    return { templateId: chosen.id, confidence: 1, source: this.name };
  }
}
