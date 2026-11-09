# Faith 2.1 (rules 1.6.1): hand-off

Branch: `feature/faith-2.1` (from `develop`, 9 Nov 2026). **Not merged, not pushed, not deployed**: Leon and his Claude
do the final check and the merge (the merge bumps the version and writes the `CHANGELOG.md` entry). Design:
[`docs/design/faith-2.1-spec.md`](../faith-2.1-spec.md) (Leon's accepted direction); rules: spec "Patrons and prayer"
(rules 1.6.1) and section 14 items **701–718**; decision **107**. World Play 1.1 was built in parallel on another branch
and holds items 671–700 and decision 106.

Built in three parts, one commit each (plus the design spec):

| Part | Commit | What |
|---|---|---|
| Design | `28e22a5` | `docs/design/faith-2.1-spec.md` |
| B1, engine | `97f886c` | spec, data, validator, engine and its tests |
| B2, web | `763d4b8` | the screens, the fx, the Narrator's context, `--faith-light` in the app |
| B3, docs | this hand-off's commit | colour token in `palette.json`, art direction text, decision 107, the roadmap and hand-off notes |

## Why

Playtest: a character reached **Devotion 10 on the area map by turn 3**. The +2-a-fight tag cap lived on the fight
unit, which the area map rebuilds on every action, so every action outside a fight was a fresh +1; and the Narrator
could move Devotion ±2 levels per op. Faith 2.1 keeps the 0–10 standing and its gates, moves **Devotion XP** instead
of levels, and keeps the caps **on the character**.

## The rules, in one place (all provisional; item numbers in brackets)

- **Curve** (701): total XP for levels 0–10: 0, 10, 25, 45, 70, 102, 147, 200, 270, 350, 450. Faithful start at 45
  (Devotion 3). The design's 152/212/277/347/432 for levels 6–10 were tuned by the pace simulation (717).
- **Sources** (702): liked tag +1, vow kept +3, rite +4, bringing someone in +4, deed +2 to +5; taboo −3 (−6
  Witnessed), vow broken −5, failed overreach −3 (716), breaking character −6, Judgement −10 (706), Miracle all (707).
- **Tag caps** (703–704): each liked tag once a fight and once a scene; 2 XP a fight, 2 a scene, 6 a session; kept in
  `c.faithTally`, once per action keyed on the character.
- **The Narrator** (705): the devotion op moves −6 to +5 XP; gains capped at +10 a session per character.
- **Day counter** (709): `g.day` from 1; a long rest +1; the Narrator's optional turn field `days` (1–3650).
- **Apostasy** (710): XP 0, Atheist, pieces kept, no pact for 90 days (`c.faithLeft`).
- **Direct switch** (711–714): no cooldown; Open patrons roll d20 + Faith vs their leave TN (10–12), Jealous never let
  go; a grudge (`c.grudge`) puts the patron's condition on you at each fight's start and halves new XP gains for 1–3
  sessions; a farewell line either way. Each patron's `leave` block and `farewell` bank are in `data/patrons.json`.
- **Old saves** (715): faith revision 17; the saved level becomes its threshold XP; day 1. Stolen Fire restores the new
  fields (718).

## Where it lives

- **Data:** `data/patrons.json` `devotion` (xp.curve, gain, loss, tag_caps, narrator, apostasy.cooldown_days), each
  patron's `leave` and `farewell`; `data/classes.json` Judgement (−10, unit xp). `tools/validate.py` checks all of it
  and flags the retired keys if they come back.
- **Engine:** `packages/engine/src/character.ts` (the curve, `devotionXpOf`, `setDevotionXp`, `FAITH_REV` 17);
  `faith.ts` (`shiftDevotion` is the one writer of XP; `tallyOf` / `tagDevotion`; `narratorDevotion`; `makePact`,
  `leavePatron`, `apostasy`; `grudgeOf`, `pactCooldownLeft`; `migrateCharacterFaith`; `faithView`); `game.ts`
  (`g.day`, `advanceDays`, `NarratorTurn.days`, the migration in `apply()`); `effects/uses.ts` (`dayOf`);
  `classes/k.ts` (Judgement); `perks/d.ts` (Stolen Fire).
- **Web:** `apps/web/src/game/faithView.ts` (`devotionLabel`, `xpFill`, `xpNextText`), `fx/faith.ts` (XP, level,
  leave and grudge floats), `resources.ts`, `worldView.ts` (DAY N on the HERE card), `screens/faithTab.js`,
  `screens/faithCombat.js`, `templates/main.template.html`, `narrator/context.ts` (the FAITH block, the schema, `days`).
- **Colour:** `--faith-light` `#F2C46A` in `apps/web/index.html` (`:root`), `FAITH_GOLD` in `faithArt.ts`,
  `docs/design/colour-system.md` section 3, and `art/style-guide/palette.json` `ui.states.faith_light` (9.4:1 on the
  raised surface; `tools/validate_art.py` checks it). A web test keeps the three in step.
- **Art direction:** patrons are painted as a god appears to a human (an NPC): apparitions, effigies, masks, never the
  Celestial behind the costume; the delivered set is right. Written into `art/style-guide/PHC-Style-Guide.md`
  ("Patron apparition colour identities" and "Tool roles"), [`blessing-art-brief.md`](blessing-art-brief.md) ("The
  idea", Deliverable A) and `docs/design/blessing-2.0-spec.md` section 8, with notes in its sections 2, 7 and 11 that
  point here for Devotion XP and leaving.

## Tests

- Engine: `test/faith-xp.test.ts` (every row above, including the playtest farm: 20 area-map stims give exactly the
  scene cap, six scenes exactly the session cap), `test/faith-pace.test.ts` (a seeded 30-session simulation over 8
  seeds), `test/faith.test.ts` moved from levels to XP (rewritten, none removed), `rev3-review.test.ts` (Judgement −10).
- Web: `faithView.test.ts`, `fx/faith.test.ts`, `worldView.test.ts`, `faithArt.test.ts` (the gold in `index.html`,
  the templates and `palette.json`), `narrator/faith-context.test.ts`.
- e2e (B2, against a local dev server): `faith.mjs`, `faith-pg.mjs`, `two-players.mjs` all pass.
- Last run (B3, 9 Nov 2026): `npm test -w @phc/engine` 62 files, **1509 passed**, 1 skipped; `npm test -w @phc/web`
  47 files (1 skipped), **365 passed**, 2 skipped; `npm run typecheck` 0 errors; `python3 tools/validate.py data`
  0 errors, 0 warnings; `tools/validate_art.py` and `tools/validate_patrons.py` pass after the checksum rehash.

## Known gaps and notes

1. **For Leon: the Miracle's price.** A Miracle resets Devotion XP to 0; back to 7 takes 200 XP, about 10 sessions at
   the target pace (item 707).
2. **The Narrator's stable prompt** is at 24306 of its 24400 limit (`faith-context.test.ts`): 94 tokens left. The next
   rule added to the FAITH block will need something cut.
3. **The Proving Ground can't advance days** (the sandbox refuses Narrator turns, where `days` lives), and its tools
   ignore the pact cooldown by design.
4. **The HERE card shows the day only when the scene has objectives** (the card exists only then).
5. **Not written:** the Narrator's wiki (`packages/engine/src/glossary.ts`) has no Devotion XP or leave/grudge entry
   (the FAITH block covers what the Narrator needs); `CLAUDE.md`'s Blessings line still describes Devotion as levels
   and should gain "Devotion XP, leaving a patron (rules 1.6.1)" at the merge.
6. **Seen, not ours:** the Atheist's Whisper meta reads "TN 12" twice ("BY DICE · TN 12 · TN 12 · 75%"); the e2e step
   "Miracle clears within 2.5 s" measured 2755 ms against its 3200 ms margin.
