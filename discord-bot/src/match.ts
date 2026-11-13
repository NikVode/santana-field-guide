// Name matching for autocomplete and free-typed names. The index is built from whatever is
// in the live data, plus nicknames from aliases.json and level shortcuts generated from the data.

import aliasFile from "../aliases.json";
import type { Boss, Encounter } from "./types";
import { TYPE_LABEL } from "./types";

export type Target =
  | { kind: "encounter"; key: string; enc: Encounter }
  | { kind: "boss"; key: string; enc: Encounter; boss: Boss };

interface Entry { target: Target; label: string; terms: string[]; aliasTerms: string[] }
/** byLabel: normalized autocomplete label -> entry. Discord sometimes sends the picked choice's label instead of its value. */
export interface Index { entries: Entry[]; byKey: Map<string, Entry>; byLabel: Map<string, Entry> }

/** lowercase, apostrophes dropped, other punctuation -> space, collapsed. */
export const norm = (s: string) => String(s).toLowerCase().normalize("NFKD").replace(/[̀-ͯ]/g, "")
  .replace(/['’‘`]/g, "").replace(/&/g, " and ").replace(/[^a-z0-9]+/g, " ").trim();
const compact = (s: string) => norm(s).replace(/ /g, "");

const stripParen = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, " ").trim();
const parens = (s: string) => [...s.matchAll(/\(([^)]*)\)/g)].map((m) => m[1].replace(/^\+\s*/, "").replace(/^the\s+/i, ""));

function nameTerms(name: string): string[] {
  const out = [name, stripParen(name)];
  for (const p of parens(name)) { out.push(p); out.push(...p.split(/\s*&\s*/)); }
  return [...new Set(out.map(norm).filter(Boolean))];
}

const short = (t: string) => (t === "sword-trial" ? "st" : "hr");

export function encLabel(e: Encounter) {
  return `${e.name} · ${TYPE_LABEL[e.type] || e.type} Lv ${e.level} · ${e.bosses.length} boss${e.bosses.length === 1 ? "" : "es"}`;
}
export function bossLabel(e: Encounter, b: Boss) {
  return `${b.name} · ${e.name} (${short(e.type).toUpperCase()} Lv ${e.level})`;
}

type AliasMap = Record<string, string | string[]>;

export function buildIndex(encounters: Encounter[], aliases: AliasMap = (aliasFile as { aliases: AliasMap }).aliases): Index {
  const entries: Entry[] = [];
  const byKey = new Map<string, Entry>();
  const byLabel = new Map<string, Entry>();
  const add = (en: Entry) => {
    entries.push(en); byKey.set(en.target.key, en);
    // Both the full label and the 100-char version autocomplete actually sends; the first entry wins a tie.
    for (const l of [en.label, en.label.slice(0, 100)]) if (!byLabel.has(norm(l))) byLabel.set(norm(l), en);
  };
  for (const e of encounters) {
    const levels = [e.level, ...(e.variants || []).map((v) => v.level)];
    const lvTerms = levels.flatMap((l) => [`lv${l} ${short(e.type)}`, `lv ${l} ${short(e.type)}`, `${short(e.type)}${l}`, `${short(e.type)} ${l}`, `${l} ${short(e.type)}`]);
    const variantTerms = (e.variants || []).map((v) => `${stripParen(e.name)} ${v.name}`);
    add({ target: { kind: "encounter", key: e.id, enc: e }, label: encLabel(e),
      terms: [...nameTerms(e.name), ...variantTerms.map(norm), norm(e.id)], aliasTerms: lvTerms.map(norm) });
    for (const b of e.bosses) {
      add({ target: { kind: "boss", key: `${e.id}/${b.id}`, enc: e, boss: b }, label: bossLabel(e, b),
        terms: [...nameTerms(b.name), norm(b.id)], aliasTerms: [] });
    }
  }
  for (const [nick, to] of Object.entries(aliases || {})) {
    for (const key of Array.isArray(to) ? to : [to]) {
      const en = byKey.get(key);
      if (en) en.aliasTerms.push(norm(nick)); // aliases pointing at ids the site no longer has are ignored
    }
  }
  return { entries, byKey, byLabel };
}

