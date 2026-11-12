// Build Lab tests. Plain Node, no dependencies.
// Run: node tests/buildlab.test.js
"use strict";
const path = require("path");
const fs = require("fs");
const M = require(path.join(__dirname, "..", "assets", "js", "buildlab", "model.js"));

const load = (f) => JSON.parse(fs.readFileSync(path.join(__dirname, "..", "content", "buildlab", f), "utf8"));
const fresh = () => ({ paths: load("paths.json"), martialArts: load("martial-arts.json"), innerWays: load("inner-ways.json"), builds: load("builds.json") });
const D = fresh();

let pass = 0, fail = 0;
function test(name, fn) {
  try { fn(); pass++; console.log("  ok   " + name); }
  catch (e) { fail++; console.log("  FAIL " + name + "\n       " + e.message); }
}
function assert(cond, msg) { if (!cond) throw new Error(msg); }
const close = (a, b, eps = 1e-9) => Math.abs(a - b) <= eps * Math.max(1, Math.abs(a), Math.abs(b));
const clone = (x) => JSON.parse(JSON.stringify(x));

const livePaths = D.paths.paths.filter((p) => p.status !== "upcoming");
const contexts = M.CONTEXTS.map((c) => c.id);
const ratingValues = (b, data, opts) => { const r = M.rate(b, data, opts).ratings; const o = {}; Object.keys(r).forEach((k) => (o[k] = r[k].value)); return o; };

console.log("Build Lab model");

test("hit model reproduces the wherewindsmeetgame.org calculator example (3,942)", () => {
  const r = M.hitExpectation({ minAttack: 1300, maxAttack: 4200, precision: 95, critRate: 60, critDamage: 50, affinityRate: 15, affinityDamage: 40 });
  assert(Math.round(r.expected) === 3942, "got " + r.expected);
});

test("every live path has a recommended build that scores 100 in every context", () => {
  livePaths.forEach((p) => {
    const b = M.recommendedBuild(p.id, D);
    assert(b, p.id + ": no recommended build");
    contexts.forEach((ctx) => {
      const r = ratingValues(b, D, { context: ctx });
      Object.entries(r).forEach(([k, v]) => assert(close(v, 100), `${p.id} ${ctx} ${k} = ${v}`));
    });
  });
});

test("recommended builds also score 100 on a custom stat profile", () => {
  const prof = { minAttack: 900, maxAttack: 3000, precision: 88, critRate: 45, critDamage: 60, affinityRate: 20, affinityDamage: 35, penetration: 30 };
  livePaths.forEach((p) => {
    const r = ratingValues(M.recommendedBuild(p.id, D), D, { context: "boss", profile: prof });
    Object.entries(r).forEach(([k, v]) => assert(close(v, 100), `${p.id} ${k} = ${v}`));
  });
});

test("raising a tier never lowers a rating (every Inner Way, every path, every context)", () => {
  let checks = 0;
  livePaths.forEach((p) => {
    const base = M.recommendedBuild(p.id, D);
    D.innerWays.innerWays.forEach((w) => {
      const b = clone(base);
      if (!b.innerWays.some((s) => s.id === w.id)) b.innerWays[3] = { id: w.id, tier: 1 };
      const slot = b.innerWays.findIndex((s) => s.id === w.id);
      contexts.forEach((ctx) => {
        let prev = null;
        for (let t = 1; t <= w.tiers.length; t++) {
          b.innerWays[slot].tier = t;
          const r = ratingValues(b, D, { context: ctx });
          if (prev) Object.keys(r).forEach((k) => assert(r[k] >= prev[k] - 1e-9, `${p.id}/${w.id} ${ctx} ${k}: T${t - 1}=${prev[k].toFixed(4)} > T${t}=${r[k].toFixed(4)}`));
          prev = r; checks++;
        }
      });
    });
  });
  assert(checks > 1000, "too few checks: " + checks);
});

