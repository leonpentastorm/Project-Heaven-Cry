// Maps (spec: Maps, rules 1.16): the size limits, a layout drawn as rows, deployment, and a walk over every map the
// game ships: size within the limits, both starts on free tiles, a way between them, cover within reach of both, the
// sides 10 to 14 tiles apart and out of each other's sight on the full-size maps.
import { describe, it, expect } from 'vitest';
import {
  BUILT_IN_CAMPAIGNS, PROVING_GROUND, MAPS, MAP_LIMITS, MAP_LAYOUTS, validateCampaign, zoneToMap, readLayout, expandZone, sizeProblem, startGap, deployEnemy,
  defaultObjects, walkable, lineOfSight, blocksMove, coverKind, dist, refOf, newGame, apply, startCombat, enemyTurn, active, endTurn,
  type MapDef, type Combat, type GameState,
} from '../src';
import { fightWith, storyWith } from './helpers/perkfight';

const zonesOf = (): { where: string; map: MapDef }[] => [
  ...[...BUILT_IN_CAMPAIGNS, PROVING_GROUND].flatMap((c) => c.zones.map((z) => ({ where: c.id + '/' + z.id, map: zoneToMap(z) }))),
  { where: 'engine/yard', map: MAPS.yard }, { where: 'engine/rear_pad', map: MAPS.rear_pad },
];
const fakeCb = (map: MapDef) => ({ map, objects: defaultObjects(map), units: [], glyphs: [], zones: [] }) as unknown as Combat;
const keyOfTile = (r: string) => (r.charCodeAt(0) - 65) + ',' + (Number(r.slice(1)) - 1);
const FULL = (m: MapDef) => m.w === MAP_LIMITS.full_size && m.h === MAP_LIMITS.full_size;

describe('map limits (rules 1.16)', () => {
  it('the numbers: 26 at most, 8 at least, the sides 10 to 14 apart', () => {
    expect(MAP_LIMITS).toMatchObject({ max: 26, min: 8, full_size: 26, deploy_min: 10, deploy_max: 14 });
  });
  it('a size over the maximum or under the minimum is an error, not a clamp', () => {
    expect(sizeProblem(26, 26)).toBeNull(); expect(sizeProblem(8, 8)).toBeNull(); expect(sizeProblem(16, 11)).toBeNull();
    for (const [w, h] of [[27, 26], [26, 27], [7, 12], [12, 7], [40, 40], [16.5, 11], ['16', 11], [undefined, 11]] as [any, any][]) expect(sizeProblem(w, h), w + 'x' + h).toMatch(/8 to 26/);
    const camp = (w: number, h: number) => ({ id: 't', title: 'T', opening: 'o', startZone: 'z', arc: { beginning: 'b', middle: 'm', end: 'e' }, zones: [{ id: 'z', name: 'Z', summary: 's', w, h, start: ['B2'] }] });
    expect(validateCampaign(camp(26, 26))).toEqual([]);
    expect(validateCampaign(camp(27, 26)).join(' ')).toMatch(/z: a map is 8 to 26 tiles wide and 8 to 26 tall \(this one is 27 × 26\)/);
    expect(validateCampaign(camp(6, 6)).join(' ')).toMatch(/8 to 26/);
    // The room refuses the file: nothing is loaded, nothing is cut down to fit.
    const g = newGame('MAPS1', { id: 'host', name: 'Host' });
    expect(() => apply(g, { type: 'campaign/load', campaign: camp(30, 30) } as any, 'host')).toThrow(/8 to 26/);
  });
  it('a campaign may set a map smaller than the maximum, and it plays at that size', () => {
    const c: any = { id: 'small', title: 'Small', opening: 'o', startZone: 'cellar', arc: { beginning: 'b', middle: 'm', end: 'e' }, pitch: ['p'], meta: 'm',
      zones: [{ id: 'cellar', name: 'The cellar', summary: 'Tight.', w: 12, h: 9, solid: ['A1–L1'], start: ['B4', 'B5'], enemyStart: ['K4', 'K5'] }] };
    expect(validateCampaign(c)).toEqual([]);
    let g = newGame('MAPS2', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'campaign/load', campaign: c } as any, 'host');
    const m = zoneToMap(g.campaign!.zones[0]);
    expect([m.w, m.h]).toEqual([12, 9]);
    expect(m.pcStart).toEqual(['1,3', '1,4']); expect(m.foeStart).toEqual(['10,3', '10,4']);
  });
  it('a start tile inside solid ground, on a blocking object or off the map is an error', () => {
    const z = (over: any) => ({ id: 't', title: 'T', opening: 'o', startZone: 'z', arc: { beginning: 'b', middle: 'm', end: 'e' }, zones: [{ id: 'z', name: 'Z', summary: 's', w: 12, h: 12, start: ['B2'], ...over }] });
    expect(validateCampaign(z({ solid: ['A1–C3'] })).join(' ')).toMatch(/start tile B2 is inside solid ground/);
    expect(validateCampaign(z({ objects: [{ kind: 'pillar', at: 'B2' }] })).join(' ')).toMatch(/start tile B2 is on Pillar/);
    expect(validateCampaign(z({ enemyStart: ['K11'], objects: [{ kind: 'crate', at: 'K11', name: 'Crates' }] })).join(' ')).toMatch(/enemy start tile K11 is on Crates/);
    expect(validateCampaign(z({ enemyStart: ['M3'] })).join(' ')).toMatch(/enemy start "M3" is off the map/);
    expect(validateCampaign(z({ objects: [{ kind: 'poi', at: 'B2' }] }))).toEqual([]); // something you can stand on is fine
  });
});

