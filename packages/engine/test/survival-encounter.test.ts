// Survival's encounter generator (rules 1.41; survival-spec rules 15 to 22, section 5; build step 3). Every number is
// read from data/survival.json and data/enemies.json. SURVIVAL_ENC_REPORT=1 prints the measured budget table (the
// hand-off's).
import { describe, expect, it, vi } from 'vitest';
import { composeEncounter, budgetFor, foeCost, foeLevel, tierLag, shareOf, anchorDamage, ENC_BUDGET, TEMPLATES, SETTINGS, SETTING, type Encounter, type FightKind } from '../src/run/encounter';
import { ENEMY, WEAPON, MAP_LIMITS, startGap, standable, CASTER, HEART_CASTER } from '../src';
import enemiesJ from '../../../data/enemies.json';
import lootJ from '../../../data/loot_tables.json';
declare const process: { env: Record<string, string | undefined> };
declare const console: { log(...a: unknown[]): void };

const B = ENC_BUDGET;
const SEEDS = 150, LEVELS = [1, 3, 6, 9];
/** The nodes a stage holds by depth (rules 1.40): fights at every open depth, Elites from 4 (not 7 and 9), the gate at
 * 8, the Boss at 15. */
const NODES: { depth: number; kind: string; gate?: boolean }[] = [
  ...Array.from({ length: 13 }, (_, i) => i + 1).filter((d) => d !== 8).map((depth) => ({ depth, kind: 'fight' })),
  ...[4, 5, 6, 10, 11, 12, 13].map((depth) => ({ depth, kind: 'elite' })),
  { depth: 8, kind: 'elite', gate: true }, { depth: 15, kind: 'boss' },
];
const fk = (n: { kind: string; gate?: boolean }): FightKind => (n.gate ? 'gate' : n.kind as FightKind);
const cases: { n: number; level: number; stage: number; node: typeof NODES[number]; e: Encounter }[] = [];
for (let s = 0; s < SEEDS; s++) for (let n = 1; n <= 4; n++) for (const level of LEVELS) for (const node of NODES) {
  const stage = 1 + (s % 3); // stages 1 to 3: the stage term and the Elites' lead are exercised too
  cases.push({ n, level, stage, node, e: composeEncounter({ levels: Array(n).fill(level), node: { id: 's' + stage + '.d' + node.depth + '.' + (s % 4) + (node.gate ? 'g' : node.kind[0]), ...node }, stage, setting: SETTINGS[s % SETTINGS.length].id, seed: 'seed-' + s }) });
}

