// World Play 1.1 (rules revision 1.8; docs/design/world-play-1.1-spec.md), part A1: piles (one shared container
// module with caches), speed and tactical reloads, pick-up of a selection on every map, where picked things go, fog,
// hidden piles, persistence across fights, zones and saves, the Narrator's ground[] and loot[] ammo, old saves'
// floors, the click-path around revealed hazards, and the write-back bugs fixed on the way.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, type Sheet, type GameState, type Action, type NarratorTurn, type MapObject, type Character, newGame, apply, RuleError, positionsOf, storyObjects, keyOf, zoneMap,
  viewFor, packOf, active, newCharacter, startCombat, reload, reloadHands, pickUp, weaponActions, unitFromEnemy, magsOf, roundsOf, plotItem, WEAPON,
  dropOnTile, lootToPack, magItem, selectEntries, itemLabel, pileEntries, isPile, isCache, PILE, routeHazards, moveUnit, paths, dist, refOf,
} from '../src';

const H = 'host', P2 = 'p2';
const sheet = (name: string, arch = 'sharpshooter'): Sheet => { const a = ARCHETYPES.find((x) => x.id === arch) || ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const sheetFrom = (archId: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === archId)!; return { name: 'Medic', portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const WALL = Array.from({ length: 12 }, (_, i) => 'H' + (i + 1));
const CAMP: any = {
  id: 'wp11', title: 'World Play 1.1 test', short: 'WP', kicker: 'TEST', pitch: ['A field.'], meta: 'Test.', arc: { beginning: 'a', middle: 'b', end: 'c' }, opening: 'Open.', startZone: 'field',
  zones: [
    { id: 'field', name: 'The field', summary: 'Open ground, a wall down the middle.', w: 16, h: 12, solid: WALL, start: ['B2', 'B3', 'B4', 'B5'], enemyStart: ['O2', 'O3', 'O4', 'O5'] },
    { id: 'yard2', name: 'Second yard', summary: 'Another place.', w: 10, h: 10, solid: [], start: ['A1', 'A2'], enemyStart: ['J9'] },
  ],
  missions: [{ id: 'm1', title: 'The core', act: 1, summary: 'Find it.', goal: 'Get the core out.', objectives: [{ id: 'find', text: 'Find the core', done_when: 'Someone holds it.' }] }],
};
const ap = (g: GameState, a: Action, by = H) => apply(g, a, by);
const turn = (g: GameState, t: Partial<NarratorTurn>) => { const x: GameState = JSON.parse(JSON.stringify(g)); x.story.await = 'narrator'; x.story.work = { kind: 'round' }; return apply(x, { type: 'narrator/turn', turn: { narration: 'On.', ...t } as NarratorTurn }, H); };
const refused = (g: GameState, a: Action, by = H) => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const set = (g: GameState, f: (x: GameState) => void) => { const x: GameState = JSON.parse(JSON.stringify(g)); f(x); return x; };
function start(seed = 'wp11-1') {
  let g = newGame('WP11', { id: H, name: 'Host' }, seed);
  g = ap(g, { type: 'player/join', id: P2, name: 'Kim' });
  g = ap(g, { type: 'campaign/load', campaign: CAMP });
  g = ap(g, { type: 'char/add', sheet: sheet('Rook') });
  g = ap(g, { type: 'char/add', sheet: sheet('Ash') }, P2);
  g = ap(g, { type: 'session/start' });
  return apply(g, { type: 'narrator/turn', turn: { narration: 'The field.', sceneTitle: 'The field' } }, H);
}
const rook = (g: GameState) => Object.values(g.characters).find((c) => c.owner === H)!;
const K = (r: string) => keyOf(r, zoneMap(start()))!;
const pileOn = (objs: MapObject[] | undefined, k: string) => (objs || []).find((o) => o.kind === 'pile' && o.pos === k);
const labels = (o?: MapObject) => (o?.items || []).map((e) => e.name);
/** Rook with a pistol in the main hand and a revolver in the off hand (one spare each), and a knife after spare parts. */
const gunslinger = (g: GameState) => set(g, (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 12; c.offHand = { id: 'drifter_revolver' };
  c.pack = [magsOf('service_pistol', 1), magsOf('drifter_revolver', 1), roundsOf('.32 decrkm', 10), { id: 'spare_parts', item: 'spare_parts', name: 'Spare parts', qty: 1, kind: 'tool' }, { id: 'combat_knife', name: 'Combat knife', qty: 1, kind: 'weapon', weapon: 'combat_knife' }]; });
/** A fight on the field with one far-off raider; Rook's turn. */
function fight(g: GameState, map?: string) {
  g = turn(g, { combat: { name: 'Fight', difficulty: 'easy', ...(map ? { map } : {}), enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists', at: map ? 'J9' : 'P11' }] } });
  for (let i = 0; i < 8 && active(g.combat!)!.charId !== rook(g).id; i++) { const u = active(g.combat!)!; g = ap(g, { type: 'combat/end-turn', unitId: u.id }, u.charId === rook(g).id ? H : P2); }
  return g;
}
const me = (g: GameState) => g.combat!.units.find((u) => u.charId === rook(g).id)!;
/** End the fight: every enemy falls, then Rook ends the turn. */
const win = (g: GameState) => { g = set(g, (x) => { for (const u of x.combat!.units) if (u.side === 'foe') { u.dead = true; u.hp = 0; } }); return ap(g, { type: 'combat/end-turn', unitId: me(g).id }); };

describe('the container module (items 671–673)', () => {
  it('one pile per tile: rounds merge by calibre and type, plain things by id, magazines and weapons stay apart', () => {
    const objs: MapObject[] = [];
    dropOnTile(objs, '3,3', [roundsOf('.32 decrkm', 10), magItem('service_pistol', 7), magItem('service_pistol', 0), plotItem('A letter home', 'Unsent.')]);
    dropOnTile(objs, '3,3', [roundsOf('.32 decrkm', 28), plotItem('A letter home', 'Unsent.'), magsOf('service_pistol', 2), { id: 'combat_knife', name: 'Combat knife', qty: 1, kind: 'weapon', weapon: 'combat_knife' }, { id: 'combat_knife', name: 'Combat knife', qty: 1, kind: 'weapon', weapon: 'combat_knife', rarity: 'fine' }]);
    expect(objs.length).toBe(1); expect(objs[0].id).toBe('pile-3-3'); expect(isPile(objs[0])).toBe(true); expect(isCache(objs[0])).toBe(false);
    expect(labels(objs[0])).toEqual(['38 × .32 Decrkm', 'Service pistol magazine 7/12', 'Service pistol magazine 0/12', '2 × A letter home', 'Service pistol magazine 12/12', 'Service pistol magazine 12/12', 'Combat knife', 'Combat knife (fine)']);
    // Keys never repeat; a pick-up names entries by key or index.
    const keys = objs[0].items!.map((e) => e.key); expect(new Set(keys).size).toBe(keys.length);
    expect(selectEntries(objs[0], [keys[1]!, 3]).map((e) => e.name)).toEqual(['Service pistol magazine 7/12', '2 × A letter home']);
    expect(selectEntries(objs[0]).length).toBe(8);
    expect(pileEntries(objs[0])[0]).toMatchObject({ key: keys[0], label: '38 × .32 Decrkm', kind: 'ammo' });
    // Hollow-point rounds are their own stack.
    dropOnTile(objs, '3,3', [{ ...roundsOf('.32 decrkm', 5), ammoType: 'hollow_point' }]); expect(labels(objs[0]).at(-1)).toBe('5 × .32 Decrkm (hollow-point)');
  });
  it('the cap: 24 entries; the oldest empty magazines go first, then the oldest junk; the losses are reported', () => {
    const objs: MapObject[] = [];
    dropOnTile(objs, '1,1', [{ id: 'combat_knife', name: 'Combat knife', qty: 1, kind: 'weapon', weapon: 'combat_knife' }, magItem('service_pistol', 12)]);
    const r = dropOnTile(objs, '1,1', Array.from({ length: 30 }, () => magItem('service_pistol', 0)));
    expect(objs[0].items!.length).toBe(PILE.max_entries); expect(r.lost.length).toBe(8); expect(r.lost[0]).toBe('Service pistol magazine 0/12');
    expect(labels(objs[0]).slice(0, 2)).toEqual(['Combat knife', 'Service pistol magazine 12/12']);
    const r2 = dropOnTile(objs, '1,1', Array.from({ length: 30 }, () => magItem('service_pistol', 3)));
    expect(r2.lost).toContain('Service pistol magazine 12/12'); expect(labels(objs[0])[0]).toBe('Combat knife'); // a weapon outlasts loose junk
  });
  it('the loot shape as pack items: mag:, rounds:, weapons, items and plot items', () => {
    expect(lootToPack({ item: 'mag:service_pistol' })[0].mags).toEqual([12]);
    expect(lootToPack({ item: 'mag:service_pistol', qty: 1 })[0].mags).toEqual([12]);
    expect(lootToPack({ item: 'mag:service_pistol', qty: 5 })[0].mags).toEqual([5]);
    expect(lootToPack({ item: 'mag:service_pistol', qty: 0 })[0].mags).toEqual([0]);
    expect(lootToPack({ item: 'mag:service_pistol', qty: 99 })[0].mags).toEqual([12]);
    expect(lootToPack({ item: 'rounds:rifle', qty: 500 })[0]).toMatchObject({ calibre: 'rifle', qty: PILE.rounds_max });
    expect(lootToPack({ item: 'rounds:.32 Decrkm', qty: 30 })[0]).toMatchObject({ calibre: '.32 decrkm', qty: 30 });
    expect(lootToPack({ item: 'mag:lever_carbine' })[0]).toMatchObject({ calibre: 'rifle', qty: WEAPON.lever_carbine.magazine }); // loaded round by round: its rounds loose
    expect(lootToPack({ item: 'mag:nothing_real', name: 'Odd clip' })[0]).toMatchObject({ kind: 'plot', name: 'Odd clip' });
    expect(lootToPack({ item: 'rounds:pebbles' })[0].kind).toBe('plot');
    expect(lootToPack({ item: 'combat_knife', qty: 5 }).length).toBe(3);
    expect(lootToPack({ item: 'frag_grenade', qty: 2 })[0]).toMatchObject({ qty: 2, kind: 'weapon' });
    expect(itemLabel(magsOf('service_pistol', 2))).toBe('2 × Service pistol magazine (12/12, 12/12)');
  });
});

describe('speed and tactical reloads (items 679, 680)', () => {
  const medic = () => { const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id)); const cb = startCombat('t', 'yard', [{ c }], [], 'easy', { state: 3 }); const u = cb.units[0]; u.ap = 6; return { c, cb, u }; };
  it('a speed reload drops the old magazine into the pile, rounds and type kept; the fresh one sets the loaded type', () => {
    const { cb, u } = medic(); u.ammo = 4; u.ammoType = 'hollow_point';
    expect(reload(cb, u)).toBeNull(); expect(u.ap).toBe(4); expect(u.ammoType).toBeNull();
    const p = pileOn(cb.objects, u.pos)!; expect(labels(p)).toEqual(['Service pistol magazine 4/12 (hollow-point)']); expect(p.items![0].pack!.magTypes).toEqual(['hollow_point']);
    expect(cb.log.at(-1)).toMatch(/reloads and drops the magazine with 4 rounds still in it \(/); // no tile: the pile shows it, under fog
    expect(cb.fx!.some((e) => e.k === 'pile' && e.why === 'drop')).toBe(true);
  });
  it('a tactical reload is +1 AP and puts the old magazine back with the spares, empty or not', () => {
    const { cb, u } = medic(); u.ammo = 5;
    expect(weaponActions(u).find((a) => a.id === 'reload')!.tactical).toEqual({ ap: 3, why: null });
    expect(reload(cb, u, { tactical: true })).toBeNull(); expect(u.ap).toBe(3); expect(u.mags).toEqual([12, 5]); expect(pileOn(cb.objects, u.pos)).toBeUndefined();
    u.ammo = 0; u.ap = 2; expect(reload(cb, u, { tactical: true })).toBe('Needs 3 AP.');
    u.ap = 3; expect(reload(cb, u, { tactical: true })).toBeNull(); expect(u.mags).toEqual([5, 0]);
    // A gun loaded round by round has one reload.
    u.weapon = 'lever_carbine'; u.ammo = 0; u.loose = 10; u.ap = 6; expect(reload(cb, u, { tactical: true })).toMatch(/only one reload/);
    expect(weaponActions(u).find((a) => a.id === 'reload')!.tactical).toBeUndefined();
  });
  it('two guns: the off hand speed-drops even an empty magazine; both guns tactically cost 4 AP', () => {
    const { cb, u } = medic(); u.offWeapon = 'service_pistol'; u.offAmmo = 0; u.mags = [12, 12, 12];
    expect(reloadHands(cb, u, 'off')).toBeNull(); expect(labels(pileOn(cb.objects, u.pos))).toEqual(['Service pistol magazine 0/12']); expect(u.offAmmo).toBe(12);
    u.ap = 6; u.ammo = 3; u.offAmmo = 2; expect(reloadHands(cb, u, 'both', true)).toBeNull(); expect(u.ap).toBe(2);
    expect([...u.mags!].sort((a, b) => a - b)).toEqual([2, 3]); expect(labels(pileOn(cb.objects, u.pos)).length).toBe(1);
  });
  it('enemies speed-reload: their magazines feed the piles', () => {
    const cb = startCombat('t', 'yard', [], [], 'easy', { state: 3 }), e = unitFromEnemy('foe-0', 'Raider', 'soldier', 'service_pistol', '6,6', { state: 4 });
    cb.units.push(e); e.ap = 6; e.ammo = 1;
    expect(reload(cb, e)).toBeNull(); expect(labels(pileOn(cb.objects, '6,6'))).toEqual(['Service pistol magazine 1/12']);
  });
});

describe('picking up in a fight (items 674, 675) and the write-back fixes', () => {
  const rifle = 'hellraiser_service_rifle';
  const stocked = (g: GameState) => set(g, (x) => { const u = me(x); dropOnTile(x.combat!.objects!, u.pos, [magItem('service_pistol', 9), magItem('drifter_revolver', 4), magItem(rifle, 7), roundsOf('.32 decrkm', 20), { id: 'frag_grenade', name: 'Frag grenade', qty: 1, kind: 'weapon', weapon: 'frag_grenade' }, plotItem('A letter home', 'Unsent.')]); });
  it('a selection takes only what is ticked; everything goes where it belongs and survives the end of the fight', () => {
    let g = stocked(fight(gunslinger(start()))); const u0 = me(g), keys = pileOn(g.combat!.objects, u0.pos)!.items!.map((e) => e.key!);
    g = ap(g, { type: 'combat/pickup', unitId: u0.id, tile: refOf(u0.pos), take: [keys[0], keys[5]] });
    let u = me(g); expect(u.ap).toBe(u0.ap - 1); expect(u.mags).toEqual([12, 9]);
    expect(packOf(rook(g)).some((x) => x.kind === 'plot' && x.name === 'A letter home')).toBe(true);
    expect(labels(pileOn(g.combat!.objects, u.pos))).toEqual(['Revolver speedloader 4/6', 'Hellraiser service rifle magazine 7/24', '20 × .32 Decrkm', 'Frag grenade'].map((l) => l.replace('Revolver speedloader', magsOf('drifter_revolver', 0).name)));
    expect(refused(g, { type: 'combat/pickup', unitId: u.id, tile: refOf(u.pos), take: ['nope'] })).toMatch(/None of that/);
    g = ap(g, { type: 'combat/pickup', unitId: u.id, tile: refOf(u.pos) });
    u = me(g); expect(u.offMags).toEqual([6, 4]); expect(u.extra).toEqual([{ weapon: rifle, rounds: 7 }]); expect(u.loose).toBe(30); expect(u.throwables).toEqual({ frag_grenade: 1 });
    expect(pileOn(g.combat!.objects, u.pos)).toBeUndefined(); expect(g.combat!.log.at(-1)).toMatch(/picks up .*20 × \.32 Decrkm/);
    // An old save's off-hand magazine in u.extra is kept too (it used to be overwritten by the off hand's spares).
    g = set(g, (x) => { me(x).extra!.push({ weapon: 'drifter_revolver', rounds: 2 }); });
    g = win(g); expect(g.phase).toBe('story');
    const pack = packOf(rook(g)), mags = (w: string) => pack.find((x) => x.weapon === w && x.mags)!.mags;
    expect(mags('service_pistol')).toEqual([12, 9]); expect(mags('drifter_revolver')).toEqual([6, 4, 2]); expect(mags(rifle)).toEqual([7]);
    expect(pack.filter((x) => x.calibre === '.32 decrkm').reduce((t, x) => t + x.qty, 0)).toBe(30); // picked-up loose rounds aren't clamped away
    expect(pack.find((x) => x.weapon === 'frag_grenade')!.qty).toBe(1);
  });
  it('a magazine for a gun with no spares entry is kept (it used to vanish)', () => {
    let g = fight(set(start(), (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 12; c.pack = []; }));
    g = set(g, (x) => { dropOnTile(x.combat!.objects!, me(x).pos, [magItem('service_pistol', 8)]); });
    g = ap(g, { type: 'combat/pickup', unitId: me(g).id, tile: refOf(me(g).pos) }); g = win(g);
    expect(packOf(rook(g)).find((x) => x.weapon === 'service_pistol' && x.mags)!.mags).toEqual([8]);
  });
  it('a mid-fight swap writes u.extra back once (it used to be written twice)', () => {
    let g = fight(gunslinger(start()));
    g = set(g, (x) => { me(x).extra = [{ weapon: rifle, rounds: 7 }]; });
    g = ap(g, { type: 'combat/swap', unitId: me(g).id, from: 'off' }); expect(me(g).weapon).toBe('drifter_revolver'); expect(me(g).extra).toBeUndefined();
    g = win(g); expect(packOf(rook(g)).find((x) => x.weapon === rifle && x.mags)!.mags).toEqual([7]);
  });
  it('a swap from the pack finds the item the client named, even when the write-back drops a used-up entry first', () => {
    let g = fight(gunslinger(start()));
    g = set(g, (x) => { me(x).parts = 0; }); // the spare parts (index 3) are used up: the knife (index 4) moves up one
    g = ap(g, { type: 'combat/swap', unitId: me(g).id, from: 4 });
    expect(me(g).weapon).toBe('combat_knife'); expect(packOf(rook(g)).some((x) => x.id === 'spare_parts')).toBe(false);
  });
  it('a pick-up: adjacent, seen, a character, 1 AP; Search on a pile takes everything', () => {
    let g = fight(start()); const u = me(g), far = '9,9';
    g = set(g, (x) => { dropOnTile(x.combat!.objects!, far, [magItem('service_pistol', 3)]); dropOnTile(x.combat!.objects!, u.pos, [roundsOf('rifle', 5)], { hidden: true }); });
    expect(refused(g, { type: 'combat/pickup', unitId: u.id, tile: far })).toMatch(/Stand on it or next to it/);
    expect(refused(g, { type: 'combat/pickup', unitId: u.id, tile: u.pos })).toMatch(/Nothing to pick up/); // hidden
    g = set(g, (x) => { pileOn(x.combat!.objects, u.pos)!.hidden = false; me(x).ap = 0; });
    expect(refused(g, { type: 'combat/pickup', unitId: u.id, tile: u.pos })).toMatch(/Needs 1 AP/);
    g = set(g, (x) => { me(x).ap = 6; });
    const id = pileOn(g.combat!.objects, u.pos)!.id;
    g = ap(g, { type: 'combat/search', unitId: u.id, objId: id }); expect(me(g).ap).toBe(5); expect(me(g).loose).toBe(48 + 5);
  });
});

describe('the area map (items 674, 679): the reload keeps its magazine, pick-up, tactical', () => {
  it('a speed reload on the area map drops a real pile; picking it up puts it back in the pack', () => {
    let g = set(start(), (x) => { rook(x).loaded = 5; });
    const at = positionsOf(g)[rook(g).id], spares = () => packOf(rook(g)).find((x) => x.weapon === rook(g).weapon && x.mags)!.mags!;
    expect(spares()).toEqual([24, 24, 24]);
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'reload' });
    expect(spares()).toEqual([24, 24]); expect(rook(g).loaded).toBe(24); expect(labels(pileOn(storyObjects(g), at))).toEqual(['Hellraiser service rifle magazine 5/24']);
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'pickup', tile: refOf(at) });
    expect(spares()).toEqual([24, 24, 5]); expect(pileOn(storyObjects(g), at)).toBeUndefined(); expect(g.story.ap![rook(g).id]).toBe(3);
    expect(g.story.events!.some((e) => e.kind === 'pickup' && /picks up Hellraiser service rifle magazine 5\/24/.test(e.text))).toBe(true);
    // Tactical: +1 AP, the old magazine straight back into the pack.
    g = set(g, (x) => { rook(x).loaded = 3; });
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'reload', tactical: true });
    expect(spares()).toEqual([24, 5, 3]); expect(g.story.ap![rook(g).id]).toBe(0); expect(pileOn(storyObjects(g), at)).toBeUndefined();
  });
  it('anything picked up on the area map lands in the pack at once; a Search on the pile is the same', () => {
    let g = set(start(), (x) => { dropOnTile(storyObjects(x), K('C2'), [plotItem('A Lumeri prayer card', 'Creased.'), roundsOf('rifle', 12)]); });
    const id = pileOn(storyObjects(g), K('C2'))!.id;
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'search', objId: id });
    expect(packOf(rook(g)).some((x) => x.name === 'A Lumeri prayer card')).toBe(true);
    expect(packOf(rook(g)).filter((x) => x.calibre === 'rifle').reduce((t, x) => t + x.qty, 0)).toBe(60);
  });
});