// A synthetic Inner Way, added to a copy of the data, to test single modifiers in isolation.
function withTestWay(mods, tags) {
  const data = fresh();
  data.innerWays.innerWays.push({ id: "test-way", name: "Test Way", path: "general", rarity: "Epic", baseEffect: "test", baseModifiers: mods, baseTags: tags || [],
    tiers: [{ tier: 1, text: "t1", modifiers: [], tags: [] }] });
  return data;
}
function swapIn(data, pathId) {
  const b = M.recommendedBuild(pathId, data); b.innerWays[3] = { id: "test-way", tier: 1 }; return b;
}

test("adding a crit or damage modifier never lowers damage", () => {
  const empty = withTestWay([]);
  const cases = [
    { stat: "crit_rate", value: 5 }, { stat: "crit_rate", value: 60 }, { stat: "direct_crit_rate", value: 4.6 }, { stat: "crit_damage", value: 10 },
    { stat: "damage_bonus", value: 10 }, { stat: "damage_bonus", value: 10, bucket: "charged" }, { stat: "base_damage", value: 20, bucket: "path" },
    { stat: "damage_taken", value: 10 }, { stat: "attack_pct", value: 6 }, { stat: "penetration", value: 10 }, { stat: "defense_ignore", value: 10 },
    { stat: "affinity_damage", value: 5 }, { stat: "precision", value: 10 },
  ];
  livePaths.forEach((p) => {
    contexts.forEach((ctx) => {
      const before = M.evaluate(swapIn(empty, p.id), empty, { context: ctx }).damage;
      cases.forEach((c) => {
        const data = withTestWay([Object.assign({ unit: "percent", bucket: "all", condition: "always" }, c)]);
        const after = M.evaluate(swapIn(data, p.id), data, { context: ctx }).damage;
        assert(after >= before - 1e-9, `${p.id} ${ctx} ${c.stat}${c.bucket ? "/" + c.bucket : ""}: ${before} -> ${after}`);
      });
    });
  });
});

test("utility effects (tags, unmodeled stats) don't change ratings", () => {
  const empty = withTestWay([]);
  const util = withTestWay([
    { stat: "max_attack", value: null, unit: "flat", bucket: "all", condition: "always", scalesWith: "solo_mode_level" },
    { stat: "attribute_penetration", value: 6, unit: "flat", bucket: "all", condition: "always" },
    { stat: "max_hp", value: 1000, unit: "flat", bucket: "all", condition: "always" },
  ], ["Skill holds 2 charges", "Cooldown −5s"]);
  livePaths.forEach((p) => contexts.forEach((ctx) => {
    const a = ratingValues(swapIn(empty, p.id), empty, { context: ctx });
    const b = ratingValues(swapIn(util, p.id), util, { context: ctx });
    Object.keys(a).forEach((k) => assert(close(a[k], b[k]), `${p.id} ${ctx} ${k}: ${a[k]} vs ${b[k]}`));
  }));
  // Real data: every tier that only adds tags leaves ratings unchanged.
  let n = 0;
  livePaths.forEach((p) => {
    const base = M.recommendedBuild(p.id, D);
    D.innerWays.innerWays.forEach((w) => w.tiers.forEach((t) => {
      if (t.tier < 2 || arr(t.modifiers).length) return;
      const b = clone(base);
      if (!b.innerWays.some((s) => s.id === w.id)) b.innerWays[3] = { id: w.id, tier: 1 };
      const slot = b.innerWays.findIndex((s) => s.id === w.id);
      b.innerWays[slot].tier = t.tier - 1; const r1 = ratingValues(b, D, { context: "boss" });
      b.innerWays[slot].tier = t.tier; const r2 = ratingValues(b, D, { context: "boss" });
      Object.keys(r1).forEach((k) => assert(close(r1[k], r2[k]), `${p.id}/${w.id} T${t.tier} (tags only) changed ${k}`));
      n++;
    }));
  });
  assert(n > 50, "expected many tag-only tiers, got " + n);
});
function arr(x) { return Array.isArray(x) ? x : x == null ? [] : [x]; }

