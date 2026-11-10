# Skeleton 2.0: build plan

Rules 1.13, to ship as **0.19.0**, after Physical 2.0 (0.18.0) is live. One builder: the lead session (Leon, 10 Nov 2026: no A, B, C lanes for this one). This file and `skeleton-2.0-code-map.md` are enough to start from a fresh session.

- **Design:** `docs/design/proposals/2026-11-nine-doors.md`, sections 13 to 16. Where they disagree, 16 wins over 15, 15 over 14, 14 over 13, and sections 9 to 12 are background only.
- **Where the code is:** `skeleton-2.0-code-map.md` (five parts, with traps and the tests that pin today's numbers). Its line numbers are from before lanes A, B and C merged: search by function name.
- **Known bugs found on the way** go in `docs/design/known-issues.md`, not into this patch, unless they block it.

## 1. The rule in one paragraph

Alpha opens a combat playstyle and gates what you deal damage with. Beta is defence and gates what you wear. Gamma is world play and speech: it adds its full points to checks, is called first when talking to a sentient being, and owns everything that gives or takes AP inside a turn (the nine Calls). Making your own action cheaper or dearer is not "AP in the turn" and stays where it is. Old characters are not migrated: a new save every update.

## 2. Before the first line of code

1. Physical 2.0 is merged and live; `develop` is at 0.18.0. Branch from `develop`.
2. Re-anchor the code map against the merged tree (function names, the technique pad and ARMS tab from lane C's result note). Shove, Break, Bind, Bash, Draw Cut and Snap Shot must exist as techniques, because six perk rewrites hang on them.
3. The rulings in section 5 are settled (Leon, 10 Nov 2026); build them as written.

## 3. Stages

Each stage ends green (`npm test -w @phc/engine`, `npm test -w @phc/web`, `tsc` for both, `python3 tools/validate.py data` at 0 errors) and is committed on its own. Spec first, then data, then engine, then tests, inside every stage.

### Stage 0: the check tool

`tools/skeleton_diff.py` (or a vitest script that prints): for all 46 archetypes at creation, and for each at levels 6, 12 and 20 with points placed by the archetype's own weights, print every derived number (HP, saves, strengths by source, crit and ambush taken, ranges, ready designs, healing given and received, shields received, Initiative, passives, check modifiers for all 27 skills). Run it on `develop`, keep the output in the scratchpad, run it again after Stage 1. The diff goes to Leon with the stage: it is the answer to "will this fuck up all the skills".

### Stage 1: numbers, saves, strengths, checks (engine, no new mechanics)

1. **One place for per-point numbers.** Today `skills.json` `per_point.effects` are read by nothing and every number is hard-coded in `character.ts`. Move the moved numbers, and while there make `character.ts` read a small table (`SKILL_NUMBERS`) that the validator compares with `skills.json`, so the data and the engine cannot drift again. Hard-coded copies to fix: `classes/k.ts` (~512), `game.ts` (~787, ~1023 Karma), `effects/damage.ts` (~105, ~116), `perks/d.ts` `SAVE_SKILL`, `perks/f.ts` `heartSave`, `physical/core.ts` `FAM`, `classes/i.ts` (~1153, ~1555).
2. **The moves** (15.1 as amended): HP per level → Pain Threshold; crit damage taken → Proficiency; ambush damage taken → Analysis; Sigil range and core saving → Brain Power; Soul range and ready designs → Will Power; healing given → Empathy; healing received → Camaraderie; shields received → Conscience (a new unit field beside `healRecv`; add it to `GEAR_FRESH`); Karma award → Authority. Initiative, Detection, Vision and sensing do not move.
3. **Saves:** Body Guts, Brain Rumination, Heart Lore Master. `sv` keeps its shape (about 40 test files set it directly). Families and every hook keyed on a family stay.
4. **Debuff strength by source:** one function, `strengthOf(unit, via)`, where `via` is the skill that delivered the condition; `applyCond` callers pass it; `condBy` stores `via` beside the unit id so a per-turn save (Corroded) and a dead caster still read the right number. `u.dbf`, `mg.debuff` and stored spells are re-keyed to it. The four outburst test files that zero `p.dbf` must be updated in the same commit, or they stop zeroing without failing.
5. **Gamma checks:** `checkMod(c, skill)` in `character.ts` (full points for a gamma, 0 points still −2), used at the check sites only (`world.ts` ~436, `game.ts` ~631, ~952, ~1010, `passive()`), never inside `skillRollMod`. The client's own copy (`apps/web/src/screens/shared.js` `mod`) and the Narrator brief's `[+n]` change in the same commit: the dice card must show what the engine rolls.
6. **Narrator:** prompt and tool schema name the new save skills and "gamma first when talking to a sentient being"; the wiki (`glossary.ts`) follows; prompt budget test adjusted if needed.
7. Spec: the Derived stats section, the saves, a rules 1.13 section, and new section 14 items for every provisional number. `rules.json` and `attributes.json` formula strings follow.

### Stage 2: the nine Calls

1. `data/calls.json` (nine entries: skill, steps at 3 and 7, what each step does, save family, helping or hindering) plus a validator check, and `effect_ops.json` entries.
2. `packages/engine/src/calls/` in the shape of `physical/`: `call({id, check, run, ai})`, a `callPad(g, unit)` for the screen, one action `combat/call`, preview and run as one code path (a preview changes nothing: marks from Spot, Warn and Taunt are used up only by a real attack).
3. The ladder from 15: range 5 + 1 a point; step 2 at 3; 1 AP at 5; step 3 at 7; as a reaction once a round at 9; the first Call each turn free at 10. One helping and one hindering Call on a unit a round. No damage.
4. AP rules written down before coding (see ruling 6): what "now" means for an ally who has already acted, and that every AP a Call gives passes through `grantPerkAp` and its cap.
5. `combat/parley`: Threaten becomes the Call; `kind: 'threaten'` stays as an alias so Crowd Pleaser and its test keep working; Persuade and the offer of terms stay as they are.
6. Enemies: `data/enemies.json` gets a `calls` list and a level per tier (no enemy has gamma points); `physical/ai.ts`'s step registry gets a Calls step that plans without changing state.
7. Ids are prefixed `call.` (`call.spot`, `call.rally`, `call.steady`, `call.order`): the bare names are all taken (code map, perks trap 4).

### Stage 3: perks, unlocks, gear gates

1. The list in 15.2 to 15.8: replacements (Heavy Hands, Follow Through, Iron Grip I/II, Both Hands), rewordings (Breaching Strike, Quick Draw, Read, Case Closed, Nothing Gets Past, Still Water, Stand Still, Proven Formula, Tuned, Roll With It II), the nine AP gifts on alphas and betas turned into defence. Kept: Eyes in the Back, True Name, Second Wind, Still Standing, On My Mark, and the eleven own-cost discounts.
2. New ids for replaced perks (`iron_grip`, `both_hands`, `heavy_hands`, `follow_through`); the old ids leave `perks.json`, their art moves out of `catalog.perks` (the validator fails on an orphan), and the two new icons are listed in an art brief for Leon. Until the art comes, the new perks use the old icon by catalog alias.
3. Fix `skill_greek` on the six perks the Dexterity and Athletics swap left wrong.
4. Gear gates (13.3): servo-fist → Raw Power, core rifle → Dexterity, banner → Empathy, heavy armour → Pain Threshold. Also make the `requires` check cover the off hand (it only checks the main hand today).
5. Trait text: every trait whose Composure or Charisma mod used to reach a save, and every one whose Rumination or Lore Master mod now does (list in the code map, saves trap 3), gets its text checked. Default: the mod follows the skill, the text says so.
6. Shelved advanced-class moves still compile and are tested: convert each `applyCond` to pass a `via` (the class's own alpha), nothing else.

### Stage 4: the screen

1. **Calls pad** in the fight panel: a ninth tab, built like the technique pad (chips by Call, cost, range ring on the grid, the save and its TN on the card, greyed with the reason when refused).
2. **Both tab rows wrap** (the character panel with ARMS, and the fight panel with Move, Attack, Utility, Perks, Class, Sigils, Outbursts, Faith, Calls): `flex-wrap`, two lines when they do not fit, the active tab's underline stays with its tab, no horizontal scroll. Tabs a character cannot use stay hidden, as today. Tested at 1280, 1024 and phone width.
3. **Skill cards show what a point gives.** The per-point line is on no screen today; `build.py --web` sends `per_point.text` and unlock text to `protodata.json`, and the skill card and the level-up stepper show them. Without this the pass is invisible to a player.
4. Creation and level-up: saves, HP and ranges preview from the engine functions, not from copies.
5. Screenshots for Leon in `docs/design/handoffs/skeleton-2.0-shots/`.

6. **Scope added after the plan was written** (proposal sections 17 and 18; Leon, 10 Nov 2026: "EVERYTHING in our discussion of skeleton 2.0 is going in"): Core points dropped; Composure and Lore Master swapped; Acuity and Improvisation; the perk and trait pass of section 18; the EPCCG screen (17.5); the archetype cards showing nine attributes (17.4). Stages 1 and 3 carry the engine and data side of these; this stage carries the screens.
7. **The attributes are shown everywhere a point is spent or read** (Leon): creation, **the level-up menu**, the character sheet, the archetype cards. Each attribute shows what a point gives (17.2) beside its stepper, with the change previewed before the point is placed.
8. **The creation skill screen is the main thing to fix** (Leon: "the main painpoint of that feature… people need me to sit in discord with screen share and explain how to get the character they want"). With Cores gone the screen has one gate, Skill ≤ Attribute, and has to explain itself with nobody beside the player:
   - one screen, nine attribute columns (or rows), each with its three skills under it, so the gate is visible as layout: a skill can't rise past the attribute it sits under;
   - **click the skill you want and the attribute follows**: raising a skill past its attribute spends the attribute point for you and says so ("Dexterity 4 needs Agility 4: 1 Attribute point spent"); when the budget can't cover it, the refusal says exactly what is short and what to lower;
   - both budgets always in view (Skill points left, Attribute points left), and what must still be placed before Lock in;
   - every stepper shows what the next point gives, in the game's own numbers;
   - an "I want to be…" entry (the archetype cards) that fills the sheet and can then be edited, so nobody starts from nothing;
   - undo for the last point, and a reset per attribute.
   Leon reviews a screenshot of this screen before the rest of Stage 4 is built.

### Stage 5: review and ship

1. Stage 0's tool again: the before-and-after table for all 46 archetypes, in the hand-off.
2. A review workflow over the whole diff (rules against spec, AP leaks, preview purity, the dice card against the engine), fixes, then the e2e set on a local build.
3. Spec section 14, `CHANGELOG.md`, all four `package.json` at 0.19.0, `docs/ROADMAP.md`, `CLAUDE.md`'s "game in one screen", the hand-off note.
4. Merge and deploy only when Leon says "merge to live". A new backup branch replaces `backup/live-0.17.0` only after 0.18.0 has been live and checked.

## 4. Not in Skeleton 2.0

The four missing playstyles (Ingenuity's stealth list and Shadow meter, Visualization's Figments through the Visualizer, Durability's shield-and-guard list, Empathy's tending and songs), tri-scale armour, Call icons, races, and changing class. Each of the four playstyles is its own patch after this one; when they come, they live inside existing tabs where they can.

## 5. Rulings (all settled)

**Settled, 10 Nov 2026:** Leon confirmed rulings 1, 3, 6, 8, 9 and 16 one by one, and said "do your default" for the other ten. All sixteen are built as written below. The numbers drafted under ruling 15 are still provisional and go in spec section 14.

On ruling 8, Leon's note: a player reading Visualization's bonus (+5% elemental damage a point) will expect the Visualizer to have something to do with the elements. That is a constraint on the Figments design when it is drafted (after Skeleton 2.0): what a Visualizer makes should be elemental, or take a tone.

1. **Which modifier sets a TN.** A Call's save, a spoken condition and the four perk TNs are "12 + the skill's modifier". Default: **points − 1**, never the full-points check number. With full points a 10-point talker sets TN 22 against enemy saves of +0 to +3, which nothing passes.
2. **Strength has a floor of 0**, as today. Without it a fighter with no Raw Power is easier to shrug off than a minion.
3. **Threaten is a Heart save.** Section 10.2 says Body, 13.4 says the condition's own save, and Shaken is a Heart condition. Default: Heart.
4. **Combined checks:** full points apply to each gamma first, then the lowest modifier is taken. Default as stated.
5. **Passive Vigilant** (traps, hidden piles, hazards, Sigil traps, voice hooks) follows the check rule, one function for all; **the roll to spot the Hidden in a fight** stays points − 1.
6. **AP from a Call lands on the ally's next turn** when the ally has already acted this round, inside the +3 cap; given before the ally acts, it lands this turn up to the ceiling of 9. Rule 10.1.4 is reworded to match Rally's step 3.
7. **A story save called with a gamma** (the Narrator lists Composure for a Heart save): the engine maps the family to its skill and ignores the listed one. Default: yes.
8. **Elemental damage per point:** the engine and spec item 587 say +5% (Visualization) and the proposal's table says +10%, copied from stale data. Default: keep 5%, fix the data.
9. **Durability's point** ("Guard gained on Brace") has no code to hold it until the shield-and-guard list exists. Default: data and spec line only in 0.19.0, flagged provisional; Durability keeps armour-side numbers it has today.
10. **Shields received (Conscience)** means every shield, whatever made it.
11. **The offer of terms** reads Charisma; Persuade stays on Eloquence.
12. **Sources the rule does not name:** thrown items and light blades read Dexterity; poison and traps read Ingenuity; a Sigil word riding a weapon hit reads Brain Power; a perk that speaks reads the gamma it belongs to; a companion reads its handler's Empathy; residue reads the strength stored when it was laid.
13. **Silenced** stops Calls; a **Stunned** ally cannot be Ordered or Cued; a Suppressed ally gets nothing from Cue (it has no reaction).
14. **Empathy keeps its free Pumps** (3 and 7); the data line says so.
15. **Numbers the proposal leaves open** (Rally Cry, Walking Wounded, Used to the Pain, Clean Hands' shield, Case Closed's +20%, tiers for Breaching Strike and Both Hands, Roll With It II as 2 tiles or 3, what "a weapon you maintain" means for Tuned): I draft each at Stage 3, flag it provisional, and list it in spec section 14 for him to change.
16. **Left and Right Brain Debuff:** the Brain save moves from Charisma (Mind, Expression) to Rumination (Mind, Intelligence), so the Right Brain Debuff stops lowering the Brain save and only the Left one does. The Heart save is unchanged (Lore Master is a Soul skill, as Composure is). Default: accept it, and say so in the spec.

## 6. Progress log (newest last; a fresh session starts here)

- **10 Nov 2026.** 0.18.1 is live (`main` at 8497c1b). Work continues on `claude/charming-gauss-hbq4n0` (it holds everything `develop` has). Leon: everything discussed goes into 0.19.0; ask at once, by push notification, when something is unusual.
- **Stage 0 done** (6ce4509): `packages/engine/test/skeleton-diff.test.ts` writes every derived number for the 46 archetypes at levels 1, 6, 12, 20 (`SKELETON_DIFF=out.json npx vitest run --root packages/engine test/skeleton-diff.test.ts`); `tools/skeleton_diff.py before after` compares two runs; the numbers before the pass are `docs/design/handoffs/skeleton-2.0-before.json`.
- **Stage 1 order** (each a commit, tests green): (a) the moved per-point numbers in `character.ts` and their hard-coded copies; (b) saves to Guts, Rumination, Composure (Composure is the beta now) and `SAVE_SKILL`, `heartSave`, `FAM`; (c) `strengthOf(unit, via)` and every `applyCond` caller; (d) `checkMod` at the check sites, the client's `mod` copy and the Narrator brief; (e) Cores no longer spent (creation, levelling, caps, archetypes data, `SHEET_REV`); (f) slot swap Composure/Lore Master and the Acuity/Improvisation re-homing in `skills.json` (names, slots, attributes, per-point lines), then the spec and the diff table for Leon.
