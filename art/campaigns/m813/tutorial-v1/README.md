# M813 tutorial campaign — complete art handoff

**53 images delivered:** 4 banners, 16 portraits, 4 maps, 4 story moments and 25 object sprites. The original brief requested 52; one shared field lamp covers the implementer’s later H3/I9 lamp objects.

Every creative drawing was shown in chat and pushed individually. All new art remains `review-candidate`, `production_approved: false`, pending Leon. Earlier masters, sources and revisions are retained. The original 295 primary assets, including the complete 180-icon library and accepted portrait revisions, are preserved.

## Review

- [Zone banners](previews/banners.png)
- [Sixteen portraits](previews/portraits.png)
- [All 25 object sprites at actual 46 px, dark/light](previews/sprites-46px-dark-light.png)
- [Internal story review — includes spoilers](previews/spoilers/story-moments.png)

Maps have [layout overlays](#map-layout-checks) against the current campaign and assembly examples using the existing sprites. These are technical review layouts, not screenshots of game integration. Grids and review outlines are never baked into a map master.

## Implementation

Use catalog IDs and selected paths; never select a historical image by glob. Banners/stories are RGB 1600×900, portraits RGB 800×1000, maps RGB 1600×1100. Sprites are RGBA 256×256, except the 512×512 escape craft and 512×256 paired cradles. Versioned tile-fit exports center sprite ink/shadow bounds inside an 80% box; source drawings remain unchanged. 128/64/46 px sprite previews are supplied.

New portraits join `pool: m813-cast`, collection `m813` (18 portraits including the retained two). Group A has zone IDs; the shield-line banner also serves as campaign card art. Object sprites carry `object_kind`. Doors use a matching overhead cutaway pair.

Respect `spoiler` and `visibility`: the ramp and choice are mid-campaign; the demand is `outpost-1-only` and stored under spoilers/. Later zone banners are gated to zone entry. Full review sheets are internal. Character appearances, unknown enemy design, regimental/prop decoration and details absent from the lore remain proposals. No new fact about the enemy faction is established.

The latest campaign added field lamps at Outpost H3/I9. Both reserved floor tiles remain clear; the updated guide shows them. Painted map geometry was compared visually with the guides; engine collision remains defined by campaign data. The pixel validator verifies image formats/alpha/metadata, not semantic geometry or art approval.

## Map layout checks

- The shield line: [tile overlay](previews/shield_line-layout-check.png), [sprite assembly](previews/shield_line-assembly-preview.png).
- Outpost-813 rear landing pad: [tile overlay](previews/rear_pad-layout-check.png), [sprite assembly](previews/rear_pad-assembly-preview.png).
- Outpost-813: [tile overlay](previews/outpost-layout-check.png), [sprite assembly](previews/outpost-assembly-preview.png).
- Outpost-1: [tile overlay](previews/outpost_1-layout-check.png), [sprite assembly](previews/outpost_1-assembly-preview.png).

## Validation and regeneration

`python3 scripts/validate_art.py --complete-icons --complete-campaign` checks full 180-icon and current 53-image campaign coverage, selected PNGs, sources, metadata, spoilers, sprite transparency and all checksums. `git diff --check` checks whitespace.

`python3 scripts/review_m813_campaign.py` rebuilds review layouts from existing art. It does not draw or regenerate images. The committed queue and production-progress record retain exact coverage.

| ID | Group | Selected image | Visibility |
|---|---|---|---|
| `m813-shield-line` | A | [PNG](../../../illustrations/m813/v2/shield-line.png) | opening-safe |
| `m813-rear-pad-loading` | A | [PNG](../../../illustrations/m813/v2/rear-pad-loading.png) | opening-safe |
| `m813-outpost-hangar` | A | [PNG](../../../illustrations/m813/v2/revisions/v2/outpost-hangar.png) | zone-entry |
| `m813-outpost-1` | A | [PNG](../../../illustrations/m813/v2/outpost-1.png) | zone-entry |
| `m813-nine-nine` | B | [PNG](../../../character-portraits/m813/v2/m813-nine-nine.png) | opening-safe |
| `m813-seven-seven` | B | [PNG](../../../character-portraits/m813/v2/m813-seven-seven.png) | opening-safe |
| `m813-hum` | B | [PNG](../../../character-portraits/m813/v2/m813-hum.png) | opening-safe |
| `m813-lantern` | B | [PNG](../../../character-portraits/m813/v2/m813-lantern.png) | opening-safe |
| `m813-soft-hands` | B | [PNG](../../../character-portraits/m813/v2/m813-soft-hands.png) | opening-safe |
| `m813-rook` | B | [PNG](../../../character-portraits/m813/v2/revisions/v2/m813-rook.png) | opening-safe |
| `m813-penny` | B | [PNG](../../../character-portraits/m813/v2/m813-penny.png) | opening-safe |
| `m813-keel` | B | [PNG](../../../character-portraits/m813/v2/m813-keel.png) | opening-safe |
| `m813-ilse-varga` | B | [PNG](../../../character-portraits/m813/v2/m813-ilse-varga.png) | opening-safe |
| `m813-engineer-a` | B | [PNG](../../../character-portraits/m813/v2/m813-engineer-a.png) | opening-safe |
| `m813-engineer-b` | B | [PNG](../../../character-portraits/m813/v2/m813-engineer-b.png) | opening-safe |
| `m813-novikov` | B | [PNG](../../../character-portraits/m813/v2/revisions/v2/m813-novikov.png) | opening-safe |
| `m813-security-guard` | B | [PNG](../../../character-portraits/m813/v2/revisions/v2/m813-security-guard.png) | opening-safe |
| `m813-guard-captain` | B | [PNG](../../../character-portraits/m813/v2/m813-guard-captain.png) | opening-safe |
| `m813-scavenger-drone` | B | [PNG](../../../character-portraits/m813/v2/m813-scavenger-drone.png) | opening-safe |
| `m813-rearguard` | B | [PNG](../../../character-portraits/m813/v2/m813-rearguard.png) | opening-safe |
| `map-m813-shield-line` | C | [PNG](../../../maps/m813/v1/revisions/v2/shield_line.png) | opening-safe |
| `map-m813-rear-pad` | C | [PNG](../../../maps/m813/v1/revisions/v2/rear_pad.png) | opening-safe |
| `map-m813-outpost` | C | [PNG](../../../maps/m813/v1/revisions/v2/outpost.png) | opening-safe |
| `map-m813-outpost-1` | C | [PNG](../../../maps/m813/v1/revisions/v2/outpost_1.png) | opening-safe |
| `m813-how-many` | D | [PNG](../../../illustrations/m813/v2/m813-how-many.png) | opening-safe |
| `m813-the-ramp` | D | [PNG](../../../illustrations/m813/v2/revisions/v2/m813-the-ramp.png) | mid-campaign |
| `m813-the-choice` | D | [PNG](../../../illustrations/m813/v2/m813-the-choice.png) | mid-campaign |
| `m813-the-demand` | D | [PNG](../../../illustrations/m813/v2/spoilers/revisions/v2/m813-the-demand.png) | outpost-1-only |
| `obj-barrier-stakes` | E | [PNG](../../../sprites/objects/v1/revisions/v3/obj-barrier-stakes.png) | opening-safe |
| `obj-platinum-crates` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-platinum-crates.png) | opening-safe |
| `obj-tool-rack` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-tool-rack.png) | opening-safe |
| `obj-cargo-pylon` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-cargo-pylon.png) | opening-safe |
| `obj-toppled-pylon` | E | [PNG](../../../sprites/objects/v1/revisions/v3/obj-toppled-pylon.png) | opening-safe |
| `obj-door-closed` | E | [PNG](../../../sprites/objects/v1/revisions/v3/obj-door-closed.png) | opening-safe |
| `obj-door-open` | E | [PNG](../../../sprites/objects/v1/revisions/v3/obj-door-open.png) | opening-safe |
| `obj-crater` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-crater.png) | opening-safe |
| `obj-mine` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-mine.png) | opening-safe |
| `obj-coolant` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-coolant.png) | opening-safe |
| `obj-fire` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-fire.png) | opening-safe |
| `obj-fuel-drum` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-fuel-drum.png) | opening-safe |
| `obj-rubble` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-rubble.png) | opening-safe |
| `obj-fallen-squad` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-fallen-squad.png) | opening-safe |
| `obj-triage-line` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-triage-line.png) | opening-safe |
| `obj-footlockers` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-footlockers.png) | opening-safe |
| `obj-cookbook` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-cookbook.png) | opening-safe |
| `obj-platinum-net` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-platinum-net.png) | opening-safe |
| `obj-terminal-field` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-terminal-field.png) | opening-safe |
| `obj-drop-pod` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-drop-pod.png) | opening-safe |
| `obj-console` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-console.png) | opening-safe |
| `obj-escape-craft` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-escape-craft.png) | opening-safe |
| `obj-repair-cradles` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-repair-cradles.png) | opening-safe |
| `obj-poi-marker` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-poi-marker.png) | opening-safe |
| `obj-field-lamp` | E | [PNG](../../../sprites/objects/v1/revisions/v2/obj-field-lamp.png) | opening-safe |
