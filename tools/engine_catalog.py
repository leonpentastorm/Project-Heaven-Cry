#!/usr/bin/env python3
"""THE ENGINE'S EXTENSION POINTS, GENERATED: writes docs/ENGINE-HOOKS.md from the engine's source and data.

    python3 tools/engine_catalog.py           write docs/ENGINE-HOOKS.md
    python3 tools/engine_catalog.py --check   exit 1 when the file on disk differs from what would be written
                                              (npm run check runs this as the line "engine hooks")

Nothing in the catalogue is typed here. Every name, signature and line of description is read from the code and the
data: a description is the doc comment above the name in its source file (or its `about` in a declared table). Where a
name has no comment, the catalogue says so, and the fix is a one-line comment IN THE SOURCE, never a line in this tool.
A list that cannot be read reliably from TypeScript is declared as data in the source (an exported const table:
HOOK_ABOUT in effects/types.ts, STATS / COST_SITE_IDS in effects/stats.ts, SCOPES in effects/uses.ts) or comes from
data/*.json (item_ops in data/effect_ops.json, held equal to effects/triggers.ts by test/item-ops.test.ts).

The parsing helpers here (exports_of, known_names) are shared with tools/built_from.py. Standard library only.
"""
import json, os, re, sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = 'packages/engine/src'
OUT = 'docs/ENGINE-HOOKS.md'


def read(rel):
    with open(os.path.join(ROOT, rel), encoding='utf-8') as f: return f.read()


def jload(rel): return json.loads(read(rel))


def ts_files(base=SRC):
    out = []
    for d, _, fs in os.walk(os.path.join(ROOT, base)):
        for f in fs:
            if f.endswith('.ts') and not f.endswith('.d.ts'): out.append(os.path.relpath(os.path.join(d, f), ROOT).replace(os.sep, '/'))
    return sorted(out)


def short(rel): return rel[len(SRC) + 1:] if rel.startswith(SRC + '/') else rel


def blank_comments(text):
    """The code with comments blanked to spaces (same length, same line numbers), as the lint tests do."""
    text = re.sub(r'/\*[\s\S]*?\*/', lambda m: re.sub(r'[^\n]', ' ', m.group(0)), text)
    return re.sub(r"(^|[^:'\"`\\])//[^\n]*", lambda m: m.group(1) + ' ' * (len(m.group(0)) - len(m.group(1))), text, flags=re.M)


def match_close(s, i):
    """Index of the bracket closing the one at s[i] (strings skipped)."""
    pairs = {'(': ')', '{': '}', '[': ']', '<': '>'}
    stack, j, n = [], i, len(s)
    while j < n:
        c = s[j]
        if c in '\'"`':
            q = c; j += 1
            while j < n and s[j] != q:
                if s[j] == '\\': j += 1
                j += 1
        elif c in '({[':
            stack.append(pairs[c])
        elif c in ')}]':
            if stack and stack[-1] == c: stack.pop()
            if not stack: return j
        j += 1
    return n - 1


def squash(s, n=170):
    s = re.sub(r'\s+', ' ', s).strip()
    return s if len(s) <= n else s[:n - 1].rstrip() + '…'


def first_sentence(doc, n=210):
    doc = re.sub(r'\s+', ' ', doc).strip()
    m = re.search(r'(?<=[a-z0-9)\'"`])\.\s+(?=[A-Z0-9(`\'"])', doc)
    if m and m.start() >= 15: doc = doc[:m.start() + 1]
    return squash(doc, n)


def doc_above(lines, i):
    """The doc comment that ends on the line above line i (a /** */ block or a run of // lines), or ''."""
    j = i - 1
    if j < 0: return ''
    if lines[j].rstrip().endswith('*/'):
        k = j
        while k >= 0 and '/*' not in lines[k]: k -= 1
        if k < 0: return ''
        body = '\n'.join(lines[k:j + 1])
        body = re.sub(r'^\s*/\*\*?', '', body); body = re.sub(r'\*/\s*$', '', body)
        return re.sub(r'^\s*\*\s?', '', body, flags=re.M).strip()
    run = []
    while j >= 0 and lines[j].lstrip().startswith('//'):
        run.insert(0, re.sub(r'^\s*//\s?', '', lines[j])); j -= 1
    return ' '.join(run).strip()


def trailing_comment(line):
    m = re.search(r"(?<![:'\"`\\])//\s?(.*)$", line)
    return m.group(1).strip() if m else ''


EXPORT_RE = re.compile(r'^export (?:declare )?(?:async )?(function\*?|const|let|interface|type|class|enum) (\w+)')


