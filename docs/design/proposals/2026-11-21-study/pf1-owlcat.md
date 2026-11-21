# Pathfinder 1e, Kingmaker (2018) and Wrath of the Righteous (2021): how the curve is held together

(Fact-checked 21 Nov 2026. Marks: [V] = checked against a primary or near-primary page this pass; [K] = from knowledge, page not reachable; [C] = community source only. Opinions presented as design intent are tagged "(reading)".)

## 1. The 3.5 / PF1 curve

| Track | Rule (PF1 Core Rulebook, Classes chapter; d20pfsrd.com, Archives of Nethys aonprd.com) |
|---|---|
| Base Attack Bonus | Full (fighter, barbarian, paladin, ranger): +1 a level, so +20 at 20 [V, fighter table]. Three-quarter (cleric, rogue, bard, monk, druid): +15 at 20 [K]. Half (wizard, sorcerer): +10 at 20 [K]. |
| Iterative attacks | Extra attacks at BAB +6, +11 and +16 [K], each at -5 from the one before. A full-BAB level 20 attacks at +20/+15/+10/+5 [V]. The later attacks rarely hit, so the real damage gain is smaller than it looks (reading). |
| Saves | Good save = 2 + level/2 (+12 at 20), poor save = level/3 (+6 at 20) [V: fighter at 20 shows Fort +12, Ref +6, Will +6]. |
| Hit dice | d6 (wizard), d8 (rogue, cleric), d10 (fighter, paladin), d12 (barbarian), plus Con modifier each level [K]. |
| Skill ranks | 2 / 4 / 6 / 8 + Int modifier a level (cleric, fighter, paladin, sorcerer, wizard 2; barbarian, druid, monk 4; bard, ranger 6; rogue 8) [V]. Max ranks in a skill = total Hit Dice (equals character level for ordinary characters) [V]. A class skill with at least 1 rank gets +3 [V]. |
| Ability increases | +1 to one ability at levels 4, 8, 12, 16 and 20 [K; the page fetched did not list it]. |
| Feats | One at every odd level (1, 3 ... 19) [K], plus class bonus feats; a fighter gets one at 1 and every even level (11 in all) [V]. |

**Neither attack nor AC has a ceiling** (reading, but a fair one: no rule caps total attack). A level 20 fighter's attack is about +20 BAB, +7 to +10 Str, +5 weapon, plus morale, luck and feats: roughly +35 to +40 (estimate, not a published figure). What keeps attack and AC in step is not a cap but the **expected AC of the monster at each CR** (section 4), which grows about 1.26 a CR (12 at CR 1, 36 at CR 20: +24 over 19 steps) [V]. The attack grows faster (BAB +1, plus stats and the weapon), so on paper a full-BAB character hits more often at high level. The stacking rules (section 2) and the item price curve (section 3) are what slow the run-away (reading).

## 2. Bonus types and stacking: the real balance mechanism (reading)

The rule (Core Rulebook, bonus types and spell-effect rules; aonprd.com): **bonuses of the same named type do not stack; only the highest applies.** Exceptions: **dodge** bonuses stack [C, forum quoting CRB p.179/208]; **circumstance** bonuses from different circumstances stack but not from the same one [C; one poster doubts the wording survived into the CRB, so treat as not verified]; **untyped** bonuses stack with everything unless a rule says otherwise [C]; bonuses from the **same source** do not stack even if the type normally would [C]. "Penalties stack" is stated in the 2e rules index but not found for 1e: **NOT FOUND for PF1** (it is the common table practice). The same spell cast twice never stacks with itself [same-source rule, C].

Named types: enhancement, morale, luck, sacred / profane, competence, insight, deflection, natural armour, armour, shield, dodge, size, resistance, alchemical, trait, racial, circumstance. (The exact count and list was not checked against a primary page.)

What it does in practice:

| Example | Result |
|---|---|
| Bless (+1 morale) with Heroism (+2 morale) | +2. Bless is wasted. |
| Bull's Strength (+4 enhancement Str) with a Belt of Giant Strength +4 | +4. The potion is worthless once you own the belt. |
| Ring of Protection +2 (deflection) and Shield of Faith +3 (deflection) | +3 |
| Ring of Protection (deflection) + Amulet of Natural Armour + armour + Dodge feat | All stack, because they are different slots and types. |

