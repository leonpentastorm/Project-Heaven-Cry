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
  med.skills.camaraderie = Math.max(med.skills.camaraderie || 0, 5); med.perks = [...(med.perks || []), { id: 'pull_together', tier: 'II' }]; // rules 1.75 item 6213: Guide is Pull Together II's
  const node = reachable(g.run).find((n: any) => n.kind === 'fight');
  for (const by of ['host', 'p2']) if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, by);
  const cb = g.combat, mu = cb.units.find((u: any) => u.charId === med.id), al = cb.units.find((u: any) => u.side === 'pc' && u.id !== mu.id);
  const [x, y] = mu.pos.split(',').map(Number); al.pos = x + ',' + (y + 1);
  cb.turn = cb.order.indexOf(mu.id); delete cb.window; delete cb.approach; withGame(g, () => beginTurn(cb, g.rng)); mu.ap = 9; // rules 1.64 item 5011: the fight set up by hand as joined
  return { g, mu, al };
}
const ID = 'pk:perk:pull_together#tend_guide';

describe('0.28.3: Guide on the fight screen', () => {
  it('click the ally, then a shaded tile: Confirm sends both, and the ally steps there', () => {
    const { g, mu, al } = fight();
    const fv0 = withGame(g, () => flowView(g, 'host', mu, { action: ID }))!;
    expect(fv0.click({ id: al.id, side: al.side }, al.pos)).toMatchObject({ target: al.id });
    const fv = withGame(g, () => flowView(g, 'host', mu, { action: ID, target: al.id }))!;
    expect(fv.ready).toBe(false);
    expect(fv.sel.text).toMatch(/Now click the tile/);
    // rules 1.65 (the picking contract): the legal tiles are the open pick's choices (the engine's), outlined
    expect(fv.marks.choice.size).toBeGreaterThan(0);
    const to = [...fv.marks.choice][0];
    expect(fv.click(null, to)).toEqual({ tile: to });
    const fv2 = withGame(g, () => flowView(g, 'host', mu, { action: ID, target: al.id, tile: to }))!;
    expect(fv2.ready).toBe(true);
    expect(fv2.action).toMatchObject({ type: 'combat/perk', targetId: al.id, tile: to });
    const g2 = apply(g, fv2.action, 'host');
    expect(g2.combat.units.find((u: any) => u.id === al.id).pos).toBe(to);
  });
});

// Rules 1.65 item 5108.4 (the review): a click on an empty tile while a unit pick is open is refused by the action box,
// never a silent no-op.
describe('rules 1.65: an empty tile while a unit pick is open', () => {
  it('Bond selected, a click on an empty tile sets the refusal (pickWhy) in the pick\'s own words', () => {
    const { g, mu } = fight();
    const bond = 'pk:verb:tend.bond#tend_bond';
    const fv = withGame(g, () => flowView(g, 'host', mu, { action: bond }))!;
    expect(fv, 'Bond is on the flow').toBeTruthy();
    const cb = g.combat, empty = [...fv.marks.reach].find((k) => !cb.units.some((u: any) => u.pos === k && !u.dead))!;
    expect(empty, 'an empty tile in reach').toBeTruthy();
    const patch = fv.click(null, empty)!;
    expect(patch, 'not a silent no-op').toBeTruthy();
    expect(patch.refused).toMatch(/^Nobody there\. /);
    expect(patch.target).toBeUndefined();
    // and the Whisper (Health) on its unit pick: the same
    const fvH = withGame(g, () => flowView(g, 'host', mu, { action: ID }))!;
    expect(fvH.click(null, empty)?.refused, 'Guide before its ally').toMatch(/^Nobody there\. /);
  });
});
