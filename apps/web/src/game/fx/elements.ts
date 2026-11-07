// The element effect system (rules 1.4, data/sigils.json "elements"): one look, trail, field, decal and sound set per
// element, drawn in a family style. The Sigil family is Mind cyan: cyan-edged square particles that snap (stepped
// timing, 90° turns). The Soul family (Outbursts, when they take elements) is violet: soft round smoke that swells and
// warms from violet into the element's colour. Both use the same element ids, so a FIRE Sigil and a fire Outburst read
// as the same fire in two hands. Nothing here reads or changes game state; the colours are for effects only (the word
// always rides with them on the grid and in the log).
import { type Sfx, reducedMotion } from '../sfx';
import { SIGIL_INK, SIGIL_GLOW, SOUL_INK } from '../glyphs';
import { type Pt, after, anchor, anim, burst, centre, particle, put, sprite, svg } from './dom';

export type ElementId = 'fire' | 'freeze' | 'shock' | 'stone' | 'gale' | 'spark' | 'acid' | 'raw';
export type Family = 'sigil' | 'soul';
export const ELEMENT_IDS: ElementId[] = ['fire', 'freeze', 'shock', 'stone', 'gale', 'spark', 'acid', 'raw'];
/** Other names an element goes by (a later Outburst school, an item's damage type): they all land on one id. */
const ALIAS: Record<string, ElementId> = {
  ice: 'freeze', frost: 'freeze', cold: 'freeze', lightning: 'shock', electric: 'shock', thunder: 'shock', storm: 'shock',
  earth: 'stone', rock: 'stone', wind: 'gale', air: 'gale', corrosive: 'acid', corrode: 'acid', corroded: 'acid', burn: 'fire', burning: 'fire', flame: 'fire',
};
/** The element id for any word or tag; anything that isn't one (no element, a boon, STEP) is raw magic. */
export function elementId(x: string | null | undefined): ElementId {
  const k = String(x || '').toLowerCase();
  if ((ELEMENT_IDS as string[]).includes(k)) return k as ElementId;
  return ALIAS[k] || 'raw';
}

