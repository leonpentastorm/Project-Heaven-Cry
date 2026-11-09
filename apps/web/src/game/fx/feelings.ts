// Outburst 4.0 (rules 1.8): how feelings look and sound. A feeling pump adds its colour and particle motif over the
// heartbeat (embers, rain, petals, shards, smoke, ash, light, ripples, rays, frost, sparks, thorns, breath) and a short
// layer in its family's sound; the HEART panel's multiplier counter shakes, harder at higher stages, with a tick that
// pitches up. Residue lays its tint with a soft sting; Revert is a rewind; "You have felt X" is a card and a sting; a
// Fuse, a Linger field and a Thread are marked. Particles that need a texture use the CC0 sprites in public/fx (credits
// in fxCredits.ts); rings, lines, strokes and tints are drawn in code. Reduced motion is respected throughout (dom.ts).
import type { FxEvent } from '@engine';
import { type Sfx, reducedMotion } from '../sfx';
import { type Pt, after, anim, burst, floatText, particle, ring } from './dom';
import { FEELING_INK, FEELING_MOTIF, feelingIconSrc, feelingName, feltCardText } from '../feelingsView';

export interface FeelKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
}
const ink = (id?: string) => FEELING_INK[id || ''] || '#AE9BFF';
/** A family's sounds (fx sounds sourced for rules 1.8; ids in sfx.ts). */
const pumpSfx = (fam?: string) => ('feel_pump_' + (fam || 'warm')) as Sfx;
const residueSfx = (fam?: string) => ('feel_residue_' + (fam || 'warm')) as Sfx;

