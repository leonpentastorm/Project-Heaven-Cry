# Pressure 2.0: the Skirmisher decides where the enemy stands (proposal, full size)

## Build status (15 Nov 2026, lane/0.29-pressure-2, pushed as wip/lane-0.29-pressure-2)

Built tonight from the consolidated plan's brief B (`three-doors-build-plan.md`), on existing primitives only; spec
rules 1.56 "Pressure 2.0 (the Skirmisher)", items 4440 to 4452. Nothing marked P8 to P18 below was built.

| # | Item | Built | Where | Built from (exact names) |
|---|---|---|---|---|
| 1 | States named | yes | `techniques.json rules.pressure.states` (word, says, text, text_pc); `physView` reads them (the typed cost strings are gone) | data rows; `physView` (`physical/core.ts`); fx event `pressure` |
| 2 | Tracers and dust | yes | `apps/web/src/game/fx/pressure.ts` | fx events `pressure` (`by`, `now`, `was`, `state`) |
| 3 | They duck | yes | token pose from physView's `state` (`techView.ts pressureLook` `pose`, `shared.js tokenVals` `opt.pose`); a state tag under the pips | physView |
| 4 | The card says it | yes (existing `pv.pressure`); the ranged block's `meterHint` is the door line | `techView.ts` | physView `hint` |
| 5 | Fire lanes | yes (drawn when set: Deny's dashed line and boxed tiles, Cover Me's arc, Dead to Rights' line and ring, Overwatch's field; the lane flashes on `watch_fire`) | fx/pressure.ts | fx `watch_set` (`tiles`, `allyId`, `targetId`), `watch_fire` |
| 6 | Shaken Nerves | yes, capped +2 | `skills.json dexterity.unlocks.1` effects.1 | trigger `save`, op `roll_mod` (`roll: tn`), number block `target:pressure` `max`, predicates `actor`, `target`, `self_skill` |
| 7 | Flush Out | yes | effects.2 | trigger `acted` (`action: [flush]`), op `condition` (`fear`, `via: dexterity`, `rounds`), `self_skill` |
| 8 | Break Them | yes | `classes.json marksman gain break_them` | trigger `cost` (Rout is flat: priced at `technique:rout`, `mode` reads ctx.tech), op `cost_mod` (`min`), `own_turn` |
| 13 | Fire and Move | yes | `marksman gain fire_and_move` | `mark` on `attack_roll` (`melee: false`), `cost_mod` `set` on `cost` (`action: [move]`, `flag`, `ap_above`, `path_tiles_at_most`), `limit` (`key: step`), `condition slipping` |
| 14 | Relocated | yes | `marksman gain relocated` | `mark` on `moved` (`how`), `roll_mod` on `to_hit`, `resource pressure` on `hit`, `mark clear` on `miss`/`turn_end` |
| 15 | Slide | yes (no refusal: P16) | `data/pressure.json pressure.slide` (a door verb, `requires dexterity 1`) | `grant_action` (`uses: per_turn`), `condition slipping`, `displace {to: cover, tiles}`, `resource pressure -1` |
| 16 | Near Miss | yes, **changed**: a shot off your own turn (a held shot) only | effects.0 | trigger `miss`, `resource`, `own_turn: false`, `limit {each: target}` |
| 17, 18 | Run and Gun kept; the door ladder | yes | | `self_skill` |
| 9-12, 19-21 | Hug cover, Breaking, Open, Pin the Suppressed, the fork, Broken Line, Pins | **no** (P10, P9, P8, P1, P2) | | |

