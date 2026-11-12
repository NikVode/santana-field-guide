/* Santana — Where Winds Meet Field Guide
 * Plain JS, no build step. Every page has <body data-page="..."> and an empty <main id="app">.
 * All content comes from content/*.json so non-developers can edit it.
 */
(function () {
  "use strict";

  const SITE = "Santana Field Guide";
  const NAV = [
    ["index.html", "Home", "home"],
    ["sword-trials.html", "Sword Trials", "sword-trial"],
    ["heros-realms.html", "Hero's Realms", "heros-realm"],
    ["guild.html", "Guild & Team", "guild"],
    ["endgame.html", "Other Endgame", "endgame"],
    ["tools.html", "Group Tools", "tools"],
    ["buildlab.html", "Build Lab", "buildlab"],
    ["search.html", "Search", "search"],
    ["sources.html", "Sources", "sources"],
  ];
  const TYPE_LABEL = { "sword-trial": "Sword Trial", "heros-realm": "Hero's Realm" };
  const CAT_LABEL = { guild: "Guild", team: "Team", pvp: "PvP", event: "Event / Mode" };

  /* ---------------- helpers ---------------- */
  const $ = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? "" : s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");
  const arr = (x) => (Array.isArray(x) ? x : x == null || x === "" ? [] : [x]);

  const store = {
    get(key, fallback) {
      try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; }
    },
    set(key, val) { try { localStorage.setItem(key, JSON.stringify(val)); } catch (e) { /* private mode */ } },
    del(key) { try { localStorage.removeItem(key); } catch (e) {} },
  };

  const cache = {};
  function loadJSON(name) {
    if (!cache[name]) {
      cache[name] = fetch("content/" + name + ".json", { cache: "no-cache" }).then((r) => {
        if (!r.ok) throw new Error("Could not load content/" + name + ".json (" + r.status + ")");
        return r.json();
      });
    }
    return cache[name];
  }
  const loadAll = () => Promise.all([loadJSON("patch"), loadJSON("encounters"), loadJSON("activities")])
    .then(([patch, enc, act]) => ({ patch, encounters: enc.encounters || [], activities: act.activities || [] }));

  function toast(msg) {
    let t = $(".toast");
    if (!t) { t = document.createElement("div"); t.className = "toast"; t.setAttribute("role", "status"); document.body.appendChild(t); }
    t.textContent = msg; t.classList.add("show");
    clearTimeout(t._h); t._h = setTimeout(() => t.classList.remove("show"), 1800);
  }

  function copyText(text) {
    if (navigator.clipboard && window.isSecureContext) return navigator.clipboard.writeText(text);
    return new Promise((resolve, reject) => {
      const ta = document.createElement("textarea");
      ta.value = text; ta.setAttribute("readonly", ""); ta.style.position = "fixed"; ta.style.opacity = "0";
      document.body.appendChild(ta); ta.select();
      try { document.execCommand("copy") ? resolve() : reject(new Error("copy failed")); } catch (e) { reject(e); }
      ta.remove();
    });
  }
  function linkTo(anchor) {
    const u = new URL(location.href); u.hash = anchor; return u.toString();
  }
  function copyLinkBtn(anchor, label) {
    return `<button type="button" class="copy-link" data-copy-anchor="${esc(anchor)}" aria-label="Copy link to ${esc(label || anchor)}">🔗 Copy link</button>`;
  }
  document.addEventListener("click", (ev) => {
    const b = ev.target.closest("[data-copy-anchor]");
    if (!b) return;
    copyText(linkTo(b.dataset.copyAnchor)).then(() => {
      b.classList.add("done"); b.textContent = "✓ Copied"; toast("Link copied: paste it in Discord");
      setTimeout(() => { b.classList.remove("done"); b.textContent = "🔗 Copy link"; }, 1800);
    }).catch(() => toast("Couldn't copy. Long-press the address bar instead"));
  });

  /* ---------------- badges ---------------- */
  const coverageBadge = (c) => c ? `<span class="badge ${esc(c)}" title="Guide coverage: ${esc(c)}">${c === "full" ? "● Full" : c === "partial" ? "◐ Partial" : "○ Stub"}</span>` : "";
  const verifyBadge = (flag, title) => flag ? `<span class="badge verify" title="${esc(title || "Not yet confirmed by two sources or in game")}">⚠ Needs verification</span>` : "";
  const typeBadge = (t) => `<span class="badge type">${esc(TYPE_LABEL[t] || CAT_LABEL[t] || t)}</span>`;

  /* ---------------- time / resets ---------------- */
  // Resets are defined in patch.json → resets { utcOffset, daily "HH:MM", weekly { day 0-6 (0=Sun), time } }
  function parseHM(s) { const [h, m] = String(s || "05:00").split(":").map(Number); return { h: h || 0, m: m || 0 }; }
  function lastReset(now, offset, hm, weekday) {
    // Work in "server clock" by shifting the epoch by the offset, then shift back.
    const shift = offset * 3600e3;
    const s = new Date(now.getTime() + shift);
    let cand = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), hm.h, hm.m);
    if (weekday == null) {
      if (cand > s.getTime()) cand -= 864e5;
    } else {
      const d = new Date(cand);
      let back = (d.getUTCDay() - weekday + 7) % 7;
      cand -= back * 864e5;
      if (cand > s.getTime()) cand -= 7 * 864e5;
    }
    return new Date(cand - shift);
  }
  function resetInfo(patch, now = new Date()) {
    const r = patch.resets || {};
    const off = r.utcOffset != null ? r.utcOffset : 8;
    const dHM = parseHM(r.daily), w = r.weekly || { day: 1, time: "05:00" };
    const lastDaily = lastReset(now, off, dHM, null);
    const lastWeekly = lastReset(now, off, parseHM(w.time), w.day);
    return { lastDaily, nextDaily: new Date(lastDaily.getTime() + 864e5), lastWeekly, nextWeekly: new Date(lastWeekly.getTime() + 7 * 864e5) };
  }
  function parseServerDate(str, offset) {
    // "2027-01-07" or "2027-01-07T05:00" interpreted at server offset
    if (!str) return null;
    const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
    if (!m) return null;
    return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) - offset * 3600e3);
  }
  function splitDur(ms) {
    if (ms < 0) ms = 0;
    const s = Math.floor(ms / 1000);
    return { d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
  }
  function durText(ms) { const t = splitDur(ms); return (t.d ? t.d + "d " : "") + t.h + "h " + String(t.m).padStart(2, "0") + "m"; }
  const fmtLocal = (d) => d.toLocaleString(undefined, { weekday: "short", month: "short", day: "numeric", hour: "2-digit", minute: "2-digit" });
  const fmtDate = (s) => s ? esc(s) : "—";

  /* ---------------- chrome (header/footer) ---------------- */
  function renderChrome(page) {
    const active = document.body.dataset.type || page;
    const header = document.createElement("header");
    header.className = "site-header";
    header.innerHTML = `
      <a class="skip" href="#app">Skip to content</a>
      <div class="bar">
        <a class="brand" href="index.html"><span class="seal" aria-hidden="true">風</span><span class="t">${esc(SITE)}</span></a>
        <button class="menu-btn" type="button" aria-expanded="false" aria-controls="site-nav">☰ Menu</button>
      </div>
      <nav class="site-nav" id="site-nav" aria-label="Main">
        <ul>${NAV.map(([href, label, key]) => `<li><a href="${href}"${key === active ? ' aria-current="page"' : ""}>${esc(label)}</a></li>`).join("")}</ul>
        <form class="header-search" action="search.html" role="search">
          <input type="search" name="q" placeholder="Search bosses, mechanics, talents…" aria-label="Search the guide">
          <button class="btn" type="submit">Search</button>
        </form>
      </nav>`;
    document.body.prepend(header);
    const btn = $(".menu-btn", header), nav = $("#site-nav", header);
    btn.addEventListener("click", () => { const o = nav.classList.toggle("open"); btn.setAttribute("aria-expanded", String(o)); });

    const footer = document.createElement("footer");
    footer.className = "site-footer";
    footer.innerHTML = `Fan-made guild notes for Where Winds Meet. Not affiliated with NetEase or Everstone Studio. Mechanics are paraphrased from the guides listed on <a href="sources.html">Sources</a>. Always confirm in game.
      <br>Controls: guides often name PC keys. This site names the action (e.g. "interact button") instead, so check your own console bindings.`;
    document.body.appendChild(footer);
  }

  function fail(err) {
    console.error(err);
    const app = $("#app");
    app.innerHTML = `<div class="callout"><strong>Couldn't load the guide data.</strong><br>${esc(err.message)}<br>
      <small>If you opened the file directly from disk, run a local server instead (see README): <code>python3 -m http.server</code></small></div>`;
  }

  /* ---------------- HOME ---------------- */
  function renderHome({ patch, encounters }) {
    const app = $("#app");
    const off = (patch.resets && patch.resets.utcOffset) ?? 8;
    const season = patch.season || {};
    const end = parseServerDate(season.endDate + (season.endTime ? "T" + season.endTime : ""), off);
    // Count down to whichever comes first: the season end, or a milestone that has an "at" time.
    const targets = [{ label: "Season ends", d: end }]
      .concat(arr(season.milestones).filter((m) => m.at).map((m) => ({ label: m.label, d: parseServerDate(m.at, off) })))
      .filter((t) => t.d && t.d > new Date()).sort((a, b) => a.d - b.d);
    const next = targets[0];
    const newest = encounters.slice().sort((a, b) => String(b.added && b.added.date || "").localeCompare(String(a.added && a.added.date || "")) || b.level - a.level).slice(0, 5);

    app.innerHTML = `
      <section class="banner" aria-labelledby="patch-h">
        <div class="kicker">Current patch</div>
        <h1 id="patch-h">Version ${esc(patch.version)} · ${esc(patch.versionName || "")}</h1>
        <div class="badges">
          <span class="badge">Level cap ${esc(patch.levelCap)}</span>
          <span class="badge">${esc(season.name || "Season")}</span>
          ${patch.releaseDate ? `<span class="badge">Released ${esc(patch.releaseDate)}</span>` : ""}
          ${verifyBadge(season.needsVerification, season.verifyNote)}
        </div>
        <p class="small" style="margin:.6em 0 0">Season ends ${esc(season.endDate || "?")}${season.endTime ? " " + esc(season.endTime) : ""} (server time, UTC+${off})${end ? " → " + esc(fmtLocal(end)) + " your time" : ""}</p>
        ${next ? `<p class="small" style="margin:.8em 0 0"><strong>Next: ${esc(next.label)}</strong> · ${esc(fmtLocal(next.d))} your time</p>` : ""}
        <div class="countdown" id="season-cd" aria-live="off"></div>
        ${arr(season.milestones).length ? `<ul class="plain small" style="margin-top:10px">${season.milestones.map((m) => `<li>${esc(m.label)}: <strong>${esc(m.date)}</strong>${m.note ? ` (${esc(m.note)})` : ""}</li>`).join("")}</ul>` : ""}
      </section>

      <div class="grid two" style="margin-top:14px">
        <section class="card" aria-labelledby="soon-h">
          <h2 id="soon-h" style="margin-top:0">Coming soon</h2>
          <ul class="plain">${arr(patch.comingSoon).map((c) => `<li><strong>${esc(c.title)}</strong> ${c.date ? `<span class="badge">${esc(c.date)}</span>` : ""} ${verifyBadge(c.needsVerification)}<br><span class="small">${esc(c.details || "")}</span></li>`).join("") || `<li class="empty">Nothing announced.</li>`}</ul>
        </section>
        <section class="card" aria-labelledby="new-h">
          <h2 id="new-h" style="margin-top:0">Newest raids</h2>
          <ul class="plain">${newest.map((e) => `<li><a href="encounter.html?id=${encodeURIComponent(e.id)}"><strong>${esc(e.name)}</strong></a> · Lv ${esc(e.level)}
            <div class="badges">${typeBadge(e.type)}${coverageBadge(e.coverage)}${verifyBadge(e.needsVerification)}<span class="badge">Added ${esc(e.added && e.added.version || "?")} · ${esc(e.added && e.added.date || "?")}</span></div></li>`).join("")}</ul>
        </section>
      </div>

      <section class="card" style="margin-top:14px" aria-labelledby="chk-h">
        <div class="boss-title"><h2 id="chk-h" style="margin:0">Daily & weekly checklist</h2></div>
        <p class="small" id="reset-line"></p>
        <div class="grid two">
          <div><h3>Daily</h3><div id="chk-daily"></div></div>
          <div><h3>Weekly</h3><div id="chk-weekly"></div></div>
        </div>
        <div class="toolbar no-print"><button type="button" class="btn small" id="chk-clear">Uncheck all</button>
        <span class="small">Saved on this device only. Weekly items clear at the weekly reset, daily items at the daily reset.</span></div>
      </section>`;

    // countdown
    const cd = $("#season-cd");
    const tick = () => {
      if (!next) { cd.innerHTML = ""; return; }
      const t = splitDur(next.d - new Date());
      cd.innerHTML = [["d", "days"], ["h", "hrs"], ["m", "min"], ["s", "sec"]].map(([k, l]) => `<div class="unit"><span class="num">${t[k]}</span><span class="lbl">${l}</span></div>`).join("");
    };
    tick(); setInterval(tick, 1000);

    renderChecklist(patch);
  }

  function renderChecklist(patch) {
    const KEY = "santana.checklist.v1";
    const items = patch.checklist || { daily: [], weekly: [] };
    const info = resetInfo(patch);
    let st = store.get(KEY, { daily: {}, weekly: {}, dailyStamp: 0, weeklyStamp: 0 });
    if ((st.weeklyStamp || 0) < info.lastWeekly.getTime()) { st.weekly = {}; st.weeklyStamp = info.lastWeekly.getTime(); }
    if ((st.dailyStamp || 0) < info.lastDaily.getTime()) { st.daily = {}; st.dailyStamp = info.lastDaily.getTime(); }
    store.set(KEY, st);

    const box = (freq) => arr(items[freq]).map((it) => `
      <label class="check"><input type="checkbox" data-freq="${freq}" data-id="${esc(it.id)}" ${st[freq][it.id] ? "checked" : ""}>
      <span class="what">${esc(it.label)}${it.note ? `<span class="note">${esc(it.note)}</span>` : ""}</span></label>`).join("") || `<p class="empty">No items.</p>`;
    $("#chk-daily").innerHTML = box("daily");
    $("#chk-weekly").innerHTML = box("weekly");
    $("#reset-line").textContent = `Next daily reset in ${durText(info.nextDaily - new Date())} (${fmtLocal(info.nextDaily)}). Next weekly reset in ${durText(info.nextWeekly - new Date())} (${fmtLocal(info.nextWeekly)}). Times shown in your time zone.`;

    $$("input[data-freq]").forEach((cb) => cb.addEventListener("change", () => {
      st[cb.dataset.freq][cb.dataset.id] = cb.checked; store.set(KEY, st);
    }));
    $("#chk-clear").addEventListener("click", () => {
      st.daily = {}; st.weekly = {}; store.set(KEY, st); $$("input[data-freq]").forEach((c) => (c.checked = false));
    });
  }

  /* ---------------- LIST (sword trials / hero's realms) ---------------- */
  function levelText(e) {
    const v = arr(e.variants).map((x) => x.level).filter((l) => l !== e.level);
    return esc(e.level) + (v.length ? ` <span class="small">/ ${v.map(esc).join(" / ")}</span>` : "");
  }
  function renderList({ encounters }) {
    const type = document.body.dataset.type;
    const app = $("#app");
    const rows = encounters.filter((e) => e.type === type);
    const title = type === "sword-trial" ? "Sword Trials" : "Hero's Realms";
    const intro = type === "sword-trial"
      ? "Five-player trials. Clearing is free; claiming the reward costs Energy. Talents are earned by doing a mechanic perfectly."
      : "Ten-player raids. You claim the reward once per week, so clear the highest tier you can first.";
    app.innerHTML = `
      <h1>${title}</h1>
      <p class="lede">${intro} Tap a column header to sort.</p>
      <div class="toolbar no-print">
        <label>Coverage <select id="f-cov"><option value="">All</option><option value="full">Full</option><option value="partial">Partial</option><option value="stub">Stub</option></select></label>
        <label>Min level <select id="f-lvl"><option value="0">Any</option>${[...new Set(rows.map((r) => r.level))].sort((a, b) => a - b).map((l) => `<option>${l}</option>`).join("")}</select></label>
      </div>
      <div class="table-wrap"><table class="stack" id="enc-table">
        <thead><tr>
          <th><button class="sort" data-k="name">Name ↕</button></th>
          <th><button class="sort" data-k="level" aria-sort="descending">Level ↓</button></th>
          <th>Bosses</th><th>Players</th><th>Coverage</th><th>Last verified</th>
        </tr></thead><tbody></tbody></table></div>`;
    let sortK = "level", dir = -1;
    const draw = () => {
      const cov = $("#f-cov").value, min = +$("#f-lvl").value;
      const list = rows.filter((r) => (!cov || r.coverage === cov) && r.level >= min).sort((a, b) => {
        const x = a[sortK], y = b[sortK];
        return (typeof x === "number" ? x - y : String(x).localeCompare(String(y))) * dir || a.name.localeCompare(b.name);
      });
      $("#enc-table tbody").innerHTML = list.map((e) => `<tr>
        <td data-label="Name"><a class="row-link" href="encounter.html?id=${encodeURIComponent(e.id)}">${esc(e.name)}</a> ${verifyBadge(e.needsVerification)}</td>
        <td data-label="Level">${levelText(e)}</td>
        <td data-label="Bosses">${e.bosses.map((b) => `<a href="encounter.html?id=${encodeURIComponent(e.id)}#boss-${esc(b.id)}">${esc(b.name)}</a>`).join(" → ")}</td>
        <td data-label="Players">${esc(e.players)}</td>
        <td data-label="Coverage">${coverageBadge(e.coverage)}</td>
        <td data-label="Last verified">${fmtDate(e.lastVerified)}</td></tr>`).join("") || `<tr><td colspan="6" class="empty">No matches.</td></tr>`;
      $$("#enc-table th button.sort").forEach((b) => {
        const on = b.dataset.k === sortK;
        b.textContent = (b.dataset.k === "name" ? "Name" : "Level") + (on ? (dir > 0 ? " ↑" : " ↓") : " ↕");
        b.setAttribute("aria-sort", on ? (dir > 0 ? "ascending" : "descending") : "none");
      });
    };
    $$("#enc-table th button.sort").forEach((b) => b.addEventListener("click", () => {
      if (sortK === b.dataset.k) dir = -dir; else { sortK = b.dataset.k; dir = sortK === "level" ? -1 : 1; }
      draw();
    }));
    $("#f-cov").addEventListener("change", draw);
    $("#f-lvl").addEventListener("change", draw);
    draw();
  }

  /* ---------------- ENCOUNTER ---------------- */
  function mechCard(m, i) {
    return `<article class="mech-card">
      <div class="name"><span class="num">${i + 1}</span>${esc(m.name)} ${verifyBadge(m.needsVerification, m.verifyNote)}</div>
      <p class="when"><b>When</b> ${esc(m.trigger)}</p>
      <p class="do"><span class="arrow">→</span> <b>Do</b> ${esc(m.response)}</p>
      ${m.note ? `<p class="small" style="margin:.4em 0 0">${esc(m.note)}</p>` : ""}
    </article>`;
  }
  function talentRows(e, b, done) {
    return b.talents.map((t) => {
      const key = b.id + ":" + t.code;
      const vid = t.video ? ` <a href="${esc(t.video.url)}" target="_blank" rel="noopener" class="small print-hide">▶ ${esc(t.video.t || "video")}</a>` : "";
      return `<tr class="${done[key] ? "done" : ""}">
        <td class="chk"><input type="checkbox" data-talent="${esc(key)}" aria-label="Talent ${esc(t.code)} done" ${done[key] ? "checked" : ""}></td>
        <td class="code" data-label="Code">${esc(t.code)}</td>
        <td data-label="Condition">${esc(t.condition)} ${verifyBadge(t.needsVerification, t.verifyNote)}${t.notes ? `<br><span class="small">${esc(t.notes)}</span>` : ""}${vid}</td>
        <td data-label="Smart Assist" class="small">${esc(t.smartAssist || "")}</td></tr>`;
    }).join("");
  }
  function renderEncounter({ encounters }) {
    const app = $("#app");
    const id = new URLSearchParams(location.search).get("id");
    const e = encounters.find((x) => x.id === id);
    if (!e) {
      app.innerHTML = `<h1>Encounter not found</h1><p>No encounter with id <code>${esc(id)}</code>. Try <a href="sword-trials.html">Sword Trials</a> or <a href="heros-realms.html">Hero's Realms</a>.</p>`;
      return;
    }
    document.title = `${e.name} · ${SITE}`;
    const TKEY = "santana.talents." + e.id, RKEY = "santana.roles." + e.id;
    const done = store.get(TKEY, {});
    const names = store.get(RKEY, {});
    const req = e.requirements || {};
    const failures = arr(e.commonFailures).map((f) => (typeof f === "string" ? { text: f } : f));

    const roleRows = arr(e.roles).map((r, i) => `<tr>
      <td data-label="Role"><strong>${esc(r.role)}</strong>${r.count ? ` <span class="small">×${esc(r.count)}</span>` : ""}</td>
      <td data-label="Player" class="no-print-input"><input type="text" data-role="${i}" value="${esc(names[i] || "")}" placeholder="Name(s)" aria-label="Who plays ${esc(r.role)}"></td>
      ${e.bosses.map((b) => `<td data-label="${esc(b.name)}">${esc((r.duties || {})[b.id] || "—")}</td>`).join("")}
    </tr>`).join("");

    app.innerHTML = `
      <div class="enc-head">
        <p class="small no-print"><a href="${e.type === "sword-trial" ? "sword-trials.html" : "heros-realms.html"}">← ${TYPE_LABEL[e.type]}s</a></p>
        <div class="boss-title" id="top"><h1>${esc(e.name)}</h1>${copyLinkBtn("top", e.name)}</div>
        <div class="badges">${typeBadge(e.type)}<span class="badge">Lv ${esc(e.level)}</span><span class="badge">${esc(e.players)} players</span>${coverageBadge(e.coverage)}${verifyBadge(e.needsVerification)}</div>
        <p class="meta">${e.bosses.map((b) => esc(b.name)).join(" → ")} · Added ${esc(e.added && e.added.version || "?")} (${esc(e.added && e.added.date || "?")}) · Last verified ${fmtDate(e.lastVerified)}${e.verifiedBy ? ` <span class="small">(${esc(e.verifiedBy)})</span>` : ""}</p>
        ${arr(e.verifyNotes).length ? `<div class="callout" style="margin:8px 0"><strong>Needs checking:</strong><ul style="margin:.3em 0 0 1.1em;padding:0">${e.verifyNotes.map((n) => `<li>${esc(n)}</li>`).join("")}</ul></div>` : ""}
        <nav class="toc no-print" aria-label="On this page">
          <a href="#before">Before you queue</a>${arr(e.roles).length ? `<a href="#roles">Roles</a>` : ""}
          ${e.bosses.map((b) => `<a href="#boss-${esc(b.id)}">${esc(b.name)}</a>`).join("")}
          <a href="#failures">Why talents fail</a><a href="#more">Rewards & sources</a>
        </nav>
        <div class="toolbar no-print"><button class="btn small" type="button" onclick="window.print()">🖨 Print cheat sheet</button>
          <button class="btn small" type="button" id="reset-talents">↺ Reset talent checks</button></div>
      </div>

      <section class="card queue-box" id="before" aria-labelledby="before-h">
        <div class="boss-title"><h2 id="before-h" style="margin:0">Before you queue</h2>${copyLinkBtn("before", "Before you queue")}</div>
        <dl style="margin-top:10px">
          <dt>Level</dt><dd>${esc(req.level || e.level)}${arr(e.variants).length ? ` · ${e.variants.map((v) => `${esc(v.name)}: Lv ${esc(v.level)}`).join(" · ")}` : ""}</dd>
          <dt>Mastery</dt><dd>${arr(req.mastery).map((m) => `<div>${esc(m.value)} <span class="small">(${esc(m.source)})</span></div>`).join("") || '<span class="empty">Not published</span>'}</dd>
          ${req.party ? `<dt>Party</dt><dd>${esc(req.party)}</dd>` : ""}
          <dt>Bring / equip</dt><dd>${arr(req.bring).length ? `<ul style="margin:0;padding-left:1.1em">${req.bring.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : '<span class="empty">Nothing special listed</span>'}</dd>
          ${arr(req.notes).length ? `<dt>Notes</dt><dd>${req.notes.map((x) => `<div>${esc(x)}</div>`).join("")}</dd>` : ""}
        </dl>
      </section>

      ${arr(e.roles).length ? `
      <section id="roles" aria-labelledby="roles-h">
        <div class="boss-title"><h2 id="roles-h">Roles: assign before the pull</h2>${copyLinkBtn("roles", "Roles")}</div>
        <div class="table-wrap"><table class="stack roles-table"><thead><tr><th>Role</th><th>Player</th>${e.bosses.map((b) => `<th>${esc(b.name)}</th>`).join("")}</tr></thead>
        <tbody>${roleRows}</tbody></table></div>
        <div class="toolbar no-print"><button class="btn small" type="button" id="copy-roles">📋 Copy roles for Discord</button><button class="btn small" type="button" id="clear-roles">Clear names</button></div>
      </section>` : ""}

      ${e.bosses.map((b, bi) => {
        const bf = failures.filter((f) => f.boss === b.id);
        return `
      <section class="boss" id="boss-${esc(b.id)}" aria-labelledby="h-${esc(b.id)}">
        <div class="boss-title"><h2 id="h-${esc(b.id)}">Boss ${bi + 1}: ${esc(b.name)}</h2>${copyLinkBtn("boss-" + b.id, b.name)} ${verifyBadge(b.needsVerification, b.verifyNote)}</div>
        ${b.summary ? `<p>${esc(b.summary)}</p>` : ""}
        ${b.worldBossNote ? `<p class="callout info small">${esc(b.worldBossNote)}</p>` : ""}
        <h3>Mechanics, in order</h3>
        ${arr(b.mechanics).length ? `<div class="mech">${b.mechanics.map(mechCard).join("")}</div>` : `<p class="empty">No confirmed mechanics written up yet.</p>`}
        <h3 id="talents-${esc(b.id)}">Talents</h3>
        ${arr(b.talents).length ? `<div class="table-wrap"><table class="talent-table stack"><thead><tr><th>✓</th><th>Code</th><th>Condition</th><th>Smart Assist</th></tr></thead>
          <tbody>${talentRows(e, b, done)}</tbody></table></div>` : `<p class="empty">No talent conditions confirmed yet.</p>`}
        ${bf.length ? `<h3>Why talents fail here</h3><ul class="fail-list">${bf.map((f) => `<li>${esc(f.text)}</li>`).join("")}</ul>` : ""}
      </section>`;
      }).join("")}

      <section id="failures" aria-labelledby="fail-h">
        <div class="boss-title"><h2 id="fail-h">Why talents fail</h2>${copyLinkBtn("failures", "Why talents fail")}</div>
        ${failures.length ? `<ul class="fail-list">${failures.map((f) => `<li>${f.boss ? `<strong>${esc((e.bosses.find((b) => b.id === f.boss) || {}).name || f.boss)}:</strong> ` : ""}${esc(f.text)}</li>`).join("")}</ul>` : `<p class="empty">None recorded yet.</p>`}
        ${e.guildNotes ? `<h3>Guild notes</h3><p>${esc(e.guildNotes)}</p>` : ""}
      </section>

      <section id="more" aria-labelledby="more-h">
        <h2 id="more-h">Rewards, videos & sources</h2>
        <div class="grid two">
          <div class="card rewards-block"><h3>Rewards</h3>${arr(e.rewards).length ? `<ul style="margin:0;padding-left:1.1em">${e.rewards.map((r) => `<li>${esc(r)}</li>`).join("")}</ul>` : '<p class="empty">Not recorded.</p>'}</div>
          <div class="card video-list"><h3>Guide videos</h3>${arr(e.videos).length ? `<ul class="plain">${e.videos.map((v) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a>${v.author ? ` <span class="small">· ${esc(v.author)}</span>` : ""}
            ${arr(v.timestamps).length ? `<div class="ts">${v.timestamps.map((t) => `<a href="${esc(tsUrl(v.url, t.t))}" target="_blank" rel="noopener">${esc(t.t)} ${esc(t.label)}</a>`).join("")}</div>` : ""}</li>`).join("")}</ul>` : '<p class="empty">None listed.</p>'}</div>
        </div>
        <div class="card sources-block" style="margin-top:14px"><h3>Sources</h3><ul style="margin:0;padding-left:1.1em">${arr(e.sources).map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a> <span class="small">(${esc(s.site || host(s.url))}${s.note ? " · " + esc(s.note) : ""})</span></li>`).join("")}</ul></div>
      </section>`;

    // talents
    $$("input[data-talent]").forEach((cb) => cb.addEventListener("change", () => {
      done[cb.dataset.talent] = cb.checked; store.set(TKEY, done); cb.closest("tr").classList.toggle("done", cb.checked);
    }));
    $("#reset-talents").addEventListener("click", () => {
      for (const k in done) delete done[k];
      store.del(TKEY);
      $$("input[data-talent]").forEach((c) => { c.checked = false; c.closest("tr").classList.remove("done"); });
      toast("Talent checks reset");
    });
    // roles
    $$("input[data-role]").forEach((inp) => inp.addEventListener("input", () => { names[inp.dataset.role] = inp.value; store.set(RKEY, names); }));
    const cr = $("#copy-roles");
    if (cr) cr.addEventListener("click", () => {
      const lines = [`**${e.name}** (Lv ${e.level}) roles`, linkTo("roles"), ""];
      e.roles.forEach((r, i) => {
        lines.push(`**${r.role}**: ${names[i] || "_unassigned_"}`);
        e.bosses.forEach((b) => { const d = (r.duties || {})[b.id]; if (d) lines.push(`  • ${b.name}: ${d}`); });
      });
      copyText(lines.join("\n")).then(() => toast("Roles copied for Discord")).catch(() => toast("Couldn't copy"));
    });
    const clr = $("#clear-roles");
    if (clr) clr.addEventListener("click", () => { store.del(RKEY); for (const k in names) delete names[k]; $$("input[data-role]").forEach((i) => (i.value = "")); });

    // honour the hash after render
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 0); }
  }
  function host(u) { try { return new URL(u).hostname.replace(/^www\./, ""); } catch (e) { return ""; } }
  function tsUrl(url, t) {
    const parts = String(t).split(":").map(Number); let s = 0; parts.forEach((p) => (s = s * 60 + (p || 0)));
    try { const u = new URL(url); u.searchParams.set("t", s + "s"); return u.toString(); } catch (e) { return url; }
  }

  /* ---------------- ACTIVITIES (guild & team / other endgame) ---------------- */
  function activityCard(a) {
    return `<section class="card" id="${esc(a.id)}" style="margin-bottom:14px" aria-labelledby="h-${esc(a.id)}">
      <div class="boss-title"><h2 id="h-${esc(a.id)}" style="margin:0">${esc(a.name)}</h2>${copyLinkBtn(a.id, a.name)}</div>
      <div class="badges">${typeBadge(a.category)}${a.players ? `<span class="badge">${esc(a.players)}</span>` : ""}${a.coverage ? coverageBadge(a.coverage) : ""}${verifyBadge(a.needsVerification)}${a.added ? `<span class="badge">Added ${esc(a.added.version || "")} ${esc(a.added.date || "")}</span>` : ""}</div>
      <dl class="queue-box" style="display:grid;grid-template-columns:max-content 1fr;gap:6px 14px;margin:10px 0">
        ${a.unlock ? `<dt class="small">Unlock</dt><dd style="margin:0">${esc(a.unlock)}</dd>` : ""}
        ${a.schedule ? `<dt class="small">Schedule / reset</dt><dd style="margin:0">${esc(a.schedule)}</dd>` : ""}
      </dl>
      ${arr(a.how).length ? `<h3>How it works</h3><ul style="padding-left:1.1em;margin-top:0">${arr(a.how).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${arr(a.tips).length ? `<h3>Tips</h3><ul style="padding-left:1.1em;margin-top:0">${a.tips.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${arr(a.rewards).length ? `<h3>Rewards</h3><ul style="padding-left:1.1em;margin-top:0">${a.rewards.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : ""}
      ${arr(a.verifyNotes).length ? `<div class="callout small"><strong>Needs checking:</strong> ${a.verifyNotes.map(esc).join(" · ")}</div>` : ""}
      ${arr(a.videos).length ? `<h3>Videos</h3><ul class="plain">${a.videos.map((v) => `<li><a href="${esc(v.url)}" target="_blank" rel="noopener">${esc(v.title)}</a>${v.author ? ` <span class="small">· ${esc(v.author)}</span>` : ""}</li>`).join("")}</ul>` : ""}
      <p class="small" style="margin-bottom:0">Sources: ${arr(a.sources).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.site || host(s.url))}</a>`).join(" · ") || "none yet"}</p>
    </section>`;
  }
  function renderActivities({ activities }, cats, title, intro) {
    const app = $("#app");
    const list = activities.filter((a) => cats.includes(a.category));
    const groups = cats.map((c) => [c, list.filter((a) => a.category === c)]).filter(([, l]) => l.length);
    app.innerHTML = `<h1>${esc(title)}</h1><p class="lede">${esc(intro)}</p>
      <nav class="toc no-print" aria-label="On this page">${list.map((a) => `<a href="#${esc(a.id)}">${esc(a.name)}</a>`).join("")}</nav>
      ${groups.map(([c, l]) => `<h2>${esc(CAT_LABEL[c])}</h2>${l.map(activityCard).join("")}`).join("")}`;
    if (location.hash) { const t = document.getElementById(location.hash.slice(1)); if (t) setTimeout(() => t.scrollIntoView(), 0); }
  }

  /* ---------------- SEARCH ---------------- */
  function buildIndex({ encounters, activities }) {
    const idx = [];
    encounters.forEach((e) => {
      idx.push({ kind: e.type, title: e.name, level: e.level, coverage: e.coverage, url: `encounter.html?id=${e.id}`, sub: e.bosses.map((b) => b.name).join(" → "),
        text: [e.name, e.guildNotes, ...arr(e.requirements && e.requirements.bring)].join(" ") });
      e.bosses.forEach((b) => {
        idx.push({ kind: e.type, title: `${b.name}`, level: e.level, coverage: e.coverage, url: `encounter.html?id=${e.id}#boss-${b.id}`, sub: `Boss in ${e.name}`, text: [b.name, b.summary, b.worldBossNote].join(" ") });
        arr(b.mechanics).forEach((m) => idx.push({ kind: e.type, title: m.name, level: e.level, coverage: e.coverage, url: `encounter.html?id=${e.id}#boss-${b.id}`, sub: `Mechanic · ${b.name} · ${e.name}`, text: [m.name, m.trigger, m.response].join(" ") }));
        arr(b.talents).forEach((t) => idx.push({ kind: e.type, title: `Talent ${t.code}: ${b.name}`, level: e.level, coverage: e.coverage, url: `encounter.html?id=${e.id}#talents-${b.id}`, sub: t.condition, text: [t.condition, t.notes].join(" ") }));
      });
    });
    activities.forEach((a) => idx.push({ kind: a.category, title: a.name, level: null, coverage: a.coverage || null, url: `${["pvp", "event"].includes(a.category) ? "endgame" : "guild"}.html#${a.id}`, sub: CAT_LABEL[a.category],
      text: [a.name, a.unlock, a.schedule, ...arr(a.how), ...arr(a.tips)].join(" ") }));
    idx.forEach((r) => (r.hay = (r.title + " " + r.sub + " " + r.text).toLowerCase()));
    return idx;
  }
  function renderSearch(data) {
    const app = $("#app");
    const params = new URLSearchParams(location.search);
    const idx = buildIndex(data);
    const levels = [...new Set(data.encounters.map((e) => e.level))].sort((a, b) => a - b);
    app.innerHTML = `<h1>Search</h1>
      <div class="toolbar">
        <label style="flex:1 1 240px">Search<input type="search" id="q" value="${esc(params.get("q") || "")}" placeholder="e.g. deflect, Lion's Roar, 2-3, poison" autofocus></label>
        <label>Type<select id="ft"><option value="">All</option><option value="sword-trial">Sword Trials</option><option value="heros-realm">Hero's Realms</option><option value="guild">Guild</option><option value="team">Team</option><option value="pvp">PvP</option><option value="event">Events / Modes</option></select></label>
        <label>Min level<select id="fl"><option value="0">Any</option>${levels.map((l) => `<option>${l}</option>`).join("")}</select></label>
        <label>Coverage<select id="fc"><option value="">Any</option><option>full</option><option>partial</option><option>stub</option></select></label>
      </div>
      <p class="small" id="count"></p><ul class="plain" id="results"></ul>`;
    ["ft", "fl", "fc"].forEach((k) => { const v = params.get(k); if (v) $("#" + k).value = v; });
    const run = () => {
      const q = $("#q").value.trim().toLowerCase(), ft = $("#ft").value, fl = +$("#fl").value, fc = $("#fc").value;
      const terms = q.split(/\s+/).filter(Boolean);
      const res = idx.filter((r) => (!ft || r.kind === ft) && (!fl || (r.level != null && r.level >= fl)) && (!fc || r.coverage === fc) && terms.every((t) => r.hay.includes(t)));
      const shown = res.slice(0, 80);
      $("#count").textContent = q || ft || fl || fc ? `${res.length} result${res.length === 1 ? "" : "s"}${res.length > 80 ? " (showing 80)" : ""}` : "Type to search, or pick a filter.";
      $("#results").innerHTML = (q || ft || fl || fc) ? shown.map((r) => `<li><a href="${esc(r.url)}"><strong>${esc(r.title)}</strong></a>
        <div class="badges">${typeBadge(r.kind)}${r.level ? `<span class="badge">Lv ${r.level}</span>` : ""}${coverageBadge(r.coverage)}</div><span class="small">${esc(r.sub)}</span></li>`).join("") : "";
      const u = new URL(location.href);
      [["q", $("#q").value.trim()], ["ft", ft], ["fl", fl ? String(fl) : ""], ["fc", fc]].forEach(([k, v]) => (v ? u.searchParams.set(k, v) : u.searchParams.delete(k)));
      history.replaceState(null, "", u);
    };
    ["q", "ft", "fl", "fc"].forEach((k) => $("#" + k).addEventListener(k === "q" ? "input" : "change", run));
    run();
  }

  /* ---------------- SOURCES ---------------- */
  function renderSources({ patch, encounters, activities }) {
    const app = $("#app");
    const map = new Map();
    const add = (s, where) => {
      if (!s || !s.url) return;
      if (!map.has(s.url)) map.set(s.url, { ...s, used: new Set() });
      map.get(s.url).used.add(where);
    };
    arr(patch.sources).forEach((s) => add(s, "Patch info"));
    arr(patch.groupFeatures).forEach((f) => arr(f.sources).forEach((s) => add(s, "Group Tools: " + f.name)));
    encounters.forEach((e) => { arr(e.sources).forEach((s) => add(s, e.name)); arr(e.videos).forEach((v) => add({ title: v.title, url: v.url, site: "youtube.com" + (v.author ? " · " + v.author : "") }, e.name)); });
    activities.forEach((a) => { arr(a.sources).forEach((s) => add(s, a.name)); arr(a.videos).forEach((v) => add({ title: v.title, url: v.url, site: "youtube.com" }, a.name)); });
    const bySite = {};
    map.forEach((s) => { const h = host(s.url) || "other"; (bySite[h] = bySite[h] || []).push(s); });
    const sites = Object.keys(bySite).sort((a, b) => bySite[b].length - bySite[a].length);
    app.innerHTML = `<h1>Sources</h1>
      <p class="lede">Every page and video this guide draws on, grouped by site. Mechanics are paraphrased, not copied. Where two sources disagree, the encounter page shows both. See <code>RESEARCH_LOG.md</code> in the repo for what's confirmed by two or more sources.</p>
      <div class="callout info small">Trial and raid versions of bosses behave differently from the world-boss versions of the same name. Don't use a world-boss guide for a Sword Trial or Hero's Realm.</div>
      ${sites.map((h) => `<h2>${esc(h)} <span class="small">(${bySite[h].length})</span></h2><ul class="plain">${bySite[h].map((s) => `<li><a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.title)}</a>${s.note ? ` <span class="small">· ${esc(s.note)}</span>` : ""}<br><span class="small">Used for: ${[...s.used].map(esc).join(", ")}</span></li>`).join("")}</ul>`).join("")}`;
  }

  /* ---------------- GROUP TOOLS ---------------- */
  function renderTools({ patch, encounters }) {
    const app = $("#app");
    const off = (patch.resets && patch.resets.utcOffset) ?? 8;
    const gw = patch.guildWar || {};
    app.innerHTML = `<h1>Group Tools</h1>
      <p class="lede">Quick helpers for raid leads. Everything runs in your browser; nothing is uploaded.</p>
      <section class="card" id="resets"><div class="boss-title"><h2 style="margin:0">Reset clocks</h2>${copyLinkBtn("resets", "Reset clocks")}</div>
        <div id="reset-clocks" class="grid two" style="margin-top:10px"></div>
        <p class="small">Server time is UTC+${off}. ${patch.resets && patch.resets.note ? esc(patch.resets.note) : ""}</p></section>

      ${arr(patch.groupFeatures).length ? `<section class="card" id="in-game" style="margin-top:14px"><div class="boss-title"><h2 style="margin:0">In-game group features</h2>${copyLinkBtn("in-game", "In-game group features")}</div>
        <p class="small">Built into the game's team and raid screens. Worth knowing before you lead a run.</p>
        <ul class="plain">${patch.groupFeatures.map((f) => `<li><strong>${esc(f.name)}</strong> ${f.added ? `<span class="badge">${esc(f.added)}</span>` : ""} ${verifyBadge(f.needsVerification, f.verifyNote)}<br>${esc(f.what)}
          <br><span class="small">Sources: ${arr(f.sources).map((s) => `<a href="${esc(s.url)}" target="_blank" rel="noopener">${esc(s.site || host(s.url))}</a>`).join(" · ")}</span></li>`).join("")}</ul></section>` : ""}

      <section class="card" id="guild-war" style="margin-top:14px"><div class="boss-title"><h2 style="margin:0">Guild War start times</h2>${copyLinkBtn("guild-war", "Guild War start times")}</div>
        <p class="small">${esc(gw.note || "")}</p>
        <div class="table-wrap"><table class="stack"><thead><tr><th>Battlegroup</th><th>Region</th><th>Server clock</th><th>Next start (your time)</th><th>Starts in</th></tr></thead><tbody id="gw-body"></tbody></table></div></section>

      <section class="card" id="callsheet" style="margin-top:14px"><div class="boss-title"><h2 style="margin:0">Discord call sheet</h2>${copyLinkBtn("callsheet", "Discord call sheet")}</div>
        <p class="small">Pick an encounter to build a short text with the must-know mechanics and talents, ready to paste in your raid channel.</p>
        <div class="toolbar"><label style="flex:1 1 240px">Encounter<select id="cs-enc" style="width:100%">${encounters.slice().sort((a, b) => b.level - a.level).map((e) => `<option value="${esc(e.id)}">${esc(e.name)} (Lv ${e.level}, ${esc(TYPE_LABEL[e.type])})</option>`).join("")}</select></label>
          <label><span>Include talents</span><select id="cs-tal"><option value="1">Yes</option><option value="0">No</option></select></label></div>
        <textarea id="cs-out" rows="12" style="width:100%;font:14px/1.45 ui-monospace,Menlo,monospace;background:var(--ink-3);color:var(--paper);border:1px solid var(--line);border-radius:10px;padding:10px" readonly></textarea>
        <div class="toolbar"><button class="btn primary" type="button" id="cs-copy">📋 Copy</button><span class="small" id="cs-len"></span></div></section>`;

    const clocks = () => {
      const now = new Date(), info = resetInfo(patch, now);
      const server = new Date(now.getTime() + off * 3600e3);
      $("#reset-clocks").innerHTML = `
        <div><div class="small">Server time now</div><div class="num" style="font:600 1.4rem var(--serif)">${server.toISOString().slice(11, 16)} <span class="small">${["Sun","Mon","Tue","Wed","Thu","Fri","Sat"][server.getUTCDay()]}</span></div></div>
        <div><div class="small">Daily reset</div><div style="font:600 1.4rem var(--serif)">${durText(info.nextDaily - now)}</div><div class="small">${esc(fmtLocal(info.nextDaily))}</div></div>
        <div><div class="small">Weekly reset</div><div style="font:600 1.4rem var(--serif)">${durText(info.nextWeekly - now)}</div><div class="small">${esc(fmtLocal(info.nextWeekly))}</div></div>`;
      $("#gw-body").innerHTML = arr(gw.battlegroups).map((bg) => {
        const hm = parseHM(gw.time);
        const nexts = arr(gw.days).map((day) => {
          let l = lastReset(now, bg.utcOffset, hm, day); let n = new Date(l.getTime() + 7 * 864e5);
          if (now - l < 3600e3) n = l; // within the first hour: show the current one
          return n;
        }).sort((a, b) => a - b);
        const n = nexts[0];
        return `<tr><td data-label="Battlegroup"><strong>${esc(bg.name)}</strong></td><td data-label="Region">${esc(bg.region)}</td>
          <td data-label="Server clock">${esc(gw.dayLabel || "")} ${esc(gw.time)} (UTC${bg.utcOffset >= 0 ? "+" : ""}${bg.utcOffset})</td>
          <td data-label="Next start">${n ? esc(fmtLocal(n)) : "—"}</td><td data-label="Starts in">${n ? (n <= now ? "Running now" : esc(durText(n - now))) : "—"}</td></tr>`;
      }).join("");
    };
    clocks(); setInterval(clocks, 30000);

    const build = () => {
      const e = encounters.find((x) => x.id === $("#cs-enc").value); if (!e) return;
      const withT = $("#cs-tal").value === "1";
      const url = new URL("encounter.html?id=" + e.id, location.href).toString();
      const L = [`**${e.name}**: ${TYPE_LABEL[e.type]} Lv ${e.level} (${e.players}p)`, url];
      const req = e.requirements || {};
      if (arr(req.bring).length) L.push(`Bring: ${req.bring.join("; ")}`);
      e.bosses.forEach((b, i) => {
        L.push("", `__${i + 1}. ${b.name}__`);
        arr(b.mechanics).forEach((m) => L.push(`• ${m.name}: ${m.response}`));
        if (withT && arr(b.talents).length) L.push(`Talents: ${b.talents.map((t) => `${t.code} ${t.condition}`).join(" | ")}`);
      });
      if (e.coverage !== "full" || e.needsVerification) L.push("", "_Guide is incomplete or unverified. Confirm in game._");
      const text = L.join("\n");
      $("#cs-out").value = text;
      $("#cs-len").textContent = `${text.length} characters${text.length > 2000 ? " (over Discord's 2,000 limit: post in two messages or turn off talents)" : ""}`;
    };
    $("#cs-enc").addEventListener("change", build); $("#cs-tal").addEventListener("change", build); build();
    $("#cs-copy").addEventListener("click", () => copyText($("#cs-out").value).then(() => toast("Copied")).catch(() => toast("Couldn't copy")));
  }

  /* ---------------- boot ---------------- */
  function boot() {
    const page = document.body.dataset.page;
    renderChrome(page);
    if (page === "buildlab") return; // Build Lab renders itself (assets/js/buildlab/buildlab.js)
    loadAll().then((data) => {
      switch (page) {
        case "home": return renderHome(data);
        case "list": return renderList(data);
        case "encounter": return renderEncounter(data);
        case "guild": return renderActivities(data, ["guild", "team"], "Guild & Team Content", "Content to run with guildmates or a fixed group: guild challenges, Guild War, trios and group world bosses.");
        case "endgame": return renderActivities(data, ["pvp", "event"], "Other Endgame", "PvP, seasonal modes and new-patch modes worth knowing about.");
        case "search": return renderSearch(data);
        case "sources": return renderSources(data);
        case "tools": return renderTools(data);
      }
    }).catch(fail);
  }
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", boot); else boot();

  // Exposed for the validator script / debugging only.
  window.SantanaGuide = { resetInfo, lastReset, parseServerDate, buildIndex,
    // Shared helpers for Build Lab (assets/js/buildlab/buildlab.js)
    helpers: { $, $$, esc, arr, store, loadJSON, toast, copyText, verifyBadge, host, fail } };
})();
