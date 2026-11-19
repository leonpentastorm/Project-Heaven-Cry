#!/usr/bin/env python3
"""Technical exports for the Nov19 files05/07 paintings. Never draws artwork."""
import argparse
import hashlib
import json
import shutil
import sys
import textwrap
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw, ImageFont
from export_nov12_icons import set_catalog_entry

ROOT = Path(__file__).resolve().parents[2]
BASE = ROOT / 'art/_archive/gear/2026-11-19-kept-blade-grades'
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


def normalize(source,job):
    image=Image.open(source).convert('RGBA')
    alpha=image.getchannel('A').point(lambda n:0 if n<8 else (255 if n>=248 else n))
    assert alpha.getextrema()[0]==0, 'Generated source must already be transparent'
    image.putalpha(alpha);box=alpha.getbbox();assert box
    standard=Image.open(ROOT/f'art/icons/gear/{job["standard_id"]}.png').convert('RGBA')
    sb=standard.getchannel('A').point(lambda n:255 if n>=8 else 0).getbbox()
    cut=image.crop(box);ratio=min((sb[2]-sb[0])/cut.width,(sb[3]-sb[1])/cut.height)
    cut=cut.resize((round(cut.width*ratio),round(cut.height*ratio)),Image.Resampling.LANCZOS)
    canvas=Image.new('RGBA',(1024,1024));x=round((sb[0]+sb[2]-cut.width)/2);y=round((sb[1]+sb[3]-cut.height)/2)
    canvas.paste(cut,(x,y));return canvas

