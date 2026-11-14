// Survival's music by situation (rules 1.54; data/survival.json `music`): the camp, the path map by setting, a place by
// its node's kind (a place with no track of its own plays the map's), the boon pick; a fight keeps the fight music.
// Every case goes through the reducer (a real run, a real move) and musicFor; the numbers of the table are read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, musicFor, OST, FIGHT_POOL, RUN_MUSIC } from '../src';
import { type Pc } from './helpers/replay';
import { survivalRoom, startRun, ownerOf } from './helpers/survival';
import svJ from '../../../data/survival.json';

const SV: any = svJ, M = SV.music;
const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const started = (seed = 'PHC-0001') => startRun(survivalRoom(seed, DUO, { test: true }), seed);
const take = (g: GameState, id: string) => { let x = g; for (let i = 0; i < DUO.length && x.run!.at !== id; i++) x = apply(x, { type: 'run/move', node: id }, ownerOf(i)); return x; };
const heard = (g: GameState) => musicFor(g).track?.ost;
/** The squad walked onto a node of this kind (depth 3), in this setting. */
function onNode(kind: string, setting?: string, depth = 3): GameState {
  const g0 = clone(started()), r = g0.run!, n = r.nodes.find((x) => x.depth === depth)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map';
  if (setting) r.world[r.world.length - 1].setting = setting;
  return take(g0, n.id);
}

describe('rules 1.54: Survival\'s music by situation', () => {
  it('the camp plays camp', () => {
    const g = apply(survivalRoom('PHC-0001', DUO), { type: 'run/start', seed: 'PHC-0001' }, 'host');
    expect(g.run!.state).toBe('loadout');
    expect(heard(g)).toBe(M.camp);
  });
  it('the path map plays its setting\'s track, else the default', () => {
    for (const s of SV.settings) {
      const g = clone(started()); g.run!.world[g.run!.world.length - 1].setting = s.id;
      expect(g.run!.state).toBe('map');
      expect(heard(g), s.id).toBe(M.map[s.id] || M.map.default);
    }
    const g = clone(started()); g.run!.world[g.run!.world.length - 1].setting = 'no_such_setting';
    expect(heard(g)).toBe(M.map.default);
  });
  it('a place plays its own track; a place with none plays the setting\'s map track', () => {
    for (const s of SV.settings) for (const kind of ['shop', 'forge', 'rest', 'training', 'shrine', 'event', 'cache']) {
      const g = onNode(kind, s.id);
      expect(g.run!.at, kind).not.toBeNull();
      expect(heard(g), s.id + ' ' + kind).toBe(M.place[kind] || M.map[s.id] || M.map.default);
    }
  });
  it('the vault\'s chest, with no track of its own, plays the setting\'s map track', () => {
    const g = onNode('vault', 'city');
    expect(heard(g)).toBe(M.place.vault || M.map.city || M.map.default);
  });
  it('leaving a place goes back to the map track', () => {
    let g = onNode('shop', 'works');
    expect(heard(g)).toBe(M.place.shop);
    for (let i = 0; i < DUO.length; i++) g = apply(g, { type: 'run/leave' }, ownerOf(i));
    expect(g.run!.state).toBe('map');
    expect(heard(g)).toBe(M.map.works);
  });
  it('the boon pick plays boon', () => {
    const g0 = clone(started()), r = g0.run!, boss = r.nodes.find((x) => x.kind === 'boss')!, prev = r.nodes.find((x) => x.links.includes(boss.id))!;
    r.at = prev.id;
    let g = apply(take(g0, boss.id), { type: 'run/skip' }, 'host');
    for (let i = 0; i < DUO.length; i++) g = apply(g, { type: 'run/pick', charId: 'c' + (i + 1), choice: 'credits' }, ownerOf(i));
    expect(g.run!.state).toBe('boon');
    expect(heard(g)).toBe(M.boon);
  });
  it('a fight in a run keeps the fight selection: never one of the run\'s own tracks', () => {
    for (const kind of ['fight', 'elite']) {
      const g = onNode(kind, undefined, kind === 'elite' ? 5 : 3);
      expect(g.phase, kind).toBe('combat');
      const t = musicFor(g);
      expect(t.layer).toBe('combat');
      expect(String(t.track?.ost).startsWith('surv_')).toBe(false);
      expect([...FIGHT_POOL, 'heaven_falls', 'last_rounds']).toContain(t.track?.ost);
    }
  });
  it('every Survival context resolves to a real track in the table', () => {
    const ids: string[] = [M.camp, M.boon, ...Object.values<string>(M.map), ...Object.values<string>(M.place)];
    for (const id of ids) expect(OST[id as keyof typeof OST], id).toBeTruthy();
    expect(M.map.default).toBeTruthy();
    for (const s of SV.settings) expect(RUN_MUSIC.map[s.id] || RUN_MUSIC.map.default, s.id).toBeTruthy();
    for (const k of Object.keys(M.place)) expect(Object.keys(SV.map.words), k).toContain(k);
  });
});
