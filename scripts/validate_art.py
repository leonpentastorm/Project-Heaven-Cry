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
            require(path.startswith(f'art/{family}/'), f'Wrong family for {asset_id}')
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
