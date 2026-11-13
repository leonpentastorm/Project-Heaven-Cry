# Art requests: what needs an artist (or image generation)

**This is the one list to hand an artist.** It is kept up to date as the game changes: every time a rules pass adds,
renames or removes something that has art, the entry lands here in the same change. If the list is empty, nothing is
waiting.

It holds only what Claude cannot make. What Claude can make without an artist is at the bottom, so nobody is asked for
something that didn't need them.

## Read these first

| For | Read |
| --- | --- |
| Everything | [`art/style-guide/PHC-Style-Guide.md`](../style-guide/PHC-Style-Guide.md) (the only style guide) and [`art/AGENTS.md`](../AGENTS.md) (its short version for image agents) |
| Where files go, names, sizes, the catalog | [`art/README.md`](../README.md) |
| Wick icons (traits, perks, prayers, Calls) | [`art/icons/STYLE-LOCK.md`](../icons/STYLE-LOCK.md); the master is [`art/icons/traits/mind-without-fog.png`](../icons/traits/mind-without-fog.png); the production brief is [`wick-production-icons.md`](wick-production-icons.md) |
| Colours | [`art/style-guide/palette.json`](../style-guide/palette.json) and [`docs/design/colour-system.md`](../../docs/design/colour-system.md) |
| Skill portraits (the 27 faceless figures) | the style guide's skill-portrait mode; examples in [`art/icons/skills/`](../icons/skills/) |
| Character portraits | [`archetype-portraits.md`](archetype-portraits.md), [`first-patch-revival-redo.md`](first-patch-revival-redo.md) |
| Outburst feelings and modules | [`docs/design/handoffs/outburst-4.0-art-brief.md`](../../docs/design/handoffs/outburst-4.0-art-brief.md) |
| Prayers and patrons | [`docs/design/handoffs/blessing-art-brief.md`](../../docs/design/handoffs/blessing-art-brief.md) |
| The Narrator's avatar | [`wick-narrator-3d.md`](wick-narrator-3d.md) |

**How a delivery is checked:** `python3 tools/validate_art.py` (catalog, sizes, checksums, palette, ink). A new file
needs a catalog entry in [`art/catalog.json`](../catalog.json); Claude adds it and the UI sizes when the file arrives.

## Status words

- **Wanted:** nothing usable exists; the game shows a stand-in or nothing.
- **Stand-in:** the game uses something that works but isn't right (a neighbour's icon, a patched icon, a code-drawn
  shape). Replace when convenient.
- **At risk:** exists and is right today, but a planned rules change may make it wrong. Don't draw yet.
- **Planned:** wanted, but waiting on a design pass named in the row. Don't start.
- **Done:** delivered and in the catalog (kept here for one release, then removed).

## Open requests

**Ready-to-paste prompts for an image generator** (12 Nov 2026): [`GPT-PROMPTS-2026-11-12.md`](GPT-PROMPTS-2026-11-12.md) covers W1 to W3, F1, F2 and the two maps whose layouts are set (M1, M6).

### 1. Wick icons (white flat ink, 1024 × 1024, transparent; the STYLE-LOCK applies)

| # | For | Status | What it must show | Direction | Goes to |
| --- | --- | --- | --- | --- | --- |
| W1 | **The nine Calls:** Order, Rally, Brief, Name It, Cue, Spot, Warn, Threaten, Taunt (`data/calls.json`) | Done: nine icons delivered, cataloged and shown on the Calls tab chips (`call-<name>`) | One icon a Call: Wick calling out across a fight. Each must read as a shout with a different purpose (an order to a squadmate, a rallying cry, a quick briefing, naming a fear out loud, a cue, a pointed finger at a target, a warning, a threat, a goad) | Same Wick, same line weight as the perk set. A small speech mark, sound lines or a pointing hand may carry the idea; no text in the image. They sit side by side, so the nine silhouettes must differ at 44 px | `art/icons/calls/<name>.png` (new folder; `order.png`, `name-it.png`, …) |
| W2 | **Both Hands** (perk: a blade in one hand, a gun in the other; a melee hit steadies the next shot) | Done: fresh sword-and-pistol pose delivered; previous stand-in archived | Wick fighting with a sword and a pistol at once | A fresh pose, not the Hot Swap spin: mid-strike with the blade, the pistol already levelled. The old Origami Hands icon it replaced is in `art/_archive/perks/wick/replaced/` | `art/icons/perks/both-hands.png` |
| W3 | **Rebuke**, the seventh Whisper (rules 1.21, 12 Nov 2026: a short prayer that hurts one enemy; `data/patrons.json` `whispers`) | Done: image_gen Wick Whisper delivered and cataloged | Wick rebuking: one hand raised flat toward someone out of frame, a single hard ray of light leaving it. It must read as a scolding word that lands, not as a spell | The six Whisper icons are the set to match (`art/icons/prayers/whisper-*.png`): same Wick, same line weight, one small light source. No colour; every patron uses it | `art/icons/prayers/whisper-rebuke.png` (then `npm run assets`) |

