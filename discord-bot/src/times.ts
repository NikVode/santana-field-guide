// /times: countdowns built from the site's patch.json (season, milestones, coming soon, resets,
// Guild War) plus the extra rules in times.json. All instants come from the site's own
// parseServerDate / resetInfo logic (src/site.ts). Discord renders <t:...> in each reader's zone.

import timesFile from "../times.json";
import { buildEmbed, L, type Embed, type Line } from "./embed";
import { COLOR } from "./render";
import { guildWarNext, lastReset, parseHM, parseServerDate, resetInfo, serverOffset } from "./site";
import type { Patch } from "./types";

export interface Rule { id: string; label: string; sameAs?: "daily" | "weekly"; weekday?: number | null; time?: string; utcOffset?: number; source: string }
export const RULES: Rule[] = (timesFile as { rules: Rule[] }).rules || [];

export interface TimeItem {
  id: string; label: string; tags: string[];
  at: Date;            // the instant shown (and sorted on)
  until: Date;         // when it drops off the list
  verb?: "starts" | "ends";
  dateOnly?: boolean;  // data has a date but no time
  running?: boolean;   // Guild War in its first hour
  details: string[];
  warn?: string;
  sub?: { label: string; at: Date; running?: boolean }[]; // Guild War battlegroups
}

const slug = (s: string) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
const HAS_TIME = /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}/;
const DAY = 864e5;
const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

export const ts = (d: Date, style: "R" | "f" | "F" | "D" | "t" = "R") => `<t:${Math.floor(d.getTime() / 1000)}:${style}>`;

export function serverText(d: Date, off: number, dateOnly = false) {
  const s = new Date(d.getTime() + off * 3600e3);
  const iso = s.toISOString();
  return `${WEEKDAYS[s.getUTCDay()]} ${iso.slice(0, 10)}${dateOnly ? "" : " " + iso.slice(11, 16)} (server time, UTC${off >= 0 ? "+" : ""}${off})`;
}

function tagsFor(text: string): string[] {
  const t: string[] = [];
  if (/arena/i.test(text)) t.push("arena");
  if (/mausoleum/i.test(text)) t.push("mausoleum");
  if (/battle ?pass/i.test(text)) t.push("battlepass");
  if (/\bevent\b/i.test(text)) t.push("events");
  if (/^version\b|\bupdate\b|\bpatch\b/i.test(text)) t.push("updates");
  return t;
}

const words = (s: string) => new Set(String(s).toLowerCase().split(/[^a-z]+/).filter((w) => w.length >= 4));

