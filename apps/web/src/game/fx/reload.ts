// The reload card (Leon, 9 Nov 2026: "there is absolutely no way you can see a reload animation right now the way it's
// drawn, especially if you are standing on a tile with a pile of loot"). A reload used to be a small timer ring and a
// magazine falling behind the portrait, lost under a pile's stack. Now a card pops up over the unit, above everything on
// the grid (the effects layer is over the screen, and the card is on top of the layer), with the weapon's own magazine
// drawn large in a magwell and the gun's round count under it:
//   * a SPEED reload: the old magazine (its count on the card) falls out of the bottom of the card toward the unit (and,
//     from under the portrait, to the ground: fx/brass.ts dropMag, the magazine the pile on the tile now holds), the
//     fresh one slides in, clicks home, and the count runs up to what it holds;
//   * a TACTICAL reload (rules 1.9: the old one goes back in the pack): the old magazine slides into the pack glyph on the
//     card's right, which bumps with a "+1"; the rest as a speed reload. Nothing falls under the portrait (fx/play.ts);
//   * the two read apart at a glance, to the end (review, 9 Nov 2026): a speed card has a muted grey frame and an
//     outlined title chip; a tactical card a white frame, a solid white title chip and its extra cost ("+1 AP") on a tab
//     at its top right; the fresh magazine is lit (a light rim), the old one muted;
//   * rounds loaded one by one (a pump gun, a lever or bolt gun, a launcher; a break-action's two shells): a row of
//     rounds, each fed into its slot with the count ticking; a revolver's cylinder, its chambers filling as it turns (a
//     speedloader fills them at once); a bow's arrows slid into the quiver; a flamer's canister and its gauge;
//   * both guns: two columns on the one card (MAIN, OFF); the off hand alone: one column marked OFF HAND.
// Pure SVG and CSS. Every duration and delay goes through fx/dom.ts (anim, after, slow), so the card follows the combat
// speed (game/combatSpeed.ts) and a spotlight's slow-mo. Under reduced motion the card is still: it shows the end state
// (the fresh magazine, the count, where the old one went) and fades. Pure presentation: nothing here changes the game.
import { PILE, WEAPON, type FxEvent } from '@engine';
import { reducedMotion } from '../sfx';
import { type Mag, type Shell, arrowPicture, brassOf, magPicture, roundPicture } from './brass';
import { anim, after, centre, clampCentre, layerEl, slow, tileEl, tokenEl } from './dom';
import { gearLineUri } from '../gearIcons';

// ---------- what the card shows (pure: tests) ----------
/** How a gun's reload is drawn: a magazine swapped; a revolver's cylinder; a row of rounds fed one by one; arrows into
 *  a quiver; a fuel canister and its gauge; else just the count. */
export type ReloadLook = 'mag' | 'cylinder' | 'rounds' | 'arrows' | 'fuel' | 'count';
export interface ReloadGun {
  hand: 'main' | 'off'; weapon: string; look: ReloadLook; mag: Mag | null; shell: Shell | null;
  /** The count before the new rounds go in (0 once a magazine is out), after, and the gun's size. */
  from: number; to: number; cap: number;
  /** What was in the gun before (a swapped magazine's rounds; a cylinder's), or null when nothing comes out. */
  left: number | null;
  /** Where the old magazine (or speedloader) goes: the pile on the tile (speed), the pack (tactical), or nowhere (no
   *  swap; or a swap that drops nothing: unlimited spares (a companion's, a twin's), the event's noDrop). */
  out: 'pile' | 'pack' | null;
  /** A magazine (or speedloader) is swapped: the old one comes out, the fresh one goes into an empty gun. */
  swap: boolean;
  /** A speedloader or a magazine fills at once; loose rounds go in one by one. */
  each: boolean;
}
export interface ReloadPlan { mode: 'speed' | 'tactical' | 'load'; title: string; guns: ReloadGun[] }
const int = (v: unknown, d: number) => { const n = Number(v); return Number.isFinite(n) ? Math.max(0, Math.round(n)) : d; };
/** One gun's part of a reload event (the main gun's fields, or e.off). */
function gunOf(f: { weapon?: string; cat?: string; how?: string; tactical?: boolean; noDrop?: boolean; rounds?: number; ammo?: number; cap?: number; left?: number }, hand: 'main' | 'off'): ReloadGun {
  const weapon = f.weapon || '', br = brassOf(weapon, f.cat || ''), w: any = (WEAPON as any)[weapon];
  const cap = Math.max(1, int(f.cap, int(w?.magazine, 1))), loose = f.how === 'loose';
  const to = Math.min(cap, int(f.ammo, cap));
  const look: ReloadLook = br.bow === 'bow' || (br.bow === 'crossbow' && !br.mag) ? 'arrows' : br.mag === 'fuel_can' ? 'fuel' : br.load === 'cylinder' ? 'cylinder'
    : br.load ? 'rounds' : br.mag ? 'mag' : 'count';
  // Loose rounds: the count before is what was in the gun (the rounds the event says went in, taken off). A swap
  // empties the gun first: the fresh one (or the speedloader's rounds) goes into an empty gun.
  const from = loose ? Math.max(0, to - int(f.rounds, to)) : 0;
  const swap = !loose && (look === 'mag' || look === 'cylinder');
  const left = swap ? Math.min(cap, int(f.left, 0)) : look === 'cylinder' && loose ? from : null;
  return { hand, weapon, look, mag: br.mag, shell: br.shell, from, to, cap, left, out: swap ? (f.tactical ? 'pack' : f.noDrop ? null : 'pile') : null, swap, each: loose || look === 'rounds' || look === 'arrows' };
}
/** The card for a reload event (FxEvent 'reload': weapon, cat, how, tactical, noDrop, rounds, ammo, cap, left, off, hand). Pure. */
export function reloadPlan(e: Partial<FxEvent>): ReloadPlan {
  const first = gunOf(e as any, e.hand === 'off' ? 'off' : 'main');
  const guns = [first, ...(e.off ? [gunOf(e.off, 'off')] : [])];
  const tactical = guns.some((g) => g.out === 'pack'), swap = guns.some((g) => g.swap);
  const mode: ReloadPlan['mode'] = tactical ? 'tactical' : swap ? 'speed' : 'load';
  const title = mode === 'tactical' ? 'TACTICAL RELOAD' : mode === 'speed' ? 'SPEED RELOAD' : guns.every((g) => g.look === 'fuel') ? 'REFUEL' : 'LOADING';
  return { mode, title, guns };
}
/** The count as the card writes it. */
export const countText = (n: number, cap: number) => n + '/' + cap;

