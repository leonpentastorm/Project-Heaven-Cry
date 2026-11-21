# The doors of Mind: Shadow, Sigils, Figments (0.34 total rebalance, design draft, 21 Nov 2026)

For the lead. **Nothing here is built.** Written to the charter (`docs/design/proposals/2026-11-21-the-curve.md` section 18), the six laws (sections 2 and 3), the Momentum pattern (section 16) and Leon's rulings (sections 10, 11, 13, 15, 17). Facts about today were read in data and code at `release/0.34-final` (worktree `E:/phc-wt/rel030`) and carry file:line. Every proposed number is **PROVISIONAL**. Rates of practice (study, marks, fights an hour) are the pacing drafter's (`docs/design/growth/05-pacing.md` section 4); where this file needs one it uses that file's figures (about 3.2 worthy fights and 5 fight-equivalents an hour, `05-pacing.md:243`) and does not set its own. The shared pieces (the door ladder, the cash-out sum, door Marks) are the ones the Body drafter names (`02-body.md` section 0 and its "Needs a new primitive"); this file uses the same names so the lead consolidates them once.

## 0. Shared rules this file uses

1. **The cash-out sum.** A cash-out that spends `n` units pays on `S(n) = 1 + 1.2 + 1.44 + ...`: S(1) 1, S(2) 2.2, S(3) 3.64, S(4) 5.37, S(5) 7.44, S(6) 9.93. A damage payoff is `x(base + Bite x S(n))`.
2. **Reach and Bite** step at points 1, 4, 7, 10 (Reach) and 6, 9 (Bite) on all three Mind doors: each door's nature fits the rhythm (a meter, a Line, a held count), so no door argues otherwise.
3. **The Push at 8**, once a turn, one unit past Reach, a price that lands next turn or lasts the fight (Leon, section 13.3: no Push before 8).
4. **Door Marks** use the Body drafter's thresholds (Mark I 60, Mark II 380, the middle milestone 600, Mark III 820 units spent against worthy foes, within two levels: `02-body.md:12`). Each Mind door defines its unit below so a specialist spends about 30 to 36 units an hour.
5. **Skill points.** The data gives 38 Skill points in a career (10 at creation, odd levels 2, even levels 1: `rules.json:186-189`, `:227-229`), not 48 (see Questions, 2). The spend tables below use 38: 30 in the attribute's three skills leaves 8.
6. **The gate levels** 5 and 15 are odd, and Attribute points come only on even levels (`rules.json:230-233`): at level 5 (ceiling 8) and level 15 (ceiling 10) no specialist can buy the alpha step until the next level. The spend tables flag it (Questions, 3).

---

## 1. Perception: the door of Shadow (Ingenuity; Analysis; Vigilant; the Operative, id `infiltrator`)

### 1(a) Today

**The counter.** Shadow, `res.shadow` (`actions.json` resources). Its cap by Ingenuity points: 1 at 1, 2 at 5, 3 at 7 (`rules.json:2594-2598` `shadow.cap_by_points`, read by `character.ts:1261 shadowCap`); the Operative holds `operative_cap_add` 1 more and starts each fight with 1 (`rules.json:2599-2600`; `character.ts:1871`; `classes.json:1698` Tradecraft). So Ingenuity 10 holds 3 (4 for an Operative): points 8, 9 and 10 add no Reach.

**What builds it** (`skills.json:1852` ingenuity unlock 1, effects 0 to 2, at most `door_gains_per_turn` 2 a turn, `rules.json:2604`): +1 when your turn ends Hidden with no attack made; +1 for a cover-to-cover move unseen (once a turn); +1 for a kill nobody saw; First Shade +1 on the first Hide of a fight holding none; Stalk (2 AP, once a turn, +1: `shadow.json:543`); the Operative's unseen Analyze +1 (`classes.json:1698`); Light Fingers' unseen Lift +1 (`forks.json:243`). **What wears it:** −1 at your turn start while seen; all of it when Downed and at the fight's end.

**What spends it.** The **Break** (`skills.json:2106` toggle `shadow.break`): one weapon attack from Hidden, all Shadow spent, multiplier `1 + 0.6 x Shadow + 0.5 on a fresh ambush + 0.15 on a Marked foe` in place of the ambush term (`rules.json:2601-2603`; the block is written again in the toggle's `value`). At Ingenuity 10, Operative: `1 + 2.4 + 0.5 = x3.9`; at Ingenuity 1: x2.1. The verbs that cost Shadow (`shadow.json`, requires and costs checked): Fade 2 AP 2 Shadow (Ing 5), Open Seam 1 AP 1 (Ing 7), Timing 1 AP 1 (Ing 9), Cut the Strap 1 AP 1 (Ing 6), Decoy 1 AP 1 (Ing 2), Disable 2 AP 1 (Operative rank II), Hijack 2 AP 2 (Operative rank III, Ing 5), Rig 2 AP 1 (Operative rank II; 25 flat, `shadow.json:706`); free of Shadow: Tag 1 AP once a turn (Ing 1), Case 1 AP (Ing 3), Lift 2 AP (Ing 2), Stalk 2 AP (Ing 1), Pick 1 AP (Operative II), Douse 1 AP (Ing 5).

**The ladder** (`skills.json:1852-2410`): 1 the door (Break, Go to Ground: Hide 1 AP less, First Shade, Tagged +1 to hit a Marked foe, Unseen Hand: from Hidden roll with Ingenuity when higher, Parting Cut at 9); 2 Lift and Decoy; 3 perk step and Ghost Kill (a kill no enemy sees re-hides you, once a turn); 4 fork Light Fingers or Lend the Dark (`forks.json:243`, `:297`); 5 "holds one more", Fade, Douse, Scout (`ambush_scout` 2, `skills.json:2352`); 6 perk step, Cut the Strap; 7 perk step, "holds one more", Open Seam; 8 fork Lightkiller or Spotter (`forks.json:354`, `:394`); 9 perk step, Timing, Parting Cut; 10 Mastered (Vanishing Act, `perks.json:11582`). Per point: +1 to foes' spot roll every 2 points (`per_point.numbers.spot` 1). Perks: Long Dark +8% / +14% damage while Hidden (`perks.json:3496`), Shadow Step: a Hidden attack holding Shadow 1 AP less (`perks.json:3588`).

**The Push.** None.

**The attribute's card** (`attributes.json:124`): +2 vision a point (true: `rules.json` senses `vision`), +3% critical damage a point (true: `character.ts:855 critMult`, held at x2.0 by `CRIT_MAX`), −10% critical damage taken a point (true: `character.ts:1237 critTakenPct`, the formula typed in code, capped at 60%: **Perception 7 already reaches the cap, so points 8 to 10 give that line nothing**). Perception adds nothing to the Break.

**What the cards promise and the engine does not give.** Nothing false on Ingenuity's card; its Reach stops at 7 and its Bite never moves.

**The class** (`classes.json` base `infiltrator`): gain Tradecraft (start 1 Shadow, +1 cap, Analyze Reads its target, unseen Analyze +1 Shadow, `:1698`); rank I Mark (1 AP, a foe you see is Marked for the fight: squad +1 to hit it, it can't Hide, 3 at once, `:4612`) and Vanish (Hide 0 AP once a turn, `:1584`); rank II Toxin (1 AP, a dose: next hit Body save or Weakened, Slowed or Bleeding, `:4640`) and Sabotage (Pick, Disable, Rig yours; Disable and Rig cost no Shadow, `:1646`); rank III Execution (a hit that leaves a Marked foe at a quarter HP or less kills it, not Bosses, `:4679`) and Called Shot (3 AP, −2 to hit or none unseen, an injury without a critical, `:6324`). Ranks today at levels 3, 6 and 12 with Perception 5 and 8 (`classes.json:12-20`).

**Measured.** The Operative cleared 0 of 40 in 0.32 (`docs/design/handoffs/0.32-MEASURES.md:180`), 21 in 0.33 after the rack's rifle (`0.33-LANE-BALANCE.md:36`).

### 1(b) Ingenuity's ladder, points 1 to 10

**Reach is the Shadow meter's cap** (`rules.json shadow.cap_by_points`). **Bite is what one Shadow spent in a Break adds to the blow** (the `res:shadow` term of the Break's multiplier, today 0.6), paid on the cash-out sum.

| Ingenuity | What exists there (kept where it is) | Reach (meter) | Bite (per Shadow) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: Break, Go to Ground, First Shade, Tagged, Unseen Hand; Tag, Stalk | **2** (was 1) | **0.75** (was 0.6) | |
| 2 | Lift, Decoy; spot +1 (every 2) | | | |
| 3 | perk step, Ghost Kill, Case | | | |
| 4 | fork: Light Fingers or Lend the Dark; spot +1 | **3** (was 2 at 5) | | |
| 5 | Fade, Douse, Scout | (its "holds one more" moves to 4) | | |
| 6 | perk step, Cut the Strap; spot +1 | | **0.9** | |
| 7 | perk step, Open Seam | **4** (was 3) | | |
| 8 | fork: Lightkiller or Spotter; spot +1 | | | **the Push: Last Shade** |
| 9 | perk step, Timing, Parting Cut | | **1.05** | |
| 10 | Mastered (Vanishing Act); spot +1 | **5** (new) | | |

Every point is felt: a Reach or Bite step, a verb, a perk step, a fork, or (2, 6) the verb beside the spot step. The Operative's `operative_cap_add` is retired: its +1 is now everyone's from Ingenuity (the Breaker pattern, section 17.3).

**Perception is the engine's size:** +10% on every Break a point above 1 (a term `attr:perception` 0.1 in the Break's multiplier: Needs a new primitive, 3).