def exports_of(rel):
    """Every top-level export of a TypeScript file: {name, kind, sig, doc, line, file}."""
    text = read(rel); code = blank_comments(text); lines = text.split('\n'); out = []
    offs = [0]
    for l in lines: offs.append(offs[-1] + len(l) + 1)
    for i, l in enumerate(lines):
        m = EXPORT_RE.match(l)
        if not m: continue
        kind, name = m.group(1).rstrip('*'), m.group(2)
        doc = doc_above(lines, i) or trailing_comment(l)
        at = offs[i] + m.end(); sig = ''
        if kind == 'function':
            p = code.find('(', at); q = match_close(code, p)
            gen = text[at:p]
            sig = name + gen + text[p:q + 1] + ret_type(code, q + 1, '{')
        elif kind in ('const', 'let'):
            rest = text[at:at + 600]
            fm = re.match(r'\s*=\s*(?:async\s*)?(<[^>]*>\s*)?\(', rest)
            if fm:
                p = at + fm.end() - 1; q = match_close(code, p)
                sig = name + text[p:q + 1] + ret_type(code, q + 1, '=>')
            else:
                tm = re.match(r'\s*:\s*([^=]+?)\s*=', rest)
                sig = name + (': ' + tm.group(1) if tm else '')
        elif kind == 'interface':
            sig = 'interface ' + name + ' { ' + ', '.join(f['name'] for f in interface_fields(text, offs[i])) + ' }'
        elif kind == 'type':
            tm = re.match(r'([^=]*)=\s*([^;]+)', text[at:at + 400])
            sig = 'type ' + name + (tm.group(1).strip() if tm else '') + ' = ' + (tm.group(2) if tm else '')
        else:
            sig = kind + ' ' + name
        out.append({'name': name, 'kind': kind, 'sig': squash(sig), 'doc': doc, 'line': i + 1, 'file': rel})
    return out


def ret_type(code, i, until):
    """The `: Type` after a parameter list at code[i], up to the body (`{` or `=>` at depth 0), or ''."""
    m = re.match(r'\s*:\s*', code[i:i + 20])
    if not m: return ''
    j = i + m.end(); depth = 0; start = j
    while j < len(code) and j - start < 400:
        if code.startswith('=>', j):
            if depth == 0 and until == '=>': break
            j += 2; continue
        c = code[j]
        if c in '({[<':
            if c == '{' and depth == 0 and until == '{' and code[start:j].strip() and code[start:j].rstrip()[-1] not in '|&:,<(': break
            depth += 1
        elif c in ')}]>' and depth: depth -= 1
        j += 1
    return ': ' + code[start:j].strip()


def interface_fields(text, start):
    """The fields of the interface whose `export interface` starts at `start`: [{name, type, doc}]."""
    b = text.find('{', start); e = match_close(blank_comments(text), b); body = text[b + 1:e]
    out, i, n, doc = [], 0, len(body), ''
    while i < n:
        if body.startswith('/*', i):
            j = body.find('*/', i); raw = body[i + 2:j]
            doc = re.sub(r'^\s*\*\s?', '', raw.lstrip('*'), flags=re.M).strip(); i = j + 2; continue
        if body.startswith('//', i):
            j = body.find('\n', i); j = n if j < 0 else j
            if not doc: doc = body[i + 2:j].strip()
            i = j; continue
        m = re.compile(r'\s*(readonly\s+)?([A-Za-z_$][\w$]*|\[[^\]]+\])(\??)\s*(\(|:)').match(body, i)
        if not m:
            i += 1; continue
        # the field runs to the next ; or newline at depth 0
        j = m.end(); depth = 0
        while j < n:
            c = body[j]
            if c == '=' and body.startswith('=>', j): j += 2; continue
            if c in '({[<': depth += 1
            elif c in ')}]>' and depth: depth -= 1
            elif c in ';\n,' and depth == 0: break
            elif c in '\'"`':
                q = c; j += 1
                while j < n and body[j] != q: j += 1
            j += 1
        out.append({'name': m.group(2), 'type': squash(body[m.end() - 1:j].lstrip(':').strip(), 90), 'doc': doc})
        doc = ''; i = j + 1
    return out


def object_table(rel, const, fields=None):
    """A declared table in the source: `export const NAME[: T] = { key: 'about', … }` (fields=None) or
    `{ key: { f: 'v', … }, … }`. Returns [(key, value)] in source order."""
    text = read(rel)
    m = re.search(r'^export const ' + const + r'\b[^=]*=\s*\{', text, re.M)
    if not m: raise SystemExit('engine_catalog: ' + rel + ' has no `export const ' + const + '`')
    b = m.end() - 1; body = blank_comments(text)[b + 1:match_close(blank_comments(text), b)]
    s = r"'((?:[^'\\]|\\.)*)'"
    if fields is None:
        return [(k, v.replace("\\'", "'")) for k, v in re.findall(r"(?:^|[\s,{])'?([\w:]+)'?\s*:\s*" + s, body)]
    out = []
    for k, inner in re.findall(r"(?:^|[\s,])(\w+)\s*:\s*\{([^{}]*)\}", body):
        out.append((k, {f: v.replace("\\'", "'") for f, v in re.findall(r"(\w+)\s*:\s*" + s, inner)}))
    return out


