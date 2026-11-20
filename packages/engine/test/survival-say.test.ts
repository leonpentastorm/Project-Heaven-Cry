// Leon's co-op playtest of Survival (0.28.2): a player's words in a run fight never lock the turn. A run has no Narrator
// (rules 1.54 item 1), so Say is said, an Attempt (the words that want a ruling) is refused at once, and a ruling left
// pending from before this fix is given back at the next action. Everything through the reducer, two players.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, reachable, attemptWhy, viewFor } from '../src';
import { survivalRoom, startRun, ownerOf, walkIn } from './helpers/survival';
import type { Pc } from './helpers/replay';

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'plain_gun', level: 1 }];
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const refused = (g: GameState, a: any, by: string) => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
function inFight(): GameState {
  let g = clone(startRun(survivalRoom('PHC-SAY', DUO, { test: true }), 'PHC-SAY'));
  const n = reachable(g.run!).find((x) => x.kind === 'fight')!;
  for (let i = 0; i < 2 && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  g = walkIn(g); expect(g.run!.state).toBe('fight');
  return g;
}
const turnUnit = (g: GameState) => { const cb = g.combat!; return cb.units.find((x) => x.id === cb.order[cb.turn])!; };

describe('a Survival run fight: words never lock the turn', () => {
  it('Say is said for everyone, costs nothing, and the turn then ends', () => {
    let g = inFight(); const u = turnUnit(g); expect(u.charId).toBeTruthy();
    const owner = g.characters[u.charId!].owner, ap = u.ap;
    g = apply(g, { type: 'combat/say', charId: u.charId!, text: 'Cover me, I am going left.' }, owner);
    for (const p of ['host', 'p2']) expect(viewFor(g, p).combat!.log.join('\n')).toContain('Cover me, I am going left.');
    expect(g.combat!.units.find((x) => x.id === u.id)!.ap).toBe(ap);
    expect((g.combat as any).ruling).toBeUndefined();
    g = apply(g, { type: 'combat/end-turn', unitId: u.id }, owner);
    expect(turnUnit(g).id).not.toBe(u.id);
  });
  it('an Attempt is refused at once in words, nothing is spent or left waiting, and the turn ends', () => {
    let g = inFight(); const u = turnUnit(g), owner = g.characters[u.charId!].owner, ap = u.ap;
    expect(attemptWhy(g, g.combat, u)).toBe('No Narrator in this mode: say it, but nobody rules on an attempt.');
    expect(refused(g, { type: 'combat/attempt', unitId: u.id, text: 'Drop your guns!' }, owner)).toBe('No Narrator in this mode: say it, but nobody rules on an attempt.');
    expect((g.combat as any).ruling).toBeUndefined(); expect(g.combat!.units.find((x) => x.id === u.id)!.ap).toBe(ap);
    g = apply(g, { type: 'combat/end-turn', unitId: u.id }, owner);
    expect(turnUnit(g).id).not.toBe(u.id);
  });
  it('a ruling left pending in a run (a save from before the fix) is given back at the next action: End turn works', () => {
    let g = inFight(); const u = turnUnit(g), owner = g.characters[u.charId!].owner;
    { const x = clone(g); const v = x.combat!.units.find((y) => y.id === u.id)!; v.ap -= 1;
      (x.combat as any).ruling = { id: 'f99', unit: u.id, charId: u.charId, text: 'Drop your guns!', round: x.combat!.round, ap: 1 };
      (x.combat as any).attempted = { [u.id]: x.combat!.round }; g = x; }
    g = apply(g, { type: 'combat/end-turn', unitId: u.id }, owner);
    expect((g.combat as any).ruling).toBeUndefined();
    expect(g.combat!.log.join('\n')).toContain('No Narrator in this mode');
    expect(g.combat!.log.join('\n')).toContain('gets 1 AP back');
    expect(turnUnit(g).id).not.toBe(u.id);
  });
});
