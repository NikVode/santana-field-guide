import { describe, expect, it } from "vitest";
import { cleanEncounters, cleanNote, scrub } from "../src/clean";
import type { Encounter } from "../src/types";

describe("scrub", () => {
  it("removes bracketed asides that cite a source or say in-game", () => {
    expect(scrub("Each reward claim costs 60 Stamina (Game8).")).toBe("Each reward claim costs 60 Stamina.");
    expect(scrub("Talent 1-1 is easier if you enter as tank (Where Guilds Meet).")).toBe("Talent 1-1 is easier if you enter as tank.");
    expect(scrub("Spread out (in-game callout).")).toBe("Spread out.");
    expect(scrub("Recommended 6 DPS, 3 healers, 1 tank (in-game).")).toBe("Recommended 6 DPS, 3 healers, 1 tank.");
    expect(scrub("Weekly reward limit; first clears pay outside it (SenseOS). Re-runs to help guildmates give no extra rewards (Game8, WWM Handbook)."))
      .toBe("Weekly reward limit; first clears pay outside it. Re-runs to help guildmates give no extra rewards.");
    expect(scrub("The tethered pair spread so the vine crosses the blast's path (Game8 and the in-game callout), or a third player redirects an ice blade."))
      .toBe("The tethered pair spread so the vine crosses the blast's path, or a third player redirects an ice blade.");
    expect(scrub("Some groups instead stack the whole team on one spot (allthings.how / Points N Pixels). Uncut vine = both die."))
      .toBe("Some groups instead stack the whole team on one spot. Uncut vine = both die.");
  });
  it("keeps asides that are gameplay", () => {
    const s = "Jump onto your own flagpole as the circle appears (one per pole). Drop the spikes (not stacked, not at opposite ends).";
    expect(scrub(s)).toBe(s);
    expect(scrub("Turn into a wolf (auto-run, steer only) and dodge.")).toBe("Turn into a wolf (auto-run, steer only) and dodge.");
  });
  it("removes sentences that only cite a source", () => {
    expect(scrub("Send it in. allthings.how's run sent orange notes. Kill the Five-Note Chimes within 30 seconds."))
      .toBe("Send it in. Kill the Five-Note Chimes within 30 seconds.");
    expect(scrub("Fextralife agrees.")).toBe("");
  });
  it("removes Check in game / Confirm in game tags", () => {
    expect(scrub("Normal and Supreme tiers may share one weekly claim (Where Winds Meet Handbook). Check in game."))
      .toBe("Normal and Supreme tiers may share one weekly claim.");
    expect(scrub("Feed the flames. Confirm in game.")).toBe("Feed the flames.");
  });
  it("rewrites 'Sources differ: … Either way, …'", () => {
    expect(scrub("Sources differ: Game8 says drop the spikes fairly close together (not stacked, not at opposite ends); the in-game callout just says spread out. Either way, don't stack them."))
      .toBe("Drop the spikes fairly close together (not stacked, not at opposite ends). Don't stack them.");
  });
  it("strips a leading source label and keeps the tip", () => {
    expect(scrub("Game8: in wolf form, touching Blood Orbs heals the team.")).toBe("In wolf form, touching Blood Orbs heals the team.");
    expect(scrub("Three players play. The in-game callout says play quickly to break the shield.")).toBe("Three players play. Play quickly to break the shield.");
  });
  it("leaves plain text and ids untouched", () => {
    for (const s of ["bell-toller", "full", "Stand left, e.g. near the pillar, and taunt vs. adds. Then move.", ""]) expect(scrub(s)).toBe(s);
  });
});

