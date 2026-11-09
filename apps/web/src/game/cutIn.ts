// The cut-in system (Faith 2.2, rules 1.6.3; design: docs/design/faith-presence-spec.md, sections 2.3 and 3). A
// game-cutscene moment over the whole screen: the screen dims, a heavenly effect in an accent colour fills it, a
// portrait cuts in larger than the map with a line below it in large type, then the portrait pulls away into the spot
// where the effect lands, the map punches in on it, the effect plays, and a box says what happened.
//
//   showCutIn({ portrait, accent, name, line, sound, focus, box, size })
//
// It is driven by the engine's fx events (fx/faith.ts calls it for 'miracle'), so every player in the room sees it.
// Nothing here changes the game. Skippable with a click or any key during the portrait; the screen never stays blocked
// (the overlay takes clicks only while the portrait is up, and every node has a timer that removes it). Reduced motion
// (prefers-reduced-motion or the game's toggle): no zoom, no flash, no rays turning or motes rising; the portrait, the
// line and the box still show.
//
// Textures: rays (a CC0 sunburst by simranzenov, softened), the halo, motes and glow (Kenney's Particle Pack, CC0) in
// public/fx; the sting is leohpaz's CC BY 4.0 "revive" (credits in fx/fxCredits.ts and sfxCredits.ts). Only the tint,
// the rings, the lines and the panels are CSS.
import { FAITH_PATRON, type FxEvent } from '@engine';
import { sfx, reducedMotion, type Sfx } from './sfx';
import { anim as domAnim, centre, floatText, burst, tileEl, withTempo, fxPace, type Pt } from './fx/dom';
/** The cut-in's own motion: at the combat speed (fx/dom.ts, 1 outside a fight), never at a spotlight's slowed tempo (an
 *  overlay is not the action), so its animations and its timers (at(), × fxPace) keep in step. */
const anim = (el: Element, f: Keyframe[], o: KeyframeAnimationOptions) => withTempo(1, () => domAnim(el, f, o));
import { FAITH_GOLD, FAITH_INK, accentOf, patronMarkUri, patronPortrait } from './faithArt';
import { takeStage, stageBox } from './stage';

export type CutInSize = 'full' | 'small';
/** The box that says what happened (name, text, what it did). */
export interface CutInBox { kicker?: string; title: string; text?: string; did?: string }
export interface CutInOpts {
  /** The data-phc-cut-id value (the patron's id for faith), for screens and tests. */
  id?: string;
  /** The portrait's image (falls back to mark, then to nothing). */
  portrait?: string | null;
  mark?: string | null;
  /** The light's colour (rays, glow, motes, the frame); never a text colour except the small cut-in's kicker (spec 3). */
  accent: string;
  /** The small caps line above the big line ("MOTHER EMBER · MIRACLE · HEARTH UNBROKEN"). */
  kicker?: string;
  /** Who is called: shown in --faith-light wherever it appears in the line (and alone when there is no line). */
  name?: string;
  line?: string | null;
  sound?: Sfx | Sfx[] | null;
  /** Where the view lands: a tile key ("x,y"), 'map' (the map on screen), or nothing (no zoom). */
  focus?: string | 'map' | null;
  box?: CutInBox | null;
  size?: CutInSize;
  /** The moment the view lands: the effect plays now (at once on a skip). */
  onLand?: () => void;
  /** A skip ended the portrait early by savedMs: the effects queue moves up by as much (fx/play.ts hurryFx). */
  onSkip?: (savedMs: number) => void;
}
export interface CutInTiming { inMs: number; pull: number; land: number; boxAt: number; boxMs: number; total: number }
export interface CutInHandle { el: HTMLElement | null; timing: CutInTiming; skip: () => void; close: () => void }

/** The beats of a cut-in (ms from its start): the portrait in, the pull-away, the landing (the effect plays), the box.
 *  A full cut-in is about 6 s (spec 2.3: 4–6 s); reduced motion is a little shorter; a small one is 1.5 s (spec 3). */
export function cutInTiming(size: CutInSize = 'full', rm = reducedMotion()): CutInTiming {
  if (size === 'small') return rm ? { inMs: 150, pull: 1200, land: 0, boxAt: 150, boxMs: 1300, total: 1500 } : { inMs: 300, pull: 1150, land: 0, boxAt: 200, boxMs: 1250, total: 1500 };
  return rm ? { inMs: 250, pull: 2000, land: 2250, boxAt: 2450, boxMs: 3000, total: 5450 } : { inMs: 450, pull: 2300, land: 3000, boxAt: 3500, boxMs: 2400, total: 5900 };
}