describe('persistence (item 678)', () => {
  it('a fight\'s piles stay on the area map, across travel and a save', () => {
    let g = fight(set(start(), (x) => { rook(x).loaded = 6; }));
    const at = me(g).pos;
    g = ap(g, { type: 'combat/reload', unitId: me(g).id }); expect(labels(pileOn(g.combat!.objects, at))).toEqual(['Hellraiser service rifle magazine 6/24']);
    g = win(g); expect(labels(pileOn(storyObjects(g), at))).toEqual(['Hellraiser service rifle magazine 6/24']);
    g = turn(g, { travel: 'yard2' }); expect(zoneMap(g).id).toBe('yard2'); expect(pileOn(storyObjects(g), at)).toBeUndefined();
    expect(labels(pileOn(g.story.zoneObjects!.field, at))).toEqual(['Hellraiser service rifle magazine 6/24']);
    g = JSON.parse(JSON.stringify(g)); // a save and a load
    g = turn(g, { travel: 'field' }); expect(labels(pileOn(storyObjects(g), at))).toEqual(['Hellraiser service rifle magazine 6/24']);
  });
  it('a fight on another zone\'s map starts from that zone\'s objects and stashes the zone the party was in', () => {
    let g = turn(start(), { ground: [{ at: 'D5', items: [{ item: 'mag:service_pistol', qty: 4 }] }] });
    g = set(g, (x) => { const l: MapObject[] = []; dropOnTile(l, '4,4', [magItem('service_pistol', 2)]); x.story.zoneObjects = { yard2: l }; });
    g = fight(g, 'yard2');
    expect(g.combat!.map.id).toBe('yard2'); expect(labels(pileOn(g.combat!.objects, '4,4'))).toEqual(['Service pistol magazine 2/12']);
    g = win(g); expect(zoneMap(g).id).toBe('yard2');
    expect(labels(pileOn(storyObjects(g), '4,4'))).toEqual(['Service pistol magazine 2/12']);
    expect(labels(pileOn(g.story.zoneObjects!.field, K('D5')))).toEqual(['Service pistol magazine 4/12']);
    g = turn(g, { travel: 'field' }); expect(labels(pileOn(storyObjects(g), K('D5')))).toEqual(['Service pistol magazine 4/12']);
  });
  it('an old save\'s floor becomes piles once', () => {
    let g = fight(start()); const at = me(g).pos;
    g = set(g, (x) => { x.combat!.floor = [{ pos: at, text: 'magazine with 5 rounds', weapon: 'hellraiser_service_rifle', rounds: 5 }, { pos: at, text: 'junk' }]; });
    g = ap(g, { type: 'combat/prone', unitId: me(g).id });
    expect(g.combat!.floor).toBeUndefined(); expect(labels(pileOn(g.combat!.objects, at))).toEqual(['Hellraiser service rifle magazine 5/24']);
  });
});