/** How a particle of the element is shaped. */
export type Shard = 'ember' | 'shard' | 'arc' | 'chip' | 'streak' | 'spark' | 'drop' | 'square';
/** How the impact moves (data/sigils.json elements[].motion; raw magic snaps). */
export type Motion = 'flare' | 'crystallise' | 'arc' | 'erupt' | 'sweep' | 'pop' | 'splash' | 'snap';
export type Trail = 'embers' | 'frost' | 'jag' | 'grit' | 'streak' | 'spark' | 'drip' | 'squares';
export type FieldLook = 'lava' | 'ice' | 'static' | 'dust' | 'swirl' | 'twinkle' | 'bubbles' | 'grid';
export interface ElementFx {
  id: ElementId; word: string;
  /** The element's own hue (bright, for dark ground), its white-hot core, and a dark for decals and cracks. */
  ink: string; core: string; dark: string;
  motion: Motion; shard: Shard; trail: Trail; field: FieldLook;
  /** Impact sprites (public/fx, white masks tinted), the shards thrown, which way they drift (−1 up … 1 down), the shake. */
  sprites: { name: string; scale: number; ms: number; color: 'ink' | 'core' | 'dark'; blend?: string }[];
  shards: number; drift: number; shake: number;
  /** A mark left on the tile, or none. */
  decal: { name: string; color: string; ms: number; size: number } | null;
  /** Sounds: the impact (a list plays one at random), the field's loop, a field tick, and a rate to pitch it. */
  sound: { impact: Sfx; extra?: Sfx; loop: Sfx | null; tick: Sfx; rate: number };
}
const E = (x: ElementFx) => x;
export const ELEMENTS: Record<ElementId, ElementFx> = {
  fire: E({ id: 'fire', word: 'FIRE', ink: '#FF9A4A', core: '#FFF3C4', dark: '#3A1206', motion: 'flare', shard: 'ember', trail: 'embers', field: 'lava',
    sprites: [{ name: 'flare', scale: 1.5, ms: 220, color: 'core' }, { name: 'flame', scale: 1.1, ms: 620, color: 'ink', blend: 'screen' }], shards: 9, drift: -1, shake: 0.6,
    decal: { name: 'scorch', color: '#140804', ms: 3600, size: 0.75 }, sound: { impact: 'el_fire', loop: 'el_fire_loop', tick: 'el_fire', rate: 1 } }),
  freeze: E({ id: 'freeze', word: 'FREEZE', ink: '#BDF3FF', core: '#FFFFFF', dark: '#2E5A6B', motion: 'crystallise', shard: 'shard', trail: 'frost', field: 'ice',
    sprites: [{ name: 'flash_star', scale: 1.3, ms: 260, color: 'core' }, { name: 'smoke_soft', scale: 1.2, ms: 900, color: 'ink' }], shards: 10, drift: 0, shake: 0.4,
    decal: { name: 'ring', color: '#BDF3FF', ms: 3000, size: 0.8 }, sound: { impact: 'el_freeze', extra: 'el_shatter', loop: 'el_freeze_loop', tick: 'el_shatter', rate: 1 } }),
  shock: E({ id: 'shock', word: 'SHOCK', ink: '#CFE3FF', core: '#FFFFFF', dark: '#2A3A66', motion: 'arc', shard: 'arc', trail: 'jag', field: 'static',
    sprites: [{ name: 'zap', scale: 1.3, ms: 300, color: 'core' }, { name: 'spark_burst', scale: 1, ms: 260, color: 'ink' }], shards: 6, drift: 0, shake: 0.5,
    decal: { name: 'scorch', color: '#10131C', ms: 2600, size: 0.5 }, sound: { impact: 'el_shock', loop: 'el_shock_loop', tick: 'el_zap', rate: 1 } }),
  stone: E({ id: 'stone', word: 'STONE', ink: '#C9B79C', core: '#EDE3D2', dark: '#4A3A20', motion: 'erupt', shard: 'chip', trail: 'grit', field: 'dust',
    sprites: [{ name: 'dirt', scale: 1.2, ms: 420, color: 'ink' }, { name: 'dust', scale: 1.4, ms: 700, color: 'dark' }], shards: 10, drift: 1, shake: 1.1,
    decal: { name: 'dirt', color: '#2A2113', ms: 3600, size: 0.7 }, sound: { impact: 'el_stone', loop: null, tick: 'el_stone_crumble', rate: 1 } }),
  gale: E({ id: 'gale', word: 'GALE', ink: '#DDF6FF', core: '#FFFFFF', dark: '#7F8BA1', motion: 'sweep', shard: 'streak', trail: 'streak', field: 'swirl',
    sprites: [{ name: 'smoke_soft', scale: 1.4, ms: 600, color: 'ink' }, { name: 'dust', scale: 1, ms: 520, color: 'dark' }], shards: 8, drift: 0, shake: 0.3,
    decal: null, sound: { impact: 'el_gale', loop: 'el_gale_loop', tick: 'el_gale', rate: 1.1 } }),
  spark: E({ id: 'spark', word: 'SPARK', ink: '#FFF4C4', core: '#FFFFFF', dark: '#6B5A20', motion: 'pop', shard: 'spark', trail: 'spark', field: 'twinkle',
    sprites: [{ name: 'flash_star', scale: 0.9, ms: 160, color: 'core' }], shards: 6, drift: 0, shake: 0.15,
    decal: null, sound: { impact: 'el_spark', loop: null, tick: 'el_spark', rate: 1 } }),
  acid: E({ id: 'acid', word: 'ACID', ink: '#B6E35A', core: '#E8FF9A', dark: '#2C360B', motion: 'splash', shard: 'drop', trail: 'drip', field: 'bubbles',
    sprites: [{ name: 'spark_burst_2', scale: 1, ms: 300, color: 'ink' }, { name: 'smoke_soft', scale: 1, ms: 1100, color: 'dark' }], shards: 9, drift: 1, shake: 0.3,
    decal: { name: 'blood_2', color: '#3E4E0E', ms: 3800, size: 0.6 }, sound: { impact: 'el_acid', extra: 'stim', loop: 'el_acid_loop', tick: 'el_acid', rate: 1 } }),
  raw: E({ id: 'raw', word: '', ink: SIGIL_INK, core: '#FFFFFF', dark: '#16323A', motion: 'snap', shard: 'square', trail: 'squares', field: 'grid',
    sprites: [{ name: 'flash_star', scale: 1, ms: 180, color: 'core' }], shards: 8, drift: 0, shake: 0.3,
    decal: null, sound: { impact: 'el_zap', loop: null, tick: 'el_zap', rate: 0.8 } }),
};
export const elementFx = (x: string | null | undefined): ElementFx => ELEMENTS[elementId(x)];

/** The family style: Sigils snap in cyan squares, Soul swells in violet smoke. */
export interface FamilyStyle {
  family: Family; edge: string; glow: string;
  /** Particle corners, the timing function, how much longer it lasts, and whether it swells from small. */
  radius: string; easing: string; tempo: number; swell: boolean; blur: number;
  /** Turns a particle takes on its way: Sigil squares turn in quarter steps, Soul motes don't turn. */
  turn: number;
  /** Sound pitch (Soul runs lower and slower). */
  rate: number;
}
export const FAMILY: Record<Family, FamilyStyle> = {
  sigil: { family: 'sigil', edge: SIGIL_INK, glow: SIGIL_GLOW, radius: '1px', easing: 'steps(6, end)', tempo: 1, swell: false, blur: 0, turn: 90, rate: 1 },
  soul: { family: 'soul', edge: SOUL_INK, glow: SOUL_INK, radius: '50%', easing: 'cubic-bezier(.3,.1,.3,1)', tempo: 1.6, swell: true, blur: 0.8, turn: 0, rate: 0.82 },
};
export const familyStyle = (f: Family | null | undefined): FamilyStyle => FAMILY[f === 'soul' ? 'soul' : 'sigil'];

/** Mix two #RRGGBB colours (t 0 → a, 1 → b). */
export function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16)), pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return '#' + pa.map((v, i) => Math.round(v + (pb[i] - v) * Math.max(0, Math.min(1, t))).toString(16).padStart(2, '0')).join('');
}
/** The colour of an element's particle over its life (t 0 … 1): a Sigil particle is the element with a cyan edge from
 *  the first frame; a Soul one starts violet and warms into the element. */
