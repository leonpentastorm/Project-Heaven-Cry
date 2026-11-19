#!/usr/bin/env python3
"""Regenerate art/checksums.sha256: every file under art/ (except this list itself) plus the non-art files it already
tracks (the art tooling and docs), with fresh hashes, sorted by path. Run after adding, moving or editing art files;
then run python3 tools/validate_art.py. Embedded hashes in delivery manifests are not touched (they record deliveries).
In a sparse checkout, retain HEAD's checksum for omitted, unchanged skip-worktree files; these are preserved, not
verified against materialized bytes. Refuse preservation when the index or the recorded checksum differs from HEAD."""
from pathlib import Path
import hashlib
import subprocess

ROOT = Path(__file__).resolve().parents[1]
LIST = ROOT / 'art/checksums.sha256'
RENAMED = {'scripts/': 'tools/'}  # tolerate entries from before the 0.0.1 tidy


def preserved_sparse_records(records):
    """Keep only provably unchanged HEAD records for files omitted by sparse checkout."""
    try:
        index = subprocess.run(['git', 'ls-files', '-t', '--stage', '-z'], cwd=ROOT,
                               capture_output=True, text=True)
    except OSError as error:
        if (ROOT / '.git').exists():
            raise SystemExit(f'Cannot inspect Git index; refusing to drop omitted checksums: {error}')
        return {}
    if index.returncode:
        if (ROOT / '.git').exists():
            raise SystemExit('Cannot inspect Git index; refusing to drop omitted checksums.')
        return {}  # A full, non-Git delivery folder retains the original behavior.
    skipped = {}
    for row in index.stdout.split('\0'):
        if not row.startswith('S '):
            continue
        metadata, path = row.split('\t', 1)
        _tag, _mode, object_id, stage = metadata.split()
        if stage == '0' and path in records and not (ROOT / path).is_file():
            skipped[path] = object_id
    if not skipped:
        return {}
    head_tree = subprocess.run(['git', 'ls-tree', '-r', '--full-tree', '-z', 'HEAD'], cwd=ROOT,
                               capture_output=True, text=True)
    head_list = subprocess.run(['git', 'show', 'HEAD:art/checksums.sha256'], cwd=ROOT,
                               capture_output=True, text=True)
    if head_tree.returncode or head_list.returncode:
        raise SystemExit('Cannot read HEAD checksum provenance; materialize omitted files before rehashing.')
    head_objects = {}
    for row in head_tree.stdout.split('\0'):
        if row:
            metadata, path = row.split('\t', 1)
            head_objects[path] = metadata.split()[2]
    head_records = dict(reversed(line.split('  ', 1))
                        for line in head_list.stdout.splitlines() if line.strip())
    preserved = {}
    for path, object_id in skipped.items():
        if head_objects.get(path) != object_id:
            raise SystemExit(f'Cannot preserve omitted checksum: {path} has an index version different from HEAD; '
                             'materialize that version before rehashing.')
        if head_records.get(path) != records[path]:
            raise SystemExit(f'Cannot preserve omitted checksum: {path} has no matching checksum in HEAD; '
                             'materialize it before rehashing.')
        preserved[path] = records[path]
    return preserved


def main():
    paths = set()
    records = {}
    for line in LIST.read_text().splitlines():
        if not line.strip():
            continue
        expected, path = line.split('  ', 1)
        records[path] = expected
        if not path.startswith('art/'):
            if not (ROOT / path).is_file():
                for old, new in RENAMED.items():
                    if path.startswith(old) and (ROOT / (new + path[len(old):])).is_file():
                        path = new + path[len(old):]
            if (ROOT / path).is_file():
                paths.add(path)
    for f in (ROOT / 'art').rglob('*'):
        if f.is_file() and f != LIST and f.name != '.DS_Store':
            paths.add(f.relative_to(ROOT).as_posix())
    preserved = preserved_sparse_records(records)
    hashes = {**preserved, **{p: hashlib.sha256((ROOT / p).read_bytes()).hexdigest() for p in paths}}
    lines = [f'{hashes[p]}  {p}' for p in sorted(hashes)]
    LIST.write_text('\n'.join(lines) + '\n', newline='\n')
    print(f'{len(lines)} checksums -> {LIST.relative_to(ROOT).as_posix()}')
    if preserved:
        print(f'Preserved {len(preserved)} unchanged HEAD checksums for omitted skip-worktree files '
              '(not verified against materialized bytes).')

if __name__ == '__main__':
    main()
