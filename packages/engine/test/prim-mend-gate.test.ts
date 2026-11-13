// Classes 3.0 step 1b, sub-step 8 (docs/design/heal-shield-percent-spec.md section 4): the percent gate and the cap,
// ONE place (effects/output.ts mend), as data fields with no number set: an amount block's (or its profile's) min_pct,
// gate_hp, data/rules.json mending.gate.hp and mending.cap_pct. Every profile's gate is absent and the rules give no
// gate and no cap, so no heal or shield moves (the golden tables hold it); step 7b sets the numbers.
import { describe, it, expect } from 'vitest';
import { mend, mendGate, MEND_GATE, PROFILES } from '../src/effects/output';
import { healUnit } from '../src/effects/damage';
import { W, pcs } from './golden/harness';
import { opsFight } from './golden/itemops';

describe('the percent gate and the cap (switched on by data in step 7b, rules 1.36)', () => {
  it('the numbers are data: the 2-AP heal profiles\' 20%, the gate\'s 145 HP, the cap at half the bar; a source with no profile has no gate', () => {
    for (const id of ['mend', 'sigil_mend', 'soul_mend', 'tend']) expect(PROFILES[id].min_pct, id).toBe(0.2);
    for (const id of ['weapon', 'sigil', 'soul', 'flat', 'healing']) expect(PROFILES[id].min_pct, id).toBeUndefined();
    expect(MEND_GATE).toEqual({ hp: 145, cap_pct: 0.5 });
    const t: any = { maxHp: 200 }; expect(mendGate({ kind: 'heal', base: 5 }, t)).toBe(0);
  });
  it('a block\'s min_pct: at least that share of the target\'s max HP (rounded up), counted up to gate_hp, before the own multipliers', () => {
    const t: any = { maxHp: 133 };
    expect(mendGate({ kind: 'heal', base: 1, min_pct: 0.2 }, t)).toBe(Math.ceil(0.2 * 133));
    expect(mendGate({ kind: 'heal', base: 1, min_pct: 0.2, gate_hp: 100 }, t)).toBe(20);
    expect(mendGate({ kind: 'heal', base: 1, min_pct: 0.2, gate_hp: null }, t)).toBe(Math.ceil(0.2 * 133));
    const g = opsFight({}), cb = g.combat, [u, al] = pcs(g);
    W(g, () => {
      al.healRecv = 1; al.hp = 1; const want = Math.ceil(0.2 * Math.min(al.maxHp, 100));
      expect(mend(cb, u, al, { kind: 'heal', base: 1, min_pct: 0.2, gate_hp: 100 }).restored).toBe(want);
      al.hp = 1; expect(mend(cb, u, al, { kind: 'heal', base: 1, min_pct: 0.2, gate_hp: 100 }, { mults: [{ v: 2, label: 'own' }] }).restored).toBe(want * 2); // the own multipliers come after the gate
      al.hp = 1; expect(mend(cb, u, al, { kind: 'heal', base: 999, min_pct: 0.2, gate_hp: 100 }).restored).toBe(Math.min(al.maxHp - 1, Math.floor(0.5 * al.maxHp))); // over the gate: the formula, held to the cap (rules 1.36)
      al.shieldRecv = 1; al.shield = 0; expect(mend(cb, u, al, { kind: 'shield', base: 1, min_pct: 0.2, gate_hp: 100 }).shield).toBe(want); // shields too
    });
  });
  it('the cap: the sink holds one heal to it, after the received bonuses', () => {
    const g = opsFight({}), cb = g.combat, [, al] = pcs(g);
    W(g, () => { al.healRecv = 1.5; al.hp = 1; expect(healUnit(cb, al, 100, null, 'heal', { cap: 30 }).restored).toBe(30); });
  });
});
