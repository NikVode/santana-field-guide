import { afterEach, beforeAll, describe, expect, it } from "vitest";
import { runCommand } from "../src/commands";
import { guildWarNext, parseHM, parseServerDate, resetInfo, serverOffset } from "../src/site";
import { buildTimes, selectTimes, timesChoices } from "../src/times";
import { validateMessage } from "../src/embed";
import type { Patch, SiteData } from "../src/types";
import { liveData, liveSiteHelpers, type SiteHelpers } from "./live";

const PATCH: Patch = { resets: { utcOffset: 8, daily: "05:00", weekly: { day: 1, time: "05:00" } } };
const at = (iso: string) => new Date(iso);
const origTZ = process.env.TZ;
afterEach(() => { process.env.TZ = origTZ; });

describe("recurring resets", () => {
  it("weekly reset across the week boundary (Monday 05:00 UTC+8)", () => {
    // Sunday 23:00 server time -> 6 h to go
    expect(resetInfo(PATCH, at("2026-11-15T15:00:00Z")).nextWeekly.toISOString()).toBe("2026-11-15T21:00:00.000Z");
    // Monday 04:59 server time -> 1 min
    expect(resetInfo(PATCH, at("2026-11-15T20:59:00Z")).nextWeekly.toISOString()).toBe("2026-11-15T21:00:00.000Z");
    // Monday 05:00 exactly -> the reset just happened, next is a week later
    const r = resetInfo(PATCH, at("2026-11-15T21:00:00Z"));
    expect(r.nextWeekly.toISOString()).toBe("2026-11-22T21:00:00.000Z");
    expect(r.nextDaily.toISOString()).toBe("2026-11-16T21:00:00.000Z");
    // Monday 03:00 UTC = Monday 11:00 server -> next Monday
    expect(resetInfo(PATCH, at("2026-11-16T03:00:00Z")).nextWeekly.toISOString()).toBe("2026-11-22T21:00:00.000Z");
  });
  it("daily reset before and after 05:00 server time, and over New Year", () => {
    expect(resetInfo(PATCH, at("2026-11-13T20:59:59Z")).nextDaily.toISOString()).toBe("2026-11-13T21:00:00.000Z");
    expect(resetInfo(PATCH, at("2026-11-13T21:00:01Z")).nextDaily.toISOString()).toBe("2026-11-14T21:00:00.000Z");
    const ny = resetInfo(PATCH, at("2026-12-31T22:00:00Z")); // Fri Jan 1 06:00 server
    expect(ny.nextDaily.toISOString()).toBe("2027-01-01T21:00:00.000Z");
    expect(ny.nextWeekly.toISOString()).toBe("2027-01-03T21:00:00.000Z"); // Mon Jan 4 05:00 server
  });
  it("gives the same instants whatever time zone the machine is in", () => {
    const now = at("2026-11-15T20:30:00Z");
    const base = JSON.stringify([resetInfo(PATCH, now), buildTimes(PATCH, now).map((i) => [i.id, i.at])]);
    for (const tz of ["UTC", "America/Los_Angeles", "America/New_York", "Europe/Berlin", "Asia/Shanghai", "Asia/Kolkata", "Pacific/Kiritimati", "America/St_Johns", "Australia/Lord_Howe"]) {
      process.env.TZ = tz;
      expect(JSON.stringify([resetInfo(PATCH, now), buildTimes(PATCH, now).map((i) => [i.id, i.at])]), tz).toBe(base);
    }
  });
  it("really switches the machine's time zone (so the loop above means something)", () => {
    const jan = new Date("2026-01-15T00:00:00Z");
    process.env.TZ = "UTC"; expect(jan.getTimezoneOffset()).toBe(0);
    process.env.TZ = "Asia/Kolkata"; expect(jan.getTimezoneOffset()).toBe(-330);
    process.env.TZ = "America/St_Johns"; expect(jan.getTimezoneOffset()).toBe(210);
  });
  it("renders Discord timestamps, never pre-converted local times", () => {
    const rep = runCommand("times", { what: "weekly" }, { siteUrl: "https://s/", encounters: [], patch: PATCH }, at("2026-11-15T15:00:00Z"));
    const unix = Date.parse("2026-11-15T21:00:00Z") / 1000; // Mon 05:00 UTC+8
    expect(rep.messages[0].embeds![0].description).toContain(`<t:${unix}:R> · <t:${unix}:f>`);
  });
  it("Guild War: each battlegroup's own clock, 'running now' for the first hour", () => {
    // Sat 20:30 at UTC-4 = Sun 00:30 UTC
    expect(guildWarNext(at("2026-11-14T20:00:00Z"), -4, "20:30", [6, 0])!.toISOString()).toBe("2026-11-15T00:30:00.000Z");
    const running = at("2026-11-15T01:00:00Z");
    expect(guildWarNext(running, -4, "20:30", [6, 0])!.toISOString()).toBe("2026-11-15T00:30:00.000Z");
    expect(guildWarNext(at("2026-11-15T01:31:00Z"), -4, "20:30", [6, 0])!.toISOString()).toBe("2026-11-16T00:30:00.000Z");
  });
});

