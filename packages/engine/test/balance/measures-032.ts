// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE 0.32 MEASURES (the simulator lane, 19 Nov 2026; docs/design/handoffs/0.32-MEASURES.md). Rows the earlier tools did
// not have, each played through the real reducer (sim.ts runFight: the policies' actions, the enemy AI's turns):
//   rank      the Living Wall with a shield in each hand at ranks I, II and III (levels 1, 6 and 12: tank-measure.ts plays
//             Survival, which starts every character at level 1, so it measures rank I only), beside two plain rifles,
//             against the standard fight on the ground with cover; the control is the same wall as built (the kit's rifle,
//             no shield). Per fight: won, rounds, what the wall took a round, the foes' attacks on it, Guard earned and
//             spent, how often it went Down.
//   drive     Durability's second fork (rules 1.60 item 4650): Drive (Slam 2 tiles, the Off Balance save at -2, a plate
//             back a foe floored) against Stand Fast and against Drive with its -2 and its plate back set to 0 in memory
//             (data untouched), the two-shield wall at levels 6 and 12 in the rush fight (foes with blades: Slam needs a
//             foe beside it).
//   follow    rules 1.58's follow strike (techniques.json follow: -2 to hit) and Afterword: a one-handed heavy blade (the
//             Ork machete, Raw Power) alone, with Afterword in the off hand, with the Buckler in the off hand; the follow's
//             -2 as built and set to 0 in memory; % of the plain rifle's turn (guns-measure.ts gunRow, the optimised
//             policy, 8 turns on the range).
//   feeds     rules 1.60's beta feed (skills.json per_point.numbers.feed, 0.01 for all nine): the contract's systems all
//             in (refit-measure.ts measure) with every feed as built and with every feed at 0.
// Nothing here changes a number in data: an in-memory setting is put back in a finally.
import { runFight } from './sim';
import { BUILD, BUILDS } from './builds';
import { gunRow, rifleYard } from './guns-measure';
import { measure, yardOf } from './refit-measure';
import { FIGHTS } from './defence-measure';
import { gearEntry, equip, TECHNIQUE } from '../../src';
import { FEEDS } from '../../src/effects/feed';
import { forkRow } from '../../src/doorpicks';
import './door-builds';
import './door-policies';

const reg = (def: any) => { if (!BUILD[def.id]) { BUILDS.push(def); BUILD[def.id] = def; } return def.id; };
const r1 = (n: number) => Math.round(n * 10) / 10, pct = (a: number, b: number) => (b > 0 ? Math.round((a / b) * 100) : 0);
/** Put a weapon in a hand (the sheet's own equip; what was there goes to the pack). */
const hold = (c: any, id: string, to: 'main' | 'off') => { c.pack = [...(c.pack || []), gearEntry(id, {})]; const no = equip(c, c.pack.length - 1, to); if (no) throw new Error('equip ' + id + ' ' + to + ': ' + no); };

// ---------------------------------------------------------------------------------------------- the builds
/** The 0.32 Living Wall (door_wall: Provoke, Drive, Close Guard) with a Buckler in each hand. */
reg({ ...BUILD.door_wall, id: 'door_wall_2sh', label: 'Living Wall, two Bucklers', tweak: (c: any) => { hold(c, 'buckler', 'main'); hold(c, 'buckler', 'off'); } });
/** The same with Stand Fast for its second fork. */
reg({ ...BUILD.door_wall_2sh, id: 'door_wall_2sh_sf', label: 'Living Wall, two Bucklers, Stand Fast', forks: ['fork.guard.provoke', 'fork.guard.stand_fast'] });
/** The optimised blade with a one-handed heavy blade, alone and with a follows item in the off hand. */
const FOLLOW_MAIN = 'ork_machete';
reg({ ...BUILD.opt_blade, id: 'f:main', label: 'Ork machete', weapon: FOLLOW_MAIN, rarity: 'masterwork' });
reg({ ...BUILD.opt_blade, id: 'f:afterword', label: 'Ork machete + Afterword', weapon: FOLLOW_MAIN, rarity: 'masterwork', offHand: 'afterword' });
reg({ ...BUILD.opt_blade, id: 'f:buckler', label: 'Ork machete + Buckler', weapon: FOLLOW_MAIN, rarity: 'masterwork', offHand: 'buckler' });

