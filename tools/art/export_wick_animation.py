#!/usr/bin/env python3
"""Technical exports of image-generated Wick sheets. Never draws or mirrors poses."""
import argparse
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path
from statistics import median

from PIL import Image, ImageDraw

from export_wick_icon import ROOT, dump, relative, separate_ink, sha, update_checksums

BASE = ROOT / 'art/mascot/wick-anim'
PLAN = json.loads((BASE / 'production-plan.json').read_text())
SPECS = {s['id']: s for s in PLAN['sequences']}
ORDER = ['run', 'stop', 'idle', 'hello', 'wave']


def refresh_checksums():
    manifest_path = BASE / 'manifest.json'
    if manifest_path.exists():
        catalog_path = ROOT / 'art/catalog.json'
        catalog = json.loads(catalog_path.read_text())
        manifest = json.loads(manifest_path.read_text())
        catalog.setdefault('animation_manifests', {})['wick-menu'] = {
            **record(manifest_path), 'collection': 'wick-menu-v1',
            'label': 'Wick menu animations', 'status': 'review-candidate',
            'production_approved': False, 'clip_count': len(manifest['clips']),
            'frame_count': manifest['delivered_frames'], 'frame_size': [256, 256],
            'baseline_y': 240, 'ink': '#FFFFFF', 'background': 'transparent',
            'preview': 'art/_archive/mascot/wick-anim/preview.gif'}
        catalog_path.write_text(json.dumps(catalog, indent=2, ensure_ascii=True) + '\n')
    update_checksums()
    path = ROOT / 'art/checksums.sha256'
    entries = {line.split('  ', 1)[1]: line.split('  ', 1)[0]
               for line in path.read_text().splitlines()}
    for name in ['export_wick_animation.py', 'validate_wick_animation.py', 'validate_art.py']:
        file = ROOT / 'scripts' / name
        entries[relative(file)] = sha(file)
    path.write_text(''.join(f'{entries[p]}  {p}\n' for p in sorted(entries)))


def save(im, path):
    path.parent.mkdir(parents=True, exist_ok=True)
    im.save(path)


def record(path):
    return {'path': relative(path), 'sha256': sha(path)}


def gif_durations(count, fps):
    """Distribute GIF's 10ms rounding error instead of speeding up every frame."""
    return [(round((i + 1) * 100 / fps) - round(i * 100 / fps)) * 10
            for i in range(count)]


def active_frames(clip):
    return [Image.open(BASE / f'{clip}/{clip}_{i:02}.png').convert('RGBA')
            for i in range(SPECS[clip]['frames'])]


