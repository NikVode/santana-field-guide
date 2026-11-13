import { describe, expect, it } from "vitest";
import worker from "../src/index";
import { verifyDiscordRequest } from "../src/verify";
import { ctx, keypair } from "./helpers";

const req = (body: string, headers: Record<string, string>) =>
  new Request("https://bot.example/", { method: "POST", body, headers: { "content-type": "application/json", ...headers } });

describe("signature verification", async () => {
  const k = await keypair();
  const other = await keypair();
  const env = { DISCORD_PUBLIC_KEY: k.pub, DISCORD_APPLICATION_ID: "1", SITE_URL: "https://example.invalid/" };
  const body = JSON.stringify({ type: 1 });
  const ts = String(Math.floor(Date.now() / 1000));

  it("accepts a valid signature", async () => {
    expect(await verifyDiscordRequest(k.pub, await k.sign(ts, body), ts, body)).toBe(true);
  });
  it("rejects a signature from another key", async () => {
    expect(await verifyDiscordRequest(k.pub, await other.sign(ts, body), ts, body)).toBe(false);
  });
  it("rejects a tampered body or timestamp", async () => {
    const sig = await k.sign(ts, body);
    expect(await verifyDiscordRequest(k.pub, sig, ts, body + " ")).toBe(false);
    expect(await verifyDiscordRequest(k.pub, sig, String(+ts + 1), body)).toBe(false);
  });
  it("rejects missing or malformed signatures", async () => {
    expect(await verifyDiscordRequest(k.pub, null, ts, body)).toBe(false);
    expect(await verifyDiscordRequest(k.pub, await k.sign(ts, body), null, body)).toBe(false);
    expect(await verifyDiscordRequest(k.pub, "zz", ts, body)).toBe(false);
    expect(await verifyDiscordRequest(k.pub, "ab".repeat(63), ts, body)).toBe(false);
    expect(await verifyDiscordRequest("not-a-key", await k.sign(ts, body), ts, body)).toBe(false);
  });

  it("worker returns 401 for bad or missing signatures", async () => {
    const r1 = await worker.fetch(req(body, {}), env, ctx());
    expect(r1.status).toBe(401);
    const r2 = await worker.fetch(req(body, { "X-Signature-Ed25519": await other.sign(ts, body), "X-Signature-Timestamp": ts }), env, ctx());
    expect(r2.status).toBe(401);
    const r3 = await worker.fetch(req(body, { "X-Signature-Ed25519": "00".repeat(64), "X-Signature-Timestamp": ts }), env, ctx());
    expect(r3.status).toBe(401);
  });

  it("answers a signed PING with PONG", async () => {
    const r = await worker.fetch(req(body, { "X-Signature-Ed25519": await k.sign(ts, body), "X-Signature-Timestamp": ts }), env, ctx());
    expect(r.status).toBe(200);
    expect(await r.json()).toEqual({ type: 1 });
  });
});