describe("dated items", () => {
  const patch: Patch = { ...PATCH, season: { name: "S9", endDate: "2027-01-07", endTime: "05:00", milestones: [
    { label: "Old Battle Pass ends", date: "2026-11-01 17:59 (UTC+8)" },
    { label: "Past switch", at: "2026-11-02T04:59" },
    { label: "Future Battle Pass ends", date: "2026-12-10 04:59 (UTC+8)", at: "2026-12-10T04:59" },
    { label: "Sprint: Arena", date: "2026-11-19 05:00 → 2026-11-26 04:59 (server time)" },
    { label: "No date here", date: "TBA" },
  ] }, comingSoon: [{ title: "Sprint: Arena", date: "2026-11-19" }, { title: "Version 9.9: New Things", date: "2026-11-20" }] };
  const now = at("2026-11-13T12:00:00Z");

  it("drops anything already past, and undated entries", () => {
    const ids = buildTimes(patch, now).map((i) => i.id);
    expect(ids).not.toContain("old-battle-pass-ends");
    expect(ids).not.toContain("past-switch");
    expect(ids).not.toContain("no-date-here");
    expect(ids).toContain("future-battle-pass-ends");
    expect(ids).toContain("season");
  });
  it("sorts soonest first", () => {
    const list = buildTimes(patch, now).map((i) => i.at.getTime());
    expect([...list].sort((a, b) => a - b)).toEqual(list);
  });
  it("a range shows 'starts', then 'ends' while it runs, then drops off", () => {
    const f = (n: Date) => buildTimes(patch, n).find((i) => i.id === "sprint-arena");
    expect(f(now)!.verb).toBe("starts");
    const mid = f(at("2026-11-20T00:00:00Z"))!;
    expect(mid.verb).toBe("ends");
    expect(mid.at.toISOString()).toBe("2026-11-25T20:59:00.000Z");
    expect(f(at("2026-11-26T00:00:00Z"))).toBeUndefined();
  });
  it("a range with an unreadable end falls back to its start; extra arrows use the last part", () => {
    const p: Patch = { ...PATCH, season: { milestones: [
      { label: "Bad end", date: "2026-12-01 05:00 → 12-08 04:59" },
      { label: "Three parts", date: "2026-12-01 05:00 → (break) → 2026-12-08 04:59" },
    ] } };
    const items = buildTimes(p, now);
    const bad = items.find((i) => i.id === "bad-end")!;
    expect(bad.at.toISOString()).toBe("2026-11-30T21:00:00.000Z");
    expect(bad.verb).toBe("starts");
    const three = buildTimes(p, at("2026-12-03T00:00:00Z")).find((i) => i.id === "three-parts")!;
    expect(three.verb).toBe("ends");
    expect(three.at.toISOString()).toBe("2026-12-07T20:59:00.000Z");
  });
  it("hides a coming-soon entry that repeats a milestone, keeps the rest", () => {
    const items = buildTimes(patch, now);
    expect(items.filter((i) => /Sprint: Arena/.test(i.label))).toHaveLength(1);
    expect(items.some((i) => i.label.startsWith("Version 9.9"))).toBe(true);
  });
  it("groups and autocomplete only offer what exists", () => {
    const items = buildTimes(patch, now);
    const values = timesChoices(items, "").map((c) => c.value);
    expect(values).toEqual(expect.arrayContaining(["resets", "battlepass", "arena", "season", "updates"]));
    expect(values).not.toContain("events");
    expect(selectTimes(items, "battlepass")!.items.map((i) => i.id)).toEqual(["future-battle-pass-ends"]);
    expect(selectTimes(items, "events")).toBeNull();
    expect(timesChoices(items, "batt").map((c) => c.value)).toContain("battlepass");
  });
});

