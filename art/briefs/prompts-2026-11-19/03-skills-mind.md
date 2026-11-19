# GPT prompts, 19 Nov 2026, part 03: the 0.32 skill system, Expression, Intelligence and Perception

For the artist, and for GPT. Source rows: `art/briefs/ART-REQUESTS-2026-11-19.md` section 2 (P1, 0.32), the Expression, Intelligence and Perception groups. What each thing does: `docs/design/proposals/2026-11-19-attribute-proposals.md` (sections 5, 5b and 6) and the sheets in `docs/design/proposals/2026-11-19-attribute-drafts/`. Every picture is invented here; change freely as long as each stays distinct at 32 px from its neighbours.

**21 prompts:** 20 Wick icons and 1 sign (Darkened). 20 are NEW; 1 is a CHANGE (Running Script, optional, last). Priority: the Expression forks and perks first (the level-up screen offers them), then Intelligence, then Perception.

## Read this first

- **One image a prompt.** Paste the base prompt of its mode (below) first, then the entry's prompt block, and attach the references the mode names. Every entry's block is self-contained after the base prompt: it starts "The icon shows:".
- **Names.** Save under the file name and folder given; do not rename. Claude adds the catalog entries on intake, runs `python3 tools/rehash_art_checksums.py`, `python3 tools/validate_art.py` and `npm run assets`, and makes the UI sizes (perks 256/128/64/56/48/44/40; moves and forks 128/64/48/44/32/24).
- **One convention for Figments.** A Figment is the Rigger's drawn construct, never a person. In every picture below a Figment is a **hollow figure in one bold white contour (outline only, no fill) with two or three parallel hatch strokes inside**, so it reads apart from Wick, who is solid white. Wick is the only full solid figure; anyone else is a partial (a hand, a shoulder, a silhouette cut by the frame).
- **Review.** Each delivery is a review candidate until Leon approves it. Check every icon at 32 px in a row and at 44 px on a chip, on `#10151F`.
- **In-world only.** No real-world person, brand, franchise, insignia or place; weapons and gear are invented shapes; no text, letters or numbers in any image (a page has no writing, a formula is plain strokes and a tick).
- **Colour.** Wick icons and signs are pure white; the game tints them as a mask in the attribute's ink (Expression `#5394AC`, Intelligence `#8BDEEE`, Perception `#40BAA0`). No colour is painted.

## The base prompts, one per art mode

### Wick icon (perks, fork options, class moves)

**Attach:** `art/icons/traits/mind-without-fog.png` (the master) and three of `art/icons/perks/*.png` for the line weight (not the perk being drawn; for the Figment pictures also `art/icons/perks/mirage.png` and `art/icons/perks/solid-image.png`, which already draw Figments). Rule: `art/icons/STYLE-LOCK.md`.

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached reference icons: Wick, the small flame-headed figure of the trait and perk icons, in bold flat white shapes, a confident inked silhouette with a few interior cuts, the same line weight. No outline in another colour, no shading, no gradient, no texture, no glow, no colour and no grey. Wick is the only full solid figure; anyone else is a partial (a hand, a shoulder, a silhouette cut by the frame); a Figment is a hollow figure in one bold white contour with two or three parallel hatch strokes inside. One action, centred, with clear space around it, square, 1024 x 1024 PNG with transparency. It must read at 32 px in a row and at 44 px on a chip: silhouette first, two or three interior cuts at most. No text, no letters, no numbers, no border, no frame. Invented shapes only: nothing recognisable from real-world works, brands or insignia. The icon shows:

### White-ink sign (conditions)

**Attach:** `art/icons/traits/mind-without-fog.png`, `art/icons/conditions/blinded.png`, `art/icons/conditions/bleeding.png` and `art/icons/conditions/braced.png`.

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached reference icons (bold flat white shapes, a confident inked silhouette with a few interior cuts, the same line weight). No outline in another colour, no shading, no gradient, no texture, no glow, no colour and no grey. This icon is a sign, not a scene: Wick does not appear. One subject, centred, with clear space around it, square, 1024 x 1024 PNG with transparency. It must read at 24 px beside a word on a token and at 48 px on a card: silhouette first, two interior cuts at most. No text, no letters, no numbers, no border, no frame. Invented shapes only. The icon shows:

---

# EXPRESSION (ink `#5394AC`)

## The four Visualization forks (fork one at level 4, fork two at level 8)

