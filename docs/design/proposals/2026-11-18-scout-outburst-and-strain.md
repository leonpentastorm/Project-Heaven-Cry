# Scout: Outburst ways, the Strain limit, Mana Short and Shock, Rite in the Field, the Call ladder (18 Nov 2026)

Worktree E:/phc-wt/rel030, branch release/0.31, live 0.31.10. Read-only scouting; nothing was changed.

1. **Ways (Strike, Finish, Brand, Drain):** the engine does not gate them at all: any known school accepts any of its listed options (`character.ts:384-387` optionOf, `:407-433` checkOutburstDesign). "Earned only from the starting spell" is a UI fault: the Outbursts workshop never renders the first school's ways row (`apps/web/src/screens/main.js:221` computes `opts`, nothing uses it; the template reads `mg.b.hasOptions`, which no code defines). Ways are not a lesson kind anywhere (plates, picks, trainings, boons all teach schools, modules, tones only). The Status school has no route in Survival.
2. **Strain limit today:** `character.ts:818`: `round((3 + floor(Will Power/2)) x (1 + 0.01 x Will Power x Composure)) + items`; 16 at 10/10, 8 at Will Power 10 with no Composure, Composure alone adds nothing. Eleven texts state it; one test pins it (`beta-feeds-1-60.test.ts:112`).
3. **Short and Shock:** one function, `magic.ts:983 manaShort`; Shock is a flag `m.shock` set at `:997`, cleared in `shockEnds :945`/`shockClear :1027`; no hook fires on entering Shock. Iron Heart is built as "once a fight, Strain that would pass the limit stops at it" (`classes/rev3.ts:570-587`); the ruled version (relieve 2 Strain on reaching Shock) needs an entry point that does not exist and a Strain-down primitive that is private.
4. **Rite in the Field:** two data rows, both `cost_mod` (Crystallise and Name It, -1 / -2 AP). A held Outburst's tone is `m.held.tone` (copied at Begin), but Release reads the design's tone (`magic.ts:1474`), so changing only the held field would change fx and the Short backlash, not the damage.
5. **Call ladder:** `data/calls.json` rules: cheap_at 5, reaction_at 9, free_at 10; applied in `calls/core.ts:44-49, 69`. A Call has exactly one target everywhere (`args.targetId`, `Call.tgt`, per-target one-helping / one-hindering marks).

---

## 1. Outburst schools, ways and how a character comes to hold them

### 1.1 What exists

Schools (`data/soul_modules.json` `schools`, line numbers of the `options` arrays 201 / 228 / 247 / 269). A school's "ways" are its `options`:

| School | base_cost | Ways (option ids) | Labels (`apps/web/src/game/actionPickers.ts:38-41`) |
|---|---|---|---|
| damage | 20 | strike, finish, brand, drain | Strike, Finish, Brand, Drain |
| buff | 20 | to_hit_2, defense_2, heal_30 | +2 to hit, +2 Defense, Heal |
| control | 25 | push_3, pull_3, pinned, slowed, swap | Push 3 tiles, Pull 3 tiles, Pinned, Slowed, Swap places |
| status | 20 | fear, shaken, confused, left_brain_debuff, right_brain_debuff, silenced | Afraid, Shaken, Confused, Left / Right Brain Debuff, Silenced |

Way numbers for Damage: `soul_modules.json` `damage.modes` finish mult 0.8 (1.4 at target at or under 0.5 HP), brand 0.8 + Marked, drain 0.8 + 25% heal. An unset `option` reads as: damage = strike (create.js:272 `ENGINE_OPT`), buff = heal, control = push, status = shaken (`magic.ts:1285 optOf`; Damage with no option takes the Strike path, `magic.ts:1872`).

Other design pieces (not "ways"): modules (38 items, `soul_modules.json` `items`, gated by skill points in `gates`: Lore Master, Will Power, Empathy, Camaraderie, Implication, Composure; ids with no gate are the 9 shelved advanced-class modules), shapes (Bolt default; wave, burst, aura, lance), tones (raw + 6 elements, `tones`), a second school (`second_school`: Will Power 5, +10 MP, half strength).

### 1.2 How a character comes to hold each thing

