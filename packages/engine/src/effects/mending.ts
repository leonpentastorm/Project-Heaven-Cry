// Rules revision 1.20 (the heal and shield pass; spec: "Rules revision 1.20"; data/rules.json `mending`).
//   mendFactor     healing and shields from Sigil, the Outburst and prayer grow with the caster's level, by the level
//                  row of the enemy table's damage column: the number that raises what an enemy deals. One Soldier's
//                  turn then costs a character the same share of a heal at level 20 as at level 1.
//   mendRoom       the round limit: spells and prayers together restore at most half of a creature's max HP a round.
// Every number is provisional (spec section 14, items 1230 on).
import type { Combat, Unit } from '../combat';
import { RULES, enemyLevelRow } from '../data';

export const MENDING: any = (RULES as any).mending || {};
/** The level factor (×1.00 at level 1 … ×1.82 at level 20): enemies.json levels.table damage_mult. No level: ×1. */
export const mendFactor = (level: number | null | undefined): number => (level == null ? 1 : enemyLevelRow(level).damage_mult ?? 1);
/** The factor for what this unit gives: a character's and its side's units' (a companion, a turret: their own level,
 * which is their owner's). An enemy's is ×1: an enemy caster's spells already grow through its multipliers (rules 1.15). */
export const mendFactorOf = (u: Unit | null | undefined): number => (u && u.side === 'pc' ? mendFactor(u.level) : 1);
/** The kinds of healing the round limit counts: spells and prayers (not a stim, Triage, a rest, a perk). */
export const MEND_KINDS: string[] = MENDING.round_limit?.kinds || ['sigil', 'soul', 'leech', 'thread', 'blessing'];
export const MEND_ROUND_SHARE: number = MENDING.round_limit?.share_of_max_hp ?? 0.5;
/** What spells and prayers may still restore on this creature this round. */
export function mendRoom(cb: Combat | null, t: Unit): number {
  const cap = Math.floor(t.maxHp * MEND_ROUND_SHARE), m = (t as any).mended as { r: number; n: number } | undefined;
  return !cb ? cap : Math.max(0, cap - (m && m.r === cb.round ? m.n : 0));
}
export function noteMended(cb: Combat | null, t: Unit, n: number) {
  if (!cb || n <= 0) return; const m = (t as any).mended as { r: number; n: number } | undefined;
  (t as any).mended = { r: cb.round, n: (m && m.r === cb.round ? m.n : 0) + n };
}
