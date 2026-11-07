# Lane A: Body, melee, damage taken (pending spec text, data deltas, open items)

Code: `packages/engine/src/perks/a.ts`. Tests: `packages/engine/test/perks-a.test.ts` (43 tests, every item, both tiers
where tiers exist). All 25 items are engine-run now, and their coverage gaps are closed. Wherever the engine can't
judge something, it goes to the Narrator through a brief line, a pending ruling or a fight note.

Every item marked **PROVISIONAL** below follows the audit's recommended fix (plan §6). For each one, the data item
needs `provisional: true` and spec §14 needs an open item. The numbering goes on from the last item 0B wrote (100).

## Spec text (for "Shared rules for perks, traits and classes", rules 1.3)

- **Ranged, for Bulwark.** Ranged means weapon shots, plus Sigil, Soul or Elemental damage from a caster who isn't
  adjacent. Area blasts (explosions, barrels, grenades) are never ranged. "Behind" means the ray from the attacker
  through the guard, carried on 1 tile (Tier II: 2). Diagonal rays are rounded. Two Bulwarks don't stack; the best one
  counts.
- **A wound** is a hit by someone that takes HP. A hit fully absorbed by a shield is not a wound. Hazards, traps,
  Bleeding and Burning are not wounds. Used to the Pain and Scar Tissue both use this definition.
- **Self-inflicted damage** never triggers the drop-to-0 savers: Mana Short, overload, Strain and Flux.
- **Drop-to-0 order:** Angel of the Trenches runs first (it needs priority < 10), then Last Wall (10), then Bite the
  Bullet (20).
- **Limb damage** (Glass Runner, Crawler-Blooded, Scar Tissue II). The engine has no hit locations, so "limb damage"
  means one of two things:
  - the hit's damage, when a critical's injury lands on an arm or a leg;
  - for Scar Tissue II, Injury resistance (d100).
- **Movement −1 on traits** becomes −0.5. Under the tiles-per-AP model, −1 at Agility 1 halves Movement. This covers
  Right of Way, Heavyworlder and Old Timer.

## Item rulings and provisional numbers (new §14 items)

101. **Shrug It Off.** The action needs a Body debuff to remove. Without one, Tier II's 1-AP shield could be repeated
     every turn (GAMEBREAKING). The shield doesn't stack and uses Healing and shields received.
     - Out of a fight, it ends a story Body condition.
     - If the condition was only narrated, it opens a pending ruling instead.
     - It never removes Marked, Augment Offline, Emplaced or Last Turn.
102. **Used to the Pain.** It triggers on the first wound only, so a hit absorbed by a shield doesn't count. Friendly
     fire doesn't count either. The AP goes through the bank, so it counts toward the next turn's +3 cap.
103. **Scar Tissue.** It stacks on wounds.
     - The reduction combined with the derived Elemental damage taken stays within the 60% cap.
     - Tier II's "limb damage" is +5 Injury resistance per stack, up to +40. Leon to confirm.
104. **Iron Stomach in the story.**
     - Tier II passes checks tagged `fear`, `nausea`, `gore`, `horror` or `disgust` automatically, and a story
       Fear or Nausea on the character ends at once.
     - Tier I ends a story Fear or Nausea at the next check or scene.
105. **Grapple.**
     - It needs no free hand. Leon decides if one is required.
     - The hold ends when the grappler moves, and the engine's source check ends it when the grappler goes down.
     - Tier II redirects 50% of the attacks aimed at the grappler to an adjacent captive, rolled d100 on the game's RNG.
     - In the story, the NPC is marked `grappled` in `npcConds` and the Narrator rules whether the hold is plausible.
     - The Fists weapon skill "Grapple" stays separate. Folding the two together is a data job (see Data deltas).
106. **Breaching Strike.**
     - "Ignores cover" has no effect, since melee already ignores cover. Recommended: drop `ignore_cover` from the
       data.
     - The wall bonus is decided by simulating the push before the roll.
     - "Wall" means a solid tile, the map edge or a movement-blocking object. A unit doesn't count.
107. **Earthbreaker.**
     - Allies in the 3×3 are hit. The user is not.
     - There is no attack roll and no critical; damage goes through attackDamage (so Pain Eater, Ork Steel and
       Augmented apply), less armour.
     - A Downed creature takes 1 death-save failure.
     - Every object with HP in the area takes its full HP as damage.
     - In the story, it is a once-per-scene Narrator ruling.
108. **Last Wall.** It holds against any source except self-inflicted damage. If it fires on your own turn, the guard
     lasts until your next turn starts, which is a whole round.
