// Manual check, never run in CI: sends one real request to Jev or a local Von server.
// Usage: npm run check:systemone -- jev   |   npm run check:systemone -- von
import { JEV_BASE_URL } from "../src/config.js";
import { SystemOnePicker } from "../src/pickers/systemone.js";
import { computeSignals } from "../src/signals.js";
import { templates } from "../src/templates.js";
import type { PrMetadata } from "../src/types.js";

try {
  process.loadEnvFile(".env");
} catch {
  // no .env file; rely on the real environment
}

const target = process.argv[2];
if (target !== "jev" && target !== "von") {
  console.error("usage: npm run check:systemone -- jev|von");
  process.exit(2);
}

const picker =
  target === "jev"
    ? new SystemOnePicker({
        name: "jev",
        baseUrl: JEV_BASE_URL,
        model: "jev-latest",
        apiKey: process.env.TYPESAFE_API_KEY,
        timeoutMs: 10_000,
        minConfidence: 0,
        log: console.error,
      })
    : new SystemOnePicker({
        name: "von",
        baseUrl: process.env.VON_BASE_URL || "http://127.0.0.1:8000",
        model: process.env.VON_MODEL || "von-latest",
        timeoutMs: 60_000,
        minConfidence: 0,
        log: console.error,
      });

const samples: Array<[string, string, PrMetadata]> = [
  ["mordor", "huge PR titled as a typo fix", {
    number: 1, title: "small typo fix", body: "", labels: ["chore"], changedFiles: 47,
    additions: 2310, deletions: 1894, commitMessages: ["fix typo", "wip", "wip", "actually fix everything"],
    createdAt: "2026-09-22T08:00:00Z", author: "octocat",
  }],
  ["gb", "over-engineered refactor", {
    number: 2, title: "Rewrite logger as plugin-based event bus with DI container", body: "Makes logging extensible.",
    labels: ["refactor"], changedFiles: 3, additions: 640, deletions: 12,
    commitMessages: ["add AbstractLoggerFactoryProvider", "add plugin registry", "add DI container"],
    createdAt: "2026-09-22T08:00:00Z", author: "octocat",
  }],
];

let failures = 0;
for (const [expected, label, meta] of samples) {
  const started = performance.now();
  const result = await picker.pick(meta, computeSignals(meta, "Europe/Zurich"), templates);
  const ms = Math.round(performance.now() - started);
  const ok = result?.templateId === expected;
  if (!ok) failures++;
  console.log(`${ok ? "OK  " : "MISS"} ${label}: picked ${result?.templateId ?? "nothing"} ` +
    `(confidence ${result?.confidence ?? "-"}, expected ${expected}) in ${ms} ms`);
}
process.exit(failures === samples.length ? 1 : 0);
