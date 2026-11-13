// @ts-nocheck (test fixtures: plain objects)
// Classes 3.0 step 1b, the integration review: one harder "Built from" row of each system spec, written in data on the
// primitives (test only, not game content): an enemy Bond's damage share split among the Bonded (redirect split); a
// Ward on a layer at most two units carry; a Break whose term reads a resource meter through a number block (res:, the
// Shadow meter's door: momentum stands in until Shadow's row exists); a turn-owner Figment's upkeep at its owner's
// turn start; a delayed healing echo (and an echo never echoes itself).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { tie, addTieKinds, clearTieKinds } from '../src/kit';
import { spawnOwned, addOwnedBlocks, clearOwnedBlocks, ownedBy } from '../src/owned';
import { healUnit, applyDamage, grantShield, shieldTotal } from '../src/effects/damage';
import { previewAttack } from '../src/combat';
import { actionsFor } from '../src/descriptors';
import { fogFight } from '../src/fog';
import { W, pcs, foes, turn } from './golden/harness';
import { opsFight } from './golden/itemops';

const TIE = [{ id: 'hard_bond', max: 3, ends_on: ['from_down', 'to_dead', 'combat_end'], on_end: 'none' }];
const RELICS = [
  { id: 'hard_share', name: 'The share (test)', text: 'A fifth of what you take goes to the enemies Bonded to you, split.',
    effects: [{ op: 'redirect', when: 'taking', share: 0.2, split: true, targets: { side: 'foe', tied: 'hard_bond' } }] },
  { id: 'hard_break', name: 'The Break (test)', text: 'A toggle: the hit is multiplied by 1 + a tenth a point of the meter.',
    toggles: [{ id: 'break', name: 'Break', on: ['combat/attack'], effects: [{ op: 'damage_mult', when: 'dealing', value: { base: 1, per: [{ of: 'res:momentum', value: 0.1 }] } }] }], effects: [] },
  { id: 'hard_echo', name: 'Healing echo (test)', text: 'A heal you give an ally comes again, half of it, at the start of its next turn.',
    effects: [{ op: 'mend', when: 'heal_given', if: { actor: 'self', target: 'ally' }, amount: { kind: 'heal', base: 0, per: [{ of: 'event:amount', value: 0.5 }] }, target: 'target', delay: { until: 'target_turn_start' } }] },
];
const FIGMENT = { id: 'hard_figment', name: 'Figment', kind: 'machine', hp: 20, defense: 10, attack_bonus: 1, armour: 0, movement: 2, weapon: 'fists', turn: 'owner', owned_kind: 'figment', upkeep: { res: 'echo', n: 1 }, actions: ['move', 'melee'] };

