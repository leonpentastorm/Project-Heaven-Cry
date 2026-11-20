// Rules 1.90 items 7800 to 7816 (Leon, 20 Nov 2026: "every combat node have a frontal attack or try ambushing option,
// if you go frontal you get normal initiative roll, if you try ambush the squad roll some how, if you win you get a free
// turn, if you lost the enemy get a free turn. The approach phase is out entirely."). Through the reducer: run/start,
// run/move onto a fight node (it asks: run.state engage), run/engage walk or ambush; the roll on the game's dice.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, reachable, engageView, ambushOdds, AMBUSH, migrateLoaded, FREE_TURN, maxHp, itemAmount, RULES } from '../src';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';

const GUN = { build: 'plain_gun', level: 1 } as any;
type Setup = (g: any) => void;
/** A run at the first fight node's choice: seed n, the squad `pcs`, `setup` run on the room before the run starts. */
function atNode(n: number, pcs: any[], setup?: Setup): GameState | null {
  const seed = 'AMB-' + n, room: any = survivalRoom(seed, pcs, { test: true }); if (setup) setup(room);
  let g = startRun(room, seed);
  const node = reachable(g.run!).find((x) => x.kind === 'fight'); if (!node) return null;
  const marks = reachable(g.run!).length === 1 ? 1 : pcs.length;
  for (let i = 0; i < marks; i++) g = apply(g, { type: 'run/move', node: node.id } as any, ownerOf(i));
  return g;
}
/** The first seed whose ambush roll comes out `won`, made through run/engage. */
function ambushed(pcs: any[], won: boolean, setup?: Setup): GameState {
  for (let n = 1; n <= 80; n++) {
    const g0 = atNode(n, pcs, setup); if (!g0) continue;
    const g = apply(g0, { type: 'run/engage', how: 'ambush' } as any, 'host');
    if (g.combat?.opening?.won === won) return g;
  }
  throw new Error('no seed gave ' + won);
}
const pcs = (g: GameState) => g.combat!.units.filter((u) => u.side === 'pc' && !u.companion);
const foes = (g: GameState) => g.combat!.units.filter((u) => u.side === 'foe');

