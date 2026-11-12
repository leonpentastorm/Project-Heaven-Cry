"""Small helpers for scripted edits of the data pack (files that round-trip through json.dumps indent 2)."""
import json

class Pack:
    def __init__(self, path):
        self.path = path; self.raw = open(path, encoding='utf8').read(); self.d = json.loads(self.raw)
        self.nl = '\n' if self.raw.endswith('\n') else ''
        assert json.dumps(self.d, indent=2, ensure_ascii=False) + self.nl == self.raw, path + ' does not round-trip'
        self.idx = {}
        self._walk(self.d)
    def _walk(self, o):
        if isinstance(o, dict):
            if isinstance(o.get('id'), str): self.idx.setdefault(o['id'], []).append(o)
            for v in o.values(): self._walk(v)
        elif isinstance(o, list):
            for v in o: self._walk(v)
    def item(self, id, n=0): return self.idx[id][n]
    def all(self, id): return self.idx[id]
    def save(self): open(self.path, 'w', encoding='utf8').write(json.dumps(self.d, indent=2, ensure_ascii=False) + self.nl)

def rep(obj, key, old, new, count=1):
    """Replace old by new in the string obj[key]; old must be there."""
    s = obj[key]; assert isinstance(s, str) and old in s, (key, old, s[:200])
    obj[key] = s.replace(old, new)

def rep_all(node, old, new):
    """Replace in every string under node; returns how many strings changed."""
    n = 0
    if isinstance(node, dict):
        for k, v in list(node.items()):
            if isinstance(v, str) and old in v: node[k] = v.replace(old, new); n += 1
            else: n += rep_all(v, old, new)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if isinstance(v, str) and old in v: node[i] = v.replace(old, new); n += 1
            else: n += rep_all(v, old, new)
    return n
