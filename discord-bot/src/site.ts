// Line-for-line ports of the site's own time helpers (assets/js/app.js on the live site),
// so the bot and the site always land on the same instant. test/times.test.ts loads the live
// app.js and checks the two agree. If you change these, change them on the site too.

export interface HM { h: number; m: number }

export function parseHM(s: unknown): HM {
  const [h, m] = String(s || "05:00").split(":").map(Number);
  return { h: h || 0, m: m || 0 };
}

/** Most recent reset at or before `now`, at wall-clock hm on a UTC+offset clock (weekday 0=Sun, or null for daily). */
export function lastReset(now: Date, offset: number, hm: HM, weekday: number | null): Date {
  const shift = offset * 3600e3;
  const s = new Date(now.getTime() + shift);
  let cand = Date.UTC(s.getUTCFullYear(), s.getUTCMonth(), s.getUTCDate(), hm.h, hm.m);
  if (weekday == null) {
    if (cand > s.getTime()) cand -= 864e5;
  } else {
    const d = new Date(cand);
    const back = (d.getUTCDay() - weekday + 7) % 7;
    cand -= back * 864e5;
    if (cand > s.getTime()) cand -= 7 * 864e5;
  }
  return new Date(cand - shift);
}

export interface Resets { utcOffset?: number; daily?: string; weekly?: { day: number; time: string }; note?: string }

export function serverOffset(patch: { resets?: Resets }): number {
  const r = patch.resets || {};
  return r.utcOffset != null ? r.utcOffset : 8;
}

export function resetInfo(patch: { resets?: Resets }, now = new Date()) {
  const r = patch.resets || {};
  const off = r.utcOffset != null ? r.utcOffset : 8;
  const dHM = parseHM(r.daily), w = r.weekly || { day: 1, time: "05:00" };
  const lastDaily = lastReset(now, off, dHM, null);
  const lastWeekly = lastReset(now, off, parseHM(w.time), w.day);
  return { lastDaily, nextDaily: new Date(lastDaily.getTime() + 864e5), lastWeekly, nextWeekly: new Date(lastWeekly.getTime() + 7 * 864e5) };
}

/** "2027-01-07" or "2027-01-07T05:00" (or "2027-01-07 05:00 ...") interpreted at the server offset. */
export function parseServerDate(str: unknown, offset: number): Date | null {
  if (!str) return null;
  const m = String(str).match(/^(\d{4})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2}))?/);
  if (!m) return null;
  return new Date(Date.UTC(+m[1], +m[2] - 1, +m[3], +(m[4] || 0), +(m[5] || 0)) - offset * 3600e3);
}

/** Guild War next start for one battlegroup, exactly as the site's Group Tools table computes it. */
export function guildWarNext(now: Date, bgOffset: number, time: string, days: number[]): Date | null {
  const hm = parseHM(time);
  const nexts = days.map((day) => {
    const l = lastReset(now, bgOffset, hm, day);
    let n = new Date(l.getTime() + 7 * 864e5);
    if (now.getTime() - l.getTime() < 3600e3) n = l; // within the first hour: show the current one
    return n;
  }).sort((a, b) => a.getTime() - b.getTime());
  return nexts[0] || null;
}
