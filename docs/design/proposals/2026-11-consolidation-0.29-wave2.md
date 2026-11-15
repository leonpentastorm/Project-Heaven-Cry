# Consolidation review, 0.29 wave 2 (rule 4)

Reviewer: Claude (Opus), 16 Nov 2026. Read-only review of the code, not of the builders' reports.
Range: `git diff 9b6e88d8...origin/wip/feature-0.29` (head `94ce898a`) over `packages/engine/src`, `data`, `tools`,
`docs/ENGINE-HOOKS.md`, plus the new and changed engine tests. It carries Bonds 2.0 slice 1, Figments 2.0 slices 2 and 3
(the order site, orders on every form, Glimmer, five new forms, forks and their migration), and the 0.28.2 fixes merged in
from develop (the field after a fight, Give anywhere, counted items, health words, the Narrator-less ruling, word-cap words).

`python tools/validate.py data`: 0 errors, 0 warnings at `94ce898a`. No lint baseline file changed in the range.
`src.door` (P1), `instanceMods`, `handInstances`, `setHandsRule`, `carriedGuns`, `gunAt`, `setGunMods`, `cardFight`,
`weaponOwnSite` and `specialRoundName` predate `9b6e88d8`: none of them is in this range, so none is reviewed here.

## Must-fix (before 0.29 is released)

