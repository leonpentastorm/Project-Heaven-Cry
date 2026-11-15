# The nine doors: what was done, how deep, how distinct, against peers (16 Nov 2026)

For Leon. Read from the code and data of `origin/wip/feature-0.29` at 2fef47c7, and `origin/release/0.28.3` for the
hotfix. Counts are from the data rows, not from the drafts. The drafts say what was designed. The audit's scores are in
`2026-11-nine-doors-audit.md` (branch `wip/design-nine-doors-audit`).

## 1. What was done

**Hotfix line 0.28.3 (on `release/0.28.3`, not yet merged into 0.29)**
- BUILT: the field after a fight is the same fight, still running, with no turns and no AP limit.
- BUILT: Bonds and Tending effects on the map (`fx/bonds.ts`). They are not on the 0.29 branch yet.
- BUILT: the camp reads as a checklist. A tank's Recommended kit is a one-hander and a Buckler.
- BUILT: the Give amount control (a typed number, MAX, held total). Selling counted items.
- BUILT: the Essence (XP, cracked with any focus, one per rest).
- BUILT: Syphon through the Attuner, with a floor from the mana meter.
- BUILT: healing costs three times the MP (Mend 8 to 24, Shield 10 to 30, Rally 20 to 60).
- BUILT: the tank fit. The core op `roll_with`, the soak at 6, the Guard pool capped at 4. It is also merged into 0.29.

**Systems (the Balance 2.0 pieces)**
- BUILT: weapon mods as data (20 mod rows) and the recoil field.
- BUILT: special rounds by calibre.
- BUILT: melee damage scales from Strength or Agility. Pull Out.
- BUILT: variants. 20 hand-made items over 12 kinds.
- BUILT: the 18 alpha perks rebuilt (two per door) and measured (`2026-11-alpha-perks-measured.md`).
- BUILT: the Outburst damage base moved from 31 to 37. The level-5 peak band was widened to 212.
- FOUND: the Sigil Line multiplier's player text still says ×1.7 / 1.75 / 1.8. The data reads ×1.87 / 1.93 / 1.98. The text is shown through `glossary.ts` and has digits typed into it.

**The nine doors**
- BUILT: Guard 2.0 slice 1. Plates, BLOCKED N, Guard Broken, Set Against the Blow, Close Guard, Retort, Challenge, Slam, Last Plate.
- BUILT: Momentum 2.0. The counter chip, the four finishers, Launch, Charge Carries, Wrecker, Breach.
- BUILT: Pressure 2.0. Fire and Move, Relocated, Slide, Near Miss, Shaken Nerves, Flush Out, the fire lanes.
- BUILT: Shadow 2.0 slices 1 and 2. Hide at 1 AP, Go to Ground, First Shade, Tag, Ghost Kill at Ingenuity 3, hide spots shaded, FOUND.
- BUILT: Figments 2.0 slices 2 and 3. An order for every form, Glimmer, Redraw, Cash in, Snare, Hand, Ward, Husk, Sentinel, and the forks at Visualization 3 and 5.
- BUILT: Bonds 2.0 slice 1. Tug, Snap, Last Thread, the numbers on the Bond card.
- BUILT: prayer 2.0. The Canticle with verses I to III, Amen, Holy Dread, Last Rites, and the Whisper, Hymn, Smite and Ward effects.
- BUILT: the Sigil and Outburst door slices. The first-turn tab, the lean and recoil, the charge and Flux chip, the Outburst lines on the turn card.
- DESIGNED: every door's growth with choices (forks, practice, found tricks). It waits on P1, P2 and P8.

**The monk**
- BUILT: the Open Hand glove family. Open guard −2, Sway, Breath, and four forms (Jab, Palm, Sweep, Snatch). Flurry, Trip, Grapple and Riposte come with the gloves. It rolls with the better of Raw Power and Dexterity.
- DESIGNED: Flow and Closing Strike (they wait on P9), and the camp's Recommended wraps.

**Onboarding**
- BUILT: a `door_line` on all nine alpha skills and a `door_tab` on six of them.
- BUILT: one door tip a fight. The first turn opens on the door's tab.
- BUILT: the Canticle's class door line, the Hymn's "HYMN IN N", the Momentum counter.
- FOUND: Durability, Raw Power and Dexterity have no tab of their own, so the fight opens on Attack.
- FOUND: the Recommended kit has no focus for Faith, Ingenuity or Durability on 0.29. The 0.28.3 Buckler fixes Durability.

