// World Play (rules revision 1.7; docs/design/world-play-spec.md), through apply(): faces, carrying, caches,
// approaches with consequences, hazards (per tile, in fights and on the area map, at any speed), triggers, talk,
// typed attempts, markers and the HERE card, the Narrator's moves walking the path, and views that leak nothing.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, type Sheet, type GameState, type Action, type NarratorTurn, newGame, apply, RuleError, validateCampaign, positionsOf, npcsOf, storyObjects, keyOf, refOf, zoneMap,
  carriedKg, carryLimit, overweightKg, movement, viewFor, packOf, maxHp, carriedOf, npcView, talkOptions, hazardTilesFor, hazardsFor, markersFor, hereCard, cacheView, avatarOf, kindKg,
  approachOptions, FAIL_HURT, active, storyConds, missionsOf, AVATAR_POOLS,
} from '../src';

const H = 'host', P2 = 'p2';
const sheet = (name: string, arch = 'sharpshooter'): Sheet => { const a = ARCHETYPES.find((x) => x.id === arch) || ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const CAMP: any = {
  id: 'wptest', title: 'World Play test', short: 'WP', kicker: 'TEST', pitch: ['A field.'], meta: 'Test.', arc: { beginning: 'a', middle: 'b', end: 'c' }, opening: 'Open.', startZone: 'field',
  zones: [
    { id: 'field', name: 'The field', summary: 'Open ground.', w: 16, h: 12, solid: [], start: ['B2', 'B3', 'B4', 'B5'], enemyStart: ['O2', 'O3', 'O4', 'O5'] },
    { id: 'yard2', name: 'Second yard', summary: 'Another place.', w: 10, h: 10, solid: [], start: ['A1', 'A2'], enemyStart: ['J9'] },
  ],
  missions: [{ id: 'm1', title: 'The core', act: 1, summary: 'Find it.', goal: 'Get the core out.', objectives: [
    { id: 'find', text: 'Find the core', done_when: 'Someone holds it.' }, { id: 'out', text: 'Get out with it', done_when: 'They leave.' }] }],
};
const ap = (g: GameState, a: Action, by = H) => apply(g, a, by);
const turn = (g: GameState, t: Partial<NarratorTurn>) => { const x: GameState = JSON.parse(JSON.stringify(g)); x.story.await = 'narrator'; x.story.work = { kind: 'round' }; return apply(x, { type: 'narrator/turn', turn: { narration: 'On.', ...t } as NarratorTurn }, H); };
const refused = (g: GameState, a: Action, by = H) => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
function start(seed = 'wp-1') {
  let g = newGame('WP1', { id: H, name: 'Host' }, seed);
  g = ap(g, { type: 'player/join', id: P2, name: 'Kim' });
  g = ap(g, { type: 'campaign/load', campaign: CAMP });
  g = ap(g, { type: 'char/add', sheet: sheet('Rook') });
  g = ap(g, { type: 'char/add', sheet: sheet('Ash') }, P2);
  g = ap(g, { type: 'session/start' });
  g = apply(g, { type: 'narrator/turn', turn: { narration: 'The field.', sceneTitle: 'The field' } }, H);
  return g;
}
const rook = (g: GameState) => Object.values(g.characters).find((c) => c.owner === H)!;
const ash = (g: GameState) => Object.values(g.characters).find((c) => c.owner === P2)!;
const K = (r: string) => keyOf(r, zoneMap(start()))!;
const npc = (g: GameState, name: string) => npcsOf(g).find((n) => n.name === name)!;
/** Settle the newest pending attempt: forced (auto) or rolled. */
function roll(g: GameState, auto?: 'success' | 'fail', by = H) { const x: GameState = JSON.parse(JSON.stringify(g)), ck = x.checks.filter((k) => !k.done).at(-1)!; if (auto) ck.auto = auto; let y = apply(x, { type: 'check/roll', checkId: ck.id }, by); y = apply(y, { type: 'check/accept', checkId: ck.id }, by); return y; }
const set = (g: GameState, f: (x: GameState) => void) => { const x: GameState = JSON.parse(JSON.stringify(g)); f(x); return x; };
const lines = (g: GameState) => g.story.entries.map((e) => e.text).join('\n');

describe('the test campaign', () => {
  it('validates', () => { expect(validateCampaign(CAMP)).toEqual([]); const g = start(); expect(g.story.await).toBe('players'); expect(positionsOf(g)[rook(g).id]).toBe(K('B2')); });
});

describe('faces (rules 1.7, section 1)', () => {
  it('every placed person gets a kind and an avatar: the Narrator\'s, or one from the kind\'s pool', () => {
    let g = start();
    g = turn(g, { npcs: [
      { action: 'place', name: 'Tessa', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'E5' },
      { action: 'place', name: 'Unit Nine', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'E6', kind: 'robot' },
      { action: 'place', name: 'Spotter', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'E7', kind: 'drone' },
      { action: 'place', name: 'Hound', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'E8', kind: 'beast' },
      { action: 'place', name: 'Painted', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'E9', avatar: 'char-orren-vask' },
      { action: 'place', name: 'Bogus', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'E10', avatar: 'not-a-real-face' },
    ] });
    expect(AVATAR_POOLS.world).toContain(npc(g, 'Tessa').avatar);
    expect(AVATAR_POOLS.robot).toContain(npc(g, 'Unit Nine').avatar); expect(npc(g, 'Unit Nine').kind).toBe('robot');
    expect(npc(g, 'Spotter').avatar).toBe('char-m813-scavenger-drone');
    expect(npc(g, 'Hound').avatar).toBeUndefined(); expect(avatarOf(g, npc(g, 'Hound'))).toBe('');
    expect(npc(g, 'Painted').avatar).toBe('char-orren-vask');
    expect(AVATAR_POOLS.world).toContain(npc(g, 'Bogus').avatar); // an unknown id falls back to the pool
    // Deterministic: the same state picks the same face.
    expect(avatarOf(g, { id: 'x1', name: 'Same' })).toBe(avatarOf(g, { id: 'x1', name: 'Same' }));
    expect(npcView(g, npc(g, 'Unit Nine').id)!).toMatchObject({ kind: 'robot', side: 'neutral', name: 'Unit Nine' });
  });
});

describe('carrying (section 2)', () => {
  const withRobots = () => turn(start(), { npcs: [
    { action: 'place', name: 'Seven', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'C2', kind: 'robot' },
    { action: 'place', name: 'Hum', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'C1', kind: 'robot' },
    { action: 'place', name: 'Guard', side: 'hostile', tier: 'soldier', weapon: 'service_pistol', at: 'D3' },
    { action: 'place', name: 'Far', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'J9', kind: 'drone' },
  ] });
  it('Carry (1 AP) takes an adjacent willing creature into the inventory, by its kind\'s weight; overweight rules apply', () => {
    let g = withRobots(); const c = rook(g), kg0 = carriedKg(c).total, mv0 = movement(c);
    expect(refused(g, { type: 'world/act', charId: c.id, act: 'carry', targetId: npc(g, 'Far').id })).toMatch(/Step next to/);
    expect(refused(g, { type: 'world/act', charId: c.id, act: 'carry', targetId: npc(g, 'Guard').id })).toMatch(/won't let you/);
    const id = npc(g, 'Seven').id;
    g = ap(g, { type: 'world/act', charId: c.id, act: 'carry', targetId: id });
    expect(npcsOf(g).some((n) => n.id === id)).toBe(false);
    expect(carriedOf(rook(g))).toEqual([expect.objectContaining({ id, name: 'Seven', kind: 'robot', kg: 40 })]);
    expect(g.story.ap![c.id]).toBe(5);
    expect(carriedKg(rook(g)).total).toBeCloseTo(kg0 + 40, 5);
    expect(overweightKg(rook(g))).toBeGreaterThan(0); expect(movement(rook(g))).toBeLessThan(mv0);
    expect(kindKg('drone')).toBe(15); expect(kindKg('human')).toBe(70); expect(kindKg('beast')).toBe(80);
    expect(lines(g)).toMatch(/Rook picks up Seven \(40 kg\): overburdened/);
    expect(g.story.fx!.at(-1)).toMatchObject({ k: 'carry', target: id, kind: 'robot', kg: 40 });
    // Put down (1 AP): the token comes back on an adjacent free tile with its name, kind, avatar and side.
    expect(refused(g, { type: 'world/act', charId: c.id, act: 'put_down', targetId: id, to: 'F9' })).toMatch(/next to you/);
    g = ap(g, { type: 'world/act', charId: c.id, act: 'put_down', targetId: id, to: 'A1' });
    expect(npc(g, 'Seven')).toMatchObject({ pos: K('A1'), kind: 'robot', side: 'neutral' }); expect(npc(g, 'Seven').avatar).toBeTruthy();
    expect(rook(g).carried).toBeUndefined(); expect(g.story.ap![c.id]).toBe(4);
  });
  it('"I put the two robots down" maps to two put_down actions, run when the next round opens', () => {
    let g = withRobots(); const c = rook(g);
    g = turn(g, { npcs: [{ action: 'carry', id: npc(g, 'Seven').id, charId: c.id }, { action: 'carry', id: npc(g, 'Hum').id, charId: c.id }] });
    expect(carriedOf(rook(g)).map((x) => x.name)).toEqual(['Seven', 'Hum']);
    const [a, b] = carriedOf(rook(g));
    g = turn(g, { actions: [{ charId: c.id, act: 'put_down', targetId: a.id, to: 'B1' }, { charId: c.id, act: 'put_down', targetId: b.id, to: '' }] });
    expect(rook(g).carried).toBeUndefined();
    expect(npc(g, 'Seven').pos).toBe(K('B1')); expect(npc(g, 'Hum')).toBeTruthy();
    expect(g.story.ap![c.id]).toBe(4);
  });
  it('the Narrator drops at a tile, with no AP; a Downed carrier drops on the area map at once', () => {
    let g = withRobots(); const c = rook(g);
    g = turn(g, { npcs: [{ action: 'carry', id: npc(g, 'Seven').id, charId: c.id }] });
    g = turn(g, { npcs: [{ action: 'drop', id: carriedOf(rook(g))[0].id, charId: c.id, at: 'H8' }] });
    expect(npc(g, 'Seven').pos).toBe(K('H8'));
    g = turn(g, { npcs: [{ action: 'carry', id: npc(g, 'Seven').id, charId: c.id }] });
    g = turn(g, { harm: [{ charId: c.id, amount: 5000, type: 'true' }] });
    expect(rook(g).hp).toBe(0); expect(rook(g).carried).toBeUndefined();
    expect(npc(g, 'Seven')).toBeTruthy(); expect(lines(g)).toMatch(/Rook goes down and drops Seven/);
  });
  it('carried creatures survive a fight starting and ending, and a save; a carrier Downed in the fight drops them', () => {
    let g = withRobots(); const c = rook(g);
    g = ap(g, { type: 'world/act', charId: c.id, act: 'carry', targetId: npc(g, 'Seven').id });
    g = JSON.parse(JSON.stringify(g)); // a save and a load
    g = turn(g, { combat: { name: 'Fight', difficulty: 'easy', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists', at: 'O9' }] } });
    expect(g.phase).toBe('combat'); expect(carriedOf(rook(g))[0].name).toBe('Seven');
    const u = g.combat!.units.find((x) => x.charId === c.id)!; expect(u.overweight).toBeGreaterThan(0);
    // Downed in the fight: the carried robot lands on a tile next to them, and is a token again after the fight.
    g = set(g, (x) => { const v = x.combat!.units.find((y) => y.charId === c.id)!; v.hp = 0; v.downed = true; });
    const cur = active(g.combat!)!; const pcU = g.combat!.units.find((x) => x.charId === ash(g).id)!;
    g = cur.id === pcU.id ? ap(g, { type: 'combat/end-turn', unitId: cur.id }, P2) : ap(g, { type: 'combat/end-turn', unitId: cur.id }, cur.charId === c.id ? H : P2);
    expect(rook(g).carried).toBeUndefined(); expect(g.combat!.dropped![0].npc.name).toBe('Seven');
    g = set(g, (x) => { for (const f of x.combat!.units) if (f.side === 'foe') { f.hp = 0; f.dead = true; } });
    const now = active(g.combat!)!; g = ap(g, { type: 'combat/end-turn', unitId: now.id }, now.charId === c.id ? H : P2);
    expect(g.phase).toBe('story'); expect(npc(g, 'Seven')).toBeTruthy();
  });
});

describe('caches (section 3)', () => {
  it('Search (1 AP, adjacent) moves the items into the pack and empties the cache; a locked one needs its approaches first', () => {
    let g = start(); const c = rook(g);
    g = turn(g, { objects: [
      { action: 'place', id: '', kind: 'cache', at: 'C2', name: 'Footlocker', text: 'Dented.', approaches: [], items: [{ item: 'stim_injector', qty: 2 }, { item: '', qty: 1, name: 'Brass key', text: 'Opens something.' }] },
      { action: 'place', id: '', kind: 'cache', at: 'C3', name: 'Strongbox', text: '', locked: true, items: [{ item: 'service_pistol', qty: 1, rarity: 'fine' }],
        approaches: [{ label: 'Pick the lock', skills: ['ingenuity'], tn: 12, stakes: 'Quiet.', success: 'open', fail: 'jam' }] },
    ] });
    const box = storyObjects(g).find((o) => o.name === 'Footlocker')!, strong = storyObjects(g).find((o) => o.name === 'Strongbox')!;
    expect(cacheView(g, box.id)).toMatchObject({ count: 2, locked: false, searched: false });
    const n0 = packOf(rook(g)).length;
    g = ap(g, { type: 'world/act', charId: c.id, act: 'search', objId: box.id });
    expect(packOf(rook(g)).some((x) => x.name === 'Brass key' && x.kind === 'plot')).toBe(true);
    expect(packOf(rook(g)).length).toBeGreaterThan(n0);
    expect(storyObjects(g).find((o) => o.id === box.id)!.items).toEqual([]); expect(g.story.ap![c.id]).toBe(5);
    expect(refused(g, { type: 'world/act', charId: c.id, act: 'search', objId: box.id })).toMatch(/empty/);
    expect(refused(g, { type: 'world/act', charId: c.id, act: 'search', objId: strong.id })).toMatch(/locked/);
    g = ap(g, { type: 'poi/try', charId: c.id, objId: strong.id, idx: 0 }); g = roll(g, 'success');
    g = ap(g, { type: 'world/act', charId: c.id, act: 'search', objId: strong.id });
    expect(packOf(rook(g)).some((x) => x.weapon === 'service_pistol' && x.rarity === 'fine')).toBe(true);
    expect(g.story.events!.some((e) => e.kind === 'search')).toBe(true);
  });
  it('a player\'s view shows how many things a cache holds, never what', () => {
    const g = turn(start(), { objects: [{ action: 'place', id: '', kind: 'cache', at: 'C2', name: 'Body', text: '', approaches: [], items: [{ item: '', qty: 1, name: 'Secret letter', text: 'Spoilers.' }] }] });
    const v = viewFor(g, P2), o = v.story.objects!.find((x) => x.name === 'Body')!;
    expect(o.items).toEqual([]); expect((o as any).itemCount).toBe(1); expect(JSON.stringify(v)).not.toMatch(/Secret letter/);
    expect(cacheView(v, o.id)!.count).toBe(1);
  });
  it('Search works in a fight too (1 AP of the unit\'s turn)', () => {
    let g = turn(start(), { objects: [{ action: 'place', id: '', kind: 'cache', at: 'C2', name: 'Crate', text: '', approaches: [], items: [{ item: 'stim_injector', qty: 1 }] }] });
    g = turn(g, { combat: { name: 'Fight', difficulty: 'easy', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists', at: 'P11' }] } });
    const o = g.combat!.objects!.find((x) => x.name === 'Crate')!;
    for (let i = 0; i < 6 && active(g.combat!)!.charId !== rook(g).id; i++) { const u = active(g.combat!)!; g = ap(g, { type: 'combat/end-turn', unitId: u.id }, u.charId === rook(g).id ? H : P2); }
    const u = active(g.combat!)!; expect(u.charId).toBe(rook(g).id); const ap0 = u.ap;
    g = ap(g, { type: 'combat/search', unitId: u.id, objId: o.id });
    expect(g.combat!.units.find((x) => x.id === u.id)!.ap).toBe(ap0 - 1);
    expect(g.combat!.objects!.find((x) => x.id === o.id)!.items).toEqual([]);
  });
});

describe('approaches with consequences (section 4)', () => {
  const place = (approaches: any[], extra: any = {}) => turn(start(), { objects: [{ action: 'place', id: '', kind: extra.kind || 'barricade', at: extra.at || 'C2', name: 'Thing', text: '', approaches, items: extra.items }] });
  const thing = (g: GameState) => storyObjects(g).find((o) => o.name === 'Thing')!;
  const A = (x: any) => ({ label: 'Do it', skills: ['raw_power'], tn: 12, stakes: 's', success: '', ...x });
  it('success: remove clears it (rubble for cover), open unlocks, loot hands its items over, advance marks the objective', () => {
    let g = place([A({ success: 'remove' })]); g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'success');
    expect(thing(g)).toBeUndefined(); expect(storyObjects(g).some((o) => o.kind === 'rubble' && o.pos === K('C2'))).toBe(true);
    g = place([A({ success: 'open' })], { kind: 'door' }); g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'success'); expect(thing(g).open).toBe(true);
    g = place([A({ success: 'loot' })], { kind: 'cache', items: [{ item: '', qty: 1, name: 'Core', text: 'Warm.' }] }); g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'success');
    expect(packOf(rook(g)).some((x) => x.name === 'Core')).toBe(true);
    g = place([A({ success: 'advance', objective: 'find' })]); g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'success');
    expect(missionsOf(g)!.objectives.m1.find).toBe('done');
  });
  it('success: reveal shows hidden tokens, objects and hazards within 3 tiles; disarm takes a hazard on its tile too', () => {
    let g = place([A({ success: 'reveal' })], { kind: 'poi' });
    g = turn(g, { npcs: [{ action: 'place', name: 'Lurker', side: 'hostile', tier: 'minion', weapon: 'fists', at: 'E4', hidden: true }, { action: 'place', name: 'Far lurker', side: 'hostile', tier: 'minion', weapon: 'fists', at: 'M10', hidden: true }],
      hazards: [{ action: 'place', kind: 'minefield', severity: 'light', tiles: ['D2'], hidden: true }] });
    g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'success');
    expect(npc(g, 'Lurker').hidden).toBeUndefined(); expect(npc(g, 'Far lurker').hidden).toBe(true); expect(g.story.hazards![0].hidden).toBe(false);
    g = place([A({ success: 'disarm' })], { kind: 'trap', at: 'C2' });
    g = turn(g, { hazards: [{ action: 'place', kind: 'fire', severity: 'light', tiles: ['C2', 'C3'] }] });
    const tr = storyObjects(g).find((o) => o.kind === 'trap')!; tr.hidden = false;
    g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: tr.id, idx: 0 }); g = roll(g, 'success');
    expect(storyObjects(g).some((o) => o.kind === 'trap')).toBe(false); expect(g.story.hazards || []).toEqual([]);
  });
  it('failure: hurt by the TN table (armour applies), alarm, condition, jam, lose', () => {
    expect(FAIL_HURT).toEqual({ 8: 10, 12: 20, 16: 35, 20: 50 });
    let g = place([A({ fail: 'hurt', tn: 16 })]); g = set(g, (x) => { x.characters[rook(x).id].armourClass = 0; x.characters[rook(x).id].worn = {}; });
    const hp0 = rook(g).hp; g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'fail');
    expect(hp0 - rook(g).hp).toBe(35);
    g = place([A({ fail: 'hurt', tn: 20 })]); g = set(g, (x) => { x.characters[rook(x).id].armourClass = 2; x.characters[rook(x).id].worn = {}; }); // armour 10
    const hp1 = rook(g).hp; g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'fail');
    expect(hp1 - rook(g).hp).toBe(40);
    // alarm: every hidden hostile in the zone, revealed and alerted.
    g = place([A({ fail: 'alarm' })]); g = turn(g, { npcs: [{ action: 'place', name: 'Sleeper', side: 'hostile', tier: 'minion', weapon: 'fists', at: 'O11', hidden: true, tags: ['unaware'] }] });
    g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'fail');
    expect(npc(g, 'Sleeper')).toMatchObject({ alerted: true }); expect(npc(g, 'Sleeper').hidden).toBeUndefined(); expect(npc(g, 'Sleeper').tags).not.toContain('unaware');
    expect(g.story.events!.some((e) => e.kind === 'alarm')).toBe(true); expect(g.story.await).toBe('players');
    // condition
    g = place([A({ fail: 'condition', failCondition: 'bleeding' })]); g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'fail');
    expect(storyConds(g, rook(g))).toContain('bleeding');
    g = place([A({ fail: 'condition', failCondition: 'slowed' })]); g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'fail');
    expect(g.story.magic![rook(g).id].conds!.slowed).toBeGreaterThan(0);
    // jam: locked for the scene, that approach gone for good
    g = place([A({ fail: 'jam' }), A({ label: 'Other way', skills: ['charisma'] })], { kind: 'door' });
    g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'fail');
    expect(thing(g).approaches[0].gone).toBe(true); expect(thing(g).jam).toBe(g.story.scene.n);
    expect(refused(g, { type: 'poi/try', charId: ash(g).id, objId: thing(g).id, idx: 1 }, P2)).toMatch(/jammed|Walk up/);
    // lose
    g = place([A({ fail: 'lose', failItem: 'stim_injector' })]);
    g = set(g, (x) => { x.characters[rook(x).id].pack = [...packOf(x.characters[rook(x).id]), { id: 'stim_injector', item: 'stim_injector', name: 'Stim injector', qty: 2, kind: 'med' }]; });
    g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'fail');
    expect(packOf(rook(g)).find((x) => x.item === 'stim_injector')!.qty).toBe(1);
  });
  it('each character tries each approach once; the Narrator sees every try', () => {
    let g = place([A({})]); g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 }); g = roll(g, 'fail');
    g = turn(g, { sceneTitle: 'Later' });
    expect(refused(g, { type: 'poi/try', charId: rook(g).id, objId: thing(g).id, idx: 0 })).toMatch(/already tried/);
    expect(g.story.events).toBeUndefined(); // consumed by the Narrator's turn
  });
});

