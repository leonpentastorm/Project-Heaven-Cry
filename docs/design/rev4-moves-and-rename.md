# Revision 4: the moves that change hands, the four kept classes, the rename, and the build order (spec, 13 Nov 2026)

The rest of Class Roster Revision 4 that `reactions-spec.md`, `chaplain-spec.md` and the Shadow, Bonds and Figments
specs (which price Salvage, Overclock, Jury-Rig, Take the Weight) do not carry. **Nothing is built.** All PROVISIONAL.

## 1. The four classes that keep their mechanic

| Class (id) | Change | Number | Data change | Ceiling check | Adj. |
| --- | --- | --- | --- | --- | --- |
| **Bulwark** (`defender`) | a fight starts with 1 Guard | 1 (`numbers.start_guard`) | class `effects`: `{op: resource, when: combat_start, resource: guard, value: 1}` | 1 Guard soaks 10 once: 0.54 / 0.41 / 0.29 / 0.17 of a Soldier-turn at levels 1 / 5 / 10 / 20; the Tank sits under melee's 165 (77 / 52 / 74 / 121): no row moves past it | engine |
| **Breaker** (`fighter`) | the first hit each turn on a Shaken or Frightened (`fear`) enemy gives +1 Momentum | 1, once a turn | `{op: resource, when: hit, resource: momentum, value: 1, if: {own_turn: true, hostile: true, target_has: [shaken, fear]}, limit: {per: per_turn, n: 1}}` | one more Strike's Momentum on turns the condition is up (Intimidation's Threaten, Lingering Dread): about +5% on a fight; melee all in reads 156 / 149 / 131 / **176** against 165: level 20 is already 7% over, so **measure level 20** before and after | engine |
| Breaker | Riposte on the one reaction | 1 Momentum, the reaction | the class move `fighter.riposte` becomes riders on the technique Answer (`reactions-spec.md` section 6) | removes a second Riposte door: lowers, never raises | engine |
| **Sigilist** (`mage`) | BLIND, SLOW, MUDDLE back to the common word list | MUDDLE's −1 charge goes | delete the Trickster's `trickster.blind_and_slow` from the move pool and its rank II slot; nothing else: the three words have no gate today (grep: no class check on `subject_affliction` in `sigilgrowth.ts` or `character.ts`), anyone learns them by study | a door user pays MUDDLE's 2 charge: down | engine |
| **Channeler** (`channeler`) | unchanged | | none | as measured (outburst rows) | engine |

The Breaker's Momentum cap of 5 (`techniques.json rules.momentum.fighter_max`) and the Bulwark's Guard 5 are built.

## 2. The moves that change hands (Revision 4 section 5)

| Move | From (rank) | To (rank) | Change in data | Number | Ceiling |
| --- | --- | --- | --- | --- | --- |
| Called Shot (`gunslinger.called_shot`, 3 AP) | Marksman III | Operative III | the ref moves; a rider `{op: roll_mod, when: attack, value: 2, if: {mode: [called_shot], target_sees_self: false}}` cancels the −2 while the target can't see you | −2, or 0 unseen | an injury without a crit: as built; the unseen +2 is Shadow's, priced in its spec |
| Field Fix (2 AP, repair 20) | Infiltrator II | Rigger I | the ref moves | as built | as built |
| Sabotage (2 AP, 2 rounds) | Infiltrator III | Operative II | the ref moves down a rank | as built | control: a denied machine turn, ×2 rounds, never twice running (contract section 5) |
| Read (Analyze 1 AP + the next action) | Trickster I | the Operative's "better" | becomes class `effects` (`cost_mod` on `analyze`) | 1 AP | Shadow spec |
| False Image (a Sigil charge) | Trickster I | the Rigger's Double (a Figment) | Figments spec | | Figments spec |
| Blind and Slow | Trickster II | the common word list | section 1 | | |
| Rewrite | Trickster III | the move pool (`status: "shelved"`, `future_home`: Mirage or Hexer) | stays in `move_pool`, out of the ranks | | |
| Stim Throw (`medic.stim_throw`) | Bard II | a gear action anyone has | a row in `data/actions.json` (`throw_stim`, its AP in `costs`), the `medic` text's "for a Bard" goes | the stim's own heal | healer row unchanged |
| Will Shield, Sanctuary | Guardian | the Chaplain's Ward and Sanctuary | `chaplain-spec.md` | 7 × BP; cap | `chaplain-spec.md` |
| Silver Tongue, Command | Trickster II, Guardian I | out (the Calls: Charisma's, Authority's Order) | `status: "retired"` in the move pool | | |
| The healing multiplier | Camaraderie | Empathy | **already done:** `rules.json output.pairs.healing` reads `insight` and `empathy` | | |

