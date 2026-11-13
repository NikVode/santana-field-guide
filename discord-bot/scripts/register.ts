// Registers the slash commands as GUILD commands (they show up instantly) in every server
// listed in GUILD_IDS. Reads .env in this folder (gitignored). Usage: npm run register
// The bot token is used only here, on your machine. The Worker never sees it.

import { readFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { COMMANDS } from "../src/commands";

const here = dirname(fileURLToPath(import.meta.url));
const envPath = join(here, "..", ".env");
const env: Record<string, string> = { ...(process.env as Record<string, string>) };
if (existsSync(envPath)) {
  for (const line of readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (m && !line.trim().startsWith("#")) env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const appId = env.DISCORD_APPLICATION_ID, token = env.DISCORD_BOT_TOKEN;
const guilds = (env.GUILD_IDS || "").split(",").map((s) => s.trim()).filter(Boolean);
const missing = [!appId && "DISCORD_APPLICATION_ID", !token && "DISCORD_BOT_TOKEN", !guilds.length && "GUILD_IDS"].filter(Boolean);
if (missing.length) {
  console.error(`Missing in .env: ${missing.join(", ")}. Copy .env.example to .env and fill it in.`);
  process.exit(1);
}

let failed = false;
for (const g of guilds) {
  if (!/^\d{15,22}$/.test(g)) { console.error(`✗ "${g}" doesn't look like a server ID (should be all digits).`); failed = true; continue; }
  // PUT replaces the whole set, so removed commands disappear too.
  const res = await fetch(`https://discord.com/api/v10/applications/${appId}/guilds/${g}/commands`, {
    method: "PUT",
    headers: { "content-type": "application/json", authorization: `Bot ${token}` },
    body: JSON.stringify(COMMANDS),
  });
  if (res.ok) {
    const list = (await res.json()) as { name: string }[];
    console.log(`✓ Server ${g}: registered ${list.map((c) => "/" + c.name).join(" ")}`);
  } else {
    failed = true;
    const text = await res.text();
    console.error(`✗ Server ${g}: HTTP ${res.status} ${text}`);
    if (res.status === 403 || /Missing Access/i.test(text)) console.error("  The app isn't installed in that server yet. Open the invite URL from the README first.");
    if (res.status === 401) console.error("  The bot token is wrong. Reset it in the Developer Portal (Bot page) and update .env.");
  }
}
process.exit(failed ? 1 : 0);
