import { beforeAll, describe, expect, it } from "vitest";
import aliasFile from "../aliases.json";
import { autocomplete, buildIndex, resolve, type Index } from "../src/match";
import { runCommand } from "../src/commands";
import type { SiteData } from "../src/types";
import { liveData } from "./live";

let data: SiteData, index: Index;
beforeAll(async () => { data = await liveData(); index = buildIndex(data.encounters); });

const top = (q: string, prefer: "boss" | "encounter" = "boss", n = 3) => autocomplete(index, q, prefer).slice(0, n).map((c) => c.value);

describe("names Discord sends back", () => {
  it("accepts the bot's own choice labels, not just ids", () => {
    for (const e of data.encounters) {
      const label = autocomplete(index, e.name, "encounter").find((c) => c.value === e.id)!.name;
      const r = resolve(index, label, "encounter");
      expect(r.ok && r.target.enc.id, label).toBe(e.id);
    }
    const r = resolve(index, "Landscourge Thunder · Sword Trial Lv 91 · 2 bosses", "encounter");
    expect(r.ok && r.target.key).toBe("landscourge-thunder");
    const b = resolve(index, "Lodestar (Swordmaster) · Compass & Chime (ST Lv 100)", "boss");
    expect(b.ok && b.target.key).toBe("compass-chime/lodestar");
  });
});

describe("autocomplete (live data)", () => {
  it("returns at most 25 choices, each within Discord's 100-char limits", () => {
    for (const q of ["", "a", "e", "the", "lv", "s"]) {
      const cs = autocomplete(index, q, "boss");
      expect(cs.length).toBeLessThanOrEqual(25);
      for (const c of cs) { expect(c.name.length).toBeLessThanOrEqual(100); expect(c.value.length).toBeLessThanOrEqual(100); }
    }
  });
  it("empty query lists something useful for each command", () => {
    expect(autocomplete(index, "", "boss").length).toBe(25);
    expect(autocomplete(index, "", "encounter").length).toBe(data.encounters.length);
  });
  it("matches prefixes and substrings, case-insensitively", () => {
    expect(top("lode")[0]).toBe("compass-chime/lodestar");
    expect(top("LODESTAR")[0]).toBe("compass-chime/lodestar");
    expect(top("toller")[0]).toBe("compass-chime/bell-toller");
    expect(top("compass", "encounter")[0]).toBe("compass-chime");
    expect(top("halc")[0]).toBe("liminal-ascension/halcyon");
    expect(top("chuyu")[0]).toBe("liminal-ascension/bai-chuyu");
    expect(top("zheng e")[0]).toBe("snowfalls-reckoning/zheng-e");
    expect(top("zhenge")[0]).toBe("snowfalls-reckoning/zheng-e");
    expect(top("ironheart")[0]).toBe("segmented-puppets/ironheart-centipede");
  });
  it("matches nicknames from aliases.json and generated level shortcuts", () => {
    expect(top("veiled lady")[0]).toBe("liminal-ascension/bai-chuyu");
    expect(top("scorpion")[0]).toBe("segmented-puppets/ironheart-centipede");
    expect(top("centipede")[0]).toBe("segmented-puppets/ironheart-centipede");
    expect(top("puppets", "boss", 2).sort()).toEqual(["segmented-puppets", "segmented-puppets/ci-and-cuo"]);
    expect(top("lv100 hr", "encounter")[0]).toBe("liminal-ascension");
    expect(top("lv100 st", "encounter")[0]).toBe("compass-chime");
    expect(top("hr96", "encounter").sort().slice(0, 2)).toEqual(["carnival-voyage", "snowfalls-reckoning"]);
  });
  it("every alias in aliases.json points at something on the live site", () => {
    const missing: string[] = [];
    for (const [nick, to] of Object.entries((aliasFile as { aliases: Record<string, string | string[]> }).aliases))
      for (const k of Array.isArray(to) ? to : [to]) if (!index.byKey.has(k)) missing.push(`${nick} -> ${k}`);
    expect(missing).toEqual([]);
  });
});

describe("free-typed names", () => {
  it("resolves unique partial names", () => {
    const r = resolve(index, "compass", "encounter");
    expect(r.ok && r.target.key).toBe("compass-chime");
    const b = resolve(index, "lodestar", "boss");
    expect(b.ok && b.target.key).toBe("compass-chime/lodestar");
    const v = resolve(index, "Veiled Lady", "boss");
    expect(v.ok && v.target.key).toBe("liminal-ascension/bai-chuyu");
  });
  it("suggests the 3 closest names for a typo or nonsense", () => {
    const r = resolve(index, "lodstar", "boss");
    expect(r.ok).toBe(false);
    if (!r.ok) { expect(r.suggestions).toHaveLength(3); expect(r.suggestions[0].target.key).toBe("compass-chime/lodestar"); }
    const x = resolve(index, "qqqqzzzz", "boss");
    expect(x.ok).toBe(false);
    if (!x.ok) expect(x.suggestions).toHaveLength(3);
  });
  it("ambiguous names across raids get suggestions, not a guess", () => {
    const r = resolve(index, "twin lions", "boss");
    expect(r.ok).toBe(false);
  });
  it("an unmatched /boss replies privately with 'Did you mean'", () => {
    const rep = runCommand("boss", { name: "bel toler", share: true }, data);
    expect(rep.ephemeral).toBe(true);
    expect(rep.messages[0].content).toMatch(/Did you mean/);
    expect(rep.messages[0].content).toMatch(/Bell Toller/);
  });
});
