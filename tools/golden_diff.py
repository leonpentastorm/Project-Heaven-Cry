#!/usr/bin/env python3
"""What moved in the golden damage tables (packages/engine/test/golden/*.json) against a git revision.

    python3 tools/golden_diff.py [--rev HEAD] [--table builds-normal] [--grep plain_gun] [--limit 40]

Prints, per table, how many lines changed, and the changed lines whose key matches --grep (was / now). Used to check,
before re-recording the tables on purpose, that the lines that moved are the ones meant to move (docs/TESTING.md).
"""
import argparse, json, subprocess, re, os, glob

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLD = os.path.join(ROOT, 'packages/engine/test/golden')

def load_rev(rev, name):
    try:
        s = subprocess.run(['git', 'show', rev + ':packages/engine/test/golden/' + name + '.json'], cwd=ROOT, capture_output=True, text=True, check=True).stdout
        return json.loads(s)
    except subprocess.CalledProcessError:
        return {}

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rev', default='HEAD'); ap.add_argument('--table', default=None); ap.add_argument('--grep', default=None); ap.add_argument('--limit', type=int, default=40)
    a = ap.parse_args()
    names = [a.table] if a.table else sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(GOLD, '*.json')) if not p.endswith(('.log.json', '.marks.json')))
    rx = re.compile(a.grep) if a.grep else None
    for n in names:
        old, new = load_rev(a.rev, n), json.load(open(os.path.join(GOLD, n + '.json')))
        ch = [k for k in new if k in old and old[k] != new[k] and not k.startswith('#')]
        if not ch and len(old) == len(new): continue
        print('%s: %d changed of %d (%d new, %d gone)' % (n, len(ch), len(old), len([k for k in new if k not in old]), len([k for k in old if k not in new])))
        if rx:
            shown = 0
            for k in ch:
                if rx.search(k) and shown < a.limit:
                    print('  ' + k + '\n    was: ' + str(old[k])[:400] + '\n    now: ' + str(new[k])[:400]); shown += 1

if __name__ == '__main__':
    main()
