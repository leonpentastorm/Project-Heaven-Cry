# GPT prompts, 19 Nov 2026, file 02: the 0.32 skill system, Body (Strength, Agility, Endurance)

For the artist, and for GPT. Source list: `art/briefs/ART-REQUESTS-2026-11-19.md`, section 2 (P1, 0.32), the Strength, Agility and Endurance groups. What each thing does comes from `docs/design/proposals/2026-11-19-attribute-drafts/` (`strength.md`, `agility.md`, `endurance.md`). Every picture below is invented here: change any freely, as long as each stays distinct at 32 px from its neighbours.

**12 pictures: 11 Wick icons and 1 white-ink sign (conditional).** No CHANGE rows exist in these three attributes. Wick's Second Wind (`art/icons/perks/second-wind.png`) is a P0 picture, written in the P0 file, not here.

## How to use

One image a prompt. Paste **the base prompt of its mode (below)**, then the entry's prompt, and attach the references the mode names. Save under the file name given, do not rename. Every delivery is a review candidate until Leon approves it; Claude adds the catalog entries on intake. In-world only: invented shapes, no real-world brands, insignia, religions or characters (a medical mark is a plain plus, never a red cross); no text, letters or numbers in any image.

## Base prompt 1: Wick icon (perks, class moves)

**Attach:** `art/icons/traits/mind-without-fog.png` (the master; leave out its floating cup), and three finished perks from `art/icons/perks/` for line weight (for example `art/icons/perks/bulwark.png`, `art/icons/perks/before-the-blink.png`, `art/icons/perks/bedside-manner.png`; never the perk being drawn). Rule: `art/icons/STYLE-LOCK.md`.

**Size / background:** 1024 x 1024 PNG, fully transparent, Wick centred with clear space round him.

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached reference icons: Wick, the small flame-headed figure of the trait and perk icons, in bold flat white shapes, a confident inked silhouette with a few interior cuts, the same line weight. No outline in another colour, no shading, no gradient, no texture, no glow, no colour and no grey. Wick is the only full figure; anyone else is a partial (a hand, a shoulder, a silhouette cut by the frame). One action, centred, with clear space around it, square, 1024 x 1024 PNG with transparency. It must read at 32 px in a row and at 44 px on a chip: silhouette first, two or three interior cuts at most. No text, no letters, no numbers, no border, no frame. Invented shapes only: nothing recognisable from real-world works, brands, insignia or religions. The icon shows:

**Avoid in every Wick icon:** the cup of Mind Without Fog, any colour, any lettering, a second full figure, a red cross.

## Base prompt 2: white-ink sign (conditions)

**Attach:** `art/icons/traits/mind-without-fog.png` for the ink weight only, and three of `art/icons/conditions/*.png` (for example `art/icons/conditions/witnessed.png`, `art/icons/conditions/braced.png` and `art/icons/conditions/marked.png`).

**Size / background:** 1024 x 1024 PNG, transparent.