def outline_metrics(standard,candidate):
    from PIL import ImageChops
    a=Image.open(standard).convert('RGBA').getchannel('A');b=candidate.getchannel('A')
    aa=a.point(lambda n:255 if n>=128 else 0);bb=b.point(lambda n:255 if n>=128 else 0)
    inter=ImageChops.multiply(aa,bb).histogram()[255];union=ImageChops.lighter(aa,bb).histogram()[255]
    result={'solid_alpha_iou':inter/union,'exact_solid_outline':aa.tobytes()==bb.tobytes(),'review_required':True,'registration':'uniform scale and translation to Standard bbox; no warp, masking or redrawn pixels'}
    for size in (32,64):
        x=a.resize((size,size),Image.Resampling.LANCZOS).point(lambda n:255 if n>=128 else 0);y=b.resize((size,size),Image.Resampling.LANCZOS).point(lambda n:255 if n>=128 else 0)
        result[f'different_pixels_{size}']=size*size-ImageChops.difference(x,y).histogram()[0]
    return result


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
            draw.text((10, 6), f'{family} | actual {size}px | Standard + grade candidates', font=font, fill='white')
            for n, p in enumerate(paths):
                x, y = n % columns * 220, n // columns * (size+60)+32
                image = Image.open(ROOT / p).convert('RGBA').resize((size, size), Image.Resampling.LANCZOS)
                sheet.paste(image, (x+(220-size)//2, y), image)
                label = Path(p).stem
                label = label.partition('-')[2]
                label = label.replace('_', ' ')
                for row, line in enumerate(textwrap.wrap(label, width=26)):
                    draw.text((x+7, y+size+8+row*14), line, font=font, fill='white')
            sheet.save(folder / f'{family}-{size}px.png')


def update_handoff(queue,progress):
    rejected = {j['id'] for j in queue if j['status']=='pending' and j.get('generation_error')}
    blocked = set(rejected)
    while True:
        expanded = blocked | {j['id'] for j in queue if j['status']=='pending' and j.get('depends_on') in blocked}
        if expanded == blocked:
            break
        blocked = expanded
    done = set(progress['delivered'])
    ready = [j['id'] for j in queue if j['status']=='pending' and j['id'] not in blocked and (not j.get('depends_on') or j['depends_on'] in done)]
    quota = progress.get('image_quota', {})
    quota_text = (f'**Actual image quota stop:** `{quota["type"]}` on `{quota["asset_id"]}`. '
                  f'Reset: **{quota["reset_bangkok"]} Bangkok time** (`{quota["reset_utc"]}`, epoch {quota["resets_at"]}). '
                  'Do not request an image before this timestamp. The failed request produced no image. '
                  f'Exact response: [{quota["response_path"]}]({Path(quota["response_path"]).relative_to(rel(BASE))}).\n\n') if quota else ''
    (BASE/'HANDOFF.md').write_text('# Gear grade candidates\n\n'
        + quota_text +
        f'**{len(progress["delivered"])}/{len(queue)} grade candidates delivered** on `art/2026-11-19-kept-blade-grades`. '
        'Shared mailbox: https://github.com/leonpentastorm/Project-Heaven-Cry/issues/3 . '
        'See claim.json for this lane’s current Standards. Released overlapping blades reuse12 peer candidates, with3 local alternatives archived.\n\n'
        'Leon requested continuous candidate production; proof approval is not fabricated. All candidates remain review-candidate, '
        'production_approved:false, implementation_ready:false, with outline.review_required:true. '
        'Exact outline is measured, never asserted unless the masks match. Per-image registration is uniform scaling/translation only, '
        'without warp, silhouette masks, filled pixels or code-drawn substitutes. The generated native remains untouched.\n\n'
        'Each image is generated, shown, technically exported, validated, committed and pushed before the next. '
        'Sources, versioned masters, exact prompts/reference hashes,256/128/64/32 exports and grade comparison sheets are retained. '
        'Standards and earlier deliveries are unchanged. This sparse checkout cannot validate omitted historical files; '
        'full-library validation/build is an integration check on a full checkout.\n\n'
        'Tomorrow: fetch this branch and develop safely, read the latest issue 3 comments and this queue before drawing. '
        'Skip only delivered new candidates; preserve every source, master, correction attempt and export. '
        'Do not retry a recorded quota before its exact returned reset. Do not repeatedly resubmit moderation-blocked requests.\n\n'
        'Peer audit: [coordination/peer-audit-2026-11-19.md](coordination/peer-audit-2026-11-19.md). '
        'Peer58 masters/232 exports and12 canonical imports are integrated with versioned alpha<8 cleanup; originals are retained. '
        'See coordination/peer-import-v2/manifest.json and post-catalog VALIDATION.json (strict margins pass, solid alpha unchanged). '
        'Peer quota resets20 November2026 at09:45:39 Bangkok time; this does not establish this session’s quota.\n\n'
        'Remaining: '+', '.join(progress['remaining'])+'.\n\n'
        'Service-rejected requests (do not repeatedly resubmit): '+', '.join(sorted(rejected))+'.\n\n'
        'Waiting on rejected prerequisites: '+', '.join(sorted(blocked-rejected))+'.\n\n'
        'Ready independent next steps, in queue order: '+', '.join(ready)+'. Other pending grades follow their preceding grade.\n\n'
        'Runtime handoff: implementation_ready:false records review status but does not gate the web asset builder. '
        'The builder emits grade asset keys; the current UI gear resolver still needs grade-aware selection. '
        'Do not claim that runtime grade selection is implemented by these art deliveries.\n')


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
    image = normalize(source_target, job)
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
        'exports': exports, 'source_path': rel(source_target),
        'native_dimensions': list(Image.open(source_target).size),
        'brief': job['brief'], 'brief_number': job['brief_number'],
        'collection': '2026-11-19-kept-blade-grades', 'grade': job['grade'],
        'origin': 'image_gen; technical alpha cleanup and uniform registration only',
        'standard_id': job['standard_id'], 'implementation_ready': False,
        'outline': outline_metrics(ROOT/f'art/icons/gear/{job["standard_id"]}.png',image),
    }
    catalog = ROOT / 'art/catalog.json'
    catalog.write_text(set_catalog_entry(catalog.read_text(), 'gear', asset_id, asset))
    # Record the actual selected request, including any quality correction.
    prompt_path = BASE / f'prompts/{asset_id}.txt'
    prompt_path.parent.mkdir(parents=True, exist_ok=True)
    prompt_path.write_text(job['prompt'].rstrip() + '\n')
    manifest = json.loads((BASE / 'manifest.json').read_text())
    manifest['assets'].append({
        'id': asset_id, **record(target), 'label': job['label'], 'family': job['family'],
        'source': record(source_target), 'master': record(master),
        'prompt': record(BASE / f'prompts/{asset_id}.txt'),
        'references': [record(ROOT / p) for p in job['references']],
        'reference_sources': [record(ROOT / p) for p in job.get('reference_sources', [])],
        'native_dimensions': asset['native_dimensions'], 'exports': exports,
        'export_hashes': {size: sha(ROOT / p) for size, p in exports.items()},
        'grade': job['grade'], 'standard_id': job['standard_id'], 'outline': asset['outline'], 'status': 'review-candidate', 'production_approved': False,
    })
    dump(BASE / 'manifest.json', manifest)
    job['status'] = 'delivered'
    dump(BASE / 'queue.json', queue)
    progress = json.loads((BASE / 'progress.json').read_text())
    if progress.get('image_quota'):
        progress.setdefault('quota_history', []).append({**progress.pop('image_quota'), 'resolved_by_successful_export': asset_id})
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
    args = parser.parse_args()
    export(args.id, args.source)
