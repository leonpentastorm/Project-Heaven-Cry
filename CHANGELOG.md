# Changelog

Project Heaven Cry is numbered **0.MINOR.PATCH** until the 1.0 release.

- **Every branch merged into `develop` bumps the middle number** (0.0.1 → 0.1.0 → 0.2.0 …). The person who merges bumps `"version"` in the root and every workspace `package.json` and adds an entry here.
- **The first number becomes 1 at the 1.0 release** (the web game is shipped; Leon calls it).
- A hotfix committed straight to `develop` without a branch bumps the **last** number (0.3.0 → 0.3.1).

The game shows its version in the corner of the title screen and in every "Report a problem" bundle (`gameVersion`), read from the root `package.json` at build time (`apps/web/src/version.ts`).

## 0.32.0 — the nine attributes reworked (rules 1.70 to 1.81)

- **The nine attributes reworked:** every alpha skill has its own ladder of perk steps; every beta and gamma skill has four perks; every fork option is open; a Call costs 3 AP, 2 AP from 5 points and 1 AP from 9 (twice a turn at 10, and the reaction may pay).
- **The Strain limit:** 3, and one more at Composure 1, 2, 4, 6 and 8.
- **Elemental resistance:** each point of Pain Threshold stops 6% of elemental damage (60% at most from Pain Threshold, 80% from everything).
- **Figments:** forms are learned (two to choose at Visualization 1, on Level up; Start the run asks first), and the four Visualization forks.
- **Shadow:** dark maps, Douse, Prone, the shadow sightline and Stalk.
- **Effects and sounds** for prayers, Bonds and Figments; **the vow** is carried from fight to fight.
- **Enemies react** to what the doors do to them; **Into the Wall** (the Breaker drives a foe into a wall, the edge or a body) and **Hallow** (the Chaplain's hallowed ground).
- **The healing brake:** a second heal from the same giver on the same target in one round costs more MP, a third more again.
- **The Operative's Unseen Hand:** an attack from Hidden rolls with Ingenuity when that is higher.
- **"I'll narrate":** the host can take the Narrator's seat, with the Narrator's desk (narration, checks with a TN, rulings, a prepared fight).
- **Connections:** one link per player; a room opened in a second tab says so and offers **Take over here**, instead of the two tabs taking it from each other for ever.
- **Old saves** load: removed perks are renamed or refunded, with a free re-pick of the perks that changed (the card names the old perk).
- **The release's last pass:** a new Rigger and a new Mender open their doors in their first fight (Picture and Bond were greyed in the approach); the path map, the boon cards, the lobby, the turn card, the small map and the run summary fit a 1280x720 window; percent and plain words instead of multipliers; a perk without art shows its initials in its attribute's colour.

**Rules:** 1.70 the shared pieces of the attribute rework; 1.71 the owed player-facing faults; 1.72 the effects lane's engine events and the standing vow; 1.73 Body (Strength, Endurance, Agility); 1.74 Mind (Perception, Intelligence, Expression); 1.75 Soul (Determination, Insight, Virtue); 1.76 Shadow; 1.77 the approved engine pieces; 1.78 the leftovers; 1.79 enemies (items 6700 to 6714); 1.80 rooms (items 6800 to 6802); 1.81 the fun-and-balance fit (items 6900 to 6907, PROVISIONAL).

**Known and unfinished** (each in `docs/ROADMAP.md`): Silent (clashes with standing rules; waits on a ruling); Surprise in the approach (waits on Leon); Stand Behind Me (two designs; waits on Leon); Hurl (needs the object op's throw); the enemy item-action step; Field Repair as a perk (Improvisation's fourth); the Mender's solo kit (10 of 40 on stage 1); the Sigilist's simulator bot; the follow strike's −2 (buys nothing; to rule); Case (Shadow); the 0.32.x polish list (small screen faults from the screenshot pass).

## 0.31.11 — the skill pages, the level-up choosers and the outside playtest's fixes (rules 1.69)

- **The skill "?" page leads with the lore:** the voice's quote, its paragraph, At high levels, Good for and Bad for open on the face; what each level gives, the perks and the forks fold below (closed by default; each fold kind remembered for all 27 skills). The level ladder is one row a level; perks are rows (tier I, then what II changes); a capped per-point gain stops where it stops adding and says "(max)".
- **Level up:** the budget is one header row with a **TO CHOOSE** strip (Class, then forks, then perk steps); a chip opens one centred chooser (Take or Upgrade, a one-line confirm, Next choice); chips that don't fit are counted on "+N more"; Done lights when nothing is left; the class block in the side panel is one line that opens the class chooser.
- **Minimum text sizes:** one type scale (15 px body, 13 px secondary) across the menus.
- **Words:** card-style lines across creation, the sheet, the shop, the Forge, the camp and the rewards; no arithmetic in player text (results, not multipliers); the Outburst workshop says each Damage way once, in percent; a prayer card shows your own number beside its text and names its damage type; Cover Them says it costs 1 Guard and your reaction.
- **The outside playtest of 18 Nov:** a stim on yourself in a fight; an unclaimed perk step or fork is a level-up due (the camp and Start the run ask first); Evoke never aims a harm-only Line at your own tile; Second Wind is on the combat bar and heals; Parry rolls with the Guard door, a lost Parry keeps your reaction for Retort, and one Parry try a round; previews that lied (ambush from Hidden, the target card's switches); a Figment's kills are its owner's; Ghost Kill counts the victim's eyes; the Primed boon's Momentum lands; the feeling buttons price their Pump right; Mercy only where a foe can yield; Sigil Savant works in a run; one Flux limit everywhere.
- **The fight's edges:** no walking the fog before VICTORY; the alarm tells every foe where you stand when the fight is joined; the APPROACH banner and the calm track before contact; LEVEL UP for the whole room; an action's reach drawn by its boundary; condition signs enlarge from the hover card; the NOW PLAYING card steps aside on the level-up and creation screens.
- **Iron Heart:** once a fight, on Mana Shock, relieve 2 Strain (the `mana_shock` trigger; Strain as a resource row).
- **Rules 1.69:** items 5450 to 5455 (the Mana Shock trigger, Iron Heart, the capped ladder, Strain as a resource, the approved engine surface, this release's rulings); the 0.31.12 lanes' items 5501 to 5534 (the playtest's blockers, the approach and the alarm, the review's findings; item 5530 amended: one Parry try a round).

## 0.31.10

- No Survival node gives MP back: only Syphon does (Leon, 17 Nov 2026; `survival.json ammo_pack.mp` all 0, PROVISIONAL). A Rest's own restore is unchanged.
- The mana forecast opens above the small map.

## 0.31.9 — the owner's playtest fixes (rules 1.68)

- **Strain shows while you hold an Outburst:** never folded, always among the three meters on a short window.
- **Shape:** your free Pump each turn adds +0.12 to the multiplier (was +0.1; +0.2 and +0.15 break the Outburst peak's band at level 5). No free Pump of its own.
- **Iron Heart:** once a fight, Strain stops at your limit instead of going over. No Strain limit of its own.
- **Syphon:** 30 / 60 / 90 / 120 MP by band (×3); −6 air (×3).
- **Survival:** the Boss gives no MP back. Burnt cores still come back.
- **Player text:** no rule numbers or dev words; Slide, Stim Throw, the follow strikes and the prayers' shields rewritten as card lines; the validator fails on them.
- **Enlarge:** every icon shows its text under the picture.
- **PERKS tab:** Traits, Perks and FROM YOUR SKILLS fold, closed by default; the fight's Perks shelves fold too.

## 0.31.8 — the words, cut down (the lead's wording pass)

- **The skill ladder says the core and stops** (Leon, 17 Nov 2026; CLAUDE.md "Say the core, once, and stop"): "Perk: X or Y", "Fork: A or B", "Mastered: <perk>"; no "Only what every point gives" row; the beta's box reads "Feeds <door>" and its number in one plain line (no formula, no "You now"); a Call reads "1 AP · reach 5" and "+5 on checks and Asks".
- **What each point gives is closed by default** and opens on a click (remembered).
- **The Training card:** "Drill: Combat knife", "211 / 300 · +200", "At 300: Coup"; no "Reaches it"; a spent training says "Training used this rest."

## 0.31.7 — small fixes (no rules change)

- The fight's action-row icons are 24 px (were 18); the fork cards' option icons 40 px (were 24); a placed field's, trap's or turret's mark on its map badge 15 px (was 1em of a 9 px badge).
- The enlarged view shows the name first, then the picture, then the text.
- The map legend's field, trap and turret lines carry the map's own mark (interface_icons icon-zone-*).
- Wind-up, Read the Swing, Hold the Lane and Scrap Sentinel show their delivered icons (catalog data_ids). Stand Behind Me has no move in data.
- Not in this release (left for the next): the hover card's condition chips opening the enlarged view, the prayer reach's boundary, the camera on a refused click, the level-up banner, the two Kemizuchi weapons over the melee line, the Throw row's browser check, the browser suites' own port.

## 0.31.6 — the outside reviewer's report (rules 1.66)

An outside reviewer played live 0.31.5 for 90 minutes (a gunslinger and a Virtue Confessor who became a Chaplain,
Survival to stop 10). Each lead reproduced through the real path, fixed at its cause (spec items 5200 to 5216).

- **Can this enemy yield: one answer** (`yielding.ts canYield`, the list in `rules.json combat.yield`): surrender, Spare,
  Clean Hands, the Mercy vow, Love Conquers and a Narrator's surrender all read it. A drone (a machine, a robot, a
  turret, a boss, no_surrender) hit by a Spare blow is disabled, with no Clean Hands shield and no Mercy; the log and the
  Spare toggle say so.
- **Clean Hands** gives its shield at most twice a fight (`per_fight` 2, was once a turn); it is the base shield (the
  larger stands). The reviewer's "+24 to 29 per spare" was Clean Hands itself (15% of max HP x Conscience's feed).
- **The preview's AP is the price**, not the AP a trial run lost (a kill's AP back made "Shot · 0 AP"): the aimed action shows what the trial run charged (pay less refund), so a glyph an Edge Word or Twin Draw makes free reads 0 AP.
- **Mag Dump** spends the rounds of the rolls it makes: a target that falls to the first roll keeps 8 of 12 rounds in the
  gun, and the Heat does not jump to the limit (golden costs-pad re-recorded on purpose: one line).
- **Thrown items in the pack** (grenades, the flashbang, charges) are thrown from the Attack tab: one row each, a tile
  pick with its reach, blast area and targets.
- **The reward bar** opens the panel on the press, full width; the suite presses near both ends and checks every
  reward card's corners.
- **The GEAR tab's Stow** for the main hand, and "Stow the <weapon> first, then hold <item>" as one click under a
  two-hander (the free Emanator can be held).
- **Small fixes:** gear card numbers at one decimal; a reason said once; the run tally counts what armour, shields and
  stims did; the summary marks the starting boon; the MP row names the MP focus in hand; who-rules-it marks only where
  there is a Narrator ("Narrator's call"), unbuilt choices "Sealed: not yet issued."; "1 tile"; Esc closes the memory
  dialog; "Saved games"; a Main menu button (⌂) beside Leave; the fight screen's split kept through a resize.
- Not measured: a sparing Chaplain in the simulator (A3; no reference build holds Clean Hands at stage 1).

## 0.31.5 — the picking contract (rules 1.65)

### The art is in (0.31.5)

- **The 0.30 and after-0.30 art is in** (the artist's `art/after-0.30-2026-11-17` at `d2e5eb1a`, containing the 0.30
  delivery `1317c61d`; only `art/` changed). 41 + 54 pictures, all catalogued: the 32 fork icons (on the fork cards in
  level up and on the sheet), Stand Behind Me, Wind-up (Shove), Read the Swing, Hold the Lane, Scrap Sentinel, Follow,
  Afterword, the Mana Shock and Staggered signs; the status strip's helps / hurts / state marks (a chip with no sign of its
  own shows its group's mark, not the text triangle), the FREE ROAM banner's mark, eight new condition signs, the hazard
  tiles' marks and the Sigil field / trap / turret badges on the fight map, the Survival place cards (Study, Practice,
  Devotion, the shrine's rite, lore and token, the six Crossroads trades; catalog `place_icons`, by the option's key or
  trade id), the six vows and Witnessed. 38 placeholders retired to the archive; one left (Draw Fire, not delivered).
  Catalogued with no place to draw them yet: the Tending passives (5), the resource marks (credits, XP, Devotion), the
  seven tone marks.
