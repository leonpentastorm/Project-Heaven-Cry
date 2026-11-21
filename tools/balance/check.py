#!/usr/bin/env python
"""The growth bible's checker (the 0.34 rebalance; ruling F of docs/design/growth/00-rulings.md).

The bible is ONE machine-readable source, tools/balance/bible/*.json (shapes: tools/balance/bible/SCHEMA.md). This
script loads every bible file, resolves every "@file.path" reference (an unresolved or circular one is a FAILURE; one
into a file that does not exist yet is WAITING), reads data/*.json where it needs today's rows (READ ONLY: it writes
nothing anywhere), computes every table and runs the checks:

  refs           every @reference and every {"data": ...} reference into data/ resolves (ruling 49); terms name a door; own-door perks
  (a) DIGITS     each door: a level-1 and a level-20 specialist's plain hit, the full cash-out at 20 (a hit, or the total of a
                 spread cash-out), the largest legal hit at 20 with the best mark and the best gift (rulings 40, 41), capped a hit,
                 every many-foe total printed beside it
  (b) HITS       the stated attacker against same-level foes, a Soldier against the stated defenders, levels 1 to 20
  (c) LADDERS    27 skills x 10 points, each felt; data/skills.json's schedule (ruling 42); Reach, family gates and their felt
                 lines, the Push at 8, a cash-out from point 1
  (d) SPEND      the plans walked level 1 to 20 on 38 Skill and 20 Attribute points; no door bought that the plan cannot use
  (e) HOURS      the calendar, hours 0 to 49, for the same four
  (f) SOLO       every move that needs an ally says what it does alone
  (g) MIGRATION  one revision stamp, one owner
  (h) COSTS      each caster door's core, charge or MP over one standard fight at levels 1, 10 and 20 (ruling 49)
  (i) WORTH      each door's full cash-out in its own plain attacks at skill 1 and 10 against its worth anchors (rulings I, J)

Run from the repo root (Windows: export PYTHONUTF8=1 first):

    python tools/balance/check.py                 # every check, one PASS / FAIL / WAITING line each
    python tools/balance/check.py --tables        # the human tables the prose files quote
    python tools/balance/check.py --tables hp     # one section (see TABLES at the end; `scale` for the scale's ten)
    python tools/balance/check.py --bible DIR     # run on a folder of trial bible files instead of tools/balance/bible

Exit code 1 when any check FAILS. Nothing here is fitted: a table is a reading of what a player will see.
"""
import ast, collections, json, math, operator, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
BIBLE_DIR = os.path.join(ROOT, 'tools', 'balance', 'bible')
if '--bible' in sys.argv:   # a folder of trial bible files (the schema's examples, a drafter's scratch copy); data/ is still the repo's
    BIBLE_DIR = os.path.abspath(sys.argv[sys.argv.index('--bible') + 1]); del sys.argv[sys.argv.index('--bible'):sys.argv.index('--bible') + 2]
FILES = ['scale', 'body', 'mind', 'soul', 'gear_perks', 'pacing', 'world']
CORES = ['body', 'mind', 'soul']
LEVELS = list(range(1, 21))
REF_FULL = re.compile(r'^@([a-z_]+)\.([A-Za-z0-9_.\-]+)$')
REF_INLINE = re.compile(r'@([a-z_]+)\.([A-Za-z0-9_]+(?:\.[A-Za-z0-9_\-]+)*)')

# ------------------------------------------------------------------------------------------------ data (read only)
_DATA = {}
# "Today" is the data the bible was written against: data/ at the commit named in tools/balance/bible/TODAY (the last
# commit before step 1 of the build). Once a step applies the bible to data/, the tree's data/ is the bible's own numbers,
# so reading it as "today" would apply the factor twice. `--today-from-tree` reads data/ in the tree instead (a drafter
# writing against the tree as it is).
TODAY_REV = None
if '--today-from-tree' in sys.argv: sys.argv.remove('--today-from-tree')
elif os.path.exists(os.path.join(BIBLE_DIR, 'TODAY')) or os.path.exists(os.path.join(ROOT, 'tools', 'balance', 'bible', 'TODAY')):
    _tp = os.path.join(BIBLE_DIR, 'TODAY') if os.path.exists(os.path.join(BIBLE_DIR, 'TODAY')) else os.path.join(ROOT, 'tools', 'balance', 'bible', 'TODAY')
    TODAY_REV = open(_tp, encoding='utf-8').read().split()[0]
def data(name):
    if name not in _DATA:
        if TODAY_REV:
            import subprocess
            txt = subprocess.run(['git', '-C', ROOT, 'show', '%s:data/%s' % (TODAY_REV, name)], capture_output=True, check=True).stdout.decode('utf-8')
            _DATA[name] = json.loads(txt)
        else:
            with open(os.path.join(ROOT, 'data', name), encoding='utf-8') as f:
                _DATA[name] = json.load(f)
    return _DATA[name]
def data_files():
    """The data/*.json names "today" holds."""
    if TODAY_REV:
        import subprocess
        out = subprocess.run(['git', '-C', ROOT, 'ls-tree', '--name-only', TODAY_REV, 'data/'], capture_output=True, check=True).stdout.decode('utf-8')
        return sorted(os.path.basename(x) for x in out.split() if x.endswith('.json'))
    return sorted(f for f in os.listdir(os.path.join(ROOT, 'data')) if f.endswith('.json'))
_TOK = re.compile(r'([^.\[\]]+)|\[([^\]]*)\]')
def getpath(obj, path):
    """A dotted path with [n] or [id] selectors: 'combat.armor.classes[2].value', 'items[stone].damage'."""
    for name, sel in _TOK.findall(path):
        if name:
            obj = obj[name]
        elif sel == '':
            continue
        elif isinstance(obj, list):
            if sel.lstrip('-').isdigit(): obj = obj[int(sel)]
            else: obj = next(o for o in obj if isinstance(o, dict) and o.get('id') == sel)
        else:
            obj = obj[sel]
    return obj
def data_ref(spec):
    f, p = spec.split(':', 1)
    return getpath(data(f), p)

# ------------------------------------------------------------------------------------------------ the bible and its references
class Waiting(Exception):
    pass
class RefError(Exception):
    pass

class Bible:
    def __init__(self):
        self.raw, self.present, self.errors = {}, set(), []
        for f in FILES:
            p = os.path.join(BIBLE_DIR, f + '.json')
            if os.path.exists(p):
                try:
                    with open(p, encoding='utf-8') as fh:
                        self.raw[f] = json.load(fh)
                    self.present.add(f)
                except ValueError as e:
                    self.errors.append('%s.json does not parse: %s' % (f, e))
        self.cache = {}
        self.waiting_refs = set()

    def has(self, *files): return all(f in self.present for f in files)

    def lookup(self, file, path, stack=()):
        key = file + '.' + path
        if key in stack: raise RefError('circular reference: ' + ' -> '.join(stack + (key,)))
        if file not in FILES: raise RefError('@%s: no bible file named %s' % (key, file))
        if file not in self.present: raise Waiting(file)
        obj = self.raw[file]
        for seg in path.split('.'):
            if isinstance(obj, dict) and seg in obj: obj = obj[seg]
            elif isinstance(obj, list) and seg.isdigit() and int(seg) < len(obj): obj = obj[int(seg)]
            else: raise RefError('@%s: no key %r' % (key, seg))
        return self.resolve(obj, stack + (key,))

    def resolve(self, obj, stack=(), lenient=False):
        """lenient: a reference into a file that does not exist yet stays as its string (so a whole file that points into
        a waiting file still loads; num() and ev() raise Waiting where such a value is actually read)."""
        if isinstance(obj, str):
            m = REF_FULL.match(obj)
            if m:
                try: return self.lookup(m.group(1), m.group(2), stack)
                except Waiting:
                    if lenient: return obj
                    raise
            return obj
        if isinstance(obj, dict): return {k: self.resolve(v, stack, lenient) for k, v in obj.items()}
        if isinstance(obj, list): return [self.resolve(v, stack, lenient) for v in obj]
        return obj

    def get(self, file, path=None):
        """The resolved value at file.path (the whole file if path is None, leniently). Raises Waiting or RefError."""
        if file not in self.present: raise Waiting(file)
        if path is None: return self.resolve(self.raw[file], (file,), lenient=True)
        return self.lookup(file, path)

    def audit(self):
        """Every reference in every present file, full or inline: (unresolved, waiting) lists."""
        bad, wait = [], set()
        def walk(o, where):
            if isinstance(o, dict):
                for k, v in o.items(): walk(v, where + '.' + k)
            elif isinstance(o, list):
                for i, v in enumerate(o): walk(v, '%s[%d]' % (where, i))
            elif isinstance(o, str) and '@' in o:
                for m in REF_INLINE.finditer(o):
                    try: self.lookup(m.group(1), m.group(2), (where,))
                    except Waiting as w: wait.add('%s (from %s)' % (w.args[0], where.split('.')[0]))
                    except RefError as e: bad.append('%s: %s' % (where, e))
        for f in sorted(self.present): walk(self.raw[f], f)
        return bad, sorted(wait)

    def data_audit(self):
        """Every {"data": "file.json:path"} and {"data_count": ...} reference in every present file must resolve in data/
        (ruling 49): (count, unresolved list)."""
        bad, n = [], 0
        def walk(o, where):
            if isinstance(o, dict):
                for key in ('data', 'data_count'):
                    v = o.get(key)
                    if isinstance(v, str) and ':' in v and v.split(':', 1)[0].endswith('.json'):
                        n_[0] += 1
                        try: data_ref(v)
                        except (KeyError, IndexError, StopIteration, TypeError, OSError, ValueError) as e: bad.append('%s: %s (%r)' % (where, v, e))
                for k, x in o.items(): walk(x, where + '.' + k)
            elif isinstance(o, list):
                for i, x in enumerate(o): walk(x, '%s[%d]' % (where, i))
        n_ = [0]
        for f in sorted(self.present): walk(self.raw[f], f)
        return n_[0], bad

B = Bible()

def num(v, what='a number'):
    """A number: a literal, or {"data": "file.json:path", "x": factor}, or {"data_count": "file.json:path"}."""
    if isinstance(v, bool): raise RefError('%s is a bool' % what)
    if isinstance(v, str) and REF_FULL.match(v): return num(B.resolve(v), v)
    if isinstance(v, (int, float)): return v
    if isinstance(v, dict) and 'data' in v:
        x = data_ref(v['data'])
        if isinstance(x, (int, float)): return x * num(v.get('x', 1)) + num(v.get('plus', 0))   # plus: today's x1.1 read as a share (+0.1: plus -1)
        raise RefError('%s: data %s is not a number' % (what, v['data']))
    if isinstance(v, dict) and 'data_count' in v: return len(data_ref(v['data_count'])) * num(v.get('x', 1))
    raise RefError('%s: %r is not a number' % (what, v))

# ------------------------------------------------------------------------------------------------ a small, safe formula language
_BIN = {ast.Add: operator.add, ast.Sub: operator.sub, ast.Mult: operator.mul, ast.Div: operator.truediv,
        ast.Pow: operator.pow, ast.FloorDiv: operator.floordiv, ast.Mod: operator.mod}
_CMP = {ast.Lt: operator.lt, ast.LtE: operator.le, ast.Gt: operator.gt, ast.GtE: operator.ge, ast.Eq: operator.eq, ast.NotEq: operator.ne}
def ev(expr, env):
    """Evaluate a formula string: numbers, + - * / ** // %, comparisons, `a if c else b`, names from env, calls to
    functions in env, and inline @file.path references (each must resolve to a number)."""
    if isinstance(expr, (int, float)): return expr
    if isinstance(expr, dict): return num(expr)   # a data reference a full @reference resolved to
    refs = {}
    def sub(m):
        name = '__ref%d' % len(refs); refs[name] = num(B.lookup(m.group(1), m.group(2)), m.group(0)); return name
    src = REF_INLINE.sub(sub, expr)
    tree = ast.parse(src, mode='eval')
    def e(n):
        if isinstance(n, ast.Expression): return e(n.body)
        if isinstance(n, ast.Constant): return n.value
        if isinstance(n, ast.BinOp): return _BIN[type(n.op)](e(n.left), e(n.right))
        if isinstance(n, ast.UnaryOp):
            v = e(n.operand)
            if isinstance(n.op, ast.USub): return -v
            if isinstance(n.op, ast.UAdd): return v
            if isinstance(n.op, ast.Not): return not v
        if isinstance(n, ast.Compare):
            left = e(n.left)
            for op, c in zip(n.ops, n.comparators):
                right = e(c)
                if not _CMP[type(op)](left, right): return False
                left = right
            return True
        if isinstance(n, ast.IfExp): return e(n.body) if e(n.test) else e(n.orelse)
        if isinstance(n, ast.BoolOp):
            vals = [e(v) for v in n.values]
            return all(vals) if isinstance(n.op, ast.And) else any(vals)
        if isinstance(n, ast.Name):
            if n.id in refs: return refs[n.id]
            if n.id in env:
                v = env[n.id]
                return num(v, n.id) if isinstance(v, dict) else v
            raise RefError('formula %r: unknown name %s' % (expr, n.id))
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id in env and callable(env[n.func.id]):
            return env[n.func.id](*[e(a) for a in n.args])
        raise RefError('formula %r: %s is not allowed' % (expr, type(n).__name__))
    return e(tree)