describe('fog and hidden piles (items 676, 677)', () => {
  it('a player sees a pile only on a tile the party sees now, with what is in it; the host\'s state keeps every pile', () => {
    let g = turn(start(), { ground: [{ at: 'D2', items: [{ item: 'rounds:rifle', qty: 30 }] }, { at: 'L2', items: [{ item: 'mag:service_pistol' }] }], objects: [{ action: 'place', id: '', kind: 'cache', at: 'E5', name: 'Crate', text: 'A crate.', approaches: [], items: [{ item: 'stim', qty: 1 }] }] });
    expect(storyObjects(g).filter(isPile).length).toBe(2);
    const v = viewFor(g, P2), seen = (v.story.objects || []).filter(isPile);
    expect(seen.map((o) => o.pos)).toEqual([K('D2')]); expect(labels(seen[0])).toEqual(['30 × Rifle rounds']); // open: its contents show
    expect((v.story.objects || []).find((o) => o.kind === 'cache')!.items).toEqual([]); // a cache stays closed
    // Standing past the wall, L2 is in sight.
    const v2 = viewFor(set(g, (x) => { positionsOf(x)[rook(x).id] = K('K2'); }), P2);
    expect((v2.story.objects || []).filter(isPile).map((o) => o.pos).sort()).toEqual([K('D2'), K('L2')].sort());
    // In another zone, the field's piles are in nobody's view.
    const t = turn(g, { travel: 'yard2' }); expect(viewFor(t, H).story.zoneObjects!.field.some(isPile)).toBe(false); expect(t.story.zoneObjects!.field.some(isPile)).toBe(true);
  });
  it('in a fight the party\'s sight decides too', () => {
    let g = turn(start(), { ground: [{ at: 'L2', items: [{ item: 'mag:service_pistol' }] }, { at: 'C3', items: [{ item: 'mag:service_pistol', qty: 3 }] }] });
    g = fight(g);
    expect((viewFor(g, H).combat!.objects || []).filter(isPile).map((o) => o.pos)).toEqual([K('C3')]);
  });
  it('a hidden pile: not in any view until spotted by passive Vigilant within 2 tiles; a drop onto it reveals it', () => {
    let g = turn(start(), { ground: [{ at: 'F2', items: [{ item: 'combat_knife', name: 'A bone-handled knife' }], hidden: true }] });
    expect(pileOn(storyObjects(g), K('F2'))!.hidden).toBe(true); expect(JSON.stringify(viewFor(g, H))).not.toMatch(/bone-handled/);
    // The Narrator adding to it keeps it hidden; hidden: false reveals it.
    const g2 = turn(g, { ground: [{ at: 'F2', items: [{ item: 'rounds:rifle', qty: 5 }] }] }); expect(pileOn(storyObjects(g2), K('F2'))!.hidden).toBe(true);
    expect(pileOn(storyObjects(turn(g, { ground: [{ at: 'F2', items: [{ item: 'rounds:rifle' }], hidden: false }] })), K('F2'))!.hidden).toBe(false);
    // A sharp eye spots it from 2 tiles; a dull one doesn't.
    const sharp = ap(set(g, (x) => { rook(x).skills.vigilant = 4; }), { type: 'world/act', charId: rook(g).id, act: 'move', to: 'D2' });
    expect(pileOn(storyObjects(sharp), K('F2'))!.hidden).toBe(false); expect(sharp.story.entries.map((e) => e.text).join('\n')).toMatch(/spots something on the ground at F2/);
    const dull = ap(set(g, (x) => { rook(x).skills.vigilant = 0; }), { type: 'world/act', charId: rook(g).id, act: 'move', to: 'D2' });
    expect(pileOn(storyObjects(dull), K('F2'))!.hidden).toBe(true);
    // A reload drop onto the tile reveals it.
    const objs = JSON.parse(JSON.stringify(storyObjects(g))); dropOnTile(objs, K('F2'), [magItem('service_pistol', 0)]); expect(pileOn(objs, K('F2'))!.hidden).toBe(false);
  });
});

