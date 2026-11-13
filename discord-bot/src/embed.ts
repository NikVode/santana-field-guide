// A small embed builder that always produces something Discord will accept.
// Content is added as lines with a priority (1 = essential ... 3 = nice to have). If the embed is
// over any Discord limit, the least important lines go first (the latest one first), and the
// description ends with "Full details on the site" plus a link.

export const LIMITS = {
  title: 256, description: 4096, fieldName: 256, fieldValue: 1024, fields: 25,
  footer: 2048, author: 256, embedTotal: 6000, embedsPerMessage: 10, messageTotal: 6000, content: 2000,
};
export const FOOTER = "Santana Field Guide - unofficial, fan-made";

export interface Embed {
  title?: string; url?: string; description?: string; color?: number;
  author?: { name: string; url?: string };
  fields?: { name: string; value: string; inline?: boolean }[];
  footer?: { text: string };
}

export interface Line { text: string; pri: number }
export interface FieldSpec { name: string; lines: Line[] }
export interface CardSpec {
  title: string; url?: string; color?: number; author?: string;
  desc: Line[]; fields?: FieldSpec[]; moreUrl?: string; maxTotal?: number;
}

export const L = (text: string, pri = 1): Line => ({ text, pri });

export function clip(s: string, max: number): string {
  s = String(s ?? "");
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)).replace(/\s+\S*$/, "") + "…";
}

export function embedLength(e: Embed): number {
  return (e.title || "").length + (e.description || "").length + (e.footer?.text || "").length + (e.author?.name || "").length
    + (e.fields || []).reduce((n, f) => n + f.name.length + f.value.length, 0);
}

/** Split a field's lines into as many <=1024-char fields as needed (each line clipped to fit). */
function chunkField(f: FieldSpec): { name: string; value: string }[] {
  const out: { name: string; value: string }[] = [];
  let cur: string[] = [], len = 0;
  for (const ln of f.lines) {
    const t = clip(ln.text, LIMITS.fieldValue);
    if (cur.length && len + 1 + t.length > LIMITS.fieldValue) { out.push({ name: "", value: cur.join("\n") }); cur = []; len = 0; }
    cur.push(t); len += (cur.length > 1 ? 1 : 0) + t.length;
  }
  if (cur.length) out.push({ name: "", value: cur.join("\n") });
  return out.map((c, i) => ({ name: clip(i === 0 ? f.name : `${f.name} (cont.)`, LIMITS.fieldName), value: c.value }));
}

function render(spec: CardSpec, desc: Line[], fields: FieldSpec[], truncated: boolean): Embed {
  const more = truncated && spec.moreUrl ? `\n\n**…** [Full details on the site](${spec.moreUrl})` : "";
  let d = joinDesc(desc);
  d = clip(d, LIMITS.description - more.length) + more;
  const fs = fields.filter((f) => f.lines.some((l) => l.text.trim())).flatMap(chunkField).slice(0, LIMITS.fields);
  const e: Embed = { title: clip(spec.title, LIMITS.title), description: d || undefined, footer: { text: FOOTER } };
  if (spec.url) e.url = spec.url;
  if (spec.color != null) e.color = spec.color;
  if (spec.author) e.author = { name: clip(spec.author, LIMITS.author) };
  if (fs.length) e.fields = fs;
  return e;
}

function fits(e: Embed, maxTotal: number) {
  return embedLength(e) <= maxTotal && (e.description || "").length <= LIMITS.description && (e.fields || []).length <= LIMITS.fields;
}

const joinDesc = (desc: Line[]) => desc.map((l) => l.text).join("\n").replace(/\n{3,}/g, "\n\n").trim();

