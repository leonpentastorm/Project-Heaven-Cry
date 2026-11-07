# Sigil magic: the complete system (proposal)

The full version of the revamp (7 Nov 2026). It keeps everything agreed in *Sigil-Revamp-Draft.md* and adds the kinds of
magic that were missing: movement, buffs, control, terrain, dispel, stealth and life drain. **Every word works by the
general rules; no word needs special rules of its own.** Summons, reactions and blood magic are left to other systems
(section 8). **Nothing is built yet; every new number is provisional.** Simulator for the Line rules:
https://claude.ai/artifact/5qRNfmHHYouVCfk5QxjrDM.

---

## 1. The idea

Sigils are **commands to the bots in the air** (in the world, nanobots are mana). Each glyph is one command word, and a
spell is the sentence the glyphs make together. Every word answers one question:

| Question | Group | How many |
|---|---|---|
| **What happens to the target?** | **Subjects**: Elements, Afflictions, Boons, Workings | 25 (the 16 of today, unchanged, + 9) |
| **Where may I pick the target?** | **Reach** | 4 |
| **What flies out, how does it act, what happens after?** | **Delivery** | 7 |
| **What does it cover where it lands?** | **Burst** | 3 |
| **Who may it affect?** | **Filter** | 1 |

**40 words.** That's a lot, but no caster knows them all: you know at most **4 + Brain Power** words, learned one long
rest at a time from tutors, Sigil plates or allies (as today). So every Sigil user is a specialist, and two casters
play differently.

**Grammar:** a spell needs **at least 1 Subject and at least 1 other word**. Each word costs its **charge** to draw
(a standard mana core holds 10), and firing costs **1 charge per glyph**. Each glyph adds **1 Flux** (the Evoker
overloads above 6).

**A spell holds at most 4 glyphs** (4 words, repeats included), whatever the shape. Below that, your **Max Sigil
words** (2 + (Intelligence − 1) ÷ 2, rounded down) limits you: 2 at Intelligence 1–2, 3 at 3–4, 4 from 5. Above
Intelligence 5 it no longer grows a spell, but it still sets **how many glyphs you can have on the ground at once**
(drawing one more fades your oldest), so a high-Intelligence caster keeps more patterns and traps ready.

### Drawing a spell

- **You draw a glyph only on the tile you stand on** (no longer on a tile next to you). It costs Glyph AP, the word's
  charge and 1 Flux, with an Evoker in hand.
- **One glyph per tile.** A tile that holds any glyph (yours, an ally's or an enemy's) takes no other, unless a perk,
  trait or skill lets that caster put a second glyph there. None does yet: this is the hook for one.
- **The only shape is the Line:** 2 to 4 glyphs on neighbouring tiles in one straight row, **horizontal, vertical or
  diagonal**. Anything else (a bend, an L, a cluster) is no shape and can't be Evoked. **The Ring is gone.**
- **So you walk a spell:** draw, step, draw. A 4-word spell is a Line of 4 tiles: 3 steps, 4 glyphs, then Evoke. At
  Agility 1 and Expression 1 that's 3 + 4 + 1 = 8 AP, more than one turn's 6, so you finish it next turn (glyphs last
  2 rounds + the duration bonus). A Line can't cross a tile you can't stand on (walls, cover), and walking it can draw
  Overwatch.
- **When you finish, you stand on the last glyph you drew**, an end of the Line, so by the facing rule (section 3) the
  spell runs along the Line, past the first glyph: back the way you came. To fire across the Line, step off to its
  side first (decision 7).
- **With a two-glyph perk:** two glyphs on one tile on their own are a **Stack**; on a tile of a Line, both count as
  words of that Line. A spell still holds at most 4 glyphs.

---

## 2. Subjects: what happens

The 16 Subjects of today are **unchanged**. New ones are marked *(new)*.

### Elements: damage

| Word | Effect | Charge |
|---|---|---|
| FIRE | 30, Elemental; a critical sets Burning | 2 |
| FREEZE | 25, Elemental; Slowed (Body save) | 2 |
| SHOCK | 30, Elemental; ignores half cover | 2 |
| STONE | 35, Sigil (armour applies) | 2 |
| GALE | 15, Sigil; pushes the target 2 tiles | 1 |
| SPARK | 15, Elemental; the cheapest attack | 1 |
| **ACID** *(new)* | 15, then **5 a round for 3 rounds**; the target's Defense −2 while it burns (Body save ends it early) | 2 |

### Afflictions: debuffs and control

