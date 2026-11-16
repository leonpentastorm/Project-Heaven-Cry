# Session to-do, 16 Nov 2026 (after 0.30.0 went live)

Leon's word (16 Nov): **"to live when all green"**. 0.30.1 deploys when its fixes, check and browser suites are green;
0.31.0 deploys when its lanes are merged, reviewed, green and browser-checked. Each deploy gets `backup/live-<version>`.

Live: **0.30.0** (commit 44a1d686, `backup/live-0.30.0`; 0.29.0 kept as rollback).

## A. Hotfix 0.30.1 (branch `hotfix/0.30.1`, worktree E:/phc-wt/rel030)

Built and green at 15bb42fd; a review found one blocker and two majors, being fixed:

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