describe("matches the live site's own countdown logic (assets/js/app.js)", () => {
  let site: SiteHelpers, data: SiteData;
  beforeAll(async () => { [site, data] = await Promise.all([liveSiteHelpers(), liveData()]); });
  const NOWS = ["2026-11-13T15:00:00Z", "2026-11-15T20:59:30Z", "2026-11-15T21:00:00Z", "2026-11-25T20:58:00Z", "2026-12-09T21:00:00Z", "2026-12-31T23:59:59Z"].map(at);

  it("loaded the site's helpers", () => { expect(typeof site.resetInfo).toBe("function"); });

  it("daily and weekly resets agree for fixed 'now' values (and 500 random ones)", () => {
    const rnd = Array.from({ length: 500 }, (_, i) => new Date(Date.UTC(2026, 10, 1) + ((i * 7919 * 60e3 * 13) % (120 * 864e5))));
    for (const now of [...NOWS, ...rnd]) {
      const a = site.resetInfo(data.patch, now), b = resetInfo(data.patch, now);
      expect(b.nextDaily.getTime(), now.toISOString()).toBe(a.nextDaily.getTime());
      expect(b.nextWeekly.getTime(), now.toISOString()).toBe(a.nextWeekly.getTime());
    }
  });

  it("season end, milestones and the Home 'Next' countdown agree", () => {
    const off = serverOffset(data.patch);
    const season = data.patch.season!;
    const siteEnd = site.parseServerDate(season.endDate + (season.endTime ? "T" + season.endTime : ""), off);
    for (const now of NOWS) {
      const items = buildTimes(data.patch, now);
      const bot = items.find((i) => i.id === "season");
      if (siteEnd! > now) expect(bot!.at.getTime()).toBe(siteEnd!.getTime()); else expect(bot).toBeUndefined();
      // The site's Home countdown target: season end or a milestone with `at`, whichever is next.
      const targets = [{ label: "Season ends", d: siteEnd }]
        .concat((season.milestones || []).filter((m) => m.at).map((m) => ({ label: m.label, d: site.parseServerDate(m.at!, off) })))
        .filter((t) => t.d && t.d > now).sort((a, b) => a.d!.getTime() - b.d!.getTime());
      for (const t of targets) {
        const match = items.find((i) => (t.label === "Season ends" ? i.id === "season" : i.label === t.label));
        expect(match, t.label).toBeDefined();
        expect(match!.at.getTime(), `${t.label} @ ${now.toISOString()}`).toBe(t.d!.getTime());
      }
      // and the milestone date text the bot parses goes through the same parser
      for (const m of season.milestones || []) if (!m.at && m.date) {
        const first = site.parseServerDate(m.date, off);
        const item = items.find((i) => i.label === m.label);
        if (item && item.verb !== "ends") expect(item.at.getTime()).toBe(first!.getTime());
      }
    }
  });

  it("Guild War next start agrees with the site's Group Tools formula", () => {
    const gw = data.patch.guildWar!;
    for (const now of NOWS) for (const bg of gw.battlegroups!) {
      const nexts = gw.days!.map((day) => {
        const l = site.lastReset(now, bg.utcOffset, parseHM(gw.time), day);
        let n = new Date(l.getTime() + 7 * 864e5);
        if (now.getTime() - l.getTime() < 3600e3) n = l;
        return n;
      }).sort((a, b) => a.getTime() - b.getTime());
      expect(guildWarNext(now, bg.utcOffset, gw.time!, gw.days!)!.getTime()).toBe(nexts[0].getTime());
    }
  });

  it("/times payloads from live data are valid for every option", () => {
    const now = new Date();
    const items = buildTimes(data.patch, now);
    for (const c of [{ value: "" }, ...timesChoices(items, "")]) {
      const rep = runCommand("times", { what: c.value }, data, now);
      for (const m of rep.messages) expect(validateMessage(m), c.value).toEqual([]);
      expect(rep.messages[0].embeds, c.value).toBeDefined();
    }
  });

  it("parseServerDate port is identical on every date string in the live data", () => {
    const off = serverOffset(data.patch);
    const strs = [data.patch.season?.endDate, ...(data.patch.season?.milestones || []).flatMap((m) => [m.at, m.date]), ...(data.patch.comingSoon || []).map((c) => c.date)].filter(Boolean) as string[];
    for (const s of strs) expect(parseServerDate(s, off)?.getTime() ?? null, s).toBe(site.parseServerDate(s, off)?.getTime() ?? null);
  });
});
