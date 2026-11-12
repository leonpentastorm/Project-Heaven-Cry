// @ts-nocheck (a measuring tool; see balance-sim.test.ts)
// The balance pass, instrument 1: THE RUN PLAN AND THE REPORT. runAll() plays every fight of the baseline and returns
// plain data; writeReport() turns it into docs/design/handoffs/balance-sim-baseline.md (for Leon: a summary measured
// against his targets, then one table per angle of the balance pass) and .json (the same numbers, for the next stage).
// Every sentence of the summary is computed from the data, so a re-run after a rules change stays true.
import { ENEMY, CLASS, PERK, SKILL, WEAPON } from '../../src';
import { BUILDS, BUILD, LEVELS, VARIANTS, NORMAL_SHARE, DRILL_MARKS_AT, DEVOTION_AT, WORD_PICKS_AT, buildCharacter, legalityProblems, sheetLine } from './builds';
import { runCell, runFight, addResult, figures, plainPreview, peakCard, TIERS, TIER_WEAPON, type Cell } from './sim';
import { NOT_PLAYED } from './policies';

// Test-only targets that never die: a tier's own Defense, armour and attack with 5,000 HP, so damage per turn can be
// measured over 8 rounds. They exist only in this test process; no game data is touched.
ENEMY.sim_bag_soldier = { ...ENEMY.soldier, id: 'sim_bag_soldier', name: 'Sandbag (soldier numbers)', hp: 5000 };
ENEMY.sim_bag_boss = { ...ENEMY.boss, id: 'sim_bag_boss', name: 'Sandbag (boss numbers)', hp: 5000 };
TIER_WEAPON.sim_bag_soldier = TIER_WEAPON.soldier; TIER_WEAPON.sim_bag_boss = TIER_WEAPON.boss;

export const SQUAD = ['opt_gun', 'tank', 'sigil', 'calls'];
export const FIGHTS: Record<string, { name: string; foes: string[] }> = {
  standard: { name: 'Standard fight: 3 soldiers and 1 elite', foes: ['soldier', 'soldier', 'soldier', 'elite'] },
  boss: { name: 'Boss fight: 1 boss and 2 soldiers', foes: ['boss', 'soldier', 'soldier'] },
};
export const FOCUS: Record<string, number> = { minion: 4, soldier: 4, elite: 2 };
const PEAK_BUILDS = ['opt_gun', 'opt_blade', 'tank', 'sigil', 'outburst', 'faith'];

export interface Plan { n: number; nLong: number; levels: number[]; variants: string[]; tiers: string[]; coverLevels: number[]; quick: boolean }
export const FULL = (n: number): Plan => ({ n, nLong: Math.max(2, Math.round(n / 2)), levels: LEVELS, variants: VARIANTS, tiers: TIERS, coverLevels: [1, 9, 20], quick: false });
export const QUICK: Plan = { n: 1, nLong: 1, levels: [1, 12], variants: ['normal'], tiers: ['soldier', 'boss'], coverLevels: [], quick: true };

const fig = (c: Cell) => ({ build: c.build, variant: c.variant, level: c.level, policy: c.policy, tier: c.tier, map: c.map, foes: c.foes, ...figures(c) });

export function runAll(plan: Plan, say: (s: string) => void = () => {}) {
  const t0 = Date.now(), D: any = { meta: { generated: new Date().toISOString().slice(0, 10), seedsPerDuel: plan.n, seedsPerLongFight: plan.nLong, quick: plan.quick, levels: plan.levels, tiers: plan.tiers,
    enemyWeapons: TIER_WEAPON, normalShare: NORMAL_SHARE, notPlayed: NOT_PLAYED, squad: SQUAD, fights: FIGHTS, focus: FOCUS,
    enemies: Object.fromEntries(TIERS.map((t) => [t, { hp: ENEMY[t].hp, defense: ENEMY[t].defense, armour: ENEMY[t].armour, attack: ENEMY[t].attack_bonus }])),
    /** rules 1.15: every enemy is the squad's level (a report saved before it has no such mark, and keeps its old wording) */ enemyLevels: true },
    builds: [], previews: [], duel: [], bag: [], range: [], rangePlain: [], peak: [], focus: [], squads: [] };
  // 1. the builds, and the engine's own answer for their plain attack
  for (const b of BUILDS) for (const v of VARIANTS) for (const lv of LEVELS) {
    const x = buildCharacter(b.id, v as any, lv);
    D.builds.push({ build: b.id, label: b.label, variant: v, level: lv, sheet: sheetLine(x), problems: legalityProblems(x), notes: x.notes, classId: x.c.classId, unspent: x.unspent, perkStepsLeft: x.perkStepsLeft,
      mainSkill: x.c.skills[b.main] || 0, devotion: x.c.devotion ?? null, words: (x.c.sigils || []).length });
  }
  for (const b of ['plain_gun', 'plain_blade', 'opt_gun', 'opt_blade', 'tank']) for (const v of plan.variants) for (const lv of plan.levels) for (const t of TIERS)
    D.previews.push({ build: b, variant: v, level: lv, tier: t, ...plainPreview({ build: b, variant: v as any, level: lv }, t) });
  D.peakCards = [];
  for (const b of ['plain_gun', 'plain_blade', 'opt_gun', 'opt_blade', 'tank']) for (const v of plan.variants) for (const lv of plan.levels) { const cards = peakCard({ build: b, variant: v as any, level: lv }, 'boss'); D.peakCards.push({ build: b, variant: v, level: lv, cards: cards.slice(0, 6) }); }
  say('builds and previews ' + (Date.now() - t0) + ' ms');
  // 2. duels: one character against one enemy of each tier
  for (const b of BUILDS) for (const v of plan.variants) for (const lv of plan.levels) for (const t of plan.tiers) {
    D.duel.push(fig(runCell({ build: b.id, variant: v as any, level: lv }, t, 'open', plan.n)));
    if (v === 'normal' && plan.coverLevels.includes(lv)) D.duel.push(fig(runCell({ build: b.id, variant: 'normal', level: lv }, t, 'cover', plan.n)));
  }
  say('duels ' + (Date.now() - t0) + ' ms');
  // 3. eight rounds on a target that does not die (soldier numbers; boss numbers for the normal share)
  for (const b of BUILDS) for (const v of plan.variants) for (const lv of plan.levels) {
    D.bag.push(fig(runCell({ build: b.id, variant: v as any, level: lv }, 'sim_bag_soldier', 'open', plan.nLong, { maxRounds: 8 })));
    if (v === 'normal' && !plan.quick) D.bag.push(fig(runCell({ build: b.id, variant: 'normal', level: lv }, 'sim_bag_boss', 'open', plan.nLong, { maxRounds: 8 })));
  }
  say('sandbags ' + (Date.now() - t0) + ' ms');
  // 3b. the shooting range: eight turns on a target that never acts (soldier numbers). Damage a turn with nothing in the way.
  D.range = []; D.rangePlain = [];
  for (const b of BUILDS) for (const v of plan.variants) for (const lv of plan.levels)
    D.range.push(fig(runCell({ build: b.id, variant: v as any, level: lv }, 'sim_range_soldier', 'open', plan.nLong, { maxRounds: 8 })));
  // the optimised weapon builds again, same sheet and gear, making plain attacks only: what their techniques add
  for (const b of ['opt_gun', 'opt_blade']) for (const lv of plan.levels)
    D.rangePlain.push(fig(runCell({ build: b, variant: 'normal', level: lv, policy: 'plain' }, 'sim_range_soldier', 'open', plan.nLong, { maxRounds: 8, tag: 'plain' })));
  say('range ' + (Date.now() - t0) + ' ms');
  // 4. the peak: the dearest move, set up over the turns it needs
  for (const b of plan.quick ? ['opt_blade', 'outburst'] : PEAK_BUILDS) for (const v of plan.quick ? ['allin'] : VARIANTS) for (const lv of plan.quick ? [12] : LEVELS)
    D.peak.push(fig(runCell({ build: b, variant: v as any, level: lv, peak: true }, 'sim_bag_boss', 'open', plan.nLong, { maxRounds: 8, tag: 'peak' })));
  say('peaks ' + (Date.now() - t0) + ' ms');
  // 5. focus: every enemy on one character
  for (const b of plan.quick ? [BUILD.plain_gun] : BUILDS) for (const lv of plan.quick ? [12] : plan.levels) for (const [t, k] of Object.entries(FOCUS)) {
    if (plan.quick && t !== 'soldier') continue;
    D.focus.push(fig(runCell({ build: b.id, variant: 'normal', level: lv }, t, 'open', plan.nLong, { foes: k, tag: 'focus' })));
  }
  say('focus ' + (Date.now() - t0) + ' ms');
  // 6. squads of 1 to 4 against the same fight
  for (const [fid, f] of Object.entries(FIGHTS)) for (const lv of plan.quick ? [6] : [1, 6, 12, 20]) for (const size of plan.quick ? [4] : [1, 2, 3, 4]) for (const map of plan.quick ? ['cover'] : ['open', 'cover']) {
    if (plan.quick && fid !== 'standard') continue;
    const row: any = { fight: fid, level: lv, size, map, n: 0, wins: 0, timeouts: 0, rounds: 0, winRounds: 0, downs: 0, dmg: 0, turns: 0, taken: 0, errors: 0, foeLostRun: 0, lostRun: 0, per: {} };
    for (let i = 0; i < plan.nLong; i++) {
      const r = runFight({ pcs: SQUAD.slice(0, size).map((b) => ({ build: b, variant: 'normal', level: lv })), foes: f.foes.map((t) => ({ tier: t })), map: map as any, seed: ['SQ', fid, lv, size, map, i].join('-') });
      row.n++; if (r.win) { row.wins++; row.winRounds += r.rounds; } if (r.timeout) row.timeouts++; row.rounds += r.rounds; row.errors += r.errors.length; row.foeLostRun = Math.max(row.foeLostRun, r.foeLostRun);
      for (const p of r.pcs) { row.dmg += p.dmg; row.turns += p.turns; row.taken += p.taken; if (p.downedRound != null) row.downs++; row.lostRun = Math.max(row.lostRun, p.lostRun);
        const q = (row.per[p.build] ||= { dmg: 0, turns: 0, taken: 0, downs: 0, calls: 0 }); q.dmg += p.dmg; q.turns += p.turns; q.taken += p.taken; if (p.downedRound != null) q.downs++; q.calls += Object.entries(p.actions).filter(([k]) => k.startsWith('Call')).reduce((n, [, v]) => n + (v as number), 0); }
    }
    D.squads.push(row);
  }
  say('squads ' + (Date.now() - t0) + ' ms');
  D.meta.seconds = Math.round((Date.now() - t0) / 1000);
  D.meta.errors = [...D.duel, ...D.bag, ...D.range, ...D.rangePlain, ...D.peak, ...D.focus].reduce((n: number, c: any) => n + (c.errors || 0), 0) + D.squads.reduce((n: number, r: any) => n + r.errors, 0);
  return D;
}