describe('hazards (section 5)', () => {
  const bare = (g: GameState) => set(g, (x) => { for (const c of Object.values(x.characters)) { c.armourClass = 0; c.worn = {}; c.hp = 400; } });
  const hz = (kind: string, severity: 'light' | 'heavy', tiles: string[], extra: any = {}) => bare(turn(start(), { hazards: [{ action: 'place', kind, severity, tiles, ...extra }] }));
  const walk = (g: GameState, to: string, how: 'move' | 'sprint' = 'move', by = H, c = rook(g)) => ap(g, { type: 'world/act', charId: c.id, act: 'move', to, how }, by);
  it('a minefield fires on the tile entered on the area map: damage, a Body save halves it, the mine is spent, the walk stops', () => {
    let g = hz('minefield', 'light', ['D2', 'E2', 'F2']); const hp0 = rook(g).hp;
    g = walk(g, 'H2', 'sprint');
    expect(positionsOf(g)[rook(g).id]).toBe(K('D2')); // a sprint through a minefield still sets the first mine off and stops there
    const lost = hp0 - rook(g).hp; expect([12, 25]).toContain(lost);
    expect(g.story.hazards![0].spent).toEqual([K('D2')]);
    expect(lines(g)).toMatch(/sets off the minefield at D2 \(body save/);
    expect(g.story.fx!.some((e) => e.k === 'hazard' && e.kind === 'minefield')).toBe(true);
    expect(g.story.events!.some((e) => e.kind === 'hazard')).toBe(true);
    // The spent mine is safe now; the next one isn't.
    const hp1 = rook(g).hp; g = walk(g, 'E2'); expect(rook(g).hp).toBeLessThan(hp1);
  });
  it('fire burns per tile and sets Burning (no armour); collapse knocks prone and stops; radiation weakens from the third tile', () => {
    let g = hz('fire', 'heavy', ['C2', 'D2', 'E2']); const hp0 = rook(g).hp;
    g = walk(g, 'F2'); expect(hp0 - rook(g).hp).toBe(60); expect(positionsOf(g)[rook(g).id]).toBe(K('F2'));
    expect(g.story.magic![rook(g).id].conds!.burning).toBeGreaterThan(0);
    g = hz('collapse', 'light', ['C2', 'D2']); const hp1 = rook(g).hp;
    g = walk(g, 'F2'); expect(positionsOf(g)[rook(g).id]).toBe(K('C2')); expect(hp1 - rook(g).hp).toBe(20);
    g = hz('radiation', 'light', ['C2', 'D2', 'E2', 'F2']); const hp2 = rook(g).hp;
    g = walk(g, 'D2'); expect(g.story.magic?.[rook(g).id]?.conds?.weakened ?? 0).toBe(0);
    g = walk(g, 'F2'); expect(hp2 - rook(g).hp).toBe(20); expect(g.story.magic![rook(g).id].conds!.weakened).toBeGreaterThan(0);
  });
  it('gas: a Heart save, or Shaken (light) / Stunned (heavy, the walk stops)', () => {
    let saw = { shaken: 0, stunned: 0, saved: 0 };
    for (let i = 0; i < 12; i++) {
      let g = turn(start('gas-' + i), { hazards: [{ action: 'place', kind: 'gas', severity: 'heavy', tiles: ['C2'] }] });
      g = walk(g, 'E2');
      const conds = g.story.magic?.[rook(g).id]?.conds || {};
      if (conds.stunned) { saw.stunned++; expect(positionsOf(g)[rook(g).id]).toBe(K('C2')); } else saw.saved++;
    }
    expect(saw.stunned).toBeGreaterThan(0); expect(saw.saved + saw.stunned).toBe(12);
    let g = turn(start('gas-l'), { hazards: [{ action: 'place', kind: 'gas', severity: 'light', tiles: ['C2', 'D2', 'E2', 'F2', 'G2'] }] });
    g = walk(g, 'H2'); expect(g.story.fx!.filter((e) => e.k === 'hazard').length).toBe(5);
  });
  it('hazards fire per tile in a fight too, for enemies as well', () => {
    let g = hz('fire', 'light', ['C2', 'D2', 'E2']);
    g = turn(g, { combat: { name: 'Fight', difficulty: 'easy', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists', at: 'P11' }] } });
    expect(g.combat!.hazards!.length).toBe(1);
    for (let i = 0; i < 6 && active(g.combat!)!.charId !== rook(g).id; i++) { const u = active(g.combat!)!; g = ap(g, { type: 'combat/end-turn', unitId: u.id }, u.charId === rook(g).id ? H : P2); }
    const u = active(g.combat!)!, hp0 = u.hp;
    g = ap(g, { type: 'combat/move', unitId: u.id, to: K('E2') });
    const v = g.combat!.units.find((x) => x.id === u.id)!; expect(hp0 - v.hp).toBe(30); expect(v.conds?.burning).toBeGreaterThan(0);
    expect(g.combat!.fx!.filter((e) => e.k === 'hazard').length).toBe(3);
  });
  it('safe path: the approach marks a lane that doesn\'t trigger for the squad; disarm removes it; failing disarm bites', () => {
    let g = hz('minefield', 'heavy', ['D1', 'D2', 'D3', 'D4', 'E1', 'E2', 'E3', 'E4']); const h = g.story.hazards![0];
    expect(h.approaches.map((a) => a.label)).toEqual(['Find a safe path', 'Disarm the mines']); expect(h.approaches[0].tn).toBe(16);
    expect(approachOptions(g, h.id, rook(g).id)[0]).toMatchObject({ label: 'Find a safe path', ap: 2, available: false }); // too far (2 tiles)
    g = walk(g, 'C2');
    expect(approachOptions(g, h.id, rook(g).id)[0]).toMatchObject({ available: true }); expect(approachOptions(g, h.id, rook(g).id)[0].odds).toBeGreaterThan(0);
    g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: h.id, idx: 0 }); g = roll(g, 'success');
    const safe = g.story.hazards![0].safe!; expect(safe.length).toBeGreaterThanOrEqual(1);
    expect(hazardTilesFor(g, 'pc').filter((t) => t.safe).map((t) => t.tile).sort()).toEqual([...safe].sort());
    const hp0 = rook(g).hp; g = turn(g, {}); g = walk(g, refOf(safe[safe.length - 1])); expect(rook(g).hp).toBe(hp0);
    // Disarm (Ash): failure gives Ash one tile of the hazard; success removes it.
    g = walk(g, 'C3', 'move', P2, ash(g));
    const hpA = ash(g).hp; g = ap(g, { type: 'poi/try', charId: ash(g).id, objId: h.id, idx: 1 }, P2); g = roll(g, 'fail', P2);
    expect(ash(g).hp).toBeLessThan(hpA); expect(g.story.hazards!.length).toBe(1);
    g = turn(g, {});
    g = ap(g, { type: 'poi/try', charId: rook(g).id, objId: h.id, idx: 1 }); g = roll(g, 'success');
    expect(g.story.hazards).toEqual([]);
  });
  it('hidden mines: no tile in a player\'s view, spotted by passive Vigilant within 2 tiles, revealed by stepping in', () => {
    let g = hz('minefield', 'light', ['F2'], { hidden: true });
    expect(hazardTilesFor(g, 'pc')).toEqual([]); expect(hazardTilesFor(g, 'all').length).toBe(1);
    const v = viewFor(g, H); expect(v.story.hazards || []).toEqual([]); expect(JSON.stringify(v)).not.toMatch(/minefield/);
    // A sharp-eyed character spots it from next door.
    let s = set(g, (x) => { x.characters[rook(x).id].skills.vigilant = 7; });
    s = walk(s, 'D2'); expect(s.story.hazards![0].hidden).toBe(false); expect(lines(s)).toMatch(/spots a minefield at F2/);
    // A blind one walks in.
    let b = set(g, (x) => { x.characters[rook(x).id].skills.vigilant = 0; });
    b = walk(b, 'G2'); expect(positionsOf(b)[rook(b).id]).toBe(K('F2')); expect(b.story.hazards![0].hidden).toBe(false);
    // Fire can't be hidden.
    const f = hz('fire', 'light', ['F2'], { hidden: true }); expect(f.story.hazards![0].hidden).toBeUndefined();
  });
  it('the Narrator\'s moves walk the path, so a hazard on the way fires; with no path the jump is refused across one', () => {
    let g = hz('fire', 'light', ['C2', 'D2']); const hp0 = rook(g).hp;
    g = turn(g, { moves: [{ charId: rook(g).id, to: 'F2' }] });
    expect(positionsOf(g)[rook(g).id]).toBe(K('F2')); expect(hp0 - rook(g).hp).toBeGreaterThanOrEqual(20); // two tiles of fire (and Burning ticks as the round opens)
    expect(g.story.fx!.filter((e) => e.k === 'hazard').length).toBe(2);
  });
});

describe('triggers (section 6)', () => {
  const spawn = [{ action: 'place' as const, name: 'Ambusher', side: 'hostile' as const, tier: 'minion', weapon: 'fists', at: 'J2' }];
  it('enter + spawn fires once, with no Narrator call; the next turn hears it fired; players never see a trigger', () => {
    let g = turn(start(), { triggers: [{ when: 'enter', tiles: ['E2', 'E3'], then: 'spawn', spawn, text: 'Boots on gravel.' }] });
    expect(viewFor(g, H).story.triggers).toBeUndefined(); expect(JSON.stringify(viewFor(g, P2))).not.toMatch(/Ambusher/);
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'move', to: 'G2' });
    expect(npc(g, 'Ambusher')).toBeTruthy(); expect(lines(g)).toMatch(/Boots on gravel\./);
    expect(g.story.triggers![0].fired).toBe(true); expect(g.story.needs).toBe(true);
    expect(g.story.events!.some((e) => e.kind === 'trigger' && /spawn Ambusher/.test(e.text))).toBe(true);
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'move', to: 'D2' }); g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'move', to: 'E2' });
    expect(npcsOf(g).filter((n) => n.name === 'Ambusher').length).toBe(1); // one shot
  });
  it('enter + fight starts the fight on the spot with the spawned and every hostile token', () => {
    let g = turn(start(), { triggers: [{ when: 'enter', rect: { from: 'E1', to: 'E12' }, then: 'fight', difficulty: 'hard', name: 'The ditch', spawn: [...spawn, { action: 'place', name: 'Second', side: 'hostile', tier: 'minion', weapon: 'fists', at: 'J3', hidden: true }] }],
      npcs: [{ action: 'place', name: 'Old foe', side: 'hostile', tier: 'minion', weapon: 'fists', at: 'O11' }] });
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'move', to: 'G2' });
    expect(g.phase).toBe('combat'); expect(g.combat!.name).toBe('The ditch'); expect(g.combat!.difficulty).toBe('hard');
    const foes = g.combat!.units.filter((u) => u.side === 'foe').map((u) => u.name).sort(); expect(foes).toEqual(['Ambusher', 'Old foe', 'Second']);
    expect(g.combat!.units.find((u) => u.name === 'Second')!.hidden).toBe(true); // a lurker starts it Hidden
  });
  it('examine fires on any interaction with the object; objective fires when the objective is done; reveal shows what is hidden', () => {
    let g = turn(start(), { objects: [{ action: 'place', id: '', kind: 'cache', at: 'C2', name: 'Crate', text: '', approaches: [], items: [{ item: 'stim_injector', qty: 1 }] }] });
    const crate = storyObjects(g).find((o) => o.name === 'Crate')!;
    g = turn(g, { triggers: [{ when: 'examine', objId: crate.id, then: 'spawn', spawn }, { when: 'objective', objective: 'find', then: 'reveal' }],
      npcs: [{ action: 'place', name: 'Hidden one', side: 'hostile', tier: 'minion', weapon: 'fists', at: 'L8', hidden: true }] });
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'search', objId: crate.id });
    expect(npc(g, 'Ambusher')).toBeTruthy();
    const t2 = g.story.triggers!.find((t) => t.when === 'objective')!; expect(t2.objective).toBe('m1/find');
    g = set(g, (x) => { x.story.triggers!.find((t) => t.when === 'objective')!.reveal = [npcsOf(x).find((n) => n.name === 'Hidden one')!.id]; });
    expect(npc(g, 'Hidden one').hidden).toBe(true);
    g = turn(g, { missions: [{ mission: 'm1', objective: 'find', status: 'done' }] });
    expect(npc(g, 'Hidden one').hidden).toBeUndefined(); expect(g.story.triggers!.every((t) => t.fired)).toBe(true);
  });
});

