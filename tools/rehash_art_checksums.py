#!/usr/bin/env python3
"""Regenerate art/checksums.sha256: every file under art/ (except this list itself) plus the non-art files it already
tracks (the art tooling and docs), with fresh hashes, sorted by path. Run after adding, moving or editing art files;
then run python3 tools/validate_art.py. Embedded hashes in delivery manifests are not touched (they record deliveries)."""
from pathlib import Path
import hashlib

ROOT = Path(__file__).resolve().parents[1]
LIST = ROOT / 'art/checksums.sha256'
RENAMED = {'scripts/': 'tools/'}  # tolerate entries from before the 0.0.1 tidy

def main():
    paths = set()
    for line in LIST.read_text().splitlines():
        if not line.strip():
            continue
        path = line.split('  ', 1)[1]
        if not path.startswith('art/'):
            if not (ROOT / path).is_file():
                for old, new in RENAMED.items():
                    if path.startswith(old) and (ROOT / (new + path[len(old):])).is_file():
                        path = new + path[len(old):]
            if (ROOT / path).is_file():
                paths.add(path)
    for f in (ROOT / 'art').rglob('*'):
        if f.is_file() and f != LIST and f.name != '.DS_Store':
            paths.add(str(f.relative_to(ROOT)))
    lines = [f'{hashlib.sha256((ROOT / p).read_bytes()).hexdigest()}  {p}' for p in sorted(paths)]
    LIST.write_text('\n'.join(lines) + '\n')
    print(f'{len(lines)} checksums -> {LIST.relative_to(ROOT)}')

if __name__ == '__main__':
    main()