**Why this is the system's balance mechanism (reading, not a designer statement):** each bonus type is a separate channel with its own ceiling, and the worst-case total of any number is roughly the sum of the channels' ceilings, however many buffs a party piles on. Getting more bonus means opening a new type, not stacking a bigger copy of one you have. The stated ceilings (weapon enhancement +5 [V]; stat items +6 [K]; morale about +2 to +4 and luck about +1 to +5 [not verified]) are the researcher's summary. The weaknesses: too many types, so system mastery can find 10+ channels; untyped bonuses leak through the guard; and the unlucky player stacks two same-type bonuses and gets nothing, which makes some choices traps (reading, consistent with forum complaints).

## 3. Wealth by level and the "big six"

Character wealth by level (Core Rulebook Table 12-4, gp): L2 1,000 [V, AoN]; L5 10,500 [V]; L8 33,000 [V]; L10 62,000 [V]; L15 240,000 [V]; L20 880,000 [V]. L3 3,000, L12 108,000 and L18 530,000: **NOT FOUND** this pass (from knowledge). **CORRECTED: the Core Rulebook's guidance for characters built above 1st level is that no single item may be worth more than half their total wealth (and a suggested split of 25% weapons, 25% armour and protective items, 25% other magic items, 15% disposables, 10% ordinary gear). The brief's "no more than about 25% on any one item" was wrong.** [V, https://aonprd.com/Rules.aspx?ID=254]

**The big six** (community term [C]; "the CR math assumes them" is the community's reading, not a Paizo statement):

| Item | Bonus type | Price formula |
|---|---|---|
| Magic weapon +1 to +5 | enhancement (attack and damage) | bonus² x 2,000 gp (+1 = 2,000; +5 = 50,000) [V: +1 flaming uses the +2 row at 8,000], plus 300 masterwork [K] |
| Magic armour / shield | enhancement to armour | bonus² x 1,000 gp (+1 1,000 / +2 4,000 / +3 9,000 / +4 16,000 / +5 25,000) [V]; the +150 masterwork cost is not on the page, [K] |
| Cloak of Resistance | resistance (all saves) | bonus² x 1,000 gp (+5 = 25,000) [V] |
| Ring of Protection | deflection (AC) | bonus² x 2,000 gp (+5 = 50,000) [K; page not reachable] |
| Amulet of Natural Armour | enhancement to natural armour | bonus² x 2,000 gp: 2,000 / 8,000 / 18,000 / 32,000 / 50,000 [V] |
| Belt / Headband (+2 / +4 / +6) | enhancement to a stat | bonus² x 1,000 gp (+2 = 4,000; +6 = 36,000) [K; page not reachable] |

**Price rising with the square of the bonus** is the brake (reading): going from +4 to +5 costs as much as +1 to +4 together for a weapon (50,000 - 32,000 = 18,000 vs 2,000+... see note: the cumulative claim is loose; +4 to +5 costs 18,000 on a 32,000 item, and the prices are not cumulative, so the "as much as all of +1 to +4 together" line should read "about 56% of the price of a +4"). Wealth by level grows about 1.34x a level on average over L5-L20 (10,500 to 880,000 over 15 levels), but unevenly: about 1.43x a level from L5 to L10 and 1.30x from L10 to L20 (derived from [V] numbers). That the slope was "written for" monster AC and saves is (reading).

**Special abilities are priced as bonus equivalents** (Core Rulebook "Magic Weapons") [V]: flaming +1, keen +1 (piercing or slashing only), holy +2, speed +3, vorpal +5 (slashing only) [V]; frost, shock, merciful +1, flaming burst, unholy, axiomatic, anarchic, wounding +2, brilliant energy +4 [K; speed is +3 not "+3 / +4"; the brief's "+3 / +4" mixed it with brilliant energy]. A weapon with any special ability needs at least +1 real enhancement; enhancement alone caps at +5; the **modified total may not exceed +10** [V]. A +5 holy speed weapon is +10, priced as the +10 row (10² x 2,000 = 200,000 gp by the formula; the table row itself was not checked). One currency (the "plus") prices every power; the square makes stacking powers expensive (reading).

## 4. Monster creation and encounter budget

Monster Statistics by CR (Bestiary Table 1-1; https://www.d20pfsrd.com/bestiary/rules-for-monsters/monster-creation/). **Every number in this table was checked and is RIGHT [V].** "Avg damage" is damage per round across all attacks (reading of the table's header).

| CR | HP | AC | High attack | Low attack | Avg damage high / low | Primary / secondary DC | Good / poor save |
|---|---|---|---|---|---|---|---|
| 1 | 15 | 12 | +2 | +1 | 7 / 5 | 12 / 9 | +4 / +1 |
| 5 | 55 | 18 | +10 | +7 | 20 / 15 | 15 / 11 | +8 / +4 |
| 10 | 130 | 24 | +18 | +13 | 45 / 33 | 19 / 13 | +13 / +9 |
| 15 | 220 | 30 | +24 | +18 | 70 / 52 | 23 / 16 | +18 / +13 |
| 20 | 370 | 36 | +30 | +23 | 120 / 90 | 27 / 20 | +22 / +17 |

Read (arithmetic checks out: 370/15 = 24.7x HP, 120/7 = 17x damage, 36/12 = 3x AC): **the hit chance stays near a target, and HP and damage carry the "feel" of growth** (reading). The monster's attack (+30 at CR 20) assumes a PC AC in the mid-30s to 40 (reading; the Bestiary does not say so).

**Encounter budget** (Core Rulebook "Designing Encounters", Tables 12-1 and 12-2) [V, https://aonprd.com/Rules.aspx?ID=252]: XP for a CR (total encounter XP): CR 1 = 400, CR 2 = 600, CR 3 = 800, CR 5 = 1,600, CR 10 = 9,600, CR 15 = 51,200, CR 20 = 307,200 [V]. It doubles every 2 CR [V from the values]. Two monsters of CR X are CR X+2 [K]. Difficulty against the Average Party Level: Easy APL-1, Average APL, Challenging APL+1, Hard APL+2, Epic APL+3 [V]. The table assumes **four or five** PCs; with six or more add 1 to APL, with three or fewer subtract 1 [V; the brief's "party of four" base was slightly off]. Cost of a fight = XP total of its monsters, the same currency as the reward (reading).

## 5. The Owlcat games

- **Difficulty settings inflate enemy numbers, not the tabletop rules.** Settings are a stack of sliders. The claim that "enemy difficulty" shifts enemy attribute, skill, AC, attack and save modifiers by -2 / 0 / +2 / +4 and that "somewhat tougher" adds about +2 attack and AC: **NOT FOUND / not verified**; the Paizo thread (rzs42au0) and Nexus page returned 403 this pass, so it remains community-only [C]. Exact per-preset numbers: not verified. "Core is tabletop-faithful" misreading and Wrath's upgraded stat blocks: community claim, not verified.
- **AC inflation.** Forum reports of "roll 18 to 20 to hit" and PC tank AC 50 to 70: [C], numbers not verified.
- **The buffing ritual.** Real-time-with-pause turned buff stacks into a pre-fight click routine; BubbleBuffs (Wrath mod) casts a saved list [C, widely reported, not re-fetched]. That the difficulty "assumes" the stacks is (reading).
- **Mythic Paths (Wrath).** 10 mythic ranks advanced by story/quests, not XP [C; search snippets from PCInvasion and Steam agree it is story-gated; the Fextralife page did not load]. Rank-to-level timeline (rank 1 about level 6, rank 2 at 8, rank 3 at 10, rank 5 at 15, rank 10 at 20) is a user-compiled Steam list [C, https://steamcommunity.com/app/1184370/discussions/0/3044985412483094205]; rank 10 timing disagrees between posts by path. Ten paths: [K]. Wrath's exact per-rank layout not verified. Addition: the Legend path (unlocked at rank 8) trades all mythic ranks for class levels up to 40 [C]. "Biggest source of numerical blow-out" is (reading).
- **Kingdom and crusade layers:** Kingmaker's kingdom management and Wrath's crusade army battles feed resources and story, separate from character numbers [K].
- **Gear by act.** Loot and vendor stock placed by chapter so wealth follows the curve by placement, not drop rolls: (reading, plausible, not verified).
- **What players say is fun / is not:** build depth, system mastery, big numbers, mythic power vs pre-buffing, trap options, stat-check enemies, difficulty as bigger numbers: forum sentiment [C]; presented here as a summary, not a measured result.

## What PF1 and Owlcat teach PHC (my reading)

All nine points below are the researcher's design recommendations (reading), not facts about PF1; the numbers they cite from PF1 are verified above.

1. **Typed bonuses that do not stack are the cure for "everything is for show", not a spreadsheet fit.** Give PHC a short closed list of bonus types (for example: Gear, Grade, Skill, Perk, Class, Faith, Morale, Cover; dodge-like ones stacking). Each type has a known ceiling. Then a perk at skill 5, a Fine grade and a class rank each add a visible +1 to +3 in its own channel, and the designer can still compute the worst case. About 8 types, not PF1's roughly 17, so it does not turn into trap options.
2. **Keep the hit chance near a target, and let HP and damage carry the curve.** In PF1, AC rises 3x from CR 1 to 20; HP 25x, damage 17x [V]. PHC's d20 with -2 to +9 is a small range: hold Defense near "the expected attack minus 9" (about 55 to 65% to hit), and let HP and damage climb steeply (for example 5x to 10x from level 1 to 20).
3. **Expected gear as a table the enemies assume.** Write PHC's "big six": weapon grade, armour grade, one defence slot, one save / resistance slot, one attribute item. Price each grade step by the square (Standard 0, Fine 1, Masterwork 4, Relic 9, Celestial 16 units), and write the Survival credits curve so a party can afford about +1 every few levels.
4. **One currency for every power.** PF1 prices a weapon property in "pluses" with a total cap of +10 [V]. PHC's mods and special rounds could use a "grade-equivalent" with a cap per item.
5. **A budget that doubles every 2 levels, set against party level.** PF1's XP doubles every 2 CR [V]: one step of difficulty is x1.4 the budget per level, two foes of level X = one foe of X+2 [K], Easy / Average / Challenging / Hard / Epic as level offsets [V]. For 1 to 4 players use the APL +-1 rule (PF1 assumes 4 to 5 PCs, 3 or fewer is -1) [V].
6. **A second progression track, given by story, not XP.** Wrath's mythic ranks show that a separate track paced by milestones (Survival stages and Bosses, or Faith's Devotion), with fewer but bigger steps, delivers the power fantasy that +1s cannot. Warning: it is also what blew out Wrath's player numbers (reading). Its bonuses must use the same typed channels (rule 1).
7. **Difficulty should not just be +N to every number.** If Owlcat's +2 / +4 on AC and attack is as reported [C, not verified], it turns the d20 into a threshold check. On PHC's narrow d20 a +4 Defense is half the skill range. Make difficulty change budget, enemy roles and behaviour.
8. **No pre-buff tax.** If a buff is expected, the engine should apply it (a stance, an aura, a camp loadout) or it should last the whole fight from one action.
9. **Ability increases on a fixed beat and feats every other level** gave PF1 a felt rhythm: something every level, something big every 4 [feat/ability cadence K]. PHC's odd/even Skill-and-Attribute points have the rhythm; the fault is that each step's reward is too small to feel (see rules 1 and 2).

Sources: https://www.d20pfsrd.com/bestiary/rules-for-monsters/monster-creation/ (Table 1-1, verified); https://aonprd.com/Rules.aspx?ID=252 (XP by CR, APL offsets, party size, verified); https://aonprd.com/Rules.aspx?ID=254 (wealth guidance, verified); https://www.d20pfsrd.com/magic-items/magic-weapons/ and /magic-armor/ (cap +10, bonus equivalents, armour prices, verified); d20pfsrd cloak of resistance and amulet of natural armor pages (verified); https://www.d20pfsrd.com/classes/core-classes/fighter/ and /skills/ (verified); dandwiki.com PFSRD:Treasure (OGL mirror, reported by search as listing 62,000 / 240,000 / 880,000); Paizo forum threads on bonus stacking (community, e.g. https://paizo.com/threads/rzs2nas9); Steam Wrath timeline https://steamcommunity.com/app/1184370/discussions/0/3044985412483094205 (community); Owlcat difficulty sources (https://paizo.com/threads/rzs42au0, https://www.nexusmods.com/pathfinderkingmaker/mods/219) could not be opened (403).