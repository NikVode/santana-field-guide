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
buildlab.html         Build Lab: martial path builds with estimated relative ratings
search.html           Search with type / level / coverage filters
sources.html          Every source and video, grouped by site
content/              ← the only files most people need to edit
  patch.json  encounters.json  activities.json
  buildlab/           ← Build Lab data: paths, martial-arts, inner-ways, builds
assets/css/style.css  assets/js/app.js
assets/css/buildlab.css  assets/js/buildlab/model.js (rating maths)  assets/js/buildlab/buildlab.js (page)
tools/validate.mjs    Checks the JSON before you publish (guide and Build Lab)
tests/buildlab.test.js  Build Lab tests: node tests/buildlab.test.js
RESEARCH_LOG.md       What each entry is based on, and what still needs checking
BUILDLAB_LOG.md       Build Lab sources, which tier numbers are confirmed, open questions
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

## Build Lab

`buildlab.html` shows every martial path's recommended build and lets you swap weapons and Inner Ways, change tiers, switch Boss / Group / Solo, enter your own stats, compare two builds and share a link. Ratings are **estimated and relative**: each path's recommended build at max Inner Way tiers = 100. How the maths works is written at the top of `assets/js/buildlab/model.js` and in the page's "How ratings work" panel. Sources and what still needs checking are in `BUILDLAB_LOG.md`.

The data lives in `content/buildlab/`. Every file has `gameVersion` and `lastVerified`; update both when you re-check.

| File | What's in it |
|---|---|
| `paths.json` | One entry per martial path: `id`, `name`, `family`, `martialArts` (2 ids), `role` (`dps` / `tank` / `healer` / `hybrid`), `scalingStats`, `damageMix` (share of damage per skill type, adds up to 1), `healingMix` (healers only), `noAbrasion` (skill types that can't Abrade), `referenceStats` (stat profile used unless someone enters their own), `recommendedBuild`, `sources` |
| `martial-arts.json` | One entry per weapon: `id`, `name`, `weaponType`, `path`, `role`, `keySkills`, `notes`, `sources` |
| `inner-ways.json` | `id`, `name`, `path` (or `general`), `rarity`, `baseEffect` + `baseModifiers` + `baseTags`, `tiers[]` (`tier`, `text`, `modifiers[]`, `tags[]`), `howToGet`, `sources`, `lastVerified`, `needsVerification`, `verifyNotes` |
| `builds.json` | One recommended build per path: 2 `martialArts`, 4 `innerWays` (`id`, `recommendedTier`, `note`), `gearSet`, `mysticSkills`, `why`, `rotation`, `alternatives`, `agreement`, `sources` |

**Modifiers** (on a base effect or a tier) look like this:

```json
{ "stat": "damage_bonus", "value": 15, "unit": "percent", "bucket": "charged", "condition": "vs_boss", "key": "ba", "requires": { "weapon": ["nameless-sword"] }, "note": "..." }
```

- `stat`: `damage_bonus`, `base_damage`, `damage_taken` (target takes more), `attack_pct`, `min_attack`, `max_attack`, `crit_rate`, `direct_crit_rate`, `crit_damage`, `affinity_rate`, `direct_affinity_rate`, `affinity_damage`, `precision`, `penetration`, `defense_ignore`, `guaranteed_crit`, `healing_bonus`, `crit_heal_bonus`, `damage_reduction`, `physical_resistance`, `shield_strength`. Attribute stats (`attribute_attack`, `attribute_penetration`, `attribute_damage_bonus`) and `max_hp` / `physical_defense` are listed but not counted.
- `bucket`: which skills it applies to: `all`, `path` (every weapon skill), or a skill type such as `charged`, `martial_art_skill`, `special_skill`, `light_attack`, `heavy_attack`, `varied_combo`, `dual_weapon`, `triggered`, `summon`, `projectile`, `dot`, `drumbeat`, `execution`, `mystic`. Use a list for several.
- `condition`: `always` or a named condition (`vs_boss`, `boss_exhausted`, `perfect_dodge`, `shielded`, `stacks`, `special_state`, `party_buff`, …). Each has an uptime per context in `model.js → CONDITIONS`. `uptimeMul` scales that uptime (e.g. 1.2 when a tier makes a buff last longer).
- `key`: when a higher tier *upgrades* a number ("rises to 15%"), give both modifiers the same key; the higher tier replaces the lower one.
- `requires.weapon` / `requires.weaponType`: the effect only counts with that weapon equipped. Otherwise it shows under "Not counted".
- No number published? Use `"value": null, "scalesWith": "solo_mode_level"` (unmodeled), or put the effect in `tags` as utility text. Never invent a value.

**Add an Inner Way:** copy an entry in `inner-ways.json`, give it a new `id`, write the base effect and each tier in your own words, add modifiers only for numbers you read in a source, add the sources, set `needsVerification: true` with a reason if it has fewer than two sources or a conflict.

**Add a path** (e.g. Bellstrike - Bolt, Dual Spears, Nov 26, 2026): it's already in `paths.json` as `"status": "upcoming"`. When it's out: add its two weapons to `martial-arts.json`, its Inner Ways to `inner-ways.json`, a build to `builds.json`, then fill in the path entry (`martialArts`, `damageMix`, `referenceStats`, `recommendedBuild`, `sources`) and remove `"status": "upcoming"`. Add a family color in `paths.json → families` if it's a new family.

**Add or change a build:** edit `builds.json`. Ratings automatically treat the path's recommended build at max tiers as 100.

**After a patch:**
1. Read the Path Balance notice. For each changed Inner Way, update the tier `text` and the modifier `value`, add a `verifyNote` saying what changed and where you read it, and set `lastVerified`.
2. If a path's playstyle changed, update its `damageMix` and `referenceStats` and say where the new numbers come from in `damageMixNote` / `referenceNote`.
3. Update `gameVersion` and `lastVerified` in all four files, and `REF.soloModeLevelCap` in `model.js` if the Solo Mode cap rose.
4. Run both checks:

```bash
node tools/validate.mjs
```

```bash
node tests/buildlab.test.js
```

The tests check that every recommended build scores 100, that raising a tier never lowers a rating, that crit/damage bonuses never lower damage, that utility effects don't change ratings, and that share links round-trip. If "raising a tier never lowers a rating" fails, a tier's modifier probably needs the same `key` as the one it upgrades.

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
- **Build Lab** keeps the build in the URL (share links), and saves "Use my stats" and uptime sliders on your device only.
- Saved state uses `localStorage` and stays on your device. Nothing is uploaded.
