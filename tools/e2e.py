#!/usr/bin/env python3
"""Run the browser suites (apps/web/e2e/*.mjs) with as little waiting and reading as possible.

    npm run e2e -- smoke                 the five that catch most breakage (about 3 minutes)
    npm run e2e -- perks physical        named suites
    npm run e2e -- rules                 every suite that checks rules and screens (they play fights at the test pace)
    npm run e2e -- anim                  the suites that look at animation or time (they run at real speed)
    npm run e2e -- all                   rules + anim: every suite in the folder
    npm run e2e -- sweep                 fx-sweep's whole table, every weapon × technique (about 17 minutes; `all` plays
                                         only its real-speed, fog and glyph parts)
    npm run e2e -- --list                the groups, and nothing run
    options:  --no-build   use the build that is already in apps/web/dist
              --jobs N     suites at once (default 3; each is its own room, so they don't meet)
              --slow       real speed for everything (the test pace is the default for the `rules` suites)
              --no-retry   don't run a failed suite again alone
              --base URL   test another server (e.g. the live site); nothing is built or started

The groups are in apps/web/e2e/groups.json. EVERY suite in the folder must be in `rules` or in `anim`: this script stops
with an error when one is in neither (a suite nobody runs rots), and so does `npm run check` (apps/web/src/e2e-groups.test.ts).

It builds the game (screen data + vite), starts the room server on port 8787 if it isn't up, warms it, runs the suites,
prints ONE line per suite and only the FAIL lines of those that failed, and stops the server if it started it.

**The retry rule.** A suite that fails while others run beside it is run ONCE more, alone, after the rest. If it passes
alone its line says `FLAKY … passed alone` with what failed the first time, and the run ends `GREEN, BUT n PASSED ONLY
ALONE` (exit code 0): it is not a bug in the game, but it is a suite that cannot share a machine, and that is a fault in
the suite to fix (apps/web/e2e/README.md, "A suite that does not flake"). If it fails alone too, it is `FAIL`, the run
is red (exit code 1), and a red run means a real bug. A suite never gets a second retry.

Logs: .check/e2e/<suite>.log (and <suite>.first.log for the failed first run of a retried suite).
"""
import json, os, re, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E2E = os.path.join(ROOT, 'apps/web/e2e')
G = json.load(open(os.path.join(E2E, 'groups.json')))
# `anim` runs at real speed: those suites check animation or time. `rules` plays fights at the test pace (FAST=1).
ANIM, RULES = G['anim'], G['rules']
GROUPS = {'smoke': G['smoke'], 'anim': ANIM, 'rules': RULES, 'all': RULES + ANIM, 'sweep': ['fx-sweep']}
# fx-sweep inside a group plays these parts; asked for by name or as `sweep`, it plays everything (the table too).
SWEEP_SHORT = 'real,fog,glyphs'

def group_errors():
    """Every .mjs in the folder (but lib.mjs) is in exactly one of rules / anim; every name in a group is a file."""
    files = sorted(f[:-4] for f in os.listdir(E2E) if f.endswith('.mjs') and f != 'lib.mjs')
    errs = [f'{n}.mjs is in no group: add it to "rules" or "anim" in apps/web/e2e/groups.json, or delete it' for n in files if n not in RULES and n not in ANIM]
    errs += [f'{n} is in both "rules" and "anim"' for n in RULES if n in ANIM]
    errs += [f'"{g}" names {n}, and there is no apps/web/e2e/{n}.mjs' for g, ns in GROUPS.items() for n in ns if n not in files]
    errs += [f'"smoke" names {n}, which is in neither "rules" nor "anim"' for n in G['smoke'] if n not in RULES and n not in ANIM]
    return errs

args = sys.argv[1:]
def opt(name, default=None):
    if name in args:
        i = args.index(name); v = args[i + 1] if i + 1 < len(args) else default; del args[i:i + 2]; return v
    return default
jobs = int(opt('--jobs', '3')); base = opt('--base')
no_build = '--no-build' in args; slow = '--slow' in args; no_retry = '--no-retry' in args
errs = group_errors()
if errs: sys.exit('the groups are wrong:\n  ' + '\n  '.join(errs))
if '--list' in args:
    for g, ns in GROUPS.items(): print(f'{g} ({len(ns)}): ' + ' '.join(ns))
    sys.exit(0)
asked = [a for a in args if not a.startswith('--')] or ['smoke']
names = []
for a in asked: names += GROUPS.get(a, [a])
names = list(dict.fromkeys(names))
missing = [n for n in names if not os.path.exists(os.path.join(E2E, n + '.mjs'))]
if missing: sys.exit('no such suite: ' + ', '.join(missing))
# the whole table only when it was asked for by name or as `sweep`
sweep_full = 'sweep' in asked or 'fx-sweep' in asked

def up(url):
    try: urllib.request.urlopen(url, timeout=2); return True
    except Exception: return False

def warm(url):
    """Ask for the page and its scripts once, so the first suite doesn't pay for the server's cold start."""
    try:
        html = urllib.request.urlopen(url, timeout=60).read().decode('utf8', 'replace')
        for src in re.findall(r'(?:src|href)="(/[^"]+\.(?:js|css))"', html): urllib.request.urlopen(url.rstrip('/') + src, timeout=60).read()
    except Exception: pass