# ------------------------------------------------------------------------------------------------ the scale (scale.json)
def rnd(x): return int(math.floor(x + 0.5))
class Scale:
    def __init__(self, s):
        self.s = s
        self.F = num(s['factor']['value'])
        self._col = {}
        out = data('rules.json')['output']
        self.PROF, self.FACT = out['profiles'], out['factors']
        c = s['cards']
        self.a_sl, self.s_sl = num(c['attr_slope']), num(c['skill_slope'])
        self.nsA, self.nsS = num(c['normal_share']['attribute']), num(c['normal_share']['skill'])
        self.K = {p: self.today(p) / self.bracket(self.nsA, self.nsS, p) for p in c['profiles'] if p != 'about'}
        self.grow = num(s['cash_out']['grow'])
        self.env = {'deal': lambda L: self.col('deal', L), 'mp': lambda L: self.col('mp', L), 'mend': lambda L: self.col('mend', L),
                    'col': self.col, 'stat': self.stat, 'grade_dmg': self.gd, 'grade_acc': self.ga, 'grade_arm': self.garm,
                    'cash': self.cash, 'plate': self.plate, 'hp': self.hp, 'weapon': self.weapon_base, 'mp_pool': self.mp_pool,
                    'round': rnd, 'floor': math.floor, 'ceil': math.ceil, 'min': min, 'max': max}
        for name in s['columns']:
            if name != 'about': self.env[name] = (lambda nm: lambda L: self.col(nm, L))(name)
        self._weap = None

    def slopes(self, p): return self.s['cards']['profiles'][p].get('slopes', True)
    def bracket(self, A, S, p='melee', extra_skill=0):
        if not self.slopes(p): return 1.0
        return (1 + self.a_sl * (A - 1)) * (1 + self.s_sl * (S + extra_skill))
    def today(self, p):
        pin = self.s['cards']['profiles'][p]['pin']
        if 'value' in pin: v = num(pin['value'])
        elif 'today_profile' in pin:
            q = self.PROF[pin['today_profile']]; v = q['k'] * (1 + q['attr'] * (self.nsA - 1) + q['skill'] * self.nsS)
        else: v = self.PROF[pin['today_k']]['k']
        if pin.get('fold'): v *= self.FACT[pin['fold']]
        return v
    def stat(self, p, A, S, extra_skill=0): return self.K[p] * self.bracket(A, S, p, extra_skill)
    def col(self, name, L):
        key = (name, L)
        if key not in self._col:
            c = self.s['columns'][name]
            env = dict(self.env); env.update({k: v for k, v in c.items() if isinstance(v, (int, float))}); env['L'] = L
            self._col[key] = ev(c['formula'], env)
        return self._col[key]
    def column_of(self, p): return self.s['cards']['profiles'][p]['column']
    def g(self, G): return self.s['grades'][G]
    def gd(self, G): return num(self.g(G)['dmg'])
    def ga(self, G): return num(self.g(G)['acc'])
    def garm(self, G): return num(self.g(G)['arm'])
    def order(self): return self.s['grades']['order']
    def cash(self, n):
        env = dict(self.env); env.update({'grow': self.grow, 'n': n}); return ev(self.s['cash_out']['sum_formula'], env)
    def hp(self, L, E, PT):
        h = self.s['hp']; env = dict(self.env); env.update({k: num(h[k]) for k in ('base', 'per_end', 'per_level', 'pt_pct')}); env.update(L=L, E=E, PT=PT)
        return ev(h['formula'], env)
    def mp_pool(self, L, DET, INS):
        m = self.s['mp_pool']; env = dict(self.env); env.update({k: num(m[k]) for k in ('base', 'det', 'ins')}); env.update(L=L, DET=DET, INS=INS)
        return ev(m['formula'], env)
    def plate_soak(self): return num(self.s['plate']['soak'])
    def plate(self, L, E, DUR, G='standard'):
        env = dict(self.env); env.update(soak=self.plate_soak(), L=L, E=E, DUR=DUR, G=G); return ev(self.s['plate']['formula'], env)
    def armour_value(self, cls_value, L, G):
        env = dict(self.env); env.update(value=cls_value * num(self.s['armour']['classes']['x']), L=L, G=G)
        return ev(self.s['armour']['formula'], env)
    def margin_per(self, P): m = self.s['margins']; return num(m['per']) + num(m['per_perception']) * P
    def skill_mod(self, pts): return num(data('skills.json')['modifier_by_points'][str(int(pts))])
    def gap_best(self):
        g = self.s['margins']['level_gap']; return min(num(g['max_levels']), num(g['one_hit_below']) - 1)

    # weapons -------------------------------------------------------------------------------------------------------
    @staticmethod
    def is_draw(w): return isinstance(w['damage'], str)
    @staticmethod
    def base_num(d, rp=10):
        if isinstance(d, dict): return max(d.values())
        if isinstance(d, str):
            m = re.match(r'\s*(\d+)\s*\+\s*(\d+)\s*\*', d); return int(m.group(1)) + rp * int(m.group(2))
        return d
    @staticmethod
    def new_profile(w):
        ph = w.get('phys') or {}; prof = ph.get('profile')
        if prof in ('melee', 'gun'): return prof
        if w['category'] == 'bow': return 'bow'
        if w['category'] == 'thrown': return 'thrown'
        return 'weapon'
    def wstat(self, w, A, S, rp=4):
        if self.is_draw(w): return self.K['bow'] * self.bracket(A, S, 'bow', rp)
        return self.stat(self.new_profile(w), A, S)
    def weapons(self):
        """(new damage by row id, own factor by row id): ruling A1 with the own-factor rule, computed."""
        if self._weap: return self._weap
        W = data('weapons.json')['items']; of = self.s['factor']['own_factor']; t = of['test']; step = num(of['step'])
        tA, tS, tRP, tG, below = num(t['attribute']), num(t['skill']), num(t['raw_power']), t['grade'], num(t['below'])
        def l1(w, f):
            d = w['damage']; v = max(d.values()) if isinstance(d, dict) else d
            return rnd(v * f) * self.wstat(w, tA, tS, tRP) * self.gd(tG)
        own, by = {}, collections.defaultdict(list)
        for w in W:
            if not self.is_draw(w) and self.base_num(w['damage']) and l1(w, self.F) >= below: by[w['category']].append(w)
        for cat, ws in by.items():
            f = self.F
            while f > step and any(l1(w, f) >= below for w in ws): f = round(f - step, 2)
            for w in ws: own[w['id']] = f
        pin = num(self.s['factor']['draw_bows']['pin_points'])
        new = {}
        for w in W:
            d = w['damage']; F = own.get(w['id'], self.F)
            if isinstance(d, (int, float)): new[w['id']] = max(1, rnd(d * F)) if d > 0 else 0
            elif isinstance(d, dict): new[w['id']] = {k: max(1, rnd(v * F)) for k, v in d.items()}
            else:
                m = re.match(r'\s*(\d+)\s*\+\s*(\d+)\s*\*\s*(\w+)', d)
                today = (int(m.group(1)) + pin * int(m.group(2))) * self.PROF['weapon']['k']
                new[w['id']] = rnd(today * F / (self.K['bow'] * self.bracket(pin, pin, 'bow', pin)))
        self._weap = (new, own)
        return self._weap
    def weapon_row(self, wid): return next(w for w in data('weapons.json')['items'] if w['id'] == wid)
    def weapon_base(self, wid): return self.base_num(self.weapons()[0][wid])

S = None
try:
    if B.has('scale'): S = Scale(B.raw['scale'])
except (RefError, Waiting, KeyError) as e:
    B.errors.append('scale.json does not load: %r' % (e,))

# ------------------------------------------------------------------------------------------------ output helpers
RESULTS = []
def result(check, status, text):
    RESULTS.append((check, status, text)); print('%-7s (%s) %s' % (status, check, text))
def fmt(x, d=0):
    if x is None: return '-'
    if isinstance(x, str): return x
    return ('{:,.%df}' % d).format(x)
def table(head, rows):
    print('| ' + ' | '.join(str(h) for h in head) + ' |'); print('| ' + ' | '.join('---' for _ in head) + ' |')
    for r in rows: print('| ' + ' | '.join(str(c) for c in r) + ' |')
    print()

# ------------------------------------------------------------------------------------------------ doors (body, mind, soul)
def skills_by_attr():
    out = collections.defaultdict(dict)
    for s in data('skills.json')['items']: out[s['attribute']][s['slot']] = s['id']
    return out
SKILL_ATTR = {s['id']: s['attribute'] for s in data('skills.json')['items']}
SKILL_TOP = max(int(k) for k in data('skills.json')['modifier_by_points'])   # a skill's last point (10), read

class Door:
    def __init__(self, core, attr, a):
        self.core, self.attr, self.a = core, attr, a
        self.d = a['door']; self.id = self.d['id']
        fam = skills_by_attr()[attr]
        self.alpha, self.beta, self.gamma = fam['alpha'], fam['beta'], fam['gamma']
        self.ladder = a['ladders'][self.alpha]['points']
    def point(self, p): return self.ladder.get(str(p), {})
    def reach(self, alpha, held=None):
        """Reach at `alpha` points with the family skills in `held` (dict); a step whose needs are not met is not held."""
        held = held or {}; r = None
        for p in range(1, int(alpha) + 1):
            pt = self.point(p)
            if pt.get('reach') is None: continue
            if all(held.get(k, 0) >= num(v) for k, v in (pt.get('needs') or {}).items()): r = num(pt['reach'])
        return r
    def top_reach(self): return self.reach(10, {self.beta: 10, self.gamma: 10})
    def bite(self, alpha):
        b = None
        for p in range(1, int(alpha) + 1):
            if self.point(p).get('bite') is not None: b = num(self.point(p)['bite'])
        return b
    def env(self, L, A, Sk, G, P=1, n=0, alpha=None):
        alpha = Sk if alpha is None else alpha
        e = dict(S.env); e.update(L=L, A=A, S=Sk, G=G, P=P, n=n, reach=self.reach(alpha, {self.beta: 10, self.gamma: 10}) or 0,
                                  bite=self.bite(alpha) or 0)
        return e
    def plain(self, L, A, Sk, G):
        ref = self.d['plain']; e = self.env(L, A, Sk, G)
        if 'formula' in ref: return ev(ref['formula'], e)
        if 'weapon' in ref:
            w = S.weapon_row(ref['weapon']); p = ref.get('profile') or S.new_profile(w)
            base = S.weapon_base(ref['weapon'])
            st = S.stat(p, A, Sk) if p != 'bow' or not S.is_draw(w) else S.K['bow'] * S.bracket(A, Sk, 'bow', Sk)
            return base * st * S.col(S.column_of(p), L) * S.gd(G)
        p = ref['profile']
        return num(ref['base']) * S.stat(p, A, Sk) * S.col(S.column_of(p), L) * S.gd(G)
    def cashouts(self): return {k: v for k, v in (self.d.get('cashouts') or {}).items() if isinstance(v, dict)}
    def hits(self):
        """Every way the door strikes (ruling 40): its cash-outs and their readings, and every class move with a `cashout`
        (Launch, Retort, Storm Front's arcs, Verdict), read on the door's own env (its Bite, its Reach, its plain hit)."""
        out = dict(self.cashouts())
        for rk, moves in (((self.a.get('class') or {}).get('ranks')) or {}).items():
            for mv in moves:
                if isinstance(mv, dict) and isinstance(mv.get('cashout'), dict):
                    co = dict(mv['cashout']); co.setdefault('name', mv.get('name', mv.get('id'))); co.setdefault('source', 'class rank %s' % rk)
                    out['class:' + mv['id']] = co
        return out
    def cash_hit(self, co, L, A, Sk, G, n, P=1, m=0, SUM=0.0):
        """(the largest single hit, the total over every foe and every landing in a turn, the foes struck). A cash-out's
        `formula` is its factor C over everything it strikes; `per_hit` (when the total is not one hit times the foes: Slam's
        ring, Snap All's shares) is the C of its largest single hit; `targets` and `per_turn` multiply the total only."""
        e = self.env(L, A, Sk, G, P=P, n=n); e['plain'] = self.plain(L, A, Sk, G)
        base = ev(co.get('base', 'plain'), e); mg = S.margin_per(P) * m
        Cf = ev(co['formula'], e); Cp = ev(co['per_hit'], e) if 'per_hit' in co else Cf
        targets = ev(co.get('targets', '1'), e); per_turn = ev(co.get('per_turn', '1'), e)
        per = base * (Cp + mg) * (1 + SUM)
        struck = ev(co['struck'], e) if 'struck' in co else targets   # the foes or Bonds struck, when targets does not say it
        return per, base * (Cf + mg) * (1 + SUM) * targets * per_turn, struck
    def cash_amount(self, co, L, A, Sk, G, n, P=1, m=0, SUM=0.0): return self.cash_hit(co, L, A, Sk, G, n, P, m, SUM)[1]

