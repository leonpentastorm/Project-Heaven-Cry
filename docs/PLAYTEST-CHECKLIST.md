# Playtest checklist: what to try by hand before a build goes live

For Leon. **Section S is Survival mode (0.27.0, built, not live until your word); try it first.** Section 0 is
Classes 3.0 (0.26.0, Class Roster Revision 4, live). The sections after them were written for 0.23.0 (rules 1.15 to
1.26, live since 12 Nov) and still hold where Classes 3.0 did not change them. Tick a box when it looks right; write down anything that does not and say which line. "Right" is what the build
is meant to do, not a guarantee that it does.

## S. Survival mode (0.27.0, rules 1.39 to 1.51; built, not live until Leon's word)

Sources: `docs/design/handoffs/SURVIVAL-PICKUP.md` (start there), the spec `docs/design/survival-spec.md` (draft 4 and
the three "Settled by Leon" blocks), the step hand-offs (`survival-step-*.md`, `survival-lanes.md`,
`survival-steps-9-10.md`). Every number is PROVISIONAL and in `data/survival.json`.

**How to play it.** A new room selects **SURVIVAL** (the three cards under the seats). Make a level 1 character (or
bring a level 1 draft), Start the run. Solo works; two browser tabs make a co-op room. Each block is about ten minutes.
To try a later stage fast, a test room (`localStorage phc.testRoom = 1`) takes `run/skip` from the console (a fight won
at once); a normal room never does.

### S.1 The lobby and the start (five minutes)

- [ ] Three large cards: SURVIVAL (selected, a check and the word), ROGUELIKE and CAMPAIGN locked ("Coming", a lock
      mark, the hover card says when). A guest's click says "Only the host picks this."
