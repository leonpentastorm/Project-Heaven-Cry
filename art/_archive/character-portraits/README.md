# Character portraits

145 Heavenprint paintings: three original sets of 27, the two retained M813 portraits sixteen tutorial-campaign portraits and 46 archetype player-card candidates, all 800 × 1000 PNG. Every one is a **person in the world**../../portraits None of them is a skill icon.

## Why they exist, and why they aren't skill icons

All three sets were first painted to be the skill icons on the skill page: one character per skill, each embodying that skill. Playtesters said it didn't make sense for the player's own skills to be represented by other people in the world, so the skill page moved to the faceless abstract figures in [`../../icons/skills/`](../../icons/skills/)../../portraits The 81 paintings were kept as character art. Filenames still follow core / attribute / skill: that records which skill a character was painted to embody, nothing more.

## The three sets

| Set | Folder | Who they are | Use |
|---|---|---|---|
| **First-Patch Revival** | [`first-patch-revival/`](first-patch-revival/) | The EPCCG cast: the 27 people quoted in the EPCCG skill entries (Sanchez, Knight Jiren, Professor Avdol, Sister October…) | Named characters. Index and factions: [`docs/lore/EPCCG-Cast-and-Factions.md`](../../../docs/lore/EPCCG-Cast-and-Factions.md) |
| **Original Heavenprint** | [`original-heavenprint/`](original-heavenprint/) | Unnamed original characters, each prompted to fit the essence of one skill | Pool for random NPCs. Also an approved style anchor |
| **New Faces** | [`heavenprint-new-faces/`](heavenprint-new-faces/) | Named original characters (Orren Vask, Mallow-3…), each prompted to fit the essence of one skill | Pool for random NPCs; names are proposals, not canon. Also an approved style anchor |
| **M813, version 1** | [`m813/`](m813/) | MPAT and its unnamed comrade | One-shot cast, `pool: m813-cast`; review candidates. |
| **M813 tutorial, version 2** | [`../../portraits/m813/`](../../portraits/m813/) | Sixteen infantry, medic, human and enemy portraits | Tutorial cast and map tokens, `pool: m813-cast`; [complete campaign handoff](../campaigns/m813/tutorial-v1/README.md)../../portraits |

**Archetypes — 46 review candidates**, one per archetype, in [`archetypes/`](archetypes/README.md) (`pool: player-card`)../../portraits Preview and casting metadata are included; visual approval is pending. Brief: [`../../briefs/archetype-portraits.md`](../../briefs/archetype-portraits.md)../../portraits

In [`art/catalog.json`](../../catalog.json), filter `characters` by `pool`: `epccg-cast` or `world-npc`../../portraits A character's `historical_skill_id` is a casting hint ("someone who has far too much Composure"), useful for picking an NPC who fits a scene.

New character art goes in a new folder here (for example `m813/` for the M813 one-shot; see [`../../briefs/m813-mpat.md`](../../briefs/m813-mpat.md)) and gets catalog entries. The style rules are in [`../../style-guide/`](../../style-guide/)../../portraits

