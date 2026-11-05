#!/usr/bin/env python3
"""Technical PNG exports for generated Wick art. Requires Pillow; does not draw art.

Run with --source PATH --id DATA-ID --queue PATH [--revision]. Originals remain
untouched. Each run updates the catalog, collection manifest, UI-size review sheets,
progress record and checksums so it can be committed and pushed on its own.
"""
import argparse
import hashlib
import json
import math
from pathlib import Path

from PIL import Image, ImageChops, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
SIZES = (256, 128, 64, 56, 48, 44, 40)
PROGRESS = ROOT / 'art/traits/wick/production-progress.json'


def dump(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def relative(path):
    return str(path.relative_to(ROOT))


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def separate_ink(im):
    """One ink separation: dark marks are cutouts, alpha carries edge coverage."""
    im = im.convert('RGBA')
    mask = im.convert('RGB').convert('L').point(lambda n: 255 if n >= 128 else 0)
    alpha = ImageChops.multiply(im.getchannel('A'), mask)
    alpha = alpha.point(lambda n: 255 if n >= 250 else (0 if n < 8 else n))
    out = Image.new('RGBA', im.size, (255, 255, 255, 0))
    out.putalpha(alpha)
    return out


def master(source):
    im = separate_ink(Image.open(source))
    bbox = im.getchannel('A').point(lambda n: 255 if n >= 16 else 0).getbbox()
    if bbox is None:
        raise ValueError('Source has no visible ink')
    im = im.crop(bbox)
    im.thumbnail((860, 860), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (1024, 1024), (255, 255, 255, 0))
    canvas.paste(im, ((1024 - im.width) // 2, (1024 - im.height) // 2))
    return separate_ink(canvas)


def font(size=13):
    path = Path('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf')
    return ImageFont.truetype(str(path), size) if path.exists() else ImageFont.load_default()


def review_sheets(folder, items, label):
    items = sorted(items, key=lambda x: x['order'])
    previews = folder / 'previews'
    previews.mkdir(parents=True, exist_ok=True)
    for size in (40, 44, 48, 56, 128):
        columns = min(5, len(items))
        rows = math.ceil(len(items) / columns)
        cell_width, cell_height = 230, size + 70
        sheet = Image.new('RGB', (columns * cell_width, rows * cell_height + 42), '#10151F')
        draw = ImageDraw.Draw(sheet)
        draw.text((12, 12), f'{label} | actual {size}px | {len(items)} delivered', font=font(), fill='white')
        for n, item in enumerate(items):
            x, y = (n % columns) * cell_width, (n // columns) * cell_height + 42
            im = Image.open(ROOT / item['exports'][str(size)]).convert('RGBA')
            sheet.paste(im, (x + (cell_width - size) // 2, y), im)
            name = item['name']
            # Labels are review UI only, never inside an icon master/export.
            if len(name) > 28:
                split = name.rfind(' ', 0, 28)
                name = name[:split] + '\n' + name[split + 1:]
            draw.multiline_text((x + 8, y + size + 10), name, font=font(), fill='white')
        sheet.save(previews / f'{label.lower().replace(" ", "-")}-{size}px.png')
    columns = min(10, len(items))
    rows = math.ceil(len(items) / columns)
    sheet = Image.new('RGB', (columns * 105, rows * 220), '#10151F')
    draw = ImageDraw.Draw(sheet)
    for n, item in enumerate(items):
        col, row = n % columns, n // columns
        draw.rectangle((col * 105, row * 220 + 110, (col + 1) * 105, (row + 1) * 220), fill='#E8D8B9')
        im = Image.open(ROOT / item['exports']['64']).convert('RGBA')
        for offset in (20, 130):
            sheet.paste(im, (col * 105 + 20, row * 220 + offset), im)
    sheet.save(previews / f'{label.lower().replace(" ", "-")}-light-dark-64px.png')


def update_checksums():
    path = ROOT / 'art/checksums.sha256'
    paths = {line.split('  ', 1)[1] for line in path.read_text().splitlines()}
    paths.update(relative(p) for p in (ROOT / 'art').rglob('*') if p.is_file() and p != path)
    paths.add('scripts/export_wick_icon.py')
    path.write_text(''.join(sha(ROOT / p) + '  ' + p + '\n' for p in sorted(paths)))


def export(args):
    queue = json.loads(args.queue.read_text())
    job = next(j for j in queue if j['id'] == args.id)
    catalog = json.loads((ROOT / 'art/catalog.json').read_text())
    family = job['family']
    revision_folder = 'art/traits/wick/test-set-1/revisions' + (f'/round-{args.round}' if args.round > 2 else '')
    folder = ROOT / (revision_folder if args.revision
                     else f'art/{family}/wick/production-v1')
    path = folder / f'{job["id"]}.png'
    path.parent.mkdir(parents=True, exist_ok=True)
    im = master(args.source)
    im.save(path)
    exports = {}
    for size in SIZES:
        target = folder / f'exports/{size}/{job["id"]}.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        small = im.resize((size, size), Image.Resampling.LANCZOS)
        white = Image.new('RGBA', small.size, (255, 255, 255, 0))
        white.putalpha(small.getchannel('A'))
        white.save(target)
        exports[str(size)] = relative(target)
    previous = catalog[family].get(job['id'])
    asset = {'label': f'Wick — {job["name"]}', 'collection': 'wick-test-set-1-revisions' if args.revision else 'wick-production-v1',
             'path': relative(path), 'sha256': sha(path), 'width': 1024, 'height': 1024,
             'background': 'transparent', 'ink': '#FFFFFF', 'usage': 'trait icon' if family == 'traits' else 'perk icon',
             'data_id': job['data_id'], 'status': 'review-candidate', 'production_approved': False,
             'batch': 'revisions' if args.revision else job['batch'], 'exports': exports}
    if args.revision:
        asset['revision'] = args.round
        asset['previous_path'] = previous.get('previous_path', previous['path'])
        if args.round > 2:
            asset['previous_revision_path'] = (previous.get('previous_revision_path')
                if previous['path'] == relative(path) else previous['path'])
    catalog[family][job['id']] = asset
    dump(ROOT / 'art/catalog.json', catalog)
    manifest_path = folder / 'manifest.json'
    manifest = json.loads(manifest_path.read_text()) if manifest_path.exists() else {
        'collection': asset['collection'], 'version': 1, 'status': 'review-candidate',
        'production_approved': False, 'brief': 'art/briefs/wick-production-icons.md',
        'workflow': 'Leon requested seven fixes first, then the full run with each new icon pushed and shown immediately.',
        'icons': []}
    entry = {k: job[k] for k in ('id', 'data_id', 'name', 'family', 'order', 'mood', 'action', 'screen', 'prop')}
    entry.update(path=relative(path), exports=exports, batch=asset['batch'], source_sha256=sha(args.source))
    if args.revision:
        entry['previous_path'] = asset['previous_path']
        entry['revision'] = args.round
        if 'previous_revision_path' in asset:
            entry['previous_revision_path'] = asset['previous_revision_path']
    manifest['icons'] = [i for i in manifest['icons'] if i['id'] != job['id']] + [entry]
    manifest['icons'].sort(key=lambda x: (x['family'], x['order']))
    dump(manifest_path, manifest)
    batch_items = [i for i in manifest['icons'] if i['batch'] == asset['batch']]
    review_sheets(folder, batch_items, f'Revisions round {args.round}' if args.revision else f'Batch {job["batch"]}')
    preview = folder / 'previews/latest.png'
    bg = Image.new('RGBA', im.size, '#10151F')
    bg.alpha_composite(im)
    bg.convert('RGB').save(preview)
    progress = json.loads(PROGRESS.read_text()) if PROGRESS.exists() else {
        'target': {'traits': 74, 'perks': 76}, 'existing_approved_art': 4,
        'requested_revisions': 7, 'requested_new_icons': 139,
        'workflow': 'Seven fixes first; then show and push each completed icon immediately, per Leon on 5 November 2026.',
        'revisions_delivered': [], 'new_icons_delivered': []}
    key = 'revisions_delivered' if args.revision else 'new_icons_delivered'
    if job['id'] not in progress[key]:
        progress[key].append(job['id'])
    if args.revision:
        progress.setdefault('revision_rounds', {})[job['id']] = args.round
    progress['catalog_coverage'] = {family: len(catalog[family]) for family in ('traits', 'perks')}
    dump(PROGRESS, progress)
    update_checksums()
    print(json.dumps({'id': job['id'], 'family': family, 'path': relative(path), 'preview': str(preview),
                      'revisions': len(progress['revisions_delivered']), 'new': len(progress['new_icons_delivered'])}))


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--id', required=True)
    parser.add_argument('--queue', type=Path, required=True)
    parser.add_argument('--revision', action='store_true')
    parser.add_argument('--round', type=int, default=2, help='Revision round; later rounds preserve earlier files.')
    export(parser.parse_args())
