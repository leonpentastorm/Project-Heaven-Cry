// The camera on the page (roadmap 2c): one CameraView per map window (the fight's grid, the area map's grid). It owns
// the scrolling box's position: it glides to what the play is about (game/fx/play.ts asks before each beat), is moved
// by hand (drag, wheel, keys, the small map), draws the small map of the whole field in the window's corner and an
// arrow at the window's edge for whatever acts off screen. The arithmetic is game/camera.ts (pure, tested); this file
// is the DOM around it. Nothing here is game state or sent to the room: each player's camera is their own.
import * as C from './camera';
import type { Frame, GridAt, Pt2, Why } from './camera';
import { shiftLayer, setLayerClip } from './fx/dom';
import { battlePace } from './combatSpeed';
import { reducedMotion } from './sfx';

export interface MiniDot { key: string; color: string; me?: boolean; square?: boolean }
export interface MiniData { solid: Iterable<string>; full: Iterable<string>; half: Iterable<string>; dots: MiniDot[]; label: string }
interface ArrowRec { key: string; el: HTMLButtonElement; until: number }

export const CAMERA_CSS = [
  '.phc-cam{position:relative;width:max-content;max-width:100%}',
  '.phc-cam.phc-cam-whole{margin-inline:auto}',
  '.phc-cam-scroll{overflow:auto;scrollbar-width:thin;scrollbar-color:#2E3A50 transparent;border-radius:12px;outline:none}',
  '.phc-cam-scroll.phc-cam-on{cursor:grab}.phc-cam-scroll.phc-cam-drag,.phc-cam-scroll.phc-cam-drag *{cursor:grabbing!important}',
  '.phc-cam-scroll:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}',
  '.phc-cam-over{position:absolute;inset:0;pointer-events:none;z-index:8;overflow:hidden;border-radius:12px;font-family:\'Chakra Petch\',sans-serif}',
  '.phc-cam-mini{position:absolute;top:8px;right:16px;display:flex;flex-direction:column;align-items:flex-end;gap:4px;pointer-events:none}',
  '.phc-cam-mini>*{pointer-events:auto}',
  '.phc-cam-mini-map{display:block;padding:0;border:1px solid #3B475D;border-radius:6px;background:rgba(5,7,11,.9);box-shadow:0 2px 10px rgba(0,0,0,.6);cursor:crosshair;touch-action:none;line-height:0}',
  '.phc-cam-mini-map canvas{display:block;border-radius:5px}',
  '.phc-cam-mini-map:focus-visible,.phc-cam-mini-tog:focus-visible,.phc-cam-arrow:focus-visible{outline:2px solid #FFFFFF;outline-offset:2px}',
  '.phc-cam-mini-tog{min-height:22px;padding:0 8px;border-radius:6px;border:1px solid #2E3A50;background:rgba(16,21,31,.92);color:#A3AEC2;font:700 10px/1 \'Chakra Petch\',sans-serif;letter-spacing:.12em;cursor:pointer}',
  '.phc-cam-mini-tog:hover{border-color:#A3AEC2;color:#E7EBF3}',
  '.phc-cam-arrow{position:absolute;width:34px;height:34px;margin:-17px 0 0 -17px;padding:0;border-radius:50%;border:2px solid currentColor;background:rgba(5,7,11,.88);pointer-events:auto;cursor:pointer;display:grid;place-items:center;box-shadow:0 0 10px rgba(0,0,0,.7);animation:phcCamArrow calc(.9s * var(--phc-k, 1)) ease-in-out infinite}',
  '.phc-cam-arrow svg{display:block}',
  '@keyframes phcCamArrow{0%,100%{box-shadow:0 0 10px rgba(0,0,0,.7)}50%{box-shadow:0 0 0 4px rgba(255,255,255,.14),0 0 10px rgba(0,0,0,.7)}}',
  '@media (prefers-reduced-motion: reduce){.phc-cam-arrow{animation:none}}',
].join('');

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());
/** How long an edge arrow stays (ms at Fast; it follows the combat speed, never under 1.2 s so it can be clicked). */
export const ARROW_MS = 2600;
const MAX_ARROWS = 5;

