// The camera's arithmetic (roadmap 2c). A map can be bigger than the window (26 × 26 since rules 1.16); the window is
// a camera on it: a scrolling box that keeps the tile size players are used to, follows the play, and is moved by hand.
// Everything here is pure (tested in camera.test.ts); game/cameraView.ts applies it to the page, for the fight
// (screens/combat.js) and the area map (screens/main.js) alike. Nothing about a camera is game state: it is local to
// one browser, so each co-op player has their own.

export interface Size { w: number; h: number }
export interface Pt2 { x: number; y: number }
/** The part of the map on screen: the scroll offset and the box's size, in the map's own pixels. */
export interface Frame { x: number; y: number; w: number; h: number }
/** Where the tiles are inside the scrolling content: the centre of tile 0,0 and the distance between two tiles. */
export interface GridAt { ox: number; oy: number; pitch: number }

// ---------- the size on screen ----------
/** The map players are used to: until rules 1.16 every fight was 16 × 11, fitted to the window. The camera shows
 *  that many tiles at that size, whatever the map's own size. */
export const REF_W = 16, REF_H = 11;
/** The fight grid's own measures at 100%: 48 px from one tile to the next, 36 px of edge (labels and padding). */
export const GRID_PITCH = 48, GRID_EDGE = 36;
export const naturalSize = (w: number, h: number): Size => ({ w: GRID_PITCH * w + GRID_EDGE, h: GRID_PITCH * h + GRID_EDGE });
export const SCALE_MAX = 2.5, USUAL_MIN = 0.5, USUAL_MIN_NARROW = 0.6, OVERVIEW_MIN = 0.25;
const pct = (z: number) => Math.floor(z * 100 + 1e-6) / 100;
/** The usual size: what a 16 × 11 map fitted to this room came to (so the tiles are the size they always were). A map
 *  smaller than that fits whole, as before. */
export function usualScale(availW: number, availH: number, mapW: number, mapH: number, narrow = false): number {
  const n = naturalSize(Math.min(mapW, REF_W), Math.min(mapH, REF_H)), fit = Math.min(availW / n.w, availH / n.h);
  return pct(Math.max(narrow ? USUAL_MIN_NARROW : USUAL_MIN, Math.min(SCALE_MAX, Number.isFinite(fit) ? fit : 1)));
}
/** The overview: the whole map fitted to the room (never bigger than the usual size). */
export function overviewScale(availW: number, availH: number, mapW: number, mapH: number, narrow = false): number {
  const n = naturalSize(mapW, mapH), fit = Math.min(availW / n.w, availH / n.h);
  return pct(Math.max(OVERVIEW_MIN, Math.min(usualScale(availW, availH, mapW, mapH, narrow), Number.isFinite(fit) ? fit : 1)));
}
/** Does the whole map fit the room at this size (no camera needed)? */
export const fitsWhole = (availW: number, availH: number, mapW: number, mapH: number, scale: number) => { const n = naturalSize(mapW, mapH); return n.w * scale <= availW + 1 && n.h * scale <= availH + 1; };

// ---------- frames and points ----------
export function clampScroll(x: number, y: number, content: Size, view: Size): Pt2 {
  return { x: Math.round(Math.max(0, Math.min(Math.max(0, content.w - view.w), x))), y: Math.round(Math.max(0, Math.min(Math.max(0, content.h - view.h), y))) };
}
/** Is the point on screen, at least margin px inside the frame's edge? */
export const inFrame = (f: Frame, p: Pt2, margin = 0) => p.x >= f.x + margin && p.x <= f.x + f.w - margin && p.y >= f.y + margin && p.y <= f.y + f.h - margin;
export const pointOf = (key: string, g: GridAt): Pt2 => { const [x, y] = key.split(',').map(Number); return { x: g.ox + g.pitch * x, y: g.oy + g.pitch * y }; };
/** The tiles whose centre is on screen: the first and last column and row. */
export function frameTiles(f: Frame, g: GridAt, mapW: number, mapH: number): { x0: number; y0: number; x1: number; y1: number } {
  const lo = (v: number, o: number) => Math.ceil((v - o) / g.pitch - 1e-6), hi = (v: number, o: number) => Math.floor((v - o) / g.pitch + 1e-6);
  const x0 = Math.max(0, Math.min(mapW - 1, lo(f.x, g.ox))), y0 = Math.max(0, Math.min(mapH - 1, lo(f.y, g.oy)));
  return { x0, y0, x1: Math.max(x0, Math.min(mapW - 1, hi(f.x + f.w, g.ox))), y1: Math.max(y0, Math.min(mapH - 1, hi(f.y + f.h, g.oy))) };
}
/** Where to move the camera so these points show, or null when it should stay. The first point is the one that must
 *  show (a target, the unit whose turn it is); the others (the attacker) are kept in frame with it when they all fit,
 *  and then the view centres between them. force: centre even when everything already shows (the jump-back key, your
 *  own turn). A point within margin of the map's own edge can't be brought further in: that is not a reason to move. */