- [ ] The Narrator panel is collapsed with "Survival needs no Narrator." and opens on asking.
- [ ] Start the run: **the camp** opens first (rules 1.51): "THE CAMP", and for your character three large cards, each
      a line glyph, a name, one sentence with its number, the line's word in its attribute's colour ("SIGIL · BRAIN
      POWER") and its worth ("5 of your 50"). Every purse holds 150 credits.
- [ ] **The offer reads what you run on:** a Sigil caster (Evoker in hand) is offered two Sigil boons and one gun boon;
      a rifleman two gun boons (or two of its highest attribute's line) and one more; an Outburst caster two Outburst
      boons. Hover a card: the full text. Click one: the map opens, and the squad panel shows it with "Camp" and the
      run power ("5 of 50").
- [ ] **The camp's issue:** a caster's kit (class 1 or 2) shows "Fit class 3: free"; click it and the armour is class 3
      with no credits paid. A soldier's kit already wears class 3 and the line says so.
- [ ] **Co-op:** each player sees its own cards first; the strip shows each player "Chosen" or "choosing"; the map
      waits for everyone; the host's "Go on" gives an away player the first card.
- [ ] **What right looks like:** nobody is asked for an API key; a character above level 1 is refused in words.
- [ ] **Felt in the first fight (rules 1.51):** with Zeroed, a shot's hover card lists "Zeroed +1"; with Hot Loads the
      damage line has "Hot Loads"; with Quick Chalk the first glyph costs 1 AP less, once.
- [ ] **The supply pack after a fight:** a Sigil caster gets back the cores it burnt (1 to 2 a fight, more at an Elite
      and a Boss), an Outburst caster or a Mender "N MP" (30% of max MP a fight), a gunner its magazines as before;
      Flux is 0 at every fight's start; a Rest fills the loaded core.

### S.2 The path map: lanes, junctions, the vault (ten minutes)

- [ ] The map is an overland chart (the field chart until the painted backdrops land): the camp at the left, the Boss
      at the right; 3 or 4 dashed trails (lanes) that run straight for several nodes and meet only at junctions
      (diamonds), at the gate (row 8, an Elite every lane passes) and at the final junction (row 13), then a shop and a
      rest, then the Boss.
- [ ] From the camp every lane is lit. On a lane one click walks the squad on (one way forward); a choice comes only at
      the camp, a junction, the gate and the vault's fork.
- [ ] Each lane's stretch holds something different (a hard road with an Elite, a market road with a shop, the
      armourer's road with a Forge, the drill road with a training ground, a quiet road with a rest): read ahead before
      you pick.
- [ ] **One vault a map:** a short dead-end spur off an edge lane (depths 6 to 10): a horned skull (its guard, a fight
      past an Elite's) and a chest. The fork's card says "The trail forks: a guarded vault". After the chest the squad is
      back on the lane it left.
- [ ] **The map fits its frame** at 1280 × 720, 1280 × 800 and 1920 × 1080: no marker, word or the vault's spur cut off.
- [ ] The hover card says what a node gives and costs with the engine's numbers, and never covers a lit node.
- [ ] **Co-op:** at a fork each player marks a node (the marks show live, with initials); when everyone has marked the
      squad goes; one mark each is a tie and goes to the host's; the host may go at once.

### S.3 Fights and rewards (ten minutes)

- [ ] Depths 1 and 2 are short fights on small maps (about 4 rounds); later plain fights about 5, Elites 6 to 7, the Boss
      about 9 (the simulated runs measure this: `survival-steps-9-10.md`).
- [ ] After a won fight each character gets XP, credits (its own purse), a magazine's worth for every gun it carries
      and a pick of three weapons (one for its own door or weapon category) or credits instead. An Elite adds a pick of
      kit (a mod or a worn piece among them).
- [ ] Level 3 arrives around depth 3: the level-up screen gives the class of the highest attribute.
- [ ] A character who dies in a won fight stands at 1 HP afterwards with its full share; the whole squad down ends the
      run with its score.
- [ ] **What right looks like:** a gunner on Bursts with the service rifle never runs dry between shops; the reward
      cards show the engine's numbers (to hit, damage, AP).

### S.4 The shop and the Forge (ten minutes)

- [ ] A shop opens full screen at once: the keeper, five tabs (Always in stock, Today's gear, Repair and upgrade, Sell, Give), large
      cards, your purse, the compare panel. It reads at 1280 and 1920.
- [ ] Every calibre is always in stock with magazines for your guns; a card you can't afford says "Short N credits."
- [ ] The grade step at a shop: Fine 1,500, Masterwork 3,500 (stage 2 on); one step a visit; the card shows what
      changes (to hit +1 a grade).
- [ ] A Forge: the same steps at 80% (1,200, 2,800); mods and worn pieces; armour fitting; **from stage 3 the Relic
      step** (6,500): three named properties offered, each with its worth against your 50 cap.
- [ ] **Repair (rules 1.50):** fight a few nodes, then open a shop's "Repair and upgrade" tab: the Repair shelf has a
      card for the worn gun (bar now → full, the price, the Forge's price beside it); repair it and the purse drops by the
      card's price, the bar is full. A Forge's Upgrade tab has the same cards at 80%. Too poor: the card says by how much.
- [ ] A gun at 25% or less shows ⚠ WORN (at 0 ✕ BROKEN) on the shop's and every place's hands, on its pack line, and on
      the path map's squad panel before you pick a lane.
- [ ] Two players in one shop: each in their own tab; a rolled piece one buys shows "Sold to …" on the other's screen;
      Ready to leave, or the host's Close.
- [ ] **Gives:** at any safe node, give credits or a pack entry (a graded weapon arrives whole, mods and property and
      all); the receiver sees a toast and the purse move.

### S.5 Growth away from the shop (ten minutes)

- [ ] A rest heals everyone in full, starts a session (Echo 1) and offers one small training each (drill 100, study 3,
      practice 5, Devotion 2).
- [ ] A training ground: one big training each (drill 300, study 8, practice 10) and a second for 300 credits.
- [ ] A shrine: a rite (Devotion +4), a knowledge piece for an Atheist, or the patron's token (a small boon on the cap).
- [ ] A Crossroads: two or three trades (each with a cost), or walk on.
- [ ] A cache: credits, ammunition and a pick of kit (two lasting things among three).

### S.6 The Boss, the boon, the next tile, the end (ten minutes)

- [ ] The Boss at row 15: STAGE 1 CLEARED; each character picks one boon of three (its sentence, its one number, its
      worth against the 50 cap); the boon is felt (True Aim: the gear card's to-hit rises; Second Wind: 7 AP).
- [ ] The next tile: two or three settings not yet played, each with its backdrop, Boss and boon theme; stage 2 is a
      fresh map, harder (longer fights, Elites and Bosses a level up a stage).
- [ ] Retire after a Boss, or lose: the summary (stages, nodes, the path, each fight, levels, classes, boons, each
      stage's tally); Report a run saves a file; keep the character as a draft; back to the room with the score.

### S.7 The curve (one evening, not ten minutes)

- [ ] **What right looks like (Leon's targets):** a careful squad of four clears stage 1 most of the time and ends in
      stage 3 or 4; solo is viable through stage 1 and into stage 2; one grade step a stage per character, with a real
      choice between it and kit, trainings or a token; nobody runs dry of what their build runs on. The simulated runs'
      measure of these, before and after the fit, is in `survival-steps-9-10.md`; what is still off target is listed
      there.

### Calls made for Leon during Survival (he can reverse any)

Each was built as written because the spec was silent or the lead ruled ("no answer means yes"). Reverse any by its
number; most are one data field or one line. Sources: each step's hand-off, the spec's section 12.

**The spec's open questions, built as recommended (survival-spec section 12)**
1. One difficulty in v1; the mode's name is Survival.
2. A mode, not a generated campaign; trapped caches cut; a rest is a new session and a small training; the
   always-stocked list goes past ammunition (cores, parts, stims, kits, grenades, special rounds, restock); credits
   instead of a weapon at 50% of the cheapest offer; one offer always for your door; armour fitting at the Forge until
   Equipment 2.0; no Celestial enemies; one currency (credits) and one rare item (the armourer's chit); a shopkeeper per
   setting and one armourer, sergeant and medic for all; the shop and the Forge open with no node card; a shrine's
   patron rolled per node.
3. `stage.bulk` 0.35 a stage (was 0.25), so gear does not stretch runs a stage past the target (moved again by the fit:
   rules 1.49).
4. A death costs nothing past its fight: the dead come back at 1 HP with a full share.
5. A graded focus is treated as the gun's case: the ceilings stay what a Standard focus reaches; a "best focus" guard row
   at Masterwork later.
6. The Forge: the shop's steps at full price, the Forge's at 80%, the Relic step at the Forge only, from stage 3, one
   step a visit, Celestial never sold.
7. A Relic's property takes its worth from the 50% cap.
8. Rarity's "+1 mod slot" is not enforced (mods fit by the weapon's slot list) until Equipment 2.0.
9. No respec or perk-swap service in v1.
10. Six Crossroads trades, each with a cost; the node is named Crossroads.
11. Trainings: the rest's 100 / 3 / 5 / 2 and the training ground's 300 / 8 / 10 and 300 credits for a second.
12. Income: `stage.credits` 0.35; the armourer's chit only from the gate in stage 1.
13. The node mix and the guarantees (since rules 1.48: lanes, themes and junction kinds).
14. The shrine's token: a boon of worth at most 8 from the tile's pool, one a character a stage.
15. Gives: a plain give at every safe node, no confirm; boons, tokens, trainings and the armour class can't be given.
16. `stage.xp` [1, 0.8, 0.9, 1, 1] (moved by the fit: rules 1.49).
17. The shop screen opened straight from the click; the training ground, shrine and rest full screen too (rules 1.46).

**The mode and the run (steps 1 and 3)**
18. An old lobby save reads as Campaign, not Survival (one line in `migrateLoaded`).
19. Every online player must have a character to start a run; `char/add` mid-run is not refused.
20. A load writes no `settings.play`.
21. After a retire or a loss the room returns to its lobby with the last run's score; "Back to the room ›" after a loss.
22. A character who fell in a lost run is refused at the next `run/start` (the alternative: raise it).
23. A picked gun takes its share of the ammunition pack; one core a fight whatever the node.
24. The weapon pick's price band is on the standard price; its first offer is the door's focus or the hand weapon's
    category.
25. The path map runs left to right (depth across).

**Prices and the shop (step 4)**
26. The calibre round prices are the Core Rules' table, not the spec's section 7 proposal.
27. A full magazine is the Core Rules' empty magazine plus its rounds.
28. Special rounds are priced on a rifle round (armour-piercing 6, hollow-point 4, incendiary 6).
29. A sale counts the fitted mods at their own price.
30. Only a character's own player buys for it (the host does not spend an away player's purse).
31. The faces' names and lines (Suggested); the fallback portraits from the world pool.
32. The AHOC and works shops draw an M813 illustration as their backdrop until their own land.

**Progression (step 4a)**
33. The grade step is capped by the stage at a shop and a Forge, as the picks are (stage 1 Fine, stage 2 Masterwork).
34. The focus reading counts every save forced through a door skill, a perk's too.
35. A Visualizer's grade reaches the saves its Figments force, not a Figment's own attack.
36. The shrine's piece is for an Atheist only; the Faithful keep the rite.
37. "Better than what it wears" is "dearer than the piece worn there".
38. Balanced needs only its instance in hand.
39. The graft rolls from this tile's pool.
40. The kit picks block the map as the weapon pick does.

**Gives and places (step 4b)**
41. Campaign gives are widened too (any pack entry or credits, out of a fight).
42. No give at a fight node after its fight.
43. Only a character's own player gives.
44. The Crossroads has a face (Teo Vant, Suggested; stand-in portrait).
45. Walking out of a place is per screen, not an action (no Ready mark at a Forge or a training ground).

**Stages and boons (step 5)**
46. A boon's `doors`: Primed is offered only to a door it serves.
47. The spec's "shrine" pool reads as `faith`; the machine pool holds one boon and the pick fills from every pool.
48. Field Mending heals the living, before the write-back, with no Level term.
49. Bandolier doubles cores too and a picked gun's share.
50. Tithe on node pay only; Devout inside the 6-a-session tag cap.
51. The next tiles are known all stage, so the graft reads their pools.
52. Retire is open at the boon and at the tile; the summary shows first when a run ends.
53. The kept draft is named "Name (level N)".

**The tally (step 6)**
54. Report a run is a plain `.json` file.
55. Downs and deaths show as one column ("Downs") on screen.

**Fight maps (steps 7 and 8)**
56. Doors a stamp places stand open.
57. Hazards on seven templates, not on a swarm, a rush, an ambush or two Elites.
58. Half cover in straight runs of 1 to 3.
59. Two small rooms in five settings' stamp lists.
60. Four kit pieces held back; a seamed ground falls back to the kit's first good ground.
61. The kit-drawing browser suite is `kit-map`.

**Lanes and the vault (rules 1.48)**
62. The gate stays one node every lane passes (the stage's midpoint).
63. Row 14 stays a shop and a rest behind a final junction.
64. Every route passes a shop and a rest (about 2 more shops and 3 more rests a map); not compensated in credits.
65. No small junction after the gate (segments 2 to 4 leave none).
66. The vault is a pick on the map, like the cache, not a full-screen place.
67. Names (Suggested): the five roads, the six vault guards, the marker motifs.

**The fit and the close (rules 1.49, steps 9 and 10)**
68. **The simulated players are the yardstick** (`test/balance/survival-run.ts`): careful but plain (no hunting a
    hidden last foe, no stims, swaps or Echo rerolls, the class moves only as the fight policies use them). The curve is
    fitted to them; real players who use more of the kit will go a little further.
69. **Elites and Bosses pull ahead two levels a stage, to four** (`stage.elite_up` per 2, max 4; was 1 and 3): the
    only foes that threaten a levelled squad are the ones that keep pace (ordinary foes lag and their hits are lost to
    armour).
70. **`stage.bulk` 0.42** (was 0.35) and **`stage.pressure` 0.35** (was 0.15): fights a little longer each stage, and the
    danger cap rising with the Elites' lead.
71. **The solo cap 2.0 a character and the solo Elite's share 0.75 HP and damage** (were 1.2 and 0.7 / 0.55); **the
    duo cap 1.7, the duo's Elite share 1 and its Boss's damage share 0.8** (were 1.25, 0.9 / 0.8 and 0.6). The solo
    Boss's share (your 28% / 40%) is unchanged.
72. **`rewards.instead_rate` 0.1** (was 0.5): credits instead of a weapon pick paid as much as the nodes and put the
    Relic in stage 3.
73. **`stage.xp` [1, 1, 1.1, 1.25, 1.25]** (was [1, 0.8, 0.9, 1, 1]): level 20 early in stage 6 on an average route.
74. A fight the simulator could not finish in 20 rounds counts as won when the squad standing holds more than twice the
    foes' HP (nearly always one hidden foe), else the run ends there ("stalled"). Measuring only.
75. **Not fitted, reported** (survival-steps-9-10.md section 5): a Sigil caster alone, and a party of four casters, fall
    in stage 1 or 2; guns wear out (durability) in stage 3 to 4 with no repair in Survival but the grade step; both need
    a general addition, not a dial. *(Durability: answered by rules 1.50's repair service, calls 76 to 79.)*

**Repair (rules 1.50)**
76. **The price is the Core Rules' gunsmith by the wear:** a tenth of the item's price at its grade times the share
    missing, at least 10 credits, 80% at a Forge (the grade step's factor). Mods are not counted.
77. **No limit a visit**, and both a shop and a Forge repair (the Forge cheaper): repair is upkeep, not growth.
78. **The WORN mark is the Core Rules' Worn (25%)**, moved to data (`weapons_rules.worn.share`); no separate "close to
    breaking" number. A gun just above 25% at one shop can still break before the next; the bar shows it.
79. **Shields repair too** (they have durability in data); a focus and armour do not wear and get no card.

**Starting boons, caster boons and supply (rules 1.51; survival-spec section 13.9, built as recommended)**
80. **Starting boons are small:** worth 4 to 6, at most 6 of the 50 (12%), one each, their own pool: big enough to pick
    for, small enough that the Boss boons stay the run's rule-changers (13.9.1).
81. **The camp's free armour, class 3, in Survival only** (a campaign's kits are unchanged); the third spare magazine
    is the camp's issue too, in Survival only (13.9.2).
82. **The Sigilist may still fall short:** measured first; what it still needs is a Sigil rule at levels 1 to 5, not a
    bigger boon (13.9.3; the measure is in `survival-starting-boons.md`).
83. **Primed's Flux −2 and Strain −1 struck** (they were never built; Flux and Strain are 0 at every fight's start now)
    (13.9.4).
84. **MP 30% of max a fight, cores what you burnt (1 to 2 a fight)**, an Elite x2, a Boss x3 (13.9.5).
85. **Echo stays unplayed by the simulator** for every build (13.9.6).
86. **An away player takes the first card** when the host goes on (13.9.7).
87. **Figments get no Boss boon yet**, until the Rigger is measured with its own policy (13.9.8).
88. **Lines are read from the sheet and the hands** (a focus in hand with its door skill, else the highest attribute's
    alpha skill, else the weapon); the second line is the weapon in hand if different, else the next attribute's (13.9.9).
89. **Vigil:** "your first prayer each fight, if it is a Whisper, costs 0 AP": the engine names every prayer `pray` when
    it is made, so a Hymn first spends it.
90. **Zeroed and Balanced Grip** are terms of the attack (they tell a shot from a blow); the to-hit hook does not.
91. **Deep Well and the Gentle property now strengthen the heals you give anyone** (they named the healer but the heal's
    holder is the healed unit, so they worked only on your own heals): a fix, not a new number; Gentle Hands and Shelter
    are built the same way.
92. **The simulator's caster policies are the run's own** (`run-policies.ts`); the balance pass's policies, which the
    golden tables and replays play, are unchanged.
93. **The solo gunner gained a little and nothing was shrunk:** stage 1 in 11 of 12 on the spec's cells (was 9; the
    band was ±1) and 32 of 36 over three times the seeds (was 28). Every starting boon, the near-null Quick Magazine
    too, gives the same lift on the gear route: a changed turn deals the seeded dice differently. The rule's dial (all
    rows smaller) cannot shrink a +1 to hit; if you want it held, make the to-hit rows something else for every line.
94. **Missed, reported:** the Sigilist clears stage 1 in 3 of 12 (target 7): the Sigil fix of call 82; the healer
    alone stalls in 5 of 12 (target 2): the Mender's damage is the class's. The Channeler (9 of 12), four casters (half
    reach stage 3), the Rigger (a Figment every fight) and the squads (stage 3 to 4) are on target.

## B. Bows and quivers (rules 1.53, in 0.27.0)

Sources: rules 1.53 (items 4000 to 4008), `docs/design/handoffs/bows-quivers.md`. Leon's rulings of 14 Nov 2026.

**What to try**
- [ ] Give a character a recurve bow or a longbow. Its ARMS tab shows one quiver, "Quiver · STANDARD · WORN", holding
      40; load it from the arrows you carry (any mix of types). There is no Nock an arrow anywhere.
- [ ] In a fight, shoot: each shot (Aimed Shot, a plain shot, a technique) takes an arrow from the worn quiver for the
      shot's own AP; the Quiver row under the HP bar counts down (arrows left / what it holds).
- [ ] Buy a second quiver (a Survival shop's counter shows one to a party with an archer; a campaign's shop or loot),
      carry it from the backpack (ARMS tab: it is the READY quiver), load it. In a fight, the bow's group on the Attack
      tab now has **Switch quiver** (2 AP, a reload's price): it wears the other quiver. With one quiver it is not there.
- [ ] Empty the worn quiver with the other still full: a shot is refused "The quiver is empty: Switch quiver (N in the
      other).", the Quiver row says SWITCH, and Switch quiver's card says the other holds N.
- [ ] Fit an enchantment (Ember, Storm, Frost, Stone, Gale, Acid; the Survival Forge stocks them for a party with
      quivers) into a quiver: the ARMS card shows its mark in the tone's colour with its name (▲ EMBER ENCHANTMENT). Every
      arrow from that quiver carries the tone's rider and deals ×0.9 (the attack card shows the term); its hit plays the
      element's own hit effect. Arrows from the other quiver are plain.
- [ ] Grade a quiver (Survival: the grade step at a shop or the Forge lists "worn quiver" and "ready quiver"): Fine
      holds 50, Masterwork 60, Relic 70 (no named property asked), Celestial 80. The shot's to-hit and damage do not
      change with the quiver's grade (only the bow's grade buys accuracy).
- [ ] An old save with an archer loads: the bow's arrows are its worn quiver.

**Calls I made for you (reverse any)**
80. **"20 more into each tier":** before 1.53 every quiver held 20 and grade did not change it, so the only tier was
    the one number: the Standard quiver holds **40**. The ladder above it (Fine 50, Masterwork 60, Relic 70, Celestial
    80) is mine, so a graded quiver means more arrows as you ruled; say if you want other steps.
81. **Your "or":** two quivers and Switch quiver (the lead's reading, then yours), not a removed action alone.
82. **Switch quiver costs a reload** (2 AP, the one reload rule), and is free where a reload is free (Resupply, Between
    Heartbeats, Running Reload). A Last Round kill with a bow still owes no free reload (unchanged): should it free the
    next Switch quiver?
83. **The quivers are the character's, not the bow's:** a recurve and a longbow shoot from the same worn quiver.
84. **The six enchantments are the Outburst tones' riders** at a stage each (Ember Fire 2: Burning; Storm 1: ignores
    half cover; Frost 1: Slowed on a failed Body save; Stone 2: Prone on a failed save; Gale 1: a 2-tile push; Acid 1:
    Corroded on a failed save), **400 credits and ×0.9 damage** (the incendiary round's price for its rider).
85. **A quiver costs 120 credits and weighs 0.6 kg** (Standard; the grade's price factor above). Quivers are carried,
    stowed and enchanted out of a fight only (in a fight, Switch quiver is all).
86. **Survival:** the counter sells a plain quiver to a party with an archer; a reward pick may offer an archer a quiver
    as its own offer; the vault's chest may hold one at its grade; the Forge stocks enchantments only for a party that
    carries quivers (so a party without an archer sees the same stock as before).

## 0. Classes 3.0 (0.26.0)

Sources: `docs/design/handoffs/CLASSES-3.0-PICKUP.md`, the step hand-offs (`classes-3.0-step-*.md`), the specs
(`docs/design/class-roster-rev4-proposal.md`, `shadow-spec.md`, `bonds-spec.md`, `figments-spec.md`, `chaplain-spec.md`,
`reactions-spec.md`, `level-scale-spec.md`, `heal-shield-percent-spec.md`), rules 1.28 to 1.38. Where a number is
still being fitted, it is in `docs/design/handoffs/classes-3.0-step-11.md` and `PATCH-TALLY.md`.

**How to play it.** The title shows **PROVING GROUND first** (M813 is off the menu, see block 0.14). In the gearing-up
screen give your character a class (any of the nine, any rank), a level, skill points, gear and meters; the Effect
testing room's dummy has 9,999 HP and comes back after every action. Each block is about ten minutes. Play each class
once at **level 5, rank I to II**, then the one you like at **level 12, rank III**. Squad blocks want a friend or a
second browser tab (two players in one room).

### 0.1 The nine classes, by their new names (ten minutes for the roster)

- [ ] The level-up picker, the sheet, the hover cards and the log name the classes **Bulwark** (Endurance), **Breaker**
      (Strength), **Skirmisher** (Agility), **Operative** (Perception), **Sigilist** (Intelligence), **Rigger**
      (Expression), **Mender** (Insight), **Channeler** (Determination), **Chaplain** (Virtue). No old name (Defender,
      Fighter, Marksman, Infiltrator, Mage, Trickster, Bard, Guardian) anywhere a player reads.
- [ ] An old save opens: its class keeps working under the new name (the ids did not change).
- [ ] At level 3 you get the class of your highest attribute; a tie lets you choose among the tied. Rank II at that
      attribute 5 and level 6, rank III at 8 and level 12: two moves a rank.
- [ ] **What right looks like:** each class has a bigger meter or a cheaper thing than a classless character with the
      same skill, plus its six moves. Nothing in the mechanic itself is locked behind the class (block 0.2).

### 0.2 The doors: every mechanic is open through its alpha skill (ten minutes)

Make a classless level 5 character (no class picked) and give it 3 points in one alpha skill at a time.

- [ ] Durability: Guard points and the Guard technique. Raw Power: Momentum with a melee weapon. Dexterity: ranged
      techniques, Pressure and Heat. Ingenuity: **Shadow**. Brain Power: Sigils (with an Evoker). Visualization:
      **Figments** (with a Visualizer). Empathy: **Bonds and Tending** (with an Attuner). Will Power: Outbursts (with an
      Emanator). Faith: **prayer from Faith 1** (block 0.7).
- [ ] Each door's verbs appear on the action panel with no class, and a missing focus says why in words ("Needs an
      Attuner in hand.").
- [ ] **Right:** a door user plays the whole loop (build the meter, spend it) but a little worse than the class with
      the same points (about 13% under its line, `balance-contract.md`).

### 0.3 Shadow and the Operative (ten minutes)

- [ ] With Ingenuity and no enemy seeing you, end a turn: Shadow rises (0 to 3, the meter row with its eye word:
      Unseen, In view, Seen). Seen, it stops.
- [ ] The SHADOW tab lists its verbs under **Slip, Mark, Work, Break**. A verb that needs you unseen says so in words
      ("An enemy sees you: this needs you Hidden.").
- [ ] Vanish: your token goes to **60%** (and so does its portrait in the turn bar); the HIDDEN chip stays. The Break
      on the attack card is a toggle; switched on, the previewed damage changes; the hit spends Shadow and you are seen.
- [ ] An Operative starts a fight with 1 Shadow; Analyze on a target that can't see you gives one more.
- [ ] **Right:** strong opening hits from out of sight, never a one-shot kill of an Elite or Boss from Shadow alone.

### 0.4 Bonds, Tending and the Ledger: the Mender (ten minutes, squad)

- [ ] With Empathy and an Attuner in the off hand, the **TEND** tab (Insight pink) lists BOND, HEAL, HELP; Triage,
      Inspire and Rally stay on the CLASS tab.
- [ ] Bond an ally: the **Bond strip** under your resources shows it (round portrait, HP bar, "BONDS 1 / n"), and the
      map draws a **faint pink line** between you. **Side by side, the line is a small link mark with a dot at the shared
      edge** (it was invisible before). Bond an enemy (a save): dashed line, a hollow dot when adjacent.
- [ ] Put the Attuner in the pack: the strip greys ("Attuner in pack: Bonds held, threads quiet").
- [ ] A hit on a Bonded ally is shared along the Bond (Share a Hit: automatic for anyone with Camaraderie 1, call 31).
- [ ] The Mender's **Ledger** is the bar at the end of the strip (not repeated as a row); it fills as you tend and
      empties into your strikes.
- [ ] Inspire's picker lists every feeling; the ones you have never felt are greyed and refused.
- [ ] Let Go: the line is gone at once.
- [ ] **Right:** the Mender out-heals every other source (the healing order, block 0.10); an enemy Elite or Boss Bonded
      to your healer goes for the healer.

### 0.5 Figments and the Rigger (ten minutes)

- [ ] With Visualization and a Visualizer in hand, the **FIGMENTS** tab: Picture and Load the Visualizer, then one group
      per Figment you hold, headed by its **face** (a round chip with the form's glyph in your colour until the
      portraits are painted, ART-REQUESTS C6) and its name and HP.
- [ ] Picture a Double, an Eye, a Wall, a Beast, a Blade (the forms open at Visualization 1, 3, 5). A third one past
      your hold is refused in words ("Hold is full").
- [ ] A Figment has no turn: its verbs are your rows and cost your AP. Its token says whose it is.
- [ ] Let go: it comes apart and half its charge comes back. At the fight's end no Figment stays.
- [ ] Enemies: a Minion is fooled by a Double until it attacks it; Soldiers, Elites and Bosses shoot a character in
      reach before a Figment.
- [ ] A Rigger: one more held, the first Figment each fight free, six tabs on **one row** (Move, Attack, Utility,
      Class, Figments, Calls: the counts sit in the corner of each tab).
- [ ] **Right:** a Figment soaks fire and changes where enemies go; it is not a second damage dealer.

### 0.6 The Chaplain: Ward, Sanctuary, Smite, Verdict (ten minutes)

- [ ] On the FAITH tab, **Ward** sits among the WHISPERS and **Sanctuary** among the HYMNS; **Verdict** is on CLASS.
- [ ] Pray a Hymn: you are Witnessed and **your patron stands at your side** on your tile (its portrait at 40%).
- [ ] While Witnessed, a weapon hit carries **Smite** (the log: "Old Overcast smites … (Smite): n") once a turn and
      leaves the target Judged; a second hit that turn carries none. A kill-taboo patron's Smite subdues.
- [ ] Sanctuary right after a Hymn is refused for the Hymn's wait, in words; later it lays a zone that halves damage
      to allies in it.
- [ ] Ward gives a shield (10 × the Blessing power, call 22); two Wards held at most.
- [ ] **Right:** about a Faith build's whole turn of damage plus its prayers; Smite is not a second gun.

### 0.7 Prayer from Faith 1 (five minutes)

- [ ] A Faith 1 character (any class, Faithful) has the FAITH tab with its Whispers; a Hymn says "A Hymn needs
      Faith 3". An Atheist prays by dice as before.

### 0.8 Reactions and Reflex (ten minutes)

- [ ] Beside your AP: **"REACTION ●"** (white when ready, grey when spent). A Skirmisher shows **two** ("REACTIONS ●●").
- [ ] Hold a shot; an enemy walks in; the held shot fires and the pip greys. A reaction never triggers another
      reaction. Suppressed stops an attacking reaction, never a protective one (Interpose, Drink It In).
- [ ] The pips' hover card lists the Answers you keep on.
- [ ] Killzone's card says it uses two reactions; Run and Gun leaves you slipping after a move.
- [ ] **Right:** a Skirmisher can cover two lanes in one enemy phase.

### 0.9 The enemy acts on what it sees (ten minutes)

- [ ] Start a fight on a big map out of sight: enemies walk toward where your side was last seen, not straight at you
      through walls. Standing on that tile with nobody in sight, they hold.
- [ ] Hit an enemy from Hidden: its side learns your tile and searches toward it.
- [ ] A Boss cannot stay hidden after round 1. Enemies shoot a Warded or Sanctuary-sheltered ally less than an equally
      hurt one in the open. An enemy that sees a held Overwatch walks round it when it can.
- [ ] **Right:** enemies feel smarter but never know what they cannot see.

### 0.10 The level scale ×7.5 and heals in percent of HP (ten minutes)

- [ ] At level 1 a plain rifle hit on a Soldier is about 40, as before; at level 20 about 300 (the scale is ×7.5,
      geometric). HP, armour, shields and Guard grow with it. Big numbers read with thousands separators.
- [ ] Heals and shields are a share of HP now: the strongest heal a turn is about 65% of a body's HP; every heal and
      shield has a floor so a tiny heal is never worth a turn. The order: **Tending heals most**, then the Outburst,
      the Sigil and a Whisper.
- [ ] An old save from before opens with its HP moved up once to the new scale (not again on the next load).
- [ ] **Right:** a level 10 fight takes about as many rounds as a level 1 fight; numbers bigger, rhythm the same.
      Exact numbers: `classes-3.0-step-11.md`.

### 0.11 Guns: the katana and Mag Dump (five minutes)

- [ ] The **Emanator katana** (a mana arm, one-handed light blade): counts as an Emanator for Outbursts and hits like a
      light blade. The katana and the Emanator katana have their painted icons.
- [ ] **Mag Dump spends 4 rounds a roll, 12 at most** (call 50): a 200-round belt loses 12, not 200; a 6-shot revolver
      fires two rolls and is empty; the long rifle (5 rounds) fires one roll and keeps one round. The rolls are as
      before (one for every 3 rounds left, three at most), so it hits as hard as before. The card says "up to 12
      rounds"; the casings match the rounds spent.

### 0.12 Effects: the cleanup and bullet holes (ten minutes, Effect testing room)

- [ ] No tracer lines, no swing arcs, no miss effects drawn over the map. A hit leaves a mark by its ammunition: a
      bullet hole, a shotgun's pellet cluster, an arrow's shaft; a miss leaves none; a swing leaves no hole.
- [ ] **A Burst or a Suppress that unlocks a feeling for the first time:** the rattle comes with the first muzzle
      flash and the "A NEW FEELING" card shows after the shots (it used to sit between the sound and the flash).
- [ ] The painted Heavenprint gear icons show in the backpack, the gear tab, piles and the Proving Ground lists.

### 0.13 Hover performance and the map (five minutes)

- [ ] Leave the pointer on the map while a unit walks or the camera glides: the frame rate holds (it halved on 0.25.0).
      Hovering tiles fast does not stutter.
- [ ] Bond lines and Figment tokens move with the map when you drag or zoom; a Hidden ally is at 60%, a Downed one at
      50% (the turn bar too).

### 0.14 M813 unlisted (two minutes)

- [ ] The title: PROVING GROUND first and selected, NEW GAME second; no M813 on the menu or in a new room (a new room
      starts on the Narrator's own start). A room saved on M813 still loads it and says so.

## Calls made for Leon during Classes 3.0 (he can reverse any)

Each was built as written because a spec was silent or the lead ruled while Leon slept ("no answer means yes"). Reverse
any by its number; most are one data field. Sources: `CLASSES-3.0-PICKUP.md` section 6 and each step hand-off.

**Reactions and the primitives (steps 1a, 1b, 3)**
1. Reactions with no kind on Revision 4's list: a Call made as a reaction, Drink It In, Catch, Dance of Iron and Heart
   Overwatch are `attack` (Suppressed stops them); Order and the Strike Call's dive `move`; Adamantile Plate and Share
   `protect`. Reverse: change the item's `limit.kind`.
2. A Call that harms or hinders an enemy is never a reaction (the lead's ruling, item 1764). Reverse: allow it as kind `attack`.
3. Anchor's strike is kind `attack`: Suppressed stops it. Reverse: `protect`.
4. Order: what the ordered ally does is that ally's reaction and provokes nothing. Reverse: make it a free action.
5. Drones, beasts, twins and Figments share one tie kind `owned`; a drone stays when its owner falls. Reverse: a second tie kind for Figments.
6. Reflex lives in a base class's `gain` list (the Bulwark's 1 Guard and the Operative's start use it too). Reverse: data only, the list.
7. The Breaker does not Riposte with no Momentum, even with a weapon that lends the technique.
8. Fire Discipline: once a turn a weapon technique of 3 AP or more costs 1 AP less; Shot, Aimed Shot and Cut never (the Skirmisher measured 161 against 145). Reverse: the threshold in data.
9. Keep one for a held shot is on by default (it refuses everything but the held fire). Reverse: default off.
10. Run and Gun: a move over 2 tiles leaves it waiting; its Pressure ends with the turn.
11. Special Ammo arms a no-magazine weapon for the next fight; flamers and launchers take loads.
12. Killzone's second attack spends the next round's reaction.
13. A move an item makes free keeps the move bank for every item (Glass Runner moved).
14. The perk Bulwark is renamed **Stonewall** (the class took the name). Reverse: pick another name.
15. Archetype names Holdfast, Glyphwright, Empath (Suggested). Reverse: rename in `archetypes.json`.

**Shadow (step 6)**
16. The Break's 1-Shadow floor; the MARK verbs' reach 8; a machine saves by Ingenuity only; Foul's save is the Heart;
    Off Balance is a 2-round cooldown a target; Fade picks its own tile.
17. Hidden, Prone, Bleeding and Dazed count as conditions for `has` / `lacks` and cleanses; a Hidden holder does not "see itself".
18. Parting Cut and Case are still pending (not built). Reverse: nothing to reverse; they wait for a ruling.

**Bonds and Tending (step 7)**
19. The echo is 0.20 (Leon); a Bond past the cap is refused (Let Go first); a Boss Bond lasts 3 of its turns, then 4 rounds before it can be Bonded again.
20. The share skips damage you do to yourself; each Bond counts at both ends.
21. Brimming leaves half the overheal as a shield; Take the Weight's condition is taken with no save.
22. Ward is **10 × the Blessing power** (the heal-shield spec), not the Chaplain spec's 7. Reverse: `classes.json` Ward value 7.
23. "Next attack" boons end with the next damage; the edge +2 with the next weapon hit or miss.
24. An enemy given a feeling with no enemy face gets nothing for the AP and MP (the screen does not grey it yet).
25. Field Surgery needs a field kit carried (not used up) and 15 MP; Triage is not on the area map (the story Triage stays).
26. The Mender's steady offence fitted by `tending.json bond.per_bond` 0.10 → 0.05 (rules 1.38). Reverse: 0.10.

**Figments (step 8)**
27. Field Fix is a move-pool move the Rigger refs; Read is folded into the Operative's Analyze.
28. The hold counts Figments made by Picture only (not the drone, the Double of a class move, the Scrap Turret).
29. A Figment acts only on what its side sees; its fall is no death (no mana, no Pressure spill).
30. Overclock is the unit's attack only; Salvage takes the first fitting unit next to you; a Boss is fooled through one of its turns at most; Paint the Field is deleted.
31. **Share a Hit fires automatically** for everyone with Camaraderie 1 (it changes every squad fight). Reverse: a toggle.
32. The Rigger measures 123 against its line of 150 and the door 119 against 130: not fitted (needs a class-only term, rules 1.38 point 5). Reverse: nothing; a ruling on the new primitive.

**The Chaplain (step 5)**
33. The kill-taboo patrons' Smite subdues; Smite needs the prayer door and is refused while Silenced.
34. Two Sanctuaries on one tile still stack (each halves). Reverse: build "the first zone of a kind".
35. The Sanctuary story half is a Narrator action with no MP and no once-a-scene limit; Sanctuary counts as a Hymn I.
36. The presence's Ward counts toward the two held; the Whisper-turn guard's top 1.40 → 1.42; the Faith door's tops raised by Smite's share.

**The level scale and heals in percent (step 7b)**
37. "×7.5" built as the spec's `deal` column (7.5^((L−1)/19)) with `scale` = new ÷ old (4.69 at 20): a plain hit 40 → about 300.
38. The Buff heal fitted 14 → 11.3 by its own dial (the Outburst heals by its own pair).
39. The Ledger's cap base 15.5 → 6.5.
40. Shields' order: Faith on top (Sanctuary's pool 40); Tending shield 0.36 of it, the WARD Line and Inverse 0.33: **the Sigil WARD drops 12 → 4.3**. Reverse: the three shares in data.
41. Old saves move into the scale once (HP × scale); objects of the shelved advanced classes and the Sentry turret are not scaled yet.

**The enemy side (step 9)**
42. The opening: each side knows every non-Hidden enemy's tile once, after set-up (else nobody would find anyone on the big maps).
43. "Figments last" for Elites and Bosses only while a character is in reach (as for Soldiers).
44. An Elite fooled by a Double keeps saving each turn (may stay fooled more than a turn); the Boss at most one turn.
45. Heard, not seen: a **hit** (not a miss) from an unseen attacker tells the side its tile.
46. A searcher on the last-seen tile with nothing in sight holds; it does not sweep further.

**The screens and the close (steps 10, 10b, 11, 12)**
47. M813 is unlisted (`m813.json` `listed: false`): the Proving Ground first, a new room on the Narrator's own start. Reverse: delete the line.
48. A Hidden token is at 60%; a Downed one at 50%, the turn bar's portrait too. Reverse: `tokenFade.ts`.
49. The Bond line between adjacent tokens is a short link mark with a dot, drawn above the tokens. Reverse: `TIE_MARK.min` 0.
50. **Mag Dump: 4 rounds a roll, 12 at most, never more than are left** (rules 1.38; the lead's corrected ruling of your word): the rolls stay rules 1.18's (one for every 3 left, three at most), so no weapon's damage moved; only the rounds spent changed. Spread (both barrels) spends its one roll's rounds. Reverse: `techniques.json mag_dump` `rounds_per_roll`.
51. With six tabs or more the tab bar goes tight (counts in the corner, full names kept) instead of wrapping.
52. A feeling's unlock card plays after the attack it was felt in, not between its sound and its rounds.
53. Still kept for your eye: Aimed Shot's and Crossfire's white lines and Storm's red line.

**Balance (step 11, rules 1.38; numbers in `docs/design/handoffs/classes-3.0-step-11.md`)**
54. A focus is any item or weapon with a `focus` block in data; the Spellslinger's pistol keeps counting as an Evoker (it did in code). Reverse: drop its block.
55. The Emanator katana: a light, edged mana arm (as its twin the Evoker blade), no lent technique, no weapon skill, in no loot table.
56. `bond.per_bond` 0.05 is the door's rule, so it also lowers a door user's Bond bonus (their offence 67 against 61).
57. The Chaplain is not refitted: 126 against 125.
58. The loosened guards stay, each with its measured reason: the Whisper turn's `level_hi` 1.42, the Faith door's tops raised for Smite, the long rifle's 1.13 (armour rounding).
59. **Open, not refitted:** a tank with a dedicated healer under three Soldiers never falls in 10 rounds at level 20 (the healer stall); Figments (door and Rigger both at the soak cap, call 32).
60. Reflex measures +0: no simulated enemy crosses a held line. Watch it in the playtest.

## The 0.23.0 checks (rules 1.15 to 1.26; still valid where Classes 3.0 did not change them)

Sources: `docs/design/handoffs/PATCH-TALLY.md`, `BUGLIST-0.22.md`, `PICKUP.md` sections 6 and 7, `balance-refit.md`
and the engine hand-offs.

How to play: use the Proving Ground solo (the gearing-up screen lets you give yourself gear, skills, perks, levels and
meters, and has the Effect testing room: a dummy with 9,999 HP and AP that comes back after every action). Use a level 5
to 10 character first, then a level 1 one.

## 1. Fifteen-minute smoke pass (solo Proving Ground)

- [ ] Open the game on a build served from this branch. The title screen shows the new version number.
- [ ] Start the Proving Ground, pick a squad, reach the first fight. The map is big and plain-coloured (no painting),
      the camera follows your unit, **M** shows the whole map, arrows show when the map goes beyond the screen edge.
- [ ] **Gun:** shoot an enemy with a plain rifle, then a Burst. A Burst fires three rounds and the card shows two
      rolls. Dice show the target number and the sum.
- [ ] **Melee:** step next to an enemy and cut. Hits land often; the number is clearly bigger than a rifle shot.
- [ ] **Sigil:** draw two glyphs on your tile in a line and Evoke. The effect plays in full, the glyphs stay on screen
      until the effect that removes them has played.
- [ ] **Outburst:** Begin, Pump once with a feeling, Release. Pump costs a little MP; the card shows the stage.
- [ ] **Faith:** pray a Whisper (1 AP) at an enemy or ally, then a Hymn (3 AP). After the Hymn the button says how
      many rounds until you can use it again.
- [ ] **Healing:** heal an ally with a kit or a Hymn; a shield is up and shows on the unit.
- [ ] **Enemies:** end your turn. Enemies move and shoot from far away (13 to 14 tiles), nobody stands still, and the
      your-turn card does not pop up while an enemy is still acting.
- [ ] Win the fight. The last blow plays its full animation before the fight-over screen.
- [ ] Press the next wave. The new wave plays its enemy effects, the turn card waits for them.
- [ ] Reload the page mid-fight. The fight comes back where it was.

## 2. Guns (rules 1.18, 1.26)

- [ ] The best gun feels stronger than the plain rifle but not twice as strong (about 145% of it).
- [ ] A Burst: three rounds, two rolls, the second at -4. Enemies still roll three on their Burst (kept on purpose).
- [ ] Mag Dump: three rolls at most.
- [ ] The long rifle: a Shot is 3 AP, Aimed 4 AP (two Shots a turn).
- [ ] A Masterwork, Relic or Celestial gun is more accurate and lasts longer but hits no harder than a plain one.
- [ ] Reloads: speed reload drops the magazine, tactical costs 1 AP more and keeps it in the pack.
- [ ] Hold a shot (Overwatch): its row shows a cost, and the held shot fires when an enemy walks in.
- [ ] Grenades and charges you throw (frag, incendiary, satchel) hit a group hard but not absurdly: a frag is about
      28 at level 1 before armour, and grows with your level. An enemy's grenade is as before.
- [ ] A shield on the target stops a grenade and a trap as well as a bullet (damage over time and true damage go past).
- [ ] **Attack an object** (was Shoot an object; 0.25): with a gun and with a melee weapon on cover, a barrel, a door
      (the log says "shoots" for a gun, "smashes" for a melee weapon); cover breaks into rubble.
- [ ] **Two guns (Hands 5d, Leon's ruling):** jam one (Proving Ground). Its area header shows a red ✕ JAMMED, its rows
      are greyed and their card says "Jammed: clear it first."; the other gun still fires. There is ONE Clear jam, in
      the BOTH area (none under either gun), its card says which gun it clears; one click clears every jammed gun
      for one price. Heat is one row in the unit panel (the two guns pool it).

## 3. Melee and techniques (rules 1.12, 1.26)

- [ ] A greatsword all-in hits about 165% of a rifle; a Bulwark with a shield hits less but is much harder to kill.
- [ ] Cleave, Cut Edge, Draw Cut, Sweep and Cruelty make the target **bleed for three turns** (15 damage in all),
      not one. Check the bleeding tag counts down 3, 2, 1.
- [ ] Shove an enemy into a wall: it is pushed or holds firm. **Shoving an enemy into a held Watch does not make the
      Watch fire any more** (a call, see list below).
- [ ] Push an enemy onto a trap, fire, mine or hazard: it goes off for the pushed unit. Throw Down, Drag and Bash's
      heavy push do the same.
- [ ] An Anchor Bulwark cannot be knocked prone by a maul, a wall or a Stop.
- [ ] A Stop, a Shove, a Hymn's save, a minefield, a talk-down and a surrender offer all roll their save with the die
      and modifier visible in the log.
- [ ] Opportunity attack: walk away from an adjacent enemy. The blow plays first, then the step, only if you still
      stand.

## 4. Sigils (rules 1.17, 1.26)

- [ ] A 2-glyph Line hits like a rifle shot or a bit more; a full 4-glyph Line is the biggest hit in the game
      (about 150 to 200% of a rifle turn over its draws).
- [ ] A spell critical hits for x1.5.
- [ ] One Evoke leaves a full-HP Elite or Boss of your level or higher on 1 HP, never kills it outright.
- [ ] MEND and WARD heal and shield by about 10 and 12 times the level factor, better with Intelligence and Brain Power.
- [ ] Edge Word (Evoker blade) only triggers on your own turn, not on an opportunity attack.
- [ ] STEP onto a trap or hazard sets it off.
- [ ] A drawn glyph does not vanish when an enemy's opportunity attack interrupts you.
- [ ] An enemy walks round a Sigil field that would kill it instead of into it.

## 5. Outbursts (rules 1.8, 1.17, 1.19, 1.24, 1.26)

- [ ] Stage steps read x0.8 / 1.0 / 1.2 / 1.4 / 1.6; a plain Pump adds 0.2 and costs 1 AP plus a tenth of the Begin's MP.
- [ ] A feeling can go into an Outburst only once. Using the same one twice is refused.
- [ ] Calm lowers the multiplier by 0.4 (and rolls twice, no critical); Relief removes 2 Strain and lowers it by 0.2.
- [ ] Rage +0.5, Shame +0.5 for 8 HP, Abandon +0.8 once, Grief +0.5 once an ally has fallen, Fear throws you back 2
      tiles, Joy crits on 18 to 20, Hope cleanses, Guilt taunts, Longing only extends reach.
- [ ] Only one free stage a turn, whatever the source. Empathy 7 lets a held Outburst swell without Strain.
- [ ] Max MP follows Determination and Insight, not Virtue. A caster at level 1 has about 400 MP.
- [ ] Linger with Inverse leaves no field (provisional).
- [ ] The Outburst steady turn is about 135% of a rifle, the biggest Release about 165%.

## 6. Faith (rules 1.6, 1.21, 1.22, 1.26)

- [ ] Seven Whispers; Rebuke hurts. A Whisper turn is a modest 80% of a rifle turn at best.
- [ ] A Hymn turn is about 150% once Devotion is 5 or more. At Devotion 3 only Hymn I and it is weaker.
- [ ] The Hymn wait is 9 - 0.75 x Faith - 0.25 x Virtue rounds, never under 3. Check it on the Hymn button.
- [ ] Fulfil a vow in a fight: the wait drops by 1 round.
- [ ] Thunderclap, Lightning Rod, Judgement and the Saints' Verdict deal damage. Cut Short never locks out the same
      enemy two rounds running. Hold the Gate has its own 6-round wait.
- [ ] Witnessed: +2 on the next attack after a kill made while Witnessed (not every attack).
- [ ] Prayer heals follow your level (Warm Hands 13, Saint's Shield 16, Absolution 9 at the base).
- [ ] Absolution also ends Prone, Bleeding and Dazed. A broken vow unlocks Shame.
- [ ] Together (the Matchmaker's Hymn) lasts until the caster's next turn.
- [ ] Interventions and a Miracle still play their cut-in.

## 7. Healing and shields (rules 1.20, 1.23)

- [ ] A healer's turn is about one Soldier-turn of enemy damage at every level, not three to seven as on live.
- [ ] An area heal heals each ally for 40% of the single number.
- [ ] Medic's kit numbers are small and grow with level: Triage 5, stim 6, Rally 6 at the base.
- [ ] There is no round limit on healing (withdrawn).
- [ ] Rally's preview shows the new number (6), not 20.
- [ ] Resupply also reloads the off-hand gun and never takes Supplies over the maximum.
- [ ] Field Medic makes Triage cheaper; the Warden's Ward is priced by the same rule.

## 8. Enemies and how they pick targets (rules 1.15, 1.23, 1.25)

- [ ] Enemies get tougher with your level; a Vermin dies in one hit; at equal level they hit you about 65% of the time.
- [ ] A fight is never lost to a one-shot from an Elite or Boss because of a level gap.
- [ ] Enemy fire spreads over the squad instead of piling on one character; Boss escorts do not all stand on the
      same target.
- [ ] Enemies go for whoever is healing most: Soldiers lean towards the healer, Elites and Bosses hunt them.
- [ ] A Boss has 820 HP at its level and the Boss fight lasts about 5 to 8 rounds for a damage squad.
- [ ] Enemy techniques aim at the target chosen, not at the first character in the list.
- [ ] Enemy intents on the turn bar never name an action the enemy cannot pay for.
- [ ] A Stunned or Dazed enemy shows the right AP on its next turn.
- [ ] Your AP perks (Grim Reaper and the like) work once every three turns.
- [ ] Enemy blasts scale with their tier and level.
- [ ] An enemy with a loose-loaded gun (scattergun, bow, breacher tube) still closes to melee instead of reloading
      (known, left alone).

## 9. Maps, camera, sight

- [ ] Maps are up to 26 x 26; sides start 10 to 14 tiles apart.
- [ ] The camera follows your unit and a moving enemy; **M** shows the whole map; scrolling does not make effects or
      damage numbers float away from their tile (confirm by eye).
- [ ] Select an area technique (the Lob) in the fog: **unseen enemies are not marked or named** in the red squares.
- [ ] Hide, then see who loses sight of you. Hide refuses with a clear reason ("An enemy can see you..." or "Marked").
- [ ] Open a door: enemies behind it appear. Walk into a mine or toxic tile: it hurts you and scales with level.

## 10. Costs and the screen

- [ ] Every row on the Move, Attack and Utility tabs prints an AP cost. (Bug 12: say which action showed none, if any.)
- [ ] Two-key hotkeys work: 11 is a move, 42 is Evoke; each button shows its code.
- [ ] Shove with Siege Engine costs 1 AP on the row, the pips and the chip. Sprint with Drill Echo costs 1; Disengage
      with Live to Fight Another Day is free once.
- [ ] A Prone unit's move rows say "Stand up first (1 AP)". A row short of AP says "Needs N AP." (never "No AP left").
- [ ] Text changes you may notice: a technique's panel drops "1 round" from its name; its odds read "Keel: hit 65%
      need 8"; a perk's panel no longer ends "Confirm to use it"; a shove out of reach says why; Release's hover
      drops the shape line; a prayer's extra line starts with its odds.
- [ ] Every action in every tab (basic, weapon, techniques, perks, class moves, Calls, prayers, Sigils, Outbursts)
      can be picked, previewed and confirmed. Calls, prayers and Sigils behave as before.
- [ ] Hold a shot, Pull free, Reload both, Load and the stim on a Downed ally show believable costs.
- [ ] Perks, traits and class moves that were rewritten as data (about 20) still do their job: Pain Eater, Central City
      Kid, Last Wall, Used to the Pain, Speed Loader, Bleed the Flux, Siege Engine, Right of Way, Heavyworlder,
      Grenadier's Arm. A card's text still shows the right number.

- [ ] **One hover card everywhere:** hover any button, chip, meter, feeling or icon on every screen: the game's dark
      card shows (one at a time, inside the window, also on keyboard focus), never the browser's own yellow box.
- [ ] **One fact, one place:** in a fight, Heat, rounds, Momentum, Strain, Flux and MP each show once (the unit panel
      or the HEART panel); the line under the tabs does not repeat them. A feeling shows one step chip and its text
      once (the HEART panel, the Magic tab, creation). Granting many feelings at once shows ONE "new feelings" card.
- [ ] **Nothing shelved advertised:** a Sigil word card has no "Grand form" line; the module picks offer no advanced
      class module.

## 11. Co-op with a friend (including fog)

- [ ] Two players in one room: both reach the fight, the turn order works, "request a turn" and the host skip work.
- [ ] **Fog:** the guest never sees an enemy the guests' side cannot see (not on the map, not in the turn bar: it
      shows a blank "Unseen hostile" card). When an unseen enemy shoots, the guest sees the hit land and nothing at the
      shooter's tile.
- [ ] An enemy walking out of sight finishes its walk on screen into the fog, then vanishes.
- [ ] The host with an AI Narrator sees what a guest sees. A host who narrates ("I'll narrate") sees everything and
      the shading of the players' sight.
- [ ] The fight log may still name an unseen enemy (known: the log is not fogged yet). Note anything that leaks.
- [ ] Proving Ground team fights: the other side's glyphs and decoys show only on tiles your side sees.
- [ ] A preview from the guest's browser does not know about hidden enemies (a move into an unseen tile may look open
      until the engine refuses it).
- [ ] Reload the guest mid-fight: it rejoins in the right place.

## 12. Saves from 0.22.0 still load

- [ ] Load a save written by live 0.22.0 (a mid-fight one if you have it, and a long campaign one). It opens and plays on.
- [ ] A fight saved mid-way by an earlier build forgets, once, a few limits: a Hymn's wait, a Whisper this turn, the
      AP perks' cooldown, a Call used this turn, Quicken once a round. They are right again from the next round.
      Check nothing else changed (HP, AP, positions, conditions).
- [ ] An Emanator from an old save keeps its share of the MP pool (re-spread to Determination and Insight).
- [ ] Characters saved as drafts open and can join a room.
- [ ] Closing the tab right after a click and reopening: you may lose at most the last click (the save now follows
      the click by a moment). Tell me if you lose more.

## 13. Bugs from your 0.22.0 playtest (confirm by eye)

- [ ] 2 Glyph that vanished after an opportunity attack: it stays.
- [ ] 3 Thumper Suppress draws what the weapon fires, not rifle bullets.
- [ ] 5 Thumper Lob: the blast, damage and HP bar wait until the grenade lands.
- [ ] 7 Suppress: the rattle starts with the first flash and damage comes with the last round (plain burst and auto
      sound still lead the first flash by about 100 ms; left as is).
- [ ] 8 Effects stay on their tile while the map scrolls.
- [ ] 9 The last blow, yours or the enemy's, plays its animation.
- [ ] 10 The enemy does not act while your-turn card is up (retry a wave, enter a new wave).
- [ ] 11 Next wave: you do not drop dead with no card or effects; Shaken carried from a lost attempt is expected.
- [ ] 13 Portraits stay the same for a character through turns and scenes.
- [ ] 12 AP cost on the bar: which action still shows none? (Waiting on you.)

## 14. Calls I made for you: reverse any

Each is built. Tell me the number to reverse. Reasons are one line each.

1. **A save is a save.** Every save takes save-changing items (immunities, "next save" bonuses): one rule instead of
   eight, and items now work on hazards, talk-downs and technique saves.
2. **Forced movement: nobody reacts to a push, pull, throw or teleport** (traps, fields and hazards act on the moved
   unit): the Shove-into-a-held-Watch trick is gone; one switch in `data/rules.json` `forced_movement` brings it back.
3. **One order of multiplication for all damage** (each term in turn, then the target bonus): it is what spells and
   prayers already did; 14 golden lines changed by 1 point.
4. **Bleeding is 3 rounds everywhere** (Cleave, Cruelty and the like now bleed 15, not 5): the Conditions table says so.
5. **Both immunity doors:** an immunity stops a condition whoever applies it, by any route.
6. **Armour is never below 0.** No current case; a safety rule.
7. **An item's bonus on a spell goes beside the base** (multiplied with it), made whole once.
8. **Blasts, splash, traps and thrown items fire "damage out", opt-in:** five items (Pain Eater, The Brightest
   Light, Humanity First, True Name, Case Closed) now boost a grenade; Demolitionist's bonus stays after armour.
9. **A grenade is not "your attack"** for Judgement Day, Moon Hunter and Ghost Soldier: unclear in the text.
10. **Fire doctrine by tier; the idle-pair target retired; a Boss's escorts spread off its target:** fixed aim made
    enemies pile on one character.
11. **Enemies keep the three-roll Burst** until their table is refitted: not touched on purpose.
12. **One constant per system, no ladder** (all-in sits a little over its ceiling early, under late): a ladder needs
    class ranks and Mastered perks first.
13. **The gun's dial is Masterwork's damage** (x1.1 became x1.0; Relic and Celestial too): most of the gun premium came
    from there, and the plain rifle must not move.
14. **Melee's dial is a x1.35 factor on every melee blow a character strikes,** the Tank included.
15. **Prayer damage takes no Level term:** with it the Hymn turn was 224 to 249% at levels 10 and 20.
16. **Elemental damage gives no bonus** (no slope; Expression keeps the glyph AP).
17. **Boons and Soul shields keep a slope through their own landed Stat** (`sigil_mend`, `soul_mend`), so they still grow.
18. **Flat things made by nobody (hazards, traps, barrels) grow with the enemy table at the fight's level;** made by
    an enemy, by its own tier and level.
19. **The thrown factor (x0.7) is for consumables only;** a launcher's shell (thumper, breacher tube) keeps its number.
20. **Half a target for each extra target** is the area rule (cluster 2.4 / 2.8 / 2.95); CHAIN stays 17% over.
21. **Guard bands:** average +/-12%, each level +/-25%, Hymn low end 55%, Whisper high end 140%.
22. **Brief and Encore:** AP a kill gives inside an Encore repeat is kept; a Brief that paid is used up.
23. **Heavy Bolt's push is a Body save;** Finish It counts a Stunned target; Crawler-Blooded burns on the Blessing's
    patron; Absolution also ends Prone, Bleeding and Dazed; a broken vow unlocks Shame; Order refuses a Suppressed ally.
24. **Together lasts until the caster's next turn;** the protect tag fires on Brace and Interpose.
25. **The breacher tube's blast is 60 within 1 tile** (it dealt the full 110 to everyone).
26. **A non-character allied caster casts MEND and WARD at a character's bases** (10 and 12), as built.
27. **Sixteen text-and-number rulings** (spec items 1500 to 1513 and 1640 to 1646), each at my recommendation:
    higher ground not built (1500); the 3 AP surprise round struck (1501); full auto fires the corridor the engine
    fires, not a cone (1502); Case Closed +20% and Stand Still as recorded (1503); glasses and the mask cost 1 AP in a
    fight (1505); the buckler's Parry is the technique's +2 (1506); One Breath +3 or +4 in all (1508); Fire Sermon once
    per prayer (1509); the weapon and property rulings (1513 a to p); Momentum and Guard points as ruled on 10 Nov
    (1004 / 1642); the Toll-Keeper's and Mother Ember's interventions (1640); four cards moved to the engine's
    reading (1641); rows for Smitten, Scorned, Hopeful, Last Turn, Guarded, Inspired (1643); Mind Without Fog's old
    sheets (1504); Linger with Inverse leaves no field (1510).
28. **Saved-state timing:** the game saves right after a click rather than inside it, so a crash can lose one click.
29. **Not decided for you:** the all-in 7/1/1 builds sit over every ceiling (gun 148 to 228%, Outburst 190 to 270%);
    is the ceiling for a normal share only? Waiting on your word. Also nothing goes live without your word.

## 15. The M813 run with a friend (the first playtest's list, kept)

This was `docs/playtest-checklist.md` (a second file whose name differed only in case, which a Mac or Windows
checkout cannot hold beside this one); merged here on 13 Nov 2026.

Two browsers, two locations, Anthropic key on the host. Tick what works; note what breaks, what confuses, and what feels slow or dull. A screenshot plus one line ("expected X, got Y") is perfect.

### Before you start
- [ ] Both of you load the site; the loading bar finishes.
- [ ] Each makes a character (try Generate, an archetype, traits, a kit) and locks in.
- [ ] Host opens a room, copies the invite; the friend joins from the link.
- [ ] Host pastes the API key and picks M813; Start session.

### The tutorial (shield line)
- [ ] The opening names the shield line and asks "How many of us can you carry?"
- [ ] Voice lines appear, and only for you (ask your friend what they saw).
- [ ] Ask a skill (Skills tab); once per scene.
- [ ] Move on the area map; the "what's here" line explains tiles.
- [ ] Open Sergeant Nine-Nine and Examine him; the Narrator writes or uses approaches.
- [ ] Try an approach: the roll, the Echo reroll, the result; the try stays on the object.
- [ ] Sprint across no-man's-land or read the ground: does anyone spot or step on the mine?
- [ ] Use "Say" and normal speaking; the Narrator answers everyone together.
- [ ] Does the Narrator use character names, never yours?
- [ ] Does it pace one thing at a time, like a tutorial, or dump everything?

### The first fight
- [ ] The fight starts where you stood; enemies are on open tiles.
- [ ] Move, shoot, aim, take cover behind the stakes (−5 shows on the odds).
- [ ] Hover tokens: allies show everything; enemies only after Analyze.
- [ ] Reload early (the magazine drops), pick it up, load it.
- [ ] Attack an object (stakes, a barrel), with a gun and with a melee weapon (the log says shoots or smashes); cover breaks into rubble.
- [ ] Get injured (crits); see it on the Status body.
- [ ] Try the new actions: Sprint, Disengage (no opportunity attack), drop prone, Shove, Overwatch, Burst or Full auto.
- [ ] Fog of war: an enemy behind the pylon shows as "Unseen hostile"; you can't target what nobody sees.
- [ ] Your weapon's skill shows under Attack & defend; durability drops as you fire.
- [ ] The fight ends; the Narrator's aftermath mentions what actually happened.

### The ramp (rear pad)
- [ ] Travel there (ask via the exit, or the Narrator moves you).
- [ ] Try different angles on Keel, the platinum, Ilse, the hatch.
- [ ] Do your successes change how the talk or the fight goes?
- [ ] If it turns into a fight: is it hard, fair, and readable?

### Gear and loot
- [ ] Does the Narrator hand out loot (search a body, open a locker)?
- [ ] Equip it: a new weapon in the main hand, a shield or torch in the off hand, armour pieces, a mod. Do the numbers change where you expect?
- [ ] Carry too much: you become Overburdened and slow down.
- [ ] If you reach the outpost: is the darkness readable, and do lamps help?

### Music
- [ ] Each area has its own music; a fight switches tracks, and "The ramp" has its own theme.
- [ ] The credit pops up on every change; the ♪ panel shows the title, artist and licence.
- [ ] Pause and volume affect only you (ask your friend).
- [ ] Put a YouTube link in Favourite Song at creation; it says "Plays in the game".
- [ ] A spotlight: a nat 20 on a Hard check, an elite or boss kill, or a revive plays that character's song for both of you.
- [ ] With a music trait (Headbanger and the others): Play my song, Keep it playing, and the +1 shows on rolls.

### Saving and coming back
- [ ] Save; leave; Resume from the title screen.
- [ ] The friend refreshes mid-round and lands back in place.
- [ ] Level up when XP allows; earn a class at level 3.

### Feel (one line each)
- [ ] Did you care about Nine-Nine, Seven-Seven, Hum, Lantern by the ramp?
- [ ] Was any turn waiting too long on the Narrator? Roughly how long?
- [ ] Cost: the dollar figure in the story header at the end.
- [ ] One thing you'd cut, one thing you wanted more of.
