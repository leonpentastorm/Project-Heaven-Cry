# Bows and quivers (rules 1.53, 14 Nov 2026)

Leon's rulings (14 Nov 2026), in the spec's rules 1.53 verbatim. What this hand-off holds: how bows worked before, what
changed, the measure, and how to add an enchantment. Items 4000 to 4008.

## 1. How bows worked before 1.53 (spec and code)

- **The Drawn property** (spec, "Weapon properties"; `data/techniques.json props.drawn`): "Your arm is the powder. No
  Heat or Recoil; a quiver, not a magazine; it can't be reloaded in a fight." Two Drawn weapons: the recurve bow
  (20 + 5 × Raw Power, 14 tiles, 2 AP a shot, 3 aimed) and the longbow (25 + 6 × Raw Power, 20 tiles, Raw Power 3,
  Arc). Crossbows are not Drawn (they keep their reload).
- **"Nock an arrow"** was the bow's **reload**: `combat.ts weaponActions` labelled the reload of every weapon loaded
  round by round by its calibre (`LOOSE_LABEL.arrow = 'Nock an arrow'`), at the reload's price
  (`actions.json costs.reload.ap` 2). It was **needed never**: the rule that made it dead is rules 1.12, Weapons
  point 10 (spec "Physical techniques"): *"The quiver. A Drawn weapon has a quiver, filled out of a fight from the
  arrows you carry, in any mix of types up to the weapon's capacity. Each shot names its arrow type. A quiver can't be
  refilled in a fight."* (and item 949: "no reload in a fight"). The code: `physical/ranged/quiver.ts` registered a
  `reloadRefuser` that refused every reload of a Drawn weapon ("A quiver is filled before the fight."), so the card
  was shown greyed and could never be taken, by the action, Running Reload, Between Heartbeats or Resupply.
- **What the bow did without it:** everything. A shot drew its arrow from the quiver as part of the shot (the
  `attack_roll` hook took one arrow as the engine counted the round; a technique's `strikeRound.spent` took the extra
  rounds). The internal `nock()` only set which arrow type goes next (the type with the most left), at no AP.
