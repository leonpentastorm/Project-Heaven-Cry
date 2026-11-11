// @ts-nocheck (a measuring tool)
// THE OUTBURST MEASUREMENTS (rules 1.19; docs/design/handoffs/outburst-rework-2.md). Skipped unless asked for:
//
//   OUTBURST_MEASURE=1 npx vitest run --root packages/engine test/balance/outburst-measure.test.ts --silent=false
//     OUTBURST_MEASURE_PARTS=sheets,rows,seq,ap   which parts (default: all)
//     OUTBURST_MEASURE_N=12                       fights a row (default 12, as the 1.17 report)
//     OUTBURST_MEASURE_LEVELS=6,20                levels (default 1,3,6,9,12,20)
//
//   sheets  who is measured: the Outburst reference build at each level, normal share and all in (Will Power, Empathy,
//           the Strain limit, the free Pump, the perks)
//   rows    steady play (a new caster, the early feelings, all 25), the biggest Release and stage 4 with plain Pumps,
//           as a percent of the plain rifle over the same turns (magic-measure.ts `pattern`)
//   seq     every set of four feelings poured into one stage-4 Release, ranked by the damage the engine's own preview
//           expects (hit chance counted), in four situations; the best that a heart can keep up every turn too. It
//           ranks the multiplier only: what a feeling DOES (a heal, a Taunt, AP lost) is not given a value.
//   ap      the prices of a Pump that were measured (1 AP; 2 AP after the second paid Pump of a turn; 2 AP flat; a
//           feeling Pump +1 AP)
//
// The file runs unchanged on the tree as it was before rules 1.19 (only what both engines export is used), which is
// how the "before" tables in the hand-off were made.
import { describe, it, expect } from 'vitest';
import feelJ from '../../../../data/feelings.json';
import { rifle, pattern } from './magic-measure';
import { freshFight } from './sim';
import { buildCharacter, sheetLine } from './builds';
import { FEELING, SOUL_RULES, SOUL_AP, previewOutburstPlan, bindGame, strainLimit, freePumps } from '../../src';

const ON = !!process.env.OUTBURST_MEASURE, PARTS = (process.env.OUTBURST_MEASURE_PARTS || 'sheets,rows,seq,ap').split(',');
const N = Math.max(1, Number(process.env.OUTBURST_MEASURE_N) || 12), LEVELS = (process.env.OUTBURST_MEASURE_LEVELS || '1,3,6,9,12,20').split(',').map(Number);
const W = (g, f) => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const out = (s: string) => console.log('[outburst] ' + s);

const ROWS = [
  { what: 'steady, a new caster (Rage and Love)', opts: null },
  { what: 'steady, the early feelings', opts: { feelings: 'early' } },
  { what: 'steady, all 25 feelings', opts: { feelings: 'all' } },
  { what: 'the biggest Release (all 25)', opts: { feel: true, feelings: 'all' }, rounds: 1, n: 3 },
  { what: 'the biggest Release (the early feelings)', opts: { feel: true, feelings: 'early' }, rounds: 1, n: 3 },
  { what: 'stage 2, plain Pumps', opts: { stage: 2 } },
  { what: 'stage 4, plain Pumps', opts: { stage: 4 } },
];
function row(p, variant, level, y, extra = {}) {
  let r = pattern(p.what, 'outburst', variant, level, N * (p.n || 1), p.opts || Object.keys(extra).length ? { ...(p.opts || {}), ...extra } : null, /^Release /, y, 'sim_range_soldier', p.rounds || 8);
  if (p.rounds === 1 && !r.casts) { r = pattern(p.what, 'outburst', variant, level, N * (p.n || 1), { ...(p.opts || {}), ...extra }, /^Release /, y, 'sim_range_soldier', 2); r.note = 'over two turns'; }
  return r;
}
const cell = (r) => (r.casts ? r.perCast + ' · ' + r.turnsPerCast + ' t · ' + r.apPerCast + ' AP · S' + r.strainPerCast + ' · **' + r.pctRifle + '%**' + (r.note ? ' (' + r.note + ')' : '') : 'no cast');

