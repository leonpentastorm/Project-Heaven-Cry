# Survival, build step 6: the fight tally and Report a run (hand-off, 13 Nov 2026)

Spec: `docs/design/survival-spec.md` (draft 4) rule 35, section 4.2 item 5, section 8.2, section 10 row 6. Rules:
`docs/rules/PHC-Core-Rules-v1.0.md` **revision 1.47**, items **3400 to 3406** (all records, no new number). Branch: this
worktree's (`worktree-agent-a98e957c92d8cecfe`), from `claude/charming-gauss-hbq4n0` at 9d0c5e1b. No version bump; nothing
deployed. Not touched: the shop and safe-node screens (`RunScreen.tsx` gained one import pair and one line in the aside),
the fight maps.

## 1. What was built

| Piece | Where |
| --- | --- |
| The fight tally: `fightTally(tape, units, rounds)` (pure), `sumTallies`, `settleTape`, the tap on `fxTaps` that keeps a run's effects in `cb.tape` | `packages/engine/src/run/tally.ts` (new) |
| `cb.tape` set by `runFight`; the tally computed in `runFightOver` and kept on `RunFight.tally`; the tape cut down after every action (`settleTape`) and dropped when the tally is kept | `game.ts` (3 lines), `combat.ts` (the `Combat.tape` field), `run/state.ts` (`RunFight.tally`) |
| The reward screen's table; the summary's run and per-stage tables | `tallyView.ts`, `RunTally.tsx`, one line in `RunScreen.tsx`, a section in `StageScreen.tsx` |
| Report a run: `runReport` (pure), `runReportText`, `downloadRunReport` (a plain JSON file, same key scrub as Report a problem); the summary's button; Report a problem now carries the same as its `run` part | `runReport.ts` (new), `report.tsx` (2 lines), `StageScreen.tsx` |
| Tests | `packages/engine/test/survival-tally.test.ts` (5), `apps/web/src/game/runTally.test.ts` (4), `survival` browser suite: its own section (3 checks) |

## 2. Built from

| Rule | Primitive |
| --- | --- |
| Per-fight tally from what is emitted | the effects stream `emitFx` through `fxTaps` (spec 4.2 item 5 names `fightTally` on `fxTaps`); the balance simulator's reading (`test/balance/sim.ts`) as the model of what the events mean |
| Kept per fight, summed per stage and run | `RunFight` in `g.run.stats.fights` (step 3), `sumTallies` |
| The report | `report.tsx buildReport` (its `run` part), `scrub` from `debug.ts`, the engine's `relicRow`, `SETTING`, `CLASS`, `maxHp`, `playOf`, `MODES` |

**New primitives:** none beyond the tap and the optional `cb.tape` field (a log of the effects, not a counter). Nothing
was moved out of the balance simulator (it keeps its own measuring; its tap is untouched). `engine_catalog.py` regenerated
and `--check` clean; lint baselines unchanged (`npx vitest run test/lint`: 61 pass).

## 3. How it reads

An effect is emitted, and fields such as a shot's `dmg` are written on it afterwards (combat.ts `resolveAttack`), so the
tap keeps the effect itself and `settleTape` (end of every action, in `apply`) cuts it to the ten fields the tally reads.
A fight with no tape (campaign, story, sandbox) pays nothing. `runFightOver` computes the tally, so a lost fight is
tallied too (the summary covers it).

## 4. What could not be derived (STOPPED, not faked)

1. **Shields given.** `grantShield` (effects/damage.ts) emits the hook `shield_grant`, not an fx event; only
   `classes/i.ts` (Warden ward, with `gained`) and `classes/j.ts` (Adamantile plate, `absorbed: 0`, no amount) emit a
   `shield` effect on a grant. The tally has `absorbed` (damage a character's shield soaked, from `shield` events with
   `absorbed`) instead. **Missing event:** a `shield` effect `{unit: giver, target, gained: n}` from `grantShield` itself.
2. **Healing done is incomplete.** `healUnit` has 14 callers and 7 emit a `heal` effect (two prayers, the thread,
   repair, Sweep, a spell's heal). The perk `mend` op (`effects/core.ts`, `healKind: 'perk'`) and other `healUnit`
   callers emit none, so their healing is not in `healed`. **Missing event:** a `heal` effect from `healUnit`
   `{unit: healer, target, amount}`.
3. **No source on `hurt` and `heal`.** They are credited to the unit whose `turn` effect is open. A reaction that is not
   a `shot` or a bleed on a foe's turn lands in `other`; a squad member's overwatch shot is right (a `shot` names its
   unit). **Missing field:** `by` on `hurt` and `heal`.
4. **Damage by system** (spec item 35: weapon, Sigil, Outburst, prayer, Figment, Bond, Shadow, other) is not in the
   tally: `hurt` carries a free-text `why`, not a system. Spec item 35 also asked for foes' tier, budget asked and spent
   per fight (those are in the report, from `RunFight`, step 3's) and "per unit damage dealt and taken by system": only
   the totals are built. **Missing field:** a `system` on `hurt` / `shot` effects.
5. **Builds at the start.** The report has each character's build at the end of the run. The start sheets (level 1) are
   not kept in `g.run`; a snapshot at `run/start` would be new state, so it is left (the spec's "builds at start and
   end" is half built).
6. **Gives between players** (spec item 35) are not logged by the run; not built.
7. A kill is credited to the last character to damage the foe; a foe killed by a bleed or a trap with no earlier hit
   from the squad credits no one (the kill is in the stage's foes dropped, not in a row).

## 5. Open items

- Run the damage-by-system and shield-given gaps above as one engine change (a `by` and a `system` on the three effects
  and the missing `shield`/`heal` emits) if Leon wants the full item 35 table; the tally's function would read them with no
  other change.
- `survival-run.test.ts`'s replay guard is unchanged and green; the tape rides in the run's fights only.
- The e2e suite was run alone on its own port (8995), every check `ok`.

## 6. Calls made for Leon

1. The Report a run file is plain `.json` (the problem report is a zip), so it can be saved and pasted as the brief says.
2. A character's Downs and deaths show as one column ("Downs") on screen; the data keeps both.
