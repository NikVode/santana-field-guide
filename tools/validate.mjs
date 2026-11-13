// Validates content/*.json: parses, required fields, enums, unique ids, boss references.
// Usage: node tools/validate.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];
const warn = [];
const load = (f) => {
  try { return JSON.parse(readFileSync(join(root, "content", f), "utf8")); }
  catch (e) { errors.push(`${f}: does not parse: ${e.message}`); return null; }
};

const patch = load("patch.json");
const enc = load("encounters.json");
const act = load("activities.json");

if (patch) {
  for (const k of ["version", "levelCap", "season", "resets", "comingSoon", "changelog", "checklist"]) if (patch[k] == null) errors.push(`patch.json: missing "${k}"`);
  if (patch.season && !/^\d{4}-\d{2}-\d{2}$/.test(patch.season.endDate || "")) errors.push(`patch.json: season.endDate must be YYYY-MM-DD`);
}

const COV = ["full", "partial", "stub"], TYPES = ["sword-trial", "heros-realm"], CATS = ["guild", "team", "pvp", "event"];
const ids = new Set();
if (enc) {
  for (const e of enc.encounters || []) {
    const w = `encounters.json [${e.id || "?"}]`;
    for (const k of ["id", "name", "type", "level", "players", "bosses", "added", "requirements", "roles", "commonFailures", "rewards", "videos", "sources", "lastVerified", "needsVerification", "coverage"])
      if (e[k] === undefined) errors.push(`${w}: missing "${k}"`);
    if (ids.has(e.id)) errors.push(`${w}: duplicate id`); ids.add(e.id);
    if (!/^[a-z0-9-]+$/.test(e.id || "")) errors.push(`${w}: id must be lowercase-with-dashes`);
    if (!TYPES.includes(e.type)) errors.push(`${w}: type must be ${TYPES.join(" | ")}`);
    if (![5, 10].includes(e.players)) errors.push(`${w}: players must be 5 or 10`);
    if (!COV.includes(e.coverage)) errors.push(`${w}: coverage must be ${COV.join(" | ")}`);
    if (typeof e.needsVerification !== "boolean") errors.push(`${w}: needsVerification must be true/false`);
    if (!Array.isArray(e.sources) || !e.sources.length) errors.push(`${w}: needs at least one source`);
    const bossIds = new Set((e.bosses || []).map((b) => b.id));
    for (const b of e.bosses || []) {
      if (!b.id || !b.name) errors.push(`${w}: boss missing id/name`);
      for (const m of b.mechanics || []) if (!m.name || !m.trigger || !m.response) errors.push(`${w} ${b.id}: mechanic needs name, trigger, response`);
      for (const t of b.talents || []) if (!t.code || !t.condition) errors.push(`${w} ${b.id}: talent needs code, condition`);
      const codes = (b.talents || []).map((t) => t.code).filter((c) => c !== "?");
      if (new Set(codes).size !== codes.length) errors.push(`${w} ${b.id}: duplicate talent codes`);
    }
    for (const r of e.roles || []) for (const k of Object.keys(r.duties || {})) if (!bossIds.has(k)) errors.push(`${w}: role "${r.role}" refers to unknown boss "${k}"`);
    for (const f of e.commonFailures || []) if (typeof f === "object" && f.boss && !bossIds.has(f.boss)) errors.push(`${w}: failure refers to unknown boss "${f.boss}"`);
    for (const s of [...(e.sources || []), ...(e.videos || [])]) if (!/^https:\/\//.test(s.url || "")) errors.push(`${w}: bad url ${s.url}`);
    if (e.coverage === "full" && (e.bosses || []).some((b) => !(b.mechanics || []).length || !(b.talents || []).length)) warn.push(`${w}: marked full but a boss lacks mechanics or talents`);
  }
}
if (act) {
  const aids = new Set();
  for (const a of act.activities || []) {
    const w = `activities.json [${a.id || "?"}]`;
    for (const k of ["id", "name", "category", "sources", "needsVerification"]) if (a[k] === undefined) errors.push(`${w}: missing "${k}"`);
    if (aids.has(a.id)) errors.push(`${w}: duplicate id`); aids.add(a.id);
    if (!CATS.includes(a.category)) errors.push(`${w}: category must be ${CATS.join(" | ")}`);
    for (const s of a.sources || []) if (!/^https:\/\//.test(s.url || "")) errors.push(`${w}: bad url ${s.url}`);
  }
}

warn.forEach((m) => console.warn("WARN  " + m));
if (errors.length) { errors.forEach((m) => console.error("ERROR " + m)); process.exit(1); }
console.log(`OK: patch.json, ${enc.encounters.length} encounters, ${act.activities.length} activities`);
