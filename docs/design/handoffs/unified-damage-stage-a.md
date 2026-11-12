# One damage formula, stage (a), steps a0 to a7 (12 Nov 2026)

The migration in [`../proposals/2026-11-unified-damage.md`](../proposals/2026-11-unified-damage.md) (section 2.8).
Steps a0 to a6 are a **re-expression in which no number moves**; step a7 closes the leaks, each a small change of
behaviour that is listed line by line. **Stage (a) is done. Stage (b) (the re-fit) is not started.**

Sections 0 to 7 are the hand-off of steps a0 to a3 as it was written (two of its "kept as it was" items are settled
now: section 5 says where). **Sections 8 to 14 are steps a4 to a7.** Start at section 8 if you know the first half.

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

*(Step a7 settled all four: section 11. Kept below as written.)*

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

---

# Steps a4 to a7 (12 Nov 2026, the same day)

## 8. The result in ten lines

1. **a4, Sigil and the Outburst: done.** A Line's damage parts, MEND and WARD, the Outburst's damage, heal and shields
   are `amountOf` with named terms. No number moved.
2. **a5, prayers, the kit, heals: done.** Prayers, interventions and the medic's kit are `amountOf`; magic's `heal()` is
   `mend()` with the air's band as its own named multiplier. No number moved. The heals that skip `healUnit` were NOT
   routed: every one of them would move a number (section 10).
3. **a6, the literals: done.** 53 numbers in 51 `amounts` blocks (49 on 33 items, 2 in `rules.json output.amounts`),
   read through `itemAmount`; generic `deal` and `mend` ops; the validator check; the lint (at 0, one allowed line).
   No number moved.
4. **a7 (1), one order of multiplication: done.** 14 golden lines moved (2 real, 12 of the stand-in item).
5. **a7 (2), armour never under 0: done.** No line moved.
6. **a7 (3), an item's flat damage inside the formula for spells: done.** No line of the 5,280 that existed moved;
   144 of 186 stand-in lines recorded for it did.
7. **a7 (4), blasts fire `damage_out`: done as an opt-in.** The hook fires; an item speaks about a blast only if its
   data is tagged. Five items tagged by their text. No golden line landed differently.
8. **The two crashes (Overclock, Will Shield with no magic): fixed**, three tests.
9. **Golden tables:** 4,881 lines in 12 tables before; **5,466 lines in 14 tables** now (two tables and 186 lines were
   added, each recorded on the unmodified code and committed before the change it guards).
10. `npm run check` on the final tree: validator 0 errors; engine types clean; web types clean; **engine 3,388
    passed**; **web 989 passed**. The machine was shared with other agents' browser suites (load average 10 to 36), so
    the two suites went green in two runs a few minutes apart, not in one: in the full run the web suite was green and
    one engine test hit its 5-second timeout (`balance-sim`, "every build is legal"); the engine half run again at once
    printed ALL GREEN. Under that load the timed tests fail on the engine as it was before this branch too (measured:
    `sigil14-ai` "weighs a full warden turn quickly", 1.9 to 2.3 s before, 1.6 to 2.2 s after, against its 1.5 s
    limit; three runs each, alternating: no slowdown that the noise lets one see). Run `npm run check` once on a quiet
    machine before merging.

Commits on the branch, in order: `a4 and a5` · `golden extended before a6` · `a6` · `the two crashes` · `a7 (1)` ·
`a7 (2)` · `golden extended before a7 (3)` · `a7 (3)` · `a7 (4) and the spec` · `this hand-off`.

## 9. a4: Sigil and the Outburst

| Piece | Where | What it is now |
| --- | --- | --- |
| A Line's damage part | `sigil.ts` `sigilDamage`, `sigilDamageTerms` | base (the words', the strongest in full) × shape × line × Stat × sharpened × items × critical, **rounded**, each damage type apart. The preview (`numbersFor`) and the resolve (`applyToInner`) call the same function: the formula is written once |
| MEND, WARD | `sigil.ts` `sigilBoon` | base × shape × Sigil multiplier × Healing given × level × items, rounded. MEND's second Stat term (Healing given) is a named own multiplier |
| The Outburst | `magic.ts` `outburstTerms`, `outburstDamage`, `outburstHeal`, `inverseShield`, `shellShield`, `loveHeal` | base × Stat × stage × shape × At Once (× level, × share), left raw: the caller adds the way of striking, a second school's half and the critical, and harm makes it whole |
| The two Outburst previews | `magic.ts` | armour through `armourAgainst` (they had a third hand copy) |
| The register | `data/rules.json` `output.systems` | for each system: its base, its Stat term, its own multipliers **in the order they apply**, and the data field each lives in |