// ---------- the card ----------
const INK = '#E7EBF3', MUTED = '#A3AEC2', OK = '#6FEA77', LINE = '#232D3F';
const PACK_SVG = '<svg viewBox="0 0 36 36" width="100%" height="100%" aria-hidden="true"><g fill="none" stroke="#FFFFFF" stroke-width="2.6" stroke-linejoin="round"><path d="M14,12 v-3 a4,4 0 0 1 8,0 v3"/><path d="M9,12 h18 a3,3 0 0 1 3,3 v15 a3,3 0 0 1 -3,3 h-18 a3,3 0 0 1 -3,-3 v-15 a3,3 0 0 1 3,-3 z"/><path d="M6,19 h24"/><path d="M12,24 h12 v5 h-12 z"/></g></svg>';
const DROP_SVG = '<svg viewBox="0 0 24 24" width="100%" height="100%" aria-hidden="true"><path d="M12 3 V17 M6 11.5 L12 17.5 L18 11.5" fill="none" stroke="' + MUTED + '" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/><path d="M4 21 H20" stroke="' + MUTED + '" stroke-width="2.4" stroke-linecap="round"/></svg>';
function div(css: string, attrs: Record<string, string> = {}): HTMLDivElement {
  const d = document.createElement('div'); d.style.cssText = css; for (const k in attrs) d.setAttribute(k, attrs[k]); return d;
}
const TXT = "font-family:'Chakra Petch',sans-serif;font-weight:700;line-height:1;white-space:nowrap;";

/** How long the card stays up after the reload's own time (the count is read at the end), and its fade (ms, at Fast). */
const HOLD = 420, FADE = 240;
let uid = 0;
/** Live cards by unit (a new reload of the same unit replaces its card). */
const live = new Map<string, HTMLElement>();