// ---------- the sequences ----------
const ONCE_EACH = !!(feelJ as any).once_each;
const costOf = (f: string) => { const p: any = FEELING[f]?.pour || {}; return { strain: Number(p.strain || 0) + Number(p.strain_unless_down || 0), back: Number(p.strain_back || 0), hp: Number(p.self_damage || 0), once: !!p.once }; };
function* multisets(ids: string[], k: number, from = 0, acc: string[] = []) { if (acc.length === k) { yield acc; return; } for (let i = from; i < ids.length; i++) yield* multisets(ids, k, i, [...acc, ids[i]]); }
const SITUATIONS = [
  { id: 'alone', text: 'alone, unhurt (the shooting range)', set: () => {} },
  { id: 'squad', text: 'two allies within 3 tiles, unhurt', set: (cb, u) => { for (const i of [1, 2]) { const [x, y] = u.pos.split(',').map(Number); cb.units.push({ ...u, id: 'ally' + i, charId: null, name: 'Ally ' + i, pos: x + ',' + (y + i), mg: undefined }); } } },
  { id: 'hurt', text: 'alone, at 40% HP, aiming at whoever last hurt you', set: (cb, u, t) => { u.hp = Math.floor(u.maxHp * 0.4); u.feelHurtBy = t.id; } },
  { id: 'fallen', text: 'two allies near and one of them Down', set: (cb, u) => { for (const i of [1, 2]) { const [x, y] = u.pos.split(',').map(Number); cb.units.push({ ...u, id: 'ally' + i, charId: null, name: 'Ally ' + i, pos: x + ',' + (y + i), mg: undefined, ...(i === 2 ? { downed: true, hp: 0 } : {}) }); } } },
];
function sequences(level: number, variant: string, sit) {
  const st = freshFight({ build: 'outburst', variant, level, opts: { feelings: 'all' } }, 'sim_range_soldier', 'SEQ'), cb = st.g.combat;
  const u = cb.units.find((q) => q.side === 'pc'), t = cb.units.find((q) => q.side === 'foe'), m = u.mg;
  const d = m.designs.find((q) => q.school === 'damage');
  // bring the target into reach, in the open
  const [ux, uy] = u.pos.split(',').map(Number); t.pos = (ux + 4) + ',' + uy;
  sit.set(cb, u, t);
  const ids = Object.keys(FEELING), rows = [];
  const value = (felt: string[]) => W(st.g, () => {
    m.held = { design: d.id, stage: felt.length, cost: 0, tone: 'raw', form: 'bolt', turns: 0, paid: 0, v: (SOUL_RULES as any).revision ?? m.held?.v, felt: [...felt] };
    // the held Outburst's revision stamp: read it from a real Begin once
    m.held.v = REV;
    const pl = previewOutburstPlan(cb, u, 'held', t.pos), a = (pl.affected || []).find((q) => q.enemy);
    m.held = null;
    return a ? { dmg: a.dmgAfterArmour, pct: a.roll ? a.roll.pct : 100, mult: pl.mult } : { dmg: 0, pct: 0, mult: pl.mult };
  });
  let REV; W(st.g, () => { const h0 = { design: d.id, stage: 0, cost: 0 }; m.held = h0; previewOutburstPlan(cb, u, 'held', t.pos); REV = m.held?.v; m.held = null; });
  for (const felt of multisets(ids, 4)) {
    const count = {}; let ok = true; for (const f of felt) { count[f] = (count[f] || 0) + 1; if (count[f] > 1 && (ONCE_EACH || costOf(f).once)) ok = false; } if (!ok) continue;
    const c = felt.map(costOf), strain = c.reduce((n, x) => n + x.strain, 0), back = c.reduce((n, x) => n + x.back, 0), hp = c.reduce((n, x) => n + x.hp, 0);
    const v = value(felt);
    rows.push({ felt, mult: v.mult, pct: v.pct, exp: Math.round(v.dmg * v.pct) / 100, strain, net: strain - back, hp });
  }
  const plain = value([]); // stage 0; the plain stage 4 is read below
  const p4 = W(st.g, () => { m.held = { design: d.id, stage: 4, cost: 0, tone: 'raw', form: 'bolt', v: REV, felt: [] }; const pl = previewOutburstPlan(cb, u, 'held', t.pos), a = (pl.affected || []).find((q) => q.enemy); m.held = null; return { mult: pl.mult, exp: a ? Math.round(a.dmgAfterArmour * (a.roll ? a.roll.pct : 100)) / 100 : 0 }; });
  void plain;
  return { rows, p4 };
}
const name = (felt: string[]) => { const c = {}; felt.forEach((f) => (c[f] = (c[f] || 0) + 1)); return Object.entries(c).map(([f, n]) => FEELING[f].name + (n > 1 ? ' ×' + n : '')).join(', '); };
function top(rows, n, pred = () => true) { return rows.filter(pred).sort((a, b) => b.exp - a.exp).slice(0, n); }

