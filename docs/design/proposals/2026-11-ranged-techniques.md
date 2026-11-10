# Proposal: ranged techniques (Pressure)

Status: **draft for Leon.** Nothing here is built. Every number is a placeholder for the balance pass; what matters is what each piece does. Companion to `2026-11-melee-techniques.md`, and it keeps that proposal's accepted decisions: any weapon, techniques as cards you slot in, drill as an XP bar per weapon filled by kills, `hits_with` and `scales_with` on every weapon.

**How this was made.** Four complete designs were written independently, each from a different answer to "what does ranged own": the target, the magazine, the line of fire, and an open brief. Three judges scored them as a player in a four-player room, as a systems designer and as the implementer. All three picked the same one. This document is that design with the best parts of the other three added and its own weak points fixed. Section 9 says what was rejected and why.

## 1. The identity

**Ranged owns pressure. Its meter is not on you: it is on the person you are shooting at.**

1. Sigils own space, Outbursts own time, faith owns a relationship, melee owns the sequence. A gun changes what the other side dares to do.
2. Three things make it different from melee's Momentum:
   - the meter sits on the target, not on the shooter;
   - the whole squad builds it and anyone can use it;
   - a miss can still add to it.
3. Nothing is drawn or left on a tile, so it stays off the Sigils' ground. Pressure travels with the body it is on.
4. The order of techniques inside your turn doesn't matter. That is what keeps it from being the melee chain with guns.

## 2. Pressure