The list has rows for these four (proposed ids). The rulings of proposals section 5b changed what they do, so the prompts below follow 5b and replace the list's one-liners where those differ: Hard Light is now "Figments take -30% damage and +1 AP next turn when one is destroyed" (the list says "they do not snap"); Sharp Light is "+20% Figment strike damage, and after a Figment drops a foe your next Figment order costs 0 AP"; Many Hands is "+1 Figment held, Picture costs 1 less charge"; Masterwork is "+2 to hit and -25% damage on your named Figment, once a round one order to it costs 0 AP" (the list's "+1 trait" is not built). The four must read apart at 32 px: Hard Light is a thickened, armoured contour; Sharp Light is an edge; Many Hands is several; Masterwork is one singled out.

### Hard Light (fork)
- **Id:** fork option, PROPOSED `fork.figment.hard_light`. **Save as:** `art/icons/forks/figment-hard-light.png`. **Mode:** Wick icon. **Shows:** the fork card at level 4 and the level-up screen.
```
The icon shows: Wick standing behind a Figment (a hollow contour figure) whose outline has been drawn extra thick and in a double line, like light set solid; a single blow, drawn as a short slash line, strikes the Figment's shoulder and stops there without leaving a mark. Wick's free hand rests, palm out, towards the Figment. The thick doubled contour is what to read at 32 px. Avoid: a shield with a crest, a brick wall, cracks, glowing rays, a knight.
```

### Sharp Light (fork)
- **Id:** fork option, PROPOSED `fork.figment.sharp_light`. **Save as:** `art/icons/forks/figment-sharp-light.png`. **Mode:** Wick icon. **Shows:** the fork card at level 4.
```
The icon shows: a Figment (a hollow contour figure) lunging forward with one arm drawn as a single long, tapering, razor-straight blade of light; ahead of the blade tip a foe silhouette (a plain solid shape cut by the frame) is parted by one clean line. Wick, small, stands behind it and lifts one open hand, already beckoning the next order. The long sharp taper is what to read at 32 px. Avoid: a sword with a hilt or guard, lightning, sparks, crossed blades, blood.
```

### Many Hands (fork)
- **Id:** fork option, PROPOSED `fork.figment.many_hands`; it must differ from the Camaraderie perk `many_hands` (Wick with a crowd of helping hands): do not reuse or echo that picture. **Save as:** `art/icons/forks/figment-many-hands.png`. **Mode:** Wick icon. **Shows:** the fork card at level 8.
```
The icon shows: Wick at the centre holding a fan of three hollow Figment figures at once, each on its own thin drawn thread from Wick's raised fingers, the three standing in a shallow arc, each in a different stance (one crouched, one reaching, one guarding). Three threads and three figures is what to read at 32 px. Avoid: many human hands, a spider, a puppeteer's cross-bar with strings to the limbs, a crowd, a flower.
```

### Masterwork (fork)
- **Id:** fork option, PROPOSED `fork.figment.masterwork`. **Save as:** `art/icons/forks/figment-masterwork.png`. **Mode:** Wick icon. **Shows:** the fork card at level 8. A small mark on that Figment's token may also be wanted: unknown whether the token is drawn in code; do not paint it.
```
The icon shows: three hollow Figment figures in a row, two of them plain in a thin contour, and the one in the middle drawn finer: a bolder contour, richer hatch strokes, and a small three-pointed crown of strokes (not a letter) above its head. Wick, small, at the side, touches the middle one's shoulder with one finger as if naming it. One figure singled out among equals is what to read at 32 px. Avoid: a trophy, a medal, a star, a laurel wreath, a ribbon, text.
```

## Perks and the class move

### Field Repair (Improvisation)
- **Id:** `field_repair`. **Save as:** `art/icons/perks/field-repair.png`. **Mode:** Wick icon. **Shows:** the perk card (the action keeps its id).
```
The icon shows: Wick crouched beside a plain long invented weapon laid across his knee, a long jawed spanner set to the jammed action, one hand bracing the stock, the open breech showing a single bent part half out. A short curl of motion on the spanner shows it turning. The spanner on the weapon is what to read at 32 px. Avoid: a toolbox full of tools, a real firearm model, a wrench inside a gear cog, sparks.
```

### Tuned (Improvisation)
- **Id:** `tuned`. **Save as:** `art/icons/perks/tuned.png`. **Mode:** Wick icon. **Shows:** the perk card.
```
The icon shows: Wick with his head tilted and one ear turned toward an invented compact weapon held up near his head, one finger flicking the weapon's receiver so that three short parallel ripple arcs leave it, the way a tuner listens to a plucked string. Eyes closed, a small satisfied set to his shoulders. The tilted head with the ripples at the weapon is what to read at 32 px. Avoid: a musical note, a tuning fork, a guitar, a stethoscope, a wrench.
```

