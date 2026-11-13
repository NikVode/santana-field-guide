# Santana Discord bot

Slash commands that answer raid questions from the live **Santana Field Guide**
(https://nikvode.github.io/santana-field-guide/). The bot reads the site's `content/*.json` over HTTPS
and caches them for about 10 minutes, so editing the site updates the bot.

- Runs as a **Cloudflare Worker** (free tier) using Discord's *HTTP interactions endpoint*.
  There's no always-on process, no gateway connection and no database.
- Needs only the `applications.commands` scope: no "bot" user, no privileged intents, and it can't read messages.
- Commands: `/boss`, `/raid`, `/roles`, `/talents`, `/times`, `/guide`.

| Command | What it does | Who sees it |
|---|---|---|
| `/boss name:` | One boss card: mechanics in order ("When X → do Y"), roles, talents. Picking a whole raid shows each of its bosses. | Only you, unless `share:true` |
| `/raid name:` | Full call sheet: Before you queue, roles, then one card per boss. Spans several messages when it's long. | Posted in the channel |
| `/roles name:` | Role assignments (for one boss if you pick a boss) | Only you, unless `share:true` |
| `/talents name:` | Talent conditions | Only you, unless `share:true` |
| `/times [what:]` | Countdowns: season end, Battle Pass, events, next update, daily/weekly reset, Guild War | Only you, unless `share:true` |
| `/guide` | Site link and the list of commands | Only you |

Every time is a Discord timestamp (`<t:…:R>` and `<t:…:f>`). Discord shows each reader their own
time zone and keeps the countdown ticking.

Files:

```
src/            Worker code (index.ts is the entry point)
scripts/        register.ts (registers slash commands), samples.ts (prints sample replies)
test/           Vitest tests; several run against the live site
aliases.json    nicknames (the only raid content in this repo)
times.json      reset rules the site doesn't have yet
SCHEMA_NOTES.md what the bot reads from the site, and the gaps it works around
```

---

## Setup, step by step

You need Node 20+ and a free Cloudflare account. Run everything in this `discord-bot/` folder.

```bash
npm install
```

```bash
npm test
```

### 1. Create the Discord application

1. Go to https://discord.com/developers/applications and click **New Application**. Name it something like
   "Santana Guide" and accept the terms.
2. On **General Information**, copy two values. You'll need them in step 2:
   - **Application ID**
   - **Public Key** (a 64-character hex string)
3. Open the **Bot** page and click **Reset Token**, then copy the token. Only the
   command-registration script on your computer uses it (step 4). The Worker never sees it.
   Don't paste it anywhere else, and never commit it.
   (The token doesn't mean the app joins servers as a bot. The invite in step 5 asks only for
   `applications.commands`.) You can switch **Public Bot** off on this page if you want to be the only one who can invite it.
4. Leave **Privileged Gateway Intents** off. The bot needs none.

### 2. Deploy the Worker

```bash
npx wrangler login
```

```bash
npx wrangler secret put DISCORD_PUBLIC_KEY
```

Paste the Public Key when it asks.

```bash
npx wrangler secret put DISCORD_APPLICATION_ID
```

Paste the Application ID.

```bash
npx wrangler deploy
```

Wrangler prints the Worker URL, something like `https://santana-discord-bot.<your-subdomain>.workers.dev`.

The site URL isn't a secret. It's in `wrangler.toml` under `[vars]` as `SITE_URL`.

### 3. Point Discord at the Worker

Back on **General Information**, paste the Worker URL into **Interactions Endpoint URL** and click **Save Changes**.
Discord immediately sends a signed PING. The Worker checks the signature and answers PONG, and the save goes through.
If Discord says the URL couldn't be verified, the Public Key secret is wrong or missing.
Re-run `wrangler secret put DISCORD_PUBLIC_KEY` and save again.

### 4. Register the commands in your test server

1. In Discord, open **User Settings → Advanced** and turn on **Developer Mode**.
2. Right-click your test server's icon and choose **Copy Server ID**.
3. Make your local `.env` (it's gitignored):

   ```bash
   cp .env.example .env
   ```

   Fill in `DISCORD_APPLICATION_ID`, `DISCORD_BOT_TOKEN` and `GUILD_IDS=<your test server ID>`.
4. Invite the app to your test server first (step 5). Then:

   ```bash
   npm run register
   ```

The script registers **guild commands**, which appear in that server instantly. (Global commands can take
up to an hour, so they're not used.) It sets the same command list in every server in `GUILD_IDS` (comma-separated).
It replaces the whole list each time, so you can run it as often as you like.

### 5. Invite the app

Use this URL, with your Application ID in place of `APP_ID`:

```
https://discord.com/oauth2/authorize?client_id=APP_ID&scope=applications.commands
```

- **Your test server:** open the URL yourself and pick the server. You need Manage Server there.
- **The guild's server, later:** send the same URL to whoever has **Manage Server** in the guild's Discord.
  It asks for no permissions beyond adding slash commands.

Then type `/` in a channel, and the six commands should appear. Try `/boss lodestar`, `/raid compass` and `/times`.

### 6. Going live in the guild's server

1. Get the guild server's ID (Developer Mode → right-click the server icon → Copy Server ID). Ask an admin if you can't see it.
2. Make sure the app has been invited there (step 5).
3. Add the ID to `.env`. Keep your test server first so you can try changes there:

   ```
   GUILD_IDS=111111111111111111,222222222222222222
   ```

4. Run `npm run register` again.

To remove the commands from a server, drop its ID from `GUILD_IDS`. That alone doesn't
delete them, so kick the app from that server (Server Settings → Integrations).

### 7. Updating

- **Raid content, dates, season end, resets:** edit the site's JSON as usual. The bot picks it up within ~10 minutes.
  There's nothing to redeploy. This includes new encounters and bosses, which show up in autocomplete automatically.
- **Add a nickname:** edit `aliases.json`. Map the nickname to `"<encounterId>"` or `"<encounterId>/<bossId>"` (ids from
  `content/encounters.json`), or to a list of them. Level shortcuts like `lv100 hr` / `st96` are generated, so don't add those.
  Then run `npm test` (it checks every alias exists on the live site) and redeploy.
- **Add a reset rule:** edit `times.json` and give the rule a `source`. A rule that happens at the same time as the
  site's reset is `{ "id", "label", "sameAs": "weekly", "source" }`. A rule with its own time is
  `{ "id", "label", "weekday": 1, "time": "05:00", "utcOffset": 8, "source" }`, with `weekday` 0 = Sunday, or `null` for
  daily. Better still, if the site should show it too, add it to the site's `patch.json` instead. Then redeploy.
- **Redeploy after changing code, aliases or rules:**

  ```bash
  npm test && npx wrangler deploy
  ```

- **Changed the command list** (`src/commands.ts`): run `npm run register` as well.

### Handy commands

```bash
npm run samples
```

```bash
npm run samples -- "/boss veiled lady" "/talents liminal" "/times battlepass"
```

These print sample replies built from the live site and check them against Discord's limits.

```bash
npx wrangler tail
```

This shows live logs from the deployed Worker.

## How it works (short)

- **Signatures:** every request's `X-Signature-Ed25519` and `X-Signature-Timestamp` are checked with WebCrypto against
  the Public Key. Anything invalid gets 401. PING gets PONG.
- **Data:** files are kept fresh for 10 minutes, first in memory, then in the Workers Cache API. If the site can't be reached,
  the bot serves the last good copy and says so. If it has no copy at all, it replies "the guide is unavailable right now".
  (Cloudflare documents the Cache API for Workers on custom domains. On a plain `workers.dev` URL, the in-memory
  layer still caches, but each new Worker instance may re-fetch from GitHub Pages. That's fine at guild scale.)
- **Slow answers:** Discord wants a reply within 3 seconds. If the site is slow, the bot acknowledges first, then fills
  in the reply. Long `/raid` sheets go out as several messages through the interaction's own webhook. No bot token
  is involved.
- **Discord limits:** each card is built from prioritized lines. If something doesn't fit (4096 per description,
  1024 per field, 25 fields, 6000 per message, 10 embeds), the least important lines go first, and the card ends
  with "Full details on the site" and a link. Tests render every boss and encounter on the live site and check this.
- **Times:** the bot uses line-for-line copies of the site's `parseServerDate`, `resetInfo` and Guild War logic, all in
  server time (UTC+8, no daylight saving). A test runs the live site's `app.js` and checks that both give the same instants.
