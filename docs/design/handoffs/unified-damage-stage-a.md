# One damage formula, stage (a), steps a0 to a3 (12 Nov 2026)

The first four steps of the migration in [`../proposals/2026-11-unified-damage.md`](../proposals/2026-11-unified-damage.md)
(section 2.8): a **re-expression in which no number moves**. Steps a4 to a7 and all of stage (b) are not started.

## 0. The result in six lines

1. **a0, the golden tables: done.** 5,327 fixed actions in 4,881 lines, 12 files, exact, in `npm run check`.
2. **a1, `effects/output.ts`: done.** One module, the profiles and the Level table in `data/rules.json` `output`.
3. **a2, weapons: done.** `attackDamage` (so every weapon attack and all 65 techniques) builds its number in the module.
4. **a3, one armour function and one way in: done.** `harm` and `hurtUnit` are `deal`; armour is read in one function.
5. **Proof.** The 12 tables, as committed, pass on the tree as it is AND on the engine source of commit `e45e52a`
   (before `output.ts` existed), copied out and run apart. Not one line differs.
6. **Nothing was stopped.** No step needed a number to move. Three places where today's behaviour is odd were kept
   exactly as they were and are listed for a ruling (section 5).

`npm run check`: ALL GREEN (validator 0 errors; engine 3,361 passed; web 989 passed).

## 1. a0: the golden tables

**Files.** `packages/engine/test/golden/harness.ts` (how an action is read), `record.ts` (the list of actions),
`compare.ts` (compare or record), twelve `*.json` tables, and seven test files `test/golden-damage*.test.ts` (split so
they run side by side: about 15 s of CPU, 4 to 8 s on the clock inside the suite).

**How a number is read.** Nothing in the engine is wrapped. A line holds what the engine's own hooks saw and what
changed on the units:
`o:` the amount before armour (`damage_out`: base + flat × own multipliers, target bonuses), `i:` what reached the sink
after armour and reductions (`damage_in`), `h:` and `s:` heals and shields at their sinks, then every unit's HP and
shield before and after.

**What keeps it still.** Seeded fights; attack dice forced (10 and a hit; 20 for a critical); spell rolls given +100 and
their natural 20 from a chosen seed; **the enemy AI never acts** (every enemy action is skipped at
`enemy_action_start`), so every line is a fixed attacker on a fixed target. Rules 1.25 changed whom enemies pick while
this was being built and no line moved.

**To record on purpose:** `GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage` (in `docs/TESTING.md`). A failing
table prints the action, what it was and what it is.

| Table | Lines | Actions | What is in it |
| --- | --- | --- | --- |
| `builds-normal`, `builds-allin` | 845 + 844 | 845 + 839 | The 9 reference builds × levels 1, 3, 6, 9, 12, 20 × both shares (108 characters): the sheet's seven multipliers and the unit's cached ones; the plain attack on each of the 5 tiers (preview, hit; a critical on the Soldier); each tier's attack on the build; every technique on its pad against a Soldier; the Sigil build's Lines; the Outburst build's design at stages 0 to 4; the Faith build's Whispers, Hymns and Miracle |
| `weapons` | 372 | 544 | All 54 weapons that are not thrown, from one fixed character, on each tier (hit; critical on Soldier and Elite; the aimed shot; a shotgun at 6 tiles); special rounds, the three mods, a worn and a broken blade, Weakened, Sharpened, an ambush, rarity ×1.1 to ×1.3, a shield on the target, a Bleeding and Dazed target, Read Them, the Elite and Boss guard |
| `enemies` | 296 | 592 | Each tier with 1 to 3 weapons at levels 1, 6, 12, 20 on a character in armour Class 0 to 5 (hit and critical); an enemy's blast with the splash on a shielded squadmate |
| `techniques` | 540 | 540 | Each technique with every weapon of its system that can make it (20 weapons), on a Soldier and an Elite, its price met |
| `sigil` | 185 | 184 | A 2, 3 and 4-glyph Line for each of the 25 Subject words at a Soldier, an Elite, a Boss and an ally; areas, a chain, TWICE, LEECH, PUSH, PULL; a critical per damage word; fields, traps walked onto, turrets; casters of levels 1, 12, 20 at 2 and 10 points; an enemy caster |
| `outburst` | 349 | 348 | Every school and option at stages 0 to 4, plain and with a feeling, on an enemy and an ally; each of the 25 feelings; each tone; each of the 38 modules; the shapes; a second school; a critical; the snap cast; levels 1, 12, 20 at 2 and 10 points; the three enemy heart casters |
| `faith` | 122 | 98 | All 8 patrons at three sheets (level 1 / 6 / 20): Blessing power and the intervention's amount, every Whisper, Hymn and Miracle that gives a number; Nerukhan's intervention fired at Devotion 3, 7, 10 |
| `flat` | 589 | 589 | `hurtUnit` and `harm` called as the sites call them (each type, armour on and off, a shield up, by a character, by an enemy, by nobody) on every tier; heals and shields at their sinks; Bleeding, Burning, Corroded ticks; each hazard and severity on each armour Class; a map trap, a barrel; thrown items at levels 1, 6, 20; a stim by level and Healing given |
| `special` | 353 | 362 | The derived hits: the carried round (Punch Through with a Heavy gun, three kinds of round), Flush with an Arc weapon, Interpose, Breaching Strike I and II; and the **order of multiplication** pinned with a stand-in item (own multipliers and target bonuses together, on 5 weapons and 3 kinds of spell) |
| `items-perks`, `items-traits-classes` | 15 + 371 | 15 + 371 | Every perk tier, trait and class rank on one even sheet: 24 probes (a shot, a blow, three spells, hits taken of each kind, heals, shields) written only where the item changed the line; every action it puts on the pad, and the shot and blow that follow it |

