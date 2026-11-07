# Lane B: movement, stealth, vision (pending spec text, open items, hook and data requests)

Lane B built 24 items in `packages/engine/src/perks/b.ts`, tested in `packages/engine/test/perks-b.test.ts`. The lane closed **41 coverage gaps**. It also turned 7 effects that only ran as an item's action into engine-run ones. Every effect of these items is now engine-run or ruled by the Narrator.

None of this is in the spec yet. The text below is written for the spec. The open items in section 3 should go into section 14 as new numbered items, after the last number in use when this is merged; every number in them is provisional.

## 1. Spec text: proposed for the perk and trait sections (rules 1.3)

**Into the Dark.**
- **I:** your first normal move each fight onto a tile your squad hasn't seen this fight costs 1 AP less. One Movement's worth of tiles is free. It doesn't apply to Sprint.
- **On the area map:** the first move in each zone this character hasn't moved in yet gets the same discount.
- **II:** +1 AP on your first turn in a fight in a place that causes Fear. That is either the Narrator's start-fight `fear` flag or a zone tagged `fear`. On the area map, the first move in such a zone gives the +1 AP.
- **Narrator:** describes the character striding in first.

**Wall Run.** A move may cross wall faces, low obstacles (half-cover objects) and holes as if they were floor.
- **Tier I:** at most 2 such tiles in a row. **Tier II:** at most 4.
- **Never crossable:** a door, a free-standing full-cover object (a pillar), or the inside of a building (a blocked tile whose 8 neighbours are all blocked).
- You can't end a move on a wall or over a gap.
- **II, Wall Run strike (Perks tab):** run to a tile of the run, which may be on the wall. Make one attack from there with your weapon's basic attack, then finish the move on the tile you chose. Each leg pays its own AP.
- **Story:** parkour within 3 m (I) or 6 m (II) needs no Athletics check.

**Roll With It.** A *successful dodge* is an attack against you that misses. It works once a round.
- **I:** 1 free tile. **II:** 2 free tiles.
- **Free tiles:** they cost no AP and draw no opportunity attacks. A miss on your own turn (Overwatch during your move) gives them at once. A miss on an enemy's turn gives them at the start of your next turn.
- **II also:** your next attack gets +0.1 on its critical multiplier. The bonus waits for your next turn when the miss came on an enemy's turn, and it is spent by that attack whether it hits or misses.

**Shadow Step.**
- **I:** while Hidden, a move from a tile next to cover to a tile next to cover counts half its tiles, rounded up. On the area map, sneaking from cover to cover halves the tiles for the move and for the sneak surcharge.
- **II:** when an attack reveals you, roll d20 + your Ingenuity modifier. The TN is 10 + the best notice (minion 0, soldier 2, elite 4, boss 6) among enemies who can see you, +2 for each earlier success this fight. If no enemy can see you, you stay Hidden without a roll.
  - **On a success:** you stay Hidden, but in the same Hidden entry, so no second ambush.

**Got You in My Sight.**
- **I:** an enemy you see hiding, or an enemy leaving your own sight, gives +2 AP. Once a round, and it counts toward the +3 perk AP cap.
  - **On your turn:** the AP comes at once.
  - **If your turn is still to come this round:** it is banked for that turn.
  - **If your turn has already passed this round:** nothing.
  - **The penalty:** a sneak attack that hits you costs 2 AP next turn. A sneak attack is an ambush, meaning the first attack from a Hidden entry.
- **II:** no penalty. The squad keeps the last position of an enemy that left your sight (`cb.lastSeen`).
- **On the area map:** the Narrator rules it.

**Eyes in the Back.**
- **I:** half cover next to you counts against a ranged attack from any direction: −5, labelled.
- **II:** allies next to you get the same.
- **Not built:** a carried shield's frontal cover.

**Wind on the Skin.** When a fight starts, the squad learns where enemies it can't see are. The range is the holder's Vision, ignoring line of sight.
- **Tier I:** the nearest such enemy. **Tier II:** every one.
- This is a known position, not sight: the enemy can't be targeted.

**Skin Map.** Hidden enemies within 6 tiles are revealed when there is a line to them through smoke and darkness. Walls and sight-blocking objects still stop it. This is checked at every turn start, after every move, when someone hides, and when the fight starts.

**Sixth Sense.** The same within 3 tiles, through anything.

**Never There.**
- The first move action each turn (Move, Sprint or Disengage) draws no opportunity attacks and no Overwatch.
- During any later move that turn, ranged attacks against you take −4. That means Overwatch and ranged reactions, and only during your own move (the narrow reading).

