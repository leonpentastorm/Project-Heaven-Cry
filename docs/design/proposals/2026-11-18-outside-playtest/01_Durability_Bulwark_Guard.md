# Durability (END -> Bulwark) & Guard Playtest Report
Room Code: `G9U92E` (Seed `PHC-T7E76R`).

### 1. Room Code, Build & How Far We Got
- **Room Code**: `G9U92E` (saved cleanly on exit back to the title screen)
- **Character**: **Holdfast** — *The Thousand-Planet frontier* · **Level 3 · Bulwark I** (`647 / 700 XP`, `260 Max HP`, no MP focus, `669 credits`, weight `10.28 / 30 kg`)
- **Attributes**: **END 8**, STR 3, AGI 3, PER 1, INT 1, EXP 1, INS 1, DET 1, VIR 1
- **Key Skills**: **Durability 8 (+7)**, **Pain Threshold 4 (+3)**, Guts 1 (0), all others 0 (−2)
- **Durability Forks**:
  - Rank 4: **Provoke** chosen (first foe hitting your Guard each round is Taunted 1 round, no save) over *Cover Them*
  - Rank 6: **Drive** chosen (Slam pushes 2 tiles, −2 Body save, refunds 1 plate per foe knocked Off Balance up to 2/turn) over *Stand Fast*
- **Perks & Boons**:
  - **Weight of the Wall II** (+3% weapon dmg per Guard held, up to +15%), **Answer in Kind I** (+8% weapon dmg until end of next turn when hurt), **Used to the Pain I** (25% less dmg on 2nd hit if 1st <20% max HP), **Numb** (one injured limb doesn't penalize)
  - **Bulwark I**: **Brace (Hold the Line)** (2 AP → fill Guard + `+2 Defense` until moved/pushed/Prone + Interpose), **Called Out** (Challenge costs 0 Guard, "no save")
  - **Run Boons**: **Set Feet** (+1 Guard at fight start), **Second Wind (boon)** (+1 AP/turn → 7 AP base, 6 when Threatened/Shaken)
- **Kit & Arms**: **Hand wraps** (982 drill, Marks I–II; Ready Melee 3/3: *Break*, *Bind*, *Parry*), **Buckler** (1182 drill, Marks I–II; *Shield follow*, *Shield Bash*, *Raise Shield*, *Shield Wall*), **Armoured greaves** (Heavy 3 kg), **Padded undershirt** (1 kg), **Field boots** (1.2 kg), Frag grenade ×1, Stim injector ×5, Throwing knives ×1 (unusable off-hand at DEX 0), Gunpowder ×84, Casing ×84.
- **How Far We Got**: **1 stage cleared, 22 stops walked, fell at Stage 2 Stop 6 of 15 (*The Vault's Guard*, Round 9)** — 9 stops short of the Stage 2 Boss.
  - **Run Totals (11 fights)**: 10 of 11 won · `2,565` dmg dealt · `704` taken · `52` healed · `141` soaked · `20` kills · `1` down · `125 / 180` hits (`69.4%`).

### 2. How Guard Works in Practice (Clarity, Fun & Identity)
- **Mechanics in Play**: Each Guard plate acts as a **9-damage ablative buffer** (matching `Pain Threshold 4` / Durability 8, though UI inconsistently says 7). Crucial rule discovered in combat: **non-lethal blows never spend your last plate (`N−1` plates soak before HP)**. On a `35`-dmg hit at `5/5` Guard, 4 plates absorb `36` (`0 HP` taken, `1/5` left); at `1/5` Guard, ordinary hits bypass Guard straight to HP until a **lethal** hit triggers **Last Plate** (saving you at `1 HP` once per fight and shattering all plates).
- **Action Loop & Controls**:
  - **Guard (Hand wraps technique, 1 AP)**: Jumps straight from `0→5/5 FULL` (`1 base + 3 Durability scaling + 1 Buckler`? Tooltip says `1, +1 per Dur >1, +1 shield` capped at `5`) plus `+2 melee Defense`. Once/turn only.
  - **Brace (Hold the Line, Class 2 AP)**: Also fills `5/5` Guard AND grants **Braced (`+2` all Defense until moved/pushed/Prone)** — huge against ranged bursts, though Lunge/knockbacks break it (until Bulwark III *Anchor* at Level 12).
  - **Raise Shield (1 AP)**: Converts Momentum `1:1` into Guard AND gives **`-2` ranged to-hit from front** (even at `5/5` Guard when 0 Momentum is spent!).
  - **Slam + Drive (2 AP, 2 Guard)**: Great tactical peel & plate refund (`+1` plate per Off Balance foe), pushing enemies 2 tiles without moving Holdfast.
  - **Shield Bash (1 AP, 1 Guard)** & **Shield follow**: Reliable 1-AP finisher/push + free `+1` Guard sustain on Buckler follow hits.

### 3. Bugs (with Repro Steps) & Playstyle UI Issues
1. **Durability 5 `Second Wind` (25% HP heal) missing from combat actions + Boon name collision**: Open `G9U92E` / build a character with Durability ≥5 (`FROM YOUR SKILLS` lists *"Second Wind · 2 AP, once a fight: heal 25% of your max HP"*). Enter combat and check `Move (4)`, `Attack (6)`, `Utility (7)`, `Perks (3)`, `Class (4)`. The 2 AP heal never appears; only the Stage 1 Run Boon of the same name (`Second Wind · +1 AP/turn`) shows in `ALWAYS ON`.
2. **`Parry` ignores Durability (+7) while holding Guard, wasting Reaction & locking out `Retort`**: Equip `Parry ✓` with `Hand wraps` + `Buckler` on a Durability 8 (`+7`) / STR 3 (`0` Raw Power `-2`) / AGI 3 (`0` Dex `-2`) Bulwark holding Guard. Take a melee hit in combat. *Expected*: Parry uses Durability (`+7 + 2 shield = +9`). *Actual*: Parry rolls `d20 + 2 (incl. +2 shield)` in Rounds 2, 8, 9, failing every check and consuming `1/1` Reaction so **Retort** (50% melee reflect) can never trigger.
3. **`Called Out` (Bulwark I) promises "no save" on `Challenge`, yet targets still roll a Heart save**: As Bulwark I (*"Your Challenge costs no Guard, and the foe you name takes it with no save"*), cast `Challenge` (`Perks`) on a non-boss foe. In Round 2, `Challenge` spent 0 Guard as promised, yet Bruiser rolled a Heart save (`d20 7 + 2 = 9 vs TN 19`) and the action text still read `1 AP and 1 Guard`.
4. **Guard plate soak UI mismatch (`7` vs `9`) + drops to `7` when Downed + misleading `armour broken (0)`**.
5. **`Set Against the Blow` downgrades crits yet logs `CRITICAL` & injury roll**.
6. **Endurance `?` modal omits level requirements for Bulwark II / III**.
7. **Post-defeat Run Summary UI bugs**: Holdfast's HP displays `1 / 260` on Character Sheet and Squad card instead of `0 / 260` after falling.
8. **Combat & Durability UI Issues**: `Challenge` and `Slam` `Chosen action` cards dump the entire multi-paragraph Durability EPCCG essay, truncating/burying target, hit %, AP/Guard cost, and save TN; `Turn panel` rendered completely blank twice (Round 5 post-fumble, Round 8 start) until clicking `Save` forced a re-render.