export function aim(f: Frame, content: Size, pts: Pt2[], margin = 0, force = false, dead = 0): Pt2 | null {
  if (!pts.length) return null;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const fits = x1 - x0 + 2 * margin <= f.w && y1 - y0 + 2 * margin <= f.h, want = fits ? pts : [pts[0]];
  if (!force && want.every((p) => inFrame(f, p, margin))) return null;
  const c = fits ? { x: (x0 + x1) / 2, y: (y0 + y1) / 2 } : pts[0];
  const to = clampScroll(c.x - f.w / 2, c.y - f.h / 2, content, f);
  // The dead zone (MOVE.DEAD_ZONE_TILES): a centring that would only nudge the view, its points all showing, is not
  // made (a forced one too: your own turn on the unit already in the middle of the window).
  if (dead > 0 && Math.hypot(to.x - f.x, to.y - f.y) < dead && want.every((p) => inFrame(f, p, margin))) return null;
  return Math.abs(to.x - f.x) < 1 && Math.abs(to.y - f.y) < 1 ? null : to;
}

// ---------- when the camera may move by itself ----------
/** Why the camera wants to move: your own turn starting, another unit's turn, an effect about to play, or the player
 *  asking (the jump-back key, a click on a portrait, an arrow or the small map). */
export type Why = 'turn-mine' | 'turn' | 'beat' | 'ask';
export interface Hands { dragging: boolean; overview: boolean; myTurn: boolean; pointerOnMap: boolean; handAt: number; now: number }
/** After the player moves the camera on their own turn, it is theirs for this long. */
export const HANDS_OFF_MS = 4000;
/** On someone else's turn a hand move only holds the camera for a moment (the play goes on elsewhere). */
export const HANDS_OFF_OTHERS_MS = 1500;
/** May the camera move by itself now? Never in the overview (everything shows) or during a drag; on your own turn not
 *  while your pointer is over the map (you are aiming) nor for a few seconds after you moved the camera by hand. Your
 *  own turn starting brings it back to your unit all the same; what the player asks for always happens. */