1. **Glimmer's price is in two places, unguarded** (a, c). `packages/engine/src/figments.ts:366` charges the
   `figment_order` site (`data/actions.json` costs, 1 AP), while `data/figments.json` item `glimmer` carries its own
   `grant_action` `ap: 1`, and its text reads that one (`Costs {=effects.0.ap} AP`). Raise the site to 2 and the engine
   charges 2 while the card says 1. Picture has the same split from before (`costs.picture` 2 against its row's
   `grant_action` `ap: 2`). Fix: one number: the rows name their site and the text reads it (or the validator holds each
   handler-priced row's `ap` equal to its site).
2. **The health word has three ladders** (a; the client decides). `packages/engine/src/combat.ts:2527` `healthView`
   reads `rules.json combat.health_look` and calls itself "the one place", but `apps/web/src/screens/shared.js:316`
   (`tokenVals`, every token's hover card, un-Analyzed foes included) keeps UNHURT / WOUNDED / BADLY HURT at 100 / 50,
   and `apps/web/src/narrator/fight.ts:29` (`band`, what the AI Narrator is told) keeps a third at 1/2 and 1/4. A foe at
   60% reads "hurt" on its chip and "WOUNDED" on its card. Fix: both read `healthView` (its `word`).
3. **The Figments save migration does not run at load** (g). `migrateCharacterFigments` runs only inside `apply`
   (`packages/engine/src/game.ts:567`), not in `migrateLoaded` (`game.ts:515`). A save from before the forks, viewed
   before its first action, shows only the ladder's fixed forms, the forks open, and its designs of Eye, Wall, Beast and
   Blade not ready (`formsOf`, `pendingDoorPicks`, the Figments tab, the level-up card); a `door/pick` sent from that view
   is migrated first and then refused ("No Figment choice is open now"). Fix: call it in `migrateLoaded`.
4. **Tests of the new rules bypass the reducer** (e; hard rule 5).
   - `packages/engine/test/bonds-slice1.test.ts:127` and `:137`: Last Thread's trigger is made by a hand call to
     `applyDamage`, not an enemy's attack.
   - `bonds-slice1.test.ts:37`: every Bond of the rig is made by `tie()`, never by the `tend.bond` action (its save, its
     cost, its cap are never on the path).
   - `packages/engine/test/figments-2.test.ts:115`: the Ward's redirect is proven by a hand call to `resolveAttack`.
   - `figments-2.test.ts:171`: `migrateCharacterFigments` called by hand.
   - `packages/engine/test/survival-field-actions.test.ts:154`: `fieldRefusal` called by hand.
   - `packages/engine/test/helpers/perkfight.ts` (the `forms` option): writes `c.doorPicks` directly, and with no `forms`
     deletes `figRev`, so most Figment tests run on a migrated pre-forks character, never on a new character's path
     (`door/pick`).
5. **Closed-list additions nobody approved** (d). Each needs the lead's ruling, or to go:
   - `fieldDoor` (`packages/engine/src/effects/hooks.ts:34`): a new exported primitive, a mutable global slot game.ts
     fills (`game.ts` `fieldDoor.f = fieldCombat`) so descriptors read the field as a fight.
   - The owned data-verb vocabulary grew without a primitive entry: `reach.tile`, `reach.beside`, `reach.side: ally`,
     `res` on a verb, data verbs as an `auto` verb (`packages/engine/src/owned.ts` `ownedRecord`, `ownedVerbInfo`,
     `runDataVerb`), and above all **`stim: true`** (`owned.ts:227`, `runDataVerb`, the Hand's Hand over): a behaviour (an
     owned unit gives its owner's stim) that is neither an op of `data/effect_ops.json` nor in `docs/ENGINE-HOOKS.md`,
     an op in all but name.
   - `register({ id: 'glimmer' })` (`figments.ts:363`): a new per-item handler (an item id in code) whose `lure` is code;
     it follows Picture's pattern, but the lure of a body-less image is a general piece that should be an op or a
     primitive the lead approves.
   - Exported from `game.ts`, not on the approved 0.28.2 list: `fieldCombat`, `fieldRefusal`, `fieldActs` (with
     `FieldActV`); from `screenViews.ts`: `bondGives` (`BondGives`).
6. **The Ward's text misreads** (c). `data/figments.json` form `ward`: "lands {=effects.0.share|pct} on the Ward" prints
   "lands 50 on the Ward" (a number of damage, to a reader); the `%` is missing (the `pct` format gives the bare number).

## Should-fix (18)

1. `effects/core.ts:259` `mendShown` (heal fx and words) is a second copy of `magic.ts:569-570` (`heal()`'s same fx and
   words); `heal()` should call it.
2. Four pick machineries now: `door/pick` (`doorpicks.ts`, P8, justified: none of the old ones was general) beside
   `magic/pick` with `soulPicks` (`game.ts:1001`, `character.ts:846`), technique picks (`physical/data.ts:134`
   `takePick`) and perk steps (`character.ts:1276`). Move the other three onto `doorpicks.ts`.
3. Two data shapes for a verb's price: an owned data verb's `site` + `res` (`owned.ts:150` `verbPrice`, built by hand as
   `{ap: costOf(site), res}`) against Tending's `grant_action` `ap` + `res`. Both reach `price()`, but a resource cost
   is stated two ways.
4. `data/tending.json`: `tend.bond` `numbers` `through`, `share`, `hit`, `echo` are a third copy of `tend.threads`'
   effect values (with the `bond` block); guarded by `tools/validate.py` `_tend_bond_check`, but still three copies.
5. `screenViews.ts` `bondGives` builds the Bond card's five lines in code (words and `%` around data numbers) and reads
   the `bond` block, not the effects the engine runs; the lines belong in data with placeholders.
6. Dead data: `tending.json` `bond` keys `make_range`, `make_range_far`, `far_at`, `down_mp`, `save_elite`,
   `save_boss`, `boss_rounds`, `boss_gap` are read by nothing but the validator (the block is now "what the card shows",
   and the card reads five keys).
7. `game.ts:3873` `FIELD_NOT` (`carry`, `put_down`, `search`, `attempt`, `ask`, `end`) and `game.ts:3861` `FIELD_WORLD_ACTS` are rule
   lists typed in code; they belong beside `survival.json` `field`.
8. `game.ts:3943` `fieldActs` keeps a refused perk row by matching the refusal's words (`/waits for a fight/`): a reason
   code, not a regex on text.
9. `game.ts:3910` `stimOffGrid` builds a Combat by hand (`OFF_GRID`, `as unknown as Combat`) beside `storyCb`: a second
   mini-fight builder.
10. `sigil.ts:790` `wordsAt` names `'intelligence'`: a second copy of which attribute drives Max Sigil words (the formula,
    `character.ts:777`, types it too).
11. `illusion.ts:80` `imageTurnStart`: `img.round + 2`, now Glimmer's lifetime, is a number in code, not data.
12. `character.ts` `newCharacter` reads `figmentsJ.migration.rev` itself, beside `figments.ts` `FIG_REV`.
13. `data.ts:106` `COUNTED` says it is "the one reader" of `counts_into`, but `containers.ts:167` `COUNTED_ORDER` reads
    `counts_into.at` again; and `game.ts:3955` `setUseDoor` decides an item is usable on a friend by
    `COUNTED[item] !== 'stims'` (a rule keyed on a count's field name: an item's `use` belongs in items.json).
14. `give.ts:92` `giveNow` (counted path) types `kind: 'med'` instead of `packKindOf`; `run/loadout.ts:351` comment still
    names the retired `counted` field.
15. New state fields hidden from the catalogue by `as any`: `cb.fieldHarm` (`hooks.ts` `harmHeld`, `game.ts:2807`),
    `g.story.fieldLimits`, `g.story.ps[id].uses`; the Combat-field count in `ENGINE-HOOKS.md` did not move, so a
    review of its diff cannot see them.
16. `tending.json` `tend.last_thread`: its `turn_end` clear fires at the end of the holder's current turn, so an ally
    Downed during your own turn loses the mark before "your next turn" (the text's promise).
17. `figments.ts:115` `formsOpen` is exported and has no caller left (dead code); `figmentGrants` and `formWhy` type the
    skill's name ("Visualization") instead of reading `SKILL`.
18. `descriptors.ts` `previewDescriptor` tests `run.state !== 'field'` for the AP it shows: the field's AP rule now
    lives in the reducer (`freshRound` / `freeAgain`) and here.

## The closed lists: every addition in the range

| Addition | Kind | Approved? |
| --- | --- | --- |
| `figment_order` | cost site (`effects/stats.ts`, `actions.json` costs) | yes (P4) |
| `door/pick` action and `doorpicks.ts` (`registerDoorPicks`, `pendingDoorPicks`, `takeDoorPick`, ...) | reducer action, exported primitive | yes (P8; no general pick machinery existed) |
| `growthHeld`, `harmHeld` | exported primitives (`effects/hooks.ts`) | yes (0.28.2) |
| `healthView`, `mendShown`, `setUseDoor`, `giveBackRuling` | exports | yes (0.28.2) |
| `fieldDoor` | exported primitive (`effects/hooks.ts`) | **no** |
| `fieldCombat`, `fieldRefusal`, `fieldActs` | exports (`game.ts`) | **no** |
| `bondGives` | export (`screenViews.ts`) | **no** |
| owned data verb `stim` | a behaviour outside the op list (`owned.ts`) | **no** |
| owned data verb `reach.tile` / `reach.beside` / `reach.side: ally`, verb `res`, data verb as `auto` | data-verb vocabulary (`owned.ts`) | **no** (not named in any brief) |
| `register('glimmer')` | per-item handler | **no** |
| `Character.doorPicks`, `doorKept`, `figRev`; `cb.fieldHarm`; `g.story.fieldLimits` | state fields | doorPicks/doorKept with P8; the rest not named |
| `reeled` | condition row (data) | data, no approval needed |

No trigger, predicate, op, hook, stat or resource was added (counts unchanged: 35, 86, 28, 125, 61, 15).

## Checked and clean

- Adjudication: every new row (`tend.snap`, `tend.tug`, `tend.last_thread`, `reeled`, the five forms, ten orders,
  Glimmer) is `engine`, and every trigger they use (`downed`, `taking`, `turn_end`, `acted`, `cost`) and predicate
  (`target_tied`, `by_hit`, `self_has_res`, `target_alive`) is in `docs/ENGINE-HOOKS.md`.
- `counted` is retired into `counts_into`; the validator refuses it; the stim and Essence ids are gone from code
  (`giveLoot`, `sbGive`, `carriedKg`, `loadoutView`).
- The Snap's Ledger blow (`ledger_blow`, base 0) rides the Mender's own Ledger rule (classes.json `ledger`
  `damage_mod`): no second copy of the Ledger.
- Every Figment verb row is offered by a form; every new form is on the ladder; the 18 perk ids' change of effect is
  ruled acceptable and not re-flagged.
- Golden and replay re-records are named in their commits (`3a82511c`, `d29785f6`, `6d5ce645`).
