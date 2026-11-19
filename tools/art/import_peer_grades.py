#!/usr/bin/env python3
"""Import pinned peer drawings and remove only alpha<8 residue; never draws or edits the catalog.

Run --import once, then --validate. Root applies catalog-updates.json separately.
All Git commands are read-only. Original native/candidate images and production bytes survive.
"""
import argparse
import hashlib
import io
import json
import os
import subprocess
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[2]
PEER = '676764cfd29663c386e3b79538eef046153cedd3'
ARCHIVE = Path('art/_archive/prompt-pack/2026-11-19-file-08')
BASE = Path('art/_archive/gear/2026-11-19-kept-blade-grades/coordination/peer-import-v2')
ACTIVE_QUEUE = 'art/_archive/gear/2026-11-19-kept-blade-grades/queue.json'
SIZES = (256, 128, 64, 32)


def git(*args):
    return subprocess.check_output(['git', *args], cwd=ROOT)


def blob(revision, path):
    return git('show', revision + ':' + str(path))


def sha(data):
    return hashlib.sha256(data).hexdigest()


def encoded(value):
    return (json.dumps(value, ensure_ascii=False, indent=2) + '\n').encode()


def read_json(path):
    return json.loads((ROOT / path).read_bytes())


def write(path, data):
    path = Path(path)
    assert not path.is_absolute() and '..' not in path.parts
    assert str(path).startswith((str(ARCHIVE) + '/', str(BASE) + '/', 'art/icons/gear/'))
    target = ROOT / path
    target.parent.mkdir(parents=True, exist_ok=True)
    if target.is_file() and target.read_bytes() == data:
        return
    temporary = target.with_name('.' + target.name + '.peer-import.tmp')
    temporary.write_bytes(data)
    os.replace(temporary, target)


def save_png(path, image):
    out = io.BytesIO()
    image.save(out, format='PNG', optimize=True)
    write(path, out.getvalue())


def record(path):
    path = str(path)
    return {'path': path, 'sha256': sha((ROOT / path).read_bytes())}


def png(data):
    image = Image.open(io.BytesIO(data))
    image.load()
    assert image.mode == 'RGBA', image.mode
    return image


def margin(image):
    box = image.getchannel('A').getbbox()
    assert box, 'Empty image'
    return min(box[0], box[1], image.width - box[2], image.height - box[3])


def solid(image):
    return image.getchannel('A').point(lambda n: 255 if n >= 128 else 0).tobytes()


def ui_export(master, size):
    image = master.resize((size, size), Image.Resampling.LANCZOS)
    alpha = image.getchannel('A')
    # The same transparent one-pixel UI guard as the active grade exporter.
    for box in ((0, 0, size, 1), (0, size-1, size, size),
                (0, 0, 1, size), (size-1, 0, size, size)):
        alpha.paste(0, box)
    image.putalpha(alpha)
    return image


def tree(revision, prefix=None):
    args = ['ls-tree', '-rz', '--long', revision]
    if prefix:
        args += ['--', str(prefix)]
    result = {}
    for row in git(*args).split(b'\0'):
        if row:
            meta, path = row.split(b'\t', 1)
            mode, kind, object_id, size = meta.decode().split()
            assert kind == 'blob'
            result[path.decode()] = {'mode': mode, 'object': object_id, 'size': int(size)}
    return result


def normalize_paths(value, peer_tree, mappings, owner):
    if isinstance(value, dict):
        return {k: normalize_paths(v, peer_tree, mappings, owner) for k, v in value.items()}
    if isinstance(value, list):
        return [normalize_paths(v, peer_tree, mappings, owner) for v in value]
    if isinstance(value, str) and value.startswith('/') and '/art/' in value:
        relative = 'art/' + value.split('/art/', 1)[1]
        if relative in peer_tree:
            mappings.append({'metadata': owner, 'original': value, 'portable': relative})
            return relative
    return value


