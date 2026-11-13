// The bot states the guide confidently: no source citations and no "needs verification" talk.
// The site keeps its sources; the bot strips them from everything it shows.
//  - "(Game8)", "(in-game callout; Game8 says three)" and similar asides are removed.
//  - Sentences that only exist to cite a source ("allthings.how's run sent orange notes.") are removed.
//  - Notes (note, notes, worldBossNote) that are only about sources or verification are dropped whole.

import type { Encounter } from "./types";

const SOURCES = String.raw`game8|gamemarket|where guilds meet|allthings(?:\.how)?|mein-?mmo|senseos|(?:wwm|where winds meet) handbook|fextralife|reddit|youtube|points n pixels|wiki`;
const SOURCE_NAME = new RegExp(String.raw`\b(?:${SOURCES})\b`, "i");
const SOURCE_PAREN = new RegExp(String.raw`\s*\([^)]*\b(?:${SOURCES}|in-game)\b[^)]*\)`, "gi");
const SOURCE_TALK = new RegExp(String.raw`\b(?:${SOURCES}|video|official|patch notes|the \w{3} \d{1,2} notes|confirmed|unconfirmed|verif\w*|assumed|sources?|in-game (?:text|name|objective)|callout says|talent text|guides? we read|calls it|same condition)\b`, "i");

const cap = (t: string) => (t ? t[0].toUpperCase() + t.slice(1) : t);

/** Remove source asides and source-only sentences from a piece of guide text. */
export function scrub(text?: string): string {
  let t = String(text ?? "").replace(/\s*\b(?:check|confirm)(?: (?:it|this))? in(?:[- ]game| the trial)\.?/gi, "").trim();
  if (!SOURCE_NAME.test(t) && !/\(in-game[^)]*\)/i.test(t)) return t;
  // "Sources differ: Game8 says X; the in-game callout just says Y. Either way, Z." -> "X. Z."
  t = t.replace(/^sources differ:\s*\S+(?: and \S+)? says\s+([^;]+);[^.]*\.\s*(?:either way,\s*(.*))?$/i,
    (_m, x, rest) => cap(x.trim()) + "." + (rest ? " " + cap(rest.trim()) : ""));
  t = t.replace(SOURCE_PAREN, "");
  const sentences = t.split(/(?<!\b(?:e\.g|i\.e|vs|etc))(?<=[.!?])\s+(?=\S)/);
  const kept = sentences.filter((s) => !SOURCE_NAME.test(s));
  t = (kept.length ? kept : sentences).join(" ");
  return cap(t.replace(/\s+([,.;:])/g, "$1").replace(/\s{2,}/g, " ").trim());
}

/** A note cleaned for Discord, or "" when it's only about sources or verification. */
export function cleanNote(note?: string): string {
  const t = scrub(String(note || "").replace(/^guild notes add:\s*/i, ""));
  if (!t || SOURCE_TALK.test(t)) return "";
  return cap(t);
}

const SKIP = new Set(["id", "url", "video", "videos", "sources", "verifyNote", "verifyNotes", "type", "anchor"]);
const NOTE = new Set(["note", "notes", "worldBossNote"]);

function walk(v: unknown, key = ""): unknown {
  if (typeof v === "string") return NOTE.has(key) ? cleanNote(v) : scrub(v);
  if (Array.isArray(v)) {
    const out = v.map((x) => walk(x, key));
    return key === "notes" ? out.filter((x) => x !== "") : out;
  }
  if (v && typeof v === "object") {
    const out: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v)) out[k] = SKIP.has(k) ? x : walk(x, k);
    return out;
  }
  return v;
}

/** A copy of the encounters with every shown string scrubbed. */
export function cleanEncounters(encounters: Encounter[]): Encounter[] {
  return encounters.map((e) => walk(e) as Encounter);
}