| Word | Effect | Charge |
|---|---|---|
| BIND | Pinned (Body save) | 2 |
| BLIND | Blinded (Body save) | 1 |
| SLOW | Slowed (Body save) | 1 |
| MUDDLE | Left Brain Debuff (Brain save) | 2 |
| DREAD | Shaken (Heart save) | 2 |
| SILENCE | No Sigils, Outbursts or prayers for 1 round (Brain save) | 2 |
| **COMMAND** *(new)* | **Brain save or obey one order on its next turn:** halt, kneel, drop its weapon, or move up to 3 tiles where you choose. Uses the engine's existing Commanded condition | 3 |

### Boons: support

| Word | Effect | Charge |
|---|---|---|
| WARD | A shield of 30 until the end of the fight | 2 |
| MEND | Heals 25 | 3 |
| **QUICKEN** *(new)* | **+2 AP on the target's next turn** (within the AP ceiling of 9) | 3 |
| **SHARPEN** *(new)* | The target's **next attack: +3 to hit and ×1.25 damage** | 2 |
| **CLEANSE** *(new)* | Ends **one condition** on the target, the newest first | 2 |

### Workings: the world

| Word | Effect | Charge |
|---|---|---|
| VEIL | Smoke in radius 1 around the target: blocks sight | 2 |
| LIGHT | Lights radius 4 for the scene; reveals the Hidden in it | 1 |
| **STEP** *(new)* | **Teleport:** whoever it affects moves to a free tile you pick, up to 4 tiles away, past anything in between. On an enemy: Body save resists. On yourself, it's a **blink** | 2 |
| **RAISE** *(new)* | **A solid barrier** on each empty tile it covers: blocks movement and sight, 30 HP a tile, 3 rounds (+ duration bonus) | 3 |
| **NULL** *(new)* | **Dispel:** removes glyphs, fields, traps and turrets on the tiles it covers | 3 |
| **MASK** *(new)* | The target is **Hidden** until it attacks, or for 2 rounds | 2 |

---

## 3. Reach: where you may pick the target