export function buildEmbed(spec: CardSpec): Embed {
  const maxTotal = Math.min(spec.maxTotal || LIMITS.embedTotal, LIMITS.embedTotal);
  const desc = [...spec.desc];
  const fields = (spec.fields || []).map((f) => ({ name: f.name, lines: [...f.lines] }));
  const moreLen = spec.moreUrl ? `\n\n**…** [Full details on the site](${spec.moreUrl})`.length : 0;
  let truncated = false;
  for (let guard = 0; guard < 5000; guard++) {
    const e = render(spec, desc, fields, truncated);
    const descOk = joinDesc(desc).length + (truncated ? moreLen : 0) <= LIMITS.description;
    const fieldCount = fields.filter((f) => f.lines.some((l) => l.text.trim())).flatMap(chunkField).length;
    if (descOk && fieldCount <= LIMITS.fields && fits(e, maxTotal)) return e;
    truncated = true;
    if (!dropOne(desc, fields)) return hardFit(render(spec, desc, fields, true), maxTotal);
  }
  return hardFit(render(spec, desc, fields, true), maxTotal);
}

/** Remove the least important, latest line (description or field). Returns false if nothing is left to drop. */
function dropOne(desc: Line[], fields: FieldSpec[]): boolean {
  let worst = 0;
  for (const l of desc) worst = Math.max(worst, l.pri);
  for (const f of fields) for (const l of f.lines) worst = Math.max(worst, l.pri);
  if (worst <= 0) return false;
  // Prefer dropping from fields (last field first), then from the end of the description.
  for (let i = fields.length - 1; i >= 0; i--) {
    const k = lastIndex(fields[i].lines, worst);
    if (k >= 0) { fields[i].lines.splice(k, 1); return true; }
  }
  const k = lastIndex(desc, worst);
  if (k >= 0 && (desc.length > 1 || worst > 1)) { desc.splice(k, 1); return true; }
  return false;
}
const lastIndex = (ls: Line[], pri: number) => { for (let i = ls.length - 1; i >= 0; i--) if (ls[i].pri === pri) return i; return -1; };

/** Last resort: cut fields, then the description, until it fits. */
function hardFit(e: Embed, maxTotal: number): Embed {
  while (e.fields && e.fields.length && !fits(e, maxTotal)) e.fields.pop();
  if (e.fields && !e.fields.length) delete e.fields;
  if (!fits(e, maxTotal)) {
    const over = embedLength(e) - maxTotal;
    e.description = clip(e.description || "", Math.max(1, (e.description || "").length - over - 1));
  }
  return e;
}

/** Group embeds into messages Discord accepts (<=10 embeds and <=6000 chars each), keeping order. */
export function packMessages(embeds: Embed[]): Embed[][] {
  const out: Embed[][] = [];
  let cur: Embed[] = [], len = 0;
  for (const e of embeds) {
    const n = embedLength(e);
    if (cur.length && (cur.length >= LIMITS.embedsPerMessage || len + n > LIMITS.messageTotal)) { out.push(cur); cur = []; len = 0; }
    cur.push(e); len += n;
  }
  if (cur.length) out.push(cur);
  return out;
}

/** Throws if a message payload breaks a Discord limit. Used by tests and as a final guard. */
export function validateMessage(data: { content?: string; embeds?: Embed[] }): string[] {
  const errs: string[] = [];
  if ((data.content || "").length > LIMITS.content) errs.push("content > 2000");
  const es = data.embeds || [];
  if (es.length > LIMITS.embedsPerMessage) errs.push("more than 10 embeds");
  if (es.reduce((n, e) => n + embedLength(e), 0) > LIMITS.messageTotal) errs.push("embeds total > 6000");
  es.forEach((e, i) => {
    if ((e.title || "").length > LIMITS.title) errs.push(`embed ${i} title > 256`);
    if ((e.description || "").length > LIMITS.description) errs.push(`embed ${i} description > 4096`);
    if ((e.fields || []).length > LIMITS.fields) errs.push(`embed ${i} > 25 fields`);
    if ((e.footer?.text || "").length > LIMITS.footer) errs.push(`embed ${i} footer > 2048`);
    if ((e.author?.name || "").length > LIMITS.author) errs.push(`embed ${i} author > 256`);
    (e.fields || []).forEach((f, j) => {
      if (!f.name || f.name.length > LIMITS.fieldName) errs.push(`embed ${i} field ${j} name empty or > 256`);
      if (!f.value || f.value.length > LIMITS.fieldValue) errs.push(`embed ${i} field ${j} value empty or > 1024`);
    });
    if (embedLength(e) > LIMITS.embedTotal) errs.push(`embed ${i} > 6000`);
  });
  return errs;
}
