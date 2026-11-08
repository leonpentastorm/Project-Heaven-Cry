// Class Roster Revision 3's twenty moves as effects and sound (engine classes/rev3.ts and illusion.ts send the events;
// docs/design/perk-runtime.md lists them). Each move speaks its class's attribute ink, always with a word: the
// Defender's Shrug It Off and Anchor (Endurance red), the Fighter's Unstoppable (Strength orange), the Marksman's Duck
// and Roll (Agility gold), the Infiltrator's rig and Sabotage (Perception teal, a sabotaged machine sparking), the
// Trickster's Read (a white reticle and the planned move), False Image (Sigil cyan: the decoy forms out of squares and
// scatters when struck or gone), Silver Tongue and Sleight (Expression blue), the Bard's Rally (white, the heals follow
// as their own events), the Channeler's Eye of the Storm (Soul violet, a calm inward ring) and the Guardian's Command
// (Virtue rose). Fog: every point comes through the kit's at() (null out of sight); an event marked for one side
// (a rig) never reaches the other side's screen (play.ts mineOnly). Reduced motion: the dom helpers shorten or skip the
// movement; nothing here loops. Nothing here reads or changes the rules.
import type { FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { SIGIL_INK, SIGIL_GLOW, SOUL_INK } from '../glyphs';
import { ELEMENTS, shards, snapFrame } from './elements';
import { type Pt, after, anim, burst, centre, floatText, lunge, particle, put, ring, shake, slideFrom, svg } from './dom';

export const CLASS_INK = { endurance: '#F65157', strength: '#F68A38', agility: '#E3BF51', perception: '#40BAA0', expression: '#5394AC', virtue: '#D36A90' };
const WHITE = '#FFFFFF', MUTED = '#A3AEC2', HP = '#F65157', OK = '#6FEA77', SPARK = '#FFD27A';

/** What play.ts lends these handlers (the same pieces the Soul handlers get, plus a few of its particles). */
export interface ClassKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
  squares: (p: Pt, color: string, n: number, spread: number, ms: number, delay?: number) => void;
  dust: (p: { x: number; y: number }, s: number, color?: string) => void;
  corners: (p: Pt, color: string, ms: number) => void;
  glitch: (p: Pt, ms: number) => void;
  condWord: (id: string) => string;
}

/** The words each event floats (pure, for the tests). */
export function classWord(e: Partial<FxEvent> & { k: string }): string {
  switch (e.k) {
    case 'shrug': return 'SHRUGGED OFF';
    case 'anchor': return e.what === 'oa' ? 'NO ESCAPE' : 'ANCHORED';
    case 'unstoppable': return 'UNSTOPPABLE';
    case 'duck': return e.out ? 'OUT OF SIGHT' : 'DUCK & ROLL';
    case 'rig': return 'RIGGED';
    case 'sabotage': return 'SABOTAGED · ' + (e.rounds || 2) + ' ROUNDS';
    case 'sabotage_end': return e.what === 'barricade' ? 'BLOCKS AGAIN' : 'BACK ONLINE';
    case 'intent': return 'INTENT: ' + String(e.kind || 'move').toUpperCase();
    case 'image': return 'FALSE IMAGE';
    case 'image_gone': return e.why === 'struck' ? 'SCATTERED' : e.why === 'replaced' ? 'RECAST' : 'FADES';
    case 'silver_tongue': return e.ok ? '−' + (e.ap || 2) + ' AP NEXT TURN' : 'UNMOVED';
    case 'swap': return 'SLEIGHT';
    case 'rally': return 'RALLY!';
    case 'eye_storm': return 'EYE OF THE STORM';
    case 'eye_storm_spent': return 'NO STRAIN · RIDER +1';
    case 'command_move': return 'MOVE!';
    default: return '';
  }
}
/** How long each holds the stage before the next event (ms), or undefined for an event that isn't one of these. */
export function classBeat(e: FxEvent): number | undefined {
  switch (e.k) {
    case 'shrug': case 'anchor': case 'rig': return 320;
    case 'unstoppable': return 620;
    case 'duck': return 260;
    case 'sabotage': return 440;
    case 'sabotage_end': return 140;
    case 'intent': return 560;
    case 'image': return 560;
    case 'image_gone': return 320;
    case 'silver_tongue': return 540;
    case 'swap': return 380;
    case 'rally': return 600;
    case 'eye_storm': return 540;
    case 'eye_storm_spent': return 380;
    case 'command_move': return 320;
    default: return undefined;
  }
}