### 2. Outburst feelings and modules

| # | For | Status | What it must show | Direction | Goes to |
| --- | --- | --- | --- | --- | --- |
| F1 | **The 25 feelings** poured into an Outburst | Done: all 25 feeling glyphs delivered and shown (HEART panel, stage bar, Magic tab, unlock card); family style approved | One glyph a feeling. Rules 1.17 (11 Nov 2026) changed what some feelings do, not what they mean: no glyph changes (Relief now eases Strain a point at a time; Calm steadies the cast at a price; Love and Guilt also reach an ally outside the shape). Rules 1.19 (11 Nov 2026) gave six feelings a new job (Grief reads a fallen ally, Fear throws the caster back, Joy widens the critical, Hope cleanses, Guilt draws the enemy's fire, Longing only reaches further): each glyph draws the feeling, not its effect, so **no glyph changes**. The Damage school's new ways (Strike, Finish, Brand, Drain), Control's Swap and Status' Silenced are words on a chip: **no new icons** | The brief has every feeling, its meaning and its look: [`outburst-4.0-art-brief.md`](../../docs/design/handoffs/outburst-4.0-art-brief.md) | `art/icons/feelings/feeling-<id>.png` |
| F2 | **The Outburst modules** | Done: all 38 modules plus Revert, Practice and Felt UI marks delivered and shown (modules in the Magic tab and design cards; Revert on the HEART buttons, Practice on the practice bar, Felt on the unlock card); family style approved | One icon a module. **Impact needs no icon any more: the module was retired in rules 1.17 (11 Nov 2026)** | Same brief (skip its Impact row) | `art/icons/modules/module-<id>.png` |

Delivered on `art/briefs-complete` (12 Nov 2026): **77 icons** across W1–W3, F1 and F2.
Sources, exports, contact sheets and implementation notes: [`delivery handoff`](../_archive/deliveries/2026-11-12/HANDOFF.md).
Leon approved both Outburst test-set family styles; individual artwork remains review-candidate, `production_approved:false`.

### 3. Maps

**The rule for every map (Leon, 11 Nov 2026).** A fight map is at most **26 × 26 tiles** (A to Z by 1 to 26). The
Proving Ground is that full size. A campaign or a later game mode may set a smaller map for a place that should feel
tight; the size is chosen when the campaign is made. The four maps that were painted before this (M813's, 16 × 11 tiles each) are retired to plain colour and kept in
`art/_archive/maps/m813/retired-2026-11/` as the reference for the look. (The Proving Ground was listed as a fifth
painted map; it only ever had its banner, which stays.)

**Direction for all of them.** The same Heavenprint map treatment as the retired four: top-down, the same tile scale
and light, so tokens and object sprites sit on it unchanged. A map shows approaches, flanks and a way round, so a squad
can manoeuvre instead of meeting head-on. Paint to the tile layout guide that `tools/render_map_guides.py` makes from
the campaign file: **a map is only ready to paint when its row below says its layout is set.**

| # | Map | Campaign | Size | Status | Notes | Goes to |
| --- | --- | --- | --- | --- | --- | --- |
| M1 | **The Proving Ground** | The Proving Ground (practice fights) | 26 × 26 | **Layout set** (rules 1.16, 11 Nov 2026; first layout, open to playtests). Ready to paint once Leon has played it. Guide: `python3 tools/render_map_guides.py data/campaigns/proving.json <folder>` | Packed sand under floodlights; the squad comes in from the west, drill units from the east. The first one to paint | `art/maps/proving-ground.png` |
| M2 | **The shield line** | The Last Ship Out (M813) | 16 × 11 today; to be set | Planned, with the M813 rewrite. Don't start | Leon: "M813 is too broken now with all we have changed… wait for the rewrite." Old painting: `art/_archive/maps/m813/retired-2026-11/shield-line.png` | `art/maps/m813/shield-line.png` |
| M3 | **Outpost-813 rear landing pad** | The Last Ship Out (M813) | 16 × 11 today; to be set | Planned, with the M813 rewrite. Don't start | Old painting: `art/_archive/maps/m813/retired-2026-11/rear-pad.png` | `art/maps/m813/rear-pad.png` |
| M4 | **Outpost-813** | The Last Ship Out (M813) | 16 × 11 today; to be set | Planned, with the M813 rewrite. Don't start | Old painting: `art/_archive/maps/m813/retired-2026-11/outpost.png` | `art/maps/m813/outpost.png` |
| M5 | **Outpost-1** | The Last Ship Out (M813) | 16 × 11 today; to be set | Planned, with the M813 rewrite. Don't start | Old painting: `art/_archive/maps/m813/retired-2026-11/outpost-1.png` | `art/maps/m813/outpost-1.png` |
| M6 | **Open ground** | The Narrator's Own Start, and any fight with no map of its own | 26 × 26 | **Layout set** (rules 1.16; `data/maps.json`, `layouts.open_ground`). Never painted; plain colour today. Guide: the same tool on `data/campaigns/own.json` | The generic field the Narrator uses when a story names no place: it should read as "somewhere outdoors" and suit any world. Worth two or three variants later (wasteland, street, forest edge) | `art/maps/open-ground.png` |
| M7 | **The mining camp** | A God-Plot on a Mining World | 26 × 26 | First layout set (rules 1.16), but the campaign is still a sketch: wait until it is written. Never painted | A shrine camp on a mining world | `art/maps/godplot/shrine-camp.png` |
| M8 | **The penthouse** | A Summoning in Central City | 16 × 11 (an interior; kept small) | Layout unchanged; the campaign is still a sketch: wait until it is written. Never painted | A Central City penthouse where a summoning goes wrong | `art/maps/summoning/penthouse.png` |
| M9 | **The lifted town** | The Town Where the Curse Is Lifted | 26 × 26 | First layout set (rules 1.16), but the campaign is still a sketch: wait until it is written. Never painted | A Bazaim-style town of lifted curses | `art/maps/curse/lifted-town.png` |

### 3b. Portraits and illustrations

Nothing waiting.

### 3c. Survival mode art (requested 13 Nov 2026)

| # | For | Status | What it must show | Direction | Goes to |
| --- | --- | --- | --- | --- | --- |
| S1 | **Survival mode art: 294 images**: **216 map-kit pieces (six settings, 36 each: 3 ground tiles, 3 decals, 5 wall pieces, 21 object sprites by engine kind id, 4 set dressing)**, 24 fight backdrops (six settings, four each: AHOC chapter outpost, Central City back streets, a Daggerfall-type battlefield, a machine works and drone foundry, a shrine and cathedral district, a rim station), **18 painted top-down battle maps** (three a setting), 2 path-map backdrops, 8 node scenes (shops, rests, an Elite's lair, a Boss's door, a reward cache), 10 portraits (shopkeepers, medic, mission-giver, five Elite and Boss faces: ork, crawler, robot, beast, upper_realm), 13 gear follow-ups (three missing magazines, ten 32 px re-dos, E2b), 3 optional cards (title, run over, run won) | **Wanted** (requested 13 Nov 2026) | Backdrops: no characters, calm centre, detail at the edges, readable at 40% under a grid. Maps: straight overhead, 2600 x 2600 (26 x 26 tiles of 100 px, about 39 m across), no grid lines, no text, clear floor against clear cover. All in Heavenprint, one hand per set | **Backdrops, node scenes, cards and the path map are for the game. The painted maps are training material first (Leon, 13 Nov: "painted map too, let it chew on it so we have enough for the LoRA later"); whether the game goes back to showing painted maps is a later design decision, not this request's** (maps are drawn from tiles today, rules 1.16). Backdrops and maps are also the 20 to 40 scenes for Leon's own model (`FORGE-PHC.md`), so consistency across the batch matters more than any single picture. Paste-ready prompts, make-order and counts: [`GPT-PROMPTS-2026-11-13-survival.md`](GPT-PROMPTS-2026-11-13-survival.md). **The game draws maps from tiles and these pieces; painted maps are for the style model.** The kit (batch 1c, view and size matched to `art/sprites/objects/`) goes right after the backdrops and before the painted maps. **Done means:** every file saved under its proposed name, delivered to Leon as review candidates, then catalogued; the checks (no figures, calm centre, no text) pass | Proposed (Leon and Claude may rename): `art/sprites/kit/<setting>/`, `art/illustrations/survival/{backdrops,map,nodes,cards}/`, `art/maps/survival/`, `art/portraits/survival/`; gear re-dos replace files in `art/icons/gear/` |

### 4. Equipment artwork (Heavenprint)

| # | For | Status | What it must show | Direction | Goes to |
| --- | --- | --- | --- | --- | --- |
| E1 | **A painted picture for every weapon and piece of gear** (Leon, 11 Nov 2026). Today: 60 weapons, 21 armour and focus items, about 100 with what is planned, and growing | **Planned, with Equipment 2.0. Don't start yet:** that pass will add, rename and re-tier gear (Masterwork and unique weapons with their own Weapon Art among them), so the list of items isn't final | The item itself as an object, in Heavenprint paint: the inspect view in the backpack and the ARMS tab, a loot card, a shop. The line icons stay for small sizes (buttons, the pack grid); the painting is the large view | Heavenprint as in the style guide, object on a plain dark ground, no hands and no figure, three-quarter view, one consistent light. Every weapon is invented, never a real one, and shows its faction's signature the way its line icon does ([`weapon-icons.md`](../style-guide/weapon-icons.md) lists each faction's signature and the family silhouettes: the painting and the line icon of one weapon must be recognisably the same object). Masterwork and unique pieces get a visibly richer treatment. Size and framing to be fixed when Equipment 2.0 fixes the screens that show them | `art/illustrations/gear/<item-id>.png` (proposed) |

When Equipment 2.0 settles the item list, this row is replaced by one row an item, grouped by family, each with its
line icon beside it as the reference.

### 4b. Painted gear icons for inventory and shop (Heavenprint, 1024 x 1024, transparent)

**Leon, 13 Nov 2026:** "Update the artist brief for GPT, give it prompts to make a Heavenprint icon for every weapon and
item the engine currently recognises. We will do the roguelike after Classes 3.0 and that needs a shop and many new
pipelines, better prepare now. The current SVG icons for weapons are just placeholders, and for effects like Sunder."
**The rule change:** the monoline SVG weapon and armour icons (`art/icons/weapons`, `armour`, `focus`) are
**placeholders for inventory and shop use**. They stay for effects and small marks (Sunder's weapon strike, the hover
card's weapon glyph) until painted icons can be traced or simplified from. This row supersedes the "What does not need
an artist" bullet on weapon and armour icons below, for inventory and shop art only.

| # | For | Status | What it must show | Direction | Goes to |
| --- | --- | --- | --- | --- | --- |
| E2 | **A painted icon for every weapon and item the engine recognises: 147 icons** (60 weapons, 16 armour, 3 shields, 3 focuses, 13 mods, 7 tools, 5 consumables, 4 special ammunition, 3 food, 2 lights, 2 documents, 1 augment, 1 loot, 1 companion, and 26 derived: torso armour classes 1 to 5, 12 loose-round calibres, 8 magazine families, personal effects). The Visualizer (`focus-visualizer`) is **Planned, coming in Classes 3.0**: draw it with the batch, it is in the engine's plan | **Wanted.** Ready to paint: the list is generated from data (13 Nov 2026). Re-check it against `data/weapons.json` and `data/items.json` before a later batch (Classes 3.0 and Equipment changes will add items) | One object, three-quarter view, painted, bold silhouette first, readable at 64 px (shop grid) and 32 px (backpack row). Rarity by finish and wear, never a border; no text, no hands, no figures, no real-world makes | Heavenprint object icon: rule in [`gear-icons.md`](../style-guide/gear-icons.md); faction silhouettes and signatures in [`weapon-icons.md`](../style-guide/weapon-icons.md); **paste-ready prompts, one per item, in [`GPT-PROMPTS-2026-11-13-gear.md`](GPT-PROMPTS-2026-11-13-gear.md)**. Send batch 1 (the starting gear, 24 icons) to Leon first and wait for his verdict before batching the rest | `art/icons/gear/<kind>-<id>.png` (master, 1024 x 1024 RGBA); the pipeline makes the web exports (256, 128, 64 and 32 px) and the catalog entries (a new `gear` map, ids `gear-<kind>-<id>`) |
| E2b | **After the 13 Nov delivery (151 icons, wired in the game by item id):** every weapon and item in data has its icon. Still missing: **three magazines** for guns that have one but no painting (`mag-magistrate` for the Magistrate heavy pistol, `mag-brigade_shotgun` for the Brigade auto-shotgun, `mag-repeating_crossbow` for the repeating crossbow; the game shows no icon on those rows). **Re-paint for 32 px** (they don't read in the backpack row): the pistol, SMG and rifle magazines and the extended-mag mod (four near-identical slivers), the katana and the Emanator katana (twins at 32 px: the Emanator's violet lens vanishes), the long rifle, the marksman rifle and the .700 (thin near-twins), the service pistol (charcoal on the dark panel) | **Wanted** (13 Nov 2026, the gear-icons hand-off) | As E2 | As E2 | As E2 |

**Done means:** a transparent 1024 x 1024 PNG master per file name in the prompts file; the object inside the central
80 to 85% of the canvas; no text; checked on the dark panel `#10151F` at 64 px and 32 px; then Claude adds the catalog
entry, makes the web exports, runs `python3 tools/validate_art.py` and `npm run assets`, and Leon's approval flips it
from review candidate to production. Rarity variants (`--worn`, `--fine`, `--masterwork`, `--relic`, `--celestial`) are
a second pass; the prompts file lists the first four.

### 5. Classes 3.0 (Class Roster Revision 4 and its seven specs; requested 13 Nov 2026)

**Leon, 13 Nov 2026:** "The artist is working, so push anything needed to him." Collected from each spec's "The screen"
section (`docs/design/shadow-spec.md`, `bonds-spec.md`, `figments-spec.md`, `chaplain-spec.md`, `reactions-spec.md`) and
`rev4-moves-and-rename.md`. **Paste-ready prompts, one per image, in
[`GPT-PROMPTS-2026-11-13-classes-3.0.md`](GPT-PROMPTS-2026-11-13-classes-3.0.md)** (the order to make them in is at its top). Every
row is **Wanted, requested 13 Nov**; nothing is built yet, but every picture shows an action or an object, never a label, so a
rename of a *(Suggested)* name changes nothing. **53 images for the artist**: 45 Wick icons, 2 gear icons (and the
Visualizer, already in E2), 6 Figment portraits. E2 (4b above) now stands at **149** gear icons, not 147: the Attuner (148)
and the Toxin vial (149) were added to the gear file the same day.

| # | For | Status | What it must show | Direction | Goes to |
| --- | --- | --- | --- | --- | --- |
| C1 | **Chaplain and reactions: 6 Wick icons** (Ward, Sanctuary, Smite, Verdict, Reflex, Run and Gun) (`chaplain-spec.md` 9, `reactions-spec.md` 9) | Wanted, requested 13 Nov | One action each: whispering a Ward onto an ally; singing a Sanctuary over a 3 x 3 patch; a weapon hit that carries the god's ray; one decided blow after a pointed finger (Verdict, was Judgement); two reactions in one dodge; running while the gun stays level. Ward and Sanctuary join the prayer icons (one small light source) | Wick, white flat ink, STYLE-LOCK; one full figure, others partial. The reactions spec calls Run and Gun "a line icon"; the lead's call is a Wick icon like every verb, so it matches the rest of the action row | `art/icons/prayers/whisper-ward.png`, `hymn-sanctuary.png`; `art/icons/moves/smite.png`, `verdict.png`, `reflex.png`, `run-and-gun.png` |
| C2 | **Shadow (the Operative): 8 Wick icons**: the four kinds (Slip, Mark, Work, Break) and the moves with no icon (Toxin, Sabotage, Execution, Called Shot) (`shadow-spec.md` 9) | Wanted, requested 13 Nov | The four group marks the Shadow tab uses (the 21 verbs reuse their group's mark until drawn: four different silhouettes); Toxin is a drop onto an edge; Sabotage a cut cable in a machine; Execution a reversed blade at a nearly-spent ring; Called Shot a ring round one limb. **Fade** (was Vanish) needs nothing new: it reuses `vanishing-act.png`; the Mark move uses the Mark group mark | Same | `art/icons/shadow/slip.png`, `mark.png`, `work.png`, `break.png`; `art/icons/moves/toxin.png`, `sabotage.png`, `execution.png`, `called-shot.png` |
| C3 | **Bonds, Tending and the Mender: 16 Wick icons**: Bond (ally), Bond (enemy), Mend, Touch, Shield, Raise, Settle, Soothe, Guide, Share a Hit, and the Mender's six moves Triage, Ledger, Inspire, Take the Weight, Brimming, Rally (`bonds-spec.md` 9) | Wanted, requested 13 Nov | One icon a verb for the Tend tab and the class chips. The ally Bond is a slack thread with a heart knot to a partial hand; the enemy Bond a taut thread to a spiked gauntlet (readable apart at 32 px). Others are partials. The Ledger and Brimming illustrate rules that are themselves new (see the prompts file) | Same; the ribbon-and-knot of the feeling glyphs recurs in Inspire. The spec lists 12; the lead added the enemy Bond and the three Mender moves it left out (Triage, Inspire, Rally) so the Mender's six are a set | `art/icons/tending/bond.png`, `bond-foe.png`, `mend.png`, `touch.png`, `shield.png`, `raise.png`, `settle.png`, `soothe.png`, `guide.png`, `share-a-hit.png`; `art/icons/moves/triage.png`, `ledger.png`, `inspire.png`, `take-the-weight.png`, `brimming.png`, `mender-rally.png` |
| C4 | **Figments and the Rigger: 15 Wick icons**: ten trait icons (Armoured, Swift, Loud, Volatile, Tethered, Mirror, Barbed, Lasting, Keen, Hollow), Picture and Let go, and the Rigger's Salvage, Overclock and Scrap Turret (`figments-spec.md` 9) | Wanted, requested 13 Nov | Trait chips on a design, 32 px; Picture (bots gathering into a shape) and Let go (a shape coming apart) must differ at a glance; Salvage a core pulled from a wreck; Overclock a dial cranked on a machine; Scrap Turret a junk-built turret. The Figment itself is never a second Wick | Same | `art/icons/figments/trait-<id>.png`, `verb-picture.png`, `verb-let-go.png`; `art/icons/moves/salvage.png`, `overclock.png`, `scrap-turret.png` |
| C5 | **The Attuner** (the fourth standard glove, the Bond focus; Leon: "sounds cool, keep it") and **the Toxin vial** (the Operative's supply, a pack item: `rev4-primitives.md` 3.7): 2 gear icons | Wanted, requested 13 Nov | The Attuner: back of the hand, a small round core and a fan of fine filaments to each fingertip, one lit, in Insight's ink `#EB95B7`; same family and scale as the Evoker, Emanator and Visualizer. The Toxin vial: a slim stoppered phial with a dropper cap and a teal fill. **The Visualizer (gear number 100) is already part of E2**; it is drawn in the same sitting | Heavenprint painted object (gear rule). In the gear file as numbers 148 and 149 | `art/icons/gear/focus-attuner.png`, `art/icons/gear/consumable-toxin_vial.png` |
| C6 | **Figment portraits: 6** (Double, Eye, Wall, Beast, Blade, and the Scrap Turret), "five form tokens and portraits (bots in the shape, Expression pigment)" (`figments-spec.md` 9). Shown on the map token and, since 13 Nov, in each held Figment's group header on the FIGMENTS tab (26 px round), which shows the token's badge in its owner's colour until they exist; wired by a form's `portrait` in `data/figments.json` (read by `owned.ts`) | Wanted, requested 13 Nov | One 4:5 portrait a form, shown cropped to a round token at 40 to 64 px (units here are face tokens, not map sprites): the whole subject inside the central circle. Abstract skill-portrait mode: black, cream, Expression pigment (`#075369`, `#14758B`, `#033443`); the bots as flecks; the Scrap Turret angular and welded, not bots | Skill-portrait mode (style guide section 15 to 17). Cream carries the light, because Expression's pigment is dark | `art/portraits/figments/figment-double.png`, `figment-eye.png`, `figment-wall.png`, `figment-beast.png`, `figment-blade.png`, `figment-scrap-turret.png` |

**Done means:** a master per file name in the prompts file (Wick icons pure white `#FFFFFF` on transparency, 1024 x 1024;
gear 1024 x 1024 RGBA, the object inside the central 80 to 85%; portraits 800 x 1000, no text); every Wick icon checked at
44 and 32 px on `#10151F`, with each batch seen on one sheet so no two silhouettes can be confused; then Claude adds the
catalog entries (`perks`-style maps for `moves`, `shadow`, `tending`, `figments`; `prayers`; the `gear` map; the figment
portraits), runs `python3 tools/validate_art.py` and `npm run assets`, and Leon's approval flips them from review candidate
to production. Send C1 to Leon first as the style check; then carry on.

**What already exists and is reused (nothing to make):** `art/icons/perks/vanishing-act.png` (Fade); the 25 feeling glyphs
(the feelings given along a Bond); the eight patron portraits and marks (the Chaplain's presence; Claude crops them);
`art/sprites/objects/mine.png` (a Rig trap, until a sprite is asked for); the gear prompts for the field kit (18), spare parts
(19), standard core (20) and stim injector (24) (the supply of the Rigger's Field Fix and Field Repair, the Mender's gear
actions and the Visualizer's core). **Class emblems:** per `rev4-moves-and-rename.md` section 3 they are code-drawn line icons
(`apps/web/src/game/classIcons.ts`), so no painted class emblem is requested; if Leon later wants painted class marks, that is a new request.

**Drawn by Claude, not the artist (Classes 3.0; so nobody waits on these):**

| What | Where | Note |
| --- | --- | --- |
| Class emblems redrawn: **Rigger** (the mask becomes a wrench crossed with a spark), **Mender** (the lyre becomes two hands around a plus), **Chaplain** (the dome becomes a dome under a flame); Bulwark, Breaker, Skirmisher, Operative (an eye over a lockpick), Sigilist and Channeler keep theirs | `classIcons.ts`, re-export `class-icons-sheet.png` | `rev4-moves-and-rename.md` section 3 |
| Meter marks: Shadow pips and its eye glyph (Unseen, In view, Seen); the Bond strip (chip frame, ally line, enemy thread, the Ledger bar); Figments pips and the Visualizer charge bar (EMPTY at 0); reaction pips (one, or two for the Skirmisher); the Ward pip and Sanctuary's zone outline | pure SVG in the UI | inks by the colour system: Perception `#40BAA0`, Insight `#EB95B7`, Expression `#5394AC` |
| Condition glyphs (line icons): Traced, Bonded, Exposed, Off Balance, Read, Settled, Judged | the conditions table | |
| Nothing to redraw: the perk **Bulwark is renamed Stonewall** (rules 1.30 section 4; display name only). Its Wick icon stays `art/icons/perks/bulwark.png` (Wick braces a riot shield); only the catalog label changed | `art/catalog.json` `bulwark` | item 1812 |
| Monoline focus icons: `focus/visualizer.svg`, `focus/attuner.svg` (beside the Evoker and the Emanator); monoline weapon icons `figment_claws`, `figment_edge` | `art/icons/focus/`, `art/icons/weapons/` | the painted gloves are Job 2 |
| The patron's standing presence (Chaplain): eight figures cropped from `art/portraits/patrons/` | `faithArt.ts` | |
| VFX and SFX **found, not drawn** (CC BY 4.0 or CC0, credited in the game): a particle sheet for bots streaming in and scattering, a build sound and an unravel sound | `sfxCredits.ts`, `credits.ts` | the one thing in the specs no art mode of ours covers: it needs texture, so it is sourced |

## At risk in the balance pass

The balance pass (`docs/design/proposals/2026-11-balance-pass.md`) will rewrite, merge or remove perks, traits and
class moves. An icon whose perk changes meaning lands in the table above as **Stand-in** with the new meaning; an icon
whose perk is removed goes to `art/_archive/`. **Don't commission perk or trait icons until the pass is done.** The
audit that starts it is `docs/design/handoffs/perk-audit.md`.

Already known to change (rules 1.14, 11 Nov 2026), icons to be judged once they are built:

| Perk | What changes | Its icon today |
| --- | --- | --- |
| Heart Overload | From "pay a Begin in HP" to "a free Begin right after a Release" | `art/icons/perks/heart-overload.png` |
| Resonance | From "allies' Releases count for you" to "your own Releases build on each other" | `art/icons/perks/resonance.png` |

## What does not need an artist

Claude makes these and they are not listed above:

- **Weapon and armour icons:** monoline line icons, drawn as SVG to
  [`art/style-guide/weapon-icons.md`](../style-guide/weapon-icons.md).
- **Recolours** of existing art (a skill portrait moved to another attribute's pigment:
  `tools/art/recolour_skill_portrait.py`).
- **A simple prop added to or removed from an existing icon** (a blade, a shield, a ring, an arrow), or two existing
  icons combined, when the poses allow it. These are logged above as **Stand-in** if a proper drawing would be better.
- **Effects that are only rings, lines, glyph strokes and tints** (SVG or CSS). Anything with texture (fire, smoke,
  sparks, impacts) comes from openly licensed assets, credited in the game.

Claude cannot draw Wick in a new pose or expression, or paint anything.

## Log

- **13 Nov 2026:** S1 opened: Survival mode art, 78 images (now 294 with the 216-piece map kit) (24 backdrops, 18 painted battle maps as training material, path map, node scenes, portraits, gear re-dos, cards); prompts in `GPT-PROMPTS-2026-11-13-survival.md`. Requested 13 Nov.
- **13 Nov 2026:** section 5 opened for Classes 3.0 (Revision 4): 53 images for the artist (45 Wick icons, 2 gear icons, 6 Figment portraits), prompts in `GPT-PROMPTS-2026-11-13-classes-3.0.md`; E2 is now 149 gear icons (the Attuner and the Toxin vial added).
- **12 Nov 2026:** W3 opened: Rebuke, a seventh Whisper (rules 1.21, the Faith fit). Thunderclap now also deals lightning damage and Lightning Rod's numbers moved; their icons (`hymn-old_overcast-1`, `-2`) still fit.
- **11 Nov 2026:** maps built to rules 1.16: M1 and M6 have their 26 × 26 layouts; the four M813 paintings moved to `art/_archive/maps/m813/retired-2026-11/` and left the catalog.
- **11 Nov 2026:** maps: the rule (26 × 26 at most, the Proving Ground at full size, smaller allowed per campaign) and one row a map, M1 to M9.
- **11 Nov 2026:** E1 added (Heavenprint artwork for all equipment, planned with Equipment 2.0).
- **11 Nov 2026:** list started. W1, W2, F1, F2 opened. Breaching Strike, Nothing Gets Past and Iron Grip were
  checked against their rules 1.13 meanings and fit as they are.
