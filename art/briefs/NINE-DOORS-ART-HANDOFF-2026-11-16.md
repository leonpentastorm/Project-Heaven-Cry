# Nine Doors artwork handoff — next GPT starts here

<!-- current-continuation -->
> **Latest delivery:** 182/375 legacy candidates; 166 eligible old jobs + 27 held; 41/41 added 0.30 requests remain. Read [CURRENT-CHECKPOINT.md](../_archive/nine-doors/2026-11-16/CURRENT-CHECKPOINT.md) and the filtered CONTINUE.md. Earlier counts/tables below are historical.
<!-- /current-continuation -->

> **0.30 scope override — 16 November 2026:** Read [CONTINUE-0.30.md](../_archive/nine-doors/2026-11-16/CONTINUE-0.30.md), [the hold list](../_archive/nine-doors/2026-11-16/art-hold-list-0.30.md) and [the filtered queue](../_archive/nine-doors/2026-11-16/CONTINUE.md) first. All 28 old HOLD recipes stay blocked. The original 200 unfinished rows are now 173 eligible + 27 held; 41 source-backed 0.30 requests are added separately. No additional art has been delivered by this queue update. The tables below remain the historical 0.29 recipes and must not override these holds or new replacement rules.

Status checked against this branch: **175 of 375 requested assets delivered as review candidates; 200 rows remain.** This handoff describes the art checkpoint at `c7bd6778c80ef6ed5347ea1a4c32166204efeab4` on **`art/nine-doors-2026-11-16`**. Continue the artwork on this branch; preserve its completed work. This is an art task, not a request for reminders, new UI slots, gameplay changes or placeholders.

The original request is [GPT-PROMPTS-2026-11-16-nine-doors.md](GPT-PROMPTS-2026-11-16-nine-doors.md), taken from `wip/feature-0.29` at `8f9d45ae5c219bea418fac92d60a453b7af44d9a`. Source table numbers run to 378, but **#267–269 explicitly require no painting**. There are 375 real jobs. Do not count those three as missing art.

## 1. Start with these files

All links below are on the same branch:

- [Current style guide](../style-guide/PHC-Style-Guide.md), `art/style-guide/palette.json`, `art/style-guide/reference-index.json`, and `art/AGENTS.md`. Read the guide's mode table and attach the references for the actual mode before painting.
- [Completion record](../_archive/nine-doors/2026-11-16/progress.json): authoritative completed IDs. Individual [records](../_archive/nine-doors/2026-11-16/records/) contain source paths, dimensions, hashes, export paths and processing notes.
- [Full recipes for all 375 jobs](../_archive/nine-doors/2026-11-16/planned-jobs.json): exact catalog family/ID, filename, Paint, Avoid, purpose, source state and complete generation prompt. **Recipe `status: pending` fields are not a completion ledger.** Determine remaining work by subtracting progress/record IDs.
- [Current manifest](../_archive/nine-doors/2026-11-16/manifest.json), [catalog fragment](../_archive/nine-doors/2026-11-16/catalog-fragment.json) and `art/catalog.json`.
- [Delivery overview](../_archive/nine-doors/2026-11-16/review/DELIVERY-OVERVIEW.jpg), [all review sheets](../_archive/nine-doors/2026-11-16/review/), [alpha audit](../_archive/nine-doors/2026-11-16/alpha-audit.json), [blocker report](../_archive/nine-doors/2026-11-16/BLOCKERS.md).
- [Short continuation prompt](../_archive/nine-doors/2026-11-16/RESUME-PROMPT.md) and [ordered remaining list](../_archive/nine-doors/2026-11-16/CONTINUE.md). This handoff also spells out every remaining row below, including Paint/Avoid.

If the branch has advanced since this checkpoint, re-read its latest progress, records and catalog first. Preserve newer work and remove newly completed rows from this queue. The original brief supplies requirements; approved anchors and the user's later style corrections take precedence over stale prompt wording.

## 2. What is already finished — do not repeat it

- All **18 alpha perks**.
- **Open Hand #251**, the painted gear icon, and **Glimmer #137**, the monoline Figment icon. These are the other two priority-two assets.
- All **92 priority-three combat/action rows**, including Guard, Momentum/Breaker gains, Pressure/Skirmisher gains, Shadow verbs/group marks, initial Sigil steps, Figment orders, Tending/Bonds verbs, initial Will Power steps, Chaplain gains and the Open Hand forms. This does **not** mean every later class-rank move or weapon technique is complete; those remaining rows are listed under priority five.
- **59 condition/verse signs**. The two missing priority-four signs are Last Turn #323 and Augment Offline #324.
- All **five genuine monoline SVGs**: Glimmer #137, Glass #167, Ferry #168, Breaker #169, Hush #170. The brief explicitly permits drawing these in house. Their original 64-grid geometry and Inkscape proofs are retained; do not replace them with generated rasters or redraw them unnecessarily.

Completed totals by mode: 110 Wick-mode icons (including some object-only actions), 59 white-ink signs, 5 monoline SVGs and 1 painted gear icon = **175**. Every delivered asset remains `review-candidate`, `production_approved: false`, `implementation_ready: false`; delivery does not mean Leon has approved the art.

## 3. Immediate blocker and first two jobs

Image generation returned **HTTP 429 `usage_limit_reached` on #324**. The reported reset was **17 November 2026, 06:57:55 Asia/Saigon (UTC+7)**, equivalent to **16 November, 23:57:55 UTC**. This is the prior service response, not a guarantee about the next GPT's account/session; check actual availability. No automatic resume was scheduled. If generation is still quota-blocked, say so clearly and preserve completed work. Do not fabricate painted substitutes or claim the remaining rows are done.

1. **#323 Last Turn** — repaint a simple hourglass with one grain left. White ink on transparency; hard flat edges, **absolutely no glow or halo**. The first render failed the flat-sign style audit (faint-alpha/solid area ratio 0.973). It is preserved under `art/_archive/nine-doors/2026-11-16/superseded/323-glow-repaint-pending/`, including native source, master and exports. It is excluded from the delivered count and active manifest. Do not reactivate it. The existing catalog placeholder `art/icons/conditions/last-turn.svg` remains; the requested new painting goes to `art/icons/conditions/last-turn.png`.
2. **#324 Augment Offline** — a prosthetic arm with a small cut-power mark; no real brand and no lightning motif. There is no completed generated source for this row. Existing placeholder `art/icons/conditions/augment-offline.svg` remains; paint the requested `.png` path below.

Then continue in the priority order below, rather than starting with portraits just because they are more attractive to paint.

## 4. Style and casting rules that must survive the handoff

### Wick icons

**Wick is the approved small CERAMIC AUTOMATON**: oversized rounded rectangular head, inset changeable 8-bit pixel-screen face, little ear discs/offset fasteners, stubby mitten hands and boots, short asymmetric capelet and lantern-heart chest. His lively asymmetry is deliberate.

**The cup/bowl above Wick in Mind Without Fog is a special Still Water prop for that trait ONLY. It is not Wick anatomy or a default accessory.** Do not put cups, bowls, saucers or floating halos over him unless the specific new brief asks for one. Likewise, do not copy that reference's floating up-arrows by default. The canonical trait reference itself was preserved; the guide and `art/icons/STYLE-LOCK.md` contain this correction.

Ignore the original brief's stale “flame-headed” Wick wording. Use the actual ceramic/pixel-screen model. There is no human face and no literal flame for a head. Useful production anchors are:

- `art/icons/traits/mind-without-fog.png` — approved identity, but its cup/arrow props are not universal.
- `art/icons/perks/angel-of-the-trenches.png`
- `art/icons/perks/bedside-manner.png`
- `art/icons/perks/solid-image.png`

Wick/trait/perk ink is **pure white #FFFFFF on transparency**, not attribute tint. No gray paint, shading, gradients, glow or texture. Screen dark areas and interior cuts are transparent negative space, not opaque black. Keep one readable action and at most one full Wick; other people should be cropped partial fragments. No text or border. Preserve circular chip safety and inspect actual 32px/44px exports.

**Object-only rows must remain object-only.** The earlier model kept adding Wick to Figment orders and mechanisms even when the prompt asked for a prop. Use object-only references for those rows and explicitly exclude mascot heads/bodies. A hand-only row may show ceramic mitten hands; it does not need an extra full Wick. Current corrected examples include Rig #104, Strike #140, Pounce #141, Cut #142 and Stare #143.

