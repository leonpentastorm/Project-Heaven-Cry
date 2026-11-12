#!/usr/bin/env python3
"""Run the browser suites (apps/web/e2e/*.mjs) with as little waiting and reading as possible.

    npm run e2e -- smoke                 the five that catch most breakage (about 3 minutes)
    npm run e2e -- perks physical        named suites
    npm run e2e -- rules                 every suite that checks rules and screens (they play fights at the test pace)
    npm run e2e -- anim                  the suites that look at animation or time (they run at real speed)
    npm run e2e -- all                   rules + anim: every suite in the folder
    npm run e2e -- sweep                 fx-sweep's whole table, every weapon × technique (about 17 minutes; everywhere
                                         else fx-sweep plays only its real-speed, fog and glyph parts)
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

**The room server.** `wrangler dev` has stopped by itself in the middle of a long run on a busy machine. The runner
checks it before every suite and starts it again; a suite that lost it is run again and that run is the one that
counts (`ok … run again: the room server had stopped under its first run`). The last line of the run says so.

Logs: .check/e2e/<suite>.log (and <suite>.first.log for the failed first run of a retried suite). Pictures:
.check/e2e/shots/<suite>/, kept only for a suite that failed (KEEP_SHOTS=1 keeps them all).
"""
import json, os, re, shutil, subprocess, sys, tempfile, threading, time, urllib.error, urllib.request
from concurrent.futures import ThreadPoolExecutor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
E2E = os.path.join(ROOT, 'apps/web/e2e')
G = json.load(open(os.path.join(E2E, 'groups.json')))
# `anim` runs at real speed: those suites check animation or time. `rules` plays fights at the test pace (FAST=1).
ANIM, RULES = G['anim'], G['rules']
GROUPS = {'smoke': G['smoke'], 'anim': ANIM, 'rules': RULES, 'all': RULES + ANIM, 'sweep': ['fx-sweep']}
# fx-sweep plays these parts; asked for as `sweep`, it plays everything (the table too).
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
# fx-sweep's whole table only when it was asked for as `sweep`
sweep_full = 'sweep' in asked

def up(url):
    try: urllib.request.urlopen(url, timeout=2); return True
    except Exception: return False

def free_mb(): return shutil.disk_usage(ROOT).free // (1024 * 1024)
# Under this much free disk a browser tab dies ("Target crashed") and the room server's bundler stops: every suite then
# fails within seconds for no reason of its own (12 Nov 2026: 61 of 61, with 113 MB free on a machine shared by a dozen
# checkouts). A suite that failed while the disk was this full did not fail: it is run again, and the run says so.
DISK_LOW_MB = 150
# Three suites' browsers write about 300 MB of profiles and cache to the temp folder while they run. Where the disk
# has less than 4 GB free and the machine has a memory disk (/dev/shm, Linux), they are given a folder there instead.
SUITE_TMP = None
if free_mb() < 4096 and os.path.isdir('/dev/shm') and os.access('/dev/shm', os.W_OK) and shutil.disk_usage('/dev/shm').free > 2 * 1024 ** 3:
    SUITE_TMP = tempfile.mkdtemp(prefix='phc-e2e-', dir='/dev/shm')

def down(url):
    """Is the server gone (the connection is refused)? A slow answer on a busy machine is not "gone"."""
    for _ in range(2):
        try: urllib.request.urlopen(url, timeout=10); return False
        except urllib.error.HTTPError: return False
        except Exception as e:
            if 'refused' not in str(e).lower(): return False
        time.sleep(1)
    return True

def warm(url):
    """Ask for the page and its scripts once, so the first suite doesn't pay for the server's cold start."""
    try:
        html = urllib.request.urlopen(url, timeout=60).read().decode('utf8', 'replace')
        for src in re.findall(r'(?:src|href)="(/[^"]+\.(?:js|css))"', html): urllib.request.urlopen(url.rstrip('/') + src, timeout=60).read()
    except Exception: pass

