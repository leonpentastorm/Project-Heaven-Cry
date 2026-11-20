# Project Heaven Cry v0.32.0 Review — Gate 1: Durability (`END` → `Bulwark`, Guard System)

> **Source Run**: Live v0.32.0 playtest (`raw_v032_01_durability.md`) · Room **`GCWBY7`** · Seed **`PHC-479HZF`** (Survival, saved cleanly at Stage 1 Stop 5 of 15 · Shop)
> **Baseline Compared**: v0.31.10 (`heaven_cry_review.md`, `01_durability_report.md`) · Room `G9U92E` · Seed `PHC-T7E76R`

---

## 1. Run Snapshot: v0.32.0 vs. v0.31.10

| Metric | v0.31.10 Baseline | v0.32.0 Playtest |
|---|---|---|
| **Character & Build** | **Holdfast** (*The Thousand-Planet frontier*, END 8 / STR 3 / AGI 3, Durability 8, Pain Threshold 4, **Level 3 Bulwark I**, `260 Max HP`) | **Holdfast** (*05 The Adamantile Brigade*, *Living Wall*: `END 7`, `STR 3`, `AGI 3`, Durability 7 (`+6`), Pain Threshold 2 (`+1`), Guts 1, Level 1 (`88/100 XP`, `190 Max HP`, Def `10`, Move `2/AP`) |
| **Forks, Perks & Boon** | Forks: `Provoke` (4), `Drive` (6); Perks: `Weight of the Wall II`, `Answer in Kind I`, `Used to the Pain I`, `Numb`; Boons: `Set Feet`, `Second Wind (+1 AP/turn)` | Fork @4: **`Provoke`**; Perks: **`Answer in Kind II`**, **`Weight of the Wall I`**; Boon: **`Hold Fast`** |
| **Loadout** | Hand wraps + Buckler, Armoured greaves, Padded undershirt, Field boots | Hand wraps (`40%` native / `80%` with Guard) + Buckler (`80%`, `SHIELD`, `FOLLOWS`), looted `Kemizuchi strikers` + `Ballistic helmet`, `360 cr` |
| **Furthest Reached** | Stage 2, Stop 6/15 (Cleared Stage 1 Boss, 10/11 fights won) | **Stage 1, Stop 5/15 Shop** (Won Stop 1 Trooper + Stop 4 Hunter drone Elite, `73/190 HP`, saved cleanly) |

---

## 2. TTRPG / CRPG Player Experience: The "Living Wall" Fantasy

Even at Level 1, v0.32.0 Durability captures the immovable frontline tank identity cleanly:
- **Core Tank Loop**: Raising **Guard** via `Guard` or `Brace` immediately flips Holdfast from fragile `40%` melee accuracy to **`80%` hit chance** (verified Durability `+6` scaling on `Hit`) while stacking `Weight of the Wall I` damage and arming **`Provoke`** (auto-Taunting the first enemy to strike your Guard with no save).
- **Shield Offense & Disruption**: **`Shield Bash` (`1 AP, 1 Guard`)** was the star performer—delivering **`30` damage** + push + `+1 Momentum` in Stop 1, and landing a **`44`-damage CRIT** in Stop 4 against the *Hunter drone* Elite that inflicted a **Head injury (`Dazed -2 AP`)** + push.
- **Survivable Solo Recovery**: Self-Stim (`+38 HP` for `1 AP`) worked via both Backpack (`Use · 1 AP`) and `Utility -> Stim` self-targeting, fixing v0.31.10's brutal solo sustain gap.

---

## 3. Balance & Design Friction

### Improvements
- **Durability 5 Reorganized (`Slam` vs. `Second Wind`)**: Moving `Second Wind` (`I: 2 AP once/fight heal 25% max HP · II: And +2 Guard`) out of Durability 5 into **Pain Threshold 3/5/7/9** and placing `Slam` at Durability 5 eliminates the v0.31.10 naming/slot collision with the `Second Wind (+1 AP/turn)` boon.

### Remaining Pain Points
1. **Binary `0 Guard` Accuracy Cliff (`80% → 40%`)**: Losing your Guard plates cuts your main-hand accuracy in half (while `Suppress` Pressure strips plates rapidly), punishing turns where you drop to `0` Guard or get caught before guarding.
2. **`Slam` vs. `Shield Bash` Value Gap**: `Slam` costs **`2 AP + 2 Guard`** for **`0` damage**, a 1-tile push, and Off Balance—whereas **`Shield Bash`** costs half as much (**`1 AP + 1 Guard`**) and deals **`30–44` damage** plus push and `+1 Momentum`! Without the Rank 6 `Drive` fork (and even with it), baseline `Slam` feels severely overpriced next to `Shield Bash`.
3. **`Guard` vs. `Brace` Overlap & Unclear Cooldown**: Having two separate full-Guard buttons (`Guard` technique vs. `Brace`) with overlapping cooldown/economy feels confusing in early combat.
4. **Early Economy & Non-Caster Dead Drops**: `1,200 cr` for a Stage 1 Stop 2 Forge `Standard → Fine` upgrade is completely out of reach at `120 cr`, and martials still have no way to use `Essence of Experience` or Faith-gated Shrine hymns (`Foreknowing`).

---

## 4. v0.31.10 Bug Fix Scorecard

| v0.31.10 Issue | v0.32.0 Status | Verification Details |
|---|---|---|
| **1. Durability 5 `Second Wind` missing from combat bar** | **MOVED / CLARIFIED** | Durability 5 is now `Slam`; `Second Wind` is a **Pain Threshold perk** at Ranks 3/5/7/9 (`I: 25% heal`, `II: +2 Guard`). Holdfast started at Pain Threshold 2 (`88/100 XP`), so it wasn't unlocked yet. |
| **2. `Parry` ignores Durability (`+7`) & blocks `Retort`** | **NOT VERIFIED** | No `Parry` weapon appeared in Camp, Forge, Stop 4 drop, or Stop 5 Shop. *(Confirmed live `Hit` math DOES apply Durability `+6`, jumping `40% → 80%` while holding Guard.)* |
| **3. Bulwark I `Called Out` still rolls Heart save on `Challenge`** | **NOT VERIFIED** | Run ended at Level 1 (`88/100 XP`), short of Level 3 Bulwark I. Level-Up confirms Bulwark I lists `Brace · Called Out`; pre-Bulwark `Challenge` properly rolled Heart save vs TN 18. |
| **4. Guard plate soak UI mismatch (`7` vs `9`)** | **FIXED & VERIFIED** | All three surfaces (`Guard` tooltip, `SHIELDS` HUD, combat log) consistently report **`7` dmg/plate** at Pain Threshold 2 / Durability 7. |
| **5. Self-Stim blocked in combat** | **FIXED & VERIFIED** | Works via both `Backpack -> Use (1 AP)` and `Utility -> Stim` self-tile (`+38 HP`). |

---

## 5. Remaining & Newly Observed v0.32.0 Bugs & UI Issues

1. **Combat `SOAKED` Summary Stat Always Reports `0` (High)**: Even after heavy Guard plate soaking across multiple rounds, the post-fight summary displays `SOAKED 0`.
2. **Off-Hand `Buckler follows` Fires on Main-Hand MISS & Nat-1 FUMBLE (Medium/High)**: Missing or fumbling with Hand wraps still triggers Buckler follow damage and grants `Shield follow (+1 Guard)`.
3. **`Guard` Technique Silently Consumes `1 Momentum` (Medium)**: Action preview states `Momentum 0 → 0`, yet executing `Guard` silently spends `1 Momentum`.
4. **Approach-Phase `Confirm` on `Brace` Triggers Contact Without Casting `Brace` (Medium)**: Confirming `Brace` in Approach skips executing `Brace` and immediately initiates Contact.
5. **`Slam` & `Challenge` Dump Full Durability EPCCG Walls & Mislabeled Log (Medium)**:
   - Both tooltips dump the entire multi-paragraph Durability rules essay (ending in `"(the Narrator rules what the engine doesn't)"`).
   - `Slam` omits its Body save and push from the combat log; `Challenge` mislabels its log entry as `"uses Guard"`.
6. **Combat Log Inverted Order vs. ARIA Label (Medium)**: ARIA states `"newest at the bottom"`, while DOM renders newest entries at the top and reverses multi-line sub-entries.
7. **Character Creation `Step 6 Moves` Omits Durability 7 Moves/Perks/Forks (Medium)**: Displays *"No techniques or magic yet..."* despite starting with Durability 7 + Fork.
8. **Level-Up Modal Clipping & Sticky Header Overlap (`1280×800`) (Medium)**: Perk/Fork modals clip and are occluded by the sticky Level header; sticky Turn bar overlaps the `You` card.
9. **Persisting Polish Bugs (Low)**: Duplicated validation text (`"Out of melee reach. · Out of melee reach."`), badge spacing glitches (`"Techniques · 22 of 2 now"`), Camp Shop duplicated unchanged stats (`"To hit 40% 40%"`), Stop 1 round-count mismatch (`won in 4 rounds` vs `ROUND 5`), and transient `ROUND 7` flash after Stop 4 R6 victory.

---

## 6. Writing & Flavor Highlights

- **Knight Jiren** (Pain Threshold EPCCG quote).
- *"The wall doesn't fall. The wall decides when it's done."*

---

## 7. Analyst Verdict & Top Recommendations

**Verdict: ★★★★☆ (Cleaner Guard math & solo survival, held back by `SOAKED 0`, `Slam` cost, and tooltip/log bugs)**
v0.32.0 resolves the confusing Guard soak UI discrepancy (`7` vs `9`), moves `Second Wind` cleanly onto Pain Threshold to prevent boon collisions, and gives solo tanks working self-Stims. However, **silent Momentum drain on `Guard`**, **off-hand `Buckler follows` firing on Nat-1 fumbles**, **`SOAKED 0` summary tracking**, and **EPCCG essay dumps inside `Slam`/`Challenge`** remain noticeable rough edges—and `Parry`/`Called Out` still need a Level 3+ Parry-weapon verification.

**Top 4 Fixes for Next Patch**:
1. Fix **`SOAKED` summary tracking**, stop **`Guard` from silently spending `1 Momentum`**, and gate **`Buckler follows` on main-hand hit** (not miss/fumble).
2. Fix **Approach-phase `Brace` Confirm** skipping execution and fix **Combat log top-to-bottom ordering**.
3. Trim **`Slam` and `Challenge` tooltips** to concise action cards (and fix `Challenge` logging `"uses Guard"`), plus buff baseline **`Slam`** (`2 AP + 2 Guard` for `0` dmg) so it isn't strictly worse than `Shield Bash`.
4. Populate **Character Creation `Step 6 Moves`** for Durability builds and fix Level-Up modal z-index/header clipping.
