// World Play 1.1 (rules revision 1.9), part A3: drop tables (docs/design/world-play-1.1-spec.md section 4; spec 14
// items 691–700). The engine rolls every drop on the fight's dice, once per death, into the pile on the death tile:
// the weapon worn and the leftover magazines always, rolled things capped a fight, a boss's notable thing, and three
// layers of tables (the engine's, the campaign's, the Narrator's), the most specific winning.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, type Sheet, type GameState, type Action, type NarratorTurn, type MapObject, type Combat, type Unit, newGame, apply, newCharacter, startCombat, noteDeaths, active,
  WEAPON, maxDurOf, refOf, keyOf, storyObjects, packOf, viewFor, npcsOf, combatReport, validateCampaign, BUILT_IN_CAMPAIGNS,
  LOOT, LOOT_TABLES, cleanDrops, rollDeathDrops, alwaysDrops, defaultTable,
} from '../src';

const H = 'host';
const sheetOf = (name: string, arch = 'sharpshooter'): Sheet => { const a = ARCHETYPES.find((x) => x.id === arch)!; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const pileOn = (objs: MapObject[] | undefined, k: string) => (objs || []).find((o) => o.kind === 'pile' && o.pos === k);
const labels = (o?: MapObject) => (o?.items || []).map((e) => e.name);
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));

/** A bare fight on the yard: one character and these foes, on a known seed. */
function bare(foes: any[], difficulty = 'standard', seed = 7) {
  const c = newCharacter('c1', 'p1', sheetOf('Rook')), rng = { state: seed };
  const cb = startCombat('Drill', 'yard', [{ c }], foes, difficulty, rng);
  return { c, cb, rng, foes: cb.units.filter((u) => u.side === 'foe') };
}
const kill = (cb: Combat, u: Unit, rng: { state: number }) => { u.dead = true; u.hp = 0; noteDeaths(cb, rng); };

describe('the data (items 691–696)', () => {
  it('every kind has a table, the boss table always drops, the caps follow the difficulty', () => {
    expect(LOOT.caps).toEqual({ easy: 2, standard: 3, hard: 4, boss: 5 });
    expect(LOOT.worn_durability).toEqual({ min: 0.4, max: 0.8 });
    for (const k of ['human', 'robot', 'crawler', 'ork', 'upper_realm', 'cursed', 'beast', 'machine', 'turret', 'celestial', 'drone']) expect(LOOT_TABLES[LOOT.kind_tables[k]], k).toBeTruthy();
    expect(LOOT_TABLES.notable.none).toBe(0); expect(LOOT_TABLES.beast.entries).toEqual([]);
    expect(LOOT.personal_items.length).toBe(20);
    expect(LOOT.personal_items.map((p) => p.name)).toEqual(expect.arrayContaining(['a ration tin with a Wick sticker', 'a letter home, unsent', 'a Lumeri prayer card']));
  });
});

describe('always-drops (item 694)', () => {
  it('the weapon worn (40–80% durability, its rounds in it) and the 2 fullest spare magazines with rounds', () => {
    const { cb, rng, foes } = bare([{ name: 'Gunner', tier: 'soldier', weapon: 'service_pistol', drops: {} }]);
    const u = foes[0]; u.ammo = 9; u.mags = [12, 0, 5, 7]; u.magTypes = [null, null, null, 'hollow_point'];
    kill(cb, u, rng);
    const p = pileOn(cb.objects, u.pos)!;
    expect(labels(p)).toEqual([expect.stringMatching(/^Service pistol \(\.32 Decrkm\) · \d+\/12 loaded · worn \d+%$/), 'Service pistol magazine 12/12', 'Service pistol magazine 7/12 (hollow-point)']);
    const gun = p.items![0].pack!, max = maxDurOf('service_pistol');
    expect(gun.loaded).toBe(9); expect(gun.dur!).toBeGreaterThanOrEqual(Math.round(max * 0.4)); expect(gun.dur!).toBeLessThanOrEqual(Math.round(max * 0.8));
    expect(cb.log.at(-1)).toBe('Gunner drops: Service pistol (worn), magazine 12/12, magazine 7/12.');
    expect(cb.fx!.some((e) => e.k === 'pile' && e.why === 'death')).toBe(true);
  });
  it('a gun loaded round by round drops its loose rounds (at most two loads); natural weapons drop nothing', () => {
    const { cb, rng, foes } = bare([{ name: 'Hunter', tier: 'soldier', weapon: 'lever_carbine', drops: {} }, { name: 'Brawler', tier: 'minion', weapon: 'fists', drops: {} }, { name: 'Hound', tier: 'minion', weapon: 'beast_bite', kind: 'beast' }]);
    foes[0].loose = 40;
    expect(alwaysDrops({ state: 1 }, foes[0]).map((x) => x.calibre ? x.qty + ' ' + x.calibre : x.id)).toEqual(['lever_carbine', 2 * WEAPON.lever_carbine.magazine! + ' rifle']);
    const logs = cb.log.length;
    kill(cb, foes[1], rng); kill(cb, foes[2], rng);
    expect(pileOn(cb.objects, foes[1].pos)).toBeUndefined(); expect(pileOn(cb.objects, foes[2].pos)).toBeUndefined();
    expect(cb.log.slice(logs).some((l) => / drops: /.test(l))).toBe(false); // nothing at all: no line
  });
});

