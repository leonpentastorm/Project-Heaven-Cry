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

1. **The base branch is `claude/charming-gauss-hbq4n0`.** Start your own session branch from `origin/claude/charming-gauss-hbq4n0` **after the foundation lands** (section 3). Implementer C may start part 1 of their brief (item icons) straight away.
2. **Push only to your own branch.** Never push to the base branch, `develop` or `main`. Never deploy.
3. **Do not create a backup branch, and do not create any branch but your own.** There is exactly one backup of the live game for this whole job: `backup/live-0.17.0`. It already exists and nobody adds another.
4. **Do not bump the version and do not touch `CHANGELOG.md`.** The lead does both at the merge.
5. **Stay inside the files your brief gives you.** If you need a change outside them (a core helper, a data field, a spec line), write it under "Requests for the lead" in your result note and work around it locally. Do not edit the shared files yourself: that is what makes three branches merge cleanly.
6. **Do not regenerate `apps/web/src/game/protodata.json`.** It is one line long and two regenerations always conflict. The lead does it.
7. **Spec first is the lead's job.** You don't edit `docs/rules/PHC-Core-Rules-v1.0.md` or `data/*.json`. If a rule is unclear or two documents disagree, the order is: this plan, then your brief, then the proposals' "Leon's answers" sections, then the proposals' bodies. Then ask in your result note and pick the reading that keeps the technique simplest.
8. **Every number is a placeholder.** Read numbers from `data/techniques.json` (`numbers` on each technique, `rules` at the top) through the helper, never as a literal in code. The balance pass comes later and must only touch data.
9. **In-world names only** (the Unspoken Name). Plain words in every string a player reads.
10. **Bring the base in often** (`git merge origin/claude/charming-gauss-hbq4n0`), at least before you hand back.
11. **Checks before you hand back, all passing:** `npm test -w @phc/engine`, `npm test -w @phc/web`, `npx tsc --noEmit` in `packages/engine` and `apps/web`, `python3 tools/validate.py data`.
12. **Hand back** by pushing your branch with a result note at `docs/design/handoffs/physical-2.0-<A|B|C>-RESULT.md`: what is done, what is not, what you read differently from the brief, requests for the lead, and what you did not test. Tell Leon the branch name.
13. Commit trailer: `Co-Authored-By: Claude <noreply@anthropic.com>`.

## 3. Order of work

1. **Foundation (lead).** The spec section, `data/techniques.json` with all 57 techniques written out, the new weapon fields, the engine core in `packages/engine/src/physical/`, and six reference techniques that work end to end (Cut, Lunge, Coup, Riposte; Shot and Aimed Shot, Suppress, Dead Centre, Deny, Overwatch). When it is pushed, the line below is filled in.

   > **Foundation: not landed yet.** (The lead replaces this line with the commit when it is.)

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

## 5. The contract

Implementers code against this. Once the foundation lands, **the code is the contract** and this section is kept in step with it.

### 5.1 Data

`data/techniques.json` (lead):

```jsonc
{
  "kind": "techniques",
  "rules": {
    "momentum": { "max": 3, "fighter_max": 5, "variety_bonus": 1 },
    "pressure": { "max": 4, "player_max": 3, "elite_max": 3, "boss_max": 2,
                  "pressed": 2, "suppressed": 3, "broken": 4,
                  "decay": 1, "decay_hidden": 2, "decay_closing": 2, "melee_hit_sheds": 1,
                  "flank_bonus": 1, "kill_spill": 1, "kill_spill_range": 3, "take_cost": 2 },
    "ready": { "base": 3, "per_skill": 0.5 },
    "drill": { "per_kill": { "minion": 5, "soldier": 10, "elite": 25, "boss": 50 },
               "martial_mult": 3, "marks": [300, 900, 1800] },
    "off_home_penalty": 2
  },
  "items": [
    {
      "id": "lunge", "name": "Lunge",
      "system": "melee",            // melee | ranged
      "group": "opener",            // melee: opener strike link finisher answer; ranged: fire press set take watch
      "ap": { "base": "weapon", "add": 0 },   // or { "base": "flat", "value": 1 }
      "rounds": 0,                  // rounds fired; "all" for Mag Dump
      "needs": {},                  // { "momentum": 2 } | { "pressed": true } | { "hidden": true } | { "held": true } | { "last_round": true } | { "stowed": true }
      "text": "Step 1 tile toward the target, then strike. The step draws no opportunity attack.",
      "lines": [ { "prop": "point", "text": "+2 to hit." }, { "prop": "reach", "text": "The step may be 2 tiles." }, { "prop": "heavy", "text": "On a hit the target is pushed 1 tile." } ],
      "home": ["point"], "particular": false,
      "free": false,                // true: everyone knows it, no ready slot
      "comes_with": [],             // properties whose weapons always offer it (Burst and Rake: ["auto"])
      "numbers": { "step": 1, "point_hit": 2, "reach_step": 2, "heavy_push": 1 },
      "adjudication": "engine", "provisional": true
    }
  ]
}
```

