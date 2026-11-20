# Project Heaven Cry v0.32.0 — Brain Power (`INT` → `Sigilist`) Review & Experience (Part 1 Draft)

> **Status:** Part 1 Draft (through Stage 1, Stop 2 Round 1, Level 2). Part 2 continuation on room `PXEKXF` is underway to test **Level 3 `Sigilist`**, **Stop 8 (`The Gate`)**, **enemy directly on the Sigil Line (`Evoke along`)**, **Flux Overload / `Overflux`**, and **`MEND` combos**.

- **Version Tested:** `v0.32.0` (compared against `v0.31.10` baseline in `05_brain_power_report.md`)
- **Room / Seed:** `PXEKXF` (Survival) · Seed `PHC-EBEDKF` · Stage 1: `AHOC chapter outpost`
- **Test Character:** **Vesper** · Origin `09 The scholar halls` · Archetype `Savant` · Belief `Atheist Pilgrim`
- **Preliminary Rating (Part 1):** **★★★★☆** — Massive progression and safety fixes (`Level up first?` Fork unlock, `Rumination` Flux cap sync, self-tile Evoke guard, `SEEK·SHOCK` 93-dmg payoff), held back by a still-broken `Sigil Savant` trait, blank Character Sheet tabs, and an unresponsive Stop 1 reward picker.

---

## 1. Build & Progression: v0.31.10 vs v0.32.0

| Field | v0.31.10 (`GDA85F` · Vespera Quill) | v0.32.0 Part 1 (`PXEKXF` · Vesper) |
|---|---|---|
| **Attributes** | `INT 7`, `EXP 3→4`, `PER 3`, others `1` | `INT 7`, `EXP 3→4`, `PER 3`, others `1` |
| **Skills** | `Brain Power 7`, `Rumination 3`, `Pain Threshold 1` (Lv 2) | `Brain Power 7`, `Rumination 3→4` (Lv 2) |
| **Traits** | `Sigil Savant` (disabled in Survival) | `Sigil Savant` (`Muscle Memory` + `Rigid`) & `Live to Fight Another Day` |
| **Forks** | **Sealed / No UI** (Ranks 5 & 7 locked out) | **Rank 4 Unlocked** via `"Level up first?"`: chose **`Overflux`** (`+25%` Sigil dmg at Flux limit) over **`Clean Vent`** (`6` scorch + `1` tile push on adjacent foes once/turn on Vent). Rank 8 (`Written in Advance` / `Running Script`) gated behind Lv 1–2 attribute cap of 7. |
| **Perks** | `Running Hand I & II`, `Second Clause I`, `Footnote I` | `Running Hand II` (first glyph/turn `-0.5 AP`, `0 Flux`), `Second Clause I` (`+6%` vs Burning/Slowed/Corroded/Pinned/Blinded/Shaken/Silenced), `Proven Formula I` (`Rumination 3`: `+3` saves vs what already hit you) |
| **Camp Kit & Boon** | Drifter revolver, Evoker `10/10` + 5 cores, Class 1 armour; Boon `Quick Chalk` | Drifter revolver, Evoker `10/10` + 5 spare Standard cores, Class 1 armour, `Essence of Experience` (`+100 XP`); Boon `Steady Line` (`+1` to hit with Sigils) |
| **Words Known** | `SPARK`, `SEEK`, `SHOCK`, `SPREAD` (`4`) | `SPARK`, `SEEK`, `SHOCK`, `SPREAD`, `MEND` (`5/11`, `Study 20→22`) |
| **Progress** | Level 2, Stop 1 Round 2 (`45/112 HP`) | Level 2 (`135/250 XP`), cleared Stop 1 in 4 rds (`22/100 HP`), saved Stop 2 Round 1 |

### Key Progression Takeaway
The single biggest onboarding upgrade in v0.32.0 is the **`"Level up first?"` prompt** when entering Survival. In v0.31.10, starting with `Brain Power 7` and `Rumination 3` left 4 unspent Perk Steps invisible unless the player spotted a Camp sidebar button, and Forks were marked `sealed` with no UI. In v0.32.0, Rank 4 Forks and starting Perks surface naturally before Stop 1, immediately letting a Savant choose between burst payoff (**`Overflux`**) and close-quarters safety (**`Clean Vent`**). Note that Fork ranks shifted from `5 / 7` (v0.31.10) to **`4 / 8`** (v0.32.0), intentionally gating the Rank 8 Fork (`Written in Advance` / `Running Script`) until Level 3 unlocks `INT 8+`.

---

## 2. Combat Mechanics & TTRPG/CRPG Player Experience

