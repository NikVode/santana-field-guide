// Cloudflare Worker: Discord HTTP interactions endpoint. No gateway, no database.

import { EPHEMERAL, isEphemeral, runAutocomplete, runCommand, type Reply } from "./commands";
import { GuideUnavailable, loadSiteData, UNAVAILABLE_TEXT, type DataDeps } from "./data";
import { verifyDiscordRequest } from "./verify";

export interface Env { DISCORD_PUBLIC_KEY: string; DISCORD_APPLICATION_ID: string; SITE_URL: string }

const T = { PING: 1, COMMAND: 2, AUTOCOMPLETE: 4 } as const;
const R = { PONG: 1, MESSAGE: 4, DEFERRED: 5, CHOICES: 8 } as const;
const API = "https://discord.com/api/v10";
const RESPOND_WITHIN_MS = 2200; // Discord wants an answer within 3 s; defer if the data is slow
const NO_PINGS = { parse: [] as string[] };

const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

interface Option { name: string; type: number; value?: string | number | boolean; focused?: boolean; options?: Option[] }
interface Interaction { type: number; token: string; data?: { name: string; options?: Option[] } }

const flatOptions = (opts: Option[] = []): Option[] => opts.flatMap((o) => (o.options ? flatOptions(o.options) : [o]));
const timeout = <T>(ms: number, v: T) => new Promise<T>((r) => setTimeout(() => r(v), ms));

export function dataDeps(ctx?: ExecutionContext): DataDeps {
  const cache = typeof caches !== "undefined" ? (caches as unknown as { default: Cache }).default : null;
  return { cache, waitUntil: ctx ? (p) => ctx.waitUntil(p) : undefined };
}

async function buildReply(env: Env, ctx: ExecutionContext, cmd: string, opts: Record<string, string | boolean | number | undefined>): Promise<Reply> {
  try {
    const data = await loadSiteData(env.SITE_URL, dataDeps(ctx));
    return runCommand(cmd, opts, data);
  } catch (err) {
    if (!(err instanceof GuideUnavailable)) console.error(err);
    return { messages: [{ content: UNAVAILABLE_TEXT(env.SITE_URL) }], ephemeral: true };
  }
}

async function sendFollowups(env: Env, token: string, reply: Reply, fromIndex: number, editOriginal: boolean) {
  const flags = reply.ephemeral ? EPHEMERAL : 0;
  for (let i = editOriginal ? 0 : fromIndex; i < reply.messages.length; i++) {
    const first = editOriginal && i === 0;
    const url = `${API}/webhooks/${env.DISCORD_APPLICATION_ID}/${token}${first ? "/messages/@original" : ""}`;
    const res = await fetch(url, {
      method: first ? "PATCH" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ ...reply.messages[i], allowed_mentions: NO_PINGS, ...(first ? {} : { flags }) }),
    });
    if (!res.ok) console.error("Discord webhook failed", res.status, await res.text());
  }
}

export async function handleInteraction(i: Interaction, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (i.type === T.PING) return json({ type: R.PONG });

  const cmd = i.data?.name || "";
  const options = flatOptions(i.data?.options);

  if (i.type === T.AUTOCOMPLETE) {
    const focused = options.find((o) => o.focused) || { name: "", value: "" };
    const work = loadSiteData(env.SITE_URL, dataDeps(ctx))
      .then((d) => runAutocomplete(cmd, { name: focused.name, value: String(focused.value ?? "") }, d))
      .catch(() => []);
    const choices = await Promise.race([work, timeout(2500, [] as { name: string; value: string }[])]);
    return json({ type: R.CHOICES, data: { choices } });
  }

  if (i.type === T.COMMAND) {
    const opts = Object.fromEntries(options.map((o) => [o.name, o.value]));
    const ephemeral = isEphemeral(cmd, opts);
    const work = buildReply(env, ctx, cmd, opts);
    const reply = await Promise.race([work, timeout(RESPOND_WITHIN_MS, null)]);
    if (!reply) {
      // Too slow: acknowledge now, then edit the reply (and add any extra messages) when ready.
      ctx.waitUntil(work.then((r) => sendFollowups(env, i.token, { ...r, ephemeral }, 0, true)));
      return json({ type: R.DEFERRED, data: { flags: ephemeral ? EPHEMERAL : 0 } });
    }
    if (reply.messages.length > 1) ctx.waitUntil(sendFollowups(env, i.token, reply, 1, false));
    return json({ type: R.MESSAGE, data: { ...reply.messages[0], allowed_mentions: NO_PINGS, flags: reply.ephemeral ? EPHEMERAL : 0 } });
  }

  return json({ error: "unsupported interaction type" }, 400);
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (request.method !== "POST") return new Response("Santana Field Guide bot: Discord interactions endpoint.", { status: 200 });
    const body = await request.text();
    const ok = await verifyDiscordRequest(env.DISCORD_PUBLIC_KEY,
      request.headers.get("X-Signature-Ed25519"), request.headers.get("X-Signature-Timestamp"), body);
    if (!ok) return new Response("invalid request signature", { status: 401 });
    let interaction: Interaction;
    try { interaction = JSON.parse(body); } catch { return new Response("bad json", { status: 400 }); }
    return handleInteraction(interaction, env, ctx);
  },
};