started = None; ours = not base; server_starts = 0; server_lock = threading.Lock()
def start_server():
    """Start the room server and wait for it. Its log: .check/e2e/server.log (the one before it, if it died: server.N.log)."""
    global started, server_starts
    os.makedirs(os.path.join(ROOT, '.check/e2e'), exist_ok=True)
    log = os.path.join(ROOT, '.check/e2e/server.log')
    if server_starts and os.path.exists(log): os.replace(log, os.path.join(ROOT, f'.check/e2e/server.{server_starts}.log'))
    subprocess.run('pkill -f "wrangler dev"; pkill -f workerd', shell=True); time.sleep(1)
    # (warnings and errors only: a line for every file served was 120,000 lines a run. On a nearly full disk the rooms'
    # saved state goes to the memory disk with the browsers' files: the server stops when it cannot write it.)
    cmd = ['npm', 'run', 'dev', '-w', '@phc/server', '--', '--log-level', 'warn'] + (['--persist-to', os.path.join(SUITE_TMP, 'wrangler')] if SUITE_TMP else [])
    started = subprocess.Popen(cmd, cwd=ROOT, stdout=open(log, 'w'), stderr=subprocess.STDOUT, start_new_session=True)
    server_starts += 1
    for _ in range(240):
        if up(base): break
        time.sleep(0.5)
    else: sys.exit('the room server did not come up (see .check/e2e/server.log)')
    warm(base)
def ensure_server():
    """The room server (wrangler dev) has died under a long run before (its bundler stopped with "all goroutines are
    asleep"). That is not the game's fault nor a suite's: when it is ours and it is down, it is started again, and the
    suites that lost it are run again. True when it had to be started again."""
    if not ours: return False
    with server_lock:
        if not down(base): return False
        print(f'note  the room server had stopped (.check/e2e/server.log); starting it again', flush=True)
        start_server(); return True
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
    if not up(base): start_server()
    else: ours = False; warm(base)  # a server someone else started (npm run dev -w @phc/server): used as it is, never restarted

ANSI = re.compile(r'\x1b\[[0-9;]*m')
def run(name, tag=''):
    shots = os.path.join(ROOT, '.check/e2e/shots', name)
    shutil.rmtree(shots, ignore_errors=True); os.makedirs(shots, exist_ok=True)
    env = dict(os.environ, BASE=base, SHOTS=shots + '/')
    if SUITE_TMP: env['TMPDIR'] = SUITE_TMP
    if not slow and name not in ANIM: env['FAST'] = '1'
    # PARTS means one thing to fx-sweep and another to coop-stall: a PARTS given to the whole run reaches a suite only
    # when it is the one suite asked for (set for a run of many, it made coop-stall run none of its parts).
    if len(names) > 1: env.pop('PARTS', None)
    if name == 'fx-sweep' and 'PARTS' not in env and not sweep_full: env['PARTS'] = SWEEP_SHORT
    ensure_server()
    t0 = time.time(); log = os.path.join(ROOT, '.check/e2e', name + tag + '.log')
    # (its own process group: a suite that runs out of time is stopped with its browsers, which were left behind before)
    p = subprocess.Popen(['node', 'apps/web/e2e/' + name + '.mjs'], cwd=ROOT, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, env=env, start_new_session=True)
    try: out, _ = p.communicate(timeout=3600 if name == 'fx-sweep' and sweep_full else 1800); code = p.returncode
    except subprocess.TimeoutExpired:
        try: os.killpg(os.getpgid(p.pid), 9)
        except Exception: p.kill()
        out, _ = p.communicate(); out = (out or '') + '\nTIMED OUT (30 minutes a suite; an hour for the whole sweep)'; code = 124
    out = ANSI.sub('', out); open(log, 'w').write(out)
    oks = len(re.findall(r'^ok ', out, re.M)); bad = [l for l in out.split('\n') if l.startswith('FAIL')]
    crashed = code != 0 and not bad
    # a suite that looked at nothing proves nothing: a green line must mean something was checked
    empty = code == 0 and not bad and oks == 0
    good = not bad and not crashed and not empty
    # a suite's pictures (.check/e2e/shots/<suite>/) are kept when it fails, for the person who reads the failure; a
    # full run's pictures are 200 MB, and a full disk fails every suite (KEEP_SHOTS=1 keeps them all)
    if good and not os.environ.get('KEEP_SHOTS'): shutil.rmtree(shots, ignore_errors=True)
    # a suite that failed with the room server down under it did not fail: it lost its server
    lost = (not good) and ((ours and ('ERR_CONNECTION_REFUSED' in out or down(base))) or free_mb() < DISK_LOW_MB or ('Target crashed' in out and free_mb() < 2 * DISK_LOW_MB))
    return {'name': name, 'oks': oks, 'bad': bad, 'crashed': crashed, 'empty': empty, 'out': out, 'secs': time.time() - t0, 'good': good, 'lost': lost}

