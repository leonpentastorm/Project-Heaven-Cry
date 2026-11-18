# Brain Power (INT -> Sigilist) & Sigils Playtest Report
Room code: `GDA85F` (Seed `PHC-SM68SN`, Stage 1 `AHOC Chapter Outpost`, Survival).

### Build & Progress
- **Character:** Vespera Quill · Origin `09 The scholar halls` · Belief `Atheist` · Archetype `Savant` (class at level 3: `Sigilist 7`). Reached **Level 2**, tested in **Stop 1 Fight** (`"A firing line · 1 foe · level 2"`), played through **Round 2** (45/112 HP).
- **Attributes:** END 1, STR 1, AGI 1, PER 3, **INT 7**, **EXP 4** (3 → 4 at Level 2), INS 1, DET 1, VIR 1.
- **Skills & Perks:** **Brain Power 7** (+6, Mastery 3, Sigil range +3, Core charge saved 2 a Sigil): took **Running Hand I & II** (first glyph/turn −0.5 AP & 0 Flux) and **Second Clause I** (+6% Sigil damage vs burning/slowed/corroded/pinned/blinded/shaken/silenced foes). **Rumination 3** (+2, Mastery 1): took **Footnote I**. **Pain Threshold 1** (taken at Level 2).
- **Forks status:** Brain Power forks at **5** (`Overflux` or `Clean Vent`) and **7** (`Written in Advance` or `Running Script`) are **marked `sealed`** in the Brain Power EPCCG progression table, and **no Forks UI/drawer is offered** at Level Up.
- **Trait:** `Sigil Savant` (`Muscle Memory` and `Practise` are disabled in Survival).
- **Gear & Boon:** Recommended Camp kit (Drifter revolver, Evoker 10/10 charge + 4 free Standard cores, Class 1 body armour, +1 bought Standard core = 5 spare cores), **Quick Chalk** boon (first glyph each fight −1 AP).
- **Sigil words:** `SPARK` (1 ch, 15 dmg), `SEEK` (2 ch, straight bolt range 8+3=11), `SHOCK` (2 ch, 30 dmg, ignores half cover), `SPREAD` (2 ch, 5×5 AoE at 0.6×).

### How Sigils Work & Feel
- Drawing glyphs tile-by-tile (`0.7 AP`, `0 AP` for the first glyph with Quick Chalk) while moving (`1 AP/tile`) creates a spatial puzzle: you build a straight 2–4 word Line (`E9–F9–G9`), track Evoker core charge (`10/10` → `5/10`) and Flux (`0/6` → `2/6`), and then `Evoke` (`1 AP`) either **along** the Line from an end (`←`/`→`) or **across** it from a side (`↑`/`↓`).

### Bugs & UI Issues (with Repro Steps)
1. **Critical — Evoke self-target footgun & inability to target hostile standing on the Line (`along`):** Stand on end glyph `E9` of `E9–F9–G9` (`SPARK·SPARK·SEEK`) with a hostile on `F9`. Click `Evoke 1 AP`, click `E9`, click `F9`, then click `Confirm`. Clicking `E9` while standing on it immediately enables `Confirm` (`"Fires → (along the Line). Confirm to Evoke."`, targeting yourself). Clicking `F9` shows `"Out of the area: pick a tinted tile, or yourself"`, neither targeting the enemy on the Line nor disabling `Confirm`, so pressing `Confirm` hits Vespera for 64 damage.
2. **Flux cap contradiction in Sigils HUD (`7` vs `0/6`):** With `Rumination 3`, the Sigils panel states `"Rumination 3: your Flux limit is 7 (next point: 8)"`, whereas the `Vent Flux · 0/6` button, Flux meter (`0 / 6`), and tooltip (`"Past 6 the Evoker overloads"`) all report a cap of **6**.
3. **Quick Chalk AP preview mismatch:** Have `Quick Chalk` (`first glyph each fight -1 AP`) and select `Draw a glyph`. Chosen action says `"Draw SPARK · 0 AP · 1 charge"`, but the Action Points meter previews `"5.3 / 6 after this"`.
4. **Sigil Savant trait disabled in Survival:** Both `Muscle Memory` and `Practise` are disabled (`"Sigil Savant works in a story, not in a run."`), leaving the recommended Savant trait non-functional in Survival.
5. **Glyph Keyboard accessibility & scrolling / clipping:** Word buttons omit the word names (`SPARK`/`SHOCK`/`SEEK`/`SPREAD`) from their `aria-label`, and `SEEK`, `SPREAD`, and `Evoke` clip below the panel fold.
6. **Camp bottom-left UI overlap:** The floating `◈` Narrator's memory button overlaps the `Learn a word` button area in the `MAGIC` tab.
