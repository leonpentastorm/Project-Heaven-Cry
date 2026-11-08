// The Grand Sigilist's Grand forms on the ground (spec: Rules revision 1.4, Grand forms). A Grand form is radius 2 round
// the planted staff for a few rounds, so it must read at a glance from across the map: every tile inside gets its
// word's ground look, the edge glows, and the staff tile carries a planted staff. Element words reuse the Sigil 1.4 field
// looks (fx/elements.ts: lava, ice, static, dust, swirl, twinkle, bubbles); the other words get one of four looks built
// from the CC0 Kenney sprites in public/fx (credited in fxCredits.ts) and CSS:
//   mist   (VEIL, MASK, BLIND): soft smoke drifting across the tile
//   ripple (MEND, CLEANSE, SLOW, BIND): a ring spreading out from the middle
//   grid   (COMMAND, NULL, WARD, KIN, RAISE, STAY, SILENCE, SHARPEN): the Sigil square grid, pulsing in steps
//   pulse  (everything else): a glow breathing, with a star now and then
// Each word has its own tint, so two forms never look alike. Reduce motion: still looks, no loops.
import { reducedMotion } from '../sfx';
import { anim, sprite } from './dom';
import { fieldNode } from './elements';

export type GrandLook = 'lava' | 'ice' | 'static' | 'dust' | 'swirl' | 'twinkle' | 'bubbles' | 'mist' | 'ripple' | 'grid' | 'pulse';
/** Each word's look, the element whose field look it borrows (element looks only), and its tint. */
export const GRAND_LOOK: Record<string, { look: GrandLook; element?: string; tint: string }> = {
  fire: { look: 'lava', element: 'fire', tint: '#FF9A4A' }, freeze: { look: 'ice', element: 'freeze', tint: '#BDF3FF' },
  shock: { look: 'static', element: 'shock', tint: '#CFE3FF' }, chain: { look: 'static', element: 'shock', tint: '#9FC4FF' },
  stone: { look: 'dust', element: 'stone', tint: '#C9B79C' }, acid: { look: 'bubbles', element: 'acid', tint: '#B6E35A' },
  gale: { look: 'swirl', element: 'gale', tint: '#DDF6FF' }, quicken: { look: 'swirl', element: 'gale', tint: '#FFF4C4' },
  spark: { look: 'twinkle', element: 'spark', tint: '#FFF4C4' }, step: { look: 'twinkle', element: 'spark', tint: '#AE9BFF' },
  veil: { look: 'mist', tint: '#A3AEC2' }, mask: { look: 'mist', tint: '#D7C6FF' }, blind: { look: 'mist', tint: '#7F8BA1' },
  mend: { look: 'ripple', tint: '#6FEA77' }, cleanse: { look: 'ripple', tint: '#8BDEEE' }, slow: { look: 'ripple', tint: '#5394AC' }, bind: { look: 'ripple', tint: '#8C6F3A' },
  command: { look: 'grid', tint: '#F2A54A' }, null: { look: 'grid', tint: '#FFFFFF' }, ward: { look: 'grid', tint: '#5C9EFF' }, kin: { look: 'grid', tint: '#E7EBF3' },
  raise: { look: 'grid', tint: '#C9D3E3' }, stay: { look: 'grid', tint: '#4FC8DF' }, silence: { look: 'grid', tint: '#3B475D' }, sharpen: { look: 'grid', tint: '#E3BF51' },
  sense: { look: 'pulse', tint: '#40BAA0' }, light: { look: 'pulse', tint: '#FFF8E1' }, dread: { look: 'pulse', tint: '#9D7ADC' }, leech: { look: 'pulse', tint: '#B0303A' },
  watch: { look: 'pulse', tint: '#4FC8DF' }, muddle: { look: 'pulse', tint: '#EB95B7' }, seek: { look: 'pulse', tint: '#F65157' }, arc: { look: 'pulse', tint: '#F68A38' },
  relay: { look: 'pulse', tint: '#8BDEEE' }, wait: { look: 'pulse', tint: '#D36A90' }, pull: { look: 'pulse', tint: '#5C9EFF' }, condense: { look: 'pulse', tint: '#AE9BFF' },
  push: { look: 'pulse', tint: '#DDF6FF' }, spread: { look: 'pulse', tint: '#B6E35A' }, twice: { look: 'pulse', tint: '#4FC8DF' },
};
export const grandLook = (word: string | null | undefined) => GRAND_LOOK[String(word || '')] || { look: 'pulse' as GrandLook, tint: '#4FC8DF' };
/** The tile's flat tint (the combat grid draws it under everything; the moving look goes on top). */
export const grandTint = (word: string, alpha = 0.16) => { const h = grandLook(word).tint.replace('#', ''); const n = parseInt(h, 16); return 'rgba(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + alpha + ')'; };

