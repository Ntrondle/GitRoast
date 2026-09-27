import type { Picker, PickResult, PrMetadata, Signals, Template } from "../types.js";

export interface SystemOneOptions {
  name: string; // "jev" or "von"; also used as PickResult.source
  baseUrl: string; // e.g. https://api.typesafe.ai or http://127.0.0.1:8000
  model: string;
  apiKey?: string;
  timeoutMs: number;
  minConfidence?: number; // default 0.5
  fetch?: typeof fetch; // injectable for tests
  log?: (message: string) => void;
}

const QUESTION = "Which meme template best captures the irony or humor of this pull request?";
const MAX_BODY = 1000;

export class SystemOnePicker implements Picker {
  constructor(private readonly opts: SystemOneOptions) {}

  get name(): string {
    return this.opts.name;
  }

  buildRequest(meta: PrMetadata, signals: Signals, templates: Template[]): unknown {
    const criteria: Record<string, string> = {};
    for (const t of templates) criteria[t.id] = t.description;
    criteria.other = "None of these memes fits this pull request.";
    return {
      model: this.opts.model,
      state: { pull_request: { ...meta, body: meta.body.slice(0, MAX_BODY) }, signals },
      questions: { meme: { type: "choice", instructions: QUESTION, criteria } },
    };
  }

  async pick(meta: PrMetadata, signals: Signals, templates: Template[]): Promise<PickResult | null> {
    const { name, baseUrl, apiKey, timeoutMs } = this.opts;
    const log = this.opts.log ?? (() => {});
    // Every answer that falls through to the next picker says why, so "picked by rules" is never a mystery.
    const reject = (reason: string): null => {
      log(`${name}: ${reason}`);
      return null;
    };
    const doFetch = this.opts.fetch ?? fetch;
    const headers: Record<string, string> = { "content-type": "application/json" };
    if (apiKey) headers.authorization = `Bearer ${apiKey}`;

    let data: unknown;
    try {
      const res = await doFetch(`${baseUrl.replace(/\/+$/, "")}/v1/systemone`, {
        method: "POST",
        headers,
        body: JSON.stringify(this.buildRequest(meta, signals, templates)),
        signal: AbortSignal.timeout(timeoutMs),
      });
      if (!res.ok) return reject(`HTTP ${res.status}`);
      data = await res.json();
    } catch (err) {
      return reject(`request failed: ${(err as Error).message}`);
    }

    const answer = (data as { answers?: { meme?: { choice?: unknown; confidence?: unknown } } })?.answers?.meme;
    if (typeof answer?.choice !== "string" || typeof answer.confidence !== "number") {
      return reject("malformed response");
    }
    const { choice, confidence } = answer as { choice: string; confidence: number };
    const minConfidence = this.opts.minConfidence ?? 0.5;
    if (choice === "other") return reject(`chose other (confidence ${confidence})`);
    if (!templates.some((t) => t.id === choice)) return reject(`unknown template "${choice}"`);
    if (confidence < minConfidence) {
      return reject(`chose ${choice} with confidence ${confidence}, below ${minConfidence}`);
    }
    return { templateId: choice, confidence, source: name };
  }
}
