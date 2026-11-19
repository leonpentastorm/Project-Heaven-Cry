// BONDS AND TENDING on the fight map (rules 1.33; the Empathy door). Leon, 15 Nov 2026, on 0.28.2: "bond have the same
// problem as visualizer, no effect, no animation, no nothing, feels like standing still". The engine already says what
// is needed for most moments; this file only draws them, in the tie kind's own ink (rules.json ties.kinds[].line.ink:
// the Bond's is Insight's), always with a word, the ACTING token first. Pure SVG and CSS, paced by the combat speed
// (dom.ts), none of it under Reduce motion (the plain effects underneath still play):
//   cond {target, id: a tie kind's mark}   TIE: the Bonder's wind-up (the Figment cast's, in this ink) toward the
//                                          target, a thread runs to it, then the standing tie line (game/tieLayer.ts)
//                                          draws itself in from the Bonder; the word is the condition's (BONDED)
//   the same, resisted                     the thread reaches out and frays short of it (RESISTED, the plain word)
//   heal {target} by a Bonder to its own   HEAL: a pulse runs down the tie line from the Bonder, then the plain heal
//   Bonded unit                            plays (its +N: one number, 0.28.2's mendShown)
//   shove by a unit to its own side's      GUIDE: the guide's small gesture and a faint thread, then the slide
//   (Guide: a willing move)
//   a tie of a line kind gone from the     BREAK: the line parts from its middle and both ends recoil; the word is the
//   view between two states (Let go, a     kind's (BOND BROKEN). The engine sends no event for a tie's end, so it is
//   Down, the Attuner leaving, sight)      read from the view (noteTies), and it plays after what is queued
// Not drawn, for want of an event (the engine emits none; listed in the 0.28.3 hand-off): the echo of a heal into a
// Bonded enemy (the `deal` op makes no fx) and the share of damage (`redirect` makes none); and an un-Bonded Tending
// heal can't be told from another heal (the heal event names no giver), so it keeps the plain heal. The idle breath of
// a standing line is tieLayer's `phc-tie-pulse` (CSS). Nothing here names an item, a kind or a number of the rules.
import { tieKinds, tieLines, type FxEvent, type TieLine } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { INSIGHT_INK } from '../bondStrip';
import { type Pt, after, anim, floatText, fxMarker, fxScale, put, ring, svg, trace } from './dom';
import { thread, windUp } from './figments';

/** The moments' lengths (ms at Fast): the wind-up, the thread's run, the line drawing in, a heal's pulse, the parting,
 *  the guide's gesture. */
export const BOND_MS = { cast: 170, travel: 260, draw: 380, pulse: 300, part: 560, guide: 160 } as const;
const CORE = '#FFF1F6';

/** What play.ts lends these handlers. */
export interface BondKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number }) => void;
  squares: (p: Pt, color: string, n: number, spread: number, ms: number, delay?: number) => void;
  /** the tie lines of the view on screen now (the engine's tieLines over the fogged fight) */ lines: () => TieLine[];
  /** the unit whose turn it is (the acting unit of an action) */ actor: () => string | null;
  /** how long until the queue has played what it holds (ms, as played) */ busyFor: () => number;
}

/** The tie kind whose mark this condition is, when that kind draws a line on the map. */
const markKind = (id: unknown) => tieKinds().find((k) => !!k.mark && k.mark === id && !!k.line?.ink) || null;
export interface BondMoment { what: 'tie' | 'reach' | 'heal' | 'tend' | 'guide'; from: string; to: string; ink: string; side: 'ally' | 'foe' | null }
/** What a Bond or Tending event is on screen (pure, for the tests): a tie made, a reach resisted, a heal down a tie, a
 *  guide; else null (the plain handler only). lines: the view's tie lines now; actor: whose turn it is; sideOf: a
 *  unit's side (a shove between two of one side is a Guide). */