1. **Pressure runs 0 to 4 on every combatant,** shown as pips over the token.

   | Pressure | State | On an enemy | On a player character |
   |---|---|---|---|
   | 1 | Under fire | nothing | nothing |
   | 2 | **Pressed** | −1 to hit; no Watch techniques | the same |
   | 3 | **Suppressed** (today's status, item 83) | −1 AP, no reactions (so no Parry, Riposte or Keep Back); a Heart save to leave cover | no reactions, and the Heart save to leave cover; **never an AP loss** |
   | 4 | **Broken** | −2 AP; its first action must be to reach cover or drop Prone | players stop at 3 |

2. **Gaining it.**
   - The first ranged hit you land on a target each turn gives it +1.
   - If that target is flanked or has no cover from you, +1 more. Position makes Pressure through rules that already exist.
   - **Press** techniques give more, some of them on a miss.
   - When a ranged attack takes an enemy out, every other enemy within 3 tiles that saw it gains +1. Weak enemies dying feeds the meter instead of wasting it.
3. **Losing it.** −1 at the end of your own turn; −2 if you end it in cover and out of every enemy's sight.
4. **Tiers.** Elites stop at 3. Bosses stop at 2: they can be Pressed, never Suppressed.
5. **Using it: Takes.** A Take needs its target **Pressed**. It lowers the target's Pressure by 2 and does a fixed thing, with a better line if the target was **Suppressed**. One Take a turn per shooter. A Take is not "spend everything for a bigger number": that is melee's Finisher.
6. **Why "Shot, Shot, Shot" stops.** A second plain Shot at the same target adds no Pressure and takes Recoil. A Press and then a Take do more for the same AP, and the 1 AP Sets fill the odd points.
7. **What the screen shows.** Pips on every token. A Silent weapon's Pressure is hidden from its target until it is used. When an enemy has a player Pressed, the player sees who: "the sharpshooter has you Pressed".

**What a turn looks like:**

| Fighter | A turn |
|---|---|
| Rifleman | **Suppress** the gunner behind the crate (Pressure 2), **Shift** to the corner, hold the last AP. Next turn: **Dead Centre**. |
| SMG gunner | Move in, **Rake** three enemies (each +1), then **Cover Me** on the Fighter running at them. |
| Sniper | **Bead** on the officer, **Aimed Shot**, pay for **Dead to Rights**. When the rifleman has it Suppressed: **Dead Centre**. |
| Shotgunner | **Flush** the cover (it breaks; the target is in the open and Pressed). Next turn **Storm** in and **Stopping Shot**. |
| Archer | From Hidden: pick the arrow, **Aimed Shot** at full draw. An unseen hit gives +2 Pressure and the target can't see the pips. Then **Pin Down** nails it to the wall. |
| Grenadier | **Lob** a frag over the wall (everyone in the blast +2), then **Rout** the survivors. |

## 3. The five kinds of technique

| Kind | Rule | For |
|---|---|---|
| **Fire** | costs its AP and its rounds; Recoil after the first technique that fires this turn | damage |
| **Press** | makes Pressure, with little or no damage; +1 Heat on top of what it fires | control |
| **Set** | 1 AP; never fires; no Heat | preparing yourself, the weapon or the squad |
| **Take** | the target must be Pressed; lowers its Pressure by 2; one a turn | the payoff |
| **Watch** | paid for on your turn with a trigger you choose then; the engine fires it as your reaction, without asking; not while you are Pressed | the enemy's turn |

1. **Every technique lists its rounds beside its AP.** Ammunition is the second cost, and it is what keeps the plain Shot honest: it is the cheapest per round.
2. **Every attack rolls d20 + Dexterity against Defense, and damage scales with Agility** (`hits_with`, `scales_with`). Bows add Raw Power to the damage.
3. **A melee Link that moves an enemy (Shove, Drag, Throw Down) sets off a Watch** as if the enemy had moved itself. The swordsman throws them into the gunner's sights.

## 4. Ranged weapon properties

| Property | Means | Typical rider |
|---|---|---|
| **Quick** | handy; one hand, or short | firing next to an enemy doesn't provoke; moving costs no accuracy |
| **Auto** | throws many rounds | Pressure on a miss; several targets |
| **Precise** | a long barrel or glass | better when you haven't moved; criticals |
| **Spread** | shot or flame in a cone | everyone close; breaks cover |
| **Heavy** | must be Braced to work well | shooting through things; holding a lane while Braced |
| **Blast** | it explodes | aimed at a tile; Pressure to everyone in the radius |
| **Arc** | it flies over | indirect fire |
| **Silent** | no report | never reveals you; no Pressure on a miss, +2 on a hit from unseen; its pips are hidden |
| **Loud** | a cannon in the hand | a miss still gives +1 Pressure; saves against it at −2 |
| **Drawn** | your arm is the powder | no Heat or Recoil; full draw adds damage; any arrow type on each shot (a quiver, not a magazine) |

**Thrown** is shared with the melee list: it is the bridge property.

| Weapon | Properties | Today's weapon skill becomes |
|---|---|---|
| Service pistol | Quick | teaches **Snap Shot** |
| Decrkm auto-pistol | Quick, Auto | Point Blank is Quick's own rider |
| Parlour pistol | Quick, Silent | teaches **Warning Shot** |
| Magistrate heavy pistol | Quick, Loud | teaches **Stopping Shot** |
| Drifter revolver | Quick, Precise | teaches **Mag Dump** (Fan the Hammer) |
| Frontier hand cannon | Loud, Precise | Knockback is Loud's rider on Stopping Shot |
| Decrkm SMG | Quick, Auto | teaches **Rake** |
| Legion PDW | Quick, Auto | teaches **Storm** |
| Whisper SMG | Auto, Silent | Quiet Work is the Silent property |
| Mandestra drum-gun | Auto, Loud | Wide Spray is Auto's rider on Rake |
| Hellraiser service rifle | Auto, Precise | teaches **Suppress** |
| Lever carbine | Precise, Quick | teaches **Walking Fire** |
| Adamantile battle rifle | Precise, Loud | teaches **Punch Through** |
| CCEC marksman rifle | Precise | teaches **Called Shot** |
| Legion bullpup | Auto, Quick | teaches **Shift** |
| Long rifle | Precise, Loud | teaches **Bead** |
| .700 Blackpoint | Heavy, Precise, Loud | teaches **Dead Centre** |
| Hellraiser LMG | Heavy, Auto | teaches **Brace** (Emplace) |
| Hellraiser rotary | Heavy, Auto, Loud | Spin Up stays on the item |
| Lumeri scattergun | Spread, Loud | teaches **Flush** |
| Coach gun | Spread, Loud | Both Barrels is Mag Dump on two shells |
| Sawn-off | Spread, Quick | Close Quarters is the Quick property |
| Brigade auto-shotgun | Spread, Auto | Room Sweeper is Auto's rider on Burst |
| Smetanita thumper | Heavy, Blast, Arc | teaches **Lob** |
| Breacher tube | Heavy, Blast, Loud | Bunker Buster is Blast's rider on Flush |
| Purifier flamer | Heavy, Spread | Wall of Fire stays as its own card |
| Recurve bow | Drawn, Silent, Quick | teaches **Pin Down** |
| Longbow | Drawn, Silent, Arc | Arc is the property |
| Crossbow | Precise, Silent | Bolt Rest: its Aimed Shot costs 2 AP |
| Repeating crossbow | Silent, Quick | Volley is Burst |
| Frag and incendiary grenades, satchel | Thrown, Blast, Arc | the frag teaches **Rout** |
| Smoke, flashbang, bot-scrambler | Thrown, Blast, Arc | section 7 |

As in melee, a signature names its home property, and off it the technique works a bit worse.

## 5. The techniques (30, plus Shot)

Where a weapon has two matching properties, the player picks one. "Rounds" is how many leave the magazine.

### Fire

| # | Technique | AP · rounds | Base, with any ranged weapon | With the right weapon |
|---|---|---|---|---|
| 0 | **Shot** | 2 · 1 | One shot. Everyone knows it; it takes no ready slot. | **Precise:** +1 if you haven't moved this turn. **Loud:** a miss gives +1 Pressure. |
| 1 | **Snap Shot** | 2 · 1 | Draw or swap to this weapon and fire, at −2. | **Quick:** no penalty. **Heavy:** not available. |
| 2 | **Burst** | 3 · 3 | Two rolls at one target, the second at −2. | **Auto:** three rolls (today's burst), and it may split between two adjacent targets. **Quick:** no −2. |
| 3 | **Aimed Shot** | 3 · 1 | +2 to hit (today's rule). | **Precise:** +3, and a critical on 18–20 if you haven't moved. **Drawn:** full draw, +25% damage. |
| 4 | **Called Shot** | 3 · 1 | −2 to hit. Choose leg (Slowed), arm (weapon lowered) or head (Dazed); the target makes a Body save. | **Precise:** no penalty. **Loud or Heavy:** leg is Prone instead. **Spread:** only within 4 tiles. |
| 5 | **Walking Fire** | 3 · 1 | Move 2 tiles and fire one shot at any point of the move. | **Quick:** 3 tiles, and no opportunity attacks. **Auto:** the shot is a Burst for 3 rounds. **Heavy:** not available. |
| 6 | **Punch Through** | 3 · 1 | Half cover counts −2, not −5, and the cover takes the damage as well. | **Heavy:** the round carries on to the next target in line at half. **Blast or Spread:** half cover is destroyed. |
| 7 | **Lob** | 3 · 1 | Fire at a target only an ally can see (through smoke or dark), at −4. | **Arc:** over full cover, at −2. **Blast:** you aim at the tile; no penalty, and everyone in the radius gains +2 Pressure. |

### Press (+1 Heat)

| # | Technique | AP · rounds | Base | With the right weapon |
|---|---|---|---|---|
| 8 | **Suppress** | 3 · 3 | One roll at +2. A hit is half damage and +2 Pressure; a miss is +1. | **Auto:** enemies within 1 tile of the target also gain +1. **Heavy, Braced:** it holds until your next turn: any enemy that moves or fires inside 3 tiles of the target gains +1 (today's Suppressing Fire). **Silent:** hits only. |
| 9 | **Rake** | 4 · 6 | Up to 3 targets within 2 tiles of each other, each at −3; +1 Pressure on a hit. | **Auto:** today's full-auto cone for 10 rounds; +1 Pressure hit or miss. **Spread:** the cone is 1 wider. |
| 10 | **Warning Shot** | 1 · 1 | No attack. The target makes a Heart save or gains +1 Pressure. | **Loud:** the save is at −2. **Silent:** not available. |
| 11 | **Flush** | 3 · 1 | Hit the target's cover (no roll; the cover takes the damage). The target gains +2 Pressure. | **Spread or Blast:** double damage to the cover. **Arc:** the cover is ignored and the target takes half damage as well. |
| 12 | **Mag Dump** | 4 · all | Empty the weapon at one target: one roll per 3 rounds left (at most 4 rolls), each at −1 more than the last. +1 Pressure per hit. Heat goes to one under the limit. | **Auto:** +1 Pressure per roll, hit or miss. **Quick, Precise** (a revolver): no growing penalty. **Spread:** both barrels, one roll at double damage within 4 tiles. **Drawn:** not available. |
| 13 | **Crossfire** | 2 · 1 | A shot at a target an ally has already hit this round: +2 to hit and +1 extra Pressure. | **Quick:** step 1 tile first, with no opportunity attack. |

### Set (1 AP, no rounds)

| # | Technique | Base | With the right weapon |
|---|---|---|---|
| 14 | **Bead** | Name a target. Until you move or name another, your shots at it ignore one range band, and its Pressure doesn't fall while you see it. | **Precise:** +1 to hit it. **Heavy:** you may move 1 tile without losing it. |
| 15 | **Spot** | Name a target for the squad: until your next turn allies have +1 to hit it, and the first ally to hit it adds +1 Pressure more. | **Precise:** allies also ignore one range band. **Silent:** the target isn't told. |
| 16 | **Brace** | Today's Brace, opened to any weapon resting on half cover: Recoil halved. | **Heavy:** removes its penalties (today's rule). **Auto:** Suppress gives +1 more. |
| 17 | **Load Special** | Chamber one special round you carry (armour-piercing, hollow-point, incendiary, enhanced) for your next Fire. The magazine stays as it is. | **Drawn:** not needed (any arrow, every shot). **Spread:** the whole cone gets the round's rider. |
| 18 | **Shift** | Move 1 tile from cover to cover without setting off a Watch. | **Quick:** 2 tiles. **Heavy:** you stay Braced. |
| 19 | **Vent** | −2 Heat now. | **Heavy:** −4 (a barrel swap). **Drawn:** not needed. |
| 20 | **Head Down** | Remove 1 Pressure from yourself, 2 behind full cover. You can't Watch this round. | the same for every weapon |

### Take (the target must be Pressed; it loses 2 Pressure; one a turn)

| # | Technique | AP · rounds | Base | If the target was Suppressed | With the right weapon |
|---|---|---|---|---|---|
| 21 | **Dead Centre** | 3 · 1 | One shot at +50% damage. | Its cover doesn't count. | **Precise:** +2 to hit. **Drawn:** ignores 5 armour. |
| 22 | **Pin Down** | 3 · 1 | A shot at ×0.7. The target is Pinned (today's condition) for 1 round. | No save, and 2 rounds. | **Auto:** full damage. **Drawn or Silent:** nailed in place until it spends 2 AP. |
| 23 | **Rout** | 3 · 1 | No damage. The target makes a Heart save or runs its full move away from you, drawing opportunity attacks and Watches. | The save is at −3. | **Loud:** −2 more. **Blast:** everyone Pressed in the radius. |
| 24 | **Stopping Shot** | 2 · 1 | A shot. The target loses 1 AP next turn and is pushed 1 tile. | It also falls Prone. | **Loud or Heavy:** pushed 2. **Spread, within 4 tiles:** pushed 2 and Prone either way. |
| 25 | **Storm** | 3 · 1 | Move up to 3 tiles toward the target without its reaction, then shoot. | Your shot is a critical on 18–20. | **Quick:** +2 to hit. **Spread:** Body save or Prone. |
| 26 | **Last Round** | 2 · 1 | Only with the last round in the weapon: +3 to hit. If it takes the target out, your next speed reload is free. | It can't be reduced by cover. | **Quick, Precise** (a revolver): +50% damage. **Drawn:** the last arrow in the quiver counts. |

### Watch (paid on your turn; the engine fires it; not while you are Pressed)

| # | Technique | AP · rounds | Trigger you choose | What happens | With the right weapon |
|---|---|---|---|---|---|
| 27 | **Overwatch** | the shot's AP · 1 | the first enemy to move in your sight (today's rule, unchanged) | the held shot | **Precise:** +2. **Auto:** it is a Burst. **Spread:** anyone coming within 4 tiles. |
| 28 | **Deny** | 2 · 1 | the first enemy to enter a tile you name | the shot; on a hit it stops there | **Heavy, Braced:** any tile in a straight line of 3. **Blast:** the tile takes the blast. |
| 29 | **Cover Me** | 2 · 1 | the first enemy to attack an ally you name | that attack is at −2, and the enemy gains +1 Pressure | **Auto:** two allies. **Precise:** you also take the shot. |
| 30 | **Dead to Rights** | 3 · 1 | a Pressed enemy you name attacks, stands up, reloads or leaves cover | the shot lands first, at +2 | **Precise:** a critical on 18–20. **Silent:** you stay Hidden. |

## 6. What happens to today's rules

1. **Heat: kept.** It is the price of Pressure. Press techniques cost +1 Heat, so a gunner chooses between pressing hard and jamming. Vent makes cooling a choice.
2. **Recoil: kept.** It is the reason a second Shot is worse than a Set.
3. **Range bands: kept.** Bead and Spot are the only things that bend them.
4. **Fire modes: folded in.** Burst, Rake and Mag Dump are the modes; the Auto property says who does them well. The mode switch goes.
5. **Aimed shot and Overwatch: kept,** as techniques 3 and 27. Overwatch stays as wide as it is today.
6. **Ammo types and magazines: kept as they are.** One type per magazine, speed and tactical reloads, dropped magazines in piles. Load Special adds a single round without a swap. A magazine's count gates two techniques (Mag Dump, Last Round) with nothing new to track.
7. **A dry gun is a club.** With no rounds and no spare, a gun counts as a Blunt melee weapon for Bash only. Today it falls back to fists.
8. **Brace and Emplace: kept,** and opened to any weapon on half cover.
9. **Suppressed (item 83): it becomes Pressure 3.** One status, not two. The Spray and Pray trait and the heavy mastery perk that set it now add Pressure.
10. **Weapon mastery: replaced by drill,** as for melee: an XP bar per weapon, filled by kills, faster for the martial classes. Its 30 passive perks fold into properties and techniques.
11. **Ready list:** 3 + half your Dexterity, separate from the melee list. Shot, Reload and Overwatch are free.

## 7. Bows, crossbows and thrown weapons

1. **Bows are Drawn and Silent.** No Heat, no Recoil, and any arrow type on every shot. They are poor at pressing (a quiet miss frightens nobody) and the best at Takes from Hidden: +2 Pressure when the target can't see who hit it, and the pips stay hidden. A strong archer is real: damage adds Raw Power.
2. **Crossbows are Precise and Silent, not Drawn.** The patient version: Bead, Aimed Shot, Dead to Rights.
3. **Explosive grenades are ammunition for Blast.** A grenade goes through Lob: a tile, no roll against Defense, your throwing range, +2 Pressure to everyone in the radius.
4. **Smoke, flashbangs and the bot-scrambler act on other people's fire.** Landing one on a shooter ends its Watches and its Bead, and smoke lets Pressure fall by 2 for anyone inside it. This is the squad's answer to being Suppressed, so a player always has one.
5. **Knives and hatchets** keep melee's Throw and Flurry. Thrown, they hit with Dexterity and give Pressure like any ranged hit.

## 8. A sword and a gun in one turn, classes, enemies

1. **The two meters don't convert.** A ranged technique never breaks a melee chain and never adds Momentum. A melee hit never adds Pressure.
2. **They help each other through the target.**
   - A Suppressed enemy has no reactions, so no Parry, Riposte or Keep Back: the gunner opens the door for the Fighter.
   - A melee Link that moves an enemy sets off a held Watch.
   - A Bash that knocks a target Prone makes it an easy Take.
3. **One Take and one Finisher** are both allowed in a turn.
4. **Swapping** is today's 1 AP a hand, unless you use Snap Shot or Draw Cut. A Quick weapon in the off hand needs no swap.
5. **Classes bend it; they don't own it.**

   | Class | Twist |
   |---|---|
   | **Marksman** | A Take lowers Pressure by 1, not 2. |
   | **Defender** | Ignores the first Pressure put on them each round. Head Down also covers an adjacent ally. |
   | **Infiltrator** | An unseen Silent hit gives +3. |
   | **Fighter** | Their Finisher counts a Suppressed target as one Momentum higher. |
   | **Bard** | Triage and Inspire also remove 1 Pressure. |
   | **Guardian** | Command may also end one ally's Pressed state. |

6. **Enemies use it from short lists:** two or three techniques a stat block (a line trooper: Suppress, Shift, Dead Centre; a sharpshooter: Bead, Aimed Shot, Dead to Rights). Their held Watches are drawn on the map so players can plan around them or break them.

## 9. What was rejected, and what is still weak

**Rejected designs:**

1. **The target (a bead built by patience).** It paid the gunner for standing still and shooting one enemy, which is already the best play, and it had five separate rules for losing the meter. Kept from it: the kill carry-over, hidden pips for Silent weapons, Dead to Rights, Last Round.
2. **The magazine (rounds as words, loaded in order).** The real decision moved to a loading screen before the fight, which four players can't afford, and a rifle with 24 rounds was still "Shot, Shot, Shot". Kept from it: rounds listed on every technique, the quiver, Mag Dump, the dry gun as a club.
3. **The line of fire (lanes drawn on the map).** A straight line on tiles is a Sigil Line: it stepped on the Sigils' ground, and it filled the map with lines. Kept from it: Watches with a trigger set in advance, the melee bridge, grenades that act on other people's fire.

**Still weak:**

1. **Pips on every token** are the most on-screen state of the five systems, even though it is one number each.
2. **It is thinnest at the ends.** Bosses stop at 2, and minions die before Pressure matters. The kill carry-over helps the second; the first needs bosses whose guards carry the Pressure game.
3. **Solo play loses the squad half.** Spot, Crossfire and Cover Me need allies. A solo gunner still has Suppress into a Take, which risks becoming a fixed rotation.
4. **Enemy Pressure on players** is softened (no AP loss, a cap of 3), but three machine guns can still take a party's reactions away. Smoke and Head Down are the answers; the Narrator's brief should say not to stack it.

## 10. Decisions for Leon

1. Pressure as what ranged owns: a meter on the target, built by the squad, used by Takes?
2. The softer table for players (Suppressed costs reactions, never AP; players stop at 3)?
3. Fire modes folded into techniques (Burst, Rake, Mag Dump), with the mode switch gone?
4. Bows as a quiver: any arrow type on every shot?
5. A dry gun usable as a club for Bash?
6. All 30, as with melee?
7. One ready list per system (melee and ranged separate), or one shared list for a character who uses both?
