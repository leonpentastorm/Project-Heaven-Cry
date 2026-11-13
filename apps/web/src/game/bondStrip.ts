// The unit panel's pieces for Classes 3.0 (step 10): the Bond strip (bonds-spec.md section 9) and the reaction pips
// (reactions-spec.md section 9). Both read the engine's views (bondView, reactionView: packages/engine/src/screenViews.ts);
// nothing here works out a Bond, a cap or a reaction count. One fact, one place: the Bonds show only on this strip, and
// the Mender's Ledger is the bar at its end (its resource row is not repeated).
import { bondView, reactionView } from '@engine';

/** Insight's ink (the door), the hostile red, the state colours (docs/design/colour-system.md). */
export const INSIGHT_INK = '#EB95B7';
const RED = '#F65157', MUTED = '#A3AEC2', LINE = '#232D3F';

export interface LedgerLike { now?: number; max?: number; value: string; hint?: string }
const pct = (n: number, m: number) => (m > 0 ? Math.max(0, Math.min(100, Math.round((n / m) * 100))) : 0);

/** The Bond strip's values for the template, or { show: false }. face(unitId): the unit's portrait (the grid's own). */
export function bondStripVals(cb: any, u: any, c: any, face: (id: string) => string, ledger?: LedgerLike | null) {
  let v: ReturnType<typeof bondView> = null;
  try { v = cb && u ? bondView(cb, u, c) : null; } catch { v = null; }
  if (!v) return { show: false } as any;
  const chip = (x: any) => {
    const foe = x.side === 'foe', img = face(x.id);
    const conds = x.conds.slice(0, 2).join(' · ') + (x.conds.length > 2 ? ' +' + (x.conds.length - 2) : '');
    const echoT = x.echo > 0 ? x.echo + ' waiting through the Bond: it lands at the start of its next turn' : '';
    return { key: x.id, id: x.id, name: x.name, img, hasImg: !!img, noImg: !img, short: x.name.slice(0, 2).toUpperCase(), foe: foe ? 'true' : 'false',
      hp: x.downed ? 'DOWN' : x.hp + ' / ' + x.maxHp, conds, hasConds: !!conds, echo: x.echo > 0 ? '+' + x.echo : '', hasEcho: x.echo > 0, echoTip: echoT,
      rounds: x.rounds != null ? x.rounds + (x.rounds === 1 ? ' rd' : ' rds') : '', hasRounds: x.rounds != null,
      tip: x.name + (foe ? ' (enemy, Bonded)' : ' (ally, Bonded)') + ' · ' + (x.downed ? 'Downed' : x.hp + ' / ' + x.maxHp + ' HP') + (x.conds.length ? ' · ' + x.conds.join(', ') : '') + (echoT ? ' · ' + echoT : '') + (x.rounds != null ? ' · the Bond holds ' + x.rounds + ' more round' + (x.rounds === 1 ? '' : 's') : ''),
      imgStyle: 'width: 30px; height: 30px; object-fit: cover; background: #000; flex: none; ' + (foe ? 'border-radius: 5px; border: 2px solid ' + RED : 'border-radius: 50%; border: 2px solid ' + INSIGHT_INK),
      badgeStyle: 'display: grid; place-items: center; width: 30px; height: 30px; flex: none; font-size: 10px; font-weight: 700; border-radius: ' + (foe ? '5px' : '50%') + '; border: 2px solid ' + (foe ? RED : INSIGHT_INK) + '; color: ' + (foe ? RED : INSIGHT_INK),
      hpTrack: 'display: block; height: 4px; border-radius: 2px; background: #1C2536; overflow: hidden',
      hpFill: 'display: block; height: 100%; width: ' + pct(x.hp, x.maxHp) + '%; background: ' + RED };
  };
  const empties = Array.from({ length: v.open }, (_, i) => ({ key: 'e' + i }));
  const lg = ledger && typeof ledger.now === 'number' && typeof ledger.max === 'number' ? ledger : null;
  return {
    show: true, quiet: v.quiet || '', isQuiet: !!v.quiet, dim: v.focus === 'hand' ? 'false' : 'true',
    count: v.held + ' / ' + v.cap, aria: 'Your Bonds: ' + v.held + ' of ' + v.cap + (v.quiet ? '. ' + v.quiet : ''),
    allies: v.allies.map(chip), hasAllies: v.allies.length > 0, enemies: v.enemies.map(chip), hasEnemies: v.enemies.length > 0,
    hasBoth: v.allies.length > 0 && v.enemies.length > 0, empties, hasEmpty: empties.length > 0, none: v.held === 0,
    tip: 'Bonds (Empathy, with an Attuner in hand): allies above the line, enemies below. You hold ' + v.held + ' of ' + v.cap + '. Tending through a Bond reaches a Bonded ally anywhere you see; an enemy Bonded to you shares the damage you take and feels your care as a wound.',
    ledger: lg ? { value: lg.value, tip: lg.hint || 'The Ledger', fill: 'display: block; height: 100%; width: ' + pct(lg.now!, lg.max!) + '%; background: ' + INSIGHT_INK, track: 'display: block; flex: 1; height: 6px; border-radius: 3px; background: #1C2536; overflow: hidden' } : null,
    hasLedger: !!lg,
    style: 'display: flex; flex-direction: column; gap: 6px; padding: 8px 10px; border-radius: 10px; border: 1px solid ' + LINE + '; border-left: 3px solid ' + INSIGHT_INK + '; background: #0A0D13' + (v.quiet ? '; opacity: 0.7' : ''),
    emptyStyle: 'width: 30px; height: 30px; flex: none; box-sizing: border-box; border-radius: 50%; border: 1px dashed ' + MUTED,
  };
}

/** The reaction pips beside AP: white ready, grey spent (two for the Skirmisher's Reflex), with the Answers kept on. */
export function reactionPipsVals(cb: any, u: any, c: any) {
  let r: ReturnType<typeof reactionView> | null = null;
  try { r = cb && u ? reactionView(cb, u, c) : null; } catch { r = null; }
  if (!r || r.max <= 0) return { show: false, pips: [] as any[] } as any;
  const pips = Array.from({ length: r.max + (r.cue ? 1 : 0) }, (_, i) => ({ key: 'r' + i, on: i < r!.left + (r!.cue ? 1 : 0) ? 'true' : 'false',
    style: 'display: inline-block; width: 9px; height: 9px; border-radius: 50%; box-sizing: border-box; ' + (i < r!.left + (r!.cue ? 1 : 0) ? 'background: #FFFFFF' : 'border: 1px solid #5B6577') }));
  const answers = r.answers == null ? 'Every Answer you know is on.' : r.answers.length ? 'Answers on: ' + r.answers.join(', ') + '.' : 'Every Answer is switched off.';
  return { show: true, pips, value: r.left + ' / ' + r.max, label: r.max === 1 ? 'REACTION' : 'REACTIONS',
    aria: 'Reactions: ' + r.left + ' of ' + r.max + ' left this round' + (r.cue ? ', and one from a Cue' : ''),
    tip: 'Reactions this round: ' + r.left + ' of ' + r.max + ' left' + (r.cue ? ' (+1 from a Cue)' : '') + '. A reaction is made off your turn (an Answer, a held shot, an opportunity attack), and never triggers another. ' + answers };
}