export class CameraView {
  readonly id: string;
  private miniKey: string;
  private el: HTMLElement | null = null;
  private over: HTMLElement | null = null;
  private mapW = 0; private mapH = 0;
  private gridKey = ''; private gridAt: GridAt | null = null;
  private last = { x: 0, y: 0 };
  private goal: Pt2 | null = null; private raf = 0;
  private drag: { id: number; x: number; y: number; sx: number; sy: number; on: boolean } | null = null;
  private eatClick = 0;
  private pointerOn = false;
  private handAt = -1e9;
  private pass: { key: string; until: number } | null = null;
  private mini: MiniData | null = null; private miniRaf = 0;
  private miniBox: HTMLElement | null = null; private canvas: HTMLCanvasElement | null = null; private tog: HTMLButtonElement | null = null;
  private arrows: ArrowRec[] = []; private arrowTimer = 0;
  private off: (() => void)[] = [];
  /** The whole map is fitted to the window: there is nothing to follow. */
  overview = false;
  /** The screen laid the whole map out inside its window: there is no camera, whatever the page measures for a moment
   *  (the your-turn zoom makes a map that fits overflow its window for a second, and the small map came up on it). */
  fits = false;
  /** It is this player's turn on screen (the camera is theirs while they aim). */
  myTurn = false;
  /** The player's own unit's tile (the jump-back key). */
  home: string | null = null;
  miniHidden: boolean;
  /** Called after the small map is shown or hidden (the screen lays the map out again). */
  onMini: (() => void) | null = null;
  constructor(id: string, miniKey = 'phc.miniMap') {
    this.id = id; this.miniKey = miniKey;
    let h = false; try { h = localStorage.getItem(miniKey) === 'hidden'; } catch { /* */ }
    this.miniHidden = h;
  }

