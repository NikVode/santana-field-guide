/* Santana Field Guide · Build Lab page
 * Renders buildlab.html. Data: content/buildlab/*.json. Maths: assets/js/buildlab/model.js.
 * State lives in the URL (?p=path&b=build&c=compare&ctx=boss) so links can be shared.
 * "Use my stats" and uptime sliders are saved in this browser only (localStorage) and never sent anywhere.
 */
(function () {
  "use strict";
  const G = window.SantanaGuide && window.SantanaGuide.helpers;
  const M = window.BuildLabModel;
  if (!G || !M) return;
  const { $, $$, esc, arr, store, loadJSON, toast, copyText, verifyBadge, host, fail } = G;

  const KEY_STATS = "santana.buildlab.mystats.v1";
  const KEY_UPTIME = "santana.buildlab.uptimes.v1";
  const KEY_ADV = "santana.buildlab.advanced.v1";

  const STAT_LABEL = {
    damage_bonus: "Damage", base_damage: "Base damage", damage_taken: "Target takes more damage", attack_pct: "Physical Attack",
    max_attack: "Max Physical Attack", min_attack: "Min Physical Attack", crit_rate: "Critical Rate", direct_crit_rate: "Direct Critical Rate",
    crit_damage: "Critical DMG Bonus", affinity_rate: "Affinity Rate", direct_affinity_rate: "Direct Affinity Rate", affinity_damage: "Affinity DMG Bonus",
    precision: "Precision Rate", penetration: "Physical Penetration", defense_ignore: "Ignore Physical Defense", guaranteed_crit: "Guaranteed crit at Critical Rate ≥",
    healing_bonus: "Healing", crit_heal_bonus: "Critical Healing Bonus", damage_reduction: "Damage taken reduced", physical_resistance: "Physical Resistance",
    shield_strength: "Shield strength", attribute_attack: "Attribute Attack", attribute_penetration: "Attribute Penetration", attribute_damage_bonus: "Attribute damage",
    max_hp: "Max HP", physical_defense: "Physical Defense",
  };
  const BUCKET_LABEL = { all: "", path: "weapon skills", light_attack: "Light Attacks", heavy_attack: "Heavy Attacks", charged: "Charged Skills",
    varied_combo: "Varied Combos", martial_art_skill: "Martial Art Skills", special_skill: "Special Skills", dual_weapon: "Dual-Weapon Skills",
    triggered: "triggered effects", summon: "summons", projectile: "projectile skills", dot: "damage over time", drumbeat: "Drumbeat skills",
    execution: "Execution skills", mystic: "Mystic Skills" };
  const RATING_LABEL = { damage: "Damage Rating", healing: "Healing Rating", survival: "Survival Rating" };
  const ROLE_LABEL = { dps: "DPS", tank: "Tank", healer: "Healer", hybrid: "Hybrid / support" };

  let D = null;           // loaded data
  let S = null;           // page state

  /* ---------------- formatting ---------------- */
  const fmtNum = (v) => (Math.abs(v - Math.round(v)) < 0.05 ? String(Math.round(v)) : v.toFixed(1));
  const fmtRating = (v) => String(Math.round(v));
  function fmtDiff(d) {
    const a = Math.abs(d);
    const t = a < 0.05 ? "±0" : (d > 0 ? "+" : "−") + (a < 9.95 ? a.toFixed(1).replace(/\.0$/, "") : Math.round(a));
    return t + "%";
  }
  const diffClass = (d) => (Math.abs(d) < 0.05 ? "same" : d > 0 ? "up" : "down");
  function modText(m) {
    const lab = STAT_LABEL[m.stat] || m.stat;
    const b = arr(m.bucket).map((x) => BUCKET_LABEL[x]).filter(Boolean).join(", ");
    if (m.value == null) return lab + (m.scalesWith ? " (scales with Solo Mode level)" : "");
    const v = m.stat === "guaranteed_crit" ? m.value + "%" : (m.value > 0 ? "+" : "") + fmtNum(m.value) + (m.unit === "flat" ? "" : "%");
    return `${lab} ${v}${b ? " · " + b : ""}`;
  }
  const condLabel = (c) => (M.CONDITIONS[c || "always"] || {}).label || c;
  const wayById = (id) => M.indexData(D).ways[id];
  const artById = (id) => M.indexData(D).arts[id];
  const pathById = (id) => M.indexData(D).paths[id];
  const pathName = (id) => (id === "general" ? "General" : (pathById(id) || {}).name || id);
  const famColor = (fam) => (D.paths.families || {})[fam] || "var(--paper-dim)";

  /* ---------------- state / URL ---------------- */
  function freshBuild(pathId) { return M.recommendedBuild(pathId, D); }
  function readState() {
    const q = new URLSearchParams(location.search);
    const p = q.get("p");
    const path = p && pathById(p) && pathById(p).status !== "upcoming" ? p : null;
    const st = { pathId: path, ctx: M.CONTEXTS.some((c) => c.id === q.get("ctx")) ? q.get("ctx") : "boss", editing: "A", A: null, B: null };
    if (path) {
      st.A = M.decodeBuild(q.get("b"), path, D) || freshBuild(path);
      st.B = q.get("c") ? M.decodeBuild(q.get("c"), path, D) : null;
    }
    const adv = store.get(KEY_ADV, {});
    // Uptime overrides per context: { boss: { vs_boss: 0.9 }, group: {...}, solo: {...} }
    st.uptimes = store.get(KEY_UPTIME, {});
    if (!st.uptimes || typeof st.uptimes !== "object") st.uptimes = {};
    st.resistance = typeof adv.resistance === "number" ? adv.resistance : M.REF.resistance;
    st.soloLevel = typeof adv.soloLevel === "number" ? adv.soloLevel : M.REF.soloModeLevelCap;
    const mine = store.get(KEY_STATS, { use: false, stats: {} });
    st.useMine = !!mine.use; st.mine = mine.stats || {};
    return st;
  }
  function writeURL() {
    const u = new URL(location.href);
    ["p", "b", "c", "ctx"].forEach((k) => u.searchParams.delete(k));
    if (S.pathId) {
      u.searchParams.set("p", S.pathId);
      u.searchParams.set("b", M.encodeBuild(S.A));
      if (S.B) u.searchParams.set("c", M.encodeBuild(S.B));
      if (S.ctx !== "boss") u.searchParams.set("ctx", S.ctx);
    }
    history.replaceState(null, "", u);
  }
  function modelOpts() {
    const o = { context: S.ctx, uptimes: S.uptimes[S.ctx] || {}, resistance: S.resistance };
    if (S.useMine) {
      const prof = {};
      M.PROFILE_FIELDS.forEach(([k]) => { const v = parseFloat(S.mine[k]); if (isFinite(v)) prof[k] = v; });
      o.profile = prof;
    }
    return o;
  }
  const isComplete = (b) => b && arr(b.weapons).every(Boolean) && arr(b.innerWays).length === 4;

  /* ---------------- path grid ---------------- */
  function renderGrid() {
    document.title = "Build Lab · Santana Field Guide";
    const paths = D.paths.paths;
    const fams = Object.keys(D.paths.families || {});
    $("#app").innerHTML = `
      <h1>Build Lab</h1>
      <p class="lede">Pick a martial path to open its recommended build. Swap weapons and Inner Ways, change tiers, and see how the estimated rating moves.</p>
      <div class="callout info small bl-disclaimer"><strong>Estimated relative rating, not in-game numbers.</strong> Each path's recommended build at max Inner Way tiers scores 100. Data: Version ${esc(D.paths.gameVersion)}, checked ${esc(D.paths.lastVerified)}.</div>
      ${fams.map((f) => {
        const list = paths.filter((p) => p.family === f);
        return `<h2 class="bl-fam" style="--fam:${famColor(f)}">${esc(f)}</h2><div class="bl-grid">${list.map(pathCard).join("")}</div>`;
      }).join("")}
      <p class="small" style="margin-top:20px">How the numbers are made, and what still needs checking in game: <a href="#how" id="open-how">How ratings work</a> · <code>BUILDLAB_LOG.md</code> in the repo.</p>
      <details class="card bl-how" id="how"><summary><strong>How ratings work</strong></summary>${howHTML()}</details>`;
    const oh = $("#open-how"); if (oh) oh.addEventListener("click", () => { $("#how").open = true; });
  }
  function pathCard(p) {
    const arts = p.martialArts.map((id) => (artById(id) || {}).name || id).join(" + ");
    const rec = M.indexData(D).builds[p.recommendedBuild];
    if (p.status === "upcoming") {
      return `<div class="bl-path upcoming" style="--fam:${famColor(p.family)}" aria-disabled="true">
        <span class="bl-path-name">${esc(p.name)}</span><span class="small">${esc(p.upcoming || "Coming soon")}</span>
        <span class="badges"><span class="badge">Coming soon</span></span></div>`;
    }
    return `<a class="bl-path" style="--fam:${famColor(p.family)}" href="buildlab.html?p=${encodeURIComponent(p.id)}">
      <span class="bl-path-name">${esc(p.name)}</span>
      <span class="small">${esc(arts)}</span>
      <span class="badges"><span class="badge type">${esc(ROLE_LABEL[p.role] || p.role)}</span>${p.ratings && p.ratings.pveOverall ? `<span class="badge" title="Published PvE overall tier (wherewindsmeetgame.org, Oct 2026)">PvE ${esc(p.ratings.pveOverall)}</span>` : ""}${rec && rec.needsVerification ? `<span class="badge verify" title="${esc(arr(rec.verifyNotes).join(" "))}">⚠ Unconfirmed</span>` : ""}</span>
    </a>`;
  }

  /* ---------------- build screen ---------------- */
  function renderBuild() {
    const path = pathById(S.pathId);
    const rec = M.indexData(D).builds[path.recommendedBuild];
    document.title = `${path.name} · Build Lab · Santana Field Guide`;
    $("#app").innerHTML = `
      <p class="small no-print"><a href="buildlab.html">← All paths</a></p>
      <div class="boss-title"><h1 style="margin-bottom:0">${esc(path.name)}</h1></div>
      <div class="badges"><span class="badge type">${esc(ROLE_LABEL[path.role] || path.role)}</span><span class="badge" style="color:${famColor(path.family)}">${esc(path.family)}</span>
        <span class="badge">Version ${esc(D.builds.gameVersion)}</span>${verifyBadge(rec.needsVerification, arr(rec.verifyNotes).join(" "))}</div>
      <p class="small" style="margin:.3em 0 .6em">Recommended: <strong>${esc(rec.name)}</strong>. ${esc(rec.agreement || "")}</p>
      <div class="callout info small bl-disclaimer"><strong>Estimated relative rating, not in-game numbers.</strong> The recommended build at max tiers = 100 in every context.</div>

      <div class="bl-sticky">
        <div class="seg" role="radiogroup" aria-label="Content type">${M.CONTEXTS.map((c) => `<label title="${esc(c.note)}"><input type="radio" name="ctx" value="${c.id}" ${S.ctx === c.id ? "checked" : ""}><span>${esc(c.label)}</span></label>`).join("")}</div>
        <section class="card bl-ratings" id="ratings" aria-live="polite"></section>
      </div>

      <div class="toolbar no-print">
        <button class="btn small" type="button" id="bl-share">🔗 Share link</button>
        <button class="btn small" type="button" id="bl-reset">↺ Reset to recommended</button>
        <button class="btn small" type="button" id="bl-compare">${S.B ? "✕ Stop comparing" : "⇄ Compare two builds"}</button>
      </div>

      <section class="card" id="slots-card">
        <div id="edit-tabs"></div>
        <h2 class="bl-h">Weapons / martial arts</h2>
        <div id="weapon-slots" class="bl-slots"></div>
        <div id="mix-warning"></div>
        <h2 class="bl-h">Inner Ways</h2>
        <div id="way-slots" class="bl-slots"></div>
      </section>

      <div id="compare-table"></div>

      <details class="card bl-why" id="why" open><summary><strong>Why this number</strong> <span class="small">(Build ${S.B ? "<span id='why-which'></span>" : "A"})</span></summary><div id="why-body"></div></details>

      <section class="card" style="margin-top:14px" aria-labelledby="gear-h">
        <h2 id="gear-h" class="bl-h" style="margin-top:0">Gear and Mystic Skills (recommended)</h2>
        <p class="small" style="margin-top:0">Shown for reference. Gear and Mystic Skills don't change the rating; they're part of the stat profile.</p>
        <dl class="bl-dl">
          <dt>Weapons &amp; accessories</dt><dd>${esc(rec.gearSet.weaponsAccessories)}</dd>
          <dt>Armor</dt><dd>${esc(rec.gearSet.armor)}</dd>
          ${arr(rec.gearSet.alternatives).length ? `<dt>Alternatives</dt><dd>${rec.gearSet.alternatives.map(esc).join("<br>")}</dd>` : ""}
          <dt>Mystic Skills</dt><dd>${arr(rec.mysticSkills).map(esc).join(", ")}</dd>
          <dt>Stats first</dt><dd>${arr(path.scalingStats).map(esc).join(" → ")}</dd>
        </dl>
        <h3>Why this build</h3><p>${esc(rec.why)}</p>
        <h3>Rotation</h3><p>${esc(rec.rotation)}</p>
        ${arr(rec.alternatives).length ? `<h3>Swaps the guides mention</h3><ul class="bl-ul">${rec.alternatives.map((a) => `<li>${esc(a)}</li>`).join("")}</ul>` : ""}
        <h3>Sources</h3><ul class="bl-ul">${arr(rec.sources).concat(path.sources).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <span class="small">(${esc(s.site || host(s.url))})</span></li>`).join("")}</ul>
      </section>

      <details class="card bl-adv" id="mystats"><summary><strong>Use my stats</strong> <span class="small">(optional)</span></summary><div id="mystats-body"></div></details>
      <details class="card bl-adv" id="advanced"><summary><strong>Advanced: uptime and assumptions</strong></summary><div id="adv-body"></div></details>
      <details class="card bl-how" id="how"><summary><strong>How ratings work</strong></summary>${howHTML(path)}</details>

      <dialog id="picker" class="bl-picker" aria-labelledby="picker-h"><form method="dialog" class="bl-picker-inner">
        <div class="bl-picker-head"><h2 id="picker-h" style="margin:0"></h2><button class="btn small" value="cancel" aria-label="Close">✕</button></div>
        <input type="search" id="picker-q" placeholder="Filter…" aria-label="Filter options">
        <div id="picker-list"></div>
      </form></dialog>`;

    $$("input[name=ctx]").forEach((r) => r.addEventListener("change", () => { S.ctx = r.value; update(); renderAdvanced(); }));
    $("#bl-share").addEventListener("click", share);
    $("#bl-reset").addEventListener("click", () => { S[S.editing] = freshBuild(S.pathId); update(); toast("Build " + S.editing + " reset to recommended"); });
    $("#bl-compare").addEventListener("click", () => {
      if (S.B) { S.B = null; S.editing = "A"; } else { S.B = JSON.parse(JSON.stringify(S.A)); S.editing = "B"; toast("Build B is a copy of A. Change it to compare."); }
      $("#bl-compare").textContent = S.B ? "✕ Stop comparing" : "⇄ Compare two builds";
      update();
    });
    renderMyStats(); renderAdvanced();
    update();
  }

  /* Re-render everything that depends on the builds. */
  function update() {
    writeURL();
    const path = pathById(S.pathId);
    const opts = modelOpts();
    const kinds = M.ratingsFor(path);
    const rA = isComplete(S.A) ? M.rate(S.A, D, opts) : null;
    const rB = S.B && isComplete(S.B) ? M.rate(S.B, D, opts) : null;

    // ratings
    const col = (label, r) => `<div class="bl-rcol">${S.B ? `<div class="bl-rcol-h">${label}</div>` : ""}${kinds.map((k) => {
      if (!r) return `<div class="bl-r"><span class="bl-r-l">${RATING_LABEL[k]}</span><span class="bl-r-n">—</span><span class="small">Fill every slot</span></div>`;
      const x = r.ratings[k];
      return `<div class="bl-r"><span class="bl-r-l">${RATING_LABEL[k]}</span><span class="bl-r-n">${fmtRating(x.value)}</span><span class="bl-r-d ${diffClass(x.diff)}">${fmtDiff(x.diff)} vs recommended</span></div>`;
    }).join("")}</div>`;
    $("#ratings").innerHTML = `<div class="bl-rrow${S.B ? " two" : ""}">${col("Build A", rA)}${S.B ? col("Build B", rB) : ""}</div>
      ${S.B && rA && rB ? `<p class="small bl-ab">${kinds.map((k) => { const d = (rB.ratings[k].value / rA.ratings[k].value - 1) * 100; return `B vs A ${RATING_LABEL[k].replace(" Rating", "").toLowerCase()}: <strong class="${diffClass(d)}">${fmtDiff(d)}</strong>`; }).join(" · ")}</p>` : ""}
      <p class="small bl-ctxnote"><span class="bl-ctxdesc">${esc((M.CONTEXTS.find((c) => c.id === S.ctx) || {}).note || "")} </span>${S.useMine ? "Using your stats." : "Using the reference stat profile."}</p>`;

    // edit tabs
    $("#edit-tabs").innerHTML = S.B ? `<div class="seg bl-tabs" role="tablist" aria-label="Which build to edit">${["A", "B"].map((k) => `<label><input type="radio" name="editing" value="${k}" ${S.editing === k ? "checked" : ""}><span>Edit build ${k}</span></label>`).join("")}</div>` : "";
    $$("input[name=editing]").forEach((r) => r.addEventListener("change", () => { S.editing = r.value; update(); }));

    renderSlots();
    renderCompareTable(rA, rB);
    renderWhy(S.editing === "B" && S.B ? S.B : S.A);
    const ww = $("#why-which"); if (ww) ww.textContent = S.editing;
  }

  function renderSlots() {
    const b = S[S.editing], path = pathById(S.pathId);
    const res = isComplete(b) ? M.resolveBuild(b, D) : { inactive: [] };
    $("#weapon-slots").innerHTML = [0, 1].map((i) => {
      const a = b.weapons[i] && artById(b.weapons[i]);
      const mixed = a && a.path !== path.id;
      return `<button type="button" class="bl-slot" data-slot="w${i}" aria-label="Weapon slot ${i + 1}: ${esc(a ? a.name : "empty")}. Tap to swap.">
        <span class="bl-slot-k">Weapon ${i + 1}</span>
        <span class="bl-slot-n">${a ? esc(a.name) : "Choose…"}</span>
        ${a ? `<span class="small">${esc(arr(a.keySkills).slice(0, 2).join(" · "))}</span>` : ""}
        ${mixed ? `<span class="badges"><span class="badge verify" title="This weapon belongs to ${esc(pathName(a.path))}">⚠ Mixed path</span></span>` : ""}
      </button>`;
    }).join("");
    const mixed = b.weapons.some((w) => w && artById(w) && artById(w).path !== path.id);
    $("#mix-warning").innerHTML = mixed ? `<div class="callout small" style="margin-top:8px"><strong>Mixed weapon pair.</strong> Allowed: the official Version 2.0 overview says weapon martial arts can be paired freely (as cited by wherewindsmeetgame.org).
      Modeled: Inner Way effects that need a weapon you no longer have stop counting (see "Not counted"). <em>Not confirmed:</em> whether your path's own bonuses get weaker with a mixed pair. One player report says your own path's attribute bonuses count more than another path's. Build Lab keeps ${esc(path.name)}'s damage mix, so treat mixed-pair numbers as rough.</div>` : "";

    $("#way-slots").innerHTML = [0, 1, 2, 3].map((i) => {
      const s = b.innerWays[i], w = s && wayById(s.id);
      if (!w) return `<div class="bl-slot bl-way"><button type="button" class="bl-slot-btn" data-slot="i${i}"><span class="bl-slot-k">Inner Way ${i + 1}</span><span class="bl-slot-n">Choose…</span></button></div>`;
      const max = w.tiers.length;
      const off = res.inactive.filter((e) => e.slot === i);
      const recW = arr((M.indexData(D).builds[path.recommendedBuild] || {}).innerWays).find((x) => x.id === w.id);
      return `<div class="bl-slot bl-way">
        <button type="button" class="bl-slot-btn" data-slot="i${i}" aria-label="Inner Way slot ${i + 1}: ${esc(w.name)}. Tap to swap.">
          <span class="bl-slot-k">Inner Way ${i + 1} · ${esc(w.rarity)} · ${esc(pathName(w.path))}</span>
          <span class="bl-slot-n">${esc(w.name)} ${w.needsVerification ? `<span class="badge verify" title="${esc(arr(w.verifyNotes).join(" "))}">⚠</span>` : ""}</span>
          <span class="small">${esc(tierSummary(w, s.tier))}</span>
          ${off.length ? `<span class="badges"><span class="badge stub" title="${esc(off.map((e) => e.missing.join(", ")).join("; "))}">${off.length} effect${off.length > 1 ? "s" : ""} off: needs ${esc([...new Set(off.flatMap((e) => e.missing.map((m) => (artById(m) || {}).name || m)))].join(", "))}</span></span>` : ""}
          ${recW && recW.recommendedTier < max ? `<span class="small bl-hint">Guide: Tier ${recW.recommendedTier} is enough${recW.note ? " · " + esc(recW.note) : ""}</span>` : recW && recW.note ? `<span class="small bl-hint">${esc(recW.note)}</span>` : ""}
        </button>
        <div class="bl-stepper" role="group" aria-label="${esc(w.name)} tier">
          <button type="button" class="btn small" data-tier="${i}" data-d="-1" ${s.tier <= 1 ? "disabled" : ""} aria-label="Lower tier">−</button>
          <span class="bl-tier" aria-live="polite">T${s.tier}<span class="small">/${max}</span></span>
          <button type="button" class="btn small" data-tier="${i}" data-d="1" ${s.tier >= max ? "disabled" : ""} aria-label="Raise tier">+</button>
        </div>
      </div>`;
    }).join("");

    $$("[data-slot]").forEach((el) => el.addEventListener("click", () => openPicker(el.dataset.slot)));
    $$("[data-tier]").forEach((el) => el.addEventListener("click", () => {
      const s = S[S.editing].innerWays[+el.dataset.tier]; const w = wayById(s.id);
      s.tier = Math.max(1, Math.min(w.tiers.length, s.tier + +el.dataset.d)); update();
    }));
  }
  function tierSummary(w, tier) {
    const t = w.tiers.find((x) => x.tier === tier);
    return t ? `T${tier}: ${t.text}` : w.baseEffect;
  }

  function renderCompareTable(rA, rB) {
    const box = $("#compare-table");
    if (!S.B) { box.innerHTML = ""; return; }
    const kinds = M.ratingsFor(pathById(S.pathId));
    const name = (b, i, kind) => {
      if (kind === "w") { const a = b.weapons[i] && artById(b.weapons[i]); return a ? a.name : "—"; }
      const s = b.innerWays[i], w = s && wayById(s.id); return w ? `${w.name} T${s.tier}` : "—";
    };
    const rows = [["Weapon 1", "w", 0], ["Weapon 2", "w", 1], ["Inner Way 1", "i", 0], ["Inner Way 2", "i", 1], ["Inner Way 3", "i", 2], ["Inner Way 4", "i", 3]];
    box.innerHTML = `<section class="card" style="margin-top:14px"><h2 class="bl-h" style="margin-top:0">Side by side</h2><div class="table-wrap"><table class="bl-cmp">
      <thead><tr><th>Slot</th><th>Build A</th><th>Build B</th></tr></thead><tbody>
      ${rows.map(([l, k, i]) => { const a = name(S.A, i, k), b = name(S.B, i, k); return `<tr${a !== b ? ' class="diff"' : ""}><th scope="row">${l}</th><td>${esc(a)}</td><td>${esc(b)}</td></tr>`; }).join("")}
      ${kinds.map((k) => `<tr><th scope="row">${RATING_LABEL[k]}</th><td>${rA ? fmtRating(rA.ratings[k].value) : "—"}</td><td>${rB ? fmtRating(rB.ratings[k].value) : "—"}</td></tr>`).join("")}
      </tbody></table></div></section>`;
  }

  /* ---------------- why this number ---------------- */
  function renderWhy(b) {
    const body = $("#why-body");
    if (!isComplete(b)) { body.innerHTML = `<p class="empty">Fill every slot to see the breakdown.</p>`; return; }
    const path = pathById(S.pathId), kinds = M.ratingsFor(path);
    const bd = M.breakdown(b, D, modelOpts());
    const groups = {};
    bd.rows.forEach((r) => (groups[r.way] = groups[r.way] || []).push(r));
    const effCell = (r) => kinds.map((k) => { const v = r.effect[k]; return Math.abs(v) < 0.05 ? "" : `<span class="bl-eff ${v > 0 ? "up" : "down"}" title="${RATING_LABEL[k]}">${k === "damage" ? "" : k[0].toUpperCase() + " "}${v > 0 ? "+" : "−"}${Math.abs(v).toFixed(1)}%</span>`; }).join(" ") || `<span class="small">≈0</span>`;
    const order = b.innerWays.map((s) => s.id);
    body.innerHTML = `
      <p class="small">What each counted effect adds to <strong>this</strong> build: the build with it ÷ the build without it. Conditional effects are already multiplied by their uptime for ${esc((M.CONTEXTS.find((c) => c.id === S.ctx) || {}).label)}.</p>
      <h3>Counted</h3>
      ${order.filter((id) => groups[id]).map((id) => `<div class="bl-why-way"><strong>${esc(wayById(id).name)}</strong>
        <ul class="bl-why-list">${groups[id].map((r) => `<li><span>${esc(modText(r.mod))} <span class="small">(${r.tier ? "T" + r.tier : "base"}${r.mod.condition && r.mod.condition !== "always" ? ` · ${esc(condLabel(r.mod.condition))}, ${Math.round(r.uptime * 100)}% uptime` : ""})</span>${r.mod.note ? `<br><span class="small">${esc(r.mod.note)}</span>` : ""}${r.mod.needsVerification ? ` <span class="badge verify" title="${esc(r.mod.verifyNote || "")}">⚠</span>` : ""}</span><span class="bl-why-eff">${effCell(r)}</span></li>`).join("")}</ul></div>`).join("") || `<p class="empty">No counted effects.</p>`}
      <h3>Not counted</h3>
      ${bd.inactive.length ? `<p class="small"><strong>Switched off by your weapons:</strong></p><ul class="bl-ul small">${bd.inactive.map((e) => `<li>${esc(e.wayName)} ${e.tier ? "T" + e.tier : "base"}: ${esc(modText(e.mod))}. Needs ${esc(e.missing.map((m) => (artById(m) || {}).name || m).join(", "))}.</li>`).join("")}</ul>` : ""}
      ${bd.unmodeled.length ? `<p class="small"><strong>No published numbers or not in the model:</strong></p><ul class="bl-ul small">${bd.unmodeled.map((e) => `<li>${esc(e.wayName)} ${e.tier ? "T" + e.tier : "base"}: ${esc(modText(e.mod))}.${e.mod.note ? " " + esc(e.mod.note) : ""}</li>`).join("")}</ul>` : ""}
      ${bd.utility.length ? `<p class="small"><strong>Utility (shown as tags, not in the rating):</strong></p><div class="bl-tags">${bd.utility.map((u) => `<span class="chip" title="${esc(u.wayName)}${u.tier ? " T" + u.tier : ""}">${esc(u.text)}</span>`).join("")}</div>` : ""}`;
  }

  /* ---------------- picker ---------------- */
  function openPicker(slot) {
    const dlg = $("#picker"), b = S[S.editing], path = pathById(S.pathId);
    const isW = slot[0] === "w", idx = +slot.slice(1);
    $("#picker-h").textContent = isW ? `Weapon ${idx + 1}` : `Inner Way ${idx + 1}`;
    const q = $("#picker-q"); q.value = "";
    const draw = () => {
      const term = q.value.trim().toLowerCase();
      const match = (t) => !term || t.toLowerCase().includes(term);
      let sections;
      if (isW) {
        const other = b.weapons[1 - idx];
        const list = D.martialArts.martialArts.filter((a) => match(a.name + " " + a.weaponType + " " + pathName(a.path)));
        sections = [
          ["This path", list.filter((a) => a.path === path.id)],
          ["Other paths (mixed pair)", list.filter((a) => a.path !== path.id)],
        ].map(([h, l]) => [h, l.map((a) => ({ id: a.id, disabled: a.id === other, html: `<span class="bl-opt-n">${esc(a.name)}</span>
          <span class="badges"><span class="badge">${esc(D.martialArts.weaponTypes[a.weaponType] || a.weaponType)}</span><span class="badge" style="color:${famColor((pathById(a.path) || {}).family)}">${esc(pathName(a.path))}</span>${a.path !== path.id ? `<span class="badge verify">⚠ Mixed path</span>` : ""}${a.id === other ? `<span class="badge">In the other slot</span>` : ""}</span>
          <span class="small">${esc(arr(a.keySkills).join(" · "))}</span>` }))]);
      } else {
        const taken = b.innerWays.map((s, i) => (i !== idx && s ? s.id : null)).filter(Boolean);
        const weapons = b.weapons.filter(Boolean);
        const list = D.innerWays.innerWays.filter((w) => match(w.name + " " + w.baseEffect + " " + pathName(w.path)));
        const needs = (w) => {
          const req = new Set();
          [w.baseModifiers].concat(w.tiers.map((t) => t.modifiers)).forEach((ms) => arr(ms).forEach((m) => arr(m.requires && m.requires.weapon).forEach((x) => { if (!weapons.includes(x)) req.add((artById(x) || {}).name || x); })));
          return [...req];
        };
        const opt = (w) => {
          const n = needs(w);
          return { id: w.id, disabled: taken.includes(w.id), html: `<span class="bl-opt-n">${esc(w.name)} ${w.needsVerification ? `<span class="badge verify" title="${esc(arr(w.verifyNotes).join(" "))}">⚠</span>` : ""}</span>
            <span class="badges"><span class="badge">${esc(w.rarity)}</span><span class="badge" style="color:${famColor((pathById(w.path) || {}).family)}">${esc(pathName(w.path))}</span>${n.length ? `<span class="badge stub" title="Some effects only work with this weapon">needs ${esc(n.join(", "))}</span>` : ""}${taken.includes(w.id) ? `<span class="badge">Already equipped</span>` : ""}</span>
            <span class="small">${esc(w.baseEffect)}</span>` };
        };
        sections = [
          ["This path", list.filter((w) => w.path === path.id).map(opt)],
          ["General", list.filter((w) => w.path === "general").map(opt)],
          ["Other paths", list.filter((w) => w.path !== "general" && w.path !== path.id).sort((a, c) => a.path.localeCompare(c.path)).map(opt)],
        ];
      }
      $("#picker-list").innerHTML = sections.filter(([, l]) => l.length).map(([h, l]) => `<h3 class="bl-picker-sec">${esc(h)}</h3>
        <ul class="plain bl-opts">${l.map((o) => `<li><button type="button" class="bl-opt" data-pick="${esc(o.id)}" ${o.disabled ? "disabled" : ""}>${o.html}</button></li>`).join("")}</ul>`).join("") || `<p class="empty">No matches.</p>`;
      $$("[data-pick]", dlg).forEach((btn) => btn.addEventListener("click", () => {
        const id = btn.dataset.pick;
        if (isW) b.weapons[idx] = id;
        else { const w = wayById(id); const prev = b.innerWays[idx]; b.innerWays[idx] = { id, tier: Math.min(w.tiers.length, prev && prev.tier ? prev.tier : w.tiers.length) }; }
        dlg.close(); update();
      }));
    };
    q.oninput = draw; draw();
    if (typeof dlg.showModal === "function") dlg.showModal(); else dlg.setAttribute("open", "");
    setTimeout(() => q.focus(), 30);
  }

  /* ---------------- use my stats ---------------- */
  function renderMyStats() {
    const path = pathById(S.pathId), ref = path.referenceStats;
    $("#mystats-body").innerHTML = `
      <p class="small">Copy these from your character's <strong>attribute panel in game</strong>. If a rate shows two numbers, use the one in brackets (vs same-level enemies). Enter them <em>with</em> your current gear, before Inner Way effects if you can.</p>
      <p class="small"><strong>They stay in this browser.</strong> Nothing is sent anywhere, and there's no account. Clear them any time.</p>
      <label class="bl-check"><input type="checkbox" id="use-mine" ${S.useMine ? "checked" : ""}> Use my stats for the ratings</label>
      <div class="bl-form">${M.PROFILE_FIELDS.map(([k, label, unit]) => `<label>${esc(label)}${unit ? ` (${unit})` : ""}
        <input type="number" inputmode="decimal" step="any" data-stat="${k}" value="${esc(S.mine[k] != null ? S.mine[k] : "")}" placeholder="${esc(ref[k] != null ? ref[k] : "")}" autocomplete="off"></label>`).join("")}</div>
      <div class="toolbar"><button class="btn small" type="button" id="mine-clear">Clear my stats</button><span class="small">Empty boxes use the reference value shown in grey (${esc(path.referenceNote || "")}).</span></div>`;
    $("#use-mine").addEventListener("change", (e) => { S.useMine = e.target.checked; saveMine(); update(); });
    $$("[data-stat]").forEach((inp) => inp.addEventListener("input", () => {
      const v = inp.value.trim(); if (v === "") delete S.mine[inp.dataset.stat]; else S.mine[inp.dataset.stat] = v;
      saveMine(); if (S.useMine) update();
    }));
    $("#mine-clear").addEventListener("click", () => { S.mine = {}; S.useMine = false; store.del(KEY_STATS); renderMyStats(); update(); toast("Your stats were cleared from this browser"); });
  }
  function saveMine() { store.set(KEY_STATS, { use: S.useMine, stats: S.mine }); }

  /* ---------------- advanced ---------------- */
  function renderAdvanced() {
    const used = new Set();
    [S.A, S.B].filter(isComplete).forEach((b) => M.resolveBuild(b, D).active.forEach((e) => used.add(e.mod.condition || "always")));
    used.delete("always");
    const conds = Object.keys(M.CONDITIONS).filter((c) => used.has(c));
    $("#adv-body").innerHTML = `
      <p class="small">Conditional effects count for part of the fight. These are the uptimes for <strong>${esc((M.CONTEXTS.find((c) => c.id === S.ctx) || {}).label)}</strong> (switch context above to set the others). Changes are saved in this browser.</p>
      <div class="bl-sliders">${conds.map((c) => { const v = M.uptimeFor(c, S.ctx, S.uptimes[S.ctx]); const def = M.CONDITIONS[c][S.ctx];
        return `<label class="bl-slider"><span>${esc(M.CONDITIONS[c].label)} <span class="small">(default ${Math.round(def * 100)}%)</span></span>
        <span class="bl-slider-row"><input type="range" min="0" max="100" step="5" value="${Math.round(v * 100)}" data-up="${c}" aria-label="${esc(M.CONDITIONS[c].label)} uptime"><output>${Math.round(v * 100)}%</output></span></label>`; }).join("") || `<p class="empty">This build has no conditional effects.</p>`}</div>
      <div class="toolbar"><button class="btn small" type="button" id="up-reset">Reset uptimes</button></div>
      <h3>Assumptions</h3>
      <div class="bl-form">
        <label>Target Physical Resistance <input type="number" inputmode="decimal" step="1" id="adv-res" value="${esc(S.resistance)}"></label>
        <label>Solo Mode level <input type="number" inputmode="numeric" min="1" max="${M.REF.soloModeLevelCap}" step="1" id="adv-solo" value="${esc(S.soloLevel)}"></label>
      </div>
      <p class="small">Target resistance feeds the community penetration formula (default ${M.REF.resistance}; the game doesn't show it). Solo Mode level: several Inner Ways' Tier 2 bonus grows with it, but the per-level values aren't published, so it doesn't change any rating yet (current cap: Lv ${M.REF.soloModeLevelCap}, Version 2.3).</p>`;
    $$("[data-up]").forEach((sl) => sl.addEventListener("input", () => {
      const c = sl.dataset.up;
      S.uptimes[S.ctx] = S.uptimes[S.ctx] || {};
      S.uptimes[S.ctx][c] = +sl.value / 100; sl.nextElementSibling.textContent = sl.value + "%";
      store.set(KEY_UPTIME, S.uptimes); update();
    }));
    $("#up-reset").addEventListener("click", () => { S.uptimes = {}; store.del(KEY_UPTIME); renderAdvanced(); update(); });
    $("#adv-res").addEventListener("input", (e) => { const v = parseFloat(e.target.value); S.resistance = isFinite(v) ? v : M.REF.resistance; saveAdv(); update(); });
    $("#adv-solo").addEventListener("input", (e) => { const v = parseInt(e.target.value, 10); S.soloLevel = isFinite(v) ? v : M.REF.soloModeLevelCap; saveAdv(); });
  }
  function saveAdv() { store.set(KEY_ADV, { resistance: S.resistance, soloLevel: S.soloLevel }); }

  /* ---------------- how ratings work ---------------- */
  function howHTML(path) {
    return `<ul class="bl-ul small">
      <li><strong>Relative, not real.</strong> The game doesn't publish its damage formula. Build Lab estimates an "expected damage" value for your build and divides it by the same value for the path's recommended build at max tiers, on the same stats and context. Recommended = 100.</li>
      <li><strong>Hits.</strong> Each hit can be Affinity (Max attack × Affinity DMG; rate capped at 40%), Critical (average attack × Crit DMG; capped at 80%), normal, or an Abrasion when it fails Precision (Min attack). Crit and Affinity share hits past 100% combined. This follows the wherewindsmeetgame.org damage calculator for Version 2.3.</li>
      <li><strong>Layers.</strong> Bonuses add up inside a layer (damage bonus, base damage, "target takes more"), and layers multiply with attack, hit chances, penetration and defense. Penetration uses the community formula 1 + (Penetration − Resistance) / 200, or / 100 once positive.</li>
      <li><strong>Skill types.</strong> A "+10% Charged Skill damage" effect only lifts the part of the path's damage that comes from Charged Skills. Each path's damage mix is an estimate from the build guides${path ? ` (${esc(path.name)}: ${esc(Object.entries(path.damageMix).map(([k, v]) => (BUCKET_LABEL[k] || k) + " " + Math.round(v * 100) + "%").join(", "))})` : ""}.</li>
      <li><strong>Conditions.</strong> Effects like "vs bosses", "after a Perfect Dodge" or "while shielded" are multiplied by an uptime for Boss / Group / Solo. You can change them under Advanced.</li>
      <li><strong>Not counted.</strong> Extra charges, cooldowns, Endurance, Qi damage and crowd control are shown as tags. Bonuses that "scale with Solo Mode level" have no published values. Attribute stats (Bellstrike, Silkbind… attack and penetration) aren't modeled.</li>
      <li><strong>Healing</strong> scales from Min Physical Attack and can crit (no Precision or Affinity). <strong>Survival</strong> compares damage taken after damage-reduction effects.</li>
      <li><strong>Data.</strong> Tier numbers come from Game8's Inner Way pages, base effects from Bloxodes (Nov 7, 2026), builds from wherewindsmeetgame.org and Game8. ⚠ marks anything with one source, a conflict, or a page older than Version 2.0. Full list: <code>BUILDLAB_LOG.md</code>.</li>
    </ul>`;
  }

  /* ---------------- share ---------------- */
  function share() {
    writeURL();
    copyText(location.href).then(() => toast("Build link copied: paste it in Discord")).catch(() => toast("Couldn't copy. Long-press the address bar instead"));
  }

  /* ---------------- boot ---------------- */
  function boot() {
    Promise.all(["buildlab/paths", "buildlab/martial-arts", "buildlab/inner-ways", "buildlab/builds"].map(loadJSON))
      .then(([paths, martialArts, innerWays, builds]) => {
        D = { paths, martialArts, innerWays, builds };
        S = readState();
        if (S.pathId) renderBuild(); else renderGrid();
      }).catch(fail);
  }
  boot();
})();