describe('talking without typing (section 7)', () => {
  const keel = () => turn(start(), { npcs: [{ action: 'place', name: 'Keel', side: 'hostile', tier: 'soldier', weapon: 'fists', at: 'D2', wants: 'Fuel for the escape craft.', knows: { objective: 'out', hint: 'The pad is east, past the cradles.', at: 'O6' },
    talk: [{ label: 'Talk him down', skills: ['charisma'], tn: 12, stakes: 'He listens or he swings.', success: 'ally', fail: 'hostile' },
      { label: 'Ask about the core', skills: ['empathy'], tn: 8, stakes: '', success: 'inform' },
      { label: 'Lean on him', skills: ['intimidation'], tn: 16, stakes: '', success: 'advance', objective: 'find', fail: 'hurt' }] }] });
  it('wants and the hint are hidden until asked (1 AP each, within 3 tiles), and a hint puts a marker on the map', () => {
    let g = keel(); const n = npc(g, 'Keel');
    const vn = viewFor(g, P2).story.npcs!.find((x) => x.id === n.id)!; expect(vn.wants).toBe(''); expect(vn.wantsHidden).toBe(true);
    // The web works from the view: the Ask buttons are there, the words aren't.
    expect(talkOptions(viewFor(g, P2), n.id, ash(g).id).filter((o) => o.kind === 'ask').map((o) => o.what)).toEqual(['wants', 'objective']);
    expect(npcView(viewFor(g, P2), n.id)).toMatchObject({ hasWants: true, wants: null, hasKnows: true, knows: null });
    expect(JSON.stringify(viewFor(g, P2))).not.toMatch(/past the cradles|escape craft/);
    expect(npcView(g, n.id, rook(g).id)).toMatchObject({ wants: null, hasWants: true, knows: null, hasKnows: true, side: 'hostile' });
    expect(talkOptions(g, n.id, rook(g).id).map((o) => o.label)).toEqual(['Ask what they want', 'Ask about the objective', 'Talk him down', 'Ask about the core', 'Lean on him']);
    g = ap(g, { type: 'talk/ask', charId: rook(g).id, npcId: n.id, what: 'wants' });
    expect(g.story.ap![rook(g).id]).toBe(5); expect(npcView(g, n.id)!.wants).toBe('Fuel for the escape craft.'); expect(lines(g)).toMatch(/Keel wants: Fuel/);
    expect(g.story.entries.some((e) => e.kind === 'player' && /asks Keel what they want/.test(e.text))).toBe(true); expect(g.story.needs).toBe(true);
    expect(markersFor(g)).toEqual([]);
    g = ap(g, { type: 'talk/ask', charId: rook(g).id, npcId: n.id, what: 'objective' });
    expect(npcView(g, n.id)!.knows).toEqual({ objective: 'm1/out', hint: 'The pad is east, past the cradles.' });
    expect(markersFor(g)).toEqual([expect.objectContaining({ kind: 'hint', tile: K('O6'), from: n.id, objective: 'm1/out' })]);
    // Out of reach: refused.
    let far = set(g, (x) => { x.story.positions![rook(x).id] = K('L11'); });
    expect(refused(far, { type: 'talk/ask', charId: rook(far).id, npcId: n.id, what: 'wants' })).toMatch(/within 3 tiles/);
  });
  it('talk approaches: ally (hostile → neutral → ally), inform, hostile, advance; with preview odds', () => {
    let g = keel(); const n = npc(g, 'Keel');
    const opt = talkOptions(g, n.id, rook(g).id).find((o) => o.label === 'Talk him down')!; expect(opt.odds).toBeGreaterThan(0); expect(opt.odds).toBeLessThanOrEqual(1);
    g = ap(g, { type: 'talk/try', charId: rook(g).id, npcId: n.id, idx: 0 }); expect(g.checks.at(-1)!.tags).toContain('dialogue'); g = roll(g, 'success');
    expect(npc(g, 'Keel').side).toBe('neutral');
    g = ap(g, { type: 'talk/try', charId: ash(g).id, npcId: n.id, idx: 0 }, P2); g = roll(g, 'success', P2);
    expect(npc(g, 'Keel').ally).toBe(true); expect(npcView(g, n.id)!.side).toBe('ally');
    g = turn(g, {}); g = ap(g, { type: 'talk/try', charId: rook(g).id, npcId: n.id, idx: 1 }); g = roll(g, 'success');
    expect(npc(g, 'Keel').informed).toBe(true);
    g = ap(g, { type: 'talk/try', charId: rook(g).id, npcId: n.id, idx: 2 }); g = roll(g, 'success'); expect(missionsOf(g)!.objectives.m1.find).toBe('done');
    let h = keel(); h = ap(h, { type: 'talk/try', charId: rook(h).id, npcId: npc(h, 'Keel').id, idx: 0 }); h = roll(h, 'fail'); expect(npc(h, 'Keel').side).toBe('hostile');
    h = keel(); h = set(h, (x) => { npcsOf(x).find((y) => y.name === 'Keel')!.side = 'neutral'; }); h = ap(h, { type: 'talk/try', charId: rook(h).id, npcId: npc(h, 'Keel').id, idx: 0 }); h = roll(h, 'fail'); expect(npc(h, 'Keel').side).toBe('hostile');
  });
});

