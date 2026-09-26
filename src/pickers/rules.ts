import type { Picker, PickResult, PrMetadata, Signals, Template } from "../types.js";

export class RulesPicker implements Picker {
  readonly name = "rules";

  async pick(_meta: PrMetadata, signals: Signals, templates: Template[]): Promise<PickResult> {
    const matches = templates
      .filter((t) => t.rule.all.length > 0 && t.rule.all.every((s) => signals[s]))
      .sort((a, b) => b.rule.priority - a.rule.priority);
    const chosen = matches[0] ?? templates.find((t) => t.rule.all.length === 0);
    if (!chosen) throw new Error("template catalog has no generic template (rule.all = [])");
    return { templateId: chosen.id, confidence: 1, source: this.name };
  }
}
