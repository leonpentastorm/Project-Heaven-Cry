PART A GREEN at c9174b11 (7b merged at aa3c88e2, the working branch with step 10 merged at c4842857, replays re-recorded on the merged code)

# Classes 3.0, step 11: balance (rules 1.38)

Built 13 Nov 2026 on the worktree branch `worktree-agent-a3b99193069de306d`, from `claude/charming-gauss-hbq4n0`
(5080991a, then 7b8de865 with step 10). Spec: Core Rules "Rules revision 1.38", items 2500 to 2511, all PROVISIONAL.
Not pushed, version not bumped, no browser suite run (the closer's).

## 0. Part A: step 7b merged

- `worktree-agent-aa7fcf4cb4350f000` (step 7b) merged (aa3c88e2). Conflicts: the spec (1.36 before 1.37, items 2300s
  then 2400s, no number twice), `ranged.ts` (main's technique effects and bullet holes, and 7b's `fmtFloat` / `fmtNum`),
  `ENGINE-HOOKS.md` regenerated, `replays.json` taken and re-recorded.
- Then the working branch at 7b8de865 (step 10, the screens) merged (c4842857): `ENGINE-HOOKS.md` regenerated,
  `replays.json` re-recorded again (main's was knowingly stale). `costs-credit` did not conflict and stayed green.
- Each time: oracles (`paths-order`, `sight-order`, `shared-state`, `old-save`) first, every golden table green with
  no re-record (none moved in the merges), then `REPLAY_RECORD=1 REPLAY_FULL=1`. The hashes moved on purpose: step 9's
  enemy perception and 7b's level scale.

## 1. What was built

| Piece | Built from | Commit |
| --- | --- | --- |
| **Mag Dump: 4 rounds a roll, 12 at most** (point 1, items 2500, 2501) | data: `techniques.json mag_dump` `rounds: "up_to"`, `numbers.per_roll` 3 (the rolls, as rules 1.18), `rounds_per_roll` 4 (new), `max_rolls` 3; the cap is `rounds_per_roll × max_rolls`. Engine: `press.ts` `dumpRolls` (unchanged: one for every 3 left, at most 3) and `dumpRounds` (4 a roll, up to what is loaded), through the existing `burnRest`; the volley's `shots` is the rounds spent (casings follow). Spread spends one roll's rounds. `core.ts roundsCap`: the pad says `rounds 12, upTo`; `techView.ts`: "up to 12 rounds". Validator: an `up_to` technique needs both numbers. Enemies use the same technique | 1b5e6bb5, ab0c79cd, and the lead's correction (see section 7) |
| **The focus list from data** (point 2, item 2502) | `character.ts FOCUS_IDS`: every item AND weapon with a `focus` block (`focusOf`); `FOCUS_BASE` (the list in code) deleted; the four mana arms carry `focus {door, fuel}`; the validator refuses a `counts_as_<kind>` property with no block of that door | bc99a6dd |
| **The Emanator katana** (item 2503) | data alone: `weapons.json emanator_katana` (the Evoker blade's numbers, Will Power 3, light and edge, focus Will Power / MP), 7.11's eighth row, a monoline `art/icons/weapons/emanator_katana.svg` (the painted icon was delivered); tests in `katana.test.ts` and `focus.test.ts` | bc99a6dd |
| **HP and shield readouts through the one formatter** | `fmtNum` in `screens/combat.js` (cover HP, the analysed target's and the current unit's line, HP chips, the shield badge), `main.js` (sheet bar and line, an object's HP, the shield row), `shared.js` (unit card) | c6d323f6 |
| **The Mender's offence fitted** (point 3, item 2504) | the named dial `tending.json bond.per_bond` 0.10 → 0.05 (the `bond` block, `tend.threads` numbers and its op); the guard plays the Mender's healing turn, the door's Tending and the offence (`test/balance/tending-measure.ts`, shared by the report and `balance-contract.test.ts`) | 69502feb |
| **Measured; the contract, the spec, the tally** (points 4, 5, items 2505 to 2511) | `balance-contract.md`: rule 6 (Survival run power exempt, survival-spec 11.6 item 5's words), rule 8 (the Classes 3.0 reading), the measured column refreshed, class and door rows, the stale "Masterwork's damage" cell fixed (and in `rules.json`); `PATCH-TALLY.md` section 12 | 0f6e6b82 |
| A test the merges left red | `rigger.test.ts` Overclock: the scaled Beast's strike ended the fight (red on the merged code before step 11); the foe now has HP to spare | 7922ab06 |

`npm run built-from -- c9174b11..HEAD`: no smells.

## 2. Measured (all in unless said; levels 1 / 5 / 10 / 20; mean)

| Line | L1 | L5 | L10 | L20 | Mean | Its line | Where |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Plain rifle | 129 | 113 | 112 | 101 | 114 | 125 | refit, 16 fights |
| Best gun (the Skirmisher) | 164 | 161 | 158 | 153 | 159 | 145 (+10%) | refit |
| Melee | 156 | 150 | 133 | 178 | 154 | 165 | refit |
| Sigil, full Line | 155 | 147 | 176 | 189 | 167 | 150 to 200 | refit |
| Outburst steady / peak | 139 / 150 | 155 / 173 | 136 / 152 | 137 / 158 | 142 / 158 | 135 / 165 | refit |
| Whisper turn (Faith door) | 92 | 75 | 62 | 100 | 82 | 80 | refit |
| Hymn turn (Faith door) | 119 | 104 | 156 | 173 | 138 | 150 | refit |
| **Chaplain** | 117 | 131 | 117 | 138 | 126 | 125 | refit |
| Off-heal (% of R) | 45 | 45 | 45 | 45 | 45 | 45 | refit |
| Shadow: door / **Operative** | 118 / 125 | 122 / 128 | 104 / 133 | 109 / 110 | 113 / 124 | 109 / 125 | shadow-measure |
| Tending: door / **Mender** heal (% of R) | 67 / 70 | 62 / 64 | 62 / 65 | 62 / 65 | 63 / 66 | 59 / 65 | tending-measure |
| Tending: door at a normal share | 63 | 51 | 38 | 36 | 47 | 47 (59 ÷ 1.25) | tending-measure |
| **Mender** offence solo / squad (after the fit) | 81 / 81 | 67 / 72 | 60 / 63 | 63 / 67 | 68 / 71 | 70 | tending-measure, 8 yardstick fights |
| Door offence (solo, after) | 78 | 67 | 60 | 63 | 67 | 61 (+10%) | tending-measure |
| Mender strike, Ledger full | 109 | 92 | 84 | 105 | 98 | window 100 | tending-measure |
| Figments: door / **Rigger** | 144 / 156 | 106 / 118 | 114 / 116 | 112 / 101 | 119 / 123 | 130 / 150 | figments-measure, 4 fights |
| Figments at a normal share: door / Rigger | 82 / 81 | 114 / 121 | 142 / 124 | 123 / 119 | 115 / 111 | 104 / 120 | figments-measure |
| Reflex: off-turn damage with / without | 4 / 4 | 11 / 11 | 0 / 0 | 0 / 0 | +0 | +8 to +17 (spec) | defence-measure `reflex` |

Normal shares (refit, 16 fights): plain 103 / 104 / 101 / 104; gun 136 / 131 / 139 / 153; Chaplain 93 / 125 / 105 / 113;
Whisper 101 / 92 / 87 / 91; Hymn 104 / 93 / 155 / 157 (the full table is item 2505 and the run's JSON is not kept).

**The healer under fire** (`DEFENCE_PARTS=fire`, rows tank, tankIdle, mender, idle, 4 fights a cell; the run 7b skipped):
the tank and a dedicated Soul healer under three Soldiers: nobody Down in 10 rounds in 50% / 75% / 75% / 100% of fights
at levels 1 / 6 / 12 / 20, against 0% with the healer idle (Down after 2.5 / 5.5 / 4 / 6.3 rounds). Under two Soldiers
100% at every level (the idle control also holds at 12 and 20). A lone Soul healer under three is Down after 2 / 4.5 /
3.5 / 6 rounds. **The stall grows with level**: a pair with a dedicated healer under three Soldiers never falls at level
20. Not refitted (no dial named for it; a playtest question).

**Rounds to kill** (`DEFENCE_PARTS=fights`, open ground, 3 a cell, the run 7b skipped): every squad wins every fight at
every level; sigil, guns and outburst squads 4.3 to 8 rounds, inside the standard / elite / Boss targets (4 to 6, 6 to 8,
8 to 10); the healer squad 6.3 to 7 in a standard fight (over its 4 to 6) and 9 to 10.7 against a Boss, nobody ever Down.
The level scale holds the shape: level 20 reads as level 1.

## 3. What remains off a line, and why

1. **Figments** (Rigger 123 against 150, −18%; door 119 against 130, −8%): not fitted. The measure's worth is almost all
   soak (the damage enemies spend on Figments), capped at 60% of the enemy's fire, and both door and Rigger sit above
   that cap at nearly every cell (checked: soak against the cap per cell), so `figments.json level.hp` (or `hp_stat`)
   cannot move it; the damage term is near 0 (the policy's striker rarely lands). The Rigger's edge (a third held body,
   Overclock, Field Fix, the Scrap Turret) is not in the measure. **The missing general dial**: a class-only multiplier
   on what a door makes (a stat a class move raises, read where an owned unit's HP or damage is built), and a measuring
   policy that plays the Rigger's moves. Filling every held body in the policy was tried: no change (the cap binds).
2. **The Skirmisher** 159 against 145 (+10%): inside the band; left.
3. **The Hymn door** 138 against 150 and the **Whisper door** 82 against 80: inside.
4. **The healer stall** (above): a dedicated healer keeps a tank standing under three Soldiers from level 6 on.
5. **Reflex** +0: no enemy in the simulator crosses a held line (step 3's list of what the simulator needs stands).
6. **KNOWN RED: the replay coverage guard** "actions with a player's unit Hidden" reads 20 (needs more than 20). Mag
   Dump's new rule moved the scripted games (a gun keeps rounds after a dump; proved: with the old dump put back, every
   replay plays as recorded). Not fixed by editing a scripted game (the brief forbids it). **The lead's ruling**, as at
   step 3: add a hiding step to a scripted game, or lower the threshold.

## 4. The loosened guards, revisited

| Guard | Measured now | Kept or tightened |
| --- | --- | --- |
| `whisper_turn.level_hi` 1.42 | 16 fights: 100 at level 20; the guard's 6 seeded fights: 113 | **Kept**: tried 1.25 and the guard failed at 113 (its sample) |
| Faith door tops raised for Smite (Hymn turn 200, quiet 130, no-Hymn patron 125) | 184 / 177, 104 / 129, 112 | **Kept**: the old tops (175, 110, 100) fail; Smite rides the Faith build's weapon hits |
| Guns guard, long rifle top 1.13 | 1.122 (armour rounding at level 6) | **Kept**, as 7b recorded |
| Skirmisher (161 at step 3) | 159 | Inside 145 ± 12% |

## 5. Calls made for Leon (he can reverse any)

1. **Mag Dump** (the lead's corrected ruling, 13 Nov): the rolls stay rules 1.18's (one per 3 left, at most 3), so no
   weapon's damage moves; each roll spends 4 rounds, never more than are left (the long rifle: one roll, 4 of its 5;
   the revolver: two rolls, all 6; a belt: 12). The golden tables changed only in rounds left (11 costs lines).
2. **Spread** (both barrels) spends one roll's rounds (up to 4), not the whole magazine.
3. The card's "up to 12 rounds" is the pad's rounds chip (the engine's number); the text reads "Up to 3 rolls, 4 rounds a
   roll" from the item's fields (a text cannot hold a product).
4. **The Spellslinger's pistol** keeps counting as an Evoker (it did, in code, with no `counts_as_evoker` property); its
   focus block now says so.
5. The Emanator katana: light and edge (as its twin the Evoker blade), no lent technique, no weapon skill, no loot table.
6. `bond.per_bond` 0.05 also lowers the door user's Bond bonus (it is the door's rule): the door's offence 67 against 61.
7. The Chaplain is not refitted (126 against 125).
8. The game/ views' previews (heart, sigil, world) still print raw numbers: not screens; for the closer.

## 6. How to fit the next class line

Measure with the tool for its system (`test/balance/*-measure`, smallest sample first), at levels 1, 5, 10, 20, the
class and the door, all in and at a normal share; fit with the dial `rules.json balance.ceilings.<line>.dial` names; add
the line to `balance-contract.test.ts` (as the Mender's rows, through a shared measure module, not a copy); if the
door and the class read the same, the class's edge is not in the measure or the dial is shared: say so (section 3).
