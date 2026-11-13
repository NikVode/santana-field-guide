// Strips source citations and verification notes from the guide's text before the bot shows it.
// The guild treats the guide as correct, so the bot states it plainly. The site keeps its notes;
// only what the bot shows changes. See SCHEMA_NOTES.md > "What the bot leaves out".

import type { Encounter } from "./types";

/** Guide and site names the guide cites. */
const SOURCE = String.raw`Game8|GameMarket|Where Guilds Meet|allthings\.how|Mein-?MMO|SenseOS|(?:WWM|Where Winds Meet) Handbook|Fextralife|Reddit|YouTube|Points N Pixels|wiki|Akira Y`;
const SOURCE_RE = new RegExp(String.raw`\b(?:${SOURCE})`, "i");
/** A source at the start of a sentence, alone or joined with "and" / "/": "Game8", "Game8 and Where Guilds Meet". */
const LEAD = String.raw`(?:${SOURCE})(?:\s*(?:and|&|\/|,)\s*(?:the\s+)?(?:${SOURCE}|in-game (?:text|callouts?)))*`;

/** A bracketed aside is a citation when it names a source, says "in-game", or is about checking. */
const ASIDE_RE = new RegExp(String.raw`${SOURCE}|\bin-game\b|\bin game\b|\bconfirm|\bverif|\bsources?\b|\bofficial\b|\bnotice\b|\boverview\b`, "i");

/** Sentences that only say where something came from, or ask someone to check. */
const META_SENTENCES: RegExp[] = [
  new RegExp(String.raw`^(?:${LEAD})(?:'s|’s)\b`, "i"),                                      // "allthings.how's run sent orange notes."
  new RegExp(String.raw`^(?:${LEAD})\s+(?:also\s+|both\s+|just\s+)?(?:says?|gives?|calls?|agrees?|describes?|words?|counts?|names?|lists?|has|shows?)\b`, "i"),
  /^(?:check|confirm|verify)\b.*\bin[- ]game\b/i,                                            // "Check in game which leg to focus."
  /^(?:check|confirm) in game\.?$/i,
  /^(?:confirmed|reported|according to|per|sourced?)\b/i,                                     // "Confirmed by the official patch notes, …"
  /\b(?:video (?:descriptions?|guides?)|written guide|cheat-sheet depth|research notes|source link|no guide we read)\b/i,
];

/** Things that make a whole note about sources or verification rather than gameplay. */
const NOTE_DROP_RE = new RegExp([
  SOURCE,
  String.raw`\bconfirm(?:ed|s)?\b`, String.raw`\bverif`, String.raw`\bassumed\b`, String.raw`\bsources?\b`,
  String.raw`\btalent text\b`, String.raw`\bin-game (?:text|names?|objective|data|recommendation)\b`,
  String.raw`\bcallout says\b`, String.raw`\bsame condition\b`, String.raw`\bOct 29 notes\b`, String.raw`\bagrees\b`,
  String.raw`\bnot documented\b`,
].join("|"), "i");

const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const noEndDot = (s: string) => s.trim().replace(/[.;,\s]+$/, "");

const SENTENCE_END = new RegExp(String.raw`[.!?](?=\s+(?:["'‘“(]?[A-Z0-9]|(?:${SOURCE})))`, "g");

/** Split into sentences without breaking "e.g." / "vs." / decimals. */
function sentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  // A new sentence starts with a capital, a digit, or a lower-case source name ("allthings.how's run…").
  for (const m of text.matchAll(SENTENCE_END)) {
    const before = text.slice(start, m.index);
    if (/\b(?:e\.g|i\.e|vs|etc|approx|lv|no|st)$/i.test(before) || /\b[A-Z]$/.test(before)) continue;
    out.push(text.slice(start, m.index! + 1).trim());
    start = m.index! + 1;
  }
  const rest = text.slice(start).trim();
  if (rest) out.push(rest);
  return out;
}

/** Remove bracketed asides that cite a source, innermost first. */
function dropAsides(text: string): string {
  let prev: string, s = text;
  do {
    prev = s;
    s = s.replace(/\s*\(([^()]*)\)/g, (all, inner: string) => (ASIDE_RE.test(inner) ? "" : all));
  } while (s !== prev);
  return s;
}

/**
 * Remove source citations and "check in game" tags from one piece of text.
 * Gameplay content is kept; only the citation around it goes.
 */
export function scrub(text: string): string {
  let s = String(text ?? "");
  if (!s.trim()) return s;

  // "Sources differ: Game8 says X; the in-game callout just says Y. Either way, Z." -> "X. Z."
  s = s.replace(/Sources differ:\s*[^;]*?\bsays?\s+([^;]+);[^.]*\.\s*Either way,?\s*([^.]+\.?)/gi,
    (_all, x: string, z: string) => `${cap(noEndDot(x))}. ${cap(z.trim())}`);

  s = dropAsides(s);
  s = s.replace(/,?\s*per (?:the )?in-game data\b/gi, "");

  const kept: string[] = [];
  for (const orig of sentences(s)) {
    const sent = orig
      .replace(new RegExp(String.raw`^(?:${LEAD}|Official)\s*:\s*`, "i"), "")   // "Game8: in wolf form…" -> "In wolf form…"
      .replace(/^(?:the )?in-game callouts? (?:just )?says?\s+/i, "")            // "The in-game callout says play quickly…"
      .replace(/^(?:the )?Oct 29 notes confirm (?:that )?/i, "");               // "The Oct 29 notes confirm it does NOT…"
    if (!sent.trim()) continue;
    if (META_SENTENCES.some((re) => re.test(sent.trim()))) continue;
    kept.push(sent === orig ? sent.trim() : cap(sent.trim())); // only re-capitalize where a lead-in was cut
  }
  const out = kept.join(" ").replace(/\s+([,.;:!?])/g, "$1").replace(/\s{2,}/g, " ").trim();
  return out === String(text).trim() ? String(text) : out;
}

/** A note, scrubbed, or "" when it's only about sources or verification. */
export function cleanNote(note: string): string {
  const s = scrub(note).replace(/^Guild notes add:\s*/i, "");
  if (!s || NOTE_DROP_RE.test(s)) return "";
  return s === note ? s : cap(s);
}

// `boss` (on commonFailures) and `coverage` are ids/enums, not shown text.
const SKIP = new Set(["id", "url", "video", "videos", "sources", "verifyNote", "verifyNotes", "type", "boss", "coverage"]);
const NOTE_KEYS = new Set(["note", "notes", "worldBossNote"]);

function cleanValue(v: unknown, key: string, asNote: boolean): unknown {
  if (typeof v === "string") return asNote ? cleanNote(v) : scrub(v);
  if (Array.isArray(v)) {
    const out = v.map((x) => cleanValue(x, key, asNote));
    return asNote ? out.filter((x) => x !== "") : out;
  }
  if (v && typeof v === "object") {
    const o: Record<string, unknown> = {};
    for (const [k, x] of Object.entries(v as Record<string, unknown>)) {
      if (SKIP.has(k)) { o[k] = x; continue; }
      const c = cleanValue(x, k, NOTE_KEYS.has(k));
      if (NOTE_KEYS.has(k) && (c === "" || (Array.isArray(c) && !c.length && !Array.isArray(x)))) continue;
      o[k] = c;
    }
    return o;
  }
  return v;
}

/** Deep copy of the encounters with every shown string scrubbed (the site's data is never changed). */
export function cleanEncounters(encounters: Encounter[]): Encounter[] {
  return encounters.map((e) => cleanValue(e, "", false) as Encounter);
}
