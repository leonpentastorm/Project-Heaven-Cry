# The alpha perks revamp (proposal, 15 Nov 2026)

Status: **proposal, not built.** Nothing in `data/` or the engine is changed by this document. Written read-only against `origin/wip/feature-0.29` (commit 4dcd8ed0).

Leon's order (15 Nov 2026), verbatim: *"revamp all perks in the alpha section, make sure those 2 perk help the gate playstyle of that perk in dmg, current visualization have notthing related to figment for example"*.

## Summary

Each of the nine alpha skills opens one attribute's mechanic, its door (Classes 3.0, rules 1.29 and after). Of the 18 alpha perks today, only one (Resonance) adds damage to the playstyle its skill opens, and it is overtuned. The other 17 are defence, control, utility or other systems. Visualization's two perks, for example, drive Illusions and squad movement, and do nothing for Figments. This proposal replaces all 18 effects. Every perk keeps its id, so saves load and each held step keeps its tier. Each skill's pair pulls two different levers on its own mechanic. One is a damage multiplier under a condition the mechanic creates; the other is tempo or resource (AP, more of the meter, faster use). Each perk is +4 to +8% of that playstyle's damage at Tier I and +8 to +12% at Tier II. 17 of the 18 build today from pieces in `docs/ENGINE-HOOKS.md`. One new general primitive is asked for (P1, the door tag on spell damage). It makes two perks exact; until it is approved, both ship as fallbacks that build today. No perk asks the Narrator anything. The pieces were written as nine independent drafts. This document is the editor's pass over them: it records each change made and the reason for it.

## Today

| Skill (attr) | Gate (its door) | Perk 1 today | Helps the gate's damage? | Perk 2 today | Helps the gate's damage? |
| --- | --- | --- | --- | --- | --- |
| Durability (End) | Guard (rules 1.13) | `bulwark` Stonewall: allies behind you take less ranged damage | No: defence | `shrug_it_off` Shrug It Off: 2 AP, remove a Body debuff | No: cleanse |
| Raw Power (Str) | Momentum chain (Cut, Finishers) | `breaching_strike` Breaching Strike: a pushed target stopped by a wall is hit again at half | Barely: needs a push and a blocker, touches no Momentum | `iron_grip` Iron Grip: Grapple, no reactions; II Momentum on a held target | Partly (II only) |
| Dexterity (Agi) | Pressure (rules 1.12) | `both_hands` Both Hands: no Recoil after a melee hit | No: melee hybrid | `running_reload` Running Reload: reload while moving | No: repeats Speed Loader |
| Ingenuity (Per) | Shadow (rules 1.32) | `sleight_of_hand` Sleight of Hand: plant an item | No: repeats the door verb Plant; II is Narrator-judged | `shadow_step` Shadow Step: cover-to-cover moves at half | No: repeats Shadow Run; its stay-Hidden check is overridden by the Break |
| Brain Power (Int) | Sigil magic (rules 1.4) | `hold_the_stroke` Hold the Stroke: +1 glyph on the ground | No: never raises one spell; data stat name does not match the hook | `parallel_thought` Parallel Thought: cheaper spell while a field/trap stands | Partly: only for placed spells; both are per-item code (`perks/d.ts`) |
| Visualization (Exp) | Figments (rules 1.34) | `mirage` Mirage: false wall, figure or sound | No: the Illusion system | `blueprint` Blueprint: squad Movement on the first turn | No |
| Empathy (Ins) | Bonds and Tending (rules 1.33) | `shared_breath` Shared Breath: split a Heart debuff with an ally | No: defence | `lay_down_arms` Lay Down Arms: a Heart save or it can't attack | No: control |
| Will Power (Det) | The Outburst (rules 1.5, 1.8, 1.19) | `heart_overload` Heart Overload: free re-Begin after a Release; HP for mana | Tempo, about 2 AP a turn (too much), bespoke code | `resonance` Resonance: +10%/step to the next Release, to +20/+30% | Yes, overtuned |
| Faith (Vir) | Prayer (rules 1.6, 1.31) | `litany` Litany: +saves for allies within 3 | No: defence | `holy_ordnance` Holy Ordnance: blessed magazine vs upper-realm and cursed | No: guns only (breaks weapon-neutrality), two target kinds |

