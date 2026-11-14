# Survival, build step 5: stages, boons and the next tile (hand-off, 13 Nov 2026)

Spec: `docs/design/survival-spec.md` (draft 4) rules 3, 4, 6, 19, 30 to 32, 35, section 3.5, section 10 row 5. Rules:
`docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.44**, items **3100 to 3121** (every number PROVISIONAL; item 2814
settled). Branch: this worktree's (`worktree-agent-ac92a3a0de5538160`), from `claude/charming-gauss-hbq4n0` at 71750004.
No version bump; nothing deployed. Not touched: the shop and the path map's layout (step 4), the fight map's layout and
kit drawing (steps 7, 8); `RunScreen.tsx` gained one early return and lost its dead "stage cleared" block.

## 1. What was built

| Piece | Where |
| --- | --- |
| The six missing boons (Primed, Quick Hands, Field Mending, Bandolier, Tithe, Devout): all thirteen of spec 3.5 in data as `relic` items, each one number and a worth; `boon_pick` (offer 3), `world` (offer 3, min 2); each setting's `line`, `backdrop` (catalog id), `awaiting` | `data/survival.json` |
| What is offered and logged: `boonOffer`, `boonProblem`, `holdsBoon`, `boonServes` (a boon's `doors`), `nextTiles`, `nextPools`, `tileProblem`, `settingReady`, `settingCard`, `poolBoons`, `stageLog`, `stageLogFor`, `enterStage`, `renownOf`, `boonsOf`, `keptDraft` | `packages/engine/src/run/stage.ts` (new) |
| The reducer: `run/boon`, `run/tile`, `run/go` at a tile; after the Boss's picks the boons are offered (`runPicksDone`), then the tiles (`openTiles`), then stage N+1 (`runTile`); the stage's log (nodes, fights, won, foes dropped, credits, grade steps from `closeVisit`, boons); renown after every pay; the score on retire and on a loss (`runScore`) | `game.ts` |
| The run's state: `RunStageLog`, `g.run.boons`, `g.run.tiles`, `g.run.stages`, `RunEnd.renown / boons / stages`, `RunFight.kills`; `leanWinner(g, now, order)`; `endRun(..., more)` | `run/state.ts` |
| Item 2814: `anchorDamage` (a required Elite or Boss over the pressure band takes a damage scale down to the cap) | `run/encounter.ts` |
| The graft reads the next tile's pools (`graftFor` via `nextPools`) | `run/progress.ts` (one line) |
| Tithe and Bandolier: `creditsFor`, `ammoMult` (the stats asked); `ammoPack` takes the multiplier | `run/rewards.ts` |
| Screens: `StageScreen.tsx` (boon pick: three large cards with a line glyph, name, sentence, worth against the cap; next tile: two or three cards with backdrop or plain panel, line, Boss, boon theme, placeholders, marks; Retire; the summary: score chips, a row a stage, each member's level, class and boons, "Keep as a draft", back to the room), `stageView.ts`, `boonIcons.ts`; the room's "The run's summary ›"; a run that has just ended shows its summary | `apps/web/src/game/`, `room.js`, `room.template.html`, `store.ts` |
| Tests: `test/survival-stage.test.ts` (26); `survival-encounter` (stage 3 now fully in band, `anchorDamage`); `run-state` (the new fields); the `survival` browser suite's own section (10 checks) | |
| ART-REQUESTS S5 (thirteen boon icons), S6 (six tile backdrops, delivered on the art branch, not merged), S7 (two Boss portraits; renumbered at the merge with step 4b) | `art/briefs/ART-REQUESTS.md` |

## 2. Built from

| Rule | Primitive |
| --- | --- |
| Endless stages, the stage term (3, 19) | `pathMap(seed, stage)` / `mapNodes`; `budgetFor`, `foeLevel` / `eliteUp`, `nodeXp`, `nodeCredits`, `stageCeiling` (all read `stage.*` and `rewards.ceiling` already); `newScene` |
| Level 20 and renown (6) | `xpForLevel(20)`, `c.xp` |
| Boons as relics, run by the runner (30) | the `relic` kind (`addItems('relic')` in run/power.ts), `c.relics`, `runTriggered`; ops `damage_mult`, `grant_ap`, `roll_mod`, `floor`, `resource`, `cost_mod`, `use`, `mend`, `mend_mult`, `stat_mult`; triggers `dealing`, `taking`, `turn_ap`, `to_hit`, `would_drop`, `combat_start`, `combat_end`, `cost`, `reload`, `swap`, `heal`, `shield`; `limit` with a shared `key`; predicates `self_skill`, `self_alive`, `action`, `ap_above` |
| The cap (31) | `worthOf`, `capRoom`, `runWorth` (run/power.ts) |
| The pick and the tile's marks (11, 30, 32) | `rngFor`, `die`; `leanWinner` (given the tiles' order), `isHost` |
| The graft's next tile (42) | `boonsFor` over `nextPools` |
| The score and the summary (4, 35) | `endRun`, `g.run.stats.fights`, `RunVisit.steps` |
| Field Mending | **new trigger `combat_over`** + `mend` with an amount block (`self:max_hp`, no profile) |
| Bandolier, Tithe | **new stats `run_ammo`, `run_credits`** (spec 4.2 item 8) via `stat_mult` (`MULT_MAP`), asked with `statQuery` |
| Devout | **new resource row `devotion_xp`** (setter `devotion`: `itemDevotion` in faith.ts, inside `TAG_CAPS.session`, through `shiftDevotion`) and the op `resource` |
| Item 2814 | the encounter's own budget (`foeCost`, `shareOf`, `FoeSpec.scale.damage`) |
| The screens | `stageView` reads the engine (`boonProblem`, `worthOf`, `runWorth`, `settingCard`, `runRetireProblem`, `keptDraft`); the one hover card (`tipProps`, `openTipOn`) |

**New primitives** (each general, appended to its closed list): the trigger `combat_over` (hook `combat_over`, emitted
in `fightBack` before the write-back); the stats `run_ammo`, `run_credits`; the resource `devotion_xp` and its setter.
`docs/ENGINE-HOOKS.md` regenerated; `data/effect_ops.json` rewritten by `ITEM_OPS_WRITE=1`. No lint baseline grew.
`npm run built-from -- 71750004..HEAD`: **no smells**. One check widened, on purpose: `lint-costs`' resource path pattern
now takes a camelCase first segment (`devotionXp`, a field of the character itself); the rule it holds (a dotted
identifier path) is unchanged.

**Pins:** golden tables, `replays.json`: **nothing moved, nothing re-recorded** (no survival run is in the replays; the
new hook has no listener outside a run's relics). The survival replay guard now covers two stages.

## 3. How to add

- **A boon:** one row in `survival.json boons`: `id` (`boon.<name>`), `kind: "relic"`, `name`, `pools` (settings'
  pools), `worth` (percent of a rifle-turn; 0 for a utility boon), optional `doors` (door skills it serves), `effects`
  (item ops from the closed lists; a run economy answers `stat_mult` on `run_ammo` / `run_credits`), `text` with
  `{=placeholders}`, `adjudication: "engine"`, `provisional: true`. Then `python3 tools/validate.py data`, a line glyph
  in `boonIcons.ts` and a row under ART-REQUESTS S5. Its graft is made by `run/power.ts` at load.
- **A setting (a tile):** one row in `survival.json settings` (`kinds`, `boss`, `pool` with at least one boon, `line`,
  `backdrop` `survival-backdrop-<id>-a`, `awaiting`), a `names` row per new kind, a shop face (step 4). `settingReady`
  offers it as soon as its data is whole.

## 4. Open items

1. **Primed's other doors** (item 3106): Pressure (lives on a target), a free Bond (no primitive gives one), Flux −2 and
   Strain −1 (they carry between fights and `magicIn` restores them after `combat_start`, so a `combat_start` op is
   overwritten). Built: Guard, Momentum, Shadow. A general fix is a trigger after `magicIn`, or `magicIn` before
   `combat_start`; either moves the order of an existing hook, so it is the lead's call.
2. **A levelled character in another room** (item 3119): the kept draft is in the library, but `char/add` builds a level
   1 character from a sheet and Survival refuses above level 1. A campaign room taking a levelled sheet is a new door.
3. **Tile backdrops:** wired at the merge with steps 7 and 8: the 24 are in the catalog (`survival_art`, `survival-b01`..`b24`,
   review candidates); `npm run assets` emits each as `survival-backdrop-<setting>-<letter>` and the card draws it, else a
   plain panel (ART-REQUESTS S6, renumbered at the merge with step 4). Boss portraits for field and shrine are missing (S7).
4. **Placeholder settings** (item 3114): every setting but AHOC fights with stand-ins by name (`awaiting`).
5. Stage 2's foes dropped read 0 when every fight is skipped by `run/skip` (no foe falls); real fights count.
6. The Report a run bundle (step 6) can read `g.run.stages` and `RunEnd` as they are.

## 5. Calls made for Leon (each reversible)

1. A boon's `doors` (Primed offered only to a door it serves) (item 3105).
2. Spec 3.5's "shrine" pool read as `faith` (item 3112); machine's pool holds one boon, the pick fills from every pool.
3. Field Mending heals the living, on a new trigger before the write-back, with no Level term (item 3108).
4. Bandolier doubles cores too ("one more core" for the one-core pack) and a picked gun's share (item 3109).
5. Tithe on node pay only (item 3110). Devout inside the 6-a-session tag cap (item 3111).
6. The next tiles are known all stage (pure on the seed), so the graft reads their pools (item 3116).
7. Retire is open at the boon and at the tile (item 3118); the summary shows first when a run ends.
8. The kept draft is named "Name (level N)" so it never replaces the level 1 sheet in the library.

## 6. Proof

- Engine: `test/survival-stage.test.ts` 26 (each boon through its door with its number from data, its worth on the cap;
  the pick, the cap's utility swap and refusals; the tiles and their pools; the tile's marks, tie and the host's go;
  stage 2's fights inside their bands with the stage term; retire and the wipe's score; renown; the kept draft; a
  seeded two-stage run replays to the same hash, a save and load in the middle changing nothing);
  `survival-encounter` (stages 1 to 3 every fight in band), `survival-run`, `survival-progress`, `run-state`; pins
  (golden, replay-hash, lints, item-ops, old-save, oracles, balance-contract, amount-literals, datatext,
  text-number-truth) green, nothing re-recorded.
- Browser: `survival` 33 of 33 on port 8981 (`FAST=1 DSF=2`).
- Screenshots (deviceScaleFactor 2), in
  `/tmp/claude-0/-home-user-Project-Heaven-Cry/40abf8cd-77d7-5315-b669-cee39d0cd8b9/scratchpad/step5-shots/`:
  `survival-boon-pick-1280.png`, `-1920.png`, `survival-next-tile-1280.png`, `-1920.png`, `survival-summary-1280.png`,
  `-1920.png`, `survival-stage-2-map.png`.
