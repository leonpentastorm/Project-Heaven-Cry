# The growth bible: the lead's rulings on the first draft (21 Nov 2026)

Binding on every file in this folder. The first drafts (01 to 07) disagreed with each other; two critics listed where (`critic-consistency.md`, 35 findings; `critic-player.md`, 18). These rulings settle every cross-file question. **01-scale.md owns every shared number**; the other files read them from it and type none of their own. Where a ruling below and a draft disagree, the ruling wins. Leon's rulings and the charter (`../proposals/2026-11-21-the-curve.md`, sections 10 to 18) stay above all of this. Everything is PROVISIONAL until played; nothing is fitted to a percentage or a line.

## A. The scale

1. **One factor, x0.6, on every flat number in the game** (damage, HP, healing, shields, armour, soak, plates, cover, hazards, damage over time, enemy HP, items): 01's proposal, not the charter's x0.45. Reason: many numbers hit both sides, and one factor keeps every "hits to drop" count exactly as players know it today; only the changes named in this bible move anything. A hit at level 1 is still one or two digits.
2. **One level column for what characters deal, x1.214 a level (x40 at level 20).** Character HP, armour, soak and plates ride it. Heals and shields ride their own column (01's x65) so a heal stays the same share of a bar. Enemy HP and enemy damage have their own columns, written in 01 and used by 06.
3. **The roll is bounded.** Defense and to-hit do not grow with level, for characters or enemies. The engine's "+1 to hit per level of difference, up to 5" stays as the only way level touches the roll. An Elite's Defense is 14 and a Boss's 15 (06), fixed.
4. **The cards: one rule for all nine.** Each attribute gives +10% a point to everything its door deals or mends (and what else its card says); each alpha skill gives +5% a point. Agility gives its +10% to Dexterity weapons (guns, light blades, thrown); the hidden "pin" goes. Virtue's card gains Blessing power. The attribute term and the skill term multiply each other.
5. **Character HP = (60 + 10 x (Endurance - 1) + (level - 1)) x (1 + 0.06 x Pain Threshold) x the level column.** About 60 and 120 at level 1 (Endurance 1 and 7), about 3,160 at level 20 for Endurance 1 and above 9,000 for Endurance 10 with Pain Threshold 10. Pain Threshold's card: +6% max HP a point (02's), in place of +2 HP a level.
6. **MP is a choice (04's proposal):** pools hold about four full cash-outs and ride an `mp` column; Pumps cost a tenth of the Begin; Syphon and Tending costs are restated on it. Strain's burn is a share of max HP (6% a point), not a flat number.
7. **Margins replace the critical entirely.** Every full 4 over the Defense or TN is a Margin; a natural 20 adds two. A Margin adds a quarter **of the plain hit's own damage** (the weapon or spell before the cash-out's multiplier), plus one percentage point for each point of Perception (25% to 35%). `CRIT_MAX`, the critical multiplier and Dexterity's "+2% critical damage" go; every perk, move and gear field that fed the critical is restated on Margins in 07.
8. **How bonuses combine, and the top of the scale.** Level, attribute, skill, grade and the cash-out each multiply. **Everything else on the sheet (perks, class moves and passives, faith, the target's conditions and position, boons, mods) adds into one sum** before it multiplies. Leon's rule is the test: four digits a hit at level 20, **five for something super, never six**. 01 prints the largest legal turn of a level-20 specialist of each door with a squad's set-up; if any reaches 100,000 the sum's sources are trimmed in 07 until none does. Every door's full cash-out at level 20 must reach five digits (raise that door's Bite at 9 where it does not).
9. **Magic and prayer take a grade:** Sigils the Evoker's, Outbursts the Emanator's, prayer from Devotion (3 / 5 / 7 / 10 as Fine / Masterwork / Relic / Celestial). The grade ladder: Fine +1 to hit and x1.15, Masterwork +2 and x1.3 with a mod slot, Relic +3 and x1.5 with one property, Celestial +3 and x1.75 with two. Armour takes the same steps on its armour value. Relic and Celestial properties cost no boon room.
10. **Caps that only held a reward down go:** the pooled +100% on target bonuses, the critical cap, the half-bar heal cap (the per-round brake stays), the dead Sigil cap. Caps a player sees as rules stay (01's list).

## B. Points and gates

11. **A career is 38 Skill points and 20 Attribute points, creation included** (the data; the lead's "48 and 30" to Leon was wrong). Every spend table uses 38 and 20. So a capped character can hold two attributes at 10.
12. **Gates:** attribute ceiling 7 at creation, 8 at level 5, 9 at 10, 10 at 15; class at 3, rank II at 5, rank III at 15 (needs the class's attribute at 8). **Levels 5 and 15 give 1 Skill and 1 Attribute point, and levels 4 and 14 give 2 Skill points** (a swap; totals unchanged), so the gate and the point that uses it land together.
13. **The specialist's edge: a door's top Reach needs its family.** Reach's step at 7 needs the door's beta skill at 4; the step at 10 needs the beta at 7 and the gamma at 4. With 38 points a character can take one door to its top and hold a second at the step below; two doors at the top is not affordable. PROVISIONAL, flagged for Leon.
14. **A wide character** (four doors at 4 to 5) gets no rank III and no Push in 0.34: its things are many small cash-outs and the tags. Leon's unique advanced classes are where it gets something of its own. Flagged for Leon; not solved here.
15. **Nothing is taken from a live character.** A 0.33 character above a new ceiling keeps its points, and one holding rank III before level 15 keeps it (06 and 05 write the migration; both are tested through the real load path).

## C. Doors

16. **Reach is bought.** Where everyone has the top today (Outburst stage 4, the Breaker's chain, the Operative's Shadow), it moves onto the skill's ladder. What a class had as a bigger counter becomes something only the class can use (each door file names it).
17. **The Push arrives at skill 8 on every door.** Overclock moves from Brain Power 2 to 8 (03 says what Brain Power 2 gives in its place); praying above your standing becomes Faith's Push; Overdraw past the top is Will Power's.
18. **Every door has a cash-out from point 1**, and its Marks are earned by using the door (Guard's by plates soaked as well as by Slam).
19. **A Pressure target's cap** is the best Reach anyone laid on it, less 1 for an Elite and 2 for a Boss. **A heal that Bonds** (04) and **Grace** as prayer's in-fight counter (04): accepted. **Line length rides Brain Power** and words held are 4 + 3 x Brain Power (03): accepted. **Devotion starts at 0** and follows 05's curve; live characters keep what they have.
20. **Every beta point counts from the first** (a flat term in the beta's formula; Athletics gives Defense from 1).
21. **Story perks get fight halves now** (07): this is the last pass on skills content, so no perk is dead in Survival.

## D. Pacing and the world

22. **05-pacing owns every rate**: the XP table, drill (per kill 20 / 35 / 70 / 180 / 360, the martial classes x1.5, thresholds as 05 states), door Marks, study, modules, feelings, Devotion, credits. 02, 03 and 04 quote 05.
23. **The 80%** counts each system the character's doors open; techniques count against all 66.
24. **Survival:** five maps, two levels a map, each map's Boss at 2m + 1, the final boss at level 11; then endless at one level a map to level-20 foes at about hour 40, each map adding a kit. An enemy's level comes from the map and the row, never from the party. Hard, deadly and final fights press harder a round as well as lasting longer (06's rows).
25. **Grades by map (07's split):** Fine on maps 1 and 2, Masterwork on 3 and 4; Relic is found on map 5 and sold only in endless; Celestial is found only, from endless map 10 (the vault and one Boss pick in four). No Celestial before then.
26. **One price for a grade step** (05's formula), read by the shop and the Forge.
27. **Co-op pace:** an `xp.party_pace` row (1 / 1.6 / 2.2 / 2.8 for squads of 1 to 4), PROVISIONAL until a co-op playtest.
28. **A campaign states its tier**; the party's level is only a last fallback for a file with no level anywhere, with a validator warning.

## E. Known and left open (on the roadmap, not solved in 0.34)

- A character with two doors that each need a focus in a hand: Survival gives one free focus. The camp sells a second; the two-door tables count the 1 AP hand swap.
- A room saved in the middle of a fight before 0.34: the builder proposes the migration (rescale on load, or the fight reopens from its start) and the lead approves it before it is built.
- Named Crossings, advanced classes, the fallen form, Weapon Arts, Scars and Deeds, the account's upgrade.

## F. Second round: the lead's rulings on the second critics (21 Nov 2026)

The second pass ended NOT READY (`critic-consistency-2.md`: 37 blocking findings; `critic-player-2.md`: 16). The cause is the method, not the design: seven prose files quote each other's numbers and go stale. **From here the bible has ONE machine-readable source, `tools/balance/bible/*.json`, and one checker, `tools/balance/check.py`, that computes every table and fails on a contradiction, a six-digit turn, a four-digit-or-less full cash-out at level 20, a dead ladder point or an empty hour.** The prose files explain; they carry no number the JSON does not. The builders apply the JSON to `data/`.

29. **The top of the scale is checked with everything legal on the sheet**: the door's Bite, its forks, its perks at tier II, its class moves, the grade, Margins from the best legal to-hit, a squad's one mark on the foe. Each door's largest legal turn at level 20 is at most 99,999; each door's full cash-out with nothing but its ladder is at least 10,000 (Snap All and Slam count their totals across the foes or Bonds they touch). Bites and fork numbers are set by the checker's result, door by door (the second critics' numbers: Break about 102,900, Coup 112,000, the Line 118,100, the Release 111,800 must come under; Snap All must reach five digits at Relic).
30. **A cash-out counts only its own door's bonuses, plus one mark on the foe** (07's two rules): accepted. A foe carries one mark at a time, worth +20% to the whole squad.
31. **One pair to a hit** (01's question): a hit reads the attribute and skill of the door that makes it. A Break reads Perception and Ingenuity, not the gun's pair as well. Expression's and Visualization's cards drop the elemental line (03's question): a Line reads Intelligence and Brain Power.
32. **Alone, "an ally" includes yourself.** Calls, Tending's ally verbs, Triage, Rally and the rest accept the user as their target when the squad is one. No point bought for a door's top is dead for a solo player.
33. **Prayer's grade reads the highest standing the character has reached with its patron**, so a Miracle's price (five levels of Devotion) is paid in Hymn tiers and in the next Miracle, not in every prayer's size for twenty hours. Leaving the patron or a taboo's fall still lowers it.
34. **Overbrace's price is Bleeding on yourself** (an injury roll is one the wall mostly resists). **Slam pays a plain hit plus its plates** (the same "1 +" term a Finisher has), so it is worth pressing at Durability 1.
35. **The vault** gives the map's own best find grade (ruling 25), never the next map's.
36. **One clock:** 05-pacing's hours and squad levels by map are the only ones; 04 and 06 read them.
37. **Co-op pace** multiplies practice gains and Devotion, not XP (05's answer): accepted.
38. **A four-player Boss comes alone** if its cost fills the deadly room (06's question): kept as it falls; the run simulator reads it after the build.
39. **Migration has one owner (05) and one shape** (one revision stamp). A live 0.33 character keeps its points, its rank, every move it already holds and its Devotion XP; perks whose meaning changed give a free re-pick (the existing `perkRev` piece); a stored spell longer than its caster's new Reach stays castable as stored until it is edited. **Whether a live character also keeps its old Reach, or gets one free re-spend of all its points, is Leon's call** (asked 21 Nov); until he answers the bible writes the free re-spend as the plan and the grandfathering as the fallback.

## G. Third round: the lead's rulings on the third critics (21 Nov 2026)

The checker passes (147 PASS). The third critics still found 18 and 11 things, all specific. These rulings close them.

40. **The digits rule is about a hit a player sees.** The cap of 99,999 applies to **each hit** (each foe struck). A cash-out that strikes several foes (Slam's ring, Cleave, Earthbreaker, an area Line, a Wave or Burst, Storm Front's arcs, the Miracle) is capped per foe, and its total is printed beside it. The floor (five digits for a door's full cash-out at level 20) is per hit for the single-target doors and in total for the spread ones (Snap All, Slam). At level 1 the one-or-two-digit rule covers plain hits; a level-1 cash-out may show three.
41. **What a squad adds is one mark on the foe and one gift on the attacker.** Everything an ally lays on a foe that makes it take more or be easier to hit (Marked, Judged, Exposed, Corroded, a foe's given feeling, Spotter) is "the mark": the best one applies, never two. Everything an ally gives the attacker (a feeling given through Inspire or a Bond, given_edge, Benediction) is "the gift": the best one applies. The checker counts the best mark and the best gift in every door's largest legal hit, and their sizes are set by its result so no hit reaches six digits (first numbers: a mark +20% or +2 to hit, a gift +20% or +2 to hit; Spotter and the given feelings come down to that).
42. **The ladder schedule in `data/skills.json` stays exactly as it is** (alpha perk steps at 3, 6, 7, 9 and forks at 4 and 8; beta and gamma perk steps at 3, 5, 7, 9). The bible matches the data; no step moves and no migration row is needed for it.
43. **A retired move becomes its successor on load** (Shape to Afterglow, One More Bond to the ladder's Reach, each class's +1 cap to the door's ladder): the migration lists each pair. Nothing a live character holds is removed without its successor.
44. **Iron Grip tier II** is a plain-hit term and never reaches a Finisher: accepted.
45. **Slam's ring** strikes as many foes beside you as Cleave's rule gives for the plates spent, not every foe from Durability 1. **Overbrace costs a tenth of your max HP** (not Bleeding, which the wall shrugs off).
46. **Implication 1 has a solo half**; the wall's spend plan buys Sensory, Athletics and Guts, not another door's first points.
47. **The Miracle's price stays as Leon's rule has it** (five levels of Devotion; Hymn tiers fall with it): a strong act with a real consequence. Prayer's grade still reads the highest standing reached (ruling 33). Flagged for Leon.
48. **Margins:** a Margin adds 25% plus 1% for each point of Perception (26% to 35%). **The heal column** is derived from character HP (`columns.mend`), not a typed x65.
49. **The checker also checks:** every `{data: ...}` reference resolves in `data/`; a caster's core, charge and MP use over one standard fight against what it carries at levels 1, 10 and 20 (a cost must still be a choice at 20); the best mark and gift (41); the per-hit cap on many-foe cash-outs (40).
50. **The build order's proofs** use only what its own step and the earlier ones have built.

## H. The lead's correction of his own ruling 8 (21 Nov 2026): no reward is shrunk to fit a number

The fourth pass passed the checker (189 PASS) by **cutting rewards to stay under 99,999**: Overflux, Written in Advance and Blood Price to +5% each, the squad's mark and gift from +20% to +15%, Joy's and Marked's +1 to hit retired, camp cores 4 to 3, Empathy 9's MP saving 25% to 15%. That is the mistake Leon named ("balancing like a spreadsheet"; "what is the point of an upgrade system if everything is a derivative to hit a number"), made again by the lead through ruling 8's "never six digits" turned into a hard check. A fork at +5% is not felt.

51. **"Four digits a hit at level 20, five for something super" describes the scale; it is not a cap.** The checker REPORTS each door's largest legal hit; it does not fail on it. It fails only if an ORDINARY turn breaks the picture: a level-20 specialist's plain hit outside four digits, or a full cash-out from the ladder alone (no squad, no natural 20, no Push) outside five.
52. **Every reward is sized to be felt**, by the laws: a fork at least +10% or a new thing to do; perk tiers +15% and +30%; the squad's mark and gift +20% each (or +2 to hit); the trims listed above are withdrawn. Costs that were changed so a cost stays a choice (camp cores, MP shares) are kept only where the checker's fight test (h) needs them, each with its reason in a player's terms.
53. **Whether the perfect alignment may show six digits is Leon's call** (asked 21 Nov): (a) let it (a once-a-campaign number when a full chain, the Push, a natural 20, a Celestial weapon and a squad's set-up all meet), or (b) bring the whole scale down by about a quarter (the level column x30 instead of x40) so the same alignment lands in five digits with every reward still at its felt size. The lead recommends (a).
54. **Also to close before the build** (the final critic's blocking findings): a grade ADDS mod slots to the row's own (Standard and Fine keep the row's slots; no fitted mod is ever lost on load); the Break reads the weapon actually held (its largest hit is reported with the heaviest legal weapon); a chosen feeling poured twice is counted; the checker's fight test includes Syphon; the stale "+20%" texts agree with the JSON.

**The bible is NOT READY** until 51 to 54 are applied and a critic agrees. Nothing is built from the trimmed numbers.

## I. The doors' payoffs come from effort (Leon, 21 Nov 2026, after the effort ledger)

The Bites in the bible JSON were set so each door's biggest hit landed under one shared number. **They are withdrawn.** Leon: "balance the number with reward and effort in mind". The ledger (`10-effort-ledger.md`) counts what each door costs to use. The rule: a cash-out pays back the attacks given up, the resources burned and the turns the counter had to survive the enemy, with interest for the risk. No door is compared with a total or made equal to another. Leon's rulings on the result:

55. **Outbursts are the most consistent magic.** The choice is how to spend a turn's AP: one spell, several, or a spell and something else. Balanced as steady, "but not to a degree where the number is underwhelming".
56. **Figments are already consistent** (placed at 7 to 8 tiles, accurate, attacking on their own with no AP spent walking): they do not also get a large cash-out. The Curtain spends the Figments it uses (they are gone and their charge with them), and is modest.
57. **Melee and guns get Weapon Arts later:** Momentum, Pressure and Guard stand at the ledger's sizes.
58. **Sigils pay the most, with a top.** A caster who only repeats a two-glyph Line every turn sits a little UNDER an Outburst caster of the same skill; only a creative Line that gives up everything else for power reaches the top, about 11 plain attacks' worth at Brain Power 10.

**The worth of a full cash-out, in the character's own plain attacks (first numbers; each door's Bite at its first and last Reach step is derived from these two anchors, and the steps between follow the compounding):**

| Door | At skill 1 | At skill 10 | Shape |
| --- | --- | --- | --- |
| Sigils | a two-glyph Line: a little under an Outburst turn | about 11 for the all-in Line | the biggest single thing; a plain two-glyph Line every turn stays under Outbursts |
| Shadow | 3 | about 9 | nothing dealt while building, then one hit |
| Prayer (the Hymn) | 2 | about 7 | once a fight, safe |
| Momentum | 3 | about 7 | once a fight, three clean turns in melee |
| Outbursts | 2.5 a turn | about 5 a turn | every turn, steady, never underwhelming |
| Pressure | 2 | about 5 | laid by shots fired anyway; its reward is denying turns |
| Bonds | 2 | about 5 | every turn |
| Figments (the Curtain) | 2 | about 5 | spends the board; the Figments' own attacks are the door's steady reward |
| Guard (Slam) | 2 | about 3 | every turn; the wall's reward is the soak |

Unanswered and left as the game has them today: a solo shooter's pips shed each turn; Guard's plates fill in one action. The "felt" lines that named a digit count are rewritten to say what the player gets.

## J. Leon's second set of rulings on the doors (21 Nov 2026)

59. **Two Emanators.** An Emanator, or an Emanator-enabled weapon such as the Emanator katana, in each hand lets a character **begin two Outbursts in one turn**. Filling both takes more turns than filling one; a double Release is worth about 9 to 10 plain attacks. (One hand: about 5 a turn, ruling 55.)
60. **Guard fills fast late in the game, and that is fine.** The place its plates get spent is the advanced class: its skills remove Guard in exchange for a benefit, so a late-game wall spawns plates, does something with them, and spawns more. In 0.34 Guard keeps its quick fill; the base door's Slam stays modest. Noted for the advanced classes.
61. **Prayer's cash-out is the Hymn.** **The Miracle is rarer than a Weapon Art and should break every scale.** **Its once-a-session limit is removed**: a faith build tuned to the point of two Miracles in a five-hour session is hard to reach and is rewarded for it. Its price stays (Faith 7 and Devotion 10 to call it; it costs five levels of Devotion), and that price is the limit.
62. **Shadow's full Break is worth about 9, and it must take real set-up time to get there**, "or else it will be stealth archer all over the place again". The meter fills over turns of staying unseen without attacking (first rule: no more than 2 Shadow a turn from every source, so the full meter of 5 takes about three turns; a Break on a part-filled meter pays for what it holds and no more).
