# Classes 3.0, step 6: Shadow and the Operative (hand-off, 13 Nov 2026)

Built on the worktree branch `worktree-agent-a240d31a3975ddb8c` (fast-forwarded from `claude/charming-gauss-hbq4n0` at
`919593e`). Spec: `docs/design/shadow-spec.md` (binding). Rules: **revision 1.32** in `docs/rules/PHC-Core-Rules-v1.0.md`,
section 14 items **1950 to 1969** (every number PROVISIONAL). Not pushed, no version bump.

## 1. What was built

**The door (anyone with Ingenuity 1+).**
- The meter `res.shadow`: a pool built like Guard (`character.ts RES_RULES.shadow`, `classResources`, `shadowCap`),
  cap from `rules.json shadow.cap_by_points` {1: 1, 5: 2, 7: 3}; a class that brings `shadow` in its `resources` (the
  Operative) holds `operative_cap_add` (1) more. `actions.json resources.shadow` (`res.shadow`).
- The door item is Ingenuity's unlock `"1"` (`skills.json`, `item: true`), all data: gains a (turn end Hidden, no
  attack rolled), b (move or Sprint from cover to cover, Hidden, ending out of view, once a turn by a flag), c (a kill
  after which you are not Seen); one shared limit `{per_turn, n: 2, key: gain}`; the loss at turn start while Seen;
  zero on `downed` and `combat_end`; the turn's attack mark on `attack_roll` (a shot cover stops counts).
- **The Break**: a data toggle (P12) `shadow.break` on `combat/attack` (the attack card and every technique chip),
  `if: {self_has: [hidden], self_has_res: [shadow]}`. Its `damage_mult` is ONE number block
  `{base 1, per: [res:shadow 0.15, event:ambush 0.5, target:marked 0.15]}` with the new general field
  **`replaces: "ambush"`** (the attack's ambush term is taken out: never both, rev4-primitives contradiction 9); its
  `acted` effect spends `all` and cleanses Hidden (revealed even with a Silent weapon). The validator holds the term's
  numbers equal to `rules.json shadow`.
- **The Ambush is a flat ×1.5** (`character.ts ambushMult` = 1 + `ambush_bonus`); `ambush_per_point` is gone.
- **2.6, the spot-back**: a silent attack from Hidden lets the surviving target that sees the tile roll at once
  (`combat.ts resolveAttack` → `tactics.ts spotHidden(cb, rng, tgt, only)`).
- **Verbs** (`data/shadow.json`, kind `verb`, tab `shadow`): Lift, Read Intent, Cut the Strap (3); Fade, Open Seam,
  Foul the Action (5); Timing, Plant, Disable (7); Hijack (9). Still Breath is Ingenuity's unlock 5 (`roll_mod` on
  `spot`, `by_cover: [here]`). Conditions `exposed` (Defense −2, 1 round) and `off_balance` (−1 AP next turn).

