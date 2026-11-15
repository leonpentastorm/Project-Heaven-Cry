#!/usr/bin/env python3
"""Placeholders for art that is wanted (one general script; Leon, 16 Nov 2026: "put place holder on everything").

Reads a list file (default art/briefs/placeholders-2026-11-16.json: items of {id, catalog, family, mode, label, tint,
path, ...}) and, for each item:
  1. writes the placeholder at `path`: an SVG (any mode), or a PNG when `path` ends in .png (the build needs a raster:
     perks, gear). A simple frame in the art mode's shape (wick: a rounded tile with a small flame; sign: a circle;
     emblem: a hexagon; portrait / abstract: a tall card; gear: a rounded tile; line: the 64-grid line-icon root), the
     item's short `label` in its `tint` (a key of art/style-guide/palette.json attributes, its ui_ink; or muted, white,
     neutral), and a small "PH" in the corner, so a placeholder is recognisable on screen and searchable;
  2. writes the catalog entry art/catalog.json[catalog][id] with `placeholder: true`. An entry that already holds real
     art (the 18 alpha perks, whose ids kept the OLD perk's icon) is kept as `previous_revision_path` / `previous_sha256`
     / `previous_label` / `previous_exports`, so nothing is lost and the delivery later replaces the placeholder by id.

Then run python3 tools/rehash_art_checksums.py and python3 tools/validate_art.py (it reports placeholders as one
allowed exception). Idempotent: re-running rewrites the same bytes."""
import argparse, hashlib, json, pathlib, sys
from PIL import Image, ImageDraw, ImageFont

ROOT = pathlib.Path(__file__).resolve().parents[2]
PALETTE = json.loads((ROOT / 'art/style-guide/palette.json').read_text(encoding='utf-8'))
NAMED = {'muted': '#A3AEC2', 'white': '#FFFFFF', 'neutral': '#A3AEC2'}
FONT = 'Chakra Petch, Arial, Helvetica, sans-serif'
LINE_ROOT = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">'


def ink_of(tint):
    a = PALETTE['attributes'].get(tint)
    return a['ui_ink'] if a else NAMED.get(tint, tint if str(tint).startswith('#') else '#FFFFFF')


def box_of(mode):
    return (800, 1000) if mode in ('portrait', 'abstract') else (64, 64) if mode == 'line' else (1024, 1024)


def flame(cx, top, s):
    """A small flame (Wick's head) as an SVG path: a teardrop of height 1.6 s."""
    return (f'M{cx} {top} C{cx + 0.55 * s} {top + 0.55 * s} {cx + 0.8 * s} {top + 0.95 * s} {cx + 0.45 * s} {top + 1.4 * s} '
            f'A{0.55 * s} {0.55 * s} 0 0 1 {cx - 0.45 * s} {top + 1.4 * s} C{cx - 0.8 * s} {top + 0.95 * s} {cx - 0.55 * s} {top + 0.55 * s} {cx} {top} Z')


def frame_svg(mode, w, h, ink):
    sw = round(w * 0.03, 1)
    if mode == 'sign':
        return f'<circle cx="{w / 2}" cy="{h / 2}" r="{w * 0.42}" stroke="{ink}" stroke-width="{sw}" fill="none"/>'
    if mode == 'emblem':
        import math
        pts = ' '.join(f'{w / 2 + w * 0.42 * math.cos(math.radians(60 * i - 90)):.1f},{h / 2 + h * 0.42 * math.sin(math.radians(60 * i - 90)):.1f}' for i in range(6))
        return f'<polygon points="{pts}" stroke="{ink}" stroke-width="{sw}" fill="none"/>'
    m = w * 0.08
    rect = f'<rect x="{m}" y="{m}" width="{w - 2 * m}" height="{h - 2 * m}" rx="{w * 0.12}" stroke="{ink}" stroke-width="{sw}" fill="none" stroke-dasharray="{"none" if mode != "gear" else f"{w * 0.06} {w * 0.03}"}"/>'
    if mode == 'wick':
        rect += f'<path d="{flame(w / 2, h * 0.14, w * 0.07)}" stroke="{ink}" stroke-width="{sw * 0.7}" fill="none"/>'
    return rect


def svg_of(item):
    ink = ink_of(item['tint'])
    mode, label = item['mode'], item['label']
    if mode == 'line':  # the line-icon root, so the client tints it (currentColor) like every Figment icon
        fs = 22 if len(label) <= 2 else 17 if len(label) == 3 else 13
        return (LINE_ROOT + '\n<!-- PLACEHOLDER ' + item['id'] + ': ' + item['name'] + ' (art wanted; art/briefs/placeholders-2026-11-16.json) -->\n'
                '<rect x="5" y="5" width="54" height="54" rx="8" stroke-dasharray="6 3"/>\n'
                f'<text x="32" y="{32 + fs * 0.36:.1f}" text-anchor="middle" font-family="{FONT}" font-weight="700" font-size="{fs}" fill="currentColor" stroke="none">{label}</text>\n'
                '<text x="57" y="58" text-anchor="end" font-family="' + FONT + '" font-weight="700" font-size="7" fill="currentColor" stroke="none">PH</text>\n</svg>\n')
    w, h = box_of(mode)
    fs = w * (0.30 if len(label) <= 2 else 0.24 if len(label) == 3 else 0.19)
    cy = h * (0.58 if mode == 'wick' else 0.5) + fs * 0.36
    return (f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 {w} {h}" width="{w}" height="{h}">\n'
            f'<!-- PLACEHOLDER {item["id"]}: {item["name"]} (art wanted; art/briefs/placeholders-2026-11-16.json) -->\n'
            + frame_svg(mode, w, h, ink) + '\n'
            f'<text x="{w / 2}" y="{cy:.1f}" text-anchor="middle" font-family="{FONT}" font-weight="700" font-size="{fs:.0f}" fill="{ink}">{label}</text>\n'
            f'<text x="{w * 0.8:.0f}" y="{h * 0.84:.0f}" text-anchor="end" font-family="{FONT}" font-weight="700" font-size="{w * 0.07:.0f}" fill="{ink}">PH</text>\n</svg>\n')