describe('harder Built-from rows', () => {
  beforeAll(() => { addTieKinds(TIE); addItems('relic', RELICS); addOwnedBlocks([FIGMENT]); });
  afterAll(() => { clearTieKinds(); clearAddedItems(); clearOwnedBlocks(); });

  it('bonds: an enemy Bond\'s damage share, split among the two Bonded enemies (and never moved again)', () => {
    const g = opsFight({ relics: ['hard_share'] }), cb = g.combat, u = pcs(g)[0], [f, far] = foes(g);
    W(g, () => {
      tie(cb, u, f, 'hard_bond'); tie(cb, u, far, 'hard_bond'); u.shield = 0; f.shield = 0; far.shield = 0;
      const a = u.hp, b = f.hp, c = far.hp; applyDamage(cb, u, 100, { by: foes(g)[2], type: 'weapon', shield: true, credit: 'hp' });
      expect(a - u.hp).toBe(80); expect(b - f.hp).toBe(10); expect(c - far.hp).toBe(10);
    });
  });

  it('chaplain: a Ward on its own layer, at most two carry the giver\'s; spent before the base shield', () => {
    const g = opsFight({}), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    W(g, () => {
      for (const x of [u, al, f]) { x.shield = 0; x.shieldRecv = 1; }
      grantShield(cb, u, 7, u, { layer: 'ward', holders: 2 }); grantShield(cb, al, 7, u, { layer: 'ward', holders: 2 });
      grantShield(cb, f, 7, u, { layer: 'ward', holders: 2 }); // a third: the oldest (on the holder itself) ends
      expect(u.shields).toBeUndefined(); expect(al.shields?.[0]).toMatchObject({ layer: 'ward', n: 7, by: u.id }); expect(f.shields?.[0].n).toBe(7);
      al.shield = 5; expect(shieldTotal(al)).toBe(12);
      const hp = al.hp; applyDamage(cb, al, 9, { by: f, type: 'weapon', shield: true, credit: 'hp' });
      expect(al.shields).toBeUndefined(); expect(al.shield).toBe(3); expect(al.hp).toBe(hp); // the ward first, then the base
    });
  });

  it('shadow: the Break\'s term reads a meter through a number block (res:)', () => {
    const g = opsFight({ relics: ['hard_break'] }), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    const total = (n: number, on: boolean) => W(g, () => { u.resMax = { ...(u.resMax || {}), momentum: 5 }; u.res = { ...(u.res || {}), momentum: n }; cb.mods = on ? ['relic:hard_break#break'] : []; try { return previewAttack(cb, u, f, 'shot').dmg; } finally { delete cb.mods; } });
    const base = total(3, false), on0 = total(0, true), on3 = total(3, true);
    expect(on0.mults.length).toBe(base.mults.length + 1); expect(on3.mults.at(-1)?.v ?? on3.mults.find((m: any) => /Break/.test(m.label))?.v).toBeCloseTo(1.3, 5);
    expect(on3.total).toBeGreaterThan(on0.total);
  });

  it('figments: a turn-owner Figment\'s upkeep at its owner\'s turn start; unpaid, it is unmade and its rows go', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0], c = g.characters[u.charId];
    const p = W(g, () => spawnOwned(cb, u, FIGMENT.id, '3,7', g.rng));
    expect(cb.order).not.toContain(p.id);
    c.echo = 1; turn(g, u, 6); expect(c.echo).toBe(0); expect(ownedBy(cb, u)).toEqual([p]);
    expect(actionsFor(g, u.id).filter((d) => d.id.startsWith('ow:')).length).toBe(2);
    turn(g, u, 6); expect(ownedBy(cb, u)).toEqual([]); expect(cb.units.includes(p)).toBe(false);
    expect(actionsFor(g, u.id).some((d) => d.id.startsWith('ow:'))).toBe(false);
  });

  it('bonds: a delayed healing echo lands at the ally\'s next turn, its amount fixed when it was queued; an echo never echoes', () => {
    const g = opsFight({ relics: ['hard_echo'] }), cb = g.combat, [u, al] = pcs(g);
    W(g, () => {
      al.healRecv = 1; al.hp = 1; healUnit(cb, al, 20, u, 'heal'); expect(cb.delayed?.length).toBe(1); expect(cb.delayed[0].op.fixed.n).toBe(10);
      expect(fogFight(g, cb, cb, 'pc').delayed?.length).toBe(1); expect(fogFight(g, cb, cb, 'foe').delayed).toBeUndefined(); // a side's own delayed ops only
      const hp = al.hp; turn(g, al, 6); expect(al.hp - hp).toBe(10);
      expect(cb.delayed).toBeUndefined(); // the echo's own heal queued nothing
      al.hp = 1; healUnit(cb, al, 20, u, 'heal'); expect(cb.delayed?.length).toBe(1); // and the item still echoes the next heal (its data untouched)
      expect(RELICS[2].effects[0]).toMatchObject({ when: 'heal_given', delay: { until: 'target_turn_start' }, if: { actor: 'self', target: 'ally' } });
    });
  });
});
