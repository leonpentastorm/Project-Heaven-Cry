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
import { levelFactor, levelOf, amountOf, term, type Term } from './output';

export const MENDING: any = (RULES as any).mending || {};
/** The level factor (×1.00 at level 1 … ×1.82 at level 20): enemies.json levels.table damage_mult. No level: ×1. */
/** It is the `mend` column of the one formula's Level term (effects/output.ts; data/rules.json output.level.mend). */
export const mendFactor = (level: number | null | undefined): number => levelFactor('mend', level);
/** The factor for what this unit gives: a character's and its side's units' (a companion, a turret: their own level,
 * which is their owner's). An enemy's is ×1: an enemy caster's spells already grow through its multipliers (rules 1.15). */
export const mendFactorOf = (u: Unit | null | undefined): number => (u && u.side === 'pc' ? mendFactor(u.level) : 1);
/** Rules 1.26 (the re-fit): the Level term on what a squad member deals (output.level.deal); ×1 for an enemy, whose level is in its tier. */
export const dealFactorOf = (u: Unit | null | undefined): number => (u && u.side === 'pc' ? levelFactor('deal', u.level) : 1);
/** Rules 1.26 (step b7, Leon: flat things grow with level): the Level term of a flat thing (a grenade, a blast, a
 * splash, a trap, a tick, a hazard, a barrel). Made by a character: its level through the 'flat' profile
 * (output.level.deal). Made by an enemy or a companion: its own tier and level (lvlDmg, rules 1.15), as its weapon.
 * Made by nobody (a hazard, a map trap, a barrel nobody set off): the fight's level through the enemy table's damage
 * column, as enemies grow. */
export function flatLevelOf(by: Unit | null | undefined, cb: Combat | null | undefined): number {
  if (by) return by.lvlDmg ? by.lvlDmg : by.charId && !by.companion ? levelOf('flat', by.level) : 1;
  return cb?.level ? enemyLevelRow(cb.level).damage_mult ?? 1 : 1; // the enemy table's damage column (never the heal column)
}

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
  const log = (by.tended ||= []), last = log[log.length - 1];
  if (last && last.r === cb.round) last.n += n; else log.push({ r: cb.round, n });
  while (log.length && log[0].r <= cb.round - TEND_ROUNDS - 1) log.shift();
}
/** What this unit healed and shielded for others in the last TEND_ROUNDS rounds (this one included). */
export function tendedLately(cb: Combat, u: Unit): number {
  const log = u.tended; if (!log) return 0;
  let n = 0; for (const e of log) if (e.r > cb.round - TEND_ROUNDS) n += e.n; return n;
}

// ---------- rules 1.23: the medic's kit ----------
export const MEDIC: any = MENDING.medic || {};
/** Triage (2 AP), a stim and Stim Throw (1 AP), Rally (2 AP, each ally), a Field Repair on an ally (per point of
 * Improvisation): each × Healing given × the level factor of the giver. */
export const TRIAGE_HEAL: number = MEDIC.triage ?? 5;
/** Out of a fight, with time to work (once an ally a scene): Triage × this. */
export const TRIAGE_REST_MULT: number = MEDIC.triage_out_of_fight_mult ?? 3;
export const STIM_HEAL: number = MEDIC.stim ?? 6;
/** Rules 1.36: a stim heals this share of its target's max HP (the gate alone). */
export const STIM_PCT: number = MEDIC.stim_pct ?? 0;
export const RALLY_HEAL: number = MEDIC.rally ?? 6;
export const FIELD_REPAIR_HEAL: number = MEDIC.field_repair_per_point ?? 3;

/** The kit on the one formula (effects/output.ts; step a5): the base (rules.json mending.medic) × the Stat term
 * (Healing given: the giver's, handed in by the caller with its perks and gear in it) × the Level term (the level
 * factor of the giver) × the move's own named multipliers. `per` adds the per-point part (a Field Repair's 3 a point of
 * Improvisation). The number is left raw unless `floor`: the heal sink floors it. */
export function kitHeal(base: number, healing: number, level: number, o: { own?: Term[]; per?: { of: string; value: number; n: number }; floor?: boolean } = {}): number {
  const a = amountOf({ kind: 'heal', base, ...(o.per ? { per: [{ of: o.per.of, value: o.per.value }] } : {}), profile: 'mend', round: o.floor ? 'floor' : 'none' }, null,
    { level: null, ...(o.per ? { counts: { [o.per.of]: o.per.n } } : {}), mults: [term(healing, 'stat: healing given'), term(level, 'level'), ...(o.own || [])] });
  return o.floor ? a.amount : a.raw;
}
