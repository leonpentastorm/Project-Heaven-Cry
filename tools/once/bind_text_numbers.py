"""The binder of 12 Nov 2026 (docs/design/handoffs/text-number-truth.md, 8.a): binds the bare numbers of data texts to
the item's own fields where exactly one field fits (same unit; for a unitless number, a word of the field's name, op,
stat or skill near the number). Run from the repo root after adding fields: python3 tools/once/bind_text_numbers.py,
then python3 tools/validate.py data --shrink-text-baseline. READ what it bound (git diff data): a field that fits by
coincidence renders right today and follows the wrong number tomorrow; put such a key in NEVER."""
import sys, re, json, collections
sys.path.insert(0, 'tools'); sys.path.insert(0, __file__.rsplit('/', 1)[0] if '/' in __file__ else '.')
import text_numbers as TN
from jsonedit import Pack

FILES = ['calls', 'classes', 'conditions', 'feelings', 'items', 'objects', 'patrons', 'perks', 'sigils', 'skills', 'soul_modules', 'techniques', 'traits', 'weapons', 'world_play']
EXCL = {'number', 'slot', 'level', 'tier', 'rank', 'price_credits', 'price', 'weight_kg', 'durability', 'mod_slots', 'mastery', 'threshold', 'batch', 'hands', 'accuracy', 'min', 'max_per_character', 'order', 'x', 'y', 'w', 'h'}
PROSEKEYS = TN.TEXT_KEYS | {'flavour', 'lore', 'note', 'notes', 'name', 'summary', 'narrator_hook', 'deed', 'tagline'}

def klass_of_name(name):
    n = str(name).lower()
    if re.search(r'(^|[_:])ap($|[_:])', n): return 'ap'
    if re.search(r'(^|_)mp($|_)', n): return 'mp'
    if re.search(r'round|duration|turn|cooldown', n): return 'time'
    if re.search(r'range|tile|radius|reach|push|move|within|area|dist', n): return 'dist'
    return None

GENERIC = {'value', 'effects', 'effect', 'numbers', 'tiers', 'grants', 'lines', 'steps', 'stat', 'mod', 'bonus', 'the', 'per', 'self', 'target', 'any', 'context', 'when', 'you', 'your', 'and', 'for', 'with', 'from', 'that', 'this', 'each', 'all', 'one', 'not', 'own', 'base', 'max', 'min', 'pct', 'mult', 'skill', 'action', 'condition', 'apply', 'state', 'narrator', 'grant', 'add', 'set', 'use', 'uses', 'turn', 'round', 'limit', 'cap', 'combat', 'enemy', 'enemies', 'ally', 'allies', 'attack', 'attacks', 'vs', 'more', 'less', 'next', 'first', 'while', 'have', 'has', 'are', 'can', 'its', 'their', 'who', 'what', 'out', 'take', 'takes'}
def stems(text):
    return {w[:5] for w in re.findall(r'[a-z]{3,}', str(text).lower().replace('_', ' ')) if w not in GENERIC}
def words_of(node, path):
    ws = set()
    for part in path.split('.'):
        if not part.isdigit(): ws |= stems(part)
    last = path.split('.')[-1]
    if 'mult' in last: ws.add('mult')
    if 'pct' in last or 'percent' in last: ws.add('pct')
    for k in ('op', 'stat', 'skill', 'resource', 'condition', 'action', 'context', 'family', 'when', 'apply', 'tag', 'state', 'what', 'to', 'target'):
        if isinstance(node.get(k), str): ws |= stems(node[k])
    return ws

def leaves(node, path='', top=True, parent=None):
    """(path, value, class, signature) for the numeric leaves of an item."""
    if isinstance(node, dict):
        if not top and isinstance(node.get('id'), (str, int)): return
        for k, v in node.items():
            p = f'{path}.{k}' if path else k
            if k in EXCL or k in PROSEKEYS or k == 'requires': continue
            if isinstance(v, bool) or v is None or isinstance(v, str): continue
            if isinstance(v, (int, float)):
                kl = klass_of_name(k)
                if kl is None and k in ('value', 'n', 'amount', 'set'):
                    for sib in ('stat', 'resource', 'action'):
                        if isinstance(node.get(sib), str): kl = klass_of_name(node[sib]) or kl
                sig = (k, node.get('op'), node.get('stat'), node.get('resource'))
                yield p, v, kl or 'other', sig, words_of(node, p)
            else:
                yield from leaves(v, p, False, node)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            p = f'{path}.{i}'
            if isinstance(v, (int, float)) and not isinstance(v, bool): continue  # a bare list of numbers: no name to bind to
            if not isinstance(v, str): yield from leaves(v, p, False, node)

