# 01. The number scale (the 0.34 rebalance, design phase; second draft, 21 Nov 2026)

**For the lead.** Nothing here is built. Every proposed number is PROVISIONAL. This draft applies the lead's rulings (`00-rulings.md`, A1 to A10, B11, B12) and fixes the critics' findings that name this file (the table "Critics' findings" at the end). **This file owns every shared number** (the factor, the columns, the cards, HP, MP and the cost rule, a plate, armour, the grade ladder, Margins, the stack rule, the enemy columns and tier rows): the other six files quote them from here by the table or formula name, and type none of their own.

Every table below is printed by `tools/balance/scale.py` (it reads `data/*.json` and writes nothing): change a number in its `PROPOSAL` block and run it again (`PYTHONUTF8=1 python tools/balance/scale.py`, or one section: `today factor weapons digits columns cards hp costs plate grades margins top check caps`). Facts about today were read in data and code at the release branch's HEAD `d61ec6f13`.

Leon's ruling this file answers (the curve, section 17 item 2): *a hit is one or two digits at level 1, four at level 20, five for something super; you feel every level in the power of the hits, your HP, their HP, AP cost, mana cost; nothing is 100 HP because other games do it.*

## 0. What changed from the first draft, in short

1. **The cards follow A4:** every door attribute +10% a point above 1, every alpha +5% a point, **the two multiplied**; Agility's +10% goes to the Dexterity weapons (no hidden pin); each weapon row already names its pair (`phys.scales_with` x `phys.hits_with`), so no `blade` profile is needed; new data rows `bow`, `thrown`, `guard`.
2. **HP follows A5** (Pain Threshold +6% max HP a point), **MP follows A6** (04's pool on an `mp` column; Strain and every self-paid HP price a share of max HP), **Margins follow A7** (a quarter of the plain hit plus a point of Perception; the critical and its cap go), **the stack rule follows A8** (five multiplying terms, one sum), **grades follow A9** (Relic +3, foci and Devotion graded).
3. **Enemies (A3, item 10):** the columns are written for a stated attacker and a stated defender, smooth, level-free on the roll; tier rows are x0.6 with 06's Defense (8 / 9 / 11 / 14 / 15). hp_mult x140 and damage_mult x54 at level 20 (were x90 and x60), because the attacker now carries the ordinary sheet bonus and the multiplied cards.
4. **Level 1 stays two digits (A1):** five rows whose level-1 Fine hit would show three digits take a factor of their own (the three rocket tubes x0.3, the satchel x0.45, the arbalest x0.55), computed by the script; the two draw bows move their Raw Power onto the Stat term.
5. **The top of the scale is computed (A8, T11):** every door's plain hit and full cash-out at level 20; four doors need Bite or rule changes (Guard, Bonds, Shadow, Sigils) and 07's squad sum (+220%) must come down to each door's budget (the tightest, the Coup, +57%).

---

## 1. How the engine computes a hit today (checked in code and data)

**The one formula** (`packages/engine/src/effects/output.ts:4-7`, `data/rules.json` `output.formula`): `amount = (base + flat) x Stat x Level x own multipliers x (1 + target bonuses, capped at +100%)`, then `dealt = max(1, floor(amount) - armour)`.

| Term | Where the code builds it today | The data keys that carry it |
| --- | --- | --- |
| base | `combat.ts:1527` (`weaponDamage`) for a weapon; `amounts` blocks for everything else (`effects/amounts.ts`) | `weapons.json items[].damage`; every `amounts.<key>.base` and `per[]`; `sigils.json items[].damage / heal / shield`; `soul_modules.json damage.base` 37 (read by `magic.ts:752`); `patrons.json` effects' `value`; `conditions.json` ticks |
| Stat | `statTerm` (`output.ts:87-92`): `k x (1 + attr x (A - 1) + skill x S)`, **added**, summed over the pair; a weapon's pair is its row's (`weaponMult`, `character.ts:833-837`: `phys.scales_with` and `phys.hits_with` or `also_scales`); an enemy's Stat and Level are `Unit.lvlDmg` (`combat.ts:639`, `:711`) | `rules.json output.profiles`, `output.pairs`; `weapons.json items[].phys` |
| Level | `levelFactor` (`output.ts:111-117`); `scaleOf` (`:120`) for everything measured in HP (`character.ts:801` max HP, armour, `physical/core.ts:121` Guard's soak, objects) | `rules.json output.level.deal` (x7.5 at 20), `.scale` (x4.69), `.mend` (x11.97); `enemies.json levels.table` (`:214`) |
| own multipliers | `combat.ts:1536-1547`: rarity, technique, the melee factor (`MELEE_FACTOR`, `:46`, `:1537`), wear, ammunition, the critical (`critMult`, `character.ts:853-855`: 1.5 + 0.03 x (Perception - 1) + 0.02 x Dexterity, to 2.0), ambush, Weakened, Sharpened | `rules.json output.factors` (melee 1.35, thrown 0.7, figment 0.9); `rules.json rarity` (`dmg` 1 on every grade) |
| target bonuses | `stackDamage` (`output.ts:131-134`): added, held between -90% and `VS_CAP` +100% (`:129`) | items' `vs` pushes |
| armour | `armourAgainst` (`output.ts:208-214`) | `rules.json combat.armor.classes[].value` (0 / 5 / 10 / 15 / 20 / 25 / 18) x grade `arm` (1) x `scale`; `enemies.json items[].armour` x `armour_mult` |

What today's profiles really pay (T1): melee reads +0.05 a point of its Attribute and no skill; a gun +0.029 a point of Agility and no skill; Sigils, Outbursts and the elemental bonus read no slope at all, so Intelligence, Brain Power, Expression, Determination and Will Power add nothing to the damage their cards promise. HP is `round(scale(L) x (100 + 15 x (End - 1) + (L - 1) x (5 + 2 x PT)))` with every number typed in code (`character.ts:798`, `:801`). A heal reads `mend` (x11.97), which outgrew the bars (x9.1 for Endurance 1) by a third.

#### T1. Today: the output formula's terms as data holds them (rules.json output)

| profile | k | attr | skill | level column | pair (attrs ; skills) | floor | min_pct |
| --- | --- | --- | --- | --- | --- | --- | --- |
| physical | 1 | 0.1 | 0.05 | scale | strength ; raw_power |  |  |
| weapon | 1.5 | 0 | 0 | deal |  ;  |  |  |
| melee | 1.15385 | 0.05 | 0 | deal |  ;  |  |  |
| gun | 1.275 | 0.0294118 | 0 | deal |  ;  |  |  |
| sigil | 1.7 | 0 | 0 | deal | intelligence ; brain_power |  |  |
| elemental | 1 | 0 | 0 | scale | expression ; visualization |  |  |
| soul | 1.55 | 0 | 0 | deal | determination ; will_power |  |  |
| blessing | 0.956 | 0.06 | 0.06 | scale | virtue ; faith |  |  |
| healing | 1.392 | 0.06 | 0.06 | scale | insight ; empathy | 0.5 |  |
| mend | 1.392 | 0.06 | 0.06 | mend | insight ; empathy | 0.5 | 0.2 |
| sigil_mend | 1.629 | 0.06 | 0.06 | mend | intelligence ; brain_power | 0.5 | 0.2 |
| soul_mend | 1.296 | 0.06 | 0.06 | mend | determination ; will_power | 0.5 | 0.2 |
| blessing_mend | 1.44 | 0.06 | 0.06 | mend | virtue ; faith | 0.5 | 0.1333 |
| flat | 1 | 0 | 0 | deal |  ;  |  |  |
| figment | 1.5 | 0 | 0 | deal | expression ; visualization |  |  |
| figment_hp | 0.35 | 0 | 0.15 | None |  ; visualization |  |  |
| repair | 1.392 | 0.06 | 0.06 | mend | expression ; proficiency | 0.5 |  |
| tend | 3.74 | 0.06 | 0.06 | mend | insight ; empathy | 0.5 | 0.2 |

factors: melee 1.35, thrown 0.7, figment 0.9

| level | deal | scale | mend |
| --- | --- | --- | --- |
| 1 | 1.0 | 1.0 | 1.0 |
| 5 | 1.5284 | 1.2736 | 1.5054 |
| 10 | 2.5972 | 1.7708 | 2.5322 |
| 15 | 4.4135 | 2.7584 | 5.3265 |
| 20 | 7.5 | 4.6875 | 11.9672 |

| level | hp_mult | armour_mult | damage_mult | defense_plus | attack_plus |
| --- | --- | --- | --- | --- | --- |
| 1 | 1.0 | 1.0 | 1.0 | 0 | 0 |
| 5 | 1.6557 | 1.5283 | 1.401 | 2 | 0 |
| 10 | 2.851 | 2.6031 | 2.2666 | 4 | 2 |
| 15 | 4.9375 | 4.4134 | 4.2204 | 6 | 4 |
| 20 | 8.4844 | 7.5 | 8.5312 | 6 | 6 |


Three places today that would leave numbers on the old scale whatever the columns say (each a "must change" in the Built-from table):

- **A thrown blast, a barrel, a trap and a hazard read no level** (`tactics.ts:433-435`, `perks/c.ts:485`: `w.damage x factors.thrown`; `combat.ts:889-893`: `explodes.damage`; all through `hurtUnit`, `combat.ts:859`, which takes the number as given). A frag deals the same at level 20 as at 1.
- **Figments grow their HP by the enemy HP column** (`figments.json:18` `level.hp: ["hp_mult"]`), not by what hits them.
- **The heal gate counts to `gate.hp` x scale** (`output.ts:264`; `rules.json mending.gate.hp` 145, the old reference character), not to a bar at that level.

## 2. The factor x0.6 (ruling A1)

**One factor, x0.6, on every flat number** of damage, HP, healing, shields, armour, soak, plates, cover, hazards, damage over time, enemy HP and items. *Reason a player sees: damage and HP move together, so every count of hits to drop a foe, to drop you and to heal you stays what it is today for a character who spread its points; only the changes this bible names move a count.*

Rounding: a weapon row half up to a whole number, never under 1; an `amounts` base to two places (the formula floors at the end); any other whole number of 10 or more to a whole number, smaller ones to two places. **No row is bumped** to keep a strict order: 18 pairs of rows in one category meet on one new number (T3), each under a tenth apart today, a gap no player could feel.

**Not touched by the factor:** every share and every count (listed under T2). **Moved by another rule, named here:** a self-paid HP price becomes a share of max HP (section 6); an enemy tier's damage factor x1.28 (section 3.4); the two per-level HP numbers of traits leave with A5 (07 restates them as shares); the five rows of T3b's last table take a factor of their own (below).

**Level 1 stays one or two digits (A1).** At x0.6 a level-1 specialist (7 and 7) holding a Fine weapon (Fine is found from map 1, ruling 25) would put three digits on screen with five rows. The rule, computed by the script and never typed: *such a row takes the largest step of 0.05 under 0.6 that keeps that hit two digits, one factor for the breaking rows of a category, so their order holds.* That gives the three rocket tubes x0.3, the satchel charge x0.45 and the arbalest x0.55. *Reason: a rocket is still the biggest single hit of a level-1 fight and still throws its splash; level 1 stays two digits as Leon asked.* One order changes in the `heavy` category: the siege tube (39) now hits its one target a point under the Blackpoint 700 (40), and adds its splash to everything near. PROVISIONAL.

**The two draw bows** (recurve and longbow, `base + per x raw_power` today) move their draw onto the Stat term (`phys.also_scales: [dexterity, raw_power]`, a key `weaponMult` already reads), and their row number is set so a normal share deals today's blow x0.6, the same pin as every profile's `k`. *Reason: with Agility and Dexterity now on every bow, the Raw Power in the base made a level-20 longbow shot five digits; on the Stat term a strong archer still draws harder, by the card's +5%.*

#### T2. The factor x0.6: every data file and key it applies to

| file | key | numbers | rule |
| --- | --- | --- | --- |
| weapons.json | items[].damage (a number, a within_4 / within_8 band, or a bow's base + per-point formula), items[].splash_damage | 144 | x0.6, half up; five rows x their own (T3b) |
| classes.json | amounts.*.base | 37 | x0.6 |
| classes.json | amounts.*.per[] (a part per Momentum, kg, charge, Guard, armour value...) | 6 | x0.6 |
| classes.json | effects[].value (op heal / shield / damage / stat_mod hp) | 3 | x0.6 |
| classes.json | hp | 2 | x0.6 |
| conditions.json | amounts.*.base | 7 | x0.6 |
| conditions.json | effects[].value (op heal / shield / damage / stat_mod hp) | 3 | x0.6 |
| effect_ops.json | base | 2 | x0.6 |
| effect_ops.json | value | 1 | x0.6 |
| effect_ops.json | hp | 1 | x0.6 |
| effect_ops.json | damage | 1 | x0.6 |
| enemies.json | hp | 8 | x0.6 |
| enemies.json | armour | 4 | x0.6 |
| feelings.json | damage | 2 | x0.6 |
| feelings.json | heal | 2 | x0.6 |
| feelings.json | items[shame].pour.self_damage | 1 | a share of max HP (section 6) |
| feelings.json | price.hp_per_step | 1 | a share of max HP (section 6) |
| figments.json | hp | 11 | x0.6 |
| figments.json | armour | 5 | x0.6 |
| figments.json | amounts.*.base | 3 | x0.6 |
| forks.json | amounts.*.base | 3 | x0.6 |
| items.json | melee_damage | 1 | x0.6 |
| objects.json | hp | 13 | x0.6 |
| objects.json | damage | 4 | x0.6 |
| patrons.json | effects[].value (op heal / shield / damage / stat_mod hp) | 17 | x0.6 |
| patrons.json | boss_damage | 1 | x0.6 |
| perks.json | amounts.*.base | 3 | x0.6 |
| perks.json | amounts.*.per[] (a part per Momentum, kg, charge, Guard, armour value...) | 1 | x0.6 |
| rules.json | hp | 2 | x0.6 |
| rules.json | mana.sigil.flux.overload.damage_per_flux_over | 1 | a share of max HP (section 6) |
| rules.json | damage | 1 | x0.6 |
| rules.json | output.amounts.flux_overload.damage.per[0](flux_over) | 1 | a share of max HP (section 6) |
| rules.json | base | 1 | x0.6 |
| shadow.json | amounts.*.base | 1 | x0.6 |
| sigils.json | damage | 8 | x0.6 |
| sigils.json | shield | 1 | x0.6 |
| sigils.json | shield_enemy | 1 | x0.6 |
| sigils.json | heal | 1 | x0.6 |
| sigils.json | heal_enemy | 1 | x0.6 |
| sigils.json | hp | 2 | x0.6 |
| soul_modules.json | strain.burn_per_point | 1 | a share of max HP (section 6) |
| soul_modules.json | tick_damage | 1 | x0.6 |
| soul_modules.json | damage | 1 | x0.6 |
| soul_modules.json | heal | 1 | x0.6 |
| soul_modules.json | heal_enemy | 1 | x0.6 |
| soul_modules.json | shield | 2 | x0.6 |
| soul_modules.json | tick | 1 | x0.6 |
| techniques.json | soak | 1 | x0.6 |
| tending.json | amounts.*.base | 5 | x0.6 |
| traits.json | amounts.*.base | 1 | x0.6 |
| traits.json | amounts.*.per[] (a part per Momentum, kg, charge, Guard, armour value...) | 3 | x0.6 |
| traits.json | items[oil_in_my_mind].effects[4].derived.hp_per_level | 1 | restated by 07 |
| traits.json | items[oil_in_my_soul].effects[4].derived.hp_per_level | 1 | restated by 07 |
| traits.json | hp_per_point | 1 | x0.6 |
| traits.json | hp | 2 | x0.6 |
| traits.json | items[crawler_blooded].amounts.blessing_burn.base | 1 | a share of max HP (section 6) |
| rules.json | combat.armor.classes[].value | 7 | x0.6 |
| rules.json | combat.attack.cover.half.hp, .full.hp | 2 | x0.6 |
| rules.json | mending.gate.hp (the normal bar the heal gate counts to) | 1 | becomes the normal bar at level 1 (section 3.1) |
| soul_modules.json | damage.base, damage.enemy_base | 2 | x0.6 |
| patrons.json | prayer.intervention.amount.base, .per_devotion | 2 | x0.6 |
| enemies.json | items[].damage (a tier's damage factor, not HP) | 5 | x1.28 (section 3.4) |

Not touched by the factor: every share (`*_pct`, `*_share`, `*_mult`, `hp_frac`, `min_pct`, `cap_pct`, `stim_pct`, a `per[]` of `event:*`, `self:max_hp`, `max_hp`, `res:ledger`, `damage`) and every count (plates, pips, Shadow, glyphs, charge, cores, Flux, Strain, Echo, Devotion, AP).

#### T2b. Every number the factor moves outside weapons.json (188), today and new

| file | path | today | new |
| --- | --- | --- | --- |
| classes.json | .base[fighter].gain[launch].amounts.launch.base | 22 | 13 |
| classes.json | .base[fighter].gain[launch].amounts.launch.per[0](res:momentum) | 5.5 | 3.3 |
| classes.json | .base[fighter].gain[into_the_wall].amounts.slam.base | 12 | 7.2 |
| classes.json | .base[fighter].gain[hurl].amounts.hurl.base | 10 | 6.0 |
| classes.json | .base[fighter].gain[hurl].amounts.hurl.per[0](kg) | 0.25 | 0.15 |
| classes.json | .base[trickster].ranks.II.moves[overclock].amounts.strain.base | 5 | 3.0 |
| classes.json | .base[bard].ranks.I.moves[ledger].amounts.cap.base | 6.5 | 3.9 |
| classes.json | .base[bard].ranks.III.moves[rally].amounts.heal.base | 3.1 | 1.86 |
| classes.json | .base[guardian].ranks.I.moves[ward].amounts.ward.base | 10 | 6.0 |
| classes.json | .base[guardian].ranks.I.moves[smite].amounts.smite.base | 20 | 12 |
| classes.json | .base[guardian].ranks.I.moves[smite].amounts.smite_storm.base | 20 | 12 |
| classes.json | .base[guardian].gain[amen].amounts.amen.base | 10 | 6.0 |
| classes.json | .move_pool.moves[triage].amounts.heal.base | 4.3 | 2.58 |
| classes.json | .move_pool.moves[ward].amounts.shield.per[0](charge) | 10 | 6.0 |
| classes.json | .move_pool.moves[rewrite].amounts.shield_turned.base | 30 | 18 |
| classes.json | .move_pool.moves[sanctuary].amounts.sanctuary_cap.base | 40 | 24 |
| classes.json | .move_pool.moves[inspire].amounts.love.base | 1.9 | 1.14 |
| classes.json | .move_pool.moves[field_fix].amounts.repair.base | 15 | 9.0 |
| classes.json | .advanced[banner_dancer].moves[rally_banner].amounts.shield.base | 10 | 6.0 |
| classes.json | .advanced[banner_dancer].moves[rally_banner].effects[0].value | 10 | 6.0 |
| classes.json | .advanced[banner_dancer].moves[sweep].amounts.heal.base | 10 | 6.0 |
| classes.json | .advanced[banner_dancer].moves[sweep].effects[1].value | 10 | 6.0 |
| classes.json | .advanced[rtc_contractor].moves[strike_call].amounts.damage.base | 50 | 30 |
| classes.json | .advanced[siege_engineer].moves[deploy_cover].effects[0].hp | 40 | 24 |
| classes.json | .advanced[siege_engineer].moves[sentry_turret].amounts.damage.base | 20 | 12 |
| classes.json | .advanced[siege_engineer].moves[sentry_turret].effects[0].hp | 40 | 24 |
| classes.json | .advanced[storm_hand].moves[gauntlet_infusion].amounts.damage.base | 10 | 6.0 |
| classes.json | .advanced[storm_hand].moves[gauntlet_infusion].amounts.fire_extra.base | 5 | 3.0 |
| classes.json | .advanced[storm_hand].moves[gauntlet_infusion].amounts.arc.base | 5 | 3.0 |
| classes.json | .advanced[storm_hand].moves[discharge].amounts.damage.per[0](charge) | 20 | 12 |
| classes.json | .advanced[adamantile_knight].moves[adamantile_plate].amounts.shield.per[0](guard) | 10 | 6.0 |
| classes.json | .advanced[adamantile_knight].moves[bulwark_of_will].amounts.shield.base | 20 | 12 |
| classes.json | .advanced[adamantile_knight].moves[bulwark_of_will].effects[0].value | 20 | 12 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.lava.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.storm.base | 15 | 9.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.dome.base | 20 | 12 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.mend.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.crush.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.tripwire.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.mortar.base | 15 | 9.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.mortar_splash.base | 5 | 3.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.sentinel.base | 15 | 9.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.sentinel_leaving.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.bloodwell.base | 5 | 3.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.arc.base | 10 | 6.0 |
| classes.json | .advanced[grand_sigilist].moves[enlarge].amounts.bloom.base | 10 | 6.0 |
| classes.json | .advanced[vessel].moves[inner_charge].amounts.heartbeat.per[0](forms) | 10 | 6.0 |
| classes.json | .advanced[vessel].moves[release_strike].amounts.damage.base | 15 | 9.0 |
| conditions.json | .items[bleeding].amounts.tick.base | 5 | 3.0 |
| conditions.json | .items[bleeding].effects[0].value | -5 | -3.0 |
| conditions.json | .items[burning].amounts.tick.base | 10 | 6.0 |
| conditions.json | .items[burning].effects[0].value | -10 | -6.0 |
| conditions.json | .items[corroded].amounts.tick.base | 5 | 3.0 |
| conditions.json | .items[corroded].effects[0].value | -5 | -3.0 |
| conditions.json | .items[given_spite].amounts.spite.base | 6 | 3.6 |
| conditions.json | .items[foe_spite].amounts.spite.base | 6 | 3.6 |
| conditions.json | .items[given_shame].amounts.shame.base | 8 | 4.8 |
| conditions.json | .items[foe_shame].amounts.shame.base | 8 | 4.8 |
| effect_ops.json | .items[deal].example.amount.base | 30 | 18 |
| effect_ops.json | .items[mend].example.amount.base | 5 | 3.0 |
| effect_ops.json | .items[heal].example.value | 20 | 12 |
| effect_ops.json | .items[companion].example.hp | 30 | 18 |
| effect_ops.json | .items[rig_tile].example.damage | 30 | 18 |
| enemies.json | .items[vermin].hp | 15 | 9.0 |
| enemies.json | .items[minion].hp | 70 | 42 |
| enemies.json | .items[soldier].hp | 140 | 84 |
| enemies.json | .items[soldier].armour | 5 | 3.0 |
| enemies.json | .items[elite].hp | 240 | 144 |
| enemies.json | .items[elite].armour | 10 | 6.0 |
| enemies.json | .items[boss].hp | 820 | 492 |
| enemies.json | .items[boss].armour | 10 | 6.0 |
| enemies.json | .companions[drone].hp | 30 | 18 |
| enemies.json | .companions[drone].armour | 5 | 3.0 |
| enemies.json | .companions[beast].hp | 60 | 36 |
| enemies.json | .companions[twin].hp | 50 | 30 |
| feelings.json | .items[rage].residue.damage | 5 | 3.0 |
| feelings.json | .items[love].residue.heal | 5 | 3.0 |
| feelings.json | .items[spite].residue.damage | 5 | 3.0 |
| feelings.json | .items[shame].pour.self_damage | 8 | 6% of max HP |
| feelings.json | .items[guilt].residue.heal | 5 | 3.0 |
| feelings.json | .price.hp_per_step | 8 | 6% of max HP |
| figments.json | .forms[double].hp | 30 | 18 |
| figments.json | .forms[eye].hp | 15 | 9.0 |
| figments.json | .forms[wall].hp | 60 | 36 |
| figments.json | .forms[wall].armour | 5 | 3.0 |
| figments.json | .forms[beast].hp | 45 | 27 |
| figments.json | .forms[beast].armour | 3 | 1.8 |
| figments.json | .forms[blade].hp | 25 | 15 |
| figments.json | .forms[snare].hp | 10 | 6.0 |
| figments.json | .forms[hand].hp | 20 | 12 |
| figments.json | .forms[ward].hp | 40 | 24 |
| figments.json | .forms[ward].armour | 3 | 1.8 |
| figments.json | .forms[husk].hp | 20 | 12 |
| figments.json | .forms[sentinel].hp | 30 | 18 |
| figments.json | .forms[sentinel].armour | 3 | 1.8 |
| figments.json | .turret.hp | 40 | 24 |
| figments.json | .turret.armour | 5 | 3.0 |
| figments.json | .verbs[figment_burst].amounts.burst.base | 20 | 12 |
| figments.json | .traits[volatile].amounts.burst.base | 20 | 12 |
| figments.json | .traits[barbed].amounts.barb.base | 10 | 6.0 |
| forks.json | .items[fork.tend.shared_pulse].amounts.pulse.base | 0.9375 | 0.56 |
| forks.json | .items[fork.momentum.spill].amounts.spill.base | 22 | 13 |
| forks.json | .items[fork.sigil.clean_vent].amounts.scorch.base | 6 | 3.6 |
| items.json | .items[mod_bayonet].melee_damage | 15 | 9.0 |
| objects.json | .items[crate].hp | 30 | 18 |
| objects.json | .items[low_wall].hp | 60 | 36 |
| objects.json | .items[pillar].hp | 80 | 48 |
| objects.json | .items[barricade].hp | 60 | 36 |
| objects.json | .items[door].hp | 40 | 24 |
| objects.json | .items[trap].trap.damage | 25 | 15 |
| objects.json | .items[fire].hazard.damage | 10 | 6.0 |
| objects.json | .items[toxic].hazard.damage | 8 | 4.8 |
| objects.json | .items[barrel].hp | 20 | 12 |
| objects.json | .items[barrel].explodes.damage | 40 | 24 |
| objects.json | .items[container].hp | 40 | 24 |
| objects.json | .items[terminal].hp | 30 | 18 |
| objects.json | .items[lamp].hp | 10 | 6.0 |
| objects.json | .items[camera].hp | 10 | 6.0 |
| objects.json | .items[alarm].hp | 10 | 6.0 |
| objects.json | .items[turret].hp | 60 | 36 |
| objects.json | .items[sigil_wall].hp | 30 | 18 |
| patrons.json | .whispers[health].effects[0].value | 8.5 | 5.1 |
| patrons.json | .whispers[protection].effects[0].value | 10 | 6.0 |
| patrons.json | .whispers[rebuke].effects[0].value | -20 | -12 |
| patrons.json | .items[nerukhan].intervention.effects[0].value | -20 | -12 |
| patrons.json | .items[nerukhan].hymns[saints_shield].effects[0].value | 34 | 20 |
| patrons.json | .items[nerukhan].hymns[judgement].effects[0].value | -56 | -34 |
| patrons.json | .items[nerukhan].hymns[absolution].effects[1].value | 19 | 11 |
| patrons.json | .items[nerukhan].miracle.effects[0].value | -130 | -78 |
| patrons.json | .items[toll_keeper].hymns[coin_for_the_ferry].effects[0].value | 11 | 6.6 |
| patrons.json | .items[toll_keeper].hymns[last_crossing].effects[0].boss_damage | 40 | 24 |
| patrons.json | .items[mother_ember].intervention.effects[0].value | 7 | 4.2 |
| patrons.json | .items[mother_ember].hymns[warm_hands].effects[0].value | 28 | 17 |
| patrons.json | .items[mother_ember].hymns[hearthlight].effects[0].effects[0].value | 9 | 5.4 |
| patrons.json | .items[mother_ember].miracle.effects[2].value | 17 | 10 |
| patrons.json | .items[old_overcast].intervention.effects[0].value | -20 | -12 |
| patrons.json | .items[old_overcast].hymns[thunderclap].effects[0].value | -20 | -12 |
| patrons.json | .items[old_overcast].hymns[lightning_rod].effects[0].value | -56 | -34 |
| patrons.json | .items[old_overcast].miracle.effects[0].value | -150 | -90 |
| perks.json | .items[field_repair].amounts.repair.base | 15 | 9.0 |
| perks.json | .items[nobody_left_behind].amounts.heal.base | 1.9 | 1.14 |
| perks.json | .items[last_charge].amounts.shield.base | 15 | 9.0 |
| perks.json | .items[last_charge].amounts.shield_by_armour.per[0](armour_value) | 3 | 1.8 |
| rules.json | .combat.attack.cover.half.hp | 30 | 18 |
| rules.json | .combat.attack.cover.full.hp | 80 | 48 |
| rules.json | .mana.sigil.flux.overload.damage_per_flux_over | 10 | 7% of max HP |
| rules.json | .mana.sigil.example.damage | 26 | 16 |
| rules.json | .output.amounts.flux_overload.damage.per[0](flux_over) | 10 | 7% of max HP |
| rules.json | .output.amounts.school_rider.heal.base | 30 | 18 |
| shadow.json | .items[shadow.rig].amounts.rig.base | 25 | 15 |
| sigils.json | .example.damage | 26 | 16 |
| sigils.json | .items[fire].damage | 30 | 18 |
| sigils.json | .items[freeze].damage | 25 | 15 |
| sigils.json | .items[shock].damage | 30 | 18 |
| sigils.json | .items[stone].damage | 35 | 21 |
| sigils.json | .items[gale].damage | 15 | 9.0 |
| sigils.json | .items[spark].damage | 15 | 9.0 |
| sigils.json | .items[acid].damage | 15 | 9.0 |
| sigils.json | .items[ward].shield | 4.3 | 2.58 |
| sigils.json | .items[ward].shield_enemy | 30 | 18 |
| sigils.json | .items[mend].heal | 15 | 9.0 |
| sigils.json | .items[mend].heal_enemy | 25 | 15 |
| sigils.json | .items[raise].barrier.hp | 30 | 18 |
| sigils.json | .items[watch].hp | 10 | 6.0 |
| soul_modules.json | .strain.burn_per_point | 8 | 6% of max HP |
| soul_modules.json | .aura.tick_damage | 5 | 3.0 |
| soul_modules.json | .schools[damage].damage | 40 | 24 |
| soul_modules.json | .schools[buff].heal | 11.3 | 6.78 |
| soul_modules.json | .schools[buff].heal_enemy | 30 | 18 |
| soul_modules.json | .items[inverse].shield | 7 | 4.2 |
| soul_modules.json | .items[shell].shield | 4 | 2.4 |
| soul_modules.json | .items[linger].tick | 5 | 3.0 |
| techniques.json | .rules.guard.soak | 6 | 3.6 |
| tending.json | .items[tend.snap].amounts.snap.base | 3.0 | 1.8 |
| tending.json | .items[tend.snap].amounts.snap_heal.base | 3.0 | 1.8 |
| tending.json | .items[tend.mend].amounts.heal.base | 3.75 | 2.25 |
| tending.json | .items[tend.mend_self].amounts.heal.base | 3.75 | 2.25 |
| tending.json | .items[tend.shield].amounts.shield.base | 4.5 | 2.7 |
| traits.json | .items[grenadiers_arm].amounts.damage.base | 10 | 6.0 |
| traits.json | .items[grenadiers_arm].amounts.damage.per[0](kg) | 0.25 | 0.15 |
| traits.json | .items[oil_in_my_mind].effects[4].derived.hp_per_level | -2 | 07 restates (a share of max HP) |
| traits.json | .items[oil_in_my_soul].effects[4].derived.hp_per_level | -2 | 07 restates (a share of max HP) |
| traits.json | .items[factory_made].amounts.repair.per[0](improvisation) | 10 | 6.0 |
| traits.json | .items[factory_made].effects[3].hp_per_point | 10 | 6.0 |
| traits.json | .items[drone_handler].amounts.repair.per[0](mastery) | 10 | 6.0 |
| traits.json | .items[drone_handler].effects[drone].hp | 30 | 18 |
| traits.json | .items[crawler_blooded].amounts.blessing_burn.base | 10 | 7% of max HP |
| traits.json | .items[beast_handler].effects[beast].hp | 60 | 36 |


#### T3. Every weapon row: damage today and new (x0.6 half up; the rows of the last table of T3b x their own), and its profile

| category | id | damage today | damage new | factor | profile today | profile new | pair the row reads (scales_with x hits_with) |
| --- | --- | --- | --- | --- | --- | --- | --- |
| bow | recurve_bow | 20 + 5*raw_power | 21 | 0.6 | weapon | bow | agility x dexterity + raw_power (also_scales) |
| bow | repeating_crossbow | 22 | 13 | 0.6 | weapon | bow | agility x dexterity |
| bow | short_bow | 24 | 14 | 0.6 | weapon | bow | agility x dexterity |
| bow | longbow | 25 + 6*raw_power | 25 | 0.6 | weapon | bow | agility x dexterity + raw_power (also_scales) |
| bow | crossbow | 55 | 33 | 0.6 | weapon | bow | agility x dexterity |
| bow | arbalest | 72 | 40 | 0.55 | weapon | bow | agility x dexterity |
| heavy | breacher_tube | 110 | 33 | 0.3 | gun | gun | agility x dexterity |
| heavy | legion_siege_tube | 130 | 39 | 0.3 | gun | gun | agility x dexterity |
| heavy | lumeri_votive_torch | 16 | 10 | 0.6 | gun | gun | agility x dexterity |
| heavy | purifier_flamer | 20 | 12 | 0.6 | gun | gun | agility x dexterity |
| heavy | hellraiser_spinner | 20 | 12 | 0.6 | gun | gun | agility x dexterity |
| heavy | hellraiser_rotary | 22 | 13 | 0.6 | gun | gun | agility x dexterity |
| heavy | hellraiser_twin_rotary | 22 | 13 | 0.6 | gun | gun | agility x dexterity |
| heavy | lumeri_cathedral_burner | 24 | 14 | 0.6 | gun | gun | agility x dexterity |
| heavy | hellraiser_lmg | 25 | 15 | 0.6 | gun | gun | agility x dexterity |
| heavy | smetanita_snub_launcher | 36 | 22 | 0.6 | gun | gun | agility x dexterity |
| heavy | smetanita_thumper | 40 | 24 | 0.6 | gun | gun | agility x dexterity |
| heavy | smetanita_drum_launcher | 40 | 24 | 0.6 | gun | gun | agility x dexterity |
| heavy | blackpoint_carbine | 54 | 32 | 0.6 | gun | gun | agility x dexterity |
| heavy | blackpoint_700 | 66 | 40 | 0.6 | gun | gun | agility x dexterity |
| heavy | legion_throwaway_tube | 90 | 27 | 0.3 | gun | gun | agility x dexterity |
| heavy_melee | lance | 32 | 19 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | lowland_chopper | 33 | 20 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | kemizuchi_sword_breaker | 33 | 20 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | legion_rank_sword | 34 | 20 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | ork_machete | 35 | 21 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | glaive | 36 | 22 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | broadback_sabre | 36 | 22 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | ork_cleaver_glaive | 37 | 22 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | ork_rip_saw | 38 | 23 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | war_axe | 40 | 24 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | long_draw | 41 | 25 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | adamantile_greatsword | 42 | 25 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | maul | 45 | 27 | 0.6 | melee | melee | strength x raw_power |
| heavy_melee | ork_wreck_saw | 46 | 28 | 0.6 | melee | melee | strength x raw_power |
| light_melee | throwing_knives | 12 | 7 | 0.6 | melee | melee | agility x dexterity |
| light_melee | combat_knife | 15 | 9 | 0.6 | melee | melee | agility x dexterity |
| light_melee | afterword | 15 | 9 | 0.6 | melee | melee | agility x dexterity |
| light_melee | legion_leaf_dagger | 16 | 10 | 0.6 | melee | melee | agility x dexterity |
| light_melee | pitch_axe | 17 | 10 | 0.6 | melee | melee | agility x dexterity |
| light_melee | ork_skinner | 17 | 10 | 0.6 | melee | melee | agility x dexterity |
| light_melee | trench_knife | 18 | 11 | 0.6 | melee | melee | strength x dexterity |
| light_melee | short_draw | 18 | 11 | 0.6 | melee | melee | agility x dexterity |
| light_melee | war_pick | 18 | 11 | 0.6 | melee | melee | agility x dexterity |
| light_melee | legion_gladius | 19 | 11 | 0.6 | melee | melee | agility x dexterity |
| light_melee | kemizuchi_duelling_blade | 19 | 11 | 0.6 | melee | melee | agility x dexterity |
| light_melee | sabre | 20 | 12 | 0.6 | melee | melee | agility x dexterity |
| light_melee | katana | 20 | 12 | 0.6 | melee | melee | agility x dexterity |
| light_melee | dock_cutter | 21 | 13 | 0.6 | melee | melee | strength x dexterity |
| light_melee | kemizuchi_side_sword | 21 | 13 | 0.6 | melee | melee | strength x dexterity |
| light_melee | hatchet | 22 | 13 | 0.6 | melee | melee | strength x dexterity |
| light_melee | legion_spear | 22 | 13 | 0.6 | melee | melee | agility x dexterity |
| light_melee | ork_snarl_knife | 22 | 13 | 0.6 | melee | melee | agility x dexterity |
| light_melee | war_hammer | 23 | 14 | 0.6 | melee | melee | strength x dexterity |
| light_melee | adamantile_longsword | 23 | 14 | 0.6 | melee | melee | strength x dexterity |
| light_melee | adamantile_plate_needle | 24 | 14 | 0.6 | melee | melee | agility x dexterity |
| light_melee | throwing_javelins | 24 | 14 | 0.6 | melee | melee | agility x dexterity |
| light_melee | throwing_darts | 9 | 5 | 0.6 | melee | melee | agility x dexterity |
| mana | emanator_gauntlet | 18 | 11 | 0.6 | weapon | weapon | strength x raw_power |
| mana | spellslinger_pistol | 22 | 13 | 0.6 | weapon | weapon | agility x dexterity |
| mana | bot_thread_banner | 24 | 14 | 0.6 | weapon | weapon | agility x dexterity |
| mana | grand_staff | 24 | 14 | 0.6 | weapon | weapon | agility x dexterity |
| mana | evoker_blade | 26 | 16 | 0.6 | weapon | weapon | agility x dexterity |
| mana | emanator_katana | 26 | 16 | 0.6 | weapon | weapon | agility x dexterity |
| mana | core_rifle | 29 | 17 | 0.6 | weapon | weapon | agility x dexterity |
| mana | lumeri_censer_gun | {within_4: 30, within_8: 18} | {within_4: 18, within_8: 11} | 0.6 | weapon | weapon | agility x dexterity |
| pistol | whisper_pistol | 15 | 9 | 0.6 | gun | gun | agility x dexterity |
| pistol | smetanita_pocket_pistol | 15 | 9 | 0.6 | gun | gun | agility x dexterity |
| pistol | parlour_pistol | 16 | 10 | 0.6 | gun | gun | agility x dexterity |
| pistol | decrkm_autopistol | 17 | 10 | 0.6 | gun | gun | agility x dexterity |
| pistol | mandestra_drum_pistol | 18 | 11 | 0.6 | gun | gun | agility x dexterity |
| pistol | service_pistol | 20 | 12 | 0.6 | gun | gun | agility x dexterity |
| pistol | smetanita_service_pistol | 21 | 13 | 0.6 | gun | gun | agility x dexterity |
| pistol | magistrate_pistol | 26 | 16 | 0.6 | gun | gun | agility x dexterity |
| revolver | snub_revolver | 26 | 16 | 0.6 | gun | gun | agility x dexterity |
| revolver | drifter_revolver | 28 | 17 | 0.6 | gun | gun | agility x dexterity |
| revolver | smetanita_hand_cannon | 36 | 22 | 0.6 | gun | gun | agility x dexterity |
| revolver | frontier_hand_cannon | 38 | 23 | 0.6 | gun | gun | agility x dexterity |
| rifle | adcorp_short_carbine | 27 | 16 | 0.6 | gun | gun | agility x dexterity |
| rifle | legion_bullpup | 28 | 17 | 0.6 | gun | gun | agility x dexterity |
| rifle | hellraiser_trench_carbine | 28 | 17 | 0.6 | gun | gun | agility x dexterity |
| rifle | adamantile_carbine | 28 | 17 | 0.6 | gun | gun | agility x dexterity |
| rifle | hellraiser_service_rifle | 30 | 18 | 0.6 | gun | gun | agility x dexterity |
| rifle | adamantile_battle_rifle | 30 | 18 | 0.6 | gun | gun | agility x dexterity |
| rifle | adcorp_line_rifle | 30 | 18 | 0.6 | gun | gun | agility x dexterity |
| rifle | arsenal_piston_rifle | 30 | 18 | 0.6 | gun | gun | agility x dexterity |
| rifle | chezknov_battle_rifle | 31 | 19 | 0.6 | gun | gun | agility x dexterity |
| rifle | albert_town_brush_carbine | 31 | 19 | 0.6 | gun | gun | agility x dexterity |
| rifle | lever_carbine | 32 | 19 | 0.6 | gun | gun | agility x dexterity |
| rifle | legion_marksman_rifle | 32 | 19 | 0.6 | gun | gun | agility x dexterity |
| rifle | albert_town_service_rifle | 32 | 19 | 0.6 | gun | gun | agility x dexterity |
| rifle | ccec_marksman_rifle | 33 | 20 | 0.6 | gun | gun | agility x dexterity |
| rifle | adcorp_designated_rifle | 34 | 20 | 0.6 | gun | gun | agility x dexterity |
| rifle | chezknov_precision_rifle | 35 | 21 | 0.6 | gun | gun | agility x dexterity |
| rifle | adamantile_heavy_rifle | 36 | 22 | 0.6 | gun | gun | agility x dexterity |
| rifle | arsenal_heavy_rifle | 38 | 23 | 0.6 | gun | gun | agility x dexterity |
| rifle | albert_town_stalking_rifle | 44 | 26 | 0.6 | gun | gun | agility x dexterity |
| rifle | long_rifle | 47 | 28 | 0.6 | gun | gun | agility x dexterity |
| shield | deflector | 12 | 7 | 0.6 | melee | melee | endurance x durability |
| shield | buckler | 15 | 9 | 0.6 | melee | melee | endurance x durability |
| shield | bulwark_screen | 15 | 9 | 0.6 | melee | melee | endurance x durability |
| shield | barrier_wall | 15 | 9 | 0.6 | melee | melee | endurance x durability |
| shield | riot_shield | 20 | 12 | 0.6 | melee | melee | endurance x durability |
| shield | pavise | 20 | 12 | 0.6 | melee | melee | endurance x durability |
| shield | spiked_buckler | 20 | 12 | 0.6 | melee | melee | endurance x durability |
| shield | boss_shield | 25 | 15 | 0.6 | melee | melee | endurance x durability |
| shield | ram_plate | 30 | 18 | 0.6 | melee | melee | endurance x durability |
| shotgun | lumeri_hand_scatter | {within_4: 36, within_8: 15} | {within_4: 22, within_8: 9} | 0.6 | gun | gun | agility x dexterity |
| shotgun | brigade_shot_pistol | {within_4: 38, within_8: 14} | {within_4: 23, within_8: 8} | 0.6 | gun | gun | agility x dexterity |
| shotgun | brigade_auto_shotgun | {within_4: 40, within_8: 24} | {within_4: 24, within_8: 14} | 0.6 | gun | gun | agility x dexterity |
| shotgun | brigade_drum_shotgun | {within_4: 40, within_8: 24} | {within_4: 24, within_8: 14} | 0.6 | gun | gun | agility x dexterity |
| shotgun | lumeri_scattergun | {within_4: 40, within_8: 25} | {within_4: 24, within_8: 15} | 0.6 | gun | gun | agility x dexterity |
| shotgun | fowling_gun | {within_4: 40, within_8: 30} | {within_4: 24, within_8: 18} | 0.6 | gun | gun | agility x dexterity |
| shotgun | lumeri_long_scatter | {within_4: 40, within_8: 30} | {within_4: 24, within_8: 18} | 0.6 | gun | gun | agility x dexterity |
| shotgun | sawn_off | {within_4: 42, within_8: 15} | {within_4: 25, within_8: 9} | 0.6 | gun | gun | agility x dexterity |
| shotgun | coach_gun | {within_4: 45, within_8: 25} | {within_4: 27, within_8: 15} | 0.6 | gun | gun | agility x dexterity |
| smg | whisper_smg | 16 | 10 | 0.6 | gun | gun | agility x dexterity |
| smg | decrkm_smg | 19 | 11 | 0.6 | gun | gun | agility x dexterity |
| smg | mandestra_drum_gun | 19 | 11 | 0.6 | gun | gun | agility x dexterity |
| smg | whisper_carbine | 19 | 11 | 0.6 | gun | gun | agility x dexterity |
| smg | arsenal_courier_pdw | 19 | 11 | 0.6 | gun | gun | agility x dexterity |
| smg | legion_pdw | 20 | 12 | 0.6 | gun | gun | agility x dexterity |
| smg | chezknov_machine_carbine | 20 | 12 | 0.6 | gun | gun | agility x dexterity |
| smg | decrkm_carbine | 21 | 13 | 0.6 | gun | gun | agility x dexterity |
| smg | mandestra_drum_rifle | 21 | 13 | 0.6 | gun | gun | agility x dexterity |
| thrown | smoke_grenade | 0 | 0 | 0.6 | weapon | thrown | agility x dexterity |
| thrown | flashbang | 0 | 0 | 0.6 | weapon | thrown | agility x dexterity |
| thrown | bot_scrambler | 0 | 0 | 0.6 | weapon | thrown | agility x dexterity |
| thrown | satchel_charge | 120 | 54 | 0.45 | weapon | thrown | agility x dexterity |
| thrown | incendiary_grenade | 15 | 9 | 0.6 | weapon | thrown | agility x dexterity |
| thrown | frag_grenade | 40 | 24 | 0.6 | weapon | thrown | agility x dexterity |
| unarmed | fists | 10 | 6 | 0.6 | melee | melee | strength x raw_power |
| unarmed | hand_wraps | 14 | 8 | 0.6 | melee | melee | strength x raw_power |
| unarmed | striking_gloves | 17 | 10 | 0.6 | melee | melee | agility x dexterity |
| unarmed | beast_bite | 18 | 11 | 0.6 | weapon | weapon | strength x raw_power |
| unarmed | kemizuchi_strikers | 19 | 11 | 0.6 | melee | melee | agility x dexterity |
| unarmed | knuckledusters | 20 | 12 | 0.6 | melee | melee | strength x raw_power |
| unarmed | weighted_gloves | 22 | 13 | 0.6 | melee | melee | strength x dexterity |
| unarmed | hellraiser_piston_knuckles | 24 | 14 | 0.6 | melee | melee | agility x dexterity |
| unarmed | iron_mitts | 25 | 15 | 0.6 | melee | melee | strength x raw_power |
| unarmed | figment_edge | 25 | 15 | 0.6 | weapon | weapon | strength x raw_power |
| unarmed | hellraiser_servo_fist | 30 | 18 | 0.6 | melee | melee | strength x raw_power |
| unarmed | figment_claws | 30 | 18 | 0.6 | weapon | weapon | strength x raw_power |
| unarmed | hellraiser_door_knocker | 34 | 20 | 0.6 | melee | melee | strength x raw_power |

Rows of one category that meet on one new number: 18

| category | lower row | today | higher row | today | new (both) | gap today |
| --- | --- | --- | --- | --- | --- | --- |
| pistol | parlour_pistol | 16 | decrkm_autopistol | 17 | 10 | 6.2% |
| rifle | chezknov_battle_rifle | 31 | lever_carbine | 32 | 19 | 3.2% |
| rifle | chezknov_battle_rifle | 31 | legion_marksman_rifle | 32 | 19 | 3.2% |
| rifle | chezknov_battle_rifle | 31 | albert_town_service_rifle | 32 | 19 | 3.2% |
| rifle | ccec_marksman_rifle | 33 | adcorp_designated_rifle | 34 | 20 | 3.0% |
| light_melee | legion_leaf_dagger | 16 | pitch_axe | 17 | 10 | 6.2% |
| light_melee | legion_leaf_dagger | 16 | ork_skinner | 17 | 10 | 6.2% |
| light_melee | trench_knife | 18 | legion_gladius | 19 | 11 | 5.6% |
| light_melee | trench_knife | 18 | kemizuchi_duelling_blade | 19 | 11 | 5.6% |
| light_melee | dock_cutter | 21 | hatchet | 22 | 13 | 4.8% |
| light_melee | dock_cutter | 21 | legion_spear | 22 | 13 | 4.8% |
| light_melee | dock_cutter | 21 | ork_snarl_knife | 22 | 13 | 4.8% |
| light_melee | war_hammer | 23 | adamantile_plate_needle | 24 | 14 | 4.3% |
| light_melee | war_hammer | 23 | throwing_javelins | 24 | 14 | 4.3% |
| heavy_melee | lowland_chopper | 33 | legion_rank_sword | 34 | 20 | 3.0% |
| heavy_melee | glaive | 36 | ork_cleaver_glaive | 37 | 22 | 2.8% |
| heavy_melee | long_draw | 41 | adamantile_greatsword | 42 | 25 | 2.4% |
| unarmed | beast_bite | 18 | kemizuchi_strikers | 19 | 11 | 5.6% |

Meetings where the gap today was a tenth or more: 0

| id | splash_damage today | new |
| --- | --- | --- |
| breacher_tube | 60 | 18 |
| legion_throwaway_tube | 60 | 18 |
| legion_siege_tube | 60 | 18 |


#### T3b. Leon's digits rule, weapon by category: the strongest row of each, one plain hit (no Margins, no sheet; a draw bow at Raw Power 0 / 4 / 3 / 3 at level 1, 10 at level 20)

| category | strongest row | new base | profile | L1 at 1/0 | L1 at 4/4 | L1 at 7/7 | L1 at 7/7 Fine | L20 at 10/10 Relic | L20 at 10/10 Celestial | flag |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bow | arbalest | 40 | bow | 38 | 60 | 83 | 96 | 6,577 | 7,673 | - |
| heavy | blackpoint_700 | 40 | gun | 36 | 56 | 77 | 88 | 6,084 | 7,098 | - |
| heavy_melee | ork_wreck_saw | 28 | melee | 32 | 50 | 69 | 80 | 5,498 | 6,414 | - |
| light_melee | war_hammer | 14 | melee | 16 | 25 | 35 | 40 | 2,749 | 3,207 | - |
| mana | lumeri_censer_gun | 18 | weapon | 27 | 27 | 27 | 31 | 1,620 | 1,890 | - |
| pistol | magistrate_pistol | 16 | gun | 14 | 22 | 31 | 35 | 2,433 | 2,839 | - |
| revolver | frontier_hand_cannon | 23 | gun | 20 | 32 | 44 | 51 | 3,498 | 4,081 | - |
| rifle | long_rifle | 28 | gun | 25 | 39 | 54 | 62 | 4,259 | 4,968 | - |
| shield | ram_plate | 18 | melee | 21 | 32 | 45 | 51 | 3,534 | 4,124 | - |
| shotgun | coach_gun | 27 | gun | 24 | 37 | 52 | 60 | 4,106 | 4,791 | - |
| smg | decrkm_carbine | 13 | gun | 12 | 18 | 25 | 29 | 1,977 | 2,307 | - |
| thrown | satchel_charge | 54 | thrown | 36 | 57 | 79 | 90 | 6,215 | 7,251 | - |
| unarmed | hellraiser_door_knocker | 20 | melee | 23 | 36 | 50 | 57 | 3,927 | 4,582 | - |

The rows that take a factor of their own: at x0.6 a level-1 specialist in Fine would put three digits on screen

| row | today | at x0.6 | L1 7/7 Fine at x0.6 | own factor | new | L1 7/7 Fine | L20 10/10 Celestial |
| --- | --- | --- | --- | --- | --- | --- | --- |
| breacher_tube | 110 | 66 | 146 | 0.3 | 33 | 73 | 5,856 |
| satchel_charge | 120 | 72 | 120 | 0.45 | 54 | 90 | 7,251 |
| arbalest | 72 | 43 | 103 | 0.55 | 40 | 96 | 7,673 |
| legion_throwaway_tube | 90 | 54 | 119 | 0.3 | 27 | 60 | 4,791 |
| legion_siege_tube | 130 | 78 | 172 | 0.3 | 39 | 86 | 6,920 |


## 3. The level columns (ruling A2) and the enemy columns (A3, item 10)

### 3.1 The formulas (each a named column in `rules.json output.level` or `enemies.json levels.table`)

| Column | Formula | At 5 / 10 / 15 / 20 | Read by | Reason a player sees (PROVISIONAL) |
| --- | --- | --- | --- | --- |
| `deal` | `40 ^ ((L - 1) / 19)`, x1.214 a level | 2.17 / 5.74 / 15.2 / 40 | every amount a character deals (every damage profile), max HP, armour values, a plate's soak, objects' HP, cover | every level-up makes your hit, your bar and your armour a fifth bigger; a rifle shot of 28 at level 1 is past a thousand at 20 |
| `mend` | `deal(L) x (90 + (L - 1)) / 90` | 2.27 / 6.31 / 17.5 / 48.4 | every heal and shield (the `healing`, `mend`, `tend`, `*_mend`, `repair` profiles) | a heal that closes a third of a normal friend's bar at level 1 closes a third of it at 20: it is the normal bar's growth (Endurance 4, A5's formula; the Pain Threshold term is a constant share and cancels) |
| `mp` | `1 + 0.06 x (L - 1)` | 1.24 / 1.54 / 1.84 / 2.14 | Max MP and every MP price on the `mp` rule (section 6) | 04's: about four full cash-outs a pool at every level |
| `hp_mult` (enemy) | `140 ^ ((L - 1) / 19)` | 2.83 / 10.4 / 38.1 / 140 | every enemy's HP, its companions' | written for the stated attacker (T4b): a level-20 fight is about 1.3 times a level-1 fight in plain hits, room for the long cash-outs; a grade found is a jump in your damage, never cancelled by a jump in theirs |
| `damage_mult` (enemy) | `54 ^ ((L - 1) / 19)` | 2.32 / 6.62 / 18.9 / 54 | every enemy weapon hit (`lvlDmg`) and every amount an enemy deals (its doors, its Outbursts); a Figment's HP (`figments.json level.hp`); a hazard with no dealer at the fight's level | written for the stated defender (T4c): a frail character survives four same-level Soldier hits at every level |
| `armour_mult` (enemy) | `= deal(L)` | as `deal` | every enemy's armour | a foe's plate keeps its bite against a plain level-matched hit; your cards and your grade cut through it |
| `defense_plus`, `attack_plus` | 0 at every level | 0 | the roll | A3: the roll is bounded; only the level gap (+1 a level, to 5) touches it |

**`scale` stops being a column:** `scaleOf` (`output.ts:120`) reads `deal` and the `scale` array is deleted (two columns with one meaning are a second copy of a rule). The `mend` column is defined from A5's HP formula, so the two can never drift: the ruling's "x65" was the reading of the first draft's HP formula; on A5's it is x48.4, and the ruling's reason (a heal stays the same share of a bar) is what the formula keeps. The heal gate counts to `mending.gate.hp` x `mend`: **`gate.hp` becomes 112**, the normal bar at level 1 (90 x 1.24).

**An amount reads the column of its kind and its dealer:** a damage amount reads `deal` (a character's) or `damage_mult` (an enemy's), whatever profile it names (a Snap's damage on the `tend` profile reads `deal`); a heal or shield reads `mend` (a character's) or the enemy's own multipliers as today (`mending.level_factor.who`). *One rule, so a plate and a shot of one foe grow together (critic-consistency minor 4).*

#### T4. The level columns, levels 1 to 20

deal(L) = 40 ^ ((L - 1) / 19); mend(L) = deal(L) x (90 + 1 x (L - 1)) / 90 (the normal bar's growth: Endurance 4, any Pain Threshold); mp(L) = 1 + 0.06 x (L - 1); hp_mult(L) = 140 ^ ((L - 1) / 19); damage_mult(L) = 54 ^ ((L - 1) / 19); armour_mult(L) = deal(L); defense_plus and attack_plus 0.

| level | deal | mend | mp | enemy hp_mult | enemy damage_mult | enemy armour_mult | defense_plus | attack_plus |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 1.000 | 1.000 | 1.00 | 1.000 | 1.000 | 1.000 | 0 | 0 |
| 2 | 1.214 | 1.228 | 1.06 | 1.297 | 1.234 | 1.214 | 0 | 0 |
| 3 | 1.474 | 1.507 | 1.12 | 1.682 | 1.522 | 1.474 | 0 | 0 |
| 4 | 1.790 | 1.850 | 1.18 | 2.182 | 1.877 | 1.790 | 0 | 0 |
| 5 | 2.174 | 2.271 | 1.24 | 2.830 | 2.316 | 2.174 | 0 | 0 |
| 6 | 2.640 | 2.787 | 1.30 | 3.671 | 2.857 | 2.640 | 0 | 0 |
| 7 | 3.206 | 3.419 | 1.36 | 4.761 | 3.524 | 3.206 | 0 | 0 |
| 8 | 3.893 | 4.195 | 1.42 | 6.176 | 4.348 | 3.893 | 0 | 0 |
| 9 | 4.727 | 5.147 | 1.48 | 8.010 | 5.363 | 4.727 | 0 | 0 |
| 10 | 5.739 | 6.313 | 1.54 | 10.389 | 6.616 | 5.739 | 0 | 0 |
| 11 | 6.969 | 7.744 | 1.60 | 13.475 | 8.162 | 6.969 | 0 | 0 |
| 12 | 8.463 | 9.497 | 1.66 | 17.478 | 10.069 | 8.463 | 0 | 0 |
| 13 | 10.276 | 11.646 | 1.72 | 22.670 | 12.421 | 10.276 | 0 | 0 |
| 14 | 12.478 | 14.280 | 1.78 | 29.404 | 15.322 | 12.478 | 0 | 0 |
| 15 | 15.152 | 17.509 | 1.84 | 38.138 | 18.902 | 15.152 | 0 | 0 |
| 16 | 18.399 | 21.465 | 1.90 | 49.467 | 23.317 | 18.399 | 0 | 0 |
| 17 | 22.341 | 26.313 | 1.96 | 64.160 | 28.765 | 22.341 | 0 | 0 |
| 18 | 27.128 | 32.252 | 2.02 | 83.218 | 35.484 | 27.128 | 0 | 0 |
| 19 | 32.941 | 39.530 | 2.08 | 107.938 | 43.774 | 32.941 | 0 | 0 |
| 20 | 40.000 | 48.444 | 2.14 | 140.000 | 54.000 | 40.000 | 0 | 0 |

#### T4b. The enemy HP column's working: the stated attacker

| level | door attribute / alpha | grade (one under the map's best) | ordinary sheet sum | deal | Stat growth (melee and gun) | attacker growth | hp_mult | fight length vs level 1 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 7/7 | standard | +0% | 1.00 | 1.000 | 1.0 | 1.0 | 1.00 |
| 5 | 8/8 | standard | +8% | 2.17 | 1.102 | 2.6 | 2.8 | 1.09 |
| 6 | 8/8 | fine | +10% | 2.64 | 1.102 | 3.7 | 3.7 | 1.00 |
| 10 | 9/9 | masterwork | +18% | 5.74 | 1.208 | 10.6 | 10.4 | 0.98 |
| 15 | 10/10 | masterwork | +28% | 15.15 | 1.319 | 33.3 | 38.1 | 1.15 |
| 16 | 10/10 | relic | +30% | 18.40 | 1.319 | 47.3 | 49.5 | 1.04 |
| 20 | 10/10 | relic | +38% | 40.00 | 1.319 | 109.2 | 140.0 | 1.28 |

At level 20 the stated attacker hits x109.2 harder than at level 1; x 1.3 (the fight a little longer, the charter) is 142.0; the PROPOSAL rounds it to 140.

#### T4c. The enemy damage column's working: the stated defender

| level | frail HP (End 1, PT 0) | armour grade | Light armour | damage_mult that keeps its count | damage_mult (proposed) | Soldier rifle hits it survives |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | 60 | standard | 3.0 | 1.00 | 1.00 | 4.0 |
| 5 | 139 | standard | 6.5 | 2.29 | 2.32 | 4.0 |
| 10 | 396 | masterwork | 22.4 | 6.74 | 6.62 | 4.1 |
| 15 | 1,121 | masterwork | 59.1 | 18.86 | 18.90 | 4.0 |
| 20 | 3,160 | relic | 180.0 | 53.89 | 54.00 | 4.0 |


### 3.2 The stated attacker and the stated defender (item 10)

- **The stated attacker** (T4b) is a specialist on one door: its door attribute and alpha at the ceiling the gates allow (7 to level 4; 8 from 5, 9 from 10, 10 from 15: ruling B12 puts the gate and the point that uses it on the same level), holding **the grade one step under the map's best**, with **the ordinary sheet bonus a character of that level holds: +2% a level over 1** (+38% at 20: about one mod, one boon and one perk that applies to a plain hit). The map's best grade by level reads rulings 24 and 25: maps 1 and 2 (levels 1 to 5) Fine; maps 3 and 4 (to 9) Masterwork; map 5 and endless maps 6 to 9 (10 to 15) Relic; endless map 10 on (16 on) Celestial. So the stated attacker holds Standard, Fine, Masterwork and Relic in those bands.
- **The stated defender** (T4c) is the frail character: Endurance 1, Pain Threshold 0, Light armour in the same stated grade. damage_mult keeps it at its level-1 count of a same-level Soldier's rifle hits (four).
- The hardy defender (Endurance 7, Medium) follows from the same columns and survives more as it levels (T12), because Endurance's base grows with every level on the column: *what a point in Endurance should feel like.*

### 3.3 Defense and to-hit are level-free (A3); the gap stays

`defense_plus` and `attack_plus` are 0 at every level (today +6 each at 20, `enemies.json:214`). An enemy's Defense is its tier's, fixed: **vermin 8, minion 9, Soldier 11, Elite 14, Boss 15** (06's; today 10 / 10 / 11 / 12 / 13, `enemies.json:12, :44, :75, :110, :151`). Its to-hit is its tier's `attack_bonus` (today's, kept: +0 / +1 / +3 / +5 / +6). *Reason: every point of skill is a Margin you can see (section 9), and "against an Elite the same roll just lands" holds at every level.* The level gap (`enemies.json:199` `gap`: +1 to hit a level for the higher, -1 for the lower, to 5; `combat.ts:736-742`), the one-hit rule five levels down and the Elite and Boss full-HP guard (`:203`) stay, unchanged.

### 3.4 The tier rows (level 1; HP, armour and companions x0.6, damage factor x1.28)

The rows are T12's last table (level 1 and on the columns). HP and armour are today's x0.6 (vermin 9, minion 42, Soldier 84, Elite 144, Boss 492; armour 0 / 0 / 3 / 6 / 6). **Each tier's `damage` factor x1.28** (vermin 0.64, minion 1.28, Soldier 1.0, Elite 1.344, Boss 1.536). *Reason: the charter's frail character takes three to four hits from a level-1 Soldier (18 a shot through Light armour's 3: four); today it takes five and a half.* This is the one deliberate change in the hit counts against characters.

## 4. The cards (ruling A4)

### 4.1 One rule for the nine

**Stat = k x (1 + 0.10 x (Attribute - 1)) x (1 + 0.05 x Skill)**, the pair the profile or the weapon row names. PROVISIONAL. Each profile's `k` is set so a **normal share** (4 and 4, `rules.json output.floor_reference`) deals at level 1 exactly today's number x0.6: *a character who spread its points sits where it sits today; every point above that is the card's promise, every point below it is missing.* A card's promise holds whatever `k` is: a point is +10% (or +5%) of the 1-point character's number. `factors.melee`, `.thrown` and `.figment` fold into their profiles' `k` and go (and `MELEE_FACTOR`, `combat.ts:46`, `:1537`); the "pin" notes (`rules.json` profile notes) go. `statTerm`'s sum becomes the product of an attribute bracket and a skill bracket, and `normalShareTerm` (the heal floor's reference) the same product.

**A weapon reads its row's pair** (it does today: `weaponMult`): heavy melee Strength x Raw Power; the six light melee rows on Strength x Dexterity; the 17 light blades and three Agility gloves Agility x Dexterity; shields Endurance x Durability; guns, bows and thrown Agility x Dexterity. So **Agility's +10% reaches every Dexterity weapon through the rows, and no blade profile is needed.** Focus weapons and a beast's bite stay on `weapon` (no slope: their door's power is the spell).

### 4.2 The cards, in words (the text keys and the numbers they read)

| Door | Attribute: its card (`attributes.json <id>.player` and `derived`) | Alpha: its card (`skills.json <id>.per_point`) |
| --- | --- | --- |
| Guard | **Endurance:** +10 base HP (A5), +10% a plate soaks and a Slam, +10% shield blows, +10% to ignore an injury (`derived` 0 and 1 move from code to data) | **Durability:** +5% a plate soaks and a Slam, +5% shield blows (Reach and verbs: 02) |
| Momentum | **Strength:** +10% damage with the melee rows that scale with it, +5 kg carried | **Raw Power:** +5% damage with the rows that hit with it (`per_point.numbers.damage` 0.05, now true), +1 to hit |
| Pressure | **Agility:** +10% damage with Dexterity weapons (guns, bows, light blades, thrown), +0.5 tile an AP, +1 Initiative | **Dexterity:** +5% damage with Dexterity weapons (`numbers.crit` 0.02 becomes `damage` 0.05), +1 to hit with them |
| Shadow | **Perception:** +10% on a Break (4.3), a Margin worth one point more (A7, section 9), +2 tiles of vision; its "+3% critical damage" and "-10% critical damage taken" go (07 restates what critical damage taken becomes) | **Ingenuity:** +5% on a Break |
| Sigils | **Intelligence:** +10% Sigil power | **Brain Power:** +5% Sigil power (`numbers.sigil` 0.1 becomes 0.05) |
| Figments | **Expression:** +10% Figment blows and HP, +10% elemental damage; glyphs 0.1 AP cheaper | **Visualization:** +5% Figment blows and HP, +5% elemental damage |
| Bonds | **Insight:** +10% healing and shields given, +8 max MP (x mp), Soul magic 5% cheaper | **Empathy:** +5% healing and shields given (`numbers.heal` 0.06 becomes 0.05) |
| Outbursts | **Determination:** +10% Soul power, +12 max MP (x mp), +5% mana syphoned (04) | **Will Power:** +5% Soul power (`numbers.soul` 0.1 becomes 0.05; its +10% syphoned goes, 04) |
| Prayer | **Virtue:** +10% Blessing power (A4: the card gains it); Hymns return sooner (04's wait) | **Faith:** +5% Blessing power (`numbers.blessing` 0.1 becomes 0.05) |

`repair` (Expression x Proficiency) takes the same slopes: Proficiency is Expression's beta, and its +5% on a repair is its own line (B20: a beta counts from its first point).

### 4.3 One pair to a hit

A hit reads **one** attribute term and **one** skill term (A8 lists "attribute" and "skill" once each): **the pair of the door that cashes it out, else its weapon's.** A Break from Hidden reads Perception and Ingenuity in place of its weapon's pair; a plain shot from the same gun reads Agility and Dexterity. *Reason: a Break is what the Shadow door deals (A4), and a hit carrying two attribute terms would multiply a two-attribute character's cards twice: a level-20 Break would show six digits with nothing else on the sheet.* This is a reading of A4 and A8 put to the lead (question 1). It replaces 03's `attr:perception` term in the Break's multiplier.

#### T5. The profiles after ruling A4: attribute +10% a point above 1, alpha +5% a point, the two multiplied; k set so a normal share (4 and 4) deals today's number x0.6 at level 1

| profile | reads | attr | skill | today at 4/4 | k new | level column | grade from | Stat at 1/0 | at 7/7 | at 10/10 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| melee | the row's scales_with Attribute and hits_with skill (heavy and light melee, unarmed, shields) | 0.1 | 0.05 | 1.791 | 1.1483 | deal | the weapon | 1.148 | 2.480 | 3.273 |
| gun | the row's pair: Agility and Dexterity | 0.1 | 0.05 | 1.388 | 0.8894 | deal | the weapon | 0.889 | 1.921 | 2.535 |
| bow | the row's pair: Agility and Dexterity (new row; bows read `weapon` today) | 0.1 | 0.05 | 1.500 | 0.9615 | deal | the weapon | 0.962 | 2.077 | 2.740 |
| thrown | the row's pair: Agility and Dexterity (new row; factors.thrown folded in) | 0.1 | 0.05 | 1.050 | 0.6731 | deal | the weapon | 0.673 | 1.454 | 1.918 |
| weapon | nothing (focus weapons, a beast's bite): unchanged | 0 | 0 | 1.500 | 1.5000 | deal | the weapon | 1.500 | 1.500 | 1.500 |
| physical | Strength and Raw Power (Hurl, Grenadier's Arm) | 0.1 | 0.05 | 1.500 | 0.9615 | deal | none | 0.962 | 2.077 | 2.740 |
| guard | Endurance and Durability (new row: a plate's soak) | 0.1 | 0.05 | 1.000 | 0.6410 | deal | the worn armour | 0.641 | 1.385 | 1.827 |
| sigil | Intelligence and Brain Power | 0.1 | 0.05 | 1.700 | 1.0897 | deal | the Evoker | 1.090 | 2.354 | 3.106 |
| elemental | Expression and Visualization | 0.1 | 0.05 | 1.000 | 0.6410 | deal | the Evoker | 0.641 | 1.385 | 1.827 |
| figment | Expression and Visualization (factors.figment folded in) | 0.1 | 0.05 | 1.350 | 0.8654 | deal | the Visualizer | 0.865 | 1.869 | 2.466 |
| figment_hp | Expression and Visualization | 0.1 | 0.05 | 0.560 | 0.3590 | enemy damage_mult (figments.json level.hp) | the Visualizer | 0.359 | 0.775 | 1.023 |
| soul | Determination and Will Power | 0.1 | 0.05 | 1.550 | 0.9936 | deal | the Emanator | 0.994 | 2.146 | 2.832 |
| blessing | Virtue and Faith | 0.1 | 0.05 | 1.358 | 0.8702 | deal | Devotion | 0.870 | 1.880 | 2.480 |
| healing | Insight and Empathy | 0.1 | 0.05 | 1.977 | 1.2671 | mend | the Attuner | 1.267 | 2.737 | 3.611 |
| mend | Insight and Empathy | 0.1 | 0.05 | 1.977 | 1.2671 | mend | the Attuner | 1.267 | 2.737 | 3.611 |
| tend | Insight and Empathy (a damage amount on it reads deal) | 0.1 | 0.05 | 5.311 | 3.4044 | mend | the Attuner | 3.404 | 7.353 | 9.702 |
| sigil_mend | Intelligence and Brain Power | 0.1 | 0.05 | 2.313 | 1.4828 | mend | the Evoker | 1.483 | 3.203 | 4.226 |
| soul_mend | Determination and Will Power | 0.1 | 0.05 | 1.840 | 1.1797 | mend | the Emanator | 1.180 | 2.548 | 3.362 |
| blessing_mend | Virtue and Faith | 0.1 | 0.05 | 2.045 | 1.3108 | mend | Devotion | 1.311 | 2.831 | 3.736 |
| repair | Expression and Proficiency (the beta: Proficiency's own line) | 0.1 | 0.05 | 1.977 | 1.2671 | mend | none | 1.267 | 2.737 | 3.611 |
| flat | nothing: unchanged | 0 | 0 | 1.000 | 1.0000 | deal | none | 1.000 | 1.000 | 1.000 |

#### T5b. The nine attribute cards and the nine alpha cards: what one point is worth (the reference action, Standard grade, the other side of the pair at 4)

| door | attribute | its card | reference action | one attribute point adds, L1 / L10 / L20 | alpha | its card | one alpha point adds, L1 / L10 / L20 | profiles (rules.json output.profiles) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guard | endurance | +10 base HP, +10% a plate soaks and a Slam, +10% shield blows, +10% to ignore an injury | a plate (3.6) | 0.3 / 1.6 / 11.1 | durability | +5% a plate soaks and a Slam, +5% shield blows | 0.1 / 0.9 / 6.0 | guard; melee on shield rows |
| Momentum | strength | +10% melee damage (rows that scale with Strength), +5 kg carried | a maul blow (27) | 3.7 / 21.4 / 148.8 | raw_power | +5% melee damage (rows that hit with Raw Power) | 2.0 / 11.6 / 80.6 | melee; physical |
| Pressure | agility | +10% damage with Dexterity weapons (guns, bows, light blades, thrown), +0.5 tile an AP, +1 Initiative | a service rifle shot (18) | 1.9 / 11.0 / 76.8 | dexterity | +5% damage with Dexterity weapons, +1 to hit with them | 1.0 / 6.0 / 41.6 | gun; bow; thrown; melee on Agility rows |
| Shadow | perception | +10% on a Break; +1 point on a Margin's worth (A7); +2 tiles of vision | a Break's rifle shot (18) | 1.9 / 11.0 / 76.8 | ingenuity | +5% on a Break | 1.0 / 6.0 / 41.6 | the Break's pair (section 4.3) |
| Sigils | intelligence | +10% Sigil power | a FIRE glyph (18) | 2.4 / 13.5 / 94.2 | brain_power | +5% Sigil power | 1.3 / 7.3 / 51.0 | sigil; sigil_mend |
| Figments | expression | +10% Figment blows and HP, +10% elemental damage; glyphs 0.1 AP cheaper | a beast's claws (18) | 1.9 / 10.7 / 74.8 | visualization | +5% Figment blows and HP, +5% elemental damage | 1.0 / 5.8 / 40.5 | figment; figment_hp; elemental |
| Bonds | insight | +10% healing and shields given, +8 max MP (x mp), 5% cheaper Soul magic | a Mend (2.25) | 0.9 / 5.8 / 44.5 | empathy | +5% healing and shields given | 0.5 / 3.1 / 24.1 | healing; mend; tend |
| Outbursts | determination | +10% Soul power, +12 max MP (x mp), +5% mana syphoned | the Damage school (22.2) | 2.6 / 15.2 / 105.9 | will_power | +5% Soul power | 1.4 / 8.2 / 57.4 | soul; soul_mend |
| Prayer | virtue | +10% Blessing power; Hymns return sooner (04) | Judgement (34) | 3.6 / 20.4 / 142.0 | faith | +5% Blessing power | 1.9 / 11.0 / 76.9 | blessing; blessing_mend |

Endurance's HP line on its own (Pain Threshold 4): one point is +12 / 71 / 496 HP at levels 1 / 10 / 20. Insight's and Determination's MP lines: +8 and +12 MP at level 1, x mp after.


## 5. Character HP (ruling A5)

**maxHp = round((60 + 10 x (Endurance - 1) + (level - 1)) x (1 + 0.06 x Pain Threshold) x deal(level))**, perks and traits through `fx('hp')` as today. PROVISIONAL. The numbers move from code (`character.ts:798`, `:801`) to data: `attributes.json endurance.derived[0]` (base 60, `per_point_above_1` 10, a level 1) and `skills.json pain_threshold per_point.numbers.hp_pct` 0.06 (replaces `hp_per_level` 2). *Reasons: 60 is four Soldier hits for the frail and 120 at Endurance 7 is twice that (the charter); every Pain Threshold point is +6% of the bar from the first point, the same share at every level.* Pain Threshold's other lines (its plate feed, its elemental resistance) are 02's.

#### T6. Character HP = (60 + 10 x (Endurance - 1) + 1 x (level - 1)) x (1 + 0.06 x Pain Threshold) x deal(level)

| build | L1 | L5 | L10 | L15 | L20 |
| --- | --- | --- | --- | --- | --- |
| End 1, PT 0 | 60 | 139 | 396 | 1,121 | 3,160 |
| End 1, PT 5 | 78 | 181 | 515 | 1,458 | 4,108 |
| End 1, PT 10 | 96 | 223 | 634 | 1,794 | 5,056 |
| End 4, PT 0 | 90 | 204 | 568 | 1,576 | 4,360 |
| End 4, PT 5 | 117 | 266 | 739 | 2,049 | 5,668 |
| End 4, PT 10 | 144 | 327 | 909 | 2,521 | 6,976 |
| End 7, PT 0 | 120 | 270 | 740 | 2,030 | 5,560 |
| End 7, PT 5 | 156 | 350 | 963 | 2,639 | 7,228 |
| End 7, PT 10 | 192 | 431 | 1,185 | 3,249 | 8,896 |
| End 10, PT 0 | 150 | 335 | 913 | 2,485 | 6,760 |
| End 10, PT 5 | 195 | 435 | 1,186 | 3,230 | 8,788 |
| End 10, PT 10 | 240 | 536 | 1,460 | 3,976 | 10,816 |

Against today (in brackets; today's units, before x0.6):

| build | L1 | L10 | L20 |
| --- | --- | --- | --- |
| End 1, PT 0 | 60 (100) | 396 (257) | 3,160 (914) |
| End 4, PT 4 | 112 (145) | 705 (464) | 5,406 (1,838) |
| End 7, PT 0 | 120 (190) | 740 (416) | 5,560 (1,336) |
| End 10, PT 10 | 240 (235) | 1,460 (815) | 10,816 (3,328) |

| level | HP at End 4, PT 4 | one Endurance point | one Pain Threshold point |
| --- | --- | --- | --- |
| 1 | 112 | +12 (11.1%) | +5 (4.8%) |
| 10 | 705 | +71 (10.1%) | +34 (4.8%) |
| 20 | 5,406 | +496 (9.2%) | +262 (4.8%) |


## 6. MP and every cost (ruling A6)

**The pool:** `Max MP = (40 + 12 x (Determination - 1) + 8 x (Insight - 1)) x mp(level)` (04's), its numbers moved from code (`character.ts:860`) to `attributes.json determination` and `insight` `derived`. *Reason: about four full cash-outs a pool at every level, so a Syphon, a design's size and the MP left are a real choice at level 1, 10 and 20 (today's pool holds six or more and is never felt).*

**The rule for a cost, one per currency** (every cost in the game is in T7b, with its data key):

1. **AP is the clock** and never scales (6 a turn, 2 to 9; `rules.json combat.ap`, `effects/ap.ts:16-20`).
2. **A count** (plates, chain, pips, Shadow, glyphs, charge, cores, Flux, Strain, Echo, Devotion) never scales with the level: the pool grows by points (Reach), the bill by what you build.
3. **MP, by the design:** an Outburst school, module, tone and second school are flat; a Pump costs a tenth of the Begin each (04), so the bill grows with the design, never with the level.
4. **MP, on the column:** every other MP price (Tending, the Mender's moves, perks, Syphon's gain, an enemy caster's pool) is a number x `mp` at the payer's level. Its number is the door drafter's (04, 07, 06), restated on the new pool.
5. **HP you pay yourself is a share of your own max HP:** Strain's burn **6% a point over** (A6), Mana Shock 25% (kept), a feeling's HP price and Shame's pour 6%, a Flux overload 7% a Flux over. The share is today's number over the old reference bar (145, `mending.gate.hp`), to a whole percent. *Reason: a price in blood costs the same share of your bar at every level and for every build.*
6. **HP you deal to someone else** (a trap, a barrel, a hazard, a tick, Redline's hurt to its own Figment) is x0.6 on the dealer's column.

#### T7a. The MP pool: (40 + 12 x (Determination - 1) + 8 x (Insight - 1)) x mp(level)

| build | L1 | L5 | L10 | L15 | L20 | today (every level) |
| --- | --- | --- | --- | --- | --- | --- |
| Det 1, Ins 1 | 40 | 50 | 62 | 74 | 86 | 100 |
| Det 4, Ins 4 | 100 | 124 | 154 | 184 | 214 | 400 |
| Det 7, Ins 2 | 120 | 149 | 185 | 221 | 257 | 575 |
| Det 2, Ins 7 | 100 | 124 | 154 | 184 | 214 | 325 |
| Det 10, Ins 4 | 172 | 213 | 265 | 316 | 368 | 850 |
| Det 10, Ins 10 | 220 | 273 | 339 | 405 | 471 | 1,000 |

#### T7b. Every cost in the game, its data key and its rule

Rules: **clock** (AP, never scales); **count** (never scales: the pool grows by points, the bill by what you build); **design** (MP, flat: it grows with the design, never with the level); **mp** (MP, x the `mp` column at the payer's level); **share** (HP paid by yourself: a share of your own max HP); **deal** (HP dealt to someone else: x0.6 and the dealer's column).

| cost | data key | today | new (PROVISIONAL) | rule |
| --- | --- | --- | --- | --- |
| AP a turn, every action's AP | rules.json combat.ap; each action's `ap` / `ap_cost` | 6 a turn, 2 to 9 | unchanged | clock |
| Max MP | character.ts:860 `MP_BASE`... (typed) to attributes.json determination and insight `derived` | 100 + 75 x (Det - 1) + 25 x (Ins - 1) | (40 + 12 x (Det - 1) + 8 x (Ins - 1)) x mp (04) | mp |
| an Outburst school | soul_modules.json schools[].base_cost | damage 20, buff 20, control 25, status 20 | unchanged | design |
| a module, a tone, a second school | soul_modules.json items[].cost, tones[].cost, second_school.cost; rules.json mana.soul.design.second_school_extra_cost | modules 5 to 20, tones 5, second school 10 | unchanged | design |
| a Pump | soul_modules.json cycle.pump_mp.share_per_stage (read at magic.ts:793-807) | 0.1 of the Begin for each stage it reaches | a tenth of the Begin each (04), so the price grows with the design | design |
| Syphon | rules.json mana.meter.bands[].syphon_mp; syphon_bonus_pct (:377); skills.json will_power per_point.numbers.syphon; character.ts:903 `syphonMult` (typed) | 30/60/90/120 x (1 + 0.1 x (Det - 1) + 0.1 x Will Power) | 10 / 20 / 30 / 40 x (1 + 0.05 x (Det - 1)) x mp (04); Will Power leaves it | mp |
| the air's Soul cost | rules.json mana.meter.bands[].soul_cost_mult | 1.5/1.0/0.75/0.5 | unchanged | a share |
| Mend, Mend Yourself, Shield, Field Surgery | tending.json items[tend.mend / tend.mend_self / tend.shield / tend.field_surgery].effects[0].res.mp.base | 24, 24, 30, 45 (Empathy 9: -6) | 12, 12, 15, 30; Empathy 9: a quarter less (04) | mp |
| a Bonded ally goes Down | tending.json bond.down_mp | 10 | 8 (04) | mp |
| Triage, Inspire, Rally (the Mender) | classes.json move_pool.moves[triage / inspire].effects[0].res.mp; base[bard].ranks.III.moves[rally].effects[0].res.mp | 18, 30, 60 | 10, 12, 35 (04) | mp |
| perks that cost MP | perks.json items[nobody_left_behind / steady_hands / pull_together] effects res.mp | 36; 15, 18; 12, 15 | x0.5, as Tending (07 restates) | mp |
| an enemy caster's pool | enemies.json soul_casters[].mp | 80, 140, 220 | x mp at its level; 06 restates the number on the new pool | mp |
| Strain | soul_modules.json cycle.begin_strain, swell_strain, flooded_strain, no_emanator_strain; items[].strain_extra; feelings.json items[].pour.strain; strain.limit | Begin 1, swell 1, Flooded 2, no Emanator 4; limit 3 + Composure steps | unchanged | count |
| Strain's burn | soul_modules.json strain.burn_per_point (magic.ts:734 `STRAIN_BURN`); text rules.json:1486 | 8 HP a point over, x scale | 6% of max HP a point over (A6); the key becomes `burn_share` 0.06 and the text reads it | share |
| Mana Shock | soul_modules.json strain.shock.hp_share | 25% of max HP | unchanged | share |
| a feeling bought with HP | feelings.json price.hp_per_step | 8 HP a step | 6% of max HP a step | share |
| Shame's pour | feelings.json items[shame].pour.self_damage | 8 HP | 6% of max HP | share |
| Flux | sigils.json items[].flux; rules.json mana.sigil.flux.safe_max | 1 a glyph (2 for TWICE); safe 6 | unchanged in the rule (03 sets the limit by Rumination) | count |
| Flux overload | rules.json mana.sigil.flux.overload.damage_per_flux_over; output.amounts.flux_overload | 10 true damage a Flux over | 7% of max HP a Flux over | share |
| a glyph's charge, a core | sigils.json items[].charge; rules.json mana.cores.*.charge; skills.json brain_power per_point.numbers.charge | words 1 to 2; cores 5 / 10 / 20 | unchanged | count |
| a Figment's charge, upkeep, the Visualizer's core | figments.json forms[].charge, trait_charge, upkeep, visualizer.charge | forms 1 to 4, traits 1, core 10 | unchanged in the rule (03 sets the upkeep) | count |
| Shadow spent | shadow.json items[].effects res.shadow; forks.json | 1 to 2 | unchanged | count |
| plates spent | skills.json durability unlocks res.guard; techniques.json rules.guard.interpose_cost, items[shield_bash].numbers.guard_cost | Challenge 1, Slam 2, Interpose 1, Shield Bash 1 | unchanged in the rule (02 sets Slam to all) | count |
| Momentum spent | techniques.json rules.momentum.strike_cost, opener_cost; items[].numbers.momentum_cost | 1, 1 | unchanged | count |
| pips spent | techniques.json rules.pressure.take_cost | 2 | unchanged in the rule (02 makes a Take spend all) | count |
| Devotion spent | patrons.json prayer.miracle.devotion_cost_levels | 5 levels | unchanged (04 adds the Push's XP) | count |
| Echo | rules.json echo | 1 a reroll, 3 at most | unchanged | count |
| Redline (the Rigger) hurts its Figment | classes.json base[trickster].ranks.II.moves[overclock].amounts.strain.base | 5 true damage | 3.0 on the flat profile (deal) | deal |
| a trap, a hazard, a barrel, burning, bleeding | objects.json items[].trap / hazard / explodes.damage; conditions.json items[].amounts.tick | T2b | x0.6; the dealer's column (a hazard with no dealer: the fight's level on damage_mult) | deal |

What the pool buys (04's typical designs; a full cash-out is the Begin and a tenth of it for each Pump to Reach):

| level | Channeler | pool | a design's Begin | a full cash-out | full cash-outs a pool | a Mend (12 x mp) | Mends a pool |
| --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | Det 7, Ins 2 | 120 | 25 | 35.0 | 3.4 | 12 | 10.0 |
| 10 | Det 9, Ins 3 | 234 | 45 | 63.0 | 3.7 | 18 | 12.7 |
| 20 | Det 10, Ins 4 | 368 | 75 | 112.5 | 3.3 | 26 | 14.3 |


## 7. A plate and armour on the new scale (item 6)

**One plate soaks `3.6 x Stat(guard) x deal(level) x the worn armour's grade`**, then Pain Threshold's feed (02's, `effects/feed.ts doorFeed`), read at the one site (`guardSoak`, `physical/core.ts:121`) by the soak and by the Slam. `guard` is a new profile row (data): Endurance x Durability on the one card rule, `k` 0.641 so a normal share (4 and 4) soaks today's 6 x0.6 = 3.6. PROVISIONAL. *Reason: a plate is what the wall is made of: the Guard door's attribute and alpha make it thicker, as every card makes its door bigger, and its armour's grade hardens it as it hardens the armour value.* (critic-consistency S8 asked for `3.6 x deal x (1 + 0.1 x (End - 1)) x feed`; this is that, with Durability's +5% (A4) and the normal-share pin every profile has.) Reach, Bite and the feed are 02's.

**Armour values:** `rules.json combat.armor.classes[].value` x0.6 (Light 3, Medium 6, Heavy 9, Assault 12, Juggernaut 15, Breacher plate 10.8), x `deal` at the wearer's level, x the piece's grade (`rules.json rarity.<grade>.arm`). **Cover:** `combat.attack.cover.half.hp` 18 and `.full.hp` 48, x `deal` at the fight's level, as objects are today.

#### T8. One plate's soak = 3.6 x Stat(guard: Endurance, Durability) x deal(level) x the worn armour's grade (then Pain Threshold's feed, 02's)

| build | L1 | L5 | L10 | L15 | L20 | L20 Celestial |
| --- | --- | --- | --- | --- | --- | --- |
| End 1, Dur 0 | 2.3 | 5.0 | 13.2 | 35.0 | 92.3 | 161.5 |
| End 4, Dur 4 | 3.6 | 7.8 | 20.7 | 54.5 | 144.0 | 252.0 |
| End 7, Dur 7 | 5.0 | 10.8 | 28.6 | 75.5 | 199.4 | 348.9 |
| End 10, Dur 10 | 6.6 | 14.3 | 37.7 | 99.7 | 263.1 | 460.4 |

A same-level Soldier's rifle hit for comparison: 18 / 119 / 970 at levels 1 / 10 / 20.

#### T8b. Armour values: class value x0.6 x deal(level) x the grade

| class | today | new at L1 | L1 Standard | L1 Fine | L10 Masterwork | L10 Relic | L20 Relic | L20 Celestial |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Light | 5 | 3.0 | 3.0 | 3.4 | 22.4 | 25.8 | 180.0 | 210.0 |
| Medium | 10 | 6.0 | 6.0 | 6.9 | 44.8 | 51.7 | 360.0 | 420.0 |
| Heavy | 15 | 9.0 | 9.0 | 10.3 | 67.2 | 77.5 | 540.0 | 630.0 |
| Assault | 20 | 12.0 | 12.0 | 13.8 | 89.5 | 103.3 | 720.0 | 840.0 |
| Juggernaut | 25 | 15.0 | 15.0 | 17.2 | 111.9 | 129.1 | 900.0 | 1,050.0 |
| Breacher plate | 18 | 10.8 | 10.8 | 12.4 | 80.6 | 93.0 | 648.0 | 756.0 |

An enemy's armour: the tier's value x0.6 x armour_mult (= deal):

| tier | today | new | L1 | L5 | L10 | L15 | L20 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| vermin | 0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| minion | 0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 | 0.0 |
| soldier | 5 | 3.0 | 3.0 | 6.5 | 17.2 | 45.5 | 120.0 |
| elite | 10 | 6.0 | 6.0 | 13.0 | 34.4 | 90.9 | 240.0 |
| boss | 10 | 6.0 | 6.0 | 13.0 | 34.4 | 90.9 | 240.0 |


## 8. The grade ladder (ruling A9; item 7)

The one ladder (`rules.json rarity.<grade>`: `dmg`, `arm`, `acc`), read by four things:

- **Weapons:** damage and to-hit, as `att.dmgMult` reads rarity today (`combat.ts:1536`).
- **Armour:** the armour value and a plate's soak (`bodyArmourValue` x `armOf`, `character.ts:796`).
- **The four foci:** Sigils by the Evoker's grade, Outbursts by the Emanator's, Figments by the Visualizer's, Bonds and Tending by the Attuner's (`focusRarity`, `character.ts:1086`, exists). The grade's damage, heal and to-hit go on the door's events made with that focus: each rarity row carries them under `with_this` (ENGINE-HOOKS: "a door's event ... with that door's focus"), collected by `effects/collect.ts:220`, as 07 proposes.
- **Devotion, the faithful's grade:** standing 3 / 5 / 7 / 10 counts as Fine / Masterwork / Relic / Celestial for prayers (`patrons.json devotion.grade_at`). Prayers have no roll, so only the multiplier applies. *Reason: the faithful's gear is its standing, earned by deeds instead of credits.* Devotion starts at 0 (ruling 19); its curve is 05's.

Masterwork adds a mod slot; Relic one property, Celestial two, and **neither costs boon room** (07 owns the slots and properties). Which grade a map finds and sells is rulings 24 to 26 (05, 06, 07 own it; section 3.2 reads it).

#### T9. The grade ladder (A9): one row per grade, read by weapons, armour, the four foci and Devotion

| grade | today (dmg, acc) | weapon damage | weapon to hit | armour value (and a plate's soak) | Evoker, Emanator, Visualizer, Attuner | Devotion (the faithful's grade; prayers have no roll) | also |
| --- | --- | --- | --- | --- | --- | --- | --- |
| standard | x1, +0 | x1.0 | +0 | x1.0 | x1.0, +0 to hit (a spell with a roll) | standing 0 to 2: x1 |  |
| fine | x1, +1 | x1.15 | +1 | x1.15 | x1.15, +1 to hit (a spell with a roll) | standing 3: x1.15 |  |
| masterwork | x1, +2 | x1.3 | +2 | x1.3 | x1.3, +2 to hit (a spell with a roll) | standing 5: x1.3 | a mod slot more |
| relic | x1, +2 | x1.5 | +3 | x1.5 | x1.5, +3 to hit (a spell with a roll) | standing 7: x1.5 | one property (no boon room) |
| celestial | x1, +2 | x1.75 | +3 | x1.75 | x1.75, +3 to hit (a spell with a roll) | standing 10: x1.75 | two properties (no boon room) |


## 9. Margins (ruling A7; item 8)

**The rule.** Every full 4 a roll beats the Defense or the TN by is a **Margin**; a **natural 20** lands and adds **two** more (a roll in a widened critical range counts as a critical: 07). A Margin adds **a quarter of the plain hit's own damage plus one percentage point a point of Perception** (Perception 1: 26%, Perception 10: 35%; the ruling's "25% to 35%" read as "+1 point for each point"). The plain hit is the weapon's or spell's damage before the cash-out's multiplier, so **Margins add to the cash-out factor, they do not multiply it** (section 10). PROVISIONAL. Data: `rules.json rolls.margins {step 4, per 0.25, per_perception 0.01, critical 2}`.

**Where the engine resolves it.** The judge of every d20 (`packages/engine/src/rolls.ts:78`; its result already carries `total`, `tn` and `nat`, `:50-58`) gains `margins`. A weapon attack's roll is `combat.ts:1644-1648`; its damage term goes where the critical term is pushed today (`combat.ts:1542-1544`), the same at a Sigil's roll (`sigil.ts:334-339`) and an Outburst's Bolt and Lance (`classes/soul.ts:36-39`). A landed action (a prayer, a heal, a Smite, a Slam's push, a Snap) has no roll and no Margins. A check against a TN reports its Margins with the result (the Narrator reads "beat it by 8: two Margins" as degree). Enemies get Margins as characters do.

**What goes:** `CRIT_BASE`, `CRIT_MAX`, `CRIT_PER_PERCEPTION`, `CRIT_PER_DEXTERITY` (`character.ts:853-855`), `critMult`, `soul_modules.json damage.critical`, `sigils.json grammar.critical`, Perception's "+3% critical damage" and Dexterity's "+2% critical damage" lines. Every perk, move and gear field that fed the critical (`crit_damage`, `ctx.critBonus`, `crit_taken`, the crit ranges) is restated on Margins by 07.

#### T10. Margins: one Margin a full 4 over the Defense or TN, 2 more on a natural 20; each adds (0.25 + 0.01 x Perception) of the plain hit

How many of the 20 faces give each count of Margins (a natural 1 always misses):

| Defense | to hit | miss | 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Soldier 11 | +0 | 10 | 4 | 4 | 1 | 0 | 1 | 0 | 0 | 0 |
| Soldier 11 | +3 | 7 | 4 | 4 | 4 | 0 | 0 | 1 | 0 | 0 |
| Soldier 11 | +6 | 4 | 4 | 4 | 4 | 3 | 0 | 1 | 0 | 0 |
| Soldier 11 | +9 | 1 | 4 | 4 | 4 | 4 | 2 | 0 | 1 | 0 |
| Soldier 11 | +12 | 1 | 1 | 4 | 4 | 4 | 4 | 1 | 0 | 1 |
| Elite 14 | +0 | 13 | 4 | 2 | 0 | 1 | 0 | 0 | 0 | 0 |
| Elite 14 | +3 | 10 | 4 | 4 | 1 | 0 | 1 | 0 | 0 | 0 |
| Elite 14 | +6 | 7 | 4 | 4 | 4 | 0 | 0 | 1 | 0 | 0 |
| Elite 14 | +9 | 4 | 4 | 4 | 4 | 3 | 0 | 1 | 0 | 0 |
| Elite 14 | +12 | 1 | 4 | 4 | 4 | 4 | 2 | 0 | 1 | 0 |
| Boss 15 | +0 | 14 | 4 | 1 | 0 | 1 | 0 | 0 | 0 | 0 |
| Boss 15 | +3 | 11 | 4 | 4 | 0 | 0 | 1 | 0 | 0 | 0 |
| Boss 15 | +6 | 8 | 4 | 4 | 3 | 0 | 1 | 0 | 0 | 0 |
| Boss 15 | +9 | 5 | 4 | 4 | 4 | 2 | 0 | 1 | 0 | 0 |
| Boss 15 | +12 | 2 | 4 | 4 | 4 | 4 | 1 | 0 | 1 | 0 |

Expected worth of one attack, in plain hits (misses count 0; Perception 1, a Margin 0.26; in brackets Perception 10, 0.35):

| to hit | Defense 8 (vermin) | 11 (Soldier) | 14 (Elite) | 15 (Boss) |
| --- | --- | --- | --- | --- |
| -2 | 0.71 (0.76) | 0.48 (0.50) | 0.29 (0.30) | 0.23 (0.24) |
| -1 | 0.78 (0.84) | 0.55 (0.59) | 0.35 (0.37) | 0.29 (0.30) |
| +0 | 0.87 (0.95) | 0.63 (0.67) | 0.41 (0.44) | 0.35 (0.37) |
| +1 | 0.96 (1.05) | 0.71 (0.76) | 0.48 (0.50) | 0.41 (0.44) |
| +2 | 1.05 (1.15) | 0.78 (0.84) | 0.55 (0.59) | 0.48 (0.50) |
| +3 | 1.14 (1.25) | 0.87 (0.95) | 0.63 (0.67) | 0.55 (0.59) |
| +4 | 1.24 (1.38) | 0.96 (1.05) | 0.71 (0.76) | 0.63 (0.67) |
| +5 | 1.34 (1.49) | 1.05 (1.15) | 0.78 (0.84) | 0.71 (0.76) |
| +6 | 1.44 (1.61) | 1.14 (1.25) | 0.87 (0.95) | 0.78 (0.84) |
| +7 | 1.50 (1.68) | 1.24 (1.38) | 0.96 (1.05) | 0.87 (0.95) |
| +8 | 1.56 (1.77) | 1.34 (1.49) | 1.05 (1.15) | 0.96 (1.05) |
| +9 | 1.63 (1.86) | 1.44 (1.61) | 1.14 (1.25) | 1.05 (1.15) |
| +10 | 1.69 (1.95) | 1.50 (1.68) | 1.24 (1.38) | 1.14 (1.25) |
| +11 | 1.74 (2.02) | 1.56 (1.77) | 1.34 (1.49) | 1.24 (1.38) |
| +12 | 1.81 (2.10) | 1.63 (1.86) | 1.44 (1.61) | 1.34 (1.49) |


Against today: a +6 shooter against Defense 11 expects x0.83 a shot today (80% to hit, a 5% critical at x1.5); with Margins x1.14 (Perception 1). **Margins make a skilled attacker about a third faster against a weak foe and change little against an Elite or a Boss.** That is the reward Law 2 names; it is not taken back in the enemy HP column.

## 10. The stack rule and the top of the scale (ruling A8; item 9)

### 10.1 The stack rule, as a formula

**dealt = max(1, floor( B x Lv x Stat x Gr x (C + per x m) x (1 + Σ) ) - armour)**

| Term | What it is | Kind |
| --- | --- | --- |
| B | the base: the weapon row, the Subject, the school, the prayer, the plate (with its `flat` adds) | |
| Lv | the level column of the amount's kind and dealer (section 3.1) | multiplies |
| Stat | `k x (1 + 0.10 x (A - 1)) x (1 + 0.05 x S)`, one pair (4.3) | multiplies (the attribute and the skill) |
| Gr | the grade of the weapon, the armour, the focus or the Devotion (section 8) | multiplies |
| C | the cash-out factor: 1 for a plain hit; the door's own formula on a cash-out (each door file's, written on `S(n) = (1.2^n - 1) / 0.2`) | multiplies |
| per x m | Margins: m of them, each `per` = 0.25 + 0.01 x Perception (section 9); **added to C**, so a Margin is a quarter of the plain hit whatever the cash-out | adds to C |
| Σ | **one sum** of everything else on the sheet and the field: perks, class moves and passives, faith (Judged, Witnessed, a prayer's own bonus against a status), the target's conditions and position (Marked, Prone, an ambush, a Break's fresh-ambush +50%), boons, mods, Relic and Celestial properties, special rounds, a technique's own bonus, Weakened and Sharpened, wear; penalties are negative parts of the same sum | adds; held at -90% at least, **no top** |

PROVISIONAL. *Reason a player sees: the five things that make a character bigger (its level, its two cards, its gear's grade and the counter it built) each multiply, so each is felt in full; everything else adds, so a seventh perk is worth what its card says and the sheet can never run away.* In code: `stackDamage` (`output.ts:131`) multiplies the terms of the five kinds and adds every other term into Σ; today's `ctx.mults` (Pain Eater, the ambush, Weakened, technique, ammunition) move into the sum. `VS_CAP` goes (A10).

### 10.2 The top-of-scale check

T11 computes, for each door, a level-20 specialist (door attribute and alpha 10; where the door rolls, Perception 10 too: two attributes at 10 are legal by B11), Celestial: the **plain hit**, the **full cash-out** at Reach 10 and Bite at 9 (no Margins, no sum), the **largest legal hit** (the door's Push, the most Margins a roll can give, no sum), and the same with **a squad's set-up** (07 section 5.4's sources, added as A8 says: +220%). Its last column is the **sum that door's largest hit can carry under 100,000**. Each door's Reach and Bite are read from the current 02, 03 and 04 drafts, as the "Sources used" table names.

#### T11. The top of the scale: a level-20 specialist of each door (door attribute and alpha 10, Perception 10 where it rolls: two attributes at 10 are legal by B11), Celestial

Margins at most: a natural 20 at +16 to hit (skill +9, Celestial +3, a foe four levels under +4) against a vermin's Defense 8: 9 Margins at 0.35 each = +3.15 plain hits. Against a same-level Soldier: 7 (+2.45). The squad's set-up is 07 section 5.4's list, added (A8): +220%.

| door | plain hit | plain | full cash-out (Reach 10) | the same in Relic | Bite at 9 for five digits | largest hit, no sum (Push, most Margins) | with the squad's +220% | sum it may carry under 100,000 | flags |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Guard: Slam (per foe) | a ram plate blow | 4,124 | 6,400 | 5,486 | Bite 2.19 | 8,325 | 26,639 | +1101% | cash-out 4 digits |
| Momentum: Coup | an Ork wreck saw blow | 6,414 | 35,411 | 30,352 | holds | 63,661 | 203,715 | +57% | - |
| Pressure: Dead Centre | a long rifle shot | 4,968 | 16,060 | 13,766 | holds | 35,419 | 113,341 | +182% | - |
| Shadow: the Break | a long rifle shot (the Break reads Perception and Ingenuity) | 4,968 | 43,789 | 37,534 | holds | 72,420 | 231,745 | +38% | six digits with the door's own sum |
| Sigils: one Subject | a Line of 2 of STONE | 10,546 | 35,673 | 30,577 | holds | 61,983 | 198,345 | +61% | plain 5 digits |
| Sigils: every glyph a Subject | a Line of 2 of STONE and FIRE | 15,066 | 86,635 | 74,259 | holds | 160,730 | 514,337 | +-38% | plain 5 digits; six digits with no sum |
| Figments: Curtain | a beast's claws | 3,108 | 15,013 | 12,869 | holds | 30,602 | 97,926 | +227% | - |
| Bonds: Snap All (total) | a lone Snap | 1,223 | 9,187 | 7,875 | Bite 1.52 | 12,736 | 40,756 | +685% | cash-out 4 digits |
| Bonds: Snap All (per foe) | a lone Snap | 1,223 | 2,297 | 1,969 | Bite 6.10 | 2,547 | 8,151 | +3826% | cash-out 4 digits |
| Outbursts: the Release | the Damage school at x1.0 | 4,401 | 14,982 | 12,842 | holds | 44,097 | 141,111 | +127% | - |
| Prayer: a Hymn | Judgement (no Grace), Devotion 10 | 5,833 | 16,685 | 14,302 | holds | 16,685 | 53,393 | +499% | - |

Sources used (each door drafter's current numbers):

| door | Reach and Bite read from |
| --- | --- |
| Guard: Slam (per foe) | 02 1(b)-(d): Reach 6, Bite 140% at 9, Slam = plate x Bite x S(n), Overbrace +1 |
| Momentum: Coup | 02 2(b)-(d): Reach x7, Bite 35% at 9, 1 + Bite x S(n), Overswing +1 |
| Pressure: Dead Centre | 02 3(b)-(d): Reach 5, Bite 30% at 9, 1 + Bite x S(n), Overpress +1 |
| Shadow: the Break | 03 1(b)-(d): Reach 5, Bite 1.05 at 9, 1 + Bite x S(n) (the fresh ambush +0.5 goes to the sum, A8), Last Shade +1 |
| Sigils: one Subject | 03 2(b)-(d): Reach 5, Bite 1.05 at 9, Line = Bite x S(n), Overclock +1; the Line's base is STONE |
| Sigils: every glyph a Subject | the same; the Line's base: the strongest Subject in full, every other half (rules.json output.systems.sigil_damage) |
| Figments: Curtain | 03 3(b)-(d): Reach 4, Bite 0.9 at 9, Bite x S(n) Figment blows, Overhold +1 |
| Bonds: Snap All (total) | 04 1(b)-(d): Reach 4, Bite x1.4 at 9, Bite x S(n) lone Snaps shared, Overbind +1 |
| Bonds: Snap All (per foe) | the same, each Bond its share: Bite x S(n) / n |
| Outbursts: the Release | 04 2(b)-(d): Reach 5, Bite 0.35 at 9, 0.8 + Bite x S(n); with four strong feelings about x6 (04 2(c)); Overdraw +1 |
| Prayer: a Hymn | 04 3(b)-(d): Reach 5 Grace, Bite 25% at 9, 1 + Bite x S(n); the Push is a tier above (the Miracle, 90, x1) |

The tightest door that can carry a sum at all: Momentum: Coup, +57%. 07 section 5.4's +220% must come down to that on its own doors' blows (section 10.3).


### 10.3 What the check says (each item is for the file named)

1. **Plain hits:** every door's plain hit is four digits at level 20 except the Sigil Line of two with STONE (10,546). **03:** a Line of two is four digits only up to a Subject of base 19 at Bite 1.05; 03 either holds the short Line's Bite under 0.99 at Brain Power 9 or keeps STONE's row at 19.
2. **Full cash-outs:** seven reach five digits. **Guard (02):** Slam on one foe is 6,400; it needs **Bite 2.19 at Durability 9** (today's draft 1.40). **Bonds (04):** Snap All's total is 9,187; it needs **Bite 1.52 at Empathy 9** for five digits in total; per foe it would need 6.1, which no Bite should be, so I read Snap All's total as its cash-out (question 2). Pressure's Dead Centre reaches five digits (16,060) on the long rifle; on the service rifle (18) it is 10,320, just.
3. **Six digits with nothing on the sheet:** **Sigils (03):** a Line whose every glyph is a Subject (Barrage, Twin Draw make it the Sigilist's own play) is 160,730 with Overclock and a natural 20, before any sum. The cause is the base rule "the strongest glyph in full, every other half" (`rules.json output.systems.sigil_damage.base`) multiplied by a Line multiplier that already pays for length. **Recommended to 03:** every Subject after the first adds its element and its condition, not its damage; then an all-Subject Line is a one-Subject Line, 61,983 at most.
4. **Six digits with the door's own sum:** **Shadow (03):** the Break with Last Shade and a natural 20 is 72,420 before the sum, and its own fresh-ambush +50% (a position, so in Σ by A8) takes it to 108,630. **03 trims Bite at 9 from 1.05 to at most 0.93** for the Break to carry its own ambush, or to about 0.56 to carry the same +57% sum the Coup can.
5. **The sum (07):** 07's squad set-up (+220%) puts five doors past 100,000. Each door's budget is T11's last column: **Coup +57%, Sigils (one Subject) +61%, Outbursts +127%, Pressure +182%**; Figments +227%, Prayer +499%, Guard and Bonds far above. 07 trims the sources that reach each door's blows until its largest legal sum is under that door's budget: the melee sources (Iron Grip II, Pain Eater, the maul's mods) by about 163 points, the Sigil sources by about 159, the Outburst sources by about 93, the gun sources by about 38. These are the largest legal hits (a natural 20 on a foe four levels under); against a same-level Soldier (seven Margins at most) each budget is larger, the Coup's +69%.
6. **Nothing reaches six digits on a landed door:** a Hymn with five Grace is 16,685 and the Miracle 15,600 (Devotion as Celestial), before Σ.

## 11. The enemy columns read back (item 10)

T12 reads the columns back for six sample builds, each the stated attacker of its kind (gear one grade under the map's best, the ordinary sheet sum), against same-level foes at levels 1, 5, 10, 15 and 20. A star marks a count under two: a fight shorter than two exchanges.

#### T12. The enemy columns read back: six builds against a same-level Soldier, Elite and Boss

Each build is the stated attacker of its kind: gear one grade under the map's best, the ordinary sheet sum of its level. Kill: plain hits to drop one foe after armour (no Margins), and in brackets turns of 6 AP counting misses and Margins (Perception 1). Survive: that foe's rifle hits taken before 0 HP, after the build's armour. A star marks a count under two: a fight shorter than two exchanges.

| build | L | attr/skill | grade | sheet sum | armour | plain hit | HP | hits to drop: Soldier (turns) | Elite | Boss | hits survived: Soldier | Elite | Boss |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| Two-handed Strength specialist (maul, Momentum) | 1 | 7/7 | standard | +0% | Medium | 67 | 90 | 1.3* (0.6) | 2.4 (1.3) | 8.1 (5.0) | 7.5 | 4.9 | 4.1 |
|  | 5 | 8/8 | standard | +8% | Medium | 173 | 215 | 1.4* (0.6) | 2.5 (1.3) | 8.7 (4.9) | 7.5 | 5.0 | 4.2 |
|  | 10 | 9/9 | masterwork | +18% | Medium | 712 | 705 | 1.3* (0.4) | 2.2 (0.9) | 7.5 (3.3) | 9.5 | 6.1 | 5.1 |
|  | 15 | 10/10 | masterwork | +28% | Heavy | 2,228 | 2,049 | 1.5* (0.5) | 2.6 (0.9) | 8.8 (3.5) | 12.6 | 7.3 | 5.9 |
|  | 20 | 10/10 | relic | +38% | Heavy | 7,316 | 6,474 | 1.6* (0.5) | 2.8 (1.0) | 9.7 (3.6) | 15.0 | 8.4 | 6.8 |
| Rifle Dexterity specialist (service rifle, Pressure) | 1 | 7/7 | standard | +0% | Light | 35 | 74 | 2.7 (0.8) | 5.0 (1.8) | 17.2 (7.0) | 5.0 | 3.5 | 3.0 |
|  | 5 | 8/8 | standard | +8% | Light | 89 | 180 | 2.9 (0.8) | 5.3 (1.8) | 18.2 (6.7) | 5.1 | 3.6 | 3.1 |
|  | 10 | 9/9 | masterwork | +18% | Light | 368 | 572 | 2.5 (0.5) | 4.5 (1.2) | 15.3 (4.4) | 5.9 | 4.2 | 3.6 |
|  | 15 | 10/10 | masterwork | +28% | Light | 1,150 | 1,681 | 2.9 (0.6) | 5.2 (1.3) | 17.7 (4.6) | 6.0 | 4.2 | 3.6 |
|  | 20 | 10/10 | relic | +38% | Light | 3,778 | 5,406 | 3.2 (0.7) | 5.7 (1.3) | 19.5 (4.7) | 6.8 | 4.8 | 4.1 |
| Pistol and knife, mixed (Agility and Dexterity 5 at L1 to 8 at L20) | 1 | 5/5 | standard | +0% | Light | 19 | 74 | 5.4 (1.8) | 11.4 (4.9) | 38.8 (18.7) | 5.0 | 3.5 | 3.0 |
|  | 5 | 6/6 | standard | +8% | Light | 49 | 171 | 5.6 (1.7) | 11.4 (4.5) | 38.9 (17.0) | 4.9 | 3.4 | 3.0 |
|  | 10 | 6/6 | masterwork | +18% | Light | 183 | 508 | 5.3 (1.4) | 10.1 (3.3) | 34.4 (12.4) | 5.3 | 3.7 | 3.2 |
|  | 15 | 7/7 | masterwork | +28% | Light | 581 | 1,595 | 6.0 (1.4) | 11.2 (3.4) | 38.3 (12.7) | 5.7 | 4.0 | 3.4 |
|  | 20 | 8/8 | relic | +38% | Light | 2,103 | 4,673 | 5.9 (1.3) | 10.8 (2.8) | 37.0 (10.4) | 5.9 | 4.1 | 3.6 |
| Sigilist (FIRE in a Line of two) | 1 | 7/7 | standard | +0% | Light | 89 | 60 | 1.0* (0.4) | 1.7* (1.0) | 6.0 (3.7) | 4.0 | 2.8 | 2.4 |
|  | 5 | 8/8 | standard | +8% | Light | 229 | 139 | 1.1* (0.4) | 1.9* (1.0) | 6.4 (3.6) | 4.0 | 2.8 | 2.4 |
|  | 10 | 9/9 | masterwork | +18% | Light | 1,041 | 481 | 0.9* (0.3) | 1.5* (0.6) | 5.1 (2.2) | 5.0 | 3.5 | 3.0 |
|  | 15 | 10/10 | masterwork | +28% | Light | 3,256 | 1,349 | 1.0* (0.3) | 1.7* (0.6) | 5.9 (2.4) | 4.8 | 3.4 | 2.9 |
|  | 20 | 10/10 | relic | +38% | Light | 10,693 | 4,435 | 1.1* (0.3) | 1.9* (0.7) | 6.6 (2.4) | 5.6 | 3.9 | 3.4 |
| Channeler (the Damage school at x1.0) | 1 | 7/7 | standard | +0% | Light | 48 | 74 | 1.9* (1.6) | 3.5 (3.8) | 11.8 (14.6) | 5.0 | 3.5 | 3.0 |
|  | 5 | 8/8 | standard | +8% | Light | 123 | 171 | 2.0 (1.6) | 3.7 (3.7) | 12.6 (14.1) | 4.9 | 3.4 | 3.0 |
|  | 10 | 9/9 | masterwork | +18% | Light | 507 | 572 | 1.8* (1.2) | 3.2 (2.5) | 10.8 (9.3) | 5.9 | 4.2 | 3.6 |
|  | 15 | 10/10 | masterwork | +28% | Light | 1,585 | 1,595 | 2.1 (1.3) | 3.7 (2.7) | 12.6 (9.9) | 5.7 | 4.0 | 3.4 |
|  | 20 | 10/10 | relic | +38% | Light | 5,205 | 5,145 | 2.3 (1.4) | 4.1 (2.8) | 13.9 (10.2) | 6.5 | 4.6 | 3.9 |
| Chaplain (three pistol shots at Agility 2, Dexterity 2, and a Smite) | 1 | 7/7 | standard | +0% | Medium | 23 | 101 | 3.7 (1.9) | 6.4 (4.3) | 21.8 (15.2) | 8.4 | 5.5 | 4.7 |
|  | 5 | 8/8 | standard | +8% | Medium | 58 | 241 | 4.1 (2.1) | 7.0 (4.7) | 23.9 (16.9) | 8.4 | 5.6 | 4.7 |
|  | 10 | 9/9 | masterwork | +18% | Medium | 240 | 738 | 3.6 (1.7) | 6.2 (3.7) | 21.3 (13.4) | 10.0 | 6.4 | 5.3 |
|  | 15 | 10/10 | masterwork | +28% | Heavy | 750 | 2,142 | 4.3 (2.1) | 7.3 (4.5) | 25.0 (16.1) | 13.2 | 7.6 | 6.2 |
|  | 20 | 10/10 | relic | +38% | Heavy | 2,464 | 6,708 | 4.8 (2.2) | 8.2 (4.7) | 28.0 (16.7) | 15.6 | 8.8 | 7.0 |

The tiers on the new columns (HP x0.6 x hp_mult; armour x0.6 x deal; a service rifle of 18 x the tier's damage x1.28 x damage_mult):

| tier | Defense | to hit | L1 | L5 | L10 | L15 | L20 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| vermin | 8 | +0 | 9 HP, 0 armour, 12 a rifle hit | 25 HP, 0 armour, 27 a rifle hit | 94 HP, 0 armour, 76 a rifle hit | 343 HP, 0 armour, 218 a rifle hit | 1,260 HP, 0 armour, 622 a rifle hit |
| minion | 9 | +1 | 42 HP, 0 armour, 23 a rifle hit | 119 HP, 0 armour, 53 a rifle hit | 436 HP, 0 armour, 152 a rifle hit | 1,602 HP, 0 armour, 435 a rifle hit | 5,880 HP, 0 armour, 1,244 a rifle hit |
| soldier | 11 | +3 | 84 HP, 3 armour, 18 a rifle hit | 238 HP, 7 armour, 42 a rifle hit | 873 HP, 17 armour, 119 a rifle hit | 3,204 HP, 45 armour, 340 a rifle hit | 11,760 HP, 120 armour, 970 a rifle hit |
| elite | 14 | +5 | 144 HP, 6 armour, 24 a rifle hit | 408 HP, 13 armour, 56 a rifle hit | 1,496 HP, 34 armour, 160 a rifle hit | 5,492 HP, 91 armour, 457 a rifle hit | 20,160 HP, 240 armour, 1,306 a rifle hit |
| boss | 15 | +6 | 492 HP, 6 armour, 28 a rifle hit | 1,392 HP, 13 armour, 64 a rifle hit | 5,112 HP, 34 armour, 183 a rifle hit | 18,764 HP, 91 armour, 523 a rifle hit | 68,880 HP, 240 armour, 1,493 a rifle hit |


What T12 says:

1. **Fight length holds across the levels:** every build's hits to drop each tier stay within about a quarter of its level-1 count, and are about a fifth more at 20 (the room for the long cash-outs). Margins make the specialists faster as they level (the brackets), which is the reward.
2. **Stars for 06:** the two-handed specialist drops a same-level Soldier in about one and a half blows at every level (a 3-AP blow at Strength and Raw Power 7 multiplied, against 84 HP), the Sigilist drops a Soldier with one Line of two and an Elite with under two at every level, and the Channeler's plain Bolt drops a Soldier in just under two at levels 1 and 10. Today the same Sigil Line is 2.3 rifle shots too; the multiplied cards make the 7/7 specialist a third harder than the normal share. Whether a Soldier is a one-blow foe for a specialist is 06's call on the tier rows; the columns do not cancel it, by A1's rule that only named changes move a count.
3. **Survive:** no cell is under two. The frail Sigilist survives four Soldier hits or more at every level; the maul specialist 7.5 at level 1 in Medium armour and 15 at 20 in Heavy.
4. **The mixed character** takes five to six hits on a Soldier and about 37 on a Boss alone: "more often and weaker" by the charter, and a Boss is a squad's fight.

## 12. The engine's caps (ruling A10; item 11)

#### T13. The engine's caps that limit a number, as data and code hold them today

| cap | today |
| --- | --- |
| VS_CAP (target bonuses) | +100% (output.ts:129) |
| CRIT_MAX | 2.0 (character.ts:853) |
| SIGIL_CAP / SIGIL_CAP_CRIT | 350 / 500 (sigil.ts:329, dead) |
| mending.cap_pct | 0.5 |
| boon_cap.cap | 50 |
| start_boon.max_worth | 6 |
| shrine.token_max_worth | 8 |
| variants worth_cap | 20 |
| rewards.ceiling | ['fine', 'masterwork', 'relic'] |
| stage.elite_up | {'per': 2, 'max': 4} |
| loadout.budget | 300 |
| combat.elemental_taken_cap | 0.8 |


| Cap | Ruling | Reason |
| --- | --- | --- |
| Target bonuses at most +100% (`VS_CAP`, `output.ts:129`; label `combat.ts:1558`) | **Remove** the top; keep the -90% floor | A8: one sum with no top; past the cap a seventh bonus was a point not felt |
| The critical at most x2.0 (`CRIT_MAX`, `character.ts:853`) | **Replace** by Margins (section 9) | A7 |
| `SIGIL_CAP` 350, `SIGIL_CAP_CRIT` 500 (`sigil.ts:329`, `magic.ts:646`) | **Remove** | dead (`capParts` returns its parts unchanged), and 350 means nothing on the new scale |
| One heal at most half the target's max HP (`mending.cap_pct`, `output.ts:281`) | **Remove**; the per-round brake (`mending.brake`, x1.5 a give) **stays** | A10: a healer's full cash-out may save a friend outright; the brake already prices a stream |
| Damage reduction at most 60% (`rules.json:23` `reduction_cap_pct`) | **Remove** | no reader in the engine |
| `output.level.reference_hp` | **Remove** | no reader in the engine or the client |
| The melee opener at most +50% (`techniques.json:285` `max_pct`) | **Replace** by the Momentum door's Reach (02) | a run is a counter; Reach is bought with points |
| Elites and Bosses at most 4 levels up (`survival.json` `stage.elite_up`) | **Replace** by the map's own enemy levels (06, ruling 24) | an enemy's level comes from where it lives, never from the party |
| The boon cap 50 (`survival.json boon_cap`, `run/power.ts:25`) | **Keep**, with 07's change (properties take no room) | a rule a player sees: how many boons a character carries |
| Starting boon at most 6, shrine token at most 8 | **Keep** | which boons a node offers: a menu, not a held reward |
| A variant at most 20 worth (`variants.json`) | **Keep** | it prices a variant and keeps it the same weapon |
| The finds' grade ceiling (`survival.json rewards.ceiling`) | **Keep** (its list is 07's by ruling 25) | the chase: a higher grade is found by going deeper |
| Fight budget bands, `max_foes` | **Keep** | the generator's shape: how "the stage changes" |
| The camp budget 300 (`loadout.budget`) | **Keep** | credits, not HP |
| Devotion XP caps (`patrons.json`) | **Keep** (05's numbers) | they pace the faith |
| Elemental damage taken at most 80% resisted (`combat.elemental_taken_cap`); ambush damage taken at most 60% (`effects/damage.ts:81`) | **Keep** | rules a player sees: nothing is immune by stacking |

Structural rules a player sees (the Elite and Boss guard, the one-hit rule five levels down, the gap to 5 levels, AP 2 to 9, the Attribute and skill caps, Echo 3, the Strain limit, Light armour's cap) all **stay**.

## 13. Migration: what the scale moves in a save (item 12)

- **Saved characters.** HP moves once by a new `HP_REV` through the existing `migrateCharacterHp` (`character.ts:810-816`): a character keeps **the same share of its new max HP** as it held of the old one. MP the same by a new `MP_REV` through `migrateCharacterMp` (`character.ts`, `MP_REV` 124 today): the same share of the new pool. Nothing else in a sheet holds a number on the scale (damage, armour, soak and heals are derived). Ceilings, ranks and Devotion are 05's and 06's migrations (ruling 15: nothing is taken from a live character).
- **Saved runs between nodes** are safe: a run holds no unit; the next fight is built on the new columns, with the map's own enemy levels (06).
- **A room saved in the middle of a fight before 0.34** (`apps/server/src/index.ts:99-100`: the host's `save` is the whole state). Today's mid-fight move (`migrateCombatHp`, `game.ts:508-518`, run from `apply`, `game.ts:655`) scales **every** unit's HP, max, shield and armour by `scale` at its own level and the objects' HP at the fight's level (the first critic's "characters only" misread it). The two options of ruling E, for the builder to propose and the lead to approve before it is built:
  1. **Rescale on load:** every unit's HP, max, shield and armour x (new column / old column) at its level x0.6, a character's by the share of its new max; enemy damage follows from the new table (it is read live through `lvlDmg`, set at the unit's making: the move recomputes it); held counters clamp to the new Reach. Cheap, but a fight half fought on the old cards ends on the new ones.
  2. **The fight reopens from its start:** the node's fight is built again on load (its seed and its foes), characters at the HP share they entered with. Clean, and the replay guard sees one fight; but the turns played are lost.
- **Replays and event logs** re-run the reducer: every number in them moves (the re-record list).

## 14. Defects found on the way (for the lead; not the scale's to fix)

1. **Two copies of the Damage school's base:** `soul_modules.json damage.base` 37 (read, `magic.ts:752`) and `schools[damage].damage` 40 (a fallback never reached). One goes.
2. **Numbers typed in code:** max HP's 100, 15, 5 and Pain Threshold's 2 (`character.ts:798`, `:801`); Max MP's 100, 75, 25 (`:860`); `syphonMult`'s 0.1 and 0.1 (`:903`); the critical's 1.5, 2.0, 0.03, 0.02 (`:853`); "Bleeding: 5 damage a turn" (`character.ts:775`); `armor_ignore_5` and `armor_ignore_10` read as 5 and 10 (`combat.ts:1562`); the glossary's Strain line types "limit 3 + half Will Power" and the burn (`glossary.ts:99`).
3. **Digits typed in data texts:** Judgement's "takes 56 Soul damage" and the other prayer texts with numbers (`patrons.json`); `rules.json:1486` "8 true damage per point over the limit"; they must read their rows or they lie after the rescale.
4. **Item ids in code:** `tactics.ts:420-428` switches on `smoke_grenade`, `flashbang`, `bot_scrambler`, on the thrown path the rescale moves to `deal()`.
5. **A stale comment:** `output.ts:15` says the `deal` column is "x1 at every level today"; it has been x7.5 at 20 since rules 1.36.
6. **The attribute cards' texts disagree with the engine today:** Determination's formula reads "0.05 x (Determination - 1) + 0.1 x Will Power" while its card promises +10%, and Intelligence's "+10% x Brain Power" is on the attribute's line (`attributes.json`); they are rewritten from section 4.2.

## Questions for the lead

1. **One pair to a hit (4.3):** a hit two doors deal (a Break with a gun) reads the pair of the door that cashes it out (Perception and Ingenuity), not both? Recommended: yes; otherwise a Shadow specialist's Break carries its two cards twice and shows six digits with nothing on the sheet.
2. **Snap All's five digits counted in total (10.3 item 2):** the cash-out that shares one pool across its Bonds is tested as its total, and Slam (a full blow on each foe) per foe? Recommended: yes; per foe Snap All would need a Bite of 6.

## Critics' findings

| Finding | Status | How, or why not |
| --- | --- | --- |
| consistency S1 (x0.6 against x0.45) | FIXED | x0.6 is ruled (A1) and stated once, with every key it touches (T2); the other files re-derive from it |
| consistency S2 (two enemy tables) | FIXED | one table: T4, smooth columns, level-free Defense and to-hit; 06 quotes it |
| consistency S3 (tier rows) | FIXED | x0.6 HP and armour, x1.28 damage, 06's Defense 8 / 9 / 11 / 14 / 15 (3.4, T12); T12 re-run on it |
| consistency S4 (five slope rules) | FIXED | A4's one rule, multiplied (4.1, T5); `k` re-pinned |
| consistency S5 (Max MP) | FIXED | 04's pool and the `mp` column in `output.level` (3.1, T7a) |
| consistency S6 (Strain's burn) | FIXED | 6% of max HP a point (section 6); the x0.6 row dropped |
| consistency S7 (Pain Threshold) | FIXED | A5's formula (section 5, T6); the traits' per-level numbers go to 07 as shares |
| consistency S8 (a plate) | FIXED | 3.6 x Stat(Endurance, Durability) x deal x grade, then 02's feed (section 7, T8); differs from the critic's form only by Durability's +5% (A4) and the normal-share pin |
| consistency S9 (the critical's feeders) | FIXED | A7: Perception's point on a Margin's worth; Dexterity's line becomes +5% damage; the constants go; `crit_taken` and the ranges are 07's restatement |
| consistency S13 (add or multiply) | FIXED | by ruling A4: the attribute and skill terms multiply (the critic recommended adding; the ruling decides) |
| consistency S14 (six digits at the top) | FIXED | the stack rule (10.1), Margins added to the cash-out factor, the check computed (T11) with each door's budget for 07 |
| consistency M1 (06's columns cancel growth) | FIXED | smooth hp_mult, level-free Defense (3.1, 3.3) |
| consistency M2 (four-digit cash-outs) | FIXED | T11 gives each door's Bite at 9 for five digits (Guard 2.19, Bonds 1.52 in total); the Bites are 02's and 04's to set |
| consistency M3 (three-digit tubes) | FIXED | the rows that break level 1 take a computed factor of their own (section 2): tubes x0.3, satchel x0.45, arbalest x0.55 |
| consistency M4 (old-magnitude numbers) | FIXED for 01's part | every flat number has its x0.6 value in T2b; the trait rows are marked for 07; the `rules.json:1486` text is listed to read its row (defect 3). 02's soak, 03's Rig, 06's `attack_plus` and 07's traits are those files' |
| consistency M5 (two heal columns) | FIXED | `mend` is defined from A5's HP formula (3.1); `gate.hp` 112 |
| consistency M6 (Devotion's curve) | FIXED | 01 no longer states a curve; it is 05's, Devotion starts at 0 (ruling 19); the grade steps read standing (section 8) |
| consistency M7 (the intervention) | FIXED | `patrons.json prayer.intervention.amount` 12 + 2.4 x Devotion (data, x0.6) on the blessing profile, `deal` and the Devotion grade: the same number as 04's multiple, no typed 12 in code |
| consistency minor 4 (enemy door amounts) | FIXED | an amount reads its dealer's column: an enemy's `damage_mult` (3.1) |
| consistency minor 5 (a column naming a column) | FIXED | dropped: `scaleOf` reads `deal`, the `scale` array goes |
| consistency minor 6 (the boon cap) | NOT FIXED here | kept with 07's change (section 12); turning it into slots is the Survival drafter's |
| consistency section 4 (01's primitives 2 and 3) | FIXED | the grade on magic is 07's `with_this` rarity rows; only Devotion's standing predicate is new; primitive 3 dropped |
| consistency section 5 item 5 (literals in code) | FIXED for 01's | max HP, Max MP, `syphonMult`, the critical's constants and `MELEE_FACTOR` move to data in the same change (Built from) |
| consistency M-6, M-8 (HP and MP revisions; a fight saved mid-way) | FIXED | section 13: `HP_REV`, `MP_REV` by share; ruling E's two options stated, and the critic's "characters only" corrected from the code |
| player 1 (the files on two scales) | FIXED for 01 | this file is complete and owns every shared number; the other files' re-derivation is theirs |
| player 7, 8 (Pain Threshold's dead points) | FIXED | +6% max HP a point from the first (A5) |
| player 10 (Retort, Slam, Rig not worth pressing on 01's numbers) | FIXED for 01's part | the plate is set (section 7); T11 says the Bite Guard needs; Retort's and Rig's numbers are 02's and 03's |
| player 12 (the frail's Soldier hits from five to four) | NOT FIXED | deliberate and named (3.4): the charter asks three to four hits for the frail |
| player 13 (06 cancels the to-hit) | FIXED | level-free Defense (3.3) |
| player 15 (the boon cap) | NOT FIXED here | as consistency minor 6 |
| player 16 ("I levelled, the Soldier didn't get easier") | NOT FIXED here | the columns are meant so (a same-level foe grows too); the level-up screen's "against a foe of your level" is the client's text, not the scale's |
| player 17 (damage that swings by ten) | FIXED for 01's part | one sum with no kinds (A8) and Margins added, not multiplied, narrow the swing; naming the Margins on the damage line is the client's |

## Built from

| Rule or number | The existing piece and data key that carries it (file) | What must change |
| --- | --- | --- |
| x0.6 on every flat number (A1) | each file's own keys (T2, T3) | the numbers; the four rows' own factor; the two draw bows' `phys.also_scales` |
| The level column x40 | `levelFactor` (`effects/output.ts:111-117`); `rules.json output.level.deal` | values `40^((L-1)/19)` |
| `scale` is `deal` | `scaleOf` (`output.ts:120`): max HP, armour, soak, objects, cover | `scaleOf` reads `deal`; the `scale` array and every profile's `level: scale` go |
| Heals and shields on `mend` | `levelFactor`; `mendGate` (`output.ts:264`); `rules.json output.level.mend`, `mending.gate.hp` | values from A5's normal bar; `gate.hp` 112 counted x `mend` |
| The `mp` column | `levelFactor` reads any array in `output.level` (`output.ts:106`); `maxMp` (`character.ts:860`) | `output.level.mp`; `maxMp` reads the pool from `attributes.json` and the column |
| An amount's column by kind and dealer | `openAmount` (`effects/amounts.ts`), `levelOf` (`output.ts`) | a damage amount reads `deal` (an enemy's: `damage_mult`), a heal or shield `mend`; the thrown, barrel, trap and hazard paths (`tactics.ts:433-435`, `perks/c.ts:485`, `combat.ts:889-893`) go through `deal()` |
| Enemy columns and tier rows | `levelled` (`data.ts:116-120`); `enemies.json levels.table`, `items[]` | `hp_mult` 140^t, `damage_mult` 54^t, `armour_mult` = deal, `defense_plus` and `attack_plus` 0; tier HP and armour x0.6, `damage` x1.28, `defense` 8 / 9 / 11 / 14 / 15 |
| Figment HP | `figments.json level.hp` | `["damage_mult"]`; `figment_hp` on the card rule |
| The cards (A4) | `statTerm`, `normalShareTerm` (`output.ts:87-100`), `weaponMult` (`character.ts:833-837`); `output.profiles` | the attribute bracket times the skill bracket; slopes 0.10 and 0.05; `k` re-pinned (T5); new rows `bow`, `thrown`, `guard`; `output.factors` and `MELEE_FACTOR` go; card texts (4.2) |
| One pair to a hit (4.3) | `statOf(profile, c, pair)` takes a pair today | the cash-out's action names its door's pair (Needs a new primitive, extension 1) |
| Character HP (A5) | `maxHp`, `hpPerLevel` (`character.ts:798-801`), `fx('hp')` | numbers into `attributes.json endurance.derived` and `skills.json pain_threshold numbers.hp_pct`; `HP_REV` |
| MP and costs (A6) | `maxMp`, `syphonMult`, `pumpMp` (`magic.ts:793-807`), the cost site (`effects/cost.ts`), `STRAIN_BURN` (`magic.ts:734`) | the pool's numbers into data; MP prices x `mp`; the burn and the self-paid prices as shares; `MP_REV` |
| A plate | `guardSoak` (`physical/core.ts:121`); `techniques.json rules.guard.soak` | 3.6 on the `guard` profile, `deal`, the armour's grade |
| Grades (A9) | `att.dmgMult` (`combat.ts:1536`), `bodyArmourValue` x `armOf` (`character.ts:796`), `focusRarity` (`character.ts:1086`), `with_this` (collect.ts:220); `rules.json rarity` | `dmg`, `arm`, `acc` values; each row's `with_this` effects for the foci; the rarity text (`rules.json` rarity `rules`) rewritten |
| Devotion as a grade | `devotionOf` (`tactics.ts:449`); `patrons.json devotion` | `devotion.grade_at` [3, 5, 7, 10] read by a standing predicate (Needs a new primitive) |
| Margins (A7) | the roll judge (`rolls.ts:78`); the critical term sites (`combat.ts:1542-1544`, `sigil.ts:334-339`, `classes/soul.ts:36-39`) | S1; `rules.json rolls.margins`; `CRIT_*` and `critMult` go |
| The stack rule (A8) | `stackDamage` (`output.ts:131-134`), `ctx.mults`, `ctx.vs` | S12 in two kinds; `VS_CAP` goes; Margins add to the cash-out term |
| Caps (A10) | `VS_CAP`, `SIGIL_CAP` (`sigil.ts:329`), `mending.cap_pct`, `reduction_cap_pct`, `reference_hp`, `max_pct`, `elite_up` | as section 12 |
| Migration | `migrateCharacterHp`, `migrateCharacterMp`, `migrateCombatHp` (`game.ts:508`) | new `HP_REV`, `MP_REV`; ruling E's option, once approved |

## Needs a new primitive

Names from critic-consistency's merged list where one exists. General pieces only.

| Piece | Smallest form | Why nothing existing does it |
| --- | --- | --- |
| **S1. Margins** | the roll judge returns `margins = max(0, floor((total - tn) / step))` (+ `critical` on a critical); the attack and spell contexts carry it; its term is added to the cash-out term (S12); numbers in `rules.json rolls.margins` | nothing counts how far a roll beat its target (`rolls.ts:58` knows only `nat`; the attack only `crit`, `combat.ts:1647`) |
| **S12. Stack kinds, in two** | `Term.kind`: one of the five multiplying kinds (`level`, `attribute`, `skill`, `grade`, `door`, with `margin` adding into `door`) or the sum; `stackDamage` multiplies the first and adds the rest | today two buckets by where a term is pushed (`ctx.mults` multiply, `ctx.vs` add), not by what it is (critic S12, reduced to A8's two kinds) |
| **A standing predicate** (`self_devotion`, min standing) | one predicate in the predicate list, read by the rarity rows' Devotion effects | no predicate reads Devotion's standing (ENGINE-HOOKS: only the stat `devotion_xp`) |
| Extension 1: **an action's pair** | an amounts block or a cash-out row may name `pair` (`{attrs, skills}`), passed to `statOf` in place of the weapon's | `weaponMult` reads only the row's pair; `statOf` already takes a pair, so this is one parameter |

## What re-records

| What | Why |
| --- | --- |
| Every golden damage table (`test/golden/builds-allin.json`, `builds-normal.json` and the tables behind `golden-damage*.test.ts`) | every base x0.6, the multiplied cards and `k`, the level column, grades on damage, Margins in place of the critical, the stack rule |
| `golden-conditions.test.ts` | ticks x0.6 and on the dealer's column |
| `golden-costs*.test.ts` | MP prices on the new pool and `mp`; the self-paid HP prices as shares |
| `golden-itemops`, `golden-mods`, `golden-rules`, `rules-enemies` | amounts x0.6; the rarity rows; the enemy table and tier rows |
| `enemy-levels.test.ts`, `level-gains.test.ts`, `levelup-revert.test.ts`, `fx-hp-stamp.test.ts` | the enemy table; max HP by level |
| `heal-pct.test.ts`, `rules120-heal-shield.test.ts`, `bond-heal-shown.test.ts` | the `mend` column, `gate.hp` 112, the heal cap removed |
| `figments*.test.ts` | forms x0.6, `level.hp` on `damage_mult`, the figment factor folded, Expression's card |
| `sigil-balance.test.ts` | it asserts `SIGIL_CAP` (removed): deleted with it |
| `outburst20*`, `outburst40*`, `rules119-outburst.test.ts`, the `sigil14*` and `sigil15*` suites that assert a number; the faith suites | bases x0.6, the multiplied cards, Margins, the grades on foci and Devotion |
| `test/old-save.test.ts` and its fixtures | `HP_REV`, `MP_REV`, and ruling E's mid-fight move (a fixture each) |
| `test/replay-hash.test.ts`, `golden/replays.json` | every seeded game |
| The balance measures in `packages/engine/test/balance/` | readings: every number they print moves |
| `tools/check_spec_tables.py`; `tools/text_numbers.py` and `test/datatext.test.ts` | the spec's tables are rewritten first (spec, then data); every text that typed a digit reads its row |
| The web and e2e suites that read a number on screen | HP bars, damage lines, the critical's label (now Margins) |
