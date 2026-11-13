#!/usr/bin/env python3
"""Classes 3.0 step 2 (throwaway): list every whole-word hit of an old base-class name, by file and line, for review.

Reads the id -> new name map from data/classes.json and the old names from OLD below (Revision 3); changes nothing.
Usage: python3 tools/once/rename_classes.py [paths...]   (default: data apps/web/src apps/web/e2e packages/engine docs CLAUDE.md)
Skips the history the rename doc keeps (hand-offs, _archive, balance-sim records)."""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
OLD = {'defender': 'Defender', 'fighter': 'Fighter', 'marksman': 'Marksman', 'infiltrator': 'Infiltrator', 'mage': 'Mage',
       'trickster': 'Trickster', 'bard': 'Bard', 'guardian': 'Guardian'}
NEW = {c['id']: c['name'] for c in json.load(open(os.path.join(ROOT, 'data/classes.json')))['base']}
SKIP = ('/handoffs/', '/_archive/', 'balance-sim', 'node_modules', '/dist/', '.git/')
PAT = re.compile(r'\b(' + '|'.join(OLD.values()) + r')s?\b')


def walk(paths):
    for p in paths:
        p = os.path.join(ROOT, p)
        if os.path.isfile(p):
            yield p
            continue
        for d, _, fs in os.walk(p):
            for f in fs:
                if f.endswith(('.json', '.ts', '.tsx', '.mjs', '.md', '.py', '.html')):
                    yield os.path.join(d, f)


def main():
    paths = sys.argv[1:] or ['data', 'apps/web/src', 'apps/web/e2e', 'packages/engine', 'docs', 'CLAUDE.md']
    n = 0
    for f in walk(paths):
        rel = os.path.relpath(f, ROOT)
        if any(s in '/' + rel for s in SKIP):
            continue
        for i, line in enumerate(open(f, encoding='utf-8', errors='replace'), 1):
            for m in PAT.finditer(line):
                cid = next(k for k, v in OLD.items() if m.group(1) == v)
                print(f'{rel}:{i}: {m.group(0)} -> {NEW.get(cid)}: {line.strip()[:160]}')
                n += 1
    print(f'{n} hits', file=sys.stderr)


if __name__ == '__main__':
    main()
