// The AP perks' cooldown (rules 1.14, "The engine takes everything it can, first step"; spec items 1102 to 1105).
// A perk or trait that gives AP on a condition gives it at most once every AP_COOLDOWN_TURNS of its holder's turns in a
// fight: after its AP lands on one of the holder's turns, it gives none on the next two. A penalty side of the same
// item ('pen') has the same limit, counted by itself. PROVISIONAL (data/perks.json rules.ap_cooldown).
//
// A holder has one turn a round, so the count is kept in rounds: what is stored is the round in which the AP last
// landed (a 'cooldown' cell of effects/uses.ts, on the unit, so every fight starts with every cooldown ready). AP given on the holder's
// own turn lands now; AP banked for the next turn lands in the round that turn comes in.
// The area map is not covered (its items keep their own once-a-round limits).
import '../datatext'; // fills the texts' {=placeholders} before any data is read
import perksJ from '../../../../data/perks.json';
import { uses, type Holder } from '../effects';
import type { Combat, Unit } from '../combat';
import { overworld } from '../kit';

export const AP_COOLDOWN_TURNS: number = (perksJ as any).rules?.ap_cooldown?.turns ?? 3;
export type CdSide = 'gain' | 'pen';

const ownTurn = (cb: Combat, u: Unit) => cb.order[cb.turn] === u.id && !cb.window;
/** The round in which AP given to u right now lands: this round on its own turn, else the round its next turn starts in. */
export function landsNow(cb: Combat, u: Unit): number { return ownTurn(cb, u) ? cb.round : landsNext(cb, u); }
/** The round u's next turn starts in: this round when its turn is still to come, else the next. */
export function landsNext(cb: Combat, u: Unit): number { const i = cb.order.indexOf(u.id); return i > cb.turn ? cb.round : cb.round + 1; }

const keyOf = (h: Holder, side: CdSide) => h.key + '#ap-' + side;
/** Holder turns to wait before AP landing in round `land` is allowed again: 0 when it is ready. */
export function cdLeft(h: Holder, side: CdSide, land: number): number {
  return !h.u || !h.cb || overworld(h.cb) ? 0 : uses(h).coolLeft(AP_COOLDOWN_TURNS, keyOf(h, side), land);
}
/** Fire the item's AP (or its penalty) to land in round `land`: false, and nothing is stamped, while it is on cooldown.
 *  Outside a fight (the area map, the story) there is no cooldown: always true. */
export function cdFire(h: Holder, side: CdSide, land: number): boolean {
  if (!h.u || !h.cb || overworld(h.cb)) return true;
  return uses(h).cool(AP_COOLDOWN_TURNS, keyOf(h, side), land);
}
/** At the start of the holder's own turn: one log line while the bonus is cooling down, so the perk card's live line
 *  (which reads the fight's log) says when it is ready again. Call it from the item's turn_start_pre for its holder. */
export function cdTick(h: Holder) {
  const cb = h.cb, u = h.u; if (!cb || !u || overworld(cb)) return;
  const last = uses(h).cooledAt(keyOf(h, 'gain')); if (last == null || cb.round <= last) return;
  const left = last + AP_COOLDOWN_TURNS - cb.round; if (left <= 0) return;
  cb.log.push(u.name + ': ' + h.info.name + ' is cooling down. Ready again ' + (left === 1 ? 'next turn' : 'in ' + left + ' turns') + '.');
}