describe('the Outburst measurements (rules 1.19)', () => {
  (ON && PARTS.includes('sheets') ? it : it.skip)('who is measured', () => {
    for (const v of ['normal', 'allin']) for (const lv of LEVELS) { const b = buildCharacter('outburst', v, lv), c = b.c; out('sheet ' + v + ' L' + lv + ': Will Power ' + (c.skills.will_power || 0) + ', Empathy ' + (c.skills.empathy || 0) + ', Strain limit ' + strainLimit(c) + ', free Pumps a round ' + freePumps(c) + ' · ' + sheetLine(b)); }
  }, 600000);
  (ON && PARTS.includes('rows') ? it : it.skip)('steady play and the biggest Release against the plain rifle', () => {
    let md = '';
    for (const v of ['normal', 'allin']) {
      const ys = LEVELS.map((lv) => rifle(lv, N));
      md += '\n**' + (v === 'normal' ? 'Normal share' : 'All in') + '.** Plain rifle (normal share) a turn: ' + ys.map((y) => 'L' + y.level + ' ' + Math.round(y.normal * 10) / 10).join(' · ') + '\n\n| Pattern | ' + LEVELS.map((l) => 'Level ' + l).join(' | ') + ' |\n|---|' + LEVELS.map(() => '---').join('|') + '|\n';
      for (const p of ROWS) { const cells = LEVELS.map((lv, i) => row(p, v, lv, ys[i])); out(v + ' ' + p.what + ': ' + cells.map((r) => 'L' + r.level + ' ' + r.pctRifle + '%').join(' · ')); md += '| ' + p.what + ' | ' + cells.map(cell).join(' | ') + ' |\n'; expect(cells.reduce((e, r) => e + r.errors, 0)).toBe(0); }
    }
    console.log(md);
  }, 7200000);
  (ON && PARTS.includes('seq') ? it : it.skip)('the best four feelings, by situation', () => {
    const lv = Number(process.env.OUTBURST_MEASURE_SEQ_LEVEL) || 6; let md = '';
    const firsts = [];
    for (const sit of SITUATIONS) {
      const { rows, p4 } = sequences(lv, 'normal', sit);
      md += '\n**' + sit.text + '** (level ' + lv + ', normal share; ' + rows.length + ' sets; four plain Pumps: ×' + p4.mult + ', ' + p4.exp + ' expected)\n\n| # | The four | × | Lands | Expected damage | Strain (net of what it gives back) | HP |\n|---|---|---|---|---|---|---|\n';
      const best = top(rows, 6); firsts.push(name(best[0].felt));
      best.forEach((r, i) => { md += '| ' + (i + 1) + ' | ' + name(r.felt) + ' | ' + r.mult + ' | ' + r.pct + '% | ' + r.exp + ' | ' + r.strain + ' (' + r.net + ') | ' + r.hp + ' |\n'; });
      const keep = top(rows, 4, (r) => r.net <= 1 && r.hp === 0);
      md += '\nKept up every turn (1 Strain at most beyond the Begin, no HP):\n\n| # | The four | × | Lands | Expected damage | Strain (net) |\n|---|---|---|---|---|---|\n';
      keep.forEach((r, i) => { md += '| ' + (i + 1) + ' | ' + name(r.felt) + ' | ' + r.mult + ' | ' + r.pct + '% | ' + r.exp + ' | ' + r.strain + ' (' + r.net + ') |\n'; });
      const free = top(rows, 3, (r) => r.strain === 0 && r.hp === 0);
      md += '\nCosting nothing: ' + free.map((r) => name(r.felt) + ' (×' + r.mult + ', ' + r.exp + ')').join(' · ') + '\n';
      const withCalm = top(rows, 1, (r) => r.felt.includes('calm'))[0], withRelief = top(rows, 1, (r) => r.felt.includes('relief'))[0], rrrr = rows.find((r) => r.felt.join() === 'rage,rage,rage,relief' || r.felt.join() === 'rage,rage,rage,rage');
      md += 'The best set with Calm: ' + (withCalm ? name(withCalm.felt) + ' ' + withCalm.exp + ' (rank ' + (rows.filter((r) => r.exp > withCalm.exp).length + 1) + ')' : 'none') + ' · with Relief: ' + (withRelief ? name(withRelief.felt) + ' ' + withRelief.exp + ' (rank ' + (rows.filter((r) => r.exp > withRelief.exp).length + 1) + ')' : 'none')
        + (rrrr ? ' · ' + name(rrrr.felt) + ': ' + rrrr.exp : '') + '\n';
    }
    console.log(md); out('the best four by situation: ' + firsts.join(' | '));
  }, 7200000);
  (ON && PARTS.includes('ap') ? it : it.skip)('what a Pump should cost', () => {
    const C: any = (SOUL_RULES as any).cycle, was = { pump: SOUL_AP.pump, after: C.pump_ap_after_second, extra: C.feeling_pump_ap_extra };
    const ALTS = [
      { id: 'A', text: '1 AP a Pump (built)', on: () => {} },
      { id: 'B', text: '1 AP, then 2 AP for every paid Pump after the second of a turn', on: () => { C.pump_ap_after_second = 2; } },
      { id: 'C', text: '2 AP a Pump', on: () => { SOUL_AP.pump = 2; } },
      { id: 'D', text: 'a feeling Pump costs 1 AP more than a plain one', on: () => { C.feeling_pump_ap_extra = 1; } },
    ];
    let md = '\n| Price of a Pump | ' + ['normal', 'allin'].flatMap((v) => LEVELS.map((l) => (v === 'normal' ? 'L' : 'all in L') + l + ' steady · biggest')).join(' | ') + ' |\n|---|' + ['normal', 'allin'].flatMap(() => LEVELS.map(() => '---')).join('|') + '|\n';
    try {
      for (const alt of ALTS) {
        SOUL_AP.pump = was.pump; C.pump_ap_after_second = was.after; C.feeling_pump_ap_extra = was.extra; alt.on();
        const cells = [];
        for (const v of ['normal', 'allin']) for (const lv of LEVELS) { const y = rifle(lv, N), s = row(ROWS[1], v, lv, y, { alt: alt.id }), p = row(ROWS[3], v, lv, y, { alt: alt.id }); cells.push(s.pctRifle + '% (' + s.apPerCast + ' AP, ' + s.turnsPerCast + ' t) · ' + (p.casts ? p.pctRifle + '% (' + p.apPerCast + ' AP' + (p.note ? ', ' + p.note : '') + ')' : 'no cast')); }
        out('AP ' + alt.id + ' ' + alt.text + ': ' + cells.join(' | ')); md += '| ' + alt.text + ' | ' + cells.join(' | ') + ' |\n';
      }
    } finally { SOUL_AP.pump = was.pump; C.pump_ap_after_second = was.after; C.feeling_pump_ap_extra = was.extra; }
    console.log(md);
  }, 7200000);
});
