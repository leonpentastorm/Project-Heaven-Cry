# Imported technical v2 notice

This peer handoff below is a historical snapshot from `676764cfd29663c386e3b79538eef046153cedd3`. Its229/871 count is not the current combined count. This branch imported all58 completed peer drawings and removed only alpha<8 residue; original native/candidate images and previous masters/exports/metadata are preserved. The current technical bindings and integration instructions are in `art/_archive/gear/2026-11-19-kept-blade-grades/coordination/peer-import-v2/README.md`.

Do not rerun the legacy `prepare-candidates.py` or `register-grade.py` commands over these58 completed drawings: that would replace the selected clean v2 bindings with the older preparation. Validate the imported delivery with `python3 tools/art/import_peer_grades.py --validate --check-catalog` after root applies catalog-updates.json. Artistic approval and exact-outline review remain pending. Root's active queue and handoff remain authoritative for current claims and counts.

The original handoff bytes are preserved under `art/_archive/gear/2026-11-19-kept-blade-grades/coordination/peer-import-v2/peer-original-metadata/art/_archive/prompt-pack/2026-11-19-file-08/HANDOFF.md`.

---

# Image quota handoff — 19 November 2026

**Paused on an actual image usage limit. All completed work is pushed on `art/2026-11-19-grade-proof`.** There are **58 registered review-candidate grade masters and 232 game-size exports** on this branch. The verified project snapshot is **229/871 pictures (26.3%)**: 150 base/unique candidates + 79 distinct grade candidates across both workers.

The image service returned HTTP 429 `usage_limit_reached` on Ballistic Helmet Relic. It reported reset epoch `1795142739`: **20 November 2026 at 09:45:39 Vietnam time**, or 02:45:39 UTC. Exact response: [quota response](drafts/ballistic-helmet-relic-quota-response.json); machine-readable reset: [QUOTA.json](QUOTA.json). No more image requests were made after that error. A worker with available usage can take over the released jobs after recording its claim; the same exhausted account should wait for its reset.

## Resume here

**Ten pictures are released for takeover:**

| Standard | Still to generate | Existing predecessor |
| --- | --- | --- |
| `armour-ballistic_helmet` | Relic, then Celestial | Masterwork is already registered |
| `armour-night_goggles` | Fine, Masterwork, Relic, Celestial | Standard |
| `armour-gas_mask` | Fine, Masterwork, Relic, Celestial | Standard |

[Exact restart prompts and delivery commands](RESTART-PROMPTS.md) · [Remaining job records](claim.json) · [All claims and other available work](../../../briefs/prompts-2026-11-19/WORK-CLAIMS.md)

Read the shared mailbox https://github.com/leonpentastorm/Project-Heaven-Cry/issues/3 and publish your exact reservation before rendering. The other worker retains its eight blade/hafted IDs; their unfinished work is not released by this handoff. There are also 132 other existing-Standard grade pictures listed as available at this checkpoint, making 142 available including these ten. Check for newer claims first.

## Completed on this branch

All four finishes are registered for Katana, Combat Knife, Sabre, Legion Gladius, Recurve Bow, Longbow, Buckler, Riot Shield, Pavise, Quiver, Utility Belt, Armoured Belt and Field Helmet: 13 sets, 52 pictures.

Partial sets add six: Drifter Fine; Crossbow Fine; Repeating Crossbow Fine/Masterwork; Ballistic Helmet Fine/Masterwork. Do not redraw these delivered pictures.

Masters: `art/icons/gear/<stem>--<grade>.png`. Exports: `art/icons/gear/exports/{256,128,64,32}/`. Catalog entries have `status: review-candidate`, `production_approved: false`, `implementation_ready: false`. Native sources, prompts and references are in `drafts/`, selected preparation masters in `candidate-masters/`, per-picture records in `delivered/`.

[Inventory-size comparison](review/finish-candidates-small.jpg) · [Native proof sheet](review/complete-proof-progress.jpg) · [Measurements](candidate-manifest.json) · [Live delivered count](PROGRESS.md)

## Coordination and count

The duplicate blade work was resolved in issue comment 7004125558. This branch's 12 Combat Knife/Sabre/Legion Gladius candidates are canonical on both branches. The other worker's three earlier overlapping renders are archived alternatives and excluded from counts.

The other worker owns `kemizuchi_duelling_blade`, `adamantile_greatsword`, `ork_machete`, `hatchet`, `war_axe`, `glaive`, `lance`, `maul`, four grades each. At peer commit `842b27720cab4cc3c535efecc082c8884baf88eb`, its catalog has 33 grade keys: 12 shared imports and 21 exclusive candidates. Those 21 are Kemizuchi, Adamantile, Hatchet, Glaive and Lance four each, plus Ork Fine. Its remaining eleven stay reserved unless it releases them.

The grade union is 58 + 33 - 12 = 79; add the previously audited 150 base/unique pictures for 229/871. This is a commit-pinned snapshot; the other worker may publish more afterward. [Exact count and peer-exclusive IDs](COUNT-SNAPSHOT.json). Never count exports, rejected trials, source experiments, shared imports or archived alternatives again.

## Review limits and preserved work

Leon instructed continuous work, so these remain review candidates while artistic approval and the proof-sheet gate are pending. The brief's exact-outline requirement has not passed. Local contour changes are measured and retained, including the Longbow upper fitting and limb curve, Sabre guard/blade curve, and Pavise rear prop. Review at 32/64 px before approving. No approval is invented.

Standards from develop `2020b5c2a` remain unchanged. The later develop `c22cc8f7bd` update was tests only, not an art-brief change. Uniform scaling/translation aligns native renders to the Standard canvas; no creative warping or forced Standard alpha is used. Three shield masters needed a one-pixel transparent frame guard for alpha-1 edge residue; their earlier master/export bytes are retained in `border-revisions/`.

All source/candidate/reference paths are repository-relative. New renders use image_gen; scripts perform technical framing, exports, registration, measurements and contact sheets.

Drifter Masterwork, Crossbow Masterwork and Repeating Crossbow Relic separately returned `moderation_blocked`. Their eight dependent/pending grade pictures remain recorded, distinct from today's quota stop. Exact responses are in `drafts/`; preserve them. The user's 0.30 holds still apply, including the Scrap Turret portrait. Other pack branches retain their own blocked/reference-dependent jobs; this handoff does not release or redefine those.

## Checks and continuation workflow

Run from repository root. `archive-proof.py /path/to/metadata.json` archives a native render and exact prompt without overwriting a source. `prepare-candidates.py` prepares the existing sets and small-size review. `register-grade.py ID TIER` refuses an existing destination and creates the master, catalog binding and four exports. Rehash, commit and push each picture. Existing images stay preserved.

Run `validate-grade-delivery.py` after additions. The 58 masters and 232 exports pass hash, portable source, native-dimension, candidate-status and clear-border checks. Original gear preservation checks passed; current catalog-integrity and web-asset checks are recorded in [VALIDATION.md](VALIDATION.md). Restore the generated tracked web asset index after a check-only build; do not mix it into the art delivery.

Use a normal continuation branch and push; preserve both workers' catalog/checksum entries during integration. Develop has not been changed by this lane.
