# Outburst 2.0: the heart (accepted, 8 Nov 2026)

Soul magic, rules revision 1.5. Accepted by Leon ("All of these suggestions are fantastic, implement them all") with his
caveats folded in (section 11). Sigil magic (rules 1.4) owns **space**: placement, prepared Lines, team setups and
precision. Outburst owns **time and the body**: you fill your heart over turns, choose the moment to let go, and pay in
blood. Every rule below serves that split. **All numbers are provisional** until the damage balance pass that follows
this work (Leon: "after Outburst 2.0 is in we will start balancing damage numbers").

## Why (playtest findings, 8 Nov 2026)

- Maxed Soul fires about 85 damage per Outburst at **1 AP** (cast AP = max(1, ceil(3 − 0.5 × Empathy))): six casts a turn.
- Mana Short is a save (d20 + Will Power vs 10 + 2 × excess): at +9 you pass almost anything, so Strain stops mattering.
- A second school shares the first school's option slot, so it can only double an effect, never add a different one.
- No elemental Outbursts, though an advanced class is called Storm Hand.
- Storm Hand's Charged by Death needs kills; its melee carries no element effect.
- The UI can't tell an area spell from a single bolt; reach and area are not shown.
- Class resources (ammo, Evoker charge, Flux, MP, Strain, Momentum, Charges…) are a 10 px line nobody sees.

## 1. The heart cycle: Begin, Pump, Release

- **Begin (2 AP):** open a ready design and start holding it at **stage 0**. +1 Strain.
- **Pump (1 AP each):** +1 stage, up to stage 4. Every AP you don't spend moving or shooting can go into the heart.
- **Release (1 AP):** fire it at the current stage. Stage multipliers: **0 → ×0.6, 1 → ×1, 2 → ×1.4, 3 → ×1.8, 4 → ×2.2**.
- **Holding past your turn** keeps the stage. The start of your next turn adds **+1 stage for free (the swell)** and
  +1 Strain (+2 in Flooded air).
- **Empathy (Leon's caveat):** **1 free Pump per round from Empathy 3, a second from Empathy 7** (PROVISIONAL; flagged
  as strong with the swell: a held heart can gain 2 stages a turn for Strain alone). Empathy no longer reduces AP; it
  still sets ready designs.
- **Swift** module: Begin costs 1 AP.
- A snap cast (Begin, Release) is 3 AP at ×0.6. A full turn (Begin, Pump × 3, Release) is ×1.8. Begin one turn,
  carry it, swell + Pump × 2 + Release next turn reaches ×2.2.
- Pumping must **feel fantastic** (Leon): every Pump gets its own heartbeat effect and sound, rising in pitch and
  intensity with the stage (section 9).

## 2. Damage

- Damage school base **20**; Soul multiplier **1 + 0.05 × (Determination − 1) + 0.1 × Will Power** (2.45 maxed).
- Maxed: snap 29, a full turn's stage 3 88, a held stage 4 108. (Long rifle 120 a shot every turn; fixed Sigil FIRE
  114.) Outburst trades damage per turn for one chosen, unblockable big moment.
- **Raw** Outbursts still ignore armour, and a heart burst still Downs, never kills.

## 3. Strain, Mana Short and calming the heart

- Strain limit **3 + Will Power ÷ 2**. +1 per Begin and per held turn (+2 in Flooded air).
- **Over the limit, no roll:** each point over burns your heart for **8 true damage** at the end of your turn.
- **Mana Short is automatic at 3 over:** Stunned for a turn, and a held Outburst goes off wild (random target, its
  element's stage-1 rider on your own tile). Will Power raises the limit; it no longer rolls you out of trouble.
- **No vent (Leon: "feels like ripping off Sigil").** Strain falls by **calming the heart**, through what the body does,
  so fighting mages and support mages each have their own way:
  1. **A turn of stillness:** end a turn in which you didn't Begin or Pump: −1 Strain (as today).
  2. **Fighting it out:** your first weapon attack each turn (melee or shot): −1 Strain. The blood finds another way out.
  3. **Tending others:** your first heal, stim, shield or cleanse given to an ally each turn: −1 Strain.
  4. **Let it go:** drop a held Outburst without releasing it: Strain falls by its stage (the built power is lost; a
     harmless violet sigh, the mana meter +1). Free action, on your turn.
  5. **Breathe (2 AP):** −1 Strain and your next Begin this fight costs +1 Strain (a debt; the heart remembers).
  Crystallise still turns the air into a core; Syphon still draws air into MP.

## 4. Second school: a rider

A design has a **primary school** (full effect) and, from Will Power 5, a **secondary school** with its **own option**,
at **half strength** as a rider. They must be different schools. Damage + Control (push) = damage then a 1-tile push;
Buff (heal) + Status (Inspired) = heal then Inspired 1 round; Control (Pinned) + Damage = Pinned + half damage.
The workshop shows two separate option rows; the verdict shows both effects with numbers.

## 5. Elements (tones)

The same element ids, riders and effects as Sigil 1.4 (`sigils.json` `elements`), in the Soul style: violet heat
blooming into the element's colour.

- A design's **tone**: Raw (default), Fire, Storm, Frost, Stone, Gale, Acid. Tones are learned like modules (one at
  Visualization 1, more from teachers or plates); a tone takes no module slot.
