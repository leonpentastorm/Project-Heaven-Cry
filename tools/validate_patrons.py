#!/usr/bin/env python3
"""Validate the eight-colour patron portrait delivery independently of historical art."""
from pathlib import Path
import hashlib
import json
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'art/portraits/patrons'
EXPECTED = {'nerukhan', 'the_quartermaster', 'the_laughing_mask', 'the_toll_keeper',
            'mother_ember', 'old_overcast', 'the_matchmaker', 'the_counting_weaver'}

def check(condition, message):
    if not condition:
        raise ValueError(message)

def validate():
    manifest = json.loads((BASE / 'manifest.json').read_text())
    catalog = json.loads((ROOT / 'art/catalog.json').read_text())['patrons']
    portraits = manifest['portraits']
    check(manifest['status'] == 'review-candidate' and manifest['production_approved'] is False,
          'Portraits require human approval')
    check(len(portraits) == 8 and {p['id'] for p in portraits} == EXPECTED, 'Wrong patron coverage')
    check(len({p['colour_anchor'] for p in portraits}) == 8, 'Duplicate colour anchors')
    check(len({p['sha256'] for p in portraits}) == 8, 'Duplicate artwork')
    for p in portraits:
        for key, width, height, digest in [
            ('path', 800, 1000, 'sha256'),
            ('native_source', p['native_width'], p['native_height'], 'native_sha256')]:
            f = ROOT / p[key]
            with Image.open(f) as im:
                im.load()
                check(im.format == 'PNG' and im.size == (width, height), f'Wrong PNG size: {f}')
                if key == 'path':
                    check(im.mode == 'RGB', f'Export must be opaque RGB: {f}')
            check(hashlib.sha256(f.read_bytes()).hexdigest() == p[digest], f'Hash mismatch: {f}')
        entry = catalog[p['id']]
        for field in ['path', 'width', 'height', 'sha256', 'colour_anchor']:
            check(entry[field] == p[field], f'Catalog mismatch: {p["id"]}/{field}')
        check(entry['status'] == 'review-candidate', 'Catalog approval mismatch')
    package_lines = (BASE / 'checksums.sha256').read_text().splitlines()
    recorded = set()
    global_hashes = dict((line.split('  ', 1)[1], line.split('  ', 1)[0])
                         for line in (ROOT / 'art/checksums.sha256').read_text().splitlines() if line)
    for line in package_lines:
        expected, relative = line.split('  ', 1)
        check(hashlib.sha256((ROOT / relative).read_bytes()).hexdigest() == expected, f'Checksum: {relative}')
        check(global_hashes.get(relative) == expected, f'Global checksum: {relative}')
        recorded.add(relative)
    actual = {str(f.relative_to(ROOT)) for f in BASE.rglob('*') if f.is_file() and f.name != 'checksums.sha256'}
    check(recorded == actual, 'Incomplete package checksums')
    print('PASS: 8 portraits, 8 native sources, dimensions, distinct palettes, catalog bindings and package/global hashes.')

if __name__ == '__main__':
    validate()
