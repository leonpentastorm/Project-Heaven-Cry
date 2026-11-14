# Forge for Project Heaven Cry: train on the project's own art, generate new pieces (13 Nov 2026)

For the Claude Code session on Leon's home PC (RX 9070 XT, 16 GB) that drives Gun Forge (`D:\LocalAI\Forge.bat <command>`).
**`D:\LocalAI\forge\CLAUDE.md` is the tool's own manual and wins over anything here** (this was written without seeing
it). Where a command, flag or folder below disagrees with it, follow it. Leon's wish (13 Nov): put the project's art into
LoRAs, **characters, backgrounds and maps included**, so new art does not wait on the image generator's quota. Tonight's
stack: WSL2 Ubuntu 22.04, ROCm 7.2, AMD's PyTorch, ai-toolkit, **SDXL base**. Read first: `art/style-guide/PHC-Style-Guide.md`,
`art/style-guide/gear-icons.md`, `art/icons/STYLE-LOCK.md`, `art/README.md`. Repo: `Project-Heaven-Cry`.

## 0. Verify first (this brief could not)

1. `Forge.bat doctor` must be healthy. Never `--force` past it. One GPU job at a time.
2. Ask the tool (its CLAUDE.md, `--help`): can it train and export at **1024**, with **aspect-ratio buckets** (section 3)? How does
   it flatten **alpha**? `--pixel-art`: **never use it here**. Run time at about 150 and 190 images on 16 GB? Report to Leon before the long runs.

## 1. Not one LoRA: one per art mode

The modes must not blend. Counts: `art/catalog.json` and the prompt files, 13 Nov 2026. "In training" is after 5 hold-outs.

| Mode | Forge project / trigger | Images | In training | Order |
| --- | --- | --- | --- | --- |
| (b) **Wick**: the mascot acting out traits, perks, Calls; white flat ink | `phcwick` / `phcwick` | **189** (74 traits, 106 perks, 9 Calls) | 184 | **1st** (all in the repo) |
| (a) **Gear**: painted objects, one object, three-quarter, transparent | `phcgear` / `phcgear` | **149** (60 weapons, 21 armour, 3 shields, 4 focuses, 13 mods, 7 tools, 6 consumables, 4 ammo, 3 food, 2 lights, 2 documents, 12 rounds, 8 mags, augment, loot x2, companion) | 144 | **2nd**, when the artist's branch lands |
| (c) **Character portraits**: 800 x 1000, opaque; people and robots, **not gods** | `phcportrait` / `phcportrait` | **145**: 46 archetype cards, 54 world (27 New Faces + 27 Original Heavenprint), 27 EPCCG cast, 18 M813 | 140 | **3rd** |
| (f) **Scenes and maps**: wide paintings, one LoRA, see 1.2 | `phcscene` / `phcscene` | **about 79** (14 Nov): 7 illustrations, 1 title-screen painting, 4 archived maps, and Survival's 18 painted battle maps, 24 backdrops, 6 path backdrops, 8 node scenes, 3 cards, 2 old path maps (all upscaled exports: see 1.2) | about 74, plus crops | **last; the count now supports it** |
| (b2) **Glyphs**: white flat ink, no figure (prayers, feelings, modules) | `phcglyph` / `phcglyph` | **105** (39 + 25 + 41) | 105 | optional, after Wick |
| (d) Skill portraits: faceless gesture figures | none | 27 | too few alone | skip |
| (e) Monoline weapon icons (`art/icons/weapons/*.svg`, 60) | none | placeholders | not worth training | skip |
| (g) The 8 patron portraits (gods) | none | 8 | far too few | **apart from (c)**, not trained |

- **Gear:** the 149 masters are the artist's 13 Nov delivery and are **not in the repo yet** (no `art/icons/gear/`, no `gear` map in
  the catalog). Ask Leon for the folder they were delivered to (files `<kind>-<id>.png`, e.g. `weapon-service_pistol.png`).
