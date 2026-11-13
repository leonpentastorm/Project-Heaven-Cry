// Physical 2.0 (rules 1.12): Pressure, the ranged meter. It sits on the target (0 to 4): Pressed at 2, Suppressed at 3,
// Broken at 4 (enemies only). The meter's own arithmetic lives here; what raises and lowers it by the rules (a first
// ranged hit, a kill nearby, the end of a turn) is in rules.ts, and techniques add through core's addPressure().
import { say, type Combat, type Unit, emitFx, alive, coverOf, coverTileFor, unitSees, xy, key } from '../combat';
import { isSilent } from '../tactics';
import { PHYS_RULES } from './data';
import { foesOf } from '../kit';
import { setResSetter } from '../effects/cost';
import { addReactBlock } from '../tactics';

export type PressState = '' | 'pressed' | 'suppressed' | 'broken';
const P = () => PHYS_RULES.pressure;
export const pressureOf = (u: Unit | null | undefined): number => (u as any)?.pressure || 0;
/** Where a unit's Pressure stops: players at 3 (never Broken), elites at 3, bosses at 2 (Pressed, never Suppressed). */
export function pressureCap(u: Unit): number {
  const p = P();
  return u.side === 'pc' ? p.player_max : u.tier === 'boss' ? p.boss_max : u.tier === 'elite' ? p.elite_max : p.max;
}
export function pressureState(u: Unit | null | undefined): PressState {
  const n = pressureOf(u), p = P();
  return n >= p.broken ? 'broken' : n >= p.suppressed ? 'suppressed' : n >= p.pressed ? 'pressed' : '';
}
export const isPressed = (u: Unit | null | undefined): boolean => pressureOf(u) >= P().pressed;
export const isSuppressed = (u: Unit | null | undefined): boolean => pressureOf(u) >= P().suppressed;
export const wasSuppressedAt = (_target: Unit, before: number): boolean => before >= P().suppressed;

/** What may change Pressure as it is added (Guard, a Defender's wall: the lead's and the melee lane's handlers). Each is
 * given the amount and returns the amount that still lands on the target. */
type PressFilter = (cb: Combat, target: Unit, n: number, by: Unit | null, why: string) => number;
const FILTERS: PressFilter[] = [];
export const pressureFilter = (f: PressFilter) => { FILTERS.push(f); };
/** What happens when a unit's state changes (a held Watch ends at Pressed): rules.ts and watch.ts listen. */
type StateListener = (cb: Combat, u: Unit, was: PressState, now: PressState) => void;
const LISTENERS: StateListener[] = [];
export const onPressureState = (f: StateListener) => { LISTENERS.push(f); };

