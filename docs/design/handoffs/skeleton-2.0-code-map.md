# Skeleton 2.0: code map

Made on 10 Nov 2026 by five read-only mapping agents, at version 0.17.0 plus the Physical 2.0 foundation (branch `claude/charming-gauss-hbq4n0`). The design is `docs/design/proposals/2026-11-nine-doors.md`, sections 13 to 16; the build order is `skeleton-2.0-PLAN.md`. Line numbers will drift once A, B and C merge: search by the function name.

The five parts, in order: derived numbers and the skill data; saves and debuff strength; checks and the Narrator; perks; Calls and the client.


---

## Code map: derived numbers and the skill data (Skeleton 2.0)

Read only; nothing was edited. All paths are under `/home/user/Project-Heaven-Cry`. Version at mapping: 0.17.0, branch `claude/charming-gauss-hbq4n0`.

### 0. Three facts that shape this area

1. **`skills.json` `per_point.effects` are read by nothing.** No engine, client, build or validator code reads `per_point` (the only grep hits are the unrelated `burn_per_point`). Every per-point number is hard-coded in `packages/engine/src/character.ts`. The data is documentation, so each move is two edits (the formula and the data line) that nothing forces to agree.
2. **`rules.json` `derived.*` and `attributes.json` `derived[].formula` are strings nobody parses.** The engine reads only `RULES.character`, `pressure`, `drill`, `momentum` and a few others.
3. **`per_point.text` is not shown on any screen.** `design/canvas-build/build.py` `skills()` (l.136-144) sends `summary`, voice lines and the `epccg` block to `protodata.json`. The proposal's 13.5.4 ("skill cards read from the data, so they follow") is not true for per-point lines; see trap 14.

### 1. `packages/engine/src/character.ts`: every derived function

Helpers: `P(c,id)` l.567 (skill points), `A(c,id)` l.568, `mod(p)` l.153 (−2 at 0, else p−1), `fx(c, stat, base, ctx)` l.570 (adds `statQuery` answers; skipped when the character has no perks, traits or class).

#### Must change

| Line | Function (fx stat) | Today | Skeleton 2.0 |
|---|---|---|---|
| 572 | `hpPerLevel` (`hp_per_level`) | `5 + 2 × durability` | `5 + 2 × pain_threshold` |
| 573, 782 | `maxHp`, `applyLevels` | call `hpPerLevel` | follow; no edit |
| 597 | `healingMult` (`mult_heal_given`) | `1 + 0.1×(Insight−1) + 0.1 × camaraderie` | `… + 0.1 × empathy`. One function serves healing and shields given, which matches 13.2 |
| 607 | `sigilCoreSaving` (no fx) | `floor(proficiency ÷ 3)` | `floor(brain_power ÷ 3)` |
| 608 | `sigilRangeBonus` (no fx) | `floor(0.5 × rumination)` | `floor(0.5 × brain_power)` |
| 619 | `soulRangeBonus` (`soul_range`) | `floor(0.5 × lore_master)` | `floor(0.5 × will_power)` |
| 623 | `readyDesigns` (`ready_designs`) | `max(min_ready_designs 3, 2 + floor(empathy ÷ 2))` | `… floor(will_power ÷ 2)` |
| 686 | `saveBonus` (`save_<fam>`) | body `guts`, brain `charisma`, heart `composure`; adds `skillRollMod(sk, {roll:'save'})` | brain `rumination`, heart `lore_master`. The `skillRollMod` call follows the new skill (trap 3) |
| 687 | `debuffStrength` (`debuff_<fam>`) | body `intimidation`, brain `eloquence`, heart `implication`, min 0 | Replace with strength by source (13.1.4): the delivering playstyle's alpha, or the gamma that spoke. This per-family function is what fills `u.dbf` and `mg.debuff` (section 2) |
| 722 | `critTakenPct` (`crit_taken`) | `0.1×(Perception−1) + 0.05 × durability`, cap 60% | `… + 0.05 × proficiency` |
| 727 | `ambushTakenPct` (`ambush_taken`) | `0.1 × reaction_speed` | `0.1 × analysis` |
| 729 | `healReceivedMult` (`heal_received`) | `1 + 0.1 × sensory`, used for heals and shields | Split: healing received `1 + 0.1 × camaraderie`; new shields received `1 + 0.1 × conscience` (needs a new fx stat and unit field; section 2) |
| 717 | `passive(c, skill)` (`passive:<skill>`) | `10 + mod(points) + skillRollMod` | Voice hooks get full points for a gamma (9.1.3). The gamma rule needs one shared helper beside `mod` (l.153); the check roll sites are in `game.ts` and `world.ts` (trap 8) |

#### Named in 13.2 and already correct (do not touch)

| Line | Function | Reads |
|---|---|---|
| 574 | `initiativeBonus` | `(Agility−1) + mod(reaction_speed)`. Stays on Reaction Speed (15.1) and stays points − 1 (9.1.3) |
| 579 | `defense` | Dodge = `max(0, mod(athletics))` |
| 581, 585 | `physicalMult`, `weaponMult` | `0.05 × raw_power`, or the weapon's `phys.hits_with` |
| 596 | `critMult` | `0.05 × dexterity` (moved in 1.12) |
| 600, 609 | `sigilMult`, `sigilDurationBonus` | `brain_power` |
| 602, 620, 621, 622 | `soulMult`, `syphonMult`, `strainLimit`, `moduleSlots` | `will_power` |
| 604 | `elementalMult` | `0.1×(Expression−1) + 0.05 × visualization` (see 13.4 below) |
| 725 | `elementalTakenPct` | `0.1 × pain_threshold` |
| 731, 733, 735 | `counterBonus`, `throwRange`, `ambushMult` | `raw_power`, `dexterity`, `ingenuity` |
| 737, 739 | `blessingPower`, `prayerCooldown` | `faith` |
| 741, 742 | `detectionRange` (no callers), `stealthOf` | `vigilant`, `ingenuity` |
| 615, 617 | `soulCastAp` (flat 2), `freePumps` | Empathy 3 and 7 give free Pumps. Not in the 13.2 table; leave |
| 556, 560, 578, 598, 605, 606, 618 | `carryLimit`, `injuryResistPct`, `movement`, `maxMp`, `maxSigilWords`, `glyphAp`, `soulCostSaving` | Attribute only |

#### Hard-coded copies outside `character.ts`

| File:line | What | Change |
|---|---|---|
| `packages/engine/src/classes/k.ts:512` | Beloved design check re-derives `2 + floor(empathy ÷ 2)` and skips the minimum of 3 | Call `readyDesigns(c)` |
| `packages/engine/src/game.ts:787` | Refusal text "You keep N designs ready (Empathy)" | "(Will Power)" |
| `packages/engine/src/game.ts:1023` | `applyKarma`: `consc = conscience × sign(amount)` added to every award | Read `authority` |
| `packages/engine/src/effects/damage.ts:105` | `healUnit`: `n × t.healRecv` | Keep (healing received) |
| `packages/engine/src/effects/damage.ts:116` | `grantShield`: `n × t.healRecv` | Read the new shields-received number |
| `packages/engine/src/combat.ts:353` | `visionOf`: `12 + 2×(Perception−1) + vigilant` | Stays (15.1) |
| `packages/engine/src/combat.ts:660, 681` | Sensing: `1 + floor(u.sensory ÷ 3)` | Stays (15.1) |
| `packages/engine/src/combat.ts:1674, 1678, 1682`; `sigil.ts:895, 906`; `classes/j.ts:284`; `perks/f.ts:318, 325` | Analyze range `4 + u.analysis`; cost 1 AP from 3; Weak Point at 5 | Range stays. Weak Point (l.1682) is reworded by 15.4: perk area |
| `packages/engine/src/classes/i.ts:351`, `classes/j.ts:1125` | The only Guard-on-Brace code: `max(1, 1 + mod(durability))` in two class moves | See ambiguity A1 |
| `packages/engine/src/glossary.ts:86` | Wiki text "Strain: limit 3 + half Will Power", "Empathy 3 gives a free Pump" | Still true; add the moved lines where the wiki names them |

### 2. What a unit carries (`unitFromCharacter`, `pcExtras`, `magicOf`)

`packages/engine/src/combat.ts:354-394`. These are fixed when the unit is built and refreshed only by `refitUnit` (`game.ts:1525-1536`, list `GEAR_FRESH`).

| Unit field | Built at | From | Change |
|---|---|---|---|
| `init` | 360 | `d20 + initiativeBonus(c)` | none |
| `def`, `maxHp`, `movement` | 358, 360 | `defense`, `maxHp`, `movement` | follow |
| `vigilant`, `vision`, `sensory` | 364, 368 | raw points; `visionOf` | none |
| `proficiency`, `dexterity`, `athleticsPts`, `analysis` | 367, 368 | raw points | none for the moves |
| `strength` | 368 | `mod(raw_power)` (shove contests, `combat.ts:1368`, `tactics.ts:284`) | none |
| `sv` {body, brain, heart} | 387 | `saveBonus` | follows the function |
| `dbf` {body, brain, heart} | 387 | `debuffStrength` | The per-family shape cannot express "by source". Read in `magic.ts:206` (`unitDebuff`), then `magic.ts:260, 293, 347` and `classes/k.ts:871` |
| `critTaken`, `elemTaken`, `ambushTaken`, `healRecv` | 389 | the four functions | follow; add a shields-received field here, to the `Unit` interface (l.126), and to `GEAR_FRESH` (`game.ts:1526`) |
| `counter`, `throwRange`, `ambushMult`, `blessPower`, `ingMod`, `stealth` | 389-390 | functions | none |
| `sk` | 377 | item d20 mods per skill | none |

`packages/engine/src/magic.ts:158-171` `magicOf` (interface l.44-62):

| Field | From | Change |
|---|---|---|
| `healMult` | `healingMult` | follows (Empathy) |
| `coreSave`, `rangeBonus` | `sigilCoreSaving`, `sigilRangeBonus` | follow (Brain Power) |
| `soulRange` | `soulRangeBonus` | follows (Will Power) |
| `saves` | `saveBonus` ×3 | follows |
| `debuff` | `debuffStrength` ×3 | same redesign as `dbf` |
| `brain`, `will`, `sigilMult`, `soulMult`, `elemMult`, `durBonus`, `syphon`, `strainLimit`, `freePumps` | unchanged functions | none |

The same numbers are frozen in a third place: `packages/engine/src/classes/i.ts:1027-1028`, a stored spell's `nums` and `debuff`, with `sigilCoreSaving` at l.1024.

No gamma skill except Vigilant and Sensory is copied onto the unit. The Calls need Authority, Charisma, Eloquence, Composure, Reaction Speed, Intimidation and Implication points: add fields here or read `charOfUnit(u)`. Enemies have no character; their saves and strengths come from the tier tables at `magic.ts:192-193`.

### 3. How item effects reach these numbers

- `packages/engine/src/effects/hooks.ts:176` `statQuery(x, stat, ctx)` sums handler `stat()` answers and generic `stat_mod` effects for one stat name.
- `packages/engine/src/effects/core.ts:58-63` `STAT_MAP` maps a data `stat` to an fx name. Only these are claimed: hp, move, defense, dodge, init, armor, crit_damage, max_sigil_words, strain_limit, outburst_range and soul_spell_range (to `soul_range`), module_slots, ready_designs, vision, carry, injury_resist, mp_max, hp_per_level, glyph_ap, attack, ap.
- `core.ts:92-99` `skillRollMod` carries item mods (`skill_mod`, `skill_mod_tag`, handler `skill:<id>`) to every d20 that uses a skill, saves included.
- `core.ts:100-101` `save_mod` answers `save_<family>`.
- `core.ts:138-141` `heal_received_mult` multiplies on `heal_in` only, never shields.

Handlers that answer a stat tied to a moved number:

| File:line | Item | Answers | Effect of the move |
|---|---|---|---|
| `packages/engine/src/perks/h.ts:245-253` | Paper (the Oils): "one point's worth off Durability, Pain Threshold, Sensory" | `skill:` −1 for the three; `hp_per_level` −2; `elemental_taken` −0.1; `heal_received` −0.1 | HP per level and elemental still belong to an Endurance skill. `heal_received` no longer does (Camaraderie and Conscience hold it): drop it or let Leon rule. Durability's new line is Guard on Brace |
| `packages/engine/src/perks/f.ts:367` | Red Line | `save_heart` +1 or +2 | Family-keyed: follows |
| `packages/engine/src/perks/g.ts:661` | Cold Case obsession | −1 on the three saves | Family-keyed: follows |
| `packages/engine/src/perks/d.ts:891, 899` | Music traits `songSync` | `SAVE_SKILL = { guts, charisma, composure }` moves `u.sv[fam]` with the song | Change the map to rumination and lore_master |
| `packages/engine/src/magic.ts:198` | `unitSave` | `condSkillMod(u, 'charisma')` on brain, `'composure'` on heart | Change the two names (trap 4) |
| `data/traits.json:3645` | a trait's `stat_mod outburst_range` | adds to `soul_range` | follows |
| `data/classes.json:1163` | Occult Library `stat_mod ready_designs` | +1 | follows |

### 4. Data

#### `data/skills.json` (the `per_point` block; line of the key given)

