# Proposal: melee techniques (Forms)

Status: **direction accepted by Leon, 10 Nov 2026** (his answers are section 10; where they change sections 2, 4 and 5, section 10 wins until the text is rewritten for the build). Nothing here is built. Every number is a placeholder for the balance pass; what matters now is what each piece does and how the pieces combine.

**The aim (Leon, 10 Nov 2026).** Anyone can pick up any melee weapon and mix and match every melee technique they know, with the variety Sigils and Outbursts have. Weapon fantasy should come from the weapon, not from a class per weapon, because the classes are "shapeless".

**The idea in four lines.**

1. **Melee owns the sequence.** Sigils own space, Outbursts own time, faith owns a relationship. A melee turn is a chain: open, strike, link, finish.
2. **Techniques are the words.** Small pieces anyone can learn and use with any melee weapon.
3. **Weapons are the grammar.** Each weapon has two or three properties (Edge, Point, Blunt, Hook, Reach, Heavy, Light, Bare), and every technique reads them. The same technique does something different in a different hand.
4. **Momentum is the meter,** for every melee fighter, not just the Fighter.

## 1. The chain

1. **Momentum** runs 0 to 3 for everyone (the Fighter's cap is 5, section 6). It starts each fight at 0.
2. **You gain 1 Momentum for each melee technique that hits.** You gain 1 more when it is a different technique from the last one you used this turn. Repeating yourself is allowed; it just builds slower.
3. **You lose all Momentum** when you end a turn without using a melee technique (today's rule), unless you ended it in Guard (technique 16).
4. **Five kinds of technique:**

   | Kind | When | What it is for |
   |---|---|---|
   | **Opener** | only as your first melee technique of the turn | getting in, setting up |
   | **Strike** | any time | the body of the chain: damage and riders |
   | **Link** | any time; 1 AP; never deals damage | moving yourself or the enemy without breaking the chain |
   | **Finisher** | needs Momentum 2 or more, spends all of it, and is your last melee technique of the turn | the payoff |
   | **Answer** | a reaction, on the enemy's turn | defence that feeds the next chain |

5. **Cost.** A Strike, Opener or Finisher costs the weapon's own attack AP (2 for a Light weapon, 3 for a Heavy one) plus the technique's adjustment, shown as "+0", "+1" or "−1". A Link is always 1 AP.
6. **One rule for the dice.** Every technique that attacks rolls d20 + the weapon's `hits_with` skill against Defense, and its damage scales with the weapon's `scales_with` (section 5). The card shows both.

So a three-turn fight with a sabre might be: **Lunge** in (Opener), **Cut** (Strike), **Sidestep** behind (Link); next turn **Feint**, **Flurry**, then **Coup** at Momentum 3. With a maul the same player would open with **Charge**, **Bash** the target Prone, and **Break** it.

## 2. Weapon properties

A weapon has two or three. They replace most of today's one-per-weapon weapon skills, which mostly turn out to be a property already.

| Property | Means | Typical rider |
|---|---|---|
| **Edge** | it cuts | Bleeding |
| **Point** | it thrusts | to-hit, armour ignored, pinning |
| **Blunt** | it crushes | Prone, Dazed, armour broken |
| **Hook** | it catches (a beard, a spike, a guard) | pull, trip, disarm |
| **Reach** | it strikes 2 tiles away | first strike, keeping enemies out |
| **Heavy** | mass, two hands or a strong arm; 3 AP base | knockback, hitting several |
| **Light** | fast; 2 AP base | extra steps, extra strikes |
| **Bare** | a fist or a glove | grapples and throws |
| **Thrown** | it can leave the hand | the technique at range, then the weapon is on the ground |

**The melee weapons in `weapons.json`, with properties and what happens to today's weapon skill:**

| Weapon | Properties | Today's weapon skill | Under this proposal |
|---|---|---|---|
| Combat knife | Light, Edge, Point, Thrown | Finish It | the knife teaches **Coup** |
| Throwing knives | Light, Point, Thrown | Fan of Knives | teaches **Flurry** (thrown: two targets) |
| Hatchet | Light, Edge, Hook, Thrown | Splitter | a Hook rider (double damage to shields and cover) |
| Sabre | Light, Edge | Riposte | teaches **Riposte** |
| Legion gladius | Light, Point, Edge | Shield Partner | teaches **Parry** (+1 Defense with a shield stays on the item) |
| Kemizuchi duelling blade | Light, Point | Lunge | teaches **Lunge** |
| Ork machete | Heavy, Edge (one hand) | Chop Through | teaches **Cleave** |
| War axe | Heavy, Edge, Hook | Bite the Plate | teaches **Sunder** |
| Adamantile greatsword | Heavy, Edge, Point | Sweep | teaches **Sweep** |
| Maul | Heavy, Blunt | Knockdown | Blunt's own rider; teaches **Break** |
| Ork rip-saw | Heavy, Edge | Rip | Edge's own rider (Bleeding on every hit, not only crits) |
| Lance | Heavy, Point, Reach | Charge | teaches **Charge** |
| Glaive | Heavy, Edge, Hook, Reach | Keep Back | teaches **Keep Back** |
| Gloves or bare fists | Light, Bare | Grapple | teaches **Bind** |
| Knuckledusters | Light, Bare, Blunt | Rabbit Punch | teaches **Flurry** |
| Hellraiser servo-fist | Heavy, Bare, Blunt | Haymaker | Heavy's own rider on Bash; teaches **Throw Down** |
| Evoker blade | Light, Edge + Evoker | Edge Word | stays (it is the bridge to Sigils) |
| Emanator gauntlet | Light, Bare, Blunt + Emanator | Charged Strike | stays (the bridge to Outbursts) |
| Bot-thread banner | Reach, Blunt + banner | Rally | stays |
| Grand staff | Heavy, Blunt, Reach + Evoker | Staff Evoker | stays |

"Teaches" means the weapon's signature: using it is the fastest way to learn that technique (section 4). Once learned, you can use the technique with any weapon.

## 3. The techniques

27 to start. Each has a base effect that works with **any** melee weapon, and lines that change it by property. Where a weapon has two matching properties, the player picks one when they use the technique.

### Openers (first melee technique of your turn)

| # | Technique | AP | Base | With the right weapon |
|---|---|---|---|---|
| 1 | **Lunge** | +0 | Step 1 tile toward the target, then strike. The step draws no opportunity attack. | **Point:** +2 to hit. **Reach:** the step may be 2 tiles. **Heavy:** on a hit the target is pushed 1 tile. |
| 2 | **Charge** | +0 | After moving 3 or more tiles in a straight line this turn: strike at +10% damage per tile moved, up to +50%. | **Point:** ignores 5 armour. **Blunt or Heavy:** the target makes a Body save or falls Prone. **Reach:** you strike before it can take its Overwatch or Keep Back. |
| 3 | **Feint** | 1 AP flat | No damage. The target makes a Brain save against your Brain debuff strength. If it fails, your next technique against it this turn has +3 to hit and it can't use an Answer. Counts as a hit for Momentum when it works. | **Light:** the save is at −2. **Hook:** on a failed save its weapon is also lowered (1 AP to raise). |
| 4 | **Draw Cut** | −1 | Draw this weapon from the pack or a sheath and strike in one action. Only if you started the turn with it stowed. | **Edge:** Bleeding on a hit. **Light:** if the target hasn't acted this fight, it counts as an ambush. |
| 5 | **Ambush** | +0 | Only from Hidden: strike with the Ambush multiplier (today's rule), and gain 2 Momentum instead of 1. | **Point:** crits on 18–20. **Bare:** no damage, the target is Grappled and Silenced for 1 round instead. |

### Strikes

| # | Technique | AP | Base | With the right weapon |
|---|---|---|---|---|
| 6 | **Cut** (the plain attack) | +0 | One strike. Everyone knows it; it never takes a ready slot. | **Edge:** a critical leaves Bleeding. **Point:** +1 to hit. **Blunt:** a critical leaves Dazed. |
| 7 | **Sweep** | +1 | Strike up to 3 enemies in an arc in front of you, each at ×0.7, one roll each. | **Reach:** the arc is 2 tiles out. **Heavy:** all adjacent enemies, not just the arc. **Edge:** each one hit bleeds on a critical. Friendly fire applies. |
| 8 | **Bash** | +0 | Strike at ×0.5 with the pommel, haft or fist. The target makes a Body save or is Dazed. | **Blunt:** full damage. **Heavy:** on a failed save it is pushed 2 tiles instead of Dazed, your choice. **Bare:** costs 1 AP less. |
| 9 | **Sunder** | +0 | Strike at ×0.7. On a hit the target's armour is 5 lower for the rest of the fight (once per target per attacker). | **Blunt or Hook:** 10 lower. **Edge:** if the target has no armour left, Bleeding instead. |
| 10 | **Flurry** | +1 | Two strikes at ×0.6 at one target, the second at −1 to hit. Momentum for each that hits. | **Light:** three strikes. **Bare:** each hit after the first adds +1 to the next Bind or Throw Down this turn. **Thrown:** the strikes may go to two targets in throwing range; the weapons land in the pile on their tiles. |
| 11 | **Hamstring** | +0 | Strike at ×0.7. The target makes a Body save or is Slowed 2 rounds. | **Edge:** no save. **Hook:** Prone instead of Slowed. **Point:** it also can't Sprint or Disengage while Slowed. |
| 12 | **Bind** | +0 | No damage. Lock the target's weapon with yours: until your next turn it attacks anyone but you at −2 and can't move away without a Body save. You can't use Reach while binding. | **Hook:** Brain save or it is Disarmed. **Bare:** it is Grappled (today's grapple rules). **Heavy:** the −2 becomes −4. |
| 13 | **Half-Sword** | +0 | A short, driven thrust: ×0.8 damage, ignores 10 armour. | **Point:** ignores all armour. **Heavy:** full damage. **Bare or Blunt:** not available (greyed, with the reason). |
| 14 | **Throw** | +0 | Throw the weapon at a target in throwing range (Dexterity to hit). It lands in the pile on the target's tile. | **Thrown:** no penalty and full damage. Without Thrown: −2 to hit, ×0.7. **Heavy:** the target makes a Body save or is knocked Prone. |

### Links (1 AP, no damage, never break the chain)

| # | Technique | Base | With the right weapon |
|---|---|---|---|
| 15 | **Sidestep** | Move 1 tile to another tile next to the same enemy. No opportunity attack. Your next Strike against it this turn ignores a carried shield and counts as flanking. | **Light:** 2 tiles. |
| 16 | **Guard** | +2 Defense against melee until your next turn, and your Momentum doesn't drop at the end of this turn. | **Reach:** enemies must make a Body save to step next to you. **Heavy:** the +2 also applies to ranged attacks from the front. |
| 17 | **Shove** | Today's Shove (push 1 tile, or Prone if blocked), at 1 AP as a Link. It gives Momentum when it works. | **Blunt or Heavy:** 2 tiles. **Reach:** from 2 tiles away. |
| 18 | **Trip** | The target makes a Body save or falls Prone. | **Hook or Reach:** the save is at −2. **Bare:** you may go Prone with it and it is Grappled. |
| 19 | **Drag** | Pull an adjacent or reached target 1 tile toward you, or swap tiles with it (Body save). | **Hook:** 2 tiles, and from 2 tiles away with Reach. **Bare:** you may move 1 tile and bring it with you. |

### Finishers (Momentum 2 or more; spend all of it; last melee technique of your turn)

| # | Technique | AP | Base | With the right weapon |
|---|---|---|---|---|
| 20 | **Coup** | +0 | One strike at +25% damage per Momentum spent. (This is the Fighter's Finisher, opened to everyone; see section 6.) | **Edge:** +50% more against a target that is Bleeding, Dazed, Prone or Downed. **Point:** a hit is a critical if the target is at a quarter HP or less. |
| 21 | **Cleave** | +0 | One strike; then the same strike at one more adjacent enemy per Momentum spent, each at full damage. | **Heavy:** the extra targets may be 2 tiles apart. **Edge:** every target hit bleeds. |
| 22 | **Break** | +0 | One strike. The target makes a Body save at −1 per Momentum spent or is Stunned (bosses: Dazed). | **Blunt:** its armour is also 0 for a round. **Hook:** it is Disarmed as well. |
| 23 | **Run Through** | +0 | One strike at +20% per Momentum spent. On a hit the target is Pinned where it stands until it spends 2 AP to pull free. | **Point:** ignores armour, and if a second enemy stands directly behind the first it is struck at half. **Reach:** you may leave the weapon in (you are unarmed; the target stays Pinned until someone pulls it out for 2 AP). Without Point: −2 to hit. |
| 24 | **Throw Down** | +0 | Only on a target you have Grappled or Bound: slam it into a tile next to you. Damage ×1 + 25% per Momentum, Prone, and the grapple ends. Anyone on that tile is struck at half and must save or fall Prone. | **Bare:** no roll needed. **Heavy:** you may throw it 2 tiles. |

### Answers (your reaction)

| # | Technique | Trigger | Base | With the right weapon |
|---|---|---|---|---|
| 25 | **Parry** | a melee attack hits you | Roll your attack skill against the attacker's total. If you win, the hit is halved. | **Light:** and you gain 1 Momentum. **Heavy:** you may parry for an adjacent ally. A shield in the off hand adds +2. |
| 26 | **Riposte** | a melee attack misses you | Strike back for 0 AP (today's Sabre skill and Fighter move). | **Edge or Point:** +2 to hit. |
| 27 | **Keep Back** | an enemy steps into your reach | Strike it first. If you hit, it makes a Body save or stops where it is. | **Reach:** your reach is 2 tiles, so most enemies never arrive. **Hook:** on a failed save it is also Prone. |

## 4. Knowing and learning

1. **Anyone with 1 point in Raw Power or Athletics has techniques.** No class is needed.
2. **You start knowing Cut and two others of your choice.** One of the two must be an Opener, so nobody starts with nothing to do on turn 1.
3. **Ready techniques.** You fight with the ones you have ready: **3 + half your attack skill, rounded down** (Raw Power or Athletics, whichever is higher), plus Cut for free. You change the ready list out of combat. This is the cap that Brain Power is for words and Empathy is for designs.
4. **Drill, earned by use.** Every melee technique that hits earns 1 drill; a Finisher earns 1 more per Momentum spent. At 5 drill you pick a new technique, at 15 the second, then every 15. These are Outburst practice's thresholds on purpose: one clock to learn, three places it runs.
5. **Signatures.** Ten hits with a weapon teach you that weapon's signature technique (the table in section 2), without spending a pick. That is how a weapon feels like itself from the first session, and why picking up an enemy's glaive is interesting.
6. **Teachers and manuals** work as tutors and plates do for magic: one technique, placed by the Narrator.
7. **Weapon mastery (the kill counts) is replaced by this.** Its 30 passive perks fold into the properties and techniques above; most already match one (Follow Through is Heavy's rider, Open Vein is Edge's, Clinch is Bare's Bind).

## 5. Dice clarity: `hits_with` and `scales_with`

Testers can't tell what a melee, Sigil or Soul attack rolls. The rule, stated once for every attack in the game:

> **You hit with a skill. Damage scales with that skill and its Attribute.**

Each weapon gets two fields, and the card prints them.

| Weapon kind | `hits_with` | `scales_with` | Today |
|---|---|---|---|
| Heavy melee, Bare | Raw Power | Strength | same |
| Light melee | Athletics | Agility | hits with Athletics, scales with Strength |
| Guns, bows, thrown | Dexterity | Agility | hits with Dexterity, scales with Strength |
| Sigils | Brain Power | Intelligence | same |
| Outbursts | Will Power | Determination | same |

A weapon that is both **Light and Heavy-capable** in the fiction (the Ork machete, one-handed but heavy) just names its fields. A technique never changes them, with one exception: **Throw** always hits with Dexterity.

On the card: "**Lunge** · 2 AP · Hit: Athletics +4 against Defense 12 (65%) · Damage: 24, Agility and Athletics ×1.5 = 36 · Point: +2 to hit".

One thing to fix in the data while adding the fields: the spec says heavy melee costs 3 AP an attack, but five of the Weapons v2 heavy weapons (war axe, greatsword, glaive, rip-saw, servo-fist) carry 2 AP in `weapons.json`.

## 6. Where the classes come in

Techniques are for everyone. A class bends the chain; it doesn't own the list.

| Class | Twist |
|---|---|
| **Fighter** | Momentum cap 5 instead of 3. Today's Lunge, Riposte and Finisher moves become: Lunge and Riposte cost no ready slot, and Coup keeps +20% per point up to 5. Rank III: one Finisher a fight doesn't end the chain. |
| **Marksman** (if it becomes Agility's class for blades as well as guns) | One free Link a turn. |
| **Defender** | A second reaction each round, for Answers only. Guard also protects an adjacent ally. |
| **Infiltrator** | Ambush doesn't reveal you if the target goes down. Feint can be made from Hidden. |
| **Channeler, Bard, Guardian, Mage, Trickster** | Nothing special; they can still learn and use techniques with whatever they carry. |
| Advanced, later | Berserker (Strength²): every Strike may be repeated without losing the variety bonus. Blade Scribe: each kind of technique draws a glyph of a set group. Storm Hand: a held Outburst's tone rides every Strike. Banner Dancer: Links move allies as well. These are examples of how an advanced class gets a shape: it changes one rule of the chain. |

**The monk and the thief.** A monk is anyone using Bare techniques (Bind, Trip, Throw Down, Flurry); if Bare weapons hit with Athletics as well as Raw Power (the better one), the agile monk works without a new class. A thief is an Infiltrator with a knife: Ambush, Hamstring, Coup.

## 7. What a turn looks like on screen

0. **Superseded in part** (Leon, 10 Nov 2026): techniques don't sit flat in the Attack tab. Each held weapon gets one row with its plain attack and one expandable **Techniques** action that opens a pad, as the glyph keyboard does. The full layout is in `2026-11-ranged-techniques.md`, section 10; the points below describe what is inside the pad.
1. The Attack tab shows your ready techniques as chips, grouped Opener, Strike, Link, Finisher. A chip you can't use is greyed with the reason: "not your first technique", "needs Momentum 2", "needs Point", "the chain has ended".
2. Each chip shows the property line that applies with the weapon in your hand, so the same chip reads differently when you swap weapons.
3. Momentum sits under the HP bar as pips for every melee character, with the variety bonus shown as "+1 if different".
4. The preview shows the hit chance, the damage after `scales_with`, the save and TN for any rider, and where a push, pull or throw would leave the target, as Sigil previews do.

## 8. What I'm unsure about

1. **27 may be too many to ship at once.** A first cut of 13 would still show the system: Lunge, Charge, Feint; Cut, Sweep, Bash, Flurry; Sidestep, Guard, Trip; Coup, Break; plus Parry.
2. **Momentum at 3 for everyone** may make Finishers come every second turn. That is a number for the pass; the structure doesn't depend on it.
3. **Friendly fire on Sweep and Cleave** follows Sigils (bursts hit allies). Say if melee should be exempt.
4. **Enemies.** They should use techniques too, from a short list per stat block, or melee will only be interesting on the players' side. This is also the cheapest way to make enemy types feel different.

## 9. Decisions for Leon

1. The chain (Opener, Strike, Link, Finisher, Answer) with Momentum for everyone: yes or no?
2. Properties on weapons replacing one weapon skill per weapon, with the weapon teaching a signature technique instead?
3. Drill replacing weapon mastery by kills? (If yes, do guns keep kill counts until they get their own tools, or move to hits now?)
4. `hits_with` and `scales_with`, with damage following the Attribute the weapon is aimed with?
5. Does Bare hit with the better of Raw Power and Athletics?
6. Start with the 13 in section 8, or all 27?

## 10. Leon's answers (10 Nov 2026)

1. **The chain and Momentum for everyone: yes.**
2. **Properties on weapons, and signatures as cards: yes.** A weapon's special technique is like a perk card you keep once learned and slot into the weapon you hold. If you like a weapon's technique but not the weapon, learn it, then switch. The most particular techniques (a sword wave, an area slam, an elemental weapon) work a bit worse on a weapon of the wrong class. So each signature names its home weapon class, and off it takes a penalty (the size is for the pass).
3. **Drill is an XP bar per weapon,** and it replaces section 4, points 4 and 5:
   - it fills by **kills**, by the same amount as the XP that kill gives, and you get it if you dealt at least 1 damage to the target with that weapon; hitting alone gives nothing;
   - it is a grind on purpose for anyone who isn't a martial class: about two hours of solid fighting for one signature;
   - the martial classes learn much faster (a multiplier on drill, by class; the number is for the pass).
4. **`hits_with` and `scales_with`, with damage following the Attribute a weapon is aimed with: yes.**
5. **Bare:** a low base damage that scales with **both** Raw Power and Athletics. Later, advanced monk classes add a Soul or Mind skill to the damage as well.
6. **All 27 techniques,** not the first cut of 13.

Next: the ranged weapons (`2026-11-ranged-techniques.md`).
