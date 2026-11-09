# Hand-off: Outburst 4.0 (rules 1.8), parts A and B

Built 9 Nov 2026 on `feature/outburst-4.0` (implementer 2), from `docs/design/outburst-4.0-spec.md`. Rules in the spec,
"Soul magic" section 12; provisional numbers and readings are spec items **801–818**; decision **109**. Every number is
provisional, for the damage balance pass.

## What was built

**Part A: spec, data and engine**

- **Data:**
  - `data/feelings.json`: the 25 feelings, each with its trigger, step, pour (behaviour numbers), residue and family.
  - `data/soul_modules.json` revision 18:
    - stage 0 is ×0.8, and the fight's first Pump is free;
    - practice, gates, and the starting designs (also used as the templates);
    - 13 new modules for everyone, plus 10 class-locked ones (`locked`, `class`).
  - `data/conditions.json`: Hopeful and Scorned.
  - `effect_ops.json`: the two bespoke ops `feeling_pour` and `feeling_residue`.
  - `tools/validate.py` checks the feelings, the gates and the starting designs.
- **Engine:**
  - `feelings.ts`: triggers through the global hooks and an effects-stream tap (`fxtap.ts`), the steps, unlocking, and residue lookups.
  - `magic.ts`:
    - feeling pumps and Revert Pump;
    - the hold's Strain, so Quiet and Relief can work on it;
    - behaviours, the new modules, residue and practice;
    - the release preview with feelings.
  - `character.ts`: the starting designs and feelings, the tone at Lore Master 1, at least 3 ready designs, gates, practice and picks, migration to `soulRev` 18.
  - `game.ts`:
    - `combat/revert`, and `combat/pump` with `feeling`;
    - `magic/pick`, and the Narrator's `magic[].feeling`;
    - the Overreach and new-zone triggers;
    - the Proving Ground's `sandbox/learn` feeling and `sandbox/practice`.
- **Tests:** `test/outburst40.test.ts` (29). The 1.5 tests were updated only where 1.8 changed a rule; each change has a comment.

**Part B: web**