def const_list(rel, const):
    text = blank_comments(read(rel))
    m = re.search(r'^export const ' + const + r'\b[^=]*=\s*\[', text, re.M)
    b = m.end() - 1
    return re.findall(r"'([\w:]+)'", text[b:match_close(text, b)])


# ------------------------------------------------------------------------------------------------ data examples
def data_items():
    """(path, item id, item) for every item with an id in data/*.json (campaigns left out)."""
    out = []
    for f in sorted(os.listdir(os.path.join(ROOT, 'data'))):
        if not f.endswith('.json'): continue
        try: d = jload('data/' + f)
        except Exception: continue

        def walk(x, owner):
            if isinstance(x, dict):
                if isinstance(x.get('id'), str): owner = x['id']; out.append((f, owner, x))
                for v in x.values(): walk(v, owner)
            elif isinstance(x, list):
                for v in x: walk(v, owner)
        walk(d, None)
    return out


def effects_with(pred):
    """The first data item (file, id) holding an effect dict for which pred(effect) holds, scanning items in order."""
    found = {}

    def walk(x, f, owner):
        if isinstance(x, dict):
            if isinstance(x.get('id'), str): owner = x['id']
            for key in pred(x): found.setdefault(key, (f, owner))
            for v in x.values(): walk(v, f, owner)
        elif isinstance(x, list):
            for v in x: walk(v, f, owner)
    for f in sorted(os.listdir(os.path.join(ROOT, 'data'))):
        if f.endswith('.json') and f != 'effect_ops.json':
            try: walk(jload('data/' + f), f, None)
            except Exception: pass
    return found


def ex(found, key):
    v = found.get(key)
    return '`' + v[1] + '` (' + v[0] + ')' if v else 'none yet'


# ------------------------------------------------------------------------------------------------ the sections
def H(level, title): return '#' * level + ' ' + title + '\n\n'


def md_table(head, rows):
    esc = lambda c: str(c).replace('|', '\\|').replace('\n', ' ')
    return '\n'.join(['| ' + ' | '.join(head) + ' |', '| ' + ' | '.join('---' for _ in head) + ' |'] + ['| ' + ' | '.join(esc(c) for c in r) + ' |' for r in rows]) + '\n'


MISSING = []


def about(e, where):
    if e['doc']: return first_sentence(e['doc'])
    MISSING.append(where + ' ' + e['name']); return '**(no doc comment: add one in the source)**'


def section_a():
    io = jload('data/effect_ops.json')['item_ops']
    trig, pred, ops = io['triggers'], io['predicates'], io['ops']
    when = effects_with(lambda e: [e['when']] if isinstance(e.get('when'), str) and e['when'] in trig else [])
    ifs = effects_with(lambda e: list(e['if'].keys()) if isinstance(e.get('when'), str) and e['when'] in trig and isinstance(e.get('if'), dict) else [])
    opx = effects_with(lambda e: ([e.get('op')] + [a.get('op') for a in e.get('and', []) if isinstance(a, dict)]) if isinstance(e.get('when'), str) and e['when'] in trig else [])
    out = [H(2, '(a) Item ops: the closed lists'),
           'An item whose behaviour is "when X, if Y, do Z, at most N per scope" is DATA: `{op, when, if, limit, and, say}` in its `effects`, '
           'run by `runTriggered` (`effects/triggers.ts`). Source of these tables: `data/effect_ops.json` `item_ops` (held equal to '
           '`TRIGGERS`, `PREDICATES` and `OPS` in `effects/triggers.ts` by `test/item-ops.test.ts`; rewrite it with '
           '`ITEM_OPS_WRITE=1 npx vitest run --root packages/engine test/item-ops`).\n',
           H(3, f'Triggers ({len(trig)})'),
           md_table(['trigger', 'hook (phase)', 'whose event', 'what for', 'example item'],
                    [['`' + k + '`', '`' + v['hook'] + '`' + (' (' + v['phase'] + ')' if v.get('phase') else ''), v.get('self') or 'anyone', v['about'], ex(when, k)] for k, v in trig.items()]),
           '\n' + H(3, f'Predicates ({len(pred)}): the keys of `if`'),
           md_table(['predicate', 'takes', 'what it tests', 'example item'], [['`' + k + '`', v['arg'], v['about'], ex(ifs, k)] for k, v in pred.items()]),
           '\n' + H(3, f'Ops ({len(ops)})'),
           md_table(['op', 'runs on', 'fields', 'changes state', 'what it does', 'example item'],
                    [['`' + k + '`', 'any trigger' if set(v['on']) >= set(trig) else ', '.join('`' + t + '`' for t in v['on']), ', '.join('`' + f + '`' for f in v['fields']) or '(none)',
                      'yes' if v.get('changes_state') else 'no', v['about'], ex(opx, k)] for k, v in ops.items()]),
           '\n' + H(3, 'Limits and scopes'),
           '`limit` is `{per, n, key?, each?, peek?}` or `{cooldown}`; `per` is one of ' + ', '.join('`' + s + '`' for s in io['limit_scopes'])
           + ' (`LIMIT_SCOPES`, `effects/triggers.ts`). In code every limit is `uses(h)` (`effects/uses.ts`); its scopes, one row each (`SCOPES`):\n\n',
           md_table(['scope', 'fresh again when', 'cells live (fight / area map)'], [['`' + k + '`', v.get('fresh', ''), v.get('fight', '') + ' / ' + v.get('map', '')] for k, v in object_table(SRC + '/effects/uses.ts', 'SCOPES', fields=True)])]
    # the data effect ops (no `when`): the core registry
    reg = jload('data/effect_ops.json')['items']
    core = [x for x in reg if x.get('tier') != 'bespoke']
    out += ['\n' + H(3, f'Data effect ops ({len(core)} engine-run; {len(reg) - len(core)} bespoke ones are per-item and not listed)'),
            'An effect with no trigger `when` is one of these (`data/effect_ops.json` `items`). An op the engine does not recognise goes to the Narrator with the item\'s text.\n\n',
            md_table(['op', 'tier', 'fields', 'what it does', 'example item'],
                     [['`' + x['id'] + '`', x.get('tier', ''), ', '.join('`' + p + '`' for p in x.get('params', [])), x.get('summary', ''), '`' + x['used_by'][0] + '`' if x.get('used_by') else 'none yet'] for x in core])]
    return ''.join(out), {'triggers': len(trig), 'predicates': len(pred), 'ops': len(ops), 'effect ops': len(core)}