  // ---------- the window ----------
  live() { return !!this.el && this.el.isConnected; }
  /** Is there anything to scroll (the map is bigger than its window)? */
  scrolls() { const e = this.el; return !!e && this.live() && !this.overview && !this.fits && (e.scrollWidth > e.clientWidth + 1 || e.scrollHeight > e.clientHeight + 1); }
  /** Bind to the scrolling box and the overlay beside it (again after every render: cheap when nothing changed). */
  attach(scroller: HTMLElement | null, over: HTMLElement | null, mapW: number, mapH: number) {
    this.mapW = mapW; this.mapH = mapH;
    if (scroller !== this.el) {
      for (const f of this.off) f(); this.off = []; this.cancelGlide(); this.drag = null; this.arrows = []; this.gridKey = '';
      this.el = scroller; this.miniBox = null; this.canvas = null; this.tog = null;
      if (scroller) {
        this.last = { x: scroller.scrollLeft, y: scroller.scrollTop };
        const on = (t: EventTarget, ev: string, f: (e: any) => void, o?: AddEventListenerOptions | boolean) => { t.addEventListener(ev, f, o); this.off.push(() => t.removeEventListener(ev, f, o)); };
        on(scroller, 'scroll', () => this.scrolled(), { passive: true });
        on(scroller, 'pointerdown', (e: PointerEvent) => this.down(e));
        on(scroller, 'pointermove', (e: PointerEvent) => this.move(e));
        on(scroller, 'pointerup', (e: PointerEvent) => this.up(e));
        on(scroller, 'pointercancel', (e: PointerEvent) => this.up(e));
        on(scroller, 'pointerenter', () => { this.pointerOn = true; });
        on(scroller, 'pointerleave', () => { this.pointerOn = false; });
        on(scroller, 'wheel', (e: WheelEvent) => { if (!e.ctrlKey && !e.metaKey && this.scrolls()) { this.hand(); this.cancelGlide(); } }, { passive: true });
        // The click that ends a drag must not act on the tile under it.
        on(scroller, 'click', (e: MouseEvent) => { if (now() - this.eatClick < 350) { this.eatClick = 0; e.stopPropagation(); e.preventDefault(); } }, true);
      }
    }
    this.over = over;
    if (scroller) ACTIVE = this;
    this.sync();
  }
  /** After a render or a resize: the clip, the small map and the arrows follow the window. */
  sync() {
    if (!this.live()) { if (ACTIVE === this) refreshClip(); return; }
    this.el!.classList.toggle('phc-cam-on', this.scrolls());
    this.el!.parentElement?.classList.toggle('phc-cam-whole', this.overview);
    this.clip(); this.buildMini(); this.drawMini(); this.placeArrows();
  }
  private clip() {
    if (!this.live() || ACTIVE !== this) return;
    const r = this.el!.getBoundingClientRect();
    setLayerClip({ left: r.left - 6, top: r.top - 22, right: r.right + 6, bottom: r.bottom + 6 });
  }
  frame(at?: Pt2 | null): Frame { const e = this.el!; return { x: at ? at.x : e.scrollLeft, y: at ? at.y : e.scrollTop, w: e.clientWidth, h: e.clientHeight }; }
  private content() { const e = this.el!; return { w: e.scrollWidth, h: e.scrollHeight }; }
  /** Where the tiles are inside the scrolling content, measured from the page (cached until the content's size changes). */
  grid(): GridAt | null {
    const e = this.el; if (!e || !this.live() || !this.mapW || !this.mapH) return null;
    const key = e.scrollWidth + 'x' + e.scrollHeight + '|' + this.mapW + 'x' + this.mapH;
    if (key === this.gridKey && this.gridAt) return this.gridAt;
    const tiles = e.querySelectorAll<HTMLElement>('button.phc-tok');
    if (tiles.length !== this.mapW * this.mapH) return null;
    const a = tiles[0].getBoundingClientRect(), b = tiles[tiles.length - 1].getBoundingClientRect(), s = e.getBoundingClientRect();
    if (!(a.width > 0) || !(s.width > 0)) return null;
    // A dialog still opening is drawn scaled: measure in the page's own pixels.
    const k = e.offsetWidth ? s.width / e.offsetWidth : 1;
    const ax = (a.left + a.width / 2 - s.left) / k - e.clientLeft + e.scrollLeft, ay = (a.top + a.height / 2 - s.top) / k - e.clientTop + e.scrollTop;
    const bx = (b.left + b.width / 2 - s.left) / k - e.clientLeft + e.scrollLeft;
    const at = { ox: ax, oy: ay, pitch: this.mapW > 1 ? (bx - ax) / (this.mapW - 1) : a.width / k };
    // Kept only when nothing was moving the grid as it was measured (the your-turn zoom, an opening dialog).
    const gridEl = tiles[0].parentElement as any;
    const moving = Math.abs(k - 1) > 0.002 || !!(gridEl && gridEl.getAnimations && gridEl.getAnimations().some((x: Animation) => x.playState === 'running'));
    if (moving) return this.gridAt && key === this.gridKey ? this.gridAt : at;
    this.gridKey = key; this.gridAt = at;
    return this.gridAt;
  }
  /** The first and last column and row on screen (the whole map when nothing scrolls): for tooltips near an edge. */
  tiles(): { x0: number; y0: number; x1: number; y1: number } {
    const g = this.scrolls() ? this.grid() : null;
    return g ? C.frameTiles(this.frame(), g, this.mapW, this.mapH) : { x0: 0, y0: 0, x1: Math.max(0, this.mapW - 1), y1: Math.max(0, this.mapH - 1) };
  }
  /** Is this tile's centre on screen now? */
  shows(key: string): boolean { const g = this.scrolls() ? this.grid() : null; return !g || C.inFrame(this.frame(), C.pointOf(key, g)); }

