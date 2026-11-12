// @ts-nocheck (a measuring tool)
// THE MP MEASUREMENTS (rules 1.24; docs/design/handoffs/mp-rework.md). Skipped unless asked for:
//
//   MP_MEASURE=1 npx vitest run --root packages/engine test/balance/mp-measure.test.ts --silent=false
//     MP_MEASURE_N=8            fights a row (default 8)
//     MP_MEASURE_LEVELS=6,20    levels (default 1,3,6,9,12,20)
//
// For the Outburst reference build (normal share and all in) at each level: the pool (Max MP), what a Begin costs, and
// the MP the simulator's own Outburst policies spend: a Release, an 8-turn fight on the shooting range (steady play;
// stage 4 with plain Pumps every time; the biggest Release every time), a real fight against two Soldiers, and three
// fights in a row with nothing given back between them. The policies pay what the engine charges (they read the
// engine's previews), so the file runs unchanged before and after the rework.
import { describe, it, expect } from 'vitest';
import { runCell } from './sim';
import { buildCharacter } from './builds';
import { maxMp, magicOf, designCost, MANA_START } from '../../src';

const ON = !!process.env.MP_MEASURE;
const N = Math.max(1, Number(process.env.MP_MEASURE_N) || 8), LEVELS = (process.env.MP_MEASURE_LEVELS || '1,3,6,9,12,20').split(',').map(Number);
const out = (s: string) => console.log('[mp] ' + s);
const r0 = (n: number) => Math.round(n), sumIf = (o, re) => Object.entries(o || {}).filter(([k]) => re.test(k)).reduce((n, [, v]) => n + v, 0);
const ROWS = [
  { id: 'steady', what: 'steady play (the early feelings), 8 turns on the range', opts: { feelings: 'early' }, tier: 'sim_range_soldier', rounds: 8 },
  { id: 's4', what: 'stage 4 with plain Pumps every time, 8 turns on the range', opts: { stage: 4 }, tier: 'sim_range_soldier', rounds: 8 },
  { id: 'big', what: 'the biggest Release every time (all 25), 8 turns on the range', opts: { feel: true, feelings: 'all' }, tier: 'sim_range_soldier', rounds: 8 },
  { id: 'fight', what: 'a real fight: two Soldiers, ground with cover', opts: { feelings: 'early' }, tier: 'soldier', foes: 2 },
];
function cell(p, v, lv) {
  const c = runCell({ build: 'outburst', variant: v, level: lv, opts: p.opts }, p.tier, p.tier === 'soldier' ? 'cover' : 'open', N, { tag: 'mp', ...(p.rounds ? { maxRounds: p.rounds } : {}), ...(p.foes ? { foes: p.foes } : {}) });
  const mp = c.res?.mp || { spent: 0, earned: 0, empty: 0, seen: 1 }, casts = sumIf(c.actions, /^Release /), syph = sumIf(c.actions, /^Syphon/), pumps = sumIf(c.actions, /^(Pump|Overdraw)/);
  return { spent: mp.spent / c.n, earned: mp.earned / c.n, casts: casts / c.n, perCast: casts ? mp.spent / casts : 0, syph: syph / c.n, pumps: pumps / c.n, turns: c.turns / c.n, dmgTurn: c.dmg / Math.max(1, c.turns), errors: c.errors, win: c.wins / c.n };
}
describe('the MP measurements (rules 1.24)', () => {
  (ON ? it : it.skip)('the pool, the price and what a fight spends', () => {
    let md = '';
    for (const v of ['normal', 'allin']) {
      md += '\n**' + (v === 'normal' ? 'Normal share' : 'All in') + '**\n\n| Level | Soul / Det / Ins / Vir | Will Power | Max MP | Begin (Heart Bolt) | ' + ROWS.map((r) => r.id).join(' | ') + ' |\n|---|---|---|---|---|' + ROWS.map(() => '---').join('|') + '|\n';
      for (const lv of LEVELS) {
        const c = buildCharacter('outburst', v, lv).c, m = magicOf(c), d = m.designs.find((q) => q.school === 'damage');
        const pool = maxMp(c), begin = designCost(m, d, MANA_START);
        const cells = ROWS.map((p) => { const r = cell(p, v, lv); expect(r.errors).toBe(0); return r; });
        const txt = cells.map((r) => r0(r.spent) + ' MP (' + r0(100 * r.spent / pool) + '% of the pool; ' + r0(r.perCast) + ' a Release, ' + Math.round(r.casts * 10) / 10 + ' Releases, ' + Math.round(r.pumps * 10) / 10 + ' Pumps, ' + Math.round(r.syph * 10) / 10 + ' Syphons, ' + Math.round(r.turns * 10) / 10 + ' turns; ' + Math.round(r.dmgTurn * 10) / 10 + ' dmg a turn)');
        const line = '| ' + lv + ' | ' + [c.cores?.soul, c.attrs.determination, c.attrs.insight, c.attrs.virtue].join(' / ') + ' | ' + (c.skills.will_power || 0) + ' | ' + pool + ' | ' + begin + ' | ' + txt.join(' | ') + ' |';
        out(v + ' ' + line); md += line + '\n';
      }
    }
    console.log(md);
  }, 7200000);
});
