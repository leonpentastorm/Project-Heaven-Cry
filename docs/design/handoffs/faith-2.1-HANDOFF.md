# Faith 2.1 (rules 1.6.1): hand-off

Branch: `feature/faith-2.1` (from `develop`, 9 Nov 2026). **Not merged, not pushed, not deployed**: Leon and his Claude
do the final check and the merge (the merge bumps the version and writes the `CHANGELOG.md` entry). Design:
[`docs/design/faith-2.1-spec.md`](../faith-2.1-spec.md) (Leon's accepted direction); rules: spec "Patrons and prayer"
(rules 1.6.1) and section 14 items **701–723**; decision **107**. **Miracle 2.1** (rules 1.6.2, items **724–737**,
Leon's ruling of 9 Nov 2026) is built on the same branch: see its section below. World Play 1.1 was built in parallel on another branch
and holds items 671–700 and decision 106.

Built in three parts, one commit each (plus the design spec):

| Part | Commit | What |
|---|---|---|
| Design | `28e22a5` | `docs/design/faith-2.1-spec.md` |
| B1, engine | `97f886c` | spec, data, validator, engine and its tests |
| B2, web | `763d4b8` | the screens, the fx, the Narrator's context, `--faith-light` in the app |
| B3, docs | `c6671c3` | colour token in `palette.json`, art direction text, decision 107, the roadmap and hand-off notes |
| Review fixes | `422d132` | items 719–723, the rite texts, the session boundary; see "Review fixes" below |
| Miracle 2.1 | 0bb4d30, 710e6d0; review fixes: the next commit on this branch | items 724–737: the Miracle at Devotion 10, −5 levels, eight stronger Miracles; see "Miracle 2.1" below |

## Why

Playtest: a character reached **Devotion 10 on the area map by turn 3**. The +2-a-fight tag cap lived on the fight
unit, which the area map rebuilds on every action, so every action outside a fight was a fresh +1; and the Narrator
could move Devotion ±2 levels per op. Faith 2.1 keeps the 0–10 standing and its gates, moves **Devotion XP** instead
of levels, and keeps the caps **on the character**.

## The rules, in one place (all provisional; item numbers in brackets)

- **Curve** (701): total XP for levels 0–10: 0, 10, 25, 45, 70, 102, 147, 200, 270, 350, 450. Faithful start at 45
  (Devotion 3). The design's 152/212/277/347/432 for levels 6–10 were tuned by the pace simulation (717).
- **Sources** (702): liked tag +1, vow kept +3, rite +4, bringing someone in +4, deed +2 to +5; taboo −3 (−6
  Witnessed), vow broken −5, failed overreach −3 (716), breaking character −6, Judgement −10 (706), Miracle 5 levels
  (725; it was all of it, 707).
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

1. ~~**For Leon: the Miracle's price.** A Miracle resets Devotion XP to 0; back to 7 takes 200 XP, about 10 sessions at
   the target pace (item 707).~~ **Decided** (Leon, 9 Nov 2026) and built: Miracle 2.1 below.
2. **The Narrator's stable prompt** is at 24328 of its 24400 limit (`faith-context.test.ts`; Miracle 2.1 added 22): 72
   tokens left. The next rule added to the FAITH block will need something cut.
3. **The Proving Ground can't advance days** (the sandbox refuses Narrator turns, where `days` lives), and its tools
   ignore the pact cooldown by design.
4. ~~The HERE card shows the day only when the scene has objectives.~~ Fixed in the review: the card shows whenever the
   zone is known.
5. **Not written:** the Narrator's wiki (`packages/engine/src/glossary.ts`) has no Devotion XP or leave/grudge entry
   (the FAITH block covers what the Narrator needs); `CLAUDE.md`'s Blessings line still describes Devotion as levels
   and should gain "Devotion XP, leaving a patron (rules 1.6.1)" at the merge; its "Miracle at Faith 7 + Devotion 7,
   once a session, spends it all" should become "Miracle at Faith 7 + Devotion 10, once a session, lowers Devotion by
   5 levels (rules 1.6.2)" in the same merge commit (CLAUDE.md is the merger's to edit).
6. **Seen, not ours:** the Atheist's Whisper meta reads "TN 12" twice ("BY DICE · TN 12 · TN 12 · 75%"); the e2e step
   "Miracle clears within 2.5 s" measured 2755 ms against its 3200 ms margin.

## Review fixes (9 Nov 2026)

A review of B1–B3 (spec conformance, engine correctness, the screens end to end) found these; each is fixed with a test.

- **Rite texts** said "+1 Devotion" (all 8 engine rites): now "+4 Devotion XP". `tools/validate.py` flags any faith text
  that gives Devotion in levels, the retired `prayer.overreach.miss_devotion` and `rules.json` `mana.prayer.devotion`
  (that old level-based block is now a pointer to `patrons.json`), and holds Open grudges to 1 session and Jealous ones
  to 2–3. Spec items 602 and 605 carry rules 1.6.1 notes.
- **A switch never raises Devotion** (item 719): the new pact starts at the lower of the XP held and the conversion's,
  so two pacts can't undo a Miracle's reset (or a taboo, or Judgement). The pact's fx gives the real change (delta from
  the old XP, `was` the old level, `level` only when it changed, `pact` the patron); the web floats "PACT · <patron>"
  and the XP only when it moved, with no level-up glow on a fall.
- **Apostasy ends a grudge** (item 720).
- **Next session** (item 721, `session/next`; Rest… → Next session, host only, in the story): rooms had no session
  boundary (`session/start` ran only from the lobby), so grudges never ended and the session caps lasted the room's life.
  It reuses the session start (`beginSession` in `game.ts`): recovery, Echo 1, `session_start`; not a day.
- **The Proving Ground's tag caps** (item 722): no session cap there (it has no sessions); the faith tab now shows the
  caps ("LIKED TAGS · 1/2 THIS FIGHT · 4/6 THIS SESSION", CAPPED once reached) from `faithView().tagXp`.
- **A grudge's condition** (item 723): its rounds count the bearer's own turns whatever the initiative (it no longer gets a
  fresh mark when the character acts first), and it ends with the fight (Mother Ember's Shaken was carried into the
  story as a scene's Shaken and then into every later fight). A story condition carried in merges with it.
- **A turn's days and rest come before its faith ops** (item 709 changed): "months later she swears" is one turn.
- **One Devotion XP format** (`devotionWords` in `character.ts`): the log lines, the meter, the turn card and the
  Proving Ground drawer all read "Devotion 3 · 4/25 XP".
- **The HERE card** shows "DAY N" whenever the zone is known, objectives or not.
- **Floats** near a map edge shift inward (`clampCentre` in `fx/dom.ts`); the grudge float sits above the condition's.
- Not changed, by reading: a grudge lasts the rest of its session plus its `sessions` (item 713 already said so; the
  design doc now says it too). Leon may prefer `sessions` to include the current one: `until = sessionN + sessions − 1`.

e2e note: `lib.mjs` routes the browser through `HTTPS_PROXY` whenever `BASE` is set; on a machine with an agent proxy a
local server needs a loopback bypass (a `--require` preload that adds `bypass: '127.0.0.1,localhost'` to the launch
proxy), or the title screen never loads.

Last run (review fixes, 9 Nov 2026): engine 63 files, **1521 passed**, 1 skipped (new: `test/faith-review.test.ts`, 12
tests); web 47 files (1 skipped), **368 passed**, 2 skipped; `npm run typecheck` clean; `validate.py` 0 errors, 0
warnings; e2e `faith.mjs` (38 ok), `faith-pg.mjs` (36 ok) and `two-players.mjs` pass with no page errors.

## Miracle 2.1 (rules 1.6.2, 9 Nov 2026)

Leon's ruling: "Buff all miracles to deserve the title, miracle only at 10 and it reduces your devotion by 5." Design:
[`faith-2.1-spec.md`](../faith-2.1-spec.md) section 7; spec "Patrons and prayer" (the revision note, the gates, the
patron table) and section 14 items **724–737** (707, 614, 617 and 621 struck through with pointers; notes on 97, 702,
717 and 719); decision 107 (a Miracle 2.1 bullet).

- **Gate** (724): Faith 7 and Devotion 10; Hymn III alone at 7. `devotion.gates.miracle` = `prayer.miracle.devotion_min`
  = 10; `tools/validate.py` checks they agree and sit above Hymn III.
- **Price** (725): −5 levels after the effect (`miracleCost` in `faith.ts`: XP to the threshold of the level 5 below;
  450 → 102). `prayer.miracle.devotion_cost_levels` 5; the validator refuses the retired `spends`. The story path now
  pays it after the effect too (it paid before).
- **Pace** (726; `faith-pace.test.ts`, 80 sessions × 12 seeds): first Miracle at session 22.6 (21–25), then every 19.3
  sessions (17–22).
- **The eight Miracles** (727–734) in `runEntry` (`faith.ts`), each with a test in `test/miracle-2.1.test.ts`:
  Verdict (100/200 Soul, Stunned 1/2), Requisition (`restock`: mags, loose, throwables, Supplies, 2 cores, repair, jams
  and heat; +3 AP banked), Encore (`encoreKey` kept on `u.faith.lastKey`; `encoreBefore`/`encoreAfter` in the reducer
  lend and settle the AP; Confused), Turned Back (half HP), Everyone Home (`cleanseHarmful`, full HP, 40 shield), The
  Sky Answers (5×5, enemies only, 150 Storm, Stunned, Shaken), Love Conquers (`canYield`; Commanded with the order
  hold for bosses), Rewoven (`faithRoundHp` kept at the fight's and each round's start). Numbers × Blessing power;
  item 97's old ×3 is not applied (item 727).
- **The story** (735): `storyEffect` applies Everyone Home and most of Requisition (`storyRestock`); the rest is a
  pending ruling.
- **Data:** `data/patrons.json` miracle texts and effects; `data/effect_ops.json` gains the bespoke ops `repair_gear`,
  `clear_jam` and `rewind_hp` (and the Miracles as users of `free_action`, `cleanse`, `damage_mult`).
- **Web:** the meter marks HYMN III at 7 and MIRACLE at 10; the faith tab's heading "✦ MIRACLE · AT DEVOTION 10 · ONCE
  A SESSION · COSTS 5 LEVELS"; the button's gate "FAITH 7 · DEVOTION 10" and its price; the combat prayer card says the
  price; the resource row's next gate; the Proving Ground's "Miracle · 10" preset (`data-sb-faith-miracle`, replacing
  the bare "10"); the Narrator's FAITH block names the gate and the price, and `wiki_lookup patron:<id>` gives the
  Miracle's text.
- **Review fixes (item 737):** Encore survives an ally's end-turn and is offered in the previews ("FREE · ENCORE");
  a Miracle that would find nobody is refused, not spent; Turned Back skips companions; two Rewovens don't double;
  the log shows the Miracle before its price; liked tags at 450 XP use no tag caps; the pace reads "about every 19
  sessions (17–22)".
- **For Leon:** (a) the brief expected a Miracle about every 17–19 sessions; the run gives 19.3, because the Miracle
  comes in the first fight after 10 is reached, and the spec now says "about every 19 (17–22)"; (b) Love Conquers treats machines and no_surrender enemies like bosses
  (a Heart save or Commanded to hold), since the surrender rules say they never yield; (c) Encore's "free" repeat is
  the same action type and kind on any target, until the end of the ally's next turn.

Last run (Miracle 2.1 review fixes, item 737, 9 Nov 2026): engine 64 files, **1550 passed**, 1 skipped
(`test/miracle-2.1.test.ts` now 27 tests, the review ones driven through `combat/end-turn`); web 47 files (1 skipped),
**368 passed**, 2 skipped; `npm run typecheck` clean; `validate.py` 0 errors, 0 warnings; e2e `faith.mjs` (39 ok) and
`faith-pg.mjs` (42 ok, new: Encore offered "FREE · ENCORE" with 1 AP left and the repeat run free) pass with no page
errors.