/** Show the reload card over the unit on tile `key` (its token: tok) for a reload that takes ms. */
export function reloadCard(e: Partial<FxEvent>, key: string, ms: number): HTMLElement | null {
  const L = layerEl(), p = centre(key); if (!L || !p) return null;
  const plan = reloadPlan(e), still = reducedMotion();
  const u = Math.max(0.85, Math.min(1.25, p.s / 52));
  const was = e.unit ? live.get(e.unit) : null; if (was) was.remove();
  // ---- the size: one column a gun (a row of rounds may need a wider one) ----
  const cols = plan.guns.map((g) => colWidth(g, u));
  const pad = 10 * u, gap = 8 * u, W = Math.max((plan.mode === 'load' ? 132 : 150) * u, cols.reduce((a, b) => a + b, 0) + gap * (cols.length - 1) + pad * 2), tail = 8 * u;
  const labelled = plan.guns.length > 1 || plan.guns[0].hand === 'off';
  const H = (labelled ? 128 : 118) * u;
  const box = div('position:absolute;left:0;top:0;width:' + W + 'px;height:' + (H + tail) + 'px;pointer-events:none;z-index:4;will-change:transform,opacity;transform-origin:50% 100%',
    { 'data-fx': 'reload', 'data-reload-mode': plan.mode, 'data-reload-unit': String(e.unit || '') });
  // the card itself (moved down by the pointer's height when it is flipped under the unit)
  const card = div('position:absolute;left:0;top:0;width:' + W + 'px;height:' + H + 'px');
  // the frame says which reload it is: white for a tactical one, muted grey for a speed one (the line for a load)
  const frame = plan.mode === 'tactical' ? 'border:' + Math.max(1.5, 1.6 * u) + 'px solid #FFFFFF' : plan.mode === 'speed' ? 'border:' + Math.max(1, 1.2 * u) + 'px solid ' + MUTED : 'border:1px solid ' + LINE;
  card.appendChild(div('position:absolute;inset:0;box-sizing:border-box;border-radius:' + 8 * u + 'px;background:rgba(16,21,31,.95);' + frame
    + ';box-shadow:0 ' + 6 * u + 'px ' + 18 * u + 'px rgba(0,0,0,.65),0 0 0 1px rgba(0,0,0,.5)', { 'data-reload-frame': plan.mode }));
  // the pointer to the unit (under the card, or above it when the card is flipped under the unit)
  const ptr = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  ptr.setAttribute('viewBox', '0 0 20 10'); ptr.style.cssText = 'position:absolute;left:' + (W / 2 - 10 * u) + 'px;top:' + (H - 1) + 'px;width:' + 20 * u + 'px;height:' + tail + 'px;overflow:visible';
  ptr.innerHTML = '<path d="M0 0 L10 10 L20 0" fill="rgba(16,21,31,.95)" stroke="' + LINE + '" stroke-width="1"/><path d="M0.6 0 H19.4" stroke="rgba(16,21,31,1)" stroke-width="2"/>';
  box.appendChild(ptr); box.appendChild(card);
  // the title: a solid white chip (tactical), an outlined grey one (speed), plain words (a load)
  const chip = plan.mode === 'tactical' ? 'background:#FFFFFF;color:#0A0D13;' : plan.mode === 'speed' ? 'background:#1C2536;color:' + INK + ';box-shadow:inset 0 0 0 1px ' + MUTED + ';' : 'color:#FFFFFF;text-shadow:0 1px 0 #000;';
  const title = div(TXT + 'position:absolute;left:0;right:0;margin:0 auto;width:fit-content;top:' + (plan.mode === 'load' ? 8 : 6) * u + 'px;padding:' + (plan.mode === 'load' ? 0 : 2.5 * u) + 'px ' + (plan.mode === 'load' ? 0 : 6 * u) + 'px;border-radius:' + 4 * u + 'px;text-align:center;font-size:' + (plan.mode === 'load' ? 11 : 10) * u + 'px;letter-spacing:.14em;' + chip,
    { 'data-reload-title': '', 'data-reload-chip': plan.mode });
  title.textContent = plan.title; card.appendChild(title);
  // the weapon's icon (gearIcons.ts) before the title, in the chip's own ink; with two guns each column's label has its own
  if (!labelled) { const ic = iconImg(plan.guns[0].weapon, plan.mode === 'tactical' ? '#0A0D13' : plan.mode === 'speed' ? INK : '#FFFFFF', 18 * u); if (ic) { title.style.display = 'flex'; title.style.alignItems = 'center'; title.style.gap = 4 * u + 'px'; title.prepend(ic); } }
  // a tactical reload's extra cost (rules 1.9) on a tab at the card's top right
  if (plan.mode === 'tactical') {
    const ap = div(TXT + 'position:absolute;top:' + -10 * u + 'px;right:' + -6 * u + 'px;padding:' + 2.5 * u + 'px ' + 5 * u + 'px;border-radius:' + 6 * u + 'px;background:#FFFFFF;color:#0A0D13;font-size:' + 10 * u + 'px;letter-spacing:.06em;box-shadow:0 1px 4px rgba(0,0,0,.7)', { 'data-reload-ap': '' });
    ap.textContent = '+' + (PILE.tactical_reload_extra_ap || 1) + ' AP'; card.appendChild(ap);
  }
  // ---- on the layer, over the unit (flipped under it near the top of the screen), following the tile ----
  L.appendChild(box);
  let flip = false;
  const place = () => {
    const tok = tokenEl(tileEl(key)), r = tok ? tok.getBoundingClientRect() : null, q = centre(key);
    if (!q) { box.style.opacity = '0'; return; }
    const th = r && r.height ? r.height : q.s * 0.75, ty = r && r.height ? r.top + r.height / 2 : q.y;
    const room = L.clientWidth || innerWidth, cx = clampCentre(q.x, W, 4, room - 4);
    let y = ty - th / 2 - 4 * u - (H + tail), f = false;
    if (y < 4) { y = ty + th / 2 + 4 * u; f = true; }
    box.style.left = (cx - W / 2) + 'px'; box.style.top = y + 'px';
    // the pointer stays over the unit when the card is pushed in from an edge
    ptr.style.left = Math.max(8 * u, Math.min(W - 28 * u, q.x - (cx - W / 2) - 10 * u)) + 'px';
    if (f !== flip || !box.dataset.placed) {
      flip = f; box.dataset.placed = '1'; box.dataset.reloadFlip = f ? '1' : '0';
      card.style.top = f ? tail + 'px' : '0'; ptr.style.top = f ? '1px' : (H - 1) + 'px'; ptr.style.transform = f ? 'scaleY(-1)' : ''; box.style.transformOrigin = f ? '50% 0' : '50% 100%';
    }
  };
  place();
  // ---- the columns: one a gun ----
  let x = (W - (cols.reduce((a, b) => a + b, 0) + gap * (cols.length - 1))) / 2;
  const top = (labelled ? 34 : 24) * u;
  plan.guns.forEach((g, i) => {
    const cw = cols[i], col = div('position:absolute;left:' + x + 'px;top:0;width:' + cw + 'px;height:' + H + 'px', { 'data-reload-gun': g.hand });
    card.appendChild(col);
    if (labelled) { const l = div(TXT + 'position:absolute;left:0;right:0;top:' + 22 * u + 'px;text-align:center;font-size:' + 8.5 * u + 'px;letter-spacing:.16em;color:' + MUTED); l.textContent = plan.guns.length > 1 ? (g.hand === 'off' ? 'OFF' : 'MAIN') : 'OFF HAND';
      const ic = iconImg(g.weapon, MUTED, 14 * u); if (ic) { l.style.display = 'flex'; l.style.justifyContent = 'center'; l.style.alignItems = 'center'; l.style.gap = 3 * u + 'px'; l.style.top = 19 * u + 'px'; l.prepend(ic); }
      col.appendChild(l); }
    // how far the old magazine falls to reach the unit (a card under the unit: it just drops out of sight)
    const wellY = card.getBoundingClientRect().top + top + 4 * u + 27 * u;
    drawGun(col, g, cw, top, H, u, ms, i * 0.06, still, flip ? 46 * u : Math.max(40 * u, p.y - wellY));
    x += cw + gap;
  });
  const total = ms + HOLD + FADE, until = performance.now() + slow(total);
  const follow = () => { if (!box.isConnected || performance.now() > until) return; place(); requestAnimationFrame(follow); };
  requestAnimationFrame(follow);
  anim(box, still ? [{ opacity: 0 }, { opacity: 1, offset: 0.08 }, { opacity: 1, offset: 1 - FADE / total }, { opacity: 0 }]
    : [{ opacity: 0, transform: 'scale(.72) translateY(' + 6 * u + 'px)' }, { opacity: 1, transform: 'scale(1.04)', offset: Math.min(0.12, 110 / total) }, { opacity: 1, transform: 'scale(1)', offset: Math.min(0.18, 170 / total) },
      { opacity: 1, transform: 'scale(1)', offset: 1 - FADE / total }, { opacity: 0, transform: 'scale(.96) translateY(' + -4 * u + 'px)' }], { duration: total, easing: 'ease-out', fill: 'forwards' });
  if (e.unit) live.set(e.unit, box);
  setTimeout(() => { box.remove(); if (e.unit && live.get(e.unit) === box) live.delete(e.unit); }, slow(total) + 60);
  return box;
}

