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

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

/** Send to the interaction webhook, retrying while Discord hasn't registered our first response yet. */
async function webhook(env: Env, token: string, path: string, method: string, body?: unknown): Promise<boolean> {
  const url = `${API}/webhooks/${env.DISCORD_APPLICATION_ID}/${token}${path}`;
  for (let attempt = 0; attempt < 5; attempt++) {
    try {
      const res = await fetch(url, { method, headers: { "content-type": "application/json" }, body: body === undefined ? undefined : JSON.stringify(body) });
      if (res.ok) return true;
      const text = await res.text();
      // 404 (Unknown Webhook / Interaction) right after responding means Discord isn't ready yet; 429 is a rate limit.
      if (res.status !== 404 && res.status !== 429 && res.status < 500) { console.error(`Discord webhook ${method} ${path || "/"} failed`, res.status, text); return false; }
    } catch (err) {
      console.error(`Discord webhook ${method} ${path || "/"} attempt ${attempt + 1} threw`, err);
    }
    await sleep(400 * (attempt + 1));
  }
  console.error(`Discord webhook ${method} ${path || "/"} gave up after retries`);
  return false;
}

/**
 * Deliver messages after the interaction response. `deferredEphemeral` is set when we deferred
 * (null when the first message already went out as the response). Each message is tried on its
 * own, so one failure doesn't stop the rest.
 */
export async function sendFollowups(env: Env, token: string, reply: Reply, deferredEphemeral: boolean | null) {
  await sleep(250); // give Discord a moment to register the initial response
  const flags = reply.ephemeral ? EPHEMERAL : 0;
  let start = 1;
  if (deferredEphemeral !== null) {
    if (reply.ephemeral && !deferredEphemeral) {
      // We deferred publicly but the answer must be private (e.g. "guide unavailable"):
      // remove the public placeholder and send everything as private follow-ups.
      await webhook(env, token, "/messages/@original", "DELETE");
      start = 0;
    } else {
      const ok = await webhook(env, token, "/messages/@original", "PATCH", { ...reply.messages[0], allowed_mentions: NO_PINGS });
      if (!ok) console.error("Could not fill in the deferred reply (message 1)");
    }
  }
  for (let i = start; i < reply.messages.length; i++) {
    const ok = await webhook(env, token, "", "POST", { ...reply.messages[i], allowed_mentions: NO_PINGS, flags });
    if (!ok) console.error(`Could not send follow-up message ${i + 1} of ${reply.messages.length}`);
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
      ctx.waitUntil(work.then((r) => sendFollowups(env, i.token, r, ephemeral)));
      return json({ type: R.DEFERRED, data: { flags: ephemeral ? EPHEMERAL : 0 } });
    }
    if (reply.messages.length > 1) ctx.waitUntil(sendFollowups(env, i.token, reply, null));
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