export function mayFollow(h: Hands, why: Why): boolean {
  if (why === 'ask') return true;
  if (h.overview || h.dragging) return false;
  if (why === 'turn-mine') return true;
  if (h.myTurn) return !h.pointerOnMap && h.now - h.handAt >= HANDS_OFF_MS;
  return h.now - h.handAt >= HANDS_OFF_OTHERS_MS;
}
// ---------- the camera move (Leon, 12 Nov 2026: "a proper animation with beginning, start, zoom, duration and squash
// and stretch") ----------
// Every move the camera makes by itself is planned by planMove and played by sampleMove (cameraView.ts plays it on
// requestAnimationFrame). Its shape: a slight lean back (anticipation), an eased departure, a cruise, a long eased
// arrival that runs a few pixels past the mark, and a critically damped settle back onto it (no bounce). On a long
// move the view pulls back a little in the middle and comes back in on arrival (a dolly arc, like a map app flying
// between two places); it always ends at exactly the zoom it started with. The numbers, to tune by feel:
export const MOVE = {
  /** A hop of a tile or two, at Normal speed (ms). Lower: snappier small corrections; under ~220 they read as a jump. */
  HOP_MS: 300,
  /** A move across the map, at Normal speed (ms): the cap. Higher: more cinematic, but every enemy turn waits on it. */
  CROSS_MS: 860,
  /** How far "across the map" is, in tiles: a move this long or longer takes CROSS_MS and gets the whole zoom arc. */
  CROSS_TILES: 18,
  /** The share of the move spent speeding up; the cruise is what is left between this and ARRIVE. */
  DEPART: 0.3,
  /** The share spent slowing down into the mark. Longer than DEPART: the camera arrives gently, it never brakes. */
  ARRIVE: 0.42,
  /** The lean back before leaving (px on screen) and the share of the move it lasts. 0 turns it off. Above ~6 px it
   *  reads as the camera hesitating. */
  ANTICIPATE_PX: 3, ANTICIPATE_SHARE: 0.14,
  /** How far past the mark the arrival runs (px, at most), and from what distance (tiles) a move has it at all. */
  OVERSHOOT_PX: 6, OVERSHOOT_FROM_TILES: 3,
  /** The last share of the move, in which the overshoot comes back onto the mark (critically damped: no bounce). */
  SETTLE_SHARE: 0.2,
  /** The settle's stiffness: higher comes back faster (7 leaves under a tenth of a pixel; below 5 it ends on a snap). */
  SETTLE_STIFFNESS: 7,
  /** The zoom arc: how much the view pulls back at most in the middle of a long move (0.1: to 90% of the size), and
   *  from what distance (tiles) it starts; it grows to its whole size at CROSS_TILES. 0 turns it off. */
  ARC_MAX: 0.1, ARC_FROM_TILES: 3,
  /** A move the player asked for or their own turn's centring is not made when the view is already this close (tiles):
   *  the view does not twitch every turn. */
  DEAD_ZONE_TILES: 1,
  /** Under reduced motion: a plain short ease, no lean, no overshoot, no arc (ms, at any speed but the test pace). */
  REDUCED_MS: 160,
  /** When the beat a move serves comes sooner than the planned move, the move is squeezed, never below this (ms at
   *  Fast, following the combat speed): what every move took before rules had a shape. */
  SQUEEZE_MIN_MS: 250,
  /** A key press (arrows, WASD) or a click on the small map: the player's own short, plain glide (ms, any speed). */
  HAND_MS: 120,
};
/** The plain glide's length at Fast (the shortest a squeezed move gets), following the combat speed; none under
 *  reduced motion. */
export const GLIDE_MS = MOVE.SQUEEZE_MIN_MS;
export const glideMs = (pace = 1, reduced = false) => (reduced ? 0 : Math.round(GLIDE_MS * pace));
/** Ease in and out (0..1 → 0..1). */
export const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
const clamp01 = (v: number) => (v <= 0 ? 0 : v >= 1 ? 1 : v);
/** Normal plays at this rate of Fast (combatSpeed.ts NORMAL_RATE): MOVE's times are at Normal, the pace is 1 at Fast. */
const NORMAL_RATE = 0.85;

/** How long a move of this many tiles takes (ms) at this pace (combatSpeed battlePace: 1 at Fast, 1/0.85 at Normal,
 *  0.04 at the test pace). Grows with the distance (fast at first, then slower: a square root) up to the cap. */
export function moveMs(tiles: number, pace = 1, reduced = false): number {
  if (reduced) return Math.round(pace < 0.5 ? MOVE.REDUCED_MS * pace : MOVE.REDUCED_MS);
  const k = Math.sqrt(clamp01((tiles - 1) / (MOVE.CROSS_TILES - 1)));
  return Math.round((MOVE.HOP_MS + (MOVE.CROSS_MS - MOVE.HOP_MS) * k) * pace * NORMAL_RATE);
}
/** A planned move: from, to (scroll offsets), the velocity it starts with (px/ms: a move that interrupts another keeps
 *  going), the zoom-arc scale it starts at, its length, and its shape. */