## The editor's pass: what was changed in the nine drafts

1. **Parity.** Three drafts were outside the band, and one was over it by design:
   * Faith's Unbroken Litany Tier I (the Hymn wait −1) was +2 to 5%, and nothing at Faith 8 or more, where the wait is already at its floor of 3. **Reordered:** Tier I is now the first Hymn's AP cut and Tier II adds the shorter wait, so it is +5% / +10% and never dead.
   * Ingenuity's Long Dark (+3/+5% per Shadow) was a third of its value at Ingenuity 3 to 4, where the Shadow cap is 1. **Made flat** (+8% / +14% while Hidden): it is the same at every cap, and it no longer copies Durability's per-point shape (item 2).
   * Resonance is live today at +20% / +30%. **Cut** to 4% a step, to 8% (I) / 12% (II).
   * Raw Power's pair at Tier II and Dexterity's pair at Tier II sit on classes that are already over their ceiling (the maul at 203 to 235 against 165; the Skirmisher at 159 to 161 against 145). Their numbers are in the band; the overrun is the class's, and is Question 4.
2. **The same perk twice.**
   * Visualization's Killing Dream ("+15% against a foe under half HP") and Faith's Sinner's Due Tier I ("+8% against a foe under half HP") were the same perk. Sinner's Due keeps it, because a god finishing the broken is the Chaplain's fantasy and its Tier II adds Marked/Judged. **Killing Dream is replaced by Many-Eyed Dream:** it scales with how many Figments you hold up, which is the Rigger's own choice, and it pays more for the upkeep the Figments cost.
   * Durability's Weight of the Wall and Long Dark were both "+x% per point of your own meter held". Long Dark is now flat (item 1). Many-Eyed Dream counts bodies on the field, not a meter.
   * Iron Grip, Second Clause and Sinner's Due II all mean "more against a target that has a condition". They stay, because each reads conditions its own door applies (a grapple; a Sigil word; a Mark or Judgement), so each is a set-up and pay-off inside its door, not one shared perk.
3. **Two levers a pair:** every pair below is one "hit harder when X" and one tempo or resource lever, except Will Power (stage height against chaining) and Empathy (hits against heals), which are two damage terms on different actions. No pair has two tempo levers.
4. **Built-from checked against `docs/ENGINE-HOOKS.md`** (triggers, predicates, ops, limits, stats, cost sites) and `data/conditions.json`. These were corrected:
   * Iron Grip named the conditions `bound` and `frightened`, and neither exists. **Now** `grappled`, `prone` (I) and those plus `shaken`, `fear` (II).
   * Dexterity's Pressure Point asked for a new predicate `target_res_at_least`. **Not needed:** Pressure is a field on the unit (`physical/pressure.ts` pressureOf reads `u.pressure`), so the number-block source `target:pressure` already reads it, and the number block's `steps` (`effects/amounts.ts` numberOf) give the thresholds. Builds today.
   * Running Hand wrote `uses: once_per_turn` on a `cost_mod`, but `uses` is not a field of the op. **Now** `limit {per: per_turn, n: 1}`.
   * Unbroken Litany's first-Hymn cut used the cost site `pray`, which also prices Whispers. A free Whisper would spend the cut. **Now** `if {action: [pray], ap_above: 2}`, so only a Hymn or a Miracle (3 AP) takes it.
   * Clenched Heart asked for `stage_at_least`, and Sinner's Due for `via`. Both are one missing fact: spell damage does not say which door made it. `harm()` (magic.ts:532) types an Outburst and a prayer both `soul`. The predicate word `outburst` is `src.type === 'soul'` (triggers.ts dmgIs), so it also matches prayers and a Bond's echo, and the Outburst's stage is only a term label. **Folded into P1.** The other primitives the drafts asked for were dropped: `target_hit_self` and `tech_group` (the fallbacks are fine), `toggle item#id` (Long Dark is flat now), and `release_mult_pct` in STATS (a consolidation note only).
