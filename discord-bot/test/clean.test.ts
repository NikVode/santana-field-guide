import { describe, expect, it } from "vitest";
import { cleanNote, scrub } from "../src/clean";

describe("scrubbing source citations", () => {
  it("removes source asides but keeps the instruction", () => {
    expect(scrub("Cut the tether (Game8 and the in-game callout), or redirect an ice blade. Uncut vine = both die."))
      .toBe("Cut the tether, or redirect an ice blade. Uncut vine = both die.");
    expect(scrub("Recommended 6 DPS, 3 healers, 1 tank (in-game). At least two healers (Game8, Where Guilds Meet)."))
      .toBe("Recommended 6 DPS, 3 healers, 1 tank. At least two healers.");
    expect(scrub("Suggested split (Where Guilds Meet)")).toBe("Suggested split");
  });
  it("drops sentences that only cite a source", () => {
    expect(scrub("Send it in. allthings.how's run sent orange notes. Kill the chimes in 30 seconds."))
      .toBe("Send it in. Kill the chimes in 30 seconds.");
    expect(scrub("Sources differ: Game8 says drop the spikes close together; the in-game callout just says spread out. Either way, don't stack them."))
      .toBe("Drop the spikes close together. Don't stack them.");
  });
  it("leaves ordinary text alone", () => {
    const t = "When a ring appears → Get into the ring to share the damage.";
    expect(scrub(t)).toBe(t);
  });
  it("drops notes that are only about sources or verification, keeps tips", () => {
    expect(cleanNote("Game8 gives the same condition.")).toBe("");
    expect(cleanNote("The talent text says 'Basic Arithmetic'; the in-game callout says 'Basic Algorithm'. Same mechanism.")).toBe("");
    expect(cleanNote("moved up from Nov 14 in the Oct 29 notes")).toBe("");
    expect(cleanNote("Spam deflect; one miss voids it.")).toBe("Spam deflect; one miss voids it.");
    expect(cleanNote("Guild notes add: stand bells up and stand next to them.")).toBe("Stand bells up and stand next to them.");
  });
});