> Draw one icon in pure white flat ink (#FFFFFF) on a fully transparent background, in exactly the style of the attached reference icons (bold flat white shapes, a confident inked silhouette with a few interior cuts, the same line weight). No outline in another colour, no shading, no gradient, no texture, no glow, no colour and no grey. This icon is a sign, not a scene: Wick does not appear. One subject, centred, with clear space around it, square, 1024 x 1024 PNG with transparency. It must read at 16 px beside a word and at 48 px on a card: silhouette first, two interior cuts at most. No text, no letters, no numbers, no border, no frame. Invented shapes only. The icon shows:

---

# Strength (ink `#F68A38`)

## 1. `point_man`: Point Man (Guts perk)

- **Save as:** `art/icons/perks/point-man.png` (catalog `perks`, id `point_man`)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card, level-up, skill page
- **Does:** allies within 3 tiles roll their Fear saves with your Guts; the nerve of the one in front is lent to those behind.
- **At icon size it must read as:** one figure out front, small shapes close behind him.

```
Wick striding forward at the very front, chest out, one arm swept back and open toward two small partial silhouettes (a shoulder and a head, cut by the lower edge of the frame) walking close at his back. A short bright arc runs from his lantern heart back over his shoulder to them: his nerve being passed back. The followers are plain cut shapes, no faces.
Avoid: a crowd, a flag or banner, a pointing finger, a leader's crown, a shield wall.
```

## 2. `unflinching`: Unflinching (Guts perk)

- **Save as:** `art/icons/perks/unflinching.png` (catalog `perks`, id `unflinching`)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card
- **Does:** at x3 Momentum or more, melee blows against you are harder to land (-1 to hit): a defence you hold by keeping on.
- **At icon size it must read as:** a planted upright figure with short strokes sliding off him.

```
Wick standing square and planted, feet wide, chin up, his screen face level and steady, arms loose at his sides, not guarding. Three short slanted strokes arrive from the left and each skids off along his shoulder and ribs, bending away into the air beyond him; none of them dents his outline. A small forward chevron sits at his chest, pressing on.
Avoid: a shield, crossed forearms (that is Brace), cracks in his body (that is Unbroken), a wall behind him, impact stars.
```

## 3. `marrow_talk`: Marrow Talk (Intimidation perk)

- **Save as:** `art/icons/perks/marrow-talk.png` (catalog `perks`, id `marrow_talk`)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card
- **Does:** a threat that fails in talk still leaves the listener Shaken (-2 on their next roll against you); in a fight too, a Threaten they save against still shakes them for a round.
- **At icon size it must read as:** a quiet word leaving the speaker and landing as a shiver in someone else.

```
Wick leaning in close with his head tilted, one hand cupped beside his mouth as if speaking low; from the cup a thin straight line runs across the frame into the chest of a partial figure (a shoulder and half a head, cut by the right edge), whose outline is drawn with three small tremor ticks shivering at its edge. The line ends in a tiny sharp barb inside the listener's chest, like a splinter of bone.
Avoid: a speech bubble, letters, a skull, a shouting open mouth, a pointing finger (that is Taunt), a bone pile.
```

## 4. `stare_down`: Stare Down (Intimidation perk, also the action's icon)

- **Save as:** `art/icons/perks/stare-down.png` (catalog `perks`, id `stare_down`; the action `stare_down` points to it too)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card and the combat bar's Stare Down action
- **Does:** before the first turn, one enemy that sees you saves or loses its first turn, and is Shaken for 3 rounds.
- **At icon size it must read as:** two eyes locked and a foe stopped mid-stride.

```
Wick on the left with his pixel-screen face turned straight toward a partial foe silhouette on the right (a hooded head and one shoulder, cut by the frame), one bold bright line of sight running from his screen across the frame to the foe's eye. The foe is caught mid-step: its front foot lifted and its body locked rigid, drawn with two short stillness ticks at the knee. The sight line is the strongest shape in the picture.
Avoid: a literal eyeball, a laser beam with glow, a staring-contest face with eyebrows, a snake or hypnosis spiral, text.
```

## 5. `headlong_paid`: Headlong paid (condition sign, CONDITIONAL)

- **Save as:** `art/icons/conditions/headlong-paid.png` (catalog `condition_icons`)
- **Mode:** white-ink sign (base prompt 2)
- **Shows in:** the status strip, only if its row is shown (decided when built; hold this one until Claude says it is shown)
- **Does:** marks that this turn's Charge was paid for with 2 Momentum instead of AP, so Rolling Start and The Charge Carries build nothing from it.
- **At icon size it must read as:** a forward arrow with a bite out of it.

```
A single bold arrow pointing right, solid, with one clean rectangular notch cut out of its shaft just behind the head, as if a piece of it has been spent; two short ticks trail off behind the notch, falling away. No figure.
Avoid: a coin or a price tag, a curved arrow, a speed-line blur, a circular "no" slash over the arrow, any text or numeral.
```

---

# Agility (ink `#E3BF51`)

## 6. `untouchable`: Untouchable (Athletics perk)

- **Save as:** `art/icons/perks/untouchable.png` (catalog `perks`, id `untouchable`)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card
- **Does:** with no torso armour, attacks on you roll twice and take the worse.
- **At icon size it must read as:** a blow going through empty air where Wick was.

```
Wick sidestepped to the right edge of the frame in a light leaning crouch, capelet flying, no armour on his chest. His previous place on the left is shown only as an empty cut-out of his own outline made of a few small gaps (an after-image of dashes, not a second figure). A single diagonal slash line passes straight through that empty outline and carries on, touching nothing.
Avoid: a ghost or transparent double figure, a shield or armour piece, motion-blur smears, a trail of footprints, cartoon dust clouds.
```

## 7. `shoot_first`: Shoot First (Reaction Speed perk)

- **Save as:** `art/icons/perks/shoot-first.png` (catalog `perks`, id `shoot_first`)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card
- **Does:** you act in the surprise round even when surprised.
- **At icon size it must read as:** one figure already firing while the others have not started.

```
Wick at full extension with an invented compact pistol (a plain angular silhouette, no real model) thrust out in one hand, a short sharp muzzle-flash star already flaring at its tip; behind him at the left edge, two partial silhouettes (a shoulder and a hand each) are only just reaching toward their own holsters, their hands open and empty. The gap in time is the picture: Wick's arm is straight, theirs are still bent.
Avoid: a real gun make, a gunslinger hat or duel stance, smoke clouds, a clock or stopwatch, a bullet in flight drawn as a long streak.
```

## 8. `cut_in`: Cut In (Reaction Speed perk)

- **Save as:** `art/icons/perks/cut-in.png` (catalog `perks`, id `cut_in`)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card
- **Does:** once or twice a scene, cut in on someone mid-sentence or mid-action and act first.
- **At icon size it must read as:** Wick's body stepping between two things that were about to meet.

```
Wick darting in sideways between a partial speaker on the left (an open hand and a shoulder, mid-gesture) and a partial raised blade on the right (a fist and the first third of a short sword, mid-swing), one foot planted in the narrow gap and one arm flung out flat across it like a bar. The two partial figures' gesture lines both stop short at his arms. Wick is the only full figure.
Avoid: a speech bubble or text, a referee's whistle or hand signal, a full second fighter, a clock, a crowd.
```

---

# Endurance (ink `#F65157`)

`second_wind` (Pain Threshold) is a P0 picture: see the P0 file.

## 9. `still_standing`: Still Standing (Pain Threshold perk, also the action's icon)

- **Save as:** `art/icons/perks/still-standing.png` (catalog `perks`, id `still_standing`; the action `still_standing` keeps its id and uses this picture)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card and the combat bar's action
- **Does:** when your HP runs out, one more turn with 3 AP before you fall Downed, once a fight.
- **At icon size it must read as:** a figure on one knee pushing himself up, not lying down and not yet standing.

```
Wick caught halfway between kneeling and standing: one knee still on the ground line, one foot planted, one fist pressed flat against the knee and the other arm hanging, his body hunched but his screen face lifted and facing forward. A thin short vertical line rises from his planted foot to his shoulder, as if he is being lifted from within. Nothing around him.
Avoid: a heart or HP bar, a skull, a halo or wings, lying flat on the ground, blood, a medical plus.
```

## 10. `read_the_air`: Read the Air (Senses perk)

- **Save as:** `art/icons/perks/read-the-air.png` (catalog `perks`, id `read_the_air`)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card
- **Does:** read one tell of someone close: a bonus on your next social roll against them.
- **At icon size it must read as:** Wick noticing one small thing on another person.

```
Wick tilted forward, his screen face turned toward a partial stranger on the right (a head in three-quarter view and a shoulder, cut by the frame), one short bright line from Wick's face to a single small detail on the stranger: the stranger's hand, which is clenched, with two tiny tick marks at the knuckles. Everything else about the stranger stays plain. A small open bracket round that one hand highlights it.
Avoid: a magnifying glass, a detective hat, a lie-detector graph, a cartoon eyeball, a question mark, a speech bubble.
```

## 11. `tremor`: Tremor (Senses perk)

- **Save as:** `art/icons/perks/tremor.png` (catalog `perks`, id `tremor`)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** perk card
- **Does:** nothing moving on the ground in your Vision surprises you, so you act in the surprise round; tier II also starts the fight with Guard.
- **At icon size it must read as:** a hand on the ground and rings spreading from it.

```
Wick crouched low, one palm pressed flat on a short ground line, his head turned sharply to one side as if listening through the floor. Three concentric shallow arcs spread outward along the ground from under his palm, the outermost one broken by a tiny chevron of an approaching shape far off at the right edge of the frame, only a point.
Avoid: a crater, an earthquake crack across the whole frame, a stethoscope, an ear drawn large, debris and dust, a sonar screen.
```

## 12. `reforge`: Reforge (Bulwark rank III class move)

- **Save as:** `art/icons/moves/reforge.png` (catalog `move_icons`, id `move-reforge`)
- **Mode:** Wick icon (base prompt 1)
- **Shows in:** class move card (replaces Reactive Plate)
- **Does:** at the start of your turn, when you hold 1 plate or none, you gain 2 Guard: the plates are mended and set back.
- **At icon size it must read as:** an armour plate with a seam being joined.

```
Wick kneeling beside a single large armour plate propped upright on the ground line, a jagged crack running down its middle; in one hand he holds a short hammer raised to strike and in the other a small pair of tongs pressing the two halves together, with a short row of three small spark-dashes along the seam where the crack is closing and the lower half already runs smooth. The plate and the crack are the biggest shapes.
Avoid: a forge fire or anvil scene, a full suit of armour, a wrench or cog, a shield on his arm, flame texture.
```

---

# Do not redraw

**Strength, REUSE:** door emblem `doors/momentum`; techniques Charge, Grapple, Throw Down, Coup, Cleave, Break; perks Iron Grip (`perks/grapple.png`), Keep Swinging (`breaching-strike`), Earthbreaker, Into the Dark, Nothing Left to Fear, Bone Talk, Grim Reaper, The Name They Whisper; forks Rolling Start, Grindstone, Spill, Headlong; Call Threaten; moves Barrel In (`lunge`), Riposte, Measured Blow (`finisher`), Unstoppable, The Charge Carries, Four Ways to Finish, Launch, Wrecker, Breach. Hand-on: `perks/iron-stomach.png` becomes Steady (`steady`) (Claude moves it).
**Strength, RETIRE:** `moves/heavy-hands.png`, `moves/follow-through.png`.

**Agility, REUSE:** door emblem `doors/pressure`; Slide, Flush Out (`moves/flush-out`); forks Converging Fire, Walk It In, Through the Gap, Lockdown; perks Pressure Point (`both-hands`), Keep Their Heads Down (`running-reload`), Trick Shot, Wall Run, Roll With It, Catch, Never There, Dance of Iron, Charge, Rounding Up, Before the Blink, Between Heartbeats; Vault (`shadow/vault`); Call Cue; moves Fire Discipline, Hold the Lane (`speed-loader`), Special Ammo, Duck and Roll, Killzone, Run and Gun, Reflex, Fire and Move, Relocated, Break Them. Re-file: `moves/speed-load.png` becomes the Speed Load perk (Claude moves it).
**Agility, RETIRE:** `moves/near-miss.png`, `moves/shaken-nerves.png`, `moves/quick-draw.png`.

**Endurance, REUSE:** door emblem `doors/guard`; techniques Guard and Brace; Challenge, Slam; forks Provoke, Cover Them, Stand Fast, Drive; perks Weight of the Wall (`bulwark`), Answer in Kind (`shrug-it-off`), Last Wall, Walking Wounded, Bedside Manner, Wind on the Skin, Skin Map; Call Warn; moves Brace, Retort, Shrug It Off (move), Anchor. Re-file: `moves/close-guard.png` becomes the Close Guard perk. Hand-on: `perks/scar-tissue.png` becomes Numb (`numb`) (Claude moves them).
**Endurance, RETIRE:** `moves/last-plate.png`, `moves/set-against-the-blow.png`, `perks/used-to-the-pain.png`, `moves/unbroken.png`, `moves/reactive-plate.png`.