describe('a map drawn as rows (rules 1.16)', () => {
  const rows = ['........', '.S..#.E.', '.S.c~.E.', '....P...', '........', '........', '........', '........'];
  it('reads solid, difficult, starts and objects from the picture', () => {
    const p = readLayout(rows, 8, 8, { c: { kind: 'crate', name: 'Sandbags' } });
    expect(p.errors).toEqual([]);
    expect(p.solid).toEqual(['E2']); expect(p.difficult).toEqual(['E3']);
    expect(p.start.sort()).toEqual(['B2', 'B3']); expect(p.enemyStart.sort()).toEqual(['G2', 'G3']);
    expect(p.objects).toEqual([{ kind: 'crate', name: 'Sandbags', at: 'D3' }, { kind: 'pillar', at: 'E4' }]);
  });
  it('start tiles come out nearest the middle of their group first', () => {
    const p = readLayout(['S.......', 'S.......', 'S.......', '........', '........', '........', '........', '........'], 8, 8);
    expect(p.start[0]).toBe('A2');
  });
  it('says what is wrong with a bad picture', () => {
    expect(readLayout(rows.slice(1), 8, 8).errors.join(' ')).toMatch(/7 rows but the map is 8 tall/);
    expect(readLayout(rows.map((r, i) => (i ? r : r + '.')), 8, 8).errors.join(' ')).toMatch(/row 1 has 9 characters but the map is 8 wide/);
    expect(readLayout(rows.map((r, i) => (i ? r : '?.......')), 8, 8).errors.join(' ')).toMatch(/uses "\?" but the legend does not say/);
    const camp = { id: 't', title: 'T', opening: 'o', startZone: 'z', arc: { beginning: 'b', middle: 'm', end: 'e' }, zones: [{ id: 'z', name: 'Z', summary: 's', w: 8, h: 8, layout: 'nowhere' }] };
    expect(validateCampaign(camp).join(' ')).toMatch(/unknown layout "nowhere"/);
  });
  it('a zone with a layout becomes a plain zone: the picture added to what it lists by hand', () => {
    const { zone, errors } = expandZone({ id: 'z', name: 'Z', w: 8, h: 8, layout: rows, solid: ['A8'], objects: [{ kind: 'poi', at: 'H8', name: 'A thing' }] } as any);
    expect(errors).toEqual([]); expect((zone as any).layout).toBeUndefined();
    expect(zone.solid).toEqual(['A8', 'E2']); expect(zone.objects.map((o: any) => o.kind)).toEqual(['crate', 'pillar', 'poi']);
    const m = zoneToMap(zone as any); expect(m.pcStart.length).toBe(2); expect(m.foeStart.length).toBe(2);
  });
  it('open ground is one layout: the engine\'s yard and the Narrator\'s Own Start are the same ground', () => {
    const own = BUILT_IN_CAMPAIGNS.find((c) => c.id === 'own')!, m = zoneToMap(own.zones[0]);
    expect([m.w, m.h]).toEqual([26, 26]); expect([MAPS.yard.w, MAPS.yard.h]).toEqual([26, 26]);
    expect(m.solid).toEqual(MAPS.yard.solid); expect(m.pcStart).toEqual(MAPS.yard.pcStart); expect(m.foeStart).toEqual(MAPS.yard.foeStart);
    expect(MAP_LAYOUTS.open_ground.rows.length).toBe(26);
  });
});

