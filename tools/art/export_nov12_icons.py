#!/usr/bin/env python3
"""Technical exports of image_gen drawings for the 12 November brief; no drawing."""
import argparse
import hashlib
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw
from export_wick_icon import master, separate_ink

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'art/_archive/deliveries/2026-11-12'
SIZES = [256, 128, 64, 56, 48, 44, 40]


def dump(path, value):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, indent=2, ensure_ascii=False) + '\n')


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path):
    return str(path.relative_to(ROOT))


def record(path):
    return {'path': rel(path), 'sha256': sha(path)}


def set_catalog_entry(text, family, id, asset):
    """Change only this entry, preserving hand-formatted metadata elsewhere."""
    rendered = json.dumps(asset, indent=2, ensure_ascii=False).replace('\n', '\n    ')
    match = re.search(r'^  ' + re.escape(json.dumps(family)) + r': (\{)', text, re.M)
    if not match:
        block = json.dumps({id: asset}, indent=2, ensure_ascii=False).replace('\n', '\n  ')
        return text.rstrip()[:-1].rstrip() + ',\n  ' + json.dumps(family) + ': ' + block + '\n}\n'
    start = match.start(1)
    _, length = json.JSONDecoder().raw_decode(text[start:])
    body = text[start:start + length]
    entry = re.search(r'^    ' + re.escape(json.dumps(id)) + r': (\{)', body, re.M)
    if entry:
        es = entry.start(1)
        _, el = json.JSONDecoder().raw_decode(body[es:])
        body = body[:es] + rendered + body[es + el:]
    else:
        closing = body.rfind('\n  }')
        body = body[:closing].rstrip() + ',\n    ' + json.dumps(id) + ': ' + rendered + body[closing:]
    return text[:start] + body + text[start + length:]


