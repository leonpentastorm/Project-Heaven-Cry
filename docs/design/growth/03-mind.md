# The doors of Mind: Shadow, Sigils, Figments (0.34 total rebalance, design; second draft, 21 Nov 2026)

For the lead. **Nothing here is built.** Written to the charter (`docs/design/proposals/2026-11-21-the-curve.md` sections 10 to 18), its six laws (sections 2 and 3), the Momentum pattern (section 16) and **the lead's rulings, `00-rulings.md`, which bind this draft** (A4, A7 to A9, B11 to B13, C16 to C20, D22, D23 and E touch it). Facts about today were read in data and code at `release/0.34-final` (worktree `E:/phc-wt/rel030`) and carry file:line. Every proposed number is **PROVISIONAL**, with one line of reason a player would recognise.

**What this file does not own.** Every shared number is `01-scale.md`'s, quoted here by its table or section name: the factor x0.6 (01 section 2), the `deal`, `mend`, `mp` and enemy columns (01 T4), the cards (01 4.1, 4.2, T5), HP and MP (01 T6, T7a), every cost rule (01 T7b), the grade ladder (01 T9), Margins (01 section 9, T10), the stack rule (01 10.1) and the top-of-scale check (01 T11). Every rate (fights an hour, study, word mastery, found spells, form marks, door Marks' formula) is `05-pacing.md`'s (ruling D22), quoted from its section 4.

## 0. Shared rules this file uses

1. **The cash-out sum** (01 10.1): `S(n) = (1.2^n - 1) / 0.2` (S(1) 1, S(2) 2.2, S(3) 3.64, S(4) 5.37, S(5) 7.44, S(6) 9.93, S(7) 12.92, S(8) 16.5). Each door's cash-out row carries its own constant (critic-consistency minor 1): **the Break `1 + Bite x S(n)`; a Line `Bite x S(n)`; a Curtain `Bite x S(n)`**. That factor is the stack rule's `C`; Margins add to it (01 section 9); everything else on the sheet goes into the one sum Σ (ruling A8).
2. **Reach and Bite** step at points 1, 4, 7, 10 (Reach) and 1, 6, 9 (Bite) on all three Mind doors. **A door's top Reach needs its family** (ruling B13, PROVISIONAL, flagged for Leon): the step at 7 needs the door's beta at 4; the step at 10 needs the beta at 7 and the gamma at 4.
3. **The Push at skill 8** (ruling C17), once a turn: the door's Reach is one higher for that use (critic-consistency M8: one shape, `res_max:` S5 below), and its price lands on you.
4. **Door Marks** are earned by using the door (ruling C18): each door names its unit below; the thresholds are **05's formula, `[2, 11, 17, 23]` hours x the door's units an hour for a specialist** (`05-pacing.md` section 4, "A door's Marks"), counted only on worthy foes (05's worth table, section 2). The numbers below are that formula read at this file's units an hour; the simulator reads the real units and they move with it.
5. **Points** (ruling B11): 38 Skill points and 20 Attribute points in a career, creation included. 30 in one attribute's three skills leaves 8.
6. **Gates** (ruling B12): attribute ceiling 7 at creation, 8 at level 5, 9 at 10, 10 at 15; class at 3, rank II at 5 (its attribute 5), rank III at 15 (its attribute 8). **Levels 4 and 14 give 2 Skill points; levels 5 and 15 give 1 Skill and 1 Attribute point** (a swap; totals unchanged). Today the gains are 2 Skill points on odd levels, 1 on even, and an Attribute point every 2 levels (`rules.json:223-235`). So a specialist's alpha moves at 5, 10 and 15, the same level as its gate.
7. **Every beta point counts from the first** (ruling C20): a flat term in the beta's formula (`effects/feed.ts:37`, one formula for all nine betas: `1 + own x beta + feed x alpha x beta`, each beta's `own` set by its door file).
8. **Two foci, one pair of hands** (ruling E). Sigils need an Evoker in a hand, Figments a Visualizer (`docs/rules/PHC-Core-Rules-v1.0.md:689`); Shadow needs none. Changing what a hand holds in a fight costs 1 AP a hand. Survival gives one free focus (`survival.json:47` `focuses`); the camp sells a second. A two-door Mind caster either holds both foci and no weapon, or a weapon and one focus and pays **1 AP each time it changes door**. Every two-door table below counts it.

---

## 1. Perception: the door of Shadow (Ingenuity; Analysis; Vigilant; the Operative, id `infiltrator`)

### 1(a) Today

**The counter.** Shadow, `res.shadow` (`actions.json` resources). Its cap by Ingenuity points: 1 at 1, 2 at 5, 3 at 7 (`rules.json:2594-2598` `shadow.cap_by_points`, read by `character.ts:1261 shadowCap`); the Operative holds `operative_cap_add` 1 more (`rules.json:2599`, read at `character.ts:1871`) and starts each fight with 1 (Tradecraft, `classes.json:1698`). So Ingenuity 10 holds 3 (4 for an Operative): points 8, 9 and 10 add no Reach.

**What builds it** (`skills.json:1852` ingenuity unlock 1, effects 0 to 2, at most `door_gains_per_turn` 2 a turn, `rules.json:2604`): +1 when your turn ends Hidden with no attack made; +1 for a cover-to-cover move unseen (once a turn); +1 for a kill nobody saw; First Shade +1 on the first Hide of a fight holding none; Stalk (2 AP, once a turn, +1: `shadow.json:543`); the Operative's unseen Analyze +1 (`classes.json:1698`); Light Fingers' unseen Lift +1 (`forks.json` `fork.shadow.light_fingers`). **What wears it:** -1 at your turn start while seen; all of it when Downed and at the fight's end.

**What spends it.** The **Break** (`skills.json:2106` toggle `shadow.break`): one weapon attack from Hidden, all Shadow spent, multiplier `1 + 0.6 x Shadow + 0.5 on a fresh ambush + 0.15 on a Marked foe` in place of the ambush term (`rules.json:2601-2603`; the block typed again in the toggle's `value`). At Ingenuity 10, Operative: `1 + 2.4 + 0.5 = x3.9`; at Ingenuity 1: x2.1. The verbs that cost Shadow (`shadow.json`): Fade 2 AP 2 Shadow (Ingenuity 5), Open Seam 1 AP 1 (7), Timing 1 AP 1 (9), Cut the Strap 1 AP 1 (6), Decoy 1 AP 1 (2), Disable 2 AP 1 (Operative II), Hijack 2 AP 2 (Operative III), Rig 2 AP 1 (Operative II; `shadow.json:692`, an amounts block of 25); free of Shadow: Tag 1 AP once a turn (1), Case 1 AP (3), Lift 2 AP (2), Stalk 2 AP (1), Pick 1 AP (Operative II), Douse 1 AP (5). Lend the Dark (fork at 4) spends Shadow to hide an ally.

**The ladder** (`skills.json:1852-2410`): 1 the door (Break, Go to Ground, First Shade, Tagged, Unseen Hand: from Hidden roll with Ingenuity when higher); 2 Lift and Decoy; 3 perk step and Ghost Kill; 4 fork Light Fingers or Lend the Dark; 5 "holds one more", Fade, Douse, Scout; 6 perk step, Cut the Strap; 7 perk step, "holds one more", Open Seam; 8 fork Lightkiller or Spotter; 9 perk step, Timing, Parting Cut; 10 Mastered (Vanishing Act, `perks.json:11582`). Per point: +1 to foes' spot roll every 2 points (`per_point.numbers.spot` 1). Perks: Long Dark +8% / +14% damage while Hidden (`perks.json:3496`), Shadow Step (`perks.json:3588`). **The Push:** none.

**The attribute's card** (`attributes.json:124`): +2 vision a point (true), +3% critical damage a point (true: `character.ts:855`, held at x2.0 by `CRIT_MAX`), -10% critical damage taken a point (`character.ts:1237 critTakenPct`, typed in code, capped 60%: dead from Perception 8). Perception adds nothing to the Break.

**The class** (`classes.json` base `infiltrator`): gain Tradecraft (start 1 Shadow, +1 cap, Analyze Reads its target, unseen Analyze +1 Shadow, `:1698`); rank I Mark (`:4612`) and Vanish (Hide 0 AP once a turn); rank II Toxin (`:4640`) and Sabotage; rank III Execution and Called Shot (3 AP, `:6324`). Ranks today at levels 3, 6 and 12 with Perception 5 and 8 (`classes.json:12-20`).

**Measured.** The Operative cleared 0 of 40 in 0.32 (`docs/design/handoffs/0.32-MEASURES.md:180`), 21 in 0.33 after the rack's rifle (`0.33-LANE-BALANCE.md:36`).

### 1(b) Ingenuity's ladder, points 1 to 10

**Reach is the Shadow meter's cap. Bite is what each Shadow spent in a Break adds**, paid on the cash-out sum.

| Ingenuity | What exists there (kept where it is) | Reach (meter) | Bite (per Shadow) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: Break, Go to Ground, First Shade, Tagged, Unseen Hand; Tag, Stalk | **2** (was 1) | **0.45** | |
| 2 | Lift, Decoy; spot +1 (every 2) | | | |
| 3 | perk step, Ghost Kill, Case | | | |
| 4 | fork: Light Fingers or Lend the Dark; spot +1 | **3** (was 2 at 5) | | |
| 5 | Fade, Douse, Scout | (its "holds one more" moves to 4) | | |
| 6 | perk step, Cut the Strap; spot +1 | | **0.5** | |
| 7 | perk step, Open Seam | **4** (was 3), **with Analysis 4** (B13) | | |
| 8 | fork: Lightkiller or Spotter; spot +1 | | | **the Push: Last Shade** |
| 9 | perk step, Timing, Parting Cut | | **0.55** | |
| 10 | Mastered (Vanishing Act); spot +1 | **5** (new), **with Analysis 7 and Vigilant 4** (B13) | | |

The Operative's `operative_cap_add` is retired: its +1 is everyone's from Ingenuity (ruling C16; what the class gets in its place is in 1(i)).

**Reason for the Bites, PROVISIONAL.** Under the stack rule a Break's fresh ambush (+50%) and a Marked foe (+15%) are positions, so they go into Σ (01 10.1) and multiply the whole blow instead of adding 0.5 to it. 0.45 at Ingenuity 1 is the least that makes a first Break of 2 Shadow worth the shots it took to build (1(c)); 0.55 at 9 is the most that keeps **Leon's five digits** with the Break's own ambush and as much again beside it (01 T11 asked for at most 0.93 to carry the ambush alone, about 0.56 to carry the Coup's sum: 1(c)).

