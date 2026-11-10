"""Skeleton 2.0: compare two runs of the check tool (packages/engine/test/skeleton-diff.test.ts).

    python3 tools/skeleton_diff.py before.json after.json [--all]

Prints, for every number that moved, how many of the 184 rows (46 archetypes at levels 1, 6, 12, 20) changed and by how
much (smallest and largest change), then the archetypes that gained or lost the most HP, saves and strengths. With
--all it also lists every changed row. A number that exists on one side only is reported as new or gone.
"""
import json, sys
from collections import defaultdict

def main():
    args = [a for a in sys.argv[1:] if not a.startswith('--')]
    if len(args) != 2:
        print(__doc__); return 2
    before = {(r['id'], r['level']): r for r in json.load(open(args[0]))}
    after = {(r['id'], r['level']): r for r in json.load(open(args[1]))}
    keys = sorted(set(before) & set(after))
    moved = defaultdict(list); new, gone = set(), set()
    for k in keys:
        b, a = before[k], after[k]
        for f in sorted(set(b) | set(a)):
            if f in ('id', 'level'): continue
            bv, av = b.get(f), a.get(f)
            if bv is None and av is not None: new.add(f)
            elif av is None and bv is not None: gone.add(f)
            elif isinstance(bv, (int, float)) and isinstance(av, (int, float)) and abs(av - bv) > 1e-9: moved[f].append((k, bv, av))
    print(f'{len(keys)} rows compared ({len(set(k[0] for k in keys))} archetypes).')
    if new: print('new numbers:', ', '.join(sorted(new)))
    if gone: print('gone:', ', '.join(sorted(gone)))
    print(f'\n{"number":28} {"rows":>5} {"least":>9} {"most":>9}')
    for f in sorted(moved, key=lambda x: -len(moved[x])):
        ds = [a - b for _, b, a in moved[f]]
        print(f'{f:28} {len(ds):5d} {min(ds):+9.2f} {max(ds):+9.2f}')
    for f in ('maxHp', 'save_body', 'save_brain', 'save_heart'):
        rows = [(a - b, k) for k, b, a in moved.get(f, []) if k[1] == 12]
        if not rows: continue
        rows.sort()
        print(f'\n{f} at level 12: biggest losses', ', '.join(f'{k[0]} {d:+.0f}' for d, k in rows[:5]), '| biggest gains', ', '.join(f'{k[0]} {d:+.0f}' for d, k in rows[-5:][::-1]))
    if '--all' in sys.argv:
        for k in keys:
            ch = [(f, b, a) for f in moved for kk, b, a in moved[f] if kk == k]
            if ch: print(f'\n{k[0]} L{k[1]}: ' + '; '.join(f'{f} {b:g} -> {a:g}' for f, b, a in sorted(ch)))
    return 0

if __name__ == '__main__':
    sys.exit(main())