// ---------- the report ----------
const TGT = { hit: 65, critMult: 1.5, bigHit: 350, megaCrit: 500, sigil: 150, outburst: 125, optimised: 150, rounds: { soldier: [4, 6], elite: [6, 8], boss: [8, 10] }, kill: { minion: [2, 2], soldier: [3, 4], elite: [6, 8], boss: [20, 20] }, survive: 3 };
const n1 = (x: any) => (x == null ? '–' : typeof x === 'number' ? String(Math.round(x * 10) / 10) : String(x));
const pc = (x: any) => (x == null ? '–' : Math.round(x) + '%');
const tbl = (head: string[], rows: any[][]) => ['| ' + head.join(' | ') + ' |', '|' + head.map(() => '---').join('|') + '|', ...rows.map((r) => '| ' + r.map((c) => (c == null ? '–' : String(c))).join(' | ') + ' |'), ''];
const VN: Record<string, string> = { normal: 'normal share', allin: 'all in' };
const TN: Record<string, string> = { minion: 'Minion', soldier: 'Soldier', elite: 'Elite', boss: 'Boss', sim_bag_soldier: 'Sandbag (soldier numbers)', sim_bag_boss: 'Sandbag (boss numbers)', sim_range_soldier: 'Range target (soldier numbers)' };
const priceLine = (p: Record<string, number> = {}) => {
  const name: Record<string, string> = { ap: 'AP', momentum: 'Momentum', guard: 'Guard', mp: 'MP', strain: 'Strain', flux: 'Flux', charge: 'core charge', cores: 'cores', ammo: 'rounds', heat: 'Heat', echo: 'Echo', reactions: 'reactions', turns: 'turn(s)', actions: 'action(s)' };
  const parts: string[] = [];
  for (const [k, v] of Object.entries(p)) { if (!v || k === 'actions') continue; if (k === 'turns') { parts.push(v + ' turn' + (v === 1 ? '' : 's')); continue; }
    // a resource that rose (Heat, Flux, Strain) is a price too: the action added it
    parts.push(v > 0 ? n1(v) + ' ' + name[k] : '+' + n1(-v) + ' ' + name[k]); }
  return parts.join(', ') || '–';
};