def font(px):
    try:
        return ImageFont.load_default(size=px)
    except TypeError:  # Pillow < 10.1
        return ImageFont.load_default()


def png_of(item):
    """The same placeholder as a raster (the build reads PNG): RGBA, transparent ground, drawn with Pillow."""
    ink = ink_of(item['tint'])
    mode, label = item['mode'], item['label']
    w, h = box_of(mode)
    S = 2  # drawn at 2x, then reduced: smooth edges
    im = Image.new('RGBA', (w * S, h * S), (0, 0, 0, 0))
    d = ImageDraw.Draw(im)
    sw = round(w * 0.03 * S)
    m = w * 0.08 * S
    if mode == 'sign':
        r = w * 0.42 * S
        d.ellipse((w * S / 2 - r, h * S / 2 - r, w * S / 2 + r, h * S / 2 + r), outline=ink, width=sw)
    else:
        d.rounded_rectangle((m, m, w * S - m, h * S - m), radius=w * 0.12 * S, outline=ink, width=sw)
    if mode == 'wick':  # a small flame: Wick's mark
        cx, top, s = w * S / 2, h * 0.14 * S, w * 0.07 * S
        d.polygon([(cx, top), (cx + 0.62 * s, top + 0.9 * s), (cx + 0.45 * s, top + 1.45 * s), (cx, top + 1.6 * s),
                   (cx - 0.45 * s, top + 1.45 * s), (cx - 0.62 * s, top + 0.9 * s)], outline=ink, width=round(sw * 0.7))
    fs = round(w * S * (0.30 if len(label) <= 2 else 0.24 if len(label) == 3 else 0.19))
    f = font(fs)
    cy = h * S * (0.58 if mode == 'wick' else 0.5)
    d.text((w * S / 2, cy), label, fill=ink, font=f, anchor='mm', stroke_width=round(fs * 0.04), stroke_fill=ink)
    f2 = font(round(w * S * 0.07))
    d.text((w * S * 0.8, h * S * 0.84), 'PH', fill=ink, font=f2, anchor='rs', stroke_width=2, stroke_fill=ink)
    return im.resize((w, h), Image.LANCZOS)


def write(item):
    p = ROOT / item['path']
    p.parent.mkdir(parents=True, exist_ok=True)
    if p.suffix == '.png':
        png_of(item).save(p, 'PNG', optimize=True)
    else:
        p.write_text(svg_of(item), encoding='utf-8', newline='\n')
    return p


KEEP = ('label', 'path', 'sha256', 'exports', 'width', 'height', 'ink')


def catalog_entry(cat, item, p):
    fam = cat.setdefault(item['catalog'], {})
    old = fam.get(item['id'])
    e = dict(old) if old else {}
    if old and not old.get('placeholder'):  # real art under this id (an alpha perk's old icon): keep it on record
        e['previous_revision_path'] = old['path']
        e['previous_sha256'] = old.get('sha256')
        e['previous_label'] = old.get('label')
        if old.get('exports'):
            e['previous_exports'] = old['exports']
    e.pop('exports', None)
    w, h = box_of(item['mode'])
    e.update({
        'label': 'PLACEHOLDER: ' + item['name'],
        'path': item['path'],
        'sha256': hashlib.sha256(p.read_bytes()).hexdigest(),
        'placeholder': True,
        'format': p.suffix[1:],
        'mode': item['mode'],
        'tint': item['tint'],
        'wanted': item.get('final') or item['path'],
        'brief': 'art/briefs/GPT-PROMPTS-2026-11-16-nine-doors.md #' + str(item.get('brief_number', '')),
        'slot': bool(item.get('slot')),
        'status': 'placeholder',
        'production_approved': False,
    })
    if p.suffix == '.png':
        e['width'], e['height'] = w, h
        e['background'] = 'transparent'
    if item['catalog'] in ('perks', 'traits'):
        e['ink'] = ink_of(item['tint'])  # a placeholder is tinted: the white-ink rule is its reported exception
        e.setdefault('data_id', item.get('data_id') or item['id'].replace('-', '_'))
    if item['catalog'] == 'figment_icons':
        e.update({'id': item['id'], 'grid': 64, 'stroke': 2, 'ink': 'currentColor'})
    fam[item['id']] = e


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument('list', nargs='?', default='art/briefs/placeholders-2026-11-16.json')
    a = ap.parse_args()
    items = json.loads((ROOT / a.list).read_text(encoding='utf-8'))['items']
    cpath = ROOT / 'art/catalog.json'
    cat = json.loads(cpath.read_text(encoding='utf-8'))
    for it in items:
        catalog_entry(cat, it, write(it))
    cpath.write_text(json.dumps(cat, indent=2) + '\n', encoding='utf-8', newline='\n')
    print(f'{len(items)} placeholders ({sum(1 for i in items if i.get("slot"))} drawn by a screen today) -> art/catalog.json')


if __name__ == '__main__':
    sys.exit(main())