describe('deployment (rules 1.16)', () => {
  it('no enemy start tiles: the far side, the nearest of each side at most 14 apart', () => {
    const start = ['1,12', '1,13', '2,12', '2,13'], foe = deployEnemy(26, 26, start, new Set());
    expect(foe.length).toBe(4); expect(startGap(start, foe)).toBe(14);
    expect(foe.every((k) => Number(k.split(',')[0]) > 13)).toBe(true); // the other side of the map
  });
  it('a squad already 10 to 14 from its mirror stays mirrored', () => {
    const start = ['6,10', '6,11'], foe = deployEnemy(26, 26, start, new Set());
    expect(foe).toEqual(['19,10', '19,11']); expect(startGap(start, foe)).toBe(13);
  });
  it('a tile something stands on moves to the nearest free one', () => {
    const start = ['6,10'], foe = deployEnemy(26, 26, start, new Set(['19,10']));
    expect(foe.length).toBe(1); expect(foe[0]).not.toBe('19,10'); expect(dist(foe[0], '19,10')).toBe(1);
  });
  it('a map too narrow for 10 tiles puts the sides as far apart as it allows', () => {
    const start = ['1,4'], foe = deployEnemy(8, 8, start, new Set());
    expect(foe).toEqual(['7,4']); // the far edge: 6 tiles, all an 8-wide map has
  });
  it('a squad that starts in the middle gets the enemy as far to one side as the map allows', () => {
    const start = ['12,12', '13,12'], foe = deployEnemy(26, 26, start, new Set());
    expect(startGap(start, foe)).toBeGreaterThanOrEqual(10);
  });
  it('a zone without enemyStart deploys by the rule; with one it is used as written', () => {
    const z: any = { id: 'z', name: 'Z', summary: 's', w: 26, h: 26, start: ['B12', 'B13'] };
    expect(startGap(zoneToMap(z).pcStart, zoneToMap(z).foeStart)).toBe(14);
    expect(zoneToMap({ ...z, enemyStart: ['Z1'] }).foeStart).toEqual(['25,0']);
  });
  it('more fighters than start tiles stand beside their start, not across the map', () => {
    const s = storyWith([{}]), c = s.chars[0];
    const map: MapDef = { id: 't', name: 'T', w: 26, h: 26, solid: [], cover: [], full: [], difficult: [], pcStart: ['3,20'], foeStart: ['20,20', '20,21'] };
    const cb = startCombat('T', map, [{ c }], Array.from({ length: 8 }, (_, i) => ({ name: 'Foe ' + i, tier: 'minion', weapon: 'service_pistol' })), 'standard', { state: 813 });
    const foes = cb.units.filter((u) => u.side === 'foe');
    expect(foes.length).toBe(8);
    for (const u of foes) expect(dist(u.pos, '20,20'), u.name + ' at ' + refOf(u.pos)).toBeLessThanOrEqual(2);
  });
});