  // ---------- moving ----------
  private hands(): C.Hands { return { dragging: !!(this.drag && this.drag.on), overview: this.overview, myTurn: this.myTurn, pointerOnMap: this.pointerOn, handAt: this.handAt, now: now() }; }
  private hand() { this.handAt = now(); }
  private cancelGlide() { if (this.raf) cancelAnimationFrame(this.raf); this.raf = 0; this.goal = null; }
  private set(x: number, y: number) { const e = this.el; if (!e) return; e.scrollLeft = x; e.scrollTop = y; this.scrolled(); }
  private scrolled() {
    const e = this.el; if (!e) return;
    const dx = e.scrollLeft - this.last.x, dy = e.scrollTop - this.last.y;
    if (!dx && !dy) return;
    this.last = { x: e.scrollLeft, y: e.scrollTop };
    shiftLayer(dx, dy);
    this.placeArrows();
    if (!this.miniRaf) this.miniRaf = requestAnimationFrame(() => { this.miniRaf = 0; this.drawMini(); });
  }
  /** Move to a scroll offset over ms (0: a cut). */
  glide(to: Pt2, ms: number) {
    const e = this.el; if (!e) return;
    if (this.goal && Math.abs(this.goal.x - to.x) < 1 && Math.abs(this.goal.y - to.y) < 1) return;
    this.cancelGlide();
    if (!(ms > 0) || (typeof document !== 'undefined' && document.hidden)) { this.set(to.x, to.y); return; }
    const from = { x: e.scrollLeft, y: e.scrollTop }, t0 = now();
    this.goal = to;
    const step = () => {
      const k = C.ease((now() - t0) / ms);
      this.set(from.x + (to.x - from.x) * k, from.y + (to.y - from.y) * k);
      if (k >= 1 || !this.live()) { this.raf = 0; this.goal = null; return; }
      this.raf = requestAnimationFrame(step);
    };
    this.raf = requestAnimationFrame(step);
  }
  private margin(g: GridAt) { const e = this.el!; return Math.min(g.pitch * 1.5, e.clientWidth / 4, e.clientHeight / 4); }
  /** Where the camera would go to show these tiles from the offset `from` (or from where it is, or is gliding to), or
   *  null when it would stay. The effects queue plans a batch with this before any of it plays. */
  plan(keys: string[], from: Pt2 | null, why: Why): Pt2 | null {
    if (!keys.length || !this.scrolls()) return null;
    const g = this.grid(); if (!g) return null;
    return C.aim(this.frame(from || this.goal), this.content(), keys.map((k) => C.pointOf(k, g)), this.margin(g), why === 'turn-mine' || why === 'ask');
  }
  /** Show these tiles (the first must show; the rest when they fit), if the camera may move by itself now. Returns
   *  whether it moves. */
  follow(keys: string[], why: Why, instant = false): boolean {
    // A turn on your own unit's tile is your turn, whoever asks (the effects queue and the turn banner both do): one
    // glide to the same place, not two that meet half-way.
    if (why === 'turn' && keys.length === 1 && keys[0] === this.home) why = 'turn-mine';
    if (!this.live() || !C.mayFollow(this.hands(), why)) return false;
    if (why === 'turn' && this.pass && this.pass.key === keys[0] && now() < this.pass.until) return false;
    const to = this.plan(keys, null, why); if (!to) return false;
    this.glide(to, instant ? 0 : C.glideMs(battlePace(), reducedMotion()));
    return true;
  }
  /** The turn starting on this tile does not bring the camera (the effects queue: its unit acts on a far tile at once,
   *  and the camera goes straight there). Your own turn still centres on your unit. */
  passTurn(key: string) { this.pass = { key, until: now() + 1500 }; }
  /** follow, and an arrow at the window's edge for each of these tiles that still does not show. */
  show(keys: string[], why: Why, tag?: { color: string; label: string }, move = true) {
    if (move) this.follow(keys, why);
    if (!tag || !this.scrolls()) return;
    const g = this.grid(); if (!g) return;
    const f = this.frame(this.goal);
    for (const k of keys) if (!C.inFrame(f, C.pointOf(k, g))) this.arrow(k, tag.color, tag.label);
  }
  /** The jump-back key: centre the player's own unit. */
  goHome(): boolean { if (!this.home || !this.live()) return false; this.follow([this.home], 'ask'); return true; }
  /** Arrow keys and WASD: step the view. */
  pan(dir: Pt2) {
    if (!this.scrolls()) return false;
    const g = this.grid(), e = this.el!; if (!g) return false;
    const base = this.goal || { x: e.scrollLeft, y: e.scrollTop };
    const to = C.clampScroll(base.x + dir.x * g.pitch * C.PAN_TILES, base.y + dir.y * g.pitch * C.PAN_TILES, this.content(), this.frame());
    this.hand(); this.glide(to, reducedMotion() ? 0 : 110);
    return true;
  }

