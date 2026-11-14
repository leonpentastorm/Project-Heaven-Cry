# Survival: gear by mode and the camp's loadout (rules 1.52; 14 Nov 2026)

> **After the integration (14 Nov 2026):** this branch was joined with the others for 0.27.0 and changed there. The camp is
> ONE flow on the loadout's screen (the loadout, then the starting boon, then Ready); the camp's free armour and free
> magazines are gone (armour is bought); the reviewer's defects were fixed (Shelter, the offer by what a character can
> use, Bandolier and Deep Satchel, the cores back, Long Hand); the free weapon is the most basic of each archetype with
> a rack beside it (Leon's ruling); the solo pressure is 1.3. Rules 1.51 item 10 and rules 1.52 items 8 to 10 say what
> holds now; the measure on the joined tree is rules 1.52 item 3916.

Leon's ruling (binding): *"Revamp the character creation screen and remove the kit then, we give people stuff base on
the mode. Survial will give you one low level melee, one low level gun, a bow, one of the 4 focus and a budget (like 200
points or smt) for them to choose ammo, stims and armor and such, a character going out with armor will lack in many
other things."* Then *"only one weapon"* and *"1 weapon for free, take anything else with cost from the shop menu."*
The rules are rules 1.52 (`docs/rules/PHC-Core-Rules-v1.0.md`, items 3900 to 3912) and the survival spec's fourth
"Settled by Leon" block (rules 2 and 28 rewritten, section 5.4's ammunition).

## 1. What was built

| Piece | Where | Built from (the engine's primitive) |
| --- | --- | --- |
| A sheet with no kit; a bare character (`c.bare`) | `character.ts` (`Sheet.kit` optional, `BARE_KIT`, `newCharacter`) | the kit path itself (a bare kit) |
| Gear by mode (`modes.json` items[].`loadout`: `camp` / `kit`) | `src/loadout.ts` (`modeLoadout`, `campaignLoadout`, `kitFor`, `giveKit`, `gearIfBare`, `stripGear`) | `KITS`, `grantStartItems`, `startCollection`, `armourCap` |
| A campaign's loadout at `session/start` and a mid-session `char/add`; the Proving Ground's at `sandbox/start` | `game.ts` | the same reducer cases |
| The camp (`run.state` `loadout`; `run/loadout`, `run/ready`) | `run/loadout.ts`, `game.ts runAction` | the shop's menu (`counterLines`, `lineGoods`, `priceOf`), `magazineWorth`, `packAdd`/`intoCounts`, `carriedKg`/`carryLimit`, `armourGateWhy`, `requiresWhy`, `twoHands`; the ready rule of `leaveShop` |
| Body armour as a price | `credits.ts priceOf('armour:<class>')` (`rules.json armor.classes` prices) | the one price door |
| The camp's view | `run/loadout.ts loadoutView` | `gearPreview`, `meBlock`, the reducer's refusals tried on a copy |
| The camp's screen | `apps/web/src/game/LoadoutScreen.tsx` (from `RunScreen.tsx` when the state is `loadout`) | the house frame's inks and fonts, `gearIconUri` (the painted gear icons) |
| Creation's Kit step removed | `apps/web/src/screens/create.js`, `templates/create.template.html` | (the step is now **Moves**: techniques and magic) |
| Validator | `tools/validate.py` (modes' `loadout`; `survival.loadout`'s weapons, foci, stock prices; `armour_fit` 1 to 4) | |

No new primitive: the camp is the shop's menu with a free weapon and focus and a budget. Lints untouched.

## 2. The rules in short

- A new character is bare. A sheet or draft that names a kit keeps it (old drafts, tests, the golden tables: nothing
  moved), and a character in a save is never stripped (the old-save fixtures load and play).
- Survival: `run/start` strips the squad (trait items and plot items stay) and opens the camp. Each player picks ONE free
  weapon (melee, gun or bow: a gun loaded and with one spare magazine, a bow with one quiver read from its own data),
  ONE free focus or none (the Evoker and Visualizer bring a core), and spends the budget on the shop's own menu (every
  counter shelf but the restock, and a fixed starter list of gear: second weapons, a second focus, body armour by
  class, worn pieces). The unspent budget is the purse (`run.start_credits` 150 → 0). Ready from everyone (or the
  host's "Start for everyone", which gives an untouched loadout the Recommended one) leaves for node 1.
- A campaign gives a bare character a fixed loadout: the campaign's own `loadout`, else the old kit chosen by the door
  skill (Brain Power the Sigil student's, Will Power the Soul initiate's, Empathy the medic's, else the line soldier's).

## 3. The budget (a call for Leon)

**Leon's 200 works as credits** (Light armour 150 is three quarters of it) **but the squads fell in stage 1 with it**.
Measured at 200 with the stims-first Recommended (SIM-1 to 3, gear route): a duo lost stage 1 on 3 seeds of 3, a squad
of four on 2 of 3, a solo gunner on 2 of 3. The old kits carried Class 1 to 3 armour, 144 rifle rounds or 4 cores; a
bare start is a big drop. **The budget is 300**: Light armour is still half of it. The four sample loadouts:

| Loadout | Free | Bought | Kept |
| --- | --- | --- | --- |
| A gunner, no armour | service rifle (24 + 24) | 3 stims 240, 20 rifle rounds 40 | 20 |
| An armoured blade | ork machete | Class 1 armour 150, a stim 80 | 70 |
| A Sigilist | service pistol, Evoker (+1 core) | Class 1 armour 150, a core 150 (no armour: two cores, 0 kept) | 0 |
| A healer | service pistol, Attuner | Class 1 armour 150, a field kit 120, 20 pistol rounds 20 | 10 |

Today's flat purse was 150 credits on top of a kit.

## 4. The measure, before and after (gear route, stages capped at 5)

Before: rules 1.49's tables (`survival-steps-9-10.md` section 5; SIM-1 to 4, the old kits). After: rules 1.52's dials
(budget 300, armour-first Recommended, solo pressure 1.6, solo Elite damage 0.6), SIM-1 to 4.

| Cell | Before: ends (median, mean); cleared stage 1 / 2 / 3 | After: ends; cleared stage 1 / 2 / 3 |
| --- | --- | --- |
| four · gear | 3.5, 3.4; 100 / 75 / 0% | 1.6 (stalled), 3.8, 4.15, 4.8; 75 / 75 / 50% |
| duo · gear | 2.5, 3.6; 100 / 50 / 50% | 2.5, 1.10, 4.15, 2.6; 75 / 25 / 25% |
| solo gunner · gear | 1.7, 2.6; 50 / 25 / 25% | 1.8, 3.10, 1.1, 1.10; 25 / 25 / 0% |

The guard (`npm run check`: solo gunner, GUARD-1 to 3) passes. Parties now also carry a melee weapon, a bow or a focus
only when Recommended picks it: each character has ONE weapon (Leon's correction), so the sim's gunners carry no
sidearm, its casters a pistol and their focus. The four-character run is about where it was; **small parties are harder
than before** (the duo by about one stage). Dials tried and not kept are in rules 1.52 item 3910. Not fixed: the duo and
the solo gunner on the gear route (a call: a bigger budget or the small-party Elite shares, after a playtest).

## 5. Calls for Leon

1. The budget is 300, not 200 (section 3).
2. Recommended takes Class 1 armour first for every profile (the measured fit).
3. The camp's gear shelf is a fixed list, not a rolled stock, so every player sees the same choices.
4. The Evoker and the Visualizer bring one core free, as a gun brings its spare magazine.
5. A campaign's default loadout is the old kit by the door skill until the campaigns name their own.
6. The Forge fits Class 1 armour (100), since a character may set out with none.
7. The free list: knife, hatchet, machete; service pistol, drifter revolver, sawn-off, the service rifle; recurve bow,
   crossbow. The service rifle is in it (the AHOC's issue weapon), though it is not "low level" by price.

## 6. What else on the creation screen I would revamp (not done)

1. **The step counter reads 7 steps for what is now 6 decisions.** Moves holds only techniques and magic; a build with
   neither sees one line. Folding Moves into the Skills step (the picks appear under the skills that open them) would make
   creation five steps and tie each pick to its reason.
2. **Lock in repeats Skills.** The record, the tree and the traits are the same panels as earlier steps; a one-screen
   summary card (portrait, top skills, class lean, traits) would read faster.
3. **Identity is long for a first visit:** the song, the dream and the history could fold under "More about you".
4. **The archetype grid** shows 46 cards; a "recommended for Survival" mark on the presets that play well solo would
   help new players, now that the mode decides the gear.

## 7. Proof

Engine: `test/survival-loadout.test.ts` (each action and refusal; the budget; the purse; a declined focus; weight; a
campaign's loadout; the Proving Ground; Recommended's four profiles), the survival suites through the test room's camp
skip (`run/start` camp `recommended`), `run-state` and `old-save` through the host's close; golden tables and replays
unchanged. Browser: `room` (two browsers: both ready), `survival` (picks, a refusal, Recommended, Start), `kit-map`,
`creation-layout`, `gear-icons`, `physical`, and the creation-walking suites without the kit click. Screenshots of the
camp at 1280 and 1920: the session scratchpad (`loadout-1280.png`, `loadout-1920.png`).
