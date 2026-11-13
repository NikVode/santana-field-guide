// Fetches the site's JSON over HTTPS. Two cache layers:
//  1. this isolate's memory (fast, lost whenever Cloudflare recycles the isolate)
//  2. the Workers Cache API (shared by isolates in the same data centre)
// Fresh for TTL_MS. When the site can't be reached we serve the last good copy, however old.
// With no copy at all we throw GuideUnavailable and the caller replies with a friendly message.

import type { Encounter, Patch, SiteData } from "./types";

export const TTL_MS = 10 * 60 * 1000;
const FETCH_TIMEOUT_MS = 2000;
const FILES = ["encounters", "patch"] as const;
type FileName = (typeof FILES)[number];

export class GuideUnavailable extends Error {}

export interface DataDeps {
  fetchFn?: typeof fetch;
  cache?: Cache | null; // caches.default in the Worker; null to skip
  now?: () => number;
  waitUntil?: (p: Promise<unknown>) => void;
}

interface Entry { body: unknown; fetchedAt: number }
const memory = new Map<string, Entry>();
export function _clearMemoryCache() { memory.clear(); }

export function siteBase(siteUrl: string) { return siteUrl.endsWith("/") ? siteUrl : siteUrl + "/"; }
const fileUrl = (siteUrl: string, f: FileName) => siteBase(siteUrl) + "content/" + f + ".json";

async function readCacheApi(cache: Cache, url: string): Promise<Entry | null> {
  try {
    const res = await cache.match(url);
    if (!res) return null;
    const fetchedAt = Number(res.headers.get("x-fetched-at")) || 0;
    return { body: await res.json(), fetchedAt };
  } catch { return null; }
}

async function writeCacheApi(cache: Cache, url: string, text: string, fetchedAt: number) {
  try {
    await cache.put(url, new Response(text, {
      headers: { "content-type": "application/json", "cache-control": "public, max-age=31536000", "x-fetched-at": String(fetchedAt) },
    }));
  } catch { /* cache is best-effort */ }
}

async function getFile(siteUrl: string, f: FileName, deps: DataDeps): Promise<{ body: unknown; stale: boolean }> {
  const url = fileUrl(siteUrl, f);
  const now = (deps.now || Date.now)();
  const fetchFn = deps.fetchFn || fetch;

  let cached: Entry | null = memory.get(url) || null;
  if (!cached && deps.cache) cached = await readCacheApi(deps.cache, url);
  if (cached && now - cached.fetchedAt < TTL_MS) { memory.set(url, cached); return { body: cached.body, stale: false }; }

  try {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try { res = await fetchFn(url, { signal: ctrl.signal, headers: { accept: "application/json" } }); }
    finally { clearTimeout(timer); }
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const text = await res.text();
    const body = JSON.parse(text);
    const entry = { body, fetchedAt: now };
    memory.set(url, entry);
    if (deps.cache) {
      const p = writeCacheApi(deps.cache, url, text, now);
      if (deps.waitUntil) deps.waitUntil(p); else await p;
    }
    return { body, stale: false };
  } catch (err) {
    if (cached) return { body: cached.body, stale: true };
    throw new GuideUnavailable(`Could not load ${url}: ${(err as Error).message}`);
  }
}

export async function loadSiteData(siteUrl: string, deps: DataDeps = {}): Promise<SiteData> {
  const [enc, patch] = await Promise.all(FILES.map((f) => getFile(siteUrl, f, deps)));
  const encounters = ((enc.body as { encounters?: Encounter[] }).encounters || []).filter((e) => e && e.id && Array.isArray(e.bosses));
  return { siteUrl: siteBase(siteUrl), encounters, patch: (patch.body || {}) as Patch, stale: enc.stale || patch.stale };
}

export const UNAVAILABLE_TEXT = (siteUrl: string) =>
  `The Santana Field Guide is unavailable right now, so I can't look that up. Try again in a few minutes, or open the site: ${siteBase(siteUrl)}`;
