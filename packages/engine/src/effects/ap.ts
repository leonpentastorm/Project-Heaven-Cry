// The AP economy (plan 2.6; spec: Skills, traits and perks in play). A turn's AP is clamp(2, 9, 6 + perk AP − Stunned −
// Dazed), then any debt (On My Mark) comes off after the floor, at most 4. Perk AP gained in one turn is capped at +3
// in all (banked AP from earlier, turn-start grants and mid-turn gifts together), and a turn's total never passes 9.
// Out-of-turn pools (Supreme Command, Between Heartbeats, a window's AP) are not perk AP: they don't count.
import perksJ from '../../../../data/perks.json';
import type { Combat, Unit } from '../combat';
import { emit } from './hooks';
import { condMods } from '../condtable';

const CEIL = (perksJ as any).rules?.ap_ceiling || {};
export const AP_BASE = 6;
export const AP_MAX: number = CEIL.turn_max ?? 9;
export const AP_MIN: number = CEIL.turn_min ?? 2;
export const PERK_AP_CAP: number = CEIL.perk_gain_max_per_turn ?? 3;
export const AP_DEBT_CAP = 4;

export interface ApLine { n: number; why: string }
/** The AP a unit starts its turn with. grants and penalties come from the turn_start_pre hook; banked AP (bankAp) and
 * debt are read off the unit and cleared. Returns the number and the log lines. */
export function turnAp(u: Unit, grants: ApLine[], penalties: ApLine[]): { ap: number; gained: number; lost: number; lines: string[] } {
  const stun = u.stunnedNext ? 1 : 0, daze = u.dazedNext ? -(condMods('dazed').ap || 0) : 0;
  const pos = [...(u.apNext ? [{ n: u.apNext, why: 'banked' }] : []), ...grants.filter((g) => g.n > 0)];
  const posSum = pos.reduce((t, g) => t + g.n, 0), gained = Math.min(PERK_AP_CAP, posSum);
  // Name It (a Call, rules 1.13): AP the unit would lose this turn is cancelled, up to the Call's number: penalties
  // first (Suppressed, Nausea, a Threaten), then Stunned's 1, Dazed's 2, then an AP debt. Used or not, it ends here.
  const cancel0 = u.call?.cancel?.n || 0; let cancel = cancel0;
  const keep = (n: number) => { const c = Math.min(cancel, n); cancel -= c; return n - c; };
  const neg = -keep(penalties.reduce((t, g) => t + Math.abs(g.n), 0)), stunL = keep(stun), dazeL = keep(daze);
  let ap = Math.max(AP_MIN, Math.min(AP_MAX, AP_BASE + gained + neg - stunL - dazeL));
  const debt = keep(Math.min(AP_DEBT_CAP, u.apDebt || 0)); ap = Math.max(0, ap - debt);
  const lines: string[] = [];
  if (cancel0 - cancel > 0) lines.push(u.name + ' keeps ' + (cancel0 - cancel) + ' AP it would have lost (Name It).');
  if (u.call?.cancel) delete u.call.cancel;
  if (posSum) lines.push(u.name + ' +' + gained + ' AP (' + pos.map((g) => g.why).join(', ') + ')' + (posSum > gained ? '; ' + (posSum - gained) + ' lost to the +' + PERK_AP_CAP + ' cap' : '') + '.');
  if (neg) lines.push(u.name + ' ' + neg + ' AP (' + penalties.map((g) => g.why).join(', ') + ').');
  if (debt) lines.push(u.name + ' pays back ' + debt + ' AP.');
  u.apNext = 0; u.apDebt = 0; u.apGained = gained; u.apTurnTotal = ap;
  return { ap, gained, lost: posSum - gained, lines };
}

/** Give perk AP now (on the unit's own turn), within the +3 cap and the turn's 9: returns what was given. Off the
 * unit's turn the AP is banked for its next turn instead (bankAp). */
export function grantPerkAp(cb: Combat | null, u: Unit, n: number, why: string, from?: Unit | null): number {
  if (n <= 0 || refusedGift(cb, u, n, from)) return 0;
  const mine = cb && cb.units.find((x) => x.id === cb.order[cb.turn]) === u && !cb.window;
  if (!mine) { bankAp(u, n, why, cb); return 0; } // already past the gift check
  const room = Math.max(0, Math.min(PERK_AP_CAP - (u.apGained || 0), AP_MAX - (u.apTurnTotal ?? u.ap)));
  const give = Math.min(n, room);
  u.ap += give; u.apGained = (u.apGained || 0) + give; u.apTurnTotal = (u.apTurnTotal ?? u.ap) + give;
  if (cb) cb.log.push(u.name + ' +' + give + ' AP (' + why + ')' + (give < n ? '; ' + (n - give) + ' lost to the cap' : '') + '.');
  return give;
}
/** AP for the unit's next turn (counted toward that turn's +3 cap). */
export function bankAp(u: Unit, n: number, why: string, cb?: Combat | null, from?: Unit | null) {
  if (n <= 0 || refusedGift(cb || null, u, n, from)) return;
  u.apNext = (u.apNext || 0) + n;
  if (cb) cb.log.push(u.name + ' banks ' + n + ' AP for next turn (' + why + ').');
}
/** Brief (a Call, rules 1.13): the AP the unit's next action costs less, as a loan the reducer makes before the action
 * and settles after it. It counts in the turn's +3 of gained AP and never takes the turn past 9; nothing in a window. */
export function briefCredit(u: Unit | null | undefined, cb?: Combat | null): number {
  const cut = u?.call?.brief?.cuts?.[0] || 0; if (!u || !cut || cb?.window) return 0;
  return Math.max(0, Math.min(cut, PERK_AP_CAP - (u.apGained || 0), AP_MAX - (u.apTurnTotal ?? u.ap)));
}
/** An AP gift from another unit (Hand-Off): 'ap_gift' {t, from, n, cb, cancel, why} lets the receiver's items refuse it
 * (Humanity First won't take AP from a non-human). The AP stays with the giver (the caller gives it back). */
export function refusedGift(cb: Combat | null, u: Unit, n: number, from?: Unit | null): boolean {
  if (!from || from === u || !cb) return false;
  const r: any = emit(cb, 'ap_gift', { t: u, from, n, cb, cancel: false, why: '' });
  if (r.cancel) { cb.log.push(u.name + ' won\'t take AP from ' + from.name + (r.why ? ' (' + r.why + ')' : '') + '.'); return true; }
  return false;
}
/** AP taken off the unit's next turn after the floor of 2 (On My Mark), at most 4. */
export function apDebt(u: Unit, n: number) { u.apDebt = Math.min(AP_DEBT_CAP, (u.apDebt || 0) + Math.max(0, n)); }
/** AP to add (or take) when the turn starts, from inside a turn_start_pre handler. */
export const pushAp = (ctx: { grants: ApLine[]; penalties: ApLine[] }, n: number, why: string) => (n >= 0 ? ctx.grants : ctx.penalties).push({ n, why });
