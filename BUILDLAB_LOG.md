# Build Lab research log

Game version **2.3** (Friends From Afar). Data checked **2026-11-12**. Build Lab is for estimated *relative* ratings, not in-game numbers.

## How the data was collected

- **Paths and weapon pairs:** wherewindsmeetgame.org Build Planner (Oct 15, 2026), which links an official notice for each pair: 8 name both weapons, 3 name one (Splendor, Jade, Might). Game8 weapon pages for key skills.
- **Inner Way tiers:** Game8's page for each of the 60 Inner Ways (six-tier table). Each page's last-updated date is stored in `inner-ways.json → sources[].pageUpdated`. 46 of the 60 pages predate Version 2.0 (Jul 23, 2026); those Inner Ways are flagged.
- **Inner Way base effects, rarity, path, how to get:** Bloxodes "All 60 Inner Ways" (updated Nov 7, 2026). It's newer than most Game8 pages, so it's used for the base effect. Its numbers match Game8's base text for 37 of 60. Most of the rest are Game8 showing a higher-tier text as the base, and a few are real changes (listed below).
- **Recommended builds:** wherewindsmeetgame.org build guides (Oct–Nov 2026) and Game8 build pages (Sep–Oct 2026).
- **Damage model:** wherewindsmeetgame.org damage calculator (hit order, 80% / 40% caps; our model reproduces its 3,942 example), plus the community penetration formula on ratz-gg.net and wherewindsmeetcalculator.com.
- **Weapon swaps:** wherewindsmeetgame.org cites the official 2.0 overview: weapon martial arts can be paired freely. No source gives a general penalty. A Steam discussion post says a path's own attribute bonuses count 150% vs 100% for other paths after breakthrough 3. That's one player's reading, so it's **not modeled**, only shown as a warning.
- **Not reachable from this session:** `wherewindsmeet.gamertw.com` (a per-Inner-Way database turned up in search) couldn't be fetched, so it isn't used as a second tier source.

### What "confirmed" means here

- **2+ sources:** the number appears in two independent sources I read (Game8 + Bloxodes for base effects; Game8 + another site for tiers). Game8 build pages repeating Game8 tier text count as the same source.
- **1 source:** only Game8's tier table. This is most tier values. Every tier from Tier 1 to 6 has a Game8 number except where noted.
- **Missing / conflict:** no readable number, or sources disagree (both shown in the data).

## Recommended builds: sources per path

### Bellstrike - Splendor: Sword Morph volley (PvE)