def reviews(manifest):
    # The initial eleven Wicks and ten Outburst tests are followed by batches of ten.
    production = manifest['icons'][21:]
    for start in range(0, len(production), 10):
        items = production[start:start + 10]
        for size in [40, 64]:
            columns = min(5, len(items))
            sheet = Image.new('RGB', (columns * 160, ((len(items) + columns - 1) // columns) * (size + 45)), '#10151F')
            draw = ImageDraw.Draw(sheet)
            for n, a in enumerate(items):
                x, y = n % columns * 160, n // columns * (size + 45)
                im = Image.open(ROOT / a['exports'][str(size)]).convert('RGBA')
                sheet.paste(im, (x + (160 - size) // 2, y + 5), im)
                draw.text((x + 4, y + size + 12), a['id'].replace('feeling-', '').replace('module-', ''), fill='white')
            path = BASE / f'reviews/batch-{start // 10 + 1:02}-{size}px.png'
            path.parent.mkdir(parents=True, exist_ok=True)
            sheet.save(path)
    for family in ['prayers', 'perks', 'calls', 'feelings', 'modules']:
        items = [a for a in manifest['icons'] if a['family'] == family]
        if not items:
            continue
        for size in [40, 44, 64]:
            columns = min(5, len(items))
            sheet = Image.new('RGB', (columns * 160, ((len(items) + columns - 1) // columns) * (size + 45)), '#10151F')
            draw = ImageDraw.Draw(sheet)
            for n, a in enumerate(items):
                x, y = n % columns * 160, n // columns * (size + 45)
                im = Image.open(ROOT / a['exports'][str(size)]).convert('RGBA')
                sheet.paste(im, (x + (160 - size) // 2, y + 5), im)
                draw.text((x + 4, y + size + 12), a['id'].replace('feeling-', '').replace('module-', ''), fill='white')
            p = BASE / f'reviews/{family}-{size}px.png'
            p.parent.mkdir(parents=True, exist_ok=True)
            sheet.save(p)
        readme = ROOT / f'art/icons/{family}/README.md'
        if not readme.exists() or family in ['calls', 'feelings', 'modules']:
            text = f'# {family.title()} — 12 November review candidates\n\n'
            text += 'Pure white ink on transparency; image_gen drawings, technically separated and resized. Not production approved. '
            text += 'Sources, exact prompts, reference hashes, delivery manifest and 40/44/64px reviews are in `art/_archive/deliveries/2026-11-12/`.\n\n'
            text += '\n'.join(f'- `{a["id"]}.png`: {a["action"]}' for a in items) + '\n'
            if family in ['feelings', 'modules']:
                text += '\nLeon approved both test-set family styles for continued production. Individual images remain review candidates, production_approved:false.\n'
            readme.write_text(text)


def export(id, source):
    queue = json.loads((BASE / 'queue.json').read_text())
    j = next(j for j in queue if j['id'] == id)
    if j['status'] == 'delivered':
        raise ValueError('Already delivered; use a new versioned revision rather than overwriting')
    source_path = BASE / f'sources/{id}.png'
    source_path.parent.mkdir(parents=True, exist_ok=True)
    if source_path.exists() and sha(source_path) != sha(source):
        raise ValueError('Preserve existing source; this source differs')
    if source.resolve() != source_path.resolve():
        shutil.copy2(source, source_path)
    target = ROOT / j['path']
    catalog_path = ROOT / 'art/catalog.json'
    catalog = json.loads(catalog_path.read_text())
    old = catalog.get(j['family'], {}).get(id)
    previous = None
    if target.exists():
        previous = ROOT / f'art/_archive/icons/{j["family"]}/2026-11-12/{target.name}'
        previous.parent.mkdir(parents=True, exist_ok=True)
        if previous.exists():
            raise ValueError('Replacement archive exists; inspect before overwriting')
        shutil.copy2(target, previous)
        for path in (old or {}).get('exports', {}).values():
            src = ROOT / path
            dst = previous.parent / 'exports' / src.parent.name / src.name
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)
    im = master(source_path)
    target.parent.mkdir(parents=True, exist_ok=True)
    im.save(target)
    preserved = BASE / f'masters/v1/{id}.png'
    preserved.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(target, preserved)
    exports = {}
    for size in SIZES:
        path = target.parent / f'exports/{size}/{target.name}'
        path.parent.mkdir(parents=True, exist_ok=True)
        separate_ink(im.resize((size, size), Image.Resampling.LANCZOS)).save(path)
        exports[str(size)] = rel(path)
    asset = dict(old or {})
    asset.update(id=id, label=j['action'].split('.')[0], path=rel(target), sha256=sha(target),
                 width=1024, height=1024, background='transparent', ink='#FFFFFF',
                 status='review-candidate', production_approved=False, exports=exports,
                 collection='2026-11-12-art-requests', source=rel(source_path),
                 prompt=rel(BASE / f'prompts/{id}.txt'), note='New image_gen drawing; technical white-ink separation and UI exports only.')
    if previous:
        asset['previous_path'] = rel(previous)
    catalog.setdefault(j['family'], {})[id] = asset
    # Keep existing catalog formatting, including escaped non-ASCII labels.
    catalog_path.write_text(set_catalog_entry(catalog_path.read_text(), j['family'], id, asset))
    mp = BASE / 'manifest.json'
    manifest = json.loads(mp.read_text()) if mp.exists() else {'status': 'review-candidate', 'production_approved': False, 'icons': []}
    manifest['icons'].append({**record(target), 'id': id, 'family': j['family'], 'action': j['action'],
                              'source': record(source_path), 'master': record(preserved),
                              'prompt': record(BASE / f'prompts/{id}.txt'), 'exports': exports,
                              'references': [record(ROOT / p) for p in j['references']]})
    dump(mp, manifest)
    j['status'] = 'delivered'
    dump(BASE / 'queue.json', queue)
    progress = json.loads((BASE / 'progress.json').read_text())
    progress['delivered'] = [j['id'] for j in queue if j['status'] == 'delivered']
    progress['remaining_now'] = [j['id'] for j in queue if j['status'] != 'delivered']
    progress['updated_utc'] = datetime.now(timezone.utc).isoformat()
    dump(BASE / 'progress.json', progress)
    reviews(manifest)
    (BASE / 'README.md').write_text('# 12 November art delivery\n\nReview candidates; production_approved:false. '
        'Source branch: claude/charming-gauss-hbq4n0, dd35e4b8. Destination: art/briefs-complete. '
        'The brief heading says13 Wick icons, but its table and ART-REQUESTS enumerate11. '
        'This run covers those11 plus25 feelings,38 modules and3 UI marks. Leon approved both test-set styles for continued production. '
        'Optional maps require current tile guides. No planned equipment or campaign maps are drawn.\n\n'
        + f'Delivered: {len(progress["delivered"])}/{len(queue)}. See progress.json, manifest.json, queue.json, prompts/, sources/, masters/v1/ and reviews/.\n')
    remaining = progress['remaining_now']
    (BASE / 'HANDOFF.md').write_text(
        '# Continue the 12 November art brief\n\n'
        '**Destination: `art/briefs-complete`; keep develop and the implementer branch untouched.** '
        'The prompt file was found on `claude/charming-gauss-hbq4n0` at `dd35e4b8`; it was safely fast-forwarded into this art branch. '
        'No force pushes. Fetch current refs and preserve any subsequent implementer work before continuing.\n\n'
        f'Actual delivered: **{len(progress["delivered"])}/{len(queue)}**. '
        'Every delivered image was generated with image_gen, shown in chat, technically exported, validated, committed and pushed before the next render. '
        'New art is review-candidate with production_approved:false. The exact delivered list is progress.json; production selections and source/reference hashes are manifest.json.\n\n'
        '## Next work\n\n'
        + ('Next image: **`' + remaining[0] + '`**.\n\n' if remaining else 'The full requested icon queue is drawn; finish validation and the handoff. Optional maps still require confirmed layout guides.\n\n')
        + 'Remaining ordered queue: ' + (', '.join('`' + x + '`' for x in remaining) or 'none in the current stage') + '.\n\n'
        'Read `art/AGENTS.md`, `art/README.md`, `art/style-guide/PHC-Style-Guide.md`, `art/icons/STYLE-LOCK.md`, '
        '`art/briefs/GPT-PROMPTS-2026-11-12.md` and its linked current request/rules documents. '
        'Read queue.json in this folder: it contains exact prompts, reference paths and delivered flags. **Do not skip Both Hands just because its id exists:** its replacement is already delivered here and its stand-in is preserved in art/_archive/icons/perks/2026-11-12/. '
        'Do not rely on the Wick section heading13: the table and ART-REQUESTS enumerate11 (Rebuke, Both Hands, nine Calls).\n\n'
        '## Per-image workflow\n\n'
        '1. Select the next pending job in queue.json. Inspect its reference images, attach them, and call image_gen with transparency and the exact prompt. No parallel renders. '
        'Avoid copying the master’s bowl/arrows; Order and Brief first attempts are retained as rejected sources.\n'
        '2. Show the generated image in chat immediately. Copy/checkpoint its source without deleting the generated original. '
        'If reviewing an edit, preserve every attempt and prompt. Creative revisions must use image_gen; Python is only for technical separation, sizing and contact sheets.\n'
        '3. From repository root run `python3 tools/art/export_nov12_icons.py --id ID --source /absolute/generated.png`. '
        'This retains source/master/prompt, archives replaced production files, writes1024 RGBA +256/128/64/56/48/44/40 exports, catalog, progress and reviews. '
        'It refuses delivered ids and conflicting sources; use versioned revisions for corrections.\n'
        '4. Inspect the corresponding40/44/64px reviews. Run `python3 tools/validate_art.py --asset ID` and `git diff --check`. '
        'Check their exit status before committing. Commit only this art/tooling work and push `git push origin art/briefs-complete`; wait for successful push before next image. '
        'On a push conflict safely sync and push the existing render; do not redraw.\n\n'
        '## Review gates and final handoff\n\n'
        'The complete icon queue is11 Wick icons,25 feeling glyphs,38 module icons and3 UI marks,77 total. '
        'Leon explicitly approved both ten-icon test-set styles and said to continue. No further initial-test approval is pending. Keep individual art production_approved:false. Do not claim the full commission complete until all77 are actually delivered. '
        'An async question asks which optional map layouts are approved: no answer is recorded yet. Generate current tile guides before any map painting; Proving Ground additionally needs its playtest gate. '
        'Do not start M813/sketch maps or equipment paintings, which are on hold. No title-screen, 3D Narrator, completed animation or old180-icon redraws.\n\n'
        'At the stage end update ART-REQUESTS statuses and this handoff accurately, refresh hashes with `python3 tools/rehash_art_checksums.py`, '
        'run `python3 tools/validate_art.py` and `git diff --check`, push final handoff and verify clean worktree and matching remote. '
        'Build asset exports if appropriate; Calls still require implementer UI wiring (do not alter gameplay).\n\n'
        'If image quota returns a limit, save its **exact returned reset timestamp and response** in progress.json and a checkpoint file, '
        'record next pending id and remaining work here, commit/push the handoff, and do not retry before reset. Leon explicitly requested a handoff so another GPT can continue if usage is exhausted.\n')
    sys.path.insert(0, str(ROOT / 'tools'))
    from rehash_art_checksums import main
    main()
    print(f'Exported {id}; {len(progress["delivered"])}/{len(queue)}')


def validate_delivery(selected=None):
    mp = BASE / 'manifest.json'
    if not mp.exists():
        return
    catalog = json.loads((ROOT / 'art/catalog.json').read_text())
    manifest = json.loads(mp.read_text())
    for a in manifest['icons']:
        entry = catalog[a['family']][a['id']]
        assert entry['sha256'] == a['sha256'] == sha(ROOT / a['path']), a['id'] + ' hash'
        assert entry['status'] == 'review-candidate' and entry['production_approved'] is False, a['id'] + ' approval'
        for rec in [a['source'], a['master'], a['prompt'], *a['references']]:
            assert sha(ROOT / rec['path']) == rec['sha256'], rec['path']
        if selected and selected != a['id']:
            continue
        for size, path in [('1024', a['path']), *a['exports'].items()]:
            im = Image.open(ROOT / path)
            assert im.mode == 'RGBA' and im.size == (int(size), int(size)), path
            assert im.getchannel('A').getextrema() == (0, 255), path + ' transparency'
            assert all((r, g, b) == (255, 255, 255) for r, g, b, alpha in im.get_flattened_data() if alpha), path + ' white ink'
            box = im.getbbox()
            assert box and box[0] > 0 and box[1] > 0 and box[2] < im.width and box[3] < im.height, path + ' margins'
    target = len(json.loads((BASE / 'queue.json').read_text()))
    print(f'OK: 12 November delivery {len(manifest["icons"])}/{target}; source/master/catalog hashes, candidate status and white RGBA exports ({selected or "all"}).')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--id', required=True)
    p.add_argument('--source', type=Path, required=True)
    args = p.parse_args()
    export(args.id, args.source)