  // ---------- dragging the map ----------
  private down(e: PointerEvent) {
    if (e.button !== 0 || e.pointerType === 'touch' || !this.scrolls()) return;
    const t = e.target as Element | null;
    if (t && t.closest && t.closest('.phc-cam-over')) return;
    this.drag = { id: e.pointerId, x: e.clientX, y: e.clientY, sx: this.el!.scrollLeft, sy: this.el!.scrollTop, on: false };
  }
  private move(e: PointerEvent) {
    const d = this.drag; if (!d || d.id !== e.pointerId) return;
    if (!(e.buttons & 1)) { this.up(e); return; }
    const dx = e.clientX - d.x, dy = e.clientY - d.y;
    if (!d.on) {
      if (!C.isDrag(dx, dy)) return;
      d.on = true; this.cancelGlide(); this.el!.classList.add('phc-cam-drag');
      try { this.el!.setPointerCapture(e.pointerId); } catch { /* */ }
    }
    this.hand(); this.set(d.sx - dx, d.sy - dy);
    e.preventDefault();
  }
  private up(e: PointerEvent) {
    const d = this.drag; if (!d || d.id !== e.pointerId) return;
    this.drag = null;
    if (!d.on) return;
    this.eatClick = now(); this.hand();
    this.el?.classList.remove('phc-cam-drag');
    try { this.el?.releasePointerCapture(e.pointerId); } catch { /* */ }
  }
  /** Is the player dragging the map right now? */
  dragging() { return !!(this.drag && this.drag.on); }

