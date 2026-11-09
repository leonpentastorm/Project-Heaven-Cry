// Outburst 2.0 (rules 1.5, docs/rules/PHC-Core-Rules-v1.0.md "Soul magic: Outbursts, the heart"): how the heart looks
// and sounds. Sigils snap in cyan squares; the heart breathes in violet. Begin is a breath in and the chest lights; each
// Pump is a thump and a ring that grows with the stage (a free Pump shimmers silver; stage 4 throbs the screen's edge);
// a swell is a slow beat at the turn's start; a release takes its form (Bolt beam, Wave cone, Burst bloom, Aura nova,
// Lance line) in the violet that warms into its tone's element; calming is a long breath out, Let go a harmless sigh;
// Strain near the limit tightens the beat, a burn cracks the heart red, a Mana Short stops it (the room goes grey and
// quiet, then a crack). Storm Hand's infusion, Charges and Discharge live here too. The standing look of a held heart
// (its glow by stage, the elemental aura, Heart Overwatch's eye) is drawn from the game state by ambient.ts with
// heartNode below, so everyone sees it, on joining too. Nothing here reads or changes the rules.
import type { FxEvent } from '@engine';
import { type Sfx, duckSfx, reducedMotion } from '../sfx';
import { GLYPH_PATHS, SIGIL_INK, SOUL_INK, SOUL_WARM } from '../glyphs';
import { type ElementFx, type ElementId, ELEMENTS, elementFx, elementImpact, jag, mix, shardCss } from './elements';
import { type Pt, after, anim, burst, centre, edgePulse, flash, floatText, particle, put, ring, screenTint, shake, shakeScreen, svg } from './dom';
import { feelingPump } from './feelings';

const HP = '#F65157', WHITE = '#FFFFFF', MUTED = '#A3AEC2', COOL = '#8FB4FF', MP = '#5C9EFF';
/** What play.ts lends the Soul handlers: where things are (respecting fog), tokens, and panned sound. */
export interface SoulKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
}

// ---------- colour ----------
/** The tone's element (the engine sends tone ids: storm is shock, frost is freeze). */
export const toneEl = (e: { [k: string]: any }): ElementFx => elementFx(e.element || (e.tone && e.tone !== 'raw' ? e.tone : null));
/** The heart's colour at a stage (0–4): violet that warms into the element; raw magic stays violet and brightens. */
export function stageColour(stage: number, el: ElementFx): string {
  const t = Math.max(0, Math.min(1, stage / 4));
  return el.id === 'raw' ? mix(SOUL_INK, '#E9E2FF', t * 0.7) : mix(SOUL_INK, el.ink, 0.2 + t * 0.7);
}
/** A pump's look and sound as numbers (pure, for the tests): ring size, ring width, thump pitch and loudness, motes. */
export function pumpLook(stage: number, free = false) {
  const st = Math.max(1, Math.min(4, stage || 1));
  return { ringTo: 0.9 + 0.32 * st, width: 3 + st, rate: 0.84 + 0.07 * st, gain: 0.62 + 0.12 * st, motes: 2 + 2 * st, throb: 1 + 0.035 * st, edge: st >= 4, shimmer: free };
}
/** A release's scale by stage (pure): power for the element impact, screen shake, whether the choir sings. */
export function releaseLook(stage: number, el: ElementFx) {
  const st = Math.max(0, Math.min(4, stage || 0));
  return { power: 0.5 + 0.2 * st, shake: st >= 2 ? (0.12 + 0.12 * st) * (0.6 + el.shake) : 0, choir: st >= 3, size: 1 + 0.25 * st };
}
/** The aura's sound bed for a tone's element (the Sigil field loop, softened in sfx.ts LOOP_OPTS). */
export const AURA_LOOP: Partial<Record<ElementId, Sfx>> = { fire: 'soul_fire_loop', shock: 'soul_storm_loop', freeze: 'soul_frost_loop', stone: 'soul_stone_loop', gale: 'soul_gale_loop', acid: 'soul_acid_loop' };

