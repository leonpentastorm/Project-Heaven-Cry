// The 0.32 gaps lane (docs/design/handoffs/BEFORE-ITEMS-2.0.md group B): each fault proved through the reducer or the
// engine's own answers to the screens (actionsFor, previewDescriptor), never an inner function the game does not call.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { figFight } from './helpers/figfight';
import { physFight, rig } from './helpers/physfight';
import { actionsFor, previewDescriptor } from '../src';

describe('TRIAGE row 10: a resource price of 1 names one ("1 core", never "1 spare cores")', () => {
  it('Load the Visualizer costs 1 core, read off the action row the Figments tab shows', () => {
    const f = figFight([{ skills: { visualization: 5 }, cores: 5 }]);
    const u = f.turn(f.pc);
    const row = actionsFor(f.g, u.id).find((d) => /visualizer_core/.test(d.id));
    expect(row, 'the Load the Visualizer row').toBeTruthy();
    expect(row!.cost.text).toMatch(/· 1 core\b/);
    expect(row!.cost.text).not.toMatch(/spare cores/);
    expect(f.unit(u.id).mg!.cores).toBe(5); // the spare count is the pack's: five held, five spare
  });
});

// G1 (spec item 5600): the Momentum line of a melee preview is the technique run on a copy as a hit
describe('G1: a Charge previews the Momentum it really reaches (Rolling Start\'s hit-time op counted)', () => {
  it('the descriptor\'s "Momentum a → b" equals what the reducer leaves after the same Charge hits', () => {
    const make = () => {
      const f = physFight([{ weapon: 'sabre', known: ['charge'], skills: { raw_power: 4, athletics: 4 }, attrs: { strength: 4 }, level: 6, picks: ['fork.momentum.rolling_start'] }], [{ at: '8,4', tier: 'elite' }]);
      f.cb.objects = []; const u = f.turn(f.pc); f.put(u, '5,4'); f.put(f.foe, '8,4');
      const foe = f.unit(f.foe.id); foe.hp = foe.maxHp = 9999; f.unit(u.id).ap = 9; f.unit(u.id).openerUsed = true; f.momentum(u, 1);
      return { f, u: f.unit(u.id) };
    };
    const a = make();
    const pv: any = previewDescriptor(a.f.g, a.u.id, 'tq:main:charge', { targetId: a.f.foe.id }, 'host');
    const line = (pv?.lines || []).find((l: any) => /^Momentum /.test(l.text))?.text || '';
    expect(a.f.momentum(a.f.unit(a.u.id))).toBe(1); // the preview changed nothing
    const b = make(); rig({ hit: true, die: 12 });
    expect(b.f.tech('charge', { targetId: b.f.foe.id })).toBeNull();
    const after = b.f.momentum(b.f.unit(b.u.id)); rig(null);
    expect(after).toBeGreaterThan(1);
    expect(line).toBe('Momentum 1 → ' + after);
  });
});