1. **The multipliers were already data** (`sigils.json grammar.line_mult`, `soul_modules.json damage.base`,
   `cycle.stage_mult`, the shapes' `damage_mult`, `feelings.json` steps). a4 did not move them: it named them as terms
   of the one formula and wrote the register. To re-fit a system, change the number where the register says it lives.
2. **The Stat term comes from the unit** (`u.mg.sigilMult`, `elemMult`, `soulMult`, `healMult`, `mend`), as a named term
   placed where the source always multiplied it. `spec.profile` names the profile (`sigil`, `soul`, `mend`) but the
   sheet is not read again, and `level: null` is passed: **filling `output.level.deal` will not reach spells until a
   caller passes the level** (one line each in `sigilDamageTerms` and `outburstTerms`).
3. **The order is the proof.** Floating-point multiplication is not associative, so `amountOf` multiplies the base by
   each term in turn in the order the source lists them (this was `order: 'chain'`; since a7 it is the only order).
   `test/output-a4a5.test.ts` holds each old closed form, written out, against the new function **with `toBe`** over
   20,000 seeded inputs each: the same floating-point number, not only the same rounded one.
4. **Kept:** Sigil rounds each part (an Outburst floors); the critical is multiplied in by the caller (the hook still
   sees `crit: false` for a spell).

## 10. a5: prayers, the kit, heals

| Piece | Where | What it is now |
| --- | --- | --- |
| A prayer's heal or shield | `faith.ts` `prayerAmount` | base (patrons.json) × Blessing power × level (`blessing_mend` profile, new) |
| A prayer's damage | `faith.ts` `prayerStrike` (a7) | base × Blessing power × "it harmed the helpless", rounded |
| Interventions | `interventionAmount`, `interventionHeal` | `base + per Devotion` as the formula's per-point part, × Blessing power, rounded |
| The kit | `effects/mending.ts` `kitHeal` | base (rules.json mending.medic) × Healing given × level × "time to work"; a Field Repair on an ally is 0 + 3 a point of Improvisation, floored |
| `magic.ts` `heal()` | `mend()` | the amount × **the air** (`healing_given_mult` of the mana band) as its own named multiplier, then the heal sink. `mend()` has its first caller |

**The heals that skip `healUnit` were not routed, on purpose.** Routing one through the heal path applies Healing
received (+10% a point of Camaraderie), the `heal_in` and `heal_given` listeners (Factory Made halves, Field Surgeon
doubles on a machine, Humanity First and The Old Blood halve), the healer count the enemy AI reads, and the calming of
the heart. Each therefore **moves a number for some target**, so each is a ruling, not a re-expression:

| Site | What | Why it is not a pure move |
| --- | --- | --- |
| `combat.ts` `useStim` on a Downed ally | stands at 1 HP | a state, and it emits `heal_given` by hand |
| `combat.ts` death saves | stabilised on three saves | a state |
| `classes/rev3.ts` Field Fix | +20 HP on a machine | "a repair, not a heal: exactly 20, not halved by Factory Made's Plug" (its comment); through the heal path Factory Made would halve it |
| `perks/a.ts` Field Repair (self, story), `game.ts` `repairAlly` | 10 × Improvisation | the same: written to dodge the halving |
| `perks/f.ts` the drone's repair and rebuild | 10 × Mastery; to full | a companion's HP; no Healing received today |
| `perks/a.ts` Crawler-Blooded | 30% of the hit back | Healing received would raise it |
| `perks/e.ts` Field Surgeon's patch (story), thrown stim on a Downed ally | half of max HP; up at 1 | out of a fight / a state |
| `faith.ts` Turned Back, Everyone Home, Rewoven | half HP, full HP, HP as it was | Miracles: they set a state (Everyone Home already calls `healUnit` and then writes full HP) |

Their **numbers** are in data now (a6); only their **path** is as it was. Recommendation for the ruling: repairs get a
heal kind of their own (`'repair'`) that the heal path lets through untouched by Healing received and by Factory
Made, so that the enemy's healer count and the heart's calming see them; the state-setters stay as they are.

## 11. a6: the literals

1. **`effects/amounts.ts`** is the one helper: `itemAmount(key, name, own multipliers, counts)` reads the block and
   multiplies in the order given (so every site's arithmetic is what it was); `amountMult(key, name, mult)` reads a
   named multiplier; `amountBlock` the block. A missing block throws: never a silent 0. Keys: `perk:`, `trait:`,
   `class:<cls>.<move>`, `skill:<id>.<points>`, `condition:`, `word:`, `feeling:`, `patron:`, `rule:<name>`.
2. **The blocks** (`data/CONVENTIONS.md` has the shape). 53 numbers, the same as the code had:
   `rules.json output.amounts` (flux_overload, school_rider); `conditions.json` (bleeding, burning, corroded: `tick`);
   `feelings.json` (love); `classes.json` (warden.ward, trickster.rewrite, guardian.will_shield, bard.mend,
   infiltrator.field_fix, infiltrator.sabotage, banner_dancer.rally_banner and .sweep, rtc_contractor.strike_call,
   siege_engineer.sentry_turret, spellslinger.inscribed_rounds, storm_hand.gauntlet_infusion and .discharge,
   adamantile_knight.bulwark_of_will and .adamantile_plate, grand_sigilist.enlarge (13 blocks), heartbinder.through,
   vessel.inner_charge and .release_strike); `perks.json` (shrug_it_off, last_charge, trick_shot, breaching_strike,
   field_surgeon, clean_hands); `traits.json` (factory_made, crawler_blooded, grenadiers_arm, drone_handler).
   A "share of something" is `base 0` plus a per-point part (`10% of max HP` = per `max_hp` 0.1) or a named
   multiplier (`half the hit` = `mults.share` 0.5; `x / 2` and `x × 0.5` are the same number).
3. **Prayers** read every number from `patrons.json` (the effect's `value`, `boss_damage`, `chain_damage`): the
   fallback literals in the calls are gone, and Last Crossing's 40 and The Sky Answers' 150 come from their entries.
   Their effects were NOT rewritten as `amounts` blocks: the balance tools and tests read `effects[].value`.
4. **`deal` and `mend`** are core ops in `data/effect_ops.json` and `effects/core.ts` (an amount block by name or
   inline; the Stat term of the block's profile from the holder's sheet; `deal` goes through the hook, armour by the
   block's type and the sink; `mend` through the heal or shield sink). `test/ops-deal-mend.test.ts`.
   **No existing effect was converted, and I recommend none is:** all 13 number-bearing `heal` / `shield` effects are
   claimed by their item's own handler (a trigger, a limit, a price), none runs through the generic runner, and
   `rules120-heal-shield.test.ts`, `effects.test.ts`, `faith-measure.ts`, `heal-measure.ts` and `price-list.test.ts`
   read their `value`. The validator holds the two together instead (one number, one place: an item's plain heal or
   shield effect and its plain block of that kind must be equal).
5. **The validator** (`tools/validate.py`): every block's shape (kind, numeric base, per-point parts, known profile,
   type, armour, multipliers); a heal or shield effect written as text needs a block of that kind; `deal` / `mend`
   name a block that exists; one number, one place; `damage_kinds` values. Not built: the proposal's "an item whose
   text names damage has a block" (a text heuristic: dozens of false alarms on "+20% damage" items).
6. **The lint** (`test/amount-literals.test.ts`, under a second): (a) the ledger: each block against the literal the
   code had; (b) every `(key, name)` the source asks for exists; (c) no numeric literal in the amount handed to
   `harm`, `hurtUnit`, `heal`, `healUnit`, `grantShield` or `applyDamage` anywhere in `src/` (0, 1 and 100 are not
   amounts); (d) no HP or shield written with one in `classes/` or `perks/`. One allowed line, with its reason
   (Bulwark Line's +20 on cover: an object's HP, a different sink).
7. **Proof.** Golden extended first, on the unmodified code (commit `golden extended before a6`): `items-shelved`
   (the 21 advanced classes and the 13 Revision 2 shells with the tests' own switches on: 381 lines; 13 of 110 move
   keys give a number there) and `literals` (the Flux overload, the Strain burn and the Mana Short, the aura of each
   tone: 18 lines). Then the move: all 14 tables unchanged. The shelved moves the sweep does not trigger are held by
   the ledger and by their own unit tests (`classes-j`, `classes-k`, `sigil14-classes-*`), which passed unchanged.
8. **Fixed on the way (display only):** Rally's preview said `20 × Healing given` (the number before rules 1.23); it
   reads the kit's number.

**Still written in code, and why.** The lint's scope is amounts handed to a sink. Outside it:

| What | How many | Why left |
| --- | --- | --- |
| Multipliers and reductions inside hooks: `mults.push({ v: 1.5 … })`, `ctx.dmg = ctx.dmg * 0.5`, `ctx.dmg − 10 × Guard`, `ctx.n = ctx.n * 0.5`, flat `ctx.add += 15 × …` | about 35 (15 + 10 + 4 + 6) in `classes/` and `perks/` | they bend an amount, they are not one; the audit says they go through the hooks, "which is right". Their numbers belong in each item's data too (most already sit there as `damage_mod` / `damage_taken_mod` values the handler does not read): one more sweep, the same helper (`amountMult`) |
| `world.ts` a failed approach `FAIL_HURT[tn] ?? 20` | 1 | data with a fallback; not a class or perk, and the fallback is reachable for a TN off the ladder |
| `faith.ts` `?? 1.3`, `?? 2`, intervention `?? 20`, `?? 4`, `?? 10`, `?? 3` | 6 | fallbacks beside a data read that is always there; not handed to a sink |
| `physical/melee/strikes-b.ts` the wrench `t.num('damage_pct', 50)` | 1 | a technique's number with its data default, as all 65 are |
| HP set to a state (1 HP, 0, full) | several | not amounts (the proposal's "should not be unified") |

## 12. a7: the leaks, and every number that moved

### (1) One order of multiplication (spec item 1421)

The base (with what items add, never under 0) × each multiplier in turn × the target bonus. `AmountSpec.order` is
gone. I chose "each in turn" over "the product of the multipliers first" because it is what every spell, prayer and
heal already did (so none of them moves) and it rounds the way a person multiplying by hand does.

**All 14 lines that moved** (of 5,280; `was>now`: the damage that landed, then the target's HP after it):

```
special/order/spell/elemental/110/mults-1.5-1.2: 194>195
special/order/spell/elemental/30/mults-1.5-1.2: 50>51, 143>142
special/order/spell/elemental/45/mults-1.5-1.2: 77>78, 116>115
special/order/spell/sigil/110/mults-1.5-1.2: 191>192, 2>1
special/order/spell/sigil/30/mults-1.5-1.2: 47>48, 146>145
special/order/spell/sigil/45/mults-1.5-1.2: 74>75, 119>118
special/order/spell/soul/110/mults-1.5-1.2: 197>198
special/order/spell/soul/30/mults-1.5-1.2: 53>54, 140>139
special/order/spell/soul/45/mults-1.5-1.2: 80>81, 113>112
special/order/weapon/hellraiser_service_rifle/mult-1.25+vs-0.2/hit: 74>75, 119>118
special/order/weapon/service_pistol/mult-1.25+vs-0.2/hit: 47>48, 146>145
special/order/weapon/service_pistol/mult-1.25+vs-0.4/hit: 57>56, 136>137
tech/heavy_bolt/hellraiser_lmg/elite: 60>59, 271>272
tech/heavy_bolt/hellraiser_lmg/soldier: 63>62, 130>131
```

Two are real actions (a Heavy Bolt from the Hellraiser LMG, a point lower). Twelve are the stand-in item that pins
the order: 9 spells with two item multipliers (+1) and 3 weapon hits with a multiplier and a target bonus (+1, +1, −1).
**It is not always a point up:** multiplying in turn is not higher or lower as a rule, only different in the last place.

### (2) Armour is never under 0 (spec item 1422)

`armourAgainst` clamps for every source; the `floor0` switch is gone. **No line moved** (nothing takes armour under 0
today). Pinned in `test/output.test.ts` (a spell, a Fire spell, a blast and a trap on a unit with −6 armour land 30).

### (3) What an item adds to a spell goes in beside the base (spec item 1440)

`harm` takes a finished number or a `SpellAmount` (`{ base, mults, plus?, round? }`). A Line, an Outburst (the three
strikes and the chain) and a prayer hand in their terms open, so `damage_out`'s `ctx.add` sits beside the base and is
multiplied by the Stat term, the Line, the stage and the critical, and the amount is made whole **once**.

1. **An Outburst tone's bonus damage is a rider** (`AmountSpec.plus`): after the Outburst's own multipliers, before the
   item's multipliers and the target bonus, exactly where it sat. Making it `flat` would multiply Stone's +10 by the
   Soul multiplier and the stage: a balance change nobody asked for.
2. **What the hook is shown changed for a spell:** `ctx.base` is the word's or the school's base and `ctx.mults` its own
   multipliers (it was the finished number and an empty list). No handler in the game reads `ctx.base` for a spell.
3. **No line of the 5,280 moved.** No item in the game adds flat damage to a spell (the six `ctx.add +=` handlers are
   melee, unarmed or exclude spells), and no reference build carries an item multiplier on one. 662 lines changed only
   in the `o:` token (the terms the hook is shown).
4. **Golden extended first** (commit `golden extended before a7 (3)`): 186 lines of the stand-in item on real spells.
   **144 of them moved**: 60 with a flat +10 (now × the spell's multipliers), 26 with a flat −50 (nothing left to
   multiply: the hit lands 1; before, the spell's number minus 50), 58 with only an item's multiplier or target bonus
   (+1: made whole once, not twice). The 42 that did not move carry only an item's multiplier or target bonus, where both ways give the same whole number.
   All 144 are in the appendix below.
5. **Not changed:** a class move's or perk's own flat number is still handed to `harm` finished (`itemAmount(…)`), so an
   item's flat is not multiplied by that move's own multiplier; the Sigil and Outburst previews still do not ask
   `damage_out` (they never did), so an item's bonus on a spell is not in the preview chip. On a Line with two damage
   types the item's flat goes into each part (as before).

### (4) Blasts, splash, traps and thrown items fire `damage_out` (spec item 1441)

**The concern was real: 28 items listen on `damage_out`** (26 handlers, 2 generic `damage_mod` effects), and most would
have reached grenades by accident. **Resolved by a tag, as an opt-in, in three small pieces:**

1. `combat.ts` `hurtUnit` fires the hook when `by` is given and the kind is `explosion`, `trap` or `thrown`
   (`ctx.blast`, `ctx.kind`, `ctx.mode: 'blast'`). A hazard, a map trap and a derived weapon hit (the carried round,
   the wrench) do not.
2. `effects/hooks.ts` `emit`: for a blast, an item's listener is called only if the item's data carries
   `damage_kinds` (`blast`, `all`, or the kind). `ItemInfo.damageKinds`, `collect.ts` `rawItem`.
3. `physical/core.ts`: the technique listener ignores a blast (a technique's multiplier never reached its splash, and
   still does not).

**Tagged `blast`, by their text** (all the damage you deal, or all it takes from you and your allies): Pain Eater
(×1.5 while Bloodied), The Brightest Light (+10% a kill, to +50%), Humanity First (+15% against non-humans), True Name
(+50%), Case Closed (×1.2). **What moved:** a thrown item, a blast, a splash or a trap made by a holder of one of the
five, in its condition (a Bloodied Pain Eater's frag: 40 to 60 before armour; with Humanity First too, against a
robot: 69). No golden line landed differently (the standard fight never meets those conditions on the blast probe; 117 lines
gained the blast's `o:` token); `test/output-a7.test.ts` pins it, with an untagged holder as the control.

**Not tagged, with the reason:**

| Item | Text | Why not |
| --- | --- | --- |
| Judgement Day | "your attacks deal 50% more" | is a grenade an attack? **ruling** |
| Moon Hunter, Ghost Soldier | "your first attack on…" | the same, and they are spent by the hit: **ruling** |
| Holy Ordnance | "its rounds deal +20%" | rounds |
| Last Charge, Finisher, Southern Fist, Raised by Orks, Vessel's Surge, Empty Hand, Earthed | melee, unarmed | not blasts |
| Augmented, One Shot, Inscribe Gear, the Templar's Judgement, the Ballistician's One Shot, Rewrite | a weapon hit, a critical, a marked shot | not blasts |
| Bulwark, Into the Dark, Insomniac | they speak as the TARGET | a blast on them is `damage_in`'s business |
| **Demolitionist** | "+30% explosive damage" | **already reaches every explosion credited to you** through its own `damage_in` (after armour). Tagging it doubled it (67 for 40: a test caught it). **Ruling:** its bonus is before armour on a blast weapon's own hit and after armour on a grenade, a splash and a charge; moving it to the hook would make it one rule and raise armoured targets' damage by 0.3 × their armour |

## 13. The two crashes

`skill:brain_power.3` Overclock and `class:guardian.will_shield` threw a `TypeError` (`maxWords`, `costSave` of
undefined) when their **preview** ran for a unit with no magic (`previewPerkAction` calls an action's `preview` even
when `available` has already said no). Overclock's preview gives no line without an Evoker; `soulPrice` (every Soul
class move: Will Shield, Sanctuary, Puppet…) returns a neutral price without a heart. `test/no-magic-previews.test.ts`
(3 tests; they fail on the code before). Not changed: `previewPerkAction` still calls `preview` for a greyed action,
because some greyed actions show useful lines ("Needs 3 AP" with what it would do).

## 14. What stage (b) must know

1. **One order, one place to break it.** `closeAmount` is the only multiplication. Every table is exact, so b1's
   "the normal-share plain rifle must not move" is one golden table (`builds-normal`, the `plain` lines).
2. **`output.level.deal` reaches weapons only.** Spells, prayers and items pass `level: null` and their Stat term from
   the unit (section 9 item 2). b3 to b5 each need the level passed at their one site (`sigilDamageTerms`,
   `outburstTerms`, `prayerStrike`), and b7 at `itemAmount` (it takes no unit today: give it `by`).
3. **Profiles are names, not yet readers, for magic.** `statOf(profile, sheet)` is used by the sheet's derived
   multipliers and by the `deal` / `mend` ops; Sigil, the Outburst and prayers read the unit's cached multiplier, which
   was computed from the same profile at the start of the fight. Changing a slope in `rules.json` moves both. Dozens of
   tests set `mg.sigilMult = 1` by hand, so do not make the amount read the sheet.
4. **An amount block's `profile` and `type` are documentation today** (the engine reads `base`, `per`, `mults`); the
   caller still names the Stat term and the damage type. b7 ("flat things take `Level.deal`") is where `profile: 'flat'`
   gets read: `itemAmount` → `amountOf` with the block's profile and the dealer's level.
5. **Sigil rounds, everything else floors**, and both happen once, at the end, after items and the target bonus
   (a7 (3)). "Floor everywhere" would move a Sigil part down by 1 whenever its fraction is .5 or more (an estimate:
   about half of the hits that are not whole numbers; not measured). Measure before deciding.
6. **The register** (`rules.json output.systems`) is the list of dials. If b3 or b4 adds a multiplier, add it there and
   to the function's `mults` list in the same commit; the order in the list is the order of multiplication.
7. **Blast tags are the place to price grenades.** With `damage_kinds` an item's bonus on thrown damage is a data
   decision. If b7 gives thrown items a Stat term (the `landed` profile), `hurtUnit`'s callers hand in a finished
   number today: `tactics.ts` `throwItem`, `combat.ts` the splash and the barrel, `perks/c.ts` `detonate`.
8. **The lint keeps new content honest**: a new class move that writes `harm(…, 25, …)` fails `npm run check` with the
   message that says where the number goes.
9. **Time.** The golden tables are 14 tables, about 30 s of CPU, split over 8 test files.

### Touched in a4 to a7

- New: `packages/engine/src/effects/amounts.ts`; tests `output-a4a5`, `output-a7`, `amount-literals`, `ops-deal-mend`,
  `no-magic-previews`, `golden-damage-shelved`; golden tables `items-shelved`, `literals`; 186 lines in `special`.
- Engine: `effects/output.ts`, `effects/mending.ts`, `effects/core.ts`, `effects/hooks.ts`, `effects/collect.ts`,
  `effects/types.ts`, `effects/index.ts`, `sigil.ts`, `magic.ts`, `faith.ts`, `combat.ts`, `game.ts` (one line),
  `physical/core.ts` (one line), `classes/i.ts`, `j.ts`, `k.ts`, `soul.ts`, `rev3.ts`, `perks/a.ts`, `b.ts`, `c.ts`,
  `e.ts`, `f.ts`, `skeleton.ts`, `skills.ts`. Outside `output.ts`, `amounts.ts`, `core.ts`, `faith.ts` and the Outburst's
  block in `magic.ts` each hunk is one line (a literal replaced by a read of its block).
- Data: `rules.json` (`output.profiles.blessing_mend`, `output.systems`, `output.amounts`), `classes.json`,
  `perks.json`, `traits.json`, `conditions.json`, `feelings.json` (one `amounts` line an item; five `damage_kinds`
  lines), `effect_ops.json` (`deal`, `mend`), `CONVENTIONS.md`.
- Tools and docs: `tools/validate.py`, the spec (a dated note; items 1421 and 1422 settled; 1440 to 1445),
  `docs/TESTING.md`, this file.
- Not touched: versions, the changelog, `CLAUDE.md`, anything under `apps/`.

### Appendix: the 144 stand-in lines that moved in a7 (3)

`special/flat/<what>/<the item's bend>/<hit or crit>`: pairs are `was>now` (the damage that landed, then the target's
HP after it; a second pair of each kind is a second target). `SHAPE`: the Line's two damage types both land 1 now.

```
special/flat/line/fire+seek/flat-10+mult-1.2/crit: 257>328
special/flat/line/fire+seek/flat-10+mult-1.2/hit: 168>209, 25>0
special/flat/line/fire+seek/flat-10/crit: 214>273
special/flat/line/fire+seek/flat-10/hit: 140>174, 53>19
special/flat/line/fire+seek/flat-negative-50/crit: 154>1, 39>192
special/flat/line/fire+seek/flat-negative-50/hit: 80>1, 113>192
special/flat/line/shock+condense+seek/flat-10+mult-1.2/crit: 391>508
special/flat/line/shock+condense+seek/flat-10+mult-1.2/hit: 255>325
special/flat/line/shock+condense+seek/flat-10/crit: 326>423
special/flat/line/shock+condense+seek/flat-10/hit: 212>270
special/flat/line/shock+condense+seek/flat-negative-50/crit: 266>1, 0>192
special/flat/line/shock+condense+seek/flat-negative-50/hit: 152>1, 41>192
special/flat/line/shock+condense+seek/mult-1.2+vs-0.15/crit: 437>438
special/flat/line/shock+condense+seek/mult-1.2+vs-0.15/hit: 279>280
special/flat/line/shock+condense+seek/mults-1.2-1.1/crit: 418>419
special/flat/line/shock+condense+seek/vs-0.15/crit: 363>364
special/flat/line/stone+fire+condense+seek/flat-10+mult-1.2/crit: 378>472
special/flat/line/stone+fire+condense+seek/flat-10+mult-1.2/hit: 243>300
special/flat/line/stone+fire+condense+seek/flat-10/crit: 314>392
special/flat/line/stone+fire+condense+seek/flat-10/hit: 202>249
special/flat/line/stone+fire+condense+seek/flat-negative-50/crit: SHAPE
special/flat/line/stone+fire+condense+seek/flat-negative-50/hit: 142>1, 52>1, 0>191
special/flat/line/stone+fire+condense+seek/mult-1.2+vs-0.15/hit: 267>268
special/flat/line/stone+fire+condense+seek/mults-1.2-1.1/hit: 255>256
special/flat/line/stone+fire+condense+seek/vs-0.15/hit: 221>222
special/flat/outburst/fire-burst/stage0/flat-10+mult-1.2/crit: 58>59, 135>134
special/flat/outburst/fire-burst/stage0/flat-10+mult-1.2/hit: 58>59, 135>134
special/flat/outburst/fire-burst/stage0/mult-1.2+vs-0.15/crit: 53>54, 140>139
special/flat/outburst/fire-burst/stage0/mult-1.2+vs-0.15/hit: 53>54, 140>139
special/flat/outburst/fire-burst/stage2/flat-10+mult-1.2/crit: 83>90, 110>103
special/flat/outburst/fire-burst/stage2/flat-10+mult-1.2/hit: 83>90, 110>103
special/flat/outburst/fire-burst/stage2/flat-10/crit: 69>74, 124>119
special/flat/outburst/fire-burst/stage2/flat-10/hit: 69>74, 124>119
special/flat/outburst/fire-burst/stage2/flat-negative-50/crit: 9>1, 184>192
special/flat/outburst/fire-burst/stage2/flat-negative-50/hit: 9>1, 184>192
special/flat/outburst/fire-burst/stage2/mults-1.2-1.1/crit: 78>79, 115>114
special/flat/outburst/fire-burst/stage2/mults-1.2-1.1/hit: 78>79, 115>114
special/flat/outburst/fire-burst/stage4/flat-10+mult-1.2/crit: 107>121, 86>72
special/flat/outburst/fire-burst/stage4/flat-10+mult-1.2/hit: 107>121, 86>72
special/flat/outburst/fire-burst/stage4/flat-10/crit: 89>100, 104>93
special/flat/outburst/fire-burst/stage4/flat-10/hit: 89>100, 104>93
special/flat/outburst/fire-burst/stage4/flat-negative-50/crit: 29>1, 164>192
special/flat/outburst/fire-burst/stage4/flat-negative-50/hit: 29>1, 164>192
special/flat/outburst/fire-burst/stage4/mult-1.2+vs-0.15/crit: 110>111, 83>82
special/flat/outburst/fire-burst/stage4/mult-1.2+vs-0.15/hit: 110>111, 83>82
special/flat/outburst/fire-burst/stage4/mults-1.2-1.1/crit: 105>106, 88>87
special/flat/outburst/fire-burst/stage4/mults-1.2-1.1/hit: 105>106, 88>87
special/flat/outburst/fire-burst/stage4/vs-0.15/crit: 91>92, 102>101
special/flat/outburst/fire-burst/stage4/vs-0.15/hit: 91>92, 102>101
special/flat/outburst/raw/stage0/flat-10+mult-1.2/crit: 117>133, 76>60
special/flat/outburst/raw/stage0/flat-10+mult-1.2/hit: 82>88, 111>105
special/flat/outburst/raw/stage0/flat-10/crit: 98>111, 95>82
special/flat/outburst/raw/stage0/flat-10/hit: 69>74, 124>119
special/flat/outburst/raw/stage0/flat-negative-50/crit: 38>1, 155>192
special/flat/outburst/raw/stage0/flat-negative-50/hit: 9>1, 184>192
special/flat/outburst/raw/stage0/mult-1.2+vs-0.15/crit: 121>122, 72>71
special/flat/outburst/raw/stage0/mults-1.2-1.1/crit: 116>117, 77>76
special/flat/outburst/raw/stage0/mults-1.2-1.1/hit: 77>78, 116>115
special/flat/outburst/raw/stage0/vs-0.15/crit: 101>102, 92>91
special/flat/outburst/raw/stage0/vs-0.15/hit: 67>68, 126>125
special/flat/outburst/raw/stage2/flat-10+mult-1.2/crit: 171>199, 22>0
special/flat/outburst/raw/stage2/flat-10+mult-1.2/hit: 117>133, 76>60
special/flat/outburst/raw/stage2/flat-10/crit: 143>166, 50>27
special/flat/outburst/raw/stage2/flat-10/hit: 98>111, 95>82
special/flat/outburst/raw/stage2/flat-negative-50/crit: 83>1, 110>192
special/flat/outburst/raw/stage2/flat-negative-50/hit: 38>1, 155>192
special/flat/outburst/raw/stage2/mult-1.2+vs-0.15/hit: 121>122, 72>71
special/flat/outburst/raw/stage2/mults-1.2-1.1/hit: 116>117, 77>76
special/flat/outburst/raw/stage2/vs-0.15/crit: 152>153, 41>40
special/flat/outburst/raw/stage2/vs-0.15/hit: 101>102, 92>91
special/flat/outburst/raw/stage4/flat-10+mult-1.2/crit: 224>266
special/flat/outburst/raw/stage4/flat-10+mult-1.2/hit: 153>177, 40>16
special/flat/outburst/raw/stage4/flat-10/crit: 187>222, 6>0
special/flat/outburst/raw/stage4/flat-10/hit: 128>148, 65>45
special/flat/outburst/raw/stage4/flat-negative-50/crit: 127>1, 66>192
special/flat/outburst/raw/stage4/flat-negative-50/hit: 68>1, 125>192
special/flat/outburst/raw/stage4/mult-1.2+vs-0.15/crit: 244>245
special/flat/outburst/raw/stage4/mult-1.2+vs-0.15/hit: 162>163, 31>30
special/flat/outburst/raw/stage4/mults-1.2-1.1/crit: 233>234
special/flat/outburst/raw/stage4/mults-1.2-1.1/hit: 155>156, 38>37
special/flat/outburst/raw/stage4/vs-0.15/crit: 203>204
special/flat/outburst/raw/stage4/vs-0.15/hit: 135>136, 58>57
special/flat/outburst/stone/stage0/flat-10+mult-1.2/crit: 114>130, 79>63
special/flat/outburst/stone/stage0/flat-10+mult-1.2/hit: 79>85, 114>108
special/flat/outburst/stone/stage0/flat-10/crit: 95>108, 98>85
special/flat/outburst/stone/stage0/flat-10/hit: 66>71, 127>122
special/flat/outburst/stone/stage0/flat-negative-50/crit: 35>1, 158>192
special/flat/outburst/stone/stage0/flat-negative-50/hit: 6>1, 187>192
special/flat/outburst/stone/stage0/mult-1.2+vs-0.15/crit: 118>119, 75>74
special/flat/outburst/stone/stage0/mults-1.2-1.1/crit: 113>114, 80>79
special/flat/outburst/stone/stage0/mults-1.2-1.1/hit: 74>75, 119>118
special/flat/outburst/stone/stage0/vs-0.15/crit: 98>99, 95>94
special/flat/outburst/stone/stage0/vs-0.15/hit: 64>65, 129>128
special/flat/outburst/stone/stage2/flat-10+mult-1.2/crit: 177>205, 16>0
special/flat/outburst/stone/stage2/flat-10+mult-1.2/hit: 123>139, 70>54
special/flat/outburst/stone/stage2/flat-10/crit: 147>170, 46>23
special/flat/outburst/stone/stage2/flat-10/hit: 102>115, 91>78
special/flat/outburst/stone/stage2/flat-negative-50/crit: 87>4, 106>189
special/flat/outburst/stone/stage2/flat-negative-50/hit: 42>4, 151>189
special/flat/outburst/stone/stage2/mult-1.2+vs-0.15/hit: 129>130, 64>63
special/flat/outburst/stone/stage2/mults-1.2-1.1/crit: 182>183, 11>10
special/flat/outburst/stone/stage2/mults-1.2-1.1/hit: 123>124, 70>69
special/flat/outburst/stone/stage2/vs-0.15/hit: 106>107, 87>86
special/flat/outburst/stone/stage4/flat-10+mult-1.2/crit: 230>272
special/flat/outburst/stone/stage4/flat-10+mult-1.2/hit: 159>183, 34>10
special/flat/outburst/stone/stage4/flat-10/crit: 191>226, 2>0
special/flat/outburst/stone/stage4/flat-10/hit: 132>152, 61>41
special/flat/outburst/stone/stage4/flat-negative-50/crit: 131>4, 62>189
special/flat/outburst/stone/stage4/flat-negative-50/hit: 72>4, 121>189
special/flat/outburst/stone/stage4/mult-1.2+vs-0.15/hit: 170>171, 23>22
special/flat/outburst/stone/stage4/mults-1.2-1.1/crit: 240>241
special/flat/outburst/stone/stage4/mults-1.2-1.1/hit: 162>163, 31>30
special/flat/prayer/nerukhan/flat-10+mult-1.2/hymn/judgement: 126>135, 67>58
special/flat/prayer/nerukhan/flat-10+mult-1.2/miracle/saints_verdict: 277>286, 277>286, 54>45
special/flat/prayer/nerukhan/flat-10+mult-1.2/whisper/rebuke: 52>61, 141>132
special/flat/prayer/nerukhan/flat-10/hymn/judgement: 105>112, 88>81
special/flat/prayer/nerukhan/flat-10/miracle/saints_verdict: 231>238, 231>238, 100>93
special/flat/prayer/nerukhan/flat-10/whisper/rebuke: 44>51, 149>142
special/flat/prayer/nerukhan/flat-negative-50/hymn/judgement: 45>10, 148>183
special/flat/prayer/nerukhan/flat-negative-50/miracle/saints_verdict: 171>136, 171>136, 22>57, 160>195
special/flat/prayer/nerukhan/mult-1.2+vs-0.15/miracle/saints_verdict: 304>305, 304>305, 27>26
special/flat/prayer/nerukhan/mult-1.2+vs-0.15/whisper/rebuke: 46>47, 147>146
special/flat/prayer/nerukhan/mults-1.2-1.1/hymn/judgement: 125>126, 68>67
special/flat/prayer/nerukhan/mults-1.2-1.1/miracle/saints_verdict: 291>292, 291>292, 40>39
special/flat/prayer/nerukhan/mults-1.2-1.1/whisper/rebuke: 44>45, 149>148
special/flat/prayer/old_overcast/flat-10+mult-1.2/hymn/lightning_rod: 123>132, 52>61, 70>61, 279>270
special/flat/prayer/old_overcast/flat-10+mult-1.2/hymn/thunderclap: 49>58, 46>55, 144>135, 285>276
special/flat/prayer/old_overcast/flat-10+mult-1.2/miracle/the_sky_answers: 315>323, 312>320, 19>11
special/flat/prayer/old_overcast/flat-10+mult-1.2/whisper/rebuke: 52>61, 141>132
special/flat/prayer/old_overcast/flat-10/hymn/lightning_rod: 102>109, 43>50, 91>84, 288>281
special/flat/prayer/old_overcast/flat-10/hymn/thunderclap: 41>48, 38>45, 152>145, 293>286
special/flat/prayer/old_overcast/flat-10/miracle/the_sky_answers: 262>269, 259>266, 72>65
special/flat/prayer/old_overcast/flat-10/whisper/rebuke: 44>51, 149>142
special/flat/prayer/old_overcast/flat-negative-50/hymn/lightning_rod: 42>7, 151>186
special/flat/prayer/old_overcast/flat-negative-50/miracle/the_sky_answers: 202>167, 199>164, 0>26, 132>167
special/flat/prayer/old_overcast/mult-1.2+vs-0.15/hymn/lightning_rod: 47>48, 284>283
special/flat/prayer/old_overcast/mult-1.2+vs-0.15/hymn/thunderclap: 43>44, 40>41, 150>149, 291>290
special/flat/prayer/old_overcast/mult-1.2+vs-0.15/miracle/the_sky_answers: 348>349, 345>346
special/flat/prayer/old_overcast/mult-1.2+vs-0.15/whisper/rebuke: 46>47, 147>146
special/flat/prayer/old_overcast/mults-1.2-1.1/hymn/lightning_rod: 122>123, 45>46, 71>70, 286>285
special/flat/prayer/old_overcast/mults-1.2-1.1/hymn/thunderclap: 41>42, 38>39, 152>151, 293>292
special/flat/prayer/old_overcast/mults-1.2-1.1/miracle/the_sky_answers: 333>334, 330>331, 1>0
special/flat/prayer/old_overcast/mults-1.2-1.1/whisper/rebuke: 44>45, 149>148
special/flat/prayer/old_overcast/vs-0.15/hymn/lightning_rod: 38>39, 293>292
```
