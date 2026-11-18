# Visualization (EXP -> Rigger) & Figments Playtest Report
Room Code: **`QD6KBR`** · Seed `PHC-WEA3QE` · Cleared **Stop 1 (Fight 1)** in 2 rounds, reached **Level 2 (142 / 250 XP)**.

### 1. Build & Progression
- **Character**: **Mira Shen** · Origin **08 The southern sects** · Archetype **Illusionist** (leads to **Rigger** at Level 3 / 250 XP: `Rank I: Double · Field Fix`) · Belief **Atheist · Pilgrim**
- **Attributes / Skills**: `END 2, STR 1, AGI 1, PER 3, INT 3, EXP 7, INS 1, DET 1, VIR 1`; `Visualization 7`, `Charisma 3`, `Improvisation 1`.
- **Traits (2/2)**: **Southern Fist** (`+1 AP` each turn & `+20%` unarmed damage with bare fists/gloves; `+1 AP` penalty on other weapons) & **Born Performer** (`+20%` combat XP).
- **Perks & Forks**: Visualization Forks: **Wall** (Viz 4), **Beast** (Viz 6), **Eye** (Viz 7) — plus baseline **Double**, **Snare**, **Hand**. Perks: **Many-Eyed Dream Tier II** (`+6%` Figment blow damage per held Figment, up to `+18%`), **Wake of the Kill Tier I** (`+1 AP` once per turn on your turn when a Figment kills a foe), **Crowd Pleaser Tier I**.
- **Loadout & Boon**: **Hand wraps** + **Visualizer** (off-hand, `10` charge) + **Class 1 body armour** + **Standard mana core ×5**. Boon: **Quick Sketch** (first `Picture` per fight costs `1 AP`).
- **Figment Designs Created (3/3)**:
  1. **Boom Double** (`Double + Hollow, Volatile` · `2` charge, `12 HP`)
  2. **Thorn Wall** (`Wall + Armoured, Barbed` · `5` charge, `72 HP`, `Move`, `Press 1 AP`)
  3. **Razor Beast** (`Beast + Swift, Keen` · `6` charge, `36 HP`, `Move`, `Strike 2 AP`, `Pounce 3 AP`)

### 2. How Figments Work, Clarity & Fun
- Figments share **your AP** (`no turn of its own: the AP are yours`), cost **Visualizer charge** up front plus **1 charge/turn upkeep** at turn start per active Figment, and are piloted directly via `Move`, combat actions (`Strike`, `Pounce`, `Press`, `Draw fire`), repositioning (`Redraw 1 AP`), reclaiming charge (`Cash in 1 AP` refunds made charge), or dismissing free (`Let go 0 AP`). Destruction causes **Snap** (`-1 AP` next turn).
- **Balance**: At Level 2 with `Many-Eyed Dream II`, **Razor Beast** swung at **+9 to hit** for **47–50 damage** per 2 AP `Strike` (one-shotting Level-2 Scuttlers and refunding `+1 AP` via *Wake of the Kill*). **Boom Double (`Hollow + Volatile`, 2 charge)** fooled all 4 Scuttlers and killed two Scuttlers on death when destroyed!

### 3. Bugs & UI Issues (with Repro Steps)
1. **Figment Design Traits lack all descriptions/tooltips (Major UX gap)**: Path Map → `MAGIC` tab → `+ NEW DESIGN` → inspect `Armoured`, `Swift`, `Loud`, `Volatile`, `Tethered`, `Mirror`, `Barbed`, `Lasting`, `Keen`, `Hollow (-1)`. None have hover tooltips, `aria-label`s, or inline text explaining stat/behavior changes.
2. **`Picture` button & `"What to picture"` selector show wrong charge cost and no Figment preview**: In combat (`Figments` tab), click `Picture`. The action button always labels `Picture 2 AP · 2 Visualizer charge` even when `Quick Sketch` reduces AP to `1` or a selected design like `Razor Beast` costs `6` charge.
3. **Volatile explosion damage, hit targets, and Scuttler deaths missing from Combat Log**: Picture a `Volatile` Double and let enemies destroy it. The combat log jumps from `Boom Double is destroyed` to `The air turns RICH (mana 21): Scuttler 3 fell` with no lines showing Volatile's trigger, damage roll/amount, Scuttler 2's death, or why Mira Shen lost `22 HP` (`109 → 87`).
4. **Victory Scoreboard fails to credit Figment damage/kills (`"No one's turn"`)**: Scoreboard displays `Mira Shen · DEALT 0 · KILLS 0` and attributes `No one's turn: 97 damage to foes.`
5. **Visualization Forks selected at Camp `Level up` did not carry into Run `MAGIC` tab**.
6. **Spare mana core count mismatch (`×5` in backpack vs `1 spare cores` in combat)**.
7. **Free Roam transition is easy to miss (`ROUND 3` header vs `FREE ROAM · ROUND 1 OF 3`)**.
8. **Character Creation Traits filter bug & sticky Camp header overlap**.
