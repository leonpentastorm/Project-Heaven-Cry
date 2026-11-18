# Project Heaven Cry (v0.31.10) — Complete 9 Alpha Skills Playtest Report

Every single one of the **9 Alpha Skills ("Doors")**—plus a dedicated verification run on the **newly rebalanced Faith / Clean Hands / Mercy update**—has been tested in live gameplay and reported back.

---

## 1. Master Overview of All 9 Alpha Skills (+ Faith Rebalance Check)

| # | Alpha Skill | Attr → Class | Combat System ("Door") | Furthest Reached | Character & Room Code | Playstyle Rating |
|---|---|---|---|---|---|---|
| 1 | **Durability** | END → Bulwark | **Guard** (Ablative plates, Brace, Slam/Challenge) | **Stage 2, Stop 6/15** (Cleared Stage 1 Boss, 22 stops, Lvl 3 Bulwark I) | **Holdfast** (`G9U92E` · `PHC-T7E76R`) | **★★★★½** (Heroic tanking; starved for solo heal due to missing *Second Wind*) |
| 2 | **Raw Power** | STR → Breaker | **Momentum** (Charge/Hit builder → Finishers & Follow Through) | **Stage 3, Stop 12/15** (Cleared Stage 1 & Stage 2 Bosses, Gate 3 Elite, Vault! **Lvl 7 Breaker II**) | **Krag Ironhand** (`UAHQKZ` · `PHC-5ILQP8`) | **★★★★★** (Explosive melee chains; 432-dmg triple Cleaves & 426-dmg Coups) |
| 3 | **Dexterity** | AGI → Skirmisher | **Pressure** (Suppressing fire, Heat, Jams, Speed Reloads) | **Stage 1, Stop 7–8/15** (Defeated Strongroom Warden Elite, Lvl 2) | **Kaelen Vance** (`9VJF3F` · `PHC-NTL62M`) | **★★★★☆** (Tactically crisp *XCOM* gunplay; needs solo HP sustain) |
| 4 | **Ingenuity** | PER → Operative | **Shadow** (Unseen meter, Hide, 16 Shadow Work actions, Break ambush) | **Stage 1, Stop 7/15** (1 stop shy of Gate Elite, Lvl 2, 30-rd boss/medic duel) | **Kestrel Vale** (`W7JDNW` · `PHC-W47ET7`) | **★★★★☆** (Awesome guerrilla loop; punished hard by Break whiffs & 2-mag start) |
| 5 | **Brain Power** | INT → Sigilist | **Sigils** (Tile glyph words in rows → Evoke along/across, Flux & Cores) | **Stage 1, Stop 1** (Round 2, Lvl 2 via Essence of XP; 64-dmg 3-word Evoke) | **Vespera Quill** (`GDA85F` · `PHC-SM68SN`) | **★★★★☆** (Clever spatial puzzle; hit by an Evoke self-target UI footgun) |
| 6 | **Visualization** | EXP → Rigger | **Figments** (Visualizer projector summons: Double, Wall, Beast + Core upkeep) | **Stage 1, Stop 2** (Cleared Stop 1 in 2 rds, Lvl 2, 142/250 XP) | **Mira Shen** (`QD6KBR` · `PHC-WEA3QE`) | **★★★★½** (Super creative puppeteer combat; Design Traits lack tooltips) |
| 7 | **Empathy** | INS → Mender | **Bonds / Tend** (Attuner MP link, Mend/Shield/Touch, enemy reflection, Mercy) | **Stage 1, Camp / Lvl 1** + **Stage 1, Stop 10/15** (tested in combat on Seraiah) | **Lyra Vane** (`VHE6K5` · `PHC-W65NZL`) | **★★★½☆** (Great lore & enemy-Bond reflection; pure Heartreader struggles solo at 40% gun hit) |
| 8 | **Will Power** | DET → Channeler | **Outbursts** (Begin → Pump stages → Pour Feelings → Release + Residue & Strain) | **Stage 1, Stop 1** (Round 3, Lvl 2; 152-dmg Stage 4 Bolt & 10-tile Rage Wave) | **Vespera Vane** (`KUJKDS` · `PHC-TVYT66`) | **★★★★★** (Phenomenal emergent emotion-to-spell system & battlefield Residue) |
| 9a | **Faith (Pre-patch)** | VIR → Chaplain | **Prayer** (Patron Vows, Whispers, Hymns, 3-verse Canticle) | **Stage 1, Stop 10/15** (Cleared Gate Elite, Lvl 3 Chaplain I, **0 HP lost**) | **Seraiah Thorne** (`9VJF3F` · `PHC-RPD7AX`) | **★★★★★ Flavor / ★★☆☆☆ Balance** (Pre-patch Clean Hands stacked infinitely) |
| 9b | **Faith (Rebalanced v0.31.10)** | VIR → Chaplain | **Prayer + Rebalanced Clean Hands** (Capped 2/fight, 15%/25% Max HP, non-stacking) | **Stage 1, Stop 1** (Round 1 vs 3× Mite drones, verified new rules) | **Sister Mercy** (`ZV6PPU` · `PHC-KM1PNT`) | **★★★★½** (Clean Hands non-stacking fix completely solves the invulnerability loop!) |

