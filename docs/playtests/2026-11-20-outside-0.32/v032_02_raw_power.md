# Project Heaven Cry v0.32.0 Review — Gate 2: Raw Power (`STR` → `Breaker`, Momentum System)

> **Source Run**: Live v0.32.0 playtest (`raw_v032_02_raw_power.md`) · Room **`L7SMZV`** · Seed **`PHC-R9HR3H`** (Survival, saved cleanly at Stage 1 Stop 6 of 15)
> **Baseline Compared**: v0.31.10 (`heaven_cry_review.md`, `02_raw_power_report.md`) · Room `UAHQKZ` · Seed `PHC-5ILQP8`

---

## 1. Run Snapshot: v0.32.0 vs. v0.31.10

| Metric | v0.31.10 Baseline | v0.32.0 Playtest |
|---|---|---|
| **Character & Build** | **Krag Ironhand** (*The Adamantile Brigade*, **Level 7 · Breaker II**, STR 9 / AGI 4 / END 3, Raw Power 9, Guts 5, Intimidation 5) | **Sledge** (*05 The Adamantile Brigade*, **Wrecking Ball**: `END 3, STR 7, AGI 3`, Level 2 `105/250 XP`, `91/141 HP`, `530 cr`; `Raw Power 7 (+6)`, `Guts 2 (+1)`, `Intimidation 1 (+1)`) |
| **Forks, Perks & Traits** | Fork: `Rolling Start`; Perks: `Iron Grip II`, `Riposte`, `Read the Swing`, `Bone Talk II`; Boons: `Balanced Grip`, `Second Wind`, `Tithe`, `Primed` | Fork @4: **`Rolling Start`**; Perks: **`Keep Swinging I & II`**, **`Iron Grip I`**; Traits: `Glass Runner`, `Blade Recluse`; Boon: **`Balanced Grip`** |
| **Loadout** | Maul `RELIC ◆◆◆` + `Weighted head`, Glaive `RELIC ◆◆◆` | **`Ork machete`** (`HEAVY · EDGE`, `70` Hit / `90` Charge, drilled `1013/1800` → Mark I `Cleave`, Mark II `Run Through`), `Body armour (Class I)`, `Stim injector`, `Essence of Experience` |
| **Furthest Reached** | Stage 3, Stop 12/15 (Cleared Stage 1 & 2 Bosses, Gate 3 Elite & Vault) | **Stage 1, Stop 6/15 cleared** (Won Stops 1, 4, 6; reached Level 2, saved cleanly) |

---

## 2. TTRPG / CRPG Player Experience: Early Heavy Melee vs. Momentum Pacing

While Krag Ironhand's v0.31.10 run showcased Raw Power's explosive mid-to-late-game ceiling (`432`-dmg triple Cleaves and `426`-dmg Coups at Level 7), **Sledge's v0.32.0 Stage 1 run** highlights how Raw Power actually feels in the opening 6 stops:

- **Punchy Impact & Control (`Charge` + `Grapple` + `Iron Grip I`)**:
  - `Charge` with **`Rolling Start`** (`4 AP` total via a 2-tile run) cleanly opened Stop 1 for **`90` damage** and a `0 → 1` Momentum spike.
  - **`Grapple + Iron Grip I`** proved to be the early-game tactical MVP: locking down Rat 3 in Stop 1 and burning **all 3 of the Gun drone's actions** in Stop 4 (`A firing line`) to neutralize ranged danger up close.
  - Self-using **`Stim injector` (`1 AP`, `+26 HP`, cured Bleeding)** in Stop 1 kept the early bruiser safe without outside healing.
- **Stage 1 Finisher Starvation**:
  - Because an `Ork machete` plain `Hit` already deals **`70` damage**, Stage 1 enemies (`20–70 HP` Gutter rats) die in one hit *before* Sledge can accumulate `2+` Momentum with AP to spare for Finishers (`Cleave`, `Run Through`).
  - Meanwhile, swarm multi-hits drain **`0.88` Momentum per hit** at `Guts 2`, resetting Momentum before Finishers come online—making Stage 1 Raw Power feel more like a heavy-hitting `Hit / Grapple / Charge` brawler than a Momentum-finisher engine until enemy HP scales up.

---

## 3. v0.31.10 Bug Fix Scorecard