| Skill (slot) | Line | Today | Skeleton 2.0 |
|---|---|---|---|
| durability (α) | 47; `gates` 62 | hp_per_level +2; crit_damage_taken_pct −5; gates `armor:heavy` | Guard on Brace 1 + modifier; both stats leave; the gate leaves (13.3) |
| pain_threshold (β) | 200; `gates` 210 | elemental_damage_taken_pct −10 | add hp_per_level +2; add gate `armor:heavy` |
| sensory (γ) | 344 | heal_received_pct +10 | sensing 1 + Sensory ÷ 3 tiles (in the spec l.399 and engine, never on the skill); Warn |
| raw_power (α) | 493 | mult_physical 0.05; counter | add "strength of your melee conditions" |
| guts (β) | 653 | save_body | none |
| intimidation (γ) | 802 | debuff_body | Threaten only |
| athletics (β) | 955 | dodge | none (ambush did not come here: 15.1) |
| dexterity (α) | 1102 | throw_range; recoil_reduction; text says +5% Critical but there is no effect for it | add the crit effect; add strength of shots' conditions |
| reaction_speed (γ) | 1255 | ambush_damage_taken_pct −10; text "adds its modifier to Initiative" | ambush leaves; Initiative kept; Cue |
| ingenuity (α) | 1401 | stealth 0.5; mult_ambush 0.05 | add strength of traps |
| proficiency (β) | 1569 | sigil_core_saving 0.3334 | crit_damage_taken_pct −5 |
| vigilant (γ) | 1719 | detection +1 | kept; add Vision (in the engine and spec, missing here); Spot |
| brain_power (α) | 1862 | mult_sigil 0.1; sigil_duration 0.5 | add sigil_range 0.5 and sigil_core_saving; strength of Sigils' conditions |
| rumination (β) | 2020 | sigil_range 0.5 | save_brain |
| eloquence (γ) | 2179 | debuff_brain | Brief (and Persuade's strength) |
| visualization (α) | 2328 | mult_elemental 0.1 | value per 13.4 (A2) |
| analysis (β) | 2476 | analyze_range +1 | add ambush_damage_taken_pct −10 |
| charisma (γ) | 2620 | save_brain | Rally (and the offer of terms' strength) |
| empathy (α) | 2767 | soul_cast_ap −0.5 (stale); soul_designs_ready 0.5 | mult_heal_given 0.1; remove both old lines (13.4). Free Pumps (engine l.617) are not in the data or the 13.2 row (A4) |
| camaraderie (β) | 2922 | mult_heal_given 0.1 | healing received +10% |
| implication (γ) | 3072 | debuff_heart | Taunt |
| will_power (α) | 3219 | mult_soul 0.15; mana_syphon_pct 10; strain_limit 0.5; soul_module_slots 0.3334 | mult_soul 0.1 (13.4); add soul_range 0.5 and ready designs 0.5 |
| lore_master (β) | 3392 | soul_range 0.5 | save_heart |
| composure (γ) | 3544 | save_heart | Steady |
| faith (α) | 3694 | mult_blessing; prayer_cooldown | add strength of Blessings' conditions |
| conscience (β) | 3855 | karma_per_award +1 | shields received +10% |
| authority (γ) | 4001 | reputation_per_award +1; Leadership | add karma_per_award +1; Order |

Slots are already correct in the data (Agility swapped in 1.12).

Other keys in each item:
- `tags` are live: `skill_mod_tag` reads `slot`, `tags`, `core:`, `attr:` (`core.ts:84-88`) and `music.ts:177` reads tags. Data uses only `core:*`, `attr:expression`, `any` today, so retagging words like `defense` or `debuff` is safe, but keep `core:` and `attr:`.
- `summary` is on the card. Rumination's "Mirrors Lore Master" stays true; Sensory, Charisma and Composure summaries name nothing that moved.
- `epccg.effect` is 2020 wording shown in the "?" pop-up ("Heal/Shield received bonus" on Sensory, "Brain Debuff save roll" on Charisma, "Sigil Range bonus" on Rumination and so on). The file's `epccg_note` says the spec and `per_point` win. Do not rewrite: it is the EPCCG's text.
- `unlock_categories` (top of file) names beta "Passive, AP Mod" and gamma "Combat Starter, Conversation Quirk": descriptive only.

#### `data/rules.json` `derived` (strings, l.294-383)

| Line | Key | Change |
|---|---|---|
| 298 | `hp_per_level` "5 + 2*durability" | pain_threshold |
| 307 | `crit_damage_taken_pct` "… − 5*durability" | proficiency |
| 309 | `ambush_damage_taken_pct` "-10*reaction_speed" | analysis |
| 310 | `healing_received_pct` "10*sensory" | camaraderie; add a shields-received line (conscience) |
| 313, 314 | `saves.brain`, `saves.heart` | mod(rumination), mod(lore_master) |
| 316-319 | `debuff_strength` by family | the by-source rule |
| 332 | `multipliers.elemental` "1 + 0.2*(expression-1) + 0.1*visualization" | stale: engine and spec item 587 say 0.1 and 0.05 |
| 335 | `healing_given` "… + 0.1*camaraderie" | empathy |
| 343 | `sigil_core_saving` "floor(proficiency/3)" | brain_power |
| 344 | `sigil_range_bonus_tiles` "0.5*rumination" | brain_power |
| 350 | `soul_range_bonus_tiles` "0.5*lore_master" | will_power |
| 381 | `karma_bonus_per_award` "+conscience" | "+authority" |
| 1159 | `ready_designs` "2 + floor(empathy/2)" | will_power |
| 1131 | Sigil `hit` "…12 + debuff_strength" | wording for the source rule |
| 1223-1227 | `social.break_not_persuade` (intimidation body, eloquence brain, implication heart) | the speech side of the debuff rule: check with the Calls |
| 300, 304, 305, 325-328, 331, 333, 334, 336-338, 345, 348, 351-353 | initiative, dodge, counter, senses, other multipliers | already right |

Other data strings that restate a moved formula: `data/sigils.json:88` (`range_bonus` "floor(0.5 x Rumination)"), `data/soul_modules.json:135` (`ready_designs` "max(3, 2 + floor(empathy/2))"), `data/classes.json:1532` (Brace text "1 + your Durability modifier", still true).

#### `data/attributes.json` `derived[].formula` (strings)

| Line | Stat | Change |
|---|---|---|
| 137 | `crit_damage_taken_pct` "… − 5% × Durability" | Proficiency |
| 203 | `mult_heal_given` "… + 0.1 × Camaraderie" | Empathy |
| 181 | `mult_elemental` "1 + 0.2 × (Expression − 1) + 0.1 × Visualization", `per_point_above_1` 0.2 | stale: 0.1 and 0.05 |
| 225 | `mult_soul` "1 + 0.1 × (Determination − 1) + 0.15 × Will Power", `per_point_above_1` 0.1 | stale: 0.05 and 0.1 |
| 186 | `sigil_ap_per_word` "1 per word − 0.5 × (Expression − 1), minimum 1" | stale since rules 1.2 (engine: glyph AP 1 − 0.1 a point, min 0.5). Not in the proposal; fix while here or leave, but say which |
| 110, 142, 164, 230, 252 | init, critical, sigil, syphon, prayer | already right |

`design/canvas-build/build.py:28-38` `ATTR_FX` is a hand-written attribute blurb. No attribute-level number moves, so it stays; it is part of the paused canvas pipeline that still feeds `protodata.json`.

#### Gear gates (13.3) as they touch this area

- Weapons: `packages/engine/src/character.ts:963` `equip()` refuses a main-hand weapon whose `weapons.json` `requires` is unmet. It is not checked for the off hand or at creation.
- `data/weapons.json` today: `hellraiser_servo_fist` l.2761 `{proficiency: 3}`, `core_rifle` l.2929 `{proficiency: 3}`, `bot_thread_banner` l.3226 `{camaraderie: 3}`; also longbow raw_power 3, three brain_power 3, emanator_gauntlet will_power 3, lumeri_censer_gun faith 3.
- Heavy armour has no engine gate at all. `skills.json` `gates` arrays are read by nothing, and `armourCap()` (`character.ts:416`) is trait-only.

### 5. The spec's "Derived stats" (`docs/rules/PHC-Core-Rules-v1.0.md` l.130-196)

| Line | Row | Change |
|---|---|---|
| 139 | HP per level | Pain Threshold |
| 147 | Critical damage taken | Proficiency |
| 149 | Ambush damage taken | Analysis |
| 150 | Healing and shields received `+10% × Sensory` | two rows: healing (Camaraderie), shields (Conscience) |
| 151 | Saves | mod(Guts) / mod(Rumination) / mod(Lore Master) |
| 152 | Debuff strength by family | the by-source rule |
| 172 | Elemental `1 + 0.2 × … + 0.1 × Visualization` | stale against item 587 (l.4659) and the engine |
| 173 | Healing and shields given | Empathy |
| 185 | Sigil Core saving | Brain Power |
| 186 | Sigil range bonus | Brain Power |
| 190 | Soul cast AP row, "Empathy instead gives free Pumps" | still true |
| 191 | Soul range bonus | Will Power |
| 196 | Social | Karma to Authority |
| new | Ready designs | not in the table today (only l.1531 and l.1766) |

The same numbers restated elsewhere in the spec: l.399 (Sensory sensing, kept), l.1356 (Sigil range bonus), l.1397 (Sigil Core saving), l.1531 (ready designs by Empathy), l.2969 item 40 and l.3021 item 86 (history; add new items, do not rewrite), and l.1184-1186, l.229, l.1006, l.1312, l.2086 plus about fifteen perk and class rulings that say "12 + your Body/Brain/Heart debuff strength" (every one needs a source skill under 13.1.4). Items 953 and 954 (l.4920-4921) are the hook for the new section 14 items.

### 6. Each moved number in 13.2 (as amended by 15.1): where it lives

| Number | From → to | Engine | Data and spec |
|---|---|---|---|
| +2 HP a level | Durability → Pain Threshold | `character.ts:572` only | `skills.json` 47, 200; `rules.json` 298; spec 139. `attributes.json` 66 has no skill name |
| −5% critical damage taken | Durability → Proficiency | `character.ts:722`, onto `u.critTaken` (`combat.ts:389`), used at `combat.ts:874` | `skills.json` 47, 1569; `rules.json` 307; `attributes.json` 137; spec 147 |
| −10% ambush damage taken | Reaction Speed → Analysis | `character.ts:727`, `u.ambushTaken`, `effects/damage.ts:56` | `skills.json` 1255, 2476; `rules.json` 309; spec 149 |
| +10% healing received | Sensory → Camaraderie | `character.ts:729`, `u.healRecv`, `effects/damage.ts:105`; preview `classes/i.ts:472` | `skills.json` 344, 2922; `rules.json` 310; spec 150 |
| +10% shields received | Sensory → Conscience | the same `healReceivedMult` and `u.healRecv`, at `effects/damage.ts:116`: needs a new function, fx stat and unit field | `skills.json` 344, 3855; spec 150 |
| +10% healing and shields given | Camaraderie → Empathy | `character.ts:597`, `mg.healMult` (`magic.ts:164`), stored spells `classes/i.ts:1027`; direct callers in `combat.ts:1712`, `classes/i.ts:455`, `classes/j.ts:407, 456, 1114`, `classes/rev3.ts:587, 589`, `perks/e.ts:693` all follow | `skills.json` 2767, 2922; `rules.json` 335; `attributes.json` 203; spec 173 |
| Brain save | Charisma → Rumination | `character.ts:686`; `magic.ts:198`; `perks/d.ts:891` | `skills.json` 2020, 2620; `rules.json` 313; spec 151 |
| Heart save | Composure → Lore Master | the same three places | `skills.json` 3392, 3544; `rules.json` 314; spec 151 |
| Debuff strength | 3 gammas → the delivering skill | `character.ts:687`; carried as `u.dbf` (`combat.ts:387`), `mg.debuff` (`magic.ts:168`), stored spell (`classes/i.ts:1028`); read through `unitDebuff` (`magic.ts:206`) in about 12 files; direct calls `classes/i.ts:1151, 1553`, `perks/g.ts:446` | `skills.json` 802, 2179, 3072 and the alphas; `rules.json` 316-319, 1223-1227; spec 152 and the restatements |
| Sigil range +0.5 | Rumination → Brain Power | `character.ts:608`, `mg.rangeBonus` | `skills.json` 1862, 2020; `rules.json` 344; `sigils.json` 88; spec 186, 1356 |
| Cheaper Sigils | Proficiency → Brain Power | `character.ts:607`, `mg.coreSave`; `classes/i.ts:1024` | `skills.json` 1569, 1862; `rules.json` 343; spec 185, 1397 |
| Soul range +0.5 | Lore Master → Will Power | `character.ts:619`, `mg.soulRange` | `skills.json` 3219, 3392; `rules.json` 350; spec 191 |
| Ready designs | Empathy → Will Power | `character.ts:623`; copy at `classes/k.ts:512`; text `game.ts:787`; used in `character.ts:396`, `classes/rev3.ts:611`, `game.ts:787` | `skills.json` 2767, 3219; `rules.json` 1159; `soul_modules.json` 135; spec 1531 |
| +1 Karma on awards | Conscience → Authority | `game.ts:1023` only | `skills.json` 3855, 4001; `rules.json` 381; spec 196 |
| Guard on Brace | Defender's move → Durability's point | only inside class moves `classes/i.ts:351`, `classes/j.ts:1125` | `skills.json` 47; `classes.json` 1532 |
| Sensing the unseen | written onto Sensory (no move) | `combat.ts:660, 681` | `skills.json` 344 |
| Will Power Soul damage 15% → 10% (13.4) | data fix | engine is already 0.1 (`character.ts:602`) | `skills.json` 3219; `attributes.json` 225 |
| Elemental multiplier (13.4) | data fix | engine 0.1 and 0.05 (`character.ts:604`) | `skills.json` 2328 (0.1); `rules.json` 332; `attributes.json` 181; spec 172 |
| Empathy stale line (13.4) | data fix | engine: flat 2 AP (`character.ts:615`) | `skills.json` 2767 |

Stays put (15.1 overrides section 11): Initiative on Reaction Speed, Detection and Vision on Vigilant, sensing on Sensory, Dodge on Athletics, Analyze range on Analysis.

### 7. Traps

#### Hidden couplings

1. **Fight numbers are frozen at build time.** Changing a `character.ts` function changes new units only. `refitUnit` refreshes only `GEAR_FRESH` (`game.ts:1526`): `sv`, `dbf`, `critTaken`, `elemTaken`, `ambushTaken`, `healRecv` are in it; `mg` is not. A new unit field that should follow gear must be added there.
2. **`fx()` skips `statQuery` for a character with no perks, traits or class** (`character.ts:570`), although skill items (`SKILL_ITEMS`, `collect.ts:112`) can answer stats. Old behaviour: don't fix it in the move stage, or the before-and-after diff shows noise.
3. **Item skill mods follow the save's skill.** `saveBonus` adds `skillRollMod(sk, {roll:'save'})`. After the move, a trait's −1 Composure or −1 Charisma no longer touches a save and a ±Lore Master or ±Rumination mod does. This also changes story saves and the Stage 1 archetype diff for any build with such a trait.
4. **Left and Right Brain Debuff change what they hit.** `condSkillMod` (`magic.ts:201-204`) gives −2 to Mind skills (Left) and to Expression and Soul skills (Right). Charisma is Mind and Expression, so today both lower the Brain save; Rumination is Mind and Intelligence, so after the move only Left does. Lore Master is Soul like Composure: Heart is unchanged. The proposal does not list this.
5. **Songs and saves:** `perks/d.ts:891` `SAVE_SKILL` hard-codes guts, charisma, composure. Left as is, the song state would move the wrong save.
6. **Heal and shield share one number.** `healRecv` multiplies in both `healUnit` and `grantShield`. The generic `heal_received_mult` op (`core.ts:138`) and Paper's `heal_received` answer are healing-side only or shared, depending on the path; decide what a shield-side stat is called and whether Paper keeps its −10%.
7. **`debuffStrength` has no source argument,** and three carriers freeze it per family (`u.dbf`, `mg.debuff`, a stored spell). The "one function for debuff strength by source" of 13.5.3 must replace all three, or blows and spells keep reading the gammas. Several perks compute a strength inline from a gamma (`perks/f.ts:119, 589`; `perks/e.ts:484, 488, 653`): the perk and Calls areas.
8. **The gamma check rule must not leak into fight numbers** (9.1.3). `mod()` is called inline with a gamma's points at: `character.ts:574` (Initiative), `687` (strengths), `717` (passive); `hazards.ts:101` and `sigil.ts:1260` (passive Vigilant to spot traps and glyphs); `tactics.ts:131` (the roll to spot the Hidden). The check sites that should change are `world.ts:436`, `game.ts:631, 952, 1010`. Whether a Vigilant spotting roll in a fight is a "skill check" is not stated (A3).
9. **`readyDesigns` shrinks for existing casters.** A character with Empathy 6 and Will Power 2 goes from 5 ready designs to 3 but keeps 5 in `c.outbursts`; `game.ts:787` only blocks adding. `migrateCharacterSoul` (`character.ts:396`) reads `readyDesigns` as room. The proposal's answer is a new save every update (section 12.6); the code does not enforce one.
10. **HP for existing characters:** `c.hp` is stored, `maxHp` is derived. A Durability build loses max HP on load and `c.hp` may exceed it; units clamp at build (`hp: c.hp`, `maxHp: maxHp(c)` are set separately at `combat.ts:358`).

#### Looks related, must not change

11. `critMult` (`character.ts:596`) already reads Dexterity; `weaponMult` already follows `phys.hits_with`.
12. `soulCastAp` and `freePumps` (Empathy 3 and 7) are not in the move list.
13. `moduleGate`, `masteryPractice`, `gatedBy` (`character.ts:628-675`) read Soul gate skills from `soul_modules.json` (Lore Master, Implication, Composure, Camaraderie, Empathy). 9.5 names these gates as breaking the slot rule, but 13.6.3 says no unlock is moved. The tone rule "needs Lore Master 1" (`character.ts:271, 285, 376`) is the same.
14. `epccg.effect` text and the skill portraits: lore text, not rules.
15. `detectionRange` (`character.ts:741`) has no callers; Detection is not used anywhere in the engine. Don't wire it as part of a "move".
16. Reputation awards and Leadership are not built in the engine (no Authority read except the class helper `classes/rev3.ts:664`). "Authority: +1 Reputation" stays a data and spec line; only Karma has code.
17. `u.proficiency` (field repair `combat.ts:1448`, `perks/c.ts:269`), the Proficiency 3 checks in `perks/a.ts:510`, `perks/b.ts:887, 906`, `perks/e.ts:719`, and `storedCap` by Rumination (`classes/i.ts:989`) are perk and class rules, not per-point lines.

#### Tests that pin today's behaviour (`packages/engine/test/`)

| File:line | Test | Pins |
|---|---|---|
| `engine.test.ts:20-26` | "HP and movement (Derived stats)" | `durability = 2` gives `2 × (5 + 4)` HP: fails after the move |
| `perks-f.test.ts:196-200` | "I in a fight: +1 on the unit's Heart save; II: allies within 3 tiles +1" | `u.sv.heart` computed from `skills.composure` |
| `perks-f.test.ts:324-326` | the Pacifist Karma test | award = `2 × (5 + conscience)` |
| `subsystems.test.ts:258-263` | "a Shaken character is −2 on social checks…; Karma; …" | Karma exactly 10 with no Conscience: add Authority 0 if the archetype has any |
| `subsystems.test.ts:53-56` | "…every PC has saves" | Body save from Guts 4: unchanged, a good control |
| `subsystems.test.ts:85-88` | "Elemental damage taken: −10% per Pain Threshold point…" | unchanged, a control |
| `completeness-c2.test.ts:271-278` | the crash test using `initiativeBonus` and `saveBonus` | reads the functions; follows unless the trait in it mods Charisma or Composure (trap 3) |
| `effects.test.ts:32` | Rabbit's Foot: −1 Guts on the Body save | unchanged |
| `sigil-balance.test.ts:6-12` | "Elemental power follows the Physical slope…" | `elementalMult` = 2.4 at 10 and 10: pins the engine's 0.1 and 0.05 (A2) |
| `classes-rev3-moves.test.ts:369-372` | "Occult Library: one more ready design…" | compares two characters; follows |
| `sigil14-classes-i.test.ts:195, 210` | a Scribe with `proficiency: 11` | charge = `1 + 2 + max(1, 2 − sigilCoreSaving)`; the fixture sets Proficiency high to get the saving, so the expected charge changes once Brain Power drives it |
| `classes-i.test.ts:268, 401`, `classes-j.test.ts:439`, `perks-a.test.ts:68`, `perks-b.test.ts:286` | shield tests | expect `shield × healRecv`: pass while both are 1, but name the wrong field after the split |
| `classes-i.test.ts:320, 486` | read `f.pc.dbf.body` and `.heart` | break if `dbf` is reshaped |
| `outburst20*.test.ts`, `outburst40*.test.ts`, `sigil14*.test.ts`, `sigil15*.test.ts`, `spotlight.test.ts:271`, `classes-k.test.ts:30`, `completeness-d.test.ts:28`, `completeness-f.test.ts:31` | rigs | write `x.sv`, `p.dbf`, `mg.debuff`, `mg.coreSave`, `mg.rangeBonus`, `mg.soulRange`, `healRecv` by hand: any rename or reshape of these fields breaks dozens of rigs at once. Keep the names and add new fields beside them |
| `engine.test.ts:176-182` | "…Sensory senses what is close" | unchanged |
| `perks-h.test.ts:169, 178, 219, 232, 359-365` | Paper and other trait mods on `skill:` rolls and `passive(reaction_speed)` | roll mods stay; a gamma full-points rule changes `passive` values but these compare before and after, so they follow |

There is no test of `critTakenPct`, `ambushTakenPct`, `healReceivedMult`, `sigilRangeBonus`, `soulRangeBonus` or `readyDesigns` against a named skill, so those moves are unguarded: the 46-archetype check tool (13.5.6) is the only net, and it does not exist yet. `tools/archetype_fill.py` only fills budgets; `ARCHETYPES` is exported from `packages/engine/src/data.ts:51`. `tools/validate.py` checks nothing in `per_point`, `attributes.json` formulas or `rules.json` `derived`.

#### Hard or ambiguous in the proposal

- **A1. Durability's point has no code to hold it.** 13.2 gives "Guard gained on Brace (1 + modifier)"; 13.6.1 says the shield-and-guard list is not built. Today Guard on Brace exists only as two class moves; the generic Brace (`combat.ts:1386-1389`) is a 1 AP weapon stance with no Guard, and Guard is a class resource. Either the line is data and spec only for now (a Durability point then gives a non-Defender nothing in the engine), or generic Brace must grant Guard to anyone with a shield, which is new mechanics in a "moves only" stage.
- **A2. Which elemental number is "the one".** 13.2 says Visualization "+10% elemental damage"; the engine, spec item 587 and `sigil-balance.test.ts` say +5% (and Expression 0.1). `skills.json`, `rules.json`, `attributes.json` and the spec table l.172 still carry 0.1 and 0.2. The table rows in 9.2 and 13.2 appear to copy the stale data. The engine's value is the accepted one (item 587) unless Leon says otherwise; the same goes for Soul (engine and spec 0.05 and 0.1).
- **A3. Scope of "a gamma adds its full points to a skill check".** Confirmed readings in 9.1.3 are "to confirm". Unstated: story saves that the Narrator lists with a gamma skill (`kind: 'save'`); the in-fight Vigilant spotting roll and passive; contests; Ask (`game.ts:631`); stealth notice rolls.
- **A4. Empathy's row drops things it still does.** 13.2 lists only healing given and songs' conditions; the engine keeps free Pumps on Empathy, and 13.4 only removes the stale AP line. The data line should state the free Pumps or Leon should move them.
- **A5. Heavy armour's gate has nothing to change in code.** 13.3 moves it from Durability to Pain Threshold, but no engine check exists and armour is a class number 0-5 (`ARMOUR`, `character.ts:571`), with "heavy" undefined in code. Likewise "light blades (new gate): Dexterity, as guns are": guns have no `requires` today either (only nine weapons do), so the gate is only the `skills.json` `gates` tag unless a number is given.
- **A6. Shields received needs a definition of "shield".** `grantShield` is one path for class shields, Blessings, Outburst shields and perks. 10.3 argues from Blessings but 13.2 says all shields.
- **A7. Section 11 versus 15.1.** Section 11's beta table (Athletics ambush, Proficiency Detection, Rumination crit, Analysis Brain save) is superseded by 13.2 and 15.1. The proposal's own 14 intro sentence ("Analysis takes critical damage resistance") contradicts 13.2 and 15.1 ("Proficiency takes critical damage resistance, and Analysis takes ambush resistance"); 15 wins.
- **A8. The data cannot express the new lines.** `stat_mod` with `basis: skill_mod` covers saves, but "strength of what your X inflict", "Guard on Brace" and a Call have no op in `effect_ops.json`. Since nothing reads `per_point.effects`, either add ops for form's sake or write these as `text` with an empty or `narrator` effect; the validator will not object either way (it does not look).


---

## Code map: saves and debuff strength (Skeleton 2.0)

Branch `claude/charming-gauss-hbq4n0` at df857ab, read only. All paths are under ``. Engine paths are relative to `packages/engine/src/` unless they start with `data/`, `docs/`, `apps/` or `packages/engine/test/`.

**State of the branch.** `physical/` holds only the lead's core and a few reference techniques (1,497 lines; `melee/links.ts`, `ranged/sets.ts` and `ranged/thrown.ts` are 3-line stubs). The technique lanes are not merged here, so most technique save callers do not exist yet. Re-run `grep -rnE '\b(save|cond|stop)\(t,' packages/engine/src/physical` after the Physical 2.0 merge.

### 1. Where the numbers are defined

| File:line | Symbol | Today | Skeleton 2.0 |
|---|---|---|---|
| `character.ts:686` | `saveBonus(c, fam)` | body = Guts, brain = Charisma, heart = Composure; `fx(c,'save_'+fam, mod(P(c,sk)) + skillRollMod({c}, sk, {roll:'save', family}))` | brain = `rumination`, heart = `lore_master`; body unchanged |
| `character.ts:687` | `debuffStrength(c, fam)` | `max(0, fx(c,'debuff_'+fam, mod(P(…))))` with body = Intimidation, brain = Eloquence, heart = Implication | Replace with strength by delivering skill (section 5) |
| `combat.ts:101` | `Unit.sv`, `Unit.dbf` | Per-family records, fixed when the unit is built | `sv` keeps its shape; `dbf` must be keyed by skill, or dropped for a live read |
| `combat.ts:387` (`pcExtras`) | fills `sv` and `dbf` | from `saveBonus` and `debuffStrength` for the three families | fill by skill |
| `magic.ts:57`, `167-168` | `MagicUnit.saves`, `.debuff` (`magicOf`) | A second per-family copy for casters | `saves` follows `saveBonus`; `debuff` is the per-family copy the Outburst code reads directly |
| `magic.ts:192-193` | `TIER_SAVE`, `TIER_DEBUFF` | Enemies: saves 0/1/2/3, debuff 0/1/2/2 by tier, same for every family | Keep; enemies have no skills. Decide that a foe's strength is its tier whatever the source |
| `magic.ts:196-199` | `unitSave(u, fam)` | base (`u.sv` → `u.mg.saves` → tier), Shaken −2 on heart, `condSkillMod(u,'charisma')` on brain, `condSkillMod(u,'composure')` on heart, residue | change the two skill names to `rumination` and `lore_master` (trap 2) |
| `magic.ts:206` | `unitDebuff(u, fam)` | `u.dbf` → `u.mg.debuff` → tier | becomes `unitDebuff(u, via)` |
| `magic.ts:207-208` | `saveOf`, `debuffOf` | local aliases | follow |
| `sigil.ts:1349-1352` (`enemyMagic`), `ai-soul.ts:48-55` | enemy `mg.saves` and `mg.debuff` | tier numbers copied to all three families | keep the tier number; reshape if `debuff` is re-keyed |
| `perks/h.ts:38` | restores `u.sv`, `u.dbf` from a snapshot | copies both | follow the new `dbf` shape |
| `classes/i.ts:1027-1028` | stored spell `sp.debuff` (per-family snapshot) | read at `i.ts:1065` as "debuff TN 12 + sp.debuff.body" | snapshot the Brain Power strength instead |
| `data/rules.json:311-320` | `saves` and `debuff_strength` formulas | old six skills | new saves; `debuff_strength` becomes "by source" |
| `data/rules.json:1000`, `1131` | save sentence; Affliction sentence | "12 + attacker debuff_strength[family]" | reword |
| `data/skills.json:655-661` | guts `save_body` | unchanged | unchanged |
| `data/skills.json:804-810` | intimidation `debuff_body` | per-point line | remove; Threaten Call line |
| `data/skills.json:2181-2187` | eloquence `debuff_brain` | per-point line | remove; Brief line |
| `data/skills.json:2622-2628` | charisma `save_brain` | per-point line | move to rumination; Rally line |
| `data/skills.json:3074-3080` | implication `debuff_heart` | per-point line | remove; Taunt line |
| `data/skills.json:3546-3552` | composure `save_heart` | per-point line | move to lore_master; Steady line |
| `data/conditions.json:404` | Shaken `save_heart −2` | data mirror of `magic.ts:198` | unchanged |
| `docs/rules/PHC-Core-Rules-v1.0.md:1182-1186`, `1312`, `2086`, `2088`, `2527`, `3028-3029` | spec text on families, debuff strength, surrender, talking in a fight | old rule | spec first (working agreement) |

No perk, trait or item sets a `debuff_*` stat. The only `debuff_*` in data are the three skills.json lines, and the only reader is `character.ts:687`. The `debuff_split` and `debuff_duration` ops in `data/effect_ops.json` are unrelated.

### 2. Hand-rolled saves (each must take the new strength)

Every one is `d20 + save` against `12 + strength`.

| File:line | Function | Family | Delivered by | Strength should read |
|---|---|---|---|---|
| `magic.ts:260` | `applyCond` | condition's, or the `fam` argument | the caller | `opts.via` |
| `magic.ts:293` | `flagCond` (Dazed, Prone…) | body | the caller | `opts.via` |
| `magic.ts:347` | `condTurnEnd`, Corroded's end-of-turn save | body | re-reads the source unit through `condBy` | the skill must be stored with the condition (trap 5) |
| `magic.ts:1032` | `schoolOn`, control push/pull | body, reads `m.debuff.body` directly | Outburst | will_power |
| `magic.ts:1212` | `pourOn`, Mercy surrender | heart | Outburst feeling | will_power |
| `magic.ts:1437`, `1438`, `1442`, `1462`, `1483` | Outburst previews (`saves[]` TN) | `m.debuff[fam]` directly | Outburst | will_power; must match the roll |
| `sigil.ts:397`, `398` | Sigil preview TNs | `unitDebuff(caster, fam)` | Sigil | brain_power |
| `sigil.ts:1065` | `teleportSave` (STEP on an enemy) | body | Sigil | brain_power |
| `tactics.ts:159` | `trySurrender` | heart | words (offer of terms) | Charisma or Eloquence (ambiguity A) |
| `faith.ts:871-872` | `rollSaveVs`, called at `978` (brain), `981` pratfall (body), `999` (heart) | per call | Blessing | faith |
| `classes/rev3.ts:50-55` | `famSave`: fighter.shove (`155-156` previews), trickster.false_image (`484`), trickster.silver_tongue (`516`) | per call | melee move; Sigil decoy; words | raw_power; brain_power; a gamma (ambiguity D) |
| `classes/k.ts:869-873` | `bodySave` (Grand Sigilist zones; callers `886`, `901`, `912`, `1063`) | inlines the save and debuff lookups, with enemy fallback 1 instead of the tier table | Sigil zone | brain_power; route through `unitSave`/`unitDebuff` |
| `classes/i.ts:608` | assassin.toxin | body | a coated weapon hit | the weapon's alpha, or Ingenuity (ambiguity D) |
| `classes/i.ts:1125`, `1128` | trickster.rewrite (fight) | brain | Sigil charge | brain_power |
| `classes/i.ts:1151` | trickster.rewrite (story), `debuffStrength(c,'brain')` | brain | Sigil | brain_power; ruling text at `1153` says "their Charisma modifier" → Rumination |
| `classes/i.ts:1539`, `1542` | hexer.puppet (fight) | heart | Soul cast | will_power |
| `classes/i.ts:1553` | hexer.puppet (story), `debuffStrength(c,'heart')` | heart | Soul | will_power; text at `1555` says "their Composure modifier" → Lore Master |
| `perks/f.ts:83-84`, `90` | bone_talk (Intimidation perk) | heart | words | intimidation (today it reads the heart debuff, which is Implication) |
| `perks/f.ts:119`, `126` | the_name_they_whisper: `tnAdd = mod(intimidation) − unitDebuff(u,'heart')` | heart | reputation, words | intimidation; drop the subtraction trick |
| `perks/f.ts:147`, `173` | the_name_they_whisper, surrender save | heart | words | intimidation |
| `perks/f.ts:574`, `579` | trench_poet Verse (fight) | heart | words | implication |
| `perks/f.ts:589` | trench_poet (story): `TIER_SAVE` vs `12 + max(0, mod(implication))` | heart | words | already source-based |
| `perks/e.ts:133` | grim_reaper (Intimidation perk): Fear on witnesses of a kill | heart | a kill | intimidation (the perk's skill) or the blow's alpha (ambiguity D) |
| `perks/e.ts:484`, `488`, `493` | the_voice: `tnAdd = mod(authority) − unitDebuff(u,'heart')` | heart | words | authority; drop the subtraction trick |
| `perks/e.ts:653` | lay_down_arms (Empathy perk; story): `12 + mod(implication)`, no floor | heart | words | decide: Empathy is an alpha that speaks here |
| `perks/e.ts:668`, `673` | lay_down_arms (fight) | heart | words | same |
| `perks/g.ts:446` | their_own_idea (story): `debuffStrength(h.c,'heart')` | heart | words | implication |
| `perks/d.ts:1013`, `1049`, `1058` | Mirage: `12 + visMod` | Analysis or tier | illusion | already source-based (Visualization) |
| `perks/a.ts:203` | Grapple preview: `12 + (h.u?.dbf?.body \|\| 0)` | body | bare hands | raw_power; the perk becomes Iron Grip (15.2) |
| `hazards.ts:68-70` | `hazardHit`: `unitSave(u, fam)` vs `hazardTn` (12 / 16) | per hazard | the world | no strength; only the save side moves |
| `physical/core.ts:334-342` | technique `save()`: flat `PHYS_RULES.stop_tn` (12) + `tnAdd`; no attacker strength | skills list or family | weapon technique | section 3 |
| `ai-sigil.ts:232` | `failChance` (AI estimate) | `unitSave` | n/a | follows `unitSave` |

### 3. `physical/core.ts` (Physical 2.0)

- `core.ts:334` `save(t, target, skillsOrFam, tnAdd)`: the TN is flat. `data/techniques.json:227` (Feint) says "a Brain save against your Brain debuff strength", and the spec has the same at line 1006. The helper cannot do that today. Skeleton 2.0 needs the TN to be `stop_tn + strength(t.u, skill of the technique's weapon) + tnAdd`.
- `core.ts:338` `FAM = { guts:'body', charisma:'brain', composure:'heart', … }` maps a skill name to a family. Change to `rumination: 'brain'` and `lore_master: 'heart'`. A technique that lists `['charisma']` would silently stop being a Brain save.
- `core.ts:339`: for a PC target, a listed skill that is not a family skill reads `mod(c.skills[s])` raw (no `u.sk`, no conditions); for a foe, `target.attack`.
- `data/techniques.json:56-60`: `stop_save: ['guts','athletics']`, `stop_tn: 12`. Both betas, so unchanged.
- `core.ts:345-349` `cond(t, target, id, rounds, opts)` calls `applyCond(t.cb, t.rng, t.u, …)` with no family and no source. Add the source here once (`via: skill of t`), and every technique gets it.
- `core.ts:364` `stop()` → `applyCond(…, 'pinned', …, 'body', { skipSave: true })`: no TN, but pass the source for bookkeeping.
- Callers on this branch: `melee/strikes.ts:12` (critical: Bleeding or Dazed, no save), `melee/openers.ts:18` (push, `save: false`), `ranged/watches.ts:48` (halt, `save: false`).
- Technique texts that name saves, which the lanes will add: `data/techniques.json` lines 196, 227-239, 429-441, 552-558, 594-600, 696, 756, 824-831, 862, 983, 1170-1183, 1371, 1634-1640, 2097-2098, 2139-2140, 2179-2180, 2235.

### 4. Every `applyCond` caller, by what delivers it

Sites marked "no save" pass `skipSave` or apply a boon. They need no strength now, but should still pass the source, because `condBy` and the `cond_apply` hook are read later.

**Weapon hit or shot** (melee → raw_power; shot → dexterity)
- `combat.ts:979` Burning from incendiary ammo or a weapon property (no save).
- `classes/j.ts:212` `suppressShot`: Pinned on a hit, default body save. Shot.
- `classes/j.ts:270` Mark (no save).
- `classes/i.ts:408` defender.draw_fire: Taunted (no save).
- `classes/i.ts:576` assassin.mark (no save); `i.ts:609` toxin (rolled at 608).
- `classes/rev3.ts:357` infiltrator.sabotage: Stunned 2 (no save).
- `perks/a.ts:190` Grapple: Grappled, default body save. Melee.
- `perks/a.ts:331` earthbreaker: Prone, body save. Melee.
- `perks/c.ts:660` `suppress` (Full Auto, Spray and Pray): Suppressed, body save. Shot.
- `perks/f.ts:910` beast_handler: the beast's Grappled, body save; `by` is the companion.
- `physical/core.ts:347`, `364` (section 3).

**Thrown items** (ambiguity D: Dexterity, or none)
- `tactics.ts:219` flashbang: Blinded 1, body save; `by` may be null.
- `tactics.ts:222` bot_scrambler: Stunned (no save).
- `tactics.ts:230` and `perks/c.ts:831` (demolitionist): Burning (no save).

**Traps** (ingenuity)
- `classes/rev3.ts:397` sabotage's rigged tile: Pinned, body save.
- `perks/c.ts:202` sleight_of_hand tracker: Marked (no save).
- `perks/c.ts:938`, `966`, `970` slicer: Puppeted or Stunned (no save).

**Sigils** (brain_power)
- `sigil.ts:989` critical FIRE → Burning; `990` element words' riders (`fam` from `d.applies.save`, `tnAdd` from inflections).
- `sigil.ts:1007` COMMAND (brain); `1011` Afflictions; `1020`, `1021` Quickened and Sharpened (boons).
- `classes/j.ts:874` a word's rider on a bullet; `j.ts:1048-1049` storm_hand.gauntlet_infusion (Burning, Slowed). These ride a weapon hit or a Soul class's gauntlet.
- `classes/k.ts:886-916` Grand Sigilist zones: `887` Stunned (default save), `888` Guarded, `895` Shaken (heart), `896`/`916` Silenced, `901` Pinned, `913` Pinned (body).
- `classes/k.ts:1063` ice → Prone; `k.ts:1205-1207` grand_sigilist.earthed (Burning, Slowed, Corroded on a weapon hit standing in a zone: Sigil or weapon?).
- `classes/i.ts:1135`, `1140` rewrite's flips (no save).

**Outbursts** (will_power)
- `magic.ts:1023`, `1024` buff school (boons); `1039` control (Pinned or Slowed, default save); `1044` status (family from the `left` / `right` module, else the condition's).
- `magic.ts:1056`, `1059` `applyToneRiders`; `1170` chained tone riders.
- `magic.ts:1199` Grief, `1200` Fear, `1202`/`1204` Bleeding, `1209` Scorned, `1216` Anchor, `1227` Hopeful.
- `magic.ts:1279-1280` `residueTick`: `by` is the residue's owner.
- `magic.ts:732`, `736` Mana Short backlash on the caster itself (`by` null).
- `classes/soul.ts:55`, `61`, `65` `schoolRider` (Twin Souls).
- `classes/k.ts:143`, `157` shade.nightmare_mark (Fear, heart), `181` shade.lingering_dread (Shaken, heart), `1407` heartbinder.through (no save).
- `classes/i.ts:1544` Puppeted (no save; rolled at 1542).

**Blessings** (faith)
- `tactics.ts:258` `blessing()`: the generic `condition` op.
- `faith.ts:963` Stunned (no save); `969` covering_fire (Pinned, body); `981` pratfall (Prone and Disarmed after `rollSaveVs`); `990` Confused (no save); `1027` thunderclap (Shaken, heart); `1032` (no save); `1037` sweet_nothings (Smitten, heart); `1038` together (boons); `1043` Commanded hold (heart); `1050` cut_short (Stunned, heart).
- `faith.ts:726` the Laughing Mask's intervention (Prone, no save); `829` Witnessed (self boon).
- `faith.ts:677` a grudge's condition, `by` null, no save.
- `perks/d.ts:543` fire_sermon (Faith + Eloquence): Shaken, default heart. Prayer or words?
- `perks/d.ts:659` upper_touched (self, no save).

**Songs** (empathy)
- No song applies a condition by `applyCond` today. `perks/d.ts:889-900` `songSync` only keeps `u.sv` and `u.sk` in step. "Strength of your songs' conditions" has no caller yet.
- `perks/d.ts:975` shared_breath (Empathy): re-applies someone else's condition, no save.

**Words**
- `tactics.ts:180`, `181`, `159`: section 6.
- `perks/g.ts:210` crowd_pleaser `crowdHit`: repeats Persuade or Threaten on the rest of the crowd; must stay identical to `tactics.ts:180-181`.
- `perks/f.ts:90`, `108`, `126`, `579`; `perks/e.ts:493`, `673` (section 2).

**World, state and self** (no source, no strength)
- `hazards.ts:78`; `world.ts:563` (`applyCondition` on the area map); `combat.ts:1124` (Commanded "drop" → Disarmed).
- `effects/core.ts:216`: the generic `condition` effect op, with `by = h.u` and no family. The data item behind it decides the source.
- `classes/j.ts:182` Emplaced; `classes/rev3.ts:210` unstoppable; `perks/b.ts:782`, `875`; `perks/a.ts:716`; `perks/f.ts:58`, `465`, `659`, `827`.

### 5. Proposed signature

Smallest change that carries the source:

```ts
// character.ts (replaces debuffStrength(c, fam))
export const debuffStrength = (c: Character, via: string) => Math.max(0, mod(P(c, via)));   // floor: ambiguity B

// magic.ts
export interface CondOpts { skipSave?: boolean; tnAdd?: number; arg?: string; /** the skill that delivered it */ via?: string }
export function unitDebuff(u: Unit | null, via?: string): number   // PC: strength of `via`; foe: TIER_DEBUFF[tier]; null: 0
export function withVia<T>(by: Unit, via: string, fn: () => T): T   // ambient source for one subsystem call
// applyCond keeps its positional signature; tn = 12 + unitDebuff(by, opts.via ?? ambientVia(by)) + tnAdd
```

1. `applyCond`'s `fam` stays the target's save family; `via` is the attacker's skill. Put `via` in the `cond_apply` ctx, and store it in `t.condVia[id]` beside `condBy`. The Corroded re-save at `magic.ts:347` needs it.
2. The ambient wrapper has precedent: `withElement` (`sigil.ts:990`) and `NOSAVE_BY` (`magic.ts:256`). Set it at four entries: Evoke (brain_power), Outburst release (will_power), `combatPray` (faith), and the technique runner in `physical/core.ts` (the weapon's skill). That covers about 60 of the sites in section 4 without editing them. Key it to the unit, as `NOSAVE_BY` is, so a reaction by another unit inside the call does not inherit it.
3. `Unit.dbf` becomes `Record<skillId, number>`, filled in `pcExtras`, so stored and snapshot units still work (`perks/h.ts:38`, `classes/i.ts:1028`). `MagicUnit.debuff` can go: the five preview lines and `magic.ts:1032` call `unitDebuff(u, 'will_power')`.
4. The hand-rolled savers (`famSave`, `rollSaveVs`, `bodySave`, `teleportSave`, `trySurrender`, technique `save()`) each take one more argument, `via`, or read the ambient.
5. A save-bearing call with no `via` and no ambient should be loud in tests, for example a `completeness` test that counts them. A missing source would otherwise roll against 12 + 0 with no error.

### 6. Talking in a fight (`combat/parley`)

Action type at `game.ts:316`, reducer at `game.ts:1397`, function `tactics.ts:171-186`, hook `'parley'` (`effects/types.ts:63`). 2 AP via `actionAp({u}, 'parley', 2)`, hearing 8 (`HEARING`, `tactics.ts:167`).

| Kind | Today | Reads | Skeleton 2.0 |
|---|---|---|---|
| `persuade` | `applyCond(…, 'ldebuff', undefined, 'brain', { tnAdd })` (`tactics.ts:180`) | target Brain save (Charisma) vs 12 + speaker's brain debuff (Eloquence) | stays; target saves with Rumination; strength = Eloquence |
| `threaten` | `applyCond(…, 'shaken', undefined, 'body', { tnAdd })` (`tactics.ts:181`): Shaken is a Heart condition, forced to a Body save | target Body save (Guts) vs 12 + body debuff (Intimidation) | becomes the Threaten Call; the save family is contradictory in the proposal (ambiguity C) |
| `parley` | `trySurrender` (`tactics.ts:155-162`): only at half HP or alone, once per enemy | target Heart save (Composure) vs 12 + heart debuff (Implication) | stays; Heart save with Lore Master; strength from Eloquence or Charisma (ambiguity A) |

- The web client never dispatches `combat/parley` (no match in `apps/web/src` outside `protodata.json` and `narrator/context.ts:564`). It is reachable only through tests and the reducer.
- Hooks on `'parley'`: `perks/g.ts:195-207` crowd_pleaser, and whatever sets `ctx.tnAdd` or `ctx.cancel`.
- `perks/e.ts:150-152` (overruled) relies on Persuade landing `ldebuff` with `condBy` = the speaker.

### 7. Traps

1. **`sv` is baked at unit build; `unitSave` adds live parts.** `perks/d.ts:895` `SAVE_SKILL = { guts, charisma, composure }` mutates `u.sv` as a song changes. It must become `{ guts, rumination, lore_master }`, or songs that boost Rumination or Lore Master won't reach saves and ones that boost Charisma or Composure still will.
2. **`unitSave`'s `condSkillMod` (`magic.ts:198`) changes meaning with the skill.** Today a Left Brain Debuff (−2 on Mind skills) hits the Brain save through Charisma, and a Right Brain Debuff (−2 on Expression and Soul skills) hits both the Brain save (Charisma is Expression) and the Heart save (Composure is Soul). With Rumination (Intelligence) and Lore Master (Determination), the Right Brain Debuff stops touching Brain saves. The proposal does not mention this.
3. **Item skill mods reach saves through the save skill** (`character.ts:686`, `skillRollMod(…, {roll:'save'})`; spec line 2102). After the move:
   - Stop reaching a save: the_mask (Composure +2 / −3), daggerfall_veteran (Composure +2 vs military), trench_poet (Composure +1), lunarshine (Composure −1), ghost_soldier (Charisma −1, Composure −1), blade_recluse, the_old_blood, raised_by_orks, interrogator, moon_hunter (Charisma).
   - Start reaching one: bottle_butts_for_eyes and oil_in_my_mind (Rumination), the_old_blood (Rumination +2, Lore Master −2), lunarshine (Lore Master +1).
   - Guts mods are unchanged (`perks/h.ts:424`, rabbits_foot, central_city_kid).
   - Each trait's text needs a ruling, not a silent shift.
4. **Hooks that key on family must not change:** `effects/core.ts:100-101` (`save_mod` op), `perks/f.ts:367` (red_line `save_heart`), `perks/g.ts:661` (obsessed −1 on all saves), `perks/f.ts:487`, `548`, `599`, `685`, `classes/i.ts:1416`, `perks/a.ts:685`, `perks/h.ts:294` (`saveAdd`), the immunity at `effects/core.ts:110`, `classes/i.ts:1089` and `1520` (`tnAdd`). Families stay; only the skill behind each moves.
5. **`condBy` stores a unit id only.** `magic.ts:347` recomputes Corroded's TN from the source unit each turn. Without a stored `via` it will use the wrong skill, or 0 after the caster dies (today `src ? … : 0`).
6. **`perks/f.ts:47` `heartSave(ck)`** treats a story check made with Composure as a Heart save ("the Heart-save skill"). `perks/h.ts:91`, `110`, `197` and `game.ts:1001` key on `kind:'save', family:'heart'`. The f.ts shortcut must name `lore_master`, or be dropped.
7. **Story saves have no engine mapping.** `game.ts:71-73`, `190`, `1201`: the Narrator names the skills and the family is only a tag. The narrator tool schema (`apps/web/src/narrator/context.ts:563`) and the prompt need the new save skills, or the AI will keep calling Composure for a Heart save.
8. **`classes/k.ts:869-873` `bodySave`** bypasses `unitSave`: no Shaken −2, no residue, no hooks, enemy debuff fallback 1. Do not copy its numbers; route it through the shared functions.
9. **`physical/core.ts:338` `FAM`** and **`classes/i.ts:1153`, `1555`** hard-code "Charisma" and "Composure" as save skills in code and in ruling text.
10. **Enemy numbers are tier tables in three places:** `magic.ts:192-193`, `perks/g.ts:446` and `perks/d.ts:1058` (imported `TIER_SAVE`), and `perks/e.ts:653` (`NPC_SAVE`, default soldier). No enemy in `data/enemies.json` has its own saves.
11. **`the_voice` and `the_name_they_whisper`** (`perks/e.ts:488`, `perks/f.ts:119`) reach "12 + my skill" by passing `tnAdd = mod(skill) − unitDebuff(u,'heart')`. If `unitDebuff` changes signature these still compile with a wrong argument and produce a wrong TN. Rewrite them to pass `via`.
12. **`Unit.sk` is not strength.** `u.sk` (item d20 mods by skill, `combat.ts:377`) is not added to debuff strength today, since strength is not a roll of the attacker's. Don't add it by accident when re-keying `dbf`.
13. **Hazards (`hazards.ts:38`, `68`)** use their own TN of 12 or 16. Not debuff strength; leave them.

### 8. Tests that pin today's behaviour

In `packages/engine/test/` unless noted.

- `subsystems.test.ts:53` "Shaken is −2 on Heart saves… every PC has saves": `pc.sv.body` = 3 from Guts 4 (stays true).
- `subsystems.test.ts:139` "a beaten enemy may surrender to terms (once)…" and `:325` "…a parley from the reducer costs 2 AP".
- `effects.test.ts:32`: `saveBonus(a,'body')` with Rabbit's Foot (stays).
- `completeness-c2.test.ts:270` "Crashed: −2 on initiative and on all three saves" (relative; stays).
- `perks-f.test.ts:196` "I in a fight: +1 on the unit's Heart save": asserts `u.sv.heart === mod(composure) + 1`. **Breaks**; must read lore_master.
- `perks-h.test.ts:118` and `:127` "the mask reaches the Heart save in a fight" (`bare + 5` from Composure mods). **Breaks** unless the_mask is ruled (trap 3).
- `perks-h.test.ts:277` "outside the city: −2 Guts… Body saves" (stays).
- `perks-d.test.ts:364-372` song tests ("Underground Sound: Brain saves… +1"; Heart +1): depend on `SAVE_SKILL` and on which skills each song boosts. Check against trap 1.
- `classes-i.test.ts:316` "Bind… Pin saves against 14 + debuff strength": reads `f.pc.dbf?.body`. **Breaks** on the `dbf` re-key.
- `classes-i.test.ts:~482-487` (hexer status): compares the logged TN to `12 + f.pc.dbf?.heart + 2`. **Breaks**.
- `faith.test.ts:522` "Heretic's Stolen Fire… (Thunderclap)": expects `vs 14` in the log. Recompute for Faith as the source.
- `outburst20.test.ts:35`, `outburst20-review.test.ts:26`, `outburst40.test.ts:27`, `outburst20-gaps.test.ts:30`: set `p.dbf = { body: 0, brain: 0, heart: 0 }` to zero the TN. The re-key makes these silently stop zeroing.
- `perks-e.test.ts:99` "the fight's Persuade (a non-caster) feeds it"; `:316` the_voice; `:408`, `:425` lay_down_arms (`/Heart save d20 \d+/`).
- `perks-g.test.ts:130` "combat: a threat heard by 3+ enemies is one roll for all of them" (`kind: 'threaten'`, expects Shaken); `:254` their_own_idea (`HEART SAVE D20 20`).
- `perks-f.test.ts:40` bone_talk; `:270` Verse (`/Heart save d20/`).
- `classes-rev3-moves.test.ts:108` Shove, `:217` Sabotage, `:301` Silver Tongue; `classes-k.test.ts:225`, `:445`; `sigil14.test.ts:323` (Corroded end-of-turn save), `:339`, `:404`; `sigil14-batch2.test.ts:66` "…log the d20 + save vs TN when the save fails".
- About 40 test files, plus `apps/web/src/game/sigilView.test.ts:19`, `fx/elements.test.ts:231` and `classMoves.test.ts:107`, `227`, `233`, set `u.sv = { body, brain, heart }` directly. Keep `sv`'s shape and they all survive.

### 9. Ambiguous or hard in the proposal

- **A. Offer of terms.** 13.2 says Persuade and the offer of terms are "read from Eloquence and Charisma" without saying which reads which. Persuade is Eloquence today; the surrender save reads Implication (heart debuff). Presumably terms = Charisma. Needs Leon's word, and a spec line.
- **B. Floor at 0.** Today strength is `max(0, mod)`. 13.1.4 says "the modifier of the skill", and 10.1.5 "12 + the skill's modifier". An alpha at 0 points is −2, and `mg.brain` / `mg.will` carry −2. If the floor goes, a fighter with no Raw Power makes melee conditions easier to save than a minion's. Not stated either way.
- **C. Threaten's save.** 10.2 says Threaten is a Body save and Taunt a Heart save. 13.4 says "Threaten saved with the save its condition belongs to", and Shaken is a Heart condition (`magic.ts:93`), so Heart. The two disagree. Either way `tactics.ts:181`, `perks/g.ts:210` and `perks-g.test.ts:130` move together.
- **D. Sources the rule does not name:**
  - thrown items (flashbang, `tactics.ts:219`);
  - a light blade's conditions (it hits with Dexterity after Physical 2.0, but 13.2 gives "melee conditions" to Raw Power and "shots' conditions" to Dexterity);
  - assassin.toxin;
  - grand_sigilist.earthed and storm_hand.gauntlet_infusion (a Sigil word riding a weapon hit);
  - grim_reaper (a kill causing Fear);
  - fire_sermon (Faith + Eloquence);
  - lay_down_arms (an Empathy perk that speaks);
  - trickster.silver_tongue (words from a Mind class: which gamma?);
  - beast_handler (the companion is the `by` unit and has no skills);
  - residue and zones that fire after the caster is dead.
- **E. Calls vs `combat/parley`.** Threaten becomes a Call (5 to 14 tiles of voice, 2/1/0 AP by the ladder, one hindering Call per unit a round), while Persuade and terms "are not Calls" and stay at 2 AP and 8 tiles. `parley()` then has one kind that follows different range, cost and limit rules. Either drop `'threaten'` from the action union (breaks `perks-g.test.ts:130` and crowd_pleaser's `ctx.kind` check at `perks/g.ts:196`) or alias it to the Call.
- **F. "Strength of your songs' conditions" (Empathy) and "strength of your traps" (Ingenuity)** have almost nothing to attach to: no song applies a saved condition, and the only saved trap is `classes/rev3.ts:397`.
- **G. Feint** (`data/techniques.json:227`, spec line 1006) says "Brain save against your Brain debuff strength". That term stops existing, and the technique helper never used it. Spec and data text need the new wording, and the helper needs the TN.
- **H. Most shelved advanced-class moves** (`classes/i.ts`, `j.ts`, `k.ts`: assassin, hexer, shade, grand_sigilist, heartbinder, storm_hand, hellraiser_heavy) are not learnable but still compile and are tested. They must be converted or they break the build. Their source skill is a guess until the classes return.


---

## Code map: skill checks and the Narrator (Skeleton 2.0, rule 13.1.2)

Scope: where a story check's modifier is computed, where "a gamma skill adds its full points (0 points stays −2)" applies and where it must not, how a slot is read, and the Narrator prompt, wiki and budget tests. Line numbers are from branch `claude/charming-gauss-hbq4n0` at `b016cf1`. Paths are relative to `/home/user/Project-Heaven-Cry`.

Verified by experiment, in a scratch copy only (the repo is untouched): I added a `checkMod(skill, points)` helper and used it at the five engine sites marked **APPLY** in section 2. The engine suite went from 1893 passed to 1892 passed, 1 failed. The one failure is listed in section 6.

---

### 1. The modifier today, and how a slot is read

| Where | What it is today | Skeleton 2.0 |
|---|---|---|
| `packages/engine/src/character.ts:153` `mod(p)` | The only modifier function: `p <= 0 ? -2 : p - 1`. It takes points only and has no idea which skill it is for | Leave `mod()` as it is (about 50 non-check callers depend on it). Add a second export beside it that takes the skill id, e.g. `checkMod(skill, p)`: −2 at 0, `p` when the skill's slot is gamma, else `p − 1`. `SKILL` is already imported at `character.ts:4` |
| `packages/engine/src/data.ts:18` `SkillDef` | `slot: string` (not a union type) | Optional: narrow to `'alpha' \| 'beta' \| 'gamma'` |
| `data/skills.json` items | Every skill has `slot` and also carries the slot word in `tags` (`['gamma', 'core:body', …]`) | Slots are already right for all 27; nothing to add for the check rule |
| `data/skills.json:5` `modifier_by_points`; `data/rules.json` `resolution.skill_track` (`mod_formula`, `table`); `resolution.voices.passive_score` ("10 + mod(skill)"); `resolution.roll` | The one modifier table and formula. Nothing in code or `tools/validate.py` reads `modifier_by_points` | Data lane: state the gamma check rule here (spec first: `docs/rules/PHC-Core-Rules-v1.0.md:43` modifier, `:56` passive, `:132` derived stats' `mod(skill)`, `:2102` item modifiers on every d20) |

Ways the engine reads a slot today (there is no `isGamma()` helper):

1. `SKILL[id].slot === 'gamma'` directly: `packages/engine/src/perks/g.ts:735` (`GAMMA` list for Born Performer), `packages/engine/src/effects/actions.ts:150` (action picker `pick: 'gamma'`).
2. `skillHasTag(skill, tag)` at `packages/engine/src/effects/core.ts:80-84`: true when `s.slot === tag` or the tag is in `s.tags`. This is what `skill_mod_tag` effects use, so data can already say "+1 to gamma skills".
3. Client: `apps/web/src/screens/shared.js:65` `EP_SLOT` and `:97` (the "γ skill of …" line); `D.skills[].slot` is in the screen data.

---

### 2. Story checks: every place the modifier is computed

| # | File:line | Function | Today | Skeleton 2.0 |
|---|---|---|---|---|
| 1 | `packages/engine/src/game.ts:948-969` (modifier at `:952`) | `rollCheck` | Per skill `mod(points) + songMod`, plus item skill mods; takes the lowest, +2 for each other trained skill, plus whole-check mods. Writes `ck.roll.mod`, `ck.mods` and the `[Check]` head line | **APPLY** at `:952`. **But not when `ck.kind === 'save'`** (see trap T1) |
| 2 | `packages/engine/src/game.ts:606`, `:609` | `check/roll`, `check/reroll` | Call `rollCheck` | Follow from #1 |
| 3 | `packages/engine/src/game.ts:631` | `voice/ask` | `mod(points) + songMod + skillRollMod(roll: 'ask')`, d20 against the hook's TN | **APPLY** |
| 4 | `packages/engine/src/character.ts:717` | `passive(c, skill, ctx)` | `10 + mod(points) + skillRollMod(roll: 'passive')` | **APPLY**. Its only engine callers are the voice hooks at `game.ts:1184` (margin) and `:1191` (the "PASSIVE n vs tn" head) |
| 5 | `packages/engine/src/game.ts:1008-1011` | `sideRollMod` | One-skill side d20 outside `rollCheck`. Callers: `perks/g.ts:718` (Visualization), `perks/h.ts:366` (Will Power), and prayer through `bindFaith` at `game.ts:401` → `faith.ts:195` (Faith). All three are alphas today | **APPLY** for consistency (no number changes today). Its comment already calls it "a side d20 with one skill" |
| 6 | `packages/engine/src/world.ts:436` | `skillMod` (file-local) | `mod(points) + songMod + skillRollMod(roll: 'check')`; feeds `bestSkill` (`:433`) and `previewOdds` (`:439-445`) | **APPLY**. `bestSkill` then picks a gamma more often for `pick: 'best'` approaches, which is intended |
| 7 | `packages/engine/src/world.ts:461-478` | `tryApproach` (`poi/try` and `talk/try`, dispatched at `game.ts:819-823`) | Builds a `Check` (a person adds `tags: ['dialogue']` and `target`), which is rolled by `rollCheck`; in the Proving Ground it rolls at once (`:477`) | Follows from #1 and #6. No change here |
| 8 | `packages/engine/src/world.ts:618`, `:634` | `talkOptions`, approach options | `previewOdds` gives `mod` and `odds` on each `TalkOption` (interface at `:607`); the client prints "YOU ROLL d20 +n" from it (`apps/web/src/game/worldView.ts:247`) | Follows from #6 |
| 9 | `packages/engine/src/game.ts:1196-1205` | `narratorTurn`, the checks the Narrator asks for | Validates skills (1 to 3) and TN, copies `kind: 'save'` and `family` | No modifier here. See T1 |
| 10 | `packages/engine/src/perks/b.ts:866` | Ghost Soldier's settlement rest roll | `mod(vigilant) + skillRollMod(roll: 'check')` vs 12, printed as "VIGILANT · d20 …" | A plain Vigilant check out of combat: **APPLY** (perk lane to confirm) |

**Analyze out of combat** has no roll: `game.ts:2289` (`world/act` analyze) and `game.ts:1407` both call `analyze()` at `combat.ts:1675`, which is AP and range only (`4 + Analysis`). Nothing to change for the check rule.

**Story stealth** (`game.ts:2181`, `:2194-2198`) reads Dexterity and Ingenuity, both alphas. Not affected.

#### Client copies of the same sum (the dice card)

The engine sends the `Check` object as state; the client recomputes the pre-roll number itself with its own `mod`. These will show the old number unless changed.

| File:line | What | Skeleton 2.0 |
|---|---|---|
| `apps/web/src/screens/shared.js:15` | `export const mod = (p) => (p <= 0 ? -2 : p - 1)`: the client's own copy | Add a skill-aware twin, or import the engine's |
| `apps/web/src/screens/main.js:608-609` `comboOf` | Lowest modifier + 2 per trained partner; used by the check bar tag (`:611-612`) and the dice card's `pre` line (`:635-637`: "d20 +n (Skill p) vs TN", "Lowest +n (Skill) + …") | Use the check modifier. After the roll the card uses `r.mod` from the engine (`:638`), which is already right |
| `apps/web/src/screens/main.js:992` | Object approach preview "YOU ROLL d20 +n" (best or combo), computed locally | Use the check modifier, or better, use the engine's `previewOdds` as the talk rows do |
| `apps/web/src/screens/main.js:357` | Sheet skill row `mod: fmt(m)` | Show the check modifier for a gamma |
| `apps/web/src/screens/create.js:311`, `:322`, `:441`; `apps/web/src/screens/levelup.js:118` | Skill modifier shown at creation and level-up | Same |
| `apps/web/src/screens/main.js:368-369`; `apps/web/src/screens/create.js:436-438` | Derived lines computed in the client: "Brain save" from Charisma, "Heart save" from Composure, Initiative from `mod(reaction_speed)` | Saves lane: Rumination and Lore Master. Initiative keeps `mod()` (not a check) |

---

### 3. Where the gamma rule must NOT be applied

All of these call `mod()` (or inline the same formula) for something that is not a skill check. Keep them on `mod()`.

| File:line | What | Why not |
|---|---|---|
| `character.ts:574` `initiativeBonus` | `(Agility − 1) + mod(reaction_speed)` | Initiative stays on Reaction Speed (15.1) but it is a derived stat, not a check. Changing it gives every Reaction Speed build +1 Initiative |
| `character.ts:686` `saveBonus` | `mod(guts \| charisma \| composure)` | Saves. Moves to Rumination and Lore Master (betas), so the gamma rule never reaches it once moved. Do the move and the check rule in an order that never leaves a gamma here with `checkMod` |
| `character.ts:687` `debuffStrength` | `mod(intimidation \| eloquence \| implication)`, floor 0 | Debuff strength; replaced by "the skill that delivered it" (13.1.4). See T3 for the open point |
| `character.ts:579` `defense`, `:731` `counterBonus` | `mod(athletics)`, `mod(raw_power)` | Derived stats |
| `combat.ts:359` unit `attack`; `physical/core.ts:228`, `:246`, `:489`; `physical/data.ts:137` `charSkillMod` | Attack modifier from the weapon skill | Attack rolls |
| `combat.ts:387` `sv` / `dbf`; `magic.ts:197-199` `unitSave`; `magic.ts:206` `unitDebuff` | Unit saves and debuff strengths, fixed when the unit is built | Saves and debuffs. `unitSave` hard-codes `condSkillMod(u, 'charisma')` for Brain and `'composure'` for Heart at `magic.ts:198`: saves lane |
| `physical/core.ts:338-339` `save()` | Technique saves; `FAM` maps `guts/charisma/composure` to a family, else falls to `mod(skill)` | A save. The `FAM` map names the old save skills: saves lane |
| `tactics.ts:284`, `combat.ts:1368` | Shove and break-free contests (Athletics, Strength) | Contests on a beta and a raw attribute |
| `game.ts:2181` | NPC notice range `− mod(dexterity)` | Derived range |
| `classes/i.ts:351`, `classes/j.ts:1125` (Guard on Brace `1 + mod(durability)`), `classes/i.ts:989` (`storedCap` from Rumination), `classes/i.ts:1027`, `magic.ts:164` (`brain`, `will`), `classes/k.ts:208`, `faith.ts:194-195`, `faith.ts:1202`, `perks/d.ts:802`, `:875`, `:996` | Class and magic numbers on alphas and betas | Not gammas; listed so nobody swaps them in a blanket replace |
| `combat.ts:390` `ingMod`, `perks/b.ts:251`, `:687`, `tactics.ts:132` (the TN side) | Stealth from Ingenuity (alpha) | Not a gamma |

---

### 4. Gamma rolls that are neither clearly a check nor clearly not: a ruling is needed

The proposal says "a skill check" and names the Narrator's checks and talking. These engine rolls use a gamma skill's modifier and are not covered by a sentence in sections 13 or 15. Each changes a number in play if the rule is applied.

| # | File:line | What | Today | If the gamma rule applied |
|---|---|---|---|---|
| A1 | `combat.ts:498-507` `spotTraps` (called in fights at `combat.ts:1281` and in the story at `game.ts:1729`); `hazards.ts:101` `spotHazards`; `sigil.ts:1260` `sigilSpot` | Passive Vigilant, `10 + modifier`, with the formula written inline three times (not through `passive()` or `mod()`) | 10 + (Vigilant − 1) | +1 for every Vigilant character against traps, hidden piles, hazards and Sigil traps. Spec text at `docs/rules/PHC-Core-Rules-v1.0.md:317`, `:2634`, `:2658`, items 655 and 677. The voice-hook passive (site #4) will change; if these do not, the game has two different "passive Vigilant" numbers. My read: apply it and route all three through one function |
| A2 | `tactics.ts:131` `spotHidden` | The roll to spot the Hidden: `d20 + mod(vigilant) + items` vs `10 + stealth` | points − 1 | 15.1 keeps "spotting the Hidden" on Vigilant as an information number. It is an opposed roll in a fight, not a Narrator check. My read: leave on `mod()` unless Leon says otherwise |
| A3 | `perks/f.ts:462` (Flashback, Composure d20 vs 12), `perks/e.ts:916` (Born Officer obeys?, Composure d20 vs 12) | Perk-run resist rolls on a gamma, in a fight | points − 1 | These behave like Heart saves ("Composure TN 12 or lose your turn"). By 13.1.3 they probably belong on Lore Master as saves, not on Composure with full points. Perk lane |
| A4 | `perks/e.ts:484`, `:488` (Authority order: Heart save vs `12 + mod(authority)`), `perks/e.ts:653` and `perks/f.ts:589` (vs `12 + mod(implication)`), `perks/f.ts:119` (`mod(intimidation)` added to a TN) | "12 + the gamma's modifier" as a TN the enemy saves against | points − 1 | This is the same shape as a Call's save (10.1.5: "12 + the skill's modifier") and the debuff rule's "the gamma that spoke, for words" (13.1.4). Whether "modifier" there means points − 1 or full points is not stated. See T3 |

---

### 5. The Narrator

#### 5.1 Prompt text (`apps/web/src/narrator/context.ts`)

`RULES_PROMPT` starts at `:118` and is one cached template string. Nothing in it today says which skills suit which kind of check, and nothing says which skill a save uses.

| Line | Section | Today | Skeleton 2.0 |
|---|---|---|---|
| `:132` | TURNS, the checks bullet | "request a check (checks[]) … Use 1 to 3 skills per check … TN is one of 8/12/16/20" | **The main home for "call gamma skills first when a character talks to a sentient being".** One sentence here, e.g. that each attribute's gamma skill (list the nine ids or names) is the one for talk and world play and counts its full points on a check. Without the nine names the model has no way to know which skills are gamma: `SKILL IDS` at `:351` is a flat list and the wiki entry does not say the slot (5.3) |
| `:136` | VOICES | "passive score (10 + skill modifier)" | Stays true as worded if "modifier" is understood as the check modifier; no number is in the text |
| `:183` | MAP OBJECTS, approaches | "Mix approaches across Body, Mind and Soul skills … or Charisma to talk the guard" | The example already uses a gamma for talk. Optional half-sentence: the talk approach is a gamma |
| `:204` | THE OVERWORLD, Faces and talk | "talk[] (2 to 4 approaches; success also ally or inform, fail also hostile)" | **Second place the gamma-first line belongs**: `talk[]` approaches are always to a person, so their skills should be gammas first. Keep it to a few words; the full sentence is at `:132` |
| `:149-152` | PERKS, TRAITS AND CLASS MOVES; `perk-guidance.ts:5` | Check tags and optional check fields (`target`, `applies`, `footnote`, `double`) | No change for the rule. If Calls reach the Narrator, a wiki key goes in the `:252` list |
| `:252` | THE WIKI | Key kinds: `skill:<id>`, `trait:`, `perk:`, `technique:`, … | Add `call:<id>` (13.5.5: "the Calls in its wiki"). `wikiKinds()` (`glossary.ts:122`) picks up any new key prefix by itself, so the "No such entry. Kinds: …" message follows |
| `:300` | `characterBrief`, the Skills line | `Name (id) points [+mod]` with `mod(n)` imported from the engine | Print the check modifier for a gamma, or the Narrator sets TNs against the wrong number. This is the only `mod()` call in `apps/web/src` outside the screens |
| `:351` | `partyPrompt`, `SKILL IDS:` | Flat list of 27 ids in data order | Cheapest alternative to naming the nine in `:132`: mark or group the gamma ids here. It is in the party block, which is also in the cached stable part |
| `:464` | `turnSchema`, `checks[].tags` description | "Check tags from the rules (dialogue, crowd, military…)" | No change |
| `:563` | `submitTool`, optional check fields | `kind: '"save" for a save'`, `family: 'body, brain, heart'`. The Narrator still chooses the skills of a save itself | See T1: say which skill each family uses, or stop asking for skills on a save |
| `:514-516`, `:530` | `APPROACH` schema, `npcs[].talk` | `skills` is a plain string array | No change |

`apps/web/src/narrator/prompts.ts`, `craft.ts`, `anthropic.ts` and `providers.ts` carry no skill guidance.

#### 5.2 Where the engine helps or hinders "gamma first when talking"

- `game.ts:983-984` `SOCIAL_TAGS` and `SOCIAL_SKILLS` = `charisma, eloquence, implication, intimidation, empathy, authority`. A check counts as social (Shaken −2; +2 against a Shaken NPC) when it has a social tag or one of these skills. The set has Empathy (an alpha) and lacks Composure, Vigilant, Sensory and Reaction Speed. It is not "the gammas". Decide whether it stays as "the six that talk" (my read: yes) or becomes slot-driven.
- `world.ts:474`: a `talk/try` check gets `tags: ['dialogue']` and `target`. A Narrator-called check gets tags only if the Narrator sets them.
- Campaign data already has approaches that pair a gamma with a non-gamma (`data/campaigns/*.json`: `empathy + charisma`, `intimidation + guts`, `eloquence + analysis`, `conscience + authority`, …). They need no edit, but their odds shift (T2).
- `data/world_play.json:251-262`: the engine-written hazard approach "Find a safe path" is `vigilant | sensory`, `pick: 'best'`: two gammas, so every safe-path attempt gets +1.

#### 5.3 The wiki (`packages/engine/src/glossary.ts`)

| Line | Today | Skeleton 2.0 |
|---|---|---|
| `:24-26` | `skill:<id>` entry = "Name (core, attribute)." + `summary` + voice + Overreach. It does **not** include `slot` or `per_point` | Add the slot ("gamma: talk and world play; full points on checks") and, if wanted, the per-point line. This is the Narrator's only lookup for what a skill is for. `summary` texts in `data/skills.json` that still describe a moved number (e.g. Charisma as the Brain save) will be repeated here verbatim: data lane |
| after `:118` (end of `build()`) | No Calls | Add `call:<id>` entries from the new `calls.json`, in the pattern of the `technique:` entries at `:114-116` (name, AP, effect steps, "[engine]") |
| `:30` | `perk:` entries print `p.text` and the perk's skills | Follow the data when perks are reworded (15.2 to 15.7) |
| `condition:` entries | Built from `data/conditions.json`; no skill names in them today (checked: no "Charisma", "Composure" or "Guts" in `conditions.json` or `rules.json`) | Nothing for the save move |

Wiki tests: `packages/engine/test/engine.test.ts:520-530` ("the Narrator's wiki (glossary)") pin kinds and a few entries, none on skills.

#### 5.4 Prompt-size budget tests

| Test | File:line | Cap | Now |
|---|---|---|---|
| "the cost stays put (stable about 24k tokens for this party …)" | `apps/web/src/narrator/faith-context.test.ts:64-73` | `callEstimate(...).stable < 25300` (chars ÷ 3.5) | About 25.2k by the test's own comments (25.04k + 0.15k for Physical 2.0); not measured in this run. Headroom is roughly 100 tokens, about 350 characters. **One or two sentences of gamma rule plus a `call:` key will likely cross it.** Every earlier pack moved this cap on purpose with a dated comment; do the same |
| "keeps the context inside the token budget" | `apps/web/src/narrator/anthropic.test.ts:136-141` | rules + campaign + party + turn `< 40000` (chars ÷ 4) | 17,895 measured (rules 8,873, campaign 7,181, party 497, turn 1,344). Wide margin |
| "reports the stable and per-turn tokens a few rounds in" | `apps/web/src/narrator/craft-cost.test.ts:26-30` | `turn < 9000` | turn 2,587, stable 25,025 measured. Only the turn is capped |
| long campaign | `apps/web/src/narrator/longcampaign.test.ts:60-63` | `stable + turn < 45000`, `warmUsd < 0.12`, `worstUsd < 0.25` | 43,777, $0.102, $0.240 measured. **About 1.2k tokens of headroom on the sum and 4% on worst cost**: a long Calls paragraph in the rules prompt can break this one too |
| CRAFT block | `apps/web/src/narrator/craft.test.ts:23-33` | Order of blocks; `CRAFT < 450 words`; the rules must end with `MAP_TRUTH` | Do not put the gamma line inside `CRAFT` or after `MAP_TRUTH` |

`callEstimate` is at `apps/web/src/narrator/anthropic.ts:16-21`; "stable" = rules + campaign + party + memory + the three tool schemas, so text added to `submitTool` descriptions counts too.

---

### 6. Tests that pin today's behaviour

Engine (run with the five APPLY sites changed; one failure):

- `packages/engine/test/perks-g.test.ts:469-477`, "Born Performer › Adaptable: a γ skill at +2 each scene …": `expect(k.now().roll!.mod).toBe(0 + 2); // 1 point = +0, and +2` with Eloquence 1. Becomes 1 + 2.

Engine, pass today but written against the old formula (will break if the neighbouring rulings go the other way):

- `packages/engine/test/effects.test.ts:31`: `passive(a, 'intimidation')` expected as `10 + (points ? points − 1 : −2) + 2 − 1`. Passes only because that archetype has 0 Intimidation.
- `packages/engine/test/perks-h.test.ts:359-365`: `passive(c, 'reaction_speed')` compared before and after (relative, safe).
- `packages/engine/test/completeness-c2.test.ts:271-278`: `initiativeBonus` and all three `saveBonus` values compared before and after a crash (relative; will exercise the moved save skills).
- `packages/engine/test/effects.test.ts:32`, `subsystems.test.ts:56` (`sv.body` = `mod(Guts 4)`), `review-fixes.test.ts:185` (`mod(5) = +4, −2 for the debuff`): saves and debuffed checks on non-gammas; unaffected by the check rule, listed because they sit next to it.
- If A1 is applied: tests that read "(Vigilant n vs tn)" log lines or place a trap at a TN the character just misses. I did not run this variant.

Web (not run with the change):

- `apps/web/src/screens/main-dice.test.ts:28` and `main-story.test.ts:48` call checks with a skill chosen at runtime; `apps/web/e2e/cutins.mjs:282` calls a Composure check at TN 16 and `apps/web/e2e/feel.mjs:279` one at TN 20. None asserts the modifier text, but the e2e scripts depend on a roll's outcome under a fixed seed, and +1 on a gamma can flip it.
- `apps/web/src/game/worldView.test.ts:40` and `narrator/world-play-context.test.ts:32` only check that talk approaches keep their skills.

---

### 7. Traps

**T1. A story save can be called with a gamma skill and would get full points.** A Narrator check with `kind: 'save'` (`game.ts:1201`) is rolled by `rollCheck` on whatever skills the Narrator listed; the engine never maps `family` to a skill. Nothing in the prompt names the save skills, so a model that knows the old rule will send `skills: ['composure'], kind: 'save', family: 'heart'`. With site #1 changed, that save gets Composure's full points. Two couplings show the old habit is built in: `perks/f.ts:47` `heartSave` treats a save with no family and `composure` in its skills as a Heart save, and `:48` `composureCk`. Needed: in `rollCheck`, when `ck.kind === 'save'`, either use `mod()` for every skill, or replace the skills with the family's skill (Guts, Rumination, Lore Master); and tell the Narrator at `context.ts:563` which it is.

**T2. Combined checks.** The rule is "lowest modifier among the skills, +2 for each other trained skill" (`game.ts:949-957`, `world.ts:441-442`, client `main.js:608`). With full points, a gamma is less often the lowest, so in a gamma + non-gamma pair the bonus usually vanishes (the non-gamma is the floor), while a two-gamma pair gets the full +1. The proposal does not say whether full points apply before the lowest is taken. The straightforward reading (per skill, before the minimum) is what the experiment did. All three copies of the formula must agree.

**T3. "The skill's modifier" in TNs and debuffs.** 10.1.5 (Calls: "saved against 12 + the skill's modifier"), 13.1.4 (debuff strength = "the modifier of … the gamma that spoke, for words") and the four perk TNs in A4 all take a gamma's modifier as a difficulty for someone else's save. If that modifier is the check modifier, a 10-point talker sets TN 22 against enemy saves of +0 to +3; with points − 1 it is TN 21. Today `debuffStrength` floors at 0 (`character.ts:687`) and three of the four perk TNs do not. The task statement says debuff strengths must not get the gamma bonus; the Calls' wording needs the same sentence in the spec so both read one function.

**T4. Three inline copies of the passive formula** (`combat.ts:500`, `:505`; `hazards.ts:101`; `sigil.ts:1260`) do not call `mod()` or `passive()`, so a search for `mod(` misses them, and item skill mods (`skillRollMod`) never reach them today either. See A1.

**T5. `skillRollMod` is not the place for the rule.** `effects/core.ts:92-99` returns item adds for a skill and is called for attacks (`combat.ts:359`), saves (`character.ts:686`) and Initiative (`character.ts:574`) as well as checks. Putting the gamma point there would leak it into all of them. The `roll` context it receives (`'check' | 'ask' | 'passive' | 'save' | 'attack' | 'initiative' | 'stealth' | 'combat'`) is the existing vocabulary for "what kind of d20 is this"; a `checkMod` call belongs only at the `'check'`, `'ask'` and `'passive'` sites.

**T6. `fx(c, 'passive:' + skill, …)` and `statQuery('skill:' + id)`.** Perk lanes add to passives and skills through these stat keys (`character.ts:717`, `effects/core.ts:97`; Born Performer at `perks/g.ts:759`, the song at `perks/d.ts:897-910`). They add on top of the base and need no change; do not fold the gamma point into them or it will double with `checkMod`.

**T7. Per-unit skill adds in a fight (`u.sk`, `combat.ts:376`).** A fight carries item skill mods as `u.sk[skill]` beside raw points (`u.vigilant`, `u.sensory`, `u.analysis` at `combat.ts:363-368`). Any gamma roll in a fight that should follow the check rule must add the extra point at the roll site; the unit holds points, not modifiers.

**T8. Born Performer picks a gamma by slot** (`perks/g.ts:735`, `effects/actions.ts:150`, `data/traits.json:1276` `"pool": "gamma"`). Slots do not move in Skeleton 2.0, so this keeps working; its +2 now stacks on full points.

**T9. Songs.** `songMod` (`music.ts:174`) is added at every check site next to `mod()`. Keep it outside `checkMod` so it is not conditioned on slot.

**T10. The client and the Narrator brief each have their own modifier.** `apps/web/src/screens/shared.js:15` duplicates `mod`; `apps/web/src/narrator/context.ts:300` imports the engine's. If only the engine changes, the dice card's "before the roll" line, the approach previews for objects, the sheet and the Narrator's `[+n]` will all be one lower than what the engine rolls for a gamma, which breaks the "dice are transparent" rule.

**T11. Echo reroll and rulings.** `rollCheck` is re-entered for a reroll (`game.ts:609`) and recomputes the modifier each time; nothing caches the old value. Saved games hold finished `ck.roll.mod` values only in open checks, and a new save is made every update, so no migration is needed for the check rule.

**T12. `sideRollMod` filters story Brain debuffs by label text** (`game.ts:1009`, `/Brain Debuff/`), and `storyCondMods` (`:1002-1003`) applies Left/Right Brain Debuff by core and attribute, not by slot. Unrelated to the gamma rule; do not "tidy" it into slot logic.

**T13. Overreach and voice eligibility read raw points** (`game.ts:1183` needs 1+ point for a voice, `:1208` needs 5 for Overreach, `voice/ask` at `:624`). These are thresholds on points, not modifiers. Leave them.


---

## Skeleton 2.0 code map: perks and Mastery unlocks that change

All line numbers are at commit `b016cf1` on `claude/charming-gauss-hbq4n0`. Paths are under ``. Proposal: `docs/design/proposals/2026-11-nine-doors.md` sections 15.2 to 15.8 (they replace 14.3).

### 0. Read first

1. **Physical 2.0's melee and ranged lanes are not on this branch.** `packages/engine/src/physical/melee/links.ts` is a 3-line stub; only 10 of the 58 techniques have handlers (lunge, cut, coup, riposte, shot, aimed_shot, suppress, dead_centre, overwatch, deny). Shove (Link), Break (Finisher), Bind, Bash, Throw Down, Draw Cut and Snap Shot exist only in `data/techniques.json`. Heavy Hands, Follow Through, the new Breaching Strike, Iron Grip, Both Hands and the new Quick Draw all hang on them. Re-check every `physical/` and `combat.ts` line below after the merge.
2. `docs/design/handoffs/physical-2.0-PLAN.md:244` says `combat/shove` becomes the Shove Link at integration, so `combat.ts:1361 shove()` and its callers may be gone or rewired by then.
3. **Most 3/5 unlocks are not engine items.** Only six are (`SKILL_ITEMS`, `packages/engine/src/effects/collect.ts:112`): `brain_power.3`, `brain_power.5`, `rumination.5`, `visualization.5`, `will_power.3`, `will_power.5`. Of the eight unlocks in this area, only Proven Formula has a handler. The engine reads `skills.json` `unlocks` only at `collect.ts:77`; the web client does not render unlock text at all.

### 1. How a perk or unlock is wired today

| Piece | Where | Note |
|---|---|---|
| Perk data | `data/perks.json` `items[]` (106) | Keys: `id, name, tier, perk_type, skills, skill_greek, requires, excludes, ap_cost, uses, text, effects, tiers{I,II}, adjudication, recovered, tags, provisional, flavour, deed`. Tier II has `replaces_tier_I`. |
| Unlock data | `data/skills.json` `items[].unlocks["3"|"5"]` | No id. Keys: `name, category, mastery, text, effects, adjudication`. The "3" entry also carries `{"op":"perk_choice",…}`: keep it. |
| Handler | `packages/engine/src/perks/{a..h}.ts`, `skills.ts`; imported once in `perks/index.ts` | `register({ id, kind?, claims, narrator?, priority?, stat?, on{hook}, checkMod?, actions[], toggles[], noDefaultActions?, brief })` from `'../effects'` (`effects/hooks.ts:20`; type `effects/types.ts:135`). A second `register` with the same id merges. |
| Unlock handler | `perks/skills.ts`, id `skill:<skill>.<points>`, `kind: 'skill'` | Also add the key to `SKILL_ITEMS` (`collect.ts:112`). |
| Who runs each effect | `effects/hooks.ts:61 ownerOf` | handler `claims` → handler `narrator` → op `narrator` → `grant_action` → generic op (`effects/core.ts`) → else **gap**. |
| Ratchet | `packages/engine/test/coverage.test.ts:30` | Baseline 0 gaps: every effect of a new or reworded item must be claimed, generic or Narrator-marked. |
| Default button | `collect.ts:44 isAction` | `perk_type: 'active_skill'`, a numeric `ap_cost > 0` or a `grant_action` makes the item an action. `test/perk-info.test.ts:13` fails if a handler has no `actions` but the data still implies a button. |

### 2. The eight unlocks

| Unlock | Data (`data/skills.json`) | Engine today | Skeleton 2.0 | Size |
|---|---|---|---|---|
| **Shove** (Raw Power 3) | L515; `grant_action shove` 2 AP + `condition prone` + `perk_choice` | Not gated by the unlock: `combat.ts:1361 shove()` is a base action for everyone (`game.ts:1357`, `apps/web/src/game/commands.ts:159,289,302`). | **Heavy Hands:** a melee technique that pushes moves its target 1 tile further. | **New handler** `skill:raw_power.3`. `physical/core.ts:377 forceMove` emits `forced_move` per tile with `tiles: 1`; nothing lets an item add tiles. Needs an additive hook or stat query there. |
| **Break** (Raw Power 5) | L541; `grant_action break` 3 AP | Only "break cover" exists: `combat.ts:1652 shootCover`, cost site `'break'` (:1655). The armour-slot part is unbuilt. | **Follow Through:** a Finisher that takes its target out leaves you 1 Momentum. | **New handler** `skill:raw_power.5`. Finishers call `spendMomentum` (`physical/core.ts:73`), which zeroes the meter: grant after it. `on_kill` (`effects/damage.ts:96`) carries `{victim, by, src, ownTurn}`, no technique id. |
| **Quick Draw** (Dexterity 5) | L1143; `stat_mod free_first_shot_per_combat` | **Nothing reads it.** (`firstShotDone`, `combat.ts:834,958`, is a weapon grant, unrelated.) | First attack each fight with a weapon you draw for it costs 0 AP. | **New handler** `skill:dexterity.5`. Needs the "drawn this action" state (Draw Cut, Snap Shot: `needs.stowed`), which is Physical 2.0 lane work. |
| **Tuned** (Proficiency 5) | L1602; `stat_mod tuned_weapon_damage_pct 10` | **Nothing reads it.** | The weapon you maintain never jams and never breaks; the +10% goes. | **New handler** `skill:proficiency.5`, or data text only if left to the Narrator. Jam: `combat.ts:953`; wear: `:957`, `:1355`, `:1667`. There is no "weapon you maintain" marker. |
| **Weak Point** (Analysis 5) | L2508; `stat_mod analyzed_target_damage_taken_pct 15` | Hardcoded: set `combat.ts:1682` (`analysis >= 5`), log `:1684`; read `combat.ts:879` and `magic.ts:385` (`vs` +0.15, PC attackers only). Also set by Case Closed (`perks/f.ts:300`) and Detective's Eye (`perks/g.ts:174`). Field `Unit.weakPoint` (`combat.ts:82`), copied at `game.ts:2780`. | **Read** *(Suggested)*: enemies you have analysed deal 15% less damage to your squad. | **Handler change** in shared code: drop the two `vs` pushes, add a reduction in the `damage_in` reduce phase keyed on the attacker being analysed. |
| **Stand Still** (Composure 5) | L3576; `stat_mod defense_until_first_act` + `grant_action stand_still_counter` | **Nothing reads it.** | Until you first act in a fight, your Calls cost 1 AP less. | **New handler** `skill:composure.5` on the Calls' cost hook (does not exist yet). Build after the Calls. |
| **Proven Formula** (Rumination 5) | L2057; `stat_mod ap_cost:repeat_sigil_spell −1` | `perks/skills.ts:98-120` (`evoke_cost`, `evoked`). | +3 on saves against a spell or condition that has already hit you this fight. | **Handler rewrite**, same key. `cond_apply` has `saveAdd` (`magic.ts:251`). |
| **Hand-Off** (Camaraderie 3) | L2935; `grant_action hand_off` per round + `perk_choice` | **Not built as the unlock.** The only `hand_off` action belongs to the Many Hands perk (`perks/e.ts:366`). | Once a round, an adjacent ally uses your Defense against one attack. | **New handler** `skill:camaraderie.3` (`attack_preview` or `attack_target`). |

Readers of Proven Formula's current text: `packages/engine/src/glossary.ts:64`, `apps/web/src/narrator/context.ts:307` (comment), spec lines 1425 and 4521 (item 484).

Category labels: `skills.json` `unlock_categories` gives beta `['Passive','AP Mod']`. Hand-Off (`AP Mod`), Stand Still (`Combat Starter`) and the two Raw Power entries need new `category` values, and "AP Mod" as a beta category now contradicts 15.7.

### 3. The fifteen perks

| Perk | Data (`data/perks.json`) | Handler | Today | Skeleton 2.0 | Size |
|---|---|---|---|---|---|
| **Breaching Strike** | L520, `active_skill`, `ap_cost 3` | `perks/a.ts:261-302` (`knockbackSim` :249, `breach` :283) | 3 AP melee action, knockback 1 (II: 2), +50% into a wall; area-map and story actions | Name kept. Passive: a target you push into a wall or another enemy takes the hit again at half. | **Handler rewrite.** Set `perk_type` off `active_skill` and `ap_cost: null`. Tiers I/II are not defined in the proposal. |
| **Grapple** → **Iron Grip** | L615 | `perks/a.ts:188-245` (`grabUnit` :189, `captiveOf` :194, tier II redirect in `attack_target` :236, `moved` lets go :243) | 2 AP grab; II: 50% redirect to the captive | I: a held target can't use Answers or reactions; 50% redirect; it moves with you. II: every melee technique on a held target earns the variety bonus; Throw Down needs no Momentum. | **New handler + new icon.** Reuse the redirect. `moved` currently ends the hold: invert it. `varietyBonus` (`physical/core.ts:88`) is private. |
| **Origami Hands** → **Both Hands** | L1210 (`skill_greek: beta`, wrong) | `perks/c.ts:296-350` (action `improvise`, `improvise_story`) | Trap, sling or tool from a spare part | After a melee technique hits, your next Shot that turn has no Recoil; after a Shot hits, your next melee technique counts as different for Momentum. | **New handler + new icon.** `attack_preview` can set `noRecoil` (`combat.ts:801,839`). Tiers not defined. |
| **Case Closed** | L5214 | `perks/f.ts:298-329` | Full reveal; allies +2 to hit and +20% damage; sets `weakPoint` | Full reveal kept; allies get +2 Defense against an analysed enemy. | **Handler change.** Drop `attack_preview` +2 and `damage_out` +0.2 (:310-311). The +20% is not mentioned in the proposal. |
| **Nothing Gets Past** | L5024 | `perks/c.ts:477-507` (action `hold_line`) | Overwatch shot at every mover | Every enemy that moves in your sight is Spotted for free. | **Handler rewrite**, depends on the Spot Call. |
| **Still Water** | L5504 | `perks/f.ts:345-357`, `claims: [1]`; `aiPick` :337 | Brain immunity (generic op, effect index 0); unreadable (index 1) | Unreadable kept; your Steady also ends one Brain or Heart condition. | **Handler change**, depends on the Steady Call. Removing effect 0 shifts the index `claims: [1]` points at. |
| **Roll With It** II | L1132 (`skill_greek: alpha`, wrong) | `perks/b.ts:192-222` | II: 2 free tiles and +0.1 critical multiplier | The damage rider becomes "a second free tile". | **Handler change:** delete the crit state (:206, :211, :213, :218-222). See ambiguity 1. |
| **Rally Cry** | L3301, `ap_mod` | `perks/e.ts:249-266` (`on_downed`) | Others bank +1/+2 AP when an ally drops | The others take less damage until their next turn. | **Handler rewrite.** Number not given. |
| **Many Hands** | L5348, `ap_mod` | `perks/e.ts:363-386`; reaction share in `tactics.ts:70-84` | Hand-Off up to 3 AP; shared reaction | Shared reaction stays; the AP gift goes. | **Handler change:** remove the `hand_off` action; keep `tactics.ts`. |
| **Used to the Pain** | L195, `ap_mod` | `perks/a.ts:127-140` | ±AP after the first hit of a fight | A light first hit hardens you against the next; a heavy one doesn't. | **Handler rewrite.** Numbers not given. |
| **Walking Wounded** | L4592 | `perks/a.ts:378-392` | Injuries cost nothing; +1 AP a turn below half HP | Injuries kept; below half HP you take less damage. | **Handler change:** replace `turn_start_pre` (:390). Number not given. |
| **Into the Dark** | L714, `ap_mod` | `perks/b.ts:76-108` | I: first move into unseen ground 1 AP less; II: +1 AP in a place of Fear | I: can't be ambushed on your first move into the unknown; II: no Fear on your first turn there. | **Handler rewrite.** |
| **Clean Hands** | L4302, `ap_mod` | `perks/f.ts:196-223` (`cleanAp` :196, toggle `spare`, action `clean_story`, `round_ap`) | +2/+3 AP after sparing | A shield after sparing someone. | **Handler change:** `cleanAp` → `grantShield`. Number not given. Three texts say "+AP" (:207, :218, :219). |
| **Blueprint** II | L2606 | `perks/e.ts:173-213` | II: +1 AP to allies who saw the sketch | II: +1 more Movement. | **Handler change:** drop `pushAp` (:196-199), make :203 add 2 at tier II; texts :176, :194. |
| **On My Mark** | L5628 | `perks/e.ts:404-440` | Ally acts out of turn, attacks included | **Keep** (Leon). | None. |

Client readers of these perks: `apps/web/src/game/actionPickers.ts:171` (grapple_npc), `:194` (breach_story), `:223` (hold_line), `:239` (improvise), `:257` (many_hands hand_off); `apps/web/src/screens/main-pickers.test.ts:140`; `apps/web/e2e/perks.mjs:65-78,123` (uses `breaching_strike` and `used_to_the_pain`). Perk text and icons reach the screen through `apps/web/src/game/protodata.json` and `assets.json`, both generated.

`perk_type: 'ap_mod'` should change on Used to the Pain, Into the Dark, Rally Cry, Clean Hands and Many Hands. It is shown on the card by `design/canvas-build/build.py:59`.

### 4. Tests that pin today's behaviour

| Item | File: test name |
|---|---|
| Breaching Strike | `perks-a.test.ts` "Tier I: 3 AP, a melee hit that knocks the target back 1 tile", "Tier II: 2 tiles; slammed into a wall it takes +50%"; `completeness-a.test.ts` "Breaching Strike on a token next to you starts the fight…", "the story Breaching Strike opens a ruling"; `completeness-a2.test.ts` "Breaching Strike II from the area map opens the fight with the strike"; `sandbox.test.ts:427,446` (uses the id as a sample perk) |
| Grapple | `perks-a.test.ts` "Tier I: 2 AP, the target is Grappled…", "Tier II: attacks aimed at you can land on your captive instead", "story: holding an NPC marks it Grappled…" (helper at :21); `completeness-a.test.ts:135`; `completeness-b.test.ts:117` "half the blows aimed at the grappler land on the captive"; `completeness-b2.test.ts:60,71` |
| Origami Hands | `perks-c.test.ts:167,179` |
| Case Closed | `perks-f.test.ts:153` "Analyze reads everything; you and every ally get +2 to hit and +20% against it", `:162` |
| Weak Point | `engine.test.ts:367` "Analyze: 2 AP, range 4 + Analysis…"; `review-fixes.test.ts:80` "+15% on a Sigil hit against a Weak-Pointed foe"; `perks-g.test.ts:106,113` (Detective's Eye); `subsystems.test.ts:69` (label only) |
| Nothing Gets Past | `perks-c.test.ts:237` |
| Still Water | `perks-f.test.ts:170` "immune to Brain debuffs, no save", `:175` |
| Roll With It | `perks-b.test.ts:79,89` ("II: 2 tiles, and the next attack gets +0.1 on the critical multiplier") |
| Rally Cry | `perks-e.test.ts` describe at :148 and "friendly fire doesn't rally anyone"; `review-fixes.test.ts:104` "the finishing hit banks nothing"; `completeness-b.test.ts:199` |
| Many Hands | `perks-e.test.ts:251,260`; `completeness-c.test.ts:36` (shared reaction: keep), `:44` |
| Trait tests that use Many Hands' Hand-Off as their vehicle | `perks-e.test.ts:550` (Petty), `completeness-c.test.ts:177` (Humanity First), `completeness-d2.test.ts:139` (Xenophobe) |
| Used to the Pain | `perks-a.test.ts:88,92`; `completeness-b.test.ts:185` |
| Walking Wounded | `perks-a.test.ts:221` (includes "below half HP +1 AP a turn"), `:230`; `hooks-gap.test.ts:122`; `completeness-b.test.ts:206` |
| Into the Dark | `perks-b.test.ts:21,31`; `completeness-b.test.ts:131`; `completeness-b2.test.ts:80` |
| Clean Hands | `perks-f.test.ts` describe at :99, and :106; `completeness-b.test.ts:31` |
| Blueprint | `perks-e.test.ts` it.each near :110, and :119 |
| Proven Formula | `sigil14-batch2.test.ts:125` |
| Unlock item list | `sigil14-batch2.test.ts:94` asserts the exact six `skill:` keys: every new `SKILL_ITEMS` entry changes it |
| Lane lists | `perks-b.test.ts:443` names `into_the_dark` and `roll_with_it` |
| Counts | `coverage.test.ts:22` (perks ≥ 106, traits = 74), `:30` (gap ratchet) |

### 5. Achieved perks (19) against the moved numbers

| Perk (skills) | Handler | Reads a moved number? |
|---|---|---|
| Field Surgeon (Proficiency + Camaraderie) | `perks/e.ts:693` | **Yes.** `healingMult` (`character.ts:597`) reads Camaraderie; healing given moves to Empathy, so its holder loses the multiplier. |
| Fire Sermon (Faith + Eloquence) | `perks/d.ts:543` | **Yes.** `applyCond(…,'shaken')` uses the caster's Heart debuff strength (Implication today). By rule 4 a Blessing's condition reads Faith. |
| The Voice (Authority + Composure) | `perks/e.ts:488-493` | **Yes, by plumbing.** TN is `authority mod − unitDebuff(u,'heart')` to cancel the family strength. Breaks if the debuff function changes shape. |
| Siege Engine (Raw Power + Durability) | `perks/a.ts:455`, `claims: [0,1]` | **Not a table number, but its text is "Shove and Break cost 1 AP less".** Both unlocks are replaced; the cost sites are `ap_cost:shove` and `ap_cost:break`. The proposal doesn't mention it. |
| Verse of War (Implication + Will Power) | `perks/d.ts:466` | No change needed: it adds +1 to `mg.soulRange`, whose base moves from Lore Master to Will Power. |
| Between Heartbeats, Sixth Sense, Dance of Iron, Twin Souls, Silent Partner, Charge, Make Way, Just the Repairman, Spoon-Feed, Cultured, Cold Read, Dead Signal, Bite the Bullet, What Could Be | b/c/d/e/g.ts | No. (Initiative, Detection and sensing stay per 15.1; Dodge stays on Athletics; Stealth stays on Ingenuity.) |

Ultimates are untouched. Last Charge's shield goes through `grantShield`, so it follows shields-received moving from Sensory to Conscience with no handler change.

Other perks that read family debuff strength or saves directly (the debuff-by-source function must cover them): `perks/f.ts:83,119,147,173,574` (Bone Talk, The Name They Whisper, Open Hand, Trench Poet), `perks/e.ts:668` (Lay Down Arms), `perks/g.ts:446` (Their Own Idea, `debuffStrength`), `perks/a.ts:190,203` (Grapple), `perks/e.ts:133` (Grim Reaper), `perks/g.ts:196,210` (Crowd Pleaser, on the `parley` hook's `threaten`). `perks/f.ts:47` treats a Composure check as a Heart save.

### 6. Adding or replacing a perk

1. **Spec first:** perk rulings live in `docs/rules/PHC-Core-Rules-v1.0.md` section 14 items: Used to the Pain 102 (L3046), Grapple 105 (L3055), Breaching Strike 106 (L3061), Into the Dark 121 (L3144), Roll With It 123 (L3149), Origami Hands 148 (L3221), Nothing Gets Past 151 (L3239), Blueprint 187 (L3434), Rally Cry 189 (L3449), Many Hands 193 (L3468), Clean Hands 214 (L3586), Case Closed 217 (L3607), Still Water 218 (L3614); AP rules L2321-2330; stacking list L2070 and item 85 (L3020) name Case Closed and Weak Point.
2. **Data:** edit `data/perks.json` (`text`, `effects` and both `tiers`). Keep exactly two acquired perks per skill (`character.ts:885,893` count them). New ids are snake_case.
3. **`data/effect_ops.json` is generated** by `tools/fix_pack.py` (:138-165: tier, count, params, used_by). Re-run it; don't hand-edit. An op not in the file gives a validator warning ("non-standard effect op", `tools/validate.py:1126`); the pack is at 0 errors, 0 warnings today.
4. **`tools/validate.py` rules that touch perks:** unique ids (:60); every `skill`, `perk`, `condition`, `class` reference resolves (:77-92), so an Ultimate's `requires: [{perk}]` breaks if an id it names is removed; `start_item` exists (:488); weapon-mastery perk ids must not clash (:382). It does not check tiers, `skill_greek`, `perk_type`, two-per-skill or unlock shape.
5. **Engine:** `register` in a `perks/*.ts` file; unlocks also in `SKILL_ITEMS`. Run `npm test -w @phc/engine`.
6. **Art:** file `art/icons/perks/<kebab-id>.png` (1024 × 1024, transparent, ink `#FFFFFF`, RGBA) plus `exports/{256,128,64,56,48,44,40}/`. Catalog entry under `art/catalog.json` `perks["<kebab-id>"]` with `label, collection, path, sha256, width, height, background, ink, usage, data_id, status, production_approved, batch, exports` (model: `grapple`, catalog L5340). Then `python3 tools/rehash_art_checksums.py`, `python3 tools/validate_art.py`, `npm run assets`, `python3 design/canvas-build/build.py --web`.
7. **`tools/validate_art.py` rules:** every catalog perk `data_id` must exist in `perks.json` (:134); catalog perks count 2 to 106 (:404); `art/_archive/traits/wick/production-progress.json` `catalog_coverage.perks` must equal the catalog count (:190), 106 today; `--complete-icons` needs every perk to have one.

### 7. Traps

1. **Replacing an id orphans its catalog entry.** If `grapple` or `origami_hands` leaves `perks.json`, its catalog entry fails `validate_art.py:134`. "Origami Hands' icon is kept for the stealth list" means moving it out of `catalog.perks` and updating `production-progress.json`.
2. **Index-based claims.** `still_water` claims `[1]` and `siege_engine` `[0,1]`. Reordering their `effects` silently changes who runs what.
3. **`skill_greek` is already wrong on six perks:** `wall_run`, `roll_with_it`, `never_there` (Athletics, tagged alpha) and `origami_hands`, `running_reload`, `trick_shot` (Dexterity, tagged beta). Nothing in the engine reads the field.
4. **Name and id clashes:**
   - "Read" (the Weak Point rename) is already a class move (`classes/rev3.ts:440`).
   - "Steady" (Composure's Call) is already Guts's unlock at 3 (`skills.json` L666).
   - `spot` is already a ranged technique id.
   - `rally` is a class action id (`classes/rev3.ts:585`).
   - `order` is On My Mark's action id (`perks/e.ts:407`).
   - "Weak Point" is also a shelved class move (`classes/j.ts:318`).
   - `threaten` is a `combat/parley` kind (`tactics.ts:171`).
5. **Do not change:** On My Mark, True Name, Eyes in the Back, Second Wind, Still Standing, Paint the Field, and the eleven cost discounts of 15.8 (Speed Load, Hot-Swap, Overhaul, Twin Draw, Parallel Thought, Quick Read, Rite in the Field, Righteous, Shrug It Off II). Quick Read is hardcoded at `combat.ts:1674` and `perks/f.ts:318`.
6. **Gamma AP perks stay** (Grim Reaper, Overruled, Talks Broke Down, Sweet Talker, Outclassed, You Get Used to It, Got You in My Sight, Rounding Up). `bankAp`, `grantPerkAp`, `PERK_AP_CAP` and the `ap_gift` hook (`effects/ap.ts:37-58`) stay in use; after Many Hands loses Hand-Off, `ap_gift` has no player-to-player emitter until Rally exists.
7. **Build order:** Stand Still, Still Water and Nothing Gets Past need the Calls (Stage 2). The six items in 0.1 need the merged Physical 2.0.
8. Detective's Eye (`perks/g.ts:174`) sets `weakPoint` and logs "+15% squad damage": it follows whatever Weak Point becomes.
9. `Unit.weakPoint` is only applied for PC attackers (spec item 414, L4448). The mirrored version must decide the same for Team B.
10. Regenerated files (`protodata.json`, `assets.json`, `effect_ops.json`, `checksums.sha256`) are never hand-edited. `design/canvas/` is paused: `build.py --web` only.

### 8. Ambiguous or hard in the proposal

1. **Roll With It II** already gives 2 tiles. "Reword the damage rider to a second free tile" reads as either "II is just 2 tiles" or "3 tiles".
2. **No numbers** for Rally Cry, Walking Wounded, Used to the Pain, Clean Hands (shield size), or Case Closed's +20% damage.
3. **No tier split** for the new Breaching Strike and Both Hands. Acquired perks need tiers I and II.
4. **New ids or old ids?** Iron Grip as `iron_grip` and Both Hands as `both_hands` means the catalog and test changes above. Keeping `grapple` / `origami_hands` with new names avoids them but leaves the wrong icon bound.
5. **Hand-Off and Many Hands text:** Many Hands' data text is "Hand-Off has no limit…". With Hand-Off now a Defense loan, it needs new wording beyond "the AP gift goes".
6. **Tuned** has no "weapon you maintain" marker in the engine. Either every weapon the holder carries, or a new designation action.
7. **15.5 says** the Camaraderie perks "count as the ally's one helping Call"; 15.7 removes their AP, so that rule has nothing left to apply to.
8. **Siege Engine** needs a ruling (trap in section 5).
9. **Section 13.6 item 3** says no perk is moved or reworded in this version; 15 and 16 supersede it. The spec text should say which.


---

## Code map: where the nine Calls live, gear gates, and the screen

Read at `claude/charming-gauss-hbq4n0`, HEAD `b016cf1`. All paths are under ``.

**Three facts that change the plan:**

1. **Physical 2.0 is only a foundation here.** The engine has `packages/engine/src/physical/` with 10 registered handlers. The client has no technique pad: nothing in `apps/web/src` calls `techniquePad`, `previewTechnique` or sends `combat/technique`, and there is no ARMS tab. Lanes A, B and C are on other branches. Every client line number below will move when they merge; re-anchor then.
2. **There is no Talk option on screen today.** `combat/parley` is sent only by engine tests. No client file builds Persuade, Threaten or Offer terms, and no unit or e2e test pins talk options. The Calls pad is the first fight UI for speech.
3. **The client never shows `skills.json` `per_point.text`.** Skill cards show `summary` and the hand-written `epccg.effect`, both through `protodata.json`. "Skill cards read from the data, so they follow" (13.5.4) is not true as written.

---

### 1. Engine

#### 1.1 How in-fight talk works today

| Where | What it does today | What Skeleton 2.0 needs |
|---|---|---|
| `packages/engine/src/game.ts:316` | Action type `combat/parley {unitId, targetId, kind: persuade/threaten/parley, text}` | Add `combat/call {unitId, id, targetId?, allyId?, tile?, opt?, text?}` beside `combat/technique` (line 355). Decide whether `kind: 'threaten'` stays (trap T1). |
| `game.ts:1397` | Finds the target, calls `parley()` | Add a `combat/call` case shaped like the technique case at 1363–1370 (strip client-only fields, `tileKey`, `refuseHook`, then `useCall`). |
| `game.ts:1326` | `combatAction` refuses any action whose `unitId` is not `active(cb)` | A Call made as a reaction (9 points) can't come through here unless the caller is made active by a window, or the Call is armed beforehand (see 1.5). |
| `game.ts:1335`, `1337–1341`, `1500` | Companions and puppets are limited to `COMPANION_ACTS`; a unit with `allowedActions` refuses everything else | Keep `combat/call` out of `COMPANION_ACTS`. `allowedActions` is the one existing way to limit what a unit may do in a window (useful for Order and Cue). |
| `packages/engine/src/tactics.ts:167` | `HEARING = 8`, a fixed constant | Calls need `voiceRange = 4 + points` (5 at 1, 14 at 10). Do not change `HEARING` (trap T2). |
| `tactics.ts:171–186` `parley()` | Enemy only, within `HEARING`, no sight needed. Cost `actionAp({u}, 'parley', 2)`. Emits hook `'parley'`, pays, then persuade is `ldebuff` on a Brain save, threaten is `shaken` on a **Body** save, parley is `trySurrender`. Logs, and pushes the words to `cb.notes` for the Narrator. | Persuade and Offer terms stay here. Threaten becomes the Intimidation Call. Copy the `cb.notes` push so spoken Calls reach the Narrator. |
| `tactics.ts:154–162` `trySurrender()` | Heart save against `12 + unitDebuff(by, 'heart')` | Offer terms reads Charisma (13.2 note). Needs the new debuff-by-source function (other area). |
| `packages/engine/src/effects/core.ts:146` `COST_SITES` | `'parley'` is not in it, so no data `action_cost` can change talk cost today | The Call cost is a new function. Add a site only if perks must discount Calls generically. |
| `packages/engine/src/effects/types.ts:63` | `'parley'` is a `HookName` | Add the Calls' hook names (for example `call`, `call_cost`). Stand Still, Still Water and Nothing Gets Past (15.5) need them. |
| `packages/engine/src/perks/g.ts:195–210` | Crowd-Pleaser listens on `'parley'` for persuade and threaten, and re-applies `shaken` with a `'body'` save in `crowdHit` | Must fire for the Threaten Call too, and use the same save as the Call. |

#### 1.2 Conditions the Calls reuse

| Where | Today | Use |
|---|---|---|
| `packages/engine/src/magic.ts:93` `shaken` | Family heart, 3 rounds, −2 Heart saves and social checks (`magic.ts:198`, `game.ts:999–1001`) | Threaten step 1. |
| `magic.ts:95` `taunted` | Family heart, 1 round. `previewAttack` refuses any other target while the taunter is seen (`combat.ts:810`, `hk.ignoreTaunt` escapes). Ends when it attacks the taunter (`combat.ts:987`). The enemy AI sorts the taunter first (`combat.ts:1771–1776`). | Taunt step 1 as it is. |
| `magic.ts:96` `commanded` | An order in `condArg` (halt, kneel, drop, `move:x,y`), obeyed in `beginTurn` (`combat.ts:1122–1133`), `moveBlock` (1205) and the AI (1733, 1814) | Not the Order Call. Commanded is hostile and acts on the bearer's next turn; Order is an ally acting now. |
| `magic.ts:94` `fear` | Can't move toward or attack the source (`combat.ts:1220`, `809`, AI `1781/1788`), −2 to hit others | Too strong for Threaten step 2 ("can't move toward you"). A lighter flag is needed, checked at `combat.ts:1220` and `1788`. |
| `magic.ts:268–300` `applyCond()` | Save is `d20 + unitSave(t, fam)` against `12 + unitDebuff(by, fam) + tnAdd`. Hook `cond_apply` can cancel, skip the save or change the TN. | A Call's TN is 12 + the speaking skill's modifier. `applyCond` has no way to pass a skill, only a family. Needs the debuff-by-source change. |
| `magic.ts:196–199`, `207` | `unitSave` and `unitDebuff` read `u.sv` and `u.dbf`, built per family when the unit is made (`combat.ts:376`); enemies by tier | Enemy Threaten and Taunt have no skill points to read: a tier number is needed. |

#### 1.3 AP: grants, penalties, debt

| Where | Today | Use and gap |
|---|---|---|
| `packages/engine/src/effects/ap.ts:19–32` `turnAp()` | `ap = clamp(2, 9, 6 + min(3, banked + grants) − penalties − Stunned 1 − Dazed 2)`, then minus debt (at most 4, taken after the floor) | **Steady has no input here.** It needs a cancel amount on the unit, consumed inside `turnAp` against penalties, `dazedNext`, `stunnedNext` and `apDebt`, and added to the kept fields. A grant would be wrong: it counts toward the +3 perk cap. |
| `ap.ts:36–45` `grantPerkAp()` | Adds AP only on the unit's own turn and outside a window; otherwise banks it | **Rally "they gain 1 AP now"**: an ally is never on its turn when you Call, so this always banks to `apNext`. Raising `u.ap` off-turn is lost: `beginTurn` overwrites it (`combat.ts:1089`). |
| `ap.ts:47–51` `bankAp()` | `u.apNext += n`, counted in next turn's +3 cap | Rally's real effect. Pass `from` so `refusedGift` runs. |
| `ap.ts:54–59` `refusedGift()`, hook `ap_gift` | Humanity First refuses AP from a non-human | Rally must go through it (pinned: T-tests). |
| `ap.ts:61` `apDebt()` | After the floor, cap 4. Used by `physical/core.ts:372` and `magic.ts:1207` | Threaten's −1/−2 AP and Taunt's are best as debt (the Physical 2.0 precedent). A `turn_start_pre` penalty stops at the floor of 2. Pick one. |
| `ap.ts:63` `pushAp()`; `combat.ts:1085–1088` | `turn_start_pre {u, grants, penalties}` collects, then `turnAp` | `onHook('turn_start_pre')` as `physical/rules.ts:66` does. |
| `packages/engine/src/perks/e.ts:359–385` (Hand-Off, Many Hands), `250` (Rally Cry) | AP gifts through `grantPerkAp`/`bankAp` | 15.7 replaces these effects. If any stays, it must mark the ally as "helped this round" through a helper the Calls core exports. |
| No single cost site | About 40 places do `u.ap -= cost` (`combat.ts:1238, 1333, 1383, 1511, 1628…`). The hook name `action_cost` is declared (`effects/types.ts:57`) and never emitted. | **Brief can't be a cost hook.** The only working pattern is Encore's lend-and-settle in the reducer: `encoreBefore` (`game.ts:1349`, `faith.ts:923`), `encoreAfter` (`game.ts:1437`, `faith.ts:928`), and `encoreCredit` (`combat.ts:781`) so previews and the client's "Needs N AP" greying see the loan (`combat.ts:813`; `apps/web/src/screens/combat.js:554, 682`). Brief needs the same three pieces. |

#### 1.4 Reactions and windows

| Where | Today | Use |
|---|---|---|
| `tactics.ts:58–62` `maxReactions(u, cb)` | `1 + statQuery({u}, 'reactions').add`; 0 while Suppressed, Stunned, skipping, or on Dread residue | Cue: `onStat('reactions', …)` (`effects/hooks.ts:151`). The stat query isn't given `cb`, so pass it or read the round another way. |
| `tactics.ts:63–85` `reactionsUsed`, `canReact`, `useReaction`, `refundReaction`, `reactionDonor` | `u.reactUsed = {r, n}` per round; Many Hands lends a reaction | Order spends the ally's reaction with `useReaction(cb, ally)`. A Call as a reaction spends the caller's. |
| `combat.ts:1261–1266` | Opportunity attack: hook `reaction_window {reactor, mover, kind: 'opportunity', cancel}`, then `useReaction` | The pattern for any reaction. |
| `combat.ts:1320`; `physical/core.ts:582–603` `fireWatch`, `answer` | Overwatch, held Watch and Answers: `reaction_window`, `useReaction`, fx, `checkOver` | Copy `answer()` for a Call fired as a reaction. |
| `physical/rules.ts:85–90` | Pressed cancels held shots; Suppressed cancels opportunity attacks | Decide whether a Suppressed caller may Call as a reaction (trap T9). |
| `effects/actions.ts:243–267` `openWindow`, `windowStep`, `closeWindow` | Gives units an out-of-turn action: `active(cb)` (`combat.ts:428`) returns the queue head; a pool `ap` is lent and not kept | The base for Order and for Cue's 1-tile move. Precedent: On My Mark (`perks/e.ts:395–440`), which also settles spent AP as debt in `ommSettle`. |
| `combat.ts:906–921` hook `attack_target` | Before an attack resolves: redirect (`tgt`), or `cancel` (AP still paid) | Warn's step before the attack. A moved target can make the attack invalid: `previewAttack` runs again at 923 and refuses with nothing spent. |
| `cb.order` edits: `classes/k.ts:1681`, `faith.ts:1060` and `688`, `perks/b.ts:450` | Insert or reorder; some restore at `round_start` | Cue step 3. |

#### 1.5 How Physical 2.0 registers and runs a technique (the shape to copy)

| Piece | Where | What it does |
|---|---|---|
| Data | `data/techniques.json` through `physical/data.ts:8–10` (`PHYS_RULES`, `TECHNIQUES`, `TECHNIQUE`) | `rules` and `items`. `TechDef` (`physical/types.ts:14–29`) holds `ap`, `needs`, `text`, `aim`, `numbers`. |
| Registry | `physical/core.ts:22–27` `technique(h)` | `HANDLERS[h.id] = h`; each `react` hook name is wired once through `onHook` to `dispatch` (31–45). |
| Handler | `physical/types.ts:88–97` `TechHandler` | `check?`, `run(t)` (with `t.preview` true it describes and changes nothing), `react?`, `ai?(t)` returning a score (a plain attack is 5). |
| Context | `core.ts:113` `buildTech`; `types.ts:70–87` `Tech` | `cb, u, c, def, args, tgt, rng, preview, pv`, plus `num()`, `note()`, `state()`. |
| Cost | `core.ts:134` `techniqueAp`, `146` `apFor` | The technique's own cost, then `attack_preview` so items change it. |
| Who may | `core.ts:156` `usable`, `181` `gate`, `212` `targetGate` | Refusals in plain words before any target. |
| Entry points | `core.ts:606` `prepare`, `625` `previewTechnique(cb, u, id, args, g?)`, `660` `useTechnique` | `useTechnique` previews first, pays AP, emits fx `'technique'`, runs the handler, refunds on a refusal, logs the notes. |
| Pad | `core.ts:693` `techniquePad(cb, u, hand, g?)` returning `PadGroup[]` | Per entry: `ap, ok, why, text, aim`. "The screen never works a number out itself." |
| Game binding | `core.ts:623` `withG` | The character behind a unit is found through the bound game. The client must pass `g`. |
| Helpers | `core.ts:334` `save`, `345` `cond`, `355` `stop` (with `apLoss` as debt), `379` `forceMove`, `548` `stepUser`, `594` `answer` | `save()` hard-codes `charisma → brain`, `composure → heart` at `core.ts:338`, which changes with the saves. |
| Per-unit state | `core.ts:59` `techState(u, id)` in `u.tech`; `51` `turnStamp(cb)` | "Once a turn" marks (`_take` at 198 and 685). |
| Enemy AI | `physical/ai.ts:15–30` `aiTechnique`, `31–34` `enemyStep({plan, act})`; `combat.ts:1728–1730` registry; tried at `combat.ts:1755`, intent at `1828`; `core.ts:616` `aiScore` | Planning reads previews only, so the intent a player Analyzes is what the enemy does. Enemy lists: `enemies.json` `techniques` copied to `u.techs` (`combat.ts:420`). |
| Standing rules | `physical/rules.ts` (global `onHook` listeners), `physical/pressure.ts` | Rally sheds Pressure with `lowerPressureOf(cb, ally, 1, 'Rally', caller)` (`pressure.ts:62`). |
| Exports | `packages/engine/src/index.ts:28–33`; imports at `game.ts:12`; side-effect imports in `physical/index.ts:10–11` | Add the Calls' exports and handler imports the same way. |
| Kept fields | `game.ts:2778–2783` `SB_KEEP` | Add every new unit field, or a Proving Ground rebuild drops it. |
| Hidden state per side | `game.ts:1810–1819` `viewFor` | A Spot or Warn mark needs no hiding unless a design wants it. |
| Validator and docs | `tools/validate.py:1011–1021`; `data/CONVENTIONS.md` | A `calls.json` block and convention entry. |

**New for Calls (nothing exists):** `data/calls.json`; a `calls/` folder (types, data, core with `call()`, `previewCall`, `useCall`, `callPad`, ai, one handler per Call); functions for level (points of the gamma), voice range, step (1/3/7), cost (2; 1 from 5 points; first each turn 0 at 10; Stand Still −1), and the per-round helped/hindered marks on the target.

#### 1.6 The nine Calls: pieces that exist, and what is missing

All read the speaker's points through `charOfUnit(u)`. The unit carries no gamma points except `u.vigilant` and `u.sensory` (`combat.ts:364, 368`).

| Call | Built from | Missing |
|---|---|---|
| **Order** (Authority, ally) | `useReaction(cb, ally)`; `reload` (`combat.ts:1488`), `toggleProne` (1381), `pickUp` (called at `game.ts:1402`), `moveUnit(..., {free: true})` (1213); or `openWindow` with a lent pool plus `allowedActions`, as On My Mark does | Every one of those functions deducts its own AP (no free flag except `moveUnit`): lend AP and restore, or use a window. Who chooses the thing and the tile, the speaker or the ally's player? Pick up needs a pile selection (`a.take`). "Stand up" must refuse when not prone. Moving draws opportunity attacks unless `free` without `oa`. On My Mark keeps its own once-a-round mark (`perks/e.ts:417`): decide if it shares the helped limit. |
| **Rally** (Charisma, ally) | `bankAp(ally, n, 'Rally', cb, caller)`; `lowerPressureOf` | "Now" can only mean next turn (1.3). Banked AP shares the +3 cap with perks, so a Rally can be lost to it. Step 3 gives 2 AP for 1, against rule 10.1.4 (13.8 leaves it open). |
| **Brief** (Eloquence, ally) | The Encore pattern (1.3) | A per-unit discount (amounts, round), lend-and-settle in `combatAction`, and a credit function the previews read. "This round": an ally who already acted gets nothing, so it likely must last to the end of their next turn. Does a free action use up the discount? |
| **Steady** (Composure, ally or self) | `endCond` for Shaken and Fear (`faith.ts:945` does the same) | The cancel input to `turnAp` (1.3). Name clash: `combat/steady` is already "Steady the heart" (`game.ts:1422`), and Guts 3 is "Steady" (`data/skills.json:666`). |
| **Cue** (Reaction Speed, ally) | `onStat('reactions')`; `cb.order` splice (`classes/k.ts:1681`) | The extra reaction needs a round stamp on the unit. "It may be a move of 1 tile": no reaction that is a move exists; it needs a trigger and a window. "Act straight after you": if the ally already acted this round a move gives a second turn, and the order is never restored unless you write it (precedent `faith.ts:688`). |
| **Spot** (Vigilant, enemy, no save) | `attack_preview` sets `hk.ignoreCover` and pushes `hk.terms` (+1 to hit) (`combat.ts:801`); the `'sees'` hook for one viewer (`combat.ts:666–676`); `reveal()` (`tactics.ts:102`) | A counter on the target used up on a real attack (`on_hit`/`on_miss`), never in `attack_preview` (handlers there must not change state). Hidden is one flag per unit, not per viewer: "not Hidden to them" must go through `'sees'`, or it reveals to everyone. How do you target a Hidden enemy you can't see? Does a burst count as one attack? Name clash: the ranged technique `spot` (`data/techniques.json:1827`). |
| **Warn** (Sensory, ally) | `attack_target` hook; `moveUnit(..., {free: true})` or `stepUser`; `hk.terms` −2 | Who picks the tile in the middle of an enemy's attack: a window pauses the enemy turn (the AI loop breaks on `cb.window`, `combat.ts:1738`, and must resume), or the tile is chosen when the Call is made. After the step the attack may be refused with nothing spent (`combat.ts:923`): decide whether it is wasted or re-aimed. Does it use the ally's reaction? |
| **Threaten** (Intimidation, enemy) | `applyCond(…, 'shaken', …)`; `apDebt` | Body or Heart save (trap T1). The lighter "can't move toward you" flag. Machines and bosses: `canSurrender` (`tactics.ts:142`) and `machineLike` (`classes/rev3.ts:64`) exclude them elsewhere; Draw Fire spares bosses. Nothing is said for Calls. |
| **Taunt** (Implication, enemy, Heart save) | `applyCond(…, 'taunted', …)`; `onHook('attack_preview')` raising `hk.ap` when the attacker is taunted by the target (techniques pass through `apFor`, `core.ts:146`) | Taunted binds only weapon attacks: Sigils, Outbursts and prayers ignore it (the only checks are in `combat.ts`). It lasts 1 round and ends on the first attack at you, so "first attack" needs no counter. |

**Enemy AI for Threaten and Taunt (13.5.3):** add a second `enemyStep` beside `physical/ai.ts`. It needs a list and a level per tier in `enemies.json` (no skill points on a stat block), and the TN from `TIER_DEBUFF` (`magic.ts:194`) or a new number. Note `combat.ts:1755`: steps run only when the enemy has no order.

**Call as a reaction at 9 points:** the proposal names no trigger. The engine has three patterns: an automatic handler on a hook (`answer`), a held Watch, or an armed preset (`ActionDef.arm`, `effects/types.ts:114`, resolved off-turn at a hook). None lets a player choose freely off-turn.

---

### 2. Gear gates

| Where | Today | Needs |
|---|---|---|
| `packages/engine/src/character.ts:963` (in `equip`, 951) | The only skill check on gear: `WEAPON[wid].requires` (`{skill: n}`), **main hand only**; message "Needs proficiency 3." | No code change; the data moves. |
| `character.ts:967–972` (off hand), `973–976` (worn) | No `requires` check | Unchanged unless the rule should bind (trap T4). |
| Callers of `equip`: `game.ts:1564–1565` (draw and wear in a fight), `1612`, `2872` (`gear/equip`), `2896`; `character.ts:866` | All pass through 963 for the main hand | None. A technique that draws a stowed weapon shows the refusal in the pad (`physical/core.ts:728–731`). |
| `data/weapons.json` `requires` | 9 weapons: longbow (raw_power 3), hellraiser_servo_fist and core_rifle (proficiency 3), spellslinger_pistol, evoker_blade, grand_staff (brain_power 3), emanator_gauntlet (will_power 3), lumeri_censer_gun (faith 3), bot_thread_banner (camaraderie 3) | servo-fist → raw_power 3; core_rifle → dexterity 3; banner → empathy 3. |
| `data/skills.json` `gates` arrays | Tags only (`armor:heavy` on durability, `weapon:light_melee` already on dexterity, and so on). **Nothing reads them**: not the engine, the client, `tools/validate.py` or `design/canvas-build/build.py`. | Move `armor:heavy` to pain_threshold. "Light blades: Dexterity, as guns are" is already true as a tag; guns have no number either. |
| `character.ts:416–420` `armourCap` | A trait cap on armour Class; used at `character.ts:432` and `game.ts:3277` | Not a skill gate. Leave it. |
| Armour | `c.armourClass` 0–5; the 16 armour items in `data/items.json` have no `requires` | No skill gates heavy armour in code today, so "Durability → Pain Threshold" is a tag move plus text unless a real check is wanted. That would be new behaviour; 13.6.4 says there is none. |
| `data/skills.json` `epccg.effect` | Durability "gates endurance equipment", Raw Power "gates strength equipment", and so on | The gate wording shown on screen lives here (section 3). |

---

### 3. Client

#### 3.1 Skills, unlocks and perks on screen

| Where | Shows today | Needs |
|---|---|---|
| `design/canvas-build/build.py:136–144` `skills()`, `46–52` `epccg()`, `105–115` `skill_perks()`, `66–70` `skill_mastered()`, `79–87` `skill_combos()` | Builds each skill's card from `skills.json` (`summary`, `slot`, voice lines, `epccg.*`) and `perks.json` (perk tier texts, the Mastered perk, combos) | No change, unless the Call or the per-point line should be on the card: then add fields here. |
| `build.py:302–328` `build_web()` | Writes `apps/web/src/game/protodata.json` (tracked in git) on `python3 design/canvas-build/build.py --web` | **Run it after every `skills.json` or `perks.json` change and commit the result.** No npm script or CI step runs it. Don't run it without `--web`: that rebuilds the paused canvas. |
| `apps/web/src/screens/shared.js:96–116` (EPCCG pop-up) | The only mechanical line per skill: `['EFFECT', e.effect]` (113), from `epccg.effect`; perks as `t1`/`t2` (103); note at 105 | `epccg.effect` is hand-written and stale for every moved number (for example sensory "Heal/Shield received bonus", charisma "Brain Debuff save roll", proficiency "Sigil Draw Core reduction"). Rewrite all 27, or switch the row to `per_point.text`. |
| `apps/web/src/screens/create.js:322` | Skill step detail: name, attribute, modifier, `summary`, voice line | Add the gamma's Call here if the sheet is to show it at creation. |
| `create.js:434–438` | Lock-in stats **computed in the client**: Saves as `MD('guts') / MD('charisma') / MD('composure')` (437), Initiative (435), Defense, healing from camaraderie | 437 must become rumination and lore_master. Better to call the engine's functions than keep a second copy. |
| `apps/web/src/screens/main.js:367–369` | Sheet STATUS tab: Brain save `mod(P('charisma'))`, Heart save `mod(P('composure'))`, hard-coded | Same fix. |
| `main.js:346–347`; `apps/web/src/templates/main.template.html:64–65` | Sheet tabs SKILLS, STATUS, PERKS, GEAR, MAGIC, FAITH; the row already has `flex-wrap: wrap` | Section 16.2's wrap is already true for this row; check it with ARMS added. |
| `main.js:382–388`; `main.template.html:114–131` | PERKS tab: traits, perks (tier text from engine `PERK`), class moves, with "Engine runs it / Narrator rules it" badges (`badgeOf`, 379) | "The Calls on the sheet": a new block here or on SKILLS: name, level, cost, voice range, step text. Build it from an engine function, not in the screen. |
| `apps/web/src/screens/levelup.js:26`, `95`, `116–117` | Perk steps from engine `PERKS`; the "brings" line names the unlock at 3 and 5 | For a gamma, add what the next point brings on the ladder. |
| `apps/web/src/narrator/context.ts:307–318` | The Narrator's brief of skill unlocks and techniques | The Calls brief and the gamma rule (Narrator area; listed as a coupling). |

#### 3.2 The fight panel

| Where | Today | Needs |
|---|---|---|
| `apps/web/src/game/commands.ts:23` `TAB_NAME` | Eight tabs: move, attack, utility, perks, class, sigils, outbursts, faith | Add `calls: 'Calls'`. |
| `commands.ts:132–214` `actionGroups()` | The one action list; groups pushed in tab order; each item `[id, label, cost, text, why]`. No talk item. Faith is pushed last (209–210). | Push a CALLS group after Faith, only for a unit with a gamma at 1+, built from the engine's `callPad(cb, u, g)`. Give ids a prefix (as `pk:` at 41 and `pr:` at 27) and a parser. |
| `commands.ts:211–214` | Filters by `allowedActions` and `noNarrator` | Call ids aren't in a drone's list, so they drop out. Fine. |
| `commands.ts:221–250` `whyNot()` | The turn card's quick reason; parses "N AP" from the cost text; 236 lets `pk:` and `pr:` carry the engine's reason | Add the Calls prefix at 236. A Brief'd unit would be greyed here without the credit function. |
| `apps/web/src/game/commandsDialog.tsx:105` | The customise dialog groups by `TAB_NAME` | Follows. |
| `apps/web/src/templates/combat.template.html:208–210` | Tab row: `display: flex; overflow-x: auto; scrollbar-width: none`. It scrolls sideways with a hidden scrollbar. | Section 16.2: wrap to a second line, no sideways scroll. |
| `apps/web/src/screens/combat.js:141`, `143`, `158` | Tab CSS; `min-height: 30px` on short windows | The height rule (comments at 147–149 and 1188: about 320–520 px for the turn box) assumes one row. A second row takes about 32–40 px from the tab panel. |
| `combat.js:216–218` `TAB_INK` | Inks for attack, sigils, outbursts | An ink for calls, or neutral. |
| `combat.js:360–372` `numKey`; `1108–1110` | Keys `1–6` only (`/^[1-6]$/`, `i < 6`) | Nine tabs need 1–9. |
| `combat.js:346–358` `setTab`, `tabKey` | Arrow keys, Home, End, wrapping, by index | Works across two lines; Up and Down are not handled. |
| `combat.js:1084–1112` | Tabs from `groups`; default tab; count per tab | Follows. |
| `combat.js:568`, `679`, `703–726`, `1063–1069`, `1235–1236`, `1272–1310` | Target picking and Confirm are per action id (`ATTACKS`, `RED_ACTS`, `hasTarget`, tile clicks, `confirm`). **Ally targeting exists only for `stim` and for perk actions.** | Calls aim at an ally, an enemy, yourself, or an ally plus a tile. The closest pattern is the perk action flow (`pkE`, `pkPv`, `previewPerkAction`). Range tint comes from the engine's voice range. |
| `apps/web/src/game/fx/play.ts:1172` | Fx kinds get playback times by `case` | A `'call'` event needs a case and a look. No icons (15); a voice ring in SVG or CSS is allowed. |
| `apps/web/src/game/turnIntro.tsx` | The four quick commands come from `actionGroups` | Calls become pickable there. |

#### 3.3 Tests that pin today's behaviour

**Engine (`packages/engine/test/`):**

| File and test | Pins |
|---|---|
| `subsystems.test.ts:325` "…a parley from the reducer costs 2 AP" | `combat/parley` threaten at 2 AP |
| `perks-g.test.ts:132` "combat: a threat heard by 3+ enemies is one roll for all of them" | Crowd-Pleaser on `kind: 'threaten'`, the Body save |
| `perks-e.test.ts:101` "the fight's Persuade (a non-caster) feeds it" | Persuade stays |
| `perks-f.test.ts:40` "I: 2 AP, an enemy in earshot who sees you: Heart save or Shaken…" | Bone Talk uses `HEARING` and the Heart debuff |
| `subsystems.test.ts:38`, `:53` | Fear and Taunted rules; Shaken; every PC has saves |
| `subsystems.test.ts:129` "one reaction a round, more from items; none while Suppressed" | The `'reactions'` stat |
| `classes-i.test.ts:137` "Draw Fire: …Taunted (no save); a boss is not…" | Taunted and the boss exception |
| `completeness-c.test.ts:224`, `completeness-d2.test.ts:262` (Rabbit's Foot) | `ignoreTaunt` |
| `perks-e.test.ts:251`, `:550`; `completeness-c.test.ts:44`; `completeness-d2.test.ts:139` | Hand-Off's AP gift and `ap_gift` refusal (15.7 replaces Hand-Off) |
| `completeness-b.test.ts:131`, `:185`, `:199`, `:206` | Into the Dark, Used to the Pain, Rally Cry, Walking Wounded (15.7) |
| `classes-rev3-moves.test.ts:342` "Rally: allies within 4 heal…" | The class move already named Rally |
| `perks-a.test.ts:138`, `:156`; `completeness-a.test.ts:122`, `:135`, `:141`; `completeness-a2.test.ts:131` | Grapple and Breaching Strike (15.2) |
| `sigil14-batch2.test.ts:125` | Proven Formula's AP discount (15.5) |
| `completeness-d2.test.ts:212` "Old School: equipping…" | Puts a core rifle in the main hand with proficiency 5 and dexterity 5: passes under either gate |
| `phys-core.test.ts:255` | Uses `bot_thread_banner` set straight on the unit: no gate involved |

No engine test checks a `requires` refusal message for the three re-gated weapons.

**Client (`apps/web`):**

| File and test | Pins |
|---|---|
| `src/screens/combat-screen.test.ts:116` "action tabs: one per family…" | Tabs exactly `['move', 'attack', 'utility']` for its fighter: breaks if that character has a gamma point and Calls show. Line 117 pins the count per tab. |
| `e2e/tabs.mjs:83–96` | Key 5 opens `outbursts`; End lands on `outbursts`; the panel is labelled `phc-tab-outbursts`. A Calls tab on the Proving Ground character moves End. |
| `e2e/tabs.mjs:62–77`, `127–141` | Grid and Confirm in view with page scroll ≤ 1 px on every tab at 1440×900 and 1280×720; the narrow layout at 900×800. This is the height check 16.2 names. It doesn't check wrapping or build a nine-tab character. |
| `src/game/turnIntro.test.ts:83–92`, `107`, `140–142` | The smart four commands, and the catalogue equal to `actionGroups` flattened |
| `src/game/commands-perks.test.ts:29–76`; `classMoves.test.ts:85–96`; `heartView.test.ts:130`; `ground.test.ts:127`; `backpack.test.ts:108` | Group ids by tab (`gr[3]`). A new group at the end is safe. |

No client test pins skill text, `epccg.effect`, the saves rows (`main.js:368`, `create.js:437`) or `protodata.json`. Nothing fails when it is stale.

---

### 4. Traps

**T1. Threaten's save is contradictory.** 10.2 says Body; 13.4 says "the save its condition belongs to", and Shaken is a heart condition (`magic.ts:93`). Today's code uses Body (`tactics.ts:181`, `perks/g.ts:210`). Whichever is chosen, both places and the test at `perks-g.test.ts:132` move together. Also decide whether `combat/parley kind: 'threaten'` is removed or kept as an alias.

**T2. `HEARING = 8` is used by eight other files** (`perks/d.ts:1020`, `e.ts:470`, `f.ts:78, 88, 572, 577`, `g.ts:197, 235, 243, 291`, `classes/rev3.ts:25`). The Calls' range by points is separate; 10.1.1 ("8 tiles, as Talk is today") is overridden by 10.5.

**T3. Name clashes** (all Call names are Suggested):
- Rally: a class move (`classes/rev3.ts:585`, `data/classes.json:1025`) and a weapon grant (`data/weapons.json:3255`).
- Steady: the Guts 3 unlock (`data/skills.json:666`) and the Outburst action "Steady the heart" (`combat/steady`, client id `steady`, `commands.ts:196`).
- Spot: a ranged technique (`data/techniques.json:1827`), the hook names `spot` and `spotted`, and `spotHidden`. 15.5's "Spotted for free" collides with the existing meaning (revealed from Hidden).
- Parley: the Charisma 5 unlock (`data/skills.json:2651`) is a before-the-fight Narrator action, not `combat/parley`.
- Brief: every registered item has a `brief:` field for the Narrator.

**T4. The `requires` check is main hand only.** A one-handed gated weapon goes in the off hand unchecked (`character.ts:967–972`), and a unit built with a weapon never checks. Moving the gates doesn't change that.

**T5. AP that can't be done as written.** Rally's "now" becomes next turn and shares the +3 cap. "Next action this round" for Brief and "second reaction this round" for Cue are worthless on an ally who has acted or has nothing to react to. Rule 10.1.4 contradicts Rally step 3. The turn ceiling of 9 is enforced only in `turnAp` and `grantPerkAp`.

**T6. Preview handlers must not change state.** `attack_preview` runs for every card, hover and AI plan (`combat.ts:799–802`). Use up Spot, Warn and Taunt marks only on a real attack. The enemy's intent line (`combat.ts:1806–1830`) reads previews with a fresh 6 AP: an AI Call must plan purely or the Trickster's Read will lie.

**T7. `charOfUnit` needs a bound game.** Every screen call into the Calls core must pass `g` as `techniquePad` does. A unit gets `held` items only when it has perks, traits, a class or skill unlocks (`combat.ts:369`), so the Calls must not hang on `held`.

**T8. Windows pause the enemy turn.** `enemyTurn` breaks on `cb.window` (`combat.ts:1738`). `closeWindow` knows nothing about `allowedActions`; a temporary list must be cleared when the window closes, and `allowedActions` also filters `weaponActions` (`combat.ts:1894`) and `usable` (`physical/core.ts:161`).

**T9. Silenced, Suppressed, Stunned.** Silenced today stops Sigils, Outbursts and prayers, not speech (`magic.ts:91`); On My Mark refuses a Silenced ally (`perks/e.ts:414`). Nothing says whether a Silenced unit may Call or a Stunned ally may be Ordered. `maxReactions` is 0 while Suppressed, so Cue and Order give nothing to a Suppressed ally.

**T10. The helped/hindered limit touches other items.** On My Mark, Supreme Command (`perks/e.ts:448`), The Voice (`e.ts:468`), Double Meaning (`perks/g.ts:235`), Bone Talk (`perks/f.ts:78`) and Verse (`f.ts:572`) are spoken actions that are not Calls. 15.5 says the Camaraderie perks count as the helping Call; 15.7 then removes their AP gifts. Only Many Hands' shared reaction is left to decide.

**T11. Don't touch:**
- `combat.ts:1122–1133` (Commanded).
- `trySurrender`'s once-a-fight rule.
- `initiativeBonus`, Detection, Vision, `u.vigilant`, `u.sensory` (15.1 keeps them).
- `spotHidden` (`tactics.ts:125–138`): the end-of-turn roll with Vigilant is not the Spot Call.
- `design/canvas/` and the `*.logic.js` files in `design/canvas-build/` (the canvas is paused; `combat.logic.js:19` still lists a Parley button).

**T12. Enemies have no gamma points.** Their Call level, voice range, cost and TN need data.

**T13. Line numbers.** `game.ts`, `combat.ts`, `physical/core.ts`, `combat.js` and `commands.ts` will all be changed by the Physical 2.0 merge (the Attack tab pad, ARMS, fx kinds, likely the key handling). Take the client pad's final shape from lane C's result note after the merge, not from this map.