describe('rolling: determinism, the cap, the boss (items 692, 695, 696, 699)', () => {
  it('the same seed gives the same drops; another seed may not', () => {
    const run = (seed: number) => { const { cb, rng, foes } = bare([{ name: 'Clerk', tier: 'elite', weapon: 'service_pistol' }, { name: 'Unit 7', tier: 'elite', weapon: 'service_pistol', kind: 'robot' }], 'boss', seed); for (const u of foes) kill(cb, u, rng); return JSON.stringify((cb.objects || []).filter((o) => o.kind === 'pile').map((o) => labels(o))); };
    expect(run(11)).toBe(run(11));
    const all = new Set(Array.from({ length: 12 }, (_, i) => run(100 + i))); expect(all.size).toBeGreaterThan(1);
  });
  it('each death rolls exactly once, whichever sweep sees it first', () => {
    const { cb, rng, foes } = bare([{ name: 'Gunner', tier: 'soldier', weapon: 'service_pistol' }]);
    kill(cb, foes[0], rng); const once = clone(cb.objects);
    noteDeaths(cb, rng); noteDeaths(cb, rng); expect(cb.objects).toEqual(once);
  });
  it('rolled items stop at the cap (easy 2); the rest go to the host-only log; certain items and always-drops are outside it', () => {
    const t = { id: 'rations', none: 0, entries: [{ item: 'ration_pack', weight: 1 }] };
    const { cb, rng, foes } = bare(Array.from({ length: 4 }, (_, i) => ({ name: 'Raider ' + (i + 1), tier: 'minion', weapon: 'fists', drops: { table: 'rations' } })), 'easy');
    cb.lootTables = [t];
    for (const u of foes) kill(cb, u, rng);
    const dropped = foes.filter((u) => pileOn(cb.objects, u.pos));
    expect(dropped.map((u) => u.name)).toEqual(['Raider 1', 'Raider 2']); expect(cb.lootRolled).toBe(2);
    expect(cb.lootLog!.length).toBe(2); expect(cb.lootLog![0]).toMatch(/^Loot cap reached \(2 a easy fight\): Raider 3's Ration pack not dropped\./);
    // A certain item is given, not rolled.
    const x = bare([{ name: 'Courier', tier: 'minion', weapon: 'service_pistol', drops: { items: [{ item: 'city_id' }] } }], 'easy'); x.cb.lootRolled = 99;
    kill(x.cb, x.foes[0], x.rng); expect(labels(pileOn(x.cb.objects, x.foes[0].pos))).toEqual([expect.stringMatching(/^Service pistol \(\.32 Decrkm\) · \d+\/12 loaded · worn \d+%$/), 'Service pistol magazine 12/12', 'Central City ID']);
  });
  it('a boss always drops one notable thing, outside the cap and whatever its drops say', () => {
    const { cb, rng, foes } = bare([{ name: 'The Warden', tier: 'boss', weapon: 'fists', drops: {} }], 'boss'); cb.lootRolled = 99;
    kill(cb, foes[0], rng);
    const p = pileOn(cb.objects, foes[0].pos)!; expect(p.items!.length).toBe(1);
    const ids = LOOT_TABLES.notable.entries.map((e) => e.item); expect(ids).toContain(p.items![0].pack!.weapon || p.items![0].pack!.item || p.items![0].pack!.id);
  });
  it('the default table follows the kind, a caster rolls the caster table, and rolls follow the tier', () => {
    const { foes } = bare([{ name: 'Clerk', tier: 'minion', weapon: 'fists' }, { name: 'Drone', tier: 'minion', weapon: 'fists', kind: 'drone' }, { name: 'Hound', tier: 'minion', weapon: 'beast_bite', kind: 'beast' }, { name: 'Adept', tier: 'soldier', weapon: 'combat_knife', caster: 'sigil_adept' }]);
    expect(foes.map(defaultTable)).toEqual(['person', 'machine', 'beast', 'caster']);
    expect(LOOT.rolls_by_tier).toEqual({ minion: 1, soldier: 1, elite: 2, boss: 2 });
    // A machine's roll is parts or cores, never a personal effect.
    for (let s = 1; s <= 30; s++) { const x = bare([{ name: 'Unit', tier: 'elite', weapon: 'fists', kind: 'robot' }], 'boss', s); kill(x.cb, x.foes[0], x.rng); for (const e of pileOn(x.cb.objects, x.foes[0].pos)?.items || []) expect(['spare_parts', 'standard_core']).toContain(e.pack!.item || e.pack!.id); }
    // A person's personal effect is one of the 20, a plot item.
    let seen = 0; for (let s = 1; s <= 60 && !seen; s++) { const x = bare([{ name: 'Clerk', tier: 'elite', weapon: 'fists' }], 'boss', s); kill(x.cb, x.foes[0], x.rng); for (const e of pileOn(x.cb.objects, x.foes[0].pos)?.items || []) if (e.pack!.kind === 'plot') { expect(LOOT.personal_items.map((p) => p.name)).toContain(e.pack!.name); seen++; } }
    expect(seen).toBeGreaterThan(0);
  });
  it('nothing from the surrendered, companions, a player\'s fighter or a Twin; the area map rolls nothing', () => {
    const { cb, rng, foes } = bare(Array.from({ length: 4 }, (_, i) => ({ name: 'Foe ' + i, tier: 'soldier', weapon: 'service_pistol' })));
    foes[0].surrendered = true; foes[1].companion = 'drone'; foes[2].charId = 'cX'; foes[3].tags = ['twin'];
    for (const u of foes) kill(cb, u, rng);
    expect((cb.objects || []).some((o) => o.kind === 'pile')).toBe(false);
    const x = bare([{ name: 'Lurker', tier: 'soldier', weapon: 'service_pistol' }]); x.cb.overworld = true; kill(x.cb, x.foes[0], x.rng);
    expect(pileOn(x.cb.objects, x.foes[0].pos)).toBeUndefined();
    expect(rollDeathDrops(x.cb, x.rng, { ...x.foes[0], side: 'pc' } as Unit)).toEqual([]);
  });
});

describe('the Narrator\'s inline drops (item 698)', () => {
  it('at most 4 entries, cleaned; an unknown table alone leaves the layer under it; {} means nothing rolled', () => {
    const d = cleanDrops({ items: [{ item: 'flare', qty: 99 }, { item: 'ration_pack', qty: [3, 1], chance: 7 }, { item: 'mag:service_pistol', qty: 5 }, { item: 'a strange key', name: 'Strange key' }, { item: 'cigarettes' }, { item: 'torch' }], table: 'nope' })!;
    expect(d.items!.map((e) => e.item)).toEqual(['flare', 'ration_pack', 'mag:service_pistol', 'a strange key']);
    expect(d.items![0].qty).toBe(20); expect(d.items![1]).toMatchObject({ qty: [1, 3], chance: 1 }); expect(d.table).toBeUndefined();
    expect(cleanDrops({ table: 'nope' })).toBeUndefined();
    expect(cleanDrops({})).toEqual({}); expect(cleanDrops('loot')).toBeUndefined();
    expect(cleanDrops({ table: 'machine' })).toEqual({ table: 'machine' });
    expect(cleanDrops({ table: 'own' }, { tables: [{ id: 'own', entries: [] }] })).toEqual({ table: 'own' });
  });
  it('a plot item written the loot[] way (item "", a name and a line) is kept and drops as that plot item; no name, no entry', () => {
    const d = cleanDrops({ items: [{ item: '', qty: 1, name: 'A sealed letter', text: 'For the Warden.' }, { item: '', qty: 1 }] })!;
    expect(d.items).toEqual([{ item: '', qty: 1, name: 'A sealed letter', text: 'For the Warden.' }]);
    const { cb, rng, foes } = bare([{ name: 'Courier', tier: 'soldier', weapon: 'fists', drops: d }]);
    kill(cb, foes[0], rng);
    expect(labels(pileOn(cb.objects, foes[0].pos))).toContain('A sealed letter');
  });
});

// ---------- the layers through the game ----------
const CAMP: any = {
  id: 'loot1', title: 'Loot test', short: 'LT', kicker: 'TEST', pitch: ['A yard.'], meta: 'Test.', arc: { beginning: 'a', middle: 'b', end: 'c' }, opening: 'Open.', startZone: 'yard1',
  loot_tables: [{ id: 'person', none: 0, entries: [{ item: 'cigarettes', weight: 1 }] }, { id: 'trophies', none: 0, entries: [{ item: 'a hound tooth', name: 'Hound tooth', weight: 1 }] }],
  encounters: [{ name: 'Ambush at the gate', zone: 'yard1', when: 'At the gate.', difficulty: 'standard', enemies: [{ name: 'Gate guard', tier: 'soldier', weapon: 'service_pistol', drops: { items: [{ item: 'flare' }] } }, { name: 'Gate gunner', tier: 'soldier', weapon: 'service_pistol', drops: { items: [{ item: 'torch' }] } }] }],
  zones: [{ id: 'yard1', name: 'The yard', summary: 'Open ground.', w: 14, h: 10, start: ['B2', 'B3'], enemyStart: ['M2', 'M3', 'M4', 'M5', 'M6', 'M7', 'M8', 'M9'],
    npcs: [{ name: 'Sergeant Vey', side: 'hostile', tier: 'elite', weapon: 'service_pistol', at: 'L8', drops: { items: [{ item: 'bank_card' }] } }] }],
};
const ap = (g: GameState, a: Action, by = H) => apply(g, a, by);
const turn = (g: GameState, t: Partial<NarratorTurn>) => { const x: GameState = clone(g); x.story.await = 'narrator'; x.story.work = { kind: 'round' }; return apply(x, { type: 'narrator/turn', turn: { narration: 'On.', ...t } as NarratorTurn }, H); };
function game(camp = CAMP) {
  let g = newGame('LOOT', { id: H, name: 'Host' }, 'loot-seed');
  g = ap(g, { type: 'campaign/load', campaign: camp });
  g = ap(g, { type: 'char/add', sheet: sheetOf('Rook') });
  g = ap(g, { type: 'session/start' });
  return apply(g, { type: 'narrator/turn', turn: { narration: 'The yard.', sceneTitle: 'The yard' } }, H);
}
const foe = (g: GameState, name: string) => g.combat!.units.find((u) => u.side === 'foe' && u.name === name)!;

describe('three layers, the most specific winning (item 691)', () => {
  it('the Narrator\'s drops beat the encounter\'s; the encounter\'s and a person\'s own beat the engine\'s; campaign tables replace the engine\'s', () => {
    expect(validateCampaign(CAMP)).toEqual([]);
    const g = turn(game(), { combat: { name: 'Ambush at the gate', enemies: [
      { name: 'Gate guard', tier: 'soldier', weapon: 'service_pistol' },
      { name: 'Gate gunner', tier: 'soldier', weapon: 'service_pistol', drops: { items: [{ item: 'cigarettes' }, { item: 'flare' }, { item: 'torch' }, { item: 'ration_pack' }, { item: 'stim_injector' }] } } as any,
      { name: 'Sergeant Vey', tier: 'elite', weapon: 'service_pistol' },
      { name: 'Drifter', tier: 'minion', weapon: 'fists' },
    ] } });
    expect(foe(g, 'Gate guard').drops).toEqual({ items: [{ item: 'flare' }] }); // the encounter's (campaign)
    expect(foe(g, 'Gate gunner').drops!.items!.map((e) => e.item)).toEqual(['cigarettes', 'flare', 'torch', 'ration_pack']); // the Narrator's, 4 at most
    expect(foe(g, 'Sergeant Vey').drops).toEqual({ items: [{ item: 'bank_card' }] }); // the zone person's own
    expect(foe(g, 'Drifter').drops).toBeUndefined(); // the default for its kind, from the campaign's own person table
    expect(g.combat!.lootTables!.map((t) => t.id)).toEqual(['person', 'trophies']);
    // Players never see a drops value or the campaign's tables.
    const v = viewFor(g, H); expect(v.combat!.units.some((u) => u.drops)).toBe(false); expect(v.combat!.lootTables).toBeUndefined();
    // The Drifter rolls the campaign's person table: cigarettes, not the engine's list.
    const x = clone(g), d = foe(x, 'Drifter'); d.dead = true; d.hp = 0; noteDeaths(x.combat!, x.rng);
    expect(labels(pileOn(x.combat!.objects, d.pos))).toEqual(['Pack of cigarettes']);
    expect(x.combat!.log.at(-1)).toBe('Drifter drops: Pack of cigarettes.');
  });
  it('the Narrator\'s npcs[] drops: placed, updated, cleared; a survivor keeps them; never in a view', () => {
    let g = turn(game(), { npcs: [{ action: 'place', name: 'Fence', side: 'neutral', tier: 'minion', weapon: 'fists', at: 'F5', drops: { table: 'trophies' } }] });
    const id = npcsOf(g).find((n) => n.name === 'Fence')!.id;
    expect(npcsOf(g).find((n) => n.id === id)!.drops).toEqual({ table: 'trophies' });
    expect(viewFor(g, H).story.npcs!.some((n) => n.drops)).toBe(false);
    g = turn(g, { npcs: [{ action: 'update', id, drops: { items: [{ item: 'city_id' }] } }] }); expect(npcsOf(g).find((n) => n.id === id)!.drops).toEqual({ items: [{ item: 'city_id' }] });
    g = turn(g, { npcs: [{ action: 'update', id, drops: null }] }); expect(npcsOf(g).find((n) => n.id === id)!.drops).toBeUndefined();
    // A hostile who walks away from a fight keeps its drops on its token.
    g = turn(g, { combat: { name: 'Scuffle', difficulty: 'easy', enemies: [{ name: 'Runner', tier: 'minion', weapon: 'fists', drops: { items: [{ item: 'flare' }] } } as any] } });
    g = clone(g); for (const u of g.combat!.units) if (u.side === 'pc') { u.dead = true; u.hp = 0; }
    g = ap(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id });
    expect(g.phase).toBe('story'); expect(npcsOf(g).find((n) => n.name === 'Runner')?.drops).toEqual({ items: [{ item: 'flare' }] });
  });
  it('a trigger\'s spawn and an attack from the area map carry the people\'s drops into the fight', () => {
    let g = turn(game(), { triggers: [{ when: 'enter', rect: { from: 'E1', to: 'E10' }, then: 'fight', name: 'The ditch', spawn: [{ action: 'place', name: 'Ambusher', side: 'hostile', tier: 'minion', weapon: 'fists', at: 'J3', drops: { items: [{ item: 'flare' }] } }] }] });
    g = ap(g, { type: 'world/act', charId: Object.keys(g.characters)[0], act: 'move', to: 'G2' });
    expect(g.phase).toBe('combat'); expect(foe(g, 'Ambusher').drops).toEqual({ items: [{ item: 'flare' }] });
    // An attack from the area map opens the fight on the tokens as they are.
    let h = turn(game(), { npcs: [{ action: 'place', name: 'Lookout', side: 'hostile', tier: 'minion', weapon: 'fists', at: 'E3', drops: { items: [{ item: 'torch' }] } }] });
    const n = npcsOf(h).find((x) => x.name === 'Lookout')!;
    h = ap(h, { type: 'world/act', charId: Object.keys(h.characters)[0], act: 'attack', targetId: n.id, mode: 'shot' } as any);
    expect(h.phase).toBe('combat'); expect(foe(h, 'Lookout').drops).toEqual({ items: [{ item: 'torch' }] }); expect(foe(h, 'Sergeant Vey').drops).toEqual({ items: [{ item: 'bank_card' }] });
  });
  it('a death in a fight lands its drops on the death tile, survives to the area map, and the report tells the Narrator', () => {
    let g = turn(game(), { combat: { name: 'Ambush at the gate', difficulty: 'easy', enemies: [{ name: 'Gate guard', tier: 'soldier', weapon: 'service_pistol' }] } });
    g = clone(g); const vey = foe(g, 'Sergeant Vey'), guard = foe(g, 'Gate guard'), at = guard.pos;
    for (const u of [vey, guard]) { u.dead = true; u.hp = 0; }
    for (let i = 0; i < 10 && g.phase === 'combat'; i++) { const u = active(g.combat!)!; g = ap(g, { type: 'combat/end-turn', unitId: u.id }); }
    expect(g.phase).toBe('story');
    expect(labels(pileOn(storyObjects(g), at))).toEqual([expect.stringMatching(/^Service pistol \(\.32 Decrkm\) · \d+\/12 loaded · worn \d+%$/), 'Service pistol magazine 12/12', 'Service pistol magazine 12/12', 'Flare']);
    expect(combatReport(g.combat!)).toMatch(/Gate guard drops: Service pistol \(worn\), magazine 12\/12, magazine 12\/12, Flare\./);
  });
});

