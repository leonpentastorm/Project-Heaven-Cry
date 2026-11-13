# Forge for Project Heaven Cry: train on the project's own art, generate new pieces (13 Nov 2026)

For the Claude Code session on Leon's home PC (RX 9070 XT, 16 GB) that drives Gun Forge (`D:\LocalAI\Forge.bat <command>`).
**`D:\LocalAI\forge\CLAUDE.md` is the tool's own manual and wins over anything here** (this was written without seeing
it). Where a command, flag or folder below disagrees with it, follow it. Leon's wish tonight: put the project's art into
LoRAs and try making new pieces on his own GPU. Read first: `art/style-guide/PHC-Style-Guide.md`,
`art/style-guide/gear-icons.md`, `art/icons/STYLE-LOCK.md`, `art/README.md`. Repo: `Project-Heaven-Cry`.

## 0. Verify first (this brief could not)

1. `Forge.bat doctor` must be healthy. Never `--force` past it.
2. Ask the tool (its CLAUDE.md, `--help`): can it train and export at **1024**? Does it have a resolution flag? (These are
   1024 masters, not 16 to 128 px icons.) How does it flatten **alpha** (see 2)? Does `--pixel-art` exist: **never use it
   here**, none of this is pixel art. How does it behave on an AMD card, and how long does a run take at about 150 and
   at about 190 images? Report the answers to Leon before the long runs.
3. One GPU job at a time.

## 1. Not one LoRA: one per art mode

The modes must not blend. Counts are from `art/catalog.json` and the prompt files on 13 Nov 2026.

| Mode | Forge project / trigger | Images | In training | Order |
| --- | --- | --- | --- | --- |
| (a) **Gear**: Heavenprint painted objects, one object, three-quarter, transparent | `phcgear` / `phcgear` | **149** (60 weapons, 21 armour, 3 shields, 4 focuses, 13 mods, 7 tools, 6 consumables, 4 ammo, 3 food, 2 lights, 2 documents, 12 rounds, 8 mags, augment, loot x2, companion) | 144 (5 held out) | **1st** |
| (b) **Wick**: the mascot acting out traits, perks, Calls; white flat ink | `phcwick` / `phcwick` | **189** (74 traits, 106 perks, 9 Calls) | 184 (5 held out) | **2nd** |
| (b2) **Glyphs**: white flat ink, no figure (prayers, feelings, modules) | `phcglyph` / `phcglyph` | **105** (39 + 25 + 41) | 105 | optional, after b |
| (c) **Character portraits**: Heavenprint paintings, 800 x 1000 | `phcportrait` / `phcportrait` | **145** (46 archetype cards, 54 world NPC, 27 EPCCG cast, 18 M813) | 145 | **only if Leon asks** |
| (d) **Skill portraits**: faceless gesture figures, black + cream + one pigment | none | **27** | too few for a LoRA alone | skip; maybe fold into (c) later |
| (e) **Monoline weapon icons** (`art/icons/weapons/*.svg`, 60) | none | placeholders | not worth training | skip |

- **Tonight: gear first** (cleanest, most uniform set, the roguelike's shop is the clearest need), **Wick second** (the
  biggest win: today only the artist can draw Wick in a new pose).
- Gear: the 149 masters are the artist's 13 Nov delivery and are **not in the repo yet** (no `art/icons/gear/`, no `gear` map in
  the catalog). Ask Leon for the folder they were delivered to (files `<kind>-<id>.png`, e.g. `weapon-service_pistol.png`).
- **Portraits are people.** A portrait LoRA is for new NPC faces only; Leon decides whether he wants it. Nothing
  recognisable (Unspoken Name). Glyph mode: 38 prayer icons have no caption text and need eyes.
- Why Wick and glyphs are separate: Wick is a figure doing something with a prop; feelings and modules are abstract
  marks. One LoRA would drift between them.
- **Exclude always:** anything under `art/_archive/`, `art/illustrations/**/spoilers/`, catalog entries with status
  `rejected`/`superseded`/`retired` (none today: 411 `review-candidate`, 1 `approved`), the 2020 sources in
  `source/2020/`, the object sprites (top-down, another mode), maps, the title layers, the AHOC seal, the patron marks.
  The script enforces the archive, spoiler and status rules.

## 2. Preparing the ingest folder (outside the repo, never touching its files)

`tools/art/forge_captions.py` (standard library; run with `python3`) copies the masters out of the repo into a flat
ingest folder as `<id>.png` and writes the `<id>.txt` captions in the same pass:

```
python3 tools/art/forge_captions.py --mode wick --out D:\LocalAI\work\phcwick\in --images-out D:\LocalAI\work\phcwick\in \
    --holdout trait-gun-nut,trait-old-school,trait-one-shot,perk-last-wall,call-spot
python3 tools/art/forge_captions.py --mode gear --gear-src "<folder of the 13 Nov delivery>" \
    --out D:\LocalAI\work\phcgear\in --images-out D:\LocalAI\work\phcgear\in \
    --holdout weapon-service_pistol,weapon-hellraiser_service_rifle,armour-ballistic_helmet,shield-buckler,tool-field_kit
```

Modes: `gear`, `wick`, `glyph`, `portraits`, `skills`. `--trigger` overrides the word. It prints one JSON summary:
`written`, `missing` (ids with no text found; **written nowhere**), `held_out`, `images_copied`. It refuses to write
under the repo's `art/` tree. (Gear without `--gear-src` writes captions only, for all 149 ids.)

- **Where the files must sit for Forge's `captions` step:** the tool's own CLAUDE.md says (the `ingest` copy lives under its
  project folder). Run `ingest <project> "<folder>"` first, then `captions <project>` to list images, then write or copy
  each `<id>.txt` **next to the ingested image of the same id**. If ingest renames files, map by order or hash and say so.
- **Caption coverage without eyes** (from the catalog and prompt files today): gear 149 of 149, Wick 189 of 189, glyph
  67 of 105 (the 38 `missing` are prayers: Whisper, Hymn and Miracle icons), portraits 46 of 145 (the archetype cards; the
  99 `missing` are named people: caption by eye), skills 27 of 27 (thin: one line each). Open and caption the `missing`
  ones by eye; also open a handful of the others and fix any caption that is plainly wrong.
- **Caption rule:** `<trigger>, <what the object is: type, parts, materials, colours, view, background>`. Never style words
  (the script strips "painted", "Heavenprint", "flat ink", "white ink", "style", artist words). In Wick captions the
  mascot is "the robot mascot" (the script replaces "Wick"); if Wick's identity drifts in samples, retrain with the
  word Wick and a short fixed description instead.
- **Alpha:** the masters are RGBA. A white-ink Wick flattened on white vanishes. Unless Forge's CLAUDE.md says it handles
  alpha, flatten before ingest onto ONE flat colour per project: gear `#808080` (grey), Wick and glyph `#10151F`
  (the captions say "plain flat grey / dark blue background"; change `BACKGROUNDS` in the script if you pick another).
  Pad nothing: leave the masters as they are, flatten only the ingest copies.
- Training resolution 1024 if the tool allows; else the nearest it offers, and tell Leon.

## 3. Generating for this project

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

## 4. Bringing a pick into the repo, the project's way

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

## 5. Rules

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

## 6. Not checked when this was written

The tool's real commands and flags; 1024 training and export; whether its background removal gives clean alpha (and
whether it can force white ink); the AMD behaviour; run times at about 150 and 190 images; where its `captions` step wants
the text files. Verify each before relying on any line above, and tell Leon what you changed.
