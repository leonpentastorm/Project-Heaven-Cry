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
export function aim(f: Frame, content: Size, pts: Pt2[], margin = 0, force = false): Pt2 | null {
  if (!pts.length) return null;
  const xs = pts.map((p) => p.x), ys = pts.map((p) => p.y), x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys);
  const fits = x1 - x0 + 2 * margin <= f.w && y1 - y0 + 2 * margin <= f.h, want = fits ? pts : [pts[0]];
  if (!force && want.every((p) => inFrame(f, p, margin))) return null;
  const c = fits ? { x: (x0 + x1) / 2, y: (y0 + y1) / 2 } : pts[0];
  const to = clampScroll(c.x - f.w / 2, c.y - f.h / 2, content, f);
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
/** The glide's length: about a quarter of a second at Fast, following the combat speed; none under reduced motion. */
export const GLIDE_MS = 250;
export const glideMs = (pace = 1, reduced = false) => (reduced ? 0 : Math.round(GLIDE_MS * pace));
/** Ease in and out (0..1 → 0..1). */
export const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);

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
export const NO_CAMERA = new Set(['turn', 'sight', 'spotlight', 'miracle', 'mana', 'song', 'cover', 'object', 'cond', 'shield', 'volley', 'glyph_fade', 'field_gone', 'trap_gone', 'stance']);
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
