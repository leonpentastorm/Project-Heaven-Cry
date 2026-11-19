#!/usr/bin/env python3
"""Validate the actual Nov19 kept-blade grade candidates delivery without requiring unrelated art."""
import argparse
import hashlib
import json
import re
from pathlib import Path

from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
BASE = ROOT / 'art/_archive/gear/2026-11-19-kept-blade-grades'


def sha(path):
    return hashlib.sha256(path.read_bytes()).hexdigest()


def validate(selected=None, complete=False):
    queue = json.loads((BASE / 'queue.json').read_text())
    manifest = json.loads((BASE / 'manifest.json').read_text())
    catalog = json.loads((ROOT / 'art/catalog.json').read_text())['gear']
    text=(ROOT/'art/briefs/prompts-2026-11-19/08-grades-and-uniques.md').read_text()
    assert (BASE/'source-brief.md').read_text()==text, 'Brief changed; reconcile claim'
    expected=set(json.loads((BASE/'claim.json').read_text())['ids'])
    assert len(queue)==len(expected)
    assert expected == {standard+'--'+grade for standard in json.loads((BASE/'claim.json').read_text())['standards'] for grade in ('fine','masterwork','relic','celestial')}
    assert {j['id'] for j in queue} == expected
    delivered = {j['id'] for j in queue if j['status']=='delivered'}
    assert len(manifest['assets']) == len(delivered)
    assert {a['id'] for a in manifest['assets']} == delivered
    if complete:
        assert delivered == expected, 'Delivery is not complete'
    if selected:
        assert selected in delivered, 'Selected asset has not been delivered'
    hashes = {p: h for h,p in (line.split('  ',1) for line in (ROOT/'art/checksums.sha256').read_text().splitlines())}
    for a in manifest['assets']:
        job = next(j for j in queue if j['id'] == a['id'])
        assert (ROOT/a['prompt']['path']).read_text().strip() == job['prompt'].strip(), 'Selected prompt mismatch: '+a['id']
        entry = catalog[a['id']]
        assert a['id'] in expected and entry['path'] == a['path'] == f'art/icons/gear/{a["id"]}.png'
        assert entry['status'] == a['status'] == 'review-candidate'
        assert entry['production_approved'] is a['production_approved'] is False
        assert entry['grade'] == a['grade'] == next(j['grade'] for j in queue if j['id']==a['id'])
        assert entry['implementation_ready'] is False and entry['outline']['review_required'] is True
        assert entry['outline'] == a['outline'] and 0 <= a['outline']['solid_alpha_iou'] <= 1
        assert entry['source_path'] == a['source']['path'] and entry['native_dimensions'] == a['native_dimensions']
        assert entry['exports'] == a['exports'] and set(a['exports']) == {'256','128','64','32'}
        assert entry['sha256'] == a['sha256'] == sha(ROOT/a['path'])
        for rec in [a, a['source'], a['master'], a['prompt'], *a['references'], *a.get('reference_sources', [])]:
            assert sha(ROOT/rec['path']) == rec['sha256'] == hashes[rec['path']], rec['path']
        with Image.open(ROOT/a['source']['path']) as native:
            assert list(native.size) == a['native_dimensions']
        assert sha(ROOT/a['master']['path']) == a['sha256']
        for size,path in a['exports'].items():
            assert path == f'art/icons/gear/exports/{size}/{a["id"]}.png'
            assert sha(ROOT/path) == a['export_hashes'][size] == hashes[path], path
        if selected and a['id'] != selected:
            continue
        for size,path in [(1024,a['path']), *[(int(s),p) for s,p in a['exports'].items()]]:
            with Image.open(ROOT/path) as im:
                assert im.mode == 'RGBA' and im.size == (size,size), path
                alpha = im.getchannel('A')
                assert alpha.getextrema() == (0,255), path
                box = alpha.getbbox()
                assert box and min(box[0],box[1],size-box[2],size-box[3]) >= (50 if size==1024 else 1), path+' clear margins'
                assert len(im.convert('RGB').getcolors(size*size) or []) > 8, path+' painted RGB'
    progress = json.loads((BASE/'progress.json').read_text())
    assert set(progress['delivered']) == delivered
    assert set(progress['remaining']) == expected-delivered
    for family in {a['family'] for a in manifest['assets']}:
        for size in (64,32):
            with Image.open(BASE/f'reviews/{family}-{size}px.png') as sheet:
                assert sheet.mode == 'RGB' and sheet.width >= 220
    print(f'PASS: Nov19 kept-blade grade candidates {len(delivered)}/{len(queue)}; exact brief paths, catalog, source/master/prompt/reference/export hashes, candidate status and progress; pixel checks: {selected or "all delivered"}.')
    print('Scope: omitted historical art is not pixel-validated by this targeted check.')


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--asset')
    parser.add_argument('--complete', action='store_true')
    args = parser.parse_args()
    validate(args.asset, args.complete)