### Jury-Rig
- **Id:** `jury_rig` (kept, changed). **Save as:** `art/icons/perks/jury-rig.png`. **Mode:** Wick icon. **Shows:** the perk card. The old file (a jammed gun firing once more) now lies: attach it only to see what NOT to draw; Claude archives it on intake.
```
The icon shows: a hollow Figment figure breaking into six or seven loose angular shards that drift towards Wick; Wick catches the pieces in his cupped hands, and one small burst of three short strokes rises from his cupped hands to show spare effort banked. The shards flowing into the cupped hands is what to read at 32 px. Avoid: a gun, an explosion cloud, a battery, a recycling arrow loop, coins.
```

### Smooth (Charisma)
- **Id:** `smooth`. **Save as:** `art/icons/perks/smooth.png`. **Mode:** Wick icon. **Shows:** the perk card (a failed lie makes them suspicious, not sure).
```
The icon shows: Wick with one hand raised, palm out and relaxed, and an easy sideways smile, while a line leaves his mouth as a single soft S-curve that bends round a sharp angular snag and passes it without catching. The listener is only a shoulder and an ear cut by the frame, nodding. The line gliding past the snag is what to read at 32 px. Avoid: a snake, a banana peel, a liar's long nose, a smiley mask, a handshake.
```

### Parley (renamed; id `talks_broke_down`)
- **Id:** `talks_broke_down` (kept, renamed Parley). **Save as:** `art/icons/perks/talks-broke-down.png` (the file name keeps the id). **Mode:** Wick icon. **Shows:** the perk card. The old file (a table-flip, now only tier II) is archived on intake; do not echo it.
```
The icon shows: Wick seated on one side of a plain low table with his two open palms laid flat on it, facing across the table a rough armoured foe-leader shown only as a broad shoulder and a helmeted head cut by the frame; between them on the table a single weapon lies laid down, pointing at neither. Stillness, no motion lines. The table between two figures with a weapon laid down is what to read at 32 px. Avoid: a flipped table, a handshake, a white flag, a signed paper, a courtroom.
```

### Showman (Charisma)
- **Id:** `showman`. **Save as:** `art/icons/perks/showman.png`. **Mode:** Wick icon. **Shows:** the perk card.
```
The icon shows: Wick bowing deeply to the side with one arm flung out in a flourish towards a hollow Figment figure stepping onto a small raised round stage behind him, the stage a thick low disc with a half-ring of three footlight dots at its lip. His other hand sweeps back, presenting it. The bow plus the Figment on the little stage is what to read at 32 px. Avoid: a curtain with fringe, a top hat, a spotlight cone, a mask, an audience of faces.
```

### Quick Sketch (Rigger class move)
- **Id:** `trickster.quick_sketch`. **Save as:** `art/icons/moves/quick-sketch.png`. **Mode:** Wick icon. **Shows:** the class move card, Rigger rank I (replaces Field Fix; `moves/field-fix.png` stays in place, unused). One single movement, so it must not look like a perk.
```
The icon shows: Wick's arm swinging in one fast diagonal stroke, his hand holding a thin drawing stylus, trailing one long unbroken line behind it; the line has just closed into a loop at its end and a small hollow Figment figure is standing up out of the loop's bottom edge as if pulled up by the line's own tail. One stroke, one figure, nothing else. The single long line ending in a standing Figment is what to read at 32 px. Avoid: a paintbrush with a palette, a pencil and paper, a magic wand, a rabbit from a hat, sparkles.
```

---

# INTELLIGENCE (ink `#8BDEEE`)

### Index (Rumination)
- **Id:** `index` (action `index_question` kept). **Save as:** `art/icons/perks/index.png`. **Mode:** Wick icon. **Shows:** the perk card (once a scene, ask the Narrator one factual question; the answer is true).
```
The icon shows: Wick standing at a tall narrow cabinet of small shallow drawers, drawing one drawer halfway out with a finger and looking into it, while his other hand holds one thin leaf of paper up to the light with a row of plain tick-lines on it (no letters). A single drawer pulled open is what to read at 32 px. Avoid: a library full of books, a magnifying glass, a computer, an encyclopedia spine with text, a question mark.
```

### Proven Formula (Rumination)
- **Id:** `proven_formula`. **Save as:** `art/icons/perks/proven-formula.png`. **Mode:** Wick icon. **Shows:** the perk card (+3 on saves against a spell or condition that already hit you this fight).
```
The icon shows: a plain slate tablet held up by Wick in both hands, carrying a short worked line of abstract strokes (a dot, a bar, a curl, a stepped bracket, none of them a letter or digit) with one large bold tick beside the last stroke; in front of the tablet a small angular spell-shape (a spiked burst) glances off a thin curved ward line and breaks in two. The tick-marked tablet is what to read at 32 px. Avoid: equals signs, numbers, a calculator, a chalkboard with a clear equation, a flask, an atom.
```

