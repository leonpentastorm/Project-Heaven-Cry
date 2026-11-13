// A small runtime for the canvas prototypes' Design Component templates (design/canvas-build/*.template.html).
// It parses a template once (its own strict parser: the templates are well-formed, and the browser's HTML parser
// would drop <sc-for> inside <select> and lowercase onClick), then renders it with React against the values a
// screen's logic returns from renderVals(). Supported: {{dotted.holes}} in text and attributes, <sc-for list as>,
// <sc-for list as memo> (memo: each item re-renders only when its own values changed; see MemoItem), <sc-if value>, style strings, class, on* handlers, form attributes, tip (the hover card; a template never has title). <helmet> and <dc-import> are skipped (the
// app loads fonts and CSS globally, and screens are routed by the app, not imported).
import React from 'react';

type TextNode = { t: 'text'; parts: (string | { hole: string })[] };
type ElNode = { t: 'el'; tag: string; attrs: [string, string | true][]; kids: Node[] };
type Node = TextNode | ElNode;

const VOID = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr']);
const ENT: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', middot: '·', mdash: '—', ndash: '–', hellip: '…', times: '×', rarr: '→', larr: '←' };
const decode = (s: string) => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e: string) =>
  e[0] === '#' ? String.fromCodePoint(e[1] === 'x' || e[1] === 'X' ? parseInt(e.slice(2), 16) : parseInt(e.slice(1), 10)) : ENT[e] ?? m);

function splitHoles(s: string): (string | { hole: string })[] {
  const out: (string | { hole: string })[] = [];
  let i = 0;
  for (const m of s.matchAll(/\{\{\s*([\w$.]+)\s*\}\}/g)) {
    if (m.index! > i) out.push(decode(s.slice(i, m.index)));
    out.push({ hole: m[1] });
    i = m.index! + m[0].length;
  }
  if (i < s.length) out.push(decode(s.slice(i)));
  return out;
}

