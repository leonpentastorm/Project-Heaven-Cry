# Classes 3.0, steps 2 and 4: the rename, and the classes that keep their mechanic (hand-off)

Built 13 Nov 2026 on worktree branch `worktree-agent-a2056ecc59e0f245f`, started from `claude/charming-gauss-hbq4n0`.
Not pushed; no version bump. Spec: rules 1.29 in `docs/rules/PHC-Core-Rules-v1.0.md`, items 1757 to 1761 (the numbers
may collide with the other builders' of the same day: renumber at the merge).

## 1. Part A, the rename (display names only)

| id (unchanged) | was | now |
| --- | --- | --- |
| `defender` | Defender | Bulwark |
| `fighter` | Fighter | Breaker |
| `marksman` | Marksman | Skirmisher |
| `infiltrator` | Infiltrator | Operative |
| `mage` | Mage | Sigilist |
| `trickster` | Trickster | Rigger |
| `bard` | Bard | Mender |
| `channeler` | Channeler | Channeler |
| `guardian` | Guardian | Chaplain |

Changed: `data/classes.json` names (base and the Revision 2 shells); data texts naming a class (`actions.json` the stim,
`items.json` the field kit, `patrons.json` the `trick` tag, `effect_ops.json` seven summaries, `rules.json` the melee
note); `glossary.ts` reads the Breaker's name from data; `classes/i.ts` Draw Fire's brief; the Narrator prompt's Field
Surgery line reads `CLASS.bard.name` (its class list was already from data); web tests (`classView`, `sandbox`,
`levelup-screen`) and the e2e suites `classes.mjs`, `perks.mjs` read names from data; `classes-rev3.test.ts` likewise;
`old-save.test.ts` gained a block proving each fixture's characters keep `classId`, `classRev` 3 and id-shaped move keys;
emblems: Rigger (wrench crossed with a spark), Mender (two cupped hands around an outlined plus), Chaplain (a dome under a
flame) redrawn in `classIcons.ts`, `docs/design/class-icons-sheet.png` re-exported (labels from data); spec section
"Classes" (core list, the table with "(was X)" once, the resource list), rules 1.29 section 1; `CLAUDE.md` Classes
paragraph (Revision 4, in progress); `docs/PLAYTEST-CHECKLIST.md`, `docs/ROADMAP.md`. `protodata.json` regenerated.
`tools/once/rename_classes.py` lists any old name left (changes nothing).

**Found, not in the rename doc:** three archetype presets were named Bulwark, Sigilist and Mender, and the validator
refuses an archetype named like a class. Renamed (display only; ids, portraits, presets stay; archetypes are never
saved): **Holdfast** (`bulwark`), **Glyphwright** (`sigilist`), **Empath** (`mender`), *Suggested*, item 1758;
`art/catalog.json` labels follow; `e2e/magic.mjs` now clicks `[data-arch="sigilist"]`. The **perk Bulwark** also shares
the class's name (nothing refuses it; keys differ): for Leon.

**Left (other builders' files or history):** `effects/stats.ts` `prey_lock` about ("Defender's Prey Lock") and
`effects/types.ts` `braced` about (effects/** is the primitives builder's); `classes/rev3.ts` 399 Sabotage's brief
("the Infiltrator", the Operative's handler); Judgement → Verdict (the Chaplain's step); code comments and test titles
naming Revision 3 classes (history); proposals, the Rev 2 / Rev 3 rosters, balance records and their labels
(`test/balance/*`); the live design docs beyond the spec, CLAUDE.md, checklist and roadmap (most Revision 4 specs
already use the new names: `python3 tools/once/rename_classes.py docs` lists the rest).

## 2. Part B, the kept classes

| Class | Built | Number (data) | Where |
| --- | --- | --- | --- |
| Bulwark | a fight starts with Guard | 1 (`value`) | `move_pool` `defender.brace` effect 4: `{op: resource, when: combat_start, resource: guard, value: 1}`; text `{=effects.4.value}` |
| Breaker | first hit each turn on a Shaken or Frightened enemy, own turn, any weapon: +Momentum | 1, `per_turn` 1 | `move_pool` `fighter.lunge` effect 2: `{op: resource, when: hit, resource: momentum, value: 1, if: {own_turn, hostile, target_has: [shaken, fear]}, limit: {per: per_turn, n: 1}}`; text `{=effects.2.value}` |
| Sigilist | nothing (confirmed): its only Revision 4 change is the Rigger's Blind and Slow leaving the ranks (the Rigger's step) | | |
| Channeler | nothing (confirmed) | | |

**The missing primitive (for the lead):** the design writes these as a base class's own `effects` block (and so do
the Skirmisher's Reflex, the Operative's "better" and the Chaplain's presence). The engine has none: `effects/collect.ts
classMoveKeys` makes items only from rank moves. Rather than leave Part B unbuilt, each op sits on the class's rank I
move (held from level 3 by that class only; the Revision 2 test shells aside), with the move's handler narrowing
`claims` from `'all'` to a predicate (`e.when !== 'combat_start'` / `'hit'`) so the generic runner runs the op: no
handler code. When a class-level item exists (a `class:<id>` item from `base[].effects`, or P6's `verb` with
`requires: {class, rank}`), cut the two ops out of Brace and Lunge into the class blocks unchanged, restore
`claims: 'all'`, and the texts move to the class card.

`numbers.start_guard` (the doc's name) is not used: the op's own `value` is the one number, read by the text and the
test. Riposte untouched. The level 20 Breaker measurement (before 176) is the balance step's.

**Tests:** `test/classes-3.0-kept.test.ts` (numbers from data): Guard at fight start for a Bulwark at ranks I to III,
none for the other eight; a Shaken blow gives exactly the data's extra Momentum, a second hit that turn none, a rifle
shot on a Frightened enemy gives it (weapon-neutral), another class nothing; the Sigilist's and Channeler's six keys.

**Golden lines moved on purpose:** pinned first (commit "step 4 pin": `blow-shaken`, `blow-shaken-twice`,
`shot-afraid` situations recorded on the old engine, additions only). Then re-recorded: see section 4.

## 3. Part C, weapon-neutral

The audit lists no locked move on the Bulwark, Breaker, Sigilist or Channeler: nothing to fix. The guard
`packages/engine/test/class-weapon-neutral.test.ts` (in the unit suite, so in `npm run check`): (1) data predicates,
(2) text words (with "N round(s)" of time taken out), (3) handler reads (`isMelee(`, `isRanged(`, `isHandgun(`,
`shotgun(`, `category`, `/bow|thrown/`) counted per handler with the one-line top-level helpers it calls, a ratchet both
ways (a count under the allow-list fails too, so the list shrinks). `DOOR` (for good): Lunge, Riposte, Finisher, Anchor,
Brace, Duck and Roll, Field Fix. `PENDING` (must reach empty): Fire Discipline, Speed Loader, Special Ammo, Killzone
(Skirmisher step); Called Shot, Toxin (Shadow step); Judgement (Chaplain step). Blessed Shells is neutral in rule, text
and code; only its name and tag say guns (the Chaplain step). A fifth check fails on a PENDING entry that no longer
matches anything, so a step that fixes a move must delete its entry.

## 4. Golden lines moved, and the checks

Pinned first (commit "step 4 pin": three item-ops situations, `blow-shaken`, `blow-shaken-twice`, `shot-afraid`,
recorded on the old engine; additions only). Re-recorded on purpose (commit "step 4"), and only:

- `itemops-traits-classes`: `class/defender@I/II/III` (Guard 1 in `start`, soaked by the first hit taken, Brace
  starting from 1) and `class/fighter@I/II/III` in the Shaken / Frightened situations.
- `itemops-perks` and the `costs-*` tables: perks whose table base is a fighter and whose hits land on a Shaken or
  Frightened target (`the_name_they_whisper@mastered`, `bone_talk`, `both_hands@II`, `silent_partner` marks), the
  Lunge counter (`uses.class:fighter.lunge|per_turn`) in the marks of every Lunge holder (shelved advanced ones
  included), `asker/class/fighter@III`, `item/class/fighter@III` Finisher's `then-shot`.
- `builds-normal`, `builds-allin`: the tank's L12 and L20 `taken` lines (the start Guard soaks 10).
- Replay hashes: the oracles (`paths-order`, `sight-order`, `shared-state`) passed, then `REPLAY_RECORD=1
  REPLAY_FULL=1`; four replays had moved.

Tests changed because a Bulwark no longer starts at 0 Guard: `classes-i.test.ts` (Brace), web `resources.test.ts`
(both read the start from data). The Narrator's stable prompt cap 25.6k → 25.7k (`faith-context.test.ts`; the longer
names and the two sentences).

Checks at the close: validator 0 errors; `tools/engine_catalog.py` regenerated; `build.py --web --check` fresh;
`npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`: two smells, both justified (the generated
`protodata.json`; Draw Fire's brief's "−2", an old string only renamed), none a lint fails on; `npm run check`: all
green but web `combat-actions.test.ts`, which timed out at 5 s on the loaded machine and passes alone with
`--testTimeout 300000`; browser suites on port 8797 with `--base`: `classes classes-moves pg-levelup creation-points
skeleton-screens playscreen perks magic` ALL GREEN.

## 5. For the lead

1. **A base class's own effects block** (the missing primitive, section 2): needed by this step, the Skirmisher's
   Reflex, the Operative's better and the Chaplain's presence. Until it exists, the Bulwark's and Breaker's ops ride
   Brace and Lunge.
2. **Archetype names** Holdfast, Glyphwright, Empath (Suggested) and the perk Bulwark sharing the class name: for Leon.
3. **The level 20 Breaker measurement** (rev4 section 1, "measure level 20 before and after", 176 before) was not run
   here: the balance step's.
4. Left strings: `effects/stats.ts` `prey_lock`, `effects/types.ts` `braced`, `classes/rev3.ts` Sabotage's brief.
5. Item numbers 1757 to 1761 may collide with the other builders'.
6. `tools/validate_art.py` stops on "File integrity mismatch: art/briefs/ART-REQUESTS.md", a file this branch does not touch (so it is the base branch's); the three archetype labels in `art/catalog.json` changed.
