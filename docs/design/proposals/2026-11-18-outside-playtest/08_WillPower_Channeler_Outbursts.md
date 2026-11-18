# Will Power (DET -> Channeler) & Outbursts Playtest Report
Room Code: `KUJKDS` (Seed: `PHC-TVYT66`) · Character: **Vespera Vane** (Origin: **07 Arkvelton**, Archetype: **Unbroken**, **Level 2**).

### 1. Build & Setup
- **Attributes & Skills:** `DET 7` (leads to **Channeler** at Level 3: `Rank I: Shape · Iron Heart`), `INS 5`, `STR 3`, `END 3`, `WIS 3`, `CHA 3`. **Will Power: 7** (`+6`, Mastery 3, `+35%` Soul Outburst output, `+2` design slots, `1` free Pump/turn, `+2` module slots). **Composure: 3** (`+2`, Mastery 1, Strain limit `7`, `−1` Strain/turn).
- **Traits:** **Upper-Touched** (*−20% Outburst MP cost*) + **Hollow Heart** (*+10% Outburst damage; Mana Short doesn't Stun; Strain downing is unconscious/stable*).
- **Perks & Boon:** **Clenched Heart Tier II** (*Overdraw: +2 stages once/turn for +1 extra Strain; first Overdraw 0 extra Strain*), **Resonance Tier I** (*+4% output to next Release, up to 3 stacks*), **Flat Line Tier I** (*Drop 2 Strain at turn start when unhurt*); Boon: **Hot Blood** (*First fight action −1 AP; first fight attack +25% dmg*).
- **Designs & Modules:** `Heartshatter Bolt` (Damage/Bolt), `Mend` (Buff/Heal Bolt), `Heart Wave` (Control/Push 3 Wave cone) + 2 open Module picks (`Wave`, `Blast`, `Wall`, `Chain`, `Focus`, `Move`, `Linger`, `Split`).

### 2. How Outbursts Work in Practice
- **Begin (2 AP, or Snap 3 AP at ×0.8):** Lights the **`YOUR HEART`** dashboard at Stage 0 (`×0.8`) and adds `+1 Strain`.
- **Pumping, Overdraw & Pouring in Feelings:** Stages climb `0 (×0.8) → 1 (×1.0) → 2 (×1.2) → 3 (×1.4) → 4 (×1.6)`. Pouring a Feeling (`Rage +0.5`, `Love +0.3`, `Spite +0.2`) boosts the multiplier and leaves **Residue** on the tactical grid upon Release!
  - *Round 1:* Begun `Heartshatter Bolt`, toggled **Overdraw** (`Stage 0 → 2`, free first Pump + 0 Strain), poured in **Rage** (`Stage 2 → 3`, `×1.7`), Pumped to **Stage 4 (`×1.9`)**, and Released on `Gutter rat 4` for **152 Soul damage** (instant kill) while painting a striped **Rage Residue** tile (`5 Soul damage a turn, 2 rounds`).
  - *Round 2:* Begun **Heart Wave** (`Cone 3`), Pumped + poured in **Rage** (`Stage 2, ×1.56`), and Released across `C8`: hurled `Gutter rat 1` to `E11` and `Gutter rat 3` to `E5`, painting a **10-tile cone of striped Rage Residue** across the battlefield!
- **Dynamic Feeling Unlock Mid-Combat:** When `Gutter rat 3` hit Vespera for 4 damage in Round 2, the log announced: *"Vespera Vane has felt Spite (hurt by Gutter rat 3): it can be poured in now"*, immediately unlocking **`Spite +0.2 (+0.5 against whoever last hurt you)`** in the Heart panel for Round 3.

### 3. Bugs & UI Issues Specific to Will Power / Outbursts
1. **`1 FREE PUMP` Badge in HEART Panel Does Not Update After Using Free Pump (Round 1)**, and **Feeling Buttons (`Rage +0.5`, `Love +0.3`) Display `0 AP · 2 MP` Initially, Then Act as a Full Stage Pump Spending `1 AP · 5 MP`**.
2. **Duplicate `Begin / Snap` Toggle Row in Chosen Action Panel**.
3. **Strain Meter is Hidden Behind a Tiny `+2` Button at Fight Start for Outburst Casters**.
4. **Elemental Tone Tooltip vs. Description Mismatch in Custom Outburst Builder (`Step 6: Moves`)**: Tooltip says *"Needs Lore Master 1 (you have 1)"*, while helper text says *"Elemental tones open at Lore Master 2."*
5. **Missing/Black Portrait & Skill Icons in the `Level up · pick a perk` Modal at Camp**.
6. **Will Power has no 4-point `FORKS` row in Level Up**, and starting perk steps (`4 waiting`) are hidden until entering the Camp.
