#!/usr/bin/env python3
"""Validate the PHC art handoff. Python 3 standard library only."""
from pathlib import Path
import hashlib
import json
import struct
import sys
import zlib

ROOT = Path(__file__).resolve().parents[1]
WICK_TEST_IDS = {
    'humanity-first', 'the-old-blood', 'factory-made', 'chain-smoker',
    'raised-by-orks', 'the-brightest-light', 'rabbits-foot', 'forlorn-hope',
    'field-surgeon', 'supreme-command',
}

def validate_white_rgba(data, path):
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
                require(row[i:i + 3] == b'\xff\xff\xff', f'Non-white visible ink: {path}')
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
        require(icon['path'] == asset['path'] and (asset['width'], asset['height']) == (1024, 1024),
                f'Bad Wick master: {icon["id"]}')
        require(icon['exports'] == asset['exports'] and set(asset['exports']) == {'40', '64', '128', '256'},
                f'Missing Wick review sizes: {icon["id"]}')
        validate_white_rgba(local(asset['path']).read_bytes(), asset['path'])
        for size, path in asset['exports'].items():
            data = local(path).read_bytes()
            require(data[:8] == b'\x89PNG\r\n\x1a\n', f'Not a PNG export: {path}')
            require(struct.unpack('>IIBB', data[16:26]) == (int(size), int(size), 8, 6),
                    f'Bad Wick export format: {path}')
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

def require(condition, message):
    if not condition:
        raise ValueError(message)

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
    for family, count in [('skills', 27), ('characters', 83), ('traits', 9), ('perks', 2), ('illustrations', 2)]:
        require(len(catalog[family]) == count, f'Expected {count} {family}')
        for asset_id, asset in catalog[family].items():
            path = asset['path']
            require(path not in paths, f'Duplicate primary asset path: {path}')
            paths.add(path)
            folder = {'characters': 'character-portraits', 'perks': 'traits'}.get(family, family)
            require(path.startswith(f'art/{folder}/'), f'Wrong family for {asset_id}')
            data = local(path).read_bytes()
            require(hashlib.sha256(data).hexdigest() == asset['sha256'], f'Checksum mismatch: {path}')
            require(data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR', f'Not a PNG: {path}')
            width, height, depth, color_type = struct.unpack('>IIBB', data[16:26])
            require((width, height) == (asset['width'], asset['height']), f'Wrong dimensions: {path}')
            require(depth == 8 and color_type == (6 if family in ['traits', 'perks'] else 2), f'Wrong PNG colour/alpha type: {path}')
            if family == 'skills':
                attribute = palette['attributes'][asset['attribute']]
                require(asset['color'] == attribute['color'] == palette['skills'][asset_id]['color'], f'Colour mismatch: {asset_id}')
                require(asset['attribute'] == palette['skills'][asset_id]['attribute'], f'Attribute mismatch: {asset_id}')
    require(set(catalog['skills']) == set(palette['skills']), 'Skill list differs from palette')
    validate_ui_colours(catalog, palette)
    validate_brief_assets(catalog)
    checksums = local('art/checksums.sha256').read_text().splitlines()
    for line in checksums:
        expected, path = line.split('  ', 1)
        require(hashlib.sha256(local(path).read_bytes()).hexdigest() == expected, f'File integrity mismatch: {path}')
    require(paths <= {line.split('  ', 1)[1] for line in checksums}, 'Primary assets missing from checksums')
    print(f'OK: 27 skills, 83 characters, 9 traits, 2 perks, 2 illustrations; '
          f'{len(checksums)} file checksums; brief coverage, exports, white ink, alpha, spoilers and palette valid.')

if __name__ == '__main__':
    try:
        validate()
    except (ValueError, KeyError, OSError, struct.error) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        sys.exit(1)
