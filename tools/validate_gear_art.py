#!/usr/bin/env python3
"""Validate the 13 November Heavenprint gear delivery and its catalog bindings."""
from pathlib import Path
import hashlib
import json
import re

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
DELIVERY = ROOT / 'art/_archive/gear/2026-11-13-complete'
FOLLOWUPS = ROOT / 'art/_archive/survival/2026-11-13-gear-followups'


def local(path):
    target = (ROOT / path).resolve()
    assert target.is_relative_to(ROOT) and target.is_file(), path
    return target


def validate_images(paths):
    for size, path in paths.items():
        with Image.open(local(path)) as image:
            assert image.mode == 'RGBA' and image.size == (size, size), path
            alpha = image.getchannel('A')
            assert alpha.getextrema() == (0, 255), path
            assert alpha.crop((0, 0, size, 1)).getbbox() is None, path
            assert alpha.crop((0, size - 1, size, size)).getbbox() is None, path
            assert alpha.crop((0, 0, 1, size)).getbbox() is None, path
            assert alpha.crop((size - 1, 0, size, size)).getbbox() is None, path


def validate():
    manifest = json.loads((DELIVERY / 'manifest.json').read_text())
    catalog = json.loads((ROOT / 'art/catalog.json').read_text())['gear']
    brief = (ROOT / 'art/briefs/GPT-PROMPTS-2026-11-13-gear.md').read_text()
    expected = {int(n): name for n, name in re.findall(r'\*\*(\d+)\. `([^`]+\.png)`', brief)}
    expected.update({150: 'weapon-katana.png', 151: 'weapon-emanator_katana.png'})
    assert len(manifest) == 151 and {e['number'] for e in manifest} == set(expected)
    assert {e['filename'] for e in manifest} == set(expected.values())
    assert {Path(e['filename']).stem for e in manifest} <= set(catalog)
    followup_manifest = FOLLOWUPS / 'manifest.json'
    followups = json.loads(followup_manifest.read_text()) if followup_manifest.exists() else []
    replacements = {entry['filename']: entry for entry in followups if entry['operation'] == 'replace existing'}
    for entry in manifest:
        name = entry['filename']
        assert name == expected[entry['number']], name
        asset = catalog[Path(name).stem]
        assert asset['path'] == entry['path'] == 'art/icons/gear/' + name
        assert asset['status'] == 'review-candidate' and asset['production_approved'] is False
        assert asset['background'] == 'transparent' and (asset['width'], asset['height']) == (1024, 1024)
        replacement = replacements.get(name)
        old_master = replacement['previous_path'] if replacement else asset['path']
        assert entry['sha256'] == hashlib.sha256(local(old_master).read_bytes()).hexdigest(), name
        assert asset['exports'] == entry['exports'] and set(asset['exports']) == {'256', '128', '64', '32'}
        old_source = replacement['previous_source_path'] if replacement else asset['source_path']
        assert old_source == entry['source']
        with Image.open(local(entry['source'])) as source:
            assert list(source.size) == entry['native_dimensions'], name
        if not replacement:
            assert asset['sha256'] == entry['sha256'] and asset['native_dimensions'] == entry['native_dimensions'], name
        for size, path in asset['exports'].items():
            assert path == f'art/icons/gear/exports/{size}/{name}', path
        old_exports = replacement['previous_exports'] if replacement else asset['exports']
        validate_images({1024: old_master, **{int(size): path for size, path in old_exports.items()}})
    for page in range(1, 8):
        for kind in ['overview', 'alpha-light', 'small-size']:
            assert (DELIVERY / f'review/{kind}-{page:02d}.png').is_file()
    print('OK: 151 gear assets, 149 brief filenames + two katana additions; catalog, source sizes, hashes, 755 RGBA exports and clear borders.')
    if followups:
        assert len(followups) == 13 and len(replacements) == 10
        assert {entry['filename'] for entry in followups if entry['operation'] == 'new'} == {
            'mag-magistrate.png', 'mag-brigade_shotgun.png', 'mag-repeating_crossbow.png',
        }
        for entry in followups:
            name = entry['filename']
            asset = catalog[Path(name).stem]
            assert asset['path'] == entry['path'] == f'art/icons/gear/{name}', name
            assert asset['sha256'] == entry['sha256'] == hashlib.sha256(local(asset['path']).read_bytes()).hexdigest(), name
            assert asset['source_path'] == entry['source'] and asset['native_dimensions'] == entry['native_dimensions'], name
            source = local(entry['source'])
            assert hashlib.sha256(source.read_bytes()).hexdigest() == entry['native_sha256'], name
            with Image.open(source) as image:
                assert list(image.size) == asset['native_dimensions'], name
            assert asset['exports'] == entry['exports'] and set(asset['exports']) == {'256', '128', '64', '32'}
            for size, path in asset['exports'].items():
                assert path == f'art/icons/gear/exports/{size}/{name}'
                assert hashlib.sha256(local(path).read_bytes()).hexdigest() == entry['export_hashes'][size], path
            validate_images({1024: asset['path'], **{int(size): path for size, path in asset['exports'].items()}})
        print('OK: 13 Survival gear follow-ups, 65 RGBA files and three new magazine icons.')


if __name__ == '__main__':
    validate()