`data/weapons.json` (lead): each weapon gains `"phys": { "props": ["light", "point"], "hits_with": "athletics", "scales_with": ["agility"], "teaches": "lunge" }`. The old `properties` and `category` fields stay (code matches them by name). A `grants` entry that became a property or a technique is removed; one that "stays on the item" is kept.

Property ids: `edge point blunt hook reach heavy light bare thrown` (melee) and `quick auto precise spread heavy blast arc silent loud drawn thrown` (ranged).

### 5.2 The engine module

Everything new lives under `packages/engine/src/physical/`:

| File | Owner | Holds |
|---|---|---|
| `core.ts`, `types.ts`, `data.ts`, `momentum.ts`, `pressure.ts`, `watch.ts`, `drill.ts`, `pad.ts`, `index.ts` | lead | the types, the registry, the helpers, the reducer entry points |
| `melee/openers.ts`, `strikes.ts`, `links.ts`, `finishers.ts`, `answers.ts`, `melee/index.ts` | A | the melee handlers |
| `ranged/fire.ts`, `press.ts`, `sets.ts`, `takes.ts`, `watches.ts`, `ranged/quiver.ts`, `ranged/thrown.ts`, `ranged/index.ts` | B | the ranged handlers, the quiver, thrown weapons |

The foundation creates every one of those files, with the reference techniques in place, so nobody has to touch an index outside their folder.

```ts
// ---- what a handler is given
export interface Tech {
  cb: Combat; u: Unit; c: Character | null;      // c is null for an enemy
  def: TechDef; w: WeaponDef; weaponId: string; hand: 'main' | 'off';
  args: TechArgs; tgt: Unit | null; rng: Rng;
  preview: boolean;                               // true: change nothing, roll nothing
  has(prop: string): boolean;                     // does the held weapon have this property (false off its home if particular)
  line(...props: string[]): string | null;        // the one matching property that applies: args.choice if given and valid, else the first match
  num(key: string, fallback?: number): number;    // def.numbers[key], then rules
  note(text: string): void;                       // a line for the preview card and the log
}
export interface TechArgs { hand?: 'main' | 'off'; targetId?: string; tile?: string; allyId?: string; choice?: string }

// ---- what a handler is
export interface TechHandler {
  id: string;
  check?(t: Tech): string | null;                 // a refusal in plain words, or null
  run(t: Tech): string | null;                    // do it (or, when t.preview, describe it); return a refusal or null
  react?: Partial<Record<HookName, (ctx: any, t: Tech) => void>>;   // Answers and Watches
  ai?(t: Tech): number;                           // how much an enemy wants this now (0: never); optional
}
export function technique(h: TechHandler): void;

// ---- helpers a handler calls (they all honour t.preview)
strike(t, opts?): StrikeResult    // one attack through previewAttack/resolveAttack. opts: { target, mult, extra, mode, critMin, ignoreArmour, ignoreCover, free, label, noMomentum, noPressure }
                                  // result: { ok, why, hit, crit, dmg, killed, pct }. Melee hits add Momentum and ranged hits add Pressure by the rules; you don't do that yourself.
momentumOf(u): number             spendMomentum(t): number            // Finishers: returns what was spent
pressureOf(u): number             pressureState(u): '' | 'under_fire' | 'pressed' | 'suppressed' | 'broken'
addPressure(t, target, n, why, opts?): number     // opts: { onMiss, hidden }. Honours caps, tiers, Guard, the Defender; returns what landed
lowerPressure(t, target, n): void
stop(t, target, how, opts?): boolean              // how: 'pinned' | 'push' | 'prone' | 'halt'. Honours Stopped once and the save; false if it didn't take
forceMove(t, target, dir, tiles, opts?): number   // dir: 'away' | 'toward' | a tile. Walks tile by tile so held Watches fire; returns tiles moved
save(t, target, skillsOrFamily, tnAdd?): boolean  // true if the target saved. ['guts','athletics'] means the better of the two
step(t, tiles, opts?): boolean                    // move the user as part of the technique. opts: { toward, noOA, noWatch }
cond(t, target, id, rounds?, opts?): boolean      // applyCond with the technique as the source
holdWatch(t, spec): void                          // Watches: spec { trigger: 'moves' | 'enters_tile' | 'attacks_ally' | 'acts', tile?, allyId?, targetId? }
spendRounds(t, n): boolean                        // rounds a technique burns beyond its rolls; false (and a refusal) if the weapon can't pay
wasSuppressed(t): boolean                         // Takes: was the target Suppressed when the Take began
hitByAlly(t, target): boolean                     // has an ally of the user hit this target this round
canAnswer(u, id): boolean                         // may this unit use this reaction now (protective ones work while Suppressed)
holdMomentum(t): void                             // Guard: Momentum doesn't drop at the end of this turn
autoBurst(t, target) / autoRake(t, aim)           // today's burst and full auto, for Auto weapons (Heat, rounds, Spray and Pray all as now)
```