// ---------- pieces ----------
const chest = (p: Pt): Pt => ({ x: p.x, y: p.y + p.s * 0.06, s: p.s });
/** Soft violet motes drawn in from around a point to its centre (a breath in, a glyph fed, an aura feeding back). */
function drawIn(p: Pt, color: string, n: number, ms: number, r = 1.3, from?: string) {
  if (reducedMotion()) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2 + Math.random() * 0.5, d = p.s * r * (0.8 + Math.random() * 0.4), sz = Math.max(3, p.s * (0.06 + Math.random() * 0.05));
    const dx = Math.cos(a) * d, dy = Math.sin(a) * d;
    particle({ x: p.x + dx, y: p.y + dy }, sz, 'border-radius:50%;background:' + (from || color) + ';box-shadow:0 0 8px ' + color + ';filter:blur(.6px)',
      [{ transform: 'translate(0,0) scale(1)', opacity: 0, background: from || color }, { opacity: 1, offset: 0.3 }, { transform: 'translate(' + -dx + 'px,' + -dy + 'px) scale(.4)', opacity: 0.2, background: color }], ms * (0.8 + Math.random() * 0.3), i * 22, 'cubic-bezier(.5,0,.8,.6)');
  }
}
/** Motes rising off a point (embers of raw magic, a heart's overflow). */
function rise(p: Pt, color: string, n: number, ms: number, spread = 0.8) {
  if (reducedMotion()) n = Math.min(n, 2);
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * p.s * spread, sz = Math.max(3, p.s * (0.05 + Math.random() * 0.05));
    particle({ x: p.x + x, y: p.y + p.s * 0.1 }, sz, 'border-radius:50%;background:' + color + ';box-shadow:0 0 8px ' + color, [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(' + x * 0.4 + 'px,-' + p.s * (0.7 + Math.random() * 0.6) + 'px)', opacity: 0 }], ms * (0.7 + Math.random() * 0.5), i * 35);
  }
}
/** A soft, bright bloom of light (a radial gradient, screened): the sprites' glow is too faint on the grid for the heart,
 *  so the Soul family draws its own. Holds its light for a moment before it fades. */
function bloom(p: { x: number; y: number }, size: number, ms: number, o: { color?: string; from?: number; to?: number; delay?: number; blend?: string; core?: boolean } = {}) {
  const run = () => {
    const c = o.color || SOUL_INK, d = document.createElement('div');
    d.style.cssText = 'width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,' + (o.core === false ? c : '#FFFFFF') + ' 0,' + c + 'EE 22%,' + c + '88 45%,' + c + '00 70%)';
    const box = put(d, p, size, size, ms); box.style.mixBlendMode = 'screen';
    const a = o.from ?? 0.3, b = o.to ?? 1.15;
    anim(box, reducedMotion() ? [{ opacity: 0.9 }, { opacity: 0 }] : [{ transform: 'scale(' + a + ')', opacity: 0 }, { transform: 'scale(' + (a + (b - a) * 0.5) + ')', opacity: 1, offset: 0.18 }, { opacity: 0.8, offset: 0.5 }, { transform: 'scale(' + b + ')', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.25,.6,.35,1)', fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}
/** A soft glow at the chest that swells in (Begin) or flares (a pump). */
function glow(p: Pt, color: string, size: number, ms: number, o: { from?: number; to?: number; delay?: number } = {}) {
  bloom(chest(p), p.s * size, ms, { color, from: o.from ?? 0.3, to: o.to ?? 1.1, blend: 'screen', delay: o.delay });
}
/** The token's heartbeat: a throb (scale) that doesn't touch the template's own transform. */
function throb(tok: HTMLElement | null, k: number, ms = 360) {
  if (!tok || reducedMotion()) return;
  anim(tok, [{ scale: '1' }, { scale: String(k), offset: 0.18 }, { scale: '1', offset: 0.4 }, { scale: String(1 + (k - 1) * 0.5), offset: 0.58 }, { scale: '1' }], { duration: ms, easing: 'ease-out' });
}
/** Glow on a token (filter), violet by default. */
function tint(tok: HTMLElement | null, color: string, ms = 500, k = 1) {
  if (!tok) return;
  anim(tok, [{ filter: 'none' }, { filter: 'drop-shadow(0 0 ' + Math.round(6 * k) + 'px ' + color + ') brightness(' + (1 + 0.25 * k).toFixed(2) + ')', offset: 0.25 }, { filter: 'none' }], { duration: ms, easing: 'ease-out' });
}
/** Silver sparkles around a point (a free Pump). */
function shimmer(p: Pt, n = 5) {
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = p.s * (0.45 + Math.random() * 0.4);
    burst('flash_star', { x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }, p.s * (0.25 + Math.random() * 0.2), 420, { color: i % 2 ? WHITE : '#DCD6FF', from: 0.2, to: 1, delay: i * 55, blend: 'screen' });
  }
}
/** A dashed ring that spins as it swells (the shimmer of a free Pump). */
function dashRing(p: Pt, color: string, ms: number, to: number) {
  const s = svg(100, 100, '<circle cx="50" cy="50" r="40" fill="none" stroke="' + color + '" stroke-width="3" stroke-dasharray="4 7" stroke-linecap="round"/>');
  const box = put(s, p, p.s * 1.6, p.s * 1.6, ms);
  anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'rotate(0deg) scale(.5)', opacity: 1 }, { transform: 'rotate(140deg) scale(' + to + ')', opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}
/** A ring that closes in (tightening Strain, a steadied heart). */
function closeRing(p: Pt, color: string, ms: number, from = 1.4, to = 0.6, hold = false, width = 4) {
  const s = svg(100, 100, '<circle cx="50" cy="50" r="40" fill="none" stroke="' + color + '" stroke-width="' + width + '" style="filter:blur(.6px)"/>');
  const box = put(s, p, p.s * 1.6, p.s * 1.6, ms);
  anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : hold ? [{ transform: 'scale(' + from + ')', opacity: 0 }, { transform: 'scale(' + to + ')', opacity: 1, offset: 0.35 }, { transform: 'scale(' + to + ')', opacity: 0.9, offset: 0.8 }, { transform: 'scale(' + to + ')', opacity: 0 }]
    : [{ transform: 'scale(' + from + ')', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'scale(' + to + ')', opacity: 0 }], { duration: ms, easing: 'ease-in-out', fill: 'forwards' });
}
/** Red cracks across the heart (a burn, the Short). */
function cracks(p: Pt, color = HP, ms = 900) {
  const c = chest(p), r = () => (Math.random() * 10 - 5).toFixed(1);
  const path = 'M50 50 L' + (34 + +r()) + ' ' + (30 + +r()) + ' L' + (26 + +r()) + ' ' + (18 + +r()) + ' M50 50 L' + (70 + +r()) + ' ' + (36 + +r()) + ' L' + (82 + +r()) + ' ' + (30 + +r()) + ' M50 50 L' + (46 + +r()) + ' ' + (72 + +r()) + ' L' + (54 + +r()) + ' ' + (84 + +r()) + ' M50 50 L' + (30 + +r()) + ' ' + (60 + +r());
  const s = svg(100, 100, '<path d="' + path + '" fill="none" stroke="#0A0D13" stroke-width="6" stroke-linejoin="miter" opacity=".7"/><path d="' + path + '" fill="none" stroke="' + color + '" stroke-width="3" stroke-linejoin="miter" style="filter:drop-shadow(0 0 4px ' + color + ')"/><circle cx="50" cy="50" r="5" fill="#FFFFFF"/>');
  const box = put(s, c, p.s * 0.95, p.s * 0.95, ms); box.style.zIndex = '2';
  anim(box, [{ transform: 'scale(.4)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.06 }, { opacity: 1, offset: 0.7 }, { transform: 'scale(1.05)', opacity: 0 }], { duration: ms, easing: 'linear', fill: 'forwards' });
}
/** A curved violet link between two hearts (resonance). */
function link(a: Pt, b: Pt, color: string, ms: number) {
  const minX = Math.min(a.x, b.x) - a.s, minY = Math.min(a.y, b.y) - a.s * 1.5, w = Math.abs(b.x - a.x) + a.s * 2, h = Math.abs(b.y - a.y) + a.s * 2.5;
  const ax = a.x - minX, ay = a.y - minY, bx = b.x - minX, by = b.y - minY, mx = (ax + bx) / 2, my = Math.min(ay, by) - a.s * 1.1;
  const L = Math.hypot(bx - ax, by - ay) * 1.3 + 40;
  const s = svg(w, h, '<path d="M' + ax + ' ' + ay + ' Q' + mx + ' ' + my + ' ' + bx + ' ' + by + '" fill="none" stroke="' + color + '" stroke-width="4" stroke-linecap="round" stroke-dasharray="' + L + '" stroke-dashoffset="' + L + '" style="filter:drop-shadow(0 0 6px ' + color + ')"/>');
  const box = put(s, { x: minX + w / 2, y: minY + h / 2 }, w, h, ms);
  const pth = s.querySelector('path'); if (pth) anim(pth, [{ strokeDashoffset: L }, { strokeDashoffset: 0, offset: 0.35 }, { strokeDashoffset: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}
/** A soft beam from a to b (Bolt; Lance runs it on past the target, thin and white-cored). */
function beam(a: Pt, b: Pt, el: ElementFx, ms: number, o: { thin?: boolean; color?: string } = {}) {
  const len = Math.hypot(b.x - a.x, b.y - a.y), deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, h = Math.max(4, a.s * (o.thin ? 0.12 : 0.26));
  const col = o.color || stageColour(3, el), bar = document.createElement('div');
  bar.style.cssText = 'width:100%;height:100%;border-radius:' + h + 'px;background:linear-gradient(90deg,' + SOUL_INK + ',' + col + ' 55%,' + (el.id === 'raw' ? '#E9E2FF' : el.core) + ');box-shadow:0 0 14px ' + col + ',0 0 4px ' + SOUL_INK + ';filter:blur(' + (o.thin ? 0.3 : 1.1) + 'px)';
  const box = put(bar, a, len, h, ms + 300);
  box.style.transformOrigin = '0 50%'; box.style.left = a.x + 'px'; box.style.top = a.y - h / 2 + 'px'; box.style.mixBlendMode = 'screen';
  anim(box, reducedMotion() ? [{ transform: 'rotate(' + deg + 'deg)', opacity: 1 }, { transform: 'rotate(' + deg + 'deg)', opacity: 0 }]
    : [{ transform: 'rotate(' + deg + 'deg) scaleX(0) scaleY(.4)', opacity: 0.6 }, { transform: 'rotate(' + deg + 'deg) scaleX(1) scaleY(1)', opacity: 1, offset: ms / (ms + 300) }, { transform: 'rotate(' + deg + 'deg) scaleX(1) scaleY(' + (o.thin ? 0.2 : 1.6) + ')', opacity: 0 }], { duration: ms + 300, easing: 'cubic-bezier(.3,.1,.3,1)', fill: 'forwards' });
}
/** Wave: a soft sector sweeping out from the caster toward the aim. */
function cone(a: Pt, aim: Pt, reach: number, el: ElementFx, ms: number) {
  const deg = (Math.atan2(aim.y - a.y, aim.x - a.x) * 180) / Math.PI, R = Math.max(a.s * 1.5, reach), col = stageColour(3, el);
  const half = 38, x1 = 50 + 50 * Math.cos((-half * Math.PI) / 180), y1 = 50 + 50 * Math.sin((-half * Math.PI) / 180), x2 = 50 + 50 * Math.cos((half * Math.PI) / 180), y2 = 50 + 50 * Math.sin((half * Math.PI) / 180);
  const id = 'cg' + Math.floor(Math.random() * 1e9);
  const s = svg(100, 100, '<defs><radialGradient id="' + id + '" cx="50" cy="50" r="50" gradientUnits="userSpaceOnUse"><stop offset="0" stop-color="' + SOUL_INK + '" stop-opacity=".35"/><stop offset=".6" stop-color="' + col + '" stop-opacity=".85"/><stop offset="1" stop-color="' + col + '" stop-opacity="0"/></radialGradient></defs><path d="M50 50 L' + x1.toFixed(1) + ' ' + y1.toFixed(1) + ' A50 50 0 0 1 ' + x2.toFixed(1) + ' ' + y2.toFixed(1) + ' Z" fill="url(#' + id + ')" style="filter:blur(2px)"/>');
  const box = put(s, a, R * 2, R * 2, ms); box.style.mixBlendMode = 'screen';
  anim(box, reducedMotion() ? [{ transform: 'rotate(' + deg + 'deg)', opacity: 1 }, { transform: 'rotate(' + deg + 'deg)', opacity: 0 }] : [{ transform: 'rotate(' + deg + 'deg) scale(.15)', opacity: 1 }, { transform: 'rotate(' + deg + 'deg) scale(1)', opacity: 1, offset: 0.5 }, { transform: 'rotate(' + deg + 'deg) scale(1.06)', opacity: 0 }], { duration: ms, easing: 'cubic-bezier(.2,.7,.3,1)', fill: 'forwards' });
}
/** The element's soft cloud on a tile, violet first (the Soul family), raw magic as violet smoke and embers. */
function cloud(q: Pt, el: ElementFx, power: number, delay = 0, sound?: (s: Sfx, o?: any) => void) {
  elementImpact(q, el.id, 'soul', { power, delay, quiet: !sound, sound });
  // The warming: the violet bloom gives way to the element itself a beat later (fire's flame, frost's star, shock's arc…).
  if (el.id !== 'raw') after(() => { const sp = el.sprites[el.sprites.length - 1]; bloom(q, q.s * (0.9 + 0.5 * power), 700, { color: el.ink, from: 0.3, to: 1.2 }); burst(sp.name, q, q.s * sp.scale * (0.8 + 0.35 * power), sp.ms * 1.3, { color: el.ink, from: 0.3, to: 1.25, blend: 'screen' }); burst('flare', q, q.s * (0.7 + 0.4 * power), 260, { color: el.core, from: 0.3, to: 1.2, blend: 'screen' }); }, delay + 160);
  if (el.id === 'raw') { after(() => { bloom(q, q.s * (0.8 + 0.4 * power), 800, { color: SOUL_INK, from: 0.3, to: 1.2, core: false }); burst('smoke_soft', q, q.s * (1 + 0.4 * power), 1100, { color: SOUL_INK, from: 0.4, to: 1.4, blend: 'screen' }); rise(q, SOUL_INK, 4, 900); }, delay); }
}
const tilesOf = (e: FxEvent): string[] => (Array.isArray(e.area) ? e.area : Array.isArray(e.tiles) ? e.tiles : []).filter((k: any) => typeof k === 'string');

// ---------- the standing look of a held heart (ambient.ts keeps one per holder while it holds) ----------
/** A held Outburst's look over its holder's token (2 tiles across, centred): the heart's glow by stage, beating faster
 *  as it grows, four stage pips, the elemental aura per tone (embers, static, frost mist, dust, wind, acid drip), and
 *  Heart Overwatch's eye ring. Under reduced motion it stands still. */
export function heartNode(stage: number, x: string | null | undefined, watch: boolean, mine = true): HTMLElement {
  const el = elementFx(x), st = Math.max(0, Math.min(4, stage | 0)), col = stageColour(st, el), still = reducedMotion();
  const d = document.createElement('div');
  d.style.cssText = 'position:relative;width:100%;height:100%;pointer-events:none';
  d.dataset.heart = String(st); d.dataset.aura = el.id; if (watch) d.dataset.watch = '1';
  const loop = (n: Element, f: Keyframe[], ms: number, o: KeyframeAnimationOptions = {}) => { if (!still) anim(n, f, { duration: ms, iterations: Infinity, ...o }); };
  const add = (css: string, html = '') => { const c = document.createElement('div'); c.style.cssText = 'position:absolute;' + css; c.innerHTML = html; d.appendChild(c); return c; };
  // The aura (an elemental tone): a soft ring around the holder, alive in the element's way.
  if (el.id !== 'raw') {
    const ringEl = add('inset:8%;border-radius:50%;border:2px solid ' + mix(SOUL_INK, el.ink, 0.65) + ';box-shadow:0 0 12px ' + mix(SOUL_INK, el.ink, 0.5) + ',inset 0 0 14px ' + mix(SOUL_INK, el.ink, 0.35) + ';opacity:.55;mix-blend-mode:screen');
    loop(ringEl, [{ opacity: 0.35, transform: 'scale(.97)' }, { opacity: 0.7, transform: 'scale(1.02)' }, { opacity: 0.35, transform: 'scale(.97)' }], 2400, { easing: 'ease-in-out' });
    const bit = (i: number, n: number) => { const a = (i / n) * Math.PI * 2; return { l: 50 + Math.cos(a) * 41, t: 50 + Math.sin(a) * 41 }; };
    switch (el.id) {
      case 'fire': for (let i = 0; i < 6; i++) { const b = bit(i, 6), m = add('left:' + b.l + '%;top:' + b.t + '%;width:5%;height:5%;' + shardCss(el, 'soul', 0.8)); loop(m, [{ transform: 'translate(-50%,-50%)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,-260%)', opacity: 0 }], 1300 + i * 170, { delay: i * 210 }); } break;
      case 'shock': { const s = add('inset:4%', '<svg viewBox="0 0 100 100" width="100%" height="100%"><polyline class="s1" points="10,40 22,30 18,22 30,12" fill="none" stroke="' + el.core + '" stroke-width="2"/><polyline class="s2" points="88,58 78,70 84,78 70,90" fill="none" stroke="' + el.ink + '" stroke-width="2"/><polyline class="s3" points="70,8 62,20 72,24 60,34" fill="none" stroke="' + el.core + '" stroke-width="1.6"/></svg>');
        ['.s1', '.s2', '.s3'].forEach((c, i) => { const n = s.querySelector(c); if (n) loop(n, [{ opacity: 0 }, { opacity: 0, offset: 0.2 + i * 0.2 }, { opacity: 1, offset: 0.25 + i * 0.2 }, { opacity: 0, offset: 0.32 + i * 0.2 }, { opacity: 0 }], 1100 + i * 230, { easing: 'steps(1, end)' }); }); break; }
      case 'freeze': { const m = add('inset:2%;border-radius:50%;background:radial-gradient(circle,rgba(189,243,255,0) 45%,rgba(189,243,255,.28) 62%,rgba(189,243,255,0) 74%);filter:blur(2px)'); loop(m, [{ opacity: 0.4, transform: 'rotate(0deg) scale(.96)' }, { opacity: 0.9, transform: 'rotate(180deg) scale(1.04)' }, { opacity: 0.4, transform: 'rotate(360deg) scale(.96)' }], 3600, { easing: 'ease-in-out' });
        for (let i = 0; i < 3; i++) { const b = bit(i * 2 + 1, 6), f = add('left:' + b.l + '%;top:' + b.t + '%;width:6%;height:6%;transform:translate(-50%,-50%);background:#FFFFFF;clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)'); loop(f, [{ opacity: 0 }, { opacity: 0.9, offset: 0.5 }, { opacity: 0 }], 1500 + i * 400, { delay: i * 300 }); } break; }
      case 'stone': { const w = add('inset:0'); for (let i = 0; i < 5; i++) { const b = bit(i, 5), m = add('left:' + b.l + '%;top:' + b.t + '%;width:5%;height:5%;' + shardCss(el, 'soul', 0.9)); void w; loop(m, [{ transform: 'translate(-50%,-50%) translate(0,0)', opacity: 0.2 }, { opacity: 0.9, offset: 0.5 }, { transform: 'translate(-50%,-50%) translate(' + (i % 2 ? 60 : -60) + '%,40%)', opacity: 0.1 }], 2600 + i * 300, { delay: i * 250, easing: 'ease-in-out' }); } break; }
      case 'gale': { const s = add('inset:3%', '<svg viewBox="0 0 100 100" width="100%" height="100%"><path d="M50 8 A42 42 0 0 1 92 50" fill="none" stroke="' + el.ink + '" stroke-opacity=".75" stroke-width="2.4" stroke-linecap="round"/><path d="M50 92 A42 42 0 0 1 8 50" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width="1.8" stroke-linecap="round"/><path d="M80 20 A40 40 0 0 1 86 66" fill="none" stroke="' + el.ink + '" stroke-opacity=".45" stroke-width="1.4" stroke-linecap="round"/></svg>'); loop(s, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], 2200, { easing: 'linear' }); break; }
      case 'acid': for (let i = 0; i < 4; i++) { const b = bit(i * 2 + 1, 8), m = add('left:' + b.l + '%;top:' + b.t + '%;width:4.5%;height:4.5%;' + shardCss(el, 'soul', 0.9)); loop(m, [{ transform: 'translate(-50%,-50%)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translate(-50%,180%)', opacity: 0 }], 1500 + i * 260, { delay: i * 320, easing: 'ease-in' }); } break;
      default: break;
    }
  }
  // The heart itself: a glow at the chest that beats (lub-dub), faster and bigger with the stage.
  const size = 13 + 4 * st, core = add('left:' + (50 - size / 2) + '%;top:' + (52 - size / 2) + '%;width:' + size + '%;height:' + size + '%;border-radius:50%;mix-blend-mode:screen;background:radial-gradient(circle,#FFFFFF 0,' + col + ' 32%,' + mix(SOUL_INK, '#0A0D13', 0.3) + '00 70%);filter:blur(' + (0.6 + st * 0.25) + 'px)');
  core.dataset.core = '1';
  const period = Math.max(520, 1500 - 240 * st), k = 1.12 + 0.06 * st;
  loop(core, [{ transform: 'scale(1)', opacity: 0.75 }, { transform: 'scale(' + k + ')', opacity: 1, offset: 0.12 }, { transform: 'scale(1)', opacity: 0.8, offset: 0.26 }, { transform: 'scale(' + (1 + (k - 1) * 0.6) + ')', opacity: 0.95, offset: 0.38 }, { transform: 'scale(1)', opacity: 0.75 }], period, { easing: 'ease-out' });
  // A halo that widens with the stage (readable from across the map).
  const halo = add('inset:' + (30 - st * 3) + '%;border-radius:50%;mix-blend-mode:screen;background:radial-gradient(circle,' + col + '55 0,' + col + '00 70%)');
  loop(halo, [{ opacity: 0.5 }, { opacity: 1, offset: 0.12 }, { opacity: 0.5 }], period, { easing: 'ease-out' });
  // Four stage pips under the token: filled to the stage.
  const pips = add('left:30%;right:30%;top:76%;height:5%;display:flex;gap:6%;justify-content:center');
  for (let i = 1; i <= 4; i++) { const p = document.createElement('i'); p.style.cssText = 'display:block;width:18%;height:100%;border-radius:2px;transform:skewX(-14deg);' + (i <= st ? 'background:' + col + ';box-shadow:0 0 6px ' + col : 'background:rgba(10,13,19,.7);box-shadow:inset 0 0 0 1px ' + SOUL_INK + '88'); pips.appendChild(p); }
  // Heart Overwatch armed: an eye on a slow dashed ring (red-eyed when it's watching for the other side).
  if (watch) {
    const eye = mine ? WHITE : HP;
    const w = add('inset:1%', '<svg viewBox="0 0 100 100" width="100%" height="100%" style="overflow:visible"><circle class="wr" cx="50" cy="50" r="47" fill="none" stroke="' + SOUL_INK + '" stroke-width="1.6" stroke-dasharray="3 6"/><g class="we"><path d="M38 4 Q50 -6 62 4 Q50 14 38 4 Z" fill="#0A0D13" stroke="' + eye + '" stroke-width="1.8"/><circle cx="50" cy="4" r="3" fill="' + eye + '"/></g></svg>');
    const wr = w.querySelector('.wr'), we = w.querySelector('.we');
    if (wr) loop(wr, [{ transform: 'rotate(0deg)', transformOrigin: '50px 50px' }, { transform: 'rotate(360deg)', transformOrigin: '50px 50px' }], 9000, { easing: 'linear' });
    if (we) loop(we, [{ transform: 'scaleY(1)', transformOrigin: '50px 4px' }, { transform: 'scaleY(1)', transformOrigin: '50px 4px', offset: 0.9 }, { transform: 'scaleY(.1)', transformOrigin: '50px 4px', offset: 0.95 }, { transform: 'scaleY(1)', transformOrigin: '50px 4px' }], 3200);
  }
  return d;
}

// ---------- the handlers ----------
export function soulHandlers(K: SoulKit): Record<string, (e: FxEvent) => void> {
  const { at, tokOf, play } = K;
  const SOFT = 2600; // the Soul family's low-pass on shared sounds
  return {
    // Begin: a breath in; the chest lights violet; motes are drawn in.
    outburst(e) {
      const p = at(e.at), el = toneEl(e);
      play('soul_breath_in', p, { gain: e.hold ? 1 : 0.7 }); play('soul_hold', p, { delay: 380, rate: 0.9, gain: 0.5, lowpass: SOFT });
      if (!p) return;
      drawIn(p, SOUL_INK, 10, 650, 1.4, el.id === 'raw' ? undefined : mix(SOUL_INK, el.ink, 0.6));
      glow(p, SOUL_INK, 1.6, 900, { from: 0.15, to: 1, delay: 250 });
      after(() => { ring(p, SOUL_INK, 600, { from: 0.4, to: 1, width: 4 }); tint(tokOf(e.unit, e.at), SOUL_INK, 700, 1.2); }, 520);
      if (e.watch) floatText('WATCHING', p, WHITE, { small: true, delay: 600 });
    },
    // Pump: the heartbeat, rising with the stage; a free Pump shimmers silver; stage 4 throbs the screen's edge.
    pump(e) {
      const p = at(e.at), el = toneEl(e), L = pumpLook(e.stage, !!e.free), st = Math.max(1, Math.min(4, e.stage || 1)), col = stageColour(st, el);
      play('soul_thump', p, { rate: L.rate, gain: L.gain });
      if (!p) feelingPump(K, e, null);
      if (st >= 2) play('soul_thump', p, { rate: L.rate * 1.12, gain: L.gain * 0.45, delay: 190 }); // the dub
      if (L.shimmer) play('crystal', p, { rate: 1.6, gain: 0.5, delay: 70 });
      if (L.edge) play('soul_choir', p, { rate: 0.85, gain: 0.55, delay: 120 });
      if (!p) return;
      const tok = tokOf(e.unit, e.at);
      throb(tok, L.throb, 380); tint(tok, col, 420, 0.6 + 0.25 * st);
      glow(p, col, 0.9 + 0.3 * st, 520, { from: 0.5, to: 1.15 }); glow(p, WHITE, 0.4 + 0.12 * st, 260, { from: 0.6, to: 1.1 });
      ring(p, col, 650, { from: 0.4, to: L.ringTo, width: L.width });
      ring(p, col, 560, { from: 0.4, to: L.ringTo * 0.8, width: Math.max(2, L.width - 2), delay: 190 });
      rise(p, col, L.motes, 800, 0.9);
      if (L.shimmer) { shimmer(p, 4 + st); dashRing(p, '#DCD6FF', 700, L.ringTo + 0.2); }
      if (L.edge) { edgePulse(col, 900, 1); shakeScreen(0.18); }
      floatText('STAGE ' + st + (e.mult ? ' ×' + e.mult : '') + (e.free ? ' · FREE' : ''), p, col, { small: true, delay: 120 });
      feelingPump(K, e, p); // rules 1.8: the feeling's colour, motif and sound layer, the counter's shake
    },
    // The swell at the turn's start: one slow, deep beat and a wide, slow ring.
    swell(e) {
      const p = at(e.at), el = toneEl(e), st = e.stage || 1, col = stageColour(st, el);
      play('soul_thump', p, { rate: 0.72 + 0.05 * st, gain: 0.8 }); play('soul_thump', p, { rate: 0.8 + 0.05 * st, gain: 0.35, delay: 420 });
      if (!p) return;
      throb(tokOf(e.unit, e.at), 1.04 + 0.02 * st, 900);
      ring(p, col, 1300, { from: 0.5, to: 1.1 + 0.3 * st, width: 3 + st });
      glow(p, col, 1 + 0.3 * st, 1200, { from: 0.4, to: 1.2 });
      floatText('SWELLS · STAGE ' + st, p, col, { small: true, delay: 200 });
    },
    // The heart held at a turn start (or Heart Overwatch toggled): the standing look is ambient's; arming shows the eye.
    hold(e) {
      const p = at(e.at); if (!p) return;
      if (e.watch) { closeRing(p, WHITE, 520, 1.6, 1, false, 3); floatText('WATCHING', p, WHITE, { small: true }); play('soul_breath_in', p, { rate: 1.25, gain: 0.35 }); }
    },
    // The aura's tick: a flash of the element on each adjacent enemy, fed from the holder's heart.
    aura_tick(e) {
      const p = at(e.at), el = toneEl(e);
      for (const id of (e.targets || []).slice(0, 8)) {
        const k = K.posOf(id), q = at(k); if (!q) continue;
        if (p) for (let i = 0; i < 3; i++) particle(p, Math.max(3, p.s * 0.08), shardCss(el, 'soul', 0.5), [{ transform: 'translate(0,0)', opacity: 0.9 }, { transform: 'translate(' + (q.x - p.x) + 'px,' + (q.y - p.y) + 'px)', opacity: 0.3 }], 260, i * 40);
        cloud(q, el, 0.45, 200); tint(tokOf(id, k), mix(SOUL_INK, el.ink, 0.7), 400, 1);
      }
      if (p && (e.targets || []).length) play(el.sound.tick, p, { rate: el.sound.rate * 0.82, gain: 0.55, lowpass: SOFT, delay: 180 });
    },
    // Release: the form (Bolt, Wave, Burst, Aura, Lance) in the violet that warms into the tone's element, by stage.
    release(e) {
      // The impact goes through at() (fog-aware): a release at a creature in the fog (a wild one, an Ether Heart Overwatch)
      // draws nothing where the squad can't see. Only a Wave's direction reads the raw aim.
      const from = at(e.at), to = at(e.to), toward = centre(e.to), el = toneEl(e), st = Math.max(0, Math.min(4, e.stage ?? 1)), R = releaseLook(st, el), form = e.form || 'burst';
      const tiles = tilesOf(e), wild = !!e.wild;
      play('soul_release', from || to, { rate: (wild ? 0.85 : 1.05) - 0.05 * st, gain: 0.7 + 0.08 * st });
      if (R.choir) play('soul_choir', from || to, { gain: 0.35 + 0.2 * (st - 3), rate: el.id === 'raw' ? 0.95 : 1 });
      const snd = (s: Sfx, o?: any) => play(s, to || from, { ...o, lowpass: SOFT });
      const col = stageColour(Math.max(2, st), el);
      if (e.air || (wild && e.to === e.at && !tiles.length)) {
        // Into the air: the heart empties upward, harmlessly.
        if (from) { burst('smoke_soft', { x: from.x, y: from.y - from.s * 0.5 }, from.s * 2, 1200, { color: SOUL_INK, from: 0.3, to: 1.4, blend: 'screen' }); rise(from, col, 10, 1100, 1.2); floatText('INTO THE AIR', from, MUTED, { small: true }); }
        return;
      }
      if (!to && !from) return;
      const go = () => {
        if (from) tint(tokOf(e.unit, e.at), col, 500, 1.4);
        const dist = (k: string, o: Pt) => { const q = at(k); return q ? Math.hypot(q.x - o.x, q.y - o.y) / q.s : 0; };
        const hit = (origin: Pt, per: number, base = 0) => tiles.slice(0, 24).forEach((k) => { const q = at(k); if (!q) return; const d = dist(k, origin); cloud(q, el, k === e.to ? R.power : R.power * 0.75, base + Math.round(d * per), k === e.to && base === 0 ? snd : undefined); });
        switch (form) {
          case 'bolt': {
            if (from && to) { beam(from, to, el, 200); for (let i = 0; i < 4 + st; i++) particle(from, Math.max(3, from.s * 0.08), shardCss(el, 'soul', i / 6), [{ transform: 'translate(0,0)', opacity: 0.2 }, { transform: 'translate(' + (to.x - from.x) + 'px,' + (to.y - from.y) + 'px)', opacity: 1 }], 220 + i * 20, i * 18); }
            after(() => { if (to) { cloud(to, el, R.power, 0, snd); bloom(to, to.s * (1.3 + 0.3 * st), 600, { color: col, from: 0.3, to: 1.2, blend: 'screen' }); } }, from ? 210 : 0);
            break;
          }
          case 'lance': {
            // A piercing line: thin white-cored beam out past the last tile, each tile struck in turn.
            const far = tiles.map((k) => ({ k, q: at(k) })).filter((x) => x.q).sort((a, b) => (from ? Math.hypot(a.q!.x - from.x, a.q!.y - from.y) - Math.hypot(b.q!.x - from.x, b.q!.y - from.y) : 0));
            const end = far.length ? far[far.length - 1].q! : to!;
            if (from && end) { beam(from, end, el, 160, { thin: true, color: WHITE }); beam(from, end, el, 220); }
            far.forEach((x, i) => cloud(x.q!, el, R.power * (i === far.length - 1 ? 1 : 0.8), 120 + i * 55, i === 0 ? snd : undefined));
            if (!far.length && to) cloud(to, el, R.power, 160, snd);
            break;
          }
          case 'wave': {
            const reach = from ? Math.max(...tiles.map((k) => { const q = at(k); return q ? Math.hypot(q.x - from.x, q.y - from.y) : 0; }), 0) + from.s * 0.6 : 0;
            if (from && toward) { cone(from, toward, reach, el, 800); cone(from, toward, reach * 0.7, ELEMENTS.raw, 600); }
            if (from) hit(from, 80, 60); else if (to) cloud(to, el, R.power, 0, snd);
            if (from && tiles.length) snd(el.sound.impact, { rate: el.sound.rate * 0.82, gain: 0.8, delay: 140 });
            break;
          }
          case 'aura': {
            // A nova around the holder: rings out, every tile around struck from the centre outward.
            const c = from || to!;
            ring(c, col, 700, { from: 0.4, to: 2.2 + 0.3 * st, width: 6 + st }); ring(c, WHITE, 500, { from: 0.3, to: 1.6 + 0.2 * st, width: 3, delay: 80 });
            bloom(c, c.s * (2.2 + 0.4 * st), 700, { color: col, from: 0.3, to: 1.2, blend: 'screen' });
            hit(c, 70, 40); if (tiles.length) snd(el.sound.impact, { rate: el.sound.rate * 0.82, gain: 0.9, delay: 60 });
            break;
          }
          default: { // burst: the heart flies to the target and blooms there.
            const o = to || tiles.map((k) => at(k)).find(Boolean) || null; if (!o) break;
            const fly = from && to && from !== to ? 360 : 0;
            if (from && to && fly) for (let i = 0; i < 7 + st * 2; i++) { const sz = 6 + Math.random() * 5, wob = (Math.random() - 0.5) * 40; particle(from, sz, 'border-radius:50%;background:' + (i % 2 ? SOUL_INK : col) + ';box-shadow:0 0 10px ' + col + ';filter:blur(.6px)', [{ transform: 'translate(0,0)', opacity: 0.2 }, { transform: 'translate(' + ((to.x - from.x) / 2 + wob) + 'px,' + ((to.y - from.y) / 2 - wob - from.s * 0.4) + 'px)', opacity: 1, offset: 0.5 }, { transform: 'translate(' + (to.x - from.x) + 'px,' + (to.y - from.y) + 'px)', opacity: 0.5 }], fly + Math.random() * 100, i * 20); }
            after(() => {
              const area = Math.max(1, Math.sqrt(tiles.length || 1));
              bloom(o, o.s * (1.2 + 0.35 * st + area * 0.5), 750, { color: col, from: 0.2, to: 1.25, blend: 'screen' });
              burst('flare', o, o.s * (1 + 0.3 * st), 300, { color: WHITE, from: 0.2, to: 1.3, blend: 'screen' });
              burst('smoke_soft', o, o.s * (1 + 0.3 * st + area * 0.4), 1000, { color: SOUL_INK, from: 0.4, to: 1.35, blend: 'screen' });
              ring(o, col, 650, { from: 0.3, to: 1 + area * 0.6 + 0.15 * st, width: 4 + st });
              if (tiles.length) hit(o, 60); else cloud(o, el, R.power, 0, snd);
            }, fly);
          }
        }
        if (R.shake) after(() => shakeScreen(R.shake), 220);
        if (e.school === 'buff' || e.school === 'heal' || e.school === 'shield') after(() => { for (const k of tiles.slice(0, 8)) { const q = at(k); if (q) bloom(q, q.s, 600, { color: e.school === 'shield' ? MP : '#6FEA77', from: 0.4, to: 1.1, blend: 'screen' }); } }, 300);
        if (e.resonance && from) floatText('RESONANCE +' + e.resonance, from, SOUL_WARM, { small: true, delay: 200 });
      };
      if (wild) { if (from) { floatText('WILD', from, SOUL_WARM, { small: true }); shake(tokOf(e.unit, e.at), 1.2); } after(go, 220); }
      else if (e.reaction) after(go, 60);
      else go();
    },
    // Heart Overwatch: a sharp gasp; the eye snaps open; the heart lets go out of turn.
    heart_overwatch(e) {
      const p = at(e.at), q = at(e.to), el = toneEl(e); // the mover's tile only where the squad sees it
      play('soul_gasp', p || q, { gain: 1 });
      if (!p) return;
      flash(tokOf(e.unit, e.at), 'white');
      closeRing(p, WHITE, 300, 2, 1, false, 5); ring(p, stageColour(e.stage || 1, el), 420, { from: 1, to: 1.8, width: 3, delay: 120 });
      if (q) jag(p, q, { ...ELEMENTS.raw, ink: SOUL_INK, core: WHITE }, 'soul', 220, 60);
      floatText('HEART OVERWATCH', p, WHITE, { small: true });
    },
    // Resonance: two hearts beat in sync, a ring linking the casters.
    resonance(e) {
      const p = at(e.at); if (!p) return;
      const others = (e.with || []).map((id: string) => at(K.posOf(id))).filter(Boolean) as Pt[];
      play('heartbeat', p, { rate: 0.95, gain: 0.8 }); play('soul_choir', p, { gain: 0.3, rate: 1.1, delay: 100 });
      for (const q of [p, ...others]) { ring(q, SOUL_WARM, 700, { from: 0.4, to: 1.3, width: 4 }); ring(q, SOUL_WARM, 600, { from: 0.4, to: 1.1, width: 3, delay: 300 }); glow(q, SOUL_WARM, 1.3, 700); }
      for (const q of others) { link(p, q, SOUL_WARM, 1000); play('heartbeat', q, { rate: 0.95, gain: 0.5 }); }
      floatText('IN SYNC +' + (e.bonus || 0), p, SOUL_WARM, { small: true, delay: 250 });
    },
    // Feed: the glyph's cyan squares rise off the floor and are drawn into the violet heart.
    feed(e) {
      const p = at(e.at); play('sigil_draw', p, { rate: 0.8, gain: 0.7 }); play('soul_thump', p, { rate: 0.95, gain: 0.8, delay: 520 });
      if (!p) return;
      const d = GLYPH_PATHS[e.word] || 'M6 6 H18 V18 H6 Z';
      const g = svg(24, 24, '<path d="' + d + '" fill="none" stroke="' + SIGIL_INK + '" stroke-width="2.2" stroke-linecap="square" stroke-linejoin="miter"/>');
      const box = put(g, { x: p.x, y: p.y + p.s * 0.22 }, p.s * 0.7, p.s * 0.7, 700);
      anim(box, [{ transform: 'scale(1)', opacity: 1, filter: 'none' }, { transform: 'translateY(-' + p.s * 0.16 + 'px) scale(.3)', opacity: 0, filter: 'hue-rotate(80deg)' }], { duration: 700, easing: 'ease-in', fill: 'forwards' });
      for (let i = 0; i < 12; i++) {
        const a = (i / 12) * Math.PI * 2, r = p.s * 0.45, sx = p.x + Math.cos(a) * r, sy = p.y + p.s * 0.3 + Math.sin(a) * r * 0.35;
        particle({ x: sx, y: sy }, Math.max(4, p.s * 0.1), 'background:' + SIGIL_INK + ';box-shadow:0 0 0 1px #4FC8DF', [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1, background: SIGIL_INK, borderRadius: '1px' }, { transform: 'translate(' + (p.x - sx) * 0.5 + 'px,' + (p.y - sy - p.s * 0.3) + 'px) rotate(90deg)', opacity: 1, offset: 0.5 }, { transform: 'translate(' + (p.x - sx) + 'px,' + (p.y + p.s * 0.06 - sy) + 'px) rotate(180deg) scale(.5)', opacity: 0.4, background: SOUL_INK, borderRadius: '50%' }], 560, i * 25, 'ease-in');
      }
      after(() => { glow(p, SOUL_INK, 1.4, 500); ring(p, SOUL_INK, 500, { from: 0.4, to: 1.2, width: 4 }); throb(tokOf(e.unit, e.at), 1.08, 360); }, 520);
      floatText('FED · STAGE ' + (e.stage || 1), p, SOUL_INK, { small: true, delay: 520 });
    },
    // Calming: the glow cools. Turn-start calm is silent (it happens every turn); the others breathe out.
    calm(e) {
      const p = at(e.at); if (!p) return;
      closeRing(p, COOL, e.way === 'turn' ? 700 : 1000, 1.25, 0.7, false, 3);
      if (e.way === 'turn') return;
      if (e.way !== 'letgo' && e.way !== 'steady') { play('soul_breath_out', p, { gain: 0.75 }); tint(tokOf(e.unit, e.at), COOL, 900, 0.8); }
      floatText('STRAIN −' + (e.by || 1), p, COOL, { small: true, delay: 300 });
    },
    // Let go: a harmless violet sigh; the held Outburst dissipates upward.
    letgo(e) {
      const p = at(e.at); play('soul_sigh', p, { gain: 0.9 });
      if (!p) return;
      for (let i = 0; i < 4; i++) { const q = { x: p.x + (i - 1.5) * p.s * 0.22, y: p.y }, d = document.createElement('div'); d.style.cssText = 'width:100%;height:100%;border-radius:50%;filter:blur(3px);background:radial-gradient(circle,' + SOUL_INK + 'CC 0,' + SOUL_INK + '55 45%,' + SOUL_INK + '00 70%)'; const box = put(d, q, p.s * 0.9, p.s * 0.9, 1500); box.style.mixBlendMode = 'screen'; anim(box, reducedMotion() ? [{ opacity: 0.8 }, { opacity: 0 }] : [{ transform: 'translateY(0) scale(.5)', opacity: 0 }, { opacity: 0.9, offset: 0.2 }, { transform: 'translateY(-' + p.s * (0.9 + i * 0.15) + 'px) scale(1.4)', opacity: 0 }], { duration: 1300 + i * 100, delay: i * 90, easing: 'ease-out', fill: 'both' }); }
      for (let i = 0; i < 3; i++) burst('smoke_soft', { x: p.x + (i - 1) * p.s * 0.25, y: p.y - p.s * 0.2 }, p.s * (1 + i * 0.2), 1400, { color: SOUL_INK, from: 0.4, to: 1.5, fade: 0, blend: 'screen', delay: i * 140 });
      rise(p, SOUL_INK, 8, 1300, 1); ring(p, SOUL_INK, 1100, { from: 0.9, to: 1.6, width: 2 });
      floatText('LET GO', p, SOUL_INK, { small: true });
    },
    // Steady: a long breath out; a ring closes and holds; the glow cools.
    steady(e) {
      const p = at(e.at); play('soul_breath_out', p, { gain: 0.9, rate: 0.92 });
      if (!p) return;
      closeRing(p, COOL, 1100, 1.5, 0.95, true, 4); tint(tokOf(e.unit, e.at), COOL, 1000, 1);
      floatText('STEADY', p, COOL, { small: true });
    },
    // Strain: near the limit the heartbeat tightens (quick, high); far from it, only the number.
    strain(e) {
      const p = at(e.at), lim = e.limit || 0, s = e.strain || 0, over = e.over || 0, near = !!lim && s >= lim - 1;
      if (!p) return;
      if (near) {
        play('soul_thump', p, { rate: 1.25 + 0.08 * over, gain: 0.7 }); play('soul_thump', p, { rate: 1.35 + 0.08 * over, gain: 0.5, delay: 130 });
        closeRing(p, mix(SOUL_INK, HP, over ? 0.85 : 0.5), 420, 1.35, 0.55, false, 4); throb(tokOf(e.unit, e.at), 1.05, 260);
        if (over) edgePulse(HP, 500, 0.6);
      }
      floatText('STRAIN ' + s + '/' + lim, p, over ? HP : near ? WHITE : MUTED, { small: true, delay: near ? 380 : 0 });
    },
    // Strain burns: a red crack across the heart, a red flash.
    burn(e) {
      const p = at(e.at); play('soul_crack', p, { gain: 0.8, rate: 1.05 });
      if (!p) return;
      cracks(p, HP, 900); flash(tokOf(e.unit, e.at), 'hurt'); screenTint('red', 380);
    },
    // The Mana Short: the heartbeat stops, the screen goes grey and quiet, then a crack.
    short(e) {
      const p = at(e.at);
      play('soul_thump', p, { rate: 0.75, gain: 0.9 });
      after(() => duckSfx(0.05, 560, 140), 300);
      screenTint('grey', 1600);
      if (p) { flash(tokOf(e.unit, e.at), 'white'); anim(tokOf(e.unit, e.at) || document.createElement('i'), [{ filter: 'none' }, { filter: 'grayscale(1) brightness(.7)', offset: 0.2 }, { filter: 'grayscale(1) brightness(.7)', offset: 0.8 }, { filter: 'none' }], { duration: 1400 }); }
      after(() => {
        play('soul_crack', p, { rate: 0.8, gain: 1 });
        if (p) { cracks(p, HP, 1100); shake(tokOf(e.unit, e.at), 1.4); floatText(e.burst ? 'HEART BURSTS' : 'MANA SHORT', p, HP, { small: !e.burst, big: !!e.burst }); if (e.burst) burst('spark_burst', p, p.s * 1.3, 500, { color: HP }); }
        edgePulse(HP, 600, 0.8);
      }, 1050);
    },
    // Storm Hand: an infused melee hit carries the element (violet first, like every Soul element).
    infusion(e) {
      const p = at(e.at), el = toneEl(e); if (!p) return;
      cloud(p, el, 0.55, 0, (s, o) => play(s, p, { ...o, gain: 0.7, lowpass: SOFT }));
      tint(tokOf(e.target, e.at), mix(SOUL_INK, el.ink, 0.8), 400, 1.2);
    },
    // A Charge gained: pips over the gauntlet's owner, the newest snapping in.
    charge(e) {
      const p = at(e.at), n = Math.max(1, Math.min(3, e.charges || 1));
      play('el_zap', p, { rate: 1 + 0.15 * n, gain: 0.45, lowpass: 4000 });
      if (!p) return;
      const row = document.createElement('div'); row.style.cssText = 'width:100%;height:100%;display:flex;gap:12%;justify-content:center;align-items:center';
      for (let i = 1; i <= 3; i++) { const d = document.createElement('i'); d.style.cssText = 'display:block;width:22%;aspect-ratio:1;transform:rotate(45deg);' + (i <= n ? 'background:' + SOUL_INK + ';box-shadow:0 0 0 1px #FFFFFF,0 0 8px ' + SOUL_INK : 'background:rgba(10,13,19,.75);box-shadow:inset 0 0 0 1px ' + SOUL_INK); if (i === n && !reducedMotion()) anim(d, [{ transform: 'rotate(45deg) scale(2)', opacity: 0 }, { transform: 'rotate(45deg) scale(1)', opacity: 1, offset: 0.3 }, { transform: 'rotate(45deg) scale(1)', opacity: 1 }], { duration: 900, fill: 'forwards' }); row.appendChild(d); }
      const box = put(row, { x: p.x, y: p.y - p.s * 0.72 }, p.s * 0.8, p.s * 0.25, 1300); box.style.zIndex = '3';
      anim(box, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 1300, fill: 'forwards' });
      floatText('CHARGE ' + n + '/3', p, SOUL_INK, { small: true, delay: 150 });
    },
  };
}
/** Storm Hand's Discharge (an 'explode' with what 'discharge'): the stored Charges burst around the target in the
 *  infused element, harder per Charge, the screen shaking by the element's weight. */
export function discharge(K: SoulKit, e: FxEvent) {
  const p = K.at(e.at); if (!p) return;
  const el = toneEl(e), n = Math.max(1, Math.min(3, e.charges || 1)), col = stageColour(1 + n, el);
  K.play('soul_release', p, { rate: 1.15, gain: 0.8 }); K.play(el.sound.impact, p, { rate: el.sound.rate * 0.85, gain: 1, lowpass: 3200 }); if (el.sound.extra) K.play(el.sound.extra, p, { delay: 150, gain: 0.6 });
  if (n >= 3) K.play('explosion_boom', p, { rate: 1.4, gain: 0.45 });
  ring(p, col, 600, { from: 0.4, to: 1.8 + 0.25 * n, width: 5 + n }); ring(p, WHITE, 420, { from: 0.3, to: 1.4, width: 3, delay: 60 });
  bloom(p, p.s * (1.8 + 0.4 * n), 600, { color: col, from: 0.3, to: 1.2, blend: 'screen' });
  cloud(p, el, 0.8 + 0.2 * n);
  const [x, y] = String(e.at).split(',').map(Number);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) { if (!dx && !dy) continue; const q = K.at(x + dx + ',' + (y + dy)); if (q) cloud(q, el, 0.4 + 0.15 * n, 60 + (Math.abs(dx) + Math.abs(dy)) * 40); }
  if (e.shake !== false) shakeScreen((0.25 + 0.22 * n) * (0.6 + el.shake));
  floatText('DISCHARGE ×' + n, p, col, { small: true, delay: 100 });
}
/** How long each Soul event holds the stage before the next starts (ms); undefined: not a Soul event. */
export function soulBeat(e: FxEvent): number | undefined {
  switch (e.k) {
    case 'outburst': return e.hold === false ? 300 : 760;
    case 'pump': return e.stage >= 4 ? 720 : 560;
    case 'swell': return 760;
    case 'hold': return e.watch ? 320 : 40;
    case 'aura_tick': return 420;
    case 'release': return (e.air ? 500 : ({ bolt: 640, lance: 700, wave: 820, aura: 780 } as Record<string, number>)[e.form] ?? 860) + 40 * Math.min(4, e.stage || 0) + (e.wild ? 220 : 0);
    case 'heart_overwatch': return 420;
    case 'resonance': return 520;
    case 'feed': return 760;
    case 'calm': return e.way === 'turn' ? 60 : e.way === 'letgo' || e.way === 'steady' ? 120 : 600;
    case 'letgo': return 760;
    case 'steady': return 700;
    case 'strain': return e.limit && e.strain >= e.limit - 1 ? 420 : 80;
    case 'burn': return 460;
    case 'short': return 1400;
    case 'infusion': return 200;
    case 'charge': return 220;
    default: return undefined;
  }
}
