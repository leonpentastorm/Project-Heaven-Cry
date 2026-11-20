# Project Heaven Cry v0.32.0 Review — Gate 4: Ingenuity (`PER` → `Operative`, Shadow System)

> **Source Run**: Live v0.32.0 playtest (`raw_v032_04_ingenuity.md`) · Room **`RCNXAB`** · Seed **`PHC-J28QPD`** (Survival Mode, solo)
> **Baseline Compared**: v0.31.10 (`heaven_cry_review.md`, `ingenuity_report.md`) · Room `W7JDNW` · Seed `PHC-W47ET7`

---

## 1. Run Snapshot: v0.32.0 vs. v0.31.10

| Metric | v0.31.10 Baseline | v0.32.0 Playtest |
|---|---|---|
| **Character & Build** | **Kestrel Vale** (`11 The gold-coin frontier`, Phantom: PER 7, Ingenuity 7, Vigilance 3; Traits: *Ghost Soldier* + *Live to Fight Another Day*) | **Vesper** (`11 The gold-coin frontier`, Atheist, Pilgrim; Phantom reallocated: PER 7, END 3, AGI 3, Ingenuity 7, Vigilance 3; Traits: *Glass Runner* + *Live to Fight Another Day*) |
| **Perks, Forks & Boon** | Missing Ingenuity Forks UI | `Shadow Step II`, `Long Dark I`, `Read Intent`; Fork @4: **`Light Fingers`**; Boon: **`Patient Eye`** (`+1` to hit while Hidden) |
| **Furthest Reached** | Stage 1, Stop 7/15 (Level 2; 3/4 fights won; lost Rd 30 vs self-healing Heart adept) | Stage 1, Stop 4/15 (`Fight: A swarm`, Round 3 of Fight 2, 1/4 Gutter rats down, Level 1 `35/100 XP`, `61/130 HP`, saved cleanly) |
| **Key Loadout** | Parlour pistol (2-rd mag, 2 spare mags) | Parlour pistol (16 dmg, 2-rd mag, `QUICK`, `SILENT`, 2 spare mags = 6 `.32 Decrkm` total), Combat knife, Smoke grenade, Stim injector, Padded undershirt |

---

## 2. TTRPG / CRPG Player Experience: Stealth as an Immersive-Sim Toolkit

The v0.32.0 Ingenuity loop delivers one of the most distinctive tabletop-to-CRPG stealth fantasies in Project Heaven Cry. Rather than treating stealth as a binary "invisible until you attack" damage tax, the **Shadow** system feels like a true **Operative / immersive-sim action economy**:

- **The Setup Loop (`Unseen → Hide → Stalk → Mark/Sabotage → Break`)**:
  - `Hide` (`1 AP`) triggers `First Shade` (`1/3 Shadow`), moving cover-to-cover climbs to `2/3`, and ending a turn Hidden caps at `3/3 FULL`.
  - In Fight 2 (`A swarm`), hiding inside Smoke (`3/3 FULL`) forced three Gutter rats to actively roll Perception (`9, 12, 9 vs DC 19`) and fail to spot Vesper—capturing authentic tabletop tension.
- **Standout Immersive-Sim Moment (`Case → Tag → Lift → Break`)**:
  - With the Rank 4 **`Light Fingers`** fork (`Lift` `-1 AP`; unseen `Lift` grants `+1 Shadow` once/turn), Vesper chained **`Case` (`1 AP`) → `Tag` (`1 AP`) → `Lift` (`0 AP` via Cased + `Light Fingers`)** to pickpocket the Trooper's **`magistrate heavy pistol magazine`** straight onto tile `E8` *without breaking `3/3` Shadow*, then fired a **`1 AP` `Break ✓ Shot`** (via `Shadow Step`) for **75 damage** (`BADLY HURT` & `Pressed`).
  - Crucially, **the theft mattered mechanically**: by Round 4, the Trooper actually **ran out of spare ammo** because Vesper had stolen its magazine in Round 2. That kind of systemic consequence is peak CRPG design.
- **Tactical Recovery & Escape**:
  - When caught in a firefight (`Trooper` crit → Bleeding + Right leg injury, `Aimed Shot` Nat 1 jam), Vesper could now **self-Stim (`1 AP`)** to clear Bleeding and restore HP (`116 → 130`), use `0 AP` `Disengage` (*Live to Fight Another Day*), drop a `Smoke grenade`, and re-establish `Hide`.

---

## 3. Progression & Forks (v0.32.0 vs. v0.31.10)