- Weapons: Nameless Sword, Nameless Spear
- Inner Ways: Sword Morph, Battle Anthem, Morale Chant, Mountain's Might
- Gear: Jadeware or Hawkwing / Formbend
- Agreement: Both sources list the same four Inner Ways. They disagree on the weapon set: wherewindsmeetgame.org leads with Hawkwing, Game8 with Jadeware.
- Source: [wherewindsmeetgame.org: Nameless Sword build (checked Nov 5, 2026, Version 2.3)](https://www.wherewindsmeetgame.org/guides/where-winds-meet-nameless-sword-build-guide)
- Source: [Game8: Nameless Spear and Nameless Sword (Bellstrike Splendor) Build (updated Sep 3, 2026)](https://game8.co/games/Where-Winds-Meet/archives/564826)
- Damage mix (estimate): Estimate: Vagrant Sword's sword-energy volleys carry the path (wherewindsmeetgame.org Nameless Sword build).
- Reference stats: Affinity build targets from the Nameless Sword guide; attack, Crit/Affinity DMG and penetration from a Sep 2026 sample build on the same site.

### Bellstrike - Umbra: Bleed burst (PvE)

- Weapons: Strategic Sword, Heavenquaker Spear
- Inner Ways: Sword Horizon, Wolfchaser's Art, Morale Chant, Insightful Strike
- Gear: Hawkwing / Flawless Defense
- Agreement: Both sources list the same four Inner Ways and Hawkwing + Flawless Defense.
- Source: [wherewindsmeetgame.org: Strategic Sword build (checked Oct 8, 2026)](https://www.wherewindsmeetgame.org/guides/where-winds-meet-strategic-sword-build-guide)
- Source: [Game8: Strategic Sword and Heavenquaker Spear (Bellstrike Umbra) Build (updated Sep 3, 2026)](https://game8.co/games/Where-Winds-Meet/archives/564771)
- Damage mix (estimate): Estimate: Bleed and High Bleeding bursts plus Strategic Sword specials (both build guides).
- Reference stats: Sample PvE build after 2.2 on wherewindsmeetgame.org: 1,318–4,240 attack, 71.4% combined Crit+Affinity, 2.3% Direct Affinity, +50% Crit DMG, +40.2% Affinity DMG, 47.9 penetration. The Crit/Affinity split is our guess.

### Bamboocut - Wind: Rodents and Flamelash (PvE)

- Weapons: Infernal Twinblades, Mortal Rope Dart
- Inner Ways: Echoes of Oblivion, Vendetta, Morale Chant, Breaking Point
- Gear: Hawkwing / Eaglerise
- Agreement: Three Inner Ways agree. Fourth slot: wherewindsmeetgame.org (Nov 5, 2026) picks Breaking Point, Game8 (Sep 3) picks Vital Leech. We use Breaking Point, the newer pick; Vital Leech is the listed alternative.
- Source: [wherewindsmeetgame.org: Dual Blades build (checked Nov 5, 2026, Version 2.3)](https://www.wherewindsmeetgame.org/guides/where-winds-meet-dual-blades-build-guide)
- Source: [Game8: Infernal Twinblades and Rope Dart (Bamboocut Wind) Build (updated Sep 3, 2026)](https://game8.co/games/Where-Winds-Meet/archives/564889)
- Damage mix (estimate): From wherewindsmeetgame.org's Lv 96 Sword Trial breakdown: Rodent Rampage 40.1%, Blade of Heaven's Wrath 31.2%, Rodent Hunt 12.0% (Rodent Hunt comes from Vendetta Tier 3, so it's left out of the base mix and added by that Inner Way).
- Reference stats: Rate targets from the Dual Blades build guide.

### Bamboocut - Dust: Phantom umbrellas (PvE)

- Weapons: Everspring Umbrella, Unfettered Rope Dart
- Inner Ways: Morale Chant, Phantom Rally, Towline Sweep, Song of Tang
- Gear: Stars Align / Calmwaters
- Agreement: Both sources list the same four Inner Ways and Stars Align + Calmwaters.
- Source: [wherewindsmeetgame.org: Umbrella build (checked Oct 8, 2026)](https://www.wherewindsmeetgame.org/guides/where-winds-meet-umbrella-build-guide)
- Source: [Game8: Unfettered Rope Dart and Everspring Umbrella (Bamboocut Dust) Build (updated Sep 3, 2026)](https://game8.co/games/Where-Winds-Meet/archives/582577)
- Damage mix (estimate): Estimate: phantom umbrella resonance, Scarlet Spin and rope-dart specials (Umbrella build guides).
- Reference stats: No published rate targets; generic Lv 100 profile.

### Bamboocut - Kite: Vile Condemned burst (PvE)

- Weapons: Heavenwill Gauntlets, Skygrasp Rope Dart
- Inner Ways: Soaring High, Morale Chant, Sky Gripped, Empirical Edge
- Gear: Etherwrath / Honorbound
- Agreement: One source (Game8). wherewindsmeetgame.org rates the path but has no build guide for it.
- Source: [Game8: Heavenwill Gauntlets and Skygrasp Rope Dart (Bamboocut - Kite) Build (updated Sep 3, 2026)](https://game8.co/games/Where-Winds-Meet/archives/612145)
- Damage mix (estimate): Estimate: Vile Condemned (charged) and Falcon's Pursuit (triggered) carry the path (Game8 Kite build).
- Reference stats: Game8 puts Precision then Critical Rate first; generic numbers.

### Bamboocut - Draught: Deepdaze loop (PvE)

- Weapons: Skystrike Gauntlets, Riven Twinblades
- Inner Ways: Eonpour, Skyspeak, Mistwing, Morale Chant
- Gear: Tiltrim / Brimflow
- Agreement: One source (Game8).
- Source: [Game8: Skystrike Gauntlets and Riven Twinblades (Bamboocut - Draught) Build (updated Oct 15, 2026)](https://game8.co/games/Where-Winds-Meet/archives/618351)
- Damage mix (estimate): Estimate: three enhanced gauntlet Heavy Attack sequences in Deepdaze, then the Twinblades (Game8 Draught build).
- Reference stats: Min-attack build; Game8 gives no rate targets.

### Silkbind - Jade: Projectile pressure (PvE)

- Weapons: Vernal Umbrella, Inkwell Fan
- Inner Ways: Blossom Barrage, Morale Chant, Star Reacher, Thunderous Bloom
- Gear: Mistwillow / Flawless Defense
- Agreement: One source for PvE (Game8). wherewindsmeetgame.org only has a PvP guide for this path.
- Source: [Game8: Vernal Umbrella and Inkwell Fan (Silkbind Jade) Build (updated Sep 3, 2026)](https://game8.co/games/Where-Winds-Meet/archives/564879)
- Source: [wherewindsmeetgame.org: Silkbind - Jade PvP build (PvP only) (checked 2026)](https://www.wherewindsmeetgame.org/guides/where-winds-meet-silkbind-jade-pvp-build)
- Damage mix (estimate): Estimate: projectile skills (Let Spring Go, Everbloom, umbrella Light Attack, Spring Away) do most of the work (Game8 Jade build).
- Reference stats: Game8's Hawkwing targets: ~16% Affinity and 75.3% Critical Rate.

### Silkbind - Deluge: Healer (PvE)

- Weapons: Panacea Fan, Soulshade Umbrella
- Inner Ways: Royal Remedy, Restoring Blossom, Mending Loom, Morale Chant
- Gear: Ivorybloom / Eaglerise
- Agreement: Both sources list the same four Inner Ways and Ivorybloom + Eaglerise.
- Source: [wherewindsmeetgame.org: Healer build (checked Nov 5, 2026, Version 2.3)](https://www.wherewindsmeetgame.org/guides/where-winds-meet-healer-build-guide)
- Source: [Game8: Panacea Fan and Soulshade Umbrella (Silkbind Deluge) Build (updated Sep 3, 2026)](https://game8.co/games/Where-Winds-Meet/archives/564719)
- Damage mix (estimate): Estimate: healers deal most of their damage with Mystic Arts between heals (healer guide).
- Reference stats: Critical Rate at the 80% cap (healer guide); Critical Healing Bonus includes Ivorybloom's +15.

### Silkbind - Wings: Radiant Drum support (PvE)

- Weapons: Museflow Waist Drum, Willowbend Fan
- Inner Ways: Harmony Song, Zephyr Whispers, Ink and Strings, Morale Chant
- Gear: Cloudshear / Reinchime
- Agreement: One source (Game8, Oct 16, 2026). The path is new in 2.3 and wherewindsmeetgame.org hasn't published a build yet.
- Source: [Game8: Museflow Waist Drum and Willowbend Fan (Silkbind - Wings) Build (updated Oct 16, 2026)](https://game8.co/games/Where-Winds-Meet/archives/631913)
- Damage mix (estimate): Estimate: Waist Drum melodies and Drumbeat skills, with End of Gale (Game8 Wings build).
- Reference stats: New in 2.3; no published stat targets. Generic profile.

### Stonesplit - Might: Mo Blade tank (PvE)

- Weapons: Thundercry Blade, Stormbreaker Spear
- Inner Ways: Morale Chant, Exquisite Scenery, Adaptive Steel, Throat-Piercing Art
- Gear: Rainwhisper / Formbend
- Agreement: Both sources list the same four Inner Ways and Rainwhisper + Formbend.
- Source: [wherewindsmeetgame.org: Mo Blade build (checked Oct 8, 2026)](https://www.wherewindsmeetgame.org/guides/where-winds-meet-mo-blade-build-guide)
- Source: [Game8: Thundercry Blade and Stormbreaker Spear (Stonesplit - Might) Build (updated Sep 3, 2026)](https://game8.co/games/Where-Winds-Meet/archives/564797)
- Damage mix (estimate): About 86% of this path's boss damage comes from critical hits, mostly charged attacks (Mo Blade guide, Lv 96 Sword Trial).
- Reference stats: Mo Blade guide targets: 100% Precision, ~56% Critical Rate, ~15.4% Affinity.

### Stonesplit - Strength: Phalanxbane focus (PvE)

- Weapons: Snowparting Blade, Phalanxbane Blade
- Inner Ways: Frost-Clad Night, Throat-Piercing Art, Morale Chant, Steadfast Devotion
- Gear: Shattered Ridge / Obsidian Armor
- Agreement: Both sources list the same four Inner Ways and Shattered Ridge + Obsidian Armor.
- Source: [wherewindsmeetgame.org: Stonesplit - Strength build (checked Oct 7, 2026)](https://www.wherewindsmeetgame.org/guides/where-winds-meet-stonesplit-strength-build)
- Source: [Game8: Snowparting Blade and Phalanxbane Blade (Stonesplit Strength) Build (updated Sep 3, 2026)](https://game8.co/games/Where-Winds-Meet/archives/589037)
- Damage mix (estimate): Estimate for the Phalanxbane focus: Burning Heart (charged) and Snowbreak Spring (Varied Combo).
- Reference stats: Pure Hengblade/HengMo targets: 100% Precision, 80% Critical, ~11% Affinity (Stonesplit Strength guide).

### Bellstrike - Bolt (upcoming)

Dual Spears (Light and Heavy Spears) arrive Nov 26, 2026. Build Lab will add this path once its Inner Ways are published.

## Inner Ways: tier confirmation

T0 = base effect. ✅ 2+ sources · ① 1 source (Game8) · ⚠ conflict · ✗ missing. "Solo" = Tier 2's stat that scales with Solo Mode level (no values published anywhere; unmodeled).

| Inner Way | Path | Game8 page dated | T0 | T1 | T2 | T3 | T4 | T5 | T6 | Notes |
|---|---|---|---|---|---|---|---|---|---|---|
| Steadfast Stance | General | 2026-02-19 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Evening Snow | General | 2026-02-20 | ① | ① | Solo | ① | ① | ① | ① |  |
| Divine Roulette | General | 2026-06-03 | ① | ① | Solo | ① | ① | ① | ① |  |
| Bitter Seasons | General | 2026-02-19 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Invigorated Warrior | General | 2026-02-19 | ✅ | ✅ | Solo | ① | ✅ | ① | ① | T1: wherewindsmeetgame.org Strength guide: 3% extra damage taken<br>T4: same guide: +8% damage and healing |
| Wind Beneath Wings | General | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ✗ | T6: Game8's page shows an error instead of the Tier 6 text. |
| Fury Harvest | General | 2026-02-19 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Vital Leech | General | 2026-02-19 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Shadow Assault | General | 2026-02-20 | ① | ① | Solo | ① | ① | ① | ① |  |
| Fivefold Bleed | General | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Evasive Charge | General | 2026-02-19 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Seasonal Edge | General | 2026-06-03 | ① | ① | Solo | ① | ① | ① | ① |  |
| Morale Chant | General | 2026-02-19 | ✅ | ① | Solo | ① | ① | ✅ | ① | T5: NerdsChalk and Gamezebo (via search) also give 4.6% Direct Critical Rate |
| Heart of Fire | General | 2026-09-22 | ① | ① | Solo | ① | ① | ① | ① |  |
| Sword Morph | Bellstrike - Splendor | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Battle Anthem | Bellstrike - Splendor | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Mountain's Might | Bellstrike - Splendor | 2026-06-03 | ⚠ | ① | Solo | ① | ① | ① | ① | T0: Base: Game8 (Mountain Sweep, 5s) vs Bloxodes (Qiankun's Lock, 10s, extra 10% on Sprint/Charged). Using Bloxodes. |
| Wildfire Spark | Bellstrike - Splendor | 2026-02-19 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Sandswirl Tail | Bellstrike - Splendor | 2026-03-07 | ① | ① | Solo | ① | ① | ① | ① |  |
| Sword Horizon | Bellstrike - Umbra | 2026-06-03 | ✅ | ① | Solo | ✅ | ① | ① | ① | T3: wherewindsmeetgame.org Strategic Sword guide describes the guaranteed-Affinity High Bleeding |
| Wolfchaser's Art | Bellstrike - Umbra | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ⚠ | T6: Game8: Wine Gu needs 5 hits in 3s. Official 2.0 notes (via wherewindsmeetgame.org): 3 hits, and Soul-Shaken on any target. |
| Insightful Strike | Bellstrike - Umbra | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Adaptive Steel | Bellstrike - Umbra | 2026-06-03 | ① | ① | Solo | ① | ① | ① | ① |  |
| Echoes of Oblivion | Bamboocut - Wind | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Vendetta | Bamboocut - Wind | 2026-06-03 | ⚠ | ① | Solo | ① | ① | ① | ① | T0: Base: Game8 says the token lasts 5s longer; Bloxodes says 15s and includes the rats. |
| Breaking Point | Bamboocut - Wind | 2026-02-20 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Riptide Reflex | Bamboocut - Wind | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Phantom Rally | Bamboocut - Dust | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Towline Sweep | Bamboocut - Dust | 2026-06-03 | ① | ① | Solo | ① | ① | ① | ⚠ | T6: Game8: Soulbreak multiplier 10%. Official 2.3 notes (via wherewindsmeetgame.org): 12%. Text shows 12%; doesn't affect the rating. |
| Song of Tang | Bamboocut - Dust | 2026-03-06 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Light Anew | Bamboocut - Dust | 2026-06-03 | ① | ① | Solo | ① | ① | ① | ① |  |
| Soaring High | Bamboocut - Kite | 2026-07-23 | ① | ① | Solo | ① | ① | ① | ① |  |
| Sky Gripped | Bamboocut - Kite | 2026-07-23 | ① | ① | Solo | ① | ① | ① | ① |  |
| Empirical Edge | Bamboocut - Kite | 2026-07-23 | ① | ① | Solo | ① | ① | ① | ① |  |
| Celestial Vigor | Bamboocut - Kite | 2026-07-23 | ① | ① | Solo | ① | ① | ① | ① |  |
| Eonpour | Bamboocut - Draught | 2026-09-03 | ① | ① | Solo | ① | ① | ① | ① |  |
| Skyspeak | Bamboocut - Draught | 2026-09-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Mistwing | Bamboocut - Draught | 2026-09-03 | ① | ① | Solo | ① | ① | ① | ① |  |
| Volutefit | Bamboocut - Draught | 2026-09-03 | ① | ① | Solo | ① | ① | ① | ① |  |
| Blossom Barrage | Silkbind - Jade | 2026-02-19 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Star Reacher | Silkbind - Jade | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Thunderous Bloom | Silkbind - Jade | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Flying Gourds | Silkbind - Jade | 2026-02-19 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Light and Shadow Alike | Silkbind - Jade | 2026-06-15 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Royal Remedy | Silkbind - Deluge | 2026-02-19 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Restoring Blossom | Silkbind - Deluge | 2026-06-03 | ① | ① | Solo | ① | ① | ① | ① |  |
| Mending Loom | Silkbind - Deluge | 2026-02-20 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Esoteric Revival | Silkbind - Deluge | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Harmony Song | Silkbind - Wings | 2026-10-15 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Zephyr Whispers | Silkbind - Wings | 2026-10-15 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Ink and Strings | Silkbind - Wings | 2026-10-15 | ① | ① | Solo | ① | ① | ① | ① |  |
| Blade's Will | Silkbind - Wings | 2026-10-15 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Exquisite Scenery | Stonesplit - Might | 2026-06-03 | ⚠ | ① | Solo | ① | ① | ① | ① | T0: Base: Game8 shows the pre-2.0 Cadence (15s, 1 stack). Bloxodes and the 2.0 notes (via wherewindsmeetgame.org) say 20s, 2 stacks. Using 2.0 values. |
| Art of Resistance | Stonesplit - Might | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Rock Solid | Stonesplit - Might | 2026-02-20 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Trapped Beast | Stonesplit - Might | 2026-06-03 | ✅ | ① | Solo | ① | ① | ① | ① |  |
| Frost-Clad Night | Stonesplit - Strength | 2026-08-03 | ① | ① | Solo | ① | ① | ① | ① |  |
| Steadfast Devotion | Stonesplit - Strength | 2026-06-03 | ✅ | ① | Solo | ⚠ | ① | ① | ① | T3: Game8: guaranteed crits at 70% final Critical Rate. wherewindsmeetgame.org: 75%. |
| Throat-Piercing Art | Stonesplit - Strength | 2026-06-03 | ✅ | ✅ | Solo | ① | ✅ | ① | ① | T1: wherewindsmeetgame.org Strength guide: 15s<br>T4: same guide: up to five stacks |
| Wildfire Surge | Stonesplit - Strength | 2026-05-11 | ① | ① | Solo | ① | ① | ① | ① |  |

## Flags carried in the data

Every Inner Way with `needsVerification: true` lists its reasons in `verifyNotes` (shown as ⚠ on the page). Ones that aren't just "Game8 page is older than 2.0":

- **Evening Snow:** Game8's base text says 3% HP per second; Bloxodes (newer) says 2% and Game8's own Tier 1 says it rises to 3%. Using 2% as the base.
- **Invigorated Warrior:** Tier 6 wording is ambiguous; assumed it keeps the bonus on against a marked boss.
- **Wind Beneath Wings:** Tier 6 text is missing (Game8 page error). Check in game.
- **Shadow Assault:** Base heal: Game8 says 10%, Bloxodes (newer) says 5%; Game8's Tier 1 raising it to 10% suggests 5% is the base.
- **Seasonal Edge:** Expected buffs per cast assume Tier 6 keeps Tier 3's two-buff chance: 60% one, 20% two, 15% three, 5% four.
- **Mountain's Might:** Base text differs: Game8 (Jun 2026) ties it to Mountain Sweep, 5s; Bloxodes (Nov 2026) to Qiankun's Lock, 10s. Using Bloxodes. Endurance only, so it doesn't change ratings.
- **Sword Horizon:** Version 2.0 (Jul 23) changed Tier 3. Game8's tier table is dated Jun 3, 2026.
- **Wolfchaser's Art:** Version 2.0 (Jul 23) changed Tier 6 (Soul-Shaken on any target; Wine Gu needs 3 hits instead of 5). Game8's table still says 5 hits.
- **Adaptive Steel:** Weapon Mastery details come from Bloxodes (Nov 2026); Game8 lists only the cooldowns. Mastery uptime is a guess (the swap window).
- **Echoes of Oblivion:** 2.3 balance notice mentions Bamboocut - Wind Inner Way changes without numbers; check tiers in game.
- **Vendetta:** Base duration conflict: Game8 says the token lasts 5s longer, Bloxodes says 15s longer and includes the rats. Both shown; it only affects uptime. 2.3 balance notice mentions Bamboocut - Wind Inner Way changes without numbers.
- **Towline Sweep:** Official 2.3 notes raised Tier 6 Soulbreak settlement from 10% to 12% (per wherewindsmeetgame.org); Game8's table still shows 10%.
- **Song of Tang:** Game8's page for this Inner Way was last updated Mar 6, 2026 (before Version 2.0).
- **Soaring High:** Game8's summary also mentions turning up to 12% Affinity into Direct Critical Rate; Bloxodes doesn't. Not counted until confirmed.
- **Sky Gripped:** Base: Game8 is vague; Bloxodes gives +10% and 15s. Using Bloxodes.
- **Empirical Edge:** Game8 says Physical and Attribute Penetration; Bloxodes (newer) says Attribute only. Only the Tier 6 physical part is counted.
- **Blossom Barrage:** Game8's page was last updated Feb 19, 2026 (before Version 2.0).
- **Royal Remedy:** Game8's page is dated Feb 19, 2026; its build page uses newer text (heals +10% and 3 Dew + 2 Essence). Check Tier 1 in game.
- **Restoring Blossom:** Game8's base text already includes higher-tier values (10s, 6 stacks); Bloxodes gives the base (6s, 3 stacks). Using Bloxodes for the base.
- **Mending Loom:** Game8's page is dated Feb 20, 2026 (before Version 2.0).
- **Exquisite Scenery:** Version 2.0 (Jul 23) changed Cadence to 20s and 2 stacks (Bloxodes has this). Game8's table is dated Jun 3, 2026.
- **Steadfast Devotion:** Tier 3 threshold conflict: Game8's tier table says 70% final Critical Rate, wherewindsmeetgame.org's Strength guide says 75%. The model uses 70%.
- **Wildfire Surge:** Game8's page is dated May 11, 2026 (before Version 2.0).

## Open questions to check in game

- **Tier 1 at unlock?** Bloxodes says unlocking gives Tier 1; Game8's Adaptive Steel text mentions "Tier 0". Build Lab assumes Tier N includes the Tier 1..N bonuses. Check a freshly unlocked Inner Way's tooltip.
- **Solo Mode level stats (every Inner Way's Tier 2).** Read the actual Max/Min Attack, Crit Rate etc. at Solo Mode Lv 18 off the tooltip, so they can be modeled.
- **Pre-2.0 tier tables.** 46 Game8 pages predate Version 2.0. Spot-check the build Inner Ways first: Morale Chant, Battle Anthem, Sword Morph, Wolfchaser's Art (Tier 6), Song of Tang, Blossom Barrage, Royal Remedy, Mending Loom.
- **Steadfast Devotion Tier 3:** guaranteed crits at 70% or 75% final Critical Rate?
- **Vendetta base:** does the token last 5s or 15s longer, and does it cover the rats?
- **Eonpour Tier 6:** does Deepdaze's +20/40% base damage add to Inebriate's +10/20% or replace it?
- **Empirical Edge:** Physical *and* Attribute Penetration (Game8) or Attribute only (Bloxodes)? Per stack or flat at Tier 6?
- **Soaring High:** does it really turn up to 12% Affinity into Direct Critical Rate (Game8 summary only)?
- **Mixed weapon pairs:** do you lose any path bonus with a weapon from another path (e.g. attribute scaling 150% vs 100%)?
- **Wind Beneath Wings Tier 6:** text missing on Game8.
- **Bamboocut - Wind 2.3 changes:** the Oct 14 balance notice mentions Inner Way changes for this path without numbers. Check Echoes of Oblivion and Vendetta tooltips.
- **Damage mix and uptimes** are estimates. A Multiplayer Wooden Stake run with the team damage statistics (new in 2.3) could replace the damage-mix guesses with real shares per skill.

