# Engine guide: read this before you extend the engine

One page for an agent about to add or change something under `packages/engine/` (or the client's boundary with it).
It collects; it does not decide. Every rule below comes from a hand-off in `docs/design/handoffs/` (called H:name
here, for example H:engine-foundations-1), and each row says which section has the detail. Function and file names
were checked against the code on 12 Nov 2026. Where this page and the code disagree, the code and its test win: fix
this page.

Paths are from the repo root. Engine source is `packages/engine/src/`, engine tests `packages/engine/test/`.

## 1. The five rules

1. **One primitive per concept.** A save, a price, a limit, a condition, a push, a "which tiles", an amount of
   damage, a legal action each have exactly one door. Do not write a second one in a lane file (`perks/`,
   `classes/`, `physical/`). Each door has a lint test that fails with a sentence saying what to call instead.
2. **Numbers live in data.** A number the rules state goes in `data/*.json` (an `amounts` block, `numbers`, an
   effect's `value`, `rules.json`, `actions.json` `costs`), is read by the engine, and is named in its text by a
   `{=placeholder}`. Never type it into TypeScript or into a text. The lints count literals and only let the count
   go down.
3. **Pin, then move.** Before you refactor or re-express something, record what it does now (a golden table, a
   replay hash, a roll digest). Commit the pin on the old code. Then move the code. A pin that moves when you meant
   to change nothing means your change is wrong: fix the change, do not re-record.
4. **Spec first, then data, then the validator.** `docs/rules/PHC-Core-Rules-v1.0.md` is the source of truth; if it
   and the data disagree the data is the bug. Change the spec, then `data/`, then `python3 tools/validate.py data`
   (must print `0 errors`). Never invent a number silently: mark it `provisional: true` and list it in spec section 14.
5. **The engine decides, the client asks.** A screen never types a cost, a range, a legality check, a target list
   or a sight test, and never copies a fight. It renders what the engine returns (`basicActions`, `actionsFor`,
   `previewDescriptor`, `moveOptions`, `reachTiles`, `viewFor`). If a screen needs an answer the engine does not give,
   add the answer to the engine. `apps/web/src/game/boundary.test.ts` fails when the client breaks this. The same
   goes for the Narrator: it asks for checks, the engine owns the numbers (about 90% engine, 10% Narrator).

Also always: the engine is deterministic and fast (section 4: replay guard, H:engine-performance-1 section 6). No
`Math.random`, no `Date.now`; every die comes from `g.rng`; the number and order of dice and the iteration order are
part of the rules; replace shared objects, never write into them.

## 2. I want to add X

"First look" is where to start reading. "Write it" is the shape to produce. "Proof" is what fails or passes.

| I want to add | Write it here | Call this | Proof | Detail |
| --- | --- | --- | --- | --- |
| A perk, trait, class move or relic that is "when X, if Y, do Z, at most N per scope" | Data only, in the item's `effects`: `{op, when, if, limit, and, say}` using the closed lists in `data/effect_ops.json` `item_ops` (30 triggers, 54 predicates, 18 ops). Then `python3 tools/validate.py data` | nothing; the generic runner `effects/triggers.ts` `runTriggered` runs it. Do not write a `register({...})` | `test/item-ops.test.ts` (well-formed, lists equal data), `test/lint-item-ops.test.ts` (a new handler fails), the validator | H:engine-foundations-3-item-ops sections 1, 2, 7 (worked examples for a perk, trait, class move, relic) |
| ...same, but no trigger, predicate or op fits | One line in `TRIGGERS`, `PREDICATES` or `OPS` in `effects/triggers.ts` (what it reads, `about` in words). Then `ITEM_OPS_WRITE=1 npx vitest run --root packages/engine test/item-ops`, and add the op to `data/effect_ops.json` `items` as a `core` row. Never test an item id inside the runner | `triggerProblem` checks the shape | `test/item-ops.test.ts` | H:engine-foundations-3-item-ops section 7 rule 2 |
| ...but the shape really does not fit (a private clock, its own log lines, the story half, an area) | A bespoke handler in the lane file. Read its numbers with `num(h, 'key')` (`effects/num.ts`) from the item's `numbers`, never a literal | `num`, `uses(h)`, `price`, `applyCond`, the rest of this table | The literal count in `lint-item-ops.test.ts` only goes down | H:engine-foundations-3-item-ops sections 6, 7 rule 4 |
| Moving an existing handler into data | First add a situation to `test/golden/itemops.ts` and record it ON THE OLD CODE (`GOLDEN_RECORD=1`), commit; then write the data and delete the handler; run the pins; then `LINT_RECORD=1 npx vitest run --root packages/engine test/lint-item-ops` and add the id to `DATA_ONLY` in that test | | `test/golden-itemops.test.ts`, replay guard | H:engine-foundations-3-item-ops section 7 rule 3 |
| A basic action (any unit, no item behind it) | Spec; one entry in `data/actions.json` (`id`, `name`, `tab`, `type`, `ap`, `site`, `text`); the function in `combat.ts` / `tactics.ts` and its `case` in `game.ts`; one `row(...)` in `basicActions()` (`actions.ts`) and, if the cost depends on a pick, a branch in `basicCost()`; a case in `test/actions.test.ts`; no client change (it appears through `actionsFor`, next row). A "can't do this at all" check is its own small exported function (like `hideBlock`) | `price({cb,u}, site)`, `basicActions`, `basicCost` | `test/actions.test.ts` (a row's cost is what the reducer takes), `boundary.test.ts` | H:client-boundary-1 section 7 |
| An action, or a whole action system (relics, Weapon Arts, the area map's actions) | An `ActionSystem` object: `registerActions({ id, owns, list, send, preview? })` in `descriptors.ts`. `list` returns descriptors (`id`, `group`, `name`, `cost` from `price()`, `available`/`why`, `picks`). Use `x.seen` (the viewer's fog), never `x.cb`, for choices. A bespoke panel is a `kind: 'custom'` pick with a `renderer` name | `actionsFor`, `previewDescriptor`, `sendDescriptor`; client `apps/web/src/game/actionFlow.ts` `flowView` (no client change needed) | `test/descriptors.test.ts` (every legal descriptor through `sendDescriptor`, the `test:taunt` worked example), `apps/web/src/screens/combat-actions.test.ts`, `boundary.test.ts` | H:client-boundary-3-actions section 6 |
| An action a weapon grants, a technique, a Call, a prayer, a perk or class action | A weapon's: a row in `weaponActions()` (`combat.ts`). Technique/Call/prayer: their data file and handler. Perk/class action: the item's `actions` (`effects/actions.ts`). All appear in `actionsFor` by themselves | | `test/descriptors.test.ts` | H:client-boundary-1 section 7; H:client-boundary-3-actions section 6 |
| A passive that should show what it waits for on the Perks tab | One entry in `data/perk_cards.json` (`id`, `tier`, `trigger`, `standing`) | `perkCards` (`perkcard.ts`) | validator | H:client-boundary-1 section 7 |
| "What would this do?" (a preview) | `dryRun(g, cb, unitId, (cb, u, rng) => fn(...))` or `previewAction` (`preview.ts`); read `.err`, `.ap`, `.u`. Never copy the fight, never `bindGame` (use `withGame`), never set `cb.mods` (use `fightWith` / `{ mods }`) | `dryRun`, `previewAction`, `moveOptions`, `reachTiles` | `boundary.test.ts`, `test/shared-state.test.ts` | H:client-boundary-1 sections 1, 2 |
| A condition | A row in `data/conditions.json` (copy a like one; fields in `data/CONVENTIONS.md` "Conditions") and `python3 tools/validate.py data`. That is all. Numbers the engine applies go in the row's `effects` in a form `condtable.ts` reads; a new kind of number is added to `CondMods` / `modsOf` and to `COND_READS` in `tools/validate.py` | `applyCond(cb, rng, by, target, id, rounds?, fam?, { via })` (`magic.ts`); read with `condOn`; end with `endCond`; `setCondRounds`, `clearConds`, `cleanseList`. A hit's condition: `{ skipSave: true }`. A unit's own choice: `setProne`, `hide`, `reveal`, `hideAgain`; unit states: `setBraced`, `stagger`, `setDowned`, `setNailed` (`unitstate.ts`); injuries `rollInjury`. Never write `target.bleed = 3`, `u.prone`, `u.braced`, `u.conds[...]` | `test/lint-conditions.test.ts`, `test/golden-conditions.test.ts` | H:engine-foundations-2-conditions section "How to add things" |
| Make an item immune | Data: `{"op":"immunity","to":"<condition id, family:body, bleed or knockback>"}`. Code: cancel on the `cond_apply` hook, or answer stat `immune:<id>` | | the conditions golden table (both doors) | H:engine-foundations-2-conditions rule 6; H:engine-foundations-1 rule 6 |
| An AP cost, or a resource cost | Spec; `data/actions.json` `costs` (`"my_verb": {"ap": 2}`) and the id in `COST_SITE_IDS` (`effects/stats.ts`). A resource: a row in `actions.json` `resources`. In code: `const p = price({cb,u}, 'my_verb'); whyNot(cb,u,p); pay(cb,u,p)`. An item's action declares `ap: 'data', res: {charge: 3}` | `price`, `whyNot`, `pay`, `canPay`, `apFor`, `apMeter`, `spend`, `refund`, `freely`, `grantPerkAp`, `bankAp`, `grantAp`, `loseAp` (`effects/cost.ts`, `effects/ap.ts`). Never read, compare or write `u.ap`; never type `'Needs n AP.'` | `test/lint-costs.test.ts`, the `golden-costs*` tables | H:engine-foundations-2-costs "How to add things" 1 to 8 |
| An item that makes something cheaper | Data: `{"op":"action_cost","action":"<site>","value":-1,"min":1}`. Code: the item's `stat:` answers `'ap_cost:<site>'`, or listen on the `cost` hook (`ctx.action` is the cost SITE, `ctx.min`, `ctx.free`) | | `lint-foundations.test.ts`, `golden-costs*` | H:engine-foundations-2-costs rule 4; H:engine-foundations-1 rule 9 |
| A limit, cooldown or "first X of the fight" | `uses(h).take('per_turn')`, `.left`, `.first('kill')`, `.cool(3)`, `.coolLeft(3)`, `uses(h).on(target).take('per_round')` (`effects/uses.ts`). In data: `"limit": {"per": "per_turn", "n": 1}` or `{"cooldown": 3}`. A new scope is one row in `SCOPES` and one line in `stampOf`. Never keep a round number in `stateOf(h)` and compare it with `cb.round` | `uses` | `lint-costs.test.ts` (the hand-kept stamps ratchet), `golden-costs*` (`.marks.json` moves when a counter moves to `uses()`) | H:engine-foundations-2-costs rules 9 to 13 |
| A number the engine asks items for (a stat) | Add its id to `STATS` in `effects/stats.ts`; ask with `statQuery(x, '<id>')`; answer in the item's `stat:` (or data `stat_mod`) | `statQuery` | `test/lint-foundations.test.ts` (a stat answered and never asked fails) | H:engine-foundations-1 rule 9 |
| Damage, heal or shield amounts | Spec; an `amounts` block on the item (`kind`, `base`, `per`, `profile`, `type`, `armour`, `mults`; shape in `data/CONVENTIONS.md` "Amount blocks"). Profiles (aimed, landed, flat), the Level table and `factors` are in `data/rules.json` `output`; each system's dial is in `output.systems` (the register, in the order the terms multiply). A plain deal/heal needs no code: ops `deal` and `mend` in `effects/core.ts` | `itemAmount(key, name, mults, counts)`, `amountMult`, `amountBlock` (`effects/amounts.ts`); the formula is `effects/output.ts` (`PROFILES`, `statOf`, `openAmount`, `closeAmount`, `armourAgainst`, `landed`, `factorOf`, `deal`, `mend`). Never hand a typed number to `harm`, `hurtUnit`, `heal`, `healUnit`, `grantShield`, `applyDamage`. A missing block throws; there is no silent 0 | `test/amount-literals.test.ts`, `test/output*.test.ts`, the 14 `golden-damage*` tables | H:unified-damage-stage-a sections 2, 11, 14; H:balance-refit section 2 |
| An item's multiplier on a blast, trap or thrown item | Tag the item `damage_kinds` (`blast`, `all` or the kind) in data; untagged items do not hear a blast | `hurtUnit` fires `damage_out` for `explosion`, `trap`, `thrown` | `test/output-a7.test.ts` | H:unified-damage-stage-a section 12 (4) |
| A save, a roll or a contest | Never call `d20(`. A save: `saveAgainst(cb, rng, by, target, 'body', 'brain' or 'heart', id, { via })` (`magic.ts`), use `sv.ok` / `sv.text`. A condition with a save: `applyCond`. Any other check: `rollVs(cb, rng, { by, mod, tn, why })`; two rollers: `contest`; a TN is `TN.standard` etc. (`rolls.ts`) or `saveTn(by, via)`, never a literal 12. To change saves: listen on `save` (every save) or `cond_apply` (`ctx.saveAdd`, `ctx.tnAdd`, `ctx.pass`, `ctx.fail`, `ctx.cancel`, `ctx.skipSave`) | `saveAgainst`, `rollVs`, `contest`, `rngOf(h, ctx)` (`kit.ts`; throws with no rng) | `lint-foundations.test.ts`; the roll digest and `golden-rules` tables | H:engine-foundations-1 rules 1 to 4, 8 and "a save is a save" |
| Forced movement (push, pull, throw, teleport, swap) | A row in `data/rules.json` `forced_movement` for a new kind | `displace(cb, rng, unit, { away|toward|tile, tiles }, { by, how, source, willing?, preview? })`, `swapUnits` (`combat.ts`). Never write `unit.pos =`. Unpushable: `{"op":"immunity","to":"knockback"}` or cancel the `forced_move` hook | `test/golden/moves.json` (14 movers x 29 cases), `lint-foundations.test.ts` | H:engine-foundations-1 rules 5, 6 |
| Geometry, selectors, "who is in it" | Nothing new: use the kit. Areas are `{shape: 'burst', 'aura', 'cone', 'line' or 'band'}` | `kit.ts`: `tilesAround`, `tilesLine`, `canStand`, `foesOf`, `alliesOf`, `inArea`, `tilesIn`, `unitsIn` (`{ downed: true }` for a blast). No filter over `cb.units` for "the enemies", no cone or `dist(...) <= r` test in a lane file | `lint-foundations.test.ts`, `lint-conditions.test.ts` (a private cone or blast test), `golden-rules` | H:engine-foundations-1 rules 7, 8; H:engine-foundations-2-conditions rule 11 |
| A number inside a text | Never type a digit. Write `{=path}`, with an optional format after a bar (`abs`, `signed`, `pct`, `more`, `less`), naming a field of the same item, e.g. `{=effects.0.value}`, `{=.ap}`. If the number has no field, add the field the engine reads and bind to it. A new data file with texts goes in the list at the bottom of `datatext.ts`; a new text key in `TEXT_KEYS` of `tools/text_numbers.py` | `packages/engine/src/datatext.ts`, `tools/text_numbers.py`. Bind old bare numbers with `tools/once/bind_text_numbers.py`, then `python3 tools/validate.py data --shrink-text-baseline` | the validator (`tools/text_numbers.json`: `allow` and a baseline that only shrinks), `python3 tools/text_numbers.py --mutate`, `test/datatext.test.ts` | H:text-number-truth section 8.a; `data/CONVENTIONS.md` "Text" |
| What a guest may see (fog) | A unit or a field naming one by id: nothing to do. A new thing on the grid that belongs to a side: add its list to the destructuring in `fogFight` and keep it for `me`'s side (the other side only on `vis.tiles`). A new fx event: name units by `unit`/`target`, tiles as `'x,y'` strings, `only: side` for one side's eyes, a walk carries `sight`. A secret that is not about sight: filter in `viewFor` by `playerId` | `fogFight` (`fog.ts`, called once by `viewFor` in `game.ts`); client reads `fightSight(cb)` / `cb.fog`. Never filter by sight on the client | `test/fog-view.test.ts` (add a line that searches the guest's serialised view), `boundary.test.ts`, `apps/web/e2e/two-players.mjs` | H:client-boundary-2-fog "How to add something a player must not see" |
| A line in the fight log | `say(cb, line)` (`log.ts`, re-exported by `combat.ts` and `kit.ts`; null-safe). Name units by their `name` in the text: `say` finds them and records, per side, whether that side sees each one NOW (write the line where it happens, after the move or hit it reports, not batched at the end). A line whose units the text can't name (or the Narrator's own words): `sayOf(cb, [ids], line)`, `[]` for nobody. At the top: `sayAt(cb, 0, line)`; take one back: `unsay(cb, i)`. Never `cb.log.push`, `unshift` or `splice` | `say`, `sayOf`, `sayAt`, `unsay`; `fogLog` (`fog.ts`) decides per viewer (spec item 1600 a: a line about none the side saw is not sent; one that also names a seen unit is sent with the unseen as "something unseen", their tiles as "somewhere unseen") | `lint-foundations.test.ts` (the log is written through say), `test/fog-view.test.ts` "the log", `two-players.mjs` `fogLeaks` | H:client-boundary-2-fog "The log" |
| A new system's balance, or a new weapon, word, school, prayer | Give it an amount and a profile; one dial in data named in `rules.json` `balance.ceilings.<system>.dial`; price one use with the budget rule; measure with `test/balance/refit-measure.ts`; fit with the dial only; add its ceiling to `rules.json balance` and its row to `SYS` in `test/balance-contract.test.ts` | `REFIT_MEASURE=1 REFIT_SYSTEMS=<yours> npx vitest run --root packages/engine test/balance/refit-measure.test.ts --silent=false` | `test/balance-contract.test.ts` (in `npm run check`, ~20 s; a failure names system, level and dial); `python3 tools/golden_diff.py --rev <base>` lists what moved | `docs/design/balance-contract.md` section 6; H:balance-refit section 7 |
| A speed-sensitive change | Follow section 6 of H:engine-performance-1 (no whole-map walk for one tile, build a set once per query, nothing per unit x per handler on a hook, no `JSON.stringify` in a hot path, a perk or relic is an item never a global `onHook`) | `counted(fn)` and `work(name)` in `kit.ts` | A test about speed counts work (`expect(work.planEvoke).toBeLessThan(n)`), never milliseconds. Replay guard | H:engine-performance-1 sections 6, 3 |

## 3. Where the numbers and ops live (quick map)

- Rules text and numbers: `docs/rules/PHC-Core-Rules-v1.0.md` (revisions 1.15 to 1.26 are in the repo spec only; a
  later revision overrides the body). Items 1500 to 1725 are the rulings of the engine and balance work.
- Data conventions: `data/CONVENTIONS.md`. Op registry: `data/effect_ops.json` (50 core ops the engine implements
  generically; 113 bespoke ops are per-item hooks; an op the engine does not recognise falls back to the Narrator with
  the item's `text`, never silently ignored). Every rule-bearing item has `adjudication: engine | hybrid | narrator`;
  move to `engine` wherever a trigger can be detected.
- One table each: conditions `data/conditions.json` (loader `condtable.ts`), actions and costs `data/actions.json`
  (`actions.ts`), perk cards `data/perk_cards.json`, forced movement `data/rules.json` `forced_movement`, the damage
  formula `data/rules.json` `output`, the balance contract `data/rules.json` `balance`.
- Data files with `{=...}` texts are filled at load by `packages/engine/src/datatext.ts`; `protodata.json` for the
  web is built by `python3 design/canvas-build/build.py --web` (`npm run check -- web` says STALE when it is out of date).

## 4. The guards

Everything here is in `npm run check` unless it says opt-in. Re-record only on purpose, name what moved in the commit,
and say why. A failing golden table prints the action, what it was and what it is. "State" lines are rules; "log" and
"marks" files are words and bookkeeping.

| Guard | Files | A failure means | Re-record on purpose |
| --- | --- | --- | --- |
| Data validator | `tools/validate.py data` | A data shape, cross-reference, op, trigger, amount block or text-number error | Fix the data. Shrink the text baseline: `python3 tools/validate.py data --shrink-text-baseline` (it never grows) |
| Spec tables | `tools/check_spec_tables.py` | A weapon, enemy or condition table in the spec differs from data | Fix the spec or the data (the spec wins) |
| Screen data freshness | `python3 design/canvas-build/build.py --web --check` | `protodata.json` is stale | `python3 design/canvas-build/build.py --web` |
| Damage tables (14 tables, ~5,466 lines, exact) | `test/golden-damage*.test.ts`, `test/golden/*.json` (`record.ts` lists the actions) | ANY damage, heal or shield number moved | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage`; `python3 tools/golden_diff.py --rev <base>` first |
| Rules tables | `test/golden-rules.test.ts`, `test/golden/rules-<section>.json` | Dice count or a state (tile, conditions, Prone, Bleeding, Braced, Nailed...) changed | State: `GOLDEN_RECORD=1`. Words only (`*.log.json`): `GOLDEN_RECORD=log npm test -w @phc/engine -- golden-rules` |
| Forced movement | `test/golden/moves.json` | A mover behaves differently in one of 29 cases | `GOLDEN_RECORD=1`, list the lines in the hand-off |
| Costs tables (~6,230 lines) | `test/golden-costs*.test.ts`, `test/golden/costs-<section>.json` | An AP or resource price, a refusal, or a limit's "again / next / later" moved | State: `GOLDEN_RECORD=1`. Counter location (`*.marks.json`): `GOLDEN_RECORD=marks npm test -w @phc/engine -- golden-costs` and read the diff |
| Cost review tables | `test/golden-costs-review.test.ts` (`costs-credit`, `costs-foes`, `costs-cooldowns`) | A mistake under a Brief or Encore; an enemy that stops affording something; a cooldown that changed length | `GOLDEN_RECORD=1` |
| Conditions table (~1,855 lines) | `test/golden-conditions.test.ts`, `test/golden/conditions.json` | A condition's apply/stack/tick/cleanse/immunity changed | `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-conditions`; words `GOLDEN_RECORD=log` |
| Item ops table (65 situations) | `test/golden-itemops.test.ts`, `test/golden/itemops-*.json` | A moved item behaves differently | `GOLDEN_RECORD=1` (the old code first when moving a handler) |
| Replay guard | `test/replay-hash.test.ts`, `test/golden/replays.json`, `test/helpers/replay.ts` | A whole seeded game (enemy AI on) differs: state hash, stream hash or a mark every 25 actions; it names the first mark | `REPLAY_RECORD=1 REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash` (only for a rule, number, simulator policy, enemy AI or saved-shape change on purpose). See what moved: `REPLAY_DUMP=<dir>`. Larger set before a merge: `REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash` |
| Oracles | `test/paths-order.test.ts` (tie order of `paths()`), `test/sight-order.test.ts` (who is sighted), `test/shared-state.test.ts` (`apply` shares campaign and archive lines; frozen in tests), `test/phys-dispatch-answers.test.ts` | The path tie-break, a sight result, a write in place, or an Answer's hand changed | Fix the change. No re-record |
| Old saves | `test/old-save.test.ts`, `test/fixtures/save-*.json` (three saves; never regenerate) | The saved shape broke a save from live 0.22.0 or the day before | Add a migration and a new fixture beside them |
| Roll digest (opt-in) | `test/helpers/roll-digest.ts`, `vitest.digest.config.ts` | A test's dice count or hash moved | `cd packages/engine && ROLL_DIGEST=record npx vitest run --config vitest.digest.config.ts` before a refactor, `ROLL_DIGEST=compare` after |
| Foundation lint | `test/lint-foundations.test.ts` | A raw `d20(`, a hand pass/fail, a new `unit.pos =`, a private kit helper, a fixed-seed rng, a stat answered and never asked, a `price(` of an action with no `costs` entry | Call the primitive the message names |
| Cost lint | `test/lint-costs.test.ts` | A hand AP check or write, a typed `Needs n AP.`, a resource paid by hand, a round number kept by hand (ratchets: counts per file only go down) | Call the primitive; lower the count only by removing the old site |
| Conditions lint | `test/lint-conditions.test.ts` | A direct write of a condition flag or unit state, `u.conds` written outside the block, a condition id with no row (or a row nothing uses), a private cone/blast test | Call `applyCond` etc. |
| Item-ops lint | `test/lint-item-ops.test.ts`, `lint-item-ops.baseline.json` | A new lane handler, a handler that only listens on hooks the item ops cover, or more numeric literals in handlers | Write it in data. After moving handlers: `LINT_RECORD=1 npx vitest run --root packages/engine test/lint-item-ops` (the list only shrinks) |
| Amount lint | `test/amount-literals.test.ts` | A number handed to a sink from code, HP written with a literal in `classes/` or `perks/`, a missing block, a block that drifted from its ledger line | Put the number in an `amounts` block; a re-fit changes data and ledger together |
| Texts read their numbers | validator + `tools/text_numbers.py` + `test/datatext.test.ts` + `test/text-number-truth.test.ts` | A digit typed into a text, a placeholder that does not render, or the engine and the Python tool disagree | Bind with `{=...}`; mutation check `python3 tools/text_numbers.py --mutate` |
| Test lint | `test/test-lint.test.ts` | A statement after a `//` on a test line (it is swallowed), or a skipped test without a dated reason (date plus three words) | Fix the test. Runs in `npm run check -- web`; `-t` runs skip it |
| Client boundary | `apps/web/src/game/boundary.test.ts` | A client file computes a cost, range or legality, calls `visibility(`, filters by sight, builds a `combat/*` action literal (except `end-turn`, `say`, `attempt`, `search`, `read`), or `actionFlow.ts` imports more than `actionsFor`, `previewDescriptor`, `stepOn` and types | Ask the engine; add the missing answer in `descriptors.ts` |
| Fog | `test/fog-view.test.ts` | The guest's serialised view (its log included) holds an unseen hostile's id, name or tile | Fix `fogFight` / `viewFor`; a log line: write it with `say` where it happens |
| Descriptors | `test/descriptors.test.ts`, `apps/web/src/screens/combat-actions.test.ts` | An action is unreachable or differs from what the old flow dispatched | Fix the system's `list` / `send` |
| Balance contract | `test/balance-contract.test.ts` | A system's all-in average (levels 1/5/10/20) left its band (+/-12%, each level +/-25%) | Fit the named dial in data; never add a literal |
| Suite shape | `test/suite-shape.test.ts`, `apps/web/src/e2e-groups.test.ts` | The balance folder left the default run, or a browser suite is in no group | Put it back / add the suite to `apps/web/e2e/groups.json` |
| Balance simulator smoke | `npm run balance` (not in `npm run check`) | A simulator policy or the enemy AI broke a whole simulated fight | Run it after such a change and before a merge |

Order to run things (docs/TESTING.md): `npm run check -- engine` (under a minute) while working, `npm run check`
before "done", `npm run try -- '<scenario>'` to SEE a rule, `npm run balance` and `REPLAY_FULL=1 ...` before a merge,
`npm run e2e -- smoke` for client changes. Do not open a browser for a rules question. Timed tests can fail on a busy
machine; re-run the file alone before believing a "timed out in 5000ms".

## 5. Known unfinished edges

From the "what is left" sections. None is a bug in what exists; each is where the next piece of work starts.

**Item ops** (H:engine-foundations-3-item-ops section 6)
- About 280 bespoke handlers are not data yet. Groups, in order: cost cuts with a private clock (needs triggers
  `move_cost`, `evoke_cost`, `outburst_cost`, `release_cost`), AP on a cooldown (`perks/cooldown.ts`), "the next X after
  Y" with log lines, area effects (needs a `targets` selector over `kit.ts` `unitsIn`), weapon tests, item actions (178
  handlers; needs previews as dry runs and a descriptor), the story half (needs a story runner), shelved classes
  (`classes/j.ts`, `classes/k.ts`, 62 handlers: do not move them), and 809 numeric literals in handlers (`perks/f.ts`
  101, `classes/i.ts` 98).
- Item ops run in a fight only, not on the area map.

**Costs and limits** (H:engine-foundations-2-costs "What is left")
- Specialised pipelines keep their own hooks (`attack_preview`, `move_cost`, `glyph_cost`, `evoke_cost`,
  `outburst_cost`, `release_cost`, `call_cost`) and pass through `priced()`; a gear change, a thrown item after its
  `throw` hook and an Outburst preview's planned Pumps are not on the `cost` hook yet.
- 36 resources are still paid by hand (the cost lint lists them by file); 54 `=== cb.round` compares remain
  (reactions in `tactics.ts` `useReaction`, a Call's helped/hindered mark, `fighttalk.ts` `attempted`, zone maps,
  technique state, unit flags).
- The area map's round pool (`g.story.ap`) has its own door in `game.ts` (`apLeft`, `spendAp`).
- The client asks four prices without the fight (`commands.ts` `weaponActions(u)`, `ventAp(u)`, `coreAp(u)`;
  `resources.ts` `reloadAp(u)`); nothing shipped changes another unit's price, so nothing shows yet.
- An enemy with a gun loaded round by round (scattergun, bow, breacher tube) never reloads and closes to melee.

**Conditions** (H:engine-foundations-2-conditions "What is left")
- Story conditions (`storyConds` / `setStoryCond`, bridged by `STORY_CARRY`) are a second system. No timed modifier
  an item can put on a unit (`applyMod`). Overwatch is a row with no setter (`u.overwatch` is written in ten places).
  MASK's two rounds and a deep ACID's extra Defense are private counters. The flag conditions draw no `cond` event.

**Rolls and forced movement** (H:engine-foundations-1)
- The `roll` event is emitted and not drawn (the transparent-dice read-out for saves is a client job). Five roll sites
  have no test. `forced_movement.<kind>.reactions` is read by `displace` and false everywhere.

**Damage** (H:unified-damage-stage-a sections 6, 10, 11, 14)
- Heals that skip `healUnit` (repairs, Field Fix, Miracles that set state) were not routed; each would move a number
  and is a ruling. About 35 multipliers inside hooks are still literals in `classes/` and `perks/`. The Stat term of
  Sigil, Outburst and prayers comes from the unit's cached multipliers, not the sheet. The enemy's and a companion's
  level is inside the enemy table (`level: null`). Sigil rounds, everything else floors; a ruling on "floor everywhere"
  is open.

**Balance** (H:balance-refit section 4; `docs/design/balance-contract.md` section 7)
- Not held by the contract: class moves, perks, Mastered perks, traits, weapon mastery, special rounds and mods, Calls
  and squad buffs, reactions, stealth openers, armour, enemy casters and the enemy Burst, Overdraw and Heart Overload.
  The melee ratio of 1.25 and Sigil's normal-share ratio cannot be held with one dial; CHAIN is 17% over its area rule;
  Boss HP was re-run and left.

**Performance and saves** (H:engine-performance-1 sections 4, 6)
- The finished fight's duplicate objects are still in the saved state (the fight screen draws all of it). A read is not
  pure: `stateOf` creates an item's bag on first read, so a preview leaves bags (compare with `withoutPs` in
  differential tests). `apply` copies the state except `campaign` and archive lines. `persist()` writes right after the
  action on the next task, not in the action, so a crash can lose one step.

**Client boundary** (H:client-boundary-1 section 6, H:client-boundary-2-fog "What is not done", H:client-boundary-3-actions section 7)
- The fight log is fogged (item 1600 a) by finding units by name in each line: a line that names a unit only by a
  word that is not its name ("the drone") is every side's. A walk seen at both ends sends its middle through the fog; the other side's zones are forgotten when they leave sight.
- The combat screen is not split (finding 8, `renderVals`, not started). The story and area map (`main.js`) is not on
  descriptors; the turn card's `smartCommands` still prints a few costs; the magic panels still write their own
  words; a Move's hover route is the screen's. The base costs in `actions.json` are also typed in the action
  functions (`actionAp({ u }, 'shove', 2)`); `test/actions.test.ts` fails when the two differ.

**Texts** (H:text-number-truth sections 8.a, 10.6, 10.8)
- About 1,407 bare numbers remain in the text baseline (spec item 1515); numbers in words ("twice", "half"), `rules.json`
  prose and `attributes.json` formula strings are not checked. Open rulings for Leon: spec items 1500 to 1513, 1640 to
  1646.