export function writeReport(D: any): string {
  const L: string[] = [], lv = D.meta.levels as number[], tiers = D.meta.tiers as string[];
  const duel = (b: string, v: string, l: number, t: string, map = 'open') => D.duel.find((c: any) => c.build === b && c.variant === v && c.level === l && c.tier === t && c.map === map);
  const bag = (b: string, v: string, l: number, t = 'sim_bag_soldier') => D.bag.find((c: any) => c.build === b && c.variant === v && c.level === l && c.tier === t);
  const pvw = (b: string, v: string, l: number, t: string) => D.previews.find((c: any) => c.build === b && c.variant === v && c.level === l && c.tier === t);
  const variants = [...new Set(D.duel.map((c: any) => c.variant))] as string[];
  const lo = lv[0], hi = lv[lv.length - 1], mid = lv.includes(9) ? 9 : lv[Math.floor(lv.length / 2)];
  const range = (xs: number[]) => (xs.length ? (Math.min(...xs) === Math.max(...xs) ? n1(xs[0]) : n1(Math.min(...xs)) + ' to ' + n1(Math.max(...xs))) : '–');
  // the shooting range (a target that never acts); an older JSON without it falls back to the sandbag that shoots back
  const rangeC = (b: string, v: string, l: number) => (D.range || []).find((c: any) => c.build === b && c.variant === v && c.level === l) || bag(b, v, l);
  const plainOf = (b: string, l: number) => (D.rangePlain || []).find((c: any) => c.build === b && c.level === l);
  /** percent of the plain rifle (normal share, same level): on the range by default, or against a sandbag that shoots back */
  const ratio = (b: string, v: string, l: number, t = 'range') => { const get = (bb: string, vv: string) => (t === 'range' ? rangeC(bb, vv, l) : bag(bb, vv, l, t)); const a = get(b, v), y = get('plain_gun', 'normal'); return a && y && y.dmgPerTurn ? Math.round((a.dmgPerTurn / y.dmgPerTurn) * 100) : null; };
  const hasRange = !!(D.range || []).length;
  const ratio4 = (b: string, v: string, l: number) => { const a = rangeC(b, v, l), y = rangeC('plain_gun', 'normal', l); return a && y && y.dmgPerTurnFirst4 ? Math.round((a.dmgPerTurnFirst4 / y.dmgPerTurnFirst4) * 100) : null; };

  L.push('# Balance baseline: the fight simulator (generated ' + D.meta.generated + ')', '',
    'Made by `packages/engine/test/balance/` (the fight simulator, instrument 1 of `docs/design/proposals/2026-11-balance-pass.md`). ' + (D.meta.enemyLevels ? '**This measures the game as it is, with enemies of the character\'s or the squad\'s level (rules 1.15).**' : '**Nothing was changed: this measures the game as it is.**') + ' Whole fights are played through the real rules with seeded dice: the player side by a fixed way of playing (section 12 says exactly what each one does and does not do), the enemies by the engine\'s own AI. '
    + (D.meta.quick ? '**This is the quick run (' + D.meta.seedsPerDuel + ' fight a row): the numbers are a smoke test, not a baseline.**' : D.meta.seedsPerDuel + ' fights a row for duels, ' + D.meta.seedsPerLongFight + ' for the long fights; the run took ' + D.meta.seconds + ' seconds.')
    + ' Run it again with `BALANCE_SIM_OUT=docs/design/handoffs npx vitest run --root packages/engine test/balance/balance-sim.test.ts`.', '',
    '**How to read it.** "Normal share" is a character who put ' + Math.round(D.meta.normalShare * 100) + '% of all Skill points in the main attack skill (4 of 10 at creation; the rest in defence and utility). "All in" raises the main skill and its attribute as fast as the level\'s ceiling allows. "Damage a turn" counts every turn the character took, walking and reloading turns included. Damage is what the hit dealt, not cut off at the target\'s last HP. Three kinds of fight are used: **the shooting range** (8 turns on a target with a soldier\'s numbers that never acts: damage with nothing in the way), **the sandbag under fire** (the same target shooting back with a soldier\'s rifle, for 8 rounds or until the character goes down), and **real fights** (duels, focus, squads) that end when one side is down. **' + (D.meta.enemyLevels ? 'Every enemy is the level of the character or squad it faces; at level 1 the four tiers are' : 'The engine has no enemy levels today: the same four tiers') + ' (' + TIERS.map((t) => TN[t] + ' ' + D.meta.enemies[t].hp + ' HP, Defense ' + D.meta.enemies[t].defense + ', armour ' + D.meta.enemies[t].armour).join('; ') + ')' + (D.meta.enemyLevels ? ', and the level table raises them (`data/enemies.json`).' : ' face a level 1 and a level 20 character.') + '**', '');

  // ---------- 1. the summary ----------
  // Ten findings, the ones that decide the most first. Every sentence is computed from the data.
  const F: string[] = [];
  const lvls = (f: (l: number) => number | null | undefined) => lv.map(f).filter((x) => x != null) as number[];
  /** where a measured span sits against a target span, in words */
  const verdict = (xs: number[], t: number[]) => (!xs.length ? '' : Math.max(...xs) < t[0] ? 'below the target' : Math.min(...xs) > t[1] ? 'above the target' : Math.min(...xs) >= t[0] && Math.max(...xs) <= t[1] ? 'inside the target' : 'partly inside the target');
  const byLevel = (f: (l: number) => any) => lv.map((l) => 'level ' + l + ': ' + f(l)).join('; ');
  { // 1. hits to kill
    const row = (l: number) => TIERS.map((t) => { const p = pvw('plain_gun', 'normal', l, t); return p && p.hit ? TN[t].toLowerCase() + ' ' + Math.ceil(p.foeHp / p.hit) : null; }).filter(Boolean).join(', ');
    const need = (l: number, t: string) => { const p = pvw('plain_gun', 'normal', l, t); return p && p.hit ? Math.ceil(p.foeHp / p.hit) : null; };
    const vs = TIERS.map((t) => TN[t].toLowerCase() + ' ' + verdict(lvls((l) => need(l, t)), (TGT.kill as any)[t])).join(', ');
    F.push('**Attacks to kill an enemy (' + vs + ').** The yardstick (service rifle, normal share) needs these hits that land to kill, at level ' + lo + ': ' + row(lo) + '; at level ' + hi + ': ' + row(hi) + '. Target: minion 2, soldier 3 to 4, elite 6 to 8, boss about 20. ' + (D.meta.enemyLevels ? 'Enemies are the character\'s level' : 'Enemies have no levels, so the gap widens as characters grow') + ' (section 4.2).'); }
  { // 2. fight length
    const sq = D.squads.filter((r: any) => r.size === 4), sr = (f: string, m: string) => range(sq.filter((r: any) => r.fight === f && r.map === m && r.wins).map((r: any) => Math.round((r.winRounds / r.wins) * 10) / 10));
    const won = sq.reduce((n: number, r: any) => n + r.wins, 0), all = sq.reduce((n: number, r: any) => n + r.n, 0);
    const num = (f: string) => sq.filter((r: any) => r.fight === f && r.wins).map((r: any) => r.winRounds / r.wins);
    F.push('**Fight length (standard fight: ' + verdict(num('standard'), TGT.rounds.soldier) + '; boss fight: ' + verdict(num('boss'), TGT.rounds.boss) + ').** A squad of four wins the standard fight in ' + sr('standard', 'open') + ' rounds on open ground and ' + sr('standard', 'cover') + ' with cover, and the boss fight in ' + sr('boss', 'open') + ' and ' + sr('boss', 'cover') + ' (levels 1 to 20; it won ' + won + ' of ' + all + '). Targets: 4 to 6 rounds, boss 8 to 10 (section 11).'); }
  { // 3. the ratios
    const one = (b: string, v: string, t?: string) => range(lvls((l) => ratio(b, v, l, t))) + '%';
    const list = (v: string, t?: string) => 'optimised gun ' + one('opt_gun', v, t) + ', optimised blade ' + one('opt_blade', v, t) + ', Sigil ' + one('sigil', v, t) + ', Outburst ' + one('outburst', v, t) + ', Faith ' + one('faith', v, t) + ', plain blade ' + one('plain_blade', v, t) + ', tank ' + one('tank', v, t) + ', Calls leader ' + one('calls', v, t);
    const f4 = (b: string) => range(lvls((l) => ratio4(b, 'normal', l))) + '%', has4 = lvls((l) => ratio4('sigil', 'normal', l)).length > 0;
    F.push('**Damage a turn against the plain rifle (100%), normal share, lowest to highest over levels ' + lo + ' to ' + hi + '.** ' + (hasRange ? 'On the shooting range, 8 turns: ' + list('normal') + '.' + (has4 ? ' Over the first 4 turns only (a fight of the target length): Sigil ' + f4('sigil') + ', Outburst ' + f4('outburst') + ', optimised gun ' + f4('opt_gun') + ', optimised blade ' + f4('opt_blade') + ' (it walks for most of the first turn).' : '') + ' Under fire (the target shoots back): ' + list('normal', 'sim_bag_soldier') + '.' : list('normal', 'sim_bag_soldier') + '.')
      + ' Targets: optimised physical 150%, Sigil up to 150% on average over the fight, Outburst 125% steady. The casters are played in a simple fixed way (section 12): read theirs as a floor. Section 3.1 has every level.'); }
  { // 4. what techniques add
    const add = (b: string) => lvls((l) => { const a = rangeC(b, 'normal', l), p = plainOf(b, l); return a && p && p.dmgPerTurn ? Math.round((a.dmgPerTurn / p.dmgPerTurn) * 100) : null; });
    const tech = (b: string) => range(lvls((l) => rangeC(b, 'normal', l)?.apShare?.technique));
    const g = add('opt_gun'), m = add('opt_blade');
    const wd = (id: string) => (typeof (WEAPON[id] as any)?.damage === 'number' ? (WEAPON[id] as any).damage : '?');
    if (g.length && m.length) F.push('**' + (Math.max(...g, ...m) <= 125 ? 'The optimised builds get their damage from the weapon, not from techniques.' : 'What techniques add to the optimised builds.') + '** With the same sheet and gear on the shooting range, the optimised gun with its techniques does ' + range(g) + '% of what it does with plain shots only, and spends ' + tech('opt_gun') + '% of its AP on techniques' + (Math.max(0, ...lvls((l) => rangeC('opt_gun', 'normal', l)?.apShare?.technique)) === 0 ? ': it used none, so the spread around 100% is dice' : '') + ' (the way it is played picks a technique only when it beats the plain shot for its AP; against a target that is not Pressed none does). The optimised blade with its techniques does ' + range(m) + '% of its own plain cuts (' + tech('opt_blade') + '% of its AP on techniques). The gun\'s place against the 150% target is its weapon: a long rifle\'s base damage is ' + wd('long_rifle') + ', the service rifle\'s ' + wd('hellraiser_service_rifle') + ', at the same AP a shot.'); }
  { // 5. biggest hits
    const all = [...D.duel, ...D.bag, ...(D.range || []), ...D.peak].filter((c: any) => c.bigHit > 0).sort((a: any, b: any) => b.bigHit - a.bigHit), seen = new Set<string>(), top: any[] = [];
    for (const c of all) { if (seen.has(c.build)) continue; seen.add(c.build); top.push(c); if (top.length >= 4) break; }
    const over = [...new Set(all.filter((c: any) => c.bigHit > TGT.megaCrit).map((c: any) => BUILD[c.build].label))];
    const noCrit = [...D.duel, ...D.bag, ...(D.range || []), ...D.peak, ...D.focus].filter((c: any) => c.bigHit > TGT.bigHit && !/critical/i.test(c.bigHitWhat || ''));
    const cards = (D.peakCards || []).filter((x: any) => x.cards?.[0]).map((x: any) => ({ ...x.cards[0], build: x.build, variant: x.variant, level: x.level })).sort((x: any, y: any) => y.crit - x.crit);
    const cardLine = ['opt_gun', 'opt_blade'].map((b) => cards.find((c: any) => c.build === b)).filter(Boolean).map((c: any) => c.name + ' (' + BUILD[c.build].label + ', ' + VN[c.variant] + ', level ' + c.level + '): ' + c.hit + ' on a hit, ' + c.crit + ' on a critical').join('; ');
    F.push('**The biggest single hits in a fight:** ' + top.map((c: any) => c.bigHit + ' (' + BUILD[c.build].label + ', ' + VN[c.variant] + ', level ' + c.level + ': ' + c.bigHitWhat + ')').join('; ') + '. Targets: 350 a hit, 500 on a mega critical. ' + (over.length ? 'Past 500 in a fight: ' + over.join(', ') + '.' : 'Nothing passed 500 in a fight.') + ' ' + (noCrit.length ? 'Past 350 without a critical: ' + [...new Set(noCrit.map((c: any) => BUILD[c.build].label))].join(', ') + '.' : 'Nothing passed 350 without a critical.') + (cardLine ? ' On the engine\'s own card with the price fully met (section 3.4), against a boss: ' + cardLine + '.' : '') + ' The reference weapons are not the hardest-hitting in the data (the breacher tube and the bows hit harder: `balance-baseline.md`).'); }
  { // 6. accuracy and criticals
    const a = pvw('plain_gun', 'normal', lo, 'soldier'), b = pvw('plain_gun', 'normal', hi, 'soldier'), c = pvw('plain_gun', 'allin', hi, 'soldier');
    const cs = (D.range?.length ? D.range : D.bag).filter((x: any) => x.critShare != null && x.variant === 'normal' && ['plain_gun', 'plain_blade', 'opt_gun', 'opt_blade'].includes(x.build)).map((x: any) => x.critShare);
    const row = (l: number) => TIERS.map((t) => { const p = pvw('plain_gun', 'normal', l, t); return p ? TN[t].toLowerCase() + ' ' + p.pct + '%' : null; }).filter(Boolean).join(', ');
    F.push('**' + (D.meta.enemyLevels ? 'Accuracy and criticals.' : 'Accuracy starts near the target and climbs past it; a critical is far bigger than ×1.5.') + '** Hit chance of the yardstick\'s first shot at 4 tiles on open ground, level ' + lo + ': ' + row(lo) + '; level ' + hi + ': ' + row(hi) + ' (target: about 65% at equal level' + (D.meta.enemyLevels ? '' : '; enemy Defense does not move with level') + '). A critical multiplies the yardstick\'s damage by ' + n1(a?.critMult) + ' at level ' + lo + ' and ' + n1(b?.critMult) + ' at level ' + hi + (c ? ' (' + n1(c.critMult) + ' all in)' : '') + ' (target: ×1.5, to ×2 with perks and gear). Criticals were ' + range(cs) + '% of the weapon builds\' damage (proposed limit: 20%).'); }
  { // 7. how hard enemies hit, and how long a character lasts
    const raw = TIERS.map((t) => { const p = pvw('plain_gun', 'normal', lo, t); return p?.foe?.raw != null ? TN[t].toLowerCase() + ' ' + p.foe.raw : null; }).filter(Boolean).join(', ');
    const row = (l: number) => TIERS.filter((t) => tiers.includes(t)).map((t) => { const c = duel('plain_gun', 'normal', l, t); return c ? TN[t].toLowerCase() + ' ' + (c.foeTurnsToDown != null ? n1(c.foeTurnsToDown) : 'never hurt') : null; }).filter(Boolean).join(', ');
    const fc = (l: number) => Object.keys(FOCUS).map((t) => { const c = D.focus.find((x: any) => x.build === 'plain_gun' && x.level === l && x.tier === t); return c ? FOCUS[t] + ' ' + TN[t].toLowerCase() + 's: down in ' + pc(c.downedPct) + ' of fights' + (c.downedRound != null ? ' (round ' + n1(c.downedRound) + ' on average)' : '') : null; }).filter(Boolean).join('; ');
    F.push('**How hard enemies hit, and how long a character lasts.** A plain hit before armour, with the weapon each tier carries here: ' + raw + '. Turns of ONE enemy to take the yardstick character from full HP to 0, level ' + lo + ': ' + row(lo) + '; level ' + hi + ': ' + row(hi) + '. With every enemy on it, ' + [lo, mid, hi].filter((l, i, a) => a.indexOf(l) === i).map((l) => 'at level ' + l + ', ' + fc(l)).join(' | ') + '. Target: 3 turns of focus (which of the two readings is meant is question 1).'); }
  { // 8. the tank
    const ls = lvls((l) => { const t = duel('tank', 'normal', l, 'elite') || duel('tank', 'normal', l, 'boss'), p = duel('plain_gun', 'normal', l, 'elite') || duel('plain_gun', 'normal', l, 'boss'); return t && p && p.takenPerFoeTurn > 0 ? Math.round((t.takenPerFoeTurn / p.takenPerFoeTurn) * 100) : null; });
    F.push('**The tank takes ' + range(ls) + '% of the damage the plain rifleman takes from an elite, per enemy turn, and deals ' + range(lvls((l) => ratio('tank', 'normal', l))) + '% of his damage on the range (' + range(lvls((l) => ratio('tank', 'normal', l, 'sim_bag_soldier'))) + '% under fire).** Under fire it spends ' + range(lvls((l) => bag('tank', 'normal', l)?.apShare?.move)) + '% of its AP walking and ' + range(lvls((l) => bag('tank', 'normal', l)?.apShare?.setup)) + '% on Guard. It wears the heaviest armour it can carry and still walk 1 tile an AP (section 2, assumption 4).'); }
  { // 9. resources and AP
    const mE = (src: (b: string, v: string, l: number) => any) => range(lvls((l) => src('opt_blade', 'normal', l)?.res?.momentum?.emptyPct));
    const mp = range(lvls((l) => rangeC('outburst', 'normal', l)?.res?.mp?.emptyPct)), st = range(lvls((l) => rangeC('outburst', 'normal', l)?.res?.strain?.cappedPct));
    const un = Math.max(0, ...(D.range?.length ? D.range : D.bag).map((c: any) => c.apUnspentShare || 0)), ob = rangeC('outburst', 'normal', mid);
    const over = [...D.bag, ...(D.range || [])].filter((c: any) => c.apOver6PerTurn > 0).length;
    F.push('**Resources and AP.** The Fighter\'s Momentum was empty at the start of ' + mE(bag) + '% of its turns under fire (' + mE(rangeC) + '% on the range) (every hit taken costs 1; only a plain cut that lands gives 1). The Outburst caster at level ' + mid + ' spent ' + n1(ob?.res?.mp?.spentPerFight) + ' MP over 8 turns on the range from a pool of ' + n1(ob?.res?.mp?.max) + ', kept going by Syphon (' + n1((ob?.actions?.Syphon || 0) / (ob?.fights || 1)) + ' a fight); it started ' + mp + '% of its turns with no MP and ' + st + '% at its Strain limit. The Sigil caster started ' + range(lvls((l) => rangeC('sigil', 'normal', l)?.res?.cores?.emptyPct)) + '% of its turns with no spare core left (a 4-glyph Line and its Evoke burn most of a core; the kit carries 4 spares). No build left more than ' + un + '% of its AP unspent; ' + (over ? 'AP above 6 was seen in ' + over + ' of the 8-turn rows (section 5 names the sources).' : 'no turn of the 8-turn fights started above 6 AP.') + ' Section 9 has every resource.'); }
  { // 10. growth
    const g = (b: string) => { const a = rangeC(b, 'normal', lo), z = rangeC(b, 'normal', hi); return a && z && a.dmgPerTurn ? '×' + n1(z.dmgPerTurn / a.dmgPerTurn) + ' damage, ×' + n1(z.hp / a.hp) + ' HP' : null; };
    F.push('**Growth from level ' + lo + ' to ' + hi + ' (normal share, on the range):** plain rifle ' + g('plain_gun') + '; optimised gun ' + g('opt_gun') + '; optimised blade ' + g('opt_blade') + '; Sigil ' + g('sigil') + '; Outburst ' + g('outburst') + '. Target (proposed): damage and HP each about ×3 to ×4, in step. ' + (D.meta.enemyLevels ? 'On the range the target is the character\'s level, so its Defense and armour grow too: read the damage growth as growth against an equal enemy.' : 'Enemies grow ×1: they have no levels.')); }
  L.push('## 1. Summary: what matters most, against the targets', '', ...F.map((s, i) => (i + 1) + '. ' + s), '');
  { const pl = Math.max(0, ...D.duel.map((c: any) => c.lostRun), ...D.focus.map((c: any) => c.lostRun), ...D.squads.map((r: any) => r.lostRun)), fl = Math.max(0, ...D.duel.map((c: any) => c.foeLostRun), ...D.bag.map((c: any) => c.foeLostRun), ...D.peak.map((c: any) => c.foeLostRun), ...D.squads.map((r: any) => r.foeLostRun));
    L.push('**What this report cannot tell you** (details in section 12):', '',
      '1. **Control** (rule: never two lost turns in a row). The longest run seen was ' + pl + ' for a character and ' + fl + ' for an enemy, but the ways of playing never use control on purpose. A squad built to stun is not measured here.',
      '2. **The ceiling of the casters.** The Sigil caster plays one kind of Line and the Outburst caster one design. A good player does more.',
      '3. **The worth of the Calls leader, the Faith build\'s support, and anything that is not damage.** Only damage dealt and taken is counted.',
      '4. **The strongest weapons.** The optimised gun is a Masterwork long rifle and the optimised blade a Masterwork greatsword: sensible picks, not the highest numbers in the weapon list.', ''); }
  if (D.meta.errors) L.push('> ' + D.meta.errors + ' fight(s) hit a problem the simulator could not play through (counted in the JSON as `errors`).', '');

  // ---------- 2. the builds ----------
  L.push('## 2. The reference builds', '', 'Every build was made by the game\'s own rules (the creation check, the level table, the attribute ceiling by level, the class of the highest attribute at level 3, perk steps at Mastery). A test asserts it. Assumptions for what play earns and levels do not (**proposed**, not rules):', '',
    '1. Weapon drill on the build\'s own weapon (optimised builds and the tank): mark I by level 3, mark II by level 6, mark III by level 9.',
    '2. Sigil words learned by study: ' + LEVELS.map((l) => WORD_PICKS_AT(l) + ' picks by level ' + l).join(', ') + ' (each still needs a free slot under the Brain Power cap).',
    '3. Devotion of the Faith build: ' + LEVELS.map((l) => DEVOTION_AT(l) + ' at level ' + l).join(', ') + '.',
    '4. Gear: standard quality for the plain builds and the casters\' kit weapons; Masterwork for the optimised builds and the tank; for the tank, the heaviest armour class that its Pain Threshold allows, that its kit stays inside its carry limit with, and that leaves it walking at least 1 tile an AP (with a riot shield and a sabre that is Class 4 from level 3: Class 5 would need Strength 6 to carry); Class 3 for the other weapon builds, the kit\'s own for the rest. No build is overburdened: spare ammunition is cut first. Gear has no level in the rules today.',
    '5. Plain builds take no perk steps (the Mastered perk at 10 points comes by itself). An all-in build holds an Attribute point back when the class attribute is at the level\'s ceiling, for the next ceiling.', '');
  L.push(...tbl(['Build', 'What it is'], BUILDS.map((b) => [b.label + ' (' + b.way + ')', b.note])));
  L.push(...tbl(['Build', 'Share', 'Level', 'Sheet'], D.builds.filter((b: any) => [lo, mid, hi].includes(b.level)).map((b: any) => [b.label, VN[b.variant], b.level, b.sheet + (b.problems.length ? ' **NOT LEGAL: ' + b.problems.join('; ') + '**' : '')])));
  { const notes = D.builds.filter((b: any) => b.notes.some((n: string) => !n.startsWith('techniques'))).map((b: any) => b.label + ', ' + VN[b.variant] + ', level ' + b.level + ': ' + b.notes.filter((n: string) => !n.startsWith('techniques')).join('; '));
    if (notes.length) L.push('Where a build could not have what was wanted:', '', ...[...new Set(notes)].slice(0, 30).map((s, i) => (i + 1) + '. ' + s), ''); }

  // ---------- 3. angle A ----------
  L.push('## 3. Angle A: damage', '', '### 3.1 Damage a turn, against the plain rifle', '', '**On the shooting range.** Eight turns on a target with a soldier\'s Defense (12) and armour (5) and 5,000 HP that never acts: nothing Presses the character, nothing costs it Momentum, nobody goes down. This is the cleanest reading of "take your weapon and attack every turn". Each cell: damage a turn · percent of the plain rifle with a normal share at the same level.', '');
  for (const v of variants) L.push('**' + VN[v] + ', on the range**', '', ...tbl(['Build', ...lv.map((l) => 'Level ' + l)], BUILDS.map((b) => [b.label, ...lv.map((l) => { const c = rangeC(b.id, v, l); return c ? n1(c.dmgPerTurn) + ' · ' + pc(ratio(b.id, v, l)) : '–'; })])));
  if ((D.range || []).some((c: any) => c.dmgPerTurnFirst4 != null)) L.push('**Normal share, on the range, the first 4 turns only** (a fight of the target length: 4 to 6 rounds). A supply that runs out later does not show here; a walk to the target (melee) weighs double. Each cell: damage a turn · percent of the plain rifle over its own first 4 turns.', '',
    ...tbl(['Build', ...lv.map((l) => 'Level ' + l)], BUILDS.map((b) => [b.label, ...lv.map((l) => { const c = rangeC(b.id, 'normal', l); return c ? n1(c.dmgPerTurnFirst4) + ' · ' + pc(ratio4(b.id, 'normal', l)) : '–'; })])));
  if ((D.rangePlain || []).length) L.push('**What the techniques add** (normal share, on the range): the optimised builds with the same sheet and gear, making plain attacks only. Each cell: damage a turn with plain attacks only · with techniques · techniques as a percent of plain.', '',
    ...tbl(['Build', ...lv.map((l) => 'Level ' + l)], ['opt_gun', 'opt_blade'].map((b) => [BUILD[b].label, ...lv.map((l) => { const p = plainOf(b, l), c = rangeC(b, 'normal', l); return p && c ? n1(p.dmgPerTurn) + ' · ' + n1(c.dmgPerTurn) + ' · ' + (p.dmgPerTurn ? pc((c.dmgPerTurn / p.dmgPerTurn) * 100) : '–') : '–'; })])));
  L.push('**Under fire.** The same target, shooting back with a soldier\'s rifle (Suppress and Burst), for 8 rounds or until the character goes down. Each cell: damage a turn · percent of the plain rifle (normal share, same level, also under fire) · rounds the character lasted, on average. A character that goes down early never finishes what it was setting up.', '');
  for (const v of variants) L.push('**' + VN[v] + ', under fire**', '', ...tbl(['Build', ...lv.map((l) => 'Level ' + l)], BUILDS.map((b) => [b.label, ...lv.map((l) => { const c = bag(b.id, v, l); return c ? n1(c.dmgPerTurn) + ' · ' + pc(ratio(b.id, v, l, 'sim_bag_soldier')) + ' · ' + n1(c.rounds) : '–'; })])));
  if (D.bag.some((c: any) => c.tier === 'sim_bag_boss')) L.push('**Normal share, under fire from a target with a boss\'s numbers** (Defense 14, armour 10, a light machine gun)', '', ...tbl(['Build', ...lv.map((l) => 'Level ' + l)], BUILDS.map((b) => [b.label, ...lv.map((l) => { const c = bag(b.id, 'normal', l, 'sim_bag_boss'); return c ? n1(c.dmgPerTurn) + ' · ' + pc(ratio(b.id, 'normal', l, 'sim_bag_boss')) : '–'; })])));
  L.push('### 3.2 The biggest single hit of each build, and what made it', '', 'Over every fight of this run.', '');
  L.push(...tbl(['Build', 'Share', ...lv.map((l) => 'Level ' + l)], BUILDS.flatMap((b) => variants.map((v) => [b.label, VN[v], ...lv.map((l) => { const cs = [...D.duel, ...D.bag, ...(D.range || []), ...D.peak, ...D.focus].filter((c: any) => c.build === b.id && c.variant === v && c.level === l).sort((x: any, y: any) => y.bigHit - x.bigHit)[0]; return cs && cs.bigHit ? cs.bigHit + ' (' + cs.bigHitWhat + ')' : '–'; })]))));
  L.push('### 3.3 The peak: each build\'s dearest move, with its whole price', '', 'Played to set the move up and use it (a target with a boss\'s numbers and 5,000 HP that shoots back; 8 rounds or until the character goes down). Each row is **the biggest single action that happened** in those fights (a lucky critical counts), not an average. "Damage" is everything that one use dealt; "one hit" its biggest single hit; the price is everything spent from the first action of the move to the last.', '');
  L.push(...tbl(['Build', 'Share', 'Level', 'The biggest action seen', 'Damage', 'One hit', 'Price', 'On turn', 'Damage a turn, whole fight'], D.peak.map((c: any) => [BUILD[c.build].label, VN[c.variant], c.level, c.bigAction?.what || '–', c.bigAction?.dmg ?? '–', c.bigAction?.hit ?? '–', priceLine(c.bigAction?.price), c.bigAction?.turn ?? '–', n1(c.dmgPerTurn)])));

  { const used = (b: string, re: RegExp) => D.peak.filter((c: any) => c.build === b).reduce((n: number, c: any) => n + Object.entries(c.actions || {}).filter(([k]) => re.test(k)).reduce((m, [, v]) => m + (v as number), 0), 0), fights = (b: string) => D.peak.filter((c: any) => c.build === b).reduce((n: number, c: any) => n + c.fights, 0);
    if (fights('opt_gun')) L.push('How often the dearest move was really made in these fights: the optimised gun used Dead Centre ' + used('opt_gun', /Dead Centre/) + ' times in ' + fights('opt_gun') + ' fights (it needs a Pressed target; one shooter with no Suppress ready gives 1 Pressure a turn, and Pressed is 2, so alone it fires Aimed Shots: its peak is on the card in 3.4, and in a squad). The optimised blade used a Finisher ' + used('opt_blade', /Coup|Cleave|Break|Run Through/) + ' times in ' + fights('opt_blade') + ' fights' + (fights('faith') ? '; the Faith build called its Miracle ' + used('faith', /Miracle/) + ' times in ' + fights('faith') : '') + '.', ''); }
  L.push('### 3.4 The weapon builds\' dearest technique on its card, with its price fully met', '', 'The engine\'s own card for each technique, against a boss (Defense 14, armour 10), staged so the price is met: Momentum full, the target Pressed as far as Pressure goes, 6 AP. This is what the move does when everything it asks for is there; the fights above show how often that happens. Each cell: the technique · chance to hit · damage on a hit · on a critical · its price.', '');
  L.push(...tbl(['Build', 'Share', ...lv.map((l) => 'Level ' + l)], ['opt_gun', 'opt_blade', 'tank', 'plain_gun', 'plain_blade'].flatMap((b) => variants.map((v) => [BUILD[b].label, VN[v], ...lv.map((l) => { const c = (D.peakCards || []).find((x: any) => x.build === b && x.variant === v && x.level === l)?.cards?.[0]; if (!c) return '–';
    const price = [c.ap + ' AP', c.momentum ? c.momentum + ' Momentum (of ' + c.momentumMax + ')' : '', c.rounds ? c.rounds + ' round' + (c.rounds === 1 ? '' : 's') : '', c.needsPressed ? 'a Pressed target' : ''].filter(Boolean).join(', ');
    return c.name + (c.rolls > 1 ? ' (' + c.rolls + ' rolls)' : '') + ' · ' + c.pct + '% · ' + c.hit + ' · ' + c.crit + ' · ' + price; })]))));
  // ---------- 4. angle C ----------
  L.push('## 4. Angle C: time to kill, both ways', '', '### 4.1 Rounds to win, one character against one enemy (open ground, normal share)', '', 'Each cell: rounds to win · percent of fights won. A fight stops at 12 rounds.', '');
  for (const t of tiers) L.push('**' + TN[t] + '**', '', ...tbl(['Build', ...lv.map((l) => 'Level ' + l)], BUILDS.map((b) => [b.label, ...lv.map((l) => { const c = duel(b.id, 'normal', l, t); return c ? n1(c.roundsToWin) + ' · ' + pc(c.winPct) : '–'; })])));
  L.push('### 4.2 Attacks that land to kill one enemy (the engine\'s own numbers for a plain attack at 4 tiles)', '', 'Target: minion 2, soldier 3 to 4, elite 6 to 8, boss about 20.', '');
  L.push(...tbl(['Build', 'Share', 'Level', ...TIERS.map((t) => TN[t] + ': damage a hit · hits to kill')], D.previews.filter((p: any) => ['plain_gun', 'plain_blade', 'opt_gun', 'opt_blade'].includes(p.build) && p.tier === 'minion').map((p: any) => [BUILD[p.build].label, VN[p.variant], p.level, ...TIERS.map((t) => { const q = pvw(p.build, p.variant, p.level, t); return q && q.hit ? q.hit + ' · ' + Math.ceil(q.foeHp / q.hit) : '–'; })])));
  L.push('### 4.3 Damage taken, and how long a character lasts against one enemy (normal share)', '', 'Each cell: damage taken per enemy turn · enemy turns to take the character from full HP to 0. Target: 3 turns of focus (a tank longer).', '');
  for (const t of tiers) L.push('**' + TN[t] + '**', '', ...tbl(['Build', ...lv.map((l) => 'Level ' + l)], BUILDS.map((b) => [b.label, ...lv.map((l) => { const c = duel(b.id, 'normal', l, t); return c ? (c.takenPerFoeTurn ? n1(c.takenPerFoeTurn) + ' · ' + n1(c.foeTurnsToDown) : 'not hit') : '–'; })])));
  L.push('### 4.4 Focus: every enemy on one character (normal share)', '', 'Each cell: percent of fights in which the character went down · the round it went down, on average · percent won.', '');
  for (const [t, k] of Object.entries(FOCUS)) if (D.focus.some((c: any) => c.tier === t)) L.push('**' + k + ' ' + TN[t].toLowerCase() + 's**', '', ...tbl(['Build', ...lv.map((l) => 'Level ' + l)], BUILDS.filter((b) => D.focus.some((c: any) => c.build === b.id)).map((b) => [b.label, ...lv.map((l) => { const c = D.focus.find((x: any) => x.build === b.id && x.level === l && x.tier === t); return c ? pc(c.downedPct) + ' · ' + n1(c.downedRound) + ' · ' + pc(c.winPct) : '–'; })])));

  // ---------- 5. angle B ----------
  L.push('## 5. Angle B: the AP economy', '', 'From the sandbag under fire (soldier numbers, 8 rounds or until the character goes down), normal share. AP a turn is what the turn started with; the shares are of all AP the character had.', '');
  L.push(...tbl(['Build', 'Level', 'AP a turn', 'Above 6, a turn', 'Turns at 9', 'Attacks', 'Techniques', 'Spells and prayers', 'Calls', 'Moving', 'Reload and jams', 'Set-up', 'Unspent', 'Damage per AP spent', 'Damage per AP on attacks'],
    BUILDS.flatMap((b) => [lo, mid, hi].map((l) => { const c = bag(b.id, 'normal', l); if (!c) return null; const s = c.apShare; return [b.label, l, c.apPerTurn, c.apOver6PerTurn, pc(c.turns9Pct), pc(s.attack), pc(s.technique), pc((s.spell || 0) + (s.prayer || 0)), pc(s.call), pc(s.move), pc(s.reload), pc(s.setup), pc(c.apUnspentShare), c.dmgPerAp, c.dmgPerAttackAp]; }).filter(Boolean) as any[][])));
  { const why: Record<string, number> = {}; for (const c of [...D.bag, ...D.duel, ...D.focus]) for (const [k, v] of Object.entries(c.apOverWhy || {})) why[BUILD[c.build].label + ': ' + k] = (why[BUILD[c.build].label + ': ' + k] || 0) + (v as number);
    const rows = Object.entries(why).sort((a, b) => b[1] - a[1]).slice(0, 12);
    L.push('**Where AP above 6 came from** (the log line of the turn it arrived, times seen):', '', ...(rows.length ? rows.map(([k, v], i) => (i + 1) + '. ' + k + ' (' + v + ')') : ['1. No turn started above 6 AP in these fights.']), ''); }
  L.push('**What each build did with its turns** (actions used over the 8-round fights at level ' + mid + ', normal share, per fight):', '', ...tbl(['Build', 'Actions'], BUILDS.map((b) => { const c = bag(b.id, 'normal', mid); return [b.label, c ? Object.entries(c.actions).sort((x: any, y: any) => y[1] - x[1]).slice(0, 8).map(([k, v]: any) => k + ' ' + n1(v / c.fights)).join(' · ') : '–']; })));

  // ---------- 6. angle D ----------
  L.push('## 6. Angle D: accuracy and critical hits', '', '### 6.1 Hit chance of a plain attack (the engine\'s own number: 4 tiles for a gun, next to the target for a blade, open ground)', '', 'The first attack of a turn, with nobody Pressed or hurt. Later shots of a turn are lower (Recoil, Heat), and a Pressed character is at −1. Target: about 65% at equal level.', '');
  L.push(...tbl(['Build', 'Share', 'Level', ...TIERS.map((t) => TN[t] + ' (Defense ' + D.meta.enemies[t].defense + ')'), 'Critical ×'], D.previews.filter((p: any) => p.tier === 'minion').map((p: any) => [BUILD[p.build].label, VN[p.variant], p.level, ...TIERS.map((t) => pc(pvw(p.build, p.variant, p.level, t)?.pct)), n1(p.critMult)])));
  L.push('### 6.2 What the fights showed (the sandbag under fire, soldier numbers, normal share)', '', 'Each cell: attacks that hit · attacks that were critical · share of all damage that came from criticals. Spells and prayers are not attack rolls of a weapon and are left out of the first two.', '');
  L.push(...tbl(['Build', ...lv.map((l) => 'Level ' + l)], BUILDS.map((b) => [b.label, ...lv.map((l) => { const c = bag(b.id, 'normal', l); return c ? pc(c.hitPct) + ' · ' + pc(c.critPct) + ' · ' + pc(c.critShare) : '–'; })])));
  if (D.duel.some((c: any) => c.map === 'cover')) L.push('### 6.3 Open ground against ground with cover (one enemy, normal share)', '', 'Each cell: the character\'s hit chance in the fight, open · with cover; then the enemy\'s hit chance on the character, open · with cover.', '',
    ...tbl(['Build', 'Level', ...tiers.map((t) => TN[t])], BUILDS.flatMap((b) => lv.filter((l) => duel(b.id, 'normal', l, tiers[0], 'cover')).map((l) => [b.label, l, ...tiers.map((t) => { const o = duel(b.id, 'normal', l, t), c = duel(b.id, 'normal', l, t, 'cover'); return o && c ? pc(o.hitPct) + ' · ' + pc(c.hitPct) + ' ; ' + pc(o.foeHitPct) + ' · ' + pc(c.foeHitPct) : '–'; })]))));

  // ---------- 7. angle E ----------
  L.push('## 7. Angle E: defence stacked on the tank', '', 'Every source of "less damage" the tank build holds, and what gets through. The first columns are the engine\'s own numbers for the enemy\'s plain attack on it; the last two are measured in the fights (Guard, the shield and the perks act there).', '');
  L.push(...tbl(['Level', 'Share', 'Enemy', 'Enemy hits the rifleman', 'Enemy hits the tank', 'A hit before armour', 'After the tank\'s armour', 'Tank: damage per enemy turn', 'Rifleman: damage per enemy turn', 'What gets through'],
    variants.flatMap((v) => lv.flatMap((l) => tiers.map((t) => { const pt = pvw('tank', v, l, t), pg = pvw('plain_gun', v, l, t), dt = duel('tank', v, l, t), dg = duel('plain_gun', v, l, t); if (!pt || !pg || !dt || !dg) return null;
      return [l, VN[v], TN[t], pc(pg.foe?.pct), pc(pt.foe?.pct), pt.foe?.raw ?? '–', pt.foe?.afterArmour ?? '–', n1(dt.takenPerFoeTurn), n1(dg.takenPerFoeTurn), dg.takenPerFoeTurn > 0 ? pc((dt.takenPerFoeTurn / dg.takenPerFoeTurn) * 100) : '–']; }).filter(Boolean) as any[][]))));
  L.push('The tank\'s sources, as built (normal share):', '', ...lv.map((l, i) => { const b = D.builds.find((x: any) => x.build === 'tank' && x.variant === 'normal' && x.level === l), p = pvw('tank', 'normal', l, 'soldier'); return (i + 1) + '. Level ' + l + ': Defense ' + (p?.pcDef ?? '–') + ', armour ' + (p?.pcArmour ?? '–') + ', Guard pool ' + (p?.guardMax ?? '–') + ' (each point takes 10 off a hit), HP ' + (p?.pcHp ?? '–') + '. ' + (b?.sheet || ''); }), '');

  // ---------- 8. angle F ----------
  L.push('## 8. Angle F: control and saves', '', 'From the duels (all four tiers together, open ground), normal share. "Resisted" is the share of conditions aimed at that side that a save or an immunity stopped (a condition with no save counts as landed). "Pressed" and "Suppressed" are the share of that side\'s turns that started that way (Pressure from being shot at: Suppressed costs 1 AP and the reactions). A lost turn is one the engine passed (Stunned) or that started with no AP. The policies do not use control on purpose, so this shows only what weapons, techniques and spells do on their way.', '');
  L.push(...tbl(['Build', 'Level', 'Character: conditions aimed', 'Resisted', 'Turns Pressed', 'Turns Suppressed', 'Turns lost', 'Longest run', 'Enemy: conditions aimed', 'Resisted', 'Turns Pressed', 'Turns Suppressed', 'Turns lost', 'Longest run'],
    BUILDS.flatMap((b) => [lo, mid, hi].map((l) => { const cs = D.duel.filter((c: any) => c.build === b.id && c.variant === 'normal' && c.level === l && c.map === 'open'); if (!cs.length) return null; const s = (k: string) => cs.reduce((n: number, c: any) => n + (c[k] || 0), 0), avg = (k: string) => { const xs = cs.map((c: any) => c[k]).filter((x: any) => x != null); return xs.length ? Math.round(xs.reduce((a: number, x: number) => a + x, 0) / xs.length) : null; };
      return [b.label, l, s('conds'), pc(avg('saveMadePct')), pc(avg('pressedPct')), pc(avg('suppressedPct')), pc(avg('lostTurnPct')), Math.max(...cs.map((c: any) => c.lostRun)), s('foeConds'), pc(avg('foeSaveMadePct')), pc(avg('foePressedPct')), pc(avg('foeSuppressedPct')), pc(avg('foeLostTurnPct')), Math.max(...cs.map((c: any) => c.foeLostRun))]; }).filter(Boolean) as any[][])));

  // ---------- 9. angle G ----------
  L.push('## 9. Angle G: resources', '', 'From the sandbag under fire (soldier numbers, 8 rounds or until the character goes down), normal share, level ' + mid + ' and ' + hi + '. Earned and spent are per fight. "Empty" and "at its cap" are the share of the character\'s turns that started that way. Target (proposed): each resource should bind in about one turn out of three; one that is never empty or never spent is cut or re-priced.', '');
  const RN: Record<string, string> = { momentum: 'Momentum', guard: 'Guard', heat: 'Heat', ammo: 'Rounds in the weapon', mp: 'MP', strain: 'Strain', flux: 'Flux', charge: 'Core charge', cores: 'Spare cores', echo: 'Echo', reactions: 'Reactions used' };
  L.push(...tbl(['Build', 'Level', 'Resource', 'Cap', 'Earned', 'Spent', 'Turns empty', 'Turns at its cap'], BUILDS.flatMap((b) => [mid, hi].flatMap((l) => { const c = bag(b.id, 'normal', l); if (!c) return [];
    return Object.entries(c.res).filter(([k, r]: any) => !(k === 'cores' && !r.spentPerFight) && !(k === 'heat' && !r.earnedPerFight)).map(([k, r]: any) => [b.label, l, RN[k] || k, r.max === 99 ? '–' : r.max, r.earnedPerFight, r.spentPerFight, pc(r.emptyPct), k === 'cores' || k === 'reactions' ? '–' : pc(r.cappedPct)]); }))));
  L.push('Notes: Strain, Heat and Flux are "bad" meters (empty is good, the cap is the limit). Echo was never spent: the policies do not reroll. A reaction counts as used in a round the engine marked one used.', '');

  // ---------- 10. angle H ----------
  L.push('## 10. Angle H: growth', '', 'HP, and damage a turn on the shooting range (soldier numbers, 8 turns), by level. The last column is level ' + hi + ' ÷ level ' + lo + '.', '');
  for (const v of variants) L.push('**' + VN[v] + '**', '', ...tbl(['Build', 'What', ...lv.map((l) => 'Level ' + l), 'Growth'], BUILDS.flatMap((b) => { const cs = lv.map((l) => rangeC(b.id, v, l)); if (cs.some((c) => !c)) return []; const a = cs[0], z = cs[cs.length - 1];
    return [[b.label, 'HP', ...cs.map((c) => c.hp), '×' + n1(z.hp / a.hp)], [b.label, 'Damage a turn', ...cs.map((c) => n1(c.dmgPerTurn)), a.dmgPerTurn ? '×' + n1(z.dmgPerTurn / a.dmgPerTurn) : '–']]; })));

  // ---------- 11. angle K ----------
  L.push('## 11. Angle K: squad size', '', 'The squad: ' + SQUAD.map((b, i) => (i + 1) + ' ' + BUILD[b].label).join(', ') + ' (a squad of 2 is the first two, and so on), normal share. Each cell: percent won · rounds to win · characters that went down, per fight.', '');
  for (const [fid, f] of Object.entries(FIGHTS)) for (const map of ['open', 'cover']) { const rows = D.squads.filter((r: any) => r.fight === fid && r.map === map); if (!rows.length) continue; const lvls = [...new Set(rows.map((r: any) => r.level))] as number[];
    L.push('**' + f.name + ', ' + (map === 'open' ? 'open ground' : 'ground with cover') + '**', '', ...tbl(['Squad of', ...lvls.map((l) => 'Level ' + l)], [1, 2, 3, 4].filter((s) => rows.some((r: any) => r.size === s)).map((s) => [s, ...lvls.map((l) => { const r = rows.find((x: any) => x.size === s && x.level === l); return r ? pc((r.wins / r.n) * 100) + ' · ' + (r.wins ? n1(r.winRounds / r.wins) : '–') + ' · ' + n1(r.downs / r.n) : '–'; })]))); }
  { const rows = D.squads.filter((r: any) => r.size === 4 && r.map === 'open');
    if (rows.length) L.push('**Who did what in the squad of four** (open ground; damage a turn · damage taken a fight · Calls made a fight):', '', ...tbl(['Fight', 'Level', ...SQUAD.map((b) => BUILD[b].label)], rows.map((r: any) => [FIGHTS[r.fight].name.split(':')[0], r.level, ...SQUAD.map((b) => { const q = r.per[b]; return q ? n1(q.turns ? q.dmg / q.turns : 0) + ' · ' + n1(q.taken / r.n) + ' · ' + n1(q.calls / r.n) : '–'; })]))); }

  // ---------- 12. method and limits ----------
  L.push('## 12. How the player side plays, and what it cannot play', '', 'Each build is played the same way every fight, deciding only from what the game\'s own cards show a player:', '',
    '1. **Plain (the two plain builds):** the weapon\'s plain attack at the target with the best expected damage. If nothing can be attacked: reload, clear a jam or brace; else walk the cheapest way to a tile it can attack from. When only the AP is short it stays where it is.',
    '2. **Optimised (gun, blade):** it lists the plain attack and every ready technique that aims at an enemy, against every enemy in sight, works out the expected damage of each (hit chance × damage after armour, criticals counted) and divides by its AP; it uses the best one, and repeats until the AP runs out. It looks one action ahead only.',
    '3. **Peak:** the same list, but it takes the single biggest expected hit it can afford, so the dearest move is used as soon as its price is met. With a melee weapon the Finisher is held until Momentum is full (from round 6: 3 or more), and only plain attacks are made until then. The Outburst caster pours in its best feeling and holds for stage 4; the Sigil caster draws its biggest Line; the Faith build calls its Miracle when the engine allows it.',
    '4. **Tank:** as optimised, but the last AP of a turn goes to Guard (Raise Shield, else Brace); when it has to walk, it walks first and guards with the last AP.',
    '5. **Sigil caster:** the strongest single-target damage Line its words, glyph cap, charge and Flux allow, drawn walking away from the target, finished over as many turns as it takes, Evoked at the best target; a fresh core is loaded when the core runs dry (if the AP is short, the Line waits for the next turn); the kit\'s pistol when it can do nothing else.',
    '6. **Outburst caster:** Begin the starting Damage design, Pump while the AP still pays for the Release and the Strain stays inside the limit, Release at the best target, Begin again with what is left.',
    '7. **Faith build:** its patron\'s damaging Hymn whenever the engine allows it by standing (never above its Devotion), plain shots between.',
    '8. **Calls leader:** Rally, Spot, Brief, Threaten, in that order, each when the engine allows it, at most 2 Calls a turn; then the sidearm. Rally and Brief go to the ally holding the hardest-hitting weapon. Alone it has only Threaten, so its own numbers are its pistol\'s: what a leader is worth shows in the squad tables (section 11).', '',
    'The ground: 16 × 11 tiles, the two sides start 11 tiles apart; "open" has no cover, "with cover" has half cover in front of both starting lines and in the middle. Enemy weapons: ' + TIERS.map((t) => TN[t].toLowerCase() + ' ' + String(D.meta.enemyWeapons[t]).replace(/_/g, ' ')).join(', ') + ' (the first weapon the Proving Ground gives each tier).', '',
    '**What the simulator does not play** (so the numbers above are a floor for these):', '', ...D.meta.notPlayed.map((s: string, i: number) => (i + 1) + '. ' + s), '',
    '**Other limits.**', '',
    '1. A fixed way of playing is not a player. A good player beats these numbers with positioning, focus fire and combinations; the tables compare builds played the same simple way.',
    '2. One enemy weapon per tier, one map size, one starting distance. Melee builds pay for the 11 tiles (a turn or more of walking, on the range too); a smaller map would favour them.',
    '3. Damage is counted as dealt, not cut at the last HP: against a minion most of a big hit is wasted, which the "rounds to win" tables show and the "damage a turn" tables do not.',
    '4. The share of damage from criticals counts weapon attacks only: a spell\'s critical is in its damage but is not marked as one.',
    '5. "Conditions resisted" counts conditions the effects stream reports; a save that is rolled without a condition (a push, a pull) is not counted.',
    '6. Drill, Sigil words and Devotion are assumptions (section 2); change them in `packages/engine/test/balance/builds.ts` and run again.', '');
  return L.join('\n') + '\n';
}
