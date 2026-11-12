// @ts-nocheck (a measuring tool)
// THE HEAL AND SHIELD MEASUREMENTS (rules 1.20; docs/design/handoffs/heal-shield-pass.md). What a heal and a shield
// from Sigil, the Outburst and prayer are worth against one Soldier's turn, and how long a pair lasts under fire with
// and without a supporter.
//
//   npm run check -- engine                the cheap tests below (the inventory is arithmetic on the engine's numbers;
//                                          the fights are 3 a row at level 6: a few seconds)
//   HEAL_MEASURE=1 npx vitest run --root packages/engine test/balance/heal-measure.test.ts --silent=false
//                                          the full tables, printed: the yardstick, every source before and after, the
//                                          pairs under fire (levels 1, 6, 12, 20)
//   HEAL_MEASURE_N=20                      fights a row (default 12)        HEAL_MEASURE_LEVELS=6,12
//   HEAL_MEASURE_PARTS=yard,inv,fire       only these parts        HEAL_MEASURE_ROWS=Faith   only the pairs whose name matches
import { describe, it, expect } from 'vitest';
import { inventory, invTable, invNums, underFire, fireLine, soldierTurn, SOLDIER_TURN, RIFLEMAN_HP, H_LEVELS } from './heal-measure';
import { SIGIL, BUFF_HEAL, BOON_AREA, mendFactor } from '../../src';

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

