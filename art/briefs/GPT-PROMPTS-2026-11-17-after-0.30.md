# GPT prompts, 17 Nov 2026: everything else the game shows without finished art (after the 0.30 list)

For the artist, and for GPT. Leon, 17 Nov 2026: *"he's moving to some 0.30 request now at 5406ede0. Integrate them, and on the way request anything without art beyond the 0.30 in mention."*

This file is the inventory of **what a player sees on live 0.31.1 with no finished art, that neither the 0.29 list nor the 0.30 list asks for**. The 0.29 list (`GPT-PROMPTS-2026-11-16-nine-doors.md`) is delivered (348 of 375, merged in 0.31.x); the **0.30 list (41 pictures: the 32 fork icons, Stand Behind Me, Wind-up, Read the Swing, Hold the Lane, Scrap Sentinel, Follow, Afterword, Mana Shock, Staggered) is the artist's current job and is NOT repeated here**: it is in `art/_archive/nine-doors/2026-11-16/CONTINUE-0.30.md`, with `art/briefs/placeholders-2026-11-16-forks.json` and `placeholders-2026-11-16-follow.json` for the placeholders in the game. Nothing here is a future weapon form (Items 2.0 is not ruled) and nothing is built-not-yet (Stalk).

It was found by reading every data row a screen draws (`data/*.json`: weapons, items, mods, conditions, techniques, perks, traits, prayers, forks, Figment forms, orders and traits, Shadow and Tending verbs, boons, node kinds, enemies, patrons, classes, modes, campaigns, trades, hazards, objects) against `art/catalog.json`, the built asset map (`apps/web/src/game/assets.json`) and the client's lookups (`docs/ART-INTEGRATION.md`; `gearIcons.ts`, `faithArt.ts`, `boonIcons.ts`, `runIcons.ts`, `turnIntro.tsx`, `statusStrip.ts`, `worldView.ts`, `PlaceScreen.tsx`). **Most of the game is covered**: every weapon, item, armour piece, magazine, calibre of rounds, perk, trait, call, feeling, module, boon, node kind, foe face, shopkeeper, patron, Figment form and every Wick order is painted or inked. What is left is small marks that the client draws as text glyphs or leaves blank. Every picture below is **invented here**: change any of them freely, as long as each stays distinct at 32 px from its neighbours.

**54 images, all in the game now, none designed-but-unbuilt:** 43 white-ink signs and 11 Wick icons. 10 of the 54 are lower priority (resource and tone marks; the game reads fine without them).

## Counts

| Kind (mode, size) | Count |
| --- | --- |
| white-ink sign (1024 x 1024 PNG, transparent) | 43 |
| Wick icon (1024 x 1024 PNG, transparent) | 11 |
| **All** | **54** |

| Section | Count |
| --- | --- |
| Fight screen marks: the status strip and the FREE ROAM banner | 4 |
| Conditions the 0.29 list and the 0.30 list do not ask for | 8 |
| The fight map: hazards and Sigil zones | 8 |
| Survival: the place cards that show no picture | 12 |
| Faith: the vows and Witnessed | 7 |
| Tending and Bonds: the passives with no picture | 5 |
| Marks for resources and tones (lower priority) | 10 |
| **All** | **54** |

## Painting order (what a player sees most, first)

1. **The fight screen's marks** (section 1): the three status-strip group marks and the FREE ROAM banner mark. Seen in every fight of every mode.
2. **The eight conditions** (section 2), including the three the integration notes asked for (Left and Right Brain Debuff, Swinging).
3. **Hazards and Sigil zones on the map** (section 3).
4. **Survival's place cards with no picture** (section 4): the training, shrine and Crossroads cards.
5. **The six vows and Witnessed** (section 5), then **the five Tending passives** (section 6).
6. **Resources and tones** (section 7), last: optional.

## Read this first