export interface Move {
  from: Pt2; to: Pt2; v0: Pt2; s0: number; ms: number;
  /** The pull-back at the middle (0.08: the view at 92%). */ arc: number;
  /** The overshoot past the mark (px on each axis, already kept inside the map). */ over: Pt2;
  /** The lean back (px on each axis). */ lean: Pt2;
  plain: boolean;
}
export interface MoveOpts {
  /** One tile's size on screen (px). */ pitch: number;
  pace?: number; reduced?: boolean;
  /** The velocity now (px/ms) and the zoom-arc scale now: an interrupted move blends from them. */
  v0?: Pt2; s0?: number;
  /** The map's own zoom now and the smallest it may go: the arc never takes the view below it. */
  zoom?: number; zoomMin?: number;
  /** The largest scroll offsets: the overshoot never runs past the map's edge. */
  max?: Pt2;
  /** A plain glide (the player's own key or small map): eased, no lean, no overshoot, no arc. */
  plain?: boolean;
  /** The length, when the caller sets it (a squeezed move, a hand glide). */
  ms?: number;
}
/** Plan the camera's move from `from` to `to`. Pure (camera.test.ts). */
export function planMove(from: Pt2, to: Pt2, o: MoveOpts): Move {
  const dx = to.x - from.x, dy = to.y - from.y, d = Math.hypot(dx, dy), tiles = d / Math.max(1, o.pitch);
  const reduced = !!o.reduced, plain = reduced || !!o.plain, v0 = reduced || !o.v0 ? { x: 0, y: 0 } : o.v0;
  const ms = Math.max(1, Math.round(o.ms ?? moveMs(tiles, o.pace ?? 1, reduced)));
  const ux = d ? dx / d : 0, uy = d ? dy / d : 0;
  let arc = 0, over = { x: 0, y: 0 }, lean = { x: 0, y: 0 };
  if (!plain) {
    arc = MOVE.ARC_MAX * clamp01((tiles - MOVE.ARC_FROM_TILES) / (MOVE.CROSS_TILES - MOVE.ARC_FROM_TILES));
    const z = o.zoom || 1, zMin = o.zoomMin || 0;
    if (zMin > 0) arc = Math.min(arc, Math.max(0, 1 - zMin / z));
    if (tiles >= MOVE.OVERSHOOT_FROM_TILES) {
      const n = Math.min(MOVE.OVERSHOOT_PX, d * 0.02), m = o.max;
      // (kept inside the map: a run past the edge would be cut flat by the scroll's own limit)
      const keep = (v: number, at: number, hi: number | undefined) => (hi == null ? v : Math.max(-at, Math.min(hi - at, v)));
      over = { x: keep(ux * n, to.x, m?.x), y: keep(uy * n, to.y, m?.y) };
    }
    // A move that starts from rest leans back first; one that interrupts another is already under way.
    if (Math.hypot(v0.x, v0.y) < 0.02 && tiles >= 1) lean = { x: -ux * MOVE.ANTICIPATE_PX, y: -uy * MOVE.ANTICIPATE_PX };
  }
  return { from: { ...from }, to: { ...to }, v0, s0: o.s0 ?? 1, ms, arc, over, lean, plain };
}
/** The travel's progress (0..1 → 0..1): a smooth (sine) speed-up over DEPART, a steady cruise, a smooth slow-down over
 *  ARRIVE. Its speed is continuous and zero at both ends. */