export function colourAt(el: ElementFx, fam: Family, t: number): string {
  if (fam === 'soul') return el.id === 'raw' ? SOUL_INK : mix(SOUL_INK, el.ink, Math.min(1, t * 1.4));
  return el.ink;
}
const tone = (el: ElementFx, which: 'ink' | 'core' | 'dark') => (which === 'ink' ? el.ink : which === 'core' ? el.core : el.dark);

// ---------- particles ----------
/** One element particle's look (CSS) in a family. */
export function shardCss(el: ElementFx, fam: Family, t = 0): string {
  const st = familyStyle(fam), c = colourAt(el, fam, t);
  if (fam === 'soul') return 'border-radius:50%;background:' + c + ';box-shadow:0 0 8px ' + c + ';filter:blur(' + st.blur + 'px)';
  switch (el.shard) {
    case 'shard': return 'background:linear-gradient(135deg,#FFFFFF,' + c + ');clip-path:polygon(50% 0,100% 50%,50% 100%,0 50%);box-shadow:0 0 4px ' + st.glow;
    case 'drop': return 'background:' + c + ';border-radius:50% 50% 50% 0;transform:rotate(-45deg);box-shadow:0 0 0 1px ' + st.edge;
    case 'streak': return 'background:linear-gradient(90deg,rgba(255,255,255,0),' + c + ');height:30%;margin-top:35%;border-radius:1px';
    case 'arc': return 'background:' + el.core + ';box-shadow:0 0 6px ' + c + ',0 0 2px ' + st.edge;
    default: return 'background:' + c + ';border-radius:' + st.radius + ';box-shadow:0 0 0 1px ' + st.edge + ',0 0 5px ' + st.glow;
  }
}
/** Shards thrown from a point (n of them, out to spread tiles), drifting up (embers), down (stone chips, acid drops) or out. */
export function shards(p: Pt, el: ElementFx, fam: Family, n: number, spread = 0.7, ms = 520, delay = 0) {
  const st = familyStyle(fam);
  if (reducedMotion()) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = p.s * spread * (0.35 + Math.random() * 0.65), sz = Math.max(3, p.s * (el.shard === 'streak' ? 0.3 : el.shard === 'spark' ? 0.06 : 0.08 + Math.random() * 0.05));
    const dx = Math.cos(a) * r, dy = Math.sin(a) * r * (el.drift ? 0.5 : 1) + el.drift * p.s * 0.45;
    const rot = st.turn ? Math.round(Math.random() * 3 + 1) * st.turn : 0, d = ms * st.tempo * (0.7 + Math.random() * 0.5);
    const frames: Keyframe[] = fam === 'soul'
      ? [{ transform: 'translate(0,0) scale(.3)', opacity: 0, background: colourAt(el, fam, 0) }, { opacity: 1, offset: 0.3 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) scale(1.3)', opacity: 0, background: colourAt(el, fam, 1) }]
      : [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + rot + 'deg)', opacity: 0 }];
    particle(p, sz, shardCss(el, fam), frames, d, delay + i * 14, fam === 'soul' ? st.easing : 'cubic-bezier(.2,.7,.3,1)');
  }
}
/** A square frame that snaps onto a tile (Sigil) or a soft ring that swells (Soul). */
export function snapFrame(p: Pt, color: string, fam: Family = 'sigil', ms = 420, o: { from?: number; to?: number; delay?: number; width?: number } = {}) {
  const run = () => {
    const w = o.width ?? 3, s = fam === 'soul' ? svg(100, 100, '<circle cx="50" cy="50" r="40" fill="none" stroke="' + color + '" stroke-width="' + w + '" style="filter:blur(1px)"/>')
      : svg(100, 100, '<rect x="10" y="10" width="80" height="80" fill="none" stroke="' + color + '" stroke-width="' + w + '" style="filter:drop-shadow(0 0 3px ' + SIGIL_GLOW + ')"/>');
    const box = put(s, p, p.s * 1.1, p.s * 1.1, ms);
    anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(' + (o.from ?? 1.6) + ')', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.35 }, { transform: 'scale(' + (o.to ?? 1) + ')', opacity: 0 }],
      { duration: ms * familyStyle(fam).tempo, easing: fam === 'soul' ? 'ease-out' : 'steps(5, end)', fill: 'forwards' });
  };
  if (o.delay) after(run, o.delay); else run();
}