test("a share link round-trips to the same build", () => {
  livePaths.forEach((p) => {
    const b = M.recommendedBuild(p.id, D);
    b.innerWays[1].tier = 3; b.innerWays[2] = { id: "invigorated-warrior", tier: 4 };
    const back = M.decodeBuild(M.encodeBuild(b), p.id, D);
    assert(JSON.stringify(back) === JSON.stringify(b), `${p.id}: ${JSON.stringify(back)} != ${JSON.stringify(b)}`);
    // and through a real URL
    const u = new URL("https://example.invalid/buildlab.html"); u.searchParams.set("b", M.encodeBuild(b));
    const back2 = M.decodeBuild(new URL(u.toString()).searchParams.get("b"), p.id, D);
    assert(JSON.stringify(back2) === JSON.stringify(b), p.id + ": URL round trip failed");
  });
});

test("share links ignore unknown ids and clamp tiers", () => {
  const b = M.decodeBuild("nameless-sword,not-a-weapon|sword-morph.9,nope.3,morale-chant.0", "bellstrike-splendor", D);
  assert(b.weapons[0] === "nameless-sword" && b.weapons[1] === null, "weapons " + JSON.stringify(b.weapons));
  assert(b.innerWays[0].tier === 6 && b.innerWays[1] === null && b.innerWays[2].tier === 6 && b.innerWays[3] === null, JSON.stringify(b.innerWays));
});

test("Inner Way effects that need a missing weapon are switched off", () => {
  const b = M.recommendedBuild("bellstrike-splendor", D);
  const before = M.resolveBuild(b, D);
  b.weapons[0] = "strategic-sword";
  const after = M.resolveBuild(b, D);
  assert(after.inactive.some((e) => e.way === "sword-morph"), "Sword Morph should be inactive without the Nameless Sword");
  assert(after.active.length < before.active.length, "fewer active modifiers expected");
  assert(M.rate(b, D, { context: "boss" }).ratings.damage.value < 100, "rating should drop");
});

test("data integrity: ids, references, tiers, modifier vocabulary", () => {
  const idx = M.indexData(D);
  D.paths.paths.forEach((p) => {
    p.martialArts.forEach((a) => assert(idx.arts[a], `${p.id}: unknown martial art ${a}`));
    if (p.status !== "upcoming") {
      assert(idx.builds[p.recommendedBuild], `${p.id}: unknown build ${p.recommendedBuild}`);
      const s = Object.values(p.damageMix).reduce((a, b) => a + b, 0);
      assert(Math.abs(s - 1) < 0.01, `${p.id}: damageMix sums to ${s}`);
      Object.keys(p.damageMix).concat(Object.keys(p.healingMix || {})).forEach((k) => assert(M.SKILL_TYPES.includes(k), `${p.id}: bad mix type ${k}`));
    }
  });
  D.builds.builds.forEach((b) => {
    assert(idx.paths[b.path], `${b.id}: unknown path`);
    b.martialArts.forEach((a) => assert(idx.arts[a], `${b.id}: unknown martial art ${a}`));
    assert(b.innerWays.length === 4, `${b.id}: needs 4 Inner Ways`);
    b.innerWays.forEach((w) => assert(idx.ways[w.id], `${b.id}: unknown Inner Way ${w.id}`));
    assert(new Set(b.innerWays.map((w) => w.id)).size === 4, `${b.id}: duplicate Inner Way`);
  });
  D.innerWays.innerWays.forEach((w) => {
    assert(w.path === "general" || idx.paths[w.path], `${w.id}: unknown path ${w.path}`);
    w.tiers.forEach((t, i) => assert(t.tier === i + 1, `${w.id}: tiers must run 1..N`));
    [w.baseModifiers].concat(w.tiers.map((t) => t.modifiers)).forEach((ms) => arr(ms).forEach((m) => {
      assert(M.STATS[m.stat] || M.UNMODELED_STATS.includes(m.stat), `${w.id}: unknown stat ${m.stat}`);
      arr(m.bucket).forEach((bk) => assert(M.BUCKETS.includes(bk), `${w.id}: unknown bucket ${bk}`));
      assert(M.CONDITIONS[m.condition || "always"], `${w.id}: unknown condition ${m.condition}`);
      arr(m.requires && m.requires.weapon).forEach((a) => assert(idx.arts[a], `${w.id}: requires unknown weapon ${a}`));
    }));
  });
});

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
