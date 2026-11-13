# Prompts for the artist (image generation): Classes 3.0, 13 Nov 2026

Everything Classes 3.0 (Class Roster Revision 4, the seven specs in `docs/design/`) needs that an image generator can
make **now**, so no art is waiting when the patch is ready. Leon, 13 Nov 2026: "The artist is working, so push
anything needed to him." The artist is an image generator (GPT): **one image a prompt**. For each image paste **the
style block of its job, then the numbered line**, and attach the references the job names. Where a job says "same as
the earlier file", the style block is copied from that file word for word: consistency with what was already delivered
matters more than fresh wording.

The inventory (what, which system, which art mode, what already exists, the file name) is in
[`ART-REQUESTS.md`](ART-REQUESTS.md), section 5. **Every delivery is a review candidate until Leon approves it.** Send the
files to Leon; Claude adds them to the catalog and runs the checks (`python3 tools/validate_art.py`, `npm run assets`).

## Counts by mode (53 images for the artist)

| Job | Art mode | Images | Style block copied from |
| --- | --- | --- | --- |
| 1 | **Wick icons**, white flat ink, 1024 x 1024, transparent (action rows, tending verbs, class moves, Figment traits) | **45** | `GPT-PROMPTS-2026-11-12.md` Job 1 (the Wick block) |
| 2 | **Gear icons**, Heavenprint painted objects, 1024 x 1024, transparent | **2** (and the Visualizer, already number 100 in the gear file) | `GPT-PROMPTS-2026-11-13-gear.md` section 1 |
| 3 | **Figment portraits**, abstract skill-portrait mode (black, cream, Expression pigment), 800 x 1000 | **6** | `PHC-Style-Guide.md` "Abstract skill prompt" |

Not for the artist (Claude draws these; nobody waits on them): the class emblems, the meter marks, the focus line
icons, the condition glyphs, the patrons' standing figures. The list is in `ART-REQUESTS.md` section 5.

## The order to make them in