def deliver(clip, frames, provenance, manifest):
    spec = SPECS[clip]
    offsets = spec.get('root_motion_y', [0] * len(frames))
    master = BASE / f'masters/v1/{clip}'
    items, presented = [], []
    strip = Image.new('RGBA', (256 * len(frames), 256), (255, 255, 255, 0))
    pstrip = strip.copy()
    review = Image.new('RGB', (80 * len(frames), 110), '#10151F')
    light = Image.new('RGB', review.size, '#D8C8AD')
    for i, (frame, dy) in enumerate(zip(frames, offsets)):
        path = BASE / f'{clip}/{clip}_{i:02}.png'
        save(frame, path)
        save(frame, master / path.name)
        strip.paste(frame, (i * 256, 0))
        presentation = Image.new('RGBA', (256, 256), (255, 255, 255, 0))
        presentation.paste(frame, (0, dy))
        pp = BASE / f'presentation/{clip}/{clip}_{i:02}.png'
        save(presentation, pp)
        pstrip.paste(presentation, (i * 256, 0))
        presented.append(presentation)
        # 64px canvas means a nominal 200px character is 50px, within UI40-56.
        # Exact48px body-height inspection uses a common 0.24 factor, 62px canvas.
        small = separate_ink(frame.resize((62, 62), Image.Resampling.LANCZOS))
        for sheet in (review, light):
            sheet.paste(small, (i * 80 + 9, 10), small)
            ImageDraw.Draw(sheet).text((i * 80 + 10, 82), f'{clip} {i:02}', fill='white' if sheet is review else '#10151F')
        item = record(path)
        item['presentation'] = record(pp)
        item['root_motion_y'] = dy
        if str(i) in spec.get('frame_aliases', {}):
            item['alias_of'] = relative(BASE / spec['frame_aliases'][str(i)])
        items.append(item)
    save(strip, BASE / f'{clip}.png')
    save(strip, master / f'{clip}.png')
    save(pstrip, BASE / f'presentation/{clip}.png')
    save(review, BASE / f'previews/{clip}-48px-dark.png')
    save(light, BASE / f'previews/{clip}-48px-light.png')
    # GIF previews use a dark review surface, never baked into deliverable PNGs.
    gif_frames = []
    for frame in presented:
        bg = Image.new('RGBA', (256, 256), '#10151F')
        bg.alpha_composite(frame)
        gif_frames.append(bg.convert('RGB'))
    gif = BASE / f'previews/{clip}.gif'
    gif_frames[0].save(gif, save_all=True, append_images=gif_frames[1:],
                       duration=gif_durations(len(frames), spec['fps']), loop=0, disposal=2, optimize=False)
    manifest['clips'][clip] = {
        'count': len(frames), 'fps': spec['fps'], 'loop': spec['loop'],
        'facing': spec['facing'], 'baseline_y': 240,
        'footfalls_1based': spec.get('footfalls_1based', []),
        'footfalls_0based': spec.get('footfalls_0based', []),
        'root_motion_y': offsets, 'frames': items,
        'strip': record(BASE / f'{clip}.png'),
        'presentation_strip': record(BASE / f'presentation/{clip}.png'),
        'preview': record(gif), 'provenance': provenance,
        'reviews': [record(BASE / f'previews/{clip}-48px-{bg}.png') for bg in ['dark', 'light']],
    }