The core also raises two moments that today have no hook, for Watches: `stood_up` and `left_cover`. And it asks two questions of the ranged folder, which implementer B answers: `beadHolds(target)` and `inSmoke(cb, u)`.

Reducer and screen entry points (lead):

```ts
previewTechnique(cb, u, id, args): TechPreview   // { ok, why, ap, rounds, attack?, attacks?, notes[], momentum?: {now, after}, pressure?: [{unit, add, state}], tiles?, save?: {skills, tn}, ends? }
useTechnique(cb, u, id, args, rng): string | null
techniquePad(cb, u, hand): PadGroup[]            // [{ group, label, entries: [{ id, name, ap, rounds, ok, why, line, lent, signature }] }]: what the screen draws; it never works a number out itself
```

Actions: `combat/technique { unitId?, id, hand?, targetId?, tile?, allyId?, choice? }`; out of a fight `phys/ready { charId, system, ids }`, `phys/pick { charId, weaponId, id }`, `phys/quiver { charId, weaponId, load }`; Proving Ground `sandbox/technique { charId, id, on }`, `sandbox/drill { charId, weaponId, amount }`.

### 5.3 State

All optional, all plain JSON.

- **Character helpers** (lead): `knownTechniques(c)`, `readyTechniques(c, system)`, `readyCap(c, system)`, `drillOf(c, weaponId)`, `drillMark(c, weaponId)`, `picksOwed(c, weaponId)`, `pickable(c, weaponId)`, `startingTechniquesError(sheet)`, `weaponProps(weaponId)`, `hitsWith(weaponId)`, `scalesWith(weaponId)`.
- **Character:** `phys?: { known: string[]; ready: { melee: string[]; ranged: string[] }; drill: Record<weaponId, number>; picks: Record<weaponId, number>; quiver: Record<weaponId, Record<ammoType, number>>; rev: number }`.
- **Unit:** Momentum is `res.momentum` / `resMax.momentum`, now on every unit. New: `pressure?: number`, `pressBy?: Record<unitId, string>`, `pressHidden?: number`, `stopped?: string`, `chain?: { n: number; last: string | null; ended: boolean }`, `watch?: WatchSpec & { id: string; hand: string; ap: number }`, `freeReload?: boolean`, `bead?: string`, `spot?: { by: string; until: string }`, `hitWith?: Record<unitId, string[]>` (which weapons have damaged this unit, for drill).

### 5.4 Effects events

The engine emits these; C draws and sounds them.

| Event | Payload |
|---|---|
| `technique` | `{ unit, id, group, system, target?, tiles?, hand }` |
| `momentum` | `{ unit, now, was }` |
| `pressure` | `{ unit, now, was, state, by, hidden? }` |
| `watch_set` / `watch_fire` | `{ unit, id, trigger, tile?, target? }` |
| `stopped` | `{ unit, how, by }` |
| `drill` | `{ char, weapon, add, total, mark? }` |

## 6. The lead's own work

1. **Spec:** rules revision 1.12 in `docs/rules/PHC-Core-Rules-v1.0.md`, with every placeholder number listed in section 14.
2. **Data:** `techniques.json` (all 57), the `phys` block on all 60 weapons, the validator, what happens to each weapon's old `grants`, and to `weapon_mastery.json`.
3. **Core:** the registry, `strike`, Momentum for everyone, the chain rules, Pressure and its states, Stopped once, protective reactions, the Watch framework (including Overwatch moved onto it without changing how wide it is), forced moves that set off Watches, `hits_with` and `scales_with`, drill and marks, known and ready lists, the pad, the reducer actions, the migration.
4. **The reference techniques** listed in section 3.
5. **Existing content that changes:** the Fighter's Lunge, Riposte and Finisher; Suppressed becoming Pressure 3 (Spray and Pray, and the two lines that make Suppressed cost AP and all reactions today); One Blade; the dry gun as a club.
6. **Enemies:** technique lists per stat block and the AI step that uses them; held Watches drawn for the players.
7. **Class twists** for both systems.
8. **The Narrator:** the glossary, the character brief and the fight report.
9. **Integration, review, version, merge, deploy.**
