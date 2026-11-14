#!/usr/bin/env python3
"""Write the `kit` section of art/catalog.json from the map kits in art/sprites/kit/<setting>/ (rules 1.45; survival-spec
4.3, "the drawing contract"). One entry a piece, id `kit-<setting>-<piece>`: the setting, the piece's file name, what
kind of piece it is (floor, wall, doorway, breach, cover-half, cover-full, broken, door, prop, decal, dressing), the
engine object kind it draws (objects.json) where it draws one, its size, the delivery's own catalog id (`survival_art`)
and review status, and `use`: false for a piece the game must not draw yet, with the reason (HOLD below). Idempotent:
the section is rebuilt from the folders each run; run it after a kit delivery, then tools/rehash_art_checksums.py and
tools/validate_art.py, then npm run assets.
"""
import json, pathlib, re
from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parents[2]
CAT = ROOT / 'art/catalog.json'
KIT = ROOT / 'art/sprites/kit'
OBJECT_KINDS = {o['id'] for o in json.loads((ROOT / 'data/objects.json').read_text())['items']}
COVER = {o['id']: o.get('cover') for o in json.loads((ROOT / 'data/objects.json').read_text())['items']}
WALLS = {'wall-straight': 'wall', 'wall-corner': 'wall', 'wall-end': 'wall', 'wall-door': 'doorway', 'wall-broken': 'breach'}
# Pieces held back after looking at them in the game's renderer (13 Nov 2026, the kit trial; art/briefs/ART-REQUESTS.md S7):
# a piece listed here is catalogued but not drawn: the game draws what it drew before (the per-piece fallback).
HOLD = {
    'kit-ahoc-dress-2': 'lettering painted on the floor (the brief: no text, no letters)',
    'kit-ahoc-ground-2': 'a seam at the left-right join (tools/art/kit_seams.py)',
    'kit-shrine-ground-2': 'a seam at the top-bottom join: the octagon rows lose their step (tools/art/kit_seams.py)',
    'kit-rim-wall-corner': 'not the straight piece\'s wall: another panel grid and shade, so every corner shows a join',
}


def kind_of(piece):
    if piece.startswith('ground-'): return 'floor', None
    if piece.startswith('decal-'): return 'decal', {'decal-rubble': 'rubble', 'decal-toxic': 'toxic', 'decal-scorch': None}[piece]
    if piece.startswith('dress-'): return 'dressing', None
    if piece in WALLS: return WALLS[piece], None
    if piece.endswith('-broken'): return 'broken', piece[:-len('-broken')]
    if piece in ('door', 'door-open'): return 'door', 'door'
    if piece in OBJECT_KINDS:
        c = COVER.get(piece)
        return ('cover-' + c if c else 'prop'), piece
    raise SystemExit(f'kit piece {piece!r}: not a ground, decal, dressing, wall, door or object kind of objects.json')


def main():
    text = CAT.read_text()
    cat = json.loads(text)
    by_path = {a['path']: aid for aid, a in (cat.get('survival_art') or {}).items()}
    kit = {}
    for folder in sorted(p for p in KIT.iterdir() if p.is_dir()):
        for f in sorted(folder.glob('*.png')):
            piece, setting = f.stem, folder.name
            k, obj = kind_of(piece)
            rel = str(f.relative_to(ROOT))
            src = by_path.get(rel)
            with Image.open(f) as im:
                w, h = im.size
            entry = {'setting': setting, 'piece': piece, 'kind': k}
            if obj: entry['object'] = obj
            entry.update({'path': rel, 'width': w, 'height': h, 'delivery': src,
                          'status': (cat['survival_art'][src].get('status') if src else 'review-candidate'), 'use': True})
            kid = f'kit-{setting}-{piece}'
            if kid in HOLD:
                entry['use'] = False
                entry['why'] = HOLD[kid]
            kit[kid] = entry
    # the section is the catalog's last key: cut the old one (if any) and append the new, leaving the rest byte for byte
    m = re.search(r',\n  "kit": \{.*\n\}\n$', text, re.S)
    head = text[:m.start()] if m else text.rstrip()[:-1].rstrip()
    body = json.dumps(kit, indent=2, ensure_ascii=False).replace('\n', '\n  ')
    CAT.write_text(head + ',\n  "kit": ' + body + '\n}\n')
    held = sum(1 for e in kit.values() if not e['use'])
    print(f'{len(kit)} kit pieces in {len({e["setting"] for e in kit.values()})} settings -> art/catalog.json kit ({held} held back)')


if __name__ == '__main__':
    main()