def export(clip, source):
    spec = SPECS[clip]
    source_path = BASE / f'sources/v1/{clip}-sheet.png'
    source_path.parent.mkdir(parents=True, exist_ok=True)
    if source_path.exists() and sha(source_path) != sha(source):
        raise ValueError('Existing v1 source differs; preserve it and use a versioned revision')
    if source.resolve() != source_path.resolve():
        shutil.copy2(source, source_path)
    shutil.copy2(BASE / f'plans/v1/{clip}.prompt.txt', source_path.with_suffix('.prompt.txt'))
    im = separate_ink(Image.open(source_path), solid=True)
    cols, rows = spec['grid']
    cells = [im.crop((round(i % cols * im.width / cols), round(i // cols * im.height / rows),
                      round((i % cols + 1) * im.width / cols), round((i // cols + 1) * im.height / rows)))
             for i in range(spec['frames'])]
    boxes = [cell.getbbox() for cell in cells]
    if any(box is None for box in boxes):
        raise ValueError('Empty generated cell')
    # One uniform scale per sheet preserves drawn squash, knee bounce and proportions.
    heights = [b[3] - b[1] for b in boxes]
    scale = min(200 / median(heights), 210 / max(heights))
    if clip == 'hello':
        scale = min(scale, 200 / max(heights))
    frames = []
    for cell, box in zip(cells, boxes):
        drawing = cell.crop(box)
        drawing = separate_ink(drawing.resize((round(drawing.width * scale), round(drawing.height * scale)), Image.Resampling.LANCZOS))
        frame = Image.new('RGBA', (256, 256), (255, 255, 255, 0))
        x = round((256 - cell.width * scale) / 2 + box[0] * scale)
        y = 240 - drawing.height
        if x < 0 or x + drawing.width > 256 or y < 0:
            raise ValueError('Generated pose exceeds safe canvas; inspect rather than clip')
        frame.paste(drawing, (x, y))
        frames.append(frame)
    for index, alias in spec.get('frame_aliases', {}).items():
        frames[int(index)] = Image.open(BASE / alias).convert('RGBA')
    mp = BASE / 'manifest.json'
    manifest = json.loads(mp.read_text()) if mp.exists() else {
        'version': 1, 'status': 'review-candidate', 'production_approved': False,
        'brief': PLAN['brief'], 'frame_size': [256, 256], 'baseline_y': 240,
        'ink': '#FFFFFF', 'background': 'transparent', 'never_mirror': True,
        'registration': PLAN['registration_note'], 'references': PLAN['references'], 'clips': {}}
    provenance = {**record(source_path), 'grid': [cols, rows], 'order': 'row-major',
                  'cell_boxes': [[round(i % cols * im.width / cols), round(i // cols * im.height / rows),
                                  round((i % cols + 1) * im.width / cols), round((i // cols + 1) * im.height / rows)]
                                 for i in range(spec['frames'])],
                  'uniform_scale': scale, 'ink_separation': 'luminance>=128 and source alpha>=128; white plate with antialiased export edges',
                  'creative_method': 'image_gen; technical crop, ink separation, uniform scale and sole registration only'}
    deliver(clip, frames, provenance, manifest)
    if clip == 'hello':
        indices = SPECS['wave']['derive_from']['frames_0based']
        deliver('wave', [frames[i].copy() for i in indices],
                {'derived_from': [f'hello/hello_{i:02}.png' for i in indices],
                 'method': 'exact generated hello apex reuse, no redraw or mirroring'}, manifest)
    refresh_previews(manifest)
    manifest['playback_order'] = [c for c in ORDER if c in manifest['clips']]
    manifest['delivered_frames'] = sum(c['count'] for c in manifest['clips'].values())
    dump(mp, manifest)
    progress = json.loads((BASE / 'production-progress.json').read_text())
    old_pause = progress.pop('generation_pause', None)
    if old_pause:
        progress.setdefault('limit_history', []).append(old_pause)
    complete = len(manifest['clips']) == 5
    remaining = [c for c in PLAN['generation_order'] if c not in manifest['clips']]
    progress.update(status='generated-awaiting-final-validation' if complete else 'in-progress',
                    observed_utc=datetime.now(timezone.utc).isoformat(),
                    delivered_sequences=manifest['playback_order'], delivered_frames=manifest['delivered_frames'],
                    remaining_sequences=remaining, next_sequence=remaining[0] if remaining else None)
    dump(BASE / 'production-progress.json', progress)
    plan = json.loads((BASE / 'production-plan.json').read_text())
    plan['status'] = 'generated-review-candidate' if complete else 'in-progress'
    dump(BASE / 'production-plan.json', plan)
    refresh_checksums()
    print(f'Exported {clip}; {manifest["delivered_frames"]}/36 delivered frames')


def refresh_previews(manifest):
    all_frames, durations = [], []
    for name in ORDER:
        if name not in manifest['clips']:
            continue
        clip_frames = []
        for i in range(SPECS[name]['frames']):
            f = Image.open(BASE / f'presentation/{name}/{name}_{i:02}.png').convert('RGBA')
            bg = Image.new('RGBA', f.size, '#10151F')
            bg.alpha_composite(f)
            clip_frames.append(bg.convert('RGB'))
        times = gif_durations(len(clip_frames), SPECS[name]['fps'])
        gif_path = BASE / f'previews/{name}.gif'
        clip_frames[0].save(gif_path, save_all=True, append_images=clip_frames[1:], duration=times, loop=0, disposal=2, optimize=False)
        manifest['clips'][name]['preview'] = record(gif_path)
        all_frames.extend(clip_frames)
        durations.extend(times)
    all_frames[0].save(BASE / 'preview.gif', save_all=True, append_images=all_frames[1:], duration=durations, loop=0, disposal=2, optimize=False)
    manifest['preview'] = record(BASE / 'preview.gif')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--clip', choices=['run', 'idle', 'stop', 'hello'], required=True)
    parser.add_argument('--source', type=Path, required=True)
    args = parser.parse_args()
    export(args.clip, args.source)