// ---------- impacts ----------
export interface ImpactOpts { power?: number; crit?: boolean; delay?: number; decalKey?: string | null; quiet?: boolean; sound?: (s: Sfx, o?: { rate?: number; gain?: number; delay?: number }) => void }
/** An element lands at a point: its sprites in its colours, its shards, its motion, a decal for a beat, its sound. */
export function elementImpact(p: Pt, x: string | null | undefined, fam: Family = 'sigil', o: ImpactOpts = {}) {
  const el = elementFx(x), st = familyStyle(fam), pw = Math.max(0.3, o.power ?? 1), crit = !!o.crit;
  const run = () => {
    for (const sp of el.sprites) burst(sp.name, p, p.s * sp.scale * (0.7 + 0.3 * pw) * (crit ? 1.3 : 1), sp.ms * st.tempo, { color: fam === 'soul' && sp.color !== 'core' ? colourAt(el, fam, 0.6) : tone(el, sp.color), from: st.swell ? 0.2 : 0.4, to: st.swell ? 1.4 : 1.2, rot: el.motion === 'snap' ? 0 : Math.random() * 90, blend: sp.blend });
    shards(p, el, fam, Math.round(el.shards * (0.5 + 0.5 * pw) * (crit ? 1.5 : 1)), 0.6 + 0.2 * pw);
    if (fam === 'sigil') snapFrame(p, el.id === 'raw' ? SIGIL_INK : mix(SIGIL_INK, el.ink, 0.5), 'sigil', 360, { from: 0.6, to: 1.25, width: 4 });
    else burst('smoke_soft', p, p.s * 1.4 * pw, 900, { color: SOUL_INK, from: 0.3, to: 1.4, blend: 'screen' });
    motion(p, el, fam, pw);
    if (el.decal && o.decalKey) decalAt(o.decalKey, el.decal.name, el.decal.color, el.decal.ms, el.decal.size * (0.8 + 0.2 * pw));
    if (!o.quiet && o.sound) { o.sound(el.sound.impact, { rate: el.sound.rate * st.rate * (0.95 + Math.random() * 0.1), gain: Math.min(1, 0.6 + 0.4 * pw) }); if (el.sound.extra && (crit || el.id === 'acid')) o.sound(el.sound.extra, { delay: 140, gain: 0.6, rate: st.rate }); }
  };
  if (o.delay) after(run, o.delay); else run();
}
/** The element's own movement on impact: fire flares up, frost crystallises out, shock arcs, stone erupts from the floor,
 *  gale sweeps across, spark pops, acid splashes and drips; raw magic snaps a grid of squares. */
