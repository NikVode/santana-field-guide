# Research log: Santana Field Guide

Researched 2026-11-12, the day before the Version 2.4 "Hutuo" update. **Nothing here has been checked in game.**

**Starting point.** The site was first built from fresh research because `research-notes.md` wasn't available. The guild's notes were then pasted in and merged the same day. They are saved as [`research-notes.md`](research-notes.md); their links were lost in the paste. See **Merge with the guild notes** below for what was checked, what was added and where the notes and sources disagree.

## How to read this log

- **2+ sources**: two independent write-ups agree. Akira Y's video and a summary of that same video count as **one** source.
- **1 source**: only one guide says it. Probably right, but check it.
- **Flagged**: `needsVerification: true` in the JSON. The site shows a ⚠ badge.
- **Source quality.** Game8, allthings.how, Where Guilds Meet (whereguildsmeet.org) and the official site are treated as normal sources. Where Guilds Meet transcribes Akira Y's YouTube guides, which are often filmed on the Chinese server first. BoostRoom, BitTopup and Topuplist sell boosts or currency, so they're treated as weak sources and always flagged.
- **What I couldn't do.** I couldn't watch videos or read transcripts. Video timestamps come from pages that list them.

---

## Verification pass (Nov 12, team of four checking agents)

Four agents re-checked every encounter and activity against independent sources: Sword Trials; Lv 96–100 Hero's Realms; Lv 51–91 Hero's Realms; patch and activity data. I spot-checked their main new claims myself before applying them: the boss-page talent text, the Game8 level table parsed from raw HTML, the Steam News titles, and the OCR of the 2.4 overview.

**Two new primary sources**
- **Where Guilds Meet boss pages** (`whereguildsmeet.org/bosses/<boss>`). They embed the game's own talent objectives (with game IDs and team-mode flags), in-game callouts and recommended stats. They're separate from that site's video-transcript guides, but the same site, so they're treated as "in-game text" and not as a fully independent outlet.
- **Official Steam News API.** It provides the official 1.2–2.4 update titles and patch text. The 2.3 and 2.4 overviews are images, so they were read with OCR.

**Errors fixed**
- **Hero's Realm levels and mastery were shifted one row** in my first reading of Game8's table. Correct values: Yama's Seal 81 / Supreme 86 (2,000 / 2,300), Sorrow of Mortalbound 71 / Supreme 81 (1,700 / 2,000), Blazing Gale Dance 66 (1,500), Dream Jinming Pool 51 / Supreme 56 (950 / 1,150).
- **Video credits:** the Lv 100 Sword Trial and Lv 100 Hero's Realm videos are both by Points N Pixels, not Akira Y. Timestamps were corrected to the authors' own chapter markers.
- **Version names:** 2.4 is "Across Autumn Waters" (Hutuo is the region). 2.1 is "Clouded Revelation", released Aug 20 (Sep 3 was its second part, 2.1.3). The version names for 1.2, 1.4, 1.5, 1.6 and 1.8 were missing or wrong. The 2.0 season is "S4: Forge Ahead".
- **Season end:** Nov 26 is officially the mid-season switch. The Jan 7 full-season end comes only from Game8 and GameMarket.
- **Hutuo launch:** the update window is 18:00–22:59 UTC+8, and the content is live from 23:00. Jianghu Tactics isn't in the official 2.4 overview.
- **Boss names:** Drunken Verse's bosses are **Shadow Puppeteer → Drunk Martial Artist** (not Sheng Wu). The Horse Tamer charge is "Reckless Charge", the Wandering Ark enemy is "Desert Strongman", and Guo Xin is a campaign boss (not a world boss).
- **Rewards:** Shattered Crest / Brainy Bell are Compass & Chime drops, not Liminal Ascension's.

