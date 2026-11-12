# What this patch changes, against what is live

**Live: 0.22.0.** This branch (`claude/charming-gauss-hbq4n0`) is everything below on top of it. Kept by the lead as the
work goes; the last section says what is still moving. Rules revisions 1.15 to 1.23 are all new to players: live stops
at rules 1.14.

Each row: what a player on live has today, what they get with this patch, and where the detail is. Written from the
hand-offs as the work went; **the live column is to be checked against `origin/main` line by line before release**
(cells marked "not checked" are the ones known to be unverified).

## 1. Enemies (rules 1.15)

| | Live 0.22.0 | This patch |
| --- | --- | --- |
| Enemy numbers | One set per tier, whatever your level | By tier **and level** (HP, damage, to-hit, defence grow with you) |
| Tiers | Minion, Soldier, Elite, Boss | Plus **Vermin** (dies in one hit) |
| To hit at equal level | Not fitted | About 65% |
| Criticals | Not checked for this table | ×1.5, to ×2.0 with Perception and Dexterity |
| Elites and Bosses | Could be one-shot by a big level gap | Never taken out in one hit by the gap |
| AP perks | Usable every turn | 3-turn cooldown |
| Enemy 13 or 14 tiles away | (maps were too small for it) | Closes in or fires (it used to stand still: fixed) |
| Target choice | Threat, nearest, orders | **Also goes for whoever heals the most** (rules 1.23, being built) |
| Boss HP | 960 at its level | **Being refitted** (rules 1.23) |

Detail: `balance-sim-step1-full.md`, `defence-step.md` (to come).

## 2. Maps and camera (rules 1.16)

| | Live | This patch |
| --- | --- | --- |
| Map size | 16 × 11 | Up to **26 × 26**, smaller per campaign |
| View | Whole map on screen | A **camera**: today's tile size, follows the play, overview on the M key, edge arrows |
| Painted maps | The M813 paintings | Plain colour until the M813 rewrite (art requests M1 to M9) |
| Deployment | A few tiles apart | 10 to 14 tiles apart |

## 3. Guns (rules 1.18)

| | Live | This patch |
| --- | --- | --- |
| Best gun build, against the plain rifle | 204 to 221% | **143 to 146%** |
| Burst | 3 rounds, 3 rolls | 3 rounds, **2 rolls**, the second at −4 (enemies keep 3 rolls for now) |
| Mag Dump | 4 rolls | 3 rolls at most |
| Long rifle | Shot 2 AP | Shot **3 AP**, Aimed 4 (two Shots a turn) |
| Damage | Battle rifle 38, marksman 40, core rifle 32, Blackpoint 90, hand cannon 40 | 30, 33, 29, 66, 38 |
| Heavy Bolt | +50% | +40% |
| SMG family | SMG 15, PDW 16, whisper 13, drum 15, auto-pistol 14 | 19, 20, 16, 19, 17 |
| Plain rifle, melee | | Unchanged |

Detail: `damage-step-guns.md`. Ruling for later: Weapon Arts may break the ceiling as a charged ultimate, counted in the
build's average.

## 4. Sigil magic (rules 1.17)

| | Live | This patch |
| --- | --- | --- |
| Full 4-glyph Line, against the plain rifle | 78 to 119% | **140 to 205%** (the biggest hit in the game) |
| 2-glyph Line | 42 to 61% | 71 to 105% |
| How | Damage clamped at 350 / 500 | A Line multiplies its damage: ×1.7 / 1.75 / 1.8 for 2 / 3 / 4 glyphs; no clamp |
| Spell criticals | Not checked for this table | ×1.5 |
| Elites and Bosses | | One Evoke leaves a full-HP Elite or Boss at your level or above on 1 HP |
| MEND / WARD | 25 / 30, flat | 10 / 12 × the level factor (see Healing) |
| Edge Word (Evoker blade) | Triggered on any hit | Only on your own turn |

Detail: `damage-step-magic.md`.

## 5. Outburst (rules 1.17, 1.19, and the base of 12 Nov)