## 3. The rename

**Ids stay** (`data/classes.json` `base[].id`); only `name` changes. Hits of the old name as a whole word, by place
(`grep -rhow`, 13 Nov 2026; `docs/design` excludes `handoffs/`):

| Id | Old | New | data | web src | engine src | engine test | e2e | spec | docs/design | handoffs | CLAUDE.md |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `defender` | Defender | Bulwark | 4 | 14 | 28 | 25 | 2 | 38 | 46 | 84 | 1 |
| `fighter` | Fighter | Breaker | 3 | 13 | 3 | 20 | 13 | 12 | 40 | 66 | 1 |
| `marksman` | Marksman | Skirmisher | 2 | 16 | 2 | 10 | 2 | 10 | 38 | 105 | 1 |
| `infiltrator` | Infiltrator | Operative | 4 | 9 | 3 | 3 | 9 | 5 | 23 | 4 | 1 |
| `mage` | Mage | Sigilist | 6 | 8 | 8 | 15 | 10 | 19 | 36 | 47 | 1 |
| `trickster` | Trickster | Rigger | 5 | 9 | 9 | 6 | 2 | 9 | 38 | 14 | 1 |
| `bard` | Bard | Mender | 4 | 14 | 9 | 34 | 2 | 39 | 42 | 59 | 2 |
| `channeler` | Channeler | Channeler | (no change) | | | | | | | | |
| `guardian` | Guardian | Chaplain | 2 | 6 | 3 | 16 | 2 | 21 | 28 | 96 | 1 |

**What to change:** the `name` in `classes.json` (the base list and the Revision 2 name block at lines 2614 to 2744);
every player-facing text in data that names a class (`actions.json` the stim's "for a Bard"; `items.json` "What a Bard
treats injuries with"; `patrons.json` the `trick` tag's "a Trickster move"; `effect_ops.json` summaries; `rules.json`
balance notes; "Circuit Mage" is an advanced class's own name and stays); engine strings shown to players (`glossary.ts`
"a Fighter: 5", `effects/stats.ts` "Defender's Prey Lock", the `brief` lines in `classes/i.ts` and `classes/rev3.ts`);
web tests that assert a name (`classView.test.ts`, `levelup-screen.test.ts`, `sandbox.test.ts`, `resources.test.ts`,
`combat-actions.test.ts`) read the name from data instead of a literal; the e2e suites `classes.mjs`,
`classes-moves.mjs` likewise; the spec, CLAUDE.md, `docs/ROADMAP.md`, the live design docs. **Do not change:** hand-offs,
`_archive/`, the measured records (`balance-sim-*.json`/`.md`), code comments that name a Revision 3 origin (`origin:
"marksman"`): they are history. A tool, not hands: `tools/rename_classes.py` (new, throwaway) reads the id → name map
from `classes.json` and lists each hit with its file and line for review; it changes nothing by itself.

**Emblems** (`apps/web/src/game/classIcons.ts`, code-drawn, keyed by id): Bulwark, Breaker, Skirmisher, Sigilist,
Channeler and the Operative (an eye over a lockpick) fit; **three are redrawn** in that file (Claude draws line icons):
Rigger (the mask → a wrench crossed with a spark), Mender (the lyre → two hands around a plus), Chaplain (the dome → a
dome under a flame); re-export `class-icons-sheet.png`. Nothing for `ART-REQUESTS.md`.

**Saves:** nothing migrates. A save holds `classId` and `classRev` (`character.ts`); names come from data (`className`,
`classView.ts`), moves from the ranks. `migrateCharacterClass` acts only when `CLASS_REV` (3) changes: **leave it at 3**.

