// Loads the LIVE site (not fixtures). Set SITE_URL to point the tests at another copy.
import vm from "node:vm";
import { loadSiteData, _clearMemoryCache } from "../src/data";
import type { SiteData } from "../src/types";

export const SITE = process.env.SITE_URL || "https://nikvode.github.io/santana-field-guide/";
let data: Promise<SiteData> | null = null;
export function liveData() {
  if (!data) { _clearMemoryCache(); data = loadSiteData(SITE, { cache: null }); }
  return data;
}

/** The site's own time helpers, from the live assets/js/app.js, run in a sandbox (boot() never runs). */
export interface SiteHelpers {
  resetInfo(patch: unknown, now?: Date): { lastDaily: Date; nextDaily: Date; lastWeekly: Date; nextWeekly: Date };
  lastReset(now: Date, offset: number, hm: { h: number; m: number }, weekday: number | null): Date;
  parseServerDate(s: string, offset: number): Date | null;
}
let helpers: Promise<SiteHelpers> | null = null;
export function liveSiteHelpers() {
  if (!helpers) helpers = fetch(SITE + "assets/js/app.js").then((r) => r.text()).then((src) => {
    const window: Record<string, unknown> = {};
    const document = { readyState: "loading", addEventListener() {}, querySelector() { return null; }, querySelectorAll() { return []; } };
    vm.runInNewContext(src, { window, document, Date, URL, URLSearchParams, console });
    return window.SantanaGuide as SiteHelpers;
  });
  return helpers;
}