export function bondFxOf(e: Partial<FxEvent> & { k: string }, lines: TieLine[], actor: string | null, sideOf: (id: string) => string | null = () => null): BondMoment | null {
  if (e.k === 'cond' && e.target && markKind(e.id)) {
    const k = markKind(e.id)!;
    const t = lines.find((l) => l.kind === k.id && l.to === e.target && l.from === actor) || lines.find((l) => l.kind === k.id && l.to === e.target);
    const from = t ? t.from : actor; if (!from || from === e.target) return null;
    if (e.resisted) return { what: 'reach', from, to: String(e.target), ink: k.line!.ink, side: null };
    return { what: 'tie', from, to: String(e.target), ink: k.line!.ink, side: t ? t.side : null };
  }
  // 0.32: Tending down a Bond to an ally that is not a heal (a shield, Settle, Soothe): the pulse runs down the line too
  if ((e.k === 'cond' || e.k === 'boon') && e.target && actor && actor !== e.target && !e.resisted) {
    const t = lines.find((l) => l.from === actor && l.to === e.target && l.side === 'ally');
    if (t) return { what: 'tend', from: actor, to: String(e.target), ink: t.ink, side: t.side };
  }
  if (e.k === 'heal' && e.target && actor && actor !== e.target) {
    const t = lines.find((l) => l.from === actor && l.to === e.target);
    return t ? { what: 'heal', from: actor, to: String(e.target), ink: t.ink, side: t.side } : null;
  }
  if (e.k === 'shove' && e.ok && !e.interpose && e.unit && e.target && e.unit !== e.target && e.from !== e.to && sideOf(String(e.unit)) !== null && sideOf(String(e.unit)) === sideOf(String(e.target))) return { what: 'guide', from: String(e.unit), to: String(e.target), ink: INSIGHT_INK, side: 'ally' };
  return null;
}
/** The extra beat a Bond moment holds the stage before the plain effect plays (ms at Fast). */
export function bondExtraBeat(m: BondMoment | null): number {
  if (!m || reducedMotion()) return 0;
  return m.what === 'tie' ? BOND_MS.cast + BOND_MS.travel : m.what === 'reach' ? BOND_MS.cast + BOND_MS.travel : m.what === 'heal' || m.what === 'tend' ? BOND_MS.pulse : BOND_MS.guide;
}

