# Magic: how it looks, sounds and plays on screen (draft, 6 Nov 2026)

Rules are in the spec (`docs/rules/PHC-Core-Rules-v1.0.md`, Mana, rules revision 1.2 draft). This note is the presentation: what the player sees and hears, and where the assets come from. The two families must never be confused at a glance.

## The rule of the two families

| | Sigil (Mind) | Outburst (Soul) |
|---|---|---|
| Idea | Commanding the bots: precise, written, engineered | Pulling the bots through your heart: felt, unstable, costly |
| Owns | **Space**: where glyphs sit and the shape they make | **Time**: how long you hold and when you let go |
| Colour | Mind cyan `#4FC8DF`, Intelligence ink `#8BDEEE` on hard white cores | Soul violet `#AE9BFF` bleeding into warm gold; never cyan |
| Shape language | Straight lines, circles, right angles, **square particles** (bots) | Smoke, flame tongues, veins, **soft round particles** |
| Motion | Snaps: strokes draw at constant speed, then lock with a click | Swells: eases in and out, pulses with the heartbeat |
| Sound | Synthetic: each word is a tone, so a pattern plays a short melody; overload glitches | Organic: breath, heartbeat, a choir swell; a Mana Short drops to silence |

## Sigils on screen

- **Drawing.** Choosing a word and a tile animates its glyph being drawn stroke by stroke on that tile (SVG `stroke-dashoffset`, about 300 ms), then it settles with a faint cyan glow and slow square motes. Other players see it drawn live.
- **Patterns.** When glyphs make a pattern, connecting lines draw between them and the shape's outline pulses (Stack: a small ring; Line: an arrow out of the far end with the range ghosted; Ring: a circle over the centre). A pattern that is one word short shows a dashed hint.
- **Reading.** Glyphs you can't read show as unreadable scratches until an Analysis check succeeds.
- **Evoke.** The pattern's lines flash white, the glyphs collapse into the spell, and the element plays out: bolts are straight beams of square particles; bursts are expanding square grids; STAY walls are rows of standing glyph-light.
- **Flux.** A small gauge on the Evoker in the hand panel, cyan to white to red. Overload: the screen edge glitches for 200 ms with a burst of red squares. Vent: the Flux streams up into the air and the map's mana shimmer thickens.
- **Glyph keyboard.** The Magic action (the combat Draw pad, the area map's draw pad and the Proving Ground's word list) shows the words you know as glyph keys in labelled rows by word group, in this order: Elements, Afflictions, Boons, Workings, Reach, Delivery, Burst, Filter. A row with no known words is hidden. Each row has a hairline on top and a small Sigil-cyan label; the keys fill the width. A key shows its glyph, the word, its cost ("2 ch · 1 AP") and what it does ("starts", "extends…"). A key you can't draw now stays focusable and clickable, with a dashed muted border, grey text and a short reason on its second line ("tile taken", "needs 1 AP", "over your cap", "one Reach only", "silenced"); clicking it or hovering shows the full reason, and screen readers hear it ("can't draw now: …", `aria-disabled`). Arrow keys move between keys: Left and Right step through them across rows and wrap; Up and Down go to the nearest key on the line above or below (also inside a row that wraps); Home and End jump to the first and last key; Enter or Space picks the word. Hover shows the rules; the tile under your cursor previews where the glyph lands and what pattern it would complete.
- **The 40 glyphs are ours.** One SVG path set per word, geometric, drawn in Inkscape; they double as the Sigil icons. No artist needed.

## Outbursts on screen

- **Begin.** The caster's chest lights violet and a slow heartbeat ring pulses from their token; their portrait's veins glow. Everyone sees someone is holding.
- **Hold.** Each stage the ring grows, the pulse quickens and the colour warms from violet to gold. Strain shows as a heart icon beside HP that beats faster as it nears the limit.
- **Release.** Smoke and light rush out along the path (noise-shader smoke on a small canvas plus soft embers), then a bloom at the target. Bigger stage, bigger bloom.
- **Wild release** stutters: the smoke lurches to a random target with a missed heartbeat.
- **Mana Short.** The heartbeat stops, the screen desaturates for a beat, and the d20 rolls in silence. A heart burst cracks the portrait frame (cosmetic).
- **Heart workshop.** On the MAGIC tab: a school card plus module slots that snap in, with the live MP cost, the effect line and a small preview of the bloom.

## Advanced-class touches

- **Glyph Mason:** Keystones are cut, not drawn: stone-grey glyph with a cyan core and dust particles; they stay visible on the zone map between visits.
- **Grand Sigilist:** the planted staff throws its word out in a widening circle; each Grand form has a ground treatment (lava cracks, ice sheen, fog, a dome outline).
- **Heartfed:** four small gauges around the heart icon (Rage red, Grief blue-grey, Fear pale, Devotion gold).
- **Heartbinder:** a violet thread between linked hearts, brightening when damage is shared.
- **Vessel:** violet light runs along the body instead of leaving it; Release is one big flash on the hit.
- **Twinbound:** the Twin is a token with a ghost-violet rim and its own portrait card; Guard draws a line between them.

## The mana meter on the map

The air's bot density shimmers over the whole map: barely there when Thin, a faint drift when Normal, visible motes when Rich, a thick swarm when Flooded. A death puffs motes up from the body. Sigil users see the motes as tiny squares; Soul users see them as soft points.

## Assets and sources (total $0)

| Need | Source | Licence |
|---|---|---|
| Sigil glyphs and lines | Our own SVG | Ours |
| Sigil sparks and traces | Kenney Particle Pack (kenney.nl/assets/particle-pack), tinted | CC0 |
| Soul smoke | Kenney Smoke Particles (kenney.nl/assets/smoke-particles), tinted, plus our own noise shader | CC0 / ours |
| Soul embers and trails | tsParticles (MIT), or a small custom canvas emitter | MIT |
| Sigil sounds | jsfxr generated at runtime from settings strings (Unlicense); Kenney Sci-Fi Sounds | Unlicense / CC0 |
| Soul sounds | Freesound, **CC0 filter only**: breath, heartbeat, choir, whoosh; layered and pitched | CC0 |
| Outburst school and module icons | The artist, in Wick white flat ink (brief to come once the module list is accepted); placeholders from game-icons.net | Ours / CC BY 3.0 (credit each author) |

**Licence rules.**
1. No-redistribution packs (Pimen, CraftPix, Sonniss, ZapSplat) stay out of git if we ever buy one: shipping them in the built game is fine, committing raw files to the repo is not.
2. Every third-party asset goes in a credits manifest beside `art/catalog.json` (asset, author, source URL, licence), shown on an in-game Credits page.
3. No CC-BY-NC, CC-BY-SA or GPL assets.

## Cost to the Narrator

None from presentation. The rules text the Narrator needs grows a little (the patterns, charge and release, the six classes in the wiki); it will be measured on the 50-hour save before and after the engine work and reported to Leon before shipping.
