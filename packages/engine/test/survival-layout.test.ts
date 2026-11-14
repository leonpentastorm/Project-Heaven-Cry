// Survival's layout generator (rules 1.45; survival-spec rule 22, section 4.3; build step 7). Every number is read from
// data/survival.json `layout` and the settings' blocks. The guarantees over 1,000 seeds x every template x the three
// sizes (the setting turns with the seed, so every setting is in every column): every walkable tile reachable, two
// lanes, the start gap in the deployment band, cover near both starts, no blocker or hazard on a start (the zones' and
// the encounter's own start tiles), doorways clear, the cover share; hazards only where the template allows; the same
// seed gives the same map; the data switch falls back to the cropped open ground. SURVIVAL_LAYOUT_REPORT=1 prints the
// measured numbers and a map of each size.
import { describe, expect, it } from 'vitest';
import { generateLayout, layoutProblems, turnStamp, MAP_LIMITS } from '../src/maplayout';
import { SETTINGS, SETTING, TEMPLATES, LAYOUT_DATA, layoutRecipe, encounterMap, composeEncounter, type EncounterFoe } from '../src/run/encounter';
import { rngFor } from '../src/rng';
import { OBJ } from '../src/objects';
import { keyOf } from '../src/combat';
declare const process: { env: Record<string, string | undefined> }; // the engine's tsconfig has no node types
declare const console: { log(...a: unknown[]): void };

const SEEDS = Number(process.env.SURVIVAL_LAYOUT_SEEDS || 1000), SIZES = [16, 20, 26];
const HAZ = new Set(Object.values(OBJ).filter((k) => k.hazard).map((k) => k.id));
type Case = { seed: number; size: number; setting: string; template: string; gen: ReturnType<typeof generateLayout>; hazardAllowed: boolean };
const cases: Case[] = [];
for (let s = 0; s < SEEDS; s++) for (const t of TEMPLATES) for (const size of SIZES) {
  const setting = SETTINGS[(s + size) % SETTINGS.length], rng = rngFor('seed-' + s, t.id + '#' + size + '#map');
  const rc = layoutRecipe(size, setting, t, rng);
  cases.push({ seed: s, size, setting: setting.id, template: t.id, gen: generateLayout(rc, rng, setting.id), hazardAllowed: !!rc.hazard });
}
const recipeOf = (c: Case) => layoutRecipe(c.size, SETTING[c.setting], TEMPLATES.find((t) => t.id === c.template)!, rngFor('x', 'y'));
const hazardsIn = (rows: string[]) => { const L = LAYOUT_DATA.legend; let n = 0; for (const r of rows) for (const ch of r) if (L[ch] && HAZ.has(L[ch].kind)) n++; return n; };