EMIT_RE = re.compile(r"\b(emit|emitHook|emitOwn|emitStory)\(\s*([^,]{1,40}?),\s*'([a-z_]+)'\s*,\s*")


def ctx_keys(code, i):
    """The top-level keys of the object literal starting at code[i] ('{'), or None for a variable."""
    if i >= len(code) or code[i] != '{': return None
    body = code[i + 1:match_close(code, i)]
    keys, depth, tok, j = [], 0, '', 0
    parts, cur = [], ''
    while j < len(body):
        c = body[j]
        if c in '\'"`':
            q = c; k = j + 1
            while k < len(body) and body[k] != q:
                if body[k] == '\\': k += 1
                k += 1
            cur += body[j:k + 1]; j = k + 1; continue
        if c in '({[': depth += 1
        elif c in ')}]': depth -= 1
        if c == ',' and depth == 0: parts.append(cur); cur = ''
        else: cur += c
        j += 1
    parts.append(cur)
    for p in parts:
        p = p.strip()
        if not p: continue
        if p.startswith('...'):
            inner = re.findall(r'\{\s*(\w+)\s*:', p); keys += inner; continue
        m = re.match(r'(\w+)\s*(:|$)', p)
        if m: keys.append(m.group(1))
    return keys


def section_b():
    hooks = object_table(SRC + '/effects/types.ts', 'HOOK_ABOUT')
    names = [k for k, _ in hooks]
    sites, fields = {}, {}
    listen = {}
    for rel in ts_files():
        text = read(rel); code = blank_comments(text)
        for m in EMIT_RE.finditer(code):
            n = m.group(3); line = code.count('\n', 0, m.start()) + 1
            sites.setdefault(n, []).append(short(rel) + ':' + str(line))
            ks = ctx_keys(code, m.end())
            if ks is None:  # a payload in a variable: the object literal it was built from, above in the same file
                v = re.match(r'(\w+)\s*\)', code[m.end():m.end() + 40])
                if v:
                    defs = list(re.finditer(r'\b(?:const|let)\s+' + v.group(1) + r'\b[^=;\n]*=\s*(?:\{|[^;\n]*?\{\s*\.\.\.)', code[max(0, m.start() - 4000):m.start()]))
                    if defs:
                        d0 = max(0, m.start() - 4000) + defs[-1].end() - 1
                        while code[d0] != '{': d0 -= 1
                        ks = ctx_keys(code, d0)
            fields.setdefault(n, [])
            for k in (ks or []):
                if k not in fields[n] and k not in ('cb', 'g', 'rng'): fields[n].append(k)
        for m in re.finditer(r"\bon(?:Story)?Hook\('([a-z_]+)'", code):
            listen.setdefault(m.group(1), []).append(short(rel) + ':' + str(code.count('\n', 0, m.start()) + 1))
        for m in re.finditer(r"(?<![\w.'])([a-z_]+)\s*:\s*\(\s*_?(?:ctx|c|_c)?\s*(?::\s*any)?\s*,\s*_?h\b", code):
            if m.group(1) in names: listen.setdefault(m.group(1), []).append(short(rel) + ':' + str(code.count('\n', 0, m.start()) + 1))
    trig = jload('data/effect_ops.json')['item_ops']['triggers']
    by_hook = {}
    for t, v in trig.items(): by_hook.setdefault(v['hook'], []).append(t)
    rows = []
    for n, a in hooks:
        s = sites.get(n, []); l = listen.get(n, [])
        rows.append(['`' + n + '`', a, ', '.join('`' + f + '`' for f in fields.get(n, [])) or ('(a payload built elsewhere)' if s else ''),
                     (s[0] + (f' (+{len(s) - 1})' if len(s) > 1 else '')) if s else '**never emitted**',
                     (l[0] + (f' (+{len(l) - 1})' if len(l) > 1 else '')) if l else 'none',
                     ', '.join('`' + t + '`' for t in by_hook.get(n, []))])
    out = [H(2, '(b) The hook bus'),
           'A hook is heard by an item handler (`on: { <hook>: (ctx, h) => … }`), by an engine system (`onHook(name, fn)`, '
           '`onStoryHook`), or by a data item through an item-op trigger (last column). It is fired by `emit(cb, name, ctx)` '
           '(fights), `emitOwn(u, …)` (one unit\'s items) or `emitStory(g, …)` (the story and the area map), all in '
           '`effects/hooks.ts`. The description is `HOOK_ABOUT` in `effects/types.ts`; the payload\'s fields are read from the '
           'emit sites (`cb`, `g` and `rng` are on most and left out). A hook marked "never emitted" is declared and silent.\n\n',
           f'{len(names)} hooks.\n\n',
           md_table(['hook', 'what for', 'payload fields', 'fired at', 'heard at (first)', 'item-op trigger'], rows)]
    silent = [n for n in names if n not in sites]
    return ''.join(out), {'hooks': len(names), 'never emitted': len(silent)}


