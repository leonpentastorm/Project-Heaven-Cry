# The action price list (balance pass, instrument 3)

Written by a tool (`packages/engine/test/balance/price-list.test.ts`); run it again after any change:

```
PRICE_LIST_OUT=$PWD/docs/design/handoffs/action-price-list.md npx vitest run --root packages/engine test/balance/price-list.test.ts
```

It lists every thing a character can do in a fight, what it costs and what it buys, read from the data files and from the engine. **No number in the game was changed.** Every price is today's. Every *worth* is my proposal: the game has never said what an AP is worth, so the conversion below had to be chosen. It is one small table in the tool; change a line and every flag is worked out again.

## Summary

1. **457 actions and switches are listed**, plus 59 always-on rows that set a price (class moves that work by themselves, Outburst modules, interventions). By family: Plain attack 60, Technique 65, Pair of techniques 1, Call 29, Class move 54, Perk 59, Trait 25, Moving 11, Weapon upkeep 7, Gear 10, Basic action 13, Speaking 4, Reaction 1, Sigil magic 56, Soul magic 75, Prayer 46.
2. **The price spread:** 62 at 0 AP, 41 at under 1 AP, 106 at 1 AP, 128 at 2 AP, 70 at 3 AP, 6 at 4 AP, 23 with no single number (always on, or set by the situation). (The sample spells and Outbursts, which are several actions in a row, are not counted here.) The dearest single action is 4 AP: nothing a character does in one action costs more, while a turn is 6.
3. **242 of them have a worth in plain attacks** (184 in full, 58 in part). The rest buy position, upkeep, information or a Narrator's judgement, and are listed with their price and no flag.
4. **Against the yardstick (1 AP = half a plain attack): 29 are cheap for what they do** (1.5 times the yardstick or more) **and 60 are dear** (two thirds or less). 95 sit inside the band.
5. **The yardstick, measured:** a service rifle shot from a character with 4 points in Dexterity and Agility does **40 damage to a soldier** (60 HP) at 60% to hit, for 2 AP. "One plain attack" below means that shot landing 65% of the time. For scale, the same soldier's rifle shot does **15 damage to that character** (145 HP, armour 15 from the soldier kit) at 70%: about 10 hits to put them down, against 2 the other way.
6. **62 actions cost 0 AP.** 13 of them have no limit on how often they can be used in a turn (section "Free actions").
7. **63 ways to get AP beyond the 6 a turn, a refund or a discount** are listed and ranked (section "AP sources"). The engine caps AP gained from perks at +3 a turn and a turn at 9 AP; no source has a cooldown today.
8. **4 prices could not be read with confidence, or the data and the engine disagree** (section "Could not be read"). Those rows say so and are not flagged.

### Does the yardstick hold up?

If "1 AP = half a plain attack" is a fair yardstick, the middle action of each family should sit near 1.0× and the families should not all lean one way. Only rows priced in full and paid in AP are counted (a row that waits for a trigger, or with a part that has no number, is left out).

| Family | Rows priced in full | The middle one | Lowest | Highest | Cheap | Dear |
|---|---|---|---|---|---|---|
| Plain attacks (60 weapons) | 47 | 0.9× | 0.3× | 4× | 3 | 14 |
| Techniques, melee | 21 | 1× | 0.2× | 3.7× | 2 | 5 |
| Techniques, ranged | 21 | 1× | 0.3× | 1.6× | 1 | 4 |
| Calls, step 1 (1 point, 2 AP) | 9 | 0.5× | 0.1× | 0.7× | 0 | 9 |
| Calls, step 2 (3 points, 2 AP) | 9 | 0.5× | 0.4× | 1× | 0 | 7 |
| Calls, step 3 (7 points, 1 AP) | 8 | 1.5× | 1× | 3× | 5 | 0 |
| Class moves | 18 | 1.1× | 0.3× | 3.9× | 4 | 4 |
| Perk and trait actions | 3 | 0.8× | 0.1× | 2× | 1 | 1 |
| Sigil sample spells | 10 | 1× | 0.1× | 1.2× | 0 | 4 |
| Soul sample Outbursts | 10 | 0.5× | 0.3× | 1.2× | 0 | 6 |
| Whispers | 3 | 1.6× | 0.3× | 1.6× | 2 | 1 |
| Hymns | 9 | 1× | 0.3× | 2.7× | 1 | 3 |

Over every action priced in full (weapons aside), the middle one pays **0.9×** the yardstick. Read with the table: the yardstick holds for weapon techniques and class moves; talk (the Calls at low points, Whispers, saves) sits well under it, and that is the conversion speaking as much as the game, because every effect that goes through a save is halved and a +1 to hit is counted as a thirteenth of an attack.

### The twenty most "cheap for what it does"

Ranked by how much more they give than the yardstick pays for (worth minus half an attack per AP of full price). "Full price" is AP plus the Momentum and the reaction it spends (see the conversion). A once-a-fight or once-a-scene action is expected here: the peak rule lets a class go past the targets with its dearest move, so read those against section "Each class's dearest move".

