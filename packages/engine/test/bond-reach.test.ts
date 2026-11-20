// @ts-nocheck (test fixtures: plain objects)
// 0.28.3 (Leon on live 0.28.2: "bond cannot select enemies"): the engine's side of the fix. Through the reducer, in a
// Survival fight at level 1 with the Empath on the Recommended loadout (the Attuner in the off hand): Bond on an enemy
// within its reach ties it; Bond on an enemy beyond its reach is refused, in words, and ties nothing. The screen shows
// those same words for a unit it can't pick (apps/web/src/screens/combat-unit-pick.test.ts).
import { describe, it, expect } from 'vitest';
import { apply, newGame, ARCHETYPES, beginTurn, withGame, reachable } from '../src';
import { walkIn } from './helpers/survival';
import tendingJ from '../../../data/tending.json';

const RANGE: number = (tendingJ as any).bond.make_range;
const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
function fight() {
  let g: any = newGame('BOND02', { id: 'host', name: 'L' }, 'seed-r'); g.settings.play = 'survival';
  g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') }, 'host');
  g = apply(g, { type: 'run/start', seed: 'PHC-0001' }, 'host');
  g = apply(g, { type: 'run/ready', close: true }, 'host');
  const node = reachable(g.run).find((n: any) => n.kind === 'fight') || reachable(g.run)[0];
  if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, 'host'); g = walkIn(g);
  const cb = g.combat, mu = cb.units.find((u: any) => u.side === 'pc'), foes = cb.units.filter((u: any) => u.side === 'foe');
  cb.map = { ...cb.map, solid: [], cover: [], full: [], objects: [] }; cb.objects = [];
  mu.pos = '2,2'; foes[0].pos = (2 + RANGE) + ',2'; foes[1].pos = (3 + RANGE) + ',3'; for (const f of foes.slice(2)) f.pos = '1,' + (8 + foes.indexOf(f));
  for (const f of foes) { f.hidden = false; f.sv = { heart: -99 }; }
  cb.turn = cb.order.indexOf(mu.id); delete cb.window; withGame(g, () => beginTurn(cb, g.rng)); mu.ap = 6;
  return { g, mu, edge: foes[0], beyond: foes[1] };
}

describe('0.28.3: Bond on an enemy, through the reducer', () => {
  it('an enemy at the edge of the reach is Bonded', () => {
    const { g, mu, edge } = fight();
    const g2: any = apply(g, { type: 'combat/perk', unitId: mu.id, id: 'verb:tend.bond', targetId: edge.id }, 'host');
    expect(g2.combat.ties?.some((t: any) => t.kind === 'bond' && t.from === mu.id && t.to === edge.id)).toBe(true);
  });
  it('an enemy one tile beyond it is refused in words, and nothing is tied or spent', () => {
    const { g, mu, beyond } = fight();
    expect(() => apply(g, { type: 'combat/perk', unitId: mu.id, id: 'verb:tend.bond', targetId: beyond.id }, 'host')).toThrow('Out of range (' + RANGE + ' tiles).');
    expect(g.combat.ties?.some((t: any) => t.kind === 'bond') || false).toBe(false);
    expect(g.combat.units.find((u: any) => u.id === mu.id).ap).toBe(6);
  });
});
