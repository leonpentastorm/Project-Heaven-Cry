# Blessing 2.0, implementer 1: engine hand-off

Branch: `feature/blessing-engine` (from `origin/develop`, 8 Nov 2026). **Not merged**: Leon and his Claude do the final
check and the merge. Rules revision 1.6; design `docs/design/blessing-2.0-spec.md`; spec "Patrons and prayer";
decision 102; section 14 items 592–629.

**Status: done.** Every rule in the brief runs in the engine, through the reducer, with tests. One optional part is
deferred: enemies that pray (item 618).

## Test results (exact)

| Check | Result |
|---|---|
| `npm test -w @phc/engine` | 58 files, **1432 passed**, 1 skipped (the strict coverage test, which skips without the flag) |
| `test/faith.test.ts` (new) | **89 passed** |
| `PHC_COVERAGE_STRICT=1 npx vitest run test/coverage.test.ts` | 3 passed (0 gaps) |
| `npx tsc --noEmit -p .` in `packages/engine` and in `apps/web` | 0 errors |
| `npm test -w apps/web` | 36 files, **267 passed** |
| `python3 tools/validate.py data` | 0 errors, 0 warnings |

Existing tests changed: none. One web file changed: `apps/web/src/game/actionPickers.ts`, Stolen Fire's picker, copied
line for line from implementer 2's commit `92e7881` on `feature/blessing-ui` (so the two branches merge cleanly). The
engine now reads Stolen Fire's second target and tile, and the web picker test asks for a picker when an action reads
them.

## What was built, file by file