- **HEART panel** (combat tab and area map; `heartView.ts`, `feelingsView.ts`, both templates):
  - one button per known feeling, with its step and effect;
  - past six they collapse into "Feelings ▸ (n)" with a search (the design's open item 3);
  - Revert;
  - stage segments coloured by the feeling poured, with its glyph;
  - the counter grows with the stage and reads "×1.4 · now HEALS".
- **Effects** (`fx/feelings.ts`):
  - each feeling's colour, particle motif and family sound on its pump;
  - the counter's shake and tick;
  - the "You have felt X" card;
  - residue laid and ticking, the revert rewind, practice gained, Fuse, Linger and Thread.
- **Grid** (`sigilView.ts` placed layer): residue tiles, striped when they harm, with a ♥n badge; enemy residue only where you can see (the fog). Fuse and Linger zones, and legend entries for all three. The release preview marks the residue tiles and says what the feelings change.
- **MAGIC tab:**
  - Sigil words grouped by word group, collapsible;
  - the Outburst codex: a practice bar, one-click templates, every feeling (locked ones show what unlocks them), and modules by gate skill, each with a Pick button when a practice pick or a Mastered pick allows it.
- **Proving Ground tools** (Magic tab), grouped:
  - schools and tones;
  - modules by gate skill, the advanced classes' marked 🔒;
  - feelings, granted or forgotten one at a time or all at once;
  - practice (+5, +15, −5);
  - a sound and effects test row for each of the 25 feelings (pump, release, residue).
- **Creation:** pick 2 starting feelings (default Rage and Love). Visualization replaced by Lore Master in every tone gate and every bit of text.
- **AI Narrator:** `magic[].feeling` in the tool schema, and a line in its brief.
- **Icons** (`heartIcons.ts`, drawn in SVG):
  - 25 feeling glyphs (brush ribbons with a heart-knot);
  - 40 module icons (diagram lines; Bolt included);
  - 3 UI marks.
  - Painted art replaces them by file name with no code change: `art/icons/feelings/feeling-<id>.png`, `art/icons/modules/module-<id>.png`, `ui-revert|practice|felt.png`, through `npm run assets` (`tools/build_web_assets.py`).
- **Sounds:**
  - 19 files in `public/sfx/cb/feel_*.ogg`, all CC0 from OpenGameArt, credited in `sfxCredits.ts`;
  - a pump layer and a residue sting for each of the 8 families, plus the unlock, revert and tick sounds;
  - no particle textures were needed: the motifs reuse the CC0 Kenney sprites or are drawn as CSS.
- **e2e:** `apps/web/e2e/feelings40.mjs` (the panel, search, Rage, Love, Revert, residue on the grid, the card, the grouped tools). `magic.mjs` updated: a new caster starts with 3 designs, so it forgets one before designing.

Screenshots: `outburst-4.0-shots/` (the panel with Rage and Love, residue on the grid, the card, the tools; the icon contact sheets).

## For Leon

1. **Approve the 25 feeling colours** (`apps/web/src/game/feelingsView.ts` `FEELING_INK`). They're light and particles only, always beside the word, and kept clear of the state colours. By family:
   - **warm:** love `#FF8FB1`, belonging `#FFB36B`, relief `#9FE6C8`;
   - **cold:** grief `#7FA7FF`, longing `#A9B8FF`, loneliness `#8FC9E8`;
   - **sharp:** spite `#FF5E7A`, contempt `#C8A2FF`, jealousy `#B8E04A`;
   - **low:** fear `#8E7CC3`, dread `#6B6FA8`, cruelty `#D2384F`;
   - **bright:** joy `#FFE066`, hope `#FFD9A0`, wonder `#7FF0FF`;
   - **hollow:** despair `#8A90A1`, shame `#C77D9A`, guilt `#B08E6E`;
   - **wild:** rage `#FF6A3D`, abandon `#FF4FD8`, defiance `#FFB000`;
   - **holy:** calm `#A8E6FF`, mercy `#F2E6C9`, awe `#FFF1A8`, pride `#E8C547`.
2. **Readings to confirm** (spec items 801–818). The ones most likely to need your call:
   - **803:** stage 0 is ×0.8 for every release, not only the one-action snap.
   - **806:** a feeling poured twice applies its behaviour once.
   - **809, 813:** old casters get Rage, Love and the starting designs.
   - **811:** Move, Random, At Once and Split are gated by Empathy, and gates apply to learning, not designing.
   - **812:** Mastery practice counts only the six gate skills.
   - **814:** the free first Pump is for player characters only.
   - **815:** Mercy is a surrender *you* brought about; Contempt is any other surrender where you were the last attacker. There is no flee rule yet.
   - **817:** Dread can't blind one foe to Hidden things, because sight is per side; it takes their reactions and Overwatch.
   - **810:** Silent means a hostile Outburst release now reveals a Hidden caster, as a harmful Sigil does.
3. **Icons:** placeholders, good enough to play with.
   - **Shaky:** guilt (reads a little like a pipe), shame (a lamp), love (a refresh swirl), awe (a sunrise), silent (muted wifi), siphon (close to a radiation trefoil).
   - **Right and Left:** they follow the brief's arrows, but in the rules they mean the Heart save and the Brain save.
4. **Sounds:** nobody has listened to them yet.
   - Chosen by description and measured with ffmpeg (length, loudness, pitch).
   - `feel_pump_wild` (a growl) may sound comic pitched up.
   - **holy:** no CC0 choir exists, so a bell and a gong stand in. The CC-BY 3.0 Wisdom Magic choir the game already uses could serve instead.
   - **Revert:** Kenney's falling tone stands in.
   - Per-file sources, trims and levels: the hand-back notes copied below ("Sound sources").

## COMING SOON slots (painted art, none commissioned)

| Slot | Where it shows | What it should look like |
| --- | --- | --- |
| Feeling glyphs (25), `art/icons/feelings/feeling-<id>.png` | pump buttons and segments, the codex, residue badges, the felt card, the Proving Ground | white-ink ribbon with a heart-knot (`outburst-4.0-art-brief.md`); the SVG stands in |
| Module and shape icons (40), `art/icons/modules/module-<id>.png` | the codex by gate skill, design cards, picks, the Proving Ground | white-ink diagram lines; the SVG stands in |
| UI marks (3), `ui-revert.png`, `ui-practice.png`, `ui-felt.png` | Revert, the practice bar, the felt card | the SVG stands in |
| The "You have felt X" card illustration | the unlock card | a painted Soul-grammar vignette per feeling, or one shared backdrop, with the feeling's colour as light only; today the card shows the glyph |
| Residue tile texture per feeling | residue tiles | a soft wash or particle sheet in the feeling's light (sourced CC0 / CC BY first); today a tint and stripes |
| Locked class module plate | the 10 class-locked modules in the codex | the icon on a sealed plate with the advanced class's emblem; today the icon and 🔒 |
| Heart plate item art | the module-teaching loot | a painted keepsake plate with the module engraved |
| Workshop and Proving Ground header art | the MAGIC tab's Outbursts section | a wide Heavenprint painting of a caster holding a spell in the heart; today no banner |

`heartIcons.ts` exports `comingSoon(name, what)` (the neutral placeholder block) and `COMING_SOON_SLOTS` (this list), for any screen that wants a painted slot later.

## Known gaps

- **Not built** (by design):
  - the 10 class-gated modules' behaviours (they unlock when their classes come back);
  - pen-and-paper practice (`docs/ROADMAP.md`);
  - the Abandon-goes-wild trait idea.
- **Flee:** Contempt's "or flees" has no engine event to read (there is no flee rule).
- **Longing:** the engine reads only the Heartbinder link (shelved); otherwise the Narrator grants it.
- **The area map:** no fight, so no free first Pump. Its residue uses the story's zones like any placed magic.
- **Not checked in a browser:** the creation picker. It's covered by the engine's sheet check, and the e2e covers the rest.

## Sound sources

All CC0 (OpenGameArt), mono, trimmed, levelled (pumps about −19 LUFS, residue −22), Ogg Vorbis, 4–17 KB each.

| Sound | Source pack: file |
| --- | --- |
| `feel_pump_warm` | Kenney Interface Sounds: `maximize_006` |
| `feel_pump_cold` | Kenney Interface Sounds: `glass_001` |
| `feel_pump_sharp` | rubberduck, 80 CC0 RPG SFX: `blade_01` |
| `feel_pump_low` | Kenney Sci-Fi Sounds: `impactMetal_000` |
| `feel_pump_bright` | Zane Little Music, Theremin Sci-Fi Sparkles: `Sparkle 15` |
| `feel_pump_hollow` | Kenney Interface Sounds: `bong_001` |
| `feel_pump_wild` | rubberduck, 80 CC0 RPG SFX: `creature_roar_01` |
| `feel_pump_holy` | PWL, bell dings: `bell_ding3` |
| `feel_residue_warm` | Theremin Sparkles: `Sparkle 18` |
| `feel_residue_cold` | Kenney Interface Sounds: `glass_004` |
| `feel_residue_sharp` | rubberduck, 80 CC0 RPG SFX: `blade_03` |
| `feel_residue_low` | Kenney Sci-Fi Sounds: `lowFrequency_explosion_001` |
| `feel_residue_bright` | Theremin Sparkles: `Sparkle 4` |
| `feel_residue_hollow` | rubberduck, 100 CC0 SFX #2: `sfx100v2_air_02` |
| `feel_residue_wild` | rubberduck, 80 CC0 RPG SFX: `spell_fire_06` |
| `feel_residue_holy` | rubberduck, 100 CC0 SFX: `gong_02` |
| `feel_unlock` | Julie Damsgaard (Spring Spring), Magic Words + Healing: `health_restore` |
| `feel_revert` | Kenney Interface Sounds: `minimize_006` |
| `feel_tick` | Kenney Interface Sounds: `tick_001` |