describe("cleanNote", () => {
  it("drops notes that are only about sources or verification", () => {
    for (const n of [
      "Game8 gives the same condition.",
      "The talent text says 'Basic Arithmetic'; the in-game callout says 'Basic Algorithm'. Same mechanism.",
      "The in-game name. Game8 calls it Relentless Charge; Where Guilds Meet calls it Brutal Charge.",
      "Game8 calls it Cold Energy; allthings.how calls it Cold Invasion.",
      "Supreme differences are not documented; same mechanics assumed.",
      "'Earth Blast' is the in-game name for his charge.",
      "The in-game objective names Magnetic Storm and Vertical Swordcut. No guide we read describes those two attacks yet.",
      "moved up from Nov 14 in the Oct 29 notes",
      "Fextralife agrees.",
      "Confirmed by the official patch notes.",
    ]) expect(cleanNote(n), n).toBe("");
  });
  it("keeps gameplay tips, including in-game callouts like the enrage line", () => {
    expect(cleanNote('The in-game callout for the enrage is "I\'m getting angry!".')).toBe('The in-game callout for the enrage is "I\'m getting angry!".');
    expect(cleanNote("Agree the Cloudburst Healing rotation before the pull: its cooldown is longer than its duration."))
      .toBe("Agree the Cloudburst Healing rotation before the pull: its cooldown is longer than its duration.");
    expect(cleanNote("Where Guilds Meet: the morale gauge also triggers new mechanics at 1/3 and 2/3."))
      .toBe("The morale gauge also triggers new mechanics at 1/3 and 2/3.");
    expect(cleanNote("Carry run. Mechanics from Game8's Yama's Seal sections; cheat-sheet depth.")).toBe("Carry run.");
  });
  it("strips a leading 'Guild notes add:'", () => {
    expect(cleanNote("Guild notes add: stand bells up and stand next to them so each throw smashes one."))
      .toBe("Stand bells up and stand next to them so each throw smashes one.");
  });
  it("cleans the site's reset and Guild War notes down to the useful part", () => {
    expect(cleanNote("Daily and weekly resets are 05:00 UTC+8 (weekly on Monday). Confirmed by the official patch notes, allthings.how and mein-mmo (22:00 German winter time / 4 PM EST). The Battle Pass weekly EXP cap also resets Monday 05:00 UTC+8."))
      .toBe("Daily and weekly resets are 05:00 UTC+8 (weekly on Monday). The Battle Pass weekly EXP cap also resets Monday 05:00 UTC+8.");
    expect(cleanNote("Official: Sat & Sun at 20:30 on each battlegroup's own clock (Apr 30, 2026 notice). The Oct 29 notes confirm it does NOT follow daylight saving, so in winter US East starts at 19:30 EST and Europe at 19:30 CET. Check the in-game schedule panel."))
      .toBe("Sat & Sun at 20:30 on each battlegroup's own clock. It does NOT follow daylight saving, so in winter US East starts at 19:30 EST and Europe at 19:30 CET.");
  });
});

describe("cleanEncounters", () => {
  const enc: Encounter = {
    id: "x", name: "X (Game8)", type: "sword-trial", level: 1, players: 5,
    requirements: { notes: ["Game8 gives the same condition.", "Each claim costs 60 Stamina (Game8)."], mastery: [{ value: "1,000", source: "Game8" }] },
    bosses: [{ id: "b", name: "B", worldBossNote: "Fextralife agrees.", verifyNote: "Game8 only",
      mechanics: [{ name: "M", trigger: "t", response: "Dodge it (in-game callout).", note: "Game8 calls it Cold Energy." }],
      talents: [{ code: "1-1", condition: "No one dies", notes: "Game8 gives the same condition." }] }],
  };
  it("returns a cleaned deep copy and leaves the original alone", () => {
    const before = JSON.stringify(enc);
    const [c] = cleanEncounters([enc]);
    expect(JSON.stringify(enc)).toBe(before);
    expect(c.name).toBe("X");
    expect(c.requirements!.notes).toEqual(["Each claim costs 60 Stamina."]);
    expect(c.requirements!.mastery![0].source).toBe("Game8"); // sources are skipped, and the bot never shows them
    expect(c.bosses[0].verifyNote).toBe("Game8 only");          // skipped too
    expect(c.bosses[0].worldBossNote).toBeUndefined();
    expect(c.bosses[0].mechanics![0]).toEqual({ name: "M", trigger: "t", response: "Dodge it." });
    expect(c.bosses[0].talents![0].notes).toBeUndefined();
    expect(c.id).toBe("x");
  });
});
