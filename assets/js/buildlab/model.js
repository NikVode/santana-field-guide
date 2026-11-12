/* Santana Field Guide · Build Lab rating model
 * =============================================
 * Plain JS, no dependencies. Works in the browser (window.BuildLabModel) and in Node
 * (require("./assets/js/buildlab/model.js")) so tests/buildlab.test.js can check it.
 *
 * WHAT THIS IS
 *   Ratings are RELATIVE estimates. The game does not publish its damage formula, so this file
 *   does not try to predict the number you see on screen. It computes an "expected damage"
 *   value for a build on a stat profile, does the same for the path's recommended build at max
 *   tiers on the same profile and context, and reports build ÷ recommended × 100.
 *   Recommended build = 100. A build that scores 94 is estimated to deal about 6% less.
 *
 * ASSUMPTIONS (also shown on the page under "How ratings work")
 *   A1  Hit types. Every hit first rolls Affinity (your Affinity Rate, capped at 40%, plus Direct
 *       Affinity Rate up to 10%). Affinity hits use Max Physical Attack × (1 + Affinity DMG Bonus).
 *       Non-Affinity hits roll Precision: a hit that passes can be Critical (Critical Rate capped at
 *       80%, plus Direct Critical Rate up to 20%) and uses average attack × (1 + Critical DMG
 *       Bonus); otherwise it is a normal hit on average attack. A hit that fails Precision
 *       "Abrades" and uses Min Physical Attack. Critical and Affinity share the passing hits: past
 *       100% combined, Affinity wins and the extra Critical Rate is wasted.
 *       Source: wherewindsmeetgame.org damage calculator (Version 2.3, checked Oct 25, 2026). Its
 *       own example (1,300–4,200 attack, 95% Precision, 60% Crit, +50% Crit DMG, 15% Affinity,
 *       +40% Affinity DMG → 3,942 average hit) is reproduced by hitExpectation() below.
 *       We assume Direct Critical/Affinity Rate simply add to the capped rates. Not confirmed.
 *   A2  Penetration. Community formula (ratz-gg.net and wherewindsmeetcalculator.com agree):
 *       multiplier = 1 + (Penetration − Resistance) / 200 while negative, / 100 once positive.
 *       The target's resistance is not shown in game; we use REF.resistance (default 40) and let
 *       advanced users change it.
 *   A3  Defense ignore. Defense is subtracted from attack before multipliers; boss defense is not
 *       shown. We assume the reference boss's defense removes REF.defenseShare (15%) of your
 *       damage, so "ignore 10% Physical Defense" is worth 10% of that 15%.
 *   A4  Damage layers. Bonuses ADD inside a layer and layers MULTIPLY:
 *         attack (attack_pct, flat min/max attack) × hit (A1) × penetration (A2) × defense (A3)
 *         × damage bonus (damage_bonus) × base damage (base_damage) × vulnerability (damage_taken)
 *       "bucket" decides which skill types a modifier applies to (charged, martial_art_skill, ...).
 *   A5  Damage mix. Each path says roughly what share of its damage comes from each skill type
 *       (paths.json → damageMix). A "+10% Charged Skill damage" modifier only lifts the charged
 *       share. The shares are estimates from the build guides' rotation notes and are marked as
 *       such in the data. Swapping a weapon keeps the path's mix; it only switches off Inner Way
 *       effects that need the removed weapon.
 *   A6  Conditions. Effects that only work some of the time ("vs bosses", "after a Perfect Dodge",
 *       "while shielded") are multiplied by an uptime for the chosen context (Boss / Group / Solo).
 *       Defaults are below in CONDITIONS and can be changed with the uptime sliders. Stacking
 *       buffs are counted at full stacks × the "stacks" uptime.
 *   A7  Healing. Heals scale from Min Physical Attack (the healer guide says Min attack feeds the
 *       Panacea Fan's healing), can crit with the same Critical Rate caps, never Abrade and never
 *       roll Affinity. Critical heals add the profile's Critical Healing Bonus.
 *   A8  Survival. Damage taken = Π(1 − damage reduction × uptime) × (1 − extra Physical Resistance
 *       / 200) × (1 − REF.shieldShare × shield bonus). Survival rating = recommended taken ÷ build
 *       taken × 100. REF.shieldShare (25%) is a guess at how much incoming damage shields absorb.
 *   A9  Not counted. Effects with no number (extra charges, cooldowns, Endurance, Qi damage,
 *       crowd control) are listed as utility tags. Stats that "scale with Solo Mode level" have no
 *       published values and are listed as unmodeled. Attribute stats (Bellstrike, Stonesplit,
 *       Silkbind, Bamboocut, Formless attack/penetration/damage) are not modeled, like the
 *       wherewindsmeetgame.org calculator.
 *   A10 Tiers. An Inner Way at tier N has its base effect plus the bonuses of tiers 1..N. When a
 *       higher tier upgrades an earlier number, both modifiers share a "key" and the higher tier
 *       replaces the lower one.
 */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.BuildLabModel = factory();
})(typeof self !== "undefined" ? self : this, function () {
  "use strict";

  /* ---------------- vocabulary ---------------- */

  // Contexts and the uptime (0..1) each named condition gets in them (assumption A6).
  const CONTEXTS = [
    { id: "boss", label: "Boss", note: "One boss, mostly single target (Sword Trial / Hero's Realm boss)." },
    { id: "group", label: "Group content", note: "Dungeon runs with trash packs and bosses." },
    { id: "solo", label: "Solo", note: "Open world and solo modes: mixed targets, more dodging." },
  ];
  const CONDITIONS = {
    always:            { label: "Always on",                               boss: 1,    group: 1,    solo: 1 },
    vs_boss:           { label: "Target is a boss",                        boss: 1,    group: 0.6,  solo: 0.4 },
    boss_exhausted:    { label: "Target Exhausted or at low Qi",           boss: 0.15, group: 0.12, solo: 0.12 },
    perfect_dodge:     { label: "Shortly after a Perfect Dodge",           boss: 0.25, group: 0.2,  solo: 0.3 },
    deflect:           { label: "Shortly after a deflect / defense",       boss: 0.25, group: 0.2,  solo: 0.3 },
    shielded:          { label: "While you have an HP shield",             boss: 0.5,  group: 0.5,  solo: 0.4 },
    target_controlled: { label: "Target is controlled (stun, airborne…)",  boss: 0.05, group: 0.3,  solo: 0.35 },
    stacks:            { label: "Stacking buff kept at full stacks",       boss: 0.85, group: 0.8,  solo: 0.75 },
    special_state:     { label: "Path's empowered state is active",        boss: 0.6,  group: 0.55, solo: 0.55 },
    burst_window:      { label: "Short burst window (e.g. Deepdaze)",      boss: 0.3,  group: 0.25, solo: 0.25 },
    path_debuff:       { label: "Your path debuff is on the target",       boss: 0.85, group: 0.75, solo: 0.75 },
    short_proc:        { label: "Short proc window (a few hits per cooldown)", boss: 0.2, group: 0.2, solo: 0.2 },
    dual_weapon_window:{ label: "Window after a Dual-Weapon Skill",        boss: 0.5,  group: 0.5,  solo: 0.5 },
    full_hp:           { label: "You are at high HP",                      boss: 0.8,  group: 0.7,  solo: 0.6 },
    low_hp:            { label: "You are at low HP",                       boss: 0.1,  group: 0.15, solo: 0.2 },
    not_hit:           { label: "You haven't been hit in the last 5s",     boss: 0.7,  group: 0.6,  solo: 0.65 },
    recently_hit:      { label: "You were hit in the last 5s",             boss: 0.3,  group: 0.4,  solo: 0.35 },
    multi_target:      { label: "Hitting 2–3+ enemies at once",            boss: 0.1,  group: 0.7,  solo: 0.4 },
    missing_hp_avg:    { label: "Share of the target's HP already lost (average)", boss: 0.5, group: 0.5, solo: 0.5 },
    party_buff:        { label: "Your team attack buff is active",         boss: 0.7,  group: 0.7,  solo: 0.6 },
  };

  // Skill types a damage/heal "bucket" can target. "all" hits everything; "path" hits every
  // weapon skill (everything except mystic).
  const SKILL_TYPES = ["light_attack", "heavy_attack", "charged", "varied_combo", "martial_art_skill", "special_skill",
    "dual_weapon", "triggered", "summon", "projectile", "dot", "drumbeat", "execution", "mystic"];
  const BUCKETS = ["all", "path"].concat(SKILL_TYPES);

  // Stats the model counts, and which rating they feed.
  const STATS = {
    // damage
    damage_bonus: "damage", base_damage: "damage", damage_taken: "damage", attack_pct: "damage",
    max_attack: "damage", min_attack: "damage", crit_rate: "damage", direct_crit_rate: "damage",
    crit_damage: "damage", affinity_rate: "damage", direct_affinity_rate: "damage", affinity_damage: "damage",
    precision: "damage", penetration: "damage", defense_ignore: "damage", guaranteed_crit: "damage",
    // healing (crit_rate / direct_crit_rate / attack_pct / min_attack also feed healing)
    healing_bonus: "healing", crit_heal_bonus: "healing",
    // survival
    damage_reduction: "survival", physical_resistance: "survival", shield_strength: "survival",
  };
  // Stats that exist in the data but are deliberately NOT modeled (assumption A9).
  const UNMODELED_STATS = ["attribute_attack", "attribute_penetration", "attribute_damage_bonus", "max_hp",
    "physical_defense", "healing_received", "qi_damage"];

  // Reference constants (assumptions A2, A3, A8). Exposed so the page can show them.
  const REF = { resistance: 40, defenseShare: 0.15, shieldShare: 0.25, soloModeLevelCap: 18 };

  // Stat profile fields (the "Use my stats" form uses the same names).
  const PROFILE_FIELDS = [
    ["minAttack", "Min Physical Attack", ""], ["maxAttack", "Max Physical Attack", ""],
    ["precision", "Precision Rate", "%"], ["critRate", "Critical Rate", "%"], ["critDamage", "Critical DMG Bonus", "%"],
    ["affinityRate", "Affinity Rate", "%"], ["affinityDamage", "Affinity DMG Bonus", "%"],
    ["directCritRate", "Direct Critical Rate", "%"], ["directAffinityRate", "Direct Affinity Rate", "%"],
    ["penetration", "Physical Penetration", ""], ["critHealBonus", "Critical Healing Bonus", "%"],
  ];

  /* ---------------- helpers ---------------- */
  const clamp = (x, lo, hi) => Math.max(lo, Math.min(hi, x));
  const num = (x, d) => (typeof x === "number" && isFinite(x) ? x : d);
  const arr = (x) => (Array.isArray(x) ? x : x == null ? [] : [x]);

  function indexData(data) {
    if (data._idx) return data._idx;
    const by = (list) => { const m = {}; arr(list).forEach((x) => (m[x.id] = x)); return m; };
    data._idx = {
      paths: by(data.paths.paths), arts: by(data.martialArts.martialArts),
      ways: by(data.innerWays.innerWays), builds: by(data.builds.builds),
    };
    return data._idx;
  }

  function uptimeFor(cond, ctx, overrides) {
    const c = CONDITIONS[cond || "always"];
    if (!c) return 0;
    const o = overrides && overrides[cond];
    return clamp(num(o, c[ctx] != null ? c[ctx] : 1), 0, 1);
  }

  // Does a modifier's bucket cover this skill type?
  function bucketCovers(bucket, type) {
    return arr(bucket || "all").some((b) => b === "all" || b === type || (b === "path" && type !== "mystic"));
  }

  /* ---------------- resolve a build into modifiers ---------------- */
  /* Returns { active[], inactive[], unmodeled[], utility[] }. Each active entry carries the source
   * Inner Way, tier and the modifier itself. "inactive" = requirements not met (e.g. needs a weapon
   * you swapped out). */
  function resolveBuild(build, data) {
    const idx = indexData(data);
    const weapons = arr(build.weapons).filter(Boolean);
    const weaponTypes = weapons.map((w) => idx.arts[w] && idx.arts[w].weaponType).filter(Boolean);
    const out = { active: [], inactive: [], unmodeled: [], utility: [] };
    arr(build.innerWays).forEach((slot, slotIndex) => {
      if (!slot || !slot.id) return;
      const way = idx.ways[slot.id];
      if (!way) return;
      const maxTier = arr(way.tiers).length;
      const tier = clamp(Math.round(num(slot.tier, maxTier)), 1, Math.max(1, maxTier));
      // Collect base + tiers 1..N; a later modifier with the same key replaces an earlier one (A10).
      const levels = [{ tier: 0, text: way.baseEffect, modifiers: way.baseModifiers, tags: way.baseTags }]
        .concat(arr(way.tiers).filter((t) => t.tier <= tier));
      const byKey = new Map(); let anon = 0;
      levels.forEach((lv) => {
        arr(lv.modifiers).forEach((m) => byKey.set(m.key ? "k:" + m.key : "a:" + anon++, { m, tier: lv.tier }));
        arr(lv.tags).forEach((t) => out.utility.push({ way: way.id, wayName: way.name, tier: lv.tier, text: t }));
      });
      byKey.forEach(({ m, tier: fromTier }) => {
        const entry = { way: way.id, wayName: way.name, slot: slotIndex, tier: fromTier, mod: m };
        if (m.value == null || m.scalesWith || UNMODELED_STATS.includes(m.stat) || !STATS[m.stat]) { out.unmodeled.push(entry); return; }
        const req = m.requires || {};
        const missing = arr(req.weapon).filter((w) => !weapons.includes(w))
          .concat(arr(req.weaponType).filter((t) => !weaponTypes.includes(t)).map((t) => "a " + t.replace(/_/g, " ")));
        if (missing.length) { entry.missing = missing; out.inactive.push(entry); return; }
        out.active.push(entry);
      });
    });
    return out;
  }

  /* ---------------- the hit model (A1) ---------------- */
  // s: { minAttack, maxAttack, precision, critRate, critDamage, affinityRate, affinityDamage,
  //      directCritRate, directAffinityRate } in game units (percent as 0..100).
  // opts.noAbrasion: hits that fail Precision deal a normal hit instead of an Abrasion.
  // opts.guaranteedCrit: every non-Affinity hit that passes Precision is Critical.
  function hitExpectation(s, opts) {
    opts = opts || {};
    const min = Math.max(0, num(s.minAttack, 0)), max = Math.max(0, num(s.maxAttack, 0));
    const avg = min > max ? min : (min + max) / 2;
    const maxUsed = min > max ? min : max;
    const A = clamp(clamp(num(s.affinityRate, 0), 0, 40) / 100 + clamp(num(s.directAffinityRate, 0), 0, 10) / 100, 0, 1);
    const C = clamp(clamp(num(s.critRate, 0), 0, 80) / 100 + clamp(num(s.directCritRate, 0), 0, 20) / 100, 0, 1);
    const P = clamp(num(s.precision, 100) / 100, 0, 1);
    const critShare = opts.guaranteedCrit ? Math.max(0, 1 - A) : Math.min(C, Math.max(0, 1 - A));
    const normalShare = Math.max(0, 1 - A - critShare);
    const affHit = maxUsed * (1 + num(s.affinityDamage, 0) / 100);
    const critHit = avg * (1 + num(s.critDamage, 0) / 100);
    const failHit = opts.noAbrasion ? avg : min;
    const expected = A * affHit + P * critShare * critHit + P * normalShare * avg + (1 - P) * (1 - A) * failHit;
    return { expected, chances: { affinity: A, critical: P * critShare, normal: P * normalShare, abrasion: (1 - P) * (1 - A) },
      hits: { affinity: affHit, critical: critHit, normal: avg, abrasion: failHit } };
  }

  function penetrationMultiplier(pen, resistance) {
    const d = pen - resistance;
    return Math.max(0.05, 1 + d / (d >= 0 ? 100 : 200));
  }

  /* ---------------- evaluate one build ---------------- */
  // opts: { context, uptimes, profile, resistance, exclude: Set of modifier objects to skip }
  function evaluate(build, data, opts) {
    opts = opts || {};
    const idx = indexData(data);
    const path = idx.paths[build.path];
    if (!path) throw new Error("Unknown path " + build.path);
    const ctx = opts.context || "boss";
    const profile = Object.assign({}, path.referenceStats, opts.profile || {});
    const resistance = num(opts.resistance, REF.resistance);
    const res = resolveBuild(build, data);
    const mods = res.active.filter((e) => !(opts.exclude && opts.exclude.has(e.mod)))
      .map((e) => ({ e, m: e.mod, u: clamp(uptimeFor(e.mod.condition, ctx, opts.uptimes) * num(e.mod.uptimeMul, 1), 0, 1) }));
    const noAbr = arr(path.noAbrasion);

    // ---- damage ----
    const mix = path.damageMix || { all: 1 };
    let damage = 0;
    Object.keys(mix).forEach((type) => {
      const share = num(mix[type], 0); if (!share) return;
      const sum = {}; let guarantee = null;
      mods.forEach(({ m, u }) => {
        if (STATS[m.stat] !== "damage" || !bucketCovers(m.bucket, type)) return;
        if (m.stat === "guaranteed_crit") { guarantee = { threshold: m.value, u }; return; }
        sum[m.stat] = (sum[m.stat] || 0) + m.value * u;
      });
      const g = (k) => sum[k] || 0;
      const atkMul = 1 + g("attack_pct") / 100;
      const s = {
        minAttack: (num(profile.minAttack, 0) + g("min_attack")) * atkMul,
        maxAttack: (num(profile.maxAttack, 0) + g("max_attack")) * atkMul,
        precision: num(profile.precision, 100) + g("precision"),
        critRate: num(profile.critRate, 0) + g("crit_rate"),
        directCritRate: num(profile.directCritRate, 0) + g("direct_crit_rate"),
        critDamage: num(profile.critDamage, 0) + g("crit_damage"),
        affinityRate: num(profile.affinityRate, 0) + g("affinity_rate"),
        directAffinityRate: num(profile.directAffinityRate, 0) + g("direct_affinity_rate"),
        affinityDamage: num(profile.affinityDamage, 0) + g("affinity_damage"),
      };
      const hOpts = { noAbrasion: noAbr.includes(type) };
      let hit = hitExpectation(s, hOpts).expected;
      if (guarantee) {
        const effCrit = clamp(s.critRate, 0, 80) + clamp(s.directCritRate, 0, 20);
        if (effCrit >= guarantee.threshold) {
          const gh = hitExpectation(s, Object.assign({}, hOpts, { guaranteedCrit: true })).expected;
          hit = guarantee.u * gh + (1 - guarantee.u) * hit;
        }
      }
      const pen = penetrationMultiplier(num(profile.penetration, 0) + g("penetration"), resistance);
      const def = 1 - REF.defenseShare * (1 - clamp(g("defense_ignore"), 0, 100) / 100);
      damage += share * hit * pen * def * (1 + g("damage_bonus") / 100) * (1 + g("base_damage") / 100) * (1 + g("damage_taken") / 100);
    });

    // ---- healing (A7) ----
    let healing = 0;
    const hmix = path.healingMix || null;
    if (hmix) {
      Object.keys(hmix).forEach((type) => {
        const share = num(hmix[type], 0); if (!share) return;
        const sum = {};
        mods.forEach(({ m, u }) => {
          const feeds = STATS[m.stat] === "healing" || ["crit_rate", "direct_crit_rate", "attack_pct", "min_attack"].includes(m.stat);
          if (!feeds || !bucketCovers(m.bucket, type)) return;
          sum[m.stat] = (sum[m.stat] || 0) + m.value * u;
        });
        const g = (k) => sum[k] || 0;
        const base = (num(profile.minAttack, 0) + g("min_attack")) * (1 + g("attack_pct") / 100);
        const C = clamp(clamp(num(profile.critRate, 0) + g("crit_rate"), 0, 80) / 100 + clamp(num(profile.directCritRate, 0) + g("direct_crit_rate"), 0, 20) / 100, 0, 1);
        const crit = 1 + C * (num(profile.critHealBonus, num(profile.critDamage, 0)) + g("crit_heal_bonus")) / 100;
        healing += share * base * crit * (1 + g("healing_bonus") / 100);
      });
    }

    // ---- survival (A8) ----
    let taken = 1, res2 = 0, shield = 0;
    mods.forEach(({ m, u }) => {
      if (m.stat === "damage_reduction") taken *= 1 - clamp(m.value * u, -100, 95) / 100;
      else if (m.stat === "physical_resistance") res2 += m.value * u;
      else if (m.stat === "shield_strength") shield += m.value * u;
    });
    taken *= Math.max(0.05, 1 - res2 / 200) * Math.max(0.05, 1 - REF.shieldShare * shield / 100);

    return { damage, healing, taken, resolved: res, mods };
  }

  /* ---------------- ratings vs the recommended build ---------------- */
  function recommendedBuild(pathId, data) {
    const idx = indexData(data);
    const path = idx.paths[pathId];
    const rec = path && idx.builds[path.recommendedBuild];
    if (!rec) return null;
    return {
      path: pathId,
      weapons: arr(rec.martialArts).slice(0, 2),
      // "Recommended build at max tiers = 100": every Inner Way at its highest tier.
      innerWays: arr(rec.innerWays).slice(0, 4).map((w) => ({ id: w.id, tier: arr((idx.ways[w.id] || {}).tiers).length || 1 })),
    };
  }

  function ratingsFor(path) {
    const r = ["damage"];
    if (path.healingMix) r.push("healing");
    if (["tank", "healer", "hybrid"].includes(path.role)) r.push("survival");
    return r;
  }

  function rate(build, data, opts) {
    const idx = indexData(data);
    const path = idx.paths[build.path];
    const recB = recommendedBuild(build.path, data);
    const cur = evaluate(build, data, opts);
    const rec = evaluate(recB, data, Object.assign({}, opts, { exclude: null }));
    const out = { build: cur, recommended: rec, ratings: {} };
    ratingsFor(path).forEach((k) => {
      let v;
      if (k === "survival") v = rec.taken > 0 ? (rec.taken / cur.taken) * 100 : 100;
      else v = rec[k] > 0 ? (cur[k] / rec[k]) * 100 : 100;
      out.ratings[k] = { value: v, diff: v - 100 };
    });
    return out;
  }

  /* "Why this number": what each counted modifier adds, by leaving it out (in % of this build). */
  function breakdown(build, data, opts) {
    const idx = indexData(data);
    const path = idx.paths[build.path];
    const full = evaluate(build, data, opts);
    const kinds = ratingsFor(path);
    const value = (ev, k) => (k === "survival" ? 1 / ev.taken : ev[k]);
    const rows = full.mods.map(({ e, m, u }) => {
      const without = evaluate(build, data, Object.assign({}, opts, { exclude: new Set([m]) }));
      const eff = {};
      kinds.forEach((k) => { const a = value(full, k), b = value(without, k); eff[k] = b > 0 ? (a / b - 1) * 100 : 0; });
      return { way: e.way, wayName: e.wayName, tier: e.tier, mod: m, uptime: u, effect: eff };
    });
    return { rows, unmodeled: full.resolved.unmodeled, inactive: full.resolved.inactive, utility: full.resolved.utility };
  }

  /* ---------------- share links ---------------- */
  // Format: "weaponA,weaponB|innerWay.tier,innerWay.tier,innerWay.tier,innerWay.tier"
  // Ids are lowercase-with-dashes, so "," "|" "." never appear inside one.
  function encodeBuild(build) {
    const w = arr(build.weapons).map((x) => x || "").join(",");
    const iw = arr(build.innerWays).map((s) => (s && s.id ? s.id + "." + Math.round(num(s.tier, 1)) : "")).join(",");
    return w + "|" + iw;
  }
  function decodeBuild(str, pathId, data) {
    if (!str || typeof str !== "string" || str.indexOf("|") < 0) return null;
    const idx = data ? indexData(data) : null;
    const [w, iw] = str.split("|");
    const weapons = w.split(",").slice(0, 2).map((x) => (x && (!idx || idx.arts[x]) ? x : null));
    const innerWays = iw.split(",").slice(0, 4).map((p) => {
      const [id, t] = p.split(".");
      if (!id || (idx && !idx.ways[id])) return null;
      const max = idx ? arr(idx.ways[id].tiers).length : 6;
      return { id, tier: clamp(parseInt(t, 10) || max, 1, Math.max(1, max)) };
    });
    while (weapons.length < 2) weapons.push(null);
    while (innerWays.length < 4) innerWays.push(null);
    return { path: pathId, weapons, innerWays };
  }

  return { CONTEXTS, CONDITIONS, SKILL_TYPES, BUCKETS, STATS, UNMODELED_STATS, REF, PROFILE_FIELDS,
    indexData, uptimeFor, bucketCovers, resolveBuild, hitExpectation, penetrationMultiplier, evaluate,
    recommendedBuild, ratingsFor, rate, breakdown, encodeBuild, decodeBuild };
});
