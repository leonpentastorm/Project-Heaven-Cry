# Playtest checklist: what to try by hand before this build goes live

For Leon. The build is branch `claude/charming-gauss-hbq4n0` against live 0.22.0 (rules 1.15 to 1.26 are all new to
players). Nothing here is live. Tick a box when it looks right; write down anything that does not and say which line.
Sources: `docs/design/handoffs/PATCH-TALLY.md`, `BUGLIST-0.22.md`, `PICKUP.md` sections 6 and 7, `balance-refit.md`
and the engine hand-offs. "Right" is what the build is meant to do, not a guarantee that it does.

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

- [ ] A greatsword all-in hits about 165% of a rifle; a Defender with a shield hits less but is much harder to kill.
- [ ] Cleave, Cut Edge, Draw Cut, Sweep and Cruelty make the target **bleed for three turns** (15 damage in all),
      not one. Check the bleeding tag counts down 3, 2, 1.
- [ ] Shove an enemy into a wall: it is pushed or holds firm. **Shoving an enemy into a held Watch does not make the
      Watch fire any more** (a call, see list below).
- [ ] Push an enemy onto a trap, fire, mine or hazard: it goes off for the pushed unit. Throw Down, Drag and Bash's
      heavy push do the same.
- [ ] An Anchor Defender cannot be knocked prone by a maul, a wall or a Stop.
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
