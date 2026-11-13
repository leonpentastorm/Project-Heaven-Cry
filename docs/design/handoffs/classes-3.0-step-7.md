# Classes 3.0, step 7: Tending, Bonds and the Mender (hand-off)

Built 13 Nov 2026 on the worktree branch `worktree-agent-ab6c4efb0b594722e`, started from `claude/charming-gauss-hbq4n0`
(`919593e`). Not pushed; no version bump. Spec: `docs/design/bonds-spec.md` (its "Settled by Leon" notes override its
body) and Leon's rulings in the brief (the echo is **0.20**; the to-hit bonus rides every roll to hit). Rules revision
**1.33** in `docs/rules/PHC-Core-Rules-v1.0.md` (before "Maps"), section 14 items **2000 to 2041**, all PROVISIONAL.

## 1. What was built

| Part | Where | How (the primitive) |
| --- | --- | --- |
| A focus is data | `items.json` `focus: {door, hand, fuel}` on the Evoker, Emanator and the new **Attuner**; `character.ts` `FOCUS_IDS` (an item whose `focus.door` is a kind's door counts as it), `FOCUS_DOOR`, `kindOfDoor`, `hasAttuner`, `hasMpFocus`, `carriesMpFocus`; `self_holds {slot, door}` takes `attuner` or `empathy` | `holds` (one test) |
| MP lives in any MP focus | `mpNow`, `magicOf` (`mg.attuner` only when held), `magicToCharacter`, rests (`game.ts`); `actions.json resources.mp.needs` is a list `["mg.emanator", "mg.attuner"]` (`effects/cost.ts resGive`) | the resource row |
| The tie kind `bond` | `rules.json ties.kinds`: `max 0` (the cap is the stat `ties_max:bond`), `mark: bonded`, `gear: {door: empathy}`, `ends_on` with `{word, side: foe}` | P8 + three general fields (section 4) |
| The door's passives | `tending.json tend.threads` (a passive verb, Empathy 1): share (`redirect` split, `type: soul`), to-hit (`roll_mod` on `to_hit`), echo (`deal` on `heal_given`, `delay` target_turn_start, two effects: self / Bonded ally), per Bond (`damage_mult` on `dealing`, `ties:bond`), through (`mend_mult` on `heal` and `shield`, kind `tending`), felt Down (`resource mp` on `downed`), Traced renewal (`condition` on `turn_start` with `self_tied {kind, side: foe}`), the Elite / Boss save (`roll_mod` on `cond_incoming`), a Boss Bond's three turns (`cond_rounds` max 3) | item ops only |
| The ladder | passive verbs `tend.bonds_5`, `tend.bonds_8`, `tend.hold_down` (stat `ties_keep:bond`, Empathy 10), `tend.mender_bonds` (class bard); number blocks with `steps` for Bond's reach (6, 9 from Empathy 6), Mend / Touch / Shield's MP (−2 from Empathy 9), Soothe's count (2 from 7), Guide's tiles (3 from 7) | P6 verbs, P3 + `steps` |
| The verbs | `tending.json`: Bond, Let Go, Mend, Mend Yourself (once a turn), Touch, Settle, Soothe (newest first), Shield, Raise, Guide, Bond (free) for the Mender, Field Surgery | P6 `verb` items: `requires`, `grant_action` (`ap`, `res`, `if.self_holds`, `reach` with `beyond: bond`), nested item ops |
| Share a Hit | `skills.json camaraderie.unlocks.1` (an item): `redirect` on `taking`, share `{base 0.25, per skill:camaraderie 0.05, max 0.5}`, `limit {reaction: 1, kind: protect}`; adjacent, or a Bonded ally in sight from Camaraderie 5 | P1, P5 |
| Stim Throw | a basic action (`actions.json stim_throw`, 1 AP, range 4, an ally you see): `combat.ts useStim(…, {thrown})`, `game.ts combat/stim {thrown}`, `actions.ts` row, `descriptors.ts` row and pick | the basic-action route |
| The Mender (`bard`) | `classes.json`: ranks I Triage (`medic.triage`) + the Ledger (`bard.ledger`), II Inspire (`bard.inspire`) + Take the Weight (`bard.take_the_weight`), III Brimming (`bard.mend`) + Rally (`bard.rally`); `resources: ["mp", "ledger"]`; Supplies gone; Stim Throw and Field Surgery left the move pool | grant_actions whose ops are `when: acted`; the Ledger a class resource (`character.ts RES_RULES.ledger`, its cap from the move's own `amounts.cap`) and a resource row |
| Given feelings | `feelings.json` `given` and `given_foe` on all 25; `conditions.json` rows `given_<id>` (25), `foe_<id>` (15), `given_edge`, `given_mark`, `bonded`, `traced`, `settled` (written by `tools/once/tending_data.py`) | P4 rows that run item ops; Inspire's `pick: felt`, `condition: "given_{choice}"` |
| Empathy's free Pump and swell | `soul_modules.json cycle.free_pumps[].will_power`, `swell_no_strain.will_power`; `character.ts freePumps`, `swellFree` read Will Power; `magic.ts` only the log word | data + two readers |
| Retired handlers | `classes/i.ts`: `medic.triage` (kept only its story half, `dataActions`), `medic.stim_throw`, `medic.field_surgery` (re-keyed `verb:tend.field_surgery`: the story half), `bard.inspire` (both), `bard.mend`; `classes/rev3.ts bard.rally` | lint baseline lowered |

**The data's generator.** `tools/once/tending_data.py` writes every row this step owns (re-run it after an edit to it;
it is idempotent). Validator rules added (`tools/validate.py`): skill / limit / tie-side predicate args, number-block
`steps`, `{choice}` condition ids (must name a row for some feeling), op `by`, `displace.to`, `redirect.type`, reach
`beyond` and number-block `tiles`, grant `res` number blocks and `scope`, tie-kind `mark` / `gear` / side ends, the MP
row's `needs` list, verbs with no grant (passives) and their nested ops checked as `acted` effects, the new rows' reads
(`COND_READS`).

## 2. New general primitives (each one row or field; first user named)

1. **Focus by door** (`items.json focus`, `HoldSpec.door` a kind or a skill): the Attuner.
2. **Predicates** `self_skill` / `self_skill_below` (a ladder), `self_tied` ({kind, side}), `self_tie_room`,
   `target_not_tied` / `actor_not_tied`, `choice` (the action's pick), `uses_left` (a limit read before paying:
   Triage's once an ally a turn).
3. **P3 source** `skill:<id>`; **number-block `steps`** `[{of, at, value}]`.
4. **P8**: a kind's `mark` (a condition borne while tied; ends together), `gear` (a focus the near end carries), `ends_on`
   `{word, side}`, stat family `ties_keep:<kind>`.
5. **Ops**: `condition` and `deal` take `by: "source"` (a condition row acts as its giver; a sourced deal fires no
   `damage_out`); `condition` ids may hold `{choice}`; `cleanse.newest`; `redirect.type`; `displace.to: "tile"` (how
   `guide`, a new `forced_movement` row); NUM_FIELDS gains `share`, `count`; a limit key may hold `{choice}`.
6. **Targets** `beyond` (a tie kind: tied units are in the set wherever they stand); **reach** `beyond` (at any range the
   holder itself sees) and number-block `tiles`.
7. **Actions**: pick `felt`; grant `scope` and `site` (Triage priced at `triage`, so Field Medic's `ap_cost:triage`
   still reaches it); `acted` carries `choice`; a grant whose nested effects are all `when: acted` writes no Narrator
   note; a handler's `dataActions: true` keeps the data's actions beside its own; a passive verb (no grant) is not bound
   (it answers stats); a verb's / relic's named amounts are found (`amountHome`).

## 3. Numbers (all PROVISIONAL; `tending.json bond`)

make_range 6 (9 from Empathy 6); through ×1.2; down_mp 10; share 0.20; hit +3; **echo 0.20** (Leon); per_bond 0.10;
save_elite +2; save_boss +5; boss_rounds 3; boss_gap 4 rounds. Profile `tend` k 1.573, attr 0.06, skill 0.06, level
mend, floor 0.5. Mend 3.75 (2 AP, 8 MP), Touch 4.3 (2 AP, 8 MP), Settle (1 AP, 5 MP, +2 saves 1 round), Soothe (1 AP, 6
MP), Shield 4.5 (2 AP, 10 MP), Raise 1.9 (1 AP, 12 MP), Guide (1 AP, 5 MP, 2 / 3 tiles), Field Surgery 15 MP. Triage
4.3 (2 AP, 6 MP; ×3 out of a fight), the Ledger cap 15.5 × the tend Stat × level, factor 0.7, Inspire 1 AP 10 MP (Love
1.9), Take the Weight 15% max HP above 25%, Brimming half the overheal, Rally 3.1 (2 AP, 20 MP). Share a Hit 25% + 5% a
point of Camaraderie, at most 50%. Stim Throw 1 AP, range 4.

## 4. The measurement (`TEND_MEASURE=1 TEND_N=6 test/balance/tending-measure.test.ts`)

The spec's sheet (Insight = Empathy 7 / 8 / 10 / 10, Dexterity 1 / 1 / 2 / 4, service pistol, Attuner). Heals in
Soldier-turns × 100 (`soldierTurnAt`), offence in percent of the normal-share rifle-turn (`yardOf`, simulated); the
offence rows are the engine's own preview (chance × damage after armour × shots), not whole fights.

| Line | L1 | L5 | L10 | L20 | Mean | Ceiling |
| --- | --- | --- | --- | --- | --- | --- |
| heal: Mender all in (Triage + 2 Mends, all Bonded) | 205 | 183 | 173 | 138 | **175** | 200 (−12%) |
| heal: door all in (3 Mends, Bonded) | 184 | 174 | 167 | 130 | **164** | 174 (−6%) |
| heal: door normal (4 / 4) | 135 | 116 | 94 | 80 | 106 | 139 |
| offence: Mender solo (3 Bonds) | 95 | 77 | 69 | 73 | **79** | 70 (+13%) |
| offence: Mender squad (4 Bonds) | 95 | 84 | 75 | 79 | **83** | 70 (+19%) |
| offence: door all in (solo) | 87 | 77 | 69 | 73 | 77 | 61 (+26%) |
| strike: Mender solo, Ledger full | 123 | 99 | 90 | 102 | 104 | window 100 |
| rifle-turn (yard) | 69.7 | 86.2 | 108.5 | 111.7 | | |

Not refitted (the brief). The healing falls with level (the tend profile has no slope past Empathy 10); the offence sits
over its line at level 1 (the pistol's low Defense gap). **Not measured:** the solo Mender against two and three
Soldiers in whole fights, the squad's whole fights, and `bond_dip` (the simulator has no Tending policy yet: a policy in
`policies.ts` is the next piece). **The Outburst's steady line after the free Pump moved**: see section 7.
`balance.ceilings` gained `tending_turn` 200, `mender_offence` 70, `mender_window` 100; **the guard
(`balance-contract.test.ts SYS`) was not given rows**: two of the three lines read outside ±12% and the guard would fail
`npm run check`; the lead chooses the dials (`output.profiles.tend.k`, `bond.per_bond`) first.

## 5. Golden lines and replays (re-recorded on this branch, after the four oracles passed)

Against `claude/charming-gauss-hbq4n0`:
- `conditions.json` / `.log.json`: **new lines only** for the new rows (`bonded`, `traced`, `settled`, `given_*`,
  `foe_*` named "Felt <feeling>"); no line of an old row changed.
- `costs-credit.json`: **new lines only** (+150: the Tending verbs and Stim Throw priced under a Brief / Encore).
- `costs-items-traits-classes.json` / `.marks`, `costs-items-shelved.json` / `.marks`, `items-traits-classes.json`,
  `items-shelved.json`: the Mender's rows: Triage, Inspire, Rally (now data, through an Attuner: the fixture has none,
  so they record nothing), Stim Throw (left the class), `res.supplies` → `res.ledger`; three new `class/bard@*/heal-out`
  and `shield-out` lines (the Ledger counts them); the `#coverage` counts fell 13 → 11 of 111 → 109 (shelved) and 18 → 15
  of 129 (the heal actions the table can't run without an Attuner).
- `itemops-perks` / `itemops-traits-classes` (+ `.log`): log words (feelings now felt by the fixtures' Empathy 5 squad,
  rules 1.33 rule 23), three new `cond-in-fear` / `cond-ally-fear` lines; `costs-askers-traits.marks` (the same).
- **The item tables' squad does not Share a Hit** (`harness.ts noShare`, used by `itemops.ts opsFight` and
  `record.ts itemFight`): without it every damage line near the squadmate moved.
- **Replays** (`replays.json`): 13 of 13 re-recorded (`REPLAY_RECORD=1 REPLAY_FULL=1`): Share a Hit in the squads, the
  free Pump now Will Power's, the Mender's moves; `proving-waves-long` 304 → 307 actions. No coverage count fell
  below its guard.

## 6. Where the spec was wrong or silent, and what was done (calls for Leon; also in the pick-up guide section 6)

1. **The echo is 0.20** (Leon, the brief), not the body's 0.25.
2. **A Bond past the cap is refused** (the action greys, `self_tie_room`); "asks which to let go" is Let Go first.
3. **Every Bonded unit bears `bonded`** (an ally with no save): the mark the tie kind ends with; a Boss's three turns are
   the mark's rounds; the gap is 4 rounds from the Bond on that Boss (a failed save starts it too).
4. **The share is not taken from damage you do to yourself** (Take the Weight, Strain, a Short): `actor` foe, ally or none.
5. **Per-Bond counts the ties you hold at either end** (`ties:bond`): a Bonder tied to by another counts it.
6. **Brimming leaves half the overheal** as a shield (the conservative reading of "up to half of that heal").
7. **Take the Weight's condition** is taken with no save; the reaction needs no Attuner (it spends no MP).
8. **Given feelings**: a "next attack" boon ends with the bearer's next damage (or hit); Rage's and Abandon's Defense cost
   ends with it; Jealousy reads boons only (no shield predicate); Loneliness's enemy face is −2 to hit for its round (no
   "no ally within 2" predicate); the edge +2 is spent by a weapon hit or miss (a spell's roll keeps it to its round).
   Inspire on an enemy with a feeling that has no enemy face spends its AP and MP and does nothing (the spec's "or
   nothing"; the screen should grey those: step 10). "Each feeling once a fight a unit" is a limit read before the ops
   run: a repeat spends the action and gives only the mark.
9. **Field Surgery needs a field kit carried** (not used up: no kit has uses) and 15 MP from the character.
10. **Share a Hit fires for everyone with Camaraderie 1**, automatically (a protective reaction like Interpose). The
    item tables' fixtures (every skill 5) would have shared every hit: their squad does not share (`harness.ts noShare`),
    so those tables pin items, not Share a Hit. **Leon may want it as a choice** (a toggle): it changes every squad fight.
11. **Triage out of a fight** is the story lane (×3); on the area map Triage is no longer offered (item ops run in fights only).
12. **Stim Throw** stabilises a Downed ally at 1 HP (the old move's), and is priced at its own site `stim_throw`.
13. **The Mender's free Bond** is a second action, "Bond (free)", once a turn, 0 AP, any unit you see (rather than the
    first Bond action's price set to 0): the reach can't change by turn.
14. A Mender at level 1 (no class yet) was measured as one (the spec's sheet).

## 7. Left for later

- **The screen (step 10)**: the Bond strip and the Ledger bar, the TEND tab groups (the verbs are on the Perks tab
  through the descriptors today), the Inspire picker's per-target greying, Guide's two-step pick (unit, then tile:
  the engine takes `tile`; the descriptor asks only the unit), the thread and echo fx.
- **The enemy step (step 9)**: an Elite or Boss Bonded to you hunts you (`healer_focus`); a Bonded enemy counting its
  Bonder as a healer; the `read` of enemies aiming at a Bonded ally (section 2 rule 8 is not built: the `read` row
  exists, the op needs `aims_at: tied:bond` on the Bonder's turn start).
- **Balance (step 11)**: the policy for the simulator, whole-fight lines, the guard rows.
- **The Outburst's steady line** after the free Pump moved to Will Power: to re-measure with `REFIT_MEASURE=1
  REFIT_SYSTEMS=ob` (see section 8).

## 8. The close

- `python3 tools/validate.py data`: 0 errors. `tools/check_spec_tables.py`: 0 errors (the 16 enemy faces are rows of
  the spec's Conditions table: the spec's 5.1 has 16 faces, not the 15 its text counts).
- `python3 tools/engine_catalog.py --check`: clean. Lints: `lint-item-ops` baseline lowered (inspire, mend, stim_throw,
  field_surgery, rally gone; `tend.field_surgery` is the old story lane re-keyed, on purpose), `lint-costs` i.ts 6 → 5,
  `lint-foundations` rev3 cb.units 3 → 2.
- `npm run built-from -- claude/charming-gauss-hbq4n0..HEAD`: 7 smells in 5 places, 0 a lint fails on: the generated
  `protodata.json`; `classes/i.ts` Field Surgery's MP from the character (a story action has no unit: as the old story
  Inspire); `descriptors.ts` the `stim_throw` basic row's pick (a basic action's own id, as every row there);
  `game.ts` and `magic.ts` MP lines that existed (only `carriesMpFocus` / `attuner` changed).
- `class-weapon-neutral.test.ts`: passes (the Mender had no PENDING entry).
- Browser suites on port 8797 (`--base`, own server): `tending` (new, in `rules`), `heart`, `feelings40`,
  `classes-moves` (the Mender now takes an Attuner before Rally), `magic`: green. (There is no `soul` suite.)
- **The Outburst's steady line after the free Pump moved** (`REFIT_MEASURE=1 REFIT_SYSTEMS=ob REFIT_VARIANTS=allin
  REFIT_N=6`): 146 / 146 / 134 / 115, mean **135** against `outburst_steady` 135: the all-in Channeler has Will Power
  10, so it keeps the free Pump and the swell; the balance-contract guard passes.
- `npm run check`: see the last line of the final report.

## How to add one more Tending verb

1. A `verb` item in `data/tending.json` (or run `tools/once/tending_data.py` after adding it there): `requires`
   `[{skill: empathy, min}]`, one `grant_action` with `ap`, `res: {mp}` (a number block with `steps` for a ladder),
   `if: {self_holds: {slot: hand, door: empathy}}`, `reach` (`tiles`, `side`, `sight`, `beyond: "bond"`), nested item
   ops (an `amounts` block with `profile: "tend"`, `heal_kind: "tending"` heals through the Bond ×1.2 by itself) and a
   `say`. Add the TRACE op if tending through a Bond should Trace.
2. `python3 tools/validate.py data` (0 errors), a test in `test/tending.test.ts`, then `python3 tools/engine_catalog.py`.