/** A line of small marks from a to b (a spoken line, an order, an aim), each in turn. */
function trail(a: Pt, b: Pt, color: string, css: string, ms: number, n?: number) {
  const k = n || Math.max(3, Math.min(10, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (a.s * 0.5))));
  for (let i = 1; i <= k; i++) {
    const t = i / (k + 1), q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
    particle(q, Math.max(4, a.s * 0.13), css + ';box-shadow:0 0 5px ' + color, [{ opacity: 0, transform: 'scale(.4)' }, { opacity: 1, transform: 'scale(1)', offset: 0.3 }, { opacity: 0, transform: 'scale(.8)' }], ms, (i * ms * 0.5) / k);
  }
}
/** An outline of a token's square or circle, closing in (brace, anchor) or opening out. */
function frame(p: Pt, color: string, ms: number, round: boolean, from = 1.5, to = 1) {
  const s = svg(100, 100, round ? '<circle cx="50" cy="50" r="42" fill="none" stroke="' + color + '" stroke-width="5"/>' : '<rect x="8" y="8" width="84" height="84" rx="6" fill="none" stroke="' + color + '" stroke-width="5"/>');
  const box = put(s, p, p.s * 1.2, p.s * 1.2, ms);
  anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'scale(' + from + ')', opacity: 0 }, { transform: 'scale(' + to + ')', opacity: 1, offset: 0.35 }, { transform: 'scale(' + to + ')', opacity: 0 }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
}