/** The line in parts, the called name marked wherever it appears (any case), so it can take the faith light. Pure. */
export function lineParts(line: string, name?: string | null): { text: string; name: boolean }[] {
  const n = String(name || '').trim();
  if (!line) return n ? [{ text: n.toUpperCase(), name: true }] : [];
  if (!n) return [{ text: line, name: false }];
  const out: { text: string; name: boolean }[] = [], lo = line.toLowerCase(), nl = n.toLowerCase();
  let i = 0;
  for (let j = lo.indexOf(nl); j >= 0; j = lo.indexOf(nl, i)) {
    if (j > i) out.push({ text: line.slice(i, j), name: false });
    out.push({ text: line.slice(j, j + n.length), name: true }); i = j + n.length;
  }
  if (i < line.length) out.push({ text: line.slice(i), name: false });
  return out;
}

// ---------- the Miracle (spec 2.3) ----------
export interface MiracleCtx {
  /** The devoted's name from the character's id (the fx event names the character). */
  nameOf?: (charId: string | null | undefined) => string | undefined;
  /** Can the viewer see this tile (fog), and is it on screen? */
  visible?: (key: string) => boolean;
  /** The devoted's tile on the area map (a story Miracle has no tile of its own). */
  posOfChar?: (charId: string | null | undefined) => string | undefined;
}
/** What a Miracle's cut-in shows, from its fx event {patron, id, at, area, unit, char, name, text, line, summary}: the
 *  patron's portrait and accent, the god calling the devoted by name with the grant line, the focus (the tile where it
 *  lands when the viewer can see it, else the map), and the box (its name, its text, what it did). Pure. */
export function miracleCutIn(e: any, c: MiracleCtx = {}): CutInOpts {
  const pd: any = FAITH_PATRON[e.patron] || {};
  const pname = String(pd.name || e.patron || 'Your patron');
  const mname = String(e.name || pd.miracle?.name || 'Miracle');
  const who = c.nameOf ? c.nameOf(e.char) : undefined;
  const seen = (k: string | null | undefined) => !!k && (!c.visible || c.visible(k));
  const tile = seen(e.at) ? e.at : seen(c.posOfChar?.(e.char)) ? c.posOfChar!(e.char)! : null;
  return {
    id: e.patron, size: 'full',
    portrait: patronPortrait(String(e.patron || ''), true) || null,
    mark: patronMarkUri(String(e.patron || '')),
    accent: accentOf(e.patron, e.accent || pd.accent), // the patron's accent from data/patrons.json (spec 2)
    kicker: (pname + ' · Miracle · ' + mname).toUpperCase(),
    name: who ? who.toUpperCase() : undefined,
    line: e.line || null,
    sound: ['miracle_sting', 'soul_choir'],
    focus: tile || 'map',
    box: { kicker: ('Miracle · ' + pname).toUpperCase(), title: mname, text: String(e.text || pd.miracle?.text || ''), did: String(e.summary || '') },
  };
}

