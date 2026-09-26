import { describe, expect, it, vi } from "vitest";
import { assertWebhookSecret, buildPickers, resolveTimeZone } from "../src/config.js";

const names = (env: Record<string, string>) => buildPickers(env, vi.fn()).map((p) => p.name);

describe("buildPickers", () => {
  it("uses only rules when nothing is configured", () => {
    expect(names({})).toEqual(["rules"]);
  });

  it("enables jev with an API key and von with a base URL, in the default order", () => {
    expect(names({ TYPESAFE_API_KEY: "k", VON_BASE_URL: "http://127.0.0.1:8000" })).toEqual(["jev", "von", "rules"]);
  });

  it("follows PICKERS order", () => {
    expect(names({ TYPESAFE_API_KEY: "k", VON_BASE_URL: "http://x", PICKERS: "von, jev, rules" })).toEqual(["von", "jev", "rules"]);
  });

  // Review focus: a typo or a missing key in PICKERS must warn, not crash, and still leave rules as the safety net.
  it("warns about unknown or unconfigured pickers and still ends with rules", () => {
    const log = vi.fn();
    const pickers = buildPickers({ PICKERS: "jev,gpt,von" }, log);
    expect(pickers.map((p) => p.name)).toEqual(["rules"]);
    expect(log).toHaveBeenCalledWith('picker "jev" is unknown or not configured; skipping it');
    expect(log).toHaveBeenCalledWith('picker "gpt" is unknown or not configured; skipping it');
    expect(log).toHaveBeenCalledWith(expect.stringContaining('"rules" missing from PICKERS'));
  });

  it("does not add a picker twice", () => {
    expect(names({ PICKERS: "rules,rules" })).toEqual(["rules"]);
  });

  it("falls back to 5000 ms for an invalid VON_TIMEOUT_MS", () => {
    const log = vi.fn();
    buildPickers({ VON_BASE_URL: "http://x", VON_TIMEOUT_MS: "soon" }, log);
    expect(log).toHaveBeenCalledWith('invalid VON_TIMEOUT_MS "soon"; using 5000');
  });
});

describe("resolveTimeZone", () => {
  it("defaults to Europe/Zurich", () => {
    expect(resolveTimeZone({}, vi.fn())).toBe("Europe/Zurich");
  });

  it("accepts a valid zone", () => {
    expect(resolveTimeZone({ TIMEZONE: "America/New_York" }, vi.fn())).toBe("America/New_York");
  });

  it("falls back to UTC for an invalid zone", () => {
    const log = vi.fn();
    expect(resolveTimeZone({ TIMEZONE: "Mars/Olympus" }, log)).toBe("UTC");
    expect(log).toHaveBeenCalledWith('invalid TIMEZONE "Mars/Olympus"; using UTC');
  });
});

// Final review: Probot silently falls back to the public secret "development" when WEBHOOK_SECRET is empty.
describe("assertWebhookSecret", () => {
  it.each([["missing", {}], ["empty", { WEBHOOK_SECRET: "" }], ["blank", { WEBHOOK_SECRET: "   " }]])(
    "throws when the secret is %s",
    (_label, env: Record<string, string>) => {
      expect(() => assertWebhookSecret(env)).toThrow(/WEBHOOK_SECRET/);
    },
  );

  it("accepts a real secret", () => {
    expect(() => assertWebhookSecret({ WEBHOOK_SECRET: "s3cret" })).not.toThrow();
  });
});