export function travel(u: number, a = MOVE.DEPART, b = MOVE.ARRIVE): number {
  u = clamp01(u);
  const vmax = 1 / (1 - a / 2 - b / 2), PI = Math.PI;
  if (u < a) return vmax * (u / 2 - (a / (2 * PI)) * Math.sin((PI * u) / a));
  if (u <= 1 - b) return vmax * (a / 2 + (u - a));
  const w = u - (1 - b);
  return Math.min(1, vmax * (a / 2 + (1 - a - b) + w / 2 + (b / (2 * PI)) * Math.sin((PI * w) / b)));
}
/** Where the camera is t ms into a move: the scroll offset, the zoom-arc scale (1: none) and whether it is over. */
export function sampleMove(m: Move, t: number): { x: number; y: number; scale: number; done: boolean } {
  if (!(t < m.ms)) return { x: m.to.x, y: m.to.y, scale: 1, done: true };
  const u = clamp01(t / m.ms), T = m.ms;
  const dx = m.to.x - m.from.x, dy = m.to.y - m.from.y;
  // The velocity it came in with fades out (a Hermite term: full at the start, gone with no speed at the end).
  const h = T * (u - 2 * u * u + u * u * u);
  let x: number, y: number, s: number;
  if (m.plain) {
    const p = ease(u); x = m.from.x + dx * p + m.v0.x * h; y = m.from.y + dy * p + m.v0.y * h; s = 1;
  } else {
    const settle = m.over.x || m.over.y ? MOVE.SETTLE_SHARE : 0, ut = settle ? clamp01(u / (1 - settle)) : u, p = travel(ut);
    // the run to the mark and past it, then the overshoot comes back, critically damped
    let ox = m.over.x * p, oy = m.over.y * p;
    if (settle && u > 1 - settle) {
      const k = (u - (1 - settle)) / settle, w = MOVE.SETTLE_STIFFNESS, rest = (1 + w) * Math.exp(-w);
      const f = (1 + w * k) * Math.exp(-w * k) - rest * k; ox = m.over.x * f; oy = m.over.y * f;
    }
    // the lean back: out and in again (a sine bump, smooth at both ends) while the departure picks up
    const a = MOVE.ANTICIPATE_SHARE, lb = u < a ? Math.sin((Math.PI * u) / a) ** 2 : 0;
    x = m.from.x + dx * p + ox + m.lean.x * lb + m.v0.x * h;
    y = m.from.y + dy * p + oy + m.lean.y * lb + m.v0.y * h;
    s = 1 - m.arc * Math.sin(Math.PI * ut) ** 2;
  }
  // An arc already under way when this move started comes back to 1 smoothly (Hermite: no step, no kink at the end).
  s += (m.s0 - 1) * (1 - u) * (1 - u) * (1 + 2 * u);
  return { x, y, scale: s, done: false };
}
/** The velocity (px/ms) and the zoom-arc scale t ms into a move: what a move that interrupts it starts from. */
export function moveState(m: Move, t: number): { x: number; y: number; v: Pt2; scale: number } {
  const a = sampleMove(m, t), b = sampleMove(m, Math.max(0, t - 8)), dt = Math.max(1e-3, t - Math.max(0, t - 8));
  return a.done ? { x: a.x, y: a.y, v: { x: 0, y: 0 }, scale: 1 } : { x: a.x, y: a.y, v: { x: (a.x - b.x) / dt, y: (a.y - b.y) / dt }, scale: a.scale };
}

// ---------- by hand ----------
/** A press that moves this far is a drag (and must not act as a click when it ends). */
export const DRAG_SLOP = 6;
export const isDrag = (dx: number, dy: number) => Math.hypot(dx, dy) >= DRAG_SLOP;
/** One press of an arrow or WASD key moves the view this many tiles. */
export const PAN_TILES = 2;
/** The direction of a camera key (arrows, WASD), or null. */
export function panKey(key: string): Pt2 | null {
  switch (key) {
    case 'ArrowLeft': case 'a': case 'A': return { x: -1, y: 0 };
    case 'ArrowRight': case 'd': case 'D': return { x: 1, y: 0 };
    case 'ArrowUp': case 'w': case 'W': return { x: 0, y: -1 };
    case 'ArrowDown': case 's': case 'S': return { x: 0, y: 1 };
    default: return null;
  }
}

// ---------- nothing happens unseen ----------
/** Where on the view's edge an arrow to an off-screen point sits (view pixels) and which way it points (radians), or
 *  null when the point is on screen. */
export function edgeArrow(view: Size, p: Pt2, pad = 20): { x: number; y: number; angle: number } | null {
  if (p.x >= 0 && p.x <= view.w && p.y >= 0 && p.y <= view.h) return null;
  const cx = view.w / 2, cy = view.h / 2, dx = p.x - cx, dy = p.y - cy;
  const k = Math.min(dx ? (cx - pad) / Math.abs(dx) : Infinity, dy ? (cy - pad) / Math.abs(dy) : Infinity);
  return { x: Math.round(cx + dx * k), y: Math.round(cy + dy * k), angle: Math.atan2(dy, dx) };
}

