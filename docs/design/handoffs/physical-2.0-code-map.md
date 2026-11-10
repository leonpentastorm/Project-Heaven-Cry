# Physical 2.0: code map

What exists today in the code Physical 2.0 builds on, with file and line references. Written 10 Nov 2026 from the base branch at commit `1f6825c` by six read-only readers, one per part; nothing was built or run to produce it. Line numbers drift as the base moves: trust the function names, and re-check a line before you rely on it. It describes what is there, not the design: the design is in the two proposals and [`physical-2.0-PLAN.md`](physical-2.0-PLAN.md).

Each part ends with "Where Physical 2.0 plugs in here" and "Traps". Read the traps for any file you are about to edit.


---

## Part: The attack pipeline

Read from source only; nothing was built or run. The web client callers (`apps/web/src/game/commands.ts`, `screens/combat.js`, `screens/main.js`) were located but not read.

Prefixes, all under `/home/user/Project-Heaven-Cry/packages/engine/src/`: **C** `combat.ts`, **G** `game.ts`, **T** `tactics.ts`, **M** `magic.ts`, **D** `effects/damage.ts`, **CH** `character.ts`.

### Types
- `Unit` C:64-156:
  - AP and gun state: `ap, bank, ammo, heat, jammed, shotsThisTurn` C:67; `kills` C:68.
  - Ammo: `mags, loose` C:78; `ammoType, magTypes` C:128; off hand C:86, C:134.
  - Stances and reactions: `prone, braced, overwatch` (`'shot'|'aimed'|'melee'|null`) C:84; `reactUsed {r,n}, owShots` C:116.
  - Per-turn flags: `moved, firstShotDone` C:87; `firstShotTurn, sprinted, attackedTurn` C:118.
  - Conditions: `conds` C:90; `condBy, condArg, condFresh` C:103. Hidden: `hidden, hideEntry, ambushUsed` C:106.
  - Class resources `res, resMax` C:145; item runtime `held, ps, uses, armed` C:94; `lastHitBy, damagedBy` (unit ids only) C:97.
