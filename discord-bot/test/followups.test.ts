import { afterEach, describe, expect, it, vi } from "vitest";
import { sendFollowups } from "../src/index";
import type { Reply } from "../src/commands";

const env = { DISCORD_PUBLIC_KEY: "", DISCORD_APPLICATION_ID: "app", SITE_URL: "https://s/" };
const reply = (n: number, ephemeral = false): Reply => ({ ephemeral, messages: Array.from({ length: n }, (_, i) => ({ content: `m${i + 1}` })) });

function stubFetch(handler: (url: string, init: RequestInit, n: number) => Response | Promise<Response>) {
  const calls: { url: string; method: string; body: Record<string, unknown> | null }[] = [];
  vi.stubGlobal("fetch", async (url: string, init: RequestInit) => {
    calls.push({ url, method: init.method || "GET", body: init.body ? JSON.parse(String(init.body)) : null });
    return handler(url, init, calls.length);
  });
  return calls;
}
afterEach(() => vi.unstubAllGlobals());

describe("follow-up delivery", () => {
  it("retries while Discord hasn't registered the first response yet (404), then delivers in order", async () => {
    const calls = stubFetch((_u, _i, n) => (n === 1 ? new Response("Unknown Webhook", { status: 404 }) : new Response("{}", { status: 200 })));
    await sendFollowups(env, "tok", reply(3), null);
    const posts = calls.filter((c) => c.method === "POST").map((c) => c.body!.content);
    expect(posts).toEqual(["m2", "m2", "m3"]); // first m2 attempt got 404, retried
    expect(calls.every((c) => c.url.startsWith("https://discord.com/api/v10/webhooks/app/tok"))).toBe(true);
  });
  it("keeps going when one message fails for good", async () => {
    const calls = stubFetch((_u, init) => {
      const b = JSON.parse(String(init.body));
      return b.content === "m2" ? new Response("bad", { status: 400 }) : new Response("{}", { status: 200 });
    });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendFollowups(env, "tok", reply(3), null);
    expect(calls.map((c) => c.body!.content)).toEqual(["m2", "m3"]);
    expect(err.mock.calls.some((c) => String(c[0]).includes("follow-up message 2 of 3"))).toBe(true);
    err.mockRestore();
  });
  it("survives network exceptions and retries", async () => {
    let first = true;
    const calls = stubFetch(() => { if (first) { first = false; throw new Error("socket hang up"); } return new Response("{}", { status: 200 }); });
    const err = vi.spyOn(console, "error").mockImplementation(() => {});
    await sendFollowups(env, "tok", reply(2), null);
    expect(calls.map((c) => c.body!.content)).toEqual(["m2", "m2"]);
    err.mockRestore();
  });
  it("deferred: fills in the original, then posts the rest", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }));
    await sendFollowups(env, "tok", reply(2), false);
    expect(calls.map((c) => [c.method, c.url.endsWith("/messages/@original")])).toEqual([["PATCH", true], ["POST", false]]);
  });
  it("deferred in public but the answer must be private: deletes the placeholder and replies privately", async () => {
    const calls = stubFetch(() => new Response("{}", { status: 200 }));
    await sendFollowups(env, "tok", reply(1, true), false);
    expect(calls[0].method).toBe("DELETE");
    expect(calls[1]).toMatchObject({ method: "POST", body: { content: "m1", flags: 64 } });
  });
});