/** The motif's particles at a point: a sprite where the motif needs texture, code-drawn marks where SVG/CSS reads. */
export function motif(p: Pt, feeling: string, n = 8, ms = 900) {
  const col = ink(feeling), m = FEELING_MOTIF[feeling] || 'light', s = p.s;
  if (reducedMotion()) { ring(p, col, 500, { from: 0.6, to: 1.1, width: 3 }); return; }
  const rnd = (a: number) => (Math.random() - 0.5) * a;
  switch (m) {
    case 'embers': case 'sparks':
      for (let i = 0; i < n; i++) burst(m === 'embers' ? 'flame' : 'spark_burst', { x: p.x + rnd(s), y: p.y + rnd(s * 0.6) }, s * (0.25 + Math.random() * 0.2), ms, { color: col, from: 0.6, to: 1.1, delay: i * 40 });
      return;
    case 'smoke': case 'ash':
      for (let i = 0; i < Math.ceil(n / 2); i++) burst(m === 'smoke' ? 'smoke_soft' : 'dust', { x: p.x + rnd(s * 0.8), y: p.y + rnd(s * 0.4) }, s * 0.7, ms * 1.3, { color: col, from: 0.5, to: 1.4, fade: 0, delay: i * 70 });
      return;
    case 'light': case 'rays':
      burst(m === 'rays' ? 'flare' : 'magic_star', p, s * 1.4, ms, { color: col, from: 0.3, to: 1.2, blend: 'screen' });
      for (let i = 0; i < n; i++) particle({ x: p.x + rnd(s), y: p.y + rnd(s) }, 5, 'border-radius:50%;background:' + col + ';box-shadow:0 0 8px ' + col, [{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(' + (-s * 0.6) + 'px) scale(.3)', opacity: 0 }], ms, i * 35);
      return;
    case 'rain': case 'frost':
      for (let i = 0; i < n; i++) particle({ x: p.x + rnd(s * 1.2), y: p.y - s * 0.5 }, m === 'rain' ? 3 : 5, (m === 'rain' ? 'width:2px;height:10px;border-radius:2px;' : 'border-radius:1px;transform:rotate(45deg);') + 'background:' + col, [{ transform: 'translateY(0)', opacity: 0.9 }, { transform: 'translateY(' + s + 'px)', opacity: 0 }], ms, i * 50, 'ease-in');
      return;
    case 'petals':
      for (let i = 0; i < n; i++) particle({ x: p.x + rnd(s), y: p.y + rnd(s * 0.4) }, 9, 'border-radius:70% 0 70% 0;background:' + col, [{ transform: 'rotate(0deg) translate(0,0)', opacity: 1 }, { transform: 'rotate(' + (120 + Math.random() * 180) + 'deg) translate(' + rnd(s) + 'px,' + (s * 0.5) + 'px)', opacity: 0 }], ms * 1.2, i * 45);
      return;
    case 'shards': case 'thorns':
      for (let i = 0; i < n; i++) { const a = (i / n) * 360; particle(p, 10, 'clip-path:polygon(50% 0,60% 100%,40% 100%);background:' + col, [{ transform: 'rotate(' + a + 'deg) translateY(0)', opacity: 1 }, { transform: 'rotate(' + a + 'deg) translateY(' + (-s * 0.8) + 'px)', opacity: 0 }], ms * 0.7, i * 15); }
      return;
    case 'ripples': case 'breath':
      ring(p, col, ms, { from: 0.3, to: 1.4, width: 2 }); ring(p, col, ms, { from: 0.3, to: 1.1, width: 2, delay: 220 }); ring(p, col, ms, { from: 0.3, to: 0.8, width: 2, delay: 440 });
      return;
    default:
      ring(p, col, ms, { from: 0.4, to: 1.2, width: 3 });
  }
}
/** The HEART panel's multiplier counter: a shake that grows with the stage, the colour of the feeling, a tick. */
export function shakeCounter(stage: number, col?: string) {
  if (typeof document === 'undefined') return;
  for (const el of Array.from(document.querySelectorAll('[data-heart-mult]')) as HTMLElement[]) {
    const a = 1.5 + 1.2 * Math.max(0, Math.min(4, stage));
    if (col) { el.style.transition = 'text-shadow .2s'; el.style.textShadow = '0 0 14px ' + col; after(() => { el.style.textShadow = ''; }, 600); }
    if (reducedMotion()) continue;
    anim(el, [{ transform: 'translate(0,0) scale(1)' }, { transform: 'translate(' + a + 'px,' + (-a / 2) + 'px) scale(1.18)' }, { transform: 'translate(' + (-a) + 'px,' + (a / 2) + 'px) scale(1.1)' }, { transform: 'translate(' + (a / 2) + 'px,0) scale(1.05)' }, { transform: 'translate(0,0) scale(1)' }], { duration: 260 + 40 * stage, easing: 'ease-out' });
  }
}
/** The unlock card: "You have felt X. You can pour it in now." with the feeling's glyph, in its colour. */
export function feltCard(feeling: string) {
  if (typeof document === 'undefined') return;
  const col = ink(feeling), d = document.createElement('div');
  d.setAttribute('role', 'status'); d.setAttribute('data-felt-card', feeling);
  d.style.cssText = 'position:fixed;left:50%;top:18%;transform:translateX(-50%);z-index:60;display:flex;align-items:center;gap:12px;padding:12px 18px;border-radius:14px;background:#120E1E;border:1px solid ' + col + ';box-shadow:0 0 24px ' + col + '55;color:#E7EBF3;font-family:"Chakra Petch",sans-serif;pointer-events:none';
  d.innerHTML = '<img alt="" src="' + feelingIconSrc(feeling, col, 40) + '" style="width:40px;height:40px"><div style="display:flex;flex-direction:column;gap:2px"><span style="font-size:10px;font-weight:700;letter-spacing:.18em;color:' + col + '">A NEW FEELING · ' + feelingName(feeling).toUpperCase() + '</span><span style="font-family:Spectral,serif;font-size:17px;line-height:1.3">' + feltCardText(feeling) + '</span></div>';
  document.body.appendChild(d);
  anim(d, reducedMotion() ? [{ opacity: 0 }, { opacity: 1 }] : [{ opacity: 0, transform: 'translateX(-50%) translateY(-10px) scale(.96)' }, { opacity: 1, transform: 'translateX(-50%) translateY(0) scale(1)' }], { duration: 320, easing: 'ease-out', fill: 'both' });
  setTimeout(() => { anim(d, [{ opacity: 1 }, { opacity: 0 }], { duration: 400, fill: 'both' }); setTimeout(() => d.remove(), 420); }, 3200);
}

export function feelingHandlers(K: FeelKit): Record<string, (e: FxEvent) => void> {
  const { at, play } = K;
  return {
    felt(e) {
      const p = at(K.posOf(e.unit) || null);
      play('feel_unlock' as Sfx, p, { gain: 0.9 });
      if (p) { motif(p, e.feeling, 10, 1100); ring(p, ink(e.feeling), 900, { from: 0.4, to: 1.6, width: 3 }); }
      feltCard(e.feeling);
    },
    residue(e) {
      const tiles: string[] = (e.tiles || []).slice(0, 12), col = ink(e.feeling);
      play(residueSfx(e.family), at(tiles[0]), { gain: 0.6 });
      tiles.forEach((k, i) => { const q = at(k); if (q) { ring(q, col, 700, { from: 0.2, to: 0.9, width: 2, delay: i * 30 }); if (i % 2 === 0) motif(q, e.feeling, 3, 700); } });
    },
    residue_tick(e) {
      const q = at(e.at); play(residueSfx(e.kind === 'harms' ? 'low' : 'warm'), q, { gain: 0.35, rate: 1.1 });
      if (q) { motif(q, e.feeling, 4, 700); floatText(feelingName(e.feeling).toUpperCase(), q, ink(e.feeling), { small: true }); }
    },
    revert(e) {
      const p = at(e.at); play('feel_revert' as Sfx, p, { gain: 0.7 });
      if (p) { ring(p, e.feeling ? ink(e.feeling) : '#AE9BFF', 520, { from: 1.2, to: 0.3, width: 3 }); floatText('↶ STAGE ' + (e.stage ?? 0), p, '#C9D3E3', { small: true }); }
      shakeCounter(0);
    },
    practice(e) { const p = at(K.posOf(e.unit) || null); if (p) floatText('+' + e.gain + ' PRACTICE', p, '#C9D3E3', { small: true, delay: 500 }); },
    fuse(e) { const q = at(e.to); play('soul_hold' as Sfx, q, { rate: 1.3, gain: 0.5 }); if (q) { ring(q, '#AE9BFF', 900, { from: 1.4, to: 0.5, width: 3 }); floatText('FUSED', q, '#AE9BFF', { small: true }); } },
    linger(e) { for (const k of (e.tiles || []).slice(0, 9)) { const q = at(k); if (q) ring(q, '#AE9BFF', 800, { from: 0.3, to: 0.9, width: 2 }); } },
    thread(e) { for (const id of [e.a, e.b]) { const q = at(K.posOf(id)); if (q) { ring(q, FEELING_INK.love, 700, { from: 0.4, to: 1, width: 2 }); floatText('THREADED', q, FEELING_INK.love, { small: true }); } } },
  };
}
/** The feeling layer on a pump (soul.ts calls it after the heartbeat): the colour, the motif, the family's sound layer
 *  pitched up with the stage, the counter's shake and its tick. */
export function feelingPump(K: FeelKit, e: FxEvent, p: Pt | null) {
  const st = Math.max(1, Math.min(4, e.stage || 1)), col = e.feeling ? ink(e.feeling) : undefined;
  if (e.feeling) {
    K.play(pumpSfx(e.family), p, { rate: 1 + 0.12 * (st - 1), gain: 0.75, delay: 60 });
    if (p) { motif(p, e.feeling, 6 + st * 2, 820 + st * 60); floatText((feelingName(e.feeling) || '').toUpperCase() + (e.does ? ' · ' + e.does : ''), p, col!, { small: true, delay: 320 }); }
  }
  K.play('feel_tick' as Sfx, null, { rate: 1 + 0.15 * st, gain: 0.5, delay: 90 });
  after(() => shakeCounter(st, col), 60);
}
/** How long each rules 1.8 event holds the stage (ms); undefined: not one of them. */
export function feelingBeat(e: FxEvent): number | undefined {
  switch (e.k) {
    case 'felt': return 900;
    case 'residue': return 360;
    case 'residue_tick': return 300;
    case 'revert': return 300;
    case 'practice': return 0;
    case 'fuse': return 520;
    case 'linger': return 260;
    case 'thread': return 300;
    default: return undefined;
  }
}