  // ---------- the small map ----------
  setMini(m: MiniData | null) { this.mini = m; this.buildMini(); this.drawMini(); }
  toggleMini() {
    this.miniHidden = !this.miniHidden;
    try { if (this.miniHidden) localStorage.setItem(this.miniKey, 'hidden'); else localStorage.removeItem(this.miniKey); } catch { /* */ }
    this.buildMini(); this.drawMini(); this.onMini?.();
  }
  /** The small map's longest side: 150 px; 96 px on a narrow window (under 1000 px wide), where the map's window is small. */
  private miniPx() { return typeof innerWidth === 'number' && innerWidth < 1000 ? 96 : C.MINI_PX; }
  /** Is the small map up (the map is bigger than its window and the player has not hidden it)? */
  miniShown() { return this.scrolls() && !this.miniHidden; }
  private buildMini() {
    const host = this.over; if (!host || !host.isConnected) return;
    if (!this.miniBox || this.miniBox.parentElement !== host) {
      const box = document.createElement('div'); box.className = 'phc-cam-mini'; box.setAttribute('role', 'group'); box.setAttribute('aria-label', 'Small map');
      const map = document.createElement('button'); map.type = 'button'; map.className = 'phc-cam-mini-map';
      const cv = document.createElement('canvas'); cv.setAttribute('aria-hidden', 'true'); map.appendChild(cv);
      const tog = document.createElement('button'); tog.type = 'button'; tog.className = 'phc-cam-mini-tog';
      tog.addEventListener('click', (e) => { e.stopPropagation(); this.toggleMini(); });
      const go = (e: PointerEvent, cut: boolean) => {
        const g = this.grid(); if (!g) return;
        const r = cv.getBoundingClientRect(), m = C.miniGeom(this.mapW, this.mapH, this.miniPx());
        const to = C.miniToScroll((e.clientX - r.left) * (m.w / Math.max(1, r.width)), (e.clientY - r.top) * (m.h / Math.max(1, r.height)), m, g, this.frame(), this.content());
        this.hand(); this.glide(to, cut || reducedMotion() ? 0 : 140);
      };
      let held = -1;
      map.addEventListener('pointerdown', (e) => { if (e.button !== 0) return; held = e.pointerId; try { map.setPointerCapture(e.pointerId); } catch { /* */ } go(e, false); e.preventDefault(); map.focus(); });
      map.addEventListener('pointermove', (e) => { if (held === e.pointerId && (e.buttons & 1)) go(e, true); });
      const end = (e: PointerEvent) => { if (held === e.pointerId) { held = -1; try { map.releasePointerCapture(e.pointerId); } catch { /* */ } } };
      map.addEventListener('pointerup', end); map.addEventListener('pointercancel', end);
      box.appendChild(map); box.appendChild(tog); host.appendChild(box);
      this.miniBox = box; this.canvas = cv; this.tog = tog;
    }
    const can = this.scrolls(), shown = can && !this.miniHidden, map = this.miniBox.firstElementChild as HTMLElement;
    this.miniBox.style.display = can ? 'flex' : 'none';
    map.style.display = shown ? 'block' : 'none';
    map.setAttribute('aria-label', 'Small map of the whole field' + (this.mini ? ': ' + this.mini.label : '') + '. The white frame is the part on screen. Click or drag to move the view; the arrow keys move it too.');
    this.tog!.textContent = shown ? 'HIDE ▴' : 'SMALL MAP ▾';
    this.tog!.setAttribute('aria-label', shown ? 'Hide the small map' : 'Show the small map');
    this.tog!.setAttribute('aria-expanded', shown ? 'true' : 'false');
    this.tog!.title = shown ? 'Hide the small map' : 'Show the small map of the whole field';
  }
  private drawMini() {
    const cv = this.canvas, m0 = this.mini; if (!cv || !m0 || !this.miniShown()) return;
    const m = C.miniGeom(this.mapW, this.mapH, this.miniPx()), dpr = Math.max(1, Math.min(3, (typeof devicePixelRatio === 'number' && devicePixelRatio) || 1));
    if (cv.width !== Math.round(m.w * dpr) || cv.height !== Math.round(m.h * dpr)) { cv.width = Math.round(m.w * dpr); cv.height = Math.round(m.h * dpr); cv.style.width = m.w + 'px'; cv.style.height = m.h + 'px'; }
    const c = cv.getContext('2d'); if (!c) return;
    c.setTransform(dpr, 0, 0, dpr, 0, 0); c.clearRect(0, 0, m.w, m.h);
    c.fillStyle = '#0D1119'; c.fillRect(0, 0, m.w, m.h);
    const cell = (k: string, ink: string) => { const [x, y] = k.split(',').map(Number); c.fillStyle = ink; c.fillRect(x * m.tile, y * m.tile, m.tile, m.tile); };
    for (const k of m0.half) cell(k, '#3A2E1A');
    for (const k of m0.full) cell(k, '#6B5430');
    for (const k of m0.solid) cell(k, '#2A3448');
    const r = Math.max(2.4, m.tile * 0.46);
    for (const d of m0.dots) {
      const [x, y] = d.key.split(',').map(Number), cx = (x + 0.5) * m.tile, cy = (y + 0.5) * m.tile;
      c.beginPath(); if (d.square) c.rect(cx - r, cy - r, r * 2, r * 2); else c.arc(cx, cy, r, 0, Math.PI * 2);
      c.fillStyle = d.color; c.fill(); c.lineWidth = 1; c.strokeStyle = '#05070B'; c.stroke();
      if (d.me) { c.beginPath(); c.arc(cx, cy, r + 2, 0, Math.PI * 2); c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.5; c.stroke(); }
    }
    const g = this.grid(); if (!g) return;
    const f = C.miniFrame(this.frame(), g, m);
    c.strokeStyle = '#FFFFFF'; c.lineWidth = 1.5; c.strokeRect(f.x + 0.75, f.y + 0.75, Math.max(2, f.w - 1.5), Math.max(2, f.h - 1.5));
    cv.setAttribute('data-frame', [f.x, f.y, f.w, f.h].map((v) => Math.round(v)).join(','));
  }

