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
BASE = ROOT / 'art/_archive/gear/2026-11-19-melee-armour'
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


def normalize(source, kind, span=None):
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
    limit = round(1024*span) if span is not None else (870 if kind == 'shield' else 820)
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
            draw.text((10, 6), f'{family} | actual {size}px | existing + new Standard', font=font, fill='white')
            for n, p in enumerate(paths):
                x, y = n % columns * 220, n // columns * (size+60)+32
                image = Image.open(ROOT / p).convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)
                sheet.paste(image, (x+(220-size)//2, y), image)
                label = Path(p).stem
                label = label.partition('-')[2]
                draw.text((x+7, y+size+8), label, font=font, fill='white')
            sheet.save(folder / f'{family}-{size}px.png')


def update_handoff(queue, progress):
    if BASE.name == '2026-11-21-retry-standards':
        (BASE/'HANDOFF.md').write_text('# Current new Standard candidates\n\n'+str(len(progress['delivered']))+'/'+str(len(queue))+' selected, run sole-20261121-0109, same artbranch. Remaining: '+', '.join(progress['remaining'])+'. Allapprovalflagsfalse, native/prompt/refhashes retained. SourceStandards are newrequestedpictures, noimportsoroldrepaints counted. Readliveissue3+allcomments+remotedeliveries beforeEVERYrender, pushEVERYpicture. Gradefollowers mustuse selectednewmaster, notlegacyreference. Actualquota: '+str(progress.get('image_quota'))+'.\n')
        return
    done, remaining = progress['delivered'], progress['remaining']
    next_job = remaining[0] if remaining else 'none — finish final handoff/checks'
    (BASE / 'HANDOFF.md').write_text(
        '# Files05 and07 — 19 November gear handoff\n\n'
        f'Branch: `art/2026-11-19-melee-armour`, from develop `2020b5c2`. **{len(done)}/39 Standard paintings delivered.** '
        f'Next: `{next_job}`. Exact remaining order is progress.json / queue.json.\n\n'
        'This worker claims file05 (19 melee) and file07 (6 shields +14 armour). Another GPT owns files01–04. '
        'Files06/08/09/10 are unclaimed by this worker. No work on the other GPT’s files, title screen, old icons or pet.\n\n'
        'Each selected drawing uses image_gen, is shown in chat, exported, validated, committed and pushed before the next drawing. '
        'Masters: art/icons/gear/<exact-brief-filename>.png, 1024RGBA. Exports:256/128/64/32. '
        'Native sources, versioned masters, prompts, original brief snapshots, reference hashes and64/32px family comparisons are retained here. '
        'Every new asset remains review-candidate, production_approved:false. No existing production art is overwritten.\n\n'
        'These39 upcoming Items2.0 ids are not live weapon/item records yet. No stats or aliases were invented. '
        'The existing gear builder already resolves their future keys as gear-<item_id>. '
        'Fine/Masterwork/Relic/Celestial require approved Standard masters and file08’s proof-sheet gate; they are not part of this batch.\n\n'
        'Resume: fetch latest refs safely; read art/AGENTS.md, art/README.md, the guide and gear/weapon rules, '
        'source briefs and this queue. Inspect each job’s actual references and attach all of them to image_gen. '
        'Use `python3 tools/art/export_nov19_gear.py --id ID --source /absolute/source.png`, then '
        '`python3 tools/validate_nov19_gear.py --asset ID` and `git diff --check`. '
        'Commit and push only this branch before drawing next; preserve the existing rendered commit on push conflicts. '
        'Do not regenerate delivered ids; revisions need new versioned sources/masters.\n\n'
        'This cloud worktree is sparse due the disk cap. The sparse-aware rehasher preserves untouched omitted historical records '
        'only after checking their index/HEAD/checksum provenance, and explicitly does not claim their pixels or bytes were read locally. '
        'Run the whole-library art validator on a full checkout before integration; targeted delivery validation covers all new images here. '
        'Do not change historical delivery counts or manifests. Catalog/checksum merges must preserve the other worker’s entries.\n\n'
        'On image quota: save the exact error and reset timestamp in progress.json, checkpoint the next pending id, '
        'finish unaffected checks, commit/push a concrete handoff, and never retry before reset.\n')


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
    image = normalize(source_target, job['kind'], job.get('span'))
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
        'status': 'review-candidate', 'production_approved': False, 'implementation_ready': False,
        'exports': exports, 'source_path': rel(source_target),
        'native_dimensions': list(Image.open(source_target).size),
        'brief': job['brief'], 'brief_number': job['brief_number'],
        'collection': BASE.name, 'grade': 'standard',
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
        'grade': 'standard', 'status': 'review-candidate', 'production_approved': False, 'implementation_ready': False,
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
