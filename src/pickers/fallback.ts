import type { Picker, PickResult, PrMetadata, Signals, Template } from "../types.js";

export class FallbackPicker implements Picker {
  readonly name = "fallback";

  constructor(
    readonly pickers: Picker[],
    private readonly log: (message: string) => void = () => {},
  ) {}

  async pick(meta: PrMetadata, signals: Signals, templates: Template[]): Promise<PickResult | null> {
    for (const picker of this.pickers) {
      try {
        const result = await picker.pick(meta, signals, templates);
        if (result) return result;
      } catch (err) {
        this.log(`${picker.name} threw: ${(err as Error).message}`);
      }
    }
    return null;
  }
}
