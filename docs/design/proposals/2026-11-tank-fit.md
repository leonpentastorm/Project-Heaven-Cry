# The Durability tank: measure and fit (0.28.3, lane T)

Leon, co-op Survival on live 0.28.2: "durability tank is crazy weak, maybe we test at level 1 with no shiel item because
survival do not give you one, but the tank can't hit shit due to all skill point being in durability and his shield
points block NOTTHING", and "they [the Bond healer] carry the weak as shit tank in my run".

Spec: rules 1.55, items 0.28.3-T.1 to T.5 (the integrator renumbers). Every number PROVISIONAL.

**The lead's rulings (15 Nov 2026), built:** T.3 is the new general op `roll_with` (not the stacking `roll_mod`
fallback); Guard's pool `max` 5 → 4; the replay coverage bar back at 2; G3 not built. Section 3b holds the
re-measure. **16 Nov 2026:** the solo tank clearing stage 1 on 16 of 16 seeds is accepted for this release (section 5
item 1, a call made for Leon).

## How it was measured

`packages/engine/test/balance/tank-measure.ts` plays Survival's stage 1 through the reducer exactly as the run simulator
does (`survival-run.ts simRun`: the camp's Recommended loadout, the starting boon, generated fights, the simulator's
policies through `Rec.fight`, the gear route, stage cap 1) and reads, during the real reducer's actions only, each
character's attacks and hits, damage it dealt, the hits aimed at it with what Guard took off them and what reached it,
and the AP it spent on Guard. Run it:

```
TANK_MEASURE=1 TANK_SEEDS=16 npx vitest run --config vitest.balance.config.ts test/balance/tank-measure.test.ts --silent=false
```

`TANK_BEFORE=1` replays live 0.28.2's Guard (soak 10, the Guard technique a melee Link, no to-hit door);
`TANK_NOHIT=1` is the fit without T.3; `TANK_GUARD='{"soak":5}'` lays a trial of `rules.guard` over the data.

The characters: **Living Wall** (archetypes.json `living_wall`, the All-in tank: Durability 7, Pain Threshold 3, built
legally by builds.ts) and **Holdfast** (`bulwark`, Durability 3, the dabbler), each played by the simulator's `tank`
policy (attack while 1 AP stays for Guard, then Guard: Raise Shield, the Guard technique, else Brace) or by the gunner's
policy on the same sheet (`noguard`, the control). Partners: the reference gunner and the Soul healer of
`survival-run.ts`. 16 seeds a party, the same seeds before and after.

## 1. What Guard was on live 0.28.2

(a) **Guard, exactly** (`techniques.json rules.guard`; code `physical/guard.ts`, `physical/core.ts` 97-114):

| piece | rule | where |
| --- | --- | --- |
| pool | Durability points, at most `max` 5; a fight starts at 0; no decay; lost when the fight ends | `character.ts` guardPool (1486) |
| Brace | 1 AP, a flat `brace_gain` 2 (3 with a shield); **once until you move** ("Already braced") | `combat.ts` brace (2133), `guard.ts` braceHook |
| Guard technique | 1 AP, once a turn: `gain_base` 1 + `gain_per_point` 1 a Durability point above 1, + `shield_gain` 1 with a shield; +2 Defense against melee | `physical/melee/links.ts` 127 |
| who has the technique | **a melee Link**: only with a melee weapon in the hand, and only if readied | `core.ts` gate ("Needs a melee weapon in that hand") |
| soak | each point takes `soak` 10 × level scale off a hit, after armour and the HP shield; as many points as the hit needs, **the last kept back** (`keep_back` 1) unless the hit would take you down; any hit (melee or not), not a condition's tick or self-harm | `guard.ts` damage_in listener, `core.ts` guardSoak |
| Pressure | comes off Guard first, 1 Guard a point (`pressure_per_point`) | `links.ts` 181 |
| Interpose | Durability 3: 1 Guard and the reaction, an ally next to you is hit, you take it | `guard.ts` |
| the Bulwark (level 3) | its class Brace: 1 + Durability's modifier Guard, +2 Defense | `classes/i.ts` 370 |

