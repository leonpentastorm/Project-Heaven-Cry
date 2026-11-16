# Survival: the pick-up (14 Nov 2026, at the close of build steps 9 and 10)

> **16 Nov 2026 (newest): 0.29.0 IS LIVE.** https://project-heaven-cry.leonpentastorm.workers.dev serves 0.29.0 (`assets/index-CS0sQSbu.js`); `main` = `develop` = 98772514; `backup/live-0.29.0` pushed. What shipped: `CHANGELOG.md` 0.29.0 (rules 1.56, "Balance 2.0": the nine doors, mods as data and as rewards, special rounds by calibre, variants as data, the melee profile). 0.28.3 was the version before. Where anything below says 0.29.0 is not deployed or live is 0.28.x, it is older.
>
> **Live check of 0.29.0 (`--no-build --jobs 2`): 5 of 8 suites passed.** Passed: creation-points 97 checks, survival 189, room 27, shadow 18, tending 28. Failed even alone: old-save (1 check, `page.reload` timed out at 30 s waiting for the load event), fight-cards (14 checks, same), figments (0 checks, `page.goto` timed out at 30 s). Locally all three pass (old-save 4, fight-cards 22, figments 17; figments also failed beside the others with the same `page.goto` timeout and passed alone, so it is flaky under parallel load). Cause not confirmed: all three are 30 s waits for the load event, not assertion failures; the live app does not appear faulty. A guess: the load event stays slow because of the roughly 147 resources fetched. Title shows 0.29.0; the root HTML took 0.76 s and the JS bundle 0.69 s by curl; in the browser DOMContentLoaded was at about 1.63 s with the title text rendered, loadEventEnd still 0 after 1.5 s.
>
> **Backups kept:** `backup/live-0.29.0` and `backup/live-0.28.3`, plus `backup/live-0.22.0` and `backup/live-0.23.0` for good (`backup/live-0.28.2` deleted as the third).
>
> **Open / what comes next:**
> (a) Built and green on their own branches, NOT merged, to ship together as the next version: the fight-tab settings, Scuff on Utility with a mirror on the Sigils tab, and the bare-handed Outburst warning (`origin/wip/lane-0.29-tabs`, head 00aff2c3); a shield in either hand (`origin/wip/lane-shield-either-hand`, in review); the follow-strike design (a tag on an off-hand item that rides each main-hand melee attack; `origin/wip/design-follow-strike`, a draft).
> (b) Rulings waiting on Leon: a held Outburst does not swell on a turn in which you gained Guard (lead's proposal, not built); bare-handed Outbursts made truly harmful (+2 Strain per stage, no free swell; lead's proposal, not built; today the only cost is +2 Strain per Begin, `data/soul_modules.json` `cycle.no_emanator_strain`); rows inside a fight tab can still shift when a verb unlocks (needs one row-order rule in the engine's list).
> (c) Known faults live in 0.29.0 from the playtests: the Open guard -2 is shown only on the glove's card, not in the fight; a stim used on a full-HP ally through the Hand's Hand over is spent for +0 HP (the stim rule counts it as tending: needs a ruling); a Chaplain can get two door tips in one fight (a fight has no id to key by); the SHADOW meter row is clipped at 1600x900; an Operative opens its first Survival turn on ATTACK because Hide is refused while seen (`doorView.ts:58`); the fight log still says "uses Cut" for gloves (the menu says Strike); not verified in a browser: Set Against the Blow, Retort, Near Miss, Flush Out, Charge, fitting a mod at the Forge.
> (d) The consolidation pass before the next system and the number-fitting pass (party budget per head, gun and solo tank outclassing, forks for five doors via `door/pick`) are owed: see `docs/design/proposals/2026-11-nine-doors-report.md`.



> **15 Nov 2026 (latest): 0.28.2 IS LIVE; this block is newest, where anything below says otherwise it is older.**
>
> **LIVE: 0.28.2** (15 Nov 2026) at https://project-heaven-cry.leonpentastorm.workers.dev. `main` = `develop` = 8d651fb1; `backup/live-0.28.2` pushed. Title shows v0.28.2. It carries the fixes from Leon's playtest of 15 Nov (rules 1.55 items 27 to 44): the field's actions and action bar, hand-overs and stims on the map, health words on tokens, Figments shown (movement, icons, a FIGMENTS section, designs), the Sigil word cap warnings, and Survival XP pace (`CHANGELOG.md` 0.28.2).
> **Backups kept:** `backup/live-0.28.1` and `backup/live-0.28.2`, plus `backup/live-0.22.0` and `backup/live-0.23.0` for good (`backup/live-0.28.0` deleted, now the third latest).
> **Next, 0.29 "Balance 2.0"** is on branch `feature/0.29` (origin `wip/feature-0.29`). Merged lanes: mods as data, recoil field, special rounds by calibre, mods in Survival, melee damage from Strength / Agility, Pull Out only when stuck, variants as data, display. A fix wave is running; then 0.28.2 is merged in; then the alpha-perk revamp (`docs/design/proposals/2026-11-alpha-perks-revamp.md` on `origin/wip/design-alpha-perks-revamp`; Leon's rulings: perk ids kept with no re-pick; perk steps sit on top of the class ceiling), Figments 2.0 (`origin/wip/design-figments-2`, `docs/design/proposals/2026-11-figments-2.0.md`; rulings: the glove is always required, swap places is the Rigger's only, the Hand carries a real stim from the owner's pack) and Bonds 2.0 (`origin/wip/design-bonds-2`, `docs/design/proposals/2026-11-bonds-2.0.md`; rulings: the per-Bond damage bonus stays and the Bond menu shows its percent, the thread kind is picked at every Bond, Pass It On stays on the standard Attuner for now, enemy medics get Tug and Snap one release later). Then number fitting and Leon's word before any 0.29 deploy.
> **Art:** the artist's Figment art is on `origin/art/figments-2026-11-15` (14 portraits, 24 icons), being integrated on `origin/wip/art-0.29-figments`.
> **Known and open from the 0.28.2 gate:** the browser suites slate, slate-title, slate-music, title, resources, turn-card-side and sigil15-growth pass only when run alone (page-load timeouts at `--jobs 4`); voice has a timing check that depends on the voice model loading slowly; a test worktree needs `npm run assets` before browser suites (creation-points fails 4 layout checks without web images); tending.json's Bond card numbers are copies of the effect values and no validator check ties them yet; on the field after a fight, fight-only actions (techniques, Calls, hide, overwatch) are refused and field actions do not animate; 37 minor actions are refused on the field on doubt until a per-action data flag exists (planned for 0.29).
> **Deploy on this PC** is done by hand with the wrangler OAuth login and `wrangler kv bulk put` (`tools/deploy_site.py` needs a token).
> **Live check:** creation-points: page.goto to the live site timed out (120 s, load event) in both runs, 0 checks; survival: 176 of 184 checks ran and passed, then C2 (the host's mark on the guest's map) timed out waiting for a node (30 s) alone too, and the first run had ERR_CONNECTION_CLOSED on images; room: 27 checks passed alone (first run failed waiting for the camp). Page-load and latency timeouts against the slow live site, not logic failures; the title shows v0.28.2.
>
> **15 Nov 2026 (later): 0.28.1 IS LIVE; this block is newest, where anything below says otherwise it is older.**
>
> **LIVE: 0.28.1** (15 Nov 2026) at https://project-heaven-cry.leonpentastorm.workers.dev. `main` = `develop` = 8e51df38; `backup/live-0.28.1` pushed. It carries rules 1.55 (the latest spec revision): the field after a fight (walk the map, pick up, then everyone marks Leave the field), no magazines after a fight, scarce drops, the camp's offers (only what you can use, within the camp budget), the Magazines shelf, and weapon mods fitted only at the Forge for a fee (`CHANGELOG.md` 0.28.1). Title shows v0.28.1.
> **Live check:** creation-points 97 checks, survival 184, room 27 passed. `old-save` and `fight-cards` failed even alone: `page.reload` timed out (30 s) waiting for the load event, because the page's many images were still loading from the live site; the title itself loaded and shows v0.28.1. Not a game logic failure; to be looked at (raise the reload wait for live runs, or check how fast the live site serves its images).
> **Backups kept:** `backup/live-0.28.0` and `backup/live-0.28.1`, plus `backup/live-0.22.0` and `backup/live-0.23.0` for good (`backup/live-0.27.3` deleted, now the third latest).
> **Branches:** all merged 0.28.1 branches and their `wip/*` pushes are deleted, and their worktrees removed. Unmerged and kept: `feature/0.29` and `wip/feature-0.29` (the 0.29 work), `art/survival-foes-2026-11-14`, `feature/title-front-v6`, `review/fable-first-read`, `wip/worktree-agent-a4c26f7ceb4409c36`.
> **Left out of 0.28.1, for 0.29** (CHANGELOG): Pull Out shown on every melee pad; Pull Out in a browser room (the stuck mark stayed once); the extra mod slot perks still fit free; the mods that pass the guns' 145% ceiling.
>
> **15 Nov 2026: 0.28.0 IS LIVE; this block is newest, where anything below says otherwise it is older.**
>
> **LIVE: 0.28.0** (15 Nov 2026, on Leon's word) at https://project-heaven-cry.leonpentastorm.workers.dev. `main` = `develop` = f1bc51f8. It carries Survival (live since 0.27.x), rules 1.54 (materials and making, the slower climb, the side panels in every mode), the skill road map, the fight cards and Survival's music (`CHANGELOG.md` 0.28.0).
> **Live check** (`python tools/e2e.py old-save creation-points survival room fight-cards --no-build --base <live url> --jobs 2`): GREEN, but `old-save` failed beside the others (page.reload timeout, 30 s; log `.check/e2e/old-save.first.log`) and passed alone (4 checks, 66 s); creation-points 97 checks, survival 148, room 27, fight-cards 22. Title shows v0.28.0.
> **Backups kept:** `backup/live-0.27.3` and `backup/live-0.28.0`, plus `backup/live-0.22.0` and `backup/live-0.23.0` for good.
> **Deploy on this PC** goes through wrangler OAuth and `wrangler kv bulk put`, because `tools/deploy_site.py` needs a token.
> **Open / what comes next:**
> (a) Balance 2.0: draft `docs/design/proposals/2026-11-balance-2.0.md`, awaiting Leon's answers. It takes two items the 0.28 review left: special rounds made at 2 gunpowder + 2 casings fit heavy guns; the fit simulator (`packages/engine/test/balance/survival-run.ts`) never makes or sells materials, so the 0.28 XP and stage fit is PROVISIONAL, and level 3 comes before the first Boss on 42% of most-fights routes.
> (b) Art: `art/briefs/GPT-PROMPTS-2026-11-15-everything-missing.md` (66 images); materials have lettered stand-in icons.
> (c) The consolidation pass CLAUDE.md requires before the next system is built on 0.28's additions is still owed.

> **Leon's word for 0.27.0 (14 Nov 2026):** "just focus on getting everything being work on to live for now". When the
> four pieces in flight are merged (the text pass, bows and quivers, the starting boons with its reviewer's defects
> fixed, the loadout and creation without a kit) and one clean `npm run check` and `npm run e2e -- all` are green on
> the merged tree (nothing failing alone), **deploy 0.27.0 to live** (merge to `develop`, then `main`;
> `backup/live-0.27.0`; the deploy routine in CLAUDE.md; verify live with old-save, creation-points and survival).
> Red: no deploy, a fixer, a report. Nothing new is started before that.
> **Balance 2.0 (named by Leon, 14 Nov; AFTER this release):** measure every weapon's turn against the plain rifle
> (only the service rifle, the best gun and the best blade are on the contract today; the other 60 weapons were
> numbered by trade-off and never measured one by one), list the outliers, refit; with it the open lines from
> Classes 3.0 (Figments' door against the Rigger, the Skirmisher 159 against 145, the healer stall at level 20,
> Hymn 138 against 150), casters in Survival after the boons, and the repair rate.
> **Measured for Balance 2.0 on the 0.27.0 tree** (rules 1.52 item 3916; 3 routes × SIM-1 to 4, stages capped at 5, the
> camp as a player builds it, no free armour): the **solo Sigilist clears stage 1 in 3 of 12** (means 1.3, 1.8, 1.6; its
> Line at Brain Power 1 to 3 is the gap, a Sigil rules matter) and the **solo Channeler in 3 of 12** (a level 1
> Channeler in Class 1 armour loses to one Soldier; the camp's free class 3 had made it 9); the solo gunner 9 of 12.
> **The camp, joined (14 Nov):** one flow (the loadout, the starting boon, Ready); the free weapon is the most basic of
> each archetype and the rack holds it again and the next one up (Leon's ruling); no free armour.

**Start here for Survival.** Survival is built (rules 1.39 to 1.53: the starting boons 1.51, the loadout 1.52, the quivers 1.53; version 0.27.0 on the branch) and **waits for
Leon's word to go live**: nothing of it is deployed. 0.26.0 (Classes 3.0) is live. Read `CLAUDE.md`, then this file,
then the spec `docs/design/survival-spec.md` (draft 5 and its six "Settled by Leon" blocks; where the built revisions
differ from its text, the revisions in `docs/rules/PHC-Core-Rules-v1.0.md` rule). What to try by hand:
`docs/PLAYTEST-CHECKLIST.md` section S (it ends with every call made for Leon, numbered).

## 1. What is built, step by step

| Step | Rules | What | Hand-off |
| --- | --- | --- | --- |
| 1 | 1.39 | The lobby's mode picker (three cards; Survival open, Roguelike and Campaign locked: `data/modes.json`), `settings.play`, `g.run`, `run/start`, `run/retire`, the refusals of story and Narrator actions in a run | `survival-step-1.md` |
| 2 | 1.40 | The path map generator on named seed streams (`rngFor`); replaced by 1.48 | `survival-step-2.md` |
| 3 | 1.41 | The encounter generator (the budget in Soldier-equivalents: bulk and pressure; the lag; the stage term; the share for small parties; templates; weapons), credits on a character, rewards (XP, credits, the ammunition pack, the weapon pick), rests, the death return, the loss, ONE stage playable | `survival-step-3.md` |
| 4 | 1.42 | Prices for everything (`priceOf`, round prices), the full-screen shop (counter, rolled stock, selling, restock), the faces, the gear preview | `survival-step-4.md` |
| 4a | 1.43 | In-run progression: the grade ladder (`setGrade`), a focus's grade on its door, the named Relic property on an instance, the Forge, rests' and training grounds' trainings (`addPractice`), the shrine, the Crossroads trades, lasting picks, the armourer's chit | `survival-step-4a.md` |
| 5 | 1.44 | Endless stages: the stage term, Elites and Bosses a level up a stage, the thirteen boons (relic items), the boon cap, the next tile, retire, renown, the kept draft | `survival-step-5.md` |
| 4b | 1.46 | Gives (`give.ts`), the shop's grade step, every safe node full screen (`placeView`) | `survival-step-4b.md` |
| 6 | 1.47 | The fight tally (`run/tally.ts`) and Report a run | `survival-step-6.md` |
| 7, 8 | 1.45 | The fight map's layout generator (stamps, cover, hazards) and kit drawing with fallbacks (`kit-<setting>-<piece>`) | `survival-steps-7-8.md` |
| lanes | 1.48 | The path map as lanes, junctions and one guarded vault; the themed overland map (`PathMap.tsx`) | `survival-lanes.md` |
| 9, 10 | 1.49 | The run simulator and the fit; the map fitted to its frame; the browser suite completed; the docs; 0.27.0 | `survival-steps-9-10.md` |
| repair | 1.50 | The repair service (`run/repair` at a shop and a Forge; the Repair shelf; wear bars and the WORN mark on the places and the path map); the simulator repairs | `survival-repair.md` |
| starting boons | 1.51 | Starting boons (26, by what a character can use: a boon's `needs`), seven caster boons in the Boss's pool (Deep Satchel among them), the supply pack (the spare cores burnt back, 30% MP for an Emanator or Attuner, Flux 0 after a run's fight); the reviewer's fixes (Shelter, the offer, Bandolier, the cores, Long Hand) | `survival-starting-boons.md` (rules 1.51 item 10 for the review) |
| loadout | 1.52 | Creation without a kit (gear by mode: `modes.json loadout`); the camp before node 1 (`run/loadout`, `run/ready`; one free weapon, one free focus, a budget of 300 at the shop's prices (Leon's "like 200", raised by the measure); Recommended); the camp's full screen (`LoadoutScreen.tsx`, `loadoutView`); the fit for the bare start | `survival-loadout.md` |
| text | none | Every Survival string written to the player (Leon, 14 Nov: "write to the PLAYER"): keepers' lines by tab, the shrine's votaries, boon room, stops and forks, refusals by name; the rules in `ui-screens.md` "Writing for the player" | `survival-text-pass.md` |
| starting boons | 1.51 | The camp (state `camp`: a starting boon of three by the character's line, `run/boon` and the host's `run/go` there; the camp's issue: free armour to class 3, three spare magazines), six caster boons in the Boss's pool, the supply pack (burnt cores back 1 to 2 x n, the MP share, Flux 0 after a fight, the loaded core full at a Rest), the `rigger` and `mender` kits; `CampScreen`, held boons on the squad panel; the simulator's run policies (`run-policies.ts`) and levers (`SIM_LEVERS`) | `survival-starting-boons.md` |

Code: `packages/engine/src/run/` (`map.ts`, `state.ts`, `encounter.ts`, `rewards.ts`, `shop.ts`, `shopview.ts`,
`progress.ts`, `placeview.ts`, `power.ts`, `stage.ts`, `tally.ts`, `loadout.ts`; the mode's gear `src/loadout.ts`), the run reducer in `game.ts` (`runAction`,
`runEnter`, `runFight`, `runFightOver`), `credits.ts`, `give.ts`, `gearpreview.ts`; the client's `apps/web/src/game/`
`RunScreen.tsx`, `PathMap.tsx`, `ShopScreen.tsx`, `LoadoutScreen.tsx`, `PlaceScreen.tsx`, `FullScreenFrame.tsx`, `StageScreen`; data
`data/survival.json`, `data/modes.json`; art `art/sprites/kit/<setting>/`, `art/illustrations/survival/`.

Tests: `packages/engine/test/survival-*.test.ts` (map, encounter, run, shop, progress, give, stage, tally, layout,
vault, camp), `test/balance/survival-run.test.ts` (the run guard; the measure, opt-in), the browser suites `room`,
`survival`, `kit-map`.

## 2. What is open, by step

Each hand-off's own "open" section has the detail; the calls made for Leon are numbered in
`docs/PLAYTEST-CHECKLIST.md` section S.

- **Steps 1 and 3:** `char/add` mid-run is not refused (a late joiner brings an unrun character); a levelled character
  kept as a draft cannot be brought into a campaign room at its level (a new door: `char/add` builds level 1); rule
  21 (d)'s "swap a Soldier for two Minions" is not built (the HP scale covers it).
- **Step 4:** throwing knives are a light melee weapon (no thrown-category knife in data); the face's line is a CSS
  reveal, not skippable by a key.
- **Step 4a:** a door with no growth counter (Bonds, Figments, Shadow) trains drill or Devotion; the graft rolls from
  this tile's pool (the next tile's does not exist before the Boss).
- **Step 4b:** a give's toast primes on the first run screen after a page load (gives made while a page was closed are
  not toasted); the cache is not a place.
- **Step 5:** Primed's other doors (Pressure, a free Bond, Flux −2, Strain −1) need a trigger after `magicIn` (an order
  change in an existing hook: the lead's call); Boss portraits for field and shrine and five settings' own foes are
  stand-ins by name (`awaiting`).
- **Step 6:** damage by system and shields given are not tallied (the events lack `by` and `system`; one engine change).
- **Steps 7 and 8:** closed doors never start a fight (the enemy AI does not open doors); breaches draw only where rubble
  lies; the backdrop behind a fight map is not drawn (the combat screen has no layer for it).
- **Lanes:** no small junction after the gate (segments 2 to 4 leave none; widen `junction.segment` to 1 to 4 for one);
  the marker sheet and the six map backdrops are wanted (`ART-REQUESTS.md` S9).
- **Steps 9 and 10:** what the fit could not reach with data dials, and why: `survival-steps-9-10.md` section 5 (its
  durability finding is answered by rules 1.50's repair service).
- **Repair:** a gun above the worn share at one shop can wear out before the next (one fight in 44 runs); the policy
  repairs only Worn or Broken.
- **Starting boons (rules 1.51):** the casters' sustain is answered (the supply pack, the camp's issue, starting and
  caster boons); what the measure still found short, and the open items: `survival-starting-boons.md` sections 4 and 6.

## 3. How to tune it (every dial is a field of `data/survival.json`, PROVISIONAL)

| Want | Dial | What it does |
| --- | --- | --- |
| Fights longer or shorter | `bulk_per_char_round` (0.25), `rounds` (R by node kind) | The bulk target: Soldier-equivalents of HP a fight brings, per character per round |
| Fights more or less dangerous | `pressure_per_char` (by party size), `max_foes` (by party size) | The pressure cap: Soldier-turns of damage a round the foes may bring |
| Small parties easier or harder | `share.boss`, `share.elite` (HP and damage by party size) | How much of a full Elite or Boss a solo or duo meets |
| How fast stages get harder | `stage.bulk` (length a stage), `stage.pressure` (danger a stage), `stage.elite_up` (Elites' and Bosses' lead in levels a stage, and its most) | The endless curve: where runs end |
| How fast characters level | `xp` (f(d): base 10, per_depth 2, Boss x 5), `stage.xp` ([1, 2.6, 4, 4, 4.5]) | Rules 1.54: level 3 after stage 1's Boss (at depth 12 or 13 on 4.5% of routes, the most-fights ones), about 5, 7, 9, 11 after stages 2 to 5 (`test/balance/survival-run-levels.test.ts`, `SIM_LEVELS=1`) |
| How rich a party is | `credits` (c(d)), `stage.credits` (by stage), `rewards.instead_rate` (credits instead of a weapon), `loadout.budget` (rules 1.52: the camp's budget, the unspent part the purse), `sell_rate` | Income against the grade ladder |
| How fast gear grows | `grade_up.price`, `grade_up.places.forge`, `grade_up.relic_from_stage`, `rewards.ceiling` (picks capped by stage), `rewards.rarity` | One grade step a stage, the Relic in stage 4 |
| The vault | `vault.guard_factor`, `vault.grade_up`, `map.vault` | Its fight and its prize |
| Repairs dearer or cheaper | `repair.rate`, `repair.floor`, `repair.places` | The gunsmith's share of the price, the least a repair costs, the Forge's factor |
| What lanes hold | `map.themes`, `map.junction_kinds`, `map.every_route`, `map.shop_gap` | The node mix on a route (rests and shops a route) |
| Run power | `boon_cap`, `boons[].worth`, `shrine.token_max_worth`, `start_boon.max_worth`, `start_boons[].worth` | How far boons and Relic properties go past the balance ceilings; how big the camp's pick is |
| What casters get back | `ammo_pack.cores`, `ammo_pack.cores_max`, `ammo_pack.mp_share` | The supply pack's cores (what was burnt, between the two, x n) and MP share |
| The camp's issue | `camp.issue_armour`, `camp.spare_mags` | The armour class fitted free at the camp; the spare magazines the gun in hand starts with |
| Trainings | `train` (drill 200, study 5, practice 8, Devotion 4), `training` (drill 400, study 10, practice 15), `shrine.rite` (10) | The rest's small and the training ground's big trainings, the shrine's rite (rules 1.54 item 10); each training card carries its bar (`RunOption.bar`) |

The fit of rules 1.49 moved the dials in `survival-steps-9-10.md` section 4; read its before-and-after tables before
moving one again. Spec first (a rules revision), then the data, then `python3 tools/validate.py data`, then the guard.

**How to measure a change:** `packages/engine/test/balance/survival-run.ts` plays whole runs through the reducer
(section 2 of `survival-steps-9-10.md` says exactly what its players do). Run the cells you care about:

```
cd packages/engine
SURVIVAL_SIM=1 SIM_CELLS=four:gear,solo_gunner:gear SIM_SEEDS=6 SIM_MAX_STAGES=5 SIM_OUT=/tmp/runs.json \
  npx vitest run test/balance/survival-run.test.ts -t measure
SIM_REPORT=/tmp/runs.json npx vitest run test/balance/survival-run.test.ts -t tables   # prints the tables
```

Parties: `solo_gunner`, `solo_sigil`, `solo_outburst`, `solo_healer`, `solo_rigger`, `duo` (gunner and healer), `four`
(gunner, Faith rifle, Sigil caster, healer), `four_casters` (Sigil, Outburst, Rigger, healer), `mixed` (gunner, Sigil,
Outburst, healer). Rules 1.51: `SIM_LEVERS` (a comma list of `policies`, `supply`, `issue`, `start`, `caster`; `none`;
default all) measures one lever at a time. Routes: `gear`, `training`, `safest`. A four-character run to stage 5
takes about a minute; split the cells over four processes. The guard (`npm run check`) plays three solo runs and holds
generous bands; widen them only with the measured reason.

## 4. What the roguelike reuses

- **The node map as a dungeon:** a node is `{id, depth, col, kind, setting, links, room: null}`; a designed room goes
  in `room`, and the encounter generator takes a room's slots in place of a template's.
- **The encounter generator** (`composeEncounter`, the budget in SE, the lag and the stage term, templates, the share).
- **The world as tiles:** `g.run.world` is a row of tiles (a setting and a boon pool each), the first shape of the
  roguelike's world map; points of interest and dungeons attach to tiles.
- **Boons are relic items** (`c.relics`, `addItems('relic', …)`), the same thing meta-progression unlocks will be; the
  stats `run_ammo` and `run_credits` answer any economy unlock.
- **The faces** (`faces` data: name, role, portrait, fallback, backdrop, bias, prices, lines) are the first NPCs.
- **Credits, prices, the shop, the Forge, gives** (`credits.ts`, `priceOf`, `run/shop.ts`, `run/progress.ts`,
  `give.ts`: a two-sided trade later is a confirm behind `giveProblem`).
- **The fight tally and Report a run**, the layout generator's stamps (the designed rooms' legend), the kits.
- **The run simulator** (`test/balance/survival-run.ts`) measures any run-shaped mode: give it the mode's actions.
