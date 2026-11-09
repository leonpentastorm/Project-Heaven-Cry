# Colour system

One rule: **colour means a skill's attribute, or one of five game states. Nothing else gets a hue.** Decorative colour is neutral.

Machine-readable values are in [`art/style-guide/palette.json`](../../art/style-guide/palette.json). This page explains them. If the two disagree, the JSON wins.

## 1. Attributes: nine hues, two forms

Every skill takes its attribute's colour. Each hue comes in two forms:

- **Pigment** is the colour painted into the skill portraits. Use it only inside artwork.
- **UI ink** is the same hue, lightened only as far as needed to reach 4.5:1 contrast on the raised surface `#1C2536`. That makes it safe for text, borders, bars, diamonds and badges on every PHC surface. Six of the nine pass untouched.

| Core | Attribute | Pigment (art) | UI ink | Contrast on `#1C2536` |
|---|---|---|---|---|
| Body | Endurance | `#CC2435` | `#F65157` | 4.56 |
| Body | Strength | `#F68A38` | `#F68A38` | 6.30 |
| Body | Agility | `#E3BF51` | `#E3BF51` | 8.66 |
| Mind | Perception | `#40BAA0` | `#40BAA0` | 6.40 |
| Mind | Intelligence | `#8BDEEE` | `#8BDEEE` | 10.08 |
| Mind | Expression | `#075369` | `#5394AC` | 4.53 |
| Soul | Insight | `#EB95B7` | `#EB95B7` | 6.96 |
| Soul | Determination | `#9875D7` | `#9D7ADC` | 4.57 |
| Soul | Virtue | `#86234E` | `#D36A90` | 4.56 |

The UI inks keep the pigment's hue (OKLCH hue unchanged; only lightness rises). Never put pigment Expression or Virtue on a dark surface as text or a thin line: they measure about 2.2:1.

**Weakest pair:** Endurance and Virtue UI inks are the closest of the nine (ΔE<sub>OK</sub> 9.4). They read apart side by side, but never let colour alone tell them apart. Every skill chip carries its name.

## 2. Cores: family headers

Cores keep their own colours for core tabs, core steppers, archetype text and other core-level UI. Each one sits inside its attributes' family.

| Core | Colour |
|---|---|
| Body | `#F2A54A` amber |
| Mind | `#4FC8DF` cyan |
| Soul | `#AE9BFF` violet |

Use the core colour when the element is about the whole core, and the attribute UI ink when it is about an attribute or a skill. For example, the Skills tab of the character sheet colours each attribute row and its three skills by attribute, and the core tab above them by core.

## 3. Game states

States always pair the colour with a word or a glyph, so colour-blind players lose nothing.

| State | Colour | Glyph | Notes |
|---|---|---|---|
| Success, critical success, ready, upside | `#6FEA77` green | ✓ (★ for critical) | Hue sits far from Perception teal and Agility gold. |
| Failure | `#A3AEC2` muted | ✕ | Failure drains colour; it doesn't shout. |
| HP, damage, complication, hostile, downside | `#F65157` | ⚠ for complication | Shares Endurance's UI ink on purpose: Max HP comes from Endurance. HP bar fill uses the same ink. |
| MP | `#5C9EFF` blue | | A hue no skill uses. |
| Echo, still-to-do, selected tool, point of interest | `#FFFFFF` white | ◆ for Echo | Echo is not an attribute, so it takes no hue. White bold = "this still needs you"; green = done. |

Retired tokens: `#6FD8A0` (success; too close to Perception), `#F0907F` / `#E8604F` (failure, HP), `#FFD27A` (Echo/critical; too close to Agility).

## 3b. Players (ownership only)

In co-op one player can play more than one character, so characters are marked with their **player's colour**: a badge with the player's initials, a ring on tokens and portraits, a stripe on character cards. Player colours mean "whose", never a game state, and they always appear with initials or a name, never alone.

| Seat | Colour |
|---|---|
| Player 1 (host) | `#7FD4FF` |
| Player 2 | `#FF9EC7` |
| Player 3 | `#B8E986` |
| Player 4 | `#FFB86B` |

They sit near some attribute hues (Insight, Strength), which is why they never appear without initials.

## 4. Neutrals

| Role | Colour |
|---|---|
| Ground | `#0A0D13` |
| Panel | `#10151F` |
| Raised surface, bar track | `#1C2536` |
| Line | `#232D3F` |
| Text | `#E7EBF3` |
| Muted text, failure | `#A3AEC2` |
| Portrait black (skill art) | `#000000` |
| Portrait cream (skill art) | `#F2E5C8` |

## 5. Icons

Trait **and** perk icons are pure white `#FFFFFF` flat ink (Wick). They never take an attribute colour. A perk's requirements show as skill chips beside the icon, each chip in its attribute's UI ink.

## 6. Checks before shipping a screen

1. Every hue on screen is either an attribute (skill-related) or a state from section 3.
2. Text and lines use UI ink, never pigment.
3. Every state colour has its word or glyph.
4. Endurance and Virtue never appear as unlabelled swatches side by side.
