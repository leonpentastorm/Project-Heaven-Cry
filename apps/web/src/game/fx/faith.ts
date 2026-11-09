// Blessing 2.0 (rules 1.6) effects: what an answered prayer looks and sounds like. Driven by the engine's faith FX events
// (docs/design/handoffs/_archive/blessing-implementer-1-engine.md, the contract; payloads below), drawn by this layer like every
// other effect, so everyone sees the same thing. Faith's words are Virtue ink; its light is gold; each patron's accent
// colours light and particles only, never text.
//   prayer       {unit, kind: whisper|hymn|miracle, id, patron, at, target, ok}
//   prayer_fail  {unit, kind, id, patron, at}                  silence, the mark fading
//   witnessed    {unit, patron, at}                            an eye opening above the caster
//   intervention {unit, patron, trigger, target, amount, at}   routed to playIntervention in game/cutIn.ts (today: a sharp
//                bell, the mark flashing at the trigger, "<PATRON> INTERVENES"; the small cut-in is the trigger left
//                for later: docs/design/faith-presence-spec.md section 3)
//   devotion     {char, delta, xp, reason, tag?, now, was, level?, at?}  "+1 DEVOTION XP · <tag>" in Virtue ink with a gold
//                mark (delta is XP, rules 1.6.1); a level change (level set) adds "DEVOTION 5", the mark lit
//   leave        {char, patron, to, letGo, roll?}              leaving a patron for another: "LET GO · <patron>" or "HELD · <patron>"
//   grudge       {char, patron, sessions, condition, at?, unit?}  "GRUDGE · <patron>" in complication red, the old mark dim
//   vow          {unit, id, state: sworn|kept|broken, at}       a seal stamped (sworn), lit (kept) or cracked (broken)
//   patron_line  {patron, event, text}                         a card in the log (the screens draw it); a glint here
//   miracle      {patron, id, at, area, unit, char, name, text, line, summary}  the cut-in (game/cutIn.ts, Faith 2.2, spec
//                2.3): the patron's portrait over the whole screen, the god calling the devoted by name with the grant
//                line, the pull-away and the zoom to where it lands, the effect, then a box of what it did (~6 s, skippable)
// Fog: every map effect goes through the kit's at() (null where the viewer can't see); a Miracle's answer is heard by
// everyone. Reduce motion: still marks and short fades, no rays or particles.
import { FAITH_PATRON, type FxEvent } from '@engine';
import { reducedMotion, type Sfx } from '../sfx';
import { type Pt, anim, after, burst, floatText, put, ring } from './dom';
import { FAITH_GOLD, FAITH_INK, accentOf, patronFace, patronMarkUri, witnessedUri, vowIconUri, prayerIconUri } from '../faithArt';
import { cutInTiming, miracleCutIn, playIntervention, showCutIn } from '../cutIn';