5. **The Narrator:** no perk asks it anything (Sleight of Hand's Narrator clause goes away).
6. **Dead at launch:** none if the reducer tests below pass. Three perks are the first data use of a piece and are marked "prove it": `actor_tied` (Many-Eyed Dream, Wake of the Kill), and the kill payload carrying its technique (Keep Swinging).
7. **Text:** the names and texts were shortened, and Visualizer charge is called a charge.

## The nine skills

Numbers are provisional (`provisional: true`); texts read them through `{=placeholder}` (no digit typed into a text). "Gain" is the share of that playstyle's damage, estimated, not measured.

### Durability: Guard

**Weight of the Wall** (keeps `bulwark`). *A Guard that doesn't break puts its full mass behind every blow.*
- I: While you hold Guard, your weapon attacks deal 2% more damage for each Guard (up to 10%).
- II: 3% for each Guard (up to 15%).
- Built from: trigger `dealing`; `if {hostile: true, damage: [weapon], self_has_res: [guard]}`; op `damage_mult`, value number block `{base: 1, per: [{of: "res:guard", value: 0.02}], max: 1.10}` (the `ledger` shape). **Builds today.**
- Gain: about +5% (I) and +8% (II), at an average of about 2.5 Guard held.
- Numbers: `tiers.I.effects.0.value.per.0.value` 0.02, `.max` 1.10; `tiers.II…` 0.03, 1.15.

**Answer in Kind** (keeps `shrug_it_off`). *Every blow it takes, the wall hands back.*
- I: When an enemy's blow hurts you, your weapon attacks deal 8% more until the end of your next turn.
- II: 12% more, and the blow gives you 1 Guard (once a round).
- Built from: `damaged` `if {by_hit, hostile, self_alive}` → `mark` flag `answer` (II `and`: `resource` guard 1, `limit {per: per_round, n: 1}`); `dealing` `if {flag: answer, hostile, damage: [weapon]}` → `damage_mult` 1.08; `turn_end` `if {own_turn, flag: answer}` → `mark` clear (the `run_and_gun` pattern). **Builds today.**
- Gain: about +6% (I) and +9% (II, plus about 0.7 Guard a round that feeds Weight of the Wall).
- Numbers: `tiers.I.effects.1.value` 1.08; `tiers.II.effects.1.value` 1.12; `tiers.II.effects.0.and.0.value` 1.
- Old effects: Stonewall's cover and Shrug It Off's cleanse are defence (Question 2). Saves: the ids stay, and the steps keep their tier and get the new effect. Renaming Shrug It Off also ends its name clash with the Bulwark's rank II move.

### Raw Power: the Momentum chain

**Iron Grip** (keeps `iron_grip`). *Once you have hold of them, or have them on the floor, every blow lands full.*
- I: You gain Grapple (1 AP; Body save or Grappled; a held target can't react). Your melee hits deal 6% more to a Grappled or Prone target.
- II: 12% more, also to a Shaken or Afraid target.
- Built from: the existing Grapple grant and `forbid`, kept; `dealing` `if {actor: self, melee: true, target_has: [grappled, prone]}` (II adds `shaken`, `fear`) → `damage_mod` `value_pct`. **Builds today.**
- Gain: about +4 to 5% (I) and +9 to 11% (II).
- Numbers: `value_pct` 6 / 12. The old `redirect_attack` 0.5, the dragged state, II's Momentum on a held target and the free Throw Down are removed.

**Keep Swinging** (keeps `breaching_strike`). *The swing that drops one man is the wind-up for the next.*
- I: When one of your Finishers drops an enemy, you gain 1 Momentum.
- II: 2 Momentum, and a Finisher that hits an Elite or a Boss gives 1 Momentum.
- Built from: `kill` `if {actor: self, melee: true, mode: [coup, cleave, break, run_through, throw_down]}` → `resource` momentum 1 (II: 2); II also `hit` `if {actor: self, mode: [same], target_tier: [elite, boss]}` → `resource` momentum 1. The cap clips any surplus. **Builds today; prove** with a reducer test that the `kill` payload carries the technique for `mode`.
- Gain: about +4 to 5% (I) and +10 to 12% against crowds, +6 to 8% against Elites and Bosses (II).
- Numbers: `tiers.I.effects.0.value` 1; `tiers.II.effects.0.value` 2, `.1.value` 1. The old `amounts.slam` is removed.
- Old effects: the wall-slam fits a Maul-type weapon property better (Question 2). Saves: the ids stay. Old Iron Grip II holders lose the free Throw Down.

### Dexterity: Pressure

**Pressure Point** (keeps `both_hands`). *Once they flinch, every round finds the gap.*
- I: Your ranged attacks deal 10% more damage to a Pressed target (Pressure 2 or more).
- II: 15% more to a Pressed target, 25% to one Suppressed or Broken (3 or more).
- Built from: `dealing` `if {hostile: true, damage: [ranged]}` → `damage_mult` value `{base: 1, steps: [{of: "target:pressure", at: 2, value: 0.10}]}`; II steps `[{at: 2, value: 0.15}, {at: 3, value: 0.10}]`. **Builds today** (the source `target:pressure` reads `u.pressure`; no new predicate). The validator should hold `at` equal to `techniques.json rules.pressure` pressed/suppressed.
- Gain: about +5% (I), +9% (II).

**Keep Their Heads Down** (keeps `running_reload`). *The first shot is a warning, and it lands like two.*
- I: Once a turn, when your ranged attack hits, the target gains 1 more Pressure.
- II: Once a turn for each target.
- Built from: `hit` `if {hostile, damage: [ranged], target_alive}` → `resource` pressure 1, `target: target` (the run_and_gun shape, through resGive); `limit {per: per_turn, n: 1}` (II adds `each: target`). **Builds today.**
- Gain: about +5% (I), +9% (II); it also lifts Pressure Point's uptime.
- Old effects: Both Hands' melee-then-shoot belongs on Savoir Faire, and Running Reload repeats Speed Loader (Question 2). Saves: the ids stay. A melee build that took Both Hands now holds a ranged perk (Question 1).

### Ingenuity: Shadow

**Long Dark** (keeps `sleight_of_hand`). *The longer you wait in the dark, the deeper the knife goes.*
- I: Your attacks made while Hidden deal 8% more damage.
- II: 14% more.
- Built from: `dealing` `if {self_has: [hidden], hostile: true}` → `damage_mult` 1.08, its own label (the Break replaces only `ambush`, so this multiplies on top of it). **Builds today.** *Changed from the draft:* it was per Shadow; it is now flat (see the editor's pass).
- Gain: about +5% (I) and +8% (II); the Break is about 55 to 60% of the playstyle's damage.

**Shadow Step** (keeps `shadow_step`). *You strike out of the dark with breath left to step back into it.*
- I: Once a turn, an attack you make while Hidden and holding Shadow costs 1 AP less (at least 1).
- II: Twice a turn.
- Built from: `attack` `if {self_has: [hidden], self_has_res: [shadow]}` → `cost_mod -1, min 1`, `limit {per: per_turn, n, key: step}`. The `attack` trigger also runs on previews, so use the `speed_loader` peek/use pattern. **Builds today.**
- Gain: about +5.5% (I), +11% (II).
- Old effects: the plant and the half-cost cover move repeat the door verbs Plant and Shadow Run, so they are dropped. Saves: the ids stay.

### Brain Power: Sigil magic

**Second Clause** (keeps `hold_the_stroke`). *A wounded sentence is easier to finish.*
- I: Your Sigil spells deal 6% more to a creature that is Burning, Slowed, Corroded, Pinned, Blinded, Shaken or Silenced.
- II: 12% more.
- Built from: `dealing` `if {hostile, damage: [sigil, elemental], target_has: [burning, slowed, corroded, pinned, blinded, shaken, silenced]}` → `damage_mult` 1.06 / 1.12. **Builds today.** It also matches an elemental weapon and a lightning prayer; with P1 it reads `damage: [sigil_spell]` instead.
- Gain: about +4 to 5% (I), +8 to 10% (II).

**Running Hand** (keeps `parallel_thought`). *The first stroke of every turn is half-written before your hand moves.*
- I: The first glyph you draw each turn costs 0.5 AP less.
- II: And it adds no Flux.
- Built from: `glyph_cost` → `cost_mod -0.5, min 0, limit {per: per_turn, n: 1, key: hand}`; II adds `cost_mod` `res: flux, set: 0`, same limit key. `glyph_cost` runs on previews: use peek/use. **Builds today.**
- Gain: about +6 to 8% (I), +9 to 11% (II).
- Old effects: the ground cap and the field-gated cut are dropped. Both bespoke handlers (`perks/d.ts` about lines 76 and 105) are deleted, which shrinks per-item code. Saves: the ids stay. A trap build loses 1 to 2 ground slots (changelog line).

### Visualization: Figments

**Many-Eyed Dream** (keeps `mirage`). *Every image you hold up sees for the others.*
- I: Your Figments' blows deal 4% more damage for each Figment you keep (up to 12%).
- II: 6% for each (up to 18%).
- Built from: `dealing` `if {actor_kind: [figment], actor_tied: {kind: owned, as: from}, hostile: true}` → `damage_mult` `{base: 1, per: [{of: "ties:owned", value: 0.04}], max: 1.12}`. **Builds today; prove it:** this is the first data use of `actor_tied`, so a reducer test (a real `figment_strike`) must show that the owner's perk fires. *Changed from the draft:* it was "under half HP", a duplicate of Sinner's Due. Note that `ties:owned` also counts a Scrap Turret.
- Gain: about +6% (I) and +8.5% (II), at a typical 2 Figments out.

**Wake of the Kill** (keeps `blueprint`). *Each enemy your images drop sharpens you for the next.*
- I: Once a turn, on your turn, when your Figment kills a foe, you gain 1 AP.
- II: When your Figment puts a foe down, you gain 1 AP (next turn if not yours) and 1 charge.
- Built from: I `kill` `if {actor_kind: [figment], actor_tied: {kind: owned, as: from}, own_turn: true}` → `grant_ap 1`, `limit {per: per_turn, n: 1}`. II `downed`, the same if: with `own_turn: true` → `grant_ap 1`, with `own_turn: false` → `grant_ap 1, bank: true`; `and` `resource vcharge 1`; one shared limit key. **Builds today; prove** with the same reducer test.
- Gain: about +5% (I), +9% (II).
- Old effects: Mirage's Illusions (illusion.ts) belong on Charisma, and Blueprint's movement on Proficiency (Question 2). **The Mastered perk Solid Image works on Mirage projections.** The rewording onto Figments in spec s.114 must ship in the same change, or Solid Image is dead. Saves: the ids stay.

### Empathy: Bonds and Tending

**Taut Thread** (keeps `shared_breath`). *Their pain runs through your hands; you feel where they are weakest.*
- I: With an Attuner in hand, your hits on an enemy Bonded to you deal 6% more damage.
- II: 12% more.
- Built from: `dealing` `if {target: foe, target_tied: bond, by_hit: true, self_holds: {slot: hand, door: empathy}}` → `damage_mult` 1.06 / 1.12. **Builds today.**
- Gain: about +4% (I), +8% (II) over a half-attack, half-heal cycle.

**Bitter Balm** (keeps `lay_down_arms`). *Every wound you close opens wider in the one who made it.*
- I: With an Attuner in hand, when you heal yourself or a Bonded ally, each enemy Bonded to you takes 4% of the HP restored as Soul damage at its next turn.
- II: 8%.
- Built from: its own `amounts.balm {kind: damage, base: 0, per: [{of: "event:amount", value: 0.04}], type: soul, armour: none}`; two `deal` ops on `heal_given` (self; `target: ally, target_tied: bond`), `targets {side: foe, tied: bond}`, `delay {until: target_turn_start}`. These are copied from `tend.threads`, which is not edited. **Builds today.** Check that `event:amount` on `heal_given` is the HP restored, not counting overheal.
- Gain: about +6% (I), +12% (II).
- Old effects: Shared Breath belongs on Camaraderie and Lay Down Arms on Implication (Question 2). Saves: the ids stay.

### Will Power: the Outburst

**Clenched Heart** (keeps `heart_overload`). *You hold the climb past where it hurts, and the top hits hardest.*
- I: Your Outbursts Released at stage 3 or higher deal 5% more damage.
- II: 10% at stage 3 or higher, 5% at stage 2.
- Built from (with P1): `dealing` `if {damage: [outburst], self_holds: {slot: hand, door: emanator}}` → `damage_mult` `{base: 1, steps: [{of: "event:stage", at: 3, value: 0.05}]}`; II steps at 2 → 0.05, at 3 → +0.05. **Needs P1.** Fallback that builds today: I `stat_mod rider_stage +1`; II that plus `damage_mult 1.04` on `damage: [outburst]`. The fallback also hits prayers and the Bond echo, because `outburst` is type soul today.
- Gain: about +4% (I), +8.5% (II).
- Old effects: the free re-Begin (bespoke, `perks/d.ts` about line 197, about 2 AP a turn) and the blood-pay are dropped, and the handler is deleted. Saves: the ids stay. Holders lose the double-cast rhythm (changelog line).

**Resonance** (keeps `resonance`). *Each Release sets the next one's beat; stop and it dies.*
- I: Each Outburst you Release adds 4% to your next Release this fight, to 8%. It ends if you finish a turn without holding or Releasing one.
- II: To 12%, and an ally's Release you can see adds a step.
- Built from: the live `resonance` handler (`perks/d.ts:249`); only `stat_mod release_mult_pct` value and limit change (10/20 and 10/30 → 4/8 and 4/12). **Builds today.** It is still per-item code, so put it on the next consolidation pass's list.
- Gain: about +5% (I), +9 to 10% (II); this is a net cut from live.

### Faith: prayer

**Sinner's Due** (keeps `holy_ordnance`). *Your god finishes what it starts.*
- I: Your prayers deal 8% more damage to an enemy below half its HP.
- II: 12%, also to a Marked or Judged enemy above half.
- Built from (with P1): `dealing` `if {hostile, damage: [prayer], target_hp_below: 0.5}` → `damage_mult` 1.08; II adds a second row with `target_hp_above: 0.5, target_has: [marked, judged]` (the two rows exclude each other). **Needs P1** to be prayers only. Fallback that builds today: `damage: [soul, elemental]` (it leaks onto Outbursts and elemental Sigils).
- Gain: about +4% (I), +8% (II).

**Unbroken Litany** (keeps `litany`). *You never stop praying, so the Hymn is already on your lips.*
- I: Your first Hymn or Miracle each fight costs 1 AP less.
- II: And the wait between your Hymns is 1 round shorter (never under 3).
- Built from: `cost` `if {action: [pray], ap_above: 2}` → `cost_mod -1`, `limit {per: per_combat, n: 1}` (spent on the paid action: peek/use); II adds `stat_mod hymn_wait -1` (the stat exists; the floor is rules 1.22's). **Builds today.** *Changed from the draft:* the tiers are swapped (see the editor's pass).
- Gain: about +5% (I), +10% (II).
- Old effects: Litany's ally saves belong on Conscience (Question 2). Holy Ordnance breaks weapon-neutrality (Question 3). Delete the `litany` and `holy_ordnance` action rows and their UI chips in the same change. Saves: the ids stay.

## Needs a new primitive (for the lead to approve)

**P1. Spell damage names its door.** `harm()`'s callers tag the damage source: `src.door` is `sigil`, `outburst`, `prayer` or `bond`, and an Outburst also carries `src.stage` (its release stage). The `damage` predicate's closed word list gains `prayer` and `sigil_spell`, and `outburst` reads `src.door === 'outburst'` instead of `type === 'soul'`. That fixes a live leak: today `outburst` matches prayers and the Bond echo. `event:stage` then works through `sourceOf` with no further change. It is used by Clenched Heart, Sinner's Due and Second Clause (precision), and it cleans up Taut Thread and Bitter Balm. It replaces five requests from the drafts: `stage_at_least`, `via`, `src_spell`, `target_res_at_least` (not needed), and `tech_group`. Before building, check whether `harm()`'s callers in faith.ts (`harmLine`), magic.ts (the Release) and tending set anything usable already. `SPELL_FROM` is a tile, not a door.

Not requested: `target_hit_self` and `tech_group` (their fallbacks ship), `toggle item#id` (designed away), and `release_mult_pct` in STATS (a consolidation-pass item).

## Questions that are Leon's

1. **Saves:** the 18 ids keep their steps and get new effects silently. Should the patch instead give a one-time free re-pick of the alpha perk steps? The repo has no re-pick system. A melee Both Hands holder now holds a ranged perk.
2. **The displaced effects** (Stonewall's cover, Shrug It Off's cleanse, Breaching Strike's wall-slam, Both Hands, Running Reload, Mirage's Illusions, Blueprint, Shared Breath, Lay Down Arms, Litany's ally saves): move each onto its attribute's beta or gamma skill, which means replacing one of that skill's perks, or drop them? Recommendation: drop now, and list them in `docs/design/move-pool.md` for the beta/gamma revamp.
3. **Holy Ordnance** (a gun blessing, extra damage against upper-realm and cursed beings): drop it, or bring it back as a Survival Relic property? Recommendation: a Relic property.
4. **Ceilings:** heavy melee, the Skirmisher and the Mender already measure above their lines without these perks. Are perk steps inside a class's ceiling (trim the class: Fire Discipline, per_bond) or on top of it (trim the perks)? Recommendation: inside, trim the class.
5. **Heart Overload's double cast** is dropped as too much tempo for a perk step. Should it return as a Channeler rank move?

## Build plan

1. **Spec first:** add the next rules revision after 1.55 to `docs/rules/PHC-Core-Rules-v1.0.md`. It lists the 18 effects and their provisional numbers in spec section 14, and rewords Solid Image onto Figments (s.114).
2. **Data:** in `data/perks.json`, rewrite the 18 items in place (ids kept; `name`, `tiers.I/II.text` with `{=…}` placeholders, `effects`, `adjudication: engine`, `provisional: true`): `bulwark` (l.23), `shrug_it_off` (101), `breaching_strike` (501), `iron_grip` (579), `both_hands` (1171), `running_reload` (1249), `sleight_of_hand` (1499), `shadow_step` (1578), `hold_the_stroke` (1964), `parallel_thought` (2034), `mirage` (2446), `blueprint` (2539), `shared_breath` (2943), `lay_down_arms` (3037), `heart_overload` (3484), `resonance` (3559), `litany` (3942), `holy_ordnance` (4037). Remove the `litany` and `holy_ordnance` action rows. Run `python3 tools/validate.py data` (it must print 0 errors) and `npm run check`.
3. **Code:** delete the bespoke handlers for `hold_the_stroke`, `parallel_thought` and `heart_overload` in `packages/engine/src/perks/d.ts`; the lint baselines shrink. Keep `resonance` and change only its numbers. P1, once approved, goes in magic.ts `harm` and its callers, and `dmgIs` in effects/triggers.ts. Then regenerate `docs/ENGINE-HOOKS.md` (`tools/engine_catalog.py`).
4. **Tests (the real path, the reducer):** one test per perk that holds the step and takes a real action. Each asserts the bonus term in the damage log, or the AP, Pressure, Momentum or charge given, and asserts that nothing happens when the condition is off. The tests that must come first: `actor_tied` from a real `figment_strike`; the `kill` payload's technique for Keep Swinging; the peek/use limits for Shadow Step, Running Hand and Unbroken Litany (a preview must not spend the use).
5. **Golden tables:** `packages/engine/test/golden/` moves only where a recorded character holds one of the 18 ids (check with a grep). Re-record those on purpose, in their own commit. Resonance's cut moves any Outburst golden with it.
6. **Balance:** `packages/engine/test/balance/survival-run.ts` with each pair at Tier II on its base class. The fit decision is Question 4.
7. **Same change:** `art/briefs/ART-REQUESTS.md` (the perk icons for the 15 renamed perks, and the 3 whose names stay but whose meaning changed), `CHANGELOG.md` (each lost effect named), and the Illusion system's fate (illusion.ts stays until Question 2 is answered).
