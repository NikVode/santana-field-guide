# Santana — Where Winds Meet Field Guide

A static tips-and-notes site for the guild. It's plain HTML, CSS and JavaScript with no framework and no build step. All content lives in three JSON files, so you can edit the guide without touching code.

```
index.html            Home: patch banner, season countdown, coming soon, newest raids, checklist
sword-trials.html     Sortable list of Sword Trials
heros-realms.html     Sortable list of Hero's Realms
encounter.html?id=…   One page per encounter (built from encounters.json)
guild.html            Guild & Team content (activities with category guild / team)
endgame.html          Other Endgame (activities with category pvp / event)
tools.html            Reset clocks, Guild War times, Discord call sheet
search.html           Search with type / level / coverage filters
sources.html          Every source and video, grouped by site
content/              ← the only files most people need to edit
  patch.json  encounters.json  activities.json
assets/css/style.css  assets/js/app.js
tools/validate.mjs    Checks the JSON before you publish
RESEARCH_LOG.md       What each entry is based on, and what still needs checking
```

## Run it locally

The pages load JSON with `fetch`, so double-clicking `index.html` won't work. Serve the folder instead:

```bash
python3 -m http.server 8000
```

Then open http://localhost:8000.

## Edit or add an encounter

1. Open `content/encounters.json`. Copy an existing entry, for example `segmented-puppets` (a full one) or `abyssal-lament` (a stub).
2. Give it a unique `id` in lowercase with dashes. The page will be `encounter.html?id=<id>`. Don't change an id after people have shared links to it.
3. Fill in the fields:

| Field | What it is |
|---|---|
| `type` | `sword-trial` or `heros-realm` |
| `level`, `players` | Number; players is `5` or `10` |
| `variants` | Optional, e.g. `[{ "name": "Supreme", "level": 91, "mastery": "2,600" }]` |
| `added` | `{ "version": "2.3", "date": "2026-10-15" }` (newest dates show first on Home) |
| `requirements` | `level`, `mastery` (a list, so you can show two sources that disagree), `party`, `bring` (list), `notes` (list) |
| `roles` | `[{ "role": "Chain players", "count": 2, "duties": { "<boss id>": "what they do" } }]` |
| `bosses` | `[{ "id", "name", "summary", "worldBossNote", "mechanics": [...], "talents": [...] }]` |
| mechanic | `{ "name", "trigger": "when this happens", "response": "do this" }`, in fight order |
| talent | `{ "code": "1-3", "condition": "...", "smartAssist": "Works with AI", "video": { "url", "t": "1:30" } }` |
| `commonFailures` | Strings, or `{ "boss": "<boss id>", "text": "..." }` to show it under that boss |
| `rewards`, `videos`, `sources` | Lists. Videos can have `timestamps: [{ "t": "2:25", "label": "1-1" }]` |
| `guildNotes` | Free text for your own notes (shown on the page) |
| `lastVerified`, `verifiedBy` | Date you last checked it, and how ("in game", or "checked against guides") |
| `needsVerification`, `verifyNotes` | `true` shows a ⚠ badge. Put the reasons in `verifyNotes` |
| `coverage` | `full`, `partial` or `stub` |

Any mechanic, talent or boss can have `"needsVerification": true` plus a `"verifyNote"`.

**House rules:** write things in your own words, add a source for every fact, and name the action rather than a PC key ("interact button", not "press F").

4. Check your edit:

```bash
node tools/validate.mjs
```

It catches broken JSON, missing fields, wrong `type` / `coverage` values, duplicate ids, and roles or failures that point at a boss id that doesn't exist. If you don't have Node, paste the file into any JSON validator. The site shows a red "Couldn't load" box if the JSON is broken.

## Add guild or team content

Edit `content/activities.json`. `category` is `guild` or `team` (shown on Guild & Team) or `pvp` or `event` (shown on Other Endgame). Fields: `name`, `players`, `unlock`, `schedule`, `how` (list), `tips` (list), `rewards` (list), `videos`, `sources`, `needsVerification`, `verifyNotes`, `coverage`, `added`.

## After a new patch: update `patch.json`

1. Set `version`, `versionName`, `releaseDate` and `levelCap`.
2. Update `season`: `name`, `endDate` (YYYY-MM-DD), and `endTime` (server time). The Home countdown uses these. Add or remove `milestones`.
3. Move items out of `comingSoon` and add the new announcements.
4. Add a line at the top of `changelog`.
5. Update the `checklist` items if the weekly routine changed. Each item needs a stable `id`; changing an id un-ticks it for everyone.
6. Check `resets` (server UTC offset, daily time, weekly day: 0=Sun, 1=Mon) and `guildWar`, if the times changed.
7. Add the new Sword Trial / Hero's Realm to `encounters.json` as a `stub` with `needsVerification: true`, and fill it in as the guild learns it.

## Deploy to GitHub Pages

1. Create a repository (e.g. `santana-field-guide`) and push this folder to the `main` branch:

```bash
git init
```

```bash
git add . && git commit -m "Field guide" && git branch -M main
```

```bash
git remote add origin https://github.com/<you>/santana-field-guide.git && git push -u origin main
```

2. On GitHub: **Settings → Pages → Build and deployment → Source: Deploy from a branch → `main` / `(root)` → Save**.
3. After a minute the site is live at `https://<you>.github.io/santana-field-guide/`. All paths are relative, so it works from that sub-folder as-is. The empty `.nojekyll` file tells GitHub to serve files unprocessed.
4. To update, edit the JSON (on github.com in the browser is fine), commit, and wait about a minute. If phones still show old styling, hard-refresh. The JSON itself is always re-fetched.

## Features, for reference

- **Copy link** buttons on every encounter, boss and section create `#anchor` links for Discord.
- The **talent checklist** on each encounter is saved per device. Use **Reset talent checks** before a new run.
- The **roles table** has a name box per role and **Copy roles for Discord**.
- The **daily/weekly checklist** on Home un-ticks itself at the daily and weekly reset (from `patch.json → resets`).
- **Print cheat sheet** prints a compact page: no nav, no videos, no source lists, with mechanics in two columns.
- **Group Tools → Discord call sheet** builds a pasteable summary for any encounter and warns if it's over Discord's 2,000-character limit.
- Saved state uses `localStorage` and stays on your device. Nothing is uploaded.