/** A weapon's icon as an <img> in one ink (null when it has none: nothing is drawn). */
function iconImg(weapon: string, ink: string, size: number): HTMLImageElement | null {
  const src = gearLineUri(weapon, ink); if (!src) return null;
  const im = document.createElement('img'); im.src = src; im.alt = ''; im.setAttribute('data-reload-icon', weapon);
  im.style.cssText = 'flex:none;display:block;width:' + size + 'px;height:' + size + 'px'; return im;
}

/** A column's width for a gun: room for its magazine and where the old one goes, or for its row of rounds. */
function colWidth(g: ReloadGun, u: number): number {
  if (g.look !== 'rounds') return 84 * u;
  const n = Math.min(10, g.cap), P = g.shell ? roundPicture(g.shell) : null, slotH = n > 6 ? 30 : 34, sw = P ? Math.max(6, Math.min(16, (slotH * P.h) / P.w)) : 8;
  return Math.max(84, n * (sw + 3) + 12) * u;
}

/** Draw one gun's column and run its part (offset: a fraction of ms, the off hand a beat after the main). Returns when
 *  its count is full (ms from now, at Fast). */
function drawGun(col: HTMLElement, g: ReloadGun, cw: number, top: number, H: number, u: number, ms: number, offset: number, still: boolean, fall: number): number {
  // the count and its bar, at the foot of the column
  // (the bar and the count sit over a falling old magazine: it passes behind them, the count stays readable)
  const barY = H - 30 * u, bar = div('position:absolute;z-index:4;left:' + 6 * u + 'px;right:' + 6 * u + 'px;top:' + barY + 'px;height:' + 5 * u + 'px;border-radius:' + 3 * u + 'px;background:' + LINE + ';overflow:hidden');
  const fill = div('height:100%;width:0;background:#FFFFFF;border-radius:inherit;transition:width 90ms linear');
  bar.appendChild(fill); col.appendChild(bar);
  const count = div(TXT + 'position:absolute;z-index:4;left:0;right:0;margin:0 auto;width:fit-content;top:' + (barY + 7 * u) + 'px;padding:' + 2 * u + 'px ' + 4 * u + 'px;border-radius:' + 4 * u + 'px;background:rgba(16,21,31,.97);text-align:center;font-size:' + 14 * u + 'px;letter-spacing:.04em;color:' + INK + ';font-variant-numeric:tabular-nums;text-shadow:0 1px 0 #000', { 'data-reload-count': '' });
  col.appendChild(count);
  const show = (n: number, done = false) => {
    count.innerHTML = '';
    count.appendChild(document.createTextNode(countText(n, g.cap)));
    if (done) { const ok = document.createElement('span'); ok.textContent = ' ✓'; ok.style.color = OK; count.appendChild(ok); count.setAttribute('data-reload-done', '1'); }
    count.setAttribute('data-reload-count', String(n));
    fill.style.width = Math.round((100 * Math.min(n, g.cap)) / g.cap) + '%';
  };
  const t = (f: number) => ms * Math.min(1, f + offset);
  // ---- where the old magazine goes: the pack glyph (tactical) or the drop arrow (speed), right of the well ----
  const wellS = 54 * u, GS = 24 * u, wx = g.out ? cw / 2 - 14 * u : cw / 2, wy = top + 4 * u;
  let dest: HTMLElement | null = null;
  if (g.out) {
    dest = div('position:absolute;left:' + (cw - GS - 2 * u) + 'px;top:' + (wy + wellS / 2 - GS + 2 * u) + 'px;width:' + GS + 'px;height:' + GS + 'px', g.out === 'pack' ? { 'data-reload-pack': '' } : { 'data-reload-drop': '' });
    dest.innerHTML = g.out === 'pack' ? PACK_SVG : DROP_SVG;
    const cap = div(TXT + 'position:absolute;left:' + (cw - GS / 2 - 2 * u - 18 * u) + 'px;width:' + 36 * u + 'px;top:' + (wy + wellS / 2 + 5 * u) + 'px;text-align:center;font-size:' + 9 * u + 'px;letter-spacing:.12em;color:' + (g.out === 'pack' ? '#FFFFFF' : MUTED));
    cap.textContent = g.out === 'pack' ? 'PACK' : 'PILE';
    col.appendChild(dest); col.appendChild(cap);
    // once the old one is there: the glyph bumps and keeps a +1 (white for the pack, grey for the pile)
    const badge = div(TXT + 'position:absolute;z-index:3;left:' + (cw - 12 * u) + 'px;top:' + (wy + wellS / 2 - GS - 6 * u) + 'px;padding:' + 2 * u + 'px ' + 3.5 * u + 'px;border-radius:' + 7 * u + 'px;font-size:' + 10 * u + 'px;box-shadow:0 1px 3px rgba(0,0,0,.6);'
      + (g.out === 'pack' ? 'background:#FFFFFF;color:#0A0D13' : 'background:#1C2536;color:' + INK + ';border:1px solid ' + LINE), { 'data-reload-badge': g.out });
    badge.textContent = '+1'; col.appendChild(badge);
    if (!still) {
      badge.style.opacity = '0';
      const d = dest;
      after(() => {
        anim(d, [{ transform: 'scale(1)' }, { transform: 'scale(1.4)', offset: 0.35 }, { transform: 'scale(1)' }], { duration: 280 });
        anim(badge, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1.25)', offset: 0.5 }, { opacity: 1, transform: 'scale(1)' }], { duration: 240, fill: 'forwards' });
      }, g.out === 'pile' ? t(0.12) : t(0.34)); // the pile's +1 as the old one leaves (the tile's pile count already shows it)
    }
  }
  // ---- the well: a dashed slot the magazine (or the cylinder, or the rounds) sits in ----
  if (g.look === 'rounds') return drawRounds(col, g, cw, wy, u, ms, t, still, show);
  const well = div('position:absolute;left:' + (wx - wellS / 2) + 'px;top:' + wy + 'px;width:' + wellS + 'px;height:' + wellS + 'px;box-sizing:border-box;border-radius:' + 5 * u + 'px;border:1px dashed rgba(231,235,243,.22);background:radial-gradient(circle at 50% 45%,rgba(163,174,194,.42),rgba(54,66,88,.6) 55%,rgba(28,37,54,.7) 100%)');
  col.appendChild(well);
  if (g.look === 'cylinder') return drawCylinder(well, g, wellS, u, ms, t, still, show);
  if (g.look === 'arrows') return drawArrows(well, g, wellS, u, ms, t, still, show);
  if (g.look === 'count') { if (still) { show(g.to, true); return 0; } show(g.from); tick(g.from, g.to, t(0.3), t(0.75), show); return t(0.75); }
  // a magazine (or a canister): the old one out, the fresh one in, the count up
  const P = magPicture(g.mag!), fit = Math.min((wellS - 6 * u) / P.h, (wellS - 6 * u) / P.w), mw = P.w * fit, mh = P.h * fit;
  // the fresh one lit (brighter steel and a light rim, so it reads against the card); the old one muted
  const LIT = 'brightness(1.6) contrast(1.05) drop-shadow(0 0 ' + 0.9 * u + 'px rgba(231,235,243,.95)) ', DIM = 'saturate(.4) brightness(.7) ';
  const mag = (tag: string, lit = true) => { const d = div('position:absolute;left:' + (wellS / 2 - mw / 2 - 1) + 'px;top:' + (wellS / 2 - mh / 2 - 1) + 'px;width:' + mw + 'px;height:' + mh + 'px;will-change:transform,opacity;filter:' + (lit ? LIT : DIM) + 'drop-shadow(0 ' + 2 * u + 'px ' + 2 * u + 'px rgba(0,0,0,.7))' + (P.glow ? ' drop-shadow(0 0 ' + 3 * u + 'px ' + P.glow + ')' : ''), { 'data-reload-piece': tag, 'data-reload-lit': lit ? '1' : '0' }); d.appendChild(P.el()); well.appendChild(d); return d; };
  if (still) { mag('new'); show(g.to, true); return 0; }
  if (g.look === 'fuel') {
    const n = mag('new'); n.style.opacity = '0';
    anim(n, [{ transform: 'translate(' + -wellS * 0.7 + 'px,0) rotate(-10deg)', opacity: 0 }, { opacity: 1, offset: 0.4 }, { transform: 'translate(0,0) rotate(0)', opacity: 1 }], { duration: t(0.42) - t(0.14), delay: t(0.14), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
    show(g.from); tick(g.from, g.to, t(0.45), t(0.85), show); return t(0.85);
  }
  // the old one, with what was left in it
  const old = mag('old:' + (g.out || 'none'), false); old.setAttribute('data-reload-old', g.out || '');
  show(g.left ?? 0);
  if (g.out === 'pack' && dest) {
    // slides right into the pack, shrinking (the pack bumps and keeps a +1, above)
    const dx = (cw - GS / 2 - 2 * u) - wx, dy = (wy + wellS / 2 - GS / 2 + 2 * u) - (wy + wellS / 2);
    anim(old, [{ transform: 'translate(0,0) scale(1)', opacity: 1 }, { transform: 'translate(' + dx * 0.15 + 'px,' + (-4 * u) + 'px) scale(.95) rotate(6deg)', opacity: 1, offset: 0.25 },
      { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.32) rotate(18deg)', opacity: 0.9, offset: 0.88 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(.2) rotate(18deg)', opacity: 0 }],
    { duration: t(0.36) - t(0.1), delay: t(0.1), easing: 'cubic-bezier(.5,0,.4,1)', fill: 'forwards' });
  } else if (!g.out) {
    // a swap that drops nothing (unlimited spares: a companion's, a twin's): the old one slips out of the well and is
    // gone, no fall toward the unit (nothing lands in the pile)
    anim(old, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(0,' + 10 * u + 'px) scale(.9)', opacity: 0 }],
      { duration: t(0.3) - t(0.1), delay: t(0.1), easing: 'ease-in', fill: 'forwards' });
  } else {
    // drops out of the bottom of the card, toward the unit and the ground under it (fx/brass.ts dropMag takes it from
    // under the portrait to the floor, where the pile is)
    old.style.zIndex = '3'; // over the card, but behind the bar and the count (z 4) as it falls past them
    anim(old, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(0,' + 6 * u + 'px) rotate(2deg)', opacity: 1, offset: 0.18 },
      { transform: 'translate(' + 3 * u + 'px,' + fall * 0.75 + 'px) rotate(12deg)', opacity: 1, offset: 0.78 }, { transform: 'translate(' + 4 * u + 'px,' + fall + 'px) rotate(16deg) scale(.7)', opacity: 0 }],
    { duration: t(0.34) - t(0.1), delay: t(0.1), easing: 'cubic-bezier(.55,0,.9,.6)', fill: 'forwards' });
  }
  after(() => show(0), t(0.14));
  // the fresh one: in from the left, clicked home (a white flash in the well), the count up
  const fresh = mag('new'); fresh.style.opacity = '0';
  anim(fresh, [{ transform: 'translate(' + -wellS * 0.85 + 'px,' + 8 * u + 'px) rotate(-14deg)', opacity: 0 }, { opacity: 1, offset: 0.35 }, { transform: 'translate(' + 2 * u + 'px,' + -2 * u + 'px) rotate(2deg)', opacity: 1, offset: 0.82 }, { transform: 'translate(0,0) rotate(0)', opacity: 1 }],
    { duration: t(0.56) - t(0.34), delay: t(0.34), easing: 'cubic-bezier(.2,.8,.3,1)', fill: 'forwards' });
  anim(well, [{ boxShadow: '0 0 0 0 rgba(255,255,255,0)', borderColor: 'rgba(231,235,243,.22)' }, { boxShadow: '0 0 0 ' + 3 * u + 'px rgba(255,255,255,.75)', borderColor: '#FFFFFF', offset: 0.2 }, { boxShadow: '0 0 0 ' + 7 * u + 'px rgba(255,255,255,0)', borderColor: 'rgba(231,235,243,.22)' }], { duration: 300, delay: t(0.56) });
  tick(0, g.to, t(0.56), t(0.8), show);
  return t(0.8);
}