describe('typing can\'t skip a check (section 9)', () => {
  it('a typed attempt maps to actions[] attempt (1-based index) and the engine rolls it like the button', () => {
    let g = turn(start(), { objects: [{ action: 'place', id: '', kind: 'door', at: 'C2', name: 'Hatch', text: '', locked: true, approaches: [{ label: 'Force it', skills: ['raw_power'], tn: 12, stakes: '', success: 'open' }, { label: 'Pick it', skills: ['ingenuity'], tn: 12, stakes: '', success: 'open' }] }] });
    const o = storyObjects(g).find((x) => x.name === 'Hatch')!;
    g = turn(g, { actions: [{ charId: rook(g).id, act: 'attempt', objId: o.id, index: 2 }] });
    const ck = g.checks.at(-1)!; expect(ck.poi).toMatchObject({ objId: o.id, idx: 1 }); expect(ck.skills).toEqual(['ingenuity']);
    expect(g.story.ap![rook(g).id]).toBe(4);
  });
  it('attempt and ask also reach hazards and people', () => {
    let g = turn(start(), { hazards: [{ action: 'place', kind: 'fire', severity: 'light', tiles: ['C2'] }], npcs: [{ action: 'place', name: 'Pell', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'C3', wants: 'Quiet.' }] });
    const h = g.story.hazards![0];
    g = turn(g, { actions: [{ charId: rook(g).id, act: 'attempt', targetId: h.id, index: 2 }, { charId: rook(g).id, act: 'ask', targetId: npc(g, 'Pell').id, what: 'wants' }] });
    expect(g.checks.at(-1)!.poi).toMatchObject({ objId: h.id, idx: 1, kind: 'hazard' }); expect(['proficiency', 'ingenuity']).toContain(g.checks.at(-1)!.skills[0]);
  });
});

