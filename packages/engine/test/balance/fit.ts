// @ts-nocheck (a measuring tool)
// THE FIT (balance pass, step 1: rules 1.15). Measures the enemy table against Leon's targets, at equal level, at the
// six reference levels, with whole fights played by the simulator. One call = one level. The run of 11 Nov 2026 is
// docs/design/handoffs/balance-sim-step1.md (the report) and balance-sim-step1.json (every number).
//
//   BALANCE_FIT_OUT=<dir> BALANCE_FIT_LEVELS=1,3 BALANCE_FIT_N=20 [BALANCE_FIT_TABLE=<file.json>] [BALANCE_FIT_TAG=<name>]
//     npx vitest run --root packages/engine test/balance/step1-fit.test.ts
//   writes <dir>/fit-<tag>-L<levels>.json. BALANCE_FIT_TABLE is an enemy table to TRY without touching data/enemies.json:
//   { "tiers": { "soldier": { "hp": 150, ... } }, "levels": [ { "level": 1, "hp_mult": 1, ... } ] } (any part may be left out;
//   "gap": { "to_hit_per_level": 2 } tries another level gap).
import { ENEMY, ENEMY_LEVELS, enemyStats } from '../../src';
import { runFight, plainPreview, TIER_WEAPON, ALL_TIERS } from './sim';
import { SQUAD } from './report';

// Sandbags that shoot back (soldier and elite numbers, 5,000 HP): "under fire from half a standard fight's enemies".
const bag = (t: string) => { ENEMY['sim_bag_' + t] = { ...ENEMY[t], id: 'sim_bag_' + t, name: 'Sandbag (' + t + ' numbers)', hp: 5000 }; TIER_WEAPON['sim_bag_' + t] = TIER_WEAPON[t]; };

/** Put a trial table over the loaded one (in memory only). */
export function useTable(t: any) {
  if (!t) return;
  for (const [id, row] of Object.entries(t.tiers || {})) Object.assign(ENEMY[id], row);
  for (const r of t.levels || []) Object.assign(ENEMY_LEVELS.table.find((q) => q.level === r.level)!, r);
  if (t.gap) Object.assign(ENEMY_LEVELS.gap, t.gap); // a what-if only: the gap is not part of the table
}
export const tableNow = () => ({ tiers: Object.fromEntries(ALL_TIERS.map((t) => [t, { hp: ENEMY[t].hp, armour: ENEMY[t].armour, defense: ENEMY[t].defense, attack_bonus: ENEMY[t].attack_bonus, damage: ENEMY[t].damage }])), levels: ENEMY_LEVELS.table.map((r) => ({ ...r })) });

export const FIT_FIGHTS: Record<string, string[]> = {
  standard: ['soldier', 'soldier', 'soldier', 'elite'],
  elite: ['elite', 'elite', 'soldier', 'soldier'],
  boss: ['boss', 'soldier', 'soldier'],
};
export const FIRE: Record<string, string[]> = { soldiers: ['sim_bag_soldier', 'sim_bag_soldier'], mixed: ['sim_bag_elite', 'sim_bag_soldier'] };
const MAXR = 20, FIRE_R = 10;