- **Click to enlarge, everywhere.** Any icon slot carrying `data-zoom` opens the one lightbox (`screens/shared.js`) with
  the picture's 512 px copy (built for every white-ink family, `-lg`, fetched only when opened), its name and its text:
  the GEAR tab and backpack rows, the Give list, shop, Sell, Forge and upgrade cards, reward and material cards, the camp's
  stock, the place cards, the fight's action-row icons and weapon heads (clicking the icon enlarges; the rest of the row
  still picks), status chips, vows, the tab icons, fork cards, ARMS techniques, the sheet's moves and level up's perks.

- **The nine doors' art is in** (the artist's branch `art/nine-doors-2026-11-16` at `5406ede0`, merged whole: it changed
  only `art/`). 348 of the 375 pictures of the 0.29 list, all review candidates: 300 replace their placeholders by catalog
  id, 48 are for designed-not-built rows; 27 are held for 0.30 and the 0.30 list (41) is not started. Shown in the game
  today: the 18 alpha perks (new pictures), the four gloves' painted icons, Hymn Sanctuary and Whisper Ward; the moves,
  techniques, conditions, Shadow, Tending, door emblems, class portraits and camp signs are catalogued and wait for a
  screen that draws them.
- **Integrated: the game draws them** (17 Nov). `npm run assets` builds the moves, techniques, Shadow and Tending
  verbs, conditions, door emblems and camp signs (292 icons, 64 px) and the nine class portraits (320 x 400 and 800 x 1000),
  under their catalog ids and under the data's own ids (the catalog's new `data_ids`: a move's or verb's item key, a
  door's alpha skill); about 2.1 MB more in the build (0.25 MB of icons, 0.3 MB of small portraits, 1.6 MB of large
  portraits fetched only when one is enlarged). One resolver per family, `apps/web/src/game/doorArt.ts`. Drawn: the
  fight's action rows (a technique's, class move's, door step's or verb's icon left of its name, Hide's too; rows keep
  their height), the status strip's chips and the token hover card's (a condition's sign in place of the glyph, the
  colour kept on the chip), the sheet (a door skill's emblem on SKILLS, the class portrait and each move's icon in the
  CLASS block, each known technique's icon on ARMS) and the camp's checklist chips. Witnessed shows the delivered
  `cond-witnessed` sign. Not drawn yet (no place on a screen today): the Open Hand's forms and stance (toggles on an
  attack), the door steps that are passives with no row, the camp's Ready sign, the designed-not-built moves.
- The request list beyond 0.30 is 45 pictures now: Witnessed (row 39) is cut, and Felt, Practice and the six tones
  are answered by the delivered `ui-felt`, `ui-practice` and `mod-ench_*` art (cut from the request; the file says so).
- The 298 placeholder files are retired to `art/_archive/nine-doors/2026-11-16/superseded/placeholders/`; the catalog was
  merged entry by entry (every 0.31.1 entry kept); checksums regenerated; the old delivery manifests of the replaced perks
  name their archived copies (`validate_art.py` OK).
- **The art request list beyond the 0.30 list:** `art/briefs/GPT-PROMPTS-2026-11-17-after-0.30.md`, 54 pictures for what a player's screen shows as a text glyph or a blank (the status strip's marks, the FREE ROAM banner, eight conditions, hazards and Sigil zones, twelve Survival place cards, six vows and Witnessed, five Tending passives, credits, XP and tones), with what was left off on purpose and what the builder must wire. `ART-REQUESTS.md` 0b points at it.



- **Every aimed action shows its picking (Leon: "Picking UI for every aimed action is important"):** the engine's
  action preview now sends, for every system, the reach (where it could be aimed from here), the legal choices of the
  open pick, the area the aim covers and whom it touches with a word; the choices are worked out by the same check
  the reducer gates on (perks, class moves and door verbs, prayers, Figment and owned orders, Calls, techniques, basic
  actions), fogged to what the side sees. Shadow's Vault, Pick, Douse, Decoy, Rig and Sabotage now show their legal
  tiles; prayers show their reach and area (The Sky Answers' 5×5, Covering Fire's 3×3, Thunderclap's radius), read
  from the prayer's data (the typed radii and Switcheroo's 6 are gone; Together's "next to each other" is the row's
  `pair_within`); every Miracle's event carries its area.
- **The net gain of a mend:** a heal's or a shield's target says what it gets ("30 → 32 (+2)", "no gain: already at
  full HP"), from the engine's own run on a copy.
- **One overlay on the fight screen:** reach shaded, choices outlined, the area under the pointer, the touched units
  ringed with their word, for every action; a click on a tile or unit the pick can't take says why by the action box.
- **The guard:** `packages/engine/test/picking.test.ts` (every pick step of every offered action, nine classes, eight
  patrons, items: its choices are what the reducer takes); `apps/web/e2e/picking.mjs` in the browser.
- **Review fixes (rules 1.65 item 5108):** a Figment's orders and a technique's tiles keep the fog (a Hidden foe
  leaves no gap in the outlined tiles); every pick aimed at a unit shades its reach (a Whisper as far as you see, a
  thrown stim its 4 tiles, Bond its 6 or 9, a Figment's Strike round the Figment); the net gain of every mend (stims,
  Tending, perks, prayers) is the first thing the hover says, with "no gain" when nothing changes; a click on an empty
  tile while a unit pick is open says "Nobody there." by the action box.

### The SKILLS tab said to a player (0.31.5) — forks under their skill, the points page folds and speaks to the player, the gamma's Call

Leon, 17 Nov 2026: *"collapsable fork menu in the skill tab is still not in"*; *"make the 'what each point gives' menu collapsable too, and write the text for player reading"*; *"In the gamma tab, highlight the call action and how it grows in that menu too"*. Docs: `docs/design/ui-screens.md`, "The SKILLS tab and the skill page, said to a player".

- **Forks under their skill (S1).** The SKILLS tab's separate forks section is gone; each door's fork card sits under its skill's row, folded to one line ("Forks · 1 chosen · 1 to pick", white while a pick waits) and opens on click (the shared fold, remembered per skill).
- **WHAT EACH POINT GIVES folds (S2)**, per skill and remembered, open by default; inside it one layout for every skill: YOUR CALL (gamma), YOUR DOOR (alpha), EVERY POINT, Feeds <door> (beta: the top and this character's number now, from the engine's `doorFeedView`), AT 1 / 3 / 5 … and the ten steps.
- **Said to the player (S3).** All 27 skills' rows rewritten as one sentence to "you"; every named unlock has a player line (`skills.json` `unlocks.<n>.player`); the door verbs named at the points they open; forks name their options; perk steps say "Perk step: take X or Y". No ids, rule numbers or engine words (a test holds it). Five typed numbers got fields (Second Wind, Marrow Talk, Opening Argument, Veiled Insult, Ward): the text-number baseline shrinks by 5. `tools/text_numbers.py` guards the new `player` and `short` texts.
- **The gamma's Call (S4).** A gamma skill's page leads with YOUR CALL: the Call, its AP and reach now, how it grows (its steps' new `calls.json` `steps[].short` texts, the AP drop at 5, the reaction at 9 for a helping Call, the free first Call at 10, read through the engine's ladder functions) with the character's step lit, and what it rolls on checks and Asks. The level-up skill card shows the Call's line.
- **Review fixes.** The nine door lines said to the player ("Your door is Shadow: a meter you fill while no enemy sees you", Sigils' row lengths from the grammar, Outbursts naming the Mana Short and the Mana Shock after it); the facts the rewrite had dropped put back (Ingenuity's Shadow gains, loss, First Shade and Tagged at 1; Shadow Run once a turn and never under its floor; Share a Hit stays on until switched off; which prayer shields Conscience feeds; two shields never raise the plates you hold; Visualization's Snare, Hand, extra fork shapes and every shape at 10); every Shadow and Figment move named with a few plain words; the beta feed rows in one plain sentence; the Feeds box's "You now" is the engine's view on the character itself (the soak grows with level), and Pain Threshold's says its unit ("each Guard plate takes 7 damage off a hit"); a player line of several sentences shows one sentence a line. Parting Cut (Ingenuity 9) is listed but not built: the page says so.

## 0.31.2 — the reward panel (hotfix)

Leon on live 0.31.1: players zoomed into the path map never saw the rewards above it, and the map ignored their clicks
until they had picked. Rules 1.64 (item 4971); new words and timings PROVISIONAL.

- **The rewards are a panel.** After a won fight's field (and at the vault's chest) a panel opens by itself over the
  middle column, in view wherever the middle is scrolled: the fight's name, your pay (XP and your total now, a "Level up
  waiting" line, credits and your purse now, the supply pack, standing up) and your pick (the same Materials and weapon
  cards, and the pick of kit after an Elite). Its sections fold and remember. It closes when you have picked; closed
  early, a large bar at the bottom of the middle, "Rewards waiting: choose yours", reopens it. In co-op it says who is
  still choosing. The side panels stay.
- **The map never eats a click.** While the run waits on rewards (or anything else off the map) no stop is lit or pulses; while you owe a pick, a click on any stop, the next one included, reopens the panel; otherwise a refused click
  says the engine's reason on a line at the bottom of the middle ("Waiting for Ana to choose their reward.", "You can't
  reach that shop from here. Pick a lit stop.").
- **The pay is the engine's record:** each won run fight keeps what each character was paid (`paid`: the XP after its
  items, the credits after Tithe); the panel reads it.
- **Strain's warning chip reads the engine's real margin:** NEAR THE LIMIT no longer shows at 0 Strain on a character
  who cannot Begin an Outburst (no design the engine can price, e.g. an Emanator carried with no design): a Begin's
  Strain counts only when the engine prices one.
- Browser suites: survival (the panel in view at 1280 x 720 and 1600 x 900 and scrolled to the map, its numbers the
  record's, a pick in it, a map click reopening it, then the squad moves); its two-browser part: a guest sees its own pick and who is still choosing, and the host, picked, is told who it waits for.

### The known faults of 0.31.0 (rules 1.64)

- **K5, healing between stops (rules 1.64 items 5000 to 5002):** Field Surgeon's Patch works in a Survival run; a
  spare-parts charge costs 60 credits (was 16; repairs are dearer with it). The Mender's story Triage works in a run,
  once a stage map for each Mender (`numbers.run_per_stage`); the sheet's button says when it is spent. Measured with
  the run simulator's new `SIM_STORY_HEAL=1` (mix_trio, 20 seeds): within noise. Review fix: the once-a-stage count
  is kept in the never-fresh `per_campaign` scope keyed by the run and the stage (the per_scene key came back at every
  stop, since each node is a new scene); re-measured: 47 Triages in 20 seeds x 3 stages, no gain beyond noise.
- **K6, Relic properties for every weapon (items 5003, 5004):** gloves, wraps and the unarmed family take the
  melee Relic properties (True, Biting, Balanced) at the Forge; bare fists and Figment or companion weapons do not;
  a weapon nothing fits gets an honest refusal. Every category walked: only thrown items have none (and are not
  upgradable).
- **K3, a Pressed Boss (item 5005):** checked: the blade's Flush Out already spares Elites and Bosses since 0.31.0's
  review (`target_not_tier`); no change.
- **K4, Rite in the Field cuts Name It (item 5006):** the approved price predicate `action_id` (a priced action's own
  id); the perk's new `cost_mod` row cuts Lore Master's Call Name It by 1 (Tier II: 2), never below 0.
- **K2, the Dexterity blades (item 5007):** sabre damage 28 -> 20, legion gladius 26 -> 19, katana 28 -> 20 (it
  follows the sabre, rules 1.35) (PROVISIONAL; a first pass at 23 / 22 / 23 left the optimised twin at 194 to 206% at
  level 10). Now at or under about 175% at level 10 on both measures (melee-measure all in: sabre 173, gladius 165,
  katana 177; dex-melee-measure with both perks: sabre 140, gladius 130); the knife and the gloves untouched. The
  duelling blade is listed for the lead.
- **K1, a fight not yet joined (item 5008):** a Survival fight that opens unseen is not joined until contact:
  walking is free, no round passes, no foe but a Hidden one acts, the turn strip says so; at contact (seen, an attack,
  or three idle passes) BATTLE START, round 1, every first turn on full AP. Review fix (item 5011): only walking and
  End turn are free before contact; any other action (an attack, Hide, Overwatch, a Pump, a glyph) joins the fight
  first and is paid from that unit's round-1 turn, or, if it is not that unit's turn, is not made.
- **K7, the mixed squad (item 5009):** the 3 of 20 is the replay walker's (no making, buying or rests: the guns run
  dry); the run simulator clears the same squad 8 of 20 (10 of 20 with K1). Nothing changed; the tank's camp kit is listed for the lead.
