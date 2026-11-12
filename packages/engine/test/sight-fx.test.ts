// Combat clarity (0.16): the presentation events the client needs to show movement in the fog of war, stealth and
// Overwatch clearly. A walk carries each side's sight per tile ('move' sight), a unit coming into a side's sight (or
// revealed, or going Hidden from it) gets one 'sight' event for that side's eyes only, and a sprung Overwatch is its own
// 'overwatch' event between the walk up to the tile and the shot. All through apply(); none of it touches a roll.
import { describe, expect, it } from 'vitest';
import { apply, newGame, viewFor, active, visibility, sightFx, hide, moveUnit, npcsOf, positionsOf, standable, zoneMap, refOf, type Action, type GameState, type FxEvent } from '../src';
import { storyWith } from './helpers/perkfight';
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
    // Each player's view puts its own side on 'pc', and carries only its own side's sight (where the other team had
    // eyes on a tile is that team's secret): the mover's own player sees all '1' there.
    expect(vm.sight.pc).toMatch(/^1+$/); expect(vm.sight.foe).toBeUndefined();
    // The other team's view holds the walk only where that team saw it, cut to the fog edge (fog.ts, 12 Nov 2026).
    const seenBy = cur.side === 'pc' ? mv.sight.foe : mv.sight.pc, f0 = seenBy.indexOf('1'), f1 = seenBy.lastIndexOf('1');
    if (f0 < 0) expect(vo).toBeUndefined();
    else { expect(vo.sight.foe).toBeUndefined(); expect(vo.sight.pc).toBe(seenBy.slice(Math.max(0, f0 - 1), Math.min(seenBy.length, f1 + 2))); }
    for (const pid of ['h1', 'p2']) { const vc = viewFor(g, pid).combat!; expect(vc.sightSeen).toBeUndefined(); expect(vc.sightPos).toBeUndefined(); }
    // A walk makes no 'sight' event of its own (its sight rides the move event, checked above); any that a view does
    // carry must be its own side's. Stated as one list, so the check is not a loop that never runs (truth pass 3).
    const leaks = ['h1', 'p2'].flatMap((pid) => viewFor(g, pid).combat!.fx!.filter((e: FxEvent) => e.k === 'sight' && e.only !== 'pc'));
    expect(leaks).toEqual([]);
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

