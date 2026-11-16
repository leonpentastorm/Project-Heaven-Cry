// The forks a character holds at a door, as one line (rules 1.60): kept apart from game/forkView.ts so the meter cards
// (game/resources.ts) read it without the store. The engine's doorForkView is the one source.
import { doorForkView } from '@engine';

/** The forks a character holds at a door, as one line of chips' words for a tab header or a meter card: "Forks:
 *  Provoke · Stand Fast", with "1 fork still to do" when a pick is open; '' when it holds none and none is open. */
export function forkChipsLine(c: any, door: string): string {
  const v = c ? doorForkView(c, door) : null; if (!v) return '';
  const held = v.picked.map((p) => p.name), open = v.pending;
  if (!held.length && !open) return '';
  return (held.length ? 'Forks: ' + held.join(' · ') : '') + (open ? (held.length ? ' · ' : '') + open + ' fork' + (open > 1 ? 's' : '') + ' still to do (out of a fight)' : '');
}

