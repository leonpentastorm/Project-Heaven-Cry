// FIGMENTS on the fight map (rules 1.34; engine figments.ts and owned.ts send the events). Leon, 15 Nov 2026: a Figment
// "just standing there doing nothing", and "you just click and something spawns, it doesn't feel like it's even your
// turn". The engine already says everything needed; this file only draws it, in Expression's ink (#5394AC):
//   spawn  {unit, at, owner, block}   the caster's wind-up, a thread of light to the tile, then the Figment forms there
//                                     (lines drawing in, a ring closing, its glyph, the token flickering up)
//   melee / shot by a Figment         the caster's command pulse and thread, then the ordinary attack (lunge, hit, MISS)
//                                     with the Figment's own trail: afterimages of its token and its glyph on the target
//   move by a Figment                 the command pulse and thread as it starts walking
//   unmake {unit, at}                 it comes apart (the summon reversed) on the copy of its token; the bots stream
//                                     back to its maker
// Which kind it is comes from its own row in data/figments.json (the engine's FORM, by the spawn's `block` or the unit's
// `figment.form`): its name, its line icon (the row's `icon`, game/figmentIcons.ts; its glyph only when it names none).
// No id is named here. Nothing loops (the idle shimmer is the token's CSS,
// screens/combat.js); every duration goes through dom.ts (the combat speed and the tempo).
import { FORM, figmentLookOf, type FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { type Pt, after, anim, floatText, put, ring, svg, trace, lunge, angle } from './dom';
import { figmentIcon } from '../figmentIcons';

export const FIG_INK = '#5394AC';
const FIG_CORE = '#CFE6F0', WHITE = '#FFFFFF', MUTED = '#A3AEC2';
const FIG_INK0 = FIG_INK, FIG_CORE0 = FIG_CORE;
/** The summon's three steps (ms at Fast): the caster's wind-up, the thread's travel, the forming. */
export const FIG_MS = { cast: 170, travel: 230, form: 440, unmake: 560, command: 150 } as const;

export interface FigInfo { form: string; owner: string | null; name: string; glyph: string; icon: string }
/** A form's look from its row (data/figments.json via the engine's FORM): null when the block is no Figment's. */
export function figLook(form: string | null | undefined): { name: string; glyph: string; icon: string } | null {
  const f: any = form ? (FORM as any)[form] : null;
  if (!f || f.owned_kind !== 'figment') return null;
  return { name: String(f.name || form), glyph: String(f.glyph || '◇'), icon: String(f.icon || '') };
}
// Figments seen in this fight: id → its form and its maker (kept after it leaves the board, so its unmaking plays).
const FIGS = new Map<string, FigInfo>();
const lastCommand = new Map<string, number>();
export function resetFigments() { FIGS.clear(); lastCommand.clear(); }
/** Called with the fight's units on every context: each Figment's form and its maker's unit id. */
export function noteFigments(units: readonly any[]) {
  for (const u of units) {
    const form = u?.figment?.form || (u?.owned?.kind === 'figment' ? u.companion : null), look = figLook(form); if (!look) continue;
    const owner = units.find((x) => x && x !== u && x.side === u.side && x.charId && x.charId === u.ctrl);
    FIGS.set(String(u.id), { form, owner: owner ? String(owner.id) : FIGS.get(String(u.id))?.owner ?? null, name: String(u.name || look.name), glyph: look.glyph, icon: look.icon });
  }
}
/** Every Figment seen in this fight, by its name and its icon (the fight log's chips, screens/combat.js). */
export const seenFigments = (): { name: string; icon: string }[] => [...FIGS.values()].map((f) => ({ name: f.name, icon: f.icon }));
/** The Figment an event's unit is (or was), else null. A spawn carries its own form and maker. */
export function figOf(id: string | null | undefined): FigInfo | null { return id ? FIGS.get(String(id)) || null : null; }
function noteSpawn(e: FxEvent): FigInfo | null {
  const look = figLook(e.block); if (!look || !e.unit) return null;
  const had = FIGS.get(String(e.unit)), info = { form: String(e.block), owner: e.owner ? String(e.owner) : had?.owner ?? null, name: had?.name || look.name, glyph: look.glyph, icon: look.icon };
  FIGS.set(String(e.unit), info); return info;
}

/** What a Figment event is on screen (pure, for the tests): the summon, an order it was given, its unmaking, or none. */
export function figmentFxOf(e: Partial<FxEvent> & { k: string }): 'summon' | 'act' | 'command' | 'unmake' | null {
  if (e.k === 'spawn') return figLook(e.block) || figOf(e.unit) ? 'summon' : null;
  if (e.k === 'unmake') return figOf(e.unit) ? 'unmake' : null;
  if ((e.k === 'melee' || e.k === 'shot') && figOf(e.unit)) return 'act';
  if (e.k === 'move' && figOf(e.unit)) return 'command';
  return null;
}
/** The beat a Figment event holds the stage (ms at Fast), or undefined: the others keep theirs. extra: added to an
 *  attack's own beat (the command comes first). */
export function figmentBeat(e: Partial<FxEvent> & { k: string }): number | undefined {
  const w = figmentFxOf(e);
  if (w === 'summon') return FIG_MS.cast + FIG_MS.travel + FIG_MS.form;
  if (w === 'unmake') return FIG_MS.unmake;
  if (e.k === 'spawn' || e.k === 'unmake') return 260; // another owned unit (a Scrap Turret): a short form or fade
  return undefined;
}
export const figmentExtraBeat = (e: Partial<FxEvent> & { k: string }): number => (figmentFxOf(e) === 'act' ? FIG_MS.command : 0);

/** What play.ts lends these handlers. */
export interface FigKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number }) => void;
  squares: (p: Pt, color: string, n: number, spread: number, ms: number, delay?: number) => void;
  /** let a held token show (its moment has come) */ release: (id: string) => void;
  /** the copy of a token gone from the board (kept from the last render) */ ghost: (id: string, key: string, life: number) => HTMLElement | null;
}

