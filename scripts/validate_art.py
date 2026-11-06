#!/usr/bin/env python3
"""Validate the PHC art handoff. Python 3 standard library only."""
from pathlib import Path
import argparse
import hashlib
import json
import struct
import sys
import zlib

ROOT = Path(__file__).resolve().parents[1]
PIXEL_ASSET = None
COMPLETE_ICONS = False
COMPLETE_CAMPAIGN = False
WICK_TEST_IDS = {
    'humanity-first', 'the-old-blood', 'factory-made', 'chain-smoker',
    'raised-by-orks', 'the-brightest-light', 'rabbits-foot', 'forlorn-hope',
    'field-surgeon', 'supreme-command',
}

def validate_white_rgba(data, path, circle=False, white=True, clear_border=False, box_fraction=None):
    """Decode PNG scanlines to check ink and alpha, without a Pillow dependency."""
    width, height = struct.unpack('>II', data[16:24])
    require(data[28] == 0, f'Interlaced PNG unsupported: {path}')
    compressed = bytearray()
    offset = 8
    while offset < len(data):
        length = struct.unpack('>I', data[offset:offset + 4])[0]
        if data[offset + 4:offset + 8] == b'IDAT':
            compressed.extend(data[offset + 8:offset + 8 + length])
        offset += length + 12
    raw = zlib.decompress(compressed)
    stride = width * 4
    require(len(raw) == height * (stride + 1), f'Bad PNG scanline size: {path}')
    previous = bytearray(stride)
    transparent = visible = False
    for y in range(height):
        start = y * (stride + 1)
        filter_type = raw[start]
        require(filter_type <= 4, f'Bad PNG filter: {path}')
        row = bytearray(raw[start + 1:start + 1 + stride])
        if filter_type:
            for i in range(stride):
                left = row[i - 4] if i >= 4 else 0
                up = previous[i]
                corner = previous[i - 4] if i >= 4 else 0
                if filter_type == 1:
                    predictor = left
                elif filter_type == 2:
                    predictor = up
                elif filter_type == 3:
                    predictor = (left + up) // 2
                else:
                    p = left + up - corner
                    distances = [abs(p - left), abs(p - up), abs(p - corner)]
                    predictor = [left, up, corner][distances.index(min(distances))]
                row[i] = (row[i] + predictor) & 255
        for i in range(0, stride, 4):
            alpha = row[i + 3]
            transparent |= alpha == 0
            visible |= alpha > 0
            if alpha:
                if white:
                    require(row[i:i + 3] == b'\xff\xff\xff', f'Non-white visible ink: {path}')
                if clear_border and (y in (0, height - 1) or i // 4 in (0, width - 1)):
                    require(alpha <= 8, f'Sprite background reaches canvas edge: {path}')
                if box_fraction is not None and alpha >= 16:
                    require(abs(i // 4 - (width - 1) / 2) <= width * box_fraction / 2 + 1
                            and abs(y - (height - 1) / 2) <= height * box_fraction / 2 + 1,
                            f'Sprite exceeds tile safe box: {path}')
                if circle and alpha >= 16:
                    x = i // 4
                    require((x - (width-1)/2)**2 + (y - (height-1)/2)**2 <= (.45*width+1)**2,
                            f'Mastered ink outside 90% medallion safe circle: {path}')
        previous = row
    require(transparent and visible, f'Icon must contain both ink and transparency: {path}')

def validate_brief_assets(catalog):
    wick = json.loads(local('art/traits/wick/test-set-1/manifest.json').read_text())
    require(wick['status'] == 'review-candidate' and wick['production_approved'] is False,
            'Wick tests must remain candidates until human review')
    require(len(wick['icons']) == 10 and {a['id'] for a in wick['icons']} == WICK_TEST_IDS,
            'Wick test manifest must cover all ten briefs exactly once')
    data_ids = {family: {x['id'] for x in json.loads(local(f'data/{family}.json').read_text())['items']}
                for family in ['traits', 'perks']}
    for icon in wick['icons']:
        asset = catalog[icon['family']][icon['id']]
        require(icon['family'] == ('perks' if icon['id'] in {'field-surgeon', 'supreme-command'} else 'traits'),
                f'Wrong trait/perk family: {icon["id"]}')
        require(icon['data_id'] == asset['data_id'] and icon['data_id'] in data_ids[icon['family']],
                f'Missing rules-data binding: {icon["id"]}')
        require(asset['status'] == 'review-candidate' and asset['production_approved'] is False,
                f'Unreviewed icon marked approved: {icon["id"]}')
        revised = asset['path'] != icon['path']
        require((not revised or asset.get('previous_path') == icon['path'])
                and (asset['width'], asset['height']) == (1024, 1024),
                f'Bad Wick master: {icon["id"]}')
        local(icon['path'])  # First versions remain available for comparison.
        sizes = {'40', '44', '48', '56', '64', '128', '256'}
        require((revised or icon['exports'] == asset['exports']) and set(asset['exports']) == sizes,
                f'Missing Wick review sizes: {icon["id"]}')
        if PIXEL_ASSET is None or PIXEL_ASSET == icon['id']:
            validate_white_rgba(local(asset['path']).read_bytes(), asset['path'])
        for size, path in asset['exports'].items():
            data = local(path).read_bytes()
            require(data[:8] == b'\x89PNG\r\n\x1a\n', f'Not a PNG export: {path}')
            require(struct.unpack('>IIBB', data[16:26]) == (int(size), int(size), 8, 6),
                    f'Bad Wick export format: {path}')
            if PIXEL_ASSET is None or PIXEL_ASSET == icon['id']:
                validate_white_rgba(data, path)
    for family, manifest_path, key, expected in [
        ('characters', 'art/character-portraits/m813/manifest.json', 'portraits', {'mpat', 'mpat-comrade'}),
        ('illustrations', 'art/illustrations/m813/v1/manifest.json', 'illustrations',
         {'outpost813', 'outpost1-repair-bay'}),
    ]:
        manifest = json.loads(local(manifest_path).read_text())
        require({a['id'] for a in manifest[key]} == expected, f'M813 brief coverage: {manifest_path}')
        for entry in manifest[key]:
            asset = catalog[family][entry['id']]
            spoiler = entry['id'] == 'outpost1-repair-bay'
            require(asset['path'] == entry['path'], f'Manifest path mismatch: {entry["id"]}')
            require(asset['spoiler'] == entry['spoiler'] == spoiler, f'Spoiler flag mismatch: {entry["id"]}')
            require(asset['visibility'] == ('ending-only' if spoiler else 'opening-safe'),
                    f'Visibility mismatch: {entry["id"]}')
            if spoiler:
                require('/spoilers/' in asset['path'], 'Ending artwork must live under spoilers/')
            size = (800, 1000) if family == 'characters' else (1600, 900)
            require((asset['width'], asset['height']) == size, f'M813 dimensions: {entry["id"]}')

def validate_production_icons(catalog):
    """Validate incremental deliveries without claiming the full run is finished."""
    rules = {family: {x['id'] for x in json.loads(local(f'data/{family}.json').read_text())['items']}
             for family in ['traits', 'perks']}
    for family in ['traits', 'perks']:
        ids = {a.get('data_id', asset_id.replace('-', '_')) for asset_id, a in catalog[family].items()}
        require(ids <= rules[family], f'Unknown rules-data IDs in {family}')
        require(len(ids) == len(catalog[family]), f'Duplicate rules-data bindings: {family}')
        if COMPLETE_ICONS:
            require(ids == rules[family], f'Incomplete {family} icon coverage: {sorted(rules[family] - ids)}')
    folders = ['art/traits/wick/test-set-1/revisions',
               'art/traits/wick/production-v1', 'art/perks/wick/production-v1']
    revisions_root = ROOT / 'art/traits/wick/test-set-1/revisions'
    if revisions_root.exists():
        folders += [str(p.parent.relative_to(ROOT)) for p in revisions_root.glob('round-*/manifest.json')]
    for folder in folders:
        manifest_path = ROOT / folder / 'manifest.json'
        if not manifest_path.exists():
            continue
        manifest = json.loads(manifest_path.read_text())
        require(manifest['production_approved'] is False and manifest['status'] == 'review-candidate',
                f'Production candidates require review: {folder}')
        require(len({i['id'] for i in manifest['icons']}) == len(manifest['icons']), f'Duplicate manifest IDs: {folder}')
        for item in manifest['icons']:
            family = item['family']
            asset = catalog[family][item['id']]
            if item['path'] != asset['path'] and asset.get('previous_revision_path') == item['path']:
                local(item['path'])  # Superseded revision is retained, not selected by the catalog.
                continue
            require(item['data_id'] in rules[family] and item['data_id'] == asset['data_id'],
                    f'Bad production rules binding: {item["id"]}')
            require(item['path'] == asset['path'] and item['path'].startswith(folder + '/'),
                    f'Production path mismatch: {item["id"]}')
            require((asset['width'], asset['height']) == (1024, 1024), f'Production dimensions: {item["id"]}')
            require(item['exports'] == asset['exports'] and set(asset['exports']) == {'40','44','48','56','64','128','256'},
                    f'Production UI sizes missing: {item["id"]}')
            require(asset['production_approved'] is False and asset['status'] == 'review-candidate',
                    f'Unreviewed production asset marked approved: {item["id"]}')
            mastered = item.get('tier') == 'mastered'
            if item.get('batch') == 'G':
                require(mastered and asset.get('tier') == 'mastered'
                        and asset.get('mastered_mark') == 'four-point star, upper left'
                        and asset.get('medallion_safe_circle') == .9,
                        f'Missing Mastered handoff metadata: {item["id"]}')
            # Revised tests are checked by validate_brief_assets already.
            if item['id'] in WICK_TEST_IDS:
                continue
            if PIXEL_ASSET is None or PIXEL_ASSET == item['id']:
                validate_white_rgba(local(asset['path']).read_bytes(), asset['path'], circle=mastered)
            for size, path in asset['exports'].items():
                data = local(path).read_bytes()
                require(data[:8] == b'\x89PNG\r\n\x1a\n'
                        and struct.unpack('>IIBB', data[16:26]) == (int(size), int(size), 8, 6),
                        f'Bad production export format: {path}')
                if PIXEL_ASSET is None or PIXEL_ASSET == item['id']:
                    validate_white_rgba(data, path)
    progress_path = ROOT / 'art/traits/wick/production-progress.json'
    if progress_path.exists():
        progress = json.loads(progress_path.read_text())
        for family in ['traits', 'perks']:
            require(progress['catalog_coverage'][family] == len(catalog[family]), f'Stale {family} production progress')
        require(len(progress['revisions_delivered']) <= 7 and len(progress['new_icons_delivered']) <= 169,
                'Production progress exceeds brief')

    reference_manifest = ROOT / 'art/traits/wick/reference-ui-v1/manifest.json'
    if reference_manifest.exists():
        references = json.loads(reference_manifest.read_text())
        require({i['id'] for i in references['icons']} ==
                {'mind-without-fog', 'chain-smoker', 'the-brightest-light', 'forlorn-hope'},
                'Reference UI exports must cover the four retained designs')
        for item in references['icons']:
            asset = catalog['traits'][item['id']]
            require(item['path'] == asset['path'] and item['master_sha256'] == asset['sha256'],
                    f'Reference master changed: {item["id"]}')
            require(item['exports'] == asset['exports'] and
                    set(item['exports']) == {'40','44','48','56','64','128','256'},
                    f'Reference UI sizes missing: {item["id"]}')
            for size, path in item['exports'].items():
                data = local(path).read_bytes()
                require(data[:8] == b'\x89PNG\r\n\x1a\n' and
                        struct.unpack('>IIBB', data[16:26]) == (int(size), int(size), 8, 6),
                        f'Bad reference UI export: {path}')
                if PIXEL_ASSET is None or PIXEL_ASSET == item['id']:
                    validate_white_rgba(data, path)

def require(condition, message):
    if not condition:
        raise ValueError(message)


def validate_campaign_art(catalog):
    queue_path = ROOT / 'art/briefs/m813-tutorial/production-queue.json'
    if not queue_path.exists():
        require(not COMPLETE_CAMPAIGN, 'Missing campaign queue')
        return
    queue = json.loads(queue_path.read_text())
    require(queue['target'] == len(queue['jobs']) and queue['target'] >= 52, 'Invalid M813 campaign target')
    require(len({j['id'] for j in queue['jobs']}) == queue['target'], 'Duplicate M813 jobs')
    delivered = []
    for job in queue['jobs']:
        asset = catalog.get(job['family'], {}).get(job['id'])
        if asset is None:
            continue
        delivered.append(job['id'])
        require((asset['path'] == job['path'] or
                 (asset.get('previous_path') == job['path'] and '/revisions/' in asset['path']))
                and [asset['width'], asset['height']] == job['dimensions'],
                f'M813 delivery path/dimensions: {job["id"]}')
        require(asset['status'] == 'review-candidate' and asset['production_approved'] is False,
                f'M813 delivery requires visual approval: {job["id"]}')
        require(asset['spoiler'] == job['spoiler'] and asset['visibility'] == job['visibility'],
                f'M813 visibility mismatch: {job["id"]}')
        require(hashlib.sha256(local(asset['source_path']).read_bytes()).hexdigest() == asset['source_sha256'],
                f'M813 source integrity: {job["id"]}')
        if job['id'] == 'm813-the-demand':
            require('/spoilers/' in asset['path'], 'The demand must be stored under spoilers/')
        if job['group'] == 'C':
            local(job['layout_guide'])
        if job['group'] == 'E' and (PIXEL_ASSET is None or PIXEL_ASSET == job['id']):
            validate_white_rgba(local(asset['path']).read_bytes(), asset['path'], white=False,
                                clear_border=True, box_fraction=asset.get('tile_extent'))
        for path in asset['previews'].values():
            require(local(path).read_bytes()[:8] == b'\x89PNG\r\n\x1a\n', f'Bad M813 preview: {path}')
    if COMPLETE_CAMPAIGN:
        require(len(delivered) == queue['target'], f'Incomplete M813 campaign artwork: {len(delivered)}/{queue["target"]}')
    progress_path = ROOT / 'art/campaigns/m813/tutorial-v1/production-progress.json'
    if progress_path.exists():
        progress = json.loads(progress_path.read_text())
        require(progress['delivered'] == delivered, 'Stale M813 delivered progress')
        require(progress['remaining'] == [j['id'] for j in queue['jobs'] if j['id'] not in delivered],
                'Stale M813 remaining progress')

def local(path):
    target = (ROOT / path).resolve()
    require(target.is_relative_to(ROOT), f'Path escapes repository: {path}')
    require(target.is_file(), f'Missing file: {path}')
    return target

def _channel(value):
    value /= 255
    return value / 12.92 if value <= 0.04045 else ((value + 0.055) / 1.055) ** 2.4

def _rgb(hex_colour):
    require(len(hex_colour) == 7 and hex_colour[0] == '#', f'Bad colour: {hex_colour}')
    return [int(hex_colour[i:i + 2], 16) for i in (1, 3, 5)]

def contrast(a, b):
    def luminance(c):
        r, g, b_ = (_channel(x) for x in _rgb(c))
        return 0.2126 * r + 0.7152 * g + 0.0722 * b_
    hi, lo = sorted([luminance(a), luminance(b)], reverse=True)
    return (hi + 0.05) / (lo + 0.05)

def oklch_hue(c):
    import math
    r, g, b = (_channel(x) for x in _rgb(c))
    l = (0.4122214708 * r + 0.5363325363 * g + 0.0514459929 * b) ** (1 / 3)
    m = (0.2119034982 * r + 0.6806995451 * g + 0.1073969566 * b) ** (1 / 3)
    s = (0.0883024619 * r + 0.2817188376 * g + 0.6299787005 * b) ** (1 / 3)
    a_ = 1.9779984951 * l - 2.4285922050 * m + 0.4505937099 * s
    b_ = 0.0259040371 * l + 0.7827717662 * m - 0.8086757660 * s
    return math.degrees(math.atan2(b_, a_)) % 360

def validate_ui_colours(catalog, palette):
    """v1.3: every attribute has a UI ink that keeps its pigment's hue and reaches 4.5:1 on the raised surface."""
    ui = palette.get('ui')
    if ui is None:
        return  # pre-1.3 palettes have no UI layer
    raised = ui['surfaces']['raised']
    for attribute_id, attribute in palette['attributes'].items():
        ink = attribute['ui_ink']
        require(contrast(ink, raised) >= 4.5, f'UI ink below 4.5:1 on {raised}: {attribute_id} {ink}')
        drift = abs((oklch_hue(ink) - oklch_hue(attribute['color']) + 180) % 360 - 180)
        require(drift <= 3, f'UI ink changes the hue of {attribute_id} by {drift:.1f} degrees')
    for asset_id, asset in catalog['skills'].items():
        require(asset['ui_ink'] == palette['attributes'][asset['attribute']]['ui_ink'], f'UI ink mismatch: {asset_id}')
    for name, colour in list(ui['states'].items()) + list(ui['cores'].items()):
        require(contrast(colour, raised) >= 4.5, f'UI colour below 4.5:1 on {raised}: {name} {colour}')
    require(palette['wick']['trait_ink'] == palette['wick']['perk_ink'] == '#FFFFFF', 'Trait and perk ink must both be white')
    for family in ['traits', 'perks']:
        for asset_id, asset in catalog[family].items():
            require(asset['ink'] == '#FFFFFF', f'Icon ink must be white: {asset_id}')

def validate():
    catalog = json.loads(local('art/catalog.json').read_text())
    palette = json.loads(local(catalog['palette']).read_text())
    local(catalog['style_guide'])
    require(catalog['schema_version'] == 1, 'Unsupported catalog schema')
    require(catalog['style_guide_version'] == palette['version'], 'Style guide version mismatch')
    require(catalog['skill_palette_version'] == palette['skill_palette_version'], 'Palette version mismatch')
    paths = set()
    if PIXEL_ASSET is not None:
        require(any(PIXEL_ASSET in catalog.get(f, {}) for f in ['traits', 'perks', 'characters', 'illustrations', 'maps', 'sprites']),
                f'Unknown selected asset: {PIXEL_ASSET}')
    families = [('skills', 27, 27), ('characters', 83, 99),
                ('traits', 9, 74), ('perks', 2, 106), ('illustrations', 2, 10)]
    for family, maximum in [('maps', 4), ('sprites', 25)]:
        if family in catalog:
            families.append((family, 0, maximum))
    if 'mascot' in catalog:
        families.append(('mascot', 1, 1))
    if 'emblems' in catalog:
        families.append(('emblems', 2, 2))
    for family, minimum, maximum in families:
        require(minimum <= len(catalog[family]) <= maximum, f'Unexpected {family} count')
        for asset_id, asset in catalog[family].items():
            path = asset['path']
            require(path not in paths, f'Duplicate primary asset path: {path}')
            paths.add(path)
            folder = {'characters': 'character-portraits', 'perks': 'traits'}.get(family, family)
            require(path.startswith(f'art/{folder}/') or (family == 'perks' and path.startswith('art/perks/')),
                    f'Wrong family for {asset_id}')
            data = local(path).read_bytes()
            require(hashlib.sha256(data).hexdigest() == asset['sha256'], f'Checksum mismatch: {path}')
            require(data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR', f'Not a PNG: {path}')
            width, height, depth, color_type = struct.unpack('>IIBB', data[16:26])
            require((width, height) == (asset['width'], asset['height']), f'Wrong dimensions: {path}')
            require(depth == 8 and color_type == (6 if family in ['traits', 'perks', 'mascot', 'sprites', 'emblems'] else 2), f'Wrong PNG colour/alpha type: {path}')
            if family == 'skills':
                attribute = palette['attributes'][asset['attribute']]
                require(asset['color'] == attribute['color'] == palette['skills'][asset_id]['color'], f'Colour mismatch: {asset_id}')
                require(asset['attribute'] == palette['skills'][asset_id]['attribute'], f'Attribute mismatch: {asset_id}')
    require(set(catalog['skills']) == set(palette['skills']), 'Skill list differs from palette')
    validate_ui_colours(catalog, palette)
    validate_brief_assets(catalog)
    validate_production_icons(catalog)
    validate_campaign_art(catalog)
    checksums = local('art/checksums.sha256').read_text().splitlines()
    for line in checksums:
        expected, path = line.split('  ', 1)
        require(hashlib.sha256(local(path).read_bytes()).hexdigest() == expected, f'File integrity mismatch: {path}')
    require(paths <= {line.split('  ', 1)[1] for line in checksums}, 'Primary assets missing from checksums')
    print(f'OK: 27 skills, {len(catalog["characters"])} characters, {len(catalog["traits"])} traits, {len(catalog["perks"])} perks, {len(catalog["illustrations"])} illustrations, '
          f'{len(catalog.get("maps", {}))} maps, {len(catalog.get("sprites", {}))} sprites, '
          f'{len(catalog.get("mascot", {}))} mascot; '
          f'{len(catalog.get("emblems", {}))} emblems; '
          f'{len(checksums)} file checksums; metadata, exports, spoilers and palette valid; '
          f'white-ink/alpha pixel checks: {PIXEL_ASSET or "all icons"}.')

if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--asset', help='Select one asset; check its icon pixels if applicable, and all metadata/checksums.')
    parser.add_argument('--complete-icons', action='store_true', help='Require full 74-trait / 106-perk coverage.')
    parser.add_argument('--complete-campaign', action='store_true', help='Require the full current M813 campaign queue, including runtime followups.')
    args = parser.parse_args()
    PIXEL_ASSET = args.asset
    COMPLETE_ICONS = args.complete_icons
    COMPLETE_CAMPAIGN = args.complete_campaign
    try:
        validate()
    except (ValueError, KeyError, OSError, struct.error) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        sys.exit(1)