So a level 1 tank with the camp's rifle (Raw Power 0 is not above Dexterity 0: `survival.json recommended`) had **one
source of Guard: Brace, once until it moved**: 2 points a fight, and every ranged hit's Pressure ate a point. It spent
1.2 AP a fight on Guard and Guard took **13% alone, 9% beside a gunner**.

(b) **Hit chance.** The rifle hits with Dexterity (`weapons.json phys.hits_with`); the all-in tank has 0 points:
modifier −2. Measured: **39% to hit**, against the gunner's 63% on the same foes. A melee all-in (Wrecking Ball, Raw
Power 7) takes a heavy blade at +6. The tank had nothing to roll with.

(d) **How enemies choose** (`combat.ts` enemyRank, 2775): the Taunter first, standing before Downed, the tier's doctrine,
the most hurt (the healer counts as more hurt by the tier's `healer_focus`), the likeliest hit. Nothing reads Guard; the
Guard technique's +2 Defense against melee makes a tank a *worse* melee target. What exists: the Taunted condition
(Draw Fire, the Bulwark's rank I move: "its next attack must be aimed at you", −2 to hit anyone else), Interpose
(Durability 3), Anchor (Bulwark rank III).

(e) **Shields** (`items.json`, phys props `shield`: riot shield, buckler, pavise): +1 Guard on each Guard technique and
each Brace (a pavise is carried, not held up: no Guard), and the shield techniques (Shield Bash, Raise Shield, Shield
Wall). Survival's camp gives none (the camp shield is another lane's).

## 2. The fit

| # | change | field | old → new |
| --- | --- | --- | --- |
| T.1 | the Guard technique is Durability's own: on the pad and usable with **any** weapon from Durability 1; still learned for a melee weapon by anyone without the points | `techniques.json guard.innate` | (none) → `{skill: durability, min: 1}` |
| T.2 | Guard soaks 6 a point | `techniques.json rules.guard.soak` | 10 → 6 |
| T.3 | while you hold Guard, weapon attacks roll with Durability's modifier in place of the weapon skill's when it is higher, never on top (Living Wall: −2 → +6) | `skills.json durability.unlocks.1` (new, `item`) | op `roll_with` {skill durability, if_higher} on `attack`, `if self_has_res [guard]` (first built as a stacking `roll_mod`, +1 a point above 3, at most +4: replaced by the lead's ruling) |
| T.4 | Guard's pool holds 4 at most | `techniques.json rules.guard.max` (and `skills.json durability.per_point.numbers.pool_max`) | 5 → 4 |
| T.5 | the op `roll_with` (general: any item may carry it) | `effect_ops.json`, `effects/triggers.ts`, `combat.ts rollWithPick` | new core item op |

T.1 is general code, not a new primitive: `innate` (a skill gives the technique, as Interpose) now also serves a pressed
technique: `physical/data.ts given` (only an innate **Answer** is never learned), `physical/core.ts usable` (an innate
technique without the points falls through to the weapon's rules) and `techniquePad` (a door's pressed technique is
drawn after the weapon's own groups), the validator's innate rule (Answer or Link), `game.ts` sandbox learn-all reads
`given`.

## 3. Before and after (stage 1, level 1, 16 seeds a party)

| party · who | to hit | dealt / fight | aimed at it / fight | Guard took (share) | reached it / fight | Guard AP / fight | stage 1 cleared |
| --- | --- | --- | --- | --- | --- | --- | --- |
| solo Living Wall, before | 39% | 210 | 7.0 | 7.9 (13%) | 53 | 1.2 | 5/16 |
| solo Living Wall, never Guards (control) | 38% | 201 | 6.6 | 0 | 56 | 0 | 5/16 |
| solo Living Wall, **after** | **50%** | 250 | 5.5 | 22.9 (**70%**) | 10 | 3.7 | **16/16** |
| Wall + gunner · Wall, before | 40% | 123 | 5.1 | 5.9 (9%) | 62 | 1.2 | 2/16 |
| Wall + gunner · Wall, **after** | **49%** | 176 | 5.3 | 24.8 (**45%**) | 31 | 3.1 | **8/16** |
| Wall + gunner · gunner, before / after | 62% / 63% | 271 / 267 | | | 46 / 34 | | |
| Wall + healer · Wall, before / after | 39% / 49% | 212 / 276 | 8.1 / 9.8 | 6% / 37% | 100 / 75 | | 5/16 → 11/16 |
| Wall + healer · healer took, before / after | | | | | 93 / 70 | | |
| solo Holdfast (Durability 3), before / after | 38% / 37% | 195 / 234 | | 13% / **54%** | 55 / 28 | 1.1 / 5.8 | 2/16 → 8/16 |
| Holdfast + gunner · Holdfast, before / after | 39% / 40% | 116 / 143 | | 9% / **28%** | 61 / 45 | 1.2 / 3.3 | 3/16 → 6/16 |
| references (unchanged): solo gunner 11/16; gunner + healer 8/16; two gunners 6/16 | | | | | | | |

The fit without T.3 (`TANK_NOHIT`): Guard takes 70% alone and 43% beside a gunner; to hit stays 38-41%; solo 12/16.

Trials of Guard's numbers (12 seeds, Wall alone / beside a gunner; Holdfast alone / beside a gunner): soak 10: 81% /
52%, 60% / 39%; soak 7: 72% / 45%; soak 6: 69% / 44%, 38% / 24% (with `gain_base` 0); soak 5: 65% / 39%, 47% / 25%;
soak 6 and `max` 4: 58% / 36%; soak 8 and `max` 3: 48% / 32%.

## 3b. After the lead's rulings: roll_with and the pool at 4 (16 seeds a party, same seeds)

| party · who | to hit | Guard took (share) | reached it / fight | Guard AP / fight | stage 1 cleared |
| --- | --- | --- | --- | --- | --- |
| solo Living Wall | **59%** | 17.0 (**58%**) | 12.3 | 3.4 | **16/16** |
| Wall + gunner · Wall | 56% | 18.7 (**35%**) | 35.1 | 3.0 | **9/16** |
| Wall + gunner · gunner | 63% | | 32.4 | | |
| Wall + healer · Wall | 55% | 31.1 (31%) | 70.3 | 4.0 | 5/16 |
| solo Holdfast (Durability 3) | 48% | 20.6 (49%) | 21.4 | 4.1 | 13/16 |
| Holdfast + gunner · Holdfast | 49% | 12.6 (**24%**) | 39.7 | 2.6 | 5/16 |
| references (unchanged): solo gunner 11/16; gunner + healer 8/16; two gunners 6/16 | | | | | |

The trial of the second lever, `soak` 5 with `max` 4 (`TANK_GUARD='{"soak":5}'`): solo Wall 60% to hit, 54% absorbed,
**16/16**; Wall + gunner 28%, 5/16; Wall + healer 30%, 8/16; solo Holdfast 43%, 10/16; Holdfast + gunner 23%, 5/16.

**What was chosen: `max` 4, `soak` 6.** Neither lever brings a solo tank into 9 to 13 of 16: it clears 16 of 16 with
either, because what carries it now is the hit, not the Guard (`roll_with` rolls Durability 7 at +6 where the stacking
fallback gave −2 + 4 = +2: 59% to hit, against the gunner's 63%, and it still takes about half of what is aimed at it).
`soak` 5 cuts co-op (Wall + gunner 9/16 → 5/16, Guard 35% → 28%) and leaves solo where it is, so it was not taken.
As ruled, the levers were not chased further: the solo figure is for the lead (the next levers would be the hit
itself, a cap below Durability's full modifier, or G3's pressure on the tank). Wall + healer fell from 11/16 (the
first fit) to 5/16: the healer's pair now loses more to the pool's smaller cap; 8/16 with `soak` 5, so it is noisy
at 16 seeds.

## 4. Against the lead's targets

- **G1, Guard must block.** Met beside a partner (45%, in the 40-50 band; the control shows the same character not
  Guarding takes the hits whole); alone it takes 70% (more hits a round land on it, and it refills every turn). The
  dabbler takes 28% beside a gunner (target about 20) and 54% alone. Guard costs 1 AP a turn (the technique), not 2. A
  smaller pool (`max` 4) is the lever that cuts the solo figure most and the co-op one least, if the lead wants solo
  nearer 50.
- **G2, the tank can hit.** 39% → 49-50% (the gunner: 63%); damage per hit unchanged. Fallback form (see below).
- **G3, enemies must care.** Not built: no data row can do it (below). Interpose already moves an attack on an adjacent
  ally onto a tank holding Guard (Durability 3), and with Guard every turn it fires more.
- **G4.** No enemy number, HP formula, other door or alpha perk touched. Side effect to rule on: the Guard technique is
  now given at Durability 1, so a melee character with Durability gets it without readying it (a ready slot freed);
  one without Durability keeps learning it as before.

## 5. For the lead's ruling

1. **Solo strength.** A solo all-in tank now clears stage 1 on 16 of 16 seeds (the solo gunner: 11). Leave it (a tank
   alone is slow but safe), or `max` 5 → 4 (solo 58%, co-op 36%), or soak 6 → 5.
   **Ruled by the lead (16 Nov 2026), a call made for Leon, to reverse if he wants:** accepted for 0.28.3 as it is (with
   `max` 4, `soak` 6). The solo tank wins slowly; its number fit comes with Balance 2.0.
2. **The dabbler** sits above the 20% target (28% beside a gunner). `gain_base` 1 → 0 brings it to 24% and leaves the
   all-in tank unchanged, but the Guard technique's text and skills.json `durability.per_point.numbers.guard_base`
   (a second copy of `rules.guard.gain_base`) carry the 1 as typed numbers: both texts would change with it.
3. **The exact door rule** (G2 as written): **built** as the op `roll_with` (ruled; replaces the stacking fallback).
4. **The card.** The gear card keeps "Hits with: Dexterity · −2" and adds "Hits with: Durability (holding Guard) · +6"
   when an item's `roll_with` would roll with a higher skill; the attack's preview names the skill term "Hits with:
   Durability (holding Guard)" in place of "skill" while Guard is held.
5. The replay coverage bar for units that went to ground is back at 2 (ruled). Re-recorded, the default set's
   `proving-doors-hiding-watches` had one: its blade (c1) went to ground on its second turn and was never found
   again before the fight ended (the squad's tank hits harder, the fight is shorter). Under the leave to add actions
   and never remove one, the scripted plain gun (c3) now also goes to ground from its third turn
   (`test/helpers/replay.ts`); the set has 3.

## Needs a new primitive

- ~~**The attack's skill replaced**~~ **approved and built** (the lead, 15 Nov 2026): op `roll_with` {skill (an id or a
  list: the best), if_higher} on `attack`. The op files an offer on the attack's preview; `combat.ts rollWithPick` is
  the one choice (the skill term becomes `att.attack` − the weapon skill's `mod` + the offered skill's `mod`), read by
  `previewAttack` (so the roll, which reads the preview's to-hit, and the attack's preview) and by
  `gearpreview.ts skillLines` (the card). A unit with no character behind it (an enemy) is never changed.
- **G3, a foe next to a Guarding tank who attacks someone else is worse off:** either a `condition` op field `within`
  (put the condition on every foe within N tiles of the holder: the Guard technique's acted effects would put the
  existing Taunted, or a lighter "Held" condition, on adjacent foes), or a predicate `target_is_source` on a condition
  row's effects (a "Held" condition given by the tank reads "the attack's target is not the one who gave me this" and
  takes −2 to hit, with the existing `roll_mod`). The first is the cheaper and is general (an aura of any condition).