What the first playable build needs first: **action-row icons before everything else, tokens and portraits last**
(class marks are Claude's and are done in the rename step, the first step of the build).

1. **Job 1, batch A** (6: Ward, Sanctuary, Smite, Verdict, Reflex, Run and Gun): the first build steps (Chaplain,
   reactions, Skirmisher). **Send these six to Leon first** as the style check for the whole job, then carry on without
   waiting.
2. **Job 1, batch B** (8: Shadow's four kinds and the Operative's four moves): build step 6.
3. **Job 1, batch C** (16: tending and the Mender's six moves): build step 7.
4. **Job 1, batch D** (15: the ten Figment traits, Picture, Let go, Salvage, Overclock, Scrap Turret): build step 8.
5. **Job 2** (the Attuner, the Toxin vial; with the Visualizer from the gear file, number 100): items, needed when
   Bonds (step 7) and Figments (step 8) land. The monoline line icons Claude draws stand in until then.
6. **Job 3** (6 Figment portraits): last, with the Figments.

## Names that may still change

Every picture shows the **action or the rule**, never the label, and no image has any text, so a rename never makes a
picture wrong: the file names below are ours, and Claude maps them to whatever the move ends up called. Names still
marked *(Suggested)* in the specs: Verdict (was Judgement), Scrap Turret (was Jury-Rig), Settle, Soothe, the Ledger,
Brimming, Blessed Arms (no icon), and the class names Rigger, Mender, Operative, Chaplain, Skirmisher, Sigilist (the
emblems are Claude's). **Safe in every case.** Two pictures illustrate a rule that is itself new and provisional, so
tell Leon if the rule changes rather than the name: **Ledger** (the care you give is collected and spent as damage on
your next hit) and **Brimming** (healing past full becomes a shield). Fade (was Vanish) has no new image: it reuses
`art/icons/perks/vanishing-act.png`.

## Already exists, reused (do not make)

`art/icons/perks/vanishing-act.png` (Fade); the Mark group image (Shadow's Mark move uses it); the 25
`art/icons/feelings/feeling-*.png` (the feelings given along a Bond, in the Inspire picker); the eight patron portraits
and marks (the Chaplain's presence: Claude crops them); `art/sprites/objects/mine.png` (a Rig trap, until a sprite is
asked for); the gear prompts for the field kit (18), spare parts (19), standard core (20) and stim injector (24) (the
Rigger's and Improvisation's supply, the Mender's gear actions, the Visualizer's core).

---

## Job 1: Wick icons (45)

**Attach to every Wick prompt:** `art/icons/traits/mind-without-fog.png` (the master), plus two or three of
`art/icons/perks/*.png` so the line weight is seen (suggested: `both-hands.png`, `shadow-step.png`,
`sleight-of-hand.png`). Extra references per batch are named in the batch.

**Start every Wick prompt with this block** (the same as the earlier file):

> Draw one icon in exactly the style of the attached reference images. The character is Wick, the same mascot as in
> the references: a small figure with a short capelet, a lantern for a heart with a small medical cross on it, a
> pixel-screen face, and a slightly asymmetric build. Keep his proportions, capelet and lantern heart exactly as
> attached. Pure white flat ink (#FFFFFF) on a fully transparent background. No colour, no grey, no gradient, no glow,
> no shadow, no outline colour. Same line weight and level of detail as the references. No text, no letters, no
> numbers, no border, no frame. One figure, centred, with a little clear space around him. Square, 1024 × 1024 PNG
> with transparency. The silhouette must read clearly when shrunk to 44 pixels.

Then add the line of the numbered prompt. Rules that bind every one (STYLE-LOCK, `art/icons/STYLE-LOCK.md`): **Wick is
the only full figure**; anyone else is a partial (a hand, an arm, a shoulder at the frame's edge, a tiny silhouette); one big
dominant prop, about a third of the frame, held close so Wick and the prop read as one silhouette; no letters or
numbers anywhere; no colour (the UI tints the chip, never the icon). Each is used at **32 px in an action row and 64 px
on a card**: check every one on `#10151F` at 44 px and at 32 px, and do not let two of one batch look alike (put the
batch on one dark sheet and compare).

### Batch A: the Chaplain and the reactions (6)

Extra references: for 1 and 2, `art/icons/prayers/whisper-luck.png`, `whisper-protection.png` and `hymn-mother_ember-1.png`
(the Whisper and Hymn icons: one small light source, no swirls).

**1. `art/icons/prayers/whisper-ward.png`** | Ward (a Whisper only the Chaplain says; a shield on an ally for the fight)
> **Add to the block:** Wick whispering a Ward: one hand cupped by his mouth, the other open and held out to the side toward an ally out of frame, and hanging in the air before that open hand a single small shield outline (a plain heater shape, one line, the one light source of the icon). A quiet word that lands, not a spell: no swirls, no sparks, no circle.

**2. `art/icons/prayers/hymn-sanctuary.png`** | Sanctuary (a Hymn only the Chaplain sings; a 3 x 3 zone where allies take half damage)
> **Add to the block:** Wick singing a Sanctuary: standing at the middle of a square patch of ground drawn as a dashed square (a three-by-three grid hinted by two short dashed cross lines), both arms raised and open, and over the square one thin low arch of light, like a roof of a tent. Calm and planted, mouth open in a held note shown by one short curved line at his face.

**3. `art/icons/moves/smite.png`** | Smite (the hit also carries the god's own strike)
> **Add to the block:** Wick in the middle of a weapon hit: a plain invented short blade swung down and across his body, and from the point of impact one hard straight ray of light continuing on past the target through the frame's edge, as if the blade struck twice. The weapon is only a simple generic shape (the move works with any weapon); the ray is the point.

**4. `art/icons/moves/verdict.png`** | Verdict (once a fight: one plain attack, hits hard)
> **Add to the block:** Wick passing sentence: one arm thrust out in front of him with a single stiff pointing finger, the other arm raised high overhead holding a plain invented weapon ready to come down, feet planted wide and steady. Heavy, final, unhurried: one decisive blow about to fall after the finger has chosen. Not a balance scale, not Judgement Day's pose: a pointed finger and a raised weapon.

**5. `art/icons/moves/reflex.png`** | Reflex (two reactions a round; the Skirmisher)
> **Add to the block:** Wick reacting twice: caught leaning hard away to one side, one arm snapping up to block while the other arm is already pulled back to strike, and two separate pairs of short curved motion arcs trailing from his shoulders, one pair behind the other, so the eye reads "twice". Quick, light on his feet, mid-dodge.

**6. `art/icons/moves/run-and-gun.png`** | Run and Gun (move up to 2 tiles between two attacks, for free)
> **Add to the block:** Wick sprinting low and fast, his feet mid-stride with a short dash line behind each, while one arm holds a plain invented pistol levelled dead ahead and steady, as if shooting while running. The upper body is still, the legs are moving: that contrast is the move.

### Batch B: Shadow (the Operative's door: Slip, Mark, Work, Break) (8)

Extra references: `art/icons/perks/vanishing-act.png`, `never-there.png`, `shadow-step.png`.
The four kinds (7 to 10) are the group marks on the Shadow tab; the 21 verbs borrow their group's mark. Put 7 to 10 on one
sheet: they must be four different silhouettes.

**7. `art/icons/shadow/slip.png`** | Slip (move past Detection)
> **Add to the block:** Wick sidestepping on tiptoe along a wall, one hand flat on the wall at his side and his head turned, while a wedge-shaped searchlight beam (drawn as an empty outlined wedge) sweeps across the ground in front of him and misses. Held breath, careful feet.

**8. `art/icons/shadow/mark.png`** | Mark (prepare a target that cannot see you)
> **Add to the block:** Wick crouched behind a low wall block (the wall is the big dominant shape), only his head and one arm showing over the top, the hand pressing a small flat tag forward toward a faraway small ring that has a tick over it. He is hidden and the target does not know. (Not Spot's open pointing arm: here he is tucked behind cover.)

**9. `art/icons/shadow/work.png`** | Work (hands: lift, plant, rig, jam, open a lock)
> **Add to the block:** Wick crouched on one knee at a small hinged box, one hand holding a thin pick into its lock, the other hand easing a tiny object up out of the open lid. The box and its lock are the dominant prop; he is busy and quiet.

**10. `art/icons/shadow/break.png`** | Break (the strike that reveals you, stronger for each point of Shadow)
> **Add to the block:** Wick bursting out of hiding with a short blade thrust straight forward, springing out through a hanging cloth that tears open into two flaps behind him, three short sharp lines at the blade's point. The tearing of the dark and the thrust are one gesture.

**11. `art/icons/moves/toxin.png`** | Toxin (coat a weapon; the hit weakens, slows or bleeds)
> **Add to the block:** Wick coating a weapon: a short blade held level in one hand, and in the other a small phial tipped over its edge, one single drop caught in mid-fall just above the blade. Careful and precise. The blade is a plain generic edge (the move works on any weapon).

**12. `art/icons/moves/sabotage.png`** | Sabotage (disable an enemy machine)
> **Add to the block:** Wick reaching into the open panel of a squat boxy machine (a turret or drone body at the frame's edge, a round lens on its face), cutting one thick cable with a pair of cutters, the cable end just springing apart. The machine is the dominant shape; the cut cable is the focus.

**13. `art/icons/moves/execution.png`** | Execution (finish a Marked enemy at a quarter of its health)
> **Add to the block:** Wick stepping in low behind his own blade held in a reversed grip, thrusting forward at a small target ring on the ground in front of him; the ring has one quarter wedge filled in and a tick over it (a mark that is nearly spent). Calm, certain, no flourish. Nothing gory.

**14. `art/icons/moves/called-shot.png`** | Called Shot (name the part you hit: head, arm or leg)
> **Add to the block:** Wick aiming a plain invented pistol with one eye closed, and ahead of the barrel a tiny plain stick silhouette of a figure with a ring drawn tight around just one of its arms. The ring on one limb is the point. (Not a distant target ring alone: the tiny figure and its circled arm.)

### Batch C: Tending and the Mender (16)

Extra references: `art/icons/perks/shared-breath.png`, `soulmate.png`, `field-surgeon.png`, and one `feelings` glyph
(`art/icons/feelings/feeling-love.png`) for the ribbon-and-knot look. Another person is always a **partial**: a hand, an arm
or a shoulder cut off at the frame's edge. The plus mark means help: thick equal arms, small, plain (never a real emblem).
Put 15 to 24 on one sheet: ten verbs, ten different silhouettes.

**15. `art/icons/tending/bond.png`** | Bond (a tie to an ally: tending travels along it)
> **Add to the block:** Wick tying a Bond: one hand raised holding the end of a single fine thread, and from it a thin line running across the frame to an ally's hand reaching in from the edge (a partial), with one small heart-shaped knot tied in the middle of the line where the two meet. Warm and gentle, the thread slack and loose.

**16. `art/icons/tending/bond-foe.png`** | Bond on an enemy (it takes damage for you, takes your healing as wounds)
> **Add to the block:** Wick leaning back against a pulled-taut thread, both hands gripping its end like a leash, heels dug in, and the straight taut line running to a spiked, armoured gauntlet reaching in from the frame's edge (a partial) that is being dragged forward by it. Strain lines at his hands. It must differ from the ally Bond at 32 px: taut and straight with a spiked end, Wick leaning back, no heart knot.

**17. `art/icons/tending/mend.png`** | Mend (heal at range 3)
> **Add to the block:** Wick healing at a small distance: one open palm held out toward an arm and shoulder that reach in from the frame's edge (a partial), a single small plus mark floating in the gap between his palm and the arm, and three tiny rising dots above the plus. Not touching.

**18. `art/icons/tending/touch.png`** | Touch (adjacent, a stronger heal)
> **Add to the block:** Wick laying one large open hand flat on the shoulder of a person standing beside him (only the shoulder and the back of a head at the frame's edge), his other arm hanging easy. The touching hand is the biggest shape. Quiet, close, kind. No plus mark (the contact is the heal).

**19. `art/icons/tending/shield.png`** | Shield (a barrier on an ally)
> **Add to the block:** Wick pushing both hands outward and up, as if lifting a round bubble into place: a half-dome outline over a partial ally's head and shoulders at the frame's edge, the dome's rim just meeting his palms. A bubble, not Ward's heater-shaped shield.

**20. `art/icons/tending/raise.png`** | Raise (stand a Downed ally back on their feet)
> **Add to the block:** Wick braced and leaning back, hauling someone up: both of his hands clasped around a forearm that rises from the ground at the frame's edge, his feet planted, the clasped hands the dominant shape, three short lines of effort at his shoulders.

**21. `art/icons/tending/settle.png`** | Settle *(Suggested)* (steadies you against fear, pain and shock)
> **Add to the block:** Wick with both palms pressed gently downward, as if smoothing the air, and under his palms a jagged zig-zag line flattening into a calm straight line. Slow, steady, an exhale.

**22. `art/icons/tending/soothe.png`** | Soothe *(Suggested)* (end a harmful condition on someone)
> **Add to the block:** Wick plucking a small thorny knot off a person's shoulder (the shoulder is a partial at the frame's edge), pinching it between two fingers and lifting it clear, leaving the shoulder smooth. The little thorned knot held up in his fingers is the focus.

**23. `art/icons/tending/guide.png`** | Guide (move an ally up to 2 tiles to a tile you choose)
> **Add to the block:** Wick stepping aside like a doorman and sweeping one arm in a wide guiding arc, hand open, toward a dashed path of two small squares ending in a third square drawn with a small corner mark; a pair of footprints on the first square. He is sending someone ahead, not going himself.

**24. `art/icons/tending/share-a-hit.png`** | Share a Hit (take part of a blow meant for an adjacent ally)
> **Add to the block:** Wick stepping in front of a person at the frame's edge (a partial shoulder behind him), one forearm raised to take a blow, and the lines of the incoming impact forking in two at his arm so that half of them pass on to the shoulder behind. The fork of the impact lines is the focus. Reaction-fast, braced.

**25. `art/icons/moves/triage.png`** | Triage (a fast heal and stop the bleeding)
> **Add to the block:** Wick kneeling and winding a strip of bandage round an arm that reaches in from the frame's edge (a partial), one hand tucking the end under, the roll of bandage held ready in the other hand. Quick, sure, practised. (Not Field Surgeon's careful suture: a fast wrap.)

**26. `art/icons/moves/ledger.png`** | Ledger *(Suggested)* (the care you give is stored, then spent as damage on your next hit)
> **Add to the block:** Wick holding a tall narrow glass jar up in one hand, filled to about two thirds with small dots, and in his other hand a short plain blade swung forward, a thin stream of the same small dots pouring from the jar's mouth into the blade's edge. Stored, then spent: the dots are the link.

**27. `art/icons/moves/inspire.png`** | Inspire (give a Bonded ally a feeling you have felt)
> **Add to the block:** Wick holding out a small ribbon tied in a heart-shaped knot (the same ribbon-and-knot as the feeling glyphs) on his open palm toward a hand that reaches in from the frame's edge (a partial), as if passing something precious across a gap. The knot is small but clearly the focus.

**28. `art/icons/moves/take-the-weight.png`** | Take the Weight (a reaction: you take the blow or the condition meant for a Bonded ally)
> **Add to the block:** Wick bent under a huge heavy block he has hoisted onto his shoulders, knees buckling, both arms up to hold it, and a thin hand let go of the block's far corner at the frame's edge (a partial, the ally relieved of it). The heavy block is the dominant shape and he is carrying it for someone else.

**29. `art/icons/moves/brimming.png`** | Brimming *(Suggested)* (healing past full becomes a shield)
> **Add to the block:** Wick tipping a cup so full that it overflows, and the spilled drops falling below the cup and gathering into the outline of a small shield, as if the overflow settled into armour. The overflowing cup and the shield formed from the drops are the two shapes; keep both bold.

**30. `art/icons/moves/mender-rally.png`** | Rally, the Mender's (every Bonded ally heals, wherever they are)
> **Add to the block:** Wick standing with one open palm raised high, and from the palm four thin threads fanning out to the four corners of the frame, each ending in a small plus mark. A fan of care going out to people who are far away. (Not the Rally Call: that one is a raised fist and sound lines; this one is an open palm and threads.)

### Batch D: Figments and the Rigger (15)

Extra references: `art/icons/perks/mirage.png`, `solid-image.png`, `many-hands.png`. A Figment is a thing the nanobots
(the bots) build out of a picture in your head; the bots are shown as **small dots or small squares**. A Figment is
never a second Wick: it is a plain shape, a prop, or a partial. The ten trait icons are small chips on a design, used at 32 px: bold and simple.

**31. `art/icons/figments/trait-armoured.png`** | Armoured (HP x 1.5)
> **Add to the block:** Wick pressing one more thick plate onto the shoulder of a squat blocky shape built of three stacked overlapping plates (the shape is a plain heavy mound, no face), hammering the plate home with the heel of his hand. Thick, layered, solid.

**32. `art/icons/figments/trait-swift.png`** | Swift (+2 tiles an AP; no opportunity attacks)
> **Add to the block:** Wick running flat out, leaning far forward with three long speed lines behind him, and behind his back foot a curved sword-cut line slicing through empty air where he just was. He has slipped past the swing.

**33. `art/icons/figments/trait-loud.png`** | Loud (enemies treat it as the most hurt thing in reach)
> **Add to the block:** Wick jumping and waving both arms overhead, mouth wide open, three nested sound arcs around him, and a small target ring drawn on his chest. He wants to be noticed. (Not the Warn Call: his arms are waving, not cupped round his mouth.)

**34. `art/icons/figments/trait-volatile.png`** | Volatile (when destroyed it bursts, hurting everyone near it)
> **Add to the block:** Wick holding out a round bubble-like orb at arm's length, a crack running across it and short spikes starting to push out from the crack, himself leaning away with his head turned and his other hand up to shield his face. About to burst.

**35. `art/icons/figments/trait-tethered.png`** | Tethered (its projection range +4)
> **Add to the block:** Wick holding a handheld reel of cord with one hand, the other arm stretched out long, and a single long straight cord running from the reel all the way across the frame to a small ring far away, with two short tick marks on the line. He is paying out line to reach further.

**36. `art/icons/figments/trait-mirror.png`** | Mirror (it lures as a Double would, in the look of any ally)
> **Add to the block:** Wick holding up a round hand mirror at arm's length, and in the mirror, instead of his own reflection, a small different silhouette (a tiny helmeted figure). The mirror and its borrowed reflection are the focus.

**37. `art/icons/figments/trait-barbed.png`** | Barbed (an enemy that hits it in melee takes damage)
> **Add to the block:** Wick sheltering behind a round shape bristling with spikes like a thorn bush, and a partial fist reaching in from the frame's edge recoiling off the spikes with two small hurt lines. Prickly and defiant.

**38. `art/icons/figments/trait-lasting.png`** | Lasting (no upkeep)
> **Add to the block:** Wick kicked back and relaxed, hands behind his head, beside a small plain block that has a tiny steady flame burning above it with nothing feeding it. A flame that needs no fuel, and a Wick who is not worried about it.

**39. `art/icons/figments/trait-keen.png`** | Keen (+2 to hit; an Eye sees further)
> **Add to the block:** Wick looking through a long spyglass held to one eye, the other eye shut, and at the far end of its line a tiny ring with a single pinpoint dot at its centre. The spyglass is the dominant shape. (Not Spot's open pointing arm.)

**40. `art/icons/figments/trait-hollow.png`** | Hollow (costs 2 less, but half the HP)
> **Add to the block:** Wick holding up by one edge a paper-thin cut-out shape (a plain rounded blocky figure drawn only as an outline, empty inside, so that you can see through it) which is so thin it bends slightly. Cheap and flimsy.

**41. `art/icons/figments/verb-picture.png`** | Picture (imagine a Figment; the bots build it)
> **Add to the block:** Wick with one hand held up and its fingers framing a small rectangle in the air, and from his other palm a stream of tiny dots and squares flowing into the frame where they are gathering into the beginning of a plain shape. Imagining it into being: the dots are arriving.

**42. `art/icons/figments/verb-let-go.png`** | Let go (unmake a Figment yourself; part of its cost comes back)
> **Add to the block:** Wick opening his hand palm-up and low, and above it a small plain shape just coming apart into tiny dots and squares that drift up and back toward his palm. Relaxed, a breath out. It must differ from Picture at 32 px: here the shape is breaking up and the hand is open and low, there the hand is up and the shape is forming.

**43. `art/icons/moves/salvage.png`** | Salvage (take a core's charge back from a wreck, or repair a machine)
> **Add to the block:** Wick crouched at the dented wreck of a boxy machine (half a battered casing at the frame's edge), pulling a small hexagonal core out of its open chest with one hand, the other hand steadying the wreck. The core in his fist is the focus.

**44. `art/icons/moves/overclock.png`** | Overclock (one machine or Figment acts once, now, and takes a little damage)
> **Add to the block:** Wick cranking a big dial on the back of a squat boxy machine round to its end stop, short jitter lines shaking the machine's outline and its little arm already jerking up. He is pushing it past its limit. The machine is a plain box with a lens (a drone or turret body), not a robot character.

**45. `art/icons/moves/scrap-turret.png`** | Scrap Turret *(Suggested)* (build a turret out of a wreck or a dropped weapon; it fights for 3 rounds)
> **Add to the block:** Wick tightening a bolt with a wrench on a small turret knocked together from junk: a rough pile of stacked plates on a wheel, a plain barrel clamped on top and pointing out to the right. The ugly, welded-together turret is the dominant shape. (Not the Jury-Rig perk icon, which is about a broken weapon firing once more.)

---

## Job 2: Gear icons (2 new, Heavenprint painted objects)

These two are also in `GPT-PROMPTS-2026-11-13-gear.md` (numbers 148 and 149, in their family's batch, with the inventory
table updated), so that file stays the complete gear list. Use the style block and the references below **exactly as in
that file**. The Visualizer (number 100 there) is already written; make it in the same sitting, the two gloves belong
together.

**Attach as references:** the same as the gear file (section 1): `art/sprites/objects/fuel-drum.png`,
`art/sprites/objects/tool-rack.png`, `art/sprites/objects/field-lamp.png`, a portrait for the brushwork
(`art/portraits/world/new-faces/orren-vask.png`); and for the Attuner, if the Evoker, Emanator and Visualizer have been
delivered, **those three gloves**, so that the fourth is the same leather, stitching and scale.

**Style block (paste at the start of both prompts):**

> Paint one game inventory icon in Heavenprint: hand-painted opaque gouache and ink with broken, directional brush
> strokes, selective dry-brush scumbling and restrained hatching where a contour or crease needs it, charcoal shadows,
> warm ivory accents on the focal edges, quiet low-detail areas. Not line art, not flat ink, not a photograph, not a 3D
> render, no airbrushed gloss and no uniform digital sharpness. One single object, three-quarter view, lit from one
> side (upper left), with a short soft painted shading on its own underside only: no ground, no cast shadow, no scene.
> Fully transparent background. Square canvas, 1024 x 1024 PNG with alpha; the object fills about 80% of the canvas
> (keep it inside the central 80 to 85%, about 100 px of clear margin on every side). No text, no letters, no numbers,
> no logos, no maker marks, no borders, no frame, no hands and no figures. Everything is invented: never a recognisable
> real-world make, model or emblem. The silhouette must be bold and instantly readable first: the icon is shown at 64 px
> in a shop grid and at 32 px in a backpack row, so keep detail concentrated on one or two focal edges and make the
> shape unmistakable when shrunk. Colour: metal is painted in the palette's neutrals (charcoal, steel grey, warm ivory
> highlights); the faction's signature colour is the single accent (given in each prompt). Rarity is not shown by a
> coloured border (the UI adds that): standard finish only, with honest wear. Scale within a family stays consistent:
> every object in one family fills the frame by the same rule, given in its family paragraph.

**Attach as references (existing Heavenprint objects in this game):** `art/sprites/objects/fuel-drum.png`,
`art/sprites/objects/tool-rack.png` and `art/sprites/objects/field-lamp.png` (painted objects: material treatment and
edge hierarchy; their top-down camera does not apply, the camera here is three-quarter), plus a portrait for the
brushwork, e.g. `art/portraits/world/new-faces/orren-vask.png`. Palette: [`palette.json`](../style-guide/palette.json);
rule: [`gear-icons.md`](../style-guide/gear-icons.md). The monoline icon of the item (`art/icons/weapons/<id>.svg`,
`art/icons/armour/<id>.svg`, `art/icons/focus/<id>.svg`) is the **silhouette reference**: the painting and the line icon
of one item must be recognisably the same object.

**Family paragraph for the Attuner** (paste after the style block):

**Focuses: the four gloves** (focus). Evoker, Emanator, Visualizer and Attuner are one family (the standard gloves of the gear companies' line): a single glove, no hand inside, empty but with the shape of a hand, worn on the hand and read at 32 px as a hand. Each has a different heart: the Evoker is angular with a hexagonal core window on the back of the hand and a stylus-point index finger (Intelligence cyan #8BDEEE); the Emanator is rounded on a long bracer with a round emitter lens in the palm and a heart-link line to the cuff (Determination violet #9D7ADC); the Visualizer is palm toward the viewer with a projector lens set in the middle of the palm (Expression #5394AC); the Attuner is back of the hand toward the viewer with a small round core on the back of the hand and fine filaments running from it to each fingertip, one filament lit (Insight rose #EB95B7). The same leather, stitching and wear level on all four, the same scale (the glove fills about 85% of the canvas height). Only the glow differs, and only inside the lens or window.

**Family paragraph for the Toxin vial** (paste after the style block):

**Consumables, tools, lights, food, documents, loot** (misc). Small objects drawn large: fill about 75% of the canvas, one object (or one tidy group), three-quarter view. Packaging and containers are blank (no labels, no text). Mana containers (cores, essence, plates) glow softly from inside, never as a bloom. Medical goods use a small plain stitched plus mark, never a real-world cross emblem or logo.

**148. `focus-attuner.png`** | Attuner | Insight arms (coming in Classes 3.0; added 13 Nov)
> **Subject:** The Insight focus, the fourth standard glove of the gear companies' line, coming in Classes 3.0 (not yet in items.json; see docs/design/bonds-spec.md, 0.4 kg, off hand, one hand). Its wearer feels the people around them, friend or foe: fine threads run from the glove to whoever is Bonded. A hand-worn glove, back of the hand toward the viewer, no hand inside. **Silhouette feature:** a small round core set on the back of the hand, and from it a fan of very fine filaments laid along the back of the hand and each finger to its fingertip (five thin lines, one to each tip, like the veins of a leaf), with one of the five filaments lit; fingers slightly curled as if just closed on a thread. The cuff is plain. **Materials and accent:** the same pale ceramic and dark grey leather as the Visualizer, thin brass-grey wire for the filaments; accent: Insight rose #EB95B7, only in the small core and in the one lit filament, contained, no bloom. **At 32 px:** Against the Evoker (angular, one hexagonal window) and the Visualizer (palm out, big lens): the Attuner is back-of-hand with a round dot and a fan of thin lines to the fingertips, one of them rose.

**149. `consumable-toxin_vial.png`** | Toxin vial | Underworld / Operatives (coming in Classes 3.0; added 13 Nov)
> **Subject:** One dose of toxin: the Operative coats a weapon with it (a blade's edge, an arrow, a thrown weapon, a gun's next rounds) and the hit leaves its target Weakened, Slowed or Bleeding. A pack item, used up. Not in items.json yet (see docs/design/rev4-primitives.md section 3.7). **Silhouette feature:** a slim, flat-sided glass phial with a wax-sealed neck and a small dropper cap, laid at a slight diagonal, a leather loop around its neck, and two pale hatch bars painted across the glass as a plain warning band (no symbol, no skull, no text). **Materials and accent:** dark glass, brass dropper cap, oilcloth tie; accent: Perception sea-teal #40BAA0 liquid, a muted tint inside the glass only. **At 32 px:** Against the stim injector (a white pen) and the Essence of Experience (a round ampoule with a cork collar, gold-white): a thin dark phial with a teal fill and a dropper cap.

Save as `art/icons/gear/focus-attuner.png` and `art/icons/gear/consumable-toxin_vial.png`.

---

## Job 3: Figment portraits (6, skill-portrait mode)

**Why portraits and not sprites:** units in this game are drawn as **round tokens with a face** on the map, in the turn bar
and in the Figments group (a unit's portrait cropped to a circle); the map object sprites are static top-down props
(crates, doors, lamps), and a Figment is a unit with HP that someone acts through. So each Figment form gets a **4:5
portrait**, shown cropped to a circle at 40 to 64 px: **keep the whole subject inside the central circle of the image**
and make the silhouette read at 40 px. A Figment is a thing the bots build, so it is drawn in the **abstract skill
portrait** mode (faceless, cream gouache and broken ink on black), with **Expression's pigment** (the spec asks for it:
Expression is the attribute of the Visualizer and the Rigger). Mind that Expression's pigment is dark: let **cream carry
every light value** and the petrol blue the shadow and the accents, so the tiny crop is not muddy.

**Attach to every Figment portrait prompt:** `art/icons/skills/visualization.png` (Expression's own alpha skill: the
pigment and the mark-making), and two of `art/icons/skills/analysis.png`, `art/icons/skills/charisma.png`,
`art/icons/skills/durability.png` for the composition.

**Style block (the guide's "Abstract skill prompt", word for word).** In every prompt below the bracketed fields are
filled by the line after the number; where a line says **Subject:** it **replaces "humanoid"** for that image (five of the
six are not human). **For all six**, the palette field reads: "ONLY Expression deep petrol-blue (#075369, with #14758B as the
lighter and #033443 as the darker value)".

> Create a PHC Heavenprint abstract skill portrait for [skill and meaning], matching the attached newest gestural POC 4-derived reference. One faceless, incomplete humanoid made from opaque cream gouache and broken directional ink marks on pure black. Stature: [distinct build]. Pose: [one instantly readable action and direction]. Preserve readable shoulders, elbows, hands and weight even where body substance dissolves into black. Moderate internal abstraction, no cubist puzzle, realistic anatomy, smooth mannequin, face, clothes or NPC identity. One restrained symbolic cue: [cue]. Palette: black #000000, neutral cream #F2E5C8 and ONLY [attribute hue and permitted lighter/darker values] for every remaining mark and shadow. No unrelated undertones. Strong silhouette at 80 px. Vertical 4:5, 800 × 1000 PNG, no text or border. Borrow Heavenprint's tactile mark-making, not another game's skill composition.

**1. `art/portraits/figments/figment-double.png`** | Double (a copy of you that draws attacks; made of bots)
> **Skill and meaning:** a Figment, the Double: a copy of its owner, built by nanobots. **Subject:** a faceless humanoid, as the template says. **Stature:** average, upright, the same build as a player figure. **Pose:** caught mid-turn toward the viewer, weight on one leg, one hand half raised in greeting, as if mirroring someone who stands where the viewer stands; the edges of its body come apart into tiny squares and flecks, the bots. **Cue:** a second, thinner outline of the same figure offset a hand's width beside it, like an echo.

**2. `art/portraits/figments/figment-eye.png`** | Eye (a small flying sensor that sees for the squad)
> **Skill and meaning:** a Figment, the Eye: a small floating sensor that sees for its owner and the squad. **Subject:** replaces "humanoid": a single floating sphere with one round lens or aperture ringed by a thin cream band, **not** an anatomical eye and with no face; it trails a few fine strands behind it. **Stature:** small, compact, centred. **Pose:** hovering and turned toward the upper right as if looking at something far away. **Cue:** one thin straight sight line leaving the lens toward the upper right edge.

**3. `art/portraits/figments/figment-wall.png`** | Wall (cover you can move)
> **Skill and meaning:** a Figment, the Wall: a slab of cover the owner can shift, built of bots. **Subject:** replaces "humanoid": a broad upright slab, wider than tall, built of countless small cream blocks like bricks, its top edge dissolving into flecks; no humanoid, no face. **Stature:** wide, low and heavy. **Pose:** standing square to the viewer, solid, one lower corner starting to slide sideways as if being pushed along the ground. **Cue:** two short dashes beside the sliding corner showing its motion.

**4. `art/portraits/figments/figment-beast.png`** | Beast (a fast striker; the example calls it a Hound)
> **Skill and meaning:** a Figment, the Beast: a fast striker built from bots, a hound made of cream marks. **Subject:** replaces "humanoid": a lean four-legged hound-shape with no face and no eyes, only a long muzzle and ears as marks; its hind end and tail dissolve into flecks. **Stature:** low, lean, long. **Pose:** mid-leap toward the upper right, forelegs reaching, hind legs just leaving the ground, the whole body stretched. **Cue:** a few long speed marks trailing from its haunches.

**5. `art/portraits/figments/figment-blade.png`** | Blade (a floating blade that holds a tile and strikes what passes)
> **Skill and meaning:** a Figment, the Blade: a floating blade that guards one tile and cuts what passes. **Subject:** replaces "humanoid": a single long narrow double-edged blade hanging point-down in the air, its edge sharp in cream, with fine bots crowding along the edge like filings; no hilt, no hand. **Stature:** tall and thin, centred. **Pose:** hanging upright and very slightly swaying, point toward the ground, ready. **Cue:** a small ring on the ground under its point, the tile it holds.

**6. `art/portraits/figments/figment-scrap-turret.png`** | Scrap Turret *(Suggested)* (a turret the Rigger builds from salvage; a machine, not a Figment)
> **Skill and meaning:** the Scrap Turret: a crude turret the Rigger knocks together out of a wreck, a dropped weapon or a barricade; it is a machine of salvage, not bots. **Subject:** replaces "humanoid": a rough turret of stacked scrap plates and a wheel, a plain barrel clamped on top and pointing to the right, bolts and welds as broken marks; **angular and welded**, with no dissolving flecks (this one is not made of bots). **Stature:** squat and wide. **Pose:** squared up to the viewer, barrel levelled to the right. **Cue:** one short broken line from the barrel's mouth to show where it points.

---

## What comes back to Claude

File names exactly as above (they are ours; a later rename of a move changes nothing for the artist). Claude adds each to
`art/catalog.json` (Wick icons by folder: `moves`, `shadow`, `tending`, `figments`, and `prayers` for Ward and Sanctuary;
the gear to the `gear` map; the portraits to `characters`-style entries under `figments`), runs `python3 tools/validate_art.py`
(size, palette, pure white ink for the Wick icons) and `npm run assets`, and the game picks them up by name. If the generator
returns an opaque or off-white Wick icon, say so: Claude can cut the background and force the ink to pure white. **Deliver
with** one contact sheet per batch at 32 px and 64 px on `#10151F`.
