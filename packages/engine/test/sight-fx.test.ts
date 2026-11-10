// Combat clarity (0.16): the presentation events the client needs to show movement in the fog of war, stealth and
// Overwatch clearly. A walk carries each side's sight per tile ('move' sight), a unit coming into a side's sight (or
// revealed, or going Hidden from it) gets one 'sight' event for that side's eyes only, and a sprung Overwatch is its own
// 'overwatch' event between the walk up to the tile and the shot. All through apply(); none of it touches a roll.
import { describe, expect, it } from 'vitest';
import { apply, newGame, viewFor, active, visibility, sightFx, hide, type Action, type GameState, type FxEvent } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

const since = (g: GameState, n: number) => (g.combat!.fx || []).filter((e) => e.n > n);
const top = (g: GameState) => g.combat!.fxSeq || 0;

describe('a walk carries its sight', () => {
  it('a foe walking out of the fog: its move says where the party sees it, per tile; no separate sight event for it', () => {
    const f = fightWith([{}], [{ at: 'M3', weapon: 'fists', tier: 'soldier' }]);
    const pc = f.pc, foe = f.foe; pc.pos = '2,2'; pc.vision = 4; foe.pos = '12,2'; foe.ap = 6;
    withGame(f.g, () => { delete f.cb.sightSeen; sightFx(f.cb); }); // the test moved units by hand: record the sight now
    expect(visibility(f.cb, 'pc').seen.has(foe.id)).toBe(false);
    f.turn(pc); const n0 = top(f.g);
    f.act({ type: 'combat/end-turn', unitId: pc.id }); // the foe's turn runs: it walks in on the party
    const evs = since(f.g, n0), mv = evs.filter((e) => e.k === 'move' && e.unit === foe.id);
    expect(mv.length).toBeGreaterThan(0);
    const all = mv.map((e) => e.sight.pc).join('');
    for (const e of mv) { expect(e.sight.pc).toHaveLength(e.path.length); expect(e.sight.foe).toMatch(/^1+$/); } // its own side always sees it
    expect(all).toMatch(/^0+1+$/); // from the fog into sight
    expect(visibility(f.cb, 'pc').seen.has(f.foe.id)).toBe(true);
    // Each tile's flag is the party's sight of it there.
    for (const e of mv) e.path.forEach((k: string, i: number) => { const d = Math.max(Math.abs(+k.split(',')[0] - 2), Math.abs(+k.split(',')[1] - 2)); expect(e.sight.pc[i]).toBe(d <= 4 ? '1' : '0'); });
    expect(evs.some((e) => e.k === 'sight' && e.unit === foe.id)).toBe(false); // the walk carries it
  });
  it('a hidden walker is unseen on every tile', () => {
    const f = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]);
    const pc = f.pc; pc.pos = '2,2'; pc.vision = 12; f.foe.pos = '6,2';
    f.turn(pc); f.unit(pc.id).hidden = true;
    const n0 = top(f.g); f.act({ type: 'combat/move', unitId: pc.id, to: '3,2' });
    const mv = since(f.g, n0).find((e) => e.k === 'move')!;
    expect(mv.sight.foe).toMatch(/^0+$/); expect(mv.sight.pc).toMatch(/^1+$/);
  });
});

describe('sight events', () => {
  it('a PC stepping up to where a foe stands sees it: one sight event, for the party\'s eyes only; the foe sees the PC too', () => {
    const f = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]);
    const pc = f.pc, foe = f.foe; pc.pos = '2,2'; pc.vision = 4; foe.pos = '9,2'; foe.vision = 4;
    withGame(f.g, () => { delete f.cb.sightSeen; sightFx(f.cb); });
    f.turn(pc); const n0 = top(f.g);
    f.act({ type: 'combat/move', unitId: pc.id, to: '5,2' });
    const evs = since(f.g, n0), sees = evs.filter((e) => e.k === 'sight');
    expect(sees).toEqual([expect.objectContaining({ k: 'sight', unit: foe.id, at: '9,2', how: 'enter', only: 'pc' })]); // the walker's own entry rides on its move
    expect(evs.find((e) => e.k === 'move')!.sight.foe).toMatch(/^0+1$/); // the foe sees the PC arrive at the last tile
    // A view keeps only its own side's: the host (party side) sees it; nothing for the foe side leaks.
    const v = viewFor(f.g, 'host');
    expect((v.combat!.fx || []).filter((e) => e.k === 'sight' && e.n > n0).map((e) => e.only)).toEqual(['pc']);
  });
  it('a foe going Hidden fades from a side that saw it; spotted again, it is revealed (not "entered")', () => {
    const f = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]);
    const pc = f.pc, foe = f.foe; pc.pos = '2,2'; foe.pos = '6,2';
    withGame(f.g, () => { delete f.cb.sightSeen; sightFx(f.cb); });
    let n0 = top(f.g);
    withGame(f.g, () => hide(f.cb, f.foe, 'test'));
    expect(since(f.g, n0).filter((e) => e.k === 'sight')).toEqual([expect.objectContaining({ unit: foe.id, how: 'hide', only: 'pc', at: '6,2' })]);
    // The PC ends its turn next to it: found outright (spotHidden), a reveal for the party.
    f.unit(pc.id).pos = '5,2'; f.turn(pc); n0 = top(f.g);
    f.act({ type: 'combat/end-turn', unitId: pc.id });
    const rv = since(f.g, n0).filter((e) => e.k === 'sight' && e.unit === foe.id);
    expect(rv[0]).toMatchObject({ how: 'reveal', only: 'pc' });
    expect(f.foe.hidden).toBeFalsy();
  });
  it('the opening of a fight records sight without events; the events change no roll', () => {
    const a = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]), b = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]);
    expect((a.cb.fx || []).some((e) => e.k === 'sight')).toBe(false);
    expect(a.cb.sightSeen).toBeTruthy();
    // Same game, same actions: the same state (deterministic), events and all.
    a.turn(a.pc); b.turn(b.pc);
    a.act({ type: 'combat/end-turn', unitId: a.pc.id }); b.act({ type: 'combat/end-turn', unitId: b.pc.id });
    expect(JSON.stringify(a.g.combat)).toBe(JSON.stringify(b.g.combat));
    expect(a.g.rng).toEqual(b.g.rng);
  });
});