## 0.31.1 — the fight panel put back, and a real VICTORY (hotfix)

Leon on live 0.31.0, with a screenshot of the fight panel. No rules change; new numbers PROVISIONAL.

- **HP is back in the You card**, under the portrait and directly above the meters, with the status strip under it,
  full card width; folding the card never hides them, and they stay in sight while the card scrolls. Nothing sits above
  the You card any more. On short windows the card shrinks to HP and the strip, under the bar's small portrait.
- **The ACTION POINTS row is back** under the YOUR TURN strip: one segment per max AP, the chosen action's cost dimmed,
  "N / M after this" on the right, on one line; the strip's six dots are gone (it keeps "ROUND n · n AP"). The action
  list still shows four rows at 1280x720 and 1600x900 (the short-window spacing tightened to make the room).
- **The Backpack button sits beside the limbs figure** at the card's right, as in 0.30.0.
- **VICTORY and DEFEAT are a panel**: after the killing blow's effects, in the middle of the screen over a dim veil,
  with the fight's name, the run's line of what follows, foes felled and rounds (what the engine holds then), on screen
  `rules.json combat.cards.end.hold_ms` (3 s) or until clicked, with a sound named in data (won: the Miracle sting and
  the choir; lost: a low pump and a sigh). Until it closes the field's bar, its leave vote and the fight-over dialog are
  hidden (they used to show the moment the last foe fell, with VICTORY behind them); then FREE ROAM. Still to source: a
  dedicated victory fanfare (CC0 / CC BY).
- Browser suites: fight-panel (HP in the card above the meters, the AP row with a segment per max AP, Backpack beside
  the figure), fight-cards (the panel before the leave control, never beside it, every frame); the suites that waited
  for the strip's dots wait for the ACTION POINTS row again.

## 0.31.0 — the field is turns, the fight's big banners, and the playtest's faults

Rules revision 1.62 (spec items 4900 to 4909), every new number PROVISIONAL. Leon's playtest of live 0.29.0, seven
faults (F1 to F7), built on the 0.30.0 release.

### The field is turns (F7, rules 1.62 item 4906)

- **After a won Survival fight its field runs `survival.json field.rounds` (3) rounds of real turns**, then the party
  leaves by itself, by the vote's own path (`leaveField`); a passed vote still leaves at once. The field opens on a new
  round (the killing turn ends there): the party's turns in initiative order on their turn AP, End turn, waits (a
  Hymn's), cooldowns, durations, once-a-turn uses (a Whisper comes back next turn), Strain and MP tick as in a fight.
  No foe has a turn on the field; a Downed character rolls no death save there. Still no growth, no harm to a friend
  or a surrendered unit, the item refusal. Supersedes rules 1.55 items 62, 63, 67, 69 and 70 ("no turns, AP free").
- A field saved by 0.29 or 0.30 takes its rounds at the next action (item 4907).
- The screen: "FREE ROAM · ROUND 1 OF 3" on the field's bar, the turn banner, the cut-in and the YOUR TURN box; End
  turn and NOW as in a fight; the AP pips and their drain; picking which of two characters acts on the field is gone.

### Movement feedback (F2, item 4901)

- **The hovered tile's "−N AP · N tiles" chip and its lift had been dead in every fight since 0.28.2**: the map's tile
  loop named its health view `hv`, the same name as the hovered tile, so the chip never matched. Renamed; the path
  arrow, the reach squares, the chip and the AP pips are one path, the field included. `moveOptions` reads the one cost
  site (`apFor`), so the reach squares are the tiles the move's own check accepts.

### AP at contact (F3, item 4902)

- A Survival fight is joined as its node is entered and every first turn is a full turn's AP (already so); the BATTLE
  START banner now says the fight has begun. On the area map an ambush from hiding opens on the attacker's full turn
  AP (it was the AP left of the area map's round), the strike paid from it; a Silent Kill that opens no fight takes
  the strike from the area map's AP as before. Grim Reaper I's first-turn −1 AP now lands on that ambush turn.

### The fight's banners (F1, item 4900) and no click after the vote (F4, item 4903)

- **BATTLE START, VICTORY or DEFEAT, and FREE ROAM**: big banners in the middle of the screen, each fully drawn for
  `rules.json combat.cards.hold_ms` (1250 ms) whatever the combat speed, queued in the turn banners' slot, no click,
  clear of the action bar; words in data (`combat.cards`, `survival.json run.after_fight.field`). The old per-session
  dedupe is gone (its key matched two fights of the same template, level and size, so a later fight lost its cards).
- A run's won fight has no end card: leaving the field goes straight to the rewards. `run.after_fight.won` reads
  "The field is yours".

### Begin (F5, item 4904) and a prayer's heal (F6, item 4905)

- The Begin button and the design cards read the reducer's own verdict on the action the click sends (the descriptor's
  dry run, with the action's credit and toggles; the area map's through `previewAction`, `game/verdict.ts`), and the
  magic preview's AP check counts the action's credit (a Brief's cut, Encore).
- A prayer's heal or shield (Whisper of Health, the healing Hymns, Mother Ember's intervention, Hearthlight, Turned
  Back, Rewoven; Protection, Saint's Shield) shows the green number or the ward through the one mend's effect
  (`mendShown`); the Soul heal's own second copy is gone.

### Moved on purpose

- 6 of 29 replays re-recorded (REPLAY_FULL): a Soul heal that restores nothing no longer emits an empty heal effect;
  with that line put back all 29 play as recorded, and the end states differ in their effects only. Golden damage
  tables unchanged.

### Pressure is Dexterity's (lane 0.31-dex)

Rules revision 1.63, spec items 4800 to 4822, every new number PROVISIONAL. From Leon's live play of 0.30.0: a Dexterity
melee build got nothing from its door, the knife showed Pull Out with no Throw, and Rite in the Field boosted a glyph.
The lead's rulings D1 to D7. One closed-list addition, approved: the predicate `rolled_with`.

### Pressure at arm's length (rules 1.63 items 4800 to 4810)

- **Pressure is Dexterity's door, not the gun's.** An attack rolled with Dexterity (a gun, a bow, a throw, a light blade,
  a Dexterity glove, the Open Hand's gloves when they pick Dexterity) lays and reads Pressure. A blow rolled with
  anything else sheds your own Pressure as before.
- **The predicate `rolled_with`.** The skill an attack rolls with is decided once (`combat.ts previewAttack`: the
  weapon's own, or a `roll_with`'s pick) and carried as `via` on the attack's events and the damage's source.
- **The melee pip.** A Dexterity blow adds 1 Pressure to its target, at most 2 a target a turn (`skills.json
  dexterity.unlocks.1`, row `pressing_blade`), and does not shed your own.
- **Flush Out's blade twin** (Dexterity 5): a Pressed foe you hit with a Dexterity blow saves or is Afraid of you for 1
  round, once a turn.
- **The door's pieces read Dexterity, not range:** Near Miss, Pressure Point, Keep Their Heads Down, the four Pressure
  forks, the Skirmisher's Fire and Move and Relocated, and Trick Shot (a blow carries through; the cover clause stays
  ranged). Texts reworded ("Strike, step, strike").
- **Bug fixed on the way:** `melee: false` on `attack_roll` and `to_hit` was always true (those events carried no
  `melee`), so Fire and Move armed on any blow and Relocated's +1 went on every roll to hit, spells included.
- **Guns do not move:** every gun rolls with Dexterity; no golden gun line moved and the balance contract passes.

### The knife (item 4811)

- **Throw costs no Momentum** (`techniques.json throw.numbers.momentum_cost` 0): a knife, throwing knives or a hatchet
  can open from range.
- **The sheet shows where Throw comes from:** the ARMS tab lists the techniques a held weapon's properties give ("COMES
  WITH THROWN"), Pull Out says "ONLY WHILE A WEAPON IS STUCK", and the weapon line reads "Thrown: Throw".
- **Pull Out's damage goes through the one damage path** (the weapon's scaling, the melee factor) instead of its own
  formula: a knife at Agility 7 pulls out for 14, was 1 after armour.

### Rite in the Field (item 4813)

- In a fight it cuts **Crystallise** by 1 AP (II: 2), never below 1 (Steady was dropped in review: item 4820). It no longer cuts
  the WARD glyph, prayers, Ward moves or a Guarded Begin. Data rows now; the hand-coded perk and its second Crystallise
  button are gone (the lint baseline shrinks). Cutting Name It waits on a price predicate on a Call's id (for the lead).

### Measured (item 4812)

- On the range (percent of the plain rifle, levels 1 / 6 / 10, Dexterity 7): the knife with both perks 89 / 97 / 99 ->
  96 / 109 / 109; the striking gloves 82 / 113 / 109 -> 88 / 127 / 121; 1.3 to 1.4 pips a turn (none before). Under
  the melee line (165%), so the pip limit stays 2.
- Survival stage 1, 20 seeds solo: the knife 0 -> 2 cleared, the Dexterity monk (Hand wraps) 10 -> 18.
- The door-builds simulator has `dex_knife` and `dex_monk` from now on; `test/balance/dex-melee-measure.test.ts`
  measures them (`DEX_MELEE=1`).
- For the lead: the sabre and the gladius in an all-in Dexterity build were already over the melee line and gain 8 to
  24 points more.

### Moved on purpose

- Golden tables: the Dexterity blade rows (the door row's use counter and log line; Fear on a Pressed foe; Throw's
  Momentum; Pull Out's damage), the marksman's and the shelved gun classes' blow lines (Fire and Move), Rite in the
  Field's rows. No gun line.
- 16 of the 29 replays (REPLAY_FULL), re-recorded: Dexterity blows, the Skirmisher's moves on non-Dexterity rolls, and
  Rite in the Field in the magic games.

### Review fixes (items 4818 to 4822)

- **A throw rolls with Dexterity whatever is thrown** (item 4818): `combat.ts weaponVia` answers a throw's skill from
  data (`rules.json combat.attack.skill_by_attack.thrown`) and the throw is aimed by that same answer. A Raw Power
  weapon thrown (an ork machete) rolled with Dexterity but carried `raw_power`, so Pressure Point, Keep Their Heads
  Down, the Skirmisher's moves, the forks and Trick Shot never saw it. New reducer test.
- **Flush Out's blade twin never frightens an Elite or a Boss** (item 4819, `target_not_tier`): two Dexterity blows a
  turn put a free Fear on a solo Boss about half its turns. The paid Flush still can. Stage 1 solo, 20 seeds:
  `dex_knife` 1 cleared (was 2), `dex_monk` 16 (was 18).
- **Rite in the Field drops Steady** (item 4820): Steady costs 1 AP and the floor is 1, so its clause cut nothing; the
  card now promises only the Crystallise cut. The test proves the cut from the rows and that Steady is untouched.
  Name It still waits on a price predicate on a Call's id (for the lead).
- **The pip limit stays 2** (item 4821): measured at limit 1, the sabre stays 40 to 50 points over the melee line (it is
  over before any pip) while the knife and the gloves lose most of what their perks gave. For the lead: a refit ticket
  for the sabre and the gladius in Dexterity hands.
- **Moved on purpose:** 39 golden technique lines, all a Dexterity blade (combat knife, Evoker blade, sabre) against an
  Elite (the twin's use counter and its save are gone); 5 of the 29 replays (`cover-4v6-guns-blades`,
  `open-4v6-guns-blades`, `open-4v3-level3`, `proving-4v12-guns`, `cover-4v7-blades-walk-away`), each moved first at a
  Dexterity blade's blow on an Elite or a Boss (the save no longer drawn). No gun line moved.

### The fight panel (lane 0.31-ui)

From Leon's screenshot of a character with every door open: *"i have ONE (1) singular line to scroll my attack option"*.
A screen change; no rule moved, no closed-list addition. One data field: `conditions.json` `side`.

- **One fold** (`apps/web/src/game/fold.ts`; the store beside the tab prefs in `game/tabPrefs.ts`, localStorage
  `phc.folds`, per box id, kept over a reload): the You card, Shields, Bonds, the vow line, the squad list, the combat
  log and the level-up screen's fork card fold to their header and open from it (keyboard too). A box may start folded
  by a rule; a state set by hand wins. Never foldable: the action list, Confirm, End turn, the tab row.
- **Mini meters:** one row (name, pips or a thin bar, the number); the explainer is the hover card. A meter at 0 with
  nothing this fight folds into a "+N" chip at the row's end (a click opens it, a click on an open zero meter folds it
  back, its first point opens it by itself); Bonds at 0 is one line. The Visualizer's value is its charge and its one
  state word the chip (it read "EMPTY" and "STOWED" at once, and wrapped).