With **no Reach word**, a spell is **Touch**. The facing rule (below) sets its area like any other spell's, but only
**1 tile deep**: the row of tiles touching the Line on its far side from you, or the tiles just past its far end.
**You can also always target yourself** (your own tile), to heal, shield, blink or hide yourself, or to centre a burst
on yourself (decision 9). Nothing flies, so nothing blocks it. The Sigil range bonus (+0.5 tile per Rumination point, rounded down,
+ Rumination's perk) adds **once** to SEEK, ARC, SENSE and RELAY, and never to Touch.

| Word | Missile | Range | With FIRE | Trade-off | Charge | Each extra copy |
|---|---|---|---|---|---|---|
| **SEEK** | Bolt, straight | 8 | 30 to the target; the first creature or full cover in the way takes it | Can be blocked; needs sight | 2 | +4 range |
| **ARC** | Lob, over everything | 6 | 24 (×0.8); nothing blocks it | Shorter, weaker | 2 | +3 range |
| **SENSE** | Appears at the target | 8 | 18 (×0.6) to a target you can't see | Weakest | 3 | +4 range |
| **RELAY** | Cast from an ally's tile | Ally within 8, in sight | 30 to a creature next to that ally (the spell works as if you stood where they stand) | Needs an ally in place | 2 | Through one more ally |

**One Reach word per spell** (you may repeat it for more range). A second, different Reach word is refused when drawn.
A spell aimed at your own tile with a Burst covers you too: add KIN to keep yourself and your allies out of it.

### The facing rule (where the area points)

- You fire **away from yourself**.
- **On a Line:** stand **within 1 tile of any glyph** (a middle glyph is refused). **On an end glyph**, or next to an
  end, beyond the line: the area runs **along the line**, past the far end. Next to the glyphs from the side: it runs **straight across**, away
  from you, covering **the whole line**. The area is as wide as the line (one tile per glyph) and as deep as the
  range (1 tile for Touch). Example: a Line on N15–Q15, standing on Q14: with SEEK, pick any target in N16–Q23; with no
  Reach word (Touch), only in N16–Q16.
- **On a Stack** (only with a perk that allows two glyphs on a tile): all around you, out to the range, in sight.

---

## 4. Delivery: what flies out and how it acts

Resolved in this order: **how many → how it travels → what it covers → what happens after → what stays.**

| Word | 1 copy | Each extra copy | Charge |
|---|---|---|---|
| **STAY** | **Field:** stands where you aimed, 2 rounds (+ duration bonus), ×0.5 to whoever enters or starts a turn in it | +2 rounds | 1 |
| **TWICE** | **2 missiles** at 2 targets you pick, each with its own burst; +1 Flux | +1 missile, +1 Flux | 3 |
| **PULL** | After the hit, drags the target **3 tiles toward you** | +3 tiles | 1 |
| **WAIT** | **Trap:** set on a tile, hidden from enemies (they can spot it), goes off once when an enemy steps on or starts a turn on it; 3 rounds (+ duration bonus); allies never set it off | Goes off once more | 2 |
| **WATCH** | **Turret:** a sentry on a tile casts the spell at the nearest creature it can reach (allies too; add KIN to keep your side out) at the start of each of your turns, 2 rounds (+ duration bonus), ×0.5; 10 HP, can be scuffed | +2 rounds | 3 |
| **CHAIN** | After the hit, **jumps forward** to the next creature within 3 tiles (allies too; add KIN to keep your side out) that is no closer to the caster (or the turret), ×0.75 of the last hit; never back to one it hit; jumps can't be blocked | +1 jump | 2 |
| **LEECH** *(new)* | **Life drain:** after the hit, you heal **half the damage** the spell dealt, in all | +25% | 2 |

**Mixes** follow from the words, with no extra rules: STAY + PULL is a *whirlpool* (the field drags everyone in it
toward you each round) · STAY + TWICE, two fields · WAIT + STAY, a hidden field that appears when stepped on ·
WAIT + TWICE, two traps · WAIT + WATCH, a hidden turret · WATCH + TWICE, two shots a round · WATCH + CHAIN, the
*Tesla tower* · CHAIN + LEECH, you heal from every jump. WATCH + STAY is refused (a turret already lasts).

**Limits:** at most **2 traps and 1 turret** per caster; another one removes your oldest.

---

## 5. Burst: what it covers

| Word | 1 copy | Each extra copy | Charge |
|---|---|---|---|
| *(none)* | The one target, ×1 | | |
| **CONDENSE** | One target, **×1.5** | +0.5 | 1 |
| **SPREAD** | Everyone within **2 tiles** of where it lands (5 × 5), ×0.6; it can land on empty ground | +1 radius, −0.1 | 2 |
| **PUSH** | **Cone:** from where it lands, carrying on the way it flew, 3 tiles long and widening, ×0.7; it can land on empty ground; it fans out in the facing direction, away from you (refused on your own tile) | +2 length, −0.1 | 1 |

**Mixes:** CONDENSE + SPREAD *core and splash* (×1.5 on the landing tile, ×0.6 around) · CONDENSE + PUSH (×1.5 on the
first tile, ×0.7 in the cone) · SPREAD + PUSH (the radius and the cone; anyone in both is hit once).

**With the Workings:** a Burst just widens what a Working covers: RAISE walls every empty tile in it (SPREAD: a 5 × 5
block; PUSH: a fan of wall), NULL cleans the whole area, and STEP moves everyone caught the same way and the same
distance (you pick one tile; everyone shifts alike).

---

## 6. Filter: KIN

**KIN** (charge 2, one copy): **your side is never affected.** You and your allies can't be picked and nothing in the
spell touches you. It works the same for every Subject, so it **backfires** on Boons (MEND · RELAY · KIN can only heal
an enemy). "Your side" is whoever Evokes it. It changes who the spell affects, **not how it flies**: an ally in a SEEK
bolt's way still stops it, and the bolt **fizzles**. A **fizzle** means the spell goes off but finds nothing it may
affect: nothing happens, and the charge, AP and Flux are still spent.

---

## 7. What you can make

| Fantasy magic | Pattern | Result |
|---|---|---|
| Firebolt | FIRE · SEEK | 30 at up to 8, blockable |
| Fireball | FIRE · SEEK · SPREAD | 18 to everyone within 2 of a tile up to 8 away |
| Grenade | FIRE · ARC · SPREAD | 14 to everyone within 2, lobbed over cover |
| Shotgun | FIRE · PUSH | From the tile touching your Line on the far side, a cone fans out away from you, 21 each |
| Nova | FIRE · SPREAD · KIN, on your own tile | 18 to every enemy within 2 of you; you and your allies are spared by KIN |
| Burning ground | FIRE · STAY · SPREAD · KIN, on your own tile | A burning 5 × 5 field around where you stand, harmless to your side |
| Wall of fire | FIRE · ARC · STAY · SPREAD | A 5 × 5 burning patch, 2 rounds |
| Chain lightning | SHOCK · SEEK · CHAIN · CHAIN | 30 → 23 → 17 along a line of enemies |
| Tesla tower | SHOCK · SEEK · WATCH · CHAIN | 15 then 11 to the nearest creatures within 8, each round for 2 rounds; it zaps allies too, so place it away from your squad |
| Safe Tesla post | SHOCK · WATCH · CHAIN · KIN | Zaps enemies next to it (15), then chains forward (11); never your side |
| Heaviest single hit | FIRE · CONDENSE ×3 | 75 to a creature next to you (150 on a critical): the most one spell can do |
| Fire mine | FIRE · WAIT · SPREAD | Hidden; 18 to everyone within 2 when stepped on |
| Snare | BIND · WAIT · PULL | Pinned and dragged toward you |
| Acid rain | ACID · ARC · STAY · SPREAD | 5 × 5 field that corrodes everyone in it |
| Blink | STEP, on yourself | You jump to a tile within 4 |
| Swap a friend to safety | STEP · RELAY | An ally next to your relay jumps 4 tiles |
| Haste | QUICKEN · RELAY | +2 AP for an ally |
| Bless the squad | SHARPEN · SPREAD, on your own tile | You and everyone within 2 of you get the bonus on your next attacks, enemies standing there too (never add KIN: it would bless only the enemies) |
| Cleanse | CLEANSE · SEEK | Ends one condition on someone up to 8 away |
| Charm | COMMAND · SEEK | An enemy halts, kneels, drops its weapon or walks where you say |
| Stone wall | RAISE · SEEK · PUSH | A fan of wall across a corridor |
| Fortress | RAISE · SPREAD, on your own tile | Walls on every empty tile within 2 of you (your own tile is taken, so it stays open) |
| Dispel | NULL · SEEK · SPREAD | Wipes every glyph, field, trap and turret within 2 of a tile |
| Invisibility | MASK, on yourself | You're Hidden for 2 rounds |
| Vampiric bolt | FIRE · SEEK · LEECH | 30 to the target, you heal 15 |
| Healing post | MEND · WATCH | Heals whoever is nearest it 12 a round: stand next to it |

---

## 8. Left out on purpose

These belong to other systems, so Sigils stay "commands to the bots in a fight":

| Magic | Where it lives instead |
|---|---|
| Resurrection, raising the dead | Prayer and miracles (patrons), the Medic; in the lore, kills already spawn bots |
| Time magic (slow time, rewind, extra turns) | Ultimate perks and miracles: too strong for a glyph |
| Divination, scrying, far-speech | The Narrator, with LIGHT and SENSE as the combat side |
| Weather, rituals, large-scale magic | The Narrator and the mana meter |
| Shapechanging and inner power | Soul magic (Outbursts) and classes |
| Summons that move and fight | Classes and perks (the Vessel's twin, the Beast Handler's beast, drones) |
| Reactions and counterspells | Perks and class moves (Overwatch, Riposte and the like) |
| Blood magic (paying with your body) | Soul magic: the heart, MP and Strain are its identity; Sigils run on cores |
| Enchanting gear | The gear and crafting system |

---

## 9. What the player must see

**Every Sigil spell shows everything it will do before it is Evoked, and everything it is doing while it lasts.** No
rule the player can't see decides a Sigil spell. Each colour on screen is paired with a word or glyph
(docs/design/colour-system.md).

| When | The screen shows |
|---|---|
| **Before drawing** | The tile you'll draw on (yours), the word's cost, and whether this glyph extends a Line, starts a new one, or breaks a shape (a bend) |
| **While building** | The pattern's words in order and its shape; whether it's a valid spell yet ("needs a Subject"); glyphs left before your cap; charge, AP and Flux now and after Evoke; an overload warning |
| **Where to stand** | The tiles you can Evoke from, each with the direction its area opens; refused tiles say why (a middle glyph, too far) |
| **Targeting** | The area you may pick from, tinted; out-of-reach tiles dimmed |
| **Delivery** (on hover) | A bolt's path and the tile where it would be stopped; a lob's arc; where SENSE appears; RELAY's hop; every TWICE missile; CHAIN's jumps in their order, each with its multiplier; where PULL and STEP would leave a creature |
| **Burst** (on hover) | The exact tiles of the radius or cone, and CONDENSE's core tile |
| **Who is affected** | Every creature that would be hit, marked; allies marked apart from enemies; those KIN spares, and the Downed or surrendered that are skipped; for each, the expected damage, healing or shield after multipliers, and the roll or save TN it takes |
| **Fizzle** | "Nothing it may affect: this spell will fizzle", before you confirm |
| **Placed magic** | Fields, traps and turrets show their tiles or reach, the rounds left and whose they are. Your traps show to your side only; an enemy's shows once spotted |
| **Other casters' patterns** | Every glyph glows for everyone. Words you know are readable; a pattern you can read shows its area the same way as your own |
| **Afterwards** | The log lists every target, roll, save and number |

---

## 10. Today vs the complete system

| | Today | Complete system |
|---|---|---|
| Words | 24 | 40 (a caster knows at most 4 + Brain Power) |
| Damage and effect words | 16 | The same 16 + 9 new Subjects |
| Range with no word | Shape and glyph count | Touch, in every shape |
| Picking a target on a Line | Impossible | Pick anywhere in the area (facing rule) |
| Area | Ring radius 1; SPREAD radius 2 or a cone | Burst words only |
| Shapes and drawing | Stack, Line and Ring; draw on your tile or the next one; 2 glyphs a tile | **Line only** (2–4 tiles, straight: horizontal, vertical or diagonal); draw **on your own tile only**; **1 glyph a tile** (perks, traits or skills may allow 2) |
| Seeing what a spell does | Partly (the area map and grid preview some of it) | Required: every effect, target and area shown before Evoke (section 9) |
| Movement, buffs, control, walls, dispel, stealth, life drain | None | One word each |
| Keeping allies safe | Not possible | KIN |
| Glyphs in one spell | A pattern is 2–4 tiles (up to 2 glyphs a tile); Max Sigil words caps it | At most 4 glyphs; Max Sigil words limits weaker casters below that |
| Engine work | | Spec, sigils.json, magic.ts, the Evoker class moves and perks that read PUSH's range (classes/i.ts, k.ts), the AI (it has to use and avoid the new words), the simulator |

---

## 11. Decisions for Leon

1. **Size:** all 40 words, or ship the 30 of the agreed draft first and add the 10 newer ones later (as Sigil plates)?
2. **Repeated Subjects:** once per spell (recommended), stacking, or stacking without the Burst multipliers?
3. **Friendly fire:** do bursts, cones, fields, chains and turrets hit allies? (KIN only matters if they do.)
4. **The strongest new words:** COMMAND (control), QUICKEN (+2 AP), RAISE with SPREAD (a 5 × 5 fortress). Keep, weaken,
   or cut?
5. **Turrets and chains hit the nearest creature, allies too** (add KIN to keep your side out). Agreed?
6. **The numbers:** all provisional, to be set by playtests.
7. **Lines:** the band is one tile narrower than the Line when it has an even number of glyphs (3 wide for 4): make it
   the full width? And since you finish a Line standing on its last glyph, the spell then fires back the way you came:
   keep that, or let the end you stand on fire forward?
8. **The enemy AI:** enemies with Sigils would need to use these words too. Today they only draw and fire simple
   patterns; the AI would need work before enemy casters use the new ones.
9. **Targeting yourself:** with the facing rule on Touch, your own tile is never in a spell's area, so "you can always
   target yourself" is Touch's one exception (it keeps self-heals, blinks, MASK and novas). Keep it, or bring back a word
   (the old RETURN) for spells on yourself?

---

## 12. Leon's answers (7 Nov 2026)

1. **Size:** all 40 words now.
2. **Repeats:** any word may repeat (Subjects too: FIRE · FIRE stacks); each repeated glyph (every copy past the first of a word) multiplies the spell's final numbers by **×0.9**, so FIRE · CONDENSE ×3 is about 20% weaker than its raw ×2.5 (75 → about 61). PROVISIONAL.
3. **Friendly fire:** yes: bursts, cones, fields, chains and turrets hit allies; KIN keeps your side out.
4. **The strongest words:** COMMAND as written (save, one order); QUICKEN +2 AP at most once per target per round, never on yourself; RAISE only on empty tiles, 30 HP a tile, at most one RAISE working per caster.
5. **Turrets and chains** hit the nearest creature, allies too (KIN keeps your side out).
6. **Numbers:** all provisional until playtests.
7. **Lines:** the band is as wide as the whole Line (even lengths included); a finished Line fires back the way you came, and the preview draws that direction before you Evoke.
8. **Enemy AI:** build it: enemies with an Evoker use the new words.
9. **Targeting yourself:** kept as Touch's one exception (no RETURN word).
10. **Extra:** a new Sigil caster always starts with at least one **Reach** word among their starting words.
11. **Elements get their own special effects** (visuals and sounds per element), built so Soul magic can reuse them when Outbursts gain elements next.
