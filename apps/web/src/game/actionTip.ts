// THE hover card of the game (Leon, live 0.23.0: "separated into lines with proper punctuation so you can read"; live
// 0.24.0: "we have this nice hover panel why not use it everywhere?"). Every hover text in the client goes through it;
// no element carries a native title (boundary.test.ts lints that). Two ways in:
//   - data-tip: the JSON of a Tip, built by tipAttrs() from a structured source (an action: name, cost chips, lines);
//   - data-tip-text: plain prose; proseTip() lays it out at show time (a line a sentence, "Label: text" and a
//     parenthesised note on their own labelled lines). A template writes tip="{{x.title}}" (dc/runtime.tsx expands it,
//     with aria-description, and aria-label too on an element with no words of its own); React uses tipProps(text).
// How to add a hover text: docs/design/handoffs/hover-card.md.
// The action card in detail: every action's hover text on the combat screen (a row of any tab, a technique chip, a heart button, a feeling,
// a glyph word, a design card) is laid out by ONE helper, actionTip(), from the descriptor's own fields:
//
//   Heavy Bolt   [3 AP] [1 round]                    line 1: the name and its cost chips
//   One bolt at +40% damage that ignores 10 armour.   one line per sentence of what it does
//   On a hit the target saves (Body) or is pushed 1 tile.
//   With this weapon: costs 1 AP less.               the weapon's own modifier, labelled
//   Quick: Handy. Firing next to an enemy…           each weapon trait, labelled
//   Can't now: Needs 3 AP.                           the refusal, last
//
// A prose string from the engine is split here, once, on sentence ends; a parenthesised group that stands between
// sentences ("(Quick: Handy. …)") becomes its own labelled lines. No number is worked out here: they are the engine's.
// The card itself is one floating element (mountActionTips): any element with data-tip (the JSON of a Tip) shows it on
// hover or keyboard focus, so a tooltip inside a scrolling column is never clipped by it.

export interface TipLine { key: string; kind: 'text' | 'weapon' | 'trait' | 'note' | 'why'; label: string; text: string }
/** name '' (a prose hover text): a card with no title line. */
export interface Tip { name: string; chips: string[]; lines: TipLine[] }
export interface TipSrc {
  name: string;
  /** The cost: the descriptor's cost text ("2 AP · the magazine drops", split on " · " into chips) or the chips. */
  cost?: string | string[] | null;
  /** What it does, in prose (split into sentences here). */
  text?: string | null;
  /** What it needs before it can be used at all, said first (a technique's needs). */
  needs?: string | null;
  /** The weapon's own modifier ("costs 1 AP less."). */
  line?: string | null;
  /** The weapon's traits behind that line. */
  traits?: { label: string; text: string }[] | null;
  /** More labelled lines (a signature technique's note). */
  notes?: { label: string; text: string }[] | null;
  /** The engine's refusal now, or null. */
  why?: string | null;
}

const cap = (t: string) => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
/** A sentence ends with a stop; a bare fragment gets one. */
const stop = (t: string) => { const s = t.trim(); return !s ? s : /[.!?…:)]$/.test(s) ? s : s + '.'; };

/** Split prose into sentences at top level: a stop (. ! ? …) followed by a space and a capital, a digit, a sign or an
 *  opening bracket. A stop inside brackets does not split, and a parenthesised group standing on its own between
 *  sentences is kept whole as its own piece. */
export function sentences(prose: string): string[] {
  const s = String(prose || '').replace(/\s+/g, ' ').trim(); if (!s) return [];
  const out: string[] = []; let depth = 0, start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') {
      // an opening bracket right at a sentence's start (after a stop): the group stands alone
      if (depth === 0 && i > start && /[.!?…]\s*$/.test(s.slice(start, i))) { out.push(s.slice(start, i).trim()); start = i; }
      depth++;
    } else if (ch === ')') {
      depth = Math.max(0, depth - 1);
      if (depth === 0 && s[start] === '(' ) { out.push(s.slice(start, i + 1).trim()); start = i + 1; }
    } else if (depth === 0 && /[.!?…]/.test(ch) && s[i + 1] === ' ' && /[A-Z0-9(+−\-“"'«✕]/.test(s[i + 2] || '')) {
      out.push(s.slice(start, i + 1).trim()); start = i + 2; i++;
    }
  }
  if (start < s.length) out.push(s.slice(start).trim());
  return out.filter(Boolean);
}