describe('review fixes (combat clarity)', () => {
  it('a PC walking out of a foe\'s line: the foe drops out of sight where it was last seen, on the step that lost it', () => {
    const f = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]);
    const pc = f.pc, foe = f.foe; pc.pos = '6,2'; pc.vision = 4; foe.pos = '9,2';
    withGame(f.g, () => { delete f.cb.sightSeen; sightFx(f.cb); });
    expect(f.cb.sightSeen!.pc).toContain(foe.id);
    f.turn(pc); const n0 = top(f.g);
    f.act({ type: 'combat/move', unitId: pc.id, to: '2,2' });
    const lost = since(f.g, n0).filter((e) => e.k === 'sight' && e.unit === foe.id);
    // 9 tiles off at 4,2 (5 > vision 4): the step onto 4,2 is the one that lost it; it fades where it stood.
    expect(lost).toEqual([expect.objectContaining({ how: 'lost', at: '9,2', only: 'pc', by: pc.id, byAt: '4,2' })]);
    // The walk's own move comes first; the lost event is timed to its step by byAt.
    const ev = since(f.g, n0); expect(ev.findIndex((e) => e.k === 'move')).toBeLessThan(ev.findIndex((e) => e.k === 'sight'));
  });
  it('a foe the walk finds comes into sight on the step that found it (by, byAt)', () => {
    const f = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]);
    const pc = f.pc, foe = f.foe; pc.pos = '2,2'; pc.vision = 4; foe.pos = '9,2';
    withGame(f.g, () => { delete f.cb.sightSeen; sightFx(f.cb); });
    f.turn(pc); const n0 = top(f.g);
    f.act({ type: 'combat/move', unitId: pc.id, to: '7,2' });
    expect(since(f.g, n0).filter((e) => e.k === 'sight')).toEqual([expect.objectContaining({ unit: foe.id, how: 'enter', at: '9,2', by: pc.id, byAt: '5,2' })]);
  });
  it('a unit lost while unseen moves on is placed where it was last seen, never where it went', () => {
    const f = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]);
    const pc = f.pc, foe = f.foe; pc.pos = '2,2'; pc.vision = 4; foe.pos = '5,2';
    withGame(f.g, () => { delete f.cb.sightSeen; sightFx(f.cb); });
    const n0 = top(f.g); foe.pos = '14,2'; // carried off (a blink, a shove) out of sight
    withGame(f.g, () => sightFx(f.cb));
    expect(since(f.g, n0)).toEqual([expect.objectContaining({ k: 'sight', unit: foe.id, how: 'lost', at: '5,2', only: 'pc' })]);
    expect(JSON.stringify(since(f.g, n0))).not.toContain('14,2');
  });
  it('a turn\'s ring and a stance\'s word carry who saw the unit then (seen), each view only its own side', () => {
    const f = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]);
    const pc = f.pc, foe = f.foe; pc.pos = '2,2'; pc.vision = 4; foe.pos = '12,2';
    withGame(f.g, () => { delete f.cb.sightSeen; sightFx(f.cb); });
    f.turn(pc); const n0 = top(f.g);
    f.act({ type: 'combat/end-turn', unitId: pc.id });
    const t = since(f.g, n0).find((e) => e.k === 'turn' && e.unit === foe.id)!;
    expect(t.seen).toEqual({ pc: 0, foe: 1 }); // in the fog as its turn starts (it may walk in after)
    const vt = viewFor(f.g, 'host').combat!.fx!.find((e) => e.n === t.n)!;
    expect(vt.seen).toEqual({ pc: 0 });
  });
  it('a hidden walker revealed mid-walk (a Sigil field bites it) is unseen on the tiles it crossed Hidden', () => {
    const f = fightWith([{}], [{ at: 'M3', weapon: 'fists' }]);
    const pc = f.pc, foe = f.foe; pc.pos = '2,2'; pc.vision = 12; foe.pos = '7,2'; foe.ap = 6; foe.hidden = true; foe.hp = foe.maxHp = 999;
    f.cb.zones = [{ id: 'zf', kind: 'field', tiles: ['4,2'], words: ['fire', 'stay'], by: pc.id, side: 'pc', left: 4, mult: 1, who: pc.name } as any];
    withGame(f.g, () => { delete f.cb.sightSeen; sightFx(f.cb); });
    const n0 = top(f.g);
    withGame(f.g, () => moveUnit(f.cb, foe, '3,2', f.g.rng as any));
    const mv = since(f.g, n0).filter((e) => e.k === 'move' && e.unit === foe.id);
    expect(mv.length).toBeGreaterThan(0);
    const tiles: string[] = [], pcs: string[] = [];
    for (const e of mv) e.path.forEach((k: string, i: number) => { tiles.push(k); pcs.push(e.sight.pc[i]); });
    // Hidden on 6,2 and 5,2 (and on 4,2 as it stepped in): never shown there, whatever the bite did after.
    for (const k of ['6,2', '5,2']) expect(pcs[tiles.indexOf(k)]).toBe('0');
    expect(foe.hidden).toBe(false); // the bite revealed it: the walk shows it from 4,2 on, where it came out
    expect(mv.map((e) => e.sight.pc).join('')).toMatch(/^0+1+$/);
  });
  it('a lurker that opens an area-map fight Hidden gives no sight event away (the ambush stays secret)', () => {
    for (const d of [3, 6]) {
      const s = storyWith([{}], 'SIGHTLURK' + d); const c = s.chars[0], at = positionsOf(s.g)[c.id];
      const map = zoneMap(s.g), [x, y] = at.split(',').map(Number), taken = new Set([...Object.values(positionsOf(s.g)), ...npcsOf(s.g).map((n) => n.pos)]);
      const free = (r: number) => { for (let i = -r; i <= r; i++) for (let j = -r; j <= r; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== r) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) { taken.add(k); return k; } } throw new Error('no tile'); };
      const place = (k: string, hidden: boolean, name: string) => { s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [{ action: 'place', name, side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: refOf(k), ...(hidden ? { hidden: true } : {}) }] } } as any); return npcsOf(s.g)[npcsOf(s.g).length - 1]; };
      const t = place(free(1), false, 'Target'); place(free(d), true, 'Lurker');
      s.act({ type: 'world/act', charId: c.id, act: 'attack', targetId: t.id, mode: 'shot' } as any);
      expect(s.g.phase).toBe('combat');
      const lurker = s.g.combat!.units.find((u) => u.name === 'Lurker')!;
      const v = viewFor(s.g, 'host');
      const leak = (v.combat!.fx || []).filter((e) => e.unit === lurker.id && e.k === 'sight' && (e.how === 'hide' || e.how === 'lost'));
      expect(leak).toEqual([]);
    }
  });
});
