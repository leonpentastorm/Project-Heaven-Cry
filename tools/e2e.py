#!/usr/bin/env python3
"""Run the browser suites (apps/web/e2e/*.mjs) with as little waiting and reading as possible.

    npm run e2e -- smoke                 the five that catch most breakage (about 3 minutes)
    npm run e2e -- perks physical        named suites
    npm run e2e -- all                   every suite in the lists below
    npm run e2e -- anim                  the suites that look at animation (they run at real speed)
    options:  --no-build   use the build that is already in apps/web/dist
              --jobs N     suites at once (default 3; each is its own room, so they don't meet)
              --slow       real speed for everything (FAST is the default for non-animation suites)
              --base URL   test another server (e.g. the live site); nothing is built or started

It builds the game (screen data + vite), starts the room server on port 8787 if it isn't up, runs the suites, prints ONE
line per suite and only the FAIL lines of those that failed, and stops the server if it started it. Logs: .check/e2e/.
Exit code 0 when every suite passed.
"""
import os, re, subprocess, sys, time, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
# real speed: these check animation or timing (faith-pg times the Miracle; two-players watches the turn banners go by)
ANIM = ['turn-order', 'melee-fx', 'reload', 'cutins', 'clarity', 'brass', 'combat-speed', 'faith-pg', 'two-players']
RULES = ['rules114', 'coop-stall', 'old-save', 'skeleton-screens', 'creation-points', 'creation-layout', 'physical',
         'physical-pack', 'perks', 'pg-levelup', 'combat-fixes', 'world-play', 'classes', 'classes-moves', 'sandbox',
         'right-panels', 'tabs', 'gear-icons', 'ground']
GROUPS = {'smoke': ['old-save', 'two-players', 'rules114', 'perks', 'turn-order'], 'anim': ANIM, 'rules': RULES, 'all': RULES + ANIM}

args = sys.argv[1:]
def opt(name, default=None):
    if name in args:
        i = args.index(name); v = args[i + 1] if i + 1 < len(args) else default; del args[i:i + 2]; return v
    return default
jobs = int(opt('--jobs', '3')); base = opt('--base')
no_build = '--no-build' in args; slow = '--slow' in args
names = []
for a in [a for a in args if not a.startswith('--')]: names += GROUPS.get(a, [a])
if not names: names = GROUPS['smoke']
names = list(dict.fromkeys(names))
missing = [n for n in names if not os.path.exists(os.path.join(ROOT, 'apps/web/e2e', n + '.mjs'))]
if missing: sys.exit('no such suite: ' + ', '.join(missing))

def up(url):
    try: urllib.request.urlopen(url, timeout=2); return True
    except Exception: return False

started = None
if not base:
    base = 'http://127.0.0.1:8787'
    if not no_build:
        t0 = time.time()
        for cmd in (['python3', 'design/canvas-build/build.py', '--web'], ['npm', 'run', 'build']):
            p = subprocess.run(cmd, cwd=ROOT, capture_output=True, text=True)
            if p.returncode: print((p.stdout + p.stderr)[-1500:]); sys.exit('build failed: ' + ' '.join(cmd))
        print(f'built ({time.time() - t0:.0f}s)')
        subprocess.run('pkill -f "wrangler dev"; pkill -f workerd', shell=True)  # a server from before would serve the old build's worker
        time.sleep(1)
    if not up(base):
        os.makedirs(os.path.join(ROOT, '.check/e2e'), exist_ok=True)
        started = subprocess.Popen(['npm', 'run', 'dev', '-w', '@phc/server'], cwd=ROOT, stdout=open(os.path.join(ROOT, '.check/e2e/server.log'), 'w'), stderr=subprocess.STDOUT, start_new_session=True)
        for _ in range(60):
            if up(base): break
            time.sleep(0.5)
        else: sys.exit('the room server did not come up (see .check/e2e/server.log)')

def run(name):
    env = dict(os.environ, BASE=base, SHOTS=os.path.join(ROOT, '.check/e2e/shots') + '/')
    if not slow and name not in ANIM: env['FAST'] = '1'
    t0 = time.time(); log = os.path.join(ROOT, '.check/e2e', name + '.log')
    try: p = subprocess.run(['node', 'apps/web/e2e/' + name + '.mjs'], cwd=ROOT, capture_output=True, text=True, env=env, timeout=1200); out, code = p.stdout + p.stderr, p.returncode
    except subprocess.TimeoutExpired as e: out, code = (e.stdout or '') + '\nTIMED OUT after 20 minutes', 124
    open(log, 'w').write(out if isinstance(out, str) else out.decode())
    out = out if isinstance(out, str) else out.decode()
    oks = len(re.findall(r'^ok ', out, re.M)); bad = [l for l in out.split('\n') if l.startswith('FAIL')]
    crashed = code != 0 and not bad
    return name, oks, bad, crashed, out, time.time() - t0

os.makedirs(os.path.join(ROOT, '.check/e2e/shots'), exist_ok=True)
failed = 0
try:
    with ThreadPoolExecutor(max_workers=max(1, jobs)) as ex:
        for name, oks, bad, crashed, out, secs in ex.map(run, names):
            good = not bad and not crashed
            print(f"{'ok  ' if good else 'FAIL'} {name:<18} {oks} checks" + (f', {len(bad)} failed' if bad else '') + (' · the script stopped on an error' if crashed else '') + f'  ({secs:.0f}s)')
            if good: continue
            failed += 1
            for l in bad[:8]: print('     ' + l[:260])
            if crashed:
                err = [l for l in out.split('\n') if re.search(r'Error|Timeout|waiting for', l)][:4]
                for l in err: print('     ' + re.sub(r'\x1b\[[0-9;]*m', '', l).strip()[:260])
            print(f'     full log: .check/e2e/{name}.log')
finally:
    if started:
        try: os.killpg(os.getpgid(started.pid), 15)
        except Exception: pass
        subprocess.run('pkill -f "wrangler dev"; pkill -f workerd', shell=True)
print('ALL GREEN' if not failed else f'{failed} of {len(names)} FAILED')
sys.exit(1 if failed else 0)
