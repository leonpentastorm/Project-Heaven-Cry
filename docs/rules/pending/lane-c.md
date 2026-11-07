# Lane C: weapons, ammo, reactions, explosives (pending spec text, data deltas, open items)

Code: `packages/engine/src/perks/c.ts`. Tests: `packages/engine/test/perks-c.test.ts` (35 tests). Every item has at
least one test, and both tiers are tested where an item has tiers. All 20 items are engine-run now: every effect at
every tier is claimed by the lane handler, run by a generic op, or ruled by the Narrator op. The lane has no coverage
gaps left. Whatever the engine can't judge goes to the Narrator as a fight note, a pending ruling or a brief line.

Items marked **PROVISIONAL** use the audit's recommended fix (plan §6). Each needs `provisional: true` on its data
item and an open item in spec §14. Lanes run in parallel, so the open items below are numbered **C1–C24**; Lane Z
renumbers them after the last §14 item.

## Spec text (for "Shared rules for perks, traits and classes", rules 1.3)

- **"Free" weapon handling.** A reload or clear that rides on another action (Running Reload) runs the normal action
  with its AP check skipped. Every other rule of that action still applies: spare magazines, loose rounds, jams.
- **Fractional AP.** The only fractional AP in the game comes from Glyph AP (0.5–0.9). Rounding Up rounds the AP left
  after a glyph up to the next whole number, once per turn. The gained fraction counts toward the +3 perk-AP cap.
- **Catching.** A thrown item that is caught produces no blast where it was aimed. The catcher holds it as a throwable.
  Placed charges (a satchel) can't be caught.
- **Improvised traps** are map traps that belong to a side. Units on the other side don't know where they are, so they
  path through them. The trap's damage is credited to whoever set it.
- **Extra mod slots** (Gun Nut, Blade Recluse, Overhaul) are a second slot of a type the weapon already has. Two optics
  is allowed; a slot type the weapon lacks is not. Each source adds one: Gun Nut on any gun, Blade Recluse on the named
  weapon, Overhaul on a weapon it overhauled. Rarity's "+1 mod slot" (Fine, Masterwork) should use the same rule. It
  isn't built yet (core `fitMod`).
- **Upper-realm and cursed beings** (Holy Ordnance) are units of kind `upper_realm`, `cursed`, `crawler` or `celestial`,
  or units tagged `cursed` or `upper_realm`. Crawlers are cursed in the lore.
- **Ammo Hog accounting.** Every round fired costs one more round. A single shot costs 2, a burst 6 and full auto 20.
  The extra rounds are charged after the action: at the next shot's roll, a reload, a swap or the end of the turn. If
  the fight ends first, they come off the rounds carried out of it. A gun with fewer rounds loaded is emptied.

## Item rulings and provisional numbers (new §14 items)

C1. **Running Reload.** The reload costs nothing on top of the move's own AP (merge_action: the move's cost only). It
    needs a move of at least 1 tile and works once per turn. Tier II adds a separate once-per-turn jam clear. In
    combat it is a toggle on Move. On the area map it is a "Move and reload" action, because the area map's Move takes
    no toggles. PROVISIONAL.

C2. **Rounding Up (GAMEBREAKING, 6a-7).**
    - Tier I: once per turn, so it gives at most +1 AP, counted toward the +3 cap. Leon still picks between this and
      rounding movement down.
    - Tier II: banks 1 AP into the next turn once per fight, and does it automatically. It fires at the first turn end
      with at least 1 whole AP left over.
    - The area map rounds once per round. There is no story AP to carry.
    - PROVISIONAL.

C3. **Catch (6b).** Automatic, no roll, and uses your reaction.
    - It covers a throw at your own tile, or at the tile of an ally next to you.
    - You hold the item until your next turn. Throwing it back costs 1 AP at Tier I, 0 at Tier II.
    - If it isn't thrown back by the end of your next turn, it goes off in your hands, credited to the original
      thrower.
    - PROVISIONAL.

C4. **Sleight of Hand (6b).**
    - Planting needs no roll.
    - A planted grenade goes off at the start of the target's next turn.
    - A tracker Marks the target (no save) for the rest of the fight.
    - Anything else becomes a Narrator note.
    - On the area map, a planted grenade waits for that NPC's first turn in a fight.
    - "Mid-conversation" means holding the story focus. Tier I refuses it.
    - PROVISIONAL.

