# Alphas give too much: what each alpha gave before 0.32, what it gives now, and where the rest went (20 Nov 2026)

For Leon. Documents only: nothing in the rules, the data or the code is changed by this file.

**Where the numbers come from.** Every "before" line is read from the live 0.31.11 data (`origin/backup/live-0.31.11`:
`data/skills.json`, `tending.json`, `shadow.json`, `figments.json`, `soul_modules.json`, `perks.json`); every "now" line is
read from the same files in this tree (release 0.33). Moves between skills come from `data/perks.json` (a perk id that
exists on a beta or gamma now and did not before) and are named in the lane hand-offs
(`docs/design/handoffs/0.32-LANE-BODY.md`, `-MIND.md`, `-SOUL.md`, `-SHADOW.md`) and the ruling file
(`docs/design/proposals/2026-11-19-attribute-proposals.md`) and the nine sheets in `2026-11-19-attribute-drafts/`. Where a
claim needed more than that, it says "not found".

**The shape every alpha now has** (`data/skills.json` `ladder.alpha`; ruling layer section 1): 1 door, 2 small verb, 3 perk
step, 4 fork one, 5 big verb, 6 perk step, 7 perk step, 8 fork two, 9 perk step, 10 Mastered. Perk steps at 3, 6, 7, 9; forks
at 4 and 8. Before, an alpha's steps were at 3, 5, 7, 9 and its forks at 4 and 6, and levels 3 and 5 carried most of the
free passives and verbs. A beta or a gamma keeps steps at 3, 5, 7, 9 and has no forks.

## The table

