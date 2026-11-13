#!/usr/bin/env python3
"""Validate the 13 November Heavenprint gear delivery and its catalog bindings."""
from pathlib import Path
import hashlib
import json
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DELIVERY = ROOT / 'art/_archive/gear/2026-11-13-complete'


def local(path):
    target = (ROOT / path).resolve()
    assert target.is_relative_to(ROOT) and target.is_file(), path
    return target


def validate():
    manifest = json.loads((DELIVERY / 'manifest.json').read_text())
    catalog = json.loads((ROOT / 'art/catalog.json').read_text())['gear']
    brief = (ROOT / 'art/briefs/GPT-PROMPTS-2026-11-13-gear.md').read_text()
    expected = {int(n): name for n, name in re.findall(r'\*\*(\d+)\. `([^`]+\.png)`', brief)}
    expected.update({150: 'weapon-katana.png', 151: 'weapon-emanator_katana.png'})
    assert len(manifest) == 151 and {e['number'] for e in manifest} == set(expected)
    assert {e['filename'] for e in manifest} == set(expected.values())
    assert {Path(e['filename']).stem for e in manifest} <= set(catalog)
    for entry in manifest:
        name = entry['filename']
        assert name == expected[entry['number']], name
        asset = catalog[Path(name).stem]
        assert asset['path'] == entry['path'] == 'art/icons/gear/' + name
        assert asset['status'] == 'review-candidate' and asset['production_approved'] is False
        assert asset['background'] == 'transparent' and (asset['width'], asset['height']) == (1024, 1024)
        assert asset['sha256'] == entry['sha256'] == hashlib.sha256(local(asset['path']).read_bytes()).hexdigest(), name
        assert asset['exports'] == entry['exports'] and set(asset['exports']) == {'256', '128', '64', '32'}
        assert asset['source_path'] == entry['source']
        with Image.open(local(entry['source'])) as source:
            assert list(source.size) == entry['native_dimensions'] == asset['native_dimensions'], name
        for size, path in {'1024': asset['path'], **asset['exports']}.items():
            size = int(size)
            if size != 1024:
                assert path == f'art/icons/gear/exports/{size}/{name}', path
            with Image.open(local(path)) as image:
                assert image.mode == 'RGBA' and image.size == (size, size), path
                alpha = image.getchannel('A')
                assert alpha.getextrema() == (0, 255), path
                for edge in [(0, 0, size, 1), (0, size - 1, size, size), (0, 0, 1, size), (size - 1, 0, size, size)]:
                    assert alpha.crop(edge).getbbox() is None, (path, 'nontransparent border')
    for page in range(1, 8):
        for kind in ['overview', 'alpha-light', 'small-size']:
            assert (DELIVERY / f'review/{kind}-{page:02d}.png').is_file()
    print('OK: 151 gear assets, 149 brief filenames + two katana additions; catalog, source sizes, hashes, 755 RGBA exports and clear borders.')


if __name__ == '__main__':
    validate()
