#!/usr/bin/env python3
# Art pipeline helper from the 2026 deliveries (moved from scripts/ in 0.0.1). It was written for the old per-delivery
# folders (revisions/vN, previews/, sources/); its paths were rewritten to where those files are now, but before reusing it
# for new work, point its outputs at the 0.0.1 layout in art/README.md (production flat by use, the rest in art/_archive/).
"""Technical exports and provenance for the current M813 campaign queue.

Requires Pillow. All creative artwork is generated with image_gen; this script
only preserves sources, resizes finished paintings and writes handoff metadata.
"""
import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageOps

from export_wick_icon import ROOT, dump, relative, sha, update_checksums

QUEUE = ROOT / 'art/briefs/m813-tutorial/production-queue.json'
HANDOFF = ROOT / 'art/_archive/campaigns/m813/tutorial-v1'


def export(asset_id, source, prompt_path=None, revision=None, tile_fit=False):
    queue = json.loads(QUEUE.read_text())
    job = next(j for j in queue['jobs'] if j['id'] == asset_id)
    catalog = json.loads((ROOT / 'art/catalog.json').read_text())
    previous = catalog.get(job['family'], {}).get(asset_id)
    if previous and not revision:
        raise ValueError('Already delivered; use a versioned revision instead of overwriting: ' + asset_id)
    if revision:
        job = dict(job, path=str(Path(job['path']).parent / 'revisions' / f'v{revision}' / Path(job['path']).name))
    path = ROOT / job['path']
    path.parent.mkdir(parents=True, exist_ok=True)
    src = path.parent / 'sources' / (asset_id + '.png')
    src.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(source, src)
    original = Image.open(src)
    size = tuple(job['dimensions'])
    # Small model canvas-ratio differences are corrected only in technical export.
    if job['mode'] == 'RGBA':
        # A generated sprite may use a wide source canvas. Preserve its whole
        # silhouette and transparent margins rather than cropping to the tile.
        sprite = original.convert('RGBA')
        if tile_fit:
            bounds = sprite.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
            if bounds is None:
                raise ValueError('Sprite has no visible body')
            sprite = sprite.crop(bounds)
        box = tuple(round(n * .8) for n in size) if tile_fit else size
        small = ImageOps.contain(sprite, box, Image.Resampling.LANCZOS)
        im = Image.new('RGBA', size, (0, 0, 0, 0))
        im.paste(small, ((size[0] - small.width) // 2, (size[1] - small.height) // 2))
    else:
        im = ImageOps.fit(original.convert(job['mode']), size, Image.Resampling.LANCZOS)
    if job['mode'] == 'RGBA':
        lo, hi = im.getchannel('A').getextrema()
        if lo != 0 or hi == 0:
            raise ValueError('Sprite source must have genuine transparent background')
    im.save(path)
    previews = {}
    for box in ([128, 64, 46] if job['group'] == 'E' else [320]):
        small = im.copy()
        small.thumbnail((box, box), Image.Resampling.LANCZOS)
        preview = path.parent / 'previews' / f'{asset_id}-{box}px.png'
        preview.parent.mkdir(parents=True, exist_ok=True)
        small.save(preview)
        previews[str(box)] = relative(preview)
    item = dict(job, width=size[0], height=size[1], sha256=sha(path),
                source_path=relative(src), source_sha256=sha(src),
                source_dimensions=list(original.size), previews=previews,
                status='review-candidate', production_approved=False,
                collection='M813 tutorial campaign v1', brief=queue['brief'])
    item.update(label='M813 — ' + job['name'], campaign_id='m813',
                art_mode='painted-topdown' if job['group'] == 'E' else 'heavenprint',
                version=2 if job['group'] in ('A', 'B', 'D') else 1,
                usage={'A': ['zone-banner'], 'B': ['character-portrait', 'map-token'],
                       'C': ['map-background'], 'D': ['story-moment'], 'E': ['object-sprite']}[job['group']])
    if job['id'] == 'm813-shield-line':
        item['usage'].append('campaign-card')
    if job['group'] == 'B':
        item.update(collection='m813', pool='m813-cast')
    if job['group'] == 'E' and tile_fit:
        item['tile_extent'] = .8
    if revision:
        item.update(previous_path=previous.get('previous_path', previous['path']),
                    previous_revision_path=previous['path'], revision=revision)
    if prompt_path:
        prompt = path.parent / 'sources' / (asset_id + '.prompt.txt')
        shutil.copy2(prompt_path, prompt)
        item['prompt_path'] = relative(prompt)
    catalog.setdefault(job['family'], {})[asset_id] = item
    dump(ROOT / 'art/catalog.json', catalog)
    delivered = [j['id'] for j in queue['jobs'] if j['id'] in catalog.get(j['family'], {})]
    remaining = [j['id'] for j in queue['jobs'] if j['id'] not in delivered]
    dump(HANDOFF / 'production-progress.json', {
        'brief': queue['brief'], 'target': queue['target'], 'delivered': delivered,
        'remaining': remaining, 'updated_utc': datetime.now(timezone.utc).isoformat(),
        'status': 'generation-complete-review-pending' if not remaining else 'in-progress',
        'production_approved': False,
    })
    entries = [catalog[j['family']][j['id']] for j in queue['jobs'] if j['id'] in delivered]
    dump(HANDOFF / 'manifest.json', {'brief': queue['brief'], 'status': 'review-candidate',
         'production_approved': False, 'assets': entries})
    lines = ['# M813 tutorial campaign artwork', '',
             f'{len(delivered)} of {queue["target"]} new images delivered. All are review candidates pending Leon.', '',
             'Original approved M813 paintings, portraits and icon library are preserved. Sources accompany every image; subsequent automated deliveries also retain their generation prompts.', '',
             'Use catalog IDs. Spoiler and visibility metadata gates the story images; the demand is stored under spoilers/. Later zone banners show locations without revealing their events.', '',
             'Painted maps follow the committed layout guides. Place object sprites over their reserved floor tiles. No grid or labels are baked into a map.', '',
             'All newly named cast appearances and enemy designs are proposals under the brief. B813 lighting and 258th/093 construction follow the existing approved references.', '',
             '| ID | Group | Image | Visibility |', '|---|---|---|---|']
    import os
    for a in entries:
        link = os.path.relpath(ROOT / a['path'], HANDOFF)
        lines.append(f'| `{a["id"]}` | {a["group"]} | [PNG]({link}) | {a["visibility"]} |')
    (HANDOFF / 'README.md').write_text('\n'.join(lines) + '\n')
    update_checksums()
    checksums = ROOT / 'art/checksums.sha256'
    records = dict(line.split('  ', 1)[::-1] for line in checksums.read_text().splitlines())
    for script in ('tools/art/export_m813_campaign.py', 'tools/validate_art.py'):
        records[script] = sha(ROOT / script)
    checksums.write_text(''.join(records[p] + '  ' + p + '\n' for p in sorted(records)))
    print(f'Exported {asset_id}: {len(delivered)}/{queue["target"]} delivered, {len(remaining)} remaining')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--id', required=True)
    parser.add_argument('--source', type=Path, required=True)
    parser.add_argument('--prompt', type=Path)
    parser.add_argument('--revision', type=int, help='Preserve previous selection in a versioned folder')
    parser.add_argument('--tile-fit', action='store_true', help='Technical sprite export: center visible bounds in the 80% tile box')
    args = parser.parse_args()
    export(args.id, args.source, args.prompt, args.revision, args.tile_fit)