function set(cb: Combat, u: Unit, to: number, by: Unit | null, why: string, hidden: boolean) {
  const was = pressureOf(u), s0 = pressureState(u);
  if (to === was) return;
  (u as any).pressure = to; if (!to) { delete (u as any).pressure; delete (u as any).pressBy; delete (u as any).pressHidden; }
  if (to > was) {
    if (by) ((u as any).pressBy ||= {})[by.id] = why;
    // A Silent weapon's pips are hidden from the target until it is used on them (a Take shows them).
    if (hidden) (u as any).pressHidden = Math.min(to, ((u as any).pressHidden || 0) + (to - was));
  } else if ((u as any).pressHidden) (u as any).pressHidden = Math.min(to, (u as any).pressHidden);
  const s1 = pressureState(u);
  // hidden pips: the event goes to the shooter's side only (viewFor drops an event marked `only` for the other side)
  emitFx(cb, 'pressure', { unit: u.id, at: u.pos, now: to, was, state: s1, by: by?.id || null, why, ...(hidden && by ? { hidden: true, only: by.side } : {}) });
  if (s1 !== s0) {
    if (to > was && s1) say(cb, u.name + ' is ' + s1[0].toUpperCase() + s1.slice(1) + (by ? ' (' + by.name + ': ' + why + ')' : '') + '.');
    for (const f of LISTENERS) f(cb, u, s0, s1);
  }
}
/** Add Pressure to a unit. Returns what landed (0 at the cap, on the dead, or on the adder's own side). */
export function addPressureTo(cb: Combat, target: Unit, n: number, by: Unit | null, why: string, opts: { hidden?: boolean } = {}): number {
  if (n <= 0 || !alive(target) || (by && by.side === target.side)) return 0;
  let left = n; for (const f of FILTERS) { left = f(cb, target, left, by, why); if (left <= 0) return 0; }
  const was = pressureOf(target), to = Math.min(pressureCap(target), was + left);
  set(cb, target, to, by, why, !!opts.hidden);
  return to - was;
}
/** Lower a unit's Pressure (a Take, the end of a turn, a melee hit of its own). Using Pressure shows hidden pips. */
export function lowerPressureOf(cb: Combat, target: Unit, n: number, why: string, by: Unit | null = null): number {
  const was = pressureOf(target); if (n <= 0 || !was) return 0;
  set(cb, target, Math.max(0, was - n), by, why, false);
  return was - pressureOf(target);
}
/** Show a unit's hidden pips (a Take on it, the shooter revealed). */
export function showPressure(cb: Combat, target: Unit): void {
  if (!(target as any).pressHidden) return;
  delete (target as any).pressHidden; emitFx(cb, 'pressure', { unit: target.id, at: target.pos, now: pressureOf(target), was: pressureOf(target), state: pressureState(target), by: null, why: 'shown' });
}

// ---------- what a ranged hit gives ----------
/** Is this unit standing against cover (a cover tile within 1)? */
export function atCover(cb: Combat, u: Unit): boolean {
  const cov = coverOf(cb), [x, y] = xy(u.pos);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && (cov[key(x + dx, y + dy)] || cb.map.cover.includes(key(x + dx, y + dy)))) return true;
  return false;
}
/** A shot that goes past the cover its target is using (the target stands against cover, and it doesn't face this shot). */
export const flanksCover = (cb: Combat, att: Unit, tgt: Unit): boolean => atCover(cb, tgt) && !coverTileFor(cb, att.pos, tgt.pos);
/** In cover and out of every enemy's sight. */
export const coveredUnseen = (cb: Combat, u: Unit): boolean => atCover(cb, u) && !foesOf(cb, u).some((v) => unitSees(cb, v, u.pos));

/** The Pressure the first ranged hit of a turn gives this target from this shooter, as things stand: 1; 1 more past
 * cover the target is using; 2 in place of 1, hidden, for an unseen hit with a Silent weapon. The rule and the card
 * both read it here. */
export function hitPressure(cb: Combat, att: Unit, tgt: Unit): { n: number; hidden: boolean; why: string } {
  const unseen = !!att.hidden && isSilent(att); // the Silent property, or a suppressor fitted
  let n = unseen ? P().unseen_silent_hit : 1, why = unseen ? 'an unseen hit' : 'a hit';
  if (flanksCover(cb, att, tgt)) { n += P().flank_bonus; why += ' past its cover'; }
  return { n, hidden: unseen, why };
}

// The resource row `pressure` (data/actions.json resources; Classes 3.0 batch row): the item op `resource` gives
// Pressure through the meter's own door (its cap, its filters, its state words), and takes it through lowerPressureOf.
setResSetter('pressure', (cb, u, n, by, why) => (!cb ? 0 : n >= 0 ? addPressureTo(cb, u, n, by, why || 'an item') : -lowerPressureOf(cb, u, -n, why || 'an item')));
// Rules 1.28: Pressure's Suppressed state forbids attacking and moving reactions, never protective ones (one rule with
// the condition Suppressed: tactics.ts reactBlocked).
addReactBlock((u, kind) => (kind !== 'protect' && isSuppressed(u) ? 'Suppressed' : null));
