// @ts-nocheck (a measuring tool; see guns-measure.test.ts)
// The guns step of the balance pass (rules 1.18): what each gun is worth against the plain rifle on the simulator's
// shooting range (sim.ts: a target with a Soldier's numbers at the character's level and 5,000 HP that never acts).
// One row is one WEAPON in the hands of the optimised gun build (builds.ts 'opt_gun': Marksman, a normal share or all
// in, the drill and perks that build takes), played for 8 turns by the optimised policy. The percent is its damage a
// turn over the plain rifle's (service rifle, plain shots, normal share, same level): the pass's 100%.
import { runCell, figures } from './sim';
import { BUILD, BUILDS } from './builds';
import { WEAPON } from '../../src';

export const G_LEVELS = [1, 3, 6, 9, 12, 20];
const r1 = (n: number) => Math.round(n * 10) / 10, pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
/** The damage techniques a gun build readies, best first (builds.ts learns as many as creation and drill give). */
export const GUN_TECHNIQUES = ['mag_dump', 'dead_centre', 'last_round', 'stopping_shot', 'heavy_bolt', 'walking_fire', 'called_shot', 'bead', 'suppress', 'shift'];

/** Register (once) the optimised gun build with another weapon in its hands; returns the build id. */
export function gunBuild(weapon: string, rarity = 'masterwork', o: { offHand?: string; techniques?: string[]; policy?: string } = {}): string {
  const id = 'g:' + weapon + ':' + rarity + (o.offHand ? '+' + o.offHand : '') + (o.policy ? ':' + o.policy : '') + (o.techniques ? ':' + o.techniques.join(',') : '');
  if (!BUILD[id]) {
    const def = { ...BUILD.opt_gun, id, label: (WEAPON[weapon]?.name || weapon) + (rarity !== 'standard' ? ' (' + rarity + ')' : ''), weapon, rarity, ...(o.offHand ? { offHand: o.offHand } : {}), techniques: o.techniques || GUN_TECHNIQUES, policy: o.policy || 'optimised' };
    BUILDS.push(def); BUILD[id] = def;
  }
  return id;
}
export interface GRow { what: string; build: string; level: number; variant: string; perTurn: number; pctRifle: number; hitPct: number; critShare: number; dmgPerHit: number; shotsPerTurn: number; apShare: any; actions: Record<string, number>; bigHit: number; bigWhat: string; peakTurn: number; errors: number }
export function rifleYard(level: number, n: number, rounds = 8): number {
  const c = runCell({ build: 'plain_gun', variant: 'normal', level }, 'sim_range_soldier', 'open', n, { maxRounds: rounds, tag: 'gm' + rounds });
  return c.dmg / Math.max(1, c.turns);
}
export function gunRow(what: string, build: string, variant: string, level: number, n: number, yard: number, o: { tier?: string; rounds?: number; opts?: any; policy?: string } = {}): GRow {
  const c = runCell({ build, variant: variant as any, level, ...(o.opts ? { opts: o.opts } : {}), ...(o.policy ? { policy: o.policy } : {}) }, o.tier || 'sim_range_soldier', 'open', n, { maxRounds: o.rounds || 8, tag: 'gm' + (o.rounds || 8) });
  const f = figures(c);
  return { what, build, level, variant, perTurn: r1(c.dmg / Math.max(1, c.turns)), pctRifle: pct(c.dmg / Math.max(1, c.turns), yard), hitPct: f.hitPct, critShare: f.critShare, dmgPerHit: f.dmgPerHit, shotsPerTurn: r1(c.attacks / Math.max(1, c.turns)),
    apShare: f.apShare, actions: Object.fromEntries(Object.entries(c.actions).map(([k, v]) => [k, r1(v / c.n)])), bigHit: c.bigHit, bigWhat: c.bigHitWhat, peakTurn: c.peakTurn, errors: c.errors };
}
export const gline = (r: GRow) => r.what + ' L' + r.level + ' ' + r.variant + ': ' + r.perTurn + ' a turn · ' + r.pctRifle + '% · hit ' + r.hitPct + '% · ' + r.dmgPerHit + ' a hit · ' + r.shotsPerTurn + ' rolls a turn · crit share ' + r.critShare + '% · biggest ' + r.bigHit + (r.errors ? ' · ERRORS ' + r.errors : '');