def comparison_sheets(assets, peer_catalog):
    stems = sorted({a['id'].split('--')[0] for a in assets})
    delivered = {a['id']: a for a in assets}
    rows = []
    for size in (64, 32):
        row_height = size + 48
        sheet = Image.new('RGB', (5 * 220, len(stems) * row_height + 24), '#10151F')
        draw = ImageDraw.Draw(sheet)
        draw.text((8, 6), f'Peer grade candidates | actual {size}px | Standard / Fine / Masterwork / Relic / Celestial', fill='white')
        for row, stem in enumerate(stems):
            for col, grade in enumerate(('standard', 'fine', 'masterwork', 'relic', 'celestial')):
                y = row * row_height + 24
                if grade == 'standard':
                    std = peer_catalog[stem + '--' + next(g for g in ('fine', 'masterwork', 'relic', 'celestial') if stem + '--' + g in delivered)]['standard_path']
                    image = png(blob(PEER, std)).resize((size, size), Image.Resampling.LANCZOS)
                else:
                    a = delivered.get(stem + '--' + grade)
                    if not a:
                        draw.text((col * 220 + 8, y + 12), 'Pending', fill='#AAAAAA')
                        continue
                    image = png((ROOT / a['exports'][str(size)]['path']).read_bytes())
                sheet.paste(image, (col * 220 + (220-size)//2, y), image)
                draw.text((col * 220 + 5, y + size + 5), stem, fill='white')
                draw.text((col * 220 + 5, y + size + 19), grade, fill='white')
        path = BASE / 'reviews' / f'peer-grades-{size}px.png'
        out = io.BytesIO()
        sheet.save(out, format='PNG', optimize=True)
        write(path, out.getvalue())
        rows.append(record(path))
    return rows


def imported_handoff():
    notice = f'''# Imported technical v2 notice

This peer handoff below is a historical snapshot from `{PEER}`. Its229/871 count is not the current combined count. This branch imported all58 completed peer drawings and removed only alpha<8 residue; original native/candidate images and previous masters/exports/metadata are preserved. The current technical bindings and integration instructions are in `{BASE}/README.md`.

Do not rerun the legacy `prepare-candidates.py` or `register-grade.py` commands over these58 completed drawings: that would replace the selected clean v2 bindings with the older preparation. Validate the imported delivery with `python3 tools/art/import_peer_grades.py --validate --check-catalog` after root applies catalog-updates.json. Artistic approval and exact-outline review remain pending. Root's active queue and handoff remain authoritative for current claims and counts.

The original handoff bytes are preserved under `{BASE}/peer-original-metadata/{ARCHIVE}/HANDOFF.md`.

---

'''
    return notice.encode() + blob(PEER, ARCHIVE / 'HANDOFF.md')


def import_peer():
    if (ROOT / BASE / 'manifest.json').is_file():
        validate(False)
        print('Already imported; no files changed. Apply the prepared catalog updates separately.')
        return
    snapshot = git('rev-parse', 'HEAD').decode().strip()
    peer_tree = tree(PEER)
    current_tree = tree(snapshot)
    peer_catalog = json.loads(blob(PEER, 'art/catalog.json'))['gear']
    current_catalog = json.loads(blob(snapshot, 'art/catalog.json'))['gear']
    queue_ids = {j['id'] for j in json.loads(blob(snapshot, ACTIVE_QUEUE))}
    delivery_paths = sorted(p for p in peer_tree if p.startswith(str(ARCHIVE / 'delivered') + '/') and p.endswith('.json'))
    deliveries = [json.loads(blob(PEER, p)) for p in delivery_paths]
    ids = {Path(d['path']).stem for d in deliveries}
    assert len(deliveries) == len(ids) == 58
    assert not ids & queue_ids, 'Peer jobs overlap the active rendering queue'
    existing = sorted(ids & current_catalog.keys())
    assert len(existing) == 12, 'Reconcile canonical imports before changing production paths'
    original_production = {}
    for d in deliveries:
        for path in [d['path'], *d['exports'].values()]:
            data = blob(PEER, path)
            original_production[path] = data
            target = ROOT / path
            assert not target.is_file() or target.read_bytes() == data, 'Unexpected existing artwork: ' + path
            if path in current_tree:
                assert blob(snapshot, path) == data, 'Tracked peer artwork differs: ' + path
    # Preserve any preexisting portable source metadata independently of peer history.
    preexisting = []
    for path in peer_tree:
        if not path.startswith(str(ARCHIVE) + '/'):
            continue
        target = ROOT / path
        if path in current_tree and current_tree[path]['object'] != peer_tree[path]['object']:
            dst = BASE / 'preexisting-head' / path
            write(dst, blob(snapshot, path))
            preexisting.append(record(dst))
        if target.is_file() and sha(target.read_bytes()) != sha(blob(PEER, path)):
            dst = BASE / 'preexisting-worktree' / path
            write(dst, target.read_bytes())
            preexisting.append(record(dst))
    preservation, mappings = [], []
    archive_paths = sorted(p for p in peer_tree if p.startswith(str(ARCHIVE) + '/'))
    for path in archive_paths:
        raw = blob(PEER, path)
        suffix = Path(path).suffix.lower()
        if suffix in {'.json', '.md', '.py', '.txt'}:
            original = BASE / 'peer-original-metadata' / path
            write(original, raw)
        else:
            original = Path(path)  # Native, candidate and earlier revision image bytes stay untouched.
        preservation.append({'peer_path': path, 'path': str(original), 'sha256': sha(raw)})
        if suffix == '.json':
            parsed = json.loads(raw)
            normalized = normalize_paths(parsed, peer_tree, mappings, path)
            live = raw if parsed == normalized else encoded(normalized)
        else:
            live = raw
        write(path, live)
        if peer_tree[path]['mode'] == '100755':
            (ROOT / path).chmod(0o755)
    for path, data in original_production.items():
        dst = BASE / 'peer-original-production' / path
        write(dst, data)
        preservation.append({'peer_path': path, 'path': str(dst), 'sha256': sha(data)})
    write(BASE / 'previous-catalog.json', encoded({k: current_catalog[k] for k in existing}))
    write(BASE / 'peer-original-catalog.json', encoded({k: peer_catalog[k] for k in sorted(ids)}))
    write(BASE / 'path-mappings.json', encoded(mappings))
    candidates = json.loads(blob(PEER, ARCHIVE / 'candidate-manifest.json'))
    candidate_map = {r['candidate']: r for r in candidates}
    catalog_updates, assets = {}, []
    for delivery_path, d in zip(delivery_paths, deliveries):
        aid = Path(d['path']).stem
        a = dict(peer_catalog[aid])
        original = png(original_production[d['path']])
        assert original.size == (1024, 1024)
        clean = original.copy()
        clean.putalpha(original.getchannel('A').point(lambda n: 0 if n < 8 else n))
        assert clean.convert('RGB').tobytes() == original.convert('RGB').tobytes()
        assert solid(clean) == solid(original), 'Solid silhouette changed: ' + aid
        assert margin(clean) >= 50, 'Residue above cleanup threshold: ' + aid
        master_path = BASE / 'masters/v2' / (aid + '.png')
        save_png(master_path, clean)
        write(d['path'], (ROOT / master_path).read_bytes())
        exports = {}
        for size, path in d['exports'].items():
            exported = ui_export(clean, int(size))
            assert margin(exported) >= 1
            save_png(path, exported)
            exports[size] = record(path)
        previous = BASE / 'peer-original-production' / d['path']
        a.update(sha256=record(master_path)['sha256'], previous_path=str(previous),
                 previous_sha256=d['sha256'], production_approved=False, implementation_ready=False)
        a['review_notes'] = a.get('review_notes', '') + ' Technical v2 removes only alpha below 8; RGB and solid alpha silhouette are unchanged. Native/candidate and previous production bytes are preserved in peer-import-v2 provenance.'
        a['technical_revision'] = {'type': 'alpha-residue-cleanup', 'threshold': 8,
                                   'peer_commit': PEER, 'manifest': str(BASE / 'manifest.json')}
        catalog_updates[aid] = a
        original_candidate = d['candidate']
        row = candidate_map[original_candidate]
        standard = png(blob(PEER, a['standard_path']))
        sx = standard.resize((64, 64), Image.Resampling.LANCZOS).getchannel('A').point(lambda n: 255 if n >= 128 else 0)
        sy = clean.resize((64, 64), Image.Resampling.LANCZOS).getchannel('A').point(lambda n: 255 if n >= 128 else 0)
        differing = sum(x != y for x, y in zip(sx.tobytes(), sy.tobytes()))
        for metadata in (row, d):
            metadata.update(previous_candidate=original_candidate, candidate=str(master_path),
                            sha256=a['sha256'], size64_mask_differing_pixels=differing,
                            technical_cleanup={'alpha_below': 8, 'solid_alpha_unchanged': True})
        d.update(previous_path=str(previous), previous_sha256=sha(original_production[d['path']]))
        write(delivery_path, encoded(d))
        source_metadata = d['source'][:-4] + '.json'
        source_job = read_json(source_metadata)
        peer_job = json.loads(blob(PEER, source_metadata))
        assert source_job['prompt'] == peer_job['prompt']
        refs = []
        for path in source_job.get('refs', []):
            assert not Path(path).is_absolute() and (ROOT / path).is_file(), path
            assert sha((ROOT / path).read_bytes()) == sha(blob(PEER, path)), path
            refs.append(record(path))
        native = png((ROOT / d['source']).read_bytes())
        assert list(native.size) == a['native_dimensions']
        assert sha((ROOT / d['source']).read_bytes()) == d['source_sha256']
        assets.append({'id': aid, 'grade': d['tier'], 'production': record(d['path']),
                       'master': record(master_path), 'exports': exports,
                       'source': record(d['source']), 'native_dimensions': list(native.size),
                       'source_metadata': record(source_metadata), 'references': refs,
                       'original_candidate': record(original_candidate),
                       'original_production': record(previous),
                       'delivery_record': record(delivery_path),
                       'before_full_alpha_margin': margin(original),
                       'after_full_alpha_margin': margin(clean),
                       'solid_alpha_unchanged': True, 'rgb_unchanged': True,
                       'size64_mask_differing_pixels': differing,
                       'status': 'review-candidate', 'production_approved': False,
                       'implementation_ready': False})
    write(ARCHIVE / 'candidate-manifest.json', encoded(candidates))
    write(ARCHIVE / 'HANDOFF.md', imported_handoff())
    write(BASE / 'catalog-updates.json', encoded({'gear': catalog_updates}))
    reviews = comparison_sheets(assets, peer_catalog)
    manifest = {'version': 2, 'peer_commit': PEER, 'baseline_branch_snapshot': snapshot,
                'created_utc': datetime.now(timezone.utc).isoformat(),
                'count': 58, 'new_catalog_entries': 46, 'canonical_reused_entries': existing,
                'production_approved': False, 'catalog_application': 'pending root application',
                'operation': 'Set alpha below 8 to zero only; RGB, geometry and alpha>=8 unchanged. Exports use Lanczos plus one-pixel transparent guard.',
                'assets': assets, 'preserved_peer_files': preservation,
                'preexisting_preservation': preexisting, 'path_mappings': mappings,
                'reviews': reviews,
                'archive_files': [record(p) for p in archive_paths]}
    write(BASE / 'manifest.json', encoded(manifest))
    report = validate(False)
    write(BASE / 'VALIDATION.json', encoded(report))
    write(BASE / 'README.md', instructions(manifest).encode())
    print('Prepared 58 cleaned peer candidates (46 new, 12 revised canonical imports); catalog and checksums NOT changed.')


def validate(check_catalog=False):
    manifest = read_json(BASE / 'manifest.json')
    updates = read_json(BASE / 'catalog-updates.json')['gear']
    assert manifest['peer_commit'] == PEER and len(manifest['assets']) == len(updates) == 58
    assert len(manifest['canonical_reused_entries']) == 12 and manifest['new_catalog_entries'] == 46
    for rec in [*manifest['preserved_peer_files'], *manifest['preexisting_preservation'],
                *manifest['archive_files'], *manifest['reviews']]:
        assert sha((ROOT / rec['path']).read_bytes()) == rec['sha256'], rec['path']
    margins, export_margins, same_solid = [], [], 0
    current_catalog = read_json('art/catalog.json')['gear'] if check_catalog else None
    for a in manifest['assets']:
        aid = a['id']
        u = updates[aid]
        for rec in [a['production'], a['master'], a['source'], a['source_metadata'],
                    a['original_candidate'], a['original_production'], a['delivery_record'],
                    *a['references'], *a['exports'].values()]:
            assert not Path(rec['path']).is_absolute() and '..' not in Path(rec['path']).parts
            assert sha((ROOT / rec['path']).read_bytes()) == rec['sha256'], rec['path']
        old = png((ROOT / a['original_production']['path']).read_bytes())
        new = png((ROOT / a['production']['path']).read_bytes())
        assert old.size == new.size == (1024, 1024)
        assert new.tobytes() == png((ROOT / a['master']['path']).read_bytes()).tobytes()
        assert old.convert('RGB').tobytes() == new.convert('RGB').tobytes()
        assert new.getchannel('A').tobytes() == old.getchannel('A').point(lambda n: 0 if n < 8 else n).tobytes()
        assert solid(old) == solid(new)
        same_solid += 1
        assert margin(new) >= 50
        margins.append(margin(new))
        assert u['path'] == a['production']['path'] and u['sha256'] == a['production']['sha256'] == a['master']['sha256']
        assert u['source_path'] == a['source']['path']
        assert u['production_approved'] is False and u['implementation_ready'] is False
        native = png((ROOT / a['source']['path']).read_bytes())
        assert list(native.size) == a['native_dimensions'] == u['native_dimensions']
        selected_job = read_json(a['source_metadata']['path'])
        peer_job = json.loads(blob(PEER, a['source_metadata']['path']))
        assert selected_job['prompt'] == peer_job['prompt'] and selected_job['refs'] == peer_job['refs']
        assert [r['path'] for r in a['references']] == selected_job['refs']
        delivered = read_json(a['delivery_record']['path'])
        assert delivered['candidate'] == a['master']['path'] and delivered['sha256'] == u['sha256']
        for size, rec in a['exports'].items():
            image = png((ROOT / rec['path']).read_bytes())
            assert image.size == (int(size), int(size))
            assert image.tobytes() == ui_export(new, int(size)).tobytes()
            assert margin(image) >= 1
            export_margins.append(margin(image))
            assert u['exports'][size] == rec['path']
        if current_catalog is not None:
            assert current_catalog[aid] == u, 'Root must apply catalog update: ' + aid
    assert len(export_margins) == 232 and same_solid == 58
    report = {'peer_commit': PEER, 'validation': 'PASS', 'masters': 58, 'exports': 232,
              'native_sources': 58, 'all_original_files_preserved': True,
              'all_solid_alpha_masks_unchanged': same_solid == 58,
              'all_rgb_unchanged': True, 'alpha_change': 'only original alpha<8 set to zero',
              'minimum_master_full_alpha_margin': min(margins),
              'minimum_export_full_alpha_margin': min(export_margins),
              'selected_prompts_and_reference_paths_unchanged': True,
              'catalog_checked': check_catalog, 'production_approved': False,
              'scope': 'Pinned58 peer grade candidates only; whole-library checks remain root integration work.'}
    print(json.dumps(report))
    return report


def instructions(manifest):
    return f'''# Peer grade import and technical alpha cleanup

Source: `art/2026-11-19-grade-proof` at `{PEER}`. **58 drawings, 232 exports;46 new catalog entries and12 canonical shared imports.** This is technical cleanup, not new drawing or artistic approval. All remain review-candidate, production_approved:false, implementation_ready:false. The main renderer's active queue/progress and shared claims were not changed.

Only alpha values below8 are set to zero in each1024 master. RGB, alpha>=8, canvas, pose and solid-alpha silhouette are unchanged. Masters now have at least81px fully clear margins; exports have a transparent one-pixel frame guard. Native sources and original candidate paintings are untouched. All original peer production masters/exports are in `peer-original-production/`. Original metadata/scripts/docs are in `peer-original-metadata/`; earlier peer border revisions remain in their imported original archive. `manifest.json` binds every original and selected file by SHA256. Historical absolute trial-reference paths have explicit mappings in `path-mappings.json`, with original JSON preserved.

The imported peer `delivered/*.json` and `candidate-manifest.json` now select clean v2 masters here, while `candidate-masters/` keeps the original prepared images. Source JSON prompts and their114 selected reference paths are unchanged. `reviews/` contains actual32/64px comparison sheets.

Do not rerun the imported legacy preparation/registration scripts over completed drawings; they precede this technical revision. The copied peer handoff has a notice pointing to these current instructions, and its original bytes are preserved.

## Root integration steps

1. After the concurrent render/export finishes, apply the58 `gear` entries in `catalog-updates.json` using the existing `set_catalog_entry` helper, preserving unrelated catalog formatting and entries. Do not overwrite the whole catalog with the peer catalog.
2. Run `python3 tools/art/import_peer_grades.py --validate --check-catalog`. Run the active grade validator too. This tool never writes catalog.json, checksums.sha256, active queue/progress/HANDOFF or WORK-CLAIMS; it never commits, pushes or renders.
3. Rehash once after all new files are stable, run the relevant validators and `git diff --check`, then stage the tool, this coordination folder, all imported peer archive files,58 peer masters/232 exports, catalog and checksums. Sparse omitted tracked sources may require `git add --sparse`.
4. Update the main handoff/count using distinct IDs: baseline150 +peer58 +main's exclusive delivered count. Shared12 imports, exports, native trials and archived alternatives never count again. Preserve peer quota/blocked-job records and check shared issue3 before claiming released work.

`VALIDATION.json` is the independent artifact check performed before root catalog application. Rerunning `--import` validates an existing completed import without overwriting it.

Peer quota reset:20 November2026 at09:45:39 Vietnam time (02:45:39UTC), epoch1795142739. Ten headgear jobs were released; three separate moderation failures leave eight other pending/dependent grades. The copied peer handoff's229/871 count is a historical snapshot, not this branch's current total.
'''


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    action = parser.add_mutually_exclusive_group(required=True)
    action.add_argument('--import', dest='do_import', action='store_true')
    action.add_argument('--validate', action='store_true')
    parser.add_argument('--check-catalog', action='store_true', help='Read and verify root-applied updates; never writes catalog')
    args = parser.parse_args()
    if args.do_import:
        assert not args.check_catalog
        import_peer()
    else:
        validate(args.check_catalog)
