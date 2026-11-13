// @ts-nocheck (test fixtures: plain objects)
// Classes 3.0 step 8's integration (rules 1.32 to 1.34 meeting): Figments against Shadow, Bonds and Tending. The lead's
// rulings: Figments and machines can't be Bonded; a Figment can't Hide; a Mender's Tending heals a Figment
// (figments-spec rule 14: "heals may target them"; bonds-spec is silent, so the two agree).
import { describe, it, expect } from 'vitest';
import { figFight } from './helpers/figfight';
import { withGame } from './helpers/perkfight';
import { applyCond } from '../src';
import { hide } from '../src/tactics';
import { makeFigment } from '../src/figments';
import { runPerkAction, previewPerkAction } from '../src/effects/actions';
import { acted } from '../src/combat';
import FIGJ from '../../../data/figments.json';

function setup() {
  const f = figFight([{ skills: { visualization: 5 }, level: 5 }, { name: 'Mender', skills: { empathy: 5 }, level: 5, visualizer: null, offHand: 'attuner', weapon: 'service_pistol' }], [{ at: '12,8' }]);
  const [owner, mender] = f.pcs;
  owner.pos = '3,5'; mender.pos = '3,6';
  const beast = withGame(f.g, () => makeFigment(f.cb, f.g.rng as any, owner, 'beast', [], '4,5', { charge: 1 }));
  if (typeof beast === 'string') throw new Error(beast);
  const W = (fn) => withGame(f.g, fn);
  const x = (u) => ({ u, c: f.g.characters[u.charId], cb: f.cb, g: f.g });
  const pv = (u, id, args = {}) => W(() => previewPerkAction(x(u), id, args, 'combat'));
  const act = (u, id, args = {}) => W(() => { const err = runPerkAction(x(u), id, args, f.g.rng, 'combat'); if (!err) acted(f.cb, u, { action: id, t: f.cb.units.find((v) => v.id === args.targetId) || null, tile: null }); return err; });
  return { f, owner, mender, beast, W, pv, act };
}

describe('Figments meet Shadow, Bonds and Tending (step 8 integration)', () => {
  it('a Figment is immune to Hidden (figments.json unit_effects): neither the condition nor a hide (Silent Partner\'s door) hides it', () => {
    expect((FIGJ as any).unit_effects.effects).toContainEqual({ op: 'immunity', to: 'hidden' });
    const { f, beast, owner, W } = setup();
    W(() => applyCond(f.cb, f.g.rng, owner, beast, 'hidden'));
    expect(beast.hidden).toBeFalsy();
    W(() => hide(f.cb, beast, 'test'));
    expect(beast.hidden).toBeFalsy();
  });
  it('Bond refuses a Figment and a machine (a turret, a drone): no heart to Bond', () => {
    const { f, mender, beast, pv } = setup();
    f.turn(mender); mender.ap = 9;
    expect(pv(mender, 'verb:tend.bond', { targetId: f.pcs[0].id }).ok).toBe(true); // the gate is open: an ally Bonds
    expect(pv(mender, 'verb:tend.bond', { targetId: beast.id }).ok).toBe(false);
    for (const kind of ['turret', 'drone']) { const foe = f.foe; foe.kind = kind; foe.pos = '5,6'; expect(pv(mender, 'verb:tend.bond', { targetId: foe.id }).ok, kind).toBe(false); }
  });
  it('Tending heals a hurt Figment (rule 14: heals may target them)', () => {
    const { f, mender, beast, act } = setup();
    f.turn(mender); mender.ap = 9; beast.hp = Math.max(1, beast.maxHp - 20); const was = beast.hp;
    expect(act(mender, 'verb:tend.mend', { targetId: beast.id })).toBeNull();
    expect(beast.hp).toBeGreaterThan(was);
  });
});
