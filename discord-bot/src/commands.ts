// Slash command definitions (registered by scripts/register.ts) and their handlers.

import { LIMITS, packMessages, type Embed } from "./embed";
import { autocomplete, buildIndex, resolve, type Prefer } from "./match";
import { beforeEmbed, bossEmbed, checklistEmbed, rolesEmbed } from "./render";
import { cleanEncounters } from "./clean";
import { buildTimes, selectTimes, timesChoices, timesEmbed } from "./times";
import type { Encounter, SiteData } from "./types";

// The data layer hands back the same encounters array for the same fetched copy,
// so the search index is built once per copy instead of on every keystroke.
// Encounters are scrubbed of source citations once per copy too (see clean.ts).
const indexes = new WeakMap<Encounter[], ReturnType<typeof buildIndex>>();
function indexFor(encounters: Encounter[]) {
  let idx = indexes.get(encounters);
  if (!idx) { idx = buildIndex(cleanEncounters(encounters)); indexes.set(encounters, idx); }
  return idx;
}

const STRING = 3, BOOLEAN = 5;
const nameOpt = (description: string) => ({ type: STRING, name: "name", description, required: true, autocomplete: true });
const shareOpt = { type: BOOLEAN, name: "share", description: "Post it in the channel for everyone (default: only you see it)", required: false };

export const COMMANDS = [
  { name: "boss", description: "Look up one boss: mechanics, roles and talents", options: [nameOpt("Boss or raid name (nicknames work)"), shareOpt] },
  { name: "raid", description: "Post the full call sheet for a Sword Trial or Hero's Realm in this channel", options: [nameOpt("Sword Trial or Hero's Realm")] },
  { name: "checklist", description: "What the team must do for full rewards (talent conditions)", options: [nameOpt("Sword Trial, Hero's Realm or boss"), shareOpt] },
  { name: "times", description: "Countdowns: season end, Battle Pass, events, resets", options: [
    { type: STRING, name: "what", description: "Pick one (default: everything upcoming)", required: false, autocomplete: true }, shareOpt] },
  { name: "guide", description: "Link to the Santana Field Guide and the list of commands" },
] as const;

export const EPHEMERAL = 1 << 6;

export interface Reply { messages: { content?: string; embeds?: Embed[] }[]; ephemeral: boolean }

type Opts = Record<string, string | boolean | number | undefined>;

/** Whether the reply to this command will be private, decided before any data loads (needed for deferring). */
export function isEphemeral(command: string, opts: Opts): boolean {
  if (command === "raid") return false;
  return opts.share !== true;
}

const preferFor = (cmd: string): Prefer => (cmd === "boss" ? "boss" : "encounter");

function staleNote(data: SiteData) {
  return data.stale ? "_The site couldn't be reached, so this is the last saved copy of the guide._" : undefined;
}

function notFound(cmd: string, typed: string, sugg: { label: string }[]) {
  const list = sugg.map((s) => `• ${s.label}`).join("\n");
  return { content: `No ${cmd === "boss" ? "boss or raid" : "raid"} called **${String(typed).slice(0, 80)}** in the guide.${list ? `\nDid you mean:\n${list}` : ""}\nTip: pick from the list that pops up while you type.` };
}

function messagesFrom(embeds: Embed[], content?: string) {
  const packs = packMessages(embeds);
  return packs.map((p, i) => ({ ...(i === 0 && content ? { content } : {}), embeds: p }));
}

export function runCommand(cmd: string, opts: Opts, data: SiteData, now = new Date()): Reply {
  const ephemeral = isEphemeral(cmd, opts);
  const site = data.siteUrl;
  const stale = staleNote(data);
  const reply = (messages: Reply["messages"]): Reply => ({ messages, ephemeral });

  if (cmd === "guide") {
    return reply([{ content: [
      `**Santana Field Guide** (unofficial, fan-made): ${site}`,
      "`/boss` one boss · `/raid` full call sheet · `/checklist` what to hit for full rewards · `/times` countdowns · `/guide` this",
    ].join("\n") }]);
  }

  if (cmd === "times") {
    const items = buildTimes(data.patch, now);
    const what = String(opts.what || "");
    const sel = selectTimes(items, what);
    if (!sel) {
      const known = timesChoices(items, "").map((c) => c.name).slice(0, 12).join(", ");
      return reply([{ content: `Nothing upcoming matches **${what.slice(0, 80)}**. Try one of: ${known}` }]);
    }
    return reply([{ ...(stale ? { content: stale } : {}), embeds: [timesEmbed(data.patch, sel.items, sel.title, !!what, site)] }]);
  }

  const index = indexFor(data.encounters);
  const r = resolve(index, String(opts.name || ""), preferFor(cmd));
  if (!r.ok) return { messages: [notFound(cmd, String(opts.name || ""), r.suggestions)], ephemeral: true };
  const t = r.target;
  const enc = t.enc;
  const boss = t.kind === "boss" ? t.boss : undefined;

  switch (cmd) {
    case "boss": {
      const bosses = boss ? [boss] : enc.bosses;
      return reply(messagesFrom(bosses.map((b) => bossEmbed(site, enc, b)), stale));
    }
    case "raid":
      return reply(messagesFrom([beforeEmbed(site, enc), rolesEmbed(site, enc), ...enc.bosses.map((b) => bossEmbed(site, enc, b))], stale));
    case "checklist":
      return reply(messagesFrom([checklistEmbed(site, enc, boss)], stale));
  }
  return { messages: [{ content: "Unknown command." }], ephemeral: true };
}

export function runAutocomplete(cmd: string, focused: { name: string; value: string }, data: SiteData, now = new Date()) {
  if (cmd === "times") return timesChoices(buildTimes(data.patch, now), focused.value);
  return autocomplete(indexFor(data.encounters), focused.value, preferFor(cmd), 25);
}

export { LIMITS };