**Changes from the brief, with the reason.** Near Miss on every ranged miss lifted the all-in gun ceiling (the plain
gun build is a Skirmisher) from 165/158/163/148 to 165/161/166/154 (% of the rifle at levels 1/5/10/20; the balance
contract's band is 145 ± 12) and failed the contract. Scoped to held shots (`own_turn: false`) it measures exactly the
base line again, and it is what the lead's "Hold" asked for: a held lane pins even when the round goes wide. Slide is a
door verb in its own data file (`data/pressure.json`, registered beside shadow/tending/figments in `collect.ts`
`DATA_VERBS` and in `datatext.ts`): a grant_action inside a skill unlock would also run that unlock's other rows (the
grant's target inference reads them), so the door's passives stay on Dexterity's unlock 1 and the action is a verb.

**Events with no effect of their own** (nothing invented in the engine): Relocated's term has no fx event (it is a
to-hit term in the roll's log line and the preview); Break Them is a price; Shaken Nerves is a TN term (the save's log
line shows it). Slide is drawn from the engine's `cond slipping` then `shove` (a willing step) pair, Fire and Move from
`cond slipping` then `move`.

**Measured** (15 Nov, this worktree, before = 31e49beb's data, after = this lane):

| Measure | Before | After |
|---|---|---|
| All-in gun ceiling, % of the plain rifle at L1 / L5 / L10 / L20 (`REFIT_SYSTEMS=gun`, allin; the plain and optimised gun builds are Skirmishers) | 165 / 158 / 163 / 148 | 165 / 158 / 163 / 148 |
| Same, with the brief's Near Miss on every ranged miss (rejected) | | 165 / 161 / 166 / 154 (balance contract failed: 168 vs 145 ± 12) |
| Survival `solo_gunner:gear`, 6 seeds, stages cleared | 0, 3, 0, 1, 0, 1 (mean 0.83) | 0, 1, 0, 1, 0, 1 (mean 0.5; one seed's dice stream moved) |
| Survival `duo_gunner:gear`, 6 seeds, stages cleared | 0, 0, 0, 0, 1, 0 | 0, 0, 0, 0, 1, 0 |

At level 1 (no class yet) only the door acts; the gain starts at level 3. The control column (enemy AP lost, attacks
refused, foes broken) waits for P10 (the AI reading the states): today Pressure's effect on the AI is the AP loss and
Afraid only.

**Onboarding.** Slide is listed for every character with Dexterity (the Perks tab: a door verb with no `tab` in its
file goes there; greyed with the engine's refusal once used this turn). The ranged weapon block's line (`meterHint`) and
one `TIPS` row `pressure` ("SHOOT TO PIN", the first time a character of mine with Dexterity and a ranged weapon has the
turn) read `skills.json dexterity.door_line`.

15 Nov 2026, first draft. Status: **design, nothing built**. Every number below is PROVISIONAL and a data field
(`data/techniques.json rules.pressure` for the meter, `data/classes.json` `marksman` for the class, `data/skills.json`
`dexterity` for the door; named where different). If accepted, the spec (rules 1.12, Physical 2.0) changes first, as a
new revision, with its numbers as spec items 2250 to 2299. Every item is `adjudication: engine`. Sister drafts:
`2026-11-bonds-2.0.md` (origin/wip/design-bonds-2) and `2026-11-figments-2.0.md`; this one reuses their P1, P2 and P8
and adds as few pieces as it can (two). Built against origin/wip/feature-0.29 (31e49beb), read only.

Leon, 15 Nov 2026, verbatim: "All players need to feel like they do something only they do best, all player need to
feel satisfy fighting." and, of the newer doors, "feels like mf just standing their doing notthing".

## 0. Diagnosis (three lines)

1. Pressure is a real meter (0 to 4, Pressed / Suppressed / Broken, decay, cover flanking, kill spill, 30 techniques),
   but the enemy only loses AP: no foe hugs cover, cowers, runs or gives up because of it, so the meter is a number.
2. The player cannot see it work: Pressed has no word, no tracers or dust, no duck, held shots are a ring on a tile.
3. Nothing is the Skirmisher's own: Pressure belongs to every gunner, nothing pays for moving before rank III (Run and
   Gun), and standing still costs nothing, so the "quick feet" class plays like a turret.

**What only the Skirmisher does best, as a player would say it:** *"I pin them where I want them and I never stand
still: even my misses keep their heads down."*

## 1. What exists today (checked in code; the brief's map was right, with these corrections)

| Piece | Where | Note |
|---|---|---|
| The meter, caps, states, decay, flank, Silent hidden pips | `physical/pressure.ts`, `physical/rules.ts` | standing rules in code; numbers in `rules.pressure` |
| The resource row `pressure` | `data/actions.json resources` | the item op `resource` gives and takes Pressure through the meter (`setResSetter`), so **data can add or spend Pressure today** (Run and Gun does) |
| The number source `target:pressure` | `effects/triggers.ts sourceOf` | a number block may read the target's pips (`steps`, `per`): the alpha-perks draft's Pressure Point rides it |
| Conditions the AI already obeys | `combat.ts` 1225, 1722, 1756, `enemyCloseTile` | `fear` (won't close on or attack the giver), `pinned` (won't move), `exposed`, `marked`, `slowed`; an Afraid foe visibly backs off |
| `displace {to: "cover"}` | item op | a willing step to the nearest free tile by cover (Shadow's Fade) |
| The save hook | `rolls.ts` 147, trigger `save` | actor = whoever forced the save, so `roll_mod {roll: "tn"}` changes every save a foe makes against you (Rout, Pin Down, Warning Shot, Stopping Shot, a Parley's surrender) |
| Held shots | `holdWatch` / `fireWatch`; `watch_set` carries `tile`, `tiles`, `allyId`, `targetId` | enough to draw every lane on the client |
| Technique previews | `core.ts` 878 `pv.pressure` | the card can say "+1 PRESSURE" before the shot |
| The trigger `acted` | `game.ts actedName` | a technique's own id is its `action` (`flush`, `rout`…): data can answer a technique |
| **Not usable:** `ai_move_risk` | `combat.ts` 2847 | it is emitted only when a unit's ITEM listens (`anyOn`): a standing listener in `rules.ts` would never be called. AI behaviour by Pressure state therefore needs P10. |
| **Not usable:** a predicate on a count | `PREDICATES` | `self_has_res` is "at least 1"; nothing gates an order on "the target has 2+ Pressure": P9 |

## 2. The meter you see (every gunner; SEE items)

| # | Kind | Name | Rule a player reads | Data shape | Built from | Builds |
|---|---|---|---|---|---|---|
| 1 | SEE | **States named** | Every state floats its word and one line: PRESSED aims worse, SUPPRESSED loses AP, BROKEN is near breaking. | `rules.pressure.states: {pressed: {word, says}, suppressed: {…}, broken: {…}}` (texts with `{=pressed_ranged_hit}`-style placeholders) | fx event `pressure` (`state`); `STATE_WORD`, `physWord` (add `pressed`) | yes |
| 2 | SEE | **Tracers and dust** | A shot that adds Pressure leaves a tracer and kicks dust round the target, hit or miss. | none (presentation of `shot` + `pressure` with `by`) | fx events `shot`, `pressure` | yes |
| 3 | SEE | **They duck** | A Suppressed foe's token sits low; a Broken one trembles; it stands up when the pips fall. | `data-pressure-state` on the token from the last `pressure` event's `state` (engine's word, never the client's sum) | fx event `pressure`; token tile redraw | yes |
| 4 | SEE | **The card says it** | Before you shoot: "+1 PRESSURE (+1 past cover) → PRESSED". | none | `pv.pressure` (technique previews; Shot and Aimed Shot are techniques) | yes |
| 5 | SEE | **Fire lanes** | Every held shot is drawn: Overwatch your field of fire, Deny a lane to its tile, Cover Me an arc to the ally, Dead to Rights a sight line to the target. | none | fx `watch_set` / `watch_fire` / `watch_end`; the view's held `u.watch`; `fx/sight.ts` for the field | yes |

## 3. What Pressure does to them (DECIDE: the turn changes because the enemy changes)

| # | Kind | Name | Rule a player reads | Data shape | Built from | Builds |
|---|---|---|---|---|---|---|
| 6 | DECIDE | **Shaken Nerves** (door, Dexterity 3) | Every save a foe makes against you is harder by 1 for each Pressure pip on it. | `dexterity` row: `{op: roll_mod, when: save, roll: tn, if: {actor: self, target: foe}, value: {base: 0, per: [{of: "target:pressure", value: 1}]}}` (`door.nerves_per_pip`) | trigger `save`, op `roll_mod` (`roll: tn`), number block `target:pressure`, `self_skill` | yes (prove: the save's actor is the forcer, through a real Rout) |
| 7 | DECIDE | **Flush Out** (door, Dexterity 5) | Your Flush also makes the target save (Heart) or be Afraid of you for a round: it won't come at you or shoot you. | `{op: condition, when: acted, if: {action: [flush]}, condition: fear, rounds: 1, via: dexterity, target: target}` | trigger `acted` (the technique's id), op `condition` (`via`), the AI's `fear` rule | yes |
| 8 | DECIDE | **Break them** (Skirmisher) | Rout costs you 1 AP less; with Shaken Nerves its save is harder by the pips it spends. | `{op: cost_mod, when: attack, value: -1, min: 1, if: {mode: [rout], own_turn: true}}` | trigger `attack`, `mode` (ctx.tech), `cost_mod` | yes |
| 9 | DECIDE | **They hug cover** (every gunner's Pressure) | A Suppressed foe will not end a move away from cover while it can help it; you choose where it hides by where you shoot from. | `rules.pressure.ai: {open_risk: 6}` | **P10** | P10 |
| 10 | DECIDE | **Breaking** (every gunner's Pressure) | A Broken foe starts its turn with a Heart save: failed, it cowers (loses the turn), runs (Rout's run) or, if it could surrender, gives up. | `rules.pressure.break: {tn, cower_by, flee_by, surrender_by}` | **P10** (reuses `saveAgainst`, `canSurrender` / `surrender`, Rout's run as the one copy) | P10 |
| 11 | DECIDE | **Open** (Skirmisher order, 1 AP) | Spend 2 of a Pressed target's pips: it is Exposed (−Defense) to the next attack, anyone's. | grant_action `open`: `reach {sight: true, side: foe, if: {target_res_at_least: {pressure: 2}}}`; `resource {resource: pressure, value: -2, target: target}`; `condition exposed {skip_save: true}` | op `resource`, condition `exposed`; **P9** | P9 |
| 12 | DECIDE | **Pin the Suppressed** (Skirmisher) | Your ranged hit on a Suppressed foe Pins it for a round (Body save). | `{op: condition, when: hit, if: {melee: false, target_res_at_least: {pressure: 3}}, condition: pinned, rounds: 1, via: dexterity}` | trigger `hit`, `pinned`; **P9** | P9 |

## 4. The Skirmisher moves (DECIDE: standing still is the wrong answer)

| # | Kind | Name | Rule a player reads | Data shape | Built from | Builds |
|---|---|---|---|---|---|---|
| 13 | DECIDE | **Fire and Move** (Skirmisher Gain) | Once a turn, after a ranged attack, a 1-tile step costs no AP and draws no opportunity attack. | Run and Gun's own shape: `mark fired` on `attack_roll` (`own_turn`, `melee: false`); `cost_mod {when: cost, set: 0, if: {action: [move], flag: fired, ap_above: 0, path_tiles_at_most: 1}, limit: {per: per_turn, n: 1, key: step}}` + `condition slipping {skip_save}`; clear at `turn_end` | `mark`, `flag`, `cost_mod`, `path_tiles_at_most`, `slipping` | yes |
| 14 | DECIDE | **Relocated** (Skirmisher Gain) | Your first ranged attack after you walk this turn: +1 to hit, and a hit adds +1 Pressure. | `mark relocated` on `moved` (`if: {own_turn: true, how: [move, sprint, disengage]}`); `roll_mod {when: attack, value: 1, if: {flag: relocated, melee: false}}`; `resource pressure 1 target` on `hit` `if flag`; `mark clear` on `hit`, `miss`, `turn_end` | `moved`, `mark`, `roll_mod`, `resource` | yes |
| 15 | DECIDE | **Slide** (door, Dexterity 1; 1 AP) | Dive to the nearest cover within 3 tiles, drawing no opportunity attack, and shed 1 of your own Pressure. | grant_action `slide` (`tab` the Arms tab's ranged block): `condition slipping {skip_save}`, `displace {to: cover, tiles: 3}`, `resource {resource: pressure, value: -1}` | `grant_action`, `displace` (`to: cover`), `slipping`, `resource` | yes |
| 16 | DECIDE | **Near Miss** (door, Dexterity 3) | Once a turn for each target, your ranged miss still adds 1 Pressure: held shots too. | `{op: resource, when: miss, resource: pressure, value: 1, target: target, if: {melee: false, hostile: true}, limit: {per: per_turn, n: 1, each: target}}` | trigger `miss`, `resource`, `limit.each` | yes |
| 17 | SEE | **Run and Gun** (rank III, kept) | As today: a second, longer free move (2 tiles) after an attack, and +1 Pressure on the next hit. | unchanged row | as today | yes (no change) |

Weapon-neutral (5 in the brief): Pressure comes from any ranged hit, thrown weapons included (`strikes-b.ts:177`); a bow
and a pistol pin as a rifle does; melee sheds the attacker's own. Nothing above names a weapon. The card says it: the
Arms tab's ranged block line "Any ranged hit adds Pressure: a gun, a bow, a thrown knife. A blow in melee sheds yours."

## 5. Growth with a real choice

| # | Kind | Item | Rule | Built from | Builds |
|---|---|---|---|---|---|
| 18 | GROW | **The door ladder** | Slide at Dexterity 1, Near Miss at 3, Shaken Nerves at 3, Flush Out at 5: what anyone with the skill opens; the Skirmisher uses them better through its Gain. | `self_skill {dexterity: n}` on each `dexterity` row | yes |
| 19 | GROW | **The fork: Suppressor or Runner** (Dexterity 5 and 7) | Suppressor: Near Miss for every target, Shaken Nerves +2 a pip at 7, a Deny holds a row of 3. Runner: Fire and Move reaches 2 tiles, Slide costs 0 once a turn, Relocated +2. You take one at 5, the other at 9. | `ladder[]` rows (`points, fork, more`), pick list `pressure_forks` | **P8** |
| 20 | GROW | **Found in play** | The first time you Break a foe (it runs or gives up), you know Broken Line: Rout reaches every Broken foe within 2 of the target. | the trick's `sight {when, if}`; `{op: unlock, list: pressure_tricks}` | **P1** (and P10 for the sighting) |
| 21 | GROW | **Pins (practice)** | A foe you made Suppressed earns 1 pin; one that runs or yields, 3. At 5, 15, then every 15: one fork pick early. | `practice: {door: dexterity, …}` | **P2** |

Tonight the real choice is on the turn (Fire and Move or stay for Precise; Flush Out or Rout; Slide or hold a lane) and
in the Dexterity perk step the alpha-perks lane is rewriting: **Pressure Point** (damage on a Pressed target, the
suppressor) or **Keep Their Heads Down** (+1 Pressure once a turn, the pinner). Both are built with: Pressure Point reads
`target:pressure`, and Near Miss and Relocated raise its uptime; Keep Their Heads Down stacks with Relocated (two rows,
two limits; that is intended).

## 6. Effects (apps/web/src/game/fx/: `physical.ts` and a new `pressure.ts` beside `figments.ts`; SVG and CSS only)

Every moment: paced by the combat speed setting (`after`, the beat tables), off under Reduce motion (`reducedMotion()`:
words and pips only), fog through `at()`, colour always with a word. The acting token moves first.

| Moment (event) | Acting token | What travels | The target | Word |
|---|---|---|---|---|
| A shot adds Pressure (`shot`, then `pressure` with `by`) | its usual recoil (unchanged) | a tracer: a 1.5 px white line from muzzle to 0.3 tile past the target, `stroke-dashoffset` 0 → len in 90 ms, fades in 140 ms; a miss ends 0.4 tile wide of the token | dust: 5 short line shards (4 to 7 px, muted `#A3AEC2`) spray from the token's feet in a 120° fan away from the shooter, 260 ms; the pips pulse (today) | "+1 PRESSURE" small, white, 0.6 s (+2: "+2") |
| Reaches Pressed | none | none | the token dips 6% (`translateY`), holds | PRESSED (HP ink `#F65157`), once per unit per fight, then "aims worse" small under it |
| Reaches Suppressed | none | none | token low (`translateY(10%) scale(0.94)`, kept while Suppressed); 3 dust shards each time a further shot lands | SUPPRESSED + "loses AP" |
| Reaches Broken | none | none | low and a 2 px tremble (`shake`, today) that repeats at its turn start | BROKEN + "may run" |
| Pressure falls (`now < was`) | none | none | the token rises back a step, 200 ms | "−1" muted |
| Flush (technique `flush`, `cover`) | recoil | tracer into the cover tile, not the target | the cover tile cracks: 4 white crack lines from its centre (40 ms each), 6 shards; the target ducks | FLUSHED |
| Flush Out lands (`cond` fear) | none | none | the target's token turns away (flip on x) and slides 0.15 tile back | AFRAID |
| Rout / Breaking runs (`moved` after rout) | none | none | the token runs with 3 speed lines behind it | BREAKS / RUNS |
| Gives up (`down` surrendered) | none | none | token greys, a white 12 px flag glyph (two lines) | SURRENDERS |
| Fire and Move / Slide (`moved`, slipping) | the token slides on a 0.2-tile arc, low (scaled 0.9 on the way), 180 ms | 3 dust shards at the start tile | none | MOVE (amber, small) / SLIDE |
| Relocated shot (`attack` term `relocated`) | a 2 px white chevron under the token before the recoil | tracer as above | as above | RELOCATED small |
| Overwatch held (`watch_set` overwatch) | white ring (today) | the field: the tiles the holder sees (`fx/sight.ts`) hatched at 8% white, edge dashed `4 3`, kept until `watch_end` | none | HOLDING OVERWATCH |
| Deny held (`watch_set` deny) | ring | a lane: a dashed white line holder → tile, the tile boxed with 4 corner ticks; a 3-tile row boxed as a row | none | HOLDING DENY |
| Cover Me held | ring | an arc (quarter circle) from the holder over the ally, ally tile ringed | none | COVERING |
| Dead to Rights held | ring | a thin red line to the target with a 6 px crosshair on it | the target's pips glow | ON YOU |
| A held shot fires (`watch_fire`) | the lane flashes full white 80 ms, then fires (today's red ring) | tracer | dust | the name + "!" (today) |

Sound: the shot's own sound (today); a 40 ms filtered `hit_metal` tick at gain 0.25 for each dust spray; nothing new
to source (the dust and cracks are line shapes, the CLAUDE.md asset rule allows them as SVG).

## 7. Onboarding (the three items; texts are data)

1. **Action bar.** For a character with Dexterity 1 or more, the fight's action bar always shows **Suppress** (the
   default readied ranged technique, `starting.default_ranged`) and **Slide**. Greyed with a reason and what to do:
   "Suppress: no ranged weapon in hand. Draw one (1 AP) or equip one in the camp." / "Suppress: empty. Reload." /
   "Slide: no cover within {=tiles} tiles." Reasons come from the technique's and the grant_action's own refusal
   (`previewTechnique`, `reachWhy`), never written in the client.
2. **The tab line** (the Arms tab's ranged block, `meterHint`, empty today, `techView.ts`): from
   `rules.pressure.texts.tab`: "Ranged hits pin: {=pressed} Pressure is PRESSED (it aims worse and your Takes open),
   {=suppressed} SUPPRESSED (it loses AP), {=broken} BROKEN. A miss pins nothing unless you know Near Miss. Pressure falls
   each turn."
3. **The fight hint** (one line, once, `apps/web/src/game/tips.tsx` TIPS, a row `pressure` whose `when` is "the fight
   screen and the active character has Dexterity 1+ and a ranged weapon"; text from `rules.pressure.texts.hint`):
   "SHOOT TO PIN: every hit adds Pressure; at {=pressed} your target is Pressed and Takes open. Move between shots."

## 8. Numbers (PROVISIONAL, all data fields) and the balance line

| Field | Value | Where |
|---|---|---|
| `fire_and_move.numbers.tiles` | 1 | classes.json marksman gain |
| `relocated.numbers.hit`, `.pressure` | 1, 1 | classes.json marksman gain |
| `break_them.numbers.ap` | 1 | classes.json marksman gain |
| `slide.numbers.tiles`, `.ap`, `.shed` | 3, 1, 1 | skills.json dexterity |
| `near_miss.numbers.pressure` | 1 | skills.json dexterity (points 3) |
| `shaken_nerves.numbers.per_pip` | 1 | skills.json dexterity (points 3) |
| `flush_out.numbers.rounds` | 1 | skills.json dexterity (points 5) |
| `rules.pressure.ai.open_risk` (P10) | 6 | techniques.json |
| `rules.pressure.break.{tn, cower_by, flee_by, surrender_by}` (P10) | 12, 0, 5, 10 | techniques.json |

**The line it sits on:** the plain rifle line R (100). The Skirmisher's steady damage stays about R: Relocated's +1 to
hit is about +5% of its shots, taken only on a turn it moved (it costs AP to move), so about 103 to 105 measured; perk
steps sit on top (the owner's ruling), Pressure Point included. Its value is control, measured in a new column:
**enemy AP lost to Pressure, enemy attacks refused (Afraid, Pinned) and foes broken, per fight**, against a plain
gunner's. **How:** rows `skirmisher` and `solo_skirmisher` in `packages/engine/test/balance/survival-run.ts` (missing
from the 0.29 baseline; the baseline's solo gunner clears stage 1 at 54% on the gear route, the bar to beat); `npm run
try` scenarios: a Relocated shot, Near Miss on a held shot, Flush Out then the foe's turn (it does not close), Slide.

## 9. Saves

Pressure lives only in a fight; the door rows read Dexterity points and the class rows read the class, so nothing is
stored: a saved Skirmisher loads with every move it had (Reflex, Fire Discipline, Speed Loader, Special Ammo, Duck and
Roll, Killzone, Run and Gun) and gains Fire and Move, Relocated and Break Them. P8, P1, P2 add `c.forks.dexterity`,
`c.known.pressure_tricks`, `c.practice.dexterity`, all empty; a character already past Dexterity 5 is owed the fork on
its next level-up card. Proof: `test/old-save.test.ts` with a rank III Skirmisher fixture.

## 10. Needs a new primitive (one consolidated list; tonight none of these is built)

Reused from the sister drafts: **P1** (one `unlock` op over named lists), **P2** (one practice ledger by door), **P8**
(one fork action for every door). New, general:

9. **P9, a count on a resource:** predicates `self_res_at_least`, `target_res_at_least`, `actor_res_at_least`
   (`{resource: n}`), one reader (`effects/cost.ts resLeft`), beside `self_has_res`. Open, Pin the Suppressed, the
   Suppressor fork; any door that gates on "N of a meter" (Momentum's Finishers, Guard, Ledger, Shadow).
10. **P10, the meter's state rows read by the enemy AI:** `rules.pressure.states.<state>.ai` (`open_risk`: the risk
    `enemyCloseTile` adds to a tile with no cover next to it; `break`: the turn-start Heart save and its outcomes,
    cower, flee by Rout's run, surrender through `canSurrender` / `surrender`). One place in `combat.ts enemyTurn`
    reads the unit's state rows; Rout's run is exported from `takes.ts` and used by both (one copy). Momentum and Guard
    could later name AI rows the same way.

No new trigger, op, resource, stat or cost site: the orders are `grant_action` rows and the rules are triggered rows.

## 11. Tonight's build (every item marked yes, small commits, most felt first)

| Commit | A player gets | Proof |
|---|---|---|
| 1 | 1, 2, 3: PRESSED named, tracers and dust, the duck (`fx/pressure.ts`, `physWord` gains `pressed`) | `physWord` / `physBeat` tests for pressed, a fall and dust; frames: first Pressed, Suppressed duck |
| 2 | 5: the fire lanes (Overwatch field, Deny lane, Cover Me arc, Dead to Rights line) | fx test from `watch_set` payloads; a frame of each |
| 3 | 4 and onboarding (section 7): the card's "+1 PRESSURE", the tab line, the TIPS row, Suppress and Slide on the bar | techView `meterHint` test; tips test for the `when`; `npm run check` (text-number guard) |
| 4 | 13, 14: Fire and Move, Relocated (classes.json gain rows) | through the reducer: shot, a 1-tile move at 0 AP, the log's `relocated` term; `skirmisher.test.ts` |
| 5 | 15, 16, 6: Slide, Near Miss, Shaken Nerves (skills.json dexterity rows) | a real Rout whose save TN rises by the pips; a held shot that misses and adds 1 |
| 6 | 7, 8: Flush Out, Break Them | a Flush, then the foe's turn: it does not close on or shoot the Skirmisher |
| 7 | measure (section 8) | `survival-run.ts` rows; numbers fitted in data only |

Every commit keeps the left panel (the sheet, the Arms tab, Level up) and the mode's right panel; the fight screen is
excepted as today. `python tools/validate.py data` prints 0 errors; `docs/ENGINE-HOOKS.md` regenerated if the
catalogue's "example item" columns change.

## 12. Art

**Token marks (SVG, the client draws them):** the pips (today) with the state word under them; the duck offset; a
white flag glyph for surrender; the lane, field, arc and line shapes of section 6. **Wick white-ink icons** (one list in
`art/briefs/ART-REQUESTS.md`; monoline placeholders until delivered): **Fire and Move** (Wick mid-stride, gun arm still
pointed back over his shoulder); **Relocated** (Wick landing from a step, gun raised, a dust puff at his heel);
**Slide** (Wick on his side sliding into a crate); **Near Miss** (Wick firing, a bullet line passing a ducking head);
**Shaken Nerves** (Wick leaning in, a small figure behind cover trembling); **Flush Out** (Wick shooting a crate apart,
a figure scrambling out); **Break Them** (Wick lowering the gun, a figure running away); **Open** (Wick pointing two
fingers at a target, an opened bracket around it); the forks **Suppressor** (Wick prone behind a bipod) and **Runner**
(Wick vaulting cover).

## 13. Questions for Leon

1. **Three Gain moves.** The Skirmisher's Gain would hold Reflex, Fire and Move and Relocated (plus Break Them), more
   than "two moves a rank" anywhere else, so that a level 3 Skirmisher moves from its first fight. Recommended: yes;
   the other way, they go in rank I beside Fire Discipline and Speed Loader.
2. **Breaking (P10) and surrender's gate.** Today a foe only surrenders under half HP or alone. Should Broken bypass
   that gate (Pressure alone makes it give up)? Recommended: no; a Broken foe above half HP cowers or runs instead.
3. **Whose Pressure moves the AI?** Recommended: everyone's (it is the meter's rule, rules 1.12); the Skirmisher is
   best at it through Near Miss, Relocated and Shaken Nerves, not through a private meter.