| # | Action | Family | AP | Other costs | How often | Worth (plain attacks) | Against the yardstick | Why |
|---|---|---|---|---|---|---|---|---|
| 1 | Supreme Command | Perk · ultimate perks | 0 |  | once a fight | 3 | free | every ally takes 2 AP of free actions (about 3 allies) |
| 2 | Rally (rank III) | Class move · Bard | 2 |  | once a scene | 3.92 | 3.9× | every ally within 4 tiles heals 20 × Healing given (3 allies counted, all of them hurt; the Bard is not healed) and loses Fear and Shaken |
| 3 | Hymn II: Lightning Rod | Prayer · Hymns · Old Overcast | 3 | Devotion 5 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | 4.04 | 2.7× | An enemy you can see takes 50 lightning damage × your Blessing power. It chains to 1 more enemy within 2 tiles for half. |
| 4 | Earthbreaker | Perk · mastered perks | 4 |  | once a fight | 4.08 | 2× | your melee damage with no attack roll to everyone on 3×3 tiles (2 enemies counted) + Prone with no save; allies in the area are hit too |
| 5 | Stim Throw (rank II) | Class move · Bard | 1 | 1 Supply |  | 1.96 | 3.9× | heals 30 × Healing given at 4 tiles and ends Bleeding |
| 6 | Guard | Technique · melee · Links | 1 |  | once a turn (you stay on Guard until your next turn); the pool holds your Durability points, 5 at most | 1.85 | 3.7× | +2 Defense against melee until your next turn + 4 Guard at Durability 4 (each soaks 10 damage) |
| 7 | Brief, step 3 (7 points) | Call · Eloquence | 1 |  | a unit takes one helping Call a round | 1.5 | 3× | an ally's next actions cost 3 AP less in all |
| 8 | Heart Overload (Tier I and II): switch "Heart Overload: Begin again for 0 AP" | Perk · skill perks | 0 (rides outburst) |  | once a turn | 1 | free | a second Begin for 0 AP right after a Release at stage 2+ (2 AP saved); mana and Strain as usual |
| 9 | Between Heartbeats | Perk · achieved perks | 0 |  | once a fight (armed ahead, fires by itself) | 1 | free | 2 AP to act with when an enemy in your sight starts an action |
| 10 | Burst | Technique · ranged · Fire | 3 | 3 rounds |  | 2.46 | 1.6× | 2 shots, the second at −2 to hit · with the service rifle the engine rolls 3 times (60%, 55%, 45%): ×2.46 of its plain attack [at most: 3 shots with an automatic weapon] |
| 11 | Brace (rank I) | Class move · Defender | 2 |  |  | 1.85 | 1.8× | 4 Guard at Durability 4 (each soaks 10 damage) + 2 Defense until you move |
| 12 | Draw Cut | Technique · melee · Openers | 1 (the weapon's attack −1) | 1 Momentum (the first Opener of a fight is free); the weapon must be stowed |  | 1.5 | 2× | 1 strike + the 1 AP draw it replaces |
| 13 | Rally, step 3 (7 points) | Call · Charisma | 1 |  | a unit takes one helping Call a round | 1.25 | 2.5× | +2 AP to an ally and −1 Pressure |
| 14 | Stim an ally next to you | Basic action | 1 | 1 stim |  | 1.15 | 2.3× | heals 30 × Healing given and stops Bleeding |
| 15 | Order, step 3 (7 points) | Call · Authority | 1 | the ally's reaction | a unit takes one helping Call a round | 1.5 | 1.5× | an ally does 2 things for none of their AP (a reload is 2 AP, a move 1 AP); it uses their reaction, counted in the price |
| 16 | Sanctuary (rank III) | Class move · Guardian | 2 (a Soul cast) | 60 MP; a cast's Strain + 1 | once a scene | 1.5 | 1.5× | allies on 3×3 tiles take half damage until your next turn (about 3 enemy attacks halved) |
| 17 | Disengage | Moving | 1 |  |  | 1 | 2× | 1 tile with no opportunity attack |
| 18 | Footnote (Tier II) | Perk · skill perks | 0 |  | once a fight | 0.46 | free | allies get +2 to hit one enemy for the rest of the round (about 3 attacks) |
| 19 | Double Meaning (Tier I and II) | Perk · skill perks | 0 |  | once a round | 0.46 | free | each squad member's next attack on one enemy gets +2 to hit (about 3 attacks) |
| 20 | Spot, step 3 (7 points) | Call · Vigilance | 1 | only worth it against a target in cover | a unit takes one hindering Call a round | 0.92 | 1.8× | the next 2 allies to attack it ignore its cover (−5 to hit in half cover) and get +1 to hit; no save |

### The twenty most "dear for what it does"

Ranked by how little of the yardstick they pay (the lowest first). An Outburst's stages and a Call's steps take one line each: the worst one.

| # | Action | Family | AP | Other costs | How often | Worth (plain attacks) | Against the yardstick | Why |
|---|---|---|---|---|---|---|---|---|
| 1 | Bone Talk (Tier I and II) | Perk · skill perks | 2 |  |  | 0.05 | 0.1× | Shaken on a failed Heart save |
| 2 | Name It, step 1 (1 point) | Call · Lore Master | 2 |  | a unit takes one helping Call a round | 0.1 | 0.1× | +2 on saves until your next turn (priced against one condition worth 1 attack) |
| 3 | BIND + SEEK | Sigil magic · sample spells (Intelligence 4, Brain Power 4, Expression 4, Agility 4) | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 5 charge (of 10 in a core), 2 Flux (of 6) |  | 0.25 | 0.1× | can't move and −2 to hit for a round on a failed save |
| 4 | Feint | Technique · melee · Openers | 1 |  |  | 0.12 | 0.2× | no damage; +3 to hit on your next technique if it fails a Brain save |
| 5 | Taunt, step 1 (1 point) | Call · Insinuation | 2 | the enemy saves against 12 + your strength | a unit takes one hindering Call a round | 0.25 | 0.3× | on a failed Heart save: its next attack must be at you |
| 6 | Warning Shot | Technique · ranged · Press | 1 | 1 round |  | 0.13 | 0.3× | no damage; 1 Pressure on a failed Heart save |
| 7 | Threaten, step 1 (1 point) | Call · Intimidation | 2 | the enemy saves against 12 + your strength | a unit takes one hindering Call a round | 0.3 | 0.3× | on a failed Heart save: Shaken 3 rounds, −1 AP next turn |
| 8 | Lob | Technique · ranged · Fire | 3 | 1 round; an ally who sees the target |  | 0.46 | 0.3× | 1 shot at -4 to hit at a target you can't see (an ally must) · with the service rifle the engine rolls 1 time (30%): ×0.46 of its plain attack |
| 9 | Inspire (rank I) | Class move · Bard | 1 | 10 MP |  | 0.15 | 0.3× | +2 on an ally's next d20 |
| 10 | Whisper: Luck | Prayer · Whispers (any patron) | 1 | Faith 3; the mana meter −5 | once a turn | 0.15 | 0.3× | You or an ally you can see gets +2 on their next attack roll or check. |
| 11 | Control: Pinned, stage 0 | Soul magic · sample Outbursts (Will Power 4, Determination 4) | 3 | 25 MP, 1 Strain |  | 0.5 | 0.3× | Pinned 2 rounds on a failed Body save (or Slowed, a 3-tile push or pull) |
| 12 | Hymn III: Covering Fire | Prayer · Hymns · The Quartermaster | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | 0.5 | 0.3× | Pick a 3 × 3 area you can see. Each enemy in it is Pinned for 1 round unless it passes a Body save. |
| 13 | Spot, step 1 (1 point) | Call · Vigilance | 2 | only worth it against a target in cover | a unit takes one hindering Call a round | 0.38 | 0.4× | the next ally to attack it ignores its cover (−5 to hit in half cover); no save |
| 14 | Damage Bolt, stage 1, all in one turn | Soul magic · sample Outbursts (Will Power 4, Determination 4) | 4 (Begin + 1 Pump + Release) | 20 MP (of 400), 1 Strain |  | 0.77 | 0.4× | 31 Soul damage (ignores armour; a rolled hit) |
| 15 | BLIND + SPREAD + ARC on 3 enemies | Sigil magic · sample spells (Intelligence 4, Brain Power 4, Expression 4, Agility 4) | 4.1 (3 glyphs at 0.7, 2 tiles of walking: 1, Evoke 1) | 7 charge (of 10 in a core), 3 Flux (of 6) |  | 0.92 | 0.5× | −4 to hit on about 2 attacks on a failed save |
| 16 | SPARK + SEEK (the cheapest attack) | Sigil magic · sample spells (Intelligence 4, Brain Power 4, Expression 4, Agility 4) | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 4 charge (of 10 in a core), 2 Flux (of 6) |  | 0.78 | 0.5× | 31 damage to a soldier (a rolled hit; 33 before armour) |
| 17 | Hymn III: Pratfall | Prayer · Hymns · The Laughing Mask | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | 0.75 | 0.5× | An enemy you can see must pass a Body save or fall Prone and drop the weapon it is holding. |
| 18 | Rally, step 1 (1 point) | Call · Charisma | 2 |  | a unit takes one helping Call a round | 0.5 | 0.5× | +1 AP to an ally |
| 19 | Brief, step 1 (1 point) | Call · Eloquence | 2 |  | a unit takes one helping Call a round | 0.5 | 0.5× | an ally's next action costs 1 AP less in all |
| 20 | Cue, step 1 (1 point) | Call · Reaction Speed | 2 |  | a unit takes one helping Call a round | 0.5 | 0.5× | an ally gets one more reaction |

### The plain attack, weapon by weapon

Not in the two lists above: every weapon's plain attack against the service rifle's, per AP, at 4 points. This is angle A's question (what each weapon family is for), shown here because the plain attack is the yardstick everything else is priced with. The six best and the six worst:

| Weapon | Family | AP | What it does | Per AP, against the service rifle |
|---|---|---|---|---|
| Breacher tube | Heavy weapons | 2 | 160 damage to a soldier (60% to hit) | 4× |
| Long rifle | Rifles | 2 | 70 damage to a soldier (60% to hit) | 1.8× |
| Coach gun | Shotguns | 2 | 63 damage to a soldier (60% to hit) | 1.6× |
| Sawn-off | Shotguns | 2 | 58 damage to a soldier (60% to hit) | 1.5× |
| Adamantile battle rifle | Rifles | 2 | 57 damage to a soldier (60% to hit) | 1.4× |
| Lumeri scattergun | Shotguns | 2 | 55 damage to a soldier (60% to hit) | 1.4× |
| Combat knife | Light melee | 2 | 18 damage to a soldier (60% to hit) | 0.5× |
| Decrkm auto-pistol | Pistols | 2 | 16 damage to a soldier (60% to hit) | 0.4× |
| Whisper SMG | Submachine guns | 2 | 15 damage to a soldier (60% to hit) | 0.4× |
| Throwing knives | Light melee | 2 | 13 damage to a soldier (60% to hit) | 0.3× |
| Legion PDW | Submachine guns | 3 | 19 damage to a soldier (60% to hit) | 0.3× |
| Gloves or bare fists | Unarmed | 2 | 12 damage to a soldier (60% to hit) | 0.3× |

### The same thing at different prices

Rows from the full table set side by side: things that do the same job and are priced differently today. This needs no conversion to read: look at the AP and what it buys.

| The job | Action | Family | AP | Other costs and limits | What it buys | Worth | Against the yardstick |
|---|---|---|---|---|---|---|---|
| Gaining Guard | Guard | Technique · melee · Links | 1 | once a turn (you stay on Guard until your next turn); the pool holds your Durability points, 5 at most | +2 Defense against melee until your next turn + 4 Guard at Durability 4 (each soaks 10 damage) | 1.85 | 3.7× |
| Gaining Guard | Brace (rank I) | Class move · Defender | 2 |  | 4 Guard at Durability 4 (each soaks 10 damage) + 2 Defense until you move | 1.85 | 1.8× |
| A shove | Shove | Technique · melee · Links | 1 |  | the enemy is pushed 1 tile (it walks back), or Prone if it can't move back; what the push sets up is not priced | 0.25 | 0.5× |
| A shove | Shove (rank I) | Class move · Fighter | 1 |  | a 1-tile push or Prone, your choice, on a failed Body save | 0.25 | 0.5× |
| A shove | Shove (anyone, no technique) | Basic action | 2 |  | a 1-tile push on an opposed roll (your Raw Power against its Raw Power or Athletics) | 0.13 | 0.1× |
| Going Hidden | Hide | Basic action | 2 | no enemy may see you | Hidden: you can't be targeted until spotted (not priced), and your first attack is an Ambush (×1.7 at Ingenuity 4) | 0.7 | 0.7× |
| Going Hidden | Vanish (rank I) | Class move · Infiltrator | 1 | once a turn | Hidden: can't be targeted (not priced), and your next attack is an Ambush (×1.7) | 0.7 | 1.4× |
| Going Hidden | Vanishing Act | Perk · mastered perks | 2 | once a fight | Hidden even while seen; your next attack is an Ambush (×1.7) | 0.7 | 0.7× |
| Spending Momentum on one big strike | Coup | Technique · melee · Finishers | 2 (the weapon's attack) | all your Momentum (at least 2) | 1 strike at +25% per Momentum (2 spent) [at most: ×2.25 at 5 Momentum (a Fighter)] | 1.57 | 1× |
| Spending Momentum on one big strike | Finisher (rank III) | Class move · Fighter | 3 | all your Momentum (at least 1; 3 counted) | 1 strike at +20% per Momentum spent (3 counted) | 1.6 | 0.7× |
| A strike with a free step | Lunge | Technique · melee · Openers | 2 (the weapon's attack) |  | 1 strike + a free step of 1 tile | 1.25 | 1.3× |
| A strike with a free step | Lunge (rank I) | Class move · Fighter | 2 or 3 (your melee attack) | 1 Momentum | 1 strike + a free move of up to 2 tiles | 1.5 | 1.2× |
| A shot that injures | Called Shot | Technique · ranged · Fire | 3 | 1 round | 1 shot at −2 to hit + Dazed (head), Slowed (leg) or a lowered weapon (arm) on a failed Body save; priced for the head | 1.17 | 0.8× |
| A shot that injures | Called Shot (rank III) | Class move · Marksman | 3 |  | 1 shot at −2 to hit + an injury with no save on a hit (head: Dazed; priced for the head) | 1.5 | 1× |
| Taking AP from an enemy | Threaten, step 1 (1 point) | Call · Intimidation | 2 | the enemy saves against 12 + your strength; a unit takes one hindering Call a round | on a failed Heart save: Shaken 3 rounds, −1 AP next turn | 0.3 | 0.3× |
| Taking AP from an enemy | Threaten, step 3 (7 points) | Call · Intimidation | 1 | the enemy saves against 12 + your strength; a unit takes one hindering Call a round | on a failed Heart save: Shaken 3 rounds, −2 AP next turn, can't close on you | 0.68 | 1.4× |
| Taking AP from an enemy | Silver Tongue (rank II) | Class move · Trickster | 2 |  | −2 AP on its next turn on a failed Brain save (a boss: −1) | 0.5 | 0.5× |
| Taking AP from an enemy | Stopping Shot | Technique · ranged · Takes | 2 | 1 round; the target must be Pressed (2 Pressure) | 1 shot + −1 AP next turn and a 1-tile push on a failed save | 1.17 | 1.2× |
| Taking AP from an enemy | Bash | Technique · melee · Strikes | 2 (the weapon's attack) | 1 Momentum | ×0.5 + Dazed on a failed Body save | 0.76 | 0.6× |
| Giving AP to an ally | Rally, step 1 (1 point) | Call · Charisma | 2 | a unit takes one helping Call a round | +1 AP to an ally | 0.5 | 0.5× |
| Giving AP to an ally | Rally, step 3 (7 points) | Call · Charisma | 1 | a unit takes one helping Call a round | +2 AP to an ally and −1 Pressure | 1.25 | 2.5× |
| Giving AP to an ally | Brief, step 3 (7 points) | Call · Eloquence | 1 | a unit takes one helping Call a round | an ally's next actions cost 3 AP less in all | 1.5 | 3× |
| Giving AP to an ally | QUICKEN + SEEK | Sigil magic · sample spells (Intelligence 4, Brain Power 4, Expression 4, Agility 4) | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 6 charge (of 10 in a core), 2 Flux (of 6) | +2 AP to an ally next turn · never on yourself; a target once a round | 1 | 0.6× |
| Giving AP to an ally | Hymn III: Feed the Fire | Prayer · Hymns · Mother Ember | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5; a cooldown between Hymns (your prayer cooldown) | You or an ally you can see gets +1 AP right now, up to the limit of 9 AP, and loses Weakened and Slowed. | 0.5 | 0.3× |
| Healing one ally | Stim an ally next to you | Basic action | 1 | 1 stim | heals 30 × Healing given and stops Bleeding | 1.15 | 2.3× |
| Healing one ally | Triage (rank I) | Class move · Bard | 2 |  | heals 20 × Healing given (×1.7: Empathy is a Bard skill) and ends Bleeding; no Supplies | 1.31 | 1.3× |
| Healing one ally | Stim Throw (rank II) | Class move · Bard | 1 | 1 Supply | heals 30 × Healing given at 4 tiles and ends Bleeding | 1.96 | 3.9× |
| Healing one ally | Whisper: Health | Prayer · Whispers (any patron) | 1 | Faith 3; the mana meter −5; once a turn | You or an ally you can see heals 15 × your Blessing power. | 0.81 | 1.6× |
| Healing one ally | Hymn I: Warm Hands | Prayer · Hymns · Mother Ember | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5; a cooldown between Hymns (your prayer cooldown) | You or an ally you can see heals 40 × your Blessing power. | 2.15 | 1.4× |
| Healing one ally | MEND + SEEK | Sigil magic · sample spells (Intelligence 4, Brain Power 4, Expression 4, Agility 4) | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 6 charge (of 10 in a core), 2 Flux (of 6) | 43 HP healed or shielded (×1.7 more with Empathy and Insight 4) | 1.63 | 1× |
| Healing one ally | Mend (Buff: heal), stage 0 | Soul magic · sample Outbursts (Will Power 4, Determination 4) | 3 | 20 MP, 1 Strain | 41 HP to one ally | 1.57 | 1× |
| A shield on one ally | Whisper: Protection | Prayer · Whispers (any patron) | 1 | Faith 3; the mana meter −5; once a turn | You or an ally you can see gains a shield of 15 × your Blessing power. | 0.81 | 1.6× |
| A shield on one ally | Will Shield (rank I) | Class move · Guardian | 2 (a Soul cast) | 20 MP; Strain as a cast | a shield of 30 × Healing given for the fight (×1 here: Empathy is not a Guardian skill; ×1.7 with Empathy and Insight 4) | 1.15 | 1.2× |
| A shield on one ally | Hymn I: Saint's Shield | Prayer · Hymns · Holy Father Nerukhan | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5; a cooldown between Hymns (your prayer cooldown) | You or an ally you can see gains a shield of 40 × your Blessing power. | 2.15 | 1.4× |
| A shield on one ally | WARD + SEEK | Sigil magic · sample spells (Intelligence 4, Brain Power 4, Expression 4, Agility 4) | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 5 charge (of 10 in a core), 2 Flux (of 6) | 51 HP healed or shielded (×1.7 more with Empathy and Insight 4) | 1.96 | 1.2× |
| One attack, three ways | Shot | Technique · ranged · Fire | 2 | 1 round | the plain attack | 1 | 1× |
| One attack, three ways | FIRE + SEEK | Sigil magic · sample spells (Intelligence 4, Brain Power 4, Expression 4, Agility 4) | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 5 charge (of 10 in a core), 2 Flux (of 6) | 64 damage to a soldier (a rolled hit; 66 before armour) | 1.6 | 0.9× |
| One attack, three ways | Damage Bolt, stage 0, all in one turn | Soul magic · sample Outbursts (Will Power 4, Determination 4) | 3 (Begin + 0 Pumps + Release) | 20 MP (of 400), 1 Strain | 25 Soul damage (ignores armour; a rolled hit) | 0.62 | 0.4× |
| A held shot | Overwatch | Technique · ranged · Hold a shot | 2 (the weapon's attack) | your reaction; once a round (the reaction) | 1 shot at the first enemy that moves in your sight, on its turn · only if the trigger comes | 1 | 0.7× |
| A held shot | Deny | Technique · ranged · Hold a shot | 2 | your reaction; once a round (the reaction) | 1 shot at the first enemy onto a tile you picked; on a hit it stops and loses the rest of its move · only if the trigger comes | 1.33 | 0.9× |
| A held shot | Dead to Rights | Technique · ranged · Hold a shot | 3 | your reaction; once a round (the reaction) | 1 shot at +2 to hit, before a Pressed enemy acts · only if the trigger comes | 1.15 | 0.6× |
| A held shot | Killzone (rank III) | Class move · Marksman | 4 (twice the shot) | your reaction | 2 held shots at +2 to hit, at the first two enemies that move in your line | 2.31 | 0.9× |

## AP sources: more than 6 AP, refunds and discounts

Ranked by the most AP one of them can add in a 5-round fight if its condition holds every time it can (an upper bound, with the engine's cap of +3 a turn applied). "With the ruling" is the same with Leon's ruling applied: a cooldown of 3 turns, so it fires at most 2 times in 5 rounds. The condition is the data's own wording. A discount on an action that does not come up every turn is counted for the times it does (assumed, proposed: clear jam 1, retreat 1, field repair 1, swap core 1, stabilise 1, analyze 2, vent 2, swap weapon or mod 2, disengage 2, reload 2, heal 3, break 2 times a fight). AP from a Call (Rally, Brief) goes through the same +3 a turn as perk AP; an Order, a QUICKEN, a free Pump and a held shot do not.

| # | Source | Kind | What it gives | Condition (as the data writes it) | How often today | AP a fight, at most | With the ruling (3-turn cooldown) | The other side of it |
|---|---|---|---|---|---|---|---|---|
| 1 | Sweet Talker (Tier II) [perk] | extra AP | +3 AP | you buff or debuff someone you charmed this scene | once a turn (its card says so; the data writes no limit) | 15 | 6 |  |
| 2 | Brief [Call, Eloquence] | discount for an ally | 1 / 2 / 3 AP off their next actions by step | the same Call prices | each ally once a round (one helping Call a round: Rally or Brief, not both); it counts in the ally's +3 a turn | 15 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 3 | Order [Call, Authority] | free actions for an ally | a reload, a stand-up, a pick-up or a move for 0 AP (two of them at step 3) | it uses the ally's reaction | each ally once a round | 15 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 4 | Grim Reaper (Tier I and II) [perk] | extra AP | +2 AP | you KO or kill an enemy on your turn | once a turn | 10 | 4 | Tier I: -1 AP when first turn of combat |
| 5 | Got You in My Sight (Tier I and II) [perk] | extra AP | +2 AP | you see an enemy enter stealth or leave your sight | once a turn | 10 | 4 | Tier I: -2 AP when a sneak attack hits you |
| 6 | Overruled! (Tier I) [perk] | extra AP | +2 AP | a Left Brain Debuff you inflicted is active on an enemy | every time its condition holds (no limit written) | 10 | 4 | -2 AP when you carry a Left Brain Debuff |
| 7 | Overruled! (Tier II) [perk] | extra AP | +2 AP | a Left or Right Brain Debuff you inflicted is active on an enemy | every time its condition holds (no limit written) | 10 | 4 | -1 AP when you carry a Left or Right Brain Debuff |
| 8 | Talks Broke Down (Tier I and II) [perk] | extra AP | +2 AP | combat began after the squad won a dialogue check | every turn of the fight | 10 | 4 | Tier I: -2 AP when combat began after a failed dialogue check |
| 9 | Sweet Talker (Tier I) [perk] | extra AP | +2 AP | you buff or debuff someone you charmed this scene | once a turn (its card says so; the data writes no limit) | 10 | 4 | -2 AP when someone you charmed this scene debuffs you |
| 10 | Dance of Iron [perk] | a free attack | an attack for 0 AP (single_shot) | successful dodge | every time its condition holds (no limit written) | 10 | 4 |  |
| 11 | Forlorn Hope [trait] | extra AP | +2 AP | turn_ended_closer_to_enemy | every time its condition holds (no limit written) | 10 | 4 |  |
| 12 | Defender: Anchor (rank III) [class move] | a free attack | an attack for 0 AP (opportunity) | adjacent_enemy_moves_away_after_turn_start | every time its condition holds (no limit written) | 10 | not a perk |  |
| 13 | Rally [Call, Charisma] | AP given to an ally | +1 / +1 / +2 AP by step | costs the caller 2 AP (1 from 5 points, 0 as a reaction from 9, the first of a turn free at 10) | each ally once a round; it counts in the ally's +3 a turn and never takes them past 9 | 10 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 14 | Free Pumps from Empathy 7 | discount | 2 Pumps a round cost 0 AP | holding an Outburst | every round | 10 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 15 | Heart Overload [perk] | discount | a second Begin for 0 AP (2 AP saved) | right after you Release at stage 2 or higher | once a turn | 10 | 4 |  |
| 16 | A held shot or an opportunity attack | an attack off your turn | one attack on the enemy's turn | Overwatch is paid on your turn; an opportunity attack is free | once a round (the reaction) | 10 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 17 | QUICKEN [Sigil word] | AP given to an ally | +2 AP on their next turn | a Line with QUICKEN (3 charge for the word); never on the caster | each target once a round | 8 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 18 | The Counting Weaver: the Miracle Rewoven [prayer] | AP for the whole squad (each) | Every ally whose HP was higher at the start of this round gets that HP back, and the Downed among them stand… | Faith 7 and Devotion 10; −5 Devotion levels | once a session | 6 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 19 | Roll With It (Tier I) [perk] | a free move | 1 tiles for 0 AP (you) | successful dodge | once a round (its card says so; the data writes no limit) | 5 | 2 |  |
| 20 | Roll With It (Tier II) [perk] | a free move | 2 tiles for 0 AP (you) | successful dodge | once a round (its card says so; the data writes no limit) | 5 | 2 |  |
| 21 | Never There [perk] | a free move | ? tiles for 0 AP (you) | first move each turn provokes no reactions | once a turn | 5 | 2 |  |
| 22 | Charge! [perk] | discount | move is free | straight-line charge of 3+ tiles at an enemy | once a turn | 5 | 2 |  |
| 23 | Siege Engine [perk] | discount | shove costs 1 AP less |  | every time its condition holds (no limit written) | 5 | 2 |  |
| 24 | Southern Fist [trait] | extra AP | +1 AP | unarmed_or_gloves_only | every time its condition holds (no limit written) | 5 | 2 |  |
| 25 | Drill Echo [trait] | discount | sprint costs 1 AP less |  | every time its condition holds (no limit written) | 5 | 2 |  |
| 26 | Sigil Savant [trait] | discount | an action costs 1 AP less |  | every time its condition holds (no limit written) | 5 | 2 |  |
| 27 | Sworn Sibling [trait] | shared AP | 1 AP passed to or from the sibling | adjacent | once a turn | 5 | 2 |  |
| 28 | Marksman: Fire Discipline (rank I) [class move] | discount | burst costs 1 AP less |  | once a turn | 5 | not a perk |  |
| 29 | Marksman: Duck and Roll (rank II) [class move] | a free move | 1 tiles for 0 AP (you) | on_reaction | every time its condition holds (no limit written) | 5 | not a perk |  |
| 30 | Channeler: Shape (rank I) [class move] | discount | a Pump costs 1 AP less | first_pump_each_turn | once a turn | 5 | not a perk |  |
| 31 | Guardian: Command (rank I) [class move] | a free move | 2 tiles for 0 AP (ally) | on_use | once a turn | 5 | not a perk |  |
| 32 | Any Call at 10 points | discount | the first Call of each turn costs 0 AP | a Mastered gamma skill | once a turn | 5 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 33 | Any Call at 9 points | an extra action | a Call as a reaction, 0 AP | your reaction | once a round | 5 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 34 | Free Pumps from Empathy 3 | discount | 1 Pump a round cost 0 AP | holding an Outburst | every round | 5 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 35 | Last Round [technique] | refund | your next speed reload is free | the shot with the last round takes the target out | once a magazine | 4 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 36 | A held Outburst swelling | a free Pump | +1 stage at the start of each turn you hold it | +1 Strain a turn | every turn held | 4 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 37 | Supreme Command [perk] | free actions (to all_allies) | 2 AP of free actions | supreme_command | once a fight | 3 | 3 |  |
| 38 | Outclassed (Tier I and II) [perk] | extra AP | +3 AP | squad gets the first kill and you damaged that target | once a fight (its trigger comes once, or rarely) | 3 | 3 | Tier I: -2 AP when squad takes the first casualty |
| 39 | The Quartermaster: the Miracle Requisition Approved [prayer] | AP for the whole squad (each) | The whole squad is restocked (ammo, Supplies, throwables) and gets 2 standard cores each. All gear is… | Faith 7 and Devotion 10; −5 Devotion levels | once a session | 3 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 40 | Between Heartbeats [perk] | an extra turn slice | 2 AP to act out of turn | an enemy in your sight starts an action | once a fight | 2 | 2 |  |
| 41 | Rabbit's Foot [trait] | extra AP | +2 AP | next_turn_after_ally_downed | once a fight (its trigger comes once, or rarely) | 2 | 2 |  |
| 42 | Gun Nut [trait] | discount | clear_jam costs 0 AP |  | whenever you do it: about once a fight (assumed) | 2 | 2 |  |
| 43 | Live to Fight Another Day [trait] | discount | retreat costs 0 AP |  | whenever you do it: about once a fight (assumed) | 2 | 2 |  |
| 44 | Draw Cut [technique] | discount | a strike for the weapon's AP -1, drawing included | the weapon stowed at the start of the turn | once per stowed weapon | 2 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 45 | The Twin Pays [perk] | discount | a Begin for 0 AP, no mana, no Strain | your choice | once a fight | 2 | 2 |  |
| 46 | The Quartermaster: its intervention [prayer] | AP or a refund | When you reload, the reload is free: its AP comes back. When your Evoker's core runs out of charge, a fresh… | you are Witnessed | once a fight (twice from Devotion 7) | 2 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 47 | The Laughing Mask: the Miracle Encore [prayer] | AP for the whole squad (each) | Every ally may repeat the last action they took this round for free, and every enemy in sight is Confused… | Faith 7 and Devotion 10; −5 Devotion levels | once a session | 2 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 48 | Hot-Swap (Tier I and II) [perk] | discount | swap_weapon_or_mod is free |  | whenever you do it: about 2 times a fight (assumed) | 2 | 2 |  |
| 49 | Siege Engine [perk] | discount | break costs 1 AP less |  | whenever you do it: about 2 times a fight (assumed) | 2 | 2 |  |
| 50 | Live to Fight Another Day [trait] | discount | disengage costs 0 AP |  | whenever you do it: about 2 times a fight (assumed) | 2 | 2 |  |
| 51 | Marksman: Speed Loader (rank I) [class move] | discount | reload costs 1 AP less |  | whenever you do it: about 2 times a fight (assumed) | 2 | not a perk |  |
| 52 | Mage: Bleed the Flux (rank II) [class move] | discount | vent costs 1 AP less |  | whenever you do it: about 2 times a fight (assumed) | 2 | not a perk |  |
| 53 | Trickster: Read (rank I) [class move] | discount | analyze costs 1 AP |  | whenever you do it: about 2 times a fight (assumed) | 2 | not a perk |  |
| 54 | Mother Ember: Hymn III Feed the Fire [prayer] | AP or a refund | You or an ally you can see gets +1 AP right now, up to the limit of 9 AP, and loses Weakened and Slowed. | 3 AP to pray it | a cooldown between Hymns | 2 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |
| 55 | Rounding Up (Tier II) [perk] | carried AP | carry 1 unspent AP into the next turn |  | once a fight | 1 | 1 |  |
| 56 | Outclassed (Tier II) [perk] | extra AP (to killer) | +1 AP | squad gets the first kill | once a fight (its trigger comes once, or rarely) | 1 | 1 |  |
| 57 | Overhaul [perk] | discount | field_repair costs 1 AP |  | whenever you do it: about once a fight (assumed) | 1 | 1 |  |
| 58 | Glass Runner [trait] | discount | move costs 1 AP less | first_move_each_combat | once a fight (its trigger comes once, or rarely) | 1 | 1 |  |
| 59 | Field Medic [trait] | discount | heal costs 1 AP less |  | once a fight (its card says so) | 1 | 1 |  |
| 60 | Cold Case [trait] | discount | analyze costs 1 AP less |  | once a session (its card says so) | 1 | 1 |  |
| 61 | Mage: Core Change (rank I) [class move] | discount | swap_core costs 1 AP less |  | whenever you do it: about once a fight (assumed) | 1 | not a perk |  |
| 62 | Bard: Triage (rank I) [class move] | discount | stabilise costs 1 AP less |  | whenever you do it: about once a fight (assumed) | 1 | not a perk |  |
| 63 | The first Pump of a fight | discount | 1 Pump for 0 AP | every Soul caster | once a fight | 1 | not a perk | not a perk: the 3-turn cooldown ruling does not name it |

**Cross-check against the code.** 22 perks, traits and class moves touch AP in their own code (they bank it, grant it, add it at the start of a turn, or hand it back). 12 of them are in the table above. **These 10 are not**, because their data does not describe what they do as an AP effect; each has to be read by hand before the cooldown is built (some only give AP back on a refused action, or run a companion's own AP): Beast Handler, Born Officer, ccec_ballistician.case_file, Drone Handler, Field Surgeon, Ghost Soldier, grand_sigilist.enlarge, Rite in the Field, Shadow Step, Twin Discipline.

## Free actions (0 AP)

Target 3 of angle B (proposed): a turn's free actions together are worth no more than 2 AP. The first table is the ones with **no limit a turn**: they can be chained.

| Action | Family | Other costs | What it buys | Worth |
|---|---|---|---|---|
| Payload (rank III) | Class move · Mage | Flux equal to its glyphs, on top | an Evoke with double area (or one more missile); + Flux equal to its glyphs | not priced |
| Blessed Shells (rank II) | Class move · Guardian |  | a Hymn waits in your weapon and lands with your next hit | not priced |
| Shadow Step (Tier I) | Perk · skill perks |  | While you are Hidden, a move from a tile next to cover to another tile next to cover counts as half as many tiles (rounded up), so it costs less AP. | not priced |
| Shadow Step (Tier II) | Perk · skill perks |  | While you are Hidden, a move from a tile next to cover to another tile next to cover counts as half as many tiles (rounded up), so it costs less AP. When one of your… | not priced |
| Flat Line (Tier I and II) | Perk · skill perks |  | Pick the enemy your calm unnerves. You can choose until the end of your first turn. | not priced |
| Open Hand: "Open Hand: offer mercy…" | Perk · mastered perks |  | Choose when you offer mercy. Always: it is offered the moment an enemy drops to a quarter of its HP. Ask: you offer it yourself on your turn. Never: you don't offer it. | not priced |
| Verse of War: switch "In verse" | Perk · achieved perks |  | Speak a line of verse, then Begin or Release an Outburst with In verse on: it gets +1 tile of range and +10% damage. After the fight, the Narrator checks that your… | not priced |
| Heretic: "Stolen Fire" | Trait · traits |  | Pray without kneeling: any patron's Blessing, on Will Power instead of Faith (3 AP). | not priced |
| Pacifist: switch "Nonlethal" | Trait · traits |  | You won't kill. Not even them. + Sanctuary: until you attack in a fight, enemies have −2 to hit you. Your attacks are nonlethal unless you choose otherwise: an enemy… | not priced |
| Drop what a hand holds | Gear |  | it lands in the pile on your tile | not priced |
| Speak (rules 1.14) | Speaking |  | words to the table and the Narrator; nothing happens by rule | not priced |
| Revert Pump | Soul magic · the cycle |  | undoes your last Pump this turn (the AP comes back) | not priced |
| Let go | Soul magic · the cycle |  | drops the held Outburst; you lose Strain equal to its stage (no more than its swells added); the mana meter +1 | not priced |

Limited free actions:

| Action | Family | How often | Other costs | What it buys | Worth |
|---|---|---|---|---|---|
| Parry | Technique · melee · Answers | once a round (the reaction) | your reaction | an opposed roll; if you win, the hit does half damage · only if the trigger comes | 0.25 |
| Riposte | Technique · melee · Answers | once a round (the reaction) | your reaction | a free strike when a melee attack misses you · only if the trigger comes | 1 |
| Keep Back | Technique · melee · Answers | once a round (the reaction) | your reaction | a free strike at an enemy entering your reach; on a hit it saves or stops there · only if the trigger comes | 1.16 |
| Shield Wall | Technique · melee · Answers | once a round (the reaction) | 1 Guard; your reaction; a shield in the off hand | a shot at an ally next to you is at −5 to hit · only if the trigger comes | 0.38 |
| Interpose | Technique · melee · Answers | once a round (the reaction) | 1 Guard; your reaction; Durability 3 | you take a hit meant for an ally next to you, with your armour and Guard (worth the difference between the two of you) · only if the trigger comes | not priced |
| Any Call as a reaction (9 points) | Call · every skill | 1 a round | your reaction | the Call's step 3, off your turn | not priced |
| The first Call of your turn (10 points) | Call · every skill | 1 a turn |  | the Call's step 3, for nothing | not priced |
| Overcharge (rank II) | Class move · Mage | once a fight |  | your next glyph costs no AP and no charge (0.7 AP saved), and its spell may hold 1 word more | 0.35 |
| Storm Front (rank II) | Class move · Channeler | once a turn | 10 MP | a Bolt or Lance arcs to up to 2 more enemies (up to ×3 the damage) for 10 MP | not priced |
| Heart Surge (rank III) | Class move · Channeler | once a turn | double Strain | a Release fires one stage higher (×2.6 past stage 4) for double Strain | not priced |
| Eye of the Storm (rank III) | Class move · Channeler | once a scene | lost if you don't Release this turn | your next Release adds no Strain and its rider counts one stage higher | not priced |
| Running Reload (Tier I): switch "Reload on the move" | Perk · skill perks | once a turn |  | Once per turn, you can reload as part of a move, for no extra AP. | not priced |
| Running Reload (Tier I): switch "Clear the jam on the move" | Perk · skill perks | once a turn |  | Once per turn, you can reload as part of a move, for no extra AP. | not priced |
| Running Reload (Tier II): switch "Reload on the move" | Perk · skill perks | once a turn |  | Once per turn, you can reload as part of a move, for no extra AP. Once per turn, you can also clear a jam as part of a move. | not priced |
| Running Reload (Tier II): switch "Clear the jam on the move" | Perk · skill perks | once a turn |  | Once per turn, you can reload as part of a move, for no extra AP. Once per turn, you can also clear a jam as part of a move. | not priced |
| Footnote (Tier I) | Perk · skill perks | once a fight |  | allies get +1 to hit one enemy for the rest of the round (about 3 attacks) | 0.23 |
| Footnote (Tier II) | Perk · skill perks | once a fight |  | allies get +2 to hit one enemy for the rest of the round (about 3 attacks) | 0.46 |
| Double Meaning (Tier I and II) | Perk · skill perks | once a round |  | each squad member's next attack on one enemy gets +2 to hit (about 3 attacks) | 0.46 |
| Heart Overload (Tier I and II): switch "Heart Overload: Begin again for 0 AP" | Perk · skill perks | once a turn |  | a second Begin for 0 AP right after a Release at stage 2+ (2 AP saved); mana and Strain as usual | 1 |
| Heart Overload (Tier I and II): switch "Heart Overload: pay the mana in HP" | Perk · skill perks | once a turn |  | Once a turn, right after you Release an Outburst at stage 2 or higher, you can Begin the same design again at once for 0 AP. You pay its mana and Strain as usual, and… | not priced |
| Old Tongue (Tier I and II): "Speak the Old Tongue" | Perk · skill perks | once a being |  | Speak to an upper-realm being in earshot. It parleys with you and makes no attacks on its next turn. Once per being. | not priced |
| You Get Used to It (Tier I and II): "Seen worse: give it" | Perk · skill perks | once a round |  | Give this round's save bonus to the ally whose condition woke it: their next save this round, not yours. | not priced |
| Clean Hands (Tier I): switch "Spare" | Perk · skill perks | once a turn |  | Once per turn, when you spare an enemy or protect an innocent, you gain a shield worth 15% of your max HP. To spare an enemy, attack with Spare on: a blow that would… | not priced |
| Clean Hands (Tier II): switch "Spare" | Perk · skill perks | once a turn |  | Once per turn, when you spare an enemy or protect an innocent, you gain a shield worth 25% of your max HP. To spare an enemy, attack with Spare on: a blow that would… | not priced |
| Trick Shot: switch "Ricochet" | Perk · mastered perks | once a turn |  | Once per turn, you can make a ranged attack a Ricochet. It ignores half cover, and if it hits, the nearest other enemy within 2 tiles of the target takes half the… | not priced |
| Clean Draw | Perk · mastered perks | once a fight |  | Once a fight: the glyphs you draw next cost no charge and no Flux, and firing a spell of only those glyphs costs no charge. | not priced |
| Established Fact | Perk · mastered perks | once a session |  | Once a session: state a fact about the technology, biology or history in the scene. It is true from now on, unless it contradicts what has already been shown. In a… | not priced |
| Closing Argument | Perk · mastered perks | once a scene |  | Once a scene: make your closing argument. Every listener who isn't ruled by fear or faith accepts its logic. An Eloquence check waiting on that point succeeds. In a… | not priced |
| Solid Image: "Solidify" | Perk · mastered perks | once a fight |  | One of your projections becomes real until your next turn: a wall blocks movement and shots; a figure takes one hit meant for an ally. | not priced |
| Open Hand: "Offer mercy" | Perk · mastered perks | once a enemy |  | Offer mercy to an enemy you can see that is at a quarter of its HP or less. It makes a Heart save. If it fails, it surrenders. Once per enemy. | not priced |
| Their Own Idea | Perk · mastered perks | once a scene |  | Once a scene: hide a suggestion inside a sentence (type it, and name the listener). They believe it was their own idea and act on it, unless it would harm them… | not priced |
| The Twin Pays: switch "The Twin Pays" | Perk · mastered perks | once a fight |  | a Begin for 0 AP, no mana and no Strain (2 AP saved; the mana and Strain are not priced) | 1 |
| True Name | Perk · mastered perks | once a session |  | Once a session: speak the true name of an upper-realm being, a cursed being or a creature. Your side deals +50% damage to it for the scene, and it can't lie to you. | not priced |
| Between Heartbeats | Perk · achieved perks | once a fight (armed ahead, fires by itself) |  | 2 AP to act with when an enemy in your sight starts an action | 1 |
| The Voice | Perk · achieved perks | once a session |  | Once a session: give an order (halt, hold fire, drop it, kneel, fall back, or one in your own words). Rank-and-file enemies who hear it make a Heart save. Those who… | not priced |
| Angel of the Trenches: "Angel: hold position" | Perk · ultimate perks | (armed ahead, fires by itself) |  | While this is on, Angel of the Trenches won't move you from your position. Use it again to turn it off. | not priced |
| Supreme Command | Perk · ultimate perks | once a fight |  | every ally takes 2 AP of free actions (about 3 allies) | 3 |
| Holo-Drama Addict: "Play it as a holo-drama" | Trait · traits | once a scene |  | +3 to hit on your next attack this turn, if the Narrator buys it | 0.23 |
| Oil in My Mind: "Masterpiece" | Trait · traits | once a session |  | Once a session: make a work of art for one ally. They get +2 on their next roll. Pick the ally, or type their name in the story. | not priced |
| Oil in My Soul: "Masterpiece" | Trait · traits | once a session |  | Once a session: make a work of art for one ally. They get +2 on their next roll. Pick the ally, or type their name in the story. | not priced |
| Rabbit's Foot: "Lucky Foot" | Trait · traits | once a session (armed ahead, fires by itself) |  | Once a session: while this is on, the first enemy attack that would hit you is rerolled. Use it again to turn it off. | not priced |
| Daggerfall Veteran: "Shake It Off" | Trait · traits | once a fight |  | removes one Heart debuff from yourself (worth the debuff) | not priced |
| Daggerfall Veteran: "Seen It Before" | Trait · traits | once a session |  | Once a session: learn how the enemy will move next. In a fight, you are shown the next move of every enemy you can see. In the story, the Narrator answers truthfully. | not priced |
| Gambler: switch "Double or Nothing" | Trait · traits | once a scene |  | The house always wins. You are not the house, and you've never once let that stop you. + Double or Nothing: once per scene, call "double" before a d20 check or attack… | not priced |
| Live to Fight Another Day: "Retreat" | Trait · traits | once a fight |  | Once a fight: Sprint for 0 AP to a tile that is farther from every enemy you can see. The move draws no opportunity attacks, and you gain +2 Defense until the end of… | not priced |
| Occultist: "Look it up" | Trait · traits | once a session |  | Once a session: look up one supernatural creature's weakness in the grimoire. Pick the creature in a fight, or type its name. In a fight it is your attempt for the… | not priced |
| Spend an Echo on a roll | Basic action | once a roll | 1 Echo (you hold 3 at most; 1 at the start of a session) | the d20 is rolled again | 0.23 |
| Your reaction | Reaction | 1 a round |  | one of: an opportunity attack (a free melee attack when an enemy leaves your reach without Disengaging), a held shot, an Answer technique, a Call from 9 points, a perk marked reaction | 1 |
| Hold it over a turn (swell) | Soul magic · the cycle | once a turn, by itself | +1 Strain (+2 in Flooded air) | +1 stage at the start of your next turn | 0.31 |

## Each class's dearest move (the peak rule)

For each class, the move with the highest full price (AP, then the resource it spends, then how rarely it can be used), with what it buys. The peak rule says this is the move that may pass the targets. For the three Mind and the three Soul classes the dearest thing they do is not a class move but a spell: a 4-glyph Line, or an Outburst pumped to stage 4 (see the sample spells and Outbursts in the full table); their class moves mostly change what a spell costs.

| Class | Dearest move | AP | Other costs | How often | What it buys | Worth | Against the yardstick |
|---|---|---|---|---|---|---|---|
| Defender | Brace (rank I) | 2 |  |  | 4 Guard at Durability 4 (each soaks 10 damage) + 2 Defense until you move | 1.85 | 1.8× |
| Fighter | Finisher (rank III) | 3 | all your Momentum (at least 1; 3 counted) |  | 1 strike at +20% per Momentum spent (3 counted) | 1.6 | 0.7× |
| Marksman | Killzone (rank III) | 4 (twice the shot) | your reaction |  | 2 held shots at +2 to hit, at the first two enemies that move in your line | 2.31 | 0.9× |
| Infiltrator | Sabotage (rank III) | 2 |  |  | a rigged tile: 30 damage, the enemy stops, and is Pinned on a failed save (priced as if it is stepped on) | 1.4 | 1.4× |
| Mage | Stored Spell (rank III) | 1 | its charge, paid before the fight | once a rest | a whole spell written before the fight goes off for 1 AP (worth the spell; it saves every glyph's AP) | not priced | not priced |
| Trickster | Rewrite (rank III) | 3 | 3 charge, 1 Flux | once a turn | one helpful state on an enemy flips into its opposite on a failed Brain save (worth the state) | not priced | not priced |
| Bard | Rally (rank III) | 2 |  | once a scene | every ally within 4 tiles heals 20 × Healing given (3 allies counted, all of them hurt; the Bard is not healed) and loses Fear and Shaken | 3.92 | 3.9× |
| Channeler | Eye of the Storm (rank III) | 0 | lost if you don't Release this turn | once a scene | your next Release adds no Strain and its rider counts one stage higher | not priced | not priced |
| Guardian | Judgement (rank III) | 4 | 10 Devotion XP; that is about a third of a level at Devotion 4 (32 XP to the next) and a seventh at Devotion 7 (70 XP) | once a fight | 1 attack at × (1 + Blessing power): ×2.4 at Faith 4 | 2.4 | 1.2× |

## The conversion (all of it proposed)

Nothing here is in the game. These are the lines a worth is built from; each is one constant at the top of the tool.

| # | Proposed line | Value | Where it comes from |
|---|---|---|---|
| 1 | 1 AP is worth | 0.5 plain attack | angle B, target 1 (the yardstick) |
| 2 | An attack lands | 65% of the time | Leon's answer 8 (about 65% at equal level) |
| 3 | An enemy fails a save | 50% of the time | angle F, proposed target (45 to 55%) |
| 4 | +1 to hit on one attack | 0.077 attack | 5 points on a 65% chance |
| 5 | Damage with no roll | damage ÷ (0.65 × 40) | a plain attack lands 65% of the time for 40 |
| 6 | HP healed, shielded or soaked | HP ÷ (0.65 × 40) | a point of HP is worth the same on either side. (Counted in enemy attacks it would be worth 2.7 times more: a soldier's shot does only 15 to this character) |
| 7 | 1 Pressure on an enemy | 0.25 attack | 4 Pressure is Broken: −2 AP |
| 8 | 1 Momentum spent | 0.5 AP of price | a Finisher turns 1 Momentum into +20 to +25% of an attack |
| 9 | Your reaction spent | 1 AP of price | one a round; it fires only if the trigger comes |
| 10 | An enemy's turn | 2 attacks | 6 AP: about 4 on attacks, 2 on moving |
| 11 | One tile of movement | 0.25 attack | 1 AP walks 2 tiles at Agility 4 |
| 12 | "A normal share of points" | 4 in the skill and its attribute | Leon's answer 2 (the yardstick weapon in normal hands); the number 4 is mine |
| 13 | Cheap / dear | 1.5× or more / 0.67× or less | a band of one half either way |
| 14 | A free action is "cheap" from | 0.25 attack | half an AP of worth for nothing |
| 15 | A fight lasts | 5 rounds | Leon's answer 1 (4 to 6) |
| 16 | "Every ally" / "the squad's attacks on it" / "later hits on broken armour" | 3 allies / 6 attacks / 4 hits | a squad of four |
| 17 | One enemy attack prevented (a forced miss, a Disengage, an attack drawn onto a decoy) | 1 plain attack | true once enemies scale: Leon's ruling of 3 enemy turns of focus to drop a character puts an enemy attack at about 24 HP. **Today it is 11 HP** (a soldier's shot, 15 at 70%), so today every "enemy attack prevented" row is worth about 0.4 of what is listed, while the rows counted in HP (heals, shields, Guard) are worth what is listed |
| 18 | A row that waits for a trigger (an Answer, a held shot, a move that fires on your reaction) | listed, never flagged | its worth is "if it fires"; how often it fires is the fight simulator's to measure |
| 19 | Healing given | ×1 for a Sigil caster, a Guardian, a stim; ×1.7 for a Bard and a Soul heal | Healing given is Empathy and Insight: counted only where those are the family's own points |

Conditions, as a certain effect (then × 65% if it rides a hit, × 50% if the target saves):

| Condition | Worth (plain attacks) | Why |
|---|---|---|
| stunned | 3 | a whole turn: 6 AP |
| dazed | 1 | 2 AP |
| suppressed | 0.5 | 1 AP |
| nausea | 1 | 1 AP a turn for 2 rounds |
| prone | 0.5 | 1 AP to stand up |
| lowered | 0.5 | 1 AP to raise the weapon |
| disarmed | 1 | 2 AP to recover the weapon |
| grappled | 1 | 2 AP to break free |
| pinned | 0.5 | can't move and −2 to hit for a round |
| nailed | 1 | 2 AP to pull free |
| slowed | 0.5 | half Movement for 2 rounds: about 1 AP of walking |
| weakened | 1 | 25% off about 2 attacks a turn for 2 rounds |
| blinded | 0.62 | −4 to hit on about 2 attacks |
| fear | 1 | can't attack the source for 2 rounds: about 1 attack redirected or lost |
| taunted | 0.5 | one attack forced onto the taunter |
| shaken | 0.1 | −2 on Heart saves |
| silenced | 1 | a caster loses a turn of magic; nothing against anyone else |
| confused | 0.5 | half of its attacks go astray for a round |
| left brain debuff | 0.25 | +1 AP on glyphs and Evokes; casters only |
| right brain debuff | 0.25 | +20% MP; casters only |
| commanded | 1 | one order obeyed on its next turn |

What the conversion does **not** price, on purpose: ammunition, Heat, MP, Strain, charge, Flux, cores, Devotion and supplies. They are in the "Other costs" column of every row, and they are the real price of magic and prayer: a spell that looks cheap in AP is paid in those. Position, information and a Narrator's judgement have no worth here either.

## Checked against the game (11 Nov 2026)

A second pass played 46 of these rows in the engine (the real rules, forced dice where a hit was needed) and read the code that runs them: AP before and after, the resource spent, the damage against the same weapon's plain attack.

| Family | Rows played | Result |
|---|---|---|
| Techniques | Guard, Cut, Coup, Break, Flurry, Sweep, Cleave, Shot, Burst, Suppress, Mag Dump, Last Round, Dead Centre, Lob | AP, Momentum and rounds as listed. Three rows were wrong and are fixed: Last Round (its +50% belongs to revolvers; the rifle gets +3 to hit only), Burst and Flurry (the test weapons roll 3 times, not 2: the engine's card is now the damage for every technique that rolls) |
| Class moves | Brace, Draw Fire, Finisher, Lunge, Shove, Triage, Stim Throw, Rally, Will Shield, Judgement, Killzone, Mark, Silver Tongue | AP and costs as listed. Will Shield was priced with Empathy the Guardian does not have (30 HP, not 51). Judgement costs 10 Devotion XP, which is a fraction of a level, not a level. Rally does not heal the Bard |
| Perk actions | Earthbreaker, Supreme Command, Bone Talk, Vanishing Act; the AP perks read in code | Earthbreaker has no attack roll and no save: it was under-priced, and is now 2 certain hits |
| Calls | Rally, Brief, Order (code and data, all three steps) | As listed. An Order spends the ally's reaction: now counted in its price. Rally and Brief count in the ally's +3 AP a turn |
| Sigil magic | FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK + SEEK, WARD + SEEK, MEND + SEEK, BIND + SEEK, QUICKEN + SEEK, Vent, core swap | Every sample spell was wrong on price: the walk between glyphs was missing (1 AP for a 2-glyph Line at Agility 4), fire damage missed the Elemental multiplier (65, not 51), heals were multiplied by Empathy a Sigil caster does not have (WARD 51, not 87), and the 4-glyph Line cannot be cast at these points. All fixed |
| Soul magic | Begin, Pump (the free first one and Empathy's), Release, a heal at stage 0, Control at stage 0, Syphon | As listed |
| Prayers | Whisper: Luck, Hymn II: Lightning Rod (and the wait before the next Hymn) | As listed: 68 and 33 damage with no roll for 3 AP at Faith 4 |
| Basic actions | Speed and tactical reload, walking and sprinting at Agility 4, prone, Shove, Analyze, Overwatch, an attempt | As listed. Walking is paid in whole AP: one tile costs 1 AP and leaves 1.5 tiles in hand |

What the check added: the 25 feelings, the basic Brace, loading loose rounds, attacking with both hands, reading a glyph, spending an Echo, and the pair "Throw, then Pull Out". What it took out of the two top lists, and why: rows that wait for a trigger (Riposte, Keep Back, Overwatch, Killzone, Cover Me) are no longer flagged, because their worth depends on how often the trigger comes, which only the fight simulator can measure; Throw and Pull Out are one play and are judged as the pair; a Hymn that stands a Downed ally up is not priced by its 14 HP.

## Could not be read, or the data and the engine disagree

1. Class move Unbroken: its data says once a scene, its text says once a fight.
2. Class move Reactive Plate: its data says it is used as a reaction, its text says it costs no reaction.
3. No AP could be read for 12 perk and trait buttons: the code works their AP out from the situation, the data gives none, and the button did not show in the test fight (it needs a drone, a caught grenade, a glyph on the ground…): Wall Run ("Wall Run strike"), Catch ("Throw it back"), Jury-Rig ("One more time"), Jury-Rig ("Patch the drone"), Lab Coat ("Neutralise agent"), Rite in the Field ("Crystallise (rite)"), Case Closed ("Close the case"), Twin Discipline ("Fused Evoke").
4. Hide (2 AP in the engine's code) is not in the action list of rules.json.

## The full table

One row per action. **AP** is the number on the action's own card where the engine has one. **Worth** is in plain attacks. **Against the yardstick**: 1.0× means it pays exactly half an attack per AP of full price. "Part priced" means part of what it does has no number, so it is never flagged. For techniques, "The engine's card" is what the game itself showed in a test fight (a sabre against three soldiers next to you; a service rifle against three soldiers 4 tiles off, the first one Pressed; 2 Momentum, 2 Guard). Where that card shows one attack roll, its damage is the one used.

### Plain attack

**Pistols**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Service pistol (.32 Decrkm) | 2 | 1 round of 12, +1 Heat (limit 6) |  | 25 damage to a soldier (60% to hit) | damage dealt | 0.63 | its expected damage ÷ the service rifle's (40 at 60%) | 0.6× | dear for what it does | engine (the attack card) |  |
| Decrkm auto-pistol | 2 | 1 round of 20, +1 Heat (limit 8) |  | 16 damage to a soldier (60% to hit) | damage dealt | 0.4 | its expected damage ÷ the service rifle's (40 at 60%) | 0.4× | dear for what it does | engine (the attack card) |  |
| Parlour pistol | 2 | 1 round of 2, +1 Heat (limit 4) |  | 19 damage to a soldier (70% to hit) | damage dealt | 0.55 | its expected damage ÷ the service rifle's (40 at 60%) | 0.6× | dear for what it does | engine (the attack card) |  |
| Magistrate heavy pistol | 2 | 1 round of 7, +1 Heat (limit 5) |  | 34 damage to a soldier (60% to hit) | damage dealt | 0.85 | its expected damage ÷ the service rifle's (40 at 60%) | 0.9× |  | engine (the attack card) |  |

**Revolvers**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Drifter revolver | 2 | 1 round of 6, +1 Heat (limit 6) |  | 37 damage to a soldier (60% to hit) | damage dealt | 0.93 | its expected damage ÷ the service rifle's (40 at 60%) | 0.9× |  | engine (the attack card) |  |
| Frontier hand cannon | 2 | 1 round of 5, +1 Heat (limit 4) |  | 55 damage to a soldier (60% to hit) | damage dealt | 1.38 | its expected damage ÷ the service rifle's (40 at 60%) | 1.4× |  | engine (the attack card) |  |

**Submachine guns**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Decrkm SMG (.32 Decrkm) | 2 | 1 round of 30, +1 Heat (limit 10) |  | 18 damage to a soldier (60% to hit) | damage dealt | 0.45 | its expected damage ÷ the service rifle's (40 at 60%) | 0.5× | dear for what it does | engine (the attack card) |  |
| Legion PDW | 3 | 1 round of 25, +1 Heat (limit 9) |  | 19 damage to a soldier (60% to hit) | damage dealt | 0.48 | its expected damage ÷ the service rifle's (40 at 60%) | 0.3× | dear for what it does | engine (the attack card) |  |
| Whisper SMG | 2 | 1 round of 30, +1 Heat (limit 12) |  | 15 damage to a soldier (60% to hit) | damage dealt | 0.38 | its expected damage ÷ the service rifle's (40 at 60%) | 0.4× | dear for what it does | engine (the attack card) |  |
| Mandestra drum-gun | 2 |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |

**Rifles**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hellraiser service rifle | 2 | 1 round of 24, +1 Heat (limit 8) |  | 40 damage to a soldier (60% to hit) | damage dealt | 1 | its expected damage ÷ the service rifle's (40 at 60%) | 1× |  | engine (the attack card) |  |
| Lever carbine | 2 | 1 round of 8, +1 Heat (limit 6) |  | 43 damage to a soldier (60% to hit) | damage dealt | 1.08 | its expected damage ÷ the service rifle's (40 at 60%) | 1.1× |  | engine (the attack card) |  |
| Long rifle | 2 | 1 round of 5, +1 Heat (limit 6) |  | 70 damage to a soldier (60% to hit) | damage dealt | 1.75 | its expected damage ÷ the service rifle's (40 at 60%) | 1.8× | cheap for what it does | engine (the attack card) |  |
| Adamantile battle rifle | 2 | 1 round of 15, +1 Heat (limit 6) |  | 57 damage to a soldier (60% to hit) | damage dealt | 1.43 | its expected damage ÷ the service rifle's (40 at 60%) | 1.4× |  | engine (the attack card) |  |
| CCEC marksman rifle | 2 | 1 round of 10, +1 Heat (limit 6) |  | 55 damage to a soldier (60% to hit) | damage dealt | 1.38 | its expected damage ÷ the service rifle's (40 at 60%) | 1.4× |  | engine (the attack card) |  |
| Legion bullpup | 2 | 1 round of 30, +1 Heat (limit 8) |  | 37 damage to a soldier (60% to hit) | damage dealt | 0.93 | its expected damage ÷ the service rifle's (40 at 60%) | 0.9× |  | engine (the attack card) |  |

**Shotguns**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Lumeri scattergun | 2 | 1 round of 6, +1 Heat (limit 6) |  | 55 damage to a soldier (60% to hit) | damage dealt | 1.38 | its expected damage ÷ the service rifle's (40 at 60%) | 1.4× |  | engine (the attack card) |  |
| Coach gun | 2 | 1 round of 2, +1 Heat (limit 4) |  | 63 damage to a soldier (60% to hit) | damage dealt | 1.58 | its expected damage ÷ the service rifle's (40 at 60%) | 1.6× | cheap for what it does | engine (the attack card) |  |
| Sawn-off | 2 | 1 round of 2, +1 Heat (limit 4) |  | 58 damage to a soldier (60% to hit) | damage dealt | 1.45 | its expected damage ÷ the service rifle's (40 at 60%) | 1.5× |  | engine (the attack card) |  |
| Brigade auto-shotgun | 2 | 1 round of 12, +1 Heat (limit 9) |  | 48 damage to a soldier (60% to hit) | damage dealt | 1.2 | its expected damage ÷ the service rifle's (40 at 60%) | 1.2× |  | engine (the attack card) |  |

**Heavy weapons**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| .700 Blackpoint anti-materiel | 2 |  |  | not an attack the engine could preview here: Brace it first (1 AP), or go prone. | damage dealt |  | not priced | not priced |  | data |  |
| Hellraiser LMG | 3 | 1 round of 100, +1 Heat (limit 14) |  | 33 damage to a soldier (50% to hit) | damage dealt | 0.69 | its expected damage ÷ the service rifle's (40 at 60%) | 0.5× | dear for what it does | engine (the attack card) |  |
| Hellraiser rotary | 2 |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |
| Smetanita thumper | 2 | 1 round of 6, +1 Heat (limit 4) |  | 55 damage to a soldier (60% to hit) | damage dealt | 1.38 | its expected damage ÷ the service rifle's (40 at 60%) | 1.4× |  | engine (the attack card) |  |
| Breacher tube | 2 | 1 round of 1 |  | 160 damage to a soldier (60% to hit) | damage dealt | 4 | its expected damage ÷ the service rifle's (40 at 60%) | 4× | cheap for what it does | engine (the attack card) |  |
| Purifier flamer | 2 | 1 round of 10 |  | 25 damage to a soldier (50% to hit) | damage dealt | 0.52 | its expected damage ÷ the service rifle's (40 at 60%) | 0.5× | dear for what it does | engine (the attack card) |  |

**Bows**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Recurve bow | 2 | 1 round of 20 |  | 55 damage to a soldier (60% to hit) | damage dealt | 1.38 | its expected damage ÷ the service rifle's (40 at 60%) | 1.4× |  | engine (the attack card) |  |
| Crossbow | 3 | 1 round of 1 |  | 78 damage to a soldier (60% to hit) | damage dealt | 1.95 | its expected damage ÷ the service rifle's (40 at 60%) | 1.3× |  | engine (the attack card) |  |
| Longbow | 2 | 1 round of 20 |  | 25 damage to a soldier (60% to hit) | damage dealt | 0.63 | its expected damage ÷ the service rifle's (40 at 60%) | 0.6× | dear for what it does | engine (the attack card) |  |
| Repeating crossbow | 2 | 1 round of 6 |  | 28 damage to a soldier (60% to hit) | damage dealt | 0.7 | its expected damage ÷ the service rifle's (40 at 60%) | 0.7× |  | engine (the attack card) |  |

**Light melee**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Combat knife | 2 |  |  | 18 damage to a soldier (60% to hit) | damage dealt | 0.45 | its expected damage ÷ the service rifle's (40 at 60%) | 0.5× | dear for what it does | engine (the attack card) |  |
| Sabre | 2 |  |  | 37 damage to a soldier (60% to hit) | damage dealt | 0.93 | its expected damage ÷ the service rifle's (40 at 60%) | 0.9× |  | engine (the attack card) |  |
| Throwing knives | 2 |  |  | 13 damage to a soldier (60% to hit) | damage dealt | 0.33 | its expected damage ÷ the service rifle's (40 at 60%) | 0.3× | dear for what it does | engine (the attack card) |  |
| Hatchet | 2 |  |  | 28 damage to a soldier (60% to hit) | damage dealt | 0.7 | its expected damage ÷ the service rifle's (40 at 60%) | 0.7× |  | engine (the attack card) |  |
| Legion gladius | 2 |  |  | 34 damage to a soldier (60% to hit) | damage dealt | 0.85 | its expected damage ÷ the service rifle's (40 at 60%) | 0.9× |  | engine (the attack card) |  |
| Kemizuchi duelling blade | 2 |  |  | 31 damage to a soldier (65% to hit) | damage dealt | 0.84 | its expected damage ÷ the service rifle's (40 at 60%) | 0.8× |  | engine (the attack card) |  |

**Heavy melee**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Ork machete | 3 |  |  | 48 damage to a soldier (60% to hit) | damage dealt | 1.2 | its expected damage ÷ the service rifle's (40 at 60%) | 0.8× |  | engine (the attack card) |  |
| Maul | 3 |  |  | 63 damage to a soldier (60% to hit) | damage dealt | 1.58 | its expected damage ÷ the service rifle's (40 at 60%) | 1.1× |  | engine (the attack card) |  |
| Lance | 3 |  |  | 43 damage to a soldier (60% to hit) | damage dealt | 1.08 | its expected damage ÷ the service rifle's (40 at 60%) | 0.7× |  | engine (the attack card) |  |
| War axe | 3 |  |  | 55 damage to a soldier (60% to hit) | damage dealt | 1.38 | its expected damage ÷ the service rifle's (40 at 60%) | 0.9× |  | engine (the attack card) |  |
| Adamantile greatsword | 3 |  |  | 58 damage to a soldier (60% to hit) | damage dealt | 1.45 | its expected damage ÷ the service rifle's (40 at 60%) | 1× |  | engine (the attack card) |  |
| Glaive | 3 |  |  | 49 damage to a soldier (60% to hit) | damage dealt | 1.23 | its expected damage ÷ the service rifle's (40 at 60%) | 0.8× |  | engine (the attack card) |  |
| Ork rip-saw | 3 |  |  | 57 damage to a soldier (60% to hit) | damage dealt | 1.43 | its expected damage ÷ the service rifle's (40 at 60%) | 1× |  | engine (the attack card) |  |

**Unarmed**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Gloves or bare fists | 2 |  |  | 12 damage to a soldier (60% to hit) | damage dealt | 0.3 | its expected damage ÷ the service rifle's (40 at 60%) | 0.3× | dear for what it does | engine (the attack card) |  |
| Knuckledusters | 2 |  |  | 22 damage to a soldier (60% to hit) | damage dealt | 0.55 | its expected damage ÷ the service rifle's (40 at 60%) | 0.6× | dear for what it does | engine (the attack card) |  |
| Hellraiser servo-fist | 2 |  |  | 46 damage to a soldier (60% to hit) | damage dealt | 1.15 | its expected damage ÷ the service rifle's (40 at 60%) | 1.2× |  | engine (the attack card) |  |
| Bite and claws | 2 |  |  | 26 damage to a soldier (60% to hit) | damage dealt | 0.65 | its expected damage ÷ the service rifle's (40 at 60%) | 0.7× | dear for what it does | engine (the attack card) |  |

**Thrown**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Frag grenade | ? |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |
| Smoke grenade | ? |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |
| Flashbang | ? |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |
| Satchel charge | 2 |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |
| Incendiary grenade | 2 |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |
| Bot-scrambler | 2 |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |

**Foci (Evokers and Emanators)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Science Team core rifle | 2 | 1 round of 10 |  | 48 damage to a soldier (60% to hit) | damage dealt | 1.2 | its expected damage ÷ the service rifle's (40 at 60%) | 1.2× |  | engine (the attack card) |  |
| Spellslinger's pistol | 2 | 1 round of 12, +1 Heat (limit 6) |  | 28 damage to a soldier (60% to hit) | damage dealt | 0.7 | its expected damage ÷ the service rifle's (40 at 60%) | 0.7× |  | engine (the attack card) |  |
| Evoker blade | 2 |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |
| Emanator gauntlet | 2 |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |
| Lumeri censer gun | 2 | 1 round of 6, +1 Heat (limit 6) |  | 40 damage to a soldier (60% to hit) | damage dealt | 1 | its expected damage ÷ the service rifle's (40 at 60%) | 1× |  | engine (the attack card) |  |
| Bot-thread banner | 2 |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |
| Grand staff | 2 |  |  | not an attack the engine could preview here: This weapon has no burst. | damage dealt |  | not priced | not priced |  | data |  |

### Technique

**melee · Openers**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | The engine's card | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Lunge | 2 (the weapon's attack) |  |  | 1 strike + a free step of 1 tile | damage dealt | 1.25 | damage ×1 + the rest 0.25 | 1.3× |  | damage ×1 of the plain attack over 1 roll | engine (the technique card) + data |  |
| Charge | 2 (the weapon's attack) | 1 Momentum (the first Opener of a fight is free); a straight run of 3+ tiles this turn |  | 1 strike at +30% (a 3-tile run; up to +50%) [at most: ×1.5] | damage dealt | 1.3 | damage ×1.3 | 1× |  | no card in the test fight ("No straight run of 3 tiles to Soldier A.") | data |  |
| Feint | 1 |  |  | no damage; +3 to hit on your next technique if it fails a Brain save | damage dealt | 0.12 | the rest 0.12 | 0.2× | dear for what it does | save TN 16 | engine (the technique card) + data |  |
| Draw Cut | 1 (the weapon's attack −1) | 1 Momentum (the first Opener of a fight is free); the weapon must be stowed |  | 1 strike + the 1 AP draw it replaces | damage dealt | 1.5 | damage ×1 + the rest 0.5 | 2× | cheap for what it does | no card in the test fight ("Pick the weapon to draw.") | data |  |
| Ambush | 2 (the weapon's attack) | you must be Hidden; the 2 AP Hide before it is counted in the price |  | 1 strike at the Ambush multiplier (×1.7 at Ingenuity 4); a critical on 19 or 20 | damage dealt | 1.7 | damage ×1.7 | 0.9× |  | no card in the test fight ("Only while you are Hidden.") | data |  |

**melee · Strikes**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | The engine's card | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Cut | 2 (the weapon's attack) |  |  | the plain attack | damage dealt | 1 | damage ×1 | 1× |  | damage ×1 of the plain attack over 1 roll | engine (the technique card) + data |  |
| Sweep | 3 (the weapon's attack +1) | 1 Momentum |  | ×0.7 on each of 2 enemies (up to 3) · with the sabre the engine rolls 2 times (60%, 60%): ×1.3 of its plain attack [at most: ×2.1 on 3 enemies] | damage dealt | 1.3 | damage ×1.3 (the data's numbers alone give ×1.4) | 0.7× |  | damage ×1.3 of the plain attack over 2 rolls | engine (the technique card) + data |  |
| Bash | 2 (the weapon's attack) | 1 Momentum |  | ×0.5 + Dazed on a failed Body save | damage dealt | 0.76 | damage ×0.43 + the rest 0.33 | 0.6× | dear for what it does | damage ×0.43 of the plain attack over 1 roll; save TN 14 | engine (the technique card) + data |  |
| Sunder | 2 (the weapon's attack) | 1 Momentum |  | ×0.7 + armour −5 for the fight (about 4 later hits) | damage dealt | 1.15 | damage ×0.65 + the rest 0.5 | 0.9× |  | damage ×0.65 of the plain attack over 1 roll | engine (the technique card) + data |  |
| Flurry | 3 (the weapon's attack +1) | 1 Momentum |  | 2 strikes at ×0.6, the second at -1 to hit · with the sabre the engine rolls 3 times (60%, 55%, 55%): ×1.53 of its plain attack [at most: 3 strikes with a light weapon (×1.8)] | damage dealt | 1.53 | damage ×1.53 (the data's numbers alone give ×1.15) | 0.9× |  | damage ×1.53 of the plain attack over 3 rolls | engine (the technique card) + data |  |
| Hamstring | 2 (the weapon's attack) | 1 Momentum |  | ×0.7 + Slowed 2 rounds on a failed Body save | damage dealt | 0.81 | damage ×0.65 + the rest 0.16 | 0.6× | dear for what it does | damage ×0.65 of the plain attack over 1 roll | engine (the technique card) + data |  |
| Bind | 2 (the weapon's attack) | 1 Momentum |  | no damage; the target attacks anyone but you at −2 until your next turn, and can't walk away without a save | damage prevented | 0.31 | the rest 0.31 | 0.2× | part priced |  | engine (the technique card) + data |  |
| Half-Sword | 2 (the weapon's attack) | 1 Momentum |  | ×0.8, ignoring 10 armour (a soldier has 5) · with the sabre the engine rolls 1 time (60%): ×0.92 of its plain attack | damage dealt | 1.11 | damage ×0.92 (the data's numbers alone give ×0.8) + the rest 0.19 | 0.9× |  | damage ×0.92 of the plain attack over 1 roll | engine (the technique card) + data |  |
| Throw | 2 (the weapon's attack) | 1 Momentum |  | a weapon not made for throwing: ×0.7 at −2 to hit; a throwing weapon: ×1. The weapon leaves your hand until you Pull Out (see "Throw, then Pull Out") [at most: ×1 with a throwing weapon] | damage dealt | 0.54 | damage ×0.54 | 0.4× | part priced | damage ×0.54 of the plain attack over 1 roll; Pressure +2 | engine (the technique card) + data |  |
| Pull Out | 1 | your thrown weapon stuck in the target, and you next to it |  | 50% of the weapon's damage with no roll + Bleeding (15 damage); only after a Throw that hit (see "Throw, then Pull Out") | damage dealt | 1.35 | damage ×0.77 + the rest 0.58 | 2.7× | part priced | no card in the test fight ("No weapon is stuck in Soldier A.") | data |  |
| Shield Bash | 2 | 1 Guard; a shield in the off hand |  | a bare-hand strike at ×1.5 (fist damage, not the weapon's: not priced) + 1 Momentum on a hit, a push on a failed save | damage dealt | 0.24 | the rest 0.24 | 0.2× | part priced | no card in the test fight ("Needs a shield in your off hand.") | data |  |

**melee · Links**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | The engine's card | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Sidestep | 1 |  |  | a free step of 1 tile; your next Strike ignores a shield and counts as flanking (not priced) | position | 0.25 | the rest 0.25 | 0.5× | part priced |  | engine (the technique card) + data |  |
| Guard | 1 |  | once a turn (you stay on Guard until your next turn); the pool holds your Durability points, 5 at most | +2 Defense against melee until your next turn + 4 Guard at Durability 4 (each soaks 10 damage) | damage prevented | 1.85 | the rest 1.85 | 3.7× | cheap for what it does |  | engine (the technique card) + data |  |
| Shove | 1 |  |  | the enemy is pushed 1 tile (it walks back), or Prone if it can't move back; what the push sets up is not priced | position | 0.25 | the rest 0.25 | 0.5× | part priced | save TN 13 | engine (the technique card) + data |  |
| Trip | 1 |  |  | Prone on a failed Body save (1 AP to stand, and melee attacks on it at +2) | enemy AP removed | 0.33 | the rest 0.33 | 0.7× | dear for what it does | save TN 14 | engine (the technique card) + data |  |
| Drag | 1 |  |  | the target is pulled 1 tile, or you swap tiles (Body save) | position | 0.25 | the rest 0.25 | 0.5× | part priced | save TN 14 | engine (the technique card) + data |  |
| Raise Shield | 1 | a shield in the off hand |  | ranged attacks from the front at −2 to hit you until your next turn; turns Momentum into Guard 1 for 1 | damage prevented | 0.31 | the rest 0.31 | 0.6× | dear for what it does | no card in the test fight ("Needs a shield in your off hand.") | data |  |
| Grapple | 1 | the perk Iron Grip |  | Grappled on a failed Body save (2 AP to break free); sets up Throw Down | enemy AP removed | 0.5 | the rest 0.5 | 1× |  | no card in the test fight ("You don't have Grapple ready.") | data |  |

**melee · Finishers**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | The engine's card | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Coup | 2 (the weapon's attack) | all your Momentum (at least 2) |  | 1 strike at +25% per Momentum (2 spent) [at most: ×2.25 at 5 Momentum (a Fighter)] | damage dealt | 1.57 | damage ×1.57 | 1× |  | damage ×1.57 of the plain attack over 1 roll | engine (the technique card) + data |  |
| Cleave | 2 (the weapon's attack) | all your Momentum (at least 2) |  | 1 strike, repeated at full damage on 1 more adjacent enemy (up to 1 more per Momentum) [at most: ×3 with 2 Momentum and 3 enemies adjacent] | damage dealt | 2 | damage ×2 | 1.3× |  | damage ×2 of the plain attack over 2 rolls | engine (the technique card) + data |  |
| Break | 2 (the weapon's attack) | all your Momentum (at least 2) |  | 1 strike + Stunned (a lost turn) on a failed Body save at −1 per Momentum; a boss is Dazed instead | damage dealt | 2.17 | damage ×1 + the rest 1.17 | 1.4× |  | damage ×1 of the plain attack over 1 roll; save TN 16 | engine (the technique card) + data |  |
| Run Through | 2 (the weapon's attack) | all your Momentum (at least 2) |  | 1 strike at +20% per Momentum (2 spent) + Pinned with no save until it spends 2 AP · with the sabre the engine rolls 1 time (50%): ×1.22 of its plain attack | damage dealt | 1.87 | damage ×1.22 (the data's numbers alone give ×1.4) + the rest 0.65 | 1.2× |  | damage ×1.22 of the plain attack over 1 roll | engine (the technique card) + data |  |
| Throw Down | 2 (the weapon's attack) | all your Momentum (at least 2); the target Grappled or Bound |  | ×1.5 (2 Momentum) + Prone, no save | damage dealt | 1.83 | damage ×1.5 + the rest 0.33 | 1.2× |  | no card in the test fight ("Needs a target you have Bound or Grappled.") | data |  |

**melee · Answers**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | The engine's card | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Parry | 0 (reaction) | your reaction | once a round (the reaction) | an opposed roll; if you win, the hit does half damage · only if the trigger comes | damage prevented | 0.25 | the rest 0.25 | 0.5× | part priced | no card in the test fight ("Parry is a reaction: it fires on its trigger.") | data |  |
| Riposte | 0 (reaction) | your reaction | once a round (the reaction) | a free strike when a melee attack misses you · only if the trigger comes | damage dealt | 1 | damage ×1 | 2× | part priced | no card in the test fight ("Riposte is a reaction: it fires on its trigger.") | data |  |
| Keep Back | 0 (reaction) | your reaction | once a round (the reaction) | a free strike at an enemy entering your reach; on a hit it saves or stops there · only if the trigger comes | damage dealt | 1.16 | damage ×1 + the rest 0.16 | 2.3× | part priced | no card in the test fight ("Keep Back is a reaction: it fires on its trigger.") | data |  |
| Shield Wall | 0 (reaction) | 1 Guard; your reaction; a shield in the off hand | once a round (the reaction) | a shot at an ally next to you is at −5 to hit · only if the trigger comes | damage prevented | 0.38 | the rest 0.38 | 0.8× | part priced | no card in the test fight ("Needs a shield in your off hand.") | data |  |
| Interpose | 0 (reaction) | 1 Guard; your reaction; Durability 3 | once a round (the reaction) | you take a hit meant for an ally next to you, with your armour and Guard (worth the difference between the two of you) · only if the trigger comes | damage prevented |  | not priced | not priced |  | no card in the test fight ("Interpose is a reaction: it fires on its trigger.") | data |  |

**ranged · Fire**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | The engine's card | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Shot | 2 | 1 round |  | the plain attack | damage dealt | 1 | damage ×1 | 1× |  | damage ×1 of the plain attack over 1 roll; Pressure +2 | engine (the technique card) + data |  |
| Snap Shot | 2 | 1 round; the weapon must be stowed |  | 1 shot at −2 to hit + the 1 AP draw it replaces | damage dealt | 1.35 | damage ×0.85 + the rest 0.5 | 1.3× |  | no card in the test fight ("Pick the weapon to draw.") | data |  |
| Burst | 3 | 3 rounds |  | 2 shots, the second at −2 to hit · with the service rifle the engine rolls 3 times (60%, 55%, 45%): ×2.46 of its plain attack [at most: 3 shots with an automatic weapon] | damage dealt | 2.46 | damage ×2.46 (the data's numbers alone give ×1.85) | 1.6× | cheap for what it does | damage ×2.46 of the plain attack over 3 rolls; Pressure +2 | engine (the technique card) + data |  |
| Aimed Shot | 3 | 1 round |  | 1 shot at +2 to hit | damage dealt | 1.15 | damage ×1.15 | 0.8× |  | damage ×1.15 of the plain attack over 1 roll; Pressure +2 | engine (the technique card) + data |  |
| Called Shot | 3 | 1 round |  | 1 shot at −2 to hit + Dazed (head), Slowed (leg) or a lowered weapon (arm) on a failed Body save; priced for the head | damage dealt | 1.17 | damage ×0.85 + the rest 0.33 | 0.8× |  | no card in the test fight ("Call the shot: leg, arm or head.") | data |  |
| Walking Fire | 3 | 1 round |  | 1 shot + 2 tiles of movement | damage dealt | 1.5 | damage ×1 + the rest 0.5 | 1× |  | no card in the test fight ("Pick the tile the move ends on.") | data |  |
| Punch Through | 3 | 1 round; only better than a Shot against a target in half cover |  | 1 shot; half cover gives the target −2 instead of −5, and the cover takes the damage too | damage dealt | 1.23 | damage ×1.23 | 0.8× |  | damage ×0.92 of the plain attack over 1 roll; Pressure +2 | engine (the technique card) + data |  |
| Lob | 3 | 1 round; an ally who sees the target |  | 1 shot at -4 to hit at a target you can't see (an ally must) · with the service rifle the engine rolls 1 time (30%): ×0.46 of its plain attack | damage dealt | 0.46 | damage ×0.46 (the data's numbers alone give ×0.69) | 0.3× | dear for what it does | damage ×0.46 of the plain attack over 1 roll; Pressure +2 | engine (the technique card) + data |  |
| Heavy Bolt | 4 | 1 round |  | 1 bolt at +50%, ignoring 10 armour; a pushed tile on a failed save · with the service rifle the engine rolls 1 time (70%): ×1.83 of its plain attack | damage dealt | 2.1 | damage ×1.83 (the data's numbers alone give ×1.5) + the rest 0.27 | 1.1× |  | damage ×1.83 of the plain attack over 1 roll; Pressure +2; save TN 14 | engine (the technique card) + data |  |

**ranged · Press**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | The engine's card | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Suppress | 3 | 3 rounds |  | half damage at +2 to hit + 2 Pressure on a hit, 1 on a miss | damage dealt | 0.9 | damage ×0.48 + the rest 0.41 | 0.6× | dear for what it does | damage ×0.48 of the plain attack over 1 roll; Pressure +2, +1 | engine (the technique card) + data |  |
| Rake | 4 | 10 rounds |  | a shot at -3 to hit at each of 2 enemies standing together (up to 3), 1 Pressure per hit [at most: ×2.31 on 3 enemies] | damage dealt | 1.86 | damage ×1.54 + the rest 0.33 | 0.9× |  | damage ×1.54 of the plain attack over 2 rolls; Pressure +1, +1 | engine (the technique card) + data |  |
| Warning Shot | 1 | 1 round |  | no damage; 1 Pressure on a failed Heart save | enemy AP removed | 0.13 | the rest 0.13 | 0.3× | dear for what it does | Pressure +1; save TN 14 | engine (the technique card) + data |  |
| Flush | 3 | 1 round |  | no roll: 2 Pressure, and the cover takes double the weapon's damage (the cover is not priced) | enemy AP removed | 0.5 | the rest 0.5 | 0.3× | part priced | no card in the test fight ("Soldier A has no cover between you to flush.") | data |  |
| Mag Dump | 4 | 24 rounds; one shot per 3 rounds left, so 12 or more for all 4; the 2 AP reload after it is counted in the price |  | 4 shots (a full magazine), each at −1 more, +1 Pressure per hit; the weapon is empty afterwards · with the service rifle the engine rolls 4 times (60%, 55%, 45%, 40%): ×3.08 of its plain attack | damage dealt | 3.73 | damage ×3.08 (the data's numbers alone give ×3.54) + the rest 0.65 | 1.2× |  | damage ×3.08 of the plain attack over 4 rolls; Pressure +1, +1, +0, +0 | engine (the technique card) + data |  |
| Crossfire | 2 | 1 round; an ally has hit the target this round |  | 1 shot at +2 to hit, +1 Pressure on a hit | damage dealt | 1.32 | damage ×1.15 + the rest 0.16 | 1.3× |  | no card in the test fight ("No ally has hit Soldier A this round.") | data |  |

**ranged · Sets**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | The engine's card | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Bead | 1 |  |  | your shots at one target ignore 1 range band (−2 to hit beyond effective range), and its Pressure doesn't fall; priced as one shot helped | damage dealt | 0.15 | the rest 0.15 | 0.3× | part priced |  | engine (the technique card) + data |  |
| Spot | 1 |  |  | allies get +1 to hit the target until your next turn (about 3 attacks), +1 Pressure on the first hit | damage dealt | 0.39 | the rest 0.39 | 0.8× |  |  | engine (the technique card) + data |  |
| Brace | 1 |  |  | Recoil halved until you move (worth more the more you fire) | damage dealt |  | not priced | not priced |  |  | engine (the technique card) + data |  |
| Load Special | 1 |  |  | one special round for your next shot (worth what the round is worth) | damage dealt |  | not priced | not priced |  | no card in the test fight ("You carry no special rounds.") | data |  |
| Shift | 1 |  |  | 1 tile from cover to cover without setting off a held shot | position | 0.25 | the rest 0.25 | 0.5× | part priced | no card in the test fight ("Name a tile.") | data |  |
| Vent | 1 |  |  | −2 Heat: +1 to hit on your next shots (2 counted), and further from a jam | damage dealt | 0.15 | the rest 0.15 | 0.3× | part priced | no card in the test fight ("The barrel is cool: no Heat to vent.") | data |  |
| Head Down | 1 |  |  | −1 Pressure on yourself (−2 behind full cover); no held shot this round [at most: 0.5 behind full cover] | damage prevented | 0.25 | the rest 0.25 | 0.5× | dear for what it does | no card in the test fight ("You aren't under Pressure.") | data |  |

**ranged · Takes**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | The engine's card | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| Dead Centre | 3 | 1 round; the target must be Pressed (2 Pressure) |  | 1 shot at +50% · with the service rifle the engine rolls 1 time (70%): ×1.7 of its plain attack | damage dealt | 1.7 | damage ×1.7 (the data's numbers alone give ×1.5) | 1.1× |  | damage ×1.7 of the plain attack over 1 roll; Pressure −2 | engine (the technique card) + data |  |
| Pin Down | 3 | 1 round; the target must be Pressed (2 Pressure) |  | ×0.7 + Pinned 1 round on a failed save · with the service rifle the engine rolls 1 time (60%): ×0.92 of its plain attack | damage dealt | 1.09 | damage ×0.92 (the data's numbers alone give ×0.7) + the rest 0.16 | 0.7× |  | damage ×0.92 of the plain attack over 1 roll; Pressure −2; save TN 14 | engine (the technique card) + data |  |
| Rout | 3 | 1 round; the target must be Pressed (2 Pressure) |  | no damage; on a failed Heart save the target runs its full move away (6 AP of its turn), drawing opportunity attacks and held shots | enemy turn removed | 1.5 | the rest 1.5 | 1× |  | Pressure −2; save TN 14 | engine (the technique card) + data |  |
| Stopping Shot | 2 | 1 round; the target must be Pressed (2 Pressure) |  | 1 shot + −1 AP next turn and a 1-tile push on a failed save | damage dealt | 1.17 | damage ×0.92 + the rest 0.24 | 1.2× |  | damage ×0.92 of the plain attack over 1 roll; Pressure −2; save TN 14 | engine (the technique card) + data |  |
| Storm | 3 | 1 round; the target must be Pressed (2 Pressure) |  | 1 shot + up to 3 tiles toward the target with no reaction from it | damage dealt | 1.67 | damage ×0.92 + the rest 0.75 | 1.1× |  | damage ×0.92 of the plain attack over 1 roll; Pressure −2 | engine (the technique card) + data |  |
| Last Round | 2 | 1 round; the target must be Pressed (2 Pressure); the last round in the weapon |  | 1 shot at +3 to hit; a free speed reload if it takes the target out (not priced). The +50% is a revolver's line (Quick or Precise weapons), not the rifle's [at most: ×1.85 with a revolver] | damage dealt | 1.15 | damage ×1.15 | 1.2× | part priced | damage ×1.15 of the plain attack over 1 roll; Pressure −2 | engine (the technique card) + data |  |

**ranged · Hold a shot**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Overwatch | 2 (the weapon's attack) | your reaction | once a round (the reaction) | 1 shot at the first enemy that moves in your sight, on its turn · only if the trigger comes | damage dealt | 1 | damage ×1 | 0.7× | part priced | engine (the technique card) + data |  |
| Deny | 2 | your reaction | once a round (the reaction) | 1 shot at the first enemy onto a tile you picked; on a hit it stops and loses the rest of its move · only if the trigger comes | damage dealt | 1.33 | damage ×1 + the rest 0.33 | 0.9× | part priced | engine (the technique card) + data |  |
| Cover Me | 2 | your reaction | once a round (the reaction) | the first enemy to attack one ally does it at −2 to hit and gains 1 Pressure · only if the trigger comes | damage prevented | 0.4 | the rest 0.4 | 0.3× | part priced | engine (the technique card) + data |  |
| Dead to Rights | 3 | your reaction | once a round (the reaction) | 1 shot at +2 to hit, before a Pressed enemy acts · only if the trigger comes | damage dealt | 1.15 | damage ×1.15 | 0.6× | part priced | engine (the technique card) + data |  |

### Pair of techniques

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Throw, then Pull Out | 3 (2 + 1) | 1 Momentum; you must be next to the target for the Pull Out, and have no weapon in between |  | the Throw (0.54 attack), then, if it hit (55%), the Pull Out (1.35 attack, no roll) | damage dealt | 1.28 | 0.54 + 55% × 1.35 | 0.7× |  | the two rows above it | the walk to the target is not counted |

### Call

**Authority**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Order, step 1 (1 point) | 2 | the ally's reaction | a unit takes one helping Call a round | an ally does 1 thing for none of their AP (a reload is 2 AP); it uses their reaction, counted in the price | AP given to the squad | 1 | worth 1 | 0.7× | dear for what it does | data (calls.json) |  |
| Order, step 2 (3 points) | 2 (1 from 5 points) | the ally's reaction | a unit takes one helping Call a round | an ally does 1 thing for none of their AP (a reload is 2 AP, a move 1 AP); it uses their reaction, counted in the price | AP given to the squad | 1 | worth 1 | 0.7× | dear for what it does | data (calls.json) |  |
| Order, step 3 (7 points) | 1 | the ally's reaction | a unit takes one helping Call a round | an ally does 2 things for none of their AP (a reload is 2 AP, a move 1 AP); it uses their reaction, counted in the price | AP given to the squad | 1.5 | worth 1.5 | 1.5× | cheap for what it does | data (calls.json) |  |

**Charisma**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Rally, step 1 (1 point) | 2 |  | a unit takes one helping Call a round | +1 AP to an ally | AP given to the squad | 0.5 | worth 0.5 | 0.5× | dear for what it does | data (calls.json) |  |
| Rally, step 2 (3 points) | 2 (1 from 5 points) |  | a unit takes one helping Call a round | +1 AP to an ally and −1 Pressure | AP given to the squad | 0.75 | worth 0.75 | 0.8× |  | data (calls.json) |  |
| Rally, step 3 (7 points) | 1 |  | a unit takes one helping Call a round | +2 AP to an ally and −1 Pressure | AP given to the squad | 1.25 | worth 1.25 | 2.5× | cheap for what it does | data (calls.json) |  |

**Eloquence**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Brief, step 1 (1 point) | 2 |  | a unit takes one helping Call a round | an ally's next action costs 1 AP less in all | AP given to the squad | 0.5 | worth 0.5 | 0.5× | dear for what it does | data (calls.json) |  |
| Brief, step 2 (3 points) | 2 (1 from 5 points) |  | a unit takes one helping Call a round | an ally's next actions cost 2 AP less in all | AP given to the squad | 1 | worth 1 | 1× |  | data (calls.json) |  |
| Brief, step 3 (7 points) | 1 |  | a unit takes one helping Call a round | an ally's next actions cost 3 AP less in all | AP given to the squad | 1.5 | worth 1.5 | 3× | cheap for what it does | data (calls.json) |  |

**Lore Master**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Name It, step 1 (1 point) | 2 |  | a unit takes one helping Call a round | +2 on saves until your next turn (priced against one condition worth 1 attack) | damage prevented | 0.1 | worth 0.1 | 0.1× | dear for what it does | data (calls.json) |  |
| Name It, step 2 (3 points) | 2 (1 from 5 points) |  | a unit takes one helping Call a round | +3 on saves until your next turn (priced against one condition worth 1 attack) + a new save against a condition they carry | damage prevented | 0.4 | worth 0.4 | 0.4× | dear for what it does | data (calls.json) |  |
| Name It, step 3 (7 points) | 1 |  | a unit takes one helping Call a round | +4 on saves until your next turn (priced against one condition worth 1 attack) + a new save against a condition they carry + ends Shaken and Afraid | damage prevented | 0.45 | worth 0.45 | 0.9× | part priced | data (calls.json) |  |

**Reaction Speed**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Cue, step 1 (1 point) | 2 |  | a unit takes one helping Call a round | an ally gets one more reaction | AP given to the squad | 0.5 | worth 0.5 | 0.5× | dear for what it does | data (calls.json) |  |
| Cue, step 2 (3 points) | 2 (1 from 5 points) |  | a unit takes one helping Call a round | an ally gets one more reaction, or a free step | AP given to the squad | 0.5 | worth 0.5 | 0.5× | dear for what it does | data (calls.json) |  |
| Cue, step 3 (7 points) | 1 |  | a unit takes one helping Call a round | an ally gets one more reaction, or a free step | AP given to the squad | 0.5 | worth 0.5 | 1× |  | data (calls.json) |  |

**Vigilance**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Spot, step 1 (1 point) | 2 | only worth it against a target in cover | a unit takes one hindering Call a round | the next ally to attack it ignores its cover (−5 to hit in half cover); no save | damage dealt | 0.38 | worth 0.38 | 0.4× | dear for what it does | data (calls.json) |  |
| Spot, step 2 (3 points) | 2 (1 from 5 points) | only worth it against a target in cover | a unit takes one hindering Call a round | the next ally to attack it ignores its cover (−5 to hit in half cover); no save | damage dealt | 0.38 | worth 0.38 | 0.4× | dear for what it does | data (calls.json) |  |
| Spot, step 3 (7 points) | 1 | only worth it against a target in cover | a unit takes one hindering Call a round | the next 2 allies to attack it ignore its cover (−5 to hit in half cover) and get +1 to hit; no save | damage dealt | 0.92 | worth 0.92 | 1.8× | cheap for what it does | data (calls.json) |  |

**Senses**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Warn, step 1 (1 point) | 2 |  | a unit takes one helping Call a round | an ally steps 1 tile out of the next weapon attack on them (priced as wasting it half the time) | damage prevented | 0.5 | worth 0.5 | 0.5× | dear for what it does | data (calls.json) |  |
| Warn, step 2 (3 points) | 2 (1 from 5 points) |  | a unit takes one helping Call a round | an ally steps 2 tiles out of the next weapon attack on them (priced as wasting it half the time) | damage prevented | 0.5 | worth 0.5 | 0.5× | dear for what it does | data (calls.json) |  |
| Warn, step 3 (7 points) | 1 |  | a unit takes one helping Call a round | an ally steps 2 tiles out of the next weapon attack on them (priced as wasting it half the time); that attack is at -2 to hit | damage prevented | 0.65 | worth 0.65 | 1.3× |  | data (calls.json) |  |

**Intimidation**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Threaten, step 1 (1 point) | 2 | the enemy saves against 12 + your strength | a unit takes one hindering Call a round | on a failed Heart save: Shaken 3 rounds, −1 AP next turn | enemy AP removed | 0.3 | worth 0.3 | 0.3× | dear for what it does | data (calls.json) |  |
| Threaten, step 2 (3 points) | 2 (1 from 5 points) | the enemy saves against 12 + your strength | a unit takes one hindering Call a round | on a failed Heart save: Shaken 3 rounds, −1 AP next turn, can't close on you | enemy AP removed | 0.43 | worth 0.43 | 0.4× | dear for what it does | data (calls.json) |  |
| Threaten, step 3 (7 points) | 1 | the enemy saves against 12 + your strength | a unit takes one hindering Call a round | on a failed Heart save: Shaken 3 rounds, −2 AP next turn, can't close on you | enemy AP removed | 0.68 | worth 0.68 | 1.4× |  | data (calls.json) |  |

**Insinuation**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Taunt, step 1 (1 point) | 2 | the enemy saves against 12 + your strength | a unit takes one hindering Call a round | on a failed Heart save: its next attack must be at you | enemy AP removed | 0.25 | worth 0.25 | 0.3× | dear for what it does | data (calls.json) |  |
| Taunt, step 2 (3 points) | 2 (1 from 5 points) | the enemy saves against 12 + your strength | a unit takes one hindering Call a round | on a failed Heart save: its next attack must be at you and costs it 1 AP more | enemy AP removed | 0.5 | worth 0.5 | 0.5× | dear for what it does | data (calls.json) |  |
| Taunt, step 3 (7 points) | 1 | the enemy saves against 12 + your strength | a unit takes one hindering Call a round | on a failed Heart save: its next attack must be at you and costs it 2 AP more | enemy AP removed | 0.75 | worth 0.75 | 1.5× | cheap for what it does | data (calls.json) |  |

**every skill**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Any Call as a reaction (9 points) | 0 (reaction) | your reaction | 1 a round | the Call's step 3, off your turn | as the Call |  | as the Call at step 3 | not priced |  | data (calls.json) |  |
| The first Call of your turn (10 points) | 0 |  | 1 a turn | the Call's step 3, for nothing | as the Call |  | as the Call at step 3 | not priced |  | data (calls.json) |  |

### Class move

**Defender**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Brace (rank I) | 2 |  |  | 4 Guard at Durability 4 (each soaks 10 damage) + 2 Defense until you move | damage prevented | 1.85 | the rest 1.85 | 1.8× | cheap for what it does | engine (its button) + data |  |
| Draw Fire (rank I) | 1 | 1 Guard |  | Taunted with no save: its next attack must be at you, −2 to hit anyone else | damage prevented | 0.65 | the rest 0.65 | 1.3× |  | engine (its button) + data |  |
| Unbroken (rank II) | none (always on) |  | once a scene | once a fight you stay at 1 HP instead of going down, and gain 3 Guard | damage prevented |  | not priced |  |  | data (classes.json) |  |
| Shrug It Off (rank II) | 0 (by itself, on your reaction) | 1 Guard; your reaction |  | Bleeding, Slowed, Weakened or Prone ends at once (worth the condition it ends) | damage prevented |  | not priced |  |  | data (classes.json) |  |
| Reactive Plate (rank III) | none (always on) |  |  | each Guard takes 10 off a hit, for no AP and no reaction (priced per Guard) | damage prevented | 0.38 | the rest 0.38 |  |  | data (classes.json) |  |
| Anchor (rank III) | 0 (by itself, on your reaction) | your reaction |  | while Braced you can't be moved or knocked Prone; an opportunity attack even on a Disengage | position |  | not priced |  |  | data (classes.json) |  |

**Fighter**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Lunge (rank I) | 2 or 3 (your melee attack) | 1 Momentum |  | 1 strike + a free move of up to 2 tiles | damage dealt | 1.5 | damage ×1 + the rest 0.5 | 1.2× |  | engine (its button) + data |  |
| Shove (rank I) | 1 |  |  | a 1-tile push or Prone, your choice, on a failed Body save | enemy AP removed | 0.25 | the rest 0.25 | 0.5× | dear for what it does | engine (its button) + data |  |
| Riposte (rank II) | 0 (by itself, on your reaction) | 1 Momentum; your reaction |  | a free strike when a melee attack misses you | damage dealt | 1 | damage ×1, only if the trigger comes |  | part priced | data (classes.json) |  |
| Lingering Dread (rank II) | none (always on) |  |  | on a kill, enemies within 3 tiles save or are Shaken | enemy AP removed |  | not priced |  |  | data (classes.json) |  |
| Finisher (rank III) | 3 | all your Momentum (at least 1; 3 counted) |  | 1 strike at +20% per Momentum spent (3 counted) | damage dealt | 1.6 | damage ×1.6 | 0.7× |  | engine (its button) + data |  |
| Unstoppable (rank III) | 1 |  | once a scene | +2 Momentum; Fear, Shaken, Slowed and Pinned set aside and no opportunity attacks on you until your next turn (not priced) | position | 0.5 | the rest 0.5 | 1× | part priced | engine (its button) + data |  |

**Marksman**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Fire Discipline (rank I) | none (always on) |  | once a turn | once a turn a Burst costs 2 AP instead of 3; Aimed shots add no Heat | AP given to the squad |  | not priced |  |  | data (classes.json) |  |
| Speed Loader (rank I) | none (always on) |  |  | your first reload each turn costs 1 AP less | AP given to the squad |  | not priced |  |  | data (classes.json) |  |
| Special Ammo (rank II) | 2 (a reload) |  | once a rest | a magazine of armour-piercing (×0.8, ignores armour), hollow-point (×1.3 against doubled armour) or incendiary (×0.9 + Burning) | damage dealt |  | not priced | not priced |  | engine (its button) + data |  |
| Duck and Roll (rank II) | 0 (by itself, on your reaction) | your reaction |  | a free step when shot at: the shot is at −2 if you reach cover, and not made at all if you leave its sight | damage prevented | 0.15 | the rest 0.15, only if the trigger comes |  | part priced | data (classes.json) |  |
| Killzone (rank III) | 4 (twice the shot) | your reaction |  | 2 held shots at +2 to hit, at the first two enemies that move in your line | damage dealt | 2.31 | damage ×2.31, only if the trigger comes | 0.9× | part priced | engine (its button) + data |  |
| Called Shot (rank III) | 3 |  |  | 1 shot at −2 to hit + an injury with no save on a hit (head: Dazed; priced for the head) | damage dealt | 1.5 | damage ×0.85 + the rest 0.65 | 1× |  | engine (its button) + data |  |

**Infiltrator**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Mark (rank I) | 1 |  |  | the squad has +1 to hit it for the fight (about 6 attacks), and it can't hide | damage dealt | 0.46 | the rest 0.46 | 0.9× |  | engine (its button) + data |  |
| Vanish (rank I) | 1 |  | once a turn | Hidden: can't be targeted (not priced), and your next attack is an Ambush (×1.7) | damage dealt | 0.7 | the rest 0.7 | 1.4× | part priced | engine (its button) + data |  |
| Toxin (rank II) | 1 | 1 toxin dose |  | your next hit forces a Body save or Weakened (or Slowed, or Bleeding) | damage prevented | 0.5 | the rest 0.5 | 1× |  | engine (its button) + data |  |
| Field Fix (rank II) | 2 |  |  | an ally's jam cleared, their weapon mended, or a machine repaired for 20 HP | upkeep |  | not priced | not priced |  | engine (its button) + data |  |
| Execution (rank III) | none (always on) |  |  | a Marked enemy at a quarter of its HP or less dies to your hit (not bosses) | damage dealt |  | not priced |  |  | data (classes.json) |  |
| Sabotage (rank III) | 2 |  |  | a rigged tile: 30 damage, the enemy stops, and is Pinned on a failed save (priced as if it is stepped on) | damage dealt | 1.4 | the rest 1.4 | 1.4× | part priced | engine (its button) + data |  |

**Mage**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Barrage (rank I) | none (always on) |  |  | FIRE, FREEZE, SHOCK, STONE and ACID cost 1 charge instead of 2 | upkeep |  | not priced |  |  | data (classes.json) |  |
| Core Change (rank I) | none (always on) |  |  | a core swap costs 1 AP less | AP given to the squad |  | not priced |  |  | data (classes.json) |  |
| Overcharge (rank II) | 0 |  | once a fight | your next glyph costs no AP and no charge (0.7 AP saved), and its spell may hold 1 word more | AP given to the squad | 0.35 | the rest 0.35 | free | cheap for what it does (once a fight) | engine (its button) + data |  |
| Bleed the Flux (rank II) | none (always on) |  |  | Vent costs 1 AP less (free) | AP given to the squad |  | not priced |  |  | data (classes.json) |  |
| Payload (rank III) | 0 | Flux equal to its glyphs, on top |  | an Evoke with double area (or one more missile); + Flux equal to its glyphs | damage dealt |  | not priced | not priced |  | engine (its button) + data |  |
| Stored Spell (rank III) | 1 | its charge, paid before the fight | once a rest | a whole spell written before the fight goes off for 1 AP (worth the spell; it saves every glyph's AP) | damage dealt |  | not priced | not priced |  | engine (its button) + data |  |

**Trickster**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Read (rank I) | none (always on) |  |  | Analyze costs 1 AP and shows the target's next move | information |  | not priced |  |  | data (classes.json) |  |
| False Image (rank I) | 2 | 1 charge |  | a decoy for 2 rounds: an enemy that fails a Brain save attacks it instead of you (priced as one attack wasted) | damage prevented | 0.5 | the rest 0.5 | 0.5× | dear for what it does | engine (its button) + data |  |
| Blind and Slow (rank II) | none (always on) |  |  | BLIND, SLOW and MUDDLE learned; MUDDLE costs 1 charge less | upkeep |  | not priced |  |  | data (classes.json) |  |
| Silver Tongue (rank II) | 2 |  |  | −2 AP on its next turn on a failed Brain save (a boss: −1) | enemy AP removed | 0.5 | the rest 0.5 | 0.5× | dear for what it does | engine (its button) + data |  |
| Rewrite (rank III) | 3 | 3 charge, 1 Flux | once a turn | one helpful state on an enemy flips into its opposite on a failed Brain save (worth the state) | enemy AP removed |  | not priced | not priced |  | engine (its button) + data |  |
| Sleight (rank III) | 1 |  | once a scene | swap places with your decoy or an ally within 6 tiles, no opportunity attacks | position |  | not priced | not priced |  | engine (its button) + data |  |

**Bard**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Triage (rank I) | 2 |  |  | heals 20 × Healing given (×1.7: Empathy is a Bard skill) and ends Bleeding; no Supplies | HP restored | 1.31 | the rest 1.31 | 1.3× |  | engine (its button) + data |  |
| Inspire (rank I) | 1 | 10 MP |  | +2 on an ally's next d20 | damage dealt | 0.15 | the rest 0.15 | 0.3× | dear for what it does | engine (its button) + data |  |
| Stim Throw (rank II) | 1 | 1 Supply |  | heals 30 × Healing given at 4 tiles and ends Bleeding | HP restored | 1.96 | the rest 1.96 | 3.9× | cheap for what it does | engine (its button) + data |  |
| Mend (rank II) | none (always on) |  |  | healing Outbursts heal from 40 instead of 30 | HP restored |  | not priced |  |  | data (classes.json) |  |
| Field Surgery (rank III) | none (always on) | 1 Supply |  | out of a fight only | upkeep |  | not priced |  |  | data (classes.json) |  |
| Rally (rank III) | 2 |  | once a scene | every ally within 4 tiles heals 20 × Healing given (3 allies counted, all of them hurt; the Bard is not healed) and loses Fear and Shaken | HP restored | 3.92 | the rest 3.92 | 3.9× | cheap for what it does (once a scene) | engine (its button) + data |  |

**Channeler**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Shape (rank I) | none (always on) |  |  | your first paid Pump each turn on a Damage Outburst is free | AP given to the squad |  | not priced |  |  | data (classes.json) |  |
| Iron Heart (rank I) | none (always on) |  |  | Strain limit +1 | upkeep |  | not priced |  |  | data (classes.json) |  |
| Storm Front (rank II) | 0 | 10 MP | once a turn | a Bolt or Lance arcs to up to 2 more enemies (up to ×3 the damage) for 10 MP | damage dealt |  | not priced | not priced |  | data (classes.json) | a switch on outburst |
| Occult Library (rank II) | none (always on) |  |  | one more ready design and one more tone | upkeep |  | not priced |  |  | data (classes.json) |  |
| Heart Surge (rank III) | 0 | double Strain | once a turn | a Release fires one stage higher (×2.6 past stage 4) for double Strain | damage dealt |  | not priced | not priced |  | data (classes.json) | a switch on release or outburst |
| Eye of the Storm (rank III) | 0 | lost if you don't Release this turn | once a scene | your next Release adds no Strain and its rider counts one stage higher | upkeep |  | not priced | not priced |  | engine (its button) + data |  |

**Guardian**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Will Shield (rank I) | 2 (a Soul cast) | 20 MP; Strain as a cast |  | a shield of 30 × Healing given for the fight (×1 here: Empathy is not a Guardian skill; ×1.7 with Empathy and Insight 4) | damage prevented | 1.15 | the rest 1.15 | 1.2× |  | engine (its button) + data |  |
| Command (rank I) | 1 |  | once a turn | an ally moves up to 2 tiles for none of their AP | AP given to the squad | 0.5 | the rest 0.5 | 1× |  | engine (its button) + data |  |
| Under the Eye (rank II) | none (always on) |  |  | while you are Witnessed, allies within 3 tiles have +2 to hit | damage dealt |  | not priced |  |  | data (classes.json) |  |
| Blessed Shells (rank II) | 0 |  |  | a Hymn waits in your weapon and lands with your next hit | damage dealt |  | not priced | not priced |  | data (classes.json) | a switch on pray |
| Sanctuary (rank III) | 2 (a Soul cast) | 60 MP; a cast's Strain + 1 | once a scene | allies on 3×3 tiles take half damage until your next turn (about 3 enemy attacks halved) | damage prevented | 1.5 | the rest 1.5 | 1.5× | cheap for what it does (once a scene) | engine (its button) + data |  |
| Judgement (rank III) | 4 | 10 Devotion XP; that is about a third of a level at Devotion 4 (32 XP to the next) and a seventh at Devotion 7 (70 XP) | once a fight | 1 attack at × (1 + Blessing power): ×2.4 at Faith 4 | damage dealt | 2.4 | damage ×2.4 | 1.2× |  | engine (its button) + data |  |

### Perk

**skill perks**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Shrug It Off (Tier I) | 2 |  |  | Remove one Body debuff from yourself. II: this costs 1 AP instead of 2, and you gain a shield of 10% of your max HP. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Shrug It Off (Tier II) | 1 |  |  | Remove one Body debuff from yourself. II: this costs 1 AP instead of 2, and you gain a shield of 10% of your max HP. | see the text |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Bone Talk (Tier I and II) | 2 |  |  | Shaken on a failed Heart save | enemy AP removed | 0.05 | the rest 0.05 | 0.1× | dear for what it does | engine (its button) | run by: hybrid |
| Wall Run (Tier I): "Wall Run strike" | set by the code, by the situation |  |  | Run to a tile you pick (it can be on a wall), attack from there, then finish the move on a second tile you pick. The AP shown is the attack. Each tile of the run costs… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry); the button did not show in the test fight |  |
| Wall Run (Tier II): "Wall Run strike" | 2 |  |  | Run to a tile you pick (it can be on a wall), attack from there, then finish the move on a second tile you pick. The AP shown is the attack. Each tile of the run costs… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Running Reload (Tier I): switch "Reload on the move" | 0 (rides move) |  | once a turn | Once per turn, you can reload as part of a move, for no extra AP. |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |
| Running Reload (Tier I): switch "Clear the jam on the move" | 0 (rides move) |  | once a turn | Once per turn, you can reload as part of a move, for no extra AP. |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |
| Running Reload (Tier II): switch "Reload on the move" | 0 (rides move) |  | once a turn | Once per turn, you can reload as part of a move, for no extra AP. Once per turn, you can also clear a jam as part of a move. |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |
| Running Reload (Tier II): switch "Clear the jam on the move" | 0 (rides move) |  | once a turn | Once per turn, you can reload as part of a move, for no extra AP. Once per turn, you can also clear a jam as part of a move. |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |
| Catch (Tier I and II): "Throw it back" | set by the code, by the situation |  |  | Throw the item you caught at a tile in throwing range. It has its normal effect. II: this costs 0 AP. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry); the button did not show in the test fight |  |
| Sleight of Hand (Tier I): "Plant an item" | 2 |  |  | Slip something onto someone next to you without being seen. A grenade goes off at the start of their next turn. A tracker keeps them Marked. For any other item, the… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Sleight of Hand (Tier II): "Plant an item" | 1 |  |  | Slip something onto someone next to you without being seen. A grenade goes off at the start of their next turn. A tracker keeps them Marked. For any other item, the… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Shadow Step (Tier I) | 0 |  |  | While you are Hidden, a move from a tile next to cover to another tile next to cover counts as half as many tiles (rounded up), so it costs less AP. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry) |  |
| Shadow Step (Tier II) | 0 |  |  | While you are Hidden, a move from a tile next to cover to another tile next to cover counts as half as many tiles (rounded up), so it costs less AP. When one of your… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry) |  |
| Jury-Rig (Tier I and II): "One more time" | set by the code, by the situation |  |  | Your broken weapon works one more time: one shot or one full-damage strike, at the attack's normal AP cost. Then it is broken again. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry); the button did not show in the test fight |  |
| Jury-Rig (Tier I and II): "Patch the drone" | set by the code, by the situation |  |  | Repair a drone next to you at double strength: it regains 20% of its max HP, plus 10% for each Improvisation point above 3. Uses one spare-parts charge. Needs… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry); the button did not show in the test fight |  |
| Footnote (Tier I) | 0 |  | once a fight | allies get +1 to hit one enemy for the rest of the round (about 3 attacks) | damage dealt | 0.23 | the rest 0.23 | free |  | engine (its button) | run by: hybrid |
| Footnote (Tier II) | 0 |  | once a fight | allies get +2 to hit one enemy for the rest of the round (about 3 attacks) | damage dealt | 0.46 | the rest 0.46 | free | cheap for what it does (once a fight) | engine (its button) | run by: hybrid |
| Lab Coat (Tier I): "Neutralise agent" | set by the code, by the situation |  |  | Neutralise one identified chemical for allies within 2 tiles of you. Its effect on them ends, and they are immune to it for the rest of the fight. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry); the button did not show in the test fight | run by: hybrid |
| Lab Coat (Tier II): "Neutralise agent" | 2 |  |  | Neutralise one identified chemical for allies within 2 tiles of you. Its effect on them ends, and they are immune to it for the rest of the fight. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Mirage (Tier I and II) | 2 |  |  | Project a false wall, figure or sound onto a tile in range. Enemies who fail an Acuity check believe it. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Shared Breath (Tier I and II) | 2 |  |  | Link with an ally: the next Heart debuff on either of you is split between you, each at half its duration. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Lay Down Arms (Tier I and II) | 2 |  |  | on a failed Heart save a humanoid lowers its weapon for a round (about 1 attack lost, 1 AP to raise it) | enemy AP removed | 0.75 | the rest 0.75 | 0.8× |  | engine (its button) |  |
| Double Meaning (Tier I and II) | 0 |  | once a round | each squad member's next attack on one enemy gets +2 to hit (about 3 attacks) | damage dealt | 0.46 | the rest 0.46 | free | cheap for what it does | engine (its button) | run by: hybrid |
| Heart Overload (Tier I and II): switch "Heart Overload: Begin again for 0 AP" | 0 (rides outburst) |  | once a turn | a second Begin for 0 AP right after a Release at stage 2+ (2 AP saved); mana and Strain as usual | AP given to the squad | 1 | the rest 1 | free | cheap for what it does | engine (the registry) |  |
| Heart Overload (Tier I and II): switch "Heart Overload: pay the mana in HP" | 0 (rides outburst) |  | once a turn | Once a turn, right after you Release an Outburst at stage 2 or higher, you can Begin the same design again at once for 0 AP. You pay its mana and Strain as usual, and… |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |
| Old Tongue (Tier I and II): "Speak the Old Tongue" | 0 |  | once a being | Speak to an upper-realm being in earshot. It parleys with you and makes no attacks on its next turn. Once per being. | judgement |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry) | run by: narrator |
| Rite in the Field (Tier I and II): "Crystallise (rite)" | set by the code, by the situation |  |  | Crystallise a mana core from the air (the meter at 10+, −10), for less AP: a ritual in the field. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry); the button did not show in the test fight |  |
| You Get Used to It (Tier I and II): "Seen worse: give it" | 0 |  | once a round | Give this round's save bonus to the ally whose condition woke it: their next save this round, not yours. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry) |  |
| Flat Line (Tier I and II) | 0 |  |  | Pick the enemy your calm unnerves. You can choose until the end of your first turn. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Litany (Tier I and II) | 2 |  |  | A spoken prayer: allies within 3 tiles, you included, get a bonus on every save until your next turn. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Holy Ordnance (Tier I and II): "Bless a magazine" | 3 |  |  | Bless the magazine in your gun, or in the gun of an ally next to you. I: its rounds deal +20% damage to upper-realm and cursed beings. II: +40%, and the next magazine… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Clean Hands (Tier I): switch "Spare" | 0 (rides attack) |  | once a turn | Once per turn, when you spare an enemy or protect an innocent, you gain a shield worth 15% of your max HP. To spare an enemy, attack with Spare on: a blow that would… |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |
| Clean Hands (Tier II): switch "Spare" | 0 (rides attack) |  | once a turn | Once per turn, when you spare an enemy or protect an innocent, you gain a shield worth 25% of your max HP. To spare an enemy, attack with Spare on: a blow that would… |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |

**mastered perks**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Earthbreaker | 4 |  | once a fight | your melee damage with no attack roll to everyone on 3×3 tiles (2 enemies counted) + Prone with no save; allies in the area are hit too | damage dealt | 4.08 | the rest 4.08 | 2× | cheap for what it does (once a fight) | engine (its button) |  |
| Trick Shot: switch "Ricochet" | 0 (rides attack) |  | once a turn | Once per turn, you can make a ranged attack a Ricochet. It ignores half cover, and if it hits, the nearest other enemy within 2 tiles of the target takes half the… |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |
| Vanishing Act | 2 |  | once a fight | Hidden even while seen; your next attack is an Ambush (×1.7) | damage dealt | 0.7 | the rest 0.7 | 0.7× | part priced | engine (its button) |  |
| Clean Draw | 0 |  | once a fight | Once a fight: the glyphs you draw next cost no charge and no Flux, and firing a spell of only those glyphs costs no charge. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry) |  |
| Established Fact | 0 |  | once a session | Once a session: state a fact about the technology, biology or history in the scene. It is true from now on, unless it contradicts what has already been shown. In a… | judgement |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: narrator |
| Closing Argument | 0 |  | once a scene | Once a scene: make your closing argument. Every listener who isn't ruled by fear or faith accepts its logic. An Eloquence check waiting on that point succeeds. In a… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Solid Image: "Solidify" | 0 |  | once a fight | One of your projections becomes real until your next turn: a wall blocks movement and shots; a figure takes one hit meant for an ally. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Case Closed: "Close the case" | set by the code, by the situation |  |  | Read an enemy that has already been Analyzed, completely. It must be within Analyze range and in your sight. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry); the button did not show in the test fight |  |
| Open Hand: "Offer mercy" | 0 |  | once a enemy | Offer mercy to an enemy you can see that is at a quarter of its HP or less. It makes a Heart save. If it fails, it surrenders. Once per enemy. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Open Hand: "Open Hand: offer mercy…" | 0 |  |  | Choose when you offer mercy. Always: it is offered the moment an enemy drops to a quarter of its HP. Ask: you offer it yourself on your turn. Never: you don't offer it. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Their Own Idea | 0 |  | once a scene | Once a scene: hide a suggestion inside a sentence (type it, and name the listener). They believe it was their own idea and act on it, unless it would harm them… | judgement |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: narrator |
| The Twin Pays: switch "The Twin Pays" | 0 (rides outburst) |  | once a fight | a Begin for 0 AP, no mana and no Strain (2 AP saved; the mana and Strain are not priced) | AP given to the squad | 1 | the rest 1 | free | part priced | engine (the registry) |  |
| True Name | 0 |  | once a session | Once a session: speak the true name of an upper-realm being, a cursed being or a creature. Your side deals +50% damage to it for the scene, and it can't lie to you. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Judgement Day: "Judgement" | 3 |  | once a fight | the judged enemy's next attack on an ally fails outright; your attacks on it deal ×1.5 (not priced) | damage prevented | 1 | the rest 1 | 0.7× | part priced | engine (its button) |  |
| On My Mark | 1 |  | once a round | Once a round, on your turn: order an ally to take one action now, outside their turn. They can spend up to 4 AP, and it comes off their next turn. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |

**achieved perks**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Spoon-Feed | 2 |  |  | Explain the weakness of an enemy you can see. Allies within 6 tiles of you get +2 to hit it until your next turn. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Field Surgeon: "Field Repair an ally" | 2 |  |  | Patch up an ally next to you: they heal 10 HP per Improvisation point, raised by your healing bonuses. Uses one spare-parts charge. Needs Improvisation 3. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Fire Sermon: "Preach" | 2 |  |  | Preach until your next turn: your Blessings also leave enemies within 4 tiles Shaken (Heart save). |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Verse of War: switch "In verse" | 0 (rides outburst) |  |  | Speak a line of verse, then Begin or Release an Outburst with In verse on: it gets +1 tile of range and +10% damage. After the fight, the Narrator checks that your… |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |
| Between Heartbeats | 0 |  | once a fight (armed ahead, fires by itself) | 2 AP to act with when an enemy in your sight starts an action | AP given to the squad | 1 | the rest 1 | free | cheap for what it does (once a fight (armed ahead, fires by itself)) | engine (its button) |  |
| Dead Signal | 1 |  |  | While you are in stealth: silently disable one electronic device within 3 tiles. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| The Voice | 0 |  | once a session | Once a session: give an order (halt, hold fire, drop it, kneel, fall back, or one in your own words). Rank-and-file enemies who hear it make a Heart save. Those who… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |

**ultimate perks**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Angel of the Trenches: "Angel: hold position" | 0 |  | (armed ahead, fires by itself) | While this is on, Angel of the Trenches won't move you from your position. Use it again to turn it off. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Twin Discipline: "Fused Evoke" | set by the code, by the situation |  |  | Fire a Sigil Line with your held Outburst inside it: the Sigil's words set where it reaches and what it covers, the Outburst the school. Evoke charge and AP. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry); the button did not show in the test fight |  |
| Supreme Command | 0 |  | once a fight | every ally takes 2 AP of free actions (about 3 allies) | AP given to the squad | 3 | the rest 3 | free | cheap for what it does (once a fight) | engine (its button) |  |

### Trait

**traits**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Grenadier's Arm: "Throw someone" | 3 |  |  | Throw an ally or enemy next to you to a tile in range. They must weigh less than you can carry. The one thrown and whoever they land on take damage by weight. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Grenadier's Arm: "Throw an object" | 3 |  |  | Throw an object next to you to a tile in range. It must weigh less than you can carry. The object and whoever it lands on take damage by weight. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Holo-Drama Addict: "Play it as a holo-drama" | 0 |  | once a scene | +3 to hit on your next attack this turn, if the Narrator buys it | damage dealt | 0.23 | the rest 0.23 | free |  | engine (its button) | run by: hybrid |
| Oil in My Mind: "Masterpiece" | 0 |  | once a session | Once a session: make a work of art for one ally. They get +2 on their next roll. Pick the ally, or type their name in the story. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry) | run by: hybrid |
| Oil in My Soul: "Masterpiece" | 0 |  | once a session | Once a session: make a work of art for one ally. They get +2 on their next roll. Pick the ally, or type their name in the story. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry) | run by: hybrid |
| Lunarshine: "Drink" | 1 |  |  | Take a drink. In a fight it costs 1 AP. You are Tipsy at 1 drink, Drunk at 3 and Wasted at 5. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Rabbit's Foot: "Lucky Foot" | 0 |  | once a session (armed ahead, fires by itself) | Once a session: while this is on, the first enemy attack that would hit you is rerolled. Use it again to turn it off. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Factory Made: "Field Repair (self)" | 2 |  |  | Patch your own machine body: heal 10 HP per Improvisation point. Uses one spare-parts charge. Needs Improvisation 3. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Daggerfall Veteran: "Shake It Off" | 0 |  | once a fight | removes one Heart debuff from yourself (worth the debuff) | damage prevented |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Daggerfall Veteran: "Seen It Before" | 0 |  | once a session | Once a session: learn how the enemy will move next. In a fight, you are shown the next move of every enemy you can see. In the story, the Narrator answers truthfully. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Old School: "Fan the Hammer (every round)" | 3 |  | once a turn | every round left in the revolver at one target (worth the rounds left) | damage dealt |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry) |  |
| Heretic: "Stolen Fire" | 0 |  |  | Pray without kneeling: any patron's Blessing, on Will Power instead of Faith (3 AP). |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Gambler: switch "Double or Nothing" | 0 (rides attack) |  | once a scene | The house always wins. You are not the house, and you've never once let that stop you. + Double or Nothing: once per scene, call "double" before a d20 check or attack… |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |
| Chain Smoker: "Light Up" | 2 |  |  | Light a cigarette: +2 Composure for the scene, and remove one Heart debuff from yourself. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Live to Fight Another Day: "Retreat" | 0 |  | once a fight | Once a fight: Sprint for 0 AP to a tile that is farther from every enemy you can see. The move draws no opportunity attacks, and you gain +2 Defense until the end of… |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Company Man: "Call RTC extraction" | all the AP you have left |  | once a campaign | Once a campaign: RTC pulls you out of anywhere. In a fight it takes all the AP you have left, you must be conscious, you leave the fight, and you get no XP from it. | judgement |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: narrator |
| Field Medic: "Thrown Stim" | 1 |  | once a fight | Once a fight: throw a stim to stabilise a Downed ally up to 3 tiles away. You need line of sight. Uses one stim. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Born Officer: "Command" | 1 |  | once a round | Once a round: an ally you can see takes a free move worth 1 AP (pick the tile), or a free Shoot or Strike (pick the enemy). |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Trench Poet: "Verse" | 1 |  | once a scene | Once a scene: answer an enemy in metaphor. It makes a Heart save or is Confused. Allies in earshot get +1 Composure for the scene. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Slicer: "Backdoor" | 2 |  |  | Take over a door, terminal, camera, alarm or emplaced turret within 5 tiles until your next turn: Acuity against its tier. A door: open, close or lock it. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Demolitionist: "Set explosive" | 2 |  |  | Place a charge on your tile or next to you and shape its blast: a circle, or a line or cone that points away from you. It goes off at once, or waits until you Detonate. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) |  |
| Demolitionist: "Detonate" | 1 |  |  | Set off every charge you placed to wait for your trigger. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (the registry) |  |
| Drone Handler: "Repair drone" | 2 |  |  | Repair your drone when it is next to you: it heals 10 HP for each Mastery level you have in Improvisation. Uses one spare-parts charge. |  |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: hybrid |
| Occultist: "Look it up" | 0 |  | once a session | Once a session: look up one supernatural creature's weakness in the grimoire. Pick the creature in a fight, or type its name. In a fight it is your attempt for the… | judgement |  | not priced: its worth is not a number in the data | not priced |  | engine (its button) | run by: narrator |
| Pacifist: switch "Nonlethal" | 0 (rides attack) |  |  | You won't kill. Not even them. + Sanctuary: until you attack in a fight, enemies have −2 to hit you. Your attacks are nonlethal unless you choose otherwise: an enemy… |  |  | not priced: it changes another action | not priced |  | engine (the registry) |  |

### Moving

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Walk, Agility 1 | 1 |  |  | 1 tiles (1.5 m) | position |  | not priced: the yardstick itself says 1 AP of walking is worth half an attack | not priced |  | data (rules.json: 1 + 0.5 × (Agility − 1) tiles per AP) |  |
| Walk, Agility 2 | 1 |  |  | 1.5 tiles (2.25 m) | position |  | not priced: the yardstick itself says 1 AP of walking is worth half an attack | not priced |  | data (rules.json: 1 + 0.5 × (Agility − 1) tiles per AP) | the same AP covers 1.5 times the ground of Agility 1 |
| Walk, Agility 4 | 1 |  |  | 2.5 tiles (3.75 m) | position |  | not priced: the yardstick itself says 1 AP of walking is worth half an attack | not priced |  | data (rules.json: 1 + 0.5 × (Agility − 1) tiles per AP) | the same AP covers 2.5 times the ground of Agility 1 |
| Walk, Agility 6 | 1 |  |  | 3.5 tiles (5.25 m) | position |  | not priced: the yardstick itself says 1 AP of walking is worth half an attack | not priced |  | data (rules.json: 1 + 0.5 × (Agility − 1) tiles per AP) | the same AP covers 3.5 times the ground of Agility 1 |
| Walk, Agility 8 | 1 |  |  | 4.5 tiles (6.75 m) | position |  | not priced: the yardstick itself says 1 AP of walking is worth half an attack | not priced |  | data (rules.json: 1 + 0.5 × (Agility − 1) tiles per AP) | the same AP covers 4.5 times the ground of Agility 1 |
| Walk, Agility 10 | 1 |  |  | 5.5 tiles (8.25 m) | position |  | not priced: the yardstick itself says 1 AP of walking is worth half an attack | not priced |  | data (rules.json: 1 + 0.5 × (Agility − 1) tiles per AP) | the same AP covers 5.5 times the ground of Agility 1 |
| Sprint | 2 |  | once a turn | 3 × Movement in tiles (1.5 times what the same AP walks) | position |  | not priced | not priced |  | data + engine code | not in Juggernaut armour |
| Disengage | 1 |  |  | 1 tile with no opportunity attack | damage prevented | 1 | one free enemy attack avoided | 2× | cheap for what it does | data + engine code |  |
| Go prone / stand up | 1 |  |  | ranged attacks on you at −2 to hit, melee attacks at +2; 1 more AP to stand | damage prevented | 0.31 | −2 to hit on about 2 shots; the AP to stand again is not counted | 0.6× | dear for what it does | data + engine code (toggleProne: 1 AP) |  |
| Pull free (yourself or an ally next to you) | 2 |  |  | ends being nailed in place | upkeep |  | not priced: a tax an enemy put on you | not priced |  | data (techniques.json) |  |
| Break a grapple | 2 |  |  | an opposed roll to get free | upkeep |  | not priced: a tax an enemy put on you | not priced |  | engine code |  |

### Weapon upkeep

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Speed reload | 2 (the weapon's reload; 1 with a quick-release mod) |  |  | a full magazine; the old one drops on your tile | upkeep |  | not priced: it buys the next shots | not priced |  | data + engine code (reloadAp) |  |
| Tactical reload | 3 (reload +1) |  |  | a full magazine; the old one goes in the pack with its rounds | upkeep |  | not priced | not priced |  | data (rules.json) |  |
| Reload both guns | 3 |  |  | both magazines | upkeep |  | not priced | not priced |  | engine code |  |
| Clear a jam | 2 |  |  | the gun works again; Heat back to 0 | upkeep |  | not priced | not priced |  | data + engine code |  |
| Load loose rounds into a magazine | 1 per 5 rounds | loose rounds in the pack |  | 5 rounds into a spare magazine | upkeep |  | not priced | not priced |  | engine code (loadMagazine) |  |
| Brace the weapon (the basic action, any weapon that can) | 1 |  |  | Recoil halved until you move; a character with Durability also gains 2 Guard (3 with a shield) | damage prevented | 0.77 | 2 Guard at 10 HP each; the Recoil is not priced | 1.5× | part priced | engine code (brace) + data (techniques.json guard rules) | Guard holds at most your Durability points, 5 at most; 1 point is kept back unless the hit would take you down |
| Field Repair | 2 | 1 spare-parts charge; Proficiency 3 |  | restores weapon durability | upkeep |  | not priced | not priced |  | engine code |  |

### Gear

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Draw into a hand (one-handed) | 1 |  |  | a weapon, focus, torch or shield from the pack; what the hand held goes to the pack | upkeep |  | not priced | not priced |  | data (world_play.json) + engine |  |
| Draw a two-handed weapon | 2 |  |  | it fills both hands | upkeep |  | not priced | not priced |  | data + engine |  |
| Swap main hand and off hand | 1 |  |  | the other weapon leads | upkeep |  | not priced | not priced |  | data + engine |  |
| Put away what a hand holds | 1 a hand |  |  | into the pack (2 AP for a two-handed weapon) | upkeep |  | not priced | not priced |  | data + engine |  |
| Drop what a hand holds | 0 |  |  | it lands in the pile on your tile | upkeep |  | not priced | not priced |  | data + engine |  |
| Put on or take off light armour | 1 |  |  | a piece of 1.2 kg or less; heavier armour can't be changed in a fight | upkeep |  | not priced | not priced |  | data + engine |  |
| Fit a mod | 1 |  |  | a mod on the main-hand weapon | upkeep |  | not priced | not priced |  | data (rules.json) |  |
| Pick up from a pile | 1 |  |  | any or all of the pile on your tile or the next one | upkeep |  | not priced | not priced |  | data (world_play.json) + engine |  |
| Use an item, open a door | 1 |  |  | what the item or the door does | upkeep |  | not priced | not priced |  | data (rules.json) |  |
| Throw an item (a grenade, a bottle) | 2 | the item |  | what the item does where it lands | damage dealt |  | not priced: it depends on the item | not priced |  | data + engine code |  |

### Basic action

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Attack with both hands (a weapon in each) | the dearer weapon's attack + 1 | a round from each gun; main hand −1 to hit, off hand −3 (−1 at best, with points) |  | both weapons attack, at one target or two | damage dealt |  | not priced here: dual wielding is its own question in the balance pass (section 9) | not priced |  | engine code (pairedAttack) |  |
| A weapon's own skill (the weapons that grant one) | set by the weapon |  |  | what the weapon's card says | damage dealt |  | not priced: one per weapon, in weapons.json | not priced |  | data (weapons.json grants) |  |
| Read a glyph or a trace | as Analyze: 2 (1 from Analysis 3) |  |  | you learn the word (study toward a new Sigil word) | information |  | not priced | not priced |  | engine code (readGlyph) |  |
| Spend an Echo on a roll | 0 | 1 Echo (you hold 3 at most; 1 at the start of a session) | once a roll | the d20 is rolled again | damage dealt | 0.23 | a missed attack hits after all 65% of the time: 0.23 of an attack per Echo held | free |  | engine code (check/reroll) + rules.json | paid in Echo, not AP |
| Hide | 2 | no enemy may see you |  | Hidden: you can't be targeted until spotted (not priced), and your first attack is an Ambush (×1.7 at Ingenuity 4) | damage dealt | 0.7 | the Ambush's extra damage only | 0.7× | part priced | engine code (not in rules.json's action list) |  |
| Analyze | 2 (1 from Analysis 3) |  |  | shows the enemy's HP, Defense and armour; from Analysis 5 it deals 15% less damage to the squad | information |  | not priced below Analysis 5; from 5: 15% off its attacks for the fight | not priced |  | data + engine code (analyzeCost) |  |
| Overwatch (hold a shot) | the AP of the shot (2, or 3 aimed) | your reaction; not while Pressed | one held shot | 1 shot at the first enemy that moves in your sight | damage dealt | 1 | damage ×1, if it fires | 0.7× | part priced | data + engine code (setOverwatch) |  |
| Shove (anyone, no technique) | 2 |  |  | a 1-tile push on an opposed roll (your Raw Power against its Raw Power or Athletics) | position | 0.13 | one pushed tile, half the time | 0.1× | part priced | engine code (not in rules.json's action list) | the Shove technique and the Fighter's Shove cost 1 AP |
| Stim an ally next to you | 1 | 1 stim |  | heals 30 × Healing given and stops Bleeding | HP restored | 1.15 | 30 HP, at the rifle's rate | 2.3× | cheap for what it does | engine code (useStim) |  |
| Stabilise a Downed ally | 2 (1 for a medic) | 1 stim |  | the ally is up at 1 HP | HP restored |  | not priced: it gives a character their turns back | not priced |  | data + engine code |  |
| Put out Burning | 1 |  |  | ends 10 damage a turn on you or someone next to you | damage prevented | 0.77 | 2 turns of burning avoided | 1.5× | cheap for what it does | data + engine code |  |
| Recover a dropped weapon / raise a lowered one | 2 / 1 |  |  | you can attack with it again | upkeep |  | not priced: a tax an enemy put on you | not priced |  | engine code |  |
| Shoot cover | the AP of the attack | the round |  | the weapon's damage to the cover, no roll (half cover has 30 HP, full 80) | position |  | not priced | not priced |  | data (rules.json) |  |

### Speaking

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Parley (persuade, threaten, ask for surrender) | 2 |  |  | a skill check; what it wins is the Narrator's | judgement |  | not priced: judgement | not priced |  | data + engine code |  |
| Speak (rules 1.14) | 0 |  | no limit | words to the table and the Narrator; nothing happens by rule | judgement |  | not priced: no effect by rule | not priced |  | engine code (fighttalk.ts) |  |
| An attempt (rules 1.14) | 1 |  | once a turn | the Narrator may answer with one of: Shaken, Taunted, Weapon lowered, Hesitates for 1 round, a skill check for one of them, or a surrender | judgement |  | not priced: judgement (at most it ends an enemy's fight) | not priced |  | engine code (fighttalk.ts) |  |
| Start a song (music traits) | 2 |  |  | the song's bonus while it plays | see the trait |  | not priced | not priced |  | engine code (music.ts) |  |

### Reaction

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Your reaction | 0 |  | 1 a round | one of: an opportunity attack (a free melee attack when an enemy leaves your reach without Disengaging), a held shot, an Answer technique, a Call from 9 points, a perk marked reaction | damage dealt | 1 | an opportunity attack: damage ×1, if it fires | 2× | part priced | data (rules.json) |  |

### Sigil magic

**the cycle**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Draw a glyph | 1 at Expression 1, 0.7 at Expression 4, 0.5 at Expression 6+ | the word's charge (1 to 3) and 1 Flux (TWICE: 2); the next glyph of the Line needs a step to the next tile |  | one word of a Line (2 to 4 make a spell) | set-up |  | not priced alone: see the sample spells | not priced |  | engine (glyphAp) + data (sigils.json) |  |
| Evoke | 1 | 1 charge per glyph (1 less at Brain Power 3, 2 less at 6, 3 less at 9; at least 1) |  | the Line fires, from within 1 tile of it, aimed by where you stand | see the sample spells |  | not priced alone | not priced |  | data + engine (SPELL_AP) |  |
| Vent | 1 |  |  | all your Flux into the air (the Evoker holds 6; over it you take 10 damage a point and it locks for a round) | upkeep |  | not priced | not priced |  | engine (SPELL_AP) |  |
| Swap a mana core | 2 | 1 spare core |  | 10 charge | upkeep |  | not priced | not priced |  | engine (SPELL_AP) |  |
| Scuff out a glyph | 1 |  |  | removes a glyph on your tile | upkeep |  | not priced | not priced |  | engine (SPELL_AP) |  |

**words (subject)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| FIRE | 0.7 (a glyph) | 2 charge, 1 Flux |  | 30 damage × your Sigil multiplier | damage dealt |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| FREEZE | 0.7 (a glyph) | 2 charge, 1 Flux |  | 25 damage × your Sigil multiplier | damage dealt |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| SHOCK | 0.7 (a glyph) | 2 charge, 1 Flux |  | 30 damage × your Sigil multiplier | damage dealt |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| STONE | 0.7 (a glyph) | 2 charge, 1 Flux |  | 35 damage × your Sigil multiplier | damage dealt |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| GALE | 0.7 (a glyph) | 1 charge, 1 Flux |  | 15 damage × your Sigil multiplier | damage dealt |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| SPARK | 0.7 (a glyph) | 1 charge, 1 Flux |  | 15 damage × your Sigil multiplier | damage dealt |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| ACID | 0.7 (a glyph) | 2 charge, 1 Flux |  | 15 damage × your Sigil multiplier | damage dealt |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| BIND | 0.7 (a glyph) | 2 charge, 1 Flux |  | The target is Pinned unless it passes a Body save. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| BLIND | 0.7 (a glyph) | 1 charge, 1 Flux |  | The target is Blinded unless it passes a Body save. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| SLOW | 0.7 (a glyph) | 1 charge, 1 Flux |  | The target is Slowed unless it passes a Body save. It deals no damage. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| MUDDLE | 0.7 (a glyph) | 2 charge, 1 Flux |  | The target gets a Left Brain Debuff unless it passes a Brain save. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| DREAD | 0.7 (a glyph) | 2 charge, 1 Flux |  | The target is Shaken unless it passes a Heart save. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| SILENCE | 0.7 (a glyph) | 2 charge, 1 Flux |  | The target is Silenced for 1 round unless it passes a Brain save: it can't use Sigils, Outbursts or prayers. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| COMMAND | 0.7 (a glyph) | 3 charge, 1 Flux |  | The target must pass a Brain save or obey one order on its next turn: halt, kneel, drop its weapon, or move… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| WARD | 0.7 (a glyph) | 2 charge, 1 Flux |  | a shield of 30 × Sigil multiplier × Healing given | HP restored |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| MEND | 0.7 (a glyph) | 3 charge, 1 Flux |  | heals 25 × Sigil multiplier × Healing given | HP restored |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| QUICKEN | 0.7 (a glyph) | 3 charge, 1 Flux |  | The target is Quickened: +2 AP on its next turn, up to the limit of 9 AP. It never works on you, and each… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| SHARPEN | 0.7 (a glyph) | 2 charge, 1 Flux |  | The target is Sharpened: its next attack has +3 to hit and deals ×1.25 damage. It lasts until that attack or… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| CLEANSE | 0.7 (a glyph) | 2 charge, 1 Flux |  | Ends one harmful condition on the target, the newest first. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| VEIL | 0.7 (a glyph) | 2 charge, 1 Flux |  | Smoke fills every tile within 1 of the target and blocks sight. It lasts 2 rounds plus your Sigil duration… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| LIGHT | 0.7 (a glyph) | 1 charge, 1 Flux |  | Lights every tile within 4 of the target for the rest of the scene and reveals anyone Hidden there. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| STEP | 0.7 (a glyph) | 2 charge, 1 Flux |  | Teleports whoever the spell affects to a free tile you pick, up to 4 tiles from where they stand, past… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| RAISE | 0.7 (a glyph) | 3 charge, 1 Flux |  | A solid wall rises on each empty tile the spell covers. A wall blocks movement and sight, has 30 HP and… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| NULL | 0.7 (a glyph) | 3 charge, 1 Flux |  | Dispels the Sigil magic placed on the tiles the spell covers: anyone's glyphs, fields, traps and turrets… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| MASK | 0.7 (a glyph) | 2 charge, 1 Flux |  | The target becomes Hidden until it attacks, or for 2 rounds. It does nothing to a Marked target. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |

**words (Reach)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SEEK | 0.7 (a glyph) | 2 charge, 1 Flux |  | A straight bolt with range 8. You must see the target. The first creature in its path takes the hit, and… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| ARC | 0.7 (a glyph) | 2 charge, 1 Flux |  | the spell at ×0.8, range 6 |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| SENSE | 0.7 (a glyph) | 3 charge, 1 Flux |  | the spell at ×0.6, range 8 |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| RELAY | 0.7 (a glyph) | 2 charge, 1 Flux |  | The spell is cast from an ally's tile, as if you stood there. Pick an ally within 8 tiles that you can see… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |

**words (Delivery)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| STAY | 0.7 (a glyph) | 1 charge, 1 Flux |  | the spell at ×0.5 |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| TWICE | 0.7 (a glyph) | 3 charge, 2 Flux |  | Two missiles at two targets you pick, each with its own Burst. Drawing this glyph adds 2 Flux instead of 1. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| PULL | 0.7 (a glyph) | 1 charge, 1 Flux |  | After the hit, each target the spell affected is dragged 3 tiles toward you. A turret's spell drags toward… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| WAIT | 0.7 (a glyph) | 2 charge, 1 Flux |  | A trap on the tile you aim at, hidden from the enemy until they spot it. It goes off once, when an enemy… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| WATCH | 0.7 (a glyph) | 3 charge, 1 Flux |  | the spell at ×0.5 |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| CHAIN | 0.7 (a glyph) | 2 charge, 1 Flux |  | After the hit, the spell jumps on to the next creature within 3 tiles that is no closer to you (or to the… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| LEECH | 0.7 (a glyph) | 2 charge, 1 Flux |  | After the hit, you heal half of all the damage the spell dealt. |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |

**words (Burst)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| CONDENSE | 0.7 (a glyph) | 1 charge, 1 Flux |  | the spell at ×1.5 |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| SPREAD | 0.7 (a glyph) | 2 charge, 1 Flux |  | the spell at ×0.6, radius 2 |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |
| PUSH | 0.7 (a glyph) | 1 charge, 1 Flux |  | the spell at ×0.7 |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |

**words (Filter)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| KIN | 0.7 (a glyph) | 2 charge, 1 Flux |  | The spell never affects your side. You can't aim it at an ally, and nothing in it touches you or your… |  |  | not priced alone: a word only works in a Line | not priced |  | data (sigils.json) |  |

**sample spells (Intelligence 4, Brain Power 4, Expression 4, Agility 4)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| SPARK + SEEK (the cheapest attack) | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 4 charge (of 10 in a core), 2 Flux (of 6) |  | 31 damage to a soldier (a rolled hit; 33 before armour) | damage dealt | 0.78 | 31 ÷ the rifle's 40 | 0.5× | dear for what it does | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| FIRE + SEEK | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 5 charge (of 10 in a core), 2 Flux (of 6) |  | 64 damage to a soldier (a rolled hit; 66 before armour) | damage dealt | 1.6 | 64 ÷ the rifle's 40 | 0.9× |  | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| FIRE + CONDENSE + SEEK | 4.1 (3 glyphs at 0.7, 2 tiles of walking: 1, Evoke 1) | 7 charge (of 10 in a core), 3 Flux (of 6) |  | 97 damage to a soldier (a rolled hit; 99 before armour) | damage dealt | 2.42 | 97 ÷ the rifle's 40 | 1.2× |  | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| FIRE + FIRE + CONDENSE + SEEK (4 glyphs) | 5.8 (4 glyphs at 0.7, 3 tiles of walking: 2, Evoke 1) | 10 charge (of 10 in a core), 4 Flux (of 6); NOT castable at these points: this character holds 3 words in a Line (4 needs Intelligence 5) |  | 177 damage to a soldier (a rolled hit; 179 before armour) | damage dealt | 4.43 | 177 ÷ the rifle's 40 | 1.5× | part priced | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| FIRE + SPREAD + ARC on 3 enemies | 4.1 (3 glyphs at 0.7, 2 tiles of walking: 1, Evoke 1) | 8 charge (of 10 in a core), 3 Flux (of 6) |  | 29 damage to a soldier, each of 3 (a rolled hit; 31 before armour) | damage dealt | 2.17 | 29 ÷ the rifle's 40 × 3 targets | 1.1× |  | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| STONE + CONDENSE (Touch) | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 4 charge (of 10 in a core), 2 Flux (of 6) |  | 84 damage to a soldier (a rolled hit; 89 before armour) | damage dealt | 2.1 | 84 ÷ the rifle's 40 | 1.2× |  | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| MEND + SEEK | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 6 charge (of 10 in a core), 2 Flux (of 6) |  | 43 HP healed or shielded (×1.7 more with Empathy and Insight 4) | HP restored | 1.63 | 43 HP, at the rifle's rate | 1× |  | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| WARD + SEEK | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 5 charge (of 10 in a core), 2 Flux (of 6) |  | 51 HP healed or shielded (×1.7 more with Empathy and Insight 4) | HP restored | 1.96 | 51 HP, at the rifle's rate | 1.2× |  | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| QUICKEN + SEEK | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 6 charge (of 10 in a core), 2 Flux (of 6) |  | +2 AP to an ally next turn · never on yourself; a target once a round | AP given to the squad | 1 | 2 AP | 0.6× | dear for what it does | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| BIND + SEEK | 3.4 (2 glyphs at 0.7, 1 tile of walking: 1, Evoke 1) | 5 charge (of 10 in a core), 2 Flux (of 6) |  | can't move and −2 to hit for a round on a failed save | enemy AP removed | 0.25 | the condition, half the time | 0.1× | dear for what it does | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |
| BLIND + SPREAD + ARC on 3 enemies | 4.1 (3 glyphs at 0.7, 2 tiles of walking: 1, Evoke 1) | 7 charge (of 10 in a core), 3 Flux (of 6) |  | −4 to hit on about 2 attacks on a failed save | enemy AP removed | 0.92 | the condition, half the time × 3 targets | 0.5× | dear for what it does | data (sigils.json) + engine (Sigil multiplier ×1.7, Elemental ×1.3); FIRE + SEEK, FIRE + CONDENSE + SEEK, SPARK, WARD, MEND, BIND and QUICKEN + SEEK were cast in the engine and agree to within 2 points of damage | at Agility 1 every tile of the walk is 1 AP; at Expression 1 a glyph is 1 AP |

### Soul magic

**the cycle**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Begin | 2 (1 with the Swift module) | the design's MP; +1 Strain (+2 in Flooded air) |  | the Outburst held at stage 0 (×0.8) | set-up |  | not priced alone: see the sample Outbursts | not priced |  | data (soul_modules.json) + engine (SOUL_AP) |  |
| Pump | 1 | a feeling's own Strain, if one is poured in | to stage 4 | +1 stage: ×0.8 → ×1 → ×1.4 → ×1.8 → ×2.2 | damage dealt | 0.31 | a Damage Bolt from stage 1 to 2: +12 damage | 0.6× | dear for what it does | data + engine | the first Pump of a fight is free; Empathy 3 gives 1 free Pump a round, Empathy 7 gives 2 |
| Release | 1 |  |  | the Outburst fires at its stage | see the sample Outbursts |  | not priced alone | not priced |  | data + engine |  |
| Hold it over a turn (swell) | 0 | +1 Strain (+2 in Flooded air) | once a turn, by itself | +1 stage at the start of your next turn | damage dealt | 0.31 | the same as a Pump | free | cheap for what it does | data | a free Pump every turn you wait |
| Revert Pump | 0 |  |  | undoes your last Pump this turn (the AP comes back) | upkeep |  | not priced | not priced |  | data |  |
| Steady the heart | 1 | only while holding |  | −1 Strain, and no swell next turn | upkeep |  | not priced | not priced |  | data + engine |  |
| Let go | 0 |  |  | drops the held Outburst; you lose Strain equal to its stage (no more than its swells added); the mana meter +1 | upkeep |  | not priced | not priced |  | data |  |
| Feed a glyph into the Outburst | 1 | a glyph on your tile |  | +1 stage | damage dealt |  | the same as a Pump, paid with a glyph | not priced |  | data + engine |  |
| Syphon | 1 |  |  | MP from the air (thin 10, normal 20, rich 30, flooded 40 MP × your Syphon); the meter −2 | upkeep |  | not priced: it buys later casts | not priced |  | engine + data (rules.json mana bands) |  |
| Crystallise | 3 | the mana meter at 10+ (it drops 10) |  | 1 mana core | upkeep |  | not priced: a core is 10 charge for a Sigil caster | not priced |  | engine + data |  |
| Strain over your limit | 0 |  |  | you take 8 damage a point over; 3 over is a Mana Short (Stunned 1 round). Limit 3 + floor(will_power/2) (5 at Will Power 4). Strain falls 1 a turn, and 1 more for a still turn, your first weapon attack, or tending an ally | the price of Strain |  | not priced |  |  | data |  |

**feelings (a Pump poured with a feeling; 25 of them)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Rage | 1 (a Pump) | +1 Strain; unlocked the first time it happens to you: You take 25% of your max HP or more in one hit. | once a hold | a step of +0.5 (a plain Pump: +0.4); Hits harder; +1 Strain to you at the pump. Residue on the tiles: 5 Soul damage a turn. | damage dealt | 0.39 | the step alone on a Damage Bolt: +15 damage; what else it does is not priced | 0.8× | part priced | data (feelings.json) |  |
| Grief | 1 (a Pump) | unlocked the first time it happens to you: An ally goes Down or dies. | once a hold | a step of +0.3 (a plain Pump: +0.4); Targets hit are Slowed (Body save). Residue on the tiles: Slowed a turn (no save). | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Fear | 1 (a Pump) | unlocked the first time it happens to you: A fight with an Elite or Boss starts, or you are made Afraid. | once a hold | a step of +0.3 (a plain Pump: +0.4); Targets hit are pushed 1 and Shaken (Heart save). Residue on the tiles: Shaken on entry (Heart save). | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Love | 1 (a Pump) | unlocked the first time it happens to you: You heal or shield an ally. | once a hold | a step of +0.3 (a plain Pump: +0.4); The shape also heals the allies inside it by the release's power x 0.5, and spares them its damage. Residue on the tiles: Heal 5 a turn. | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Joy | 1 (a Pump) | unlocked the first time it happens to you: You roll a natural 20. | once a hold | a step of +0.3 (a plain Pump: +0.4); Chains to one more enemy within 2 of the first hit, at half, no roll. Residue on the tiles: +1 to rolls while you stand there. | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Calm | 1 (a Pump) | unlocked the first time it happens to you: You end a turn having Steadied, or with 0 Strain. | once a hold | a step of +0.3 (a plain Pump: +0.4); Ignores cover; a Bolt or Lance can't miss (no roll). Residue on the tiles: Strain -1 on entry. | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Spite | 1 (a Pump) | unlocked the first time it happens to you: An enemy damages you. | once a hold | a step of +0.4 (a plain Pump: +0.4); Revenge: its step is +0.8 against whoever last hurt you. Residue on the tiles: 5 Soul damage a turn to whoever hurt the caster last. | damage dealt | 0.31 | the step alone on a Damage Bolt: +12 damage; what else it does is not priced | 0.6× | part priced | data (feelings.json) |  |
| Shame | 1 (a Pump) | unlocked the first time it happens to you: You roll a natural 1, or a vow breaks. | once a hold | a step of +0.6 (a plain Pump: +0.4); 5 true damage to you on release. Residue on the tiles: -1 to rolls while you stand there. | damage dealt | 0.47 | the step alone on a Damage Bolt: +19 damage; what else it does is not priced | 0.9× | part priced | data (feelings.json) |  |
| Pride | 1 (a Pump) | unlocked the first time it happens to you: You take down an Elite or Boss. | once a hold | a step that depends: per stage 0.2; Rewards big casts: +0.2 a stage reached. Residue on the tiles: none | damage dealt |  | not priced | not priced |  | data (feelings.json) |  |
| Despair | 1 (a Pump) | unlocked the first time it happens to you: You drop below a quarter of your max HP. | once a hold | a step that depends: per 10pct missing 0.1; Stronger near death: +0.1 per 10% of max HP you are missing. Residue on the tiles: Weakened a turn. | damage dealt |  | not priced | not priced |  | data (feelings.json) |  |
| Hope | 1 (a Pump) | unlocked the first time it happens to you: You get back up from Downed. | once a hold | a step of +0.3 (a plain Pump: +0.4); Allies in the shape (and you) lose Afraid and Shaken; their next roll is +2 (Hopeful). Residue on the tiles: +2 to saves while you stand there. | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Mercy | 1 (a Pump) | unlocked the first time it happens to you: A foe surrenders to you because of you: talked down, or spared by a non-lethal blow (you… | once a hold | a step of +0.2 (a plain Pump: +0.4); Downs instead of killing; a target hit at a quarter HP or less makes a Heart save or surrenders. Residue on the tiles: The Downed who lie there are stable. | damage dealt | 0.15 | the step alone on a Damage Bolt: +6 damage; what else it does is not priced | 0.3× | part priced | data (feelings.json) |  |
| Cruelty | 1 (a Pump) | unlocked the first time it happens to you: You hit someone Downed or helpless (Stunned, Pinned, Grappled). | once a hold | a step of +0.4 (a plain Pump: +0.4); Adds Bleeding (no save); Bleeding spreads to one enemy next to the target. Residue on the tiles: Bleeding on entry and each turn. | damage dealt | 0.31 | the step alone on a Damage Bolt: +12 damage; what else it does is not priced | 0.6× | part priced | data (feelings.json) |  |
| Loneliness | 1 (a Pump) | unlocked the first time it happens to you: You are the last of your side standing. | once a hold | a step of +0.2 (a plain Pump: +0.4); The lone caster's power: +0.3 more with no ally within 3. Residue on the tiles: none | damage dealt | 0.15 | the step alone on a Damage Bolt: +6 damage; what else it does is not priced | 0.3× | part priced | data (feelings.json) |  |
| Belonging | 1 (a Pump) | unlocked the first time it happens to you: You stand with 3 or more allies within 2. | once a hold | a step that depends: per ally 0.1, range 3, max 0.5; Togetherness: counts twice for allies' Resonance this round. Residue on the tiles: +1 Defense while you stand there. | damage dealt |  | not priced | not priced |  | data (feelings.json) |  |
| Dread | 1 (a Pump) | unlocked the first time it happens to you: An attacker who was Hidden hits you, or a trap or hazard goes off on you. | once a hold | a step of +0.3 (a plain Pump: +0.4); Targets hit lose their reactions this round and their Overwatch. Residue on the tiles: No reactions while you stand there. | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Awe | 1 (a Pump) | unlocked the first time it happens to you: A Miracle or a Grand form happens in your sight. | once a hold | a step of +0.3 (a plain Pump: +0.4); Targets hit lose 1 AP next turn. Residue on the tiles: none | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Longing | 1 (a Pump) | unlocked the first time it happens to you: A scene starts with your linked ally gone (or the Narrator grants it). | once a hold | a step of +0.3 (a plain Pump: +0.4); +2 reach; pulls targets hit 1 toward you. Residue on the tiles: none | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Relief | 1 (a Pump) | unlocked the first time it happens to you: A fight you win ends with no ally Down. | once a hold | a step of +0.2 (a plain Pump: +0.4); The Strain this hold added is given back at the release. Residue on the tiles: Strain -1 on entry. | damage dealt | 0.15 | the step alone on a Damage Bolt: +6 damage; what else it does is not priced | 0.3× | part priced | data (feelings.json) |  |
| Contempt | 1 (a Pump) | unlocked the first time it happens to you: An enemy gives up while you were its last attacker. | once a hold | a step of +0.3 (a plain Pump: +0.4); Targets hit take -2 to attack you (Scorned, 2 rounds). Residue on the tiles: -2 to attacks while you stand there. | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Guilt | 1 (a Pump) | unlocked the first time it happens to you: You damage an ally. | once a hold | a step of +0.3 (a plain Pump: +0.4); Heals the ally you hurt last by 10 x the stage; 5 true damage to you. Residue on the tiles: Heal 5 a turn. | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Jealousy | 1 (a Pump) | unlocked the first time it happens to you: An ally takes down a creature you damaged this round. | once a hold | a step of +0.3 (a plain Pump: +0.4); Steals one boon or the shield from the first enemy hit, to you. Residue on the tiles: none | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Wonder | 1 (a Pump) | unlocked the first time it happens to you: A hidden thing is revealed to you, or you reach a zone for the first time (or the… | once a hold | a step of +0.2 (a plain Pump: +0.4); Reveals Hidden creatures, traps and hazards in its area. Residue on the tiles: Spot Hidden things within 3 at the start of your turn. | damage dealt | 0.15 | the step alone on a Damage Bolt: +6 damage; what else it does is not priced | 0.3× | part priced | data (feelings.json) |  |
| Defiance | 1 (a Pump) | unlocked the first time it happens to you: You resist an Overreach, or pass a save against Afraid. | once a hold | a step of +0.3 (a plain Pump: +0.4); Can't be resisted (no saves on its conditions, pushes and riders); your next save passes. Residue on the tiles: Immune to Afraid while you stand there. | damage dealt | 0.23 | the step alone on a Damage Bolt: +9 damage; what else it does is not priced | 0.5× | part priced | data (feelings.json) |  |
| Abandon | 1 (a Pump) | +2 Strain; unlocked the first time it happens to you: You indulge an Overreach. | once a hold | a step of +0.8 (a plain Pump: +0.4); +2 Strain to you at the pump. Residue on the tiles: A random condition on entry (Slowed, Weakened, Shaken… | damage dealt | 0.62 | the step alone on a Damage Bolt: +25 damage; what else it does is not priced | 1.2× | part priced | data (feelings.json) |  |

**sample Outbursts (Will Power 4, Determination 4)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Damage Bolt, stage 0, all in one turn | 3 (Begin + 0 Pumps + Release) | 20 MP (of 400), 1 Strain |  | 25 Soul damage (ignores armour; a rolled hit) | damage dealt | 0.62 | 25 ÷ the rifle's 40 | 0.4× | dear for what it does | data (20 × Soul multiplier ×1.55 × stage ×0.8) |  |
| Damage Bolt, stage 1, all in one turn | 4 (Begin + 1 Pump + Release) | 20 MP (of 400), 1 Strain |  | 31 Soul damage (ignores armour; a rolled hit) | damage dealt | 0.77 | 31 ÷ the rifle's 40 | 0.4× | dear for what it does | data (20 × Soul multiplier ×1.55 × stage ×1) |  |
| Damage Bolt, stage 2, all in one turn | 5 (Begin + 2 Pumps + Release) | 20 MP (of 400), 1 Strain |  | 43 Soul damage (ignores armour; a rolled hit) | damage dealt | 1.08 | 43 ÷ the rifle's 40 | 0.4× | dear for what it does | data (20 × Soul multiplier ×1.55 × stage ×1.4) |  |
| Damage Bolt, stage 3, all in one turn | 6 (Begin + 3 Pumps + Release) | 20 MP (of 400), 1 Strain |  | 56 Soul damage (ignores armour; a rolled hit) | damage dealt | 1.4 | 56 ÷ the rifle's 40 | 0.5× | dear for what it does | data (20 × Soul multiplier ×1.55 × stage ×1.8) |  |
| Damage Bolt, stage 4, all in one turn | 7 (Begin + 4 Pumps + Release) | 20 MP (of 400), 1 Strain; more than a 6 AP turn: needs a free Pump or a held turn |  | 68 Soul damage (ignores armour; a rolled hit) | damage dealt | 1.71 | 68 ÷ the rifle's 40 | 0.5× | dear for what it does | data (20 × Soul multiplier ×1.55 × stage ×2.2) |  |
| Damage Bolt, begun, held 2 turns, released at stage 2 | 3 over 3 turns | 20 MP, 3 Strain |  | 43 Soul damage | damage dealt | 1.08 | 43 ÷ the rifle's 40 | 0.7× |  | data | the swells are free AP; the price is Strain and time |
| Mend (Buff: heal), stage 0 | 3 | 20 MP, 1 Strain |  | 41 HP to one ally | HP restored | 1.57 | 41 HP, at the rifle's rate | 1× |  | data (30 × Healing given ×1.7 × stage) |  |
| Mend (Buff: heal), stage 2 | 5 | 20 MP, 1 Strain |  | 71 HP to one ally | HP restored | 2.75 | 71 HP, at the rifle's rate | 1.1× |  | data (30 × Healing given ×1.7 × stage) |  |
| Mend (Buff: heal), stage 4 | 7 | 20 MP, 1 Strain |  | 112 HP to one ally | HP restored | 4.32 | 112 HP, at the rifle's rate | 1.2× |  | data (30 × Healing given ×1.7 × stage) |  |
| Control: Pinned, stage 0 | 3 | 25 MP, 1 Strain |  | Pinned 2 rounds on a failed Body save (or Slowed, a 3-tile push or pull) | enemy AP removed | 0.5 | Pinned for 2 rounds, half the time | 0.3× | dear for what it does | data (schools) |  |

**modules (added to a design; paid in MP at Begin)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Move | 0 | +5 MP |  | Far: the Outburst reaches 8 tiles instead of 4, plus your Soul range bonus. It only changes a Bolt or a Burst; a Wave, Lance or Aura keeps its own… |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Homing | 0 | +10 MP |  | +2 to the Release roll, and the Outburst ignores half cover. It only matters for a Bolt or Lance: the area shapes don't roll. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Swift | −1 on Begin | +10 MP |  | Begin costs 1 AP instead of 2. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Ether | 0 | +20 MP |  | The Release needs no line of sight and passes through walls and cover. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Right | 0 | +5 MP |  | The Status school's conditions are resisted with a Heart save. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Left | 0 | +5 MP |  | The Status school's conditions are resisted with a Brain save. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Time | 0 | +15 MP |  | Conditions from the Outburst's school, and from its second school, last 2 rounds longer. An element's stage effects keep their own durations. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Inverse | 0 | +10 MP |  | Flips a Damage Outburst: instead of harming, it gives each ally it reaches a shield of the same size, and it skips enemies in the area. The Narrator… |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Size | 0 | +15 MP |  | The shape grows one step: a Wave is 4 tiles long, a Burst or Aura has radius 2, and a Lance is 6 tiles long. It needs a shape: a Bolt can't use it. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Random | 0 | -10 MP |  | Costs 10 MP less, but the target is picked at random from every creature within reach, allies included. A Bolt or Burst lands on one of them; a Wave… |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Impact | 0 | +0 MP |  | The effect happens when the Outburst lands. Every Outburst already works this way, so it changes nothing. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| At Once | 0 | +10 MP |  | A Bolt or Lance hits without a roll, for half damage. The area shapes never roll anyway. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Wave | 0 | +15 MP |  | Shape: a cone 3 tiles long from you toward your aim (4 with Size). It hits everyone in it without a roll, for ×0.7 damage. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Burst | 0 | +20 MP |  | Shape: every tile within 1 of the tile you aim at (within 2 with Size). It hits everyone in it without a roll, for ×0.7 damage. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Aura | 0 | +15 MP |  | Shape: every tile within 1 of you, all at once (within 2 with Size). You don't aim it. It never touches you, unless it is a Buff. It deals ×0.6… |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Lance | 0 | +15 MP |  | Shape: a straight line 4 tiles long from you toward your aim, in any of the 8 directions (6 tiles with Size). It pierces everyone on the line, but… |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Split | 0 | +15 MP |  | Bolt only. It also hits the nearest other creature within 2 tiles of your target that the school can affect, at full strength. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Ricochet | 0 | +15 MP |  | A Bolt bounces off walls and cover. If there is a wall or cover within 2 tiles of your target, it needs no line of sight and ignores half cover. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Fuse | 0 | +10 MP |  | The Release lands and waits. It goes off at the start of your next turn, or when a creature steps into its area, whichever comes first. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Return | 0 | +20 MP |  | A Bolt or Lance goes out and comes back, hitting each target twice. Each hit rolls on its own. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Volley | 0 | +15 MP |  | A Bolt becomes 3 small bolts at the same target. Each rolls on its own and deals ×0.4 damage. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Bloom | 0 | +20 MP |  | A Burst or Aura grows by 1 radius for each stage it has reached. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Anchor | 0 | +15 MP |  | Each target hit is Pinned for 1 round unless it passes a Body save. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Lure | 0 | +10 MP |  | Each target hit is pulled 2 tiles toward you. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Shell | 0 | +10 MP |  | When you Release, you gain a shield equal to half the Outburst's damage. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Linger | 0 | +15 MP |  | The area stays as a field for 2 rounds. A Damage field deals 5 damage and the element's stage 1 effect to each enemy that starts its turn there; a… |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Quiet | 0 | -5 MP |  | Holding the Outburst adds half the usual Strain, rounded down, from Begin, swells and feelings. In return the Release is at ×0.8 strength. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Silent | 0 | +10 MP |  | Begin, Pump and Release don't reveal you while you are Hidden. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |
| Thread | 0 | +10 MP |  | A Buff Release links the first two allies it reaches. The next time one of them is healed, the other heals the same amount. It works once. |  |  | not priced: it changes the design |  |  | data (soul_modules.json) |  |

### Prayer

**Whispers (any patron)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Whisper: Luck | 1 | Faith 3; the mana meter −5 | once a turn | You or an ally you can see gets +2 on their next attack roll or check. | see the text | 0.15 | +2 on one roll | 0.3× | dear for what it does | data (patrons.json) + engine (AP_COST) |  |
| Whisper: Health | 1 | Faith 3; the mana meter −5 | once a turn | You or an ally you can see heals 15 × your Blessing power. | see the text | 0.81 | heals 21 (Blessing power ×1.4 at Faith 4) | 1.6× | cheap for what it does | data (patrons.json) + engine (AP_COST) |  |
| Whisper: Protection | 1 | Faith 3; the mana meter −5 | once a turn | You or an ally you can see gains a shield of 15 × your Blessing power. | see the text | 0.81 | a shield of 21 (Blessing power ×1.4 at Faith 4) | 1.6× | cheap for what it does | data (patrons.json) + engine (AP_COST) |  |
| Whisper: Courage | 1 | Faith 3; the mana meter −5 | once a turn | Ends Fear and Shaken on you or an ally you can see. |  |  | not priced | not priced |  | data (patrons.json) + engine (AP_COST) |  |
| Whisper: Guidance | 1 | Faith 3; the mana meter −5 | once a turn | Reveals Hidden enemies and traps within 6 tiles of you, and gives you +2 on your next roll to spot something. | see the text |  | not priced | not priced |  | data (patrons.json) + engine (AP_COST) |  |
| Whisper: Safe Passage | 1 | Faith 3; the mana meter −5 | once a turn | Your next move this turn provokes no opportunity attacks. |  |  | not priced | not priced |  | data (patrons.json) + engine (AP_COST) |  |

**Hymns · Holy Father Nerukhan**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hymn I: Saint's Shield | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | You or an ally you can see gains a shield of 40 × your Blessing power. | see the text | 2.15 | a shield of 56 (Blessing power ×1.4) | 1.4× |  | data (patrons.json) |  |
| Hymn II: Judgement | 3 | Devotion 5 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | An enemy you can see takes 40 Soul damage × your Blessing power. The damage is doubled if that enemy harmed a surrendered or Downed creature this fight. | damage dealt | 2.15 | 56 Soul damage, no roll (double against one that harmed the helpless) (Blessing power ×1.4) | 1.4× |  | data (patrons.json) |  |
| Hymn III: Absolution | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | You or an ally you can see loses every harmful condition and heals 30 × your Blessing power. | HP restored | 1.62 | heals 42 and ends every harmful condition (the conditions are not priced) + a part with no price | 1.1× | part priced | data (patrons.json) |  |

**Miracles**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Holy Father Nerukhan: The Saints' Verdict | 3 | Faith 7 and Devotion 10; it lowers Devotion by 5 levels | once a session | Every enemy in sight takes 100 Soul damage × your Blessing power and is Stunned for 1 round. Enemies that harmed a surrendered or Downed creature this fight take double and are Stunned for 2 rounds. | the class of its own: a peak |  | not priced: a once-a-session event | not priced |  | data (patrons.json) |  |
| The Quartermaster: Requisition Approved | 3 | Faith 7 and Devotion 10; it lowers Devotion by 5 levels | once a session | The whole squad is restocked (ammo, Supplies, throwables) and gets 2 standard cores each. All gear is repaired, jams and heat are cleared, and everyone gets +3 AP next turn. | the class of its own: a peak |  | not priced: a once-a-session event | not priced |  | data (patrons.json) |  |
| The Laughing Mask: Encore | 3 | Faith 7 and Devotion 10; it lowers Devotion by 5 levels | once a session | Every ally may repeat the last action they took this round for free, and every enemy in sight is Confused for 1 round. | the class of its own: a peak |  | not priced: a once-a-session event | not priced |  | data (patrons.json) |  |
| The Toll-Keeper: Turned Back at the Shore | 3 | Faith 7 and Devotion 10; it lowers Devotion by 5 levels | once a session | Every ally who died or was Downed this fight stands up at half HP. | the class of its own: a peak |  | not priced: a once-a-session event | not priced |  | data (patrons.json) |  |
| Mother Ember: Everyone Home | 3 | Faith 7 and Devotion 10; it lowers Devotion by 5 levels | once a session | The whole squad heals to full HP, Downed allies stand up, every harmful condition ends, and everyone gains a shield of 40 × your Blessing power. | the class of its own: a peak |  | not priced: a once-a-session event | not priced |  | data (patrons.json) |  |
| Old Overcast: The Sky Answers | 3 | Faith 7 and Devotion 10; it lowers Devotion by 5 levels | once a session | Pick a 5 × 5 area you can see. Every enemy in it takes 150 lightning damage × your Blessing power, is Stunned for 1 round and is Shaken. Your own side is never hit. | the class of its own: a peak |  | not priced: a once-a-session event | not priced |  | data (patrons.json) |  |
| The Matchmaker: Love Conquers | 3 | Faith 7 and Devotion 10; it lowers Devotion by 5 levels | once a session | Every enemy in sight that is not a boss surrenders, with no save. A boss, or any enemy that can't surrender, must pass a Heart save or be Commanded to hold for 1 round: it makes no attacks. | the class of its own: a peak |  | not priced: a once-a-session event | not priced |  | data (patrons.json) |  |
| The Counting Weaver: Rewoven | 3 | Faith 7 and Devotion 10; it lowers Devotion by 5 levels | once a session | Every ally whose HP was higher at the start of this round gets that HP back, and the Downed among them stand up. Then the whole squad takes another full turn, right now. | the class of its own: a peak |  | not priced: a once-a-session event | not priced |  | data (patrons.json) |  |

**interventions (the patron acts by itself)**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Holy Father Nerukhan | 0 | you must be Witnessed (Faith 5; a Hymn or Miracle this fight) | once a fight (twice from Devotion 7) | When an enemy damages a surrendered or Downed creature, that enemy takes 20 + 4 × your Devotion Soul damage, × your Blessing power. |  |  | not an action |  |  | data (patrons.json) |  |
| The Quartermaster | 0 | you must be Witnessed (Faith 5; a Hymn or Miracle this fight) | once a fight (twice from Devotion 7) | When you reload, the reload is free: its AP comes back. When your Evoker's core runs out of charge, a fresh core slots in for free and your spare cores are untouched… |  |  | not an action |  |  | data (patrons.json) |  |
| The Laughing Mask | 0 | you must be Witnessed (Faith 5; a Hymn or Miracle this fight) | once a fight (twice from Devotion 7) | When an enemy misses you, it falls Prone. |  |  | not an action |  |  | data (patrons.json) |  |
| The Toll-Keeper | 0 | you must be Witnessed (Faith 5; a Hymn or Miracle this fight) | once a fight (twice from Devotion 7) | When an ally would drop to 0 HP, they stay at 1 HP instead. |  |  | not an action |  |  | data (patrons.json) |  |
| Mother Ember | 0 | you must be Witnessed (Faith 5; a Hymn or Miracle this fight) | once a fight (twice from Devotion 7) | When an ally drops below a quarter of their HP, they heal 20 + 4 × your Devotion, × your Blessing power. |  |  | not an action |  |  | data (patrons.json) |  |
| Old Overcast | 0 | you must be Witnessed (Faith 5; a Hymn or Miracle this fight) | once a fight (twice from Devotion 7) | When you kill an enemy, the nearest other enemy takes 20 + 4 × your Devotion lightning damage, × your Blessing power. |  |  | not an action |  |  | data (patrons.json) |  |
| The Matchmaker | 0 | you must be Witnessed (Faith 5; a Hymn or Miracle this fight) | once a fight (twice from Devotion 7) | When an ally next to you is hit, half the damage moves to you. |  |  | not an action |  |  | data (patrons.json) |  |
| The Counting Weaver | 0 | you must be Witnessed (Faith 5; a Hymn or Miracle this fight) | once a fight (twice from Devotion 7) | When an enemy scores a critical hit on you, it becomes a normal hit. |  |  | not an action |  |  | data (patrons.json) |  |

**Hymns · The Quartermaster**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hymn I: Resupply | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | You or an ally you can see reloads every weapon for free and regains 1 Supply. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn II: Dig In | 3 | Devotion 5 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | You or an ally you can see gains half cover on the tile where they stand, until they move, and is Braced. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn III: Covering Fire | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | Pick a 3 × 3 area you can see. Each enemy in it is Pinned for 1 round unless it passes a Body save. | enemy AP removed | 0.5 | Pinned 1 round on a failed save, each enemy on 3×3 tiles (2 counted) (Blessing power ×1.4) | 0.3× | dear for what it does | data (patrons.json) |  |

**Hymns · The Laughing Mask**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hymn I: Lucky Break | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | The next attack roll that you or an ally you can see fails is rerolled at +5. Outside a fight, it is +5 on their next check instead. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn II: Switcheroo | 3 | Devotion 5 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | Two creatures you can see, both within 6 tiles of you, swap places. An enemy can resist with a Brain save. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn III: Pratfall | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | An enemy you can see must pass a Body save or fall Prone and drop the weapon it is holding. | enemy AP removed | 0.75 | Prone and disarmed on a failed Body save (Blessing power ×1.4) | 0.5× | dear for what it does | data (patrons.json) |  |

**Hymns · The Toll-Keeper**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hymn I: Coin for the Ferry | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | A Downed ally you can see is stabilised and stands up with 10 HP × your Blessing power. | HP restored |  | a Downed ally stands up with 14 HP (not priced: it gives a character their turns back, like Stabilise) | not priced |  | data (patrons.json) |  |
| Hymn II: Hold the Gate | 3 | Devotion 5 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | Until your next turn, you and the allies you can see can't drop below 1 HP. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn III: Last Crossing | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | An enemy you can see at a quarter of its HP or less must pass a Heart save or die. A boss takes 40 Soul damage × your Blessing power instead. |  |  | not priced | not priced |  | data (patrons.json) |  |

**Hymns · Mother Ember**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hymn I: Warm Hands | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | You or an ally you can see heals 40 × your Blessing power. | see the text | 2.15 | heals 56 (Blessing power ×1.4) | 1.4× |  | data (patrons.json) |  |
| Hymn II: Hearthlight | 3 | Devotion 5 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | Pick a 3 × 3 area you can see. For 3 rounds, each ally who starts a turn in it heals 10 × your Blessing power. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn III: Feed the Fire | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | You or an ally you can see gets +1 AP right now, up to the limit of 9 AP, and loses Weakened and Slowed. | AP given to the squad | 0.5 | +1 AP to an ally now; ends Weakened and Slowed (not priced) + a part with no price | 0.3× | part priced | data (patrons.json) |  |

**Hymns · Old Overcast**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hymn I: Thunderclap | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | Pick a tile you can see. Each enemy within 2 tiles of it is pushed 1 tile away, and is Shaken unless it passes a Heart save. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn II: Lightning Rod | 3 | Devotion 5 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | An enemy you can see takes 50 lightning damage × your Blessing power. It chains to 1 more enemy within 2 tiles for half. | damage dealt | 4.04 | 70 lightning damage, no roll, and half to 1 more enemy (Blessing power ×1.4) | 2.7× | cheap for what it does | data (patrons.json) |  |
| Hymn III: Gather the Clouds | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | Until your next turn, the Storm tone's stage effects count 1 stage higher for your side. |  |  | not priced | not priced |  | data (patrons.json) |  |

**Hymns · The Matchmaker**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hymn I: Red Thread | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | Links two allies you can see for 2 rounds. When either one is hit, half the damage moves to the other. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn II: Sweet Nothings | 3 | Devotion 5 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | An enemy you can see must pass a Heart save or be Smitten for 1 round: it can't attack you, or any ally linked to you by Red Thread. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn III: Together | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | Two allies standing next to each other each get +2 to hit and +2 Defense until your next turn. | damage dealt | 1.23 | two allies each get +2 to hit (2 attacks) and +2 Defense (2 attacks on them) until your next turn (Blessing power ×1.4) | 0.8× |  | data (patrons.json) |  |

**Hymns · The Counting Weaver**

| Action | AP | Other costs | How often | What it buys | Currency | Worth | How it was priced | Against the yardstick | Flag | Read from | Note |
|---|---|---|---|---|---|---|---|---|---|---|---|
| Hymn I: Foreknowing | 3 | Devotion 3 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | The next attack against you or an ally you can see misses. | damage prevented | 1 | one enemy attack misses (Blessing power ×1.4) | 0.7× | dear for what it does | data (patrons.json) |  |
| Hymn II: Unravel | 3 | Devotion 5 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | An enemy you can see loses every buff and its shield. It also stops being Braced and loses any shot it is holding. |  |  | not priced | not priced |  | data (patrons.json) |  |
| Hymn III: Cut Short | 3 | Devotion 7 (above your standing: a roll, and −3 Devotion XP on a miss); the mana meter −5 | a cooldown between Hymns (your prayer cooldown) | An enemy you can see must pass a Heart save or be Stunned and lose its next turn. A boss loses 2 AP on its next turn instead, with no save. | enemy turn removed | 1.5 | Stunned (a lost turn) on a failed Heart save; a boss loses 2 AP with no save (Blessing power ×1.4) | 1× |  | data (patrons.json) |  |

