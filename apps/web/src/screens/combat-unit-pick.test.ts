// @vitest-environment jsdom
// 0.28.3, Leon on live 0.28.2: "bond cannot select enemies in this version for some reason". Confirmed in a browser: with
// Bond picked, a click on an enemy outside its reach (7 tiles) turned the action into a plain Shot with no word
// (screens/combat.js tileClick: the flow's click returned null for a unit not in the step's choices, and the screen's
// "a foe clicked is an attack" ran). Now, while a unit pick is open, a click on a unit is always that pick: a unit in the
// choices is picked, one that isn't is refused in the ENGINE's words for that unit and the action stays picked. Through
// the real tileClick, on a Survival fight at level 1: the Empath (Mender) with the Attuner of the Recommended loadout.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, apply, newGame, viewFor, reachable, withGame, beginTurn, type GameState } from '@engine';

let G: GameState; const ME = 'host';
let snap: any = null;
const toasts: string[] = [];
const view = () => ({ game: viewFor(G, ME), me: { id: ME, name: 'Leon' }, role: 'host', screen: 'combat', toast: null, savedAt: 0 });
const sent: any[] = [];
vi.mock('../game/store', () => ({ getState: () => snap || (snap = view()), subscribe: () => () => {},
  act: (a: any) => { sent.push(a); G = apply(G, a, ME); snap = view(); }, go: () => {}, toast: (t: string) => { toasts.push(t); }, polishText: async () => '', retryNarrator: () => {}, saveNow: () => {}, poke: () => {} }));
vi.mock('../game/report', () => ({ openReport: () => {}, PlaytestTools: () => null }));
const { CombatLogic } = await import('./combat.js');

const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };
/** Survival through the camp (Recommended) into the first fight; the Empath's turn; foes at 2 and 7 tiles in the open. */
function fight() {
  snap = null; sent.length = 0; toasts.length = 0;
  let g: any = newGame('PICK01', { id: ME, name: 'L' }, 'seed-p'); g.settings.play = 'survival';
  g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') }, ME);
  g = apply(g, { type: 'run/start', seed: 'PHC-0001' }, ME);
  g = apply(g, { type: 'run/ready', close: true }, ME);
  const node = reachable(g.run).find((n: any) => n.kind === 'fight') || reachable(g.run)[0];
  if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, ME);
  const cb = g.combat, mu = cb.units.find((u: any) => u.side === 'pc'), foes = cb.units.filter((u: any) => u.side === 'foe');
  expect(foes.length).toBeGreaterThan(1);
  cb.map = { ...cb.map, solid: [], cover: [], full: [], objects: [] }; cb.objects = []; // open ground: reach is the only limit
  mu.pos = '2,2'; foes[0].pos = '4,2'; foes[1].pos = '9,2'; for (const f of foes.slice(2)) f.pos = '9,' + (6 + foes.indexOf(f));
  for (const f of foes) { f.hidden = false; f.sv = { heart: -99 }; }
  cb.turn = cb.order.indexOf(mu.id); delete cb.window; withGame(g, () => beginTurn(cb, g.rng)); mu.ap = 6;
  G = g; snap = view();
  return { mu, near: foes[0], far: foes[1], c: g.characters[mu.charId] };
}
const screen = () => { const L = new CombatLogic({}) as any; L.setState = (p: any) => { Object.assign(L.state, p); }; return L; };
const rowNamed = (r: any, name: string) => r.groups.flatMap((g: any) => g.items).find((i: any) => i.name === name);

// (rules 1.65: the refusal is a line by the action box, S.pickWhy, no longer a toast)
describe('0.28.3: a click on a unit while a unit pick is open is always that pick', () => {
  it('Bond: an enemy out of reach is refused in the engine\'s words and Bond stays picked (no Shot)', () => {
    const { c, near, far } = fight();
    expect(c.offHand?.id).toBe('attuner');
    const L = screen(); L.renderVals();
    rowNamed(L.renderVals(), 'Bond').pick();
    const bond = L.state.action; expect(bond).toBeTruthy();
    L.renderVals(); L.tileClick(far.pos);
    expect(L.state.action).toBe(bond); // it used to become 'shot'
    expect(sent).toEqual([]);
    expect((L.state.pickWhy && '✕ ' + L.state.pickWhy.text)).toBe('✕ ' + far.name + ': Out of range (6 tiles).');
    expect(L.state.target).not.toBe(far.id);
    // an enemy in reach is picked, and Confirm Bonds it
    L.renderVals(); L.tileClick(near.pos);
    expect(L.state.action).toBe(bond); expect(L.state.target).toBe(near.id);
    const r = L.renderVals(); expect(r.cantConfirm).toBeFalsy();
    r.confirm();
    expect(sent.at(-1)).toMatchObject({ type: 'combat/perk', targetId: near.id });
    expect(G.combat!.ties?.some((t: any) => t.kind === 'bond' && t.to === near.id)).toBe(true);
  });
  it('Mend (an ally pick): an enemy clicked is refused in words, never an attack', () => {
    const { far } = fight();
    const L = screen(); L.renderVals(); rowNamed(L.renderVals(), 'Mend').pick();
    const mend = L.state.action; L.renderVals(); L.tileClick(far.pos);
    expect(L.state.action).toBe(mend); expect(sent).toEqual([]);
    expect((L.state.pickWhy && '✕ ' + L.state.pickWhy.text)).toMatch(new RegExp('^✕ ' + far.name + ': '));
  });
  it("Bond on a machine (0.29.0, seen on live 0.28.3: it said \"Click a target.\"): the data's own reason for that unit", () => {
    const { near } = fight(); near.kind = 'robot'; snap = null;
    const L = screen(); L.renderVals(); rowNamed(L.renderVals(), 'Bond').pick();
    const bond = L.state.action; L.renderVals(); L.tileClick(near.pos);
    expect(L.state.action).toBe(bond); expect(sent).toEqual([]);
    expect((L.state.pickWhy && '✕ ' + L.state.pickWhy.text)).toBe('✕ ' + near.name + ': A machine has no heart to Bond.');
  });
});
