# Classes 3.0, step 1a: the review (13 Nov 2026)

Reviewer's branch: `worktree-agent-ac5eedbc1e0709d7e` = the builder's `worktree-agent-a933e3a39076f430b` (9 commits) + the
review fixes + this file. Read against `rev4-primitives.md` (sections 1, 5 rows 1 to 6, 6), `reactions-spec.md` rules 2,
3 and 7, `ENGINE-GUIDE.md` "Stop", and `git diff e2209e0..HEAD` (the merge base: `claude/charming-gauss-hbq4n0` has moved
on by twelve docs-only commits since the builder branched, so `claude/charming-gauss-hbq4n0..HEAD` shows those reversed;
merging will conflict in `docs/design/handoffs/CLASSES-3.0-PICKUP.md` section 6 only: keep both sides).

**Verdict: merge after the fixes on this branch** (no blocker left). The two rulings are right and nothing else moved
(proved below); the primitives carry the spec rows I wrote as data; the gaps are listed for step 1b.

## How the "nothing else moved" claim was checked

- **Replays.** With the two rulings and rule 3's event check switched off in a scratch copy (no `cb.reacting` refusal;
  Suppressed blocking every kind; Pressure's state blocking only non-protective Answers, as before), the old scenario
  configs and the OLD `replays.json`: **all 17 full-set streams equal the old streams**; only the state hashes differ
  (the count's new home, the `uses` cell). So every stream that moved moved through the rulings.
- **The two changed scripted games.** With the old configs on the new engine, the coverage guard fails on "actions with
  a player's unit Hidden" (16, needs > 20) and Answers (3 + 5, needs > 8). The builder made the hiding game play 8 rounds
  instead of 7 and gave the walk-away game a sabre soldier in place of a knife minion; **no threshold was lowered**. Now:
  Hidden 21 (> 20), Answers 3 + 8 = 11 (> 8), two games with 3+. Not weakened; the margins are thin (21 vs 20).
- **Golden tables.** Only the costs `.marks.json` and the nine `costs-special` Interpose lines changed, each by
  `reactUsed…/reactedRound…` → `uses.reaction|reaction…` alone; the item-ops additions are the pins recorded on the old
  engine (commit `937933d`). No damage, rules, conditions or moves line moved.
- **Spec rows as data** (throwaway fixtures, run, then deleted): the Break's one term (`damage_mult` with `res:shadow`,
  `event:ambush`, `target:marked`: ×1.33 at 2 Shadow, correct once `event:ambush` was fixed, below), Run and Gun's +1
  Pressure (`resource: pressure` on `hit`: 1 → 2), `slipping` answering `immune:opportunity_attack` (P4: `immune()` says
  yes), Volatile (`targets {of: self, shape: burst, within: 1, side: any}`: the three units in the burst), a Take the
  Weight-like `taking` reaction `{reaction: 1, kind: protect}` with `self:max_hp` (spends the reaction, works while
  Suppressed). All expressible.

## Findings