function squadRow(fid: string, lv: number, map: string, n: number, shift = 0) {
  const row: any = { fight: fid, level: lv, map, shift, n: 0, wins: 0, timeouts: 0, winRounds: 0, rounds: 0, anyDown: 0, downs: 0, wipes: 0, errors: 0, dmg: 0, pcTurns: 0, maxHitsToKill: 0, kills: {} };
  for (let i = 0; i < n; i++) {
    const r = runFight({ pcs: SQUAD.map((b) => ({ build: b, variant: 'normal', level: lv })), foes: FIT_FIGHTS[fid].map((t) => ({ tier: t })), map: map as any, seed: ['FIT', fid, lv, map, shift, i].join('-'), maxRounds: MAXR, shift });
    row.n++; row.rounds += r.rounds; row.errors += r.errors.length; if (r.timeout) row.timeouts++;
    if (r.win) { row.wins++; row.winRounds += r.rounds; }
    const d = r.pcs.filter((p) => p.downedRound != null).length; row.downs += d; if (d) row.anyDown++; if (d === r.pcs.length) row.wipes++;
    for (const p of r.pcs) { row.dmg += p.dmg; row.pcTurns += p.turns; }
    for (const k of r.kills) { const q = (row.kills[k.tier] ||= { n: 0, hits: 0 }); q.n++; q.hits += k.hits; row.maxHitsToKill = Math.max(row.maxHitsToKill, k.hits); }
  }
  return row;
}
function fireRow(build: string, lv: number, fire: string, n: number) {
  const row: any = { build, level: lv, fire, n: 0, downBy3: 0, down: 0, downRound: 0, lasted: 0, taken: 0, rounds: 0, hp: 0, foeAttacks: 0, foeHits: 0, errors: 0 };
  for (let i = 0; i < n; i++) {
    const r = runFight({ pcs: [{ build, variant: 'normal', level: lv }], foes: FIRE[fire].map((t) => ({ tier: t })), map: 'open', seed: ['FIRE', build, lv, fire, i].join('-'), maxRounds: FIRE_R }), p = r.pcs[0];
    row.n++; row.errors += r.errors.length; row.hp = p.maxHp; row.taken += p.taken; row.rounds += r.rounds; row.foeAttacks += p.foeAttacks; row.foeHits += p.foeHits;
    if (p.downedRound != null) { row.down++; row.downRound += p.downedRound; if (p.downedRound <= 3) row.downBy3++; }
    // rounds it lasted: the round it went down in, less one (it did not finish that round); never down in 10 rounds counts as 10
    row.lasted += p.downedRound != null ? p.downedRound - 1 : FIRE_R;
  }
  return row;
}

/** The cards: the yardstick's plain shot at an enemy of its level (4 tiles, open ground), and the enemy's shot back. No fight is played. */
export function fitCards(lv: number) {
  const pc = { build: 'plain_gun', variant: 'normal', level: lv }, cards: any = {};
  for (const t of ALL_TIERS) { const pv = plainPreview(pc, t), s = enemyStats(t, lv);
    cards[t] = { hp: s.hp, armour: s.armour, defense: s.defense, attack: s.attack_bonus, dmgFactor: s.damage, weapon: TIER_WEAPON[t], yardHit: pv.hit, yardCrit: pv.crit, yardPct: pv.pct, hitsToKill: Math.ceil(pv.foeHp / pv.hit), hitsToKillExact: Math.round((pv.foeHp / pv.hit) * 100) / 100,
      foePct: pv.foe?.pct, foeRaw: pv.foe?.raw, foeAfterArmour: pv.foe?.afterArmour, pcHp: pv.pcHp, pcDef: pv.pcDef, pcArmour: pv.pcArmour }; }
  const pv = plainPreview({ build: 'tank', variant: 'normal', level: lv }, 'soldier');
  cards.soldier_vs_tank = { foePct: pv.foe?.pct, foeRaw: pv.foe?.raw, foeAfterArmour: pv.foe?.afterArmour, pcHp: pv.pcHp, pcDef: pv.pcDef, pcArmour: pv.pcArmour, guardMax: pv.guardMax };
  return cards;
}