describe('rules 1.90: Walk in or Try an ambush', () => {
  it('a fight node asks first: no fight until the host answers; a guest may not answer', () => {
    const g = atNode(1, [GUN, GUN])!;
    expect(g.run!.state).toBe('engage'); expect(g.combat == null || g.phase !== 'combat').toBe(true);
    const v = engageView(g as any, 'host')!;
    expect(v.walk.label).toBe(AMBUSH.words.walk); expect(v.ambush.label).toBe(AMBUSH.words.try);
    expect(v.ambush.tn).toBe(12); expect(v.chooses).toBe(true); expect(engageView(g as any, 'p2')!.chooses).toBe(false);
    expect(v.ambush.pct).toBe(Math.round(v.ambush.chance * 100));
    expect(() => apply(g, { type: 'run/engage', how: 'walk' } as any, 'p2')).toThrow(AMBUSH.words.waiting);
  });
  it('walk in: the fight starts joined, nobody sits out, no opening roll', () => {
    const g = apply(atNode(1, [GUN, GUN])!, { type: 'run/engage', how: 'walk' } as any, 'host');
    expect(g.run!.state).toBe('fight'); expect(g.phase).toBe('combat');
    const cb = g.combat!; expect((cb as any).approach).toBeUndefined(); expect(cb.opening).toBeUndefined(); expect(cb.round).toBe(1);
    expect(cb.units.some((u) => u.caught)).toBe(false);
    expect(cb.log.some((l) => l === AMBUSH.words.log_walk)).toBe(true);
  });
  it('won: the hostiles sit round 1 out, the roll is in the log with its TN and sum', () => {
    const g = ambushed([GUN, GUN], true), cb = g.combat!, o = cb.opening!;
    expect(o.free).toBe('pc'); expect(o.total).toBe(o.die + o.mod);
    for (const f of foes(g)) expect(f.waitRound).toBe(2);
    expect(foes(g).every((f) => f.caught || f.tags?.includes('unaware'))).toBe(true);
    expect(pcs(g).some((u) => u.caught)).toBe(false);
    expect(cb.log.some((l) => l.includes('vs ' + o.tn) && l.includes(AMBUSH.words.won))).toBe(true);
    // round 1 is the squad's alone: every unit up in round 1 is a character
    expect(cb.units.find((u) => u.id === cb.order[cb.turn])!.side).toBe('pc');
  });
  it('lost with two characters: the squad sits round 1 out (the hostiles\' free turn)', () => {
    const g = ambushed([GUN, GUN], false), cb = g.combat!;
    expect(cb.opening!.free).toBe('foe'); expect(cb.opening!.fumble).toBeUndefined();
    for (const u of pcs(g)) { expect(u.caught).toBe(true); expect(u.waitRound).toBe(2); }
    expect(cb.log.some((l) => l.startsWith(FREE_TURN.lines.side.split('{')[0]))).toBe(true);
    expect(cb.round).toBeGreaterThanOrEqual(2); // the foes played round 1; the squad's first turn is round 2's
  });
  it('lost solo: no free turn, the fumble costs the data\'s share of max HP (never Downs, nothing reduces it)', () => {
    const g = ambushed([GUN], false), cb = g.combat!, u = pcs(g)[0], c = g.characters[u.charId!];
    expect(cb.opening!.free).toBeNull(); expect(u.caught).toBeFalsy(); expect(foes(g).some((f) => f.caught)).toBe(false);
    const want = Math.floor(itemAmount('rule:ambush_fumble', 'damage', [], { max_hp: maxHp(c) }));
    expect(want).toBe(Math.floor(maxHp(c) * (RULES as any).output.amounts.ambush_fumble.damage.per[0].value));
    expect(cb.opening!.fumble).toEqual({ unit: u.id, dmg: want });
    expect(cb.log.some((l) => l.includes(u.name + ' fumbles the ambush'))).toBe(true);
    expect(u.hp).toBeGreaterThanOrEqual(1);
  });
  it('the squad\'s modifier is the average of each one\'s best skill, rounded down; the TN by the node', () => {
    const g = atNode(1, [GUN, GUN])!, chars = Object.values(g.characters), n = g.run!.nodes.find((x) => x.id === g.run!.at)!;
    const o = ambushOdds(chars, n), avg = Math.floor(o.members.reduce((t, m) => t + m.mod, 0) / o.members.length);
    expect(o.parts[0]).toEqual({ add: avg, label: AMBUSH.words.squad }); expect(o.members.every((m) => AMBUSH.skills.includes(m.skill))).toBe(true);
    expect(o.tn).toBe(12);
  });
});

describe('rules 1.90 item 7809: Tremor and Shoot First on the ambush', () => {
  const perk = (id: string, tier = 'I'): Setup => (g) => { g.characters.c1.perks = [...(g.characters.c1.perks || []), { id, tier }]; };
  it('Tremor adds its bonus as its own term and is not caught by the hostiles\' free turn', () => {
    const g0 = atNode(1, [GUN, GUN], perk('tremor'))!, v = engageView(g0 as any, 'host')!;
    expect(v.ambush.parts.find((p) => p.label === 'Tremor')?.add).toBe(1);
    const g = ambushed([GUN, GUN], false, perk('tremor')), c1 = g.combat!.units.find((u) => u.charId === 'c1')!, c2 = g.combat!.units.find((u) => u.charId === 'c2')!;
    expect(c1.caught).toBeFalsy(); expect(c2.caught).toBe(true);
  });
  it('Tremor alone takes no fumble damage', () => {
    const g = ambushed([GUN], false, perk('tremor')), u = pcs(g)[0];
    expect(g.combat!.opening!.fumble).toBeUndefined(); expect(u.hp).toBe(u.maxHp);
  });
  it('Shoot First keeps its first turn with its tier\'s AP in the hostiles\' free turn', () => {
    const g = ambushed([GUN, GUN], false, perk('shoot_first', 'II')), cb = g.combat!, c1 = cb.units.find((u) => u.charId === 'c1')!;
    expect(c1.caught).toBeFalsy();
    expect(cb.log.some((l) => l.includes(c1.name + ' shoots first: 4 AP'))).toBe(true);
  });
});

