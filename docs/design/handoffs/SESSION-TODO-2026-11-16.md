# Session to-do, 16 Nov 2026 (after 0.30.0 went live)

Leon's word (16 Nov, later the same day): **0.30.1 is NOT deployed on its own.** Its work is saved on
`wip/hotfix-0.30.1` and goes live as part of 0.31.0 ("to live when all green"). No more testing on 16 Nov; about 20% of
the usage was left, so nothing new is started without need. Each deploy gets `backup/live-<version>`.

Live: **0.30.0** (commit 44a1d686, `backup/live-0.30.0`; 0.29.0 kept as rollback).

## A. Hotfix 0.30.1 (branch `hotfix/0.30.1`, worktree E:/phc-wt/rel030)

Built, reviewed, review findings fixed, green at b2df5eff (then int/0.30 merged in: 068340a2); pushed as
`wip/hotfix-0.30.1`. NOT live. Merge it into the 0.31.0 release branch first. What it holds:

1. Free mod fit by leaving out the action name (blocker): test the action that will run.
2. Overhaul at the Forge fits the gun that was picked, not always the main hand.
3. A run takes an item's out-of-fight button only when the action is marked for runs (scope `run`): One Blade, Red
   Line, Open Hand's mercy, Chain Smoker, Trench Poet, the Marksman's loads, Field Surgery, Lunarshine. Others greyed
   with a reason. **Open for Leon:** Triage's story heal and Field Surgeon's Patch between nodes (left off).
4. Already in: field kit treats a limb (one kit, out of a fight, not on the field); Rest treats limbs; toolbox counts
   for Field Surgery only; ration pack, chalk and wax, prayer beads, cigarettes off the shelves; plates learnable from
   the MAGIC tab with a chosen lesson; one icon route (armour, magazines); "bots" wording to mana; Mana-thread banner.
5. Before deploy: `python tools/check.py`, the browser suites (survival, gear-icons, physical-pack, old-save, tabs,
   magic, classes-moves), and a human look at: the field kit's Treat buttons, the plate chips, the shop icons.

## B. 0.31.0 lanes already building

| Lane | Worktree / branch | State |
| --- | --- | --- |
| Field faults F1 to F7: banners (Battle Start, Victory/Defeat, Free Roam), field movement arrow/highlight/counter, full AP at contact, victory card at the win, greyed Begin, prayer heal effect, the field as 3 rounds of turns | E:/phc-wt/field030, `lane/0.30-field` | all seven built; end checks and review running |
| Dexterity melee: Pressure is Dexterity's (melee pips, both alpha perks, forks, Mastered perk, Skirmisher moves), Throw costs no Momentum, ARMS tab lists property techniques, Rite in the Field onto Crystallise / Steady / Name It | E:/phc-wt/dex031, `lane/0.31-dex` | building; guns must not move |
| Cover beside you, a firing foe revealed, focus-fire memory | E:/phc-wt/fit030, `lane/0.30-fit` (ad7c34c8) | built; blocked by review: the reveal must not stop the unseen-kill Shadow gain; then merge |

## C. 0.31.0 fight-screen lane (one lane, on top of the field lane; not started)

Order matters: all of it touches the fight screen.

1. **Layout.** Mock-up first, then build: mini meters in one row, zero meters and unused doors folded, Bonds box
   folded, shield as a segment on the HP bar with "145 +18" and hover detail, vow block one line, Say box hidden in
   Survival, turn strip carries the AP pips, action list at least four rows, preview and target card in one box. Every
   info box folds and saves its state per player (CLAUDE.md rule). Fix "EMPT / Y", EMPTY + STOWED, and the row and
   preview disagreeing on AP.
2. **Status strip.** Pinned under HP, icon-only, grows on hover; helping (green) and hurting (red) groups; time left;
   a helps/hurts field on every condition in data; the same strip on the token. Hidden is not red.
3. **Picking UI for every aimed action** (CLAUDE.md rule): the engine sends reach, legal targets and area for any
   preview kind; one overlay draws them; a test walks every action with a pick step. Covers Shadow's Vault, Decoy,
   Pick, Douse, Rig, Sabotage, every prayer, Figment orders. A shield or heal preview shows the net gain.
4. **Prayer effects** (plan in the audit, workflow wf_63866b9f-a02): heals and shields through the one display helper,
   one damage display tail, elements on prayer damage, cleanses and buffs shown, typed numbers into data, Covering
   Fire 3x3, "99 rounds", Love Conquers' surrender, per-patron sounds.
5. **Figment effects** (audit wf_a1639c83-6f2): live browser trace first (Move, Strike, Picture send the right
   events but Leon sees nothing); silent data damage (Husk Burst), Redraw as a blink and Interpose as a walk, order
   link from the owner, a destroyed Figment unravels, say/fx on order rows.
