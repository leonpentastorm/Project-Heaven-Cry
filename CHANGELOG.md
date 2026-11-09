# Changelog

Project Heaven Cry is numbered **0.MINOR.PATCH** until the 1.0 release.

- **Every branch merged into `develop` bumps the middle number** (0.0.1 → 0.1.0 → 0.2.0 …). The person who merges bumps `"version"` in the root and every workspace `package.json` and adds an entry here.
- **The first number becomes 1 at the 1.0 release** (the web game is shipped; Leon calls it).
- *Reading for Leon to confirm:* a hotfix committed straight to `develop` without a branch bumps the **last** number (0.3.0 → 0.3.1).

The game shows its version in the corner of the title screen and in every "Report a problem" bundle (`gameVersion`), read from the root `package.json` at build time (`apps/web/src/version.ts`).

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
## 0.10.0 — 9 November 2026

Branch `feature/title-front-r6`: **the title screen's front layer, Revision 6** (Leon: "first good one we got").

- **The picture:** the five heroes stand small on the lip of a rock outcrop at the right, every face turned up at the god, which fills the sky above them.
- **The gaze rule holds:** the render is placed at the screen's size, shifted 5% right into the overscan. There, every hero's sightline ends within 7–12° of the god's face. The check is saved as `art/_archive/ui/title-screen/previews/gaze-check.jpg`.
- Rock mirrored into the overscan; near-opaque alpha made opaque; Revision 5 archived. `validate_art.py` passes, with menu contrast unchanged at 5.6:1.

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
