// Turns encounters and bosses from the site's data into Discord embeds.

import { buildEmbed, clip, L, type Embed, type Line } from "./embed";
import type { Boss, Encounter } from "./types";
import { TYPE_LABEL } from "./types";

export const COLOR = { "sword-trial": 0xc8432f, "heros-realm": 0xd4a24c, times: 0x4f7cac } as const;
const colorOf = (e: Encounter) => COLOR[e.type] ?? COLOR["sword-trial"];

export const encUrl = (site: string, e: Encounter, anchor?: string) =>
  `${site}encounter.html?id=${encodeURIComponent(e.id)}${anchor ? "#" + anchor : ""}`;
export const bossUrl = (site: string, e: Encounter, b: Boss) => encUrl(site, e, "boss-" + b.id);

const shortName = (s: string) => s.replace(/\s*\([^)]*\)\s*/g, " ").trim();
const arr = <T>(x: T[] | T | null | undefined): T[] => (Array.isArray(x) ? x : x == null || (x as unknown) === "" ? [] : [x]);
const noDot = (s: string) => String(s || "").trim().replace(/[.。]+$/, "");
const ABBREV = new Set(["e.g", "i.e", "vs", "etc", "approx", "cf", "no", "st", "lv", "min", "sec"]);
/** First sentence, not fooled by "e.g." / "vs." / single initials. */
function firstSentence(text: string, max = 160) {
  const s = String(text);
  for (const m of s.matchAll(/[.!?](?=\s|$)/g)) {
    const word = (s.slice(0, m.index).match(/(\S+)$/) || ["", ""])[1].toLowerCase().replace(/^[(\[]/, "");
    if (m[0] === "." && (ABBREV.has(word) || /^[a-z]$/i.test(word))) continue;
    return clip(s.slice(0, m.index! + 1), max);
  }
  return clip(s, max);
}
const WARN = "⚠";

/** "Lv 100 · 5 players" style header line for an encounter. */
function metaLine(e: Encounter) {
  const lv = [e.level, ...arr(e.variants).map((v) => v.level)].filter((l, i, a) => a.indexOf(l) === i).join(" / ");
  return `${TYPE_LABEL[e.type] || e.type} · Lv ${lv} · ${e.players} players`;
}

function coverageLines(e: Encounter): Line[] {
  const out: Line[] = [];
  if (e.coverage && e.coverage !== "full") out.push(L(`_Guide coverage: ${e.coverage}. Confirm in game._`, 1));
  if (e.needsVerification) out.push(L(`${WARN} _Parts of this guide still need verification._`, 1));
  return out;
}

/** Lower-case the first letter of a trigger so it reads "When a yellow line…", unless it starts with a name. */
function lcTrigger(text: string, names: string[]) {
  const t = noDot(text);
  const w = (t.match(/^[A-Za-z'’-]+/) || [""])[0];
  if (!w || /[A-Z]/.test(w.slice(1)) || w === "I") return t;
  if (names.some((n) => n && t.toLowerCase().startsWith(n.toLowerCase()) && /^[^A-Za-z]?$/.test(t.charAt(n.length) || ""))) return t;
  return t[0].toLowerCase() + t.slice(1);
}
/** Names a trigger might start with: bosses (full, short, bracketed parts, first word), mechanics, the encounter. */
function namesFor(e: Encounter, b: Boss): string[] {
  const out = [e.name, shortName(e.name)];
  for (const x of e.bosses) {
    out.push(x.name, shortName(x.name), shortName(x.name).split(" ")[0]);
    for (const m of x.name.matchAll(/\(([^)]*)\)/g)) out.push(m[1].replace(/^the\s+/i, ""), ...m[1].split(/\s*&\s*/));
  }
  arr(b.mechanics).forEach((m) => out.push(m.name, shortName(m.name)));
  return [...new Set(out.map((s) => s.trim()).filter((s) => s.length >= 3))];
}

export function mechanicLines(e: Encounter, b: Boss): Line[] {
  const prot = namesFor(e, b);
  return arr(b.mechanics).flatMap((m, i) => {
    const out = [L(`**${i + 1}. ${m.name}**${m.needsVerification ? " " + WARN : ""}: When ${lcTrigger(m.trigger, prot)} → ${m.response}`, 1)];
    if (m.note) out.push(L(`  _${m.note}_`, 3));
    return out;
  });
}

export function talentLines(b: Boss, withNotes = false): Line[] {
  return arr(b.talents).flatMap((t) => {
    const team = /team only/i.test(t.smartAssist || "") ? " · _team only_" : "";
    const out = [L(`\`${t.code}\` ${t.condition}${t.needsVerification ? " " + WARN : ""}${team}`, 2)];
    if (withNotes && t.notes) out.push(L(`  ↳ _${t.notes}_`, 3));
    return out;
  });
}

/** One boss card: the core of /boss and /raid. */
export function bossEmbed(site: string, e: Encounter, b: Boss, opts: { maxTotal?: number } = {}): Embed {
  const idx = e.bosses.findIndex((x) => x.id === b.id);
  const desc: Line[] = [
    L(`**${e.name}** · ${metaLine(e)}${e.bosses.length > 1 ? ` · Boss ${idx + 1} of ${e.bosses.length}` : ""}`, 1),
    ...coverageLines(e),
  ];
  if (b.needsVerification) desc.push(L(`${WARN} _${b.verifyNote || "This boss still needs verification."}_`, 1));
  if (b.summary) desc.push(L("", 3), L(b.summary, 3));
  if (b.worldBossNote) desc.push(L(`_${b.worldBossNote}_`, 3));
  desc.push(L("", 1), L("__**Mechanics, in order**__", 1));
  const mech = mechanicLines(e, b);
  desc.push(...(mech.length ? mech : [L("_No confirmed mechanics written up yet._", 1)]));

  const roles = arr(e.roles).filter((r) => r.duties && r.duties[b.id])
    .map((r) => L(`**${r.role}**${r.count ? ` ×${r.count}` : ""}: ${firstSentence(r.duties![b.id])}`, 2));
  const talents = talentLines(b);
  return buildEmbed({
    title: `${b.name} · ${e.name}`, url: bossUrl(site, e, b), color: colorOf(e),
    desc, moreUrl: bossUrl(site, e, b), maxTotal: opts.maxTotal,
    fields: [
      { name: "Roles to assign", lines: roles },
      { name: "Talents", lines: talents.length ? talents : [L("_No talent conditions confirmed yet._", 2)] },
    ],
  });
}

/** "Before you queue" for /raid. */
export function beforeEmbed(site: string, e: Encounter): Embed {
  const req = e.requirements || {};
  const desc: Line[] = [
    L(metaLine(e), 1), ...coverageLines(e),
    L(`Bosses: ${e.bosses.map((b) => shortName(b.name)).join(" → ")}`, 1),
  ];
  const lvl = [String(req.level ?? e.level), ...arr(e.variants).map((v) => `${v.name}: Lv ${v.level}${v.mastery ? ` (mastery ${v.mastery})` : ""}`)].join(" · ");
  const mastery = arr(req.mastery).map((m) => L(`${m.value}${m.source ? ` _(${m.source})_` : ""}`, 2));
  return buildEmbed({
    title: `${e.name}: call sheet`, url: encUrl(site, e, "before"), color: colorOf(e), moreUrl: encUrl(site, e, "before"),
    desc: [...desc, L("", 1), L("__**Before you queue**__", 1)],
    fields: [
      { name: "Level", lines: [L(lvl, 1)] },
      { name: "Mastery", lines: mastery.length ? mastery : [L("_Not published_", 2)] },
      { name: "Party", lines: req.party ? [L(req.party, 1)] : [] },
      { name: "Bring / equip", lines: arr(req.bring).map((x) => L(`• ${x}`, 1)) },
      { name: "Notes", lines: arr(req.notes).map((x) => L(`• ${x}`, 3)) },
    ],
  });
}

/** Roles for an encounter, one field per role, duties per boss. Optional boss filter. */
export function rolesEmbed(site: string, e: Encounter, only?: Boss): Embed {
  const bosses = only ? [only] : e.bosses;
  const roles = arr(e.roles).filter((r) => bosses.some((b) => r.duties && r.duties[b.id]));
  return buildEmbed({
    title: `Roles: ${only ? shortName(only.name) + " · " : ""}${e.name}`, url: encUrl(site, e, "roles"), color: colorOf(e), moreUrl: encUrl(site, e, "roles"),
    desc: roles.length
      ? [L(`${metaLine(e)} · assign before the pull`, 1), ...coverageLines(e)]
      : [L(`No role assignments written up for **${e.name}** yet.`, 1), L(`See the encounter page: ${encUrl(site, e)}`, 1)],
    fields: roles.map((r) => ({
      name: `${r.role}${r.count ? ` ×${r.count}` : ""}`,
      lines: bosses.filter((b) => r.duties && r.duties[b.id]).map((b) => L(`**${shortName(b.name)}**: ${r.duties![b.id]}`, 1)),
    })),
  });
}

/** Talent conditions for an encounter (or one boss). */
export function talentsEmbed(site: string, e: Encounter, only?: Boss): Embed {
  const bosses = only ? [only] : e.bosses;
  const any = bosses.some((b) => arr(b.talents).length);
  return buildEmbed({
    title: `Talents: ${only ? shortName(only.name) + " · " : ""}${e.name}`, url: encUrl(site, e, "talents-" + bosses[0].id), color: colorOf(e),
    moreUrl: encUrl(site, e, "talents-" + bosses[0].id),
    desc: [L(metaLine(e), 1), ...coverageLines(e), ...(any ? [] : [L("_No talent conditions confirmed yet._", 1)])],
    fields: bosses.map((b) => ({ name: shortName(b.name), lines: arr(b.talents).length ? talentLines(b, true) : [L("_None confirmed yet._", 1)] })),
  });
}