describe('every map the game ships', () => {
  const all = zonesOf();
  it('there are maps to walk, and the built-in campaigns pass their own check', () => {
    expect(all.length).toBeGreaterThanOrEqual(11);
    for (const c of [...BUILT_IN_CAMPAIGNS, PROVING_GROUND]) expect(validateCampaign(c), c.id).toEqual([]);
  });
  for (const { where, map } of all) describe(where + ' (' + map.w + ' × ' + map.h + ')', () => {
    const objs = defaultObjects(map), blocked = new Set([...map.solid, ...objs.filter(blocksMove).map((o) => o.pos)]);
    const inMap = (k: string) => { const [x, y] = k.split(',').map(Number); return x >= 0 && y >= 0 && x < map.w && y < map.h; };
    it('its size is within the limits', () => { expect(sizeProblem(map.w, map.h)).toBeNull(); });
    it('both sides have start tiles, on the map, on free ground', () => {
      expect(map.pcStart.length).toBeGreaterThan(0); expect(map.foeStart.length).toBeGreaterThan(0);
      for (const k of [...map.pcStart, ...map.foeStart]) { expect(inMap(k), refOf(k) + ' on the map').toBe(true); expect(blocked.has(k), refOf(k) + ' is free').toBe(false); }
      expect(new Set([...map.pcStart, ...map.foeStart]).size).toBe(map.pcStart.length + map.foeStart.length); // no tile is both
    });
    it('there is a way from every squad start to every enemy start', () => {
      const open = objs.filter((o) => o.kind !== 'door'); // a door is a way through, shut or not
      for (const a of map.pcStart) for (const b of map.foeStart) expect(walkable(map, open, a, b), refOf(a) + ' to ' + refOf(b)).toBe(true);
    });
    it('everything it places is on the map', () => {
      for (const k of [...map.solid, ...map.difficult, ...objs.map((o) => o.pos)]) expect(inMap(k), refOf(k)).toBe(true);
      expect(objs.length).toBe((map.objects || []).length + map.cover.length + (map.full || []).length); // no object fell off
    });
    if (FULL(map)) {
      it('the nearest of each side start 10 to 14 tiles apart', () => {
        const gap = startGap(map.pcStart, map.foeStart);
        expect(gap).toBeGreaterThanOrEqual(MAP_LIMITS.deploy_min); expect(gap).toBeLessThanOrEqual(MAP_LIMITS.deploy_max);
      });
      it('neither side starts in the other\'s sight', () => {
        const cb = fakeCb(map);
        for (const a of map.pcStart) for (const b of map.foeStart) expect(lineOfSight(cb, a, b), refOf(a) + ' sees ' + refOf(b)).toBe(false);
      });
      it('both starts have cover within reach: something to stand behind within 4 tiles', () => {
        const cover = [...objs.filter((o) => coverKind(o)).map((o) => o.pos), ...map.solid];
        for (const side of [map.pcStart, map.foeStart]) expect(Math.min(...side.flatMap((s) => cover.map((c) => dist(s, c))))).toBeLessThanOrEqual(4);
      });
      it('there is more than one way across: with the shortest way walled off, another still leads there', () => {
        // Block the whole middle column band the direct line crosses (the rows of the start tiles): a lane north or south must remain.
        const ys = [...map.pcStart, ...map.foeStart].map((k) => Number(k.split(',')[1])), y0 = Math.min(...ys), y1 = Math.max(...ys);
        const [ax] = map.pcStart[0].split(',').map(Number), [bx] = map.foeStart[0].split(',').map(Number), mx = Math.round((ax + bx) / 2);
        const wall: string[] = []; for (let y = y0; y <= y1; y++) wall.push(mx + ',' + y);
        expect(walkable({ ...map, solid: [...map.solid, ...wall] }, objs, map.pcStart[0], map.foeStart[0])).toBe(true);
      });
    }
  });
  it('the sizes: open ground, the Proving Ground and the three open campaigns are 26 × 26; the penthouse and M813 keep 16 × 11', () => {
    const size = Object.fromEntries(all.map(({ where, map }) => [where, map.w + 'x' + map.h]));
    expect(size).toEqual({
      'm813/shield_line': '16x11', 'm813/rear_pad': '16x11', 'm813/outpost': '16x11', 'm813/outpost_1': '16x11',
      'godplot/shrine_camp': '26x26', 'curse/lifted_town': '26x26', 'summoning/penthouse': '16x11', 'own/open_ground': '26x26',
      'proving_ground/proving_ground': '26x26', 'engine/yard': '26x26', 'engine/rear_pad': '16x11',
    });
  });
  it('no map is painted any more: plain colour everywhere (the banners over the story stay)', () => {
    for (const c of [...BUILT_IN_CAMPAIGNS, PROVING_GROUND]) for (const z of c.zones) expect((z.art as any)?.map, c.id + '/' + z.id).toBeUndefined();
    const m = BUILT_IN_CAMPAIGNS.find((c) => c.id === 'm813')!;
    for (const z of m.zones) expect(z.art?.banner, z.id).toMatch(/^ill-m813/);
  });
});