  // ---------- nothing happens unseen ----------
  /** An arrow at the window's edge toward a tile that is off screen: in the side's colour, named for screen readers,
   *  and a click goes there. It leaves after a moment, or as soon as the tile shows. */
  arrow(key: string, color: string, label: string) {
    const host = this.over; if (!host || !host.isConnected || !this.scrolls() || this.shows(key)) return;
    const life = Math.max(1200, ARROW_MS * battlePace());
    const had = this.arrows.find((a) => a.key === key);
    if (had) { had.until = now() + life; had.el.style.color = color; had.el.setAttribute('aria-label', label + ' is off screen. Go there.'); had.el.title = label; this.sweepArrows(); return; }
    while (this.arrows.length >= MAX_ARROWS) this.arrows.shift()!.el.remove();
    const b = document.createElement('button'); b.type = 'button'; b.className = 'phc-cam-arrow'; b.style.color = color;
    b.setAttribute('data-cam-arrow', key); b.setAttribute('aria-label', label + ' is off screen. Go there.'); b.title = label;
    b.innerHTML = '<svg width="18" height="18" viewBox="0 0 18 18" aria-hidden="true"><path d="M17 9 L4 4.5 L4 13.5 Z" fill="currentColor"/></svg>';
    b.addEventListener('click', (e) => { e.stopPropagation(); this.follow([key], 'ask'); this.dropArrow(key); });
    host.appendChild(b);
    this.arrows.push({ key, el: b, until: now() + life });
    this.placeArrows(); this.sweepArrows();
  }
  private dropArrow(key: string) { this.arrows = this.arrows.filter((a) => { if (a.key !== key) return true; a.el.remove(); return false; }); }
  private sweepArrows() {
    clearTimeout(this.arrowTimer);
    const t = now(); for (const a of [...this.arrows]) if (a.until <= t || !a.el.isConnected) this.dropArrow(a.key);
    if (this.arrows.length) this.arrowTimer = window.setTimeout(() => this.sweepArrows(), Math.max(60, Math.min(...this.arrows.map((a) => a.until)) - t + 20));
  }
  private placeArrows() {
    if (!this.arrows.length) return;
    const g = this.live() && this.scrolls() ? this.grid() : null;
    if (!g) { for (const a of [...this.arrows]) this.dropArrow(a.key); return; }
    const f = this.frame();
    for (const a of [...this.arrows]) {
      const p = C.pointOf(a.key, g), at = C.edgeArrow({ w: f.w, h: f.h }, { x: p.x - f.x, y: p.y - f.y });
      if (!at) { this.dropArrow(a.key); continue; }
      a.el.style.left = at.x + 'px'; a.el.style.top = at.y + 'px';
      const svg = a.el.firstElementChild as HTMLElement | null; if (svg) svg.style.transform = 'rotate(' + (at.angle * 180 / Math.PI).toFixed(1) + 'deg)';
    }
  }
  /** For the browser suites: where the camera is. */
  debug() {
    const g = this.live() ? this.grid() : null;
    return { id: this.id, live: this.live(), scrolls: this.scrolls(), overview: this.overview, myTurn: this.myTurn, home: this.home, frame: this.live() ? this.frame() : null, grid: g, tiles: this.live() ? this.tiles() : null, arrows: this.arrows.map((a) => a.key), mini: this.miniShown(), gliding: !!this.goal };
  }
}

// ---------- the camera on screen now ----------
let ACTIVE: CameraView | null = null;
/** The camera of the map on screen (the fight's, or the open area map's), or null. */
export const activeCamera = (): CameraView | null => (ACTIVE && ACTIVE.live() ? ACTIVE : null);
/** No camera on screen any more (the screen changed): the effects layer is whole again. */
export function refreshClip() { if (!ACTIVE || !ACTIVE.live()) setLayerClip(null); }
if (typeof window !== 'undefined' && typeof window.addEventListener === 'function') {
  (window as any).__phcCamera = () => (activeCamera() ? activeCamera()!.debug() : null);
  window.addEventListener('resize', () => { const c = activeCamera(); if (c) c.sync(); else refreshClip(); });
}