- **Raw:** Soul damage, ignores armour, heart-burst rules, no rider. **An element:** Elemental damage (armour counts
  half) and a rider that grows with the stage:

| Element | Stage 1 | Stage 2–3 | Stage 4 |
|---|---|---|---|
| Fire | — | Burning 2 rounds | Burning spreads to adjacent foes; the ground burns |
| Storm | Ignores half cover | Chains to 1 more within 2 tiles at half | 2 chains, and Shaken |
| Frost | Slowed (save) | Slowed (no save) | Pinned 1 round |
| Stone | Armour counts full, +10 | Prone (save) | Rubble around the target |
| Gale | Push 2 | Push 3 | Pushes everyone within 1 |
| Acid | Corroded | Corroded (no save) | Defense −2 more |

- Flooded air: riders count one stage higher; Thin air: one lower.

## 6. Holding is gameplay

1. **Aura:** holding an elemental Outburst leaks it: enemies adjacent to you at the start of your turn take a stage-1
   tick (5 damage + the stage-1 rider). Holding next to enemies is a threat.
2. **Heart Overwatch:** while holding, you may **release as a reaction** when an enemy enters your design's reach (uses
   your reaction, at the stage reached).
3. **Resonance:** two allies who release in the same round give each other +0.2 on the stage multiplier.
4. **Feeding:** 1 AP to absorb a glyph on your own tile into your held Outburst: +1 stage, the glyph is gone (the one
   bridge between the two magics).

## 7. Shapes (forms) and showing them

| Form | Area | How |
|---|---|---|
| Bolt | One target | default |
| Wave | 3-tile cone from you | module |
| Burst | Radius 1 around the target (Size: radius 2) | module |
| Aura | Radius 1 around you, all at once | module |
| Lance | A 4-tile line that pierces | module |

Design cards carry a shape icon and read like "WAVE · cone 3 · reach 4 · Fire". On the grid, before Release (and while
holding): the reach ring, the tinted area, everyone affected (allies and enemies marked) with expected numbers and
saves, and this stage's rider; the same preview standard as Sigil 1.4 (spec section "What the player must see").

## 8. Storm Hand

1. **Charged by Battle:** each **melee hit** gives 1 Charge (max 3), not each kill (Leon: "need to be ATTACK").
2. **Gauntlet Infusion:** melee hits carry the infused element's **stage-1 rider** with its effect and sound (Fire:
   Burning 1 round on a crit, else +5; Shock: chains to one adjacent enemy for half; Freeze: Slowed (save); Spark:
   +1 AP on a kill), plus the existing +10 Elemental for 5 MP.
3. **Discharge:** spend all Charges with a melee hit: the element's stage-N rider (N = Charges) and 20 per Charge to
   everyone adjacent, with full effects and screen shake.

## 9. Effects and sounds

- **Pump:** a heartbeat thump and a violet ring pulse from the chest; pitch and brightness rise with each stage; at
  stage 4 the screen edge throbs. **Begin:** a breath in and the heart lights. **Swell:** a slow beat at turn start.
- **Holding:** the token's heart glows by stage; an elemental aura ring (embers, static, frost mist, dust, wind, acid
  drip) around the token; aura ticks flash on adjacent enemies.
- **Release:** per form (bolt, wave, burst, aura, lance), Soul style per element (from the Sigil 1.4 element module,
  family 'soul'). **Heart Overwatch:** a sharp gasp and the release snaps out of turn. **Resonance:** two hearts beat
  in sync, a linked ring. **Feeding:** the glyph's cyan squares are drawn into the violet heart. **Mana Short:** the
  heartbeat stops, the screen desaturates, silence, then a crack. **Calming:** a long exhale and the glow cools.

## 10. Resources on screen (all classes)

Leon: testers kept asking "where does it say I need to reload my Sigil core? Oh, it's that 10 px line." Every class
resource shows **below the HP bar** in the combat You card, the area-map HUD and the turn cut-in, large and labelled:
ammo (loaded / spare, the ammo type), Evoker charge and spare cores, Flux, MP, Strain (with its limit), the held
Outburst (design, stage, tone), Momentum, Charges, Devotion, Guard, Heat, and any other class or perk resource the
runtime tracks. Each is a bar or pips with its name in words and a colour per CLAUDE.md, and a clear warning state
(EMPTY, RELOAD, OVERLOAD SOON, OVER THE LIMIT).

## 11. Leon's caveats (8 Nov 2026)

1. Empathy gives a free Pump **per round**, not per combat (section 1).
2. **No venting**: calming the heart, with different trade-offs from Flux (section 3).
3. **Resources below health**, readable, for every class (section 10).
4. Pump and the holding gameplay need effects and sounds that make them feel fantastic (sections 1, 6, 9).
5. Re-derive every class and advanced class affected (Channeler, Heartfed, Heartbinder, Vessel, Twinbound, Devoted,
   Storm Hand, Circuit Mage's Soul side, and the Soul perks such as Heart Overload and Resonance), and ask Leon when
   something looks off.
6. Damage numbers get their own balance pass afterwards.