describe('a save from before the maps grew (rules 1.16)', () => {
  // The 16 × 11 open ground as an old save carries it in its copy of the campaign.
  const OLD_ZONE = { id: 'open_ground', name: 'Open ground', summary: 'Whatever the Narrator says this place is.', w: 16, h: 11, difficult: ['H6–I6', 'H7'],
    start: ['B5', 'B7', 'C6', 'B9', 'C3', 'B3'], enemyStart: ['O6', 'O4', 'O8', 'N5', 'N7', 'P6'], notes: [{ at: 'A1–P11', text: 'Open ground.' }],
    objects: [{ kind: 'crate', at: 'F4', name: 'Debris' }, { kind: 'crate', at: 'F5', name: 'Debris' }, { kind: 'pillar', at: 'K7' }, { kind: 'pillar', at: 'K8' }] };
  const oldSave = (): GameState => {
    let g = newGame('OLDMAP', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'settings', patch: { start: 'own' } } as any, 'host');
    const s = storyWith([{}]).g.characters; // a sheet to add
    g = apply(g, { type: 'char/add', sheet: { name: 'Old Hand', portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...Object.values(s)[0].skills }, attrs: { ...Object.values(s)[0].attrs }, cores: { ...Object.values(s)[0].cores }, identity: {} } } as any, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open ground.', sceneTitle: 'Old' } } as any, 'host');
    // What the old save holds: the campaign copied in at session start, with the small map, and everyone on it.
    g = JSON.parse(JSON.stringify(g)); g.campaign!.zones = [JSON.parse(JSON.stringify(OLD_ZONE))]; g.story.positions = {}; delete (g.story as any).objects;
    return g;
  };
  it('in the middle of a fight it loads and plays on its own 16 × 11 map', () => {
    let g = oldSave();
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Old fight', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'service_pistol', at: 'O6' }] } } } as any, 'host');
    expect(g.phase).toBe('combat');
    g = JSON.parse(JSON.stringify(g)); // saved and loaded
    const cb = g.combat!; expect([cb.map.w, cb.map.h]).toEqual([16, 11]);
    const pc = cb.units.find((u) => u.side === 'pc')!, foe = cb.units.find((u) => u.side === 'foe')!;
    expect(refOf(pc.pos)).toBe('B5'); expect(refOf(foe.pos)).toBe('O6');
    // It plays: the enemy's turns stay on the small map, and a player's move is checked against its edges.
    let guard = 0; while (active(g.combat!)!.side !== 'pc' && guard++ < 10) g = apply(g, { type: 'combat/enemy' } as any, 'host');
    const me = g.combat!.units.find((u) => u.side === 'pc')!;
    expect(() => apply(g, { type: 'combat/move', unitId: me.id, to: '20,5' } as any, 'host')).toThrow();
    g = apply(g, { type: 'combat/move', unitId: me.id, to: keyOfTile('C5') } as any, 'host');
    expect(refOf(g.combat!.units.find((u) => u.side === 'pc')!.pos)).toBe('C5');
    for (const u of g.combat!.units) { const [x, y] = u.pos.split(',').map(Number); expect(x).toBeLessThan(16); expect(y).toBeLessThan(11); }
  });
  it('out of a fight it keeps its own small zone, even after the host refreshes the campaign', () => {
    let g = oldSave();
    expect([zoneToMap(g.campaign!.zones[0]).w, zoneToMap(g.campaign!.zones[0]).h]).toEqual([16, 11]);
    g = apply(g, { type: 'campaign/refresh' }, 'host');
    const z = g.campaign!.zones.find((x) => x.id === 'open_ground')!;
    expect([z.w, z.h]).toEqual([16, 11]); expect(z.start).toEqual(OLD_ZONE.start); // the layout changed, so the old definition stays
    // A new game of the same campaign gets the big one.
    const fresh = BUILT_IN_CAMPAIGNS.find((c) => c.id === 'own')!.zones[0]; expect([fresh.w, fresh.h]).toEqual([26, 26]);
  });
  it('an old M813 save loses its map paintings on a refresh and keeps its banners and its maps', () => {
    let { g } = storyWith([{}]); expect(g.campaign!.id).toBe('m813');
    g = JSON.parse(JSON.stringify(g)); for (const z of g.campaign!.zones) (z.art as any) = { ...(z.art || {}), map: 'map-m813-' + z.id };
    g = apply(g, { type: 'campaign/refresh' }, 'host');
    for (const z of g.campaign!.zones) { expect((z.art as any)?.map, z.id).toBeUndefined(); expect(z.art?.banner).toMatch(/^ill-m813/); expect([z.w, z.h]).toEqual([16, 11]); }
  });
});

