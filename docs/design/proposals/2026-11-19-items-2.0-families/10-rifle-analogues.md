# Design material for file 10 (moved from the artist's file, 19 Nov 2026): the gun counterparts

The artist's file is `art/briefs/prompts-2026-11-19/10-rifle-analogues.md` (the style block, the 17 repaint prompts and
the 15 new-form prompts). This file keeps the design record that was cut from it: the coverage table, the five new lines'
design sheet, the count, what was left out, the redraw notes for files 06 and 09, and the hunting ideas.

**Leon's rulings (19 Nov 2026), applied here:**

- **R1:** everything proposed in the pack is approved: the five new maker lines (ADCorp, Chezknov, Central Command
  Arsenal, Smetanita sidearms, Albert Town), the 17 faithful repaints of existing guns (same id, same file name, new
  picture), and the redraw notes for files 06 and 09 (the spinner as the belt-fed general-purpose gun, the siege tube as
  the warhead-out-front launcher).
- **R2:** grades follow scheme S1: all five grades are painted for every graded item.
- **R3:** a gun counterpart's art reads as its real-world pattern at a glance (layout, proportions, magazine shape,
  sights, stock and furniture kept faithfully). Its name, maker and markings are ours: no real brand, model or maker name,
  logo, rollmark or text in game text, file names, prompts or the picture. Prompts describe a pattern by its features.
  Melee and strange weapons stay invented. Written into `art/style-guide/weapon-icons.md` rule 8.
- **R4:** eight heavy and strange families stand (launchers, rocket tubes, flamers, rotary, anti-materiel, powered
  blades, power gauntlets, thrown). The core rifle and the censer gun are advanced-class weapons and are out of this pack.
- **R5:** a gun line's base scales on Dexterity only; a variant's second skill is always an alpha skill (Durability, Raw
  Power, Ingenuity, Brain Power, Visualization, Empathy, Will Power, Faith) and only where it honestly applies, otherwise
  none. Never a beta or a gamma.

**Leon's direction that started this file (19 Nov 2026):** "make sure most modern rifles have an analogue in ours, so fans
of those guns can go hunting"; and on the art: he wants to stumble on a gun and know the famous pattern at once, without
its real name being in the game.

Sources read: `data/weapons.json`, `art/catalog.json`, `art/briefs/ART-REQUESTS-2026-11-19.md` section 4.3 (the 12 maker
lines), `06-gun-forms.md`, `09-heavy-and-strange.md`, `docs/lore/Factions.md`, `docs/lore/Sector-Earth.md`,
`art/briefs/GPT-PROMPTS-2026-11-13-gear.md`, `art/style-guide/weapon-icons.md`. "Reads?" was judged from the 256 px exports
of the existing paintings and the prompts of 06 and 09.

---

## 1. The coverage table (generic pattern words only, never a brand)