def export_table(rel, only=None, title=None):
    ex_ = [e for e in exports_of(rel) if only is None or e['name'] in only]
    rows = [['`' + e['name'] + '`', '`' + e['sig'] + '`', about(e, short(rel))] for e in ex_]
    return f'#### {title or short(rel)} (`{short(rel)}`)\n\n' + md_table(['name', 'signature or shape', 'what for'], rows) + '\n', len(rows)


PRIMITIVE_FILES = [
    # (file, only these names or None for every export, heading)
    (SRC + '/effects/triggers.ts', None, 'The item-ops runner'),
    (SRC + '/effects/output.ts', None, 'The damage, heal and shield formula'),
    (SRC + '/effects/damage.ts', ['applyDamage', 'healUnit', 'grantShield', 'DamageSrc', 'DamageResult', 'pastShields', 'hostileSrc'], 'The damage, heal and shield sinks (called by deal and mend)'),
    (SRC + '/effects/amounts.ts', None, 'Amount blocks'),
    (SRC + '/effects/cost.ts', None, 'Prices, payments and refunds'),
    (SRC + '/effects/ap.ts', None, 'AP grants'),
    (SRC + '/effects/uses.ts', None, 'Limits, cooldowns and counters'),
    (SRC + '/effects/num.ts', None, 'An item\'s own numbers'),
    (SRC + '/effects/hooks.ts', None, 'The hook bus and the registry'),
    (SRC + '/effects/actions.ts', None, 'Item actions'),
    (SRC + '/rolls.ts', None, 'Rolls, saves and contests'),
    (SRC + '/kit.ts', None, 'The kit: selectors, areas, tiles'),
    (SRC + '/combat.ts', ['displace', 'swapUnits', 'moveUnit', 'emitFx', 'hurtUnit', 'healUnit', 'unitSees', 'dist'], 'Movement and the fight\'s doors'),
    (SRC + '/magic.ts', ['applyCond', 'endCond', 'condOn', 'condId', 'setCondRounds', 'clearConds', 'cleanseList', 'debuffsOf', 'saveAgainst', 'saveTn', 'condMods', 'Zone'], 'Conditions and saves'),
    (SRC + '/unitstate.ts', None, 'Unit states'),
    (SRC + '/condtable.ts', None, 'The conditions table'),
    (SRC + '/log.ts', None, 'The fight log'),
    (SRC + '/fog.ts', None, 'What each viewer may see'),
    (SRC + '/descriptors.ts', ['registerActions', 'actionsFor', 'previewDescriptor', 'sendDescriptor', 'nextStep', 'stepOn', 'ActionSystem', 'ActionDescriptor', 'PickStep', 'PickOption', 'DescCost', 'DescCtx', 'DescriptorPreview', 'PreviewLine', 'GridMarks', 'GROUP_ORDER'], 'Action descriptors'),
    (SRC + '/preview.ts', None, 'Previews and dry runs'),
    (SRC + '/datatext.ts', None, 'Numbers in data texts'),
    (SRC + '/run/state.ts', None, 'The mode a room plays and the Survival run (rules 1.39)'),
    ('apps/web/src/game/actionTip.ts', None, 'The client\'s one hover card'),
    ('apps/web/src/game/actionFlow.ts', None, 'The client\'s action flow'),
]


