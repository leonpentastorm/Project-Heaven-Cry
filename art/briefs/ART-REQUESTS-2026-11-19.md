# Art requests, 19 November 2026: everything for 0.31.x, 0.32.x and the Items 2.0 plan

This is the current full list. It sits on top of [`ART-REQUESTS.md`](ART-REQUESTS.md), the standing file, which is kept as
history and for its direction notes. Start at the top and work down. Every row names its **art mode**. Read these first:

- [`art/style-guide/PHC-Style-Guide.md`](../style-guide/PHC-Style-Guide.md) (the one style guide) and [`art/AGENTS.md`](../AGENTS.md)
- [`art/icons/STYLE-LOCK.md`](../icons/STYLE-LOCK.md) for every Wick icon; the master is [`art/icons/traits/mind-without-fog.png`](../icons/traits/mind-without-fog.png)
- [`art/style-guide/gear-icons.md`](../style-guide/gear-icons.md) for painted gear, [`art/style-guide/weapon-icons.md`](../style-guide/weapon-icons.md) for the line icons (Claude draws those)
- [`art/README.md`](../README.md) for folders, names and the catalog

**The modes used in this file**

| Mode | What it is | Master |
| --- | --- | --- |
| **Wick** | Wick, pure white flat ink, transparent. Perks, fork options, class moves, verbs, Calls | 1024 x 1024 PNG; the pipeline makes the UI sizes (perks 256/128/64/56/48/44/40; moves and forks 128/64/48/44/32/24) |
| **Sign** | White flat ink sign, no Wick. Conditions, banners, interface marks | 1024 x 1024 PNG, transparent |
| **Gear painting** | Heavenprint object icon, one object, three-quarter view, one accent, no text, transparent | 1024 x 1024 PNG, object fills about 80% |
| **Portrait** | Heavenprint painting | 800 x 1000 (4:5), or the size of the set it joins |
| **Kit sprite** | Survival's top-down map piece, matched to its setting's kit | as the other pieces in `art/sprites/kit/<setting>/` |

Words in rows: **NEW** (nothing exists), **CHANGE** (the file exists, the picture must change in the way said), **REUSE**
(exists and stays right; do not redo), **RETIRE** (the file goes to `art/_archive/`; nothing to draw), **PROPOSED** (an id
or count not in data yet; it may change).

---

## 0. Summary

**What he should do first.** Three pictures for today's build (P0): the APPROACH and LEVEL UP banner signs, and Wick's
Second Wind, which serves both the fight bar now and the 0.32 perk. Then the 0.32 skill system (P1): 49 new pictures, one of
them (Second Wind) already made in P0: 46 Wick icons in one consistent set (37 perks, 5 fork options, 3 class moves, 1
verb) and 3 condition signs (one only if shown), plus 3 small changes. Then the live gaps (section 3): 3 class-move icons owed since 0.30 (Called Out,
Wind-up, Read the Swing), 2 mod paintings, the Scrap Turret portrait and the map-kit pieces. **Items 2.0 is a plan, not an
order** (section 4): it is scheduled after 0.32 (0.33 to 0.35), its family tables are not ruled, and nothing in it should be
painted except the small safe batch in 4.6 until Leon answers the questions in 4.8.

**Almost everything already exists.** Of the 333 pictures the 0.32 sheets touch, 247 are reused as they are; 24 retire. All
106 perks, 74 traits, 27 skills, 46 archetypes, 32 fork options, 9 Calls and 72 weapon line icons have art today. Do not
redraw anything in a REUSE row.

**Totals (pictures for the artist)**

| Priority | Wick | Sign | Gear painting | Portrait | Kit sprite | Total |
| --- | --- | --- | --- | --- | --- | --- |
| P0, 0.31.11 / 0.31.12 | 1 | 2 | 0 | 0 | 0 | **3** |
| P1, 0.32 NEW (Second Wind counted in P0) | 45 | 3 (1 only if shown) | 0 | 0 | 0 | **48** |
| P1, 0.32 CHANGE | 3 (1 optional) | 0 | 0 | 0 | 0 | **3** (+1 optional redraw: Pure Heart) |
| Gaps in the live game, firm | 3 | 0 | 2 | 1 | 28 | **34** |
| Gaps, check before drawing | 3 | 0 | 0 | 0 | 0 | **3** |
| **Firm work before Items 2.0** | **52** | **5** | **2** | **1** | **28** | **88** (1 sign conditional; +3 checks, +1 optional) |
| P2, Items 2.0 (PLAN, PROPOSED) | 0 | 0 | 56 new base forms + 23 uniques; grade pictures 56 to 572 by scheme (recommended 215) | 0 | 0 | recommended **294** for 0.34; see 4.3 |
| P2 later: advanced-class weapons (PROPOSED) | | | 46 | | | after Items 2.0 |
| P2 later: Weapon Arts (PROPOSED) | 12 | | | | | if Arts get icons |

RETIRE: 24 files, plus 3 replaced files archived (27); Claude moves them, nothing to draw.

---

## 1. P0: for 0.31.11 and 0.31.12 (being built today)

No art file changed on either 0.31.x branch; the game falls back to text where these are missing, so nothing is blocked.

| id | Name | Mode | Size / format | Where it shows | Direction (what it must read as at icon size) | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `banner-approach` (PROPOSED id) | APPROACH banner mark | Sign | 1024 x 1024 PNG, transparent | The fight's first big banner while no foe has seen the squad (sub-line "Unseen · moving is free"); drawn as a mask in the stripe colour | Stealth before contact: a single footprint, or a squad shape edging into fog. Must stay distinct from the start, won, lost and FREE ROAM marks at banner size | `art/icons/banners/fight-approach.png`; catalog `interface_icons` | NEW. Same family as `banner-fight-start / -won / -lost / -field`: match their weight |
| `banner-level-up` (PROPOSED id) | LEVEL UP banner mark | Sign | 1024 x 1024 PNG, transparent | A new banner shown to the whole room when a character levels (today only a log line and the words LEVEL UP) | Rising: an upward chevron or a figure stepping up a stair, a burst above. Reads as "growth", not "victory" | `art/icons/banners/level-up.png`; catalog `interface_icons` | NEW. Same family as the fight banners |
| `second_wind` (perk, NEW in 0.32) and the Second Wind combat action | Second Wind | Wick | 1024 PNG + perk exports | The combat bar's Second Wind action now (0.31.12), then the 0.32 perk card (Pain Threshold) | Wick catching his breath, one hand to his ribs, back straightening. Not a gust of wind | `art/icons/perks/second-wind.png` (one picture; the action points to it) | NEW. Do **not** reuse `boons/second_wind.png` (a different item, sign style) or the retired Used to the Pain (grimacing Wick with a brick) |