Ranked by how many fans hunt the pattern (the lead's judgement). "Reads?" = does today's painting, or the proposed prompt,
read as the pattern at a glance. Actions: **REPAINT** = same id and numbers, a new faithful master (artist file section
1); **REDRAW 06 / 09** = the form stays, its prompt is redrawn to the pattern (section 5 below); **NEW** = a new form
(artist file section 2).

### The top dozen

| # | Archetype (generic pattern words) | What fans love | Our counterpart | Reads? | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | The stamped long-stroke rifle with the curved magazine, wood furniture, gas tube over the barrel | It never jams, it is everywhere | `hellraiser_service_rifle` | partly | REPAINT |
| 2 | The modular light rifle: straight-line stock, flat-top rail, A-frame front sight | The endlessly customised black rifle | none | - | NEW: `adcorp_line_rifle` |
| 3 | The polymer striker service pistol: blocky slide, square trigger guard, no hammer | The pistol in every holster | `service_pistol` | partly | REPAINT |
| 4 | The steel single-action heavy pistol: slim slide, grip safety, spur hammer, wood grips | A century of service | `magistrate_pistol` | partly | REPAINT |
| 5 | The roller-delayed submachine gun: slim receiver tube, curved magazine, drum rear sight | The smoothest SMG ever made | none | - | NEW: `chezknov_machine_carbine` |
| 6 | The big-bore gas-operated semi-auto hand cannon: long slab slide, triangular-faced barrel | The most absurd pistol on screen | none | - | NEW: `smetanita_hand_cannon` |
| 7 | The bolt-action sniper rifle: thumbhole chassis stock, fluted heavy barrel, big scope, bipod | One shot from a mile away | `long_rifle` | partly | REPAINT |
| 8 | The pump combat shotgun: tube under the barrel, ribbed pump | The shotgun in every patrol car | `lumeri_scattergun` | partly | REPAINT |
| 9 | The semi-auto anti-materiel rifle: arrowhead double-chamber brake, carry handle, bipod | The biggest rifle a person can fire | `blackpoint_700` | partly | REPAINT |
| 10 | The open-top steel double-action service pistol | The action-film pistol | none | - | NEW: `smetanita_service_pistol` |
| 11 | The bullpup with the long carry handle over the whole body | A rifle that is all handle | `legion_bullpup` | yes | none |
| 12 | The top-fed bullpup PDW: flat translucent magazine along the top | The futuristic gun every game has | none | - | NEW: `arsenal_courier_pdw` |

### The rest

| # | Archetype (generic pattern words) | Our counterpart | Reads? | Action |
| --- | --- | --- | --- | --- |
| 13 | The roller-delayed battle rifle: slim receiver, straight box magazine, drum rear sight | none | - | NEW: `chezknov_battle_rifle` |
| 14 | The metric battle rifle: carry handle, tall front sight, straight 20-round box | `adamantile_battle_rifle` | no | REPAINT |
| 15 | The short-stroke piston modular rifle: monolithic upper rail, side-folding stock | none | - | NEW: `arsenal_piston_rifle` |
| 16 | The squad automatic weapon: belt box under the receiver, carry handle, bipod | `hellraiser_lmg` | partly | REPAINT |
| 17 | The general-purpose machine gun: full-power belt, quick-change barrel, bipod | 09's spinner | - | REDRAW 09 |
| 18 | The six-barrel rotary gun | `hellraiser_rotary` | yes | none |
| 19 | The long semi-auto marksman rifle with the skeleton thumbhole stock | `ccec_marksman_rifle` | no | REPAINT |
| 20 | The folding-stock short assault carbine with the big muzzle booster | 06's trench carbine | partly | REDRAW 06 |
| 21 | The short-barrel modular carbine for close quarters | none | - | NEW: `adcorp_short_carbine` |
| 22 | The modular big-frame designated marksman rifle | none | - | NEW: `adcorp_designated_rifle` |
| 23 | The compact PDW with the magazine in the grip, folding front grip | `legion_pdw` | partly | REPAINT |
| 24 | The telescoping-bolt boxy SMG: magazine through the grip | `decrkm_smg` | no | REPAINT |
| 25 | The burst machine pistol with the fold-down front grip | `decrkm_autopistol` | partly | REPAINT |
| 26 | The classic drum submachine gun: finned barrel, vertical front grip | `mandestra_drum_gun` | partly | REPAINT |
| 27 | The integrally suppressed SMG | `whisper_smg` | yes | none |
| 28 | The big double-action magnum revolver with the full underlug | `frontier_hand_cannon` | partly | REPAINT |
| 29 | The single-action army revolver | `drifter_revolver` | yes | none |
| 30 | The snub-nosed revolver | 06's snub revolver | yes | none |
| 31 | The lever-action rifle | `lever_carbine` | yes | none |
| 32 | The side-by-side double and its sawn-off | `coach_gun`, `sawn_off`, 06's fowling gun | yes | none |
| 33 | The semi-auto tube-fed combat shotgun | 06's long scatter | no | REDRAW 06 |
| 34 | The box-fed shotgun on the stamped long-stroke body | `brigade_auto_shotgun` | no | REPAINT |
| 35 | The full-auto drum shotgun | 06's drum shotgun | partly | REDRAW 06 |
| 36 | The wood-stocked full-power battle rifle with the op-rod on the side | none | - | NEW: `albert_town_service_rifle` |
| 37 | The scoped walnut bolt-action hunting rifle | none | - | NEW: `albert_town_stalking_rifle` |
| 38 | The semi-auto wood carbine with the folding blade bayonet | none | - | NEW: `albert_town_brush_carbine` |
| 39 | The small slim double-action pocket pistol | none | - | NEW: `smetanita_pocket_pistol` |
| 40 | The two-shot over-and-under derringer | `parlour_pistol` | yes | none |
| 41 | The single-shot break-action 40 mm launcher | `smetanita_thumper` | partly | REPAINT |
| 42 | The revolving six-shot 40 mm launcher | 09's drum launcher | partly | REDRAW 09 |
| 43 | The under-barrel 40 mm launcher | `mod_underslung` (a mod) | partly | none now (revisit with the mods) |
| 44 | The shoulder-fired rocket launcher with the warhead out of the front | 09's siege tube | - | REDRAW 09 |
| 45 | The telescoping disposable rocket tube | 09's throwaway tube | yes | none |
| 46 | The reusable recoilless rifle | `breacher_tube` | partly | REPAINT |

**Coverage of the 46:** 7 by an existing gun as it is; 17 by a repaint; 2 by a form of 06 or 09 as written; 6 by a form
of 06 or 09 after its redraw; 1 by a mod; 13 by the 15 new forms; 0 left out.

---

## 2. The five new lines (approved, R1; second skills by R5)

Every line of 12 and every heavy family already has three forms, so the uncovered patterns go into five new maker lines
of three forms each, each a real pattern family whose three forms belong together. Each line has a **base that scales on
Dexterity only** and two variants that take an **alpha second skill where it honestly applies, otherwise none** (R5).
Dexterity always rolls the shot; the second skill feeds the signature, never the hit. Signatures are sketches: the build
reads them through `docs/ENGINE-HOOKS.md`, and anything missing goes on the lead's "Needs a new primitive" list.

Makers: **ADCorp** is the Rigaz Trade Company's arms division, which arms both Central City and the Thousand-Planet City
(`Factions.md`; RTC's signature is "sleek lines and a tag"); **Chezknov** and **Albert Town** are EPCCG place names with no
lore yet (`Sector-Earth.md`); the **Smetanita Conjunction** already makes the thumper; the **Central Command Arsenal** is
Central City's state arsenal (Central City's signature: "clean civilian lines").

| Line | Maker (accent) | Close / standard / long | Base (Dexterity only) | Signature | Close variant: second skill | Long variant: second skill |
| --- | --- | --- | --- | --- | --- | --- |
| G13 ADCorp modular rifles | ADCorp (small blank tag, muted vermilion `#C4553A`, set 19 Nov under R1) | `adcorp_short_carbine` / `adcorp_line_rifle` / `adcorp_designated_rifle` | `adcorp_line_rifle` | **Modular:** the Forge fits and swaps its mods for less | none | **Ingenuity**: feeds the Aimed bonus on a foe you have Tagged (Shadow's door) |
| G14 Chezknov roller guns | Chezknov Works (no colour; one brass rivet) | `chezknov_machine_carbine` / `chezknov_battle_rifle` / `chezknov_precision_rifle` | `chezknov_battle_rifle` | **Roller-locked:** less Recoil on Bursts | **Raw Power**: feeds the Recoil relief on a burst | **Ingenuity**: feeds the overwatch shot |
| G15 Central Command Arsenal | Central Command Arsenal (thin blue-grey `#5394AC` trim) | `arsenal_courier_pdw` / `arsenal_piston_rifle` / `arsenal_heavy_rifle` | `arsenal_piston_rifle` | **Drill-clean:** a reload costs 1 AP less | none | **Brain Power**: feeds the range bands an Aimed Shot ignores |
| G16 Smetanita sidearms | Smetanita Conjunction (lacquer black and brass; a blank brass grip medallion) | `smetanita_pocket_pistol` / `smetanita_service_pistol` / `smetanita_hand_cannon` | `smetanita_service_pistol` | **A threat in the hand:** a hit adds Pressure | **Ingenuity**: feeds the first shot drawn from Hidden (Shadow's door) | **Raw Power**: feeds the Recoil it forgives and a 1-tile Knockback |
| G17 Albert Town rifle works | Albert Town Rifle Works (walnut and blued steel; one brass buttplate screw) | `albert_town_brush_carbine` / `albert_town_service_rifle` / `albert_town_stalking_rifle` | `albert_town_service_rifle` | **Walnut and patience:** an Aimed Shot after a turn without moving is +1 to hit | **Raw Power**: feeds the folding bayonet's charge | **Ingenuity**: feeds the critical on an Aimed Shot at a foe that has not seen you |

**What changed under R5** (the draft used betas and gammas): short carbine Reaction Speed to none; designated rifle Acuity
to Ingenuity; machine carbine Composure to Raw Power; precision rifle Vigilance to Ingenuity; courier PDW Athletics to
none; pocket pistol Insinuation to Ingenuity; brush carbine Guts to Raw Power; stalking rifle Senses to Ingenuity. Brain
Power and Raw Power stayed. Second skills used: Ingenuity 4, Raw Power 3, Brain Power 1, none 2.

Calibres (all existing in `rules.json`, no new calibre): the rifles of G13, G14 (battle and precision), G15 (piston and
heavy) and all of G17: `rifle`; the G14 machine carbine, the G15 courier PDW, the G16 pocket and service pistols: `.32
decrkm`; the G16 hand cannon: `.50 frontier`. Damage, range and magazine are fitted with the balance tools when the lines
are built (spec first, then data).

Display names, final: ADCorp line rifle, ADCorp short carbine, ADCorp designated rifle; Chezknov battle rifle, Chezknov
machine carbine, Chezknov precision rifle; Arsenal piston rifle, Arsenal courier PDW, Arsenal heavy rifle; Smetanita
service pistol, Smetanita pocket pistol, Smetanita hand cannon; Albert Town service rifle, Albert Town brush carbine,
Albert Town stalking rifle.

---

## 3. The count (scheme S1)

| What | Items | Standards to paint | Grade pictures | Pictures |
| --- | --- | --- | --- | --- |
| New forms (5 lines x 3) | 15 | 15 | 60 (4 each) | 75 |
| Repaints of existing guns (same ids) | 17 (no new item) | 17 (replace the master) | already counted in file 08's sets; made from the repaint | 17 |
| Redrawn forms of 06 and 09 | 10 (no new item) | counted in 06 and 09 | counted there | 0 |
| Line icons (Claude's) | 15 new, and the repainted ids' icons redrawn to match | - | - | - |

The 15 new forms add 15 graded items to file 08's count (C3), which was written before this file. The 23 uniques are
separate.

---

## 4. Left out, and why

1. **The heavy machine gun on a tripod:** emplaced, not carried; a map object when the maps grow.
2. **The asymmetric-recoil SMG** (tall angular frame): its whole silhouette is its mechanism; a sixth line's candidate.
3. **The bullpup with the integral optic and the curved green body:** next after the modular rifle.
4. **The dual-tube bullpup pump shotgun:** niche; the shotgun lines are already six forms deep.
5. **The boxy polymer successor of the roller-delayed SMG:** reads too close to number 5 at 64 px.

A sixth line for these: not now; revisit after 0.34 (the lead's recommendation, carried under "no answer means yes").

---

## 5. Redraw notes for files 06 and 09 (approved, R1; kept here as the record)

| File | Form | Redraw as (by features) |
| --- | --- | --- |
| 06 | trench carbine (`hellraiser_trench_carbine`) | The folding-stock short carbine of the stamped long-stroke family: a very short barrel with a large cone-shaped muzzle booster, a hinged top cover with a small rear sight, a short curved magazine, a side-folding skeleton stock; no bayonet. Oxide-red band kept |
| 06 | Adamantile carbine | The para version of the metric battle rifle (the repainted `adamantile_battle_rifle`): a short barrel, a side-folding skeleton metal stock, the carry handle; the crest at the stock heel |
| 06 | Adamantile heavy rifle | The heavy-barrel squad version of the same rifle: a heavy barrel, a folding bipod at the front, a long flash hider, a wooden-look stock; the crest |
| 06 | long scatter (`lumeri_long_scatter`) | The semi-auto tube-fed combat shotgun: a gas-operated receiver, a ghost-ring rear sight and a post front sight, a collapsible stock with a pistol grip, a long tube magazine; the ivory paint and one lancet cut kept |
| 06 | drum shotgun (`brigade_drum_shotgun`) | The full-auto drum shotgun: a straight-line boxy body, a carry handle on top, a large round drum under the receiver, a short barrel with a big flash hider; the crest kept, no ram plate |
| 06 | DECRKM carbine | The long-barrel semi-auto carbine of the boxy telescoping-bolt SMG (to match the repainted `decrkm_smg`): the same boxy body with the magazine through the grip, a long thin barrel, a fixed wooden stock |
| 06 | whisper carbine | The integrally suppressed carbine: the fat smooth suppressor as the whole fore-end, a skeleton wooden thumbhole stock and a short magazine; matte black kept |
| 09 | spinner (`hellraiser_spinner`) | The general-purpose belt-fed machine gun: a full-power belt from a box on the side, a quick-change barrel with a carry handle, a skeleton or plain stock, a bipod; fired from the hip as 09 says. The oxide-red band kept |
| 09 | siege tube (`legion_siege_tube`) | The shoulder rocket launcher with the warhead out of the front: a tube with a large pointed bulbous warhead in the muzzle, two wooden heat guards round the middle, a pistol grip and a trigger, a cone flare at the rear, an optic on the left |
| 09 | drum launcher (`smetanita_drum_launcher`) | The revolving six-shot 40 mm launcher: the six-chamber cylinder, a short barrel, a telescoping metal stock, a front grip and a reflex sight frame; lacquer black and brass kept |

10 forms redrawn (7 in 06, 3 in 09); 0 new items; 0 new pictures.

---

## 6. How a fan hunts (ideas, no rules written)

1. Every gun card shows its maker line's name as a header ("ADCorp modular rifles, line rifle"), so a find tells a fan its
   family and that two more forms exist.
2. A collection view in the codex: each maker line as a row of three forms by five grades, seen ones painted and unseen as
   silhouettes, so the hunt has a visible target.
3. The shop's rolled shelf and the loot tables weight a line's forms so a fan can chase one line (for example a gunsmith
   node that stocks one maker line per stage).

---

## 7. The questions of the draft, as ruled

1. Repaint the 17 before any grade set: **yes** (R1); the old masters go to the archive; the game's numbers do not change.
2. Five new lines, 15 forms, 75 pictures under S1: **yes** (R1, R2). Batch order: G13, G14 and G16 first (four of the top
   dozen), then G15 and G17.
3. The pattern rule overrides "invented, never real" for guns: **yes** (R3), written into `weapon-icons.md` rule 8.
4. The spinner and the siege tube redrawn: **yes** (R1).
5. A sixth line: not now (section 4).

## Final pass, 19 Nov 2026 (what changed in the artist file)

- **Repaints held to R1's 17.** The first final pass added 1.18 `legion_bullpup` and 1.19 `whisper_smg` (19 repaints);
  R1 approves 17, the 17 of the coverage table, where both read as their pattern today (rows 11 and 27). The second
  verification removed the two entries: the gun class keeps 7 paintings and repaints 14; file 08's totals are 760
  pictures for the graded items and 783 gear pictures with the uniques; the README's are 215 to make now and 871 in all.
  The removed prompts are below for a later pass, if Leon ever wants them.
- **Second verification, patterns made single and faithful (R3):** 1.6 `legion_pdw` is laid out feature by feature (the
  stepped tall receiver, the long magazine through the grip, the folding front grip, the two-rod stock; nothing on top, so
  it never reads as the top-fed courier PDW); 1.8 `long_rifle` is the classic bolt-action precision rifle in a one-piece
  synthetic stock (no thumbhole, no brake, hinged floorplate; the unique `first_light` follows it); 1.11
  `adamantile_battle_rifle` is the tilting-breechblock metric battle rifle (top cover to a rear peep sight, folding
  cocking handle on the left toward the front, eared front sight, long slotted flash hider, no carry handle), and 06's
  Adamantile carbine and heavy rifle follow it. In 09: the snub launcher is the cut-down thumper (barrel sawn short, stock
  sawn to a wooden pistol grip, no leaf sight), and the wall gun is one wartime semi-automatic anti-tank rifle (internal
  five-round magazine, barrel carry handle, mid bipod, plain wooden stock).
- **1.12 `hellraiser_lmg`:** now the line's own light machine gun (the service rifle lengthened: long barrel, bipod at the
  muzzle, long curved magazine, club-foot stock), so it stays apart from file 09's belt-fed spinner.
- **1.13 `lumeri_scattergun`:** a plain straight-wrist stock (the pattern's own), and one maker's touch (a gold inlay line)
  instead of a lancet cut and a spire sight, which changed the outline.
- The clause now reads "the small maker's touch (paint, inlay or a small metal fitting inside the outline)", so a line with
  two small marks (Adamantile's crest and trim line) does not contradict it. Intake sentences removed.

### The two removed repaint prompts (not in the pack; R1 approves 17)

- `legion_bullpup` (would replace `art/icons/gear/weapon-legion_bullpup.png`): the bullpup assault rifle with the long carry
  handle running over the whole body; the action and the short straight magazine behind the pistol grip; the cocking handle
  under the carry handle at the front; a long trigger guard; a ribbed polymer fore-end with two thin bipod legs folded flat
  along it; a short barrel with a ringed flash hider; a flat butt with a rubber pad. Olive-grey polymer and bare steel; one
  pale stripe round the butt.
- `whisper_smg` (would replace `art/icons/gear/weapon-whisper_smg.png`): the integrally suppressed roller-delayed
  submachine gun: a stamped receiver with a cocking tube over the barrel; a fat smooth suppressor forming the whole front;
  a curved magazine ahead of the trigger group; a drum-style rear sight; a retractable two-strut stock. Matte black; one
  small steel-blue (`#5394AC`) plate on the stock struts.