describe('a clear aim (section 8)', () => {
  it('missions[] where sets where an objective happens; markers and the HERE card follow it', () => {
    let g = turn(start(), { objects: [{ action: 'place', id: '', kind: 'terminal', at: 'H6', name: 'Core console', text: '', approaches: [{ label: 'Pull the core', skills: ['proficiency'], tn: 12, stakes: '', success: 'advance', objective: 'find' }] }] });
    const o = storyObjects(g).find((x) => x.name === 'Core console')!;
    expect(hereCard(g).objectives.map((x) => x.key)).toEqual(['m1/find']); // an approach here advances it
    g = turn(g, { missions: [{ mission: 'm1', objective: 'find', where: { zone: 'field', refs: [o.id, 'J9'] } }, { mission: 'm1', objective: 'out', where: { zone: 'yard2', refs: ['A1'] } }] });
    expect(markersFor(g).map((m) => [m.objective, m.tile])).toEqual([['m1/find', K('H6')], ['m1/find', K('J9')]]);
    const card = hereCard(g);
    expect(card.objectives).toEqual([expect.objectContaining({ key: 'm1/find', here: true, zone: 'field', steps: expect.arrayContaining(['Try "Pull the core" on Core console (H6)', 'Go to J9']) })]);
    g = turn(g, { missions: [{ mission: 'm1', objective: 'find', status: 'done' }] });
    expect(hereCard(g).objectives).toEqual([expect.objectContaining({ key: 'm1/out', here: false, zone: 'yard2', zoneName: 'Second yard' })]);
    expect(markersFor(g)).toEqual([]); // its refs are in another zone
  });
  it('markers never point at a hidden token', () => {
    let g = turn(start(), { npcs: [{ action: 'place', name: 'Spy', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'F6', hidden: true }] });
    g = turn(g, { missions: [{ mission: 'm1', objective: 'find', where: { refs: [npc(g, 'Spy').id] } }] });
    expect(markersFor(g, 'pc')).toEqual([]); expect(markersFor(g, 'all').length).toBe(1);
  });
});