### 1(c) The cash-out

**The Break:** `1 + 0.5 (fresh ambush) + Bite x S(Shadow spent)` [+0.15 on a Marked foe, x Perception's term]. It stays one weapon attack (2 AP with a rifle shot) and spends all of the meter, as today.

**Costs, one by one, at level 1, 10 and 20.** AP is the clock and does not scale. Shadow is built, never bought; its price is the Break it takes from: the top Shadow of a full meter is worth `Bite x 1.2^(n-1)` hits of your weapon, and your weapon's hit grows with the level column, so spending one on a verb is the same choice at every level: at level 1 (Reach 2 to 4) a 1-Shadow verb costs 0.9 to 1.6 hits of the Break, at level 10 (Reach 4) about 1.6, at level 20 (Reach 5) about 2.2. **Kept:** every verb's AP and Shadow (they already read as choices once the Break pays). **Changed:** none of the prices; the gains a turn stay 2 (the middle milestone raises it to 3).

**The cash-out table** (plain hits of the same weapon; a Shadow built costs about 2 AP of Stalk or a cover move, and a turn that ends with a gain makes no attack: the comparison counts the AP the gains take plus the Break's own shot, against plain shots of 2 AP).

| Who | Shadow spent | One Break is worth | The same AP of plain shots | How often |
| --- | --- | --- | --- | --- |
| Ingenuity 1 | 2 | 3.2 hits | 3 (+5%) | about every 1.5 turns |
| Ingenuity 4, a mixed character | 3 | 4.2 hits | 4 (+6%) | about every 2 turns |
| Ingenuity 7 | 4 | 6.3 hits | 5 (+27%) | about every 2.5 turns |
| Ingenuity 10, a specialist | 5 | 9.3 hits | 6 (+55%) | about every 3 turns (2.5 with the middle milestone) |
| the Push at 10 | 6 | 11.9 hits | 7 (+70%) | once a turn at most; see 1(d) |

On top of the table: while building you are Hidden (enemies cannot target you), and the AP not spent on gains goes to Tag, Case, Lift, Decoy and the control verbs. The mixed character breaks even on damage and is paid in safety and tempo; the specialist waits and is paid for the wait. **Reason for Bite 0.75 at 1:** at 0.6 the small Break (2 Shadow) is under the shots it costs; 0.75 is the least that makes a first Break worth its set-up. At level 20 a specialist's Break is 9.3 rifle hits, five digits on the charter's scale (about 1,400 a hit).

### 1(d) The Push at Ingenuity 8: Last Shade

Once a turn, your meter takes **one Shadow past its Reach** (it fills there by the usual gains, and the extra one counts in the next Break's sum). **Price:** the Break that spends it leaves you **Traced** until the end of your next turn (`conditions.json:1593` `traced`: the other side sees you wherever you are; no Hide, no Fade, no Ghost Kill while it lasts). Reason: the deepest Break of the fight is followed by a turn in the open, so the player chooses when the room can bear it.

### 1(e) Marks on the door

**A unit** is one Shadow spent in a Break on a worthy foe (a specialist breaks about twice a fight, 4 to 5 units each: about 29 units an hour at 3.2 worthy fights, `05-pacing.md:243`).

| Mark | About | Gives |
| --- | --- | --- |
| I (60) | hour 2 | the meter starts each fight primed with 1 (the Operative's own start stacks: 2) |
| II (380) | hour 11 | being seen costs you Shadow only every other turn start |
| middle (600) | hour 17 | the door's gains a turn: 3 (was 2) |
| III (820) | hour 23 | Last Shade costs nothing (no Traced) once a fight |

No practice track of its own besides the door's (weapon drill is the gun drafter's).

### 1(f) Tags for mixed characters

Today Hidden ends when you attack, take a hit or a foe ends its turn next to you, and the turn-end gain fails after any attack roll (the `struck` flag set on `attack_roll`, `skills.json:1852` effect 4). So every move that is not an attack already **keeps Shadow**. The tags this file asks for are for the attacks that should not count:

| Move (door) | Keeps | Why |
| --- | --- | --- |
| an Evoke of a Line with no damaging Subject (VEIL, LIGHT, WARD, MEND, STEP...) (Sigils) | Shadow: not an attack | a boon or working is not a blow |
| drawing a glyph, Scuff, Picture, Glimmer, every Figment order (Sigils, Figments) | Shadow (already true: no attack roll) | stated so the card can say it |
| a Whisper; Begin and Pump of an Outburst; tending a Bond (Prayer, Outbursts, Bonds) | Shadow (already true) | |
| a Figment's blow on its own turn or by your order (Figments) | Shadow: the blow is the Figment's | needs the tag: the order is your action |
| Shadow's Tag, Stalk, Hide, Case | the chain (Momentum: these steps cost no step) and the plates (Guard) | quiet steps are not walking away |
| Fade | Pressure on you is shed with no plate going (Guard's Slide answer, `02-body.md:111`) | |

### 1(g) Analysis (beta) and Vigilant (gamma), points 1 to 10

**Analysis: how Shadow protects you.** Today: every point +1% × Ingenuity × Analysis on the spot TN while Hidden (the feed, `effects/feed.ts:37`; its whole step `feed_at_double` 5), −5% critical damage taken, +1 tile Analyze reach (`skills.json:2492`); perks at 3, 5, 7, 9 (Pattern Lock, Quick Read, Read Them, Still Breath: `perks.json:6105-6415`), Mastered Case Closed (`perks.json:11902`). **Dead today:** below Ingenuity 4 the feed rounds to nothing (Analysis 1 on Ingenuity 3: 5 x 0.03 = 0.15, step 0), so a mixed character's points 1, 2, 4, 6 and 8 give only a tile of Analyze reach.

| Analysis | Exists (kept) | Each point (PROVISIONAL) | New |
| --- | --- | --- | --- |
| every point | the feed on the spot TN; +1 tile Analyze reach | **+1 to the TN foes need to find you while Hidden, from the first point** (the flat term on the feed); Margins scored against you are worth 5% less (the critical-taken line, under the 60% cap that Perception and Analysis share) | so every point moves the search roll a player sees |
| 3, 5, 7, 9 | perk steps | | |
| 10 | Mastered: Case Closed | | |

**Vigilant: Shadow outside the fight, and your eyes.** Today: +1 to notice traps and hidden foes, +1 tile notice range, +1 tile Spot reach a point (`skills.json:2671`); vision `12 + 2 x (Perception − 1) + Vigilant` (`rules.json` senses); the Spot Call (`calls.json:254`: steps at 1, 4, 8; price 3 AP from 1, 2 from 5, 1 from 9, twice and by reaction at 10: `calls.json` rules.price); perks at 3, 5, 7, 9 (Got You in My Sight, Cold Spine, Read Intent, The Tell), Mastered Nothing Gets Past. As a gamma it adds its full points on checks, Asks and passives: its voice speaks on more beats with every point. **Every point is already felt** (a tile of sight and of detection the map shows; a point on every notice and passive). Kept as it is; the Call price table is shared by every gamma (see Built from).

### 1(h) Perception's card made true

| Line | Today | Proposed |
| --- | --- | --- |
| +2 tiles of vision | true | kept |
| +3% critical damage | true under x2.0 | becomes **+0.02 on each Margin you score a point above 1** (a Margin adds a quarter: Perception 10, 0.43); `CRIT_MAX` lifted for it as the Body drafter proposes for Dexterity (`02-body.md:502`) |
| −10% critical damage taken | true, capped 60% (dead from Perception 8) | **−6% of what Margins against you add, a point** (to 54% at Perception 10 with Analysis on top, under the 60% cap): every point counts to 10 |
| (new) | nothing on the door | **+10% on every Break a point above 1**: the engine's size |

A Perception point outside Shadow is never dead: two tiles of sight, the Margins line and the defence line work for every character.

### 1(i) The class: the Operative

**What only the Operative has, not on the skill chain:** **the Read** (its Analyze shows the foe's next action), **Marks** (three foes Marked at once for the whole squad, seen or not), **toxins** (doses, restocked at a rest), and **the machine work** (Pick, Disable, Rig, Hijack). Its door's +1 Reach goes to Ingenuity; it keeps Tradecraft's start of 1 Shadow and the unseen Analyze's +1.

| Rank (level) | Moves | Worth pressing once set up? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| gain (3) | Tradecraft | yes | the +1 cap retired (now Ingenuity's) |
| I (3) | Mark (1 AP) | **no**: +1 to hit for the squad is about 0.4 hits over a fight for half a shot's AP | **+2 to hit for the squad** (and Margins come easier): about 0.8 hits, so a Mark is worth its AP in the first round it is used |
| I (3) | Vanish | yes (saves 1 AP a turn) | kept |
| II (5) | Toxin (1 AP, a dose) | **no**: a save in front of a quarter-turn condition | **no save when the coated hit is from Hidden or a Break**, and a dose coats the next two hits; Bleeding from a toxin reads the level column (an amount block) |
| II (5) | Sabotage (Pick, Disable, Rig) | yes against machines (a machine's whole turn for 2 AP) | Rig's 25 flat becomes about 1.6 of the Operative's plain shots at its level (the scale drafter sets the base) |
| III (15) | Execution | yes | kept |
| III (15) | Called Shot (3 AP) | **no**: one shot and an injury for one and a half shots' AP | **2 AP**: a shot and an injury for one shot's AP |

### 1(j) How a player spends

**The specialist** (Perception 7, Agility 3, Endurance 2, Intelligence 2 at creation; Ingenuity 7, Analysis 3).

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | the build above | Reach 4, Bite 0.9: a 6-hit Break at level 1; Fade, Open Seam, fork A, three perk steps; Analysis 3: +3 search TN and a perk |
| 2 | Agility 4; Analysis 4 | the gun's attribute; +1 search TN |
| 3 | Vigilant 1, 2 | **the Operative**; Spot; two tiles of sight |
| 4 | Agility 5; Analysis 5 | a perk |
| 5 | Vigilant 3, 4 | **rank II; FLAG: the ceiling is 8 but Perception waits for level 6**: the best purchase is not available |
| 6 | Perception 8; Ingenuity 8 | **the Push**, fork B |
| 7 | Analysis 6, 7 | a perk |
| 8 | Endurance 3; Vigilant 5 | HP; a perk, Spot at 2 AP |
| 9 | Analysis 8; Vigilant 6 | |
| 10 | Perception 9; Ingenuity 9 | Bite 1.05, Timing, Parting Cut |
| 11 | Analysis 9; Vigilant 7 | two perks |
| 12 | Agility 6; Vigilant 8 | Spot's third step |
| 13 | Vigilant 9; Dexterity 1 | a perk; the gun's to-hit from −2 to 0 |
| 14 | Endurance 4; Dexterity 2 | |
| 15 | Dexterity 3, 4 | **rank III; FLAG: Ingenuity 10 waits for level 16** |
| 16 | Perception 10; Ingenuity 10 | Reach 5, Vanishing Act |
| 17 | Analysis 10; Vigilant 10 | two Mastered perks |
| 18 | Agility 7; Dexterity 5 | |
| 19 | Dexterity 6, 7 | |
| 20 | Endurance 5; Athletics 1 | HP |

30 points in Perception's skills, 8 elsewhere. Every level is felt but 5 and 15, where the gate opens a level before it can be used.

**A mixed character: the hidden gunner** (Agility 7 and Perception 4; Dexterity 6, Ingenuity 4 at creation). Level 1: Reach 3, Bite 0.75: a 4-hit Break as an opener, then plain fire with Pressure. Levels 2 to 10: Dexterity and Athletics with Analysis 1 to 3 (the search TN from the first point); Ingenuity 6 at level 8 (Bite 0.9, Cut the Strap). Levels 11 to 20: Ingenuity 7 at 12 (Reach 4), Analysis to 5. Breaks about every 2 turns at 4 to 6 hits, two door bars filling. No level is dead: the beta points are felt from the first point (1(g)).

---

## 2. Intelligence: the door of Sigils (Brain Power; Rumination; Eloquence; the Sigilist, id `mage`)

### 2(a) Today

**The counters.** Glyphs on the ground in a Line (the Line's length is the Reach) and **Flux** (`mg.flux`, the price that builds). A Line is 2 to 4 glyphs in a straight row, one stroke, at least a Subject and one other word (`sigils.json:28-60`). **Its length is set by Intelligence, not by Brain Power:** Max Sigil words `2 + floor((Intelligence − 1) / 2)`: 2 at 1, 3 at 3, 4 at 5 (`character.ts:881`, the formula typed in code; `attributes.json:152` card "a longer Line at every even point", in fact at 3 and 5). The ground holds as many of your glyphs (`sigil.ts:88 groundCap`). **Words known:** `4 + Brain Power` (`character.ts:890`, typed again from the text `sigils.json:193`) plus the Mastered free words.

**Costs** (`rules.json:1426-1445`, `sigils.json:62-75`): drawing a glyph costs its word's charge (1 to 3), the Glyph AP (`max(0.5, 1 − 0.1 x (Expression − 1))`, `character.ts:882`) and 1 Flux (TWICE 2); walking the Line costs Movement (a step a glyph); Evoke 1 AP and 1 charge a glyph less the core saving (−1 at Brain Power 3, 5 and 9: `skills.json:2903` `charge_at`, `character.ts:885`), at least 1. A core holds 10 charge (`rules.json:1412`), the Evoker 1 core, a swap 2 AP. Flux limit 6; over it the Evoker overloads (10 a point over on the flat profile, which reads the level column: `rules.json:2202-2214`; the Evoker locked a round; all Flux to the air); Vent 1 AP empties it (`rules.json:1432-1442`). Rumination feeds the Flux limit by `1% x Brain Power x Rumination` (`skills.json:3097` feed).

**The payoff** (`sigil.ts:356-438`): the strongest damaging Subject in full and half of every other, x the Reach, Burst and Delivery words, x 0.9 for each repeated glyph, x **the Line multiplier 1.87 / 1.93 / 1.98 for 2 / 3 / 4 glyphs** (`sigils.json:104-117`; the texts at `sigils.json:165` `multipliers` and `rules.json:1446` still say 1.7 / 1.75 / 1.8), x the Sigil Stat term, x the level. The Stat term is `output.profiles.sigil` k 1.7 with **attr 0 and skill 0** (`rules.json:1850`): **Intelligence and Brain Power add nothing to a Line's damage** although both cards promise +10% a point (`attributes.json:152`, `skills.json:2831` `per_point.numbers.sigil` 0.1; the comment at `character.ts:876` is stale). Elemental words add the Elemental term, whose profile is also flat (`rules.json:1858`), so Expression's "+10% elemental" is false too. One Evoke leaves a full-HP Elite or Boss of your level or above on 1 HP (`sigils.json:124-132`).

**Growth.** Study 1 an Evoke, +1 a glyph past the second, +1 if it hit; a word at 6, then every 8; copy 2; 5 study at each Mastery level of Brain Power, Rumination and Eloquence, a free word at each Mastered (`sigils.json:209-231`, `sigilgrowth.ts:31-100`). Word mastery: Practised at 10 uses, Mastered at 30 (its inflection always on: `sigils.json:233-238`). There is no book of found spells.

**The ladder** (`skills.json:2831`): 1 the door (no unlock row: the Evoker opens it); 2 **Overclock** (one word past Max Sigil words, never past 4, +2 charge: `skills.json:2914`; the handler `perks/skills.ts:27-60` types the 2 as `OC_CHARGE`); 3 perk step, core saving 1; 4 fork Overflux (+25% at the Flux limit) or Clean Vent (`forks.json:1264`, `:1300`); 5 Twin Draw (`perks/skills.ts:75`), core saving 2; 6 and 7 perk steps; 8 fork Written in Advance (+20% for a Line drawn before your turn ended) or Running Script (`forks.json:1373`, `:1442`); 9 perk step, core saving 3; 10 Mastered (Clean Draw, `perks.json:11716`) and the Junction (`sigils.json:55-60`). Every 2 points: +1 tile Sigil reach and +1 round a glyph lasts (`character.ts:886-887`). Perks: Second Clause +6% / +12% on a foe with a condition (`perks.json:4541`), Running Hand (`perks.json:4660`). **Reach and Bite never move with Brain Power.**

**The class** (`classes.json` base `mage`): rank I Barrage (FIRE, FREEZE, SHOCK, STONE, ACID 1 charge less, `:4706`) and Core Change (swap 1 AP less, `:1801`); rank II Backdraft (an overload hits every foe beside you, `:1835`) and Bleed the Flux (Vent 1 AP less; the next glyph after a Vent 1 Flux less, `:1894`); rank III Payload (double area, Flux equal to its glyphs, `:4782`) and Stored Spell (the Scribe's: write a spell on an object out of a fight, set it off for 1 AP, as many as your Rumination modifier, `:4996`). Its dial is 1, a no-op left from the contract (`classes.json:1941`).

**Measured.** The Sigilist bot clears 6 of 40 solo against the Channeler's 18, 48 damage a turn against 83 (`docs/design/handoffs/0.33-LANE-BALANCE.md:21-24`, `0.33.0-LIVE.md:58`).

**Why a Line pays too little for its set-up (the door's numbers, not the bot).**
1. **Length is nearly free of reward:** a 4-glyph Line is x1.98 against a 2-glyph x1.87 (+6%) for twice the glyphs, twice the walk, twice the Flux and about twice the charge.
2. **Extra words dilute:** a second damaging Subject adds half; a repeat costs x0.9; Reach, Burst and Delivery words carry no damage, so a longer Line is mostly shape, not power.
3. **The attribute and the skill add nothing** to the damage (profiles flat).
4. **The charge:** a FIRE SEEK costs 6 of a 10-charge core; a 4-glyph Line costs 10 to 12, more than a core: "two Lines a core" (`0.33-LANE-BALANCE.md:23`), then a 2-AP swap.
5. **The set-up is exposure:** a step a glyph in the open, at 2 AP a step when Pressed (`0.32-MEASURES.md:184-186`), the Line scuffed or NULLed by the enemy's AI (`sigils.json` `enemy_ai`).
So a 2-glyph FIRE Line is about 2.5 rifle shots of Stat for about 2 shots of AP and 60% of a core: it barely beats the gun it gave up, and the long Line, the effort, pays less than the short one.

### 2(b) Brain Power's ladder, points 1 to 10

**Reach is the Line's length** (most glyphs in one of your Lines; the ground holds as many) **and the words you can hold** (words known). **Bite is the Line multiplier's worth per glyph**, paid on the cash-out sum: Line multiplier `= Bite x S(glyphs)`.

| Brain Power | What exists there (kept) | Reach (Line; words known) | Bite (per glyph) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: draw, walk, Evoke | **2** (Lines of 2); 7 words | **0.85** (x1.87 for 2: today's kept) | the book of found spells (2(e)) |
| 2 | +1 tile reach, +1 round a glyph lasts (every 2) | 10 words | | Overclock leaves this rung for 8 (Questions, 1) |
| 3 | perk step; core saving 1 | 13 words | | |
| 4 | fork: Overflux or Clean Vent; every-2 row | **3**; 16 words | | |
| 5 | Twin Draw; core saving 2 | 19 words | | |
| 6 | perk step; every-2 row | 22 words | **0.95** | |
| 7 | perk step | **4**; 25 words | | |
| 8 | fork: Written in Advance or Running Script; every-2 row | 28 words | | **the Push: Overclock** |
| 9 | perk step; core saving 3 | 31 words | **1.05** | |
| 10 | Mastered (Clean Draw); the Junction; every-2 row | **5**; 34 words | | |

Words known `4 + 3 x Brain Power` is the pacing drafter's (`05-pacing.md:250`); it replaces `4 + Brain Power` so the cap never stops a capped character short of about 32 words. `grammar.max_glyphs` becomes 5 (6 under Overclock). **The Line multiplier by length:** Brain Power 1: x1.87 for 2; 4: x3.09 for 3; 7: x5.10 for 4; 10: x7.81 for 5 (x10.4 for 6 under Overclock). A 2-glyph Line at Brain Power 10 is x2.31: the short Line grows with the skill too, but the long one grows most.

**Brain Power's own +5% Sigil power a point** (card made true at +5%, the alpha's rate as Raw Power's; Questions, 5), **Intelligence +10% a point** (2(h)).

### 2(c) The cash-out

**The Evoke** spends the whole Line (every glyph of it), as today.

**Costs, one by one, at level 1, 10 and 20** (FIRE, SEEK and a Burst word; Expression and Agility as the specialist's spend table gives them):

| Cost | Level 1 (Brain Power 7, Reach 4) | Level 10 (Brain Power 9, Reach 4) | Level 20 (Brain Power 10, Reach 5) | Kept or changed |
| --- | --- | --- | --- | --- |
| AP: glyphs + walk + Evoke | 4 x 0.7 + 3 tiles + 1, about 6 AP | 4 x 0.6 + 2 + 1, about 5 | 5 x 0.5 + 2 + 1, about 5 to 6 | kept: a long Line is a turn, the choice of the turn |
| charge | about 9 to 10 of a 10-core | about 8 | about 9 with Barrage | kept: one big Line is a core; two small ones are a core too: the choice at every level |
| Flux | 4 of 9 (Rumination 3) | 4 of 15 | 5 of 16 | **limit 6 + 1 a Rumination point** (2(g)): Vent becomes a choice, not a tax |
| cores | 1 loaded, 2 spare | the burnt ones back after a fight (`survival.json:128` `supply`) | the same | kept |

Damage grows with the level column; charge, AP and Flux do not, so the price of a Line stays one core and one turn at every level while its blow grows forty-fold: the choice (one long Line or two short) is the same at 1, 10 and 20.

**The cash-out table** (one FIRE-class Subject, single target, in rifle shots of Stat: FIRE's base and the rifle's are equal and the Sigil profile's k 1.7 against the gun's 1.275 makes FIRE 1.33 rifle rounds at equal attribute and skill slopes; AP at Expression 1 and Agility 1 so the set-up shows in full):

| Who | Glyphs | Line multiplier | One Evoke is worth | The same AP of plain shots | How often |
| --- | --- | --- | --- | --- | --- |
| Brain Power 1 | 2 | x1.87 | 2.5 shots | 2 (4 AP): +24% | every turn |
| Brain Power 4, a mixed character | 3 | x3.09 | 4.1 shots | 3 (6 AP): +37% | every turn |
| Brain Power 7 | 4 | x5.10 | 6.8 shots | 4 (8 AP): +70% | about every 1.3 turns |
| Brain Power 10, a specialist | 5 | x7.81 | 10.4 shots | 5 (10 AP): about twice | about every 1.7 turns (one a turn at Expression 6, Agility 4) |
| Overclock at 10 | 6 | x10.4 | 13.9 shots | 6 (12 AP) | once a turn at most; see 2(d) |

Area words multiply each creature caught (SPREAD x0.6 each, CHAIN x0.75 a jump): the long Line is also the area Line. **Reason for Bite 0.85 at 1:** it keeps today's x1.87 for a 2-glyph Line, so nothing a player has is taken back; the steps at 6 and 9 make the fifth glyph worth half again the fourth. At level 20 a specialist's 5-glyph Line is about 10 rifle shots on one target, five digits on the charter's scale.

### 2(d) The Push at Brain Power 8: Overclock (moved from 2)

Once a turn, your next glyph may make the Line **one glyph past your Reach** (6 at Brain Power 10). That glyph costs +2 charge (kept, now in data: the unlock's `resource core −2` effect, not the code's `OC_CHARGE`). **Price (new):** when the Overclocked Line is Evoked, your Evoker overloads as if your Flux had gone over by one (`rules.json:2202` `flux_overload`: its damage, the lock until the next round, all your Flux to the air). Reason: the longest Line you can write burns the hand that wrote it, and the air it fills makes every Outburst in the room stronger, both sides'. The Sigilist's Backdraft turns that price into a blow (2(i)).

### 2(e) Marks on the door, and the Sigil practice tracks

**A unit** is a glyph past the first in a Line Evoked on a worthy foe (a specialist Evokes about 3 times a fight, 3 to 4 glyphs: about 34 units an hour).

| Mark | About | Gives |
| --- | --- | --- |
| I (60) | hour 2 | your first glyph of each fight costs no AP |
| II (380) | hour 11 | Bite +0.05 (every Line you write) |
| middle (600) | hour 17 | the Flux limit +2 |
| III (820) | hour 23 | Overclock without its overload once a fight |

**Word study** (kept, rates the pacing drafter's: a word every 1.6 hours, 33 of 40 by hour 48, `05-pacing.md:250`). **The book of found spells** (new, everyone with the door): the first time a Line whose words (as a set, counting copies) you have never Evoked lands on a worthy foe, it is **written in your book** with its words and the fight it was found in, and pays study (10, `05-pacing.md:252`). The book is the collection that never closes: forty words in Lines of 2 to 5 make tens of thousands of sentences; a player who varies their Lines learns words faster than one who repeats a Line. The door tab shows the book and how many sentences it holds. **Word Marks** (Law 3; today Practised and Mastered):

| Word Mark | Uses (Evokes holding it) | Gives |
| --- | --- | --- |
| I (today's Practised) | 10 | its glyph costs 1 charge less (never under 1) |
| II (today's Mastered) | 30 | its inflection, always on (today's) |
| III | 80 | it may sit twice in one Line with no x0.9 for the repeat |

Rates: a specialist's Evokes give about 40 word-uses an hour across 3 to 4 words; at hour 50 about 2,000 uses: most of 30 known words at Mark II, about a dozen favourites at III. So a capped character holds about 32 of 40 words, about 80% of them at Mark II.

### 2(f) Tags for mixed characters

| Move (door) | Keeps | Why |
| --- | --- | --- |
| a glyph drawn, a step along your own Line (Sigils) | the chain (Momentum: a Line step is not walking away) | a Breaker-Sigilist walks while writing |
| an Evoke with no damaging Subject (Sigils) | Shadow (1(f)) | |
| Vent (Sigils) | Strain falls by the Flux vented, up to 1 (Outbursts) | the vented Flux calms the heart: the base layer of the Sigils-Outbursts Crossing |
| Crystallise (Outbursts), Salvage (the Rigger), a Survival core made at the Forge | cores for the Line (exists) | fuel crosses doors already |
| holding Guard, praying a Whisper, ordering a Figment (Guard, Prayer, Figments) | your glyphs: they lose no round of their time that turn | the Line waits for the friend who covers its writer |

### 2(g) Rumination (beta) and Eloquence (gamma), points 1 to 10

**Rumination: how Sigils sustain you.** Today: the feed `6 x (1 + 0.01 x Brain Power x Rumination)` on the Flux limit, +1 on Brain saves a point (`skills.json:3097`); perks at 3, 5, 7, 9 (Footnote, Lab Coat, Index, Proven Formula: `perks.json:4809-5108`), Mastered Established Fact; 5 study at each Mastery level, a free word at 10 (`sigils.json:226-229`). **Dead today:** the Flux limit is a whole number; the feed reaches +1 only at Brain Power x Rumination of 17 (Rumination 2 on Brain Power 9), so points 1, 2, 4, 6 and 8 give a Brain save and little else to most characters.

| Rumination | Exists (kept) | Each point (PROVISIONAL) | New |
| --- | --- | --- | --- |
| every point | +1 on Brain saves | **+1 Flux limit** (flat, in place of the feed; stat `flux_max`) | each point is one more glyph before a Vent |
| 3, 5, 7, 9 | perk steps; +5 study each | | |
| 10 | Mastered: Established Fact; a free word | | |

**Eloquence: Sigils outside the fight, its Calls and its voice.** Today: persuasion in a fight harder to resist; +1 tile Brief reach a point (`skills.json:3269`); Brief (`calls.json:130`: steps 1, 4, 8; the shared price table); perks at 3, 5, 7, 9 (Overruled!, Objection!, Opening Argument, Thinking Aloud: `perks.json:5170-5464`), Mastered Closing Argument; 5 study at each Mastery level, a free word at 10; as a gamma its full points on checks, Asks and passives. Kept as it is: every point is a point on every Eloquence check and passive (the voice heard more often) and a tile of Brief; points 3, 5, 7 and 9 also pay study, so Eloquence is a second road to words for a talker.

### 2(h) Intelligence's card made true

| Line | Today | Proposed |
| --- | --- | --- |
| +10% Sigil power | false (`rules.json:1850` sigil profile attr 0) | **true**: `output.profiles.sigil.attr` 0.1 (and Brain Power's `skill` 0.05) |
| a longer Line at every even point | true at 3 and 5 (typed in `character.ts:881`) | **moves to Brain Power** (the Reach is the skill's, 2(b)) |
| (new) | nothing outside Sigils | **+5% on every practice track a point above 1** (word study, weapon drill, Outburst modules, door Marks, Figment form marks: stat `practice_rate`, Needs a new primitive, 5): the learner's attribute |

An Intelligence point outside the Sigils door is never dead: every character practises.

### 2(i) The class: the Sigilist

**What only the Sigilist has, not on the skill chain:** **the Stored Spell**, a whole Line written before the fight and set off for 1 AP: the only way in the game to skip a Line's set-up. With it the Sigilist walks into a fight with its sentences already written.

| Rank (level) | Moves | Worth pressing once set up? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| I (3) | **Stored Spell** (moved from III) | yes: a 3- or 4-glyph Line for 1 AP | at rank I; as many as your Rumination modifier (at least 1); it keeps the Line multiplier of its length |
| I (3) | Barrage | yes (a cheaper Line every turn) | kept |
| II (5) | Bleed the Flux | yes (Vent 0 AP) | kept |
| II (5) | Core Change (moved from I) | yes (a swap 1 AP) | kept |
| III (15) | Payload | yes on two or more foes | kept |
| III (15) | Backdraft (moved from II) | **no** today: an overload is an accident | with Overclock's price (2(d)) it is the Sigilist's planned blow: the overload hits every foe beside you; kept, and it now has a set-up |

The Sigilist's dial (`classes.json:1941`, value 1) is removed: it carries nothing.

### 2(j) How a player spends

**The specialist** (Intelligence 7, Expression 3, Agility 2, Endurance 2 at creation; Brain Power 7, Rumination 3).

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | the build above | Lines of 4 at x5.10, 25 words to hold, fork A, three perk steps, Twin Draw; Flux limit 9 |
| 2 | Expression 4; Rumination 4 | glyphs 0.7 AP; Flux 10 |
| 3 | Eloquence 1, 2 | **the Sigilist**: a Stored Spell; Brief |
| 4 | Agility 3; Rumination 5 | walking the Line; a perk, +5 study |
| 5 | Eloquence 3, 4 | **rank II; FLAG: Brain Power 8 waits for Intelligence 8 at level 6** |
| 6 | Intelligence 8; Brain Power 8 | **Overclock**, fork B |
| 7 | Rumination 6, 7 | Flux 13; a perk |
| 8 | Expression 5; Eloquence 5 | a perk, +5 study, Brief at 2 AP |
| 9 | Rumination 8; Eloquence 6 | |
| 10 | Intelligence 9; Brain Power 9 | Bite 1.05, core saving 3 |
| 11 | Rumination 9; Eloquence 7 | two perks |
| 12 | Expression 6; Eloquence 8 | glyphs 0.5 AP: the 5-glyph Line fits a turn |
| 13 | Eloquence 9; Visualization 1 | the Figments door: Glimmer, a Figment |
| 14 | Endurance 3; Visualization 2 | Cash in |
| 15 | Visualization 3, 4 | **rank III; FLAG: Brain Power 10 waits for level 16** |
| 16 | Intelligence 10; Brain Power 10 | Reach 5, the Junction, Clean Draw |
| 17 | Rumination 10; Eloquence 10 | two Mastered perks, two free words |
| 18 | Agility 4; Visualization 5 | |
| 19 | Visualization 6; Proficiency 1 | +1 charge in every core (2(g), 3(g)) |
| 20 | Endurance 4; Proficiency 2 | |

**A mixed character: Line and Outburst** (Intelligence 5, Determination 5; Brain Power 4, Will Power 4 at creation). Level 1: Lines of 3 at x3.09 (4 shots every turn) and a stage-3 Outburst. Rumination from level 2 (Flux from the first point), Vent's tag calms Strain (2(f)). Brain Power 7 at level 10 (Lines of 4), Bite 0.95 from 6. Two doors' bars fill; it Evokes every turn for less, the specialist every other turn for twice. No dead level once the betas are felt from their first point.

---

## 3. Expression: the door of Figments (Visualization; Proficiency; Charisma; the Rigger, id `trickster`)

### 3(a) Today

**The counters.** Figments held (owned units tied to you, `ties:owned`) and the Visualizer's charge (`mg.vcharge`, one core of 10: `figments.json:9-18`). **Held:** 1 at Visualization 1, 2 at 5, 3 at 7 (`figments.json:48-55` ladder), +1 for Many Hands (`forks.json:1842`), +1 for the Rigger (`classes.json:1986` Rigger's Hands); at most 4 held, 6 owned bodies (`figments.json:27`). **Forms known:** 1 + Visualization, at most 10 (`figments.json:41-46`). Ready designs 2 / 3 / 4 / 5 at 3 / 5 / 8 / 10 (+1 the Rigger), traits 1 at 3, 2 at 7.

**Costs.** Picture 2 AP and the form's charge (1 to 4, +1 a trait: `figments.json` forms, `trait_charge` 1); upkeep 1 charge a Figment at each of your turn starts, and 1 AP too when you hold 3 or more (`figments.json:30-35`); orders: Strike 2 AP, Pounce 3, Cut 2, Stare 1, every other order 1 (`actions.json` costs, `figment_order`); Redraw 1 AP 1 charge; Let go 0 AP, half the charge back; a Figment destroyed gives nothing back and Snaps you (1 AP less next turn).

**The payoff.** Each Figment's blows (the `figment` profile, k 1.5, attr 0, skill 0, `rules.json:1938`; x the Figment factor 0.9, `rules.json:1991`, a line-holder of the withdrawn contract); its HP a share of the form's by `figment_hp` (k 0.35, Visualization 0.15, `rules.json:1948`) x the enemy table's hp_mult; its soak and lure. **Cash in** (Visualization 2, 1 AP order: unmake one, all its charge back: `figments.json` verbs `figment_cash_in`). There is **no cash-out**: nothing spends the board for more than it gave.

**The ladder** (`skills.json` visualization): 1 the door (Picture, two forms, one held, Redraw, Let go, Glimmer; range 4 + Visualization); 2 Cash in; 3 perk step, two designs; 4 fork Hard Light or Sharp Light (`forks.json:1700`, `:1757`); 5 two held, three designs; 6 perk step; 7 three held, two traits, perk step; 8 fork Many Hands or Masterwork (`forks.json:1842`, `:1878`), four designs; 9 perk step; 10 Mastered (Solid Image, `perks.json:11864`), five designs. Per point: +1 tile reach, more accurate Figments, a form known from 2. Perks: Many-Eyed Dream (+4% / +6% a Figment kept, `perks.json:5742`), Wake of the Kill (`perks.json:5876`).

**The attribute's card** (`attributes.json:175`): +10% elemental damage a point (**false**: `rules.json:1858` elemental profile attr 0) and glyphs 0.1 AP cheaper a point (true, `character.ts:882`). **Nothing on the card reaches Figments**, the attribute's own door.

**The class** (`classes.json` base `trickster`): gain the Rigger's Hands (+1 held, +1 design, `:1986`); rank I Double (2 AP, no charge, a Double for some rounds, one at a time, no upkeep, `:2028`) and Quick Sketch (Picture 1 AP less once a turn, `:2066`); rank II Salvage (1 AP beside a wreck: charge, once a wreck, `:2126`) and Redline (1 AP once a turn: a Figment or machine of yours acts now, free, and takes 5 true, `:2164`); rank III Sleight (1 AP once a scene: swap places with a Figment or an ally, `:2211`) and Scrap Sentinel (3 AP once a scene: a Sentinel from a wreck, `:2246`). Its dial is 1, a no-op (`classes.json:2282`).

**Measured.** The Rigger clears 22 of 40 solo and 32 to 34 in four (`docs/design/handoffs/0.32-LANE-MIND.md:35`).

### 3(b) Visualization's ladder, points 1 to 10

**Reach is the Figments you hold at once.** **Bite is what one Figment is worth when the board is spent** (Curtain, 3(c)), paid on the cash-out sum.

| Visualization | What exists there (kept) | Reach (held) | Bite (per Figment) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: Picture, Redraw, Let go, Glimmer; 2 forms | **1** | **0.6** | |
| 2 | Cash in; a form known (each point from here) | | | **Curtain** (Cash in's loud form) |
| 3 | perk step; 2 designs, 1 trait | | | |
| 4 | fork: Hard Light or Sharp Light | **2** (was at 5) | | |
| 5 | 3 designs | ("two held" moves to 4) | | |
| 6 | perk step | | **0.75** | |
| 7 | perk step; 2 traits a design | **3** | | |
| 8 | fork: Many Hands or Masterwork; 4 designs | | | **the Push: Overhold** |
| 9 | perk step | | **0.9** | |
| 10 | Mastered (Solid Image); 5 designs | **4** (new; today 3 without a fork or the class) | | |

`limits.held_most` becomes 5 (Reach 4 and Many Hands) and `limits.bodies` 7 (the Push, the Double and a Sentinel). The Rigger's +1 held goes to Visualization (the Breaker pattern); the Rigger keeps its +1 design.

**Expression is the engine's size:** +10% on every Figment's blows and HP a point above 1 (3(h)).

### 3(c) The cash-out: Curtain

**Curtain** (Visualization 2, the `figment_order` site, 1 AP, Visualizer in hand): every Figment you hold within your projection range that can reach one foe converges on it at once, then comes apart. The blow is `Bite x S(Figments in it)` plain hits of a Figment (the `figment` profile at your level), and **half their made charge comes back** (Let go's share). Cash in (one Figment, all its charge back, no blow) is kept beside it.

**Costs, one by one, at level 1, 10 and 20.**

| Cost | Level 1 (Visualization 7, 3 held) | Level 10 (Visualization 9, 3 held) | Level 20 (Visualization 10, 4 held) | Kept or changed |
| --- | --- | --- | --- | --- |
| Picture | 2 AP + 1 to 4 charge + 1 a trait | the same; Quick Sketch 1 AP once a turn | the same | kept |
| upkeep | 3 a turn, and 1 AP at 3 held | 3 and 1 AP | 4 and 1 AP: a core in two and a half turns | **1 charge a turn for every two Figments held (rounded up); the AP from 4 held** (was 3): so a full board costs 2 a turn, a choice to keep, not a drain that forbids the Reach |
| the Visualizer's core | 10 | 10 + Proficiency | 10 + Proficiency | **+1 charge a Proficiency point** (3(g)) |
| orders | 1 to 3 AP | the same | the same | kept |

The board's worth grows with the level column (the Figments' blows and HP); its charge and AP do not, so a board of four is the same choice at every level: a turn and a core to build, a charge a turn to hold.

**The cash-out table** (plain hits of a Figment in one 1-AP Curtain; the board was built at 2 AP and 1 to 4 charge a Figment and fought while held):

| Who | Figments in it | One Curtain is worth | What it spends | How often |
| --- | --- | --- | --- | --- |
| Visualization 1 | 1 | 0.6 hits | one Figment (Cash in it instead) | rarely |
| Visualization 4, a mixed character | 2 | 1.3 hits | two cheap forms (Snare 1, Eye 2) | every 2 to 3 turns, the forms Pictured again |
| Visualization 7 | 3 | 2.7 hits | a board of three | once or twice a fight |
| Visualization 10, a specialist | 4 | 4.8 hits | a board of four | once a fight, at its end or before the board falls |
| the Push at 10 | 5 | 6.7 hits | five | once a fight in practice |

A Figment the foe was about to destroy gives nothing back and Snaps you; spending it in a Curtain gives a blow and half its charge: so the Curtain is also the answer to a board about to fall. **Reason for Bite 0.6 at 1:** the second and later Figments of a Curtain are each worth about a plain hit or more, so a board that has fought pays once more when it goes.

### 3(d) The Push at Visualization 8: Overhold

Once a turn, Picture **one Figment past your Reach**. **Price:** while you hold more than your Reach, the extra one drinks 2 charge at each of your turn starts (beside the upkeep), and when it is destroyed it Snaps you for 2 AP, not 1. Reason: a crowded stage is held by the hand that pays for it every turn.

### 3(e) Marks on the door, and the Figment form marks

**A unit** is a Figment blow landed on a worthy foe, or 2 for each Figment spent in a Curtain (a specialist lands about 8 to 10 a fight: about 30 an hour).

| Mark | About | Gives |
| --- | --- | --- |
| I (60) | hour 2 | each fight starts with a Figment of your first ready design beside you (its charge paid as usual) |
| II (380) | hour 11 | Bite +0.05 |
| middle (600) | hour 17 | your oldest Figment needs no upkeep |
| III (820) | hour 23 | Overhold without its price once a fight |

**Figment form marks** (Law 3, new track; forms known stay by points, `figments.json:41`): a form earns a mark each time it is held through a worthy fight to its end.

| Form mark | Fights held | Gives |
| --- | --- | --- |
| I | 6 | +15% HP for that form |
| II | 20 | a second order to it each turn costs 1 AP less |
| III | 50 | one more trait slot on that form's designs |

Rates: a specialist holds about 3 forms a fight, about 10 form-fights an hour, 500 by hour 50 over the 7 or 8 forms it uses: about 24 of the 30 form marks, the 80% the charter asks.

### 3(f) Tags for mixed characters

| Move (door) | Keeps | Why |
| --- | --- | --- |
| Picture, Glimmer, every order (Figments) | Shadow (1(f)); the blow of a Figment is the Figment's, not yours | the illusionist stays unseen |
| a Ward's Interpose and its soak (Figments) | your plates (Guard) and the chain (Momentum): the hit it takes is not yours | |
| a Figment standing on your Line's tile (Figments) | your glyph: it is not scuffed while the Figment stands there | the base of the Figments-Sigils Crossing (section 2 of the curve) |
| Expression's glyph AP (attribute) | Sigils | a Mind mixed character draws faster (exists) |
| Proficiency's core charge (beta) | Sigils' cores too | one meaning of "charge a core gives" (3(g)) |

### 3(g) Proficiency (beta) and Charisma (gamma), points 1 to 10

**Proficiency: how Figments sustain you.** Today: the feed `1% x Visualization x Proficiency` on Figment HP, −10% ambush damage taken a point (capped 60% at `damage.ts:81`: **points 7 to 10 give that line nothing**), Field Repair restores more from 3 (`skills.json:3669`); perks at 3, 5, 7, 9 (Jury-Rig, Field Repair, Hot-Swap, Tuned: `perks.json:3789-4145`), Mastered Overhaul. **Dead today:** at Visualization under 4 the feed is a few percent.

| Proficiency | Exists (kept) | Each point (PROVISIONAL) | New |
| --- | --- | --- | --- |
| every point | the feed on Figment HP; Field Repair from 3 | **+6% Figment HP flat** (beside the feed); **+1 charge in every mana core you load** (Visualizer and Evoker: stat `core_charge`, which the Visualizer reads too); **−6% ambush damage taken** (to the 60% cap at 10) | each point is a charge you can count and a share of HP |
| 3, 5, 7, 9 | perk steps | | |
| 10 | Mastered: Overhaul | | |

**Charisma: Figments outside the fight, its Calls and its voice.** Today: offers of terms harder to refuse; +1 tile Rally reach a point (`skills.json:3837`); Rally (+3 AP to an ally; −1 and −2 Pressure at 4 and 8: `calls.json:90`); perks at 3, 5, 7, 9 (Parley, Crowd Pleaser, Smooth, Showman: Picture 1 charge less, `perks.json:6514-6745`), Mastered Everyone's Friend; its full points on checks, Asks and passives. Kept: every point is a point on every Charisma check and passive and a tile of Rally; Showman is its bridge to the door.

### 3(h) Expression's card made true

| Line | Today | Proposed |
| --- | --- | --- |
| +10% elemental damage | false (`rules.json:1858`) | **true**: `output.profiles.elemental.attr` 0.1 (Visualization's 0.05 as `attributes.json:175` writes it) |
| glyphs 0.1 AP cheaper | true | kept |
| (new) | nothing on Figments | **+10% on every Figment's blows and HP a point above 1**: `output.profiles.figment.attr` 0.1 (its pair is already Expression's, `rules.json:2017`) and `figment_hp` with Expression in its pair (`rules.json:2057`); the factor 0.9 (`rules.json:1991`) set to 1, a line-holder of the withdrawn contract |

An Expression point outside Figments is never dead: elemental damage for every caster and cheaper glyphs for every Sigil writer.

### 3(i) The class: the Rigger

**What only the Rigger has, not on the skill chain:** **free Doubles** (no charge, no upkeep), **charge from wrecks** (Salvage), **Redline** (a Figment or machine acts now), and **machines from scrap** (the Scrap Sentinel). Its +1 held goes to Visualization; it keeps its +1 design.

| Rank (level) | Moves | Worth pressing once set up? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| I (3) | Double | yes (a lure for 2 AP that costs nothing more) | kept |
| I (3) | Quick Sketch | yes | kept |
| II (5) | Salvage | yes beside a wreck | kept |
| II (5) | Redline | yes (2 to 3 AP of a Figment for 1) | its 5 true reads the level column (it is a flat block that already does: `classes.json:2164`); kept |
| III (15) | Sleight (once a scene) | **no** for a level-15 move: one swap a fight | **once a turn** |
| III (15) | Scrap Sentinel (once a scene) | yes (about two shots a round for 3 AP once) | **once a fight** (a scene can be several fights) |

The Rigger's dial (`classes.json:2282`, value 1) is removed.

### 3(j) How a player spends

**The specialist** (Expression 7, Intelligence 2, Agility 2, Endurance 2, Perception 2 at creation; Visualization 7, Proficiency 3).

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | the build above | three held, 8 forms, 3 designs with 2 traits, fork A, three perk steps; +3 charge a core |
| 2 | Endurance 3; Proficiency 4 | |
| 3 | Charisma 1, 2 | **the Rigger**: free Doubles; Rally |
| 4 | Agility 3; Proficiency 5 | a perk |
| 5 | Charisma 3, 4 | **rank II; FLAG: Visualization 8 waits for Expression 8 at level 6** |
| 6 | Expression 8; Visualization 8 | **Overhold**, fork B, 4 designs |
| 7 | Proficiency 6, 7 | a perk |
| 8 | Intelligence 3; Charisma 5 | a perk; Rally at 2 AP |
| 9 | Proficiency 8; Charisma 6 | |
| 10 | Expression 9; Visualization 9 | Bite 0.9 |
| 11 | Proficiency 9; Charisma 7 | two perks |
| 12 | Endurance 4; Charisma 8 | |
| 13 | Charisma 9; Brain Power 1 | the Sigils door: glyphs at 0.2 AP (Expression 9) |
| 14 | Intelligence 4; Brain Power 2 | |
| 15 | Brain Power 3, 4 | **rank III; FLAG: Visualization 10 waits for level 16**; Lines of 3 |
| 16 | Expression 10; Visualization 10 | Reach 4, Solid Image, 5 designs |
| 17 | Proficiency 10; Charisma 10 | two Mastered perks |
| 18 | Agility 4; Rumination 1 | +1 Flux limit |
| 19 | Rumination 2, 3 | |
| 20 | Endurance 5; Rumination 4 | |

**A mixed character: the illusionist writer** (Expression 6, Intelligence 5; Visualization 5, Brain Power 4, Proficiency 1 at creation). Level 1: two held, Lines of 3, glyphs 0.5 AP: a Snare and an Eye on the Line's ends, a 3-glyph Line every turn. Proficiency from the first point fuels both doors' cores. Curtain on two every 2 to 3 turns; two bars fill. Visualization 7 by level 10 (three held), Brain Power 7 by 16.

---

## 4. Questions for the lead (each with the recommended answer)

1. **Overclock moves from Brain Power 2 to 8** (Leon, section 13.3: no Push before 8; it is literally "one step past your Reach"). Recommended: **yes**; Brain Power 2 keeps its every-2 row (+1 reach, +1 round), now with +3 words to hold, which is felt. The handler's item key changes (`skill:brain_power.2` to `.8`): an old save's armed Overclock state is dropped at load.
2. **48 or 38 Skill points by level 20?** The task says 48; `rules.json:186-189` and `:227-229` give 38 (10 + 28), as `05-pacing.md:183` counts. Recommended: **38** unless the pacing drafter raises the grants; this file's spend tables use 38 (30 in one attribute's skills leaves 8).
3. **The gates and the attribute rhythm.** Ceilings rise at levels 5 and 15 (odd) but Attribute points come on even levels: no specialist can use the gate until the next level. Recommended: **swap the split at the gates**: levels 5 and 15 give 1 Skill and 1 Attribute point, levels 6 and 16 give 2 Skill points (totals unchanged).
4. **The beta feed gains a flat term per beta point** (`effects/feed.ts:37`, one formula for all nine betas), or each beta's own number lives on a stat (Rumination `flux_max`, Analysis the spot TN, Proficiency `core_charge` and Figment HP). Recommended: **the flat term in the one formula** (`1 + own x beta + feed x alpha x beta`), each beta's `own` set by its door drafter, so a beta point is felt from the first point on any character.
5. **Brain Power's card says +10% Sigil power a point**, Raw Power's +5%. Recommended: **+5% for every alpha** (Brain Power's card rewritten to +5%), Intelligence +10% as its card says; the specialist's reward is carried by the Line's Bite and Reach.

## 5. Built from

| Rule or number | Existing piece and data key (file) | What must change |
| --- | --- | --- |
| Shadow Reach 2 / 3 / 4 / 5 at 1 / 4 / 7 / 10 | `rules.json:2594` `shadow.cap_by_points`, `character.ts:1261 shadowCap` | the numbers; `operative_cap_add` 0 and its reader `character.ts:1871`; the texts at Ingenuity 5 and 7 (`skills.json:2344`) |
| Shadow Bite 0.75 / 0.9 / 1.05, paid on S(n) | the Break toggle's `damage_mult` value block (`skills.json:2106`), `rules.json` `shadow.per_point` | the block's `res:shadow` term becomes the door ladder's Bite on the cash-out sum (shared primitives 1, 2) |
| Perception +10% on the Break | the same block | a term `attr:perception` (primitive 3) |
| Last Shade (the Push) | a data `grant_action` / toggle; condition `traced` (`conditions.json:1593`); the meter's cap | the cap read through a stat (primitive 4) |
| Shadow door Marks | the drill track's piece | primitive 6 (door Marks) |
| Analysis +1 search TN a point | the feed (`effects/feed.ts:37`, `skills.json:2492` `feed`) | the flat term (Questions, 4) |
| Margins' Perception lines | `character.ts:855 critMult`, `:1237 critTakenPct` (formulas typed in code: move to data) | the Margins drafter's rule; `CRIT_MAX` and the 60% cap moved with it |
| Operative: Mark +2, Toxin no save from Hidden, Called Shot 2 AP | `classes.json:4612`, `:4640`, `:6324` | numbers; Toxin's `if` on `self_has: hidden` (exists) |
| Ranks at 3 / 5 / 15 | `classes.json:12-20` `assignment.rank_levels` | the numbers (the classes drafter's) |
| Line Reach 2 / 3 / 4 / 5 by Brain Power | `character.ts:881 maxSigilWords` (formula typed in code), `sigils.json:32-33` `max_glyphs`, `skills.json` brain_power `door_numbers` | the length read from the door ladder (primitive 1); `max_glyphs` 5; the validator's `line_max` equal |
| Words known 4 + 3 x Brain Power | `character.ts:890 wordsKnownCap` (typed), `sigils.json:193` `known_max` (text) | one copy, in data (`05-pacing.md:250`) |
| Line multiplier Bite x S(n) | `sigils.json:104` `line_mult.by_glyphs`, read in `sigil.ts:436` `sigilDamageTerms` | `by_glyphs` replaced by the door ladder's Bite and the cash-out sum; the stale texts at `sigils.json:165` `multipliers` and `rules.json:1446` fixed |
| Intelligence +10%, Brain Power +5% Sigil power | `rules.json:1850` `output.profiles.sigil` (attr 0, skill 0), pair `:2009` | attr 0.1, skill 0.05 (data only) |
| Expression +10% elemental and Figment | `rules.json:1858` `elemental`, `:1938` `figment`, `:1948` `figment_hp`, pairs `:2017`, `:2057`; factor `:1991` | attr 0.1 (elemental skill 0.05); `figment_hp` pair gains Expression; factor 1 |
| Overclock at 8 and its overload | `perks/skills.ts:27-60` (handler; `OC_CHARGE` typed), `skills.json:2914`; `rules.json:2202` `flux_overload` | the unlock key 2 to 8; the +2 read from the unlock's effect; the overload through the one overload door; `MAX_GLYPHS` + 1 allowed |
| Rumination +1 Flux limit a point | stat `flux_max` (`effects/stats.ts`), `magic.ts fluxMaxOf` | a `stat_mod` by points (or the feed's flat term) |
| Sigil Marks; word Marks I to III | `sigilgrowth.ts:110-113` (`wordUses`, Practised 10, Mastered 30, `sigils.json:233`); `word_cost` op | Mark I as a `word_cost` −1 for a Practised word; Mark III lifts the repeat's 0.9 for that word (`sigils.json` `repeats.mult_per_repeated_glyph`); door Marks primitive 6 |
| The book of found spells | `sigilgrowth.ts:22` `SigilGrowth` (saved), `addStudy` | primitive 7 (shared with the Soul drafter's Outburst designs) |
| Intelligence +5% practice | every practice track's adder (`sigilgrowth.ts:40 addStudy`, drill, modules) | stat `practice_rate` (primitive 5) |
| Stored Spell to rank I; Core Change to II; Backdraft to III | `classes.json:4996`, `:1801`, `:1835` | the rank lists only; keys kept |
| Sigilist and Rigger dials removed | `classes.json:1941`, `:2282` | delete the rows |
| Figments Reach 1 / 2 / 3 / 4 | `figments.json:48` `ladder` (`figments.ts:45 ladderAt`), `:27` `limits` | the rows (held 2 at 4, 4 at 10); `held_most` 5, `bodies` 7; the Rigger's Hands' `ties_max:owned` +1 removed |
| Curtain | `figments.json` verbs (the `figment_order` site), ops `deal` with `targets` (`tied: owned`), `unmake` with `refund` | a verb row; its amount a number block on the cash-out sum of `ties:owned` (a source that exists) |
| Overhold (the Push) | stat `ties_max:owned`; `upkeep`; a conditions.json row for the extra drink and the doubled Snap | a condition row; if `condtable.ts` cannot carry a stat, its `CondMods` reader gains the `ties_max` line (an existing kind of reader, not a new list) |
| Upkeep per two Figments; AP from 4 | `figments.json:30` `upkeep` (`n`, `ap_from`) | a `per_held` number (0.5, rounded up) in the existing reader |
| Proficiency +1 core charge | stat `core_charge` (`character.ts:1223 coreChargeOf`) | the Visualizer's load (`figments.json:9` `visualizer.charge`) reads the same stat |
| Figment form marks | the drill track's piece | primitive 6 |
| Sleight once a turn, Scrap Sentinel once a fight | `classes.json:2211`, `:2246` `uses` | the scopes |
| Tags "keeps" | the `struck` flag and the turn-end gain (`skills.json:1852`); Momentum's walk loss (`physical/rules.ts`) | primitive 8 (the shared `keeps` answer the Body drafter names) |
| The Calls' price table (gamma points 2 and 6) | `calls.json` `rules.price` | **not changed here**: shared by all nine gammas; every Mind gamma point is already felt (checks, passives, reach) |

## 6. Needs a new primitive

Eight, all general. Numbers 1, 2, 6 and 8 are the Body drafter's (`02-body.md` "Needs a new primitive"), listed so the lead sees which Mind rules ride them; numbers 3, 4, 5 and 7 are asked for here.

| # | Primitive | Smallest form | Why nothing existing does it |
| --- | --- | --- | --- |
| 1 | The door ladder (shared) | a `ladder` on a door's rules row (`{points, reach}`, `{points, bite}`), one reader `doorLadder(x, door)`; Shadow's `cap_by_points`, Brain Power's Line length and Figments' `ladderAt` become its users | the Line length is a typed formula of Intelligence (`character.ts:881`); Bite is a constant everywhere |
| 2 | The cash-out sum (shared) | `rules.json output.cash_out.step` 1.2, `cashSum(n)`, a number-block source `cash:<resource>` | number blocks are linear (`base + per`); no source reads "units spent in this action" |
| 3 | `attr:` in number blocks | one namespace in `SOURCE_SPACES` (`effects/triggers.ts:373`): the holder's attribute value | `skill:` exists; no item op can read an attribute, so the Break cannot carry Perception's term in data |
| 4 | `res_max:<resource>` stat family | one family line in `STATS` (`effects/stats.ts`): added to a resource's cap where the cap is read | every door's Push past its Reach needs the cap moved for one action; today Overclock bumps `mg.maxWords` by hand (`perks/skills.ts:28-33`) and Shadow's cap is a fixed function |
| 5 | `practice_rate` stat | one line in `STATS`, read by each practice track's adder | no stat touches study, drill or module practice |
| 6 | Door Marks and form marks (shared) | the drill track's piece made general: a track keyed by `door:<id>` or `form:<id>`, filled by units against worthy foes (the level gap of `enemies.json levels.gap`), thresholds in data | the drill track is per weapon only; nothing counts a door's cash-outs or a form's fights |
| 7 | The found book | a per-character set of first-time keys by system (`sigil:<sorted words>`, `design:<id>`), with a data payout (study or practice); saved, with a load default | `SigilGrowth` keeps study and uses, never which sentences were cast |
| 8 | `keeps` (shared) | a list on an action row of the counters it keeps, read by each door's loss rule | the losses are read per door (`struck` on any attack roll; Momentum's walk) with no way for a move to say "not this one" |

## 7. What re-records

| Guard | Why it moves |
| --- | --- |
| `test/golden-damage*` (the magic, techniques, classes and perks tables) | every Line (Bite x S(n), the Sigil profile's slopes), every Break (Bite, Reach, Perception), every Figment blow (factor 1, Expression's slope), Rig and Redline's level reading |
| `test/golden-costs*` and `costs-*.marks.json` | Overclock moves (2 to 8) and gains a price; upkeep per two and the AP at 4; Called Shot 2 AP; Sleight and Scrap Sentinel scopes; Mark I's free first glyph |
| `test/golden-rules*` | the Shadow meter's cap, Last Shade and Traced, Toxin without a save from Hidden, Lines of 5 |
| `test/golden-itemops*` | the Break's value block and the Ingenuity, Visualization and Brain Power unlock rows |
| `test/replay-hash.test.ts`, `test/golden/replays.json` | any seeded game with a Mind character or an Evoker-carrying enemy (data change on purpose) |
| `test/sigil-balance.test.ts:23-38` | it pins a best spell under `SIGIL_CAP x 1.3`: a line of the withdrawn contract; the 5-glyph Line passes it by design. To be deleted with `SIGIL_CAP` (a dead constant: `sigil.ts:329`) |
| `test/balance/magic-measure.test.ts:33-37` | it asserts at least 2 casts to kill an Elite and 4 a Boss; the Elite guard keeps the first, the second may fail with Lines of 5: a line, to be re-read as a measure |
| shadow and figment measures in `test/balance/` | they print; the numbers move |
| `test/old-save.test.ts` and its fixtures | the saved `sigilGrowth` gains `book`; Overclock's state key moves; the Rigger's +1 held is gone (a save holding 4 Figments at Visualization 7 keeps them until they fall: no loss at load) |
| `test/descriptors.test.ts`, `apps/web/src/screens/combat-actions.test.ts`, `test/actions.test.ts` | new actions: Curtain, Last Shade, Overhold; Overclock's rung |
| the text-number guard (`tools/text_numbers.py`, `test/datatext.test.ts`) | the door lines, the cards (Intelligence, Expression, Perception, Brain Power), the ladders' texts and Overclock's |
| `test/lint-item-ops.test.ts` baseline | goes down if Overclock's handler becomes data on the new stat (primitive 4) |
| `test/survival-run.test.ts` bars | measured clears move for the Operative, the Sigilist and the Rigger (read, not fitted) |