export function classHandlers(K: ClassKit): Record<string, (e: FxEvent) => void> {
  const { at, tokOf, play, squares, dust, corners, glitch, condWord } = K;
  return {
    // ---------- Defender ----------
    shrug(e) {
      const p = at(e.at); play('hit_heavy', p || centre(e.at), { rate: 0.8, gain: 0.6 }); play('swish', p || centre(e.at), { rate: 0.7, delay: 90, gain: 0.5 });
      if (!p) return;
      const tok = tokOf(e.unit, e.at); shake(tok, 0.5);
      // The condition's word falls off the token and breaks.
      const q = { x: p.x, y: p.y - p.s * 0.55, s: p.s };
      floatText(condWord(e.cond), q, MUTED, { small: true, ms: 600 });
      after(() => shards(q, { ...ELEMENTS.stone, ink: MUTED, core: WHITE }, 'sigil', 7, 0.6, 520), 260);
      frame(p, CLASS_INK.endurance, 520, true, 1.35, 1);
      floatText(classWord(e), p, WHITE, { small: true, delay: 260 });
    },
    anchor(e) {
      const p = at(e.at); play('hit_metal', p || centre(e.at), { rate: 0.55, gain: 0.8 });
      if (!p) return;
      // Feet planted: brackets slam down, dust at the base.
      frame(p, CLASS_INK.endurance, 600, false, 1.6, 0.95);
      dust({ x: p.x, y: p.y + p.s * 0.3 }, p.s * 0.8);
      if (e.what === 'oa' && e.target) { const t = at(K.posOf(e.target)); if (t) { const a = Math.atan2(t.y - p.y, t.x - p.x); lunge(tokOf(e.unit, e.at), Math.cos(a) * p.s * 0.25, Math.sin(a) * p.s * 0.25, 220); } }
      floatText(classWord(e), p, WHITE, { small: true, delay: 120 });
    },
    // ---------- Fighter ----------
    unstoppable(e) {
      const p = at(e.at); play('heartbeat', p || centre(e.at), { rate: 1.2 }); play('explosion_boom', p || centre(e.at), { rate: 1.6, gain: 0.45, delay: 120 });
      if (!p) return;
      ring(p, CLASS_INK.strength, 620, { from: 0.4, to: 1.8, width: 7 }); ring(p, WHITE, 520, { from: 0.3, to: 1.3, width: 3, delay: 110 });
      burst('spark_burst', p, p.s * 1.2, 320, { color: CLASS_INK.strength });
      (e.ignored || []).slice(0, 4).forEach((id: string, i: number) => floatText(condWord(id) + ' ✕', { x: p.x + (i - 1.5) * p.s * 0.5, y: p.y + p.s * 0.6, s: p.s }, MUTED, { small: true, delay: 200 + i * 80 }));
      floatText(classWord(e), p, CLASS_INK.strength, { big: true, delay: 80 });
    },
    // ---------- Marksman ----------
    duck(e) {
      const p = at(e.to) || at(e.from); play('swish', p, { rate: 1.3, gain: 0.6 }); play('body_fall', p, { rate: 1.5, gain: 0.45, delay: 140 });
      if (!p) return;
      dust({ x: p.x, y: p.y + p.s * 0.25 }, p.s);
      floatText(classWord(e), p, CLASS_INK.agility, { small: true });
      if (e.cover) frame(p, CLASS_INK.agility, 480, true, 1.2, 0.95);
    },
    // ---------- Infiltrator ----------
    rig(e) {
      const p = at(e.at); play('rack', p, { rate: 1.35, gain: 0.45 }); play('dry_click', p, { rate: 0.8, delay: 220, gain: 0.6 });
      if (!p) return;
      snapFrame(p, CLASS_INK.perception, 'sigil', 700, { from: 1.25, to: 0.85, width: 2 });
      squares(p, CLASS_INK.perception, 5, 0.4, 520, 100);
      floatText(classWord(e), p, CLASS_INK.perception, { small: true, delay: 160 });
    },
    sabotage(e) {
      const p = at(e.at); play('el_spark', p, { gain: 0.8 }); play('hit_metal', p, { rate: 1.3, delay: 160, gain: 0.6 });
      if (!p) return;
      corners(p, CLASS_INK.perception, 520);
      for (let i = 0; i < 3; i++) burst('spark_burst', { x: p.x + (Math.random() - 0.5) * p.s * 0.6, y: p.y + (Math.random() - 0.5) * p.s * 0.6 }, p.s * 0.5, 240, { color: SPARK, delay: 120 + i * 110 });
      if (e.what === 'machine' || e.what === 'turret') glitch(p, 300);
      shake(tokOf(e.target, e.at), 0.6);
      floatText(classWord(e), { x: p.x, y: p.y - p.s * 0.55, s: p.s }, '#E3BF51', { small: true, delay: 220 }); // above the condition's own word
    },
    sabotage_end(e) { const p = at(e.at); play('jam_clear', p, { gain: 0.5 }); if (p) floatText(classWord(e), p, MUTED, { small: true }); },
    // ---------- Trickster ----------
    intent(e) {
      const p = at(e.at); play('sigil_draw', p || centre(e.at), { rate: 1.7, gain: 0.45 });
      if (!p) return;
      corners(p, WHITE, 640);
      const to = e.image ? null : e.targetUnit ? K.posOf(e.targetUnit) : e.to, q = to ? at(to) : null;
      if (q) { trail(p, q, WHITE, 'border:2px solid ' + WHITE + ';transform:rotate(45deg)', 600); after(() => frame(q, e.kind === 'attack' || e.kind === 'spell' || e.kind === 'outburst' ? HP : WHITE, 520, false, 1.4, 1), 380); }
      floatText(classWord(e), p, WHITE, { small: true, delay: 200, ms: 1400 });
    },
    image(e) {
      const p = at(e.at); play('sg_mask', p || centre(e.at), { rate: 1.1, gain: 0.8 });
      if (!p) return;
      // The decoy forms out of cyan squares where the owner's copy will stand (classMarks draws it from then on).
      const own = K.posOf(e.owner), src = own ? at(own) : null;
      if (src && !reducedMotion()) for (let i = 0; i < 8; i++) particle(src, 5, 'background:' + SIGIL_INK + ';box-shadow:0 0 4px ' + SIGIL_GLOW, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (p.x - src.x + (Math.random() - 0.5) * p.s * 0.6) + 'px,' + (p.y - src.y + (Math.random() - 0.5) * p.s * 0.6) + 'px)', opacity: 0.2 }], 420, i * 30);
      const tok = tokOf(e.owner, own);
      if (tok) { const copy = tok.cloneNode(true) as HTMLElement; copy.style.position = 'static'; copy.style.inset = ''; copy.style.margin = '0'; copy.style.width = '100%'; copy.style.height = '100%';
        const box = put(copy, p, p.s * 0.95, p.s * 0.95, 900); box.style.filter = 'saturate(.3) brightness(1.3) drop-shadow(0 0 6px ' + SIGIL_GLOW + ')';
        anim(box, [{ opacity: 0, transform: 'scale(1.2)' }, { opacity: 0.75, transform: 'scale(1)', offset: 0.4 }, { opacity: 0.5, offset: 0.7 }, { opacity: 0 }], { duration: 900, easing: 'steps(6, end)', fill: 'forwards' }); }
      snapFrame(p, SIGIL_INK, 'sigil', 520, { delay: 260 });
      floatText(classWord(e), p, SIGIL_INK, { small: true, delay: 320 });
      const n = (e.fooled || []).length; if (n) floatText(n + ' FOOLED', { x: p.x, y: p.y + p.s * 0.45, s: p.s }, SIGIL_INK, { small: true, delay: 620 });
    },
    image_gone(e) {
      const p = at(e.at); play(e.why === 'struck' ? 'el_shatter' : 'sg_fizzle', p || centre(e.at), { gain: 0.6, rate: e.why === 'struck' ? 1.2 : 1 });
      if (!p) return;
      shards(p, { ...ELEMENTS.freeze, ink: SIGIL_INK, core: WHITE }, 'sigil', e.why === 'struck' ? 14 : 7, e.why === 'struck' ? 1 : 0.5, 600);
      floatText(classWord(e), p, e.why === 'struck' ? SIGIL_INK : MUTED, { small: true });
    },
    silver_tongue(e) {
      const a = at(e.from), b = at(e.to); play('soul_sigh', a || b, { rate: 1.5, gain: 0.5 }); play(e.ok ? 'sg_command' : 'whiz', b, { rate: e.ok ? 1.3 : 0.7, delay: 380, gain: 0.6 });
      if (a && b) trail(a, b, CLASS_INK.expression, 'border-radius:50%;background:' + CLASS_INK.expression, 520, 6);
      if (!b) return;
      if (e.ok) { after(() => { const t = tokOf(e.target, e.to); shake(t, 0.4); burst('spark_burst', b, b.s * 0.6, 260, { color: CLASS_INK.expression }); }, 380); floatText(classWord(e), b, WHITE, { small: true, delay: 420 }); }
      else floatText(classWord(e), b, MUTED, { small: true, delay: 420 });
    },
    swap(e) {
      const a = at(e.from), b = at(e.to); play('sg_blink', a || b, { rate: 1.15 });
      // The two change places in a blink: the mover lands at to, the other (a squadmate, or the decoy) at from.
      if (b) { slideFrom(e.from, e.to, 260); burst('flare', b, b.s, 260, { color: e.image ? SIGIL_INK : CLASS_INK.expression, from: 0.4, to: 1.3 }); }
      if (a) { if (!e.image) slideFrom(e.to, e.from, 260); burst('flare', a, a.s, 260, { color: e.image ? SIGIL_INK : CLASS_INK.expression, from: 0.4, to: 1.3 }); }
      if (b) floatText(classWord(e), b, e.image ? SIGIL_INK : CLASS_INK.expression, { small: true, delay: 160 });
    },
    // ---------- Bard ----------
    rally(e) {
      const p = at(e.at); play('soul_choir', p || centre(e.at), { gain: 0.55, rate: 1.1 }); play('heartbeat', p || centre(e.at), { rate: 1.3, gain: 0.6 });
      if (!p) return;
      const r = Math.max(1, e.radius || 4);
      ring(p, WHITE, 760, { from: 0.4, to: 1 + r * 0.95, width: 3 }); ring(p, OK, 680, { from: 0.3, to: r * 0.7, width: 2, delay: 140 });
      for (const id of (e.targets || []).slice(0, 4)) { const q = at(K.posOf(id)); if (q) after(() => frame(q, OK, 460, true, 1.3, 1), 260); }
      floatText(classWord(e), p, WHITE, { big: true });
    },
    // ---------- Channeler ----------
    eye_storm(e) {
      const p = at(e.at); play('soul_breath_in', p || centre(e.at), { gain: 0.8 });
      if (!p) return;
      ring(p, SOUL_INK, 900, { from: 2.2, to: 0.6, width: 4 }); ring(p, '#E9E2FF', 760, { from: 1.8, to: 0.5, width: 2, delay: 160 });
      floatText(classWord(e), p, SOUL_INK, { small: true, delay: 300, ms: 1300 });
    },
    eye_storm_spent(e) {
      const p = at(e.at); play('soul_breath_out', p || centre(e.at), { gain: 0.7 });
      if (!p) return;
      ring(p, SOUL_INK, 600, { from: 0.6, to: 1.6, width: 3 });
      floatText(classWord(e), p, SOUL_INK, { small: true, delay: 120 });
    },
    // ---------- Guardian ----------
    command_move(e) {
      const a = at(K.posOf(e.unit)), b = at(e.from); play('sg_command', a || b, { rate: 0.9, gain: 0.7 });
      if (a && b) trail(a, b, CLASS_INK.virtue, 'border:2px solid ' + CLASS_INK.virtue + ';transform:rotate(45deg)', 420);
      if (b) floatText(classWord(e), b, CLASS_INK.virtue, { small: true, delay: 160 });
    },
  };
}
