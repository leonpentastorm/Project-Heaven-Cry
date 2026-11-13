# Classes 3.0, step 5: the Chaplain, and prayer from Faith 1 (hand-off)

13 Nov 2026. Built from `docs/design/chaplain-spec.md` (binding; its Settled notes override its body), the Settled blocks
of `class-roster-rev4-proposal.md` section 8, `heal-shield-percent-spec.md` "Settled by Leon" 5 (Ward 10) and
`rev4-weapon-neutral-audit.md` 4.7. Rules revision **1.31** in `docs/rules/PHC-Core-Rules-v1.0.md`, section 14 items
**1900 to 1933** (all PROVISIONAL). Branch: the worktree branch `worktree-agent-a186113cb0c0b8bf6` (not pushed, version
not bumped).

## 1. What was built

**Prayer opens at Faith 1** (Leon's ruling). `patrons.json prayer.faith_min` 1, `prayer.whisper.faith_min` 1,
`prayer.hymn.faith_min` 3. Engine: `faith.ts` exports `WHISPER_FAITH`, `HYMN_FAITH`, `prayerFaith(kind)`,
`prayerFaithWhy(kind)`; `previewPrayer` and `verbPrayerWhy` gate by kind ("Praying needs Faith 1." / "A Hymn needs Faith
3." / "A Miracle needs Faith 7."); Blessed Arms' story blessing reads `HYMN_FAITH`. The client's Belief-step note already
read both thresholds (`faithView.ts prayFaith`, via `E.HYMN_FAITH` and the data): it now says "Whispers need Faith 1;
Hymns need Faith 3" (test pinned to `{whisper: 1, hymn: 3}`). `rules.json` pray `requires` 1 / `hymn_faith_min` 3,
`classes.json` patrons note.

**The Chaplain's moves** (all data; the `guardian` block of `classes.json`, the move pool's `guardian.sanctuary`, the
`lumeri_templar` moves' words):

| Move | Data | Engine path (no new handler) |
| --- | --- | --- |
| Ward (rank I, new key `guardian.ward`) | `amounts.ward` base **10**, profile `blessing_mend`; `grant_action` `prayer: whisper`, `reach {sight, side: ally, self: false}`, nested `mend` `layer: ward`, `holders: 2` | P6 prayer door (`verbPray`: the Whisper slot, the Atheist's roll), P11 layer |
| Smite (rank I, new key `guardian.smite`) | `amounts.smite` / `smite_storm` base **20** (Rebuke's), profile `blessing`, Soul, armour none; three `deal` effects on `hit` (`own_turn`, `hostile`, `target_alive`, `open`, then `not_patron`/`patron`, then `answered` last), one shared `limit {per_turn, 1, key: smite}`; `via: faith`; the kill-taboo patrons' `nonlethal`; Old Overcast's `element: lightning`; `say "{patron} smites {target} (Smite){then}."`; a `condition judged` on `hit` | item ops (`effects/triggers.ts`) |
| Under the Eye (II) | unchanged | as built |
| Blessed Arms (II, was Blessed Shells; key kept) | name, text (any weapon), tag `guns` → `weapon`; story action "Bless your weapon" | `classes/k.ts` words only |
| Sanctuary (III, key kept, reworked) | `amounts.sanctuary_cap` base **11**, profile `blessing_mend`; `grant_action` `prayer: hymn`, `reach {tile: true, tiles: 6, sight: true}`, nested `zone` (`at: tile`, `within: 1`, `rounds: 2`, `pool: "sanctuary_cap"`); the two `damage_mult` on `taking` with `pool: sanctuary` (as before); the `zone clear` on `turn_start`; a story grant `sanctuary_story` (`out_of_combat`: the Narrator's, no MP) | P6 + P10 |
| Verdict (III, was Judgement; key kept) | name, text, tags | `classes/k.ts`: the melee/scattergun gate gone; `plainMode(u)` (strike / throw / shot); Verdict's multiplier skips an item's own damage (`damage_out` mode `item`: Smite is not multiplied) |
| The Patron at Your Side (class `gain`, `guardian.at_your_side`) | `stat_mod intervention_keeps_witnessed 1`, `stat_mod patron_presence 1` | `faith.ts intervene`, `presenceOf` |

`resources: ["devotion"]`, the class resource is Devotion (no MP, no Strain). **Removed:** Will Shield (data and handler,
`shieldBy`), Command (data and handler), the old Sanctuary's MP / Strain / Soul-cast handler (`classes/i.ts`); the
client's Command picker (`actionPickers.ts`). Lint baselines shrank (`guardian.sanctuary`, `guardian.will_shield`,
`guardian.command` out of the handler list; literals i.ts 87 → 77, k.ts 112 → 111, rev3.ts 27 → 25).

**The presence** (`faith.ts`): `presenceOf(cb, f)` (Witnessed, Faithful, stat `patron_presence` > 0) returns the patron's
`patrons.json intervention.presence` block; each door intervention reads it: Nerukhan `judged_harms_below` 0.25 (a Judged
enemy of the Chaplain's that damages its ally to a quarter or less), the Quartermaster / Laughing Mask / Counting
Weaver `ally_within` 1, the Matchmaker `ally_within` 2, Mother Ember `below` 0.5 (the door's quarter is now data:
`intervention.below` 0.25), Old Overcast `judged_first` (`judgedOf`), the Toll-Keeper `ward: "class:guardian.ward"`
(its own `mend` op run by the generic runner on the kept-up ally). `intervention_keeps_witnessed` is now a **count**: the
fight's first N interventions keep Witnessed (the Chaplain 1: the second ends it). The `judged` row is in
`conditions.json` (1 round, no save, its source the Chaplain).

**General engine rows** (each for the next system too; `docs/ENGINE-HOOKS.md` regenerated):
1. A `grant_action` with `prayer` on ANY item (not only a door verb) runs its nested item ops only when the patron
   answers, and the item's triggered effects stay with their triggers (`effects/actions.ts defaultActions`).
2. `reach.tile` (`REACH_FIELDS`): an action aimed at a tile within `tiles`, in sight when `sight` (`tileReachWhy`).
3. A grant's own `label`.
4. The `zone` op's `pool` may name the item's amount block (worked out when laid, rounded).
5. Predicates `not_patron` (words) and `answered` (bool; `faith.ts prayerAnswered`: the door open, Faith 1 and not
   Silenced; the Faithful always, an Atheist rolls the Whisper's TN; a preview rolls nothing; put it last: it rolls).
6. `say` placeholder `{patron}`; the `deal` op returns ": <what reached the target>" for `{then}`.
7. Amount block field `element` (the damage's dmgType when it is not its type).
8. Stat `patron_presence`.

**Validator** (`tools/validate.py`): Smite's bases equal Rebuke's (a cross-file check); a move's shield `layer` is a known
one (`ward`); the `judged` row exists; no Virtue base-class move costs MP or Strain; `reach.tile` shape; amount `element`.

## 2. Tests

`packages/engine/test/chaplain.test.ts` (28): the data; rule 1 (Faith 0 to 3: Whispers from 1, Hymns from 3; a Faith 1
Rebuke); rule 2 (the same wait); rules 3-4 (Ward: the slot, the amount through the profile, allies only, two held and the
top-up, stacked over a base shield and spent first, the Atheist's miss); rule 5 (Sanctuary: the Hymn's wait, Witnessed,
half damage, the cap and its end, range and its end at your turn); rules 6, 7, 9 (Smite once a turn and its amount, not
for another class, a kill leaves it, never on another's turn, Old Overcast's storm tag, the Toll-Keeper's subdue, the
Atheist's roll / Faith 0 / Silenced); rules 10-12 (the first intervention keeps Witnessed, the second ends it; Mother
Ember below half; the stat; Old Overcast's Judged target; the Matchmaker within 2; the Toll-Keeper's Ward); Verdict with
a pistol; the old save (every key resolves; the class id stays). Updated: `faith.test.ts`, `rules121-faith.test.ts`,
`prim-verbs.test.ts`, the web's `faithView.test.ts` (Faith 1); tests that played Will Shield, Command or the MP Sanctuary
were moved onto the Chaplain or a plain `grantShield` (`classes-i`, `completeness-d/f`, `outburst20-classes`,
`no-magic-previews`, `ops-deal-mend`, `rules120-heal-shield`, `amount-literals`, `classes-rev3(-moves)`, `classes-k`,
`prim-zones-shields`, the web's `classMoves.test.ts`); `class-weapon-neutral.test.ts`: the Chaplain's PENDING entry is
gone (Verdict and Blessed Arms are in DOOR with their reasons). Browser: new `apps/web/e2e/chaplain.mjs` (group `rules`:
Faith 1 opens the FAITH tab, a Hymn refused in words below 3; the Chaplain's Hymn and Witnessed; Smite's log line and
Judged on a hit; once a turn; Rebuke after it; the CLASS tab's moves; Sanctuary refused in the wait); `classes-moves.mjs`
plays Ward (Faith 1) where Command was.

## 3. The golden lines that moved (re-recorded on purpose)

Only these families moved (`tools/golden_diff.py` on the branch):
- `builds-allin` / `builds-normal`: the 40 + 40 lines `build/faith/*` (the Faith build earns the Chaplain: its weapon hits
  now carry Smite, `o:soul/item:20 … i:<foe>:soul/lightning:40` on Old Overcast).
- `conditions` (+ log): 36 NEW `*/judged/*` lines (the new row); nothing else.
- `costs-askers-classes`, `costs-items-traits-classes`, `items-traits-classes`, `itemops-traits-classes`,
  `rules-items-traits-classes` (+ marks, log): `guardian@I/II/III` only (Ward, Smite, Sanctuary, the presence stats;
  Will Shield, Command and the MP Sanctuary GONE).
- `costs-credit`: the `credit/guardian/perk/*` lines (Command and the MP Sanctuary gone; Ward and Sanctuary's prayer).
- `costs-items-shelved`, `items-shelved`: `shelved/rev2/guardian` (Will Shield, Command gone) and
  `shelved/advanced/lumeri_templar` (Verdict's and Blessed Arms' words).
- `replays.json`: 12 hashes (squads with a Guardian are Chaplains now: Smite and Judged; Faith 1 Whispers), after the
  four oracles (`paths-order`, `sight-order`, `shared-state`, `old-save`) passed; the coverage guard passed.

## 4. The measurement (`refit-measure.ts`, 8 fights a cell; percent of the normal-share plain rifle's turn)

| Row | L1 normal | L1 all in | L5 n | L5 a | L10 n | L10 a | L20 n | L20 a | All-in mean | Line |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| plain | 102 | 127 | 105 | 122 | 93 | 112 | 101 | 106 | | |
| door Whisper turn (`whisper`, no class) | 105 | 90 | 92 | 80 | 87 | 60 | 94 | 101 | 83 | 80 (+4%) |
| door Hymn turn (`hymn`, no class) | 108 | 114 | 93 | 106 | 156 | 154 | 162 | 167 | 135 | 150 |
| **Chaplain weapon turn with Smite** (`chaplain`, Faith all in + Dex) | 85 | **122** | 127 | **130** | 106 | **123** | 120 | **149** | **131** | **125 (+5%)** |
| Chaplain's Hymn turn | 109 | 122 | 124 | 129 | 166 | 198 | 181 | 194 | 161 | (none) |

The Chaplain all in sits on its line (+5%; L20 +19%, inside ±25%); at a normal share 110 against the 100 the spec
expected (+10%; the spec's "watch" row). The Faith build (Dex 0, a Chaplain since it earns the class) measured in the
old faith-measure guards: a Hymn turn 181% (was ≤ 175), a quiet turn 103 to 129%, the no-damage-Hymn patron 111% (was
≤ 100): those guards' tops were raised by Smite's share (200 / 130 / 125) and say so.

**A Whisper turn by Faith** (arithmetic, Virtue = Faith, Blessing power 0.956 × (1 + 0.06 (V−1) + 0.06 F)): Faith 1:
×1.01, Rebuke 20 (29% of a level 1 rifle-turn); Faith 2: ×1.13, 23 (32%); Faith 3: ×1.24, 25 (36%); Faith 7: ×1.70, 34
(49%). A Ward at level 1: 15 / 17 / 19 / 26 (× the level's growth).

`balance.ceilings.chaplain_turn` (125, dial `amounts.smite.base`) is in `data/rules.json` and in `SYS` of
`balance-contract.test.ts`; the contract's `whisper` and `hymn` rows measure the door (`doorFaithBuild`: the Faith
sheet with no class), since the Faith build is now the Chaplain.

## 5. Where the spec was wrong or silent, and what was done (calls for the lead)

1. **Ward 7 or 10.** The spec says 7 (Leon, 13 Nov); the heal-shield spec's Settled 5 (Leon, later) and the task say 10.
   Built **10** (item 1902). Sanctuary's cap stays 11 (7b moves it to 21).
2. **Nonlethal Smite.** The spec says "never below 1 HP"; the batch row `nonlethal` subdues (surrendered, not dead). Built
   with the batch row (a subdue is mercy; item 1915).
3. **Smite needs the prayer door** (Faith 1, not Silenced): the spec is silent; a prayer is refused when Silenced, so
   Smite is too (item 1913).
4. **Two Sanctuaries do not stack** (spec edge case): **not built.** Each Chaplain's halving reads its own zone; two
   Chaplains' zones on one tile each halve (a quarter). Needs a "first zone of a kind" reading (a predicate or a
   `damage_mult` field); listed for the lead (item 1908).
5. **The Sanctuary story half**: kept as a Narrator action with no MP (`uses: out_of_combat`: no once-a-scene limit any
   more; the old one was MP's price).
6. **Sanctuary's tier**: no tier in the spec; built as a Hymn I (the Faithful's overreach under Devotion 3; the Atheist's
   Hymn I TN 14).
7. **The presence's Ward on the Toll-Keeper** uses the Chaplain's Ward item (its amount, layer and holders): a Ward from
   the presence counts toward the two held.
8. **"Interventions land where the weapon struck"** applies to Old Overcast only (the one damage intervention that picks
   a target); Nerukhan's presence trigger also reads Judged.
9. **The Faith build is a Chaplain**: the old faith-measure guards were the door's numbers; their tops were raised by
   Smite's share (section 4) and the contract's door rows now measure a classless sheet. The lead may prefer a door
   build with another class (a Virtue / Agility tie that takes the Skirmisher).
10. **Judged's length**: "1 round" ends at the enemy's own turn end; the worked example's turn-2 kill had no Judged
    target left (the lightning goes to the nearest). As written.

11. **The one red line of `npm run check`: `balance-contract.test.ts`, the door's Whisper turn at level 20: 113% against
    its top of 112 (80 × `level_hi` 1.4).** Its row now measures the classless Faith sheet (`doorFaithBuild`: the Faith
    build earns the Chaplain, whose Smite is its own row): the contract's run reads L1 91 / L5 81 / L10 66 / L20 113,
    mean 88 (inside 80 ± 12%); the Chaplain row 113 / 133 / 126 / 149 (mean 130, inside 125 ± 12%). Not refitted (the
    brief). The lead's call: `whisper_turn.level_hi` 1.4 → 1.42, or measure the door on another sheet (item 9).
    Everything else in `npm run check` is green (combat-actions and perk-audit timed out under the machine's load and
    pass alone). Browser suites on port 8797: chaplain, faith, faith-pg, classes-moves, pg-levelup, creation-points green.

## 6. Left for the enemy step and the screen step

- **Enemy (step 9):** the AI does not yet read a Sanctuary (shoot outside it or wait), a Ward layer (a worse target) or
  count Ward as tending in the healer hunt (spec section 8). No enemy prays.
- **Screen (step 10):** the presence's standing figure on the Chaplain's tile (the cut-in's portrait at 40%: `presenceOf`
  is the engine's answer; the `witnessed` fx is unchanged), the Ward pip, Sanctuary's outline in the patron's accent,
  Smite's chip on the attack card ("Smite ready · 32"). Ward and Sanctuary show in the CLASS tab today (the descriptors),
  Smite as a passive. The art is in `art/briefs/ART-REQUESTS.md` C1 and section 5 (already listed).
- **CLAUDE.md** still says "Any character with Faith 3 can pray" (not edited by a builder).

## 7. How to add one more prayer-shaped class move

Write it in data: an `amounts` block with profile `blessing` (damage) or `blessing_mend` (heal, shield), a
`grant_action` with `prayer: "whisper"` or `"hymn"` and a `reach` (units, or `tile: true` for a tile), and its effects
nested in the grant (they run only when the patron answers). A rider on an attack is a `deal` on `hit` with `via:
"faith"` and `answered` last in its `if`. A patron-specific variant is the same op with `patron` / `not_patron`. A
patron intervention that a class widens is a field in that patron's `intervention.presence`, read where the door's
intervention fires.