started = None
if not base:
    base = 'http://127.0.0.1:8787'
    if not no_build:
        t0 = time.time()
        for cmd in (['python3', 'design/canvas-build/build.py', '--web'], ['npm', 'run', 'build']):
            p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
            if p.returncode: print((p.stdout + p.stderr)[-1500:]); sys.exit('build failed: ' + ' '.join(cmd))
        print(f'built ({time.time() - t0:.0f}s)', flush=True)
        subprocess.run('pkill -f "wrangler dev"; pkill -f workerd', shell=True)  # a server from before would serve the old build's worker
        time.sleep(1)
    if not up(base):
        os.makedirs(os.path.join(ROOT, '.check/e2e'), exist_ok=True)
        started = subprocess.Popen(['npm', 'run', 'dev', '-w', '@phc/server'], cwd=ROOT, stdout=open(os.path.join(ROOT, '.check/e2e/server.log'), 'w'), stderr=subprocess.STDOUT, start_new_session=True)
        for _ in range(120):
            if up(base): break
            time.sleep(0.5)
        else: sys.exit('the room server did not come up (see .check/e2e/server.log)')
    warm(base)

ANSI = re.compile(r'\x1b\[[0-9;]*m')
def run(name, tag=''):
    env = dict(os.environ, BASE=base, SHOTS=os.path.join(ROOT, '.check/e2e/shots') + '/')
    if not slow and name not in ANIM: env['FAST'] = '1'
    if name == 'fx-sweep' and not sweep_full and 'PARTS' not in os.environ: env['PARTS'] = SWEEP_SHORT
    t0 = time.time(); log = os.path.join(ROOT, '.check/e2e', name + tag + '.log')
    try: p = subprocess.run(['node', 'apps/web/e2e/' + name + '.mjs'], cwd=ROOT, capture_output=True, text=True, env=env, timeout=1800); out, code = p.stdout + p.stderr, p.returncode
    except subprocess.TimeoutExpired as e: out, code = (e.stdout.decode(errors='replace') if isinstance(e.stdout, bytes) else (e.stdout or '')) + '\nTIMED OUT after 30 minutes', 124
    out = ANSI.sub('', out); open(log, 'w').write(out)
    oks = len(re.findall(r'^ok ', out, re.M)); bad = [l for l in out.split('\n') if l.startswith('FAIL')]
    crashed = code != 0 and not bad
    # a suite that looked at nothing proves nothing: a green line must mean something was checked
    empty = code == 0 and not bad and oks == 0
    return {'name': name, 'oks': oks, 'bad': bad, 'crashed': crashed, 'empty': empty, 'out': out, 'secs': time.time() - t0, 'good': not bad and not crashed and not empty}

def why(r):
    """The lines that say what went wrong, short."""
    lines = [l[:260] for l in r['bad'][:8]]
    if r['crashed']: lines += [l.strip()[:260] for l in r['out'].split('\n') if re.search(r'Error|Timeout|waiting for|TIMED OUT', l)][:4]
    if r['empty']: lines.append('it printed no "ok" line: nothing was checked')
    return lines
def line(word, r, extra=''):
    print(f"{word:<6}{r['name']:<18} {r['oks']} checks" + (f", {len(r['bad'])} failed" if r['bad'] else '') + (' · the script stopped on an error' if r['crashed'] else '') + extra + f"  ({r['secs']:.0f}s)", flush=True)

os.makedirs(os.path.join(ROOT, '.check/e2e/shots'), exist_ok=True)
failed, flaky, again = [], [], []
t_all = time.time()
try:
    parallel = max(1, jobs) > 1 and len(names) > 1
    with ThreadPoolExecutor(max_workers=max(1, jobs)) as ex:
        for r in ex.map(run, names):
            if r['good']: line('ok', r); continue
            if parallel and not no_retry: again.append(r); line('retry', r, ' · failed beside the others, it runs again alone at the end'); continue
            failed.append(r['name']); line('FAIL', r)
            for l in why(r): print('     ' + l)
            print(f"     full log: .check/e2e/{r['name']}.log")
    for first in again:
        n = first['name']
        try: os.replace(os.path.join(ROOT, '.check/e2e', n + '.log'), os.path.join(ROOT, '.check/e2e', n + '.first.log'))
        except OSError: pass
        r = run(n)
        if r['good']:
            flaky.append(n); line('FLAKY', r, ' · passed alone; beside the others it failed:')
            for l in why(first): print('     ' + l)
            print(f'     the failed run: .check/e2e/{n}.first.log')
        else:
            failed.append(n); line('FAIL', r, ' · alone too')
            for l in why(r): print('     ' + l)
            print(f'     full log: .check/e2e/{n}.log (the first run: {n}.first.log)')
finally:
    if started:
        try: os.killpg(os.getpgid(started.pid), 15)
        except Exception: pass
        subprocess.run('pkill -f "wrangler dev"; pkill -f workerd', shell=True)
mins = f'  ({(time.time() - t_all) / 60:.1f} min)'
if failed: print(f'{len(failed)} of {len(names)} FAILED: ' + ' '.join(failed) + (f' · and {len(flaky)} passed only alone: ' + ' '.join(flaky) if flaky else '') + mins)
elif flaky: print(f'GREEN, BUT {len(flaky)} PASSED ONLY ALONE (a suite that cannot share the machine; fix the suite): ' + ' '.join(flaky) + mins)
else: print(f'ALL GREEN: {len(names)} suites' + mins)
sys.exit(1 if failed else 0)
