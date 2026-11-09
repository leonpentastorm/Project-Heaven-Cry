# Outburst 4.0: remembered spells, felt live (spec, 9 Nov 2026)

Status: **accepted direction (Leon, 9 Nov 2026). Rules revision 1.8.** Every number here is provisional, for the
damage balance pass (`docs/design/balance-targets.md`). Built on rules 1.5 (Outburst 2.0,
`docs/design/outburst-2.0-proposal.md`), which this keeps and extends.

## 0. Why

Playtest verdict:

- Sigil players love their magic.
- Soul players found Outburst unique, but at low level they "can't do shit": three sessions casting magic bolt 1 over
  and over.
- Its modules felt less fun than Sigil's words.
- In the Proving Ground, testers loved the modules and wanted many more.

**The split stays (Leon).**

| Magic | How the world hears it | Lives in |
|---|---|---|
| Sigil | you **show** it: you draw, and the world obeys the drawing | the map |
| Outburst | you **hold** it: you remember a spell and feel it, and the world obeys the heart | the caster |

**Rules 1.8 adds two things:**

1. **Feelings**, poured in live while you pump: *how* the remembered spell feels this time.
2. **Many more modules**, with **guaranteed ways to unlock** them: *what* you can remember.

## 1. What stays from 1.5

- **Designs**, the remembered spells: a school, modules, a tone and a shape, built in the workshop.
- **Begin, Pump and Release**, the stage table (×0.6 / 1 / 1.4 / 1.8 / 2.2), holding and the swell.
- **Strain** and its burn, the Mana Short, and the calming ways (stillness, fighting, tending, Let go, Steady).
- **Tones and their riders**, Heart Overwatch, Resonance (players' side) and Feed.
- **Soul classes and perks**, re-derived where feelings or new modules touch them (section 9).

## 2. Visualization leaves Soul magic (Leon: "it's a Mind skill")

- **Tones** are no longer gated by Visualization. You get one tone at **Lore Master 1**, the occult library, with your
  starting design.
- **Outburst tones no longer use the Elemental multiplier**, which comes from Expression and Visualization. A toned
  Outburst uses the Soul multiplier only. Sigil keeps the Elemental multiplier.
- **Clean up:**
  - remove Visualization from every Soul rule, design check, module gate and class text;
  - in code: `character.ts` (tone at creation, `designError`), `magic.ts` (`elemMult` on Outbursts);
  - in the spec: items 506 and 1228 and the Soul sections;
  - in data: `soul_modules.json`, `classes.json`.
- Visualization stays a Mind (Expression) skill: Sigil forms, the Elemental multiplier, the Trickster.

## 3. Feelings

### 3.1 Pouring one in

- While you hold an Outburst, each **Pump** (1 AP, or a free Pump) is either:
  - **plain**: +1 stage, as in 1.5; or
  - **a feeling pump**: +1 stage, plus one feeling you know.
- A feeling pump has **its own step on the multiplier** instead of the plain step (the table in 3.3). It also adds that
  feeling's behaviour to the spell.
- Up to 4 pumps, as now. Feelings stack with themselves: Rage, Rage, Rage is three Rage steps. They also **combine
  freely** with each other, with the tone and with the modules, the riders working by their own rules. Example:
  "lightning love" heals the allies it touches **and** chains by Storm's chain rule, healing along the chain.
- **Behaviour changes are real.** A Damage design with Love poured in also heals the allies inside its shape. The spell
  "now does something else" (section 7).
- **Residue** (Leon: yes). On Release, the **strongest feeling poured in** (the most pumps; ties go to the latest)
  leaves residue on every tile the spell touched, for 2 rounds:
  - **Helping feelings** (Love, Hope, Belonging, Calm, Relief, Mercy) help allies who stand there.
  - **Harming feelings** hurt or hinder anyone who stands there.
  - **Neutral feelings** do what their row says.
- **Revert Pump** (0 AP): undoes your **last pump this turn**, refunding its AP and any Strain it added. It's for
  misclicks. It can't undo the swell, and can't undo past the start of your turn.

### 3.2 Learning them: you feel it first

- **A feeling unlocks the first time its trigger happens to you** (table 3.3). The engine detects every trigger. The
  Narrator may also grant one at a story moment, as a bonus.
- **Every Soul caster starts with 2 feelings** of their choice at creation.
- **Unlocks are permanent.** A log line and a small card say so: "You have felt Grief. You can pour it in now."

### 3.3 The 25 feelings (Leon: "all of them, we are going BIG")

The **Step** column is the multiplier step a feeling pump adds, instead of the plain pump's +0.4.

| # | Feeling | Unlocked when the engine sees… | Step | Poured in, it… | Residue |
|---|---|---|---|---|---|
| 1 | **Rage** | you take heavy damage in one hit (25% of max HP or more) | +0.5 | hits harder; +1 Strain to you | harms: 5 a turn |
| 2 | **Grief** | an ally goes Down or dies | +0.3 | targets are Slowed | harms: Slowed |
| 3 | **Fear** | a fight with an Elite or Boss starts, or you're made Afraid | +0.3 | pushes 1 and Shakes (save) | harms: Shaken on entry (save) |
| 4 | **Love** | you heal or shield an ally | +0.3 | the shape also heals allies inside it, by the spell's power × 0.5 | helps: heal 5 a turn |
| 5 | **Joy** | you roll a natural 20 | +0.3 | chains to one more target within 2, at half | helps: +1 to rolls |
| 6 | **Calm** | you end a turn Steady, or with 0 Strain | +0.3 | ignores cover; the hit can't miss | helps: Strain −1 on entry |
| 7 | **Spite** | an enemy damages you | +0.4; +0.8 against whoever last hurt you | revenge | harms: 5 to whoever hurt you last |
| 8 | **Shame** | you roll a natural 1, or a vow breaks | +0.6 | 5 damage to you on release | harms: −1 to rolls |
| 9 | **Pride** | you kill an Elite or Boss | +0.2 a stage reached | rewards big casts | none |
| 10 | **Despair** | you drop below a quarter of your HP | +0.1 per 10% of HP you're missing | stronger near death | harms: Weakened |
| 11 | **Hope** | you get back up from Downed | +0.3 | its targets lose Fear and Shaken; the next ally roll is +2 | helps: +2 to saves |
| 12 | **Mercy** | you accept a surrender | +0.2 | Downs instead of killing; a target at a quarter HP or less makes a Heart save or surrenders | helps: stabilise the Downed |
| 13 | **Cruelty** | you hit someone Downed or helpless | +0.4 | adds Bleeding; Bleeding spreads to an adjacent enemy | harms: Bleeding |
| 14 | **Loneliness** | you're the last of your side standing | +0.2, +0.3 more with no ally within 3 | the lone caster's power | none |
| 15 | **Belonging** | 3 or more allies within 2 of you | +0.1 per ally within 3 (up to +0.5); counts as Resonance for allies who release this round | togetherness | helps: +1 Defense |
| 16 | **Dread** | something Hidden spots you, or a trap goes off on you | +0.3 | its targets lose their reaction and can't see Hidden things for a round | harms: no reactions |
| 17 | **Awe** | a Miracle or Grand form happens in your sight | +0.3 | its targets lose 1 AP next turn | none |
| 18 | **Longing** | a scene apart from your linked ally or your patron (or Narrator) | +0.3 | +2 reach; pulls targets 1 toward you | none |
| 19 | **Relief** | a fight ends with no ally Down | +0.2 | this cast adds no Strain | helps: Strain −1 on entry |
| 20 | **Contempt** | an enemy surrenders to you or flees | +0.3 | its targets take −2 to attack you | harms: −2 to attacks |
| 21 | **Guilt** | you damage an ally | +0.3 | heals the ally hurt last by 10 × stage; 5 damage to you | helps: heal 5 a turn |
| 22 | **Jealousy** | an ally kills a target you damaged this turn | +0.3 | steals one buff or shield from the target to you | none |
| 23 | **Wonder** | a secret revealed or a new zone found (or Narrator) | +0.2 | reveals Hidden things and traps in its area | helps: spot Hidden things |
| 24 | **Defiance** | you resist an Overreach, or pass a save against Fear | +0.3 | can't be resisted (no saves); your next save auto-passes | helps: immune to Fear |
| 25 | **Abandon** | you indulge an Overreach | +0.8 | +2 Strain; if you're already over the limit, it goes off wild | harms: random condition |

*Abandon is "Surrender" in the brainstorm, renamed because "surrender" is already a combat word.*

## 4. Modules: many more, gated by Soul skills, the strongest by advanced class

- **Today's 16:** move, homing, swift, ether, right, left, time, inverse, size, random, impact, at_once, and the shapes
  wave, burst, aura, lance.
- **New, for everyone** (behaviour, not numbers):

  | Module | What it does |
  |---|---|
  | Split | two targets |
  | Ricochet | bounces off walls and cover |
  | Fuse | lands, and goes off at your next turn or when stepped on |
  | Return | out and back, hitting twice |
  | Volley | 3 small bolts |
  | Bloom | +1 radius a stage |
  | Anchor | Pins |
  | Lure | pulls 2 |
  | Shell | a shield for you as it leaves |
  | Linger | a 2-round field |
  | Quiet | half the Strain, ×0.8 |
  | Silent | doesn't reveal you when Hidden |
  | Thread | links two allies; the next heal on one heals both |

- **Gated to advanced and hybrid classes with Soul (Leon).** These enable whole new play, so they are what an advanced
  Soul class gets. The classes are on the roadmap (`docs/design/class-roster-rev3-proposal.md` section 7); the
  modules unlock when those batches go live.

  | Module | What it does | Class |
  |---|---|---|
  | Echo | casts again next turn at half | Heartfed (Determination²) |
  | Cascade | +1 target a stage | Heartfed (Determination²) |
  | Tether | a beam between you and an ally that hits what crosses it | Heartbinder (Insight²) |
  | Siphon | steals MP | Hexer (Expression + Insight) |
  | Phantom | passes through cover | Shade (Perception + Determination) |
  | Orbit | circles you for 2 rounds, hitting what comes near | Banner Dancer (Agility + Insight) |
  | Volatile | a kill makes the target explode | Storm Hand (Strength + Determination) |
  | Bastion | Shell on every ally in the shape | Adamantile Knight (Endurance + Virtue) |
  | Judgement-mark | the target takes +25% from all sources for a round | Inquisitor (Perception + Virtue) |
  | Halo | the Release also blesses with a Whisper effect | Saint (Virtue²) |

  The five without a home today (Heartbinder, Hexer, Shade, Banner Dancer, Inquisitor) wait for their classes.

- **Gating by Soul skill** (never Visualization):

  | Skill | Gates |
  |---|---|
  | Lore Master | structure and the strange: shapes, time, ether, Phantom-like, Fuse, Return, Ricochet |
  | Will Power | power and Strain: impact, size, Bloom, Volley, Quiet |
  | Empathy | the design itself: ready designs, as now |
  | Camaraderie | ally modules: inverse, Thread, Shell |
  | Implication | status modules: Anchor, Lure, Linger |
  | Composure | precision: homing, swift, left, right, Silent |

  A module needs **2 points in its gate skill**, or **4 for the second tier** (Bloom, Volley, Ricochet, Fuse, Return).

## 5. Guaranteed ways to unlock modules (Leon: the Narrator granting one is a bonus, not the only way)

1. **Practice** (the engine tracks it):
   - each Release earns **practice**: 1, +1 per stage reached past 1, +1 per feeling poured in;
   - at thresholds you **pick a new module** your gates allow: the 1st at 5 practice, the 2nd at 15, then +15 each;
   - a "practice" bar sits on the Magic tab.
2. **Mastery steps:** each Mastery level (3/5/7/9) in a Soul skill grants **one module pick** from the modules that
   skill gates, as well as the perk step.
3. **Bonus sources:** tutors, heart plates and the Narrator's grants, as today.

**Pen and paper (later; Leon: "converting will be such a bitch").** The tabletop version replaces practice with
**one module pick per level-up** for Soul casters, alongside the Mastery picks. The CRPG keeps practice. Record this in
`docs/ROADMAP.md`; don't build it now.

## 6. Low level: no more three sessions of "magic bolt 1"

- A new Soul caster starts with **3 remembered designs** (was 1 to 2), **2 feelings**, **one tone** (Lore Master 1)
  and the shapes Bolt and Wave.
- **Snap cast ×0.8** (was ×0.6).
- **The first Pump each fight is free** (on top of Empathy's free Pumps).
- **Starting kit design templates** in the workshop: one-click starting designs (a damage bolt, a heal, a push wave),
  so nobody faces an empty builder.

## 7. The pump bar UI (Leon: "pumping must feel fantastic")

- **The stage bar** fills one segment per pump. **Feeling pumps** colour their segment in the feeling's colour and
  show its glyph.
- **The multiplier counter:** a big **×2.4** beside the bar.
  - It climbs on every pump, **shakes** (stronger at higher stages), and makes the heartbeat sound pitch up.
  - When a feeling changes what the spell **does**, the counter changes colour and shows a word for a moment, e.g.
    **"×2.4 · now HEALS"** (Love on Damage) or **"×2.1 · now CHAINS"** (Joy).
- **The Pump buttons:**
  - **Pump** (plain);
  - one button per known feeling, with its step and a short effect, collapsible into "Feelings ▸" with search when you
    know many;
  - **Revert pump**.

  Every disabled button shows its reason.
- **Release preview** (the 1.4 standard): shows the area, every target with expected numbers, the riders, the healing
  from Love, and the residue tiles.
- **Effects and sound for each feeling:** its colour, a particle motif, and a short sound on pump and on residue.
  Residue tiles are drawn with the feeling's tint and glyph, and fog is respected.
- **Unlock card:** "You have felt X."

## 8. Workshop and Proving Ground

- **The Magic tab's Outburst workshop and Sigil workshop become collapsible**, with grouped sections:
  - Sigil: the five word groups;
  - Outburst: schools, shapes, modules grouped by gate skill, gated modules shown locked with their class, tones,
    feelings.
- **The Proving Ground's cheat menu** groups modules, feelings, words and tones the same way.
- **New Proving Ground tools:** grant any feeling, grant practice, unlock any module.

## 9. Classes and perks to re-derive

- **Channeler:**
  - Shape: the first paid Pump free; it applies to feeling pumps too.
  - Storm Front.
  - Heart Surge: a stage higher, counted after feelings.
  - Iron Heart.
  - Occult Library: one tone, now at Lore Master.
  - Eye of the Storm: no Strain; tone riders a stage higher.
- **Bard** (Mend, Gift, Rally). **Guardian** (Will Shield, Sanctuary).
- **Shelved Soul advanced classes:** see the gated modules (section 4).
- **Soul perks and traits** that read stages or modules: audit every reader of `outburst_pump`, `outburst_release`,
  `stageMult` and `designs`.
- **Heartfed's gauges (Rage, Grief, Fear, Devotion)** map onto the feelings of the same name when that class returns.

## 10. Open items (Leon)

1. Feeling step values, residue values and the practice thresholds: the balance pass.
2. Abandon's "goes off wild" when you're already over the limit: confirm it reuses the Mana Short's wild release.
3. How many feeling buttons show at once before they collapse: 6 is the proposal.
4. The pen-and-paper conversion (one module pick per level-up): later.

## Build split (like Blessing 2.0)

- **Part A: spec, data and engine.**
  - Rules 1.8 in the spec.
  - `soul_modules.json` with the new modules and gates.
  - `data/feelings.json`: 25 feelings with their trigger, step, effect ops and residue.
  - The engine: triggers, pumps, revert, residue, practice and Mastery picks, Visualization removed, the low-level
    changes.
  - Proving Ground actions.
  - Tests through `apply()`.
- **Part B: web.**
  - The pump bar and multiplier counter with shake, colour and behaviour words.
  - Feeling buttons and revert.
  - Residue on the map, effects and sound, the unlock cards.
  - The collapsible, grouped workshops for Sigil and Outburst, and the Proving Ground's grouped cheat menu.
  - e2e tests.