/** 0 exact, 1 prefix, 2 word prefix, 3 substring, 4 compact substring; aliases +0.5; null = no match. */
function score(q: string, en: Entry): number | null {
  const qc = q.replace(/ /g, "");
  let best: number | null = null;
  const consider = (t: string, bonus: number) => {
    let s: number | null = null;
    if (t === q) s = 0;
    else if (t.startsWith(q)) s = 1;
    else if ((" " + t).includes(" " + q)) s = 2;
    else if (t.includes(q)) s = 3;
    else if (qc.length >= 3 && t.replace(/ /g, "").includes(qc)) s = 4;
    if (s != null && (best == null || s + bonus < best)) best = s + bonus;
  };
  en.terms.forEach((t) => consider(t, 0));
  en.aliasTerms.forEach((t) => consider(t, 0.5));
  return best;
}

export type Prefer = "boss" | "encounter";

function rank(index: Index, query: string, prefer: Prefer) {
  const q = norm(query);
  const kindBias = (en: Entry) => (en.target.kind === prefer ? 0 : 0.25);
  const scored = index.entries.map((en) => ({ en, s: q ? score(q, en) : 5 }))
    .filter((x) => x.s != null) as { en: Entry; s: number }[];
  return scored.sort((a, b) => (a.s + kindBias(a.en)) - (b.s + kindBias(b.en))
    || b.en.target.enc.level - a.en.target.enc.level || a.en.label.localeCompare(b.en.label));
}

export interface Choice { name: string; value: string }

/** Up to 25 autocomplete choices. Empty query lists the preferred kind, highest level first. */
export function autocomplete(index: Index, query: string, prefer: Prefer, limit = 25): Choice[] {
  let list = rank(index, query, prefer);
  if (!norm(query)) list = list.filter((x) => x.en.target.kind === prefer);
  return list.slice(0, limit).map(({ en }) => ({ name: en.label.slice(0, 100), value: en.target.key.slice(0, 100) }));
}

function lev(a: string, b: string): number {
  if (a === b) return 0;
  const prev = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i;
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j];
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1));
      diag = tmp;
    }
  }
  return prev[b.length];
}

/** The 3 closest names for something that didn't match. */
export function suggest(index: Index, query: string, n = 3): Entry[] {
  const q = compact(query);
  const dist = (en: Entry) => Math.min(...[...en.terms, ...en.aliasTerms].map((t) => {
    const tc = t.replace(/ /g, "");
    return Math.min(lev(q, tc), lev(q, tc.slice(0, q.length)) + 1) / Math.max(q.length, 1);
  }));
  const seen = new Set<string>();
  return index.entries.map((en) => ({ en, d: dist(en) })).sort((a, b) => a.d - b.d)
    .filter(({ en }) => { const k = en.label; if (seen.has(k)) return false; seen.add(k); return true; })
    .slice(0, n).map((x) => x.en);
}

export type Resolved = { ok: true; target: Target } | { ok: false; suggestions: Entry[] };

/** Resolve a picked autocomplete value (its id, or its label), or free text. */
export function resolve(index: Index, value: string, prefer: Prefer): Resolved {
  const raw = String(value || "").trim();
  const direct = index.byKey.get(raw) || index.byLabel.get(norm(raw));
  if (direct) return { ok: true, target: direct.target };
  // A label from an older index (e.g. the boss count changed): retry with the name before the first "·".
  if (raw.includes("·")) {
    const head = raw.slice(0, raw.indexOf("·")).trim();
    if (head) { const r = resolve(index, head, prefer); if (r.ok) return r; }
  }
  const q = norm(raw);
  if (!q) return { ok: false, suggestions: suggest(index, raw) };
  const ranked = rank(index, raw, prefer);
  const best = ranked.filter((x) => x.s === ranked[0]?.s);
  // Take the best match when it is a strong one (exact, alias, prefix or substring) and all the
  // best-scoring candidates belong to one encounter. Otherwise offer the closest names.
  if (ranked.length && ranked[0].s <= 3.5 && encountersIn(best) === 1) {
    const pick = best.find((x) => x.en.target.kind === prefer) || best[0];
    return { ok: true, target: pick.en.target };
  }
  return { ok: false, suggestions: ranked.length ? ranked.slice(0, 3).map((x) => x.en) : suggest(index, raw) };
}

const encountersIn = (list: { en: Entry }[]) => new Set(list.map((x) => x.en.target.enc.id)).size;