export function buildTimes(patch: Patch, now: Date = new Date(), rules: Rule[] = RULES): TimeItem[] {
  const off = serverOffset(patch);
  const items: TimeItem[] = [];
  const season = patch.season || {};

  // Resets (site data) + times.json rules
  const info = resetInfo(patch, now);
  const folded = (kind: "daily" | "weekly") => rules.filter((r) => r.sameAs === kind);
  const resetItem = (id: "daily" | "weekly", label: string, at: Date) => {
    const also = folded(id);
    items.push({ id, label: label + (also.length ? ` (also: ${also.map((r) => r.label).join(", ")})` : ""), tags: ["resets", id], at, until: at,
      details: [patch.resets?.note || "", ...also.map((r) => `${r.label}: same time. Source: ${r.source}`)].filter(Boolean) });
  };
  resetItem("daily", "Daily reset", info.nextDaily);
  resetItem("weekly", "Weekly reset", info.nextWeekly);
  for (const r of rules.filter((r) => !r.sameAs && r.time)) {
    const o = r.utcOffset ?? off, hm = parseHM(r.time), wd = r.weekday ?? null;
    const at = new Date(lastReset(now, o, hm, wd).getTime() + (wd == null ? DAY : 7 * DAY));
    items.push({ id: slug(r.id || r.label), label: r.label, tags: ["resets"], at, until: at, details: [`Source: ${r.source}`] });
  }

  // Guild War (site data), the site's Group Tools logic per battlegroup
  const gw = patch.guildWar;
  if (gw && gw.time && (gw.days || []).length && (gw.battlegroups || []).length) {
    const sub = gw.battlegroups!.map((bg) => {
      const at = guildWarNext(now, bg.utcOffset, gw.time!, gw.days!)!;
      return { label: `${bg.name}${bg.region ? ` · ${bg.region}` : ""}`, at, running: at.getTime() <= now.getTime() };
    }).sort((a, b) => a.at.getTime() - b.at.getTime());
    const first = sub[0];
    items.push({ id: "guildwar", label: `Guild War: next is ${first.label}`, tags: ["resets", "guildwar"], at: first.at,
      until: new Date(first.at.getTime() + 3600e3), running: first.running, sub,
      details: [`${gw.dayLabel || ""} ${gw.time} on each battlegroup's own clock.`.trim(), gw.note || ""].filter(Boolean) });
  }

  // Season end (site: parseServerDate(endDate + "T" + endTime))
  if (season.endDate) {
    const at = parseServerDate(season.endDate + (season.endTime ? "T" + season.endTime : ""), off);
    if (at) items.push({ id: "season", label: `${season.name || "Season"} ends (Arena & Taiping Mausoleum season)`, tags: ["season", "arena", "mausoleum"],
      at, until: at, dateOnly: !season.endTime, details: [], warn: season.needsVerification ? season.verifyNote || "Not confirmed yet." : undefined });
  }

  // Milestones: `at` when present (as the site does), else the date text
  const milestoneDays: { day: string; w: Set<string> }[] = [];
  for (const m of season.milestones || []) {
    const id = slug(m.label);
    const base = { id, label: m.label, tags: tagsFor(m.label), details: [m.date && m.at ? m.date : "", m.note || ""].filter(Boolean) as string[] };
    if (m.at) {
      const at = parseServerDate(m.at, off);
      if (at) { items.push({ ...base, at, until: at, dateOnly: !HAS_TIME.test(m.at) }); milestoneDays.push({ day: dayKey(at, off), w: words(m.label) }); }
      continue;
    }
    const text = String(m.date || "");
    const parts = text.split(/\s*(?:→|->)\s*/);
    const start = parseServerDate(parts[0], off);
    if (!start) { console.warn(`times: milestone "${m.label}" has no date the bot can read: ${text}`); continue; }
    const end = parts.length > 1 ? parseServerDate(parts[parts.length - 1], off) : null;
    if (parts.length > 1 && !end) console.warn(`times: can't read the end of "${m.label}" (${text}); using its start date`);
    if (end) {
      const upcoming = now.getTime() < start.getTime();
      items.push({ ...base, at: upcoming ? start : end, until: end, verb: upcoming ? "starts" : "ends", details: [text, m.note || ""].filter(Boolean) });
    } else {
      const dateOnly = !HAS_TIME.test(parts[0]);
      items.push({ ...base, at: start, until: dateOnly ? new Date(start.getTime() + DAY) : start, dateOnly,
        verb: parts.length > 1 ? "starts" : undefined, details: [text, m.note || ""].filter(Boolean) });
    }
    milestoneDays.push({ day: dayKey(start, off), w: words(m.label) });
  }

  // Coming soon (date only), minus entries that repeat a milestone on the same server day
  for (const c of patch.comingSoon || []) {
    const at = parseServerDate(c.date, off);
    if (!at) continue;
    const w = words(c.title), day = dayKey(at, off);
    if (milestoneDays.some((m) => m.day === day && [...w].some((x) => m.w.has(x)))) continue;
    const dateOnly = !HAS_TIME.test(String(c.date));
    items.push({ id: slug(c.title).slice(0, 60), label: c.title, tags: [...new Set(["coming", ...tagsFor(c.title)])], at,
      until: dateOnly ? new Date(at.getTime() + DAY) : at, dateOnly, details: c.details ? [c.details] : [],
      warn: c.needsVerification ? "Not confirmed yet." : undefined });
  }

  return items.filter((i) => i.until.getTime() > now.getTime()).sort((a, b) => a.at.getTime() - b.at.getTime());
}

const dayKey = (d: Date, off: number) => new Date(d.getTime() + off * 3600e3).toISOString().slice(0, 10);

export const GROUPS: { key: string; label: string }[] = [
  { key: "resets", label: "Resets: daily, weekly, Guild War" },
  { key: "daily", label: "Daily reset" },
  { key: "weekly", label: "Weekly reset" },
  { key: "guildwar", label: "Guild War, every battlegroup" },
  { key: "season", label: "Season end" },
  { key: "arena", label: "Arena" },
  { key: "mausoleum", label: "Taiping Mausoleum" },
  { key: "battlepass", label: "Battle Pass" },
  { key: "events", label: "Events" },
  { key: "updates", label: "Updates / patches" },
  { key: "coming", label: "Coming soon" },
];

