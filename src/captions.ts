import type { PrMetadata, Signals, Template } from "./types.js";

export interface Caption {
  lines: string[]; // filled caption, one entry per meme text box
  text: string; // lines joined with " / ", for alt text and the text-only fallback
  url: string; // memegen.link image URL
}

const SLOT = /\{(\w+)\}/g;
const MAX_SLOT_LENGTH = 60;

// memegen.link special characters: https://memegen.link/#special-characters
const MEMEGEN_ESCAPES: Record<string, string> = {
  "_": "__",
  "-": "--",
  " ": "_",
  "?": "~q",
  "&": "~a",
  "%": "~p",
  "#": "~h",
  "/": "~s",
  "\\": "~b",
  "<": "~l",
  ">": "~g",
  '"': "''",
  "\n": "~n",
};

export function escapeMemegen(text: string): string {
  const clean = text.replace(/\r/g, "");
  if (clean.trim() === "") return "_"; // memegen's blank line
  const escaped = [...clean].map((c) => MEMEGEN_ESCAPES[c] ?? c).join("");
  return encodeURIComponent(escaped); // leaves _ - ~ ' untouched, encodes unicode and emoji
}

function truncate(value: string): string {
  return value.length > MAX_SLOT_LENGTH ? `${value.slice(0, MAX_SLOT_LENGTH - 1)}…` : value;
}

export function slotValues(meta: PrMetadata, signals: Signals): Record<string, string> {
  return {
    files: String(meta.changedFiles),
    lines: String(signals.linesChanged),
    additions: String(meta.additions),
    deletions: String(meta.deletions),
    commits: String(meta.commitMessages.length),
    title: meta.title,
    author: meta.author,
  };
}

export function buildCaption(template: Template, meta: PrMetadata, signals: Signals): Caption {
  // Deterministic choice so a redelivered webhook produces the same caption.
  const chosen = template.captions[meta.number % template.captions.length];
  if (!chosen) throw new Error(`template ${template.id} has no captions`);
  const values = slotValues(meta, signals);
  const lines = chosen.map((line) =>
    line.replace(SLOT, (match, key: string) => (key in values ? truncate(values[key] ?? "") : match)),
  );
  const url = `https://api.memegen.link/images/${template.id}/${lines.map(escapeMemegen).join("/")}.png`;
  return { lines, text: lines.join(" / "), url };
}