/** "Quick: Handy. Firing… Precise: A long barrel…" → labelled items (a capitalised word or two and a colon starts one). */
function labelled(inner: string): { label: string; text: string }[] {
  const parts = inner.split(/\s(?=[A-Z][A-Za-z' -]{1,24}:\s)/), out: { label: string; text: string }[] = [];
  for (const p of parts) {
    const m = /^([A-Z][A-Za-z' -]{1,24}):\s+([\s\S]+)$/.exec(p.trim());
    if (m) out.push({ label: m[1], text: stop(m[2]) }); else if (out.length) out[out.length - 1].text += ' ' + stop(p); else out.push({ label: '', text: stop(p) });
  }
  return out;
}

/** The action's card: the name and cost chips, then its lines (see the top of this file). */
export function actionTip(src: TipSrc): Tip {
  const chips = (Array.isArray(src.cost) ? src.cost : String(src.cost || '').split(' · ')).map((c) => String(c || '').trim()).filter(Boolean);
  const lines: TipLine[] = []; let n = 0;
  const push = (kind: TipLine['kind'], label: string, text: string) => { const t = stop(text); if (t) lines.push({ key: kind + (n++), kind, label, text: cap(t) }); };
  for (const p of sentences(src.needs || '')) push('text', '', p);
  for (const p of sentences(src.text || '')) {
    const wl = /^With this weapon:\s*([\s\S]*)$/i.exec(p);
    if (wl) { push('weapon', 'With this weapon', wl[1]); continue; }
    if (/^\(.*\)$/.test(p)) { for (const it of labelled(p.slice(1, -1).trim())) push(it.label ? 'trait' : 'note', it.label, it.text); continue; }
    push('text', '', p);
  }
  if (src.line) push('weapon', 'With this weapon', src.line);
  for (const t of src.traits || []) push('trait', t.label, t.text);
  for (const t of src.notes || []) push('note', t.label, t.text);
  if (src.why) push('why', "Can't now", src.why);
  return { name: String(src.name || '').trim(), chips, lines };
}
/** The card as plain text, a line each (an aria-description). */
export function tipText(t: Tip): string {
  const h = (t.name || '') + (t.chips.length ? (t.name ? ' · ' : '') + t.chips.join(' · ') : '');
  return [...(h ? [h] : []), ...t.lines.map((l) => (l.label ? l.label + ': ' : '') + l.text)].join('\n');
}
/** What the screen binds: data-tip (the card) and aria-description (the same, in words). */
export function tipAttrs(src: TipSrc): { tip: string; tipText: string } { const t = actionTip(src); return { tip: JSON.stringify(t), tipText: tipText(t) }; }

/** A plain prose hover text as a card: a line a sentence (and a line for each " · " part and each line break), a
 *  "Label: text" sentence and each part of a parenthesised note on their own labelled lines. `name` heads it if given.
 *  The one place prose is formatted: a call site never splits a hover text by hand. */
export function proseTip(prose: string, name = ''): Tip {
  const lines: TipLine[] = []; let n = 0;
  const push = (kind: TipLine['kind'], label: string, text: string) => { const t = stop(text); if (t) lines.push({ key: kind + (n++), kind, label, text: cap(t) }); };
  for (const block of String(prose || '').split(/\n+/)) {
    for (const p of sentences(block)) {
      for (const part of p.split(/\s+·\s+/)) {
        const q = part.trim(); if (!q) continue;
        if (/^\(.*\)$/.test(q)) { for (const it of labelled(q.slice(1, -1).trim())) push(it.label ? 'trait' : 'note', it.label, it.text); continue; }
        const m = /^([A-Z][A-Za-z'’-]*(?: [A-Za-z'’-]+){0,3}):\s+(\S[\s\S]*)$/.exec(q);
        if (m && m[1].length <= 26) { push(/^can'?t now$|^locked$/i.test(m[1]) ? 'why' : 'note', m[1], m[2]); continue; }
        // a bare short phrase with no stop stays as written (a name, a number: "Pressure 3 / 5")
        if (!/[.!?…]$/.test(q) && q.length <= 40) { lines.push({ key: 'text' + (n++), kind: 'text', label: '', text: q }); continue; }
        push('text', '', q);
      }
    }
  }
  return { name: String(name || '').trim(), chips: [], lines };
}
/** React props for a plain hover text: the card and the same words for assistive tech. `label: true` on an element
 *  with no words of its own (an icon-only button): the text is also its accessible name. */
export function tipProps(text: string | null | undefined, opts: { label?: boolean } = {}): Record<string, string> {
  const t = String(text || '').trim(); if (!t) return {};
  return opts.label ? { 'data-tip-text': t, 'aria-label': t } : { 'data-tip-text': t, 'aria-description': t };
}
/** The same for an element made by hand (cutIn, the camera's arrows). Empty text takes the card away. */
export function setTip(el: Element, text: string | null | undefined, opts: { label?: boolean } = {}): void {
  const t = String(text || '').trim();
  if (!t) { el.removeAttribute('data-tip-text'); if (!opts.label) el.removeAttribute('aria-description'); return; }
  el.setAttribute('data-tip-text', t); el.setAttribute(opts.label ? 'aria-label' : 'aria-description', t);
}
/** The card an element shows, or null (data-tip first, then data-tip-text). */
export function tipFor(el: Element): Tip | null {
  const j = el.getAttribute('data-tip');
  if (j) { try { const t = JSON.parse(j); if (t && (t.name || (t.lines && t.lines.length))) return { name: t.name || '', chips: t.chips || [], lines: t.lines || [] }; } catch { /* fall through */ } }
  const p = el.getAttribute('data-tip-text');
  if (p && p.trim()) { const t = proseTip(p); return t.lines.length ? t : null; }
  return null;
}

// ---------- the floating card ----------
const INK: Record<TipLine['kind'], string> = { text: '#E7EBF3', weapon: '#F2A54A', trait: '#C9D3E3', note: '#C9D3E3', why: '#F65157' };
export const TIP_CSS = [
  '.phc-atip{position:fixed;z-index:10000;max-width:340px;padding:8px 10px;border-radius:8px;background:#10151F;border:1px solid #3B475D;box-shadow:0 6px 22px rgba(0,0,0,.6);',
  'color:#E7EBF3;font:400 12px/1.4 \'Chakra Petch\',sans-serif;pointer-events:none;display:flex;flex-direction:column;gap:3px;text-align:left;letter-spacing:normal;text-transform:none;white-space:normal}',
  '.phc-atip-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:5px;margin-bottom:2px}',
  '.phc-atip-n{font-size:13px;font-weight:700;margin-right:3px}',
  '.phc-atip-c{font-size:10.5px;font-weight:700;padding:0 6px;border-radius:99px;border:1px solid #3B475D;color:#E7EBF3;white-space:nowrap}',
  '.phc-atip-l b{font-weight:700}',
].join('');
/** Lay a card out as elements (the name and its chips if any, a line each). */
export function tipElement(doc: Document, t: Tip): HTMLElement {
  const box = doc.createElement('div'); box.className = 'phc-atip'; box.setAttribute('role', 'tooltip'); box.setAttribute('data-atip', '1');
  if (t.name || t.chips.length) {
    const h = doc.createElement('div'); h.className = 'phc-atip-h';
    if (t.name) { const nm = doc.createElement('span'); nm.className = 'phc-atip-n'; nm.textContent = t.name; h.appendChild(nm); }
    for (const c of t.chips) { const ch = doc.createElement('span'); ch.className = 'phc-atip-c'; ch.textContent = c; h.appendChild(ch); }
    box.appendChild(h);
  }
  for (const l of t.lines) {
    const d = doc.createElement('div'); d.className = 'phc-atip-l'; d.setAttribute('data-kind', l.kind); d.style.color = INK[l.kind];
    if (l.label) { const b = doc.createElement('b'); b.textContent = l.label + ': '; d.appendChild(b); }
    d.appendChild(doc.createTextNode(l.text)); box.appendChild(d);
  }
  return box;
}

type Rect = { left: number; top: number; right: number; bottom: number };
/** Where the card goes: beside the element (left, then right), else below, else above, shifted inside the window and
 *  never over the element itself (so never under the pointer: no flicker). Pure, for the tests. */
export function placeTip(r: Rect, b: { width: number; height: number }, W: number, H: number, gap = 6): { x: number; y: number } {
  const clampY = (y: number) => Math.min(Math.max(4, y), Math.max(4, H - b.height - 4));
  const clampX = (x: number) => Math.min(Math.max(4, x), Math.max(4, W - b.width - 4));
  const overlaps = (x: number, y: number) => x < r.right && x + b.width > r.left && y < r.bottom && y + b.height > r.top;
  const tries: [number, number][] = [
    [r.left - b.width - gap, clampY(r.top)],
    [r.right + gap, clampY(r.top)],
    [clampX(r.left), r.bottom + gap],
    [clampX(r.left), r.top - b.height - gap],
  ];
  for (const [x, y] of tries) if (x >= 4 && y >= 4 && x + b.width <= W - 4 && y + b.height <= H - 4 && !overlaps(x, y)) return { x: Math.round(x), y: Math.round(y) };
  // nowhere clean: the side with the most room, clamped
  const room = [r.left, W - r.right, H - r.bottom, r.top];
  const [x, y] = tries[room.indexOf(Math.max(...room))];
  return { x: Math.round(clampX(x)), y: Math.round(clampY(y)) };
}

export const TIP_SELECTOR = '[data-tip],[data-tip-text]';
let mounted: Document | null = null;
/** The one floating card of the document: any [data-tip] / [data-tip-text] element under the pointer, under keyboard
 *  focus or long-pressed on a touch screen shows its card, after a short delay (a pointer swept down a list does not
 *  strobe). One card at a time, by construction: there is one box, and showing a card first removes every other one.
 *  Hidden on pointer leave, Escape, scroll, a press anywhere, and when its element leaves the page; redrawn when its
 *  element's words change under it. Installed once per document (main.tsx); safe outside a browser. */
export function mountActionTips(doc: Document | null = typeof document !== 'undefined' ? document : null): void {
  if (!doc || mounted === doc) return; mounted = doc;
  if (!doc.getElementById('phc-atip-css')) { const st = doc.createElement('style'); st.id = 'phc-atip-css'; st.textContent = TIP_CSS; doc.head.appendChild(st); }
  const win = doc.defaultView as any;
  let cur: HTMLElement | null = null, box: HTMLElement | null = null, timer: any = null, watch: any = null, shownKey = '', press: any = null;
  const keyOf = (el: Element) => (el.getAttribute('data-tip') || '') + '\u0000' + (el.getAttribute('data-tip-text') || '');
  const clear = () => { if (box) { box.remove(); box = null; } doc.querySelectorAll('.phc-atip').forEach((x) => x.remove()); };
  const hide = () => { clearTimeout(timer); timer = null; clearInterval(watch); watch = null; cur = null; shownKey = ''; clear(); };
  const show = (el: HTMLElement) => {
    const t = el.isConnected ? tipFor(el) : null;
    if (!t) { hide(); return; }
    clear();
    box = tipElement(doc, t); box.style.left = '-9999px'; box.style.top = '0px'; doc.body.appendChild(box); shownKey = keyOf(el);
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect(), W = doc.documentElement.clientWidth || 1024, H = doc.documentElement.clientHeight || 768;
    const p = placeTip(r, b, W, H);
    box.style.left = p.x + 'px'; box.style.top = p.y + 'px';
    clearInterval(watch);
    // the element went away or was re-rendered under the card: close it, or redraw it with its new words
    watch = setInterval(() => { if (!cur || !cur.isConnected || !cur.matches(TIP_SELECTOR)) hide(); else if (keyOf(cur) !== shownKey) show(cur); }, 200);
  };
  const enter = (el: HTMLElement | null, delay: number) => {
    if (el === cur) return; hide(); if (!el) return;
    cur = el; timer = setTimeout(() => { if (cur === el) show(el); }, delay);
  };
  const tipOf = (n: any): HTMLElement | null => (n && typeof n.closest === 'function' ? n.closest(TIP_SELECTOR) : null);
  doc.addEventListener('pointerover', (e: any) => { if (e.pointerType === 'touch') return; enter(tipOf(e.target), 350); }, true);
  doc.addEventListener('pointerout', (e: any) => {
    if (e.pointerType === 'touch' || !cur) return;
    const to = e.relatedTarget;
    if (to && tipOf(to) === cur) return; // still inside the same tipped element
    if (!tipOf(to)) hide(); // onto another tipped element: its pointerover replaces the card
  }, true);
  doc.addEventListener('focusin', (e) => { const el = tipOf(e.target); if (el && (el as any).matches?.(':focus-visible')) enter(el, 0); }, true);
  doc.addEventListener('focusout', () => hide(), true);
  doc.addEventListener('pointerdown', (e: any) => {
    hide(); clearTimeout(press); press = null;
    // touch: a long press opens the card; a tap anywhere (this handler) closes it
    if (e.pointerType === 'touch') { const el = tipOf(e.target); if (el) press = setTimeout(() => { cur = el; show(el); }, 500); }
  }, true);
  const cancelPress = () => { clearTimeout(press); press = null; };
  doc.addEventListener('pointerup', cancelPress, true);
  doc.addEventListener('pointercancel', cancelPress, true);
  doc.addEventListener('scroll', () => hide(), true);
  if (win && win.addEventListener) { win.addEventListener('blur', () => hide()); win.addEventListener('resize', () => hide()); }
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); }, true);
}