---

## 2. Detailed Experience Report for Every Alpha Skill

### 1. Durability (`END` → `Bulwark`) — *GUARD System*
- **Build & Run**: **Holdfast** (*The Thousand-Planet frontier*, END 8 / STR 3 / AGI 3, Durability 8, Pain Threshold 4, **Level 3 Bulwark I**, Room `G9U92E`). Hand wraps + Buckler; Forks: **Provoke** (Rank 4) & **Drive** (Rank 6). Cleared all 15 stops of Stage 1 (8/8 fights won) and reached **Stage 2, Stop 6 of 15** (*The Vault's Guard*, 10/11 fights won, 2,565 dmg dealt, 20 kills).
- **How Guard Plays**:
  - Guard plates act as **9-damage ablative buffers** (`Pain Threshold 4` / Durability 8).
  - **The `N−1` Plate Retention Rule**: Non-lethal blows never spend your final plate (`4` plates soak `36` dmg on a `35`-dmg swing for `0 HP` lost, leaving `1/5` Guard). At `1/5` Guard, ordinary hits bypass Guard to HP, reserving your final plate for **Last Plate** (which intercepts a lethal blow and holds you at `1 HP` once per fight, shattering all plates).
  - **Action Loop**: `Guard` (`1 AP` → fills `5/5` plates + `+2` melee Defense) or Bulwark's `Brace (Hold the Line)` (`2 AP` → fills `5/5` plates + `+2` *all* Defense until moved/pushed). You spend 1–2 plates offensively on `Slam + Drive` (pushes 2 tiles, knocks Off Balance, and refunds 1 plate per foe knocked Off Balance!) or `Shield Bash` (`1 AP`, 1 plate), and weave Buckler follow-ups (`Shield follow` → `+1` Guard on hit).
- **Best Moment**: Surviving Round 8 at **`1 / 260 HP`** via **Last Plate** against a Combat drone burst, stepping back into the Bruiser's face, refilling `5/5` Guard, eating a 35-dmg Riposte for `0 HP`, and gaining `+1` Guard back on a Buckler tap.
- **Key Bugs**:
  1. **Durability 5 `Second Wind` (25% Max HP heal, 2 AP once/fight) is completely missing from the combat bar**—likely colliding with the Stage 1 Run Boon also named `Second Wind (+1 AP/turn)`.
  2. **`Parry` ignores Durability (`+7`) while holding Guard**, rolling `d20 + 2` (shield only) instead of `+9`, failing every check and consuming your `1/1 Reaction` so **Retort** (50% melee reflect) can never fire.
  3. **`Called Out` (Bulwark I) promises "no save" on `Challenge`**, yet targets still rolled a Heart save (`d20 7 + 2 = 9 vs TN 19`).
  4. **Guard soak tooltip mismatch**: `SHIELDS` and tile tooltips say `7` soak/plate (`28`/`35`), while `Guard` tooltip and combat math soak **`9` per plate**.

---

### 2. Raw Power (`STR` → `Breaker`) — *MOMENTUM System*
- **Build & Run**: **Krag Ironhand** (*The Adamantile Brigade*, **Level 7 · Breaker II**, STR 9 / AGI 4 / END 3, Raw Power 9 with **Rolling Start** fork, Guts 5, Intimidation 5 with `Bone Talk II`, Room `UAHQKZ`). Wielded a **Maul · RELIC ◆◆◆ (Biting)** with `Weighted head` (and looted a **Glaive · RELIC ◆◆◆** from the Stage 3 Vault). Cleared Stage 1, cleared **Stage 2 Boss (`Crawler elder`)**, cleared **Stage 3 Gate Elite (`Warped brute`)**, cleared the off-trail **Stage 3 Vault Guard (`Ork loot-keeper`)**, and reached **Stage 3, Stop 12 of 15**!
- **How Momentum Plays**:
  - Builds via plain **Hit** (`+1`; `+2` with Breaker vs Shaken) and **Charge** (with `Rolling Start`, a 2–4 tile Charge costs `0` Momentum and spikes you straight from `0` to **`5/5 FULL`**!), plus `Read the Swing` (`+1` on enemy melee miss).
  - Spends `1` on `Barrel In` / `Riposte`, or dumps all `>=2` into **Finishers**:
    - **`Coup`**: 380–426 dmg single-target execution nuke.
    - **`Break`**: 193–219 dmg + **1-round Stun + strips Armour to 0** (MVP against Stage 3 Gate Elite).
    - **`Cleave`**: Shared-roll AoE sweep (wiped 3 Guards at once for `144 × 3 = 432 dmg`).
    - **`Run Through`**: High damage + Pinned.
    - **`Launch`**: 2-AP reliable knockback + bonus collision damage.
  - Finishers chain into **Follow Through** (keeps 1 Momentum) + **Swinging 2** (next Strike/Opener/Barrel In costs 0 Momentum). Walking or taking hits decays Momentum (`0.69`/step at Guts 5), **except pre-contact 0-AP scouting does not decay Momentum**, and **`Guard` (1 AP)** prevents hit decay.
- **Best Moment**: Luring 4 ranged enemies in Stage 3 Stop 2 with `Smoke grenade + Hide + Guard` behind a barricade and **triple-killing 3 Guards in a single `Cleave` for 432 damage** to hit Level 6 (Breaker II); then clutching the Stage 3 Vault Guard at **19/233 HP** with `Threaten` + `Hit` (214) + **`Coup` (409 dmg)**.
- **Key Bugs**:
  1. **Momentum preview lies on `Charge` and Breaker Shaken hits**: Previews `Momentum 0 -> 0` on Charge even though confirming jumps straight to `5/5`.
  2. **Post-Finisher chain lock blocks plain `Hit (3 AP)` (preventing `Swinging 2`), yet allows `Class -> Barrel In (3 AP)` and `Shove (2 AP)`** to run and consume `Swinging 2`.
  3. **`Primed` Stage 2 Boss Boon (`+1 Momentum at fight start`) did not increase starting Momentum** in Stage 3 (stayed at `3/5`).
  4. **`Run Through` shows `KEEP IT / LEAVE IT IN` on a non-Reach Maul** (clicking `LEAVE IT IN` disables Confirm with `"Only a Reach weapon can be left in"`), and Maul's signature `◇ Head Down 1 AP` is grouped under `THROW · SMOKE GRENADE ×1`.

---

### 3. Dexterity (`AGI` → `Skirmisher`) — *PRESSURE, HEAT & JAMS System*
- **Build & Run**: **Kaelen Vance** (*03 Hellraiser camps*, *Witch Hunter*, AGI 5 / END 3, Dexterity 4, Vigilance 3, Level 2, Room `9VJF3F`). Kit: *Lever carbine* + *Throwing knives*. Reached **Stage 1, Stop 7–8 of 15** and defeated the off-trail **Strongroom warden** (Vault Guard Elite) in Round 4 (`1,185` dmg dealt, 4/5 fights won).
- **How Pressure & Heat Play**:
  - Every Dexterity hit adds **Pressure** pips to the target (`Pressed` → `Suppressed` → `Broken`, inflicting aim penalties and `-2 AP`).
  - Weapons build **Heat** (`-1` to hit per 2 Heat, jamming at 6 Heat or on a Nat 1), forcing tactical choices between cooling/clearing jams and **tactical vs. speed reloads** (where speed reloads physically drop your speedloader/magazine onto the map tile for post-fight Free Roam pickup!).
- **Key Bugs**:
  1. **Throwables (`Flashbang`) cannot be thrown**: Tooltip says *"Throw from the Attack tab"*, but no Throw/Flashbang button exists in `Attack`.
  2. **`Mag Dump` (4 AP, "up to 12 rounds") empties the gun and adds `+4 Heat`, but only rolls a single d20** in the combat log.
  3. **2H weapon equip lockout**: Carrying a 2H rifle with no 1H weapon in your backpack provides no `Unequip/Stow` button, locking you out of equipping a 1H focus until you buy a 1H weapon.

---

### 4. Ingenuity (`PER` → `Operative`) — *SHADOW System*
- **Build & Run**: **Kestrel Vale** (*11 The gold-coin frontier*, **Phantom** archetype: PER 7 / INT 3 / EXP 3, Ingenuity 7, Vigilance 3, Level 2, Room `W7JDNW`). Traits: **Ghost Soldier** (`+50%` first Ambush dmg, `-2 AP` next turn when stealth breaks) + **Live to Fight Another Day** (`0 AP` Disengage once/turn + `+2` Defense). Reached **Stage 1, Stop 7 of 15** (3/4 fights won) before falling in Round 30 to a self-healing **Heart adept**.
- **How Shadow Plays**:
  - Break line of sight (or throw a **Smoke grenade**), pay `1 AP` to **Hide** (`First Shade` → `+1 Shadow`), and build Shadow up to `3` via ending turns Hidden (`+1`), moving cover-to-cover while Hidden (`+1`), or unseen kills (`Ghost Kill` `+1`).
  - Spend `0–1 Shadow` on **16 Shadow Work/Mark actions** (`Disable` to stun drones, `Tag` `+1` hit, `Read Intent`, `Open Seam`, `Foul the Action`, `Decoy`, `Rig`) **without breaking stealth**, or spend the **entire meter on a `Break` ambush** (turning a 23-dmg *Aimed Shot* into **67–132 dmg**, or an empty-gun pistol-whip into an **86-dmg crit**!).
- **Best Moment**: Beating an armored Gun drone in Fight 3 with **zero bullets left** by sneaking behind a barricade, stunning it with `Disable`, marking it with `Tag`, and cashing in 2 Shadow on a **Break Strike (weapon's butt) for 86 crit damage**.
- **Key Bugs**:
  1. **Ingenuity's Level-Up screen is completely missing its `FORKS` section** (even though EPCCG lists sealed forks at Ranks 4 and 6).
  2. **`Break ✓` damage preview lies on `Strike (weapon's butt)`** (previews `12–18 dmg` while dealing `59–86 dmg`), and the `Break ✓` toggle stays visually pressed at `0 Shadow`.
  3. **`Ghost Kill` triggers on melee kills in plain sight**, and the Shadow tab header stays `SHADOW · UNSEEN` even when `Eye: Seen`.

---

### 5. Brain Power (`INT` → `Sigilist`) — *SIGILS System*
- **Build & Run**: **Vespera Quill** (*09 The scholar halls*, **Savant** archetype: INT 7 / EXP 4 / PER 3, Brain Power 7, Rumination 3, **Level 2**, Room `GDA85F`). Perks: **Running Hand I & II** (first glyph/turn `-0.5 AP` & `0 Flux`), **Second Clause I**, **Footnote I**; Boon: **Quick Chalk** (first glyph/fight `-1 AP`). Kit: *Evoker* (`10/10` charge) + 5 spare Standard cores + *Drifter revolver*. Words learned: `SPARK` (1 ch, 15 dmg), `SEEK` (2 ch, straight bolt range 11), `SHOCK` (2 ch, 30 dmg, ignores half cover), `SPREAD` (2 ch, 5×5 AoE). Tested in **Stage 1, Stop 1** (Round 2).
- **How Sigils Play**:
  - You draw glyph words tile-by-tile (`0.7 AP` per glyph, `0 AP` for the first glyph with *Quick Chalk* + *Running Hand II*) while stepping across the grid (`1 AP/tile`) to form a straight 2–4 word Line (`E9–F9–G9`: `SPARK · SPARK · SEEK`), managing Evoker core charge (`10/10`) and **Flux** (`0/6`).
  - Then you **Evoke (`1 AP`)** either **along** the Line from an end (`←`/`→`) or **across** it from a side (`↑`/`↓`). Once `Evoke` mode is clicked, the grid renders clear directional arrows (`←`, `→`, `↑`, `↓`, `×` on middle tiles) and previews `repeats ×0.9`, AP/Charge/Flux deltas, and range (`11`).
- **Key Bugs**:
  1. **Critical — Evoke self-target footgun when an enemy stands on your Sigil Line**: Standing on end glyph `E9` of `E9–F9–G9` with a Trooper standing directly on `F9`, clicking `Evoke (1 AP)` → clicking `E9` immediately armed self-target (`Confirm` enabled). Clicking the Trooper on `F9` showed `"Out of the area: pick a tinted tile, or yourself"` without disabling `Confirm`, causing `Confirm` to blast Vespera for **64 self-damage**!
  2. **Flux cap contradiction (`7` vs `0/6`)**: With `Rumination 3`, the Sigils header says `"your Flux limit is 7"`, but the meter and `Vent Flux` button hard-cap at **`0 / 6`**.
  3. **`Sigil Savant` trait is completely non-functional in Survival**: Both `Muscle Memory` and `Practise` are disabled with `"Sigil Savant works in a story, not in a run"`—making the Savant archetype's signature trait a dead pick in Survival.

---

### 6. Visualization (`EXP` → `Rigger`) — *FIGMENTS System*
- **Build & Run**: **Mira Shen** (*08 The southern sects*, **Illusionist** archetype: EXP 7 / PER 3 / INT 3 / END 2, Visualization 7, Charisma 3, Improvisation 1, **Level 2**, Room `QD6KBR`). Traits: **Southern Fist** (`+1 AP/turn` & `+20%` unarmed dmg with Hand wraps) + **Born Performer** (`+20%` combat XP). Forks: **Wall** (Viz 4), **Beast** (Viz 6), **Eye** (Viz 7). Perks: **Many-Eyed Dream II** (`+6%` Figment dmg per held Figment), **Wake of the Kill I** (`+1 AP` on Figment kill). Custom Figments: **Boom Double** (`Double + Hollow, Volatile`, 2 ch, 12 HP), **Thorn Wall** (`Wall + Armoured, Barbed`, 5 ch, 72 HP), **Razor Beast** (`Beast + Swift, Keen`, 6 ch, 36 HP). Cleared **Stage 1, Stop 1** in 2 rounds (`142/250 XP`).
- **How Figments Play**:
  - Figments share **your AP** (`no turn of its own: the AP are yours`), cost **Visualizer charge** up front (`10` per core, reloaded via `Load the Visualizer` for `2 AP + 1 spare core`) plus **1 charge/turn upkeep** per active Figment.
  - You pilot them directly (`Move`, `Strike 2 AP`, `Pounce 3 AP`, `Press 1 AP`), reposition them (`Redraw 1 AP`), reclaim their charge (`Cash in 1 AP`), or dismiss them (`Let go 0 AP`). When a Figment is destroyed, your focus **Snaps (`-1 AP` next turn)**.
  - **Balance**: **Razor Beast** is an early-game monster (`+9 to hit`, **47–50 dmg** per 2-AP Strike, one-shotting Level 2 Scuttlers and refunding `+1 AP` via *Wake of the Kill*), and **Boom Double** (`2 charge`) fooled all 4 Scuttlers (`Scuttler 2 attacks Mira Shen and finds a Double`) and blew up two flankers when destroyed via **Volatile**!
- **Key Bugs**:
  1. **All 10 Figment Design Traits (`Armoured`, `Swift`, `Loud`, `Volatile`, `Tethered`, `Mirror`, `Barbed`, `Lasting`, `Keen`, `Hollow`) have zero tooltips or descriptions** in `+ NEW DESIGN`—you build custom Figments completely blind.
  2. **Victory Scoreboard credits `0 damage` and `0 kills` to the player**: All Figment attacks and Volatile explosions are credited to `"No one's turn: 97 damage to foes"`, leaving `Mira Shen · DEALT 0 · KILLS 0`.
  3. **Volatile explosion damage and kills are missing from the Combat Log** (log jumps straight from `Boom Double is destroyed` to `Scuttler 3 fell`, and Mira Shen silently lost 22 HP).
  4. **Visualization Forks picked at Camp `Level up` did not persist into the Run `MAGIC` tab**, and `Load the Visualizer` displayed `1 spare cores` despite holding `Standard mana core ×5` in the backpack.

---

### 7. Empathy (`INS` → `Mender`) — *BONDS & TEND System*
- **Build & Run**: **Lyra Vane** (*07 Arkvelton*, **Heartreader** archetype: INS 7 / DET 5, Empathy 7, Camaraderie 3, Trait: **Daggerfall Veteran**, Room `VHE6K5`) + live combat testing on **Seraiah Thorne** (`Attuner` off-hand, Room `9VJF3F`).
- **How Bonds & Tend Play**:
  - Equipping an **Attuner** unlocks your MP pool (**550 Max MP** at INS 7 / DET 5, with **`×2.48` Healing Given** and **35% cheaper Soul MP costs**).
  - **Bonds** link you to an ally or an **enemy**:
    - On allies/self: **Mend** or **Shield** at sight range, or **Touch** when adjacent (`×1.4` within 2 tiles with *Short Thread*).
    - On **enemies**: Grants **`+3 to hit`** against the Bonded foe, reflects **20% of damage/healing**, boosts your attack damage by `+6% / +12%` (**Taut Thread I/II**), deals **`4% / 8%` of all HP you restore as Soul damage** to every Bonded enemy (**Bitter Balm I/II**), and with the **Keep the Thread** fork (Rank 4), **Snap** (12 MP) hits a Bonded enemy *without* breaking the Bond!
    - **Non-Lethal Empathy Win Conditions**: **Feel Their Pain** (Empathy 3) reveals all enemy HP/morale within 12 tiles; **Mercy** (Empathy 5, `2 AP`) forces a humanoid enemy below 50% HP to pass a Heart save or **surrender/flee**; **Open Hand** (Empathy 10, `0 AP`) forces non-boss/non-machine enemies at ≤25% HP to surrender for `0 AP`.
- **Solo Viability & Bugs**:
  - Going pure INS 7 / DET 5 leaves your physical gun accuracy at **40% (`-2` Dex)**, making enemy Bonding (`+3` to hit), *Keep the Thread*, *Bitter Balm*, and *Mercy* mandatory in solo runs; meanwhile, **Camaraderie 3's perks (*Soulmate*, *Rally Cry*) do nothing solo**.
  - **Bugs**: Character Creation `Step 6: Moves` displays *"This build starts with no techniques and no magic"* for Empathy 7 builds instead of listing Bonds/Tend/Mercy; the Empathy EPCCG `?` modal never explains baseline enemy-Bonding (`+3` hit / 20% reflect) even though its perks refer to *"an enemy Bonded to you"*; and the `Empathy ›` quick-jump pill in `Level up` doesn't scroll the nested container.

---

### 8. Will Power (`DET` → `Channeler`) — *OUTBURSTS, FEELINGS & STRAIN System*
- **Build & Run**: **Vespera Vane** (*07 Arkvelton*, **Unbroken** archetype: DET 7 / INS 5, Will Power 7, Composure 3, **Level 2**, Room `KUJKDS`). Traits: **Upper-Touched** (`-20%` Outburst MP cost) + **Hollow Heart** (`+10%` Outburst dmg; Mana Short doesn't Stun; Strain downing is stable). Perks: **Clenched Heart II** (*Overdraw*: `+2` stages once/turn, first Overdraw `0 Strain`), **Resonance I** (`+4%` output per prior Release), **Flat Line I** (`-2 Strain`/turn when unhurt); Boon: **Hot Blood**. Tested across 3 rounds of **Stage 1, Stop 1**.
- **How Outbursts Play**:
  - **Custom Outburst Builder**: You build custom spells by combining **School** (*Damage, Buff, Control, Status*), **Tone** (*Raw* Soul dmg ignoring armor, or Elemental tones at Lore Master 2), **Shape/Modules** (*Bolt, Wave cone, Blast, Wall, Chain, Focus, Move, Linger, Split*), and **Feelings**.
  - **Combat Loop (`Begin` → `Pump` / `Feelings` → `Release`)**:
    - **Begin (2 AP)** lights the **`YOUR HEART`** dashboard at Stage 0 (`×0.8`, `+1 Strain`).
    - **Pump / Overdraw** climbs stages `0 → 1 → 2 → 3 → 4`, or if held across turns, automatically swells (`+1 stage` at turn start).
    - **Pouring in Feelings & Battlefield Residue**: Pouring **Rage (`+0.5`)** or **Love (`+0.3`)** boosts the multiplier and paints **Residue** across the map on Release! In Round 1, a Stage 4 `Heartshatter Bolt + Rage` (`×1.9`) dealt **152 Soul damage** for just `32 MP` and `2/7 Strain`; in Round 2, a Stage 2 `Heart Wave + Rage` hurled two Gutter rats across the room and painted a **10-tile cone of burning Rage Residue** (`5 Soul dmg/turn, 2 rounds`).
    - **Dynamic Mid-Combat Feeling Unlocks**: When a rat bit Vespera for 4 damage in Round 2, the log announced: *"Vespera Vane has felt Spite (hurt by Gutter rat 3): it can be poured in now"*, immediately unlocking **`Spite +0.2 (+0.5 vs whoever last hurt you)`** in the Heart panel!
- **Key Bugs**:
  1. **`1 FREE PUMP` badge does not update to `0 FREE PUMPS` in Round 1** after consuming Will Power 7's free first Pump, and the **Feeling buttons (`Rage +0.5`, `Love +0.3`) continue displaying `0 AP · 2 MP`** even when clicking them actually spends **`1 AP · 5 MP`**.
  2. **Duplicate `Begin / Snap` toggle rows** render stacked on top of each other in `Chosen action`.
  3. **`STRAIN` meter is hidden inside the collapsed `+2` overflow button** at fight start until you gain at least 1 Strain.
  4. **Elemental Tone requirement mismatch** in Step 6 (`"Needs Lore Master 1 (you have 1). Elemental tones open at Lore Master 2"`).

---

### 9. Faith (`VIR` → `Chaplain`) — *PRAYER System & v0.31.10 Clean Hands Rebalance Verification*
- **Builds Tested**:
  - **Pre-patch Run**: **Seraiah Thorne** (VIR 7, **Level 3 Chaplain I**, Room `9VJF3F`), reached **Stage 1, Stop 10 of 15** with **0 HP damage taken**.
  - **Rebalanced v0.31.10 Run**: **Sister Mercy** (*04 Lumeri cloisters*, VIR 7 / END 3 / INS 3, Faith 7, Conscience 3, Patron: **Holy Father Nerukhan**, Perks: **Clean Hands I**, **Unbroken Litany I & II**, **Sinner's Due I**, Boon: **Vigil**, Room `ZV6PPU`).
- **What Changed in the v0.31.10 Rebalance (Verified)**:
  1. **Clean Hands is now capped & non-stacking**:
     - **Clean Hands I (Conscience 3)** grants a shield worth **15% of Max HP** (25% at Tier II), **capped at 2 times per fight**, and explicitly states: ***"a new one does not add to a shield you hold (the larger stands)."***
     - **Impact**: This completely fixes the pre-patch invulnerability exploit where sparing enemies stacked `+24–29` shields infinitely on top of *Saint's Shield*. Now *Saint's Shield* (`34 × Blessing power`, every 3 rounds at Faith 7) is your main big barrier, and *Clean Hands* acts as a balanced mid-fight shield refresh after your existing shield is broken.
  2. **Conscience Cross-Scaling ("Feeds Faith")**: Each point of Conscience gives `+10% to every shield received` (`×1.3` at Conscience 3) and **`+7% to the shields your prayers give`** (`+21%` at Conscience 3).
  3. **UX Edge Case Found on Bot Non-Mercyability**: In Fight 1 (`A swarm`, **3× robotic Mite drones**), the Round 1 **Swear a Vow** prompt still offered **`Mercy ("I spare who yields")`** as the #2 vow option even though 100% of the enemies in the encounter were mechanical Mite drones! Offering the *Mercy* vow in an all-robot fight should be hidden or flagged so players don't walk into an unfulfillable vow.

---

## 3. Top Cross-Cutting Priorities to Fix Next

1. **Allow Self-Targeting with Stim Injectors in Combat (Universal Solo Blocker)**:
   - Currently, `Utility -> Stim an ally (1–2 AP)` and `Throw a stim (1 AP)` both reject clicking your own tile (`"Nobody there"`), and `Backpack` has no `Use` button. Solo characters across multiple runs died with 2–5 Stims in their pockets.
2. **Surface Skill Perk Steps & Forks at Character Creation (or Auto-Prompt Before Stop 1)**:
   - A character starting with `7` and `3` in their skills begins with **4 unspent Perk Steps (and a Fork at 4)**, but Character Creation Steps 1–7 never prompt you to pick them—you have to notice the `Level up · pick a perk` button on the Camp sidebar before clicking `Start the run`.
3. **Fix the 4 High-Impact Playstyle Bugs**:
   - **Durability**: Restore Durability 5's **`Second Wind` (25% HP heal)** to the combat bar (fix the name collision with the `Second Wind` +1 AP boon) and make `Parry` use Durability (`+7`) while holding Guard.
   - **Brain Power**: Fix **Evoke self-targeting** when clicking your end glyph while an enemy stands on the Sigil Line (`E9–F9–G9`).
   - **Visualization**: Add **tooltips/descriptions to the 10 Figment Design Traits** in `+ NEW DESIGN` and credit Figment damage/kills to the player on the Victory Scoreboard.
   - **Dexterity**: Add the missing **Throw / Flashbang** action to the `Attack` tab and fix `Mag Dump` rolling only 1 d20.
4. **Clean Up Duplicated Validation Text**:
   - Across all 9 playstyles, every disabled/blocked reason in `Chosen action` renders twice back-to-back (`"Needs 2 AP. · Needs 2 AP."`).