| Alpha (beta, gamma) | Gave before 0.31.11 | Gives now | Moved out of the alpha |
| --- | --- | --- | --- |
| **Raw Power** (Guts, Intimidation) | 1 Momentum (the door). 3 Heavy Hands (a push goes 1 tile further). 5 Follow Through (a Finisher kill keeps 1 Momentum). Perk steps 3, 5, 7, 9. Forks 4 (Rolling Start, Grindstone) and 6 (Spill, Headlong: not offered). Grapple came from the perk Iron Grip; Throw Down from bare hands only. | 1 Momentum. 2 Grapple (any melee weapon or bare hands). 5 Throw Down (a Finisher on a foe you hold, any melee weapon or bare hands). Perk steps 3, 6, 7, 9. Forks 4 and 8, all four options built and offered. Rolling Start no longer makes the Charge free. | To its own perk: Heavy Hands into Iron Grip tier II. To the class: Follow Through into the Breaker's Measured Blow (Breaker rank III). To beta or gamma: nothing. |
| **Durability** (Pain Threshold, Senses) | 1 Guard (the door; shield rules; Close Guard: 25 percent of a blow on an adjacent ally comes to you, as written in the level 1 text). 3 Challenge, Retort, Set Against the Blow. 5 Slam, Last Plate, Second Wind (2 AP, once a fight, heal 25 percent). Perk steps 3, 5, 7, 9. Forks 4 and 6. | 1 Guard (the door). 2 Challenge. 5 Slam. Perk steps 3, 6, 7, 9. Forks 4 and 8. The shield-in-hand plate rows stay on the Durability page (hand-off BODY finding 5). | To Pain Threshold (beta) as perks: Close Guard, Second Wind (tier I 2 AP, tier II also +Guard), Set Against the Blow folded into Numb tier II. To the class: Retort into the Bulwark rank II (replaces Unbroken). Cut: Last Plate. To gamma (Senses): nothing. |
| **Dexterity** (Athletics, Reaction Speed) | 1 Pressure and Slide. 3 Speed Load (reload 1 AP less), Near Miss, Shaken Nerves. 5 Quick Draw (first drawn attack a fight is free), Flush Out as a rider (can leave a foe Afraid). Perk steps 3, 5, 7, 9. Forks 4 and 6. | 1 Pressure (the door). 2 Slide. 5 Flush Out (one verb: a Pressed foe saves or is Afraid, soldiers and below; 2 AP in the BODY hand-off). Perk steps 3, 6, 7, 9. Forks 4 and 8. | To Reaction Speed (gamma): Speed Load as a perk, with Quick Draw as its tier II. To the class (Skirmisher): Near Miss into Hold the Lane, Shaken Nerves into Break Them. Cut: the Flush Out rider on the Flush technique and its blade twin (merged into the level 5 verb). To beta: nothing. |
| **Ingenuity** (Acuity, Vigilance) | 1 Shadow (the door). 3 Close Quarters, Ghost Kill, verbs Lift, Decoy, Read Intent, Cut the Strap. 5 Still Breath, Shadow holds one more, verbs Fade, Vault, Open Seam, Foul the Action, Pick, Douse. 7 Shadow Run, Shadow holds one more, verbs Timing, Rig, Plant, Disable. 9 Hijack (and Parting Cut, pending). Perk steps 3, 5, 7, 9. Forks 4 and 6 (not offered). | 1 Shadow, Tag, and Stalk. 2 Lift, Decoy. 3 Ghost Kill, Case. 5 Fade, Shadow holds one more, Douse. 6 Cut the Strap. 7 Open Seam, Shadow holds one more. 9 Timing (Parting Cut rides the Break as data since 0.33, rules 7007). Perk steps 3, 6, 7, 9. Forks 4 and 8, all four offered. | To Acuity (beta): Still Breath as a perk, with Close Quarters as its tier II. To Vigilance (gamma): Read Intent as a perk (Spot also Reads its target). To its own perk: Shadow Run into Shadow Step tier II. To the class (Operative): Pick, Disable, Rig (Sabotage, rank II), Hijack (rank III, and Ingenuity 5). Cut: Vault (Athletics' Wall Run has it), Plant, Foul the Action. |
| **Brain Power** (Rumination, Eloquence) | 1 Sigils (the door). 3 Overclock. 5 Twin Draw. Core charge 1 less every 3 points (3, 6, 9). Perk steps 3, 5, 7, 9. Forks 4 and 6 (not offered). | 1 Sigils. 2 Overclock (+2 charge). 5 Twin Draw. Core charge 1 less at 3, a second cut at 5, a third at 9. Perk steps 3, 6, 7, 9. Forks 4 and 8, all four offered. | Nothing to beta or gamma (the sheet: Brain Power was not overloaded). Class: Backdraft replaces the Sigilist's Overcharge (a copy of Overclock). |
| **Visualization** (Improvisation, Charisma) | 1 the Double and the Snare, one Figment held, Glimmer, Redraw, Cash in. 2 the Hand. 5 two held, three ready designs. 7 three held, two traits a design. 8 four ready designs. 9 a destroyed Figment no longer Snaps. 10 every form, five designs. Forks 4 (Eye, Wall, Ward) and 6 (Beast, Blade, Husk, Sentinel) were the forms themselves; "one more shape" at 7, 8, 9. Steps 3, 5, 7, 9. | 1 two forms of your choice out of all ten (1 + points, up to all ten at 9), one held, Glimmer, Redraw, Let go. 2 Cash in. 5 two held, three ready designs. 7 three held, two traits a design. 8 four ready designs. 10 five designs. Forks 4 (Hard Light, Sharp Light) and 8 (Many Hands, Masterwork) upgrade every form you know. Steps 3, 6, 7, 9. | Nothing to beta or gamma. Cut: "one more shape" rows (7, 8, 9) and No Snap at 9 (no replacement). Moved inside the alpha: Cash in 1 to 2; forms became a pick (level-up door `figment_forms`), forks became upgrades. |
| **Will Power** (Composure, Lore Master) | 1 Outbursts (the door). Every 2 points: +1 Strain limit (limit was 3 + floor(Will Power / 2), 8 at 10), +1 design ready (2 + floor(Will Power / 2), at least 3), +1 reach. Every 3: +1 module slot. From 3: 1 free Pump a round. From 7: a held Outburst swells with no Strain. 3 Overdraw. 5 Pure Heart. Steps 3, 5, 7, 9. Forks 4 and 6 (not offered). | 1 Outbursts. 2 Overdraw (and the modules Size, Quiet). 4 the modules Bloom, Volley. 5 Two Schools. Every 2: +1 reach. Every 3: +1 module slot. From 3: 1 free Pump a round. Steps 3, 6, 7, 9. Forks 4 and 8, all four offered. No Strain limit and no designs from Will Power. | To Composure (beta): the Strain limit (3, then +1 at Composure 1, 2, 4, 6, 8: 3 at Will Power 10 with Composure 0, where it was 8), Pure Heart as a perk, the free swell (now at Composure 6). To Lore Master (gamma): designs ready (3, then +1 at Lore Master 4, 6, 8, 10). To the class (Channeler): Occult Library's design half became "Syphon free once a turn". |
| **Empathy** (Camaraderie, Insinuation) | 1 Bond, Mend, Snap, Tug, Touch, Settle, Soothe, Mend Yourself, Last Thread. 2 Shield. 3 Raise, Field Surgery, Feel Their Pain. 4 Guide. 5 Mercy (2 AP, a beaten humanoid yields). Two Bonds at 5, Three at 8, Threads That Hold at 10 (data). Mastered: Open Hand. Steps 3, 5, 7, 9. Forks 4 and 6 (second not offered). | 1 Bond and Mend (one Bond held). 2 Snap. 5 Shield, Two Bonds. 8 Three Bonds. Per point +6 percent healing given; +3 Bond reach at 6; Mend and Shield cost 6 MP less at 9. Mastered: Threads That Hold (Tending through a Bond x1.5, Bonds hold while you are Downed). Steps 3, 6, 7, 9. Forks 4 and 8, all four offered. | To Camaraderie (beta) as perk verbs: Settle (Steady Hands I), Soothe (Steady Hands II), Raise and Last Thread (Nobody Left Behind II), Tug (Pull Together I), Guide (Pull Together II). To Insinuation (gamma): Mercy and Open Hand, now one perk, Open Hand. To the class (Mender): Field Surgery (needs the class at rank I, or Empathy 1). Cut: Touch (Triage is the beside-you heal), Feel Their Pain. |
| **Faith** (Conscience, Authority) | 3 Answered Prayer (reset the prayers' wait once a fight). 5 Deliver the Sinner (+20 percent patron blows on a Marked foe). Hymns every point 0.75 round sooner (min 3). Steps 3, 5, 7, 9. Forks 4 and 6 (not offered). | 2 Name the Sinner (a Whisper: a foe is Judged 2 rounds; prayers +20 percent on a Judged or Marked foe). 3 Hymns open. 5 Witnessed. Steps 3, 6, 7, 9. Forks 4 and 8, all four offered (Swift Psalm now carries the "Hymn wait 1 less" that Unbroken Litany II had). | Nothing to beta or gamma. Cut: Answered Prayer (no code ever read it). Folded: Deliver the Sinner into Name the Sinner. Moved inside the alpha: `hymn_wait` minus 1 from Unbroken Litany II to Swift Psalm. |

## What the table says, in four lines

1. **Level 3 and level 5 were the overloaded levels.** Ingenuity at 5 held eight named things (Still Breath, a Shadow slot, Fade, Vault, Open Seam, Foul the Action, Pick, Douse); now it holds three (Fade, a Shadow slot, Douse). Durability at 3 and 5 held Challenge, Retort, Set Against the Blow, Slam, Last Plate and Second Wind; now Challenge is at 2 and Slam at 5.
2. **The betas got the survival and support pieces of the alphas** (Pain Threshold: Close Guard, Second Wind, Numb; Composure: Strain limit, Pure Heart; Camaraderie: five Tending verbs; Acuity: Still Breath), **the gammas got the noticing and talking pieces** (Vigilance: Read Intent; Reaction Speed: Speed Load and Quick Draw; Lore Master: designs ready; Insinuation: Mercy and Open Hand).
3. **Three alphas gave nothing to a beta or gamma** (Raw Power, Brain Power, Visualization): their changes are inside the alpha, or went to the class (Follow Through, Overcharge) or were cut (No Snap, the "one more shape" rows).
4. **Cut outright** (no replacement): Last Plate, Plant, Foul the Action, Touch, Feel Their Pain, Answered Prayer, No Snap.

## Per level, before and now (reference)

Numbers are the data's. "Step" is a perk step. The lines are what the skill's own page shows at that level; the per-point
lines (every level) are below each table.

### Raw Power
| Lv | Before | Now |
| --- | --- | --- |
| 1 | Momentum | Momentum |
| 2 | (per-point: +1 to counter-attacks from 2) | Grapple |
| 3 | Heavy Hands; step | step |
| 4 | Fork one | Fork one |
| 5 | Follow Through; step | Throw Down |
| 6 | Fork two (not offered) | step |
| 7 | step | step |
| 8 | (none) | Fork two |
| 9 | step | step |
| 10 | Mastered: Earthbreaker | Mastered: Earthbreaker |

Every level, both: +1 to hit (heavy melee, bare hands), +5 percent physical damage, harder saves against melee techniques;
+1 to counter-attacks from 2.

### Durability
| Lv | Before | Now |
| --- | --- | --- |
| 1 | Guard, shield rules, Close Guard | Guard |
| 2 | (Guard technique +1 plate a point from 2) | Challenge |
| 3 | Challenge, Retort, Set Against the Blow; step | step |
| 4 | Fork one | Fork one |
| 5 | Slam, Last Plate, Second Wind; step | Slam |
| 6 | Fork two | step |
| 7 | step | step |
| 8 | (none) | Fork two |
| 9 | step | step |
| 10 | Mastered: Last Wall | Mastered: Last Wall |

Every level, both: +1 Guard plate held (max 4); Guard technique +1 plate (+1 a point from 2); Brace +2 plates; shield rows.

### Dexterity
| Lv | Before | Now |
| --- | --- | --- |
| 1 | Pressure, Slide | Pressure |
| 2 | (none) | Slide |
| 3 | Speed Load, Near Miss, Shaken Nerves; step | step |
| 4 | Fork one | Fork one |
| 5 | Quick Draw, Flush Out rider; step | Flush Out |
| 6 | Fork two | step |
| 7 | step | step |
| 8 | (none) | Fork two |
| 9 | step | step |
| 10 | Mastered: Trick Shot | Mastered: Trick Shot |

Every level, both: +1 to hit (guns, light blades, thrown), +2 percent critical damage, +half a tile throw range, harder saves
against shooting techniques.

### Ingenuity
| Lv | Before | Now |
| --- | --- | --- |
| 1 | Shadow | Shadow, Tag, Stalk |
| 2 | (none) | Lift, Decoy |
| 3 | Close Quarters, Ghost Kill, Lift, Decoy, Read Intent, Cut the Strap; step | step, Ghost Kill, Case |
| 4 | Fork one | Fork one |
| 5 | Still Breath, Shadow +1, Fade, Vault, Open Seam, Foul, Pick, Douse; step | Fade, Shadow +1, Douse |
| 6 | Fork two | step, Cut the Strap |
| 7 | Shadow Run, Shadow +1, Timing, Rig, Plant, Disable; step | step, Open Seam, Shadow +1 |
| 8 | (none) | Fork two |
| 9 | Hijack; step | step, Timing |
| 10 | Mastered: Vanishing Act | Mastered: Vanishing Act |

Every level, both: harder saves against traps, poisons and unseen acts; +1 to be spotted every 2 points. The Shadow verb
levels are `data/shadow.json` `requires` (live and now). Stalk is the SHADOW lane's (hand-off item 5); Case is in the 0.33
data and I did not find a hand-off that names it (not found). Douse is still in data at Ingenuity 5 (the sheet's "cut" was
kept as lamps: hand-off SHADOW item 2).

### Brain Power
| Lv | Before | Now |
| --- | --- | --- |
| 1 | Sigils | Sigils |
| 2 | (none) | Overclock |
| 3 | Overclock; step; charge 1 less | step; charge 1 less |
| 4 | Fork one | Fork one |
| 5 | Twin Draw; step | Twin Draw; second charge cut |
| 6 | Fork two; charge 1 less | step |
| 7 | step | step |
| 8 | (none) | Fork two |
| 9 | step; charge 1 less | step; third charge cut |
| 10 | Mastered: Clean Draw | Mastered: Clean Draw |

Every level, both: +10 percent Sigil power, +1 Sigil word, harder saves against Sigil conditions; +1 reach and +1 round
every 2 points.

### Visualization
| Lv | Before | Now |
| --- | --- | --- |
| 1 | Double and Snare, 1 held, Glimmer, Redraw, Cash in | 2 forms of your choice, 1 held, Glimmer, Redraw, Let go |
| 2 | the Hand | Cash in; 3 forms known |
| 3 | 2 ready designs, 1 trait each; step | step; 2 ready designs, 1 trait each |
| 4 | Fork one: the Eye, the Wall or the Ward (a form) | Fork one: Hard Light or Sharp Light (an upgrade) |
| 5 | 2 held, 3 designs; step | 2 held, 3 designs |
| 6 | Fork two: Beast, Blade, Husk or Sentinel (a form) | step |
| 7 | 3 held, 2 traits a design, one more shape; step | 3 held, 2 traits a design; step |
| 8 | 4 designs, one more shape | Fork two: Many Hands or Masterwork; 4 designs |
| 9 | No Snap, one more shape; step | step (all ten forms known) |
| 10 | Every form, 5 designs; Mastered: Solid Image | 5 designs; Mastered: Solid Image |

Every level, both: +1 tile Figment reach, more accurate Figments; from 2, one more form known (now up to all ten at 9). The
form count is `data/figments.json` `forms_known` (1 + points, at most 10).

### Will Power
| Lv | Before | Now |
| --- | --- | --- |
| 1 | Outbursts | Outbursts |
| 2 | (+1 Strain limit, +1 design, +1 reach at 2) | Overdraw; modules Size, Quiet; +1 reach |
| 3 | Overdraw; step; 1 free Pump a round; +1 module slot | step; 1 free Pump a round; +1 module slot |
| 4 | Fork one; +1 Strain limit, +1 design, +1 reach | Fork one; modules Bloom, Volley; +1 reach |
| 5 | Pure Heart; step | Two Schools |
| 6 | Fork two; +1 Strain limit, +1 design, +1 reach, +1 module slot | step; +1 reach, +1 module slot |
| 7 | step; swell with no Strain | step |
| 8 | +1 Strain limit, +1 design, +1 reach | Fork two; +1 reach |
| 9 | step; +1 module slot | step; +1 module slot |
| 10 | Mastered: The Twin Pays | Mastered: The Twin Pays |

Every level, both: +10 percent Soul power, +10 percent mana syphoned, harder saves against Outbursts. The "Before" per-2 rows
follow `per_point.rows` "every 2" (levels 2, 4, 6, 8, 10).

### Empathy
| Lv | Before | Now |
| --- | --- | --- |
| 1 | Bond, Let Go, Mend, Mend Yourself, Snap, Tug, Touch, Settle, Soothe, Last Thread | Bond, Let Go, Mend, Mend Yourself; 1 Bond held |
| 2 | Shield | Snap |
| 3 | Raise, Field Surgery, Feel Their Pain; step | step |
| 4 | Guide; Fork one | Fork one |
| 5 | Two Bonds; Mercy; step | Shield; Two Bonds |
| 6 | Fork two (not offered) | step; +3 Bond reach |
| 7 | step | step |
| 8 | Three Bonds | Fork two; Three Bonds |
| 9 | step | step; Mend and Shield 6 MP less |
| 10 | Threads That Hold; Mastered: Open Hand | Mastered: Threads That Hold |

Every level, now: +6 percent healing given (before: "more healing given", no number). The Before verb levels are
`data/tending.json` `requires` on live (Snap, Tug, Touch, Settle, Soothe, Last Thread at Empathy 1; Shield 2; Raise 3;
Field Surgery 3; Guide 4). Live `tending.json` had an item named Threads That Hold at Empathy 10; now it is the Mastered perk (SOUL hand-off).

### Faith
| Lv | Before | Now |
| --- | --- | --- |
| 1 | Whisper (the door) | Whisper |
| 2 | (none) | Name the Sinner |
| 3 | Answered Prayer; step | Hymns open; step |
| 4 | Fork one | Fork one |
| 5 | Deliver the Sinner; step | Witnessed |
| 6 | Fork two | step |
| 7 | step; (Miracle with Devotion 10) | step; (Miracle with Devotion 10) |
| 8 | (none) | Fork two |
| 9 | step | step |
| 10 | Mastered: Judgement Day | Mastered: Judgement Day |

Every level, both: +10 percent Blessing power; Hymns return 0.75 round sooner (min 3: the row does nothing from Faith 6, the
floor; the Virtue sheet's finding; the data row still reads "each"); harder saves against Blessings.

## Not found, and call-outs

- The old Hymn-wait floor row: the Virtue sheet asked the page to show it only on levels 1 to 5. In `data/skills.json` the row
  is still "each". Not changed here (documents only).
- Empathy "before" per-point lines had no numbers (the live page said "more healing given"); the +6 percent is the new row.
- I did not recompute any balance measure. The lane hand-offs hold them (`0.32-LANE-BODY.md`, `-MIND.md`, `-SOUL.md`).
- The Strength sheet's "nothing is cut" and its two named moves (Heavy Hands, Follow Through) are confirmed in data: Iron Grip
  tier II carries the push, Measured Blow carries the Momentum.
- "Proficiency" is Visualization's beta in `data/skills.json` (its display name is Improvisation).