**Before the Blink.**
- **Round 1:** holders act first, in their initiative order; everyone else keeps theirs. A hidden ambush opener still goes first.
- **From round 2:** the original initiative order.
- **Reactions:** +1 a round.

**Vanishing Act.** 2 AP, once a fight.
- **The effect:** become Hidden where you stand, even in plain view. Your next attack is an ambush.
- **What reveals you:**
  - any attack, even with a silent weapon;
  - a shove;
  - a released Outburst;
  - taking damage;
  - an enemy ending a move next to you;
  - normal spotting.
- **On the area map:** once a scene, 2 AP. You are sneaking and hidden, and only someone who walks up to you can notice you.

**Charge!** Once a turn, a normal move qualifies if:
- it is 3 or more tiles;
- every step goes in the same one of the 8 directions;
- it ends next to a visible enemy, and the move closed the distance on that enemy (on the area map, a hostile NPC).

Up to 3 AP of the move is free; the rest is paid. The bank keeps the tiles bought.

**Make Way.**
- No opportunity attacks; Overwatch still fires.
- **On the area map:** neutral NPCs don't block your path. You can pass through them but not stop on them.
- **Narrator:** crowds part.

**War Footing.**
- **Combat:** an enemy that ends a move next to you loses 2 AP at once. This applies once per enemy a turn, and not to a Disengage or a forced move.
- **Story:** a failed Intimidation check costs nothing. There is no complication, and a natural 1 counts as an ordinary failure. The engine sets `roll.fumble = false` and `roll.noCost = true` and tells the Narrator. The same target can't be intimidated again that scene: the check fails automatically.

**Last Charge.**
- **The trigger:** a straight charge of 5 or more tiles at an enemy, by Charge!'s rule (a normal move).
- **Melee:** your melee hits for the rest of that turn deal ×1.5.
- **The shield:** max(15, 15 × Armour Class), once a fight. What is left of it goes at the start of your next turn.

**Just the Repairman.** You are spotted while sneaking and carrying a toolbox (the `toolbox` item).
- **The roll:** 50% that the observer takes you for maintenance staff, rolled as a d100 before the Ingenuity roll; 50 or less passes.
- **On a pass:** you stay hidden from that observer, and it never checks you again this scene (this fight, in combat).
- **What ends it:** attacking.

**Silent Partner.**
- **In a fight:** when you hide, the nearest ally next to you hides with you. They lose it when either of you ends a move with the two of you apart, or when you are found.
- **On the area map:** while you sneak hidden, the partner is the sneaking ally next to you (the first by id). The partner uses your Dexterity for notice range and your Ingenuity to stay hidden, and stays hidden while next to you.
- **An ambush:** it opens with both of you hidden.

**Dead Signal.** 1 AP, while in stealth: disable one electronic device within 3 tiles, silently.
- **In stealth means:**
  - in a fight, Hidden, or seen by no enemy;
  - on the area map, sneaking and hidden.
- **Lamps:** go dark.
- **Electronic locks:** open.
- **Everything else:** a camera, an alarm, a terminal or a turret is marked `disabled`, and the Narrator is told.

**Forlorn Hope.**
- **Charge:** if you end a turn closer to the nearest enemy than you started it, +2 AP are banked for next turn, under the +3 cap.
- **No Way Back:**
  - you can't Disengage;
  - you can't Retreat;
  - your armour counts as at most Class I's 5, with slot pieces included.

**Live to Fight Another Day.**
- **Disengage:** free once a turn, 1 AP after that.
- **Retreat (Perks tab):** a Sprint ending farther from every enemy you can see. 0 AP, no opportunity attacks, once a fight.
- **After either:** Withdrawing (+2 Defense until your next turn ends).
- **Yellow:** allies within 3 tiles, not you, take −1 on saves against Fear.

**Drill Echo.**
- **Best Time:**
  - Sprint costs 1 AP less.
  - On a running, climbing or endurance check, the d20 can't roll below 10. That means a check with Athletics or an Endurance skill, or one tagged `running` or `climbing`. A natural 20 still crits.
- **The Count:** before any Brain Power or Rumination check (combined checks too), roll a d6. On a 1 the check fails automatically.
- **Sigils:** before a glyph is drawn, roll a d6. On a 1 the AP is spent, no glyph appears and no charge or Flux is used. Story-mode glyphs go through the same draw.

**Ghost Soldier.**
- **Unseen:** your first attack from stealth each fight (an ambush) deals ×1.5. The Narrator is told that it made no sound.
- **The arm:** the prosthetic arm is a start item.
- **The War Never Ended:**
  - **Resting in a settlement** (a short or long rest flagged settlement) takes a Vigilant check against TN 12. On a failure you get no rest benefit.
  - **Stealth broken:** −2 AP next turn. That means being spotted, being touched, or taking damage while Hidden, but not your own attack or throw.
  - **Skills:** −1 Eloquence, Charisma, Implication and Composure.

