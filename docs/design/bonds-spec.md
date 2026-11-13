# Tending and Bonds: Insight's door, and the Mender (spec, 13 Nov 2026; draft 2: Bonds on enemies)

Status: **a spec for the Revision 4 patch; nothing here is built.** Frame: `class-roster-rev4-proposal.md` (draft 2) sections 1, 2, 2.1 and 4.7, and its two last blocks ("Settled by Leon, 13 Nov (after 0.25.0)": Bonds on enemies, the door's damage per Bond, the Mender's class skill, weapon-neutral base classes; "Lore and a ruling from Leon, 13 Nov": the gloves); `rev4-primitives.md` (the only primitive names used here); `rev4-weapon-neutral-audit.md` section 6; `balance-contract.md`. Every number is **PROVISIONAL** (a spec section 14 item each when built). Names marked *(Suggested)* are Leon's to change. Choices made for him are in section 11.

## 1. The fantasy and the loop

You feel the people around you, friend or foe. **Empathy** opens to anyone who wears an **Attuner** (the gear companies' fourth standard glove) **Bonds**: threads to allies that carry your care across the field, and threads to enemies that make them carry your pain, take your healing as wounds and open them to your attacks; and **Tending**, direct support paid in AP and MP. The **Mender** holds one more Bond, ties one for free each turn, gives the feelings it has felt to allies and enemies, and keeps **the Ledger**: every point of care it gives is counted and paid back as damage on its next damaging action.

**Worked example.** Sister Ha, Mender, level 5: Insight 6, Empathy 6, Camaraderie 3, Dexterity 2; a service pistol in the main hand, an Attuner in the off hand. Max MP 100 + 75 × 2 + 25 × 5 = **375**. Bonds held at most 2 (Empathy 5) + 1 = **3**. Healing given (`tend`, section 7) 2.61, level ×1.10 (heals) and ×1.2 (damage). Ledger cap 15.5 × 2.61 × 1.10 = **44**. Soldier: 182 HP, armour 6, Defense 13.

| Turn | Action | AP left | MP | Bonds | Ledger | What happens |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Free Bond on Soldier A (5 tiles) | 6 | 375 | 1 | 0 | Heart save against her Empathy strength fails: A is Bonded; Ha is Traced (rule 21) |
| 1 | Bond Kade, the tank: 1 AP | 5 | 375 | 2 | 0 | |
| 1 | Triage Kade through the Bond: 2 AP, 6 MP | 3 | 369 | 2 | 15 | 4.3 × 2.61 × 1.10 × 1.2 = **15** HP; A will take 15 × 0.25 = **4** at its turn start (rule 13) |
| 1 | Mend Kade: 2 AP, 8 MP | 1 | 361 | 2 | 28 | **13** HP; A will take **3** more |
| 1 | Inspire A with Dread (enemy face): 1 AP, 10 MP | 0 | 351 | 2 | 28 | Heart save fails: A is Suppressed 1 round (−1 AP, no reaction) |
| — | Soldier A's turn | | | | | it takes 4 + 3 (Soul, no armour); it hits Ha for 18 after her armour: **20%** (4) goes to A, Ha takes 14 |
| 2 | Free Bond on Soldier B | 6 | 351 | 2 | 28 | B saves: no Bond (the free Bond is spent) |
| 2 | Mend herself: 2 AP, 8 MP (once a turn) | 4 | 343 | 2 | 39 | 3.75 × 2.61 × 1.10 = **11** HP; A will take **3** |
| 2 | Pistol at A: 2 AP | 2 | 343 | 2 | 0 | +3 to hit (A is Bonded); hit: 20 × 1.5 × 1.2 = 36, × (1 + 0.10 × 2 Bonds) = 43, + 0.7 × 39 (the Ledger) = 70, − 6 armour = **64** |
| 2 | Pistol at A: 2 AP | 0 | 343 | 2 | 0 | hit: 43 − 6 = **37**. A is on 182 − 7 − 4 − 64 − 37 = 70, and owes 3 at its turn start |

## 2. Rules

Adjudication: every rule is `engine`. "You" is the Bonder. "Bonded" is to you unless said.

1. **The Attuner.** A focus (`items.json attuner`): off hand, one hand, the standard glove of the gear companies' line (as the Evoker, Emanator and Visualizer). **In a hand** it lets you Bond and use every Tending verb and every Mender move that spends MP, and MP for them is spent through it (MP stays the Soul's fuel). **On your person but not in a hand** (in the pack): the Bonds you hold stay; you make no new Bond, use no Tending verb, and the passive parts of your Bonds (rules 10, 12, 13, 15, the Ledger's spend) are off. **Off your person** (dropped, taken, destroyed): at the next round's start every Bond you hold ends. Stims and medical kits need no focus.
2. **Two gloves, no weapon.** A character with both Outbursts and Tending holds an Emanator and an Attuner and has no hand for a weapon: that is the intended price of mixing two Soul doors. Its damaging actions are then the unarmed attack (`weapons.json fists`) and the Outburst Release; every rule below rides both (rule 15).
3. **A Bond** ties you to one unit that has a heart: an ally character or beast companion, or **an enemy** that is not a machine or a Figment (`target_not_kind`: robot and figment; drones and turrets are robots). Making one is the action **Bond**: 1 AP, the unit in your sight and within `bond.make_range` (6; 9 from Empathy 6). Anyone with Empathy 1 and an Attuner in hand may Bond. An ally Bond needs no roll. **An enemy rolls a Heart save** against your Empathy strength (rules 1.13, `via: empathy`): an Elite with **+2**, a Boss with **+5** (`bond.save_elite`, `bond.save_boss`); a success means no Bond and the AP is spent.
4. **Bonds held:** `ties_max:bond` = 1 at Empathy 1, 2 at 5, 3 at 8; the Mender +1. **Allies and enemies share the cap.** Bonding past it asks which Bond to let go (free). Letting a Bond go is free, on your turn.
5. **The Mender's free Bond:** its first Bond action each turn costs 0 AP and has no range limit (any unit it sees), ally or enemy.
6. **How a Bond ends.** An ally Bond: the ally dies; you go Down (from Empathy 10, ally Bonds hold while you are Downed); the fight ends. An enemy Bond: the enemy goes Down or dies; you go Down (always); **the enemy has been out of your sight for a whole round** (checked at the start of your turn: not seen since the start of your last); a **Boss** Bond ends at the end of the Boss's third turn and you may not Bond that Boss again until a round has passed (the control rule); the fight ends; your Attuner leaves your person (rule 1). **No enemy verb tears a Bond:** an enemy cuts one by leaving your sight or by dropping you (section 8).
7. **Through a Bond** (ally; `tend.bond.through` **×1.2**): every Tending heal or shield you give a Bonded ally is ×1.2, and Tending reaches a Bonded ally **at any range, while you can see them**. Unbonded, Tending reaches 3 tiles in sight (Touch: adjacent).
8. **What an ally Bond tells you** (your side's view only): the ally's HP, shield and conditions on your Bond strip; and at the start of each of your turns every enemy your side sees whose intent targets a Bonded ally gets **`read`** (its next action shown to your side). Unseen enemies are never named or placed (fog, spec item 1600 a).
9. **Sight to keep:** an ally Bond needs none (Tending through it does). An enemy Bond needs you to see the enemy at least once a round (rule 6).
10. **It takes damage for you** (`bond.share` **0.20**): whenever you take damage, after your armour and before your shield, **20%** of it is taken instead by your Bonded enemies, split evenly among them, as **Soul damage that ignores their armour**. It goes through the ordinary damage path, so the Elite and Boss guard of rules 1.17 holds (never the blow that kills an Elite or Boss from full HP). **No chain:** a redirected share is never redirected again (Share a Hit's share that lands on you is not passed on), and it triggers no reaction and no `hit`.
11. **Felt at the Down:** when a Bonded ally goes Down you lose `bond.down_mp` (**10 MP**, never below 0) and Grief unlocks as today. An enemy going Down costs you nothing.
12. **You hit it more easily** (`bond.hit` **+3**): every weapon attack you make, of any weapon, against an enemy Bonded to you. Allies get nothing (Mark is the Operative's). A Sigil Evoke and an Outburst Release do not roll through the `attack` hook and take no to-hit bonus; they still get rules 13 and 15 and the Ledger.
13. **Your healing hurts it** (`bond.echo` **0.25**): every heal **you give** to **yourself or a Bonded ally** (from Tending, any door's heal, a Mender move, a stim or medical kit you use) makes **each** enemy Bonded to you take a quarter of the HP it restored, as **Soul damage at the start of that enemy's next turn** (frozen when the heal lands; armour ignored; the guard holds; no reaction; never redirected). **What counts:** the HP actually restored (overheal does not); not shields (a shield is held, not restored; shields feed the Ledger only); not heals others give you; not out of a fight.
14. **Several Bonds on one enemy** (co-op): each Bonder's share, echo and to-hit are its own; an enemy may carry Bonds from four Menders. The ×1.2 through is the giver's own Bond only.
15. **The more you are tied, the harder you hit** (the door's inherent rule, `bond.per_bond` **0.10**): every damage you deal by your own action (any weapon attack, a Sigil Evoke, an Outburst Release, a damaging prayer) is ×(1 + **0.10** × the Bonds you hold, allies and enemies). Not the share (10), not the echo (13), not Bleeding or Burning you caused. Only while the Attuner is in a hand.
16. **Hidden.** Bonding does not reveal you. Tending through a Bond reveals you and makes you **Traced** (rule 21). A Hidden enemy can't be Bonded (not in sight); a Bonded enemy that becomes Hidden is out of sight (rule 6).
17. **Charmed, Puppeted, Smitten, Commanded** enemies stay what they are: their side does not change, so their Bonds hold and rules 10 to 15 apply.
18. **Forced movement** never breaks a Bond. **Reactions:** Share a Hit and Take the Weight are of kind `protect` (P1), one reaction a round, never triggering another, working while Suppressed.
19. **Saves mid-fight:** Bonds, the Ledger and the delayed echoes live on the fight (`cb.ties`, the resource `ledger`, the delayed ops), so they are in the save and the event log; a fight saved before this patch has none.
20. **Fight's end:** all Bonds end, the Ledger empties, pending echoes are dropped. Out of a fight Tending works within its unbonded reach; Triage out of a fight keeps its ×3 (rules 1.23).
21. **Traced** (condition, no save, 2 rounds): given to whoever tends through a Bond, **and renewed at the start of each of your turns while you hold an enemy Bond** (the enemy feels the thread). While Traced you can't be Hidden and the enemies know where you are (`always_seen`, P7; rules 1.23 `healerMark` counts you as seen).
22. **Tending on yourself:** Mend may target yourself **once a turn** (not through a Bond: no ×1.2, no Trace; the hunt does not count it). Settle and Soothe may target yourself. Touch, Shield, Raise, Guide and Triage target others.
23. **Feelings for the Mender:** anyone with Empathy 1 feels (`feelings.ts canFeel` widens); a character who first gains it picks 2 starting feelings.

## 3. The list

Reach "R3": an ally within 3 tiles you see, or a Bonded ally anywhere you see. Every verb needs the Attuner in a hand and pays MP through it. Amounts: base × Healing given (`tend`) × the level factor × through (if Bonded). Ids `verb:tend.*` (P6).

| Id | Name | Cost | What it does | Opens | Data |
| --- | --- | --- | --- | --- | --- |
| tend.bond | Bond | 1 AP (Mender: first a turn 0, any range) | tie an ally or enemy in sight within 6 (9 at Empathy 6); an enemy saves (Heart; Elite +2, Boss +5) | Empathy 1 | `tending.json bond` (`make_range`, `through`, `down_mp`, `share`, `hit`, `echo`, `per_bond`, `save_elite`, `save_boss`, `boss_rounds`) |
| tend.mend | Mend | 2 AP, 8 MP | R3, or yourself once a turn: heal **3.75** | Empathy 1 | `amounts.heal.base` |
| tend.touch | Touch | 2 AP, 8 MP | adjacent: heal **4.3** | Empathy 1 | `amounts.heal.base` |
| tend.settle | Settle *(Suggested)* | 1 AP, 5 MP | R3 or self: +2 on Body, Brain and Heart saves until your next turn | Empathy 1 | condition `settled` |
| tend.soothe | Soothe *(Suggested)* | 1 AP, 6 MP | R3 or self: end 1 harmful condition (2 from Empathy 7), newest first: Body (bleeding, burning, weakened, slowed, nausea, pinned, dazed, blinded, suppressed, corroded); Heart (fear, shaken, smitten, scorned) from Empathy 5. Never Brain, Stunned, Injured, Prone, Grappled, Taunted, Commanded | Empathy 1 | op `cleanse` `count` |
| tend.shield | Shield | 2 AP, 10 MP | R3: shield **4.5** on the base layer (the larger stands) | Empathy 2 | `amounts.shield.base` |
| tend.raise | Raise | 1 AP, 12 MP | a Downed ally adjacent or Bonded in sight stands at **1.9** × … (at least 1 HP); once a turn | Empathy 3 | `amounts.heal.base`, limit |
| tend.guide | Guide | 1 AP, 5 MP | R3: the ally steps up to 2 tiles (3 at Empathy 7) to a tile you pick; willing, provokes nothing | Empathy 4 | `forced_movement.guide` |
| share_hit | Share a Hit | reaction (`protect`), 0 | an adjacent ally (a Bonded ally in sight from Camaraderie 5) is hit: you take **25% + 5% a point of Camaraderie** (most 50%) of it; no focus needed | Camaraderie 1 | `skills.json camaraderie.unlocks.1` |
| field_surgery | Field Surgery | out of a fight, 1 field kit's use, 15 MP | anyone with Empathy 3 and an Attuner: treat one limb injury or clear every Body condition; once an ally a scene | Empathy 3 | `tending.json` (moved from the class) |
| — | stims, medical kits | gear | anyone, no focus; Stim Throw is a gear action anyone has (1 AP, within 4 in sight, one stim) | — | `actions.json stim_throw` |

**Songs** stay gear and traits (`actions.json song`, the three music traits): no song joins Tending.

## 4. The ladder

| Empathy | Gives (Healing given grows 0.06 a point throughout) |
| --- | --- |
| 1 | the door, its whole loop, smaller: Bond (ally or enemy), 1 Bond held; Mend, Touch, Settle, Soothe (Body); an enemy Bond's share, +3, echo and +10% from the first Bond |
| 2 | Shield |
| 3 | Raise; Field Surgery; Feel Their Pain (kept) |
| 4 | Guide (2 tiles) |
| 5 | 2 Bonds; Soothe reaches Heart; Mercy (kept) |
| 6 | Bond made within 9 |
| 7 | Soothe ends 2; Guide 3 tiles; a perk step (kept) |
| 8 | 3 Bonds |
| 9 | Mend, Touch and Shield cost 2 MP less; a perk step (kept) |
| 10 | Mastered perk (kept); your ally Bonds hold while you are Downed |

**On the enemy side, Empathy's points add:** the Bonds you can spend on enemies (1 / 2 / 3), the strength enemies save against (rules 1.13), and the reach to tie them (6 → 9). The share, the to-hit and the echo do not grow with points (no slope on a rolled attack: section 7).
**Leaves Empathy:** the free Pump (from 3) and the swell without Strain (from 7) **move to Will Power** at the same points.
**Gear gate:** `focus:attuner` (replaces `focus:emanator_foci` in `skills.json empathy.gates`): the Attuner in a hand. Bonding needs it too.
**Camaraderie (beta):** +10% healing received a point (kept); Share a Hit at 1; Hand-Off at 3 and Nobody Left Behind at 5 (kept); at 5 Share a Hit reaches a Bonded ally in sight.
**Insinuation (gamma, id `implication`):** its Call, Taunt, is everyone's and unchanged; no rule added.

## 5. The Mender *(Suggested; was Bard; id `bard` stays)*

**Better (three kinds):** a bigger meter (**one more Bond held**: 2 / 3 / 4); one thing a turn free (**the first Bond action each turn, 0 AP, any range in sight**, ally or enemy); six moves. Every damage, to-hit and on-hit rule below works with every weapon and every damaging door the Mender has (Leon, rule 7 of the frame; `rev4-weapon-neutral-audit.md` 6).

| Rank | Move (id) | Cost | Effect, numbers, limits | State |
| --- | --- | --- | --- | --- |
| I | Triage (`medic.triage`) | 2 AP, 6 MP | adjacent or Bonded ally in sight: heal **4.3** × Healing given × level × through, end Bleeding. Once an ally a turn. Out of a fight ×3, once an ally a scene | kept |
| I | **The Ledger** *(Suggested)* (`bard.ledger`) | passive | every heal you give that restores HP and every shield you give, to an ally or yourself, adds its amount to your **Ledger** (a meter, at most **15.5** × Healing given × level, about one all-in turn of care). Your next damage dealt by your own action (any weapon attack or damaging door) adds **0.7 × the Ledger** as flat damage before armour and empties it. A miss spends nothing; it goes on the first target damaged; it empties at a fight's end; it needs the Attuner in a hand to spend | NEW (Leon's class skill) |
| II | Inspire (`bard.inspire`) | 1 AP, 10 MP | a Bonded unit in sight: give a feeling **you have felt** (5.1). An ally gets +2 on its next attack and the feeling's boon until the end of its next turn; an enemy gets the feeling's enemy face (5.1) or nothing. One given feeling on a unit at a time; each feeling once a fight per unit; once a unit a round; an enemy never two rounds running | reworked; from rank I |
| II | Take the Weight (`bard.take_the_weight`) | reaction (`protect`) | a Bonded ally in sight **would go Down**: they stay at 1 HP and you lose **15% of your max HP** (true damage), only while above a quarter of your max HP. Or a Bonded ally would be **Stunned, Dazed or Afraid**: you take it instead | kept |
| III | Brimming *(Suggested)* (`bard.mend`) | passive | Tending you give that would heal past an ally's max HP becomes a shield on them, up to **half** of that heal (and feeds the Ledger as a shield) | kept; from rank II |
| III | Rally (`bard.rally`) | 2 AP, 20 MP, once a scene | every Bonded ally wherever they are, and every ally within 4, heals **3.1** × … (× through for the Bonded) and loses Fear and Shaken; each heal echoes on your Bonded enemies (rule 13) | kept |

**Why the Ledger is a move at rank I and not the "one thing better":** the three kinds are fixed and the Ledger is neither a bigger meter nor a cheaper act; it is the class's verb under Leon's ruling ("the Mender fights"), so it opens with the class at level 3 rather than at rank III (level 12). Inspire moves to rank II, Brimming to III; **Field Surgery leaves the class** for everyone with Empathy 3 (section 3).

### 5.1 Feelings given along a Bond (Inspire)

An ally's row is a field `given` on the feeling in `feelings.json`, carried by a condition `given_<id>` (1 round: until the end of the ally's next turn; "next attack" parts end with that attack; every ally also gets **+2 on the next attack**). The **enemy face** is a field `given_foe` carried by a condition `foe_<id>` (a P4 row), with a **Heart save** against your Empathy strength where marked. **Elites +2 on that save, Bosses +5**; a Boss is never Commanded or Taunted by it (Mercy, Guilt: nothing). "—" = no enemy face (the feeling is a gift only). Every rider works with any weapon (`attack` / `hit`, no `mode`).

| # | Feeling | Given to an ally (`given.*`) | Given to an enemy (`given_foe.*`): effect, number, rounds, save |
| --- | --- | --- | --- |
| 1 | Rage | next attack ×1.2; −2 Defense (`damage_mult` 1.2, `defense` −2) | −2 Defense, 1 round, Heart save (`defense` −2) |
| 2 | Grief | next hit Slows 1 round, no save | Slowed, 1 round, Heart save |
| 3 | Fear | +3 Defense, −2 to hit | Afraid of you, 1 round, Heart save |
| 4 | Love | heals **1.9** × Healing given × level × through | — |
| 5 | Joy | next attack +1 to hit, ×1.15 | — |
| 6 | Calm | +2 on every save | — |
| 7 | Spite | the next enemy hit that hurts them takes **6** flat back | its next hit on your side costs it **6** flat (Soul; level grows it), no save (`amounts.foe_spite.base` 6) |
| 8 | Shame | next attack ×1.3; they lose **8** HP now | it loses **8** HP now (Soul, level grows it), no save (`amounts.foe_shame.base` 8) |
| 9 | Pride | +1 AP banked if their next attack Downs or kills | — |
| 10 | Despair | next attack ×1.3 under half HP | under half HP: Weakened (−25% damage), 1 round, Heart save (`below` 0.5) |
| 11 | Hope | ends their newest harmful condition | — |
| 12 | Mercy | next hit on a target at a quarter HP or less: Commanded to hold 1 round | at a quarter HP or less: Commanded to hold, 1 round, Heart save (`at_most` 0.25) |
| 13 | Cruelty | next hit starts Bleeding, no save | Bleeding (its usual rounds), Heart save |
| 14 | Loneliness | +2 Defense | −2 to hit while no unit of its side is within 2 tiles, 1 round, no save (`hit` −2, `within` 2) |
| 15 | Belonging | +1 Defense, +1 to hit | — |
| 16 | Dread | next hit Suppresses 1 round (Body save) | Suppressed, 1 round, Heart save |
| 17 | Awe | next hit: Nausea 1 round, no save | Nausea (−1 AP), 1 round, Heart save |
| 18 | Longing | next move costs 1 AP less | its next move costs **1** AP more, no save (`ap` 1) |
| 19 | Relief | ends Bleeding and Burning | — |
| 20 | Contempt | next enemy hit is Scorned 2 rounds, no save | Scorned by you (−2 to hit you), 2 rounds, no save |
| 21 | Guilt | next enemy hit is Taunted by them (Heart save) | Taunted by you, 1 round, Heart save |
| 22 | Jealousy | next attack ×1.2 against a target with a boon or shield | — |
| 23 | Wonder | +3 on Perception skills | −3 on its Perception (spotting the Hidden), 1 round, no save (`skill` −3) |
| 24 | Defiance | +5 on their next save | — |
| 25 | Abandon | next attack ×1.4; −3 Defense | −3 Defense, 1 round, Heart save (`defense` −3) |

## 6. On what exists

**Exists:** Healing given is Empathy's (`character.ts healingMult`, `rules.json output.pairs.healing`); Camaraderie gives healing received (`healReceivedMult`). Left: Empathy's card text ("+10% healing given"; the profile says 0.06 a point); the Outburst discount on Empathy (`character.ts freePumps`, `swellFree`; `soul_modules.json cycle.free_pumps[].empathy`, `cycle.swell_no_strain.empathy`; `magic.ts` freeKind `'empathy'`) moves to `will_power`. The medic's kit (`effects/mending.ts kitHeal`), the healer hunt (`combat.ts healerMark`, `healerFocus`, `noteTended`), the intent read (`combat.ts enemyIntent`), the feelings (`feelings.ts`), the gate words (`skills.json` `gates`: `focus:evoker`, `focus:emanator`, `focus:emanator_foci`), the focus items (`items.json evoker`, `emanator`: `category: "focus"`, `slot: "off_hand"`), the unarmed attack (`weapons.json fists`). The shelved Heartbinder links (`classes/k.ts heartbinder.*`) are not touched.

**New:** `items.json attuner` (`category: "focus"`, `slot: "off_hand"`, `hands: "1H"`, `weight_kg` 0.4, `price_credits` 1000, provisional); **a focus is data, not a glove in code**: each focus item carries `focus: {door, hand, fuel}` (`{door: "empathy", hand: "one", fuel: "mp"}`; the Evoker `{door: "brain_power", fuel: "core"}`, the Emanator `{door: "will_power", fuel: "mp"}`), and every rule asks for "a focus of door X", never an item id, so the faction focuses of advanced classes (the Evoker blade, a faction's Emanator) can come later as more items; this spec builds none and depends on none. `skills.json empathy.gates` `focus:emanator_foci` → `focus:attuner`. The resource row `mp` reads `needs: "focus_in_hand"` against the spending item's `door` (Outbursts through the Emanator, Tending through the Attuner).

**Remove or move:** `classes/i.ts` handlers `medic.triage`, `medic.stim_throw`, `medic.field_surgery`, `bard.inspire`, `bard.mend` and `classes/rev3.ts` Rally become data (pin first: `test/golden/itemops.ts`); `classes.json` bard `resource` (supplies) and `resources` → `["mp", "ledger"]`; Inspire's `without_emanator` Strain. **Migration:** class ids stay; display names change (Bard → Mender, Mend → Brimming); `medic.stim_throw` and `medic.field_surgery` held by a Mender are dropped (both become everyone's); `res.supplies` is dropped; a Mender at rank I loses Inspire until rank II (Leon: a new save every update); a character who held an Emanator for Tending keeps it and needs an Attuner (the Report a problem note lists it).

### 6.1 Built from (each rule against the primitive that carries it)

| Rule or verb | Primitive (verified) |
| --- | --- |
| Each verb, AP and MP | a `verb` item (P6) in `data/tending.json`, `requires` Empathy, `grant_action` with `reach`, `if: {self_holds: ["focus:empathy"]}`; cost through `effects/cost.ts price` / `whyNot` / `pay`, `res: {mp}` |
| Heals, shields, their size | op `mend` with an `amounts` block (`effects/output.ts`); profile `tend` in `rules.json output.profiles` |
| Bond on an enemy, its save | the Bond verb's nested effects: op `condition` `bonded` (a P4 row: Heart, `via: empathy`; its `save` effects `roll_mod` +2 / +5 `if: {self_tier}`), then op `tie` `kind: bond` `if: {target_has: ["bonded"]}` (P8) |
| Bonds held, the shared cap, ends | ties (P8: `cb.ties`, kind `bond`, `ties_max:bond`, `target_tied`); `ends_on` (`from_down`, `to_dead`, `combat_end`) + two words (6.2) |
| Attuner leaves your person | `when: round_start`, `if: {self_lacks_gear: ["focus:empathy"]}`, op `tie` `kind: bond` `clear: "all"` |
| The share (10) | op `redirect` on `taking` (`share` 0.2), `targets: {side: "foe", tied: "bond"}` (P5), `split: true`; the damage `via: "bond"` (batch field), so `redirect` skips it (no chain) |
| To-hit (12) | op `roll_mod` on `attack`, `if: {target_tied: "bond", target: "foe", self_holds: ["focus:empathy"]}`: no `mode`, `melee` or `damage` predicate |
| The echo (13) | `when: heal_given`, `if: {actor: "self", target: ["self", "ally"], self_holds}` (+ `target_tied: "bond"` or self); op `deal` with `targets: {side: "foe", tied: "bond"}`, amount `per: [{of: "event:amount", value: 0.25}]`, `type: soul`, **`delay`** (6.2) |
| Harder with more Bonds (15) | op `damage_mult` on `dealing`, `if: {actor: "self", by_hit: true, self_holds}`, `value: {base: 1, per: [{of: "ties:bond", value: 0.10}]}` (P3 + 6.2) |
| The Ledger | resource row `ledger` (`actions.json resources`); fill: op `resource` on `heal_given` and `shield` (`if: {actor: "self"}`), `value: {per: [{of: "event:amount", value: 1}]}`; spend: op `damage_mod` on `dealing`, `if: {actor: "self", by_hit: true, self_holds}`, `value: {per: [{of: "res:ledger", value: 0.7}]}`, `and: [{op: "resource", value: "zero"}]`; empty at `combat_end` |
| Triage, Raise, Rally, Inspire, self-Mend limits | `limit: {per, n, each: "target"}` (`effects/uses.ts`); an enemy's two-round gap `limit: {cooldown: 2}` keyed on the target |
| Mender's free Bond | op `cost_mod` `set 0`, `when: cost`, `if: {action: ["tend_bond"]}`, `limit: per_turn 1` |
| Soothe, Hope, Relief, Rally's Fear and Shaken | op `cleanse`; Rally's set through `targets: {side: ally, tied: bond}` and `{within: 4}` (P5) |
| Settle, given feelings (both faces), Traced, `bonded` | `conditions.json` rows (P4) and `applyCond`; Traced's renewal `when: turn_start`, `if: {actor_tied: {kind: "bond", as: "from"}}` with a foe |
| Feelings' riders, enemy faces | op `condition` `when: hit`, `skip_save` where marked; `target_hp_at_most`, `self_hp_below`; op `deal` (Shame, Spite) with `amounts` |
| Take the Weight, Share a Hit | P1 `limit: {reaction: 1}`; op `floor` `when: would_drop`; op `cancel` + `condition: "incoming"`; op `redirect` |
| Felt Down | `when: downed`, `if: {target: ally, target_tied: bond}` + op `resource` (MP) + `say` |
| Guide | `displace(cb, rng, ally, {tile}, {willing: true, how: 'guide'})` |
| The aim read, sight | op `condition` `read` with `targets: {side: "foe", seen: true, aims_at: "tied:bond"}`; `reach.sight` (P7) |
| The hunt | `healerMark` (heals and shields through `healUnit` / `grantShield`); Traced through `always_seen` (P7) |
| Log, cards | `say`; item `text` with `{=placeholders}` |

### 6.2 Needs a new primitive (each one general addition; for the lead to fold into `rev4-primitives.md`)

1. **`delay` on any op** (`{until: "turn_start", of: "target"}`): the op's number blocks are evaluated now and frozen; the op runs when that unit's next turn starts; kept on the fight (`cb.pending`), dropped at `combat_end`. For the echo here; any "at the start of its next turn" effect later (delayed blasts, a Hexer's toll).
2. **P3 source `ties:<kind>`**: the count of ties the holder holds of that kind (`ties:any` for all), read through `kit.ts tiesOf`. For rule 15; the Hexer and the Banner Dancer later.
3. **Gear predicates `self_holds` / `self_lacks_gear`** (`ids`: an item id or `focus:<door>`): in a hand / nowhere on the unit. For the Attuner; every focus rule after (it replaces the `mp` row's hard-coded `emanator_in_hand`).
4. **P8 `ends_on` words** `to_down` (the tied unit is Downed; enemy Bonds only, through a `side: "foe"` qualifier on the word) and `unseen_round` (the `from` unit has not seen the `to` unit since the start of its last turn: `sightOf`, P7). And op `tie`'s `clear` gains `"target"`. For the Hexer's ties too.
5. **`redirect` field `split`** (the share divided among the `targets` set) and the batch field `via` on the redirected damage (already a batch row) read by `redirect` to skip a share.

## 7. Balance

**Ceilings.** Healing: the healer's turn, **200** Soldier-turns × 100 (rules 1.27), `balance.ceilings.tending_turn`, dial `tend.k` **1.573**, identity `through` ×1.2: **unchanged** (Mender all in 200, door all in 174, door normal 139; the table of draft 1 stands: 234 / 211 / 195 / 158 for the Mender). Offence: a new line **`balance.ceilings.mender_offence`** = **70** (percent of a rifle-turn; the Mender spending a whole turn on attacks, steady, against a Bonded enemy); the door's offence 70 ÷ 1.15 = **61**; and **`mender_window` 100**: the best three turns, the Ledger strike included, never average over a rifle-turn. Identity of the offence: `bond.per_bond` 0.10.

**The sheet** (an estimate, not a measurement). The `tending_mender` build: Insight and Empathy all in (7/7, 8/8, 10/10, 10/10), Dexterity from the spare points 0 / 1 / 2 / 4 at levels 1 / 5 / 10 / 20, **a service pistol** (the Attuner takes the off hand; a two-handed rifle turns every passive off). Rifle-turn 69.7 / 91.8 / 101.7 / 110.9 HP; Soldier-turn 18.5 / 24.1 / 34.2 / 60.2; Soldier Defense 11 / 13 / 15 / 17. The normal-share rifleman hits 65% at every level (Dexterity 4 / 6 / 8 / 10 against the rising Defense). The pistol after a Soldier's armour does 25 / 40 of the rifle's per hit (×0.625), same AP a shot.

| Term | Arithmetic | L1 | L5 | L10 | L20 |
| --- | --- | --- | --- | --- | --- |
| Mender's hit, plain | (21 − (Defense − mod)) × 5%, mod −2 / 0 / +1 / +3 | 40% | 40% | 35% | 35% |
| with the Bond's +3 | +15 points | 55% | 55% | 50% | 50% |
| a pistol turn, Bonded target | hit ÷ 65% × 0.625 | 0.53 | 0.53 | 0.48 | 0.48 |
| Mend on yourself | 3.75 × Stat × level (no through) | 10.5 | 12.3 | 16.2 | 23.0 |
| Ledger cap | 15.5 × Stat × level | 43 | 51 | 67 | 95 |

**The offence line** (% of a rifle-turn; × (1 + 0.10 × Bonds)):

| Who, a whole turn on attacks, steady | Bonds | L1 | L5 | L10 | L20 | Mean | Line |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Mender, solo against three Soldiers (Bonds on three) | 3 | 69 | 69 | 62 | 62 | **66** | 70 (−6%) |
| Mender, squad of four (three allies and one enemy; L1: cap 3) | 3 / 4 | 69 | 74 | 67 | 67 | **69** | 70 (−1%) |
| Door, all in, solo or squad (cap 2 / 3 / 3 / 3) | 2 / 3 | 63 | 69 | 62 | 62 | **64** | 61 (+5%) |
| **The lead's numbers** (+2, +5%): Mender solo | 3 | 53 | 53 | 48 | 48 | 51 | 70 (**−27%**: broken) |

**What changed and why:** the Attuner's hand moved the Mender from the rifle to a one-hander (×0.625), which broke the lead's +2 / +5%. The to-hit goes **+2 → +3** and the damage per Bond **5% → 10%** (`bond.hit`, `bond.per_bond`); the grid tried +2 with 8 to 15% and +3 with 8 to 15%: +3 / 10% is the one inside ±12% for both the solo and the squad Mender. The echo **0.25** and the share **0.20** are kept.

**The window** (best three turns, squad: Ledger strike, heal turn of three Triages on Bonded allies, Ledger strike again; the Ledger refills to its cap in one heal turn; strike = the offence turn + 0.7 × the cap; the heal turn's echo = 0.25 × 3 Triages per Bonded enemy, 16 / 14 / 16 / 21% each):

| Window | L1 | L5 | L10 | L20 | Line |
| --- | --- | --- | --- | --- | --- |
| Strike–heal–strike, one enemy Bonded | 80 | 80 | 81 | 92 | 100 |
| the same, two enemies Bonded | 85 | 84 | 86 | 99 | 100 (on it at L20) |
| One strike turn alone | 112 | 113 | 113 | 127 | the peak tier 165 |
| Solo turn: Mend yourself + 2 pistol attacks + echo + share + Ledger, against two | 67 | 65 | 68 | 82 | 100 |
| the same, against three | 78 | 76 | 80 | 99 | 100 |

The Ledger factor went **0.75 → 0.7** on this table (0.75 read 102 at L20 with two enemies Bonded); the cap is one all-in heal turn so a long fight banks no one-shot.

**Defence: what the share is worth** (Soldier-turns a round, against the healer ceiling of 2.0): the share is 0.2 × the Soldiers shooting you: **0.4** against two, **0.6** against three; Mend on yourself once a turn **0.57 / 0.51 / 0.47 / 0.38**. Together **0.97 to 1.17**, under 2.0. **A solo Mender** (estimate: HP 115 / 151 / 229 / 430; Bonds on all foes from round 2; each round Mend yourself and two pistol attacks at one Bonded Soldier): against **two** Soldiers it wins in 7 / 8 / 9 / 7 rounds with **23 / 35 / 16 / 62** HP left (a near thing, never safe); against **three** it is Downed in round 3 / 3 / 3 / 4 with one Soldier dead or nearly. Not unkillable: self-Mend is once a turn, at ×1.0, for that reason (three self-Shields a turn, 1.84 Soldier-turns, would have been).

**"No damage slope on a rolled attack" (rule 15):** this is a slope by Bonds held, and the cap of Bonds comes from Empathy (+10% at 1, +20% at 5, +30% at 8, +40% for a Mender). It is not a per-point slope: it comes in three steps, each bought in the fight with AP, a target that must fail a save and stay in sight, and the Attuner's hand (the passives are off with a two-handed weapon). The budget table treats it as the door's identity, measured on the door's line (61) and the Mender's (70); a gunner who dips Empathy 1 must hold a one-hander to use it: +3 and +10% on one Bonded target is about ×1.3 on that target for an all-in shooter (80% → 95% to hit), against the ×0.625 the pistol costs next to the rifle, so the dip leaves it about 18% under its own rifle (the line to watch: `bond_dip`, and a mixed class's 5% when the mixed batch is built). **To measure:** a pistol gunner all in with Empathy 1 and an Attuner (`bond_dip`), and the Outburst mixed sheet (Will Power and Empathy, Emanator and Attuner: a normal-share Release × 1.3 reads about 140 against `outburst_steady` 135).

**Measure when built:** rows `tending_door`, `tending_mender`, `mender_offence`, `mender_window`, `bond_dip` in `test/balance/refit-measure.ts measure`; builds in `builds.ts` (the sheet above; the door healer); a policy in `policies.ts` (free Bond the nearest enemy, Bond the front two allies; heal the most hurt Bonded under half HP, else Mend yourself if hurt, else attack the Bonded enemy with the most HP lost; Inspire with 1 AP left); levels 1, 5, 10, 20; solo against two and three Soldiers and in the squad of four (rules 1.23 section 4); fit `bond.per_bond` (offence), then `ledger.factor` (window); `tend.k` stays the heal dial.

## 8. The other side

**Enemies do not Bond or Tend in this patch** (enemy healers keep `heal_enemy`). **They know when they are Bonded:** the `bonded` notice and the thread show on both sides, and the Bonder is Traced while it holds an enemy Bond (rule 21). **The AI learns** (`combat.ts` enemy turn, data in `enemies.json` `healer_focus`): (1) a Bonded enemy counts its Bonder as a healer for `healerMark` whatever it has healed (it is being hurt by that healing): an Elite or Boss (`healer_focus` 1) turns on the Bonder first and a shooter steps for a line on it; a Soldier (0.5) leans to it; (2) Traced counts as seen, so the hunt finds a Bonder behind a wall; (3) the AI is not taught to break sight on purpose in this patch; it ends Bonds as it moves for cover and the line; (4) Taunt still comes first. The fire doctrine (rules 1.25) is unchanged: Spread spreads, Focus focuses, the healer weight is the Bonder's.

## 9. The screen

- **The meter, one place:** the **Bond strip** under the Bonder's portrait in the left panel, in two groups: **allies** (portrait, HP bar, condition glyphs, a red crosshair with the count of enemies aiming at them) and, after a thin rule, **enemies** (portrait with a red thread mark, HP bar, the echo waiting on it as a small number); empty chips up to the cap. The Mender's **Ledger** is a bar at the strip's end with its number and cap ("LEDGER 39/44"). Insight's ink `#EB95B7`. Nowhere else shows Bonds, except "Bonded to Ha" on an ally's portrait and a thread glyph on an enemy's.
- **The Attuner** shows in the off-hand slot; with it in the pack the strip greys out with "Attuner in pack: Bonds held, threads quiet".
- **Action tab "Tend"**, groups: *Bond* (Bond, let go), *Heal* (Mend, Touch, Shield, Raise), *Help* (Settle, Soothe, Guide), *Class* (Triage, Inspire, Rally). A Bonded unit in sight is drawn with a thin line from you on hover.
- **Hover cards:** the item `text`; the attack preview adds its terms ("+3 Bonded", "×1.2 Bonds held", "+27 Ledger").
- **It works:** a soft line of light to the ally and the heal in success green `#6FEA77`; on an enemy the thread pulls taut, and its echo or share number shows in red `#F65157` with "through the Bond". **It fails:** the engine's reason ("Not in sight: a Bond carries Tending only where you can see.", "Needs an Attuner in hand.", "Soldier A resisted the Bond (Heart save 14 vs 12).", "A machine has no heart to Bond.").
- **Inspire:** a picker of felt feelings (unfelt greyed), the ally line or the enemy line under each by target; "—" feelings greyed on an enemy.
- **Art (for `art/briefs/ART-REQUESTS.md` and the gear prompts; to list, not edit here):** **the Attuner**, one painted item icon in the three gloves' family with its own silhouette (the lead's suggestion: fine filaments from a small core on the back of the hand to each fingertip, one lit a Bond; Insight's ink; its look is Leon's), artist; a Bond chip frame, the ally line and the enemy thread (SVG, Claude can draw); the Ledger bar (SVG); Tend tab icons for Bond, Mend, Touch, Shield, Raise, Settle, Soothe, Guide, Share a Hit, Take the Weight, Brimming, the Ledger (Wick flat ink, artist); the Mender emblem if the name is kept; Traced and Bonded glyphs (line icons).

## 10. Data

`data/tending.json` (new, kind `tending`): the `bond` numbers (`make_range` 6 / 9, `through` 1.2, `down_mp` 10, `share` 0.2, `hit` 3, `echo` 0.25, `per_bond` 0.10, `save_elite` 2, `save_boss` 5, `boss_rounds` 3, all `provisional: true`) and `items` (kind `verb`, P6). The tie kind `bond` is a row of `rules.json ties.kinds` (`ends_on: ["from_down", "to_dead", "combat_end", {"word": "to_down", "side": "foe"}, "unseen_round"]`, `on_end: "none"`). The door's passives are one item, `tend.threads`, held by everyone with Empathy 1. `items.json attuner`: `{"id": "attuner", "name": "Attuner", "category": "focus", "slot": "off_hand", "hands": "1H", "focus": {"door": "empathy", "hand": "one", "fuel": "mp"}, "weight_kg": 0.4, "price_credits": 1000, "text": "The standard glove for Bonds and Tending: a heart that threads you to the people around you.", "adjudication": "engine", "provisional": true}`.

```json
{ "id": "tend.threads", "name": "Threads", "door": "empathy", "requires": [{"skill": "empathy", "min": 1}],
  "numbers": { "share": 0.2, "hit": 3, "echo": 0.25, "per_bond": 0.1 },
  "amounts": { "echo": { "kind": "damage", "base": 0, "per": [{"of": "event:amount", "value": 0.25}], "type": "soul", "via": "bond", "provisional": true } },
  "effects": [
    { "op": "redirect", "when": "taking", "if": {"target": "self", "self_holds": ["focus:empathy"]}, "share": 0.2, "split": true,
      "targets": {"side": "foe", "tied": "bond"}, "type": "soul", "via": "bond" },
    { "op": "roll_mod", "when": "attack", "if": {"target": "foe", "target_tied": "bond", "self_holds": ["focus:empathy"]}, "value": 3 },
    { "op": "deal", "when": "heal_given", "if": {"actor": "self", "target": ["self", "ally"], "self_holds": ["focus:empathy"]}, "amount": "echo",
      "targets": {"side": "foe", "tied": "bond"}, "delay": {"until": "turn_start", "of": "target"},
      "say": "{target} feels {self}'s care as a wound." },
    { "op": "damage_mult", "when": "dealing", "if": {"actor": "self", "by_hit": true, "self_holds": ["focus:empathy"]},
      "value": {"base": 1, "per": [{"of": "ties:bond", "value": 0.1}]} } ],
  "text": "With an Attuner in hand: {=numbers.share|pct}% of the damage you take goes to the enemies Bonded to you, split among them; you have +{=numbers.hit} to hit an enemy Bonded to you; when you heal yourself or a Bonded ally, each enemy Bonded to you takes {=numbers.echo|pct}% of that heal at the start of its next turn; every attack and damaging spell you make deals {=numbers.per_bond|pct}% more for each Bond you hold.",
  "adjudication": "engine", "provisional": true }
```

(The `if` of the echo also needs "the healed ally is Bonded to you": `target_tied: "bond"` OR `target: "self"`; written as two effects in the build, one each. The text's numbers are read from `numbers`, which the ops repeat; the validator checks they are equal.)

```json
{ "id": "bard.ledger", "name": "The Ledger", "origin": "bard", "origin_rank": "I", "attributes": ["insight"], "status": "active",
  "amounts": { "cap": { "kind": "heal", "base": 15.5, "profile": "tend", "provisional": true } },
  "numbers": { "factor": 0.7 },
  "effects": [
    { "op": "resource", "when": "heal_given", "if": {"actor": "self"}, "resource": "ledger", "value": {"base": 0, "per": [{"of": "event:amount", "value": 1}]}, "max": "cap" },
    { "op": "resource", "when": "shield", "if": {"actor": "self"}, "resource": "ledger", "value": {"base": 0, "per": [{"of": "event:amount", "value": 1}]}, "max": "cap" },
    { "op": "damage_mod", "when": "dealing", "if": {"actor": "self", "by_hit": true, "self_holds": ["focus:empathy"]},
      "value": {"base": 0, "per": [{"of": "res:ledger", "value": 0.7}]},
      "and": [ { "op": "resource", "resource": "ledger", "value": "zero" } ], "say": "{self} calls in the Ledger." },
    { "op": "resource", "when": "combat_end", "resource": "ledger", "value": "zero" } ],
  "text": "Every heal you give that restores HP and every shield you give, to an ally or to yourself, is counted in your Ledger, up to about {=amounts.cap.base} times your Healing given. The next damage you deal with your own action, with any weapon or door, adds {=numbers.factor|pct}% of the Ledger, and the Ledger empties. A miss spends nothing.",
  "adjudication": "engine", "provisional": true }
```

An enemy face (a condition row; the number from `feelings.json given_foe`): `{"id": "foe_dread", "kind": "debuff", "family": "heart", "save": true, "duration": {"rounds": 1}, "effects": [{"op": "condition", "when": "cond_landed", "condition": "suppressed", "rounds": 1, "skip_save": true, "target": "self"}], "text": "A feeling given through a Bond: you are Suppressed for {=effects.0.rounds} round.", "adjudication": "engine", "provisional": true}`.

**Validator rules to add (`tools/validate.py`):** every `tending.json` verb has `requires` on Empathy, a `grant_action` with `ap`, `res`, `reach`, and `if.self_holds` naming `focus:empathy`; a `reach.tied` and a `target_tied` name a tie kind in `rules.json ties.kinds`; every feeling has `given` and either `given_foe` or `"given_foe": null`, with `given_<id>` / `foe_<id>` rows in `conditions.json`; every `focus` item has `door`, `hand`, `fuel`, and each `focus:<door>` gate word names a door some focus item has; `bond` numbers equal the ops' numbers in `tend.threads`; no class item's damage, to-hit or on-hit op carries `mode`, `melee` or `damage` (the weapon-neutral guard, `class-weapon-neutral.test.ts`); `classes.json` bard has no `supplies`.

## 11. Open questions for Leon

**Settled by Leon (13 Nov):** (a) a Bond may be tied to an enemy, the same action and cap as an ally Bond (the door); (b) a Bonded enemy takes part of the damage you take; (c) you hit a Bonded enemy more easily; (d) when you heal yourself, each Bonded enemy takes a quarter of that heal at the start of its next turn, and healing a Bonded ally is felt the same way; (e) the door's damage rises with Bonds held, ally or enemy; (f) the Mender's class skill collects heals and shields given and spends them on its next damaging action; (g) base classes are weapon-neutral; (h) an advanced class may tie an ally to an enemy (a sketch only); (i) Bonds have their own focus, a standard glove like the Visualizer; (j) the focuses are the gear companies' one system, faction focuses come with advanced classes; earlier: the budget reading (Mender on the healer ceiling 200, door 174 / 139); a reaction never triggers a reaction.

**The lead's calls (from this spec; Leon can reverse each):**
1. The enemy saves (Heart, against Empathy strength; Elite +2, Boss +5); a Boss Bond lasts 3 of its turns, then a round's gap. 2. An enemy Bond ends on its Down or death, your Down, a whole round out of your sight, the fight's end or the Attuner leaving your person; **no enemy verb tears one** (lead asked; chosen: sight and the hunt are enough).
3. The share **20%** (kept), split, Soul, ignores armour, no chain. 4. To-hit **+3** (changed from +2: the one-hander), weapon attacks only; allies nothing. 5. The echo **0.25** (kept): every heal you give that restores HP to yourself or a Bonded ally, any source; not overheal, not shields, not heals given to you.
6. Damage per Bond **10%** (changed from 5%), every damaging action of your own; the dip check in section 7. 7. The Ledger at rank I (not Field Surgery's rank III: "the Mender fights" from level 3); factor **0.7** (lead proposed a factor; 0.75 broke the window at L20); cap 15.5 × Healing given × level; a miss spends nothing; empties at the fight's end; Inspire to rank II, Brimming to III, Field Surgery to everyone with Empathy 3.
8. Mend may target yourself once a turn (Leon's echo needs self-healing; more would make a solo Mender unkillable). 9. While you hold an enemy Bond you are Traced; a Bonded enemy counts its Bonder as a healer for the hunt.
10. The passives need the Attuner in a hand; Bonds hold while it is in the pack; all end when it leaves your person. 11. Machines (robots, drones, turrets) and Figments can't be Bonded. 12. The enemy faces of the 25 feelings (5.1): 15 have one, 10 none.
13. Earlier calls kept: the felt Down costs 10 MP; Take the Weight 15% of max HP; Guide's tile is the Mender's; Rally reaches the unseen Bonded; Empathy's free Pump and swell to Will Power; Traced; Supplies leave; Relief ends Bleeding and Burning; Suppressed never blocks a protective reaction; Lift renamed Soothe.

**Still open (Leon's alone):**
1. **The Attuner's name and look** *(Suggested; the lead's suggestion: filaments from a core on the back of the hand to each fingertip, one lit a Bond)*; assumed meanwhile: "Attuner", the icon waits.
2. **The Ledger's name** *(Suggested)*; assumed meanwhile: "The Ledger".
3. **The Outburst-and-Tending mixed sheet** may read about 140 against `outburst_steady` 135 (section 7): recommend measuring before any change; assumed meanwhile: no change.