describe('the Proving Ground tools (rules 1.7)', () => {
  const pg = () => { let g = newGame('PGW', { id: H, name: 'Host' }, 'pg-w'); g = ap(g, { type: 'char/add', sheet: sheet('Vel') }); return ap(g, { type: 'sandbox/start' }); };
  it('place a cache, a hazard, a trigger, a person with face and talk, and an objective with where; attempts roll at once', () => {
    let g = pg(); const c = Object.values(g.characters)[0], at = positionsOf(g)[c.id], [x, y] = at.split(',').map(Number), R = (dx: number, dy: number) => refOf((x + dx) + ',' + (y + dy));
    g = ap(g, { type: 'sandbox/cache', at: R(1, 0), name: 'Locker', items: [{ item: 'stim_injector', qty: 1 }] });
    g = ap(g, { type: 'sandbox/hazard', kind: 'fire', severity: 'light', tiles: [R(2, 1)] });
    g = ap(g, { type: 'sandbox/npc', name: 'Mallow', at: R(0, 2), kind: 'robot', wants: 'A mechanical arm.', talk: [{ label: 'Promise the arm', skills: ['empathy'], tn: 8, stakes: '', success: 'ally' }] });
    g = ap(g, { type: 'sandbox/trigger', when: 'enter', tiles: [R(3, 0)], then: 'reveal' });
    g = ap(g, { type: 'sandbox/objective', id: 'arm', text: 'Get Mallow an arm', where: { refs: [npc(g, 'Mallow').id] } });
    expect(storyObjects(g).find((o) => o.name === 'Locker')!.items!.length).toBe(1);
    expect(g.story.hazards!.length).toBe(1); expect(npc(g, 'Mallow')).toMatchObject({ kind: 'robot' }); expect(AVATAR_POOLS.robot).toContain(npc(g, 'Mallow').avatar);
    expect(hereCard(g).objectives[0]).toMatchObject({ key: 'drill/arm', here: true }); expect(markersFor(g)[0].tile).toBe(npc(g, 'Mallow').pos);
    g = ap(g, { type: 'talk/try', charId: c.id, npcId: npc(g, 'Mallow').id, idx: 0 });
    expect(g.checks).toEqual([]); expect(npc(g, 'Mallow').talk![0].tries.length).toBe(1); expect(g.story.await).toBe('players');
    g = ap(g, { type: 'world/act', charId: c.id, act: 'search', objId: storyObjects(g).find((o) => o.name === 'Locker')!.id });
    expect(packOf(g.characters[c.id]).some((p) => p.item === 'stim_injector')).toBe(true);
    g = ap(g, { type: 'sandbox/objective', id: 'arm', status: 'done' }); expect(hereCard(g).objectives).toEqual([]);
  });
});