**Lowland Born.**
- **Concrete Forest:** in a zone tagged `urban` or with terrain `ruins` or `urban`, +1 Movement. The Narrator gives you one way out.
- **Open Sky:** in terrain `open`, −2 Vigilant. The story side is the generic skill_mod; in a fight it is a stat answer. In a fight you also spot Hidden enemies only within half your Vision ("half Detection Range").

## 2. Provisional numbers and readings (for section 14)

1. **Into the Dark I:** the free part is 1 AP (one Movement of tiles), once a fight. It doesn't apply to Sprint (audit problem 1). "Unexplored" is a tile the squad hasn't seen this fight; on the area map, a zone this character hasn't moved in yet. The first zone counts as new.
2. **Wall Run:**
   - **Runnable tiles:** map walls with at least one open neighbour, half-cover objects, and objects whose kind contains hole, pit or gap. Never doors or free-standing full-cover objects.
   - **The II strike:** your weapon's basic attack (shot, or melee with a melee weapon).
3. **Roll With It:** once a round, and the tiles are deferred off your turn (audit problems 2 and 3). The II crit bonus is spent by the next attack, hit or miss.
4. **Shadow Step II:** TN 10 + best notice + 2 per earlier success; no new ambush (plan 6a-8, GAMEBREAKING fix). No witness: stays Hidden.
5. **Got You in My Sight:**
   - once a round;
   - nothing if your turn has already passed;
   - a sneak attack is an ambush (audit problems 2 to 4).
6. **Eyes in the Back:** an unflanked shot gets −5, but a miss by that margin doesn't hit the cover. That needs a hook: see section 4.
7. **Wind on the Skin:** range is Vision ignoring line of sight; the result is a known position only.
8. **Skin Map:**
   - It reveals Hidden enemies for the whole squad, because sight is shared. The audit's proposal was that it reveals them to the holder only; see section 4.
   - Walls stop it.
9. **Never There:** the narrow reading (−4 only during your own later moves).
10. **Vanishing Act:** any attack reveals, even a silent one (the perk wins over the silent-weapon rule). Touched means an enemy ends a move next to you.
11. **Charge!:** at most 3 AP free (the +3 cap, GAMEBREAKING fix). "At an enemy" means ending next to a visible enemy that the move closed on.
12. **War Footing:** not on a Disengage; once per enemy a turn; the Intimidation target is unmoved for the scene (anti-retry). The data says `adjudication: engine`; it should be `hybrid` (data change).
13. **Last Charge:** the shield is once a fight (the fix for the every-turn loop, GAMEBREAKING). ×1.5 melee applies for the rest of the charge turn. 5 tiles.
14. **Just the Repairman:** the `toolbox` item only. Spare parts and the field kit don't count.
15. **Silent Partner:** the nearest ally (in combat), the first by id (on the area map). The partner pays the sneak cost.
16. **Dead Signal:** a lock opens rather than jams; a lamp's hp is set to 0 so it goes dark.
17. **Forlorn Hope:** the AP is banked to next turn; the armour cap is Class I's value, 5, with slot pieces included.
18. **Live to Fight Another Day:**
   - **Disengage:** free once a turn (GAMEBREAKING fix).
   - **Retreat:** 0 AP once a fight, and it counts as the turn's Sprint. Leon chooses between this and 1 AP once a turn.
   - **+2 Dodge:** Withdrawing.
   - **Yellow:** doesn't include the holder.
19. **Drill Echo:**
   - "Endurance checks" means the Endurance attribute's skills, plus Athletics and the tags running and climbing.
   - The Count's lost action is a failed attempt.
   - An Echo reroll rerolls the d20, not the d6.
20. **Ghost Soldier:**
   - Settlement rest is Vigilant against TN 12, on short and long rests.
   - Stealth broken excludes your own attack or throw.
   - The prosthetic arm: Proficiency mods aren't designed yet (data).
21. **Lowland Born:** half Detection Range is read as spotting Hidden enemies only within half your Vision.

## 3. Missing hooks and data (for the hooks-gap agent)