**Art**
- BUILT: the artist's 14 Figment portraits and 24 trait and order icons. All 10 live forms show a portrait.

## 2. The nine doors

"Actions" counts what can be pressed. "Reactions" counts Answers and automatic rules.

### Endurance · Durability · Guard · Bulwark
- **Only this class:** "I stand in front and nothing gets through me."
- **Level 1:** the Guard technique is on the Attack pad with any weapon. There is no door tab.
- **Can do:** 5 actions (the Guard technique, Brace, Challenge at Durability 3, Slam at Durability 5, Second Wind at 5). Draw Fire comes from the class. With a shield, 3 shield techniques. 4 reactions (Close Guard, Retort, Interpose, Take the Hit). 3 passives (rolling with Durability, Set Against the Blow, Last Plate). Rank II and III add Shrug It Off, Anchor, Unbroken and Reactive Plate.
- **Resource:** Guard, up to 4 plates. Each plate soaks 6. The plates are drawn on the token.
- **Alpha perks:** Weight of the Wall (damage for each Guard held). Answer in Kind (damage after you are hurt).
- **Effects:** plates, BLOCKED N, Guard Broken, BRACED, the stance arc.
- **Growth:** a fixed ladder with no choice.
- **Missing:** Wall, Stand Behind Me, Hold the Gap and Weather the Volley. The shield's own swing (P9, P11). Who the enemies aim at (G3, needs a `within` aura on the condition op). The paths and plates worn (P8, P2).

### Strength · Raw Power · Momentum · Breaker
- **Only this class:** "I build up and then throw a man across the room."
- **Level 1:** melee techniques on the Attack pad and the counter on the token. There is no tab.
- **Can do:** 28 melee techniques in data (5 Openers, 10 Strikes, 5 Links, 5 Finishers, 3 Answers), plus Grapple and 4 shield rows. A character starts knowing 2 and learns more through weapon drill (300 / 900 / 1800). The Breaker adds Launch, Shove, Charge Carries, Four Ways to Finish, Wrecker and Breach. Higher ranks add Riposte, Unstoppable and the finisher move.
- **Resource:** Momentum, up to 5, shown as a counter chip.
- **Alpha perks:** Keep Swinging. Iron Grip (Grapple).
- **Effects:** an animation for each technique, the Launch heave and flight, smash shards.
- **Growth:** techniques per weapon family. This is real choice.
- **Missing:** Every Blow Counts and Idle Bleeds (held after measuring). The Run Carries, Into the Wall and Hurl (P12 to P14). Demolisher and Duelist (P8). The push preview.

### Agility · Dexterity · Pressure · Skirmisher
- **Only this class:** "I pin them down and never stand still."
- **Level 1:** Slide and the ranged techniques on Attack. There is no tab.
- **Can do:** 32 ranged techniques (9 Fire, 6 Press, 7 Sets, 6 Takes, 4 held shots), plus Slide. The Skirmisher adds Reflex (2 reactions), Fire and Move, Relocated, Break Them, Speed Loader, Duck and Roll, Run and Gun and Killzone. The door gives Near Miss, Shaken Nerves and Flush Out.
- **Resource:** Pressure on the target, as pips with Pressed, Suppressed and Broken. Heat on the gun.
- **Alpha perks:** Pressure Point. Keep Their Heads Down.
- **Effects:** tracers, the duck, the fire lanes, PRESSED.
- **Growth:** the widest gear space in the game. 68 weapons, 20 mods, 20 variants, special rounds.
- **Missing:** Pin the Suppressed and the Suppressor fork (P9). The enemy AI reading the states (P10). Shared Pressure across a squad.

