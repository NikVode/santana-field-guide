import { beforeAll, describe, expect, it } from "vitest";
import { runCommand } from "../src/commands";
import { buildEmbed, embedLength, L, LIMITS, validateMessage } from "../src/embed";
import { bossEmbed } from "../src/render";
import type { Encounter, SiteData } from "../src/types";
import { liveData } from "./live";

let data: SiteData;
beforeAll(async () => { data = await liveData(); });

const check = (label: string, rep: ReturnType<typeof runCommand>) => {
  expect(rep.messages.length, label).toBeGreaterThan(0);
  rep.messages.forEach((m, i) => expect(validateMessage(m), `${label} message ${i + 1}`).toEqual([]));
};

describe("every encounter and boss in the live data renders within Discord limits", () => {
  it("covers the whole site", () => { expect(data.encounters.length).toBeGreaterThan(10); });
  it("/boss for every boss, and for every encounter", () => {
    for (const e of data.encounters) {
      check(`/boss ${e.id}`, runCommand("boss", { name: e.id }, data));
      for (const b of e.bosses) {
        const rep = runCommand("boss", { name: `${e.id}/${b.id}` }, data);
        check(`/boss ${e.id}/${b.id}`, rep);
        const em = rep.messages[0].embeds![0];
        expect(em.title).toContain(b.name);
        expect(em.title).toContain(e.name);
        expect(em.url).toBe(`${data.siteUrl}encounter.html?id=${e.id}#boss-${b.id}`);
        expect(em.footer?.text).toBe("Santana Field Guide - unofficial, fan-made");
      }
    }
  });
  it("/raid, /roles, /talents for every encounter and boss", () => {
    for (const e of data.encounters) {
      const raid = runCommand("raid", { name: e.id }, data);
      check(`/raid ${e.id}`, raid);
      expect(raid.ephemeral).toBe(false);
      expect(raid.messages.flatMap((m) => m.embeds || []).length).toBe(2 + e.bosses.length);
      for (const key of [e.id, ...e.bosses.map((b) => `${e.id}/${b.id}`)]) {
        check(`/roles ${key}`, runCommand("roles", { name: key }, data));
        check(`/talents ${key}`, runCommand("talents", { name: key }, data));
      }
    }
  });
  it("/boss is private by default and public with share:true", () => {
    expect(runCommand("boss", { name: "lodestar" }, data).ephemeral).toBe(true);
    expect(runCommand("boss", { name: "lodestar", share: true }, data).ephemeral).toBe(false);
  });
});

describe("trimming", () => {
  it("drops least important lines first and links to the site", () => {
    const long = "x".repeat(400);
    const e: Encounter = { id: "big", name: "Huge Trial", type: "heros-realm", level: 100, players: 10, coverage: "full",
      roles: [{ role: "Tank", count: 1, duties: { b: long } }],
      bosses: [{ id: "b", name: "Enormous Boss", summary: long,
        mechanics: Array.from({ length: 30 }, (_, i) => ({ name: `Mech ${i + 1}`, trigger: long, response: long, note: long })),
        talents: Array.from({ length: 12 }, (_, i) => ({ code: `${i}`, condition: long })) }] };
    const em = bossEmbed("https://site/", e, e.bosses[0]);
    expect(validateMessage({ embeds: [em] })).toEqual([]);
    expect(em.description).toContain("Full details on the site](https://site/encounter.html?id=big#boss-b)");
    expect(em.description).toContain("**1. Mech 1**");       // essentials kept, in order
    expect(em.description).not.toContain("_" + long + "_");   // mechanic notes (least important) dropped
  });
  it("never exceeds limits even with absurd input", () => {
    const em = buildEmbed({ title: "t".repeat(500), desc: [L("d".repeat(9000), 1)], moreUrl: "https://s/",
      fields: Array.from({ length: 40 }, (_, i) => ({ name: "n".repeat(300), lines: [L("v".repeat(3000), 1)] })) });
    expect(validateMessage({ embeds: [em] })).toEqual([]);
    expect(embedLength(em)).toBeLessThanOrEqual(LIMITS.embedTotal);
  });
});

describe("role duty shortening on boss cards", () => {
  it("doesn't cut at abbreviations like e.g. or vs.", () => {
    const e: Encounter = { id: "x", name: "X", type: "sword-trial", level: 1, players: 5,
      roles: [{ role: "Tank", duties: { b: "Stand left, e.g. near the pillar, and taunt vs. adds. Then move." } }],
      bosses: [{ id: "b", name: "B", mechanics: [{ name: "M", trigger: "t", response: "r" }] }] };
    const roles = bossEmbed("https://s/", e, e.bosses[0]).fields!.find((f) => f.name === "Roles to assign")!;
    expect(roles.value).toBe("**Tank**: Stand left, e.g. near the pillar, and taunt vs. adds.");
  });
});