describe('views leak nothing (rules 1.7)', () => {
  it('no hidden hazard, no trigger, no unasked want or hint, no cache contents, no events; the Narrator\'s full state keeps them', () => {
    let g = turn(start(), { hazards: [{ action: 'place', kind: 'minefield', severity: 'heavy', tiles: ['H8'], hidden: true, name: 'Buried charges' }, { action: 'place', kind: 'fire', severity: 'light', tiles: ['C9'] }],
      triggers: [{ when: 'enter', tiles: ['H9'], then: 'spawn', spawn: [{ action: 'place', name: 'Secret squad', side: 'hostile', tier: 'minion', weapon: 'fists', at: 'L2' }] }],
      npcs: [{ action: 'place', name: 'Vox', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'J5', wants: 'Hidden want', knows: { objective: 'find', hint: 'Hidden hint' } }],
      objects: [{ action: 'place', id: '', kind: 'cache', at: 'C5', name: 'Box', text: '', approaches: [], items: [{ item: '', qty: 1, name: 'Hidden loot', text: 'x' }] }] });
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'move', to: 'C8' }); // fire nearby, an event
    for (const pid of [H, P2]) {
      const s = JSON.stringify(viewFor(g, pid));
      for (const secret of ['Buried charges', 'Secret squad', 'Hidden want', 'Hidden hint', 'Hidden loot', '"triggers"', '"events"', 'worldRng']) expect(s).not.toContain(secret);
      expect(viewFor(g, pid).story.hazards!.length).toBe(1);
    }
    expect(g.story.triggers!.length).toBe(1); expect(g.story.hazards!.length).toBe(2);
    // In a fight too: the fight's copy of the hazards is filtered.
    g = turn(g, { combat: { name: 'Fight', difficulty: 'easy', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists', at: 'P11' }] } });
    expect(g.combat!.hazards!.length).toBe(2); expect(JSON.stringify(viewFor(g, P2).combat)).not.toContain('Buried charges');
    expect(hazardsFor(viewFor(g, P2)).map((h) => h.kind)).toEqual(['fire']);
  });
});