**Now confirmed (was flagged)**
- Landscourge Thunder = Earth Fiend Deity → Nameless General. The video description and the in-game text both name the trial.
- Abyssal Lament = Coffin Master → River Master (multiple videos, Fextralife, Game8, in-game text).
- Sorrow of Mortalbound = Twin Lions + Ghost Master. Yama's Seal = Dao Lord + God of Avarice.
- Daily reset 05:00 UTC+8. Skyward Bond Hard/Abyss tiers (official notes). Fledgling Protection, Dungeon Guide, Boss Dummy and the Nameless Sword change (official notes).
- Halcyon 1-1 wording, the Liminal mastery (34,000 is Cultivation; Game8's 3,400 is "Goose Mastery", a different stat), and the Snowfall's Ice Vines method (cut the tether; stacking is an alternative).

**New talent tables (in-game text)**
- Bell Toller, Feng Ruzhi, Snake Doctor, Nameless General, Coffin Master, River Master, Shadow Puppeteer, Drunk Martial Artist, Pocketrupt Circus.
- Moongazing Maiden and Guo Xin come from the Akira Y video via Where Guilds Meet, with partial Fextralife agreement.
- Wucan: 3 of 6 are known.
- Older realms list Fextralife's old-scheme talents without codes.

**Still open**
- Five Tones note (orange vs match the bell); Needles Upon Landing spacing.
- Ci and Cuo 1-3 and 2-3 thresholds: the in-game text says "more than four" and "fewer than 5", the guides say "at least four" and "no more than 5".
- Everdeer mist thresholds. Wucan 1-1, 1-2 and 2-1. The Ravening Banes meteor talent numbering.
- Reward amounts for the Lv 96 Hero's Realms: Game8 and the in-game data list different numbers.
- Energy cap (500 or 550). Breaking Army / Showdown frequency (one source). Guild War 30v30 (no official source).
- Nameless General mechanics come from callouts shared by all versions of the boss.

**Coverage after this pass:** full for Compass & Chime, Dragonscale Tamer, Segmented Puppets, Serpent's Fang, Liminal Ascension, Snowfall's Reckoning and Carnival Voyage. Partial for Landscourge Thunder, Abyssal Lament, Drunken Verse, Ravening Banes, Resounding Majesty, Bloodstained Sands, Yama's Seal, Sorrow of Mortalbound and Dream Jinming Pool. Stub for Blazing Gale Dance.

> The per-encounter sections further down were written before this pass; where they disagree with this section, this section wins.

---

## Merge with the guild notes (Nov 12)

Every item in `research-notes.md` was re-checked against a source I could read before it went in. Items I couldn't re-check are marked "from guild notes" on the site and flagged.

**New sources read for the merge:** allthings.how Lv 100 Veiled Lady & Halcyon guide; allthings.how Lv 96 Zheng E & Snowplum guide; SenseOS "Sword Trials and Hero's Realms in level order + team rules"; SenseOS world bosses; wherewindsmeet.org patch-notes history and Hutuo pages; official Oct 29 patch notes; Game8 Serpent's Fang guide.

**Couldn't read:** the Steam 2.3 overview and the official 2.3/2.4 overview pages, which load their text with JavaScript. They're listed as sources but count for nothing in the tables. No official "Oct 15 patch notes" URL exists on the news index; wherewindsmeet.org and SenseOS summarise that patch instead.

**Missing links:** two videos from the notes, "Lv 100 Sword Trial: Lodestar + Bell Toller" and "Compass & Chime full 5-player run", couldn't be found. Their names are kept in the Compass & Chime guild notes.

### Confirmed from the notes and added

| Item | Confirmed by |
|---|---|
| Release version and date for every Sword Trial and Hero's Realm | SenseOS list. Matches the notes' months in every case |
| Halcyon's six talents | allthings.how; Game8 independently gives 1-2 (bulls ≤ 15 s) and 2-3 (sum 9) |
| Colossal Blade, Heng Blade, portal markers 1/3 and 2/4, six Chirpy charges, five pillars, 34,000 mastery with a 36,803 sample clear | allthings.how (34,000 also from Where Guilds Meet) |
| Snowfall's: Sleeping Puppet, Five Tones colour cycle, Five-Chimes, 3 guqin + 3 protectors, ~35,673 / 30,000 mastery, "too slow and he restarts" | allthings.how |
| Points N Pixels videos with your timestamps (Lv 100, Lv 96 Snowfall's) | allthings.how |
| Serpent's Fang: two large fire snakes killed together, four small ones pulled with Flute, then an ice snake | Game8 (matches the notes) |
| Group features: Ready Check, matchmade-only AFK, tank request, Claim All (not appearance chests), Multiplayer Wooden Stake, VFX/umbrella settings | SenseOS + wherewindsmeet.org |
| Boss Dummy (Timed / Fixed-HP / Free) | SenseOS, Game8, Nerdschalk. **Added in 1.2, not Oct 15** |
| Dungeon Guide button | SenseOS (Apr 30), WWM Handbook. **Not Oct 15** |
| Nameless Sword not auto-tank | SenseOS (May 27 notes). **Not Oct 15** |
| Fledgling Protection | SenseOS (Jun 25 notes, matched Lv 91 runs). **Not Oct 15**; revive counts unpublished, flagged |
| Shield % on some bosses | SenseOS only |
| Guild War doesn't follow daylight saving | **Official Oct 29 notes.** Flag removed |
| Battle Pass weekly cap resets Mon 05:00 UTC+8 | Official Oct 29 notes, SenseOS |
| 2.3: Tier 100 Tuning/Attuning, Medicine Chest 18, Solo Mode 18 | wherewindsmeet.org, SenseOS |
| Mausoleum S5 needs Foundation Trial Ch 10, 60 stars, Basic/Mastery/Star buffs | SenseOS |
| Arena S5 modes incl. 2v2 and Perception Forest; Legend face accessory and pose | SenseOS |
| Transdust Ruins: Lv 20 + Sands of Perils, Solo/Trio all day | wherewindsmeet.org |
| Guild Hero's Realm talent tracking records reward counts | wherewindsmeet.org (2.2) |
| Engagement Realm, catch-up, Reflection Temple | SenseOS (+ wherewindsmeet.org for Reflection Temple) |
| Hutuo go-live window, boss descriptions, Legacy names, Dual Spears Nov 26 (Bellstrike - Bolt) | wherewindsmeet.org, which cites official X posts and the 2.4 Dev Letter |

### From the notes but not re-confirmed (flagged on the site)

- Campaign Challenges give martial art materials and targeted set gear (two pieces per run).
- Drunken Verse: one-healer strategy; bosses Puppeteer + Drunken Martial Artist (BitTopup also lists both, but it's a commercial source).
- Segmented Puppets: "neither boss dies to raw damage" (kept as a guild note).

### Where the notes and the sources disagree

| Topic | Guild notes | Sources | Site shows |
|---|---|---|---|
| S5 end | Nov 26 04:59 | Game8 / GameMarket: season to Jan 7; SenseOS: Nov 26 is the Arena half + Mausoleum Phase 1 end | Both. The countdown targets whichever is next (Nov 26 now) |
| Serpent's Fang bosses | "Snake Doctor + twin snakes" | Game8 + GameMarket: Wolf Maiden, then Snake Doctor | Wolf Maiden → Snake Doctor; the snakes are Snake Doctor's mechanics |
| Sorrow of Mortalbound Supreme bosses | Dao Lord + God of Avarice (verify) | Game8: Twin Lions + Ghost Master (and Dao Lord + God of Avarice on Yama's Seal) | Game8, flagged |
| Yama's Seal levels | 81 / 86 | SenseOS 81 / 86; Game8 86 / 86 | 81 / 86, flagged |
| Group features "added Oct 15" | All Oct 15 | Boss Dummy 1.2, Dungeon Guide 1.6, Nameless Sword 1.7, Fledgling 1.8 | Real dates |
| Ice Vines Entangle | Whole team stacks (or redirect a blade) | allthings.how agrees; Game8 says tethered pair spreads across the blast | Both, flagged |
| Five Tones note | Send orange | allthings.how: orange; Game8: match the bell's note | Both, flagged |
| Three Performances | Must be perfect | allthings.how agrees; Game8: better score = faster shield | Both |
| Halcyon 1-1 | Magnetic Storm / Vertical Swordcut | allthings.how's own text ties it to Magnetic Outburst | Table wording, flagged |
| Lv 100 Hero's Realm video credit | Points N Pixels | allthings.how: Points N Pixels; Where Guilds Meet: Akira Y | Both names |

---

## Patch / season (`patch.json`)

| Fact | Sources | Status |
|---|---|---|
| Version 2.3 "Friends From Afar", Oct 15 2026 | Game8 roadmap, Senseos, Patchbot | 2+ |
| Level cap 100 | Senseos ("stays at 100"), Game8 (Lv 100 content) | 2+ |
| Season 5 "Ever Aflame" ends Jan 7 2027 | Game8 seasons list, GameMarket | 2+. **End time (05:00) assumed** |
| Arena S5 first half + Mausoleum Phase 1 end Nov 26 04:59 | Senseos | 1 |
| Weekly reset Monday 05:00 UTC+8 | allthings.how, GameMarket | 2+ |
| Daily reset 05:00 UTC+8 | mein-mmo (22:00 German time = same moment in winter) | 1, flagged in note |
| 2.4 Hutuo on Nov 13; contents | Game8 roadmap, MMOHuts, Techgenyz, HappyGamer | 2+ |
| Dual Spears Nov 26 | Game8 roadmap, press | 2+ |
| No new Sword Trial / Hero's Realm in 2.4 | No announcement mentions one | Absence of evidence. Check after patch |

**Conflicts**
- Version 2.0 is officially dated Jul 23 2026, but Game8's season table labels Season 4 (Jul 23) as "2.2 Perilous Eminence". The 2.2 date in the changelog is marked `?`.
- Game8 mastery figures are "Goose mastery". Where Guilds Meet gives "Cultivation" numbers 10× larger (3,400 vs 34,000). These are probably different stats, so both are shown.

---

## Sword Trials

### Compass & Chime (Lv 100, 2.3), partial
- **Sources:** Game8 guide, Where Guilds Meet (Akira Y), Senseos (exists, 5-player, Lv 100).
- **2+ sources:** name, level, 5 players, release with 2.3, boss order Lodestar → Bell Toller, the Lodestar chain mechanics (charge block, Charge Strike chained to the boss, pull-down from the air).
- **1 source:** all Bell Toller mechanics (Game8). All six Lodestar talents (Where Guilds Meet). Party comp and the 29,000 Cultivation / 2,800 attack figure.
- **Flagged:** talent 1-3 wording. Bell Toller boss.
- **Open questions:** Bell Toller's six talents. Do Where Guilds Meet's six talents all belong to Lodestar? The site files them there. Where Guilds Meet notes the video and the game word talent 2-1 differently.

### Dragonscale Tamer (Lv 96), partial
- **Sources:** Game8, allthings.how, Where Guilds Meet (Akira Y).
- **2+ sources:** bosses are **Horse Tamer then Feng Ruzhi (confirmed by all three)**. Ground Slam redirect, Poison Wave interrupt, Consecutive Jumps, Chase Phase. Horse Tamer talents 1-1, 1-2, 1-3 (all three sources), and 2-1, 2-2, 2-3 (Where Guilds Meet codes + Game8 text).
- **1 source:** every Feng Ruzhi mechanic (Game8). Feng Ruzhi talent text (Game8, four talents, no codes). Tai Chi requirement.
- **Flagged:** Feng Ruzhi boss and talents. Release version.
- **Open questions:** Feng Ruzhi's talent codes and her two missing talents. The charge's name: Game8 says "Relentless Charge", Where Guilds Meet says "Brutal Charge". Release version (guides first dated Jul 23 2026, the 2.0 date).

### Segmented Puppets (Lv 96), full
- **Sources:** allthings.how (one article fetched under two URLs, so it counts once), Where Guilds Meet (Akira Y), Points N Pixels video (linked via allthings.how).
- **2+ sources:** all six Ironheart Centipede talents. Disarm drops four arms. Remains and Crushing duties.
- **1 source:** all six Ci and Cuo talents and puppet mechanics (allthings.how). Party role split.
- **Sources disagree:** talent 2-1 says "first armed phase" in allthings.how but just "armed state" in Where Guilds Meet. Where Guilds Meet counts 2-3's limits "per phase change".
- **Open questions:** release version (guide dated Sep 4 2026).

### Serpent's Fang (Lv 91, 1.6), partial
- **Sources:** GameMarket, Where Guilds Meet (Akira Y), allthings.how 1.6 weekly checklist.
- **2+ sources:** Lv 91, added in 1.6, weekly cap of 5 Fang + 5 Serpent chests with no Energy cost, Monday reset.
- **1 source:** all mechanics (GameMarket). All talents (Where Guilds Meet).
- **Sources disagree:** GameMarket says turn into a wolf in the mist to dodge Chasing Moon. Where Guilds Meet says time Soaring Spin at about 95% to avoid turning at all, and warns the wolf route may fail talent 1-3.
- **Flagged:** Wolf Maiden talents, because the boss split is unclear.
- **Open questions:** Snake Doctor talents. Which boss owns each talent.

### Landscourge Thunder (Lv 91), partial
- **Sources:** Where Guilds Meet (Akira Y, CN preview) only.
- **Assumption:** no source names "Landscourge Thunder" next to its bosses. We matched it to the **Earth Fiend Deity & Nameless General** Lv 91 trial because Serpent's Fang is the only other Lv 91 trial. **Check the name in game.**
- **1 source:** rock mechanics and six talents (Earth Fiend Deity, probably).
- **Open questions:** Nameless General mechanics and talents. Release version.

### Abyssal Lament (Lv 86), stub
- **Sources:** one BoostRoom listing (bosses: Coffin Master + River Master). Weak.
- **Open questions:** everything. No source confirms Lv 86.

### Drunken Verse (Lv 81), stub
- **Sources:** BitTopup, which names "Drunk Martial Artist (Trial)" as a Lv 81 Sword Trial boss. Weak, and it never uses the name "Drunken Verse".
- **Open questions:** trial name, second boss (the same source also lists Puppeteer / Sheng Wu at Lv 81), mechanics.

---

## Hero's Realms

### Liminal Ascension (Lv 100, 2.3), now full (see the merge section: Halcyon talents, Colossal / Heng Blade). The original notes below are kept for history
- **Sources:** Game8 guide, Game8 Hero's Realm list, Where Guilds Meet (Akira Y), Senseos.
- **2+ sources:** name, level, 10 players, 2.3 release, bosses Bai Chuyu → Halcyon, the portal pair, Blossoms / Ablaze buffs, Twin Vines sharing, Heaven Cleaver / Blazing Cleave into the gate.
- **1 source:** Halcyon mechanics (Game8). Bai Chuyu talents (Where Guilds Meet). Party comp 6/3/1. Badge and title rewards.
- **Sources disagree:** mastery is 3,400 (Game8) vs 34,000 Cultivation + 2,800 attack (Where Guilds Meet). Both are shown.
- **Flagged:** Halcyon talents. Game8 gives two conditions (9 per side; both bulls dead within 15 s) without codes.
- **Open questions:** Halcyon's codes and her other four talents. The Chirpy button on console (G on PC).

### Snowfall's Reckoning (Lv 96), full
- **Sources:** Game8 guide, Game8 list, Where Guilds Meet (Akira Y).
- **2+ sources:** all six Zheng'e talents (identical in both). Healer Cloudburst rotation. Fire Arrows on flowers. 20-stack death. Lion's Roar requirement.
- **1 source:** all six Snowplum Requiem talents and its mechanics (Game8).
- **Naming differences inside Game8:** "Ice Blade Burst" vs "Ice Blade Explosion", and "Five Tone" vs "Five Notes Harmony". Both names are shown.
- **Open questions:** release version (Game8 page dated Sep 22 2026).

### Carnival Voyage (Lv 96), partial
- **Sources:** Game8 guide, Game8 list, Where Guilds Meet (Akira Y), a YouTube summary of the same Akira Y video (not independent).
- **2+ sources:** Wandering Ark phase 1 (pillars, burning leg, Guardian + vines) and phase 2 (three Moon Fragments, ballista, sandstorm high ground). Pocketrupt Circus mechanics (Game8 + video summary). The five-player Zhuge Ha cloud team.
- **1 source:** Wandering Ark talents (Where Guilds Meet). Talent 2-1 is reported bugged on CN.
- **Open questions:** **Pocketrupt Circus talents (none found).** Release version. Does the Wandering Ark encounter still behave the same post-2.3?

### Ravening Banes (Lv 91), partial
- **Sources:** Game8 guide, Game8 list, Where Guilds Meet (Akira Y).
- **2+ sources:** protect the light (Mingguang / "Bright Light"; wipe if it dies). Break at least two Sentinel Walls per set or wipe.
- **1 source:** the rest of the Howlion and Wucan mechanics (Game8). Talents (Where Guilds Meet).
- **Flagged:** meteor talent numbering. The video's narration says 1-x, its chapters say 2-x.
- **Open questions:** Wucan talents. Where Guilds Meet notes a conflicting Wucan 2-2 requirement we couldn't see.

### Resounding Majesty (Lv 91, 1.7), partial
- **Sources:** Game8 guide, Game8 1.7 patch summary, Where Guilds Meet (Akira Y).
- **2+ sources:** added in 1.7 on May 28 2026. Lamp + orb loop. Move the lamp when it's targeted. Long Night at 0%.
- **1 source:** Moongazing Maiden mechanics (Game8). Everdeer talents (Where Guilds Meet).
- **Flagged:** mist-stack thresholds for 1-1/1-2/1-3 (values not given).
- **Open questions:** Moongazing Maiden talents.

### Bloodstained Sands + Supreme (Lv 86 / 91), partial
- **Sources:** Game8 guide, Game8 list, Where Guilds Meet (Akira Y), allthings.how 1.6 checklist (Supreme at Lv 91).
- **2+ sources:** levels 86 / 91. Tian Ying stomp jump. Staff safe zone.
- **1 source:** Guo Xin mechanics (Game8). Tian Ying talents (Where Guilds Meet). Talent 2-3 is reported bugged on CN.
- **Open questions:** what changes in Supreme. Guo Xin talents.

### Yama's Seal + Supreme, stub
- **Sources:** Game8 list only.
- **Sources disagree:** your guild's brief says 81 / 86. Game8 lists both tiers at **86** (2,300 mastery). Flagged.

### Sorrow of Mortalbound + Supreme (Lv 81), stub
- **Sources:** Game8 list (Twin Lions, Ghost Master, 2,000 mastery). 1 source.

### Blazing Gale Dance (71), Dream Jinming Pool (56 / 66), stubs
- **Sources:** Game8 list. Legacy content, added only to complete the tables.

---

## Guild & team content (`activities.json`)

| Activity | Sources | 2+ confirmed | 1 source / flagged | Open questions |
|---|---|---|---|---|
| Skyward Bond | Game8 1.7 summary, GameSpace, Topuplist, 6 YouTube videos | Lv 95, up to 10 guild members, added 1.7, floors 1–5 at launch, Guild + Personal first-clear rewards | Hard / Abyss tiers in 1.8 (Topuplist + video titles only). Giftbox link to Guild Hero's Realm (Game8) | Per-floor bosses and mechanics, time limits. **No written floor guide exists, so the guild should write its own.** |
| Guild Hero's Realm | Nerdschalk, Game8 1.7 | Weekly | Everything else | Bosses, size. Is it the same as "Path of the Hero"? |
| Breaking Army / Guild Showdown | Nerdschalk | — | 2× weekly each, Activity Points | Format and times |
| Guild War | Official Apr 30 notice, Guild Order wiki, allthings.how | Sat & Sun 20:30 battlegroup time, per-battlegroup UTC offsets | 30v30 (allthings.how only) | **"No DST shift"** is inferred from the fixed offsets; the notice never says it. Check the War Board after the clocks change. |
| Transdust Ruins | GameMarket, Topuplist | Sep 23 06:00 UTC+8 launch, solo or trio, four phases, Safety Case | Rewards list, tools | Permanent or limited? Unlock level? |
| Co-op Campaign Challenges | allthings.how | — | Qinchuan re-challenges only | No source describes a co-op "Campaign Challenge" mode. Clarify what the guild means. |
| World bosses | allthings.how ×2, Altchar, Game8, MMOHuts | Wandering Ark location, 1.7 boss names | Snowplum Requiem weekly payout (the source contradicts itself) | — |
| Hutuo: campaign, Horse Racing Chess, Jianghu Tactics, Wayfarer Bingshen, Yelu Abuli | Game8 roadmap, MMOHuts | Names, Nov 13 date | Mode descriptions | Not out yet. Player counts and mechanics after release. |
| Arena | Official Apr 30 notice, Senseos | — | Times are official | — |
| Taiping Mausoleum | Game8, Senseos | Phase 1 end date | — | — |

## Things to check in game first

1. Is **Landscourge Thunder** really the Earth Fiend Deity / Nameless General trial? Also check the bosses for Abyssal Lament, Drunken Verse and Sorrow of Mortalbound Supreme.
2. **Talent codes** for Feng Ruzhi, Bell Toller, Pocketrupt Circus, Snake Doctor, Wucan, Moongazing Maiden and Guo Xin. Read them off the in-game talent panel and fill them in.
3. **Snowfall's Reckoning:** Ice Vines (stack or spread?), and whether the Five Tones note is always orange.
4. **Mastery numbers:** the ~34,000 / 35,673 figures vs Game8's 3,400 / 3,000.
5. **Yama's Seal** level: 81 or 86.
6. **Season end:** does S5 end Nov 26 or Jan 7? Also check the daily reset time.
7. Console button names for "interact" (F on PC) and the Chirpy device (G on PC).
8. After Hutuo goes live (Nov 13, 23:00 UTC+8): any new Sword Trial or Hero's Realm, and when the two world bosses actually arrive.