| v0.31.10 Issue | v0.32.0 Status | Verification Details |
|---|---|---|
| **1. `Charge` Momentum preview lies (`0 → 0`)** | **FIXED & VERIFIED** | `Charge` now accurately previews `"On a hit: Rolling Start / Momentum 0 → 1"` and `"2 tiles in a straight line, 1 AP"`, matching live execution. *(Breaker vs. Shaken preview not tested at Level 2.)* |
| **2. `Run Through` shows `KEEP IT / LEAVE IT IN` on non-Reach weapons** | **RULE TEXT FIXED** | Properly gated behind the `REACH` tag; non-Reach `Ork machete` preview shows only Pin + `+20%/Momentum`. |
| **3. Self-Stim blocked in combat** | **FIXED & VERIFIED** | `Utility -> Stim` self-tile heals `+26 HP` and cures Bleeding for `1 AP`. |
| **4. Post-Finisher chain lock (`Hit` blocked vs `Barrel In`/`Shove`) & `Primed` boon** | **NOT VERIFIED** | Low-HP Stage 1 foes died before reaching `2 Momentum` with AP left; `Primed` is a Stage 2 boon not reached in Stops 1–6. |

---

## 4. Remaining & Newly Observed v0.32.0 Bugs & UI Issues

1. **Level-Up Raw Power Row Displays Wrong Fork (`Spill or Headlong`) (Medium)**: Displays the **Level 8** Fork (`Spill or Headlong`) both before and after picking the Level 4 Fork (`Rolling Start`).
2. **`Attack an object` Fails in Melee vs. Explosive Barrels (Medium)**: Attempting to melee-destroy an Explosive barrel rejects with `"Nothing there to shoot."`
3. **`Glass Runner` Consumed on 0-AP `Approach` & Negative Move Hint (Medium)**: `Approach` 0-AP pre-contact movement consumes `Glass Runner`, and the Move hint still prints negative leftover tiles (`"-2 paid-for tile left this turn"` — persisting from v0.31.10).
4. **Plain `Hit` (Strike) Locks Out `Charge` (`Opener`) (Low/Design)**: Executing a Strike first locks out `Charge` (`"An Opener is only the first melee technique of your turn"`), preventing mid-turn gap-closing Charges after clearing an adjacent rat.
5. **Persisting UI/Layout Bugs from v0.31.10 (Medium/Low)**:
   - **You-card & HUD overlaps**: `MOMENTUM` clipped under sticky skewed `YOUR TURN` banner; `ECHO 1/3` overlaps `?`; Music pill overlaps the right-most enemy Initiative card.
   - **Duplicated error strings** in `Chosen action` footer (`"No straight run...No straight run..."`, `"Out of melee reach. · Out of melee reach."`).
   - **Stale state & misc UX**: Stale `Techniques` `aria-pressed="true"` on tab switch, pre-queued `Chosen action` persisting across turns/Free Roam, `Whole map` click panning instead of moving, and a spurious `"Opened in another tab"` toast on Save.

---

## 5. Analyst Verdict & Top Recommendations

**Verdict: ★★★★☆ (Accurate `Charge` previews & solid early brawler feel; Finishers gated by Stage 1 HP & UI overlaps)**
v0.32.0 fixes two annoying Raw Power clarity bugs—**accurate `Charge` Momentum previews** and **`REACH`-gated `Run Through` text**—plus **self-Stim** survival. However, Stage 1's `20–70 HP` enemies melt to plain `70`-dmg swings before `Cleave`/`Run Through` can shine, and several v0.31.10 UI bugs (`MOMENTUM` banner clipping, duplicated warnings, negative `Glass Runner` move hint, stale `Techniques` toggle) plus the **wrong Fork label (`Spill or Headlong`)** and **melee `Attack an object` gun check** remain.

**Top 4 Fixes for Next Patch**:
1. Fix the **Level-Up Raw Power Fork label** (`Spill or Headlong` shown instead of Level 4's `Rolling Start`).
2. Fix **`Attack an object`** rejecting melee attacks with `"Nothing there to shoot."`, and stop **`Approach` 0-AP moves** from burning `Glass Runner` (and fix negative `"-2 paid-for tile"` math).
3. Fix **`MOMENTUM` clipping under `YOUR TURN`**, `ECHO 1/3` overlap with `?`, duplicated validation strings, and stale `Chosen action` / `Techniques` toggle state.
4. Consider tuning early Stage 1 **Momentum decay (`0.88`/hit)** or granting `+1` Momentum on kills so low-level heavy melee players actually get to fire Finishers (`Cleave`/`Run Through`) during Stage 1 swarms.
