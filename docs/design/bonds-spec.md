# Tending and Bonds: Insight's door, and the Mender (spec, 13 Nov 2026)

Status: **a spec for the Revision 4 patch; nothing here is built.** Frame: `class-roster-rev4-proposal.md` (draft 2) sections 1, 2, 2.1 and 4.7; `proposals/2026-11-nine-doors.md` 5.4; `balance-contract.md` (the healer's ceiling, rules 1.27). Every number is **PROVISIONAL** (a spec section 14 item each when built). Names marked *(Suggested)* are Leon's to change. Choices made for him are in section 11.

## 1. The fantasy and the loop

You feel your squad. **Empathy** opens two things to anyone: **Bonds**, ties to allies that tell you how they are and carry your care to them across the field, and **Tending**, a list of direct support actions paid in AP and MP (no Begin, no Pump, no Strain). The **Mender** holds one more Bond, Bonds for free once a turn, and gives its allies the feelings it has felt.

**Worked example.** Sister Ha, Mender, level 5: Insight 6, Empathy 6, Camaraderie 3, Determination 3. Max MP 100 + 75 × 2 + 25 × 5 = **375**. Bonds held: 2 (Empathy 5) + 1 = **3**. Healing given (the `tend` profile, section 7): 1.392 × (1 + 0.06 × 5 + 0.06 × 6) = **2.31**; level ×1.10.

| Turn | Action | AP left | MP | Bonds | What happens |
| --- | --- | --- | --- | --- | --- |
| 1 | Bond Kade (the tank, 7 tiles off, in sight): the Mender's free Bond | 6 | 375 | 1 | Kade's HP, conditions and who aims at him show on her Bond strip |
| 1 | Bond Vo (rifleman, 4 tiles): 1 AP | 5 | 375 | 2 | |
| 1 | Inspire Vo with Rage (felt last session) | 4 | 365 | 2 | Vo's next attack +2 to hit, ×1.2 damage; −2 Defense until his turn ends |
| 1 | Triage Kade through the Bond | 2 | 359 | 2 | 4.3 × 2.31 × 1.10 × 1.2 (through) = **13** HP; his Bleeding ends. Ha is **Traced** (section 2, rule 14) |
| 1 | Mend Kade | 0 | 351 | 2 | 3.75 × 2.31 × 1.10 × 1.2 = **11** HP (Triage is once an ally a turn) |
| 2 | (round 2) a Soldier's Burst would drop Kade: **Take the Weight** (her reaction) | 6 | 351 | 2 | Kade stays at 1 HP; Ha loses 15% of her max HP (21) |
| 2 | Free Bond: Lien (the caster) | 6 | 351 | 3 | |
| 2 | Triage Kade, Triage Lien, Settle Vo | 1 | 334 | 3 | +13, +13; Vo +2 on saves until her next turn |

## 2. Rules

Adjudication: every rule is `engine`, except where marked.

1. **A Bond** ties you to one ally unit of your side that is a character or a beast companion (not a drone, turret or Figment). Making one is the action **Bond**: 1 AP, the ally in your sight and within `bond.make_range` (6; 9 from Empathy 6). It lasts the fight. Anyone with Empathy 1 may Bond.
2. **Bonds held:** `ties_max:bond` = 1 at Empathy 1, 2 at 5, 3 at 8; the Mender +1. Bonding past the cap asks which Bond to let go (free). Letting a Bond go is free, on your turn.
3. **The Mender's free Bond:** its first Bond action each turn costs 0 AP and has no range limit (any ally it can see).
4. **Through a Bond** (the system's identity, `tend.bond` `through` **×1.2**): every Tending heal or shield you give a Bonded ally is ×1.2, and Tending reaches a Bonded ally **at any range, while you can see them** (`sightCheck`). Unbonded, Tending reaches 3 tiles in sight (Touch: adjacent).
5. **What a Bond tells you** (your side's view only): the Bonded ally's HP, shield and conditions are shown on your Bond strip (the side already sees its own units: this is placement, not new knowledge); and **who is aiming at them**: at the start of each of your turns, every enemy your side sees whose intent (`enemyIntent`) targets a Bonded ally is read (its `readIntent` is set and drawn, as Read does). Unseen enemies are never named or placed (fog, spec item 1600 a).
6. **Sight to keep:** none. A Bond holds out of sight, through walls, across the map; only Tending through it needs sight (rule 4). Rally (the Mender's) needs none.
7. **Felt at the Down:** when a Bonded ally goes Down, the Bonder loses `bond.down_mp` (**10 MP**, never below 0), the log says it, and the feeling Grief unlocks as today. **This replaces Revision 4's "take 1 Strain":** Strain is Determination's meter and Insight may not spend it. MP is the Soul's fuel: losing it shrinks the healer's next turns without Downing the healer (an HP cost here would chain one Down into the next).
8. **A Downed or dead end.** A Bonded ally who is Downed **stays Bonded** (you can Raise them through it). A dead ally's Bond ends. **When the Bonder goes Down, all its Bonds end** (from Empathy 10 they hold). That is how an enemy cuts a Bond: no enemy verb cuts one, it drops the healer.
9. **Hidden.** Bonding does not reveal you. Tending through a Bond **reveals you and makes you Traced** (rule 14).
10. **Forced movement** never breaks a Bond. **Reactions**: Share a Hit and Take the Weight spend your one reaction (Revision 4 section 2.1); neither triggers another reaction; Share a Hit (protective) works while Suppressed.
11. **Co-op, four players.** Each healer counts its own Bonds; an ally may be Bonded by several. The ×1.2 is the giver's own Bond only (never ×1.2 × 1.2). A Bonded ally's player sees "Bonded to Ha" on their portrait.
12. **Saves mid-fight:** Bonds live on the fight (`cb.ties`), so they are in the save and the event log; a fight saved before this patch has none.
13. **Fight's end:** all Bonds end. Out of a fight there are no Bonds; Tending works on the area map within its unbonded reach; Triage out of a fight keeps its ×3 (rules 1.23).
14. **Traced** (a new condition, no save, 2 rounds): given to whoever tends through a Bond. While Traced you can't be Hidden, and **the enemies know where you are for the healer hunt** (rules 1.23 `healerMark` counts a Traced healer as seen). A healer behind a wall still feeds the hunt. Leon: the tank may be unkillable; the healer must not be safe.
15. **Tending targets others only** (as Triage today; self-healing is not what the hunt reads). Settle and Lift may target yourself.
16. **Feelings for the Mender:** anyone with Empathy 1 now feels (the unlock triggers of `feelings.json` reach them; `canFeel` widens). A character who first gains it picks 2 starting feelings (as Soul casters at creation).

## 3. The list

Reach "R3": an ally within 3 tiles you see, or a Bonded ally anywhere you see. MP is paid from an Emanator in a hand (rules item 630). Amounts: base × Healing given (`tend` profile) × the level factor × through (if Bonded). Ids are `verb:tend.*` (new item kind, section 6).

| Id | Name | Cost | What it does | Opens | Data |
| --- | --- | --- | --- | --- | --- |
| tend.bond | Bond | 1 AP (Mender: first a turn 0, any range) | tie an ally in sight within 6 (9 at Empathy 6) | Empathy 1 | `tending.json` `tend.bond` (`make_range`, `through`, `down_mp`) |
| tend.mend | Mend | 2 AP, 8 MP | R3: heal **3.75** | Empathy 1 | `amounts.heal.base` |
| tend.touch | Touch | 2 AP, 8 MP | adjacent: heal **4.3** (×1.15: the price of standing next to them) | Empathy 1 | `amounts.heal.base` |
| tend.settle | Settle *(Suggested)* | 1 AP, 5 MP | R3 or self: +2 on Body, Brain and Heart saves until your next turn | Empathy 1 | condition `settled` |
| tend.lift | Lift | 1 AP, 6 MP | R3 or self: end 1 harmful condition (2 from Empathy 7), newest first: Body (bleeding, burning, weakened, slowed, nausea, pinned, dazed, blinded, suppressed, corroded); Heart (fear, shaken, smitten, scorned) from Empathy 5. Never Brain, Stunned, Injured, Prone, Grappled, Taunted, Commanded | Empathy 1 | `effects` `cleanse` `count` |
| tend.shield | Shield | 2 AP, 10 MP | R3: shield **4.5** (×1.2 of Mend, the contract's shield rule); the larger shield stands | Empathy 2 | `amounts.shield.base` |
| tend.raise | Raise | 1 AP, 12 MP | a Downed ally adjacent or Bonded in sight stands at **1.9** × … (at least 1 HP); once a turn | Empathy 3 | `amounts.heal.base`, limit |
| tend.guide | Guide | 1 AP, 5 MP | R3: the ally steps up to 2 tiles (3 at Empathy 7) to a tile you pick; willing, provokes nothing, traps act | Empathy 4 | `forced_movement.guide` |
| share_hit | Share a Hit | reaction, 0 | an adjacent ally (a Bonded ally in sight from Camaraderie 5) is hit by an enemy: you take **25% + 5% a point of Camaraderie** (most 50%) of the damage they take (after their armour and shield) | Camaraderie 1 | `skills.json camaraderie.unlocks.1` |
| — | stims, medical kits | gear | anyone, as today (`actions.json stim`, `items.json stim_injector`); Stim Throw becomes a gear action anyone has (1 AP, within 4 in sight, one stim) | — | `actions.json stim_throw` (moved) |

**Songs:** the only songs in data are the Musek Blestor's "Play my song" (`actions.json song`) and the three music traits (`the_soundscape_of_the_soul`, `headbanger`, `underground_sound`, op `song_state`). They are gear and traits, anyone's, and **stay as they are**: no song joins Tending (a song is the music traits' fantasy, not Insight's).

## 4. The ladder

| Empathy | Gives (the Healing given Stat grows 0.06 a point throughout) |
| --- | --- |
| 1 | the door: Bond, 1 Bond held; Mend, Touch, Settle, Lift (Body) |
| 2 | Shield |
| 3 | Raise; Feel Their Pain (kept) |
| 4 | Guide (2 tiles) |
| 5 | 2 Bonds; Lift reaches Heart; Mercy (kept) |
| 6 | Bond made within 9 |
| 7 | Lift ends 2; Guide 3 tiles; a perk step (kept) |
| 8 | 3 Bonds |
| 9 | Mend, Touch and Shield cost 2 MP less; a perk step (kept) |
| 10 | Mastered perk (kept); your Bonds hold while you are Downed |

**Leaves Empathy:** "from 3 points one Pump a round is free; from 7 a held Outburst swells without Strain" (nine doors 5.4 point 4). It **moves to Will Power** at the same points (it is the Outburst's door).
**Gear gate:** an Emanator in a hand to pay MP (the skill's `gates` already name it). Bonding needs no gear.
**Camaraderie (beta):** +10% healing received a point (kept); Share a Hit at 1 (NEW); Hand-Off at 3 and Nobody Left Behind at 5 (kept); at 5 Share a Hit reaches a Bonded ally in sight.
**Insinuation (gamma):** its Call, Taunt, is everyone's and unchanged. A Bond's aim read (rule 5) is what tells you whom to Taunt off your ally; no rule is added (talk is no system's).

## 5. The Mender *(Suggested; was Bard; id `bard` stays)*

**Better (three kinds):** a bigger meter (**one more Bond held**: 2 / 3 / 4); one thing a turn free (**the first Bond action each turn, 0 AP, any range in sight**: Leon's ruling 9); six moves.

| Rank | Move (id) | Cost | Effect, numbers, limits | State |
| --- | --- | --- | --- | --- |
| I | Triage (`medic.triage`) | 2 AP, 6 MP | adjacent or Bonded ally in sight: heal **4.3** × Healing given × level × through, end Bleeding. Once an ally a turn. Out of a fight ×3, once an ally a scene. Stabilising with a stim costs you 1 AP (kept) | kept; Bond reach; base 5 → 4.3 with the ×1.2 |
| I | Inspire (`bard.inspire`) | 1 AP, 10 MP | a Bonded ally in sight: give a feeling **you have felt** (section 5.1): +2 on their next attack roll and that feeling's boon, until the end of their next turn. One given feeling on an ally at a time (a new one replaces it); each feeling once a fight per ally; once an ally a round. No Strain path | reworked |
| II | Brimming *(Suggested)* (`bard.mend`) | passive | Tending you give that would heal past an ally's max HP becomes a shield on them, up to **half** of that heal. The Buff-school base of 9 leaves (no borrowing of the Outburst's verbs) | reworked |
| II | Take the Weight (`bard.take_the_weight`) | reaction | a Bonded ally in sight **would go Down**: they stay at 1 HP, and you lose **15% of your max HP** (true damage); only while you are above a quarter of your max HP, so it never Downs you. Or (a toggle) a Bonded ally **gains a harmful condition**: you take it instead, same rounds, no save | NEW; Strain replaced by HP |
| III | Rally (`bard.rally`) | 2 AP, 20 MP, once a scene | every Bonded ally **wherever they are, seen or not**, and every ally within 4, heals **3.5** × … (× through for the Bonded) and loses Fear and Shaken | kept; through Bonds; base 6 → 3.5 |
| III | Field Surgery (`medic.field_surgery`) | out of a fight, 15 MP | with a field kit in the pack (not used up): treat one limb injury or clear every Body condition; once an ally a scene | kept; MP replaces the Supply |

**Why Take the Weight costs HP:** the move is taking the blow. MP would make it a free save for a full healer; HP makes it a trade a player weighs. 15% of max HP is about one Soldier-turn at level 1 (Max HP 100 to 160), the same rate as the old 2 Strain (`feelings.json price`: 1 Strain = 8 HP).

**Leaves:** Stim Throw (to gear), Supplies (`resource: supplies`; `resources` becomes `["mp"]`), Gift (shelved, as today).

### 5.1 Feelings given along a Bond (Inspire)

Each row is a field `given` on the feeling in `feelings.json`, carried by a condition `given_<id>` (rounds 1: until the end of the ally's next turn; the "next attack" part ends with that attack). All also give **+2 on the next attack roll**. Harmful feelings are given with a price the ally pays: each is still worth choosing.

| # | Feeling | Given: what the ally gets | Number (field `given.*`) |
| --- | --- | --- | --- |
| 1 | Rage | next attack ×1.2 damage; −2 Defense until it ends | `damage_mult` 1.2, `defense` −2 |
| 2 | Grief | next hit Slows its target 1 round, no save | `rounds` 1 |
| 3 | Fear | +3 Defense, −2 to hit until it ends (head down) | `defense` 3, `hit` −2 |
| 4 | Love | heals at once **1.9** × your Healing given × level × through | `amounts.given_heal.base` 1.9 |
| 5 | Joy | next attack +1 more to hit and ×1.15 damage | `hit` 1, `damage_mult` 1.15 |
| 6 | Calm | +2 on every save until it ends | `save` 2 |
| 7 | Spite | the next enemy hit that hurts them takes **6** flat back (level grows it) | `amounts.given_spite.base` 6 |
| 8 | Shame | next attack ×1.3 damage; they lose **8** HP now (flat, true) | `damage_mult` 1.3, `amounts.given_shame.base` 8 |
| 9 | Pride | if their next attack Downs or kills, +1 AP banked for their next turn | `ap` 1 |
| 10 | Despair | next attack ×1.3 if they are under half HP | `damage_mult` 1.3, `below` 0.5 |
| 11 | Hope | ends their newest harmful condition at once | `count` 1 |
| 12 | Mercy | next hit on a target at a quarter HP or less: it is Commanded to hold 1 round (Heart save) | `at_most` 0.25 |
| 13 | Cruelty | next hit starts Bleeding, no save | — |
| 14 | Loneliness | +2 Defense until it ends | `defense` 2 |
| 15 | Belonging | +1 Defense and +1 to hit until it ends | `defense` 1, `hit` 1 |
| 16 | Dread | next hit Suppresses its target 1 round (Body save) | `rounds` 1 |
| 17 | Awe | next hit: the target has Nausea 1 round (−1 AP), no save | `rounds` 1 |
| 18 | Longing | their next move costs 1 AP less (at least 1) | `ap` −1 |
| 19 | Relief | ends Bleeding and Burning on them at once | — |
| 20 | Contempt | next enemy hit is Scorned 2 rounds (−2 to hit them), no save | `rounds` 2 |
| 21 | Guilt | next enemy hit is Taunted by them (Heart save) | — |
| 22 | Jealousy | next attack ×1.2 against a target holding a boon or a shield | `damage_mult` 1.2 |
| 23 | Wonder | +3 on Perception skills (spotting the Hidden) until it ends | `skill` 3 |
| 24 | Defiance | +5 on their next save | `save` 5 |
| 25 | Abandon | next attack ×1.4 damage; −3 Defense until it ends | `damage_mult` 1.4, `defense` −3 |

## 6. On what exists

**Exists:** Healing given is already Empathy's (rules 1.13: `character.ts healingMult = statOf('healing')`, pair `insight` / `empathy` in `rules.json output.pairs.healing`); Camaraderie already gives healing received (`healReceivedMult`). **So the "multiplier moves from Camaraderie to Empathy" migration is done**; what is left: Empathy's card text says "+10% healing given" (the profile says 0.06 a point: fix the text), and the Outburst discount still on Empathy (`character.ts freePumps`, `swellFree`; `soul_modules.json cycle.free_pumps[].empathy`, `cycle.swell_no_strain.empathy`; `magic.ts` freeKind `'empathy'`) moves to `will_power`. The medic's kit (`effects/mending.ts kitHeal`, `rules.json mending.medic`), the healer hunt (`combat.ts healerMark`, `healerFocus`, `noteTended`), the intent read (`combat.ts enemyIntent`, `Unit.readIntent`), the feelings (`feelings.ts`), the shelved Heartbinder links (`classes/k.ts heartbinder.*`: to be rebuilt on ties, not reused).

**Remove or move:** `classes/i.ts` handlers `medic.triage`, `medic.stim_throw`, `medic.field_surgery`, `bard.inspire`, `bard.mend` and `classes/rev3.ts` Rally become data (pin them first: `test/golden/itemops.ts`, ENGINE-GUIDE section 2 "moving an existing handler"); `classes.json` bard `resource` (supplies) and `resources`; Inspire's `without_emanator` Strain. **Migration:** class ids stay (`class:bard`, `medic.triage`…); display names change (Bard → Mender, Mend → Brimming); a held `medic.stim_throw` is dropped (Leon: a new save every update); `res.supplies` is dropped.

### 6.1 Built from (each rule against the primitive that carries it)

| Rule or verb | Primitive (verified) |
| --- | --- |
| Each verb is an action with AP and MP | an item's `grant_action` → default action (`effects/actions.ts defaultActions`), cost through `effects/cost.ts price` / `whyNot` / `pay` with `res: {mp}` (`actions.json resources.mp`) |
| Heals and shields, their size | op `mend` with an `amounts` block (`effects/output.ts mend`, `amountOf`); a new profile `tend` in `rules.json output.profiles` (the dial) |
| Triage once an ally a turn; Raise once a turn; Rally once a scene; Inspire once an ally a round | `limit: {per, n, each: "target"}` (`effects/uses.ts` via `limitOk`) |
| Mender's free Bond | op `cost_mod` `set 0`, `when: cost`, `if: {action: ["tend_bond"]}`, `limit: per_turn 1` |
| Lift, Hope, Relief, Rally's Fear and Shaken | op `cleanse` (`condition`, `family`, `count`) |
| Settle, the given feelings' plain numbers | `conditions.json` rows read by `condtable.ts modsOf` (`stat_mod defense`, `save_*`, `attack_mod next_attack`, `damage_mult next_attack`, `skill_mod_tag`) and `applyCond` |
| Given feelings' riders (Slow, Bleed, Nausea, Scorned, Taunted, Commanded, Suppressed on a hit) | op `condition` `when: hit` (`target: target`), `skip_save` where marked; `target_hp_at_most`, `target_has`, `self_hp_below` predicates |
| Pride's AP, Longing's cheaper move | op `grant_ap` `bank: true` `when: kill`; op `cost_mod` `when: cost` `if: {action: ["move"]}` |
| Spite, Shame, Take the Weight's HP | op `deal` with an amount block (`per: [{of: "max_hp"}]` for 15%) |
| Take the Weight's save | op `floor` `value 1` `when: would_drop` `if: {open: true, self_hp_above: 0.25}` |
| Take the Weight's condition branch | op `cancel` `when: cond_incoming` + op `condition` on self; a toggle (`ToggleDef`) |
| The felt Down | `when: downed` `if: {target: ally}` + op `resource` (MP) + `say` |
| Guide | `displace(cb, rng, ally, {tile}, {willing: true, how: 'guide'})`; a `forced_movement.guide` row in `rules.json` |
| Sight for Tending through a Bond | `sightCheck` / `sideSees` (`combat.ts`); fog: `fogFight` keeps `ties` for `me`'s side only |
| The aim read | `enemyIntent` and `readIntent` (fx `intent`, as Read) |
| Grief at the Down; feelings Menders feel | `feelings.ts` triggers and `feelChar` (only `canFeel` widens) |
| The log | `say` with units named; hover cards from item `text` with `{=placeholders}` |
| The hunt | `healerMark` (`tendedLately` already counts every heal and shield through `healUnit` / `grantShield`) |

### 6.2 Needs a new primitive (each general, for the next system too)

1. **Ties** (`kit.ts`): a fight-scoped relation `cb.ties: {kind, from, to}[]` with `tie`, `untie`, `tiesOf`; a tie to a dead unit ends itself; op `tie` (`kind`, `clear: "all"`) in OPS; predicates `actor_tied` / `target_tied` (`kind`: tied to the holder); the cap is a stat `ties_max:<kind>` (`effects/stats.ts STATS`, answered by `stat_mod`). For the Heartbinder, the Hexer, the Matchmaker's Red Thread, the Banner Dancer.
2. **Op `mend_mult`** on triggers `heal` and `shield`: multiply the heal or shield being given (the `damage_mult` of mending). Carries `through`. `shield_grant` gains `kind` in its ctx so `how` reads it.
3. **Op `redirect`** on `taking`: move `share` of the damage to the holder (Share a Hit; later Interpose, the Matchmaker, Heartbinder Share).
4. **Limit `{reaction: true}`**: the effect spends the holder's one reaction through `tactics.ts useReaction`, and does not run without one (every reaction perk can use it).
5. **Action `reach`** on a `grant_action`: `{tiles, sight, tied, side, self, if}` builds the pick list and the refusal from `kit.ts` selectors and `sightCheck` (the `if` takes target predicates; add `<who>_alive` for actor and target, today only self's).
6. **A condition runs item ops**: a `conditions.json` row's effects with `when` run through `runTriggered` with the bearer as holder and the giver as `source` (25 given feelings, Traced; any condition with a rider after).
7. **A pick from a list the holder owns**: `grant_action.choose: {from: "felt"}` (the descriptor's choice list) with `{choice}` usable in a `condition` id and a `limit.key`.
8. **Amount counts from the event**: an amount block's `per.of` may be `event:<field>`, and `heal_given` carries `over` (healing past max HP): Brimming; later lifesteal.
9. **Op `read_intent`** (`if_aims_at: "tied:bond"`): sets `readIntent` on the event's units; the Operative's Read moves onto it.
10. **A `targets` selector on ops** (`{side, within, tied, seen}` over `kit.ts unitsIn` / `alliesOf`): Rally, the aim read (ENGINE-GUIDE section 5 names it as missing).
11. **Item kind `verb`** (`effects/collect.ts`): items of a door file (`data/tending.json`) held by anyone meeting `requires` (`{skill, min}`); shared with the other new doors.

Extensions of existing primitives (a field, not a handler): `resource` op takes MP through `cost.ts spend`; `condition` op `condition: "incoming"`; generic `mend` passes the block's `heal_kind`; `actions.json resources.mp` gains `needs: "emanator_in_hand"`; `healerMark` reads `condOn(t, 'traced')`; `feelings.ts canFeel` adds Empathy 1.

## 7. Balance

**Ceiling:** the healer's turn, all in, **200** Soldier-turns × 100 (rules 1.27). Tending gets its own row `balance.ceilings.tending_turn`, dial **`rules.json output.profiles.tend.k`** (1.392, the same pair and level column as `mend`); the identity multiplier is `through` ×1.2.

**The budget lines (a choice, section 11 item 1):** the squared class, BEST, sits on the ceiling, so the door all in = 200 ÷ 1.30 = **154**, the Mender **177** (+15%), the Heartbinder **200**. Normal share ÷1.25 to level 7. Tending sits under the Outburst's Buff heal (200) on purpose: it has no set-up turn a target can waste (the ledger's +10% a set-up turn), no Strain, and the Bond gives it range.

**Estimate** (not a measurement): all in = Insight and Empathy 7/7, 8/8, 10/10, 10/10; Stat 2.478 / 2.645 / 2.979 / 2.979; level ×1.00 / 1.10 / 1.28 / 1.82; Soldier-turn 18.5 / 24.1 / 34.2 / 60.2 HP (levels 5 and 10 interpolated from `balance.yardsticks.soldier_turn`). A turn = three 2-AP heals on Bonded allies.

| Who, all in, a turn | Arithmetic (one heal) | L1 | L5 | L10 | L20 | Avg |
| --- | --- | --- | --- | --- | --- | --- |
| Door: 3 Mends, Bonded | 3.75 × Stat × level × 1.2 = 11.1 / 13.1 / 17.2 / 24.4 | 181 | 163 | 151 | 122 | **154** |
| Door: 3 Mends, not Bonded | ÷ 1.2 | 151 | 136 | 125 | 101 | 128 |
| Mender: 3 Triages on 3 Bonded | 4.3 × … = 12.8 / 15.0 / 19.7 / 28.0 | 207 | 187 | 173 | 139 | **177** |
| Heartbinder (target) | base 5.0 equivalent | 241 | 217 | 201 | 162 | 205 |
| Normal share, door | ÷ 1.25 (L1, L5) | 145 | 130 | | | |

Every row falls over the levels as rules 1.27's healer does (234 → 158): the Soldier-turn grows ×3.25, the heal ×2.2. Inside the per-level ±25%. **Rally** on 3 Bonded allies at L1: 3 × 3.5 × 2.478 × 1.2 = 31.2 HP = 169%, against the budget rule's ultimate tier for 2 AP on 3 targets: (2/6) × 2.5 × (1 + 0.5 × 2) = **167%**. **MP:** a Mender's turn of 3 Triages is 18 MP (Mends 24): a 5-round fight is about 90 to 120 of a 250 to 400 pool.

**A feeling given** against the control yardstick: a 3-AP attack is about half a rifle-turn; ×1.2 on it is +0.10, +2 to hit on a 55% shot is +0.06 of it: **about 0.16 rifle-turns**, one AP's worth (0.167). Awe: Nausea (0.17 of a turn) × a 60% hit = 0.10 + 0.06. Dread: Suppressed 0.17 × hit × save. So Inspire is priced as 1 AP plus a session supply (+5%) and a known-feelings gate: in band.

**The hunt** (Leon: "let them have it"): a dedicated healer may keep a tank up; Traced (rule 14) keeps the healer findable at any range, and an Elite or Boss (`healer_focus` 1) hunts it. **The AI sees a tie only by its use** (Traced) and **cuts it only by Downing the Bonder** (rule 8).

**Measure when built:** add rows `tending_door`, `tending_mender` to `test/balance/refit-measure.ts measure` (builds in `builds.ts`: a door healer with Empathy all in and an Emanator; the Mender); a policy in `policies.ts` (Bond the front two, then Triage / Mend the most hurt Bonded, Inspire when 1 AP is left); `REFIT_MEASURE=1 REFIT_SYSTEMS=tending_door,tending_mender …` at levels 1, 5, 10, 20; fit `tend.k`; then the pair of rules 1.23 section 4 (tank + Mender under two and three Soldiers) to see the hunt find a Traced healer.

## 8. The other side

**Enemies do not Bond or Tend in this patch** (enemy healers keep `heal_enemy`). Tiers: none. **The AI learns:** (1) Traced counts as seen in `healerMark`, so Elites and Bosses hunt a healer working through a Bond from behind a wall, and Soldiers lean (0.5); (2) Taunt still comes first, so a Mender who sees who aims at its ally (rule 5) can answer with an ally's Taunt; (3) nothing new about Share a Hit or Take the Weight: they act on the AI's damage after it chose. The fire doctrine (rules 1.25) is unchanged: Spread spreads, Focus focuses, the healer weight is the Traced healer's.

## 9. The screen

- **The meter, one place:** the **Bond strip** under the Mender's portrait in the left panel: one chip per Bond held (ally portrait, HP bar, condition glyphs, a red crosshair with the count of enemies aiming at them), empty chips up to the cap. Insight's ink `#EB95B7`. Nowhere else shows Bonds, except "Bonded to Ha" on the ally's portrait.
- **Action tab "Tend"**, groups: *Bond* (Bond, let go), *Heal* (Mend, Touch, Shield, Raise), *Help* (Settle, Lift, Guide), *Class* (Triage, Inspire, Rally). A Bonded ally in sight is a valid target at any range, drawn with a thin line from you on hover.
- **Hover cards:** the item `text`; the preview line from `previewDescriptor` ("Heal Kade about 13 (×1.2 through the Bond). 6 MP. You will be Traced.").
- **It works:** a soft line of light from you to the ally, the heal number in success green `#6FEA77`. **It fails:** the reason from the engine ("Not in sight: a Bond carries Tending only where you can see.", "Needs 8 MP (5).", "Needs an Emanator in hand.").
- **Inspire:** a picker of felt feelings (the 25 icons, unfelt greyed), the given line under each.
- **Art (for `art/briefs/ART-REQUESTS.md`, to list, not edit here):** a Bond chip frame and the tie line (SVG, Claude can draw); Tend tab icons for Bond, Mend, Touch, Shield, Raise, Settle, Lift, Guide, Share a Hit, Take the Weight, Brimming (Wick flat ink, artist); the Mender emblem if the name is kept; a Traced glyph (line icon).

## 10. Data

`data/tending.json` (new, kind `tending`): `bond` numbers and `items` (kind `verb`). Costs in each `grant_action` (`ap`, `res`).

```json
{ "id": "tend.mend", "name": "Mend", "door": "empathy", "requires": [{"skill": "empathy", "min": 1}],
  "amounts": { "heal": { "kind": "heal", "base": 3.75, "profile": "tend", "heal_kind": "tending", "provisional": true } },
  "effects": [ { "op": "grant_action", "action": "tend_mend", "ap": 2, "res": {"mp": 8}, "uses": "at_will",
      "reach": { "tiles": 3, "sight": true, "tied": "bond", "side": "ally", "self": false },
      "effects": [ { "op": "mend", "amount": "heal", "target": "ally" } ] } ],
  "text": "{=effects.0.ap} AP and {=effects.0.res.mp} MP. An ally within {=effects.0.reach.tiles} tiles you can see, or a Bonded ally anywhere you can see, heals {=amounts.heal.base} times your Healing given, more as you level.",
  "adjudication": "engine", "provisional": true }
```

```json
{ "id": "take_the_weight", "name": "Take the Weight", "ap_cost": 0, "uses": "reaction",
  "amounts": { "weight": { "kind": "damage", "base": 0, "per": [{"of": "max_hp", "value": 0.15}], "type": "true", "provisional": true } },
  "effects": [
    { "op": "floor", "value": 1, "when": "would_drop", "if": {"target": "ally", "target_tied": "bond", "open": true, "self_hp_above": 0.25, "self_alive": true},
      "limit": {"reaction": true}, "and": [ { "op": "deal", "amount": "weight", "target": "self" } ],
      "say": "{self} takes the weight: {target} stays standing at {=.value} HP." },
    { "op": "cancel", "when": "cond_incoming", "if": {"target": "ally", "target_tied": "bond", "cond_family": ["body", "heart"], "flag": "take_conditions"},
      "limit": {"reaction": true}, "and": [ { "op": "condition", "condition": "incoming", "target": "self", "skip_save": true } ],
      "say": "{self} takes it from {target}." } ],
  "toggles": [ { "id": "take_conditions", "label": "Take conditions too", "default": false } ],
  "text": "Your reaction. When a Bonded ally would go Down, they stay at {=effects.0.value} HP and you lose {=amounts.weight.per.0.value|pct}% of your max HP (only while you are above {=effects.0.if.self_hp_above|pct}%). With the toggle on, you may instead take a Body or Heart condition meant for them.",
  "adjudication": "engine", "provisional": true, "origin": "bard", "origin_rank": "II", "attributes": ["insight"], "status": "active" }
```

A given feeling (a condition row; the boon from `feelings.json` `given`): `{"id": "given_cruelty", "boon": true, "duration": {"rounds": 1}, "effects": [{"op": "attack_mod", "context": "next_attack", "value": 2}, {"op": "condition", "condition": "bleeding", "skip_save": true, "target": "target", "when": "hit", "if": {"hostile": true}, "and": [{"op": "cleanse", "condition": "given_cruelty", "target": "self"}]}], "text": "+{=effects.0.value} on your next attack; it starts Bleeding.", "adjudication": "engine", "provisional": true}`.

**Validator rules to add (`tools/validate.py`):** every `tending.json` item has `requires` on Empathy and a `grant_action` with `ap`, `res`, `reach`; a `reach.tied` and a `target_tied` name a tie kind listed in `tending.json bond.kinds`; every feeling has a `given` block and a `given_<id>` row in `conditions.json`; Inspire's choice ids exist; `amounts` use profile `tend`; `limit.reaction` only on items with `uses: reaction`; `classes.json` bard has no `supplies`.

## 11. Open questions for Leon

1. **Budget lines.** The frame says a door user sits on the normal line and the squared class 30% above it, all under the ceiling: both can't hold. I put the squared class on the ceiling (door all in 154, Mender 177, Heartbinder 200). Recommend that reading for every door.
2. **The felt Down costs 10 MP** (not Strain, not HP). Recommend MP: no cascade.
3. **Take the Weight costs 15% of max HP** and can't Down you. Recommend it.
4. **Guide: the Mender picks the tile**, not the ally (no engine way to hand a mid-turn pick to another player; Warn already works so). Recommend; revisit with co-op prompts.
5. **Inspire's +2 is on the next attack only** (old: any roll); Settle covers saves. Recommend.
6. **Brimming replaces the Outburst Mend** (base 9 on Buff heals): the class uses only its own door's verbs. Recommend.
7. **Rally base 6 → 3.5** with the ×1.2, reaching Bonded allies unseen: on the ultimate line. Recommend.
8. **Empathy's free Pump and swell move to Will Power** (not deleted): re-measure `outburst_steady`. Recommend moving.
9. **Traced** makes tending through a Bond findable and un-Hides you. Recommend: without it a far healer is safe and the hunt fails.
10. **The Mender's free Bond has no range limit** ("with whoever it wants"). Recommend.
11. **Supplies leave; Field Surgery costs 15 MP and needs a field kit.** Recommend.
12. **Relief given ends Bleeding and Burning** (not −1 Strain: Strain is not Insight's). Recommend.
