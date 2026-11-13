# Schema notes: what the bot reads from the live site

Learned on 2026-11-13 from https://nikvode.github.io/santana-field-guide/ (the `main` branch on GitHub Pages).
The bot reads the same JSON files the site does, over HTTPS. Nothing from them is copied into the bot.

## Files

The site's `assets/js/app.js` loads `content/<name>.json` for `patch`, `encounters` and `activities`.
The bot uses two of them:

| File | Used for |
|---|---|
| `content/encounters.json` | `/boss`, `/raid`, `/talents`, autocomplete |
| `content/patch.json` | `/times` (season, milestones, resets, Guild War, coming soon) |
| `content/activities.json` | not used (its schedules are free text, with no dates the bot could count down to) |

## encounters.json

`{ _readme, encounters: Encounter[] }`. There are 17 encounters: 7 Sword Trials and 10 Hero's Realms.

Encounter fields the bot uses:

- `id`: the anchor for `encounter.html?id=<id>`
- `name`, `type` (`sword-trial` | `heros-realm`), `level`, `players` (5 | 10)
- `coverage` (`full` | `partial` | `stub`) and `needsVerification` exist, but the bot doesn't show them
- `variants[]` `{ name, level, mastery }`, for example Supreme tiers
- `requirements` `{ level, mastery[] {value, source}, party, bring[], notes[] }`, shown as "Before you queue" (mastery `source` isn't shown, and "Not listed" / "Not published" values are left out)
- `roles[]` `{ role, count, duties: { <bossId>: text } }`. Duties are keyed by boss id.
- `bosses[]` `{ id, name, summary, worldBossNote, needsVerification, verifyNote, mechanics[], talents[] }`
  - `mechanics[]` `{ name, trigger, response, note, needsVerification }`, in fight order. The bot renders each one as "**name**: When trigger → response".
  - `talents[]` `{ code, condition, smartAssist, notes, video, needsVerification }`

Site anchors the bot links to (the same ones `app.js` creates):

- Boss: `encounter.html?id=<encId>#boss-<bossId>`
- Roles: `#roles`. Before you queue: `#before`. Talents: `#talents-<bossId>`.

Gaps the bot handles gracefully instead of inventing data:

- **Boss ids are not globally unique.** `twin-lions` and `murong-yuan` each appear in two encounters, so the bot keys a boss as `<encId>/<bossId>`.
- **No roles** in 6 encounters (Abyssal Lament, Drunken Verse, Yama's Seal, Sorrow of Mortalbound, Blazing Gale Dance, Dream Jinming Pool). Here the `/raid` roles card says "No role assignments written up yet" and links to the site.
- **No mechanics or talents** for some bosses (Blazing Gale Dance is a stub; Sorrow of Mortalbound has no talents). The bot says so instead of leaving the section blank.
- **Names carry extras.** Examples: "Lodestar (Swordmaster)", "Bai Chuyu (the Veiled Lady)", "Bloodstained Sands (+ Supreme)", "Zheng'e". For matching, the bot also indexes the name without the bracketed part, the bracketed part itself, and a version with punctuation removed, so "zheng e" finds Zheng'e.

## patch.json: everything `/times` uses

### Time zone handling (copied from the site's logic, not its data)

`app.js` interprets every date string with `parseServerDate(str, offset)`. It matches `^YYYY-MM-DD` with an optional ` HH:MM` or `THH:MM`, takes that as wall-clock time at UTC+`offset`, and ignores the rest of the string. `offset` is `patch.resets.utcOffset` (8), falling back to 8. The bot uses a line-for-line port of `parseServerDate`, `lastReset` and `resetInfo`. A test loads the live `app.js` and checks that, for a fixed "now", the bot gets exactly the same instants as the site.

### Dated items

| Data | Site behavior | Bot behavior |
|---|---|---|
| `season.endDate` + `season.endTime` | Counts it down on Home | Same instant. `needsVerification` / `verifyNote` are not shown. |
| `season.milestones[]` with `at` | Counts it down on Home | Same instant, parsed from `at` |
| `season.milestones[]` **without** `at` | Shows the `date` text only; **no countdown** | Parses the leading date and time of `date` with the same `parseServerDate`. If `date` is a range (`A → B`), the item shows "starts" before A and "ends" until B. |
| `comingSoon[]` `{ title, date, details }` | Shows the date as a badge | Listed with the date only (no exact time is in the data). It drops off after that server day ends. An entry that repeats a milestone on the same server date is hidden (see below). |

Milestones without `at` since the 2.4 update (2026-11-13): only "Mid-Season Sprint: Arena", because it's a range. The Scarlet Whispers milestone was removed after it ended, and "Blades & Bonds anniversary event ends" now has an `at`.

Duplicate rule: a `comingSoon` entry is hidden from `/times` when a milestone falls on the same server date and the two share a word of 4 or more letters ("arena", "mausoleum"…). Today this hides "Mid-Season Sprint: Arena" and "Arena / Mausoleum half-season switch", because both repeat a milestone.

Item categories (these drive `/times arena`, `/times battlepass`…) are worked out from the text, so new items are picked up automatically:

- `season`: the season end. It is also tagged `arena` and `mausoleum`, because both end with the season.
- `arena` / `mausoleum` / `battlepass` / `events` / `updates`: assigned by keywords in the label (`arena`, `mausoleum`, `battle pass`, `event`, `version|update|patch`).
- An option only appears in autocomplete if at least one upcoming item has that category.

`season.endDate` 2027-01-07 is flagged `needsVerification` in the data. The bot doesn't show that flag (see below).

### Recurring rules (the site's data already has all three)

| Rule | Source in the data | Value today |
|---|---|---|
| Daily reset | `patch.resets.daily` at `patch.resets.utcOffset` | 05:00 UTC+8 every day |
| Weekly reset | `patch.resets.weekly` `{ day: 1, time }` (0 = Sun) | Monday 05:00 UTC+8 |
| Guild War | `patch.guildWar` `{ days: [6, 0], time, battlegroups[] {name, region, utcOffset} }` | Sat & Sun 20:30 on each battlegroup's own clock: Canglang/Jiangzhu +8, Yunya +2, Yougu −4, Linhe −7 |

The site's `resets.note` cites official patch notes, allthings.how and mein-mmo for the 05:00 UTC+8 daily and weekly times. `guildWar.note` cites the official Apr 30, 2026 notice. It also says Guild War does not follow daylight saving, which is why the offsets are fixed.

Guild War uses the site's Group Tools logic: for each battlegroup, the next start is within the coming week, and during the first hour after a start it shows "running now".

### Rules kept in this repo (`times.json`)

The only content in the bot besides `aliases.json`. Each rule lists its source:

| Rule | Value | Source |
|---|---|---|
| Battle Pass weekly EXP cap | `sameAs: "weekly"`, so it follows the site's weekly reset | patch.json `resets.note` ("The Battle Pass weekly EXP cap also resets Monday 05:00 UTC+8") and `checklist.weekly[bp-cap].note` |

It has no time of its own. If the site's weekly reset changes, this rule moves with it. `/times` folds it into the weekly-reset line ("also resets: Battle Pass weekly EXP cap"). The rule's `source` stays in `times.json` for maintainers and isn't shown.

**Left out because I couldn't source them:** Arena 3v3 and Group Strategy hours, and Breaking Army or Guild Showdown windows. `activities.json` describes these in free text only, and they depend on each battlegroup's local time. Add them to `times.json` if you want them (see the README).

## What the bot leaves out

The guild treats the guide as correct, so the bot states it plainly. The site keeps all of its notes; only what the bot
shows changes. `src/clean.ts` does this on a deep copy of the encounters, built once per fetched copy:

- `scrub(text)` runs on every shown string. It removes bracketed asides that cite a source or say "in-game"
  ("(Game8)", "(in-game callout)", "(Game8, WWM Handbook)"), sentences that only cite a source
  ("allthings.how's run sent orange notes."), and "Check in game." / "Confirm in game." tags. It rewrites
  "Sources differ: Game8 says X; the in-game callout just says Y. Either way, Z." as "X. Z.", and strips a leading
  "Game8:" / "Official:" label but keeps the tip after it.
- `cleanNote(note)` runs on `note`, `notes` and `worldBossNote`. It scrubs, strips a leading "Guild notes add:", and drops
  the note entirely when it's only about sources or verification (it names a source, or says "confirmed", "verified",
  "assumed", "talent text", "in-game name/text/objective", "callout says", "same condition", "the Oct 29 notes"…).
  Gameplay tips stay, including in-game callouts like the enrage line.
- Not touched: `id`, `url`, `video(s)`, `sources`, `verifyNote(s)`, `type`, and the id/enum fields `boss` and `coverage`.
- Not shown at all: ⚠ markers, `needsVerification`, `verifyNote`, the coverage line, mastery `source`, "Not listed" /
  "Not published" mastery values, the season's "not confirmed" warning, and the "Source:" lines of `times.json` rules.
- `/times` runs `resets.note`, `guildWar.note` and milestone notes through `cleanNote`, and coming-soon details through `scrub`.

Source names it knows: Game8, GameMarket, Where Guilds Meet, allthings.how, Mein-MMO, SenseOS, WWM / Where Winds Meet
Handbook, Fextralife, Reddit, YouTube, Points N Pixels, wiki, Akira Y. Add new ones to `SOURCE` in `src/clean.ts`.
A render test fails if any reply from `/raid`, `/boss`, `/talents` or `/times` contains a source name, ⚠, "verif",
"Source:", "Not published" or "assumed".

## Fields the bot would like but the data doesn't have

- `at` on the three milestones listed above. The bot copes by parsing `date`.
- An exact time on `comingSoon[].date`. The bot shows the date only.
- A machine-readable end date for the Battle Pass in `comingSoon` / `activities`. The bot uses the milestones.
- A guild battlegroup. `/times guildwar` lists all five, and the overview shows the soonest.