def section_c():
    out = [H(2, '(c) The primitives'),
           'One door per concept (`docs/ENGINE-GUIDE.md` section 1, rule 1). Every export of each primitive\'s file, its '
           'signature, and the first sentence of the doc comment above it.\n\n']
    counts = {}
    # output profiles and the Level table
    o = jload('data/rules.json')['output']
    out.append('### Output profiles and the Level table (`data/rules.json` `output`)\n\n' + o.get('formula', '') + '\n\n')
    out.append(md_table(['profile', 'k', 'attr', 'skill', 'level', 'pair', 'shape'],
                        [['`' + k + '`', v.get('k', ''), v.get('attr', ''), v.get('skill', ''), v.get('level') or '', v.get('pair', ''), v.get('shape', '')] for k, v in o['profiles'].items() if isinstance(v, dict)]))
    out.append('\nLevel tables: ' + ', '.join('`' + k + '` (' + str(len(v)) + ' levels)' for k, v in o['level'].items() if isinstance(v, list)) + '. '
               'Systems with a dial (`output.systems`): ' + ', '.join('`' + k + '`' for k in o['systems'] if k != 'note') + '. '
               'Rule-owned amount blocks (`output.amounts`, key `rule:<name>`): ' + ', '.join('`' + k + '`' for k in o['amounts'] if k != 'note') + '.\n\n')
    # amounts block fields, read from data
    fields = []
    for _, _, it in data_items():
        am = it.get('amounts')
        if isinstance(am, dict):
            for b in am.values():
                if isinstance(b, dict):
                    for f in b:
                        if f not in fields: fields.append(f)
    out.append('An `amounts` block (on any item; `data/CONVENTIONS.md` "Amount blocks") uses the fields: ' + ', '.join('`' + f + '`' for f in fields) + '.\n\n')
    counts['profiles'] = sum(1 for v in o['profiles'].values() if isinstance(v, dict))
    # cost sites and data costs
    sites = const_list(SRC + '/effects/stats.ts', 'COST_SITE_IDS')
    A = jload('data/actions.json')
    out.append(f'### Cost sites ({len(sites)}) and priced actions\n\n`COST_SITE_IDS` (`effects/stats.ts`): every action whose AP items may change, '
               'priced with `price({cb, u}, site)`, answered by a data `action_cost` effect or the stat `ap_cost:<site>`:\n'
               + ', '.join('`' + s + '`' for s in sites) + '.\n\n')
    out.append(md_table(['data/actions.json `costs`', 'fields'], [['`' + k + '`', ', '.join(f'{a}: {b}' for a, b in v.items())] for k, v in A['costs'].items()]))
    out.append('\nResources (`data/actions.json` `resources`; paid by `pay` / `spend`, named in an action\'s `res`):\n\n'
               + md_table(['resource', 'name', 'on', 'path'], [['`' + k + '`', v.get('name', ''), v.get('on', ''), v.get('path', '')] for k, v in A['resources'].items()]))
    counts['cost sites'] = len(sites); counts['resources'] = len(A['resources'])
    # stats
    st = object_table(SRC + '/effects/stats.ts', 'STATS'); fam = object_table(SRC + '/effects/stats.ts', 'STAT_FAMILIES')
    out.append(f'\n### Stat ids ({len(st)} plain, {len(fam)} families; `effects/stats.ts`)\n\nAsked with `statQuery(x, id)`, answered by an item\'s `stat:` or a data `stat_mod`. A new id is a line in `STATS`.\n\n')
    out.append(md_table(['stat', 'what it is'], [['`' + k + '`', v] for k, v in st] + [['`' + k + '<…>`', v] for k, v in fam]))
    out.append('\n`immune(x, what)` is also asked about: ' + ', '.join('`' + s + '`' for s in const_list(SRC + '/effects/stats.ts', 'IMMUNE_IDS')) + ' (`IMMUNE_IDS`).\n\n')
    counts['stats'] = len(st) + len(fam)
    # conditions table fields
    C = jload('data/conditions.json')
    fcount = {}
    for row in C['items']:
        for k in row: fcount[k] = fcount.get(k, 0) + 1
    out.append(f'### The condition table (`data/conditions.json`, {len(C["items"])} rows; loader `condtable.ts`)\n\nA condition is a row; these are the fields rows use (how many rows use each):\n'
               + ', '.join(f'`{k}` ({n})' for k, n in fcount.items()) + '.\nFamilies: ' + ', '.join('`' + k + '`' for k in (C['families'] if isinstance(C['families'], dict) else [])) + '.\n\n')
    counts['condition fields'] = len(fcount)
    # every primitive file's exports
    total = 0
    for rel, only, title in PRIMITIVE_FILES:
        t, n = export_table(rel, only, title); out.append(t); total += n
    counts['primitive exports'] = total
    # the action descriptor's fields
    # fx event kinds
    kinds = {}
    for rel in ts_files():
        code = blank_comments(read(rel))
        for m in re.finditer(r"\bemitFx\(\s*[^,]{1,40}?,\s*", code):
            j = m.end(); arg = code[j:j + 160]
            lit = re.match(r"'([a-z_]+)'", arg)
            names = [lit.group(1)] if lit else re.findall(r"\?\s*'([a-z_]+)'\s*:\s*(?:'([a-z_]+)')?", arg.split(',')[0] + ',')
            flat = []
            for x in names: flat += [y for y in (x if isinstance(x, tuple) else (x,)) if y]
            if not lit:
                flat += re.findall(r":\s*'([a-z_]+)'", arg.split('{')[0])
            k2 = code.find('{', j); keys = ctx_keys(code, k2) if k2 >= 0 and k2 - j < 120 else None
            for k in dict.fromkeys(flat):
                d = kinds.setdefault(k, {'n': 0, 'at': short(rel) + ':' + str(code.count('\n', 0, m.start()) + 1), 'fields': []})
                d['n'] += 1
                for f in (keys or []):
                    if f not in d['fields']: d['fields'].append(f)
    out.append(f'### Fx event kinds ({len(kinds)}; `emitFx(cb, kind, data)` in `combat.ts`; taps: `fxTaps` in `fxtap.ts`)\n\n'
               'What the client animates. Name units by `unit` / `target`, tiles as `\'x,y\'`, `only: side` for one side\'s eyes (`docs/ENGINE-GUIDE.md`, fog).\n\n')
    out.append(md_table(['kind', 'fields', 'first emitted at', 'sites'], [['`' + k + '`', ', '.join('`' + f + '`' for f in v['fields']), v['at'], v['n']] for k, v in sorted(kinds.items())]))
    counts['fx kinds'] = len(kinds)
    # placeholders
    fm = re.search(r"const FORMATS = \[([^\]]*)\]", read(SRC + '/datatext.ts'))
    fmts = [x for x in re.findall(r"'(\w*)'", fm.group(1)) if x]
    out.append('\n### `{=placeholder}` formats (`datatext.ts` `FORMATS`)\n\n`{=path}` reads a field of the same item; `{=path|format}` with format one of '
               + ', '.join('`' + f + '`' for f in fmts) + '.\n\n')
    # Unit and Combat fields (state: a new counter here is a smell, see built_from.py)
    text = read(SRC + '/combat.ts')
    for iface in ('Unit', 'Combat'):
        m = re.search(r'^export interface ' + iface + r'\b', text, re.M)
        fl = interface_fields(text, m.start())
        out.append(f'### `{iface}` fields ({len(fl)}; `combat.ts`)\n\nA limit, a round stamp or a cooldown is NOT a new field here: it is a `uses(h)` cell (`effects/uses.ts`).\n\n'
                   + ', '.join('`' + f['name'] + '`' for f in fl) + '.\n\n')
        counts[iface + ' fields'] = len(fl)
    return ''.join(out), counts