- **Ingenuity Forks Are Now Implemented and Surfaced**:
  - In v0.31.10, Ingenuity's Level-Up screen was completely missing its `FORKS` section (even though EPCCG referenced sealed forks at Ranks 4 and 6).
  - In v0.32.0, Ingenuity's **FORKS** section is live with clear rank gates:
    - **Rank 4**: `Light Fingers` vs. `Lend the Dark`
    - **Rank 8**: `Lightkiller` vs. `Spotter`
  - **Impact**: `Light Fingers` immediately elevates the Shadow Work toolkit from optional utility into a rewarding, zero-AP stealth sabotage combo (`Case` → `0 AP Lift`) that pays for itself in both Shadow economy and enemy resource denial.
  - **Perk Synergy**: `Shadow Step II` (reducing `Break` Shot AP to `1 AP`) makes `Setup + Break` combos smooth within a single turn, and picking `Glass Runner` over v0.31.10's `Ghost Soldier` avoided the punishing `-2 AP` hangover when stealth breaks.

---

## 4. Balance Analysis

### What Feels Great
1. **Systemic Enemy Resource Denial**: Stealing an enemy's magazine with `Lift` meaningfully alters the fight trajectory rather than acting as flavor loot.
2. **Survivability Restored via Self-Stim**: Fixing self-Stim (`Utility -> Stim` on self tile and `Backpack -> Use 1 AP`) removes the #1 solo death trap from v0.31.10, where Kestrel died holding unusable Stims.
3. **Lethal Ambush Payoff**: A `3/3 Shadow` `Break ✓ Shot` hits for `75` vs. an armored Trooper and `76` (one-shot `AMBUSH` kill) vs. a Gutter rat for just `1 AP` with `Shadow Step`.

### Remaining Balance & Economy Friction
1. **Parlour Pistol Ammo Starvation & Armour Wall**:
   - Even after improving from v0.31.10's baseline description to **6 total `.32 Decrkm` rounds** (`2` loaded + `2` spare mags), Vesper **exhausted all 6 rounds against a single Level-1 Trooper** in Fight 1 (due to `5` armour reducing damage, a Nat 1 jam, and a non-lethal Break opener), forcing a stow-and-knife finish.
2. **Unusable / Indistinguishable Bought AP Ammo**:
   - Buying `10 × AP .32 Decrkm` and `20 × .32 Decrkm` at Stop 3 Shop produced two stacks both named **`.32 Decrkm rounds`**, and `Load rounds` completely ignored the 10 AP rounds (`0/2` loaded, only `20 loose` recognized). Spending early credits on special ammo that cannot be loaded is a punishing trap.
3. **Entering Combat Unloaded (`0/2`)**:
   - Vesper entered Fight 2 (`A swarm`) with the newly re-equipped Parlour pistol at `0/2` loaded, burning combat AP on a Round 1 reload after Fight 1 emptied it and Fight 2 started after a Shop stop.
4. **Dead / Unusable Caster Loot (`Essence of Experience`)**:
   - Non-casters still drop/receive uncrackable `Essence of Experience`, only useful as `+150 cr` vendor trash in the Shop (no non-caster XP conversion or clear salvage path).
5. **Unresolved `Echo` Feature**:
   - `Echo` still reads `"in a fight: not yet"`, meaning Nat 1 gun jams (`Aimed Shot` in R3) have no probabilistic or Shadow-based mitigation yet.

---

## 5. v0.31.10 Bug Fix Scorecard

| v0.31.10 Issue | v0.32.0 Status | Notes from Live Playtest |
|---|---|---|
| **1. Self-Stim blocked in combat** | **FIXED** | Both `Utility -> Stim` (clicking self tile) and `Backpack -> Use (1 AP)` heal self and cure Bleeding (`116 → 130`). |
| **2. Missing Ingenuity `FORKS` in Level-Up** | **FIXED** | Rank 4 (`Light Fingers / Lend the Dark`) and Rank 8 (`Lightkiller / Spotter`) now appear and function (though chooser modal clips behind sticky banner on narrow viewports). |
| **3. `Break ✓` preview wrong on Strike & stuck pressed at 0 Shadow** | **FIXED** *(mostly)* | Strike preview updated (`16 -> 35 - armour 5`, AP `2->1`) and `Break ✓` auto un-toggles & disables at `0/3` Shadow. *(Note: ranged `Break` Shot preview showed `80` and dealt `75`, omitting `-5` armour.)* |
| **4. Parlour pistol ammo starvation** | **IMPROVED, STILL TIGHT** | 6 rounds total still ran completely dry in Fight 1 against one 5-armour Trooper. |
| **5. `Ghost Kill` triggers in plain sight** | **STILL BROKEN** | Triggered on knife kill in Fight 1 R7 while `Seen`, and again in Fight 2 R3 (`Shadow 3`) while 3 surviving rats watched `A2/B5`. |
| **6. `Shadow` tab header frozen on `SHADOW · UNSEEN`** | **STILL BROKEN** | Header continues displaying `SHADOW · UNSEEN` even when `Eye: Seen`. |
| **7. `Echo` disabled + Duplicated validation text + Stale `Chosen action` copy** | **STILL BROKEN** | `Echo` still `"in a fight: not yet"`; duplicated warning strings and stale `Chosen action` text persist. |

