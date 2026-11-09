# The perk, trait and class runtime: hooks, data deltas, open work

Engine notes for later agents (not rules: the rules are in the spec, "Perks, traits and class moves in play" and section 14 items 101–371). Merged from the lanes' notes of the rules 1.3 build (7 Nov 2026). Lane tags (A4, E-H5, K12) in the tables point to the lane appendices below; ruling tags (C2, K1) are section 14 items.

## Hooks-gap pass


The lanes' notes (lane-a.md to lane-k.md) listed missing hooks, data changes and unfinished items. This pass added the
core hooks, switched the lanes' workarounds to them, and applied the data deltas that were decided. Coverage: 0 gaps
(the ratchet baseline in `test/coverage.test.ts` is now 0). Lane Z merges the spec text and §14 numbers.

### New and changed hooks (core engine)

| Hook / field | Where | Used by | Lane note |
| --- | --- | --- | --- |
| `damage_out` for spells (`ctx.spell`, `mode: 'spell'`), before armour | magic.ts `harm()` | Pain Eater, Brightest Light, Judgement Day, True Name, Case Closed, Humanity First, Moon Hunter | A4, F3 |
| SHOCK/SPARK `dmgType: lightning`, FIRE `fire`, FREEZE `frost`, ACID `acid` | sigil.ts `DMG_TYPE` (was magic.ts `subjectEffect`) | Slicer's Jacked In | C10 |
| `blessing_in` `ctx.power` read back; Blessing heals carry `kind: 'blessing'` | tactics.ts `blessing()` | Factory Made, The Old Blood | A5, F5 |
| `fail` on `glyph_cost`, `evoke_cost`, `outburst_cost` (refusal with a reason) | magic.ts | Sigil Savant Rigid, Heart Overload, Grand Sigilist staff, Stroke Gambler half-Sigil, Vessel, Field Medic | D2, D5, K5, E-H5 |
| `glyph_cost` carries `tile` | magic.ts | (Foundation can use it) | K3 |
| `evoked` {u, pattern, targets, impact, stay, zone} after a real Evoke | magic.ts | (Parallel Thought, Clean Draw can move to it) | D3 |
| `release_cost` {u, design, ap, range, fail} | magic.ts `releaseOutburst` | (Verse of War's held release can move to it) | D4 |
| `outburst_hold` {u, strain} | magic.ts `magicTurnStart` | (The Twin Pays can move to it) | D7 |
| **Rules 1.5 (Outburst 2.0)** `outburst_cost` {u, design, mp, ap, range, strain, hp, release, preview, fail}: `ap` is now the **Begin's** (2, Swift 1); a snap cast adds the Release's 1 after the hook | magic.ts `previewOutburst` | every Soul perk and class that prices a cast | 1.5 |
| `outburst_begin` {u, design, hold, cost, hp, stage: 0} | magic.ts `beginOutburst` | as before; the held one starts at stage 0 | 1.5 |
| `outburst_pump` {u, design, stage, ap, free, fail, preview} (mutable `ap`, `free`, `fail`; a second emit with `preview: false` after the Pump, `stage` the new one) | magic.ts `previewPump` / `pumpOutburst` | (new: Empathy-like perks, Heartfed gauges) | 1.5 |
| `outburst_release` {u, design, stage, aim, wild, mult, form, tone, reaction} (`mult` multiplies the stage multiplier + Resonance) | magic.ts `releaseAt` | as before; `form`, `tone`, `reaction` (Heart Overwatch) new | 1.5 |
| `outburst_after` {u, design, held, stage, aim, mult, riderStage, form, tone, area, targets, hits, wild, reaction} after a release has landed (the primary school, the second school, the tone's riders and chains); `hits` are those the primary landed on | magic.ts `releaseAtInner` | Storm Front's arcs, Twin Souls' third school | 1.5 |
| `strain_change` {u, from, to, why, limit} after every Strain change (`why`: begin, holding, class cast, short, turn, still, fight, tend, letgo, steady) | magic.ts `addStrain` / `easeStrain` | (new: Heart's Own, Strain-reading perks, the resources panel) | 1.5 |
| `held_turn_start` {u, held, cb, rng} after the swell and the aura at a holder's turn start | magic.ts `heartTurnStart` | (new: Vessel-like held effects, Twinbound) | 1.5 |
| `reaction_window` kind `heart_overwatch` before a Heart Overwatch release (cancel stops it) | magic.ts `heartOverwatch` | (as the other reactions) | 1.5 |
| `outburst_hold` {u, strain} now fires only on a turn the held Outburst swells (not after Steady the heart) | magic.ts `heartTurnStart` | The Twin Pays | 1.5 |
| Exports (1.5): `pumpOutburst`, `previewPump`, `letGo`, `steadyHeart`, `feedOutburst`, `setHeartWatch`, `heartOverwatch`, `magicTurnEnd`, `calmFight`, `calmTend`, `applyToneRiders`, `toneRiders`, `riderStage`, `outburstArea`, `outburstDamage`, `previewOutburstPlan`, `resonanceFor`, `formOf`, `toneOf`, `toneElement`, `heartReach`, `migrateHeld`, `STAGE_MULT`, `SOUL_AP`; character.ts `freePumps`, `migrateDesign`, `migrateCharacterSoul` | magic.ts, character.ts | the UI, the classes and perks lanes | 1.5 |
| `strain` {u, n, why, limit} in `addStrain` and in i.ts/k.ts copies | magic.ts, classes | Heart's Own, The Twin Pays | K6, I8 |
| Exports: `flux`, `addStrain`, `manaShort`, `wildRelease`, `magicShove` (`subjectEffect` removed in 1.4) | magic.ts | k.ts `fluxUp` now calls `flux` | I8, J4, K1 |
| Magic push/pull: knockback immunity + `forced_move` (how `magic`) | magic.ts `magicShove` | Siege Engine | A3 |
| Control push/pull save through `cond_apply` (id `shoved`, fam body) | magic.ts `releaseAt` | Litany, Squad Anchor | D10 |
| Crystallise priced with `actionAp(…, 'crystallise', 3)` | magic.ts | Rite in the Field | D8 |
| Volleys: burst/auto spend `pv.ap`; skill/paired price through `attack_preview` (`volleyAp`) | combat.ts | Southern Fist, Fire Discipline | A6, I2 |
| `ctx.volley` ('burst' / 'auto' / 'skill' / 'paired' / 'cone') and `vi` on attack hooks; `volley_end` | combat.ts | Fire Discipline (Spray and Pray, Dance of Iron can move to it) | C3 |
| `attack_target` carries `orig` | combat.ts | (Rabbit's Foot) | F7 |
| `attack_preview` `noRecoil` (settable) | combat.ts | Emplace | J10 |
| stat `heat_limit` in the jam check (`heatLimit`) | combat.ts | Belt Discipline | J1 |
| `injury` {t, d, loc, side, cancel, noDaze, noHalve} in `rollInjury` | combat.ts | Walking Wounded | A9, I3 |
| `death_save` {u, add, die}: every unit's items | combat.ts `beginTurn` | Squad Anchor | A2 |
| Breaking cover priced with `actionAp(…, 'break')`, at least 1 | combat.ts `shootCover` | Siege Engine | A1 |
| `PathOpts.noStop` honoured by `paths()` | combat.ts | Wall Run | B2 |
| `lightOf` reads `disabled` | objects.ts | Dead Signal | B13 |
| `throw` `cancel` + `caughtBy` (no blast, no fire) | tactics.ts `throwItem` | Catch | C1 |
| `fireAuto` keeps ammo changes made during the volley | combat.ts | Ammo Hog | C4 |
| stat `hide_weapon_skill` hides a gun's own skill | combat.ts `weaponActions` | Old School (drifter revolver's Fan the Hammer) | C6 |
| Combat `over: 'extracted'` ("Extracted from…", EXTRACTED on the combat screen) | combat.ts, game.ts, web | RTC Extraction | J6 |
| `action_done` {u, a} after every combat action | game.ts | On My Mark (debt settles at once) | E-H2 |
| `unit_built` {u, c, world} for area-map units | game.ts `storyCb` | Scribe's inscribed armour, Trickster's BIND | I11 |
| Story conditions (scene/session/arc) carried into fights; a longer Shaken isn't cut to the scene after | game.ts `magicIn`/`magicOut` | all (Lane F did it for its own holders) | F1 |
| A Shaken NPC: +2 on everyone's social checks against them | game.ts `storyCondMods` | Bone Talk (its own handler removed) | F2 |
| `check_post` `noFumble` | game.ts `rollCheck` | War Footing | B11 |
| `stay_hidden` `auto`; `stay_hidden_result` {ok, die, auto, labels}; `notice` `ignore` | game.ts | Every Lie Is a Door, Just the Repairman (d100 only on a failed roll), Heavyworlder, Upper-Touched | B5, B6, G2 |
| Rulings settled before `scene_change` (rulings opened there survive); `ruling_answered` {r, accepted, c} | game.ts `narratorTurn` | (Established Fact, Cover Story can move to it) | G3, G4 |
| `perkLines` for an item the character doesn't hold are dropped | game.ts `storyFields` | all | G5 |
| `TAG_VOCAB` + `hinted`, `culture`, `ancient_script`, `lie` | effects/core.ts | lane G | G8 |
| `rest` `ctx.mult[charId] = {hp, mp}` (a fraction of the recovery) | game.ts `applyRest` | Insomniac (no longer rests its holder itself) | H1 |
| Story prayer: `songMod` + `skillRollMod(faith, roll: 'prayer')` | game.ts `story/pray` | True Believer's rites, music traits | D11 |
| `session_start` for a character locked in mid-session (`late: true`) | game.ts `char/add` | Old Timer's Echo | A14 |
| `world_round_start` {n}; `round_ap` {c, ap, lines} per character, clamped 2-9 | game.ts `newRound` | Southern Fist (+1 on the area map) | A7, B7, F8, F9 |
| Area-map move priced by `moveUnit` (no full-price pre-check) | game.ts `worldAct` | Charge!, Into the Dark, Shadow Step | B9 |
| `g.story.quiet` skips the notice check after a silent act | game.ts `worldAct` | Dead Signal | B12 |
| Medic stim at 1 AP also for an advanced class with a Medic parent | game.ts | Banner Dancer, RTC Contractor, Heartbinder | I14 |

Bug fixed: `overworldAttack`'s dangling `else` (lane B bug 1). The attacker now sits out round 1 only when not hidden,
and the line is logged once.

### Data deltas applied (validator: 0 errors)

- `provisional: true` on every item the lanes listed (perks, traits) and on 99 class moves recorded in lanes I, J
  and K as provisional rulings.
- perks.json: Overhaul `action_cost set 1`; Siege Engine `cost_mod` → `action_cost`; Breaching Strike drops
  `ignore_cover`; True Name damage target `self_and_allies`; War Footing `adjudication: hybrid`; Lay Down Arms
  `condition: commanded, arg: hold`; Many Hands `hand_off_ap_max: 3`; The Voice and Supreme Command `ap_cost 0`.
- traits.json: Right of Way, Heavyworlder, Old Timer move −0.5 (text too); Old Timer "1 extra Echo (2)"; Glass Runner's
  first move `action_cost value −1` (text "costs 1 AP less"); Augmented and Heaven's Faithful `gate_check tn 12`; Company
  Man `buy_pct −40`; Worldline Fracture `narrator_hook`; Heretic `faction_start Lumeri Church, standing −40`; True
  Believer `daily_upkeep state_key rites_missed, cap −3`; Field Medic Thrown Stim `ap: null`.
- classes.json: One Shot ×3 (`vs_boss` 2); Case File `set 1`; Called Shot and Ricochet Glyph `tn_mod` → `attack_mod`;
  The Draw `per_combat`; Overcharge loses the standing `max_sigil_words +1`, `per_combat`; Barrage words + `stone` (the
  handler's own STONE discount removed); Belt Discipline per turn −4; Charged by Death `max 3`; Sword Form `set 0`;
  Extraction `adjudication: hybrid`.
- items.json: `mod_red_dot` `tags: ["electronic"]`.

Applied later as provisional (completeness batch 5, spec items 368-369): Daggerfall Flashback TN 13 → 12 in the
data; Gun Nut's two extra guns (`min_carry.start_fill`, since removed: see Leon's answers below). Not applied (decisions for Leon, or bigger than a data edit): new objects
(`portable_barricade`, `rally_banner`, `supply_crate`), `mason_chisel`, `grand_staff`, `tracker`; structured Grand
data; patron Blessing polarity; the remaining lane-I class data rewrites (bespoke ops for Special Ammo, Lunge, Reactive
Plate, Payload, Raise Cover, Seal, Stored Spell cap, Heart Surge, Puppet's save) — the handlers already run the
corrected numbers; the Emplaced condition's +2.

### Leon's answers (7 Nov 2026; spec section 14 items 368–371 and 404, settled)

1. **Item 368, Daggerfall Veteran's Flashback:** TN 12. The trait text says "target 12"; the `gate_check` lost its
   provisional flag (the trait keeps its own flag for the lane-F rulings, items 221 and 399).
2. **Item 369, Gun Nut's Collector:** no guns at creation ("the 3 first gun you look/buy/get"). `min_carry` lost
   `start_fill` and its provisional flag; `grantStartItems` no longer fills guns; the session-start "wants at least 3"
   note is gone. `Character.collection` (weapon ids, at most the trait's count, 3) is the first guns gained:
   `startCollection` at `newCharacter` (the kit's gun) and at the Proving Ground's trait gain, `collectGuns` in
   `giveLoot` (game.ts) and `sbGive` (sandbox give and give-and-equip). Equip, unequip and swaps only move a gun, so
   they don't touch it. Old saves: `collectionOf` reads the first 3 guns carried (main hand, off hand, pack order) and
   the next `collectGuns` stores that. `partError(c, idx, qty)` refuses taking a collection gun out of the pack unless
   more of that gun are carried than the collection holds; `sandbox/drop` uses it (`gear/give` and `gear/drop` still
   take only plot items). The Dexterity check (TN 12, still provisional) and −50% sale stay the Narrator's: the brief
   names the collection. The sheet's weapon tooltips tag a collection gun. Reading, flagged provisional in the spec:
   parting with a collection gun doesn't open a place for a later one. Tests: completeness-e2.
3. **Item 370, companions:** drone 30 HP, beast 60 HP (enemies.json, the traits' `companion` ops; HP not provisional,
   the rest of the stat blocks still is). The drone keeps its service pistol with only a plain shot and unlimited ammo:
   enemies.json `actions: ["move", "shot"]` and `infinite_ammo: true` → `Unit.allowedActions` and `Unit.infiniteAmmo`
   in `companionUnits`. `combatAction` refuses any other action type or attack mode (end turn and decline always
   allowed); `weaponActions` filters to the list, and the web `actionGroups` and `smartCommands` show only those.
   `infiniteAmmo`: no round spent (resolveAttack, full auto, multi-shot, shootCover, the area-map object shot), no Heat,
   no jam (a natural 1 costs 1 AP next turn instead). Tests: subsystems (drone 25 shots, beast 60), completeness-d2,
   web turnIntro.
4. **Item 371, Heart Overload without an Emanator:** does nothing. The toggle's `available` returns false (not a
   greyed reason), so `togglesFor` and the combat screen don't offer it; `outburst_cost` already ignored `pay_hp`
   without an Emanator. Test: perks-d.
5. **Item 404, the twin on the area map:** it stays until "Let the twin go" or a fight starts; it doesn't leave on a
   scene or zone change (after travel `positionsOf` puts it beside its owner). No code change; test: completeness-f.

### Still open (core changes not made in this pass)

1. Actions granted to other units (Gift, a handed Stored Spell, the supply crate's take): `ItemHandler.grants(h, unit)`
   or object actions. Ally Field Repair for Factory Made is **built** (an ally's `combat/repair` on the machine body).
   (A10, I1, J5)
2. Sight hooks (`sees` in `visibility` / `sideSees`): **built** for Skin Map, Sixth Sense, Upper-Touched (a sensed
   presence through fog), Sworn Sibling and Chain Smoker (+2 tiles of enemy Vision in the fog). Still to wire: Hollow
   Heart's reveal, Mirage walls. (B3, D12, D13, E-H8, F12)
3. Reaction sharing (Many Hands). (E-H1)
4. Area-map NPC movement hooks: **built** (`npc_moved`, `npc_sense`, `round_ap`; Got You in My Sight, Wind on the Skin,
   Skin Map, Sixth Sense). War Footing's aura on the area map is still to wire. (B7, B8)
5. Enemies never throw (Catch), enemy spells and Judgement Day, enemy AI for staffs and the twin. (C2, F4, K12)
6. Equip and mod-slot hooks: **built** (stats `equip_ban` and `one_hand_heavy` in character.ts equip and fit: Old
   School, Heavyworlder; Forlorn Hope at lock-in). (A12, B15, C5)
7. `glyph_pool` stat (Hold the Stroke's `#pool` tag stays). Glyph fade/scuff/evoke-consume: **built** (magic.ts honours
   the glyph's `keystone` flag; Keystone). (D1, K2)
8. Twin Souls' `school3` in the design validator. (D6)
9. A refusal on `shove` / `setOverwatch`: **built** (`action_refuse`; First, Do No Harm). (E-H5)
10. Story damage through the engine: **built** (`storyHarm`, the Narrator's `harm[]`; Soulmate). Rival's Petty gates a
    stim on a Downed rival before anything is spent (fight and area map). (E-H6, H7)
11. Session start's heal: **built** (`session_heal` {mult}: Insomniac's Wired gives back half). (H lane gap 2)
12. Foreseen's real rewind (`story/foresee`), `check/decline`. The Talks Broke Down field is **built** as
    `combat.fromTalk` (boolean) instead of the `after` enum. (G1, G7, E-H3)
13. Base Hand-Off as an item for every Camaraderie 3 character. (E-H4)
14. UI pickers (tiles, choices, NPCs, checks, pack items) for the actions listed in the lanes' UI notes.


### Completeness pass, batch 1 (closed)

Each item below now works in every tier, in a fight and out of one, with a test through the reducer
(`packages/engine/test/completeness-a.test.ts`, `-b`, `-a2`). Spec items 377-387.

- **Breaching Strike:** `ignore_cover` gone from data; area-map strike opens the fight (`strikeFromWorld`); story ruling.
- **Eyes in the Back:** `no_flank` op; the adjacent half cover is the shot's `coverTile` (a miss by its margin hits it,
  B4); a carried shield's −5 from every side (B14).
- **Wind on the Skin, Skin Map, Sixth Sense:** `npc_sense` on arrival, placement, rounds, moves and an area-map fight;
  the `sees` hook in fights (B3).
- **Got You in My Sight:** `npc_moved` and `round_ap` (B7/B8): +2 AP next overworld round; II's `story.lastSeen`.
- **Clean Hands:** `ruling_answered` + `round_ap` (F-8): +2/+3 next overworld round on an accepted claim.
- **Soulmate:** story damage through `storyHarm` (H6).
- **Talks Broke Down:** `combat.fromTalk` (H3).
- **Mirage:** area map 2 AP, engine Analysis rolls per token, ruling.
- **Lab Coat II:** `scene.labImmune` blocks the agent for the scene.
- **Bulwark:** preview multiplier in `damage_out` (preview only); tests for Sigil, Soul, Elemental, blasts, two guards,
  an enemy's shot through `combat/end-turn`.
- **Iron Stomach, Nothing Left to Fear:** tested through the story-to-fight carry and `combat/end-turn`.

### Completeness pass, batch 2 (closed)

Items 14-26 of the gap list, with reducer tests in `packages/engine/test/completeness-b2.test.ts` (plus `-b`, `-c`,
`-a` and `perks-g`). Spec item 388.

- **Earthbreaker, Last Wall:** both carry a brief line (the story smash is a once-a-scene ruling; "you fall" moments read
  right in the fight report). Last Wall tested against two enemies' lethal blows on their turn.
- **Grapple:** the scene hold (`grapple_npc`) naming an NPC token on the area map is the token grab and opens the fight
  (`strikeFromWorld`); in the story panel the ruling says a hostile hold starts the fight. II's redirect tested on an
  enemy's turn.
- **Into the Dark II** on the area map (fear zone: +1 AP once a zone), **Shadow Step** on the area map, **Grim Reaper**
  on an ambush opened from the area map (+2 AP, own turn).
- **Pattern Lock, Outclassed, You Get Used to It, Sweet Talker, Used to the Pain, Scar Tissue, Rally Cry, Walking
  Wounded:** each through the reducer (an enemy's turn after `combat/end-turn`, `combat/attack`, `combat/stim`,
  `combat/perk`).
- **Sixth Sense:** the `sees` hook lets a squadmate target a fogged enemy within 3 tiles of the holder (`combat/attack`).
- **Foreseen:** the room vote and the host's rewind; the use stays spent after it.
- **Many Hands** (a spent ally reacts on the holder's reaction; area-map Hand-Off), **Grenadier's Arm** (objects),
  **Forlorn Hope** (kit armour drops at `char/add`), **Just the Repairman** (area map d100, scene memory).

### Completeness pass, batch 4 (closed)

Items 40-52 of the gap list, with reducer tests in `packages/engine/test/completeness-d2.test.ts` (plus `-c`). Spec
items 396-397.

- **Beast Handler:** the beast is an area-map token like the drone (`COMPANION_ROUND_AP`: drone 3, beast 4; world/act
  move with `unit`; the brief names its tile); it starts a fight where it stood and stays where it ended. The trait's
  `companion` op now carries 60 HP, as the stat block does (item 370, settled by Leon, 7 Nov 2026).
- **Field Medic:** the lock on the area map (`world_round_start`), lifted by a stim; Thrown Stim on the area map.
- **Humanity First:** +15% through `combat/attack`; a Factory Made squadmate's `combat/stim` at half; an area-map
  Hand-Off from a non-human refused.
- **Sworn Sibling, Upper-Touched, Chain Smoker:** through the `sees` hook (squad sight of the sibling, a sensed
  upper-realm presence in fog, an enemy's Vision +2 against the smoker).
- **Factory Made** (ally Field Repair), **Heavyworlder** (shove immunity on a squadmate's `combat/shove`, +2
  Intimidation, −3 Athletics, the lit-tile stay-hidden auto-fail), **Old School** (`gear/equip` refuses an electronic
  or Evoker-linked gun in the story).
- **Insomniac:** Wired at session start (half); Always Up on a hidden enemy's turn after a Narrator rest.
- **Rival:** Petty on an area-map stim on a Downed rival.
- **Rabbit's Foot:** a taunted Ork still attacks the holder on its turn; an Interpose (the Defender's Take the Hit) can't
  take a hunter's or Ork's blow (`prey_lock` stat, read by Interpose).
- **Company Man:** the RTC contract memory thread, seeded once.

Still open from batch 4: Humanity First's +2 Fear save from a non-human is tested only through `applyCond` (no enemy
action inflicts Fear on a PC); Upper-Touched's d6 runs on a prayer's Blessing (`story/pray`) and fight Blessings, not on
a Blessing the Narrator grants some other way (the Narrator turn has no Blessing field); the skills.json `take_the_hit`
grant (Raw Power 3) has no handler of its own, so Rabbit's Foot's prey lock reaches the Defender's Interpose only.
Sworn Sibling's sight adds nothing the shared squad sight doesn't already give (allies are always seen).

Still open from batch 2: Sweet Talker's betrayal sting and You Get Used to It's penalty are tested only through
`applyCond` (no enemy AI action lands a Brain or Heart debuff on a PC yet); the area-map Grim Reaper `u.ap += 2`
branch in an overworld throwaway fight is reachable only if a kill lands there without opening the fight (it doesn't
today: a Shade's silent takedown kills inside the real fight and carries the AP back).

## Sigil rules 1.4 (core engine pass)

The Sigil half of the engine is `packages/engine/src/sigil.ts` (resolver, planner, placed magic, enemy AI) and
`sigilwords.ts` (pure grammar: `compileSpell`, `grammarError`, `startingWordsError`, `migrateWords`). Both are re-exported
from `magic.ts`, so handlers keep importing from `'../magic'`. The planner (`planEvoke` = `previewEvoke`) is pure and is
what the real Evoke runs, so a handler that reads a preview sees exactly what will happen.

Hooks (all through `emit`; mutable fields marked *):

| Hook | Payload | Use |
|---|---|---|
| `glyph_cost` | {u, word, tile, ap*, charge*, flux*, preview, fail*} | unchanged; flux is the word's (TWICE 2) |
| `glyphs_per_tile` | {u, tile, n*} | the two-glyph hook: set n = 2 (a Stack becomes possible) |
| `ground_cap` | {u, n*} | how many of your glyphs stand on the ground before the oldest fades (Max Sigil words; Hold the Stroke adds 1 / 2; item 463) |
| `glyph_drawn` | {u, glyph, cb, rng} | after a glyph is on the ground |
| `evoke_reach` | {u, pattern, reach*} | unchanged: stand that far from a glyph (past 1 needs sight) |
| `evoke_cost` | {u, pattern, ap*, charge*, preview, fail*} | unchanged (emitted by the planner) |
| `spell_shape` | {u, pattern, spell*, cb} | right after the spell is compiled in `planEvoke`; a handler may replace `ctx.spell` (a fresh copy each time; Payload) |
| `evoke_area` | {u, spell, pattern, depth*} | the area's depth (Reach range + bonus, or 1 for Touch) |
| `spell_mult` | {u, t, spell, kind: damage\|heal\|shield, mult*} | a multiplier on a spell's final numbers for one target |
| `spell_roll` | {u, t, die, add*, kind: 'sigil'} | unchanged: the hit roll |
| `evoked` | {u, pattern, spell, plan, targets, impact, fizzle, dealt, stay, zone, charge, ap} | after the real Evoke (the "after_evoke") |
| `spell_fizzle` | {u, pattern, spell} | the spell went off and found nothing |
| `sigil_placed` | {u, zone} | a field, trap or turret was placed |
| `sigil_trap_sprung` | {u: victim, trap, owner} | a WAIT trap went off |
| `turret_shot` | {turret, owner, target} | a WATCH turret fired |
| `cond_apply` id `teleport` | the usual cond_apply fields | STEP's Body save against an enemy |

Old API kept: `findPattern` (Pattern has `shape` 'line' | 'stack', `tiles` in drawing order, `axis`, and the old
`near`/`far`/`dir`), `grammarError(words, maxWords)` and `evokeCharge`. Removed at integration (every lane moved to
`planEvoke` / `castAt` / `spellRange`): `subjectEffect`, `LINE_RANGE` and `PUSH_RANGE`. No test is skipped for 1.4 any
more; the 1.2 class tests are replaced by the `sigil14-*.test.ts` files.

`castAt(cb, rng, u, words, impact, { origin, source, roll, victim, mult, opts, extra })` resolves words as Touch with no
Line and no `evoked` hook (Three-Cut Script, Spell Magazine, the Stitch backlash). `extra` turns on TWICE's missiles past
the first: an array of tiles to aim them at first (Three-Cut passes the other targets it cut), or `true` for the nearest
creature of the right kind within 1 tile of the impact; without it only the first missile flies. The result carries
`plans` (every missile's plan) beside `plan` (the first). Area-map ids for placed magic come from `g.story.glyphSeq`
(monotonic; `magicIn` also counts the live glyphs, zones and RAISE walls), so they never repeat between actions.

## Class Roster Revision 3, phase B (the 20 new moves)

The handlers are in `packages/engine/src/classes/rev3.ts` (wired through `classes/index.ts`; `rev3-pending.ts` is
gone); tests in `test/classes-rev3-moves.test.ts`. Readings: spec section 14 items 559–580. Core changes:

| Hook / field | Where | Used by |
| --- | --- | --- |
| `vent` {u, flux, extra} (extra mutable: more Flux into the air with it) after the Flux is gone | magic.ts `vent` | Bleed the Flux |
| `ventAp(u)` / `coreAp(u)`: Vent and core swap priced through `actionAp` (stats `ap_cost:vent`, `ap_cost:swap_core`); the enemy planners use them too | magic.ts | Bleed the Flux, Core Change (the web's buttons should read these, not `SPELL_AP`) |
| stat `rider_stage` (asked with {cb, release: true}): stages a release's tone riders count above its own; `riderBonus(cb, u, off)` | magic.ts `releaseAtInner`, `planInner` | Eye of the Storm |
| `ai_move_risk` {u, from, to, risk} (risk mutable), per candidate tile of an enemy's walk, only while someone listens | combat.ts `enemyCloseTile` | Anchor (+10 for walking out of its reach) |
| `trap_sprung` carries `rng` | combat.ts `moveUnit` | Sabotage's rig (Pinned save) |
| A trap object with `side` never springs on that side (its walks already avoid it: `trapKnown`) | combat.ts `moveUnit` | Sabotage's rig |
| `o.sabotaged` (a round): the object stops blocking movement until then | objects.ts `blocksMove` | Sabotage (barricades) |
| `opportunityStrike(cb, rng, h, t, from)`: an opportunity attack lands on the tile the mover leaves (the reach check used to run a step late: item 561) | combat.ts | every OA; Anchor's Disengage OA |
| `enemyIntent(cb, u)` → {kind, text, targetId?, to?, image?}: the enemy's next-turn choice, pure (fresh AP, no die); `enemyTurn` shares its pieces (`enemyTargets`, `enemyCloseTile`) | combat.ts | Read (`Unit.readIntent` until its turn ends) |
| `cb.images` (illusion.ts: `Image` {id, owner, pos, side, round, fooled[]}); `perceivedFoes`, `fooledBy`, `strikeImage`, `addImage`, `dropImage`, `imageTurnStart` | illusion.ts, combat.ts `enemyTurn`, ai-sigil.ts `players`, ai-soul.ts `foesOf` | False Image, Sleight |

Action ids (combat/perk `actionId`): Shove `class_shove` (enemy, `choice` push|prone); Unstoppable `unstoppable`; Vanish
`vanish`; Field Fix `field_fix` (ally, `choice` clear_jam|restore_durability|repair_machine); Sabotage `sabotage`
(enemy machine), `sabotage_object` (tile), `rig` (none); False Image `false_image` (tile); Silver Tongue
`silver_tongue` (enemy); Sleight `sleight` (ally) and `sleight_image` (none), one scene use between them; Rally `rally`;
Eye of the Storm `eye_of_the_storm`; Command `command` (ally **and** `tile`: the web needs a tile field for it);
Occult Library `occult_tone` (story, `choice` a tone); policies `shrug_on`/`shrug_off`, `duck_on`/`duck_off`.

FX events the web can draw (besides the existing `shove`, `stance`, `reload`, `clear`, `repair`, `heal`, `core`,
`vent`, `analyze`, `move`, `trap`, `release`, `shot`/`melee`):

- `shrug` {unit, at, cond}: Shrug It Off ended a condition.
- `anchor` {unit, at, what: 'prone'|'shoved'|<forced-move how>|'oa', target?}: Anchor held, or struck a Disengage.
- `unstoppable` {unit, at, ignored[]}.
- `duck` {unit, from, to, by, out, cover}: Duck and Roll's step (the `move` event comes with it).
- `rig` {unit, at, id, only}: a rigged tile (for its side's eyes); it springs as a `trap` event.
- `sabotage` {unit, target?, at, rounds, what: 'machine'|'barricade'|'turret'}; `sabotage_end` {at, what}.
- `vent` {…, bleed: true}: Bleed the Flux's credited point going into the air.
- `intent` {unit, target, at, kind, text, targetUnit?, to?, image?}: what Read showed.
- `image` {id, owner, at, side, fooled[]}; `image_gone` {id, owner, at, why: 'struck'|'faded'|'replaced'|'owner down'};
  an attack on an image is a `shot`/`melee` with `target` = the image id and `image: true`, `hit: false`.
- `silver_tongue` {unit, target, from, to, ok, ap}.
- `swap` {unit, target, from, to, image?}: Sleight.
- `rally` {unit, at, radius, targets[]} (each target also gets a `heal`).
- `eye_storm` {unit, at} when armed; `eye_storm_spent` {unit, at, riderStage} when the Release used it.
- `command_move` {unit, target, from, to} (the walk is the target's `move`).

The web side (apps/web): pickers in `game/actionPickers.ts` (Command's tile, Shove's push or Prone chips, Field Fix's
job, the Occult Library's tone; every other new move is its grid target or a plain button); a chip the engine would
refuse with that choice is greyed with its reason (combat.js previews each one). `game/commands.ts` prices Vent and
Swap core with `ventAp`/`coreAp`, names the policy in force (✓) and Eye of the Storm ARMED. `game/classMarks.ts`
draws what stands on the grid: a False Image as its owner's translucent Sigil-cyan copy (another side's only where
seen), Read's intent (an arrow and word on the enemy, a ring on its target, until its turn ends), the rigged tile (its
own side only; `viewFor` drops another side's) and a sabotaged barricade or turret. `game/fx/classes.ts` plays every
event above (a shot or blow at an image reads DECOY). Tests: `game/classMoves.test.ts`, `e2e/classes-moves.mjs`.

## Appendix: the lanes' notes

Each lane's missing hooks, data deltas and UI notes as written. Most hooks and data deltas were applied in the hooks-gap pass above; what is still open is listed there.

### Lane A: Body, melee and damage taken

#### Data deltas needed (for the data agent; then run `python3 tools/validate.py data`)

- **Provisional flags.** Set `provisional: true` on bulwark, shrug_it_off, used_to_the_pain, scar_tissue,
  iron_stomach, grapple, breaching_strike, siege_engine, pain_eater, factory_made, glass_runner, right_of_way,
  heavyworlder, crawler_blooded, old_timer, the_brightest_light, squad_anchor, augmented, southern_fist and
  raised_by_orks. Earthbreaker, Last Wall, Walking Wounded, Nothing Left to Fear and Bite the Bullet already have it.
- **effect_ops.json `damage_reduction`.** The summary should read "a fraction (0–1) of damage taken; a flat amount
  with type flat".
- **Bulwark.** `context` should become a machine form: `{ "op": "damage_reduction", "type": "ranged", "value": 0.25,
  "target": "ally", "area": "behind_self", "depth": 1 }` (depth 2 at Tier II).
- **Breaching Strike.** Drop `ignore_cover`, or redefine it. *(Applied: dropped from both tiers and the text.)*
- **Siege Engine.** `cost_mod` should become `action_cost` with `value: -1` for shove and break.
- **Movement.** Right of Way, Heavyworlder and Old Timer: `stat_mod move` value −1 becomes −0.5. Also update the
  trait text.
- **Old Timer.** Change the text to "start each session with 1 extra Echo (2)".
- **Glass Runner.** `action_cost move set 0` becomes `{ "op": "action_cost", "action": "move", "value": -1, "context":
  "first_move_each_combat" }`. `broken_leg_move_mult` becomes 0.5 on top of the normal halving (quarter Movement).
- **Grapple.** Optionally fold the Fists weapon skill "Grapple" into the perk's action.
- **Augmented.** Creation needs `Sheet.augment` (arm | eye | legs). The engine reads `c.state.augment` or `c.augment`.
  `gate_check` needs `tn: 12`.

#### Missing hooks and engine changes (for the hooks-gap agent)

1. **`shootCover` and melee strikes on objects** should price their AP with `actionAp({u}, 'break', ap)`, minimum 1.
   Siege Engine already answers `ap_cost:break` with −1.
2. **The death save** in `beginTurn` should ask every unit's items, not only the Downed unit's own `statQuery`. For
   example: emit `death_save {u, add}`. Squad Anchor's "+1 on all saves" then reaches death saves.
3. **Sigil PUSH and PULL** (magic.ts `shove`) and Control-school forced movement should check
   `immune({u}, 'knockback')` and emit `forced_move`. Today Siege Engine can't stop them.
4. **`magic.ts harm()`** emits no `damage_out`. Pain Eater and The Brightest Light multiply spell damage in
   `damage_in`'s reduce phase instead, which is after armour. A `damage_out` from harm (pre-armour) would be exact.
5. **`blessing_in` power.** A handler can't change the power; `ctx.power` isn't read back. Factory Made re-runs the
   Blessing at half power with a re-entry guard. Reading `ctx.power` after the hook would let a plain multiplier
   replace that.
6. **Burst, full auto and paired attacks** spend fixed AP (`u.ap -= 3` and the like), ignoring the
   `attack_preview` AP. Southern Fist's +1 AP doesn't reach them. Shoot-cover and weapon-skill volleys have no AP hook
   either.
7. **Overworld rounds have no AP hook** (like `turn_start_pre`), so Southern Fist's +1 AP doesn't apply on the area
   map.
8. **Overworld units are rebuilt every action**, so per-fight item state isn't meaningful there. Glass Runner, Squad
   Anchor and Scar Tissue are fight-only for now. Brightest Light's doubled wear on area-map attacks is **built**
   (`unit_built` + `action_done`; a strike or shot at an object wears 1 there, spec item 392). The drone is an
   area-map token with its own AP (spec item 393).
9. **`rollInjury`** takes no `cb` and fires no hook. Walking Wounded, Glass Runner and Crawler-Blooded read the attack
   line rollInjury wrote ("INJURY (d6 n): side arm|leg") in `on_hit`.
   - An `injury` hook `{t, loc, side, dazed, halveMove, cancel}` would make them exact.
   - It would also let Walking Wounded tell an injury's Daze from other Dazes without reading text.
10. **Ally Field Repair (Factory Made).** "An ally can Field Repair your HP" needs actions that an item grants to
    other units, for example an `actionsFor(other)` hook. Today only self-repair exists, in combat and in the story.
11. **The story-check UI needs a check picker** for Old Timer's Seen It All (it uses the `checkId` argument), and an
    NPC field for Grapple's story action. Both were left for lane G or Z.
12. **Heavyworlder** counts as one size larger: there's no size system yet (the item answers `stat 'size'` with 1).
    Wielding heavy weapons one-handed needs `equip()` to read the trait. Both are still Narrator ops.
13. **Squad Anchor's aura ring** and **Earthbreaker's 3×3 preview** need UI. The preview already returns `tiles`
    and `targets`.
14. **Old Timer's −10% max HP** is generic, but `char/lock` mid-session sets Echo to 1 without `session_start`, so
    Seen It All's +1 Echo is missed for a character locked in mid-session.


### Lane B: Movement, stealth and vision

#### Missing hooks and data (for the hooks-gap agent)

1. **`move_cost` `fail` field.** Wall Run refuses an illegal run by throwing `RuleError` from inside `move_cost`. That works through `apply()`, but a `fail?: string` field that `moveUnit` returns would be cleaner.
2. **`paths()` should honour `PathOpts.noStop`.** Wall Run sets `o.noStop` to its runnable tiles; deleting `d[k]` for them would stop the UI offering tiles inside a wall as move ends. The validation in `move_cost` refuses such moves already.
3. **A `sees` hook in `unitSees`, `visibility` and `sideSees`.** Skin Map needs it to see and target through smoke and darkness within 6 tiles, for the holder only. Sixth Sense needs it to see through walls within 3 tiles for the squad. Today both only reveal Hidden enemies, so fog-of-war targeting through smoke and walls is not built.
4. **`attack_preview` `coverTile` override.** With it, an Eyes in the Back cover tile also stops a shot that misses by that margin.
5. **`stay_hidden_result` hook (story) after the roll** (`{c, npc, ok}`, `ok` mutable). With it:
   - Just the Repairman rolls its d100 only on a failure. Today the d100 is rolled before the Ingenuity roll and passes it with tn −99; the odds are the same, but a natural 1 still fails.
   - Silent Partner makes the partner lose stealth with the holder.
   - Ghost Soldier's −2 AP on the next overworld round works.
6. **`stay_hidden` `auto` field.** With it, a guard who took the character for staff never rolls again (today tn −99 still fails on a natural 1).
7. **A story-round AP hook** (`round_ap {c, ap}` in `newRound`). Needed by:
   - Into the Dark II on the area map (today the +1 comes on the first move in a fear zone);
   - Got You in My Sight on the area map;
   - Ghost Soldier's broken-stealth −2.
8. **Area-map NPC movement hooks** (NPC tokens moving and leaving sight). Got You in My Sight and War Footing's aura on the area map need them; today they only work in combat.
9. **`worldAct` pre-check.** Today it checks the full price, `apForTiles(tiles,0,mov)+extra > u.ap`, before `move_cost` can discount it. So Charge!, Into the Dark and Shadow Step can't make an otherwise-too-expensive area-map move affordable. It should price through the same `move_cost` (a dry run) or skip the pre-check.
10. **`glyph_cost` `cancel` field.** Drill Echo's Count voids the drawn glyph with a filtering accessor on `cb.glyphs` for the rest of the action. That is correct, but the `draw` fx event and the "draws X" log line still go out. A `cancel` field (AP spent, no glyph, no charge, no Flux, no fx) would be cleaner.
11. **`check_post` `noFumble` field.** War Footing sets `roll.fumble = false` in `check_result`, but the check's head line is already pushed as "CRITICAL FAIL".
12. **Dead Signal's `noticeFor`.** `worldAct` still calls `noticeFor` after the act, so the act isn't fully silent on the area map: it can trigger the once-a-round notice check. A flag that skips it is needed.
13. **`lightOf` should read `o.disabled`.** Dead Signal sets a lamp's hp to 0 meanwhile.
14. **The riot shield's frontal half cover** isn't built, so Eyes in the Back's "a carried shield's cover counts from all directions" has nothing to act on.
15. **Equip and creation refusal for Forlorn Hope.** No armour above Class I: the medic and soldier kits should be refused or dropped to Class I at lock-in, and `equip` / `sandbox/armour` should refuse it. Today the lane caps the unit's armour number instead.
16. **Data changes:**
   - War Footing `adjudication: hybrid`.
   - Eyes in the Back's `immunity: ['flanked']`: 'flanked' isn't a condition. Make it a bespoke op, or list 'flanked' in CONVENTIONS.
   - Make Way: add `reach_reaction` to the immunity list once reach reactions exist.
   - The prosthetic arm's mod slots and Proficiency gate are not designed yet.
   - Just the Repairman's text should name the toolbox item.
17. **No UI for:**
   - Wall Run strike's tile and end-tile pickers;
   - Dead Signal's object picker (it takes a `tile` or a `choice` object id);
   - Retreat's tile picker.
   The engine actions work.


### Lane C: Weapons, ammo, reactions and explosives

#### Data deltas (for the hooks-gap / data agent)

1. `perks.json` Overhaul `effects[0]`: `{op: action_cost, action: field_repair, value: 1}` should be `set: 1`.
   `value` adds 1 AP, so the generic op made Field Repair cost 3 AP. The lane claims the effect and answers
   `ap_cost:field_repair` = −1 in the meantime. If the data is fixed, the lane's claim and stat answer can go.
2. `items.json` `mod_red_dot`: add `tags: ["electronic"]`. Old School currently tests the mod's id.
3. `items.json`: a `tracker` item (a small plot or tool item, a few grams) for Sleight of Hand. Right now any pack item
   with "tracker" in its id or name counts as one.
4. ~~`traits.json` Gun Nut: decide on the 2 extra guns at creation (Collector).~~ Settled (Leon, 7 Nov 2026): no extra
   guns; the collection is the first 3 guns gained (Leon's answers, item 369).
5. `traits.json` Blade Recluse `effects[0]`: `context: named_weapon_family` is already there. Nothing to change.
6. `perks.json` Trick Shot `effects[1]`: `damage_mod` with `basis: half_of_hit` should become a bespoke `ricochet` op.
   The lane claims it, so this is cosmetic.
7. `skills.json`: the Proficiency 3 Field Repair unlock text ("10 HP per point to a machine") contradicts the spec's
   10% + 5%. The spec wins. Jury-Rig II uses the spec formula.
8. Mark `provisional: true` on running_reload, rounding_up, catch, sleight_of_hand, jury_rig, hot_swap, origami_hands,
   holy_ordnance, dance_of_iron, gun_nut, old_school, spray_and_pray, one_shot, grenadiers_arm, demolitionist,
   blade_recluse and slicer. Trick Shot, Overhaul and Nothing Gets Past already have it.

#### Missing hooks and engine changes (for the hooks-gap agent)

1. **`throw` needs `cancel`.** Catch sets `ctx.radius = -1` so nobody is caught in the blast, but the throw still logs
   "throws a … at X · it goes off and finds no one". An incendiary still leaves its fire object on the tile. Add
   `ctx.cancel` (skip the blast and the fire) and `ctx.caughtBy` for the log line.
2. **Enemies never throw.** Catch only works against throws that reach `throwItem` from a foe: tests and future AI.
   Lane 0B lists this as not built.
3. **The volley mode in attack hooks.** `attack_preview`, `attack_roll`, `on_hit` and `on_miss` don't say whether the
   shot is a round of a burst, full auto, a weapon skill or a paired attack. Spray and Pray reads it back from `cb.fx`
   (the shot's `chain` flag and the last `volley` event), and only on the unit's own turn for previews. Add `ctx.volley`
   ('burst' | 'auto' | 'skill' | 'paired' | null) to all four. Also add a `volley_end` hook: Dance of Iron's deferred
   shot and the full-auto suppression of shots that cover stopped could then fire right away.
4. **`fireAuto` overwrites the ammo count** (`u.ammo = startAmmo - 10`). Per-round ammo changes by items made during
   the volley are lost, so Ammo Hog charges its extra 10 afterwards. An `ammo_spend` hook, `{u, n}` with n mutable,
   called once per shot and once per volley, would make this exact.
5. **An equip hook** (`equip_check` {c, item, slot, refuse}) and a **mod hook** (`mod_slots` {c, weapon, slots}) in
   core `equip()` and `fitMod()`. With them, Old School could refuse to equip banned gear instead of refusing to fire,
   and the extra slots could go through the normal Fit mod button instead of the lane's own action.
6. **Weapon skill replacement.** `weaponActions` should hide the drifter revolver's own "Fan the Hammer" when the
   holder has Old School. The trait's version replaces it. A `weapon_actions` hook, `{u, list}` with the list mutable,
   would do it.
7. **Field Repair on drones and robots.** There is no base action for it. Jury-Rig II adds "Patch the drone" at double
   strength. A base drone repair at single strength belongs to the core.
8. **Item skill mods in trap spotting.** `spotTraps` (after a move) reads `u.vigilant` points only, so the
   Vigilant −2 from Ringing Ears (Demolitionist) and the trait skill mods never reach trap spotting. Pass
   `10 + mod + u.sk.vigilant`. Tunnel Vision ends on the move itself, so One Shot needs nothing here.
9. **Rest kind on world AP.** The story has no per-turn AP carry, so Rounding Up II's carry is combat-only.
10. **SHOCK and SPARK damage type.** `magic.ts harm()` passes `dmgType` as 'elemental' or 'sigil' for these words. Slicer
    reads the last `evoke` fx event's words instead. Passing `dmgType: 'lightning'` for shock and spark would let
    `src.dmgType` carry it.
11. **Bot scrambler on a Slicer.** `blast()` stuns only robots and drones by kind. Slicer catches it through the
    `throw` hook, by distance to the tile. A `blast` hook ({by, tile, item, who[]}) would be cleaner.
12. **No sell or drop actions** exist for Gun Nut's Collector gate and sale price. When `gear/sell` and `gear/drop`
    exist, they need a `gear_part` hook ({c, item, refuse, priceMult}), or call `partError` (character.ts) for the
    collection guns, as `sandbox/drop` does.

#### UI notes (lane Z or a UI pass; the engine actions exist)

- Running Reload: the toggles show on the Move action (`togglesFor('combat/move')`). On the area map, "Move and reload"
  needs a tile pick.
- Catch "Throw it back", Origami Hands (trap, sling or tool), Demolitionist "Set explosive" (shape: circle, line or
  cone, and `remote` for a trigger), Grenadier's Arm "Throw someone" (a target, then a tile) and Slicer "Backdoor" (a
  device tile; for doors the choice is open, close or lock) need a tile picker and a choice picker on the Perks card.
- Sleight of Hand needs an item picker: thrown items, then pack items.
- Gun Nut, Blade Recluse and Overhaul "Fit a second mod" need a pack-mod picker on the sheet. These actions are story
  and area-map only.
- Holy Ordnance needs a "blessed" badge on the ammo readout (`u.ps['holy:bless']`).
- One Shot needs a Tunnel Vision badge (`c.state.tunnel`).


### Lane D: Sigil, Soul, prayer and music

#### Data deltas needed (for a data agent)

- Add `provisional: true` to: parallel_thought, heart_overload, rite_in_the_field, twin_souls, twin_discipline,
  fire_sermon, upper_touched, sigil_savant, hollow_heart, heretic, true_believer, heavens_faithful, shared_breath and
  mirage. clean_draw, the_twin_pays and solid_image already have it.
- hold_the_stroke: the stat `sigil_strokes_max` should be named `sigil_stroke_pool` in effect_ops.json (or documented).
- heart_overload: data says `alt_cost`. The engine runs it as a toggle, so the text should add "can't heal, shield or be
  held (provisional)".
- upper_touched: put the d6 Blessing table in the trait's `notes`, or in a data table.
- heretic: `faction_start` should list `Lumeri Church` explicitly, with `standing: -40`.
- true_believer: `daily_upkeep` should name the traitState key `rites_missed` and the cap of −3.
- heavens_faithful: `gate_check` should get `tn: 12`.
- twin_souls: drop "mid-level" from the context. The outburst design schema needs `school3` / `option3` (validator).
- mirage: put `range: "6+mod(visualization)"` and `tn: "12+mod(visualization)"` on `spawn_illusion`.

#### Missing hooks and engine changes (for the hooks-gap agent)

1. **drawGlyph fade cap.** Hold the Stroke tags pooled glyphs `by: "<id>#pool"` so magic.ts's `x.by === u.id` fade
   check skips them.
   - Cleaner: a `glyph_pool` stat that drawGlyph reads instead of `m.maxWords`.
   - The tag is harmless today: only that line reads a glyph's `by`. Anything new that reads glyph.by must split on
     `#`.
   - The Sigils tab should show "Glyphs on the ground n / pool" (`strokePool(cb, u)` exported from perks/d.ts).
2. **glyph_cost has no refusal field.** Sigil Savant's Rigid sets `ap = 99`, so the player sees "Needs 99 AP." Add
   `ctx.why` (or `fail`) to glyphCost/drawGlyph and switch Rigid to it.
3. **evoke_cost only ever fires with `preview: true`.** previewEvoke always emits it, and evoke uses the preview's
   numbers. Parallel Thought and Clean Draw detect the real Evoke afterwards: the pattern's glyphs are gone, or a new
   zone of yours appeared. An `evoked` hook after evoke (and a real `preview: false` on the cost) would be cleaner.
4. **releaseOutburst has no cost hook before aimError.** So Verse of War's +1 range on a held release needs the Perks
   action "Release in verse", which bumps `m.soulRange` around releaseOutburst. A `release_cost {range}` emit in
   releaseOutburst would let the "In verse" toggle ride `combat/release` too. *(Done: `release_cost` exists and the
   toggle rides Release; since 9 Nov 2026 "Release in verse" is an area-map action only, so a fight has one button for
   it, the chip, and the Perks tab lists Verse of War to read.)*
5. **Outburst-cost refusals.** previewOutburst can't take a refusal from items, so Heart Overload can't refuse a
   healing design. It neutralises the heal and shield (0) and logs why instead. Add `ctx.fail`.
6. **No hook after the release effects.** Twin Souls' third school runs at `outburst_release`, before the first two
   schools. The real fix is designCost (+20 for school3), releaseAt's `schools` list (school3, with `option3`), and the
   design validator (game.ts) allowing school3 only with twin_souls. Then delete `extraSchool` in d.ts.
7. **A held Outburst's Strain** is added in magicTurnStart with no hook. The Twin Pays takes it off at the previous
   `turn_end`. An `outburst_hold {strain}` emit in magicTurnStart would be exact.
8. **Crystallise has no AP hook.** It uses fixed SPELL_AP. Rite in the Field adds "Crystallise (rite)" in the Perks tab.
   Use `actionAp({u}, 'crystallise', 3)` in magic.ts and the extra action can go.
9. **The Warden's Ward move** must price itself through `actionAp(…, 'ward', 2)`, so Rite in the Field's
   `ap_cost:ward` reaches it (class lane).
10. **Control push/pull saves** (releaseAt) call saveOf directly, without cond_apply, so Litany's `saveAdd` and other
    save mods miss them. Route them through a shared save helper.
11. **Story prayers** (`story/pray`) roll `mod(faith)` without `skillRollMod`, so True Believer's rites penalty and
    music traits don't reach them. There is also no hook, so Upper-Touched's d6 and Heretic's ally-fail don't run on
    story Blessings (they are Narrator-ruled through the brief).
12. **Hidden per side, and fog presence.**
    - Upper-Touched's sense (a presence marker through fog for upper-realm foes within 10) needs `visibility()` to ask
      the items (a `sense` hook). Today it's a log line.
    - Hollow Heart's "seen through fog by enemies within 10 until your next turn" needs a per-unit "revealed to"
      override. Today it reveals you and writes `cb.lastSeen`; the enemy AI doesn't read `lastSeen`.
13. **Mirage needs per-unit sight and move blockers.**
    - Walls use move_step (the believer is put back on its last tile) and attack_preview (a refusal). They don't block
      the believer's line of sight for spotting, or its path planning.
    - Figures aren't units, so the enemy AI never "chooses" one: a believer's attack at the caster's side goes at the
      figure instead, if it can see it.
    - Projections need a UI layer: `u.ps['perk:mirage'].proj [{kind, tile, left, believers}]`.
14. **Mirage and Solid Image UI.** The Perks tab needs a kind picker (wall / figure / sound) and, for Tier II, a second
    tile. Twin Discipline's Fused Evoke needs the pattern tile plus an aim (`choice`). Heretic's Stolen Fire needs a
    patron and Blessing picker (`choice: "patron:blessing"`). Sigil Savant needs a word picker (`choice`) and a
    practised-words picker.
15. **Fire Sermon in the story.** A Blessing landing while preaching could `setStoryCond(shaken)` on hostile NPCs if
    story/pray emitted a hook. Today it's a pending ruling.

#### Not done / left to others

- ~~Heart Overload without an Emanator: Leon's call (D3).~~ Settled (Leon, 7 Nov 2026, item 371): it does nothing; the
  toggle isn't offered.
- Twin Souls' third school can't appear in real play until the validator allows `school3` (missing hook 6). The engine
  side is tested with a hand-made design.
- The Afterimage decoy (Visualization unlock) for Solid Image belongs to the skill-unlock lane.
- Stray file `packages/engine/test/_lane_c_cov.test.ts` belongs to lane C. My own leftover `_lane_d_cov.test.ts`
  (committed in dfb9ad8 by the snapshot) is deleted.


### Lane E: Command, the AP economy, the team and the medic

#### Data deltas (for the data agent)

- Set `provisional: true` on: blueprint, talks_broke_down, rally_cry, soulmate, sweet_talker, many_hands (already),
  on_my_mark (already), supreme_command, the_voice, between_heartbeats, spoon_feed, flat_line, lay_down_arms,
  field_surgeon, angel_of_the_trenches, sworn_sibling, rival (already), born_officer, field_medic.
- `the_voice` and `supreme_command`: `ap_cost: 0` (the action's ap is null in the data).
- `field_medic`: the `thrown_stim` grant_action `ap: 0` → `null` (the engine uses the stabilise cost after Triage).
- `lay_down_arms`: condition `disarmed` → `commanded` with `arg: "hold"`.
- `many_hands`: `hand_off_ap_max` value `"any"` → `3`, with a note on the cap.
- Spec §5 Hand-Off: the base Hand-Off (Camaraderie 3 unlock) needs an item. Today only Many Hands holders get the
  action (see H4).

#### Missing hooks and core changes (for the hooks-gap agent)

- **H1. Reaction sharing (Many Hands).** `canReact` / `useReaction` in tactics.ts are per unit. They need: "if `u` has
  no reaction left, a same-side Many Hands holder who sees `u` and has one left lends theirs (spend the holder's)".
  The `reaction_window` hook only fires for units that can still react, so a lane can't do it.
- **H2. A hook after each reducer action** (`action_done {u, a}`, fired after `windowStep`), so On My Mark can settle
  the ally's AP debt at once. Today it settles lazily at the next `move_cost`, `attack_target`, `reload`, `turn_end`,
  `turn_start_pre`, `round_start`, `enemy_action_start` or `combat_end`. Until then the UI shows the ally's AP as the
  window's leftover.
- **H3. A Narrator combat field** `after: 'talk_won' | 'talk_lost' | null` on `combat`, for Talks Broke Down. The
  engine would validate it against the checks resolved this round or the one before. Today it is inferred.
- **H4. Base Hand-Off.** Skill unlocks (skills.json `unlocks`) aren't items. Camaraderie 3's `grant_action hand_off`
  needs an item key (for example `skill:camaraderie.3`) so every Camaraderie 3 character gets Hand-Off (1 AP,
  adjacent). Many Hands would then only widen it.
  *Partly built (Sigil 1.4, completeness batch 2):* skill unlocks can now be items of kind `skill`, key
  `skill:<skillId>.<points>`. `effects/collect.ts SKILL_ITEMS` lists the ones the runtime runs (today the four Sigil ones:
  `brain_power.3` Overclock, `brain_power.5` Twin Draw, `rumination.5` Proven Formula, `visualization.5` Paint the Field;
  handlers in `perks/skills.ts`). A character holds one once its points reach the level (`Held.skills`, from
  `skillItemsOf(c.skills)`); the unlock's `perk_choice` effect is left out (the perk step is the character's pick). They
  are in the coverage report. To add Hand-Off: put `camaraderie.3` in SKILL_ITEMS and `register({ id:
  'skill:camaraderie.3', kind: 'skill', ... })`.
- **H5. A refusal field on `evoke_cost` and `outburst_cost`, and on `shove` / `setOverwatch`.** Field Medic's First, Do
  No Harm blocks attacks through `attack_preview`. That covers shots, aimed shots, melee, bursts and auto, and
  Overwatch and reaction shots, which go through `resolveAttack`. It can't refuse a damaging Sigil, a damaging
  Outburst, a shove or setting Overwatch. Add `fail` to those hooks (or a `forbids()` lane answer: `forbids()` only
  reads generic `forbid` effects today).
- **H6. Story damage through the engine.** Soulmate's share and Angel only see combat damage. Story HP loss (the
  Narrator's damage) doesn't go through `applyDamage`.
- **H7. A pre-stim hook.** `useStim` on a Downed ally fires `heal_given` only after the revive, so Rival's Petty gate
  can't stop a Downed stim (it does stop a conscious one, through `heal_in`). A `stim_start {u, t, cancel}` hook would
  close this.
- **H8. Sight through walls (Sworn Sibling).** "You always know where they are": the fog of war (`visibility`) should
  show the sibling's tile to the holder. Today only the Narrator brief says it.
- **H9. The Medic class Triage move.** Field Medic answers `ap_cost:triage` and `ap_cost:heal` with −1 (floor 1). The
  class lane must price Triage through `actionAp({u}, 'triage', 2)` for this to apply.
- **H10. Overworld AP for Grim Reaper and Sweet Talker.** On the area map these add to `u.ap`, which `spendAp` writes
  back as negative spending. This works, but a dedicated `refundAp(g, c, n)` would be clearer.
- **H11. UI.** Several actions need inputs the UI doesn't send yet:
  - Lay Down Arms II needs `targetIds` (up to 3).
  - Born Officer's Command needs `choice` (move or attack) plus a tile or an enemy (`targetIds[0]`).
  - Between Heartbeats needs `choice` (shot, move, prone, stim or reload; `move:<tile>`) and a `targetId` for stim.
  - Hand-Off needs `choice` (an amount from 1 to 3).
  - The Bond actions need `choice` (a squadmate's name or id).
  - The Voice needs `choice` (the menu) or `text`.


### Lane F: Status, surrender, judgement, kin and companions

#### Data deltas wanted (not made: lanes don't edit data)

1. `data/traits.json`:
   - ~~`drone_handler` and `beast_handler`: the `companion` effects' hp (30 / 60) disagree with enemies.json companions
     (40 / 50). Pick one.~~ Done: 30 / 60 everywhere (item 370, Leon, 7 Nov 2026).
   - ~~`daggerfall_veteran` `gate_check` tn 13 → 12 if Leon agrees.~~ Done: 12 (item 368, Leon, 7 Nov 2026).
   - `provisional: true` on Daggerfall Veteran, Chain Smoker, Trench Poet, Grudge Bearer, Pacifist, Rabbit's Foot,
     Drone Handler, Beast Handler, Moon Hunter.
2. `data/perks.json`: `provisional: true` on Bone Talk, Clean Hands, Red Line, Lab Coat (the Mastered ones already
   have it).
3. `data/perks.json` `true_name`: the damage_mult target should read `self_and_allies`.
4. Optional: Chain Smoker `start_item: cigarettes`, if Leon wants the pack to be counted.

#### Hooks gap (for the hooks-gap agent)

1. **Persistent story conditions don't reach fights.** `unitFromCharacter` should apply `storyConds(g, c)` (Shaken from
   the session or the arc) to the unit. Lane F does it in `combat_start` for its own holders only (Pacifist, Drone
   Handler, Beast Handler).
2. **NPC conditions in story checks.** `storyCondMods` should add +2 for checks targeting a Shaken NPC (and −2 for a
   Confused NPC's own reads, if wanted), for everyone. Today Bone Talk's handler does it, which needs a holder present.
3. **Spell damage has no `damage_out`.** `magic.ts harm()` (Sigil, Soul, Elemental) never emits `damage_out`, so the
   target bucket (Judgement Day, True Name, Case Closed, Humanity First, Moon Hunter) misses spells. Emit
   `damage_out {att, tgt, src, base, add, mults, vs}` there and apply `stackDamage`.
4. **Enemy spells and Judgement Day.** Enemy Sigils and Outbursts don't go through `attack_roll`, so a judged caster's
   first spell isn't stopped. This only matters if enemies ever cast.
5. **`blessing_in` ignores `ctx.power`.** `tactics.ts blessing()` uses its local `power` after the emit. Read
   `ctx.power` so The Old Blood can halve Blessings from another race. Until then a fight note asks the Narrator.
6. **AP grants carry no source.** `grantPerkAp` / `bankAp` need a `from` unit so Humanity First can refuse AP handed
   over by a non-human squadmate. Narrator-ruled until then.
7. **`attack_target` has no original target.** Rabbit's Foot's "Take the Hit or taunts can't pull hunters' attacks off
   you" needs `ctx.orig` (the target before any redirect). The enemy AI's taunt preference also needs an exemption for
   hunter or Ork attackers targeting a holder. Narrator-ruled until then.
8. **Overworld AP grant.** Clean Hands' story half (+2/+3 overworld AP next round) needs a hook where a round's world
   AP is set. Narrator-ruled until then.
9. **Start of an overworld round.** Daggerfall's story Flashback should cost the *next* round. There's no
   `world_round_start` hook, so it ends the current round instead.
10. **Hazard saves.** Toxic spills have no save, so Lab Coat I has nothing to boost against hazards in a fight.
    Hazards with a Body save tagged `chemical` would fix it.
11. **Sigil rolls and Never Forgive.** The Sigil strike roll has no item hook, so Grudge Bearer's −2 doesn't reach it.
12. **Fog of war against a Chain Smoker.** Enemy vision +2 tiles against the holder needs a hook in `unitSees`. Only the
    spotting roll gets the +2 today.

#### UI gaps (lanes can't touch web files)

1. Companion attacks have no toggle chips: `togglesFor` looks at the companion unit, which holds nothing. The beast's
   Grapple needs a chip on the beast's attack that sends `mods: ['grapple']`.
2. The story Perks strip has no NPC picker. Bone Talk, True Name, Verse and Track read the NPC from `npc` when given,
   else from the typed text.
3. The Open Hand setting (always / ask / never) needs a choice picker. It's an action with `choice`; with no choice it
   cycles.
4. Lab Coat II's agent picker: `choice` (a condition id or `toxic`).


### Lane G: Story perks and dialogue traits

#### Data deltas (for the data agent)

- `provisional: true` on: footnote, double_meaning, crowd_pleaser, detectives_eye, old_tongue, real_power (the
  once-per-organisation rule), gambler, cold_case, holo_drama_addict, born_performer, every_lie_is_a_door,
  cover_story. (established_fact, closing_argument, everyones_friend, their_own_idea, foreseen, what_could_be have it.)
- Optional: `data/effect_ops.json` notes for the tags `hinted`, `culture`, `ancient_script`, `lie`; add them to
  `TAG_VOCAB` in `packages/engine/src/effects/core.ts` so the rules prompt lists them with the others (today only
  `PERK_GUIDANCE` names them).

#### Hooks gaps (for the hooks-gap agent)

1. **Foreseen rewind.** The reroll copies live in the host's client (`rerollFrom(current, before, note)` needs the
   `before` state). Needed: a `story/foresee {charId, entryId}` path (the perk is the consent, no vote) that the host's
   client answers with its copy, work kind `foresee` (the Narrator first writes the would-have-been vision), and a host
   veto. Until then g.ts does the rewind in the fiction.
2. **`stay_hidden` has no auto result**: a natural 1 still fails even under Every Lie Is a Door. Add `auto` to the
   payload (and to `notice`, a way to say "doesn't treat them as an intruder" when adjacent: today `d <= 1` always sees).
3. **perkRulings answers have no hook.** Add a story hook `ruling_answered {r, accepted}` (fired in narratorTurn) so
   an accepted Established Fact can be pinned as canon by the engine and an accepted Cover Story burn counted without
   traitState.
4. **Rulings opened in `scene_change` are wiped** in the same Narrator turn (`g.story.rulings = []` runs after the
   scene change). Detective's Eye uses its brief instead; any lane adding a ruling at scene change hits this. Clear the
   rulings before emitting scene_change, or keep rulings opened during the turn.
5. **perkLines are not checked against held items** (`storyFields` posts any key for any character). Reject a key the
   character doesn't hold.
6. **UI (story Perks strip)**: an NPC picker (story npcs) for Touch, Everyone's Friend, Their Own Idea, Speak the Old
   Tongue; a check picker (pending check id) for Double or Nothing, First lie lands, Closing Argument (today the latest
   pending check that fits is used); a γ-skill picker (`choice`) for Adaptable; a "Double or Nothing" chip on the
   check card. Combat: the Gambler toggle chip rides on combat/attack (already generic).
7. **Leading Role's "refuse"**: there is no action to withdraw a pending check; the player narrates the refusal and
   rolls anyway (or the Narrator drops it). A `check/decline` action would close it.
8. **TAG_VOCAB** (core.ts): add `hinted`, `culture`, `ancient_script`, `lie`.
9. **Glossary markup review** (plan: lane G owns it) is not done: `glossary.ts` is a core file. The wiki should mark
   the engine and Narrator halves from `coverage.ts` (verdictOf).
10. **Web test** `apps/web/src/screens/combat-screen.test.ts` "a perk holder gets a Perks tab…" expects the default
    action's log "uses Shrug It Off"; lane A registered its own Shrug It Off action, whose log line differs. Not lane
    G's; the test or lane A's line needs aligning.


### Lane H: Identity, economy and upkeep traits

#### Data deltas needed (I can't edit data)

1. `provisional: true` on: mind_without_fog, symbol_of_order, rogue_element, machine_faced, bottle_butts_for_eyes,
   oil_in_my_mind, oil_in_my_soul, lunarshine, central_city_kid, insomniac, company_man, ace_pilot, worldline_fracture.
2. **company_man:** `price_mod buy_pct -100` → `-40` (H12).
3. **worldline_fracture:** `narrator_hook` is null. Suggested: "the area whose normal events stopped happening."
4. **lunarshine:** a `capacity: 5` (drinks) on `bottle_of_spirits`, if the bottle size should live in data rather
   than in the lane's constant.
5. The validator could check that `party_all` requirements name the trait itself.

#### Hooks gap (for the hooks agent)

1. **`rest` has one `hpMult` for everyone.** Insomniac takes its holder out of `ctx.chars` and rests them itself,
   repeating applyRest's Heat, Flux, Strain, MP and resource upkeep. Better: per-character `ctx.mult[charId] = {hp,
   mp}` in applyRest, and the lane then only sets the multiplier.
2. **Session start heals fully before `session_start` fires** (game.ts `session/start`), so Wired can't halve it.
   Session start should call applyRest('long'), or pass the previous HP and MP in the hook.
3. **`gear/give` has no hook.** Market Blood's "giving or accepting a gift takes an Analysis check; on a fail you can't"
   needs a `gift` hook {from, to, item, cancel} before the transfer. The engine would roll Analysis (TN 12,
   provisional) and refuse on a fail. Today the Narrator calls the check.
4. **No per-roll toggle on story checks.** Masterpiece's "a roll of their choice" needs a toggle on `check/roll` (mods)
   for a character who doesn't hold the item. Today it auto-applies to the next roll.
5. **Story conditions are set after checks in the same Narrator turn** (storyFields runs after the checks loop). Mind
   Without Fog works around it with a compensating +2. Running storyFields' conditions before checks, or a
   `story_cond_apply` hook with cancel, would be cleaner. It would also let any immunity cancel story conditions.
6. **Memory "met masked".** The Mask's Two Faces would like a person-memory flag for whether the character was masked
   at the meeting. Today the brief says which face they show now.
7. **No vehicle model** (Ace Pilot vehicle_mod, Narrator-only) and **no shops or credits** (Company Man, Market Blood,
   Inner Ring Heir prices and funds, Narrator-only).
8. **`u.ingMod` ignores item skill mods** (pcExtras: `mod(c.skills.ingenuity)`). Spotting adds `u.sk.ingenuity`
   separately, so Bottle Butts works in fights. Any other reader of `ingMod` misses item mods.

#### UI notes (for lane Z)

The story Perks strip needs:
- a name picker (another character) for Masterpiece; today the player types the name in the Say box;
- an item picker for Price it; today the player types the item, or leaves it empty for the whole pack.


### Lane I: The 13 base classes

#### Data deltas (spec first, then data, then the validator)

- `marksman.special_ammo`: replace the `resource` effect with a bespoke `special_ammo_restock {types:[armor_piercing,
  hollow_point, incendiary], count:1, quiver:12}`. Mark it provisional.
- `marksman.killzone`: `tn_mod overwatch_shot` becomes `attack_mod {context:'overwatch_double', value:2}`.
- `fighter.lunge`: `stat_mod move_in_attack` becomes a bespoke `lunge {tiles:2, no_oa:true}`.
- `defender.brace`:
  - put `context: 'braced'` on `stat_mod defense +2`;
  - display name "Hold the Line" (or rename the base weapon Brace "Set");
  - add `guard_min: 1`.
- `defender.draw_fire`: add `save: none`. Change the text of `conditions.json` `taunted` to the move's wording.
- `defender.reactive_plate`:
  - `uses` becomes `on_damage_taken`, not `reaction`;
  - `stat_mod damage_reduction_per_guard` becomes a bespoke `plate_guard {per:10}`.
- `medic.triage`: `limit: {in_combat:'per_target_per_turn', out_of_combat:'per_ally_per_scene'}` (provisional).
- `medic.stim_throw`: add `condition bleeding remove`.
- `medic.field_surgery`: `choose: 1` over the two condition effects.
- `assassin`: `resource` lists Marks only. Declare `toxins {max:'2+floor(ingenuity/3)'}`. `assassin.toxin` spends
  `toxins`, not `toxin`.
- `mage.overcharge`:
  - remove the standing `stat_mod max_sigil_words +1`;
  - `uses: per_combat` (the text), not `per_scene`.
- `mage.barrage`: add `stone` to `words`.
- `mage.payload`: bespoke `payload {table:…, flux:'glyph_count'}`.
- `warden.raise_cover`: `state full_cover` becomes a bespoke `cover_rune {tiles:2, hp:40}`.
- `warden.seal`: a bespoke `seal_zone {sigil_charge_mult:2, soul_mp_mult:2, range:8, flux:2}`.
- `scribe.inscribe_gear`: `choose: 1` between the two effects. Fix the roster wording: "+5 armour value", not "+1
  Armour Class".
- `scribe.stored_spell`: `uses: at_will`, plus `cap: 'max(1, mod(rumination))'`.
- `trickster.bind`: add `{op:'unlock_word', word:'bind'}`. Until then the engine adds BIND to the fighter's words at
  combat start, only in fights.
- `trickster.rewrite`: an `opposites` table in data.
- `channeler.shape`: the effect should "set base cast Strain to 0", not apply −1.
- `channeler.storm_front`: `area_mult` gets `{radius:2, max_extra:2, single_target_only:true}`.
- `channeler.heart_surge`:
  - `damage_mult 1.0` becomes `effect_mult 2`;
  - strain `+base`;
  - `uses: per_turn`.
- `guardian.drink_it_in`: `when: 'enemy_spell_hits_own_shield'`.
- `guardian.sanctuary`: the `damage_mult −0.5` should be `damage_taken_mult 0.5`.
- `bard.inspire`: the state is named "Encouraged". `bard.mend`: `ap_cost: 'soul_cast_ap'`.
- `hexer.dread`: `resource mp +5` becomes `cost_mod −5`.
- `hexer.puppet`: add `save: 'heart'`, `limit: 'one_action'`. Change `conditions.json` `puppeted` to Heart family,
  one action.

#### Missing hooks and engine changes (for the hooks-gap agent)

1. **Actions for another character's unit.** Gift's ally cast and handing a Stored Spell to an ally both need it.
   - The runtime only lists actions from the acting unit's own items.
   - Proposal: an `ItemHandler.grants(h, unit)` that `perkActionsFor` also asks of every other holder in the fight.
   - `castGift(cb, rng, bard, ally, designId, aim)` is exported from `classes/i.ts`, ready to wire. It casts by
     moving the Bard's unit to the ally's tile for the release, which is a stopgap. The real fix is for
     `releaseAt(posUnit, statUnit)` in `magic.ts` to take the caster and the stat source separately.
2. **`fireBurst` takes a flat 3 AP** (`u.ap -= 3`) instead of `pv.ap`. Fire Discipline gives 1 AP back on the first
   round of the burst. It spots that round by the log line "X fires a burst.", which is fragile.
3. ~~Interpose: the critical injury still lands on the ally.~~ **Built:** the `injury` hook (cancel, then the
   Interposer rolls its own); the Defender's and the Adamantile Knight's Interpose both use it (spec 14 item 400).
4. **`cond_apply` doesn't say what caused the condition** (a word, a design, a hit).
   - Bind's +2 also reaches an Outburst's Pinned option.
   - Mind Fog and Heart Surge find their release with a log-length marker (`rel` in `i.ts`).
   - Proposal: `src: {kind:'sigil'|'outburst'|'hit'|…, word?, design?}` on `cond_apply`.
5. **`releaseAt` has no hook to add targets** and no post-release hook.
   - Storm Front rolls its extra targets inside `outburst_release`, so its log line comes before the release line.
   - ~~Heart Surge doesn't double push or pull distances.~~ **Built:** `forced_move` tiles are read back by `magicShove`.
6. **`evoke` has no area or target hook and no post-evoke hook.**
   - Payload is its own action. It calls `evoke()`, then resolves the extra targets with `sigilOn` in `i.ts`, a copy
     of `subjectEffect` that leaves out GALE's shove. Keep the two in sync, or export `subjectEffect`.
7. **`findPattern` refuses a single glyph**, so Raise Cover is its own action rather than an Evoke.
8. **`flux()`, `addStrain()` / `manaShort()` and `wildRelease()` aren't exported.** `i.ts` copies Flux overload and
   the Mana Short (`addFlux`, `strainUp`). One difference: a held Outburst during a class cast's Mana Short bursts into
   the air instead of releasing wild.
9. ~~The damage source has no spell cost or word count.~~ **Built:** `spellMp` / `spellWords` on the damage source
   from `releaseAt` and `evoke`; Drink It In reads them (spec 14 item 402).
10. **Encouraged (Inspire)** reaches Sigil and Soul strike rolls (`spell_roll`, **built**); slip checks, the Mana Short
    and death saves still have no hook.
11. **Overworld units are rebuilt every action, and no hook fires when a unit is built.**
    - The Trickster's BIND and inscribed armour (+5) don't apply on the area map.
    - Proposal: a `unit_built {u, c}` hook in `unitFromCharacter`.
12. **Special ammo stock lives in per-rest use counters**, not in the pack. `reload()` ignores `magTypes`. A shop item
    for spare special magazines would need `reload()` to read the type of the magazine it loads.
13. **Puppet** works through the existing puppeteer path: the player runs the enemy's turn until its first action,
    then the AI takes over. An enemy Hexer puppeting a PC isn't supported.
14. **Medic stim at 1 AP** still checks `c.classId === 'medic'` (`game.ts`). An advanced Medic child doesn't inherit it.
15. **Mind classes without an Evoker, and Soul classes without an Emanator (or designs),** get greyed-out moves. The
    class pick card at level 3 should warn (a UI item).

#### UI notes (lane Z / the UI pass)

- **Payload's aim** for a Stack is `choice` (a tile). The UI doesn't send it, so the engine aims at the nearest enemy
  in reach.
- **Storm Front and Heart Surge** are toggles on `combat/outburst` (`togglesFor(…, 'combat/outburst')`). The Outburst
  panel has to show them.
- **The story Class strip** (Triage, Field Surgery, Inscribe, Store a spell, Gift, Inspire, Rewrite, Puppet,
  Sanctuary) reads the ally's name and the spell words from the Say text.
- **Unrelated:** `apps/web/src/screens/combat-screen.test.ts` "Shrug It Off" fails. It expects the old default log
  text ("uses Shrug It Off"), and lane A's real handler now logs "shrugs off". It is lane A's to fix, not this lane's.


### Lane J: Advanced classes, part 1

#### Data deltas (for the data pass; spec first)

- **classes.json:**
  - Mark every move above flagged PROVISIONAL with `provisional: true`.
  - `one_shot` `damage_mult` → 3.0 (Boss/Celestial 2.0).
  - `case_file` `action_cost` → `set: 1`.
  - `called_shot` and `ricochet_glyph` `tn_mod` → `attack_mod`.
  - `weak_point` `crit_min 18`.
  - `belt_discipline`: `set: -4`.
  - `emplace`: `while: emplaced`.
  - `sword_form`: `set: 0`.
  - `charged_by_death`: `max: 3`.
  - `unbroken`: the trigger op.
  - `extraction`: adjudication `hybrid`.
  - `sweep`: action id `banner_sweep`.
  - `the_draw` and `unbroken` uses: `per_combat`.
  - `bulwark_line`: "until your next turn".
- **conditions.json:** Emplaced: drop or rewrite the +2 (J4).
- **objects.json:** add `portable_barricade` (half, 40 HP, blocks movement), `rally_banner` (20 HP, no cover) and
  `supply_crate` (half, 30 HP).

#### Missing hooks and core changes (for the hooks-gap agent)

1. **A heat-limit stat in `resolveAttack`'s jam check.** Belt Discipline undoes a Heat jam in `on_hit` / `on_miss`, so
   a shot that half cover stops (neither hook fires) still jams.
2. **`damage_out` `ctx.ignoreArmour` (or `ctx.pierce`).** Weak Point zeroes the target's armour from `attack_roll` and
   puts it back at `damage_in`. It works, but the attack preview still shows the armour.
3. **A `glyph_drawn` hook** {u, word, tile}. Deploy Cover's STAY upgrade shows at the next hook (turn end, turn start,
   round, the next attack) rather than the moment the glyph is drawn.
4. **Export `subjectEffect` from magic.ts.** j.ts `castWords` mirrors it for Three-Cut Script and Spell Magazine.
5. **Object-granted actions** (`combat/take {tile}`), so any ally next to a supply crate can take from it.
6. **A Combat `over: 'extracted'` outcome** that `finishCombat` and `combatReport` know: no "Lost", and lifted PCs not
   listed as prisoners. j.ts marks them `surrendered` plus `extracted`.
7. **Zone kinds `suppress` and `strike`** for the UI. The zones live in item state now, so the grid doesn't draw them.
8. **A `brace` hook from the Defender's Brace** (lane I), so Bulwark of Will can fire on it. j.ts listens to
   `cond_landed` 'emplaced' by self when the Knight holds `defender.brace`; that only works if lane I's Brace applies
   Braced.
9. **Defender Reactive Plate → Adamantile Plate.** If the Knight also holds `defender.reactive_plate`, lane I's plate
   runs and Adamantile Plate's shield needs an event from it (e.g. `emit(cb, 'reactive_plate', {u, k})`).
10. **`previewAttack` doesn't pass `noRecoil` to `attack_preview`.** Emplace's "no recoil" term is left off free shots.
11. **Turret bots:** j.ts adds the turret's id to `cb.deadSeen` so its death releases no bots.

#### UI needs (lane Z or a UI pass)

- Six for Six: a multi-target picker for `targetIds`.
- Called Shot: a location choice (head / arm / leg).
- Three-Cut Script and Spell Magazine: a word picker for `choice`.
- Inscribed Rounds: a word plus a count.
- Gauntlet Infusion: an element picker.
- Supply Drop's "Take from the crate": supply or magazine, plus an ally.
- Show the suppression and strike zones and the extraction landing tile on the grid.
- Show credits on the sheet.


### Lane K: Advanced classes, part 2 (the magic advanced classes)

#### Data deltas (for the data pass; spec first)

- classes.json advanced moves: `provisional: true` on every move above; the per-item fixes listed in K6, K9, K13, K16,
  K17, K18, K20, K22, K25, K27, K28, K30, K32. Circuit Mage: add `provisional: true`, `rules: "1.2"`.
- patrons.json: `polarity: harm|help` per Blessing (K4).
- weapons.json / items.json: `mason_chisel` (K16), `grand_staff` (K19).
- sigils.json: structured `grand` entries (K19).
- effect_ops.json: params for `keystone`, `keystone_reach`, `grand_form`, `emotion_gauges`, `emotion_fuel`,
  `heart_link`, `share_damage`, `body_form`, `body_release`, `summon_twin`, `twin_bond`, `manifest_twin`.

#### Missing hooks and engine changes (for the hooks-gap agent)

1. **Exports from magic.ts**: `flux()` and `addStrain()`/`manaShort()` (k.ts keeps local copies: `fluxUp`, `strainUp`;
   replace them with the engine's once exported, so other lanes' Strain hooks see these too).
2. **Glyph lifecycle hooks**: `glyph_fade` (cancel), `scuff` (cancel per glyph), `evoke_consume` (keep a glyph), and
   `zone_create {zone, pattern}` (duration). The Keystone is put back at every turn/round boundary instead, so for the
   rest of the action after a scuff or an Evoke it's missing.
3. **`glyph_cost` needs the tile** (Foundation's 0 AP draws go through their own action for now).
4. **`evoke_touch` / reach in previewEvoke** (Survey for allies; the mason uses its own action).
5. **A refusal field** on `evoke_cost`, `glyph_cost` and `outburst_cost` (`ctx.fail = 'why'`): the staff planted, a
   half-glyph pattern outside Stitch and the Vessel's ban set AP to 99, which reads "Needs 99 AP".
6. **A `strain` hook** {u, n, why, design} with the limit in the payload (Heart's Own raises `m.strainLimit` instead).
7. **Spell area hook** (Grand SPREAD) and a **post-cast hook** (Grand TWICE): Narrator until then.
8. **`magic/design` hook** (Vessel's ban; Beloved slots in the ordinary design screen).
9. **A death-from-death-saves hook** (on_downed with dead, or on_death) for Heartfed's Grief +5.
10. **Shop sale refusal** for self-crystallised cores (`c.state.selfCores`).
11. **Echo rerolls in combat** (Stitch d20).
12. **Enemy AI**: pull out a planted staff; prefer to break Grand forms; target the twin.

#### UI needs (lane Z / a UI pass)

- Class tab: word pickers for Keystone, Enlarge and Foundation's draw (choice = word), a design picker for Fusion,
  Through and the twin's casts (choice = design id), a form picker for Inner Charge, the Share setting.
- The Magic panel: Beloved hearts, Heartfed gauge pips and design keys, held body forms, links (a heart thread), the
  staff and Grand zones (kind `grand`; draw the word), half-glyphs (`half: true`), the Keystone (`keystone: true`).
- Manifest: a twin card with a portrait picker and three design slots.
- The twin's turn: its Class tab shows only "The twin casts" and "Guard".