---

## 2. P1: for 0.32 (the skill system)

Grouped by attribute, in its ink colour. Each group: NEW first, then CHANGE, then REUSE (so you know not to redo them), then
RETIRE. All NEW perks and forks are **Wick** icons, 1024 PNG, transparent, STYLE-LOCK; conditions are **Signs**. File names
follow the existing folders: perks `art/icons/perks/<kebab-id>.png`, fork options `art/icons/forks/<system>-<kebab-id>.png`,
class moves and verbs `art/icons/moves/<kebab-id>.png`, conditions `art/icons/conditions/<kebab-id>.png`.

Two kinds of reuse need no drawing but a file move (Claude does them): **re-files** (a picture filed under a move or verb now
serves a perk) and **hand-ons** (a removed perk's picture passes to its successor). They are listed in each group's REUSE.

### Strength (ink `#F68A38`)

**NEW**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `point_man` | Point Man (Guts) | Wick | 1024 | Perk card, level-up, skill page | Wick at the front, allies behind him taking his nerve | `perks/point-man.png` | NEW |
| `unflinching` | Unflinching (Guts) | Wick | 1024 | Perk card | Wick planted, blows glancing off him | `perks/unflinching.png` | NEW |
| `marrow_talk` | Marrow Talk (Intimidation) | Wick | 1024 | Perk card | A threat said quietly that leaves the listener rattled | `perks/marrow-talk.png` | NEW |
| `stare_down` | Stare Down (Intimidation) | Wick | 1024 | Perk card (the action `stare_down` can point to it) | Wick locking eyes, the foe frozen mid-step | `perks/stare-down.png` | NEW; the action has no icon today either |
| `headlong_paid` | Headlong paid (condition) | Sign | 1024 | Status strip, only if its row is shown | A forward arrow with a notch taken out of it: momentum spent | `conditions/headlong-paid.png` | NEW, **conditional**: draw only if the status strip shows it (decided when built) |

Wind-up and Read the Swing (Breaker) are owed from 0.30, not 0.32: section 3.

**REUSE (do not redo):** door emblem `doors/momentum`; techniques Charge, Grapple, Throw Down, Coup, Cleave, Break; perks
Iron Grip (`perks/grapple.png`, already keyed to `iron_grip`), Keep Swinging (`breaching-strike`), Earthbreaker, Into the
Dark, Nothing Left to Fear, Bone Talk, Grim Reaper, The Name They Whisper; forks Rolling Start, Grindstone, Spill, Headlong;
Call Threaten; moves Barrel In (`lunge`), Riposte, Measured Blow (`finisher`), Unstoppable, The Charge Carries, Four Ways to
Finish, Launch, Wrecker, Breach. Hand-on: `perks/iron-stomach.png` becomes **Steady** (`steady`).

**RETIRE:** `moves/heavy-hands.png`, `moves/follow-through.png`.

### Agility (ink `#E3BF51`)

**NEW**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `untouchable` | Untouchable (Athletics) | Wick | 1024 | Perk card | A blow passing through the place Wick just left | `perks/untouchable.png` | NEW |
| `shoot_first` | Shoot First (Reaction Speed) | Wick | 1024 | Perk card | Wick already firing while the others are still reaching for theirs | `perks/shoot-first.png` | NEW |
| `cut_in` | Cut In (Reaction Speed) | Wick | 1024 | Perk card | Wick stepping in front of a speaker or a blow | `perks/cut-in.png` | NEW |

**REUSE:** door emblem `doors/pressure`; Slide, Flush Out (`moves/flush-out`); forks Converging Fire, Walk It In, Through the
Gap, Lockdown; perks Pressure Point (`both-hands`), Keep Their Heads Down (`running-reload`), Trick Shot, Wall Run, Roll With
It, Catch, Never There, Dance of Iron, Charge, Rounding Up, Before the Blink, Between Heartbeats; Vault (`shadow/vault`, now
the Athletics action); Call Cue; moves Fire Discipline, Hold the Lane (`speed-loader`), Special Ammo, Duck and Roll, Killzone,
Run and Gun, Reflex, Fire and Move, Relocated, Break Them. Re-file: `moves/speed-load.png` becomes the **Speed Load** perk.

**RETIRE:** `moves/near-miss.png`, `moves/shaken-nerves.png`, `moves/quick-draw.png`.

### Determination (ink `#9D7ADC`)

**NEW**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `soul_modules.second_school` | Two Schools (Will Power verb) | Wick | 1024 | The verb button and the design card | Wick holding one Outburst that carries a second, fainter school inside it | `moves/two-schools.png` (PROPOSED name) | NEW |
| `poker_face` | Poker Face (Composure) | Wick | 1024 | Perk card | Deadpan Wick, nothing on his face while chaos goes past | `perks/poker-face.png` | NEW. The old You Get Used to It (umbrella and a small bot) does not fit |
| `stand_still` | Stand Still (Composure) | Wick | 1024 | Perk card | Wick motionless while the fight moves past him | `perks/stand-still.png` | NEW |
| `lore_ward` | Warding Word (Lore Master) | Wick | 1024 | Perk card | A spoken ward settling over an ally | `perks/lore-ward.png` | NEW; shown as "Warding Word" |
| `recitation` | Recitation (Lore Master) | Wick | 1024 | Perk card | A Call spoken aloud, a heart calming beside it | `perks/recitation.png` | NEW |

**CHANGE**

| id | Name | Mode | What changes | Saved as |
| --- | --- | --- | --- | --- |
| `fork.soul.blood_price` | Blood Price | Wick | The rule is now "being burned charges the next Release": the blood must flow **into** the Release, not out of Wick to pay for a Pump | `forks/soul-blood-price.png` (old file archived) |
| `pure_heart` (optional) | Pure Heart (Composure) | Wick | Today a sign-style heart and star, not Wick; it does not match the perk set. Redraw as Wick only if there is time | `perks/pure-heart.png` (re-filed from `moves/pure-heart.png`) |

**REUSE:** door emblem `doors/outburst`; Overdraw; forks Ride the Edge, Slow Burn, Clean Break; perks Clenched Heart
(`heart-overload`), Resonance, The Twin Pays, Flat Line, Still Water, Rite in the Field, True Name; Call Name It; moves Shape,
Iron Heart, Storm Front, Occult Library, Heart Surge, Eye of the Storm. Re-file: `moves/pure-heart.png` becomes the **Pure
Heart** perk. Hand-on: `perks/old-tongue.png` becomes **Old Tales** (`old_tales`).

**RETIRE:** `perks/you-get-used-to-it.png`.

### Endurance (ink `#F65157`)

**NEW**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `second_wind` | Second Wind (Pain Threshold) | Wick | 1024 | | **In P0 above**: one picture | `perks/second-wind.png` | counted in P0 |
| `still_standing` | Still Standing (Pain Threshold) | Wick | 1024 | Perk card; the action keeps its id | Wick on one knee, rising for one more turn | `perks/still-standing.png` | NEW |
| `read_the_air` | Read the Air (Senses) | Wick | 1024 | Perk card | Wick reading a stranger's tell | `perks/read-the-air.png` | NEW |
| `tremor` | Tremor (Senses) | Wick | 1024 | Perk card | Wick with a palm on the ground, ripples spreading | `perks/tremor.png` | NEW |
| `reforge` | Reforge (Bulwark rank III) | Wick | 1024 | Class move card | Wick re-welding a cracked armour plate | `moves/reforge.png` | NEW; replaces Reactive Plate |

Called Out (`defender.draw_fire`) is a live gap: section 3.

**REUSE:** door emblem `doors/guard`, techniques Guard and Brace; Challenge, Slam; forks Provoke, Cover Them, Stand Fast,
Drive; perks Weight of the Wall (`bulwark`), Answer in Kind (`shrug-it-off`), Last Wall, Walking Wounded, Bedside Manner,
Wind on the Skin, Skin Map; Call Warn; moves Brace, Retort (`moves/retort.png`), Shrug It Off (move), Anchor. Re-file:
`moves/close-guard.png` becomes the **Close Guard** perk. Hand-on: `perks/scar-tissue.png` becomes **Numb** (`numb`).

**RETIRE:** `moves/last-plate.png`, `moves/set-against-the-blow.png`, `perks/used-to-the-pain.png`, `moves/unbroken.png`,
`moves/reactive-plate.png`.

### Expression (ink `#5394AC`)

**NEW**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Hard Light (fork, PROPOSED id) | Hard Light | Wick | 1024 | Fork card, level-up | Figments made of dense, solid light: tougher, they do not snap | `forks/figment-hard-light.png` | NEW |
| Sharp Light (fork, PROPOSED id) | Sharp Light | Wick | 1024 | Fork card | Figments of cutting light; a kill gives another action | `forks/figment-sharp-light.png` | NEW |
| Many Hands (fork, PROPOSED id; must differ from the perk `many_hands`) | Many Hands | Wick | 1024 | Fork card | Wick holding several Figments at once | `forks/figment-many-hands.png` | NEW; not the Camaraderie perk's picture |
| Masterwork (fork, PROPOSED id) | Masterwork | Wick | 1024 | Fork card | One Figment named and finer than the rest | `forks/figment-masterwork.png` | NEW. A small mark on that Figment's token may also be wanted: unknown whether the token is drawn in code |
| `field_repair` | Field Repair (Improvisation) | Wick | 1024 | Perk card; the action keeps its id | Wick with a spanner on a jammed weapon | `perks/field-repair.png` | NEW |
| `tuned` | Tuned (Improvisation) | Wick | 1024 | Perk card | Wick tuning his weapon by ear | `perks/tuned.png` | NEW |
| `jury_rig` | Jury-Rig | Wick | 1024 | Perk card | A destroyed Figment's pieces banked as spare effort for Wick (+1 AP) | `perks/jury-rig.png` | NEW picture for a kept id: the old one (a jammed gun firing once more) now lies. Old file archived |
| `smooth` | Smooth (Charisma) | Wick | 1024 | Perk card | Wick talking his way out of a lie | `perks/smooth.png` | NEW |
| `talks_broke_down` | Parley (renamed) | Wick | 1024 | Perk card | Wick talking an enemy leader down across a table | `perks/talks-broke-down.png` | NEW picture for a kept id: the old table-flip is only tier II now. Old file archived |
| `showman` | Showman (Charisma) | Wick | 1024 | Perk card | Wick bowing while a Figment takes the stage | `perks/showman.png` | NEW |
| `trickster.quick_sketch` | Quick Sketch (Rigger) | Wick | 1024 | Class move card | One fast stroke and a Figment stands up out of it | `moves/quick-sketch.png` | NEW; replaces Field Fix |

**REUSE:** door emblem `doors/figment`; Picture; all ten forms (line icon and painted portrait each: Double, Snare, Hand,
Eye, Wall, Ward, Beast, Blade, Husk, Sentinel); Glimmer; orders Cash in, Redraw, Let go; perks Many-Eyed Dream (`mirage`),
Wake of the Kill (`blueprint`), Solid Image, Hot-Swap, Overhaul, Crowd Pleaser, Everyone's Friend; Call Rally; moves Double
(`double`), Salvage, Redline (`overclock`), Sleight, Scrap Sentinel (`scrap-turret`). `moves/field-fix.png` stays in place (its
move goes back to the shelved pool).

**RETIRE:** none.

### Insight (ink `#EB95B7`)

**NEW**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `hand_off` | Hand-Off (Camaraderie) | Wick | 1024 | Perk card | Wick lending his guard to a friend | `perks/hand-off.png` | NEW |
| `nobody_left_behind` | Nobody Left Behind | Wick | 1024 | Perk card | Wick over a fallen friend, hand out to raise him | `perks/nobody-left-behind.png` | NEW |
| `steady_hands` | Steady Hands | Wick | 1024 | Perk card | Two hands settling a shaking friend | `perks/steady-hands.png` | NEW. Rally Cry (Wick with a banner) does not fit |
| `pull_together` | Pull Together | Wick | 1024 | Perk card | A friend hauled out of danger on a line | `perks/pull-together.png` | NEW. Soulmate does not fit |
| `quiet_thread` | Quiet Thread (Insinuation) | Wick | 1024 | Perk card | A thread laid slack, Wick unseen at its far end | `perks/quiet-thread.png` | NEW |

**CHANGE**

| id | Name | Mode | What changes | Saved as |
| --- | --- | --- | --- | --- |
| `veiled_insult` | Veiled Insult (Insinuation) | Wick | Start from `perks/sweet-talker.png` (a rose, heart eyes): make the rose barbed and the eyes sly, not heart-shaped | `perks/veiled-insult.png` |

**REUSE:** door emblem `doors/bond`; Tending verbs Bond, Let Go, Threads, Mend, Mend Yourself, Snap, Shield, Bonds held 5
and 8, and Settle, Soothe, Raise, Last Thread, Tug, Guide; forks Keep the Thread, Short Thread, Shared Pulse, Long Thread;
perks Taut Thread (`shared-breath`), Bitter Balm (`lay-down-arms`), Many Hands, Open Hand, Their Own Idea; Call Taunt; moves
Triage, The Ledger, Inspire, Take the Weight, Brimming, Rally, Field Surgery. Re-file: `tending/hold-down.png` becomes the
Mastered perk **Threads That Hold**. Hand-on: `perks/double-meaning.png` becomes **Between the Lines**.

**RETIRE:** `tending/touch.png`, `moves/feel-their-pain.png`, `moves/mercy.png`, `perks/soulmate.png`, `perks/rally-cry.png`.

### Intelligence (ink `#8BDEEE`)

**NEW**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `index` | Index (Rumination) | Wick | 1024 | Perk card | Wick consulting a reference | `perks/index.png` | NEW |
| `proven_formula` | Proven Formula (Rumination) | Wick | 1024 | Perk card | A worked formula, checked off | `perks/proven-formula.png` | NEW |
| `objection` | Objection! (Eloquence) | Wick | 1024 | Perk card | Wick with a finger raised at a witness stand | `perks/objection.png` | NEW. Burden of Proof (Wick hauling a weight) does not fit |
| `opening_argument` | Opening Argument | Wick | 1024 | Perk card | Wick addressing the enemy leader across a field | `perks/opening-argument.png` | NEW |
| `thinking_aloud` | Thinking Aloud | Wick | 1024 | Perk card | Wick talking while a glyph is drawn beside him | `perks/thinking-aloud.png` | NEW |
| `backdraft` | Backdraft (Sigilist) | Wick | 1024 | Class move card | An Evoker overloading, a ring of flame at the caster's feet | `moves/backdraft.png` | NEW; replaces Overcharge |

**CHANGE**

| id | Name | Mode | What changes | Saved as |
| --- | --- | --- | --- | --- |
| `fork.sigil.running_script` (optional) | Running Script | Wick | The rule is now "after an Evoke the next glyph is free": add a second glyph half-drawn beside the lit one. It reads close enough as it is | `forks/sigil-running-script.png` |

**REUSE:** door emblem `doors/sigil`; Overclock (`overclock-sigil`), Twin Draw; forks Overflux, Clean Vent, Written in
Advance; perks Second Clause (`hold-the-stroke`), Running Hand (`parallel-thought`), Clean Draw, Footnote, Lab Coat,
Established Fact, Overruled!, Closing Argument; Call Brief; moves Barrage, Core Change, Bleed the Flux, Payload, Stored Spell.

**RETIRE:** `perks/burden-of-proof.png`, `moves/overcharge.png`.

### Perception (ink `#40BAA0`)

**NEW**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `quick_read` | Quick Read (Acuity) | Wick | 1024 | Perk card | Wick sizing up a foe at a glance | `perks/quick-read.png` | NEW (the Analyze action has no icon either) |
| `read_them` | Read Them (Acuity) | Wick | 1024 | Perk card | Wick marking a foe's pattern; the squad takes less from it | `perks/read-them.png` | NEW |
| `darkened` | Darkened (condition) | Sign | 1024 | Status strip and token (Lightkiller: less sight for 2 rounds) | An eye with its view cut short by dark | `conditions/darkened.png` | NEW |

**REUSE:** door emblem `doors/shadow`, Hide, Go to Ground, First Shade, Break; Tag, Lift, Decoy, Ghost Kill, Fade, Cut the
Strap, Open Seam, Timing; Pick, Disable, Rig, Hijack; forks Light Fingers, Lend the Dark, Lightkiller, Spotter; perks Long
Dark (`sleight-of-hand`), Shadow Step, Vanishing Act, Pattern Lock, Case Closed, Cold Spine (`eyes-in-the-back`), The Tell
(`detectives-eye`), Got You in My Sight, Nothing Gets Past; Call Spot; moves Mark (`shadow/mark`), Vanish, Toxin, Sabotage,
Execution, Called Shot; Parting Cut and Case unchanged. Re-files: `moves/still-breath.png` becomes the **Still Breath** perk;
`shadow/read-intent.png` becomes the **Read Intent** perk.

**RETIRE:** `shadow/plant.png`, `shadow/foul.png`, `shadow/douse.png`, `moves/close-quarters.png`, `moves/shadow-run.png`.

### Virtue (ink `#D36A90`)

**NEW**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `fork.prayer.held_breath` | Swift Psalm (renamed) | Wick | 1024 | Fork card | A short prayer said quickly: the wait between prayers cut short | `forks/prayer-held-breath.png` (id kept) | NEW picture for a kept id: the old one (a light held cupped, unspoken) now lies. Old file archived |
| `righteous` | Righteous (Conscience) | Wick | 1024 | Perk card | A healing hand on a wounded ally | `perks/righteous.png` | NEW |
| `foresight` | Foresight (Conscience) | Wick | 1024 | Perk card | Wick glancing ahead, a ghost image of the coming blow | `perks/foresight.png` | NEW |
| `five_stars` | Five Stars (Authority) | Wick | 1024 | Perk card | Wick wearing a general's stars, the squad surging forward | `perks/five-stars.png` | NEW |
| `commanding_voice` | Commanding Voice (Authority) | Wick | 1024 | Perk card | Wick's voice unbroken, a gag ring shattering | `perks/commanding-voice.png` | NEW |
| `blessed_aim` | Blessed Aim (condition) | Sign | 1024 | Status strip (Benediction: +1 to hit for 2 rounds) | A reticle under a small blessing mark. Must differ from Canticle Rising, which it copies today | `conditions/blessed-aim.png` | NEW; `canticle-rising` is the stand-in |

**REUSE:** door emblem `doors/prayer`; the seven Whispers, Hymns, Miracles; Name the Sinner (`moves/deliver-the-sinner.png`,
relabelled); forks Steadfast, Round of Blessings, Benediction; perks Unbroken Litany (`litany`), Sinner's Due
(`holy-ordnance`), Judgement Day, Clean Hands, Red Line, Foreseen, Outclassed, On My Mark; Call Order; moves Smite, Under the
Eye, Blessed Arms, Verdict, At Your Side, Canticle, Amen, Holy Dread, Last Rites; condition Judged. Hand-on:
`perks/real-power.png` becomes **Rank Has Privileges**. The Chaplain's Ward and Sanctuary are gaps: section 3.

**RETIRE:** `moves/answered-prayer.png`.

---

## 3. Gaps in what is live today

**Firm**

| id | Name | Mode | Size | Where it shows | Direction | Saved as | Reuse note |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `move-draw-fire` (`class:defender.draw_fire`) | Called Out (Bulwark rank I) | Wick | 1024 | Class move card, fight bar | Wick shouting a foe's attention onto himself, shield up | `moves/draw-fire.png` (replaces the placeholder `draw-fire.svg`) | NEW. The last placeholder in the move icons |
| `class:fighter.wind_up` | Wind-up (Breaker) | Wick | 1024 | Class move card | Wick drawing back a heavy swing, weight on the back foot | `moves/wind-up.png` | NEW, owed since 0.30. The data link is also missing (code) |
| `read_the_swing` | Read the Swing (Breaker) | Wick | 1024 | Class move card | Wick watching a blow come, already leaning out of its path | `moves/read-the-swing.png` | NEW, owed since 0.30 |
| `mod_follow_guard` | Shield follow (mod) | Gear painting | 1024 | Backpack, shop, Forge | A shield fitting: a strap and bracket that keeps the shield following the arm | `gear/mod-follow_guard.png` | NEW |
| `mod_afterword` | Afterword's edge (mod) | Gear painting | 1024 | Backpack, Forge | A fitted edge for the reversed-grip knife; one accent | `gear/mod-afterword.png` | NEW; match `weapon-afterword` |
| `figment-scrap-turret` (portrait) | Scrap Turret / Scrap Sentinel | Portrait | as the 14 in `art/portraits/figments/` | Figment card for the Rigger's turret | A turret assembled from scrap and light, same set as the other Figment portraits | `art/portraits/figments/figment-scrap-turret.png` | NEW; only the line icon exists |
| `kit-ahoc-dress-2`, `kit-ahoc-ground-2`, `kit-rim-wall-corner`, `kit-shrine-ground-2` | Four held-back kit pieces (old S8 fixes) | Kit sprite | as their kit | Survival fight maps | Re-do to match their setting's set; see S8 in `ART-REQUESTS.md` | same file names in `art/sprites/kit/<setting>/` | CHANGE (4) |
| `poi`, `sigil_wall`, `sigil_mark`, `pile` x 6 settings (ahoc, city, field, works, shrine, rim) | Point of interest, Sigil wall, Sigil mark, ground pile | Kit sprite | as their kit | Survival fight maps; a plain glyph shows today | One piece per object per setting (24). The pile is what lies on a tile: a small heap of kit | `art/sprites/kit/<setting>/poi.png`, `sigil_wall.png`, `sigil_mark.png`, `pile.png` | NEW (24). Lowest of the firm rows |

**Check before drawing** (a data link may answer them)

| id | Name | Mode | Where it shows | Note |
| --- | --- | --- | --- | --- |
| `guardian.ward` | Ward (Chaplain) | Wick | Class move card | No move icon. `prayers/whisper-ward.png` exists: the move may point to it instead (code). If a new one is wanted: `moves/ward.png` |
| `guardian.sanctuary` | Sanctuary (Chaplain) | Wick | Class move card | No move icon. `prayers/hymn-sanctuary.png` exists: same choice. If new: `moves/sanctuary.png` |
| `visualizer_core` | Load the Visualizer (verb) | Wick | Visualization verbs | No key. Unknown whether a screen asks for it. If new: `moves/load-the-visualizer.png` |

**Known and not asked for** (so nobody asks again)

- 41 `given_<feeling>` and `foe_<feeling>` condition states: left off on purpose (lead's ruling, 17 Nov).
- `figment_claws`, `figment_edge`: companion-only, no painting needed (line icons exist).
- The 20 weapon and focus variants and their 12 modifier kinds: show their base's picture; words only.
- Campaign cards for `curse`, `godplot`, `own`, `summoning` (share `world-pilot`): left off on purpose.
- Maps M1 (Proving Ground) and M6 (Open ground) have layouts but wait for Leon; M2 to M5 wait for the M813 rewrite; M7 to M9
  wait for their campaigns. See `ART-REQUESTS.md` section 3.
- At risk, do not redraw: Heart Overload and Resonance (until the balance pass).
- `keeper-works` and `keeper-rim` do not match their faces' names: Leon chooses a rename or a repaint (question 14).

---

## 4. P2: Items 2.0, a PLAN, not an order

**Timing.** Items 2.0 comes after 0.32 is live: 0.33 the system on today's art, 0.34.x the content as art lands, 0.35 Weapon
Arts. Every new form name below is **PROPOSED** and every count that rests on one is PROPOSED. Leon has ruled the shape
(families of three forms, five grades, uniques, advanced-class weapons, shield and armour families), not the tables.

### 4.1 What exists today (the equipment audit)

- **Two pictures per item id.** A painted gear icon (`art/icons/gear/<kind>-<id>.png`, 1024, 173 in the catalog, all review
  candidates) and a monoline line icon (`art/icons/{weapons,armour,focus}/<id>.svg`, 92: 69 weapons, 19 armour and shields,
  4 foci). The game shows the painting where it exists, else the line icon.
- **72 weapon rows**, all painted except `figment_claws` and `figment_edge` (not needed). 16 armour pieces, 5 body-armour
  classes (painted, no line icon), 3 shields, 4 foci, 20 mods painted (2 missing: section 3), 12 calibres of loose rounds, 12
  magazine pictures shared across guns, materials, tools, food and the rest: all painted.
- **No grade picture exists.** The rule is already written: grade shows by finish and wear, never a coloured border; the
  Standard picture is the master; grade files are `<stem>--<tier>.png` (`gear-icons.md`). Today the UI shows grade as a word
  and ◆ marks.
- **Shared by lookup:** variants show their base's picture; one magazine picture serves several guns; rounds are per calibre.

### 4.2 Reuse map

| Kind | Items | Fate |
| --- | --- | --- |
| Become a family's Standard form, unchanged | Melee 17 (`combat_knife`, `sabre`, `legion_gladius`, `katana`, `kemizuchi_duelling_blade`, `hatchet`, `war_axe`, `lance`, `glaive`, `maul`, `adamantile_greatsword`, `ork_machete`, `striking_gloves`, `hand_wraps`, `knuckledusters`, `kemizuchi_strikers`, `iron_mitts`); guns 21; bows 4; shields 3; armour 19 (14 worn pieces and the 5 torso classes). **64** | Carry over; only roles change |
| Graded one-offs, unchanged | `afterword` (the first unique), `ork_rip_saw`, `hellraiser_servo_fist`, `throwing_knives`, `blackpoint_700`, `hellraiser_rotary`, `smetanita_thumper`, `breacher_tube`, `purifier_flamer` (9) | Carry over; grade pictures by the chosen scheme |
| Outside grading, unchanged | `fists`, 6 grenades, 4 foci (question 8), `quiver`, 2 trait props (`smiling_mask`, `prescription_glasses`), 20 mods, magazines, rounds, ammo, materials, tools, food, documents | Carry over |
| The 20 variants | Show their base | No art; random modifiers change names only |
| Change role later | 8 mana weapons (`core_rifle`, `spellslinger_pistol`, `evoker_blade`, `emanator_gauntlet`, `emanator_katana`, `lumeri_censer_gun`, `bot_thread_banner`, `grand_staff`) | Tier 1 of advanced-class weapons (4.4) |
| Archive only on Leon's word | `ration_pack`, `chalk_and_wax`, `prayer_beads`, `cigarettes`, `grimoire` (if cut rather than given uses) | Hold |
| Not needed | `figment_claws`, `figment_edge`; the veil slot (no item) | Nothing to make |
| `ART-REQUESTS.md` row E1 (a separate large "inspect view" painting) | The 1024 masters already serve as the large view | Recommend retiring the row |

**Honest silhouette reuse.** One painting can stand for a future form only when the gross shape and hand pose match (a sabre
can stand for a cutlass; it cannot stand for a straight stabbing blade). A different faction accent means a new painting. The
full table of what each existing picture can and cannot stand for is in the equipment audit, section 4; the short version:
families are honest within one silhouette (short straight blades, curved blades, great swords, axes, mauls, polearms,
staves, flat pistols, revolvers, SMGs, drum guns, service rifles, marksman rifles, shotguns, belt-fed guns, launchers, bows,
crossbows, grenades, gloves, shields), and never across them.

### 4.3 Family tables (PROPOSED forms; Leon has not ruled them)

Forms: melee Dexterity / hybrid / Strength; guns and bows close / standard / long; shields and armour light / standard /
heavy. `id` = exists and painted; *italic* = PROPOSED new form.

**Melee (12 families, 36 forms: 17 exist, 19 new)**

| Family | Forms | New |
| --- | --- | --- |
| Service knives | `combat_knife` / *trench knife* / *bolo* | 2 |
| Cavalry blades | `sabre` / *cutlass* / *falchion* | 2 |
| Legion blades | *pugio* / `legion_gladius` / *spatha* | 2 |
| Eastern blades | *wakizashi* / `katana` (becomes hybrid) / *odachi* | 2 |
| Kemizuchi duelling | `kemizuchi_duelling_blade` / *side-sword* / *sword-breaker* | 2 |
| Axes | *tomahawk* / `hatchet` / `war_axe` | 1 |
| Polearms | `lance` / `glaive` / *poleaxe* (see question 3) | 1 |
| Hammers | *war pick* / *war hammer* / `maul` | 2 |
| Great blades | *estoc* / *longsword* / `adamantile_greatsword` | 2 |
| Ork cutters | *skinner* / `ork_machete` / *cleaver-glaive* | 2 |
| Hand-to-hand (gloves) | `striking_gloves` / `hand_wraps` / `knuckledusters` | 0 |
| Heavy fists (gloves) | `kemizuchi_strikers` / *weighted gloves* / `iron_mitts` | 1 |

If every weapon stays its own family (Leon's "do not squeeze" reading), new forms rise to up to 42.

**Guns (12 maker lines, 36 forms: 21 exist, 15 new); 5 heavies stay one-offs**

| Line | Forms | New |
| --- | --- | --- |
| G1 Service sidearms | `parlour_pistol` / `service_pistol` / `magistrate_pistol` | 0 |
| G2 Revolvers | *snub revolver* / `drifter_revolver` / `frontier_hand_cannon` | 1 |
| G3 DECRKM automatics | `decrkm_autopistol` / `decrkm_smg` / *DECRKM carbine* | 1 |
| G4 Legion automatics | `legion_pdw` / `legion_bullpup` / *Legion marksman rifle* | 1 |
| G5 Whisper (silent) | *whisper pistol* / `whisper_smg` / *whisper carbine* | 2 |
| G6 Mandestra drum guns | *drum pistol* / `mandestra_drum_gun` / *drum rifle* | 2 |
| G7 Hellraiser line | *trench carbine* / `hellraiser_service_rifle` / `hellraiser_lmg` | 1 |
| G8 Adamantile battle rifles | *Adamantile carbine* / `adamantile_battle_rifle` / *Adamantile heavy rifle* | 2 |
| G9 Precision rifles | `lever_carbine` / `ccec_marksman_rifle` / `long_rifle` | 0 |
| G10 Break-action shotguns | `sawn_off` / `coach_gun` / *fowling gun* | 1 |
| G11 Brigade auto shotguns | *shot-pistol* / `brigade_auto_shotgun` / *drum shotgun* | 2 |
| G12 Lumeri scatterguns | *hand scatter* / `lumeri_scattergun` / *long scatter* | 2 |

**Bows (2 families, 6 forms, 2 new):** B1 *short bow* / `recurve_bow` / `longbow`; B2 `repeating_crossbow` / `crossbow` /
*arbalest*. The 6 grenades are consumables: no forms, no grades.

**Shields (3 families, 9 forms, 6 new; family shape ruled by Leon, names are the lead's):** Guard `buckler` /
`riot_shield` / `pavise`; Strike *spiked buckler* / *boss shield* / *ram plate*; Ward *deflector* / *bulwark screen* /
*barrier wall*.

**Armour (11 families, 33 forms, 14 new; Leon ruled the pattern, the slot table is PROPOSED)**

| Slot | Family | Forms | New |
| --- | --- | --- | --- |
| head | Helmets | `field_helmet` / `ballistic_helmet` / *assault helm* | 1 |
| head | Hoods (Shadow line) | *cowl* / *hood* / *blackout hood* | 3 |
| head_accessory | Optics | *spotter's monocle* / `night_goggles` / *sight visor* | 2 |
| head_accessory | Respirators | *breather* / `gas_mask` / *sealed visor* | 2 |
| torso_outer | Vests | Light / Medium / Heavy (`armour:1` to `armour:3`) | 0 |
| torso_outer | Plate | *breacher plate* / Assault (`armour:4`) / Juggernaut (`armour:5`) | 1 |
| inner_torso | Undershirts | `padded_undershirt` / *mesh undersuit* / `trauma_plate` | 1 |
| lower_torso | Belts | `utility_belt` / *rig belt* / `armoured_belt` | 1 |
| legs | Legwear | `runner_trousers` / *field trousers* / `armoured_greaves` | 1 |
| hands | Worn gloves | `work_gloves` / *tactical gloves* / `combat_gloves` | 1 |
| footwear | Boots | `field_boots` / *jump boots* / `heavy_boots` | 1 |

**All together:** 120 forms, 64 painted, **56 new base paintings**; with the 9 graded one-offs, **129 graded items, 73
painted today**.

### 4.4 Grade schemes (counts over the 129 graded items; "new" reuses the 73 existing paintings as Standard)

| Scheme | Pictures per item | Total | New |
| --- | --- | --- | --- |
| S1 Leon's literal: all five grades painted | 5 | 645 | **572** |
| S2 Base plus a per-family "grade kit" of 4 painted pieces placed by the game | 1 + kit | 129 + 196 kit | **252** (risky: pieces look pasted on across three silhouettes, and anchors become new data) |
| S3 Three painted steps: Standard, Masterwork, Relic. Fine = Standard + a UI inlay mark; Celestial = Relic + a code-drawn contained light | 3 | 387 | **314** |
| S4 Standard + one Relic repaint; Fine, Masterwork, Celestial by frame, tint and glow | 2 | 258 | **185** |
| S5 Today: one picture, grade by words and ◆ only | 1 | 129 | **56** |

**Recommended (PROPOSED):** weapons and shields on S3 for 0.34 (168 new grade pictures), growing to S1 later only if the image
generator holds the silhouette across a set; armour on S4 (47 new), because worn pieces show at 36 to 88 px where five grades
would not read. **0.34 total: 56 bases + 215 grade pictures = 271 new**, plus the uniques below. Grade sets are made
image-to-image from an **approved** base, using the tier lines already in `GPT-PROMPTS-2026-11-13-gear.md` section 4; a base
still due a repaint must be fixed first, or its set is wasted. Size: S1 adds about 4.8 MB to the site and about 295 MB to the
repo.

### 4.5 Uniques, advanced-class weapons, Weapon Arts

- **Uniques** (one picture each, about Relic stats, own passive, own frame). PROPOSED first batch **24**: 8 melee (Afterword is
  the first, already painted), 8 guns and bows, 3 shields (Leon's three: throws back part of a spell; plants as lasting cover;
  stores soaked damage for a Slam), 5 armour. **23 new gear paintings**; the line icons (23) are Claude's; the Unique frame is
  recommended as a UI frame drawn by Claude.
- **Advanced-class weapons** (3 tiers each, from about Masterwork). PROPOSED one signature weapon per advanced class: 18 x 3 =
  54 pictures, the 8 mana paintings as tier 1 of 8 of them, so **46 new**. Pairings are PROPOSED (e.g. `evoker_blade` with the
  Blade Scribe, `grand_staff` with the Grand Sigilist). **Commission nothing** until the advanced classes return.
- **Weapon Arts** (0.35): PROPOSED one Wick icon per Art; with one melee Art per family, **12** Wick icons. Not ruled.

### 4.6 A first batch that is safe now

Only pictures that survive every answer Leon can give:

1. **None of the 56 new melee, gun, bow and armour forms**: a renamed or merged form wastes its picture and its grade set.
2. **The 6 new shield forms**: Leon has ruled the three shield families (Guard, Strike, Ward); only the names may change, and a
   new name does not waste a painting of "a spiked buckler". Safe at low risk; paint the base (Standard) only.
3. **A grade proof sheet** (PROPOSED, 8 pictures): `katana` and `service_pistol` (both approved re-paints) at Fine,
   Masterwork, Relic and Celestial, made image-to-image from the base. This is what decides S1 against S3, so it is useful under
   every scheme. Save as `gear/weapon-katana--fine.png` etc.
4. **Approve the existing 73 bases first.** Every gear painting is still a review candidate; any one Leon wants repainted
   should be repainted before Items 2.0 starts, since every grade set is built on it.

Must wait for Leon: every new melee, gun, bow and armour form (questions 3 to 6), every grade set beyond the proof sheet
(questions 1, 2, 8), the uniques (question 7), the advanced-class weapons (question 9), Weapon Arts icons (question 11).

### 4.7 Line icons (Claude, in parallel; not the artist's)

One per item id, none per grade: 19 melee forms, 15 gun forms, 2 bow forms, 6 shield forms, 14 armour forms, 5 body-armour
classes (painted, no line icon today), 23 uniques: **84**; later +10 for advanced-class weapons. The 92 existing carry over.

### 4.8 Questions for Leon (with recommendations)

1. **Five painted grades or three?** Recommended: three now (Standard, Masterwork, Relic); Fine and Celestial drawn by the UI.
   314 new instead of 572; fill to five later if the generator holds the silhouette.
2. **Do armour pieces get grade pictures?** Recommended: two (Standard, Relic): 47 new instead of 146.
3. **Approve the 12-family melee draft?** Recommended: yes, with Polearms as *spear* (Dexterity) / `glaive` (hybrid) /
   `lance` (Strength), dropping the poleaxe; the katana becomes the Eastern family's hybrid form.
4. **Approve the gun table (12 maker lines, close / standard / long, 5 heavies as one-offs)?** Recommended: yes; confirm G1
   (parlour, service, magistrate) and G9 (lever carbine, CCEC marksman, long rifle) make sense in the world as one line each.
   Each refusal adds 6 forms.
5. **Bows as two families (bows, crossbows)?** Recommended: yes.
6. **Armour shape?** Recommended: the 11 families as tabled; the outer torso becomes items; remove the empty veil slot.
7. **How many uniques in 0.34, and who makes the frame?** Recommended: 24 (8 / 8 / 3 / 5), Afterword first; the frame drawn
   by Claude as UI.
8. **Do the 4 foci and the quiver get grade pictures?** Recommended: yes, same scheme as weapons (10 new under S3).
9. **Advanced-class weapons: one signature weapon per class, 3 tiers, the 8 mana paintings as tier 1?** Recommended: yes, and
   commission nothing until the advanced classes return.
10. **Order of work for the artist?** Recommended: the 56 bases and 23 uniques first, each approved as a sheet; then grade
    sets image-to-image; nothing before questions 3 to 6.
11. **Do Weapon Arts get icons?** Recommended: one Wick icon per Art (12 if one melee Art per family).
12. **Do random modifiers and rarity names get any art?** Recommended: words only.
13. **Does Worn (or Broken) get a picture?** The gear rule lists a worn finish; none exists. Recommended: words only.
14. **`keeper-works` and `keeper-rim` don't match their names.** Recommended: rename the faces (names were Suggested), no
    repaint.
15. **Is `headlong_paid` shown on the status strip?** Recommended: no (a hidden bookkeeping row), so no sign is drawn.
16. **The Chaplain's Ward and Sanctuary:** point the moves at the prayer icons (`whisper-ward`, `hymn-sanctuary`)?
    Recommended: yes, no new art.

---

## 5. Not for the artist

### 5.1 Sourced assets (CC0 or CC BY 4.0 only; credited in `apps/web/src/game/sfxCredits.ts`)

| # | Asset | Today |
| --- | --- | --- |
| S1 | Victory fanfare | stand-in: `miracle_sting` then `soul_choir` |
| S2 | Defeat sting | stand-in: `feel_pump_low` then `soul_sigh` |
| S3 | Level-up sting (with the LEVEL UP banner) | none |
| S4 | Approach sting (optional, the lead's call) | none |
| S5 | Lightning and heal shimmer | `el_shock_1/2`, `el_zap`, `sg_mend` may do |
| S6 | Prayer sounds: Whisper chime, Hymn, Canticle notes, Amen, Last Rites | reused sounds at shifted rates |
| S7 | Figment sounds (Redraw, Interpose, blast), Shadow verb sounds | mostly none |
| S8 | Calm track for FREE ROAM and the approach | **no new asset**: reuse `gearing-up.mp3` |
| S9 | Textured VFX sheets (fire, smoke, sparks, impacts) | none requested; sourced only if wanted beyond the SVG effects |
| S10 | Lit and unlit lamp kit sprites for dark maps (optional) | not requested; an artist or sourced job if it comes |

### 5.2 Things code draws (do not paint)

- Every **monoline line icon** (weapons, armour, shields, foci, Figment forms, Glimmer): Claude, by `weapon-icons.md`.
- The 40 **Sigil glyphs**, fallback boon glyphs, status-strip and hazard fallbacks.
- **Grade frames, marks and tints**; the Unique frame (recommended); Fine's inlay mark and Celestial's light under S3.
- Level-up screen parts: ladder dots, chips, tabs, the +1 flash, sealed-fork card, PERMANENT tag, the menu type scale.
- **Effects:** prayer (Whisper line and ring, Hymn fan, Smite, Ward hex, Rebuke crack, Canticle, Amen, Last Rites, Witnessed
  eye, Atheist die), Shadow (Shade Step, Fade, Vault smear, hook lines, Decoy ring, hide-spot shading, sight lines), Figment
  (Redraw, Interpose, unravel, Volatile blast, order thread), Sanctuary and Hallowed zones, the dark-map scrim; token marks
  (Judged eye, Witnessed eye, Ward hex, verse glyph, cracked patron mark from the existing patron marks).
- **Wiring, not drawing:** the 22 Figment trait icons and 19 order icons are delivered but not built into the site; the 4
  Figment portraits for forms not in data yet (`figment-glass`, `-ferry`, `-breaker`, `-hush`) are delivered and wait for
  their forms; `icon-panel-run`, `icon-panel-run_board` and `survival-camp` have no slot; Wind-up and Read the Swing are not
  linked in data; the re-files and hand-ons in section 2.

---

## To verify (where the audits disagree or could not tell)

1. **Afterword and Open Hand gear paintings.** One audit says `weapon-afterword` and `mod-open_hand` are still placeholders
   (by checksum against the placeholder lists); another says Afterword is painted. The catalog has both with a
   `previous_path` to an archived placeholder, and on 19 Nov their files' checksums differ from those archived placeholders, so
   both look delivered. Not listed as gaps here; confirm by eye.
2. **Weapon painting count.** Audits give 66 `weapon-` paintings plus 3 shields (69), 67, and "70 of 72". All agree only
   `figment_claws` and `figment_edge` lack one.
3. **Monoline count.** One audit counts 72 weapon line icons (shields included), another 69 in `weapons/` plus 3 shields in
   `armour/`; `art/README.md` still says 60. Same files, different folders; README is stale.
4. **Magazines.** One audit: 19 of 33 magazine guns have a picture, 14 do not (`lever_carbine`, `lumeri_scattergun`,
   `long_rifle`, `recurve_bow`, `crossbow`, `parlour_pistol`, `coach_gun`, `sawn_off`, `smetanita_thumper`, `breacher_tube`,
   `purifier_flamer`, `longbow`, `core_rifle`, `lumeri_censer_gun`). Another: 11 or 12 pictures serving 20 guns.
   `ART-REQUESTS.md` says 19 of 19. Most of the 14 are bows, single-loaded or fuel/core weapons: likely a data question, not
   art. **Not requested** until checked.
5. **Iron Grip.** One audit says `iron_grip` has no perk icon; the catalog's `grapple` entry carries `data_id: iron_grip`, so
   it is covered.
6. **0.32 named unlocks.** The 0.31 audit names Share a Hit, Prayer shields and Two held as unmatched; the 0.32 audit (diffed
   against the nine sheets) does not list them as new pictures. It also lists Name the Sinner and Rite in the Field as new,
   where the 0.32 audit reuses existing pictures. This file follows the 0.32 audit.
7. **`headlong_paid`** needs a sign only if shown; the **Masterwork** fork may want a token mark; whether the token is drawn in
   code is unknown.
8. **Second Wind on the fight bar today**: unknown whether it shows the boon's icon or nothing (not checked in a browser).
9. **Foes with no face:** `celestial` and `turret` appear in loot tables but in no face list; unknown whether Survival makes
   them.
10. **Origins (14):** no art found; unknown whether a screen draws any.
11. **Stale rows in `ART-REQUESTS.md`:** F3 (Mana Shock), S7, E2, E2b, E2e, E2f, C1 to C5, D1 to D4 and K1 to K32 are
    delivered or superseded per the catalog and git; `art/README.md` still says the 0.30 list is 0/41 (it is 41/41).
