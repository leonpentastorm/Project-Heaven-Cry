# 12 November icon delivery handoff

**77/77 icons delivered on `art/briefs-complete`.** Every selected drawing was generated with image_gen, shown in chat, exported, validated, committed and pushed before drawing the next icon. No image usage limit interrupted this run. Individual artwork remains **review-candidate**, `production_approved:false`.

Leon approved the six-feeling/four-module test set: “Approve both styles and continue.” This is family-style approval; individual production approval is still pending.

## Delivered

| Family | Count | Production files | Asset keys |
| --- | ---: | --- | --- |
| Rebuke | 1 | `art/icons/prayers/whisper-rebuke.png` | `prayer-whisper-rebuke` |
| Both Hands replacement | 1 | `art/icons/perks/both-hands.png` | `wick-perk-both-hands` |
| Calls | 9 | `art/icons/calls/<name>.png` | `call-<name>` (kebab case) |
| Feelings | 25 | `art/icons/feelings/feeling-<id>.png` | `feeling-<id>` (data id preserved) |
| Modules | 38 | `art/icons/modules/module-<id>.png` | `module-<id>` (data id preserved) |
| UI marks | 3 | `art/icons/modules/ui-{revert,practice,felt}.png` | `heart-ui-{revert,practice,felt}` |

The source prompt heading says 13 Wick icons, but its table and ART-REQUESTS enumerate 11. All 11 are delivered; there are no invented extra jobs. Impact is retired and has no icon. The 25 feelings, 38 active modules and nine Calls were reconciled with their actual data ids. Calls use data ids such as `call.name_it`; their filenames/asset keys use `name-it`.

Every icon has a 1024px RGBA white-ink master and 256/128/64/56/48/44/40px PNG exports. The delivery `manifest.json` records selected source/master/prompt/reference hashes and export paths. `queue.json` has the ordered jobs, actual selected prompts and delivered flags; `progress.json` has the full delivered list and no remaining icon jobs. `sources/` retains native renders and rejected attempts; `masters/v1/` preserves the selected masters. Replaced Both Hands production files and exports are preserved at `art/_archive/icons/perks/2026-11-12/`; its catalog entry records `previous_path`.

## Reviews and integration

`reviews/` contains complete Calls, feelings and modules contact sheets at 40/44/64px, plus six production batches at 40/64px. They were inspected in chat. Calls differ in pose; feelings use gestural heart-knotted ribbons; modules use clean geometric diagrams. Rejected attempts that copied reference ornaments remain archived. Translucent source haze is removed by the technical ink separation; exports contain only white RGB ink with alpha edges.

`npm run assets` exports all selected files to the web asset map. The builder now exports the nine Calls as `call-<id>` and versions the replacement Both Hands URL to refresh old caches. Existing prayer and Outburst image lookups already use the delivered names. **The implementer still needs to wire the Calls tab to the new images**; no gameplay/UI implementation was changed in this art delivery. The generated asset map is included; generated WebPs follow the repository's existing ignored-build-output policy.

## Scope and branch

The brief was found on `claude/charming-gauss-hbq4n0` at `dd35e4b8`, safely fast-forwarded into this separate art branch. The final upstream check reached `cb40e922`; later commits concern engine/rules work and add no art requirements. Their active module list still contains the same 38 ids. They were left on the implementer's branch for its normal integration flow. No force pushes; develop, main and the implementer's branch are untouched.

The optional two maps were not painted. Leon has not answered the tile-guide/layout question; Proving Ground also requires his playtest. Generate current guides with `tools/render_map_guides.py` before painting, and follow the current map-size rules. Equipment 2.0, M813/sketch maps, title-screen work, 3D Narrator, completed animations and the prior 180-icon library are outside this delivery.

## Validation

Each icon passed `python3 tools/validate_art.py --asset ID` and `git diff --check` before its push. Final handoff checks are the complete art validator, patron validator, `npm run assets`, delivered-key/PNG/WebP consistency checks and `git diff --check`. **All final checks passed.** See `validation.json` and `validation/` for outcomes and captured command output.

No icon generation remains. Future requested revisions must preserve these sources and masters in a new versioned folder, retain `production_approved:false` until Leon approves, and use image_gen for creative changes. If a future run encounters an image limit, save the exact returned reset timestamp/error and next pending job in progress, commit/push the handoff and never retry before reset.