def why(r):
    """The lines that say what went wrong, short."""
    lines = [l[:260] for l in r['bad'][:8]]
    if r['crashed']: lines += [l.strip()[:260] for l in r['out'].split('\n') if re.search(r'Error|Timeout|waiting for|TIMED OUT', l)][:4]
    if r['empty']: lines.append('it printed no "ok" line: nothing was checked')
    return lines
def line(word, r, extra=''):
    print(f"{word:<6}{r['name']:<18} {r['oks']} checks" + (f", {len(r['bad'])} failed" if r['bad'] else '') + (' · the script stopped on an error' if r['crashed'] else '') + extra + f"  ({r['secs']:.0f}s)", flush=True)

# the pictures of the run before are the runner's own: they go, so that a run never fills the disk by itself
shutil.rmtree(os.path.join(ROOT, '.check/e2e/shots'), ignore_errors=True)
os.makedirs(os.path.join(ROOT, '.check/e2e/shots'), exist_ok=True)
if free_mb() < (DISK_LOW_MB if SUITE_TMP else 1024):
    if SUITE_TMP: shutil.rmtree(SUITE_TMP, ignore_errors=True)
    sys.exit(f'the disk is nearly full ({free_mb()} MB free; three suites at once write about 300 MB while they run): free some space first')
failed, flaky, again, rerun = [], [], [], []
t_all = time.time()
try:
    parallel = max(1, jobs) > 1 and len(names) > 1
    with ThreadPoolExecutor(max_workers=max(1, jobs)) as ex:
        for r in ex.map(run, names):
            if r['good']: line('ok', r); continue
            if r['lost']: again.append(r); line('lost', r, f" · the room server stopped under it, or the disk was full ({free_mb()} MB free); it runs again at the end"); continue
            if parallel and not no_retry: again.append(r); line('retry', r, ' · failed beside the others, it runs again alone at the end'); continue
            failed.append(r['name']); line('FAIL', r)
            for l in why(r): print('     ' + l)
            print(f"     full log: .check/e2e/{r['name']}.log")
    for first in again:
        n = first['name']
        try: os.replace(os.path.join(ROOT, '.check/e2e', n + '.log'), os.path.join(ROOT, '.check/e2e', n + '.first.log'))
        except OSError: pass
        r = run(n)
        # (the server can die under the second run too: that run does not count either, three times at most)
        for _ in range(3):
            if not r['lost']: break
            if free_mb() < DISK_LOW_MB: print(f'note  the disk is full ({free_mb()} MB free): waiting a minute for space', flush=True); time.sleep(60)
            r = run(n)
        if r['good'] and first['lost']: rerun.append(n); line('ok', r, ' · run again: the room server had stopped under its first run (or the disk was full)')
        elif r['good']:
            flaky.append(n); line('FLAKY', r, ' · passed alone; beside the others it failed:')
            for l in why(first): print('     ' + l)
            print(f'     the failed run: .check/e2e/{n}.first.log')
        else:
            failed.append(n); line('FAIL', r, ' · alone too')
            for l in why(r): print('     ' + l)
            print(f'     full log: .check/e2e/{n}.log (the first run: {n}.first.log)')
finally:
    if SUITE_TMP: shutil.rmtree(SUITE_TMP, ignore_errors=True)
    if started:
        try: os.killpg(os.getpgid(started.pid), 15)
        except Exception: pass
        subprocess.run('pkill -f "wrangler dev"; pkill -f workerd', shell=True)
mins = f'  ({(time.time() - t_all) / 60:.1f} min)'
if failed: print(f'{len(failed)} of {len(names)} FAILED: ' + ' '.join(failed) + (f' · and {len(flaky)} passed only alone: ' + ' '.join(flaky) if flaky else '') + mins)
elif flaky: print(f'GREEN, BUT {len(flaky)} PASSED ONLY ALONE (a suite that cannot share the machine; fix the suite): ' + ' '.join(flaky) + mins)
else: print(f'ALL GREEN: {len(names)} suites' + mins)
if rerun and server_starts <= 1: print('(run again because the disk was full under them: ' + ' '.join(rerun) + ')')
if server_starts > 1: print(f'(the room server stopped {server_starts - 1} time(s) and was started again; run again for it: ' + (' '.join(rerun) or 'nothing') + ')')
sys.exit(1 if failed else 0)