describe('the enemy on the big map (rules 1.16)', () => {
  it('a round of a dozen enemies on 26 × 26 is quick, and they close on the squad around the middle', () => {
    const s = storyWith([{}, {}, {}, {}]), rng = { state: 7 };
    const tiers = ['minion', 'minion', 'minion', 'minion', 'soldier', 'soldier', 'soldier', 'soldier', 'elite', 'elite', 'elite', 'boss'], wp = ['service_pistol', 'combat_knife', 'hellraiser_service_rifle'];
    const cb = startCombat('Big', MAPS.yard, s.chars.map((c) => ({ c })), tiers.map((t, i) => ({ name: 'F' + i, tier: t, weapon: wp[i % 3] })), 'hard', rng);
    const foes = cb.units.filter((u) => u.side === 'foe'), pcs = cb.units.filter((u) => u.side === 'pc');
    expect(foes.length).toBe(12);
    const near0 = Math.min(...foes.map((f) => Math.min(...pcs.map((p) => dist(f.pos, p.pos)))));
    expect(near0).toBeGreaterThanOrEqual(10);
    const t0 = Date.now(); let turns = 0;
    for (let i = 0; i < 64 && !cb.over && turns < 12; i++) { const u = active(cb)!; if (u.side === 'foe' && !u.dead) { enemyTurn(cb, rng); turns++; } endTurn(cb, rng); }
    const ms = Date.now() - t0;
    expect(turns).toBe(12);
    expect(ms).toBeLessThan(3000); // measured 0.2 s for the twelve turns (11 Nov 2026); the bound is slack for a slow machine
    // Everyone moved toward the fight: nobody is still on a start tile, and the knives are well on their way.
    const melee = foes.filter((f) => f.weapon === 'combat_knife' && !f.dead);
    for (const f of melee) expect(Math.min(...pcs.map((p) => dist(f.pos, p.pos))), f.name).toBeLessThan(near0);
    for (const f of foes) { const [x, y] = f.pos.split(',').map(Number); expect(x >= 0 && y >= 0 && x < 26 && y < 26).toBe(true); expect(MAPS.yard.solid.includes(f.pos)).toBe(false); }
  });
});
