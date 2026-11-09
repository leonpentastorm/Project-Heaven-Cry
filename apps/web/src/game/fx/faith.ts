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
import { FAITH_GOLD, FAITH_INK, accentOf, patronMarkUri, witnessedUri, vowIconUri, prayerIconUri } from '../faithArt';
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

/** A Devotion event's float (rules 1.6.1: the delta is XP): "+1 DEVOTION XP · HEAL", "−3 DEVOTION XP". */
export function devotionWord(e: { delta?: number; tag?: string }): string {
  const d = Number(e.delta) || 0;
  return (d > 0 ? '+' : '−') + Math.abs(d) + ' DEVOTION XP' + (e.tag ? ' · ' + String(e.tag).toUpperCase() : '');
}

export function faithHandlers(K: FaithKit): Record<string, (e: FxEvent) => void> {
  const { at, posOf, play } = K;
  const where = (e: any) => at(e.at || posOf(e.unit) || posOf(e.target));
  const targetAt = (e: any) => at(e.targetAt || posOf(e.target) || e.at);
  const charAt = (e: any) => at(e.at || (K.posOfChar ? K.posOfChar(e.char) : null));
  return {
    // Whisper: a soft chime and a small gold ray. Hymn: a choir swell, the patron's mark as a halo over the target,
    // rays in the patron's accent.
    prayer(e: any) {
      const p = targetAt(e), from = where(e), acc = accentOf(e.patron, e.accent);
      if (e.kind === 'whisper') {
        play('crystal', p || from, { rate: 1.8, gain: 0.45 });
        if (p) { rays(p, FAITH_GOLD, 3, 520); mark(prayerIconUri('whisper', e.id), { ...p, y: p.y - p.s * 0.7 }, p.s * 0.6, 900, { glow: FAITH_GOLD }); }
        return;
      }
      if (e.kind === 'miracle') return; // the 'miracle' event plays it
      play('soul_choir' as Sfx, p || from, { rate: 1.1, gain: 0.7 });
      if (p) {
        mark(patronMarkUri(e.patron), { ...p, y: p.y - p.s * 0.85 }, p.s * 0.95, 1400, { glow: acc, from: 1.4, to: 1 });
        rays(p, acc, 7, 900, 120);
        if (!reducedMotion()) ring(p, acc, 900, { from: 0.4, to: 1.5, width: 3, delay: 150 });
      }
      if (from && from !== p && !reducedMotion()) burst('glow', from, from.s * 1.2, 500, { color: FAITH_GOLD, blend: 'screen' });
    },
    // A failed prayer: silence, and the mark fading where it was asked.
    prayer_fail(e: any) {
      const p = where(e); if (!p) return;
      mark(patronMarkUri(e.patron || ''), { ...p, y: p.y - p.s * 0.8 }, p.s * 0.7, 900, { opacity: 0.45, from: 1, to: 0.8 });
      floatText(e.kind === 'hymn' && e.overreach ? 'REFUSED' : 'UNANSWERED', p, '#A3AEC2', { small: true, delay: 200 });
    },
    // Witnessed: an eye opening above the caster.
    witnessed(e: any) {
      const p = where(e); if (!p) return;
      play('crystal', p, { rate: 1.2, gain: 0.35 });
      mark(witnessedUri(), { ...p, y: p.y - p.s * 0.95 }, p.s * 0.75, 1500, { glow: accentOf(e.patron, e.accent), from: 0.2, to: 1 });
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
