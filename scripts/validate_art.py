#!/usr/bin/env python3
"""Validate the PHC art handoff. Python 3 standard library only."""
from pathlib import Path
import hashlib
import json
import struct
import sys

ROOT = Path(__file__).resolve().parents[1]

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
    for asset_id, asset in catalog['traits'].items():
        require(asset['ink'] == '#FFFFFF', f'Trait icon ink must be white: {asset_id}')

def validate():
    catalog = json.loads(local('art/catalog.json').read_text())
    palette = json.loads(local(catalog['palette']).read_text())
    local(catalog['style_guide'])
    require(catalog['schema_version'] == 1, 'Unsupported catalog schema')
    require(catalog['style_guide_version'] == palette['version'], 'Style guide version mismatch')
    require(catalog['skill_palette_version'] == palette['skill_palette_version'], 'Palette version mismatch')
    paths = set()
    for family, count in [('skills', 27), ('characters', 81), ('traits', 1)]:
        require(len(catalog[family]) == count, f'Expected {count} {family}')
        for asset_id, asset in catalog[family].items():
            path = asset['path']
            require(path not in paths, f'Duplicate primary asset path: {path}')
            paths.add(path)
            folder = {'characters': 'character-portraits'}.get(family, family)
            require(path.startswith(f'art/{folder}/'), f'Wrong family for {asset_id}')
            data = local(path).read_bytes()
            require(hashlib.sha256(data).hexdigest() == asset['sha256'], f'Checksum mismatch: {path}')
            require(data[:8] == b'\x89PNG\r\n\x1a\n' and data[12:16] == b'IHDR', f'Not a PNG: {path}')
            width, height, depth, color_type = struct.unpack('>IIBB', data[16:26])
            require((width, height) == (asset['width'], asset['height']), f'Wrong dimensions: {path}')
            require(depth == 8 and color_type == (6 if family == 'traits' else 2), f'Wrong PNG colour/alpha type: {path}')
            if family == 'skills':
                attribute = palette['attributes'][asset['attribute']]
                require(asset['color'] == attribute['color'] == palette['skills'][asset_id]['color'], f'Colour mismatch: {asset_id}')
                require(asset['attribute'] == palette['skills'][asset_id]['attribute'], f'Attribute mismatch: {asset_id}')
    require(set(catalog['skills']) == set(palette['skills']), 'Skill list differs from palette')
    validate_ui_colours(catalog, palette)
    checksums = local('art/checksums.sha256').read_text().splitlines()
    for line in checksums:
        expected, path = line.split('  ', 1)
        require(hashlib.sha256(local(path).read_bytes()).hexdigest() == expected, f'File integrity mismatch: {path}')
    print(f'OK: 27 skills, 81 characters, 1 Wick trait; {len(checksums)} file checksums; dimensions, alpha and palette mappings valid.')

if __name__ == '__main__':
    try:
        validate()
    except (ValueError, KeyError, OSError, struct.error) as error:
        print(f'FAIL: {error}', file=sys.stderr)
        sys.exit(1)