- `Combat` C:157-219: `mods` (the action's toggles) C:189, `window` C:187, `fx` C:179.
- Builders: `unitFromCharacter` C:341 (`attack` is fixed at build, C:346), `pcExtras` C:362, `resourcesFor` C:391, `unitFromEnemy` C:398.
- Momentum and Guard exist only on classes that list them (CH:1012-1024); other units have no `resMax.momentum`.

### Actions and modes
- `AttackMode = 'shot'|'aimed'|'melee'|'burst'|'auto'` C:774; action type G:301.
- Reducer G:1348-1355: burst goes to `fireBurst` C:1285, auto to `fireAuto` C:1293, anything else to `previewAttack` then `resolveAttack`.
- Other entries: `useWeaponSkill` C:1359 (`multi_shot`, `sweep`; everything else is Narrator text, C:1387), `pairedAttack` C:1402, `shootCover` C:1595, `setOverwatch` C:1279, `shove` C:1310.
- `mode:'melee'` with a gun strikes with `WEAPON.fists` C:776 (bayonet base 15, C:845).
- AP: `attackApCost` C:750. Melee is 3 if the category starts with `heavy`, else 2; `ap_cost` in the data is ignored for melee. Burst is 3 and auto 4 (C:778).

### previewAttack (C:775-832)
- Returns `AttackPreview` C:769: `ok, why, ap, toHit, need, pct, cover, coverTile, rangePenalty, terms[], dmg`.
- Emits `attack_preview` C:782-783 with a mutable ctx: `ap, reach, ignoreCover, terms, fail, noRecoil, coverTile, ignoreTaunt, seeVeil, volley, mods`. `preview: true` means handlers must not change state.
- Refusals C:786-806: dead target, Afraid, Taunted, Disarmed or lowered, AP, mode not in `w.modes`, sight, broken, needs Brace, reach, jammed, empty, line of sight, more than 2 range bands.
- To-hit terms C:823-826:
  - `att.attack`, song, weapon-skill bonus (C:813), weapon accuracy;
  - aimed +2, auto −2, `opts.extra`;
  - range −2 per band past `effectiveRange` (C:805, C:810); Heat −floor(heat ÷ 2) (C:811);
  - injured arm, target Downed +2, target prone ±2, unbraced −2;
  - half cover −5, directional (`coverTileFor` C:618; full cover is line of sight only);
  - `condHit` (M:216; Pinned −2);
  - recoil: −shots this turn + floor(Dexterity ÷ 2), halved braced or Emplaced, none on auto (C:818-820); Emplaced +2;
  - hook terms.
- `pct` is clamped 5 to 95 (C:829).
- There is no flanking term and no weapon-mastery bonus. The engine never reads `data/weapon_mastery.json`; `weaponKills` is only written (G:1822, `perks/c.ts:892`) and displayed (`apps/web/src/screens/main.js:510`).

### resolveAttack (C:882-973), in order
1. Confused redirect C:885; `attack_target` C:890.
2. Preview again; a refused preview costs nothing and rolls nothing (C:896).
3. AP paid C:903. Ambush flag C:910.
4. `d20(rng)`, then `attack_roll` (mutable `die, critMin, noFumble, hit`) C:912-913. Crit on 19+ when aimed or ambushing.
5. Guns: ammo −1, Heat +1, `shotsThisTurn++` C:919-920. Jam on a fumble, on a roll of 2 or less when worn, or at Heat ≥ `heatLimit` (C:922, C:991). Otherwise a fumble sets `stunnedNext`.
6. Durability C:926; flags C:927; fx `shot` or `melee` C:929.
7. On a hit: `attackDamage`, then `max(1, floor(total) − armour)` C:934, then `applyDamage` with `credit:'all'` C:935.
8. Riders: crit injury C:939; weapon `grants.effect` on-hit (C:941, `onHit` C:1342); Burning and mana C:948-949; splash C:951.
9. **Momentum +1 on a melee hit, if `resMax.momentum` exists** (C:953).
10. Reveal unless silent C:955; a cover-stopped miss damages the cover C:959-962.
11. `on_hit`, or `on_miss` unless cover stopped it (C:968-969); flamer cone C:971.

### Damage
- `attackDamage` C:841-871. Base is `weaponDamage` C:748.
- Multipliers: `physicalMult` (CH:576, Strength and Raw Power, applied to guns too), rarity, `opts.dmgMult`, wear, ammo type (T:23; `rules.json weapons_rules.ammo_types`), crit (`critMult` CH:577, less `tgt.critTaken`), ambush, Weakened, Sharpened.
- `damage_out` C:862 takes `add`, `mults`, and `vs` (additive, capped at ×2; T:41-45). Armour and pierce C:867-869.
- `applyDamage` D:49-90 runs `damage_in` in phases (`reduce`, `shield`, `would_drop_to_0`, `after`), then `on_damaged`. `dropped` D:91-97 adds `by.kills` (+3 for a boss) and emits `on_downed` and `on_kill`.

### Kills
- There is no per-kill XP.
- `unitToCharacter` adds `u.kills` to `c.weaponKills[mastery_family]` of the weapon held when the fight ends (G:1822), only when `!cb.noXp` (G:1572).
- Fight XP is a flat `combatXp(cb)` to every living character on a win (G:1585, C:1778).
- `noteDeaths` (M:145; mana and loot) runs after each action (G:1416).

### Reactions, opportunity attacks, Overwatch
- One reaction a round plus stat `reactions`; none while Suppressed or Stunned (`maxReactions` T:49; `canReact` and `useReaction` T:65-74).
- `moveUnit` C:1163 walks tile by tile. Each step emits `move_step` C:1206, then checks opportunity attacks C:1210-1216 (`reaction_window`, `opportunityStrike` C:1254), then `triggerOverwatch` C:1217, then Heart Overwatch C:1219.
- A Hidden mover draws none (C:1190). `move_cost` can set `skipOA` and `skipOW` (C:1183).
- `setOverwatch` C:1279 pays `attackApCost` and sets `u.overwatch`; `beginTurn` clears it (C:1060).
- `triggerOverwatch` C:1265-1278: the watcher must see the mover, the preview must pass, `canReact`, then `reaction_window`, then `owShots` free attacks.

### Other pieces
- Volleys: `chained()` and the module-level `VOLLEY` C:273-277; `volleyAp` C:280; `volley_end`. Burst cools 1 Heat after (C:1291). Auto adds `4 − hits` Heat and spends 10 rounds (C:1306-1307).
- Reload: `reload` C:1436 (speed drops the magazine in the pile, tactical +1 AP), `reloadHands` C:1481, `reloadAp` C:1791. Jam: `clearJam` C:1630, `canJam` C:1784.
- `brace` C:1334 works only for weapons `weaponActions` lists (C:1818); moving clears it (C:1187). Emplaced is a condition, read at C:820-821.
- `shove` C:1310-1329: 2 AP, d20 + Raw Power, `forced_move`, then sets `t.pos` directly.
- Suppressed (M:86): −1 AP at `beginTurn` for any side (C:1055) and no reactions (T:50). Only Spray and Pray applies it (`perks/c.ts:659`, 686-687).
- Pinned (M:79): blocks movement (C:1153), stops a walk (C:1222), −2 to hit (M:218). Applied at M:1038, M:1215, `classes/k.ts:901`, `classes/k.ts:913`, `classes/rev3.ts:397`.
- Momentum is lost in `closeTurn` when the unit neither shot nor attacked (C:1115).
- Enemy AI uses only `'melee'|'shot'` (C:1704; `enemyTurn` C:1669).

### Where Physical 2.0 plugs in here
- **Call, don't fork:** `previewAttack` and `resolveAttack` with `opts {extra, dmgMult, noAp, free, noWear}`. Wrap multi-roll techniques in `chained()` and emit `volley_end`, as `fireBurst` does.
- **Extend:**
  - `AttackPreview.terms` and `attack_preview` for property riders;
  - `damage_out` for multipliers; `attack_roll` for crit ranges;
  - `applyCond` (M:244) for saves and riders;
  - `resGain` and `resSpend` (T:320-324) for Momentum, once `resourcesFor` gives it to everyone;
  - `reaction_window`, `on_miss` and `on_hit` for Answers (pattern: `classes/i.ts:291-300`);
  - `u.overwatch` plus the `moveUnit` step loop for the new Watches;
  - `maxReactions` for Pressure 3; `weaponActions` C:1799 for the panel;
  - `on_kill` or `dropped` for drill;
  - `beginTurn` and `closeTurn` for per-turn resets and decay;
  - new `combat/*` cases at G:1336.
- **Leave alone:** `applyDamage` phases, `emitFx` and its event shapes, `moveUnit`'s bank maths, the reload and pile code, and the Sigil and Soul calls inside `beginTurn` and `closeTurn`.

### Traps
1. **One file, very long lines.** C:60-160, the `beginTurn` reset line C:1060 and the terms line C:823 will collide if two branches touch them.
2. **Determinism.** Every `d20` or `die` moves the seeded stream, so a new roll inside `resolveAttack` shifts every later result and existing tests. Hooks fire in `cb.units` order. `previewAttack` must stay pure: the AI (C:1710), Confused (C:886) and `enemyIntent` (C:1741) call it freely.
3. **Module state.** `VOLLEY` and `fxChain` in C, and `lunging` and `riposting` in `classes/i.ts`, are not in the save.
4. **Saves.** A `Unit` is serialised mid-fight, so new fields must be optional (C:98).
5. **Snapshot lists need any new per-turn counter added:** `quiet()` `classes/j.ts:45-51`, `enemyIntent` C:1744, the `pairedAttack` keep-list C:1415, and `GEAR_FRESH` G:1478.
6. **Kill credit is one number per unit.** Nothing records which weapon dealt damage; `damagedBy` holds unit ids. Drill "with that weapon" needs new data, and a mid-fight swap credits today's kills to the weapon held at the end.
7. **Rules read presentation.** Spray and Pray's `autoRound` and `ammoHog` scan `cb.fx` for `volley` and `chain` (`perks/c.ts:652-671`). Changing volley fx, or exceeding `FX_CAP` 40, breaks them.
8. **Forced moves skip the walk.** `shove` and `onHit` push (C:1325, C:1352) set `pos` directly: no `move_step`, opportunity attack, Overwatch or hazard. A Link that should trigger a Watch must call it explicitly.
9. **Suppressed costs players AP today** (C:1055); the proposal says it never does.
10. **Weapon skills are read inline** as `fx.op` at C:778-779, 813, 859, 867-868, 905, 941-944 and 962; 32 of the 60 weapons are `narrator`. The `quiver` property is in the data but nothing reads it.
11. **Other id lists** to keep in step with new action types: `encoreKey` C:755, the `allowedActions` mapping G:1322, and `COMPANION_ACTS` G:1319.


---

## Part: The item and hook registry

Read-only survey; nothing was built or run. `E/` = `/home/user/Project-Heaven-Cry/packages/engine/src/`, `D/` = `/home/user/Project-Heaven-Cry/data/`.

Two of the brief's assumptions don't hold: weapon skills are not in the registry (section 5), and weapon mastery is a kill counter with a display, nothing more (section 6).

### 1. Registry
- `register(def)` at `E/effects/hooks.ts:20-29`. The key is `keyOf(id, kind)`; an id with a dot is a class move (`hooks.ts:21`), a bare id resolves perk, then trait, then skill item (`E/effects/collect.ts:103`).
- A second `register` for the same key merges: hooks chain, actions and toggles concatenate, the later `stat`/`checkMod`/`brief` wins (`hooks.ts:24-27`).
- `ItemHandler` (`E/effects/types.ts:135-155`): `claims`, `narrator`, `priority` (default 100, generic ops 200: `hooks.ts:90,95`), `stat`, `on`, `checkMod`, `actions`, `noDefaultActions`, `toggles`, `brief`.
- Kinds are `perk | trait | class | skill` only (`types.ts:9`). Items are built from data alone in `buildInfo` (`collect.ts:60-89`).
- Lanes: `E/perks/a..h.ts` + `skills.ts` (`E/perks/index.ts:3-11`), `E/classes/i, j, k, rev3.ts` (`E/classes/index.ts:3-6`), imported at `E/game.ts:35-36`.

### 2. Holder and the held snapshot
- `Holder` = `{key, itemId, kind, tier, info, c?, u?, cb?, g?}` (`types.ts:41-44`).
- `Held` = `{perks:[{id,tier}], traits, cls, rank, adv, skills}` (`collect.ts:109`); `heldOfChar` at `hooks.ts:105-109`.
- `heldOfUnit` (`hooks.ts:114`): `u.held` if set, else the bound game's character, else empty.
- A PC unit snapshots `held` when built, and only if the character has any item (`E/combat.ts:356`). Only `refreshClassUnits` refreshes it (`game.ts:458-461`).
- Enemies get no `held`, `res` or `resMax` (`unitFromEnemy`, `combat.ts:398-408`), and `emit` skips units that hold nothing (`hooks.ts:135`). The only character-less holder is a unit given `held` by hand (the twin, `E/classes/k.ts:1679,1730`).
- Item state: `stateOf(h)` is `u.ps[key]` in a fight, `g.story.ps[charId].items[key]` on the overworld (`E/effects/index.ts:40-46`).

### 3. Hooks
- Names: `types.ts:46-76`. `weapon_actions` is declared (`types.ts:61`) but never emitted.
- `emit` (`hooks.ts:132-142`) walks `cb.units` in order, each unit's items (traits, perks, class moves, skills: `collect.ts:135-146`) by priority, then global `onHook` listeners (`hooks.ts:150`). `ctx.stop` ends it.
- Ctx shapes that matter here:

| Hook | Site | Ctx |
|---|---|---|
| `attack_preview` | `combat.ts:782` | `{att,tgt,mode,melee,ap,reach,ignoreCover,terms,fail,free,noRecoil,volley,preview:true,mods}`; also volley pricing with `volleyCost:true` (`combat.ts:281`) |
| `attack_target` | `combat.ts:890` | `{att,tgt,orig,mode,volley,vi,locked}` |
| `attack_roll` | `combat.ts:912` | `{att,tgt,mode,die,toHit,need,critMin,noFumble,ambush,hit,rng}` |
| `damage_out` | `combat.ts:861` | `{att,tgt,mode,melee,src,base,add,mults,vs,crit,preview}` |
| `on_hit` / `on_miss` | `combat.ts:968-969` | `{att,tgt,mode,dmg,crit,killed,melee,volley,rng}` / `{…,die,fumble}` |
| `damage_in` | `E/effects/damage.ts:52-86` | phases `reduce`, `shield`, `would_drop_to_0`, `after` |
| `on_kill` | `damage.ts:96` | `{victim,by,src,ownTurn}` |

- Others: `turn_start_pre` `combat.ts:1056`, `turn_start` `:1106`, `turn_end` `:1134`, `move_cost` `:1183`, `reaction_window` `:1214`, `moved` `:1233`, `forced_move` `:1324`, `reload` `:1450`, `action_done` `game.ts:1412`.
- Queries: `statQuery` `hooks.ts:176`, `checkQuery` `hooks.ts:191`.

### 4. Actions, uses, verdict
- `ActionDef` (`types.ts:100-122`): `id, label, scope, ap, uses{per,n}, target, range, available, preview, run, arm, pick, pickMulti, pickLabel`. `ActionArgs` (`types.ts:93`): `targetId, targetIds, tile, choice, text, npc, checkId, arm`.
- `actionDefs` (`E/effects/actions.ts:67-70`): a lane's actions replace the data defaults (`defaultActions`, `actions.ts:35-48`).
- The UI list is `perkActionsFor` (`actions.ts:92`); `entryOf` (`actions.ts:125-143`) greys an entry with `why` and files it under `class` or `perks` by kind (`:140`).
- Reducer: `combat/perk` (`game.ts:1337`, type at `game.ts:349`) calls `runPerkAction` (`actions.ts:194-217`): preview, AP spent (`:209`), use taken under `key#actionId` (`:210`), then `run`.
- Armed presets store `u.armed[key]` (`actions.ts:198-206`). Off-turn policies are 0-AP actions writing `stateOf(h).policy` (`E/classes/i.ts:66-72`).
- Toggles ride existing actions through `cb.mods` (`togglesFor` `actions.ts:222`, `modOn` `:234`, set at `game.ts:1329`).
- `uses(h)` (`E/effects/uses.ts:47-67`), scopes at `types.ts:88`. Turn, round and fight counters live on `u.uses`; scene and longer on `c.uses` (`uses.ts:40-44`).
- `verdictOf`/`verdictFor` (`E/effects/coverage.ts:20-35`) rest on `ownerOf` (`hooks.ts:61-75`). The gap ratchet is `BASELINE = 0` (`/home/user/Project-Heaven-Cry/packages/engine/test/coverage.test.ts:12`).

### 5. Weapon skills: inline in combat.ts, not items
- `D/weapons.json` has `grants {name,text,effect}` on 59 of 60 weapons; 32 are `op: "narrator"`.
- Passive ops are read straight off `WEAPON[u.weapon].grants.effect`:
  - `previewAttack`: `combat.ts:777-779` (`auto_ap`, `aimed_ap`, `reach`), label at `:823`.
  - `attackDamage`: `:859` (`vs_status_damage`), `:867-868` (`ignore_armour`).
  - `resolveAttack`: `:912` (`aimed_crit_min`), `:941` (`on_hit`, via `onHit` `:1342-1357`), `:944` (`edge_word`), `:962` and `:986` (`cover_damage_mult`).
  - Elsewhere: `combat.ts:1296` (`auto_width`), `:1818` (`braced_bonus`), `E/character.ts:575` (`defense_with_shield`).
- Active: `combat/skill` (`game.ts:1343`) calls `useWeaponSkill` (`combat.ts:1359-1388`), which runs only `multi_shot` and `sweep`; anything else returns a refusal (`:1387`).
- The button comes from `weaponActions` (`combat.ts:1799-1828`; skill row `:1825`, burst and auto `:1823`, overwatch `:1822`), hidden by stat `hide_weapon_skill` (`E/perks/c.ts:620`).

### 6. Weapon mastery: a kill counter and a sheet display
- `by.kills` rises at `damage.ts:93` (a boss counts 3). At fight end it is added to `c.weaponKills[mastery_family]` (`game.ts:1822`; field at `character.ts:52`). One Blade adds 25% (`perks/c.ts:890-892`).
- The engine never imports `D/weapon_mastery.json` (`E/data.ts:2-13`): no level, no attack bonus, none of the perks run.
- The sheet derives level, bonus text and perk names itself (`/home/user/Project-Heaven-Cry/apps/web/src/screens/main.js:508-512`).
- The file holds **11 families and 33 perks** (it includes `mana_arms`), not the 30 the proposals and Leon's "all 30" refer to.

### 7. Class resources and the Fighter
- `RES_RULES` (`character.ts:1011-1018`): momentum and guard max 5, not persisting. `classResources` `:1027`; `resourcesFor` `combat.ts:391-396`. Helpers `resOf`/`resGain`/`resSpend` at `E/tactics.ts:319-324`; `resGain` is a no-op without `resMax[id]`.
- Momentum: +1 per melee hit, only if `resMax.momentum` exists (`combat.ts:953`). Zeroed in `closeTurn` when the unit neither shot nor attacked (`combat.ts:1115`).
- Guard is gained by Brace; Interpose spends it inside `damage_in` phase `reduce` (`classes/i.ts:343-383`).
- Lunge (`classes/i.ts:252-283`): action, 1 Momentum, `moveUnit` under a `lunging` flag that zeroes `move_cost`, then `resolveAttack`. Its `attack_target` handler also pays the closing-in Momentum (`:274-280`).
- Riposte (`classes/i.ts:289-304`): `on_miss`, 1 Momentum and a reaction, free melee strike.
- Finisher (`classes/i.ts:310-327`): 3 AP, zeroes Momentum, +20% per point through `damage_out`.
- Reactions: `maxReactions` is 0 while Suppressed (`tactics.ts:49-52`); `canReact`/`useReaction` at `tactics.ts:65-74`.

### Where Physical 2.0 plugs in here
1. **Technique actions:** either a new item kind (touches `types.ts:9`, `collect.ts:60-89,103,109,117,135-148,156-170`, `hooks.ts:105-109`, `actions.ts:140`) or a separate system beside the registry, as weapon skills are today. Either way, attacks should go through `previewAttack`/`resolveAttack` and modify them by `attack_preview`, `attack_roll`, `damage_out`, `on_hit` and `on_miss`.
2. **Momentum for everyone:** `RES_RULES`/`classResources` (`character.ts:1011-1030`), `unitFromEnemy` (`combat.ts:398`), the gain at `combat.ts:953` and the loss at `combat.ts:1115`.
3. **Fighter moves:** rewrite in place at `classes/i.ts:252-327`; the keys `class:fighter.lunge|riposte|finisher` come from `D/classes.json`.
4. **Properties replacing `grants`:** every inline read listed in section 5, plus `reachOf` duplicated at `classes/i.ts:241` and `perks/a.ts:31`.
5. **Drill:** hang it on `on_kill` (`damage.ts:96`) or the write-back at `game.ts:1822`. There is no per-kill XP today, only `COMBAT_XP` per fight (`data.ts:66`).
6. **Leave alone:** `emit`/`register` internals, `uses.ts`, `applyDamage`, and the perk lanes except items keyed on weapon category.

### Traps
1. **Bare-id collisions.** `charge` (`perks/b.ts:502`) and `grapple` (`perks/a.ts:196`) are perks, and `feint`, `sunder`, `cleave`, `suppress`, `pin_down` are mastery perk ids; `guessKind` sends a bare id to the perk first.
2. **Hot files.** `combat.ts` lines are long and `previewAttack`/`attackDamage`/`resolveAttack` are single functions; `collect.ts`, `types.ts` (the `HookName` union) and `game.ts:1336-1405` are one-edit-at-a-time.
3. **`per_turn` is the active unit's turn.** The stamp is `t<round>.<turn>` (`uses.ts:29`), so a reaction's per-turn counter resets on every unit's turn.
4. **Determinism.** `apply` deep-clones by JSON (`game.ts:425`), so unit and character state must be plain JSON. Dice come only from `ctx.rng` or `g.rng`. Module flags (`lunging`, `riposting`, `finishing`, `interposing`) work only because one action is synchronous.
5. **Stale snapshots.** `u.held`, `u.res` and `u.resMax` are fixed at unit build; a mid-fight change needs `refreshClassUnits`.
6. **Saves.** New `Unit` fields must be optional (`combat.ts:98`). `weaponKills` is required on `Character`. Character migrations run at the top of every `apply` (`game.ts:428-434`).
7. **Hidden coupling.** Momentum is restored by snapshot at `E/classes/j.ts:46-50` and `:452-454`. Suppressed kills all reactions at `tactics.ts:50`, which conflicts with "protective reactions always work". Spray and Pray applies `suppressed` directly (`perks/c.ts:659`).
8. **Web mirrors.** `weaponActions` and `combat/skill` are used at `/home/user/Project-Heaven-Cry/apps/web/src/screens/combat.js:675,1294` and `/home/user/Project-Heaven-Cry/apps/web/src/game/commands.ts:137`.
9. **Heavy AP.** `attackApCost` prices melee by category (heavy 3, else 2: `combat.ts:750`) and ignores `ap_cost` in the data.


---

## Part: The reducer, actions and saves

`G` = `/home/user/Project-Heaven-Cry/packages/engine/src/game.ts` (3,636 lines), `C` = `.../src/character.ts` (1,066). Other files are named in full under the same folder. Read-only: nothing was run or edited.

### 1. Dispatch
- **`apply(state, action, by)`** (G:424): JSON-clones the state, `bindGame(g)`, runs the per-character migrations (G:428-434) and `migrateFloor`, then `reduce` + `worldAfter` (G:436), `masterySync` for every character (G:438), the sandbox hooks (G:439-440) and `g.v++`.
- **`reduce`** (G:480): `sandbox/*` goes to `sandboxAction` (G:481) and `faith/*` to `faithAction`. In the Proving Ground, `gear/*` and `magic/*` go to `sandboxGear` (G:485). Then one `switch`, ending `default: combatAction(g, a, by)` (G:884).
- **`combatAction`** (G:1306): checks a fight is on, `a.unitId === active(cb).id` (G:1310), ownership (G:1313-1317), the companion/puppet allow-list `COMPANION_ACTS` (G:1449) and `u.allowedActions` (G:1321). It sets `cb.mods` from `a.mods` (G:1329), then an inner `switch` (G:1336-1405) where each case calls a combat/magic function returning `string | null`. Tail (G:1407-1418): `encoreAfter`, `windowStep`, `emitHook('action_done')`, AP rounded to tenths, `songTriggers`, `critMoment`, `noteDeaths`, `checkOver`, `runEnemies`.
- **Area map:** `world/act` goes to `worldAct` (G:2118), which builds a throwaway `Combat` with `storyCb` (G:2066) and calls the same functions. Its acts are the `WorldAct` union (G:377); an attack on a foe token opens a fight through `overworldAttack` (G:2306).

### 2. Every `combat/*` action (union G:287-353; all carry `unitId` unless noted)
- **Movement and attacks:** `move {to, how?, mods?}`, `attack {targetId, mode: AttackMode, mods?}` (`AttackMode = shot|aimed|melee|burst|auto`, combat.ts:774), `shove {targetId}`, `prone`, `brace`, `overwatch {mode: shot|aimed|melee}`, `paired {targetId, targetId2?}`, `skill {targetId?}` (today's weapon skill, `useWeaponSkill`, G:1343), `throw {item, tile}`, `shoot-cover {tile}`.
- **Gear and ammo:** `reload {hand?, tactical?}`, `clear`, `load`, `swap {from?, mod?, to?}`, `equip {item, to}`, `stow {slot}`, `drop {slot}`, `pickup {tile, take?}`, `repair {targetId?}`, `recover`.
- **Other:** `stim {targetId}`, `analyze {targetId}`, `read {tile}`, `door {tile}`, `search {objId}`, `hide`, `extinguish {targetId?}`, `escape`, `parley {targetId, kind, text?}`, `pray {kind?, id?, choice?, targetId?, targetId2?, tile?, miracle?, mods?}`, `gift {aim}`, `song`, `end-turn`, `say {charId, text}` (no `unitId`; handled in `reduce`, G:848).
- **Magic:** `draw {word, tile, stroke?}`, `evoke {tile, aim?, aims?, dest?, order?, orderTo?, paint?, stroke?}`, `strike-turret {tile}`, `scuff`, `vent`, `core`, `outburst {design, aim?, hold?, watch?}`, `release {aim?}`, `pump {feeling?}`, `revert`, `letgo`, `steady`, `feed`, `heartwatch {on?}`, `syphon`, `crystallise`.
- **Items:** `perk {id, actionId?} & ActionArgs` (via `runPerkAction`, G:1337), `decline`.

### 3. Refusing
- `class RuleError` (G:385) and the module-private `fail(m): never` (G:386).
- Rules functions return an error sentence, and `if (err) fail(err)` (G:1407) throws it. `apply` then never returns, so the old state stands.
- The client toasts the message or sends `{t:'err'}` to the guest (apps/web/src/game/store.ts:183-191).
- `refuseHook` (G:2296) lets an item veto an action; only shove and overwatch call it.

### 4. Views
- `viewFor` (G:1732) strips: voice hooks, other players' private entries and Overreach, memory and archive, hidden objects, the other side's rigged tiles and secret zones, `fx` marked `only`, the sight records (G:1749), fogged piles, `lootLog` for non-hosts, and what `worldView` hides.
- `sandboxView` (G:3557) empties `sandbox.saved` and flips sides for Team B.
- **Not filtered:** `g.characters` and unit fields. Every guest sees every character's whole sheet and every unit's numbers.
- Guests only ever hold a view (store.ts:207).

### 5. Character fields for weapons (`Character`, C:45-111)
- `weapon: string` (C:51) with `weaponState?: GearState` (C:60), `loaded?` (C:58) and `loadedType?` (C:102).
- `offHand?: {id, loaded?, ammoType?} & GearState` (C:63).
- `pack?: PackItem[]` (C:56; shape C:135-144), read through `packOf` (C:515).
- `weaponKills: Record<family, number>` (C:52; `{}` at creation, C:422).
- `uses?` (C:78): scene, session, rest and campaign counters only (effects/uses.ts:2-4).
- `state?: Record<string, any>` (C:104): free item state (the perks' `cs()`).
- `res?` (C:100): Supplies and Toxins only. Momentum is a Fighter class resource, max 5, starting each fight at 0 (`RES_RULES`, C:1011-1018).
- Helpers: `inHands` (C:673), `twoHands` (C:919), `equip`/`unequip`/`handEntry`/`emptyHand` (C:932-984), `isGunId` (C:458), `throwRange` (C:714).

### 6. How magic stores learning
- **Sigil words known:** `sigils?: string[]` on `Sheet` (C:27); cap `wordsKnownCap = 4 + Brain Power + free words taken` (C:593).
- **Sigil study:** an untyped `(c as any).sigilGrowth` of `{study, picksUsed, free, freeTaken, paid, toStudy, uses}` (sigilgrowth.ts:21-26), created lazily by `growthOf`. Earned in `noteEvoke` (sigilgrowth.ts:48), spent in `learnStudied` (:88) through the `sigil/learn` action (G:785).
- **Outburst practice:** `soulPractice?: number` and `soulPicks?: {module, via}[]` (C:34). Earned mid-fight by `gainPractice` (magic.ts:1263), which writes the character through `charOfUnit` (effects/hooks.ts:115) and skips `cb.dry`. Thresholds 5, 15, then every 15: `picksAt`/`nextPickAt`/`soulPicksLeft`/`soulPickError` (C:636-665). Spent by `magic/pick` (G:792).
- **Ready designs:** `outbursts?: OutburstDesign[]` and `soulKnown` (C:68). The cap is `readyDesigns(c)` (C:604), enforced only in `magic/design` (G:779). `magic/forget` is at G:802.
- **Teaching:** `magic/learn` from an ally or a plate (G:748-769) and the Narrator's `magic[]` (`narratorTeach`, G:2055) both go through `teach` (G:2037), gated by `learnedScene` (one new thing a scene).

### 7. Migrations
- Five run on every action for every character, in one line (G:429): `migrateCharacterSigils` (C:304), `migrateCharacterSoul` (C:378), `migrateCharacterClass` (C:850), `migrateCharacterFocus` (C:838), `migrateCharacterFaith` (faith.ts:1280).
- The pattern: an exported `X_REV`, `if (c.xRev === X_REV) return []; c.xRev = X_REV; ...`, returning log notes that `apply` pushes as system lines (G:433).
- To add one: write the function, append it to the array at G:429, add the import (G:11), and stamp the rev in `newCharacter` (C:421-423).

### 8. XP and kills
- **There is no per-kill XP.** `finishCombat` (G:1569) gives every living character, not just the killer, `combatXp(cb)` for a win (G:1585). That is a flat figure by fight difficulty: 25/50/100/200 (data.ts:66, combat.ts:1778).
- `giveXp` (G:1126) applies the XP modifiers, levels and ranks.
- **Kill credit** lives in effects/damage.ts: `by.kills += boss ? 3 : 1` (:93), then `emit('on_kill', {victim, by, src, ownTurn, cb})` (:96). Any damage also appends the attacker's unit id to `t.damagedBy` (:79); that records who, not which weapon.
- `weaponKills` is written once, in `unitToCharacter` (G:1822), only with `afterFight` true, and keyed by the family of the weapon in hand when the fight ended.
- `data/weapon_mastery.json` is not loaded by the engine. The only readers of `weaponKills` are apps/web/src/screens/main.js:510 and the One Blade perk (perks/c.ts:890-892).

### 9. Proving Ground grants (`SandboxAction`, G:2587-2620; handler G:2960)
- `mine(charId)` (G:2964) checks the owner or host. `sbChange(g, c, fn, mode)` (G:2712) writes the fighter back, mutates the character and rebuilds the unit, keeping the `SB_KEEP` fields (G:2685).
- The grant tools: `sandbox/give` (G:3149, via `sbGive`, G:2754), `equip`/`unequip`/`drop`/`armour` (G:3174), `class` (G:3185), `level` (G:3213), `skill`/`skills` (G:3223), `perk` (G:3233), `trait` (G:3240), `learn` (G:3247), `practice` (G:3269), `design`/`forget` (G:3274), `study`/`word-uses` (G:3301), `refill` (G:3142).
- `sandboxGear` (G:3318) maps the player's ordinary `gear/*` and `magic/*` actions onto these.

### Where Physical 2.0 plugs in here
1. **New actions:** add members to `Action` (G:287) and cases to the `combatAction` switch (G:1336), calling functions that return `string | null`, as `combat/outburst` does. Leave the tail (G:1407-1418) alone.
2. **Area map:** a technique usable there needs a `WorldAct` member (G:377) and a branch in `worldAct`. Striking a token must go through `overworldAttack`.
3. **Storage:** add optional fields to `Character` (or `Sheet`, if chosen at creation). Mirror `soulPractice`/`soulPicks`/`outbursts` and the pure helpers at C:604-665. Put the ready-cap functions next to `readyDesigns` (C:604).
4. **Out-of-combat list actions:** copy `magic/design`, `magic/pick` and `magic/forget` (G:770-807), with a `sandboxGear` mapping (G:3322) if they should work in the Proving Ground.
5. **Drill credit:** register an `on_kill` listener, as feelings.ts:151 and faith.ts:620 do. Write through `charOfUnit`, and skip `cb.dry`, `cb.noXp` and `cb.overworld`. Per-weapon damage attribution has to be added in the damage path; `damagedBy` does not carry it.
6. **Sandbox tools:** new `sandbox/*` cases shaped like `sandbox/practice` (G:3269), using `mine` + `sbChange`.
7. **Teaching:** extend `teach`/`teachCheck` (G:2030-2050) and `NarratorTurn.magic` (G:265), or add a sibling field.

### Traps
1. **Merge hot spots**, each one long line or block that every branch will touch: the `Action` union (G:287-353), the `combatAction` switch, the migration line (G:429), `SB_KEEP` (G:2685-2687), `GEAR_FRESH` (G:1474), the import lines (G:7-12), the `Character` interface and `newCharacter` (C:420-424).
2. **Unit state is dropped on rebuild.** `sbRebuild` and `refitUnit` (G:1479) rebuild the fighter from the character, so any new Unit field (Momentum, Pressure, held Watches, a chain flag) must be in `SB_KEEP` or it resets on a Proving Ground tool use. A weapon swap replaces only the `GEAR_FRESH` fields.
3. **Area-map units are rebuilt every action** (G:2068), and foes too (G:2072). Only what `magicOut` (G:1978) or `g.story.ps`/`heat` carries survives; Pressure on a token would vanish.
4. **"Drill = the kill's XP" has no source number** (section 8). It needs a per-tier table, new and provisional.
5. **`unitToCharacter(…, afterFight=false)`** is what the sandbox and mid-fight swaps use (G:1504, G:2714), so anything written only after a fight is skipped there. `sandbox/end` restores the saved characters (G:2998), so Proving Ground drill is discarded. Fights marked `noXp` must not credit.
6. **Dry runs:** `worldAct` runs a spell on a JSON copy marked `dry` (G:2246). Character writes must check it, or credit lands twice.
7. **Determinism:** state must survive `JSON.parse(JSON.stringify())` (G:425): no `undefined`-meaningful fields, Maps or Sets. Dice come only from `g.rng`, and ids from `id(g, p)` (G:387). Module-level mutable state exists (`PRACTICE_HELD`, `worldStrikeReq`) and must be reset in `finally`.
8. **Save compatibility:** every new field must be optional with a derived default, because old saves and saved character files load unmigrated until their first action. A sheet is capped at 30,000 characters (`SHEET_MAX`, G:403). `rerollFrom` (G:2513) rewinds whole characters, drill included.
9. **`fail` is private to G.** Other modules return strings; importing game.ts from combat code makes a cycle (see `_world`, G:3582, and `bindFaith`, G:394).
10. **`COMPANION_ACTS`** and `allowedActions` name action types as strings (G:1322, G:1449). New technique actions are refused for companions and puppets unless added.
11. **`weaponKills` is still read** by One Blade and the sheet screen; removing it breaks perks-c.test.ts:437.


---

## Part: Enemy AI and enemy units

`E/` = `/home/user/Project-Heaven-Cry/packages/engine/src/`, `D/` = `/home/user/Project-Heaven-Cry/data/`. Read from source on `claude/charming-gauss-hbq4n0`; nothing was run.

### 1. Where the AI is
- **`E/tactics.ts` is not the AI.** It holds shared subsystems: reactions (:49-76), Hidden and spotting (:83-129), surrender (:133-155), throw and blast (:182-227), companions (:289-315), `applyFoeTraits` (:331-337).
- The planner is `enemyTurn` (`E/combat.ts:1669-1701`), called from `runEnemies` (`E/game.ts:1548-1567`), plus `E/ai-sigil.ts` and `E/ai-soul.ts`.

### 2. The turn
- `runEnemies` loops while the active unit is a foe. It stops for a player's fighter on the foe side (`game.ts:1556`) and a Puppeted enemy (:1557). It runs after every combat action (:1418) and every fight start (:1302, :2352, :2857, :3527).
- `enemyTurn` takes up to 6 steps while AP > 0 (`combat.ts:1672`); the first rule that fits acts, then `continue`:
  1. hook `enemy_action_start`, which may skip the step or open a window (:1675-1677);
  2. self-care: Burning, grapple, weapon recovery, stand up, clear jam (:1678-1682);
  3. scuff a glyph underfoot (:1683);
  4. `aiSigilStep` (:1687), then `aiSoulStep` (:1689), both skipped under a Commanded order;
  5. reload, 2 AP (:1691);
  6. attack `targets[0]` through `resolveAttack(cb, rng, u, t, mode, null)` (:1694);
  7. `aiClearBlock` (:1695);
  8. move to `enemyCloseTile`; a refusal ends the turn (:1696-1699).
- **Actions today: move, plain shot, plain melee, reload, recovery, casting.** `enemyMode` returns only `'melee' | 'shot'` (:1704). Enemies never use aimed, burst, auto, Overwatch, Brace, Hide, throw, shove, sprint or a weapon skill: those are called only from the player reducer (`game.ts:1342-1368`). Only Soul casters hold a watch (`ai-soul.ts:198-205`).
- Target order (`enemyTargets`, :1706-1713): its Taunter, standing before Downed, lowest HP, best hit chance.
- Move score (`enemyCloseTile`, :1717-1736): `(a PC in sight and range ? 0 : 100) + distance to nearest PC + 0.1 × tiles + aiRouteRisk + the ai_move_risk hook` (:1729-1730). It keeps 2 AP back when it has more than 2 (:1725).
- **There is no cover-seeking**: cover never enters the score.
- Hazard avoidance covers Sigil fields and spotted Sigil traps only (`ai-sigil.ts:60-74`). Known trap objects are solid to pathing (`combat.ts:527`). Rules-1.7 hazards are routed around for PCs only (:584).
- `enemyIntent` and `intentInner` (:1741-1773) repeat the same chain without acting (the Trickster's Read).

### 3. Stat blocks into Units
- `D/enemies.json` `items` holds four tiers only (:6-61): hp, defense, attack_bonus, armour, movement, ap, endurance, spare_mags (`EnemyTier`, `E/data.ts:26`).
- **There are no per-enemy stat blocks.** An enemy is a tier, a weapon id and a name, plus optional `caster`, kind, tags, hp and drops (`FoeSpec`, `combat.ts:1013-1015`).
- `unitFromEnemy` (:398-408):
  - `attack` is the tier's attack_bonus for every weapon, and `strength` is the same number;
  - init is d20 + attack_bonus, agility 1, vision 12;
  - `mags` is `spare_mags` full magazines, or `[]` plus `loose` rounds for a loose-reload weapon (:406);
  - it sets no `sv`, `dexterity`, `athleticsPts`, `res`/`resMax`, `held` or `charId`.
- Saves fall back to tier (`E/magic.ts:196`, :205).
- Build order in `startCombat` (:1026-1031): `unitFromEnemy`, hp override, `armFoe`, `armHeart`, `applyFoeTraits`, drops. `sandbox/spawn` builds one separately (`game.ts:3123-3124`).

### 4. Caster archetypes (the existing list-per-enemy pattern)
- `casters[]` is `{id, name, tier, weapon, sigils[], spell_bias}` (`enemies.json:118-205`); `soul_casters[]` carries designs, mp and strain (:206-329).
- Loaders: `CASTER` (`ai-sigil.ts:33-35`), `HEART_CASTER` (`ai-soul.ts:42-43`).
- `armFoe` (`ai-sigil.ts:38-43`) sets `u.mg = enemyMagic(u, words)` and the untyped `(u as any).caster` and `mg.aiBias`. `sigils: true` takes the tier default from `sigils.json` `enemy_ai` (:255; `E/sigil.ts:1341-1352`).
- One `caster` string serves both kinds and must match the tier (`E/campaign.ts:144-146`, `game.ts:3106`).
- It is threaded by hand through `Npc.caster` (`game.ts:357`), the Narrator's fight (:1287, :1291), the area map (:1858, :2326) and the sandbox (:2837, :3017, :3115).
- `tools/validate.py:500-520` checks casters.

### 5. Conditions in the AI
- **Suppressed:** −1 AP in `beginTurn` (`combat.ts:1055`) and no reactions at all (`tactics.ts:50`). The AI doesn't respond to it.
- **Pinned:** `moveBlock` (:1153), so it attacks if it can, else the turn ends (:1696); −2 to hit (`magic.ts:218`).
- **Fear:** can't attack the source (`combat.ts:790`), never a tile nearer it (:1726, :1169), −2 against others (`magic.ts:220`).
- Taunt (:1707, :791), Commanded (:1671, :1091-1104), Hidden PCs and False Images (`E/illusion.ts:35-43`) are also honoured.

### 6. Proving Ground
- `sandboxWave(n, party)` (`game.ts:2642-2654`) spends a point budget on tiers and picks weapons from `SANDBOX_TIERS` (:2628-2633) by index, with no rng. `sandboxCasters` (:2659-2673) swaps the first unit of a tier for a caster.
- Units are placed by `sbPlace` (:2829-2838) and fought by `sbBegin` (:2841-2858).
- The AI switch is `sandbox/ai` (:3060), read at :1559; off means enemies pass their turns.

### 7. Determinism and fx
- The rng is mulberry32 with its state in the game state (`E/rng.ts:3-13`). AI choices draw no dice (`ai-sigil.ts:6`); dice roll only inside the real actions.
- Planners mutate and restore (`ai-sigil.ts:165-174`; `combat.ts:1744-1746`).
- The AI emits no fx of its own; events come from the action it calls: `shot`/`melee` (`combat.ts:929`), `reload` (:1453), moves (:1197), `stance` (:1332), `overwatch` (:1273), `volley` (:1288), `turn` (:1063).
- The event catalogue is the comment at :221-255. The list keeps the newest 40 (:257-266) and is filtered per viewer (`game.ts:1746`).

### Where Physical 2.0 plugs in here
1. **Lists per stat block:** copy the casters route. A loader beside `CASTER`, a field on `FoeSpec` (`combat.ts:1013`), and an arm call after `armHeart` at both build sites (`combat.ts:1029`, `game.ts:3124`).
2. **Choosing a technique:** one step function in `enemyTurn` between :1689 and :1691, with the `aiSigilStep` contract (true only when it acted; `checkOver`; `continue`). Mirror it in `intentInner` (:1758-1771).
3. **Weighing against the plain attack:** `previewAttack` (:775) is the shared estimate. `weaponPerAp` (`ai-sigil.ts:322-326`) is the existing damage-per-AP measure, but it is not exported.
4. **Cover and Pressure reactions:** `enemyCloseTile` is the only place movement is scored; `coverTileFor` (:618) and the `ai_move_risk` hook already exist.
5. **Tier caps:** `u.tier` is on every foe (:401); `TIER_NOTICE` (`tactics.ts:79`) is the per-tier table pattern.
6. **Sandbox:** `SANDBOX_TIERS`, `sandboxCasters` and `sandbox/spawn` (:3099-3128).
7. **Leave alone:** `aiSigilCast` and `aiSoulStep` internals, `paths()`, `rng.ts`, the `runEnemies` loop.

### Traps
1. **Three copies of the decision.** `enemyTurn`, `intentInner`, and `foresee` (`E/perks/f.ts:469-482`), which runs `enemyTurn` on a JSON clone and reads log lines starting "fires at", "strikes" or "takes an aimed shot at". New log verbs are invisible to it.
2. **Enemies attack with `who = null`:** damage has no Attribute multiplier (`combat.ts:850`) and Raw Power 0 (:847). `scales_with` has nothing to read on a foe.
3. **Momentum exists only with `resMax.momentum`** (:953); it resets in `closeTurn` (:1115). Foes have none.
4. **Loose-reload enemies never reload** (by reading, not run). `enemyDry` checks `mags` only (:1702) and loose weapons get `mags: []` (:406), so they drop to fists. Drill units carry the lever carbine and the scattergun (`game.ts:2629-2630`). Quiver work lands here.
5. **A dry gun in `'melee'` mode becomes `WEAPON.fists`** (:776). "A dry gun is a club" changes this line.
6. **The Blackpoint .700 can't be fired by an enemy** (`requires_braced_or_prone`, :799), and the LMG and rotary always take −2 (:812), because the AI never braces.
7. **Suppressed is two shared lines** (`combat.ts:1055`, `tactics.ts:50`) that today hit both sides and every reaction. Pressure 3 and the melee Answers both touch them.
8. **Survivors lose `caster`** when a sandbox fight returns them to the map (`game.ts:2883-2884`). A technique list would be lost the same way.
9. **Untyped per-turn AI flags are saved on the Unit** (`aiAvoid`, `aiSigil`, `aiSoul`: `ai-sigil.ts:83`, :367; `ai-soul.ts:168`). New Unit fields must be optional (`combat.ts:98`).
10. **A step that returns true without spending AP** burns one of the 6 steps (:1672).
11. **Merge collisions.** `combat.ts` and `game.ts` keep whole functions on single long lines. The `Unit` interface (:64-156), the fx comment (:221-255), the reducer switch (`game.ts:1342-1368`) and `enemies.json` will conflict if two branches edit them.
12. **Pinned by tests:** `sandboxWave` output (`packages/engine/test/ai-soul.test.ts:126-136`, `sandbox-mp.test.ts:132-146`).
13. **The 40-event cap:** several enemies act in one reducer call, so longer technique sequences push earlier events out (:266).


---

## Part: The combat screen

Paths are under `/home/user/Project-Heaven-Cry/apps/web/`. **C** = `src/screens/combat.js`, **T** = `src/templates/combat.template.html`, **CMD** = `src/game/commands.ts`, **PK** = `src/game/actionPickers.ts`, **RES** = `src/game/resources.ts`, **FX** = `src/game/fx/play.ts`.

### 1. Template source
- The live template is **T**, hand-edited, imported raw at `src/App.tsx:10,47`. `design/canvas-build/combat.template.html` is the paused prototype; `build.py --web` writes only `protodata.json` (`build.py:326`).
- The runtime (`src/dc/runtime.tsx:1`) takes only `{{dotted.holes}}`, `<sc-for>` and `<sc-if>`. Every label, style and boolean is computed in `renderVals()` (C:534–1213).

### 2. Action list and tabs
- One source: `actionGroups()` CMD:132 returns `[title, ActionItem[], ink, tabId][]` (CMD:22); `ActionItem` is `[id, label, costText, text, why?]` (CMD:20).
- Tab order is push order: move CMD:146, attack :150–162, utility :163, perks :186, class :187, sigils :194, outbursts :200, faith :217. Names: `TAB_NAME` CMD:23.
- C:861–867 turns items into rows. Tabs: C:1085–1116. The count leaves out read-only `pki:` rows (:1106); only the first six get a number (:1107; `numKey` C:359–374).
- Tab memory: `tabMem` C:219–225 (localStorage `phc.combatTabs`); new-turn default C:1087–1092; the tab follows `S.action` (C:1094). Only the open tab's rows are in the DOM (C:1117–1122).
- The same list feeds the turn card, mini-bar and Customise (`catalogue` CMD:261). `pickAction` C:331 refuses ids not in `this._ids` (C:1060).

### 3. Row, selected card, Confirm
- Row: T:227–229, a `button[data-act]` in a wrapper div. Footer T:274–304: `sel` text (:276–278), toggle chips :280, picker :281, target card :284–295, Confirm :300–303.
- `sel` is built at C:871–873, then overwritten for magic (C:896), perk and class moves (C:936) and prayers (C:949).
- `tgtUnit` C:566. `previewAttack(cb, cur, tgtUnit, mode)` runs at C:569, only for `ATTACKS` (C:567). "Hit N% · need N" is C:961; the term list is `hitBreakdown` C:97.
- Cost chain C:674–678 drives the AP pips (C:858). `cantConfirm` C:1068; `confirm()` C:1269–1310; `tileClick` C:1215–1242.

### 4. Expandable pads
- A pad renders inside its row's wrapper. C:1122 sets `padW` (row `draw`), `padE` (`evoke`), `padD` (`outburst`); markup T:230–240, :241–255, :256–268. It is open while its action is selected (C:1012, C:1025); `pres()` (C:295, C:1064) keeps it for the close animation.
- State: `S.word`, `S.stroke`, `S.design`, `S.obMode`, `S.aim`; reset each new turn at C:540.
- Glyph keys come from `drawStrip` (`src/game/sigilView.ts:68`); arrow keys: `src/game/glyphKeys.ts:6`. Design cards come from `designCards` (`src/game/heartView.ts:110`); Begin and Snap sit in the footer (T:296–299), outside the scroller.
- `revealAction` C:409–420 scrolls the wrapper (row plus pad) into view inside `.phc-cb-tabpanel`.
- Layout: the column never goes under 410 px (`ASIDE_MIN` C:227). Only the tab panel shrinks (T:212). At 820 px high or less the You card folds to one line (C:154). `e2e/tabs.mjs:62–78` requires the grid and Confirm in view with no page scroll, on every tab with pads open, at 1440×900 and 1280×720.

### 5. Weapon skills and class moves today
- Weapon skill: one `skill` row from `w.grants` (CMD:157). Only `multi_shot` and `sweep` run (CMD:139); the rest are passive or `Narrator`. Confirm sends `combat/skill` (C:1294).
- Only the main hand makes attack rows; the off hand adds `paired` (CMD:158) and `reload2`.
- Class moves and perks: `perkEntries` CMD:47 gives rows `pk:<item>#<action>` (CMD:181–187). Chips: `pickerFor`, `buildArgs`, `gridPick` (PK:299, :321, :391), drawn by `pickerVals` C:242. Verdict: `previewPerkAction` C:672. Confirm sends `combat/perk` (C:1284).
- Item toggles: `togglesFor` C:616–618, sent as `mods` (C:1309).

### 6. Meters under HP
- `resView(resourcesOf(u, c, g))` C:993 fills T:130–138. Rows (`ResRow` RES:18): ammo RES:177, off-hand :200, Heat :205, class resources from `u.resMax` and `u.res` :267–277 (Momentum labelled at RES:84). Pips cap at 12 (RES:332). `screens/main.js` and `game/turnIntro.tsx` use the same rows.

### 7. Grid overlays
- Tile object C:791–832; slots T:42–68. A token carries an HP bar (C:810), a kind badge (C:800), a held-Outburst icon top-right (C:823, T:65) and glyph icons top-left (T:63).
- Conditions have no pip on the grid. They are chips on the You card (`condChips` C:283–287, C:1000) and words in the tile's aria-label (C:774). Marked is only that chip. Witnessed is a gold chip plus a one-shot effect (`src/game/fx/faith.ts:166`). The token popover uses `effectsOf` (`shared.js:149`), which never reads `conds`.
- Walking copies of a token (`setTokenLooks` C:698, `TokenLook` FX:195) carry only the face, kind chip and HP bar.

### 8. Effects and sound
- Engine `emitFx` (`packages/engine/src/combat.ts:260`) → `FxLayer.tsx:23` → `queueFx` FX:1261 → `baseBeat` FX:1140 → handler table `H` FX:471. A family plugs in as `xHandlers(kit)` plus `xBeat(e)` (`fx/classes.ts:57,92`; registered FX:1134, :1145). An unknown kind is skipped without an error (FX:1208).
- Sound: the `Sfx` union (`sfx.ts:6`), `SFX_FILES` (:65), `sfxCredits.ts`.

### 9. e2e
- `e2e/lib.mjs:28` `pickAction(page, name)`: the first button with that name inside `[role=tabpanel]`, flipping tabs until found.
- Names in use: `/^Shot/` (feel.mjs:100), `/^(Melee|Strike)/` (feel.mjs:124), `/^Lunge/` (perks.mjs:144, the Fighter class move), `/^Shove/` (classes-moves.mjs:146). slate.mjs:71–120 reads `button[data-act]`.

### Where Physical 2.0 plugs in here
1. **Rows:** the attack group, CMD:150–162.
2. **Technique pad:** the padW and padD path: a flag at C:1122, a `<sc-if>` block in the row wrapper after T:268, a `pres()` entry at C:1064, state reset at C:540. View model: a new module beside `heartView.ts`.
3. **Selected line and Confirm:** `sel` after C:945, cost C:678, `cantConfirm` C:1068, `confirm()` before C:1309, `tileClick` C:1233–1236, `RED_ACTS` C:702, `atkTag` C:722, `hasTarget` C:1062.
4. **Momentum, rounds, Heat:** `resourcesOf`; the loop at RES:267 already draws anything in `u.resMax`.
5. **Pressure pips:** a new field in C:791–832, a slot in T:42–68, and `TokenLook`.
6. **Effects:** a new handler family file and two lines in FX (:1134, :1145).
7. **Leave alone:** the tabs (C:1085–1116), layout and zoom (C:451–532), the magic pads.

### Traps
1. **`confirm()` falls through** (C:1309): an unknown action id with a target picked sends a plain `combat/attack` in mode `shot` (C:568).
2. **Attack ids are listed by hand in eight places:** C:567, :616, :702, :868, :1062, :1068, :1233, :1236, plus `whyNot` CMD:235.
3. **Three merge hot spots:** `renderVals` is one function (C:534–1213), T has lines over 1,000 characters, CMD:150–162 is one array literal.
4. **Number keys:** 1–6 switch tabs (C:359); proposal section 10.5 wants keys inside the Attack tab.
5. **Name collisions in e2e:** the Fighter already has class moves named Lunge, Riposte and Finisher, and Shove exists twice. `tabs.mjs:67` clicks each tab's first `.phc-cb-act`: a one-click attack button there would fire.
6. **Removing or renaming rows** (`aimed`, `burst`, `auto`, `overwatch`, `skill`) breaks `turnIntro.test.ts:83–128`, `combat-screen.test.ts:43,116,233` and saved picks in `phc.cutinCmds` (CMD:333).
7. **Dry runs:** `dryRun` (C:83–91) deep-copies only `saves`, `conds`, `mg`, `uses`, `ps`, `armed`; `u.res` and any new unit field stay shared with the live fight. Engine calls that read the character need `bindGame(g)` (C:594, :617, :672).
8. **Fog:** enemy conditions show only for an Analyzed unit (C:774, C:972); pips on every token break that rule.
9. **Input lock:** every button must use the wrapped `act` (C:16–21) and sit inside `.phc-cb-dock` (T:191), or it works during enemy turns.
10. **`data-act` is load-bearing:** CSS (C:144), `revealAction` (C:414) and slate.mjs select on it.


---

## Part: The sheet, Kit, Proving Ground tools and data

Root `/home/user/Project-Heaven-Cry`; each file is given in full once, then by name.

### 1. The sheet

- **Tabs.** `apps/web/src/screens/main.js:345-346` lists `skills, status, perks, gear, magic, faith`; state `tab` (:300); values leave at :1285 (`tabMagic`, `mg`, `tabFaith`, `fa`). Template `apps/web/src/templates/main.template.html`: tablist :64-66; GEAR :137, MAGIC :208, FAITH :313.
- **Template language** is `sc-if`, `sc-for`, `{{x}}`: no else, no expressions. Every label, style and negation is precomputed (`noMastery`, :197).
- **MAGIC tab** is `magicVals(self, g, c)`, main.js:126-295:
  - Known words: cards with uses, tier, inflection (:140-148), grouped by `groupedSection` + `sigilWordGroups` (:150; `apps/web/src/game/workshopGroups.tsx:51,69`).
  - Study bar: `sigilGrowthView(c)` (`packages/engine/src/sigilgrowth.ts:134`) becomes `st` (:153-167): thresholds, picks waiting, cap. The chooser is screen state `mgLearn`; a pick sends `sigil/learn` (:158; `packages/engine/src/game.ts:785`).
  - Designs: cards (:172-179), cap `readyDesigns(c)` (:180), builder draft `mgDraft` (:183-218) saved by `magic/design` (game.ts:770), dropped by `magic/forget` (:802).
  - Practice bar and picks: `practiceView` (`apps/web/src/game/feelingsView.ts:102`), `soulPicksLeft` (`packages/engine/src/character.ts:649`), `magic/pick` (:261; game.ts:792).
  - Teachers and plates: `magic/learn` (:220-245; game.ts:748), one a scene. All of it locks in a fight (:161).
- **FAITH tab** is the model for a tab in its own file: `apps/web/src/screens/faithTab.js:16`, computed only while open.
- **GEAR tab.** Rows print `grants` (main.js:404, :436, :457). WEAPON MASTERY rows: main.js:509-516 from `D.wm` and `c.weaponKills`; template :196-204. `gear/ammo` (game.ts:699-709: fills the loaded magazine with one special type, out of combat) has no caller in `apps/web`.

### 2. Creation: Kit step

`apps/web/src/screens/create.js`: steps :89; kit cards from `D.kits` (:350); starting magic :353-407, gated at :163-164, checked by `startingMagicError` (character.ts:252); `sheet()` (:522-530) adds optional `sigils`, `feelings`. Engine: `newCharacter` (character.ts:417-438) reads `KITS` (:504-513), calls `startingMagic` (:275). The cards' text is a second hand-written list, `design/canvas-build/build.py:203-208`.

### 3. Proving Ground tools

`apps/web/src/game/sandbox.tsx`: `Tab` :123; tab list :277; `TabTools` :304-313 mounts one component per tab. A section is `<Section title aria keys>` (:487) or `<Box keys>` (:498); search words are in `FIND` (:471-476); a search renders every tab (:386). Model: `SigilTools` :856-878. Tools send `sandbox/*`: union game.ts:2588-2620, handlers :2996-3310 (`sandbox/learn` :3247, `sandbox/study` :3301).

### 4. Data, validation, Narrator

- **`data/weapons.json`**, 60 items. On all: `id, name, category, damage, damage_type, range_tiles, magazine, heat_limit, modes, ap_cost, ammo, skill, weight_kg, accuracy, price_credits, properties, mastery_family, hands, grants, type`. On most: `text, durability, mod_slots, lore`. On some: `reload, reload_unit, reload_ap, magazine_kg, requires, tags, explosive, provisional`. No `hits_with`, `scales_with` or technique properties. Type: `WeaponDef`, `packages/engine/src/data.ts:20` (no `grants` or `hands`: code casts to `any`).
- **`properties` the code reads:** `area_radius_N`, `silent`, `placed` (`packages/engine/src/tactics.ts:32-36`, :185); `reach_2`, beside a hard-coded `id === 'lance'` (`packages/engine/src/combat.ts:779`; `packages/engine/src/perks/a.ts:31`; `packages/engine/src/classes/i.ts:241`; `apps/web/src/screens/combat.js:710`; main.js:871); `requires_braced_or_prone`, `ignores_half_cover`, `minus2_to_hit_unless_emplaced`, `no_recoil` (combat.ts:799-818); `ignores_armour`, `armor_ignore_5/10` (:867-868); `applies_burning`, `mana_meter_on_hit` (:948-949); `cone_3` (:971); `counts_as_evoker` (`packages/engine/src/magic.ts:504`). Read nowhere: `quiver`, `no_heat`, `polearm`, `throwable_N_tiles`.
- **`grants`** is `{name, text, effect: {op, …}}`; 32 of 59 are `{"op": "narrator"}`. Read at combat.ts:777, :843, :905, :1360-1387 (`multi_shot` and `sweep` run; the rest answer "isn't an action the engine runs yet"), :1825 (the action row), character.ts:575.
- **`data/weapon_mastery.json`**: `rules.levels` (`kills`, `attack_bonus`, `perk_tier`), 11 `families`, 33 perks. **The engine never imports it.** It only adds to `c.weaponKills[family]` (game.ts:1822; `packages/engine/src/perks/c.ts:892`). The to-hit bonus and the perks are sheet text, not rules.
- **`data/effect_ops.json`**: 192 ops, each `{id, tier, summary, count, params, used_by}`; tiers core 50, bespoke 113, weapon 17, item 11, sigil 1. Read only by `tools/validate.py:17`.
- **`tools/validate.py`** loads every `data/*.json` (:21-25) and walks each `items` list (:99-110): an unknown op is a warning (:1011); keys named `skill`, `attr`, `core`, `class`, `perk`, `condition` must hold known ids (:82-92). The duplicate-id check is a fixed list (:60). Weapon checks: :399-414, :533-540.
- **Two routes to the client.** Rules come through `@engine` JSON imports (data.ts:2-13; `packages/engine/src/glossary.ts:7-13`). `build.py --web` (:302-328) writes `apps/web/src/game/protodata.json` (committed; it holds `kits` and `wm`, :169-172), read as `D` (`apps/web/src/screens/shared.js:12`).
- **Narrator.** One wiki entry per weapon with its `grants` text (glossary.ts:30-31); none for mastery. Prompt: weapon ids (`apps/web/src/narrator/context.ts:157`), `characterBrief` (:288-310), `magicBrief` (:282-286), the grant channel `magic[]` (:534; game.ts:1253). Fight report: `combatReport` picks log lines by one regex (game.ts:1608-1610).

### Where Physical 2.0 plugs in here

1. **Data:** add `data/techniques.json` in the shape of `data/CONVENTIONS.md:5-14`; import and type it in data.ts beside `SIGILS` (:82-83); add it to validate.py:60 and give it its own block, as mastery has (:377).
2. **Weapons:** extend `WeaponDef` (data.ts:20). Keep the existing `properties` strings: code matches them by name.
3. **Sheet:** follow FAITH: a new file returning one values object, one entry at main.js:345-346, one flag at :1285, one `sc-if` block. Reuse `groupedSection`. Model drill bars on `st`, pick flows on `mgLearn` + `sigil/learn`, ready lists on the design cards + `readyDesigns`. Leave `magicVals` alone.
4. **Quiver menu:** the nearest base is `gear/ammo` and the `loadedType` / `magTypes` fields (character.ts:102, :140). A quiver is 20 in the data and 12 in `docs/rules/PHC-Core-Rules-v1.0.md:3553`.
5. **Kit:** follow starting magic end to end (create.js state, `sheet()`, `Sheet`, `startingMagic`).
6. **Proving Ground:** a `Section` in a tab component, a `FIND` entry, new `sandbox/*` actions.
7. **Narrator:** an `add('technique:…')` loop in glossary.ts, a line in `characterBrief`, new words in the `combatReport` regex, a grant field beside `magic[]`.

### Traps

1. **`isMelee` is a category regex** (combat.ts:747): the four `mana`-category melee arms (Evoker blade, Emanator gauntlet, banner, grand staff) are ranged to the engine.
2. **Melee AP ignores the data:** `attackApCost` (combat.ts:750) charges 3 for `heavy*` categories, else 2, so the `unarmed` servo-fist pays 2.
3. **Damage formulas aren't parsed:** only `recurve_bow`, by id (combat.ts:748-749). The longbow deals 20.
4. **Drill has no source yet.** Combat XP is per fight (combat.ts:1778). `u.kills` is one counter per unit, credited at the fight's end to whatever is in the main hand (game.ts:1822).
5. **Validator key names.** A technique field named `class` or `condition` is checked against class and condition ids (sigils are exempted by file name, :89). `hits_with` and `scales_with` are unchecked.
6. **Removing weapon_mastery.json** skips the weapon `handling` checks (nested under :379) and breaks build.py:169 and main.js:509.
7. **`tools/fix_pack.py`** rewrites every data file and regenerates effect_ops.json with core and bespoke tiers only (:96-99, :156-165). Add ops by hand.
8. **Id collisions** with the proposals' names: mastery perks `feint, sunder, cleave, pin_down, suppress`; perk `charge`; condition `overwatch`; class moves `lunge, riposte, shove, brace, bind`.
9. **Merge collisions.** protodata.json is one line: two regenerations always conflict. main.js, main.template.html, sandbox.tsx, game.ts (the `Action` union and the reducer), weapons.json and validate.py are shared by every lane. `build.py` without `--web` rebuilds the paused canvas.
10. **Saves and determinism.** Every action deep-copies the state, runs the `migrateCharacter*` chain, then reduces in one synchronous step (game.ts:425-435). New `Character` fields must be optional with a derived default, as magic's are (character.ts:66-78). `weaponKills` is saved, and asserted in `packages/engine/test/perks-c.test.ts:437`. Screen state (`mgLearn`, folds) never enters the game.
