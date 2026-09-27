import { describe, expect, it, vi } from "vitest";
import { SystemOnePicker } from "../../src/pickers/systemone.js";
import { templates } from "../../src/templates.js";
import { makeMeta, makeSignals } from "../fixtures.js";

// Shape recorded from a real Jev call on 2026-09-26.
function jevAnswer(choice: string, confidence: number) {
  return {
    model: "jev-1.13.0",
    answers: { meme: { type: "choice", choice, confidence, probabilities: { [choice]: confidence } } },
    usage: { input_tokens: 616, output_tokens: 126 },
  };
}

function fakeFetch(status: number, body: unknown) {
  return vi.fn(async () => new Response(JSON.stringify(body), { status }));
}

function makePicker(fetchFn: typeof fetch, extra: { timeoutMs?: number; apiKey?: string } = {}) {
  const log = vi.fn();
  const picker = new SystemOnePicker({
    name: "jev",
    baseUrl: "https://api.typesafe.ai/",
    model: "jev-latest",
    apiKey: extra.apiKey,
    timeoutMs: extra.timeoutMs ?? 2000,
    fetch: fetchFn,
    log,
  });
  return { picker, log };
}

const pick = (picker: SystemOnePicker) => picker.pick(makeMeta(), makeSignals(), templates);

describe("SystemOnePicker", () => {
  it("returns the chosen template with its confidence", async () => {
    const { picker } = makePicker(fakeFetch(200, jevAnswer("mordor", 0.89)));
    expect(await pick(picker)).toEqual({ templateId: "mordor", confidence: 0.89, source: "jev" });
  });

  it("posts a choice question with every template plus 'other' to /v1/systemone", async () => {
    const fetchFn = fakeFetch(200, jevAnswer("fry", 0.9));
    const { picker } = makePicker(fetchFn, { apiKey: "secret" });
    await pick(picker);
    const [url, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(url).toBe("https://api.typesafe.ai/v1/systemone");
    expect((init.headers as Record<string, string>).authorization).toBe("Bearer secret");
    const body = JSON.parse(init.body as string);
    expect(body.model).toBe("jev-latest");
    expect(body.questions.meme.type).toBe("choice");
    expect(Object.keys(body.questions.meme.criteria)).toEqual([...templates.map((t) => t.id), "other"]);
    expect(body.state.signals).toEqual(makeSignals());
  });

  it("sends no authorization header without an API key", async () => {
    const fetchFn = fakeFetch(200, jevAnswer("fry", 0.9));
    await pick(makePicker(fetchFn).picker);
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect((init.headers as Record<string, string>).authorization).toBeUndefined();
  });

  it("trims the PR body to 1000 characters", async () => {
    const fetchFn = fakeFetch(200, jevAnswer("fry", 0.9));
    await makePicker(fetchFn).picker.pick(makeMeta({ body: "y".repeat(5000) }), makeSignals(), templates);
    const [, init] = fetchFn.mock.calls[0] as unknown as [string, RequestInit];
    expect(JSON.parse(init.body as string).state.pull_request.body).toHaveLength(1000);
  });

  it("returns null and logs for 'other'", async () => {
    const { picker, log } = makePicker(fakeFetch(200, jevAnswer("other", 0.99)));
    expect(await pick(picker)).toBeNull();
    expect(log).toHaveBeenCalledWith("jev: chose other (confidence 0.99)");
  });

  it("returns null and logs below 0.5 confidence", async () => {
    const { picker, log } = makePicker(fakeFetch(200, jevAnswer("mordor", 0.49)));
    expect(await pick(picker)).toBeNull();
    expect(log).toHaveBeenCalledWith("jev: chose mordor with confidence 0.49, below 0.5");
  });

  it("does not log an accepted answer", async () => {
    const { picker, log } = makePicker(fakeFetch(200, jevAnswer("mordor", 0.89)));
    await pick(picker);
    expect(log).not.toHaveBeenCalled();
  });

  // Review focus: a 200 response naming a template we don't have must not reach the caption builder.
  it("returns null and logs for an unknown template id", async () => {
    const { picker, log } = makePicker(fakeFetch(200, jevAnswer("nyan-cat", 0.99)));
    expect(await pick(picker)).toBeNull();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("unknown template"));
  });

  it.each([
    ["empty object", {}],
    ["missing confidence", { answers: { meme: { choice: "fry" } } }],
    ["null", null],
  ])("returns null for a malformed response (%s)", async (_label, body) => {
    const { picker, log } = makePicker(fakeFetch(200, body));
    expect(await pick(picker)).toBeNull();
    expect(log).toHaveBeenCalledWith("jev: malformed response");
  });

  it("returns null for a body that is not JSON", async () => {
    const fetchFn = vi.fn(async () => new Response("<html>bad gateway</html>", { status: 200 }));
    expect(await pick(makePicker(fetchFn).picker)).toBeNull();
  });

  it.each([401, 422, 429, 500, 529])("returns null and logs on HTTP %i", async (status) => {
    const { picker, log } = makePicker(fakeFetch(status, { error: "x" }));
    expect(await pick(picker)).toBeNull();
    expect(log).toHaveBeenCalledWith(`jev: HTTP ${status}`);
  });

  it("returns null on a network error", async () => {
    const fetchFn = vi.fn(async () => {
      throw new TypeError("fetch failed");
    });
    expect(await pick(makePicker(fetchFn).picker)).toBeNull();
  });

  it("returns null when the server is slower than the timeout", async () => {
    const hanging = vi.fn(
      (_url: string | URL | Request, init?: RequestInit) =>
        new Promise<Response>((_resolve, reject) => {
          init?.signal?.addEventListener("abort", () => reject(init.signal?.reason));
        }),
    );
    const { picker, log } = makePicker(hanging as unknown as typeof fetch, { timeoutMs: 20 });
    expect(await pick(picker)).toBeNull();
    expect(log).toHaveBeenCalledWith(expect.stringContaining("request failed"));
  });
});