/** Autocomplete for /times what: groups that have something upcoming, then individual items. */
export function timesChoices(items: TimeItem[], query: string) {
  const q = String(query || "").toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
  const qc = q.replace(/ /g, "");
  const groups = GROUPS.filter((g) => items.some((i) => i.tags.includes(g.key) || i.id === g.key))
    .map((g) => ({ name: g.label, value: g.key }));
  const singles = items.filter((i) => !["daily", "weekly", "guildwar"].includes(i.id)).map((i) => ({ name: i.label, value: "item:" + i.id }));
  const all = [...groups, ...singles];
  const hit = (c: { name: string; value: string }) => {
    const n = c.name.toLowerCase(), v = c.value.toLowerCase();
    return !q || n.includes(q) || v.includes(qc) || n.replace(/[^a-z0-9]/g, "").includes(qc);
  };
  return all.filter(hit).slice(0, 25).map((c) => ({ name: c.name.slice(0, 100), value: c.value.slice(0, 100) }));
}

/** Pick items for a `what` value (group key, item:<id>, or free text). */
export function selectTimes(items: TimeItem[], what: string): { title: string; items: TimeItem[] } | null {
  const w = String(what || "").trim();
  if (!w) return { title: "Santana timers", items };
  if (w.startsWith("item:")) { const it = items.find((i) => i.id === w.slice(5)); return it ? { title: it.label, items: [it] } : null; }
  const k = w.toLowerCase().replace(/[^a-z]/g, "");
  const alias: Record<string, string> = { reset: "resets", bp: "battlepass", battlepasses: "battlepass", gw: "guildwar", event: "events", update: "updates", patch: "updates", patches: "updates", seasonend: "season", tm: "mausoleum" };
  const key = alias[k] || k;
  const g = GROUPS.find((x) => x.key === key);
  if (g) { const list = items.filter((i) => i.tags.includes(g.key) || i.id === g.key); return list.length ? { title: g.label, items: list } : null; }
  const list = items.filter((i) => i.label.toLowerCase().includes(w.toLowerCase()) || i.id.includes(slug(w)));
  return list.length ? { title: list.length === 1 ? list[0].label : `Timers matching "${w}"`, items: list } : null;
}

function whenLine(i: TimeItem, off: number): string {
  if (i.running) return `Running now (started ${ts(i.at, "R")})`;
  if (i.dateOnly) return `**${serverText(i.at, off, true).replace(" (server time", " (server date")}**: exact time not listed`;
  return `${i.verb ? i.verb[0].toUpperCase() + i.verb.slice(1) + " " : ""}${ts(i.at, "R")} · ${ts(i.at, "f")}`;
}

export function timesEmbed(patch: Patch, items: TimeItem[], title: string, detailed: boolean, siteUrl: string): Embed {
  const off = serverOffset(patch);
  const desc: Line[] = [];
  if (!items.length) desc.push(L("Nothing upcoming in the guide right now.", 1));
  for (const i of items) {
    desc.push(L(`**${i.label}**${i.warn ? " ⚠" : ""}`, 1), L(whenLine(i, off), 1));
    if (detailed) {
      if (!i.dateOnly && !i.sub) desc.push(L(`_${serverText(i.at, off)}_`, 2));
      for (const s of i.sub || []) desc.push(L(`• ${s.label}: ${s.running ? `running now (started ${ts(s.at, "R")})` : `${ts(s.at, "R")} · ${ts(s.at, "f")}`}`, 1));
      for (const d of i.details) desc.push(L(`_${d}_`, 3));
      if (i.warn) desc.push(L(`⚠ _${i.warn}_`, 2));
    }
    desc.push(L("", 1));
  }
  desc.push(L(`_Times are shown in your own time zone. Game times are server time (UTC${off >= 0 ? "+" : ""}${off})._${detailed ? "" : " Use `/times what:` for details."}`, 1));
  return buildEmbed({ title, url: siteUrl, color: COLOR.times, desc, moreUrl: siteUrl });
}