### What is NOT covered, and why

1. **Most perks and traits: 10 of 160 perk tiers and 11 of 74 traits change a probe.** A perk that waits for a
   condition the standard fight does not hold (a kill, a Downed ally, a third round) shows nothing. Only 18 perks
   listen on `damage_out` or `damage_in` at all. Their own unit tests (the `perks-a` to `perks-h` files) are what
   pins them; they passed unchanged. **a6 must add a line per literal it moves before moving it.**
2. **Class moves: 8 of 54 give a number** (Lunge, Finisher, Called Shot, Special Ammo, Triage, Stim Throw, Rally,
   Will Shield). Sabotage's 30, Field Fix's 20, Mend, Barrage, Payload, Execution, Toxin, Judgement, Blessed Shells, Storm
   Front, Heart Surge, Killzone, Riposte and Reactive Plate need set-ups the sweep does not build. Each table's
   `#coverage` line lists them by key. The 21 shelved classes are not in it at all.
3. **36 of 65 techniques give no number in their own table.** Most deal none (Guard, Brace, Bead, Shift, Vent, the
   Watches until someone walks). Not triggered: the Answers (Parry, Riposte, Keep Back, Shield Wall), Charge, Draw Cut
   and Snap Shot (a stowed weapon), Walking Fire, Crossfire, Rout, Throw Down, Shield Bash, held shots firing.
   Interpose and Flush are in `special`. All of them reach damage through `attackDamage`, which 2,900 lines pin.
