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
                text += '\nTest set only. Await Leon’s verdict before the rest, as requested in the Outburst brief.\n'
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
        'This run covers those11 plus the6-feeling/4-module test set; remaining Outburst art awaits Leon’s verdict. '
        'Optional maps require current tile guides. No planned equipment or campaign maps are drawn.\n\n'
        + f'Delivered: {len(progress["delivered"])}/21. See progress.json, manifest.json, queue.json, prompts/, sources/, masters/v1/ and reviews/.\n')
    sys.path.insert(0, str(ROOT / 'tools'))
    from rehash_art_checksums import main
    main()
    print(f'Exported {id}; {len(progress["delivered"])}/21')


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
    print(f'OK: 12 November delivery {len(manifest["icons"])}/21; source/master/catalog hashes, candidate status and white RGBA exports ({selected or "all"}).')


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--id', required=True)
    p.add_argument('--source', type=Path, required=True)
    args = p.parse_args()
    export(args.id, args.source)