- **The shield on the HP bar:** no shield track anywhere. A pale hatched segment joined to the end of the HP fill,
  draining first; past max HP the bar rescales so it fits; the number reads "410 / 410 +30"; hovering the segment or the
  number lists each layer (amount, giver, when it ends; the engine's shieldsView). The rule paragraph is behind a "?" on
  the folded "Shields 30" row. The token and the initiative strip draw the same segment (their strip is gone); Guard
  stays the plates and the pips.
- **The status strip,** pinned under HP: HELPING (green ▲), HURTING (red ▼) and the neutral states (white ◆), a glyph and
  a short word each, the full card on hover, past six "+N". The group is data: every row of `conditions.json` carries
  `side` (helps / hurts / state; `tools/validate.py` checks every row, and a debuff is always hurts). Hidden helps.
  The token's hover card carries the strip, small. "No status effects." is gone (an empty strip takes no room).
- **Room for the actions:** the action list keeps at least four rows (`listMinPx`); the AP pips ride in the YOUR TURN
  strip; no Say box where the mode has no Narrator (a run, the Proving Ground); the vow is one line ("Swear a vow ▸",
  then "Vow: Stand · …"); the preview and the target are one box (the roll line and the damage line, the breakdown on
  hover); on short windows the urgent meters are one line of minis and the tab panel's title line goes. The list's least
  height now really holds: it was set in the stylesheet below the tab panel's own inline 56 px and never applied, so the
  open vow (and the Say box in a Narrator room) squeezed the list to one row at 1280x720. Now it is 200 px (188 px on
  short windows: four 32 px rows under a weapon's head line), the open vow shrinks first (one line on short windows) and
  the foot with Confirm sticks to the dock's bottom edge.
- **The meters at 1280x720:** the short-window line of minis carries the "+N" chip too (it was only in the card, hidden
  on short windows, so the zero meters could not be opened there): three urgent meters and "+N" for the rest, at most
  two lines; the minis' pips no longer run over the next meter's name (the Ammo row did).
- **Small:** the plain melee blow is **Hit** with every weapon (`techniques.json` `cut`'s name; the id is kept; gloves'
  "Strike" is gone); the YOUR TURN shine no longer parks at the strip's end; a cog at the tab row's end opens the
  Fight tabs settings; a hovered tile is no longer raised over its neighbours (its card opens on pointer hover only);
  the Shadow wisps over a token take the pointer ("Shadow n / max").
- **Moved on purpose:** the golden `conditions.log.json` and `mods.log.json` re-recorded for the name only ("uses Cut"
  became "uses Hit"; 7 lines); damage tables unchanged.
- New browser suite `apps/web/e2e/fight-panel.mjs` (1280×720 and 1600×900); unit tests `game/fold.test.ts`.

## 0.30.1 — a hotfix: an item's own action in a Survival run, injuries treated in a run, the shelves cleared of Narrator-only items

From Leon's playtest of live 0.30.0 (rules 1.61 addendum, Core Rules items 4740 to 4767). Replays re-recorded on purpose: `proving-doors-hiding-watches-wave6` (its stream hash only, after int/0.30's text sweep of log lines); any further one is named in its commit.

- **An item's own out-of-fight action works in a run, when it says so** (item 4761: the `run` scope, given to Name your weapon, Name your line, Open Hand's mercy setting, Light Up, Verse, the three special-ammo loads, Field Surgery and Lunarshine's Drink; every other story action is greyed with "works in a story, not in a run"; the free mod fit is refused on the action that runs). Blade Recluse's "Name your weapon" at a shop was refused as story ("A Survival run has no Narrator and no story"). Off the field, a run now takes `story/perk` (a trait's, perk's, class move's or door verb's registered story action) through the one runner (`runPerkAction`), with no story round. The story's own acts (`world/act`, `poi/`, `talk/`...) stay refused. A use that would leave the Narrator a ruling is refused in words ("A Survival run has no Narrator to rule <item>"), and nothing is spent. The field after a fight is unchanged.
- **The One Blade is a record:** naming it posts a story line, where it opened a ruling before.
- **The extra mod slot is the Forge's in a run:** "Fit a second mod" (Blade Recluse, Gun Nut) sent directly is refused with the Forge's words, the same check as `gear/mod`; the armourer's fit with `extra` is unchanged. Golden `mods` line `fit/run/gun-nut-extra-mod` re-recorded on purpose (its refusal now names the Forge).
- **Injuries in a run:** Field Surgery (Empathy 3, an Attuner, a field kit), the one treatment for an arm or leg injury, works in a run off the field.
- **Shelves:** the ration pack, chalk and wax and the prayer beads (Narrator-only, nothing reads them) are `stock: false`; the ration pack is off the counter.
- **The field kit treats a limb (round 2, items 4747 to 4753):** out of a fight, not on the field, anyone with a field kit uses it ("Treat", the Give view's Use on...) on themself or a squadmate to treat one arm or leg injury; the kit is used up. A new use op `treat` (pack items may have a `use` now) and one treatment, `treatLimb`, that Field Surgery and the Rest share. Field Surgery keeps its requirements and the kit.
- **The toolbox counts as a field kit for Field Surgery only** (`serves_as`, read by `servesIndex`); it has no Treat and is never used up. Cigarettes (nothing reads them) are off the shelves too.
- **A run's Rest treats every limb injury** (`survival.json rest.treat_injuries`).
- **Overhaul's extra slot is the Forge's in a run:** the armourer fits it for the fee after the rest that sets its bench (`forge.fit.extra_actions`, read by the paid extra fit); the free fit stays refused.
- **A blank plate teaches the lesson you choose:** a Sigil or Heart plate bought at a shop has no lesson written on it; on the Magic tab you pick one of what it can teach you now (`plateChoices`), through `magic/learn`. The plates stay on the shelves.
- Tests: `test/run-item-actions.test.ts` (through the reducer).
- **Also in 0.30.1 (merged from int/0.30):** two browser suites brought to the 0.30 rules (the Relic step beside the camp Buckler; classes-moves), CLAUDE.md's picking-UI rule, no player-facing "bots" for mana, the banner renamed the Mana-thread banner (its id kept), and one icon resolver for the shop, camp, sell and give rows.
## 0.30.0 — shields as weapons, the follow strike, the tank rulings, the bare heart and the shield display

Rules revisions 1.56 (two late blocks: the bare heart and the Mana Shock; a shield in either hand), 1.57 (shields are
weapon rows), 1.58 (follow strikes), 1.59 (the tank rulings) and 1.60 (Doors 3.0, slice A), every new number
PROVISIONAL; spec items 4308 to 4317, 4500 to 4543 and 4600 to 4618. Built on top of live 0.29.0 from three lanes merged
in order: the fight tabs and the bare heart, a shield in either hand and the tank, the shield display; then Doors 3.0's
slice A. Decisions 116 to 120.

### The bare heart and the Mana Shock (rules 1.56; decision 116)

- **A Begin without an Emanator costs +4 Strain** (was +2), for the Begin and every move that begins an Outburst
  bare-handed (the class Outburst moves, Gift, Inner Charge). One field: `soul_modules.json cycle.no_emanator_strain`.
- **The Mana Shock.** A Mana Short (3 over the Strain limit) still Stuns and throws a held Outburst wild, but Strain no
  longer falls to the limit: the caster is in **Mana Shock**, and every one of its turns from the turn after costs 25%
  of max HP. Nothing softens or raises it (no armour, shield, Guard, redirect, floor or +% taken: the heart's own harm is
  exactly its number); it Downs, never kills, and a Down ends it; no second Short while it lasts; it ends with the
  fight and is never charged outside one. For every Soul caster, characters and enemies. Shown as MANA SHOCK (damage
  red) on the token and panels, the Strain row, the held heart's warning and the Outbursts door line.
- **The Outbursts tab warns a bare-handed caster** at its top ("Using magic without a focus causes great harm."), with
  the numbers from data.

### The fight tabs

- **Fight tabs per character** (kept by character, in any room): the action list's order until arranged, then a stable
  order; the cog's Fight tabs panel (move up / down, hide, Reset; in a fight it numbers the tabs as the bar does and
  marks the ones absent this fight); number keys follow the order shown.
- **A focus door's tab** (the Sigils tab with no Evoker, and the like) is hidden only when the engine refuses every
  action on it; the Outbursts tab never goes while an Outburst is held, and says to put the focus on when it is only in
  the pack.
- **Scuff is on the Utility tab for everyone**, with a mirror on the Sigils tab.

### Shields (rules 1.56, 1.57; decision 117)

- **A shield in either hand, one to a hand**: a caster carries a shield with the focus, and two shields are legal (each
  shield's Defense and Movement add; Parry and the shield's techniques once). The sheet, the camp, the fight's hand
  change and the Proving Ground offer the main hand for a shield.
- **Shields are weapons**: the buckler, the riot shield and the pavise are weapon rows with the Shield property. In the
  main hand a shield strikes with its own line (buckler 6, riot shield 8, pavise 8; Durability), wears and is graded
  as a weapon; in the off hand it is not a second weapon. A main-hand shield with a sword in the off hand is still
  ordinary dual wielding, and the shield's techniques come from whichever hand holds it. Shield Bash strikes with the
  shield (x2.5). The pavise is a shield when carried. Old saves' shield lines are moved to weapon lines at load.
- **No swell with a shield**: while a shield is in either hand a held Outburst keeps its stage at the turn start (the
  Strain of holding still comes); Pumps are untouched. The heart panel and the design cards say so.

### The follow strike (rules 1.58; decision 118; design `docs/design/proposals/2026-11-follow-strike.md`)

- **The off hand follows.** A shield, Afterword, or a melee weapon carrying a mod that grafts `follows`, held in the off
  hand, strikes once after each melee technique of your one-handed main weapon: its own roll at -2, its own damage, no
  AP, at the foe your first blow really struck. It is a rider: no Momentum, no Pressure, no other item's once-a-turn
  line, and a missed follow draws no Riposte. Never after a gun, a throw, a reaction, a shield technique, a paired attack
  or a class or perk strike, and never with a two-handed weapon (Heavyworlder's one-handed greatsword included).
- **A shield's follow gives Guard**: the first that lands each turn gives 1 Guard, however many shields you hold.
- **Not a second weapon**: a follows item in the off hand asks no +2, opens no Both block, makes no paired attack and
  has no attack of its own there. A main-hand shield with a sword in the off hand is still ordinary dual wielding.
- **Shield Bash costs 1 AP** (was 2). **Wear**: only the follow wears the off hand; a follows item worn to 0 makes no
  follow.
- **New gear rows, in no shop or loot table yet**: Afterword (an off-hand knife, its follow at a quarter of its damage
  and Bleeding once a turn; 700 credits) and the Trailing balance mod (grafts `follows` onto a melee weapon).
- **Screens**: each melee row's preview shows the follow as a second line, the log shows both rolls, and the follow is
  drawn as a second swing from the other hand.

### The tank rulings (rules 1.59; decision 119)

- **A tank hits with Durability in melee only** (a gun or a throw rolls with its own skill); the blow keeps the
  weapon's own damage.
- **A shield's blows scale with Endurance.**
- **A shield in each hand doubles every Guard gain** (Brace, the Guard technique, the follow's plate); the pool's cap
  is unchanged.
- **The Bulwark's Guard pool is 5 / 6 / 7** at ranks I / II / III (everyone else 4), drawn as up to 7 plates.
- **The camp's Recommended tank kit** is the Hand wraps and the Buckler.

### The shield display

- **Shields on the token and the card.** The token's one pale bar became a strip of one segment a shield, in its
  source's ink, in the order a blow meets them (the base shield hatched); every card (hover, target, your panel) has a
  SHIELDS block: each shield's name, amount and how long it lasts, Guard on its own line, what stands before HP
  ("Absorbs up to X before HP", the drop case on its own line). A friend's card shows its shields; a foe's reads by
  name with a size word, never a number. The "+N SHIELD" chip counts every shield; the turn strip shows them under HP;
  the fight Narrator is told them. Every word is the engine's `shieldsView`, from `data/rules.json combat.shield_look`.
- **One copy of the spend order and of how Guard soaks** (`shieldOrder`, `physical/guard.ts guardSoakOf`), read by
  the damage path, Durability's soak, the Bulwark's Reactive Plate and the view, so a plate holder's card says Guard
  is met first, 10 a plate, nothing kept (it said after the shields, by the general soak, one kept).

### Doors 3.0, slice A: the beta feeds its door (rules 1.60; decision 120; spec `docs/design/proposals/2026-11-doors-3.0-spec.md`)

- **Each attribute's beta skill feeds its door**: one number of the alpha's door × (1 + 0.01 × alpha × beta), ×2 at
  10/10. Pain Threshold: each Guard plate soaks more. Guts: a hit or a tile wears off less Momentum. Athletics: you shed
  more Pressure at your turn's end, and Slide reaches further. Acuity: foes need more to find you while Hidden.
  Rumination: a higher Flux limit. Improvisation: tougher Figments. Camaraderie: Tending a Bonded ally heals you a share
  of it. Composure: a higher Strain limit (16 at Will Power 10 and Composure 10). Conscience: every shield your prayers
  give is stronger. What each beta did before is kept. The door's tab (and the Guard and Momentum cards) shows the number
  now and what the next point buys; each beta's skill card names the door it feeds.
- **Two shields deal real damage**: a shield's blow in the main hand was sized as a free follow and armour ate it (1 or
  2 a hit). A shield's line is now its main-hand blow (Buckler 15, riot shield and pavise 20); its follow keeps its old
  size (×0.4), and Shield Bash its old damage. The all-in wall with two shields deals 88% of a sword and a shield's damage
  a round, clears stage 1 every time, and never stalls.
- **The gun alpha perks are control now**: Pressure Point lays a pip on a foe already Pressed (and one more on one
  Suppressed) with a small damage step; Keep Their Heads Down puts a Pressed foe Off Balance. A gun with both perks sits
  4 points above its no-perk line (it was 33).
- **The base shield names its giver** on the token's strip and the cards, in the giver's door ink.
- Prayer shields are a blessing's to every rule that asks (they had no kind), so the Survival boon that strengthens a
  prayer's shield now meets the Whisper of Protection too.

### Fixes

- **Guard no longer spends plates on damage a Ward takes**: Durability's Guard is met after every shield, the layers
  too (it subtracted only the base shield). A Reactive Plate holder's plates are still met first, before every shield.
- **The Reactive Plate's card line no longer claims it soaks your own harm**: it soaks every blow and true damage, but
  never the heart's burn or the Mana Shock (nothing softens the heart's own harm).

### Known and unfinished

- **Numbers not yet fitted:** two shields' doubled Guard, the Bulwark's pool by rank, the follow's -2 and Afterword are
  PROVISIONAL and measured only in the lanes' runs.
- **Doors 3.0 after slice A:** the forks (N1, N2) and Strain and Flux as resource rows (N3b) come later; the reshape,
  and N23 are slice B (below); the healing brake is not built (see "The review"); the feeds' 0.01 is not fitted.

### Doors 3.0, slice B: the reshape (rules 1.60 items 4619-4644; decision 121)

- **One taunt: Challenge.** Everyone's Challenge now names one foe it can see within its 2 tiles (its area and save are
  as before). The Bulwark's Draw Fire is **Called Out**: its Challenge costs no Guard and the named foe is Taunted with
  no save (a Boss too, never forced).