C5. **Jury-Rig (6b).**
    - Tier I: after the extra use the weapon is Broken again, not destroyed. The use comes back once the weapon is
      repaired. The extra strike does full damage.
    - Tier II: "Patch the drone" is new. The engine had no Field Repair for drones. It restores (10% + 5% per
      Proficiency above 3) × 2 of the drone's max HP and uses one spare-parts charge. There are no vehicles yet.
    - PROVISIONAL.

C6. **Hot-Swap (6b).** In a fight, swapping a mod costs 1 AP, like swapping a weapon. Hot-Swap makes the first swap
    of the turn free (Tier II: the first two). PROVISIONAL.

C7. **Origami Hands (GAMEBREAKING, 6a-6).**
    - Each build uses one spare-parts charge, and at most 2 of your traps can stand on the map at once.
    - Trap: 25 damage (Tier II: 37).
    - Sling: d20 + Dexterity against Defense, within throwing range, 10 × Strength physical damage.
    - Tool: a one-use plot item; the Narrator decides what it can do.
    - Story: no Proficiency check, one spare-parts charge.
    - PROVISIONAL.

C8. **Trick Shot (6b).**
    - It ignores half cover only.
    - The second target takes half of what the first target lost, at least 1, with no second armour roll.
    - The second target must be within 2 tiles of the first and in its line of sight. The default pick is the nearest,
      then the lowest HP; a `trick_shot_target:<id>` mod picks it instead.
    - A miss still uses the turn's ricochet.
    - PROVISIONAL.

C9. **Overhaul.**
    - Bench repair (out of combat) restores 100% for one spare-parts charge.
    - The extra slot is available after a long rest, once per weapon. The player picks its type by the mod they fit.
    - PROVISIONAL.

C10. **Nothing Gets Past (6b).**
     - "Hold the line" spends all whole shots of AP. Each enemy that moves draws one shot per move.
     - The whole chain runs on one reaction (the extra shots refund it).
     - Tiles not walked stay in the mover's bank.
     - PROVISIONAL.

C11. **Dance of Iron (6b).**
     - It uses your reaction.
     - It triggers on a miss, fumbles included. A shot stopped by cover doesn't count.
     - The return shot waits until the attacker's next action or the end of its turn, so it lands after a volley ends.
     - With a melee weapon in hand there is no return shot.
     - PROVISIONAL.

C12. **Holy Ordnance (6b).**
     - The blessing goes on an adjacent ally's magazine or your own.
     - It lasts until the magazine is swapped out (a reload). Tier II blesses the next magazine too.
     - The bonus goes in the target-specific bucket, capped at ×2.
     - Blessing power doesn't apply.
     - A blessing given out of combat carries into the next fight. One still loaded when a fight ends carries over too.
     - PROVISIONAL.

C13. **Gun Nut (6a-29).**
     - The 0-AP clear doesn't reset Heat.
     - The Collector check (fewer than 3 guns) is a Narrator note at session start.
     - The sell and drop Dexterity check is TN 12, and the −50% sale price is the Narrator's to apply. Both stay that
       way until the engine has sell and drop actions.
     - Kits give one gun, so a new Gun Nut breaks the trait's own downside. Leon decides which 2 extra guns the trait
       grants at creation.
     - PROVISIONAL.

C14. **Old School.**
     - Fan the Hammer fires every loaded round, each at −2 plus Recoil (−1 per earlier shot past ⌊Dexterity ÷ 2⌋).
       It is once per turn and costs 3 AP.
     - Analog bans the red dot sight (electronic), and Evoker-linked and electronic guns (weapon tags). The scope is
       glass and is allowed. The engine enforces the ban by refusing to fire.
     - PROVISIONAL.

C15. **Spray and Pray (GAMEBREAKING, 6a-13).**
     - Full auto applies Suppressed, not Pinned, with a Body save. It doesn't stack.
     - The full-auto penalty is −1 instead of −2.
     - Ammo Hog doubles every round, single shots included, as the text says.
     - Aimed shots are at −2.
     - PROVISIONAL.