| # | Finding | Severity | File and line | Fixed / recommended |
| --- | --- | --- | --- | --- |
| 1 | **Rule 2 hole: Interpose's redirected hit lands outside the reaction.** `react()` was called with no `fn`, so the hit the Defender takes for the ally ran after `cb.reacting` was cleared: anything that answers a hit (a data `taking` reaction such as Take the Weight, the Knight's Interpose, a Share link) could answer the Interpose. Same shape in the Adamantile Knight's Interpose and the Heartbinder's Share (shelved, same fix). | should-fix (live: the Defender) | `classes/i.ts` 395-405, `classes/j.ts` 1151-1158, `classes/k.ts` 1415-1420 | **Fixed**: the body runs inside `react()`'s fn. Test `prim-review.test.ts` (failed first). Replays: no stream moved. |
| 2 | `canReact(…, n <= 0)` returned true without asking whether the reactor can react: a Stunned or Downed unit reacts when a `payer` pays (Many Hands later, the Blade's Hold) or on a paid shot. | should-fix | `tactics.ts` 119 | **Fixed**: `n <= 0` needs `maxReactions(u) > 0` (Killzone's paid shot already asked it). Test. |
| 3 | A data reaction (`limit {reaction, kind}`) passed no `event`: rule 3 (one event, one reaction a unit) did not hold for data reactions. | should-fix | `effects/triggers.ts` 390 | **Fixed**: `event: attackEvent()` (the attack being resolved, or none). Test. |
| 4 | `event:<field>` read only the payload's own fields; on `dealing` the attack's `ambush` and `crit` are on `ctx.src`, so the Shadow Break term's `event:ambush` (rev4 section 2) was always 0. | should-fix | `effects/triggers.ts` 193 | **Fixed**: falls back to `ctx.src`. Test. (`event:amount` on `dealing` is still 0: that payload's number is `base`. Step 1b: decide what `amount` is on `dealing`.) |
| 5 | `targets {shape: burst | aura}` with no `within` passed the shape check and selected nobody (silently). | should-fix | `effects/triggers.ts` 324, `tools/validate.py` 1766 | **Fixed** in both (refused). Test. |
| 6 | The moves golden table read `u.reactedRound ?? u.reactUsed` for its `reacted` mark: dead since P1 (the mark could never appear again). | note (test weakened by the move) | `test/golden/moves.ts` 76, 97 | **Fixed**: reads the `uses` cell; table unchanged (it never had a `reacted` mark). |
| 7 | Rule 3's step keys differ by site: the opportunity attack and Anchor key `step:<mover>:<from>><to>`, Overwatch, a Watch and Heart Overwatch `step:<mover>:<at>`. A unit with two reactions can take an opportunity attack AND fire its Overwatch on the same step. | should-fix (only with two reactions: Cue, Before the Blink, Reflex in step 3) | `combat.ts` 1701, 1767; `magic.ts` 1157; `physical/core.ts` 781; `classes/rev3.ts` 127 | Recommended: one key `step:<mover>:<arrival tile>` everywhere (one helper in `combat.ts`, like `attackEvent()`); with step 3's Reflex. |
| 8 | Rule 3's answered set (`tactics.ts ANSWERED`) lives per fight copy (so per reducer action: `apply()` deep-copies the game). Keys carry no serial for steps: the same mover repeating the same step past the same two-reaction unit within one action is answered once. Deterministic (replays and save/load pass), but rule 3 reads "a step", not "a tile pair". | note | `tactics.ts` 123-133 | Recommended with item 7: a walk serial in the key (as `attackEvent()`'s). |
| 9 | Other protective reactions still resolve after `react()` returns: Shrug It Off (`endCond`), Catch (the cancel), the Strike Call's dive (`displace`), Drink It In (the MP). None can be answered today, but the shape invites it. | note | `classes/rev3.ts` 77; `perks/c.ts` 153; `classes/j.ts` 550; `classes/i.ts` 1362 | Recommended (step 3): every `react()` call site passes its resolution as `fn`; a lint for `react(` with no fn. |
| 10 | **Order is a `move` reaction (call 1), yet the ordered ally's move provokes opportunity attacks and Overwatch**: it spends the reaction with `loseReactions`, outside `react()`, so rule 2 ("its move provokes nothing") does not apply. Before the patch it provoked too. Either Order is not a reaction (then it is not "kind move" either) or its move provokes nothing. | **call for the lead** | `calls/handlers.ts` 63, 89 | Lead to rule. If it is a reaction: run `doThing` inside `react(cb, a, {kind: 'move'}, …)` (a replay stream will move). |
| 11 | **Anchor's opportunity strike is classed `protect`** (reactions-spec rule 7 lists Anchor as protect), so a Suppressed Defender still makes an attack through Anchor: an attacking reaction through Suppressed, by the spec's own list. | **call for the lead** | `classes/rev3.ts` 125-128 | Lead to rule: the spec's "Anchor" probably means the forced-move resistance; the Disengage strike is an `attack`. |
| 12 | Calls made for Leon (pick-up section 6, item 1): **Drink It In** (the Guardian turns spell damage on a shield into MP) and a **helping Call** made as a reaction are classed `attack`, so Suppressed stops them. Both read as protective. The builder chose "no behaviour change"; a design call, not a conservative reading. | **call for the lead** | `classes/i.ts` 1362; `calls/core.ts` 65, 132 | Lead to rule (my reading: a helping Call and Drink It In are `protect`; a hindering Call `attack`). |
| 13 | P7's `always_seen` is read by `sightOf` only: the fog, the AI and `sideSeesUnit` ignore it. Its binding shape is "a unit the other side sees wherever it is" (Traced, Stare): narrower than the spec. | should-fix in 1b | `tactics.ts` 172-181; `combat.ts` `sideSeesUnit` | Step 1b: answer it in the `sees` hook, gated by a cached "something answers `always_seen`" flag (condition rows and items), so a fight with none pays nothing. `fog-view.test.ts` then needs a case. |
| 14 | `acted` is fired by the reducer only: an enemy's AI action never fires it. Enemy Bonds (Leon's ruling) and any enemy-held `acted` item need it. | should-fix (step 9 at the latest) | `game.ts` 1580; `combat.ts` `enemyTurn` | Recommended in 1b: fire `acted` from the AI's action path too (one call where the AI's action succeeds). |
| 15 | Second copies beside the engine: `patronIdOf` repeats `faith.ts beliefOf` (to keep the load order); `COND_TABLE_STATS` repeats which stats `condtable.ts modsOf` reads. Each must be kept equal by hand. | should-fix (small) | `effects/triggers.ts` 120, 408 | Recommended: move `beliefOf` to a module with no global hooks and import it in both; export the stat list from `condtable.ts` beside `modsOf`. |
| 16 | P2's sugar is narrower than its shape: rev4 says a `grant_action`'s nested effects ARE `when: acted, if: {action}`; built, only nested effects that say `when: "acted"` are lifted (others still run as the default action's). Two ways for one thing until P6. | note (call 3 in section 6) | `effects/collect.ts` 75-87 | Accept for now; P6 should make the default action's nested effects run on `acted` and retire the other path. |
| 17 | Vanish's new data `if` (`self_sight`, `self_lacks`) is read by nothing: the handler still decides. Dead data until P6. | note | `data/classes.json` 508-516; `classes/rev3.ts` 282-289 | P6 reads it, then delete the handler (the pin is there). |
| 18 | P3 `resource` `value: "all"` and `"zero"` do the same thing (take all of it). The spec names two words; nothing tells them apart (a "spend" event vs a "loss"). | note | `effects/triggers.ts` 255 | Fine until a listener needs the difference (Shadow's spend vs its loss when seen). |
| 19 | Lints: no baseline grew; `lint-item-ops` literals 98 → 90; text numbers 1407 → 1404; two new ratchets. The resource-spend lint now skips rows with a `setter` (Pressure): not a loosening (Pressure was not a row before). The window lint only matches `emit(`, not an alias such as `emitHook(` (no such call today). | note | `test/lint-costs.test.ts` 126, 176 | — |
| 20 | Numbers in code and tests: Finisher and Reactive Plate now read data (`effNum`); `prim-react.test.ts` falls back to a typed 3 for Pressure's Suppressed (`?? 3`); the Adamantile Knight's plate keeps its own `/ 10` and `3 → 2` (shelved, a second copy of Reactive Plate). | note | `test/prim-react.test.ts` 102; `classes/j.ts` 1163-1167 | Drop the `?? 3`; fold the Knight's plate onto the Defender's when the Knight returns. |
| 21 | Fog: nothing new reaches a view. `cb.reacting` is cleared before the action ends; the answered set is not in state; `eyes` is unset on every unit; a condition's `{source}` line goes through `say` and the log's sight marks like any other. | note | — | — |
| 22 | The `two-players` fog failure the builder saw once ("unseen foe-0 named"). Its check reads the host's truth and the guest's view in two separate `evaluate` calls, so a unit that moves between them is a timing race; nothing in this step writes a unit id into saved or viewed state (`cb.reacting` is transient). Green here in the full group (500 s). | note (a waiting fault, not reaction order) | `apps/web/e2e/two-players.mjs` 74-84 | Recommended: read truth and view in one round trip (or retry the check once) |

## The "Not moved, with reasons" list

- **Toxin (P4):** sound. A coat row needs `via` on op `condition` and a weapon predicate; contradiction 7 rewrites Toxin
  as gear anyway.
- **Riposte (P1):** sound. The fold is a rule change (one Riposte, the Breaker's Momentum as item ops) and belongs to
  step 3 with its golden lines.
- **P5's handlers:** the reasons are sound, but they show **P5 as specified is too narrow for the list it says it
  deletes.** Step 1b must add, as general rows, not handlers:
  1. `via` on op `condition` (the save is against the named skill's strength, as `deal`'s `via`): Lingering Dread, Grim
     Reaper, Toxin.
  2. a `targets` field for witnesses: `sees: true` (the unit has line of sight to the centre's tile; Blinded can't), so
     "every enemy who saw it fall" is data: Lingering Dread, Grim Reaper.
  3. **standing auras**: a `stat_mod` (or a save term) with `targets`, answered for every unit in the set while the holder
     stands (War Footing, Born Officer, Live to Fight Another Day, Squad Anchor, Trench Poet, Nothing Left to Fear). This
     is a new primitive form, not a row: **the lead should rule on its shape before 1b builds it** (it touches
     `statQuery` for every unit near a holder: needs the same "anyone listening" gate as finding 13).
  4. with P8: `tied`, `aims_at` in `TARGET_FIELDS`.
  Rally (P6's `reach`/`if`), Rally Cry ("the best counts", per-unit end) and The Name They Whisper (story state) stay
  handlers with reason.

## What step 1b must add (beyond rev4's rows 7 to 11 and section 6)

1. Findings 7 and 8 (one step key with a walk serial) and 9 (every `react()` resolves in `fn`), with Reflex in step 3.
2. Finding 13 (`always_seen` in the fog and the AI), finding 14 (`acted` from the AI), finding 15 (one copy each).
3. The P5 extensions above (`via` on `condition`, the witness filter, the standing-aura form once ruled).
4. `event:amount` on `dealing` (finding 4) and `event:over` on heals (the builder's item 9).
5. P6 retires Vanish's handler and the default action's nested-effects path (findings 16, 17).

## Calls that need the lead

Findings 10 (Order: a reaction or not), 11 (Anchor's strike: protect or attack), 12 (Drink It In and helping Calls:
protect?), and the standing-aura shape (P5 list, item 3). The builder's other calls (section 6 items 2 to 6) are sound.

## Checks on this branch

- `python3 tools/validate.py data`: 0 errors. `npm run check`: ALL GREEN (after regenerating `docs/ENGINE-HOOKS.md`, stale by
  line numbers). `REPLAY_FULL=1` replay-hash: 29 passed, no stream moved by the fixes.
- `npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`: the builder's 9 smells (re-wrapped old lines), nothing new.
- `npm run e2e -- smoke two-players coop-stall reload turn-order faith-pg physical-pack`: ALL GREEN, 9 suites (8.6 min), two-players included, run together on this machine.