1. **`move_cost` `fail` field.** Wall Run refuses an illegal run by throwing `RuleError` from inside `move_cost`. That works through `apply()`, but a `fail?: string` field that `moveUnit` returns would be cleaner.
2. **`paths()` should honour `PathOpts.noStop`.** Wall Run sets `o.noStop` to its runnable tiles; deleting `d[k]` for them would stop the UI offering tiles inside a wall as move ends. The validation in `move_cost` refuses such moves already.
3. **A `sees` hook in `unitSees`, `visibility` and `sideSees`.** Skin Map needs it to see and target through smoke and darkness within 6 tiles, for the holder only. Sixth Sense needs it to see through walls within 3 tiles for the squad. Today both only reveal Hidden enemies, so fog-of-war targeting through smoke and walls is not built.
4. **`attack_preview` `coverTile` override.** With it, an Eyes in the Back cover tile also stops a shot that misses by that margin.
5. **`stay_hidden_result` hook (story) after the roll** (`{c, npc, ok}`, `ok` mutable). With it:
   - Just the Repairman rolls its d100 only on a failure. Today the d100 is rolled before the Ingenuity roll and passes it with tn −99; the odds are the same, but a natural 1 still fails.
   - Silent Partner makes the partner lose stealth with the holder.
   - Ghost Soldier's −2 AP on the next overworld round works.
6. **`stay_hidden` `auto` field.** With it, a guard who took the character for staff never rolls again (today tn −99 still fails on a natural 1).
7. **A story-round AP hook** (`round_ap {c, ap}` in `newRound`). Needed by:
   - Into the Dark II on the area map (today the +1 comes on the first move in a fear zone);
   - Got You in My Sight on the area map;
   - Ghost Soldier's broken-stealth −2.
8. **Area-map NPC movement hooks** (NPC tokens moving and leaving sight). Got You in My Sight and War Footing's aura on the area map need them; today they only work in combat.
9. **`worldAct` pre-check.** Today it checks the full price, `apForTiles(tiles,0,mov)+extra > u.ap`, before `move_cost` can discount it. So Charge!, Into the Dark and Shadow Step can't make an otherwise-too-expensive area-map move affordable. It should price through the same `move_cost` (a dry run) or skip the pre-check.
10. **`glyph_cost` `cancel` field.** Drill Echo's Count voids the drawn glyph with a filtering accessor on `cb.glyphs` for the rest of the action. That is correct, but the `draw` fx event and the "draws X" log line still go out. A `cancel` field (AP spent, no glyph, no charge, no Flux, no fx) would be cleaner.
11. **`check_post` `noFumble` field.** War Footing sets `roll.fumble = false` in `check_result`, but the check's head line is already pushed as "CRITICAL FAIL".
12. **Dead Signal's `noticeFor`.** `worldAct` still calls `noticeFor` after the act, so the act isn't fully silent on the area map: it can trigger the once-a-round notice check. A flag that skips it is needed.
13. **`lightOf` should read `o.disabled`.** Dead Signal sets a lamp's hp to 0 meanwhile.
14. **The riot shield's frontal half cover** isn't built, so Eyes in the Back's "a carried shield's cover counts from all directions" has nothing to act on.
15. **Equip and creation refusal for Forlorn Hope.** No armour above Class I: the medic and soldier kits should be refused or dropped to Class I at lock-in, and `equip` / `sandbox/armour` should refuse it. Today the lane caps the unit's armour number instead.
16. **Data changes:**
   - War Footing `adjudication: hybrid`.
   - Eyes in the Back's `immunity: ['flanked']`: 'flanked' isn't a condition. Make it a bespoke op, or list 'flanked' in CONVENTIONS.
   - Make Way: add `reach_reaction` to the immunity list once reach reactions exist.
   - The prosthetic arm's mod slots and Proficiency gate are not designed yet.
   - Just the Repairman's text should name the toolbox item.
17. **No UI for:**
   - Wall Run strike's tile and end-tile pickers;
   - Dead Signal's object picker (it takes a `tile` or a `choice` object id);
   - Retreat's tile picker.
   The engine actions work.

## 4. Bugs found outside the lane (not fixed: not my files)

1. **`game.ts` `overworldAttack`, about line 1564.**
   ```ts
   for (const x of cbx.units) if (x.charId && x !== att && g.story.sneak?.[x.charId] && g.story.hidden?.[x.charId]) hideUnit(cbx, x, 'sneaking');
   else { att.waitRound = 2; cbx.log.push(c.name + ' attacks in the open and acts from round 2.'); }
   ```
   The `else` binds to the `if` inside the `for` loop, not to `if (hidden)`. So for every unit that isn't a hidden sneaker:
   - the attacker gets `waitRound = 2`, even in an ambush;
   - "attacks in the open" is logged once per such unit.
   An ambush opener is mostly unaffected, because it already took its round-1 turn. The `else` was meant for `if (hidden)`.
2. **`apps/web/src/screens/combat-screen.test.ts`, the Shrug It Off Perks-tab test, fails.** Shrug It Off is lane A's item (`perks/a.ts`), not lane B's.