C16. **One Shot (6b).**
     - The critical multiplier is ×1.5 the multiplier, so 2.0 becomes 3.0.
     - "First shot" means the first shot of the turn.
     - It ignores half cover only.
     - Tunnel Vision: Vigilant checks fail, Vigilant voice lines stay silent and the holder spots no Hidden enemies.
       Ambushes on the holder do +50%.
     - Tunnel Vision ends on the holder's next move. A scene change also ends it.
     - PROVISIONAL.

C17. **Grenadier's Arm (6b).**
     - Weights: people 80 kg, elites 100 kg, drones 15 kg, other companions 40 kg. Bosses can't be thrown.
     - Range is throwing range − ⌊kg ÷ 20⌋.
     - Damage is (10 + kg ÷ 4) × physical multiplier, to the thrown body and to whoever it lands on. The body then
       lands on the nearest free tile.
     - The throw costs the Throw AP: 2 + 1 for Strained Arm.
     - Throwing objects is the Narrator's call.
     - PROVISIONAL.

C18. **Demolitionist.**
     - The +30% applies to explosions credited to you, after armour (hurtUnit removes armour first). Explosive weapon
       hits use the data's damage_mod before armour.
     - Shaped Charge shapes: circle = the item's radius; line = 2r + 1 tiles away from you; cone = 90° and 2r + 1 tiles
       long.
     - "Detonate" on a trigger costs 1 AP.
     - The charge comes from your thrown explosives: satchel, frag or incendiary.
     - PROVISIONAL.

C19. **Blade Recluse.** Naming the weapon is free and can be redone out of combat. Kills with the named weapon's
     family add 0.25 more, stored as fractions. Lowered is blocked along with Disarmed. PROVISIONAL.

C20. **Slicer (GAMEBREAKING, 6a-17).**
     - Static devices only: doors, terminals, cameras, alarms and emplaced turrets (kind `turret`). Never mobile robots
       or people.
     - TNs: devices 12, a turret object 14. A turret unit goes by its tier: minion 12, soldier 14, elite 16, boss 20.
     - No line of sight is needed, and the range is 5 tiles.
     - A door can be opened, closed or locked until your next turn; then its lock goes back to what it was.
     - A turret unit is Puppeted for one turn.
     - Jacked In: a lightning or EMP hit, or a bot scrambler blast that reaches you, Stuns you with no save.
     - Machines get −2 to the TN to spot the Slicer in a fight, +2 notice range in the story and +2 to the stay-hidden
       TN.
     - PROVISIONAL.

## Data deltas (for the hooks-gap / data agent)

1. `perks.json` Overhaul `effects[0]`: `{op: action_cost, action: field_repair, value: 1}` should be `set: 1`.
   `value` adds 1 AP, so the generic op made Field Repair cost 3 AP. The lane claims the effect and answers
   `ap_cost:field_repair` = −1 in the meantime. If the data is fixed, the lane's claim and stat answer can go.
2. `items.json` `mod_red_dot`: add `tags: ["electronic"]`. Old School currently tests the mod's id.
3. `items.json`: a `tracker` item (a small plot or tool item, a few grams) for Sleight of Hand. Right now any pack item
   with "tracker" in its id or name counts as one.
4. `traits.json` Gun Nut: decide on the 2 extra guns at creation (Collector). Today the trait breaks its own downside
   from session 1. The lane only tells the Narrator.
5. `traits.json` Blade Recluse `effects[0]`: `context: named_weapon_family` is already there. Nothing to change.
6. `perks.json` Trick Shot `effects[1]`: `damage_mod` with `basis: half_of_hit` should become a bespoke `ricochet` op.
   The lane claims it, so this is cosmetic.
7. `skills.json`: the Proficiency 3 Field Repair unlock text ("10 HP per point to a machine") contradicts the spec's
   10% + 5%. The spec wins. Jury-Rig II uses the spec formula.
8. Mark `provisional: true` on running_reload, rounding_up, catch, sleight_of_hand, jury_rig, hot_swap, origami_hands,
   holy_ordnance, dance_of_iron, gun_nut, old_school, spray_and_pray, one_shot, grenadiers_arm, demolitionist,
   blade_recluse and slicer. Trick Shot, Overhaul and Nothing Gets Past already have it.

## Missing hooks and engine changes (for the hooks-gap agent)