6. **Shadow** (facts wf_63d35957-a17): dark maps in shrine, works and rim (measure clears); Douse then works; Prone
   lowers the range you are seen at (stat `seen_range`, approved); detect view (each seen foe's detect area against
   you, your "noticed within N"); Stalk (2 AP, +1 Shadow, from Hidden, under the door's 2 gains a turn); the
   **Silent** property (Visualizer has it: acting from Hidden gives your tile away, you stay Hidden; a Silent weapon
   also costs 1 Shadow a shot; a silencer mod later); only commands through the glove count, not a Figment's own
   actions; hover no longer lifts the tile over its neighbours; hover card closes on leave; Shadow curls get a tip.
7. **Small screen items:** fork menu closeable and under its skill; a tab-order tab at the end of the tab row; the
   glimmer on the YOUR TURN strip; LEVEL UP banner with a sound; plain melee attack named Hit everywhere.
8. **Sounds:** check licences (CC0 / CC BY only) of the candidates for lightning, divine impact, heal shimmer and the
   level-up sting; download, normalise, credit.

## D. Carried from 0.30, still owed

- Healing brake per giver (needs a price that sees its target: approved).
- Gamma reliefs; Figment rework (all ten forms learnable, composed at Picture time, style forks).
- 18 fork options shelved; tank camp kit weak (7 of 20 clears).
- Ceilings measured with mods fitted.
- The 0.30 review doc for Leon's rulings; consolidation pass on the primitives 0.30 and 0.31 added.
- Roadmap entry: Faith artifact and chapel (next version's lead), Weapon Arts, silencer mod, Relic properties for
  unarmed weapons (Forge wording fixed meanwhile), tankbuster enemies.

## E. Open questions with Leon

1. Triage story heal and Field Surgeon's Patch between nodes in Survival.
2. Should fists and gloves take Relic properties at the Forge.
3. Vows: fold to one line, or a forced choice at the start of each fight.
4. Level-up banner shown to the whole room or only the player.
5. Rename Bot-scrambler / Bot Sense (they jam robots; left as is).

## F. Leon's rulings after this list was written (16 Nov)

- **Vows:** entering any game mode opens a pop-up that makes you swear a vow; in a fight the panel only shows the vow
  held (one line); a rest point is where it is changed. (Asked, not answered: is "Fight unsworn" a choice in the
  pop-up; Atheists get no pop-up. Lead's pick: unsworn stays, Atheists none.)
- **Level-up banner:** shown to the whole room.
- **Field Surgeon's Patch** works in Survival; the spare-parts charge gets dearer (lead's start: 16 to 60 credits,
  PROVISIONAL; repairs get dearer with it). **Triage's story heal:** once per stage map for each Mender. Price both in
  the run simulator. Until 0.31 both stay off (they do not carry the `run` scope).
- **Relic properties for every weapon:** gloves, wraps and the unarmed family take the Relic step (bare fists have no
  item); walk every weapon category for other gaps (shields, focuses, thrown) and list them.
- **Dark maps:** kept. Shrine, works and rim dark; AHOC and city lit; measure clears.
- **Zero meters fold and open on click; the status strip is mini and grows on hover; the shield is one bar segment
  with hover detail and a collapsed Shields line; every info box folds and saves its state** (CLAUDE.md).
- **Silent** is a property (Visualizer by default; a silencer mod later; a Silent weapon costs 1 Shadow a shot).
- **Plain melee attack is named Hit.**

## G. The hotfix's last gate (16 Nov, before work stopped)

`python tools/check.py` ALL GREEN on `wip/hotfix-0.30.1` (engine 4778, web 1505). Browser suites: 12 of 13 pass
(gear-icons, physical-pack, old-save, tabs, magic, classes-moves, kit-map, skeleton-screens, two-players, reconnect,
perks, ui-shell). **survival fails 2 checks, alone too, both in its field section** ("The field is yours" with what
lies on the ground: it found "Nothing left on the ground"; "the field has no turns: End turn is not offered"), then a
60 s wait times out. Not investigated (Leon stopped testing for the day). The field lane rewrites that section (the
field becomes turns), so judge it after `wip/hotfix-0.30.1` and `wip/lane-0.30-field` are merged; if it still fails
there, the likely cause is the shelves change moving the seed's loot. Not looked at in a browser by anyone: the field
kit's Treat buttons, the plate chips, the shop icons. Drive C: had 36 GB free (94% full) during the run.

## H. Dexterity lane finished (16 Nov)

`wip/lane-0.31-dex` at 38d0a3e0: built, two reviews, review fixes, check ALL GREEN, balance green, 29 replays. Full
report: the workflow journal wf_e9b5ffe1-250 (and the CHANGELOG 0.31.0 section on the branch). For the lead before
merging: (1) read the fix report's verdicts on the blade Flush Out against a Boss and on the pip limit (the review
said the stop rule, limit 2 to 1, probably should have fired for the sabre and gladius: all-in Dexterity blades were
already over the 165% melee line, 199 to 246%, and the perks add 8 to 24 points); (2) Rite in the Field now cuts only
Crystallise: Steady was a dead clause, and cutting Name It needs a price predicate on the Call's id (not approved
yet), so the perk still gives little: needs a ruling; (3) a bug the swap fixed: `melee: false` on roll contexts
matched every roll, so Fire and Move armed on any blow and Relocated's +1 applied to every roll, spells included.

## I. Field lane finished (16 Nov)

