// Rules 1.66 (0.31.6): the outside reviewer's 90-minute report, each lead through the real path (the reducer).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { d20, type Unit } from '../src';
import { fightWith, withGame } from './helpers/perkfight';
import { canYield } from '../src/yielding';
import { togglesFor } from '../src/effects/actions';

type F = ReturnType<typeof fightWith>;
const open = (cb: any) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] }; cb.objects = []; };
const sure = (u: Unit) => { u.attack = 60; };
function fight(specs: any[], foes: any[] = [{}]) {
  const f = fightWith(specs, foes.map((x, i) => ({ at: 'E6', ...x, name: x.name || 'Foe ' + (i + 1) })));
  open(f.cb); f.pcs.forEach((u, i) => { if (!u.companion) u.pos = '2,' + (5 + i); });
  f.foes.forEach((u, i) => { u.pos = (4 + i) + ',5'; });
  f.turn(f.pc); f.pc.ap = 9;
  return f;
}
const faithful = (f: F) => { const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'nerukhan' } as any; c.patron = 'nerukhan'; c.devotion = 5; return c; };

describe('A2: can this enemy yield (item 5200, 5201)', () => {
  it('one answer: a drone, a machine, a boss and a no_surrender foe cannot; a soldier can', () => {
    const f = fight([{}], [{}, {}, {}, {}, {}]);
    const [s, d, m, b, n] = f.foes; d.kind = 'drone'; m.kind = 'machine'; b.tier = 'boss'; n.tags = ['no_surrender'];
    expect([s, d, m, b, n].map(canYield)).toEqual([true, false, false, false, false]);
  });
  it('a Spare blow disables a drone: it goes down, no Clean Hands shield, no Mercy vow kept, the log says so', () => {
    const f = fight([{ perks: { clean_hands: 'I' }, skills: { faith: 5 } }], [{}, {}]); sure(f.pc); faithful(f);
    f.act({ type: 'faith/vow', unitId: f.pc.id, id: 'mercy' } as any);
    const drone = f.foe; drone.kind = 'drone'; drone.hp = 1; f.pc.shield = 0;
    f.act({ unitId: f.pc.id, type: 'combat/attack', targetId: drone.id, mode: 'shot', mods: ['spare'] } as any);
    const d = f.unit(drone.id); expect(d.dead).toBe(true); expect(d.surrendered).toBeFalsy();
    expect(f.unit(f.pc.id).shield || 0).toBe(0);
    expect(f.unit(f.pc.id).vow?.state).not.toBe('kept');
    expect(f.cb.log.some((l) => /cannot yield: disabled, no mercy shown/.test(l))).toBe(true);
  });
  it('the Spare toggle\'s preview says a drone cannot yield; a soldier\'s says it is subdued', () => {
    const f = fight([{ perks: { clean_hands: 'I' } }], [{}, {}]); f.foes[1].kind = 'drone';
    const pv = (t: Unit) => withGame(f.g, () => togglesFor({ u: f.pc, c: f.g.characters[f.pc.charId!], cb: f.cb, g: f.g }, 'combat/attack', { action: 'shot', target: t }, [])).find((x) => /spare/.test(x.id))!.preview!;
    expect(pv(f.foes[1])).toMatch(/cannot yield/); expect(pv(f.foes[0])).toMatch(/subdued/);
  });
});
void d20;
