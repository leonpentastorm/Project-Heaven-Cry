// The hover card of an action (Leon, live 0.23.0, 12 Nov 2026: "separated into lines with proper punctuation so you can
// read"). Every action's hover text on the combat screen (a row of any tab, a technique chip, a heart button, a feeling,
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

/** One line of the hover card: what it does, the weapon's line, a trait, a note, or the refusal. */
export interface TipLine { key: string; kind: 'text' | 'weapon' | 'trait' | 'note' | 'why'; label: string; text: string }
/** A laid-out hover card: the name, its cost chips, its lines. */
export interface Tip { name: string; chips: string[]; lines: TipLine[] }
/** What a hover card is made from (the descriptor's own fields). */
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
/** The card as plain text, a line each (an aria-description, or a native title where no card can show). */
export function tipText(t: Tip): string {
  return [t.name + (t.chips.length ? ' · ' + t.chips.join(' · ') : ''), ...t.lines.map((l) => (l.label ? l.label + ': ' : '') + l.text)].join('\n');
}
/** What the screen binds: data-tip (the card) and aria-description (the same, in words). */
export function tipAttrs(src: TipSrc): { tip: string; tipText: string } { const t = actionTip(src); return { tip: JSON.stringify(t), tipText: tipText(t) }; }

// ---------- the floating card ----------
const INK: Record<TipLine['kind'], string> = { text: '#E7EBF3', weapon: '#F2A54A', trait: '#C9D3E3', note: '#C9D3E3', why: '#F65157' };
/** The floating hover card's style, mounted once by mountActionTips. */
export const TIP_CSS = [
  '.phc-atip{position:fixed;z-index:1000;max-width:340px;padding:8px 10px;border-radius:8px;background:#10151F;border:1px solid #3B475D;box-shadow:0 6px 22px rgba(0,0,0,.6);',
  'color:#E7EBF3;font:400 12px/1.4 \'Chakra Petch\',sans-serif;pointer-events:none;display:flex;flex-direction:column;gap:3px}',
  '.phc-atip-h{display:flex;flex-wrap:wrap;align-items:baseline;gap:5px;margin-bottom:2px}',
  '.phc-atip-n{font-size:13px;font-weight:700;margin-right:3px}',
  '.phc-atip-c{font-size:10.5px;font-weight:700;padding:0 6px;border-radius:99px;border:1px solid #3B475D;color:#E7EBF3;white-space:nowrap}',
  '.phc-atip-l b{font-weight:700}',
].join('');
/** Lay a card out as elements (the name, its chips, a line each). */
export function tipElement(doc: Document, t: Tip): HTMLElement {
  const box = doc.createElement('div'); box.className = 'phc-atip'; box.setAttribute('role', 'tooltip'); box.setAttribute('data-atip', '1');
  const h = doc.createElement('div'); h.className = 'phc-atip-h';
  const nm = doc.createElement('span'); nm.className = 'phc-atip-n'; nm.textContent = t.name; h.appendChild(nm);
  for (const c of t.chips) { const ch = doc.createElement('span'); ch.className = 'phc-atip-c'; ch.textContent = c; h.appendChild(ch); }
  box.appendChild(h);
  for (const l of t.lines) {
    const d = doc.createElement('div'); d.className = 'phc-atip-l'; d.setAttribute('data-kind', l.kind); d.style.color = INK[l.kind];
    if (l.label) { const b = doc.createElement('b'); b.textContent = l.label + ': '; d.appendChild(b); }
    d.appendChild(doc.createTextNode(l.text)); box.appendChild(d);
  }
  return box;
}
let mounted: Document | null = null;
/** Show the card of any [data-tip] element under the pointer or keyboard focus, beside it, kept inside the window.
 *  Installed once per document; safe outside a browser. */
export function mountActionTips(doc: Document | null = typeof document !== 'undefined' ? document : null): void {
  if (!doc || mounted === doc) return; mounted = doc;
  if (!doc.getElementById('phc-atip-css')) { const st = doc.createElement('style'); st.id = 'phc-atip-css'; st.textContent = TIP_CSS; doc.head.appendChild(st); }
  let cur: HTMLElement | null = null, box: HTMLElement | null = null, timer: any = null;
  const hide = () => { clearTimeout(timer); timer = null; cur = null; if (box) { box.remove(); box = null; } };
  const show = (el: HTMLElement) => {
    let t: Tip | null = null; try { t = JSON.parse(el.getAttribute('data-tip') || ''); } catch { t = null; }
    if (!t || !t.name || !el.isConnected) return;
    if (box) box.remove(); box = tipElement(doc, t); doc.body.appendChild(box);
    const r = el.getBoundingClientRect(), b = box.getBoundingClientRect(), W = doc.documentElement.clientWidth || 1024, H = doc.documentElement.clientHeight || 768, gap = 6;
    // beside the element where there is room (left of a row in the right-hand column), else below or above it
    let x = r.left - b.width - gap, y = r.top;
    if (x < 4) { x = Math.min(Math.max(4, r.left), W - b.width - 4); y = r.bottom + gap; if (y + b.height > H - 4) y = r.top - b.height - gap; }
    y = Math.min(Math.max(4, y), H - b.height - 4);
    box.style.left = Math.round(x) + 'px'; box.style.top = Math.round(y) + 'px';
  };
  const enter = (el: HTMLElement | null, delay: number) => {
    if (el === cur) return; hide(); if (!el) return;
    cur = el; timer = setTimeout(() => { if (cur === el) show(el); }, delay);
  };
  const tipOf = (n: any): HTMLElement | null => (n && typeof n.closest === 'function' ? n.closest('[data-tip]') : null);
  doc.addEventListener('pointerover', (e) => enter(tipOf(e.target), 350), true);
  doc.addEventListener('pointerout', (e: any) => { if (cur && !(e.relatedTarget && cur.contains(e.relatedTarget))) hide(); }, true);
  doc.addEventListener('focusin', (e) => { const el = tipOf(e.target); if (el && (el as any).matches?.(':focus-visible')) enter(el, 0); }, true);
  doc.addEventListener('focusout', () => hide(), true);
  doc.addEventListener('pointerdown', () => hide(), true);
  doc.addEventListener('scroll', () => hide(), true);
  doc.addEventListener('keydown', (e) => { if (e.key === 'Escape') hide(); }, true);
}