- **Durability 3 is a perk step** (Take the Hit is retired).
- **The Breaker:** **Wind-up** (rank I, in the class Shove's place) starts each fight on 3 Momentum; Lunge is
  **Barrel In**; **Read the Swing** (rank II, in Lingering Dread's place): a melee miss on you gives 1 Momentum once a
  round (it comes before a Riposte, so it can pay for one); the class's own Finisher action is **Measured Blow** (rank
  III): once a fight, a Finisher gives 1 Momentum back. Everyone's Shove stays.
- **Keep Swinging:** a Finisher that drops a foe makes your next Strike or Opener (before your next turn ends) cost no
  Momentum; Tier II also gives 1 Momentum for a Finisher that hits an Elite or a Boss.
- **The Skirmisher:** Speed Loader is **Hold the Lane** (held shots 1 AP cheaper); Run and Gun is a free move of its
  own (Fire and Move's step and Run and Gun's move both in one turn).
- **The Operative:** **Vanish** makes your Fade cost no Shadow.
- **The Mender:** Triage is worded as the medic's Touch (same numbers). (The healing brake was built here and removed
  by the review: see "The review" below.)
- **Tending's Shield** goes only on a Bonded ally.
- **The Rigger:** its Double costs no charge and lasts a round longer; Overclock is **Redline**; the Scrap Turret is the
  **Scrap Sentinel** (a free Sentinel, the Figment form, for 3 rounds).
- **The Channeler's Heart Surge** never goes past stage 4.
- **Deliver the Sinner** (Faith 5): your patron's blows deal 20% more to a foe your squad has Marked (the 2 AP mark is
  gone: Marking is Shadow's).
- **The Open Hand's Palm** Staggers (no reaction until its next turn) and pushes nobody.
- **The Chaplain's Ward** may sit on 4 allies (was 2).
- **The long rifle** deals 47 (was 48): the gun ceiling held after Hold the Lane took the Skirmisher's reload discount.

### Known and unfinished (slice B)

- **Not built:** Last Rites' "never stands the ally up" (every heal on a Downed unit stands it up today: a ruling for
  the lead). **Built in a cheaper wording:** Measured Blow (a flat 1, not "half the Momentum spent": no source carries the
  spent count). Keep Swinging's free Strike lasts to the end of the next turn (a Finisher ends this turn's chain).
- **Not run:** the browser suites whose truth changed (tank, tending, classes, figments): the browser gate comes later.

### Doors 3.0, slice C: the forks (rules 1.60 items 4645-4662; decision 122)

- **Forks.** Each door's alpha skill opens two forks, at 4 and 6 points: two options each, chosen once out of a fight
  and kept for good. The level-up card shows the fork its points reach (both options side by side, their rule, what they
  run on: Choose, then Confirm); the sheet's SKILLS tab lists every door's forks, a choice still to make in white; the
  door's fight tab and the Guard, Momentum and Pressure meters list the forks held. Every option runs on its door's own
  resource. Placeholder icons for all 32.
- **Guard (Durability):** at 4, **Provoke** (the first foe a round whose blow lands on your plates is Taunted, no save)
  or **Cover Them** (an Answer: the first ranged hit a round on an ally within 2 lands on you, for a Guard and your
  reaction); at 6, **Stand Fast** (Slam Taunts every foe within 2, no save, and pushes nobody) or **Drive** (Slam pushes
  2, its Off Balance save at −2, a plate back for each foe knocked Off Balance, at most 2 a turn).
- **Momentum (Raw Power) at 4:** **Rolling Start** (Charge from a 2-tile run, no Momentum, +1 on a hit) or
  **Grindstone** (a plain hit on the foe you hit last builds 2).
- **Pressure (Dexterity):** at 4, **Converging Fire** (an ally's ranged hit on a foe you hit this round adds a pip) or
  **Walk It In** (a ranged miss still lays a pip); at 6, keyed to the foe's own Pressure cap, **Through the Gap** (your
  next move is 1 AP cheaper and draws no opportunity attack) or **Lockdown** (the foe is Slowed, no save).
- **Bonds (Empathy) at 4:** **Keep the Thread** (Snap keeps the Bond, gives no Daze, costs Tug's 12 MP) or **Short
  Thread** (Tending a Bonded ally within 2 is ×1.4, Touch reaches 2).
- **Figments:** the two forks move from Visualization 3 and 5 to 4 and 6; a form already chosen is kept.

### Known and unfinished (slice C)

- **Not offered yet** (a step is offered only when both options are built): Momentum 6 (Spill waits on N21), Bonds 6
  (Long Thread on N20), every Shadow, Prayer, Sigil and Outburst step (N5, N6, N7, N9, N12, N14, N15, N18, N22). Built
  and waiting for their pair: Spotter, Shared Pulse. Buildable, not built: Lend the Dark, Headlong, Ride the Edge, Clean
  Break (and with them N3b and N10's `at: "limit"`).
- **For the lead:** Drive's −2 and plate back read every Off Balance its holder forces, not only Slam's.
- **Measured, not tuned** (`FORKS_MEASURE=1`, the contract's all-in lines, no perk steps, feeds at ×1): Grindstone moves
  the blade line 172% → 186% (+14 points; level 20: 203% → 225%); Walk It In the gun line 160% → 163%; the rest read +0
  where the one-unit measure cannot express them (Converging Fire needs an ally, Rolling Start a policy that Charges,
  Through the Gap and Lockdown movement and a foe's turn, the Bonds forks a heal row that does not reach Empathy 4).
- **Not run:** the browser suites (figments.mjs edited for the forks at 4 and 6; tank, levelup and skeleton screens show
  the new fork sections).

### Doors 3.0, the review (rules 1.60; decision 123)

- **Camaraderie's heal back is the share its tab shows:** 3% / 15% / 30% of what your Tending restores to a Bonded ally
  at Empathy 10. Your own healing received no longer multiplies it again (it gave 57% at 10/10 while the tab said 30%).
- **Pain Threshold reaches the Bulwark's Reactive Plate:** from rank III each plate soaks the plate's 10 × the same feed
  as everyone's Guard (11 at Durability 10 and Pain Threshold 1, 20 at 10 and 10); the Guard meter, its hint and the
  door tab say that number (they said the fed Guard soak while the plate stopped a flat 10).
- **The healing brake is not built:** it needed a price that sees its target, a piece not approved for this release, so
  it was removed with that piece. Each Mend, Touch, Shield or Triage costs its own MP again.
- **Keep the Thread is for a foe:** a Snap on a Bonded ally still heals and ends the Bond (kept, it was a 1 AP heal
  every turn). The 12 MP is on every Snap with the fork (a price cannot see its target).
- **Small fixes:** the validator's held-equal checks on five forks run again (they named the wrong ids and checked
  nothing); the fork card says "this choice comes in a later version" for a step not offered; Grindstone's and Converging
  Fire's texts say a foe marked by you or by another holder counts; the Breaker's Momentum rule names Wind-up's start of 3;
  the figments limits say Scrap Sentinel.
- **Re-recorded on purpose:** the plate's fed soak moved the tank builds' taken lines at L12 and L20 (`builds-normal`,
  `builds-allin`), the Defender III hazard and blast lines (`costs-items-*`, `itemops-traits-classes`), and one replay of
  29 (`proving-doors-hiding-watches-wave6`, 154 actions to 130).
- **For the lead:** the heal back's other reading (the tab saying the larger share) is Leon's; the brake waits on a
  target-aware price; Grindstone's mark (2 rounds, no source) and Converging Fire's; Stand Fast has no per-round limit;
  Cover Them and Provoke show no measured reward in the wall and gunner duo.
### Lane 0.30-fit: guns by Agility, the party fit, the opening volley

- **G1, gun damage from Agility (rules 1.61, Core Rules items 4700 to 4704):** a character's gun shot now grows with
  the gun's Attribute, Agility, as a melee blow grows with its own (`rules.json output.profiles.gun`: k 1.15385 x
  (1 + 0.05 x (Agility - 1)), no skill slope; Dexterity still buys the hit). The 26 gun rows of `weapons.json` (pistols,
  revolvers, SMGs, rifles, shotguns, heavy weapons) name `phys.profile: gun`; bows, thrown charges and the foci's
  weapons do not. Agility 7 deals what every gun dealt before; Agility 1 x0.77, Agility 10 x1.12. Enemies are not
  touched. The weapon card's "Damage scales with" line shows Agility on every gun. The golden tables' character gun
  rows and 22 of the replays were re-recorded on purpose (commit b721970a).
- **G1, the lead's rulings R1 to R5 (Core Rules items 4720 to 4728):** the balance yardstick is pinned (the plain rifle
  at a normal share, its shot at the gun profile's pin, Agility 7: `rules.json balance.yardsticks.rifle`, one function
  in the simulator), so the enemy table's fit holds again (a Soldier is 4 hits). The gun profile's low end is softer:
  k 1.275, +0.0294118 a point, so Agility 1 deals x0.85 of the old damage (was x0.77) and Agility 10 x1.075 (was
  x1.12); Agility 7 unchanged. The gun ceiling's guard holds the guns at the pin and lets an all-in gunner above it
  deal more; the Survival solo gunner's bar is 2 of 8 (measured 45% over 40 seeds). The weapon card's damage percent
  is now against the pin (Agility or Strength 7 = +0%; a gun at Agility 1 reads -15%). The simulator's policies no
  longer stall on a dry gun (reload, a weapon from the pack, a pile, the fists). Golden gun rows and 22 replays
  re-recorded on purpose. **Not green (for the lead):** the Whisper row and the Chaplain row at level 20 and the
  Mender's offence, each inside its band with every gun at the pin (item 4725). *(Settled in the opening-volley pass
  below: the three rows are held at the pin, as the gun row is; item 4736.)*
