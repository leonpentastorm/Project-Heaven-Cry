#!/usr/bin/env python3
"""One command for "did I break anything?" without a browser: the data validator, both type checks and both unit
suites, run together, with ONE short line each and only the failures printed. Meant to be cheap to read.

    npm run check            everything (about 1 to 2 minutes)
    npm run check -- engine  only what touches the engine (validator, engine tsc, engine tests)
    npm run check -- web     only the client (web tsc, web tests)
    npm run check -- -t "Heart Overload"     both suites, only tests whose name matches

Exit code 0 when all pass. Full logs are kept in .check/ (ignored by git) when something fails.
"""
import os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
only = next((a for a in args if a in ('engine', 'web', 'data')), None)
pat = args[args.index('-t') + 1] if '-t' in args and args.index('-t') + 1 < len(args) else None
vt = (['--', '-t', pat] if pat else [])
JOBS = [
    ('data', 'validator', ['python3', 'tools/validate.py', 'data']),
    ('engine', 'engine types', ['npx', 'tsc', '--noEmit', '-p', 'packages/engine']),
    ('web', 'web types', ['npx', 'tsc', '--noEmit', '-p', 'apps/web']),
    ('engine', 'engine tests', ['npm', 'test', '-w', '@phc/engine'] + vt),
    ('web', 'web tests', ['npm', 'test', '-w', '@phc/web'] + vt),
]
if only: JOBS = [j for j in JOBS if j[0] == only or (only == 'engine' and j[0] == 'data')]
if pat: JOBS = [j for j in JOBS if 'tests' in j[1]]
ANSI = re.compile(r'\x1b\[[0-9;]*m')

def run(job):
    kind, name, cmd = job; t0 = time.time()
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    out = ANSI.sub('', p.stdout + p.stderr); ok = p.returncode == 0; note = ''
    if name == 'validator':
        m = re.search(r'(\d+) errors?', out); ok = ok and bool(m) and m.group(1) == '0'; note = (m.group(0) if m else 'no result line')
    elif 'tests' in name:
        m = re.search(r'Tests\s+(.*)', out); note = m.group(1).strip() if m else 'no result line'
    else:
        n = len(re.findall(r'error TS\d+', out)); note = 'clean' if ok else f'{n} errors'
    return name, ok, note, out, time.time() - t0

fails = 0
# The quick checks run together; the two test suites run one after the other (a few engine tests are timed, and fail
# when the machine is busy with the other suite).
quick = [j for j in JOBS if 'tests' not in j[1]]; slow = [j for j in JOBS if 'tests' in j[1]]
with ThreadPoolExecutor(max_workers=3) as ex: results = list(ex.map(run, quick))
results += [run(j) for j in slow]
if True:
    for name, ok, note, out, secs in results:
        print(f"{'ok  ' if ok else 'FAIL'} {name:<13} {note}  ({secs:.0f}s)")
        if ok: continue
        fails += 1; os.makedirs(os.path.join(ROOT, '.check'), exist_ok=True)
        log = os.path.join(ROOT, '.check', name.replace(' ', '-') + '.log'); open(log, 'w').write(out)
        lines = out.split('\n')
        if 'tests' in name:
            keep = [l for l in lines if re.search(r'^\s*(FAIL|×|✗)\s|AssertionError|Error:|❯ .*\.test\.', l)][:30]
        elif name == 'validator':
            keep = [l for l in lines if re.search(r'error', l, re.I)][:30]
        else:
            keep = [l for l in lines if 'error TS' in l][:30]
        for l in keep: print('     ' + l.strip()[:220])
        print(f'     full log: {os.path.relpath(log, ROOT)}')
print('ALL GREEN' if not fails else f'{fails} FAILED')
sys.exit(1 if fails else 0)