**The Operative (`infiltrator`).** `resources` gains `shadow`. Class gain **Tradecraft** (data only): +1 Shadow on
`combat_start`, Analyze `cost_mod set 1`, Read on the Analyzed target, +1 Shadow once a turn when it can't see you.
Rank I Mark (handler kept) and **Vanish in data** (its handler deleted); rank II Toxin (any weapon; a Break adds the
Shadow spent to the poison's TN) and Sabotage (moved from III; `numbers.rounds` 1; a barricade breaks); rank III
Execution (never on a guard-held hit nor on an Elite or Boss at full HP at the action's start: `combat.ts
fullAtAction`) and **Called Shot** (`gunslinger.called_shot`, status active; any weapon's plain mode; its −2 from data,
none while the target can't see you). **Field Fix** is out of the ranks, kept in the move pool (shelved,
`future_home` the Rigger): key and handler untouched.

**The other side.** `FOE_TAGS` gains `skulk`; a Vermin, Minion or Soldier with it Hides on its turn when no enemy has it
in view and it has no shot (`combat.ts skulks`, before it moves), and ambushes at ×1.5. No enemy meter. The guard holds
every roll of a Break (tested: `test/balance/shadow-measure.test.ts`).

**The screen.** The meter row (`apps/web/src/game/resources.ts`): "Shadow n / cap" in Perception ink `#40BAA0`, sub-line
"Eye: Unseen / In view / Seen" from the engine's `sightOf`, the rule in its hover. A **SHADOW** tab (`DescGroup`
`shadow`; `commands.ts` group 'SHADOW · UNSEEN'): the verbs through `actionsFor`, their refusals from the engine.
The Break is a toggle on the attack card (the existing toggle row). Icons: none yet (requests C2 and section 6's meter
marks in `art/briefs/ART-REQUESTS.md` already list them); the verbs show with no icon.

**General rows added (each one line, to the closed lists, named for their first user):** op **`take`** (Lift); op
`displace` field **`to: "cover"`** (Fade's step); op `condition` field **`same_entry`**; op `damage_mult` field
**`replaces`**; predicate `by_cover` word **`here`**. Changed in meaning (item 1967): `<who>_has` / `_lacks` and
`cleanse` see flag conditions (`magic.ts condHas`: Hidden, Prone, Bleeding, Dazed; before, data could not test
Hidden), and `<who>_sees_self` is false while the holder is Hidden (spec 2.1).

## 2. Numbers

`rules.json shadow`: cap_by_points {1: 1, 5: 2, 7: 3}, operative_cap_add 1, operative_start 1, ambush_bonus 0.5,
per_point 0.15, marked_bonus 0.15, door_gains_per_turn 2. `balance.ceilings.shadow`: allin 125, door_allin 109,
door_normal 87. Verbs: Lift 2 AP; Read Intent 1 AP (reach 8); Cut the Strap 1 AP + 1 Shadow; Fade 2 AP + 2 Shadow;
Open Seam 1 + 1 (reach 8); Foul 1 + 1; Timing 1 + 1 (reach 8, cooldown 2 a target); Plant 2 + 1; Disable 2 + 1 (1
round); Hijack 2 + 2 (1 round). Still Breath −2. Exposed −2 Defense 1 round; Off Balance −1 AP. Sabotage 1 round.

## 3. Measured (`SHADOW_MEASURE=1 npx vitest run --root packages/engine test/balance/shadow-measure.test.ts`)

The spec's three-turn windows on the engine's own rolls (80 windows a cell), against the same character's nine plain
shots, × the plain rifle's all-in ceiling (125). The character is the simulator's plain gun **all in (Dexterity
full) with the spec's all-in Ingenuity added**: an upper bound for a real Shadow build. Mark's squad value not
simulated.

| Level | 1 | 5 | 10 | 20 | mean | line |
| --- | --- | --- | --- | --- | --- | --- |
| Door all in | 89 | 84 | 80 | 87 | 85 | 109 (−22%) |
| Operative all in (no Mark squad value) | 103 | 107 | 100 | 94 | 101 | 125 (−19%) |

The spec estimated 83 and 97 (120 with Mark's squad value): the measurement agrees. **Not refitted** (the dial is
`rules.json shadow.per_point`); the spec expects it raised for the door. A full-fight simulator policy for Shadow
(hiding, cover moves) does not exist: the measure is the scripted window.

## 4. Golden lines and replays (for the merge check)

Replays: the four oracles passed, then `REPLAY_RECORD=1 REPLAY_FULL=1`: **13 hashes moved** (Shadow's log lines,
the flat Ambush, the spot-back roll); the coverage guard held. Goldens (`GOLDEN_RECORD=1`): **309 new lines** (the
verbs' cost and credit rows, the two condition rows); **452 lines** gained only `"shadow":0` in `res` or the door's
own flags (`ps.skill:ingenuity.1.flags.struck`, `res.shadow`); **11 gone** (Field Fix's Operative rows, the empty
rank rows); **8 others**: Vanish's log line as a data action (3: "uses Vanish. / vanishes · is Hidden"), Vanishing
Act's two ambush hits at the flat ×1.5 (4 lines: 60 → 51, 38 → 32), the coverage count (+1 item). The classifier is
`/tmp/.../shadow6/gdiff.py` in the session scratchpad (re-runnable: strip `shadow` and the door's flags, diff the rest).

## 5. Where the spec was wrong or silent, and what was done

1. **Nine verbs not built** (item 1966; `data/shadow.json pending` names each reason): Parting Cut (a toggle riding
   the Break, and a points gate on a toggle), Decoy (no op writes `cb.lastSeen`), Close Quarters (the spot hook does
   not carry the adjacent find), Vault, Pick, Douse (a verb's reach picks units, not tiles), Shadow Run (the cost hook
   can't know the move ends by cover), Case (no read-out of kit and loot), Rig (no op lays a trap; Sabotage's own rig
   stays). Each needs one general primitive; the lead to rule on which step adds them.
2. **"Can't see you" vs `target_sees_self`**: the predicate read only the target's eyes; the spec says Hidden counts.
   Changed in the predicate (item 1967). No golden line outside Shadow moved for it.
3. **`self_has: ["hidden"]` could never pass** (Hidden is a flag, not in `u.conds`): `condHas` (item 1967). Op
   `cleanse` of Bleeding and Prone now works in data too (no golden line moved for it).
4. **The turn's attack mark**: the spec's `hit` + `miss` missed a shot cover stops; marked on `attack_roll`.
5. **The toggle's 1-Shadow floor** "is the action's price": a toggle has no price in the primitive; read as the
   toggle's `if` `self_has_res: [shadow]` (greyed with none).
6. **Reach** of the ranged MARK verbs: the spec's own example (8 tiles) used for Read Intent, Open Seam, Timing.
7. **Saves against machines** with "the better of Ingenuity and Acuity": not built (saves go `via: ingenuity`).
8. **Foul the Action's Body save**: the `lowered` row's family is Heart; the row decides (Heart save).
9. **Off Balance "never two rounds running"**: a 2-round cooldown a target, and an Off Balance target can't be picked.
10. **Toxin** stays a handler: its story-side coat (put on before a fight) has no condition carrier; the gun refusal is
    gone and the Break adds the Shadow spent to the TN (read from the toggle id in `cb.mods`).
11. **Called Shot's no −2** is read in its handler (the −2 from its data `attack_mod`), not a data rider: the `attack`
    trigger does not know the attack is a Called Shot.
12. **Field Fix** sits in the move pool (shelved) so its key resolves; its DOOR row in `class-weapon-neutral.test.ts`
    and its browser and picker checks are parked with a dated note for the Rigger's step.
13. **`trickster.read`** (the Rigger's Read) is left to the Rigger's step (its class block is not this lane); the
    Operative's Read is Tradecraft's `read` condition.
14. **Fade** picks its tile itself (nearest by cover within Movement, out of view first): a verb's reach has no tile pick.

## 6. Left for the enemy step and the screen step

Enemy: the search toward an unseen attacker (spec 8.2's last sentence), a Boss never Hidden after round 1, Elites
placed Hidden by the Narrator (exists: `startHidden`), Decoy's tile, Close Quarters' roll, the simulator policy for
Shadow (hide, cover moves, Break). Screen: the four group marks and sub-groups (Slip, Mark, Work, Break) inside the
tab, the Break toggle's own words ("spend 3 Shadow, ×1.95 · you will be revealed"), the pip ring fx, the refusals in
the spec's words ("An enemy sees you", "It can see you") instead of the generic "Not now (self has)", icons.

## 7. How to add one more Shadow verb

1. A row in `data/shadow.json items`: `kind: "verb"`, `group`, `requires: [{skill: "ingenuity", min}]`, ONE
   `grant_action` with `ap`, `res: {shadow: n}` (at most the cap at `min`: the validator checks), `if` (holder
   predicates; `self_has: [hidden]` for "from Hidden"), `reach {tiles, side, if}` and its nested `effects` (item ops,
   run when it succeeds; `say` with `{then}`). Text with `{=effects.0.ap}` placeholders.
2. `python3 tools/validate.py data`; a test in `test/shadow-operative.test.ts`; the golden tables gain its cost rows
   (record them on purpose). It appears on the SHADOW tab by itself.

## Integration (13 Nov 2026, on the worktree branch `worktree-agent-ab5abe8a0a27c4742`)

Four commits on top of the builder's 17: the merge of the main line (step 5, the Chaplain), the merge of step 7
(Tending, Bonds and the Mender: `worktree-agent-ab6c4efb0b594722e`), then part 2 (the lead's rulings on this hand-off's
questions) and the close. Not pushed, no version bump.

**The merges.** Rules 1.31, 1.32 and 1.33 all stand (section 14 items 1900s, 1950s, 2000s; this step's new ones are
1970 to 1976). Data merged by id (a 3-way JSON merge of classes, conditions, rules and effect_ops: no conflict left);
generated files regenerated; `lint-item-ops` re-recorded at or under every parent; the weapon-neutral PENDING list is
empty (Called Shot and Toxin here, Verdict and Blessed Arms in step 5). Golden tables and replays were never
hand-merged: re-recorded on the merged code after the four oracles passed, then counted against each parent:
- with step 5: the merged tables differ from the main line by 1264 lines, every one a line this step moved except 66
  marks lines and 2 coverage lines that both steps touched (step 5's Smite rows gain this step's door flag); from this
  branch by 511, all step 5's (the same both-sides lines). Replays: 13 differ from the main line (exactly the 13 this
  step moved), 12 from this branch (exactly step 5's 12).
- with step 7: 1721 lines from step 7, all steps 5/6's but 61 both-sides lines (step 7's Mender and spray_and_pray rows
  gain `res.shadow` and the door flag; coverage counts; Vanish's log loses "uses Vanish." by step 7's rule that an
  all-acted grant writes no Narrator note); 4165 from steps 5+6, all step 7's but the same 58. Replays: 22 and 13, each
  exactly the other side's.
- No primitive was added twice under two names: step 7's op `displace` `to: "tile"` and the verb `amountHome` are the
  one copy (this step's Vault and Rig use them; Vault with no target named moves the holder).

**Interactions.** (1) Step 6's predicate changes against the Chaplain and the Skirmisher: their suites pass unchanged
(`chaplain`, `faith-*`, `skirmisher`). (2) A Traced unit (`always_seen`, rules 1.33) could still be made Hidden by Fade
or Vanish (the condition op): fixed in `magic.ts applyCond` and `tactics.ts hide` (a unit always seen can't hide; test
in `shadow-operative`). (3) The lead's ruling on step 7: **Share a Hit is an Answer with a switch**: new predicate
`answer_on` reads the character's Answer list (`phys/answers`, which now takes item Answers beside techniques); on by
default, it spends the one protective reaction, off it never fires (test in `tending`). The Mender's guard rows are
not added (two of three lines read outside the contract's ±12%: steps 7b and 11 refit `tend.k` and `per_bond`).
Step 7's section 6 readings were checked against `bonds-spec.md`'s "Settled by Leon" notes: none contradicts them
(the Bond's to-hit term is on `to_hit`, every attack roll, as Leon settled).

**Part 2, the nine verbs.** Built (7), each a test in `test/shadow-verbs-more.test.ts` read from data, each on the
SHADOW tab through the descriptors (tile-aimed, step 5's `reach.tile`), weapon-neutral:
- **Decoy** (3): op `last_seen` (new): every other side's last-seen tile of you becomes the picked tile.
- **Close Quarters** (3, Ingenuity's unlock 3): op `close_roll` (new) on the spot hook, which now carries `close` for an
  enemy next to the Hidden unit (asked only when someone listens; the die rolled only for a roll: no replay moved).
- **Vault** (5): reach `over` (new) and step 7's `displace to: "tile"`.
- **Pick** (5) and **Douse** (5): reach `object` (new) and op `object` (new: do pick / break). Doors only (no container
  has a lock); Douse puts out lamps only (a terminal and a fire are not lamps).
- **Shadow Run** (7, Ingenuity's unlock 7): data only (`cost_mod` on the move, `by_cover` here and to). It can't read
  "ending out of view" (the price is known before the walk). The move's bank now counts a `cost`-hook cut as a
  discount, not a debt (`combat.ts moveUnit`; nothing else cuts a paid move: no golden line moved).
- **Rig** (7): reach `stand` (new), op `object` do lay with the verb's `amounts.rig` (25 flat).
Still pending (2): **Parting Cut** (a toggle riding the Break with its own points gate, and a re-hide after the
Break's reveal at the action's end: the toggle primitive has neither) and **Case** (a read-out of a unit's kit and
loot for a side: a `reveal what: kit` the fog and the hover card would show; not small). Part 2 moved 60 new golden
lines (the new verbs' and unlocks' rows; no line changed) and 7 replays' state hashes only (actions and streams
identical: the new items' state).