// The bands (the hand-off, section 1.2), pinned on the engine's own numbers for the reference casters at levels 1, 6
// and 20. They are a little wider than the report's, so that a later change that keeps a band does not break a test.
describe('the heal and shield bands hold (rules 1.20)', () => {
  it('the yardstick: a Soldier-turn is about 13% of the rifleman\'s HP at every level, and the level factor follows it', () => {
    for (const lv of H_LEVELS) { const sh = SOLDIER_TURN[lv] / RIFLEMAN_HP[lv]; expect(sh, 'level ' + lv).toBeGreaterThan(0.12); expect(sh).toBeLessThan(0.145); }
    expect([1, 6, 12, 20].map(mendFactor)).toEqual([1, 1.13, 1.38, 1.82]);
  });
  it('Outburst: a steady turn of healing is 100 to 150% of a Soldier-turn, the biggest 135 to 200%, the quick heal about half a turn\'s', () => {
    for (const lv of [1, 6, 20]) {
      const r = inventory('outburst_s', 'normal', lv);
      const steady = row(r, /steady \(Rage and Love/).pctNow, big = row(r, /the biggest/).pctNow, quick = row(r, /stage 1 \(the quick/).pctNow;
      expect(steady, 'steady, level ' + lv).toBeGreaterThanOrEqual(100); expect(steady).toBeLessThanOrEqual(150);
      expect(big, 'biggest, level ' + lv).toBeGreaterThanOrEqual(135); expect(big).toBeLessThanOrEqual(200); expect(big).toBeGreaterThan(steady);
      expect(quick, 'quick, level ' + lv).toBeGreaterThanOrEqual(40); expect(quick).toBeLessThanOrEqual(75);
    }
  });
  it('Sigil: a 2-glyph MEND Line is about one Soldier-turn; the full Line is the biggest single heal (200 to 280%)', () => {
    for (const lv of [1, 6, 20]) {
      const r = inventory('sigil_s', 'normal', lv), two = row(r, /^MEND · SEEK/).pctNow, full = row(r, /^MEND · MEND · CONDENSE/).pctNow;
      expect(two, '2 glyphs, level ' + lv).toBeGreaterThanOrEqual(80); expect(two).toBeLessThanOrEqual(115);
      expect(full, 'the full Line, level ' + lv).toBeGreaterThanOrEqual(200); expect(full).toBeLessThanOrEqual(280);
      expect(full).toBeGreaterThan(row(inventory('outburst_s', 'normal', lv), /the biggest/).pctNow); // the set-up earns the biggest single heal
    }
  });
  it('a shield is about 1.2 times the heal of the same cost', () => {
    expect((SIGIL.ward as any).shield / (SIGIL.mend as any).heal).toBeCloseTo(1.2, 1);
    for (const lv of [1, 6, 20]) {
      const o = inventory('outburst_s', 'normal', lv), ratio = row(o, /Inverse shield, steady/).now / row(o, /steady \(Rage and Love/).now;
      expect(ratio, 'Inverse against the steady heal, level ' + lv).toBeGreaterThan(1.0); expect(ratio).toBeLessThan(1.45);
      const f = inventory('faith_s', 'normal', lv), pr = row(f, /Saint's Shield/).now / row(f, /Warm Hands/).now;
      expect(pr).toBeGreaterThan(1.1); expect(pr).toBeLessThan(1.35);
    }
  });
  it('riders stay small, and an area gives all its allies together at most about 1.6 times the single heal', () => {
    for (const lv of [1, 6, 20]) {
      const o = inventory('outburst_s', 'normal', lv);
      expect(row(o, /Love on a Damage Outburst: an ally/).pctNow).toBeLessThanOrEqual(50); expect(row(o, /^Shell/).pctNow).toBeLessThanOrEqual(75);
      expect(row(o, /in an Aura, steady/).now * 4 / row(o, /steady \(Rage and Love/).now).toBeLessThanOrEqual(1.75);
    }
    expect(BOON_AREA * 4).toBeCloseTo(1.6, 5);
  });
  // Rules 1.22: the healing Hymn waits on its cooldown now and is 13 (10): 75 to 100% of a Soldier-turn a cast.
  it('prayer: a Whisper is 28 to 45% of a Soldier-turn, a healing Hymn 75 to 100% (rules 1.22), the intervention 120 to 180%', () => {
    for (const lv of [1, 6, 20]) {
      const f = inventory('faith_s', 'normal', lv);
      for (const w of [/Whisper: Health/, /Whisper: Protection/]) { expect(row(f, w).pctNow, String(w) + ' level ' + lv).toBeGreaterThanOrEqual(28); expect(row(f, w).pctNow).toBeLessThanOrEqual(45); }
      expect(row(f, /Warm Hands/).pctNow).toBeGreaterThanOrEqual(75); expect(row(f, /Warm Hands/).pctNow).toBeLessThanOrEqual(100);
      expect(row(f, /intervention/).pctNow).toBeGreaterThanOrEqual(120); expect(row(f, /intervention/).pctNow).toBeLessThanOrEqual(180);
    }
  });
  it('all in passes the bands by about half (rules 1.23: there is no round limit to stay under any more)', () => {
    for (const lv of [1, 6, 20]) {
      const a = inventory('mender', 'allin', lv), steady = row(a, /steady \(Rage and Love/), big = row(a, /the biggest/);
      expect(steady.pctNow, 'all in, level ' + lv).toBeLessThanOrEqual(240); expect(big.now).toBeLessThanOrEqual(Math.floor(RIFLEMAN_HP[lv] * 0.5)); // (still under half of the rifleman's HP in one heal)
    }
    expect(BUFF_HEAL).toBe(7);
  });
  it('under fire (level 6, 3 fights a row): a healer keeps a pair up longer under two Soldiers, and nothing keeps it up under four', () => {
    const idle2 = underFire('idle', idleOf(SUPPORT.heal), 6, 2, 3), heal2 = underFire('heal', SUPPORT.heal, 6, 2, 3), heal4 = underFire('heal', SUPPORT.heal, 6, 4, 3);
    const both4 = underFire('heal and shield', [SUPPORT.heal, SUPPORT.shield], 6, 4, 3);
    expect(idle2.errors + heal2.errors + heal4.errors + both4.errors).toBe(0);
    expect(heal2.casts).toBeGreaterThan(1);
    expect(heal2.firstDown).toBeGreaterThan(idle2.firstDown);
    expect(heal4.neverDown, 'a healer under four Soldiers: somebody goes Down').toBe(0);
    expect(both4.neverDown, 'a healer and a shielder under four Soldiers: somebody goes Down').toBe(0);
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
