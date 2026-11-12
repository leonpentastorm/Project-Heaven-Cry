# One damage formula: the audit, the design, the floor (12 Nov 2026)

**For Leon.** You asked: "is the damage engine unified? Each action that deals dmg should have something like
base+attribute+level, since we have had to patch in level scaling several times now", and ruled that this patch is the
floor everything later is balanced to. Three rulings arrived while this was written and are built in: the ceilings are
what an **all-in** build reaches; all-in ÷ normal share is **1.25**; and **cost** has to be part of the balance.

Read-only audit of commit `3b86a81` plus the working tree of 12 Nov (rules 1.22 and 1.23 were being edited by two other
agents; line numbers in `faith.ts`, `mending.ts` and `classes/rev3.ts` may have moved). Nothing in code, data or the
spec was changed. Every number marked **estimate** was computed here from the formulas, not measured in the simulator.

## 0. The answer

1. **No. The receiving side is nearly one engine; the dealing side is seven.** Every HP loss in a fight ends in
   `applyDamage` (`packages/engine/src/effects/damage.ts:53`), but it is reached through three different front doors
   that each work out armour, multipliers and shields their own way, and the number that arrives is produced by seven
   unrelated formulas, and about 40 numbers are literals typed into class, perk and prayer code.
2. **Level enters a character's damage nowhere.** It enters only through points spent. It enters healing and shields
   through a patch (`mendFactor`, the enemy table's damage column). It does not enter prayer damage, grenades, blasts,
   hazards, bleeding, burning or any class move's flat number at all. That is why level scaling has been patched four
   times: there is no slot for it.
3. **The all-in problem is the same defect seen from the other side.** An all-in rifleman deals 119 a turn at level 1
   and 117 at level 20 (measured, `balance-sim-step1-full.md` section 10) while enemy HP grows ×1.81. A character's
   growth is its points; a build that starts at the cap has none.
4. **The proposal in one line:**
   `amount = floor((base + flat) × Stat × Level × own multipliers × (1 + target bonuses, capped +100%) × critical)`,
   then one armour function, then the one sink; every term declared in data, one engine function for every source.
5. **Your 1.25 ruling decides the shape of the attribute term.** For an action that rolls to hit, three points of the
   attack skill are already worth ×1.23 through the roll alone. So 1.25 leaves the damage slope of a rolled action at
   almost nothing (0.005 a Skill point), and the growth that points carry today has to move to the Level term. For an
   action that always lands (prayers, heals, shields, areas with no roll) the slope carries the whole 1.25
   (0.06 a point). That is "base + attribute + level" as you asked for it, and it is a re-balance, not a re-wording:
   section 2.4 says what moves.
6. **Two stages.** (a) Re-express: one function, one schema, no number moves, proven by golden tables. (b) Re-fit to the
   all-in ceilings, one data change per system, measured.

---

# Part 1. The audit

## 1.1 The receiving side

| Piece | Where | What it does |
| --- | --- | --- |
| The sink | `effects/damage.ts:53` `applyDamage` | Derived reductions (Elemental taken, Ambush taken, each capped 60%), Read Them (−15%), the `damage_in` hook in four phases (reduce, shield, would_drop_to_0, after), the shield, Downed failures, undying, kill credit, `on_damaged` / `on_downed` / `on_kill` |
| Heal sink | `effects/damage.ts:112` `healUnit` | Healing received, `heal_in`, revive, `noteTended`, `heal_given` |
| Shield sink | `effects/damage.ts:126` `grantShield` | Shields received, `shield_grant`, the larger stands, `noteTended` |
| Front door 1: attacks | `combat.ts:993` `attackDamage`, applied at `combat.ts:1121` | base, the multiplier stack, the `damage_out` hook, critical, armour with pierce, then the sink with `shield: true`, `credit: 'all'` |
| Front door 2: magic | `magic.ts:425` `harm` | the `damage_out` hook (its own inline copy of the stacking rule, `magic.ts:436`), armour by type (Sigil and physical full, Elemental half, Soul and true none), then the sink with `shield: true`, `credit: 'hp'`. No critical inside: callers multiply before calling |
| Front door 3: everything else | `combat.ts:564` `hurtUnit` | flat armour or none, **no `damage_out` hook**, **`shield: false`**, `credit: 'hp'` |

Facts about it:

1. **One sink, yes.** I found no HP loss in a fight that skips `applyDamage` except the state changes listed in 1.2.
2. **Armour is worked out in seven places:** `combat.ts:1017` (attacks), `combat.ts:566` (`hurtUnit`), `magic.ts:439`
   (`harm`), `sigil.ts:421` (the Sigil preview, a second copy), `physical/ranged/fire.ts:231` (the carried round),
   `physical/ranged/press.ts:108` (Flush), `perks/skeleton.ts:86` (Breaching Strike). The file header says so
   ("Sites still work out their own armour", `damage.ts:3`).
3. **The multiplier stack exists twice:** `tactics.ts:51` `stackDamage` for attacks, and a hand copy in `harm`
   (`magic.ts:436-437`). They agree today.
4. **Shields are skipped by front door 3.** A grenade, a barrel, a blast's splash, a trap and a hazard all pass a
   shield (`combat.ts:567`, `shield: false`); a rifle round and a spell do not. The comment says "as before". This is
   a rule nobody chose (question 7).
5. **Criticals:** weapons `combat.ts:1006` (×1.5 to ×2.0, `character.ts:610-612`); spells `sigil.ts:328`
   `spellCritMult`, multiplied in by the caller (`sigil.ts:1009`, `magic.ts:1155`); prayers, blasts, hazards, class
   moves: none.
6. **The level gap** is to-hit only (`combat.ts:977`, `sigil.ts:333`: ±1 a level, to 5) plus the one-hit rule for an
   enemy 5 levels below (`combat.ts:508`, the hook at `combat.ts:517`). It never scales damage.
7. **The Elite and Boss guard** exists for Sigil only (`sigil.ts:340-345`: one Evoke leaves a full-HP Elite or Boss on
   1 HP). An Outburst, a Hymn (Judgement 50, The Saints' Verdict 130 on everything in sight, `faith.ts:1040-1044`) and
   a class move have no such guard. Execution excludes Bosses on its own (`classes/i.ts:643`).
8. **Damage types** are a free string on the source (`damage.ts:36`); what a type does to armour is decided by whichever
   front door was used, not by the type.

## 1.2 What bypasses or half-uses the sink

**HP set directly (state changes, acceptable, but they fire no hooks):** Subdue (`tactics.ts:170`), Bite the Bullet's
end (`perks/a.ts:319`, `:332`), a twin's loss (`classes/k.ts:1780`), a team match's "out" (`game.ts:3974`), story-phase
damage outside a fight (`game.ts:1956`), the Toll-Keeper's crossing uses the sink with `hp + shield`
(`faith.ts:1081`).

**Healing that skips `healUnit`** (so Healing received, `heal_in`, `heal_given`, the healer-hunting count and the
calming of the heart never see it):

| Where | What |
| --- | --- |
| `combat.ts:1991` | a stim on a Downed ally (emits `heal_given` by hand) |
| `combat.ts:1291` | stabilising on three saves |
| `classes/rev3.ts:333` | Field Fix: `hp + 20`, a literal |
| `game.ts:2636`, `perks/a.ts:405` | Field Repair: `10 × Proficiency`, a literal, twice |
| `perks/a.ts:393`, `perks/f.ts:900`, `:920` | spare-parts repairs |
| `perks/a.ts:478` | Crawler-Blooded's chitin |
| `perks/e.ts:711`, `:970` | half of max HP; up at 1 HP |
| `faith.ts:1087`, `:1101`, `:1135` | Miracles (one calls `healUnit` and then overwrites the result) |
| `classes/i.ts:482`, `faith.ts:1426`, `game.ts:1108` | out-of-fight healing on the sheet |

**Half-uses of the sink** (they call `applyDamage` directly with a number they built themselves): the carried round
(`fire.ts:239`, through `hurtUnit` with armour already off), Flush (`press.ts:110`), Breaching Strike
(`perks/skeleton.ts:88`, `:91`), `perks/a.ts:217`, `perks/c.ts:323`, bleeding (`combat.ts:1279`, a literal 5), the
Strain burn (`magic.ts:840`), Interpose (`physical/guard.ts:79`), Red Thread (`faith.ts:638`). Each is correct for
itself; none can be seen by a perk that says "+X% damage".

**Objects** have their own sink (`combat.ts:574` `damageObject`; `classes/k.ts:944` writes object HP directly).

## 1.3 The dealing side, source by source

"Level" below means the character's level as a term of the formula. "Points" means it grows only as Skill and
Attribute points are spent.

### Weapons (plain attack and all 65 techniques)

`combat.ts:999-1016`:
`(weapon damage + unarmed bonus + weighted mod 3 − suppressor 2 + perk flats) × weapon multiplier × rarity × technique × durability × ammunition × critical × ambush × Weakened 0.75 × Sharpened 1.25 × (1 + target bonuses ≤ 1.0)`, then armour.

1. **Weapon multiplier** (`character.ts:598`): `1 + 0.1 × (each scales_with Attribute − 1) + 0.05 × the skill it hits with`.
   ×1.5 at 4/4, ×2.4 at 10/10.
2. **Level: none.** Points only.
3. **Techniques are the best-behaved system in the game.** All 65 read their numbers from `data/techniques.json`
   through `t.num(...)` and reach the attack through one function (`physical/core.ts:344` `strike`, the hook at
   `physical/core.ts:423`). Almost no technique computes damage of its own (the exceptions derive it from `attackDamage`: the carried round, Flush, the wrench at `strikes-b.ts:216`).
4. **Hard-coded:** the recurve bow's `20 + 5 × Raw Power` (`combat.ts:884`); the bayonet's 15 (`combat.ts:999`); the
   weighted and suppressor mods (same line); rarity multipliers (`character.ts:128`); the critical constants
   (`character.ts:610`); Weakened and Sharpened.
5. **A bug:** the longbow's damage in `data/weapons.json` is the text `"25 + 6*raw_power"`. `weaponDamage` only knows
   the recurve bow by id, so a longbow deals a flat 20 (`combat.ts:884`). Not fixed here (read-only).
6. **A blast's splash ignores the shooter** (`combat.ts:1173`): `weaponDamage(w, range)` with no weapon multiplier, no
   level and, for an enemy, no tier or level factor. An enemy's thumper splashes for the same 40 at level 1 and 20.

### Thrown, blasts, set explosives

`tactics.ts:246-247`, `perks/c.ts:755`, `combat.ts:586`: the item's flat `damage` from `weapons.json` (frag 40,
satchel 120, barrel from `objects.json`), through `hurtUnit`. **No attribute, no skill, no level, no critical, no
`damage_out` hook, passes shields.** A frag grenade is 29% of a Soldier's HP at level 1 and 16% at level 20.
Grenadier's Arm is a literal `(10 + kg / 4) × Physical multiplier` (`perks/c.ts:699`).

### Sigil

`sigil.ts:1009-1011` (and again for the preview at `sigil.ts:411-421`):
`word damage (strongest glyph in full, the others half; sigils.json) × shape multipliers × Line multiplier × Sigil power × Sharpened × spell_mult hook × critical`, through `harm`.

1. **Sigil power** (`sigil.ts:348`, `character.ts:616`): `1 + 0.1 × (Intelligence − 1) + 0.1 × Brain Power`; Elemental
   damage adds the Elemental bonus `0.1 × (Expression − 1) + 0.05 × Visualization` to it (added, not multiplied).
2. **Level: none.** The Line multiplier (×1.7 / 1.75 / 1.8, `sigilwords.ts:19`, `sigils.json grammar.line_mult`) is the
   rules 1.17 patch: a constant that does the job a level or system term should.
3. **Heals and shields** (`sigil.ts:423`): `word base × shape × Sigil multiplier × Healing given × mendFactor(level)`.
   MEND reads two attribute multipliers at once.
4. **The formula is written twice** (preview and resolve). They agree today.
5. Fields, traps and turrets carry `placedMult` 0.5; a trap that fires goes through `hurtUnit`
   (`combat.ts:1453`), so it takes full armour and passes shields, unlike the same words Evoked.
6. **Hard-coded:** Corroded's 5 true a turn (`sigil.ts:1271`), Flux overload 10 a point (`magic.ts:532`).

### Outburst

`magic.ts:1109`: `base 40 × Soul multiplier × (stage + feelings + residue) × shape × At Once`, critical by the caller,
tone riders add flat damage (`magic.ts:1134`), through `harm`.

1. **Soul multiplier** (`character.ts:618`): `1 + 0.05 × (Determination − 1) + 0.1 × Will Power`.
2. **Level: none** for damage. The base (20, then 28, then 36, then 40) is the patch.
3. **Heals and shields** (`magic.ts:1122-1130`): their own bases × Healing given (heal) or Soul multiplier (shield) ×
   stage × `mendFactor` × area share 0.4.
4. **Hard-coded:** Burning 10 true a turn (`magic.ts:488`), the Aura leak 5, Shame's 8, Guilt's 10 a stage, residue
   numbers are in `feelings.json`. `soul_modules.json damage.text` still says "starts from 36"; the base is 40.

### Prayers

`faith.ts:1023-1109`: damage `base × Blessing power`; heal and shield `base × Blessing power × mendFactor(level)`;
interventions `(20 + 4 × Devotion) × Blessing power` (`faith.ts:92`).

1. **Blessing power** (`character.ts:774`): `1 + 0.1 × Faith`. It reads no Attribute.
2. **Level:** in heals and shields only. Prayer damage has none.
3. A prayer's damage base is stored as a negative HP `stat_mod` (`faith.ts:1004` `prayerDamage`), with the fallback
   literal in the call (`faith.ts:1033`, `:1040`, `:1044`, `:1109`).
4. The intervention is the only source in the game written as `base + per point`.
5. No roll, no critical, Soul damage (no armour).

### Class moves (Class Roster 3: 54 moves on the nine classes)

1. 14 of the 54 name damage, healing or a shield. Those that only bend an attack (Finisher's +20% a Momentum,
   Special Ammo, Sanctuary's half damage) do it through `damage_out` / `damage_in` and are fine.
2. Those that make a number make it inline: Triage, Stim Throw, Rally, Field Repair (`mending.ts:50-53`, now in data
   with the level factor, rules 1.23), Will Shield (`classes/i.ts:1336`), Field Fix's 20 (`rev3.ts:333`); Sabotage's 30 and Mend's base 9 are in their
   texts and I did not trace where the engine reads them.
3. Across `classes/i.ts`, `j.ts`, `k.ts`, `soul.ts` there are **25 calls** that pass a literal number to `harm`,
   `hurtUnit`, `heal` or `grantShield` (most belong to the 21 shelved classes: they come back with the same defect).
   Each picks its own multiplier or none: `k.ts:889-894` and `:1042-1159` are flat 5 to 20 with nothing;
   `j.ts:1046-1089` use the Elemental multiplier alone; `k.ts:1578` the Soul multiplier; `j.ts:456` Healing given.
   **None reads level.**
4. `data/effect_ops.json` has **no op that deals damage.** The core ops only bend damage (`damage_mult`,
   `damage_mod`, `damage_reduction`, `damage_taken_mod`). The generic `heal` op ignores its own `scale` parameter
   (`effects/core.ts:212`: `× (… ? 1 : 1)`). So every move that hurts is a bespoke hook by construction. (The file
   holds 192 ops: 50 core, 113 bespoke, 17 weapon, 11 item, 1 sigil. CLAUDE.md says 82 bespoke.)

### Perks and traits

29 `damage_out` handlers, 36 `damage_in`, 24 on heals, shields, spells and blessings. They go through the hooks, which
is right. Their numbers are literals in TypeScript beside the data text (`perks/a.ts:361` ×1.5, `:601` ×1.2,
`perks/b.ts:582` ×1.5, `perks/f.ts:261` +0.5 …): 18 literal multipliers or flats in the hooks, 5 literal damage or
heal numbers in calls.

### Conditions, hazards, traps, objects

All flat, all literal or flat data, no attribute, no level: Bleeding 5 (`combat.ts:1279`), Burning 10, Corroded 5,
hazards by severity (`hazards.ts:71`), map traps (`objects.json`), a failed approach (`world.ts:551`).

### Enemies

`combat.ts:1002`: `weapon damage × tier damage × level damage_mult` (`lvlDmg`, set at `combat.ts:471`); a caster's
spells take the same factor (`combat.ts:491`). **The enemy side already is "base × tier × level", in data.** Its gaps:
splash (above), and enemy casters keep pre-1.17 bases through `*_enemy` fields scattered over three files.

### Calls

No Call deals damage itself (they give attacks, AP and conditions). Their attacks go through front door 1.

## 1.4 The table

| Source | Base | Attribute term | Level term | Multipliers | Crit | Lands by | Door | In data? |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Weapon attack, technique | weapons.json | 0.1 Attr + 0.05 Skill | none | technique, rarity, ammo, perks, vs | yes | roll | 1 | yes (bow, bayonet, mods literal) |
| Splash | weapons.json | **none** | **none** | none | no | auto | 3 | yes |
| Thrown, blasts | weapons.json | **none** | **none** | none | no | auto | 3 | yes |
| Sigil damage | sigils.json | 0.1 Int + 0.1 Brain Power (+ Elemental) | none (Line ×1.7–1.8) | shape, spell_mult, vs | yes | roll, or auto in an area | 2 | yes |
| Sigil heal, shield | sigils.json | Sigil × Healing given | mendFactor | shape | no | auto | sinks | yes |
| Outburst damage | soul_modules.json | 0.05 Det + 0.1 Will Power | none (base 40) | stage, feelings, shape | yes | roll, or auto in an area | 2 | yes |
| Outburst heal, shield | soul_modules.json | Healing given / Soul | mendFactor | stage, area 0.4 | no | auto | sinks | yes |
| Prayer damage | patrons.json (as a stat_mod) | 0.1 Faith | **none** | patron riders | no | auto | 2 | half (fallback literals) |
| Prayer heal, shield | patrons.json | 0.1 Faith | mendFactor | — | no | auto | sinks | half |
| Intervention | patrons.json | 4 × Devotion, × Blessing power | **none** | — | no | auto | 2 | yes |
| Medic's kit | rules.json mending | Healing given | mendFactor (1.23) | — | no | auto | heal sink (stim on Downed: bypass) | yes |
| Class move numbers | **TypeScript** | whichever the author chose | **none** | — | no | varies | 2 or 3 or direct | **no** |
| Perk and trait numbers | **TypeScript** | — | none | hooks | — | — | hooks | **no** |
| Bleed, burn, corrode | **TypeScript** | none | **none** | none | no | auto | direct / 2 | **no** |
| Hazards, traps, barrels | objects, hazards | none | **none** | none | no | auto or save | 3 | yes |
| Enemy attack, enemy spell | weapons / sigils | tier damage | damage_mult | as a character | ×1.5 | roll | 1 / 2 | yes |

`data/rules.json conventions.additive_then_multiplicative` ("per-point bonuses add into one derived multiplier; trait,
perk, crit and condition multipliers then multiply") is followed by weapons, Sigil and the Outburst. It is not followed
by MEND (two derived multipliers multiplied), and it has nothing to say about a level term because there is none.
Everything above is `provisional` under spec section 14 (items 587–590, 953, 1015–1088, 1200–1274, 1300 on).

## 1.5 Growth from level 1 to 20 against the enemy table

Enemy table (`data/enemies.json levels.table`): HP ×1.00, 1.16, 1.38, 1.54, 1.74, 1.81 and damage ×1.00, 1.05, 1.13,
1.24, 1.38, 1.82 at levels 1, 3, 6, 9, 12, 20. What a Soldier's turn takes off the rifleman grows ×3.25
(`heal-shield-pass.md` 1.1), because his armour is a flat subtraction.

The derived multiplier of each reference build (computed here from `test/balance/builds.ts` and `character.ts`):

| Build, normal share | L1 | L3 | L6 | L9 | L12 | L20 | Growth | Enemy HP |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Rifle, blade (weapon multiplier) | 1.50 | 1.65 | 1.90 | 2.10 | 2.35 | 2.40 | ×1.60 | ×1.81 |
| Sigil multiplier | 1.70 | 1.90 | 2.20 | 2.50 | 2.80 | 2.90 | ×1.71 | ×1.81 |
| Soul multiplier | 1.55 | 1.70 | 1.85 | 2.00 | 2.30 | 2.45 | ×1.58 | ×1.81 |
| Blessing power | 1.30 | 1.50 | 1.60 | 1.80 | 1.90 | 2.00 | ×1.54 | ×1.81 |
| **All in:** rifle | 1.95 | 2.10 | 2.25 | 2.40 | 2.40 | 2.40 | ×1.23 | ×1.81 |
| **All in:** Sigil | 2.30 | 2.50 | 2.70 | 2.90 | 2.90 | 2.90 | ×1.26 | ×1.81 |
| **All in:** Soul | 2.00 | 2.15 | 2.30 | 2.45 | 2.45 | 2.45 | ×1.23 | ×1.81 |

Measured damage a turn on the range (`balance-sim-step1-full.md` section 10): plain rifle, normal share 71.6 → 103.8
(×1.4; 124.6 at level 12); plain rifle, all in 119.5 → 117.4 (**×1.0**); Sigil caster ×3.4 (it also learns Line
length); Outburst ×2.5; Faith ×2.2.

1. **A normal-share character tracks the table because the table was fitted to him.** The HP column is the plain
   rifleman's own growth plus a little (3.5 hits on a Soldier at level 1, just under 4 from level 12).
2. **The tracking stops at level 13.** A normal-share build caps its main Attribute at level 12 and its main Skill at
   13 (14 for the Outburst and Faith builds). From there its damage is flat for seven levels, and so is enemy HP
   (1.78 → 1.81): the table flattens because the character does.
3. **An all-in build gets ×1.23 from eleven levels and nothing after level 9.**
4. **Everything with no term at all falls behind:** grenades, blasts, hazards, bleeding, burning, flat class moves
   lose 45% of their worth against HP by level 12.
5. **Heals needed ×3.25 and had ×1.5**, which is why rules 1.20 added the factor.

## 1.6 All in ÷ normal share

The pair is the main Attribute and its attack Skill. Normal share and all in at each level (from `builds.ts`):
4/4 against 7/7 at level 1; 5/5 against 8/8 at 3; 7/6 against 9/9 at 6; 8/8 against 10/10 at 9; 10/9 against 10/10 at
12; 10/10 against 10/10 from 13.

| System | L1 | L3 | L6 | L9 | L12 | L20 | Which term |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Rifle: multiplier alone (computed) | 1.30 | 1.27 | 1.18 | 1.14 | 1.02 | 1.00 | the slope |
| Rifle: the roll alone, +3 / +3 / +3 / +2 / +1 / 0 to hit on 65% (estimate) | 1.23 | 1.23 | 1.23 | 1.15 | 1.08 | 1.00 | the Skill is also the to-hit |
| Rifle: both, after a Soldier's armour (estimate) | 1.65 | 1.61 | 1.49 | 1.34 | 1.10 | 1.00 | flat armour widens it a little |
| **Plain rifle, measured** (step1-full 3.1) | 1.67 | 1.65 | 1.45 | 1.28 | 1.04 | 1.13 | |
| **Best gun, measured** (damage-step-guns 3.2, ceiling rows) | 1.57 | 1.53 | 1.47 | 1.31 | 1.20 | 1.03 | + Mastery perk steps earlier |
| Sigil: multiplier alone | 1.35 | 1.32 | 1.23 | 1.16 | 1.04 | 1.00 | the slope (0.1 / 0.1) |
| **Sigil 3-glyph Line, measured** (damage-step-magic 3.2) | 1.67 | 1.61 | 1.36 | 1.05 | 1.13 | 0.96 | + the roll; + Max Sigil words from Intelligence |
| **Sigil 4-glyph Line, measured** | n/a (normal can't) | 1.01 | 0.98 | 1.27 | 1.07 | 0.99 | drawing AP is Expression's, which all in lacks |
| Outburst: multiplier alone | 1.29 | 1.26 | 1.24 | 1.23 | 1.07 | 1.00 | the slope (0.05 / 0.1) |
| **Outburst steady, measured** (outburst-rework-2 7.2, 7.3) | 1.51 | 1.83 | 1.60 | 1.42 | 1.16 | 1.09 | + the roll; + Strain limit `3 + ⌊Will Power / 2⌋` |
| Faith: Blessing power alone | 1.31 | 1.20 | 1.19 | 1.11 | 1.05 | 1.00 | the slope; no roll |
| Faith: whole turn | about 1.0 (lead's reading of faith-fit) | | | | | | the rifle half is in weak hands; the Hymn wait `9 − 0.75 Faith − 0.25 Virtue` (rules 1.22, in flight) is the term to watch |
| Healing given alone | 1.35 | 1.32 | 1.23 | 1.16 | 1.04 | 1.00 | the slope (0.1 / 0.1) |

Four findings, and the first is pushback:

1. **The slope is not what makes all in 1.6.** Today's slopes already give 1.29 to 1.35, a few points from your
   1.25. The rest is the roll (×1.23), flat armour, and gates that open on the same points (Max Sigil words, Strain
   limit, Mastery perk steps at 3/5/7/9).
2. **The ratio cannot be held at level 20 by any formula.** From level 13 a normal-share build has 10/10 in its main
   pair. It *is* all in for that system. (Question 2.)
3. **Sigil is already there.** All-in Sigil is 142–205% and normal share 140–205%: the same band. Only the normal
   share has to come down.
4. **The fits of 1.17 to 1.21 hold "in the same hands".** Best gun ÷ plain rifle is about 1.4 for both shares. The
   ceilings were fitted as a ratio to the rifle beside you, and that ratio does not care about the share. What is over
   is the all-in plain rifle itself.

## 1.7 The cost ledger

"In the tables" means inside the percentages of the range runs: 8 turns, one target with a Soldier's numbers that
starts 13 tiles away and never acts (`test/balance/sim.ts:20-22`, `:43-49`), a fresh fight every run
(`sim.ts:94`, `:108`).

| System | Cost or set-up | In the tables? | Evidence |
| --- | --- | --- | --- |
| **Guns** | Reload 2 AP (tactical 3), clear a jam 2 AP | yes | `policies.ts:100-101` |
| | Heat (−1 to hit per 2, jam at the limit), Vent | yes | engine rules run; `policies.ts:511` |
| | Recoil, range bands, the long rifle's bolt | yes | engine previews |
| | Magazines carried (cut to the carry limit) | yes, for 8 turns | `builds.ts:212-219` |
| | Walking into range | yes (the first turn) | 13 tiles apart, `sim.ts:21` |
| | Ammunition in credits (rifle round 2, .700 round 40) | **no** | nothing prices credits |
| | Rounds over a session of several fights | **no** | every fight is fresh |
| | Pressed, Suppressed, cover on the target | **no** on the range | `sim.ts:45` |
| **Melee** | Closing 13 tiles | yes | walking turns are counted |
| | Momentum to build and spend | yes | the policy holds the Finisher, `policies.ts:144-150` |
| | Momentum lost to hits (`hit_loss 1`), Pressed | **no** | "no Momentum lost to hits", `sim.ts:45` |
| | Standing in reach and being hit; opportunity attacks | **no** | the target never acts |
| | A target that walks away | **no** | |
| | Durability | yes, 8 turns | wear runs in `combat.ts:1110` |
| **Thrown** | 2 AP, the item is spent, credits | not measured at all | PATCH-TALLY 10, row 3 |
| **Sigil** | Glyph AP (1 − 0.1 × (Expression − 1)), 1 to 2 charge and 1 Flux a glyph | yes | engine previews |
| | Evoke 1 AP + charge; core swap 2 AP; Vent 1 AP | yes | `policies.ts:222`, `:238-239` |
| | Turns of drawing (1.1 to 2 a Line) | yes ("over the turns it takes") | damage-step-magic 3.2 |
| | One step to stand beside the Line | yes | `policies.ts:213-215` |
| | Cores in credits (150 each), cores over a session | **no** | fresh fights |
| | A target that moves off the Line, or dies first | **no** | |
| | The caster hurt or Downed mid-Line; rooted on its glyphs | **no** | "nobody going down half-way through a Line", `sim.ts:46` |
| **Outburst** | Begin 2 AP, Pump 1 AP, Release 1 AP | yes | |
| | Strain, the wait when the heart is full, the burn | yes | `policies.ts:332`, `:365-366` |
| | Feelings that cost HP or Strain | yes (steady play refuses those over 1 Strain) | `policies.ts:366` |
| | MP in one fight | yes, but it rarely binds in 8 turns | |
| | MP over a session | **no**. Rules 1.24 (MP off Virtue, Pumps cost MP) is being written by another agent: this row is about to become a real cost and the Outburst numbers below depend on it |
| | Walking into reach 8 | yes | |
| **Faith** | Whisper 1 AP once a turn; Hymn 3 AP; the Hymn wait | yes | faith-measure |
| | Devotion gates (Hymn I/II/III at 3/5/7) | assumed by level, `builds.ts:101` | |
| | A Miracle's 5 Devotion levels, once a session | exempt by ruling | |
| | Ammunition, cores, MP, Strain, a roll, a range to close, a tool to hold | **none exist**. Your reading is right: Faith is the one system with no cost and no set-up beyond the wait |
| **Medic's kit** | Triage 2 AP next to the ally; a stim 1 AP and a dose; Rally once a scene | measured in heal-measure, under fire | |
| | Supplies over a session; standing next to the wounded | **no** | |
| **Class moves** | AP, Momentum, Guard, charge, once a scene | not measured | PATCH-TALLY 10, row 5 |
| **Calls** | AP, Authority, one a round | support worth is an estimate | PATCH-TALLY 10, row 10 |

**What every table leaves out, in one list:** anything the enemy does (hits taken in reach, Momentum and Lines lost,
Pressure, a healer hunted), a target that moves or dies early, and anything that lasts longer than one fight
(rounds, cores, MP, Supplies, credits).

## 1.8 Verdict

The sink is unified with three leaks (shields skipped by front door 3, heals that skip `healUnit`, armour in seven
places). The sources are not: seven formulas, four different attribute slopes, a level term in two of them, a
"system patch" constant in two more, and one whole class of content (class moves, perks, conditions) whose numbers are
not data. A new system added today would have to invent an eighth.

---

# Part 2. The design

## 2.1 The formula and the one function

```
amount  = floor( (base + flat) × Stat × Level × Π own × (1 + min(1, Σ target)) × crit )
dealt   = max(1, amount − armour(target, type, pierce))      then applyDamage (the sink)
healed  = amount × Healing received                           then healUnit
shield  = amount × Shields received                           then grantShield
```

1. **base** is declared in data. It may carry per-point parts for things that are honestly additive:
   `base + per × n` (an intervention's 20 + 4 × Devotion, a bow's 20 + 5 × Raw Power, Field Repair's 3 × Improvisation,
   Guilt's 10 × stage).
2. **flat** is what perks add (`damage_out` `ctx.add`).
3. **Stat** = `1 + Σ over the action's pairs (a × (Attribute − 1) + s × Skill)`. The slopes `a`, `s` come from the
   action's **profile**, not from the action. For an enemy, Stat is its tier's `damage`.
4. **Level** = the profile's column of one table, at the dealer's level. For an enemy it is `damage_mult`.
5. **own** = the multiplicative stack as today: technique, stage, shape, Line, rarity, ammunition, conditions, perks.
6. **target** = "against this target" bonuses, added together, capped at +100% (today's `VS_CAP`).
7. **crit** = ×1.5 to ×2.0 by the existing rule, for any action that rolls.
8. Order and rounding are today's: additive inside Stat, then multiply, floor once at the end, minimum 1 after armour.
   This is `rules.json conventions.additive_then_multiplicative`, now with the level term named.

One module, `packages/engine/src/effects/output.ts`:

```ts
interface AmountSpec {
  kind: 'damage' | 'heal' | 'shield';
  base: number; per?: { of: string; value: number }[];       // of: 'devotion', 'raw_power', 'stage', 'momentum_spent', …
  profile: string;                                            // rules.json output.profiles
  type?: 'physical' | 'sigil' | 'elemental' | 'soul' | 'true' | …; armour?: 'full' | 'half' | 'none';
  rolled?: boolean; shield?: boolean; credit?: 'all' | 'hp' | 'none'; provisional?: boolean;
}
amountOf(spec, by: Unit | null, ctx: { cb, target?, mults?: Term[], crit?: boolean, preview?: boolean }): { amount: number; terms: Term[] }
armourAgainst(target: Unit, type, o?: { pierce?: number; ignore?: boolean; ammo?: string }): number     // the only place armour is read
deal(cb, by, target, spec, ctx): DamageResult        // amountOf → damage_out → armourAgainst → applyDamage
mend(cb, by, target, spec, ctx)                      // amountOf → healUnit or grantShield
```

`attackDamage`, `harm` and `hurtUnit` stay as thin wrappers that build a spec and call `deal`, so no caller changes in
the first step. `damage_out` fires for every source that has a dealer and sees `{spec, base, add, mults, vs, src}`;
`terms` is the labelled list the dice panel already prints for weapons, now for everything.

## 2.2 The level term

1. **One table, two columns, in `data/rules.json output.level`:** `deal` and `mend`, 20 rows each.
2. **Why not one curve.** What a character deals has to follow enemy HP; what it heals has to follow enemy damage. In
   the rules 1.15 table those are different shapes (HP ×1.54 at level 9, damage ×1.24), because HP was fitted to how
   characters gain damage (points, early) and damage to how they gain HP (levels, late). One curve for both would be
   24% wrong at level 9. If the enemy table is ever re-fitted, make its two columns one curve and this becomes one
   (question 4).
3. **`mend`** is today's `mendFactor`: the enemy damage column, read from the same place.
4. **`deal` in stage (a) is ×1.00 at every level.** That is what the game does today. The slot exists; nothing moves.
5. **`deal` in stage (b)** carries the growth that the slope gives up (2.3), and is derived, not chosen: it is the
   number that leaves the normal-share plain rifle exactly where it is at every level.
6. **What happens to the four patches:**

| Patch | Stage (a) | Stage (b) |
| --- | --- | --- |
| Sigil Line multiplier ×1.7 / 1.75 / 1.8 | kept, as an `own` multiplier in data | **kept as Sigil's identity**: longer Lines are worth more. Its level is re-fitted |
| Outburst Damage base 40 | kept as `base` | kept as `base`, re-fitted once |
| `mendFactor` | becomes `Level.mend` | unchanged |
| Blessing power | becomes the `blessing` profile's Stat | reads Virtue as well as Faith (landed slopes) |
| Enemy `tier damage × damage_mult` | already this shape | unchanged |

7. **Time to kill is constant by construction** for the reference build, because `deal` is defined from it; and for
   every other build to the extent that its Stat follows the same pair progression (within ±4%, section 2.4).
   **Time to die is not** in the damage engine's hands while a character's armour is a flat number and the enemy's
   damage is a multiplier (the ×3.25 of section 1.5). The armour step has to scale armour the same way on both sides,
   or state the ×3.25 as intended.

## 2.3 The attribute term and the 1.25

**The ruling:** an all-in build reaches the ceiling; a normal-share build with the same kit is at ceiling ÷ 1.25.

1. **For an action that rolls to hit**, +3 in the attack Skill is +15 points of hit chance on 65%: ×1.23. With a
   Soldier's armour that leaves ×1.015 for the damage itself. So the **aimed** profile is **0 a point of Attribute,
   0.005 a point of Skill**. Its build dial is the roll (and Critical damage, and what the Skill unlocks).
2. **For an action that always lands** (a prayer, a heal, a shield, a Burst or Wave with no roll, a blast), the slope
   is the whole dial: **0.06 a point of Attribute over 1, 0.06 a point of Skill** gives 1.254 at 7/7 against 4/4. This
   is the **landed** profile. It is within 4 points of every slope the game has today.
3. **The same two profiles for every system.** Guns, blades, a Sigil bolt, an Outburst Bolt or Lance: aimed. Prayers,
   healing, shields, area shapes, thrown: landed. Today's four different slopes go.
4. **The ratio by level, both profiles (estimate):** 1.25 at levels 1 to 7, 1.17 at 9, 1.08 at 12, 1.00 from 13. It
   closes because the normal build catches the cap, not because of the formula.
5. **Pushback you should hear before saying yes.** With no damage slope, a rifle in untrained hands hits as hard as in
   trained hands; it only hits less often. A caster's sidearm at level 20 goes from 42 a hit to 69 (the specialist's
   is 72); its hit chance is 25% against 65%, so the specialist is still 2.7 times the dabbler, down from 4.5 times.
   That is the direct price of 1.25: if four points of investment are worth 25%, zero points cannot be worth much
   less than 60%. It is the 5e model (level carries damage, the stat carries accuracy) and it is coherent with an XP
   table you already paced on 5e. It does move every hybrid: the Faith build's rifle half, every caster's pistol.
   They are re-measured in stage (b).
6. **The gates have to be fenced too**, or the ratio comes back through them: Max Sigil words
   (`2 + ⌊(Intelligence − 1) / 2⌋`), the Strain limit (`3 + ⌊Will Power / 2⌋`), Mastery perk steps, the Hymn wait.
   Each is priced in the guard (2.7) as part of its system's all-in ÷ normal ratio, not left outside it.

## 2.4 Stage (b): the values, and what moves

**Fixed references:** the normal-share plain rifle (the 100% line) and the enemy table. Neither moves.

**The aimed profile.** `K = 1.47`, slopes 0 / 0.005, and `Level.deal`:

| Level | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10 | 11 | 12 | 13–20 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| `deal` | 1.00 | 1.07 | 1.09 | 1.16 | 1.19 | 1.25 | 1.28 | 1.35 | 1.37 | 1.44 | 1.46 | 1.53 | 1.55 |

`K` is a profile constant in `rules.json`, so `weapons.json` and every enemy number stay as they are. With these the
normal-share rifleman's hit is the same number as today at all 20 levels (computed; the deviation is rounding). Other
aimed systems use the same column with their own base: the normal-share Sigil bolt lands within +3 / −4% of today
across the levels, the Outburst Bolt within ±3%, the greatsword within ±2% (computed, base re-pinned once each).

**The landed profile.** Slopes 0.06 / 0.06, `Level.deal` not applied to it in the first fit (points carry its growth,
as today). Base re-pinned once per system: ×1.27 for Sigil areas and MEND / WARD, ×1.11 for Outburst areas, ×0.95 for
prayers (which now read Virtue too). Normal-share curves then sit within ±3% of today (Sigil ±6%).

**The all-in plain rifle against the references:** today 167 / 165 / 145 / 128 / 104 / 113% (measured); after
125 / 125 / 125 / 117 / 108 / 100% (estimate).

**The ceilings, re-pinned from the normal share to all in.** A system's own factor (best gun ÷ plain rifle and its
like) was fitted so that normal share = ceiling. It is re-fitted so that all in = ceiling:

| System | Ceiling (all in) | Normal share L1–7 | L9 | L12 | L13–20 | Normal share today |
| --- | --- | --- | --- | --- | --- | --- |
| Plain rifle | 100% is the normal share by definition; all in 125% | 100 | 100 | 100 | 100 | 100 |
| Best gun, steady | 145% | 116 | 124 | 134 | 145 | 143–146 |
| Outburst, steady | 135% | 108 | 115 | 125 | 135 | about 135 (109–154 by level) |
| Outburst, peak | 165% | 132 | 141 | 153 | 165 | about 165 |
| Sigil, full Line | 150–200% over its turns | 120–160 | 128–171 | 139–185 | 150–200 | 140–205 |
| Faith, Hymn turn | 125% | 100 | 107 | 116 | 125 | about 125 (being fitted) |
| Faith, Whisper turn | 80% | 64 | 68 | 74 | 80 | about 80 |
| Healer's turn | 1.25 Soldier-turns | 1.00 | 1.07 | 1.16 | 1.25 | about 1.25 |
| Shield | ×1.2 of the heal | same ratio | | | | |

1. **What drops for a normal-share build:** 20% at levels 1 to 7, 14% at 9, 7% at 12, nothing from 13.
2. **What drops for an all-in build:** the best gun from 228 / 223 / 214 / 187 / 175 / 148% to 145% (−36% at level 1,
   −2% at 20); the Outburst from 181 / 230 / 202 / 155 / 179 / 140% to 135%; Sigil almost nothing.
3. **How a system factor rises from ÷1.25 to ÷1.00 between levels 7 and 13:** on the ladder each system already has at
   those levels and which nobody has measured yet (PATCH-TALLY 10, rows 5 and 6): class rank III at level 12, the
   Mastered perk at 10 points, Hymn III at Devotion 7, the fourth glyph. Those are budgeted as the last 25%.
   If you would rather have one constant per system and no ladder, the factor is ceiling ÷ 1.12: all in is then 12%
   over the ceiling early and 12% under it late, and a normal build is 11% under at every level. I recommend the
   ladder: it gives ranks and Mastered perks a job and a size.
4. **Fight length (estimate, not measured).** Against today's branch a squad of normal-share optimised builds deals
   about 20% less to level 7, so its fights run about a round longer in five. Against the rules 1.15 targets nothing
   is broken: the table was fitted on the plain rifle at 100%, and every optimised normal build is still at 100 to
   116% of it or above. An all-in best gunner deals 2.2 times the yardstick at level 1 today and 1.45 times after, so an
   all-in squad's early fights stop being half the length the table was fitted for. Rules 1.23's Boss HP was fitted on the current numbers and needs one re-run.

## 2.5 The data schema

1. **`data/rules.json output`:**

```json
"output": {
  "level": { "deal": [1.00, 1.07, …], "mend": "enemies.levels.table.damage_mult" },
  "profiles": {
    "aimed":  { "k": 1.47, "attr": 0.0,  "skill": 0.005, "level": "deal" },
    "landed": { "k": 1.0,  "attr": 0.06, "skill": 0.06,  "level": null },
    "mend":   { "k": 1.0,  "attr": 0.06, "skill": 0.06,  "level": "mend" },
    "flat":   { "k": 1.0,  "attr": 0,    "skill": 0,     "level": "deal" }
  },
  "pairs": { "physical": "weapon phys block", "sigil": ["intelligence", "brain_power"], "soul": ["determination", "will_power"],
             "blessing": ["virtue", "faith"], "healing": ["insight", "empathy"] }
}
```

   `flat` is for things with no dealer's skill but a level: grenades, traps a character sets, damage over time from a
   character. In stage (a) the profiles are today's slopes (`physical` 0.1 / 0.05, `sigil` 0.1 / 0.1, `soul`
   0.05 / 0.1, `blessing` 0 / 0.1, `healing` 0.1 / 0.1) and `level` is null everywhere but `mend`.

2. **Every item that makes a number carries an `amount` block** (a weapon, a Sigil word, a school, a feeling's rider, a
   prayer, a class move, a perk, a condition, a hazard):

```json
"amount": { "kind": "damage", "base": 50, "profile": "landed", "pair": "blessing", "type": "soul", "armour": "none", "provisional": true }
"amount": { "kind": "heal", "base": 5, "profile": "mend", "pair": "healing" }
"amount": { "kind": "damage", "base": 20, "per": [{ "of": "devotion", "value": 4 }], "profile": "landed", "pair": "blessing" }
```

   A weapon's existing `damage`, `damage_type` and `phys` are read as an `amount` block by the loader; `weapons.json`
   need not be rewritten.

3. **Three new core ops in `data/effect_ops.json`:** `deal`, `mend` and `shield_grant` (the existing `heal` and `shield`
   ops gain `amount` and lose the dead `scale`), each `{ "op": "deal", "amount": {…}, "target": …, "area": … }`. With
   them a class move that hurts is data, and the bespoke ops that only exist to compute a number
   (`blessing_damage`, `chain_damage`, `field_repair`, `rig_tile`'s 30 …) lose their arithmetic.

4. **The validator** (`tools/validate.py`) checks: every `amount` has a known `kind`, `profile`, `pair` and `type`; an
   item whose `text` names damage, healing or a shield has an `amount` block or an `adjudication` of `narrator`; no
   string formulas in a number field (this catches the longbow); and the budget of section 2.6 as a second pass.

5. **A lint in the engine tests:** no numeric literal in a call to `harm`, `hurtUnit`, `heal`, `healUnit`,
   `grantShield` or `applyDamage` outside `effects/output.ts` (today: about 40).

## 2.6 Cost, and the budget rule for new content

### The unit

Everything is in **rifle-turns**: 100% is what the normal-share plain rifleman deals in one 6-AP turn on the range at
that level. Healing is in Soldier-turns (`heal-shield-pass.md` 1.1). One AP is 16.7%.

### The cost adjustment

The tables already hold the costs marked "yes" in 1.7. For the ones they leave out, a stated allowance. Every rate is
**provisional** and proposed here, not measured.

| Cost class | What earns it | Allowance on the ceiling | To firm it up |
| --- | --- | --- | --- |
| **None** | no resource, no set-up, no roll, no tool, at any range (prayer) | **−15%** from the steady ceiling, or a wait of 3 rounds or more | already your ruling: see below |
| **Upkeep in the fight** | Heat, reloads, Strain, a wait, Momentum to build | 0: it is inside the measurement, as long as the run is 8 turns | nothing |
| **Session supply** | rounds, cores, MP, Supplies: a pool that three standard fights would empty without a rest | **+5%**; +10% if it also costs credits that matter at that level (a core at 150, a .700 round at 40) | a session of three fights with no restock |
| **Set-up that can be wasted** | each turn of preparation that a target can undo by moving or dying, or an enemy by hitting you | **+10% a set-up turn**, and the output is counted over the turns it takes | a target that moves; a caster under fire |
| **Rooted** | you must stay on or beside what you prepared | **+5%** | the same run |
| **Exposure** | you must stand in the target's reach to do it | **+15%** | the sandbag under fire, with a target that fights back |
| **Reliability** | a roll at 65% is already an expectation: 0. A save for nothing: price the effect at its chance | 0 | |
| **Ownership** | a weapon, an Evoker, an Emanator, a patron | 0: every build owns its tool | |

### Are the ruled ceilings consistent with this ledger?

| System | Ledger says | Ruled | Consistent? |
| --- | --- | --- | --- |
| Faith | no cost: steady ceiling −15%, or a wait | Whisper turn 80%, Hymn turn 125% with a wait of 3 or more rounds: about 95% averaged | **Yes.** The lowest average, and the wait is its price |
| Guns | upkeep (inside), session supply +5% | 145% | Yes: this is the reference for a costed system |
| Sigil | session supply +10%, two set-up turns +20%, rooted +5% | 150–200% over its turns, against 145% | **Yes.** 145 × 1.35 = 196 |
| Outburst | upkeep (inside), session supply +5% once rules 1.24 lands | steady 135%, peak 165% | **Not on the ledger alone:** it pays Strain and (soon) MP and its steady ceiling is under the gun's. It is consistent only if its damage type is counted: Raw ignores armour, worth more on an Elite (armour 10 to 16) than the range shows. That has never been measured (PATCH-TALLY 10, row 15). Until it is, I would hold 135% and not lower it for 1.24's MP cost |
| Melee | exposure +15%, and Momentum lost to hits is not in the tables | not ruled; measured 112–126%, 109–142% holding the Finisher | **No.** The system with the most exposure sits lowest. By the ledger its all-in ceiling is the gun's plus exposure: about **165%** (question 5) |
| Healer | Triage stands next to the wounded; magic heals do not | 1.25 Soldier-turns for all | Yes for magic; the kit should be allowed +15% for Triage |

### The budget rule

For a new weapon, technique, word, school, feeling, prayer, class move, perk or Weapon Art. Numbers are for the
**all-in** build; a normal-share build gets ÷1.25 by the formula, not by the designer.

**Step 1. The allowance for one use.**

```
allowed = (AP / 6) × tier × (1 + cost allowances) × target factor
```

| Tier | What | `tier` |
| --- | --- | --- |
| Plain | usable every turn by anyone holding the tool, no resource beyond upkeep | 1.25 (the all-in plain rifle) |
| Steady | the best thing a committed build does every turn | 1.45 |
| Peak | at most once in three turns by its own price (a wait, Strain, Momentum spent, a charged Line) | 1.65; and the three-turn average stays at Steady |
| Ultimate | a Weapon Art, once a fight, charged over turns | up to 2.5, **counted in the build's fight average**, which stays at Steady + 10% |
| Miracle | once a session, 5 Devotion levels | exempt |

**Step 2. Convert what it does into rifle-turns.**

| What it does | Worth | Yardstick to confirm it (all unmeasured today) |
| --- | --- | --- |
| Damage to one target | its expected damage ÷ a rifle-turn | the range |
| **Area** | per-target damage × the targets it is expected to catch: **1.6** for radius 1, a 3-tile cone or a chain of 2; **2.2** for radius 2 or a 10-round cone. So an area deals each target the single-target allowance ÷ that count (today's shapes are ×0.6 to ×0.7, the heal area share is ×0.4 for the same reason) | the cluster test: four enemies at the spacing the AI itself keeps after round 2, each shape fired 200 times, mean targets caught |
| **Control: AP taken from an enemy** | 1 AP off a Soldier = 1/6 Soldier-turn = 16.7%; a whole turn = 100%; an Elite ×1.4; a Boss ×3 and never a whole turn; never the same enemy two rounds running (the Cut Short rule, for everything) | the sandbag under fire with and without the control; damage taken is the reading |
| **A condition that weakens** (Slowed, Weakened, −to hit) | the share of the enemy's turn it removes × rounds, at its save chance | the same |
| **Damage over time** | the total over its rounds, ×1.0 for 2 rounds or fewer, ×0.75 for longer (the target dies or cleanses); true damage is counted before armour | a kill-time run against a Soldier and an Elite |
| **A reaction or held action** | its damage × the chance its trigger comes (0.5 until measured), and a unit has one reaction a round: at most one plain attack (33%) a round outside its own turn | count off-turn damage in the duel runs (the simulator already has `offTurnDmg`, `sim.ts:273`) |
| **A buff to an ally** | what it adds to that ally's turn: +10% damage for 2 rounds = 20% of a turn; +1 AP = 16.7% of the *receiver's* turn at the receiver's ceiling (Feed the Fire's +2 AP is 48% of a best gunner's turn for a 3-AP Hymn) | two characters on the range, with and without |
| A heal, a shield | Soldier-turns; a shield ×1.2; an area ×0.4 each, 1.6 in all | heal-measure |
| Reach | melee or touch: +15% (exposure). 8 tiles: 0. Beyond 12 or no line of sight: −10% | |

**Step 3.** Sum the conversions. If the sum is over `allowed`, lower the base. If the item is a multiplier on other
actions (a perk, a passive), convert it at the rate it applies and charge it against the build's Steady tier, not
against an action.

A worked example, a Weapon Art for the greatsword: 4 AP, once a fight, two turns of charge (it can be interrupted),
in reach. `(4/6) × 2.5 × (1 + 0.20 + 0.15) = 225%` of a rifle-turn on one target, and the build's fight average with
it must stay under 160%.

## 2.7 The guard

`packages/engine/test/balance/ceilings.test.ts`, inside `npm test -w @phc/engine`, so inside `npm run check`.

1. **Per item, static (under 2 seconds).** For every `amount` block: evaluate `amountOf` at the cap pair and the
   normal pair for levels 1, 3, 6, 9, 12, 20, against a Soldier of that level; convert with the item's AP and the
   table of 2.6; compare with `data/budgets.json` (the tier and cost classes each item declares). Fails over the
   allowance by more than **5%**. Also asserts the ratio cap pair ÷ normal pair is 1.25 ±0.03 at levels 1 to 7 for
   every profile, with the system's gates counted.
2. **Per reference build, played (estimate: 40 to 60 seconds).** The range, 9 builds × 2 shares × levels 1, 9, 20,
   8 fights of 8 turns, seeded. (The full run of every table took 1,032 seconds; this is about a twentieth of it.)
   Fails when an all-in build is over its ceiling by more than **8 points** (a cell is ±4 at 24 fights), or a
   normal-share build is over ceiling ÷ 1.25 by the same.
3. **The golden tables (stage (a) only, then kept as a regression):** the plain rifle's hit on each tier at each
   level, and one preview number per source, exact.
4. A failure prints the item, its allowance, its number and the term that is over. A deliberate exception is a line
   in `budgets.json` with a reason, which the validator lists.

## 2.8 Migration

**Stage (a): re-express. No number moves.**

| # | Step | Files | Proof | Risk |
| --- | --- | --- | --- | --- |
| a0 | Golden tables: record, before touching anything, the preview number of every source at the six levels for both shares, and the range tables of the plain rifle | `test/balance/golden.test.ts` (new) | it passes on today's tree | none |
| a1 | `effects/output.ts`: `amountOf`, `armourAgainst`, `deal`, `mend`; profiles with today's slopes; `Level.deal` ×1, `Level.mend` = `mendFactor` | `effects/output.ts` (new), `character.ts`, `effects/mending.ts`, `data/rules.json`, spec | golden: exact | low |
| a2 | Weapons through it: `attackDamage` builds a spec; the bow formula and the bayonet into data | `combat.ts`, `data/weapons.json`, `tools/validate.py` | golden exact; `fx-sweep` (2,022 cases) | medium: the busiest path. **The longbow changes from 20 to its written number: that is a bug fix, listed apart** |
| a3 | `harm` and `hurtUnit` become wrappers over `deal`; armour read in one place; the stacking rule in one place | `magic.ts`, `combat.ts`, `tactics.ts`, `physical/ranged/fire.ts`, `press.ts`, `perks/skeleton.ts` | golden exact | medium |
| a4 | Sigil and Outburst: one spec per word and school; the Sigil preview and resolve share one call | `sigil.ts`, `sigilwords.ts`, `magic.ts`, `data/sigils.json`, `data/soul_modules.json` | golden exact; magic-measure tables within ±1 point | medium; **after rules 1.24 lands** |
| a5 | Prayers and the kit: `amount` blocks in place of the negative `stat_mod` and the fallback literals | `faith.ts`, `data/patrons.json`, `effects/mending.ts` | golden exact; faith-measure, heal-measure tables | low; **after rules 1.22 and 1.23 land** |
| a6 | Class moves, perks, conditions, hazards: the roughly 40 literals into `amount` blocks; the `deal` / `mend` ops; the lint | `classes/*.ts`, `perks/*.ts`, `effects/core.ts`, `data/classes.json`, `data/perks.json`, `data/conditions.json`, `data/effect_ops.json` | golden exact; the lint at 0 | low each, many of them |
| a7 | The leaks, each a small ruling: heals that skip `healUnit`; shields against blasts; splash from the shooter | the sites of 1.2 | these **do** change behaviour: each gets its own line in the changelog | low |

Each step ships on its own. a1 to a3 are worth doing even if stage (b) is never taken.

**Stage (b): re-fit to the all-in ceilings. One data change per system, measured.**

| # | Step | Data | Measured by |
| --- | --- | --- | --- |
| b1 | The two profiles, `K`, `Level.deal`. The normal-share plain rifle must not move | `rules.json output` | golden plain-rifle table exact; step1-fit |
| b2 | Guns and melee: the system factor to all in = 145% (melee to its ruled ceiling) | `techniques.json`, rarity, ranks | guns-measure, both shares |
| b3 | Sigil: Line multiplier and bases | `sigils.json` | magic-measure |
| b4 | Outburst: base, stage table | `soul_modules.json` | outburst-measure |
| b5 | Faith: bases, Virtue in Blessing power | `patrons.json` | faith-measure |
| b6 | Heals and shields | `sigils.json`, `soul_modules.json`, `patrons.json`, `rules.json mending` | heal-measure |
| b7 | Flat things take `Level.deal` (grenades, traps, bleeding, burning, class-move flats) | their `amount.profile` | the guard |
| b8 | The guard on, Boss HP re-run, hybrids re-measured (the Faith build's rifle, the casters' sidearms) | `budgets.json` | `npm run check` |

**The biggest risk** is b1. It changes what a point of Skill is worth to every character, including ones the
simulator has no build for. The mitigation is that it is one block of data and the golden plain-rifle table says at
once whether the reference moved.

**What should not be unified, and why.**

1. **To-hit and saves.** They are checks, they belong to the roll engine, and for an aimed action they are the
   attribute term. Leave them where they are.
2. **The enemy table.** It already is base × tier × level. It reads the same function; its numbers stay its own.
3. **Miracles, Execution, the one-hit rule for an enemy 5 levels below, the Toll-Keeper's crossing.** They set HP to a
   state, not to an amount.
4. **Object HP and cover.** A different sink on purpose; objects have no armour types or shields.
5. **Out-of-fight healing on the sheet** (rest, story heals). It should use the same `amount` data but has no fight to
   emit hooks in.
6. **Durations, ranges, AP costs, Strain, Flux.** Not amounts. The budget rule prices them; the formula does not
   produce them.
7. **System identity.** Line length, stages and feelings, Momentum spent, Devotion: they stay as each system's own
   multipliers. The formula gives them a slot, not a common shape.

## 2.9 Questions for you

1. **1.25 with the roll counted means no damage slope on rolled attacks, and a rifle that hits as hard in anyone's
   hands.** Recommendation: **accept it.** It is what makes level the growth term you asked for, and accuracy still
   separates the specialist from the dabbler by 2.7 times at level 20. The alternative that keeps today's slope gives
   1.54 at creation, not 1.25.
2. **What is "all in"?** Recommendation: **the main Attribute and its attack Skill at the level's ceiling, and nothing
   else.** Later points in the same core buy defence, to-hit on other skills and breadth, not more of the same
   damage. The consequence is that a normal-share build becomes all in for its system at level 13 and reaches the
   ceiling there.
3. **Levels 13 to 20, then: is a capped normal build allowed on the ceiling?** Recommendation: **yes**, with the last
   25% carried by rank III and the Mastered perk (2.4 item 3). If you want all in to stay ahead to level 20, the only
   input left is breadth in the core (for instance +8% for each other Skill of the same Attribute at 10), and I would
   not: it makes Athletics a damage stat.
4. **Two level columns (deal, mend) or one curve?** Recommendation: **two now**, one when the enemy table is next
   re-fitted with HP and damage on the same curve.
5. **Melee's ceiling.** By the cost ledger it should be the highest steady number in the game, not the lowest.
   Recommendation: **all-in melee 165%** (the gun's 145% plus exposure), fitted in b2 and confirmed against a target
   that fights back.
6. **The Outburst sits under the gun while paying more.** Recommendation: **hold 135 / 165** until Raw damage has been
   measured against an Elite's armour, and do not lower it when rules 1.24 gives Pumps an MP cost: the session-supply
   allowance (+5%) covers that.
7. **Should a shield stop a grenade?** Today it stops a bullet and a spell and not a blast, a trap or a hazard.
   Recommendation: **a shield takes every hit except damage over time and true damage.**
8. **Do flat things grow with level** (grenades, traps a character sets, bleeding, burning, class-move flats)?
   Recommendation: **yes, by `Level.deal`.** Map hazards and barrels grow by the fight's level, as enemies do.
9. **Should the Elite and Boss guard cover more than Sigil?** Recommendation: **yes, one rule in the sink:** no single
   action takes an Elite or Boss at or above your level from full HP to nothing. The Saints' Verdict (130 to
   everything in sight) is the next thing it would catch.
10. **Prayer damage has no level term today** while prayer healing has. Recommendation: fold it into rules 1.22 only
    if that fit is still open; otherwise b5.
11. **How long may the guard make `npm run check`?** Recommendation: **one minute more** (the played part at three
    levels); the full six-level run stays a hand-run measurement.
12. **The cost allowances of 2.6 are my numbers, not measured ones.** Recommendation: adopt them as provisional
    (spec section 14) and firm them up with two new instruments, in this order: a range target that shoots back and
    moves; a session of three fights with no restock.

## Appendix: small things found on the way (not fixed: this was read-only)

1. The longbow deals a flat 20 (`combat.ts:884`; `weapons.json` holds a formula as text).
2. `soul_modules.json damage.text` says "starts from 36"; `damage.base` is 40.
3. `classes.json` texts for Triage, Stim Throw and Rally still say 20 / 30 / 20 × Healing given; the engine reads
   5 / 6 / 6 × Healing given × the level factor (`mending.ts:50-53`; rules 1.23 is in flight and may be about to fix it).
4. The generic `heal` op ignores `scale` (`effects/core.ts:212`).
5. CLAUDE.md says 82 bespoke ops; `effect_ops.json` has 113 (192 in all).
6. An enemy's blast splash is not scaled by its tier or level (`combat.ts:1173`).


## Leon's answers (12 Nov 2026)

1. **No damage slope on rolled attacks** (skill buys accuracy, level buys damage): **yes.**
5. **Melee's all-in ceiling goes up to 165%: yes, "but tanks is melee too so consider that".** The exposure allowance
   is for standing in reach; a Defender already has the armour, Guard and HP to stand there, so the tank's own melee
   must not also take the full allowance. To be settled in step b2 with the tank build measured: the lead's starting
   rule is that the allowance shrinks as the build's own protection grows, so the heavy-melee damage dealer reaches
   165% and the Defender sits lower.
7. **A shield stops blasts, traps and hazards** (everything but damage over time and true damage): **yes.**
8. **Flat things grow with level: yes.** "Standardize the formula will do this, balance everything around added
   multipliers so in the future changing things is just switching a number." Every system's identity is therefore a
   named multiplier in data on top of the shared formula; nothing is fitted by a number in code.
9. **The Elite and Boss guard covers every action: yes.**

The other questions stand at their recommendations.