109. **Bite the Bullet.** The engine can't keep a unit "up at 0 HP", so Last Turn is played at 1 HP (with the
     `last_turn` condition shown).
     - Each hit during Last Turn is a death-save failure instead of damage: 1, or 2 on a critical. At 3 the
       character dies.
     - Any heal ends Last Turn and the character stays up.
     - Otherwise the character goes Downed at the end of the turn: this turn if it fired on their own turn, else
       their next one.
     - Bleeding and hazards do nothing during Last Turn.
110. **Siege Engine.**
     - "Knock back" covers shoves, weapon knockback and Breaching Strike. Prone from a blocked shove still lands.
     - Shove's −1 AP works now. Break's −1 AP waits on a hook (see Missing hooks).
111. **Factory Made.**
     - Field Repair heals 10 HP per Proficiency point, not per Mastery level.
     - Poison means the toxic spill hazard (immune) and any poison or suffocation condition (cancelled).
       Suffocation is otherwise the Narrator's.
     - Blessings are re-run at half power, so a healing Blessing is halved once, not twice.
112. **Glass Runner.**
     - GAMEBREAKING as written: the first Move each combat has its first 1 AP of tiles free.
     - A limb injury from a critical does +50% more damage.
     - A broken leg quarters Movement, because everyone's leg injury already halves it.
113. **Right of Way and Heavyworlder.**
     - Movement is −0.5.
     - Shove immunity doesn't block knockback.
     - Heavyworlder's "can't hide in light" works like this:
       - In a fight, Hide on a lit tile is undone at once.
       - In the story, the stay-hidden roll uses TN 99 and −99 when the character isn't in the dark, so only a
         natural 20 succeeds. Leon to decide if a natural 20 should also fail.
114. **Crawler-Blooded.**
     - A critical's arm or leg injury gives back 30% of that hit.
     - A crawler enemy can't target the holder until the holder attacks a crawler this fight. This is per holder;
       making it per squad is the alternative.
     - Climbing is the Narrator's.
     - Lumeri Blessings deal 10 true damage first. The patron counts as Lumeri when its faction is `lumeri`.
115. **Old Timer.**
     - +1 Echo at session start, so 2 in all. Everyone already starts with 1, so as written the upside did nothing.
     - Seen It All is a story action (once per session) on a waiting Rumination, Lore Master or Analysis check. The
       check resolves as a plain success, never a critical.
     - Movement is −0.5.
     - The −2 to Body skills reads `c.state.no_full_rest`. The Narrator sets it with `traitState`; a long rest or a
       new session clears it.
116. **The Brightest Light.**
     - Every foe taken out counts as one kill, bosses included.
     - A character is Crashed only if they attacked or were hurt in the fight.
     - Crashed is −2 on every d20 that uses a skill: checks, attacks, saves and initiative. Passives and death saves
       are not affected.
     - Any rest ends Crashed, short or long, and so does a session start.
     - Wear is doubled by tracking durability lost and taking the same amount again.
117. **Squad Anchor.**
     - "This turn" means the anchor's turn in progress, or its last finished turn when it isn't the anchor's turn.
     - Fixed Point counts tiles walked; forced moves don't count.
     - The bonus reaches condition saves and Defense. Death saves wait on a hook (see Missing hooks).
118. **Augmented.**
     - The pick is stored in `c.state.augment`. A "Choose your augment" action handles it until the creation screen
       does.
     - Arm is ×1.2 on weapon damage that isn't Elemental.
     - Legs stay at +1 Movement as written. Leon to decide on +0.5.
     - Maintenance is a Proficiency check vs TN 12 after every rest; on a fail the augment is offline until the next
       rest.
     - EMP sets Augment Offline for 2 turns.
119. **Raised by Orks.**
     - "Can't Read" auto-fails checks tagged `text`, `text_based` or `written`. It means in-world maps and documents,
       never the game's grid.
     - An Ork enemy can't target the holder until someone on the holder's side attacks an Ork.
     - The squad opt-in for −2 Charisma is roleplay only.
120. **Southern Fist.** "Nothing but gloves" means an unarmed main-hand weapon with no weapon in the off hand. The
     trait's +1 AP counts toward the +3-per-turn cap.

## Data deltas needed (for the data agent; then run `python3 tools/validate.py data`)

- **Provisional flags.** Set `provisional: true` on bulwark, shrug_it_off, used_to_the_pain, scar_tissue,
  iron_stomach, grapple, breaching_strike, siege_engine, pain_eater, factory_made, glass_runner, right_of_way,
  heavyworlder, crawler_blooded, old_timer, the_brightest_light, squad_anchor, augmented, southern_fist and
  raised_by_orks. Earthbreaker, Last Wall, Walking Wounded, Nothing Left to Fear and Bite the Bullet already have it.
- **effect_ops.json `damage_reduction`.** The summary should read "a fraction (0–1) of damage taken; a flat amount
  with type flat".
