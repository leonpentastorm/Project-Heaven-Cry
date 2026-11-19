# GPT prompts, 19 Nov 2026, file 10: rifle analogues, so a gun fan can go hunting (PROPOSED)

For Leon first, then for the artist and GPT. **Everything in this file is PROPOSED**: every line, form, name, id, maker,
second skill, signature and count. Nothing here goes into `data/` until Leon rules it and the spec is changed first.

**Leon's ruling (19 Nov 2026):** "make sure most modern rifles have an analogue in ours, so fans of those guns can go
hunting." **And his direction on the art, the same day:** "I don't really need the word AK to be in game, but I want to
randomly stumble on a gun with the art of an AK pattern rifle and go OH SHIT THAT'S THE AK47, gimme some money I need to
buy this."

**What that means for this file (the rule every prompt below follows):**

1. **The picture keeps the pattern.** The silhouette and the defining features of the real pattern are kept faithfully: the
   overall layout and proportions, the magazine's shape and curve, the gas system and the sight layout, the stock and the
   furniture style, the receiver's character. A fan must know it at a glance, at 64 px in the shop grid.
2. **What stays ours:** the **name** (in-world), the **maker** (an in-world maker line), the **markings** (no real logo,
   rollmark, text, number or serial in any image), and **one small maker's signature touch** that does not disturb the read
   (a coloured band, a tag, a pin, a grip panel, a crest on the stock heel).
3. **No real brand, model or maker name anywhere:** not in game text, not in file names or ids, **not in the prompts**. A
   prompt describes the pattern by its features, precisely enough that the generator draws that pattern. The coverage table
   (section 1) is an internal design note and names each pattern in generic pattern words only, so the reader knows what is
   meant.
4. **A loose cousin is not coverage.** An archetype counts as covered only if its picture reads as the pattern. Where an
   existing painting or a proposed prompt reads "partly" or "no", this file lists the fix: a faithful repaint of the same id
   (same numbers, new picture), a note to the writer of file 06 or 09 to redraw a proposal, or a new form.

Sources read: `data/weapons.json` (every gun), `art/catalog.json` (what is painted), `art/briefs/ART-REQUESTS-2026-11-19.md`
section 4.3 (the 12 maker lines), `06-gun-forms.md` (the gun design sheet and its 15 prompts),
`09-heavy-and-strange.md` (the heavy families H1 to H10), `docs/lore/Factions.md` and `docs/lore/Sector-Earth.md` (makers),
`art/briefs/GPT-PROMPTS-2026-11-13-gear.md` (the gear painting format), `art/style-guide/weapon-icons.md` (maker
signatures). The "reads as the pattern" column was judged by looking at the 256 px exports of the existing paintings and
by reading the prompts of 06 and 09.

---

## 1. The coverage table (internal design note: generic pattern words only, never a brand)