// ---------- the small map ----------
/** The small map's longest side on screen. */
export const MINI_PX = 150;
export interface Mini { tile: number; w: number; h: number }
export function miniGeom(mapW: number, mapH: number, max = MINI_PX): Mini { const tile = max / Math.max(1, mapW, mapH); return { tile, w: Math.round(mapW * tile), h: Math.round(mapH * tile) }; }
/** The camera's frame on the small map (its pixels), kept inside it. */
export function miniFrame(f: Frame, g: GridAt, m: Mini): Frame {
  const k = m.tile / g.pitch, left = g.ox - g.pitch / 2, top = g.oy - g.pitch / 2;
  const x0 = Math.max(0, (f.x - left) * k), y0 = Math.max(0, (f.y - top) * k), x1 = Math.min(m.w, (f.x + f.w - left) * k), y1 = Math.min(m.h, (f.y + f.h - top) * k);
  return { x: x0, y: y0, w: Math.max(0, x1 - x0), h: Math.max(0, y1 - y0) };
}
/** A click on the small map at (mx, my): the scroll offset that centres the camera there. */
export function miniToScroll(mx: number, my: number, m: Mini, g: GridAt, view: Size, content: Size): Pt2 {
  const k = g.pitch / m.tile, left = g.ox - g.pitch / 2, top = g.oy - g.pitch / 2;
  return clampScroll(left + mx * k - view.w / 2, top + my * k - view.h / 2, content, view);
}

// ---------- which tiles an effect is about ----------
/** Effects that never move the camera: bookkeeping with no place of its own (a turn's banner has its own rule). */
export const NO_CAMERA = new Set(['roll', 'turn', 'sight', 'spotlight', 'miracle', 'mana', 'song', 'cover', 'object', 'cond', 'shield', 'volley', 'glyph_fade', 'field_gone', 'trap_gone', 'stance']);
/** Effects that are the result of something else (a wound, a heal, a unit going down, a condition's word, a reload):
 *  they never move the camera by themselves (a blast or a Miracle on ten units would swing it ten times); when they
 *  play off screen they get an arrow at the window's edge. A technique's name over the attacker is one of them: the
 *  attack it names takes the camera to the target, and the name would pull it back between two shots. */
export const NO_MOVE = new Set(['technique', 'hurt', 'heal', 'down', 'boon', 'leech', 'command', 'reload', 'load', 'clear', 'repair', 'core', 'crystallise', 'prayer', 'prayer_fail', 'witnessed', 'intervention', 'patron_line',
  'field_tick', 'trap_set', 'trap_spotted', 'wall_crumbled', 'turret_destroyed', 'veil', 'light', 'stim', 'overload', 'vent', 'syphon', 'grow', 'analyze', 'draw', 'short', 'fizzle', 'mask', 'door', 'trap']);
/** Does this kind of effect bring the camera to it (an attack, a spell, a push, a throw, a walk)? */
export const movesCamera = (k: string) => !NO_CAMERA.has(k) && !NO_MOVE.has(k);
const isKey = (v: unknown): v is string => typeof v === 'string' && /^\d+,\d+$/.test(v);
function middleOf(list: unknown): string | null {
  const ks = Array.isArray(list) ? list.filter(isKey) : []; if (!ks.length) return null;
  let sx = 0, sy = 0; for (const k of ks) { const [x, y] = k.split(',').map(Number); sx += x; sy += y; }
  return Math.round(sx / ks.length) + ',' + Math.round(sy / ks.length);
}
/** The tiles an effect plays on, the one that must be seen first (where it lands: the target of a shot, a spell or a
 *  push, the end of a walk, the middle of a blast), then where it comes from (the attacker). Only tiles this player
 *  can see: an effect wholly in the fog gives none, so it moves nobody's camera and raises no arrow. */
export function fxTiles(e: { k: string; [f: string]: any }, posOf: (id: string) => string | null | undefined, visible: (key: string) => boolean): string[] {
  if (!e || NO_CAMERA.has(e.k)) return [];
  const pos = (id: unknown) => { const p = typeof id === 'string' && id ? posOf(id) : null; return isKey(p) ? p : null; };
  const missile = Array.isArray(e.missiles) && e.missiles[0] && isKey(e.missiles[0].impact) ? e.missiles[0].impact : null;
  const land = (isKey(e.to) ? e.to : null) || missile || middleOf(e.area) || middleOf(e.tiles) || (isKey(e.at) ? e.at : null) || pos(e.target) || pos(e.unit);
  const from = (isKey(e.from) ? e.from : null) || (isKey(e.at) && e.at !== land ? e.at : null) || pos(e.unit) || middleOf(e.from);
  const out: string[] = [];
  for (const k of [land, from]) if (k && visible(k) && !out.includes(k)) out.push(k);
  return out;
}