def doors():
    out, waiting = [], []
    for core in CORES:
        if core not in B.present: waiting.append(core); continue
        for attr, a in B.get(core)['attributes'].items():
            if isinstance(a, dict) and 'door' in a: out.append(Door(core, attr, a))
    return out, waiting

def all_dicts(objs):
    stack = list(objs)
    while stack:
        o = stack.pop()
        if isinstance(o, dict):
            yield o; stack.extend(o.values())
        elif isinstance(o, list): stack.extend(o)

def terms(kind, door_id):
    """The sum (or to_hit) terms a door's cash-out may carry (ruling 30): every {kind: {door, value, group}} in body,
    mind, soul and gear_perks whose door is this door's id or "any"; the best of each exclusive group."""
    files = [B.get(f) for f in CORES + ['gear_perks'] if f in B.present]
    best, free = {}, []
    for d in all_dicts(files):
        t = d.get(kind)
        if isinstance(t, dict) and 'door' in t and 'value' in t and t['door'] in (door_id, 'any'):
            v = num(t['value'])
            if t.get('group'): best[t['group']] = max(best.get(t['group'], -1e9), v)
            else: free.append(v)
    return sum(free) + sum(best.values())

def plain_terms(profile):
    """The plain-hit-only sum terms (SCHEMA 4: {"sum": {"scope": "plain", "hits": [profiles or "any"], "value", "group"}}): traits,
    boons, mods, signatures, properties, perks of no door. They reach a plain hit of their profile, never a cash-out (ruling 30).
    A group keeps its best one, or its best `take` (a character holds two traits: {"group": "trait", "take": <data>})."""
    files = [B.get(f) for f in CORES + ['gear_perks'] if f in B.present]
    groups, take, free = collections.defaultdict(list), {}, []
    for d in all_dicts(files):
        t = d.get('sum')
        if isinstance(t, dict) and t.get('scope') == 'plain' and (profile in (t.get('hits') or []) or 'any' in (t.get('hits') or [])):
            v = num(t['value'])
            if t.get('group'):
                groups[t['group']].append(v)
                if 'take' in t: take[t['group']] = int(num(t['take']))
            else: free.append(v)
    return sum(free) + sum(sum(sorted(vs, reverse=True)[:take.get(g, 1)]) for g, vs in groups.items())

def own_door_conflicts():
    """gear_perks.rules.own_door: a perk of a door's own skills counts on its cash-out. A perk with an own_door whose term is
    scope plain contradicts that rule unless it names the ruling that makes it plain-only (`plain_by_ruling`: ruling 44 for Iron Grip)."""
    if 'gear_perks' not in B.present: return []
    out = []
    for pid, pk in (B.raw['gear_perks'].get('perks') or {}).items():
        if not isinstance(pk, dict) or not pk.get('own_door'): continue
        plain = [d for d in all_dicts([pk]) if isinstance(d.get('sum'), dict) and d['sum'].get('scope') == 'plain']
        if plain and not pk.get('plain_by_ruling'): out.append(pid)
    return out
def bad_terms():
    """A sum or to_hit term that names no door (nor any) and is not scope plain with its hits counts nowhere: a FAILURE."""
    out = []
    for f in CORES + ['gear_perks']:
        if f not in B.present: continue
        for d in all_dicts([B.raw[f]]):
            for kind in ('sum', 'to_hit'):
                t = d.get(kind)
                if isinstance(t, dict) and 'data' not in t and not ('door' in t or (kind == 'sum' and t.get('scope') == 'plain' and t.get('hits'))):   # a {data} number is a mark's or gift's size
                    out.append('%s:%s.%s' % (f, d.get('id') or d.get('name') or d.get('text', '?')[:30], kind))
    return out

def squad_items(kind):
    """Ruling 41: what a squad adds is one mark on the foe and one gift on the attacker. Every {kind: {name, kind:
    damage | to_hit | defense | both, value, to_hit?}} in scale, the core files and gear_perks: (name, damage share, to-hit).
    A defense mark lowers the foe's Defense: it reads as to-hit. The best one of each applies to a hit, never two."""
    files = [B.get(f) for f in ['scale'] + CORES + ['gear_perks'] if f in B.present]
    out = {}
    for d in all_dicts(files):
        t = d.get(kind)
        if isinstance(t, dict) and t.get('kind') in ('damage', 'to_hit', 'defense', 'both') and 'value' in t:
            v = num(t['value'], '%s %s' % (kind, t.get('name')))
            dmg = v if t['kind'] in ('damage', 'both') else 0
            th = v if t['kind'] in ('to_hit', 'defense') else num(t.get('to_hit', 0))
            out[(t.get('name', '?'), dmg, th)] = 1
    return [('none', 0, 0)] + sorted(out)