/** The rush: the standard fight's foes with blades (they cross the ground to strike: a held line, Slam and Reflex need
 * foes that come close). The weapon is the camp rack's free heavy blade. */
export const RUSH = { foes: FIGHTS.standard, weapon: FOLLOW_MAIN };

// ---------------------------------------------------------------------------------------------- rank and drive
export interface WallRow { what: string; level: number; n: number; won: number; rounds: number; takenRound: number; attacksRound: number; guardEarned: number; guardSpent: number; down: number; dealt: number; errors: number }
export function wallRow(what: string, build: string, level: number, n: number, o: { rush?: boolean; policy?: string } = {}): WallRow {
  let won = 0, rounds = 0, taken = 0, atk = 0, ge = 0, gs = 0, down = 0, dealt = 0, errors = 0, rr = 0;
  for (let i = 0; i < n; i++) {
    const foes = (o.rush ? RUSH.foes.map((t) => ({ tier: t, weapon: RUSH.weapon })) : FIGHTS.standard.map((t) => ({ tier: t })));
    const r = runFight({ pcs: [{ build, variant: 'allin', level, policy: o.policy || 'bulwark' }, { build: 'plain_gun', variant: 'normal', level }, { build: 'plain_gun', variant: 'normal', level }], foes, map: 'cover', seed: ['W032', what, level, o.rush ? 'rush' : 'std', i].join('-'), maxRounds: 15 });
    errors += r.errors.length; const w = r.pcs[0]; if (r.win) { won++; rounds += r.rounds; }
    rr += Math.max(1, r.rounds); taken += w.taken; atk += w.foeAttacks; ge += w.res?.guard?.earned || 0; gs += w.res?.guard?.spent || 0; if (w.downedRound != null) down++; dealt += w.hpRemoved;
  }
  return { what, level, n, won: pct(won, n), rounds: won ? r1(rounds / won) : 0, takenRound: r1(taken / rr), attacksRound: r1(atk / rr), guardEarned: r1(ge / n), guardSpent: r1(gs / n), down: pct(down, n), dealt: r1(dealt / n), errors };
}
export const wallLine = (r: WallRow) => '| ' + r.what + ' | ' + r.level + ' | ' + r.won + '% | ' + r.rounds + ' | ' + r.takenRound + ' | ' + r.attacksRound + ' | ' + r.guardEarned + ' / ' + r.guardSpent + ' | ' + r.down + '% | ' + r.dealt + ' |' + (r.errors ? ' ERRORS ' + r.errors : '');
export const WALL_HEAD = '| Wall | Level | Won | Rounds (won) | Taken a round | Foe attacks on it a round | Guard earned / spent a fight | Wall Down | HP it removed a fight |\n|---|---|---|---|---|---|---|---|---|';
/** Drive with its -2 and its plate back at 0 (in memory, put back after). */
export function withDriveOff<T>(f: () => T): T {
  const row = forkRow('fork.guard.drive'), was = row.effects.map((e: any) => e.value);
  try { row.effects[0].value = 0; row.effects[1].value = 0; return f(); } finally { row.effects.forEach((e: any, i: number) => { e.value = was[i]; }); }
}