describe('Overwatch is its own beat', () => {
  it('the walk up to the tile, then overwatch {watcher, mover, tile}, then the shot, then the rest of the walk', () => {
    const f = fightWith([{}], [{ at: 'K3', weapon: 'hellraiser_service_rifle' }]);
    const u = f.pc, foe = f.foe; u.pos = '2,2'; foe.pos = '10,2'; foe.overwatch = 'shot' as any; foe.ap = 6;
    f.turn(u); const n0 = top(f.g);
    f.act({ type: 'combat/move', unitId: u.id, to: '5,2' });
    const evs = since(f.g, n0).filter((e) => ['move', 'overwatch', 'shot', 'down'].includes(e.k));
    const i = evs.findIndex((e) => e.k === 'overwatch');
    expect(i).toBeGreaterThan(0);
    const ow = evs[i], before = evs[i - 1];
    expect(before.k).toBe('move'); expect(ow).toMatchObject({ unit: foe.id, target: u.id, from: '10,2', mode: 'shot' });
    expect(ow.at).toBe(before.to); // it stops where the shot is sprung
    expect(evs[i + 1]).toMatchObject({ k: 'shot', unit: foe.id, target: u.id, to: ow.at });
    const pcU = f.unit(u.id);
    if (!pcU.downed && !pcU.dead) { const rest = evs.slice(i + 1).find((e) => e.k === 'move')!; expect(rest.from).toBe(ow.at); expect(rest.to).toBe('5,2'); }
    expect(f.unit(foe.id).overwatch).toBeFalsy();
  });
});

describe('team fight', () => {
  it('Team B sees the walk\'s sight from its own side, and only its own side\'s sight events', () => {
    let g = apply(newGame('PROVE3', { id: 'h1', name: 'Host' }, 'seed-sight'), { type: 'sandbox/start', standalone: true }, 'h1');
    g = apply(g, { type: 'player/join', id: 'p2', name: 'p2' }, 'h1');
    g = apply(g, { type: 'sandbox/settings', mode: 'teams' }, 'h1');
    g = apply(g, { type: 'sandbox/fight' }, 'h1');
    const cur = active(g.combat!)!, owner = g.characters[cur.charId!].owner;
    const [x, y] = cur.pos.split(',').map(Number), to = (x < 8 ? x + 1 : x - 1) + ',' + y;
    const n0 = top(g);
    g = apply(g, { type: 'combat/move', unitId: cur.id, to } as Action, owner);
    const mv = since(g, n0).find((e) => e.k === 'move')!;
    const other = owner === 'h1' ? 'p2' : 'h1';
    const vo = viewFor(g, other).combat!.fx!.find((e: FxEvent) => e.n === mv.n)!, vm = viewFor(g, owner).combat!.fx!.find((e: FxEvent) => e.n === mv.n)!;
    // Each player's view puts its own side on 'pc': the mover's own player sees all '1' there.
    expect(vm.sight.pc).toMatch(/^1+$/);
    expect(vo.sight.foe).toMatch(/^1+$/);
    expect(vo.sight.pc).toBe(cur.side === 'pc' ? mv.sight.foe : mv.sight.pc);
    for (const pid of ['h1', 'p2']) for (const e of viewFor(g, pid).combat!.fx!) if (e.k === 'sight') expect(e.only).toBe('pc');
  });
});

describe('the Proving Ground', () => {
  it('a hostile placed Hidden while gearing up starts the fight Hidden; standing next to it at the end of a turn reveals it, for the party', () => {
    let g = apply(newGame('PROVE4', { id: 'h1', name: 'Host' }, 'seed-hidden'), { type: 'sandbox/start', standalone: true }, 'h1');
    const me = Object.values(g.characters)[0], at = g.story.positions![me.id], [x, y] = at.split(',').map(Number);
    const next = 'ABCDEFGHIJKLMNOP'[x + 1] + (y + 1);
    g = apply(g, { type: 'sandbox/npc', name: 'Lurker', side: 'hostile', tier: 'minion', weapon: 'fists', at: next, hidden: true } as Action, 'h1');
    g = apply(g, { type: 'sandbox/fight' }, 'h1');
    const lurker = g.combat!.units.find((u) => u.name === 'Lurker')!;
    const rv = (g.combat!.fx || []).find((e) => e.k === 'sight' && e.unit === lurker.id), revealed = !!rv;
    if (rv) expect(rv).toMatchObject({ how: 'reveal', only: 'pc' }); // its own opening turn gave it away (an attack from hiding)
    // Either it is still Hidden (the party's turn has not ended yet) or its own turn already gave it away.
    if (!revealed) {
      expect(lurker.hidden).toBe(true);
      expect(visibility(g.combat!, 'pc').seen.has(lurker.id)).toBe(false);
      while (active(g.combat!)!.side !== 'pc') g = apply(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id } as Action, 'h1');
      const u = active(g.combat!)!; const n0 = top(g);
      g = apply(g, { type: 'combat/end-turn', unitId: u.id } as Action, 'h1');
      expect(since(g, n0).filter((e) => e.k === 'sight' && e.unit === lurker.id)[0]).toMatchObject({ how: 'reveal', only: 'pc' });
    }
  });
});