**Perception and Ingenuity are the Break's pair** (01 4.3: a hit reads the pair of the door that cashes it out). So the Break reads `Stat = k x (1 + 0.10 x (Perception - 1)) x (1 + 0.05 x Ingenuity)` on its weapon's base and the gun profile's `k` (01 T5), in place of the weapon's Agility and Dexterity. No `attr:` source is needed (01 replaces it with an action's pair, its extension 1).

### 1(c) The cash-out: the Break

**The Break:** `C = 1 + Bite x S(Shadow spent)`; the fresh ambush (+50%) and a Marked foe (+15%) into Σ; Margins on the weapon's plain hit (01 section 9). It stays one weapon attack and spends all the meter, as today.

**Costs, one by one.** AP is the clock and does not scale; Shadow is a count (01 T7b: it never scales). Its price is the Break it takes from: the top Shadow of a full meter is worth `Bite x 1.2^(n-1)` hits of your weapon, and your weapon's hit grows with the `deal` column, so spending one on a verb is the same choice at level 1, 10 and 20 (about 0.5 to 0.9 of a hit at Reach 2 to 4, about 1.1 at Reach 5). **Kept:** every verb's AP and Shadow, the gains a turn 2.

**The cash-out table** (plain hits of the same pair; a Shadow built costs about 2 AP of Stalk or a cover move, and a turn that ends with a gain makes no attack; the Break's own shot is 2 AP; with the fresh ambush, the usual case):

| Who | Shadow spent | C | One Break with the ambush | The same AP of plain shots | How often |
| --- | --- | --- | --- | --- | --- |
| Ingenuity 1 | 2 | 1.99 | 3.0 hits | 3 (6 AP): par | about every 1.5 turns |
| Ingenuity 4, a mixed character | 3 | 2.64 | 4.0 hits | 4 (8 AP): par | about every 2 turns |
| Ingenuity 7, Analysis 4 | 4 | 3.68 | 5.5 hits | 5 (10 AP): +11% | about every 2.5 turns |
| Ingenuity 10, Analysis 7, Vigilant 4: a specialist | 5 | 5.09 | 7.6 hits | 6 (12 AP): +27% | about every 3 turns |
| Last Shade at 10 | 6 | 6.46 | 9.7 hits | 7 (14 AP): +38% | once a turn at most; see 1(d) |

On top of the table: Perception's +10% a point rides the Break and not the gun's plain shot (its pair), Margins come on top, and while building you are Hidden (enemies cannot target you). The mixed character breaks even on damage and is paid in safety and tempo; the specialist waits and is paid for the wait.

**On the scale** (01's units): at level 1 the specialist's plain service-rifle shot (18, 01 T3) on the Break's pair (Perception 7, Ingenuity 7) is about 35; its Break of 3 (level 1, Analysis 3) is about 150 with the ambush, of 4 (level 2) about 230: three digits, a cash-out's, as the Coup's; plain hits stay two digits (ruling A1). At level 20, Celestial, Perception and Ingenuity 10, the long rifle's plain hit is 4,968 (01 T11): **a full Break of 5 is about 25,300, about 38,000 with the ambush; the largest legal one** (Last Shade, a natural 20 on a foe four levels under: 9 Margins, 01 T11) **about 47,800 before Σ**, so the Break may carry **+109% in Σ**: its own +50% ambush and about +59% beside it (the Coup's budget is +57%, 01 T11). Long Dark (+14% while Hidden) is one of the sources 07 trims to that budget (01 10.3 item 5).

### 1(d) The Push at Ingenuity 8: Last Shade

Once a turn, your meter's Reach is **one higher** until your next Break (a one-use condition on `res_max:shadow`, S5); it fills there by the usual gains. **Price:** the Break that spends it leaves you **Traced** until the end of your next turn (`conditions.json:1593` `traced`: the other side sees you wherever you are; no Hide, no Fade, no Ghost Kill while it lasts). Reason: the deepest Break of the fight is followed by a turn in the open, so the player chooses when the room can bear it.

### 1(e) Marks on the door

**A unit** is one Shadow spent in a Break on a worthy foe. A specialist breaks about twice a fight, 4 to 5 units each: about 29 units an hour at 05's 3.2 worthy fights an hour (`05-pacing.md` section 4). 05's formula then reads **58 / 319 / 493 / 667** units (the simulator to read the real rate).

| Mark | About (05) | Gives (PROVISIONAL) |
| --- | --- | --- |
| I | hour 2 | the meter starts each fight primed with 1; **it stacks with the Operative's Tradecraft start** (2 for an Operative) |
| II | hour 11 | being seen costs you Shadow only every other turn start (`wear:shadow`, S6) |
| middle | hour 17 | a Break that drops its target gives back 1 Shadow (under the gains a turn) |
| III | hour 23 | Last Shade costs nothing (no Traced) once a fight |

Reason for Mark II: the specialist who has broken from the dark three hundred times keeps its nerve in the light.

### 1(f) Tags for mixed characters

Today Hidden ends when you attack, take a hit or a foe ends its turn next to you, and the turn-end gain fails after any attack roll (the `struck` flag on `attack_roll`, `skills.json:1852` effect 4). So every move that is not an attack already **keeps Shadow**. The tags are for the attacks that should not count, carried by `wear:<resource>` (S6) with a `stat_mod` whose `context` names the actions:

| Move (door) | Keeps | Why |
| --- | --- | --- |
| an Evoke of a Line with no damaging Subject (VEIL, LIGHT, WARD, MEND, STEP...) (Sigils) | Shadow: not an attack | a working is not a blow |
| drawing a glyph, Scuff, Picture, Glimmer, every Figment order (Sigils, Figments) | Shadow (already true: no attack roll) | stated so the card can say it |
| a Whisper; Begin and Pump of an Outburst; tending a Bond (Prayer, Outbursts, Bonds) | Shadow (already true) | |
| a Figment's blow on its own turn or by your order (Figments) | Shadow: the blow is the Figment's | the order is your action, so it needs the tag |
| Shadow's Tag, Stalk, Hide, Case | the Momentum chain and the plates (02's tags) | quiet steps are not walking away |

### 1(g) Analysis (beta) and Vigilant (gamma), points 1 to 10

**Analysis: how Shadow protects you.** Today: every point +1% x Ingenuity x Analysis on the spot TN while Hidden (the feed, `effects/feed.ts:37`), -5% critical damage taken, +1 tile Analyze reach (`skills.json:2492`); perks at 3, 5, 7, 9 (Pattern Lock, Quick Read, Read Them, Still Breath: `perks.json:6105-6415`), Mastered Case Closed (`perks.json:11902`). **Dead today:** below Ingenuity 4 the feed rounds to nothing, so a mixed character's points 1, 2, 4, 6 and 8 give a tile of Analyze reach and little else.

| Analysis | Exists (kept) | Each point (PROVISIONAL) |
| --- | --- | --- |
| every point | the feed on the spot TN; +1 tile Analyze reach | **+1 to the TN foes need to find you while Hidden, from the first point** (C20: the beta's flat term). Its "-5% critical damage taken" goes with the critical (A7); what it becomes is 07's restatement (01 section 9) |
| 3, 5, 7, 9 | perk steps | |
| 4, 7 | | **opens Reach 4 and (with Vigilant 4) Reach 5** of the meter (B13) |
| 10 | Mastered: Case Closed | |

Reason: the search roll is a number the player sees every time a foe looks for them.

**Vigilant: Shadow outside the fight, and your eyes.** Today: +1 to notice traps and hidden foes, +1 tile notice range, +1 tile Spot reach a point (`skills.json:2671`); vision `12 + 2 x (Perception - 1) + Vigilant` (`rules.json` senses); the Spot Call (`calls.json:254`: steps at 1, 4, 8; price by points from the shared table, `calls.json` `rules.price`); perks at 3, 5, 7, 9; Mastered Nothing Gets Past; as a gamma its full points on checks, Asks and passives. Kept, with one change and one gate:

| Vigilant | New (PROVISIONAL) |
| --- | --- |
| 4 | opens Reach 5 of the meter with Analysis 7 (B13) |
| 6 | **a Spot you make while Hidden gives you 1 Shadow** (under the gains a turn): the eye in the dark. A `resource` op on the Call's own row (`when: acted`, `if self_has: hidden`), the pattern 02 used for Sensory 6 |

Every other point is a tile of sight on the map, a tile of Spot and a point on every notice and passive.

### 1(h) Perception's card (01 4.2)

| Line | Today | 0.34 (01 4.2) |
| --- | --- | --- |
| +2 tiles of vision | true | kept |
| +3% critical damage | true under x2.0 | goes with the critical (A7); in its place **a Margin is worth one more percentage point a Perception point** (01 section 9: 26% at Perception 1, 35% at 10) |
| -10% critical damage taken | dead from Perception 8 | goes; 07 restates what critical damage taken becomes (01 4.2) |
| (new) | nothing on the door | **+10% on a Break a point above 1** (the Break's pair, 01 4.3) |

A Perception point outside Shadow is never dead: two tiles of sight and a better Margin on every roll.

### 1(i) The class: the Operative

**What only the Operative has:** **the Read** (its Analyze shows the foe's next action), **Marks** (three foes Marked for the whole squad), **toxins**, **the machine work** (Pick, Disable, Rig, Hijack), and, in place of its retired +1 cap (C16), **Dead Drop**: the Operative alone can hand its Shadow to a friend. It keeps Tradecraft's start of 1 Shadow and the unseen Analyze's +1.

| Rank (level) | Moves | Worth pressing once set up? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| gain (3) | Tradecraft | yes | the +1 cap retired; **Dead Drop** joins it: 1 AP, 1 Shadow, once a turn, a friend within 4 tiles who holds the Shadow door gains 1 Shadow, never past its own Reach. Reason: the Operative's spare dark becomes the squad's ambush. A `grant_action` with a `resource` op on the ally, read against the ally's cap |
| I (3) | Mark (1 AP) | **no**: +1 to hit for the squad is about 0.4 hits over a fight for half a shot's AP | **+2 to hit for the squad**: about 0.8 hits and a Margin more often (01 T10), worth its AP in the round it is used |
| I (3) | Vanish | yes (saves 1 AP a turn) | kept |
| II (5) | Toxin (1 AP, a dose) | **no**: a save in front of a quarter-turn condition | **no save when the coated hit is from Hidden or a Break**, and a dose coats the next two hits; Bleeding from it is a tick on the dealer's column (01 T7b) |
| II (5) | Sabotage (Pick, Disable, Rig) | yes against machines | Rig's base is 15 on the `deal` column (01 T2b: today's 25 x0.6) |
| III (15) | Execution | yes | kept |
| III (15) | Called Shot (3 AP) | **no**: one shot and an injury for one and a half shots' AP | **2 AP**: a shot and an injury for one shot's AP |

Ranks at levels 3, 5 and 15 (B12), Perception 5 and 8.

### 1(j) How a player spends

**The specialist** (Perception 7, Agility 3, Endurance 2, Intelligence 2 at creation; Ingenuity 7, Analysis 3).

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | the build above | Reach 3 (Ingenuity 7 waits for Analysis 4), Bite 0.5; Fade, Open Seam, fork A, three perk steps; Analysis 3: +3 search TN, a perk |
| 2 | Analysis 4; Agility 4 | **Reach 4**; the gun's attribute |
| 3 | Vigilant 1, 2 | **the Operative**, Dead Drop; Spot; two tiles of sight |
| 4 | Analysis 5, 6 | a perk; +2 search TN |
| 5 | Perception 8; Ingenuity 8 | **the Push**, fork B; **rank II** |
| 6 | Analysis 7; Agility 5 | a perk; half a tile an AP |
| 7 | Vigilant 3, 4 | a perk; Spot's second step |
| 8 | Analysis 8; Endurance 3 | +1 search TN; HP |
| 9 | Vigilant 5, 6 | a perk, Spot at 2 AP; a Spot from Hidden gives Shadow |
| 10 | Perception 9; Ingenuity 9 | Bite 0.55, Timing, Parting Cut |
| 11 | Analysis 9; Vigilant 7 | two perks |
| 12 | Vigilant 8; Agility 6 | Spot's third step |
| 13 | Vigilant 9; Dexterity 1 | a perk, Spot at 1 AP; the gun's to-hit from -2 to 0 |
| 14 | Dexterity 2, 3 | +2 to hit with the gun |
| 15 | Perception 10; Ingenuity 10 | **Reach 5**, Vanishing Act; **rank III** |
| 16 | Analysis 10; Endurance 4 | Case Closed; HP |
| 17 | Vigilant 10; Dexterity 4 | Nothing Gets Past |
| 18 | Dexterity 5; Agility 7 | to hit and the gun's damage |
| 19 | Dexterity 6, 7 | |
| 20 | Athletics 1; Endurance 5 | +1 Defense (C20); HP |

30 points in Perception's skills, 8 elsewhere (Dexterity 7, Athletics 1); Attribute points: Perception 10, Agility 7, Endurance 5, Intelligence 2. Every level is felt; the gates and the alpha land on the same level (5, 10, 15).

**A mixed character: the hidden gunner** (Agility 7, Perception 4, Endurance 2; Dexterity 6, Ingenuity 4 at creation). Level 1: Reach 3, Bite 0.45. Its Break reads Perception 4 and Ingenuity 4 (01 4.3), about three quarters of its own rifle's Agility 7 and Dexterity 6, so a Break of 3 is about 3.0 of its own plain shots for 3 Shadow: an opener paid in safety, then plain fire with Pressure. Levels 2 to 10: Dexterity and Athletics, Analysis 1 to 3 (the search TN from the first point); Ingenuity 6 at about level 9 (Bite 0.5, Cut the Strap). Levels 11 to 20: Perception 6 to 7, Ingenuity 7 with Analysis 4 (Reach 4) at about level 16. No focus, so no hand swap. Two door bars fill.

---

## 2. Intelligence: the door of Sigils (Brain Power; Rumination; Eloquence; the Sigilist, id `mage`)

### 2(a) Today

**The counters.** Glyphs on the ground in a Line and **Flux** (`mg.flux`). A Line is 2 to 4 glyphs in a straight row, one stroke, at least a Subject and one other word (`sigils.json` `grammar`, `max_glyphs` 4). **Its length is set by Intelligence, not Brain Power:** Max Sigil words `2 + floor((Intelligence - 1) / 2)` (`character.ts:881`, typed in code, through the stat `max_sigil_words`); `MAX_GLYPHS` caps it in code (`classes/k.ts:298`, `ai-sigil.ts:194`). **Words known:** `4 + Brain Power` (`character.ts:890`, typed again from the text `sigils.json:193` `known_max`) plus the Mastered free words.

**Costs** (`rules.json:1426-1445`): drawing a glyph costs its word's charge (1 to 3), the Glyph AP (`max(0.5, 1 - 0.1 x (Expression - 1))`, `character.ts:882`) and 1 Flux (TWICE 2); walking the Line costs Movement; Evoke 1 AP and 1 charge a glyph less the core saving (-1 at Brain Power 3, 5 and 9: `skills.json:2903` `charge_at`), at least 1. A core holds 10 charge, the Evoker 1 core, a swap 2 AP. Flux limit 6; over it the Evoker overloads (`rules.json:1435` `overload`: 10 true damage a Flux over; the Evoker locked a round; all Flux to the air); Vent 1 AP. Rumination feeds the Flux limit by `1% x Brain Power x Rumination` (`skills.json:3097`).

**The payoff** (`sigil.ts:356-438`): the strongest damaging Subject in full and half of every other (`rules.json:2066` `output.systems.sigil_damage`; `sigils.json` `grammar.repeats`), x the Reach, Burst and Delivery words, x 0.9 for each repeated glyph, x **the Line multiplier 1.87 / 1.93 / 1.98 for 2 / 3 / 4 glyphs** (`sigils.json:104-116` `line_mult.by_glyphs`; the text at `sigils.json:165` `multipliers` still says 1.7 / 1.75 / 1.8), x the Sigil Stat term, x the level. The Stat term (`rules.json:1850` `output.profiles.sigil`) has **attr 0 and skill 0**: Intelligence and Brain Power add nothing to a Line's damage although both cards promise it. The elemental profile is flat too (`rules.json:1858`).

**Growth.** Study 1 an Evoke, +1 a glyph past the second, +1 if it hit; a word at 6, then every 8 (`sigils.json:209-231`, `sigilgrowth.ts:31-100`). Word mastery: Practised at 10 uses (a label, no effect: `game.ts:4570`), Mastered at 30 (its inflection always on: `sigils.json` `grammar.word_mastery`). No book of found spells.

**The ladder** (`skills.json:2831`): 1 the door (the Evoker opens it); 2 **Overclock** (one word past Max Sigil words, never past 4, +2 charge: `skills.json:2914`; the handler `perks/skills.ts:27-60`, keyed `skill:brain_power.2` at `:47`, types the 2 as `OC_CHARGE` at `:27`); 3 perk step, core saving 1; 4 fork Overflux (+25% at the Flux limit) or Clean Vent; 5 Twin Draw, core saving 2; 6 and 7 perk steps; 8 fork Written in Advance or Running Script; 9 perk step, core saving 3; 10 Mastered (Clean Draw, `perks.json:11716`) and the Junction. Every 2 points: +1 tile Sigil reach and +1 round a glyph lasts (`character.ts:886-887`). **Reach and Bite never move with Brain Power.**

**The class** (`classes.json` base `mage`): rank I Barrage (five Subjects 1 charge less, `:4706`) and Core Change (`:1801`); rank II Backdraft (an overload hits every foe beside you, `:1835`) and Bleed the Flux; rank III Payload and Stored Spell (`:4996`). Its dial is 1, a no-op (`classes.json:1941`).

**Measured.** The Sigilist bot clears 6 of 40 solo against the Channeler's 18, 48 damage a turn against 83 (`docs/design/handoffs/0.33-LANE-BALANCE.md:21-24`).

**Why a Line pays too little for its set-up.** Length is nearly free of reward (x1.98 for 4 glyphs against x1.87 for 2, +6%, for twice the glyphs, walk, Flux and charge); the attribute and skill add nothing; a 4-glyph Line costs a core; and the set-up is exposure (a step a glyph in the open, the Line scuffed or NULLed by the enemy's AI, `sigils.json` `enemy_ai`).

### 2(b) Brain Power's ladder, points 1 to 10

**Reach is the Line's length** (ruling C19: line length rides Brain Power; the ground holds as many of your glyphs) **and words held** (`4 + 3 x Brain Power`, C19). **Bite is the Line multiplier's worth per glyph**: Line multiplier `= Bite x S(glyphs)`.

| Brain Power | What exists there (kept) | Reach (Line; words held) | Bite (per glyph) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: draw, walk, Evoke | **2**; 7 words | **0.85** (x1.87 for 2: today's) | the book of found spells (2(e)) |
| 2 | +1 tile reach, +1 round a glyph lasts (every 2) | 10 words | | **core saving 1** (moved from 3): in place of Overclock, which moves to 8 (C17) |
| 3 | perk step | 13 words | | |
| 4 | fork: Overflux or Clean Vent; every-2 row | **3**; 16 words | | |
| 5 | Twin Draw; core saving 2 | 19 words | | |
| 6 | perk step; every-2 row | 22 words | **0.9** | |
| 7 | perk step | **4, with Rumination 4** (B13); 25 words | | |
| 8 | fork: Written in Advance or Running Script; every-2 row | 28 words | | **the Push: Overclock** |
| 9 | perk step; core saving 3 | 31 words | **0.95** | |
| 10 | Mastered (Clean Draw); the Junction; every-2 row | **5, with Rumination 7 and Eloquence 4** (B13); 34 words | | |

**What Brain Power 2 gives in Overclock's place:** the first core saving (a charge less on every Evoke, felt in every Line), beside the every-2 row's tile of reach and round a glyph lasts. Words held at 2 (10) rarely bind before about hour 8 (05: a word every 1.6 hours), so the saving is the point a player feels.

`grammar.max_glyphs` becomes 5 (6 under Overclock); `MAX_GLYPHS` leaves code for it. **The Line multiplier by length:** Brain Power 1: x1.87 for 2; 4: x3.09 for 3; 7: x4.83 for 4; 10: x7.07 for 5 (x9.43 for 6 under Overclock). A 2-glyph Line at Brain Power 10 is x2.09: the short Line grows with the skill, the long one most.

**Reason for the Bites, PROVISIONAL:** 0.85 at 1 keeps today's x1.87 for a 2-glyph Line, so nothing a player has is taken back; 0.95 at 9 is the most that keeps the short Line of the strongest Subject (STONE, 21 after x0.6: 01 T2b) at four digits at level 20 (01 10.3 item 1 asked for under 0.99) and leaves the long Line room in Σ (2(c)).

**The cards** (01 4.2): **Intelligence +10% Sigil power a point above 1, Brain Power +5% a point**, multiplied (A4). **A Line takes the Evoker's grade** (A9, 01 T9): Fine x1.15 and +1 to hit on a spell with a roll, Masterwork x1.3 and +2, Relic x1.5 and +3, Celestial x1.75 and +3.

**One Subject's damage to a Line (new, PROVISIONAL; 01 10.3 item 3).** A Line's damage is its strongest damaging Subject's; **every other damaging Subject adds its element and its condition, not its damage** (in place of today's half). Reason: a Line is one spell and its length is its power; a second fire word makes it burn, it does not hit twice. Without it a Line of five Subjects is six digits with nothing on the sheet (01 T11: 160,730). Barrage and Twin Draw still pay: they make Subjects cheaper and faster to write. Data: `rules.json:2066` `sigil_damage` and `sigils.json` `grammar.repeats.subjects` (the text).

### 2(c) The cash-out: the Evoke

The Evoke spends the whole Line, as today. `C = Bite x S(glyphs)` (no `1 +`: a Line of 2 is the plain Sigil hit).

**Costs, one by one, at level 1, 10 and 20** (a FIRE-class Subject, SEEK and a Burst word; the specialist of 2(j)):

| Cost | Level 1 (Brain Power 7, Lines of 3) | Level 10 (Brain Power 9, Lines of 4) | Level 20 (Brain Power 10, Lines of 5) | Kept or changed |
| --- | --- | --- | --- | --- |
| AP: glyphs + walk + Evoke | 3 x 0.8 + 2 tiles (1.3) + 1, about 4.7 | 4 x 0.6 + 3 tiles (1.5) + 1, about 4.9 | 5 x 0.5 + 4 tiles (2) + 1, about 5.5 | kept: a long Line is a turn, the choice of the turn |
| charge | about 7 of a 10-core (saving 2) | about 8 (saving 3) | about 9 with Barrage (saving 3) | kept: one big Line is about a core, two small ones too |
| Flux | 3 of 9 (Rumination 3) | 4 of 14 (Rumination 8) | 5 of 16 (Rumination 10; 18 with the middle Mark) | **limit 6 + 1 a Rumination point** (2(g)): Vent becomes a choice, not a tax |
| cores | 1 loaded, spares bought | the burnt ones back after a fight (`survival.json:128` `supply`) | the same | kept |

Charge, AP and Flux are counts and the clock (01 T7b), so the price of a Line stays a core and a turn at every level while its blow grows with `deal`: the choice (one long Line or two short) is the same at 1, 10 and 20.

**The cash-out table** (one FIRE-class Subject, single target, in rifle shots of the same cards: FIRE's base and the service rifle's are equal (18, 01 T2b, T3) and the sigil profile's `k` against the gun's (01 T5) makes a FIRE glyph 1.23 rifle rounds; AP at Expression 1 and Agility 1, so the set-up shows in full; the Evoker and the rifle of one grade):

| Who | Glyphs | Line multiplier | One Evoke is worth | The same AP of plain shots | How often |
| --- | --- | --- | --- | --- | --- |
| Brain Power 1 | 2 | x1.87 | 2.3 shots | 2 (4 AP): +15% | every turn |
| Brain Power 4, a mixed character | 3 | x3.09 | 3.8 shots | 3 (6 AP): +26% | every turn |
| Brain Power 7, Rumination 4 | 4 | x4.83 | 5.9 shots | 4 (8 AP): +48% | about every 1.3 turns |
| Brain Power 10, Rumination 7, Eloquence 4: a specialist | 5 | x7.07 | 8.7 shots | 5 (10 AP): +73% | about every 1.7 turns (one a turn at Expression 6, Agility 3) |
| Overclock at 10 | 6 | x9.43 | 11.6 shots | 6 (12 AP): +93% | once a turn at most; see 2(d) |

Area words multiply each creature caught (SPREAD x0.6 each, CHAIN x0.75 a jump): the long Line is also the area Line.

**On the scale** (01's units): at level 1 the specialist's FIRE glyph (18) on Intelligence 7 and Brain Power 7 is about 42; a Line of 2 is about 84 and its Line of 3 about 140. At level 20, Celestial, Intelligence and Brain Power 10, one STONE glyph is about 4,570: **a Line of 2 is about 9,540 (four digits), a full Line of 5 about 32,300; the largest legal one** (Overclock, 9 Margins on the glyph's plain hit, 01 T11) **about 57,500 before Σ**, so a Line may carry **+74% in Σ** (01 T11 gave +61% at the first draft's Bite). Overflux (+25%), Written in Advance (+20%) and Second Clause (+12%) are among the sources 07 trims to that budget (01 10.3 item 5).

### 2(d) The Push at Brain Power 8: Overclock (moved from 2, ruling C17)

Once a turn, your next Line may hold **one glyph past your Reach** (6 at Brain Power 10): a one-use condition with `stat_mod max_sigil_words` +1 (the stat exists: `character.ts:881`) that ends when the Line is Evoked. That glyph costs +2 charge (kept, now in data: a `cost_mod` on the condition, not the code's `OC_CHARGE`). **Price (new):** when the Overclocked Line is Evoked, your Evoker overloads as if your Flux had gone one over (the one overload path, `rules.json:1435`: 7% of your max HP a Flux over, 01 T7b; the lock until the next round; all your Flux to the air). Reason: the longest Line you can write burns the hand that wrote it, and the air it fills makes every Outburst in the room stronger, both sides'. The Sigilist's Backdraft turns that price into a blow (2(i)). The handler and its key `skill:brain_power.2` go (critic-consistency section 5 item 1).

### 2(e) Marks on the door, word study, word Marks and the found-spell book

**A unit** is a glyph past the first in a Line Evoked on a worthy foe. A specialist Evokes about 3 times a fight, 3 to 4 glyphs: about 34 units an hour at 05's rate; 05's formula then reads **68 / 374 / 578 / 782**.

| Mark | About (05) | Gives (PROVISIONAL) |
| --- | --- | --- |
| I | hour 2 | your first glyph of each fight costs no AP |
| II | hour 11 | every core your Evoker loads holds 2 more charge (stat `core_charge`, `character.ts:1223 coreChargeOf`) |
| middle | hour 17 | the Flux limit +2 (stat `flux_max`) |
| III | hour 23 | Overclock without its overload once a fight |

Reason Mark II is charge and not Bite: a Bite step on Marks would carry the short Line past four digits at level 20 (2(b)); a core that lasts a Line longer is felt every fight.

**Word study** (rates are 05's, `05-pacing.md` section 4 "Sigil words"): `first` 10, `step` 60, `copy` 10, `mastery_study` 30: **a word every 1.6 hours, 33 of 40 by hour 48**; words held `4 + 3 x Brain Power` (34 at 10) never stops a specialist short of it. That is the 80% of ruling D23 for the Sigil door.

**The book of found spells** (new, everyone with the door): the first time a Line whose words (as a set, counting copies) you have never Evoked lands on a worthy foe, it is **written in your book** with its words and the fight it was found in, and pays **10 study** (05's "Found spells" row: most fights early, then about one an hour). Forty words in Lines of 2 to 5 make tens of thousands of sentences: the collection never closes, and a player who varies its Lines learns faster than one who repeats a Line. The door tab shows the book and how many sentences it holds. Built on **S9, firsts** (the felt list generalised to a keyed set, `sigil:<sorted words>`), shared with the Outburst designs (04).

**Word Marks** (Law 3; the counts are 05's: Practised 10 and Mastered 30 uses, unchanged, about 5 uses an hour for a word in half the Evokes; 05 section 4 "Word mastery"):

| Word Mark | Uses | Gives (PROVISIONAL) |
| --- | --- | --- |
| I (Practised; today a label) | 10 (05) | its glyph costs 1 charge less, never under 1 (the `word_cost` op) |
| II (Mastered) | 30 (05) | its inflection, always on (today's) |
| III | **05 to set** (05 lists two steps) | it may sit twice in one Line with no x0.9 for the repeat |

### 2(f) Tags for mixed characters

| Move (door) | Keeps | Why |
| --- | --- | --- |
| a glyph drawn, a step along your own Line (Sigils) | the Momentum chain (`wear:momentum`, S6): a Line step is not walking away | a Breaker-Sigilist walks while writing |
| an Evoke with no damaging Subject (Sigils) | Shadow (1(f)) | |
| Vent (Sigils) | Strain falls by 1 (Outbursts; a `resource` op on the Vent's row) | the vented Flux calms the heart: the base layer of the Sigils-Outbursts Crossing |
| Crystallise (Outbursts), Salvage (the Rigger), a Survival core made at the Forge | cores for the Line (exists) | fuel crosses doors already |
| holding Guard, praying a Whisper, ordering a Figment | your glyphs lose no round of their time that turn | the Line waits for the friend who covers its writer |

### 2(g) Rumination (beta) and Eloquence (gamma), points 1 to 10

**Rumination: how Sigils sustain you.** Today: the feed `6 x (1 + 0.01 x Brain Power x Rumination)` on the Flux limit, +1 on Brain saves a point (`skills.json:3097`); perks at 3, 5, 7, 9 (Footnote, Lab Coat, Index, Proven Formula: `perks.json:4809-5108`), Mastered Established Fact; 5 study at each Mastery level, a free word at 10 (`sigils.json:226-229`). **Dead today:** the limit is a whole number and the feed reaches +1 only at Brain Power x Rumination 17.

| Rumination | Exists (kept) | Each point (PROVISIONAL) |
| --- | --- | --- |
| every point | +1 on Brain saves | **+1 Flux limit** (C20: the beta's flat term, in place of the feed; stat `flux_max`): one more glyph before a Vent |
| 3, 5, 7, 9 | perk steps; +5 study each | |
| 4, 7 | | **opens Lines of 4 and (with Eloquence 4) Lines of 5** (B13) |
| 10 | Mastered: Established Fact; a free word | |

**Eloquence: Sigils outside the fight, its Call and its voice.** Today: persuasion in a fight harder to resist; +1 tile Brief reach a point (`skills.json:3269`); Brief (`calls.json:130`: steps 1, 4, 8; the shared price table); perks at 3, 5, 7, 9 (Overruled!, Objection!, Opening Argument, Thinking Aloud: `perks.json:5170-5464`), Mastered Closing Argument; 5 study at each Mastery level, a free word at 10; its full points on checks, Asks and passives. Kept, with one gate and one change:

| Eloquence | New (PROVISIONAL) |
| --- | --- |
| 4 | opens Lines of 5 with Rumination 7 (B13) |
| 6 | **a Brief you give vents 1 of your Flux**: you talk the pressure out. A `resource` op on the Call's own row (`when: acted`), 02's pattern |

### 2(h) Intelligence's card (01 4.2)

| Line | Today | 0.34 |
| --- | --- | --- |
| +10% Sigil power | false (`rules.json:1850` attr 0) | **true** (01 T5: the sigil and sigil_mend profiles, attribute 0.10 and Brain Power 0.05, multiplied) |
| a longer Line at every even point | true at 3 and 5 (`character.ts:881`) | **moves to Brain Power** (C19; 2(b)) |

The first draft's "+5% on every practice track" for Intelligence is withdrawn: it is not on 01's card, and a point under a tenth is not felt (critic-player 8).

**The elemental line on a Line.** Expression's card says +10% elemental damage and Visualization's +5% (01 4.2). A Line is cashed by the Sigils door, so it reads Intelligence and Brain Power only (01 4.3, and 01 T11 computes it so); the elemental card is not a second pair on it. Question 1 asks the lead where that line then pays.

### 2(i) The class: the Sigilist

**What only the Sigilist has:** **the Stored Spell**, a whole Line written before the fight and set off for 1 AP: the only way in the game to skip a Line's set-up.

| Rank (level) | Moves | Worth pressing once set up? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| I (3) | **Stored Spell** (moved from III) | yes: a 3- or 4-glyph Line for 1 AP | as many as your Rumination modifier (at least 1); it keeps the Line multiplier of its length, never past your Reach |
| I (3) | Barrage | yes (a cheaper Line every turn) | kept |
| II (5) | Bleed the Flux | yes (Vent 0 AP) | kept |
| II (5) | Core Change (moved from I) | yes (a swap 1 AP) | kept |
| III (15) | Payload | yes on two or more foes | kept |
| III (15) | Backdraft (moved from II) | **no** today: an overload is an accident | with Overclock's price (2(d)) it is the Sigilist's planned blow: when your Evoker overloads, every foe next to you takes **the Flux released** on its own amounts block (`backdraft`, a part per Flux: today's overload damage x0.6 on the sigil profile and `deal`, 01 T7b rule 6 for HP dealt to others) |

Ranks at levels 3, 5 and 15 (B12), Intelligence 5 and 8. The Sigilist's dial (`classes.json:1941`, value 1) is removed: it carries nothing.

### 2(j) How a player spends

**The specialist** (Intelligence 7, Expression 3, Agility 2, Endurance 2 at creation; Brain Power 7, Rumination 3).

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | the build above | Lines of 3 at x3.28 (Lines of 4 wait for Rumination 4), 25 words to hold, fork A, three perk steps, Twin Draw; Flux limit 9; the Line fits a turn (about 4.7 AP) |
| 2 | Rumination 4; Expression 4 | **Lines of 4** (x4.83); glyphs 0.7 AP: the Line of 4 is about 5.8 AP and fits a turn |
| 3 | Eloquence 1, 2 | **the Sigilist**: a Stored Spell, Barrage; Brief |
| 4 | Rumination 5, 6 | a perk, +5 study; Flux 12 |
| 5 | Intelligence 8; Brain Power 8 | **Overclock**, fork B; **rank II** |
| 6 | Rumination 7; Agility 3 | a perk; walking the Line a third cheaper |
| 7 | Eloquence 3, 4 | a perk, +5 study; Brief's second step |
| 8 | Rumination 8; Expression 5 | Flux 14; glyphs 0.6 AP |
| 9 | Eloquence 5, 6 | a perk, Brief at 2 AP; a Brief vents Flux |
| 10 | Intelligence 9; Brain Power 9 | Bite 0.95, core saving 3 |
| 11 | Rumination 9; Eloquence 7 | two perks |
| 12 | Eloquence 8; Expression 6 | Brief's third step; glyphs 0.5 AP |
| 13 | Eloquence 9; Pain Threshold 1 | a perk, Brief at 1 AP; +6% max HP |
| 14 | Pain Threshold 2; Athletics 1 | +6% max HP; +1 Defense |
| 15 | Intelligence 10; Brain Power 10 | **Lines of 5**, the Junction, Clean Draw; **rank III** |
| 16 | Rumination 10; Endurance 3 | Established Fact, a free word; HP |
| 17 | Eloquence 10; Pain Threshold 3 | Closing Argument, a free word; HP |
| 18 | Athletics 2; Endurance 4 | +1 Defense; HP |
| 19 | Athletics 3; Pain Threshold 4 | +1 Defense; HP |
| 20 | Pain Threshold 5; Endurance 5 | HP |

30 points in Intelligence's skills, 8 elsewhere (Pain Threshold 5, Athletics 3); Attribute points: Intelligence 10, Expression 6, Agility 3, Endurance 5. The spare points go where no second focus is needed, so the specialist never pays a hand swap; one that buys Visualization instead (the Figments door) pays 1 AP each time it changes door, or holds both foci and no gun (section 0, rule 8).

**A mixed character: Line and Outburst** (Intelligence 5, Determination 5, Endurance 2; Brain Power 4, Will Power 4, Rumination 2 at creation). Level 1: Lines of 3 at x3.09 (about 3.8 shots a Line) and an Outburst at Will Power 4's Reach (04). **Two foci:** the Evoker and the Emanator. Held both, it carries no gun and changes door for nothing; with a revolver and one focus, every turn it changes door costs 1 AP (a sixth of the turn), so "a Line every turn" becomes a Line every turn **or** an Outburst, and a turn that switches loses a glyph. Rumination from the first point adds Flux; Vent's tag calms Strain (2(f)). Brain Power 7 with Rumination 4 at about level 10 (Lines of 4). Two bars fill; it Evokes often for less, the specialist less often for more.

---

## 3. Expression: the door of Figments (Visualization; Proficiency; Charisma; the Rigger, id `trickster`)

### 3(a) Today

**The counters.** Figments held (owned units tied to you, `ties:owned`) and the Visualizer's charge (`mg.vcharge`, one core of 10). **Held:** 1 at Visualization 1, 2 at 5, 3 at 7 (`figments.json:48` `ladder`, read by `figments.ts:45 ladderAt`), +1 for Many Hands, +1 for the Rigger (`classes.json:1986` the Rigger's Hands, `stat_mod ties_max:owned` 1); at most 4 held and 6 owned bodies, the Rigger's Double and one Scrap Sentinel among them (`figments.json:25` `limits`). **Forms known:** 1 + Visualization, at most 10 (`figments.json:41` `forms_known`), of the 10 forms. Ready designs 2 / 3 / 4 / 5 at 3 / 5 / 8 / 10 (+1 the Rigger), traits 1 at 3, 2 at 7.

**Costs.** Picture 2 AP and the form's charge (1 to 4, +1 a trait); upkeep 1 charge a Figment at each of your turn starts, and 1 AP too at 3 or more held (`figments.json:30` `upkeep`, `ap_from` 3); orders: Strike 2 AP, Pounce 3, Cut 2, Stare 1, every other 1; Redraw 1 AP 1 charge; Let go 0 AP, half the charge back; a Figment destroyed gives nothing back and Snaps you (1 AP less next turn).

**The payoff.** Each Figment's blows (the `figment` profile, `rules.json:1938`: attr 0, skill 0, x the figment factor 0.9); its HP by `figment_hp` (`rules.json:1948`, Visualization only) x the enemy HP column (`figments.json:18`). **Cash in** (Visualization 2, 1 AP: unmake one, all its charge back). **There is no cash-out.**

**The ladder** (`skills.json` visualization; `figments.json:48`): 1 the door; 2 Cash in; 3 perk step, two designs; 4 fork Hard Light or Sharp Light; 5 two held, three designs; 6 perk step; 7 three held, two traits, perk step; 8 fork Many Hands or Masterwork, four designs; 9 perk step; 10 Mastered (Solid Image, `perks.json:11864`), five designs. Per point: +1 tile reach, a form known.

**The attribute's card** (`attributes.json:175`): +10% elemental damage (false: `rules.json:1858` attr 0) and glyphs 0.1 AP cheaper (true, `character.ts:882`). **Nothing reaches Figments**, the attribute's own door.

**The class** (`classes.json` base `trickster`): gain the Rigger's Hands (+1 held, +1 design, `:1986`); rank I Double (`false_image`, `:2028`: 2 AP, no charge, one at a time, no upkeep) and Quick Sketch; rank II Salvage and Redline (id `overclock`, `:2164`: a Figment or machine acts now and takes 5 true); rank III Sleight (once a scene, `:2211`) and Scrap Sentinel (`scrap_turret`, once a scene, `:2246`). Its dial is 1, a no-op (`classes.json:2282`).

**Measured.** The Rigger clears 22 of 40 solo and 32 to 34 in four (`docs/design/handoffs/0.32-LANE-MIND.md:35`).

### 3(b) Visualization's ladder, points 1 to 10

**Reach is the Figments you hold at once. Bite is what one Figment is worth when the board is spent** (Curtain, 3(c)).

| Visualization | What exists there (kept) | Reach (held) | Bite (per Figment) | New |
| --- | --- | --- | --- | --- |
| 1 | the door: Picture, Redraw, Let go, Glimmer; 2 forms | **1** | **0.6** | **Curtain** (C18: a cash-out from point 1) |
| 2 | Cash in; a form known (each point from here) | | | |
| 3 | perk step; 2 designs, 1 trait | | | |
| 4 | fork: Hard Light or Sharp Light | **2** (was at 5) | | |
| 5 | 3 designs | ("two held" moves to 4) | | |
| 6 | perk step | | **0.75** | |
| 7 | perk step; 2 traits a design | **3, with Proficiency 4** (B13) | | |
| 8 | fork: Many Hands or Masterwork; 4 designs | | | **the Push: Overhold** |
| 9 | perk step; 10 forms known | | **0.9** | |
| 10 | Mastered (Solid Image); 5 designs | **4** (new), **with Proficiency 7 and Charisma 4** (B13) | | |

`limits.held_most` becomes 6 (Reach 4, Many Hands, Overhold) and `limits.bodies` 8 (and the Rigger's Double and Sentinel). The Rigger's +1 held is retired into Visualization (C16; 3(i) names what the Rigger gets).

**The cards** (01 4.2, T5): **Expression +10% a point above 1 on every Figment's blows and HP, Visualization +5%**, multiplied; the figment factor 0.9 folds into the profile's `k` (01 T5). A Figment's HP reads `figment_hp` on the enemy `damage_mult` column (01 T4, Built from: `figments.json level.hp`). **Figments take the Visualizer's grade** (01 T9).

### 3(c) The cash-out: Curtain

**Curtain** (Visualization 1, the `figment_order` site, 1 AP, Visualizer in hand): every Figment you hold within your projection range that can reach one foe converges on it at once, then comes apart. `C = Bite x S(Figments in it)` plain hits of a Figment (the `figment` profile at your level), one roll, Margins on a Figment's plain hit. **No charge comes back** (new; critic-player 14): Cash in (one Figment, all its charge back, no blow) and Let go (half back) stay beside it, so spending the board is a choice between a blow and the charge. Reason: a cash-out that also refunds is a cash-out with no price.

**Costs, one by one, at level 1, 10 and 20.**

| Cost | Level 1 (Visualization 7, 2 held) | Level 10 (Visualization 9, 3 held) | Level 20 (Visualization 10, 4 held) | Kept or changed |
| --- | --- | --- | --- | --- |
| Picture | 2 AP + 1 to 4 charge + 1 a trait | the same; Quick Sketch 1 AP once a turn | the same | kept |
| upkeep | 1 a turn | 2 a turn | 2 a turn and 1 AP | **1 charge a turn for every two Figments held (rounded up); the AP from 4 held** (was 1 a Figment, AP from 3): a full board is a choice to keep, not a drain that forbids the Reach |
| the Visualizer's core | 10 + 3 | 10 + 8 | 10 + 10 (+2 with Mark II) | **+1 charge a Proficiency point** (3(g)) |
| orders | 1 to 3 AP | the same | the same | kept |

Charge and AP are counts and the clock (01 T7b); the board's worth grows with the columns (blows on `deal`, HP on `damage_mult`), so a board of four is the same choice at every level: a turn and a core to build, a charge or two a turn to hold.

**The cash-out table** (plain hits of a Figment in one 1-AP Curtain; the board was built at 2 AP and 1 to 4 charge a Figment and fought while held):

| Who | Figments in it | One Curtain is worth | What it spends | How often |
| --- | --- | --- | --- | --- |
| Visualization 1 | 1 | 0.6 hits | one Figment (Cash in it instead) | rarely |
| Visualization 4, a mixed character | 2 | 1.3 hits | two cheap forms (Snare 1, Eye 2) | every 2 to 3 turns, the forms Pictured again |
| Visualization 7, Proficiency 4 | 3 | 2.7 hits | a board of three | once or twice a fight |
| Visualization 10, Proficiency 7, Charisma 4: a specialist | 4 | 4.8 hits | a board of four | once a fight, at its end or before the board falls |
| Overhold at 10 | 5 | 6.7 hits | five | once a fight in practice |

A Figment the foe was about to destroy gives nothing back and Snaps you; spending it in a Curtain gives a blow: so the Curtain is also the answer to a board about to fall. **Reason for Bite 0.6 at 1:** the second and later Figments of a Curtain are each worth about a plain hit or more, so a board that has fought pays once more when it goes.

**On the scale** (01 T11): at level 20, Celestial, Expression and Visualization 10, a beast's claws is 3,108; **a full Curtain of 4 is about 15,000, the largest legal one about 30,600 before Σ (room for +227%)**. The Rigger's whole board (Reach 4, Many Hands, Overhold, its Double and Sentinel: 8) is about 56,000 at most, still room for +79%.

### 3(d) The Push at Visualization 8: Overhold

Once a turn, Picture **one Figment past your Reach** (a condition on `ties_max:owned` +1 that lasts while that Figment stands; the stat exists). **Price:** while you hold more than your Reach, the extra one drinks 2 charge at each of your turn starts (beside the upkeep), and when it is destroyed it Snaps you for 2 AP, not 1. Reason: a crowded stage is held by the hand that pays for it every turn.

### 3(e) Marks on the door, and the Figment form marks

**A unit** is a Figment blow landed on a worthy foe, or 2 for each Figment spent in a Curtain. A specialist lands about 8 to 10 a fight: about 30 an hour at 05's rate; 05's formula then reads **60 / 330 / 510 / 690**.

| Mark | About (05) | Gives (PROVISIONAL) |
| --- | --- | --- |
| I | hour 2 | each fight starts with a Figment of your first ready design beside you (its charge paid as usual) |
| II | hour 11 | every core your Visualizer loads holds 2 more charge (stat `core_charge`) |
| middle | hour 17 | your oldest Figment needs no upkeep |
| III | hour 23 | Overhold without its price once a fight |

**Figment form marks** (Law 3; forms known stay by points, `figments.json:41`): a form earns a mark each time it is held through a worthy fight to its end. **The counts are 05's, `form_marks` [3, 7, 13] fights** (`05-pacing.md` section 4 "Figment forms", ruling D22: Mark I in about an hour, III in about 4 for a form you keep up).

| Form mark | Fights held (05) | Gives (PROVISIONAL) |
| --- | --- | --- |
| I | 3 | +15% HP for that form (into its HP sum) |
| II | 7 | a second order to it each turn costs 1 AP less |
| III | 13 | one more trait slot on that form's designs |

The forms known reach 10 of 10 at Visualization 9: the Figment door's 80% (D23) is met by the forms, and the form marks fill in hours (see Critics' findings, consistency minor 3).

### 3(f) Tags for mixed characters

| Move (door) | Keeps | Why |
| --- | --- | --- |
| Picture, Glimmer, every order (Figments) | Shadow (1(f)); the blow of a Figment is the Figment's | the illusionist stays unseen |
| a Ward's Interpose and its soak (Figments) | your plates and the Momentum chain (`wear:`, S6): the hit it takes is not yours | |
| a Figment standing on your Line's tile (Figments) | your glyph: it is not scuffed while the Figment stands there | the base of the Figments-Sigils Crossing |
| Expression's glyph AP (attribute) | Sigils | a Mind mixed character draws faster (exists) |
| Proficiency's core charge (beta) | Sigils' cores too | one meaning of "charge a core holds" (3(g)) |

### 3(g) Proficiency (beta) and Charisma (gamma), points 1 to 10

**Proficiency: how Figments sustain you.** Today: the feed `1% x Visualization x Proficiency` on Figment HP, -10% ambush damage taken a point (capped 60% at `effects/damage.ts:81`: points 7 to 10 give that line nothing), Field Repair from 3 (`skills.json:3669`); perks at 3, 5, 7, 9 (Jury-Rig, Field Repair, Hot-Swap, Tuned: `perks.json:3789-4145`), Mastered Overhaul.

| Proficiency | Exists (kept) | Each point (PROVISIONAL) |
| --- | --- | --- |
| every point | the feed on Figment HP; Field Repair from 3; `repair`'s +5% (01 4.2) | **+6% Figment HP** (C20: the flat term beside the feed); **+1 charge in every mana core you load** (Visualizer and Evoker: stat `core_charge`); **-6% ambush damage taken** (to the 60% cap at 10, a cap 01 keeps) |
| 3, 5, 7, 9 | perk steps | |
| 4, 7 | | **opens three held and (with Charisma 4) four held** (B13) |
| 10 | Mastered: Overhaul | |

Reason: each point is a charge you can count and a share of HP you can see on the token.

**Charisma: Figments outside the fight, its Call and its voice.** Today: offers of terms harder to refuse; +1 tile Rally reach a point (`skills.json:3837`); Rally (+3 AP to an ally; -1 and -2 Pressure at 4 and 8: `calls.json:90`); perks at 3, 5, 7, 9 (Parley, Crowd Pleaser, Smooth, Showman: Picture 1 charge less, `perks.json:6514-6745`), Mastered Everyone's Friend; its full points on checks, Asks and passives. Kept, with one gate and one change:

| Charisma | New (PROVISIONAL) |
| --- | --- |
| 4 | opens four held with Proficiency 7 (B13) |
| 6 | **a Rally you make puts 1 charge back in your Visualizer**: the crowd's cheer feeds the show. A `resource` op on the Call's own row (`when: acted`), 02's pattern |

### 3(h) Expression's card (01 4.2)

| Line | Today | 0.34 (01 4.2) |
| --- | --- | --- |
| +10% elemental damage | false (`rules.json:1858`) | on the card (01 4.2, T5 `elemental`, Visualization +5%); where it pays under one pair to a hit is Question 1 |
| glyphs 0.1 AP cheaper | true | kept |
| (new) | nothing on Figments | **+10% on every Figment's blows and HP a point above 1** (01 T5: `figment` and `figment_hp` on Expression and Visualization; the factor 0.9 folded into `k`) |

An Expression point outside Figments is never dead: cheaper glyphs for every Sigil writer.

### 3(i) The class: the Rigger

**What only the Rigger has:** **free Doubles**, **charge from wrecks** (Salvage), **Redline** (a Figment or machine acts now), **machines from scrap** (the Scrap Sentinel), and, in place of its retired +1 held (C16), **a bigger Curtain**: the Curtain counts every unit tied to you (`ties:owned`), so the Rigger's Double and Sentinel join its board, which no one else can field. It keeps its +1 design.

| Rank (level) | Moves | Worth pressing once set up? | Becomes (PROVISIONAL) |
| --- | --- | --- | --- |
| gain (3) | the Rigger's Hands | yes | `ties_max:owned` +1 removed; +1 design kept; the Curtain counts the Double and the Sentinel |
| I (3) | Double | yes (a lure for 2 AP that costs nothing more) | kept |
| I (3) | Quick Sketch | yes | kept |
| II (5) | Salvage | yes beside a wreck | kept |
| II (5) | Redline | yes (2 to 3 AP of a Figment for 1) | its hurt to its own Figment is 3.0 on the flat profile, `deal` (01 T7b) |
| III (15) | Sleight (once a scene) | **no** for a level-15 move: one swap a fight | **once a turn** |
| III (15) | Scrap Sentinel (once a scene) | yes (about two shots a round for 3 AP once) | **once a fight** (a scene can be several fights) |

Ranks at levels 3, 5 and 15 (B12), Expression 5 and 8. The Rigger's dial (`classes.json:2282`, value 1) is removed.

### 3(j) How a player spends

**The specialist** (Expression 7, Intelligence 2, Agility 2, Endurance 2, Perception 2 at creation; Visualization 7, Proficiency 3).

| Level | Buys | What the player gets |
| --- | --- | --- |
| 1 | the build above | two held (three wait for Proficiency 4), 8 forms, 3 designs with 2 traits, fork A, three perk steps, Curtain; +3 charge a core |
| 2 | Proficiency 4; Endurance 3 | **three held**; +1 charge, +6% Figment HP; HP |
| 3 | Charisma 1, 2 | **the Rigger**: free Doubles in the Curtain; Rally |
| 4 | Proficiency 5, 6 | a perk; +2 charge |
| 5 | Expression 8; Visualization 8 | **Overhold**, fork B, 4 designs; **rank II** |
| 6 | Proficiency 7; Agility 3 | a perk; movement |
| 7 | Charisma 3, 4 | a perk; Rally's second step |
| 8 | Proficiency 8; Intelligence 3 | +1 charge, +6% Figment HP |
| 9 | Charisma 5, 6 | a perk, Rally at 2 AP; a Rally refills a charge |
| 10 | Expression 9; Visualization 9 | Bite 0.9, all 10 forms |
| 11 | Proficiency 9; Charisma 7 | two perks |
| 12 | Charisma 8; Endurance 4 | Rally's third step; HP |
| 13 | Charisma 9; Pain Threshold 1 | a perk, Rally at 1 AP; +6% max HP |
| 14 | Pain Threshold 2, 3 | +12% max HP |
| 15 | Expression 10; Visualization 10 | **four held**, Solid Image, 5 designs; **rank III** |
| 16 | Proficiency 10; Endurance 5 | Overhaul; HP |
| 17 | Charisma 10; Pain Threshold 4 | Everyone's Friend; HP |
| 18 | Pain Threshold 5; Agility 4 | HP; movement |
| 19 | Athletics 1, 2 | +2 Defense |
| 20 | Athletics 3; Endurance 6 | +1 Defense; HP |

30 points in Expression's skills, 8 elsewhere (Pain Threshold 5, Athletics 3); Attribute points: Expression 10, Endurance 6, Agility 4, Intelligence 3, Perception 2. No second focus, so no hand swap.

**A mixed character: the illusionist writer** (Expression 6, Intelligence 5, Endurance 2; Visualization 5, Brain Power 4, Proficiency 1 at creation). Level 1: two held, Lines of 3, glyphs 0.5 AP: a Snare and an Eye on the Line's ends, a 3-glyph Line every turn. **Two foci:** the Evoker and the Visualizer. Held both, it carries no gun and its turn is a Line plus an order; with a gun and one focus, each change of door is 1 AP, which costs it a glyph and an order every turn it uses both, so it is built to hold both foci (the camp's second focus, ruling E). Proficiency from the first point fuels both doors' cores. Curtain on two every 2 to 3 turns; two bars fill. Visualization 7 with Proficiency 4 by about level 10 (three held), Brain Power 7 with Rumination 4 by about 16.

---

## 4. Questions for the lead (each with the recommended answer)

1. **Where does Expression's "+10% elemental damage" pay under one pair to a hit (01 4.3)?** A Line is cashed by the Sigils door and reads Intelligence and Brain Power (01's T11 computes it so); an Outburst's tone is the Soul door's; a Figment's blow already reads Expression. So the line, as 01 4.2 keeps it, has no hit to land on without a second pair, and in Σ (A8) it would eat most of a Line's +74% room (Expression 6 alone is +50%). Recommended: **01 drops the elemental line from Expression's and Visualization's cards**; Expression's bridge to Sigils is its cheaper glyphs. (Every other cross-file question in this file is settled by the rulings.)

## Critics' findings

| Finding | Status | How, or why not |
| --- | --- | --- |
| consistency S1 (03 on the charter's x0.45: "about 1,400 a hit") | FIXED | every absolute number is read from 01 (T2b, T3, T5, T11) on x0.6; the old line is gone |
| consistency S4 (sigil, elemental, figment slopes) | FIXED | 01 4.2 quoted: Intelligence +10%, Brain Power +5%; Expression and Visualization +10% / +5% on Figments, multiplied; the figment factor folded |
| consistency S9 (03's +0.02 a Margin, -6% and Analysis' Margins taken) | FIXED | both go; Perception's Margin point is 01's (A7); critical damage taken is 07's restatement |
| consistency S14 (six digits at the top) | FIXED for 03's doors | Shadow Bite 0.55 at 9 (+109% room, its own ambush and about the Coup's budget beside it), Sigils Bite 0.95 at 9 and one Subject's damage to a Line (+74%, the short Line four digits), Figments unchanged (+227%) |
| consistency M4 (Rig's 25 flat) | FIXED | 15 on `deal` (01 T2b) |
| consistency M8 (two shapes of Push) | FIXED | every Mind Push raises Reach by 1 for the use (`res_max:` / `ties_max:` / `max_sigil_words`) |
| consistency M10 (48 or 38 points) | FIXED | 38 and 20 (B11); every spend table counts them |
| consistency M11 (the gate rhythm) | FIXED | B12's swap; the alpha moves at 5, 10, 15 in every table |
| consistency minor 1 (outer formulas differ) | FIXED | each cash-out row's constant stated on one `S(n)` (section 0, rule 1) |
| consistency minor 2 (door Marks' thresholds) | FIXED | 05's formula, read at each door's units an hour |
| consistency minor 3 (form marks [6, 20, 50] or 05's [3, 7, 13]) | NOT FIXED | ruling D22 gives every rate to 05; 03 quotes [3, 7, 13]. The critic's case (Mark III in about 4 hours fills the bar in an afternoon) is 05's to weigh |
| consistency minor 7 and section 5 item 1 (Overclock's id typed in code) | FIXED | Overclock becomes data (a one-use condition, `max_sigil_words` +1, a `cost_mod`); the handler and its key go; the rung is the ladder's |
| consistency section 4 (primitives' names) | FIXED | "Needs a new primitive" uses the merged names S2 to S6, S9 and `res_start:` |
| consistency M-3 (moved rungs and retired class features) | FIXED for 03's part | Overclock 2 to 8 (C17; Brain Power 2 gains a core saving), the Operative's +1 Shadow and the Rigger's +1 held retired with a class thing in their place (C16), Core Change I to II, Backdraft II to III; held counters clamp, a saved fourth Figment stays until it falls |
| consistency M-7 (saved shapes) | FIXED | `sigilGrowth` gains the firsts set with a load default; Overclock's saved state is dropped at load |
| player 1 (03's slopes and Perception's critical against 01) | FIXED | as S4 and S9 |
| player 2 (no specialist edge) | FIXED | B13: Reach at 7 and 10 needs the beta and the gamma, written into all three ladders and spend tables |
| player 3 (the wide character) | NOT FIXED | ruling B14: no rank III and no Push in 0.34, flagged for Leon |
| player 4 (gates at 5 and 15) | FIXED | B12 |
| player 5 (two foci, one hand) | FIXED | ruling E: section 0 rule 8; both mixed walks and the specialists count the 1 AP swap or hold both foci |
| player 7 (levels not felt: Sigilist 9; Operative 9, 14; Rigger 2, 9, 12, 14) | FIXED | every row of the three spend tables names what it buys; Eloquence, Vigilant and Charisma 6 get a door effect |
| player 8 (dead points: gamma 2 and 6; Brain Power 2; Intelligence's practice line) | FIXED for 6, Brain Power 2 and Intelligence; NOT FIXED for gamma 2 | 6: a door effect on each Call; Brain Power 2: core saving 1; Intelligence: the practice line withdrawn. Gamma 2 stays a tile of reach and a full point on checks and passives (Vigilant 2 also a tile of sight): the Calls' price table is shared by all nine gammas, and moving its step is a ruling across 02, 03 and 04 |
| player 9 (Mark I against the class's start) | FIXED | Shadow's Mark I stacks with Tradecraft, stated; the Mind classes have no other start a Mark I duplicates |
| player 10 (Rig's flat) | FIXED | 15 on `deal` |
| player 12 (rewards taken from saves) | FIXED for 03's part | the Rigger's fourth Figment kept until it falls; Overclock below Brain Power 8 is lost by ruling C17 and listed for the sheet-change panel; Brain Power 2 gains a core saving in its place |
| player 14 (Curtain deals and refunds) | FIXED | the refund goes; Cash in and Let go keep the charge |
| player 17 (damage that swings) | NOT FIXED here | naming Margins and the cash-out on the damage line is the client's (01's reading) |

## Built from

| Rule or number | Existing piece and data key (file) | What must change |
| --- | --- | --- |
| Shadow Reach 2 / 3 / 4 / 5 at 1 / 4 / 7 / 10, with the family gates | `rules.json:2594` `shadow.cap_by_points`, `character.ts:1261 shadowCap` | a row of the door ladder (S2) with the beta and gamma keys (B13); `operative_cap_add` and its reader (`character.ts:1871`) go; the texts at Ingenuity 5 and 7 and Tradecraft's |
| Shadow Bite 0.45 / 0.5 / 0.55 on S(n); ambush and Marked into Σ | the Break toggle's `damage_mult` value block (`skills.json:2106`), `rules.json:2601-2603` | the block's `res:shadow` term becomes the ladder's Bite on `cash:shadow` (S3); the ambush and Mark terms move into the sum (01 10.1) |
| The Break reads Perception and Ingenuity | `statOf(profile, c, pair)` | 01's extension 1, an action's pair (no `attr:` source) |
| Last Shade | a data `grant_action` / toggle; condition `traced` (`conditions.json:1593`) | a one-use condition on `res_max:shadow` (S5) |
| Shadow Marks | the drill bar | S4 keyed `door:shadow`; Mark I on `res_start:shadow`; Mark II on `wear:shadow` (S6) |
| Analysis +1 search TN a point | the feed (`effects/feed.ts:37`, `skills.json:2492`) | the beta's flat term (C20) |
| Vigilant, Eloquence, Charisma 6 | the Calls' rows (`calls.json:254`, `:130`, `:90`), op `resource` on `acted` | three rows of data |
| Operative: Dead Drop, Mark +2, Toxin no save from Hidden, Called Shot 2 AP, Rig 15 | `classes.json:1698`, `:4612`, `:4640`, `:6324`; `shadow.json:692` | data rows; Toxin's `if` on `self_has: hidden` (exists) |
| Ranks at 3 / 5 / 15 | `classes.json:12-20` | the numbers (B12) |
| Line Reach 2 / 3 / 4 / 5 by Brain Power | `character.ts:881 maxSigilWords` (typed), `sigils.json` `grammar.max_glyphs`, `MAX_GLYPHS` (`classes/k.ts:298`, `ai-sigil.ts:194`) | the length from the door ladder (S2) into the stat `max_sigil_words`; `max_glyphs` 5; `MAX_GLYPHS` read from data |
| Words held 4 + 3 x Brain Power | `character.ts:890 wordsKnownCap` (typed), `sigils.json:193` `known_max` | one copy, a number block in data (C19) |
| Line multiplier Bite x S(n) | `sigils.json:104` `line_mult.by_glyphs`, read in `sigil.ts:436` | the ladder's Bite and `cash:` (S3); the stale texts at `sigils.json:165` and `rules.json:1446` read their rows |
| One Subject's damage to a Line | `rules.json:2066` `output.systems.sigil_damage`; `sigils.json` `grammar.repeats` | the rule and its text (data) |
| Intelligence +10%, Brain Power +5%; the Evoker's grade | `rules.json:1850` `output.profiles.sigil`; `focusRarity` (`character.ts:1086`), `with_this` | 01's T5 and T9 rows |
| Overclock at 8 and its overload | `perks/skills.ts:27-60` (handler, `OC_CHARGE`, key `:47`), `skills.json:2914`; `rules.json:1435` `overload` | the handler goes: a one-use condition with `stat_mod max_sigil_words` +1 and a `cost_mod` +2 charge; the overload through the one overload path (if no existing op can push Flux "to one over", the builder reports it, it does not add one) |
| Brain Power 2's core saving | `skills.json:2903` `charge_at` | the list 2 / 5 / 9 |
| Rumination +1 Flux limit a point | stat `flux_max`, `magic.ts fluxMaxOf` | the beta's flat term (C20) |
| Sigil Marks; word Marks | S4; `sigilgrowth.ts:110-113`, `sigils.json` `grammar.word_mastery`, `word_cost` op; stat `core_charge` | Mark I a `word_cost` -1 for a Practised word; Mark III lifts the repeat's 0.9 for that word (its count is 05's) |
| The book of found spells | `SigilGrowth` (`sigilgrowth.ts:22`), `addStudy` | S9 firsts, `sigil:<sorted words>`; 10 study (05) |
| Stored Spell to I; Core Change to II; Backdraft to III with its own block | `classes.json:4996`, `:1801`, `:1835` | the rank lists; Backdraft's `backdraft` amounts block per Flux released |
| Sigilist and Rigger dials removed | `classes.json:1941`, `:2282` | delete the rows |
| Figments Reach 1 / 2 / 3 / 4 with the family gates | `figments.json:48` `ladder` (`figments.ts:45 ladderAt`), `:25` `limits` | the rows; `held_most` 6, `bodies` 8; the Rigger's Hands' `ties_max:owned` +1 removed |
| Curtain at 1, no refund | `figments.json` verbs (the `figment_order` site), ops `deal` with `targets` (`tied: owned`) | a verb row; its amount on `cash:` of `ties:owned` (S3) |
| Overhold | stat `ties_max:owned` (exists); `upkeep`; a conditions.json row | a condition row for the extra drink and the doubled Snap |
| Upkeep per two Figments; AP from 4 | `figments.json:30` `upkeep` (`n`, `ap_from` 3) | a `per_held` number (0.5, rounded up) in the existing reader; `ap_from` 4 |
| Proficiency +1 core charge, +6% Figment HP | stat `core_charge` (`character.ts:1223 coreChargeOf`); `figment_hp` | the Visualizer's load reads the stat; the beta's flat term |
| Expression's card on Figments | `rules.json:1938` `figment`, `:1948` `figment_hp` | 01's T5 rows |
| Figment Marks and form marks | `figments.json` | S4 keyed `door:figments` and `form:<id>`; `form_marks` 05's |
| Sleight once a turn, Scrap Sentinel once a fight | `classes.json:2211`, `:2246` `uses` | the scopes |
| Tags "keeps" | the `struck` flag (`skills.json:1852`); Momentum's walk (`physical/rules.ts`) | S6 `wear:<resource>` answered by `stat_mod` with `context` |

## Needs a new primitive

All on critic-consistency's merged list (its section 4); none is new to this file.

| Name (merged list) | What the Mind doors use it for |
| --- | --- |
| **S2, the door ladder** (`ladderAt` generalised, rows gaining the beta and gamma keys of B13) | Shadow's cap, a Line's length, Figments held, and the Bites |
| **S3, `cash:` and `cash_share:`** | the Break's, the Line's and the Curtain's factor on S(n) |
| **S4, keyed Marks** (the drill bar keyed `door:`, `form:`) | the three doors' Marks and the form marks |
| **S5, `res_max:<resource>`** (`ties_max:` generalised) | Last Shade (`res_max:shadow`); Overhold uses `ties_max:owned` as it is; Overclock uses the existing stat `max_sigil_words` |
| **S6, `wear:<resource>`** | the tags; Shadow's Mark II |
| **S9, firsts** (the felt list generalised) | the book of found spells |
| **`res_start:<resource>`** (the critic's suggested family, generalising `momentum_start`) | Shadow's Mark I and Tradecraft's start in one reader |
| 01's extension 1, **an action's pair** | the Break reading Perception and Ingenuity |

Dropped from the first draft: the `attr:` source (01 4.3 replaces it), `practice_rate` (Intelligence's practice line withdrawn), a `keeps` list (merged into S6).

## What re-records

| Guard | Why it moves |
| --- | --- |
| `test/golden-damage*` (the magic, techniques, classes and perks tables) | every Line (Bite x S(n), one Subject's damage, the sigil slopes, the Evoker's grade), every Break (Bite, Reach, the pair, ambush in Σ), every Figment blow (Expression's slope, the factor folded), Rig and Redline on the new scale, Backdraft's block |
| `test/golden-costs*` and `costs-*.json` | Overclock moves (2 to 8) and gains a price; core saving at 2; upkeep per two and the AP at 4; Called Shot 2 AP; Sleight and Scrap Sentinel scopes; Dead Drop; Mark I's free first glyph |
| `test/golden-rules*` | the Shadow cap, Last Shade and Traced, Toxin without a save from Hidden, Lines of 5, Curtain without a refund, the B13 gates |
| `test/golden-itemops*` | the Break's value block, the Ingenuity, Visualization and Brain Power unlock rows, the three gamma Call rows, Tradecraft and the Rigger's Hands |
| `test/replay-hash.test.ts`, `test/golden/replays.json` | any seeded game with a Mind character or an Evoker-carrying enemy |
| `test/sigil-balance.test.ts:23-38` | it pins a spell under `SIGIL_CAP x 1.3`, a withdrawn cap: deleted with `SIGIL_CAP` (01 section 12) |
| `test/sigil-word-cap.test.ts`, the `sigil14*` and `sigil15*` suites, `figments*` | words held, the Line length rule, form numbers |
| `test/balance/magic-measure.test.ts:33-37` and the shadow and figment measures | readings: they print and the numbers move |
| `test/old-save.test.ts` and its fixtures | `sigilGrowth` gains the firsts set; Overclock's saved state dropped; the Rigger's +1 held gone (a saved fourth Figment stays until it falls) |
| `test/descriptors.test.ts`, `apps/web/src/screens/combat-actions.test.ts`, `test/actions.test.ts` | new actions: Curtain, Last Shade, Overhold, Dead Drop; Overclock's rung |
| the text-number guard (`tools/text_numbers.py`, `test/datatext.test.ts`) | the door lines, the cards, the ladders' texts, Overclock's, Tradecraft's, the stale Line-multiplier texts |
| `test/lint-item-ops.test.ts` baseline | shrinks: Overclock's handler becomes data |
| `test/survival-run.test.ts` bars | measured clears move for the Operative, the Sigilist and the Rigger (read, not fitted) |
| `tools/balance/scale.py` T11 and T12 (a reading, for the lead) | its Shadow row and `brain_bite` read the first draft's Bites (1.05 at 9; 0.95 at 6) and Sigils' half-for-every-Subject rule; re-run on this file's 0.55, 0.9 / 0.95 and one Subject's damage |