| Thing | Route | Code / data |
|---|---|---|
| School: damage, buff, control | Known from the start for every Soul caster | `soul_modules.json` `start.schools` (line ~1486); `character.ts:322-337 startingMagic` (`c.soulKnown = {schools, modules, tones}`) |
| School: status | NOT known at the start. Routes: a Heart plate (`magic/learn`, `game.ts:962-986`), an ally who knows it (`from: 'ally'`, `game.ts:966-969`), a Narrator grant (`narratorTeach` `game.ts:2688`), the Proving Ground sandbox (`sbKit game.ts:3820`, `sbChange :4396`). None in Survival (no shop or reward sells a Heart plate; `grep heart_plate packages/engine/src` hits only game.ts, loot.ts) | `data/loot_tables.json:222, 305` (plates in loot tables, not Survival's materials-only loot), `data/items.json:126` |
| Any school | A Heart plate teaches schools, modules, tones | `game.ts:2656-2660 plateChoices` (tones, `Object.keys(SCHOOL)`, `Object.keys(MODULE)`), `:2663-2668 plateLessonWhy`, `loot.ts:105-111 rollPlateNote` |
| Module | Practice pick (`magic/pick`, `game.ts:1028-1037`): picks at 5 and 15 practice, then every 15 (`character.ts:853 picksAt`, `:860 nextPickAt`; `soul_modules.json` `practice`); +5 practice per Mastery level (3/5/7/9) of each gate skill (`character.ts:~846 masteryPractice`); a free pick from a gate skill's modules at 10 points (`:866 soulPicksLeft`, `:875 soulPickError`) | gate: `character.ts:838 moduleGateError`, `soul_modules.json` `gates` (tier1 2 points, tier2 4 points) |
| Practice itself | Each Release earns 1 (+1 per stage past 1, +1 per feeling); Survival: rest 8, training ground 15 (second one 300 credits), wayside shrine 5 | `magic.ts:1669, 1675 addPractice`; `data/survival.json` `train` (line 422-426), `training` (428-432), `ev.wayside` (457); `run/progress.ts:273` |
| Tone | First tone free at Lore Master 1 (learned with a design: `learnTone`); Heart plate; ally; Narrator; channeler Occult Library (rank II, once per campaign, any element tone; `classes/rev3.ts:589-602`) | `character.ts:430-433, 418-423` (checkOutburstDesign), `game.ts:998` |
| Way (option) of a school | See 1.3: no route is needed in the engine; none exists as a lesson | `character.ts:384 optionOf` |
| Shelved modules (echo, cascade, tether, siphon, phantom?, orbit, volatile, bastion, judgement_mark, halo) | Locked to their advanced class (shelved) | `character.ts:832 moduleShelved`; `plateChoices` filters via `teachCheck game.ts:2670`, `rollPlateNote` skips them |

(Phantom is gated at Lore Master 2 in the data, not an advanced-class module; the 9 shelved ones are echo, cascade, tether, siphon, orbit, volatile, bastion, judgement_mark, halo: `locked: true`, `family: advanced`.)

### 1.3 The ways: the exact state of the code

1. **Engine, creation:** `startingMagicError` (`character.ts:299-316`) does not look at `option` at all; `startingMagic` copies `o.option` unvalidated (`:332`). The creation UI offers every way of the picked school: `apps/web/src/screens/create.js:504` (`obOpts` = all `SCHOOL[ob.school].options`), template `create.template.html:372-375` ("WHAT IT DOES"). So at creation a character can pick Finish, Brand or Drain for design o1 (the one design they choose; the other two start designs are fixed: Mend = buff/heal, Heart Wave = control/push, `soul_modules.json` `start.designs`).
2. **Engine, after creation:** `magic/design` (`game.ts:988-1004`) calls `checkOutburstDesign`, which passes `d.option` through `optionOf` (`character.ts:384-387`): any option of the school's list is accepted, with no "known ways" list on `soulKnown`. `soulKnown` has only `schools`, `modules`, `tones` (`character.ts:91`). So the engine would let any character who knows Damage make a Brand design.
3. **Web, the workshop (the actual blocker):** the Outbursts workshop builder `b` (`apps/web/src/screens/main.js:226-251`) defines `school`, `schools`, `schoolText`, `two*`, `options2`/`hasOptions2` (line 236), `tones`, `shapes`, `modules`, but no `hasOptions` / `options` key (grep `hasOptions` in apps/web/src finds only `main.js:1462`, the twin/action picker, and the template). The first school's EFFECT row (`main.template.html:359`: `mg.b.hasOptions`, `mg.b.options`) therefore never shows. `const opts = ...` at `main.js:221` is dead. It was removed in commit 299f0889 ("WIP Outburst 2.0 UI", 8 Nov 2026; the removed line: `hasOptions: opts.length > 0, options: opts.map(...)`). `onSchool` (`main.js:229`) sets `option` to the school's first option (Strike, to_hit_2, push_3, fear). The SECOND school's ways row works (`options2`), but needs Will Power 5.
4. **Web, other pickers:** the action-flow design picker (twin / Beloved) offers ways: `main.js:1462` via `designSlotView` / `pickInDraft` (`apps/web/src/game/actionPickers.ts`).
5. **Consequence for Leon's "no way after creation":** a character who made Strike at creation can never choose Finish / Brand / Drain for a Damage design in the workshop (the row does not render), though the engine accepts it; and for Buff, Control and Status the same (the starting Mend and Heart Wave designs are fixed, and the workshop has no ways row).

### 1.4 Ways with no route after creation (with the deciding code)

| Way | Route after creation | Decided by |
|---|---|---|
| Damage: Finish, Brand, Drain (Strike is the default) | None in the UI; engine accepts them in `magic/design` | `main.js:221-251` (no first-school ways key), `main.template.html:359` |
| Buff: +2 to hit, +2 Defense (Heal is the default of the start design Mend) | same | same |
| Control: pull, pinned, slowed, swap (push is the default of Heart Wave) | same | same |
| Status: all six, and the school itself | No UI route (as above) and the school is not known at start; no Survival route to it (no plate, no ally teaching in a solo run) | `soul_modules.json` `start.schools`; `game.ts:2656` |
| Second-school ways | Only with Will Power 5 AND a second school known; UI row works | `character.ts:410-413`, `main.js:236` |

There is no "way" concept in `plateChoices`, `magic/learn`, `magic/pick`, trainings or boons. `data/survival.json` boons for Outburst users give numbers only (`boon.steady_heart` line 306, `start.clear_pulse` 373, `start.hot_blood` 376, `start.second_breath` 379).

### 1.5 Tests that touch ways or the learning routes

`packages/engine/test/rules119-outburst.test.ts` (Finish, Brand, Drain mechanics), `packages/engine/test/run-item-actions.test.ts:171-176` (plateChoices for a blank Sigil plate), `apps/web/src/screens/main-pickers.test.ts`, `packages/engine/test/outburst40*.test.ts` (modules, picks). No test asserts that a non-start way is refused.

---

## 2. The Strain limit today

### 2.1 Formula (one function)

`packages/engine/src/character.ts:816-819`:

```
strainLimit(c) = fx(c, 'strain_limit', Math.round((3 + Math.floor(P(c,'will_power')/2)) * feedOf(c,'strain_limit')))
feedOf = doorFeed(door will_power) = 1 + 0.01 * will_power_points * composure_points      (effects/feed.ts:37, 39)
showFeedNumber('strain_limit', strainLimit)                                                  (character.ts:819)
```

Terms and where each lives:

| Term | Where | Value |
|---|---|---|
| Base 3 | typed in `character.ts:818` (a literal) | 3 |
| Will Power half | typed in `character.ts:818` (`Math.floor(P/2)`) | +1 per 2 points, 5 at 10 |
| Composure feed | `data/skills.json` Composure `feed` (`carrier: strain_limit`, line 4886-4890) and `per_point.numbers.feed` 0.01 (line ~4895-4903); engine `effects/feed.ts` BY_DOOR | x(1 + 0.01 x WP x Comp), x2 at 10/10 |
| Items / perks | `fx(c, 'strain_limit', ...)` (stat added by `stat_mod`; core stat map `effects/core.ts:67`, label `effects/stats.ts:48`) | data: only `data/variants.json:59-60` (a variant `stat` row for Emanator / Attuner: "Your Strain limit is {value} higher while you hold it"; data only, no shipped item uses it) |
| Heart's Own (shelved devoted class) | `classes/k.ts:506-510 heartsOwn` adds +2 to `m.strainLimit` while a Beloved spell is begun or held; data `classes.json:7101-7111` stat `strain_limit_beloved`; test `outburst20-review.test.ts:150-162`, `classes-k.test.ts:167-171` | +2 |
| Enemy casters | `data/enemies.json:518, 546, 588` `strain_limit` 4 / 5 / 6; `ai-soul.ts:57` default 5; test heart `sigil.ts:1439` 5 | not from Composure |

The limit is read once when a unit's magic is built (`magic.ts:183` `strainLimit: strainLimit(c)`) and kept in `MagicUnit.strainLimit` (`magic.ts:101`).

Values (rounded as the code does):

| Will Power \ Composure | 0 | 1 | 3 | 5 | 8 | 10 |
|---|---|---|---|---|---|---|
| 1 | 3 | 3 | 3 | 3 | 3 | 3 |
| 3 | 4 | 4 | 4 | 5 | 5 | 5 |
| 5 | 5 | 5 | 6 | 6 | 7 | 8 |
| 7 | 6 | 6 | 7 | 8 | 9 | 10 |
| 10 | 8 | 9 | 10 | 12 | 14 | 16 |

Composure with Will Power 0 gives exactly 3 (the feed multiplies by 1 + 0.01 x 0 x Comp). Today Will Power alone contributes up to +5.

### 2.2 Composure's ladder today (for the ruled "steps at 1 / 2 / 4 / 6 / 8")

`data/skills.json` Composure (id line 4880s): per_point rows at lines 4895-4906 (the feed sentence "your Strain limit rises by 1% for every point here times every point in Will Power", and +1 on Heart saves); unlocks: 3 Poker Face, 5 Stand Still, 7 and 9 perk steps, 10 Mastered (lines 4910-4975). Points 1, 2, 4, 6, 8 have nothing, which is Leon's list.

### 2.3 Every text that states the limit or says Will Power raises it

| File and line | Text |
|---|---|
| `data/skills.json:4697` | Will Power per_point row "every 2": "+{strain} Strain limit (what your heart can take), and your Outbursts reach {reach} tile further." (`per_point.numbers.strain: 1`, line 4667; the number is display only: the engine ignores it) |
| `data/skills.json:4901` | Composure: "your Strain limit rises by {feed|pct}% for every point here times every point in Will Power." |
| `data/skills.json:4888` | Composure feed `line`: "{beta} {points}: your Strain limit is {now}" |
| `data/skills.json:4646, 4670s` | `door_line`, `door_bare_line` (mention "your Strain limit" as the line a Short is measured from; no formula) |
| `data/soul_modules.json:61` | `strain.limit`: "3 + floor(will_power/2)" (typed text, not read by code) |
| `data/soul_modules.json:189` | `limits.ready_designs` (not the Strain limit; same Will Power / 2 pattern) |
| `data/rules.json:379` | `strain_limit: "3 + floor(will_power/2)"` |
| `data/classes.json:2186` | Channeler `resource.max`: "strain_limit (3 + floor(will_power / 2))" |
| `docs/rules/PHC-Core-Rules-v1.0.md:239` (table), `:1804` (item 1), `:3198` (item 8) | the body line, each with a "superseded by rules 1.60 item 4611" note |
| `packages/engine/src/glossary.ts:92` | the wiki text "Strain: limit 3 + half Will Power." (typed in code) |
| `docs/design/handoffs/action-price-list.md:1134, 819`, `damage-step-magic.md:293`, `skeleton-2.0-code-map.md:73` | handoffs; 819 says Iron Heart "Strain limit +1" (stale) |
| `apps/web/src/screens/main.js:213` | the sheet's "Strain now N / limit (the limit; past it, a Mana Short)" (computed number, no formula) |
| `apps/web/src/game/protodata.json` | generated copy of skills (rebuilt by `design/canvas-build/build.py --web`) |

### 2.4 Tests that pin the limit

| Test | What it pins |
|---|---|
| `packages/engine/test/beta-feeds-1-60.test.ts:107-113` | `strainLimit(c) == round((3 + floor(ALPHA/2)) x feedAt('composure', b))` for alpha 10, beta 1 and 10: this breaks with the ruled formula |
| `packages/engine/test/classes-rev3-moves.test.ts:299-312` | Iron Heart: channeler limit equals a guardian's; once-a-fight stop at the limit |
| `packages/engine/test/outburst20-review.test.ts:150-162`, `classes-k.test.ts:167-171` | Heart's Own +2 |
| `packages/engine/test/outburst20-classes.test.ts:216` | `strainLimit` 6 after a +2 move on 4 |
| `apps/web/src/game/doorView.test.ts:36` | the Will Power door line regex ("Go N past your Strain limit ... Mana Shock") |
| Many fight tests set `mg.strainLimit` by hand (20, 30, 4...) and are independent of the formula: `rules114-will-power*.test.ts`, `outburst20*.test.ts`, `outburst40.test.ts`, `rules117/119/124`, `golden/record.ts:288, 330, 542`, `golden/moves.ts:41` |
| `packages/engine/test/ai-soul.test.ts:51` | enemy block: `strainLimit: 5` |
| `packages/engine/test/balance/outburst-measure.test.ts:92` | prints the sheet's limit for the measuring builds (the tool the lead re-measures with) |
| `packages/engine/test/lint-item-ops.baseline.json:101` | lists `channeler.iron_heart` (a bespoke id: baselines only shrink) |
| `packages/engine/test/balance/price-list.test.ts:296` | Iron Heart's priced description string |

---

## 3. Mana Short and Mana Shock

### 3.1 Where each step lives (`packages/engine/src/magic.ts`)

| Step | Function and line |
|---|---|
| Constants | `SHORT_AT_OVER = strain.short_at_over` (3) `:710`; `STRAIN_BURN` (8) `:707`, `strainBurn` scaled by level `:709`; `AFTER_SHORT = 'keep'` `:714`; `MANA_SHOCK` (name, text, hp_share 0.25) `:717` (data `soul_modules.json` `strain`, lines 61-111) |
| All Strain goes in here | `addStrain` `:913-923`: hook `strain` {u, n, why, limit} (may change n or limit) `:915`; adds `:919`; hook `strain_change` `:921`; fx `strain`; if `strain - limit >= 3 && !dead && !downed && !m.shock` calls `manaShort` `:921` (no second Short while in Shock) |
| Held Outburst's own Strain | `holdStrain :925-` (Begin, swell, feeling; Quiet halves) always through `addStrain` |
| Strain down | `easeStrain :934-941` (private; hook `strain_change` then `shockEnds`); `calm :961-966` (private; fx `calm`; ways: turn, still, fight, tend, letgo, steady); exported callers `calmFight :969`, `calmTend :974`; Let go `:1207-1211`, Steady `:1224-1226`, turn start `:1741-1763` |
| The Short | `manaShort :983-1004`: fx `short`; log "MANA SHORT"; Stunned 1 round (`applyCond ... 'stunned'`, `skipSave`; fires `cond_apply`, which Hollow Heart cancels `perks/d.ts:585`); a held Outburst goes off wild (`wildRelease :1274`) + the tone's stage-1 backlash on the caster; `m.pumps = []`; then `'keep'`: **`:997 m.shock = true`** if Strain is still over the limit; `:1000 m.shockOwn = true` when it happened on the caster's own turn (that turn's end pays no share); fx `cond` id `mana_shock`; log with `MANA_SHOCK.text` |
| Short entered a second way | `magicTurnEnd :1009-1012`: a limit that fell this turn (Heart's Own) and `strain - limit >= 3 && !shock` calls `manaShort` |
| The burn | `magicTurnEnd :1013-1014`: `heartHarm` 8 x level scale x points over, true, no shield, Downs never kills (`heartHarm :948-955`, `effects/damage.ts:61-70` PAST_SHIELDS / UNSOFTENED, spec item 4505) |
| The Shock's share | `magicTurnEnd :1020-1022`: if `m.shock && !shockEnds && !own && !overworld && !field && !downed`: `heartHarm` of `hp_share` x max HP |
| Shock ends | `shockEnds :945-950` (when Strain is back at or under the limit; asked from `easeStrain` and the turn's end); `shockClear :1027-1031` (Strain set to the limit and Shock ended: the one copy for a Down `:1032` `onHook('on_downed')` and the fight's end `:1034` `onHook('combat_over')`, plus `game.ts:3586` (the field) and `:3962` (a Proving Ground wave); `game.ts:1308` clears `shock` when a character's story magic is reset) |
| Saved state | `MagicUnit.shock`, `shockOwn` (`magic.ts:86-87`); carried through saves at `game.ts:2581, 2617` |
| Displays that read `m.shock` | `apps/web/src/game/heartView.ts:206-218`, `resources.ts:46, 172-174`, `apps/web/src/screens/combat.js:496` (token chip), enemy AI `ai-soul.ts:223` |

### 3.2 Hooks and triggers that fire there today (`docs/ENGINE-HOOKS.md`)

Hooks (lines in the catalogue): `strain` (line 374: before Strain is added; `ctx.n` and `ctx.limit` mutable; emitted `magic.ts:915`; handlers `classes/k.ts:536 (+6)`: Love made manifest, Pure Heart `perks/skills.ts:162-173`, Iron Heart `classes/rev3.ts:574-581`, the twin's pool `classes/k.ts:1416`); `strain_change` (line 372: after; {u, from, to, why, limit}; emitted `:921`, `:939` (easeStrain), `:994`, `:1029`, `k.ts:1430` and `:1431`); `on_downed` (line 338); `combat_over` (line 367); `outburst_hold` (line 370, the swell); `held_turn_start` (line 373); `outburst_cost` (line 360). FX (`ENGINE-HOOKS.md` 1571, 1614, 1652, 1663, 1666): `calm`, `letgo`, `short`, `steady`, `strain`.

NOT present: no hook, trigger or fx named for "entered Mana Shock" or "left Mana Shock". Entry is the single statement `m.shock = true` (`magic.ts:997`) with an fx `cond` and a log line. `strain_change` fires BEFORE `manaShort` in `addStrain` (`:921` after `:919-920`), with `why` equal to the Strain's own why, so a hook handler can only infer an entry from `ctx.to - ctx.limit >= SHORT_AT_OVER && ctx.to > ctx.from && !u.mg.shock` (the way Hollow Heart does, `perks/d.ts:585`). `effects/triggers.ts:278-284` notes the resource-amount predicate's `at: "limit"` waits for Strain as a resource row ("N3b"); `data/actions.json` `resources` has no `strain` or `flux` row (ids: mp, charge, cores, momentum, guard, supplies, toxins, parts, stims, echo, pressure, vcharge, shadow, ledger, devotion_xp). The data `resource` op (`effects/triggers.ts:400`) therefore cannot take Strain off.

There is no exported primitive that lowers Strain by a number: `easeStrain` and `calm` are file-private; class moves that lower it write `m.strain` and emit `strain_change` and fx `calm` by hand (`classes/k.ts:1429-1431`). `addStrain` clamps negatives (`Math.max(0, sc.n)` `:915`). Exported: `calmFight`, `calmTend`, `shockClear` (sets Strain to the limit: too much for "relieve 2").

### 3.3 What Iron Heart does now

Data: `data/classes.json:2210-2236` (channeler rank I, `id: iron_heart`, `uses: per_combat`, text "Once a fight: Strain that would go over your limit stops at it.", an `effects` row `op: resource, resource: strain, set: limit, when: "strain would pass the limit"` that no op runner executes: the behaviour is the bespoke handler). Handler: `packages/engine/src/classes/rev3.ts:568-587`, `register({ id: 'channeler.iron_heart', claims: 'all', on: { strain } })`: on the `strain` hook, if the unit is the holder, in a fight (`!cb.overworld`), and `ctx.n > room` (room = limit minus Strain) and `uses(h).take('per_combat', 1)` succeeds, then `ctx.n = room` and a log line "Iron Heart: ... holds at its limit". It is the 0.31.9 builder's version (the lead's earlier wording); Leon's ruling (17 Nov, `SESSION-TODO-2026-11-16.md:436`): once a fight, when you reach Mana Shock, relieve 2 Strain.

What the ruled version needs from the engine (facts only):
1. A point where "reaching Mana Shock" is observable: only `manaShort` `:997` (flag set), or the `strain_change` inference above. Two ways to reach the Shock: `addStrain :921` and `magicTurnEnd :1012`.
2. A way to lower Strain by 2 that also emits `strain_change` and re-asks `shockEnds`: today only `easeStrain` (private) does that.
3. An ordering question the code settles in one way only: the Short itself (Stun, wild Release, backlash `:984-993`) runs before `m.shock = true`; `shock` is only set when `m.strain > lim` after the Short (`:995-997`); relief applied after `:997` leaves 3 over as 1 over (still in Shock); applied before the Short (the `strain` hook) it can stop the Short. Pure Heart (`perks/skills.ts:162-173`, Will Power 5, `priority 950`, once a fight) already turns the first Short away on the same hook.
4. Related bookkeeping a change touches: `data/classes.json:2210` text, `packages/engine/test/classes-rev3-moves.test.ts:299-312`, `balance/price-list.test.ts:296`, `lint-item-ops.baseline.json:101`, the mention in `docs/design/handoffs/action-price-list.md:819`.

### 3.4 Tests that cover Short and Shock

`packages/engine/test/mana-shock.test.ts` (whole file: entry, the shockOwn turn, no second Short, Down and fight end, field, Pure Heart, enemies, `:249` the numbers), `magic.test.ts:86`, `rules114-will-power*.test.ts`, `shield-no-swell.test.ts`, `outburst20-*.test.ts`, `golden/record.ts:330, 542` (`literal/strain-burn/*` golden damage).

---

## 4. Rite in the Field and the held Outburst's tone

### 4.1 Rite in the Field today

`data/perks.json:4599-4710` (`id: rite_in_the_field`, Lore Master gamma, `perk_type: ap_mod`, `requires lore_master min 3`, tiers I and II, `adjudication: engine`, `provisional: true`; tags ap, ritual). Both tiers hold two `cost_mod` rows on the `cost` site:

| Tier | Row 0 (crystallise) | Row 1 (Name It) |
|---|---|---|
| I (Lore Master 3) | `action: ["crystallise"]`, value -1, min 1 | `action: ["call"], action_id: ["call.name_it"]`, value -1, min 0 |
| II (Lore Master 5) | value -2, min 1 | value -2, min 0 |

No code (`packages/engine/src/perks/d.ts:129-130` says "Nothing here"; `data/effect_ops.json:326` lists it among data perks). Crystallise is `magic.ts:1938-1941` (priced `price({cb, u}, 'crystallise')`, base from `data/actions.json` `costs.crystallise` via `SPELL_AP.crystallise` `:706`; costs 1 AP min under this perk; makes a mana core from the air, shifts mana -10). Tests: `apps/web/src/game/perkShelves.test.ts:99, 102` (it has no button of its own). Name It: `data/calls.json` `call.name_it`, handler `calls/handlers.ts:130-152`.

### 4.2 How a held Outburst's tone is stored and what reads it

| Field | Where | Notes |
|---|---|---|
| Design tone | `OutburstDesign.tone?: string` (`character.ts:151`); stored on `Character.outbursts[]` | permanent; changed only by `magic/design` out of a fight (`game.ts:988`), which is refused while the design is held (`game.ts:991`) |
| Held tone | `HeldOutburst.tone?: string` (`magic.ts:783`) | set at Begin: `magic.ts:1071` `tone: toneOf(d)` (design's); `migrateHeld :799` defaults it to the design's tone |
| What Release reads | `releaseAt` `magic.ts:1474`: `tone = toneOf(d)` where `d` is the DESIGN found with `findDesign(m, m.held.design)` (`:1188`, `:1741`) | so changing `m.held.tone` alone does not change a Release's damage type, riders, MP |
| What reads the held tone | fx `pump` `:1137` (`h.tone`), `hold` `:1249`, Heart Overwatch fx `:1265`, `manaShort :984` (the backlash's tone), swell / aura riders `:1756`, the cost: `m.held.cost` was paid at Begin with the tone's cost in `designCost :837` (`TONE[toneOf(d)].cost`) | |
| Known tones | `Character.soulKnown.tones` (`character.ts:91`); an unknown tone is refused by `checkOutburstDesign :418-423`; the first tone is free at Lore Master 1 (`learnTone`) | a mid-fight change would need a known-tone check |
| Tone data | `soul_modules.json` `tones`: raw (cost 0, Soul damage ignores armour) and fire, storm, frost, stone, gale, acid (cost 5, armour counts half; each with `stages` 1-4 riders) | `soul_modules.json:~280-560` |

So, as a fact for the lead: a "change the held tone for 0 AP" effect has three places to keep in step: the Release's tone source (`:1474`), the held record (`m.held.tone`), and the price (MP already paid for the old tone; `held.cost`, `pumpMp`).

### 4.3 Tests

`apps/web/src/game/perkShelves.test.ts:99-102`; no engine test pins the cost mod values (golden: `packages/engine/test/golden/*` coverage lists do not produce a number for this perk).

---

## 5. The Call ladder (steps 9 and 10) and how a Call picks targets

### 5.1 The rules (`data/calls.json` `rules`, one block)

`ap 2`, `cheap_at 5`, `cheap_ap 1`, `free_at 10`, `free_per_turn 1`, `range_base 4`, `range_per_point 1`, `steps_at [1,3,7]`, `reaction_at 9`, `reactions_per_round 1`, `reaction_ap 0`, `save_tn 12`, `helping_per_round 1`, `hindering_per_round 1`, `mark_rounds 1`, `enemy {per_turn 1, beats 5}`; its `text` states the ladder in one paragraph (also a text to edit).

| Point | What | Where applied |
|---|---|---|
| 1 / 3 / 7 | Step 1 / 2 / 3 of the Call's effect (`items[].steps[].at`) | `calls/data.ts:24 callStepAt`, `calls/core.ts:113 buildCall` (`def.steps[pv.step-1]`) |
| 5 | Costs 1 AP instead of 2 | `calls/data.ts:23 callBaseAp`; used in `calls/core.ts:44-46 callAp` |
| 9 | A HELPING Call can also be made as a reaction, 0 AP, once a round, only when it is not your turn | `calls/core.ts:66-72 gate` (`callReactWhy`: hindering Calls never; `level < reaction_at`; `active(cb) === u` refuses; `spoken().left('reaction', 1, REACT_KEY)`; `canReact`), `:131-141 useCall` (through `react()`), price at `:46` (`CALL_RULES.reaction_ap`); `callPad` flag `:191`; web `apps/web/src/screens/shared.js:96` (the "also as a reaction, for 0 AP, once a round" line) |
| 10 | The first Call of each turn costs 0 AP (not for a reaction) | `calls/core.ts:47` `level >= free_at && callsThisTurn(cb,u) < free_per_turn` -> `ap = 0`; `callsThisTurn` counts Calls made on the speaker's own turn (`spoken().used('per_turn', TURN_KEY)`, taken at `speak :153`); web `shared.js:97` ("your first Call each turn costs no AP") |
| every | Range `4 + 1 per point`: 14 tiles at 10 | `calls/data.ts:22 callRangeAt` |

The overlap Leon named: at 9 the Call is already free as a reaction (0 AP) and at 10 the first Call of your own turn is free: both give a 0 AP Call, only the timing differs. Texts that state the steps: `data/calls.json` rules `text`, `apps/web/src/screens/shared.js:87-100` (`callBlock`: marks built from `def.steps`, `cheap_at`, `reaction_at`, `free_at`), `skilltab.test.ts:98-101`, `callView.test.ts`, `combat-calls.test.ts`.

All nine Calls: call.order (authority), call.rally (charisma), call.brief (eloquence), call.name_it (lore_master, aim self-or-ally), call.cue (reaction_speed), call.spot (vigilant, hindering), call.warn (sensory), call.threaten (intimidation, hindering, Heart save), call.taunt (implication, hindering, Heart save). Each has `steps` at 1/3/7 with `numbers` (`data/calls.json`), handlers in `calls/handlers.ts` (order `:66`, rally `:106`, brief `:119`, name_it `:130`, cue `:153`, spot `:190`, warn `:205`, threaten `:232`, taunt `:259`).

### 5.2 How a Call picks targets today (one target everywhere)

| Place | Single-target fact |
|---|---|
| Action | `combat/call {unitId, id, targetId?, tile?, opt?, text?, react?}` (`game.ts:423`, `runCall :1973-1979`); `CallArgs.targetId` (`calls/types.ts:19`) |
| Picker (web / descriptors) | `descriptors.ts:790-812` and `apps/web/src/screens/shared.js:~98-106`: a `targetId` pick of kind `ally` or `enemy` ("Click an ally within N tiles"), plus Order's `opt`/`tile` and Cue / Warn's `tile`; `send` builds one `combat/call` with one `targetId` |
| Core | `calls/core.ts:119-127 prepare`: `tgt` from `args.targetId` (or the speaker for `self-or-ally` with none); `:89-104 targetGate`: side check per `def.aim` (ally / enemy / self-or-ally), alive, hearing range `dist(u.pos, tgt.pos) > pv.range`, hidden enemies not seen refused (`seesHidden` for Spot), and the per-target limit: `tgt.call.helped` or `hindered` mark with `r === cb.round` ("has already been helped by a Call this round") |
| Cost and use | paid once (`speak :149-151 pay`), one `callMarks(tgt)[key] = {r, id, side}` mark, one fx `call` with one `target` (`:152`), one log line, `p.h.run(t)` once |
| Refund path | `speak :158-166` restores the one target's mark (`limit0`) and the caster's counters |
| Handler contract | `Call.tgt: Unit` (`calls/types.ts:34`), `CallPreview.target/gives/save/moves` single (`:23-30`); every handler acts on `t.tgt` (and `t.args.tile`) |
| Hooks | `call_cost {u, id, ap, react}` (core.ts:48), `call {u, t: tgt, id, kind, step, react, tnAdd, cancel}` (core.ts:136) |
| AI | `calls/ai.ts` and `aiCallScore core.ts:171-178` score one target per Call; enemies' Calls: `enemies.json` `calls`, `call_level`; `CALL_RULES.enemy {per_turn: 1, beats: 5}` |
| Marks stored | `Unit.call` (`calls/types.ts:48-67`): `helped`, `hindered`, brief, saves, cue, spot, warn, apLoss, cowed, tauntAp, each with `by` and `side`; shown through `callView :207-216` |
| Preview / pad | `previewCall`, `callPad` per Call, single `target` |

What "reaches every ally in range" (or every foe in range) at point 10 would touch, as a list of the places above that assume one target: `CallArgs`/`Call.tgt`/`CallPreview` types; `prepare` and `buildCall` (one `tgt`); `targetGate` (range and the per-round helped / hindered mark per target: an ally already helped this round would block, or be skipped); `speak` (one mark, one fx, one log line, one refund path; a per-target `hinder()` save roll for hindering Calls, `core.ts:~219-226`); every handler's `run` (they read `t.tgt`; Name It's `self-or-ally` aim and Order / Cue / Warn's `tile` and `opt` args are per ally); `giveAp` (`core.ts:~205`: each target's own 3-AP-per-turn cap and `apLands` timing); the `call` hook's `t` (one unit); the web picker (a single `targetId` pick, and the pad's text from `def.steps` and `shared.js:97`); the AI scoring (`aiCallScore`); the tests `combat-calls.test.ts`, `callView.test.ts`, `skilltab.test.ts:98-101` and the engine's calls tests. No helper exists that lists the allies (or foes) within a Call's range: the picker builds `allyIds` / `foeIds` itself (`descriptors.ts`).
