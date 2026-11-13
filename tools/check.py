#!/usr/bin/env python3
"""One command for "did I break anything?" without a browser: the data validator (with the text-number guard), the
spec-table and screen-data checks, both type checks and both unit suites, run together, with ONE short line each and only the failures printed. Meant to be cheap to read.

    npm run check            everything (about 1 to 2 minutes); "engine hooks" is docs/ENGINE-HOOKS.md's freshness
    npm run check -- engine  only what touches the engine (validator, engine tsc, engine tests)
    npm run check -- web     only the client (web tsc, the screen data's freshness, web tests)
    npm run check -- -t "Heart Overload"     both suites, only tests whose name matches
    npm run check -- balance the balance simulator's folder with its smoke fights too (packages/engine/test/balance;
                             a minute or two). The same as `npm run balance`.

The engine's unit suite runs packages/engine/test/balance: every balance target (guns, magic, heals, Faith, defence,
the enemy table, the price list) fails a plain `npm run check` when a number moves. What it leaves out are the three
"quick run" smoke fights (whole simulated fights that assert only "it builds"); `npm run balance` adds them: run that
after a change to a simulator policy or the enemy AI, and before a merge of engine work.

Exit code 0 when all pass. Full logs are kept in .check/ (ignored by git) when something fails.
"""
import os, re, subprocess, sys, time
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
args = sys.argv[1:]
only = next((a for a in args if a in ('engine', 'web', 'data', 'balance')), None)
pat = args[args.index('-t') + 1] if '-t' in args and args.index('-t') + 1 < len(args) else None
vt = (['--', '-t', pat] if pat else [])
JOBS = [
    ('data', 'validator', ['python3', 'tools/validate.py', 'data']),
    ('data', 'spec tables', ['python3', 'tools/check_spec_tables.py']),  # the spec's weapon, enemy and condition tables against data
    # The creation and sheet screens' card texts (apps/web/src/game/protodata.json) are generated from data/*.json: this
    # fails when the committed file is stale against the data (engine review 4, finding 6). Nothing is written.
    ('data', 'screen data', ['python3', 'design/canvas-build/build.py', '--web', '--check']),
    # docs/ENGINE-HOOKS.md (the catalogue of the engine's extension points) is generated from the source and data by
    # tools/engine_catalog.py: this fails when it is stale, or when a catalogued name has no doc comment. Nothing is written.
    ('data', 'engine hooks', ['python3', 'tools/engine_catalog.py', '--check']),
    ('engine', 'engine types', ['npx', 'tsc', '--noEmit', '-p', 'packages/engine']),
    ('web', 'web types', ['npx', 'tsc', '--noEmit', '-p', 'apps/web']),
    ('engine', 'engine tests', ['npm', 'test', '-w', '@phc/engine'] + vt),
    ('web', 'web tests', ['npm', 'test', '-w', '@phc/web'] + vt),
    ('balance', 'balance tests', ['npm', 'run', 'balance', '-w', '@phc/engine'] + vt),
]
# `check -- web` also runs the two guards over web files that live elsewhere: the screen-data freshness check (protodata.json
# is a web file built from data) and the test lint (an engine test that walks the web's and the browser suites' tests).
WEB_GUARDS = [('web', 'lint tests', ['npm', 'test', '-w', '@phc/engine', '--', 'test/test-lint.test.ts', 'test/datatext.test.ts'])]
if only: JOBS = [j for j in JOBS if j[0] == only or (only == 'engine' and j[0] == 'data') or (only == 'web' and j[1] == 'screen data')] + (WEB_GUARDS if only == 'web' and not pat else [])
else: JOBS = [j for j in JOBS if j[0] != 'balance']
if pat: JOBS = [j for j in JOBS if 'tests' in j[1]]
DATA_JOBS = ('validator', 'spec tables', 'screen data', 'engine hooks')  # each prints one line 'N errors'
ANSI = re.compile(r'\x1b\[[0-9;]*m')

def run(job):
    kind, name, cmd = job; t0 = time.time()
    p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
    out = ANSI.sub('', p.stdout + p.stderr); ok = p.returncode == 0; note = ''
    if name in DATA_JOBS:
        m = re.search(r'(\d+) errors?', out); ok = ok and bool(m) and m.group(1) == '0'; note = (m.group(0) if m else 'no result line')
    elif 'tests' in name or 'smoke' in name:
        m = re.search(r'Tests\s+(.*)', out); note = m.group(1).strip() if m else 'no result line'
    else:
        n = len(re.findall(r'error TS\d+', out)); note = 'clean' if ok else f'{n} errors'
    return name, ok, note, out, time.time() - t0

fails = 0
# The quick checks run together; the two test suites run one after the other (a few engine tests are timed, and fail
# when the machine is busy with the other suite).
slow = [j for j in JOBS if 'tests' in j[1] or 'smoke' in j[1]]; quick = [j for j in JOBS if j not in slow]
with ThreadPoolExecutor(max_workers=3) as ex: results = list(ex.map(run, quick))
results += [run(j) for j in slow]
if True:
    for name, ok, note, out, secs in results:
        print(f"{'ok  ' if ok else 'FAIL'} {name:<13} {note}  ({secs:.0f}s)")
        if ok: continue
        fails += 1; os.makedirs(os.path.join(ROOT, '.check'), exist_ok=True)
        log = os.path.join(ROOT, '.check', name.replace(' ', '-') + '.log'); open(log, 'w').write(out)
        lines = out.split('\n')
        if 'tests' in name or 'smoke' in name:
            keep = [l for l in lines if re.search(r'^\s*(FAIL|×|✗)\s|AssertionError|Error:|❯ .*\.test\.', l)][:30]
        elif name in DATA_JOBS:
            keep = [l for l in lines if re.search(r'error', l, re.I)][:30]
        else:
            keep = [l for l in lines if 'error TS' in l][:30]
        for l in keep: print('     ' + l.strip()[:220])
        print(f'     full log: {os.path.relpath(log, ROOT)}')
print('ALL GREEN' if not fails else f'{fails} FAILED')
sys.exit(1 if fails else 0)
