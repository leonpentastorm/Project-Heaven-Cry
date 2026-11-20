// @ts-nocheck (test fixtures: plain objects)
// 0.28.3, Leon's playtest on 0.28.2 ("Guide does not work"). Rules 1.33's Guide moves an ally to a tile its Bonder
// picks: the verb's displace (to: "tile") reads the event's tile. The action's descriptor offered only the ally pick and
// its send dropped any tile (descriptors.ts PERKS: a tile only for a tile-aimed action), so Confirm sent no tile: the
// engine took 1 AP and the MP, the ally stayed put, and the log said nothing. Now the ally pick is followed by a tile
// pick, the engine refuses in words until the tile is a legal one, and the step happens and is said.
// Through the reducer, in a Survival fight at level 1 with the Empath archetype on the camp's Recommended loadout.
import { describe, it, expect } from 'vitest';
import { PERK, apply, newGame, ARCHETYPES, beginTurn, withGame, reachable, actionsFor, previewDescriptor, sendDescriptor } from '../src';
import { walkIn } from './helpers/survival';
import tendingJ from '../../../data/tending.json';

const GUIDE: any = (PERK as any).pull_together.tiers.II.effects[1]; // rules 1.75 item 6213: Guide is Pull Together II's
const STEP = GUIDE.effects.find((e: any) => e.op === 'displace').tiles.base, MP = GUIDE.res.mp;
const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
function survivalFight() {
  let g: any = newGame('GUIDE1', { id: 'host', name: 'L' }, 'seed-g'); g.settings.play = 'survival';
  g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') }, 'host');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'M' }, 'host'); g = apply(g, { type: 'char/add', sheet: sheet('Gun', 'sharpshooter') }, 'p2');
  g = apply(g, { type: 'run/start', seed: 'PHC-0001' }, 'host');
  g = apply(g, { type: 'run/ready', close: true }, 'host');
  const med: any = Object.values(g.characters).find((c: any) => c.name === 'Medic');
  med.skills.camaraderie = Math.max(med.skills.camaraderie || 0, 5); med.perks = [...(med.perks || []), { id: 'pull_together', tier: 'II' }]; // rules 1.75: Guide is a Camaraderie perk's
  const node = reachable(g.run).find((n: any) => n.kind === 'fight') || reachable(g.run)[0];
  for (const by of ['host', 'p2']) if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, by); g = walkIn(g);
  const cb = g.combat, mu = cb.units.find((u: any) => u.charId === med.id), al = cb.units.find((u: any) => u.side === 'pc' && u.id !== mu.id);
  // a clear row to walk on: every unit but these two sent far off, and nothing standing on the row
  const [x, y] = mu.pos.split(',').map(Number);
  al.pos = x + ',' + (y + 1);
  cb.turn = cb.order.indexOf(mu.id); delete cb.window; withGame(g, () => beginTurn(cb, g.rng)); mu.ap = 9; // rules 1.64 item 5011: the fight set up by hand as joined
  return { g, mu, al, x, y };
}
const U = (g: any, id: string) => g.combat.units.find((u: any) => u.id === id);
const free = (g: any, from: string, n: number, mu: any) => { // a free tile exactly n steps from `from` (the engine's own preview says which are legal)
  const pv = previewDescriptor(g, mu.id, 'pk:perk:pull_together#tend_guide', { targetId: U(g, from).id }, 'host');
  return pv.marks.tiles.map((t: any) => t.tile).find((k: string) => { const [a, b] = k.split(',').map(Number), [c, d] = U(g, from).pos.split(',').map(Number); return Math.max(Math.abs(a - c), Math.abs(b - d)) === n; });
};

describe('0.28.3: Guide moves the ally to the tile you pick', () => {
  it('the descriptor asks for the ally, then the tile; without the tile the engine refuses in words and takes nothing', () => {
    const s = survivalFight();
    const d: any = actionsFor(s.g, s.mu.id, 'host').find((x: any) => x.id === 'pk:perk:pull_together#tend_guide');
    expect(d.picks.map((p: any) => p.key)).toEqual(['targetId', 'tile']);
    const pv = previewDescriptor(s.g, s.mu.id, d.id, { targetId: s.al.id }, 'host');
    expect(pv.ok).toBe(false);
    expect(pv.why).toMatch(/tile Gun steps to/);
    expect(pv.marks.tiles.length).toBeGreaterThan(0); // the tiles it may step to are shown
    const mp0 = U(s.g, s.mu.id).mg.mp, ap0 = U(s.g, s.mu.id).ap;
    expect(() => apply(s.g, { type: 'combat/perk', unitId: s.mu.id, id: 'pull_together', actionId: 'tend_guide', targetId: s.al.id }, 'host')).toThrow(/tile Gun steps to/);
    expect(U(s.g, s.mu.id).mg.mp).toBe(mp0); expect(U(s.g, s.mu.id).ap).toBe(ap0);
  });
  it('with a tile in reach: the ally steps there, the MP and 1 AP are paid, and the log says so', () => {
    const s = survivalFight();
    const to = free(s.g, s.al.id, STEP, s.mu); expect(to).toBeTruthy();
    const a = sendDescriptor(s.g, s.mu.id, 'pk:perk:pull_together#tend_guide', { targetId: s.al.id, tile: to }, 'host');
    expect(a.tile).toBe(to);
    const mp0 = U(s.g, s.mu.id).mg.mp, ap0 = U(s.g, s.mu.id).ap, n = s.g.combat.log.length;
    const g2 = apply(s.g, a, 'host');
    expect(U(g2, s.al.id).pos).toBe(to);
    expect(mp0 - U(g2, s.mu.id).mg.mp).toBe(MP);
    expect(ap0 - U(g2, s.mu.id).ap).toBe(GUIDE.ap);
    expect(g2.combat.log.slice(n).join(' ')).toMatch(/Medic guides Gun/);
  });
  it('a tile too far from the ally is refused with why, before anything is paid', () => {
    const s = survivalFight();
    const [c, d] = s.al.pos.split(',').map(Number), far = (c + STEP + 3) + ',' + d;
    const pv = previewDescriptor(s.g, s.mu.id, 'pk:perk:pull_together#tend_guide', { targetId: s.al.id, tile: far }, 'host');
    expect(pv.ok).toBe(false);
    expect(pv.why).toMatch(/Too far for Gun/);
  });
});
