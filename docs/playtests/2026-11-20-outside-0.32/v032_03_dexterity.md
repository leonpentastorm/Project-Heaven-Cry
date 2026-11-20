# Project Heaven Cry v0.32.0 Review — Gate 3: Dexterity (`AGI` → `Skirmisher`, Pressure System)

> **Source Run**: Live v0.32.0 playtest (`raw_v032_03_dexterity.md`) · EPCCG `1.7163-24C` · Room **`DWFVVP`** · Seed **`PHC-PXTO8J`** (`AHOC chapter outpost`, Solo Survival)
> **Baseline Compared**: v0.31.10 (`heaven_cry_review.md`) · Room `9VJF3F` · Seed `PHC-NTL62M`

---

## 1. Run Snapshot: v0.32.0 vs. v0.31.10

| Metric | v0.31.10 Baseline | v0.32.0 Playtest |
|---|---|---|
| **Character & Build** | **Kaelen Vance** (`03 Hellraiser camps`, *Witch Hunter*: AGI 5 / END 3, Dexterity 4, Vigilance 3, Level 2) | **Kestrel Voss** (`03 Hellraiser camps`, Atheist · Pilgrim; `END 4` [3→4 Lv 2], `STR 3`, `AGI 7`, `Dexterity 7 (+6)`, `Athletics 3` (`Roll With It I`), `Reaction Speed 1`) |
| **Traits, Forks & Boon** | Standard start | Traits: **Gun Nut** (`0 AP` jam clear, `+1` mod slot) + **Live to Fight Another Day** (`0 AP` first Disengage, `+2 Defense` Withdrawing); Lv 4 Fork: **Walk It In**; Perks: **Pressure Point II**, **Keep Their Heads Down I**; Boon: **Quick Magazine** (first reload/fight `0 AP`) |
| **Moves & Loadout** | Lever carbine + Throwing knives | Melee: `Lunge`, `Sidestep`; Ranged: `Suppress`, `Mag Dump`; **Lever carbine** (2H, 8-rd mag + 16 loose, drilled to Mark I **`Walking Fire`**), Flashbang, Stim injector, Padded undershirt, `+20` Rifle rounds |
| **Furthest Reached** | Stage 1, Stop 7–8/15 (Defeated Strongroom Warden Elite, 4/5 fights won) | **Stage 1, Stop 5/15 cleared** (Level 2 `105/250 XP`, HP `96/156`, `410 credits`, `1/3 Echo`, saved cleanly) |

---

## 2. TTRPG / CRPG Player Experience: Crisp, Layered Gunfighter Tactics

With its broken v0.31.10 interactions repaired, **Dexterity / Pressure** in v0.32.0 plays like a razor-sharp tactical *XCOM*-meets-tabletop gunfighter loop:

- **Opener Control & Multi-Roll `Mag Dump`**:
  - In Stop 1 (`A firing line`), Kestrel opened with **`Throw Flashbang (2 AP)`** from `Attack` (9-tile range, applying `Blinded`), then unleashed **`Mag Dump (4 AP)`**—which now rolls properly in bursts (`1 roll per 3 rounds left, max 3 rolls, 4 rounds per roll`). Roll 1 hit for `43 dmg`; Roll 2 missed, triggering the Rank 4 **`Walk It In`** fork to still apply `+1 Pressure` (`Pressed`).
  - Even better, in Stop 2 (`A swarm`, 3× Mite drones), `Mag Dump`'s first roll killed Drone 2 (`48 dmg`) and **automatically aborted Roll 2 early**, saving 4 rounds of ammo and 3 Heat!
- **Heat, Jams & `Gun Nut` Rhythm**:
  - Pushing the Lever carbine to `5/6`–`6/6` Heat (`JAM SOON`) creates genuine risk-reward tension. When a Nat 1 jammed the carbine at `6/6` Heat in Stop 5, **`Gun Nut`** cleared it for `0 AP`, while **`Quick Magazine`** gave a `0 AP` first reload per fight.
  - Meanwhile, a `Suppress (3 AP)` Nat-20 crit pushed a Trooper straight to **`Suppressed (3/4, -1 AP, no reactions)`**—and the Suppressed Trooper even jammed itself in Round 2 of Stop 5.
- **Tactical Mobility & Overwatch**:
  - Drilled Mark I **`Walking Fire (3 AP)`**, **`Overwatch (2 AP)`** (scoring a 48-dmg reaction kill on Drone 1 in Stop 2), and **`0 AP` Disengage** (*Live to Fight Another Day*) keep the gunfighter constantly repositioning rather than standing like a turret.
  - Environmental destructibles also came into play in Stop 5 when an enemy's missed `Suppress` hit explosive barrels for `60` damage (`70/130 HP`), recovered via **self-Stim (`Utility -> Stim 1 AP`, `+26 HP`)** and Stop 4 Rest.

---

## 3. Balance, Pacing & Economy Analysis

### What Shines
1. **Complete Synergy Stack**: `Walk It In` (missed Dex attacks still lay `+1 Pressure` once/turn per foe) + `Pressure Point II` + `Keep Their Heads Down I` + `Gun Nut` + `Quick Magazine` makes Pressure buildup reliable even through misses and Heat spikes.
2. **Smart `Mag Dump` Economy**: Early-abort on lethal first rolls turns `Mag Dump` from an ammo-wasting gamble into an efficient opener/execution burst.