- **Survival's party fit (rules 1.61):** a party of two, three or four now faces 0.9 pressure a head (`pressure_per_char`
  [1.3, 1.7, 1.3, 0.9] → [1.3, 0.9, 0.9, 0.9]), so playing together is no longer the harder way to play; a character
  who died in a won fight, or was only Downed when the party leaves the field, stands up at 50 HP, not 1
  (`run.dead_return_hp`, one copy for both). Measured in `docs/design/proposals/2026-11-party-fit.md`.
- **The opening volley (rules 1.61, Core Rules items 4730 to 4739; Leon's playtest: "99% of the deaths was gun firing
  enemies"):** a fix and four numbers, measured in `docs/design/proposals/2026-11-party-fit.md` sections 12 and 13.
  - **Bug fixed: sight is the same both ways.** A foe the fog hid could shoot a character who could not see it back (a
    straight line walked from one end is not the same tiles as from the other). A line of sight is now clear only when
    it is clear from both ends; the Skin Map's own copy of the line is gone.
  - **Enemies fire the characters' Burst** (two rolls, the second at −4; was three rolls with an Auto weapon:
    `techniques.json burst.numbers.enemy_same` 1). A Gun drone deals 21 then 29 a turn on a level-1 character (was 30
    then 46), what a Soldier's sabre deals once it is in reach. The tier damage factors were not raised.
  - **At most two optional gun Soldiers a template** (eight templates' slot `max` 3 or 4 → 2), and **cover within one
    tile of every start** (`layout.start_cover_reach` 3 → 1).
  - **Soldiers spread their techniques** as they spread their plain fire: a new tier field `technique_spread` (Soldier
    0.5, the rest 0) halves a technique's want for a target another Soldier already attacked this round; never against
    a Taunt.
  - Two gun Soldiers on one character in the open no longer take it from full HP to Downed in one round (26% → 0% on an
    Agility-1 Mender, 3% → 0% on the yardstick); stage-1 clears hold or rise (the Chaplain alone 43 → 65%, quads up);
    fights are as long as before (median 4.1 → 4.3 rounds). Not met, for the lead: one duo member still takes most of
    the shots (66 to 88%), and a pillar beside you still gives no cover (each needs a new engine piece).
  - The balance contract's Whisper, Chaplain and Mender offence rows are held at the gun profile's pin like the gun row
    (the lead's call on item 4725). 22 of the 29 replays re-recorded on purpose; the golden tables did not move.

## 0.29.0 — Balance 2.0: the nine doors

Rules revision 1.56 (every new number PROVISIONAL), built on top of live 0.28.3. Each of the nine skills that open a
class's way of fighting (its "door") got new pieces, the gear got mods, special rounds and named variants as data, and
the alpha perks were rewritten so each one helps its own door. The full account, door by door, is
`docs/design/proposals/2026-11-nine-doors-report.md`.

### The nine doors

- **Guard (Durability, the Bulwark).** Guard is drawn as plates around your token. New: Close Guard (a quarter of a
  blow taken by the plates), Retort (strike back when hit in melee), Set Against the Blow, Last Plate (once a fight a
  killing blow leaves you on 1 HP), Challenge (nearby foes must attack you) and Slam (push every foe next to you).
- **Momentum (Raw Power, the Breaker).** Momentum shows as x1 to x5 on the token. A Charge that hits builds it; four
  Finishers spend it; Launch throws an enemy next to you across the room; Wrecker and Breach make smashing cover pay.
- **Pressure (Dexterity, the Skirmisher).** Any ranged hit pins; Pressed, Suppressed and Broken show as pips. The
  Skirmisher gets Fire and Move, Relocated and Break Them; Dexterity's door gives Near Miss, Shaken Nerves and Flush Out.
- **Shadow (Ingenuity, the Operative).** A SHADOW tab from Ingenuity 1: Hide is cheaper, the tiles you can hide on are
  shaded and it names who sees you; Tag marks a foe; Ghost Kill at Ingenuity 3; being found is shown (FOUND).
- **Sigils (Brain Power, the Sigilist).** Unchanged in shape: it was the yardstick the other doors were built up to.
- **Figments (Visualization, the Rigger).** Every Figment takes orders on your turn (one order price); Redraw and Cash
  in for all; Glimmer, a false Figment anyone with Visualization can raise; five new forms on a ladder with two forks.
- **Bonds (Empathy, the Mender).** Tug pulls a Bonded unit to you (an ally comes willing); Snap breaks a Bond on
  purpose for damage or a heal; Last Thread makes your next Raise free; the Bond card shows what Bonds give.
- **Outbursts (Will Power, the Channeler).** Kept as 0.28 left them; its alpha perks were rewritten.
- **Prayer (Faith, the Chaplain).** The Canticle: a song that climbs three verses while you keep singing, each patron
  with its own verses, broken by a hit; Amen, Holy Dread and Last Rites.

### The monk's gloves

- **Fighting bare-handed is a weapon family.** Hand wraps (free at the camp), Knuckledusters, Striking gloves, Iron
  mitts and Kemizuchi strikers, in a force line (Raw Power) and a quick line (Dexterity). With gloves on: the forms
  (Jab, Palm, Sweep and more) on your attacks, Flurry, Trip, Grapple and Counter, Open guard in light armour, Sway and
  Breath.

### Perks

- **The 18 alpha perks were rewritten** so each feeds its own door (Weight of the Wall, Keep Swinging, Pressure Point,
  Long Dark, Running Hand, Many-Eyed Dream, Taut Thread, Clenched Heart, Unbroken Litany and the rest). Your perks keep
  their names on your sheet; nobody has to pick again. No perk asks the Narrator anything now.

### Survival and camp

- **The camp's Recommended kit** now knows the Operative (a pistol, a smoke grenade, armour, a stim) and the Monk (the
  Hand wraps). The camp's header has its painting.
- **A weapon mod can be a reward pick**, and the armourer fits mods to any gun you carry; the extra mod slot is fitted
  at the Forge for the same fee.
- **On the field after a fight** the Backpack has Give (with the amount box) and "Use on…", as on the map.
- **The lobby says "one character each"** in a Survival room, as the Start button already required.

### Gear

- **Mods are data**: red dot, scope, compensator, foregrip, extended magazine, suppressor and more, each doing exactly
  what its card says, on either hand. Guns now show their Recoil.
- **Special rounds come in each calibre** (armour-piercing, hollow-point, incendiary), priced from that calibre's round;
  old saves' special rounds turn into rounds of the reference calibre.
- **Melee damage grows with one attribute** (Strength for heavy weapons, Agility for light ones); Pull Out shows only
  when something is stuck.
- **Variants** (twenty named weapons and foci, such as 'Long Bead' and 'Steady Eye') exist in the data but are not
  offered anywhere yet.

### Fights

- Text in the fight, run and camp screens is never smaller than 13 px.
- One rule for Taunt, one for a Boss holding against forced moves, one health ladder.
- Tug costs 12 MP (three times its first price, as 0.28.3 did for every Tending verb).

### Fixes

- A Shot picked on a friend on the field shows why it is refused, not a hit chance.
- The field no longer says YOUR TURN; it says NO TURNS HERE, and the Backpack says "free".
- Bond aimed at a machine says "A machine has no heart to Bond." (pinned by tests; the live report did not reproduce).

### Known and unfinished

- **Designed, not built:** the shield's second swing; the Breaker's wall slams and hurling; enemies breaking under
  Pressure (the AI does not read the states yet); consecrated ground (Hallow); the forks for Guard, Momentum, Pressure,
  Shadow and prayer; bare fists counting as the glove family; variants in shops.
- **Numbers not yet fitted:** guns go above their line once perks are added; the solo tank; casters and duos in
  Survival. Every 1.56 number is PROVISIONAL.

## 0.28.3 — the field is the fight, and the Durability tank

A patch release from Leon's playtest of 0.28.2 (rules 1.55 items 45 to 75, every number PROVISIONAL). Leon on live
0.28.2: "cannot bond in field map after battle" and "ZERO effect are played in field map". The field after a won
Survival fight is now the same fight, still running with no enemies left (items 61 to 70), not a second "field" mode
beside it. And the Durability tank works (items 71 to 75; the measure is
`docs/design/proposals/2026-11-tank-fit.md`).

### Survival

- **Everything you can do in a fight works on the field, and looks and sounds the same** (rules 1.55 item 61). When the
  last enemy falls you stay on the fight screen: Bond, Tending, class moves, techniques, Calls, prayers, reloads, stims,
  Sigils and Outbursts are the fight's own actions, with their effects, sounds, log lines and numbers.
- **No turns on the field** (item 62). Anyone acts at any time; End turn is gone ("No turns here: act freely, then vote
  to leave."); no round passes, so waits (a Hymn's) do not count down, a Downed friend rolls no death saves (stim them),
  and a once-a-turn use (a Whisper) is used once there.
- **AP never runs out on the field** (items 63 and 70). Costs are shown as listed; nothing is refused for AP; walk
  anywhere you can reach; the word "free" stands where the AP pips were. Syphon and Crystallise still pay the mana meter
  there, and once it is spent neither gives anything.
- **Still guarded** (items 64 and 68): once-a-fight uses stay spent; nothing learned by doing grows; nothing you do can
  hurt a friend (a Bond on a friend is not harm) or a foe that surrendered ("They have surrendered."), and a shove of a
  friend is refused like harm; the free-and-lasting actions stay refused in words.
- **The fight ends when you vote to leave** (item 65). XP and credits are still paid as the last enemy falls and the
  pick comes after leaving; the fight's own end (Strain, a held Outburst, conditions, Flux, the dead standing up) and
  **the supply pack** now come as the party leaves. A character dead in the fight stands up at 1 HP with no HP from a
  level its XP brought while it lay dead. Field Mending and Devout land as the field is left.
- **Give, make, use and level up on the field** as anywhere out of a fight; the fight's tokens take it. A stim on a
  friend there is the fight's own stim, next to them.
- **A player with two characters on the field acts as either** (item 69): click one of your tokens, or its card in the
  squad panel; a Downed one is never the default.
- **A save made on 0.28.2's field** loads and can only be left (the vote) (item 66).
- **The camp reads as a checklist** (item 49): the header lists what to do, each with its state in words (1 FREE
  WEAPON, 2 FREE FOCUS, the BUDGET left, the STARTING BOON). The free picks carry FREE where a price would be. "Not
  sure? Take the recommended kit" comes first; moving on with a free pick not taken asks first.
- **A shield at the camp** (item 50): the Buckler (200 credits) is on the camp's Gear shelf; it goes in the off hand
  beside a one-handed weapon, and is refused in words beside a two-hander or the free focus.
- **The tank's recommended kit** (item 51): a character with Durability on top gets a one-hander, the Buckler and what
  the budget still pays for. Taking a focus with a shield held says how to fix it (item 52); a greyed Recommended button
  shows the engine's reason (item 53).
- **One amount control for giving and selling** (item 54): type the number, or step it by 1, 10 or 100, or MAX; it
  shows what you hold, and the engine says why an amount is refused.
- **Counted items can be sold** (items 55 and 56): stims and Essences are on the shop's Sell list. "Never on a shelf"
  and "never sold" are now two facts in the data.
- **The Essence of Experience** (items 57 to 60): any focus in a hand cracks it, no skill minimum; 100 XP for yourself
  or a friend, one per character per rest, out of a fight. Its price is 600 (sells for 150). Using a counted item (the
  Essence, a stim on a friend) is one action, `gear/use`.

### Fights

- **Bond can pick enemies again**: with a unit pick open, a click on a unit outside its choices shows the engine's reason ("Out of range (6 tiles).") and the action stays picked, instead of turning into a Shot. The same for every reach-narrowed pick (Tending, Shadow, class moves, stims, ally prayers, Pull free).
- **Bonds and Tending have effects** on the fight map (`fx/bonds.ts`): a Bond tied or resisted, a heal down a Bond, a Guide, a Bond breaking. No new engine event.
- **The Durability tank** (rules 1.55 items 71 to 75; Leon: "durability tank is crazy weak"). The Guard technique is
  Durability's own: on the pad with any weapon from Durability 1 (a tank with the camp's rifle could only Brace, once
  until it moved); still learned for a melee weapon without the points. Guard soaks 6 a point (was 10) and the pool
  holds 4 at most (was 5): in Survival stage 1 an all-in tank's Guard now takes 35% of the damage aimed at it beside a
  gunner (9% before), 58% alone (13%).
- **The tank hits through its door** (item 73): while you hold Guard, weapon attacks roll with Durability's modifier in
  place of the weapon's skill when it is higher, never on top: the all-in tank hits 56-59% (39% before; the gunner
  63%). The attack's preview and the gear card say "Hits with: Durability (holding Guard)". The camp's recommended
  one-hander for a tank now hits with Durability while Guard is held.

