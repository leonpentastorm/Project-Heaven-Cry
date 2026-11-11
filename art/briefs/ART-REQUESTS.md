# Art requests: what needs an artist (or image generation)

**This is the one list to hand an artist.** It is kept up to date as the game changes: every time a rules pass adds,
renames or removes something that has art, the entry lands here in the same change. If the list is empty, nothing is
waiting.

It holds only what Claude cannot make. What Claude can make without an artist is at the bottom, so nobody is asked for
something that didn't need them.

## Read these first

| For | Read |
| --- | --- |
| Everything | [`art/style-guide/PHC-Style-Guide.md`](../style-guide/PHC-Style-Guide.md) (the only style guide) and [`art/AGENTS.md`](../AGENTS.md) (its short version for image agents) |
| Where files go, names, sizes, the catalog | [`art/README.md`](../README.md) |
| Wick icons (traits, perks, prayers, Calls) | [`art/icons/STYLE-LOCK.md`](../icons/STYLE-LOCK.md); the master is [`art/icons/traits/mind-without-fog.png`](../icons/traits/mind-without-fog.png); the production brief is [`wick-production-icons.md`](wick-production-icons.md) |
| Colours | [`art/style-guide/palette.json`](../style-guide/palette.json) and [`docs/design/colour-system.md`](../../docs/design/colour-system.md) |
| Skill portraits (the 27 faceless figures) | the style guide's skill-portrait mode; examples in [`art/icons/skills/`](../icons/skills/) |
| Character portraits | [`archetype-portraits.md`](archetype-portraits.md), [`first-patch-revival-redo.md`](first-patch-revival-redo.md) |
| Outburst feelings and modules | [`docs/design/handoffs/outburst-4.0-art-brief.md`](../../docs/design/handoffs/outburst-4.0-art-brief.md) |
| Prayers and patrons | [`docs/design/handoffs/blessing-art-brief.md`](../../docs/design/handoffs/blessing-art-brief.md) |
| The Narrator's avatar | [`wick-narrator-3d.md`](wick-narrator-3d.md) |

**How a delivery is checked:** `python3 tools/validate_art.py` (catalog, sizes, checksums, palette, ink). A new file
needs a catalog entry in [`art/catalog.json`](../catalog.json); Claude adds it and the UI sizes when the file arrives.

## Status words

- **Wanted:** nothing usable exists; the game shows a stand-in or nothing.
- **Stand-in:** the game uses something that works but isn't right (a neighbour's icon, a patched icon, a code-drawn
  shape). Replace when convenient.
- **At risk:** exists and is right today, but a planned rules change may make it wrong. Don't draw yet.
- **Done:** delivered and in the catalog (kept here for one release, then removed).

## Open requests

### 1. Wick icons (white flat ink, 1024 × 1024, transparent; the STYLE-LOCK applies)

| # | For | Status | What it must show | Direction | Goes to |
| --- | --- | --- | --- | --- | --- |
| W1 | **The nine Calls:** Order, Rally, Brief, Name It, Cue, Spot, Warn, Threaten, Taunt (`data/calls.json`) | Wanted: the Calls tab has no pictures | One icon a Call: Wick calling out across a fight. Each must read as a shout with a different purpose (an order to a squadmate, a rallying cry, a quick briefing, naming a fear out loud, a cue, a pointed finger at a target, a warning, a threat, a goad) | Same Wick, same line weight as the perk set. A small speech mark, sound lines or a pointing hand may carry the idea; no text in the image. They sit side by side, so the nine silhouettes must differ at 44 px | `art/icons/calls/<name>.png` (new folder; `order.png`, `name-it.png`, …) |
| W2 | **Both Hands** (perk: a blade in one hand, a gun in the other; a melee hit steadies the next shot) | Stand-in: the Hot Swap Wick with a sword patched into his open hand (`art/icons/perks/both-hands.png`, made by `tools/art/both_hands_icon.py`) | Wick fighting with a sword and a pistol at once | A fresh pose, not the Hot Swap spin: mid-strike with the blade, the pistol already levelled. The old Origami Hands icon it replaced is in `art/_archive/perks/wick/replaced/` | `art/icons/perks/both-hands.png` |

### 2. Outburst feelings and modules

| # | For | Status | What it must show | Direction | Goes to |
| --- | --- | --- | --- | --- | --- |
| F1 | **The 25 feelings** poured into an Outburst | Stand-in: the game draws simple shapes in code | One glyph a feeling | The brief has every feeling, its meaning and its look: [`outburst-4.0-art-brief.md`](../../docs/design/handoffs/outburst-4.0-art-brief.md) | `art/icons/feelings/feeling-<id>.png` |
| F2 | **The Outburst modules** | Stand-in: code-drawn shapes | One icon a module | Same brief | `art/icons/modules/module-<id>.png` |

### 3. Portraits, illustrations, maps

Nothing waiting.

## At risk in the balance pass

The balance pass (`docs/design/proposals/2026-11-balance-pass.md`) will rewrite, merge or remove perks, traits and
class moves. An icon whose perk changes meaning lands in the table above as **Stand-in** with the new meaning; an icon
whose perk is removed goes to `art/_archive/`. **Don't commission perk or trait icons until the pass is done.** The
audit that starts it is `docs/design/handoffs/perk-audit.md`.

Already known to change (rules 1.14, 11 Nov 2026), icons to be judged once they are built:

| Perk | What changes | Its icon today |
| --- | --- | --- |
| Heart Overload | From "pay a Begin in HP" to "a free Begin right after a Release" | `art/icons/perks/heart-overload.png` |
| Resonance | From "allies' Releases count for you" to "your own Releases build on each other" | `art/icons/perks/resonance.png` |

## What does not need an artist

Claude makes these and they are not listed above:

- **Weapon and armour icons:** monoline line icons, drawn as SVG to
  [`art/style-guide/weapon-icons.md`](../style-guide/weapon-icons.md).
- **Recolours** of existing art (a skill portrait moved to another attribute's pigment:
  `tools/art/recolour_skill_portrait.py`).
- **A simple prop added to or removed from an existing icon** (a blade, a shield, a ring, an arrow), or two existing
  icons combined, when the poses allow it. These are logged above as **Stand-in** if a proper drawing would be better.
- **Effects that are only rings, lines, glyph strokes and tints** (SVG or CSS). Anything with texture (fire, smoke,
  sparks, impacts) comes from openly licensed assets, credited in the game.

Claude cannot draw Wick in a new pose or expression, or paint anything.

## Log

- **11 Nov 2026:** list started. W1, W2, F1, F2 opened. Breaching Strike, Nothing Gets Past and Iron Grip were
  checked against their rules 1.13 meanings and fit as they are.