// ---------------------------------------------------------------------------------------------- the follow strike
export function followRows(level: number, variant: 'normal' | 'allin', n: number, yard = rifleYard(level, Math.max(60, n))) {
  const out: { what: string; pct: number; hit: number; perTurn: number; errors: number }[] = [], num: any = TECHNIQUE.follow.numbers, was = num.extra;
  const row = (what: string, b: string) => { const r = gunRow(what, b, variant, level, n, yard, { policy: 'optimised' }); out.push({ what, pct: r.pctRifle, hit: r.hitPct, perTurn: r.perTurn, errors: r.errors }); };
  try {
    row('machete alone', 'f:main');
    row('+ Afterword, follow ' + was, 'f:afterword'); row('+ Buckler, follow ' + was, 'f:buckler');
    num.extra = 0; row('+ Afterword, follow 0', 'f:afterword'); row('+ Buckler, follow 0', 'f:buckler');
  } finally { num.extra = was; }
  return out;
}

// ---------------------------------------------------------------------------------------------- the beta feeds
export const FEED_SYSTEMS = ['plain', 'blade', 'tank', 'sigil4', 'ob', 'hymn', 'heal', 'chaplain'];
export function feedRows(level: number, n: number) {
  const per = FEEDS.map((f) => f.per), yard = yardOf(level, n);
  const on = measure(level, 'allin', n, FEED_SYSTEMS, yard);
  let off: any; try { FEEDS.forEach((f) => { f.per = 0; }); off = measure(level, 'allin', n, FEED_SYSTEMS, yard); } finally { FEEDS.forEach((f, i) => { f.per = per[i]; }); }
  return FEED_SYSTEMS.map((s) => ({ system: s, on: on[s], off: off[s] }));
}

// ---------------------------------------------------------------------------------------------- guns with mods fitted
// The guns' line with their mods fitted (the ROADMAP's "ceilings with mods fitted"; the method of
// docs/design/proposals/2026-11-mods-today.md section 6): the optimised gun build (opt_gun's sheet, Masterwork) with
// the gun's slots filled one at a time, each slot taking the mod that measures best on top of what is fitted (the
// sheet's own fitMod), against the same gun bare; % of the plain rifle's turn on the range, the same seeds.
import { ITEM, WEAPON, fitMod } from '../../src';
import { TOP_GUNS } from './guns-measure';
export const MOD_GUNS = TOP_GUNS.slice(0, 6);
const modsFor = (gun: string, slot: string) => Object.values(ITEM).filter((m: any) => m.category === 'mod' && m.mod_slot === slot).map((m: any) => m.id as string);
function modBuild(gun: string, mods: string[]): string {
  const id = 'gm:' + gun + ':' + (mods.join('+') || 'bare');
  reg({ ...BUILD.opt_gun, id, label: (WEAPON[gun]?.name || gun) + (mods.length ? ' + ' + mods.join(', ') : ''), weapon: gun, rarity: 'masterwork', policy: 'optimised',
    tweak: (c: any) => { for (const m of mods) { c.pack = [...(c.pack || []), { id: m, item: m, name: ITEM[m]?.name || m, qty: 1, kind: 'mod' }]; const no = fitMod(c, c.pack.length - 1, 'main'); if (no) throw new Error(gun + ' ' + m + ': ' + no); } } });
  return id;
}
export function modRow(gun: string, level: number, n: number, yard = rifleYard(level, Math.max(60, n))) {
  const val = (mods: string[]) => { const r = gunRow(gun, modBuild(gun, mods), 'allin', level, n, yard, { policy: 'optimised' }); return { pct: r.pctRifle, errors: r.errors }; };
  const bare = val([]); let errors = bare.errors, cur: string[] = [], best = bare.pct;
  for (const slot of ((WEAPON[gun] as any)?.mod_slots || []) as string[]) {
    let pick: string | null = null, pickV = best;
    for (const m of modsFor(gun, slot)) { let v: any; try { v = val([...cur, m]); } catch { continue; } errors += v.errors; if (v.pct > pickV) { pickV = v.pct; pick = m; } }
    if (pick) { cur = [...cur, pick]; best = pickV; }
  }
  return { gun, level, bare: bare.pct, fitted: best, mods: cur, errors };
}