function motion(p: Pt, el: ElementFx, fam: Family, pw: number) {
  if (reducedMotion()) return;
  switch (el.motion) {
    case 'flare': for (let i = 0; i < 4; i++) particle({ x: p.x + (Math.random() - 0.5) * p.s * 0.5, y: p.y }, p.s * 0.12, shardCss(el, fam), [{ transform: 'translateY(0) scale(1)', opacity: 1 }, { transform: 'translateY(-' + p.s * (0.8 + Math.random() * 0.6) + 'px) scale(.4)', opacity: 0 }], 700, 80 + i * 70, 'ease-out'); break;
    case 'crystallise': {
      const n = 6, s = svg(100, 100, Array.from({ length: n }, (_, i) => { const a = (i / n) * Math.PI * 2; return '<path d="M50 50 L' + (50 + Math.cos(a) * 44).toFixed(1) + ' ' + (50 + Math.sin(a) * 44).toFixed(1) + '" stroke="' + el.ink + '" stroke-width="3" stroke-linecap="square"/>'; }).join('') + '<rect x="40" y="40" width="20" height="20" transform="rotate(45 50 50)" fill="' + el.core + '"/>');
      const box = put(s, p, p.s * 1.4 * pw, p.s * 1.4 * pw, 800);
      anim(box, [{ transform: 'scale(.2) rotate(0deg)', opacity: 1 }, { transform: 'scale(1) rotate(30deg)', opacity: 1, offset: 0.4 }, { transform: 'scale(1.05) rotate(30deg)', opacity: 0 }], { duration: 800 * familyStyle(fam).tempo, easing: fam === 'soul' ? 'ease-out' : 'steps(4, end)', fill: 'forwards' });
      break;
    }
    case 'arc': for (let i = 0; i < 3; i++) { const a = Math.random() * Math.PI * 2, q = { x: p.x + Math.cos(a) * p.s * 0.8, y: p.y + Math.sin(a) * p.s * 0.8, s: p.s }; after(() => jag(p, q, el, fam, 140), i * 60); } break;
    case 'erupt': for (let i = 0; i < 5; i++) { const x = (i - 2) * p.s * 0.18; particle({ x: p.x + x, y: p.y + p.s * 0.3 }, p.s * (0.16 + Math.random() * 0.08), shardCss(el, fam), [{ transform: 'translateY(0) rotate(0)', opacity: 1 }, { transform: 'translateY(-' + p.s * (0.5 + Math.random() * 0.4) + 'px) rotate(' + (fam === 'soul' ? 0 : 90) + 'deg)', opacity: 1, offset: 0.4 }, { transform: 'translateY(' + p.s * 0.2 + 'px) rotate(' + (fam === 'soul' ? 0 : 180) + 'deg)', opacity: 0 }], 620, i * 30, 'ease-out'); } break;
    case 'sweep': for (let i = 0; i < 4; i++) { const y = (i - 1.5) * p.s * 0.2; particle({ x: p.x - p.s * 0.6, y: p.y + y }, p.s * 0.5, 'background:linear-gradient(90deg,rgba(255,255,255,0),' + el.ink + ',rgba(255,255,255,0));height:12%;margin-top:44%;border-radius:4px', [{ transform: 'translateX(0) scaleX(.4)', opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { transform: 'translateX(' + p.s * 1.2 + 'px) scaleX(1.2)', opacity: 0 }], 420, i * 50, 'ease-out'); } break;
    case 'pop': burst('flare', p, p.s * 0.7 * pw, 140, { color: el.core, from: 0.3, to: 1.4 }); break;
    case 'splash': {
      for (let i = 0; i < 5; i++) { const x = (Math.random() - 0.5) * p.s * 0.7; particle({ x: p.x + x, y: p.y }, Math.max(3, p.s * 0.08), shardCss(el, fam), [{ transform: 'translateY(0)', opacity: 1 }, { transform: 'translateY(' + p.s * (0.4 + Math.random() * 0.3) + 'px)', opacity: 0 }], 900, 200 + i * 110, 'ease-in'); }
      bubbles(p, el, fam, 5, 900);
      break;
    }
    case 'snap': grid(p, el, fam); break;
  }
}
/** Bubbles rising and popping on a tile (ACID's bubbling; Corroded's burn). */
export function bubbles(p: Pt, el: ElementFx, fam: Family, n = 5, ms = 900, delay = 0) {
  if (reducedMotion()) n = Math.min(n, 2);
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * p.s * 0.7, y = (Math.random() - 0.2) * p.s * 0.4, sz = Math.max(3, p.s * (0.07 + Math.random() * 0.07));
    particle({ x: p.x + x, y: p.y + y }, sz, 'border-radius:50%;border:1px solid ' + el.core + ';background:' + el.ink + '55', [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.7 }, { transform: 'scale(1.5)', opacity: 0 }], ms * (0.6 + Math.random() * 0.6), delay + i * 120, 'ease-out');
  }
}
/** Raw Sigil magic: an expanding grid of squares. */
export function grid(p: Pt, el: ElementFx, fam: Family) {
  for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) {
    if (Math.abs(i) + Math.abs(j) > 3) continue;
    const r = p.s * 0.28;
    particle(p, Math.max(4, p.s * 0.13), shardCss(el, fam), [{ transform: 'translate(0,0) scale(.4)', opacity: 1 }, { transform: 'translate(' + i * r + 'px,' + j * r + 'px) scale(1)', opacity: 0 }], 420, (Math.abs(i) + Math.abs(j)) * 25, fam === 'soul' ? 'ease-out' : 'steps(4, end)');
  }
}
/** A jagged bolt from a to b (SHOCK, CHAIN): drawn twice with different jags so it flickers. */
export function jag(a: { x: number; y: number }, b: { x: number; y: number; s: number }, el: ElementFx, fam: Family, ms = 220, delay = 0) {
  const run = () => {
    const minX = Math.min(a.x, b.x) - 20, minY = Math.min(a.y, b.y) - 20, w = Math.abs(b.x - a.x) + 40, h = Math.abs(b.y - a.y) + 40;
    const path = () => { const n = 6, pts: string[] = []; for (let i = 0; i <= n; i++) { const t = i / n, off = i && i < n ? (Math.random() - 0.5) * Math.min(28, Math.hypot(b.x - a.x, b.y - a.y) * 0.18) : 0, nx = -(b.y - a.y), ny = b.x - a.x, l = Math.hypot(nx, ny) || 1; pts.push((a.x + (b.x - a.x) * t + (nx / l) * off - minX).toFixed(1) + ',' + (a.y + (b.y - a.y) * t + (ny / l) * off - minY).toFixed(1)); } return pts.join(' '); };
    const edge = fam === 'soul' ? SOUL_INK : SIGIL_INK;
    const s = svg(w, h, '<polyline points="' + path() + '" fill="none" stroke="' + edge + '" stroke-width="5" stroke-linejoin="miter" opacity=".55"/><polyline class="a" points="' + path() + '" fill="none" stroke="' + el.core + '" stroke-width="2.2" stroke-linejoin="miter"/><polyline class="b" points="' + path() + '" fill="none" stroke="' + el.ink + '" stroke-width="1.6" opacity="0"/>');
    const box = put(s, { x: minX + w / 2, y: minY + h / 2 }, w, h, ms);
    anim(box, [{ opacity: 1 }, { opacity: 0.4, offset: 0.3 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: ms, easing: 'steps(4, end)', fill: 'forwards' });
    const b2 = s.querySelector('.b'); if (b2) anim(b2, [{ opacity: 0 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: ms, easing: 'steps(2, end)', fill: 'forwards' });
  };
  if (delay) after(run, delay); else run();
}

// ---------- trails ----------
export type MissileKind = 'touch' | 'bolt' | 'lob' | 'appear' | 'relay';
/** A spell's flight from a to b in the element's trail and the family's style; returns how long it flies (ms).
 *  bolt (SEEK) is a straight square beam; lob (ARC) a glyph arcing over with its shadow on the ground; appear (SENSE)
 *  doesn't travel; touch is a short reach. */
export function elementTrail(a: Pt, b: Pt, x: string | null | undefined, fam: Family, kind: MissileKind, o: { glyph?: string; delay?: number } = {}): number {
  const el = elementFx(x), st = familyStyle(fam), d = Math.hypot(b.x - a.x, b.y - a.y);
  if (kind === 'appear') return 0;
  if (reducedMotion()) return kind === 'lob' ? 200 : 80;
  const ms = Math.round((kind === 'lob' ? Math.max(320, Math.min(700, d / 0.6)) : kind === 'touch' ? 120 : Math.max(90, Math.min(260, d / 2.4))) * (fam === 'soul' ? 1.3 : 1));
  const run = () => {
    if (kind === 'lob') { lobbed(a, b, el, fam, ms, o.glyph); return; }
    if (fam === 'sigil') beamBar(a, b, el, ms);
    // The trail itself: squares (or motes) along the line, in the element's way.
    const n = Math.max(4, Math.min(16, Math.round(d / (a.s * 0.4))));
    for (let i = 0; i < n; i++) {
      const t = (i + 1) / n, q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
      const wob = el.trail === 'embers' ? -a.s * 0.25 : el.trail === 'drip' || el.trail === 'grit' ? a.s * 0.25 : 0;
      particle(q, Math.max(3, a.s * (el.trail === 'spark' ? 0.06 : 0.1)), shardCss(el, fam, t), [{ transform: 'translate(0,0) scale(1)', opacity: 0 }, { opacity: 1, offset: 0.1 }, { transform: 'translate(' + (Math.random() - 0.5) * a.s * 0.2 + 'px,' + wob + 'px) scale(.5) rotate(' + st.turn + 'deg)', opacity: 0 }], 360 * st.tempo, ms * t, fam === 'soul' ? st.easing : 'steps(3, end)');
    }
    if (el.trail === 'jag') jag(a, b, el, fam, ms + 120);
  };
  if (o.delay) after(run, o.delay); else run();
  return ms;
}
/** SEEK's beam: a straight bar of light, cyan-edged, the element at its core, that shoots out and snaps off. */
function beamBar(a: Pt, b: Pt, el: ElementFx, ms: number) {
  const len = Math.hypot(b.x - a.x, b.y - a.y), deg = (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI, h = Math.max(4, a.s * 0.16);
  const bar = document.createElement('div');
  bar.style.cssText = 'width:100%;height:100%;background:linear-gradient(180deg,' + SIGIL_INK + ' 0 18%,' + el.core + ' 30% 70%,' + SIGIL_INK + ' 82% 100%);box-shadow:0 0 10px ' + SIGIL_GLOW + ',0 0 4px ' + el.ink;
  const box = put(bar, { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 }, len, h, ms + 260);
  box.style.transformOrigin = '0 50%'; box.style.left = a.x + 'px'; box.style.top = a.y - h / 2 + 'px';
  anim(box, [{ transform: 'rotate(' + deg + 'deg) scaleX(0)', opacity: 1 }, { transform: 'rotate(' + deg + 'deg) scaleX(1)', opacity: 1, offset: ms / (ms + 260) }, { transform: 'rotate(' + deg + 'deg) scaleX(1) scaleY(.2)', opacity: 0 }], { duration: ms + 260, easing: 'steps(8, end)', fill: 'forwards' });
}
/** ARC's lob: the spell's glyph arcs over walls while its shadow runs along the ground. */
function lobbed(a: Pt, b: Pt, el: ElementFx, fam: Family, ms: number, glyph?: string) {
  const dx = b.x - a.x, dy = b.y - a.y, h = Math.max(a.s * 1.2, Math.hypot(dx, dy) * 0.4), sz = a.s * 0.5;
  const shadow = document.createElement('div');
  shadow.style.cssText = 'width:100%;height:100%;border-radius:50%;background:rgba(0,0,0,.45);filter:blur(1px)';
  const sb = put(shadow, a, sz * 0.9, sz * 0.4, ms);
  anim(sb, [{ transform: 'translate(0,' + sz * 0.6 + 'px) scale(1)', opacity: 0.6 }, { transform: 'translate(' + dx / 2 + 'px,' + (dy / 2 + sz * 0.6) + 'px) scale(.5)', opacity: 0.3 }, { transform: 'translate(' + dx + 'px,' + (dy + sz * 0.6) + 'px) scale(1)', opacity: 0.7 }], { duration: ms, easing: 'linear', fill: 'forwards' });
  const g = document.createElement('div');
  g.style.cssText = fam === 'soul' ? 'width:100%;height:100%;border-radius:50%;background:radial-gradient(circle,' + el.core + ',' + colourAt(el, fam, 0.3) + ' 50%,rgba(0,0,0,0) 70%);filter:blur(1px)'
    : 'width:100%;height:100%;display:grid;place-items:center;background:rgba(10,13,19,.6);box-shadow:inset 0 0 0 2px ' + SIGIL_INK + ',0 0 10px ' + SIGIL_GLOW;
  if (fam === 'sigil' && glyph) g.innerHTML = glyph;
  const gb = put(g, a, sz, sz, ms);
  const f: Keyframe[] = [];
  for (let i = 0; i <= 10; i++) { const t = i / 10; f.push({ transform: 'translate(' + dx * t + 'px,' + (dy * t - 4 * h * t * (1 - t)) + 'px) rotate(' + (fam === 'sigil' ? Math.round(t * 4) * 90 : 0) + 'deg)' }); }
  anim(gb, f, { duration: ms, easing: 'linear', fill: 'forwards' });
  for (let i = 1; i < 6; i++) { const t = i / 6; particle({ x: a.x + dx * t, y: a.y + dy * t - 4 * h * t * (1 - t) }, Math.max(3, a.s * 0.08), shardCss(el, fam, t), [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0, transform: 'translateY(' + a.s * 0.15 + 'px)' }], 380, ms * t); }
}

// ---------- decals ----------
/** A mark on a tile for a few seconds (scorch, frost ring, acid pitting), anchored so it follows the map. */
export function decalAt(k: string, name: string, color: string, ms = 3200, size = 0.6) {
  const p = centre(k); if (!p) return;
  const off = { x: (Math.random() - 0.5) * p.s * 0.2, y: (Math.random() - 0.5) * p.s * 0.2 };
  const box = put(sprite(name, color), { x: p.x + off.x, y: p.y + off.y }, p.s * size, p.s * size, ms);
  box.style.zIndex = '0';
  anchor(box, k, ms, off.y / p.s);
  anim(box, [{ opacity: 0, transform: 'scale(.5)' }, { opacity: 0.8, transform: 'scale(1)', offset: 0.05 }, { opacity: 0.7, offset: 0.75 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}

// ---------- the standing look of a field (ambient.ts keeps one per field tile while the field lasts) ----------
/** A field tile's living overlay: lava cracks, an ice sheen, acid bubbles, storm static, drifting dust, a wind swirl,
 *  twinkles, or raw magic's grid. Returns the node and its looping animations (none under reduced motion). */
export function fieldNode(x: string | null | undefined, fam: Family = 'sigil'): HTMLElement {
  const el = elementFx(x), d = document.createElement('div'), still = reducedMotion();
  d.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;opacity:.85;border-radius:' + (fam === 'soul' ? '30%' : '2px');
  d.dataset.field = el.id;
  const loop = (n: Element, f: Keyframe[], ms: number, o: KeyframeAnimationOptions = {}) => { if (!still) anim(n, f, { duration: ms, iterations: Infinity, ...o }); };
  const add = (html: string) => { const c = document.createElement('div'); c.style.cssText = 'position:absolute;inset:0'; c.innerHTML = html; d.appendChild(c); return c; };
  switch (el.field) {
    case 'lava': {
      const c = add('<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M4 30 L12 24 L16 28 L24 18 L30 22 L37 12 M12 24 L10 14 M24 18 L22 8 M30 22 L34 32" fill="none" stroke="' + el.ink + '" stroke-width="1.6" stroke-linecap="square"/><path d="M4 30 L12 24 L16 28 L24 18 L30 22 L37 12" fill="none" stroke="' + el.core + '" stroke-width=".6"/></svg>');
      c.style.background = 'radial-gradient(circle at 50% 60%,rgba(246,138,56,.35),rgba(58,18,6,.25) 70%)';
      loop(c, [{ opacity: 0.55, filter: 'brightness(.9)' }, { opacity: 1, filter: 'brightness(1.4)' }, { opacity: 0.55, filter: 'brightness(.9)' }], 1600, { easing: fam === 'sigil' ? 'steps(4, end)' : 'ease-in-out' });
      for (let i = 0; i < 2; i++) { const m = add(''); m.style.cssText = 'position:absolute;left:' + (25 + i * 40) + '%;bottom:20%;width:9%;height:9%;' + shardCss(el, fam); loop(m, [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translateY(-260%)', opacity: 0 }], 1400 + i * 500, { delay: i * 600 }); }
      break;
    }
    case 'ice': {
      const c = add('<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M6 8 L18 16 L14 30 M18 16 L32 10 M18 16 L30 30" fill="none" stroke="#FFFFFF" stroke-opacity=".55" stroke-width=".8"/></svg>');
      c.style.background = 'linear-gradient(135deg,rgba(189,243,255,.18),rgba(46,90,107,.18))';
      const sheen = add(''); sheen.style.background = 'linear-gradient(115deg,rgba(255,255,255,0) 35%,rgba(255,255,255,.55) 48%,rgba(255,255,255,0) 60%)'; sheen.style.backgroundSize = '300% 100%';
      loop(sheen, [{ backgroundPosition: '120% 0' }, { backgroundPosition: '-60% 0' }], 2600, { easing: 'ease-in-out' });
      break;
    }
    case 'static': {
      const c = add('<svg viewBox="0 0 40 40" width="100%" height="100%"><polyline class="s1" points="4,20 12,14 18,24 26,12 36,20" fill="none" stroke="' + el.core + '" stroke-width="1.2"/><polyline class="s2" points="6,30 14,26 20,32 30,24 36,30" fill="none" stroke="' + el.ink + '" stroke-width="1"/></svg>');
      c.style.background = 'radial-gradient(circle,rgba(127,178,255,.22),rgba(42,58,102,.15) 75%)';
      const s1 = c.querySelector('.s1'), s2 = c.querySelector('.s2');
      if (s1) loop(s1, [{ opacity: 0 }, { opacity: 1, offset: 0.1 }, { opacity: 0, offset: 0.2 }, { opacity: 0, offset: 0.6 }, { opacity: 1, offset: 0.65 }, { opacity: 0 }], 1300, { easing: 'steps(1, end)' });
      if (s2) loop(s2, [{ opacity: 0 }, { opacity: 0, offset: 0.35 }, { opacity: 1, offset: 0.4 }, { opacity: 0, offset: 0.5 }, { opacity: 0 }], 1700, { easing: 'steps(1, end)' });
      break;
    }
    case 'dust': {
      const c = add(''); c.style.background = 'radial-gradient(circle at 50% 70%,rgba(140,111,58,.3),rgba(42,33,19,.2) 75%)';
      for (let i = 0; i < 3; i++) { const m = add(''); m.style.cssText = 'position:absolute;left:' + (15 + i * 28) + '%;top:' + (55 - i * 12) + '%;width:8%;height:8%;' + shardCss(el, fam); loop(m, [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 0.9, offset: 0.3 }, { transform: 'translate(140%,-80%)', opacity: 0 }], 2200 + i * 400, { delay: i * 500 }); }
      break;
    }
    case 'swirl': {
      const c = add('<svg viewBox="0 0 40 40" width="100%" height="100%"><path d="M20 20 m-12 0 a12 12 0 0 1 24 0" fill="none" stroke="' + el.ink + '" stroke-opacity=".7" stroke-width="1.4" stroke-linecap="round"/><path d="M20 20 m7 0 a7 7 0 0 1 -14 0" fill="none" stroke="#FFFFFF" stroke-opacity=".5" stroke-width="1"/></svg>');
      c.style.background = 'radial-gradient(circle,rgba(221,246,255,.16),rgba(127,139,161,.1) 75%)';
      loop(c, [{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], 1800, { easing: fam === 'sigil' ? 'steps(8, end)' : 'linear' });
      break;
    }
    case 'twinkle': {
      for (let i = 0; i < 3; i++) { const m = add(''); m.style.cssText = 'position:absolute;left:' + (20 + i * 25) + '%;top:' + (30 + ((i * 37) % 40)) + '%;width:9%;height:9%;background:' + el.core + ';clip-path:polygon(50% 0,60% 40%,100% 50%,60% 60%,50% 100%,40% 60%,0 50%,40% 40%)'; loop(m, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.5 }, { opacity: 0, transform: 'scale(.4)' }], 900 + i * 300, { delay: i * 250 }); }
      break;
    }
    case 'bubbles': {
      const c = add(''); c.style.background = 'radial-gradient(circle at 50% 55%,rgba(182,227,90,.32),rgba(44,54,11,.25) 75%)';
      for (let i = 0; i < 3; i++) { const m = add(''); m.style.cssText = 'position:absolute;left:' + (18 + i * 26) + '%;top:' + (40 + ((i * 23) % 30)) + '%;width:12%;height:12%;border-radius:50%;border:1px solid ' + el.core + ';background:' + el.ink + '44'; loop(m, [{ transform: 'scale(.2)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.75 }, { transform: 'scale(1.5)', opacity: 0 }], 1100 + i * 350, { delay: i * 300 }); }
      break;
    }
    default: {
      const c = add(''); c.style.background = 'repeating-linear-gradient(0deg,rgba(139,222,238,.18) 0 1px,transparent 1px 6px),repeating-linear-gradient(90deg,rgba(139,222,238,.18) 0 1px,transparent 1px 6px)';
      loop(c, [{ opacity: 0.4 }, { opacity: 0.9 }, { opacity: 0.4 }], 1400, { easing: 'steps(3, end)' });
    }
  }
  return d;
}
/** A WATCH turret's standing look: a small glyph pillar of stacked squares with a turning eye on top (red-eyed when it
 *  isn't yours). */
export function turretNode(x: string | null | undefined, mine: boolean): HTMLElement {
  const el = elementFx(x), d = document.createElement('div'), still = reducedMotion();
  d.style.cssText = 'position:relative;width:100%;height:100%;pointer-events:none';
  d.dataset.turret = el.id;
  const eye = mine ? SIGIL_INK : '#F65157';
  d.innerHTML = '<svg viewBox="0 0 40 40" width="100%" height="100%" style="overflow:visible">'
    + [0, 1, 2].map((i) => '<rect x="' + (15 + i) + '" y="' + (30 - i * 7) + '" width="' + (10 - i * 2) + '" height="6" fill="' + (i === 1 ? el.ink : '#10151F') + '" stroke="' + SIGIL_INK + '" stroke-width="1.2"/>').join('')
    + '<g class="eye"><path d="M12 9 Q20 2 28 9 Q20 16 12 9 Z" fill="#0A0D13" stroke="' + eye + '" stroke-width="1.4"/><rect class="pupil" x="18" y="7" width="4" height="4" fill="' + eye + '"/></g></svg>';
  const pupil = d.querySelector('.pupil');
  if (pupil && !still) anim(pupil, [{ transform: 'translateX(-4px)' }, { transform: 'translateX(4px)' }, { transform: 'translateX(-4px)' }], { duration: 2400, iterations: Infinity, easing: 'steps(6, end)' });
  return d;
}