/** Run the count from a to b between two times (ms from now), the last step marked done. */
function tick(a: number, b: number, t0: number, t1: number, show: (n: number, done?: boolean) => void) {
  if (b <= a) { after(() => show(b, true), t1); return; }
  const steps = Math.min(b - a, 14);
  for (let i = 1; i <= steps; i++) { const n = i === steps ? b : a + Math.round(((b - a) * i) / steps); after(() => show(n, i === steps), t0 + ((t1 - t0) * i) / steps); }
}

/** A row of rounds: those already in, then each new one fed into its slot from above, the count ticking with it. */
function drawRounds(col: HTMLElement, g: ReloadGun, cw: number, wy: number, u: number, ms: number, t: (f: number) => number, still: boolean, show: (n: number, done?: boolean) => void): number {
  const n = Math.min(10, g.cap), P = g.shell ? roundPicture(g.shell) : null, slotH = (n > 6 ? 30 : 34) * u;
  const sw = P ? Math.max(6 * u, Math.min(16 * u, (slotH * P.h) / P.w)) : 8 * u, rowW = n * (sw + 3 * u) - 3 * u, x0 = (cw - rowW) / 2, y0 = wy + 8 * u;
  const row = div('position:absolute;left:' + (x0 - 5 * u) + 'px;top:' + (y0 - 5 * u) + 'px;width:' + (rowW + 10 * u) + 'px;height:' + (slotH + 10 * u) + 'px;box-sizing:border-box;border-radius:' + 5 * u + 'px;border:1px dashed rgba(231,235,243,.22);background:rgba(10,13,19,.55)');
  col.appendChild(row);
  const scale = g.cap > n ? n / g.cap : 1; // more rounds than slots: the row shows the share of them
  const shown = (k: number) => Math.round(k * scale);
  const slot = (i: number, full: boolean, tag: string) => {
    const x = x0 + i * (sw + 3 * u), d = div('position:absolute;left:' + x + 'px;top:' + y0 + 'px;width:' + sw + 'px;height:' + slotH + 'px;box-sizing:border-box;border-radius:' + 2 * u + 'px;' + (full ? '' : 'border:1px solid rgba(163,174,194,.35)'), full ? { 'data-reload-piece': tag } : {});
    if (full && P) {
      // the round stands nose up: its picture (nose right) turned a quarter
      const r = div('position:absolute;left:' + (sw / 2 - slotH / 2) + 'px;top:' + (slotH / 2 - sw / 2) + 'px;width:' + slotH + 'px;height:' + sw + 'px;transform:rotate(-90deg);filter:drop-shadow(0 1px 1px rgba(0,0,0,.7))' + (P.glow ? ' drop-shadow(0 0 2px ' + P.glow + ')' : ''));
      r.appendChild(P.el()); d.appendChild(r);
    } else if (full) d.style.background = '#E2B85A';
    col.appendChild(d); return d;
  };
  for (let i = 0; i < n; i++) slot(i, false, '');
  for (let i = 0; i < shown(g.from); i++) slot(i, true, 'round');
  if (still) { for (let i = shown(g.from); i < shown(g.to); i++) slot(i, true, 'round'); show(g.to, true); return 0; }
  show(g.from);
  const k = Math.max(1, g.to - g.from), span = 0.72;
  for (let j = 1; j <= k; j++) {
    const at = t(0.12 + (span * (j - 1)) / k), cnt = g.from + j;
    const i = shown(cnt) - 1, prev = shown(cnt - 1);
    if (i >= prev && i >= 0) after(() => { const d = slot(i, true, 'round:new'); anim(d, [{ transform: 'translateY(' + -14 * u + 'px)', opacity: 0 }, { transform: 'translateY(' + 1 * u + 'px)', opacity: 1, offset: 0.75 }, { transform: 'translateY(0)', opacity: 1 }], { duration: 170, easing: 'ease-in', fill: 'both' }); }, at);
    after(() => show(cnt, cnt >= g.to), at + 150);
  }
  return t(0.12 + span);
}

