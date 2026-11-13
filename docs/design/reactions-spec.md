# Reactions made real, and the Skirmisher (Agility; was the Marksman) (spec, 13 Nov 2026)

Revision 4 sections 2.1 and 4.3. **Nothing is built**: step 2 of the build (`rev4-moves-and-rename.md` section 4), as
Reflex stands on it. All PROVISIONAL. Leon chose Reflex's **full form**: two reactions of any kind. Id stays `marksman`.

## 1. The fantasy and the loop

Everyone gets one answer a round to what happens outside their turn; the Skirmisher gets two, and is never where the
shot lands. It holds Pressure on what it shoots and Heat on the gun (the door, unchanged), reloads faster, and moves
between its shots for free.

**Two turns** (level 12, Dexterity 8, an assault rifle, 6 AP, two reactions):

| When | Action | AP | Reactions left | Meter |
| --- | --- | --- | --- | --- |
| Turn 1 | Shot at a gunner (2 AP), hits | 4 | 2 | the gunner's Pressure 1; Heat 1 |
| Turn 1 | **Run and Gun:** 2 tiles to cover, free, no opportunity attack | 4 | 2 | |
| Turn 1 | Shot (2 AP), hits: +1 Pressure from Run and Gun | 2 | 2 | Pressure 3: Suppressed |
| Turn 1 | Overwatch (2 AP: the shot's AP) | 0 | 2 | |
| Enemy turn | a second gunner shoots at it: **Duck and Roll** steps it behind cover (−2) | | 1 | |
| Enemy turn | a raider runs across the line: the Overwatch shot fires | | 0 | the raider's Pressure 1 |
| Turn 2 | reload (Speed Loader: 1 AP), shot, shot | 1 | 2 (new round) | Heat 1 after the turn-start fall |

## 2. Rules (Revision 4 section 2.1, made exact)

| # | Rule | Adj. |
| --- | --- | --- |
| 1 | **One reaction a round for everyone** (a round: `cb.round`; fresh when a new round starts). Everything a unit does outside its own turn spends one: section 3's whole table. | engine |
| 2 | **A reaction never triggers a reaction** (Leon, 13 Nov). While a reaction resolves, no reaction window opens: no Riposte of a Riposte, no Parry of an opportunity attack; its attack cannot be Parried, Riposted or Interposed, its move provokes nothing and sets off no Overwatch. | engine |
| 3 | **One event, one reaction a unit:** a single attack, step or hit can be answered once by each unit (a Skirmisher can't Duck and Roll and Parry the same shot). | engine |
| 4 | **More only from:** Reflex (the Skirmisher: 2), an item that says so (stat `reactions`: Before the Blink +1), a Call that gives one (Cue: exactly one, before the giver's next turn). | engine |
| 5 | **A reaction that attacks is a plain attack:** the weapon's plain shot or blow, no technique riders, no Smite, no Opener, unless the reaction's own text gives one (Riposte's Edge or Point +2; Overwatch's +2 when Precise). | engine |
| 6 | **Multi-shot held fire stays on one reaction:** an Overwatch held with a Burst fires its rounds on one reaction (`owShots`). **Killzone** is two held shots at two enemies: it spends **both** of the Skirmisher's reactions (Leon, 13 Nov; `spend: 2`; with one left, one shot fires). | engine |
| 7 | **Suppressed never blocks a protective reaction** (one rule for the condition and for Pressure's state at 3): every reaction has a kind (P1 of `rev4-primitives.md`): `attack` (opportunity attack, Overwatch and held shots, Riposte, Keep Back, the Blade's Hold, Catch), `move` (Duck and Roll) or `protect` (Parry, Shield Wall, Interpose, Shrug It Off, Anchor, Share a Hit, Take the Weight). Suppressed takes `attack` and `move`, never `protect`. Stunned, Downed, Dread underfoot: none. | engine |
| 8 | **Forced movement provokes nothing** (`rules.json forced_movement`, `reactions: false` for every kind): stays. | engine |
| 9 | **Spent on a Many Hands donor** counts on the donor. **Order** (Authority's Call) spends the ally's reaction. A Call made as a reaction (9 points) spends the speaker's. | engine |
| 10 | **Policies:** a reaction that fires by itself (Riposte, Duck and Roll, Shrug It Off, Interpose) keeps its on/off policy; with two reactions the Skirmisher also sets **Keep one for Overwatch** (on by default): automatic reactions leave the last one while a shot is held. | engine |

**Edge cases.** Sight: a reaction needs its own sight of the trigger (`unitSees`); a Hidden mover draws none. Downed: none.
Co-op: each unit counts its own. Saves: the count is a `uses` cell, saved. **Changes in `data/conditions.json`:** the `suppressed` row's
`{"op": "forbid", "action": "reaction"}` gains `"kinds": ["attack", "move"]`, and its text becomes "…and can't make attacking or
moving reactions (protective ones still work)"; `tactics.ts maxReactions` stops returning 0 for it, and `canAnswer`'s protective list folds
into P1's `kind`. Fight end: nothing carries. The area map: the
cell lives in the story (`SCOPES.reaction.map`), so a rebuilt unit gets no fresh reaction each action.

## 3. Everything that is a reaction today, and what it spends

All found by grep for `useReaction` / `canReact` (`packages/engine/src`) and for "reaction" in data texts.

| Reaction | Where | Spends today | Under the rule |
| --- | --- | --- | --- |
| Opportunity attack | `combat.ts` move walk (`opportunityStrike`) | 1 | 1; a plain blow |
| Overwatch (a Burst's rounds too), Deny, Cover Me, Dead to Rights | `combat.ts` `triggerOverwatch`; `watches.ts` `fireWatch` | 1 | 1 |
| Killzone (two held shots) | `classes.json` move pool `killzone`; `tactics.ts` `payHeldShot` | 1 for both (fixed 13 Nov) | **2** (rule 6; the card text changes) |
| Heart Overwatch | `magic.ts` (the held Outburst's watch) | 1 | 1 |
| Answers: Parry, Riposte, Keep Back, Shield Wall, Interpose (also taught by the Sabre, the Glaive) | `melee/answers.ts`, `answer()` (`physical/core.ts`) | 1 (+ Guard for the last two) | 1 |
| Riposte, the Fighter's class move | `classes/i.ts` `fighter.riposte` (its own `on_miss`) | 1 + 1 Momentum | **folded into the technique** (section 6) |
| Duck and Roll; Brace's Interpose, Shrug It Off, Anchor (Bulwark) | `classes/rev3.ts`, `classes/i.ts` | 1 (+ Guard) | 1 (+ Guard) |
| Shelved: Adamantile Plate (`j.ts`: an Interposed hit is **free**), Strike Call, Share (`k.ts`); the Guardian's Drink It In and Rewrite (leave in Revision 4) | `classes/` | 1, or 0 | 1 |
| Catch, Dance of Iron (perks) | `perks/c.ts` | 1 | 1; a plain shot |
| Calls as a reaction (9 points); Order | `calls/core.ts`, `calls/handlers.ts` | 1 | 1 |
| Cue (+1), Before the Blink (+1), Many Hands (a donor's) | `tactics.ts` `cueLive`, stat `reactions`, `reactionDonor` | adds / shares | adds / shares |
| Dread residue | `magic.ts` | burns all | burns all |
| Last Word (weapon mastery) | `weapon_mastery.json` text only | no engine path found | 1, built as a held Watch |
| New in Revision 4: Share a Hit, Take the Weight (`bonds-spec.md`); the Blade's Hold (`figments-spec.md`, paid by the owner) | data, `limit: {reaction: 1}` (`of: "owner"` for the Blade) | | 1 each |

**"Riposte fired four times"** (`BUGLIST-0.22.md`, the lead's audit): **not reproduced** (3,314 reactions in 60 seeded
fights, never two by one unit in a round). Fixed on the way: Killzone gave its reaction back between its shots (now
`payHeldShot`, a `uses` cell, scope `reaction`). Still open, closed here by design: the count is a hand-kept
`u.reactUsed`, area-map units are rebuilt every action, and no rule-2 guard sits on the technique Answers. **Test:**
`reactions-once-a-round.test.ts` extended to the area map, Cue (exactly two) and "no Parry of a Riposte".

## 4. The ladder (the door, unchanged)

Dexterity 1 to 10: ranged techniques and light blades (rules 1.12), Pressure on the target (Pressed 2, Suppressed 3,
Broken 4: `techniques.json rules.pressure`), Heat on the gun. Reaction Speed's Call is Cue; Athletics keeps Dodge.

## 5. The class

**Better:** **Reflex** (two reactions a round, stat `reactions` +1, at class gain); **one thing cheaper:** Speed Loader
(the first reload each turn −1 AP, never under 1: as built); the six moves.

| Rank | Move | Cost | What it does | Data |
| --- | --- | --- | --- | --- |
| I | Fire Discipline (kept) | 0 | Aimed shots add no Heat; once a turn a Burst costs 2 AP (not 3); with a bow, Aimed +3 | `move_pool` `fire_discipline` |
| I | Speed Loader (kept) | 0 | first main-hand reload each turn −1 AP, min 1 | `cost_mod`, `when: cost`, `limit per_turn 1` (built) |
| II | Duck and Roll (kept) | a reaction | a ranged attack at you: step 1 tile before it is rolled; out of sight, no attack; into cover, −2 to hit | as built |
| II | Special Ammo (kept) | a reload, per rest | one magazine each of AP (×0.8, ignores armour), hollow-point (×1.3, armour doubled), incendiary (×0.9, Burning) | as built |
| III | Killzone (changed) | twice the shot's AP; **both reactions** | two held shots at the first two different enemies in the line, +2 each; with one reaction left, only one fires | text and `spend: 2` on the held shot |
| III | **Run and Gun** (new) | 0, once a turn | after an attack this turn, your next move of up to 2 tiles costs no AP and provokes no opportunity attack; your next shot this turn adds +1 Pressure | below |

Called Shot leaves for the Operative. **Squared and mixed classes** (Rev 4 4.3, the Gunslinger): **a sketch of the
shape only; no rule, primitive or number here may depend on it** (Leon, 13 Nov: the advanced classes may be shelved).

## 6. On what exists

**Built from:**

| Rule or move | The primitive |
| --- | --- |
| The count, rules 1 to 4 | `react(cb, u, {kind, event, spend, payer}, fn)` (P1): the `uses` cell (scope `reaction`) sized by stat `reactions` (`maxReactions`, `statQuery`); `cb.reacting` (rule 2); one per unit per event (rule 3) |
| Reflex | data `stat_mod` `reactions` +1 on the class (the stat Before the Blink answers) |
| Cue, Many Hands | `tactics.ts` `cueLive` over the same cell; Many Hands as P1's `payer` (the donor) |
| Rule 7 | P1's `kind`; the `suppressed` row's `forbid` with `kinds: [attack, move]` |
| Rule 8 | `rules.json forced_movement.*.reactions` |
| Killzone's two | `spend: 2` on the held shot, passed to `react()` where the Watch fires (`fireWatch`) |
| Speed Loader | `cost_mod` on `cost`, `if: {action: [reload], hand: [main]}`, `limit per_turn` (built) |
| Run and Gun's free move | `cost_mod` `set: 0` on `cost`, `if: {action: [move], flag: "fired"}`, `limit per_turn 1`; the flag from `mark` on trigger `attack_roll` with `if: {own_turn: true}`; cleared by `mark clear` on `turn_end` |
| Run and Gun's +1 Pressure | op `resource` on `hit`, `if: {flag: "ran"}`, then `mark clear`; the `actions.json resources.pressure` row (`on: target`, setter `addPressureTo`: batch row) |
| Run and Gun's no opportunity attack | `immune({u}, 'opportunity_attack')` (`effects/core.ts`), answered by a condition row `slipping` (1 move) whose `stat_mod` answers `immune:opportunity_attack` (P4) |
| The Riposte fold | the technique `riposte` (`answers.ts`) keeps the reaction; the Breaker's Momentum cost and Counter bonus are item ops on the class (`resource` −1 momentum and `roll_mod` on `attack`, `if: {mode: [riposte]}`); `fighter.riposte`'s handler is deleted |

**Needs a new primitive** (shapes in `rev4-primitives.md` only): **P1** `react()` with `kind`, `event`, `spend`,
`payer`, and its trigger `reaction` (Dance of Iron, Catch to data later); **P4** condition rows answer every stat
(`condtable.ts modsOf` keeps seven today, so `slipping` needs it); the batch row `pressure` (a resource row). `useReaction`,
`u.reactUsed` and `fighter.riposte` go; `lint-costs` counts any reaction path but `react()`.

**Migration:** `u.reactUsed` in an old save is read once into the `uses` cell (the `reactedRound` fallback already
exists); nothing else moves. Ids stay.

## 7. Balance

**A reaction attack** (rule 5) is one plain shot: **about 33%** of a rifle-turn (Overwatch's +2: 36%). A second trigger
comes in about 25% of rounds (Duck and Roll the only second user) to 50% (Overwatch held and a light blade or Dance of
Iron), an estimate: Reflex is worth **+8 to +17%** a round. Duck and Roll on it is defence (about 0.1 Soldier-turn).

**The lines (Leon's budget reading, 13 Nov):** the base class all in sits ON the ceiling: the Skirmisher's is the best
gun's **145**; the door all in 145 ÷ 1.15 = **126** (about 13% under); the door at a normal share 126 ÷ 1.25 = **101**.
(The squared column, 145 × 1.13 = 164, is not designed.)

| Skirmisher against the door, the same sheet (estimate, % of a rifle-turn) | Level 1 | 5 | 10 | 20 | Mean | Line | Off it |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Door all in (the plain rifle, measured, contract) | 129 | 113 | 112 | 101 | 114 | 126 | −10% |
| + Reflex (+12, the middle) | 141 | 125 | 124 | 113 | | | |
| + Speed Loader (1 AP in about 3 turns: +6) | 147 | 131 | 130 | 119 | | | |
| **Skirmisher all in** (+ Run and Gun's Pressure: Pressed a round sooner, about +3) | 150 | 134 | 133 | 122 | **135** | **145** | **−7%** |

Both sit inside ±12% of their lines, and level 1 (150 against 145, +3%) inside the per-level ±25%: the draft's
"+19% over the door, 3 to 5 points high" falls away on this reading. **Killzone** (4 AP for two +2 shots, a set-up
turn the target can waste: +10%) prices at 2 × 36 = 72% for 4 AP against 67% for two plain shots: inside. **The
dial** stays defined and unused: `rules.json reactions.second_hit` (new, 0), the to-hit of the second reaction's
attack; moved only if the measured Skirmisher passes 145 + 12%.

**Measure when built:** a `reflex` row in `defence-measure.ts` (pairs under fire: the range's target never acts),
levels 1 / 5 / 10 / 20, a policy that holds Overwatch.

## 8. The other side

Enemies keep one reaction; an Elite with Reflex is one data line. The AI learns to bait the first reaction with its
cheapest unit before crossing a held line, and that a Killzone wants two movers. Fire doctrine (rules 1.25): unchanged.

## 9. The screen

Reaction pips beside AP on the unit card (white ready, grey spent; two for the Skirmisher); the log names each ("Duck and
Roll (reaction 1 of 2)"); Killzone's card says "two reactions"; Run and Gun is a chip on the move preview. **Art:** a Run
and Gun icon (line); the emblem (`classIcons.ts`) fits.

## 10. Data

```json
{ "id": "run_and_gun", "name": "Run and Gun", "ap_cost": 0, "uses": "per_turn",
  "numbers": { "tiles": 2, "pressure": 1 },
  "text": "Once a turn, after you attack, your next move of up to {=numbers.tiles} tiles costs no AP and draws no opportunity attack, and your next shot this turn adds {=numbers.pressure} more Pressure.",
  "effects": [
    { "op": "mark", "when": "attack_roll", "flag": "fired", "if": { "own_turn": true } },
    { "op": "cost_mod", "when": "cost", "set": 0, "if": { "action": ["move"], "flag": "fired", "ap_above": 0 }, "limit": { "per": "per_turn", "n": 1 },
      "and": [ { "op": "condition", "condition": "slipping", "skip_save": true }, { "op": "mark", "flag": "ran" } ] },
    { "op": "resource", "when": "hit", "resource": "pressure", "value": 1, "target": "target", "if": { "flag": "ran", "own_turn": true }, "and": [ { "op": "mark", "flag": "ran", "clear": true } ] },
    { "op": "mark", "when": "turn_end", "flag": "fired", "clear": true } ],
  "adjudication": "engine", "provisional": true, "origin": "marksman", "attributes": ["agility"], "status": "active" }

{ "id": "reflex", "name": "Reflex", "ap_cost": 0, "uses": "at_will",
  "numbers": { "reactions": 1 },
  "text": "You have {=numbers.reactions} more reaction each round: two in all.",
  "effects": [ { "op": "stat_mod", "stat": "reactions", "value": 1 } ],
  "adjudication": "engine", "provisional": true, "origin": "marksman", "attributes": ["agility"], "status": "active" }
```

Run and Gun's 2-tile cap is a predicate `path_tiles_at_most` to add only if the move's price cannot carry it.
**Validator:** a text saying "reaction" has a reaction `kind` (`attack`, `move`, `protect`) and a `spend` of 1 or 2;
`reactions` stat_mods only on the Skirmisher and items that say so; the `suppressed` row forbids `attack` and `move` only.

## 11. Open questions for Leon

**Settled** (L = Leon; lead = the lead's call, which Leon can reverse):
1. **Killzone spends both of the Skirmisher's reactions** (L). 2. **A reaction never triggers a reaction** (L).
3. **Suppressed never blocks a protective reaction**, one rule for the condition and Pressure's state (lead; it
   replaces this draft's split; `data/conditions.json` changes as in section 2).
4. Keep one for Overwatch on by default; the two Ripostes become one (lead).
5. The budget reading (L): the Skirmisher all in on 145, the door on 126: Reflex is no longer over (section 7).
6. Run and Gun's "between two attacks" reads "after an attack" (lead). 7. The advanced classes are a sketch only (L).

**Still open:** none.
