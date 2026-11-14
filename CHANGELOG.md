# Changelog

Project Heaven Cry is numbered **0.MINOR.PATCH** until the 1.0 release.

- **Every branch merged into `develop` bumps the middle number** (0.0.1 → 0.1.0 → 0.2.0 …). The person who merges bumps `"version"` in the root and every workspace `package.json` and adds an entry here.
- **The first number becomes 1 at the 1.0 release** (the web game is shipped; Leon calls it).
- A hotfix committed straight to `develop` without a branch bumps the **last** number (0.3.0 → 0.3.1).

The game shows its version in the corner of the title screen and in every "Report a problem" bundle (`gameVersion`), read from the root `package.json` at build time (`apps/web/src/version.ts`).

## 0.27.0 — Survival mode

The first real game mode, and the roguelike's first piece (rules 1.39 to 1.49; `docs/design/survival-spec.md`; the
pick-up is `docs/design/handoffs/SURVIVAL-PICKUP.md`). Built, **not live until Leon's word**. What to try by hand:
`docs/PLAYTEST-CHECKLIST.md` section S, which ends with every call made for Leon.

- **Choosing a mode.** The lobby shows three large cards under the seats: SURVIVAL (a new room's default), ROGUELIKE and
  CAMPAIGN (locked, "Coming"). The Narrator panel is collapsed in Survival: no API key is needed to play.
- **The run.** One to four players start at level 1 and walk stage after stage until the squad falls or retires after
  a Boss; how far you get is the score. Each character keeps its own purse and its own rewards.
- **The path map.** A themed overland map: 3 or 4 lanes from the camp that run straight for several nodes and meet only
  at junctions, the gate (an Elite every lane passes), the final junction, then a shop and a rest before the Boss. Each
  stretch of lane holds something different, so you choose by reading ahead. One dead end a map holds a guarded vault:
  a fight past an Elite's and a chest a grade better than the stage's picks. In co-op each player marks a trail where
  the way forks; a tie goes to the host. The map fits its frame at every screen size.
- **Fights made for your squad.** Every fight is generated from a budget in Soldier-equivalents for the squad's size,
  level, the node and the stage: length (bulk) and danger (pressure), from templates (a firing line, a swarm, a rush, a
  caster and guards, an ambush, a line with a medic, drones, an Elite and its line, two Elites, the champion) on a
  generated map built from the setting's kit. Ordinary foes lag behind your level; Elites and Bosses keep pace and pull
  ahead stage by stage.
- **Rewards.** After a won fight: XP, credits, a magazine's worth for every gun you carry and a pick of three weapons
  (one for your own door) or credits instead; Elites and caches add a pick of kit (mods, worn pieces). A character who
  dies in a won fight stands up at 1 HP with its full share.
- **The shop** (full screen, a keeper per setting): every calibre always in stock, rolled gear, selling, restock, the
  grade step (Fine 1,500, Masterwork 3,500), gives between players, a compare panel with the engine's numbers.
- **Growing in a run.** The Forge (grade steps at 80%, the Relic step with a named property from stage 3, mods, worn
  pieces, armour fitting), training grounds (drill, study, practice), shrines (a rite, a knowledge piece or a patron's
  token), rests (a full heal, a new session and a small training), caches, and the Crossroads' trades.
- **Stages and boons.** After each Boss every character picks one boon of three (thirteen rule-changers: Honed, Second
  Wind, True Aim, Hardened…; at most 50% of a rifle-turn of run power each, Relic properties and tokens included),
  then the squad picks the next tile of the world (six settings).
- **The summary and Report a run:** stages, nodes, the path, each fight's tally, levels, classes, boons; one file to
  send; keep the character as a draft at the level it reached.
- **The fit (rules 1.49).** Whole runs were simulated through the rules (solo, two and four characters; gunners,
  casters and a healer; three ways of choosing lanes) and the curve fitted by data alone (rules 1.49): Elites and Bosses pull ahead two levels a stage (to four), fights grow a little longer and the danger cap with them, small parties meet their Elites at full strength, credits instead of a pick are a tenth of its price, and XP per stage is raised. A squad of four now ends in stage 3 or 4, a duo in stage 2 to 4, a solo gunner in stage 2 or 3 (before: every party with a gunner reached stage 5).
- **Repair (rules 1.50).** The shop and the Forge are the Core Rules' gunsmith: a weapon or shield back to full
  durability for a tenth of its price times the share worn (at least 10; 80% at a Forge), on a Repair shelf beside the
  grade step. Wear bars on the shop's and every place's hands and pack and on the path map's squad panel, with a
  ⚠ WORN / ✕ BROKEN mark, so a worn gun is seen before a lane is chosen.
- **The browser suite `survival`** walks all of it, two browsers included.
- **Effects: the bullet in flight is back; the yellow tracer lines stay removed** (Leon, 14 Nov: the 13 Nov cleanup took the bullet's own flight along with the tracer lines). Every round fired flies from the muzzle to where it lands as before, hit or miss (a shotgun shell as its five pellets, an arrow as its shaft); a hit still leaves its hole, a miss no dust.
- **Bows and quivers (rules 1.53, Leon 14 Nov).** No more Nock an arrow (it was the bow's reload, and a quiver could
  never be refilled in a fight, so it could never be taken): a shot draws its arrow from the worn quiver. Every archer
  may carry **two quivers**, worn and ready; **Switch quiver** is the bow's reload (2 AP, a reload's price). A quiver is
  graded gear: its grade gives **arrows held and nothing else** (Standard 40, 20 more than before; Fine 50 to Celestial
  80); accuracy is the bow's. **One enchantment a quiver** rides every arrow drawn from it: Ember, Storm, Frost, Stone,
  Gale or Acid (the Outburst tones' riders, ×0.9 damage, 400 credits), with its element's hit effect. In Survival the
  counter sells a quiver to an archer, picks and the vault may offer one, the grade step and the Forge's Relic step grade
  it, and the Forge stocks the enchantments; two Celestial quivers are an archer's run goal. What to try:
  `docs/PLAYTEST-CHECKLIST.md` section B; the hand-off `docs/design/handoffs/bows-quivers.md`.

## 0.26.0 — Classes 3.0

Class Roster Revision 4, built as one patch (rules 1.28 to 1.38). Every mechanic is now a **door**: open to anyone through its attribute's alpha skill, used better by its base class. What to try by hand: `docs/PLAYTEST-CHECKLIST.md` section 0, with the 53 calls made for Leon at its end; every system against 0.25.0: `docs/design/handoffs/PATCH-TALLY.md`; the mission: `docs/design/handoffs/CLASSES-3.0-PICKUP.md`.

- **Nine classes, new names.** Bulwark (Endurance), Breaker (Strength), Skirmisher (Agility), Operative (Perception), Sigilist (Intelligence), Rigger (Expression), Mender (Insight), Channeler (Determination), Chaplain (Virtue). The ids are Revision 3's, so saves load unchanged. Each base class is weapon-neutral and has exactly three kinds of edge: a bigger meter, one thing a turn cheaper or free, and six moves of its own (two a rank). The perk Bulwark is now Stonewall.
- **The doors.** Guard (Durability), Momentum (Raw Power), Pressure and Heat (Dexterity), Shadow (Ingenuity), Sigils (Brain Power), Figments (Visualization), Bonds and Tending (Empathy), Outbursts (Will Power), Blessings (Faith): with points in the alpha skill (and its focus) anyone plays the loop, a little under the class.
- **Shadow** (new; the Operative): a meter of 0 to 3 that grows while no enemy sees you, spent on verbs in four groups (Slip, Mark, Work, Break) on the SHADOW tab; the Break rides your attack as a toggle. A Hidden token is drawn at 60%.
- **Bonds and Tending** (new; the Mender): an Attuner in hand, ties to allies (and, with a save, to enemies); heals, shields and help travel along them on the TEND tab; hits on a Bonded ally are shared; the Mender's Ledger fills as it tends and pays into its strikes. The Bond strip in the unit panel, a faint pink line on the map (a small link mark between neighbours).
- **Figments and the Visualizer** (new; the Rigger): a glove with a projector in the palm; the bots build a Double, an Eye, a Wall, a Beast or a Blade, which act on your AP from the FIGMENTS tab, soak fire, fool enemies and come apart when let go. Their HP follow Visualization.
- **The Chaplain:** Ward (a Whisper that shields), Sanctuary (a Hymn that lays a zone), Smite (your patron strikes with your weapon hit while you are Witnessed, once a turn) and Verdict; the patron stands at your side while Witnessed. **Anyone Faithful prays from Faith 1** (Whispers; Hymns still need Faith 3).
- **Reactions made real:** one door for every reaction, one a round (pips beside AP), a reaction never triggers a reaction, Suppressed never blocks a protective one. The Skirmisher's **Reflex** gives two; Killzone and Run and Gun on it.
- **The enemy acts on what it sees:** an enemy no longer knows where an unseen character stands; it walks to where its side last saw you, searches toward a hit from the dark, flanks through cover to skulk, never lets a Boss hide after round 1, hunts the healer it is Bonded to, shoots characters before Figments, avoids Sanctuaries, Wards and held Overwatches it can see.
- **The level scale ×7.5 and heals in percent (rules 1.36):** a plain hit is 40 at level 1 as before and about 300 at level 20 (geometric); HP, armour, Guard and shields grow with it, so a fight takes about as many rounds at any level. Heals and shields are measured in percent of HP: the top heal is about 65% of a body a turn, Tending heals most, every heal and shield has a floor. Old saves move into the new scale once. Readouts use thousands separators.
- **Guns:** **Mag Dump spends 4 rounds a roll, 12 at most** (a 200-round belt no longer empties in one go; its rolls and damage are as before: one roll for every 3 rounds left, three at most). The **Emanator katana** (a mana arm that counts as an Emanator) is in; a focus is now whatever item or weapon carries a focus block in data.
- **Balance (rules 1.38):** every new line measured at levels 1, 5, 10 and 20 against the balance contract; the Mender's offence fitted; the Figments door and the Rigger sit under their lines and are not fitted yet (they need a class-only term). Numbers: `docs/design/handoffs/classes-3.0-step-11.md`.
- **Effects:** tracer lines, swing arcs and miss effects removed; a hit leaves its ammunition's mark (a bullet hole, a shotgun's pellets, an arrow's shaft); a feeling's unlock card now waits until the attack it was felt in has played (its rattle no longer came a second before the first muzzle flash).
- **Art:** the 151 painted Heavenprint gear icons (the backpack, the gear tab, piles, the Proving Ground), loaded after the title.
- **The screen:** the TEND, SHADOW and FIGMENTS tabs in their attribute's ink with group headers; a Figment's group headed by its face; refusals in words ("Needs an Attuner in hand."); the reaction pips; six tabs fit on one row (the counts move to the tab's corner).
- **Hover no longer halves the frame rate** while a unit walks or the camera glides (a tile entered no longer re-renders the whole screen).
- **M813 is off the menu for now** (Leon): the Proving Ground comes first on the title, and a new room starts on the Narrator's own start; M813's data, tests and lore stay (`data/campaigns/m813.json` `listed`).
- **Not built, for later:** Parting Cut and Case (Shadow); Smite's chip on the attack card; the aim marks on a Bonded ally; two Sanctuaries on one tile still stack; NULL on a Figment; the enemy's squad plan against reactions; enemy versions of the new doors.

## 0.25.0 — 13 November 2026

What Leon found playing 0.24.0, the bugs the Classes 3.0 spec writers found, and the tools that keep the engine in one piece.

- **One hover card everywhere.** Every hover text in the game (298 of them) is the styled card now: a name, its costs, one line a sentence. No browser tooltip is left, and a test fails if one comes back. One card at a time: the feeling pop-ups no longer stack.
- **Two guns:** one **Clear jam**, in the Both group: it clears every jammed gun you hold for one price (Leon's ruling; the screen read only the main gun's jam before, so the off hand's was invisible). A jammed gun says JAMMED on its own header. **"Shoot an object" is "Attack an object".**
- **One fact, one place:** Heat, rounds, Momentum and Guard are in the unit panel only; the line under the tabs no longer repeats Stage, Strain, MP, Charge and Flux; a feeling shows its step once; the Momentum meter has one summary line and its full text in the card.
- **What is shelved is hidden:** a Sigil word no longer shows a Grand form nobody can lay; the practice picker and the Proving Ground's design builder no longer offer advanced-class modules. Read from data, not a typed name.
- **Fixed:** Execution killed an Elite that the Elite and Boss guard had just left on 1 HP. **An enemy that sees nobody no longer stands still:** it walks to where its side last saw you (and is no longer told where you hid if it never saw you hide). Killzone no longer hands its reaction back between its two shots. Acuity's and Improvisation's attribute tags were swapped in the data. Blade Recluse no longer promises "weapon mastery" (retired in rules 1.12).
- **For whoever builds next:** `docs/ENGINE-HOOKS.md`, a catalogue of every hook, trigger, condition, op, formula profile, cost site and scope, generated from the code and checked by `npm run check`; `npm run built-from`, which tells a spec or a diff when it is building beside the engine; "Stop: before you build" at the top of `docs/ENGINE-GUIDE.md`.
- **Designed, not built:** Classes 3.0 (Class Roster Revision 4): `docs/design/handoffs/CLASSES-3.0-PICKUP.md`.
- **Not reproduced:** four Ripostes in one round (the engine counts one reaction a round on every path tested). If it happens again, use Report a problem at once.
- **An off-hand shot that overheats jams the off-hand gun** (Leon's ruling; the shared Heat limit was read wrongly while the off gun fired, so it jammed late and the next main-hand shot jammed the main gun).

## 0.24.0 — 12 November 2026

What Leon found playing 0.23.0 on its first night, and rules 1.27.

- **Healing was over-nerfed (rules 1.27, provisional).** A healer's whole turn, all in, is now worth 2.0 Soldier-turns (1.25 before), 1.6 for a normal build: about ×1.6 on every heal and shield. A level 1 Recruit with no Soul skill heals 15 with a stage 4 Mend (9 before); a trained healer's steady turn 33 (21 before). Prayer heals and shields have their own dial now and rise ×1.51. Enemy healers are unchanged.
- **Every physical technique has its own animation:** an attack beat that plays whether or not it lands, and a result that is different for a hit, a miss and a critical, so a miss is never only text. 72 of 72 (56 before, many of those only a mark over the generic lunge). Sunder shows your own weapon striking before the shield breaks. One table (`fx/techniqueFx.ts`): a new technique is one row, and a test fails without it.
- **Shots on screen match rounds spent.** A Burst spends three rounds and now shows three tracers and three casings (it showed one per roll: two). Every gun and shooting technique is checked.
- **The fight camera moves properly:** timed by distance (0.3 s for a hop, up to 0.86 s across the map at Normal), eased with a small settle, a slight pull-back on long moves, and a move that interrupts another blends from its speed (the old one restarted three times every enemy turn). Your own drag or wheel cancels it. Enemy turns are not slower (1.76 s a turn at Fast, 1.82 s before). The numbers are one block at the top of `game/camera.ts`.
- **Action tooltips are cards with lines:** the name and its costs, one line a sentence, the weapon's modifier and each weapon trait on their own lines, a refusal last.
- **Two weapons:** the Attack tab is grouped by main hand, off hand, Both and Other, with a thin line between. The off-hand gun has its own Reload, Clear jam and Shoot an object (before, once the main gun was full the other could not be reloaded, and a jammed off-hand gun could not be cleared). **Each gun jams on its own** (a new rule, the lead's call: an off-hand fumble used to jam the main gun). Hotkey codes go past the ninth row.
- **Fixed:** a hovered map tile and its tooltip drew over the column letters and the mini-map after the map was dragged.
- **Waiting on Leon:** how the camera and the new animations feel; whether 2.0 Soldier-turns is enough healing (the dial is one number, `balance.ceilings.healer_turn`); each gun jamming on its own; "Reload both" still greys out once one gun is full (the rule as written).

## 0.23.0 — 12 November 2026

The balance pass and the engine foundation: rules 1.15 to 1.26. Everything in it is new to players (live stops at rules 1.14). The full list of what changed against 0.22.0, system by system, is `docs/design/handoffs/PATCH-TALLY.md`; what to try by hand is `docs/PLAYTEST-CHECKLIST.md`.

**The balance pass (rules 1.15 to 1.26).**

- **Enemies grow with you** (1.15): HP, damage, to-hit and defence by tier and level, about 65% to hit at equal level, a Vermin tier that dies in one hit, criticals ×1.5 (to ×2.0 with Perception and Dexterity), no one-hit kills of Elites and Bosses by a level gap, a 3-turn cooldown on conditional AP perks.
- **Maps and camera** (1.16): up to 26 × 26, a camera that follows the play, overview on M, edge arrows; plain colour until the M813 rewrite. Two-key hotkeys (11 move, 42 Evoke).
- **Ceilings** (what an all-in build reaches, percent of the normal-share plain rifle; a normal share sits at ceiling ÷ 1.25):

  | System | Ceiling |
  | --- | --- |
  | Best gun, steady | 145 |
  | Melee (the Defender lower) | 165 |
  | Outburst, steady / biggest Release | 135 / 165 |
  | Sigil full Line | 150 to 200 |
  | Faith, a Whisper turn / a Hymn turn | 80 / 150 |
  | A healer's turn | 1.25 Soldier-turns |

  Guns, melee, Sigil, the Outburst, healing and Faith were each re-fitted to their line with one dial in data (`docs/design/balance-contract.md`, and its guard in `npm run check`). Detail and before-and-after: `balance-refit.md`.
- **Guns** (1.18, 1.26): a Burst is 3 rounds and 2 rolls, Mag Dump 3 rolls at most, the long rifle's Shot costs 3 AP; Masterwork, Relic and Celestial add accuracy and durability, no damage; grenades and charges a character throws ×0.7. Enemies keep the old three-roll Burst for now.
- **Sigil** (1.17): a Line multiplies its damage for 2 / 3 / 4 glyphs; one Evoke leaves a full-HP Elite or Boss on 1 HP.
- **Outburst** (1.17, 1.19): a plain Pump is +0.2, each feeling goes into an Outburst once, one free stage a turn, the schools read the stage (Damage: Strike, Finish, Brand, Drain).
- **MP** (1.24): Max MP is 100 + 75 × (Determination − 1) + 25 × (Insight − 1); a Pump costs MP; seven archetypes re-spread; old saves migrate.
- **Faith** (1.21, 1.22): a seventh Whisper (Rebuke); the Hymn waits 9 − 0.75 × Faith − 0.25 × Virtue rounds (never under 3), and a vow fulfilled in the fight takes a round off; Witnessed's +2 is earned by a kill.
- **Healing** (1.20, 1.23): sized in Soldier-turns, a level factor so it keeps pace, no round limit on healing, the medic's kit re-sized; enemies go for whoever is mending the squad. Boss HP is 820 at level 1 (was one flat 200 row, now it grows with level).
- **Fire doctrine** (1.25): Minions take the nearest, Soldiers spread their fire from the front, Elites and Bosses go for the wounded and hunt the healer.

**The engine foundation** (nothing in play was meant to move; golden tables pin it).

- **One damage formula** for weapons, Sigil, the Outburst, prayers and heals; saves in one place; one rule for forced movement; costs and counters through one price; the condition table read from `data/conditions.json`.
- **Fog of war in the engine**: a guest's view holds only what its side sees, and now the fight log too: a line that hits you from the fog reads "Something unseen shoots Cy from somewhere unseen".
- **Action descriptors**: one client flow for all seven action systems (571 client lines gone).
- **Item ops, first pass**: closed lists of triggers, predicates and ops; **20 of 310 handlers moved to data** (289 still code); a lint stops the number growing.
- **Text numbers from data**: a number in a card text is a `{=placeholder}` that reads a field of its own item; 306 text mismatches fixed.
- **Performance**: the engine about 3 times faster with identical whole-game results, and a replay guard.

**Bugs fixed** (from Leon's playtest of 0.22.0, `BUGLIST-0.22.md`, and the first full browser run).

- An element's area effects now happen when the hit kills: Storm chains, fire spreads and burns the ground, rubble rises, the gale throws the others (found by Leon on live).
- Called Shot showed no part ticked while Confirm sent LEG.
- A second Whisper in a turn asked for a target before saying "One Whisper a turn."
- Clear all enemies counted a wave out of sight as 0 and was disabled.
- A glyph vanished before its Evoke played; Edge Word fired on an opportunity attack; the step out played before the blow that interrupted it; an enemy 13 or 14 tiles off never moved or fired; a shield did not stop a grenade or a trap.
- A fight's last blow, a new wave's opening, portraits changing, Lob, Suppress and Thumper effects, and enemies shown in the fog by an area preview.

**Art.** The artist's 77 icons (the modules, the 25 feelings, the Calls, Revert, Practice, Felt) are merged and shown in the game; painted icons take the same ink as the drawn ones through one mask.

**Tests.** The 61 browser suites are in groups, wait on state not sleeps, and the runner retries a failure once alone; eight suites that failed on the merged tree were repaired (three were game bugs). Golden tables pin every damage, heal, cost, condition and item-op number, and are re-recorded only on purpose; lints keep new code on the foundation primitives; the balance contract has a guard in `npm run check`.

**Not done, known.**

- 289 item handlers are still code (a second pass is planned after live); the combat screen is not split; Preview is not yet a dry run; character, unit and story state are not one table; rooms and the Narrator prompt are not refactored.
- The spec's revisions 1.14 to 1.26 are not folded into its body: read the revisions.
- Class moves, perks, Mastered perks, special rounds, Calls, reactions and armour are unmeasured and have no ceiling.
- Boss fights run 5 to 8 rounds against 8 to 10 aimed (the enemy table is the lever).
- A fight-log line that names a unit by another word can still reach everyone.
- Not yet run on a quiet machine: the final `npm run check` and `npm run e2e -- all`. Nothing has been played by a person.

**Calls made for Leon** (each built at the lead's recommendation; he can reverse any): the numbered list is in `docs/PLAYTEST-CHECKLIST.md`, section 14, and in `PICKUP.md` section 6.

## 0.22.0 — 11 November 2026

Branch `music/new-tracks`: **eight new fight songs and Gearing Up** (decision 114; spec, Music: "The fight's song" and "The Proving Ground").

- **Eight new fight songs** join Gunline for ordinary fights: Brass on the Floor, Danger Close, Flank Left, Held Breath, Hold the Line, Line of Four, Mag Check and Suppressing Fire. Leon made them with Suno (Pro plan, commercial use).
- **A picker** chooses one at random for each fight:
  - never the song the last ordinary fight had;
  - the same for every player in the room;
  - kept for the whole fight, through a reload, and when Heaven Falls or Last Rounds hand back.

  Heaven Falls (elites, bosses, Hard fights) and Last Rounds (half the party down) keep their rules. A fight already under way in an old save keeps Gunline.
- **Gearing Up** loops in the Proving Ground while you gear up, gives way to the fight's song, and comes back after. It restarts from the top each time.
- All nine loop seamlessly (loop points in `ost.ts`, measured), show their titles in the music panel and are on the Credits page.
- **Waiting on Leon:** the loop seams were checked by measurement only, not by ear. Listen to Line of Four and Gearing Up in particular.

## 0.21.0 — 11 November 2026

Rules 1.14.

- **Speaking in a fight does something.** Say is free and goes to the Narrator. **Attempt** (1 AP, once a turn) is for words that want something to happen: the Narrator answers at once in the log and may ask the game for exactly one thing: a check, one condition for a round (Shaken, Taunted, weapon lowered, Hesitates), a surrender, or a yes or no on a perk. The game checks the answer and keeps every number. With no Narrator connected the button is off and says why. Established Fact, Closing Argument, Their Own Idea and the Occultist's Look it up now go through this in a fight (they used to take their use and change nothing).
- **Overdraw** is once a turn: a Pump adds 2 stages; the first of a fight costs no Strain, each one after it 1.
- **Heart Overload** is rebuilt: once a turn, right after a Release at stage 2 or higher, Begin the same design again for 0 AP (tier II: it starts at stage 1). Short of mana, that Begin can be paid in HP. The Outburst row says when it is waiting.
- **Resonance** is rebuilt: each Release makes your next one 10% stronger, to +20% (tier II: +30%, and an ally's Release you can see adds a step). The Release preview shows it.
- **The perk card in a fight** has three shelves: Use now (buttons), Rides an action (where its switch is), Always on (with a live line: ready, used, waiting, or what it last did). Story-only perks are off the fight's card, and the tab counts only what you can press. Wall Run's strike and Company Man's extraction show the AP they really cost.
- What the builders chose where the rules were silent: `docs/design/handoffs/rules-1.14-as-built.md`.
- **Tools:** `npm run check`, `npm run try`, `npm run e2e`; `docs/TESTING.md` says which to use when.

## 0.20.0 — 11 November 2026

The playtest pass. It goes live together with 0.19.1 below, which was merged but never deployed on its own.

- **Every card says what it does, in plain words.** 1,411 player-facing texts were rewritten for a player in the middle of a fight: Calls, class moves, conditions, objects, perks, traits, Sigil words, Outbursts, prayers, weapons, and the labels, hints and refusal reasons written in the game itself. Each was checked against what the game actually does. Where the old card and the game disagreed (118 places), the card now says what the game does; the list is `docs/design/handoffs/text-pass-mismatches.md`.
- **One action keeps every effect it makes.** A hostile phase with more than 40 effects lost the oldest ones before any screen saw them (units jumped to where they ended). The list is now trimmed between actions, never during one.
- **Co-op:** the room no longer stops passing the game on when a player's old connection has died without a word (the guest sat on an old state while the host moved on); a guest that falls behind catches up by itself every few seconds; and a screen that is waiting for effects that will never play shows the real state after a bound instead of staying locked. The stall first seen on 10 November was not reproduced in 75 test fights, so it is listed as persistent, with these safety nets: `docs/design/handoffs/coop-stall.md`.
- **The perk and trait audit** (`docs/design/handoffs/perk-audit.md`): all 180 put through a fight, with what the card says against what happened. It is the ground for the new perk card.
- **For the artist:** `art/briefs/ART-REQUESTS.md`, the running list of art that is wanted, with direction and links to the guides.
- **Rules 1.14 is written** (speaking in a fight, Overdraw, Heart Overload, Resonance, the perk card's three shelves) and is being built; none of it is in this release.
- **Test tools:** a fast pace for the browser suites that don't look at animation (`FAST=1`).

## 0.19.1 — 10 November 2026

A hotfix for 0.19.0.

- **The game crashed on start for a save that held Grapple or Origami Hands.** Rules 1.13 renamed them (Iron Grip, Both Hands) and every screen that lists perks looked the old id up and found nothing. A save is now settled as it loads: renamed perks follow their new id with their tier, and a perk or trait the game no longer has is taken off the sheet. Browser test: `apps/web/e2e/old-save.mjs`.
- **Trick Shot's Ricochet, Spare, Nonlethal and the class toggles on attacks were missing** since attacks became techniques (0.18.0): they show again with any technique and are sent with it.
- **Hidden is shown on your own card** (it was in force but nothing said so).
- **A fight plays every effect, in order.** A hostile phase longer than about 7 seconds was sped up and its oldest effects skipped: a skipped push dropped a unit on its end tile, HP fell before the hit showed, and the hostiles' moves ran on into your turn. Now nothing is skipped or sped up in a fight (the speed setting is the only speed); HP bars (damage and healing), the combat log and whose turn it is all follow what has played, and YOUR TURN comes after the last hostile effect. Timed browser test: `apps/web/e2e/turn-order.mjs`.
- **On the tokens:** a shield shows as a pale bar over the HP bar and Guard as pips; a token's label lists its conditions with what each one does, and so do the condition chips.
- **Plainer cards:** the four held shots (Overwatch, Deny, Cover Me, Dead to Rights), the reactions and the terse technique cards are written as full sentences; no card or tooltip names a rules revision or an item number any more; four tooltips that repeated the text already on screen are gone.
- **Revert on the level-up screen:** the points and perk steps a visit spent come back, until a fight or a class settles them.
- **The story screen's skill panel shows attribute levels:** skills are grouped under their attribute, in the new order.
- **The recoloured Acuity and Improvisation pictures show everywhere** (the old ones were served from cache under the same name; skill pictures now carry a version).
- **A thrown weapon swishes** (it could play a gunshot), **the combat log scrolls** back through the fight, and **the AP an action will take pulses** on the bar instead of going hollow.
- **The Twin Pays** covers the Begin's 2 AP as well (spec item 1007).
- **A Legendary Deed** grants 1 Attribute point, and one Attribute point per deed may stand 1 above the level's ceiling (spec item 1006).
- **Both Hands** has its own icon.
- The rules spec in the repository is the source of truth; the Claude Doc is frozen at revision 1.1.

## 0.19.0 — 10 November 2026

Branch `claude/charming-gauss-hbq4n0`: **Skeleton 2.0** (rules 1.13), the skill-web pass. Design: `docs/design/proposals/2026-11-nine-doors.md` sections 13 to 20; plan and progress log: `docs/design/handoffs/skeleton-2.0-PLAN.md`. A new save is needed: characters made before this version don't carry over.

- **The rule of the web.** In every attribute the **alpha** skill is how you fight, the **beta** how you survive, the **gamma** how you talk and notice. Numbers moved to match: HP a level is Pain Threshold's; critical damage taken Acuity's; ambush damage taken Improvisation's; Sigil range and core saving Brain Power's; Soul range and ready designs Will Power's; healing given Empathy's, healing received Camaraderie's, shields received Conscience's; Karma Authority's.
- **Cores are no longer spent.** Body, Mind and Soul are group names. Creation is 10 Skill and 10 Attribute points with no attribute above 7; the attribute ceiling is 8 from level 3, 9 from level 6 and 10 from level 9, so a first Mastered perk comes at level 9 at the earliest. No Core points from levels. Mind Without Fog gives 2 Attribute points.
- **Names and slots.** Analysis is **Acuity** (under Perception) and holds Analyse and the detective perks; Proficiency is **Improvisation** (under Expression) and holds Field Repair and the fix-it perks, with a new EPCCG speaker (Drava Keel, Suggested). Implication is **Insinuation**, Vigilant **Vigilance**, Sensory **Senses**. Composure is the beta and the Heart save; Lore Master is the gamma.
- **Saves:** Body Guts, Brain Rumination, Heart Composure. **How hard a condition is to save against** comes from the skill that delivered it (Raw Power for a blow, Dexterity for a shot, Brain Power for a Sigil, Will Power for an Outburst, Faith for a prayer, Ingenuity for a trap, the gamma that spoke for words). A technique's save is 12 + half that strength.
- **A gamma skill rolls 1 better on checks** (its full points), and the Narrator is told to call a gamma first when a character talks to someone.
- **The nine Calls** (a new tab in a fight), one for each gamma, on one ladder by the skill's points: Order, Rally, Brief, Name It, Cue, Spot, Warn, Threaten, Taunt. Elites and bosses use a few.
- **Momentum reworked.** Only the plain attack gives it; a Strike or an Opener spends 1 (your first Opener of a fight is free); you start a fight with 1; each tile you walk and each hit you take costs 1, unless you are guarding; it carries between turns. The variety bonus is gone.
- **Guard for anyone with Durability:** a pool of your Durability points (5 at most), filled by Brace and the Guard technique; each point soaks 10 damage; Interpose from Durability 3. **Shield techniques:** Shield Bash, Raise Shield, Shield Wall.
- **Perks and traits:** Heavy Hands, Follow Through, Iron Grip (it gives the **Grapple** technique) and Both Hands replace Shove, Break, Grapple and Origami Hands; Weak Point is Read Them; eight perks that handed out AP from an alpha or a beta give defence instead; Stand Still and Still Water are back to their originals; traits follow Acuity or Improvisation by what they meant.
- **Gear gates:** servo-fist Raw Power 3, core rifle Dexterity 3, banner Empathy 3, heavy armour Pain Threshold 3 or 5; the off hand is checked.
- **Screens:** the creation points step rebuilt around the one gate (click a skill and its attribute follows; every refusal says why; undo and reset); level-up without Cores and with the ceiling; archetype cards with nine attributes; skill and attribute pages in plain words; tab rows wrap to two lines; the shield block and Guard on the Attack tab.
- **13 archetypes re-pointed** so each card still does what it says.
- **Provisional numbers:** spec section 14, items 955 to 1006.
- **Known:**
  - The Calls have no effects of their own on screen yet, and no icons.
  - New art wanted: icons for Iron Grip and Both Hands (they reuse the old ones), and Breaching Strike's and Nothing Gets Past's icons no longer match what the perks do.
  - A Legendary Deed still says "+1 Core point", which gives nothing (item 1006).
  - The four playstyles this pass leaves open (Ingenuity's stealth list, Visualization's Figments, the full shield-and-guard list, Empathy's tending and songs), Weapon Arts and tri-scale armour are queued (`docs/ROADMAP.md`).

## 0.18.1 — 10 November 2026

Fixes after 0.18.0, straight on the base branch (Leon's playtest notes and his rulings on lane B's open points).

- **Enemies no longer pace in place.** An enemy with nothing to attack used to take the best *other* tile every step, so with spare AP it shuffled to the next tile and back each turn. Where it stands is now the tile to beat; a shooter with a line on someone doesn't creep with spare AP; it never walks back onto a tile it stood on this turn; one that sees nobody heads for the nearest tile with a line on someone.
- **The area map:** the turn column (the actions) scrolls on its own and the map stays in view. Before, the whole card scrolled and the map left the screen.
- **A gun in hand has a "Strike (weapon's butt)" row** on the Attack tab and on the area map (the bare-hand strike's numbers).
- **A Press's own +1 Heat can jam the gun** (ruling).
- **With a gun in a hand, Reload (both kinds) and Clear jam are on the Attack tab,** with the shots. Other weapons keep them under Utility.
- **A bow's volley is arrows:** Burst, Suppress and Rake with a bow draw and loose each arrow with its own sound; the gun rattle, the tracer spray and the brass are for guns only.
- **A pushed unit stays where it was until the push plays.** A unit held for its moment was let go after 9 seconds whatever was still to play, so late in a long enemy phase (or after a cut-in) you stood on the tile you were pushed to before the blow landed. It now waits for its queue (60 seconds at most). Not reproduced in a test: the push hold itself measures right in the browser.
- **A blade and a gun together:** the Heat bar shows for the off-hand gun (it only showed for a main-hand gun), and the gun's block shows its Heat.
- **The crossbow** (provisional, item 955): damage 55 (was 35); a Shot costs 3 AP and loads the next bolt as part of it, so there is no separate reload while bolts are carried; an Aimed Shot costs the same 3. Its signature is a new technique, **Heavy Bolt** (4 AP: +50% damage, ignores 10 armour, a Body save or pushed 1 tile); the repeating crossbow can ready it at 1 AP less.
- **Technique text is written for players:** no "today's rule" wording anywhere in a technique's text, and a technique's card says first what it needs (a Pressed target, Momentum, Hidden, a weapon in the pack, an Opener's place in the chain).
- **Only guns sound like guns:** a technique's volley (Suppress, Rake, Mag Dump, Burst) with a flamer, a launcher, the core rifle, a bow or a scattergun plays that weapon's own shot for each round, with no gun rattle, tracer stream or brass.
- **The breacher tube's reload card** shows the rocket going in (it was an empty box with a count).
- **Two weapons** (provisional, item 956):
  - two weapons of one kind (two guns, two melee weapons) have a third block on the Attack tab, **Both hands**: the paired attack, reloading both guns, and nine techniques made with each weapon in turn (main hand −1, off hand −3 less 1 per 3 Dexterity, +1 AP);
  - the second weapon needs 2 more points of its skill than in the main hand;
  - two guns share one Heat bar, its limit the two limits added, cooling 4 a turn.
- **A melee technique that moves you shows how far it reaches:** Lunge's red covers its step (2 with a Reach weapon), Charge's covers the run your AP still buys.
- **Momentum says its rule** on its bar (it read "Momentum ()." for anyone but a Fighter).
- **The chip over a hovered target** (the odds, or why not) stays whole: a long reason wraps, and at the map's edge it slides inward.
- **Throw and Pull Out** (provisional, item 957): a thrown melee weapon that hits stays in its target until the target falls (it drops there) or someone next to it uses **Pull Out**, a technique everyone knows: 1 AP, no roll, the weapon straight back into your hand, half its damage and Bleeding. A miss still lands on the target's tile.
- **A surrendered enemy is grey** on the map and in the initiative strip, with a grey border and "(surrendered)" by its name.
- **A learned signature's chip** no longer says "A signature you learned…" in its text (the ◆ stays).
- **Rulings confirmed as built:** Snap Shot draws from the pack only; Pin Down holds until 2 AP is spent; Rout through a grenade spends it; Throw stays open to characters who know Lob; the parlour pistol is Silent; a weapon pulled out by the wielder's ally stays in that ally's hand.

## 0.18.0 — 10 November 2026

Branch `claude/charming-gauss-hbq4n0`: **Physical 2.0** (rules 1.12). Weapons fight with techniques. Built by the lead (foundation, core, integration) and three implementers: A (`claude/awesome-babbage-8gngk8`, melee), B (`claude/physical-2.0-B-ranged` and `-fx`, ranged), C (`feature/physical-2.0-C-client`, the screens). Plan and hand-offs: `docs/design/handoffs/physical-2.0-*.md`.

- **58 techniques** in two systems (`data/techniques.json`). Melee runs on **Momentum** (on you; Openers, Strikes, Links, Finishers, Answers). Ranged runs on **Pressure** (on the target, 0 to 4: Pressed at 2, Suppressed at 3, Broken at 4 for enemies; Fire, Press, Set, Take, Watch).
- **Weapon properties** (Edge, Point, Blunt, Hook, Heavy, Light, Reach, Bare, Thrown, Auto, Spread, Precise, Silent and others) decide which techniques a weapon offers and which line of a technique applies. Every weapon has a `phys` block.
- **Drill:** a kill gives drill to everyone who hit the victim, for the weapon they hit with; drill marks teach a weapon's signature or give a pick. The old weapon-mastery attack bonus is retired.
- **Dexterity is Agility's alpha and Athletics its beta** (item 953). Light blades hit with Dexterity.
- **The Attack tab** is one block per held weapon: its plain attack (Cut, Shot), its Techniques pad, and Hold a shot for the Watches. A technique's choices (Called Shot's part, Run Through's weapon left in, and the like) are toggles on its card. Weapons in the pack and carried throwables have their own groups on the pad (Draw Cut, Snap Shot, Lob, Rout).
- **Watches and Answers** replace Overwatch and the held strike: Overwatch, Deny, Cover Me, Dead to Rights; Riposte, Parry, Keep Back. Becoming Pressed drops a held shot.
- **Nailed in place:** Run Through and Pin Down hold a unit until 2 AP is spent to pull free (the unit, or an ally next to it; the Utility tab's **Pull free**). Anyone next to the target may pull out a weapon Run Through left in it.
- **Enemies use techniques** (lists by tier in `data/enemies.json`).
- **Effects** for every melee and ranged technique (lanes A and B), mostly drawn in SVG; two CC0 assets are credited.
- **Item icons:** every weapon and armour has its monoline icon on screen (backpack, gear, the pads).
- **The story screen's right column** is four modules you can drag into any order (mana forecast, map, quest board, player card); the order is kept per browser.
- **The Miracle box** (what a Miracle did) stays longer, has a Keep-open button and a clear close button.
- **Rulings by Leon in this version:** the parlour pistol gives Crossfire; Pressed drops a held Watch; Drag with a Hook weapon reaches 2 tiles (3 with Reach); a carried shield's +2 on Parry applies with any weapon.
- **Old weapon effects** (the war axe's armour break, the maul's Prone, and the like) fire on the plain attacks only, not on a technique's hit.
- **Known** (`docs/design/known-issues.md`, and the hand-off notes' request lists):
  - Walking Fire's fire point, the arrow type on a bow shot, the round for Load Special, and split targets for Burst and Rake can't be picked on screen yet: the engine picks.
  - Companions, puppets and the drone keep the old attack rows.
  - A gun in hand has no bare-hand strike row.
  - The enemy AI doesn't hold Watches, doesn't throw grenades, and frees only itself from a nail.
  - Rake with an item that makes full auto cheaper still costs 4 AP.
  - The browser test `reload.mjs` fails two tactical-reload card checks (it did before the lanes merged; the reload itself is covered by the engine's tests).
  - Six rulings from lane B wait on Leon (in `physical-2.0-B-RESULT.md`).

## 0.17.0 — 10 November 2026

Branch `claude/charming-gauss-hbq4n0`: **the skeleton** (rules 1.11; Leon: "apply everything you recommend with the skeleton"). The creation budgets stay 10 / 10 / 6. What a level gives changed, so builds other than 7/1/1 can reach the end of their own class and skills. Design: `docs/design/proposals/2026-11-skeleton.md`. Every number is provisional (spec items 924–931).

- **Every level gives two picks:** odd levels 2 Skill points; even levels 1 Skill point and 1 Attribute point. That is 38 Skill points in a career, where it was 29.
- **A Core point every 3rd level** (3, 6, 9, 12, 15, 18), where it was every 5th. A build that starts with a Core of 4 or 5 can now reach a Mastered perk, around level 16 to 18. Before, only a 7/1/1 build could.
- **Class ranks need a level too:** rank II at the class attribute 5 and level 6, rank III at 8 and level 12. A 7/1/1 build no longer takes ranks I and II at once. The class panel, the picker and the Proving Ground's help say so. A rank that arrives with a level is announced in the log with its two moves.
- **Creation:** a Core point can no longer be traded for 2 Attribute points. Mind Without Fog gives 1 Core point, where it gave 2.
- **Old characters and saves:**
  - a character made before 0.17.0 that used the trade or Mind Without Fog's second point stays legal and can still be brought into a room;
  - a character already past a level keeps the points it got then: there is no back-pay;
  - a character with the attribute for a rank but not the level drops to the rank its level allows until it gets there, in a fight saved in progress too.
- **The Proving Ground's rank tool** raises the level to the rank's (6 or 12) as well as the attribute, with that level's points.
- **Proposals, not built:** `docs/design/proposals/2026-11-melee-techniques.md` (melee techniques, weapon properties, and `hits_with` / `scales_with` on every weapon).
- **Known:**
  - the advanced class gates are unchanged and are now reachable near level 7 to 9; advanced classes themselves are still shelved;
  - the XP table is unchanged, so levels still come every 2 to 4 sessions after level 5.

## 0.16.0 — 10 November 2026

Branch `claude/awesome-babbage-8gngk8`: **combat clarity** (Leon: "I want the movement in combat to be more clear").

- **The ♪ and ◈ buttons** sit as small tabs at the bottom edge and slide up when the pointer comes near, on focus, on a tap, or while their panel is open. They share one dock: while one is out, the other slides away, so the song title and the memory never overlap, and opening the memory closes the music panel. Settings › Display can turn the slide off. Reduced motion never slides.
- **Out of the fog:**
  - a hostile walks in from the fog's edge and fades up, and a small red "!" pops on its token's corner. A soft Kenney tick plays, at most once per wave of arrivals;
  - a unit walking into the fog, or dropping out of your sight, fades out where you last saw it, on the step that lost it;
  - units stay where they were until their own walk plays, so nothing pops in at its end tile;
  - each side's sight is worked out by the engine step by step and sent only to that side, so a co-op opponent learns nothing hidden.
- **Stealth:** a reveal shimmers in with the "!" and REVEALED, and going Hidden fades out with HIDDEN. A hostile placed Hidden in the Proving Ground now starts the fight Hidden.
- **Overwatch** is its own beat: the watcher's ring flashes, OVERWATCH shows over it and a dashed aim line runs to the tile. The mover stops on that tile, the shot plays, then it walks on, or falls there. It follows the combat speed setting.
- **Known:**
  - the area map has no fog, so a hidden NPC revealed there still just appears;
  - a unit that leaves and re-enters sight within one batch may show its final token early.

## 0.15.0 — 9 November 2026

Branch `feature/combat-polish` (implementer 1), merged through `claude/awesome-babbage-8gngk8`: **UI pass, combat polish**.

- **Combat speed** (⚙ Settings › Combat). **Normal** is the new default: every battle animation, pop-up and cut-in is about 15% slower than before. **Fast** is the old timing. It changes live, mid-fight. The crit cut-in stays up long enough to read at both speeds.
- **Target card:** every enemy shows its face. Drill drones and others were black. An enemy you can't see shows only "?" in the initiative bar.
- **Backpack:** the button sits next to your name on the You card. The one by the AP bar is gone.
- **Cut-ins show who acted:** the acting character's own picture, the same one the HUD shows. The Proving Ground recruit's Wick head included, not a random archetype.
- **A reload you can see:** a reload card pops over the unit, readable on a tile with a pile. Speed and tactical reloads read apart: speed shows PILE +1 when the magazine drops; tactical shows PACK, +1 AP. Units with unlimited spares (companions, twins) show no phantom drop.
- **Proving Ground:** Leon's drill-yard painting across the Practice card, and the title theme plays from page load.
- **Test fix:** the `title` e2e suite's "hover during hello" check (failing since 0.9.0) is fixed.
- **Known:**
  - a flamer's refuel still shows a canister dropping under a player's portrait, though nothing goes into the pile;
  - the recruit's portrait is the Wick placeholder; a real recruit avatar would need art.

## 0.14.0 — 9 November 2026

Branch `feature/pg-levelup-ui` (implementer 2), merged through `claude/awesome-babbage-8gngk8`: **UI pass, the Proving Ground, level up and the Perks tab**.

- **Proving Ground:** while gearing up, the whole centre column is the spawn and cheat screen. It has search, grouped collapsible sections and room to breathe. The "Practice fights · no Narrator" card stays on top. The hint and wave lines move to the bottom panel. During a fight, the floating tools drawer stays, and now opens under the header so Save, ⚙ and Leave remain clickable.
- **Level up** is laid out as the character tree (Cores → Attributes → Skills). Each skill's card shows its points, its Mastery marks and its perk steps (owned, available, locked, Mastered), with what owned perks do.
- **Perks tab:** perks you use from another action's button or chip (Overdraw, The Twin Pays, Pure Heart, Verse of War in a fight, Running Reload…) are listed read-only, with no Confirm that spent a use for nothing. Confirm stays only where the tab is the way to use the perk.
- **Fixed:**
  - in a Proving Ground team fight, a Team B fighter changed mid-fight (Give, equip, kit, level) no longer switches to Team A;
  - Settings opens above the fight drawer.
- **Waiting on Leon:**
  - two Leave buttons while gearing up (the card's and the header's; both ask the same question);
  - the music and memory buttons hide on level up so they don't cover the tree.

## 0.13.0 — 9 November 2026

Branch `claude/awesome-babbage-8gngk8`: **UI pass, the shell** (Leon's playtest feedback; design `docs/design/ui-pass-shell.md`).

- **One header for every screen:**
  - Area map (key M) replaces the unused STORY | COMBAT toggle. During a fight, "Back to the fight ›" shows instead.
  - A Narrator chip with a menu holds status, voice, cost and Retry.
  - The room code takes you to the room.
  - **Save** is one click.
  - **⚙ Settings**, then Report.
  - **Leave** asks first, and for the host it saves before leaving.
  - On narrow windows the header wraps instead of pushing buttons off screen.
- **The room's way back:** the greyed "In session" button is now **Return to the session ›**. Changing the API key shows "Saved", and a **Test key** button tells you whether it works.
- **Echo has a home:** a labelled row on the character next to HP, with an explainer: what it does (reroll a d20), how you earn it, and where you spend it (story checks; not yet in a fight).
- **Right column:** the mana forecast now shows outside fights too, then the minimap. Near you is capped with its own scrollbar. The **Quest board** is always open, grouped by area or by quest, and scrolls on its own. Pass / End turn are pinned at the bottom.
- **⚙ Settings** has four tabs:
  - **Audio:** separate combat and interface volumes. Combat sounds are loudness-normalised (guns about 5 dB louder) and a real limiter is added, so a gunshot now sits above a button click.
  - **Voice:** moved out of the music panel, which is now music only.
  - **Combat:** speed and cut-ins.
  - **Display:** opacity and fading for the Music and Memory buttons, which are now small icons that no longer cover the combat log or End turn.
- **In-game dialogs** replace every browser confirm, prompt and alert, which some antivirus software blocks. A test fails the build if one comes back.
- **A guest who leaves mid-fight** no longer freezes it: the host gets "Pass <name>'s turn ›".
- **Waiting on Leon:**
  - should an away player's turns pass on their own after a delay;
  - should the combat volume slider stop at 100% (above it guns barely get louder);
  - Echo in a fight is not built yet (engine work).

## 0.12.0 — 9 November 2026

Branch `feature/title-glyph-ward`: **a real Sigil on the title screen** (Leon: delete the made-up glyph, place one of our real Sigils, it's so dull you can't see anything; keep the original).

- **The glyph:** the mage now draws **WARD**, using the game's own glyph path (`GLYPH_PATHS.ward`), its class frame and the Sigil inks. It's drawn bright: a white core line in a cyan glow, with the frame dimmer as in play. A thin thread of light runs from his fingertips to the shield's point. It replaces the generated render's dim made-up teal ring.
- **The original is kept** in `art/_archive/ui/title-screen/history/2026-11-09-r6-original-glyph/`, with how to restore it.
- **Checked by two independent reviewers:** no trace of the old ring, the hand untouched, no fringe. Their three polish notes are fixed: the old stem's foot on the fingertips, the frame drawn too strong, nothing tying the glyph to the hand. `validate_art.py` passes, with menu contrast unchanged.

## 0.11.2 — 9 November 2026

Hotfix on `develop`, from Leon's test of 0.10.2 on his RDNA 4 desktop:
- **The tick shows what's running.** When the GPU makes noise and the CPU takes over, **Render by CPU** is ticked and the GPU button reads "✕ Render by GPU · failed here" (press it to try the GPU again). It used to stay ticked on the GPU.
- **Voice speed** in Settings › VOICE: 0.75–1.5× in steps of 0.05, saved, for Kokoro and the browser voice.
- **The warm-up check says why it failed**: the sample rate, the length ("2.4× the expected length") or the shape (the score), and logs `[voice] warm-up check: …`. Leon's GPU scored 0.00, which means the length check rejected it before any shape was measured.

## 0.11.1 — 9 November 2026

Straight to `develop` (a deploy fix): **replaced title art shows at once**. Deploying 0.11.0, the live title still showed the old front layer. Its URL never changed, and the Worker's edge cache keeps an asset for a day.

- **New addresses for new art:** the title layers' URLs now carry a content hash (`?v=<hash>`, written by `tools/build_web_assets.py`), and the Worker keys its cache on it. A replaced picture gets a new address; an unchanged one keeps its cache, now as immutable.
- **Only the title layers:** other assets are unchanged, since portrait URLs are parsed and saved elsewhere.

## 0.11.0 — 9 November 2026

Branch `feature/title-front-r6`: **the title screen's front layer, Revision 6** (Leon: "first good one we got").

- **The picture:** the five heroes stand small on the lip of a rock outcrop at the right, every face turned up at the god, which fills the sky above them.
- **The gaze rule holds:** the render is placed at the screen's size, shifted 5% right into the overscan. There, every hero's sightline ends within 7–12° of the god's face. The check is saved as `art/_archive/ui/title-screen/previews/gaze-check.jpg`.
- Rock mirrored into the overscan; near-opaque alpha made opaque; Revision 5 archived. `validate_art.py` passes, with menu contrast unchanged at 5.6:1.

## 0.10.2 — 9 November 2026

Hotfix on `develop`: **Render by GPU | Render by CPU** (Leon: let the player choose; an NVIDIA laptop runs the GPU voice well, his RDNA 4 desktop buzzes).
- Settings › VOICE has two buttons, **Render by GPU** (the default) and **Render by CPU**. The choice is kept in the browser.
- **Before the install** the choice sets what's downloaded (about 326 MB for the GPU, 92 MB for the CPU). **After it**, the voice reloads on the chosen device.
- **Render by GPU** forgets a GPU remembered as noisy and tries it again. The speech check still guards it: if the GPU makes noise, the CPU reads, and the panel says why ("Your GPU was picked, but …").
- They replace 0.10.1's "Sounds wrong? Use the CPU" and "Try the GPU again" buttons. `voice.mjs` covers both choices before and after the install.

## 0.10.1 — 9 November 2026

Hotfix on `develop`: **the Narrator's voice made muffled buzzing on Leon's GPU** (Kokoro on WebGPU, AMD RDNA 4 with shader-f16).
- **The warm-up now checks Kokoro sounds like speech**, not just that it isn't silent: "Ready." in af_heart is compared with a fingerprint of the fp32 model on the CPU (`apps/web/src/game/voiceCheck.ts`; the reference is made by `tools/voice_reference.mjs`). Real speech scores 0.94–0.99 and speech-shaped noise or buzz 0.38–0.84. Under 0.88 the GPU plan fails and the CPU reads.
- **A GPU that made noise is remembered** per adapter and skipped next time.
- **fp16 on WebGPU is no longer tried**, and fp16 weights left in the cache are no longer preferred. It's the usual cause of this noise.
- **Settings › VOICE** shows the weights (fp32) and the check's score, with **Sounds wrong? Use the CPU** and **Try the GPU again**.
- Tests: `voiceCheck.test.ts` (the real q8 model passes; muffled noise, buzz, white noise, silence, a wrong rate and a wrong length fail), and `voice.mjs` covers the noise fallback and both buttons.

## 0.10.0 — 9 November 2026

Branch `claude/awesome-babbage-8gngk8`: **spotlight cut-ins** (decision 113; `docs/design/cutin-spec.md`).

- **The look:** when a big moment lands, the screen blurs a little and dims. Torn strips slide across showing the characters' eyes from their painted portraits. The tear is inked in the character's highest-attribute colour; a god's strip uses the patron's accent. Captions are in Spectral, with a small label in Chakra Petch. Several characters in one moment stack their strips.
- **What fires it:**
  - a natural 20 on a Hard or Heroic check;
  - taking down an elite or boss;
  - a revive;
  - an Ultimate;
  - a legendary deed;
  - Play my song;
  - **a patron's intervention:** the god's strip over the fighter's, with the patron's line and what it did;
  - **your side's critical hits** in a fight: a short, slimmer strip, about 0.9 s.

  One action shows one cut-in, the biggest moment in it.
- **In a fight** the cut-in plays before the action, then that action plays back 15% slower. The casings, magazines and the bow's draw slow with it.
- **The Miracle** keeps Faith 2.2's full scene. Strips and the Miracle share one queue and never overlap.
- **Settings:** Cut-ins All / Once per scene / Off. Reduced motion means no slide and no slow-mo. Any click or key skips.
- **Framing:** every portrait has an eye line (`eye_line` in `art/catalog.json`). Uploaded portraits get a Cut-in framing slider in character creation.
- **Co-op:** every player in the room sees the cut-in.
- **Known:** the `title` e2e suite fails at "the press" step on develop too, since 0.9.0's title front layer. It is not caused by this branch.
- **Waiting on Leon:** cutin-spec.md section 10:
  - trait songs;
  - the Ultimate caption;
  - a revive's two strips;
  - a god's slow-mo;
  - enemy cut-ins;
  - reduced motion;
  - the slimmer crit strip.
## 0.9.1 — 9 November 2026

Straight to `develop` (an art brief fix): **the title heroes look at the god, as a fixed rule**. Leon: Revision 5's squad "still looks at nothing". Close up, their faces turn left, only 10–20° above level, while the god's face is almost straight above them. The title-screen brief (`art/briefs/title-screen.md`) now fixes the target: the god's face at screen x 69%, y 5%, 65–90° above level from the outcrop. It adds a guide image (`art/briefs/title-screen/gaze-guide.jpg`: the scene, the squad's place, the face and each hero's sightline) and a sightline check before any front layer ships. The front layer itself waits for the corrected painting.

## 0.9.0 — 9 November 2026

Branch `feature/title-front-v5`: **the title screen's front layer, Revision 5**. Leon: the heroes looked like they were facing a wall, not the god, and the picture didn't show how much bigger the god is than a person.

- **A wide shot from Leon's layout sketch:** the five heroes stand small on the lip of a rock outcrop at the right, all looking and pointing up and to the left at the Celestial, ready. The god now towers over them. The left of the screen stays clear for the title and menu.
- **Fitting it in:** a full 16:9 frame placed 1:1 on what the screen shows. The rock is mirrored into the overscan, so the parallax never shows a cut edge. The render's near-opaque rock (alpha 252) is made fully opaque. Back and middle layers are unchanged; Revision 4 is archived.
- **Tooling:** `tools/art/rebuild_title_screen.py` now follows the repository layout, and its placement can mirror the overscan and floor the alpha. The 4K PSD is written only on request. Previews, manifest, checksums and the technical review are regenerated; `validate_art.py` passes, with menu sample-text contrast unchanged at 5.6:1.

## 0.8.0 — 9 November 2026

Branch `feature/shell-casings`: **brass, what weapons throw off, drawn in SVG** (decision 112; Leon: casings behind the portrait on every shot with faint smoke, an Evoker ejecting its mana core like a casing, a shell for every weapon type, the Evokers and the enchanted guns, the archer's draw, a magazine dropping to the ground on a reload; "behind" is the opposite of the shot's direction).

- **Casings:** every shot throws its casing out from behind the shooter's portrait, away from the target, in an arc with a ground shadow, then a hop; it lies there a moment and fades. A faint wisp of smoke comes off it. Each gun has its own: pistol and rifle brass, the .700's big case, belt links on the machine guns, red shotgun hulls, a 40 mm case.
- **The enchanted guns:** the spellslinger pistol's casing is sigil-etched and glows; the censer gun's hull is blessed ivory and gold, with a violet incense wisp; the core rifle throws a spent core charge whose light goes out.
- **Evoker cores:** taking a fresh core, an Evoker throws out the spent one, opposite its last Evoke (or a random way before the first). Each Evoker has its own: the Evoker's hexagonal core, the Evoker blade's shard, the grand staff's orb in a brass cage. Its light fades and a cold mist leaks out.
- **Bows:** the shot waits for the draw: an arrow is pulled from the quiver behind the archer, swung over to point at the target and loosed. A crossbow's bolt is already on; its reload sets one from behind.
- **Reloads:**
  - A magazine drops straight down and is gone the moment it lands; each gun has its own (pistol, stick, curved, box, drum, belt box, shotgun box, sigil-etched, bolt box, fuel can). A tactical reload drops it into view and takes it back up into the pack.
  - Revolvers keep their brass and drop it all straight out of the cylinder, then fresh rounds go in.
  - A double barrel (and the parlour pistol) breaks open, kicks both hulls out behind and takes two fresh ones.
  - A pump gun throws its hull a beat after the shot (the pump), and lever and bolt rifles a beat after theirs; at the reload, shells and rounds are fed in one by one.
- **Engine (pictures only):** the core event names the Evoker. An off-hand gun's reload now has its own event (with both guns, the main event carries the off hand's part). A Trick Shot ricochet's shot is marked, so it throws no second casing.
- Tests: `fx/brass.test.ts`, engine tests in `focus.test.ts` and `world-play-11-review.test.ts`, the new e2e `apps/web/e2e/brass.mjs`.

## 0.7.0 — 9 November 2026

Branch `feature/faith-presence`: **Faith 2.2, rules revision 1.6.3: the god shows up** (decision 111; `docs/design/faith-presence-spec.md`; spec items 738–747, all provisional; hand-off `docs/design/handoffs/faith-presence-HANDOFF.md`). The patrons' portraits only appeared at character creation, and interventions almost never fired.

- **Witnessed** (Leon): a successful Hymn (or a Miracle) makes you Witnessed until the fight ends or your patron intervenes.
- **Interventions:**
  - each one ends Witnessed;
  - once a fight, twice from Devotion 7;
  - Nerukhan's Soul, Mother Ember's heal and Old Overcast's Storm are 20 + 4 × Devotion (× Blessing power);
  - wider triggers: the Laughing Mask fires on any enemy miss against you. The Quartermaster (Leon) fires on any reload of yours (it's free), on your Evoker's core running dry (a fresh core, your spares untouched) and on your MP running out (25% of your max back);
  - the patron's own act never counts as the devoted's deed (no XP, taboo or vow effects).
- **The `grant` line bank** (the 11th): the god calls the devoted by name when granting a Miracle ("ROOK. THE SAINTS HAVE HEARD YOU. I GRANT THEE THIS REQUEST.").
- **The Miracle cut-in:**
  1. the screen dims under light in the god's colour;
  2. the portrait cuts in over everything, larger than the map;
  3. the god calls your name;
  4. the view zooms to the map, the Miracle plays, and a box says what it did.

  Skippable, reduced motion respected, seen by everyone in the room. Built on a reusable `showCutIn` (`apps/web/src/game/cutIn.ts`). The sound sting is "30_revive_03" by leohpaz (CC BY 4.0, credited).
- **The patron on screen:**
  - a Whisper's icon rises over the head; a Hymn shows a square crop of the god's portrait;
  - the faith tab header shows the portrait (click for the large view);
  - pact, switch, farewell and grudge cards carry a small portrait (greyed for a grudge), and voice-line cards a round crop.
- **The intervention cut-in is left as a trigger:** `playIntervention()` in `cutIn.ts` (spec section 3) for the implementer building the cut-in UI.
- **Waiting on Leon:** item 747. Should Witnessed's +2 to liked-tag attacks, and the Guardian's Under the Eye, keep their old one-turn length now that Witnessed lasts the fight?

## 0.6.0 — 9 November 2026

Branch `feature/mana-forecast`: **the mana meter becomes a forecast panel** (decision 110; Leon: the meter leaves the combat header and becomes a movable module beside the map, read like a weather forecast).

- **Its own panel:** the header chip is gone. "Mana forecast" sits just above the map by default and moves like the legend and the log (drag its grip, or focus the grip and use the arrow keys; Reset brings it back). Narrow windows put it right under the map; short windows (620 px high or less) keep it in the map column with the grips hidden.
- **Read like the weather:** a sky icon and a headline ("RICH AIR · 24 / 40"), a gauge of the four bands with a marker, one line on what the air is doing, and the trend (the meter at each round's start, so "+5 this round · −3 last round"; kept per fight in the browser).
- **The outlook:** how far to the next band up and down, in deaths and Crystallises ("Flooded at 30: 6 to go (2 deaths)").
- **More ▸:** what this band does (Outburst cost, Syphon, magical healing, rider stage shift, Strain) and what moves the meter, all read from `data/rules.json`. Over the map it opens as a dropdown, so the map keeps its size.
- **Engine fix:** a beast's death now raises the meter by +3 (rules.json `beast_death`); it gave +5 like a person. Robots, turrets and drones still give +2.
- Tests: `manaForecast.test.ts`, `mana-meter.test.ts`, the new e2e `apps/web/e2e/mana-forecast.mjs`; `layout.mjs` and `magic.mjs` updated.

## 0.5.0 — 9 November 2026

Branch `claude/awesome-babbage-8gngk8`: **Sigil 1.5, rules revision 1.10** (`docs/design/sigil-1.5-spec.md`; spec section 14 items 901–923, all provisional). Sigil 1.5 was first numbered 1.9 / 671–693; it moved to 1.10 / 901–923 because World Play 1.1 took those numbers. **Lines of 5 are dropped** (Leon); Junctions stay.

- **Strokes (the playtest fix):** a Line is what you drew as one. Glyphs that touch no longer join, poison or block. Two Lines can run side by side, cross or end next to each other.
  - A new glyph extends a stroke only at its end, along its axis, up to 4 glyphs.
  - A picker on the draw step names each option ("extends FIRE·SEEK", "new Line"). The default is the stroke you last drew into.
  - An ally's Line is extended only when you pick it.
  - Scuffing a middle glyph splits the stroke. Old glyphs keep the 1.4 reading until they fade.
  - Enemies draw strokes too.
  - On screen, faint lines join a stroke's glyphs, and hovering lights the whole stroke.
- **Study:** every Evoke earns study: 1, +1 per glyph past 2, +1 if it hit an enemy. At 6, then every +8, you learn a word of your choice within your cap. A study bar and a "Learn a word" chooser are on the MAGIC tab.
- **Copying:** Analyze or Read an enemy's glyph or a scuffed glyph's trace for study toward that word. **Sigil marks** on the map (doors, ruins, posts; 3 in M813, the Narrator can place more) have an Investigate approach (Analysis or Rumination); a critical teaches the word outright.
- **Mastery:** each Mastery level in Brain Power, Rumination or Eloquence gives +5 study. Mastered gives a free word over the cap.
- **Word mastery:** each word counts its uses. At 10 it is Practised (hollow star). At 30 it is Mastered (filled star) and unlocks its **inflection**, a small upgrade always on for you. All 40 are drafted, provisional, for Leon.
- **Junctions** (Brain Power Mastered): one glyph shared by two Lines. It fades when the second Line is Evoked.
- **One shared workshop** for both magics: collapsible groups that remember their state, on the MAGIC tab and in the Proving Ground. Sigil is grouped by its five word groups; Outburst 4.0's codex moved onto the same component.
- **Proving Ground:** grant study, set a word's uses, place a sigil mark, toggle Junctions.
- **Sound:** stroke join, inflection unlock and Investigate success are reused Kenney CC0 interface sounds, credited. Proper magic sounds can replace them.
- **Fixed while merging with Outburst 4.0:** a fused Evoke (Twin Discipline) now gives practice once, and earns study and word uses. STEP meets residue.
- **Waiting on Leon:**
  - the 40 inflections;
  - copying gives +2 study per glyph read (or should it be once per word?);
  - the Narrator gives a word once a scene, where the Sigil 1.5 spec said once a long rest (item 914);
  - study thresholds and the 10 / 30 word-mastery counts;
  - the Junction gate.

## 0.4.0 — 9 November 2026

Branch `feature/faith-2.1`: **Faith 2.1, rules revisions 1.6.1 and 1.6.2** (decision 107; `docs/design/faith-2.1-spec.md`; spec section 14 items 701–737, all provisional; hand-off `docs/design/handoffs/faith-2.1-HANDOFF.md`). Playtest: a character reached Devotion 10 on the area map by turn 3. The +2-a-fight cap lived on the fight unit, and the area map rebuilds units on every action, so every action was a fresh +1.

- **Devotion XP:** Devotion is still the 0–10 standing with the same Hymn gates, but each level now needs XP.
  - The curve: 45 / 102 / 200 / 450 XP to reach 3 / 5 / 7 / 10. Faithful characters still start at 3.
  - Sources: a liked tag +1, a vow kept +3, a rite +4, a Narrator deed +2 to +5 (its gains capped at +10 a session); a taboo −3 (−6 while Witnessed), a broken vow −5, a failed overreach −3. Judgement spends 10 XP.
  - A seeded 30-session simulation checks the pace: Devotion 5 around sessions 3–4, 7 around 8–10, 10 after 20.
- **Tag caps on the character:** each liked tag counts once a fight and once a scene; at most 2 XP a fight, 2 a scene and 6 a session from tags. The area map can't farm them any more.
- **Leaving a patron** (Leon's rulings):
  - **Apostasy:** Devotion 0 and no pact for **90 days**.
  - **A new day counter:** a long rest is a day, and the Narrator's `days` field covers travel and time skips. Shown as "Day N" on the HERE card and the faith tab.
  - **Switching** straight to another patron: no cooldown. Open patrons roll to let you go; Jealous ones never do. A **grudge** gives a condition at the start of each fight and halves your new patron's Devotion XP for 1–3 sessions.
  - A new `farewell` line bank (3 lines a patron).
  - A host **Next session** action (Rest… → Next session).
- **Miracle 2.1** (Leon: "deserve the title"): a Miracle needs **Faith 7 and Devotion 10** and lowers Devotion by **5 levels**. The first comes around session 22, then about every 19 sessions. All eight are stronger:
  - Saints' Verdict: 100 Soul and Stunned to every enemy in sight; double for those who harmed the helpless.
  - Requisition Approved: a full restock, 2 cores each, every weapon repaired, +3 AP.
  - Encore: free repeats, and enemies Confused.
  - Turned Back: every fallen ally stands at half HP.
  - Everyone Home: full heal, cleansed, a 40 shield each.
  - The Sky Answers: 5×5, 150 Storm, enemies only.
  - Love Conquers: non-bosses surrender with no save.
  - Rewoven: HP rewound to the round's start, then another turn.
- **The faith gold** `--faith-light` `#F2C46A`: light only, always beside a word (`apps/web/index.html`, colour system, palette).
- **Art direction written down:** patrons are painted as a god appears to an NPC (apparitions, effigies, masks); the delivered set is right. It is now in the style guide, the art brief and the Blessing spec.
- **On screen:** "DEVOTION 4 · 12/32 XP" meters, XP and level floats, the cooldown, the grudge and the tag caps on the faith tab, and the Miracle at 10 with its price. Encore marks a free repeat "FREE · ENCORE".
- **Old saves:** Devotion levels become their threshold XP; day 1.
- **e2e:** `heart.mjs`'s Mana Short step brings in a fresh boss if the snaps kill it first. Known flake, older than this branch: `faith-pg.mjs`'s "Old Overcast intervenes" step depends on the dice and sometimes needs a rerun.
- **Waiting on Leon:**
  - the tuned curve and every XP number;
  - the grudges' conditions and lengths;
  - whether a session start should count as a day;
  - the Miracle numbers. They are × Blessing power: the old ×3 was never applied, and at ×3 they would be far beyond the balance targets.

## 0.3.0 — 9 November 2026

Branch `feature/world-play-1.1`: **World Play 1.1, rules revision 1.9** (decision 106; `docs/design/world-play-1.1-spec.md`; spec section 14 items 671–700, all provisional; hand-off `docs/design/handoffs/world-play-1.1-HANDOFF.md`). Playtest: rangers ran out of ammo all the time. Dropped magazines were a 10 px mark nobody saw, the fight's floor vanished when the fight ended, an area-map reload deleted the magazine, and enemies dropped nothing.

- **Piles:** what lies on a tile is one pile (a `pile` map object sharing the cache code), drawn as a stack with a count on the combat grid, the area map and the minimap.
  - Hover lists it: "Rifle magazine 7/24", "38 × .32 Decrkm".
  - Pick up (1 AP, your tile or next to it, on any map) opens a checklist. Searching a body is "take everything".
  - Piles keep exact items (rounds, ammo type, rarity, durability, mods), merge per tile (at most 24 entries), and persist between the area map, fights, zones and saves.
  - Players see piles only on tiles the party can see. The Narrator can hide one until it is spotted.
- **The Narrator places piles** with `ground[]`. `loot[]` and `ground[]` can now hand over ammo (`mag:<weapon>`, `rounds:<calibre>`). The Proving Ground has "A PILE (ON THE GROUND)".
- **Reloading is a choice:**
  - speed reload: the current cost; the old magazine drops into the pile;
  - tactical reload: +1 AP; the old magazine goes back in your pack.
- **Gear in a fight, 1 AP a hand:**
  - draw 1, a two-handed weapon 2, swap hands 1, put away 1 a hand;
  - drop is free and lands in the pile;
  - light armour (1.2 kg or less) 1 AP a piece; heavier armour can't change in a fight;
  - Hot-Swap still makes a swap free.
  - A **backpack button** in the fight (key B) opens the inventory with each row's cost. "Hold the Evoker/Emanator" is gone, and a focus still counts only in a hand.
- **Drop tables** (`data/loot_tables.json`):
  - the engine rolls every drop on the fight's dice, once per death, into the pile where the enemy died;
  - enemies always drop the weapon they used (worn) and their leftover magazines;
  - rolled items by kind: parts and cores from machines, personal effects from people, cores and plates from casters;
  - at most 2/3/4/5 rolled items a fight by difficulty; a boss always drops one notable thing;
  - three layers: engine defaults < a campaign's `loot_tables`/`drops` < the Narrator's `drops` for one fight.
- **Paths:** a player's click-path goes around revealed hazards when an affordable detour of at most 2 tiles exists. The preview marks any hazard it still crosses. Enemy paths are unchanged.
- **Fixed:**
  - picked-up off-hand magazines lost at the end of a fight;
  - magazines counted twice after a mid-fight swap;
  - the pack index shifting under an equip;
  - objects lost when a fight ran on another zone's map;
  - an off-hand gun reloading for free;
  - stims and Essences picked up as dead weight.
- **Merged with 0.2.1:**
  - World Play 1.1 is rules **1.9**, since Outburst 4.0 took 1.8;
  - dropped Heart plates never roll a shelved module;
  - the Narrator's stable prompt guard is 25,000 tokens.
- **e2e:** a new `ground.mjs`. `lib.mjs` no longer sends a loopback BASE through `HTTPS_PROXY`.
- **Waiting on Leon:**
  - the light-armour line (1.2 kg);
  - the drop-table weights and the 20 personal effects;
  - whether area-map kills (outside a fight) should drop loot;
  - whether a click-path may walk straight through a revealed hazard on purpose.

## 0.2.1 — 9 November 2026

Branch `hotfix/outburst-4.0-review`: **fixes from the Outburst 4.0 review**, before it went live. Each fix has a regression test.

- **Crash fixed:** Release after pouring Love, Joy or Calm, before picking a tile, no longer breaks the combat screen.
- **Revert Pump** takes back only the last pump. A Feed's stage, AP and glyph now stay.
- **Fuse:** the release hook fires once. Heart Surge and Fusion now reach the delayed blast. A Fuse still waiting when the fight ends fizzles out ("A fuse fizzles out.") instead of going off later on the area map.
- **The 10 advanced-class modules** can no longer be learned or designed while their classes are shelved: not from the Narrator, a plate, a Proving Ground design or a starting Outburst. The Proving Ground shows them locked.
- **Practice** from a release on the area map is counted once (it was counted twice).
- **HEART panel:** while pumping, the stage bar and counter stay in view. "now HEALS"-style lines wrap on their own line, in combat and on the area map.
- **Test fix:** the `feel` e2e suite equips an Evoker in hand, as the focus-in-hand rule (decision 103) requires.
- **Waiting on Leon:**
  - The HEART panel needs one short scroll to reach its second button row (Let go, Overwatch) at 1440×1000. The `heart` e2e check was relaxed to match. Make the panel more compact if both rows must show at once.
  - A Fuse's release effects (Heart Surge's Strain, faith tags) now happen on the cast turn; its damage comes when it goes off.

## 0.2.0 — 9 November 2026

Branch `feature/outburst-4.0`: **Outburst 4.0, Soul magic rules 1.8** (decision 109; `docs/design/outburst-4.0-spec.md`; spec "Soul magic" section 12, items 801–818; hand-off `docs/design/handoffs/outburst-4.0-HANDOFF.md`).

- **Feelings:** 25 (`data/feelings.json`), poured in while you pump:
  - each has its own step on the multiplier and a behaviour (Love heals the allies in the shape, Joy chains, Calm can't miss, Mercy spares…);
  - each unlocks the first time it happens to you (the engine watches; the Narrator can grant one);
  - you start with 2 picked at creation;
  - residue from the strongest one stays on the tiles for 2 rounds;
  - **Revert Pump** takes back a misclick.
- **Modules:** 13 new for everyone (Split, Ricochet, Fuse, Return, Volley, Bloom, Anchor, Lure, Shell, Linger, Quiet, Silent, Thread) and 10 shown locked with their advanced classes. They're gated by Soul skills (never Visualization) and learned by **practice** (picks at 5, 15, then every +15; +5 a Mastery level; a free pick at Mastered).
- **Low level:** 3 starting designs (Heart Bolt, Mend, Heart Wave), the snap cast ×0.8, and the fight's first Pump free. The first tone comes at Lore Master 1.
- **On screen:**
  - the HEART panel's feeling buttons (collapsed past six, with a search), coloured stage segments and the counter's shake and "now HEALS";
  - residue on the grid;
  - the unlock card;
  - the MAGIC tab's collapsible codex (practice, templates, feelings, modules by gate skill);
  - the Proving Ground's grouped tools with a sound and effects test row for each feeling.
- **Art and sound:** SVG icons for the feelings, modules and marks (painted art replaces them by file name); 19 CC0 sounds, credited.
- **Waiting on Leon:** the 25 feeling colours, the readings in items 801–818, the placeholder icons, and the sounds (unheard).

## 0.1.0 — 9 November 2026

Branch `chore/lore-ladder-canon`.

- **The ladder is canon** (decision 108): every layer was made by the one above it and abandoned by it; the title's double meaning. World Bible (marked repo-ahead of the living Doc), `CLAUDE.md`.
- `docs/lore/Wick.md` points at the live master icon, `art/icons/traits/mind-without-fog.png`.
- The spec's revision 1.1 banner notes that Class Roster Revision 3 replaced the 13/18 rank totals (items 551–552).

## 0.0.1 — 9 November 2026

The first numbered version: `develop` as of the repository tidy (branch `chore/tidy-0.0.1`). Live at https://project-heaven-cry.leonpentastorm.workers.dev. What the game contains today, with where to read more:

**Rules and engine** (`docs/rules/PHC-Core-Rules-v1.0.md`, `packages/engine/`)
- The full character tree (3 Cores, 9 Attributes, 27 Skills), d20 checks with transparent dice, inner voices and Overreach, Echo, creation with archetypes and traits, levelling, every perk, trait and class move running in story and combat (decision 94).
- Tactical grid combat: 6 AP turns, reactions, initiative, movement by Agility, the combat fixes and the greyed action panel (the whole panel is inert until it is really your turn; Say stays live).
- **Sigil magic 1.4** (decision 98): glyphs drawn on your own tile, walked into a Line of 2–4 and Evoked; Flux and venting.
- **Outburst 2.0, Soul magic 1.5** (decision 99): Begin, Pump, Release; Strain; crystallising cores.
- **Class Roster Revision 3** (decision 100): nine base classes, one per attribute, earned at level 3; ranks II and III; the 21 advanced classes shelved until they return in batches. The Grand Sigilist's Grand forms and the Sigil damage balance (decision 101).
- **Blessing 2.0, rules 1.6** (decision 102): Faithful or Atheist, eight patrons, Devotion, Whisper/Hymn/Miracle, vows, rites, Witnessed, interventions.
- **Focus in hand** (decision 103): a magic focus counts only when held.
- **World Play 1.0, rules 1.7** (decision 105): the map tells the story: faces and kind badges, carrying, caches, hazards, triggers, Talk, the HERE card, attempts with odds.

**Play modes**
- Story mode with the speaking order, co-op rooms of up to four, solo, and a human Narrator mode; characters locked in before a session.
- The **mission board, OOC channel and end states** (decision 95).
- The **Proving Ground** as real multiplayer practice: friends join, gear up, fight waves co-op or each other (decision 96).
- The M813 one-shot campaign (`data/campaigns/m813.json`) with its maps, sprites, portraits and story moments; map zoom.

**The AI Narrator** (`apps/web/src/narrator/`)
- Bring your own key, **any provider**: Anthropic plus one OpenAI-compatible adapter for OpenRouter, OpenAI, DeepSeek, Gemini, local and third-party sites (decision 104).
- **Narrator craft**: CRAFT, PACING and THE MAP IS THE TRUTH rules, engine-side checks for unplaced names, repeats and running gags (`docs/design/handoffs/narrator-craft-HANDOFF.md`).
- **Narrator voice**: Kokoro TTS in the browser, its model served through this site's Worker (`/hf/`, edge-cached), with Edge's Christopher leading the browser-voice fallback (`docs/design/handoffs/narrator-voice-HANDOFF.md`).

**Screens and polish**
- The painted title screen with Wick's menu clips; it opens once the small images are in.
- Character creation polish (bigger cards, equal heights), screen transitions, the turn card, the adjustable combat layout, map zoom.
- Report a problem: a bundle with the game state, the Narrator calls and the log (the key is stripped).

**Art** (`art/README.md`)
- 27 abstract skill figures, 145 character portraits (EPCCG cast, NPC pool, 46 archetype player cards, the M813 cast), 180 Wick trait and perk icons, the M813 campaign set (banners, story moments, maps, sprites), the title screen and Wick's menu clips.
- Blessing 2.0 art: eight patron portraits (gods as apparitions), eight patron marks and 38 prayer icons.

**Repository (this release)**
- `art/` reorganised by use, with everything superseded in `art/_archive/`; `scripts/` merged into `tools/`; finished hand-offs archived; versioning started (this file); `docs/HANDOFF.md` and `docs/ROADMAP.md` for anyone picking the project up.
