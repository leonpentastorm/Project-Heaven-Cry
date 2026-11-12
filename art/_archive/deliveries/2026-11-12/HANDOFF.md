# Continue the 12 November art brief

**Destination: `art/briefs-complete`; keep develop and the implementer branch untouched.** The prompt file was found on `claude/charming-gauss-hbq4n0` at `dd35e4b8`; it was safely fast-forwarded into this art branch. No force pushes. Fetch current refs and preserve any subsequent implementer work before continuing.

Actual delivered: **28/77**. Every delivered image was generated with image_gen, shown in chat, technically exported, validated, committed and pushed before the next render. New art is review-candidate with production_approved:false. The exact delivered list is progress.json; production selections and source/reference hashes are manifest.json.

## Next work

Next image: **`feeling-loneliness`**.

Remaining ordered queue: `feeling-loneliness`, `feeling-belonging`, `feeling-dread`, `feeling-awe`, `feeling-longing`, `feeling-relief`, `feeling-contempt`, `feeling-guilt`, `feeling-jealousy`, `feeling-wonder`, `feeling-defiance`, `feeling-abandon`, `module-move`, `module-homing`, `module-swift`, `module-ether`, `module-right`, `module-left`, `module-time`, `module-inverse`, `module-size`, `module-random`, `module-at_once`, `module-wave`, `module-burst`, `module-aura`, `module-lance`, `module-fuse`, `module-return`, `module-volley`, `module-bloom`, `module-anchor`, `module-lure`, `module-shell`, `module-linger`, `module-quiet`, `module-silent`, `module-thread`, `module-cascade`, `module-tether`, `module-siphon`, `module-phantom`, `module-volatile`, `module-bastion`, `module-judgement_mark`, `module-halo`, `ui-revert`, `ui-practice`, `ui-felt`.

Read `art/AGENTS.md`, `art/README.md`, `art/style-guide/PHC-Style-Guide.md`, `art/icons/STYLE-LOCK.md`, `art/briefs/GPT-PROMPTS-2026-11-12.md` and its linked current request/rules documents. Read queue.json in this folder: it contains exact prompts, reference paths and delivered flags. **Do not skip Both Hands just because its id exists:** its replacement is already delivered here and its stand-in is preserved in art/_archive/icons/perks/2026-11-12/. Do not rely on the Wick section heading13: the table and ART-REQUESTS enumerate11 (Rebuke, Both Hands, nine Calls).

## Per-image workflow

1. Select the next pending job in queue.json. Inspect its reference images, attach them, and call image_gen with transparency and the exact prompt. No parallel renders. Avoid copying the master’s bowl/arrows; Order and Brief first attempts are retained as rejected sources.
2. Show the generated image in chat immediately. Copy/checkpoint its source without deleting the generated original. If reviewing an edit, preserve every attempt and prompt. Creative revisions must use image_gen; Python is only for technical separation, sizing and contact sheets.
3. From repository root run `python3 tools/art/export_nov12_icons.py --id ID --source /absolute/generated.png`. This retains source/master/prompt, archives replaced production files, writes1024 RGBA +256/128/64/56/48/44/40 exports, catalog, progress and reviews. It refuses delivered ids and conflicting sources; use versioned revisions for corrections.
4. Inspect the corresponding40/44/64px reviews. Run `python3 tools/validate_art.py --asset ID` and `git diff --check`. Check their exit status before committing. Commit only this art/tooling work and push `git push origin art/briefs-complete`; wait for successful push before next image. On a push conflict safely sync and push the existing render; do not redraw.

## Review gates and final handoff

The complete icon queue is11 Wick icons,25 feeling glyphs,38 module icons and3 UI marks,77 total. Leon explicitly approved both ten-icon test-set styles and said to continue. No further initial-test approval is pending. Keep individual art production_approved:false. Do not claim the full commission complete until all77 are actually delivered. An async question asks which optional map layouts are approved: no answer is recorded yet. Generate current tile guides before any map painting; Proving Ground additionally needs its playtest gate. Do not start M813/sketch maps or equipment paintings, which are on hold. No title-screen, 3D Narrator, completed animation or old180-icon redraws.

At the stage end update ART-REQUESTS statuses and this handoff accurately, refresh hashes with `python3 tools/rehash_art_checksums.py`, run `python3 tools/validate_art.py` and `git diff --check`, push final handoff and verify clean worktree and matching remote. Build asset exports if appropriate; Calls still require implementer UI wiring (do not alter gameplay).

If image quota returns a limit, save its **exact returned reset timestamp and response** in progress.json and a checkpoint file, record next pending id and remaining work here, commit/push the handoff, and do not retry before reset. Leon explicitly requested a handoff so another GPT can continue if usage is exhausted.
