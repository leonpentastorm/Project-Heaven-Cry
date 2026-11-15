# Consolidation review, 0.29 wave 3 (rule 4)

Reviewer: Claude (Opus 5.5), 16 Nov 2026. Range: `94ce898a...origin/wip/feature-0.29` at `2fef47c7` (the Sigils and
Outbursts door slices, prayer 2.0, Momentum 2.0, Pressure 2.0, Shadow 2.0 slices 1-2, the Open Hand, the wave-2
must-fixes, the 18 alpha perks, Guard 2.0 slice 1, the tank fit). Read: the code diff of `packages/engine/src`, `data`,
`tools`, `docs/ENGINE-HOOKS.md`, and `apps/web/src/game/fx`, `doorView.ts` and the client files that read the new data.
Run: `python tools/validate.py data` (0 errors; text-number ceiling 1285 to 1196), `tools/engine_catalog.py` (current).
The 0.28.3 hotfix line is not merged and was not reviewed.

## MUST-FIX

1. **Two readings of "is a Finisher".** `packages/engine/src/perks/skeleton.ts:54` (Follow Through) tests
   `TECHNIQUE[id].group === 'finisher'` on a `combat/technique` action only; the new `tech_group`
   (`effects/triggers.ts:266`, `techGroupOf`) also counts `techniques.json rules.group_actions` ("the Breaker's Launch
   is a Finisher, rules 1.56"). A Launch that drops its target counts as a Finisher for Keep Swinging but gives no
   Follow Through Momentum, and does not end the chain (`physical/core.ts:935`). Fix: one exported `techGroupOf`, read by
   Follow Through and the chain.
2. **Taunted on a Boss is ruled three ways.** Draw Fire `classes/i.ts:430` (code: a Boss isn't forced, takes -2 to hit
   others); Challenge `data/skills.json:288-304` (a data `cancel`: a Boss isn't Taunted at all); the Figment's Draw fire
   `data/figments.json:187` (no Boss rule: a Boss is fully Taunted). The same condition has three Boss rules, two of them
   on the same Bulwark. Fix: one tier rule on the `taunted` row (or `applyCond`), and remove the per-item copies.

## SHOULD-FIX (18; the five most important first)

1. Forced moves on a Boss are typed per item: Palm `items.json` (target_not_tier boss), Launch `classes.json` (reach.if),
   Tug `tending.json` (a Boss 1 tile), Slam `skills.json:343` (none: Slam pushes a Boss). This should be one rule, in
   `FORCED`/`forcedRefusal` (`combat.ts:2030`).
2. `combat.ts:1284`: `rollWithPick` is given `w.skill` (the main-hand row). The gear card (`gearpreview.ts:62`,
   `rollWithLines`) reads `weaponVia` (strikeWeapon), and the brain debuff reads `useW.skill`. That is three readings of
   "the weapon's own skill", and they differ for off-hand or thrown strikes.
3. `effects/triggers.ts:265-267`: `TECH_ROW` and `techSystemOf` are a second technique index, with the group's system
   worked out again beside `physical/data.ts` `TECHNIQUE` and `groupsOf`.
4. Client door readers: `resources.ts` `GUARD_DOOR_LINE` reads `skills.durability.door_line` beside `doorView.ts` (the
   "one reader"). `commands.ts` `DOOR_HEADS` types the door tabs, titles and inks beside the engine's `DOOR_TABS`.
   `doorView.ts` `DOOR_TOKENS` (`{line_min}`) is a second placeholder system beside `{=…}`.
5. Guard numbers in code: `game.ts:4358` sandbox/meter clamps Guard at a typed 5 and raises resMax to it (data cap is
   now 4). The fallbacks `soak ?? 10` (`physical/core.ts:99`), `?? 2` and `?? 1` (`guardHint`) are stale against data 6.
6. `illusion.ts:1005`: `img.fade ?? 0` (fade at once) against Glimmer's data 2. `figments.ts:822` reads
   `numbers.fade_rounds` unvalidated.
7. Run and Gun (`classes.json` ~1120, pre-existing): the text reads `numbers.tiles` and `numbers.pressure`, but the rule
   reads `if.path_tiles_at_most: 2` and `value: 1`, so the two can drift.
8. Numbers typed into texts: `skills.json:254` and `:323` why-texts ("needs Durability 3/5"), and Last Plate's say "1 HP"
   (`:198`). Challenge's `fx.within: 2` duplicates `targets.within`, and the client falls back with `|| 2`
   (`fx/guard.ts:173`).
9. Client fx keyed on item ids: `fx/guard.ts:40` (six move ids), `fx/openhand.ts:33` (form ids) and `:115`
   (`e.tech === 'flurry'`), `fx/faith.ts:142` CHAPLAIN_FX, `fx/shadow.ts:38`. Each new move needs client code.
10. Four token chips (`techView` momentumLook, `resources.ts` sigilChip, pressureLook, `tokenFade` wisps), each placed by
    its own absolute style and kept apart only by comments.
11. Tests that call inner functions: `open-hand-2.test.ts:31` (`usable`), `shadow-2.test.ts:48` and `:62`
    (`hideBlock`), `prayer2.test.ts:120-129` (`applyDamage` used as a hit).
12. The `outburst` damage word is now `src.door` only, and only `releaseAt` and the aura leak run inside `withDoor`
    (`magic.ts:1042`, `:1698`). Confirm the Outburst previews carry it: Hollow Heart (`traits.json:2270`, context
    outburst) and survival `start.hot_blood`.
13. `tools/validate.py` `_OWNER_USE_TYPES` copies `owned.ts` `OWNER_USES`.
14. `combat.ts:2924` enemySearchTile: the fallback heads for hostiles the enemy cannot see. This is AI in code, with no
    data.
15. Draw Fire is still `adjudication: hybrid` (`classes.json:3660`, pre-existing).
16. `fx/faith.ts:148` sorts Devotion lines by a regex on the reason text.
17. Removed handlers leave stale per-character state on 0.28.2 sheets (`planted`, `holyBless`, Blueprint's sketch).
    It is harmless, but nothing clears it.
18. Launch's `ap_cost` and `effects.0.ap` (`classes.json:527/548`) are two copies of 2.

## (d) Closed-list additions since 94ce898a

Approved and found: `src.door` with the damage words (`dmgwords.ts`, `withDoor`, `SPELL_DOORS`, amount `door`);
`roll_with`; `self_holds` hands and body (`armourClassOf`); `ownDefence`; Hide `spots` and `eyes` (`eyesOn`,
`HIDE_WHY`); the `figment_order` site; the data-verb `use`; `tech` on damage hooks and volley; `tech_group` with
`group_actions`.

NOT approved:

- Fx kinds emitted only from data, which the catalogue cannot see: `guard_move` (six moves), `amen`, `canticle`,
  `canticle_break`, `holy_dread`, `last_rites`, `ward_seal`, and about 14 new `stance` words.
- `reveal(..., {how, by})`, with `foundFx` and `FoundHow` (`tactics.ts`).
- `spendGuard(why, soaked)`, with `GuardWhy` and the guard fx `why`.
- `braceHook.gain` (`combat.ts:2160`).
- The redirect op's `ctx.moved` and `ctx.movedTo`, read by Interpose (`guard.ts:79`).
- The op fx's `other` and `from` (`triggers.ts:661`).
- `<who>_kind` widened to an owned unit's record kind (`triggers.ts:528`).
- `src.stage` (`magic.ts:1033`).
- `to_hit` `ctx.door` (`rolls.ts:178`).
- TechDef `comes_while`.
- `tab_also` with `DOOR_TABS` and `doorTabsOf`, `door_line`/`door_tab`, and the classes' gain `door_line`.
- The tie kind `verse` (`rules.json`).
- `FalseImage.fade`.
- `isCarriedModifier`, and a carried modifier's `grant_action` becoming its holder's action (`collect.ts:403-407`).

Most of these could ride existing pieces. The fx words could go into the catalogue from data. `reveal`'s `how` could be
inferred from `why`. `braceHook.gain` could import `guardGain`.

## Other checks

- (f) Lint baselines only shrank (lint-costs, F6, F2, lint-item-ops).
- (g) The Figment forks are migrated at load (`game.ts:868`). Glimmer and the gloves are new in 0.29. A mid-fight unit
  keeps resMax.guard 5 until the fight ends. No condition was renamed or removed (95 to 107 rows). `given()` now lets
  Guard be learned and readied.
- (h) No new row with a non-engine adjudication.
- (i) Dead data: variants (known dead). The gloves are reachable only through the unarmed archetype rack. Nothing else
  found.
- (j) No enemy gains a player rule: `roll_with`, `comes_while` and the Open Hand need a character, and Guard's `innate`
  reads PC Durability only.
