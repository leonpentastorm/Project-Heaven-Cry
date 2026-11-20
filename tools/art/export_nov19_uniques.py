#!/usr/bin/env python3
"""Technical exports for the Nov19 files05/07 paintings. Never draws artwork."""
import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from export_nov12_icons import set_catalog_entry

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'art/_archive/gear/2026-11-19-unique-melee-bow'
SIZES = (256, 128, 64, 32)


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rel(path):
    return path.relative_to(ROOT).as_posix()


def record(path):
    return {'path': rel(path), 'sha256': sha(path)}


def dump(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')


def normalize(source, kind):
    image = Image.open(source).convert('RGBA')
    # Technical alpha cleanup only. Preserve painted RGB and source separately.
    alpha = image.getchannel('A').point(lambda n: 0 if n < 8 else (255 if n >= 248 else n))
    if alpha.getextrema()[0] != 0:
        raise ValueError('Source must already have transparent background')
    image.putalpha(alpha)
    box = alpha.getbbox()
    if not box:
        raise ValueError('Empty source')
    image = image.crop(box)
    limit = 870 if kind == 'shield' else 820
    image.thumbnail((limit, limit), Image.Resampling.LANCZOS)
    canvas = Image.new('RGBA', (1024, 1024))
    canvas.paste(image, ((1024 - image.width) // 2, (1024 - image.height) // 2))
    return canvas


def reviews(queue, manifest):
    delivered = {a['id']: a for a in manifest['assets']}
    folder = BASE / 'reviews'
    folder.mkdir(exist_ok=True)
    font = ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf', 12)
    extras = {
        '05-axes': ['weapon-war_axe'],
        '05-polearms-spear---glaive---lance': ['weapon-lance'],
        '07-helmets': ['armour-field_helmet'],
        '07-boots': ['armour-heavy_boots'],
    }
    for family in sorted({j['family'] for j in queue if j['id'] in delivered}):
        jobs = [j for j in queue if j['family'] == family]
        paths = list(dict.fromkeys(p for j in jobs for p in j['family_references']))
        for stem in extras.get(family, []):
            p = f'art/icons/gear/{stem}.png'
            if (ROOT / p).is_file() and p not in paths:
                paths.append(p)
        paths.extend(j['path'] for j in jobs if j['id'] in delivered)
        for size in (64, 32):
            columns = min(5, len(paths))
            sheet = Image.new('RGB', (columns * 220, ((len(paths)+columns-1)//columns) * (size+60)+32), '#10151F')
            draw = ImageDraw.Draw(sheet)
            draw.text((10, 6), f'{family} | actual {size}px | family Standard + new Unique', font=font, fill='white')
            for n, p in enumerate(paths):
                x, y = n % columns * 220, n // columns * (size+60)+32
                image = Image.open(ROOT / p).convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)
                sheet.paste(image, (x+(220-size)//2, y), image)
                label = Path(p).stem
                label = label.partition('-')[2]
                draw.text((x+7, y+size+8), label, font=font, fill='white')
            sheet.save(folder / f'{family}-{size}px.png')


def update_handoff(queue,progress):
    if BASE.name == '2026-11-20-sole-uniques':
        (BASE/'HANDOFF.md').write_text('# Sole artist unique shields\n\n'
            f'{len(progress["delivered"])}/{len(queue)} selected candidates; project {508 + len(progress["delivered"])}/871. '
            'Branch art/2026-11-20-reset-continuation; run sole-20261120-1615; issue3 claim7045298880. '
            'All review-candidate, production_approved:false, implementation_ready:false. '
            'Native bytes, prompt/reference hashes, versioned master and exports retained. '
            'Remaining: '+(', '.join(progress['remaining']) or 'none')+'. '
            'Read live issue3/all comments and current remote deliveries before every render; push each picture before next. '
            'No prior moderation retry, no develop mutation. Imports/exports/attempts count0.\n')
        return
    (BASE/'HANDOFF.md').write_text('# Unique melee and bow delivery\n\n'
        f'**{len(progress["delivered"])}/8 unique paintings delivered** on `art/2026-11-19-unique-melee-bow`. '
        'File08 sectionD entries1–7 and15 only. Review candidates, production_approved:false; no grade variants.\n\n'
        'Each generated picture is shown, exported, validated, committed and pushed before the next. '
        'Native sources, versioned1024RGBA masters,256/128/64/32 exports, exact prompts, source brief, '
        'reference hashes and64/32px comparisons are retained. SVG references are rasterized only for attachment; originals are retained. '
        'No old production picture is overwritten.\n\n'
        'Other instance: unique entries17 and19–23 on `art/2026-11-19-unique-gear`. '
        'Claim/free-work history: `art/briefs/prompts-2026-11-19/WORK-CLAIMS.md`. '
        'No rejected prompt is rewritten to bypass service moderation.\n\n'
        'Remaining: '+(', '.join(progress['remaining']) or 'none')+'.\n\n'
        'This branch includes the earlier39 files05/07 paintings and3 merged File10 repaints; those are not new unique deliveries. '
        'Full-library validation requires a full checkout; omitted historical checksums are preserved with HEAD provenance checks. '
        'Develop and other workers’ branches are untouched.\n')


def export(asset_id, source):
    queue = json.loads((BASE / 'queue.json').read_text())
    job = next(j for j in queue if j['id'] == asset_id)
    if job['status'] != 'pending':
        raise ValueError('Already delivered: preserve revisions in a new version')
    target = ROOT / job['path']
    if target.exists():
        raise ValueError('Preserve existing production artwork; inspect before replacement')
    source_target = BASE / f'sources/v1/{asset_id}.png'
    source_target.parent.mkdir(parents=True, exist_ok=True)
    if source_target.exists() and sha(source_target) != sha(source):
        raise ValueError('A different source already exists; preserve it')
    shutil.copy2(source, source_target)
    image = normalize(source_target, job['kind'])
    image.save(target)
    master = BASE / f'masters/v1/{asset_id}.png'
    master.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(target, master)
    exports = {}
    for size in SIZES:
        path = target.parent / f'exports/{size}/{target.name}'
        path.parent.mkdir(parents=True, exist_ok=True)
        exported = image.resize((size, size), Image.Resampling.LANCZOS)
        # A shield fills85% of the frame; Lanczos can reach the32px border.
        # Match the existing gear delivery's one-pixel transparent UI guard.
        alpha = exported.getchannel('A')
        ImageDraw.Draw(alpha).rectangle((0, 0, size-1, size-1), outline=0, width=1)
        exported.putalpha(alpha)
        exported.save(path)
        exports[str(size)] = rel(path)
    asset = {
        'label': job['label'], 'path': rel(target), 'sha256': sha(target),
        'width': 1024, 'height': 1024, 'background': 'transparent',
        'status': 'review-candidate', 'production_approved': False,
        'implementation_ready': False,
        'exports': exports, 'source_path': rel(source_target),
        'native_dimensions': list(Image.open(source_target).size),
        'brief': job['brief'], 'brief_number': job['brief_number'],
        'collection': '2026-11-19-unique-melee-bow', 'grade': 'unique',
        'origin': 'image_gen; technical crop/alpha separation/uniform downsample only',
    }
    catalog = ROOT / 'art/catalog.json'
    catalog.write_text(set_catalog_entry(catalog.read_text(), 'gear', asset_id, asset))
    manifest = json.loads((BASE / 'manifest.json').read_text())
    manifest['assets'].append({
        'id': asset_id, **record(target), 'label': job['label'], 'family': job['family'],
        'source': record(source_target), 'master': record(master),
        'prompt': record(BASE / f'prompts/{asset_id}.txt'),
        'references': [record(ROOT / p) for p in job['references']],
        'reference_sources': [record(ROOT / p) for p in job.get('reference_sources', [])],
        'native_dimensions': asset['native_dimensions'], 'exports': exports,
        'export_hashes': {size: sha(ROOT / p) for size, p in exports.items()},
        'grade': 'unique', 'status': 'review-candidate', 'production_approved': False,
        'implementation_ready': False,
    })
    dump(BASE / 'manifest.json', manifest)
    job['status'] = 'delivered'
    dump(BASE / 'queue.json', queue)
    progress = json.loads((BASE / 'progress.json').read_text())
    progress.update(status='drawing', delivered=[j['id'] for j in queue if j['status']=='delivered'],
                    remaining=[j['id'] for j in queue if j['status']=='pending'],
                    updated_utc=datetime.now(timezone.utc).isoformat())
    dump(BASE / 'progress.json', progress)
    reviews(queue, manifest)
    update_handoff(queue, progress)
    sys.path.insert(0, str(ROOT / 'tools'))
    from rehash_art_checksums import main
    main()
    print(f'Exported {asset_id}: {len(progress["delivered"])}/{len(queue)}')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id', required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--delivery-root', type=Path)
    args = parser.parse_args()
    if args.delivery_root:
        BASE = (ROOT / args.delivery_root).resolve()
        BASE.relative_to(ROOT / 'art/_archive/gear')
    export(args.id, args.source)
