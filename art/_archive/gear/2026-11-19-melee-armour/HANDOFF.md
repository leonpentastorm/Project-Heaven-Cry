# Files05 and07 — 19 November gear handoff

Branch: `art/2026-11-19-melee-armour`, from develop `2020b5c2`. **11/39 Standard paintings delivered.** Next: `weapon-legion_spear`. Exact remaining order is progress.json / queue.json.

This worker claims file05 (19 melee) and file07 (6 shields +14 armour). Another GPT owns files01–04. Files06/08/09/10 are unclaimed by this worker. No work on the other GPT’s files, title screen, old icons or pet.

Each selected drawing uses image_gen, is shown in chat, exported, validated, committed and pushed before the next drawing. Masters: art/icons/gear/<exact-brief-filename>.png, 1024RGBA. Exports:256/128/64/32. Native sources, versioned masters, prompts, original brief snapshots, reference hashes and64/32px family comparisons are retained here. Every new asset remains review-candidate, production_approved:false. No existing production art is overwritten.

These39 upcoming Items2.0 ids are not live weapon/item records yet. No stats or aliases were invented. The existing gear builder already resolves their future keys as gear-<item_id>. Fine/Masterwork/Relic/Celestial require approved Standard masters and file08’s proof-sheet gate; they are not part of this batch.

Resume: fetch latest refs safely; read art/AGENTS.md, art/README.md, the guide and gear/weapon rules, source briefs and this queue. Inspect each job’s actual references and attach all of them to image_gen. Use `python3 tools/art/export_nov19_gear.py --id ID --source /absolute/source.png`, then `python3 tools/validate_nov19_gear.py --asset ID` and `git diff --check`. Commit and push only this branch before drawing next; preserve the existing rendered commit on push conflicts. Do not regenerate delivered ids; revisions need new versioned sources/masters.

This cloud worktree is sparse due the disk cap. The sparse-aware rehasher preserves untouched omitted historical records only after checking their index/HEAD/checksum provenance, and explicitly does not claim their pixels or bytes were read locally. Run the whole-library art validator on a full checkout before integration; targeted delivery validation covers all new images here. Do not change historical delivery counts or manifests. Catalog/checksum merges must preserve the other worker’s entries.

On image quota: save the exact error and reset timestamp in progress.json, checkpoint the next pending id, finish unaffected checks, commit/push a concrete handoff, and never retry before reset.
