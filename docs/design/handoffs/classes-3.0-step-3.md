# Classes 3.0, step 3: reactions made real, and the Skirmisher (hand-off)

Built 13 Nov 2026 on the worktree branch `worktree-agent-a87f47094562526ef`, started from `claude/charming-gauss-hbq4n0`
(step 1a merged). Not pushed; no version bump. Spec: `docs/design/reactions-spec.md` (binding), the weapon-neutral audit
4.1, roster Revision 4 section 4.3. Rules revision **1.30** in `docs/rules/PHC-Core-Rules-v1.0.md`, items **1800 to
1811** (numbered from 1800 so the two builders working beside this one, step 1b and the rename, can take 1757 onward).

Commits: the spec; data, engine and tests; the golden tables (re-recorded on purpose); the replays, the Reflex measuring
row and the catalogue; this hand-off with the e2e run.

## 0. Finished (second builder, 13 Nov 2026): branch `worktree-agent-a5b91e20e7254055a`

Fast-forwarded from the branch above, then:

1. **The main line merged in** (`claude/charming-gauss-hbq4n0`: steps 2 and 4, rules 1.29). The spec keeps 1.29 then
   1.30 (items 1757-1761 and 1800-1813, no collision). Golden tables and replays were taken from this branch and
   re-recorded on the merged code; every changed line is one a parent changed on purpose, except 9 itemops lines that
   are the cross of both sides' additions (marksman@I-III × blow-shaken, blow-shaken-twice, shot-afraid) and one replay,
   `proving-4v10-boss` (moved by this branch only, moves again merged: the Breaker's Momentum on the shaken plays into
   the Skirmisher's fight). **The weapon-neutral guard:** the four Skirmisher moves left PENDING. Texts made neutral
   (Speed Loader "off-hand weapon"; Killzone "your line of fire or your reach"; Special Ammo "ammunition…a weapon that
   takes a magazine / draws from a quiver"); Fire Discipline's Heat refund reads `heat_limit` only. In DOOR with the
   reason: Riposte (mode `riposte`, its handler gone: code 0), Fire Discipline (mode `aimed`), Special Ammo (the words
   magazine and quiver; one read: the reload effect's art), Killzone (2 reads: a melee weapon holds at its reach, an
   aimed hold needs a weapon that aims). Called Shot left PENDING (no base-class move until the Operative step adds it).
2. **The lead's ruling on Fire Discipline (item 1813):** Aimed attacks +1 to hit, no Heat with a weapon that has Heat;
   once a turn, on your turn, a weapon technique that costs 3 AP or more costs 1 AP less; a plain 2-AP attack is never
   cheaper. Built with two new closed-list predicates, `free_tech` (techniques.json `free`) and `tech_ap_at_least`
   (the attack's events now carry `techAp`, the technique's own price with the weapon: `combat.ts setStrikeTechAp`,
   registered by `physical/core.ts`). **A reading made here (the lead can reverse it):** "a weapon technique" leaves out
   the free techniques everyone has, so the Aimed Shot (3 AP) and the long rifle's 3-AP Shot are not cut.

   | All in, % of the normal-share rifle turn (`REFIT_MEASURE=1 REFIT_SYSTEMS=plain,gun REFIT_VARIANTS=allin`) | L1 | L5 | L10 | L20 | Mean |
   | --- | --- | --- | --- | --- | --- |
   | The Skirmisher (best gun), as built, 4 fights a cell (the first builder's sample) | 163 | 173 | 165 | 138 | 160 |
   | The same, 6 fights a cell (the contract guard's sample) | 164 | 168 | 166 | 145 | **161** |
   | With the Aimed Shot also cut (the other reading; contract guard, 6 a cell) | 164 | 180 | 165 | 170 | 170 |
   | Plain rifle all in (unchanged) | 126 | 123 | 109 | 108 | 117 |

   The band is 145 ± 12% (127.6 to 162.4): as built it is inside, near the top (+11%). The balance-contract guard and
   the Faith dabbler guard pass.
3. **The replay coverage line.** After the ruling the door line holds on its own (actions with a door open: 57) but
   "actions with a player's unit Hidden" fell to 13 (needs more than 20). Under the lead's leave to ADD to a scripted
   game: in `proving-doors-hiding-watches` the optimised blade (c1) also walks out of sight and goes to ground on its
   **third** turn (as on its even turns): `helpers/replay.ts`, one condition `n === 3` added. Now hidden 33, doors 62.
   No action removed, no guard lowered; replays re-recorded.
4. **The perk Bulwark renamed Stonewall** (Leon, via the lead; item 1812, rules 1.30 section 4): the lead's Rampart was
   not used because the RAISE Grand form is "Ramparts". Display name only (id `bulwark`, icon, numbers, saves
   unchanged): data, the perk's log line and preview label, tests, the art catalog label and icon brief, ART-REQUESTS
   (nothing to redraw), perk-runtime, the spec body and items 377, 488. `tools/validate.py` now refuses a perk named
   as a class. `itemops-perks.log.json` moved on that word only.
5. **To measure in step 11: Reflex.** The simulator never uses the second reaction (+0 measured, so its worth, the
   spec's +8 to +17%, is unconfirmed). What the simulator needs: (a) enemies that cross a held line: an AI that
   advances through Overwatch and Killzone lanes (melee enemies charging, shooters repositioning between cover), or a
   scripted fight where they walk across it; (b) a Skirmisher policy that holds Killzone or Overwatch and still takes
   opportunity attacks and Duck and Roll when two reactions allow it (and Keep one for a held shot); (c) Duck and Roll
   valued by the hit it avoids, so it is taken when a step out of sight or into cover exists; (d) the row as
   `defence-measure.ts reflexRow`: off-turn damage and damage taken with `reactions` 2 against 1, levels 5 to 20.

## 1. What was built

| Rule or move | How (the primitive) | Where |
| --- | --- | --- |
| Reactions a round for everyone | `rules.json combat.reactions.per_round` (1) read by `tactics.ts maxReactions` (was a literal 1) | tactics.ts |
| **Reflex** (two a round) | data `stat_mod reactions +1` on a move held from class gain: a base class's new list **`gain`** (`classes.json` `base[marksman].gain`: `marksman.reflex`), held beside the six moves at rank I (`data.ts CLASSES`, `collect.ts classMove / classMoveKeys / allItems`). The generic `stat_mod` now answers **any declared stat** (`effects/core.ts statOfMod`: STAT_MAP, else `isStatId`) | data; effects/core.ts, collect.ts, data.ts |
| Cue exactly one, Before the Blink, Many Hands | as built in 1a (`cueLive`, stat `reactions`, `payer`); tested here (Cue: two, then refused) | tactics.ts |
| **Keep one for a held shot** (rule 10) | `tactics.ts keptForHeld`, asked once in `react()`: a unit with more reactions than `rules.json keep_for_held` (1) that holds a shot (Overwatch, a Watch, a held Outburst's watch) is refused a reaction that fires by itself when it would leave fewer; the held fire (window `overwatch`, `watch`, `heart_overwatch`) and a Call made as a reaction (`call`) are not refused. Off: `u.keepForHeld = false` (no screen switch yet) | tactics.ts |
| The dial | `rules.json combat.reactions.second_hit` (0): defined, read by nothing (as the spec says) | data |
| **Killzone** on both reactions, any weapon | the held attack carries `u.owSpend` (= `numbers.spend`, 2); `combat.ts triggerOverwatch` passes it to `react()` as `spend` (1 when fewer are left); the `reaction_window` payload now carries `spend`, so the handler holds the second attack only when both were paid; a melee weapon holds `melee` (`isMelee` refusal deleted); +`numbers.hit` (was a literal 2) | classes/i.ts, combat.ts, tactics.ts |
| **Riposte fold** | `fighter.riposte`'s handler **deleted**; its data: `stat_mod technique:riposte` (an item may now give an **Answer**: `physical/core.ts usable` asks stat `technique:<id>` for answers), `roll_mod` on `attack` (number block `self:counter`) `if: {mode: [riposte]}`, `resource momentum -1` on `attack_roll` `if: {mode: [riposte]}`, `cancel` on `attack` `if: {mode: [riposte], self_lacks_res: [momentum]}`. The predicate **`mode` also reads the technique** (`ctx.tech`: `combat.ts setStrikeTech`, registered by `physical/core.ts` from `strikingWith`; on `attack_preview` and `attack_roll`) | data; physical/core.ts, combat.ts, effects/triggers.ts |
| **Fire Discipline** | the handler keeps only the Heat (`claims: ['heat_mod']`); data: `cost_mod` on `attack` (`value -1, min 1, if own_turn, limit per_turn key first peek`) + `use` on `attack_roll` (same limit) + `roll_mod` on `attack` `if: {mode: [aimed]}`. The `mode === 'burst'` and `/bow/` reads are gone | data; classes/i.ts |
| **Speed Loader** | data: `cost_mod` on `cost` `if: {action: [reload, pickup], hand: [main]}` (peek) + `use` on `reload` + `use` on `acted` `if: {action: [pickup]}` + `cost_mod` on `swap` (the draw and the swap); one per-turn counter (the item's own) | data |
| **Special Ammo** on any weapon | the handler loses its family refusals (only a consumable is refused); a weapon with no magazine loads for `numbers.load_ap` (1) and the load lasts `numbers.load_attacks` (12) attacks (counted on `attack_roll`); `combat.ts attackDamage` and the Burning line read the round for a no-magazine weapon's hits. `QUIVER` (a literal 12) is `numbers.load_attacks` | classes/i.ts, combat.ts |
| **Run and Gun** (new, rank III) | data only, as the spec's section 10 (plus `ran` cleared at `turn_end`); the 2-tile cap is the new predicate **`path_tiles_at_most`** (the move's price carries no tile cap); no opportunity attack is the new condition row **`slipping`** (`stat_mod immune:opportunity_attack`, ended by its own `cleanse` on `moved`) | data |
| A free move keeps the bank | `combat.ts moveUnit`: a move an item prices from paid to 0 AP no longer takes its tiles from the bank (it went negative) | combat.ts |
| Called Shot leaves | out of rank III; `gunslinger.called_shot` stays, `status: shelved` with a `future_home` (the Operative, step 4) | data |
| Validator (spec section 10) | `stat_mod reactions` only on an item whose text says reaction, and on a class gain only the Skirmisher's; the `suppressed` row forbids `attack` and `move` only; a condition row's `stat_mod` of a declared stat is accepted (P4; read from `effects/stats.ts`) | tools/validate.py |

New closed-list rows: predicates `path_tiles_at_most`, `self_has_res`, `self_lacks_res` (`data/effect_ops.json item_ops`
rewritten); `mode` reads `ctx.tech`. Lint: `classes/i.ts` literals 90 → 88; `fighter.riposte` off the handler list;
`marksman.run_and_gun`, `marksman.reflex`, `fighter.riposte` in `DATA_ONLY`. Text numbers 1404 → 1396.

**Reactions-spec section 2, rule by rule, against the code:** 1 (one a round) 1a, now from data; 2 (never triggers) 1a;
3 (one event) 1a (the step keys' walk serial is step 1b's); 4 (more only from) Reflex here, Before the Blink and Cue 1a,
Cue tested here; 5 (a reaction attack is plain) already so: the opportunity strike, Overwatch and the Watches resolve the
plain attack (no change); 6 (held fire on one reaction, Killzone both) here; 7 (Suppressed) 1a; 8 (forced movement)
already so (`combat.ts forcedRule`, `reactions: false`); 9 (Many Hands, Calls) 1a, Order is step 1b's; 10 (policies)
Riposte's policy is now the technique's (the character's Answers), Keep one for a held shot here. Edge cases (sight,
Hidden, Downed, co-op, saves, the area map): 1a.

## 2. Every number (all PROVISIONAL, items 1800 to 1811)

| Number | Value | Data |
| --- | --- | --- |
| Reactions a round | 1 | `rules.json combat.reactions.per_round` |
| Reflex | +1 (two) | `classes.json marksman.gain reflex` (`numbers.reactions`, `effects.0.value`) |
| Keep for a held shot | 1 | `rules.json combat.reactions.keep_for_held` |
| Second reaction's to-hit dial | 0 (unused) | `rules.json combat.reactions.second_hit` |
| Fire Discipline: first attack | −1 AP, at least 1 | `move_pool fire_discipline` effects 1, 2 |
| Fire Discipline: Aimed | +1 | effect 3 |
| Speed Loader | −1 AP, at least 1, once a turn | `marksman.speed_loader` effects |
| Special Ammo: a no-magazine load | 12 attacks; 1 AP to load | `move_pool special_ammo numbers.load_attacks`, `load_ap` |
| Killzone | +2 each; spends 2 | `move_pool killzone numbers.hit`, `spend` |
| Run and Gun | 2 tiles; +1 Pressure | `marksman.run_and_gun numbers` and its effects |
| Riposte (the Breaker) | 1 Momentum; + Counter | `move_pool riposte` effects |

## 3. The golden lines that moved (re-recorded on purpose; nothing else moved)

- `conditions`: the new row `slipping` (36 lines added); `moved/called-shot-{head,leg}/*` (8) are now empty: Called Shot
  left the Skirmisher's rank III, the situation's rank III Marksman has none.
- `costs-askers-classes`: `marksman@I..III/aimed` and `/tech/aimed_shot` AP 9 → 7 instead of 6 (the aimed shot is the
  turn's first attack: 3 → 2); 30 new marksman situations.
- `costs-askers-traits`: **`asker/trait/glass_runner/move`**: `bank0>-2` is gone (item 1811: a move an item makes free
  keeps the bank; the old line was a negative bank). The one non-Skirmisher line; a bug fix the rule needed.
- `costs-credit` (10), `costs-items-*`, `rules-items-traits-classes`: the Fighter's Riposte on/off policy rows are gone
  with its handler; Called Shot's rows are gone; the marksman's moves (now item ops) and the advanced classes that reuse
  them gained situations (additions only).
- `itemops-traits-classes`: 33 marksman situations added. `items-*`: the coverage line (Reflex in, Called Shot out).
- No damage, builds, magic, techniques, faith, enemies, special or flat line moved.

**Replays** (`REPLAY_RECORD=1 REPLAY_FULL=1`, after `paths-order`, `sight-order`, `shared-state`, `old-save`: green):
every game with a `marksman` build moved (the reference `opt_gun` and `plain_gun` builds are Skirmishers); the four
all-magic games kept their streams and states. **The coverage guard fails one line: "actions with a door open" is 19
(needs more than 20)** in `proving-doors-hiding-watches` (114 actions → 93: the squad's two Skirmishers end it sooner).
Left failing for the lead: the brief says never edit a scripted game to keep a coverage count, and the guard says never
lower it.

## 4. The measurement (reactions-spec section 7; do not refit: reported)

Smallest sample (4 fights a cell; a cell is about ±8 points at this size), all in, % of the normal-share plain rifle's
turn (the yard: 69.7 / 86.2 / 108.5 / 111.7 at levels 1 / 5 / 10 / 20).

| Row | L1 | L5 | L10 | L20 | Mean | Line | Off it |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Plain rifle all in (the Skirmisher, plain shots) | 126 | 120 | 104 | 108 | 115 | 125 | −8% |
| Best gun all in, **Fire Discipline's cut off** (the old reading) | 163 | 159 | 142 | 138 | 150 | 145 | +4% |
| **Best gun all in, as built** (the Skirmisher all in) | 163 | 188 | 181 | 159 | **173** | **145** | **+19%** |
| Reflex: the Skirmisher's off-turn damage a turn, with / without (whole fights, below) | 4 / 4 | 0 / 0 | 0 / 0 | 0 / 0 | +0 | +8 to +17 (spec estimate) | not seen |

**Fire Discipline's new form is the strongest piece and puts the Skirmisher outside ±12%** (level 5 at +30% is also
outside the per-level ±25%). It is the long rifle (a dear shot) under the gunner's rotation that gains: the first shot of
every turn 1 AP cheaper is a whole extra shot most turns. The plain rifle (2-AP shots) gains nothing (the saved AP has
nothing to buy). The spec priced it at "the Burst's old saving" (about +1.5%); measured, it is about +23 points on the
mean. The dial is not this step's: the lead's call (candidates: the cut on a Burst or a shot only once, as before, or the
cut only on a 2-AP or cheaper attack).

**Reflex, in whole fights** (`DEFENCE_MEASURE=1 DEFENCE_PARTS=reflex DEFENCE_N=4`, `defence-measure.ts reflexRow`:
the gun squad in the standard fight on cover, the Skirmisher all in playing the new policy `watcher`: a shot, then a held
Overwatch; Reflex as built against its stat at 0, checked to switch the count 2 → 1): the Skirmisher's off-turn damage
4% / 4% / 0 / 0 of a rifle-turn a turn with Reflex and the same without; what it took 23 / 6 / 9 / 14% both ways. **The
second reaction is never used in the simulator's fights**: its enemies shoot from where they stand (few walk into a held
line), Duck and Roll rarely finds a step that helps, and at level 1 there is no class yet. So the spec's +8 to +17% is
neither confirmed nor refuted here; it needs a fight where enemies cross a held line (a scripted one, or the playtest).
Read with the gun row: the Skirmisher all in measures 173 (+19%) on the range from Fire Discipline alone, before any
reaction is counted.

**The Faith guard** (`test/balance/faith-measure.test.ts`, "the gunner who dabbles gains little": the best with prayer at
most ×1.15 the rifle alone) now fails: 123.3 against 104.9. The dabbler is a Skirmisher with 2-AP shots: Fire
Discipline's saved AP buys a Whisper (1 AP) every turn, which it could not before. The same finding as the gun row, from
the other side: left failing for the lead's dial, not refitted.

## 5. Where the spec was silent, and what was done (calls made for Leon, listed in the pick-up guide section 6)

1. **Where Reflex lives:** a base class's new `gain` list (moves held from class gain, outside the six). Revision 4's
   other "better" lines (the Bulwark's 1 Guard, the Operative's Read) can use the same list.
2. **Riposte with no Momentum:** the Breaker does not Riposte at all, even with a weapon that lends the technique (the
   cost stays 1 Momentum; the fold never raises). The class gives the Answer with any melee weapon.
3. **An item may give a technique only if it is an Answer** (`usable` asks the stat for answers only: asking it for
   every technique on every check was too dear).
4. **Fire Discipline's "first attack"** is the first attack roll of your own turn, a free one included (a Lunge's strike).
5. **Keep one for a held shot** refuses anything but the held fire and a Call made as a reaction; on by default; no
   screen switch yet (step 10); `u.keepForHeld = false` turns it off.
6. **Run and Gun:** a move longer than 2 tiles leaves it waiting (not spent); `ran` also ends at the end of the turn ("your
   next hit this turn").
7. **Special Ammo on a no-magazine weapon:** a story load arms the next fight's weapon (its first 12 attacks); flamers and
   launchers are no longer refused (only a consumable is).
8. **Killzone's second attack in the next round** (before your turn) spends that round's one reaction.
9. **A free move keeps the bank** for every item that makes a paid move free (Glass Runner's golden line moved).
10. **Speed Loader at 1 AP** saves nothing (at least 1) and still spends the turn's use.
11. **Called Shot** is `status: shelved` with a `future_home` until step 4 places it.
12. **Fire Discipline's Aimed +1 applies to a held aimed shot** (a class passive, not a technique rider: rule 5 left as is).
13. **The yardstick is a Skirmisher:** `plain_gun` (and `plain_blade`, `opt_gun`) are class `marksman`; Reflex and Fire
    Discipline ride on the contract's 100%. Measured: the plain rifle did not move (its shots are 2 AP).

## 6. Checks

- `python3 tools/validate.py data`: 0 errors. `npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`: 5 smells in 2
  places, 0 a lint fails on, each a line this step only re-wrapped (`classes/i.ts` the load action's preview fallback 2,
  Killzone's `2 ×` AP and its two held attacks; `combat.ts` 1312 the attack's roll, one field added).
- `npm run check` (the full run, at the end): validator, spec tables, screen data, engine hooks, both type checks: ok.
  Engine tests 3 failed of 3851, **all three the same finding or the brief's own rule**: `balance-contract` "gun: the
  all-in average 176% is outside 145% ± 12%; level 5 191%" (the guard agrees with section 4's 173), `faith-measure` the
  dabbler (above), and `replay-hash`'s coverage line (section 3). Web tests: 2 failed, `combat-actions.test.ts` two
  5 s timeouts on the loaded machine; the file passes alone with `--testTimeout 300000` (4 of 4).
- Browser suites on this worktree's own server (`wrangler dev --port 8797`, `python3 tools/e2e.py physical physical-pack
  classes-moves reload turn-order rules114 two-players --base http://127.0.0.1:8797 --jobs 2`): **ALL GREEN, 7 suites
  (5.0 min)**.

**For step 4** (the Operative takes Called Shot): the web's fx row for it as a class move was removed with it (the table
may hold no row for a move no class has); put it back in `apps/web/src/game/fx/techniqueFx.ts`:
`'move:gunslinger.called_shot': row([p('aim', { dash: '1 3' }), p('tracer')], [p('brand', { shape: 'target', up: 0, size: 0.18 }), p('cross', { n: 1, size: 0.14 })], [p('wide')]),`

## 7. How to add a reaction

1. **Data first.** An item op whose `limit` is `{ "reaction": 1 or 2, "kind": "attack" | "move" | "protect" }` is a
   reaction: the runner wraps it in `react()` (it spends, opens no window, and nothing answers what it does). Its text
   must say "reaction" (the validator). Its trigger is the event it answers (`taking`, `miss`, `moved`…).
2. **Code, only for a new kind of event:** call `react(cb, u, { kind, event, spend, payer, window }, fn)` and put the
   whole resolution in `fn` (a reaction never triggers a reaction only while `fn` runs). `event`: `attackEvent()` for an
   attack, `step:<mover>:…` for a walk. `window: { kind, mover, id, at, rng }` if items should see it
   (`reaction_window`, with `spend`); a held fire's window kind (`overwatch`, `watch`, `heart_overwatch`) is what Keep one
   for a held shot lets through.
3. **More reactions:** a `stat_mod` of `reactions` (data; its text says so). **A held fire that spends more than one:**
   set `u.owSpend` with the hold (Killzone).
4. **Give an Answer from an item:** `stat_mod technique:<answer id>`; riders as item ops with `if: {mode: [<technique
   id>]}` (the predicate reads the technique).
5. Tests: one per rule in the style of `test/skirmisher.test.ts`, numbers read from data.
