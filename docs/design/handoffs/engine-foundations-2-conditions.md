# Engine foundations 2: conditions, and the area shapes of the kit (12 Nov 2026)

Wave 2 of [the foundation plan](../proposals/2026-11-engine-review/PLAN.md), from
[engine review 1](../proposals/2026-11-engine-review/1-duplication.md): finding **F4 (conditions)** and what was left
of **F6** (cones and blasts). The method was the plan's: pin, then move. Spec: "Conditions and saves" (the paragraph
"One table, one door") and section 14 items **1560 to 1574**.

If you only read one part, read [How to add things](#how-to-add-things).

## What was built

| Piece | The primitive | Sites it replaced | Behaviour changed? |
| --- | --- | --- | --- |
| The table | `data/conditions.json`, loaded by `src/condtable.ts` (`CONDS`, `condDef`, `condMods`, `condId`) | the 34-row TypeScript literal, the 5-id flag set, the alias map, 3 loaders of the file, about 20 number literals | Seven disagreements settled (below) |
| The door | `applyCond` / `endCond` and the few other writes, all in the condition block of `src/magic.ts` | 115 direct writes of a flag, a state or `u.conds`, in 21 files | Yes: every item is asked, wherever the condition comes from (below) |
| The flags and states | `src/unitstate.ts`: one write of each field | (the same 115) | Prone always ends Braced; coming up always clears death saves |
| One injury table | `rollInjury(rng, target, cb, by, called?)` in `combat.ts` | the Called Shot's own table (`classes/j.ts`) | A Called Shot asks the `injury` hook |
| Area shapes | `kit.ts`: `Area`, `inArea`, `tilesIn`, `unitsIn` | 9 per-file cone, blast and band tests | None (damage and rules tables identical) |

Commits, in order: the pin (`d3f6b58`, on unmodified code), then the change with its re-recorded lines, then this note.

## The pins

1. **`test/golden/conditions.json`** (`test/golden-conditions.test.ts`, in `npm run check`; harness
   `test/golden/conds.ts`): 1,855 lines. For each of the 42 rows and the old names the engine still answers to, on
   each of the five tiers and on a character: **apply** (from a die of 1, 10 and 20), **stack** (a longer dose, a
   shorter one, one from someone else), **tick** (five of the bearer's turns, start and end, then ended), **own** (put
   on in the bearer's own turn), **cleanse** (the lists, the generic `cleanse` op, `endCond`). Then: the two
   **immunity** doors for every condition; each kind of **source** (`via/`: a technique's Raw Power and Dexterity, a
   trap's Ingenuity, a Line's Brain Power, an Outburst's Will Power, a prayer's Faith, a song's Empathy, a Call's
   gamma, no skill, nobody (a hazard), a strength fixed when a zone was laid, an enemy of each tier); **every trait and
   perk** as the bearer and as the source (only what it changes is kept: 16 items); the **sites** that wrote a flag
   directly (a weapon's on-hit Bleeding, Prone and stagger, a serrated critical, each injury location, a fumble,
   kneel, the old Shove into a wall, four hazards, a stim, bleeding out, hide and reveal), plain and against both
   doors; **story** conditions carried into a fight and conditions **restored** from the story's magic state.
   The words are `conditions.log.json` (`GOLDEN_RECORD=log` re-records them).
2. **The rules tables of wave 1** (`rules-*.json`, 2,900 actions, real Lines, Outbursts, prayers, techniques and
   hazards): 9 state lines moved, all the same change (Bleeding 1 round → 3). `moves.json`: none.
3. **The damage tables** (5,327 actions): identical.

**Honest limits.** The condition table's sources are `applyCond` called with each delivering skill; the real actions
(an Evoke, a release, a Hymn, a Call, a technique) are pinned by the rules tables of wave 1, which read conditions,
Prone, Bleeding, Dazed, Hidden and Braced off every action. Perks are tried at Tier II (or their own tier): a perk
whose Tier I differs is not in the `item/` lines. The machine was loaded (15 to 30 on 4 cores) the whole time; the
timed balance smoke test timed out in the full run and passes alone.

## The table (`data/conditions.json` → `src/condtable.ts`)

```ts
CONDS: Record<key, CondDef>      condDef(id)   condMods(id)   condId(id)   CONDITION_NAMES   CONDITION_ROWS   FLAG_CONDS   UNTIL (99)
interface CondDef { id, key, name /* "X is <name>" */, title, text, fam?, rounds, boon?, noTick?, noSave?, engine: 'table' | 'flag' | 'state', until?, mods }
interface CondMods { defense?, moveMult?, vision?, ap?, save?: { body?, brain?, heart? }, dealtMult?, nextAttackMult?, sigilAp?, soulCostMult?, skills?: { tag, value }[], hit?: { own_attacks?, next_attack?, not_vs_source?, vs_source?, marker_squad_vs_self?, melee_vs_self?, ranged_vs_self? } }
```

The row format is in `data/CONVENTIONS.md` ("Conditions"). `tools/validate.py` checks: `engine`, `kind`, `family`, a
boolean `save` (and a family when there is one), a boon with no save and no family, a `duration` that is exactly one
of `rounds` or `until` (from a fixed list of words), names used once across ids, keys and aliases, a to-hit change
written as `attack_mod`, a number wherever the engine applies one, and, per condition, that the effect the engine
reads is there (`slowed` must have `stat_mod move_mult`, and so on: 21 rows). `amounts.tick` for the three that bite.

**Durations are in one unit: `rounds` = the ends of the bearer's own turns.** One tick point: `condTurnEnd`
(`magic.ts`). `until` never ticks. The turn-start clock is two functions beside it: `bleedTick` (Bleeding bites and
loses a round: its rounds are its bites) and `dazeSpent` (Dazed has cost its AP).

### Every disagreement between the two tables, and how it was settled

| # | Data said | Engine did | Settled |
| --- | --- | --- | --- |
| 1 | Bleeding: 3 rounds | 1 round when applied as a condition with no rounds; 3 from a critical, a weapon, an injury | **Spec: 3.** Engine fixed |
| 2 | Burning, Corroded: `save: false` | a save unless the source says none | Spec speaks only of "from a hit" and ACID: **engine stands**, data `save: true` |
| 3 | no Guarded, no Inspired | both exist (+2 Defense, +2 to hit, 2 rounds) | **Rows added**, provisional (item 1562) |
| 4 | `braced` ("Braced / Emplaced"), `overwatch`, `downed` rows | `braced` was an alias of Emplaced; the other two unknown | Rows kept as `engine: "state"`; the alias is gone: `applyCond(…, 'braced')` does nothing |
| 5 | Bleeding, Dazed, Prone, Hidden, Injured rows | five flags outside the table | Rows with `engine: "flag"`; same door |
| 6 | states and boons: `family: null` | every one had a family (Marked Body, Inspired Heart…) | **Spec: families are for debuffs.** Engine fixed |
| 7 | durations as `rounds`, `turns` or a sentence; `save` as true, false or a family name; Scorned's kind "condition" | rounds, or 99 for "until" | One form each in the data |
| 8 | Pinned as Movement × 0, Stunned as AP "lose_turn", Blinded's vision "adjacent_only", to-hit as `tn_mod` | its own rules | Data rewritten as what the engine reads (`forbid`, vision 1, `attack_mod`) |
| 9 | "Fear", "Guarded" | "Afraid", "Guarded (+2 Defense)" in sentences | `name` is the spec's; `label` is the sentence form |
| 10 | long rule texts | its own short texts | The row's text is the text (`condText`) |

## The door (`src/magic.ts`, "THE CONDITION BLOCK")

```ts
applyCond(cb, rng, by, target, id, rounds?, fam?, { skipSave?, tnAdd?, arg?, via?, str?, sameEntry? }) → string   // put it on
endCond(target, id, cb?)                                           // take it off, its numbers undone
setCondRounds(u, id, rounds, { fresh?, cb?, arg? })                // change the rounds of one it has
restoreConds(u, { id: rounds }, by?, via?, arg?)                   // put back what it carried / an item's own marker: nobody is asked
clearConds(u, cb?)                                                 // all of them off, numbers undone
condsAside(u, ids) → putBack()                                     // read the unit without some for a moment
condNotFresh(u, id)                                                // its next turn end counts
setProne(cb, u, on)                                                // the unit's OWN choice: drop, kneel, stand
hideAgain(cb, u) → boolean                                         // Hidden again on the same entry (no new ambush)
condTurnEnd(cb, u, rng)   bleedTick(cb, u)   dazeSpent(u)          // the clock
condHit   condSaveMod   condSkillMod   debuffsOf   condOn   condSource   condArg     // the reads
```

`applyCond`, for a table condition and a flag alike: the `cond_apply` hook, **then the `immune:` question** (new),
the save (`rollSave`), the write, `cond_landed`. A row with `engine: "state"` is refused (it returns `''`).

`src/unitstate.ts` holds the one write of each field:

```ts
setBraced(u, on, guard?)   bracedAs(u, was)   stagger(u, n)   clearStagger(u)   setDowned(u, on)   setNailed(u, nail | null)
startHidden(u, entry?)     asStanding(u, f)                                     // a unit that begins Hidden; "as if it stood"
rawBleed   rawDazed   rawProne   rawHidden                                      // raw: the condition block and Hidden's three owners only
```

### Every behaviour change, from the golden diffs

**`conditions.json`: 354 of 1,855 lines moved.** By cause:

| Lines | Keys | Was | Now | Why |
| --- | --- | --- | --- | --- |
| 26 | `apply/`, `stack/`, `tick/`, `own/bleeding` (6 each), `story/bleeding`, `item/#baseline` | Bleeding 1 round | 3 rounds: three bites, then gone | Disagreement 1 |
| 30 | `apply/`, `stack/`, `tick/`, `own/`, `cleanse/braced` (6 each) | `braced` put Emplaced on | nothing: Braced is a unit state | Disagreement 4 |
| 76 | `immune/<condition>/<bearer>/query` (74), `immune/bleeding/…/query-bleed` (2) | the `immune:` question was not asked: the condition landed | untouched | Ruling: both doors (item 1563) |
| 1 | `item/trait:factory_made/bearer` (new line) | its `bleed` immunity did not stop `applyCond(…, 'bleeding')` | it does | The same ruling |
| 78 | `cleanse/` of the 13 boons and states (`guarded`, `inspired`, `quickened`, `sharpened`, `withdrawing`, `emplaced`, `hopeful`, `witnessed`, `last_turn`, `hidden`, `marked`, `downed`, `overwatch`) | a family on every boon and on Marked; no name for `downed` and `overwatch` | no family; `body[]` no longer lists Marked; names from the table | Disagreement 6 |
| 24 | `cleanse/bleeding`, `/dazed`, `/prone`, `/injured` | `rounds=undefined`; the generic `cleanse` op left Bleeding and Prone on; the order book kept an entry after the end | the row's rounds; the op ends them; the entry is cleared | The flags are rows; item 1570 |
| 24 | `tick/` and `own/` of `dazed` and `prone` | the order book (`condAt`) kept its entry after the flag ended | cleared with it | Book-keeping |
| 13 | `apply/`, `stack/`, `tick/`, `own/injured` | an injury's Daze and Bleeding were written directly: no order entry | they land through the door (`seq[dazed]`, `seq[bleeding]`) | Item 1564 |
| 6 | `stack/hidden` | each further dose was a new Hidden entry (a new ambush) | one entry | Item 1567 |
| 14 | `restore/*` | any key copied in raw (a flag's, a state's, an alias); Withdrawing and Corroded without their Defense | only table conditions, under their keys, each with its numbers | Item 1569 |
| 35 | `site/…/hook` and `/query`: `weapon-bleed`, `weapon-prone`, `serrated-crit`, `injury-d6-1`, `injury-d6-2`, `shove-wall`, `bleed-out`, `dazed-costs-ap`, `stunned-loses-turn`, `prone-ends-braced`, the five hazards | the direct writers asked one door or none; `applyCond` asked only the hook | both doors hold everywhere | Items 1563, 1564 |
| 27 | `site/…/plain`: the same sites, `drop-prone`, `kneel`, `injured-condition` | no order entry; a maul's Prone left its target Braced | the entry is written; Prone ends Braced | Item 1564 |

**`rules-*.json`: 9 lines** (`tech/cleave` on three blades × two targets, `outburst/feeling/cruelty` ×2,
`…rage+spite+pride+cruelty`): `bleed0>1` → `bleed0>3`. Cleave's bleed and the Cruelty feeling applied Bleeding with no
rounds; they now do 15 damage over three turns where they did 5 (spec item 1561 (a): the balance pass should know).

**Changes no golden line shows** (each has a test in `test/foundations-conditions.test.ts` or is listed in the spec):

1. Anchor (the Defender) keeps its bearer on its feet against a maul, a wall, a Stop: Prone and the Defender's Shove:
   they now ask the `cond_apply` hook it listens on.
2. Items that react to a debuff landing (`cond_landed`: Sweet Talker's sting and its like) react to an injury's
   Bleeding and Daze and to a weapon's Prone. One test moved for this (`perks-e`, Sweet Talker: the fight's opening
   critical now counts as the charmed NPC's debuff, so the test starts from a clean slate).
3. A Called Shot fires the `injury` hook (with `called: true`), so what answers an injury answers it: Walking Wounded
   keeps its Daze and its halved Movement off, Last Wall turns it aside, Interpose takes it.
4. Every reveal clears where the other side last saw the unit (damage, Unravel, a surrender, Marked landing did not).
   Smoke (the Grand forms' VEIL), Silent Kill and Shadow Step go through `hideAgain`: an item can refuse them.
5. Coming up from Downed always resets the death saves (`subdue`, the Narrator's floor, Factory Made's repair, a teams
   round and the lost twin did not).
6. A sandbox respawn undoes each condition's numbers and ends Prone, Dazed and Hidden (it emptied the list only).
7. Jealousy's stolen boon comes with its number (a stolen Guarded gave no Defense).
8. The generic `cleanse` op with no filter can no longer end a boon, and it emits `cond_end`.
9. Rewrite turning Quickened into a stagger applies Dazed as a condition (an immunity holds).
10. A fumble's and "hesitates"' stagger keep the larger of two values (they overwrote).
11. `condText` is the data's rule text (it was a shorter engine text); `condName('injured')` is "Injured".

## Area shapes (`src/kit.ts`, the rest of F6)

```ts
type Area = { shape: 'burst', at, r } | { shape: 'aura', at, r } | { shape: 'cone', from, toward: tile | [dx, dy], n, reach?: 'round' | 'square' }
          | { shape: 'line', from, toward, n? } | { shape: 'band', from, toward, width }
inArea(area, tile) → boolean          tilesIn(cb, area) → string[]          unitsIn(cb, area | tiles, who?) → Unit[]
```

`unitsIn` takes the kit's `Who` (by default a unit still in the fight; `{ downed: true }` for a blast, which hits a
body on the ground), `side`, and `not: [unit…]`. **Replaced:** the flamer's cone (`coneUnits`, gone), an explosive's
splash, a thrown item's blast, the thrown techniques' `caught`, full-auto's band (`coneTargets`), an Outburst's Burst,
Aura and Wave tiles, a Sigil PUSH's cone, the Demolitionist's shaped charge (cone, circle and victims). Nothing moved.
**One disagreement kept and named:** a Sigil PUSH's cone measures its length by the grid (`reach: 'square'`), every
other cone as the crow flies; a ruling could make them one.

## How to add things

Short rules. Each has a lint test (`test/lint-conditions.test.ts`) that fails with a sentence telling you what to call.

1. **To add a condition,** add a row to `data/conditions.json` (copy a row that is like it; `data/CONVENTIONS.md`,
   "Conditions", lists the fields) and run `python3 tools/validate.py data`. That is all: `applyCond(…, '<id>')` now
   works. **Never describe a condition in TypeScript** (no name, no rounds, no number).
2. **To put a condition on someone,** call `applyCond(cb, rng, by, target, '<id>', rounds?, undefined, { via: '<skill
   that delivered it>' })`. Use its answer: it is the sentence for the log, and it says "resists" or "is untouched"
   when it did not land. A condition from a hit has no save: `{ skipSave: true }`. This is true for Bleeding, Dazed,
   Prone and Hidden too. **Never write `target.bleed = 3`, `target.prone = true`, `target.dazedNext = 1`,
   `target.hidden = true` or `target.conds[...] = …`.**
3. **To know whether it landed,** read the unit after: `condOn(target, '<id>')`, or `target.prone`, `target.bleed`,
   `target.dazedNext`, `target.hidden` for the four flags. Do not parse the sentence.
4. **To end one,** `endCond(target, '<id>', cb)`. To end "the newest debuff": `cleanseList(target, n)` then `endCond`.
5. **To change the rounds of one a unit has,** `setCondRounds(u, id, n)`. To put back conditions a unit carried, or
   your item's own marker that nothing should stop, `restoreConds(u, { id: rounds })`. To clear a unit:
   `clearConds(u, cb)`.
6. **To make an item immune,** in data: `{"op": "immunity", "to": "<condition id>"}` (or `"family:body"`, or `"bleed"`).
   In code: cancel on the `cond_apply` hook (`ctx.cancel = true; ctx.why = 'your item'`), or answer the stat
   `immune:<id>`. All of them stop the condition whoever applies it.
7. **To give a condition a number the engine applies,** write it in the row's `effects` in a form `condtable.ts`
   reads (`CONVENTIONS.md` lists them), then read it with `condMods('<id>').defense` and the like. If the engine does
   not read that kind of number yet, add it to `CondMods` and `modsOf` in `condtable.ts`, and to `COND_NEEDS` in
   `tools/validate.py` so the row can't lose it. **Never write the number in code.**
8. **A unit's own choice is not a condition applied to it:** `setProne(cb, u, true)` (it drops, it kneels),
   `hide(cb, u)` and `reveal(cb, u, why)` (`tactics.ts`), `hideAgain(cb, u)` (the same Hidden entry).
9. **Unit states** (not conditions): `setBraced(u, true)`, `setBraced(u, false)`, `stagger(u, 1)` (AP off its next
   turn), `setDowned(u, false)`, `setNailed(u, null)` (`unitstate.ts`). **Never write `u.braced`, `u.downed`,
   `u.stunnedNext` or `u.nailed`.**
10. **To injure someone,** `rollInjury(rng, target, cb, by)`; a named place: `rollInjury(rng, target, cb, by, { loc:
    'head' | 'arm' | 'leg', side })`. Do not write an injury table.
11. **To ask "which tiles" or "who is in it",** describe the area and ask the kit: `tilesIn(cb, { shape: 'burst', at:
    tile, r: 2 })`, `unitsIn(cb, { shape: 'cone', from: u.pos, toward: aim, n: 3 }, { side: 'foe' })`. A blast hits
    Downed bodies: `{ downed: true }`. **Do not write a cone test or `dist(v.pos, tile) <= r` over `cb.units`.**
12. **When a condition's behaviour changes on purpose,** the golden table will fail with the lines: read them, then
    record with `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-conditions` and list them in your hand-off. When
    only a sentence changed: `GOLDEN_RECORD=log`.

## What is left

1. **Story conditions are a second system** (review F4, point 6): `storyConds` / `setStoryCond` with scene, session
   and arc scopes, bridged into a fight by `STORY_CARRY`. They read their numbers from the table now, nothing else.
2. **No timed modifier any item can put on a unit** (review F4, (e): `applyMod(target, { stat, value, rounds })`):
   Rewrite's "−2 Defense for N rounds" and its like still keep private clocks in `stateOf(h)`. This belongs with F5.
3. **Overwatch** is a row (`engine: "state"`) with no setter here: `u.overwatch` is written in about ten places. It
   belongs to the held-action work (Watches), not to conditions.
4. **Two private counters inside the condition block:** MASK's two rounds (`u.maskLeft`, ticked in `condTurnEnd`) and
   a deep ACID's extra Defense −2 (`acidDeep`, never undone when Corroded ends: read, not run).
5. **The flag conditions draw no `cond` effect event** (a table condition does). The client would have to know them
   first; it reads the flags off the unit today.
6. **Bleeding counts its rounds at turn start** (when it bites), every other duration at turn end. It is the same three
   turns either way; making it a table condition would move a field the client reads (`u.bleed`).
7. **Perks at Tier I** are not in the `item/` lines of the golden table (see "Honest limits").
8. `restoreConds` is a way round the hooks on purpose (carried conditions, an item's own marker, Old Tongue's "nothing
   stops the parley"). It has four callers (the story's magic state, Bite the Bullet's Last Turn, Old Tongue, Jealousy); a fifth should have a reason.
9. Rulings taken without asking, for Leon: spec items **1561** (Bleeding is 3 rounds everywhere: Cleave and Cruelty
   bleed three times as long), **1562** (Guarded and Inspired as provisional rows), **1563** (both immunity doors),
   **1564** (the flag conditions ask the items), **1565** (boons and Marked have no family).