// ---------- interventions (spec section 3: the trigger for later) ----------
export interface InterventionKit {
  at: (k: string | null | undefined) => Pt | null;
  posOf: (unitId: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
  /** The patron's mark flashing at a point (fx/faith.ts mark()). */
  mark?: (src: string, p: Pt, size: number, ms: number, o?: Record<string, any>) => void;
}
/** An intervention {unit, patron, trigger, target, amount, at} (rules 1.6.3, item 744), routed here by fx/faith.ts: the
 *  map effect, at once: a sharp bell, the patron's mark flashing at the trigger, and the words "<PATRON> INTERVENES"
 *  floating there (the combat log has the full line).
 *
 *  THE CUT-IN (decision 113; docs/design/cutin-spec.md section 12, docs/design/faith-presence-spec.md section 3): the
 *  intervention's cut-in is the spotlight's, not drawn here. faith.ts intervene() emits a `spotlight` event (kind 'god':
 *  the patron, the fighter, the patron's line, the target) next to this one, and the effects queue (fx/play.ts) plays
 *  it at a gate before the action it happened in: the patron's torn eye strip over the fighter's, then the action 15%
 *  slower. That is the only path that can show it before the action plays, for every player in the room, under each
 *  player's All / Once per scene / Off setting. So this draws no second cut-in (the small cut-in drafted in the spec is
 *  not used for interventions). */
export function playIntervention(e: any, K: InterventionKit): void {
  const p = K.at(e.at || K.posOf(e.target)); K.play('hit_metal', p, { rate: 1.7, gain: 0.5 }); if (!p) return;
  const acc = accentOf(e.patron, e.accent);
  K.mark?.(patronMarkUri(e.patron), p, p.s * 1.1, 700, { glow: acc, from: 1.6, to: 1.1 });
  if (!reducedMotion()) burst('flash_star', p, p.s * 1.6, 360, { color: '#FFFFFF', from: 0.4, to: 1.3 });
  const name = String(FAITH_PATRON[e.patron]?.name || e.patron || 'Your patron').toUpperCase();
  floatText(name + ' INTERVENES', { ...p, y: p.y - p.s * 0.55 }, FAITH_INK, { small: true, delay: 120 });
}

// ---------- drawing ----------
let cssIn = false;
function ensureCss() {
  if (cssIn || typeof document === 'undefined') return; cssIn = true;
  const s = document.createElement('style'); s.id = 'phc-cutin-css';
  s.textContent = [
    '[data-phc-cut] *{box-sizing:border-box}',
    // The box: over the map, never over the action column or the composer; clicks go through it (only its × takes one);
    // under the dialogs (the Wave-cleared modal is 48) and over the effects layer (45).
    '[data-phc-cut-box]{position:fixed;left:50%;transform:translateX(-50%);z-index:46;width:min(560px,92vw);padding:14px 34px 14px 20px;background:rgba(16,21,31,.96);border:1px solid #2E3A50;border-left-width:4px;box-shadow:0 18px 50px rgba(0,0,0,.7);font-family:\'Chakra Petch\',sans-serif;color:#E7EBF3;pointer-events:none}',
    '[data-phc-cut-box] .c{position:absolute;top:4px;right:4px;width:26px;height:26px;display:grid;place-items:center;border:0;background:transparent;color:#A3AEC2;font:700 16px/1 \'Chakra Petch\',sans-serif;cursor:pointer;pointer-events:auto}',
    '[data-phc-cut-box] .c:hover,[data-phc-cut-box] .c:focus-visible{color:#FFFFFF;outline:1px solid #2E3A50}',
    '[data-phc-cut-box] .k{font-size:11px;font-weight:700;letter-spacing:.28em;color:' + FAITH_INK + '}',
    '[data-phc-cut-box] .t{font-family:\'Spectral\',serif;font-size:24px;font-weight:600;line-height:1.15;color:#FFFFFF;margin-top:2px}',
    '[data-phc-cut-box] .x{font-size:13px;line-height:1.45;color:#A3AEC2;margin-top:6px}',
    '[data-phc-cut-box] .d{font-size:14px;line-height:1.45;color:#E7EBF3;margin-top:8px;padding-top:8px;border-top:1px solid #232D3F}',
    '[data-phc-cut-box] .d b{font-weight:700;letter-spacing:.16em;font-size:10px;color:#A3AEC2;margin-right:8px}',
  ].join('');
  document.head.appendChild(s);
}
/** A white sprite from public/fx in a colour (a CSS mask, the effects layer's way). */
function tex(name: string, color: string, css: string): HTMLDivElement {
  const d = document.createElement('div'), m = 'url("/fx/' + name + '.png") center / contain no-repeat';
  d.style.cssText = 'position:absolute;pointer-events:none;background:' + color + ';-webkit-mask:' + m + ';mask:' + m + ';' + css;
  return d;
}
const el = (tag: string, css: string, text?: string) => { const d = document.createElement(tag); d.style.cssText = css; if (text != null) d.textContent = text; return d; };

const MODIFIER_KEYS = new Set(['Shift', 'Control', 'Alt', 'Meta', 'AltGraph', 'CapsLock', 'Fn', 'OS']);
/** Is this an element that takes typing (a text input, textarea, select, or editable content)? */
export function editable(t: EventTarget | null): boolean {
  const e = t as HTMLElement | null; if (!e || typeof e !== 'object' || !('tagName' in e)) return false;
  const tag = String(e.tagName || '').toUpperCase();
  if (tag === 'TEXTAREA' || tag === 'SELECT') return true;
  if (tag === 'INPUT') return !['button', 'submit', 'reset', 'checkbox', 'radio', 'range', 'color', 'file', 'image'].includes(String((e as HTMLInputElement).type || 'text').toLowerCase());
  return !!e.isContentEditable;
}
/** Where a focus lands on screen, and the map element to punch in on (the grid that holds the tile, else the biggest). */
function focusOf(focus: string | null | undefined): { p: Pt; grid: HTMLElement | null } | null {
  if (!focus || typeof document === 'undefined') return null;
  if (focus !== 'map') {
    const t = tileEl(focus), p = centre(focus);
    if (t && p) return { p, grid: (t.closest('.phc-grid') as HTMLElement | null) || t.parentElement };
  }
  const any = document.querySelector('.phc-grid') as HTMLElement | null || (document.querySelector('button.phc-tok[aria-label]')?.parentElement as HTMLElement | null);
  if (!any) return null;
  const r = any.getBoundingClientRect();
  return { p: { x: r.left + r.width / 2, y: r.top + r.height / 2, s: Math.max(40, Math.min(r.width, r.height) / 6) }, grid: any };
}

/** Where the effect box goes: centred at the top of the map's visible part (the grid, or the area map), so it never
 *  covers the action column, the FAITH tab or the story composer; with no map on screen, high in the middle. */
export function boxPlace(focus: string | null | undefined): string {
  const f = focusOf(focus) || focusOf('map'), r = f?.grid?.getBoundingClientRect();
  if (r) {
    const L = Math.max(0, r.left), R = Math.min(innerWidth, r.right), T = Math.max(0, r.top), B = Math.min(innerHeight, r.bottom);
    if (R - L >= 300 && B - T >= 160) return 'left:' + Math.round((L + R) / 2) + 'px;top:' + Math.round(T + 12) + 'px;width:' + Math.round(Math.min(560, R - L - 24)) + 'px;';
  }
  return 'top:84px;';
}

let current: CutInHandle | null = null;
const smallQueue: CutInOpts[] = [];
let smallOn = false;
const live = new Set<() => void>();
/** Close every cut-in and box now (fx/play.ts clearFx: the game changed, the room was left, the tab hidden). */
export function closeCutIns() { for (const f of [...live]) f(); live.clear(); smallQueue.length = 0; smallOn = false; current = null; }

/** Show a cut-in. Returns a handle (skip, close, its timing), or null outside a browser. A new full cut-in ends one
 *  already up (it lands at once, or its box closes); small ones wait their turn. */
export function showCutIn(o: CutInOpts): CutInHandle | null {
  if (typeof document === 'undefined') return null;
  const size: CutInSize = o.size || 'full';
  if (size === 'small' && smallOn) { smallQueue.push(o); return { el: null, timing: cutInTiming('small'), skip: () => {}, close: () => { const i = smallQueue.indexOf(o); if (i >= 0) smallQueue.splice(i, 1); } }; }
  if (size === 'full' && current) current.skip();
  ensureCss();
  const rm = reducedMotion(), T = cutInTiming(size, rm), t0 = Date.now();
  // In a fight every beat follows the combat speed (game/combatSpeed.ts): T stays in Fast's numbers (the effects queue
  // scales the Miracle's beat the same way), the waits are × k, and anim() scales itself.
  const k = fxPace();
  const timers: number[] = [];
  const at = (f: () => void, ms: number) => { timers.push(window.setTimeout(f, Math.max(0, ms * k))); };
  const nodes: HTMLElement[] = [];
  let landed = false, pulled = false, closed = false;
  // One stage (game/stage.ts, decision 113): a full cut-in clears a spotlight strip on screen and holds the next ones
  // until it lands; a small one never takes the stage.
  const freeStage = size === 'full' ? takeStage() : () => {};
  const land = () => { freeStage(); if (landed) return; landed = true; try { o.onLand?.(); } catch (err) { console.warn('cut-in land', err); } };

  // ---- the sound sting ----
  const snd = Array.isArray(o.sound) ? o.sound : o.sound ? [o.sound] : [];
  snd.forEach((s, i) => { try { sfx(s, { gain: i ? 0.55 : 1 }); } catch { /* sound never breaks the game */ } });

  // ---- the box (both sizes) ----
  const showBox = (delay: number) => {
    if (!o.box) return;
    at(() => {
      if (closed) return;
      const b = el('div', boxPlace(o.focus) + 'border-left-color:' + o.accent);
      b.dataset.phcCutBox = o.id || ''; b.setAttribute('role', 'status'); b.setAttribute('aria-live', 'polite');
      const x = el('button', '', '×') as HTMLButtonElement; x.type = 'button'; x.className = 'c'; x.setAttribute('aria-label', 'Close'); x.title = 'Close'; b.appendChild(x);
      if (o.box!.kicker) b.appendChild(el('div', '', o.box!.kicker)).className = 'k';
      b.appendChild(el('div', '', o.box!.title)).className = 't';
      if (o.box!.text) b.appendChild(el('div', '', o.box!.text)).className = 'x';
      if (o.box!.did) { const d = el('div', ''); d.className = 'd'; d.appendChild(el('b', '', 'WHAT IT DID')); d.appendChild(document.createTextNode(o.box!.did)); b.appendChild(d); }
      document.body.appendChild(b); nodes.push(b);
      anim(b, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateX(-50%) translateY(14px)' }, { opacity: 1, transform: 'translateX(-50%) translateY(0)' }], { duration: rm ? 150 : 260, easing: 'cubic-bezier(.2,.8,.2,1)' });
      let gone = false, unstage = () => {};
      const shut = () => { if (gone) return; gone = true; live.delete(shut); unstage(); anim(b, [{ opacity: 1 }, { opacity: 0 }], { duration: 220, easing: 'ease-in' }); window.setTimeout(() => b.remove(), 230 * k); };
      live.add(shut); unstage = stageBox(shut); // a spotlight cut-in that starts while the box is up closes it first
      x.addEventListener('click', shut); at(shut, o.box ? T.boxMs : 0);
    }, delay);
  };

  // ---- the small cut-in (spec 3, drafted for the intervention): from the screen edge, never blocking ----
  if (size === 'small') {
    smallOn = true;
    const root = el('div', 'position:fixed;left:0;top:18vh;z-index:59;width:min(33vw,420px);height:min(56vh,520px);pointer-events:none;overflow:hidden');
    root.dataset.phcCut = 'small'; root.dataset.phcCutId = o.id || ''; root.setAttribute('role', 'status'); root.setAttribute('aria-live', 'polite');
    const slab = el('div', 'position:absolute;inset:0;background:linear-gradient(90deg,rgba(5,7,11,.92),rgba(5,7,11,.4));clip-path:polygon(0 0,100% 0,78% 100%,0 100%);border-top:3px solid ' + o.accent);
    root.appendChild(slab);
    const src = o.portrait || o.mark;
    if (src) { const img = document.createElement('img'); img.src = src; img.alt = ''; img.style.cssText = 'position:absolute;inset:0 18% 22% 0;width:82%;height:78%;object-fit:cover;object-position:50% 18%;clip-path:polygon(0 0,100% 0,82% 100%,0 100%)'; root.appendChild(img); }
    const words = el('div', 'position:absolute;left:14px;right:22%;bottom:12px;display:flex;flex-direction:column;gap:4px');
    if (o.kicker) words.appendChild(el('div', "font:700 12px 'Chakra Petch',sans-serif;letter-spacing:.24em;color:" + o.accent, o.kicker));
    if (o.line) words.appendChild(el('div', "font:600 16px/1.3 'Spectral',serif;color:#E7EBF3;text-shadow:0 2px 6px #000", o.line));
    root.appendChild(words);
    document.body.appendChild(root); nodes.push(root);
    anim(root, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'translateX(-110%)', opacity: 0 }, { transform: 'none', opacity: 1 }], { duration: T.inMs, easing: 'cubic-bezier(.2,.8,.2,1)' });
    land(); showBox(T.boxAt);
    const end = () => {
      if (closed) return; closed = true; live.delete(end); timers.forEach(clearTimeout);
      anim(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 200 }); window.setTimeout(() => { nodes.forEach((n) => n.remove()); }, 210 * k);
      smallOn = false; const next = smallQueue.shift(); if (next) window.setTimeout(() => showCutIn(next), 220 * k);
    };
    live.add(end); at(() => { anim(root, [{ opacity: 1 }, { opacity: 0 }], { duration: 300 }); }, T.pull); at(end, T.total);
    return { el: root, timing: T, skip: end, close: end };
  }

  // ---- the full cut-in (spec 2.3) ----
  const root = el('div', 'position:fixed;inset:0;z-index:90;overflow:hidden;pointer-events:auto;cursor:pointer;contain:strict');
  root.dataset.phcCut = 'full'; root.dataset.phcCutId = o.id || ''; if (o.id) root.dataset.phcMiracle = o.id;
  root.setAttribute('role', 'dialog'); root.setAttribute('aria-modal', 'false');
  root.setAttribute('aria-label', [o.kicker, o.line || o.name].filter(Boolean).join(': ') || 'Cut-in');
  // 1. The dim, tinted toward the accent around the head (a tint: CSS).
  const veil = el('div', 'position:absolute;inset:0;background:radial-gradient(ellipse 70% 60% at 50% 34%,' + o.accent + '55 0%,rgba(10,13,19,.88) 62%,rgba(5,7,11,.96) 100%)');
  root.appendChild(veil);
  // 2. The heavenly light: rays turning slowly (two layers, the accent and the gold), the halo behind the head, motes rising.
  const fxBox = el('div', 'position:absolute;inset:0;mix-blend-mode:screen');
  const rays1 = tex('rays', o.accent, 'left:50%;top:28%;width:190vmax;height:190vmax;margin:-95vmax 0 0 -95vmax;opacity:.8');
  const rays2 = tex('rays', FAITH_GOLD, 'left:50%;top:28%;width:150vmax;height:150vmax;margin:-75vmax 0 0 -75vmax;opacity:.42;transform:rotate(9deg)');
  const halo = tex('halo', o.accent, 'left:50%;top:27%;width:78vh;height:78vh;margin:-39vh 0 0 -39vh;opacity:.85');
  const glow = tex('glow', FAITH_GOLD, 'left:50%;top:27%;width:60vh;height:60vh;margin:-30vh 0 0 -30vh;opacity:.5');
  fxBox.append(rays1, rays2, glow, halo);
  if (!rm) {
    anim(rays1, [{ transform: 'rotate(0deg) scale(.9)' }, { transform: 'rotate(22deg) scale(1.05)' }], { duration: T.land, easing: 'linear', fill: 'forwards' });
    anim(rays2, [{ transform: 'rotate(9deg)' }, { transform: 'rotate(-14deg)' }], { duration: T.land, easing: 'linear', fill: 'forwards' });
    anim(halo, [{ transform: 'scale(.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 0.85, offset: 0.2 }, { transform: 'scale(1.06)', opacity: 0.85 }], { duration: T.pull, easing: 'ease-out', fill: 'forwards' });
  }
  root.appendChild(fxBox);
  // 3. The portrait, larger than the map, over everything; its edges melt into the light.
  const pf = el('div', 'position:absolute;inset:0;will-change:transform,opacity');
  const src = o.portrait || o.mark;
  if (src) {
    const img = document.createElement('img'); img.src = src; img.alt = '';
    img.dataset.phcCutPortrait = o.portrait ? 'portrait' : 'mark';
    const fade = 'radial-gradient(ellipse 50% 60% at 50% 40%,#000 58%,transparent 100%)';
    img.style.cssText = o.portrait
      ? 'position:absolute;left:50%;top:-5vh;height:118vh;width:94.4vh;max-width:none;transform:translateX(-50%);object-fit:cover;object-position:50% 12%;-webkit-mask-image:' + fade + ';mask-image:' + fade
      : 'position:absolute;left:50%;top:30%;width:min(40vh,320px);height:min(40vh,320px);transform:translate(-50%,-50%);filter:drop-shadow(0 0 18px ' + o.accent + ') drop-shadow(0 0 48px ' + o.accent + ')';
    pf.appendChild(img);
  }
  root.appendChild(pf);
  // In front of the portrait: a veil of the light falling through it, and motes rising.
  const front = el('div', 'position:absolute;inset:0;mix-blend-mode:screen;pointer-events:none');
  const rays3 = tex('rays', FAITH_GOLD, 'left:50%;top:-30%;width:150vmax;height:150vmax;margin-left:-75vmax;opacity:.16');
  front.appendChild(rays3);
  root.appendChild(front);
  if (!rm) {
    anim(rays3, [{ transform: 'rotate(-6deg)' }, { transform: 'rotate(8deg)' }], { duration: T.land, easing: 'linear', fill: 'forwards' });
    for (let i = 0; i < 26; i++) {
      const x = 4 + ((i * 37) % 92), s = 10 + ((i * 13) % 22), d = 1600 + ((i * 211) % 1400), col = i % 3 ? FAITH_GOLD : o.accent;
      const m = tex(i % 4 ? 'mote' : 'magic_star', col, 'left:' + x + '%;bottom:-6%;width:' + s + 'px;height:' + s + 'px;opacity:0');
      front.appendChild(m);
      anim(m, [{ transform: 'translateY(0) scale(.6)', opacity: 0 }, { opacity: 0.95, offset: 0.2 }, { transform: 'translateY(-' + (60 + (i % 5) * 9) + 'vh) scale(1)', opacity: 0 }], { duration: d, delay: (i * 97) % 1500, easing: 'ease-out', fill: 'forwards' });
    }
  }
  // 4. The words: the kicker, and the god calling the devoted by name (the name in the faith light).
  const words = el('div', 'position:absolute;left:0;right:0;bottom:0;padding:16vh 6vw 9vh;display:flex;flex-direction:column;align-items:center;gap:14px;text-align:center;background:linear-gradient(to top,rgba(5,7,11,.95) 0%,rgba(5,7,11,.8) 55%,transparent 100%)');
  const rule = (w: string) => el('span', 'display:block;height:1px;width:' + w + ';background:linear-gradient(90deg,transparent,' + o.accent + ',transparent)');
  if (o.kicker) { const k = el('div', "display:flex;align-items:center;gap:14px;font:700 13px 'Chakra Petch',sans-serif;letter-spacing:.32em;color:" + FAITH_INK); k.append(rule('min(14vw,140px)'), el('span', '', o.kicker), rule('min(14vw,140px)')); k.dataset.phcCutKicker = ''; words.appendChild(k); }
  const parts = lineParts(o.line || '', o.name);
  if (parts.length) {
    const ln = el('div', "max-width:min(1180px,92vw);font:600 clamp(26px,3.5vw,52px)/1.18 'Spectral',serif;color:#E7EBF3;letter-spacing:.01em;text-shadow:0 2px 0 #000,0 0 24px rgba(0,0,0,.9)");
    ln.dataset.phcCutLine = '';
    for (const p of parts) { if (p.name) { const s = el('span', 'color:var(--faith-light,' + FAITH_GOLD + ');text-shadow:0 2px 0 #000,0 0 22px ' + FAITH_GOLD + '88', p.text); s.dataset.phcCutName = ''; ln.appendChild(s); } else ln.appendChild(document.createTextNode(p.text)); }
    words.appendChild(ln);
  }
  words.appendChild(el('div', "font:700 10px 'Chakra Petch',sans-serif;letter-spacing:.2em;color:#7F8BA1;margin-top:4px", 'CLICK OR PRESS ANY KEY TO SKIP'));
  root.appendChild(words);
  // 5. A white flash as it cuts in (not under reduced motion).
  if (!rm) { const f = el('div', 'position:absolute;inset:0;background:#FFFFFF;pointer-events:none'); root.appendChild(f); anim(f, [{ opacity: 0.7 }, { opacity: 0 }], { duration: 380, easing: 'ease-out', fill: 'forwards' }); }
  document.body.appendChild(root); nodes.push(root);

  // In.
  anim(veil, [{ opacity: 0 }, { opacity: 1 }], { duration: T.inMs, easing: 'ease-out', fill: 'forwards' });
  anim(fxBox, [{ opacity: 0 }, { opacity: 1 }], { duration: T.inMs + 200, easing: 'ease-out', fill: 'forwards' });
  anim(front, [{ opacity: 0 }, { opacity: 1 }], { duration: T.inMs + 400, easing: 'ease-out', fill: 'forwards' });
  anim(pf, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'scale(1.2) translateY(-2%)' }, { opacity: 1, transform: 'scale(1)', offset: 0.22 }, { opacity: 1, transform: 'scale(1.045)' }], { duration: rm ? T.inMs : T.pull, easing: rm ? 'ease-out' : 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  anim(words, rm ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateY(24px)' }, { opacity: 1, transform: 'none' }], { duration: rm ? T.inMs : 420, delay: rm ? 0 : 280, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'backwards' });

  // ---- the input: a click or a key skips; nothing is held once the portrait has gone ----
  // A key typed into a text box goes through and skips nothing (a co-op partner or a human Narrator typing when someone
  // else's Miracle arrives keeps the keystroke and sees the cut-in); a lone modifier (Shift for a capital) skips nothing.
  const onKey = (ev: KeyboardEvent) => {
    if (editable(ev.target) || MODIFIER_KEYS.has(ev.key)) return;
    if (!ev.ctrlKey && !ev.metaKey) { ev.preventDefault(); ev.stopPropagation(); }
    skip();
  };
  const unhook = () => { window.removeEventListener('keydown', onKey, true); root.style.pointerEvents = 'none'; root.style.cursor = ''; };
  root.addEventListener('pointerdown', (ev) => { ev.preventDefault(); ev.stopPropagation(); skip(); });
  window.addEventListener('keydown', onKey, true);

  // ---- the pull-away and the landing ----
  const removeRoot = () => { root.remove(); };
  const pull = (quick: boolean): number => {
    if (pulled) return 0; pulled = true; unhook();
    const f = focusOf(o.focus), cx = innerWidth / 2, cy = innerHeight / 2;
    const ms = quick ? 220 : T.land - T.pull;
    if (quick) bringIntoView();
    anim(veil, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
    anim(fxBox, [{ opacity: 1 }, { opacity: 0 }], { duration: ms * 0.8, easing: 'ease-in', fill: 'forwards' });
    anim(front, [{ opacity: 1 }, { opacity: 0 }], { duration: ms * 0.6, easing: 'ease-in', fill: 'forwards' });
    anim(words, [{ opacity: 1 }, { opacity: 0 }], { duration: Math.min(ms, 260), easing: 'ease-in', fill: 'forwards' });
    if (rm || quick || !f) anim(pf, [{ opacity: 1 }, { opacity: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
    else {
      // The portrait pulls away into the spot; the dark closes on it and opens; the map punches in on it.
      anim(pf, [{ opacity: 1, transform: 'scale(1.045)' }, { opacity: 0, transform: 'translate(' + (f.p.x - cx) + 'px,' + (f.p.y - cy) + 'px) scale(.08)' }], { duration: ms * 0.85, easing: 'cubic-bezier(.55,0,.8,.4)', fill: 'forwards' });
      // The iris: a full-screen dark with a hole on the spot, grown from the spot outward (a radial gradient; CSS).
      const hole = Math.max(36, f.p.s * 1.3), x = Math.round(f.p.x), y = Math.round(f.p.y);
      const spot = el('div', 'position:fixed;inset:0;z-index:61;pointer-events:none;transform-origin:' + x + 'px ' + y + 'px;background:radial-gradient(circle at ' + x + 'px ' + y + 'px,transparent ' + Math.round(hole) + 'px,' + o.accent + '66 ' + Math.round(hole + 6) + 'px,rgba(5,7,11,.82) ' + Math.round(hole + 40) + 'px)');
      spot.dataset.phcCutSpot = '';
      document.body.appendChild(spot); nodes.push(spot);
      anim(spot, [{ opacity: 0, transform: 'scale(1)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 1, transform: 'scale(1.4)', offset: 0.55 }, { opacity: 0, transform: 'scale(9)' }], { duration: ms + 450, easing: 'cubic-bezier(.4,0,.6,1)', fill: 'forwards' });
      at(() => spot.remove(), ms + 480);
      if (f.grid && !document.hidden) {
        const gr = f.grid.getBoundingClientRect(), origin = Math.round(f.p.x - gr.left) + 'px ' + Math.round(f.p.y - gr.top) + 'px';
        anim(f.grid, [{ transform: 'scale(1)', transformOrigin: origin }, { transform: 'scale(1.16)', transformOrigin: origin, offset: 0.55 }, { transform: 'scale(1)', transformOrigin: origin }], { duration: ms + 80, delay: 60, easing: 'cubic-bezier(.3,.7,.3,1)' });
      }
    }
    at(() => { removeRoot(); land(); }, ms);
    return ms;
  };
  // Skip: before the pull-away it lands at once (the box still follows); after it, the rest (the box) closes.
  const skip = () => {
    if (closed) return;
    if (pulled) { close(); return; }
    {
      timers.forEach(clearTimeout); timers.length = 0;
      const elapsed = Date.now() - t0, ms = pull(true), saved = Math.max(0, (T.land - ms) * k - elapsed); // real ms (hurryFx)
      showBox(ms + 250); at(close, ms + 250 + T.boxMs + 300);
      if (saved > 0) try { o.onSkip?.(saved); } catch { /* */ }
    }
  };
  const close = () => {
    if (closed) return; closed = true; live.delete(close); timers.forEach(clearTimeout); unhook(); freeStage();
    for (const n of nodes) n.remove();
    if (current === handle) current = null;
  };
  // Bring the tile into view under the portrait (combat.js scrolls a grid bigger than its zone; mine: false, so no zoom
  // of its own), so the pull-away lands where the tile is.
  let inView = false;
  const bringIntoView = () => { if (inView || !o.focus || o.focus === 'map') return; inView = true; try { window.dispatchEvent(new CustomEvent('phc:focus-tile', { detail: { key: o.focus, mine: false } })); } catch { /* */ } };
  at(bringIntoView, T.pull - 450);
  at(() => pull(false), T.pull);
  showBox(T.boxAt);
  at(close, T.total + 300);
  live.add(close);
  const handle: CutInHandle = { el: root, timing: T, skip, close };
  current = handle;
  return handle;
}

/** For tests and the Proving Ground: play a Miracle cut-in from an fx event by hand. */
export const miracleFromFx = (e: FxEvent, c: MiracleCtx = {}) => showCutIn(miracleCutIn(e, c));