### Classes

- **Healing costs three times the MP** (item 46): every Tending verb and every Mender move that spends MP is 3x its 0.28.2 price (Mend 24, Shield 30, Settle 15, Soothe 18, Raise 36, Guide 15, Field Surgery 45, Triage 18, Inspire 30, Rally 60). AP, heal sizes and Max MP unchanged. Cards and bar buttons show the MP beside the AP.
- **Syphon through any MP focus** (item 48): a Mender Syphons with the Attuner, in a fight and on the area map; with the focus in the pack the button is greyed and says why. Stowing the Attuner in a fight stops what it gives at once.
- **Syphon has a floor** (item 47): it takes 2 from the mana meter and is refused when the meter can't pay ("The air here is spent: nothing to Syphon."). From a fight's start of 15 that is at most 7 Syphons, shared by the party; deaths raise the meter.

### Fixes

- **Guide works** (item 45): click the ally, then one of the shaded tiles it may step to; a bad tile is refused in words before anything is paid.
- **The field is one flag** (`Combat.field`), read in one place per rule: `combatAction` (no turn order), effects/cost.ts
  `apFor` and `pay` (AP), `endTurn`, `runEnemies` and `checkOver`, `growthHeld` and `harmHeld`. Removed: the field's
  area-map translation, `fieldCombat`, the write-back, `fieldActs`, the field's own use counters and
  `survival.json field.carried_res`. Two replays moved by Syphon's floor were re-recorded.
- **A new general item op, `roll_with`** {skill, if_higher} on the attack (item 75): any item may make an attack roll
  with another skill (one choice, `combat.ts rollWithPick`, read by the roll, the preview and the card). Golden tables
  and replay hashes re-recorded on purpose for the tank (Guard on the pad of every Durability holder, the soak, the
  pool, the roll); the hiding replay's scripted plain gun also goes to ground from its third turn, so the coverage bar
  (2 units to ground) holds.

## 0.28.2 — the field's actions, hand-overs, health words, Figments, the Sigil word cap, and Survival XP pace

A release of fixes from Leon's playtest of 15 Nov 2026 (rules 1.55 items 27 to 44, every number PROVISIONAL): Survival XP
(items 27 and 28), the health word (item 29), hand-overs and the field's actions (items 30 to 36, and the lead's rulings
on the review, items 37 to 42; the token chip and the field token, items 43 and 44), Figments shown, and the Sigil words. **Live since 15 Nov 2026**.

### Survival

- **Survival XP pace.** Every stage-1 fight now pays 35 XP (an Elite or the gate about 52, the Boss 175), the same
  at every stop (was 10 plus 2 a stop). A character is usually level 2 around stops 5 to 7 and level 3 by the first
  Boss. The measure is in `docs/design/proposals/2026-11-xp-fit-0.29.md`.
- **Hand things over anywhere out of a fight.** On the path map, at every place, on the field and at the rewards you
  can give any item in your pack to a friend, one or the whole stack, from the backpack ("Give to …"). Stims count:
  you can give them like any item. Credits are still given only at the stops with no fight, as before.