def env_of(rel, seen=None):
    """Recording switches a test (or a module it imports from the test folder) reads: {VAR: [values]}."""
    seen = seen or set()
    if rel in seen or not os.path.exists(os.path.join(ROOT, rel)): return {}
    seen.add(rel); text = read(rel); out = {}
    for v in re.findall(r'process\.env\.([A-Z_]+)', text): out.setdefault(v, [])
    for v, val in re.findall(r"process\.env\.([A-Z_]+)\s*===\s*'([\w-]+)'", text):
        if val not in out.setdefault(v, []): out[v].append(val)
    for v in list(out):
        for val in re.findall(r'\b' + v + r'=(\w+)', text):
            if val not in out[v]: out[v].append(val)
    for imp in re.findall(r"from '(\./(?:golden|helpers)/[\w./-]+)'", text):
        p = os.path.normpath(os.path.join(os.path.dirname(rel), imp + ('' if imp.endswith('.ts') else '.ts'))).replace(os.sep, '/')
        for k, vs in env_of(p, seen).items():
            for x in vs:
                if x not in out.setdefault(k, []): out[k].append(x)
            out.setdefault(k, [])
    return out


def header(rel):
    if rel.endswith('.py'):
        import ast
        d = ast.get_docstring(ast.parse(read(rel))) or ''
        return first_sentence(d.split('\n\n')[0], 260) if d else '**(no docstring)**'
    lines = read(rel).split('\n'); run = []
    for l in lines:
        s = l.strip()
        if s.startswith('// @ts-nocheck'): continue
        if s.startswith('//'): run.append(s[2:].strip())
        elif s.startswith('#') and rel.endswith('.py') and not s.startswith('#!'): run.append(s[1:].strip())
        elif s.startswith('"""') and rel.endswith('.py'): run.append(s.strip('"').strip())
        elif run or s: break
    return first_sentence(' '.join(run), 260) if run else '**(no header comment)**'