### Word Combos, AP Economy & Tactical Rhythm
- **Smooth `Expression` & `Running Hand` Scaling:** At `Expression 3` (Level 1), base glyph drawing costs `0.8 AP`, discounted by `Running Hand II` to **`0.3 AP` and `0 Flux`** for the first glyph each turn. Raising `Expression 3 → 4` at Level 2 dropped base glyph cost to **`0.7 AP`** and the first glyph to **`0.2 AP`**.
- **The 4.1 AP Turn Loop:** A complete Draw → Step → Draw → Evoke combo fits comfortably inside a standard 6 AP turn (~`4.1 AP`), leaving breathing room to reposition, shoot a sidearm, or `Vent Flux`.
- **High-Payoff Spellcrafting (`SEEK · SHOCK`):** Combining `SEEK` (long-range straight bolt, range 11) with `SHOCK` (high-damage bolt ignoring half cover) produced **`93 damage`** per `1 AP / 1 charge` Evoke in Stop 1—hitting the Trooper cleanly from `O1` across `N2–O2` to `O9` in Round 3 and again along `O2–O3` in Round 4 for the kill.
- **Line Integrity Rules:** Attempting to `Evoke` a single-glyph tile (`B8` `MEND` alone in Stop 2) properly fails with *"One glyph alone is no spell"*, reinforcing the core Sigilist identity of laying geometric multi-word sentences on the battlefield.

### Evoke Along / Across & Self-Target Safety
- **v0.31.10 Regression Verified (Self-Tile & Down-Range):** In v0.31.10, standing on an end glyph (`E9`) and clicking it while `Evoke` was armed immediately enabled `Confirm` and blasted Vespera for 64 self-damage. In v0.32.0:
  - Standing on end glyph `L1` of `L1–L2` now cleanly refuses self-targeting with `"Not on yourself: it would only hit you."`
  - Firing **across** `N2–O2` from `O1` (`93 dmg`) and **along** `O2–O3` from `O2` (`93 dmg`) both resolved cleanly with zero self-damage.
  - **Open Verification Target (Part 2):** Neither test in Part 1 had an enemy standing *directly on* the far/middle glyph of the Line (e.g., Trooper on `O3` while Vesper stands on `O2`), which was the exact trigger of the v0.31.10 `"Out of the area: pick a tinted tile, or yourself"` lock. Part 2 will explicitly test that edge case.

### Flux, Cores & Ambient Mana Interaction
- **Flux Cap Sync Fixed:** v0.31.10's glaring contradiction (`Rumination 3` claiming a limit of `7` while the meter and `Vent Flux` capped at `0/6`) is **FIXED**. In v0.32.0, `Rumination 3` sets the meter to **`0/7`**, and leveling `Rumination 3 → 4` raises it accurately to **`0/8`**.
- **`Vent Flux` & Mana Forecast:** Spending `1 AP` on `Vent Flux` in Free Roam cleared Flux (`4/7 → 0/7`) and visibly fed the environment, raising ambient Mana Forecast from `20/40` to **`24/40 RICH AIR`**.
- **Core Swapping:** `Evoke` properly blocks at `0/10` Evoker charge, and `Swap core` (`2 AP`) reloads to `10/10` from the 5 spare Standard cores.

### Balance & Solo Survivability Feel
- **Glass-Cannon Tension:** While `93` damage on `SEEK·SHOCK` feels awesome when it lands, solo Stage 1 survivability is razor-thin (`100 HP` at Lv 1, `109 HP` at Lv 2). In Stop 1, Vesper ate a `20`-dmg contact hit plus a `23`-dmg CRIT (`Left Arm` injury `-2` attacks, `Staggered -2 AP`, `Stopping Shot` knockback) and finished at **`22/100 HP`**.
- **No Starting Stims & Steep `MEND` Cost:** The Recommended Savant kit starts with **0 Stims**, and learning `MEND` after Stop 1 reveals a steep setup cost (`3` charge + requires a 2-glyph Line to Evoke). How well `MEND` sustains a solo Sigilist in longer fights will be evaluated in Part 2.

---

## 3. v0.31.10 → v0.32.0 Regression Tracker