`wip/lane-0.30-field` at 054749cf: F1 to F7 built, two reviews, review fixes; check ALL GREEN, balance green, 29
replays. Browser: faith, tending, fight-cards, two-players pass; **survival and magic fail, alone too** (details in the
fix report, workflow journal wf_42d20191-44b: read its "unfinished"). **F3 is only half done:** in Survival the fight
starts as you enter the node and foes in the fog are already in it, so walking spends AP; the builder added a line on
the BATTLE START banner ("Hostiles in the fog: every step costs AP") and left the real fix (a "not yet joined" state
on the fight, so the first turn after contact is at full AP: Leon's ruling) for the lead to approve as a primitive
(spec item 4748 on the branch). Approve and build it in 0.31. All work is stopped here: nothing is running.

## J. Order to pick this up

1. Merge into one 0.31 release branch from develop: `wip/hotfix-0.30.1`, then `wip/lane-0.30-field`, then
   `wip/lane-0.31-dex`, then `wip/lane-0.30-fit` (expect conflicts in the spec's item numbers, CHANGELOG, goldens and
   replays: keep both sides, re-record on purpose; versions to 0.31.0).
2. Fix what the merged branch's browser gate shows (survival and magic first).
3. Build section C (the fight-screen lane), F3's real fix, and section F's rulings.
4. Full gate, browser look, deploy 0.31.0 on Leon's standing word ("to live when all green"), `backup/live-0.31.0`,
   then delete `backup/live-0.29.0` as the third-oldest (never 0.22.0 or 0.23.0).

## K. 0.31.0 IS LIVE (17 Nov 2026, deployed while Leon slept, on his word "live the build")

Commit b3d9a018 on `main` and `develop`; `backup/live-0.31.0` pushed; `backup/live-0.30.0` kept as the rollback
(0.29.0's backup deleted as the third-oldest; 0.22.0 and 0.23.0 kept for good). The live page serves the 0.31.0 bundle.

**In it:** the hotfix 0.30.1 (section A), the field lane (F1 to F7; F3 only as a banner line), the Dexterity lane,
the cover pass (cover beside you, the shot that shows, focus memory), and the fight panel (folds that remember, mini
meters with a "+N" chip, the shield as a segment on the HP bar, the status strip with a helps/hurts field on all 111
conditions, at least four action rows, the AP pips on the YOUR TURN strip, no Say box in a Survival run, the vow as one
line, one preview box, "Hit", the turn strip's glimmer, the tab-order button, the hover fixes, the fork card closeable).

**Gate:** `python tools/check.py` ALL GREEN (engine 4807, web 1523), balance green, 29 replays; all 72 browser suites
green (voice, shadow, tending, fx-room passed only when run alone: timing under load). The lead looked at the fight
panel's screenshots at 1280x720 and 1600x900. **Not looked at in a browser by anyone:** the field kit's Treat buttons,
the plate chips, the shop icons, the banners in motion, the field's three rounds.

**Known and unfixed in live 0.31.0:**
1. F3: walking into a fog fight still spends the first turn's AP (the banner says so; the real fix needs a "not yet
   joined" state: approved, not built).
2. Sabre and gladius in an all-in Dexterity build are far over the melee line (199 to 246% before the perks).
3. A Pressed Boss can be made Afraid by a Dexterity blade (review flag; read the dex lane's fix report).
4. Rite in the Field cuts only Crystallise.
5. The mixed test squad (gunner, tank, Sigilist, Channeler) clears stage 1 on 3 of 20 seeds on the merged rules.
6. Field Surgeon's Patch and Triage's story heal are still off in Survival (rulings in section F not built).
7. The fight panel: tabs wrap to a second row with every door open; Strain reads "NEAR THE LIMIT" at 0 / 4; the status
   strip is not drawn over the token face (hover card only); "Cut 2 AP" against "Cut · 0 AP" was not reproduced.
8. Healing brake, gamma reliefs, Figment rework, 18 shelved forks, the weak tank camp kit.

**Next version (0.32), "class UI and effects" (Leon):** section C items 3 to 8 (picking UI for every aimed action,
prayer effects, Figment effects, Shadow: dark maps, Douse, Prone, detect ranges, Stalk, Silent; the level-up banner;
sounds), section F's rulings (the vow pop-up on entering a mode and its change at a rest, Patch and Triage in
Survival, Relic properties for gloves), F3's real fix, and section D. The audits with file and line are in the
workflow journals named in section C.

**Housekeeping owed:** WIP branches of 0.30 and 0.31 (delete one version after their work shipped, per the rule);
worktrees under E:/phc-wt/ (rel030 is the release tree; int030, field030, dex031, fit030, ui031, icons030 and the older
lanes can go once Leon agrees); drive C: was 94% full.

## L. Penned in for a future patch (Leon, 17 Nov 2026)

- **Realign a weapon at the Forge.** A Forge service (not a mod: it takes NO mod slot) that changes a melee weapon's
  alignment between Strength and Dexterity (what it rolls to hit with and what its damage scales with), both
  directions. It costs a lot of credits (a data number, PROVISIONAL, on the scale of the Relic step), and the
  weapon's base damage is lowered or raised to the balance line of the attribute it moves to (a data factor per
  direction, fitted with melee-measure so the realigned weapon lands on that attribute's line with both alpha perks),
  never a free upgrade. Built from: the weapon row's hits_with / scales_with read in one place, the roll_with op
  (Open Hand), the rolled_with predicate (0.31), the Forge's paid step. To verify first: whether a per-weapon state
  can override scales_with (weaponState carries rarity and mods today); if not, that one general field is the only
  new piece. After 0.31.2 settles the Dexterity blade numbers.
- **Clean-up done 17 Nov:** 33 work folders and 37 merged GitHub branches removed. Left for Leon's word: about 25
  non-git leftover folders beside the main checkout (phc-029-l1 to l6, phc-0282-*, phc-bisect-0282, phc-say-repro…).

## M. The Dexterity melee patch (Leon, 17 Nov 2026): ASK LEON BEFORE STARTING ("big patch so ask before doing it")

One patch with the Forge realign of section L. Not started; not to be started without Leon's word.
- **Dexterity-rolled melee techniques spend the target's Pressure, not the user's Momentum.** The resource is chosen by
  what the weapon rolls to hit with (the 0.31 `rolled_with` reading): Dexterity-rolled, its Strikes cost 1 pip of the
  target's Pressure and its Finishers spend all the target's pips and scale with the number spent; anything else,
  Momentum as today. A Dexterity melee hit lays a pip and builds no Momentum. Gun techniques already spend the target's
  Pressure, so the piece exists (verify the cost site takes a target resource for a melee technique).
- **Why:** ends the double stack (one swing feeding Momentum and Pressure; knife and pistol doing a Finisher and a
  perk shot in one turn), gives the blade an active use of its door, makes Strength (a chain you carry) and Dexterity
  (pressure on one target, collapsed) different styles. Replaces 0.31.2's sabre and gladius number fix: re-fit them.
- **To rule or measure:** Bosses cap at 2 pips (blade Finishers small on a Boss: weakness, or a Boss rule); pips an
  ally laid can be cashed by the blade (lead: allow); Pressure decays and does not follow to a new target (weak
  against crowds); a Raw Power + Dexterity character gets no chain counter with a sabre in hand; add a knife-and-pistol
  build and the Dexterity blades to the simulator and hold them to the melee and gun lines.
- **Forge realign** (section L) in the same patch: a realigned weapon switches resource too.
- **Hybrid weapons (Leon's idea, 17 Nov; same ask-first patch):** some weapons scale on both Raw Power and Dexterity
  and their techniques consume BOTH resources (a Strike costs 1 Momentum and 1 pip of the target's Pressure; a
  Finisher spends both and scales with both). The double stack made deliberate and priced: the highest melee ceiling,
  only for a character with both alpha skills and both resources set up. Data today that points this way: hand wraps
  and fists carry `also_scales` [raw_power, dexterity]; the hatchet hits with Dexterity and scales with Strength.
  Candidates: the hatchet, the gloves family, a new hybrid blade. A hit with one builds both; hold it to a line above
  the single-attribute melee line, by measurement.
- **Ruled (Leon, 17 Nov):** the Forge realign has three targets: Strength, Dexterity, or **hybrid**, for any melee
  weapon (hybrid costs the most; its damage factor fitted to the hybrid line). And the patch must **explain pips and
  Momentum better**: one plain line on each door tab and technique row saying what the technique will spend and from
  where ("spends 1 Momentum" / "spends 1 Pressure on the target" / both), the two meters shown together on a hybrid
  weapon's attack tab, the target's pips visible on its token while aiming, and a first-use tip for each resource.
- **Three forms a family (Leon's idea, 17 Nov; same ask-first patch, art in parallel):** every melee weapon family has
  three forms, one per alignment, each with its own name and icon: realigning at the Forge reforges the weapon into
  that form (a hybrid katana becomes an odachi as a Strength blade, a wakizashi as a Dexterity blade). Data: a family
  row names its three forms (name, icon id, alignment, damage factor, properties that change, e.g. Reach or Light);
  the weapon keeps its grade, mods, Relic property and name-of-the-blade. Built from the variants data added in 0.29
  (variants are data only) if it fits. Art: weapon icons are the monoline line-icon mode (art/style-guide/
  weapon-icons.md), which Claude can draw as SVG, so this is not a painting job: count the families first, draw the
  missing forms, list them in art/briefs/ART-REQUESTS.md. Existing weapons slot in as one of their family's three
  forms (the claymore as a Strength form, the sabre as a Dexterity form), so few names are new.
- **Correction and ruling on the three forms (Leon, 17 Nov):** every weapon has a PAINTING (art/icons/gear/
  weapon-<id>.png), shown in the shop, inventory and Forge; the SVG line icons are not the weapon's picture. So new
  forms are paintings for the artist, not something Claude draws. Leon: "no need to keep small if the feature is
  compelling enough": do NOT squeeze the families to save art. Merge two existing weapons into one family only where
  it makes sense in the world (same make, same lineage of blade); otherwise a weapon is its own family and gets two
  new forms. Melee today: 8 light, 7 heavy, 6 wearable gloves (2 gloves unpainted): up to about 42 new paintings.
  First step when Leon gives the go: the family table (each family's Strength / hybrid / Dexterity form: existing
  weapon or new, name, what changes), for his ruling; then the art list into art/briefs/ART-REQUESTS.md with GPT
  prompts; the patch may ship with placeholders.

## N. "Items 2.0" (Leon, 17 Nov 2026): the name of the ask-first patch; section M and its notes belong to it

Leon: "this will be fit into an 'Items 2.0 update' with the forge too, since many other things are still a hang up in
our system, like for example, defense and armor in items only display in the starting shop and is really opaque on
what both do." Scope so far (ask Leon before starting; design pass and a "Built from" table first):
1. Section M: Dexterity techniques on Pressure, hybrid weapons, the Forge realign to three alignments, three forms a
   family (paintings), pips and Momentum explained.
2. **Defense and armour made legible:** today they show only on the camp's starting shop. Wanted: what Defense does
   (the number a roll to hit must beat) and what armour does (taken off each blow's damage) said in plain words with
   the character's own numbers, on the sheet (STATUS and GEAR), on every armour and shield card everywhere an item
   card is shown (shop, rewards, Forge, Give, inventory), on the token's hover card, and in the hit preview
   ("need 12" / "− armour 10" already appear there: name them the same way everywhere). One item card component.
3. To audit at the design pass (each a likely hang-up): one item card for every item kind and every screen; what
   beta skills gate (armour and equipment: Leon's earlier ruling, not built); mods for focuses and shields; variants
   in shops and Boss drops; plates and the lesson pick; spare parts and repairs; weight; durability; Relic properties
   for every category (0.31.2 does gloves); the Forge's screens as a whole; dead or Narrator-only items.

## O. 0.31.5 IS LIVE (17 Nov 2026); 0.31.1 and 0.31.2 went live earlier the same day

Live commit = `main` = `develop` head at the deploy; `backup/live-0.31.5` and `backup/live-0.31.2` kept (plus 0.22.0,
0.23.0). Gate: check ALL GREEN (engine 4843, web about 1600), 29 replays, 73 browser suites green (voice only alone).
- **0.31.1:** HP back in the You card, the ACTION POINTS row back, Backpack by the limbs figure, the VICTORY / DEFEAT
  panel with a sound before the leave vote.
- **0.31.2:** the reward panel (XP, credits, the pick; the map says why a click is refused); rules 1.64: the approach
  before contact (free movement, full AP when joined), Patch in a run with spare parts at 60, Triage once a stage
  map, Relic properties for gloves, Rite cuts Name It, sabre / gladius / katana damage lowered.
- **0.31.5:** the picking contract (rules 1.65: reach, choices, area, targets for every aimed action; net gain on
  mends; refusal line on an illegal click); the SKILLS tab said to a player (forks under their skill, the points
  block folded and rewritten for all 27 skills, each gamma's Call and how it grows); ALL the artist's art in (443
  pictures: one placeholder left, move-draw-fire), drawn on action rows, the status strip, the sheet, the camp, place
  cards, vows, fork cards, map marks; click to enlarge on every icon through the one lightbox.
- **Not seen in a browser by anyone:** the status strip's new group marks, a Survival place card with its picture,
  the approach line on the turn strip in real play, the reward panel's vault-chest case.
- **Known, unfixed:** enlarged item's text sits above its name; fork, action-row and trap icons are very small; no
  "Your trap" line in the legend (not investigated); a prayer outlines every tile in sight (heavy); the camera jumps
  after an illegal far click; condition chips in the token hover card do not enlarge; delivered art with no place yet
  (5 Tending passives, 3 resource marks, 7 tone marks; moves not linked in data: Stand Behind Me, Wind-up, Read the
  Swing, Hold the Lane, Scrap Sentinel); the Kemizuchi duelling blade and strikers over the melee line; the tank camp
  kit; victory fanfare still the game's own sting (source a CC0 / CC BY one); tools/e2e.py kills every wrangler on
  the machine, so two lanes cannot run browser suites at once (give it a per-lane port).
- **Next (not started):** prayer effects, Figment effects (live trace first), Shadow (dark maps, Douse, Prone, detect
  ranges, Stalk, Silent), the vow pop-up, the level-up banner, sounds; then ask-first Items 2.0 (sections M, N).
- **Housekeeping at the next release (the two-release rule):** worktrees known0312, pick0315, skill031, art031 and
  their wip/lane branches are merged and can go; rel030 is the release tree. About 25 non-git leftover folders beside
  the main checkout still wait for Leon's word.

## P. Items 2.0: Leon's rulings on weapons (17 Nov 2026, evening). Still ask-first to BUILD; this is the design to start from

Draft family table (lead's, for Leon to edit; bold = exists today): Service knives (**combat knife** D / trench knife H
/ bolo S); Cavalry blades (**sabre** / cutlass / falchion); Legion blades (pugio / **gladius** / spatha); Eastern
blades (wakizashi / **katana** / odachi); Kemizuchi duelling line (**duelling blade** / side-sword / sword-breaker);
Axes (tomahawk / **hatchet** / **war axe**); Polearms (**lance** / **glaive** / poleaxe); Hammers (war pick / war
hammer / **maul**); Great blades (estoc / longsword / **adamantile greatsword**); Ork cutters (skinner / **machete** /
cleaver-glaive); Hand-to-hand (**striking gloves** / **hand wraps** / **knuckledusters**); Heavy fists (**strikers** /
weighted gloves / **iron mitts**). One-offs with no forms: Afterword, rip-saw, servo-fist, throwing knives.
Rulings:
1. Forms must FEEL different: the form changes handling (AP, Light / Reach / Thrown, base damage), not only scaling.
2. A reforge keeps grade, Relic property and the One Blade name; mods stay if the form has the slot, else to the pack.
3. Reforging back is allowed, at full price each time.
4. Shops keep rolling at random across forms: finding the family you want in the wrong form is a find (reforge it);
   the right form at the right weight is better still.
5. Guns get families too (30 guns today: 4 pistols, 2 revolvers, 4 SMGs, 6 rifles, 4 shotguns, 6 heavies, 4 bows).
   All guns roll with Dexterity, so a gun family's three forms are another axis (lead's proposal: close / standard /
   long of one maker's line), to be drafted like the melee table.
6. Base form names are ordinary weapon words; the random modifier and the rarity modify the name (prefix / suffix
   naming from data).
7. "Real weapon variety, and progression in a line": every weapon form has FIVE pictures, one per grade: the game
   has exactly five grades in data (standard, fine, masterwork, relic, celestial), so a weapon visibly grows as it is
   upgraded; plus unique weapons sprinkled in (one-offs with their own picture and rule, like Afterword).
   Size: 12 melee families x 3 forms x 5 grades = 180 paintings; guns about 10 families x 3 x 5 = 150; about 330 plus
   uniques (the artist delivered 443 pictures in two days). Grade pictures of one form are variations of one base
   (same silhouette, richer make), so they are cheap for an image generator: brief them as a set of five.
8. **Uniques** (Leon): their own "Unique" tier with its own frame; about a Relic in raw stats, plus one unique
   passive of their own. Outside the families; not reforged. One picture each.
9. **Advanced-class weapons** (the faction weapons: the Evoker blade, emanator katana, grand staff and the like;
   Leon): they are uniques that DO upgrade, through three tiers only (the first two grades are too weak by the time
   a character holds an advanced class): three pictures each, starting at about Masterwork. They wait for the
   advanced classes (shelved until they return as attribute pairs). Shields: not ruled; lead's pick: a family like
   any other (buckler / riot / pavise already read as light / standard / heavy).
10. **Shields** (Leon agreed to the lead's proposal, 17 Nov): three families by purpose, each light / standard /
    heavy, five grade pictures each (45 pictures; buckler, riot shield, pavise exist): **Guard** shields (most
    plates, best cover for allies: buckler / riot shield / pavise), **Strike** shields (a real follow strike and
    Shield Bash, fewer plates: spiked buckler / boss shield / ram plate), **Ward** shields (high soak against ranged
    and elemental hits, low against melee: deflector / bulwark screen / barrier wall). Built from existing pieces
    (plates, the follow strike, Shield Bash, ally cover, damage-kind reduction). **Every shield is one-handed.** The
    really big ones carry a **Heavy** property: it lowers movement (a data number, PROVISIONAL; two Heavy shields
    stack), as a property word like Light or Thrown so a mod or a unique can add or remove it. Shield uniques are
    where the strange ones live (throws back part of a spell, plants as lasting cover, stores soaked damage for a Slam).
11. **Armour** (Leon, 17 Nov): "we have way too many equipment slots and like one thing to put in each, with no
    modifier, nothing; Survival is stale even if you win." Armour grows in the same pattern as weapons: families,
    forms (light / standard / heavy), five grades with a picture each, random modifiers, uniques; every equipment
    slot on the rig gets real choices or is removed. Audit first: list every slot the sheet shows, what can go in it
    today, and what each piece does (the lead has NOT verified the slot list).
12. **Items that have an icon and do nothing get a use** (Leon): audit every item (the 0.30.1 hotfix found ration
    pack, chalk and wax, prayer beads, cigarettes with no engine reader; flare and torch unverified) and give each an
    engine use that fits its door or mode, or cut it.
13. **Weapon Arts in this patch too** (Leon). Earlier rulings stand: melee's rare spike that charges across fights
    from playing the door well and carries between fights; no headroom reserved ("let them have it"); guns get
    control-only Arts or none, and more generous mods instead; measure with mods fitted.
**The lead's staging (put to Leon, not yet ruled):** Items 2.0 is too big for one release. A: the engine and screens
(one item card, families / forms / grades as data, the Forge reforge, Dexterity techniques on Pressure, hybrid, names
from data, Heavy, armour and Defense readable) on existing art with placeholders. B: content (the full family tables
for melee, guns, shields, armour; modifiers; uniques; dead items given uses) as art lands. C: Weapon Arts, on top of
settled weapon numbers.

## Q. THE ROADMAP (Leon agreed the order, 17 Nov 2026): banked fixes first, then Items 2.0 in three stages

Live: 0.31.5. Building: 0.31.6 (the outside reviewer's fixes).
1. **0.31.6** reviewer fixes (Clean Hands cap, Spare's yield check, Mag Dump, throwables, the 0 AP preview, the
   Rewards bar, Stow, text faults, Main menu).
2. **0.32 "class UI and effects"** (the banked work; audits with file and line exist for all of it):
   a. prayer effects (numbers, elements, sounds; typed numbers to data);
   b. Figment effects (live trace first; silent damage; Redraw / Interpose; the order link; unravel);
   c. Shadow (dark maps in shrine, works, rim; Douse; Prone and `seen_range`; the detect view; Stalk; Silent);
   d. the vow pop-up on entering a mode, changed at a rest; the level-up banner for the whole room;
   e. sounds (victory fanfare, defeat, lightning, heal shimmer, level-up: CC0 / CC BY, credited);
   f. small UI (icons too small, enlarged text order, the legend's trap line, prayer outlines too heavy, the camera
      jump, token-card chips enlarge, tabs wrapping, the status strip on the token face);
   g. balance leftovers (duelling blade and strikers over the line, the tank camp kit, the gunner's sustain, the
      knife-and-pistol measure, healing brake, gamma reliefs, 18 shelved forks, the Figment rework);
   h. housekeeping (e2e.py on a per-lane port; the consolidation pass on new primitives; leftover folders).
   Ship in slices (0.32.0 effects, 0.32.1 Shadow, ...), each green and deployed.
3. **Items 2.0 A (0.33): the system on today's art**: section P items 1 to 6, 10 (Heavy), section N item 2, the
   one item card, families / forms / grades as data, the Forge reforge, Dexterity techniques on Pressure, hybrids.
4. **Items 2.0 B (0.34.x): the content as art lands**: the family tables (melee, guns, shields, armour), modifiers,
   uniques, the Unique tier and frame, dead items given uses, grade pictures (about 330 weapons + 45 shields +
   armour).
5. **Items 2.0 C (0.35): Weapon Arts.**
6. **After:** the Faith artifact and chapel; advanced classes as attribute pairs with their three-tier weapons;
   Roguelike and Campaign modes; the canvas brought back in line at 1.0.
Items 2.0 is still ask-first to start; its first deliverable is a design document with the tables for Leon's edits.

## R. Added 17 Nov, late (Leon)

- **0.32's FIRST slice: finish the 18 shelved fork options** (more important than the effects work). Built today:
  Guard 4 and 6, Pressure 4 and 6, Momentum 4, Bonds 4, Figments 4 and 6. Not offered: Momentum 6 (Spill, Headlong),
  Bonds 6 (Long Thread), Shadow 4 and 6 (Light Fingers, Lend the Dark, Lightkiller; Spotter is built), Sigils 4 and 6,
  Outbursts 4 and 6, Prayer 4 and 6. For each: the one piece it waits on, whether it now exists (the target-aware
  price, the resource-amount predicate, Strain / Flux as resource rows), build what is unblocked.
- **0.31.8 (after 0.31.7):** when a fight is joined EVERY enemy group on the map is alerted and comes (no hunting
  the fog for the last group before VICTORY); ambushers keep their rule; measure clears. A calm track (the Proving
  Ground's Gearing Up) plays in FREE ROAM and before contact; the fight song starts when the fight is joined.
- **Will Power gives no Strain limit; only Composure does** (Leon's observation; lead reads it as a fault: the
  Outburst door's own skill should raise the limit a little, Composure multiplying it: ask Leon to confirm).
- **Rite in the Field is still useless** ("no one crystallises in battle"). Needs a new effect on its own door
  (Lore Master = tones). Lead's proposal: once a fight (tier II twice) change a held Outburst's tone for 0 AP, and keep
  the Name It discount.
- **The Call ladder's steps 9 and 10 overlap** ("9: also as a reaction, for 0 AP, once a round; 10: your first Call
  each turn costs no AP": 9 already gives a free Call). Step 10 needs a different reward for all nine Calls. Lead's
  proposal: at 10 the Call reaches every ally (or foe) in its range at once.
- **CORRECTION, Leon's ruling on Strain (17 Nov):** the lead read it backwards. Will Power gives TOO MUCH: remove
  the Strain limit from Will Power entirely. The Strain limit comes ONLY from Composure; with no points in Composure
  the limit is 3. Lead's numbers to fit (PROVISIONAL, ask Leon): limit = 3 + 1 per Composure point (13 at 10), the
  existing Will Power x Composure feed left on top or folded in so the top stays about 16; re-measure Outburst
  steady and peak, Mana Shock entries and heart burns; Outburst forks at Will Power 4 and 6 must not give the limit
  back. Check every text that says Will Power raises the limit.
- **Composure's Strain limit steps (Leon, with a screenshot of Composure's ladder):** the limit rises at the
  Composure points that have no perk step or unlock (1, 2, 4, 6, 8), from the base of 3; amounts to fit (lead's start:
  +2 at each, 13 at 8; measure).
- **The skill ladder's wording (Leon: "nobody understands", "like alien speech"):** remove every "Only what every
  point gives" row and the "You now: ..." line. A point with no unlock shows what that point concretely gives in
  plain numbers ("Strain limit 7 → 9", "+1 to hit: now +6"), or is not listed. The beta feed's current value is said
  as an ordinary sentence ("Right now each plate soaks 7 damage."). Applies to all 27 skills, the "?" menu and the
  level-up card. Goes in 0.31.8 with the alarm rule and the calm track.

## S. 0.31.6 and 0.31.7 are live (17 Nov, night). Carried into 0.31.8
0.31.7 shipped 4 of its 10 items (bigger icons, the lightbox order, the legend marks, four move icons linked).
**0.31.8 list:** (1) the alarm: all groups engage when a fight is joined; (2) the calm track in FREE ROAM and before
contact; (3) the skill ladder wording (CLAUDE.md "Player text never explains a formula"): a sheet of all 27 skills
for Leon BEFORE it ships; (4) carried from 0.31.7: the prayer reach boundary, the camera jump (needs a browser
repro), the LEVEL UP banner, duelling blade and strikers to the line, the Throw row's browser check, e2e.py on a
per-lane port, token-card chips enlarge. Then 0.32 starts with the 18 shelved forks, the Strain ruling (Composure
only, base 3, steps at 1 / 2 / 4 / 6 / 8), Rite in the Field and the Call ladder's step 10 (both await Leon's yes).
- **Text audit, a named case (Leon, screenshot of the rest's Training card):** "Drill +200 with the Combat knife ·
  Toward the Combat knife's next mark · 211 now · +200 · ✓ Reaches it · Mark I at 300: the Combat knife's signature
  move, Coup · Free · One training per rest. Izacarl has had it." He cannot tell what "Reaches it" means, and the
  card still predicts after the training is spent. Card style: "+200 Combat knife mastery" / bar "211 / 300" /
  "Unlocks Coup" only when this drill gets there / when spent: the card greyed with "Training used this rest" and no
  prediction. Audit every Survival card (training, shrine, shop, Forge, rest, Crossroads, boons) the same way.

## T. Reported 17 Nov, last hour (Leon); none built unless noted
- **0.31.8 (the lead's wording pass, live if section U says so):** the skill ladder's generated lines, the beta
  box, the Call line, the Training card, the points block closed by default. NOT yet done: the 27 skills' own data
  rows (still sentences), every other card.
- **Old perks rolled into the skill ladder (the unlocks: Second Wind, Poker Face, Stand Still...) must appear as
  perks in the PERKS menu;** the perk menu folds and is CLOSED by default.
- **"bruh" (three screenshots):** (1) the Sinner's Due perk card ends "(a later step)": dev text; (2) enlarging its
  icon shows the picture and the name only, no text, on a view that covers the card; (3) the Slide tooltip says
  "(more with Athletics: the reach x Dexterity's beta feed, rules 1.60 item 4606)": a rule reference and a formula
  in player text, and "1 AP" / "0/1 turn" are printed in the row, the chips and the sentence. The wording pass must
  sweep every perk, technique and verb text for rule references ("rules 1.", "item NNNN", "beta feed") and "(a later
  step)"; add a validator check that no player text holds "rules \d" or "item \d{4}".
- **Strain is not shown while holding an Outburst** (the moment it matters most): the meter row shows HOLDING and
  Strain folds away or is replaced. Strain must always show while an Outburst is held.
- **Syphon:** triple the mana a Syphon draws from the air by default (data), and **no MP is restored at the end of
  a Survival stage** (find what refills MP after a stage / Boss and remove it for MP only).
- **Iron Heart, Leon's ruling (17 Nov, overrides the lead's "ignore one heart burn"):** once a fight, when you reach
  Mana Shock, it relieves 2 Strain. Apply after the 0.31.9 builder finishes (it was briefed with the lead's version).
- **"The whole Channeler class is useless now that a load of old perks went into the alpha skill's ladder"
  (Leon):** a class must be the best user of its door, not a second copy of what the skill's points already give.
  Audit all nine base classes against their alpha skill's ladder (what each rank's two moves give that the ladder
  does not), Channeler first, and redesign the moves that are empty or duplicated; put the audit table to Leon. In
  0.32, with the fork slice.
- **The ladder, Leon's ruling (17 Nov, screenshot of Pain Threshold's ladder with "—" at 1, 2, 4, 6, 8):** delete
  the "EVERY POINT" block; put what every point gives INTO each level that would otherwise be empty (the "—" rows),
  as card lines ("+10% elemental resistance", "+2 max HP a level"). And every number names its unit: "Enemies need 1
  more to spot you while you sneak" must say 1 more WHAT ("+1 to the roll enemies need to spot you"). The lead applies
  this in apps/web/src/screens/shared.js roadMap (empty steps take the head rows; the head block is not rendered)
  after the 0.31.9 builder finishes, with Iron Heart's ruling.
- **The ladder, two more rulings (Leon, 17 Nov):** (1) EVERY level lists what every point gives, in addition to
  its perk, fork or unlock (else a perk level reads as if it forgoes the per-point gain); gains that start later show
  from their first level. (2) **Spread the unlocks out:** today 3 and 5 give both a named passive AND a perk step
  while 1, 2, 4, 6, 8 give nothing: move the named unlocks onto the empty levels so no level carries two things and
  none is empty. A RULES change for all 27 skills (which point each unlock is earned at; data/skills.json unlocks;
  spec first). Lead's proposed mapping, to confirm with Leon: beta and gamma: the unlock at 3 moves to 2, the one at
  5 to 4 (7 to 6, 9 to 8 where one exists); perk steps stay at 3 / 5 / 7 / 9, Mastered at 10. Alpha: the door at 1,
  forks at 4 and 6, perk steps at 3 / 5 / 7 / 9, so its door verbs at 3 and 5 move to 2 and 8 (or stay, and the
  alpha's empty levels 2 and 8 take the per-point line only). Moving an unlock earlier is a buff: measure. 0.32.
- **Leon: YES to the mapping** (beta / gamma: passives at 2 and 4, perks at 3 / 5 / 7 / 9, Mastered at 10). **And
  alphas give too much:** "all alpha are giving so much there isn't even space to put it all": where an alpha's
  ladder has more than its levels can hold, MOVE the surplus abilities (the old perks folded into it, the extra
  passives) out of the alpha and into its attribute's beta or gamma skill (or another skill where the ability
  belongs), so every skill of an attribute has reasons to be bought and the alpha keeps: the door at 1, one thing a
  level, forks at 4 and 6, perks at 3 / 5 / 7 / 9. Do it as one table for all nine attributes (ability, from, to,
  why) for Leon's edits, with the class audit and the fork slice, in 0.32. This also answers "who will ever put
  points in beta and gamma" and "the class is useless": decide ladder, class and fork contents together.
- **Outburst "What it does" options that cannot be earned (Leon, 17 Nov):** the Outburst designer's "What it does"
  row (the school / effect of a design) has options a character can only ever hold through the one starting spell
  picked at creation: nothing in play grants them. NOT investigated. Trace: which schools / modules a design can
  use, how each is learned (creation, practice picks, a Heart plate's lesson, the training ground, a boon), and list
  those with no way to earn; then give each a source (practice picks or the Heart plate, by plateChoices) or say why
  it is creation-only. 0.32.
  Leon: the missing one is **Damage**: the Damage "What it does" can only be had from the starting spell. Start the
  trace there (is the Damage school in plateChoices and in the practice picks; does a character whose starting
  design was not Damage ever get it).
  CORRECTION with Leon's screenshot: it is the Damage school's four WAYS in the "What it does" row (Strike, Finish,
  Brand, Drain; rules 1.19) that cannot be earned: a character holds only the way its starting spell came with.
  Lead's proposal (ask Leon): Strike is free with the Damage school; Finish, Brand and Drain are learned like
  modules (a practice pick, or a Heart plate's lesson through plateChoices), and the same check for every other
  school's ways (Buff, Heal, Shield...). Also that card's text is a paragraph: card style.

## U. FIRST JOB AFTER THE USAGE RESET (Leon, 17 Nov): the whole-game wording pass
"Have haiku or someone go screenshot every screen and you rewrite it after looking; this is so widespread."
1. A haiku agent (cheap; no judging) drives the browser and saves a screenshot of EVERY screen and state into one
   folder with an index: title, lobby, creation (all 7 steps, a skill's "?" open, a trait, a patron), the sheet's
   every tab (SKILLS with a ladder open, STATUS, PERKS, GEAR, ARMS, MAGIC with the Outburst designer and the Sigil
   tab, FAITH), the level-up screen, the camp, the path map with a node card, each node kind (shop, Forge, rest with
   Training, shrine, Crossroads, cache, vault), the reward panel, the boon pick, the fight panel with each tab open
   and an action selected (tooltip visible), a token hover card, the victory panel, the field, the run summary,
   settings. At 1600x900. It only captures; it changes nothing.
2. The lead reads every screenshot once, asks the three questions (CLAUDE.md "Say the core, once, and stop"), and
   rewrites the words directly, in data and templates, in one pass: card lines, units on every number, no formula,
   no sub-text, nothing twice, no rule numbers.
3. Check, one browser run, deploy. Then the 0.32 tables (ladders, classes, forks per attribute) for Leon.

## V. 0.31.9 IS LIVE (17 Nov, night). What it holds and what it does NOT
In: Strain always shown while an Outburst is held; Shape = the free Pump's multiplier +0.12 (NOT +0.2: 0.2 and 0.15
break the Outburst peak band at level 5, 217% / 214% against 212%; refit the band to go higher; the free Pump is
gated on Will Power 3, the "Empathy 3" text was wrong); Iron Heart no longer raises the Strain limit; Syphon draws
30 / 60 / 90 / 120 MP by band and takes 6 from the air; the Survival Boss gives no MP back (fight, Elite, cache,
vault and Rest MP untouched: confirm with Leon whether only the Boss was meant); rule and item numbers out of player
text with a validator check; the lightbox shows the thing's text; Traits, Perks and FROM YOUR SKILLS fold, closed by
default.
**NOT done, owed first:** (1) Iron Heart is the builder's "once a fight, Strain that would go over your limit stops
at it", NOT Leon's ruling (once a fight, on reaching Mana Shock, relieve 2 Strain): change it. (2) The ladder layout
(every level lists the per-point gains; no EVERY POINT block). (3) The 27 skills' own rows in card style (82 rows,
64 unlock lines). (4) Section U, the whole-game wording pass. (5) Nobody looked at 0.31.8 or 0.31.9 on screen.
- **0.31.10 live (17 Nov):** no Survival node gives MP back (fight, Elite, cache, vault, Boss all 0); the mana
  forecast sits above the small map (z-index; not seen on screen). A Rest still restores MP: ask Leon.

## W. 18 Nov: where the current plan lives

This file is the record of rulings up to 17 Nov night. From 18 Nov the working documents are
`TAKEOVER-2026-11-18.md` (state, commands, how Leon works) and `ATTACK-PLAN-2026-11-19.md` (the five lanes and every
ruling of 18 Nov: the skill system's scope, the outside playtest's triage, the approach banner and music, no
fog-walk before VICTORY). Live: 0.31.10. Nothing is scheduled until Leon says "schedule it".