def section_d():
    T = 'packages/engine/test/'
    files = sorted(f for f in os.listdir(os.path.join(ROOT, T)) if re.match(r'(lint-.*|golden-.*|amount-literals|test-lint|balance-contract|item-ops|replay-hash|suite-shape|text-number-truth|datatext|fog-view|descriptors|actions|shared-state|engine-hooks)\.test\.ts$', f))
    rows = []
    for f in files:
        env = env_of(T + f); stem = f[:-len('.test.ts')]
        rec = '; '.join(f'`{k}={v} npm test -w @phc/engine -- {stem}`' for k, vs in env.items() for v in sorted(vs or ['1'], key=lambda x: (x != '1', x)) if not k.startswith(('PHC_', 'REPLAY_COVER', 'REPLAY_DUMP', 'REPLAY_FULL', 'ROLL_DIGEST'))) or 'none (fix the code, or change the test on purpose)'
        rows.append(['`' + T + f + '`', header(T + f), rec])
    web = 'apps/web/src/game/boundary.test.ts'
    rows.append(['`' + web + '`', header(web), 'none (fix the client: ask the engine)'])
    for t in ('tools/validate.py', 'tools/text_numbers.py', 'tools/check_spec_tables.py', 'tools/engine_catalog.py', 'tools/built_from.py'):
        if os.path.exists(os.path.join(ROOT, t)): rows.append(['`' + t + '`', header(t), ''])
    out = [H(2, '(d) The guards'),
           'What fails when someone goes round a primitive, and how to re-record a pinned table ON PURPOSE (read the diff '
           'first; `python3 tools/golden_diff.py --rev <base>` lists what moved). The description is the first sentence of '
           'each file\'s header comment. The patterns the lints share with `tools/built_from.py` are in '
           '`packages/engine/test/lint-patterns.json`.\n\n',
           md_table(['guard', 'what it holds (a failure means this broke)', 're-record'], rows)]
    return ''.join(out), {'guards': len(rows)}


def build():
    MISSING.clear()
    a, ca = section_a(); b, cb_ = section_b(); c, cc = section_c(); d, cd = section_d()
    counts = {**ca, **cb_, **cc, **cd}
    head = ('# Engine hooks: the catalogue (GENERATED)\n\n'
            '<!-- Written by tools/engine_catalog.py from the engine\'s source and data/. Do not edit by hand: '
            'run `python3 tools/engine_catalog.py`. `npm run check` fails when this file is stale. -->\n\n'
            'Every extension point the engine already has. **Look here before you build** (`docs/ENGINE-GUIDE.md`, "Stop: '
            'before you build"): a new item, class move, system or screen is built FROM these; a name that is not here is '
            'either a typo, an invention, or a new primitive that a design spec must list under "Needs a new primitive" '
            '(and that `docs/design/rev4-primitives.md` may already have consolidated). Check a spec or a diff with '
            '`npm run built-from -- <spec.md | git range>`.\n\n'
            'Counts: ' + ', '.join(f'{v} {k}' for k, v in counts.items()) + '.\n\n'
            'Sections: (a) item ops, (b) the hook bus, (c) the primitives, (d) the guards.\n\n')
    return head + a + '\n' + b + '\n' + c + '\n' + d, counts


def main():
    text, counts = build()
    path = os.path.join(ROOT, OUT)
    if '--check' in sys.argv:
        cur = open(path, encoding='utf-8').read() if os.path.exists(path) else ''
        errs = (['docs/ENGINE-HOOKS.md is stale: run python3 tools/engine_catalog.py'] if cur != text else []) + ['no doc comment on ' + m + ': add a one-line comment above it in the source' for m in MISSING]
        if errs:
            print(f'{len(errs)} errors: ' + '\n'.join(errs)); sys.exit(1)
        print('0 errors (' + ', '.join(f'{v} {k}' for k, v in counts.items()) + ')'); return
    with open(path, 'w', encoding='utf-8') as f: f.write(text)
    print('wrote ' + OUT + ': ' + ', '.join(f'{v} {k}' for k, v in counts.items()))
    if MISSING: print(f'{len(MISSING)} names with no doc comment (add one in the source):\n  ' + '\n  '.join(MISSING), file=sys.stderr)


if __name__ == '__main__':
    main()
