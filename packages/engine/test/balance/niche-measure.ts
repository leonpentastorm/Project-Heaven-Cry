// @ts-nocheck (a measuring tool; see niche-measure.test.ts)
// THE NICHE ROWS (build plan 0.29 P2 item 2; Balance 2.0 section 2.2, the rows the single-range loop cannot show). Each
// weapon on the simulator's shooting range (sim.ts: a target with a Soldier's numbers at the character's level, 5,000
// HP, that never acts), but at a fixed distance instead of the loop's 13 tiles, and in situations the loop has no row
// for. Nothing here decides a rule or moves a number: the grounds are test-only maps, the policies are the balance
// pass's (policies.ts) held where they stand, and every attack goes through the reducer.
//
//   bands     the target at 2, 4, 6, 12 or 20 tiles (the candidate niches: 1-2, 3-4, 4-8, 9-16, past 16), the shooter
//             HELD where it stands (its policy's moves are refused to it, so it fires from there or not at all);
//   cluster   three targets standing together (a tile apart: inside any radius-1 shape) at 6 tiles, held: an area gun's
//             second and third body counted (damage on every target added up);
//   paired    a one-handed gun in each hand (the same gun) at 6 tiles, held (the free hand used);
//   big hit   per weapon, its best single turn of each fight (the mean of the fights), against the plain rifle's: the
//             single big hit, read from the same rows;
//   melee     every melee weapon next to the target (held) and walking in from 6 tiles; light and finesse weapons in
//             the Dexterity twin of the blade build (melee-measure.test.ts's rule), heavy and unarmed in the blade
//             build itself;
//   mods      each gun class's best gun at its best band with the best LEGAL mod set (every working mod that fits a slot
//             of the gun, built !== false, fitted by the engine's fitMod; one per slot, the best of each slot measured
//             alone, then the set): the gain over the bare gun;
//   hypothetical  the paired hand cannon with a modded off hand: today a paired attack drops the off hand's mods
//             (combat.ts withOffHand), so it is not measured: the paired row times the single gun's measured mod gain,
//             and flagged so.
// A weapon whose `requires` the gun or blade build does not meet (the longbow's Raw Power 3, the Spellslinger's pistol's
// Brain Power 3, the censer gun's Faith 3, the mana arms) is measured with that skill raised to its need and the
// weapon put in hand after the build is made: an "as if", marked on its row.
// The yardstick is the contract's 100%: the plain rifle (service rifle, plain shots, normal share, standard grade) at
// the loop's 13 tiles, walking allowed (guns-measure.ts rifleYard).
import { runCell, figures, MAP_ID, atYardPin, yardPc } from './sim';
import { BUILD, BUILDS } from './builds';
import { POLICIES, type Policy } from './policies';
import { gunBuild, GUN_TECHNIQUES } from './guns-measure';
import { MAPS, WEAPON, ITEM, SKILL, gearEntry, equip, magsOf, roundsOf, fitMod, packKindOf } from '../../src';

export const BANDS = [2, 4, 6, 12, 20];
export const BAND_NAME: Record<number, string> = { 1: 'next to it', 2: '1-2 tiles', 4: '3-4 tiles', 6: '4-8 tiles', 12: '9-16 tiles', 20: 'past 16 tiles' };
// ---------- the grounds: bare 26 × 26, the shooter at 2,12, the target(s) d tiles east on the same row
const W0 = (MAPS as any).sim_open || { w: 26, h: 26 };
export function bandMap(d: number, cluster = false): string {
  const id = 'sim_band_' + d + (cluster ? 'c' : ''), key = 'band' + d + (cluster ? 'c' : '');
  if (!MAPS[id]) {
    const x = 2 + d, foe = cluster ? [x + ',12', x + ',11', x + ',13', (x + 1) + ',12', (x + 1) + ',11', (x + 1) + ',13'] : [x + ',12', x + ',10', x + ',14', (x + 1) + ',12'];
    MAPS[id] = { id, name: 'Band ' + d + ' (simulator)', w: W0.w || 26, h: W0.h || 26, solid: [], cover: [], full: [], difficult: [], pcStart: ['2,12', '2,10', '2,14', '1,12'], foeStart: foe };
    (MAP_ID as any)[key] = id;
  }
  return key;
}
// ---------- the held policies: a move the policy asks for is refused to it (banned), so it shoots from where it stands
const MOVES = new Set(['combat/move', 'combat/sprint', 'combat/disengage']);
export const held = (pol: Policy): Policy => (x) => {
  for (let k = 0; k < 8; k++) { const s = pol(x); if (!s) return null; if (!MOVES.has(s.action?.type)) return s; x.banned.add(JSON.stringify(s.action)); }
  return null;
};
for (const id of ['plain', 'gunner', 'optimised']) if (!POLICIES['held_' + id]) POLICIES['held_' + id] = held(POLICIES[id]);
/** The ways a gun is played on a band (the loop's ROTATIONS, held): the best is the weapon's number. */
export const NROT = [
  { id: 'plain', policy: 'plain' },
  { id: 'gunner', policy: 'gunner', opts: { noDump: true } },
  { id: 'dump', policy: 'gunner' },
];
// ---------- the hands
/** The skills a weapon's `requires` asks for, raised to the need and the weapon put in hand (an "as if"). */
function requiresTweak(wid: string, rarity: string) {
  const rq = (WEAPON[wid] as any)?.requires; if (!rq) return null;
  return (c: any) => {
    for (const [k, v] of Object.entries(rq)) { c.skills = { ...c.skills, [k]: Math.max(Number(v), c.skills?.[k] || 0) }; const a = (SKILL[k] as any)?.attribute; if (a) c.attrs = { ...c.attrs, [a]: Math.max(Number(v), c.attrs?.[a] || 1) }; }
    if (c.weapon === wid) return;
    const e = gearEntry(wid, { rarity }); if (!e) return; c.pack = [...(c.pack || []), e];
    if (equip(c, c.pack.length - 1, 'main')) return;
    const w: any = WEAPON[wid]; if (w.magazine != null && w.ammo) { c.loaded = w.magazine; c.pack = [...c.pack, w.reload === 'loose' ? roundsOf(w.ammo, w.magazine * 6) : magsOf(wid, 4)]; }
  };
}
/** The gun build with this weapon (guns-measure.ts gunBuild), its requires met as an "as if" when the build lacks them;
 * `mods`: mod ids fitted on it by the engine's fitMod after it is made. */
