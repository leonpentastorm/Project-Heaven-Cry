// @ts-nocheck (test fixtures: plain objects)
// 0.28.3, Leon's playtest on 0.28.2 ("Guide does not work"): the fight screen's one action flow (actionFlow.ts) for
// Tending's Guide: click the ally, then the tile it steps to (the legal tiles shaded), and Confirm sends both. Before,
// the flow had no tile step and Confirm sent the ally alone: 1 AP and the MP went, and nobody moved.
import { describe, expect, it } from 'vitest';
import { apply, newGame, ARCHETYPES, beginTurn, withGame, reachable } from '@engine';
import { flowView } from './actionFlow';

const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x: any) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
function fight() {
  let g: any = newGame('GUIDE2', { id: 'host', name: 'L' }, 'seed-g'); g.settings.play = 'survival';
  g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') }, 'host');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'M' }, 'host'); g = apply(g, { type: 'char/add', sheet: sheet('Gun', 'sharpshooter') }, 'p2');
  g = apply(g, { type: 'run/start', seed: 'PHC-0001' }, 'host'); g = apply(g, { type: 'run/ready', close: true }, 'host');
  const med: any = Object.values(g.characters).find((c: any) => c.name === 'Medic');
  const node = reachable(g.run).find((n: any) => n.kind === 'fight');
  for (const by of ['host', 'p2']) if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, by);
  const cb = g.combat, mu = cb.units.find((u: any) => u.charId === med.id), al = cb.units.find((u: any) => u.side === 'pc' && u.id !== mu.id);
  const [x, y] = mu.pos.split(',').map(Number); al.pos = x + ',' + (y + 1);
  cb.turn = cb.order.indexOf(mu.id); delete cb.window; withGame(g, () => beginTurn(cb, g.rng)); mu.ap = 9;
  return { g, mu, al };
}
const ID = 'pk:verb:tend.guide#tend_guide';

describe('0.28.3: Guide on the fight screen', () => {
  it('click the ally, then a shaded tile: Confirm sends both, and the ally steps there', () => {
    const { g, mu, al } = fight();
    const fv0 = withGame(g, () => flowView(g, 'host', mu, { action: ID }))!;
    expect(fv0.click({ id: al.id, side: al.side }, al.pos)).toMatchObject({ target: al.id });
    const fv = withGame(g, () => flowView(g, 'host', mu, { action: ID, target: al.id }))!;
    expect(fv.ready).toBe(false);
    expect(fv.sel.text).toMatch(/Now click the tile/);
    expect(fv.area.length).toBeGreaterThan(0);
    const to = fv.area[0];
    expect(fv.click(null, to)).toEqual({ tile: to });
    const fv2 = withGame(g, () => flowView(g, 'host', mu, { action: ID, target: al.id, tile: to }))!;
    expect(fv2.ready).toBe(true);
    expect(fv2.action).toMatchObject({ type: 'combat/perk', targetId: al.id, tile: to });
    const g2 = apply(g, fv2.action, 'host');
    expect(g2.combat.units.find((u: any) => u.id === al.id).pos).toBe(to);
  });
});