export interface FaithKit {
  at: (k: string | null | undefined) => Pt | null;
  posOf: (unitId: string | null | undefined) => string | undefined;
  /** A character's tile in the fight on screen (Devotion events name the character). */
  posOfChar?: (charId: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
  /** A character's name (the Miracle's cut-in calls the devoted by it). */
  nameOfChar?: (charId: string | null | undefined) => string | undefined;
  /** Can the viewer see this tile (fog)? */
  visible?: (key: string) => boolean;
  /** A skipped cut-in moves the effects queue up by ms (fx/play.ts hurryFx). */
  hurry?: (ms: number) => void;
}

/** A white mark (a patron's emblem or a prayer icon) at a point: scaled in, held, faded. */
function mark(src: string, p: Pt, size: number, ms: number, o: { delay?: number; from?: number; to?: number; glow?: string; opacity?: number } = {}) {
  const run = () => {
    const img = document.createElement('img'); img.src = src; img.alt = ''; img.style.cssText = 'width:100%;height:100%;display:block' + (o.glow ? ';filter:drop-shadow(0 0 6px ' + o.glow + ') drop-shadow(0 0 14px ' + o.glow + ')' : '');
    const box = put(img, p, size, size, ms); box.style.zIndex = '4';
    const rm = reducedMotion(), op = o.opacity ?? 1;
    anim(box, rm ? [{ opacity: 0 }, { opacity: op, offset: 0.2 }, { opacity: op, offset: 0.75 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'scale(' + (o.from ?? 0.6) + ')' }, { opacity: op, transform: 'scale(1)', offset: 0.25 }, { opacity: op, transform: 'scale(1)', offset: 0.7 }, { opacity: 0, transform: 'scale(' + (o.to ?? 1.15) + ')' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)' });
  };
  if (o.delay) after(run, o.delay); else run();
}
/** Rays of light falling onto a point, in a colour (particles only). */
function rays(p: Pt, color: string, n: number, ms: number, delay = 0) {
  if (reducedMotion()) return;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI - Math.PI, len = p.s * (1.6 + (i % 2) * 0.6);
    after(() => {
      const d = document.createElement('div');
      d.style.cssText = 'width:100%;height:100%;background:linear-gradient(to top,' + color + ',rgba(255,255,255,0));border-radius:2px;mix-blend-mode:screen';
      const box = put(d, { x: p.x + Math.cos(a) * p.s * 0.15, y: p.y - len / 2 }, Math.max(3, p.s * 0.08), len, ms);
      box.style.transformOrigin = '50% 100%';
      anim(box, [{ opacity: 0, transform: 'scaleY(.2)' }, { opacity: 0.9, transform: 'scaleY(1)', offset: 0.3 }, { opacity: 0 }], { duration: ms, easing: 'ease-out' });
    }, delay + i * 40);
  }
}

/** How long the Hymn's face stays over a head (spec 2.2: about 1.5 s); a miss greys and goes sooner. */
export const FACE_MS = 1500, FACE_MISS_MS = 1100;
/** The face over a head, so Witnessed's eye waits for it (they sit in the same place): unit → when it goes. */
const faceUntil = new Map<string, number>();
/** Where something sits over a token's head: the centre for a box of height h above the token (kept on screen). */
function overHead(p: Pt, h: number, gap = 6): Pt {
  const y = p.y - p.s * 0.5 - gap - h / 2;
  return { x: p.x, y: Math.max(h / 2 + 4, y), s: p.s };
}
/** A Hymn (Faith 2.2, spec 2.2): a square crop of the patron's portrait (the face or the mask: faithArt.ts PORTRAIT_FACE)
 *  over the praying character's head, framed in the patron's accent, about 1.5 s. On a miss it greys and fades. Where
 *  the patron has no painting, its mark sits in the frame. */
export function faceOverHead(patron: string, p: Pt, o: { accent: string; miss?: boolean; unit?: string | null }): HTMLElement {
  const f = patronFace(patron), sz = Math.round(Math.max(40, Math.min(88, p.s * 1.25))), ms = o.miss ? FACE_MISS_MS : FACE_MS;
  const frame = document.createElement('div');
  frame.setAttribute('data-phc-faith-face', patron || '');
  if (o.miss) frame.setAttribute('data-phc-faith-miss', '1');
  frame.style.cssText = 'position:relative;width:100%;height:100%;overflow:hidden;border-radius:7px;background:#05070B;box-sizing:border-box;border:2px solid ' + o.accent
    + ';box-shadow:0 0 0 1px rgba(0,0,0,.65),0 0 10px ' + o.accent + ',0 0 26px ' + o.accent + '88';
  const img = document.createElement('img'); img.src = f.src; img.alt = ''; img.style.cssText = f.imgStyle.replace(/; /g, ';'); frame.appendChild(img);
  const box = put(frame, overHead(p, sz), sz, sz, ms); box.style.zIndex = '5';
  if (o.unit) faceUntil.set(o.unit, Date.now() + ms);
  const rm = reducedMotion();
  if (o.miss) {
    // It answers nothing: the face goes grey and dim as it fades.
    anim(box, rm ? [{ opacity: 0 }, { opacity: 1, offset: 0.15, filter: 'none' }, { opacity: 0.85, offset: 0.45, filter: 'grayscale(1) brightness(.55)' }, { opacity: 0, filter: 'grayscale(1) brightness(.5)' }]
      : [{ opacity: 0, transform: 'translateY(6px) scale(.8)', filter: 'none' }, { opacity: 1, transform: 'translateY(0) scale(1)', filter: 'none', offset: 0.18 },
        { opacity: 0.85, transform: 'translateY(1px) scale(.98)', filter: 'grayscale(1) brightness(.55)', offset: 0.45 }, { opacity: 0, transform: 'translateY(8px) scale(.94)', filter: 'grayscale(1) brightness(.45)' }], { duration: ms, easing: 'ease-out', fill: 'forwards' });
  } else {
    anim(box, rm ? [{ opacity: 0 }, { opacity: 1, offset: 0.15 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }]
      : [{ opacity: 0, transform: 'translateY(10px) scale(.7)' }, { opacity: 1, transform: 'translateY(0) scale(1.04)', offset: 0.16 }, { opacity: 1, transform: 'translateY(-2px) scale(1)', offset: 0.3 },
        { opacity: 1, transform: 'translateY(-4px) scale(1)', offset: 0.8 }, { opacity: 0, transform: 'translateY(-10px) scale(1.03)' }], { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
    if (!rm) burst('glow', overHead(p, sz), sz * 1.9, 700, { color: o.accent, blend: 'screen', from: 0.5, to: 1.1 });
  }
  return frame;
}
/** A Whisper (spec 2.1): the Whisper's own prayer icon rises over the praying character's head, lit gold (no portrait);
 *  on a miss it rises grey and sinks back. */
export function whisperOverHead(id: string, p: Pt, o: { miss?: boolean } = {}): HTMLElement {
  const sz = Math.round(Math.max(26, Math.min(56, p.s * 0.7))), ms = o.miss ? 900 : 1200, rise = Math.max(8, p.s * 0.35);
  const img = document.createElement('img'); img.src = prayerIconUri('whisper', id); img.alt = '';
  img.setAttribute('data-phc-faith-whisper', id || '');
  if (o.miss) img.setAttribute('data-phc-faith-miss', '1');
  img.style.cssText = 'width:100%;height:100%;display:block;' + (o.miss ? 'filter:grayscale(1) brightness(.6)' : 'filter:drop-shadow(0 0 5px ' + FAITH_GOLD + ') drop-shadow(0 0 12px ' + FAITH_GOLD + ')');
  const box = put(img, overHead(p, sz, 4), sz, sz, ms); box.style.zIndex = '5';
  anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: o.miss ? 0.6 : 1, offset: 0.2 }, { opacity: o.miss ? 0.6 : 1, offset: 0.75 }, { opacity: 0 }]
    : o.miss ? [{ opacity: 0, transform: 'translateY(' + rise * 0.6 + 'px)' }, { opacity: 0.6, transform: 'translateY(0)', offset: 0.35 }, { opacity: 0, transform: 'translateY(' + rise * 0.5 + 'px)' }]
    : [{ opacity: 0, transform: 'translateY(' + rise + 'px) scale(.7)' }, { opacity: 1, transform: 'translateY(0) scale(1)', offset: 0.3 }, { opacity: 1, transform: 'translateY(-' + rise * 0.3 + 'px) scale(1)', offset: 0.75 }, { opacity: 0, transform: 'translateY(-' + rise * 0.6 + 'px) scale(1.05)' }],
    { duration: ms, easing: 'cubic-bezier(.2,.8,.2,1)', fill: 'forwards' });
  return img;
}

/** A Devotion event's float (rules 1.6.1: the delta is XP): "+1 DEVOTION XP · HEAL", "−3 DEVOTION XP". */
export function devotionWord(e: { delta?: number; tag?: string }): string {
  const d = Number(e.delta) || 0;
  return (d > 0 ? '+' : '−') + Math.abs(d) + ' DEVOTION XP' + (e.tag ? ' · ' + String(e.tag).toUpperCase() : '');
}

export function faithHandlers(K: FaithKit): Record<string, (e: FxEvent) => void> {
  const { at, posOf, play } = K;
  // In the story the events name characters (the area map's tokens are theirs): a unit's tile, else the character's.
  const posAny = (id: string | null | undefined) => posOf(id) || (K.posOfChar ? K.posOfChar(id) : undefined);
  const where = (e: any) => at(e.at || posAny(e.unit) || posAny(e.target));
  const targetAt = (e: any) => at(e.targetAt || posAny(e.target) || e.at);
  /** The one who prays: their own tile (where the icon or the face goes over the head). */
  const prayerAt = (e: any) => at(e.at || posAny(e.unit));
  const charAt = (e: any) => at(e.at || (K.posOfChar ? K.posOfChar(e.char) : null));
  return {
    // Whisper (spec 2.1): a soft chime, the Whisper's icon rising over the head of the one who prays, a small gold ray
    // where it lands. Hymn (spec 2.2): a choir swell, the patron's face over the head of the one who prays, framed in the
    // accent; rays and a ring in the accent where the Hymn lands.
    prayer(e: any) {
      const p = targetAt(e), from = prayerAt(e) || p, acc = accentOf(e.patron, e.accent);
      if (e.kind === 'whisper') {
        play('crystal', from || p, { rate: 1.8, gain: 0.45 });
        if (from) { whisperOverHead(e.id, from); rays(from, FAITH_GOLD, 3, 520); }
        if (p && p !== from && (!from || p.x !== from.x || p.y !== from.y) && !reducedMotion()) burst('glow', p, p.s * 1.1, 600, { color: FAITH_GOLD, blend: 'screen', delay: 200 });
        return;
      }
      if (e.kind === 'miracle') return; // the 'miracle' event plays it
      play('soul_choir' as Sfx, from || p, { rate: 1.1, gain: 0.7 });
      if (from) faceOverHead(e.patron || '', from, { accent: acc, unit: e.unit });
      if (p) {
        rays(p, acc, 7, 900, 120);
        if (!reducedMotion()) ring(p, acc, 900, { from: 0.4, to: 1.5, width: 3, delay: 150 });
      }
    },
    // A failed prayer: silence. A Hymn's face greys and fades over the head; a Whisper's icon sinks back; a Miracle's
    // mark fades.
    prayer_fail(e: any) {
      const p = prayerAt(e) || where(e); if (!p) return;
      if (e.kind === 'hymn') faceOverHead(e.patron || '', p, { accent: accentOf(e.patron, e.accent), miss: true, unit: e.unit });
      else if (e.kind === 'whisper') whisperOverHead(e.id, p, { miss: true });
      else mark(patronMarkUri(e.patron || ''), { ...p, y: p.y - p.s * 0.8 }, p.s * 0.7, 900, { opacity: 0.45, from: 1, to: 0.8 });
      // The word rises from below the token, so it never covers the greyed face or icon over the head.
      floatText(e.kind === 'hymn' && (e.why === 'overreach' || e.overreach) ? 'REFUSED' : 'UNANSWERED', e.kind === 'miracle' ? p : { ...p, y: p.y + p.s * 0.75 }, '#A3AEC2', { small: true, delay: 200 });
    },
    // Witnessed: an eye opening above the caster.
    witnessed(e: any) {
      const p = where(e); if (!p) return;
      // The Hymn's face is over the same head: the eye opens as it goes.
      const wait = Math.max(0, Math.min(1200, (faceUntil.get(e.unit) || 0) - Date.now() - 250));
      play('crystal', p, { rate: 1.2, gain: 0.35, delay: wait });
      mark(witnessedUri(), { ...p, y: p.y - p.s * 0.95 }, p.s * 0.75, 1500, { glow: accentOf(e.patron, e.accent), from: 0.2, to: 1, delay: wait });
      // The word itself is the engine's condition float (play.ts cond): only the eye here, so it never reads twice.
    },
    // Intervention (rules 1.6.3): routed to the cut-in module, which today plays the bell, the mark and the words; the
    // small cut-in is the trigger left for later (docs/design/faith-presence-spec.md section 3, filled in there).
    intervention(e: any) { playIntervention(e, { at, posOf, play, mark }); },
    // Devotion (rules 1.6.1): the XP as a float in Virtue ink, with a small gold mark; a level change says the new level.
    devotion(e: any) {
      const p = charAt(e); if (!p) return;
      const d = Number(e.delta) || 0, word = devotionWord(e);
      // A pact names the patron; the XP float only when the XP moved (a switch can keep it, or take some: item 719).
      if (e.pact) floatText('PACT · ' + String(FAITH_PATRON[e.pact]?.name || e.pact).toUpperCase(), { ...p, y: p.y + p.s * 0.45 }, FAITH_INK, { small: true, delay: 250 });
      if (d) floatText(word, { ...p, y: p.y + p.s * (e.pact ? 0.9 : 0.45) }, FAITH_INK, { small: true, delay: 250 }); // below and after Witnessed's word, which often comes with it
      mark(patronMarkUri(e.patron || ''), { x: p.x - p.s * 0.55, y: p.y - p.s * 0.55, s: p.s }, p.s * 0.35, 1100, { glow: FAITH_GOLD, opacity: d > 0 ? 1 : 0.5 });
      if (e.level != null) {
        floatText('DEVOTION ' + e.level, { ...p, y: p.y - p.s * 0.75 }, FAITH_INK, { delay: 650 }); // well above the XP float, which rises into the space below
        if (Number(e.level) > Number(e.was ?? -1) && !reducedMotion()) burst('glow', p, p.s * 1.3, 700, { color: FAITH_GOLD, blend: 'screen' });
      }
    },
    // Leaving a patron for another (item 712): the old patron's mark, lit if they let you go, dim if they don't.
    leave(e: any) {
      const p = charAt(e); play('crystal', p, { rate: e.letGo ? 0.8 : 0.55, gain: 0.35 }); if (!p) return;
      const name = String(FAITH_PATRON[e.patron]?.name || e.patron || 'your patron').toUpperCase();
      mark(patronMarkUri(e.patron || ''), { ...p, y: p.y - p.s * 0.8 }, p.s * 0.7, 1100, e.letGo ? { glow: accentOf(e.patron, e.accent), from: 1, to: 1.3 } : { opacity: 0.45, from: 1, to: 0.8 });
      floatText((e.letGo ? 'LET GO · ' : 'HELD · ') + name, p, e.letGo ? FAITH_INK : '#A3AEC2', { small: true, delay: 150 });
    },
    // A grudge (item 713): set on a switch, and at each fight's start on the unit. A low bell and the word in red.
    grudge(e: any) {
      const p = at(e.at || posOf(e.unit) || (K.posOfChar ? K.posOfChar(e.char) : null)); play('hit_metal', p, { rate: 0.6, gain: 0.4 }); if (!p) return;
      const name = String(FAITH_PATRON[e.patron]?.name || e.patron || 'a patron').toUpperCase();
      mark(patronMarkUri(e.patron || ''), { ...p, y: p.y - p.s * 0.8 }, p.s * 0.6, 1000, { opacity: 0.5, from: 1.2, to: 0.9 });
      floatText('GRUDGE · ' + name, { ...p, y: p.y - p.s * 0.6 }, '#F65157', { small: true, delay: 150 }); // above the condition's own float, which lands on the same tile
    },
    // A vow: sworn (a seal stamped), kept (it lights), broken (it cracks and falls).
    vow(e: any) {
      const p = where(e); if (!p) return;
      const icon = vowIconUri(e.id || 'shield');
      if (e.state === 'broken') { play('hit_metal', p, { rate: 0.7, gain: 0.45 }); mark(icon, { ...p, y: p.y - p.s * 0.8 }, p.s * 0.6, 1000, { opacity: 0.6, from: 1, to: 0.6 }); floatText('VOW BROKEN', p, '#A3AEC2', { small: true, delay: 150 }); return; }
      play('crystal', p, { rate: e.state === 'kept' ? 1.5 : 1, gain: 0.35 });
      mark(icon, { ...p, y: p.y - p.s * 0.8 }, p.s * 0.6, 1100, { glow: e.state === 'kept' ? FAITH_GOLD : undefined });
      floatText(e.state === 'kept' ? 'VOW KEPT' : 'VOW SWORN', p, FAITH_INK, { small: true, delay: 150 });
    },
    // The patron speaks: the screens draw the line as a card in the log; on the map, only a glint over the one it is for.
    patron_line(e: any) { const p = at(e.at || posOf(e.unit)); if (p && !reducedMotion()) burst('glow', { ...p, y: p.y - p.s * 0.8 }, p.s * 0.6, 500, { color: accentOf(e.patron, e.accent), blend: 'screen' }); },
    // A Miracle (Faith 2.2, spec 2.3): the cut-in over the whole screen (everyone sees it: it is this fx event), the
    // god calling the devoted by name; the view lands on the spot and the answer pours onto its area (the queue's next
    // events are the Miracle's own effects, which play as it lands); then the box of what it did.
    miracle(e: any) {
      const o = miracleCutIn(e, { nameOf: K.nameOfChar, visible: (k) => (K.visible ? K.visible(k) : !!at(k)), posOfChar: K.posOfChar }), acc = o.accent;
      const area: string[] = Array.isArray(e.area) && e.area.length ? e.area : o.focus && o.focus !== 'map' ? [o.focus] : [];
      showCutIn({
        ...o, onSkip: K.hurry,
        onLand: () => {
          const fp = o.focus && o.focus !== 'map' ? at(o.focus) : null;
          play('feel_residue_holy' as Sfx, fp, { rate: 0.9, gain: 0.8 });
          if (fp && !reducedMotion()) ring(fp, acc, 900, { from: 0.3, to: 2.2, width: 4 });
          area.slice(0, 25).forEach((k, i) => { const q = at(k); if (q) after(() => { rays(q, acc, 3, 700); if (!reducedMotion()) burst('glow', q, q.s * 1.3, 700, { color: acc, blend: 'screen' }); }, i * 25); });
        },
      });
    },
  };
}

/** The old name for the Miracle's full-screen answer (Blessing 2.0): now the cut-in (game/cutIn.ts). */
export function miracleOverlay(o: { patron: string; name?: string; line?: string; accent: string; who?: string }): HTMLElement | null {
  const h = showCutIn({ ...miracleCutIn({ patron: o.patron, name: o.name, line: o.line, accent: o.accent }, { nameOf: () => o.who }), focus: null });
  return h ? h.el : null;
}
/** How long each faith event holds the effects queue (a Miracle waits out its full-screen answer). */
export function faithBeat(e: FxEvent): number | undefined {
  const x: any = e;
  switch (e.k) {
    case 'prayer': return x.kind === 'whisper' ? 480 : x.kind === 'hymn' ? 900 : 300;
    case 'miracle': return cutInTiming('full').land; // its effects play as the cut-in lands
    case 'prayer_fail': return 600;
    case 'witnessed': case 'intervention': return 650;
    case 'devotion': return x.level != null ? 800 : 450;
    case 'vow': return 450;
    case 'leave': case 'grudge': return 600;
    case 'patron_line': return 200;
    default: return undefined;
  }
}