describe('Survival encounters (rules 1.41)', () => {
  it('the lag is the enemies.json tier field: Vermin and Minions 3, Soldiers 1 (2 from fight level 10), Elites and Bosses 0', () => {
    for (const t of (enemiesJ as any).items) expect(Array.isArray(t.lag), t.id).toBe(true);
    expect([1, 9, 10, 20].map((L) => tierLag('soldier', L))).toEqual([1, 1, 2, 2]);
    expect(tierLag('minion', 5)).toBe(3); expect(tierLag('vermin', 5)).toBe(3); expect(tierLag('elite', 12)).toBe(0); expect(tierLag('boss', 12)).toBe(0);
    expect(foeLevel('minion', 2, 1)).toBe(1); expect(foeLevel('soldier', 10, 1)).toBe(8); expect(foeLevel('elite', 6, 1)).toBe(6);
    // rule 19 (rules 1.49: the lead from data): stage s puts them min((s - 1) x elite_up.per, elite_up.max) above, never past 20
    expect(foeLevel('elite', 6, 2)).toBe(6 + Math.min(B.stage.elite_up.per, B.stage.elite_up.max)); expect(foeLevel('boss', 19, 4)).toBe(20);
  });

  it('the lag factor matches the enemy level table within 3% (spec 5.2: HP and damage a level, one point to hit each way)', () => {
    const t = (enemiesJ as any).levels.table, last = t[t.length - 1];
    const hp = Math.pow(1 / last.hp_mult, 1 / (t.length - 1)), dmg = Math.pow(1 / last.damage_mult, 1 / (t.length - 1));
    const p = 0.65, step = 0.05 * (enemiesJ as any).levels.gap.to_hit_per_level; // a d20 point is 5%, around the reference hit chance
    const bulk = hp / ((p + step) / p), pressure = dmg * ((p - step) / p);
    expect(Math.abs(bulk - B.lagFactor) / B.lagFactor).toBeLessThan(0.03);
    expect(Math.abs(pressure - B.lagFactor) / B.lagFactor).toBeLessThan(0.03);
  });

  it('a tier row for every enemy tier, in the right order of bulk; a foe priced by lag, lead and share', () => {
    for (const id of Object.keys(ENEMY)) expect(B.tiers[id], id).toBeTruthy();
    expect(foeCost('soldier', 3, 4, 4).bulk).toBeCloseTo(B.lagFactor, 5);
    expect(foeCost('minion', 1, 4, 4).pressure).toBeCloseTo(B.tiers.minion.pressure * Math.pow(B.lagFactor, 3), 5);
    expect(foeCost('elite', 5, 4, 4).bulk).toBeCloseTo(B.tiers.elite.bulk / B.lagFactor, 5);
    expect(foeCost('boss', 1, 1, 1).bulk).toBeCloseTo(B.tiers.boss.bulk * shareOf('boss', 1).hp, 5);
    expect(foeCost('boss', 1, 1, 1).pressure).toBeCloseTo(B.tiers.boss.pressure * shareOf('boss', 1).damage, 5);
  });

  it('the budget (rule 17): bulk 0.25 x N x R, R 4 / 5 / 6.5 / 9; the pressure cap by N; the stage term', () => {
    expect(budgetFor(1, 'fight', 1, 1)).toEqual({ rounds: B.rounds.fight_early, bulk: B.bulkPerCharRound * B.rounds.fight_early, pressure: B.pressurePerChar[0] });
    expect(budgetFor(4, 'boss', 15, 1).bulk).toBeCloseTo(B.bulkPerCharRound * 4 * B.rounds.boss, 6);
    expect(budgetFor(2, 'fight', 7, 3).bulk).toBeCloseTo(B.bulkPerCharRound * 2 * B.rounds.fight * (1 + 2 * B.stage.bulk), 6);
    expect(budgetFor(3, 'gate', 8, 2).pressure).toBeCloseTo(B.pressurePerChar[2] * 3 * (1 + B.stage.pressure), 6);
  });

  it('the worked example (spec section 1): two players at level 1, depth 1, is inside 2.0 bulk +-15% and a 2.5 pressure cap', () => {
    const e = composeEncounter({ levels: [1, 1], node: { id: 's1.d1.0', depth: 1, kind: 'fight' }, stage: 1, setting: 'ahoc', seed: 'PHC-0001' });
    expect(e.target.bulk).toBeCloseTo(2, 6); expect(e.target.pressure).toBeCloseTo(2.5, 6);
    expect(Math.abs(e.spent.bulk - 2) / 2).toBeLessThanOrEqual(B.bulkBand + 1e-9);
    expect(e.spent.pressure).toBeLessThanOrEqual(2.5 * (1 + B.pressureBand) + 1e-9);
  });

  // Stages 1 to 3 are asserted. Stage 3 had one gap (item 2814: a solo party's Elite or Boss two levels up passed the
  // pressure band by itself); rules 1.44 gives it a damage scale down to the cap.
  const outOfBand = (c: typeof cases[number]) => {
    const { e } = c, why: string[] = [];
    if (Math.abs(e.spent.bulk - e.target.bulk) > e.target.bulk * B.bulkBand + 1e-9) why.push('bulk ' + e.spent.bulk.toFixed(2) + ' of ' + e.target.bulk.toFixed(2));
    if (e.spent.pressure > e.target.pressure * (1 + B.pressureBand) + 1e-9) why.push('pressure ' + e.spent.pressure.toFixed(2) + ' over ' + e.target.pressure.toFixed(2));
    if (e.foes.length > B.maxFoes[c.n - 1]) why.push(e.foes.length + ' foes');
    if (!e.foes.length) why.push('no foe');
    if (!e.ok) why.push('not ok');
    return why.length ? 'N' + c.n + ' L' + c.level + ' s' + c.stage + ' ' + fk(c.node) + ' d' + c.node.depth + ' ' + e.template + ': ' + why.join(', ') : null;
  };
  it('stage 3 (rules 1.44, item 2814 fixed): every fight inside its bands; a solo Elite, gate or Boss that passed the pressure band alone takes a damage scale down to the cap', () => {
    const bad = cases.filter((c) => c.stage === 3).map(outOfBand).filter(Boolean) as string[];
    expect(bad).toEqual([]);
    const scaled = cases.filter((c) => c.stage === 3 && c.n === 1 && c.e.foes.some((f) => (f.tier === 'elite' || f.tier === 'boss') && (f.scale?.damage ?? 1) < shareOf(f.tier, 1).damage - 1e-9));
    expect(scaled.length).toBeGreaterThan(0);
    for (const c of scaled) expect(c.e.spent.pressure).toBeCloseTo(c.e.target.pressure, 6);
  });
  it('anchorDamage (rules 1.44, item 2814): 1 inside the band; else the big units\' pressure brought down so the fight\'s is the cap', () => {
    expect(anchorDamage([{ tier: 'elite', cost: { pressure: 1.0 } }], 1.2, 1.32)).toBe(1);
    expect(anchorDamage([{ tier: 'elite', cost: { pressure: 1.76 } }], 1.2, 1.32)).toBeCloseTo(1.2 / 1.76, 9);
    expect(anchorDamage([{ tier: 'boss', cost: { pressure: 2 } }, { tier: 'minion', cost: { pressure: 0.4 } }], 1.2, 1.32)).toBeCloseTo(0.8 / 2, 9);
    expect(anchorDamage([{ tier: 'soldier', cost: { pressure: 2 } }], 1.2, 1.32)).toBe(1); // nothing big to scale
  });
  it(SEEDS + ' seeds x party 1 to 4 x 4 levels x every fight node of a stage (stages 1 and 2): every fight inside its bands', () => {
    const bad: string[] = [];
    for (const c of cases.filter((x) => x.stage < 3)) {
      const why0 = outOfBand(c); if (why0) bad.push(why0);
    }
    expect(bad.slice(0, 12)).toEqual([]);
  });
  it('every foe is whole: a weapon that exists, a level by the lag, a kind of the setting and never a Celestial; an Elite node holds an Elite, the Boss node a Boss', () => {
    const kinds = Object.keys((lootJ as any).kind_tables);
    for (const { e, stage, node } of cases.slice(0, 4000)) {
      for (const f of e.foes) {
        expect(WEAPON[f.weapon], f.weapon).toBeTruthy();
        expect(kinds).toContain(f.kind); expect(f.kind).not.toBe('celestial');
        expect(f.level).toBe(foeLevel(f.tier, e.level, stage));
        if (f.caster) expect(CASTER[f.caster] || HEART_CASTER[f.caster]).toBeTruthy();
      }
      if (node.kind === 'elite') expect(e.foes.some((f) => f.tier === 'elite')).toBe(true);
      if (node.kind === 'boss') expect(e.foes.some((f) => f.tier === 'boss')).toBe(true);
    }
  });

  it('the map (rule 22): its size by units, the squad on the west edge, every foe at least the deployment minimum away, all starts standable and apart', () => {
    for (const { n, e } of cases.slice(0, 3000)) {
      const units = n + e.foes.length, m = e.map, want = units <= 6 ? 16 : units <= 10 ? 20 : 26;
      expect(m.w).toBe(want); expect(m.h).toBe(want);
      const starts = [...m.pcStart, ...m.foeStart];
      expect(new Set(starts).size).toBe(starts.length);
      for (const k of starts) expect(standable(m, k), k).toBe(true);
      for (const k of m.pcStart) expect([1, 2]).toContain(Number(k.split(',')[0]));
      expect(m.foeStart.length).toBe(e.foes.length);
      expect(startGap(m.pcStart.slice(0, n), m.foeStart)).toBeGreaterThanOrEqual(Math.min(MAP_LIMITS.deploy_min, want - 6));
    }
  });

  it('deterministic: the same seed, party and node give the same fight; never Math.random; a fight never repeats the last template when it can', () => {
    const spy = vi.spyOn(Math, 'random').mockImplementation(() => { throw new Error('Math.random in the encounter generator'); });
    try {
      const inp = { levels: [2, 3], node: { id: 's1.d5.1', depth: 5, kind: 'fight' }, stage: 1, setting: 'ahoc', seed: 'PHC-0007' };
      const a = composeEncounter(inp), b = composeEncounter(inp);
      expect(JSON.stringify(a)).toBe(JSON.stringify(b));
      expect(composeEncounter({ ...inp, last: a.template }).template).not.toBe(a.template);
    } finally { spy.mockRestore(); }
  });

  it('data: every template names node kinds, tiers and casters that exist; every setting has kinds of the loot tables, never celestial, and a Boss weapon', () => {
    const kinds = Object.keys((lootJ as any).kind_tables);
    for (const t of TEMPLATES) for (const s of t.slots) {
      if (s.tier) expect(ENEMY[s.tier], t.id).toBeTruthy();
      for (const c of s.caster || []) expect(CASTER[c] || HEART_CASTER[c], c).toBeTruthy();
    }
    for (const s of SETTINGS) { for (const k of Object.keys(s.kinds)) { expect(kinds).toContain(k); expect(k).not.toBe('celestial'); } expect(WEAPON[s.boss.weapon]).toBeTruthy(); expect(SETTING[s.id]).toBe(s); }
  });

  it.runIf(process.env.SURVIVAL_ENC_REPORT)('report: the measured budget by party size and node kind', () => {
    const rows: Record<string, { n: number; bulk: number; press: number; foes: number; scaled: number; maps: Record<number, number> }> = {};
    for (const c of cases) {
      const k = 'Stage ' + c.stage + ', N' + c.n + ' ' + fk(c.node), r = (rows[k] ||= { n: 0, bulk: 0, press: 0, foes: 0, scaled: 0, maps: {} });
      r.n++; r.bulk += c.e.spent.bulk / c.e.target.bulk; r.press += c.e.spent.pressure / c.e.target.pressure; r.foes += c.e.foes.length; r.scaled += c.e.scaleHp !== 1 ? 1 : 0; r.maps[c.e.map.w] = (r.maps[c.e.map.w] || 0) + 1;
    }
    const lines = ['| Party, node | Fights | Bulk spent / target | Pressure spent / cap | Foes (mean) | HP-scaled | Maps (16 / 20 / 26) |', '| --- | --- | --- | --- | --- | --- | --- |'];
    for (const [k, r] of Object.entries(rows)) lines.push('| ' + k + ' | ' + r.n + ' | ' + (r.bulk / r.n).toFixed(3) + ' | ' + (r.press / r.n).toFixed(3) + ' | ' + (r.foes / r.n).toFixed(2) + ' | ' + (100 * r.scaled / r.n).toFixed(1) + '% | ' + [16, 20, 26].map((s) => r.maps[s] || 0).join(' / ') + ' |');
    const tmpl: Record<string, number> = {}; for (const c of cases) tmpl[c.e.template] = (tmpl[c.e.template] || 0) + 1;
    console.log(cases.length + ' fights\n' + lines.join('\n') + '\n\nTemplates: ' + Object.entries(tmpl).map(([k, v]) => k + ' ' + v).join(', '));
  });
});