| | Live | This patch |
| --- | --- | --- |
| Steady, against the plain rifle | 61 to 89% | about **135%** |
| Biggest Release | 122 to 143% | about **165%**, over two turns |
| Stage table | ×0.8 / 1 / 1.4 / 1.8 / 2.2 | ×0.8 / 1.0 / 1.2 / 1.4 / 1.6 (a plain Pump is **+0.2**) |
| Damage base | 20 | **40** |
| A feeling in one Outburst | As many times as you like | **Once each** |
| Rage | +0.5, 1 Strain | +0.5, 1 Strain (now 2.5 plain Pumps' worth) |
| Shame | +0.6, 5 HP | +0.5, 8 HP |
| Abandon | +0.8, 2 Strain | +0.8, 2 Strain, once |
| Calm | Can't miss, free | Rolls twice, keeps the better, no critical, **−0.4** |
| Relief | Removes Strain, +0.2 | Removes 2 Strain, **−0.2** |
| New jobs | Grief Slows, Fear pushes, Joy chains, Hope +2, Guilt heals, Longing pulls | Grief +0.5 once an ally has fallen, Fear throws you back 2, Joy crits on 18 to 20, Hope cleanses, Guilt Taunts, Longing reach only |
| Free stages | Several sources stacked (stage 4 every turn at Soul 10) | **One free stage a turn** from any source; Empathy 7 swells without Strain instead |
| Schools | Damage or heal, the stage ignored by Control, Status, Buff | They read the stage; Damage: **Strike, Finish, Brand, Drain**; Control: Swap; Status: Silenced |
| Modules | Impact | Retired (it did nothing); At Once, Return, Shell, Inverse, Quiet re-stepped |
| Same school twice | | Defined, **locked** for an advanced class |
| Pump price | 1 AP | 1 AP (measured against three alternatives) |

Detail: `damage-step-magic.md`, `outburst-rework-2.md`.

## 6. Healing and shields (rules 1.20, 1.23)

| | Live | This patch |
| --- | --- | --- |
| Size | 3 to 7 Soldier-turns for a healer's turn at level 1; flat with level | About **1.25 Soldier-turns** for a healer's turn at every level |
| Level | Heals did not grow | A **level factor** (the enemy damage column) |
| Area heal | Every ally in full | Each ally ×0.4 |
| Love, Inverse, Shell | Shares of damage | Their own bases |
| Round limit | | None (a half-max-HP limit was built in 1.20 and is **withdrawn**: Leon) |
| Medic's kit, Triage, stims | Flat | **Being fitted** with the level factor (rules 1.23) |

Detail: `heal-shield-pass.md`, `defence-step.md` (to come).

## 7. Faith (rules 1.21, 1.22)

| | Live | This patch |
| --- | --- | --- |
| Prayer as a way to fight | Two patrons with a damage Hymn, 84 to 116% from Devotion 5; six at 15 to 53% | A Whisper turn about **80%**, a Hymn turn about **125%** (being built) |
| Whispers | Six, none hurts | Seven: **Rebuke** hurts |
| Hymn cooldown | 1 round from Virtue 4 and Faith 3 (every turn) | **Long at low Faith, down with Faith**; not every turn without items (being built) |
| Vows | Kept at the end of a fight | **A vow fulfilled in a fight takes 1 round off the Hymn cooldown** (being built) |
| Thunderclap, Lightning Rod, Judgement, The Saints' Verdict | | Deal damage / more damage |
| Cut Short | Could lock one enemy out all fight | Not the same enemy two rounds running |
| Hold the Gate | Any Hymn turn | Its own long cooldown (being built) |
| Witnessed, Old Overcast | +2 to hit on every attack | On a kill (being built) |
| Prayer heals | Flat | Level factor; refitted with the cooldown (being built) |

Detail: `faith-fit.md`, `faith-round-2.md` (to come).

## 8. The screen, effects and tools

| | Live | This patch |
| --- | --- | --- |
| Hotkeys | A number switches tab | **Two-key codes**: 11 move, 42 Evoke; each button shows its code |
| Effect testing room | | In the Proving Ground: a dummy with 9,999 HP, your AP back after every action |
| A fight's last blow | Skipped its animation | Plays |
| Next wave | Could play no enemy effects, your-turn card early | Plays in full; the card waits |
| Enemy portraits | Could change mid-fight | Kept once given |
| Thumper Suppress | Drew bullets | Draws what the weapon fires |
| Lob | Went off before it landed | Blast, damage and HP wait for the landing |
| Suppress | Sound and damage before the shots | Rattle with the first flash, damage with the last round |
| Area preview | Marked and named enemies in the fog | Only what you can see |
| A drawn glyph | Could vanish before its Evoke played | Stays until the effect that removes it has played |
| Opportunity attack | The step out played before the blow | The blow, then the step, if the mover still stands |
| Tests | | `fx-sweep`: every weapon × technique (2,022 cases) |

Detail: `BUGLIST-0.22.md`.

## 9. Under the hood

- The fight simulator and reference builds (`packages/engine/test/balance/`), with a measurement for guns, magic, the
  Outburst, healing and Faith.
- 19 perks and traits moved from the Narrator to the engine.
- Spec section 14: items 1015 to 1088, 1200 to 1222, 1230 to 1247, 1260 to 1274, and what 1.22 and 1.23 add.

## Still moving (12 Nov)

- **Rules 1.22**, Faith round 2: being built.
- **Rules 1.23**, the defence step (no round limit, the healer hunted, the medic pass, Boss HP): being built.
- Open with Leon: bug 12 (which action shows no AP cost); the questions in each hand-off not yet answered.
- Not done: the version bump and changelog, the stale suites (`soul`, `heart`, `feelings40`, `sigil15`, `magic`),
  a playtest of any of it. **Nothing here is live.**