- **Quivers:** not items, no tiers. A quiver was the bow's: `c.phys.quiver[weaponId]` (a count per arrow type), its
  capacity the bow's `magazine` (20 for both bows), filled by the `phys/quiver` action from the ARMS tab. A bow put away
  kept its own quiver (`_quiver.by`). Special Ammo (the Skirmisher's move) loaded a quiver of 12 of one type.
- **Arrow kinds:** the shared ammo types (`rules.json weapons_rules.ammo_types`): standard, armour-piercing (ignores
  armour, ×0.8), hollow-point (×1.3, armour ×2), incendiary (×0.9, Burning), enhanced. Each shot names one (args.ammo).
- **The technique table for Drawn weapons** (spec, ranged techniques): Aimed Shot "Drawn: full draw, +25% damage";
  Load Special "Drawn: not needed (any arrow, every shot)"; Vent "Drawn: not needed"; Dead Centre "Drawn: ignores 5
  armour"; Pin Down "Drawn or Silent: nailed in place until it spends 2 AP"; Last Round "Drawn: the last arrow in the
  quiver counts" (and no free reload, since a bow had none).
- **Enemies with bows:** none in the data's pools; one given a bow (`armQuiver`) had standard arrows at capacity,
  drew one a shot and, run dry, closed to melee (no reload).
- **The balance contract:** the bow has no line of its own; it is a gun under "Best gun, steady" (145 all in, 116
  normal), measured by `test/balance/guns-measure.ts` (Masterwork, four ways, the best). Measured before 1.53: normal
  90 / 96 / 93 / 92 at levels 1 / 5 / 10 / 20, all in 83 / 100 / 99 / 96 (section 3). The longbow is not measured: the
  gun build has no Raw Power 3.

## 2. What changed

| Rule | Built from (the primitive that carries it) |
| --- | --- |
| No Nock an arrow | `LOOSE_LABEL.arrow` gone; a Drawn weapon's reload is its `reloadWay` (below) |
| Two quivers, one worn | `c.quivers: QuiverInst[]` (character.ts; GearState + arrows), the off hand's pattern of an instance outside the pack; `QUIVERS_CARRIED` from `rules.json weapons_rules.quiver.carried` |
| Switch quiver is the reload | `combat.ts reloadWay` (new, general: a weapon whose reload is its own; offered, label, text, why, run) in `reloadPaid` and `weaponActions`; its price is `reloadAp` (the one reload cost rule, 2 AP); free where `reload(..., {free})` is |
| A quiver never refilled in a fight | unchanged: the quiver menu (`phys/quiver`) is refused in a fight |
| Grade gives arrows only | `items.json quiver.arrows` by rarity, read by `quiverHolds`; `setGrade`/`gearAt` take `quiver:0`/`quiver:1`; no accuracy term anywhere |
| One enchantment a quiver | an items.json mod with `mod_slot: "enchantment"` (the mod pattern), fitted by `fitQuiverMod`; on the hit `magic.ts applyToneRiders` (the tone's riders at a stage, as Storm Hand's Infusion), the damage price a `damage_out` term, Storm's `ignore_cover` the `attack_preview` `ignoreCover` |
| The element's hit effect | the shot event carries `element` (`attack_roll` ctx `fx`, merged into the `shot` event); the client's `elementImpact` |
| Old saves | read-time: `quiversOf` reads the old `c.phys.quiver[c.weapon]` (or `c.loaded`) as one Standard quiver; nothing migrated |
| Survival | `run/upgrade` lists `quiver:N`; the Relic step of a quiver has no named property; the counter's `quiver` line for an archer; `lastingFor`/the Forge's stock add enchantments for a party with quivers; `weaponOffer` adds a quiver to an archer's own offer |

**Needs a new primitive:** one, general: `reloadWay` (a weapon's own reload, the seam a crossbow's latch or a
launcher's tube could use too). `rc.fx` on `attack_roll` is a field on an existing hook (extra fields for the shot's
event).

Files: `packages/engine/src/character.ts` (QuiverInst, quiversOf, setQuivers, carry/stow/swap/fit, quiverCards),
`physical/ranged/quiver.ts` (rewritten), `combat.ts` (reloadWay, the fx merge, the Unit fields), `physical/core.ts`
(emptyQuiverWhy), `game.ts` (the actions; a refit keeps the worn quiver's count), `classes/i.ts` (Special Ammo loads
the worn quiver), `run/progress.ts`, `run/rewards.ts`, `run/shop.ts`, `containers.ts`; the client's
`screens/armsTab.js`, `game/quiverView.ts`, `game/resources.ts`, `game/commands.ts`, `game/fx/play.ts`, the template.

## 3. The measure (guns measure, Masterwork, 12 fights a cell)

`GUNS_MEASURE=1 GUNS_MEASURE_LEVELS=1,5,10,20 GUNS_MEASURE_WEAPONS=recurve_bow,longbow,hellraiser_service_rifle`.
Each cell: the best of the four ways (the bow's line) · (plain shots only).

| Recurve bow | L1 | L5 | L10 | L20 |
| --- | --- | --- | --- | --- |
| Normal, before | **90%** · (69%) | **96%** · (69%) | **93%** · (72%) | **92%** · (72%) |
| Normal, after | **90%** · (81%) | **96%** · (79%) | **93%** · (87%) | **92%** · (83%) |
| All in, before | **83%** · (83%) | **100%** · (84%) | **99%** · (80%) | **96%** · (67%) |
| All in, after | **96%** · (95%) | **100%** · (95%) | **99%** · (90%) | **96%** · (76%) |

- **Removing the nock freed no AP:** it could never be taken. The golden tables prove it: the five cost tables moved
  55 lines, every one a bow's, and only in the arrow counts (`ammo20>19` became `ammo40>39`, `quiver.standard`
  likewise) plus three refusal texts of `pad/bow/reload*`; no AP, no damage, no other state; no damage table moved; the
  replays and the oracles did not move.
- **The +20 arrows moved one thing:** the plain-shots-only way, which fires 2.5 shots a turn and ran a 20-arrow quiver
  dry in turn 8 of the range's 8; with 40 it never runs dry (plain rose 9 to 15 points). The bow's best way (Aimed
  Shots, 2 a turn, 16 arrows) did not move, except all in at level 1 where plain shots were already the best way (83 to
  96). Every cell stays under the gun ceiling (145 all in, 116 normal) and the bow stays where it was against it. **No
  dial was moved; this is the intended effect of Leon's +20, not a refit.**
- The enchantments are not on the range (its target never acts, so Slowed, Prone and a push are worth nothing there).
  Priced as a special round is: ×0.9 for the rider (the incendiary round's own price), 400 credits. The contract does
  not hold special rounds and mods yet (its section 7).

## 4. How to add an enchantment

1. Spec: a line in rules 1.53 item 6 and an item.
2. Data: one row in `data/items.json`, a copy of `ench_fire`: `category: "mod"`, `mod_slot: "enchantment"`, `tone` (a
   `soul_modules.json tones` id: its riders are what the arrow carries), `stage` (which stage's riders; riders that
   change the tone's own damage, `armour_full`, `bonus_damage`, `chain`, are skipped; `ignore_cover` is read before
   the roll), `damage_mult`, `price_credits`, a text with `{=stage}` and `{=damage_mult}`.
3. Nothing in code: the Forge stocks it, `fitQuiverMod` fits it, the hit runs the tone's riders, the screens read
   `quiverCards` and colour it by the tone (`game/heartView.ts TONE_INK`, `game/quiverView.ts TONE_GLYPH`).
4. `python3 tools/validate.py data`; `npx vitest run --root packages/engine test/phys-ranged-quivers2.test.ts` (the
   loop over every enchantment).

## 5. Proof

Engine: `test/phys-ranged-quivers2.test.ts` (data +20 per tier, the six enchantments, carry/stow/fit/grade/swap out of
a fight, the shot with no nock, Switch quiver at a reload's price, the one-quiver case, the empty-quiver refusal, both
quivers written back, no accuracy from a quiver's grade, each enchantment rides only its own quiver's arrows, an enemy
archer), `test/phys-ranged-quiver.test.ts` (the old cases on the new model), `test/survival-quivers.test.ts`,
`test/old-save.test.ts` with the new fixture `save-pre-quivers-archer-mid-fight.json` (written by the engine at
92f51dbb; its script beside it). Golden: the cost tables re-recorded on purpose (section 3).

## 6. Calls for Leon

The checklist's calls B1 to B7 (`docs/PLAYTEST-CHECKLIST.md` section B): the grade ladder above Standard's 40 (50 / 60 /
70 / 80), Switch quiver at a reload's 2 AP and Last Round's free reload, quivers the character's not the bow's, the six
stages and the 400-credit ×0.9 price, a quiver's 120 credits, Survival's offers.

## 7. Not done

- The shop's and the Forge's gear preview cards show a quiver and an enchantment by their data text (no arrows-held
  compare line of their own yet).
- No browser suite was written for Switch quiver and an enchanted hit (section 8 of the final report says what ran).
- The quiver and the six enchantments have no icon (ART-REQUESTS).
