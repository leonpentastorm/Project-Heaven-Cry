#!/usr/bin/env python3
"""Build technical review layouts from existing M813 paintings; draws no artwork."""
import json
import math
import re
from pathlib import Path

from PIL import Image, ImageDraw

from export_wick_icon import ROOT, dump, font, relative, sha, update_checksums
from export_m813_campaign import HANDOFF, QUEUE


def grid(items, path, title, box=(260, 180), columns=4):
    cell_w, cell_h = box[0] + 24, box[1] + 48
    sheet = Image.new('RGB', (columns * cell_w, math.ceil(len(items) / columns) * cell_h + 36), '#10151F')
    d = ImageDraw.Draw(sheet)
    d.text((12, 10), title, font=font(15), fill='white')
    for i, a in enumerate(items):
        im = Image.open(ROOT / a['path']).convert('RGBA')
        im.thumbnail(box, Image.Resampling.LANCZOS)
        x, y = i % columns * cell_w, i // columns * cell_h + 36
        sheet.paste(im, (x + (cell_w - im.width) // 2, y), im)
        d.text((x + 8, y + box[1] + 8), a['name'], font=font(12), fill='white')
    path.parent.mkdir(parents=True, exist_ok=True)
    sheet.save(path)


def cells(ref):
    ends = re.split('[–-]', ref)
    def point(text):
        m = re.fullmatch(r'([A-P])(\d+)', text.strip())
        return ord(m[1]) - 65, int(m[2]) - 1
    a, b = point(ends[0]), point(ends[-1])
    return [(x, y) for x in range(min(a[0], b[0]), max(a[0], b[0]) + 1)
            for y in range(min(a[1], b[1]), max(a[1], b[1]) + 1)]


def object_id(zone, ob):
    name, kind = ob.get('name', '').lower(), ob['kind']
    if 'nine-nine' in name:
        return 'm813-nine-nine'
    if 'ilse' in name:
        return 'm813-ilse-varga'
    if 'novikov' in name:
        return 'm813-novikov'
    if kind == 'crate':
        return 'obj-platinum-crates' if zone == 'rear_pad' else 'obj-tool-rack'
    if kind == 'pillar':
        return 'obj-toppled-pylon' if zone == 'shield_line' else 'obj-cargo-pylon'
    if kind == 'container':
        return next((v for k, v in [('fallen', 'obj-fallen-squad'), ('triage', 'obj-triage-line'),
                    ('footlocker', 'obj-footlockers'), ('cookbook', 'obj-cookbook')] if k in name), 'obj-platinum-net')
    if kind == 'terminal':
        return 'obj-drop-pod' if 'pod' in name else 'obj-terminal-field' if zone in ('shield_line', 'rear_pad') else 'obj-console'
    if kind == 'poi':
        if 'escape craft' in name:
            return 'obj-escape-craft'
        if 'choice' in name or name == 'the repair bay':
            return 'obj-repair-cradles'
    return {'low_wall': 'obj-barrier-stakes', 'door': 'obj-door-closed', 'hole': 'obj-crater',
            'trap': 'obj-mine', 'toxic': 'obj-coolant', 'fire': 'obj-fire', 'barrel': 'obj-fuel-drum',
            'rubble': 'obj-rubble', 'lamp': 'obj-field-lamp'}.get(kind, 'obj-poi-marker')


def review():
    q = json.loads(QUEUE.read_text())
    c = json.loads((ROOT / 'art/catalog.json').read_text())
    for j in q['jobs']:
        a = c[j['family']][j['id']]
        a.update(name=j['name'], label='M813 — ' + j['name'], campaign_id='m813',
                 art_mode='painted-topdown' if j['group'] == 'E' else 'heavenprint',
                 usage={'A': ['zone-banner'], 'B': ['character-portrait', 'map-token'],
                        'C': ['map-background'], 'D': ['story-moment'], 'E': ['object-sprite']}[j['group']])
        if j['id'] == 'm813-shield-line':
            a['usage'].append('campaign-card')
        if j['group'] == 'B':
            a.update(collection='m813', pool='m813-cast', version=2)
        if j.get('zone_id'):
            a['zone_id'] = j['zone_id']
        if j.get('object_kind'):
            a['object_kind'] = j['object_kind']
    c['character_collections']['m813'].update(label='M813 — MPAT and the tutorial cast', count=18,
        version=2, use='The two retained M813 portraits plus sixteen tutorial portraits; appearance proposals pending Leon.')
    dump(ROOT / 'art/catalog.json', c)
    entries = [c[j['family']][j['id']] for j in q['jobs']]
    dump(HANDOFF / 'manifest.json', {'brief': q['brief'], 'status': 'review-candidate',
                                   'production_approved': False, 'assets': entries})
    previews = HANDOFF / 'previews'
    grid([a for a in entries if a['group'] == 'A'], previews / 'banners.png', 'M813 zone banners | 4 candidates')
    grid([a for a in entries if a['group'] == 'B'], previews / 'portraits.png', 'M813 tutorial portraits | 16 candidates', (160, 200))
    grid([a for a in entries if a['group'] == 'D'], previews / 'spoilers/story-moments.png',
         'INTERNAL STORY REVIEW | includes mid/late campaign spoilers')
    # Actual 46px transparent sprite review against dark and mid-light grounds.
    sprites = [a for a in entries if a['group'] == 'E']
    sheet = Image.new('RGB', (1000, math.ceil(len(sprites) / 5) * 160), '#10151F')
    d = ImageDraw.Draw(sheet)
    for n, a in enumerate(sprites):
        x, y = n % 5 * 200, n // 5 * 160
        im = Image.open(ROOT / a['previews']['46']).convert('RGBA')
        d.rectangle((x, y + 70, x + 199, y + 129), fill='#80786C')
        for offset in (10, 77):
            sheet.paste(im, (x + (200 - im.width) // 2, y + offset), im)
        d.text((x + 5, y + 136), a['name'], font=font(12), fill='white')
    sheet.save(previews / 'sprites-46px-dark-light.png')
    # Review overlays and assembly examples are layout only, never map masters.
    campaign = json.loads((ROOT / 'data/campaigns/m813.json').read_text())
    for z in campaign['zones']:
        a = next(a for a in entries if a['group'] == 'C' and a['zone_id'] == z['id'])
        base = Image.open(ROOT / a['path']).convert('RGBA')
        overlay = base.copy()
        d = ImageDraw.Draw(overlay)
        for x in range(17):
            d.line((x * 100, 0, x * 100, 1100), fill=(255, 255, 255, 80))
        for y in range(12):
            d.line((0, y * 100, 1600, y * 100), fill=(255, 255, 255, 80))
        for ref in z.get('solid', []):
            for x, y in cells(ref):
                d.rectangle((x * 100 + 2, y * 100 + 2, x * 100 + 98, y * 100 + 98), outline='#EC817D', width=3)
        assembled = base.copy()
        for ob in z['objects']:
            x, y = cells(ob['at'])[0]
            asset_id = object_id(z['id'], ob)
            d.rectangle((x * 100 + 5, y * 100 + 5, x * 100 + 95, y * 100 + 95),
                        outline='#E9D568' if ob['kind'] == 'lamp' else '#69CFE2', width=3)
            family = 'characters' if asset_id.startswith('m813-') else 'sprites'
            im = Image.open(ROOT / c[family][asset_id]['path']).convert('RGBA')
            if family == 'characters':
                im = im.crop((0, 0, im.width, im.width)).resize((64, 64), Image.Resampling.LANCZOS)
                mask = Image.new('L', (64, 64)); ImageDraw.Draw(mask).ellipse((0, 0, 63, 63), fill=255)
                im.putalpha(mask)
            else:
                target = (200, 200) if asset_id == 'obj-escape-craft' else (200, 100) if asset_id == 'obj-repair-cradles' else (100, 100)
                im = im.resize(target, Image.Resampling.LANCZOS)
            pos = (x * 100, y * 100) if asset_id == 'obj-repair-cradles' else (x * 100 + 50 - im.width // 2, y * 100 + 50 - im.height // 2)
            assembled.alpha_composite(im, pos)
        for kind, im in [('layout-check', overlay), ('assembly-preview', assembled)]:
            im.convert('RGB').save(previews / f'{z["id"]}-{kind}.png')
    lines = ['# M813 tutorial campaign — complete art handoff', '',
        '**53 images delivered:** 4 banners, 16 portraits, 4 maps, 4 story moments and 25 object sprites. The original brief requested 52; one shared field lamp covers the implementer’s later H3/I9 lamp objects.', '',
        'Every creative drawing was shown in chat and pushed individually. All new art remains `review-candidate`, `production_approved: false`, pending Leon. Earlier masters, sources and revisions are retained. The original 295 primary assets, including the complete 180-icon library and accepted portrait revisions, are preserved.', '',
        '## Review', '',
        '- [Zone banners](previews/banners.png)', '- [Sixteen portraits](previews/portraits.png)',
        '- [All 25 object sprites at actual 46 px, dark/light](previews/sprites-46px-dark-light.png)',
        '- [Internal story review — includes spoilers](previews/spoilers/story-moments.png)', '',
        'Maps have [layout overlays](#map-layout-checks) against the current campaign and assembly examples using the existing sprites. These are technical review layouts, not screenshots of game integration. Grids and review outlines are never baked into a map master.', '',
        '## Implementation', '',
        'Use catalog IDs and selected paths; never select a historical image by glob. Banners/stories are RGB 1600×900, portraits RGB 800×1000, maps RGB 1600×1100. Sprites are RGBA 256×256, except the 512×512 escape craft and 512×256 paired cradles. Versioned tile-fit exports center sprite ink/shadow bounds inside an 80% box; source drawings remain unchanged. 128/64/46 px sprite previews are supplied.', '',
        'New portraits join `pool: m813-cast`, collection `m813` (18 portraits including the retained two). Group A has zone IDs; the shield-line banner also serves as campaign card art. Object sprites carry `object_kind`. Doors use a matching overhead cutaway pair.', '',
        'Respect `spoiler` and `visibility`: the ramp and choice are mid-campaign; the demand is `outpost-1-only` and stored under spoilers/. Later zone banners are gated to zone entry. Full review sheets are internal. Character appearances, unknown enemy design, regimental/prop decoration and details absent from the lore remain proposals. No new fact about the enemy faction is established.', '',
        'The latest campaign added field lamps at Outpost H3/I9. Both reserved floor tiles remain clear; the updated guide shows them. Painted map geometry was compared visually with the guides; engine collision remains defined by campaign data. The pixel validator verifies image formats/alpha/metadata, not semantic geometry or art approval.', '',
        '## Map layout checks', '']
    for z in campaign['zones']:
        lines.append(f'- {z["name"]}: [tile overlay](previews/{z["id"]}-layout-check.png), [sprite assembly](previews/{z["id"]}-assembly-preview.png).')
    lines += ['', '## Validation and regeneration', '',
        '`python3 scripts/validate_art.py --complete-icons --complete-campaign` checks full 180-icon and current 53-image campaign coverage, selected PNGs, sources, metadata, spoilers, sprite transparency and all checksums. `git diff --check` checks whitespace.', '',
        '`python3 scripts/review_m813_campaign.py` rebuilds review layouts from existing art. It does not draw or regenerate images. The committed queue and production-progress record retain exact coverage.', '',
        '| ID | Group | Selected image | Visibility |', '|---|---|---|---|']
    import os
    for a in entries:
        lines.append(f'| `{a["id"]}` | {a["group"]} | [PNG]({os.path.relpath(ROOT / a["path"], HANDOFF)}) | {a["visibility"]} |')
    (HANDOFF / 'README.md').write_text('\n'.join(lines) + '\n')
    update_checksums()
    p = ROOT / 'art/checksums.sha256'
    records = dict(line.split('  ', 1)[::-1] for line in p.read_text().splitlines())
    for script in ('scripts/export_m813_campaign.py', 'scripts/review_m813_campaign.py', 'scripts/validate_art.py'):
        records[script] = sha(ROOT / script)
    p.write_text(''.join(records[path] + '  ' + path + '\n' for path in sorted(records)))
    print(f'Built full M813 review: {len(entries)} assets; {len(sprites)} sprites; 4 map overlays and assemblies.')


if __name__ == '__main__':
    review()
