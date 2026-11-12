// Rules revision 1.20 (the heal and shield pass; spec: "Rules revision 1.20"; data/rules.json `mending`), as changed by
// rules 1.23 (the defence step; spec: "Rules revision 1.23").
//   mendFactor     healing and shields grow with the giver's level, by the level row of the enemy table's damage column:
//                  the number that raises what an enemy deals. One Soldier's turn then costs a character the same share
//                  of a heal at level 20 as at level 1. Rules 1.20: Sigil, the Outburst and prayer. Rules 1.23: the
//                  medic's kit too (a stim, Triage, Stim Throw, Rally, a Field Repair on an ally).
//   noteTended     rules 1.23: what a unit has healed and shielded for OTHERS in this fight, round by round. The enemy
//                  AI reads it (combat.ts enemyTargets): the enemies go for whoever mends the most.
// THE ROUND LIMIT of rules 1.20 (spells and prayers restored at most half of a creature's max HP a round) IS WITHDRAWN
// (Leon, 12 Nov 2026: "No round limit, just balance ap for healing accordingly"). Nothing caps a heal now but the
// target's max HP.
// Every number is provisional (spec section 14, items 1230 on and 1300 on).
import type { Combat, Unit } from '../combat';
import { RULES, enemyLevelRow } from '../data';

export const MENDING: any = (RULES as any).mending || {};
/** The level factor (×1.00 at level 1 … ×1.82 at level 20): enemies.json levels.table damage_mult. No level: ×1. */
export const mendFactor = (level: number | null | undefined): number => (level == null ? 1 : enemyLevelRow(level).damage_mult ?? 1);
/** The factor for what this unit gives: a character's and its side's units' (a companion, a turret: their own level,
 * which is their owner's). An enemy's is ×1: an enemy caster's spells already grow through its multipliers (rules 1.15). */
export const mendFactorOf = (u: Unit | null | undefined): number => (u && u.side === 'pc' ? mendFactor(u.level) : 1);

// ---------- rules 1.23: who has been mending (the enemy AI's healer weight) ----------
export const TENDING: any = MENDING.tending || {};
/** How many rounds back the count looks (this round and the ones before it). */
export const TEND_ROUNDS: number = TENDING.rounds ?? 2;
/** Under this share of the giver's own max HP, what it gave is not worth turning a gun for. (How hard each tier
 * turns on the healer is its `healer_focus` in enemies.json: combat.ts healerFocus.) */
export const TEND_NOTICE: number = TENDING.notice_share_of_max_hp ?? 0.1;
/** Note HP restored or a shield given by `by` to someone else of its side (never to itself: self-healing is not the
 * healer the squad leans on). Kept on the giver, round by round, for the fight. */
export function noteTended(cb: Combat | null, by: Unit | null | undefined, t: Unit, n: number) {
  if (!cb || !by || by === t || n <= 0 || by.side !== t.side || by.dead) return;
  const log = (((by as any).tended ||= []) as { r: number; n: number }[]), last = log[log.length - 1];
  if (last && last.r === cb.round) last.n += n; else log.push({ r: cb.round, n });
  while (log.length && log[0].r <= cb.round - TEND_ROUNDS - 1) log.shift();
}
/** What this unit healed and shielded for others in the last TEND_ROUNDS rounds (this one included). */
export function tendedLately(cb: Combat, u: Unit): number {
  const log = (u as any).tended as { r: number; n: number }[] | undefined; if (!log) return 0;
  let n = 0; for (const e of log) if (e.r > cb.round - TEND_ROUNDS) n += e.n; return n;
}

// ---------- rules 1.23: the medic's kit ----------
export const MEDIC: any = MENDING.medic || {};
/** Triage (2 AP), a stim and Stim Throw (1 AP), Rally (2 AP, each ally), a Field Repair on an ally (per point of
 * Improvisation): each × Healing given × the level factor of the giver. */
export const TRIAGE_HEAL: number = MEDIC.triage ?? 8;
export const STIM_HEAL: number = MEDIC.stim ?? 12;
export const RALLY_HEAL: number = MEDIC.rally ?? 5;
export const FIELD_REPAIR_HEAL: number = MEDIC.field_repair_per_point ?? 3;