def margins_at(co, th, min_def):
    """Margins a hit earns at to-hit th against Defense min_def (0 when it lands with no roll, or rolls without Margins)."""
    m = S.s['margins']
    if not co.get('rolls') or co.get('margins') is False: return 0
    return max(0, (20 + th - min_def) // num(m['step'])) + num(m['natural_20'])
def best_with_squad(fn, th0, SUM0, marks, gifts):
    """fn(th, SUM) -> (per hit, total, ...): the best mark and the best gift (ruling 41), the pair that makes the largest hit."""
    best = None
    for mk in marks:
        for gf in gifts:
            r = fn(th0 + mk[2] + gf[2], SUM0 + mk[1] + gf[1])
            if best is None or r[0] > best[0][0]: best = (r, mk, gf, th0 + mk[2] + gf[2], SUM0 + mk[1] + gf[1])
    return best

def plain_profile(d):
    ref = d.d['plain']
    if 'weapon' in ref: return ref.get('profile') or S.new_profile(S.weapon_row(ref['weapon']))
    return ref.get('profile', 'flat')

# ------------------------------------------------------------------------------------------------ (a) DIGITS
def check_digits():
    if S is None: result('a', 'WAITING', 'DIGITS: scale.json'); return
    ds, waiting = doors()
    for core in waiting: result('a', 'WAITING', 'DIGITS: %s.json (its three doors)' % core)
    if not ds: return
    dg = S.s['digits']; l1, l20 = dg['l1_specialist'], dg['l20_specialist']
    A1, S1 = num(l1['attribute']), num(l1['skill']); P20 = num(l20['perception'])
    lo1, hi1 = num(dg['plain_l1']['min']), num(dg['plain_l1']['max']); lo20, hi20 = num(dg['plain_l20']['min']), num(dg['plain_l20']['max'])
    fmin, fG = num(dg['full_cashout_l20']['min']), dg['full_cashout_l20']['grade']
    tmax, tG = num(dg['largest_turn_l20']['max']), dg['largest_turn_l20']['grade']
    marks, gifts = squad_items('mark'), squad_items('gift')
    min_def = None
    if 'world' in B.present:
        min_def = min(num(t['defense']) for t in B.get('world', 'tiers').values() if isinstance(t, dict) and 'defense' in t)
    for d in ds:
        try:
            p1 = [d.plain(1, A1, S1, g) for g in l1['grades']]
            p20 = [d.plain(20, 10, 10, g) for g in l20['grades']]
            ok1 = all(lo1 <= x <= hi1 for x in p1); ok20 = all(lo20 <= x <= hi20 for x in p20)
            result('a', 'PASS' if ok1 else 'FAIL', 'DIGITS %s: level-1 plain hit %s (%s; %s to %s)' % (d.id, ' / '.join(fmt(x) for x in p1), ' / '.join(l1['grades']), fmt(lo1), fmt(hi1)))
            result('a', 'PASS' if ok20 else 'FAIL', 'DIGITS %s: level-20 plain hit %s (%s; %s to %s)' % (d.id, ' / '.join(fmt(x) for x in p20), ' / '.join(l20['grades']), fmt(lo20), fmt(hi20)))
            cos = d.cashouts(); hs = d.hits()
            if not cos: result('a', 'FAIL', 'DIGITS %s: the door names no cash-out' % d.id); continue
            n10 = d.top_reach() or 0
            # the floor (ruling 40): per hit for a single-target door, the total for a spread one (Snap All, Slam's ring);
            # the door's own cash-outs and their readings only (nothing but the ladder: no class move, no Mastered row)
            full = {}
            for k, co in cos.items():
                if co.get('source'): continue
                per, tot, _ = d.cash_hit(co, 20, 10, 10, fG, n10)
                full[k] = tot if co.get('spread') else per
            kbest = max(full, key=full.get)
            fin = fmin <= full[kbest] <= tmax
            # ruling 51: an ordinary turn (the ladder alone) is five digits; ruling I (newer): a door whose Bite is set from its
            # effort (its `worth` anchors) is not compared with a shared total, so outside five digits it is a NOTE for the lead
            st = 'PASS' if fin else ('NOTE' if isinstance(d.d.get('worth'), dict) else 'FAIL')
            result('a', st, 'DIGITS %s: full cash-out at 20 (%s, %s, Reach %s, Bite %s, %s) %s (an ordinary turn: %s to %s%s)'
                   % (d.id, kbest, 'in total' if cos[kbest].get('spread') else 'one hit', fmt(n10), d.bite(10), fG, fmt(full[kbest]), fmt(fmin), fmt(tmax),
                      '' if fin else '; set from its worth, ruling I: for the lead' if st == 'NOTE' else ''))
            if min_def is None: result('a', 'WAITING', 'DIGITS %s: the largest legal hit reads the lowest Defense from world.json' % d.id); continue
            push = d.d.get('push') or {}; n_push = n10 + (num(push.get('reach_plus', 0)) if push else 0)
            n_push += terms('reach_plus', d.id)   # forks and class things that add units (SCHEMA 1.4: a reach_plus term)
            SUM0 = terms('sum', d.id)
            th0 = S.skill_mod(10) + S.ga(tG) + S.gap_best() + terms('to_hit', d.id)
            rows = []
            for k, co in hs.items():
                fn = lambda th, SUM, co=co: d.cash_hit(co, 20, 10, 10, tG, n_push, P=P20, m=margins_at(co, th, min_def), SUM=SUM) + (margins_at(co, th, min_def),)
                rows.append((k, co, best_with_squad(fn, th0, SUM0, marks, gifts)))
            over = [(k, b) for k, co, b in rows if b[0][0] > tmax]
            k, co, b = max(rows, key=lambda r: r[2][0][0])
            (per, tot, tg, mm), mk, gf, th, SUM = b
            result('a', 'REPORT', 'DIGITS %s: largest legal hit at 20 (%s, %s units with the Push, %d Margins at +%d to hit, sum +%d%% with the mark %s and the gift %s, %s) %s%s (five digits is %s a hit)%s'
                   % (d.id, k, fmt(n_push), mm, th, round(100 * SUM), mk[0], gf[0], tG, fmt(per), ('; %s in total on %s foes' % (fmt(tot), fmt(tg))) if tot > per * 1.0001 else '', fmt(tmax),
                      (': six digits on %s (ruling 51: reported, not failed; ruling 53 is for Leon)' % ', '.join('%s %s' % (kk, fmt(bb[0][0])) for kk, bb in over)) if over else ''))
            many = [(kk, bb) for kk, cc, bb in rows if bb[0][1] > bb[0][0] * 1.0001]
            if many:
                print('        the many-foe hits of %s (ruling 40: capped a hit, the total beside it): %s' % (d.id, '; '.join('%s %s a hit, %s on %s' % (kk, fmt(bb[0][0]), fmt(bb[0][1]), fmt(bb[0][2])) for kk, bb in many)))
            held = d.d['plain'].get('held')
            if held:   # ruling 54: the Break (and a Take) reads the weapon actually held: the heaviest legal one, reported
                W0 = S.weapons()[0]; cand = []
                for w in data('weapons.json')['items']:
                    pr = S.new_profile(w)
                    if pr in held and not S.is_draw(w) and S.base_num(W0[w['id']]): cand.append((S.base_num(W0[w['id']]) * S.K[pr], w['id'], pr))
                if cand:
                    _, wid, pr = max(cand)
                    hd = Door(d.core, d.attr, d.a); hd.d = dict(d.d); hd.d['plain'] = dict(d.d['plain'], weapon=wid, profile=pr)
                    hrows = []
                    for k, co in hd.hits().items():
                        fn = lambda th, SUM, co=co: hd.cash_hit(co, 20, 10, 10, tG, n_push, P=P20, m=margins_at(co, th, min_def), SUM=SUM) + (margins_at(co, th, min_def),)
                        hrows.append((k, best_with_squad(fn, th0, SUM0, marks, gifts)))
                    k2, b2 = max(hrows, key=lambda r: r[1][0][0])
                    result('a', 'REPORT', 'DIGITS %s: largest legal hit at 20 with the heaviest legal weapon held (%s, %s; %s) %s (ruling 54: the weapon actually held)' % (d.id, wid, pr, k2, fmt(b2[0][0])))
            if 'gear_perks' in B.present:   # the largest plain hit: the door's own terms, every plain-hit term of its profile, the mark and the gift
                prof = plain_profile(d); pref = d.d['plain']
                if 'rolls' not in pref: result('a', 'FAIL', 'DIGITS %s: the plain hit does not say whether it rolls (plain.rolls)' % d.id); continue
                pco = {'rolls': pref['rolls']}; PS0 = terms('sum', d.id) + plain_terms(prof)
                base = d.plain(20, 10, 10, tG)
                fn = lambda th, SUM: (base * (1 + S.margin_per(P20) * margins_at(pco, th, min_def)) * (1 + SUM), 0, 1, margins_at(pco, th, min_def))
                (pv, _, _, pm), mk, gf, th, PS = best_with_squad(fn, th0, PS0, marks, gifts)
                result('a', 'REPORT', 'DIGITS %s: largest plain hit at 20 (%s, %s, %d Margins, sum +%d%% with the mark %s and the gift %s, %s) %s (five digits is %s)'
                       % (d.id, prof, 'rolls' if pref['rolls'] else 'lands', pm, round(100 * PS), mk[0], gf[0], tG, fmt(pv), fmt(tmax)))
        except Waiting as w: result('a', 'WAITING', 'DIGITS %s: %s.json' % (d.id, w.args[0]))
        except (RefError, KeyError, TypeError, ValueError, StopIteration) as e: result('a', 'FAIL', 'DIGITS %s: cannot compute: %r' % (d.id, e))

# ------------------------------------------------------------------------------------------------ pacing helpers
def ceiling_at(L):
    c = B.get('pacing', 'gates.ceiling_by_level'); return num(c[str(max(int(k) for k in c if k.isdigit() and int(k) <= L))])
def maps():
    ms = B.get('pacing', 'clock.maps'); return [(int(k), v) for k, v in sorted(ms.items(), key=lambda kv: int(kv[0])) if k.isdigit()]
def map_at_level(L):
    for m, v in maps():
        if num(v['squad_leaves']) >= L: return m
    return maps()[-1][0]
def grade_found(m):
    order = S.order(); ff = B.get('pacing', 'grades_by_map.finds_from_map'); g = 'standard'
    for G in order:
        if G in ff and num(ff[G]) <= m: g = G
    return g
def stated_grade(L):
    o = S.order(); return o[max(0, o.index(grade_found(map_at_level(L))) - 1)]

# ------------------------------------------------------------------------------------------------ (b) HITS
def hits_rows():
    W = B.get('world'); tiers = W['tiers']; rule = W['tiers_rule']
    att, dfn = W['stated_attacker'], W['stated_defender']
    ew = W['enemy_weapon']; ebase = S.weapon_base(ew['weapon']) if 'weapon' in ew else num(ew['base'])
    def tier_at(t, L):
        r = tiers[t]
        hp = num(r['hp']) * num(rule['hp_x']) * S.col('enemy_hp', L)
        arm = num(r['armour']) * num(rule['armour_x']) * S.col('enemy_armour', L)
        hit = ebase * num(r['damage']) * num(rule['damage_x']) * S.col('enemy_damage', L)
        return hp, arm, hit
    out = []
    for L in num_list(att['levels']):
        A = ceiling_at(L); G = stated_grade(L); summ = num(att['ordinary_sum_per_level']) * (L - 1)
        for b in att['builds']:
            if 'weapon' in b:
                w = S.weapon_row(b['weapon']); p = b.get('profile') or S.new_profile(w)
                hit = S.weapon_base(b['weapon']) * S.stat(p, A, A) * S.col(S.column_of(p), L) * S.gd(G) * (1 + summ)
            else:
                hit = num(b['base']) * S.stat(b['profile'], A, A) * S.col(S.column_of(b['profile']), L) * S.gd(G) * (1 + summ)
            row = ['attacker', b['id'], L, '%d/%d' % (A, A), G, '+%d%%' % round(100 * summ), fmt(hit)]
            for t in att['against']:
                hp, arm, _ = tier_at(t, L); row.append(hp / max(1, hit - arm))
            out.append(row)
        for dd in dfn['builds']:
            hp = S.hp(L, num(dd['endurance']), num(dd['pain_threshold']))
            cls = next(c for c in data('rules.json')['combat']['armor']['classes'] if c['name'] == dd['armour'])
            arm = S.armour_value(cls['value'], L, G)
            row = ['defender', dd['id'], L, 'End %d PT %d' % (num(dd['endurance']), num(dd['pain_threshold'])), G, dd['armour'], fmt(hp)]
            for t in dfn['against']:
                _, _, hit = tier_at(t, L); row.append(hp / max(1, hit - arm))
            out.append(row)
    return out, att['against'], dfn['against']
def num_list(v): return [int(num(x)) for x in v]
def numf(v, env=None):
    """A number, or a formula string (inline @references allowed) evaluated with env."""
    if isinstance(v, str) and REF_FULL.match(v):
        r = B.resolve(v)
        if isinstance(r, str): return ev(r, dict({'min': min, 'max': max}, **(env or {})))
        return num(r, v)
    if isinstance(v, str): return ev(v, dict({'min': min, 'max': max}, **(env or {})))
    return num(v)
def check_hits():
    need = [f for f in ('scale', 'world', 'pacing') if f not in B.present]
    if need: result('b', 'WAITING', 'HITS: %s.json' % ', '.join(need)); return
    try:
        rows, ta, td = hits_rows(); floors = {'attacker': numf(B.get('world', 'stated_attacker.min_exchanges'))}
        floors['defender'] = numf(B.get('world', 'stated_defender')['min_exchanges']) if 'min_exchanges' in B.get('world', 'stated_defender') else floors['attacker']
        for r in rows:
            vals = r[7:]; heads = ta if r[0] == 'attacker' else td; floor_ = floors[r[0]]
            bad = [h for h, v in zip(heads, vals) if v < floor_]
            what = 'hits to drop' if r[0] == 'attacker' else 'hits survived'
            result('b', 'FAIL' if bad else 'PASS', 'HITS %s %s at level %d (%s, %s): %s %s%s' % (r[0], r[1], r[2], r[3], r[4], what,
                   ', '.join('%s %.1f' % (h, v) for h, v in zip(heads, vals)), (' (under %s: %s)' % (floor_, ', '.join(bad))) if bad else ''))
    except Waiting as w: result('b', 'WAITING', 'HITS: %s.json' % w.args[0])
    except (RefError, KeyError, TypeError, StopIteration, ValueError) as e: result('b', 'FAIL', 'HITS: cannot compute: %r' % (e,))

# ------------------------------------------------------------------------------------------------ (c) LADDERS
def ladder_of(skill):
    attr = SKILL_ATTR[skill]
    for core in CORES:
        if core in B.present:
            a = B.get(core)['attributes'].get(attr)
            if a: return a.get('ladders', {}).get(skill), a
    return None, None
def check_ladders():
    fam = skills_by_attr()
    for core in CORES:
        if core not in B.present: result('c', 'WAITING', 'LADDERS: %s.json (its nine skills)' % core)
    for core in CORES:
        if core not in B.present: continue
        attrs = [s['attribute'] for s in data('skills.json')['items'] if s['core'] == core]
        for attr in dict.fromkeys(attrs):
            f = fam[attr]
            for slot in ('alpha', 'beta', 'gamma'):
                sk = f[slot]; lad, a = ladder_of(sk)
                if not lad: result('c', 'FAIL', 'LADDERS %s (%s of %s): no ladder' % (sk, slot, attr)); continue
                pts = lad.get('points') or {}
                missing = [p for p in range(1, 11) if not str((pts.get(str(p)) or {}).get('felt') or '').strip()]
                result('c', 'FAIL' if missing else 'PASS', 'LADDERS %s (%s): 10 points, felt on %d%s' % (sk, slot, 10 - len(missing), (' (no felt at %s)' % missing) if missing else ''))
                # ruling 42: the ladder's perk steps, forks and Mastered point are data/skills.json's ladder for the slot, exactly
                sched = data('skills.json')['ladder'][slot]
                def at(word): return [p for p in range(1, 11) if word in str((pts.get(str(p)) or {}).get('exists') or '').lower()]
                got = {'perk_steps': at('perk step'), 'forks': at('fork:'), 'mastered': at('mastered')}
                want = {'perk_steps': sched['perk_steps'], 'forks': sched['forks'], 'mastered': [sched['mastered']]}
                bad = ['%s at %s, data %s' % (k, got[k], want[k]) for k in want if got[k] != want[k]]
                result('c', 'FAIL' if bad else 'PASS', 'LADDERS %s (%s): the schedule is data/skills.json ladder.%s%s' % (sk, slot, slot, (': ' + '; '.join(bad)) if bad else ''))
            a = (B.get(core)['attributes'] or {}).get(attr)
            if not isinstance(a, dict) or 'door' not in a or f['alpha'] not in (a.get('ladders') or {}):
                result('c', 'FAIL', 'LADDERS %s: no door, or no alpha ladder, in %s.json' % (attr, core)); continue
            try:
                d = Door(core, attr, a)
            except (KeyError, TypeError) as e:
                result('c', 'FAIL', 'LADDERS %s: the door does not load: %r' % (attr, e)); continue
            steps = [(p, d.point(p)) for p in range(1, 11) if d.point(p).get('reach') is not None]
            probs = []
            if not steps or steps[0][0] != 1: probs.append('no Reach at point 1')
            vals = [num(s['reach']) for _, s in steps]
            if vals != sorted(vals) or len(set(vals)) != len(vals): probs.append('Reach does not climb: %s' % vals)
            for p, need in ((7, {d.beta: 4}), (10, {d.beta: 7, d.gamma: 4})):
                st = d.point(p)
                if st.get('reach') is None: probs.append('no Reach step at %d' % p); continue
                got = {k: num(v) for k, v in (st.get('needs') or {}).items()}
                if got != need: probs.append('the step at %d needs %s, ruling 13 says %s' % (p, got, need))
            result('c', 'FAIL' if probs else 'PASS', 'LADDERS %s: Reach %s and family gates%s' % (d.id, ' / '.join('%s at %d' % (fmt(num(s['reach'])), p) for p, s in steps), (': ' + '; '.join(probs)) if probs else ''))
            # the family gates are felt only once met: a Reach step's felt line says so (critic-player-3 6)
            loose = [p for p, st in steps if st.get('needs') and not re.search(r'\b(once|if|when)\b', str(st.get('felt', '')))]
            result('c', 'FAIL' if loose else 'PASS', 'LADDERS %s: the felt line of every gated Reach step says its gate%s' % (d.id, (' (not at %s)' % loose) if loose else ''))
            pp = (d.d.get('push') or {}).get('point')
            result('c', 'PASS' if pp is not None and num(pp) == 8 else 'FAIL', 'LADDERS %s: the Push at %s (ruling 17: 8)' % (d.id, pp))
            firsts = [k for k, co in d.cashouts().items() if num(co.get('from_point', 99)) == 1]
            result('c', 'PASS' if firsts else 'FAIL', 'LADDERS %s: a cash-out from point 1 (%s)' % (d.id, ', '.join(firsts) or 'none'))

# ------------------------------------------------------------------------------------------------ (d) SPEND
def gains_at(L):
    g = B.get('pacing', 'levels.gains')
    if L == 1: return num(g['creation']['skill']), num(g['creation']['attribute'])
    row = (g.get('by_level') or {}).get(str(L)) or g['odd' if L % 2 else 'even']
    return num(row['skill']), num(row['attribute'])
def door_by_alpha():
    ds, _ = doors(); return {d.alpha: d for d in ds}, {d.id: d for d in ds}
def walk(plan):
    """One character, levels 1 to 20: Attribute points to the plan's attributes in order (at most the ceiling), Skill
    points to the plan's skills in order (each point legal: skill <= its attribute <= ceiling, and felt)."""
    attrs = {s['attribute']: 1 for s in data('skills.json')['items']}; sk = {s: 0 for s in SKILL_ATTR}
    out, sp, ap, totals = [], 0, 0, [0, 0]
    for L in LEVELS:
        gs, ga = gains_at(L); sp += gs; ap += ga; totals[0] += gs; totals[1] += ga; cap = ceiling_at(L)
        for attr, tgt in plan['attributes']:
            while ap and attrs[attr] < min(num(tgt), cap): attrs[attr] += 1; ap -= 1
        bought = []
        while sp:
            buy = None
            for s, tgt in plan['skills']:
                nxt = sk[s] + 1
                if sk[s] < num(tgt) and nxt <= SKILL_TOP and nxt <= attrs[SKILL_ATTR[s]]:
                    lad, _ = ladder_of(s)
                    felt = ((lad or {}).get('points') or {}).get(str(nxt), {}).get('felt')
                    if felt and str(felt).strip(): buy = (s, nxt, felt); break
            if not buy: break
            sk[buy[0]] = buy[1]; sp -= 1; bought.append(buy)
        out.append((L, dict(attrs), dict(sk), bought, sp, ap))
    return out, totals
def check_spend():
    need = [f for f in CORES + ['pacing'] if f not in B.present]
    if need: result('d', 'WAITING', 'SPEND: %s.json' % ', '.join(need)); return
    try:
        plans = B.get('pacing', 'spend_plans'); by_alpha, by_id = door_by_alpha()
        for pid, plan in plans.items():
            if not isinstance(plan, dict): continue
            rows, totals = walk(plan)
            career = (num(B.get('pacing', 'levels.career.skill')), num(B.get('pacing', 'levels.career.attribute')))
            ok = tuple(totals) == RULING_11 and career == RULING_11   # ruling 11: both the walk and pacing's career are 38 and 20
            dead = [L for L, _, _, b, sp, _ in rows if not b and sp]
            last = rows[-1]
            tops = [d for d in by_id.values() if last[2][d.alpha] >= 10 and d.reach(10, last[2]) == d.top_reach()]
            probs = []
            if dead: probs.append('nothing felt to buy at levels %s' % dead)
            if last[4] or last[5]: probs.append('%d Skill and %d Attribute points unspent at 20' % (last[4], last[5]))
            if len(plan.get('doors', [])) >= 2 and len(tops) >= 2: probs.append('two doors at the top Reach: %s' % ', '.join(d.id for d in tops))
            if not ok: probs.append('the career is %s Skill and %s Attribute points (pacing says %s and %s; ruling 11: 38 and 20)' % (tuple(totals) + career))
            # ruling 49 (e): a first point in a door the plan does not name, or in a door whose counter its own build cannot hold
            named = set(plan.get('doors', []))
            bought = [dd for dd in by_id.values() if last[2][dd.alpha] >= 1]
            stray = [dd.id for dd in bought if dd.id not in named]
            if stray: probs.append('buys a first point in %s, a door the plan does not name (a point it cannot use)' % ', '.join(stray))
            for dd in bought:
                broken = [x for x in ((dd.d.get('counter') or {}).get('broken_by') or []) if x in named and x != dd.id]
                if broken: probs.append('buys %s, whose counter %s cannot hold (counter.broken_by)' % (dd.id, ' and '.join(broken)))
            result('d', 'FAIL' if probs else 'PASS', 'SPEND %s: %d Skill / %d Attribute points; top Reach on %s%s' % (pid, totals[0], totals[1], ', '.join(d.id for d in tops) or 'no door', (': ' + '; '.join(probs)) if probs else ''))
    except Waiting as w: result('d', 'WAITING', 'SPEND: %s.json' % w.args[0])
    except (RefError, KeyError, TypeError, ValueError) as e: result('d', 'FAIL', 'SPEND: cannot compute: %r' % (e,))

# ------------------------------------------------------------------------------------------------ (e) HOURS
RULING_11 = (38, 20)
RULING_25 = {'finds_from_map': {'fine': 1, 'masterwork': 3, 'relic': 5, 'celestial': 10}, 'shelf_never': ['celestial'], 'relic_sold_from_first_endless': True}
def fights_by_hour():
    """Cumulative worthy fights at hour h, linear inside each map (pacing.clock.maps[m].worthy_fights)."""
    ms = maps()
    def f(h):
        tot = 0.0
        for m, v in ms:
            s, e, n = num(v['start_h']), num(v['end_h']), num(v['worthy_fights'])
            if h >= e: tot += n
            elif h > s: tot += n * (h - s) / (e - s)
        return tot
    return f
def door_mark_thresholds(door_id):
    """A door's Mark thresholds (pacing.door_marks): its units a worthy fight x the worthy fights a specialist has walked
    by each of pacing.door_marks_hours. One rule, nine readings."""
    fb = fights_by_hour(); u = num(B.get('pacing', 'door_marks.%s.units_per_fight' % door_id))
    return [round(u * fb(num(h))) for h in B.get('pacing', 'door_marks_hours')]
def thresholds_of(t, upto):
    if isinstance(t, dict) and 'door_marks' in t: return door_mark_thresholds(t['door_marks'])
    if isinstance(t, list): return [num(x) for x in t]
    if isinstance(t, dict) and 'cycle' in t:     # one bar after another: a new item each time the cycle's last is reached
        cyc = [num(x) for x in t['cycle']]; out, base = [], 0
        while not out or (out[-1] < upto and len(out) < num(t.get('count', 10 ** 6))):
            out += [base + x for x in cyc]; base += cyc[-1]
        return out
    if isinstance(t, dict) and 'each' in t:      # `over` items filled evenly: each item's threshold x over, once an item
        return [num(x) * num(t['over']) for x in t['each'] for _ in range(int(num(t['over'])))]
    first, every = num(t['first']), num(t['every']); out = [first]
    while out[-1] < upto and len(out) < num(t.get('count', 10 ** 6)): out.append(out[-1] + every)
    return out
def credits_of_map(m):
    """The credits a character earns on map m on the reference route (pacing.credits.income, survival.json credits)."""
    P = B.get('pacing'); rt = P['clock']['route']; inc = P['credits']['income']; rr = rt['depth']; reads = data('survival.json')['rewards']['reads']; tot = 0.0
    for half in ('a', 'b'):
        for k, n in rt['half_' + half].items():
            if k not in rr: continue
            kk = reads.get(k, k) if k == 'gate' else k
            mult = 1 if kk == 'fight' else num(inc['kind'][kk])
            tot += num(n) * (num(inc['base']) + num(inc['per_depth']) * num(rr[k])) * mult * (1 + num(inc['stage']) * (m - 1))
    return tot
def visit_price(m, place):
    """The cheapest one grade step a visit on map m can buy (pacing.credits.grade_step: the step's floor to the shelf's
    grade, x the place): what the credits must pay before a shop or Forge visit counts as a gain (critic-player-3 7)."""
    P = B.get('pacing'); gs = P['credits']['grade_step']; sh = P['grades_by_map']['shelf_from_map']
    best = max((g for g in sh if num(sh[g]) <= m), key=lambda g: num(sh[g]), default=None)
    if best is None: return None
    return num(gs['floors'][best]) * num(gs['place'][place])
def calendar():
    P = B.get('pacing'); cal = P['calendar']; h0, h1 = num_list(cal['hours']); clock = P['clock']; fb = fights_by_hour()
    gate_share = num(clock['gate_at_share']); ms = dict(maps())
    def map_hour(m, at):
        v = ms[int(m)]; s, e = num(v['start_h']), num(v['end_h'])
        if isinstance(at, (int, float)): return s + (e - s) * at      # a share of the map's hours
        return {'start': s, 'gate': s + (e - s) * gate_share, 'boss': e}[at]
    shared = []
    for L, w in P['levels']['lands'].items():
        shared.append((map_hour(w['map'], w['at']), 'L%s' % L))
    def visits(share):
        """The map events, a shop or Forge visit only when the credits this character spends on gear pay its cheapest grade
        step (critic-player-3 7): one wallet across the run, spent at the first visit that it pays."""
        out, spent, earned_before = [], 0.0, 0.0
        for m, v in sorted(ms.items()):
            s0, e0 = num(v['start_h']), num(v['end_h']); cm = credits_of_map(m)
            for ev_ in sorted(cal.get('map_events', []), key=lambda x: map_hour(m, x['at'])):
                if 'maps' in ev_ and not (num(ev_['maps'][0]) <= m <= num(ev_['maps'][1])): continue
                if 'every' in ev_ and (m - num(ev_.get('first', 1))) % num(ev_['every']): continue   # a node the route takes every n-th map
                if m < num(ev_.get('first', 1)): continue
                h = map_hour(m, ev_['at'])
                if ev_.get('buys'):
                    price = visit_price(m, ev_['buys']); wallet = share * (earned_before + cm * (h - s0) / (e0 - s0)) - spent
                    if price is None or wallet < price: continue
                    spent += price
                out.append((h, ev_['label'].replace('{map}', str(m))))
            earned_before += cm
        return out
    ff = P['grades_by_map']['finds_from_map']
    for G, m in ff.items(): shared.append((map_hour(num(m), 'start'), '%s found' % G))
    out = {}
    for cid, ch in cal['characters'].items():
        evs = list(shared) + visits(numf(ch.get('gear_share', P['credits']['gear_share']['reading'])))
        for st in ch['streams']:
            stream = cal['streams'][st['stream']]; rate = numf(st['units_per_fight'])
            hmax = h1 + 1; ths = thresholds_of(stream['thresholds'], rate * fb(hmax))
            lab = st.get('label', stream.get('label', st['stream']))
            k = 0
            for i, t in enumerate(ths):
                # the first hour whose cumulative units reach t (a tenth-hour search)
                h = h0
                while h <= hmax and rate * fb(h) < t: h = round(h + 0.1, 1)
                if h > hmax: break
                evs.append((h, lab.replace('{n}', str(i + 1)))); k += 1
        out[cid] = sorted(evs)
    return out
def stream_count(ch_streams, cal, stream_id, hour, fb):
    n = 0
    for st in ch_streams:
        if st['stream'] != stream_id: continue
        rate = numf(st['units_per_fight']); ths = thresholds_of(cal['streams'][stream_id]['thresholds'], rate * fb(hour))
        n += len([t for t in ths if rate * fb(hour) >= t])
    return n
def check_hours():
    if 'pacing' not in B.present or S is None: result('e', 'WAITING', 'HOURS: pacing.json'); return
    try:
        P = B.get('pacing'); cal = P['calendar']; h0, h1 = num_list(cal['hours']); evs = calendar(); fb = fights_by_hour()
        lv = {L: None for L in LEVELS}
        for h, lab in evs[next(iter(evs))]:
            if re.fullmatch(r'L\d+', lab): lv[int(lab[1:])] = h
        lo, hi = num_list(cal['level_20_between'])
        result('e', 'PASS' if lv[20] is not None and lo <= lv[20] <= hi else 'FAIL', 'HOURS: level 20 at hour %s (%d to %d)' % (fmt(lv[20], 1), lo, hi))
        for cid, es in evs.items():
            empty = [h for h in range(h0, h1 + 1) if not any(h <= x < h + 1 for x, _ in es)]
            result('e', 'FAIL' if empty else 'PASS', 'HOURS %s: %d events in hours %d to %d%s' % (cid, len([x for x, _ in es if h0 <= x < h1 + 1]), h0, h1, (', empty hours %s' % empty) if empty else ', no empty hour'))
        g = P['grades_by_map']; probs = []
        for G, m in RULING_25['finds_from_map'].items():
            if num(g['finds_from_map'].get(G, -1)) != m: probs.append('%s found from map %s (ruling 25: %d)' % (G, g['finds_from_map'].get(G), m))
        for G in RULING_25['shelf_never']:
            if G in g.get('shelf_from_map', {}): probs.append('%s is sold' % G)
        first_endless = num(P['clock']['first_endless_map'])
        if num(g.get('shelf_from_map', {}).get('relic', -1)) != first_endless: probs.append('Relic sold from map %s (ruling 25: endless only, map %d)' % (g.get('shelf_from_map', {}).get('relic'), first_endless))
        for G, m in g.get('shelf_from_map', {}).items():
            if G in g['finds_from_map'] and num(m) < num(g['finds_from_map'][G]): probs.append('%s sold (map %s) before it is found (map %s)' % (G, m, g['finds_from_map'][G]))
        result('e', 'FAIL' if probs else 'PASS', 'HOURS: grades by map against ruling 25%s' % ((': ' + '; '.join(probs)) if probs else ''))
        col = P['collection']; tgt, by = num(col['target']), num(col['by_hour'])
        for cid, ch in cal['characters'].items():
            parts, bad = [], []
            for sysid in ch.get('collects', []):
                sy = col['systems'][sysid]; sids = sy['stream'] if isinstance(sy['stream'], list) else [sy['stream']]
                n = num(sy.get('start', 0)) + sum(stream_count(ch['streams'], cal, sid, by, fb) for sid in sids)
                n = min(n, num(sy['of'])); share = n / num(sy['of']); parts.append('%s %d of %d' % (sysid, n, num(sy['of'])))
                if share < tgt: bad.append(sysid)
            result('e', 'FAIL' if bad else 'PASS', 'HOURS %s: the collection by hour %d: %s%s' % (cid, by, ', '.join(parts) or 'nothing listed', (' (under %d%%: %s)' % (100 * tgt, ', '.join(bad))) if bad else ''))
    except Waiting as w: result('e', 'WAITING', 'HOURS: %s.json' % w.args[0])
    except (RefError, KeyError, TypeError, ValueError, StopIteration) as e: result('e', 'FAIL', 'HOURS: cannot compute: %r' % (e,))

# ------------------------------------------------------------------------------------------------ (e) CLOCK: the time model
# pacing.py is retired into this block (ruling F): the hours of pacing.clock.maps and levels.xp_total are recomputed from
# pacing.clock.time_model and route, the world's levels by map and row, and data/survival.json, and must agree.
def nice2(x):
    """Two significant figures, so a number on the screen reads clean."""
    if x <= 0: return 0
    d = 10 ** max(0, int(math.floor(math.log10(x))) - 1); return int(round(x / d) * d)
def world_level(m, row):
    """A foe's level from the map and the row (world.levels, world.maps, world.endless): row is early, late, top or boss."""
    W = B.get('world'); cap = num(W['levels']['cap']); first = num(W['endless']['from_map'])
    if m < first: return min(cap, num(W['maps'][str(m)][row]))
    return min(cap, ev(W['endless']['levels'][row], {'m': m, 'cap': cap, 'min': min, 'max': max}))
ROW_OF = {'gate': 'top', 'elite': 'top', 'vault_guard': 'top', 'boss': 'boss'}
def held_level(m, half):
    """The level a character holds while walking half a or b of map m, read from pacing.levels.lands."""
    L = 1
    for k, w in B.get('pacing', 'levels.lands').items():
        mm, at = int(num(w['map'])), w['at']
        if mm < m or (mm == m and half == 'b' and at == 'gate'): L = max(L, int(k))
    return min(int(num(B.get('world', 'levels.cap'))), L)
_MODEL = {}
def model_maps(squad=1):
    """Each map of pacing.clock.maps from the time model: its halves' hours, the level held, XP earned and fights."""
    if squad in _MODEL: return _MODEL[squad]
    P = B.get('pacing'); tm = P['clock']['time_model']; rt = P['clock']['route']; rounds = data('survival.json')['rounds']
    fights = rt['fights']; km = P['xp']['kind_mult']; fx = P['xp']['fight_xp']; worth = P['xp']['worth']['by_gap']
    def fight_min(kind, L):
        r = num(rounds[rt['rounds_of'][kind]]) * num(tm['rounds_vs_target'])
        per = squad * (num(tm['turn_min_l1']) + num(tm['turn_min_per_level']) * (L - 1)) + squad * num(tm['foes_solo']) * num(tm['foe_turn_min'])
        return r * per + num(tm['after_fight_min'])
    out, h = [], 0.0
    for m in sorted(int(k) for k in P['clock']['maps'] if k.isdigit()):
        row = {'map': m, 'from': h}
        for half in ('a', 'b'):
            L = held_level(m, half); nodes = rt['half_' + half]; mins = 0.0; xp = 0.0
            for k, n in nodes.items():
                n = num(n)
                mins += n * (fight_min(k, L) if k in fights else num(tm['node_min'][k]) * (1 + num(tm['node_min_per_extra_player']) * (squad - 1))) + n * num(tm['choose_min'])
                if k in km and k != 'why':
                    lv = world_level(m, ROW_OF.get(k, 'early' if half == 'a' else 'late'))
                    gmax = num(data('enemies.json')['levels']['gap']['max_levels']); gap = int(max(-gmax, min(gmax, lv - L)))
                    xp += n * num(fx['at_1']) * num(fx['per_level']) ** (lv - 1) * num(km[k]) * num(worth[str(gap)])
            if m == 1 and half == 'a': mins += num(tm['camp_min'])
            if half == 'b': mins += num(tm['boon_min'])
            row[half] = {'from': h, 'to': h + mins / 60, 'L': L, 'xp': xp, 'fights': sum(num(n) for k, n in nodes.items() if k in fights)}
            h += mins / 60
        row['to'] = h; out.append(row)
    _MODEL[squad] = out
    return out
def model_xp_total():
    """levels.xp_total from the route: the XP walked to each level's landing place, each level's own XP to two figures, summed."""
    lands = {int(k): (int(num(w['map'])), w['at']) for k, w in B.get('pacing', 'levels.lands').items()}
    cum, at = 0.0, {1: 0.0}
    for mp in model_maps():
        for half in ('a', 'b'):
            cum += mp[half]['xp']; place = 'gate' if half == 'a' else 'boss'
            for L, (m, a) in lands.items():
                if m == mp['map'] and a == place: at[L] = cum
    tot, run = {1: 0}, 0
    for L in range(2, 21):
        run += nice2(at[L] - at[L - 1]); tot[L] = run
    return tot
def check_clock():
    if not B.has('pacing', 'world'): result('e', 'WAITING', 'CLOCK: pacing.json, world.json'); return
    try:
        P = B.get('pacing'); tol = num(P['clock']['tolerance_h']); ms = dict(maps()); probs = []
        for mp in model_maps():
            v = ms[mp['map']]
            for key, val in (('start_h', mp['from']), ('end_h', mp['to'])):
                if abs(num(v[key]) - val) > tol: probs.append('map %d %s %s (the model %.2f)' % (mp['map'], key, v[key], val))
            if num(v['squad_arrives']) != mp['a']['L']: probs.append('map %d squad_arrives %s (lands: %d)' % (mp['map'], v['squad_arrives'], mp['a']['L']))
            leaves = max([mp['b']['L']] + [int(k) for k, w in P['levels']['lands'].items() if int(num(w['map'])) == mp['map']])
            if num(v['squad_leaves']) != min(int(num(B.get('world', 'levels.cap'))), leaves): probs.append('map %d squad_leaves %s (lands: %d)' % (mp['map'], v['squad_leaves'], leaves))
            if abs(num(v['worthy_fights']) - (mp['a']['fights'] + mp['b']['fights'])) > 1e-9: probs.append('map %d worthy_fights %s (route %s)' % (mp['map'], v['worthy_fights'], mp['a']['fights'] + mp['b']['fights']))
            share = (mp['a']['to'] - mp['from']) / (mp['to'] - mp['from'])
            if abs(share - num(P['clock']['gate_at_share'])) > num(P['clock']['gate_share_tolerance']): probs.append('map %d gate at %.3f of its hours' % (mp['map'], share))
        result('e', 'FAIL' if probs else 'PASS', 'CLOCK: pacing.clock.maps against the time model and the route (within %s h)%s' % (fmt(tol, 2), (': ' + '; '.join(probs)) if probs else ''))
        got = model_xp_total(); typed = {int(k): num(v) for k, v in P['levels']['xp_total'].items()}
        bad = ['%d: %s (route %s)' % (L, fmt(typed.get(L, -1)), fmt(got[L])) for L in range(1, 21) if typed.get(L) != got[L]]
        result('e', 'FAIL' if bad else 'PASS', "CLOCK: levels.xp_total against the route's XP%s" % ((': ' + '; '.join(bad)) if bad else ' (20 at %s)' % fmt(got[20])))
    except Waiting as w: result('e', 'WAITING', 'CLOCK: %s.json' % w.args[0])
    except (RefError, KeyError, TypeError, ValueError, StopIteration) as e: result('e', 'FAIL', 'CLOCK: cannot compute: %r' % (e,))

# ------------------------------------------------------------------------------------------------ (h) COSTS
def cost_rows(d):
    """A caster door's resource_use read at scale.costs.fight_check.levels on its specialist's walk: (level, n, carries,
    one full cash-out, everything pressed every turn of one standard fight)."""
    ru = d.d['resource_use']; fc = S.s['costs']['fight_check']
    plan = B.get('pacing', 'spend_plans')[ru['plan']]; rows, _ = walk(plan)
    push = d.d.get('push') or {}; out = []
    for L in num_list(fc['levels']):
        _, attrs, sk, _, _, _ = rows[L - 1]
        Sk = sk[d.alpha]; n = (d.reach(Sk, sk) or 0) + (num(push.get('reach_plus', 0)) if push and Sk >= num(push['point']) else 0)
        env = dict(S.env); env.update(attrs); env.update(sk)
        env.update(L=L, A=attrs[d.attr], S=Sk, B=sk[d.beta], n=n, rounds=num(fc['rounds']), ap=num(fc['ap']))
        out.append((L, n, numf(ru['carries'], env), numf(ru['cost'], env), numf(ru['press'], env), syphon_fight(ru, env)))
    return out
def syphon_fight(ru, env):
    """Ruling 54: the fight test counts Syphon. The MP a caster can draw over one fight from the air as data has it
    (rules.json mana.meter: the start, each Syphon's draw off the meter, the band it is drawn in; no deaths counted), each
    draw the bible's band x its Determination share x mp(L), and the AP those draws take from pressing."""
    if 'syphon' not in ru: return None
    sy = ru['syphon']; meter = data('rules.json')['mana']['meter']; bands = meter['bands']
    draw = -next(e['delta'] for e in meter['events'] if e['event'] == 'syphon'); m = num(meter['start']); mp_total = 0.0; k = 0
    e2 = dict(env); e2['DET'] = numf(ru['syphon_det'], env)
    while m >= draw:
        i = next(j for j, b in enumerate(bands) if b['min'] <= m <= b['max'])
        e2['band'] = num(sy['bands'][i]); e2['per_det'] = num(sy['per_det']); mp_total += ev(sy['formula'], e2); m -= draw; k += 1
    return mp_total, k * num(sy['ap'])
def check_costs():
    if S is None or not all(f in B.present for f in CORES + ['pacing']): result('h', 'WAITING', 'COSTS: the core files and pacing.json'); return
    ds, _ = doors(); fc = S.s['costs']['fight_check']; top = num(fc['choice_at']); n_ = 0
    for d in ds:
        if 'resource_use' not in d.d: continue
        n_ += 1
        try:
            rows = cost_rows(d); probs = []; notes = []
            for L, n, car, one, press, sy in rows:
                if car < one: probs.append('level %d carries %s, under one full cash-out (%s)' % (L, fmt(car, 1), fmt(one, 1)))
                if L == top and car >= press: probs.append('level %d carries %s, enough to press everything every turn (%s): the cost is no choice' % (L, fmt(car, 1), fmt(press, 1)))
                if sy and L == top:
                    smp, sap = sy; press2 = press * (1 - sap / (num(fc['rounds']) * num(fc['ap'])))
                    if car + smp >= press2: notes.append('with the Syphons the air gives (%s MP for %s AP) level %d carries %s against %s pressed with the AP left: the cost is no choice' % (fmt(smp, 1), fmt(sap), L, fmt(car + smp, 1), fmt(press2, 1)))
            result('h', 'FAIL' if probs else 'PASS', 'COSTS %s (%s, %s): %s%s' % (d.id, d.d['resource_use']['res'], d.d['resource_use']['plan'],
                   '; '.join('L%d %s units: carries %s%s, one %s (%.1f), a pressed fight %s' % (L, fmt(n), fmt(car, 1), (' +%s by Syphon' % fmt(sy[0], 1)) if sy else '', fmt(one, 1), car / one if one else 0, fmt(press, 1)) for L, n, car, one, press, sy in rows),
                   (': ' + '; '.join(probs)) if probs else ''))
            # ruling 54: the Syphon reading; a cost fix is a number of the bible's, so a failing reading is for the lead
            for nt in notes: result('h', 'NOTE', 'COSTS %s: %s (for the lead: a cost or the Syphon draw is a number of the bible)' % (d.id, nt))
        except Waiting as w: result('h', 'WAITING', 'COSTS %s: %s.json' % (d.id, w.args[0]))
        except (RefError, KeyError, TypeError, ValueError, StopIteration, IndexError) as e: result('h', 'FAIL', 'COSTS %s: cannot compute: %r' % (d.id, e))
    if not n_: result('h', 'FAIL', 'COSTS: no door states a resource_use (ruling 49)')

# ------------------------------------------------------------------------------------------------ (i) WORTH
def full_c(d, co, Sk):
    """The cash-out factor C of one full cash-out at Sk points in the door's alpha (Reach with the family full, the Bite held
    there), in the door's own plain hits (L 20, A 10, Relic: C does not read them for any door but through plain itself)."""
    n = d.reach(Sk, {d.beta: 10, d.gamma: 10}) or 0
    e = d.env(20, 10, Sk, 'relic', n=n, alpha=Sk); e['plain'] = d.plain(20, 10, Sk, 'relic')
    return ev(co['formula'], e) * ev(co.get('base', 'plain'), e) / e['plain'], n
def check_worth():
    """Rulings I and J (00-rulings.md): a full cash-out is worth, in the character's own plain attacks, the door's `worth`
    anchors at skill 1 and at skill 10; the full cash-out never falls from one point to the next (Law 1). A reading, set
    from the anchors: FAIL only when the JSON's Bites do not give the anchors, or a point lowers the full cash-out."""
    ds, _ = doors()
    for d in ds:
        w = d.d.get('worth')
        if not isinstance(w, dict): result('i', 'FAIL', 'WORTH %s: the door states no worth (rulings I, J)' % d.id); continue
        co = d.cashouts()[w['cash_out']]
        try:
            c1, n1 = full_c(d, co, 1); c10, n10 = full_c(d, co, 10)
            row = [full_c(d, co, p)[0] for p in range(1, 11)]
            falls = [p for p in range(2, 11) if row[p - 1] < row[p - 2] - 1e-9]
            ok = abs(c1 - num(w['at_1'])) <= 0.01 and abs(c10 - num(w['at_10'])) <= 0.01 and not falls
            result('i', 'PASS' if ok else 'FAIL', 'WORTH %s: a full %s is %.2f plain attacks at skill 1 (Reach %s; the table %s) and %.2f at 10 (Reach %s; the table %s); by point %s%s'
                   % (d.id, w['cash_out'], c1, fmt(n1), fmt(num(w['at_1']), 2), c10, fmt(n10), fmt(num(w['at_10']), 2), ' / '.join('%.2f' % x for x in row),
                      (': falls at %s' % falls) if falls else ''))
            for k, c in d.cashouts().items():
                if c.get('reading_of') == w['cash_out'] and num(c.get('per_turn', 1)) > 1:
                    cc, _ = full_c(d, c, 10)
                    print('        %s %s at skill 10: %.2f plain attacks (%s a turn)' % (d.id, k, cc * num(c['per_turn']), fmt(num(c['per_turn']))))
        except (RefError, KeyError, TypeError, ValueError) as e: result('i', 'FAIL', 'WORTH %s: cannot compute: %r' % (d.id, e))

# ------------------------------------------------------------------------------------------------ (f) SOLO, (g) MIGRATION
def check_solo():
    files = [f for f in CORES + ['gear_perks'] if f in B.present]
    if not files: result('f', 'WAITING', 'SOLO: body, mind, soul, gear_perks .json'); return
    bad, n = [], 0
    for f in files:
        for d in all_dicts([B.raw[f]]):
            if d.get('needs_ally') is True:
                n += 1
                if not str(d.get('solo') or '').strip(): bad.append('%s:%s' % (f, d.get('id') or d.get('name') or '?'))
    result('f', 'FAIL' if bad else 'PASS', 'SOLO: %d moves need an ally; %d say nothing alone%s' % (n, len(bad), (': ' + ', '.join(bad)) if bad else ''))
    missing = [f for f in CORES + ['gear_perks'] if f not in B.present]
    if missing: result('f', 'WAITING', 'SOLO: %s.json' % ', '.join(missing))
def check_migration():
    stamps, refs, bad = [], 0, []
    for f in sorted(B.present):
        for d in all_dicts([B.raw[f]]):
            if 'revision' in d: stamps.append((f, d))
        for d in all_dicts([B.raw[f]]):
            if 'migration' in d:
                v = d['migration']
                if isinstance(v, str) and v == '@pacing.migration': refs += 1
                elif not (f == 'pacing' and d is B.raw[f]): bad.append('%s holds a migration of its own' % f)
    if 'pacing' not in B.present:
        result('g', 'WAITING', 'MIGRATION: pacing.json owns it (ruling 39); %d files point to it; %d stamps elsewhere%s' % (refs, len(stamps), (': ' + '; '.join(bad)) if bad else '')); return
    own = [(f, d) for f, d in stamps if d.get('owner')]
    probs = list(bad)
    if len(stamps) != 1: probs.append('%d revision stamps (%s)' % (len(stamps), ', '.join(f for f, _ in stamps)))
    if len(own) != 1: probs.append('%d owners' % len(own))
    result('g', 'FAIL' if probs else 'PASS', 'MIGRATION: %s%s' % ('one stamp %s, owner %s' % (stamps[0][1]['revision'], stamps[0][1].get('owner')) if len(stamps) == 1 else '', (': ' + '; '.join(probs)) if probs else ''))

def check_refs():
    for e in B.errors: result('refs', 'FAIL', e)
    bad, wait = B.audit()
    for b in bad: result('refs', 'FAIL', 'REFERENCE %s' % b)
    result('refs', 'FAIL' if bad else 'PASS', 'REFERENCES: %d unresolved or circular in %s' % (len(bad), ', '.join(sorted(B.present)) or 'no file'))
    for w in wait: result('refs', 'WAITING', 'REFERENCES into %s' % w)
    nd, dbad = B.data_audit()
    for b in dbad: result('refs', 'FAIL', 'DATA REFERENCE %s' % b)
    result('refs', 'FAIL' if dbad else 'PASS', 'DATA REFERENCES: %d into data/, %d unresolved' % (nd, len(dbad)))
    od = own_door_conflicts()
    result('refs', 'FAIL' if od else 'PASS', 'OWN DOOR: %d perks of a door carry a plain-only term without the ruling that allows it%s' % (len(od), (': ' + ', '.join(od)) if od else ''))
    bt = bad_terms()
    result('refs', 'FAIL' if bt else 'PASS', 'TERMS: %d sum or to_hit terms name no door and no plain scope%s' % (len(bt), (': ' + ', '.join(bt)) if bt else ''))

# ------------------------------------------------------------------------------------------------ --tables
def t_factor():
    W = S.s['factor']['walk']; flat = set(W['flat_keys']); share = re.compile(W['share_of']); hp_ops = set(W['hp_ops']); kinds = set(W['amount_kinds'])
    sp = {(r['file'], r['path']): r for r in S.s['factor']['self_paid']['rows']}; ref_bar = num(S.s['factor']['self_paid']['old_reference_bar'])
    rest = {(r['file'], r['path']) for r in S.s['factor']['restated_elsewhere']}
    out = []
    def skip(f, p, k):
        for s in W['skip']:
            if s['file'] != f: continue
            if 'path_has' in s and s['path_has'] not in p: continue
            if 'path_starts' in s and not p.startswith(s['path_starts']): continue
            if 'key' in s and s['key'] != k: continue
            return True
        return False
    def walk_(o, path, f):
        if isinstance(o, dict):
            if o.get('kind') in kinds and isinstance(o.get('base'), (int, float)):
                if o['base']: out.append((f, path + '.base', o['base']))
                for i, p in enumerate(o.get('per') or []):
                    if isinstance(p.get('value'), (int, float)) and not share.match(str(p.get('of', ''))): out.append((f, path + '.per[%d](%s)' % (i, p.get('of')), p['value']))
            if o.get('op') in hp_ops or (o.get('op') == 'stat_mod' and o.get('stat') == 'hp'):
                if isinstance(o.get('value'), (int, float)) and abs(o['value']) >= 1: out.append((f, path + '.value', o['value']))
            for k, v in o.items():
                p = path + '.' + k
                if isinstance(v, (int, float)) and not isinstance(v, bool) and k == 'hp_per_level' and f != 'skills.json': out.append((f, p, v)); continue
                if isinstance(v, (int, float)) and not isinstance(v, bool) and k in flat and abs(v) >= 1:
                    if skip(f, p, k) or (o.get('kind') in kinds and k == 'base'): continue
                    out.append((f, p, v))
                elif isinstance(v, (dict, list)): walk_(v, p, f)
        elif isinstance(o, list):
            for i, v in enumerate(o): walk_(v, path + '[%s]' % ((v.get('id') if isinstance(v, dict) and v.get('id') else i)), f)
    for f in data_files():
        if f != 'weapons.json': walk_(data(f), '', f)
    def new(f, p, v):
        if (f, p) in sp:
            sh = sp[(f, p)]['share']
            return '%d%% of max HP (today %s over the old bar %s: %d%%)' % (round(100 * num(sh)), v, fmt(ref_bar), rnd(100 * abs(v) / ref_bar))
        if (f, p) in rest: return 'restated by its owner (scale.factor.restated_elsewhere)'
        n = v * S.F; return round(n) if float(v).is_integer() and abs(n) >= 10 else round(n, 2)
    print('#### The factor x%s: every flat number outside weapons.json (%d), today and new\n' % (S.F, len(out)))
    table(['file', 'path', 'today', 'new'], [[f, p, v, new(f, p, v)] for f, p, v in out])
    print('Also: ' + '; '.join('%s %s (%s)' % (e['file'], e['key'], e['rule']) for e in W['extra_keys']) + '.\n')
def t_weapons():
    new, own = S.weapons(); W = data('weapons.json')['items']
    print('#### Every weapon row: damage today and new, its factor and its new profile\n')
    table(['category', 'id', 'today', 'new', 'factor', 'profile'], [[w['category'], w['id'], json.dumps(w['damage']).replace('"', ''), json.dumps(new[w['id']]).replace('"', ''), own.get(w['id'], S.F), S.new_profile(w)]
                                                                   for w in sorted(W, key=lambda w: (w['category'], str(w['damage'])))])
    print('#### The strongest row of each category, one plain hit (no Margins, no sum)\n')
    best = {}
    for w in W:
        v = S.base_num(new[w['id']])
        if v and (w['category'] not in best or v > best[w['category']][1]): best[w['category']] = (w['id'], v, w)
    rows = []
    for cat, (wid, v, w) in sorted(best.items()):
        l1 = [v * S.wstat(w, a, s, rp) * S.gd(g) for a, s, rp, g in ((1, 0, 0, 'standard'), (4, 4, 4, 'standard'), (7, 7, 3, 'standard'), (7, 7, 3, 'fine'))]
        l20 = [v * S.wstat(w, 10, 10, 10) * S.col('deal', 20) * S.gd(g) for g in ('relic', 'celestial')]
        rows.append([cat, wid, v, S.new_profile(w)] + [fmt(x) for x in l1 + l20])
    table(['category', 'strongest row', 'new base', 'profile', 'L1 1/0', 'L1 4/4', 'L1 7/7', 'L1 7/7 Fine', 'L20 10/10 Relic', 'L20 10/10 Celestial'], rows)
def t_columns():
    names = [n for n in S.s['columns'] if n != 'about']
    print('#### The level columns, levels 1 to 20 (scale.columns)\n')
    table(['level'] + names, [[L] + [fmt(S.col(n, L), 3) for n in names] for L in LEVELS])
def t_profiles():
    print('#### The profiles: Stat = k x (1 + %s x (A - 1)) x (1 + %s x S); k pins a normal share (%d and %d) to today x%s\n' % (S.a_sl, S.s_sl, S.nsA, S.nsS, S.F))
    rows = []
    for p, v in S.s['cards']['profiles'].items():
        if p == 'about': continue
        rows.append([p, v['pair'], fmt(S.today(p), 4), fmt(S.K[p], 4), v['column'], v['grade'], fmt(S.stat(p, 1, 0), 3), fmt(S.stat(p, 7, 7), 3), fmt(S.stat(p, 10, 10), 3)])
    table(['profile', 'pair', 'today at the normal share', 'k', 'column', 'grade', 'Stat 1/0', '7/7', '10/10'], rows)
def t_hp():
    print('#### Character HP (scale.hp)\n')
    table(['build', 'L1', 'L5', 'L10', 'L15', 'L20'], [['End %d, PT %d' % (e, pt)] + [fmt(S.hp(L, e, pt)) for L in (1, 5, 10, 15, 20)] for e in (1, 4, 7, 10) for pt in (0, 5, 10)])
def t_mp():
    print('#### The MP pool (scale.mp_pool)\n')
    table(['build', 'L1', 'L5', 'L10', 'L15', 'L20'], [['Det %d, Ins %d' % (d, i)] + [fmt(S.mp_pool(L, d, i)) for L in (1, 5, 10, 15, 20)] for d, i in ((1, 1), (4, 4), (7, 2), (2, 7), (10, 4), (10, 10))])
def t_plate():
    print('#### One plate\'s soak (scale.plate), before the beta feed\n')
    table(['build', 'L1', 'L5', 'L10', 'L15', 'L20', 'L20 Celestial'], [['End %d, Dur %d' % (e, d)] + [fmt(S.plate(L, e, d), 1) for L in (1, 5, 10, 15, 20)] + [fmt(S.plate(20, e, d, 'celestial'), 1)] for e, d in ((1, 0), (4, 4), (7, 7), (10, 10))])
    print('#### Armour values (scale.armour)\n')
    rows = []
    for a in data('rules.json')['combat']['armor']['classes']:
        if a['value']: rows.append([a['name'], a['value']] + [fmt(S.armour_value(a['value'], L, g), 1) for L, g in ((1, 'standard'), (1, 'fine'), (10, 'masterwork'), (10, 'relic'), (20, 'relic'), (20, 'celestial'))])
    table(['class', 'today', 'L1 Standard', 'L1 Fine', 'L10 Masterwork', 'L10 Relic', 'L20 Relic', 'L20 Celestial'], rows)
def t_grades():
    print('#### The grade ladder (scale.grades)\n')
    sf = S.s['grades']['prayer']['standing_for']
    table(['grade', 'damage', 'to hit', 'armour', 'mod slots', 'properties', 'prayer from standing'], [[g, 'x%s' % S.gd(g), '+%d' % S.ga(g), 'x%s' % S.garm(g), S.g(g)['mod_slots'], S.g(g)['properties'], sf.get(g, '0 to %d' % (min(sf.values()) - 1))] for g in S.order()])
def t_margins():
    m = S.s['margins']; step, n20 = num(m['step']), num(m['natural_20'])
    def mg(r, mod, d):
        if r == 1: return None
        t = r + mod
        if r != 20 and t < d: return None
        return max(0, (t - d) // step) + (n20 if r == 20 else 0)
    def exp(mod, d, per): return sum(1 + per * x for x in (mg(r, mod, d) for r in range(1, 21)) if x is not None) / 20
    print('#### Margins: expected worth of one attack in plain hits (Perception 1; in brackets 10)\n')
    table(['to hit', 'Defense 8', '11', '14', '15'], [['%+d' % mod] + ['%s (%s)' % (fmt(exp(mod, d, S.margin_per(1)), 2), fmt(exp(mod, d, S.margin_per(10)), 2)) for d in (8, 11, 14, 15)] for mod in range(-2, 13)])
def t_caps():
    print('#### The engine\'s caps (scale.caps)\n')
    table(['cap', 'today', 'ruling', 'why'], [[k, v['today'], v['ruling'], v['why']] for k, v in S.s['caps']['items'].items()])
def t_doors():
    ds, waiting = doors()
    for c in waiting: print('WAITING: %s.json\n' % c)
    for d in ds:
        print('#### %s (%s, alpha %s): the ladder and the cash-outs\n' % (d.id, d.attr, d.alpha))
        table(['point', 'reach', 'needs', 'bite', 'new', 'felt'], [[p, d.point(p).get('reach', ''), d.point(p).get('needs', ''), d.point(p).get('bite', ''), d.point(p).get('new', ''), d.point(p).get('felt', '')] for p in range(1, 11)])
        rows = []
        for k, co in d.cashouts().items():
            for L, a, s, g in ((1, 7, 1, 'standard'), (1, 7, 7, 'fine'), (10, 9, 9, 'masterwork'), (20, 10, 10, 'relic'), (20, 10, 10, 'celestial')):
                n = d.reach(s, {d.beta: 10, d.gamma: 10}) or 0
                try: rows.append([k, L, '%d/%d' % (a, s), g, fmt(d.plain(L, a, s, g)), n, fmt(d.cash_amount(co, L, a, s, g, n))])
                except (Waiting, RefError) as e: rows.append([k, L, '%d/%d' % (a, s), g, 'WAITING %r' % (e,), '', ''])
        table(['cash-out', 'level', 'attribute/alpha', 'grade', 'plain hit', 'units (Reach)', 'full cash-out'], rows)
def t_hits():
    if not B.has('world', 'pacing'): print('WAITING: world.json, pacing.json\n'); return
    rows, ta, td = hits_rows()
    print('#### The stated attacker and the stated defenders, same-level foes\n')
    table(['side', 'build', 'level', 'points', 'grade', 'sum or armour', 'hit or HP'] + ['vs %s' % t for t in ta], [r[:7] + ['%.1f' % v for v in r[7:]] for r in rows])
def t_spend():
    if not all(B.has(f) for f in CORES + ['pacing']): print('WAITING: body, mind, soul, pacing .json\n'); return
    for pid, plan in B.get('pacing', 'spend_plans').items():
        if not isinstance(plan, dict): continue
        rows, _ = walk(plan)
        print('#### Spend: %s\n' % pid)
        table(['level', 'bought (skill to point: what is felt)', 'unspent S / A'], [[L, '; '.join('%s %d: %s' % b for b in bought) or '-', '%d / %d' % (sp, ap)] for L, _, _, bought, sp, ap in rows])
def t_calendar():
    if 'pacing' not in B.present: print('WAITING: pacing.json\n'); return
    evs = calendar(); h0, h1 = num_list(B.get('pacing', 'calendar.hours')); ids = list(evs)
    print('#### The calendar, hours %d to %d\n' % (h0, h1))
    table(['hour'] + ids, [[h] + [', '.join(lab for x, lab in evs[c] if h <= x < h + 1) for c in ids] for h in range(h0, h1 + 1)])

def t_pacing():
    if not B.has('pacing', 'world'): print('WAITING: pacing.json, world.json\n'); return
    P = B.get('pacing'); ms = dict(maps()); mm = model_maps(); fb = fights_by_hour()
    print("#### The clock: maps, foe levels by row, hours (typed in pacing.clock.maps; the model's in brackets), grades\n")
    ff = P['grades_by_map']['finds_from_map']; sh = P['grades_by_map']['shelf_from_map']
    def best(tab, m): return max((g for g in tab if num(tab[g]) <= m), key=lambda g: num(tab[g]), default='standard')
    table(['map', 'early', 'late', 'top', 'boss', 'squad arrives / leaves', 'starts (h)', 'ends (h)', 'finds and the vault', 'shelf'],
          [[r['map']] + [world_level(r['map'], x) for x in ('early', 'late', 'top', 'boss')] + ['%s / %s' % (ms[r['map']]['squad_arrives'], ms[r['map']]['squad_leaves']),
           '%s (%.2f)' % (ms[r['map']]['start_h'], r['from']), '%s (%.2f)' % (ms[r['map']]['end_h'], r['to']), best(ff, r['map']), best(sh, r['map'])] for r in mm])
    print('#### The XP table (levels.xp_total) and where each level lands\n')
    fx = P['xp']['fight_xp']; got = model_xp_total(); gs = num(P['clock']['gate_at_share'])
    rows = []
    for L in range(2, 21):
        w = P['levels']['lands'][str(L)]; v = ms[int(num(w['map']))]; s0, e0 = num(v['start_h']), num(v['end_h'])
        rows.append([L, 'map %s, its %s' % (w['map'], w['at']), fmt(s0 + (e0 - s0) * gs if w['at'] == 'gate' else e0, 1), fmt(got[L] - got[L - 1]), fmt(P['levels']['xp_total'][str(L)]),
                     fmt(data('rules.json')['character']['levels']['xp_total'][str(L)]), fmt(nice2(num(fx['at_1']) * num(fx['per_level']) ** (L - 1)))])
    table(['level', 'lands as this falls', 'hour (solo)', 'XP for it', 'xp_total', 'xp_total today', 'fight_xp at this level'], rows)
    print('#### Door Mark thresholds (one formula: units a worthy fight x the worthy fights walked by hours %s: %s fights)\n'
          % (P['door_marks_hours'], ', '.join('%.1f' % fb(num(h)) for h in P['door_marks_hours'])))
    table(['door', 'unit', 'units a worthy fight', 'Mark I', 'Mark II', 'middle', 'Mark III'],
          [[d, v['unit'], fmt(num(v['units_per_fight']), 1)] + [fmt(x) for x in door_mark_thresholds(d)] for d, v in P['door_marks'].items() if isinstance(v, dict)])
    dv = P['tracks']['devotion']; rt = P['clock']['route']; wf = num(rt['worthy_fights'])
    per = numf(B.raw['pacing']['tracks']['devotion']['per_fight'])
    def hour_at(units, rate):
        h = 0.0
        while h < 80 and rate * fb(h) < units: h = round(h + 0.05, 2)
        return h
    print("#### Devotion from 0 (%.2f XP a worthy fight: the tags, and a rest's and the shrine's rites spread over the map)\n" % per)
    table(['standing'] + [str(i + 1) for i in range(10)], [['hour'] + [fmt(hour_at(num(t), per), 1) for t in dv['thresholds']]])
    cr = P['credits']; rows = []
    for r in mm:
        tot = credits_of_map(r['map'])
        rows.append([r['map'], fmt(r['to'], 1), fmt(tot), fmt(tot / (r['to'] - r['from']))])
    print('#### Credits a map, a character (survival.json credits, unchanged)\n')
    table(['map', 'ends at hour', 'credits a map', 'an hour'], rows)
    gp = data('rules.json')['rarity']; fl = cr['grade_step']['floors']; pl = cr['grade_step']['place']
    def step(price, frm, to, place): return max(num(fl[to]), price * (gp[to]['price'] - gp[frm]['price'])) * num(pl[place])
    print("#### The one grade-step price at a Forge: max(the step's floor, priceOf(to) - priceOf(from)) x the place\n")
    table(['item price', 'to Fine', 'to Masterwork', 'to Relic', 're-forge'], [[fmt(b), fmt(step(b, 'standard', 'fine', 'forge')), fmt(step(b, 'fine', 'masterwork', 'forge')),
          fmt(step(b, 'masterwork', 'relic', 'forge')), fmt(num(fl['relic']) * num(pl['forge']))] for b in (100, 750, 2000, 4500, 8000)])
    print('#### Co-op (ruling 37): the hours by squad size; party_pace multiplies practice and Devotion, never XP\n')
    pp = P['xp']['party_pace']['by_squad']; solo = model_maps(1)
    table(['squad', 'map 5 ends (h)', 'map 14 ends, level 20 (h)', 'x solo', 'party_pace'],
          [[n, fmt(model_maps(n)[4]['to'], 1), fmt(model_maps(n)[13]['to'], 1), '%.2f' % (model_maps(n)[13]['to'] / solo[13]['to']), pp[n - 1]] for n in (1, 2, 3, 4)])
def t_budget():
    if not B.has('world'): print('WAITING: world.json\n'); return
    W = B.get('world'); bd = W['budget']; tiers = W['tiers']; lf = num(bd['lag_factor'])
    dref = lambda v: data_ref(v['data']) if isinstance(v, dict) and 'data' in v else v
    share = dref(bd['share']); ppc = dref(bd['pressure_per_char'])
    print("#### Cost factor by foe level minus the squad's (lag_factor %s)\n" % fmt(lf, 2))
    table(['foe - squad'] + [str(g) for g in range(-5, 6)], [['x cost'] + ['%.2f' % (lf ** (-g)) for g in range(-5, 6)]])
    print('#### The room by squad and difficulty (bulk / pressure, SE)\n')
    rows = []
    for k, d in bd['by_difficulty'].items():
        r = [k, fmt(num(d['rounds']), 1), d['pressure_kind']]
        for n in bd['squads']:
            r.append('%.2f / %.2f' % (num(bd['bulk_per_char_round']) * n * num(d['rounds']), num(ppc[n - 1]) * n * num(d['pressure_kind'])))
        rows.append(r)
    table(['difficulty', 'rounds', 'pressure_kind'] + ['squad of %d' % n for n in bd['squads']], rows)
    print("#### A lone Elite or Boss of the squad's level against its room (bulk; 'alone' when it fills the room's band: ruling 38)\n")
    band = num(bd['bulk_band']); rows = []
    for t, kind in (('elite', 'hard'), ('boss', 'deadly'), ('boss', 'final')):
        r = ['%s in the %s room' % (t, kind)]
        for n in bd['squads']:
            room = num(bd['bulk_per_char_round']) * n * num(bd['by_difficulty'][kind]['rounds']); cost = num(tiers[t]['bulk']) * num(share[t]['hp'][n - 1])
            r.append('%.2f of %.2f%s' % (cost, room, ' (alone)' if cost >= room * (1 - band) else ''))
        rows.append(r)
    table(['foe'] + ['squad of %d' % n for n in bd['squads']], rows)

def t_squad():
    print("#### The squad's one mark and one gift (ruling 41: scale.stack.squad; the best of each counts on a hit)\n")
    table(['kind', 'name', 'damage share', 'to hit'], [[k, n, '+%d%%' % round(100 * dm), '+%s' % fmt(th)] for k in ('mark', 'gift') for n, dm, th in squad_items(k) if n != 'none'])
def t_costs():
    ds, _ = doors()
    print('#### What a caster carries and spends over one standard fight (ruling 49: scale.costs.fight_check, check (h))\n')
    rows = []
    for d in ds:
        if 'resource_use' not in d.d: continue
        for L, n, car, one, press, _sy in cost_rows(d):
            rows.append([d.id, d.d['resource_use']['res'], L, n, fmt(car, 1), fmt(one, 1), '%.1f' % (car / one if one else 0), fmt(press, 1)])
    table(['door', 'resource', 'level', 'units', 'carries', 'one full cash-out', 'cash-outs carried', 'everything, every turn'], rows)

TABLES = collections.OrderedDict([('factor', t_factor), ('weapons', t_weapons), ('columns', t_columns), ('profiles', t_profiles), ('hp', t_hp), ('mp', t_mp),
                                  ('plate', t_plate), ('grades', t_grades), ('margins', t_margins), ('caps', t_caps), ('doors', t_doors), ('hits', t_hits),
                                  ('spend', t_spend), ('calendar', t_calendar), ('pacing', t_pacing), ('budget', t_budget), ('squad', t_squad), ('costs', t_costs)])
SCALE_TABLES = ['factor', 'weapons', 'columns', 'profiles', 'hp', 'mp', 'plate', 'grades', 'margins', 'caps']

def export_scale():
    """`--export-scale`: the readings step 1's proving test compares the engine with (09-build-order step 1): every door's
    plain hit at level 1 (7/7, Standard and Fine) and at level 20 (10/10, Relic and Celestial), the weapon it is, and
    character HP. Read only; it prints JSON."""
    ds, _ = doors(); dg = S.s['digits']; l1, l20 = dg['l1_specialist'], dg['l20_specialist']
    A1, S1 = num(l1['attribute']), num(l1['skill']); out = {'doors': {}, 'hp': []}
    for d in ds:
        ref = d.d['plain']
        out['doors'][d.id] = {'weapon': ref.get('weapon'), 'profile': plain_profile(d), 'l1': {g: d.plain(1, A1, S1, g) for g in l1['grades']},
                              'l20': {g: d.plain(20, 10, 10, g) for g in l20['grades']}, 'l1_points': A1}
    for e in (1, 4, 7, 10):
        for pt in (0, 5, 10):
            for L in (1, 5, 10, 15, 20): out['hp'].append({'level': L, 'endurance': e, 'pain_threshold': pt, 'hp': S.hp(L, e, pt)})
    print(json.dumps(out, indent=1))

def main(argv):
    if '--export-scale' in argv: export_scale(); return 0
    if '--tables' in argv:
        if S is None: print('WAITING: scale.json does not load: %s' % B.errors); return 0
        want = [a for a in argv if a != '--tables']
        if want == ['scale']: want = SCALE_TABLES
        for name in (want or list(TABLES)):
            try: TABLES[name]()
            except (Waiting, RefError) as e: print('WAITING or FAILED (%s): %r\n' % (name, e))
        return 0
    print('The growth bible checker: %s present; %s waiting\n' % (', '.join(f for f in FILES if f in B.present) or 'nothing', ', '.join(f for f in FILES if f not in B.present) or 'nothing'))
    check_refs(); check_digits(); check_hits(); check_ladders(); check_spend(); check_hours(); check_clock(); check_costs(); check_worth(); check_solo(); check_migration()
    c = collections.Counter(s for _, s, _ in RESULTS)
    print('\n%d PASS, %d FAIL, %d WAITING (and %d REPORT, %d NOTE for the lead: readings, never failures; rulings 51 and I)' % (c['PASS'], c['FAIL'], c['WAITING'], c['REPORT'], c['NOTE']))
    return 1 if c['FAIL'] else 0

if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