AFTER = re.compile(r'^\s*(AP\b|MP\b|rounds?\b|turns?\b|tiles?\b)')
def klass_of_token(text, end):
    m = AFTER.match(text[end:end + 12])
    if not m: return 'other'
    w = m.group(1)
    return 'ap' if w == 'AP' else 'mp' if w == 'MP' else 'time' if w[0] in 'rt' and not w.startswith('tile') else 'dist'

def forms(v, n, pct):
    out = []
    if abs(abs(v) - n) < 1e-9: out.append('' if v >= 0 else 'abs')
    if pct:
        if abs(v * 100 - n) < 1e-9 and 0 < v < 1: out.append('pct')
        if v > 1 and abs((v - 1) * 100 - n) < 1e-9: out.append('more')
        if 0 < v < 1 and abs((1 - v) * 100 - n) < 1e-9 and 'pct' not in out: out.append('less')
    return out

# (file, the item's own id, the words right before the number): coincidences found by eye, never bound
NEVER = {('skills', 'analysis', 'Analyze costs '), ('classes', 'foundation', 'Keystone cost '), ('traits', 'squad_anchor', 'move more than ')}
stats = collections.Counter(); left = collections.Counter()
for stem in FILES:
    P = Pack(f'data/{stem}.json')
    for chain, item in TN.items(P.d):
        L = list(leaves(item))
        if not L: continue
        for holder, key, path, s in list(TN.strings(item)):
            if not TN.is_text(path): continue
            masked = TN.REF.sub(lambda m: ' ' * len(m.group(0)), TN.PH.sub(lambda m: ' ' * len(m.group(0)), s))
            tier = re.match(r'(tiers\.[^.]+)\.', path)
            out, last = [], 0
            for m in TN.TOKEN.finditer(masked):
                n, pct = float(m.group(2)), bool(m.group(3))
                if any(a == stem and b == chain[-1] and s[:m.start(2)].endswith(c) for a, b, c in NEVER): continue
                tk = klass_of_token(masked, m.end(2))
                near = stems(masked[max(0, m.start() - 25):m.start()] + ' ' + masked[m.end():m.end() + 32]) | ({'mult'} if m.group(1) else set()) | ({'pct', 'perce'} if pct else set())
                cands = []
                for p, v, kl, sig, ws in L:
                    if kl != tk: continue
                    if tk == 'other' and not (ws & near): continue
                    for how in forms(v, n, pct):
                        if TN.fmt(v, how) == m.group(2): cands.append((p, how, sig)); break
                if tier:
                    same = [c for c in cands if c[0].startswith(tier.group(1) + '.')]
                    cands = same or [c for c in cands if not c[0].startswith('tiers.')]
                else:
                    flat = [c for c in cands if not c[0].startswith('tiers.')]
                    cands = flat or cands
                    if not flat and path == 'text' and 'tiers' in item: cands = []  # the combined "I: ... II: ..." text: which tier is not knowable here
                ok = len(cands) == 1 or (len(cands) > 1 and len({(c[1], c[2]) for c in cands}) == 1)
                if not ok:
                    left['ambiguous' if cands else 'no field'] += 1; continue
                p, how, _ = cands[0]
                out.append(s[last:m.start(2)] + '{=' + p + ('|' + how if how else '') + '}'); last = m.end(2); stats[stem] += 1
            if not out: continue
            new = ''.join(out) + s[last:]
            assert TN.render(new, item, holder) == TN.render(s, item, holder), (stem, chain, path, new, s)
            holder[key] = new
    P.save()
print('bound', sum(stats.values()), dict(stats)); print('left', dict(left))