### Perception · Ingenuity · Shadow · Operative
- **Only this class:** "They never see me, and when they do it's too late."
- **Level 1:** the SHADOW tab. Hide costs 1 AP, and the tiles you can hide on are shaded.
- **Can do:** 3 actions at level 1 (Hide, Tag, and Break as a toggle). Ghost Kill opens at Ingenuity 3. 16 Shadow verbs open in rungs at 3, 5, 7 and 9 (Lift, Decoy, Read Intent, Cut the Strap, Fade, Vault, Open Seam, Foul, Pick, Douse, Timing, Rig, Plant, Disable, Hijack). The Operative adds Mark, Vanish, Toxin, Sabotage, Execution, Called Shot and Tradecraft.
- **Resource:** Shadow (the door's cap, plus 1 for the Operative).
- **Alpha perks:** Long Dark. Shadow Step.
- **Effects:** the FOUND tear, eye lines, hide-spot shading.
- **Growth:** a fixed ladder of verbs with no choice.
- **Missing:** Shade Step and Slip. The Ways forks (P8) and Unseen practice (P2). Parting Cut and Case (pending in data). A fog and light layer.

### Intelligence · Brain Power · Sigils · Sigilist (the yardstick)
- **Only this class:** "I write the spell I need for this exact room."
- **Level 1:** the SIGILS tab with the Evoker in hand. You know 2 words (SPARK, SEEK).
- **Can do:** 40 words (25 Subjects, 4 Reach, 7 Delivery, 3 Burst, 1 Filter). Each word has an inflection. Draw, Evoke and Junctions (Brain Power Mastered). The Sigilist adds Barrage, Core Change, Overcharge, Bleed the Flux, Payload and Stored Spell.
- **Resource:** cores and their charge, and Flux (6).
- **Alpha perks:** Second Clause. Running Hand.
- **Growth:** study picks, copying words, word mastery (at 10 and 30 uses).
- **Missing:** Grand forms belong to a shelved advanced class. Core economy runs out after about 3.5 fights.

### Expression · Visualization · Figments · Rigger
- **Only this class:** "I build the fighters, the walls and the traps I need."
- **Level 1:** the FIGMENTS tab. Picture the Double or the Snare, plus Glimmer, Redraw and Cash in.
- **Can do:** 10 forms (Double, Snare, Hand, then fork A from Eye, Wall and Ward, then fork B from Beast, Blade, Husk and Sentinel). 15 orders. 10 traits, one or two to a design. 2 to 5 ready designs. The Rigger adds Salvage, Overclock, Sleight, Scrap Turret, Field Fix and one more held Figment.
- **Resource:** the Visualizer's charge, upkeep, and the held count (1 to 3, plus 1 for the Rigger).
- **Alpha perks:** Many-Eyed Dream. Wake of the Kill.
- **Effects:** portraits, summon and unmake effects.
- **Growth:** two forks and designs. There is real choice.
- **Missing:** Glass, Ferry, Breaker and Hush, and 12 more traits. Sightings and sketching (P1, P2). Seeing through a Figment (P3). Lucid.

### Insight · Empathy · Bonds and Tending · Mender
- **Only this class:** "I hold the squad together, and the thread cuts both ways."
- **Level 1:** the TEND tab with the Attuner.
- **Can do:** 14 actions (Bond, the Mender's free Bond, Let go, Snap, Tug, Mend, Mend Yourself, Touch, Shield, Settle, Soothe, Raise, Guide, Field Surgery). Passives: Threads, which on an enemy Bond gives a 20% damage share, a 20% echo and +3 to hit. Two more Bonds at Empathy 5 and 8, Hold Down, Last Thread. The Mender adds Triage, the Ledger, Inspire, Take the Weight, Mend and Rally.
- **Resource:** MP and the Ledger.
- **Alpha perks:** Taut Thread. Bitter Balm.
- **Effects:** none on 0.29. `fx/bonds.ts` is on 0.28.3.
- **Growth:** a fixed ladder with no choice.
- **Missing:** the thread kinds (Mercy, Spite, Leash). Draw Taut, Knot, Take It On, Pass It On, Forewarn, Steal the Mending and Pass the Thread (P5 to P8). Found tricks and stitches (P1, P2). Heartbeat's intent on the strip.

### Determination · Will Power · Outbursts · Channeler
- **Only this class:** "I pour what I feel into one huge release."
- **Level 1:** the OUTBURSTS tab with the Emanator. Three starting designs (Heart Bolt, Mend, Heart Wave).
- **Can do:** Begin, Pump and Release, plus Revert, Let go, Steady and Crystallise. 4 schools (Damage has 4 ways). 5 shapes, 7 tones, 34 modules. 25 feelings. The Channeler adds Shape, Storm Front, Heart Surge, Iron Heart, Occult Library and Eye of the Storm.
- **Resource:** MP and Strain (the limit is 3 + Will Power ÷ 2).
- **Alpha perks:** Clenched Heart. Resonance.
- **Growth:** module practice, feelings found in play, tones.
- **Missing:** a second school in one design (shelved for an advanced class) and faction Emanators.

### Virtue · Faith · Prayer · Chaplain
- **Only this class:** "My god answers, and the whole squad sings with me."
- **Level 1:** the FAITH tab. Whispers.
- **Can do:** 7 Whispers, then one patron's 3 Hymns, the Miracle and interventions. The Chaplain adds the Canticle (8 patron verses, I to III, Crescendo), Amen, Holy Dread, Last Rites, Ward, Smite, Under the Eye, Blessed Shells, Sanctuary and Judgement.
- **Resource:** Devotion (0 to 10, earned as XP) and the Hymn wait.
- **Alpha perks:** Unbroken Litany. Sinner's Due.
- **Effects:** the bow and line of light, the Smite mark, the Ward seal, the cut-in for a Miracle.
- **Growth:** the patron is the build (8 patrons or the Atheist). Devotion is slow.
- **Missing:** Hallow, holy ground and the Office (P11, P3, P8). The patron's eye before you act.

## 3. Depth against Sigils

**The yardstick.** A spell is 2 to 4 glyphs. It needs a Subject and a non-Subject, with at most one kind of Reach word. Words may repeat. With all 40 words that is about **125,000 word strings**. A character can know 4 plus Brain Power words. At 11 known words it is about **1,000**. At level 1 (SPARK and SEEK) it is **6**. Each string is then drawn in 8 directions and fired along or across. A Sigil turn holds **4 to 6 real decisions**: which word, which tile (drawing is moving), which direction, extend or Evoke, which end or side to stand on, and the cores and Flux left.

**Outbursts on the same axes.** A design is a school way (7) × a shape (5) × a tone (7) × up to 3 of 34 modules at Will Power 7. That is about **1.6 million designs** on paper, of which 5 are ready at a time. A turn adds the stage (0 to 4) and one of 25 feelings on each Pump, so **3 to 5 decisions**. It is as deep as Sigils, with less grid in it.

| Door | Things to do | Decisions a turn | Space (builds or turn lines) | Grid 0-5 | Growth 0-5 | Feel 0-5 | About this share of Sigils |
|---|---|---|---|---|---|---|---|
| Sigils | 40 words, Draw, Evoke | 4-6 | ~10³ mid-career, 10⁵ ceiling | 5 | 5 | 4 | **100%** |
| Outbursts | 4 schools, 5 shapes, 7 tones, 34 modules, 25 feelings | 3-5 | ~10⁶ designs | 3 | 5 | 5 | **95%**: as deep, less positional |
| Pressure | 32 techniques, Slide, 8 class rows | 3 | gear: 68 × 20 mods × 20 variants | 4 | 3 | 4 | **55%**: deep through gear, not through the door |
| Figments | 10 forms, 15 orders, 10 traits | 3-4 | ~450 designs, 12 fork paths | 4 | 3 | 3 | **55%**: real building, half the forms |
| Momentum | 28 techniques, Launch, 5 class rows | 2-3 | techniques × 12 weapon homes | 3 | 3 | 4 | **45%**: the chain is real, decisions are few |
| Shadow | 3 at level 1, 19 verbs by rung | 2-3 | 1 ladder, no forks | 5 | 2 | 3 | **35%**: the map puzzle is good, the growth is fixed |
| Prayer | 7 Whispers, 3 Hymns, Canticle, 9 class rows | 2 | 9 patron flavours | 2 | 3 | 4 | **35%**: rich flavour, thin turns |
| Bonds | 14 actions | 2 | 1 ladder | 2 | 1 | 1 (3 with 0.28.3) | **25%**: a healer with two new verbs |
| Guard | 5 actions, 4 reactions | 1-2 | 1 ladder | 3 | 1 | 3 | **20%**: attack, then Guard, most turns |

**Still shallow after tonight: Guard, Bonds, Shadow and Prayer.** Each got its slice 1. None got its choices. Every
door's fork waits on **P8**, and its practice waits on **P2**. Bonds also needs P5 to P7. Guard needs G3 (enemies that
care) and P9 to P11. A tank's turn is still one attack and one Guard press.

## 4. Distinctness

| Overlap | Verdict | What would separate them |
|---|---|---|
| Moving bodies. Slam (2 AP, 2 Guard: every adjacent foe pushed 1 and Off Balance). Palm (a plain blow: pushed 1 and Off Balance). Shove (Breaker rank I). Press (the Wall pushes 1). Launch. Tug. | **Not distinct.** Slam, Palm, Shove and Press are all "1 tile and Off Balance". Launch (distance grows with Momentum, plus damage) and Tug (a pull at any range along a Bond) stand apart. | Slam: no push, but adjacent foes are Held and stuck to the tank. Palm: the push only on the third blow of a chain (Flow, P9). Press: push into a Snare or Wall tile. Drop Shove from the Breaker. |
| Taunts. Challenge, Draw Fire, the Double's Draw fire. | **Not distinct.** All three put the same Taunted condition. The Bulwark holds both Challenge and Draw Fire. | Merge Draw Fire into Challenge. Make the Double's version a lure: they shoot the image, not "aim at it". |
| Damage taken for others. Close Guard (25%), Interpose, Take the Hit, the Ward form (50%), Take the Weight. | **Four copies of one idea.** Take the Hit duplicates Interpose (the Guard draft says so). | Keep Interpose and Close Guard for the tank, the Ward form as a body you can lose, and Take the Weight for conditions only. Retire Take the Hit. |
| Shields. Tend Shield, the Chaplain's Ward, the WARD word, the Outburst buff school. | Distinct in cost (MP, prayer, Flux) but not in what they do. | Give each a shape. The prayer shields a radius. Tending shields through a Bond. The Sigil shield sits on tiles. |
| Pressure against Fear (Shaken, Dread, Rout, Holy Dread) | Distinct enough. Pressure is a meter the squad builds. Fear is one roll. | Let Broken and Shaken stack into surrender (P10). |
| The Mind doors | Distinct: stealth, grammar, bodies. Decoy against Glimmer and the Double is the one overlap (three lures). | Decoy sends them searching. Glimmer takes the shots. |
| The Soul doors | **Healing is in all three, and in Sigils too.** The Channeler starts with a Mend design. Mother Ember heals. | The Mender owns healing at range through a Bond and the cleanses. Outburst Mend should be the burst heal with Strain. Prayer heals the Downed. |

**Each class in a four-player squad:**
- Bulwark: holds the line and takes the blows.
- Breaker: breaks a crowd or a wall and throws the worst foe out.
- Skirmisher: pins the whole field and finishes the Pressed.
- Operative: takes the one target that matters and does the sabotage.
- Sigilist: area control and the one big Line.
- Rigger: extra bodies, cover and traps.
- Mender: keeps everyone up, and the Ledger strike.
- Channeler: the burst turn.
- Chaplain: the squad buff (the Canticle and Amen) and the Hymn.

**Strictly better at someone else's job, today:**
- The gun build out-damages the melee and Sigil builds: 195% with perks against 165% and 197%, and it clears Survival far more often (four gunners 63%, four melee 4%, four Sigil casters 0%).
- With `roll_with`, the all-in tank hits 59% of the time against the gunner's 63%. It clears stage 1 solo 16 of 16 times, against the gunner's 11. **The solo tank is a better solo fighter than the damage dealer.**

## 5. The game against its peers

| Axis | Against whom | Verdict |
|---|---|---|
| Build expressiveness | the big-studio isometric CRPG with a tabletop ruleset | **Level in design.** 27 skills bought freely, nine doors and any mix. **Behind in viable builds:** half the doors cannot win Survival. |
| Tactical depth per turn | the alien-invasion squad tactics series; the grid tactics game about mechs | **Ahead** for Sigil and Outburst casters. **Level** for guns (cover, overwatch, Pressure). **Behind** for Guard, Bonds and Prayer. The mech game's turn is clearer: intent is telegraphed and outcomes are certain. |
| Class identity | the squad tactics series | **Behind.** Their classes have signature verbs. Here, four verbs push 1 tile, three taunt and four heal. |
| Feedback and feel | everyone big-studio | **Far behind.** SVG and CSS effects, little animation. Sigils, Outbursts and melee are the best of it. |
| Onboarding | everyone | **Behind.** It is one line and one tip. Three doors have no tab. There is no tutorial fight. |
| Content volume | the CRPG and the deck-and-path roguelike | **Far behind.** One stage map, a few enemy tables, one campaign. |
| Co-op | the CRPG | **Behind in practice.** 4-player rooms exist, but duos clear less than solos for every build. |
| The roguelike loop (Survival) | the deck-and-path roguelike | **Level in structure** (the path map, shops, Forge, boons). **Behind in tuning:** stage-1 clears run from 0 to 67%. |
| Narrative reactivity | the inner-voices detective RPG; browser AI-narrated RPGs | **Ahead of the browser games**, because the engine owns the rules and the dice are shown. **Behind the detective RPG** in written depth. Its 27 voices are the right idea with a fraction of the words. |

**Where the design matters anyway:** every skill is also a voice. Nine doors each have their own resource. The Sigil
grammar is deeper than any peer's spell list. The rules are the engine's, with a live Narrator on top.

**Where it is thin:** half the doors are slice 1. Parties lose. Feel is thin.

## 6. What still stops "every player does something only they do best and enjoys fighting"

1. **Parties lose.** Duos clear less than solos for every build. Four melee fighters clear 4% of the time, four Sigil casters 0%. A player whose door cannot win does not enjoy fighting. **Smallest step:** scale the encounter budget per head (`survival.json`), and add an Operative, Rigger, Mender, Chaplain and monk row to `survival-run.ts`.
2. **The gun and the solo tank outclass the rest.** The gun with perks is at 195% against a 145 line. The solo tank clears 16 of 16. **Smallest step:** refit Pressure Point and Keep Their Heads Down with the perk steps measured. Cap `roll_with` below the full modifier, or build G3.
3. **Five doors have no choices.** Guard, Bonds, Shadow and prayer grow on fixed ladders, and Momentum's forks are not built. **Smallest step:** build P8 (one fork action for every door) once. After that every door's fork is data.
4. **Verbs overlap.** Four pushes, three taunts, four redirects, healing in four doors. **Smallest step:** a data pass. Merge Draw Fire into Challenge, retire Take the Hit, give Slam and Palm their own geometry.
5. **The tank and the Mender have one-press turns, and three doors open on Attack.** **Smallest step:** merge 0.28.3 (the Bond effects). Give Durability a GUARD tab. Build Guard slice 2: Who they aim at, and Wall.

## 7. Numbers that need your eye

| Measure | Line | Recorded | Reading |
|---|---|---|---|
| Plain rifle, mean | 125 | 117 | under |
| Gun (Masterwork), no perks / both alpha perks | 145 | 162 / 195 | over / over |
| Skirmisher, all in | 145 | 159 | over |
| Melee (blade), no perks / perks | 165 | 168 / 165 | on / on |
| Sigil Line of 4, no perks / perks | 150 to 200 | 176 / 197 | in band / in band |
| Outburst steady, no perks / perks | 135 (band 119 to 151) | 121 / 141 | in band / in band |
| Outburst peak at level 5 | 206, widened to 212 | 210 | over the first band |
| Whisper turn, no perks / perks | 80 | 88 / 90 | over / over |
| Hymn turn, no perks / perks | 150 | 135 / 140 | under / under |
| Chaplain turn, no perks / perks | 125 | 131 / 129 | over / over |
| Figments door / Rigger | 130 / 150 | 119 / 123 | under / under |
| Tank to hit (solo Living Wall) | the gunner's 63% | 59% | under |
| Tank Guard absorbed, solo / beside a gunner | 40 to 50% | 58% / 35% | over / under |
| Holdfast (the dabbler) absorbed, beside a gunner | about 20% | 24% | over |
| Tank stage-1 clears, solo / beside a gunner | 9 to 13 of 16 | 16 / 9 | over / on |
| Mends per full bar (Insight 7 Mender, 250 MP), 0.28.2 → 0.28.3 | no line | 31 → 10 | — |
| Tending heal, % of rifle | 65 | 66 | on |
| Mender offence / Ledger window | 70 / 100 | 68 to 71 / 98 | on / on |
| Healer stall at level 20 | none set | 100% | — |
| Monk solo stage-1 clears (solo blade 7) | no line | 5 of 16 | under the blade |
| Best glove all in (Kemizuchi), L1 / L5 / L10 / L20 | 165 | 122 / 148 / 168 / 140 | under |
| Shadow first window, L1 / L5 / L10 / L20 | 125 | 127 / 137 / 122 / 132 | over |
| Stage-1 clears, gear route: solo / duo / four Sigil | none set | 8% / 0% / 0% | — |
| Stage-1 clears: solo / duo / four gunner | none set | 54% / 13% / 63% | — |
| Stage-1 clears: solo / duo / four melee | none set | 67% / 8% / 4% | — |

Sources: `2026-11-alpha-perks-measured.md`, `2026-11-tank-fit.md` section 3b, `2026-11-balance-2.0.md` section 2.4,
`2026-11-bonds-2.0.md` section 1, `2026-11-unarmed.md` slices 1 and 2, `2026-11-shadow-2.0.md` slice 1, and
`2026-11-baseline-0.29.md` headline 6. Mends per bar are computed from `data/tending.json` and rules 1.24's Max MP.
