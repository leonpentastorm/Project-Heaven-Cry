// @ts-nocheck (test fixtures: the blocks are plain objects)
// Classes 3.0 step 1b, the integration (the lead's ruling on the builder's stop): the owned action system. An owned unit
// with turn "owner" never enters cb.order; its verbs are offered to ITS OWNER during the owner's turn (descriptors.ts,
// the system OWNED: rows of the owner's Utility tab) and run by the reducer's combat/owned {unitId: owner, owned, verb,
// targetId?, tile?} with the owned unit as the actor, priced on it and paid by its owner (owned.ts runOwned). A turn
// "auto" unit acts once at the start of its owner's turn through the same door, its verb and target from its block.
// One tie kind, `owned`, for companions and Figments alike: the record's `kind` tells them apart. Fixture blocks only
// (no Figment data).
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { spawnOwned, addOwnedBlocks, clearOwnedBlocks, ownedBy, ownerOf, OWNED_TIE, runOwned } from '../src/owned';
import { tiesOf } from '../src/kit';
import { actionsFor, sendDescriptor, previewDescriptor } from '../src/descriptors';
import { A, W, pcs, foes, turn, place } from './golden/harness';
import { opsFight } from './golden/itemops';

const PUPPET = { id: 'test_puppet', name: 'Puppet', kind: 'machine', hp: 20, defense: 10, attack_bonus: 1, armour: 0, movement: 2, weapon: 'fists', turn: 'owner', owned_kind: 'figment', actions: ['move', 'melee'] };
const TURRET = { id: 'test_turret', name: 'Turret', kind: 'machine', hp: 20, defense: 10, attack_bonus: 1, armour: 0, movement: 1, weapon: 'service_pistol', infinite_ammo: true, turn: 'auto', auto: { verb: 'shot', target: 'nearest_foe' } };
const unit = (g: any, id: string) => g.combat.units.find((x: any) => x.id === id);

describe('the owned action system', () => {
  beforeAll(() => addOwnedBlocks([PUPPET, TURRET]));
  afterAll(() => clearOwnedBlocks());

  it('a turn-owner unit: out of the order, one tie kind (owned), its record says what it is', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0];
    W(g, () => {
      const p = spawnOwned(cb, u, PUPPET.id, '3,7', g.rng) as any;
      expect(cb.order).not.toContain(p.id); expect(tiesOf(cb, u, OWNED_TIE)[0].kind).toBe('owned'); expect(ownerOf(cb, p)).toBe(u);
      expect(p.owned).toMatchObject({ turn: 'owner', kind: 'figment' });
    });
  });

  it('its verbs are the owner\'s rows (a Figment\'s: the Figments tab, Classes 3.0 step 10); sent, the owned unit moves and attacks and the owner pays', () => {
    const g0 = opsFight({}), u0 = pcs(g0)[0];
    const p0 = W(g0, () => spawnOwned(g0.combat, u0, PUPPET.id, '3,7', g0.rng)) as any;
    const rows = actionsFor(g0, u0.id).filter((d) => d.id.startsWith('ow:'));
    expect(rows.map((d) => d.id)).toEqual(['ow:' + p0.id + ':move', 'ow:' + p0.id + ':melee']);
    expect(rows.every((d) => d.group === 'figments' && !!d.sub && d.available)).toBe(true); // this fixture is owned_kind figment: its own group on the Figments tab
    expect(actionsFor(g0, pcs(g0)[1].id).some((d) => d.id.startsWith('ow:'))).toBe(false); // not the squadmate's
    // move: the descriptor's action through the reducer
    const mv = sendDescriptor(g0, u0.id, 'ow:' + p0.id + ':move', { tile: '3,8' });
    expect(mv).toEqual({ type: 'combat/owned', unitId: u0.id, owned: p0.id, verb: 'move', tile: '3,8' });
    expect(previewDescriptor(g0, u0.id, 'ow:' + p0.id + ':move', { tile: '3,8' }).ok).toBe(true);
    const apOwn = unit(g0, p0.id).ap, ap0 = u0.ap;
    const g1 = A.apply(g0, mv, 'host');
    expect(unit(g1, p0.id).pos).toBe('3,8'); expect(unit(g1, u0.id).ap).toBe(ap0 - 1); expect(unit(g1, p0.id).ap).toBe(apOwn);
    // attack: next to the foe, a Strike; the owner pays the blow's AP
    const f = foes(g1)[0]; W(g1, () => place(g1, [[unit(g1, p0.id), '4,7'], [f, '4,6']]));
    const hp = unit(g1, f.id).hp, ap1 = unit(g1, u0.id).ap;
    const g2 = A.apply(g1, sendDescriptor(g1, u0.id, 'ow:' + p0.id + ':melee', { targetId: f.id }), 'host');
    expect(unit(g2, u0.id).ap).toBe(ap1 - 2); expect(g2.combat.log.some((l: string) => l.startsWith('Puppet '))).toBe(true);
    void hp;
  });

  it('refused: not the owner\'s turn, a verb it does not have, more than the owner can pay', () => {
    const g = opsFight({}), cb = g.combat, [u, al] = pcs(g);
    const p = W(g, () => spawnOwned(cb, u, PUPPET.id, '3,7', g.rng)) as any;
    W(g, () => {
      expect(runOwned(cb, g.rng, al, p, 'move', { tile: '3,8' })).toMatch(/your own/);
      expect(runOwned(cb, g.rng, u, p, 'shot', { targetId: foes(g)[0].id })).toMatch(/can only move, melee/);
      u.ap = 0; expect(runOwned(cb, g.rng, u, p, 'move', { tile: '3,8' })).toBeTruthy(); expect(p.pos).toBe('3,7');
    });
    turn(g, al, 6);
    expect(() => A.apply(g, { type: 'combat/owned', unitId: u.id, owned: p.id, verb: 'move', tile: '3,8' }, 'host')).toThrow(/turn/);
  });

  it('a turn-auto unit acts once at its owner\'s turn start, through the same door: the owner pays', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    const t = W(g, () => spawnOwned(cb, u, TURRET.id, '3,7', g.rng)) as any;
    expect(cb.order).not.toContain(t.id); expect(ownedBy(cb, u)).toEqual([t]);
    const n = cb.log.length;
    cb.turn = cb.order.indexOf(u.id); delete cb.window; W(g, () => A.beginTurn(cb, g.rng));
    const lines = cb.log.slice(n).filter((l: string) => l.startsWith('Turret fires at'));
    expect(lines.length).toBe(1); expect(lines[0]).toMatch(new RegExp('Turret fires at ' + f.name));
    const g2 = opsFight({}), u2 = pcs(g2)[0], cb2 = g2.combat; cb2.turn = cb2.order.indexOf(u2.id); delete cb2.window; W(g2, () => A.beginTurn(cb2, g2.rng));
    expect(u2.ap - u.ap).toBe(A.attackApCost(A.WEAPON.service_pistol, 'shot')); // the shot's AP, paid by the owner
  });
});
