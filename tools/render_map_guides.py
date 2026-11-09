"""Render each zone of a campaign as a layout guide for the map painter.

The guide shows, on a 100 px-per-tile grid with letter columns and number rows:
  - walls and hulls (solid tiles): paint these into the background;
  - slow ground (difficult tiles): paint as rubble, mud or wreckage;
  - object tiles (crates, doors, terminals, POIs...): leave as plain floor in the background; the game draws a sprite there;
  - start tiles (party: green, enemies: red) and the zone's notes, for context.

Usage: python3 tools/render_map_guides.py data/campaigns/m813.json art/_archive/briefs/m813-tutorial/maps
"""
import json, re, sys, pathlib
from PIL import Image, ImageDraw, ImageFont

T = 100   # px per tile in the guide
M = 44    # margin for axis labels
FONT = '/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf'
BOLD = '/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf'
SYM = {'crate': 'CRATE', 'low_wall': 'LOW WALL', 'pillar': 'PILLAR', 'barricade': 'BARRICADE', 'door': 'DOOR', 'hole': 'HOLE', 'trap': 'TRAP',
       'fire': 'FIRE', 'toxic': 'TOXIC', 'barrel': 'BARREL', 'rubble': 'RUBBLE', 'container': 'CONTAINER', 'terminal': 'TERMINAL', 'poi': 'POI', 'exit': 'EXIT'}
LET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'


def key(ref):
    m = re.match(r'^\s*([A-Za-z])\s*(\d{1,3})\s*$', ref or '')
    return (LET.index(m.group(1).upper()), int(m.group(2)) - 1) if m else None


def expand(lst, w, h):
    out = set()
    for item in lst or []:
        for part in item.split(','):
            ends = [key(r) for r in re.split('[–-]', part)]
            if not ends[0]:
                continue
            (x1, y1), (x2, y2) = ends[0], (ends[1] if len(ends) > 1 and ends[1] else ends[0])
            for x in range(min(x1, x2), max(x1, x2) + 1):
                for y in range(min(y1, y2), max(y1, y2) + 1):
                    if x < w and y < h:
                        out.add((x, y))
    return out


def wrap(d, text, font, width):
    words, lines, cur = text.split(), [], ''
    for wd in words:
        t = (cur + ' ' + wd).strip()
        if d.textlength(t, font=font) <= width:
            cur = t
        else:
            lines.append(cur); cur = wd
    return lines + ([cur] if cur else [])


def render(zone, path):
    w, h = zone['w'], zone['h']
    img = Image.new('RGB', (M + w * T + 2, M + h * T + 2 + 300), (246, 243, 236))
    d = ImageDraw.Draw(img)
    f, fb, fs = ImageFont.truetype(FONT, 15), ImageFont.truetype(BOLD, 16), ImageFont.truetype(FONT, 13)
    solid, diff = expand(zone.get('solid'), w, h), expand(zone.get('difficult'), w, h)
    starts, enemies = expand(zone.get('start'), w, h), expand(zone.get('enemyStart'), w, h)
    for x in range(w):
        for y in range(h):
            x0, y0 = M + x * T, M + y * T
            fill = (58, 62, 70) if (x, y) in solid else (214, 205, 186) if (x, y) in diff else (236, 231, 220)
            d.rectangle([x0, y0, x0 + T, y0 + T], fill=fill, outline=(170, 162, 148))
            if (x, y) in diff:
                for k in range(-T, T, 14):
                    d.line([x0 + max(0, k), y0 + max(0, -k), x0 + min(T, T + k), y0 + min(T, T - k)], fill=(176, 160, 130), width=1)
            if (x, y) in solid:
                d.text((x0 + 8, y0 + 8), 'WALL', font=fs, fill=(200, 200, 205))
            d.text((x0 + T - 30, y0 + T - 18), LET[x] + str(y + 1), font=fs, fill=(150, 142, 128) if (x, y) not in solid else (120, 124, 132))
    for (x, y) in starts:
        d.ellipse([M + x * T + 38, M + y * T + 38, M + x * T + 62, M + y * T + 62], fill=(70, 170, 90))
    for (x, y) in enemies:
        d.ellipse([M + x * T + 38, M + y * T + 38, M + x * T + 62, M + y * T + 62], outline=(200, 60, 60), width=4)
    objs = list(zone.get('objects') or []) + [{'kind': 'exit', 'at': e['at'], 'name': 'To ' + e['to']} for e in zone.get('exits') or [] if e.get('at')]
    for o in objs:
        k = key(o['at'])
        if not k:
            continue
        x0, y0 = M + k[0] * T, M + k[1] * T
        d.rectangle([x0 + 3, y0 + 3, x0 + T - 3, y0 + T - 3], outline=(196, 60, 60), width=3)
        d.text((x0 + 8, y0 + 6), SYM.get(o['kind'], o['kind'].upper()), font=fb, fill=(150, 30, 30))
        for i, line in enumerate(wrap(d, o.get('name', ''), fs, T - 14)[:3]):
            d.text((x0 + 8, y0 + 28 + i * 16), line, font=fs, fill=(90, 30, 30))
    for x in range(w):
        d.text((M + x * T + T // 2 - 6, 12), LET[x], font=fb, fill=(60, 60, 60))
    for y in range(h):
        d.text((8, M + y * T + T // 2 - 9), str(y + 1), font=fb, fill=(60, 60, 60))
    ty = M + h * T + 16
    d.text((M, ty), zone['name'].upper() + '  ·  ' + str(w) + ' × ' + str(h) + ' tiles of 1.5 m', font=fb, fill=(30, 30, 30))
    legend = ('Dark = walls/hulls: paint into the background. Hatched = slow ground: rubble, mud, wreckage. Red boxes = objects: leave plain floor, '
              'the game draws their sprites on top. Green dots = party start, red rings = enemy start (context only, do not paint).')
    for i, line in enumerate(wrap(d, legend, f, w * T - 20)):
        d.text((M, ty + 26 + i * 20), line, font=f, fill=(60, 60, 60))
    ny = ty + 26 + 20 * len(wrap(d, legend, f, w * T - 20)) + 10
    for n in zone.get('notes') or []:
        for i, line in enumerate(wrap(d, n['at'] + ': ' + n['text'], fs, w * T - 20)):
            if ny < img.height - 18:
                d.text((M, ny), line, font=fs, fill=(80, 80, 80)); ny += 17
    img.save(path)


if __name__ == '__main__':
    camp, out = json.load(open(sys.argv[1])), pathlib.Path(sys.argv[2])
    out.mkdir(parents=True, exist_ok=True)
    for z in camp['zones']:
        render(z, out / (z['id'] + '-layout.png'))
        print('rendered', out / (z['id'] + '-layout.png'))