**Archetypes:** 0 of the 46 presets name a class (`data/archetypes.json`, grep). The nine families (Frontline, Guns and
hunters, Shadows, Sigil casters, Minds, Soul and faith, Voices and leaders, Hybrids, All-in) are playstyles, not classes:
**they stay.** **Shelved advanced classes:** their `parents` are ids (unchanged); `classIcons.ts` `FIRST_PARENT` and
`BASE_CORE` are ids; only texts naming a parent (`future_home`, the roadmap's prose) take the new names.

## 4. The order of building (one patch, built in steps, each measured before the next)

Every step closes with: `npm run check` green; **`lint-item-ops`, `lint-costs`, `lint-conditions`, `lint-foundations`
pass with their baselines not grown** (`lint-item-ops.baseline.json` only shrinks); the golden tables re-recorded only
where the step meant to move them, named in the commit.

| Step | What | The test that closes it |
| --- | --- | --- |
| 0 | Pin: record the costs, rules, item-ops, conditions and damage golden tables and the replay hashes on the old code | `GOLDEN_RECORD=1` on the old commit |
| 1 | **The rename** (names only, no rule) | validator `0 errors`; web tests reading names from data; e2e `classes`, `classes-moves`, `sandbox`; no golden table moves |
| 2 | **The reaction rule** (`react()` door, the `uses` key, rules 2 and 3, the Riposte fold, Killzone's two) | `reactions-once-a-round.test.ts` extended (one Riposte a round in a fight and on the area map; two with Cue; no Parry of a Riposte; Killzone takes both); `golden-costs` marks and `golden-rules` re-recorded on purpose; replay re-recorded; e2e `physical`, `combat-fixes`, `two-players` |
| 3 | **The four kept classes** (section 1) **and the moves that change hands** (section 2) | `golden-itemops` new situations (start Guard, Breaker Momentum on a Shaken hit); `classes-rev3-moves.test.ts` updated; `balance-contract.test.ts` (melee at level 20) |
| 4 | **The Chaplain** (`chaplain-spec.md`) | `faith-measure` rows `chaplain_turn` within ±12% of 125; `heal-measure` Ward and Sanctuary under 250; `balance-contract` `SYS` gains `chaplain_turn`; e2e `faith`, `faith-pg`, `cutins` |
| 5 | **The Skirmisher** (Reflex, Run and Gun) | `defence-measure` pairs under fire; the Reflex row within +15 to +20% of the door; e2e `physical`, `reload`, `turn-order` |
| 6 | **Shadow** (the Operative) | its spec's measurement; `fog-view.test.ts` |
| 7 | **Bonds and tending** (the Mender) | its spec; `heal-measure` against 200 |
| 8 | **Figments** (the Rigger), the largest | its spec; the control yardstick |
| 9 | The whole: `npm run balance`, `REPLAY_FULL=1`, e2e `smoke`, `rules`, `anim` | the version bump (0.25.0) and `CHANGELOG.md` in the merge |

**Playtest checklist entries** (for `docs/PLAYTEST-CHECKLIST.md`, added in step 9):
1. Three melee misses on a Breaker in one enemy turn: one Riposte (also on the area map). 2. A Skirmisher on Overwatch is
shot at: Duck and Roll fires and the Overwatch still fires. 3. Killzone with one reaction left fires once. 4. Run and Gun:
shoot, slip 2 tiles past a reach (no opportunity attack), shoot (+1 Pressure). 5. A third Ward ends the first. 6. Smite
on a kill is kept for the next hit. 7. A Witnessed Chaplain's first intervention keeps the figure. 8. Sanctuary stops at
its cap against a Boss. 9. A Bulwark starts with 1 Guard; a Breaker gains Momentum on a Shaken enemy, once a turn.
10. New names everywhere; an old save loads with its class.

**Built from:** section 1 is item ops of the closed lists (`resource`, `roll_mod`; `when` `combat_start`, `hit`, `attack`;
`if` `target_has`, `own_turn`, `hostile`, `target_sees_self`; `limit per_turn`), costs in `actions.json costs` through
`effects/cost.ts`, names in data. **Needs a new primitive:** none beyond `chaplain-spec.md` and `reactions-spec.md`.

## 5. Open questions for Leon

1. **Leave `CLASS_REV` at 3** (no migration note). Assumed.
2. **Three emblems redrawn** (Rigger, Mender, Chaplain), the rest kept. Assumed.
3. **The archetype families stay** as playstyles. Assumed.
4. **The rename goes first** in the build, so every new text is written with the new names. Assumed.
5. **The Breaker at level 20** is already 7% over melee's ceiling; its new Momentum gain is measured there before it ships. Assumed.
