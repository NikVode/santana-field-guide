// Validates content/*.json: parses, required fields, enums, unique ids, boss references.
// Also validates content/buildlab/*.json (Build Lab) against the model's vocabulary.
// Usage: node tools/validate.mjs
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { createRequire } from "node:module";

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

// ---------- Build Lab (content/buildlab/*.json) ----------
// Vocabulary (stats, buckets, conditions) comes from the model so the two can't drift apart.
const BL = createRequire(import.meta.url)(join(root, "assets", "js", "buildlab", "model.js"));
const bl = {};
for (const f of ["paths", "martial-arts", "inner-ways", "builds"]) {
  bl[f] = load("buildlab/" + f + ".json");
  if (bl[f]) for (const k of ["gameVersion", "lastVerified"]) if (!bl[f][k]) errors.push(`buildlab/${f}.json: missing "${k}"`);
}
let blCounts = "";
if (Object.values(bl).every(Boolean)) {
  const uniq = (list, file) => { const s = new Set(); for (const x of list) { if (!/^[a-z0-9-]+$/.test(x.id || "")) errors.push(`${file} [${x.id}]: id must be lowercase-with-dashes`); if (s.has(x.id)) errors.push(`${file} [${x.id}]: duplicate id`); s.add(x.id); } return s; };
  const pathIds = uniq(bl.paths.paths, "buildlab/paths.json"), artIds = uniq(bl["martial-arts"].martialArts, "buildlab/martial-arts.json");
  const wayIds = uniq(bl["inner-ways"].innerWays, "buildlab/inner-ways.json"), buildIds = uniq(bl.builds.builds, "buildlab/builds.json");
  const urls = (list, w) => { for (const s of list || []) if (!/^https:\/\//.test(s.url || "")) errors.push(`${w}: bad source url ${s.url}`); };
  for (const p of bl.paths.paths) {
    const w = `buildlab/paths.json [${p.id}]`;
    for (const a of p.martialArts || []) if (!artIds.has(a)) errors.push(`${w}: unknown martial art "${a}"`);
    if (p.status === "upcoming") continue;
    for (const k of ["name", "family", "role", "martialArts", "damageMix", "referenceStats", "recommendedBuild", "sources"]) if (p[k] == null) errors.push(`${w}: missing "${k}"`);
    if (!buildIds.has(p.recommendedBuild)) errors.push(`${w}: unknown recommendedBuild "${p.recommendedBuild}"`);
    const sum = Object.values(p.damageMix || {}).reduce((a, b) => a + b, 0);
    if (Math.abs(sum - 1) > 0.01) errors.push(`${w}: damageMix adds up to ${sum.toFixed(3)}, should be 1`);
    for (const k of Object.keys(p.damageMix || {}).concat(Object.keys(p.healingMix || {}))) if (!BL.SKILL_TYPES.includes(k)) errors.push(`${w}: unknown skill type "${k}" in mix`);
    urls(p.sources, w);
  }
  for (const a of bl["martial-arts"].martialArts) {
    const w = `buildlab/martial-arts.json [${a.id}]`;
    if (!pathIds.has(a.path)) errors.push(`${w}: unknown path "${a.path}"`);
    if (!bl["martial-arts"].weaponTypes[a.weaponType]) errors.push(`${w}: unknown weaponType "${a.weaponType}"`);
    urls(a.sources, w);
  }
  for (const iw of bl["inner-ways"].innerWays) {
    const w = `buildlab/inner-ways.json [${iw.id}]`;
    for (const k of ["name", "path", "rarity", "baseEffect", "tiers", "howToGet", "sources", "lastVerified", "needsVerification"]) if (iw[k] == null) errors.push(`${w}: missing "${k}"`);
    if (iw.path !== "general" && !pathIds.has(iw.path)) errors.push(`${w}: unknown path "${iw.path}"`);
    (iw.tiers || []).forEach((t, i) => { if (t.tier !== i + 1) errors.push(`${w}: tiers must be numbered 1, 2, 3… (found ${t.tier} at position ${i + 1})`); if (!t.text) errors.push(`${w} T${t.tier}: missing text`); });
    const mods = [["base", iw.baseModifiers]].concat((iw.tiers || []).map((t) => ["T" + t.tier, t.modifiers]));
    for (const [where, list] of mods) for (const m of list || []) {
      if (!BL.STATS[m.stat] && !BL.UNMODELED_STATS.includes(m.stat)) errors.push(`${w} ${where}: unknown stat "${m.stat}"`);
      if (!["percent", "flat"].includes(m.unit)) errors.push(`${w} ${where}: unit must be percent | flat`);
      for (const b of [].concat(m.bucket || "all")) if (!BL.BUCKETS.includes(b)) errors.push(`${w} ${where}: unknown bucket "${b}"`);
      if (!BL.CONDITIONS[m.condition || "always"]) errors.push(`${w} ${where}: unknown condition "${m.condition}"`);
      for (const a of [].concat((m.requires && m.requires.weapon) || [])) if (!artIds.has(a)) errors.push(`${w} ${where}: requires unknown weapon "${a}"`);
      if (m.value == null && !m.scalesWith) errors.push(`${w} ${where}: value is empty; give a number, or set scalesWith for unmodeled effects`);
    }
    urls(iw.sources, w);
  }
  for (const b of bl.builds.builds) {
    const w = `buildlab/builds.json [${b.id}]`;
    if (!pathIds.has(b.path)) errors.push(`${w}: unknown path "${b.path}"`);
    for (const a of b.martialArts || []) if (!artIds.has(a)) errors.push(`${w}: unknown martial art "${a}"`);
    if ((b.martialArts || []).length !== 2) errors.push(`${w}: needs exactly 2 martial arts`);
    if ((b.innerWays || []).length !== 4) errors.push(`${w}: needs exactly 4 Inner Ways`);
    for (const x of b.innerWays || []) if (!wayIds.has(x.id)) errors.push(`${w}: unknown Inner Way "${x.id}"`);
    if (!(b.sources || []).length) errors.push(`${w}: needs at least one source`);
    urls(b.sources, w);
  }
  blCounts = `; Build Lab: ${pathIds.size} paths, ${artIds.size} martial arts, ${wayIds.size} Inner Ways, ${buildIds.size} builds`;
}

warn.forEach((m) => console.warn("WARN  " + m));
if (errors.length) { errors.forEach((m) => console.error("ERROR " + m)); process.exit(1); }
console.log(`OK: patch.json, ${enc.encounters.length} encounters, ${act.activities.length} activities${blCounts}`);
