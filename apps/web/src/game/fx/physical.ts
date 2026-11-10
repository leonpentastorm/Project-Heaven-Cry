// Physical 2.0 (rules 1.12) as effects and sound: the engine sends technique, momentum, pressure, watch_set,
// watch_fire, stopped and drill (docs/design/handoffs/physical-2.0-PLAN.md, section 5.4). Kept short so a gunner's turn
// is no slower than before: a technique's own attack plays its usual shot or swing (those events follow it); this only
// names it over the unit, and gives a Finisher and a Take one stronger beat. Pressure ticks the token's pips and names
// Suppressed or Broken once; a held Watch rings its holder and fires with a crosshair; Stopped and drill marks get their
// word. Everything here is SVG and CSS (rings, words, a pulse), so no sourced asset is needed (CLAUDE.md, asset rule).
// Fog: every point comes through the kit's at() (null out of sight). Nothing here reads or changes the rules.
import type { FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { type Pt, after, anim, floatText, ring, shake } from './dom';

const WHITE = '#FFFFFF', AMBER = '#F2A54A', HP = '#F65157', MUTED = '#A3AEC2';
const STATE_WORD: Record<string, string> = { pressed: 'PRESSED', suppressed: 'SUPPRESSED', broken: 'BROKEN' };
const STOP_WORD: Record<string, string> = { pinned: 'PINNED', push: 'PUSHED', prone: 'KNOCKED DOWN', halt: 'HALTED' };

export interface PhysKit {
  at: (k: string | null | undefined) => Pt | null;
  tokOf: (id: string | null | undefined, fallback?: string) => HTMLElement | null;
  posOf: (id: string | null | undefined) => string | undefined;
  play: (s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }) => void;
  /** a technique's name by id (the engine's data) */
  nameOf: (id: string) => string;
}

/** The word each event floats (pure, for the tests): '' when it floats none. */
export function physWord(e: Partial<FxEvent> & { k: string }, name = ''): string {
  switch (e.k) {
    case 'technique': return (name || String(e.id || '')).toUpperCase();
    case 'momentum': return (e.now as number) > (e.was as number) ? 'MOMENTUM ' + e.now : '';
    case 'pressure': return (e.now as number) > (e.was as number) && (e.state === 'suppressed' || e.state === 'broken') ? STATE_WORD[e.state as string] : '';
    case 'watch_set': return 'HOLDING ' + (name || String(e.id || '')).toUpperCase();
    case 'watch_fire': return (name || String(e.id || '')).toUpperCase() + '!';
    case 'stopped': return String(e.how || '').split('+').map((h) => STOP_WORD[h] || h.toUpperCase()).join(' · ');
    case 'drill': return e.learned ? 'LEARNED · ' + (name || String(e.learned)).toUpperCase() : e.mark ? 'DRILL MARK ' + ['', 'I', 'II', 'III'][e.mark as number] : '+' + e.add + ' DRILL';
    default: return '';
  }
}
/** The stronger beat: a Finisher, a Take. */
export const isBigTechnique = (e: Partial<FxEvent>) => e.group === 'finisher' || e.group === 'take';
/** How long each holds the stage (ms at Fast), or undefined for an event that isn't one of these. Short on purpose. */
export function physBeat(e: FxEvent): number | undefined {
  switch (e.k) {
    case 'technique': return (e as any).refused ? 0 : isBigTechnique(e) ? 260 : 120;
    case 'momentum': return 0;
    case 'pressure': return (e as any).now > (e as any).was && ((e as any).state === 'suppressed' || (e as any).state === 'broken') ? 220 : 60;
    case 'watch_set': return 260;
    case 'watch_fire': return 200;
    case 'stopped': return 200;
    case 'drill': return 0;
    default: return undefined;
  }
}

export function physHandlers(K: PhysKit): Record<string, (e: FxEvent) => void> {
  const { at, tokOf, play, nameOf } = K;
  /** The units whose Suppressed or Broken was already named this fight (once each). */
  const named = new Map<string, string>();
  return {
    technique(e: any) {
      if (e.refused) return;
      const p = at(e.at); if (!p) return;
      const big = isBigTechnique(e), word = physWord(e, nameOf(e.id));
      floatText(word, { x: p.x, y: p.y - p.s * 0.55, s: p.s }, big ? WHITE : AMBER, { small: !big, ms: big ? 760 : 560 });
      if (big) { ring(p, e.group === 'take' ? HP : WHITE, 420, { from: 1.4, to: 0.8, width: 3 }); play(e.group === 'take' ? 'hit_metal' : 'hit_heavy', p, { rate: 0.85, gain: 0.45, delay: 60 }); }
    },
    momentum(e: any) {
      const w = physWord(e); if (!w) return;
      const p = at(K.posOf(e.unit)); if (!p) return;
      floatText(w, { x: p.x, y: p.y + p.s * 0.35, s: p.s }, AMBER, { small: true, ms: 480 });
    },
    pressure(e: any) {
      const pos = e.at || K.posOf(e.unit), p = at(pos); if (!p) return;
      // the token's pips tick (the tile redraws them; this is the pulse that says they moved)
      const tile = tokOf(e.unit, pos)?.closest('[data-tile], button.phc-tok, .phc-tok') as HTMLElement | null, pips = tile && tile.querySelector('[data-pressure-pips]');
      if (pips && !reducedMotion()) anim(pips, [{ transform: 'translateX(-50%) scale(1.5)' }, { transform: 'translateX(-50%) scale(1)' }], { duration: 260, easing: 'ease-out' });
      const w = physWord(e); if (!w || named.get(e.unit) === e.state) return;
      named.set(e.unit, e.state);
      floatText(w, { x: p.x, y: p.y - p.s * 0.75, s: p.s }, HP, { ms: 700 });
      if (e.state === 'broken') shake(tokOf(e.unit, pos), 0.5);
    },
    watch_set(e: any) {
      const p = at(e.at || K.posOf(e.unit)); if (!p) return;
      ring(p, WHITE, 520, { from: 1.6, to: 0.9, width: 2 });
      floatText(physWord(e, nameOf(e.id)), { x: p.x, y: p.y - p.s * 0.6, s: p.s }, WHITE, { small: true, ms: 640 });
      play('hit_metal', p, { rate: 1.6, gain: 0.3 });
    },
    watch_fire(e: any) {
      const p = at(e.from || K.posOf(e.unit)), q = at(e.at || K.posOf(e.target));
      if (q) { ring(q, HP, 360, { from: 1.5, to: 0.6, width: 3 }); after(() => ring(q, HP, 280, { from: 0.9, to: 0.4, width: 2 }), 90); }
      if (p) floatText(physWord(e, nameOf(e.id)), { x: p.x, y: p.y - p.s * 0.6, s: p.s }, HP, { small: true, ms: 560 });
    },
    stopped(e: any) {
      const pos = K.posOf(e.unit), p = at(pos); if (!p) return;
      floatText(physWord(e), { x: p.x, y: p.y - p.s * 0.6, s: p.s }, MUTED, { small: true, ms: 620 });
      shake(tokOf(e.unit, pos), 0.4);
    },
    drill(e: any) {
      const p = at(e.at || K.posOf(e.unit)); if (!p) return;
      floatText(physWord(e, e.learned ? nameOf(e.learned) : ''), { x: p.x, y: p.y + p.s * 0.45, s: p.s }, e.mark || e.learned ? WHITE : MUTED, { small: !(e.mark || e.learned), ms: e.mark || e.learned ? 900 : 520 });
    },
  };
}