export function parseTemplate(src: string): Node[] {
  const root: ElNode = { t: 'el', tag: '#root', attrs: [], kids: [] };
  const stack: ElNode[] = [root];
  const re = /<!--[\s\S]*?-->|<\/([a-zA-Z][\w-]*)\s*>|<([a-zA-Z][\w-]*)((?:\s+[^\s=>\/]+(?:\s*=\s*(?:"[^"]*"|'[^']*'))?)*)\s*(\/?)>/g;
  let last = 0;
  const pushText = (s: string) => { if (s && !/^\s*$/.test(s)) stack[stack.length - 1].kids.push({ t: 'text', parts: splitHoles(s.replace(/\s+/g, ' ')) }); };
  for (const m of src.matchAll(re)) {
    pushText(src.slice(last, m.index));
    last = m.index! + m[0].length;
    if (m[0].startsWith('<!--')) continue;
    if (m[1]) { // close tag
      const tag = m[1];
      for (let k = stack.length - 1; k > 0; k--) if (stack[k].tag === tag) { stack.length = k; break; }
      continue;
    }
    const tag = m[2];
    const attrs: [string, string | true][] = [];
    for (const a of m[3].matchAll(/([^\s=>\/]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'))?/g)) attrs.push([a[1], a[2] ?? a[3] ?? true]);
    const el: ElNode = { t: 'el', tag, attrs, kids: [] };
    stack[stack.length - 1].kids.push(el);
    if (!m[4] && !VOID.has(tag.toLowerCase())) stack.push(el);
  }
  pushText(src.slice(last));
  return root.kids;
}

const get = (scope: any, path: string) => path.split('.').reduce((o, k) => (o == null ? o : o[k]), scope);
const camel = (s: string) => s.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
const styleCache = new Map<string, React.CSSProperties>();
export function parseStyle(s: string): React.CSSProperties {
  const hit = styleCache.get(s);
  if (hit) return hit;
  const o: Record<string, string> = {};
  let depth = 0, cur = '';
  const decls: string[] = [];
  for (const ch of s) { // split on ; outside parentheses (url(), gradients)
    if (ch === '(') depth++;
    if (ch === ')') depth--;
    if (ch === ';' && depth === 0) { decls.push(cur); cur = ''; } else cur += ch;
  }
  decls.push(cur);
  for (const d of decls) {
    const i = d.indexOf(':');
    if (i < 0) continue;
    const k = d.slice(0, i).trim(), v = d.slice(i + 1).trim();
    if (!k || !v) continue;
    o[k.startsWith('--') ? k : camel(k)] = v;
  }
  if (styleCache.size < 5000) styleCache.set(s, o);
  return o;
}

const ATTR_MAP: Record<string, string> = { class: 'className', for: 'htmlFor', tabindex: 'tabIndex', readonly: 'readOnly', maxlength: 'maxLength', autofocus: 'autoFocus', spellcheck: 'spellCheck', colspan: 'colSpan', rowspan: 'rowSpan', autocomplete: 'autoComplete', 'xlink:href': 'xlinkHref', viewbox: 'viewBox' };
const SKIP = new Set(['helmet', 'dc-import', 'script']);

function attrValue(v: string | true, scope: any): any {
  if (v === true) return true;
  const exact = v.match(/^\{\{\s*([\w$.]+)\s*\}\}$/);
  if (exact) return get(scope, exact[1]);
  if (!v.includes('{{')) return v;
  return splitHoles(v).map((p) => (typeof p === 'string' ? p : String(get(scope, p.hole) ?? ''))).join('');
}

/** Whether an element says its own name: words in it (text or a {{hole}}), an image with alt text, or an aria-label.
 *  An element without one (an icon-only button) takes its hover text as its accessible name too. */
const NAMED = new WeakMap<ElNode, boolean>();
function hasOwnName(n: ElNode): boolean {
  const hit = NAMED.get(n); if (hit !== undefined) return hit;
  const own = n.attrs.some(([k, v]) => (k === 'aria-label' || k === 'aria-labelledby' || (k === 'alt' && v !== '' && v !== true)))
    || n.kids.some((k) => (k.t === 'text' ? k.parts.some((p) => typeof p !== 'string' || p.trim() !== '') : k.tag !== 'svg' && hasOwnName(k)));
  NAMED.set(n, own); return own;
}

function renderNode(n: Node, scope: any, key: React.Key): React.ReactNode {
  if (n.t === 'text') {
    if (n.parts.length === 1 && typeof n.parts[0] === 'string') return n.parts[0];
    return n.parts.map((p, i) => {
      if (typeof p === 'string') return p;
      const v = get(scope, p.hole);
      return v == null || typeof v === 'function' || typeof v === 'boolean' ? null : <React.Fragment key={i}>{String(v)}</React.Fragment>;
    });
  }
  if (SKIP.has(n.tag)) return null;
  if (n.tag === 'sc-for') {
    const listA = n.attrs.find((a) => a[0] === 'list'), asA = n.attrs.find((a) => a[0] === 'as');
    const list = listA ? attrValue(listA[1], scope) : [];
    const as = asA && asA[1] !== true ? asA[1] : 'item';
    if (!Array.isArray(list)) return null;
    if (n.attrs.some((a) => a[0] === 'memo')) return renderMemoList(n, list, as, scope);
    return list.map((item, i) => {
      const s = Object.create(scope);
      s[as] = item; s.$index = i;
      return <React.Fragment key={item && typeof item === 'object' && item.key != null ? item.key : i}>{renderKids(n.kids, s)}</React.Fragment>;
    });
  }
  if (n.tag === 'sc-if') {
    const valA = n.attrs.find((a) => a[0] === 'value');
    return valA && attrValue(valA[1], scope) ? <React.Fragment key={key}>{renderKids(n.kids, scope)}</React.Fragment> : null;
  }
  const props: Record<string, any> = { key };
  const isSvg = n.tag === 'svg' || n.tag === 'path' || n.tag === 'g' || n.tag === 'line' || n.tag === 'circle' || n.tag === 'rect' || n.tag === 'polygon' || n.tag === 'polyline' || n.tag === 'text';
  let hasValue = false, hasOnChange = false;
  for (const [name, raw] of n.attrs) {
    if (name.startsWith('hint-') || name === 'negate') continue;
    const v = attrValue(raw, scope);
    if (/^on[A-Z]/.test(name)) { if (typeof v === 'function') props[name] = v; if (name === 'onChange') hasOnChange = true; continue; }
    if (name === 'style') { if (v) props.style = parseStyle(String(v)); continue; }
    // tip="…": the game's hover card (game/actionTip.ts), never a native title. The words go to assistive tech too:
    // as the description, or as the name of an element with no words of its own.
    if (name === 'tip') {
      const t = v == null || v === false || typeof v === 'function' ? '' : String(v).trim();
      if (!t || n.attrs.some((a) => a[0] === 'data-tip')) continue;
      props['data-tip-text'] = t;
      if (hasOwnName(n)) { if (!n.attrs.some((a) => a[0] === 'aria-description')) props['aria-description'] = t; }
      else if (!n.attrs.some((a) => a[0] === 'aria-label')) props['aria-label'] = t;
      continue;
    }
    if (name === 'value') hasValue = true;
    if (name === 'disabled' || name === 'checked' || name === 'selected' || name === 'readonly' || name === 'autofocus') {
      props[ATTR_MAP[name] ?? name] = v === true || v === '' || v === 'true' || (v !== false && v !== 'false' && v != null && v !== 0);
      continue;
    }
    const k = ATTR_MAP[name] ?? (name.startsWith('aria-') || name.startsWith('data-') ? name : isSvg && name.includes('-') ? camel(name) : name);
    if (v === undefined || v === null || v === false) continue;
    props[k] = v;
  }
  if (hasValue && !hasOnChange && (n.tag === 'input' || n.tag === 'textarea' || n.tag === 'select')) { props.defaultValue = props.value; delete props.value; }
  if (n.tag === 'select' && 'value' in props && props.value == null) props.value = '';
  const kids = VOID.has(n.tag.toLowerCase()) ? undefined : renderKids(n.kids, scope);
  if (n.tag === 'textarea') { if (kids && !('value' in props) && !('defaultValue' in props)) props.defaultValue = flatText(n.kids, scope); return React.createElement('textarea', props); }
  return React.createElement(n.tag, props, kids && (kids as any[]).length ? kids : undefined);
}
function flatText(kids: Node[], scope: any): string {
  return kids.map((k) => (k.t === 'text' ? k.parts.map((p) => (typeof p === 'string' ? p : String(get(scope, p.hole) ?? ''))).join('') : '')).join('');
}
function renderKids(kids: Node[], scope: any): React.ReactNode[] {
  return kids.map((k, i) => renderNode(k, scope, i));
}

// ---------- <sc-for memo>: a long list whose items mostly stay the same between renders (the map's 676 tiles) ----------
// Each item is its own memoised component: it renders again only when its item changed (compared by value: strings,
// numbers, nested lists and objects), or a value from outside the item that its body reads changed. The item's own
// handlers (onClick="{{t.click}}") are new closures on every render of the screen: the item binds stable stand-ins that
// call the newest one, so an item that did not render again still runs today's handler. A handler nested deeper than
// the item itself is compared by identity (it re-renders the item when it changes).
/** How many list items have rendered (memo lists only): the map-hover tests and the probe read it. */
export const ITEM_RENDERS = { count: 0 };
/** Why memo items rendered again (on only while someone looks: window.__phcMemoWhy(true), then window.__phcMemoWhy()):
 *  the first field that differed, counted. */
const WHY = { on: false, seen: {} as Record<string, number> };
if (typeof window !== 'undefined') (window as any).__phcMemoWhy = (on?: boolean) => { if (on != null) { WHY.on = !!on; WHY.seen = {}; } return { renders: ITEM_RENDERS.count, why: WHY.seen }; };
function firstDiff(a: any, b: any, path: string, depth: number): string | null {
  if (same(a, b, depth)) return null;
  if (a && b && typeof a === 'object' && typeof b === 'object' && !Array.isArray(a) && !Array.isArray(b)) {
    for (const k of new Set([...Object.keys(a), ...Object.keys(b)])) { const d = firstDiff(a[k], b[k], path + '.' + k, depth + 1); if (d) return d; }
  }
  return path;
}
type Box = { item: any; fns: Record<string, (...a: any[]) => any> };
const MEMO = new WeakMap<ElNode, { deps: string[]; boxes: Map<React.Key, Box> }>();
/** The holes a list's body reads from outside its own item (their full paths): part of what decides a re-render. */
function outerHoles(n: ElNode, as: string): string[] {
  const out = new Set<string>(), local = new Set([as, '$index']);
  const visit = (k: Node, loc: Set<string>) => {
    const take = (path: string) => { if (!loc.has(path.split('.')[0])) out.add(path); };
    if (k.t === 'text') { for (const p of k.parts) if (typeof p !== 'string') take(p.hole); return; }
    let inner = loc;
    for (const [, v] of k.attrs) if (typeof v === 'string') for (const m of v.matchAll(/\{\{\s*([\w$.]+)\s*\}\}/g)) take(m[1]);
    if (k.tag === 'sc-for') { const a = k.attrs.find((x) => x[0] === 'as'); inner = new Set([...loc, a && a[1] !== true ? a[1] : 'item']); }
    for (const c of k.kids) visit(c, inner);
  };
  for (const c of n.kids) visit(c, local);
  return [...out];
}
/** Equal by value (functions: equal at the item's own level, where they are stood in for; by identity deeper). */
function same(a: any, b: any, depth: number): boolean {
  if (a === b) return true;
  const ta = typeof a; if (ta !== typeof b) return false;
  if (ta === 'function') return depth === 1;
  if (ta !== 'object' || a === null || b === null || depth > 6) return false;
  if (Array.isArray(a)) { if (!Array.isArray(b) || a.length !== b.length) return false; for (let i = 0; i < a.length; i++) if (!same(a[i], b[i], depth + 1)) return false; return true; }
  if (Array.isArray(b) || Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false;
  const ka = Object.keys(a); if (ka.length !== Object.keys(b).length) return false;
  for (const k of ka) if (!(k in b) || !same(a[k], b[k], depth + 1)) return false;
  return true;
}
type ItemProps = { kids: Node[]; scope: any; as: string; index: number; item: any; box: Box; deps: any[] };
const MemoItem = React.memo(function MemoItem({ kids, scope, as, index, item, box }: ItemProps) {
  ITEM_RENDERS.count++;
  let it = item;
  if (item && typeof item === 'object' && !Array.isArray(item)) {
    it = { ...item };
    for (const k of Object.keys(item)) if (typeof item[k] === 'function') it[k] = box.fns[k] ||= (...a: any[]) => { const f = box.item && box.item[k]; return typeof f === 'function' ? f(...a) : undefined; };
  }
  const s = Object.create(scope); s[as] = it; s.$index = index;
  return <>{renderKids(kids, s)}</>;
}, (a, b) => {
  const eq = a.kids === b.kids && a.as === b.as && a.index === b.index && a.box === b.box && same(a.item, b.item, 0) && same(a.deps, b.deps, 2);
  if (!eq && WHY.on) { const k = firstDiff(a.item, b.item, a.as, 0) || (same(a.deps, b.deps, 2) ? 'index/box' : 'outside values'); WHY.seen[k] = (WHY.seen[k] || 0) + 1; }
  return eq;
});
function renderMemoList(n: ElNode, list: any[], as: string, scope: any): React.ReactNode {
  let m = MEMO.get(n); if (!m) { m = { deps: outerHoles(n, as), boxes: new Map() }; MEMO.set(n, m); }
  const deps = m.deps.map((p) => get(scope, p));
  return list.map((item, i) => {
    const key: React.Key = item && typeof item === 'object' && item.key != null ? item.key : i;
    let box = m!.boxes.get(key); if (!box) { box = { item, fns: {} }; m!.boxes.set(key, box); }
    box.item = item; // (the newest item: what the stood-in handlers call)
    return <MemoItem key={key} kids={n.kids} scope={scope} as={as} index={i} item={item} box={box} deps={deps} />;
  });
}

/** Render parsed template nodes against a values object. */
export function renderTemplate(nodes: Node[], vals: any): React.ReactNode {
  return <>{renderKids(nodes, vals)}</>;
}

/** Base class for screen logic, matching the prototypes' DCLogic: props, state, setState, renderVals(). */
export class DCLogic<P = any, S = any> {
  props: P;
  state: S = {} as S;
  _update: () => void = () => {};
  constructor(props: P) { this.props = props; }
  setState(x: Partial<S> | ((s: S) => Partial<S>)) {
    const patch = typeof x === 'function' ? (x as (s: S) => Partial<S>)(this.state) : x;
    this.state = { ...this.state, ...patch };
    this._update();
  }
  renderVals(): any { return {}; }
}

/** How many times any screen has rendered (window.__phcRenderCount): the map-hover probe and tests read it. */
export const RENDERS = { count: 0 };
if (typeof window !== 'undefined') Object.defineProperty(window, '__phcRenderCount', { get: () => RENDERS.count, configurable: true });

/** A React component for one screen: a parsed template plus a logic class. */
export function makeScreen<P>(template: string, Logic: new (props: P) => DCLogic<P>) {
  const nodes = parseTemplate(template);
  return function Screen(props: P & { tick?: number }) {
    const [, force] = React.useReducer((x: number) => x + 1, 0);
    const ref = React.useRef<DCLogic<P> | null>(null);
    if (!ref.current) ref.current = new Logic(props);
    const inst = ref.current;
    RENDERS.count++; // (the performance probe and tests read how often a screen renders: tools/perf/map_hover_probe.mjs)
    inst.props = props;
    inst._update = force;
    let vals: any;
    try { vals = inst.renderVals(); } catch (e) { console.error(e); return <pre style={{ color: '#F65157', padding: 24, whiteSpace: 'pre-wrap' }}>{String((e as Error).stack || e)}</pre>; }
    return renderTemplate(nodes, vals);
  };
}