- **Stim a friend on the map.** A stim can be used on a friend (or yourself) without a fight: from the backpack ("Stim
  …") or a place's Give tab. It is the fight's own stim: a Downed friend gets up at 1 HP, anyone else is healed.
- **Give from the path map's right panel**, with the stepper for how many; the backpack's Give has the stepper too.
- **Counted items (stims, the Essence) are named in the data** (`counted` in items.json), not in the code.
- **The field after a fight has your actions.** Walking the field you can reload (speed or tactical), load magazines,
  clear a jam, repair, stim a friend next to you, vent, swap a core, Syphon, Crystallise, pray, and use your perks' and
  class moves' actions, paying what they cost; AP never runs out there. What you spent once a fight stays spent, a
  Hymn's wait does not count down, and an action that would heal or give something for AP alone again and again waits
  for a fight (the field says so). What a fight's end clears (Strain, a held Outburst, conditions, Flux) is cleared
  again when you leave the field.
- **The field has the fight's action bar.** Walking the field you get the fight screen's own action bar and cards,
  with their targets and tile picks: draw and Evoke, Begin, Pump and Release with a design, prayers, moves aimed at a
  friend, reload, items. The field's refusals show on the card. The short strip in the header is gone.
- **Nothing grows on the field.** Syphon and Crystallise still work, but practice, study, word uses, new feelings,
  Devotion XP, drill and deeds come only from a real fight.
- **Nothing harms a friend on the field.** A spell or a thrown thing that would hurt a friend is refused, as an attack
  is.
- **An old save on the field** counts every once-a-fight action as spent there.

### Fights

- **An un-Analyzed foe shows a health word, not a bar** (rules 1.55 item 29; Leon's playtest: "the hp bar does not
  goes down", and his ruling "put the word HURT there instead of % HP"). The bar drew unhurt / wounded / badly hurt as
  100 / 66 / 33%, so it stood still from half HP to 1 and the shot before the kill looked eaten. Now one word of a
  five-rung ladder in data (`rules.json combat.health_look`, provisional): UNHURT, SCRATCHED, HURT, BADLY HURT,
  NEAR DEATH, as a chip on the token, the turn strip and the target card, no bar, no number. The engine's `healthView`
  works it out. Analyzed foes and the squad unchanged.
- **Speaking in a Survival fight never locks the turn.** A run has no Narrator, but Attempt (1 AP) let the words through
  and the fight waited for an answer that could never come, End turn included. Now Say is said for everyone as before,
  and Attempt (and every perk that asks for words) is off with the reason "No Narrator in this mode: say it, but nobody
  rules on an attempt." A ruling left waiting with no Narrator to answer it (a run, the Narrator gone or away) is given
  back at the next action, so End turn always works; a save already stuck frees itself the same way.
- **A Line past your Max Sigil words now says why.** Drawing a glyph that would make a Line longer than your Max Sigil
  words says how long the Line would be, your Max Sigil words at your Intelligence, and which Intelligence raises it
  (nothing about raising it at the top). The key's short hint says the same: "2 words max; Intelligence 3 gives 3".
- **new Line warns what fades.** When starting a new Line would fade your oldest glyph (your cap of glyphs on the
  ground), the button says so before the click: "new Line · fades FIRE".
- **Tending shows its healing.** A Bond does not heal by itself (rules 1.33: Tending heals, ×1.2 through a Bond); the
  engine healed, but nothing showed it. Every heal and shield from data (Mend, Mend Yourself, Touch, Shield, Raise, and
  every other item's `mend`) now plays the heal number over the token and says it in the log ("Medic mends Gun · Gun
  heals 34"); the Bond card says what a Bond does and what heals, solo through an enemy Bond too, and no longer says
  "The Narrator decides the rest" (Bond, Let Go, Guide are the engine's); the echo's line names the Bonded enemies
  instead of the healer.
- **The health word on a map token** (rules 1.55 item 43): the chip sits on the token's bottom edge, centred, one line,
  and never runs under a kind badge (the badge sits above it, lifted off the edge; "UNH BOT T" is gone). An unhurt foe
  shows no chip on the map (the target card and the turn strip still say UNHURT), so a chip means "hurt". Two hurt foes
  side by side whose words would run together show the short words (SCR, HURT, BAD, DYING: `short` in
  `rules.json combat.health_look`, provisional).
- **A stim on the field shows on the token** (rules 1.55 item 44): the friend's token on the field kept the old HP after
  a stim; every field action now refreshes the squad's tokens from the characters (HP, conditions, shields, MP).
- **Small words:** "1 AP per 1 tile", "Out of reach (1 tile from Hound)"; the sheet's level-up button says "pick a perk"
  when a perk step is all that is due (a level 1 character with a skill at Mastery 1 from creation), not "spend points".

### Figments

- **Figments move and show** (Leon's playtest: "feels like it's just standing there doing nothing"). Picturing one plays
  on the caster first (a wind-up ring and a gesture), a thread of light runs to the tile, then the Figment forms (lines
  drawing in, a ring closing, its glyph, its token flickering up); an order is the caster's pulse and a thread, then the
  usual lunge, hit or MISS with the Figment's afterimages and its glyph on the target; Let go, unravelling or a destroyed
  one comes apart and streams back to its maker; a held Figment's token shimmers (off under Reduce motion). Effects only
  (`apps/web/src/game/fx/figments.ts`), from the engine's existing spawn, attack and unmake events.
- **Every Figment has its own icon** (Leon's playtest: "there isn't even a special icon for each summon"). Seven
  monoline line icons (`art/icons/figments/`, catalogue `figment_icons`): the Double, the Eye, the Wall, the Beast, the
  Blade, the Scrap Turret and Picture, each named by its row's `icon` in `data/figments.json`. A Figment's map token, its
  group header and the target and turn cards draw it (on a dark plate) where a portrait would be; Picture's chips, the
  summon and strike effects (in place of the text glyph) and a fight log line naming a Figment show it too. The painted
  portraits are still wanted (ART-REQUESTS C6). `tools/validate_art.py` checks every row has one and every icon keeps the
  line rule.
- **What Visualization opens is shown** ("no unlocks, no nothing"). The MAGIC tab has a FIGMENTS section: every step of
  the ladder, open or locked with the Visualization it needs, the latest step as NEW with its forms' icons, and the next
  one locked; the level-up card of Visualization says "NEW · FIGMENTS AT VISUALIZATION 3: Eye, Wall" with the icons when
  a point reaches a step, else the next step, locked. From the engine's new `figmentLadderView`.
- **Figment designs can be made** (the engine had `figments/design`; the screen never sent it). The FIGMENTS section keeps
  your designs (form icon, traits, charge) with Edit and Drop, and a small editor: a name, a form (locked ones greyed with
  the engine's reason), its traits (refused past what a design may carry, with the reason), the charge it will take, and
  Keep. Every option and refusal is the engine's `figmentDesignView` (its `draftWhy` is the reducer's own check; the room
  check is one function, `designRoomWhy`, for both). In a fight, Picture offers the ready designs first, each with its
  form's icon.

### Fixes

- **A held hit says 0 damage.** A roll that a protection holds at its floor (a Burst's later rolls at an Elite or Boss the
  guard already left on 1 HP, Hold the Gate, the Toll Keeper) reported the roll's own number ("63834 damage · no damage")
  in the log and on the shot's floating number while the target lost nothing; it now reports 0 (`effects/damage.ts`).
  Test: `packages/engine/test/last-shot-0283.test.ts` (a real Burst through the reducer).

## 0.28.1 — the camp sorted out, the field after a fight, magazines

The playtest fixes of 15 Nov 2026 (rules 1.55, every number PROVISIONAL). **Live since 15 Nov 2026**.

- **The camp and the shops offer what you can use.** Nothing at the camp costs more than the camp budget (the foci and
  Medium armour are gone from it); "another one" of a weapon only for a one-hander you can dual-wield, never a second
  focus or a second two-hander; rounds, special rounds and cores are listed only for a gun or focus you carry, and the
  shop's counter is your own; no line twice.
- **Magazines.** A Magazines shelf at the camp and on every shop counter: a full or an empty magazine for each
  magazine-fed gun you carry. An empty one is filled from loose rounds out of a fight, so speed reloads have spares.
- **Casters start with 4 cores** (was 1) with an Evoker or a Visualizer, free, so the 300 budget is not spent on cores.
- **The field after a fight.** A won Survival fight leaves the squad on the map: walk it, open doors and pick up what
  lies there (dropped magazines, thrown weapons, materials), then everyone marks **Leave the field** (or the host closes
  it) and the rewards come. A fallen character stands up at 1 HP. The pay is the same, given as the fight is won.
- **Throw and Pull Out.** Every melee weapon with the Thrown property offers Throw; the hatchet gives Drag instead. A
  weapon stuck in someone is drawn on its token, outlined in the thrower's colour, and named in its hover line.
- **Weapon mods are fitted at the Forge**, for a fee (a fifth of the mod's price, at least 25 credits), in a run; a swap
  puts the old mod in the pack. Mods the engine does not run yet (the foregrip, the wrapped grip, the underslung
  launcher, the sigil-etched magazine, the pavise) are no longer sold anywhere.
- **Weapon cards say what a weapon hits with.** Every card that shows a weapon's or a focus's numbers (the camp, the
  shop, the Forge, the reward, the sheet, the hover cards) names the skill you aim it with and your modifier
  ("Hits with: Dexterity · +3"); a magazine reads "30 · .32 Decrkm".
- **The artist's new art is in.** 66 new images: gear and boon icons, the path map's markers, the keepers' portraits,
  the places' backdrops, the signs on the fight cards and the Roguelike card in the lobby.
- **Loot is scarce now.** No free magazines after a fight (casters still get their burnt cores and MP back); the camp's
  free gun has two spare magazines; an ordinary fight offers a weapon card only about one time in five (Elites, Bosses,
  the vault and caches always do), better grades are rarer, mana residue is scarce, and foes leave little on the
  ground. A gun you pick or buy comes loaded, with a spare magazine.
- **The camp and the places are laid out again.** The camp's budget bar stays at the top; each family is only as wide as its
  cards, and they wrap to fill the width; the path map fits its box. Every place (the camp, the shop, each place, the rewards, the stage's end) keeps its
  header in sight as you scroll, with the money and the button that moves on. On the GEAR tab every section folds, the
  Backpack comes first and opens large over the middle (both side panels stay), and Make is one compact row a recipe.

Left out, for 0.29:
- **Pull Out** is still listed on every melee pad (using it with nothing stuck is refused in words), and its button does
  not name the weapon: that needs a new technique-availability field, waiting on the lead's approval.
- **Pull Out in a browser room**: in one e2e run the stuck mark stayed after Pull Out in the room, though the engine's
  path clears it; not yet investigated.
- The extra mod slot of Gun Nut, Blade Recluse and Overhaul is still fitted free; mods fit to the main-hand weapon only.
- The mods that pass the guns' 145% ceiling (the red dot on the Frontier hand cannon, the Brigade auto-shotgun's red dot
  and extended magazine) were measured, not changed: their numbers move into data in 0.29.
- After the field is left, the victory card comes back once more ("Back to the map ›"), on purpose for co-op.

## 0.28.0 — materials, making, a slower climb and the side panels back

Survival's second pass, on Leon's 14 Nov rulings (rules 1.54; `docs/design/survival-spec.md` section 14). **Live since 15 Nov 2026**. Every number is provisional but the core's 100 credits.

- **The side panels in every mode.** The character sheet stays on the left and a right panel stays on the right in
  every mode, Survival included; the mode plays in the middle. In Survival every screen (the path map, the camp, the
  shop, the Forge, every place, the rewards, the stage screen) is in the middle; the right panel holds the mana forecast,
  the run, the run board and the squad (no area map, no quest board), with the one control for what is yours to do
  next (Ready, Leave the shop, To the path map, Go now, To the fight). Icons on the path map are larger.
- **Materials and making.** Survival's foes no longer drop their guns: a gunner leaves gunpowder and casings, a caster
  or a machine leaves mana residue. After a fight each character picks **Materials** (gunpowder, casings and mana
  residue together) or **One weapon**; "credits instead" is gone. The **ammo maker** (a tool, always on the shop's
  counter, and found as loot) makes every calibre and the three special rounds from gunpowder and casings, at the
  shop's price, between fights and for free. Making is never cheaper than buying: it is ammunition where there is no
  shop.
- **The mana core costs 100 credits** (was 150), and **ten mana residue with any focus in hand make one**. The core
  charge's round and enhanced rounds cost 10 (was 15).
- **Levels come slower.** A run's first stage is played before the class: level 2 at the gate, level 3 from the first
  Boss, then about two levels a stage. A squad of four's fights were eased to match.
- **Trainings give more.** A rest's small training: drill 200, study 5, practice 8, Devotion 4 XP. The training ground:
  drill 400, study 10, practice 15. The shrine's rite gives 10 Devotion XP.
- **The skill road map.** Creation's skill cards, the "?" text and level-up show each skill as rows tied to points:
  what you have, what the next point gives, and what is further on. Will Power's wall of text is ten short rows.
- **The fight cards.** A fight opens with FIGHT and who goes first, and ends with VICTORY or DEFEAT; in Survival the
  end card says what comes next.
- **The title screen comes up at once;** its art loads behind it (the loading screen is gone).
- **Survival's music:** the camp, the path map (a track for each setting), the shop, the Forge, the rest and the boon
  pick each have their own track; fights keep theirs.
- **What a trait gives is not sold in the shop** (food and drink excepted), and the Essence of Experience is neither
  sold nor dropped by a Survival Boss.
- **Fixes:** a host can no longer take a free long rest between nodes in a run (a run rests only at a Rest); at the
  camp the sheet's gear is read-only and says why; the mouse wheel scrolls the trait list when it is over a card;
  Will Power's Pump sentence is written once.

Known and left open: in a run fight a red "refused" toast can show when the narrator readies (store.ts); the music's
"Now playing" card can sit over the left sheet for 30 s after a fight; the header's Area map button still shows in a
run; the browser suites survival.mjs and kit-map.mjs still click "credits instead" and were not run; the sheet's pop-up
still shows the Essence of Experience as selling for 300; the sheet's skill pop-up lights no row (it is given no
points); hovering a skill does not open its road map ("?" or the portrait does); a solo gunner on one seed clears stage
4 (the guard was not refitted); level 3 comes before the first Boss on 42% of most-fights routes, not on every one; a
party of three is not measured; the Crossroads' trades are not scaled with the trainings; no screen draws the training
bar yet; most of a skill's per-point numbers are still also written in engine code; the Proving Ground has no fight
cards and an Extraction no end card; Survival's fight tracks are not delivered; the canvas boards are not rebuilt; the
crossfade between screens is not checked in a browser.

## 0.27.3 — a hit no longer says MISS

A fix, and the every-weapon effects work it came with.

- **The stray "MISS" is gone.** Since 0.27.0 every plain ranged hit also showed the word MISS and played a near-miss whiz (the enchanted arrow's line had broken the hit / cover / miss chain in the effects). A hit is a hit again.
- **Every weapon's effects come from data.** Each weapon belongs to an effects family (its sound, its projectile, what it ejects, its mark) in `data/rules.json` `weapons_rules.fx`, with a weapon's own `fx` on top; 52 per-weapon cases left the code. A machine-built table plays every weapon through every way it can attack, hit and miss (`docs/design/handoffs/weapon-fx-table.md`: 1,552 rows, 0 failing).
- **Their own sound and projectile:** the bows, the crossbow, the rocket launcher, the grenade launcher, the flamer and the core rifle. New sounds are CC0 and credited.
- **The checks and the browser suites run on Windows** (the tools only; nothing in the game).

Known and left open: the grenade launcher's thump is a stand-in sample; the flamer draws one gout per unit caught; a flamer that hits a crate or is stopped by cover sparks like a bullet; the core rifle ejects its spent charge; Heavy Bolt's streak is yellowish; aim is a ring.

## 0.27.2 — the camp: your loadout and a starting boon

Built beside 0.27.0 and shipped after it (its detailed lines are in the 0.27.0 entry below, where its builders wrote them).

- **Characters are made without a kit.** Creation ends at the character; what they carry is given by the mode. Old drafts and saves that hold a kit keep it. Campaigns and the Proving Ground give the old default kit.
- **The Survival camp, one screen:** pick ONE free weapon (the most basic of each weapon archetype) and one free focus, then buy anything else from the shop's own menu out of a 300-credit budget; what you do not spend is your purse. Beside each free weapon the rack offers the same one again (to dual wield) and the next one up. Ammunition and cores are for sale there.
- **A starting boon:** each character picks one of three, offered by what they can actually use.
- **The supply pack:** after a fight, spare cores burnt come back and casters regain part of their MP, as gunners get rounds.
- Caster boons join the Boss pool; Bandolier doubles magazines only; a new boon doubles cores and MP.

Known and left for Balance 2.0: a solo Channeler or Sigilist clears stage 1 about 3 times in 12 (a solo gunner 9); a duo on the training route runs past stage 4.

## 0.27.1 — the shooting effects restored

A hotfix (Leon, 14 Nov 2026: "i told you to remove the yellow line not the bullet effect").

- **The bullet in flight is back,** exactly as it was before the 13 Nov effects cleanup, with its timing against sound, casings and damage numbers.
- **Techniques keep their own effects:** Heavy Bolt, Punch Through, Dead Centre, Rake, Mag Dump, Flush Arc and every technique's hit parts are restored.
- **One shot per round fired, heard and seen:** a Burst is three shots, a Mag Dump as many as it spends. No canned burst or full-auto recording plays any more.
- **Only four things stay removed,** as Leon first asked: the yellow tracer lines, the melee swing arc, the shot-miss effect and the melee-miss effect. A bullet hole marks each round that hit.
- The aim effect stays a ring on the target: its old form was the yellow line itself.

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
- **Gear by mode (rules 1.52; Leon, 14 Nov).** Character creation no longer picks a kit (the Kit step is gone; its
  techniques and starting magic are the **Moves** step): a character is a person, and the mode gives what it carries
  when play starts. A campaign gives a fixed loadout (the old kit by your door skill); the Proving Ground gives the same
  to a bare character. Old drafts and saves that carry a kit keep it.
- **The camp (rules 1.51, 1.52; Leon: "if caster keep getting wreck, we should give them some boons", and his loadout
  and weapon-rack rulings).** A run opens at the camp, one full screen in three steps. **The loadout:** ONE free weapon,
  the most basic of each of nine archetypes (knives and light blades, heavy blades, fist weapons, pistols, revolvers,
  submachine guns, rifles, shotguns, bows); the **rack** beside it holds the same weapon again and the next one up, with
  its numbers against the free one; ONE free focus or none; and a budget of **300 credits** (Leon's "like 200", raised
  after the measure: a call) spent at the shop's prices on armour, ammunition, cores and supplies. Anything bought goes
  back at full price before Ready; what is not spent is your purse. **The starting boon:** three cards offered by what
  your loadout holds (a Sigil caster Sigil boons, a rifleman gun boons…), small (4 to 6 of the run's 50), and every card
  one you can use. **Ready** (the host can start for an away player, who gets the Recommended loadout and the first
  card). No armour is free: it is bought. Seven **caster boons** join the Boss's pick (Ward of Script, Long Hand, Sure
  Script, Steady Heart, Deep Reserve, Mercy's Return, Deep Satchel). The fight's ammunition pack is now a **supply
  pack**: the spare cores you burnt come back, an Emanator or Attuner gets 30% of its max MP, Flux is 0 at every
  fight's start and a Rest fills the loaded core. Held boons show on the path map's squad panel ("Camp" on the starting
  one). Deep Well and the Gentle property now strengthen heals given to anyone, as they say; Shelter now works on prayer
  heals. A solo run's fights are a little lighter (the solo pressure 1.3). The measure: `survival-starting-boons.md`,
  `survival-loadout.md` and rules 1.52 item 3916.
- **The browser suite `survival`** walks all of it, two browsers included.
- **Effects: the bullet in flight is back; the yellow tracer lines stay removed** (Leon, 14 Nov: the 13 Nov cleanup took the bullet's own flight along with the tracer lines). Every round fired flies from the muzzle to where it lands as before, hit or miss (a shotgun shell as its five pellets, an arrow as its shaft); a hit still leaves its hole, a miss no dust.
- **Effects: only the four go** (Leon, 14 Nov): the cleanup was to take the tracer lines, the swing arc and the two miss effects and add the bullet hole, nothing more. Every technique's own effect is back (Heavy Bolt's, Punch Through's and Dead Centre's heavy round, Rake's and Mag Dump's cone, Flush's arc, their hit marks) with the hole on a hit; the sights stay a ring on the target. **Every round fired is heard**: one single gunshot a round, a Burst three, a Mag Dump as many as it spends, no recorded burst or automatic fire.
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
