# Physical 2.0: the plan and the contract

Written 10 Nov 2026 by the lead session (the merger and checker). For Leon and for the three implementer sessions.

**Physical 2.0** gives the Body side what Sigils, Outbursts and faith already have: a technique system for melee weapons and one for ranged weapons, where anyone can pick up any weapon and mix and match what they know. It will be **rules revision 1.12** and ships as one version (0.18.0 unless another branch merges first).

- Melee design: [`../proposals/2026-11-melee-techniques.md`](../proposals/2026-11-melee-techniques.md) (read section 10 too: Leon's answers win).
- Ranged design: [`../proposals/2026-11-ranged-techniques.md`](../proposals/2026-11-ranged-techniques.md) (read sections 10 and 11 too).
- What the code looks like today, with file and line references: [`physical-2.0-code-map.md`](physical-2.0-code-map.md).

## 1. Who does what

| Who | Brief | Owns |
|---|---|---|
| **Lead** (this session) | section 6 below | the spec, the data, the engine core, the enemy AI, class twists, migrations, the Narrator's context, every merge, the version, the deploy |
| **Implementer A: melee** | [`physical-2.0-A-melee.md`](physical-2.0-A-melee.md) | 23 melee technique handlers and their tests |
| **Implementer B: ranged** | [`physical-2.0-B-ranged.md`](physical-2.0-B-ranged.md) | 25 ranged technique handlers, the quiver, thrown weapons, and their tests |
| **Implementer C: client** | [`physical-2.0-C-client.md`](physical-2.0-C-client.md) | everything on screen: item icons, the Attack tab and its pads, pips, the sheet, creation, the Proving Ground tools, effects and sounds, browser tests |

**Settings for Leon** (all three are Opus 5.5):

| Implementer | Effort | Ultracode | Why |
|---|---|---|---|
| A: melee | high | **on** | 23 small, independent units in five files by kind. Fanning out and having each one checked against the proposal text is exactly what it is for. |
| B: ranged | **xhigh** | **on** | The same shape, but it touches more of what already exists (Heat, Recoil, magazines, Overwatch, Suppressed, grenades, the quiver), and the Watches run on the enemy's turn. |
| C: client | high | **off** | One screen and three hot files (`combat.js`, the combat template, `commands.ts`). Parallel agents would collide there, and the work needs one head looking at screenshots. |

## 2. Rules for all three implementers

1. **The base branch is `claude/charming-gauss-hbq4n0`, and the foundation is on it** (section 3). Your session already has its own branch: bring the base into it with `git fetch origin claude/charming-gauss-hbq4n0 && git merge origin/claude/charming-gauss-hbq4n0`, check that section 3 below names a commit, and work there.
2. **Push only to your own branch.** Never push to the base branch, `develop` or `main`. Never deploy.
3. **Do not create a backup branch, and do not create any branch but your own.** There is exactly one backup of the live game for this whole job: `backup/live-0.17.0`. It already exists and nobody adds another.
4. **Do not bump the version and do not touch `CHANGELOG.md`.** The lead does both at the merge.
5. **Your own files are yours; shared files take additive edits only.** The files your brief gives you are yours to write freely. Everything else in the engine (`combat.ts`, `game.ts`, `magic.ts`, `tactics.ts`, `physical/core.ts`, `types.ts`, `pressure.ts`, `rules.ts`, `data.ts`) is shared: when a technique needs something that isn't there, you may add it yourself if it is **small and additive**: a new field on a hook's context, a new optional field on `Unit`, a new hook raised at a moment that had none, a new option on a helper that defaults to today's behaviour, a new exported helper. You may **not** change what existing code does, rename anything, reorder anything, or reformat a line you aren't changing. Keep each such edit to a few lines, and **list every one in your result note** (file, what, why) so the merge knows where to look. A bigger change (a rule in the core that is wrong, a data field, a spec line) goes under "Requests for the lead", and you work around it. `data/*.json` stays the lead's, except that A and B fill in the `numbers` of their own techniques in `data/techniques.json` (placeholders, `provisional: true`) and change nothing else there.
6. **Do not regenerate `apps/web/src/game/protodata.json`.** It is one line long and two regenerations always conflict. The lead does it.
7. **Spec first is the lead's job.** You don't edit `docs/rules/PHC-Core-Rules-v1.0.md` or `data/*.json`. If a rule is unclear or two documents disagree, the order is: this plan, then your brief, then the proposals' "Leon's answers" sections, then the proposals' bodies. Then ask in your result note and pick the reading that keeps the technique simplest.
8. **Every number is a placeholder.** Read numbers from `data/techniques.json` (`numbers` on each technique, `rules` at the top) through the helper, never as a literal in code. The balance pass comes later and must only touch data.
9. **In-world names only** (the Unspoken Name). Plain words in every string a player reads.
10. **Bring the base in often** (`git merge origin/claude/charming-gauss-hbq4n0`), at least before you hand back.
11. **Checks before you hand back, all passing:** `npm test -w @phc/engine`, `npm test -w @phc/web`, `npx tsc --noEmit` in `packages/engine` and `apps/web`, `python3 tools/validate.py data`.
12. **Hand back** by pushing your branch with a result note at `docs/design/handoffs/physical-2.0-<A|B|C>-RESULT.md`: what is done, what is not, what you read differently from the brief, requests for the lead, and what you did not test. Tell Leon the branch name.
13. Commit trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`.

## 3. Order of work

1. **Foundation (lead).** `data/techniques.json` with all 58 techniques written out (27 melee, 31 ranged), the `phys` block on every weapon, the engine core in `packages/engine/src/physical/`, the reducer actions, and ten reference techniques that work end to end (Cut, Lunge, Coup, Riposte; Shot, Aimed Shot, Suppress, Dead Centre, Overwatch, Deny), with their tests in `packages/engine/test/phys-core.test.ts`.

   > **Foundation: landed, commit `9851b9f` on `claude/charming-gauss-hbq4n0` (10 Nov 2026).** Every old action still works beside the new ones (`combat/attack` with its modes, `combat/overwatch`, `combat/skill`, `combat/shove`, `combat/brace`, the weapon `grants`): nothing is removed until integration, so the game stays playable on every branch. The lead keeps adding to the core on the base branch while you work (the spec section, damage scaling, enemy technique lists, the quiver on the unit, hiding Silent pips in the view): merge the base in often.

2. **A, B and C in parallel,** each on their own branch from the foundation.
3. **Integration (lead).** Merge the three branches into the base, run every check and a review of the whole diff, fix what it confirms, then enemy lists and class twists on the full set.
4. **Live (lead).** Version, changelog, `develop`, `main`, deploy. Roll back to `backup/live-0.17.0` if the live check fails.

## 4. Readings the lead settled (provisional; Leon may overrule any of them)

The proposals leave these open. They are in the spec as provisional items.

1. **A weapon lends its signature.** While you hold a weapon, its signature technique is usable without knowing it and without a ready slot, as today's weapon skill is. Drill makes it yours: then it is a card you can ready with any weapon.
2. **Auto weapons always offer Burst and Rake** (today's fire modes), known or not. Nothing else comes with a property.
3. **Drill is an XP bar per weapon type.** A kill gives drill for a weapon if you damaged that target with that weapon in this fight: minion 5, soldier 10, elite 25, boss 50. The Body classes (Defender, Fighter, Marksman) earn it at ×3.
4. **Three marks on each bar,** at 300, 900 and 1,800 drill. Mark I teaches the weapon's signature. Marks II and III each give one pick of any technique of that weapon's system. They replace the three mastery perks a weapon family had.
5. **What everyone knows:** Cut; Shot, Aimed Shot, Overwatch. Reload is an action, not a technique.
6. **At creation** a character with Raw Power or Athletics picks 2 melee techniques (one must be an Opener), and one with Dexterity picks 2 ranged techniques. A character from before 1.12 gets Lunge and Sidestep, and Suppress and Shift, on load.
7. **Ready lists:** one per system, 3 + half the attack skill rounded down (melee: the better of Raw Power and Athletics; ranged: Dexterity). Changed out of a fight only.
8. **Off its home.** A technique marked `particular` (Sweep, Cleave, Run Through, Throw Down; Rake, Lob, Mag Dump, Dead Centre) used with a weapon that has none of its `home` properties is at −2 to hit and gets no property line.
9. **Damage scaling.** A weapon's damage multiplier is 1 + 0.1 × (the `scales_with` Attribute − 1) + 0.05 × the `hits_with` skill. Bare weapons use Strength, and add 0.05 × both Raw Power and Athletics. Bows keep Raw Power in their base damage.
10. **Enemies** have Momentum (cap 3) and can be Pressed, Suppressed and Broken. They use techniques from a short list on their stat block.
11. **Pressure and Momentum exist in fights only,** not on the area map.
12. **The quiver** (Leon): a bow's quiver is loaded from a menu out of a fight, up to the weapon's capacity, in any mix of arrow types you carry. In a fight you pick the type for each shot from what is loaded. A bow can't be reloaded in a fight.
13. **Becoming Pressed drops a held Watch** (confirmed by Leon). A Watch can't be set while Pressed (the proposal); reaching Pressed ends one already held. It is how a held lane is taken back: Suppress the watcher.
14. **Suppress gives 2 Pressure in all on a hit,** not 2 on top of the ordinary 1 (the proposal's example turn ends at Pressure 2). A technique that states its own Pressure for a hit replaces the ordinary +1 (`noPressure` on its strike, then `addPressure`).
15. **A Take's own hit adds no Pressure.** The core lowers the target by 2 after the effect.
16. **The fall of Pressure at a turn's end is one number, not a sum:** 2 if the unit is in cover and unseen, or ended closer to the nearest enemy than it began; otherwise 1.
17. **The first melee technique of a turn earns no variety bonus** (there is no last technique to differ from). An off-turn strike (Riposte) starts no chain.
19. **The Parlour pistol teaches Crossfire** (confirmed by Leon): Warning Shot can't be used with a Silent weapon. **Weapon mastery is retired** with its attack bonus (confirmed by Leon): drill replaces it.
18. **A handler that refuses must refuse before it changes anything.** The core runs the preview first and refuses on what it says, so a refusal costs nothing; a `run` that still returns a refusal gets its AP back.

## 5. The contract

**The code is the contract.** Read these, in this order; they are short and commented:

| File | What it is |
|---|---|
| `packages/engine/src/physical/types.ts` | `TechDef`, `TechArgs`, `Tech` (what a handler is given), `TechHandler`, `StrikeOpts`, `TechPreview`, `PadEntry`, `WatchSpec` |
| `packages/engine/src/physical/core.ts` | the registry, who may use what, `strike`, every helper, `previewTechnique` / `useTechnique` / `techniquePad` / `physView` |
| `packages/engine/src/physical/pressure.ts`, `rules.ts` | the Pressure meter; the standing rules of both meters, as listeners on the fight's hooks |
| `packages/engine/src/physical/data.ts` | the data, weapon properties, and a character's techniques (known, ready, drill, picks) |
| `packages/engine/src/physical/melee/*.ts`, `ranged/*.ts` | the handlers. The reference techniques are in place: copy their shape. `shared.ts` in each folder re-exports what a handler needs |
| `packages/engine/test/phys-core.test.ts`, `test/helpers/physfight.ts` | how to test one |

### 5.1 Data

`data/techniques.json`: `rules` (every shared number: Momentum, Pressure, ready slots, drill, the off-home penalty, the stop save) and 58 `items`. One item:

```jsonc
{ "id": "lunge", "name": "Lunge", "system": "melee", "group": "opener", "number": 1,
  "ap": { "base": "weapon", "add": 0 },   // or { "base": "flat", "value": 1 }, or { "base": "reaction" } for an Answer
  "rounds": 0,                            // rounds it burns in all; "all" for Mag Dump
  "needs": {},                            // { "momentum": 2 } | { "pressed": true } | { "hidden": true } | { "last_round": true } …
  "text": "Step 1 tile toward the target, then strike. The step draws no opportunity attack.",
  "trigger": "…",                         // Answers and Watches
  "suppressed": "…",                      // Takes: the stronger line against a Suppressed target
  "lines": [ { "props": ["point"], "text": "+2 to hit." },
             { "props": ["heavy"], "when": "braced", "text": "…" },        // when: only if the user is Braced, Prone or Emplaced
             { "props": ["edge", "point"], "match": "any", "text": "…" } ],  // optional: "ap": 1 (added cost), "stack": true (applies as well as the chosen line)
  "free": false,                          // true: everyone knows it, no ready slot (Cut, Shot, Aimed Shot, Overwatch)
  "comes_with": [],                       // weapons with one of these properties always offer it (Burst, Rake: ["auto"])
  "home": [], "particular": false,        // particular + none of the home properties: −2 to hit and no property line
  "not_with": [],                         // properties whose weapons can't use it at all
  "aim": "enemy",                         // what the player picks: enemy | tile | ally | self | none | enemy+tile
  "numbers": { "step": 1, "point_hit": 2, "reach_step": 2, "heavy_push": 1 },   // read with t.num('key', fallback)
  "adjudication": "engine", "provisional": true }
```

The reference techniques have their `numbers` filled in. **A and B fill in the `numbers` of their own techniques** as they build them (the same placeholder a reader would take from the text; `t.num('key', fallback)` with the same fallback), and touch nothing else in the file.

`data/weapons.json`: every weapon has `"phys": { "system", "props", "hits_with", "scales_with", "also_scales"?, "teaches"? }`. The old `properties`, `category`, `modes` and `grants` stay until integration.

Properties: `edge point blunt hook reach heavy light bare thrown` (melee) and `quick auto precise spread heavy blast arc silent loud drawn thrown` (ranged). `rules.props` has a one-line meaning for each, for a "?".

### 5.2 A handler

```ts
technique({
  id: 'cut',
  check(t) { return null; },              // optional: a refusal in plain words before anything else
  run(t) {                                // the card and the action are this one function: t.preview is true for the card
    const p = t.line('edge', 'point', 'blunt');           // the one property line that applies (the player's choice, or the first held)
    const r = strike(t, { extra: p === 'point' ? t.num('point_hit', 1) : 0 });
    if (!r.ok) return r.why || 'Can\'t attack that.';      // a refusal: nothing is spent
    if (r.hit && r.crit && !r.killed && p === 'edge') cond(t, r.target!, 'bleeding');
    return null;
  },
  react: { on_miss(ctx, t) { … } },       // Answers and Watches: the core calls this on the hook (never in a preview)
  ai: (t) => 5,                           // enemies: how much it wants this now against t.tgt (a plain attack is 5; 0: never). Pure.
});
```

What the core does for you, so a handler doesn't:

| | |
|---|---|
| Who may use it | free, ready, lent by the held weapon (`teaches`), or coming with a property; an enemy uses `u.techs`. `t.c` is the character, **null for an enemy or a companion**: every handler must work with it null |
| AP | charged before `run` (weapon cost, flat, or 0 for a reaction; plus a line's `ap`). `strike` never charges AP |
| Melee | an Opener only first; a Finisher needs Momentum (`needs.momentum`), and ends the chain; +1 Momentum for each strike that hits and +1 once a technique when it differs from the last one this turn |
| Ranged | rounds checked against the magazine; a Press adds 1 Heat; a Take needs a Pressed target, is one a turn, and lowers the target's Pressure by 2 after `run`; a Watch is refused while Pressed |
| A ranged hit | +1 Pressure, the first on each target each turn (+1 more past cover the target is using; 2 when unseen with a Silent weapon, hidden from the target) |
| Off its home | −2 to hit and `t.line()` / `t.has()` answer no; `t.holds(prop)` still tells the truth |
| Previews | `strike` and every helper record what would happen and change nothing; `t.state()` is a copy |

The helpers (all in `core.ts`, all honour `t.preview`):

```ts
strike(t, opts?): StrikeResult        // one attack through the engine's pipeline: { ok, why, hit, crit, dmg, killed, pct, target }
                                      // target is the unit really struck (an attack can be redirected): put riders on r.target, not on t.tgt
                                      // opts: target, mode ('aimed'), mult, extra, critMin, critOnHit, ignoreArmour, ignoreCover, reach, label, noMomentum, noPressure
canStrike(t, target, mode?)           // could the attack be made now (range, sight, ammunition)
landed(t, n?)                         // a technique that worked without a damaging strike (Feint, a Link): Momentum +n and the variety bonus
spendMomentum(t)  momentumOf(u)  holdMomentum(t)
setUp(t, target, { hit?, noAnswer?, label?, only? })      // a mark on the user's next technique against that target this turn
save(t, target, skills | 'body' | 'brain' | 'heart', tnAdd?)   // true: it saved (TN rules.stop_tn; the better of the skills)
cond(t, target, id, rounds?, { save? })                  // a condition with the technique as its source
stop(t, target, 'pinned' | 'push' | 'prone' | 'halt' | [...], { tiles, rounds, save, tnAdd, apLoss, from })
                                      // one call = one save (Guts or Athletics unless save: false or a list) and, from a ranged technique, Stopped once
forceMove(t, target, 'away' | 'toward' | tile, tiles, { from })   // tile by tile: held Watches and Overwatch fire
stepUser(t, route)  stepsWithin(t, n)  approach(t, target, maxTiles)  standingAt(t, tile, fn)  stepBlock(t)   // moving the user inside a technique
                                      // (the engine's own move, free and without opportunity attacks: a Pinned user doesn't step, traps and held shots fire)
holdWatch(t, spec)  fireWatch(t, ctx, target, fn, kind?)  endWatch(cb, u, why)   // Watches
answer(t, against, fn)  canAnswer(cb, u, id, against?)                           // Answers; Parry is protective (works while Suppressed)
spendRounds(t, n)                     // rounds burned beyond the rolls (strike spends one a roll)
addPressure(t, target, n, why, { hidden? })  lowerPressure(t, target, n)  wasSuppressed(t)  hitByAlly(t, target)
techState(u, id) / t.state()          // per-technique state on a unit, plain JSON, saved with the fight
```

For rules that stand outside one use of a technique (a held lane, a Bead, smoke): listen on the fight's hooks with `onHook(name, (ctx, cb) => …)` from your own file, as `ranged/press.ts` does for Suppress's lane, and keep the state on the unit with `techState`. Two registries take the place of the questions the first draft had the core ask: `pressureDecay((cb, u, fall) => fall)` (a Bead holding Pressure: return 0; smoke: return 2) and `pressureFilter((cb, target, n, by, why) => n)` (Guard, the Defender's wall: return what still lands).

### 5.3 Actions

| Action | |
|---|---|
| `combat/technique { unitId, id, hand?, targetId?, targetIds?, tile?, allyId?, allyIds?, line?, ammo?, opt?, item? }` | a technique in a fight. `line`: the property to use when two lines match; `ammo`: an arrow or special round type; `opt`: an outcome the text offers; `tile` may be a map reference ("C5") or "x,y" |
| `phys/ready { charId, system, ids }` | the ready list of a system (out of a fight; cap `readyCap`) |
| `phys/pick { charId, weaponId, id }` | take a pick a drill mark gave |
| `phys/quiver { charId, weaponId, load }` | fill a bow's quiver (B writes the loader and registers it with `quiverLoader`) |
| `phys/answers { charId, ids \| null }` | the Answers this character will use, in order (null: every ready one) |
| `sandbox/technique { charId, id \| 'all', forget?, ready? }`, `sandbox/drill { charId, weaponId, amount }`, `sandbox/meter { unitId, momentum?, pressure? }` | the Proving Ground |

A sheet may carry `techniques: { melee: [..], ranged: [..] }` (creation's picks; `startingTechniquesError` checks them at `char/add`); without it a character has the defaults.

### 5.4 What the screen reads

**Pass the game as the last argument** to the three screen functions (`techniquePad(cb, u, hand, g)`, `previewTechnique(cb, u, id, args, g)`, `physView(cb, u, side, g)`): the character behind a unit is found through the game, and the screen calls the engine with none bound. Without it a player's unit reads as an enemy (a short pad, wrong off-hand numbers) and nothing errors.

`techniquePad(cb, u, hand, g)`: the groups and entries for one held weapon (`ok`, `why`, `ap`, `rounds`, `line`, `choices`, `lent`, `signature`, `plain`, `built`). `previewTechnique(cb, u, id, args)`: the card (`attacks[]` with each roll's `AttackPreview`, `momentum`, `pressure[]`, `moves[]`, `saves[]`, `area`, `notes[]`, `ends`). `physView(cb, u, viewerSide)`: a unit's Momentum, Pressure pips as that side may see them, its state word and cost, who is pressing it, Stopped once, and the Watch it holds. Character side: `physOf`, `knownTechniques`, `readyTechniques`, `readyCap`, `drillOf`, `drillMark`, `drillMarks`, `picksOwed`, `pickable`, `startingTechniqueSlots`, `startingTechniqueChoices`, `weaponProps`, `propText`, `groupsOf`, `groupName`. All exported from `@phc/engine` (and everything under `phys`).

State (all optional, plain JSON): on the character `phys: { known, ready: { melee, ranged }, drill, picked, quiver, answers?, rev }`; on the unit `res.momentum` / `resMax.momentum` (now for everyone holding a melee weapon), `pressure`, `pressHidden`, `pressBy`, `hitRound`, `hitWith`, `stopped`, `watch`, `chain`, `tech`, `setUp`, `techs`, `quiver`, `freeReload`.

### 5.5 Effects events

| Event | Payload |
|---|---|
| `technique` | `{ unit, id, group, system, target, tile, hand, at, reaction? }` (an Answer has `reaction: true`) |
| `momentum` | `{ unit, now, was }` |
| `pressure` | `{ unit, at, now, was, state, by, why, hidden? }` |
| `watch_set` | `{ unit, at, id, trigger, tile, tiles, allyId, targetId }` |
| `watch_fire` | `{ unit, target, from, at, id }` (Overwatch fires as today's `overwatch` event instead, with `id`) |
| `watch_end` | `{ unit, at, id, why }` (`turn`, `Pressed`, `replaced`, …) |
| `stopped` | `{ unit, how, by }` |
| `drill` | `{ unit, at, weapon, add, total, mark, learned }` |

The strikes inside a technique are the engine's ordinary `melee` and `shot` events.

### 5.6 What each old action becomes (at integration, by the lead)

| Today | Becomes |
|---|---|
| `combat/attack` shot, aimed, melee | Shot, Aimed Shot, Cut (the plain row on each weapon's block calls the technique) |
| `combat/attack` burst, auto | Burst and Rake (B), offered by every Auto weapon |
| `combat/overwatch` | the Overwatch technique |
| `combat/skill` (a weapon's `grants`) | the weapon's signature technique, or its property; the few that "stay on the item" keep the action |
| `combat/shove`, `combat/brace` | the Shove Link (A) and the Brace Set (B) |
| `combat/throw` | stays for a character who knows no techniques; Lob throws a grenade as a technique (B) |
| weapon mastery perks | the three drill marks |

## 6. The lead's own work

1. **Spec:** rules revision 1.12 in `docs/rules/PHC-Core-Rules-v1.0.md`, with every placeholder number listed in section 14.
2. **Data:** `techniques.json` (all 58), the `phys` block on all 60 weapons, the validator, what happens to each weapon's old `grants`, and to `weapon_mastery.json`.
3. **Core:** the registry, `strike`, Momentum for everyone, the chain rules, Pressure and its states, Stopped once, protective reactions, the Watch framework (including Overwatch moved onto it without changing how wide it is), forced moves that set off Watches, `hits_with` and `scales_with`, drill and marks, known and ready lists, the pad, the reducer actions, the migration.
4. **The reference techniques** listed in section 3.
5. **Existing content that changes:** the Fighter's Lunge, Riposte and Finisher; Suppressed becoming Pressure 3 (Spray and Pray, and the two lines that make Suppressed cost AP and all reactions today); One Blade; the dry gun as a club.
6. **Enemies:** technique lists per stat block and the AI step that uses them; held Watches drawn for the players.
7. **Class twists** for both systems.
8. **The Narrator:** the glossary, the character brief and the fight report.
9. **Integration, review, version, merge, deploy.**