### Condition signs and door emblems

These are generic signs, not Wick scenes. A plain human silhouette is allowed when specified, but no ceramic screen head, capelet or lantern chest. Pure flat white ink on transparency, two interior cuts at most. Condition signs must read at **24px/48px**; door emblems also at **20px**. When a prompt says “silhouette,” make the required human shape unmistakable rather than an abstract blob. “Glow” or “lit” in a row should become a white tick/ray or a transparent cut, not bloom.

Useful non-mascot anchors: `art/icons/survival/markers/shop.png` and `art/icons/boons/edge.png`, plus matching completed signs in this delivery. They are white on transparent and may look blank against a white image viewer; preview them on charcoal.

### Heavenprint portraits, gear and Scrap Turret

Read the mode's full brief and guide. Class portraits use Original Heavenprint/New Faces/pilot anchors: painterly ink/gouache, restrained semi-anime faces, lived-in lore equipment, blocky brushwork. Avoid live-action photo-shoot faces and oversized anime features. All three earlier portrait collections are character art, not skill-slot art. Respect the class-portrait framing/eye-line requirements in the original brief. Do not copy recognizable franchise characters.

Painted gear needs actual Heavenprint object references, not Wick or line signs. Useful existing anchors include `art/icons/gear/weapon-knuckledusters.png` and `art/icons/gear/weapon-hellraiser_servo_fist.png`. Prepare the guide's exact refs before generating the four gloves.

**Scrap Turret #164 is an abstract Figment portrait, not a Wick icon or a nanobot-fleck beast:** cream welded junk with the current Expression pigment on black, with the requested central token-circle framing. Read its complete recipe before painting. Do not accidentally use the human-portrait export path/framing. Read current palette values rather than inventing old colors.

Reference preparation for remaining class/gear/abstract modes was not completed before the quota block. Retrieve and inspect the appropriate production references; do not call a worker with an empty reference list and pretend the casting was supplied.

## 5. Remaining totals and priority order

| Priority | Still required | Count |
|---|---|---:|
| 4 | Last Turn repaint + Augment Offline | 2 |
| 5 | Class-rank/door moves and weapon techniques | 132 |
| 6 | Nine class portraits and nine door emblems | 18 |
| 7 | Four painted glove icons and Scrap Turret portrait | 5 |
| 8 | Other designed, not-built rows | 43 |
| **Total** | | **200** |

By mode: **170 Wick icons, 7 white-ink signs, 9 door emblems, 9 class portraits, 4 painted gear icons and 1 Figment portrait.** “Designed, not built” rows are still requested artwork; they do not authorize building screens or gameplay.

## 6. Exact remaining jobs

The following 200 rows are copied from the unfinished recipes, ordered by priority and original row number. Every row includes its exact catalog binding and target path. `Paint` and `Avoid` are per-row requirements; use the full common mode prompt from `planned-jobs.json` as well. For the first two rows, also apply the stricter no-glow/prosthetic-arm notes above.


### Priority 4 — 2 rows


#### Conditions and states

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 323 | Last Turn<br>white-ink sign<br>`condition_icons` / `cond-last-turn` | `art/icons/conditions/last-turn.png` | An hourglass with one grain left. | a clock face with numbers · a skull |
| 324 | Augment Offline<br>white-ink sign<br>`condition_icons` / `cond-augment-offline` | `art/icons/conditions/augment-offline.png` | A prosthetic arm with a small cut-power mark. | a real brand · lightning |

### Priority 5 — 132 rows


#### Durability: Guard, and the Bulwark

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 9 | Brace<br>Wick icon<br>`move_icons` / `move-brace` | `art/icons/moves/brace.png` | Wick planted, knees bent, feet wide, both forearms crossed in front of his flame. | any weapon · a wall behind him |
| 10 | Draw Fire<br>Wick icon<br>`move_icons` / `move-draw-fire` | `art/icons/moves/draw-fire.png` | Wick standing tall with both arms spread wide, three small arrow-darts curving toward his chest from out of frame. | a target ring (that is aiming) · a shield |
| 11 | Unbroken<br>Wick icon<br>`move_icons` / `move-unbroken` | `art/icons/moves/unbroken.png` | Wick standing straight with a long crack running down his body like a cracked statue, still upright. | lying down · wings or halo |
| 12 | Shrug It Off (move)<br>Wick icon<br>`move_icons` / `move-shrug-it-off-move` | `art/icons/moves/shrug-it-off-move.png` | Wick rolling his shoulders, four small loose bands (conditions) falling away from his arms to the ground. | the perk of the same id's picture (the perk is now Answer in Kind) · chains |
| 13 | Reactive Plate<br>Wick icon<br>`move_icons` / `move-reactive-plate` | `art/icons/moves/reactive-plate.png` | A single armour plate on Wick's shoulder flaring with a small burst of short rays where a dart has struck it. | fire or explosion texture · a full suit of armour |
| 14 | Anchor<br>Wick icon<br>`move_icons` / `move-anchor` | `art/icons/moves/anchor.png` | Wick standing on a ship's anchor shape sunk into the ground line, a short chain from his belt to it. | a real ship · water |

