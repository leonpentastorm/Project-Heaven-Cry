# 10. The effort ledger: what each door costs to fill, and what that cost earns

Status: a measurement for the lead (0.34 rebalance, after Leon threw out the shared-target numbers). Read only: nothing in `data/`, the engine or the bible was changed. Every number below comes from a rule in data or code (file:line), or from the bible's proposed Reach (`tools/balance/bible/*.json`, the `reach` of each alpha ladder). No `bite` and no `felt` text from the bible was read into any result.

Leon's instruction: *"BALANCE THE NUMBER WITH REWARD AND EFFORT IN MIND."* His motto: *effort is always rewarded, and actions have consequences.* His ruling: *"sigil magic took the most to play, it should give more at all stages."*

---

## 0. Method (applied the same way to every door)

**The Reach used** (the bible's proposal: units held at skill 1 / 4 / 7 / 10):

| Door | Reach 1 / 4 / 7 / 10 | Source |
| --- | --- | --- |
| Guard (Durability), plates | 2 / 3 / 4 / 6 | body.json:99, 104, 107, 110 |
| Momentum (Raw Power), chain | 3 / 4 / 5 / 7 | body.json:268, 271, 274, 277 |
| Pressure (Dexterity), pips | 2 / 3 / 4 / 5 | body.json:429, 432, 435, 438 |
| Shadow (Ingenuity), meter | 2 / 3 / 4 / 5 | mind.json:107, 113, 117, 122 |
| Sigils (Brain Power), glyphs in the Line | 2 / 3 / 4 / 5 | mind.json:350, 356, 360, 365 |
| Figments (Visualization), held | 1 / 2 / 3 / 4 | mind.json:554, 559, 563, 568 |
| Bonds (Empathy), held | 1 / 2 / 3 / 4 | soul.json:292, 310, 326, 349 |
| Outbursts (Will Power), stages | 2 / 3 / 4 / 5 | soul.json:1033, 1047, 1061, 1079 |
| Prayer (Faith), Grace | 2 / 3 / 4 / 5 | soul.json:1559, 1580, 1594, 1612 |

**Build, spend and wear rates are TODAY's** (data and engine), because that is what a player does now. Where the bible proposes a different build or a cash-out that does not exist yet, the door's section says so; for Guard, whose proposed build changes the cost the most, both are worked.

**The baseline character:** Agility 1 (1 AP a tile: rules 1.9, CLAUDE.md), Expression 1 (Glyph AP 1: character.ts:882), 6 AP a turn, every roll assumed to land and every enemy save assumed failed (the fastest ordinary play; misses and saves only add cost). Normal air (rules.json:1339-1346).

**The plain attack** each door is measured against is the door's own `plain` in the bible where that is a weapon the character swings: the ram plate (2 AP, weapons.json:5272), the Ork wreck saw (3 AP, weapons.json:8051), the long rifle (3 AP single, weapons.json:394). A Figment's plain is the Beast's claws, a 2 AP order of the owner (actions.json:603, weapons.json:3956). For Sigils, Bonds, Outbursts and Prayer the bible's plain is not a weapon swing (a STONE glyph, a lone Snap, a Release at x1.0, the Judgement Hymn), so the character's usual weapon is taken as a 2 AP attack (the service rifle's single shot, weapons.json:198), three a turn.

