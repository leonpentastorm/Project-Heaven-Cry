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
