import { RulesPicker } from "./pickers/rules.js";
import { SystemOnePicker } from "./pickers/systemone.js";
import type { Picker } from "./types.js";

type Env = Record<string, string | undefined>;
type Log = (message: string) => void;

export const JEV_BASE_URL = "https://api.typesafe.ai";
const DEFAULT_ORDER = "jev,von,rules";

function positiveNumber(raw: string | undefined, fallback: number, label: string, log: Log): number {
  if (raw === undefined || raw === "") return fallback;
  const n = Number(raw);
  if (Number.isFinite(n) && n > 0) return n;
  log(`invalid ${label} "${raw}"; using ${fallback}`);
  return fallback;
}

export function buildPickers(env: Env, log: Log): Picker[] {
  const available: Record<string, Picker | undefined> = {
    jev: env.TYPESAFE_API_KEY
      ? new SystemOnePicker({
          name: "jev",
          baseUrl: JEV_BASE_URL,
          model: "jev-latest",
          apiKey: env.TYPESAFE_API_KEY,
          timeoutMs: 2000,
          log,
        })
      : undefined,
    von: env.VON_BASE_URL
      ? new SystemOnePicker({
          name: "von",
          baseUrl: env.VON_BASE_URL,
          model: env.VON_MODEL || "von-latest",
          timeoutMs: positiveNumber(env.VON_TIMEOUT_MS, 5000, "VON_TIMEOUT_MS", log),
          log,
        })
      : undefined,
    rules: new RulesPicker(),
  };

  const order = (env.PICKERS || DEFAULT_ORDER).split(",").map((s) => s.trim()).filter(Boolean);
  const pickers: Picker[] = [];
  for (const name of order) {
    const picker = available[name];
    if (picker && !pickers.includes(picker)) pickers.push(picker);
    else if (!picker) log(`picker "${name}" is unknown or not configured; skipping it`);
  }
  if (!pickers.some((p) => p.name === "rules")) {
    log('"rules" missing from PICKERS; adding it last so every PR still gets a meme');
    pickers.push(new RulesPicker());
  }
  return pickers;
}

export function resolveTimeZone(env: Env, log: Log): string {
  const tz = env.TIMEZONE || "Europe/Zurich";
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return tz;
  } catch {
    log(`invalid TIMEZONE "${tz}"; using UTC`);
    return "UTC";
  }
}

// Probot falls back to the publicly known secret "development" when WEBHOOK_SECRET is empty,
// which would let anyone forge webhooks. Refuse to start instead.
export function assertWebhookSecret(env: Env): void {
  if (!env.WEBHOOK_SECRET?.trim()) {
    throw new Error("WEBHOOK_SECRET is empty; set it to the webhook secret configured on the GitHub App");
  }
}
