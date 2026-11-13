#!/usr/bin/env python3
"""The map kits' ground textures repeat without a visible seam (rules 1.45; survival-spec 4.3; art/briefs/GPT-PROMPTS-
2026-11-13-survival.md, batch 1c). For every art/sprites/kit/<setting>/ground-<n>.png, the join a repeat makes is
compared with the texture's own grain:

  edge     mean absolute difference (0 to 255, over RGB) between the last column and the first (left-right join), and
           between the last row and the first (top-bottom join): what a 1-pixel seam looks like;
  grain    the same difference between neighbouring columns (rows) inside the texture: what any 1-pixel step looks like;
  ratio    edge / grain: about 1 is invisible, above SEAM_MAX a line shows;
  band     the difference of the mean colour of the 16-pixel strips either side of the join, against the same measure
           between strips inside: a step in light or colour (a low, wide seam) that the 1-pixel test misses.

Prints a table and exits 1 when a ground passes SEAM_MAX on either measure. --sheet DIR writes each ground repeated 4 x 4
(at a quarter of its size: about what the game shows) into DIR to look at. Run: python3 tools/art/kit_seams.py
"""
import pathlib, sys
from PIL import Image
import numpy as np

ROOT = pathlib.Path(__file__).resolve().parents[2]
SEAM_MAX = 2.0  # edge/grain or band/band-inside above this reads as a seam at game size (PROVISIONAL)
STRIP = 16


def measure(path):
    a = np.asarray(Image.open(path).convert('RGB'), dtype=np.float32)
    h, w, _ = a.shape
    grain_x = np.abs(np.diff(a, axis=1)).mean()
    grain_y = np.abs(np.diff(a, axis=0)).mean()
    edge_x = np.abs(a[:, -1] - a[:, 0]).mean()
    edge_y = np.abs(a[-1] - a[0]).mean()

    def band(axis):
        # the step between the strips either side of the join, against the median step between strips inside
        strips = [a[:, i:i + STRIP].mean(axis=(0, 1)) if axis == 1 else a[i:i + STRIP].mean(axis=(0, 1)) for i in range(0, (w if axis == 1 else h) - STRIP + 1, STRIP)]
        inside = np.percentile([np.abs(strips[i + 1] - strips[i]).mean() for i in range(len(strips) - 1)], 90)
        join = np.abs(strips[0] - strips[-1]).mean()
        return join, inside
    bx, bxi = band(1)
    by, byi = band(0)
    return {'edge_x': edge_x, 'grain_x': grain_x, 'edge_y': edge_y, 'grain_y': grain_y, 'ratio_x': edge_x / max(grain_x, 1e-6), 'ratio_y': edge_y / max(grain_y, 1e-6),
            'band_x': bx / max(bxi, 0.25), 'band_y': by / max(byi, 0.25)}


def sheet(path, out):
    im = Image.open(path).convert('RGB')
    w, h = im.size
    big = Image.new('RGB', (w * 4, h * 4))
    for y in range(4):
        for x in range(4):
            big.paste(im, (x * w, y * h))
    big.resize((w, h), Image.LANCZOS).save(out)


def main():
    args = sys.argv[1:]
    out = pathlib.Path(args[args.index('--sheet') + 1]) if '--sheet' in args else None
    grounds = sorted((ROOT / 'art/sprites/kit').glob('*/ground-*.png'))
    bad = 0
    print('| Ground | edge / grain, left-right | edge / grain, top-bottom | band step, left-right | band step, top-bottom | Seam |')
    print('| --- | --- | --- | --- | --- | --- |')
    for g in grounds:
        m = measure(g)
        worst = max(m['ratio_x'], m['ratio_y'], m['band_x'], m['band_y'])
        seam = worst > SEAM_MAX
        bad += seam
        name = g.parent.name + '/' + g.name
        print(f"| {name} | {m['edge_x']:.1f} / {m['grain_x']:.1f} = {m['ratio_x']:.2f} | {m['edge_y']:.1f} / {m['grain_y']:.1f} = {m['ratio_y']:.2f} | "
              f"{m['band_x']:.2f} | {m['band_y']:.2f} | {'SEAM' if seam else 'clean'} |")
        if out:
            out.mkdir(parents=True, exist_ok=True)
            sheet(g, out / ('seam-' + g.parent.name + '-' + g.stem + '.png'))
    print(f'{len(grounds)} grounds, {bad} with a seam over {SEAM_MAX}')
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