- **One image a prompt.** For each row, paste **the base prompt of its mode (below), then the row's "Paint" text, then "Avoid: " and the row's "Avoid" text**, and attach the references the mode names. That is the ready-to-paste prompt.
- **Names.** Each row gives the **catalog map and id the game will look up** and the **file name to save**. Do not rename. Nothing here has a catalog entry yet: **Claude adds the entries on intake** (the map named in the row; `place_icons` is a new map), runs `python3 tools/rehash_art_checksums.py`, `python3 tools/validate_art.py` and `npm run assets`. A screen slot is a code change (see "For the builder"): until it lands the game keeps the text glyph or the blank it shows today.
- **Review.** Every delivery is a review candidate until Leon approves it. Deliver on a branch `art/after-0.30-2026-11-17` with one contact sheet per section, every sign checked at 16, 24 and 48 px on `#10151F`.
- **In-world only.** Everything is invented: no real-world brands, insignia, religions, makes, films or characters (no radiation trefoil, no cross, crescent or star of any real faith, no currency symbol; a medical mark is a plain plus, never a red cross); no text, letters or numbers in any image. Lore: `docs/lore/`.
- **Inks.** Wick icons and signs are **pure white** (the game tints them as a mask in the ink of their group: a hazard's own ink, a state's colour, a door's `ui_ink` from `art/style-guide/palette.json`). Only painted gear icons and portraits carry colour; none is asked for here.

## The base prompts, one per art mode

### Wick icon (the vows, the Tending passives)

**Attach:** `art/icons/traits/mind-without-fog.png` (the master), three of `art/icons/perks/*.png` (the line weight), and two of `art/icons/prayers/whisper-*.png` for the vows or `art/icons/tending/bond.png` and `tug.png` for Tending. Rule: `art/icons/STYLE-LOCK.md`.

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached reference icons: Wick, the small flame-headed figure of the trait and perk icons, in bold flat white shapes, a confident inked silhouette with a few interior cuts, the same line weight. No outline in another colour, no shading, no gradient, no texture, no glow, no colour and no grey. Wick is the only full figure; anyone else is a partial (a hand, a shoulder, a silhouette cut by the frame). One action, centred, with clear space around it, square, 1024 x 1024 PNG with transparency. It must read at 32 px in a row and at 44 px on a chip: silhouette first, two or three interior cuts at most. No text, no letters, no numbers, no border, no frame. Invented shapes only: nothing recognisable from real-world works, brands, insignia or religions (a medical mark is a plain plus, never a red cross). The icon shows:

### White-ink sign (status marks, conditions, hazards, zones, place cards, Witnessed, resources, tones)

**Attach:** `art/icons/traits/mind-without-fog.png`, `art/icons/survival/markers/shop.png`, `art/icons/boons/edge.png`, and the family's nearest delivered neighbours: for section 1 `art/icons/banners/fight-start.png`, `fight-won.png` and `fight-lost.png`; for section 2 three of `art/icons/conditions/*.png`; for sections 3 and 4 `art/icons/survival/markers/*.png`.

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached reference icons (bold flat white shapes, a confident inked silhouette with a few interior cuts, the same line weight). No outline in another colour, no shading, no gradient, no texture, no glow, no colour and no grey. This icon is a sign, not a scene: Wick does not appear; a small generic silhouette may. One subject, centred, with clear space around it, square, 1024 x 1024 PNG with transparency. It must read at 16 px in a tile corner or beside a word and at 48 px on a card: silhouette first, two interior cuts at most. No text, no letters, no numbers, no border, no frame. Invented shapes only. The icon shows:

## 1. Fight screen marks: the status strip and the FREE ROAM banner

**Where:** the fight screen of every mode. The status strip pinned under HP (0.31.0: `apps/web/src/game/statusStrip.ts` `SIDE_GLYPH`) groups a unit's conditions as HELPING, HURTING and neutral states and heads each group with a text glyph (a triangle up, a triangle down, a diamond); the FREE ROAM banner (0.31.0, `turnIntro.tsx fieldCard`) shows a text glyph where BATTLE START, VICTORY and DEFEAT show their delivered flash marks (`banner-fight-start`, `-won`, `-lost`). Each is read at 14 to 24 px, so the silhouette is all there is: one shape, one cut.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | `interface_icons` `icon-status-helps` | `art/icons/status/helps.png` | Status: helping | white-ink sign | in game now (a text glyph, triangle up) | The group mark of every condition that helps you, on the status strip under HP, the token hover card and the log chip | A short wedge pointing up, standing on a flat bar; the wedge solid, the bar a little wider than its base. | an arrow with a plus sign (a medical mark is a plain plus only) · a laurel · a medal |
| 2 | `interface_icons` `icon-status-hurts` | `art/icons/status/hurts.png` | Status: hurting | white-ink sign | in game now (a text glyph, triangle down) | The group mark of every condition that hurts you | A short wedge pointing down with its tip chipped, hanging from a flat bar; the same size and weight as the helping mark, so the pair reads as a mirror. | a skull · a drip of blood · an arrow with a minus sign |
| 3 | `interface_icons` `icon-status-state` | `art/icons/status/state.png` | Status: a state | white-ink sign | in game now (a text glyph, diamond) | The group mark of the neutral states (Felt, Free move spent and the like) | A solid diamond with one small round hole at its centre, a hair of space round it. | a gem with facets · a question mark |
| 4 | `interface_icons` `banner-fight-field` | `art/icons/banners/fight-field.png` | Free roam (flash mark) | white-ink sign | in game now (a text glyph, a looping arrow) | The FREE ROAM banner after a won Survival fight, when the party has three free rounds on the cleared field | An open ring (the cleared field) with two small footprints crossing it and one short curved arrow looping back to the first print; the three flash marks of the family (start, won, lost) are the references. | a compass · a map pin · a flag · any text |

## 2. Conditions the 0.29 list and the 0.30 list do not ask for

**Where:** the condition chips on tokens, the hover card, the status strip and the log (`data/conditions.json`, catalog `condition_icons`). The family and its rules are those of the nine-doors file's conditions section: pure white flat ink, no Wick, no glow, readable at 24 px beside a word. **Pair:** Left and Right Brain Debuff must read apart at 24 px (exact mirror images). The 46 `given_*` and `foe_*` feeling states (Given Rage, Felt Grief and so on) are not on this list on purpose: see "Left off" at the end.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 5 | `condition_icons` `cond-left-brain-debuff` | `art/icons/conditions/left-brain-debuff.png` | Left Brain Debuff | white-ink sign | in game now (no sign, no slot yet) | A debuff of the brain family, 2 rounds: a penalty on Mind checks, and drawing a glyph or Evoking costs more AP | A brain in profile with its left half cut away by a single clean slash. | a lightning bolt · a skull · a head with a gear in it |
| 6 | `condition_icons` `cond-right-brain-debuff` | `art/icons/conditions/right-brain-debuff.png` | Right Brain Debuff | white-ink sign | in game now (no sign, no slot yet) | The mirror debuff, 2 rounds: a penalty on Expression and Soul checks, and Soul spells cost more MP | The same brain in profile with its right half cut away. | a different brain (it must be the exact mirror of the left one) · a heart |
| 7 | `condition_icons` `cond-swinging` | `art/icons/conditions/swinging.png` | Swinging | white-ink sign | in game now (no sign, no slot yet) | A state that helps, 2 rounds: after a Finisher drops its foe, the next Strike or Opener is cheaper in Momentum (Keep Swinging, rules 1.60 R7) | A blade still travelling on a long follow-through arc, the arc running round to meet its own start. | a pendulum · a clock · a swing set |
| 8 | `condition_icons` `cond-ground` | `art/icons/conditions/ground.png` | Ground | white-ink sign | in game now (no sign, no slot yet) | A debuff, 2 rounds: a Grindstone fighter ground it down; its next plain melee hit on the fighter builds them one more Momentum | A heavy round grindstone half sunk into a ground line, one short crack across its face. | a gear (that is machinery) · flying sparks · a mill building |
| 9 | `condition_icons` `cond-in-your-sights` | `art/icons/conditions/in-your-sights.png` | In Their Sights | white-ink sign | in game now (no sign, no slot yet) | A debuff on you, 1 round: a Converging Fire gunner hit you, so the next ranged hit on you from one of their allies adds a Pressure | A round sight ring open at its top, one thin line entering the gap from the upper right. | a full crosshair over a head · a scope glint · a bullseye |
| 10 | `condition_icons` `cond-free-move-spent` | `art/icons/conditions/free-move-spent.png` | Free move spent | white-ink sign | in game now (no sign, no slot yet) | A state, until the turn ends: this turn's Fire and Move step has been taken | One footprint with a short flat bar laid across its toe, like a step already counted. | a forbidden sign · a lock · a tick mark |
| 11 | `condition_icons` `cond-given-mark` | `art/icons/conditions/given-mark.png` | Felt (a feeling was given to you) | white-ink sign | in game now (no sign, no slot yet) | A state, 1 round: a feeling was given to you through a Bond this round, so no other can be given until it ends | A small solid heart-knot (the Outburst family mark, as on the feeling glyphs) with one short curved arrow arriving at it from outside the frame. | a heart emoji · a medical plus · a gift box |
| 12 | `condition_icons` `cond-given-edge` | `art/icons/conditions/given-edge.png` | Given Edge | white-ink sign | in game now (no sign, no slot yet) | A state that helps, until your next roll to hit lands: a bonus on it (a Bond hands it over) | One blade edge drawn as a single bright line, a short thread of three dots leading into its hilt from outside the frame. | crossed swords · a whetstone · sparkle effects |

## 3. The fight map: hazards and Sigil zones

**Where:** the combat map. A world hazard tile (`data/world_play.json` hazards) is a tinted hatched layer in the kind's ink with a **text glyph** and its word (`worldView.ts HAZARD_LOOK`); a placed Sigil zone carries a **text badge** (`sigilView.ts`: a boxed grid, an hourglass, a triangle). Each sign sits in a tile corner at about 16 px, tinted by the game in the hazard's or the Sigil ink, so it must be one bold silhouette.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 13 | `interface_icons` `icon-hazard-minefield` | `art/icons/world/hazard-minefield.png` | Minefield (hazard mark) | white-ink sign | in game now (a text glyph, an asterisk) | Hazard tile: a buried minefield; stepping on it can set one off | Three half-buried round pressure plates in a row, each with one small stud. | a skull and crossbones · a real-world warning triangle · a cartoon bomb |
| 14 | `interface_icons` `icon-hazard-fire` | `art/icons/world/hazard-fire.png` | Fire (hazard mark) | white-ink sign | in game now (a text glyph, hot springs) | Hazard tile: fire burns on it | A low flame of three tongues, the middle one tallest, sitting on a ground line. | a match · a campfire with logs · a fire emoji |
| 15 | `interface_icons` `icon-hazard-radiation` | `art/icons/world/hazard-radiation.png` | Radiation (hazard mark) | white-ink sign | in game now (a text glyph, a trefoil-like symbol) | Hazard tile: a poisoned patch that harms over time | A small pulsing core: two concentric rings, the outer one broken in three places, short rays between the gaps, on a ground line. | the three-bladed radiation trefoil or any real-world warning insignia · a biohazard mark · a skull |
| 16 | `interface_icons` `icon-hazard-gas` | `art/icons/world/hazard-gas.png` | Gas (hazard mark) | white-ink sign | in game now (a text glyph, three waves) | Hazard tile: a drifting gas cloud | Three wavy lines rising from a low, bulbous cloud edge. | a gas mask · a skull · a steam kettle |
| 17 | `interface_icons` `icon-hazard-collapse` | `art/icons/world/hazard-collapse.png` | Collapse (hazard mark) | white-ink sign | in game now (a text glyph, a down triangle) | Hazard tile: unstable ground that gives way | A ledge breaking along a jagged crack, three small blocks dropping away beneath it. | a building falling · dust clouds · a skull |
| 18 | `interface_icons` `icon-zone-field` | `art/icons/world/zone-field.png` | Sigil field (zone mark) | white-ink sign | in game now (a text badge, a boxed grid) | A Sigil that laid a field on the ground (a region that acts on whoever stands in it) | A square marked by four corner ticks with one single diagonal stroke across it, the stroke ending in a small dot. | a letter or rune · a checkerboard · a crosshair |
| 19 | `interface_icons` `icon-zone-trap` | `art/icons/world/zone-trap.png` | Sigil trap (zone mark) | white-ink sign | in game now (a text badge, an hourglass) | A Sigil that set a trap on a tile (it springs when someone steps on it) | Two short pegs with a taut line between them and one small snap-arc at the line's middle. | a bear trap with teeth · a mousetrap · an hourglass |
| 20 | `interface_icons` `icon-zone-turret` | `art/icons/world/zone-turret.png` | Sigil turret (zone mark) | white-ink sign | in game now (a text badge, a triangle) | A Sigil turret: a standing mount that fires a set number of rounds | A short pillar with a single forward wedge on its head, three small rounds in a row beneath it. | a gun tower · a tank · a real turret make |

## 4. Survival: the place cards that show no picture

**Where:** Survival's full-screen places (`PlaceScreen.tsx`, `ChoiceCard`). A card draws a picture only when its option is an item (a grade step, a mod, a weapon); the training grounds' options, the shrine's three offers and the Crossroads' six trades are cards with **no picture at all**, beside cards that have one (rules 1.54). Each sign is shown at 64 px in a 72 px box at the card's top left, white on the card's dark ground. Drill uses the weapon's own picture and is not asked for. Names are the card's own words.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 21 | `place_icons` `place-study` | `art/icons/places/study.png` | Study (training card) | white-ink sign | in game now (a card with no picture) | Training ground and rest: "Study +N", progress toward the next Sigil word | A flat slate tile with one line of three short strokes scratched across it, a small lamp flame above its corner. | an open book with text · a graduation cap · letters |
| 22 | `place_icons` `place-practice` | `art/icons/places/practice.png` | Practice (training card) | white-ink sign | in game now (a card with no picture) | Training ground and rest: "Practice +N", progress toward the next Outburst module | A small heart-knot held in an open palm, one ripple ring leaving it. | a boxing glove · a medical heart · a stopwatch |
| 23 | `place_icons` `place-devotion` | `art/icons/places/devotion.png` | Devotion (training card) | white-ink sign | in game now (a card with no picture) | Rest: "Devotion +N XP", prayer by the fire | Two cupped hands round one small flame, a thread of smoke rising. | a cross, crescent, star or wheel of any real faith · praying hands with a halo |
| 24 | `place_icons` `place-rite` | `art/icons/places/rite.png` | Keep a rite (shrine card) | white-ink sign | in game now (a card with no picture) | Shrine: keep a rite for the patron, Devotion XP (free) | A small bowl on a stone ledge with three short incense lines rising and a ring of seven dots round the bowl. | an altar with a cross · a temple · a skull |
| 25 | `place_icons` `place-lore` | `art/icons/places/lore.png` | A piece of lore (shrine card) | white-ink sign | in game now (a card with no picture) | Shrine, for an Atheist: learn the next of the patron's Hymns, prayed by dice | A torn fragment of a clay tablet with one engraved ring on it and a broken edge on two sides. | a scroll with writing · an hourglass · letters |
| 26 | `place_icons` `place-token` | `art/icons/places/token.png` | The token (shrine card) | white-ink sign | in game now (a card with no picture) | Shrine: a small token that is a boon (it uses boon room) | A small round token with a hole through its centre, hung on a short loop of thread. | a coin with a face · a medal · a ring of keys |
| 27 | `place_icons` `place-trade-offbooks` | `art/icons/places/trade-offbooks.png` | The off-books armourer (trade card) | white-ink sign | in game now (a card with no picture) | Crossroads trade: upgrade a weapon to Fine or Masterwork at a cut rate, for some of its durability | A hammer leaning on a plate, one small coin tucked under the plate's lower edge. | an anvil (that is the Forge) · a price tag · a dollar sign |
| 28 | `place_icons` `place-trade-sparring` | `art/icons/places/trade-sparring.png` | A hard sparring (trade card) | white-ink sign | in game now (a card with no picture) | Crossroads trade: drill with a weapon you carry, at a cost in HP | A padded training post with one fist-sized dent in it, two short impact lines at the dent. | a boxing ring · blood · a punching bag with a face |
| 29 | `place_icons` `place-trade-crate` | `art/icons/places/trade-crate.png` | A sealed crate (trade card) | white-ink sign | in game now (a card with no picture) | Crossroads trade: pay, open it, pick one of three weapons of an Elite's grade | A closed crate with three bound straps and one round wax seal on its lid. | a treasure chest · a gift box with a bow · a real shipping logo |
| 30 | `place_icons` `place-trade-wayside` | `art/icons/places/trade-wayside.png` | A wayside shrine (trade card) | white-ink sign | in game now (a card with no picture) | Crossroads trade: free once a stage, Devotion XP or a study or practice step | A small roadside stone with a cord of three ribbons hung across it and a lit lamp on top. | a cross, a crescent or a gravestone · a temple |
| 31 | `place_icons` `place-trade-graft` | `art/icons/places/trade-graft.png` | A back-room graft (trade card) | white-ink sign | in game now (a card with no picture) | Crossroads trade: a small blessing for the rest of the run, paid for in max HP | A thin needle drawing a thread through a small glowing bead set in a flat plate. | a syringe · a medical cross · gore |
| 32 | `place_icons` `place-trade-salvage` | `art/icons/places/trade-salvage.png` | A salvage buyer (trade card) | white-ink sign | in game now (a card with no picture) | Crossroads trade: sell one weapon or item from your pack at a share of its price | A small pair of scales, one coin on one pan, a broken gun part on the other, the scales level. | a real currency symbol · a pawn shop sign · a skeleton |

## 5. Faith: the vows and Witnessed

**Where:** the faith tab, the vow line and the pre-fight vow picker (`faithArt.ts VOW_PATHS`, `WITNESSED_PATHS`): the six vows (`data/patrons.json` `vows`) and the Witnessed state draw a **code line mark** today; the resolver takes `prayer-vow-<id>` and `prayer-witnessed` the day they are built. Vows are Wick icons (the prayer family: the six Whisper icons are the reference); Witnessed is a sign. The Whisper, Hymn and Miracle icons are all delivered.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 33 | `prayers` `vow-shield` | `art/icons/prayers/vow-shield.png` | Vow: Shield ("None of them falls.") | Wick icon | in game now (a code line mark) | The vow of the same name, on the vow line and the vow picker | Wick standing between two partial figures at the frame's edges, both arms spread wide over them. | a shield with a cross · a knight's pose |
| 34 | `prayers` `vow-mercy` | `art/icons/prayers/vow-mercy.png` | Vow: Mercy ("I spare who yields.") | Wick icon | in game now (a code line mark) | The vow of the same name | Wick lowering a blade to his side, his other open hand held out to a kneeling partial figure. | a white flag · a dove · a crown |
| 35 | `prayers` `vow-stand` | `art/icons/prayers/vow-stand.png` | Vow: Stand ("I don't give ground.") | Wick icon | in game now (a code line mark) | The vow of the same name | Wick with his heel planted on a long line scratched across the ground, his weight set forward. | a wall · a flag planted · a mountain |
| 36 | `prayers` `vow-bare` | `art/icons/prayers/vow-bare.png` | Vow: Bare Hands ("By my own hands.") | Wick icon | in game now (a code line mark) | The vow of the same name: no weapon | Wick's two bare fists raised in front of his flame, a dropped blade lying on the ground line behind him. | boxing gloves · a martial-art pose from any known work |
| 37 | `prayers` `vow-unarmed-faith` | `art/icons/prayers/vow-unarmed-faith.png` | Vow: No Magic but Theirs | Wick icon | in game now (a code line mark) | The vow of the same name: no Sigils or Outbursts, only prayer | Wick with both open hands raised, a small glyph and a small heart-knot lying cast aside at his feet, one thin ray falling on his palms. | a crossed-out spell circle · a wand |
| 38 | `prayers` `vow-no-one-behind` | `art/icons/prayers/vow-no-one-behind.png` | Vow: Nobody Left Behind | Wick icon | in game now (a code line mark) | The vow of the same name | Wick turned back over his shoulder, one hand reaching down to pull a partial figure up off the ground line. | a stretcher · a medic cross · a crowd |
| 39 | `prayers` `witnessed` | `art/icons/prayers/witnessed.png` | Witnessed (state sign) | white-ink sign | in game now (a code line mark) | Faith 5: from a Hymn or Miracle until the fight ends or the patron intervenes; on the faith tab and the token | An open eye with a short ray above it and one on each side, the pupil a solid round dot. | an all-seeing-eye triangle or any real-world religious or secret-society symbol · a camera |

## 6. Tending and Bonds: the passives with no picture

**Where:** the Bonds and Tending panel (`data/tending.json`). Every verb of the Mender has an icon (the nine-doors list, delivered); five rows are **passives** that grant or change the Bonds themselves and have none. Wick icons, the tending family (`tend-bond`, `tend-tug` are the references). "Bond (free)" reuses `tend-bond` and is not asked for.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 40 | `tending_icons` `tend-threads` | `art/icons/tending/threads.png` | Threads | Wick icon | in game now · no slot yet | With an Attuner in hand, a share of the damage you take goes to the enemies you are Bonded to | Wick with two fine threads running from his chest out to two partial figures, a small impact star at each far end. | a spider web · puppet strings |
| 41 | `tending_icons` `tend-hold-down` | `art/icons/tending/hold-down.png` | Threads That Hold | Wick icon | in game now · no slot yet | Your Bonds to allies hold while you are Downed | Wick down on one knee, his threads still taut and rising from his chest to two allies. | a fallen figure with no threads · chains |
| 42 | `tending_icons` `tend-bonds-5` | `art/icons/tending/bonds-5.png` | Two Bonds | Wick icon | in game now · no slot yet | You can hold one more Bond (two in all) | Wick holding two threads, one to each side, each tied to a small partial figure. | the number 2 · two equal full figures |
| 43 | `tending_icons` `tend-bonds-8` | `art/icons/tending/bonds-8.png` | Three Bonds | Wick icon | in game now · no slot yet | You can hold one more Bond (three in all) | Wick holding three threads fanning out to three small partial figures. | the number 3 · a web |
| 44 | `tending_icons` `tend-mender-bonds` | `art/icons/tending/mender-bonds.png` | One More Bond | Wick icon | in game now · no slot yet | The Mender's class gain: holds one more Bond | Wick tying one extra short thread onto a bundle of threads already in his hand. | a plus sign · a knot with text |

## 7. Marks for resources and tones (lower priority)

**Where:** the credits count on every place's header and the camp budget, the XP and Devotion XP lines on the reward and level-up cards (`RunScreen.tsx`, `PlaceBar`: words only today), and the quiver's enchantment tag (`quiverView.ts TONE_GLYPH`: a text glyph per tone). The seven tones are the Soul tones of `data/soul_modules.json` (Raw, Fire, Storm, Frost, Stone, Gale, Acid); the Sigil elements share their inks. Signs at 16 to 24 px beside a word or in a row, so each is one silhouette. Optional: the game reads fine without them.

| # | Id (catalog) | File to save | Name | Mode | State | In the game | Paint (what to show) | Avoid |
| --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 45 | `interface_icons` `icon-resource-credits` | `art/icons/resources/credits.png` | Credits | white-ink sign | in game now (the word CREDITS) | Every place's header, the camp, the shops and the reward cards | A small stack of three flat round tokens, each with a single notch in its rim. | a dollar, euro or pound sign · a real currency · a coin with a face |
| 46 | `interface_icons` `icon-resource-xp` | `art/icons/resources/xp.png` | Experience | white-ink sign | in game now (the word XP) | XP gained, on the reward and tally cards | A small flame-shaped seed splitting into a sprout of two short leaves. | a star · a level arrow · letters |
| 47 | `interface_icons` `icon-resource-devotion` | `art/icons/resources/devotion.png` | Devotion XP | white-ink sign | in game now (the words DEVOTION XP) | Devotion gains (rest, shrines, rites) | One small flame inside a thin ring that is open at the top. | a halo over a head · a cross · a prayer-beads loop |
| 48 | `interface_icons` `icon-tone-raw` | `art/icons/tones/raw.png` | Tone: Raw | white-ink sign | in game now (a coloured word) | A Raw Outburst design, and the plain quiver | A plain heart-knot with no flourish, a clear ring of space round it. | a medical heart · colour |
| 49 | `interface_icons` `icon-tone-fire` | `art/icons/tones/fire.png` | Tone: Fire | white-ink sign | in game now (a text glyph on a quiver tag) | The Fire tone: an Outburst design, an enchanted quiver | Three flame tongues seated in a small ring. | a campfire · a match |
| 50 | `interface_icons` `icon-tone-storm` | `art/icons/tones/storm.png` | Tone: Storm | white-ink sign | in game now (a text glyph on a quiver tag) | The Storm tone (the Sigil element Shock) | One long jagged bolt dropping from a small flat cloud line. | a lightning-bolt logo from a known brand · a power symbol |
| 51 | `interface_icons` `icon-tone-frost` | `art/icons/tones/frost.png` | Tone: Frost | white-ink sign | in game now (a text glyph on a quiver tag) | The Frost tone (the Sigil element Freeze) | A six-armed crystal made of straight strokes, each arm ending in a short fork. | a snowman · a thermometer |
| 52 | `interface_icons` `icon-tone-stone` | `art/icons/tones/stone.png` | Tone: Stone | white-ink sign | in game now (a text glyph on a quiver tag) | The Stone tone | Three stacked rough slabs, the middle one set a little off-centre. | a cairn with a flag · a mountain |
| 53 | `interface_icons` `icon-tone-gale` | `art/icons/tones/gale.png` | Tone: Gale | white-ink sign | in game now (a text glyph on a quiver tag) | The Gale tone | Three long streamlines curling into small hooks at their ends. | a tornado funnel · a weather map |
| 54 | `interface_icons` `icon-tone-acid` | `art/icons/tones/acid.png` | Tone: Acid | white-ink sign | in game now (a text glyph on a quiver tag) | The Acid tone | A single round drop above a bowl-shaped dent, two small pit marks eaten into the bowl's rim. | a skull · a chemical flask · a biohazard mark |

## Left off, on purpose (for the lead to rule on)

- **The 46 `given_*` and `foe_*` feeling states** (Given Rage, Felt Grief and so on, rules 1.33): the 25 feeling glyphs exist (`feeling-<id>`); the recommendation is that the screen shows the feeling's glyph inside the helps or hurts frame of the status strip, with no new signs. If Leon wants own signs, that is 46 more pictures.
- **The BATTLE START, VICTORY and DEFEAT banner marks** are delivered (`banner-fight-start`, `-won`, `-lost`) and the 0.31.1 end panel reuses them in its ring; a bigger dedicated emblem for the end panel is not asked for.
- **The basic fight actions** (the 18 rows of `data/actions.json`: Move, Sprint, Disengage, Drop prone, Pick up, Hide, Analyze and the rest) and Attack, Reload, End turn: the fight's action list draws no icon per row at all. That is a new UI slot (Leon's call, as for the door moves), not missing art.
- **`figment_claws` and `figment_edge`** (a Figment's own weapons), and **`mod_follow_guard` and `mod_afterword`** (named in `variant_mods`, never fitted): never reach a shelf, a pack or a card.
- **The 20 weapon and focus variants** (`data/variants.json`) show their base weapon's painting by design.
- **The shrine's patron** (`data/survival.json` face `patron`, `portrait_pending: true`) shows the visiting patron's own portrait (`fallback_patron`), which is painted: nothing is missing.
- **The four unlisted campaigns** (`curse`, `godplot`, `own`, `summoning`) share the placeholder painting `world-pilot`. They are `listed: false`, so no player is shown them today; the day one is listed it needs a card painting (and its map: ART-REQUESTS section 3 M7 to M9 wait for the campaigns to be written).
- **Weapon mastery marks** (`data/weapon_mastery.json`, 33 rows): no screen draws them yet.
- **The "two unpainted gloves"** of the integration brief: none. All six gloves (hand wraps, striking gloves, iron mitts, Kemizuchi strikers, the Hellraiser servo fist, knuckledusters) and the Emanator gauntlet have painted icons; the only weapon with a placeholder is Afterword (0.30 list). **Magazines:** every gun that reloads from a magazine has one (19 of 19); loose-loaded guns carry none.

## Placeholders

**None made.** The repo has a script (`tools/art/make_placeholders.py`, list file `art/briefs/placeholders-2026-11-16.json`), but a placeholder is only worth a catalog entry where a screen would draw it, and for every row above the game already shows something that works (a text glyph, a code line mark, a word) or has no slot yet. The one surface that shows **nothing** meanwhile is the Survival place cards (section 4, 12 cards beside cards that have a picture): it needs a slot (below) before a placeholder could be seen, so none was generated. When the builder adds the slots, run the script on a list built from these rows (ids and files as given; `slot: true`).

## For the builder (later; not the artist)

- **Status strip, FREE ROAM, hazards, zones, vows, Witnessed, tones, resources:** the resolvers take a catalog id and fall back to the text glyph or code line mark they use today (`statusStrip.ts SIDE_GLYPH`, `turnIntro.tsx fieldCard` through `glyphArt: ART(...)` as the other banners do, `worldView.ts HAZARD_LOOK`, `sigilView.ts`, `faithArt.ts`, `quiverView.ts TONE_GLYPH`). `tools/build_web_assets.py` builds `interface_icons` `banner-*` and `icon-panel-*` today; the new `icon-*` ids and the `place_icons` map need a loop like the one at its `interface_icons` line.
- **Place cards:** `PlaceScreen.tsx ChoiceCard` draws an icon only when `x.id` is an item id; a `place-<option>` lookup beside it (white ink as a CSS mask) is a small UI change.
- **Conditions, Tending passives:** with the 0.29 list's `condition_icons` and `tending_icons`, they wait for the same slot (chips, tooltips and rows).