// ---------- pieces (pure SVG and CSS) ----------
/** A thread of light from a to b: drawn from a, its bright head travelling, then fading. ink / core: its colours (a
 *  Figment's by default; the Bonds' in fx/bonds.ts). */
export function thread(a: Pt, b: Pt, ms: number, o: { faint?: boolean; delay?: number; ink?: string; core?: string } = {}) {
  const FIG_INK = o.ink || FIG_INK0, FIG_CORE = o.core || FIG_CORE0;
  const run = () => {
    const x0 = Math.min(a.x, b.x) - 8, y0 = Math.min(a.y, b.y) - 8, w = Math.abs(a.x - b.x) + 16, h = Math.abs(a.y - b.y) + 16;
    const ax = a.x - x0, ay = a.y - y0, bx = b.x - x0, by = b.y - y0, len = Math.max(1, Math.hypot(bx - ax, by - ay));
    const s = svg(w, h, '<line class="glow" x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="' + FIG_INK + '" stroke-width="' + (o.faint ? 3 : 5) + '" stroke-linecap="round" opacity=".45" stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + len.toFixed(1) + '"/>'
      + '<line class="core" x1="' + ax + '" y1="' + ay + '" x2="' + bx + '" y2="' + by + '" stroke="' + FIG_CORE + '" stroke-width="' + (o.faint ? 1 : 1.6) + '" stroke-linecap="round" stroke-dasharray="' + len.toFixed(1) + '" stroke-dashoffset="' + len.toFixed(1) + '"/>'
      + '<circle class="head" cx="' + ax + '" cy="' + ay + '" r="' + (o.faint ? 2.5 : 3.5) + '" fill="' + WHITE + '" style="filter:drop-shadow(0 0 4px ' + FIG_INK + ')"/>');
    s.setAttribute('preserveAspectRatio', 'none');
    const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms + 260); box.style.zIndex = '2';
    for (const c of Array.from(s.querySelectorAll('.glow,.core'))) anim(c, [{ strokeDashoffset: len }, { strokeDashoffset: 0 }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
    const head = s.querySelector('.head'); if (head) anim(head, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (bx - ax) + 'px,' + (by - ay) + 'px)', opacity: 1 }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
    anim(box, [{ opacity: 1 }, { opacity: 1, offset: ms / (ms + 260) }, { opacity: 0 }], { duration: ms + 260, fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}
/** The caster's wind-up: a ring closing on it, its token brightening in the ink, a small gesture toward the tile. ink:
 *  its colour (a Figment's by default; the Bonds' in fx/bonds.ts). */
export function windUp(K: Pick<FigKit, 'at' | 'tokOf'>, owner: string | null, ownerAt: string | undefined, toward: Pt | null, ms: number, small = false, ink = FIG_INK0) {
  const FIG_INK = ink;
  const p = K.at(ownerAt); if (!p) return null;
  const tok = K.tokOf(owner, ownerAt);
  ring(p, FIG_INK, ms + 120, { from: small ? 1.25 : 1.6, to: 0.85, width: small ? 3 : 4 });
  if (tok) {
    anim(tok, [{ filter: 'none' }, { filter: 'brightness(1.5) drop-shadow(0 0 6px ' + FIG_INK + ')', offset: 0.55 }, { filter: 'none' }], { duration: ms + 200, easing: 'ease-out' });
    if (toward) { const a = angle(p, toward); lunge(tok, Math.cos(a) * p.s * (small ? 0.06 : 0.1), Math.sin(a) * p.s * (small ? 0.06 : 0.1), ms + 120); }
  }
  return p;
}
/** Short lines streaming in from around the tile to its centre (in: the forming) or out from it (the unmaking). */
function lines(p: Pt, inward: boolean, ms: number) {
  const n = reducedMotion() ? 4 : 8, r0 = 46, r1 = 16;
  let inner = '';
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + 0.3, ox = 50 + Math.cos(a) * r0, oy = 50 + Math.sin(a) * r0, ix = 50 + Math.cos(a) * r1, iy = 50 + Math.sin(a) * r1;
    const [x1, y1, x2, y2] = inward ? [ox, oy, ix, iy] : [ix, iy, ox, oy];
    inner += '<line x1="' + x1.toFixed(1) + '" y1="' + y1.toFixed(1) + '" x2="' + x2.toFixed(1) + '" y2="' + y2.toFixed(1) + '" pathLength="1" stroke="' + (i % 2 ? FIG_CORE : FIG_INK) + '" stroke-width="2.4" stroke-linecap="round" stroke-dasharray="1" stroke-dashoffset="1"/>';
  }
  const s = svg(100, 100, inner), box = put(s, p, p.s * 1.7, p.s * 1.7, ms + 80); box.style.zIndex = '3';
  for (const l of Array.from(s.querySelectorAll('line'))) anim(l, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0, offset: 0.55 }, { strokeDashoffset: -1 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}
/** The form's mark over its tile: its line icon (its row's `icon`; its glyph when it names none), flickering on
 *  (forming) or breaking up (unmaking). */
export function figMarkSvg(f: Pick<FigInfo, 'icon' | 'glyph'>): string {
  const icon = figmentIcon(f.icon);
  if (icon) return icon.replace(/<!--[\s\S]*?-->/g, '').replace('<svg ', '<svg width="100%" height="100%" style="overflow:visible;filter:drop-shadow(0 0 4px ' + FIG_INK + ')" ').replace(/currentColor/g, FIG_CORE);
  return '<svg viewBox="0 0 40 40" width="100%" height="100%" style="overflow:visible"><text x="20" y="27" text-anchor="middle" font-family="Chakra Petch,sans-serif" font-weight="700" font-size="22" fill="none" stroke="' + FIG_CORE + '" stroke-width="1.2" style="filter:drop-shadow(0 0 4px ' + FIG_INK + ')">' + f.glyph.replace(/[<&]/g, '') + '</text></svg>';
}
function glyphMark(p: Pt, f: Pick<FigInfo, 'icon' | 'glyph'>, on: boolean, ms: number) {
  const s = document.createElement('div'); s.style.cssText = 'width:100%;height:100%'; s.setAttribute('data-fig-mark', f.icon || f.glyph); s.innerHTML = figMarkSvg(f);
  const box = put(s, p, p.s * 0.9, p.s * 0.9, ms + 60); box.style.zIndex = '3';
  anim(box, on ? [{ opacity: 0, transform: 'scale(1.5)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 0.3, offset: 0.45 }, { opacity: 1, offset: 0.6 }, { opacity: 0, transform: 'scale(.9)' }]
    : [{ opacity: 1, transform: 'scale(1)' }, { opacity: 0.2, offset: 0.2 }, { opacity: 0.9, offset: 0.35 }, { opacity: 0, transform: 'scale(1.6)' }], { duration: ms, easing: 'steps(8, end)', fill: 'forwards' });
}

// ---------- the handlers ----------
/** The command: the maker's small pulse and a faint thread to its Figment (once for a walk and the strike after it). */
function command(K: FigKit, id: string, f: FigInfo, from: string | undefined) {
  const now = typeof performance !== 'undefined' ? performance.now() : 0; if (now - (lastCommand.get(id) ?? -1e9) < 700) return false; lastCommand.set(id, now);
  const op = f.owner ? K.posOf(f.owner) : undefined, q = K.at(from || K.posOf(id));
  const p = windUp(K, f.owner, op, q, FIG_MS.command * 0.7, true); trace('figment', { what: 'command', unit: id, owner: f.owner });
  if (p && q) thread(p, q, FIG_MS.command, { faint: true });
  K.play('sg_command', p || q, { rate: 1.25, gain: 0.35 });
  return true;
}
/** Wrap the attack and walk handlers (run after every other wrapper), and add the summon and the unmaking. */
export function wrapFigments(H: Record<string, (e: FxEvent) => void>, K: FigKit) {
  const base = { melee: H.melee, shot: H.shot, move: H.move };
  H.spawn = (e) => {
    const id = String(e.unit || ''), f = noteSpawn(e), p = K.at(e.at);
    if (!f) { // another owned unit (a Scrap Turret): it stands up out of a ring
      K.release(id); const tl = figmentLookOf(e.block); // its own row's icon, when it has one (the Scrap Turret's)
      if (p) { ring(p, WHITE, 420, { from: 1.3, to: 0.9, width: 3 }); K.squares(p, MUTED, 5, 0.5, 400); if (tl?.icon) glyphMark(p, { icon: tl.icon, glyph: '' }, true, 420); } K.play('sg_turret', p, { gain: 0.5 }); return;
    }
    trace('figment', { what: 'summon', unit: id, form: f.form, owner: f.owner });
    // 1. the caster: a wind-up on its own token (the gesture toward the tile)
    const op = f.owner ? K.posOf(f.owner) : undefined, cp = windUp(K, f.owner, op, p, FIG_MS.cast);
    K.play('sigil_draw', cp || p, { rate: 0.7, gain: 0.6 });
    // 2. a thread of light from the caster to the tile
    if (cp && p) thread(cp, p, FIG_MS.travel, { delay: FIG_MS.cast });
    // 3. the Figment forms: the lines draw in, a ring closes, its glyph flickers on, the token flickers up out of nothing
    const formAt = cp ? FIG_MS.cast + FIG_MS.travel : 0;
    after(() => {
      K.release(id); trace('figment', { what: 'formed', unit: id });
      if (!p) return;
      lines(p, true, FIG_MS.form); ring(p, FIG_INK, FIG_MS.form, { from: 1.7, to: 0.9, width: 3 }); glyphMark(p, f, true, FIG_MS.form);
      K.squares(p, FIG_INK, 6, 0.55, FIG_MS.form * 0.8, FIG_MS.form * 0.2);
      const tok = K.tokOf(id, e.at);
      if (tok) anim(tok, reducedMotion() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, filter: 'brightness(2.4) saturate(0)' }, { opacity: 0.25, offset: 0.3 }, { opacity: 0.05, offset: 0.42 }, { opacity: 0.8, filter: 'brightness(1.8) drop-shadow(0 0 8px ' + FIG_INK + ')', offset: 0.62 }, { opacity: 0.45, offset: 0.72 }, { opacity: 1, filter: 'none' }], { duration: FIG_MS.form, easing: 'steps(10, end)' });
      floatText(f.name.toUpperCase(), p, FIG_INK, { small: true, delay: FIG_MS.form * 0.5 });
      K.play('sg_blink', p, { rate: 0.85, gain: 0.8 });
    }, formAt);
  };
  H.unmake = (e) => {
    const id = String(e.unit || ''), f = figOf(id), p = K.at(e.at);
    if (!f) { if (p) K.squares(p, MUTED, 5, 0.5, 400); K.play('sg_turret_break', p, { gain: 0.5 }); return; }
    trace('figment', { what: 'unmake', unit: id, form: f.form });
    if (!p) return;
    const g = K.ghost(id, String(e.at), FIG_MS.unmake + 400);
    if (g) anim(g, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ opacity: 1, filter: 'none', transform: 'scale(1)' }, { opacity: 0.4, filter: 'brightness(2) drop-shadow(0 0 8px ' + FIG_INK + ')', offset: 0.2 }, { opacity: 0.85, offset: 0.32 }, { opacity: 0.2, filter: 'brightness(2.4) saturate(0) blur(1px)', transform: 'scale(1.06)', offset: 0.55 }, { opacity: 0, filter: 'blur(3px)', transform: 'scale(.8)' }], { duration: FIG_MS.unmake, easing: 'steps(9, end)', fill: 'forwards' });
    glyphMark(p, f, false, FIG_MS.unmake); lines(p, false, FIG_MS.unmake); ring(p, FIG_INK, FIG_MS.unmake, { from: 0.8, to: 1.6, width: 2 });
    K.squares(p, FIG_INK, 8, 0.9, FIG_MS.unmake);
    // the bots stream back to its maker
    const op = f.owner ? K.at(K.posOf(f.owner)) : null; if (op) thread(p, op, FIG_MS.travel, { faint: true, delay: FIG_MS.unmake * 0.35 });
    floatText('COMES APART', p, MUTED, { small: true, delay: 120 });
    K.play('sg_fizzle', p, { rate: 0.9, gain: 0.7 });
  };
  H.move = (e) => { const f = figOf(e.unit); if (f) command(K, String(e.unit), f, e.from); base.move?.(e); };
  for (const k of ['melee', 'shot'] as const) {
    const b = base[k]; if (!b) continue;
    H[k] = (e) => {
      const id = String(e.unit || ''), f = figOf(id); if (!f) { b(e); return; }
      const wait = command(K, id, f, e.from) ? FIG_MS.command : 0;
      after(() => { trace('figment', { what: 'act', unit: id, hit: !!e.hit }); b(e); try { trail(K, e, f); } catch { /* never breaks the queue */ } }, wait);
    };
  }
}
/** A Figment's own mark on its attack: afterimages of its token along the way, a streak, its glyph on the target. */
function trail(K: FigKit, e: FxEvent, f: FigInfo) {
  const a = K.at(e.from), b = K.at(e.to); if (!a || !b) return;
  const tok = K.tokOf(e.unit, e.from);
  if (tok && !reducedMotion()) for (const t of [0.3, 0.6]) {
    const c = tok.cloneNode(true) as HTMLElement; c.style.translate = ''; c.style.opacity = '1';
    const box = put(c, { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, a.s * 0.8, a.s * 0.8, 360); box.style.display = 'grid'; box.style.placeItems = 'center';
    c.style.filter = 'brightness(1.6) drop-shadow(0 0 6px ' + FIG_INK + ')';
    anim(box, [{ opacity: 0 }, { opacity: 0.55, offset: 0.25 }, { opacity: 0 }], { duration: 320, delay: t * 90, fill: 'forwards' });
  }
  thread(a, b, 110, { faint: true });
  after(() => {
    if (e.hit) { glyphMark(b, f, false, 420); K.squares(b, FIG_INK, 5, 0.6, 380); }
    else K.squares(b, MUTED, 3, 0.5, 300);
  }, 120);
}