---

## 6. Remaining & Newly Observed v0.32.0 Bugs & UI Issues

### High Priority
1. **Action Tabpanel Desync on Tab Switch (New / Regressed)**: Switching tabs sets `aria-selected="true"` on the new tab while rendering an empty panel underneath previous tab buttons until switching away and back.
2. **`Ghost Kill` Triggers in Plain Sight (Persisting from v0.31.10)**: Grants unseen kill credit (`+1 Shadow` / `Shadow 3`) when killing foes in full view of enemies (`Fight 1 R7`, `Fight 2 R3`).

### Medium Priority
3. **Lifted / Looted Enemy Magazine Vanishes Post-Combat**: After stealing the Trooper's `magistrate heavy pistol magazine` onto `E8` in R2, aftermath `Take all` looted `3 × Gunpowder` while both the Lifted mag (`E8`) and Trooper drop (`F8`) vanished.
4. **Bought `AP .32 Decrkm` Rounds Unusable & Identically Named**: Shop stack `AP .32 Decrkm` shares the exact inventory name `.32 Decrkm rounds` with standard ammo and is ignored by `Load rounds`.
5. **`Shadow` Tab Header Frozen on `SHADOW · UNSEEN`**: Fails to update to `SEEN` when `Eye: Seen`.
6. **Level-Up Fork/Perk Chooser Modal Z-Index Clipping**: Clipped behind the sticky Level-Up banner on narrow viewports.
7. **Equipped Pistol Starts Fight 2 at `0/2` Unloaded**: No Camp/pre-fight auto-reload or warning when entering combat with an empty magazine while carrying loose ammo.

### Low Priority / Polish
8. **Ranged `Break` Preview Omits Target Armour**: Showed `80` against Trooper (`5` armour) and dealt `75` (whereas Strike preview properly reflected `- armour 5`).
9. **Duplicated Warning Strings & Stale `Chosen action` Text**: `Disengage` text says `1 AP per 2 tiles` despite `0 AP`/1 tile; `Lift` body says `2 AP` when discounted to `0/1 AP`; `Utility -> Stim` retains the prior enemy target card until clicking self.
10. **Portrait Modal Close & Narrow Viewport Overflow**: `Enlarge Trooper` modal `Close ✕` failed on click (required `Escape`); narrow viewport pushes `Save`/`Main menu` off-screen.

---

## 7. Writing & Flavor Highlights

v0.32.0 keeps the sharp, noir-tactical voice of the Operative door:
- **Lin Shin Long EPCCG quote** anchoring the philosophy of unseen work.
- **`Vanishing Act`**: *"Everyone saw you. Nobody can say where you went."*
- **`Bottle Butts for Eyes`**: Gritty, memorable frontier flavor.

---

## 8. Analyst Verdict & Top Recommendations

**Verdict: ★★★★☆ (Strong upgrade, hampered by UI regressions & ammo edge cases)**
v0.32.0 meaningfully fixes two of Ingenuity's biggest v0.31.10 blockers—**self-Stim in combat** and **live Ingenuity Forks (`Light Fingers`)**—and proves the brilliance of systemic `Case → Tag → Lift` sabotage when stealing a foe's magazine actually dries up their gun mid-fight. However, **persistent `Ghost Kill` plain-sight triggers**, **post-combat vanishing of Lifted gear**, **unusable `AP .32` rounds**, and **UI tabpanel desyncs** keep the experience from hitting 5 stars.

**Top 4 Fixes for Next Patch**:
1. Fix **Action tabpanel desync** on tab switch and **modal `Close ✕` / z-index clipping** under the Level-Up banner.
2. Make **`Ghost Kill`** check actual `Hidden / Unseen` state against all observers and sync the **`SHADOW · SEEN/UNSEEN`** header.
3. Preserve **Lifted items on ground tiles** in post-fight `Take all` loot, and distinguish/enable **`AP .32 Decrkm`** in `Load rounds`.
4. Auto-load (or allow pre-combat reload of) **equipped firearms between stops** and add a small starting ammo buffer for the 2-round Parlour pistol.