**Plain attacks forgone** = the plain attacks a character that only attacks would make over the same turns, minus the plain attacks the plan still makes, minus 1 (the cash-out action is counted as its own plain attack, by the lead's rule). A half-damage action (Suppress, techniques.json:1821, `damage_mult` 0.5) counts as half an attack made. AP left idle because the plan's actions do not fit the weapon's AP counts as forgone (that is real: the plain turn would have used it).

**AP-worth of resources** = the AP the plan must spend to restore what the cash-out burnt (a mana core: Swap or Load, 2 AP, actions.json:577, figments.json:320; Flux: Vent, 1 AP, actions.json:573; MP: Syphon, 1 AP for 60 MP in Normal air, rules.json:673 and :1344), divided by the plain attack's AP.

**The payoff rule (the lead's, applied mechanically):**
worth = (plain attacks forgone + AP-worth of resources) x (1 + risk premium) + 1,
premium +25% (nothing the enemy does takes the counter), +50% (it can be lost), +100% (lost, and the character is exposed or forbidden to attack while building); Sigils +150% by Leon's ruling.

**Bite** is then solved from the bible's own cash-out formula (scale.json:258-262: S(n) = (1.2^n - 1) / 0.2; S(1) 1, S(2) 2.2, S(3) 3.64, S(4) 5.368, S(5) 7.4416, S(6) 9.9299, S(7) 12.9159), in units of the door's plain, taking the door's plain as one plain attack. The formula of each door is quoted in its section.

---

## 1. Guard (Durability): plates

**Today's rules.** The Guard technique, 1 AP (techniques.json:890-933): Guard = 1, +1 for each Durability point above 1, +1 for a shield in hand (techniques.json:32-34; physical/core.ts:134-139 `guardGain`). The pool is today capped at 4 and at the Durability points (techniques.json:30; character.ts:1899); the ledger uses the bible's Reach as the cap. A plate soaks 6 x the level column x Pain Threshold's feed (techniques.json:38; physical/core.ts:121). One plate is kept back unless the hit would drop you (techniques.json:39; physical/guard.ts:69-76). Pressure laid on you takes a plate a pip (physical/guard.ts:9). Slam today: 2 AP and 2 Guard, Durability 5, pushes every foe beside you 1 tile and Off Balance; **it deals no damage** (skills.json:182-200). The bible's Slam (2 AP, spends all plates, from point 1, damage `1 + plate x bite x S(n) / plain`, body.json:44-55) does not exist yet. The bible's build is **1 plate a use, +1 with a shield** (body.json:25-31: "gain_per_point retired").

**1. Cost of filling (ram plate, a shield: +1 a gain; 3 blows a turn).**

| Skill (Reach) | Today's build | Bible's build (2 a use with the ram plate) |
| --- | --- | --- |
| 1 (2) | one Guard (1 AP) fills; Slam same turn (2 AP); 1 blow + 1 AP idle. Forgone **1** | the same: **1** |
| 4 (3) | one Guard fills (4 + 1 = 5, capped 3). Forgone **1** | two Guards (2 AP) + Slam (2) + 1 blow. Forgone **1** |
| 7 (4) | one Guard fills. Forgone **1** | two Guards + Slam + 1 blow. Forgone **1** |
| 10 (6) | one Guard fills (11, capped 6). Forgone **1** | three Guards (3) + Slam (2) + 1 AP idle. Forgone **2** |

AP that deal nothing: today 1 AP (+1 idle); bible's build at 10: 3 AP (+1 idle). Turns to fill: none; the cash-out lands on turn 1. Meanwhile the character still blows twice a turn, and holding Guard makes its melee roll with Durability (skills.json unlock 1, roll_with) and keeps Momentum from falling (physical/rules.ts:73).

**2. Other spends.** None: plates cost only AP.

**3. Risk.** Every hit that reaches you eats plates (physical/guard.ts:85-99), a pip of Pressure eats one; the Slam needs foes beside you, so the builder stands in melee. **Can be lost and exposed: +100%.** (The plates' loss to a soak is also their purpose: that soak is a payoff the rule does not price, below.)

**4. Cashes in five rounds:** 5 (every turn: 3 AP today; 5 AP on the bible's build at 10), as long as a foe stands beside you.

**5. The skill of play:** stand where the blows will come, raise plates before the enemy's turn, and Slam the moment the ring of foes is fullest, with the plates the soak did not need.

**Worth** (Slam, in ram plate blows): today (1 + 0) x 2 + 1 = **3** at every Reach. Bible's build: **3 / 3 / 3 / 5** ((2 + 0) x 2 + 1 = 5 at 10).
**Bite:** Slam = 1 + plate x bite x S(n) / plain, so bite x (plate/plain) = (worth - 1) / S(n). With a plate at 6 and the ram plate at 30 (the same level column; Pain Threshold feed 1), plate/plain = 0.2:

| Reach | S(n) | today: (W-1)/S | bite | bible's build: (W-1)/S | bite |
| --- | --- | --- | --- | --- | --- |
| 2 | 2.2 | 0.909 | 4.55 | 0.909 | 4.55 |
| 3 | 3.64 | 0.549 | 2.75 | 0.549 | 2.75 |
| 4 | 5.368 | 0.373 | 1.86 | 0.373 | 1.86 |
| 6 | 9.930 | 0.201 | 1.01 | 0.403 | 2.01 |

In the door's own currency (soak): each plate soaks 6 x level column x feed (core.ts:121); the Slam's worth above is the blow's, and the plates a hit eats before the Slam are soak already received.

---

## 2. Momentum (Raw Power): the chain

**Today's rules.** A fight starts at 1 (techniques.json:10; physical/rules.ts:56-58); a plain melee hit and a Charge build +1 (techniques.json:24, the `how` text; skills.json raw_power unlock 1); each tile walked -1 (techniques.json:14; physical/rules.ts:62-65), each damaging hit taken -1 unless Guard is up, the hit was Parried or a plate soaked part of it (techniques.json:15; physical/rules.ts:70-75); a Strike or an Opener spends 1 (the first Opener a fight free, techniques.json:11-13; core.ts:193). Cap today 3, the Breaker 5 (techniques.json:8-9). Coup: the weapon's AP, needs 2, today +25% a Momentum (techniques.json:1060-1100). The bible: Coup `1 + bite x S(n)`, spends all, min 2 (body.json:209).

**1. Cost of filling (Ork wreck saw, 3 AP, two swings a turn, adjacent from the start).**

| Skill (Reach) | Fill | Cash | Forgone |
| --- | --- | --- | --- |
| 1 (3) | two hits, end of turn 1 | Coup, turn 2 | **0** |
| 4 (4) | three hits, turn 2 swing 1 | Coup, turn 2 swing 2 | **0** |
| 7 (5) | four hits, end of turn 2 | Coup, turn 3 | **0** |
| 10 (7) | six hits, end of turn 3 | Coup, turn 4 | **0** |

AP that deal nothing: **0**. The chain is built BY plain hits, so nothing is forgone; the Coup costs the weapon's AP, a swing's.

**2. Other spends.** None.

**3. Risk.** Walking and being hit take it (above); the builder stands in melee every turn and may not walk. **Can be lost and exposed: +100%.**

**4. Cashes in five rounds** (start 1, a Coup empties it, the next swing builds): Reach 3: 2 (turns 2 and 4); 4: 2 (turns 2 and 5); 5: 1 (turn 3); 7: 1 (turn 4).

**5. The skill of play:** reach the foe without walking (a Charge, a foe that comes to you), never take an unguarded hit, and pick the Finisher for the moment (Coup on the wounded, Cleave on the crowd).

**Worth:** (0 + 0) x 2 + 1 = **1** at every Reach. **Bite:** Coup = 1 + bite x S(n), so bite = 0 / S(n) = **0** at 3, 4, 5 and 7.

---

## 3. Pressure (Dexterity): pips on a target

**Today's rules.** The first ranged hit a shooter lands on a target each turn: +1 (+1 past its cover, +2 unseen and Silent) (physical/rules.ts:43-48; physical/pressure.ts:89-94). Suppress: 3 AP, half damage, +2 on a hit, +1 on a miss (techniques.json:1821); Warning Shot: 1 AP, no damage, +1 if the target fails a Heart save (techniques.json:1926); Flush: 3 AP, no damage to the target, +2 (techniques.json:1969). **Pressure falls at the end of the holder's (the target's) turn**: 1, 2 if it is in cover and unseen or closed in on you (techniques.json:66-68; physical/rules.ts:109-121). A player's cap today is 3, an Elite's 3, a Boss's 2 (techniques.json:57-59); the bible caps a target at the best Reach laid on it less 1 for an Elite, 2 for a Boss (body.json:361). Today's Take (Dead Centre, 3 AP, +50%, needs Pressed) **spends 2 pips** (techniques.json:73, 2379-2425; physical/core.ts:1032); the bible's Take spends all, `1 + bite x S(n)` (body.json:380).

**1. Cost of filling (long rifle, 3 AP, two shots a turn, solo, hits land).** Because the target sheds a pip at the end of its own turn, a full Reach cannot be carried into the shooter's next turn; it is topped up on the cash turn.

| Skill (Reach) | Play | Cash | Forgone |
| --- | --- | --- | --- |
| 1 (2) | T1 shot (+1), Suppress (+2): capped 2, falls to 1. T2 shot (+1) = 2, Take | turn 2 | **0.5** (the Suppress's half) |
| 4 (3) | T1 shot + Suppress = 3, falls to 2. T2 shot = 3, Take | turn 2 | **0.5** |
| 7 (4) | T1 = 3, falls to 2. T2 shot + Suppress = 4 (capped), falls to 3. T3 shot = 4, Take | turn 3 | **1.0** |
| 10 (5) | T1 = 3 → 2; T2 = 5 → 4; T3 shot = 5, Take | turn 3 | **1.0** |

(The faster route spends Warning Shots, 1 AP each with no damage, and needs failed saves: at 10, T2 three Warning Shots + Take, cash on turn 2, forgone 1.5.) AP that deal nothing: 1.5 a Suppress. A squad's shots (the comrade within 3 tiles shot down, Crossfire) add pips the shooter does not pay for.

**2. Other spends.** None (rounds and Heat as for any shot).

**3. Risk.** The pips decay every foe turn (twice as fast if it hides or charges you), vanish if anyone else kills the target, and the cap falls by 1 on an Elite and 2 on a Boss; the shooter fires from range and can stand in cover. **Can be lost: +50%.**

**4. Cashes in five rounds:** Reach 2: 2; 3: 2; 4: 1; 5: 1 (the second on turn 6).

**5. The skill of play:** keep one target under fire every turn, pick the moment its pips peak before it acts, and let the squad's fire do the laying.

**Worth:** Reach 2 and 3: 0.5 x 1.5 + 1 = **1.75**; Reach 4 and 5: 1.0 x 1.5 + 1 = **2.5**.
**Bite** (Take = 1 + bite x S(n)): 2: 0.75/2.2 = **0.341**; 3: 0.75/3.64 = **0.206**; 4: 1.5/5.368 = **0.279**; 5: 1.5/7.4416 = **0.202**. As a denial (Pin Down, Flush Out, Suppressed and Broken costing the foe 1 and 2 AP a turn, techniques.json:61-62; physical/rules.ts:101-105) the same worth is the foe's AP denied, not damage.

---

## 4. Shadow (Ingenuity): the meter

**Today's rules.** Hide: 2 AP, only unseen (actions.json:192-196); Go to Ground makes it 1 AP (skills.json:2048-2050). First Shade: the first Hide of a fight holding none gives 1, once a fight, outside the turn cap (skills.json:2070). Then at most 2 gains a turn (rules.json:2604; the shared `shadow_gain` limit): ending a turn Hidden with no attack +1 (skills.json:1911), a cover-to-cover move unseen +1, a kill nobody saw +1, Stalk (2 AP, once a turn, from Hidden) +1 (shadow.json:545-600). A turn started while seen: -1 (skills.json:1994); Downed or the fight's end: all (skills.json:2031, 2037). Attacking ends Hidden (skills.json ingenuity door_line). The Break: one weapon attack from Hidden spending all; a fresh ambush adds +50% (rules.json:2601). Bible: `1 + bite x S(n)` (mind.json:54-58).

**1. Cost of filling (long rifle, 3 AP; start of fight out of sight).**

| Skill (Reach) | Play | Cash | Forgone |
| --- | --- | --- | --- |
| 1 (2) | T1 Hide (1, First Shade 1), Stalk (2) = 2, Break (3) | turn 1 | **1** |
| 4 (3) | T1 Hide, Stalk, a cover move (1) = 3. T2 Break + a shot | turn 2 | **2** |
| 7 (4) | T1 = 3. T2 Stalk (2) = 4, Break (3), 1 AP idle | turn 2 | **3** |
| 10 (5) | T1 = 3. T2 cover move (1) + Stalk (2) = 5, Break (3) | turn 2 | **3** |

AP that deal nothing: 3 (Reach 2) to 7 (Reach 5). Built by NOT attacking: no shot at all on the building turns.

**2. Other spends.** None.

**3. Risk.** A turn begun in a foe's sight costs a Shadow; Downed costs all; the Guard door's verbs cannot hold it (mind.json:28-31). While building the character is unseen (cannot be targeted) but **forbidden to attack**: **+100%.**

**4. Cashes in five rounds:** Reach 2: 3 (turns 1, 3, 5: after First Shade a refill is 2 a turn and the Hide must be paid again); 3: 2; 4: 2; 5: 2 (turns 2 and 5).

**5. The skill of play:** read the foes' sight lines, move cover to cover unseen, and Break on the foe that matters before a searcher ends its turn beside you.

**Worth:** Reach 2: 1 x 2 + 1 = **3**; 3: 2 x 2 + 1 = **5**; 4: 3 x 2 + 1 = **7**; 5: **7**.
**Bite** (Break = 1 + bite x S(n)): 2: 2/2.2 = **0.909**; 3: 4/3.64 = **1.099**; 4: 6/5.368 = **1.118**; 5: 6/7.4416 = **0.806**. If the fresh ambush's +50% stays in the sum (mind.json:57), Bite must be lower by that much for the whole blow to land at the worth.

---

## 5. Sigils (Brain Power): glyphs in a Line

**Today's rules.** A glyph is drawn on your own tile, one a tile, for the word's charge, the Glyph AP and 1 Flux (sigils.json:62-66); the Line is straight, so each glyph past the first needs a step (sigils.json grammar.shape; the AI's cost line sigil.ts:1506: L x Glyph AP + (L-1) tiles + Evoke). Glyph AP = 1 - 0.1 x (Expression - 1), at least 0.5 (character.ts:882). Evoke: 1 AP, 1 charge a glyph less the core saving, at least 1 (sigils.json:69; rules.json:1431); the saving is 1 at Brain Power 3, 5 and 9 each (skills.json brain_power per_point `charge_at` [3, 5, 9]; character.ts:885). A standard core holds 10 charge (rules.json:1413-1415); swapping one is 2 AP (actions.json:577). Flux safe limit 6, x Rumination's feed (rules.json:1432-1440; magic.ts:131); Vent 1 AP (actions.json:573); over it the Evoker overloads (10 damage a Flux over). A glyph lasts 2 rounds + the duration bonus (sigils.json:68); foes Scuff or NULL glyphs they have spotted (sigils.json enemy_ai). Today the Line is 2 to 4 (sigils.json grammar `max_glyphs` 4); Reach 5 is the bible's (the Junction). Bible: Evoke = `bite x S(n)`, no "1 +" (mind.json:243-248).

**1. Cost of filling (Agility 1, Expression 1; a 2 AP weapon, three a turn).** Example Lines: STONE + SEEK (charge 2 + 2, sigils.json:435, 1127), adding CONDENSE (1), FIRE (2), SHOCK (2).

| Skill (Reach) | Draw + walk + Evoke | Turns | Forgone | Charge a Line | Flux | Restore AP a Line (in attacks) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 (2) | 2 + 1 + 1 = 4 AP, then 1 attack | cash turn 1 | **1** | 4 + 2 = 6 | 2 | Swap 2 + Vent every 3rd Line 0.33 = 2.33 AP (**1.17**) |
| 4 (3) | 3 + 2 + 1 = 6 AP | cash turn 1 | **2** | 5 + 2 = 7 | 3 | 2 + 0.5 = 2.5 AP (**1.25**) |
| 7 (4) | 4 + 3 + 1 = 8 AP: T1 six, T2 two + 2 attacks | cash turn 2 | **3** | 7 + 2 = 9 | 4 | 2 + 1 = 3 AP (**1.5**) |
| 10 (5) | 5 + 4 + 1 = 10 AP: T1 six, T2 four + 1 attack | cash turn 2 | **4** | 9 + 2 = 11 | 5 | 2.2 + 1 = 3.2 AP (**1.6**) |

AP that deal nothing: 3 / 5 / 7 / 9. Nothing else is done meanwhile: the drawing turn is the whole turn from Reach 3 up.

**2. Other spends.** About one core a Line at every Reach (a 5-glyph Line needs 1.1 cores, so a swap in the middle of it); Flux 1 a glyph, a Vent every Line from Reach 4. Cores are an item made from materials (Survival): scarce over a run, the one door that eats an item per cash-out.

**3. Risk.** The glyphs fade in 2 rounds, foes scuff or NULL them, the area is fixed by where you stand and a foe that steps out wastes it, a Bolt-like Line rolls and a miss or a fizzle still spends the charge, AP and Flux (sigils.json `fizzle`); the caster walks the open ground drawing and does not attack. **+150% (Leon's ruling).**

**4. Cashes in five rounds:** Reach 2: 4 (the Flux Vent pushes the fourth Line past 6 AP); 3: 3; 4: 2; 5: 2.

**5. The skill of play:** know the grammar and the facing rule, plan the walk so the finished Line points at the foes when it fires, keep charge and Flux in budget, and draw where the foes will be next turn.

**Worth:** 2: (1 + 1.17) x 2.5 + 1 = **6.42**; 3: (2 + 1.25) x 2.5 + 1 = **9.13**; 4: (3 + 1.5) x 2.5 + 1 = **12.25**; 5: (4 + 1.6) x 2.5 + 1 = **15.0**.
**Bite** (Evoke = bite x S(n)): 2: 6.42/2.2 = **2.92**; 3: 9.13/3.64 = **2.51**; 4: 12.25/5.368 = **2.28**; 5: 15.0/7.4416 = **2.02** (in STONE glyphs, taken as one plain attack each). A higher Rumination raises the Flux limit and drops the Vent; a higher Agility or Expression makes the walk and the glyphs cheaper: both lower the cost, so by the rule they lower the worth.

---

## 6. Figments (Visualization): Figments held

**Today's rules.** Picture: 2 AP (actions.json:593) and the form's charge: the Beast 4 (figments.json:132-133), the Hand 2, the Snare 1. The Visualizer holds one core of 10 charge (figments.json:9-12); Load the Visualizer: 2 AP and a core (figments.json:318-320). Upkeep at your turn start: 1 charge a Figment held, and 1 AP that turn from 3 held (figments.json:30-35; the bible proposes half a charge, AP from 4: mind.json upkeep). A Figment destroyed gives nothing back and Snaps you (1 AP less next turn) (figments.json:37). An order to strike costs the owner 2 AP (actions.json:603), the same AP as its own attack. Held today 1 / 2 at 5 / 3 at 7 / 4 for the Rigger (figments.json:25; ladder). The Curtain (1 AP, every held Figment converges, spends all, `bite x S(n)`, mind.json:496-500) does not exist yet: today Cash in and Let go return charge (figments.json verbs).

**1. Cost of filling (Beasts; a 2 AP weapon).**

| Skill (Reach) | Play | Cash | Forgone | Charge (Pictures + upkeep) | Restore AP (attacks) |
| --- | --- | --- | --- | --- | --- |
| 1 (1) | Picture (2), Curtain (1), 1 attack, 1 AP idle | turn 1 | **1** | 4 | 0.8 AP (**0.4**) |
| 4 (2) | Picture x2 (4), Curtain (1), 1 AP idle | turn 1 | **2** | 8 | 1.6 AP (**0.8**) |
| 7 (3) | T1 Picture x3. T2 upkeep (3 charge, 1 AP), Curtain, 2 attacks | turn 2 | **3** | 12 + 3 = 15 | 3 AP (**1.5**) |
| 10 (4) | T1 Picture x3. T2 upkeep (3, 1 AP), Picture, Curtain, 1 attack | turn 2 | **4** | 16 + 3 = 19 | 3.8 AP (**1.9**) |

AP that deal nothing: 2 / 4 / 7 / 9. Held Figments can strike meanwhile, but only on the owner's AP, so they add no attack a turn; what they add is bodies (they take hits and block).

**2. Other spends.** Charge: from Reach 3 more than a core a cash-out; cores are items. The upkeep runs every turn the board is held.

**3. Risk.** A Figment destroyed is lost with its charge and costs an AP; short of upkeep the newest unravels; a Figment outside projection range (4 + Visualization tiles, figments.json:11) or one that cannot reach the foe misses the Curtain. The owner stands behind its bodies. **Can be lost: +50%.**

**4. Cashes in five rounds:** Reach 1: 4 (a core load every 2.5 Curtains); 2: 4; 3: 2; 4: 2.

**5. The skill of play:** choose forms for the room, place them where they reach the foe you will Curtain, keep the board alive through the enemy's turn, and keep the charge to hold it.

**Worth:** 1: (1 + 0.4) x 1.5 + 1 = **3.1**; 2: (2 + 0.8) x 1.5 + 1 = **5.2**; 3: (3 + 1.5) x 1.5 + 1 = **7.75**; 4: (4 + 1.9) x 1.5 + 1 = **9.85**.
**Bite** (Curtain = bite x S(n)): 1: 3.1/1 = **3.10**; 2: 5.2/2.2 = **2.36**; 3: 7.75/3.64 = **2.13**; 4: 9.85/5.368 = **1.83** (in Beast claws).

---

## 7. Bonds (Empathy): Bonds held

**Today's rules.** Bond: 1 AP, a unit you see within 6 tiles (9 from Empathy 6), no MP; a foe makes a Heart save against your Empathy (an Elite at +2, a Boss at +5) (tending.json:361-480; the numbers tending.json `bond`). Snap: 1 AP, **once a turn, one Bond** (tending.json:529-560): a foe takes Soul damage (no armour, no roll) and is Dazed (it saves), a friend heals. While you hold any Bond you are **Traced**: you cannot be Hidden and foes know where you are (conditions.json:1593-1600). Held: 1, 2 at 5, 3 at 8, +1 the Mender (tending.json:317, 339, 1057). The bible: Snap All, 1 AP, spends all, `bite x S(n)` shared across the Bonds (soul.json:95-120). Snap All does not exist yet.

**1. Cost of filling (a 2 AP weapon).**

| Skill (Reach) | Play | Cash | Forgone |
| --- | --- | --- | --- |
| 1 (1) | Bond (1) + Snap (1) + 2 attacks | turn 1 | **0** |
| 4 (2) | Bond x2 + Snap All + 1 attack + 1 AP idle | turn 1 | **1** |
| 7 (3) | Bond x3 + Snap All + 1 attack | turn 1 | **1** |
| 10 (4) | Bond x4 + Snap All + 1 AP idle | turn 1 | **2** |

AP that deal nothing: 1 / 2 / 3 / 4. A Bond on a foe is not idle: +3 to hit it and 20% of the damage you take goes to it (tending.json `bond`: hit 3, share 0.2).

**2. Other spends.** None (no MP for Bond or Snap; Mend and Shield cost MP, tending.json:707, 856).

**3. Risk.** A foe saves its way out; a Bonded ally going Down breaks it; a failed Bond roll wastes the AP; holding a Bond makes you Traced. **Can be lost and exposed: +100%.**

**4. Cashes in five rounds:** 5 at every Reach (at most 5 AP a turn), as long as foes fail their saves.

**5. The skill of play:** tie the right threads (the foe about to be focused, the friend about to be hit), and break them when the blow and the heal both land.

**Worth:** 1: (0) x 2 + 1 = **1**; 2: 1 x 2 + 1 = **3**; 3: **3**; 4: 2 x 2 + 1 = **5**. In the door's own currency: on foes, Soul damage worth that many plain attacks; on friends, the same worth as HP mended (the Snap reads `deal` on a foe, `mend` on a friend: soul.json:85-94).
**Bite** (lone Snap = bite; Snap All = bite x S(n)): 1: **1.00**; 2: 3/2.2 = **1.36**; 3: 3/3.64 = **0.82**; 4: 5/5.368 = **0.93** (in lone Snaps, taken as one plain attack each).

---

## 8. Outbursts (Will Power): stages pumped

**Today's rules.** Begin 2 AP, 1 Strain; Pump 1 AP, +1 stage, plain Pumps add no Strain; Release 1 AP; held into your next turn it swells +1 stage free (+1 Strain) (soul_modules.json:6-38). One Pump a turn may be AP-free: the first of a fight, or one every round from Will Power 3 (soul_modules.json:27-36). Overdraw (Will Power 2): once a turn a Pump adds 2 stages, +1 Strain after the first of a fight (skills.json:4689-4708). MP: the school's base (Damage 20, soul_modules.json:185) paid at Begin; each Pump a tenth of that for each stage it reaches (soul_modules.json:172). Max MP 100 + 75 x (Determination - 1) + 25 x (Insight - 1) (rules 1.24). Strain limit 3, +1 at Composure 1, 2, 4, 6, 8; falls 1 a turn; 8 HP a point over; 3 over is a Mana Short (soul_modules.json:62-66). Today the top stage is 4; Reach 5 is the bible's. Bible: Release = `0.8 + bite x S(n)` (soul.json:720-722, 740-745).

**1. Cost of filling (a 2 AP weapon; a bare Damage Bolt, 20 MP).**

| Skill (Reach) | Play | Cash | Forgone | MP | Restore AP (Syphon, in attacks) |
| --- | --- | --- | --- | --- | --- |
| 1 (2) | Begin (2), free Pump, Pump (1), Release (1), 1 attack | turn 1 | **1** | 20 + 2 + 4 = 26 | 0.43 AP (**0.22**) |
| 4 (3) | Begin, free Pump, Overdraw (1) = 3, Release, 1 attack | turn 1 | **1** | 20 + 12 = 32 | 0.53 AP (**0.27**) |
| 7 (4) | Begin, free Pump, Overdraw, Pump = 4, Release, 1 AP idle | turn 1 | **2** | 20 + 20 = 40 | 0.67 AP (**0.33**) |
| 10 (5) | Begin, free Pump, Overdraw, Pump, Pump = 5, Release | turn 1 | **2** | 20 + 30 = 50 (stage 5 at 50%, extrapolated) | 0.83 AP (**0.42**) |

AP that deal nothing: 3 / 3 / 4 / 5. At Will Power 1 the second Outburst of a fight has no free Pump: 5 AP, forgone 2.

**2. Other spends.** MP (at Determination 1, 100 MP: three Outbursts a fight; at 10, many); Strain +1 a Begin, +1 an Overdraw after the first, falling 1 a turn.

**3. Risk.** Nothing the enemy does takes a held stage (the bible's only wear is the player's own Strain, soul.json:704); the whole build fits in one turn, so it is never held through the enemy's turn; the cost after is Strain. **Safe: +25%.**

**4. Cashes in five rounds:** 5 at Reach 3 to 5 (one a turn; Strain climbs 1 a turn with Overdraw); 3 at Reach 2 (MP).

**5. The skill of play:** know the design and the shape for the room, count the Strain against the limit, and choose when to hold for a swell or a feeling instead of firing at once.

**Worth:** 2: (1 + 0.22) x 1.25 + 1 = **2.53**; 3: (1 + 0.27) x 1.25 + 1 = **2.59**; 4: (2 + 0.33) x 1.25 + 1 = **3.91**; 5: (2 + 0.42) x 1.25 + 1 = **4.03**.
**Bite** (Release = 0.8 + bite x S(n)): 2: 1.73/2.2 = **0.78**; 3: 1.79/3.64 = **0.49**; 4: 3.11/5.368 = **0.58**; 5: 3.23/7.4416 = **0.43**.

---

## 9. Prayer (Faith): Grace

**Today's rules.** Whisper 1 AP, once a turn, Faith 1; Hymn 3 AP from Faith 3, then a wait of 9 - 0.75 x Faith - 0.25 x Virtue rounds, rounded up, never under 3; Miracle 3 AP at Faith 7 and Devotion 10, once a session, costing 5 Devotion levels (patrons.json:70-95). Grace is the bible's in-fight counter: +1 a prayer said (one a turn), +1 the first act each turn your patron likes, -1 a turn with neither, all on a taboo, gone at the fight's end (soul.json:1324-1368). Cash-outs: a Whisper that spends it (Rebuke) from Faith 1, a Hymn from Faith 3, both `1 + bite x S(n)` (soul.json:1391-1400). Grace does not exist in the engine yet.

**1. Cost of filling (a 2 AP weapon; a patron that likes the attack).**

| Skill (Reach) | Play | Cash | Forgone |
| --- | --- | --- | --- |
| 1 (2) | T1 Whisper (1) + 2 liked attacks = 2. T2 Rebuke (1) + 2 attacks | turn 2 (Rebuke) | **1** |
| 4 (3) | T1 = 2. T2 Whisper = 3, Hymn (3), 1 attack | turn 2 (Hymn) | **2** |
| 7 (4) | T1 = 2. T2 a liked attack + Whisper = 4, Hymn | turn 2 | **2** |
| 10 (5) | T1 = 2, T2 = 4. T3 a liked attack = 5, Whisper, Hymn | turn 3 | **3** |

AP that deal nothing: 1 a turn (a building Whisper), and the 1 AP it strands with a 2 AP weapon. The character keeps attacking: the liked act is the attack.

**2. Other spends.** The Hymn's wait (Faith 4 / Virtue 4: 5 rounds; from Faith 7: 3 rounds); the Miracle's five Devotion levels (separate from Grace).

**3. Risk.** Only the believer's own idle turn or taboo takes Grace; no foe can. **Safe: +25%.**

**4. Cashes in five rounds:** Reach 2: 2 (Rebukes, turns 2 and 4); 3: 1 (the wait); 4: 2 (turns 2 and 5); 5: 1 (turn 3; the next Hymn on turn 6).

**5. The skill of play:** know what your patron likes and hates, act on it every turn, and time the Hymn to the wait.

**Worth:** 2: 1 x 1.25 + 1 = **2.25**; 3: 2 x 1.25 + 1 = **3.5**; 4: **3.5**; 5: 3 x 1.25 + 1 = **4.75**. In Judgement's damage for a damage Hymn; for a blessing Hymn, its own effect at that worth (the rule's unit, not damage).
**Bite** (Whisper and Hymn = 1 + bite x S(n)): 2: 1.25/2.2 = **0.57**; 3: 2.5/3.64 = **0.69**; 4: 2.5/5.368 = **0.47**; 5: 3.75/7.4416 = **0.50**.

---

## 10. Summary at full Reach (skill 10)

| Door | Reach | Turns to fill (cash on) | AP that deal nothing | Plain attacks forgone | Other spends | Risk | Cashes / 5 rounds | Plain turn while building (attacks) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guard (today's build) | 6 | 0 (T1) | 1 (+1 idle) | 1 | none | lost and exposed | 5 | 2 of 3 |
| Guard (bible's build) | 6 | 0 (T1) | 3 (+1 idle) | 2 | none | lost and exposed | 5 | 1 of 3 |
| Momentum | 7 | 3 (T4) | 0 | 0 | none | lost and exposed | 1 | 2 of 2 |
| Pressure | 5 | 2 (T3) | 1.5 a Suppress | 1.0 | none | can be lost | 1 | 1.5 of 2 |
| Shadow | 5 | 1 (T2) | 7 | 3 | none | lost, no attack allowed | 2 | 0 of 2 |
| Sigils | 5 | 1 (T2) | 9 | 4 | 1.1 cores, 5 Flux (Vent) = 1.6 attacks | lost and exposed (+150%) | 2 | 0 of 3 |
| Figments | 4 | 1 (T2) | 9 | 4 | 19 charge (~2 cores) = 1.9 attacks | can be lost | 2 | 0 of 3 |
| Bonds | 4 | 0 (T1) | 4 | 2 | none | lost and exposed (Traced) | 5 | (fills in the cash turn) |
| Outbursts | 5 | 0 (T1) | 5 | 2 | 50 MP = 0.42 attacks; Strain +2 | safe | 5 | (fills in the cash turn) |
| Prayer | 5 | 2 (T3) | 3 | 3 | the Hymn's wait (3 rounds) | safe | 1 | 2 of 3 |

## 11. Summary at skill 1

| Door | Reach | Turns to fill (cash on) | AP that deal nothing | Plain attacks forgone | Other spends | Risk | Cashes / 5 rounds | Plain turn while building |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guard | 2 | 0 (T1) | 1 (+1 idle) | 1 | none (today's Slam needs Durability 5) | lost and exposed | 5 | 2 of 3 |
| Momentum | 3 | 1 (T2) | 0 | 0 | none | lost and exposed | 2 | 2 of 2 |
| Pressure | 2 | 1 (T2) | 1.5 | 0.5 | none | can be lost | 2 | 1.5 of 2 |
| Shadow | 2 | 0 (T1) | 3 | 1 | none | lost, no attack allowed | 3 | 0 of 2 |
| Sigils | 2 | 0 (T1) | 3 | 1 | 0.6 core, 2 Flux = 1.17 attacks | lost and exposed (+150%) | 4 | 1 of 3 |
| Figments | 1 | 0 (T1) | 2 (+1 idle) | 1 | 4 charge = 0.4 attacks | can be lost | 4 | 1 of 3 |
| Bonds | 1 | 0 (T1) | 1 | 0 | none | lost and exposed (Traced) | 5 | 2 of 3 |
| Outbursts | 2 | 0 (T1) | 3 | 1 | 26 MP = 0.22 attacks; Strain +1 | safe | 3 (MP) | 1 of 3 |
| Prayer | 2 | 1 (T2) | 1 a turn | 1 | none | safe | 2 | 2 of 3 |

## 12. The payoff each door's cost earns (worth of a full cash-out, in the character's own plain attacks)

| Door | Skill 1 | Skill 4 | Skill 7 | Skill 10 | Its own currency |
| --- | --- | --- | --- | --- | --- |
| Guard (today / bible's build) | 3 / 3 | 3 / 3 | 3 / 3 | 3 / 5 | Slam's blow; the plates' soak is extra |
| Momentum | 1 | 1 | 1 | 1 | blows |
| Pressure | 1.75 | 1.75 | 2.5 | 2.5 | a shot; a denial Take: foe AP denied |
| Shadow | 3 | 5 | 7 | 7 | a shot |
| Sigils | 6.42 | 9.13 | 12.25 | 15.0 | spell damage |
| Figments | 3.1 | 5.2 | 7.75 | 9.85 | Beast claws |
| Bonds | 1 | 3 | 3 | 5 | Soul damage on foes / HP mended on friends |
| Outbursts | 2.53 | 2.59 | 3.91 | 4.03 | Release damage |
| Prayer | 2.25 | 3.5 | 3.5 | 4.75 | Judgement's damage / a blessing's effect |

And the Bite each would need in the bible's formula (units of the door's plain):

| Door (formula) | Skill 1 | Skill 4 | Skill 7 | Skill 10 |
| --- | --- | --- | --- | --- |
| Guard, 1 + plate x bite x S / plain (plate/plain 0.2) | 4.55 | 2.75 | 1.86 | 1.01 (bible's build 2.01) |
| Momentum, 1 + bite x S | 0 | 0 | 0 | 0 |
| Pressure, 1 + bite x S | 0.341 | 0.206 | 0.279 | 0.202 |
| Shadow, 1 + bite x S | 0.909 | 1.099 | 1.118 | 0.806 |
| Sigils, bite x S | 2.92 | 2.51 | 2.28 | 2.02 |
| Figments, bite x S | 3.10 | 2.36 | 2.13 | 1.83 |
| Bonds, bite (one) / bite x S | 1.00 | 1.36 | 0.82 | 0.93 |
| Outbursts, 0.8 + bite x S | 0.78 | 0.49 | 0.58 | 0.43 |
| Prayer, 1 + bite x S | 0.57 | 0.69 | 0.47 | 0.50 |

---

## 13. Where the rule surprises a player (for Leon, as they are)

1. **Momentum's cash-out is worth one plain swing at every Reach (Bite 0).** The chain is built by the plain hits themselves (techniques.json:24) and a Coup costs the weapon's AP (techniques.json:1060-1070), so nothing is forgone. Its real price, never walking (each tile -1, physical/rules.ts:62-65) and never taking an unguarded hit (physical/rules.ts:70-75), and four turns of waiting for x7, is not counted by the rule.
2. **Pressure earns 1.75 to 2.5, Shadow 3 to 7, with the same long rifle.** Pressure is laid by shots the shooter fires anyway (physical/rules.ts:43-48), and the squad's shots lay it for free; Shadow forbids attacking while it builds. A solo shooter also cannot hold a Reach through the foe's turn: the target sheds a pip at its own turn's end (physical/rules.ts:109-121), so the Reach must be topped up on the cash turn.
3. **Bite falls as Reach rises for almost every door** (Sigils 2.92 to 2.02, Figments 3.10 to 1.83, Guard 4.55 to 1.01). The cost of a unit grows about evenly, but S(n) grows by a fifth a unit, so no single Bite per door fits the rule at all four Reach steps. A constant Bite overpays the deep end; a Bite set at the deep end underpays skill 1.
4. **Some Reach steps earn nothing.** Shadow 4 to 5 (both 7: First Shade's free Shadow, skills.json:2070, and 2 gains a turn, rules.json:2604, make both cash on turn 2); Bonds 2 to 3 (both 3); Prayer 3 to 4 (both 3.5); Outbursts 2 to 3 (2.53 to 2.59: Overdraw gives 2 stages for 1 AP, skills.json:4689-4708); Momentum at all four.
5. **Bonds at skill 1 is worth 1: no more than not using it.** Bond (1 AP) + Snap (1 AP) take one 2 AP attack's slot (tending.json:361-480, 529-560). Outbursts reach 5 stages in one turn (the free Pump, soul_modules.json:27-36, and Overdraw) and are safe, so the deepest Release earns 4.03, under Shadow's 7 and Figments' 9.85.
6. **Today's Guard fills six plates with one 1 AP use at Durability 10** (1 + (Durability - 1) + shield, physical/core.ts:136), so its Slam earns 3 at every Reach; only the bible's 1-a-use build gives 5 at 10. The plates' main payoff, the soak (core.ts:121), is spent in the enemy's turn and is not a cash-out the rule can price: the rule counts the plates lost to soaking as risk.
7. **Prayer is paid for stranded AP.** A 1 AP Whisper beside 2 AP attacks wastes an AP every turn, which the rule counts as a forgone attack; with a 1 AP or 3 AP weapon Prayer's worth would change though the player's effort did not.
8. **Cheaper play earns less.** Agility (walk), Expression (Glyph AP 1 - 0.1 a point, character.ts:882), Rumination (the Flux limit, magic.ts:131) and Insight (MP, soul_modules.json:172) all lower a door's cost, so by the rule they lower its worth: points in the feeding skills make the cash-out smaller.
9. **Four of the nine cash-outs measured do not exist in the engine today:** a damaging Slam (today: push and Off Balance, 2 Guard, Durability 5, skills.json:182-200), a Take that spends all (today 2 pips, physical/core.ts:1032), the Curtain, Snap All and Grace (no engine code). Their ledger rows use today's build rules and the bible's cash-out shape.
10. **Sigils pays the most at every stage (6.42 at 1, 15.0 at 10), as Leon ruled, but the rule makes it so through the +150% and the cores, not through Reach:** at skill 1 a two-glyph Line (4 AP) costs one attack and fits in a turn.