describe('rules 1.90 item 7812: scouting before the choice', () => {
  it('the Ingenuity door at 5 scouts in person: the line-up shown, +2 as its own term, never two scouts', () => {
    const ing: Setup = (g) => { for (const id of ['c1', 'c2']) g.characters[id].skills = { ...g.characters[id].skills, ingenuity: 5 }; };
    const g = atNode(1, [GUN, GUN], ing)!, v = engageView(g as any, 'host')!;
    expect(v.scout!.line).toBe(g.characters.c1.name + ' goes ahead');
    expect(v.ambush.parts.filter((p) => p.label === AMBUSH.words.scout_term)).toEqual([{ add: 2, label: AMBUSH.words.scout_term }]);
    const gw = apply(g, { type: 'run/engage', how: 'walk' } as any, 'host');
    expect(v.scout!.foes.map((f) => f.name)).toEqual(foes(gw).map((f) => f.name)); // what was shown is what waits
    // without a scout the line-up is not shown
    expect(engageView(atNode(1, [GUN, GUN])! as any, 'host')!.scout).toBeNull();
  });
  it('a Figment form with scouts (the Eye) goes ahead when it could be pictured; never two scouts; no Visualizer, no scout', () => {
    const RIG = { build: 'rigger', level: 1 } as any, g = atNode(1, [RIG])!, c = g.characters.c1, v = engageView(g as any, 'host')!;
    expect(v.scout!.line).toBe(c.name + "'s Eye goes ahead");
    expect(v.ambush.parts.filter((p) => p.label === AMBUSH.words.scout_term).map((p) => p.add)).toEqual([2]);
    // with the Ingenuity door at 5 too: still one scout term, the best bonus
    const both = atNode(1, [RIG], (r) => { r.characters.c1.skills = { ...r.characters.c1.skills, ingenuity: 5 }; })!;
    expect(engageView(both as any, 'host')!.ambush.parts.filter((p) => p.label === AMBUSH.words.scout_term)).toHaveLength(1);
    // the Visualizer's charge spent below the Eye's: nothing goes ahead (the Picture rule's needs, nothing spent)
    const dry: any = atNode(1, [RIG])!; dry.characters.c1.visCharge = 0; expect(engageView(dry, 'host')!.scout).toBeNull();
  });
  it('a held Ingenuity 5 from an old save scouts on load (the real load path)', () => {
    const g0: any = atNode(1, [GUN])!; g0.characters.c1.skills = { ...g0.characters.c1.skills, ingenuity: 6 };
    const g = migrateLoaded(JSON.parse(JSON.stringify(g0)));
    expect(engageView(g, 'host')!.scout?.line).toBe(g.characters.c1.name + ' goes ahead');
  });
});

describe('rules 1.90 item 7816: a save made in the retired approach loads as a joined fight', () => {
  it('Combat.approach is dropped at the load door, round 1, the turn under way goes on', () => {
    const g0: any = apply(atNode(1, [GUN])!, { type: 'run/engage', how: 'walk' } as any, 'host');
    const save = JSON.parse(JSON.stringify(g0)); save.combat.approach = { passes: 1 }; save.combat.units[0].surpriseAp = 3;
    const g = migrateLoaded(save);
    expect(g.combat.approach).toBeUndefined(); expect(g.combat.round).toBe(1); expect(g.combat.units[0].surpriseAp).toBeUndefined();
    const u = g.combat.units.find((x: any) => x.id === g.combat.order[g.combat.turn]);
    const after = apply(g, { type: 'combat/end-turn', unitId: u.id } as any, 'host');
    expect(after.combat!.round).toBeGreaterThanOrEqual(1);
  });
});
