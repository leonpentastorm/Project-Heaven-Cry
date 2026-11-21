// @ts-nocheck (a measuring tool)
// THE HEAL AND SHIELD MEASUREMENTS (rules 1.20; docs/design/handoffs/heal-shield-pass.md). What a heal and a shield
// from Sigil, the Outburst and prayer are worth against one Soldier's turn, and how long a pair lasts under fire with
// and without a supporter.
//
//   BALANCE_MEASURE=1 (or npm run balance)  a pair under fire at level 6, printed (3 fights a row)
//   HEAL_MEASURE=1 npx vitest run --root packages/engine test/balance/heal-measure.test.ts --silent=false
//                                          the full tables, printed: the yardstick, every source before and after, the
//                                          pairs under fire (levels 1, 6, 12, 20)
//   HEAL_MEASURE_N=20                      fights a row (default 12)        HEAL_MEASURE_LEVELS=6,12
//   HEAL_MEASURE_PARTS=yard,inv,fire       only these parts        HEAL_MEASURE_ROWS=Faith   only the pairs whose name matches
import { describe, it, expect } from 'vitest';
import { inventory, invTable, invNums, underFire, fireLine, soldierTurn, SOLDIER_TURN, RIFLEMAN_HP, H_LEVELS } from './heal-measure';

const FULL = !!process.env.HEAL_MEASURE, N = Math.max(1, Number(process.env.HEAL_MEASURE_N) || 12);
const LV = (process.env.HEAL_MEASURE_LEVELS || '').split(',').map(Number).filter(Boolean), PARTS = (process.env.HEAL_MEASURE_PARTS || 'yard,inv,fire').split(',');
const row = (rows: any[], re: RegExp) => { const r = rows.find((q) => re.test(q.what)); if (!r) throw new Error('no row ' + re); return r; };
const SUPPORT: Record<string, any> = {
  heal: { build: 'mender', variant: 'normal', policy: 'ob_heal' }, healAllIn: { build: 'mender', variant: 'allin', policy: 'ob_heal' },
  chan: { build: 'outburst_s', variant: 'normal', policy: 'ob_heal' }, shield: { build: 'outburst_s', variant: 'normal', policy: 'ob_heal', opts: { design: 'aegis' } },
  mend2: { build: 'sigil_s', variant: 'normal', policy: 'sigil_boon', opts: { words: ['mend', 'seek'] } }, mend4: { build: 'sigil_s', variant: 'normal', policy: 'sigil_boon', opts: { words: ['mend', 'mend', 'condense', 'seek'] } },
  ward2: { build: 'sigil_s', variant: 'normal', policy: 'sigil_boon', opts: { words: ['ward', 'seek'] } },
  pray: { build: 'faith_s', variant: 'normal', policy: 'pray_heal' }, prayShield: { build: 'faith_n', variant: 'normal', policy: 'pray_heal', opts: { whisper: 'protection' } },
};
const idleOf = (s: any) => ({ ...s, policy: 'idle', opts: undefined });
const MEASURE = !!process.env.BALANCE_MEASURE;

// Rules 1.94 (Leon, 21 Nov 2026): the heal and shield bands (rules 1.20, superseded by 1.36; the off-heal line of the
// balance contract) are withdrawn as limits. What a healer does under fire is printed (BALANCE_MEASURE=1, or `npm run balance`).
describe('a healer under fire (rules 1.20), reported', () => {
  (MEASURE ? it : it.skip)('under fire (level 6, 3 fights a row): a pair with and without a healer, under two and four Soldiers, printed', () => {
    const idle2 = underFire('idle', idleOf(SUPPORT.heal), 6, 2, 3), heal2 = underFire('heal', SUPPORT.heal, 6, 2, 3), heal4 = underFire('heal', SUPPORT.heal, 6, 4, 3);
    const both4 = underFire('heal and shield', [SUPPORT.heal, SUPPORT.shield], 6, 4, 3);
    expect(idle2.errors + heal2.errors + heal4.errors + both4.errors).toBe(0);
    for (const r of [idle2, heal2, heal4, both4]) console.info('[fire] ' + fireLine(r));
  }, 240000);
});

// ---------- the full run ----------
describe('the heal and shield pass, measured', () => {
  (FULL ? it : it.skip)('the yardstick, every source before and after, and the pairs under fire', () => {
    const levels = LV.length ? LV : H_LEVELS;
    if (PARTS.includes('yard')) for (const lv of levels) { const y = soldierTurn(lv, Math.max(N, 30)); console.log('[yard] L' + lv + ' a Soldier-turn ' + y.perTurn + ' HP · ' + y.share + '% of the rifleman\'s ' + y.hp + ' HP · he lasts ' + y.lasted + ' rounds under two'); }
    if (PARTS.includes('inv')) for (const [b, v] of [['sigil_s', 'normal'], ['sigil_s', 'allin'], ['outburst_s', 'normal'], ['outburst_s', 'allin'], ['mender', 'normal'], ['mender', 'allin'], ['faith_s', 'normal'], ['faith_s', 'allin']]) {
      console.log('\n[inv] ' + b + ' · ' + v + ' · ' + H_LEVELS.map((l) => { const q = invNums(b, v, l); return 'L' + l + ': HP ' + q.hp + ', Sigil ×' + q.sigil + ', Soul ×' + q.soul + ', Healing given ×' + q.heal + (q.blessing ? ', Blessing ×' + q.blessing : '') + ', level ×' + q.level; }).join(' | '));
      console.log(invTable(b, v));
    }
    if (PARTS.includes('fire')) {
      const fl = LV.length ? LV : [1, 6, 12, 20];
      const rows: [string, any][] = [
        ['the Soul healer standing idle (the control)', idleOf(SUPPORT.heal)], ['the Soul healer, healing', SUPPORT.heal], ['the Soul healer all in, healing', SUPPORT.healAllIn],
        ['the Outburst caster, healing', SUPPORT.chan], ['the Outburst caster, Inverse shields', SUPPORT.shield],
        ['the Sigil caster standing idle (the control)', idleOf(SUPPORT.mend2)], ['the Sigil caster, MEND · SEEK', SUPPORT.mend2], ['the Sigil caster, the full MEND Line', SUPPORT.mend4], ['the Sigil caster, WARD · SEEK', SUPPORT.ward2],
        ['the Faith build standing idle (the control)', idleOf(SUPPORT.pray)], ['the Faith build, Health and Warm Hands', SUPPORT.pray], ['the Faith build, Protection and Saint\'s Shield', SUPPORT.prayShield],
        ['two Soul healers', [SUPPORT.heal, SUPPORT.heal]], ['two Soul healers standing idle (the control)', [idleOf(SUPPORT.heal), idleOf(SUPPORT.heal)]],
        ['a Soul healer and a shielder', [SUPPORT.heal, SUPPORT.shield]], ['two all-in Soul healers', [SUPPORT.healAllIn, SUPPORT.healAllIn]],
      ];
      const only = process.env.HEAL_MEASURE_ROWS ? new RegExp(process.env.HEAL_MEASURE_ROWS, 'i') : null;
      for (const lv of fl) for (const [w, s] of rows) { if (only && !only.test(w)) continue; for (const k of Array.isArray(s) ? [2, 3, 4] : [1, 2, 3]) console.log('[fire] ' + fireLine(underFire(w, s, lv, k, N))); }
    }
    expect(true).toBe(true);
  }, 7200000);
});