export function nicheGun(weapon: string, o: { offHand?: string; mods?: string[] } = {}): { id: string; asIf: boolean } {
  const base = gunBuild(weapon, 'masterwork', o.offHand ? { offHand: o.offHand } : {}), rqT = requiresTweak(weapon, 'masterwork');
  if (!rqT && !o.mods?.length) return { id: base, asIf: false };
  const id = base + (rqT ? ':asif' : '') + (o.mods?.length ? ':' + o.mods.join('+') : '');
  if (!BUILD[id]) {
    const prev = BUILD[base].tweak;
    const def = { ...BUILD[base], id, tweak: (c: any, lv: number) => { prev?.(c, lv); rqT?.(c);
      for (const m of o.mods || []) { c.pack = [...(c.pack || []), { id: m, item: m, name: ITEM[m]?.name || m, qty: 1, kind: packKindOf(m) }]; const err = fitMod(c, c.pack.length - 1); if (err) throw new Error('fit ' + m + ' on ' + weapon + ': ' + err); } } };
    BUILDS.push(def); BUILD[id] = def;
  }
  return { id, asIf: !!rqT };
}
/** The blade build with this melee weapon (melee-measure.test.ts meleeBuild: a Dexterity weapon in the Dexterity twin). */
export function nicheMelee(weapon: string): { id: string; asIf: boolean } {
  const dex = (WEAPON[weapon] as any)?.phys?.hits_with === 'dexterity', id = 'nm:' + weapon, rqT = requiresTweak(weapon, 'masterwork');
  if (!BUILD[id]) {
    const b = BUILD.opt_blade, w = Object.fromEntries(Object.entries(b.weights).map(([k, v]) => [k === 'raw_power' && dex ? 'dexterity' : k, v]));
    const swap = (xs: string[]) => xs.map((s) => (s === 'raw_power' ? 'dexterity' : s));
    const def = { ...b, id, label: (WEAPON[weapon]?.name || weapon) + ' (masterwork)', weapon: weapon === 'fists' ? undefined : weapon, rarity: 'masterwork', ...(dex ? { main: 'dexterity', classId: 'marksman', weights: w, allin: swap(b.allin) } : {}),
      ...(rqT || weapon === 'fists' ? { tweak: (c: any, lv: number) => { b.tweak?.(c, lv); if (weapon === 'fists') { c.weapon = 'fists'; } else rqT!(c); } } : {}) };
    BUILDS.push(def); BUILD[id] = def;
  }
  return { id, asIf: !!rqT };
}
// ---------- one row
export interface NRow { weapon: string; situation: string; level: number; variant: string; rot: string; perTurn: number; pct: number; peakTurnAvg: number; bigHit: number; hitPct: number | null; errors: number; asIf: boolean; inHand: boolean }
const r1 = (n: number) => Math.round(n * 10) / 10;
/** One cell: a build at a level on a ground, n fights of 8 turns, its policy (held unless `walk`). */
export function nicheCell(build: string, level: number, variant: string, mapKey: string, n: number, policy: string, o: { foes?: number; opts?: any; walk?: boolean } = {}) {
  const c = runCell({ build, variant: variant as any, level, policy: o.walk ? policy : 'held_' + policy, ...(o.opts ? { opts: o.opts } : {}) }, 'sim_range_soldier', mapKey as any, n, { foes: o.foes || 1, maxRounds: 8, tag: 'nm' + mapKey });
  return { c, f: figures(c) };
}
/** The yardstick at a level: the plain rifle's damage a turn and its mean best turn (guns-measure.ts rifleYard's cell). */
export function yardOf(level: number, n: number) {
  const c = atYardPin(() => runCell(yardPc(level), 'sim_range_soldier', 'open', n, { maxRounds: 8, tag: 'gm8' })), f = figures(c); // rules 1.57 R1: the yardstick at its pin
  return { perTurn: c.dmg / Math.max(1, c.turns), peak: f.peakTurnAvg };
}
