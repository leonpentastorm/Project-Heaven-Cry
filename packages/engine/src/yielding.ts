// CAN THIS ENEMY YIELD (rules 1.66 item 5200): the one answer, read by surrender (talked down, Open Hand's mercy, a
// feeling's Mercy, a Narrator's surrender), Spare and every other non-lethal blow, Clean Hands, the Mercy vow and Love
// Conquers. Which tiers, kinds and tag never yield is data: `rules.json combat.yield`.
import { RULES } from './data';
import type { Unit } from './combat';

export const YIELD: { cannot_kinds?: string[]; cannot_tiers?: string[]; cannot_tag?: string; disabled_text?: string; spare_preview?: string } = (RULES as any).combat?.yield || {};
/** An enemy that can yield: not of a tier, kind or tag that never does (a boss; a machine, robot, turret or drone; no_surrender). */
export function canYield(t: Unit): boolean {
  return t.side === 'foe' && !(YIELD.cannot_tiers || []).includes(t.tier || '') && !(YIELD.cannot_kinds || []).includes(t.kind || '') && !(t.tags || []).includes(YIELD.cannot_tag || 'no_surrender');
}