| v0.31.10 Issue | v0.32.0 Status (Part 1) | Details Observed |
|---|---|---|
| **1. Evoke self-target footgun (`along` / standing on end glyph)** | **PARTIALLY FIXED (Full Repro Pending Part 2)** | Clicking your own end glyph (`L1`) now blocks self-target (`"Not on yourself: it would only hit you."`), and `across`/`along` shots at down-range foes hit cleanly (`93 dmg`). Still need to verify when an enemy stands directly *on* a Line tile. |
| **2. Rumination Flux cap contradiction (`7` vs `0/6`)** | **FIXED** | `Rumination 3` = `0/7`; `Rumination 4` = `0/8`. Text and HUD meter match. |
| **3. Quick Chalk AP preview mismatch** | **PERSISTS (on `Running Hand II`)** | `ACTION POINTS` preview meter still ignores first-glyph AP discount (`Running Hand II`), previewing `-0.8 AP` when actual spend is `0.3 AP`. |
| **4. `Sigil Savant` trait disabled in Survival** | **STILL BROKEN (Different Form)** | Instead of a disabled message, `Sigil Savant` (`Muscle Memory` + `Rigid`) appears active on paper, **but has no `Muscle Memory` word picker**, grants **no `0 Core charge` / `-1 AP` discount**, and `Rigid` does **not** block drawing newly learned words (`SHOCK`, `SPREAD`, `MEND`) mid-run without resting. |
| **5. Brain Power Forks sealed / no UI** | **FIXED** | Rank 4 Fork (`Overflux` / `Clean Vent`) unlocks via `"Level up first?"` prompt. Rank 8 Fork (`Written in Advance` / `Running Script`) is gated at Level 3 (`INT 8+`). |
| **6. Word button `aria-label`s & panel clipping** | **PARTIALLY REGRESSED / PERSISTS** | Sticky `.phc-cb-tabs` still occludes scrolled buttons; `Attack 9`/`Move 4` report generic `"9 actions"`/`"4 actions"` `aria-label`s. |
| **7. Camp `◈` button overlapping `Learn a word`** | **NOT REPORTED / RECHECK** | Camp `MAGIC` tab cleanly learned `SHOCK` and `SPREAD` (`Study 20/22`) and `MEND` (`Study 22`). |

---

## 4. v0.32.0 Bugs & UI Issues Found in Part 1

1. **[High] `Sigil Savant` trait is non-functional in Survival:** No `Muscle Memory` word selector exists anywhere in Camp or Combat; no word receives `0 Core charge` or `-1 AP`; and the `Rigid` downside fails to restrict drawing newly learned words (`SHOCK`, `SPREAD`, `MEND`) before resting.
2. **[High] Character Sheet `PERKS`, `STATUS`, and `GEAR` tabs render blank:** Both in Camp and on the Path Map, switching to `PERKS`, `STATUS`, or `GEAR` displays an empty pane (only `SKILLS`, `ARMS`, and `MAGIC` render).
3. **[High] Stop 1 Rewards `Pick one: Materials [Take]` button is unresponsive & offscreen:** Bounding box reported off-viewport (`y=1658..2649`), preventing reward collection after clearing Stop 1.
4. **[Medium] `ACTION POINTS` preview ignores `Running Hand II` discount:** Previews `-0.8 AP` for the first glyph of the turn even though only `0.3 AP` (at `EXP 3`) is actually spent.
5. **[Medium] Stale weapon target readout leaks across tabs:** Switching from `Attack -> Shot` to `Sigils -> Draw` leaves the prior weapon target readout in `Chosen action`.
6. **[Medium] Sigil Line / Word Cap contradiction & unenforced ground limit:** `MAGIC` lists `Line length 5`, `Overclock` states `Max Sigil words is already 4`, and the ground counter counts down `4 left` → `0 left`—yet placing a **5th glyph on the ground (`O2`) still succeeded**.
7. **[Low] 0-Charge `Evoke` previews negative charge:** Attempting to preview `Evoke` at `0/10` charge shows `Charge 0 → -1` before blocking execution.
8. **[Low] Layout & Accessibility polish:** Sticky `.phc-cb-tabs` occludes scrolled buttons; narrow splitter collapses; `Attack 9` / `Move 4` buttons use generic `"9 actions"` / `"4 actions"` `aria-label`s.

---

## 5. Queued for Part 2 Continuation (`PXEKXF`)

- **Level 3 `Sigilist` & Rank 8 Fork:** Reach Level 3, unlock `Written in Advance` / `Running Script` (Rank 8), and review `Sigilist` class abilities.
- **Enemy-on-Line `Evoke along` Repro:** Place a hostile directly on a middle/end glyph of a Line while standing on the Line and test `Evoke` targeting + `Confirm`.
- **Flux Overload & `Overflux`:** Push Flux to `8/8` to verify the `+25%` `Overflux` damage bonus and test what happens on Overload (`>8/8`).
- **`MEND` & `SPREAD` Combos:** Test healing sustain and 5×5 AoE multi-word combos through Stop 8 (`The Gate`).
