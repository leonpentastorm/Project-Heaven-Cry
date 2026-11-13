#!/usr/bin/env python3
"""The level scale's factor check (rules 1.36; docs/design/level-scale-spec.md section 7): every golden line that moved
between two revisions moved by exactly scale(level), or it is reported.

    python3 tools/golden_scale_check.py [--rev HEAD] [--table builds-normal] [--show 20] [--summary-only]

For every key of every golden table (packages/engine/test/golden/*.json, not the .log or .marks files) whose line
differs between --rev and the working tree:
  * its level is read from the key (/L(\\d+)/, `L20-faith…`); a key with none (a `special`, `rules-*` or `costs-*`
    line at some fight level) has its level INFERRED: the level whose scale explains the most numbers;
  * a level 1 line must be byte-identical (any change at level 1 is a failure);
  * above it, both lines are cut into the same words and numbers; the words must be equal, and each number either
    stays (a base, a critical, Defense, AP, to-hit, an id) or moves by scale(level): an integer passes when
    |new / scale - old| <= 2 + 0.003 x old (both sides floor or round once; four-place storage), a decimal (a
    multiplier) within 0.3%.
Failures are grouped: MOVED BY SCALE^2 (a double Level term), DID NOT MOVE (an HP number still in the old units: an HP
state `hp..>..`, a landed `i:..:N`, a preview `pv N`, armour `aN`), MOVED OTHERWISE (a state change: a kill crossed by
rounding, or a heal or shield moved by other work: read those by hand), SHAPE (the words differ).
Scale comes from data/rules.json output.level.scale of the working tree.
"""
import argparse, json, subprocess, re, os, glob, collections

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
GOLD = os.path.join(ROOT, 'packages/engine/test/golden')
SCALE = json.load(open(os.path.join(ROOT, 'data/rules.json')))['output']['level']['scale']
NUM = re.compile(r'-?\d+(?:\.\d+)?')
HP_TAG = re.compile(r'(hp|>|i:[^:\s]*:[^:\s]*:|pv |\ba)$')

def load_rev(rev, name):
    try:
        return json.loads(subprocess.run(['git', 'show', rev + ':packages/engine/test/golden/' + name + '.json'], cwd=ROOT, capture_output=True, text=True, check=True).stdout)
    except subprocess.CalledProcessError:
        return {}

def key_level(k):
    m = re.search(r'(?:^|[/@\-_ ])L(\d+)(?=$|[/@\-_ ])', k)
    return int(m.group(1)) if m else None

def split(line):
    s = line if isinstance(line, str) else json.dumps(line, sort_keys=True)
    return NUM.split(s), [(m.group(0), s[:m.start()]) for m in NUM.finditer(s)]

def judge(o, n, scs):
    """'same', 'scaled', 'scale2', 'other' for one number pair at these scales (the dealer's level, the target's)."""
    fo, fn = float(o), float(n)
    if fo == fn: return 'same'
    dec = '.' in o or '.' in n
    def near(f):
        if dec: return abs(fn - fo * f) <= 0.003 * abs(fo * f) + 0.0011 * max(1, f)
        return abs(fn / f - fo) <= 2 + 0.003 * abs(fo)
    if any(near(sc) for sc in scs): return 'scaled'
    if any(sc > 1.0001 and near(sc * sc) for sc in scs): return 'scale2'
    return 'other'

def check_line(old, new, levels):
    wo, no = split(old); wn, nn = split(new)
    if wo != wn or len(no) != len(nn): return {'shape': 1}, []
    scs = [SCALE[l - 1] for l in levels]; sc = max(scs)
    counts = collections.Counter(); bad = []
    for (o, ctx), (n, _) in zip(no, nn):
        j = judge(o, n, scs)
        hp = bool(HP_TAG.search(ctx[-12:])) and abs(float(o)) >= 8
        if j == "same" and hp and min(scs) >= 1.1 and abs(float(o)) * min(scs) - abs(float(o)) > 2.5: j = "notmoved"
        counts[j] += 1
        if j in ('scale2', 'other', 'notmoved'): bad.append((j, o, n, ctx[-24:]))
    return counts, bad

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--rev', default='HEAD'); ap.add_argument('--table', default=None); ap.add_argument('--show', type=int, default=12)
    ap.add_argument('--summary-only', action='store_true')
    a = ap.parse_args()
    names = [a.table] if a.table else sorted(os.path.basename(p)[:-5] for p in glob.glob(os.path.join(GOLD, '*.json')) if not p.endswith(('.log.json', '.marks.json')))
    total = collections.Counter(); groups = collections.defaultdict(list)
    for name in names:
        old, new = load_rev(a.rev, name), json.load(open(os.path.join(GOLD, name + '.json')))
        if not isinstance(new, dict): continue
        for k in new:
            if k.startswith('#') or k not in old: continue
            total['lines'] += 1
            if old[k] == new[k]: total['identical'] += 1; continue
            lv = key_level(k)
            keyL1 = lv == 1
            if keyL1: lv = None  # a key's L1 may be the enemy's level with the dealer at another: inferred, and reported apart
            # A line may hold two levels (a character of its level in a fight of another): the dealer's and the target's.
            cands = [(lv,)] + [(lv, m) for m in range(1, 21) if m != lv] if lv else [(x,) for x in range(2, 21)] + [(x, y) for x in range(1, 21) for y in range(x + 1, 21)]
            if not lv: total['inferred'] += 1
            best = None
            for ls in cands:
                c, b = check_line(old[k], new[k], ls)
                if 'shape' in c: best = (ls, c, b, None); break
                score = (len(b), len(ls), -c['scaled'])
                if best is None or score < best[3]: best = (ls, c, b, score)
            lv, c, b = max(best[0]), best[1], best[2]
            if keyL1:
                if 'shape' in c or b: groups['LEVEL 1 CHANGED'].append((name, k, 1, [('l1', str(old[k])[:160], str(new[k])[:160], '')]))
                else: groups['KEY L1, THE DEALER AT ANOTHER LEVEL (moved by its scale)'].append((name, k, lv, [('ok', str(old[k])[:120], str(new[k])[:120], '')]))
                continue
            if 'shape' in c: groups['SHAPE'].append((name, k, lv, [('shape', str(old[k])[:160], str(new[k])[:160], '')])); continue
            if not b: total['scaled'] += 1; continue
            kind = 'MOVED BY SCALE^2' if any(x[0] == 'scale2' for x in b) else 'DID NOT MOVE' if all(x[0] == 'notmoved' for x in b) else 'MOVED OTHERWISE'
            groups[kind].append((name, k, lv, b))
    print('golden scale check against %s: %d lines, %d identical, %d moved by scale exactly (%d with the level inferred)' % (a.rev, total['lines'], total['identical'], total['scaled'], total['inferred']))
    for g in ('LEVEL 1 CHANGED', 'KEY L1, THE DEALER AT ANOTHER LEVEL (moved by its scale)', 'SHAPE', 'MOVED BY SCALE^2', 'DID NOT MOVE', 'MOVED OTHERWISE'):
        L = groups.get(g, [])
        by = collections.Counter(x[0] for x in L)
        print('%s: %d%s' % (g, len(L), (' (' + ', '.join('%s %d' % kv for kv in sorted(by.items())) + ')') if L else ''))
        if a.summary_only: continue
        for name, k, lv, b in L[:a.show]:
            print('  [%s] L%d %s' % (name, lv, k[:110]))
            for x in b[:4]: print('      %s: %s -> %s   ...%s' % x)

if __name__ == '__main__':
    main()