describe('the Narrator: ground[], objects[] piles and loot[] ammo (items 681, 682)', () => {
  it('ground[]: at most 6 entries a turn and 12 items each; bad tiles do nothing; objects[] kind pile is a ground entry', () => {
    const many = Array.from({ length: 9 }, (_, i) => ({ at: 'J' + (i + 1), items: [{ item: 'mag:service_pistol' }] }));
    let g = turn(start(), { ground: [...many, { at: 'H3', items: [{ item: 'stim' }] }] });
    expect(storyObjects(g).filter(isPile).length).toBe(PILE.narrator_entries_per_turn);
    g = turn(start(), { ground: [{ at: 'H3', items: [{ item: 'stim' }] }, { at: 'Z99', items: [{ item: 'stim' }] }, { at: 'C9', items: Array.from({ length: 20 }, (_, i) => ({ item: 'plot', name: 'Note ' + i })) }] });
    expect(storyObjects(g).filter(isPile).map((o) => o.pos)).toEqual([K('C9')]); expect(pileOn(storyObjects(g), K('C9'))!.items!.length).toBe(PILE.narrator_items_per_pile);
    g = turn(start(), { objects: [{ action: 'place', id: '', kind: 'pile', at: 'C8', name: 'Pile', text: '', approaches: [], items: [{ item: 'rounds:rifle', qty: 15 }] }] });
    expect(labels(pileOn(storyObjects(g), K('C8')))).toEqual(['15 × Rifle rounds']);
  });
  it('loot[] gives magazines and rounds by id', () => {
    const g = turn(start(), { loot: [{ charId: rook(start()).id, item: 'mag:hellraiser_service_rifle', qty: 10 }, { charId: rook(start()).id, item: 'rounds:rifle', qty: 30 }, { charId: rook(start()).id, item: 'mag:service_pistol', qty: 1 }] });
    const pack = packOf(rook(g));
    expect(pack.find((x) => x.weapon === 'hellraiser_service_rifle' && x.mags)!.mags).toEqual([24, 24, 24, 10]);
    expect(pack.filter((x) => x.calibre === 'rifle').reduce((t, x) => t + x.qty, 0)).toBe(78);
    expect(pack.find((x) => x.weapon === 'service_pistol' && x.mags)!.mags).toEqual([12]);
    expect(g.story.entries.map((e) => e.text).join('\n')).toMatch(/Rook gets Hellraiser service rifle magazine 10\/24\./);
  });
});

