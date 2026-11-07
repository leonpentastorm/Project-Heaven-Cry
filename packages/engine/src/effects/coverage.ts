// The coverage report (plan 2.1): for every perk (each tier), trait and class move, who runs each effect. It drives
// the sheet's "Engine runs it / Narrator rules it / Both" badge, the glossary's markup, the fight-start fallback note,
// and test/coverage.test.ts (the gap list: effects nobody runs yet, which reach the Narrator only as text).
import type { ItemInfo } from './types';
import { allItems, itemInfo } from './collect';
import { ownerOf, handlerOf, type Owner } from './hooks';
import { actionDefs } from './actions';

export interface CoverageRow { key: string; tier: string; index: number; op: string; owner: Owner }
export function coverageOf(info: ItemInfo): CoverageRow[] {
  return info.effects.map((e, i) => ({ key: info.key, tier: info.effTier[i] || info.tier, index: i, op: e?.op, owner: ownerOf(info, i) }));
}
/** Every effect of every item. */
export const coverageReport = (): CoverageRow[] => allItems().flatMap(coverageOf);
/** Effects nobody runs yet (not a narrator op, not claimed, not run by a generic op, not part of an action). */
export const coverageGaps = (): CoverageRow[] => coverageReport().filter((r) => r.owner === 'gap');

export type Verdict = 'engine' | 'narrator' | 'both';
/** The badge: the engine runs all of it, the Narrator rules all of it, or both share it. */
export function verdictOf(info: ItemInfo): Verdict {
  const rows = coverageOf(info), lane = !!handlerOf(info.key);
  if (!rows.length) return lane ? 'engine' : 'narrator';
  const eng = rows.filter((r) => r.owner === 'generic' || r.owner === 'handler').length;
  // An action the engine runs only in part (its default run gives the Narrator the rest).
  const act = rows.filter((r) => r.owner === 'action').length;
  if (eng === rows.length) return 'engine';
  if (eng === 0 && !(act && actionDefs(info).length)) return 'narrator';
  return 'both';
}
/** The badge for an item a character holds, by key and tier (the sheet). */
export function verdictFor(key: string, tier?: string): { verdict: Verdict; label: string } {
  const info = itemInfo(key, tier as any); if (!info) return { verdict: 'narrator', label: 'Narrator rules it' };
  const v = verdictOf(info);
  return { verdict: v, label: v === 'engine' ? 'Engine runs it' : v === 'narrator' ? 'Narrator rules it' : 'Both' };
}
/** Counts for a summary line (tests, the report). */
export function coverageSummary() {
  const rows = coverageReport(), by: Record<string, number> = {};
  for (const r of rows) by[r.owner] = (by[r.owner] || 0) + 1;
  return { effects: rows.length, ...by };
}