/** One tile of a Grand form: its word's look; the edge ring brighter; the staff tile a planted staff. Deterministic
 *  per tile (seed) so the tiles don't all pulse in time. */
export function grandNode(word: string, where: 'inner' | 'edge' | 'staff', seed = 0): HTMLElement {
  const L = grandLook(word), still = reducedMotion();
  const d = document.createElement('div');
  d.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;border-radius:2px';
  d.dataset.grand = word; d.dataset.look = L.look; d.dataset.where = where;
  const loop = (n: Element, f: Keyframe[], ms: number, o: KeyframeAnimationOptions = {}) => { if (!still) anim(n, f, { duration: ms, iterations: Infinity, delay: -((seed * 397) % ms), ...o }); };
  const layer = (css: string) => { const c = document.createElement('div'); c.style.cssText = 'position:absolute;inset:0;' + css; d.appendChild(c); return c; };
  const spr = (name: string, css: string, color = L.tint) => { const s = sprite(name, color); s.style.position = 'absolute'; s.style.cssText += ';' + css; d.appendChild(s); return s; };
  // The ground itself.
  if (L.element) { const f = fieldNode(L.element, 'sigil'); f.style.position = 'absolute'; f.style.inset = '0'; d.appendChild(f); }
  else switch (L.look) {
    case 'mist': {
      layer('background: radial-gradient(circle at 50% 50%, ' + grandTint(word, 0.28) + ', transparent 75%)');
      const m = spr('smoke_soft', 'left:-30%;top:-10%;width:160%;height:120%;opacity:.45');
      loop(m, [{ transform: 'translateX(-12%)', opacity: 0.25 }, { transform: 'translateX(12%)', opacity: 0.5 }, { transform: 'translateX(-12%)', opacity: 0.25 }], 5200, { easing: 'ease-in-out' });
      break;
    }
    case 'ripple': {
      layer('background: radial-gradient(circle, ' + grandTint(word, 0.22) + ', transparent 70%)');
      const r = spr('ring', 'left:15%;top:15%;width:70%;height:70%;opacity:.0');
      loop(r, [{ transform: 'scale(.3)', opacity: 0.8 }, { transform: 'scale(1.2)', opacity: 0 }], 2200, { easing: 'ease-out' });
      break;
    }
    case 'grid': {
      const g = layer('background-image: linear-gradient(' + grandTint(word, 0.45) + ' 1px, transparent 1px), linear-gradient(90deg, ' + grandTint(word, 0.45) + ' 1px, transparent 1px); background-size: 33.3% 33.3%; background-position: center; opacity: .7');
      loop(g, [{ opacity: 0.45 }, { opacity: 0.85 }, { opacity: 0.45 }], 1800, { easing: 'steps(3, end)' });
      break;
    }
    default: {
      const g = spr('glow', 'left:10%;top:10%;width:80%;height:80%;opacity:.5');
      loop(g, [{ opacity: 0.25, transform: 'scale(.85)' }, { opacity: 0.6, transform: 'scale(1.05)' }, { opacity: 0.25, transform: 'scale(.85)' }], 2400, { easing: 'ease-in-out' });
      if (seed % 3 === 0) { const st = spr('magic_star', 'left:55%;top:20%;width:24%;height:24%;opacity:0'); loop(st, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 0.9, transform: 'scale(1)', offset: 0.15 }, { opacity: 0, transform: 'scale(.6)', offset: 0.35 }, { opacity: 0 }], 3600); }
    }
  }
  // The edge ring: a brighter inner border, so the form's extent reads even under the grid's dim.
  if (where === 'edge') layer('box-shadow: inset 0 0 0 2px ' + L.tint + ', inset 0 0 10px ' + grandTint(word, 0.6));
  // The staff: a planted rod with a turning sigil ring round its foot.
  if (where === 'staff') {
    layer('box-shadow: inset 0 0 0 2px ' + L.tint + '; background: radial-gradient(circle at 50% 70%, ' + grandTint(word, 0.5) + ', transparent 70%)');
    const ring = spr('ring', 'left:8%;top:30%;width:84%;height:62%;opacity:.8');
    loop(ring, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], 6000, { easing: 'steps(12, end)' });
    layer('left:46%;right:46%;top:8%;bottom:22%;border-radius:2px;background:linear-gradient(#FFFFFF, ' + L.tint + ');box-shadow:0 0 8px ' + L.tint);
    const tip = spr('flare', 'left:30%;top:-4%;width:40%;height:32%;opacity:.9', '#FFFFFF');
    loop(tip, [{ opacity: 0.5, transform: 'scale(.8)' }, { opacity: 1, transform: 'scale(1.1)' }, { opacity: 0.5, transform: 'scale(.8)' }], 1400);
  }
  return d;
}