4. **Interventions:** only Nerukhan's is fired; the other seven are pinned by their amount.
5. **Healing that skips `healUnit`** (the audit's list in 1.2: Field Fix, Field Repair, the spare-parts repairs,
   Crawler-Blooded, the Miracles' own writes, stabilising): only the stim on a Downed ally is here.
6. **The Strain burn and a Mana Short, the Flux overload, the Aura leak, Shame's and Guilt's riders:** tried, not
   triggered. They call the sink directly and were not touched.
7. **Whole fights, reactions fired by the enemy, opportunity attacks, Overwatch firing:** left out on purpose (AI).
8. **Objects** (cover HP, a barrel's own HP) and **out-of-fight** damage and healing: a different sink.
9. **Rarity** is pinned as the unit's multiplier (×1.1 to ×1.3) and through the optimised builds, not per tier name.

## 2. a1: `packages/engine/src/effects/output.ts`

| Piece | What it is |
| --- | --- |
| `PROFILES`, `PAIRS`, `profileOf`, `pairOf` | `data/rules.json` `output.profiles` and `output.pairs`: today's slopes, one profile a system |
| `statTerm`, `statOf` | The Stat term: `k × (1 + Σ attr × (Attribute − 1) + Σ skill × Skill)` |
| `levelFactor`, `levelOf` | The Level term: `deal` (20 rows, all ×1) and `mend` (the enemy table's damage column, read from `enemies.json`) |
| `stackDamage`, `VS_CAP` | The stacking rule, moved here from `tactics.ts` (which re-exports it); `harm`'s hand copy is gone |
| `openAmount`, `closeAmount`, `amountOf` | An amount in two halves, so that the `damage_out` hook can speak between them |
| `armourAgainst`, `landed` | The only place armour is read for damage; what lands (never under 1) |
| `deal`, `mend` | Amount, hook, armour, sink; amount, heal or shield sink |

Readers of it now: `character.ts` (`physicalMult`, `weaponMult`, `sigilMult`, `elementalMult`, `soulMult`,
`healingMult`, `blessingPower` are `statOf` of their profile), `effects/mending.ts` (`mendFactor` is
`levelFactor('mend')`). Tests: `test/output.test.ts` (19): the data, the Stat term against the old closed forms for
every Attribute 1 to 10 and Skill 0 to 10 and every weapon's own pair, the stacking rule, both orders, armour, `deal`,
`mend`.

## 3. a2: weapons

`combat.ts` `attackDamage` opens an amount with the weapon profile (Stat: the character's weapon multiplier, or an
enemy's tier and level; Level: ×1), adds its own multipliers in the order it always did, fires `damage_out`, closes
it, and reads armour with `armourAgainst`. `resolveAttack` lands it with `landed`. The techniques needed no change:
`physical/core.ts` `strike()` reaches damage only through `resolveAttack`. The bayonet's 15, the weighted head's +3
and the suppressor's −2 are read from `data/items.json` (`damage`, `damage_add`). The bow formula was already data
(the bug sweep).

## 4. a3: one armour function, one way in

| Site | Before | Now |
| --- | --- | --- |
| `combat.ts` `attackDamage` | its own armour line | `armourAgainst(tgt, 'full', { mult, pierce, ignore, floor0 })` |
| `combat.ts` `resolveAttack` | `max(1, floor(total) − armour)` | `landed` |
| `combat.ts` `hurtUnit` | its own armour and `applyDamage` | `deal` (no hook: it is nobody's roll) |
| `magic.ts` `harm` | its own hook, its own copy of the stacking rule, its own armour, `applyDamage` | `deal` (hook on when there is a caster) |
| `sigil.ts` the Evoke preview | a second copy of harm's armour | `landed(…, armourAgainst(t, 'full' or 'half'))` |
| `physical/ranged/fire.ts` the carried round | `max(1, floor(total × 0.5) − armour)` | `landed` |
| `physical/ranged/press.ts` Flush | the same | `landed` |
| `perks/skeleton.ts` Breaching Strike | the same | `landed` |
| `physical/guard.ts` Interpose | the same | `landed` |

Both wrappers keep their own log lines and effects events; only the number is `deal`'s.

## 5. Kept exactly as it was, for a ruling (the leaks found here; step a7)

1. **Two orders of multiplication** (spec item 1421). A weapon attack computes `base × (own × target)`, a spell
   `(base × own) × target`. With a bonus against the target on the hit they can land a point apart (30 × 1.5 with
   +20%: 53 as a weapon, 54 as a spell). `AmountSpec.order` keeps both. The `special` table pins each; I checked that
   swapping either order fails it. **Proposal:** the spell's order for all, in stage (b), when numbers move anyway.
2. **Armour under 0** (item 1422). A weapon attack clamps armour at 0, `harm` and `hurtUnit` do not. Nothing takes
   armour under 0 today. **Proposal:** clamp for everything.
3. **Flat damage from an item is multiplied for a weapon and not for a spell.** For a weapon `ctx.add` sits beside the
   base, so the Stat term, the technique and the critical all multiply it. For a spell the caller has already
   multiplied and rounded before `harm`, so `ctx.add` is added after Sigil power, the Line, the stage and the critical.
   This is a4's first decision: it cannot be made one formula without a perk's "+N damage" changing its worth on spells.
4. **A blast, a splash, a trap and a thrown item never fire `damage_out`**, even with a thrower, so "+X% damage" and
   "against this target" never reach them (the audit said so; `deal` is called with `hook: false`). One flag when ruled.

## 6. What a4 to a7 and stage (b) should know

1. **a4: the unit caches its multipliers at the start of a fight** (`u.mg.sigilMult`, `elemMult`, `soulMult`,
   `healMult`, `soulBase`, `mend`; `magic.ts` near lines 172 and 693), an enemy caster's are scaled once by its tier and
   level (`combat.ts` `lvlScaled`), and dozens of tests set them by hand (`mg.sigilMult = 1`). So give `openAmount`
   the Stat term from the unit (`ctx.stat`), as `attackDamage` does with the weapon multiplier. Do not read the sheet
   again.
2. **a4: Sigil rounds, it does not floor.** `sigil.ts` `numbersFor` does `Math.round` on the Elemental and the Sigil
   part separately, then `harm` floors and, after the hook, floors again. An Outburst floors. "Floor once at the end"
   can move a Sigil number by 1 (not measured how often). Keep the round where it is in a4 or ask for a ruling with item 1421.
3. **a4: a critical is multiplied in by the caller before `harm`**, so the hook always sees `crit: false` for a spell
   and no perk can tell a critical spell from a plain one. Passing it through is free; using it is a rule change.
4. **a4: Elemental damage adds the Elemental bonus to Sigil power** (added, not multiplied): that is a profile with two
   pairs, which `statTerm` already takes (`attrs` and `skills` are lists). MEND multiplies Sigil power by Healing given:
   two Stat terms, which it does not; pass the second as an own multiplier.
5. **a5: `mend()` exists and nobody calls it yet.** `magic.ts` `heal()` multiplies by the air's band
   (`healing_given_mult`) before `healUnit`: that is an own multiplier with a name. Prayer damage has fallback literals
   in the calls (`effVal(e, 'heal', 5)`): the golden `faith` table holds every one of them at three sheets.
6. **a6: extend the golden tables first.** Section 1's list is the work: one line for each literal, recorded before it
   moves. The sweep in `record.ts` (`recordItems`) takes a set-up per item cheaply; `recordSpecial` shows how to stage
   one by hand. Two existing crashes turned up while sweeping and are not fixed: `skill:brain_power.3/overclock` and
   `class:guardian.will_shield` throw (`maxWords`, `costSave` of undefined) when run on a unit with no magic, though
   their buttons are greyed out with the reason.
7. **a7: the three sinks are still entered directly** by the sites the audit lists (bleeding, the Strain burn, Red
   Thread, `perks/a.ts:217`, `perks/c.ts:323`, Flush, Breaching Strike, Interpose). I left them: each builds a
   `DamageSrc` of its own and `deal` takes one, so each is a five-line change with a golden line already in place for
   Flush, Breaching Strike, Interpose and the ticks.
8. **Stage (b), b1: the weapon's Stat term goes through `fx(c, 'mult_physical', …)`,** which lets perks ADD to it
   (`(base + add) × mult`). When the slope drops to 0.005 a point, a perk's flat "+0.1 Physical multiplier" is worth
   twenty Skill points. Sweep `mult_physical`, `mult_heal_given` and `blessing_power` answers before b1.
9. **Stage (b): an enemy and a companion pass `level: null`** to the amount (their Level is inside `lvlDmg`), so
   filling `output.level.deal` will not touch them. A companion follows its owner's level through the enemy table.
10. **Stage (b): `Profile.k` is in `statTerm`** (it multiplies the whole Stat term), so the proposal's `K = 1.47` is a
    data change.
11. **Previews.** `previewAttack` returns the unfloored total and the armour, and the simulator, its policies and
    several tests work out `max(1, floor(total) − armour)` themselves. `landed` is exported for them; I changed only
    the engine's own sites.
12. **Time.** One action costs about 1 ms, of which 40% is the engine asking every unit for every Answer it could give
    (`physical/core.ts` `dispatch`, `usable`, `hasUsable`) on each hook. That is the engine's own cost in every real
    fight too, and it is the first thing to look at if fights ever feel slow.

## 7. Touched

- New: `packages/engine/src/effects/output.ts`; `packages/engine/test/output.test.ts`;
  `packages/engine/test/golden/` (3 scripts, 12 tables); `packages/engine/test/golden-damage*.test.ts` (7).
- Engine: `character.ts` (7 multipliers), `combat.ts` (`attackDamage`, `resolveAttack`, `hurtUnit`, `modNum`),
  `magic.ts` (`harm`), `sigil.ts` (one line), `tactics.ts` (re-export), `effects/mending.ts`, `effects/index.ts`,
  `physical/guard.ts`, `physical/ranged/fire.ts`, `physical/ranged/press.ts`, `perks/skeleton.ts` (one line each).
- Data: `rules.json` (`output`), `items.json` (three mods), `CONVENTIONS.md`.
- Docs: the spec (a note under "Attacks, damage and armour"; section 14 items 1420 to 1424), `docs/TESTING.md`.
- Not touched: versions, the changelog, `CLAUDE.md`, the web client, `tools/validate.py` (the proposal's validator
  checks belong to a6, when items carry `amount` blocks).
