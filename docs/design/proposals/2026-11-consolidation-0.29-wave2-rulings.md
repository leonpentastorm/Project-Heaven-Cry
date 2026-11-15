# Consolidation review 0.29 wave 2: the lead's rulings and what was done

The review is `docs/design/proposals/2026-11-consolidation-0.29-wave2.md` (branch `wip/review-0.29-wave2`). This file
records the lead's rulings on its must-fix item 5 and the state of every item after `fix/0.29-wave2-mustfix`
(16 Nov 2026).

## Must-fix

1. Glimmer's and Picture's price (and Load the Visualizer's): done. Each grant names its cost site (`site`), the
   handler charges the site its row names, and `tools/validate.py` holds a grant's `ap` equal to its named site's
   (texts cannot read another file's field, so the check is the guard).
2. The health word: done. The token's hover card and the AI Narrator's fight summary read `healthView`.
3. The Figments migration at load: done (`migrateLoaded`).
4. Tests through the reducer: done for `bonds-slice1.test.ts` and `figments-2.test.ts`. Left: `survival-field-actions.test.ts`
   `fieldRefusal` (field code: the 0.28.3 hotfix removes that machinery) and `helpers/perkfight.ts`'s `forms` option
   (writes `doorPicks` directly; most Figment tests run on a migrated pre-forks character).
5. The lead's rulings:
   - (a) The owned data-verb vocabulary (`reach.tile`, `reach.beside`, `reach.side: ally`, `res` on a verb, a data verb
     as an auto unit's verb) is APPROVED as the data shape of owned units' verbs: `data/CONVENTIONS.md` "Owned units'
     data verbs"; the validator checks every key.
   - (b) `stim: true` is APPROVED only as the general `use: "<actions.json row id>"` (one of the OWNER's item uses):
     done (`owned.ts` `OWNER_USES`, by the row's reducer type; the stim rule stays `useStim`).
   - (c) `register('glimmer')` with its lure in code: acceptable for this release. See should-fix 19.
   - (d) `fieldDoor` / `fieldCombat` / `fieldRefusal` / `fieldActs`: left; the 0.28.3 hotfix deletes that machinery.
   - (e) `Character.doorKept` and the general `door/pick` action with `doorpicks.ts`: APPROVED.
6. The Ward's `%`: done; two older texts with the same fault fixed (Nerukhan's presence, `patrons.json`); the
   text-number guard now refuses a `|pct` placeholder with no `%` after it.

## Should-fix

Done: 11 (Glimmer's lifetime is its row's `numbers.fade_rounds`), 14 (`giveNow` uses `packKindOf`; the comment names
`counts_into`), 17 (`formsOpen` removed; the skill's name read from skills.json).

Left, with the reason:

- 1 `mendShown` vs `heal()`: `heal()` also emits a heal effect for 0 HP restored; merging changes the fx and moves replays.
- 2 the four pick machineries onto `doorpicks.ts`: a migration of three systems, not small.
- 3, 4, 5, 6 Tending's price shapes, the `bond` block's copies, `bondGives` in code, the dead `bond` keys: one pass on
  `tending.json` and the Bond card (the validator's `_tend_bond_check` reads the keys).
- 7, 8, 9, 15 (`cb.fieldHarm`, `g.story.fieldLimits`), 18: field code, left for the 0.28.3 hotfix.
- 10 `wordsAt` names `intelligence`: the Max Sigil words formula types it too; needs the driver attribute in data.
- 12 `newCharacter` reads `migration.rev` beside `FIG_REV`: one data field, two readers; `character.ts` importing
  `figments.ts` makes a cycle.
- 13 `COUNTED_ORDER` and `setUseDoor`'s rule on a count's field name: an item's `use` in items.json.
- 15 (`g.story.ps[id].uses`): the catalogue's state-field count.
- 16 Last Thread's `turn_end` clear on the holder's own turn: a rule change, for the lead.
- 19 (new, from ruling c) a general lure piece: Glimmer's and the Double's lure (`figments.ts` `lure`) should be an op
  or a primitive the lead approves, so a body-less image is data, not a per-item handler.