- Wick and glyphs are separate: a figure with a prop versus abstract marks; one LoRA would drift between them.
- **Exclude always:** anything under `art/_archive/` (except the maps, 1.2), `art/illustrations/**/spoilers/`, catalog entries
  with status `rejected`/`superseded`/`retired` (none today: 411 `review-candidate`, 1 `approved`), the 2020 sources in
  `source/2020/`, the object sprites (top-down, another mode), the AHOC seal, the patron marks. The script enforces the
  archive, spoiler and status rules.

### 1.1 Character portraits (now wanted)

- **Set:** `art/portraits/` Heavenprint paintings, `characters` map: `archetypes/` **46**, `world/` **54** (`new-faces/` 27 named,
  `original-heavenprint/` 27 unnamed), `epccg/` **27** (the First-Patch Revival cast, 27 named people), `m813/` **18** (MPAT, the
  comrade's head, 7 robots, 8 humans/machines of the one-shot). None are spoilers. Skill portraits and patron paintings are other modes.
- **The eight patrons stay out.** They are divine apparitions (faceless ivory effigies, masks, radiant absence, giant scale); in a
  people LoRA they pull every NPC face toward an effigy. Eight images cannot carry a LoRA; if Leon wants gods, a fresh
  brief for ten or more first. (The script has `--mode patrons` for their captions, one line each, if that day comes.)
- **Use:** NEW faces for NPCs (the Narrator's casting pool), roleplay cards, enemy tokens. **Never a remake of a named cast member** (the EPCCG 27, New Faces, M813): reject a candidate that reads as a
  known one; compare against the nearest training file. Nothing recognisable from real Earth (the Unspoken Name).
- **Format:** 800 x 1000 RGB opaque, face in the upper-middle third (`eye_line`), no text. A generated pick needs an `eye_line`
  in its catalog entry (`validate_eye_lines`): put it by eye, as a fraction of the image.

### 1.2 Scenes, backgrounds and maps (a new mode, and a small one)

Inventory (13 Nov, verified by listing, not by eye):

- `art/illustrations/` **11** catalog entries at 1600 x 900: 6 M813 (`outpost813`, `shield-line`, `rear-pad-loading`, `outpost-hangar`,
  `outpost-1`, `how-many`) and 1 Proving Ground (`drill-yard`) are usable = **7**; the 4 under `m813/spoilers/` (the ramp, the choice,
  the demand, the repair bay) are ending-only and **excluded**.
- `art/ui/title-screen/`: 3 layers at 4096 x 2304 (`title-back.png` opaque; mid and front RGBA over it). **1** usable painting
  (the back; the front is a full 16:9 frame with the squad, not independent of it). Treat as 1 image, not 3.
- `art/_archive/maps/m813/`: **4** distinct paintings (outpost, outpost-1, shield-line, rear-pad), 1600 x 1100 (`v1/` and `retired-2026-11/`;
  `v1/sources` and `revisions/v2/sources` are earlier states of the same four: near-duplicates, not new images). `art/briefs/m813-tutorial/maps/*-layout.png`
  are layout guides, not paintings. Archived because maps are no longer painted (rules 1.16), but they are the project's own
  art and the only map paintings there are. **Recommendation: yes, train on them, as style reference only**, with the
  archive exclusion lifted for this one folder (the script has no mode for them: copy by hand). **Flag for Leon.**
- Object sprites (25, top-down props) are another mode; nothing else in the catalog is scene-like.
- **Survival (14 Nov, catalog `survival_art`; the art branch's 9cbddf49 and 9fbb08e9):** **18 painted top-down battle maps**
  (`art/maps/survival/<setting>-<1..3>.png`, mode `painted-map`, ids `survival-m001` to `survival-m018`, three a setting),
  delivered for this LoRA and as reference (the game does not draw them: rules 1.16 and 1.45, fights are assembled from the
  kits; `npm run assets` does not build them). **Every one is an upscale**: native 1254 x 1254 (Lanczos) exported at 2600 x 2600,
  catalog `upscaled: true` and `native_dimensions`; the native renders are in
  `art/_archive/survival/2026-11-14-battle-maps/native-renders/` (M004 to M018; M001 to M003's under
  `2026-11-13-scenes-and-portraits/map-studies/`). **Train on the native render, not the export** (an upscale teaches
  Lanczos softness), and caption them "top-down battle map". Besides: 24 fight backdrops (`backdrops/`, mode `backdrop`), 6
  path-map backdrops (`map/path-<setting>.png`, `survival-map-<setting>`), 8 node scenes, 3 cards and S1's 2 old path maps:
  **all upscales too** (native 1672 x 941 to 2560 x 1440; the list is
  `art/_archive/survival/2026-11-14-battle-maps/native-resolution-exceptions.json`, 55 entries). The captions step marks
  each with its `upscaled` flag and uses the native file where the archive has one. All are `review-candidate`.

**Honest count (13 Nov): about 12 images, 7 of them from one campaign. Far below the 20 to 40 consistent images a style LoRA on SDXL wants.** (14 Nov: Survival's 61 wide paintings and 18 maps take it to about 79; see the Survival line above.)
Risk: the LoRA memorises these paintings and hands them back (compositions, the black hole, the hangar) instead of a style.
Two ways to grow the set properly, and neither makes it a big set:

1. **Crop or tile** each painting into several training crops at the model's resolution: a 1600 x 900 painting gives about 6 crops
   (3 square 900 x 900 across, plus 3 tighter at 60 to 70 % scale), each scaled to the bucket size and captioned for what it shows;
   the 4096 x 2304 title back gives more. Crops of one painting are **not independent images**: they teach the style and the
   local detail (brush, palette, materials) but not new compositions, and a LoRA trained on 6 crops of 12 paintings is still a
   12-painting LoRA. Cap about 6 crops a painting, keep crops of one painting out of the hold-out.
2. **Hold the LoRA to a low strength** (start at 0.5 to 0.7, never 1.0) and use it as a flavour on the base model, not as the author.

**One mode or two?** One. Four maps cannot carry a LoRA, and the 7 illustrations are not enough alone; together with the crops they
reach a workable pool. Mark maps in the caption ("top-down battle map") so the trigger can still pull one or the other. If
Leon later paints more of either, split them. Train this last, and only if the count after cropping looks usable at the
`samples` step: if every sample is a copy of a training painting, stop and report.

**What they are for in the game:** campaign illustrations (zone banners, moments, card art: `data/campaigns/*.json` `art`), the
title screen's key art, and **painted maps, but only IF Leon brings them back**: today the game draws maps from tiles (rules 1.16),
so a painted map is a **design decision for the lead, not an asset request**. Do not wire a generated map into anything; stage it.

## 2. Preparing the ingest folder (outside the repo, never touching its files)

`tools/art/forge_captions.py` (standard library; run with `python3`) copies the masters out of the repo into a flat
ingest folder as `<id>.png` and writes the `<id>.txt` captions in the same pass:

```
python3 tools/art/forge_captions.py --mode wick --out D:\LocalAI\work\phcwick\in --images-out D:\LocalAI\work\phcwick\in \
    --holdout trait-gun-nut,trait-old-school,trait-one-shot,perk-last-wall,call-spot
python3 tools/art/forge_captions.py --mode gear --gear-src "<folder of the 13 Nov delivery>" \
    --out D:\LocalAI\work\phcgear\in --images-out D:\LocalAI\work\phcgear\in \
    --holdout weapon-service_pistol,weapon-hellraiser_service_rifle,armour-ballistic_helmet,shield-buckler,tool-field_kit
python3 tools/art/forge_captions.py --mode portraits --out D:\LocalAI\work\phcportrait\in --images-out D:\LocalAI\work\phcportrait\in \
    --holdout arch-bulwark,arch-fencer,arch-sharpshooter,m813-penny,m813-keel
```

Modes: `gear`, `wick`, `glyph`, `portraits`, `patrons`, `skills` (scenes and maps have no mode: about 12 images, caption them by eye). `--trigger` overrides the word. It prints one JSON summary:
`written`, `missing` (ids with no text found; **written nowhere**), `held_out`, `images_copied`. It refuses to write
under the repo's `art/` tree. (Gear without `--gear-src` writes captions only, for all 149 ids.)

- **Where the files must sit for Forge's `captions` step:** the tool's own CLAUDE.md says (the `ingest` copy lives under its
  project folder). Run `ingest <project> "<folder>"` first, then `captions <project>` to list images, then write or copy
  each `<id>.txt` **next to the ingested image of the same id**. If ingest renames files, map by order or hash and say so.
- **Caption coverage without eyes** (from the catalog and prompt files today): gear 149 of 149, Wick 189 of 189, glyph
  67 of 105 (the 38 `missing` are prayers: Whisper, Hymn and Miracle icons), portraits **64 of 145** (46 archetype cards from
  `archetype-portraits.md`, 18 M813 from the catalog `brief_row` and `m813-mpat.md`), skills 27 of 27 (thin: one line each).
  **81 portraits still need eyes: the 54 world portraits (27 New Faces, 27 Original Heavenprint) and the 27 EPCCG cast.** The
  search found no appearance text for them anywhere (`EPCCG-Cast-and-Factions.md` and the EPCCG give factions and field quotes,
  `data/patrons.json` and `data/campaigns/*.json` give lore and cast lists, `data/archetypes.json` a blurb: none says what
  a face or outfit looks like; the quotes say who they are, not what is seen, so they are not used). For those 81 the local
  session **captions by looking at each image**, and may batch them through a cheaper vision model (about 81 images, one short
  caption each, reviewed in a contact sheet) instead of spending the main session on them. A caption describes only what is
  SEEN: apparent age, build, hair, clothing, gear, pose, framing, background. **Never the name, the lore, the faction or the
  style.** Open a handful of the written captions too and fix any plainly wrong. Scenes, maps and the 38 prayers are also by eye.
- **Caption rule:** `<trigger>, <what the object is: type, parts, materials, colours, view, background>`. Never style words
  (the script strips "painted", "Heavenprint", "flat ink", "white ink", "style", artist words). In Wick captions the
  mascot is "the robot mascot" (the script replaces "Wick"); if Wick's identity drifts in samples, retrain with the
  word Wick and a short fixed description instead.
- **Alpha:** the masters are RGBA. A white-ink Wick flattened on white vanishes. Unless Forge's CLAUDE.md says it handles
  alpha, flatten before ingest onto ONE flat colour per project: gear `#808080` (grey), Wick and glyph `#10151F`
  (the captions say "plain flat grey / dark blue background"; change `BACKGROUNDS` in the script if you pick another).
  Pad nothing: leave the masters as they are, flatten only the ingest copies.

## 3. What the stack means here (things to verify, not facts about the tool)

- **Native size 1024 x 1024.** That matches the gear and Wick masters. Portraits are 4:5 (800 x 1000) and scenes 16:9: SDXL
  trains and samples on **aspect-ratio buckets** (sizes near the same pixel count, for example about 832 x 1040 for 4:5 and about
  1344 x 768 for 16:9). Check that ai-toolkit, as Forge drives it, has bucketing **on** and is not centre-cropping everything
  square (that cuts heads off the portraits and the sides off the scenes); else tell Leon before the long run. Generate portraits
  at a 4:5 bucket and resize to 800 x 1000; scenes at 16:9 and resize to 1600 x 900.
- **No alpha channel.** Wick, glyph and gear masters are RGBA. Train on copies flattened onto one flat dark colour
  (section 2), and **key the generated picks back afterwards**. The rule `tools/validate_art.py` (`validate_white_rgba`) enforces
  for a Wick, glyph or trait/perk icon: an 8-bit RGBA, non-interlaced PNG; **every pixel with alpha above 0 has RGB exactly
  255, 255, 255** (anti-aliased edge pixels too: one grey or tinted pixel fails the file); at least one pixel with alpha 0 and
  one above 0. So: alpha = brightness above the flat ground (rescaled so the ground is 0 and the ink is 255), then set RGB to
  255 wherever alpha > 0, and drop alpha under about 8 so there is no haze. **This keying is the step most likely to need
  care:** check the corners, the thin strokes and the soft edges by eye on a light ground, and a failed key is a failed pick. Portraits and
  scenes are RGB, opaque, no alpha (colour type 2): nothing to key.
- **Small and uniform sets overfit fast.** The white-ink icons (Wick, glyph) are very uniform; scenes are tiny. Do not take the last
  step: pick the earliest step where the style shows (the `samples` step), and expect it to be early for scenes.
- **One LoRA per mode, never stacked at full strength.** If two are loaded together (for example a scene LoRA with a portrait one),
  each at about 0.5 or lower, and say so in the pick's provenance.

## 4. Generating for this project

Set the framing once per project (`Forge.bat set <project> prompt_suffix="..."`):

- **phcgear:** `phcgear, single object, three-quarter view, centred, lit from the upper left, plain flat grey background,
  no text, no hands, no figures, no cast shadow` (rule: `art/style-guide/gear-icons.md`; one accent colour, bold
  silhouette, readable at 64 and 32 px).
- **phcwick:** `phcwick, the robot mascot (a small figure with a short capelet and a lantern heart), one dominant prop
  about a third of the frame, centred, white lines on a plain flat dark blue background, no text` (rule:
  `art/icons/STYLE-LOCK.md`: Wick is the only full figure, anyone else a partial, no letters or numbers).

**Pick the step** with `samples` (earliest step where the style shows on every prompt; reject fried or copying steps).

**First test, known answer.** The held-out ids have real art: generate the same prompt the artist got and compare, side
by side, the LoRA's best candidate with the real file.
- Gear hold-outs: `weapon-service_pistol`, `weapon-hellraiser_service_rifle`, `armour-ballistic_helmet`,
  `shield-buckler`, `tool-field_kit` (their prompt: the `<id>.txt` in the written set is not kept for hold-outs; take it from
  `art/briefs/GPT-PROMPTS-2026-11-13-gear.md`, batch 1, 14 and 16).
- Wick hold-outs: `trait-gun-nut`, `trait-old-school`, `trait-one-shot`, `perk-last-wall`, `call-spot` (action text:
  `art/briefs/wick-production-icons.md`, by data id; Spot: `GPT-PROMPTS-2026-11-12.md`).
- The same seed and `--n 6` per prompt; report which hold-outs the LoRA gets right (silhouette, ink weight, prop) and which not.

**Then real needs**, read from `art/briefs/ART-REQUESTS.md` (rows marked Wanted, not Done; the artist is making these too, so
mark each pick as an alternative): Classes 3.0 Wick icons C1 to C4 (45; prompts in
`GPT-PROMPTS-2026-11-13-classes-3.0.md`, Job 1) and the two gear icons C5 (Attuner, Toxin vial). **Do not regenerate the
katana or the Emanator katana**: they are Leon's picks.

## 5. Bringing a pick into the repo, the project's way

Never use `pick ... --to` straight into `art/`. Export to a staging folder outside the repo (`D:\LocalAI\work\<project>\out`).
Work on a branch `art/forge-<date>`, pushed for review, **never develop or main**.

1. **Master:** 1024 x 1024 PNG, RGBA, truly transparent (check alpha: sample the corners; the keying must leave no grey or white
   fringe; a background that came back opaque is a failed pick). **Wick and glyph icons must be pure white `#FFFFFF`
   ink with alpha only** (no grey, no colour, no glow): force RGB to 255 where alpha > 0. `validate_art.py` checks ink and alpha.
   Gear: object inside the central 80 to 85 % (about 100 px margin), no baked frame or label.
2. **Name and folder** (`art/README.md`): gear `art/icons/gear/<kind>-<id>.png`; trait `art/icons/traits/<trait>.png`;
   perk `art/icons/perks/<perk>.png`; Call `art/icons/calls/<call>.png`; moves and the new Classes 3.0 folders are as the
   prompts file names them (`art/icons/moves/`, `art/icons/shadow/`, ...). Never overwrite an existing file; a name that
   already exists gets a `--forge` suffix and Leon decides.
3. **Catalog entry** in `art/catalog.json`, copying a recent entry of the same family (the shape of `calls`/`feelings`):
   `{"id", "label", "path", "sha256", "width": 1024, "height": 1024, "background": "transparent", "ink": "#FFFFFF" (Wick/glyph),
   "status": "review-candidate", "production_approved": false, "collection": "forge-<date>",
   "provenance": "generated locally with a LoRA trained on the project's own art, <date>, Forge project <p>, step <N>, batch <b>, candidate <id>"}`.
   Use `review-candidate`, not `candidate`: `validate_art.py` requires that status and `production_approved: false`.
   Gear has no catalog map yet: if `catalog.json` has no `gear` map when you get here, stop at the staging folder and
   hand the picks to the repo session. A pick becomes `approved` only when Leon says so.
4. Run, in order: `python3 tools/rehash_art_checksums.py`, `python3 tools/validate_art.py`, `npm run assets`
   (`tools/build_web_assets.py`: the game's webp). Commit the picks, catalog and checksums together; push the branch.

## 6. Rules

- Train only on the project's own art: the artist's deliveries for this project (the image generator's included) and Leon's
  2020 originals. **Anything Leon commissioned from a human artist goes in only if that artist agreed: ask Leon before
  ingesting such files.** The katana and the Emanator katana were made by the image generator, so they are the project's own
  art and may go into the gear training set once they are in the repo; still **do not regenerate them: they are Leon's picks**.
- The Unspoken Name: reject any candidate that is recognisable from a real-Earth work, brand, make or model. In-universe
  only; no text, letters, logos or maker marks; for medical goods a plain plus mark, never a real red cross.
- A candidate that copies one training image is rejected (compare against the nearest training file).
- One GPU job at a time; never `--force` past a failed `doctor`; never overwrite a repo file without Leon's OK.
- **Report** with the tool's table plus a short "eyeball this" list for Leon: hold-out comparison, anything near-copied, any
  Wick pose that broke an anchor (chamfered head and pixel screen, separate capelet wedge, lantern heart with thick equal cross
  arms, mitten hands), anything unreadable at 64 and 32 px on `#10151F`.

## 7. Order for tonight

1. **Wick** first: every master, prompt and caption is in the repo, no delivery to wait for (the white-ink keying is the risk).
2. **Gear** when the artist's branch lands (not before: no masters in the repo).
3. **Portraits** next: the 64 captioned ones are ready; caption the 81 by eye first (batched), train, then the hold-out test.
4. **Scenes and maps** last, and **only if the count supports it** (section 1.2: about 12 images; stop at the `samples` step if it only copies).

## 8. Not checked when this was written

The tool's real commands and flags; 1024 training and export; **whether ai-toolkit buckets by aspect ratio**; whether its
background removal gives clean alpha (and whether it can force white ink); the AMD and ROCm 7.2 behaviour at 16 GB; run times
at about 150 and 190 images; where its `captions` step wants the text files; the 81 portraits' and the scenes' content (this
session did not look at the images: counts are from the catalog and file listing, not by eye); whether the 4 archived maps are
top-down or oblique; and whether the maps may be used at all (Leon's call, 1.2). Verify each before relying on any line above,
and tell Leon what you changed.
