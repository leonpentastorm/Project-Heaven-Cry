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
| 2 | **A reaction never triggers a reaction.** While a reaction resolves, no reaction window opens: its attack cannot be Parried, Riposted or Interposed, its move provokes nothing and sets off no Overwatch. | engine |
| 3 | **One event, one reaction a unit:** a single attack, step or hit can be answered once by each unit (a Skirmisher can't Duck and Roll and Parry the same shot). | engine |
| 4 | **More only from:** Reflex (the Skirmisher: 2), an item that says so (stat `reactions`: Before the Blink +1), a Call that gives one (Cue: exactly one, before the giver's next turn), the Gunslinger's break. | engine |
| 5 | **A reaction that attacks is a plain attack:** the weapon's plain shot or blow, no technique riders, no Smite, no Opener, unless the reaction's own text gives one (Riposte's Edge or Point +2; Overwatch's +2 when Precise). | engine |
| 6 | **Multi-shot held fire stays on one reaction:** an Overwatch held with a Burst fires its rounds on one reaction (`owShots`). **Killzone** is two held shots at two enemies: **two reactions**. | engine |
| 7 | **Suppressed:** the condition Suppressed (`conditions.json`, `forbid: reaction`) takes every reaction. Pressure's Suppressed state (3 Pressure) takes only attacking and moving reactions; Parry, Shield Wall and Interpose still work (`canAnswer`, as built). Stunned, Downed, Dread underfoot: none. | engine |
| 8 | **Forced movement provokes nothing** (`rules.json forced_movement`, `reactions: false` for every kind): stays. | engine |
| 9 | **Spent on a Many Hands donor** counts on the donor. **Order** (Authority's Call) spends the ally's reaction. A Call made as a reaction (9 points) spends the speaker's. | engine |
| 10 | **Policies:** a reaction that fires by itself (Riposte, Duck and Roll, Shrug It Off, Interpose) keeps its on/off policy; with two reactions the Skirmisher also sets **Keep one for Overwatch** (on by default): automatic reactions leave the last one while a shot is held. | engine |

**Edge cases.** Sight: a reaction needs its own sight of the trigger (`unitSees`); a Hidden mover draws none. Downed: none.
Co-op: each unit counts its own. Saves: the count is a `uses` cell, saved. Fight end: nothing carries. The area map: the
cell lives in the story (`SCOPES.reaction.map`), so a rebuilt unit gets no fresh reaction each action.

## 3. Everything that is a reaction today, and what it spends

All found by grep for `useReaction` / `canReact` (`packages/engine/src`) and for "reaction" in data texts.

| Reaction | Where | Spends today | Under the rule |
| --- | --- | --- | --- |
| Opportunity attack | `combat.ts` move walk (`opportunityStrike`) | 1 | 1; a plain blow |
| Overwatch (a Burst's rounds too), Deny, Cover Me, Dead to Rights | `combat.ts` `triggerOverwatch`; `watches.ts` `fireWatch` | 1 | 1 |
| Killzone (two held shots) | `classes.json` move pool `killzone`; `tactics.ts` `payHeldShot` | 1 for both (fixed 13 Nov) | **2** (rule 6) |
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
| III | Killzone (changed) | twice the shot's AP; **two reactions** | two held shots at the first two different enemies in the line, +2 each; with one reaction left, only one fires | text and `reactions_spent: 2` |
| III | **Run and Gun** (new) | 0, once a turn | after an attack this turn, your next move of up to 2 tiles costs no AP and provokes no opportunity attack; your next shot this turn adds +1 Pressure | below |

Called Shot leaves for the Operative. **Squared, the Gunslinger, breaks:** "a reaction is spent when used": with a pistol
its first reaction each round is free (rule 2 holds). **Bridges:** Banner Dancer (Pressure + Bonds): your reactions may
answer for a Bonded ally; Spellslinger (Pressure + Sigils): a glyph loaded into the magazine rides the held shot.

## 6. On what exists

**Built from:**

| Rule or move | The primitive |
| --- | --- |
| The count (rules 1, 4) | `effects/uses.ts`: one unit-level key, `uses(unit).take('reaction', maxReactions(u), 'react')` in the `reaction` scope that exists; `maxReactions` reads stat `reactions` (`statQuery`) |
| Reflex | data `stat_mod` `reactions` +1 on the class (the stat Before the Blink answers) |
| Cue, Many Hands | `tactics.ts` `cueLive`, `reactionDonor`, re-expressed over the same key |
| Rule 7 | the `suppressed` row's `forbid: reaction`; `canAnswer`'s protective list |
| Rule 8 | `rules.json forced_movement.*.reactions` |
| Killzone's two | its `grant_action` gains `"reactions_spent": 2`, read where the Watch fires (`fireWatch`) |
| Speed Loader | `cost_mod` on `cost`, `if: {action: [reload], hand: [main]}`, `limit per_turn` (built) |
| Run and Gun's free move | `cost_mod` `set: 0` on `cost`, `if: {action: [move], flag: "fired"}`, `limit per_turn 1`; the flag from `mark` on trigger `attack_roll` with `if: {own_turn: true}`; cleared by `mark clear` on `turn_end` |
| Run and Gun's +1 Pressure | op `resource` on `hit`, `if: {flag: "ran"}`, then `mark clear`; Pressure itself through `addPressureTo` (`physical/pressure.ts`, its filters and caps) |
| Run and Gun's no opportunity attack | `immune({u}, 'opportunity_attack')` (`effects/core.ts`), answered by a condition row `slipping` (1 move) through stat `immune:opportunity_attack` |
| The Riposte fold | the technique `riposte` (`answers.ts`) keeps the reaction; the Breaker's Momentum cost and Counter bonus are item ops on the class (`resource` −1 momentum and `roll_mod` on `attack`, `if: {mode: [riposte]}`); `fighter.riposte`'s handler is deleted |

**Needs a new primitive:**
1. **`react(cb, u, kind, event, fn)`** in `tactics.ts`, the one door every reaction goes through (the 13 files of
   section 3): `canReact` → the `reaction_window` hook (exists) → take the `uses` key → mark the fight `reacting` while
   `fn` runs (rule 2: `canReact` is false while it is set) → one reaction per unit per event id (rule 3). `useReaction`
   and `u.reactUsed` are removed; a lint (`lint-costs`) counts calls to anything else.
2. **Trigger `reaction`** for the item-op runner (`effects/triggers.ts`): "a unit spends a reaction" (actor, the kind),
   so perks like Dance of Iron and Catch move to data later.
3. **`resource: "pressure"`** in the `resource` op: Pressure is not a `res` meter (`pressureOf` reads `u.pressure`); the
   op routes it to `addPressureTo`, so any item can add Pressure from data.
4. **Condition rows answer stats:** `condtable.ts` passes a row's `stat_mod` with a `stat` id to `statQuery` (needed for
   `slipping`; if it does already, nothing to add).

**Migration:** `u.reactUsed` in an old save is read once into the `uses` cell (the `reactedRound` fallback already
exists); nothing else moves. Ids stay.

## 7. Balance

**A reaction attack** (rule 5) is one plain shot: **about 33%** of a rifle-turn (Overwatch's +2: 36%). A second trigger
comes in about 25% of rounds (Duck and Roll the only second user) to 50% (Overwatch held and a light blade or Dance of
Iron), an estimate: Reflex is worth **+8 to +17%** a round. Duck and Roll on it is defence (about 0.1 Soldier-turn).

| Skirmisher against the door, the same sheet (estimate, % of a rifle-turn) | Level 1 | 5 | 10 | 20 |
| --- | --- | --- | --- | --- |
| Door all in (the plain rifle, measured, contract) | 129 | 113 | 112 | 101 |
| + Reflex (+12, the middle) | 141 | 125 | 124 | 113 |
| + Speed Loader (1 AP in about 3 turns: +6) | 147 | 131 | 130 | 119 |
| + Run and Gun's Pressure (Pressed a round sooner: −1 to hit on its fire, about +3) | 150 | 134 | 133 | 122 |
| Over the door | +16% | +19% | +19% | +21% |

Against the budget (+15%) and the best-gun ceiling (145): about **+19%, 3 to 5 points high**, and level 1 over 145 by 5.
**Killzone** (4 AP for two +2 shots, a set-up turn the target can waste: +10%) prices at 2 × 36 = 72% for 4 AP against
67% for two plain shots: inside. **The dial:** `rules.json reactions.second_hit` (new, 0): the to-hit of the second
reaction's attack; −2 takes Reflex to about +8 and the class to +15%. Measure first; cut only if over.

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
**Validator:** a text saying "reaction" has a reaction kind or `reactions_spent` (1 or 2); `reactions` stat_mods only on
the Skirmisher and items that say so.

## 11. Open questions for Leon

1. **Killzone spends both reactions** (the data says one). Assumed.
2. **Rule 7's split:** condition Suppressed takes all, Pressure's only attacking and moving ones (as built). Assumed.
3. **Keep one for Overwatch** is on by default; **the two Ripostes become one.** Assumed.
4. **Reflex is about 4 points over budget**; the dial waits for the measure. Assumed.
5. **Run and Gun's "between two attacks" reads "after an attack"** (the engine can't know a second attack is coming). Assumed.