describe('click-paths and revealed hazards (item 683)', () => {
  const hz = (g: GameState, tiles: string[], extra: any = {}) => turn(g, { hazards: [{ action: 'place', kind: 'fire', severity: 'light', tiles, ...extra }] });
  it('a player\'s move goes around a revealed hazard when the detour is at most 2 tiles; the preview lists what a route crosses', () => {
    let g = hz(start(), ['D2']); const hp0 = rook(g).hp;
    g = ap(g, { type: 'world/act', charId: rook(g).id, act: 'move', to: 'F2' });
    expect(positionsOf(g)[rook(g).id]).toBe(K('F2')); expect(rook(g).hp).toBe(hp0); expect(g.story.trail![rook(g).id]).not.toContain(K('D2'));
    const plain = ap(start(), { type: 'world/act', charId: rook(g).id, act: 'move', to: 'F2' });
    expect(g.story.ap![rook(g).id]).toBe(plain.story.ap![rook(g).id]); // the detour costs what the straight walk would
  });
  it('no detour within 2 tiles: the shortest path, and the preview names the hazard tiles', () => {
    // Fire from C1 to C11: the way round (through C12) is far longer than the straight line.
    let g = fight(hz(start(), [], { rect: { from: 'C1', to: 'C11' } }));
    const cb = g.combat!, u = me(g), r = routeHazards(cb, u, K('E2'))!;
    expect(r.crosses.map((c) => c.ref)).toEqual(['C2']); expect(r.crosses[0]).toMatchObject({ kind: 'fire' }); expect(r.tiles).toBe(paths(cb, u.pos, u.id).dist[K('E2')]);
    // A destination on the hazard is fine; a detour that is short enough is taken.
    let h = fight(hz(start(), ['C2', 'C3']));
    const r2 = routeHazards(h.combat!, me(h), K('E2'))!; expect(r2.crosses).toEqual([]); expect(r2.route).not.toContain(K('C2'));
    expect(dist(me(h).pos, K('E2'))).toBe(3); expect(r2.tiles).toBe(3);
  });
  it('hidden hazards and enemies keep the plain shortest path', () => {
    const g = fight(turn(start(), { hazards: [{ action: 'place', kind: 'minefield', severity: 'light', tiles: ['D2'], hidden: true }] }));
    expect(routeHazards(g.combat!, me(g), K('F2'))!.crosses).toEqual([]);
    // An enemy walks straight through a revealed fire.
    const f = fight(hz(start(), ['D7'])), cb = JSON.parse(JSON.stringify(f.combat!)), foe = cb.units.find((x: any) => x.side === 'foe');
    foe.pos = K('B7'); foe.ap = 9; foe.movement = 6; for (const x of cb.units) if (x !== foe && /,6$/.test(x.pos)) x.pos = K('A12');
    expect(moveUnit(cb, foe, K('F7'), { state: 5 })).toBeNull(); expect(cb.fx.some((e: any) => e.k === 'hazard' && e.target === foe.id)).toBe(true);
  });
});

// Keep the character type in use (the helper above returns characters by owner).
void ((c: Character) => c);
