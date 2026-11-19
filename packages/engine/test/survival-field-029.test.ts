// @ts-nocheck (test fixtures: plain objects)
// The 0.28.3 merge into 0.29: the field is the fight still running (Combat.field, rules 1.55 items 61 to 68), and 0.29's
// new pieces go through the same single gates there. Through the reducer, with real actions, on a won fight's field:
// Tug on a willing ally moves it (forcedRefusal: willing first); Slam beside a friend moves no friend (it reaches foes
// only, and forcedRefusal's field rule holds any friend); an order to a Figment runs; Hide is the fight's own Hide.
import { describe, it, expect } from 'vitest';
import { apply, newGame, ARCHETYPES, reachable, RuleError, paths, dist, FIG_DOOR } from '../src';
import tendingJ from '../../../data/tending.json';
import { upTurn } from './helpers/survival';

const clone = (g: any) => JSON.parse(JSON.stringify(g));
const refused = (g: any, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
/** A Survival test room of two through the camp (Recommended) into its first fight: the Empath (host) and the gunner (p2). */
function inFight(prep?: (g: any) => void) {
  let g: any = newGame('FIELD03', { id: 'host', name: 'L' }, 'seed-f'); g.settings.play = 'survival'; g.settings.test = true;
  g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') }, 'host');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'M' }, 'host'); g = apply(g, { type: 'char/add', sheet: sheet('Gun', 'sharpshooter') }, 'p2');
  g = apply(g, { type: 'run/start', seed: 'PHC-0003' }, 'host');
  g = apply(g, { type: 'run/ready', close: true }, 'host');
  g = clone(g); prep?.(g);
  const node = reachable(g.run).find((n: any) => n.kind === 'fight');
  for (const by of ['host', 'p2']) if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, by);
  expect(g.run.state).toBe('fight');
  return g;
}
const ids = (g: any) => { const cb = g.combat, m = Object.values(g.characters).find((c: any) => c.name === 'Medic'), n = Object.values(g.characters).find((c: any) => c.name === 'Gun'); return { med: m.id, gun: n.id, mu: cb.units.find((u: any) => u.charId === m.id && !u.companion).id, gu: cb.units.find((u: any) => u.charId === n.id && !u.companion).id }; };
const U = (g: any, id: string) => g.combat.units.find((u: any) => u.id === id);
/** Stand the gunner next to the Empath (the test's own placing). */
function besides(g: any) {
  const { mu, gu } = ids(g), m = U(g, mu), [x, y] = m.pos.split(',').map(Number), taken = new Set(g.combat.units.filter((u: any) => !u.dead).map((u: any) => u.pos));
  const P = paths(g.combat, m.pos, m.id), k = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).find((t) => !taken.has(t) && P.dist[t] === 1);
  U(g, gu).pos = k; return g;
}
/** The won fight's field by the test room's skip. */
const toField = (g: any) => { const f = apply(g, { type: 'run/skip' }, 'host'); expect(f.run.state).toBe('field'); return clone(f); };
/** Rules 1.62 item 4906: the field is turns: the unit acts on its own turn. */
const up = (g: any, which: 'mu' | 'gu') => clone(upTurn(g, ids(g)[which]));

const grant = (verb: string) => (tendingJ as any).items.find((x: any) => x.id === verb).effects.find((e: any) => e.op === 'grant_action');

describe("the 0.28.3 merge: 0.29's pieces on the field, by the same single gates", () => {
  it('Tug on a willing ally (Bonds 2.0) moves it toward the Bonder, at 12 MP', () => {
    let g = up(toField(inFight()), 'mu'); const { mu, gu } = ids(g);
    g = apply(g, { type: 'combat/perk', unitId: mu, id: 'verb:tend.bond', targetId: gu }, 'host');
    // the gunner some tiles off, in sight
    const m = U(g, mu), P = paths(g.combat, m.pos, m.id), taken = new Set(g.combat.units.filter((u: any) => !u.dead).map((u: any) => u.pos));
    U(g, gu).pos = Object.keys(P.dist).filter((k) => !taken.has(k) && P.dist[k] >= 4 && P.dist[k] <= 6).sort((a, b) => P.dist[a] - P.dist[b])[0];
    U(g, mu).mg.mp = 200; const before = dist(U(g, mu).pos, U(g, gu).pos), mp = U(g, mu).mg.mp;
    const t = apply(g, { type: 'combat/perk', unitId: mu, id: 'verb:tend.tug', targetId: gu }, 'host');
    expect(dist(U(t, mu).pos, U(t, gu).pos)).toBeLessThan(before);
    expect(mp - U(t, mu).mg.mp).toBe(grant('tend.tug').res.mp); expect(grant('tend.tug').res.mp).toBe(12);
    expect(t.combat.field).toBeTruthy();
  });
  it('Slam (Guard 2.0) beside a friend: the friend is not moved', () => {
    let g = toField(inFight((x) => { const c = Object.values(x.characters).find((c: any) => c.name === 'Gun'); c.skills.durability = 5; }));
    g = besides(up(g, 'gu')); const { mu, gu } = ids(g); U(g, gu).res = { ...(U(g, gu).res || {}), guard: 3 };
    const was = U(g, mu).pos;
    const after = apply(g, { type: 'combat/perk', unitId: gu, id: 'skill:durability.1', actionId: 'guard_slam' }, 'p2');
    expect(U(after, gu).res.guard).toBeLessThan(3); // it ran (paid its Guard)
    expect(U(after, mu).pos).toBe(was); expect(U(after, mu).hp).toBe(U(g, mu).hp);
  });
  it('an order to a Figment runs on the field (the owned-unit order site)', () => {
    let g = toField(inFight((x) => { const c = Object.values(x.characters).find((c: any) => c.name === 'Gun'); c.skills.visualization = 1; c.weapon = 'service_pistol'; c.offHand = { id: 'visualizer' }; c.doorPicks = { ...(c.doorPicks || {}), [FIG_DOOR]: ['double'] }; })); g = up(g, 'gu');
    const { gu } = ids(g), me = U(g, gu), P = paths(g.combat, me.pos, me.id), taken = new Set(g.combat.units.filter((u: any) => !u.dead).map((u: any) => u.pos));
    const free = Object.keys(P.dist).filter((k) => !taken.has(k) && P.dist[k] === 1);
    g = apply(g, { type: 'combat/perk', unitId: gu, id: 'verb:picture', choice: 'double', tile: free[0] }, 'p2');
    const fig = g.combat.units.find((u: any) => u.owner === gu && !u.dead) || g.combat.units.find((u: any) => u.companion && u.pos === free[0]);
    expect(fig).toBeTruthy();
    const to = free.find((k) => k !== free[0] && !g.combat.units.some((u: any) => !u.dead && u.pos === k));
    const o = apply(g, { type: 'combat/owned', unitId: gu, owned: fig.id, verb: 'move', tile: to }, 'p2');
    expect(U(o, fig.id).pos).toBe(to); expect(o.combat.field).toBeTruthy();
  });
  it("Hide on the field is the fight's own Hide: with no enemy's eyes on you, you are Hidden", () => {
    const g = up(toField(inFight()), 'gu'), { gu } = ids(g);
    // the test room's skip opens the field without killing the foes: the field a real last kill opens has none standing
    for (const u of g.combat.units) if (u.side === 'foe') { u.hp = 0; u.dead = true; }
    const h = apply(g, { type: 'combat/hide', unitId: gu }, 'p2');
    expect(U(h, gu).hidden).toBeTruthy(); expect(h.combat.field).toBeTruthy();
  });
});