### Objection! (Eloquence)
- **Id:** `objection`. **Save as:** `art/icons/perks/objection.png`. **Mode:** Wick icon. **Shows:** the perk card. It absorbs Burden of Proof (retired: Wick hauling a weight; do not echo it).
```
The icon shows: Wick with one arm thrust straight out and one finger pointing sharply at a plain railed box (a low witness stand drawn as a railed pen on a raised floor) where only the speaker's shoulder and a hand are visible, pinned by the pointing; two short sharp emphasis strokes jump off Wick's fingertip. The one pointing finger aimed across a railed box is what to read at 32 px. Avoid: a gavel, scales of justice, a wig, a judge's bench with text, an exclamation mark.
```

### Opening Argument (Eloquence)
- **Id:** `opening_argument` (action kept). **Save as:** `art/icons/perks/opening-argument.png`. **Mode:** Wick icon. **Shows:** the perk card (before a fight, debate the enemy leader; every foe -1 AP in round 1).
```
The icon shows: Wick stepping forward alone onto open ground with one hand raised in a measured speaker's gesture, facing across a wide empty gap a ragged line of foe silhouettes (plain solid shapes cut by the frame, one taller leader in front) whose weapons are all still lowered; the gap is a clear band of empty space between them. The lone speaker and the wide gap before the held line is what to read at 32 px. Avoid: a podium with a microphone, a flag, a cheering crowd, crossed swords, a document.
```

### Thinking Aloud
- **Id:** `thinking_aloud`. **Save as:** `art/icons/perks/thinking-aloud.png`. **Mode:** Wick icon. **Shows:** the perk card (after you make a Call, your next Evoke this turn costs 0 AP).
```
The icon shows: Wick with his mouth open mid-sentence and one finger tapping his temple, while his other hand draws a single angular glyph in the air beside him (an invented rune of three straight strokes joined, no letter), its last stroke half done and drawn as a bold line. Speech and drawing at once, two hands and two jobs, is what to read at 32 px. Avoid: a thought bubble with text, a lightbulb, a book, a megaphone, a wizard hat.
```

### Backdraft (Sigilist class move)
- **Id:** `backdraft`. **Save as:** `art/icons/moves/backdraft.png`. **Mode:** Wick icon. **Shows:** the class move card (replaces Overcharge; `moves/overcharge.png` is retired). Rule: when the Evoker overloads, foes next to the caster take the same damage.
```
The icon shows: Wick crouched with his Evoker glove held out and cracked down one finger, a fat ring of flame bursting outward from his feet in a flat circle, the ring's tongues thrown out evenly all round and breaking over two foe silhouettes (plain solid shapes cut by the frame) at its rim; Wick himself flinches, one arm across his face. The flat ring of flame centred on the caster's feet is what to read at 32 px. Avoid: a fireball thrown forward, a mushroom cloud, a dragon, a single bolt, a bomb with a fuse.
```

### Running Script (fork): CHANGE, optional, last on the list
- **Id:** `fork.sigil.running_script`. **Save as:** `art/icons/forks/sigil-running-script.png` (replace in place). **Mode:** Wick icon. **Shows:** the fork card at level 8. **Attach (required):** the existing `art/icons/forks/sigil-running-script.png`. **What changes:** the rule is now "after an Evoke, your next glyph this turn costs 0 AP and adds no Flux". Keep the whole picture (pose, glyph, line weight) and add one thing: a second glyph, half drawn, beside the lit one. It reads close enough unchanged, so do this last. Paste the Wick base prompt first as usual; the attached file is the picture to edit.
```
The icon shows: the attached icon exactly as it is (Wick drawing a lit glyph), with one addition: a second glyph, an invented rune of three straight strokes, drawn only half finished in a thin white contour and set beside the lit glyph on the side nearer Wick's drawing hand, its last stroke trailing off towards his stylus. Keep the pose, the lit glyph and the line weight unchanged. Avoid: moving the lit glyph, adding a second Wick, a speed-line fan, motion blur.
```

---

# PERCEPTION (ink `#40BAA0`)

