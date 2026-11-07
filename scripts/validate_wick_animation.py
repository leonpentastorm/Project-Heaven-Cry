#!/usr/bin/env python3
"""Validate actual image-generated animation deliveries, independently of portraits."""
import hashlib
import json
from pathlib import Path

from PIL import Image, ImageChops, ImageSequence

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'art/mascot/wick-anim'


def require(condition, message):
    if not condition:
        raise ValueError(message)


def checked(record):
    path = ROOT / record['path']
    require(path.is_relative_to(BASE) or path.is_relative_to(ROOT / 'art'), 'Unsafe animation path')
    require(hashlib.sha256(path.read_bytes()).hexdigest() == record['sha256'], f'Animation checksum: {path}')
    return path


def same(a, b):
    return ImageChops.difference(a, b).getbbox(alpha_only=False) is None


def validate_wick_animation(complete=False):
    manifest_path = BASE / 'manifest.json'
    if not manifest_path.exists():
        require(not complete, 'No Wick animations delivered')
        return
    m = json.loads(manifest_path.read_text())
    plan = json.loads((BASE / 'production-plan.json').read_text())
    specs = {s['id']: s for s in plan['sequences']}
    require(m['status'] == 'review-candidate' and m['production_approved'] is False, 'Animation approval status')
    require(m['frame_size'] == [256, 256] and m['baseline_y'] == 240 and m['never_mirror'], 'Animation registration')
    require(set(m['clips']) <= set(specs), 'Unknown animation clip')
    if complete:
        require(set(m['clips']) == set(specs), 'Missing animation clips')
    total = 0
    expected_duration = 0
    for ref in m['references']:
        checked(ref)
    for name, clip in m['clips'].items():
        spec = specs[name]
        require((clip['count'], clip['fps'], clip['loop']) == (spec['frames'], spec['fps'], spec['loop']), f'{name}: timing/count')
        require(len(clip['frames']) == clip['count'], f'{name}: missing numbered frames')
        require(clip['baseline_y'] == 240 and clip['root_motion_y'] == spec.get('root_motion_y', [0] * spec['frames']), f'{name}: root motion')
        require(clip['footfalls_1based'] == spec.get('footfalls_1based', []), f'{name}: footfalls')
        require(clip['footfalls_0based'] == spec.get('footfalls_0based', []), f'{name}: footfall indices')
        strip = Image.open(checked(clip['strip'])).convert('RGBA')
        pstrip = Image.open(checked(clip['presentation_strip'])).convert('RGBA')
        require(strip.size == pstrip.size == (256 * clip['count'], 256), f'{name}: strip size')
        hashes = []
        for i, item in enumerate(clip['frames']):
            path = checked(item)
            require(path == BASE / f'{name}/{name}_{i:02}.png', f'{name}: numbered path')
            im = Image.open(path)
            require(im.mode == 'RGBA' and im.size == (256, 256), f'{path}: RGBA256')
            pixels = im.get_flattened_data()
            require(all((r, g, b) == (255, 255, 255) for r, g, b, a in pixels if a), f'{path}: non-white ink')
            box = im.getbbox()
            require(box and box[3] == 240 and box[0] > 0 and box[2] < 256 and box[1] > 0, f'{path}: sole or edge registration {box}')
            require(100 <= box[3] - box[1] <= 215, f'{path}: character scale')
            require(same(im, strip.crop((i * 256, 0, (i + 1) * 256, 256))), f'{path}: strip differs')
            master = Image.open(BASE / f'masters/v1/{name}/{path.name}')
            require(same(im, master), f'{path}: versioned master differs')
            presentation = Image.open(checked(item['presentation'])).convert('RGBA')
            expected = Image.new('RGBA', (256, 256), (255, 255, 255, 0))
            expected.paste(im, (0, item['root_motion_y']))
            require(same(expected, presentation), f'{path}: presentation differs from root track')
            require(same(expected, pstrip.crop((i * 256, 0, (i + 1) * 256, 256))), f'{path}: presentation strip')
            # A negative root offset may not clip drawn ink at the top.
            require(box[1] + item['root_motion_y'] > 0, f'{path}: jump clips head')
            if 'alias_of' in item:
                require(path.read_bytes() == (ROOT / item['alias_of']).read_bytes(), f'{path}: handoff differs')
            if name == 'wave':
                require(path.read_bytes() == (BASE / f'hello/hello_{i + 7:02}.png').read_bytes(), f'{path}: wave must match hello apex')
            hashes.append(item['sha256'])
        require(len(set(hashes)) >= (3 if name != 'hello' else 12), f'{name}: duplicate poses')
        for r in clip['reviews']:
            checked(r)
        checked(clip['preview'])
        if 'path' in clip['provenance']:
            checked(clip['provenance'])
        total += clip['count']
        expected_duration += clip['count'] * 1000 / clip['fps']
    require(total == m['delivered_frames'] and (not complete or total == 36), 'Animation total count')
    preview = Image.open(checked(m['preview']))
    actual_duration = sum(f.info.get('duration', 0) for f in ImageSequence.Iterator(preview))
    require(abs(actual_duration - expected_duration) <= total * 10, 'Preview GIF timing')
    progress = json.loads((BASE / 'production-progress.json').read_text())
    require(progress['delivered_frames'] == total and set(progress['delivered_sequences']) == set(m['clips']), 'Animation progress differs')
    checksum_map = {line.split('  ', 1)[1]: line.split('  ', 1)[0] for line in (ROOT / 'art/checksums.sha256').read_text().splitlines()}
    for path in BASE.rglob('*'):
        if path.is_file():
            rel = str(path.relative_to(ROOT))
            require(checksum_map.get(rel) == hashlib.sha256(path.read_bytes()).hexdigest(), f'Missing/stale animation checksum: {rel}')
    print(f'OK: Wick animation {len(m["clips"])}/5 clips, {total}/36 frames; white RGBA, registration, strips, root motion, aliases, timings, reviews, sources and hashes.')