describe('campaign validation (item 698)', () => {
  it('built-in campaigns still validate', () => { for (const c of BUILT_IN_CAMPAIGNS) expect(validateCampaign(c), c.id).toEqual([]); });
  it('names what is wrong with tables and drops', () => {
    const bad = clone(CAMP);
    bad.loot_tables = [{ id: 'junk', entries: [{ item: 'flare', weight: 0 }, { item: 'nonsense_thing', weight: 1 }, { item: 'cigarettes', weight: 1, qty: 40 }, { item: 'service_pistol', weight: 1, rarity: 'shiny' }] }, { id: 'empty', entries: [] }, { entries: [] }];
    bad.zones[0].npcs[0].drops = { table: 'missing', items: [{ item: 'flare', chance: 2 }] };
    bad.encounters[0].enemies[0].drops = 'lots';
    const errs = validateCampaign(bad);
    for (const m of [/junk" "flare": a table entry needs a weight above 0/, /junk" "nonsense_thing": unknown item id \(give it a name/, /junk" "cigarettes": qty must be/, /junk" "service_pistol": unknown rarity "shiny"/,
      /"empty": an empty table needs a weight for nothing/, /Every loot table needs an id/, /npc "Sergeant Vey": drops name unknown loot table "missing"/, /npc "Sergeant Vey" drops "flare": chance must be between 0 and 1/,
      /Encounter "Ambush at the gate": enemy "Gate guard": drops must be/]) expect(errs.some((e) => m.test(e)), String(m)).toBe(true);
  });
});

describe('the Proving Ground: a wave drops ammo a ranger can pick up', () => {
  it('a drill unit shot down leaves its magazines; after the wave the ranger picks them up into the pack', () => {
    let g = newGame('PROVE', { id: H, name: 'Host' }, 'loot-proving');
    g = ap(g, { type: 'char/add', sheet: sheetOf('Vel') });
    g = ap(g, { type: 'sandbox/start' }); g = ap(g, { type: 'sandbox/fight' });
    g = clone(g);
    const cb = g.combat!, me = cb.units.find((u) => u.charId)!, gun = me.weapon, cap = WEAPON[gun].magazine!;
    const foes = cb.units.filter((u) => u.side === 'foe'), first = foes[0];
    // The drill unit carries the ranger's own gun, stands next to the ranger, and falls with the rest of the wave.
    const [x, y] = me.pos.split(',').map(Number), near = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1]].map(([dx, dy]) => (x + dx) + ',' + (y + dy)).find((k) => !cb.units.some((u) => u.pos === k) && keyOf(refOf(k), cb.map))!;
    first.weapon = gun; first.ammo = 3; first.mags = [cap, cap]; first.pos = near;
    for (const u of foes) { u.dead = true; u.hp = 0; }
    const c = Object.values(g.characters)[0], ch = () => g.characters[c.id], spares = () => packOf(ch()).filter((p) => p.weapon === gun && p.mags).flatMap((p) => p.mags!);
    while (g.phase === 'combat' && active(g.combat!)!.charId !== c.id) g = ap(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id });
    if (g.phase === 'combat') g = ap(g, { type: 'combat/end-turn', unitId: me.id });
    expect(g.phase).toBe('story'); expect(g.sandbox!.state).toBe('cleared');
    const pile = pileOn(storyObjects(g), near)!; expect(labels(pile)).toEqual(expect.arrayContaining([expect.stringMatching(new RegExp('^' + WEAPON[gun].name + ' · ')), ...Array(2).fill(expect.stringMatching(new RegExp('magazine ' + cap + '/' + cap)))]));
    const before = spares().length;
    g = ap(g, { type: 'world/act', charId: c.id, act: 'pickup', tile: refOf(near) });
    expect(spares().length).toBe(before + 2); expect(spares().filter((n) => n === cap).length).toBeGreaterThanOrEqual(2);
    expect(packOf(ch()).some((p) => p.weapon === gun && p.kind === 'weapon' && p.dur != null)).toBe(true); // the worn gun too
  });
});