#### Raw Power: the Momentum chain, and the Breaker

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 32 | Lunge<br>Wick icon<br>`move_icons` / `move-lunge` | `art/icons/moves/lunge.png` | Wick in a deep lunge, back leg straight, blade point leading far ahead. | fencing gear · a second figure |
| 33 | Shove<br>Wick icon<br>`move_icons` / `move-shove` | `art/icons/moves/shove.png` | Wick pushing with both palms flat, a small partial figure tipping backwards off the edge of the frame. | a punch · a cliff |
| 34 | Riposte<br>Wick icon<br>`move_icons` / `move-riposte` | `art/icons/moves/riposte.png` | Wick turning a foe's blade aside with his own and snapping the point straight back in one motion, a small hook arrow showing the turn. | two crossed swords standing still · sparks |
| 35 | Lingering Dread<br>Wick icon<br>`move_icons` / `move-lingering-dread` | `art/icons/moves/lingering-dread.png` | Wick standing over a cowering partial figure, a long shadow from him falling across it. | horror faces · skulls |
| 36 | Finisher<br>Wick icon<br>`move_icons` / `move-finisher` | `art/icons/moves/finisher.png` | Wick with both hands over his head on a long haft, about to bring it down. | blood · an executioner's hood |
| 37 | Unstoppable<br>Wick icon<br>`move_icons` / `move-unstoppable` | `art/icons/moves/unstoppable.png` | Wick walking straight through three small darts that bend away from him, chin up. | a forcefield bubble · flames |
| 38 | Coup<br>Wick icon<br>`technique_icons` / `tech-coup` | `art/icons/techniques/coup.png` | A short decisive downward stroke ending on a small cracked ring (the foe's last health), Wick's arm at the top of the stroke. | a crown · a guillotine |
| 39 | Cleave<br>Wick icon<br>`technique_icons` / `tech-cleave` | `art/icons/techniques/cleave.png` | Wick's weapon carving one wide flat arc that passes through three short upright posts. | a meat cleaver · gore |
| 40 | Break<br>Wick icon<br>`technique_icons` / `tech-break` | `art/icons/techniques/break.png` | A heavy blow landing on a small round shield, the shield cracking in two. | bones · glass shards |
| 41 | Throw Down<br>Wick icon<br>`technique_icons` / `tech-throw-down` | `art/icons/techniques/throw-down.png` | Wick hip-tossing a partial figure over his hip toward the ground line. | wrestling ring ropes · a mat |
| 42 | Run Through<br>Wick icon<br>`technique_icons` / `tech-run-through` | `art/icons/techniques/run-through.png` | A long straight thrust passing through a ring and out the far side, Wick's arm extended. | a skewered body · blood |

#### Dexterity: Pressure, and the Skirmisher

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 62 | Fire Discipline<br>Wick icon<br>`move_icons` / `move-fire-discipline` | `art/icons/moves/fire-discipline.png` | Wick with the rifle tight to the shoulder, three short evenly spaced shot ticks in a row. | a spray of bullets · a metronome |
| 63 | Speed Loader<br>Wick icon<br>`move_icons` / `move-speed-loader` | `art/icons/moves/speed-loader.png` | A ring of six rounds held in a clip, sliding toward a revolver's open cylinder. | a real-world revolver make · text on the rounds |
| 64 | Special Ammo<br>Wick icon<br>`move_icons` / `move-special-ammo` | `art/icons/moves/special-ammo.png` | One round standing taller than two plain ones beside it, its tip marked with a small star cut. | glowing magic effects · a rocket |
| 65 | Duck and Roll<br>Wick icon<br>`move_icons` / `move-duck-and-roll` | `art/icons/moves/duck-and-roll.png` | Wick tucked into a roll, a dart passing through the space he just left. | a bowling ball · a ninja |
| 66 | Killzone<br>Wick icon<br>`move_icons` / `move-killzone` | `art/icons/moves/killzone.png` | A rectangle marked on the ground by four corner ticks, Wick's sight-line across it. | a crosshair over a person · skulls |
| 67 | Run and Gun<br>Wick icon<br>`move_icons` / `move-run-and-gun` | `art/icons/moves/run-and-gun.png` | Wick running hard, the gun held level and steady while his legs blur. | a vehicle · flames |
| 68 | Suppress<br>Wick icon<br>`technique_icons` / `tech-suppress` | `art/icons/techniques/suppress.png` | A low burst of four bullet lines raking just over a crate's top edge. | a soldier's helmet with insignia · fire |
| 69 | Rake<br>Wick icon<br>`technique_icons` / `tech-rake` | `art/icons/techniques/rake.png` | A sweeping fan of short bullet lines spreading across the ground. | a garden rake · blood |
| 70 | Warning Shot<br>Wick icon<br>`technique_icons` / `tech-warning-shot` | `art/icons/techniques/warning-shot.png` | A single bullet line striking the ground just in front of a partial foot, a small dust kick. | a firework · a flare |
| 71 | Flush<br>Wick icon<br>`technique_icons` / `tech-flush` | `art/icons/techniques/flush.png` | A burst striking the side of a crate, a small figure scrambling out of the far side. | a bird · water |
| 72 | Mag Dump<br>Wick icon<br>`technique_icons` / `tech-mag-dump` | `art/icons/techniques/mag-dump.png` | A gun with a long straight line of spent cases pouring out of its side. | a machine gun nest · a real make |
| 73 | Crossfire<br>Wick icon<br>`technique_icons` / `tech-crossfire` | `art/icons/techniques/crossfire.png` | Two bullet lines crossing at one point from opposite sides. | crossed swords · an X on a map |

#### Ingenuity: Shadow, and the Operative

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 82 | Hide<br>Wick icon<br>`move_icons` / `move-hide` | `art/icons/moves/hide.png` | Wick crouched behind a crate, his flame turned low to a small ember. | a cardboard box over his head · closed eyes |
| 84 | Ghost Kill<br>Wick icon<br>`move_icons` / `move-ghost-kill` | `art/icons/moves/ghost-kill.png` | Wick behind a fallen figure, a finger raised to where his lips would be. | blood · a skull |
| 110 | Vanish<br>Wick icon<br>`move_icons` / `move-vanish` | `art/icons/moves/vanish.png` | Wick stepping backwards into a doorway of darkness, half gone. | smoke bomb clouds · sparkles |
| 111 | Toxin<br>Wick icon<br>`move_icons` / `move-toxin` | `art/icons/moves/toxin.png` | A single drop falling from a vial onto a blade's edge. | a skull and crossbones · green goo |
| 112 | Sabotage<br>Wick icon<br>`move_icons` / `move-sabotage` | `art/icons/moves/sabotage.png` | A cut cable hanging out of a machine panel, the two ends apart. | an explosion · a robot face |
| 113 | Execution<br>Wick icon<br>`move_icons` / `move-execution` | `art/icons/moves/execution.png` | A reversed blade held point down over a nearly spent ring. | a guillotine · blood |
| 114 | Called Shot<br>Wick icon<br>`move_icons` / `move-called-shot` | `art/icons/moves/called-shot.png` | A small ring drawn round one limb of a silhouette, a sight-line to it. | a crosshair over a head · text |

#### Brain Power: Sigils, and the Sigilist

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 127 | Barrage<br>Wick icon<br>`move_icons` / `move-barrage` | `art/icons/moves/barrage.png` | Three small glyph-darts leaving a line of glyphs one after another. | missiles with fire trails · text |
| 128 | Core Change<br>Wick icon<br>`move_icons` / `move-core-change` | `art/icons/moves/core-change.png` | A spent round core popping out of the back of a glove as a fresh one slides in. | a battery with a plus sign · a brand |
| 129 | Overcharge<br>Wick icon<br>`move_icons` / `move-overcharge` | `art/icons/moves/overcharge.png` | A glyph line swelling thicker at its end, cracks of light at the edge. | lightning bolts · an explosion |
| 130 | Bleed the Flux<br>Wick icon<br>`move_icons` / `move-bleed-the-flux` | `art/icons/moves/bleed-the-flux.png` | A glove venting three short curls from a valve at the wrist. | steam train · smoke clouds |
| 131 | Payload<br>Wick icon<br>`move_icons` / `move-payload` | `art/icons/moves/payload.png` | A heavy glyph falling like a weight onto a small ring on the ground. | a bomb · a real missile |
| 132 | Stored Spell<br>Wick icon<br>`move_icons` / `move-stored-spell` | `art/icons/moves/stored-spell.png` | A glyph sealed inside a small round core, held between two fingers. | a potion · a book |

#### Visualization: Figments, and the Rigger

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 138 | Eye and Wall (fork)<br>Wick icon<br>`move_icons` / `move-eye-and-wall` | `art/icons/moves/eye-and-wall.png` | A lens shape and a short wall block side by side, a small fork line joining them below. | an eyeball · bricks with text |
| 139 | Beast and Blade (fork)<br>Wick icon<br>`move_icons` / `move-beast-and-blade` | `art/icons/moves/beast-and-blade.png` | A beast's head silhouette and a blade side by side, a fork line joining them below. | a real animal species badge · a sword from a known work |
| 147 | Armoured<br>Wick icon<br>`figment_trait_icons` / `trait-armoured` | `art/icons/figments/trait-armoured.png` | A figment shape with three overlapping plate arcs on its front. | a knight helmet · a real armour model |
| 148 | Swift<br>Wick icon<br>`figment_trait_icons` / `trait-swift` | `art/icons/figments/trait-swift.png` | A figment shape trailing three long speed lines. | a running shoe · wings |
| 149 | Loud<br>Wick icon<br>`figment_trait_icons` / `trait-loud` | `art/icons/figments/trait-loud.png` | A figment shape with three sound arcs leaving it. | a loudspeaker · music notes |
| 150 | Volatile<br>Wick icon<br>`figment_trait_icons` / `trait-volatile` | `art/icons/figments/trait-volatile.png` | A figment shape with cracks of light breaking out of it. | a bomb with a fuse · fire |
| 151 | Tethered<br>Wick icon<br>`figment_trait_icons` / `trait-tethered` | `art/icons/figments/trait-tethered.png` | A figment shape tied by one thin line to a small ring on the ground. | a dog leash · chains |
| 152 | Mirror<br>Wick icon<br>`figment_trait_icons` / `trait-mirror` | `art/icons/figments/trait-mirror.png` | A figment shape and its reversed copy facing it across a thin line. | a hand mirror · a person |
| 153 | Barbed<br>Wick icon<br>`figment_trait_icons` / `trait-barbed` | `art/icons/figments/trait-barbed.png` | A figment shape with a row of short barbs along its edge. | barbed wire · blood |
| 154 | Lasting<br>Wick icon<br>`figment_trait_icons` / `trait-lasting` | `art/icons/figments/trait-lasting.png` | A figment shape standing on a long horizontal line that runs off both edges. | an hourglass · a clock |
| 155 | Keen<br>Wick icon<br>`figment_trait_icons` / `trait-keen` | `art/icons/figments/trait-keen.png` | A figment shape with one very sharp point and a small sparkle at it. | a knife · an eye |
| 156 | Hollow<br>Wick icon<br>`figment_trait_icons` / `trait-hollow` | `art/icons/figments/trait-hollow.png` | A figment outline with an empty centre, flecks only round the edge. | a ghost · a donut |
| 158 | Double<br>Wick icon<br>`move_icons` / `move-double` | `art/icons/moves/double.png` | Wick and a dotted outline copy of him standing side by side. | two solid Wicks · a mirror frame |
| 159 | Field Fix<br>Wick icon<br>`move_icons` / `move-field-fix` | `art/icons/moves/field-fix.png` | A hand with a wrench tightening one bolt on a small machine plate. | a car · a real tool brand |
| 160 | Salvage<br>Wick icon<br>`move_icons` / `move-salvage` | `art/icons/moves/salvage.png` | A small round core pulled from a wrecked drone's shell. | a junkyard · recycling symbol |
| 161 | Overclock<br>Wick icon<br>`move_icons` / `move-overclock` | `art/icons/moves/overclock.png` | A dial on a machine cranked past its last tick, the needle bent. | a speedometer of a real car · flames |
| 162 | Sleight<br>Wick icon<br>`move_icons` / `move-sleight` | `art/icons/moves/sleight.png` | Wick and a figment swapping places, two curved arrows crossing between them. | a magician · playing cards |
| 163 | Scrap Turret<br>Wick icon<br>`move_icons` / `move-scrap-turret` | `art/icons/moves/scrap-turret.png` | A junk-built turret on three uneven legs, a pipe barrel. | a real gun turret · a robot face |

#### Empathy: Bonds and Tending, and the Mender

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 190 | Triage<br>Wick icon<br>`move_icons` / `move-triage` | `art/icons/moves/triage.png` | Three short bars of different lengths, a hand pointing at the shortest. | a red cross · a hospital sign |
| 191 | The Ledger<br>Wick icon<br>`move_icons` / `move-the-ledger` | `art/icons/moves/the-ledger.png` | An open ledger book with a thread for a bookmark, tally marks on the page. | readable text or numbers · coins |
| 192 | Inspire<br>Wick icon<br>`move_icons` / `move-inspire` | `art/icons/moves/inspire.png` | Wick with a hand raised, a ribbon with a heart knot rising from it. | music notes · a megaphone |
| 193 | Take the Weight<br>Wick icon<br>`move_icons` / `move-take-the-weight` | `art/icons/moves/take-the-weight.png` | Wick taking a heavy block off a partial figure's shoulders onto his own. | a barbell · a coffin |
| 194 | Brimming<br>Wick icon<br>`move_icons` / `move-brimming` | `art/icons/moves/brimming.png` | A cupped pair of hands with light overflowing the rim. | a cup or goblet · water |
| 195 | Rally (Mender)<br>Wick icon<br>`move_icons` / `move-rally` | `art/icons/moves/rally.png` | Wick with an arm raised, three threads fanning out from his chest to partial figures. | a flag · the Rally Call's icon pose (a shout) |

#### Will Power: the Outburst, and the Channeler

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 212 | Shape<br>Wick icon<br>`move_icons` / `move-shape` | `art/icons/moves/shape.png` | Two hands shaping a heart-burst into a long lance between them. | a potter's wheel · clay |
| 213 | Iron Heart<br>Wick icon<br>`move_icons` / `move-iron-heart` | `art/icons/moves/iron-heart.png` | A heart with two riveted bands round it. | a padlock · a metal robot heart |
| 214 | Storm Front<br>Wick icon<br>`move_icons` / `move-storm-front` | `art/icons/moves/storm-front.png` | A wall of three rolling arcs advancing from Wick's spread hands. | weather icons · a cloud with rain |
| 215 | Occult Library<br>Wick icon<br>`move_icons` / `move-occult-library` | `art/icons/moves/occult-library.png` | A small shelf of three bound books, a heart mark on the middle spine. | readable titles · a skull |
| 216 | Heart Surge<br>Wick icon<br>`move_icons` / `move-heart-surge` | `art/icons/moves/heart-surge.png` | A heart with a sharp spike rising out of its top like a pulse line. | an ECG of a real monitor · blood |
| 217 | Eye of the Storm<br>Wick icon<br>`move_icons` / `move-eye-of-the-storm` | `art/icons/moves/eye-of-the-storm.png` | Wick standing still at the calm centre of a spiral of arcs. | a hurricane satellite view · an eyeball |

#### Faith: prayer, and the Chaplain

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 229 | Ward<br>Wick icon<br>`prayers` / `whisper-ward` | `art/icons/prayers/whisper-ward.png` | Wick whispering into his cupped hand, a thin hex-shaped ward forming round a partial ally. | a heater shield · the Protection Whisper's arc |
| 230 | Smite<br>Wick icon<br>`move_icons` / `move-smite` | `art/icons/moves/smite.png` | A weapon hit that carries a single ray coming down from above into the struck point. | a real religious symbol · lightning bolt |
| 231 | Under the Eye<br>Wick icon<br>`move_icons` / `move-under-the-eye` | `art/icons/moves/under-the-eye.png` | A partial ally under a large open eye drawn as an arc above. | a real religious all-seeing-eye symbol · a pyramid |
| 232 | Blessed Arms<br>Wick icon<br>`move_icons` / `move-blessed-arms` | `art/icons/moves/blessed-arms.png` | A blade and a shell crossed under a single short ray. | a real religion's cross · fire |
| 233 | Sanctuary<br>Wick icon<br>`prayers` / `hymn-sanctuary` | `art/icons/prayers/hymn-sanctuary.png` | Wick singing, a square patch of ground under him lit by a soft outline. | a church building · a dome |
| 234 | Verdict<br>Wick icon<br>`move_icons` / `move-verdict` | `art/icons/moves/verdict.png` | One decided downward blow after a pointed finger. | a gavel · scales of justice |

#### Shared: the weapon techniques

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 325 | Lunge (technique)<br>Wick icon<br>`technique_icons` / `tech-lunge` | `art/icons/techniques/lunge.png` | Wick in a deep lunge, blade point leading. | fencing gear · a second figure |
| 326 | Charge<br>Wick icon<br>`technique_icons` / `tech-charge` | `art/icons/techniques/charge.png` | Wick running head-down with a weapon forward, three speed lines. | a horse · a vehicle |
| 327 | Feint<br>Wick icon<br>`technique_icons` / `tech-feint` | `art/icons/techniques/feint.png` | Wick's blade pointing one way while his body steps the other, a dotted arc. | a magician · two Wicks |
| 328 | Draw Cut<br>Wick icon<br>`technique_icons` / `tech-draw-cut` | `art/icons/techniques/draw-cut.png` | A blade leaving its scabbard in one curved cut line. | a katana from a known work · blood |
| 329 | Ambush<br>Wick icon<br>`technique_icons` / `tech-ambush` | `art/icons/techniques/ambush.png` | Wick springing from behind a low wall, blade raised. | a jack-in-the-box · a monster |
| 330 | Cut<br>Wick icon<br>`technique_icons` / `tech-cut` | `art/icons/techniques/cut.png` | One clean diagonal blade line. | blood · a kitchen knife |
| 331 | Sweep<br>Wick icon<br>`technique_icons` / `tech-sweep` | `art/icons/techniques/sweep.png` | A long weapon swinging a low flat arc at ankle height. | a broom · the Open Hand Sweep (that is a leg) |
| 332 | Bash<br>Wick icon<br>`technique_icons` / `tech-bash` | `art/icons/techniques/bash.png` | A blunt head striking a small ring with three impact ticks. | a baseball bat · blood |
| 333 | Sunder<br>Wick icon<br>`technique_icons` / `tech-sunder` | `art/icons/techniques/sunder.png` | A heavy blade striking a rifle across its middle, the rifle cracking. | an explosion · a real gun make |
| 334 | Flurry<br>Wick icon<br>`technique_icons` / `tech-flurry` | `art/icons/techniques/flurry.png` | Three quick blade lines stacked one after another. | a blender · motion blur |
| 335 | Hamstring<br>Wick icon<br>`technique_icons` / `tech-hamstring` | `art/icons/techniques/hamstring.png` | A low cut behind a partial leg, a small ring at the cut. | blood · an animal |
| 336 | Bind<br>Wick icon<br>`technique_icons` / `tech-bind` | `art/icons/techniques/bind.png` | Two blades locked together at the guards. | crossed swords standing still (show the lock) · a chain |
| 337 | Half-Sword<br>Wick icon<br>`technique_icons` / `tech-half-sword` | `art/icons/techniques/half-sword.png` | A hand gripping a blade halfway along its length, point forward. | blood · a known film's knight |
| 338 | Throw<br>Wick icon<br>`technique_icons` / `tech-throw` | `art/icons/techniques/throw.png` | A knife leaving Wick's hand end over end. | a baseball · a dart board |
| 339 | Pull Out<br>Wick icon<br>`technique_icons` / `tech-pull-out` | `art/icons/techniques/pull-out.png` | A hand drawing a blade back out of a post. | blood · a sword in a stone |
| 340 | Sidestep<br>Wick icon<br>`technique_icons` / `tech-sidestep` | `art/icons/techniques/sidestep.png` | Wick stepping sideways, a dart passing where he stood. | a dance step chart · a ninja |
| 341 | Guard (technique)<br>Wick icon<br>`technique_icons` / `tech-guard-tech` | `art/icons/techniques/guard-tech.png` | Wick's blade held across his body at a high guard. | a heater shield · a knight |
| 342 | Shove (technique)<br>Wick icon<br>`technique_icons` / `tech-shove-tech` | `art/icons/techniques/shove-tech.png` | A single palm pushing a partial figure back one step. | the Palm form (two palms) · a cliff |
| 343 | Trip<br>Wick icon<br>`technique_icons` / `tech-trip` | `art/icons/techniques/trip.png` | A foot hooking a partial ankle, the figure tipping. | a banana peel · a cartoon fall |
| 344 | Drag<br>Wick icon<br>`technique_icons` / `tech-drag` | `art/icons/techniques/drag.png` | A hand hauling a partial figure by the collar along the ground. | a body bag · blood |
| 345 | Parry<br>Wick icon<br>`technique_icons` / `tech-parry` | `art/icons/techniques/parry.png` | Wick's blade turning another blade aside with a small spark tick. | a shield · crossed swords standing still |
| 346 | Riposte (technique)<br>Wick icon<br>`technique_icons` / `tech-riposte-tech` | `art/icons/techniques/riposte-tech.png` | A parry turning into a point thrust in one curved line. | two crossed swords · fencing gear |
| 347 | Keep Back<br>Wick icon<br>`technique_icons` / `tech-keep-back` | `art/icons/techniques/keep-back.png` | A long polearm held level at a partial figure's chest, holding it off. | a fence · a real spear make |
| 348 | Shot<br>Wick icon<br>`technique_icons` / `tech-shot` | `art/icons/techniques/shot.png` | A single bullet line from a muzzle. | muzzle flash fire · blood |
| 349 | Snap Shot<br>Wick icon<br>`technique_icons` / `tech-snap-shot` | `art/icons/techniques/snap-shot.png` | A pistol fired from the hip, a short quick line. | a cowboy · a camera |
| 350 | Burst<br>Wick icon<br>`technique_icons` / `tech-burst` | `art/icons/techniques/burst.png` | Three short bullet lines in a tight group. | a firework burst · blood |
| 351 | Aimed Shot<br>Wick icon<br>`technique_icons` / `tech-aimed-shot` | `art/icons/techniques/aimed-shot.png` | A rifle with a long straight sight-line to a small ring. | a crosshair over a head · a scope glint |
| 352 | Called Shot (technique)<br>Wick icon<br>`technique_icons` / `tech-called-shot-tech` | `art/icons/techniques/called-shot-tech.png` | A ring drawn round one limb of a silhouette. | a crosshair over a head · text |
| 353 | Walking Fire<br>Wick icon<br>`technique_icons` / `tech-walking-fire` | `art/icons/techniques/walking-fire.png` | A row of bullet lines stepping forward across the ground. | footprints · a machine gun nest |
| 354 | Punch Through<br>Wick icon<br>`technique_icons` / `tech-punch-through` | `art/icons/techniques/punch-through.png` | A bullet line passing through a plate and out the other side. | glass shards · blood |
| 355 | Lob<br>Wick icon<br>`technique_icons` / `tech-lob` | `art/icons/techniques/lob.png` | A high dotted arc from a launcher to a small ring. | a basketball · a firework |
| 356 | Heavy Bolt<br>Wick icon<br>`technique_icons` / `tech-heavy-bolt` | `art/icons/techniques/heavy-bolt.png` | A thick crossbow bolt in flight, a heavy wake line. | a lightning bolt · a real crossbow make |
| 357 | Bead<br>Wick icon<br>`technique_icons` / `tech-bead` | `art/icons/techniques/bead.png` | A front sight post lined up on a small dot. | a bead necklace · a scope logo |
| 358 | Spot<br>Wick icon<br>`technique_icons` / `tech-spot` | `art/icons/techniques/spot.png` | A hand shading the eyes, a sight-line to a far dot. | binoculars brand · a spotlight |
| 359 | Brace (technique)<br>Wick icon<br>`technique_icons` / `tech-brace-tech` | `art/icons/techniques/brace-tech.png` | A rifle's fore-end resting on a wall edge. | a bipod (Suppressor) · a dental brace |
| 360 | Load Special<br>Wick icon<br>`technique_icons` / `tech-load-special` | `art/icons/techniques/load-special.png` | One marked round pressed into a magazine's top. | a rocket · glowing magic |
| 361 | Shift<br>Wick icon<br>`technique_icons` / `tech-shift` | `art/icons/techniques/shift.png` | Wick shifting his weight foot to foot, a small arrow under him. | a gear shift · a keyboard key |
| 362 | Vent<br>Wick icon<br>`technique_icons` / `tech-vent` | `art/icons/techniques/vent.png` | A gun barrel with three heat curls. | steam train · fire |
| 363 | Head Down<br>Wick icon<br>`technique_icons` / `tech-head-down` | `art/icons/techniques/head-down.png` | Wick ducking low behind a wall, only his flame showing. | a turtle · a helmet |
| 364 | Dead Centre<br>Wick icon<br>`technique_icons` / `tech-dead-centre` | `art/icons/techniques/dead-centre.png` | A bullet line striking the exact centre of a ring. | a dart board · a skull |
| 365 | Pin Down<br>Wick icon<br>`technique_icons` / `tech-pin-down` | `art/icons/techniques/pin-down.png` | A foe flat behind cover under three bullet lines. | a pushpin · a map pin |
| 366 | Rout<br>Wick icon<br>`technique_icons` / `tech-rout` | `art/icons/techniques/rout.png` | Three small figures running away from a gun line. | a white flag · a chase scene |
| 367 | Stopping Shot<br>Wick icon<br>`technique_icons` / `tech-stopping-shot` | `art/icons/techniques/stopping-shot.png` | A charging silhouette stopped mid-stride by a bullet line. | a stop sign · blood |
| 368 | Storm<br>Wick icon<br>`technique_icons` / `tech-storm` | `art/icons/techniques/storm.png` | A dense rain of bullet lines over a wide area. | weather icons · lightning |
| 369 | Last Round<br>Wick icon<br>`technique_icons` / `tech-last-round` | `art/icons/techniques/last-round.png` | A single round standing alone in an open magazine. | a skull · a clock |
| 370 | Overwatch (technique)<br>Wick icon<br>`technique_icons` / `tech-overwatch-tech` | `art/icons/techniques/overwatch-tech.png` | Wick lying still, a long sight-line across a lane. | a tower · an eye logo |
| 371 | Deny<br>Wick icon<br>`technique_icons` / `tech-deny` | `art/icons/techniques/deny.png` | A bullet line cutting across a doorway gap. | a no-entry road sign · a wall |
| 372 | Cover Me<br>Wick icon<br>`technique_icons` / `tech-cover-me` | `art/icons/techniques/cover-me.png` | Wick firing past a partial ally who runs across. | a blanket · a shield |
| 373 | Dead to Rights<br>Wick icon<br>`technique_icons` / `tech-dead-to-rights` | `art/icons/techniques/dead-to-rights.png` | A sight-line pinning a silhouette caught in the open. | handcuffs · a skull |
| 374 | Shield Bash<br>Wick icon<br>`technique_icons` / `tech-shield-bash` | `art/icons/techniques/shield-bash.png` | A round shield driven forward into a partial figure. | a heater shield · blood |
| 375 | Raise Shield<br>Wick icon<br>`technique_icons` / `tech-raise-shield` | `art/icons/techniques/raise-shield.png` | Wick lifting a round shield to his eye line. | a riot shield with text · a heater shield |
| 376 | Grapple<br>Wick icon<br>`technique_icons` / `tech-grapple` | `art/icons/techniques/grapple.png` | Two arms locking round a partial figure. | a wrestling ring · the old Grapple perk icon pose (show the lock from behind) |
| 377 | Shield Wall<br>Wick icon<br>`technique_icons` / `tech-shield-wall` | `art/icons/techniques/shield-wall.png` | Two round shields overlapping edge to edge. | a castle wall · a phalanx from a known film |
| 378 | Interpose<br>Wick icon<br>`technique_icons` / `tech-interpose` | `art/icons/techniques/interpose.png` | Wick stepping between a dart and a partial ally, shield up. | a heater shield · wings |

### Priority 6 — 18 rows


#### Durability: Guard, and the Bulwark

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 15 | Guard plate (door emblem)<br>door emblem<br>`door_emblems` / `door-guard` | `art/emblems/doors/guard.png` | A single curved armour plate seen front-on, two rivets, one notch on its edge. | a heater shield (the Guard boon line already uses a buckler) · any letter |
| 16 | The Bulwark (class portrait)<br>class portrait<br>`class_portraits` / `class-defender` | `art/portraits/classes/defender.png` | A broad, steady person in scuffed plate with a Buckler on the forearm, planted in a doorway, looking past the viewer at what is coming; warm firelight from one side. | a recognisable knight from any known work · a raised sword pose |

#### Raw Power: the Momentum chain, and the Breaker

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 43 | Momentum counter (door emblem)<br>door emblem<br>`door_emblems` / `door-momentum` | `art/emblems/doors/momentum.png` | A heavy round weight with three curved motion lines rolling off its back edge. | a bowling ball · a clock |
| 44 | The Breaker (class portrait)<br>class portrait<br>`class_portraits` / `class-fighter` | `art/portraits/classes/fighter.png` | A heavy-shouldered fighter mid-stride with a war axe resting on one shoulder, dust kicked up, grinning at the next wall to go through. | a barbarian from a known work · bare-chested pin-up pose |

#### Dexterity: Pressure, and the Skirmisher

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 74 | Pressure pips (door emblem)<br>door emblem<br>`door_emblems` / `door-pressure` | `art/emblems/doors/pressure.png` | Three short rising chevrons stacked one above the other, like a meter climbing. | a military rank insignia · a wifi signal |
| 75 | The Skirmisher (class portrait)<br>class portrait<br>`class_portraits` / `class-marksman` | `art/portraits/classes/marksman.png` | A lean runner in a dusty coat, half crouched at the corner of cover, rifle up, already looking at the next cover. | a real army uniform or insignia · a sniper in a ghillie suit |

#### Ingenuity: Shadow, and the Operative

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 115 | Shadow wisp (door emblem)<br>door emblem<br>`door_emblems` / `door-shadow` | `art/emblems/doors/shadow.png` | Three thin curved wisps fanned like smoke, the middle one longest. | a ghost · a flame (that is Wick) |
| 116 | The Operative (class portrait)<br>class portrait<br>`class_portraits` / `class-infiltrator` | `art/portraits/classes/infiltrator.png` | A quiet figure in a dark coat in a doorway's shadow, one gloved hand on a lockpick roll, eyes on the viewer, unreadable. | a spy from a known work · a mask covering the face |

#### Brain Power: Sigils, and the Sigilist

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 133 | Sigil chip (door emblem)<br>door emblem<br>`door_emblems` / `door-sigil` | `art/emblems/doors/sigil.png` | A short straight Line of three abstract glyph marks joined by one stroke, inside a thin square. | letters of any real script · the Sigil boon line icon (three marks, no square) |
| 134 | The Sigilist (class portrait)<br>class portrait<br>`class_portraits` / `class-mage` | `art/portraits/classes/mage.png` | A thin, precise caster in a work coat with an Evoker glove raised, a line of light-glyphs drawn on the floor behind, face calm and counting. | a wizard robe and hat · any letters in the glyphs |

#### Visualization: Figments, and the Rigger

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 165 | Figment (door emblem)<br>door emblem<br>`door_emblems` / `door-figment` | `art/emblems/doors/figment.png` | A small frame with a shape forming inside it out of scattered dots. | a picture frame with a photo · the Figments boon line icon (keep the frame square, not a portrait frame) |
| 166 | The Rigger (class portrait)<br>class portrait<br>`class_portraits` / `class-trickster` | `art/portraits/classes/trickster.png` | A quick-handed tinkerer with a Visualizer glove, a figment of flecks forming over the glove, a wrench through the belt, a crooked grin. | a stage magician · a known inventor character |

#### Empathy: Bonds and Tending, and the Mender

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 196 | Bond thread (door emblem)<br>door emblem<br>`door_emblems` / `door-bond` | `art/emblems/doors/bond.png` | Two open rings linked by one thread with a heart knot at its middle. | chain links (the Bonds boon line) · a wedding ring |
| 197 | The Mender (class portrait)<br>class portrait<br>`class_portraits` / `class-bard` | `art/portraits/classes/bard.png` | A tired, kind field medic with an Attuner glove, fine threads of light from its fingertips to people off frame, sleeves rolled, steady eyes. | a red cross · a nurse uniform from any real service |

#### Will Power: the Outburst, and the Channeler

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 218 | Outburst heart (door emblem)<br>door emblem<br>`door_emblems` / `door-outburst` | `art/emblems/doors/outburst.png` | A heart with one swelling ring round it and a single spark at its top. | the Outburst boon line icon (four rings) · a red heart emoji |
| 219 | The Channeler (class portrait)<br>class portrait<br>`class_portraits` / `class-channeler` | `art/portraits/classes/channeler.png` | A caster in a long coat with an Emanator glove, a storm-violet heart-burst swelling between their hands, hair lifting, jaw set. | a superhero pose · lightning from the eyes |

#### Faith: prayer, and the Chaplain

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 246 | Prayer mark (door emblem)<br>door emblem<br>`door_emblems` / `door-prayer` | `art/emblems/doors/prayer.png` | Two cupped hands round a single short ray. | the Faith boon line (hands round a flame) · a real religion's symbol |
| 247 | The Chaplain (class portrait)<br>class portrait<br>`class_portraits` / `class-guardian` | `art/portraits/classes/guardian.png` | A worn chaplain in a road-dusty cassock-coat with prayer beads round one wrist and a short weapon in the other hand, singing mid-line, eyes up. | a real church's vestments or symbols · a halo |

### Priority 7 — 5 rows


#### Visualization: Figments, and the Rigger

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 164 | Scrap Turret (portrait)<br>Figment portrait<br>`figments` / `figment-scrap-turret` | `art/portraits/figments/figment-scrap-turret.png` | Abstract portrait mode: an angular welded turret of scrap plates and a pipe barrel, NOT bot-flecks, cream welds on black, Expression blue in the shadows. | bot flecks (the turret is welded junk, not a Figment) · a real weapon make |

#### The monk's gloves (the Open Hand)

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 252 | Hand wraps<br>painted gear icon<br>`gear` / `weapon-hand_wraps` | `art/icons/gear/weapon-hand_wraps.png` | A wrapped fist in grey cloth, the wrap's end trailing in a curl, knuckles slightly scuffed. | a boxing glove · a real brand |
| 253 | Striking gloves<br>painted gear icon<br>`gear` / `weapon-striking_gloves` | `art/icons/gear/weapon-striking_gloves.png` | A slim open fingerless glove in dark leather, two seam lines across the knuckles. | a boxing glove · a real brand |
| 254 | Iron mitts<br>painted gear icon<br>`gear` / `weapon-iron_mitts` | `art/icons/gear/weapon-iron_mitts.png` | A blocky foundry mitt with three plate lines, the fingers welded shut. | a robot hand · a gauntlet from any known work |
| 255 | Kemizuchi strikers<br>painted gear icon<br>`gear` / `weapon-kemizuchi_strikers` | `art/icons/gear/weapon-kemizuchi_strikers.png` | The slim glove with a short folded-steel point at the knuckle, the Kemizuchi signature: a fine wave line in the steel. | a katana · a real swordsmith's mark |

### Priority 8 — 43 rows


#### Durability: Guard, and the Bulwark

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 17 | Wall<br>Wick icon<br>`move_icons` / `move-wall` | `art/icons/moves/wall.png` | Wick behind a tall slab of stone he holds upright, feet set wide behind it. | a brick wall texture · a castle |
| 18 | Hold the Gap<br>Wick icon<br>`move_icons` / `move-hold-the-gap` | `art/icons/moves/hold-the-gap.png` | Wick's arm barring a narrow doorway from frame to frame, his body in the gap. | a door with a lock · a second figure |
| 19 | The Shield Follows<br>Wick icon<br>`move_icons` / `move-the-shield-follows` | `art/icons/moves/the-shield-follows.png` | Wick swinging a round shield edge-first in the arc right behind a blade stroke. | two weapons crossed · a spinning blur |
| 20 | Weather the Volley<br>Wick icon<br>`move_icons` / `move-weather-the-volley` | `art/icons/moves/weather-the-volley.png` | Wick hunched forward, three short dashes glancing off the curve of his back. | rain · an umbrella |
| 21 | Bastion (path mark)<br>Wick icon<br>`move_icons` / `move-bastion` | `art/icons/moves/bastion.png` | Wick standing behind a low parapet of stacked blocks, only his head and shoulders above it. | a castle tower · flags |
| 22 | Bulwark's Edge (path mark)<br>Wick icon<br>`move_icons` / `move-bulwarks-edge` | `art/icons/moves/bulwarks-edge.png` | Wick advancing with a shield's rim leading, the rim a hard bright line. | a sword · a spiked shield |

#### Raw Power: the Momentum chain, and the Breaker

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 45 | Bowl Over<br>Wick icon<br>`move_icons` / `move-bowl-over` | `art/icons/moves/bowl-over.png` | Wick shoulder-first, mid-stride, a small figure tipping over in front of him. | a bowling pin · a vehicle |
| 46 | Execute<br>Wick icon<br>`move_icons` / `move-execute` | `art/icons/moves/execute.png` | Wick with both hands over his head on a long haft, the blade a hard bright line, a small ring below it. | an executioner's hood · a block |
| 47 | Into the Wall<br>Wick icon<br>`move_icons` / `move-into-the-wall` | `art/icons/moves/into-the-wall.png` | Wick pushing with both palms, a partial figure pressed flat against a wall line at the far side. | bricks with text · blood |
| 48 | Hurl<br>Wick icon<br>`move_icons` / `move-hurl` | `art/icons/moves/hurl.png` | Wick mid-throw of a barrel, one arm whipping through, the barrel leaving his hand. | a real brand on the barrel · fire |
| 49 | Demolisher (path mark)<br>Wick icon<br>`move_icons` / `move-demolisher` | `art/icons/moves/demolisher.png` | Wick standing on a heap of rubble, a sledge planted head-down beside him. | a building · smoke clouds |
| 50 | Duelist (path mark)<br>Wick icon<br>`move_icons` / `move-duelist` | `art/icons/moves/duelist.png` | Wick side-on in a guard, one hand forward, a slim blade held back. | fencing mask · a rapier from any known work |

#### Dexterity: Pressure, and the Skirmisher

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 76 | Flush Out<br>Wick icon<br>`move_icons` / `move-flush-out` | `art/icons/moves/flush-out.png` | Wick shooting a crate apart, a figure scrambling out. | explosions · fire |
| 77 | Open<br>Wick icon<br>`move_icons` / `move-open` | `art/icons/moves/open.png` | Wick pointing two fingers at a target, an opened bracket shape round it. | a crosshair · text brackets |
| 78 | Suppressor (path mark)<br>Wick icon<br>`move_icons` / `move-suppressor` | `art/icons/moves/suppressor.png` | Wick prone behind a bipod rifle. | a sniper scope glint · a real make |
| 79 | Runner (path mark)<br>Wick icon<br>`move_icons` / `move-runner` | `art/icons/moves/runner.png` | Wick vaulting a low wall one-handed, gun in the other. | parkour logos · a city skyline |

#### Ingenuity: Shadow, and the Operative

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 117 | Parting Cut<br>Wick icon<br>`move_icons` / `move-parting-cut` | `art/icons/moves/parting-cut.png` | A last slash as Wick turns away into shadow, the blade line trailing. | blood · a cape |
| 118 | Case<br>Wick icon<br>`move_icons` / `move-case` | `art/icons/moves/case.png` | Wick peering at a silhouette, small outlines of its weapon and pack shown beside it. | an X-ray skeleton · a briefcase |
| 119 | Shade Step<br>Wick icon<br>`move_icons` / `move-shade-step` | `art/icons/moves/shade-step.png` | Wick stepping into his own shadow on one side and out on the other. | a portal · sparkles |
| 120 | Ghost (Way)<br>Wick icon<br>`move_icons` / `move-way-ghost` | `art/icons/moves/way-ghost.png` | Wick half faded, legs trailing as smoke. | a bedsheet ghost · a skull |
| 121 | Knife (Way)<br>Wick icon<br>`move_icons` / `move-way-knife` | `art/icons/moves/way-knife.png` | Wick holding a small blade behind his back, smiling face hidden. | blood · a kitchen knife |
| 122 | Hand (Way)<br>Wick icon<br>`move_icons` / `move-way-hand` | `art/icons/moves/way-hand.png` | Wick's hand in a stranger's coat pocket. | money symbols · a glove brand |

#### Empathy: Bonds and Tending, and the Mender

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 198 | Draw Taut<br>Wick icon<br>`tending_icons` / `tend-draw-taut` | `art/icons/tending/draw-taut.png` | A thread pulled straight and thick between two hands. | a bow string · a rope |
| 199 | Take It On<br>Wick icon<br>`tending_icons` / `tend-take-it-on` | `art/icons/tending/take-it-on.png` | A thread carrying a small wound mark from a partial figure into Wick's chest. | blood · a broken heart |
| 200 | Pass It On<br>Wick icon<br>`tending_icons` / `tend-pass-it-on` | `art/icons/tending/pass-it-on.png` | A thread passing a small light from one partial figure to another through Wick. | a relay baton · fire |
| 201 | Forewarn<br>Wick icon<br>`tending_icons` / `tend-forewarn` | `art/icons/tending/forewarn.png` | A thread twitching with a small zig-zag, a partial figure turning its head. | a siren · lightning |
| 202 | Knot<br>Wick icon<br>`tending_icons` / `tend-knot` | `art/icons/tending/knot.png` | Two enemy silhouettes joined by one curved thread knotted in the middle. | a rope knot diagram · chains |
| 203 | Steal the Mending<br>Wick icon<br>`tending_icons` / `tend-steal-the-mending` | `art/icons/tending/steal-the-mending.png` | A thread drawing a soft glow away from an enemy into Wick's hand. | a thief mask · a vampire |
| 204 | Pass the Thread<br>Wick icon<br>`tending_icons` / `tend-pass-the-thread` | `art/icons/tending/pass-the-thread.png` | Wick handing the end of a thread to a partial hand. | a needle and thread · a baton |
| 205 | Weaver's Hands<br>Wick icon<br>`tending_icons` / `tend-weavers-hands` | `art/icons/tending/weavers-hands.png` | Two hands with many fine threads running between the fingers like a cradle. | a loom · a spider web |
| 206 | Spite (thread kind)<br>Wick icon<br>`tending_icons` / `tend-kind-spite` | `art/icons/tending/kind-spite.png` | A barbed thread with small ticks along it. | barbed wire · blood |
| 207 | Leash (thread kind)<br>Wick icon<br>`tending_icons` / `tend-kind-leash` | `art/icons/tending/kind-leash.png` | A double thread, two lines close together, ending in a loop. | a dog collar · chains |

#### Faith: prayer, and the Chaplain

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 248 | Hallow<br>Wick icon<br>`move_icons` / `move-hallow` | `art/icons/moves/hallow.png` | Wick pressing a palm to the ground, three lines rising. | a church · a cross |
| 249 | Confessor (Office)<br>Wick icon<br>`move_icons` / `move-confessor` | `art/icons/moves/confessor.png` | Wick seated, hands folded. | a confessional booth · a real religious habit |
| 250 | Crusader (Office)<br>Wick icon<br>`move_icons` / `move-crusader` | `art/icons/moves/crusader.png` | Wick with a raised weapon and a sun-mark behind it. | a real crusading cross · a real order's emblem |

#### The monk's gloves (the Open Hand)

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 264 | Closing Strike<br>Wick icon<br>`move_icons` / `move-closing-strike` | `art/icons/moves/closing-strike.png` | Wick mid-lunge, three ticks gathered at the fist. | a boxing glove · lightning |
| 265 | Flow<br>Wick icon<br>`move_icons` / `move-flow` | `art/icons/moves/flow.png` | Three small ticks circling above Wick's head. | water · a yin-yang |
| 266 | Slip (unarmed)<br>Wick icon<br>`move_icons` / `move-slip-unarmed` | `art/icons/moves/slip-unarmed.png` | Wick leaning out of a line, the line bending past (the Slip of the unarmed draft). | Sway's exact pose (lean the other way, both hands up) |

#### Survival and camp

| # | Asset / mode / catalog binding | Output file | Paint | Avoid |
|---:|---|---|---|---|
| 270 | Step 1: Your free weapon<br>white-ink sign<br>`camp_icons` / `camp-step-weapon` | `art/icons/survival/camp/step-weapon.png` | A rifle and a sword crossed low, a small tick in a ring above them. | any real weapon make · text |
| 271 | Step 2: Your free focus<br>white-ink sign<br>`camp_icons` / `camp-step-focus` | `art/icons/survival/camp/step-focus.png` | A single glove with a small round core on its back, a tick in a ring above. | a real brand · a magic wand |
| 272 | Step 3: Spend your budget<br>white-ink sign<br>`camp_icons` / `camp-step-budget` | `art/icons/survival/camp/step-budget.png` | A small purse with three coins stacked beside it. | a currency symbol · text |
| 273 | Step 4: Your starting boon<br>white-ink sign<br>`camp_icons` / `camp-step-boon` | `art/icons/survival/camp/step-boon.png` | A small ribbon medal on a pin. | a real military medal · a star with text |
| 274 | Ready<br>white-ink sign<br>`camp_icons` / `camp-step-ready` | `art/icons/survival/camp/step-ready.png` | A pack with its flap buckled and a tick above it. | a real brand · a checkmark alone (keep the pack) |

## 7. Generation, export and validation workflow

1. Start from the latest art branch. Read its `art/AGENTS.md`, current mode guide and exact row recipe. Attach the right reference images. Use image generation for painting and creative image edits. Work in small reviewable batches; inspect every result rather than counting successful tool calls as successful artwork.
2. Keep exact filenames and catalog family/IDs from the tables. Preserve completed, approved and replaced artwork. Move superseded masters/sources into dated `_archive/` locations before replacement. Never overwrite an immutable native source. Never delete the old approved art or `generated_images` originals. Copy mutable PNG/JSON backups; do not hardlink mutable backups and then overwrite them.
3. Record the **actual native render dimensions** separately from export dimensions. Existing generated PNGs were native **1254×1254**, exported as **1024×1024 RGBA** masters with aspect preserved and transparent margins. They were not native 4K, not native 1024 and not upscaled. Ink exports enforce white RGB while preserving generated alpha. Existing Wick framing fits a central ~80% box and the 90%-diameter medallion. Use the actual mode's dimensions for portraits; do not blindly resize every future mode to 800×1000.
4. Generate the required small UI exports from the real master. Existing perk exports: 256/128/64/56/48/44/40/32. Other ink modes: 128/64/48/44/32/24; add/check the door's 20px review. Gear: 256/128/64/32. Check exact target-family requirements in the brief/catalog. SVG masters remain 64-grid, `stroke="currentColor"`, width 2, round joins/caps, no fill; their larger PNGs are review rasterizations, not painted originals.
5. Review at actual UI sizes on charcoal and examine transparency/alpha edges. Check silhouette, prop anatomy, cropped limbs, duplicate full figures and faint glows. Important prior failures are retained under `superseded/`: accidental cups, unwanted full mascots, brush instead of calming hand, one-handed instead of two-handed Palm, glowing Fear, blob instead of Read and unclear self-hold instead of Grappled. Do not reintroduce them. Resolved service rejections were handled with benign game abstractions, such as a wrist-controlled toy marionette for Puppeted; do not use real harm imagery.
6. Update `art/catalog.json` without overwriting unrelated/newer catalog edits. Keep data bindings and add real master/export/source hashes, native dimensions and archive paths. Remove a placeholder flag only when that row has a valid delivered candidate. **Last Turn and Augment Offline currently retain their original `.svg` placeholders.** Maintain honest review-candidate/approval metadata.
7. Update archive records, manifest, review sheets, progress, catalog fragment and exact remaining queue. Rehash using `python3 tools/rehash_art_checksums.py`; run `python3 tools/validate_art.py`, relevant scoped checks and `npm run assets` in a full checkout when possible. No new game code or UI implementation is needed for this art delivery.
8. Scoped checks passed for all 175 delivered records: catalog/master/native hashes, PNG dimensions, transparency, pure-white ink, safe bounds, SVG rules, UI exports and preserved replacement hashes. An additional faint-alpha audit passed for the delivered ink masters. **Full-library validation and the asset build were actually attempted, but both stopped at missing historical `art/icons/skills/durability.png` in the delivery-only checkout. Do not report them as passing.** Exact logs are archived in `validation-run.txt`, `full-library-check.txt`, `asset-build-check.txt`, `validation.json` and `alpha-audit.json`. Re-run full checks with all historical inputs available; do not draw fake historical replacements merely to make checks green.
9. Push completed work to the art branch, provide an updated preview and downloadable ZIP/checksum, and state the true completion count and any real blocker. Do not claim all 375 are complete while rows remain. Do not promise automatic resume unless a scheduler has actually been configured.

## 8. Local workspace and archived tools — portability caveats

The previous workspace was `/workspace/phc-nine-doors-2026-11-16/`, with `delivery/`, `jobs.json`, reference files, exporter/review/checkpoint scripts and baseline catalog/checksum snapshots. If that workspace still exists, its **record files and latest remote progress** are authoritative; some old narrative state files mention earlier checkpoints. The last art ZIP was `/workspace/PHC-Nine-Doors-175-Candidates-2026-11-16.zip` (93.5 MiB), with `.zip.sha256`. SHA-256: `43d5e6b2fc4cf7a643efa83ec176bfb2da9205baf1f93134f9d8276d88ee6b89`.

Archived scripts are available in `art/_archive/nine-doors/2026-11-16/`, including `export-one.py`, `review.py`, `review-batch.py`, `checkpoint.py`, `seal-checkpoint.py`, `validate-delivery.py`, `generation-worker.js`, `draw-line-icons.py` and `finalize-review.py`. **They are historical workflow sources, not a self-contained install-and-run package.** Some expect the old workspace layout, local baselines, runtime function stores, a `jobs.json` name or hardcoded bare Git path. In a fresh checkout, adapt paths and initialize from the latest repository catalog/checksums and `planned-jobs.json`; do not blindly execute a checkpoint script against an old baseline or overwrite another GPT's new work. `draw-line-icons.py` intentionally refuses existing outputs; those five SVGs are already done.

The old `finalize-review.py` contains assertions and overview selections for the 175-item checkpoint. **Update its fixed counts/selection when resuming; it is not a permanent validator for a larger delivery.** Review helpers may omit IDs lacking an active record; an omitted asset is still missing, not implicitly completed. Keep the rejected #323 source in its archive while making a fresh replacement.

Reference paths inside portable recipes point to repository art files. Resolve them against the current checkout, inspect them, and pass actual local paths to image generation. Download missing references from the repository when the old workspace is unavailable. Do not assume `/workspace` attachments from another conversation still exist.

The dedicated old bare publisher was `/workspace/phc-nine-doors-publish.git`. It retained commit/tree metadata and only changed/new blobs to save disk, using `GIT_NO_LAZY_FETCH=1`, changed-only staging, `write-tree --missing-ok`, `pack.window=0` and `push.negotiate=true`. It may be behind this handoff commit or later remote work: sync/inspect the remote before publishing. Do not fetch the entire large artwork history unnecessarily. Preserve final ZIPs and original generated files; remove disposable caches only after verifying a safe remote or byte-identical archive copy.

## 9. Completion criteria for the next delivery

- All remaining requested files painted in their correct modes, or every truly blocked row identified explicitly.
- No repeated finished rows, accidental cup accessory, flame-headed Wick, generic Wick in condition signs, unwanted full mascot in object-only actions or glowing white-ink signs.
- Exact paths, catalog IDs, sources, honest dimensions, hashes, UI exports and replaced-art archives retained.
- Review sheets at actual use sizes, complete manifest and accurate counts; no placeholder marked complete without real artwork.
- Applicable checks run and limitations stated accurately. No unrelated game/UI work.
- Work pushed to `art/nine-doors-2026-11-16`, with a preview, ZIP/checksum and a fresh concise handoff if unfinished.

