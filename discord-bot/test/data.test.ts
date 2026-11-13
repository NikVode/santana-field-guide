import { beforeEach, describe, expect, it } from "vitest";
import { _clearMemoryCache, GuideUnavailable, loadSiteData, RETRY_AFTER_MS, TTL_MS } from "../src/data";
import { handleInteraction } from "../src/index";
import { ctx, FakeCache } from "./helpers";

const SITE = "https://guide.example/";
const ENC = { encounters: [{ id: "t", name: "Test Trial", type: "sword-trial", level: 1, players: 5, bosses: [{ id: "b", name: "Bob" }] }] };
const PATCH = { resets: { utcOffset: 8 } };

function fakeFetch(mode: { fail: boolean; calls: number }) {
  return (async (url: string) => {
    mode.calls++;
    if (mode.fail) throw new Error("network down");
    return new Response(JSON.stringify(String(url).endsWith("encounters.json") ? ENC : PATCH), { status: 200 });
  }) as unknown as typeof fetch;
}

beforeEach(() => _clearMemoryCache());

describe("site data cache", () => {
  it("fetches once, then serves from cache within 10 minutes", async () => {
    const m = { fail: false, calls: 0 }, cache = new FakeCache() as unknown as Cache;
    let t = 1_000_000;
    const deps = { fetchFn: fakeFetch(m), cache, now: () => t };
    await loadSiteData(SITE, deps);
    expect(m.calls).toBe(2);
    t += TTL_MS - 1000;
    await loadSiteData(SITE, deps);
    expect(m.calls).toBe(2);
    t += 2000;
    await loadSiteData(SITE, deps);
    expect(m.calls).toBe(4);
  });
  it("falls back to the cached copy (from the Cache API) when the fetch fails", async () => {
    const m = { fail: false, calls: 0 }, cache = new FakeCache() as unknown as Cache;
    let t = 1_000_000;
    await loadSiteData(SITE, { fetchFn: fakeFetch(m), cache, now: () => t });
    _clearMemoryCache();            // new isolate: only the Cache API copy is left
    m.fail = true; t += TTL_MS * 50; // long expired
    const d = await loadSiteData(SITE, { fetchFn: fakeFetch(m), cache, now: () => t });
    expect(d.stale).toBe(true);
    expect(d.encounters[0].name).toBe("Test Trial");
  });
  it("after a failure, serves the saved copy without re-trying the site for a minute", async () => {
    const m = { fail: false, calls: 0 }, cache = new FakeCache() as unknown as Cache;
    let t = 0;
    const deps = { fetchFn: fakeFetch(m), cache, now: () => t };
    await loadSiteData(SITE, deps);
    m.fail = true; t += TTL_MS + 1;
    expect((await loadSiteData(SITE, deps)).stale).toBe(true);
    const callsAfterFailure = m.calls;
    t += RETRY_AFTER_MS - 1000;
    expect((await loadSiteData(SITE, deps)).stale).toBe(true);
    expect(m.calls).toBe(callsAfterFailure); // no new fetch during the back-off
    m.fail = false; t += 2000;
    expect((await loadSiteData(SITE, deps)).stale).toBe(false);
    expect(m.calls).toBeGreaterThan(callsAfterFailure);
  });
  it("prefers a fresher Cache API copy over this isolate's old in-memory copy", async () => {
    const m = { fail: false, calls: 0 }, cache = new FakeCache() as unknown as Cache;
    let t = 0;
    await loadSiteData(SITE, { fetchFn: fakeFetch(m), cache: null, now: () => t }); // memory only, at t=0
    t = TTL_MS * 3;
    // another isolate saved a fresh copy just now
    for (const f of ["encounters", "patch"]) {
      const body = f === "encounters" ? { encounters: [{ ...ENC.encounters[0], name: "Fresh Trial" }] } : PATCH;
      await (cache as unknown as FakeCache).put(`${SITE}content/${f}.json`, new Response(JSON.stringify(body), { headers: { "x-fetched-at": String(t - 1000) } }));
    }
    m.fail = true;
    const d = await loadSiteData(SITE, { fetchFn: fakeFetch(m), cache, now: () => t });
    expect(d.stale).toBe(false);
    expect(d.encounters[0].name).toBe("Fresh Trial");
  });
  it("returns the same encounters array for the same cached copy (lets callers memoize)", async () => {
    const m = { fail: false, calls: 0 };
    const deps = { fetchFn: fakeFetch(m), cache: null, now: () => 5 };
    expect((await loadSiteData(SITE, deps)).encounters).toBe((await loadSiteData(SITE, deps)).encounters);
  });
  it("throws GuideUnavailable when nothing is cached", async () => {
    const m = { fail: true, calls: 0 };
    await expect(loadSiteData(SITE, { fetchFn: fakeFetch(m), cache: new FakeCache() as unknown as Cache })).rejects.toBeInstanceOf(GuideUnavailable);
  });
  it("a command with no data replies with the friendly 'unavailable' message, privately", async () => {
    const env = { DISCORD_PUBLIC_KEY: "", DISCORD_APPLICATION_ID: "1", SITE_URL: "https://unreachable.invalid/" };
    const res = await handleInteraction({ type: 2, token: "x", data: { name: "boss", options: [{ name: "name", type: 3, value: "x" }] } }, env, ctx());
    const body = (await res.json()) as { type: number; data: { content: string; flags: number } };
    expect(body.type).toBe(4);
    expect(body.data.content).toMatch(/unavailable right now/);
    expect(body.data.flags).toBe(64);
  });
  it("autocomplete with no data returns an empty list instead of failing", async () => {
    const env = { DISCORD_PUBLIC_KEY: "", DISCORD_APPLICATION_ID: "1", SITE_URL: "https://unreachable.invalid/" };
    const res = await handleInteraction({ type: 4, token: "x", data: { name: "boss", options: [{ name: "name", type: 3, value: "lo", focused: true }] } }, env, ctx());
    expect(await res.json()).toEqual({ type: 8, data: { choices: [] } });
  });
  it("stale data is flagged in the reply", async () => {
    const m = { fail: false, calls: 0 }, cache = new FakeCache() as unknown as Cache;
    let t = 0;
    await loadSiteData(SITE, { fetchFn: fakeFetch(m), cache, now: () => t });
    m.fail = true; t += TTL_MS * 2;
    const d = await loadSiteData(SITE, { fetchFn: fakeFetch(m), cache, now: () => t });
    const { runCommand } = await import("../src/commands");
    expect(runCommand("boss", { name: "bob" }, d).messages[0].content).toMatch(/last saved copy/);
  });
});
