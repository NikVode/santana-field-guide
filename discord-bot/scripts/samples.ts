// Prints sample payloads built from the LIVE site data. Usage: npm run samples [-- "/boss lodestar" ...]
import { runCommand } from "../src/commands";
import { loadSiteData } from "../src/data";
import { validateMessage, embedLength } from "../src/embed";

const SITE = process.env.SITE_URL || "https://nikvode.github.io/santana-field-guide/";
const data = await loadSiteData(SITE, { cache: null });

const asks = process.argv.slice(2).length ? process.argv.slice(2) : ["/boss lodestar", "/raid compass", "/times"];
for (const ask of asks) {
  const [, cmd, ...rest] = ask.match(/^\/(\w+)\s*(.*)$/) || [];
  const arg = rest.join(" ").trim();
  const opts: Record<string, string> = {};
  if (arg) opts[cmd === "times" ? "what" : "name"] = arg;
  const reply = runCommand(cmd, opts, data);
  console.log(`\n===== ${ask}  (${reply.ephemeral ? "private" : "posted in channel"}, ${reply.messages.length} message${reply.messages.length > 1 ? "s" : ""}) =====`);
  reply.messages.forEach((m, i) => {
    const errs = validateMessage(m);
    const total = (m.embeds || []).reduce((n, e) => n + embedLength(e), 0);
    console.log(`--- message ${i + 1}: ${m.embeds?.length || 0} embeds, ${total} chars, ${errs.length ? "INVALID: " + errs.join("; ") : "within Discord limits"}`);
    console.log(JSON.stringify(m, null, 2));
  });
}