### Quick Read (Acuity)
- **Id:** `quick_read`. **Save as:** `art/icons/perks/quick-read.png`. **Mode:** Wick icon. **Shows:** the perk card (the first Analyze each fight costs 0 AP). The Analyze action has no icon today either; this one may serve both.
```
The icon shows: Wick glancing sideways with one eye wide and the other narrowed, one hand flicked up beside his face with two fingers pointing at his own eye, while across the gap a foe silhouette (a plain solid shape cut by the frame) is crossed by three quick thin measuring ticks at its head, chest and feet, as if sized up in a single look. The sidelong glance with the three quick ticks on the foe is what to read at 32 px. Avoid: a magnifying glass, binoculars, a clipboard, a radar sweep, a robot eye.
```

### Read Them (Acuity)
- **Id:** `read_them`. **Save as:** `art/icons/perks/read-them.png`. **Mode:** Wick icon. **Shows:** the perk card (foes you analysed deal less damage to your squad).
```
The icon shows: Wick crouched, one fingertip holding still a foe silhouette's swinging arm along a drawn arc of dots, the foe's strike traced as a repeating pattern of three equal looped arcs that Wick has plainly worked out; behind Wick the shoulders of two squad-mates (partials cut by the frame) take the same swing glancing off, bent but unharmed. The repeated arc pattern with Wick's finger on it is what to read at 32 px. Avoid: a shield, a sheet of notes, a chess piece, a brain, a bullseye.
```

### Darkened (condition)
- **Id:** `darkened` (Lightkiller puts it on the user: darkness gathers round him and foes see him 3 tiles less far for 2 rounds, -3 PROVISIONAL; the sign shows sight cut short). This is the one Darkened prompt in the pack (file 04 points here). **Save as:** `art/icons/conditions/darkened.png`. **Mode:** white-ink sign (use the sign base prompt, not the Wick one). **Shows:** the status strip and the token's chip. It must read apart from `conditions/blinded.png` (attached as the contrast: Blinded is an eye struck out; Darkened is an eye that still sees, but short).
```
The icon shows: one open almond-shaped eye with a clear circular pupil, its field of view drawn as a short cone of two straight lines running out from it and stopping abruptly at a thick solid bar across the cone's end; beyond the bar there is only empty space. It reads as a view cut short. The eye with a short cone ended by a bar is what to read at 24 px. Avoid: a crossed-out eye, a closed eye with lashes, a moon, a lightbulb with a slash, a full black circle (that is Blinded).
```

---

## Do not redraw

**Expression, REUSE:** door emblem `doors/figment`; Picture; all ten forms (line icon and painted portrait each: Double, Snare, Hand, Eye, Wall, Ward, Beast, Blade, Husk, Sentinel); Glimmer; orders Cash in, Redraw, Let go; perks Many-Eyed Dream (`mirage`), Wake of the Kill (`blueprint`), Solid Image, Hot-Swap, Overhaul, Crowd Pleaser, Everyone's Friend; Call Rally; moves Double (`double`), Salvage, Redline (`overclock`), Sleight, Scrap Sentinel (`scrap-turret`). `moves/field-fix.png` stays in place (its move goes back to the shelved pool). **Expression, RETIRE:** none (the old `perks/jury-rig.png` and `perks/talks-broke-down.png` are archived by Claude when the new ones land).

**Intelligence, REUSE:** door emblem `doors/sigil`; Overclock (`overclock-sigil`), Twin Draw; forks Overflux, Clean Vent, Written in Advance; perks Second Clause (`hold-the-stroke`), Running Hand (`parallel-thought`), Clean Draw, Footnote, Lab Coat, Established Fact, Overruled!, Closing Argument; Call Brief; moves Barrage, Core Change, Bleed the Flux, Payload, Stored Spell. **Intelligence, RETIRE:** `perks/burden-of-proof.png`, `moves/overcharge.png`.

**Perception, REUSE:** door emblem `doors/shadow`, Hide, Go to Ground, First Shade, Break; Tag, Lift, Decoy, Ghost Kill, Fade, Cut the Strap, Open Seam, Timing; Pick, Disable, Rig, Hijack; forks Light Fingers, Lend the Dark, Lightkiller, Spotter; perks Long Dark (`sleight-of-hand`), Shadow Step, Vanishing Act, Pattern Lock, Case Closed, Cold Spine (`eyes-in-the-back`), The Tell (`detectives-eye`), Got You in My Sight, Nothing Gets Past; Call Spot; moves Mark (`shadow/mark`), Vanish, Toxin, Sabotage, Execution, Called Shot; Parting Cut and Case unchanged. Re-files (no drawing): `moves/still-breath.png` becomes the Still Breath perk; `shadow/read-intent.png` becomes the Read Intent perk. **Perception, RETIRE:** `shadow/plant.png`, `shadow/foul.png`, `shadow/douse.png`, `moves/close-quarters.png`, `moves/shadow-run.png`.