/** A revolver's cylinder seen end on: its chambers (what was in them), emptied, then filled as it turns. */
function drawCylinder(well: HTMLElement, g: ReloadGun, S: number, u: number, ms: number, t: (f: number) => number, still: boolean, show: (n: number, done?: boolean) => void): number {
  const n = Math.max(2, Math.min(8, g.cap)), R = 0.5 * S - 3 * u, cr = Math.min(0.22 * S, (Math.PI * R * 0.62) / n) * 0.62, rr = R - cr - 3 * u;
  const NS = 'http://www.w3.org/2000/svg', s = document.createElementNS(NS, 'svg'), id = 'phcrl' + (++uid);
  s.setAttribute('viewBox', '0 0 ' + S + ' ' + S); s.setAttribute('width', '100%'); s.setAttribute('height', '100%'); s.style.cssText = 'position:absolute;inset:0;overflow:visible;transform-origin:50% 50%';
  let inner = '<defs><radialGradient id="' + id + 'c" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#8D96A6"/><stop offset=".6" stop-color="#454C5A"/><stop offset="1" stop-color="#1A1F27"/></radialGradient>'
    + '<radialGradient id="' + id + 'b" cx=".4" cy=".35" r=".8"><stop offset="0" stop-color="#FBE7A1"/><stop offset=".5" stop-color="#E2B85A"/><stop offset="1" stop-color="#7A5A1C"/></radialGradient></defs>'
    + '<circle cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + R + '" fill="url(#' + id + 'c)" stroke="#14181F" stroke-width="' + u + '"/><circle cx="' + S / 2 + '" cy="' + S / 2 + '" r="' + 2.4 * u + '" fill="#9AA3B2"/>';
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / n, cx = S / 2 + Math.cos(a) * rr, cy = S / 2 + Math.sin(a) * rr;
    inner += '<circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + cr.toFixed(1) + '" fill="#0A0D13" stroke="#14181F" stroke-width="' + 0.8 * u + '"/>'
      + '<g data-ch="' + i + '" opacity="0"><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (cr * 0.86).toFixed(1) + '" fill="url(#' + id + 'b)" stroke="#5E4413" stroke-width="' + 0.6 * u + '"/><circle cx="' + cx.toFixed(1) + '" cy="' + cy.toFixed(1) + '" r="' + (cr * 0.3).toFixed(1) + '" fill="#8E6A22"/></g>';
  }
  s.innerHTML = inner; well.appendChild(s);
  const ch = (i: number) => s.querySelector('[data-ch="' + i + '"]') as SVGGElement | null;
  const set = (k: number) => { for (let i = 0; i < n; i++) { const c = ch(i); if (c) c.setAttribute('opacity', i < Math.round((k * n) / g.cap) ? '1' : '0'); } };
  if (still) { set(g.to); show(g.to, true); return 0; }
  // what was in it shows first (a swap: the spent brass dumped out at once, as fx/brass.ts drops it)
  const before = g.left ?? g.from; set(before); show(before);
  if (g.left != null && g.swap) after(() => { set(0); show(0); }, t(0.14));
  const k = Math.max(1, g.to - g.from), each = g.each, t0 = g.swap ? 0.36 : 0.14, span = each ? 0.66 : 0.24;
  for (let j = 1; j <= k; j++) {
    const cnt = g.from + j, at = t(t0 + (span * (j - 1)) / k);
    after(() => { set(cnt); show(cnt, cnt >= g.to); }, at);
    // it turns a chamber with each round loaded by hand
    if (each) anim(s, [{ transform: 'rotate(' + (-(j - 1) * 360) / n + 'deg)' }, { transform: 'rotate(' + (-j * 360) / n + 'deg)' }], { duration: 140, delay: at, easing: 'ease-out', fill: 'forwards' });
  }
  if (!each) anim(s, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(' + 360 / n + 'deg)', offset: 0.6 }, { transform: 'rotate(' + 360 / n + 'deg)' }], { duration: 360, delay: t(t0 + span), easing: 'ease-out', fill: 'forwards' });
  return t(t0 + span);
}

/** Arrows (or a bolt) slid down into the quiver, one after another, the count with them. */
function drawArrows(well: HTMLElement, g: ReloadGun, S: number, u: number, ms: number, t: (f: number) => number, still: boolean, show: (n: number, done?: boolean) => void): number {
  const bolt = brassOf(g.weapon, '').bow === 'crossbow', q = div('position:absolute;left:' + S * 0.3 + 'px;top:' + S * 0.34 + 'px;width:' + S * 0.4 + 'px;height:' + S * 0.58 + 'px;border-radius:' + 3 * u + 'px;background:linear-gradient(90deg,#4E3218,#8A5E31 45%,#4E3218);border:1px solid #2A1A0B;box-sizing:border-box');
  well.appendChild(q);
  if (still) { show(g.to, true); return 0; }
  show(g.from);
  const k = Math.max(1, g.to - g.from), vis = Math.min(3, k), len = S * 1.15, h = len / 6;
  for (let j = 0; j < vis; j++) {
    const a = div('position:absolute;left:' + (S / 2 - len / 2 + (j - 1) * 4 * u) + 'px;top:' + (S * 0.2 - h / 2) + 'px;width:' + len + 'px;height:' + h + 'px;transform-origin:50% 50%', { 'data-reload-piece': bolt ? 'bolt' : 'arrow' });
    a.appendChild(arrowPicture(bolt)); a.style.opacity = '0'; well.insertBefore(a, q);
    anim(a, [{ transform: 'translateY(' + -S * 0.3 + 'px) rotate(90deg)', opacity: 0 }, { transform: 'translateY(' + -S * 0.18 + 'px) rotate(90deg)', opacity: 1, offset: 0.3 }, { transform: 'translateY(' + S * 0.12 + 'px) rotate(90deg)', opacity: 1 }],
      { duration: (ms * 0.6) / vis, delay: t(0.12 + (0.6 * j) / vis), easing: 'ease-in', fill: 'forwards' });
  }
  tick(g.from, g.to, t(0.15), t(0.75), show);
  return t(0.75);
}
