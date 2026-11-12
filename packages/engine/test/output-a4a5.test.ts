// Steps a4 and a5 of the damage-formula migration (docs/design/handoffs/unified-damage-stage-a.md): Sigil, the Outburst,
// prayers and the medic's kit build their numbers with amountOf (effects/output.ts). A re-expression: every number is
// the SAME FLOATING-POINT NUMBER the old closed form gave, for any inputs, not only the ones the golden tables hold.
// The old forms are written out here as they stood in sigil.ts, magic.ts, faith.ts and the kit before the move.
import { describe, it, expect } from 'vitest';
import { outburstDamage, outburstHeal, inverseShield, shellShield, loveHeal, interventionAmount, kitHeal, amountOf, closeAmount, openAmount, term,
  SOUL_DAMAGE_ENEMY, BUFF_HEAL, BUFF_HEAL_ENEMY, BOON_AREA, MODULE, FEELING, INTERVENTION, devotionNow } from '../src';
import { sigilDamage, sigilBoon, sigilPower } from '../src/sigil';

/** A small seeded generator (the test's own: nothing in the engine reads it). */
function rand(seed: number): () => number { let s = seed >>> 0; return () => { s = (s + 0x6d2b79f5) >>> 0; let t = Math.imul(s ^ (s >>> 15), 1 | s); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
const pick = <T>(r: () => number, xs: T[]): T => xs[Math.floor(r() * xs.length)];

describe('a4: a Sigil Line and an Outburst on the one formula, to the last place', () => {
  it('a Sigil damage part: round(base × shape × line × power × sharpened × items × critical), each type apart', () => {
    const r = rand(1117);
    for (let i = 0; i < 20000; i++) {
      const n = pick(r, [14, 18, 22, 25, 30, 33, 36.3, 45, 7, 11, 12.5, 16.5]), m = pick(r, [1, 0.5, 0.6, 0.7, 0.35, 0.25, 0.3]), lm = pick(r, [1, 1.7, 1.75, 1.8]);
      const mg = { sigilMult: 1 + 0.1 * Math.floor(r() * 10) + 0.1 * Math.floor(r() * 11), elemMult: 1 + 0.1 * Math.floor(r() * 10) + 0.05 * Math.floor(r() * 11) };
      const sharp = pick(r, [1, 1.25]), hk = pick(r, [1, 1.1, 1.15, 1.2, 0.5, 1.5]), cm = pick(r, [1, 1.5, 1.75, 2, 1.35]);
      for (const type of ['sigil', 'elemental'] as const) expect(sigilDamage(mg, type, n, m, lm, sharp, hk, cm)).toBe(Math.round(n * m * lm * sigilPower(mg, type) * sharp * hk * cm));
    }
  });
  it('MEND and WARD: round(base × shape × Sigil × Healing given × level × items)', () => {
    const r = rand(1120);
    for (let i = 0; i < 20000; i++) {
      const hl = pick(r, [6, 7, 7.7, 30, 12, 13.2]), m = pick(r, [1, 0.4, 0.5, 0.25]), sm = 1 + 0.1 * Math.floor(r() * 19), hm = 1 + 0.1 * Math.floor(r() * 19), lf = pick(r, [1, 1.03, 1.12, 1.24, 1.41, 1.82]), hk = pick(r, [1, 1.1, 1.25]);
      for (const kind of ['heal', 'shield'] as const) expect(sigilBoon(kind, hl, m, sm, hm, lf, hk)).toBe(Math.round(hk * (hl * m * sm * hm * lf)));
    }
  });
  it('the Outburst: damage, the Buff heal, Inverse, Shell and Love, for the heart of a character and of an enemy', () => {
    const r = rand(1119); const M: any = MODULE, F: any = FEELING;
    const forms = ['bolt', 'wave', 'burst', 'aura', 'lance'], fm = (f: string) => (f === 'bolt' ? 1 : M[f]?.damage_mult ?? 1);
    for (let i = 0; i < 20000; i++) {
      const char = r() < 0.7, form = pick(r, forms), mods = [...(form === 'bolt' ? [] : [form]), ...(r() < 0.2 ? ['at_once'] : []), ...(r() < 0.2 ? ['split'] : [])];
      const d: any = { school: 'damage', modules: mods, form }, sm = pick(r, [0.6, 0.8, 1, 1.2, 1.4, 1.6, 1.85, 2.05, 2.4, 0.9]);
      const m: any = { soulMult: 1 + 0.05 * Math.floor(r() * 10) + 0.1 * Math.floor(r() * 11), healMult: 1 + 0.1 * Math.floor(r() * 19), ...(char ? { soulBase: pick(r, [40, 36, 28]), mend: pick(r, [1, 1.12, 1.41, 1.82]) } : {}) };
      const atOnce = mods.includes('at_once') ? M.at_once?.damage_mult ?? 0.5 : 1, area = !char ? 1 : form !== 'bolt' ? BOON_AREA : mods.includes('split') ? (M.split?.boon_mult ?? 0.8) : 1, lvl = m.mend ?? 1;
      const dmg = (m.soulBase ?? SOUL_DAMAGE_ENEMY) * m.soulMult * sm * fm(form) * atOnce;
      expect(outburstDamage(m, d, sm)).toBe(dmg);
      expect(outburstHeal(m, d, sm)).toBe((char ? BUFF_HEAL : BUFF_HEAL_ENEMY) * m.healMult * sm * lvl * area);
      expect(inverseShield(m, d, sm)).toBe(char ? (M.inverse?.shield ?? 10) * m.soulMult * sm * lvl * area : dmg * (M.inverse?.shield_mult_enemy ?? 0.7));
      expect(shellShield(m, d, sm)).toBe(char ? (M.shell?.shield ?? 4) * m.soulMult * sm * lvl : dmg * (M.shell?.shield_of_power_enemy ?? 0.35));
      for (const [lone, ar] of [[false, false], [true, false], [false, true]] as const)
        expect(loveHeal(m, d, sm, lone, ar)).toBe((char ? BUFF_HEAL : BUFF_HEAL_ENEMY) * m.healMult * sm * lvl * (ar ? area : 1) * (lone ? F.love?.pour?.lone_heal_share ?? 0.15 : F.love?.pour?.heal_share ?? 0.25));
    }
  });
});

describe('a5: prayers and the kit on the one formula, to the last place', () => {
  it('an intervention: round((20 + 4 × Devotion) × Blessing power)', () => {
    for (let dv = 0; dv <= 10; dv++) for (let f = 0; f <= 10; f++) {
      const c: any = { patron: 'nerukhan', devotion: dv }, power = 1 + 0.1 * f;
      expect(devotionNow(c)).toBe(dv);
      expect(interventionAmount(c, power)).toBe(Math.round((INTERVENTION.base + INTERVENTION.perDevotion * devotionNow(c)) * power));
    }
  });
  it('the kit: base × Healing given × level × the own multiplier of the move; a Field Repair floors its per-point number', () => {
    const r = rand(1123);
    for (let i = 0; i < 20000; i++) {
      const base = pick(r, [5, 6, 3]), hm = 1 + 0.1 * Math.floor(r() * 19) + pick(r, [0, 0.25, 0.5]), lf = pick(r, [1, 1.03, 1.12, 1.24, 1.41, 1.82]), rest = pick(r, [1, 3]), prof = Math.floor(r() * 11);
      expect(kitHeal(base, hm, lf, { own: [term(rest, 'time to work')] })).toBe(base * hm * lf * rest);
      expect(kitHeal(0, hm, lf, { per: { of: 'improvisation', value: base, n: prof }, floor: true })).toBe(Math.floor(base * prof * hm * lf));
    }
  });
  it('the base is multiplied by each term in turn, then by the target bonus; `round` says how it is made whole', () => {
    const a = openAmount({ kind: 'damage', base: 30 }, null, { mults: [term(1.5, 'a'), term(1.1, 'b')], vs: [term(0.2, 'vs')] });
    expect(closeAmount(a).raw).toBe(30 * 1.5 * 1.1 * 1.2);
    expect(amountOf({ kind: 'damage', base: 2.5, round: 'round' }, null).amount).toBe(3);
    expect(amountOf({ kind: 'damage', base: 2.5 }, null).amount).toBe(2);
    expect(amountOf({ kind: 'damage', base: 2.5, round: 'none' }, null).amount).toBe(2.5);
  });
});