describe('Survival layout generator (rules 1.45)', () => {
  it('the data: the switch, every setting a layout block whose stamps exist, every stamp 3 to 7 tiles a side', () => {
    expect(['generated', 'open_ground']).toContain(LAYOUT_DATA.use);
    for (const s of SETTINGS) {
      expect(s.layout.stamps.length).toBeGreaterThan(0);
      for (const id of s.layout.stamps) expect(LAYOUT_DATA.stamps[id], s.id + ' ' + id).toBeTruthy();
      for (const k of [...s.layout.cover.half, ...s.layout.cover.full]) expect(OBJ[k]?.cover, k).toBeTruthy();
    }
    for (const [id, st] of Object.entries<any>(LAYOUT_DATA.stamps)) {
      const h = st.rows.length, w = st.rows[0].length;
      expect(Math.max(w, h), id).toBeLessThanOrEqual(7); expect(Math.max(w, h), id).toBeGreaterThanOrEqual(3);
      expect(st.rows.every((r: string) => r.length === w), id).toBe(true);
    }
    expect(turnStamp(['ab', 'cd'], 1, false)).toEqual(['ca', 'db']);
    expect(turnStamp(['ab', 'cd'], 0, true)).toEqual(['ba', 'dc']);
  });

  it(SEEDS + ' seeds x ' + TEMPLATES.length + ' templates x sizes 16, 20, 26: every guarantee holds', () => {
    const bad: string[] = [], fell = cases.filter((c) => !c.gen);
    for (const c of cases) {
      if (!c.gen) continue;
      const p = layoutProblems(c.gen.rows, recipeOf(c));
      if (p.length) bad.push(c.seed + '/' + c.template + '/' + c.size + ': ' + p.join(' '));
      if (!c.hazardAllowed && hazardsIn(c.gen.rows)) bad.push(c.seed + '/' + c.template + '/' + c.size + ': a hazard the template does not allow');
    }
    expect(bad.slice(0, 5)).toEqual([]);
    // The fallback is allowed but must stay rare (the open ground cropped: under 1%).
    expect(fell.length / cases.length).toBeLessThan(0.01);
    // Hazards appear only on templates that allow them, and do appear on those.
    expect(cases.some((c) => c.gen && c.hazardAllowed && hazardsIn(c.gen.rows) > 0)).toBe(true);
    expect(TEMPLATES.filter((t) => !t.hazard).length).toBeGreaterThan(0);
  }, 300_000); // the 1,000-seed sweep takes 33 s on a loaded machine: a time limit, not a rule (it failed three full checks at 30 s)

  it('the encounter\'s own start tiles: never on a blocker, a hazard, a trap or a hole, every foe at the deployment minimum or more', () => {
    const bad: string[] = [];
    for (let s = 0; s < Math.min(SEEDS, 200); s++) for (const t of TEMPLATES) for (const units of [5, 9, 14]) {
      const setting = SETTINGS[s % SETTINGS.length];
      const foes = t.slots.flatMap((sl) => Array.from({ length: Math.max(1, sl.req || 1) }, () => ({ name: 'x', tier: 'soldier', weapon: 'service_pistol', spawn: sl.spawn || 'far', cost: { bulk: 1, pressure: 1 } }) as EncounterFoe));
      const m = encounterMap('n' + s, units, foes, rngFor('seed-' + s, t.id + '#map'), { setting: setting.id, template: t.id });
      const blocked = new Set([...m.solid, ...m.cover, ...(m.full || [])]);
      for (const o of m.objects || []) { const k = OBJ[o.kind]; if ((k.blocks_move && !(k.door && o.open)) || k.hazard || k.trap || o.kind === 'hole') blocked.add(keyOf(o.at, m)!); }
      for (const k of [...m.pcStart, ...m.foeStart]) if (blocked.has(k)) bad.push(s + '/' + t.id + '/' + units + ': a start on ' + k);
      if (new Set([...m.pcStart, ...m.foeStart]).size !== m.pcStart.length + m.foeStart.length) bad.push(s + '/' + t.id + ': two starts share a tile');
      for (const f of m.foeStart) { const g = Math.min(...m.pcStart.map((p) => { const [a, b] = p.split(',').map(Number), [c, d] = f.split(',').map(Number); return Math.max(Math.abs(a - c), Math.abs(b - d)); }));
        if (g < MAP_LIMITS.deploy_min) bad.push(s + '/' + t.id + '/' + units + ': a foe ' + g + ' tiles from the squad'); }
      if (m.skin?.setting !== setting.id) bad.push(s + ': no skin');
    }
    expect(bad.slice(0, 5)).toEqual([]);
  });

  it('deterministic: the same seed, node and party give the same map; another node another map', () => {
    const inp = { levels: [1, 1], node: { id: 'r3c1', depth: 3, kind: 'fight' }, stage: 1, setting: 'ahoc', seed: 'PHC-0001' };
    const a = composeEncounter(inp), b = composeEncounter(inp), c = composeEncounter({ ...inp, node: { ...inp.node, id: 'r3c2' } });
    expect(JSON.stringify(a.map)).toBe(JSON.stringify(b.map));
    expect(JSON.stringify(a.map.solid) + JSON.stringify(a.map.objects)).not.toBe(JSON.stringify(c.map.solid) + JSON.stringify(c.map.objects));
    expect(a.map.skin?.setting).toBe('ahoc');
    expect(a.map.name).toMatch(/AHOC chapter outpost/);
  });

  it('the data switch: `use: open_ground` gives step 3\'s cropped open ground, no skin', () => {
    const was = LAYOUT_DATA.use; LAYOUT_DATA.use = 'open_ground';
    try {
      const m = encounterMap('n1', 5, [], rngFor('s', 'n1#map'), { setting: 'ahoc', template: 'firing_line' });
      expect(m.name).toBe('Open ground (16 × 16)'); expect(m.skin).toBeUndefined();
    } finally { LAYOUT_DATA.use = was; }
  });

  it.runIf(process.env.SURVIVAL_LAYOUT_REPORT)('report: the measured numbers and one map of each size', () => {
    const rows: string[] = [];
    for (const size of SIZES) {
      const cs = cases.filter((c) => c.size === size && c.gen), N = size * size;
      const cov = cs.map((c) => { let n = 0; for (const r of c.gen!.rows) for (const ch of r) { const v = { ...LAYOUT_DATA.legend, c: { kind: 'crate' }, w: { kind: 'low_wall' }, P: { kind: 'pillar' }, B: { kind: 'barricade' }, o: { kind: 'barrel' } }[ch]; if (v && OBJ[v.kind]?.cover) n++; } return n / N; });
      const walls = cs.map((c) => c.gen!.rows.join('').split('').filter((x) => x === '#').length / N);
      const tries = cs.map((c) => c.gen!.tries), stamps = cs.map((c) => c.gen!.stamps.length);
      const mean = (a: number[]) => a.reduce((s, x) => s + x, 0) / Math.max(1, a.length);
      rows.push('| ' + size + ' | ' + cases.filter((c) => c.size === size).length + ' | ' + cases.filter((c) => c.size === size && !c.gen).length + ' | ' + mean(tries).toFixed(2) + ' (max ' + Math.max(...tries) + ') | ' + mean(stamps).toFixed(2) + ' | ' + (100 * mean(cov)).toFixed(1) + '% (' + (100 * Math.min(...cov)).toFixed(1) + '–' + (100 * Math.max(...cov)).toFixed(1) + ') | ' + (100 * mean(walls)).toFixed(1) + '% | ' + cs.filter((c) => hazardsIn(c.gen!.rows)).length + ' |');
    }
    console.log('| Size | Maps | Fell back | Tries | Stamps | Cover share | Walls | With a hazard |\n| --- | --- | --- | --- | --- | --- | --- | --- |\n' + rows.join('\n'));
    for (const size of SIZES) { const c = cases.find((x) => x.size === size && x.gen && x.setting === 'ahoc')!; console.log('\n' + c.setting + ' ' + c.template + ' seed ' + c.seed + ' (' + size + '):\n' + c.gen!.rows.join('\n')); }
  });
});
