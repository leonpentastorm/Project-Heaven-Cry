// @ts-nocheck (test fixtures: plain objects)
// 0.32 final pass B8 (a door that does not open for a new character blocks a player): through the reducer, two brand-new
// characters in one Survival room, locked in (char/add) with sheets as creation fills them, the camp on the Recommended
// loadout, the first fight of the run:
//   the Rigger (Visualization 1, its only door): a level-up is due before the run (two Figment forms to choose); two
//   door/picks at figment_forms; in the first fight Picture one of them: a Figment stands;
//   the Mender (the Empath archetype, Empathy 4, the Attuner): Bond on its ally (the Rigger): the Bond holds.
// And the bug the browser found: Picture and Bond, previewed on a player's view of the fight (viewFor), were greyed as
// "Not now." for every new character. The preview on the view is the reducer's verdict: ok.
import { describe, it, expect } from 'vitest';
import { walkIn } from './helpers/survival';
import { apply, newGame, ARCHETYPES, levelUpDue, allPendingDoorPicks, previewAction, viewFor, FIG_DOOR } from '../src';

const RIGGER = { name: 'Wren', portrait: '', origin: 'Thousand-Planet frontier', traits: [], identity: {},
  skills: { visualization: 1, charisma: 2, proficiency: 2, vigilant: 2, analysis: 2, eloquence: 1 },
  attrs: { endurance: 3, strength: 1, agility: 3, perception: 3, intelligence: 3, expression: 3, insight: 1, determination: 1, virtue: 1 }, cores: { body: 3, mind: 3, soul: 1 } };
const EMP: any = ARCHETYPES.find((a: any) => a.id === 'mender');
const MENDER = { name: 'Ama', portrait: '', origin: 'Thousand-Planet frontier', traits: [], identity: {}, skills: { ...EMP.preset }, attrs: { ...EMP.attributes }, cores: { ...EMP.cores } };

function room() {
  let g: any = newGame('B8', { id: 'host', name: 'Host' }, 'seed-b8'); g.settings.play = 'survival';
  g = apply(g, { type: 'player/join', id: 'p2', name: 'Mai' }, 'host');
  g = apply(g, { type: 'char/add', sheet: RIGGER }, 'host'); g = apply(g, { type: 'char/add', sheet: MENDER }, 'p2');
  const rid = Object.values(g.characters).find((c: any) => c.owner === 'host').id, mid = Object.values(g.characters).find((c: any) => c.owner === 'p2').id;
  return { g, rid, mid };
}
function firstFight(g: any) {
  g = apply(g, { type: 'run/start', seed: 'PHC-0046' }, 'host');
  if (g.run.state === 'loadout') g = apply(g, { type: 'run/ready', close: true }, 'host');
  const node = g.run.nodes.find((n: any) => n.depth === 1 && n.kind === 'fight');
  g = apply(g, { type: 'run/move', node: node.id }, 'host'); if (g.phase !== 'combat') g = apply(g, { type: 'run/move', node: node.id }, 'p2');
  return walkIn(g); // rules 1.90: the host walks in
}
/** End turns (each by its owner) until this unit is up. */
function upFor(g: any, unitId: string) {
  for (let k = 0; k < 20 && g.combat.order[g.combat.turn] !== unitId; k++) {
    const cur = g.combat.units.find((u: any) => u.id === g.combat.order[g.combat.turn]);
    g = apply(g, { type: 'combat/end-turn', unitId: cur.id }, cur.charId ? g.characters[cur.charId].owner : 'host');
  }
  expect(g.combat.order[g.combat.turn]).toBe(unitId);
  return g;
}
/** Act; if it was not made, play on to its turn and act again. */
function actJoining(g: any, a: any, by: string, done: (g: any) => boolean) {
  g = apply(g, a, by); if (done(g)) return g;
  g = upFor(g, a.unitId); return apply(g, a, by);
}
const freeNear = (cb: any, k: string) => { const [x0, y0] = k.split(',').map(Number), taken = new Set(cb.units.filter((u: any) => !u.dead).map((u: any) => u.pos)), bad = new Set([...(cb.map.solid || []), ...(cb.map.cover || []), ...(cb.map.full || []), ...(cb.objects || []).map((o: any) => o.pos)]);
  for (const [dx, dy] of [[-1, -1], [1, 0], [-1, 0], [0, -1], [1, -1], [1, 1]]) { const t = (x0 + dx) + ',' + (y0 + dy); if (x0 + dx >= 0 && y0 + dy >= 0 && !taken.has(t) && !bad.has(t)) return t; } return null; };

describe('0.32 B8: a new Rigger and a new Mender open their doors in their first Survival fight', () => {
  it('the Rigger: a level-up due for its two forms; chosen; Picture in the first fight (previewed on its view, then done)', () => {
    let { g, rid } = room();
    expect(levelUpDue(g.characters[rid])).toBe(true);
    const open = allPendingDoorPicks(g.characters[rid]).find((p: any) => p.door === FIG_DOOR)!;
    expect(open.left).toBe(2);
    for (const o of open.options.slice(0, 2)) g = apply(g, { type: 'door/pick', charId: rid, door: FIG_DOOR, option: o.id }, 'host');
    expect(g.characters[rid].doorPicks[FIG_DOOR]).toHaveLength(2);
    g = firstFight(g);
    expect(g.characters[rid].offHand?.id).toBe('visualizer');
    const ru = g.combat.units.find((u: any) => u.charId === rid); g = upFor(g, ru.id);
    const a = { type: 'combat/perk', unitId: ru.id, id: 'verb:picture', choice: g.characters[rid].doorPicks[FIG_DOOR][0], tile: freeNear(g.combat, ru.pos) };
    const pv = previewAction(viewFor(g, 'host'), a as any, 'host');
    expect(pv.why).toBe(null); expect(pv.ok).toBe(true);
    const fig = (x: any) => x.combat.units.some((u: any) => u.owned?.kind === 'figment' && u.ctrl === rid && !u.dead);
    g = actJoining(g, a, 'host', fig);
    expect(fig(g)).toBe(true);
  });
  it('the Mender: Bond on its ally in the first fight (previewed on its player\'s view, then done)', () => {
    let { g, rid, mid } = room();
    g = firstFight(g);
    expect(g.characters[mid].offHand?.id).toBe('attuner');
    const mu = g.combat.units.find((u: any) => u.charId === mid), ally = g.combat.units.find((u: any) => u.charId === rid);
    g = upFor(g, mu.id);
    const a = { type: 'combat/perk', unitId: mu.id, id: 'verb:tend.bond', targetId: ally.id };
    const pv = previewAction(viewFor(g, 'p2'), a as any, 'p2');
    expect(pv.why).toBe(null); expect(pv.ok).toBe(true);
    const bonded = (x: any) => (x.combat.ties || []).some((t: any) => t.kind === 'bond' && t.from === mu.id && t.to === ally.id);
    g = actJoining(g, a, 'p2', bonded);
    expect(bonded(g)).toBe(true);
  });
});