- **Bulwark.** `context` should become a machine form: `{ "op": "damage_reduction", "type": "ranged", "value": 0.25,
  "target": "ally", "area": "behind_self", "depth": 1 }` (depth 2 at Tier II).
- **Breaching Strike.** Drop `ignore_cover`, or redefine it.
- **Siege Engine.** `cost_mod` should become `action_cost` with `value: -1` for shove and break.
- **Movement.** Right of Way, Heavyworlder and Old Timer: `stat_mod move` value −1 becomes −0.5. Also update the
  trait text.
- **Old Timer.** Change the text to "start each session with 1 extra Echo (2)".
- **Glass Runner.** `action_cost move set 0` becomes `{ "op": "action_cost", "action": "move", "value": -1, "context":
  "first_move_each_combat" }`. `broken_leg_move_mult` becomes 0.5 on top of the normal halving (quarter Movement).
- **Grapple.** Optionally fold the Fists weapon skill "Grapple" into the perk's action.
- **Augmented.** Creation needs `Sheet.augment` (arm | eye | legs). The engine reads `c.state.augment` or `c.augment`.
  `gate_check` needs `tn: 12`.

## Missing hooks and engine changes (for the hooks-gap agent)

1. **`shootCover` and melee strikes on objects** should price their AP with `actionAp({u}, 'break', ap)`, minimum 1.
   Siege Engine already answers `ap_cost:break` with −1.
2. **The death save** in `beginTurn` should ask every unit's items, not only the Downed unit's own `statQuery`. For
   example: emit `death_save {u, add}`. Squad Anchor's "+1 on all saves" then reaches death saves.
3. **Sigil PUSH and PULL** (magic.ts `shove`) and Control-school forced movement should check
   `immune({u}, 'knockback')` and emit `forced_move`. Today Siege Engine can't stop them.
4. **`magic.ts harm()`** emits no `damage_out`. Pain Eater and The Brightest Light multiply spell damage in
   `damage_in`'s reduce phase instead, which is after armour. A `damage_out` from harm (pre-armour) would be exact.
5. **`blessing_in` power.** A handler can't change the power; `ctx.power` isn't read back. Factory Made re-runs the
   Blessing at half power with a re-entry guard. Reading `ctx.power` after the hook would let a plain multiplier
   replace that.
6. **Burst, full auto and paired attacks** spend fixed AP (`u.ap -= 3` and the like), ignoring the
   `attack_preview` AP. Southern Fist's +1 AP doesn't reach them. Shoot-cover and weapon-skill volleys have no AP hook
   either.
7. **Overworld rounds have no AP hook** (like `turn_start_pre`), so Southern Fist's +1 AP doesn't apply on the area
   map.
8. **Overworld units are rebuilt every action**, so per-fight item state isn't meaningful there. Glass Runner, Squad
   Anchor, Scar Tissue and Brightest Light wear are fight-only for now. Brightest Light's doubled wear on area-map
   attacks needs a hook where the overworld writes durability back.
9. **`rollInjury`** takes no `cb` and fires no hook. Walking Wounded, Glass Runner and Crawler-Blooded read the attack
   line rollInjury wrote ("INJURY (d6 n): side arm|leg") in `on_hit`.
   - An `injury` hook `{t, loc, side, dazed, halveMove, cancel}` would make them exact.
   - It would also let Walking Wounded tell an injury's Daze from other Dazes without reading text.
10. **Ally Field Repair (Factory Made).** "An ally can Field Repair your HP" needs actions that an item grants to
    other units, for example an `actionsFor(other)` hook. Today only self-repair exists, in combat and in the story.
11. **The story-check UI needs a check picker** for Old Timer's Seen It All (it uses the `checkId` argument), and an
    NPC field for Grapple's story action. Both were left for lane G or Z.
12. **Heavyworlder** counts as one size larger: there's no size system yet (the item answers `stat 'size'` with 1).
    Wielding heavy weapons one-handed needs `equip()` to read the trait. Both are still Narrator ops.
13. **Squad Anchor's aura ring** and **Earthbreaker's 3×3 preview** need UI. The preview already returns `tiles`
    and `targets`.
14. **Old Timer's −10% max HP** is generic, but `char/lock` mid-session sets Echo to 1 without `session_start`, so
    Seen It All's +1 Echo is missed for a character locked in mid-session.

## Web test that needs updating (web files are off-limits for this lane)

`apps/web/src/screens/combat-screen.test.ts`, test "a perk holder gets a Perks tab; picking Shrug It Off…". It used
the default action, which gave the shield with nothing to cleanse. That is the gamebreaking reading (item 101). The
fix is to give the unit a Body debuff before clicking, e.g. `G.combat!.units.find(x=>x.id===u.id)!.prone = true`
after line 296, and expect `/shrugs off/` instead of `/uses Shrug It Off/`. The shield expectation stays.
