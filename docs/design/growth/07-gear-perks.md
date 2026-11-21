# 07. Gear and perks: grades, mods, the maker signatures, every perk, Margins, the sum, and traits

Drafter's file for the 0.34 rebalance, **third pass** (ruling F, 21 Nov 2026). **The numbers live in `tools/balance/bible/gear_perks.json`**; this file explains them and shows no number that file does not hold (every table below is printed from it). Shared numbers are references to `scale.json` (the factor, the grade ladder, Margins, the mark) and `pacing.json` (grades by map, prices); the JSON names them by path, so do the tables. `python tools/balance/check.py` computes each door's largest legal turn and largest plain hit at level 20 from these terms and the door files'. Written to the charter (`../proposals/2026-11-21-the-curve.md`), to `00-rulings.md` A to F (F wins) and to every finding of `critic-consistency-2.md` and `critic-player-2.md` that names 07. **Nothing here is built; every number is PROVISIONAL**, chosen for what a player feels. Facts about today carry file:line, checked at `release/0.34-final`.

## 0. What changed from the second draft

- **One source.** Every number moved into `gear_perks.json`; the second draft's computed tables (its section 6.3 and its plain-hit table) are gone: the checker prints them.
- **Ruling 30 is applied** (a cash-out counts its own door's terms and one mark). The JSON's `rules.own_door` says what is a door's own; every other damage term carries `scope: plain` and the profiles it reaches (`hits`), and the checker adds those to plain hits only.
- **Ruling 35:** the vault gives the map's own best find grade (`grades_by_map.vault_rule`; the values are `@pacing.grades_by_map`). The second draft's vault list (one grade over the finds) is withdrawn: no Relic in a vault on maps 3 and 4.
- **Ruling 21 in full:** Cultured gets a fight half (critic-consistency-2 2.2).
- **Ruling 32:** every perk that names an ally says what it does alone (`needs_ally`, `solo`); Threads That Hold reads Tending yourself while you hold a Bond (critic-player-2 2).
- **Ruling 39:** the re-pick list (`repick`): the four perks narrowed to their own door, the two marks' holders and every perk whose meaning changed (critic-consistency-2 7.4).
- **Trimmed, by A8 ("trim in 07"):** Last Charge's turn and the weighted head now step at a tier I's share, so the largest plain blow (a Breaker's Strike with every legal source) stays five digits. **Iron Grip's tier II** became a plain-hit term (`scope: plain`, melee): counted in the Coup it put Momentum's largest legal turn over the top (the checker's reading); on the blows that build the chain it is unchanged. PROVISIONAL, for the lead.
- **Withdrawn as second copies:** Field Surgeon's own heal (it reads Field Repair's), Twin Souls' MP (a design price, soul's), the drone's and beast's typed HP (the companion rows').
- **Added:** the ward shields' flat cuts (`items.json:1749-1793`) become shares; the boons that reach the sum are placed (`boons`); the felt bar for a per-point line is its sum on the sheet (critic-player-2 14).

---

## 1. Grades

The ladder is `@scale.grades` (ruling 9). This file owns how it is carried:

- **about:** one copy of the grade: each rules.json rarity row (:1605-1659) gains effects (roll_mod to_hit with_this = acc; damage_mult dealing with_this = dmg; mend_mult heal and shield with_this = dmg), carried by the instance through the one carried-modifier list (effects/collect.ts:220). combat.ts:580, :585 and :1536 stop reading acc and dmg (the second copy goes); armOf (character.ts:224) keeps arm
- **off_hand:** with_this already means that hand's weapon, or the door's focus: the off hand gets its grade, and every focus its door's output (today a graded Evoker, Emanator, Attuner or Visualizer gets durability, price and marks only)
- **mod_slots:** `@scale.grades.masterwork.mod_slots`
- **slotless_default:** grip (`rules.json rarity.masterwork.default_slot`): every hand-held thing has a grip, so the Masterwork reward is never empty (critic-consistency-2 6.3: a data default, not the word in code)
- **durability_price_marks:** as today (rules.json rarity dur, price, marks); one price for a grade step is pacing's (@pacing.credits)
- **props_list:** GearState.prop becomes props (a list; S15): a Celestial holds two; prop becomes props: [prop] on load
- **celestial_kept:** cappedRarity (run/rewards.ts:160-164) stops turning a Celestial into a Relic where the find's list allows Celestial

**The grade by map** (ruling 25, ruling 35): ruling 35: the vault gives the map's own best find grade, never the next map's; so no Relic in a vault on maps 3 and 4, and no Celestial before the map pacing names. The values: `@pacing.grades_by_map`. survival.json rewards.ceiling (:147) becomes the finds list by map; new rewards.shelf (never Celestial) and vault.grades (:580, in place of grade_up and grade_max); grade_up.relic_from_stage (:195) goes, the Forge's Relic step reads the shelf; one reader stageCeiling(stage, purpose) for finds, shelf, vault; tools/validate.py:2960 allows Celestial in finds and vault, refuses it on the shelf. only a rarity row with a Celestial weight reaches the Celestial entry, and only the Boss's has one (its weights are pacing's): a Celestial is never an ordinary fight's pick.

**Properties** (`properties`; a property costs no boon room, `boon_room`: runWorth (run/power.ts:47) stops counting gearProps (ruling 9); the cap itself is world's):

| property | grade | what it does | where it counts |
| --- | --- | --- | --- |
| prop.keen | relic | every round it sends lands harder (kept) | plain hits of gun,bow: `survival.json:relic_props[prop.keen].effects[0].value` -1 |
| prop.biting | relic | every blow bites deeper (kept) | plain hits of melee: `survival.json:relic_props[prop.biting].effects[0].value` -1 |
| prop.true | relic | the first attack a turn with it is +2 to hit (kept) | to hit on momentum, guard, pressure, shadow: `survival.json:relic_props[prop.true].effects[0].value` |
| prop.deep | relic | a focus property: +1 to hit with it (kept) | to hit on sigils, figments, bonds, outbursts: `survival.json:relic_props[prop.deep].effects[0].value` |
| prop.quick | relic | reloading it costs 1 AP less (kept) |  |
| prop.balanced | relic | kept |  |
| prop.gentle | relic | its heals and shields are bigger (kept; a mend share) |  |
| prop.padded | relic | melee blows on you -15% (damage_mult taking; the defender's side of the sum) (new, fits armour) | taken -0.15 |
| prop.sealed | relic | elemental damage on you -15%, inside elemental_taken_cap (rules.json:857, kept) (new, fits armour) | taken -0.15 |
| prop.lightened | relic | this piece's Heavy word costs no Movement (rules.json weapons_rules.heavy) (new, fits armour) |  |

---

## 2. Mods: one visible trade each

a mod's damage is a plain-hit term (scope plain): it makes the shots and blows that build the counter harder, never a cash-out (ruling 30); every flat damage number on a mod goes; the Forge's fit fee is unchanged (fit_fee).

| mod (line) | slot | today | gives | costs | numbers | data form |
| --- | --- | --- | --- | --- | --- | --- |
| mod_red_dot (items.json:283) | optic | no -2 in the first band past effective range | Shots, Snap Shots and Bursts +1 to hit; no penalty in the first band past effective range | Aimed Shots -1 (it is not a scope) | to_hit 1, aimed -1 ; to hit pressure 1, shadow 1 | bands 1, bands_modes [shot, burst, auto]; roll_mod to_hit with_this mode [shot, burst, auto] +1; roll_mod mode [aimed] -1 |
| mod_scope (items.json:304) | optic | Aimed +1, one more band | Aimed Shots +2 to hit and two more bands | Shots and Bursts -1 (tunnel) | aimed 2, bands 2, others -1 ; to hit pressure 2, shadow 2 | bands 2, bands_modes [aimed]; roll_mod aimed +2; roll_mod [shot, burst, auto] -1 |
| mod_suppressor (items.json:336) | muzzle | silent; -2 damage (flat) | silent; a kill with it while you are Hidden gives 1 Shadow | its shots -15% | shots -0.15, shadow 1 | silent 1; damage_mult dealing with_this melee false 0.85; resource shadow +1 on kill with_this self_has hidden |
| mod_compensator (items.json:363) | muzzle | Recoil -1 a shot | no Recoil from earlier shots this turn | the first shot of each turn -1 to hit (heavy muzzle) | first_shot -1 | recoil -1; roll_mod to_hit with_this -1, limit per_turn 1 |
| mod_extended_mag (items.json:381) | magazine | +50% capacity | +50% rounds | reloading it costs 1 AP more | reload_ap 1 | magazine_pct 50; cost_mod cost action reload with_this +1 |
| mod_quick_release (items.json:399) | magazine | reload costs 1 AP | reload costs 1 AP | 25% fewer rounds | magazine_pct -25 | cost_mod set 1 (as today); magazine_pct -25 |
| mod_foregrip (items.json:428) | underbarrel | Bursts and auto +1 | Bursts and full auto +2 to hit | drawing or swapping to this gun costs 1 AP more | to_hit 2, swap_ap 1 ; to hit pressure 2 | roll_mod [burst, auto] +2; cost_mod on swap with_this +1 |
| mod_bayonet (items.json:457) | underbarrel | the gun's blow deals 15 | the gun's blow on the factor, and it builds Momentum as any melee hit | Aimed Shots -1 | melee_damage `items.json:items[mod_bayonet].melee_damage` x `@scale.factor.value`, aimed -1 | melee_damage (the factor walk); roll_mod aimed -1 |
| mod_underslung (items.json:475) | underbarrel | holds a 40 mm round; not built | once a fight, 2 AP: a grenade at a tile within 8, a launcher round's blast, radius 1 | 1.5 kg, the underbarrel slot, once a fight | ap 2, tiles 8, radius 1 | grant_action (effects/actions.ts): ap 2, uses per_combat 1, reach tile 8 sight; deal an amounts block of the launcher's blast (the factor), targets of tile shape burst within 1. No new op |
| mod_serrated (items.json:493) | edge | a critical blow causes Bleeding | a critical blow (a natural 20 or the weapon's critical range) causes Bleeding, Body save skipped | blows -10% | blows -0.1 | condition on hit crit true (as today); damage_mult dealing with_this melee 0.9 |
| mod_weighted (items.json:524) | edge | +3 damage (flat) | blows +15% | blows -1 to hit | to_hit -1 ; plain `@gear_perks.rules.restep.tier_i` | damage_mult with_this melee 1.15; roll_mod to_hit with_this melee -1 |
| mod_wrapped_grip (items.json:550) | grip | cannot be Disarmed; not built (narrator) | you cannot be Disarmed while you hold it | swapping away from it costs 1 AP more | swap_ap 1 | cancel on cond_incoming target self cond disarmed with_this; cost_mod on swap with_this +1; adjudication engine |
| mod_sigil_magazine (items.json:568) | inscription | holds a stored spell; not built | the first glyph you draw each turn costs 0.5 AP less (the spellslinger's pistol is an Evoker) | 25% fewer rounds | glyph_ap -0.5, magazine_pct -25 | cost_mod on glyph_cost with_this -0.5, limit per_turn 1; magazine_pct -25 |
| ench_fire (items.json:586) | enchantment | a tone's rider; arrows x0.9 | kept: already a trade | kept |  | unchanged |
| ench_storm (items.json:606) | enchantment | a tone's rider; arrows x0.9 | kept: already a trade | kept |  | unchanged |
| ench_frost (items.json:626) | enchantment | a tone's rider; arrows x0.9 | kept: already a trade | kept |  | unchanged |
| ench_stone (items.json:646) | enchantment | a tone's rider; arrows x0.9 | kept: already a trade | kept |  | unchanged |
| ench_gale (items.json:666) | enchantment | a tone's rider; arrows x0.9 | kept: already a trade | kept |  | unchanged |
| ench_acid (items.json:686) | enchantment | a tone's rider; arrows x0.9 | kept: already a trade | kept |  | unchanged |
| mod_ward_light (items.json:1749) | variant | -3 damage taken from ranged and elemental hits (flat; a ward shield's variant mod, weapons.json:5376) | ranged and elemental hits on you -10% | none (the shield's hand) | taken -0.1 | damage_mult taking with_this by_hit 0.9 in place of damage_mod -3 |
| mod_ward_standard (items.json:1771) | variant | -5 (flat; weapons.json:5430) | ranged and elemental hits on you -15% | none | taken -0.15 | damage_mult taking 0.85 in place of damage_mod -5 |
| mod_ward_heavy (items.json:1793) | variant | -7 (flat; weapons.json:5487) | ranged and elemental hits on you -20% | none | taken -0.2 | damage_mult taking 0.8 in place of damage_mod -7 |

*A mod is a choice you read on the card before you pay: the scope makes you a better sniper and a worse brawler.* Three dead mods are built from existing pieces (the underslung launcher, the wrapped grip, the Sigil magazine); no mod needs a new op.

---

## 3. The maker signatures

### 3.1 The one general piece

- **about:** the one general piece (PROVISIONAL): a family row in data/families.json names its signature once ("signature": "<items.json modifier row>"); every weapon row of that family carries it while in a hand, through the one carried-modifier list (effects/collect.ts:220), beside variant_mods, the fitted mods and the grade row; gearNum (character.ts:1738-1742) reads the same carried list, so a signature may carry gear fields with their _modes. The per-row variant_mods entries for Arsenal and Smetanita move up to their families (one copy).
- **today_readers:** effects/collect.ts:217-220 (baked), effects/hooks.ts:201, effects/triggers.ts:277, gearpreview.ts:156 and :340; gearNum does not read them (why Chezknov shipped plain)
- **scope:** a signature's damage is gear: a plain-hit term, nothing on a cash-out; it may feed a door's counter (resource op) and read one (self_res, target_res, self_has_res)
- **source:** rules 1.92 items 8021, 8024, 8030 to 8035 (PHC-Core-Rules-v1.0.md:14560-14636); rules 1.93 item 8104 (:14699)

*A maker's gun plays like its maker on every row, and a new row of the family gets it for free.*

### 3.2 Each signature

| family | maker | door | behaviour | carried by the piece? | numbers | data form |
| --- | --- | --- | --- | --- | --- | --- |
| revolvers | the revolver makers (G2) | pressure | a 19 is a critical too (two Margins); a critical lays 1 Pressure | needs S13 crit_range | crit_range 1, pressure 1 | sig_revolver: crit_range 1; resource pressure +1 on hit with_this crit hostile, target |
| legion_automatics | the Legion (G4) | pressure | shoot then move: after a shot, a move of 2 tiles or less costs 1 AP less, once a turn | yes | tiles 2, ap -1 | sig_legion: mark fired on attack_roll with_this own_turn; cost_mod action move flag fired path_tiles_at_most 2 -1 min 0 per_turn 1; clear on turn_end (fire_and_move's shape) |
| brigade_auto_shotguns | Brigade (G11) | pressure | the burst's spray presses its neighbours: +1 Pressure on a foe next to the target, once a turn each | yes | pressure 1 | sig_brigade: resource pressure +1 on hit with_this mode burst auto, targets side foe within 1 aura, limit per_turn 1 each target |
| adcorp | ADCorp (G13) | - | the Forge fits, swaps and takes off its mods for half the fee | needs the extension forge_fit_rate | forge_fit_rate 0.5 | sig_adcorp: forge_fit_rate 0.5 (no effects) |
| chezknov_works | Chezknov (G14) | - | less Recoil on Bursts: the Burst's second roll keeps its aim | yes, once gearNum reads the carried list (part of the piece) | recoil -1 | sig_chezknov: recoil -1, recoil_modes [burst, auto] |
| flamers | the flamer makers (H3) | - | burning ground: a hit leaves the tile burning 2 rounds; a foe starting its turn there Burns | yes, with one data row | rounds 2 | sig_flamer: zone on hit with_this kind burning_ground within 0 rounds 2; condition burning on turn_start actor foe actor_in_zone (Hallow's pattern); one data row: zone kind burning_ground |
| rotary_and_belt_fed | the rotary makers (H4) | - | Spin Up: keep firing and the next turn's Burst or auto costs 1 AP less; stop and it spools down | yes | ap -1 | sig_spin: mark fired on acted with_this; turn_end mark spun flag fired, clear spun no_flag fired, clear fired; cost_mod attack with_this mode auto burst flag spun -1 |
| anti_materiel | the anti-materiel makers (H5) | - | the line hit: half the hit goes on to the units on the line past the target, within 3 | needs S14 targets.past | share 0.5, within 3 | sig_through: deal on hit with_this an amounts block kind damage per event:amount 0.5 armour full, targets of self shape line past true within 3 |
| thrown | the thrown makers (H8) | - | throw one, the second this turn costs 1 AP less (never under 1) | yes | ap -1 | sig_thrown: mark threw on hit with_this mode thrown; cost_mod throw flag threw -1 min 1 per_turn 1; clear on turn_end |
| power_gauntlets | the door knocker (hellraiser_door_knocker) | momentum | its push leaves the row's grant for its own modifier row, freeing the grant for Door Key | yes, by a data move | push `weapons.json:items[hellraiser_door_knocker].grants.effect.value` | variant_mods gains mod_knocker: displace on hit with_this hostile tiles (today's count); the row's grants becomes cover_damage_mult (a share) |
| rocket_tubes | the throwaway tube (legion_throwaway_tube) | - | single use: once a fight, back after the fight | yes |  | mod_throwaway: mark spent on acted with_this; cancel on attack with_this flag spent, why "The tube is spent." |
| blackpoint_wall_gun | the wall gun (held: not shipped, rules 1.93 item 8104) | - | fires only from Prone | yes, the row can ship |  | mod_wall_gun: cancel on attack with_this self_lacks prone (conditions.json:295) |
| thrown_darts | the darts (throwing_darts, second skill Ingenuity 3) | - | Toxin on a hit with Ingenuity 3 | yes, with one data row | ingenuity 3 | mod_darts: condition toxin on hit with_this self_skill ingenuity 3 target_alive; one data row: condition toxin (Weakened's shape) |
| central_command_arsenal | Arsenal (G15, carried today) | - | reload 1 AP less (kept) | yes (today) |  | mod_line_arsenal (items.json:1815) moves from each row's variant_mods to the family's signature |
| smetanita_sidearms | Smetanita (G16, carried today) | pressure | a hit lays 1 Pressure, once a turn a foe (kept) | yes (today) |  | mod_line_smetanita (items.json:1835) moves to the family's signature |

---

## 4. Perks

### 4.1 The rules (`rules`)

- **The step** (`rules.restep`): tier I `0.15`, tier II `0.3`; a d20 term `2` (I) and `3` (II), the squad's one ambush roll `4`. a conditional damage or defence perk is +15% at tier I and +30% at tier II while its condition holds: more than a sixth is seen on the next hit. A d20 term under +2 is a twentieth and goes to +2 (I) and +3 (II); the squad's one ambush roll a fight goes to +4 at II. Every perk reads these by name (`@gear_perks.rules.restep.tier_ii`): one copy.
- **The felt bar:** a per-point line is judged by its sum on the sheet (Athletics 3 is +3 Defense), never one point alone (critic-player-2 14); a perk is judged alone.
- **A door's own** (ruling 30): a sum term counts on a door's cash-out only when its item is the door's own: a perk of one of the door's three skills (acquired or Mastered), an achieved perk one of whose skills is the door's and whose text names the door's output, the door's forks and class moves (ruling 30). Everything else (traits, boons, mods, signatures, properties, achieved and ultimate perks of no door) counts on plain hits only: its term says scope plain and the profiles it reaches (hits).
- **One mark:** a foe carries one mark at a time (@scale.stack.scope.foe_mark); a new mark replaces the old (a condition slot "mark"); a damage mark is worth the mark share to the whole squad and reaches every cash-out; a to-hit mark (Footnote, Fed) fills the same slot. Read (information) and the Chaplain's judged (where interventions land) are not marks.
- **MP prices:** `rules.mp_restate` = 0.5: a perk's MP price is today's x this, then x mp(L) on the mp cost rule (@scale.costs.rules.mp): the pool is smaller than today's, and a price is a choice at every level.
- **No perk is cut:** no perk above the step is cut (Righteous keeps its numbers): a reward is not taken back; the marks are the one number that falls (Judgement Day and True Name), and their holders get the re-pick.
- **Dead today** means it gives nothing in Survival (the only open mode, `data/modes.json`): each keeps its story half and gets a fight half from existing pieces (ruling 21; `fight_half` in the JSON).

### 4.2 Acquired perks (`perks`, kind acquired)

| id (line) | skill | own door | verdict | feeds | today | tier I | tier II | alone (ruling 32) |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| bulwark (23) | durability | guard | restate, scoped | sum | +2% weapon damage a Guard held, to +10%; II +3% to +15% | the Guard door's blows (Slam, Retort, shield blows) +5% a plate held, to +15% at 3 plates [per_plate 0.05, top `@gear_perks.rules.restep.tier_i`] | +6% a plate, to +30% at 5 plates [per_plate 0.06, top `@gear_perks.rules.restep.tier_ii`] (sum: guard `@gear_perks.rules.restep.tier_ii`) |  |
| shrug_it_off (151) | durability | guard | restate, scoped | sum | hurt by a blow: +8% weapon damage to your next turn's end; II +12% and +1 Guard once a round | hurt by a blow: the Guard door's blows +15% to your next turn's end [value `@gear_perks.rules.restep.tier_i`] | +30%, and +1 plate once a round [plates 1] (sum: guard `@gear_perks.rules.restep.tier_ii`) |  |
| numb (318) | pain_threshold | guard | restate | margins | an injured limb no penalty; II with Guard, a critical on you lands as an ordinary hit, no injury | one injured limb no longer holds you back (kept) | with plates up, a hit on you counts no Margins and leaves no injury (margins_taken: all) |  |
| still_standing (462) | pain_threshold | guard | keep | verb | a last turn at 3 / 5 AP, once a fight |  |  |  |
| second_wind (566) | pain_threshold | guard | keep | hp | 2 AP once a fight: heal 25% of max HP; II +2 Guard |  |  |  |
| close_guard (699) | pain_threshold | guard | keep | verb | Answer: 25% / 50% of a blow on an adjacent ally comes to you; plates soak |  |  | alone it never fires; the wall has nobody beside it to cover (a reaction, not a door step: no point bought for the top is lost) |
| wind_on_the_skin (828) | sensory | guard | keep | verb | fight start: the nearest / every unseen foe's tile in Vision |  |  |  |
| bedside_manner (907) | sensory | guard | rewrite, fight half | verb | story: learn whether the next words are a lie (narrator) | fight: a foe next to you that you touch (0 AP, once a fight) is Read (conditions.json read) | once a turn |  |
| read_the_air (977) | sensory | guard | rewrite, fight half | verb | story: +2 / +4 on the next social roll (narrator) | fight: a foe next to you saves against your next Call 2 harder (roll_mod on save, once a turn) [tn `@gear_perks.rules.restep.roll_i`] | 3 harder [tn `@gear_perks.rules.restep.roll_ii`] |  |
| tremor (1057) | sensory | guard | restate | to_hit | +1 / +2 to the squad's ambush roll; never caught; II starts with 2 Guard | +2 to the ambush roll; never caught by its failure [ambush `@gear_perks.rules.restep.roll_i`] | +4, and 2 plates when a fight starts (kept) [ambush `@gear_perks.rules.restep.roll_wide`, plates 2] |  |
| breaching_strike (1167) | raw_power | momentum | keep | verb | after a Finisher drops a foe the next Strike or Opener costs no Momentum; II a Finisher on an Elite or Boss gives 1 Momentum |  |  |  |
| iron_grip (1354) | raw_power | momentum | restate, trimmed | sum | Grappled / Bound cannot Answer; +6% melee vs Grappled or Prone; II +12% (also Shaken, Afraid), push +1 | held foes cannot Answer or react; your melee blows +15% on a Grappled or Prone foe, every blow but a Finisher [value `@gear_perks.rules.restep.tier_i`] | +30% (also Shaken, Afraid); pushes 1 tile further (kept) [push_tiles 1] (sum: plain melee `@gear_perks.rules.restep.tier_ii`; a plain-hit term, so it never reaches the Coup) |  |
| into_the_dark (1480) | guts | momentum | keep | verb | no Ambush bonus on you after first stepping into unseen ground |  |  |  |
| steady (1561) | guts | momentum | keep | verb | Fear cannot stop you; II Fear and Nausea at most 1 round |  |  |  |
| point_man (1650) | guts | momentum | restate | verb | allies within 3 roll Fear with your Guts; II +1 Heart saves (data: tiers.II.effects[1].value) | you and allies within 3 save against Fear with your Guts | and +2 on those Heart saves [save `@gear_perks.rules.restep.roll_i`] | alone it is your own Fear save on Guts, and +2 on your Heart saves (ruling 32: an ally includes yourself) |
| unflinching (1770) | guts | momentum | restate | to_hit | at 3+ Momentum, melee attacks on you -1; II shots too | at 3+ Momentum, melee attacks on you -2 [to_hit_on_you -2] | every weapon attack on you -2 [to_hit_on_you -2] |  |
| grim_reaper (1884) | intimidation | momentum | keep | verb | a Shaken or Afraid foe's hit costs no Momentum; II a kill frightens within 8 |  |  |  |
| marrow_talk (2108) | intimidation | momentum | rewrite, fight half | verb | story: a failed threat Shakes; II in a fight a saved Threaten still Shakes 1 round | a saved Threaten still Shakes 1 round (II's fight half moves down) [rounds 1] | Shaken 2 rounds [rounds 2] |  |
| stare_down (2240) | intimidation | momentum | keep | verb | fight start: the nearest foe saves or loses its first turn; II Shaken 3 rounds |  |  |  |
| bone_talk (2359) | intimidation | momentum | rewrite, fight half | verb | story: a truthful answer or Shaken (narrator) | fight: 0 AP, once a fight, a foe next to you makes a Heart save or is Shaken 2 rounds and Read (grant_action, condition) [rounds 2] | every foe within 3 [within 3] |  |
| wall_run (2449) | athletics | pressure | keep | verb | vault 2 / 4 tiles at no extra movement |  |  |  |
| roll_with_it (2524) | athletics | pressure | keep | verb | a miss on you: 1 / 2 free tiles |  |  |  |
| untouchable (2598) | athletics | pressure | keep | verb | no torso armour (II light): attacks on you roll twice, take the worse |  |  |  |
| catch (3400) | athletics | pressure | keep | verb | catch a throw; back for 1 / 0 AP |  |  |  |
| both_hands (2706) | dexterity | pressure | restate, scoped | sum | +1 Pressure on a Pressed foe, +5% vs Pressed; II +1 more on Suppressed, +5% more vs Suppressed | the pips kept; the Pressure door's Dexterity hits +15% on a Pressed foe [value `@gear_perks.rules.restep.tier_i`] | +15% on Pressed, +30% on Suppressed [pressed `@gear_perks.rules.restep.tier_i`, suppressed `@gear_perks.rules.restep.tier_ii`] (sum: pressure `@gear_perks.rules.restep.tier_ii`) |  |
| running_reload (2923) | dexterity | pressure | keep | verb | a hit on a Pressed foe puts it Off Balance (save; II none) |  |  |  |
| rounding_up (3057) | reaction_speed | pressure | keep | verb | a fraction of an AP rounds up; II 1 AP carries once a fight |  |  |  |
| shoot_first (3135) | reaction_speed | pressure | keep | verb | act in a failed ambush's free turn at 3 / 4 AP |  |  |  |
| cut_in (3219) | reaction_speed | pressure | rewrite, fight half | verb | story: interrupt once / twice a scene (narrator) | fight: once a fight, when a foe you see starts an action, 1 free AP first: a move, a swap or a reload (the interrupt op) [ap 1] | 2 AP [ap 2] |  |
| speed_load (3291) | reaction_speed | pressure | keep | cost | reload 1 AP less; II a draw-attack free once a fight |  |  |  |
| sleight_of_hand (3496) | ingenuity | shadow | restate | sum | +8% / +14% while Hidden | +15% while Hidden [value `@gear_perks.rules.restep.tier_i`] | +30% while Hidden (sum: shadow `@gear_perks.rules.restep.tier_ii`) |  |
| shadow_step (3588) | ingenuity | shadow | keep | cost | a Hidden attack holding Shadow 1 AP less; II Shadow Run |  |  |  |
| jury_rig (3789) | proficiency | shadow | keep | verb | a Figment of yours destroyed: +1 AP; II +1 charge |  |  |  |
| field_repair (3949) | proficiency | shadow | restate | hp | 2 AP: clear a jam, restore durability, repair 15 (profile repair) | repair on the factor, on the mend column (profile repair) [repair `perks.json:items[field_repair].amounts.repair.base` x `@scale.factor.value`] | no spare part (kept) |  |
| hot_swap (4047) | proficiency | shadow | keep | cost | one / two free swaps a turn |  |  |  |
| tuned (4145) | proficiency | shadow | keep | verb | the main hand never jams or breaks; II a core 1 AP less |  |  |  |
| got_you_in_my_sight (4232) | vigilant | shadow | keep | verb | +2 AP when a seen foe hides (every 3 turns) |  |  |  |
| eyes_in_the_back (4330) | vigilant | shadow | keep | verb | cannot be flanked; II allies next to you too |  |  | alone tier I is whole; tier II has nobody beside you |
| read_intent (4404) | vigilant | shadow | keep | verb | your Spot Reads its target; II +1 Shadow |  |  |  |
| detectives_eye (6034) | vigilant | shadow | keep | verb | The Tell: a trap or a weak point at fight start (one / two) |  |  |  |
| hold_the_stroke (4541) | brain_power | sigils | restate | sum | Sigils +6% / +12% vs a conditioned foe | Sigils +15% on a conditioned foe [value `@gear_perks.rules.restep.tier_i`] | +30% (sum: sigils `@gear_perks.rules.restep.tier_ii`) |  |
| parallel_thought (4660) | brain_power | sigils | keep | cost | the first glyph a turn -0.5 AP; II no Flux |  |  |  |
| footnote (4809) | rumination | sigils | restate | to_hit | once a fight, allies +1 / +2 to hit one foe for the round | the foe carries your Footnote mark for the round: the squad, you included, +2 to hit it (mark Footnote: to_hit `@gear_perks.rules.restep.roll_i`) | +3, and your own Sigils count it (mark Footnote: to_hit `@gear_perks.rules.restep.roll_ii`) |  |
| lab_coat (4905) | rumination | sigils | keep | verb | +3 saves vs known chemicals; II neutralise |  |  |  |
| index (4988) | rumination | sigils | rewrite, fight half | verb | story: one true answer; II +2 next Brain save | in a fight, once, 0 AP: one foe's resistances and saves are shown (Analyze's reveal, no AP) | and the +2 Brain save (kept) |  |
| proven_formula (5108) | rumination | sigils | keep | verb | +3 / +5 saves vs what already hit you |  |  |  |
| overruled (5170) | eloquence | sigils | keep | verb | +2 AP while a foe carries your Brain debuff |  |  |  |
| objection (5265) | eloquence | sigils | rewrite, fight half | verb | story: expose a contradiction (narrator) | fight: 0 AP, once a fight, a foe you see makes a Brain save or is Shaken 2 rounds [rounds 2] | and it loses 1 AP next turn (Off Balance) |  |
| opening_argument (5337) | eloquence | sigils | rewrite, fight half | verb | story debate before a fight: foes -1 AP in round 1 | at combat_start the foes' leader (their Elite or Boss, else the nearest) saves against your Eloquence or every foe has 1 AP less in round 1 | and your first talk each fight is 0 AP (kept) |  |
| thinking_aloud (5464) | eloquence | sigils | keep | cost | after a Call, the next Evoke 0 AP |  |  |  |
| mirage (5742) | visualization | figments | restate | sum | Figment blows +4% a Figment, to +12%; II +6% to +18% | +5% a Figment kept, to +15% (3) [per 0.05, top `@gear_perks.rules.restep.tier_i`] | +7.5% a Figment, to +30% (4) [per 0.075, top `@gear_perks.rules.restep.tier_ii`] (sum: figments `@gear_perks.rules.restep.tier_ii`) |  |
| blueprint (5876) | visualization | figments | keep | verb | a Figment kill +1 AP; II and a charge |  |  |  |
| pattern_lock (6105) | analysis | figments | keep | verb | +2 / +4 Defense vs a seen attack; II allies +1 |  |  | alone its Defense is whole; the allies' line has no one to reach |
| quick_read (6187) | analysis | figments | keep | cost | Analyze 1 AP less |  |  |  |
| read_them (6293) | analysis | figments | restate | taken | an Analyzed foe deals 15% / 25% less to your side | 15% less (kept) [taken -0.15] | 30% less [taken -0.3] |  |
| still_breath (6415) | analysis | figments | keep | verb | spot rolls on you -2 by cover |  |  |  |
| talks_broke_down (6514) | charisma | figments | keep | verb | Parley: talk them down; II +2 AP |  |  |  |
| crowd_pleaser (6593) | charisma | figments | keep | verb | one roll for a crowd, saves 2 harder |  |  |  |
| smooth (6674) | charisma | figments | rewrite, fight half | verb | story: a failed lie only raises suspicion (narrator) | fight: a foe that saves against your Persuade is -2 to hit you on its next turn [to_hit_on_you -2] | and your first Persuade each fight is 2 TN harder to save [tn `@gear_perks.rules.restep.roll_i`] |  |
| showman (6745) | charisma | figments | keep | cost | Picture 1 charge less; II a free order |  |  |  |
| shared_breath (6875) | empathy | bonds | restate, scoped | sum | Taut Thread: +6% / +12% on a Bonded foe | the Bonds door's damage on a foe Bonded to you +15% [value `@gear_perks.rules.restep.tier_i`] | +30% (sum: bonds `@gear_perks.rules.restep.tier_ii`) |  |
| lay_down_arms (6992) | empathy | bonds | restate | sum | Bitter Balm: heals you give turn 10% / 20% into Soul damage on Bonded foes | 15% of the heal [share `@gear_perks.rules.restep.tier_i`] | 30% of the heal [share `@gear_perks.rules.restep.tier_ii`] |  |
| hand_off (7199) | camaraderie | bonds | keep | verb | a friend within 1 / 3 uses your Defense |  |  | alone it has no one to lend to: it is a squad perk, and a solo player is told so on the card |
| nobody_left_behind (7265) | camaraderie | bonds | restate | mp | Stabilise 1 AP less; Downed friends take 50% less; II Raise for 36 MP | kept | Raise for the MP below, on the mp rule [mp `perks.json:items[nobody_left_behind].tiers.II.effects[2].res.mp` x `@gear_perks.rules.mp_restate`] | alone it stabilises and raises nobody but the Downed you cannot be: a squad perk, said on the card |
| steady_hands (7480) | camaraderie | bonds | restate | mp | Settle 15 MP; II Soothe 18 MP | Settle, on yourself or a friend (ruling 32) [mp `perks.json:items[steady_hands].tiers.I.effects[0].res.mp` x `@gear_perks.rules.mp_restate`] | Soothe, on yourself or a friend [mp `perks.json:items[steady_hands].tiers.II.effects[1].res.mp` x `@gear_perks.rules.mp_restate`] | Settle and Soothe take yourself as their target (ruling 32) |
| pull_together (7822) | camaraderie | bonds | restate | mp | Tug 12 MP; II Guide 15 MP | Tug a Bonded unit toward you [mp `perks.json:items[pull_together].tiers.I.effects[0].res.mp` x `@gear_perks.rules.mp_restate`] | Guide a friend, or yourself, provoking nothing [mp `perks.json:items[pull_together].tiers.II.effects[1].res.mp` x `@gear_perks.rules.mp_restate`] | Guide moves you (ruling 32); Tug pulls a Bonded foe as today |
| between_the_lines (8227) | implication | bonds | rewrite, fight half | verb | story; II your Bond +2 TN | your Bond is 2 TN harder to save [tn `@gear_perks.rules.restep.roll_i`] | 3 TN, and a foe Bonded to you is Read [tn `@gear_perks.rules.restep.roll_ii`] |  |
| veiled_insult (8313) | implication | bonds | keep | verb | Taunt once / twice a fight |  |  |  |
| quiet_thread (8478) | implication | bonds | keep | verb | never Traced; II nor your Bonded friends |  |  |  |
| open_hand (8595) | implication | bonds | keep | verb | a foe under half HP surrenders or saves |  |  |  |
| heart_overload (8680) | will_power | outbursts | restate | sum | Clenched Heart: +5% at stage 3+; II +5% at 2 and +5% more at 3+ | Releases +15% at stage 3 or higher [value `@gear_perks.rules.restep.tier_i`] | +15% at stage 2, +30% at 3 or higher [stage_2 `@gear_perks.rules.restep.tier_i`, stage_3 `@gear_perks.rules.restep.tier_ii`] (sum: outbursts `@gear_perks.rules.restep.tier_ii`) |  |
| resonance (8816) | will_power | outbursts | restate | sum | +4% a Release, to +8%; II to +12%, allies' Releases count | +5% a Release, to +15% [per 0.05, top `@gear_perks.rules.restep.tier_i`] | +10% a Release, to +30%; allies' Releases count (kept) [per 0.1, top `@gear_perks.rules.restep.tier_ii`] (sum: outbursts `@gear_perks.rules.restep.tier_ii`) |  |
| rite_in_the_field (8896) | lore_master | outbursts | keep | cost | every 5th / 3rd kill, a free Crystallise |  |  |  |
| old_tales (9292) | lore_master | outbursts | rewrite, fight half | verb | story; II upper-realm parley | upper-realm foes, Crawlers and cursed things (target_kind) are Read when the fight starts | and the parley (kept) |  |
| recitation (9382) | lore_master | outbursts | keep | verb | a Call calms 1 / 2 Strain |  |  |  |
| lore_ward (9493) | lore_master | outbursts | keep | verb | Warding Word: a friend's next Brain or Heart save gets a bonus; II the first free |  |  | Warding Word takes yourself (ruling 32) |
| flat_line (9689) | composure | outbursts | restate | to_hit | the deadliest foe -1 / -2 to hit while it sees you | -2 to hit [to_hit_on_you -2] | -3 to hit [to_hit_on_you -3] |  |
| poker_face (9768) | composure | outbursts | rewrite, fight half | verb | story -3 to lie-readers; II +2 Brain saves | +2 on Brain saves [save `@gear_perks.rules.restep.roll_i`] | +3, and the story half [save `@gear_perks.rules.restep.roll_ii`] |  |
| stand_still (9854) | composure | outbursts | keep | verb | -2 to hit you until you act |  |  |  |
| pure_heart (9953) | composure | outbursts | keep | verb | refuse one / two Mana Shorts |  |  |  |
| litany (10040) | faith | prayer | keep | cost | the first / two Hymns 1 AP less |  |  |  |
| holy_ordnance (10193) | faith | prayer | restate | sum | Sinner's Due: prayers +8% / +12% vs a foe at half HP; II also Marked or Judged foes above | prayers +15% on a foe at half HP or less [value `@gear_perks.rules.restep.tier_i`] | +30%, and on a Marked or Judged foe above half (kept) (sum: prayer `@gear_perks.rules.restep.tier_ii`) |  |
| red_line (10304) | conscience | prayer | restate | verb | +1 / +2 Heart saves; II allies +1 | +2 on Heart saves while you hold your line [save `@gear_perks.rules.restep.roll_i`] | +3; allies near you +2 [save `@gear_perks.rules.restep.roll_ii`, allies `@gear_perks.rules.restep.roll_i`] | alone tier II is your +3; the allies' line reaches no one |
| clean_hands (10400) | conscience | prayer | restate | hp | a shield of 15% / 25% of max HP for sparing | 15% of max HP (kept) [share `@gear_perks.rules.restep.tier_i`] | 30% of max HP [share `@gear_perks.rules.restep.tier_ii`] |  |
| righteous (10494) | conscience | prayer | keep | mend | prayer heals on a friend at half HP +20% / +40% |  |  | a friend includes yourself (ruling 32): your own prayer heal at half HP |
| foresight (10638) | conscience | prayer | rewrite, fight half | verb | story; II once a fight, a blow that would drop an ally within 4 leaves 1 HP | once a fight, a blow that would drop you leaves you on 1 HP | you or an ally within 4 |  |
| outclassed (10726) | authority | prayer | keep | verb | +3 AP after the first kill |  |  |  |
| rank_has_privileges (10827) | authority | prayer | rewrite, fight half | verb | story: orders obeyed (narrator) | rank-and-file foes (actor_not_tier elite, boss) are -2 to hit you while you stand [to_hit_on_you -2] | and their saves against your Calls are 2 harder [tn `@gear_perks.rules.restep.roll_i`] |  |
| five_stars (10903) | authority | prayer | keep | verb | friends bank +1 AP; II rank-and-file Shaken |  |  |  |
| commanding_voice (11017) | authority | prayer | keep | verb | +3 saves vs Silenced, Shaken, Fear; II immune to Silenced |  |  |  |

Tally (90): keep 51, restate 25, rewrite 14. Fight halves given: 14. Scoped to their own door: bulwark, shrug_it_off, both_hands, shared_breath.

### 4.3 Achieved and ultimate perks

| id (line) | kind | skills | own door | verdict | today | new | alone |
| --- | --- | --- | --- | --- | --- | --- | --- |
| charge (12412) | achieved | intimidation,athletics | - | keep | a straight move of 3+ ending by a foe: up to 3 AP free | kept |  |
| make_way (12456) | achieved | intimidation,charisma | - | keep | no opportunity attacks from foes you pass | kept |  |
| just_the_repairman (12504) | achieved | ingenuity,eloquence | - | keep | with a toolbox, 50% to stay Hidden when spotted | kept |  |
| spoon_feed (12547) | achieved | brain_power,rumination,eloquence | - | restate | 2 AP: allies +2 to hit one foe | the foe carries your Fed mark until your next turn: the squad, you included, +2 to hit it (mark Fed: to_hit `@gear_perks.rules.restep.roll_i`) | you are the squad (ruling 32): +2 to hit it yourself |
| cultured (12602) | achieved | lore_master,camaraderie | - | rewrite, fight half | +1 on two checks about art (story) | story: +2 on those checks; fight: once a fight, you or a squadmate within 3 makes a Heart save at +2 (the old song steadies) [check `@gear_perks.rules.restep.roll_i`, save `@gear_perks.rules.restep.roll_i`, within 3] |  |
| field_surgeon (12649) | achieved | proficiency,camaraderie | - | restate | Field Repair heals a living ally (text: 3 HP a point of Improvisation; data: an out-of-fight patch of 50% max HP) | Field Repair's repair amount on a living ally next to you (one copy: field_repair's number); its text drops the stale '3 HP a point' |  |
| dance_of_iron (12714) | achieved | dexterity,athletics | - | keep | a miss on you, a shot back for 1 AP | kept |  |
| cold_read (12758) | achieved | empathy,analysis | - | rewrite, fight half | story: what an Analyzed foe wants | fight: a foe you Analyze is also Read |  |
| fire_sermon (12798) | achieved | faith,eloquence | - | keep | 2 AP: your Blessings Shake foes within 4 | kept |  |
| silent_partner (12848) | achieved | ingenuity,camaraderie | - | keep | an adjacent ally hides with you | kept | alone you hide as you would; there is no partner |
| verse_of_war (12890) | achieved | implication,will_power | outbursts | keep | In verse: +1 tile and +10% to an Outburst | +10% on the Outburst cast in verse (sum: outbursts `perks.json:items[verse_of_war].effects[1].value` -1) |  |
| between_heartbeats (12937) | achieved | reaction_speed,composure | - | keep | once a fight, 2 free AP before a foe's action | kept |  |
| siege_engine (12980) | achieved | raw_power,durability | - | keep | Shove and Break 1 AP less; Guard from a Shove; unpushable | kept |  |
| dead_signal (13050) | achieved | analysis,ingenuity | - | keep | 1 AP, disable a device while unseen | kept |  |
| twin_souls (13096) | achieved | will_power,lore_master | - | restate | a third school at half strength (text: +20 MP; no number in data) | the third school's MP is a design price (scale.costs.rules.design), set where the schools are priced (soul.json); the text's '+20 MP' leaves |  |
| the_voice (13143) | achieved | authority,composure | - | keep | once a session, rank-and-file obey an order | kept |  |
| bite_the_bullet (13193) | achieved | guts,pain_threshold | - | keep | once a fight, borrowed time at 0 HP | kept |  |
| sixth_sense (13245) | achieved | sensory,vigilant | - | keep | Hidden foes within 3 revealed | kept |  |
| what_could_be (13288) | achieved | visualization,conscience | - | rewrite, fight half | story: a vision of the best outcome | fight: once a fight, 0 AP: every foe you see is Read until your next turn |  |
| war_footing (13329) | ultimate | - | - | keep | a foe ending next to you loses 2 AP (every 3 turns) | kept |  |
| last_charge (13373) | ultimate | - | - | restate | a 5+ tile charge: melee x1.5 that turn; a shield of armour value x3, at least 15 | that turn's blows +15% (a plain-hit source: it is no door's, so it does not reach a Finisher); the shield is armour value x3, at least the floor below [shield_floor `perks.json:items[last_charge].amounts.shield.base` x `@scale.factor.value`, shield_per_armour `perks.json:items[last_charge].amounts.shield_by_armour.per[0].value`] (sum: plain melee `@gear_perks.rules.restep.tier_i`) |  |
| angel_of_the_trenches (13436) | ultimate | - | - | keep | once a fight, run to a falling ally and stabilise | kept | alone there is no one to run to: a squad perk, said on the card |
| every_lie_is_a_door (13472) | ultimate | - | - | rewrite, fight half | story: walk into a guarded place | fight: you start every fight Hidden (condition hidden at combat_start) |  |
| twin_discipline (13505) | ultimate | - | - | keep | a fused Sigil and Outburst cast | kept |  |
| supreme_command (13540) | ultimate | - | - | keep | once a fight, the squad takes a 2-AP action each | kept | alone it is a 2-AP action of your own (ruling 32) |

### 4.4 The Mastered perks (`mastered`, by skill): worth a tier's wait?

The test: at skill 10 a Mastered perk must change how the character plays its door at least as much as a tier II perk does.

| skill | perk (line) | own door | verdict | worth the wait? | what it becomes | alone |
| --- | --- | --- | --- | --- | --- | --- |
| durability | last_wall (11120) | guard | restate | yes | and your plates refill to your Reach when it fires (resource guard at max) |  |
| pain_threshold | walking_wounded (11204) | guard | restate | no: its number was a tier I's | below half HP you take 30% less (it was 20%); injuries as today [taken -0.3] |  |
| sensory | skin_map (11248) | guard | keep | yes | kept |  |
| raw_power | earthbreaker (11288) | momentum | rewrite | no: a fixed blow at the chain's own cap | a Finisher row (techniques.json, the Finisher family): once a fight it spends the whole chain, and every unit in the 3x3 takes the Finisher's cash-out for the steps spent (the one copy of the Finisher rule, @body.attributes.strength.door), Prone, cover gone; allies still hit. Its handler in perks/a.ts goes |  |
| guts | nothing_left_to_fear (11343) | momentum | keep | yes | kept | alone the immunity to Fear is whole |
| intimidation | the_name_they_whisper (11409) | momentum | keep | yes | kept |  |
| athletics | never_there (11450) | pressure | keep | yes | kept |  |
| dexterity | trick_shot (11490) | pressure | restate | yes | and the Ricochet lays 1 Pressure on the second foe (it reads the door) [pressure 1] |  |
| reaction_speed | before_the_blink (11541) | pressure | keep | yes | kept |  |
| ingenuity | vanishing_act (11582) | shadow | rewrite | no: once a fight, against a door built for it | at will, for 2 AP and 3 Shadow (cost_mod res shadow): you vanish when you have built for it [ap 2, shadow 3] |  |
| proficiency | overhaul (11627) | shadow | keep | yes | its extra slot adds to Masterwork's (extraSlots) |  |
| vigilant | nothing_gets_past (11681) | shadow | keep | yes | kept |  |
| brain_power | clean_draw (11716) | sigils | rewrite | no | once a fight: the next spell up to your Reach (not 4) costs no charge and no Flux, and its Evoke 0 AP; one past your Reach is the Push (Overclock, ruling 17), not this |  |
| rumination | established_fact (11757) | sigils | rewrite | no (in a fight) | fight: once a fight, a Brain or Heart save you fail becomes a success (auto_success); the story half kept |  |
| eloquence | closing_argument (11811) | sigils | keep | yes | kept |  |
| visualization | solid_image (11864) | figments | rewrite | no | once a round, 0 AP: a Glimmer you make is a real Double until your next turn, outside your held count |  |
| analysis | case_closed (11902) | figments | restate | yes, as a mark | the Analyzed foe carries your Closed mark: the squad +20% against it (the one mark, @scale.stack.scope.foe_mark) and +2 Defense against it (kept) [defense 2] (mark Closed: `@scale.stack.scope.foe_mark.value`) |  |
| charisma | everyones_friend (11959) | figments | rewrite | dead in Survival | fight: once a fight, a rank-and-file foe that sees you makes a Heart save or surrenders (Open Hand's piece); the story half kept |  |
| empathy | threads_that_hold (11997) | bonds | restate | yes | Tending to the Bonded +50% (kept), and when alone it reads Tending yourself while you hold a Bond; Bonds hold while you are Downed | Tending yourself while you hold a Bond gets the +50% (critic-player-2 2) |
| camaraderie | many_hands (12066) | bonds | keep | yes | kept | alone it is a squad piece, said on the card; the Mender's solo line is Threads That Hold |
| implication | their_own_idea (12127) | bonds | rewrite | dead in Survival | fight: once a fight, 0 AP, a foe makes a Heart save or is Confused (conditions.json confused); the story half kept |  |
| will_power | the_twin_pays (12161) | outbursts | restate | no | and it Begins at stage 2, and its first Push (Overdraw, Will Power's Push by ruling 17) costs no Strain [stage 2] |  |
| lore_master | true_name (12202) | outbursts | rewrite | no in Survival (a run is one session) | once a fight, 0 AP: a foe you see carries your Named mark (the one mark) and its resistances and saves are shown (mark Named: `@scale.stack.scope.foe_mark.value`) |  |
| composure | still_water (12245) | outbursts | keep | yes | kept |  |
| faith | judgement_day (12284) | prayer | rewrite | changed: one mark | its next attack fails (kept), and it carries your Judgement mark: the squad gets the mark's share, where it was you x1.5 (mark Judgement: `@scale.stack.scope.foe_mark.value`) |  |
| conscience | foreseen (12335) | prayer | rewrite | dead in Survival | fight: once a fight, a foe's attack on you or an ally within 4 is undone: it deals nothing and puts nothing on (Foresight II's piece, plus cancel on cond_incoming) |  |
| authority | on_my_mark (12369) | prayer | keep | yes | kept | alone you are the one ordered: once a round, 1 AP buys an action of up to 4 AP for yourself, outside your turn (ruling 32) |

---

## 5. Margins replace the critical: every feeder (ruling 7)

The rule is `@scale.margins`. **A critical stays a word**: a natural 20, or a roll in a weapon's or technique's critical range; it lands and adds `@scale.margins.natural_20` Margins.

| feeder | today | now |
| --- | --- | --- |
| crit_mult | character.ts:853-855 (CRIT_BASE, CRIT_MAX, CRIT_PER_PERCEPTION, CRIT_PER_DEXTERITY, critMult) | gone: Perception makes a Margin bigger (@scale.margins.per_perception); Dexterity's +2% critical line goes |
| crit_damage | effects/stats.ts:42 (the stat crit_damage) | renamed margins: Margins added to a hit that lands (S1's stat line; the same readers) |
| one_shot | traits.json:2178 crit_damage_mod +25%; perks/c.ts:441 ctx.critBonus +0.25 | +1 Margin on that first shot if it hits (stat_mod margins +1 in its context); the handler's second copy goes [margins 1] |
| crit_taken | character.ts:1237 critTakenPct: Perception -10% a point, Acuity -5% a point (skills.json:2509, the skill id analysis) | renamed margins_taken; Perception's line goes; Acuity: a hit on you counts one Margin fewer at Acuity 5 and two fewer at 10 (two rows, stat_mod margins_taken -1 each; the 0.05 slope goes) [at_points [5, 10], each -1] |
| numb_ii | perks.json:318: a critical on you lands as an ordinary hit | with plates up, a hit on you counts no Margins (margins_taken: all) and leaves no injury |
| sigil_critical | sigils.json:118-122 critical; spellCritMult (sigil.ts:336, :1066) | two Margins, as a weapon's (@scale.margins.natural_20) |
| outburst_critical | classes/soul.ts:39 | two Margins (@scale.margins.natural_20) |
| crit_ranges | techniques.json:404 point_crit_min 18, :1581 and :2819 precise_crit_min 18, :2602 suppressed_crit_min 18, magic.ts:1414 Joy's 18, the weapon op aimed_crit_min (weapons.json:1770) | kept: they set the critical range, which now means two Margins; aimed_crit_min becomes the gear field crit_range with crit_range_modes [aimed] (S13, one copy; the revolver's signature uses it) |
| gambler | perks/g.ts:534-537 Double or Nothing: a success becomes a critical | kept (two Margins) |
| limb_criticals | Glass Runner +50% (traits.json:326), Crawler-Blooded -30% (traits.json:3683): a critical that injures a limb | kept: they read the word critical, not the multiplier |
| crit_word_readers | the serrated edge (items.json:493), Joy, Calm (no critical) | kept: they read crit |

---

## 6. The sum and the top of the scale (rulings 8, 29, 30)

The formula is `@scale.stack`: level, the two cards, the grade and the cash-out multiply; Margins add to the cash-out factor; everything else adds into one sum. This file owns most of the sum's sources and says **where each counts**:

- **On a door's cash-out:** the door's own terms (`rules.own_door`: its perks, its forks and class moves in the door files) and the one mark (`@scale.stack.scope.foe_mark`).
- **On a plain hit:** the same, plus every `scope: plain` term whose `hits` names the hit's profile (traits, boons, mods, signatures, properties, perks of no door). *Your gear, your run and your nature make the blows and shots that build the counter harder; the counter's cash-out is your door's own.* The damage line says which (critic-player-2 9).
- **To hit counts everywhere it rolls** (ruling 29: Margins from the best legal to-hit): properties, mods, boons, each as `to_hit` terms on the doors they reach.
- **Groups:** a perk's two tiers share a group (the checker counts tier II alone); a run's one start boon is one group; the traits are one group that keeps its best `take` (a character holds `rules.json character.creation.traits.max` traits).

**The check.** `python tools/balance/check.py` prints for each door its largest legal turn (the best cash-out with the Push, Margins from every legal to-hit term, the door's own sum and the mark) and its largest plain hit (the door's plain hit at Celestial with every plain term of its profile). Both must be at most `@scale.digits.largest_turn_l20.max`. The plain blow was the one this file's terms could push over: Last Charge and the weighted head were trimmed to a tier I's step for it (section 0). The cash-outs' room is set by each door's Bite and forks (ruling 29), in the door files.

**Boons** (`boons`; their list, worth and cap are world's): the boons' list, worth and cap are world's (survival.json); this file only says where each counts: a damage boon is a plain-hit term (no boon is a door's own), a to-hit boon counts wherever it rolls; Hot Loads and its siblings share one group because a run starts with one start boon.

| boon (line) | what it does | where it counts |
| --- | --- | --- |
| boon.edge (250) | +10% damage: a plain-hit term | plain hits of any: 0.1 |
| boon.true_aim (256) | +1 to hit, every attack | to hit on any: 1 |
| boon.sure_script (304) | Sigils +2 to hit | to hit on sigils: 2 |
| boon.steady_heart (307) | Outbursts +2 to hit | to hit on outbursts: 2 |
| start.hot_loads (332) | guns +5%: a plain-hit term | plain hits of gun,bow: 0.05 |
| start.whetted (341) | blows +5%: a plain-hit term | plain hits of melee: 0.05 |
| start.cheap_shot (359) | +8% while Hidden: a plain-hit term (a start boon is no door's own) | plain hits of any: 0.08 |
| start.bright_script (368) | Sigils +5%: a plain-hit term (a Line of two) | plain hits of sigil: 0.05 |
| start.hot_blood (377) | Outbursts +5%: a plain-hit term (an un-Pumped Release) | plain hits of soul: 0.05 |
| start.zeroed (329) | +1 to hit (one start boon a run) | to hit on pressure, shadow: 1 |
| start.balanced (338) | +1 to hit (one start boon a run) | to hit on momentum, guard: 1 |
| start.patient_eye (356) | +1 to hit (one start boon a run) | to hit on shadow: 1 |
| start.steady_line (365) | +1 to hit (one start boon a run) | to hit on sigils: 1 |
| start.clear_pulse (374) | +1 to hit (one start boon a run) | to hit on outbursts: 1 |

---

## 7. Traits (`traits`, all of `data/traits.json`)

traits.json:11-12 budget_sp_net and budget_note are a note, not a price (no row has a cost; nothing reads it): keep the note and strike its "+1 on a roll about 2 SP" clause; no trait was priced by the withdrawn budget rule (rules 1.94).

| trait (line) | verdict | today | now | numbers or term |
| --- | --- | --- | --- | --- |
| the_brightest_light (154) | keep |  | +10% a kill this fight, to +50% at five kills (the top: the per-kill share x 5, the cap in its context): a plain-hit term (kept; a plain-hit term) | plain any: `traits.json:items[the_brightest_light].effects[0].value_pct` x 0.05 |
| southern_fist (197) | keep |  | +20% unarmed or with gloves (kept; a plain-hit term) | plain melee: `traits.json:items[southern_fist].effects[1].value_pct` x 0.01 |
| pain_eater (428) | keep |  | +50% while under half HP (and +50% taken while above: the defender's side) (kept; a plain-hit term) | plain any: `traits.json:items[pain_eater].effects[0].value_pct` x 0.01 |
| oil_in_my_mind (852) | restate | 2 less HP a level (hp_per_level -2) | max HP -6%: a Pain Threshold point thinner, at every level (ruling 5 removes the per-level HP term) | hp_share `@gear_perks.rules.oil_hp_share` |
| oil_in_my_soul (946) | restate | 2 less HP a level | as Oil in My Mind; both Oils pay once | hp_share `@gear_perks.rules.oil_hp_share` |
| ghost_soldier (1344) | keep |  | +50% on the first attack from stealth each fight (kept; a plain-hit term) | plain any: `traits.json:items[ghost_soldier].effects[0].value_pct` x 0.01 |
| factory_made (1696) | restate | 10 HP a point of Improvisation | Field Repair heals you per point of Improvisation on the factor, on the mend column (a heal reads mend whatever its profile) | hp_per_point `traits.json:items[factory_made].effects[3].hp_per_point` x `@scale.factor.value` |
| raised_by_orks (1950) | keep |  | +20% melee (kept; a plain-hit term) | plain melee: `traits.json:items[raised_by_orks].effects[0].value_pct` x 0.01 |
| one_shot (2153) | restate | +25% critical damage, never more than double | Breath Held: +1 Margin on that first shot if it hits (margins_feeders.one_shot) | margins 1 |
| hollow_heart (2244) | keep |  | +10% on Outbursts: a trait is no door's own, so it counts on an un-Pumped Release, not a Pumped one (kept; a plain-hit term) | plain soul: `traits.json:items[hollow_heart].effects[1].value_pct` x 0.01 |
| humanity_first (2643) | keep |  | +15% on non-humans; it leaves the +100% pool, which goes (kept; a plain-hit term) | plain any: `traits.json:items[humanity_first].effects[0].value_pct` x 0.01 |
| demolitionist (3359) | keep |  | +30% explosive (kept; a plain-hit term) | plain weapon,thrown: `traits.json:items[demolitionist].effects[2].value_pct` x 0.01 |
| drone_handler (3409) | restate | drone 30 HP typed in the trait op and in enemies.json (spec item 370) | the trait's typed hp goes (one copy); the drone reads enemies.json companions[drone] on the factor, its HP on the column of what hits it, at its owner's level; its repair is Field Repair's | hp `enemies.json:companions[drone].hp` x `@scale.factor.value`, armour `enemies.json:companions[drone].armour` x `@scale.factor.value` |
| augmented (3453) | keep |  | the arm: +20% physical (kept; a plain-hit term) | plain melee,physical: `traits.json:items[augmented].effects[0].options.arm[0].value_pct` x 0.01 |
| crawler_blooded (3683) | restate | 10 flat (amounts.blessing_burn) | a Lumeri Blessing burns you for a share of your max HP, true damage | burn_share `@scale.costs.shares.crawler_burn` |
| moon_hunter (3856) | keep |  | +30% on the first attack on a tracked creature; it leaves the +100% pool, which goes (ruling 10) (kept; a plain-hit term) | plain any: `traits.json:items[moon_hunter].effects[1].value_pct` x 0.01 |
| beast_handler (3910) | restate | beast 60 HP typed in the trait op | the same as the drone: enemies.json companions[beast] on the factor | hp `enemies.json:companions[beast].hp` x `@scale.factor.value` |

Kept as they are (no number on the old scale): mind_without_fog, forlorn_hope, grenadiers_arm, glass_runner, blade_recluse, bottle_butts_for_eyes, the_mask, machine_faced, right_of_way, drill_echo, the_old_blood, holo_drama_addict, lunarshine, heavyworlder, born_performer, rabbits_foot, symbol_of_order, rogue_element, the_soundscape_of_the_soul, headbanger, underground_sound, worldline_fracture, lowland_born, central_city_kid, daggerfall_veteran, upper_touched, gun_nut, old_school, spray_and_pray, sigil_savant, heretic, gambler, insomniac, chain_smoker, live_to_fight_another_day, sworn_sibling, rival, wanted, company_man, field_medic, squad_anchor, born_officer, cold_case, interrogator, trench_poet, grudge_bearer, crowded_head, market_blood, cover_story, inner_ring_heir, slicer, true_believer, heavens_faithful, occultist, old_timer, pacifist, ace_pilot.

---

## 8. The free re-pick (ruling 39)

the existing re-pick (pendingRepicks, answerRepick, migrateCharacterPerks; the perkRev piece): one free re-pick of a perk step whose meaning changed; pacing owns the migration (@pacing.migration).

- **Narrowed to their own door:** bulwark, shrug_it_off, both_hands, shared_breath.
- **The marks' holders** (their damage goes to the squad as the one mark): judgement_day, true_name.
- **Every changed meaning:** bulwark, shrug_it_off, numb, bedside_manner, read_the_air, tremor, iron_grip, point_man, unflinching, marrow_talk, bone_talk, both_hands, cut_in, sleight_of_hand, field_repair, hold_the_stroke, footnote, index, objection, opening_argument, mirage, read_them, smooth, shared_breath, lay_down_arms, nobody_left_behind, steady_hands, pull_together, between_the_lines, heart_overload, resonance, old_tales, flat_line, poker_face, holy_ordnance, red_line, clean_hands, foresight, rank_has_privileges, spoon_feed, cultured, field_surgeon, cold_read, twin_souls, what_could_be, last_charge, every_lie_is_a_door, last_wall, walking_wounded, earthbreaker, trick_shot, vanishing_act, clean_draw, established_fact, solid_image, case_closed, everyones_friend, threads_that_hold, their_own_idea, the_twin_pays, true_name, judgement_day, foreseen.

---

## Critics' findings that name 07

| finding | status | how, or why not |
| --- | --- | --- |
| consistency-2 1.8, 2.1 (the vault's grade twice; Relic on maps 3 and 4) | FIXED | ruling 35: one list, pacing's; this file holds only the rule and the data form |
| consistency-2 2.2 (Cultured story only) | FIXED | a fight half: a Heart save at the d20 step, once a fight, you or a squadmate |
| consistency-2 2.4 (scope or trim) | FIXED | ruling 30 accepted scope; A8's trim applied where the checker found a plain hit over the top |
| consistency-2 4.1 to 4.5 (six digits; Snap All at Relic) | the door files' | the checker counts this file's terms and the doors'; Bites and forks are set door by door (ruling 29). The Coup: closed by Iron Grip's trim (section 0); every door passes |
| consistency-2 6.1 (the cash flag read from a condition) | FIXED | every term states its door, or scope plain with its hits, in data; `check.py` fails a term with neither (TERMS) |
| consistency-2 6.2 (a door's least use) | the door files' | a door row's least use is a key on the door (its plain), not this file's |
| consistency-2 6.3 (the grip slot in code) | FIXED | `grade_rows.slotless_default`: a data default |
| consistency-2 7.4 (the four scoped perks) | FIXED | `repick` lists them, with the marks' holders |
| player-2 2 (the solo Mender: Threads That Hold) | FIXED for 07 | Tending yourself while you hold a Bond; every ally perk says what it does alone |
| player-2 7 (07 on superseded Bites) | FIXED | no computed table here: the checker reads the door files' Bites |
| player-2 9 (scoping takes rewards off a live character's cash-outs) | FIXED | ruling 30; the card says plain hits; the re-pick covers the four perks; the migration note is pacing's |
| player-2 14 (the felt bar) | FIXED | `rules.felt_bar` |
| player-2 11 (boon cap as slots) | NOT here | the cap is world's; properties leave it (ruling 9) |

## Built from

| rule | the existing piece and data key (file) | what must change |
| --- | --- | --- |
| the grade on hit, damage, heal, shield | `rules.json rarity` (:1605-1659); `with_this`; `roll_mod`, `damage_mult`, `mend_mult`; the carried-modifier list (`effects/collect.ts:220`) | rows gain `effects`; the collector adds the instance's grade row; `combat.ts:580`, `:585`, `:1536` stop reading acc and dmg |
| grade on armour | `armOf` (`character.ts:224`) | none |
| the Masterwork mod slot | `extraSlots` (`perks/c.ts:211`) | it reads the grade; `rarity.masterwork.default_slot` |
| properties | `survival.json relic_props` (:224); `rollProps`, `propFits` (`run/power.ts`); `upgradeProblem` (`run/progress.ts:134-165`) | `prop` to `props` (S15); `cappedRarity` keeps Celestial; `runWorth` stops counting props; three armour props; `FITS` learns armour |
| the grade by map | `rewards.ceiling` (`survival.json:147`), `stageCeiling`, `cappedRarity` (`run/rewards.ts:156-164`), `vault` (:580), `relic_from_stage` (:195) | `stageCeiling(stage, purpose)`; the values are pacing's |
| mods | items.json mod rows (:283-686, :1749-1793); `roll_mod`, `damage_mult`, `cost_mod`, `resource`, `cancel`, `grant_action`, `deal`; gear fields with `_modes` (`gearNum`, `character.ts:1738`) | data only |
| the maker signature | `mod_line_arsenal`, `mod_line_smetanita`; the `variant_mods` readers | `families.json` gains `signature`; `gearNum` reads the carried list |
| perk steps, scopes, MP | each perk's `effects` / `tiers`; the predicates they use | numbers and texts ({=...} placeholders) |
| fight halves | `condition` (read, shaken, confused, hidden), `roll_mod`, `grant_action`, `targets`, `interrupt`, `auto_success`, `cancel` | data; adjudication to engine or hybrid |
| Earthbreaker | the Finisher rows (`techniques.json`) and the Finisher's cash-out (`@body.attributes.strength.door`) | a Finisher row; its handler (`perks/a.ts`) goes |
| Margins feeders | `crit_damage`, `crit_taken` (`effects/stats.ts:42`); `critMin` (`combat.ts:1644`) | renamed (S1); One Shot's second copy goes |
| where a term counts | `stackDamage` (`effects/output.ts:131`): `ctx.mults` multiply, `ctx.vs` add | each term states its door or plain scope in data (no table of conditions to doors) |
| the marks | `conditions.json` (`marked` :521); the `condition` op | S18 `slot: "mark"`; five mark rows |
| traits | amounts blocks (`per self:max_hp`), `levelled()` for companions (`data.ts:117`), the companion rows (`enemies.json companions`) | data; the typed HP leaves the trait ops |

## Needs a new primitive (names from critic-consistency-2's merged list)

| piece | smallest form | why nothing existing does it |
| --- | --- | --- |
| S1 (the stats part) | `crit_damage` renamed `margins`, `crit_taken` renamed `margins_taken` | renames: the closed list does not grow |
| S13 `crit_range` | a gear field with `_modes`, read once at the attack roll; `aimed_crit_min` becomes it | `critMin` is set by hook code and one Aimed-only op |
| S14 `targets.past` | a bool on a `line` set | nothing selects the units past the struck one |
| S15 `GearState.props` | a list in place of `prop`, migrated on load | a Celestial holds two |
| S18 a condition `slot` | `slot: "mark"`: a condition put in a filled slot replaces it | `stacks: false` refuses the same condition only |
| extension: a term's scope | a sum term states its door, or `scope: plain` with `hits`; read by `stackDamage` with S3 | today every term reaches every hit |

Extensions (one key each): `stageCeiling(stage, purpose)`, `forge_fit_rate`, `with_this` on worn armour, `FITS` armour, `extraSlots` reads the grade, `gearNum` reads the carried list, `families.json signature`, `rarity.masterwork.default_slot`.

## What re-records

| what | why |
| --- | --- |
| `test/golden/` damage tables (every `golden-damage*`) | the grade multiplies; perks re-stepped and scoped; Margins; the one sum and where it counts; the marks; mods' flat numbers become shares |
| `golden-costs*`, `costs-*.json` | mod costs, signatures' AP cuts, Vanishing Act's Shadow cost, perks' MP |
| `golden-itemops`, `golden-mods` | the grade as a carried row; signatures on families; mods' effects |
| `golden-conditions` | `toxin`; the mark rows and slot; the fight halves' conditions |
| `golden-rules` | Margins on criticals; `crit_range`; Acuity's `margins_taken`; Earthbreaker as a Finisher row |
| `test/golden/replays.json` | every seeded fight with a graded weapon, a mod, a mark or a re-stepped perk |
| `test/old-save.test.ts` and fixtures | `prop` to `props`; the re-pick (`repick`) |
| `survival-*.test.ts`, `run/power` tests | grades by map, the shelf, the vault, Celestial finds, properties out of boon room, the ADCorp fee |
| `items-b0.test.ts`, `follow-strike.test.ts` | the signatures' new home |
| `test/balance/*` | read again, never fitted |
| `tools/validate.py`, `tools/check_spec_tables.py`, the spec's rarity table and perk and trait texts | the spec first, then data |
| text-number guard; `faith-context.test.ts` cost cap; web and e2e suites that read a grade, a mod, a perk or the damage line | texts and shown numbers change; the critical's label becomes Margins |

## Open

- scale.json stack.scope.rule says a plain hit counts the terms of its weapon's door and the mark; this file reads ruling 30 as: a plain hit counts every term that reaches its profile (scope plain, hits) plus its door's and the mark. 01 to confirm the wording
- mp_restate (0.5) should be the one copy soul.json's Tending prices read (critic-consistency-2 3.2), or this file reads soul's: whichever lands first owns it
