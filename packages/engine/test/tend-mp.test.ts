// @ts-nocheck (test fixtures: plain objects)
// 0.28.3, rules 1.55 item 46. Leon's playtest on 0.28.2: "by mp is tiny i meant bond healer have way too many fucking
// heal, they carry the weak as shit tank in my run". Healing's MP is three times 0.28.2's (data/tending.json, each
// verb's res.mp). The action button and card say the MP beside the AP, from the cost site (the descriptor's cost.res),
// and a bar too low is refused "Needs N MP (you have M)." before anything is paid.
// Through the reducer, in a Survival fight at level 1 with the Empath archetype on the camp's Recommended loadout.
import { describe, it, expect } from 'vitest';
import { apply, newGame, ARCHETYPES, beginTurn, withGame, reachable, actionsFor, sendDescriptor } from '../src';
import tendingJ from '../../../data/tending.json';

const grant = (id: string): any => (tendingJ as any).items.find((x: any) => x.id === id).effects.find((e: any) => e.op === 'grant_action');
const MEND = grant('tend.mend'), MEND_MP = MEND.res.mp.base; // the Empath has Empathy 4: below the step
const sheet = (name: string, arch: string) => { const a: any = ARCHETYPES.find((x) => x.id === arch); return { name, portrait: '', origin: 'Thousand-Planet frontier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
function survivalFight() {
  let g: any = newGame('TENDMP', { id: 'host', name: 'L' }, 'seed-t'); g.settings.play = 'survival';
  g = apply(g, { type: 'char/add', sheet: sheet('Medic', 'mender') }, 'host');
  g = apply(g, { type: 'player/join', id: 'p2', name: 'M' }, 'host'); g = apply(g, { type: 'char/add', sheet: sheet('Gun', 'sharpshooter') }, 'p2');
  g = apply(g, { type: 'run/start', seed: 'PHC-0001' }, 'host');
  g = apply(g, { type: 'run/ready', close: true }, 'host');
  const med: any = Object.values(g.characters).find((c: any) => c.name === 'Medic');
  const node = reachable(g.run).find((n: any) => n.kind === 'fight') || reachable(g.run)[0];
  for (const by of ['host', 'p2']) if (g.run.state === 'map') g = apply(g, { type: 'run/move', node: node.id }, by);
  const cb = g.combat, mu = cb.units.find((u: any) => u.charId === med.id), al = cb.units.find((u: any) => u.side === 'pc' && u.id !== mu.id);
  const [x, y] = mu.pos.split(',').map(Number); al.pos = x + ',' + (y + 1); al.hp = Math.max(1, Math.floor(al.maxHp / 2));
  g.characters[mu.charId].relics = []; if (mu.held) mu.held = { ...mu.held, relics: [] }; // the run's start boon may give MP back on a heal (Kindled): the price alone is measured here
  cb.turn = cb.order.indexOf(mu.id); delete cb.window; delete cb.approach; withGame(g, () => beginTurn(cb, g.rng)); mu.ap = 9; // rules 1.64 item 5011: the fight set up by hand as joined
  return { g, mu, al };
}
const U = (g: any, id: string) => g.combat.units.find((u: any) => u.id === id);
const ID = 'pk:verb:tend.mend#tend_mend';

describe('0.28.3 (rules 1.55 item 46): healing\'s MP, shown and charged', () => {
  it('the Mend button says its AP and its MP, the cost site\'s figure', () => {
    const s = survivalFight();
    const d: any = actionsFor(s.g, s.mu.id, 'host').find((x: any) => x.id === ID);
    expect(d.cost.res.mp).toBe(MEND_MP);
    expect(d.cost.text).toContain(MEND.ap + ' AP · ' + MEND_MP + ' MP');
  });
  it('a Mend through the reducer takes the data\'s MP', () => {
    const s = survivalFight();
    const mp0 = U(s.g, s.mu.id).mg.mp, hp0 = U(s.g, s.al.id).hp;
    const g2 = apply(s.g, sendDescriptor(s.g, s.mu.id, ID, { targetId: s.al.id }, 'host'), 'host');
    expect(mp0 - U(g2, s.mu.id).mg.mp).toBe(MEND_MP);
    expect(U(g2, s.al.id).hp).toBeGreaterThan(hp0);
  });
  it('too little MP: "Needs N MP (you have M)." on the button, and the reducer refuses before paying', () => {
    const s = survivalFight(), have = MEND_MP - 1; U(s.g, s.mu.id).mg.mp = have;
    const d: any = actionsFor(s.g, s.mu.id, 'host').find((x: any) => x.id === ID);
    expect(d.why).toBe('Needs ' + MEND_MP + ' MP (you have ' + have + ').');
    const ap0 = U(s.g, s.mu.id).ap;
    expect(() => apply(s.g, { type: 'combat/perk', unitId: s.mu.id, id: 'verb:tend.mend', actionId: 'tend_mend', targetId: s.al.id }, 'host')).toThrow(/Needs \d+ MP \(you have \d+\)/);
    expect(U(s.g, s.mu.id).mg.mp).toBe(have); expect(U(s.g, s.mu.id).ap).toBe(ap0);
  });
});