| File | What |
|---|---|
| `packages/engine/src/faith.ts` (new, ~950 lines) | Everything: data constants, belief, Devotion, previews, the Faith panel view, prayer in a fight and in the story, tags, vows, interventions, rites, conversion, pieces, apostasy, voice lines, the end-of-fight settlement, the reducer for `faith/*`. |
| `packages/engine/src/game.ts` | `faith/*` routing (`faithAction`): a prayer in a fight goes through `combatAction` as `combat/pray`, so AP, turns, windows, deaths and the enemies' turns behave like any move. `combat/pray` takes `kind`/`id`/`targetId2`/`tile` (the old `choice`/`miracle` still work). `story/pray` is a Hymn through `faith/pray`. The Narrator's turn: `patrons` makes a pact or moves Devotion (clamped ±2, optional `reason`), the new `faith` field carries pact, piece, devotion, rite_kept and apostasy, and `patronMood` is no longer applied. `finishCombat` and the Proving Ground's `sandboxOver` call `faithFightEnd`. New `sandbox/faith`. `vow` and `faith` survive a Proving Ground rebuild. |
| `packages/engine/src/effects/hooks.ts` | Global listeners for engine systems that aren't held items: `onHook` (fight hooks, run after the items), `onStat`, `onCheck`, `onStoryHook` (story hooks). |
| `packages/engine/src/character.ts` | `Belief`, `Vow`; `Sheet.belief`; `Character` `belief`, `faithPieces`, `hymns`, `vow`, `ritesKept`, `faithRev`; `validateSheet` checks the patron; `newCharacter` sets `patron` and Devotion 3 for the Faithful. |
| `packages/engine/src/combat.ts` | `Unit.vow`, `Unit.faith` (a fight's faith state). |
| `packages/engine/src/magic.ts` | The Smitten condition; `condIsBoon`; Witnessed's text for rules 1.6. |
| `packages/engine/src/tactics.ts` | `PATRONS`/`PATRON` alias `blessings` = `hymns`. The old `pray` is removed (callers moved to `combatPray`). `blessing()` also runs `heal` and `shield` ops (old-shape Blessings, Blessed Shells' loaded shot). |
| `packages/engine/src/perks/d.ts` | Heretic's Stolen Fire prays by dice on Will Power (TN 14/16/18), with the Hymn's own target, second unit or tile; the story version rolls against the same TN. |
| `packages/engine/src/classes/k.ts` | Blessed Shells' story prayer: by standing, else an overreach (a miss −1). |
| `packages/engine/src/glossary.ts`, `index.ts` | Patron glossary entries (likes, taboos, rule, Hymns, Miracle); `export * from './faith'`. |
| `data/patrons.json` v2 | 8 patrons, 14 tags, 6 Whispers, 6 vows, 9 line banks. |
| `data/conditions.json`, `data/effect_ops.json` | `smitten`; the bespoke `chain_damage` op. |
| `tools/validate.py` | Checks the patrons v2 shape. |
| `docs/rules/PHC-Core-Rules-v1.0.md` | "Patrons and prayer" rewritten as rules 1.6; section 14 items 592–629. |
| `docs/design/decisions.md`, `CLAUDE.md` | Decision 102; the Blessings line. |
| `packages/engine/test/faith.test.ts` (new) | 89 cases, all through `apply()` except interventions set off by an enemy's blow (the damage chokepoint, with the game bound). |

## The contract (final)

### Types

```ts
type Belief = { kind: 'faithful'; patron: string } | { kind: 'atheist' };
interface Vow { id: string; allyId?: string; state: 'sworn' | 'kept' | 'broken' }
// Sheet:      belief?: Belief                     (validateSheet: "Pick a patron, or be an Atheist.")
// Character:  belief?, patron (the Faithful's patron, null for an Atheist; kept in step), devotion (0-10),
//             miracleSession, faithPieces?: Record<patronId, 0-3>, hymns?: string[] ("<patronId>.<hymnId>", learned),
//             vow?: Vow | null (mirrors the fight's vow; cleared at its end), ritesKept?: Record<"<patron>.<rite>", sessionN>,
//             faithRev?: 16, state.faith: { whisperRound?, hymnRound?, luck?, luckyBreak?, guidance? } (story)
// Unit:       vow?, prayedRound (the Hymn cooldown), faith?: { whisperTurn, liked, tags, intervened, harmedHelpless,
//             luck, luckyBreak, guidance, safePassage, dugIn, foreknown, standFrom, lastSpent, lastRound, acted }
// Combat:     faithLinks (Red Thread), faithGates (Hold the Gate), faithZones (Hearthlight), faithClouds (Gather the
//             Clouds), faithOrderRestore (Rewoven): draw them if you like (all `any`, see faith.ts)
```

`beliefOf(c)` reads old saves: a pact makes them Faithful to that patron (with their Devotion), no pact an Atheist.

### Actions

| Action | Who | Notes |
|---|---|---|
| `faith/pray { charId?, unitId?, kind, id, targetId?, targetId2?, tile?, text? }` | the character's player | `kind`: `whisper`, `hymn`, `miracle`. `id`: a Whisper id; a Hymn key `"<patron>.<hymn>"` (or a bare id of your own patron's Hymn); the Miracle id (or empty). In a fight it becomes `combat/pray` (unitId, or charId mapped to the unit); `tile` may be `"x,y"` or a grid ref. `text` is for the story. |
| `combat/pray { unitId, kind?, id?, choice?, targetId?, targetId2?, tile?, miracle?, mods? }` | the player | Same as above; the old shape (`choice` = a Hymn id, `miracle: true`) still works. Blessed Shells' toggle rides on `mods`. |
| `story/pray { charId, text?, choice? }` | the player | Old action, kept: a Hymn of your patron (Hymn I unless `choice` names one) through `faith/pray`. |
| `faith/vow { unitId, id, allyId? }` | the player | Round 1, before the fighter first acts; one a fight; the Faithful only. `allyId` (unit or character id) for `shield`. |
| `faith/rite { charId, id }` | the player | An engine rite (`riteState` says whether it can be pressed and why not). |
| `faith/pact { charId, patron }` | Narrator (host) | A pact or a conversion; from another patron it is apostasy first. |
| `faith/piece { charId, patron, from? }` | Narrator (host) | One knowledge piece; `from` is the teacher's name, for the line. |
| `faith/devotion { charId, delta, reason }` | Narrator (host) | ±1 or ±2 with a reason; refused above 2. |
| `faith/rite_kept { charId, patron?, rite }` | Narrator (host) | A Narrator rite (not an engine one). |
| `faith/apostasy { charId }` | Narrator (host) | Leave the pact. |
| `sandbox/faith { charId, belief?, patron?, devotion?, faith?, pieces?, vow?, allyId?, reset? }` | Proving Ground | Sets any of: belief, patron (makes them Faithful), Devotion, the Faith skill, pieces (the whole map; Hymns follow), the vow (any time, `null` clears it), `reset` (the Miracle, the rites and the cooldowns). Logs one line. |
| Narrator turn `patrons: [{ charId, patron?, devotion?, reason? }]` | the AI Narrator | A pact; Devotion clamped to ±2. |
| Narrator turn `faith: [{ charId, op, patron?, from?, delta?, reason?, rite? }]` | the AI Narrator | `op`: `pact`, `piece`, `devotion` (clamped ±2), `rite_kept`, `apostasy`. A refusal becomes an OOC line. |

### Preview and view

- `previewPrayer(g, who, kind, id, { targetId?, targetId2?, tile? })`, where `who` is a unit id in a fight, else a character id, →
  `{ ok, why?, ap, roll?: { tn, mod }, gate, overreach?: { tn }, mode: 'standing' | 'overreach' | 'dice', effectText, name, patron, targets, target }`.
  `target`: `self_or_ally`, `self`, `ally`, `enemy`, `tile`, `none`, `two_units`, `two_allies`, `downed_ally`, `dead_ally`.
  `targets`: unit ids in sight in a fight, character ids in the story (empty for a tile or none). `roll.mod` already
  includes items. `why` texts are player-facing.
- `faithView(g, charId)` → `belief`, `patron { id, name, costume, archetype, accent, rule, likes, taboos }` (tags as
  `{ id, name, text }`), `faith`, `devotion`, `gates { whisper, hymn1, hymn2, hymn3, miracle }`, `witnessed`,
  `canBeWitnessed`, `whispers[{ id, name, text, preview }]`, `hymns[{ key, patron, patronName, id, name, tier, text,
  source: 'patron' | 'kept' | 'learned', preview }]`, `miracle { id, name, text, usedThisSession, preview } | null`,
  `pieces`, `vow` (this fight's; null out of a fight), `vows[{ id, name, words, brokenWhen, needsAlly }]`,
  `rites[{ id, name, text, engine, keptThisSession, available, why? }]`, `rule`, `cooldowns { hymnRoundsLeft,
  whisperUsed, miracleUsed }`, `likedThisFight`.
- Also exported: `patronLine(rng, patron, bank)`, `diceHymns(c)`, `hymnByKey`, `prayerEntry`, `riteState`, `tithable`,
  `patronById`, `beliefOf`, `patronOf`, `devotionNow`, `faithOf`, and the data (`FAITH_PATRONS`, `FAITH_PATRON`,
  `FAITH_TAGS`, `WHISPERS`, `VOWS`, `LINE_BANKS`, `GATE`, `ATHEIST_TN`, `OVERREACH`, `AP_COST`, `FAITH_FX`).

### FX events (`emitFx` kinds; `FAITH_FX`)

| Kind | Payload |
|---|---|
| `prayer` | `{ unit, kind, id, patron, at, target, ok: true }` |
| `prayer_fail` | `{ unit, kind, id, patron, at, why: 'overreach' \| 'dice' }` |
| `witnessed` | `{ unit, patron, at }` |
| `intervention` | `{ patron, trigger, at, target, unit }`; `trigger` is the patron's (`enemy_harms_helpless`, `ammo_dry`, `enemy_nat1`, `ally_would_die`, `ally_below_quarter`, `you_kill`, `ally_hit_adjacent`, `enemy_crits_you`) |
| `devotion` | `{ char, delta, reason, tag?, now }` |
| `vow` | `{ unit, char, id, state: 'sworn' \| 'kept' \| 'broken', allyId? }` |
| `patron_line` | `{ patron, event, text, char }`; `event` is the bank: `answered`, `refused`, `taboo`, `vow_kept`, `vow_broken`, `witnessed`, `intervention`, `miracle`, `conversion` |
| `miracle` | `{ patron, id, at, area, unit }` (`area`: the 9 tiles for a tile Miracle, else null) |

In a fight they go on `cb.fx`; out of a fight on `g.story.fx` (`{ n, k, ...payload }`, capped like `cb.fx`; in the story
`unit` is the character id and `at` is null). The text side: a combat log line `Patron Name: "line"`; in the story an
entry with `head` = the patron's name in capitals and `text` = the line in quotes. A story prayer posts a `check` entry
headed `FAITH · HYMN · NAME (PATRON) · d20 … · ✓ ANSWERED` (or `· BY STANDING ·`, or `✕ SILENCE`).

## Numbers (all provisional; item 592 asks for a balance pass)

| What | Number |
|---|---|
| Devotion | starts 3 on a pact; 0–10 |
| Gates | Whisper 0, Hymn I 3, II 5, III 7, Miracle 7 (and Faith 7) |
| Praying | Faith 3; Witnessed at Faith 5 |
| AP | Whisper 1, Hymn 3, Miracle 3 (Rite in the Field still cuts `pray`) |
| Limits | a Whisper once a turn (once a story round); a Hymn every prayer-cooldown rounds; a Miracle once a session |
| Overreach | d20 + Faith mod vs 12 + 2 × (gate − Devotion); a miss −1 |
| Atheist dice | Whisper 12; Hymn I/II/III 14/16/18 |
| Mana | −5 a prayer (fight and story) |
| Tags | liked +1, at most +2 a fight; taboo −1, −2 while Witnessed |
| Vows | kept +1, broken −2 |
| Rites | +1 each, once a session |
| Conversion | +1 Devotion per piece of the new patron (on top of 3, at most 10) |
| Narrator | ±2 a call |
| Witnessed | +2 on attack rolls that would carry a liked tag; 1 round |
| Whispers | Luck +2; Health 15 ×power; Protection 15 ×power; Guidance radius 6, +2 spotting |
| Hymns and Miracles | the table in the spec (rules 1.6) and `patrons.json`; all × Blessing power |
| Saves the prayers force | d20 + the target's save vs 12 + the caster's debuff strength (as other debuffs) |
| Durations | Red Thread 2 rounds; Hearthlight 3 rounds, heals 10 ×power at turn start; Hold the Gate, Gather the Clouds (+1 rider stage), Together: until the caster's next turn |
| Interventions | Nerukhan 20 Soul, Mother Ember 15 heal, Old Overcast 20 lightning, all × Blessing power (item 620) |

## Decisions where the spec was silent (each is a section 14 item)

- 592–619: written with the spec (the numbers pass, the like cap, no roll within standing, Witnessed's +2, a tag once
  per action, kill-as-taboo of the helpless, betray, mercy, protect/heal/supply, hold/cower/flee, vow timing,
  interventions, story prayers, rites' checks, apostasy's pieces, changing patrons, the Miracle and Witnessed, each
  Hymn's reading, enemy faithful deferred, Judgement and Blessed Shells).
- 609 and 614 now say what the engine does: Lucky Break in the story is +5 on the next check; Encore banks AP for the
  next turn.
- **620** interventions × Blessing power. **621** the Miracle spends Devotion after its effect. **622** a hit on a
  Downed creature counts as harming the helpless (it lands as a failed death save, not HP). **623** mercy and flee at
  the fight's end: one tag per fighter. **624** story prayers that need a tile or an enemy go to the Narrator; `story/pray`
  is a Hymn I through `faith/pray` (3 AP while rounds run). **625** pieces of your own patron, a Jealous patron's
  Faithful, a fourth piece: refused. **626** engine rites only from the button, Narrator rites only by the Narrator; a
  tithe takes one matching item. **627** the Narrator's Devotion: refused above ±2 as an action, clamped in the turn;
  `patronMood` ignored. **628** Stolen Fire prays by dice on Will Power. **629** old-shape patrons (`blessings`, no
  `hymns`) still work.

## What's left or stubbed

- **Enemy faithful** (optional in the brief): deferred, item 618. Enemies don't pray.
- **Tags the engine can't see yet:** *desecrate* needs objects tagged `holy` (`o.holy` or `tags: ['holy']`); no map or
  campaign has any, so for now it is the Narrator's (a `faith/devotion` with a reason). *protect* by Interpose and
  *supply* by an ally's reload or placed cover aren't tagged (no hook carries them). *trick* on perk moves is matched by
  id (`trick`, `illusion`, `false_image`, `feint`, `swap`, `sleight`); Hide and Switcheroo are tagged directly.
- **Story Witnessed:** none (a story prayer never makes you Witnessed; item 604).
- **The AI Narrator's schema** (`apps/web/src/narrator/context.ts`) still offers `patronMood` and `patrons` without
  `reason`, and doesn't know the `faith` ops. The engine handles both shapes; the schema is implementer 2's file.
- The old `tactics.ts` `pray()` is gone; nothing in `apps/web` called it.

## For implementer 2

- **Send `faith/pray` in a fight** with `unitId`; the engine routes it through the combat turn. Refusals come back as
  the reducer's error (the same text as `previewPrayer().why`), so show `why` on the disabled button and you're
  consistent.
- **Targets:** use `previewPrayer().target` to choose the picker and `.targets` for the grid highlights. `two_units`
  must be within 6 tiles of the caster; Together's two allies must be next to each other (the reducer says so).
- **Odds:** `mode` tells you which text to show: "by standing" (no roll), "overreach: TN n, a miss costs 1 Devotion",
  or "dice: TN n". `roll.mod` already includes items.
- **The round-1 vow:** `faith/vow` is accepted any time in round 1 before the fighter's first action (even before
  their turn). `faithView().vows[].needsAlly` says when to ask for the ally.
- **Story prayers** spend story AP while rounds are open, and post a `check` entry plus, when the engine can't apply
  the effect, a pending ruling for the Narrator.
- **Stolen Fire** (Heretic) reads `choice: "<patron>:<hymn>"`, `targetId`, `targetId2` and `tile`; your picker from
  `92e7881` is on this branch too, unchanged.
- **The Proving Ground:** `sandbox/faith` covers belief, patron, Devotion, Faith, pieces, the vow and a reset; enough
  for tools and the e2e.
- **Lines** are picked with the game's dice, so they replay identically; never pick one in the client.
- Out of a fight, `faithView().vow` is null (vows live in fights).