/** The standing tie line on the map (game/tieLayer.ts), drawn in from its from end. */
function tieLineEl(from: string, to: string): SVGLineElement | null {
  if (typeof document === 'undefined') return null;
  const esc = (s: string) => s.replace(/["\\]/g, '\\$&');
  return document.querySelector('svg[data-tie-layer] line[data-tie-from="' + esc(from) + '"][data-tie-to="' + esc(to) + '"]');
}
function drawIn(from: string, to: string, ms: number) {
  const run = () => {
    const l = tieLineEl(from, to); if (!l) return;
    trace('bond', { what: 'line-in', from, to });
    // grow it from the Bonder's end: a scale about its first point (in the layer's own units)
    l.style.transformBox = 'view-box'; l.style.transformOrigin = l.getAttribute('x1') + 'px ' + l.getAttribute('y1') + 'px';
    const a = anim(l, [{ transform: 'scale(0)', strokeOpacity: 1 }, { transform: 'scale(1)', strokeOpacity: 1, offset: 0.8 }, { transform: 'scale(1)' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' });
    if (a) a.onfinish = () => { l.style.transformOrigin = ''; l.style.transformBox = ''; };
  };
  run();
}
/** A short bright bead running from a to b (a heal's pulse down the line). */
function pulse(a: Pt, b: Pt, ink: string, ms: number) {
  const s = svg(100, 100, '<circle cx="50" cy="50" r="30" fill="' + CORE + '" style="filter:drop-shadow(0 0 5px ' + ink + ')"/><circle cx="50" cy="50" r="46" fill="none" stroke="' + ink + '" stroke-width="6" opacity=".7"/>');
  const sz = Math.max(10, a.s * 0.32), box = put(s, a, sz, sz, ms + 40); box.style.zIndex = '3';
  anim(box, [{ transform: 'translate(0,0) scale(.6)', opacity: 0.4 }, { transform: 'translate(' + ((b.x - a.x) * 0.15) + 'px,' + ((b.y - a.y) * 0.15) + 'px) scale(1.1)', opacity: 1, offset: 0.15 }, { transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px) scale(1)', opacity: 1 }], { duration: ms, easing: 'ease-in', fill: 'forwards' });
}
/** The parting: two halves of the thread fly back from the middle to their ends and fade; a few squares at the cut. */
function part(a: Pt, b: Pt, ink: string, dash: string, ms: number, K: BondKit) {
  const x0 = Math.min(a.x, b.x) - 12, y0 = Math.min(a.y, b.y) - 12, w = Math.abs(a.x - b.x) + 24, h = Math.abs(a.y - b.y) + 24;
  const ax = a.x - x0, ay = a.y - y0, bx = b.x - x0, by = b.y - y0, mx = (ax + bx) / 2, my = (ay + by) / 2;
  const half = (x: number, y: number, cls: string) => '<line class="' + cls + '" x1="' + x + '" y1="' + y + '" x2="' + mx + '" y2="' + my + '" stroke="' + ink + '" stroke-width="2.2" stroke-linecap="round"' + (dash ? ' stroke-dasharray="' + dash + '"' : '') + '/>';
  const s = svg(w, h, half(ax, ay, 'a') + half(bx, by, 'b')); s.setAttribute('preserveAspectRatio', 'none');
  const box = put(s, { x: x0 + w / 2, y: y0 + h / 2 }, w, h, ms + 60); box.style.zIndex = '3';
  for (const [cls, x, y] of [['a', ax, ay], ['b', bx, by]] as const) {
    const l = s.querySelector('.' + cls) as SVGLineElement | null; if (!l) continue;
    l.style.transformBox = 'view-box'; l.style.transformOrigin = x + 'px ' + y + 'px';
    // a snap toward the middle (the strain), then the half recoils to its own end and fades
    anim(l, [{ transform: 'scale(1)', opacity: 1 }, { transform: 'scale(1.04)', opacity: 1, offset: 0.12 }, { transform: 'scale(.12)', opacity: 0.6, offset: 0.7 }, { transform: 'scale(0)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.3,.9,.4,1)', fill: 'forwards' });
  }
  K.squares({ x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, s: a.s }, ink, 6, 0.45, ms * 0.7, ms * 0.08);
}

/** Wrap the condition, heal and shove handlers (after every other wrapper) with the Bond moments. */
export function wrapBonds(H: Record<string, (e: FxEvent) => void>, K: BondKit) {
  KIT = K;
  const base = { cond: H.cond, heal: H.heal, shove: H.shove, boon: H.boon };
  const moment = (e: FxEvent) => { try { return bondFxOf(e, K.lines(), K.actor(), sideOf); } catch { return null; } };
  for (const k of ['cond', 'heal', 'shove', 'boon'] as const) {
    const b = base[k]; if (!b) continue;
    H[k] = (e) => {
      const m = moment(e); if (!m || reducedMotion()) { b(e); return; }
      const fp = K.at(K.posOf(m.from)), tp = K.at(K.posOf(m.to) || e.at || e.to);
      if (!fp || !tp) { b(e); return; }
      trace('bond', { what: m.what, from: m.from, to: m.to });
      if (m.what === 'tie' || m.what === 'reach') {
        // 1. the Bonder's wind-up toward its target (the acting token first)
        windUp(K, m.from, K.posOf(m.from), tp, BOND_MS.cast, false, m.ink);
        K.play('soul_hold', fp, { rate: 1.25, gain: 0.55 });
        if (m.what === 'reach') {
          // 2. the thread goes out and frays short of it (the plain RESISTED follows)
          const stop = { x: fp.x + (tp.x - fp.x) * 0.72, y: fp.y + (tp.y - fp.y) * 0.72, s: tp.s };
          thread(fp, stop, BOND_MS.travel, { delay: BOND_MS.cast, ink: m.ink, core: CORE, faint: true });
          after(() => { K.squares(stop, m.ink, 5, 0.4, 380); K.play('sg_fizzle', stop, { rate: 1.2, gain: 0.45 }); b(e); }, BOND_MS.cast + BOND_MS.travel);
          return;
        }
        // 2. the thread runs to it; 3. the standing line draws itself in, a ring closes on the target, and its word
        thread(fp, tp, BOND_MS.travel, { delay: BOND_MS.cast, ink: m.ink, core: CORE });
        after(() => {
          drawIn(m.from, m.to, BOND_MS.draw);
          ring(tp, m.ink, 460, { from: 1.5, to: 0.95, width: 4 });
          K.play('sg_blink', tp, { rate: 1.15, gain: 0.55 });
          b(e);
        }, BOND_MS.cast + BOND_MS.travel);
        return;
      }
      if (m.what === 'heal' || m.what === 'tend') {
        // the Tender's small wind-up toward its Bonded unit, the pulse runs down the line, then the plain effect (a
        // heal's one +N, a shield's +N, the condition's word) lands, and the tended token answers in the line's ink
        windUp(K, m.from, K.posOf(m.from), tp, BOND_MS.pulse * 0.6, true, m.ink);
        pulse(fp, tp, m.ink, BOND_MS.pulse);
        K.play('sg_command', fp, { rate: 1.4, gain: 0.3 });
        if (m.what === 'tend' && k === 'cond') K.play('soul_hold', tp, { rate: 1.5, gain: 0.35, delay: BOND_MS.pulse });
        after(() => {
          ring(tp, m.ink, 420, { from: 0.8, to: 1.25, width: 4 }); fxMarker(tp, 'data-phc-bond-' + m.what, m.to);
          const tt = K.tokOf(m.to, K.posOf(m.to)); if (tt) anim(tt, [{ filter: 'none', translate: '0 0' }, { filter: 'brightness(1.4) drop-shadow(0 0 7px ' + m.ink + ')', translate: '0 -3px', offset: 0.35 }, { filter: 'none', translate: '0 0' }], { duration: 520, easing: 'ease-out' });
          b(e);
        }, BOND_MS.pulse);
        return;
      }
      // guide: the guide's small gesture and a faint thread, then the slide
      windUp(K, m.from, K.posOf(m.from), tp, BOND_MS.guide * 0.7, true, m.ink);
      thread(fp, tp, BOND_MS.guide, { faint: true, ink: m.ink, core: CORE });
      floatText('GUIDED', tp, m.ink, { small: true, delay: BOND_MS.guide });
      after(() => b(e), BOND_MS.guide);
    };
  }
}
let KIT: BondKit | null = null;
/** The extra beat of an event that is a Bond moment (play.ts beatOf). */
export const bondExtra = (e: FxEvent): number => { try { return KIT ? bondExtraBeat(bondFxOf(e, KIT.lines(), KIT.actor(), sideOf)) : 0; } catch { return 0; } };
let SIDES = new Map<string, string>();
const sideOf = (id: string) => SIDES.get(id) ?? null;

// ---------- the ends of ties (no event: read from the view) ----------
let lastLines: { key: string; lines: Map<string, TieLine & { ax?: Pt | null; bx?: Pt | null }> } | null = null;
/** Forget the ties seen (a new fight, the room left). */
export function resetBonds() { lastLines = null; SIDES = new Map(); }
/** The ties of a line kind gone between the last view and this one (pure, for the tests). A line the view dropped
 *  because one of its ends left it (the fog keeps no far end it cannot see) is not an end: both ends must still be in
 *  the view (a body counts). */
export function goneTies(before: TieLine[], now: TieLine[], units: readonly any[] = []): TieLine[] {
  const keep = new Set(now.map((l) => l.key)), here = new Set(units.map((u) => String(u.id)));
  return before.filter((l) => !keep.has(l.key) && here.has(l.from) && here.has(l.to));
}
/** Called with every new view (play.ts setContext): the fight's key (its stream), and its fight. A tie gone since the
 *  last view of the same fight parts on the map once the queue has played what it holds. */
export function noteTies(fightKey: string | null, cb: any) {
  SIDES = new Map((cb?.units || []).map((u: any) => [String(u.id), String(u.side)]));
  if (!fightKey || !cb) { lastLines = null; return; }
  let now: TieLine[] = []; try { now = tieLines(cb); } catch { now = []; }
  const K = KIT, was = lastLines && lastLines.key === fightKey ? [...lastLines.lines.values()] : [];
  // where each end stands on screen now (a parting plays where the line was, even if a unit has gone from the board)
  const next = new Map(now.map((l) => [l.key, { ...l, ax: K ? K.at(l.fromPos) : null, bx: K ? K.at(l.toPos) : null }]));
  lastLines = { key: fightKey, lines: next };
  if (!K || reducedMotion()) return;
  for (const l of goneTies(was, now, cb.units || []) as (TieLine & { ax?: Pt | null; bx?: Pt | null })[]) {
    const wait = Math.max(0, K.busyFor());
    // (the queue's own wait, as played; after() counts at the written pace)
    after(() => {
      const a = K.at(l.fromPos) || l.ax, b = K.at(l.toPos) || l.bx; if (!a || !b) return;
      trace('bond', { what: 'break', from: l.from, to: l.to, kind: l.kind });
      part(a, b, l.ink, l.dash, BOND_MS.part, K);
      floatText(l.kind.toUpperCase() + ' BROKEN', { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2, s: a.s }, l.ink, { small: true, delay: 80 });
      K.play('sg_fizzle', a, { rate: 1.35, gain: 0.4 });
      // and the two ends recoil (their tokens jolt away from each other)
      for (const [id, p, q] of [[l.from, a, b], [l.to, b, a]] as const) { const tok = K.tokOf(id, id === l.from ? l.fromPos : l.toPos); if (tok) { const d = Math.hypot(p.x - q.x, p.y - q.y) || 1; anim(tok, [{ translate: '0 0' }, { translate: ((p.x - q.x) / d) * p.s * 0.08 + 'px ' + ((p.y - q.y) / d) * p.s * 0.08 + 'px', offset: 0.3 }, { translate: '0 0' }], { duration: 320, easing: 'ease-out' }); } }
    }, wait / Math.max(0.01, fxScale()));
  }
}