/** Everything the targets ask about, for one level. */
export function fitLevel(lv: number, n: number, say: (s: string) => void = () => {}) {
  bag('soldier'); bag('elite');
  const t0 = Date.now();
  const out: any = { level: lv, n, cards: fitCards(lv), squads: [], fire: [], gap: {} };
  // 2. whole fights, a squad of four
  for (const fid of Object.keys(FIT_FIGHTS)) for (const map of ['open', 'cover']) { out.squads.push(squadRow(fid, lv, map, n)); say('L' + lv + ' ' + fid + ' ' + map + ' ' + (Date.now() - t0) + ' ms'); }
  // 3. under fire from half a standard fight's enemies, for 10 rounds: the yardstick and the tank
  for (const b of ['plain_gun', 'tank']) for (const f of Object.keys(FIRE)) out.fire.push(fireRow(b, lv, f, n));
  say('L' + lv + ' fire ' + (Date.now() - t0) + ' ms');
  // 4. the level gap: 5 below (one hit) and 3 above (lost more often than won)
  if (lv - 5 >= 1) out.gap.below5 = squadRow('standard', lv, 'open', Math.max(2, Math.round(n / 4)), -5);
  if (lv + 3 <= 20) { out.gap.above3open = squadRow('standard', lv, 'open', n, 3); out.gap.above3cover = squadRow('standard', lv, 'cover', n, 3); }
  out.gap.below3 = lv - 3 >= 1 ? squadRow('standard', lv, 'open', Math.max(2, Math.round(n / 2)), -3) : null;
  out.gap.above2 = lv + 2 <= 20 ? squadRow('standard', lv, 'open', Math.max(2, Math.round(n / 2)), 2) : null;
  out.seconds = Math.round((Date.now() - t0) / 1000); say('L' + lv + ' done ' + out.seconds + ' s');
  return out;
}

const r1 = (x: number) => Math.round(x * 10) / 10, pct = (a: number, b: number) => (b ? Math.round((a / b) * 100) : 0);
/** One line a level: what the fit looks at while tuning. */
export function fitLine(o: any): string {
  const sq = (f: string, m: string) => { const r = o.squads.find((x) => x.fight === f && x.map === m); return pct(r.wins, r.n) + '% ' + (r.wins ? r1(r.winRounds / r.wins) : '-') + 'r any-down ' + pct(r.anyDown, r.n) + '% downs ' + r1(r.downs / r.n) + (r.timeouts ? ' T' + r.timeouts : ''); };
  const fr = (b: string, f: string) => { const r = o.fire.find((x) => x.build === b && x.fire === f); return r1(r.lasted / r.n) + 'r (by3 ' + pct(r.downBy3, r.n) + '%)'; };
  const g = (r: any) => (r ? pct(r.wins, r.n) + '%' : '-');
  return ['L' + o.level + ' htk ' + ALL_TIERS.map((t) => o.cards[t].hitsToKillExact).join('/') + ' hit% ' + ALL_TIERS.map((t) => o.cards[t].yardPct).join('/') + ' foe hit% ' + ALL_TIERS.map((t) => o.cards[t].foePct).join('/') + ' foe dmg ' + ALL_TIERS.map((t) => o.cards[t].foeAfterArmour).join('/'),
    '   standard open ' + sq('standard', 'open') + ' | cover ' + sq('standard', 'cover'),
    '   elite    open ' + sq('elite', 'open') + ' | cover ' + sq('elite', 'cover'),
    '   boss     open ' + sq('boss', 'open') + ' | cover ' + sq('boss', 'cover'),
    '   fire: gun 2 soldiers ' + fr('plain_gun', 'soldiers') + ', gun elite+soldier ' + fr('plain_gun', 'mixed') + ', tank 2 soldiers ' + fr('tank', 'soldiers') + ', tank elite+soldier ' + fr('tank', 'mixed'),
    '   gap: +3 open ' + g(o.gap.above3open) + ' cover ' + g(o.gap.above3cover) + ' | +2 ' + g(o.gap.above2) + ' | -3 ' + g(o.gap.below3) + (o.gap.below3?.wins ? ' ' + r1(o.gap.below3.winRounds / o.gap.below3.wins) + 'r' : '') + ' | -5 most hits to kill ' + (o.gap.below5 ? o.gap.below5.maxHitsToKill : '-'),
    '   errors ' + (o.squads.reduce((n, r) => n + r.errors, 0) + o.fire.reduce((n, r) => n + r.errors, 0))].join('\n');
}