1. **`throw` needs `cancel`.** Catch sets `ctx.radius = -1` so nobody is caught in the blast, but the throw still logs
   "throws a … at X · it goes off and finds no one". An incendiary still leaves its fire object on the tile. Add
   `ctx.cancel` (skip the blast and the fire) and `ctx.caughtBy` for the log line.
2. **Enemies never throw.** Catch only works against throws that reach `throwItem` from a foe: tests and future AI.
   Lane 0B lists this as not built.
3. **The volley mode in attack hooks.** `attack_preview`, `attack_roll`, `on_hit` and `on_miss` don't say whether the
   shot is a round of a burst, full auto, a weapon skill or a paired attack. Spray and Pray reads it back from `cb.fx`
   (the shot's `chain` flag and the last `volley` event), and only on the unit's own turn for previews. Add `ctx.volley`
   ('burst' | 'auto' | 'skill' | 'paired' | null) to all four. Also add a `volley_end` hook: Dance of Iron's deferred
   shot and the full-auto suppression of shots that cover stopped could then fire right away.
4. **`fireAuto` overwrites the ammo count** (`u.ammo = startAmmo - 10`). Per-round ammo changes by items made during
   the volley are lost, so Ammo Hog charges its extra 10 afterwards. An `ammo_spend` hook, `{u, n}` with n mutable,
   called once per shot and once per volley, would make this exact.
5. **An equip hook** (`equip_check` {c, item, slot, refuse}) and a **mod hook** (`mod_slots` {c, weapon, slots}) in
   core `equip()` and `fitMod()`. With them, Old School could refuse to equip banned gear instead of refusing to fire,
   and the extra slots could go through the normal Fit mod button instead of the lane's own action.
6. **Weapon skill replacement.** `weaponActions` should hide the drifter revolver's own "Fan the Hammer" when the
   holder has Old School. The trait's version replaces it. A `weapon_actions` hook, `{u, list}` with the list mutable,
   would do it.
7. **Field Repair on drones and robots.** There is no base action for it. Jury-Rig II adds "Patch the drone" at double
   strength. A base drone repair at single strength belongs to the core.
8. **Item skill mods in trap spotting.** `spotTraps` (after a move) reads `u.vigilant` points only, so the
   Vigilant −2 from Ringing Ears (Demolitionist) and the trait skill mods never reach trap spotting. Pass
   `10 + mod + u.sk.vigilant`. Tunnel Vision ends on the move itself, so One Shot needs nothing here.
9. **Rest kind on world AP.** The story has no per-turn AP carry, so Rounding Up II's carry is combat-only.
10. **SHOCK and SPARK damage type.** `magic.ts harm()` passes `dmgType` as 'elemental' or 'sigil' for these words. Slicer
    reads the last `evoke` fx event's words instead. Passing `dmgType: 'lightning'` for shock and spark would let
    `src.dmgType` carry it.
11. **Bot scrambler on a Slicer.** `blast()` stuns only robots and drones by kind. Slicer catches it through the
    `throw` hook, by distance to the tile. A `blast` hook ({by, tile, item, who[]}) would be cleaner.
12. **No sell or drop actions** exist for Gun Nut's Collector gate and sale price. When `gear/sell` and `gear/drop`
    exist, they need a `gear_part` hook ({c, item, refuse, priceMult}).

## UI notes (lane Z or a UI pass; the engine actions exist)

- Running Reload: the toggles show on the Move action (`togglesFor('combat/move')`). On the area map, "Move and reload"
  needs a tile pick.
- Catch "Throw it back", Origami Hands (trap, sling or tool), Demolitionist "Set explosive" (shape: circle, line or
  cone, and `remote` for a trigger), Grenadier's Arm "Throw someone" (a target, then a tile) and Slicer "Backdoor" (a
  device tile; for doors the choice is open, close or lock) need a tile picker and a choice picker on the Perks card.
- Sleight of Hand needs an item picker: thrown items, then pack items.
- Gun Nut, Blade Recluse and Overhaul "Fit a second mod" need a pack-mod picker on the sheet. These actions are story
  and area-map only.
- Holy Ordnance needs a "blessed" badge on the ammo readout (`u.ps['holy:bless']`).
- One Shot needs a Tunnel Vision badge (`c.state.tunnel`).
