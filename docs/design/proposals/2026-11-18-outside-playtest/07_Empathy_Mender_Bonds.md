# Empathy (INS -> Mender) & Bonds/Tend Playtest Report
Room Code: `VHE6K5` (Seed: `PHC-W65NZL`) · Character: **Lyra Vane** (Origin: **07 Arkvelton** · Archetype: **Heartreader** · Class Lead: **Mender**).

### 1. Build & Character Setup
* **Attributes (10 pts placed):** **Insight 7** (`+10% healing given`, `Soul magic costs 5% less MP`, `+25 max MP` per point), **Determination 5** (`+5% Soul power`, `+75 max MP`, `+10% mana syphoned` per point), all others at **1**.
* **Skills (10 pts placed):** **Empathy 7** (`+6` roll modifier, Mastery 3), **Camaraderie 3** (`+2` roll modifier, Mastery 1; `+10% healing received` per point).
* **Trait:** **Daggerfall Veteran**.
* **Derived Stats at Level 1:** Max HP: 100 | Defense: 10 | Movement: 1 tile/AP | Initiative: `-2` | **Max MP: 550** | **Healing Given Multiplier: `×2.48`** | **Healing Received Multiplier: `×1.30`**.
* **Camp Loadout:** **Drifter revolver**, **Attuner** (free off-hand focus, Door: Empathy `+6`, runs on MP), **Class 1 body armour (Light)**, **Field kit**, **Revolver rounds ×12**, **Essence of Experience ×1**.

### 2. How Empathy & Bonds/Tend Work in Practice
* **The Core Loop (Attuner + Bonds + Tend):** Requires an **Attuner** in your off-hand. A Bond is a thread from you to a target; **a Bond does not heal by itself**. You heal/buff a Bonded target via **Mend** or **Shield** at any range in Line of Sight, or **Touch** when adjacent (1 tile, or 2 tiles with *Short Thread*). **Let Go** ends a Bond for free; **Snap** ends a Bond aggressively (or keeps it on an enemy with the *Keep the Thread* fork).
* **Built-In Utility & Non-Lethal Win Conditions:**
  * **At 3 pts — *Feel Their Pain*:** Passive radar that reveals the **health and morale of every creature in your Vision range** (12 tiles).
  * **At 5 pts — *Mercy* (2 AP):** A humanoid enemy below 50% HP must make a **Heart save** (scaling with your Empathy) or **surrender or flee**!
  * **At 10 pts — Mastered Perk *Open Hand* (0 AP):** When any visible non-boss, non-machine enemy drops to ≤25% HP, you can offer mercy for **0 AP** (once per enemy)—Heart save or surrender for the rest of the fight.
* **The Level 4 Fork Choice:**
  * **Option A — *Keep the Thread* (Solo/Offensive staple):** *"Your Snap costs 12 MP, and on a Bonded enemy it keeps the Bond: no Daze, the Bond holds."*
  * **Option B — *Short Thread* (Co-op/Pocket Healer):** *"Tending you give a Bonded ally within 2 tiles is ×1.4 (not ×1.2), and your Touch reaches 2 tiles."*
* **Empathy Perks:**
  * **Taut Thread (I / II):** With an Attuner in hand, your hits on an enemy Bonded to you deal **`+6%` / `+12%` more damage**.
  * **Bitter Balm (I / II):** Whenever you heal yourself or a Bonded ally, **each enemy Bonded to you takes `4%` / `8%` of the HP restored as Soul damage** at the start of its next turn.

### 3. Bugs & UI Issues Specific to Empathy / Heartreader
1. **Character Creation "Step 6: Moves" shows an empty state for Empathy builds:** Displays *"This build starts with no techniques and no magic: techniques come with points in Dexterity or Raw Power, magic with Brain Power or Will Power."* instead of listing Bonds/Tend/Mercy.
2. **Enemy Bonding rules (+3 to hit, 20% damage/healing reflection) are missing from the Empathy EPCCG entry:** Under **YOUR DOOR**, it only explains Bonding a friend, even though **Taut Thread**, **Bitter Balm**, and **Keep the Thread** right below it reference *"an enemy Bonded to you"*.
3. **Character Sheet shows `"MP: no MP focus"` at Camp before equipping the Attuner, despite Step 7 Lock-in showing `Max MP: 550`.**
4. **"Level up · pick a perk" (`Lyra Vane grows`) quick-jump pills (`Empathy ›`, `Camaraderie ›`) do not reliably scroll the nested container.**