Ranked by how many fans hunt the pattern (the lead's judgement); the top dozen first. "Reads?" = does today's painting, or the
proposed prompt, read as the pattern at a glance: **yes / partly / no**. Actions: **REPAINT** = same id and numbers, a new
faithful master (section 3.2); **NOTE 06 / NOTE 09** = the proposed form stays, its prompt is redrawn to the pattern
(section 3.3); **NEW** = a new form (section 2, prompts in 3.1).

### The top dozen

| # | Archetype (generic pattern words) | What fans love (one line) | Our counterpart | Reads? | Action |
| --- | --- | --- | --- | --- | --- |
| 1 | The stamped long-stroke rifle with the curved magazine, wood or plum furniture, gas tube over the barrel | It never jams, it is everywhere, it is the rifle of every war film | `hellraiser_service_rifle` | partly (curved magazine and gas tube, but a strut stock, slab receiver and bayonet) | REPAINT |
| 2 | The modular light rifle: straight-line stock, carry-handle heritage, flat-top rail, A-frame front sight | The endlessly customised black rifle; build your own | MISSING | - | NEW: *ADCorp line rifle* (G13, base) |
| 3 | The polymer striker service pistol: blocky slide, square trigger guard, no hammer | Simple, reliable, the pistol in every holster | `service_pistol` | partly (a slab pistol, not the blocky polymer read) | REPAINT |
| 4 | The steel single-action .45: slim slide, grip safety, spur hammer, wood grips | A century of service and still the purist's pistol | `magistrate_pistol` | partly (close: wood-panel grips, squared slide; too stubby, flared muzzle) | REPAINT |
| 5 | The roller-delayed submachine gun: slim receiver tube, curved magazine, drum rear sight, cocking tube | The counter-terror team's gun; the smoothest SMG ever made | MISSING (`whisper_smg` is a suppressed SMG in general) | - | NEW: *Chezknov machine carbine* (G14) |
| 6 | The big-bore gas-operated semi-auto hand cannon: long slab slide, triangular-faced barrel | The most absurd pistol on screen | MISSING | - | NEW: *Smetanita hand cannon* (G16) |
| 7 | The bolt-action sniper rifle: thumbhole chassis stock, fluted heavy barrel, big scope, bipod | One shot from a mile away | `long_rifle` | partly (bolt, scope, bipod; a wooden thumbhole stock and a pencil barrel) | REPAINT |
| 8 | The pump combat shotgun: tube under the barrel, ribbed pump, bead or ghost-ring sight | The shotgun in every police car | `lumeri_scattergun` | partly (tube and pump; ivory-and-arch styling dominates) | REPAINT |
| 9 | The .50 semi-auto anti-materiel rifle: huge arrowhead double-chamber brake, long upper, carry handle, bipod | The biggest rifle a person can fire | `blackpoint_700` | partly (a round cannon muzzle, too short and stubby) | REPAINT |
| 10 | The open-top steel double-action service pistol: slide cut away over the barrel, exposed hammer | The action-film pistol | MISSING | - | NEW: *Smetanita service pistol* (G16, base) |
| 11 | The bullpup with the long carry handle over the whole body | The bugle: a rifle that is all handle | `legion_bullpup` | yes | none |
| 12 | The top-fed bullpup PDW: flat translucent magazine lying along the top, thumbhole grip | The futuristic gun every game has | MISSING | - | NEW: *Arsenal courier PDW* (G15) |

### The rest

| # | Archetype (generic pattern words) | What fans love (one line) | Our counterpart | Reads? | Action |
| --- | --- | --- | --- | --- | --- |
| 13 | The roller-delayed battle rifle: slim fluted receiver, straight box magazine, drum rear sight, slim fore-end | Full power, built like a tractor | MISSING | - | NEW: *Chezknov battle rifle* (G14, base) |
| 14 | The metric battle rifle: carry handle, tall front sight, straight 20-round box, folding cocking handle | The right arm of half the world's armies | `adamantile_battle_rifle` | no (plated fantasy rifle) | REPAINT |
| 15 | The short-stroke piston modular rifle: monolithic upper rail, side-folding telescoping stock, angular lower | The modern special-forces rifle | MISSING | - | NEW: *Arsenal piston rifle* (G15, base) |
| 16 | The squad automatic weapon: belt box hung under the receiver, carry handle, bipod, ribbed fore-end | A rifleman's machine gun | `hellraiser_lmg` | partly (belt box, bipod and handle are there; trench spikes and slab) | REPAINT (light touch) |
| 17 | The general-purpose machine gun: full-power belt, quick-change barrel with a handle, skeleton or plain stock, bipod | The pig: the gun that holds the hill | MISSING (09's *spinner* is a rotary, not this) | - | NOTE 09: redraw *hellraiser_spinner* as this pattern |
| 18 | The six-barrel rotary gun | It is a minigun | `hellraiser_rotary` | yes | none |
| 19 | The long semi-auto marksman rifle with the skeleton wooden thumbhole stock and the offset scope | The marksman's rifle of the other side | `ccec_marksman_rifle` | no (a futuristic ivory rifle) | REPAINT |
| 20 | The folding-stock short assault carbine: stubby barrel, big muzzle booster, side-folding stock | The stubby one from the helicopter | *trench carbine* (06) | partly (curved magazine but a long bayonet and strut stock) | NOTE 06 |
| 21 | The short-barrel modular carbine for close quarters | The breacher's version of number 2 | MISSING | - | NEW: *ADCorp short carbine* (G13) |
| 22 | The modular big-frame designated marksman rifle: number 2 grown into full power, free-float rail, scope | The precise semi-auto | MISSING | - | NEW: *ADCorp designated rifle* (G13) |
| 23 | The compact PDW with the magazine in the grip, folding front grip, sliding stock | Tiny, modern, special-ops | `legion_pdw` | partly (a blocky box with the magazine in the grip) | REPAINT |
| 24 | The telescoping-bolt boxy SMG: magazine through the grip, folding metal stock, grip safety | The boxy little SMG of every desert film | `decrkm_smg` | no (a wire-stock stamped SMG with the magazine ahead of the grip) | REPAINT |
| 25 | The burst machine pistol with the fold-down front grip and the long magazine | The three-round-burst pistol of the cyberpunk films | `decrkm_autopistol` | partly (a long magazine on a classic slide; no front grip) | REPAINT |
| 26 | The classic drum submachine gun: finned barrel, vertical front grip, wood stock, round drum | The gangster gun | `mandestra_drum_gun` | partly (the drum is right; no finned barrel, a bell muzzle) | REPAINT |
| 27 | The integrally suppressed SMG | Silent | `whisper_smg` | yes | none |
| 28 | The big double-action magnum revolver: long barrel with full underlug, adjustable rear sight | The cop's hand cannon | `frontier_hand_cannon` | partly (short ported barrel, slab frame) | REPAINT |
| 29 | The single-action army revolver | The cowboy gun | `drifter_revolver` | yes | none |
| 30 | The snub-nosed revolver | The detective's pocket gun | *snub revolver* (06) | yes (prompt) | none |
| 31 | The lever-action rifle | The frontier | `lever_carbine` | yes | none |
| 32 | The side-by-side double and its sawn-off | Two barrels, no argument | `coach_gun`, `sawn_off`, *fowling gun* (06) | yes | none |
| 33 | The semi-auto tube-fed combat shotgun: gas-operated, ghost-ring sights, pistol-grip collapsible stock | The marines' semi-auto | *long scatter* (06) | no (06 draws a pump) | NOTE 06 |
| 34 | The box-fed shotgun on the stamped long-stroke rifle's body | Number 1, but a shotgun | `brigade_auto_shotgun` | no (plated fantasy shotgun) | REPAINT |
| 35 | The full-auto drum shotgun: straight-line boxy body, round drum under it, carry-handle top | The auto shotgun that does not kick | *drum shotgun* (06) | partly (the drum, but plates and a ram plate) | NOTE 06 |
| 36 | The wood-stocked full-power battle rifle: long wooden stock to the muzzle, short box magazine, op-rod on the side | The old service rifle that keeps coming back | MISSING | - | NEW: *Albert Town service rifle* (G17, base) |
| 37 | The scoped walnut bolt-action hunting rifle | The deer rifle in every cabin | MISSING (`long_rifle` is the sniper) | - | NEW: *Albert Town stalking rifle* (G17) |
| 38 | The semi-auto wood carbine with the folding blade bayonet and the fixed magazine | The cheap surplus carbine everyone owned once | MISSING | - | NEW: *Albert Town brush carbine* (G17) |
| 39 | The small slim double-action pocket pistol of the spy films | The secret agent's pistol | MISSING (`parlour_pistol` is a derringer) | - | NEW: *Smetanita pocket pistol* (G16) |
| 40 | The two-shot over-and-under derringer | The card table | `parlour_pistol` | yes | none |
| 41 | The single-shot break-action 40 mm launcher with a wood stock and a leaf sight | The thumper | `smetanita_thumper` | partly (fat and lacquered, the classic proportions lost) | REPAINT |
| 42 | The revolving six-shot 40 mm launcher | Six grenades, no reload | *drum launcher* (09) | partly (cylinder yes; padded lacquer stock, no telescoping stock and front grip) | NOTE 09 |
| 43 | The under-barrel 40 mm launcher | The grenade under the rifle | `mod_underslung` (painted mod) | partly (reads as a 40 mm module) | none now (a mod; revisit with the mods) |
| 44 | The shoulder-fired rocket launcher with the warhead sticking out of the front | The one in every war-zone photo | MISSING (09's *siege tube* is a cousin) | - | NOTE 09: redraw *legion_siege_tube* as this pattern |
| 45 | The telescoping disposable rocket tube | Fire and drop | *throwaway tube* (09) | yes (prompt) | none |
| 46 | The reusable recoilless rifle: fat tube, venturi at the back, front grip and shoulder pad | The bazooka's grown-up heir | `breacher_tube` | partly (a plain tube) | REPAINT |

**Counts (46 archetypes).**

| How it is covered | Archetypes |
| --- | --- |
| By an existing gun that reads as the pattern today (11, 18, 27, 29, 31, 32, 40) | **7** |
| By an existing gun after a faithful repaint (1, 3, 4, 7, 8, 9, 14, 16, 19, 23, 24, 25, 26, 28, 34, 41, 46) | **17** (17 repaints) |
| By a form already proposed in 06 or 09: as written (30, 45) | **2** |
| By a form already proposed in 06 or 09: after its prompt is redrawn to the pattern (17, 20, 33, 35, 42, 44) | **6** |
| By a mod (43) | **1** |
| By the additions in this file (2, 5, 6, 10, 12, 13, 15, 21, 22, 36, 37, 38, 39) | **13** (15 new forms) |
| Left out | **0** of these 46; five more patterns left out are listed in section 2.4 |

---

## 2. The additions

### 2.1 Why new lines, not new forms on old lines

Every one of the 12 gun lines and the 10 heavy families already has three forms; a fourth form would break the shape Leon
ruled. So the archetypes nothing covers go into **five new maker lines of three forms each**, and each line is a real
pattern family (the real makers built these three together, so the forms belong together and the line reads as one
maker). Each line follows the ruling: a **base form that scales on Dexterity only**, two variants that take a **second skill
where it applies** (Dexterity always rolls the shot; the second skill feeds the signature, never the hit), and one
**signature** card line. Second skills never repeat Dexterity. Every signature is a sketch: the build reads it through the
primitives in `docs/ENGINE-HOOKS.md`, and anything missing goes on the lead's "Needs a new primitive" list, never into code.

Makers are from the lore where one fits: **ADCorp** is the Rigaz Trade Company's arms division, which "arms and supplies
both Central City and the Thousand-Planet City" (`Factions.md`; RTC's signature in `weapon-icons.md` is "sleek lines and a
tag"); **Chezknov** and **Albert Town** are places named in the EPCCG with no lore yet (`Sector-Earth.md`), so a works
there is free to invent; the **Smetanita Conjunction** already makes the thumper (H1); the **Central Command Arsenal** is
new (Central City's state arsenal; Central City's signature is "clean civilian lines").

### 2.2 The five new lines (PROPOSED)

| Line | Maker (accent) | Forms: close / standard / long | Base, Dexterity only | Signature (one card line) | Variant: second skill, what it feeds | Variant: second skill, what it feeds |
| --- | --- | --- | --- | --- | --- | --- |
| G13 ADCorp modular rifles | ADCorp, RTC's arms division (a small blank tag in muted vermilion; the hex is Leon's to set) | *ADCorp short carbine* / *ADCorp line rifle* / *ADCorp designated rifle* | *ADCorp line rifle* | **Modular:** the Forge fits and swaps its mods for less | *short carbine*: **Reaction Speed**, feeds the first shot after a move | *designated rifle*: **Acuity** (`analysis`), feeds the Aimed bonus on a foe you have Analyzed |
| G14 Chezknov roller guns | Chezknov Works (no colour accent: bare dark steel and black polymer; the touch is a single brass rivet on the receiver) | *Chezknov machine carbine* / *Chezknov battle rifle* / *Chezknov precision rifle* | *Chezknov battle rifle* | **Roller-locked:** steady on the burst (less Recoil on Bursts) | *machine carbine*: **Composure**, feeds the Recoil relief while you have not moved this turn | *precision rifle*: **Vigilance** (`vigilant`), feeds the overwatch shot |
| G15 Central Command Arsenal | Central Command Arsenal (Central City blue-grey `#5394AC` as one thin trim line) | *Arsenal courier PDW* / *Arsenal piston rifle* / *Arsenal heavy rifle* | *Arsenal piston rifle* | **Drill-clean:** a reload costs 1 AP less | *courier PDW*: **Athletics**, feeds firing on the move in armour | *heavy rifle*: **Brain Power**, feeds the range bands an Aimed Shot ignores |
| G16 Smetanita sidearms | Smetanita Conjunction (lacquer black and brass: one brass grip medallion, blank) | *Smetanita pocket pistol* / *Smetanita service pistol* / *Smetanita hand cannon* | *Smetanita service pistol* | **A threat in the hand:** a hit adds Pressure | *pocket pistol*: **Insinuation** (`implication`), feeds the first shot drawn from concealment | *hand cannon*: **Raw Power**, feeds the Recoil it forgives and a 1-tile Knockback |
| G17 Albert Town rifle works | Albert Town Rifle Works (frontier: walnut and blued steel; the touch is one brass buttplate screw) | *Albert Town brush carbine* / *Albert Town service rifle* / *Albert Town stalking rifle* | *Albert Town service rifle* | **Walnut and patience:** an Aimed Shot after a turn without moving is +1 to hit | *brush carbine*: **Guts**, feeds the folding bayonet's charge | *stalking rifle*: **Senses** (`sensory`), feeds the critical on an Aimed Shot at a foe that has not seen you |

Calibres (all existing in `rules.json`, no new calibre): G13 and G15's rifles and the G14 battle and precision rifles, all
of G17: `rifle`; the G14 machine carbine, the G15 courier PDW, the G16 pocket and service pistols: `.32 decrkm`; the G16 hand
cannon: `.50 frontier`. Numbers (damage, range, magazine) are not set here; they are fitted with the balance tools when
Leon rules the lines.

**Second skills used (10):** Reaction Speed, Acuity, Composure, Vigilance, Athletics, Brain Power, Insinuation, Raw Power,
Guts, Senses. Brain Power and Insinuation are new to guns (06 uses neither).

### 2.3 The honest count (scheme S1: every graded item painted at five grades)

| What | Items | Base paintings | Grade pictures | Total pictures |
| --- | --- | --- | --- | --- |
| New forms (5 lines x 3) | 15 | **15** | **60** (Fine, Masterwork, Relic, Celestial, 4 each) | **75** |
| Faithful repaints of existing bases (same ids) | 17 | 17 repaints (replace the master; 0 new items) | 0 new (their grade sets are already counted in the 572; they must be made **from the repaint**) | 17 |
| Redrawn proposals (06: 7, 09: 3) | 10 | 0 new (already counted in 06 and 09) | 0 new | 0 |
| Line icons (Claude's) | 15 new + up to 17 redrawn to match the repaints | - | - | - |

**Effect on the plan:** graded items 129 + 15 = **144**; new pictures under S1 572 + 75 = **647**, plus **17 repaints**
(the 23 uniques are separate, as before).

### 2.4 Left out, and why

1. **The heavy machine gun on a tripod** (the big .50 belt gun): emplaced, not carried; it belongs to the map as a mounted
   gun (an object), not to the shop. Recommend it as a map object when the maps grow.
2. **The asymmetric-recoil SMG** (tall angular frame, the bolt drops down): its whole silhouette is its mechanism, so it
   needs its own line; next candidate if Leon wants a sixth line.
3. **The bullpup with the integral optic and the curved green body** (the other famous bullpup): the Legion bullpup is the
   carry-handle bullpup; the second one is the next candidate after number 2.
4. **The dual-tube bullpup pump shotgun**: niche; the shotgun lines are already six forms deep.
5. **The boxy polymer SMG with the folding stock** (the modern successor of number 5): it reads close to number 5 at 64 px;
   number 5 is the hunted one.

---

## 3. The prompts

**How to use.** One image a prompt. Paste **the base prompt of `06-gun-forms.md`** ("Base prompt: gear painting
(Heavenprint object icon)"), then this file's **pattern clause** (below), then the entry's prompt. Attach what the base
prompt names, plus the reference named in each entry (the scale and style reference, a painting in the repo). Save under
the file name given; do not rename. Every delivery is a review candidate until Leon approves it; Claude adds the catalog
entries (map `gear`) and the line icons on intake. **Hold before painting:** nothing here is painted until Leon rules the
lines (questions 1 and 2).

**Pattern clause (paste after the base prompt, for every entry in this file; it overrides the base prompt's "never a
recognisable real-world make, model or emblem" for the silhouette only):**

> This weapon follows a well-known real firearm pattern faithfully: keep its overall layout and proportions, its magazine's
> shape and curve, its gas system and sight layout, its stock and furniture style and its receiver's character exactly as
> that pattern has them, so that a gun enthusiast recognises the pattern instantly at 64 px. Do not invent a new silhouette.
> What must NOT appear: any real logo, rollmark, maker mark, text, letter, number or serial; no engraved words. The only
> departure from the pattern is the one small maker's touch named at the end of the description; it must not change the
> silhouette.

**Avoid in every entry:** text, letters, numbers or marks; a hand or figure; muzzle flash, smoke or sparks; a glow; a second
object; a coloured rarity border; fantasy plates, spikes or crests that change the outline.

### 3.1 The 15 new forms

#### G13 ADCorp modular rifles

**1. `adcorp_line_rifle`: ADCorp line rifle (G13, standard, the base; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-adcorp_line_rifle.png`
- **Attach (scale and style):** `art/icons/gear/weapon-hellraiser_service_rifle.png` (the rifle scale), `art/icons/gear/weapon-legion_bullpup.png`

```
A modular light assault rifle in the classic straight-line layout. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: the stock, the buffer tube and the barrel all on one straight line; a two-part receiver (a flat-top upper with a full-length top rail, a separate lower with a flared magazine well); a slightly curved 30-round box magazine; a tall triangular A-frame front sight post over the gas block; a small flip-up rear sight on the rail; a forward assist bump and a round ejection-port cover on the right of the upper; a sliding six-position stock on a round tube; a round ribbed handguard; a birdcage flash hider; a separate pistol grip. Materials: black anodised metal and black polymer, rubbed grey at the edges and the magazine lips. Maker's touch: one small blank tag in muted vermilion clipped to the sling loop at the stock.
At 32 px: the straight line from stock to muzzle, the triangle front sight and the curved magazine.
```

**2. `adcorp_short_carbine`: ADCorp short carbine (G13, close; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-adcorp_short_carbine.png`
- **Attach:** `art/icons/gear/weapon-legion_pdw.png` (the short-gun scale), the ADCorp line rifle once approved

```
The same modular rifle cut down for close quarters. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 70% of the canvas width like the submachine guns. Silhouette, kept exactly: the straight-line layout, the flat-top upper with a full-length rail and the flared magazine well of the modular rifle, but a very short barrel that ends just past a short free-float rail handguard with slots along its sides; a short angled foregrip; a compact sliding stock collapsed all the way in; a short curved 30-round box magazine; a short flash hider; a small red-dot optic on the rail and no front sight post. Materials: black anodised metal and black polymer, edges worn grey. Maker's touch: the same small blank muted-vermilion tag on the sling loop.
At 32 px: the line rifle's body with almost no barrel, a collapsed stock and a dot sight.
```

**3. `adcorp_designated_rifle`: ADCorp designated rifle (G13, long; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-adcorp_designated_rifle.png`
- **Attach:** `art/icons/gear/weapon-ccec_marksman_rifle.png` (the long-gun scale)

```
The modular rifle grown into a full-power semi-automatic marksman rifle. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: the straight-line two-part receiver of the modular rifle but larger and deeper; a long heavy free-floating barrel inside a long slim free-float rail handguard; a straight 20-round box magazine (not curved); a long scope in two rings on the top rail; a fixed adjustable precision stock with a raised cheek piece; a folded bipod under the handguard; a short muzzle brake. Materials: black and dark earth-brown polymer and anodised metal, scuffed. Maker's touch: the small blank muted-vermilion tag on the stock's sling loop.
At 32 px: the straight-line modular body, long and scoped, with a straight magazine.
```

#### G14 Chezknov roller guns

**4. `chezknov_battle_rifle`: Chezknov battle rifle (G14, standard, the base; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-chezknov_battle_rifle.png`
- **Attach:** `art/icons/gear/weapon-adamantile_battle_rifle.png` (the battle-rifle scale)

```
A roller-delayed full-power battle rifle. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: a long slim stamped-steel receiver with a cocking tube running forward above the barrel, the cocking handle folded at the front-left of the tube; a hooded front sight post at the end of the tube and a round rotary drum rear sight at the back of the receiver; a straight 20-round box magazine; a slim, slightly flared ribbed fore-end; a separate pistol grip; a fixed long polymer stock with a flat butt; a slotted flash hider. Materials: black-painted stamped steel worn to grey on the edges, black or very dark green polymer furniture. Maker's touch: one brass rivet on the side of the receiver above the grip.
At 32 px: the long slim receiver with a tube on top, a drum sight at the back and a straight magazine.
```

**5. `chezknov_machine_carbine`: Chezknov machine carbine (G14, close; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-chezknov_machine_carbine.png`
- **Attach:** `art/icons/gear/weapon-whisper_smg.png` (the SMG scale)

```
A roller-delayed submachine gun, the slim classic of every counter-terror team. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 70% of the canvas width like the submachine guns. Silhouette, kept exactly: a slim round stamped receiver tube with the cocking tube above the short barrel and the cocking handle at its front-left; a hooded front sight ring and a round rotary drum rear sight; a strongly curved 30-round pistol-calibre magazine set just ahead of the trigger group; a slim ribbed fore-end that tapers to the muzzle with three small lugs; a retracted sliding metal stock of two bars with a rubber butt pad. Materials: black stamped steel worn to grey, black polymer grip and fore-end. Maker's touch: one brass rivet on the receiver above the grip.
At 32 px: a slim tube with a curved magazine, a drum sight and a bar stock.
```

**6. `chezknov_precision_rifle`: Chezknov precision rifle (G14, long; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-chezknov_precision_rifle.png`
- **Attach:** `art/icons/gear/weapon-long_rifle.png` (the sniper scale)

```
The roller-delayed rifle made into a heavy semi-automatic precision rifle. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: the same long slim stamped receiver and cocking tube as the battle rifle, but a heavy thick barrel and a deep squared fore-end; a big long scope low on a claw mount; a large adjustable precision stock with a tall cheek piece and an adjustable butt plate; a vertical palm-shelf pistol grip; a straight box magazine; a small folding tripod-stand foot under the fore-end. Materials: black stamped steel and black polymer, matte. Maker's touch: one brass rivet on the receiver.
At 32 px: the battle rifle's body, thick and scoped, with a big squared adjustable stock.
```

#### G15 Central Command Arsenal

**7. `arsenal_piston_rifle`: Arsenal piston rifle (G15, standard, the base; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-arsenal_piston_rifle.png`
- **Attach:** `art/icons/gear/weapon-hellraiser_service_rifle.png` (the rifle scale)

```
A modern short-stroke piston modular assault rifle. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: a long one-piece aluminium upper receiver with a continuous top rail from the back to the muzzle and short rails on the sides; a reciprocating charging handle on the left of the upper; an angular polymer lower with a flared magazine well; a slightly curved box magazine; a side-folding telescoping polymer stock with a stepped angular cheek riser; a short ribbed rail handguard section under the barrel; a prong flash hider; folded flip-up iron sights. Materials: two-tone: sand-coloured polymer lower and stock, darker sand anodised upper, black barrel and magazine. Maker's touch: one thin blue-grey trim line (#5394AC) along the lower edge of the stock.
At 32 px: the long flat upper with a rail all the way, a sand two-tone body and an angular folding stock.
```

**8. `arsenal_courier_pdw`: Arsenal courier PDW (G15, close; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-arsenal_courier_pdw.png`
- **Attach:** `art/icons/gear/weapon-legion_pdw.png` (the short-gun scale)

```
A compact top-fed bullpup personal defence weapon. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 70% of the canvas width like the submachine guns. Silhouette, kept exactly: one smooth sculpted polymer body with rounded edges; a long flat translucent smoke-grey magazine lying horizontally along the whole top of the gun, with the stacked small cartridges visible through it, turned sideways; a thumbhole-style grip with a large trigger-guard opening and a second hole in front for the support hand; a short barrel with a small flash hider; a small reflex sight above the front of the magazine. Materials: dark green-black polymer, the magazine smoke-grey and translucent. Maker's touch: one thin blue-grey trim line (#5394AC) along the butt.
At 32 px: a rounded body with a flat bar lying on top of it and a hole for the hand.
```

**9. `arsenal_heavy_rifle`: Arsenal heavy rifle (G15, long; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-arsenal_heavy_rifle.png`
- **Attach:** `art/icons/gear/weapon-ccec_marksman_rifle.png` (the long-gun scale)

```
The piston rifle in full-power precision form. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: the same long one-piece upper with a continuous top rail and the angular lower as the piston rifle, larger; a long heavy barrel; a straight 20-round box magazine; a fixed precision stock with an adjustable cheek piece and an adjustable butt plate in the same angular stepped style; a long scope; a folded bipod; a muzzle brake. Materials: sand-coloured polymer and anodised metal, black barrel and magazine. Maker's touch: the thin blue-grey trim line (#5394AC) along the stock.
At 32 px: the piston rifle, longer and scoped, with a straight magazine and a fixed stock.
```

#### G16 Smetanita sidearms

**10. `smetanita_service_pistol`: Smetanita service pistol (G16, standard, the base; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-smetanita_service_pistol.png`
- **Attach:** `art/icons/gear/weapon-service_pistol.png` (the pistol scale), `art/icons/gear/weapon-smetanita_thumper.png` (the maker)

```
A full-size open-top double-action service pistol. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols. Silhouette, kept exactly: a slide cut away over most of the barrel so the barrel shows on top; a rounded slide front and a rounded trigger guard with a squared front hook; an exposed round hammer; a slide-mounted safety lever at the rear of the slide; a long grip at a gentle angle with a flush magazine; the frame's dust cover running forward under the barrel. Materials: matte black steel, black grip panels. Maker's touch: one small round brass medallion, blank, set in the grip panel.
At 32 px: a pistol whose barrel shows through the cut-away top of the slide.
```

**11. `smetanita_pocket_pistol`: Smetanita pocket pistol (G16, close; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-smetanita_pocket_pistol.png`
- **Attach:** `art/icons/gear/weapon-parlour_pistol.png` (the pocket-gun scale)

```
A small slim double-action pocket pistol of the spy films. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols (do not draw it smaller: it is told apart by shape). Silhouette, kept exactly: a slim, smoothly rounded slide that wraps around a fixed barrel, with fine vertical grip serrations at the back; a small round hammer spur; a slide-mounted safety lever; a short rounded grip with a finger rest under the magazine; a small rounded trigger guard; very small fixed sights. Materials: polished blued steel, black grip panels. Maker's touch: one small round brass medallion, blank, in the grip.
At 32 px: small, slim and rounded, with a short grip and a finger rest.
```

**12. `smetanita_hand_cannon`: Smetanita hand cannon (G16, long; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-smetanita_hand_cannon.png`
- **Attach:** `art/icons/gear/weapon-frontier_hand_cannon.png` (the heavy-pistol scale)

```
The big-bore gas-operated semi-automatic hand cannon. Pose: side profile turned slightly toward the viewer, muzzle right, level, filling about 80% of the canvas width like the other pistols. Silhouette, kept exactly: a very long, tall, flat slab-sided slide and barrel unit whose front face is a big triangle around the muzzle; a long flat top rib along the barrel; a slide that stops well short of the muzzle; a large squared trigger guard; a wide, long grip with a hammer at the back; a heavy squared look throughout. Materials: polished lacquer-black steel with soft highlights. Maker's touch: one small round brass medallion, blank, in the grip.
At 32 px: a huge flat slab of a pistol with a triangular muzzle.
```

#### G17 Albert Town rifle works

**13. `albert_town_service_rifle`: Albert Town service rifle (G17, standard, the base; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-albert_town_service_rifle.png`
- **Attach:** `art/icons/gear/weapon-lever_carbine.png` (the walnut and blued-steel look), `art/icons/gear/weapon-hellraiser_service_rifle.png` (the rifle scale)

```
A wood-stocked full-power battle rifle. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: a long one-piece wooden stock running from the butt nearly to the muzzle, with a short ventilated metal handguard on top of the barrel at the front; a steel receiver with the operating rod and its handle exposed along the right side; a short straight 20-round box magazine hanging below the receiver; a hooded aperture rear sight on the receiver and a winged front sight blade on a slotted flash suppressor; a straight wrist (no separate pistol grip). Materials: oiled walnut with dark grain, parkerised grey-black steel. Maker's touch: one brass screw in the buttplate.
At 32 px: a long all-wood rifle with a short box magazine and a slotted muzzle.
```

**14. `albert_town_brush_carbine`: Albert Town brush carbine (G17, close; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-albert_town_brush_carbine.png`
- **Attach:** `art/icons/gear/weapon-lever_carbine.png`

```
A semi-automatic wood carbine with a folding blade bayonet. Pose: diagonal, about 16 degrees, muzzle up and right, filling about 70% of the canvas width like the short guns. Silhouette, kept exactly: a one-piece wooden stock with a straight wrist; a fixed box magazine that is a shallow bulge just in front of the trigger guard (no detachable magazine hanging down); a gas tube over the barrel ending at a hooded front sight; a folding blade bayonet hinged under the muzzle, folded back along the stock; a tangent rear sight; a bolt handle on the right side of the receiver. Materials: reddish shellacked wood, blued steel worn to grey. Maker's touch: one brass screw in the buttplate.
At 32 px: a short wood carbine with a blade folded under its barrel and no hanging magazine.
```

**15. `albert_town_stalking_rifle`: Albert Town stalking rifle (G17, long; PROPOSED id)**

- **Save as:** `art/icons/gear/weapon-albert_town_stalking_rifle.png`
- **Attach:** `art/icons/gear/weapon-long_rifle.png` (the sniper scale, to be told apart from)

```
A scoped walnut bolt-action hunting rifle. Pose: rifle diagonal, about 16 degrees, muzzle up and right, filling about 85% of the canvas width. Silhouette, kept exactly: a classic sporting stock in figured walnut with a straight comb, a raised cheek piece, a pistol-grip cap and a slim fore-end; a round turned-down bolt handle with a ball knob on the right; a medium sporter-weight barrel with no brake and no sights; a medium hunting scope in two low rings; a hinged floorplate with no magazine hanging below; a leather sling with two swivels. Materials: warm figured walnut, polished blued steel, oiled leather. Maker's touch: one brass screw in the buttplate.
At 32 px: an elegant wooden rifle with a scope and a ball-knob bolt, no magazine and no bipod.
```

### 3.2 The 17 faithful repaints (same ids, same numbers; new masters)

Each is a full repaint of an existing gear painting, image to image is not advised (the outline must change). Paste the
06 base prompt, the pattern clause, then the line. **Attach:** the existing painting of the id (the material, the wear and
the maker's accent to keep), and a neighbour named for scale. Save over `art/icons/gear/weapon-<id>.png` only after Leon
approves (the old one goes to `art/_archive/`). Grade sets must be made from the repaint, so these come before any grade
work.

| Id | The pattern, by its features (kept exactly) | Maker's touch (kept from today) |
| --- | --- | --- |
| `hellraiser_service_rifle` | Stamped steel receiver with a ribbed dust cover; a long gas tube above the barrel with a wooden upper handguard; a strongly curved 30-round magazine; a slanted muzzle brake; a tangent rear sight in front of the dust cover; a large right-side safety lever; a wooden lower handguard, pistol grip and a fixed wooden stock with a drop | The oxide-red band (`#CC2435`) round the handguard; no bayonet in this picture |
| `service_pistol` | A blocky squared slide with fine rear serrations and a squared nose; a polymer frame with a squared trigger guard; a trigger with a blade in its face; no hammer; a slightly angled grip with finger grooves | One faded blue-grey grip panel |
| `magistrate_pistol` | A slim full-length steel slide with rear serrations; a spur hammer; a grip safety at the back of the grip; a thumb safety; a straight grip with wooden panels; a short barrel bushing at the muzzle (no flare) | The ivory grip panels and the blank brass seal plate |
| `decrkm_autopistol` | A full-size steel pistol with an open-top slide; a fold-down front grip hinged in front of the trigger guard; an extended trigger guard; a long 20-round magazine well below the grip; a short compensator with three ports | The small brass pin through the slide |
| `decrkm_smg` | A short boxy stamped receiver; the magazine through the pistol grip; a grip safety at the back of the grip; a folding metal stock folded under the receiver; a short barrel with a knurled barrel nut; a ribbed top cover with a cocking knob on top | None, as today; one brass pin |
| `legion_pdw` | A compact angular polymer body; the magazine in the pistol grip, long; a folding vertical front grip under the barrel; a short sliding stock of two rods with a small butt plate; a short top rail with folding sights | Olive-grey, anonymous, no accent |
| `mandestra_drum_gun` | A finned (ribbed) barrel with a compensator slotted on top; a vertical wooden front grip; a wooden pistol grip; a fixed wooden stock; a round drum magazine under the receiver in front of the trigger; a cocking knob on top | The lacquered red-black finish on the metal and the brass drum plates |
| `long_rifle` | A bolt-action precision rifle in an aluminium-and-polymer chassis with a thumbhole stock and an adjustable cheek piece; a heavy fluted barrel with a muzzle brake; a large tactical scope; a bipod folded under the fore-end; a short detachable box magazine | Neutral matte, as today |
| `blackpoint_700` | A very long semi-automatic rifle with a two-part flat receiver; a long heavy barrel with a large arrowhead-shaped double-chamber muzzle brake; a top rail with a big scope; a carry handle; a folding bipod at the front; a box magazine; a big recoil pad | Grim, no accent, scorched brake |
| `ccec_marksman_rifle` | A long slim semi-automatic marksman rifle built on the stamped long-stroke action; a long thin barrel with a slotted flash hider; a skeleton thumbhole stock with an open frame and a cheek rest; a scope offset on a side rail; a 10-round curved box magazine; slotted handguards | The ivory polymer furniture and the blue-grey stripe (`#5394AC`) |
| `adamantile_battle_rifle` | A full-power battle rifle with a carry handle folded over the receiver; a tall front sight on the barrel; a straight 20-round box magazine; a folding cocking handle on the left; a slim ventilated handguard; a long flash hider; a fixed stock | One gilt crest at the stock's heel and the brass-orange (`#F68A38`) trim line; no plates |
| `hellraiser_lmg` | A light machine gun with a belt box hung under the receiver; a carry handle over the barrel; a ribbed fore-end; a folding bipod; a sliding stock; a feed cover on top | The oxide-red band on the fore-end; no trench spikes |
| `lumeri_scattergun` | A pump-action combat shotgun: a long tube magazine under the barrel; a ribbed pump fore-end; a receiver with a side ejection port; a bead or ghost-ring sight; a fixed stock with a pistol-grip wrist | Ivory-painted wood, one lancet arch cut in the pump, the brass spire front sight (small) |
| `brigade_auto_shotgun` | A box-fed shotgun on the stamped long-stroke rifle's body: the ribbed dust cover, the big right-side safety lever, a fat straight box magazine, a short gas tube, a folding stock | The gilt crest on the stock and the brass-orange trim; no plates |
| `smetanita_thumper` | A single-shot break-action 40 mm launcher: a fat short barrel; a folding leaf sight on top of the barrel; a wooden fore-end and a wooden shoulder stock with a rubber pad; a break-action hinge and a top lever | Lacquered black on the metal, brass on the hinge and the blank tag |
| `breacher_tube` | A reusable recoilless rifle: a fat tube with a flared venturi at the rear; a front grip and a pistol grip with the trigger; a shoulder rest; a side optic on a bracket | Olive-drab, the pale stripe near the muzzle |
| `frontier_hand_cannon` | A big double-action revolver: a long barrel with a full-length underlug and a vented top rib; a large fluted six-chamber cylinder; an adjustable rear sight; a rubber-wrapped grip | Aged brass cylinder bands |

### 3.3 Notes to the writers of 06 and 09 (redraw the proposal to the pattern; no new item)

| File | Form | Redraw as (by features) |
| --- | --- | --- |
| 06 | *trench carbine* (`hellraiser_trench_carbine`) | The folding-stock short carbine of the stamped long-stroke family: a very short barrel with a large cone-shaped muzzle booster, a hinged top cover with a small rear sight, a short curved magazine, a side-folding skeleton stock; no bayonet. Oxide-red band kept |
| 06 | *Adamantile carbine* | The para version of the metric battle rifle (the repainted `adamantile_battle_rifle`): a short barrel, a side-folding skeleton metal stock, the carry handle; the crest at the stock heel |
| 06 | *Adamantile heavy rifle* | The heavy-barrel squad version of the same rifle: a heavy barrel, a folding bipod at the front, a long flash hider, a wooden-look stock; the crest |
| 06 | *long scatter* (`lumeri_long_scatter`) | The semi-auto tube-fed combat shotgun: a gas-operated receiver, a ghost-ring rear sight and a post front sight, a collapsible stock with a pistol grip, a long tube magazine; the ivory paint and one lancet cut kept |
| 06 | *drum shotgun* (`brigade_drum_shotgun`) | The full-auto drum shotgun: a straight-line boxy body, a carry handle on top, a large round drum under the receiver, a short barrel with a big flash hider; the crest kept, no ram plate |
| 06 | *DECRKM carbine* | The long-barrel semi-auto carbine of the boxy telescoping-bolt SMG (to match the repainted `decrkm_smg`): the same boxy body with the magazine through the grip, a long thin barrel, a fixed wooden stock |
| 06 | *whisper carbine* | The integrally suppressed carbine with the fat smooth suppressor as the whole fore-end and a skeleton wooden thumbhole stock and a short magazine; matte black kept |
| 09 | *spinner* (`hellraiser_spinner`) | The general-purpose belt-fed machine gun: a full-power belt from a box on the side, a quick-change barrel with a carry handle, a skeleton or plain stock, a bipod; fired from the hip as 09 says. The oxide-red band kept |
| 09 | *siege tube* (`legion_siege_tube`) | The shoulder rocket launcher with the warhead sticking out of the front: a tube with a large pointed bulbous warhead in the muzzle, two wooden heat guards around the middle, a pistol grip and a trigger, a cone flare at the rear, an optic on the left |
| 09 | *drum launcher* (`smetanita_drum_launcher`) | The revolving six-shot 40 mm launcher: the six-chamber cylinder, a short barrel, a telescoping metal stock, a front grip and a reflex sight frame; lacquer black and brass kept |

**Counts for 3.3:** 10 proposals redrawn (7 in 06, 3 in 09), 0 new items, 0 new pictures.

---

## 4. How a fan hunts (ideas for Leon, no rules written)

1. **Idea:** every gun card shows its maker line's name as a header ("ADCorp modular rifles, line rifle"), so the shop and
   the loot card tell a fan which family a find belongs to and that two more forms exist.
2. **Idea:** a collection view in the codex: each maker line as a row of three forms by five grades, seen ones painted and
   unseen ones as silhouettes, so the hunt has a visible target (the Relic and Celestial of a fan's pattern).
3. **Idea:** the shop's rolled shelf and the loot tables weight a line's forms so a fan can chase one line (for example a
   gunsmith node that stocks one maker line per stage), and the card's line header is what they read at a glance.

---

## 5. Questions for Leon (each with the recommended answer)

1. **Faithful patterns for existing guns: repaint the 17, including the approved re-paint of the starting
   pistol (`service_pistol`, section 4.6 of the art list) and the starting rifle?** Recommended: yes, all 17, before any grade set is made; the old masters go
   to the archive. The game's numbers do not change (a 24-round rifle stays 24 even though the pattern carries 30).
2. **Five new maker lines (G13 ADCorp, G14 Chezknov, G15 Central Command Arsenal, G16 Smetanita sidearms, G17 Albert Town),
   15 forms, 75 pictures under S1?** Recommended: yes; G13, G14 and G16 first (they hold four of the top dozen), G15 and G17
   in the next batch.
3. **Does the pattern clause override "never a recognisable real-world model" in the gear rule for these guns only?**
   Recommended: yes for the silhouette, and write it into `art/style-guide/weapon-icons.md` rule 8 as: the outline may follow
   a real pattern; names, marks and text never.
4. **The two heavy redraws in 09: the spinner becomes the general-purpose belt-fed gun, the siege tube becomes the
   warhead-out-front rocket launcher?** Recommended: yes; both keep 09's mechanics, and both patterns are in the top 20 a fan
   hunts.
5. **A sixth line later for what is left out (the asymmetric-recoil SMG, the integral-optic bullpup, the dual-tube
   shotgun)?** Recommended: not now; revisit after 0.34 when the first fans have played with the five.