### Pacing & Economy Friction
1. **Level 3 (`Skirmisher`) XP Pacing vs. Stop 8 Gate**:
   - Each Stage 1 fight yielded only **`35 XP`**, leaving Kestrel at **`105 / 250 XP` (Level 2)** after clearing Stop 5 of 15.
   - Because solo gun builds have no spell focus to crack `Essence of Experience` drops, reaching **Level 3 (250 XP) / Skirmisher / Dexterity 8 fork** before the Stop 8 Gate Elite looks tightly gated unless Stops 6–7 provide substantial bonus XP.
2. **Ammo & Uncrafted Components**:
   - After 3 fights (Stops 1, 2, 5), Kestrel ended with just **5 loose Rifle rounds** remaining, while holding **27 Gunpowder + 27 Casings** that cannot be converted without a Forge stop.
3. **Reload Variant Visibility**:
   - Only `Load rounds (2 AP)` appeared on the Lever carbine; no separate tactical vs. speed reload toggle was surfaced during this run.

---

## 4. v0.31.10 Bug Fix Scorecard — 4/4 Major Fixes Verified!

| v0.31.10 Blocker | v0.32.0 Status | Verification Details |
|---|---|---|
| **1. Throwables (`Flashbang`) missing from `Attack`** | **FIXED** | `Throw Flashbang (1) 2 AP` now appears in `Attack` (9-tile range) and properly applies `Blinded`. |
| **2. `Mag Dump` only rolling a single d20** | **FIXED** | Now executes multi-roll bursts (`1 roll per 3 rounds left, max 3 rolls, 4 rounds/roll`), verified with 2 rolls on an 8-rd mag plus early abort on kill saving ammo & Heat. |
| **3. 2H weapon equip lockout (no Unequip/Stow)** | **FIXED** | Verified `GEAR -> Stow Lever carbine` (to `Gloves or bare fists` / `Empty`) and re-equip from Backpack, plus in-combat `Put away 2 AP` / `Drop 0 AP`. |
| **4. Solo HP sustain / Self-Stim blocked** | **FIXED** | `Utility -> Stim` self-tile heals (`+26 HP`, `1 AP`) cleanly in combat. |

---

## 5. Remaining & Newly Observed v0.32.0 Bugs & UI Issues

1. **Minimized `Rewards waiting: choose yours` Banner Off-Viewport & Click Misfire (High)**: Renders off-screen (`y ≈ 1354`) and fails to reopen on click; `Take` / `Take it` outer card hit-target misfires unless clicking the label directly.
2. **Stale `Chosen action` & Duplicated Validation Text (Medium)**: `Chosen action` stays locked on the just-fired technique and duplicates warnings (`Needs 4 AP. Needs 4 AP.`).
3. **Accessibility & Tab Label Issues (Medium)**: Combat pad buttons (`Aimed Shot`, `Suppress`, `Mag Dump`, `Overwatch`) have empty accessible names (`name=""`); `Move 4` tab reads `"4 actions"`.
4. **Map Hover Tooltip Status Lag (Low/Medium)**: Enemy map hover tooltip lags behind Initiative/tile state (shows `Analyze to see its HP` / `HURT` when already `Blinded` / `BADLY HURT`).
5. **Camp Step 2 `BUDGET` & Armour Preview Quirks (Low)**: Paid weapons display `FREE` next to their price; `Padded undershirt` previews character total (`0 -> 1`) rather than the item's own bonus.
6. **Responsive Split-Pane & `1280×900` HUD Overlaps (Medium)**: Shrinking the window (`x ≈ 289`) collapses the Turn panel until dragged back; at `1280×900`, `CALLS 1` wraps, `YOUR TURN` overlaps HP/badges, `ECHO 1/3` overlaps `?`, `ATTACK & DEFEND` clips leading `A`, `FREE ROAM` overlaps `MANA FORECAST`, `GEAR` truncates `Padded undershirt`, `STATUS` overlaps `Movement / 4 tiles per AP`, and Athletics `Untouchable` still displays a `[U]` placeholder.

---

## 6. Writing & Flavor Highlights

- **`Trick Shot` (Dexterity 10)**: *"Off the pipe, off the plate, into the second one. You called it."*
- **`Pull Out (1 AP)`**: Clean, punchy combat phrasing.

---

## 7. Analyst Verdict & Top Recommendations

**Verdict: ★★★★½ (Major v0.32.0 win — all 4 core gameplay blockers fixed)**
Dexterity / Pressure had the cleanest bug-fix turnaround in v0.32.0: **Flashbangs throw properly**, **`Mag Dump` multi-rolls and early-aborts**, **2H weapons stow cleanly**, and **self-Stims save solo runs**. With its mechanical loop fully intact, the top remaining priorities are UI/HUD hygiene (`Rewards waiting` off-viewport, `1280×900` overlaps, empty button `name`s, stale `Chosen action` text) and tuning early Stage 1 XP/ammo pacing so solo gunfighters can realistically reach **Level 3 (`Skirmisher`)** before Gate 8.
