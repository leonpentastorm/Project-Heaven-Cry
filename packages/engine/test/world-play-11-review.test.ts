// World Play 1.1 (rules revision 1.9), the review fixes: the fx numbering, click-paths a unit can pay for, dropped
// plates that can be studied, stims and Essence from piles, off-hand guns that reload only from what is carried, each
// magazine's and each loaded gun's ammo type through reloads, pick-ups and gear changes, a full gun that isn't
// reloaded, fog for piles' fx and drop lines, the Narrator's pile ops counted and matched, the Proving Ground's
// off-hand gun loaded, ammunition never drawn as a weapon, heat kept through a change of hands, and the pile labels.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, type Sheet, type GameState, type Action, type NarratorTurn, type MapObject, type Character, newGame, apply, RuleError, positionsOf, storyObjects, keyOf, zoneMap,
  viewFor, packOf, active, reload, reloadHands, magsOf, roundsOf, WEAPON, SIGIL, TONE, SCHOOL, MODULE, plateLesson, rollPlateNote, calName, gearPlan, equip, weaponActions, dropToPile, rollDeathDrops, maxDurOf,
  dropOnTile, magItem, itemLabel, routeHazards, paths, refOf,
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
const hz = (g: GameState, tiles: string[], extra: any = {}) => turn(g, { hazards: [{ action: 'place', kind: 'fire', severity: 'light', tiles, ...extra }] });
const rising = (fx: { n: number }[]) => fx.every((e, i) => i === 0 || e.n > fx[i - 1].n);
const gun = (id: string, extra: any = {}): any => ({ id, name: WEAPON[id].name, qty: 1, kind: 'weapon', weapon: id, ...extra });
const fresh = (g: GameState) => set(g, (x) => { const u = me(x); u.ap = 6; });

describe('fx numbering (review blocker)', () => {
  it('a pile fx never overwrites the sequence: n rises through a speed reload, a pick-up and a death drop', () => {
    let g = turn(start(), { combat: { name: 'Fight', difficulty: 'easy', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'service_pistol', at: 'P11' }, { name: 'Other', tier: 'minion', weapon: 'fists', at: 'P10' }] } });
    for (let i = 0; i < 8 && active(g.combat!)!.charId !== rook(g).id; i++) { const u = active(g.combat!)!; g = ap(g, { type: 'combat/end-turn', unitId: u.id }, u.charId === rook(g).id ? H : P2); }
    g = set(g, (x) => { me(x).ammo = 5; me(x).ap = 6; });
    g = ap(g, { type: 'combat/reload', unitId: me(g).id });
    expect(g.combat!.fx!.some((e) => e.k === 'pile' && e.count === 1)).toBe(true);
    g = ap(g, { type: 'combat/pickup', unitId: me(g).id, tile: refOf(me(g).pos) } as Action);
    g = set(g, (x) => { const f = x.combat!.units.find((u) => u.name === 'Raider')!; f.dead = true; f.hp = 0; });
    g = ap(g, { type: 'combat/end-turn', unitId: me(g).id });
    const fx = g.combat!.fx!;
    expect(fx.some((e) => e.k === 'pile' && e.why === 'death')).toBe(true);
    expect(rising(fx)).toBe(true); expect(fx[fx.length - 1].n).toBe(g.combat!.fxSeq);
  });
});

describe('click-paths a unit can pay for (review fix to item 683)', () => {
  it('a detour the unit can\'t afford falls back to the shortest path, which the preview warns about; an affordable one is still taken', () => {
    const base = fight(hz(start(), [], { rect: { from: 'C1', to: 'C3' } }));
    const g = set(base, (x) => { const u = me(x); u.pos = K('B2'); u.movement = 2; u.ap = 1; u.bank = 0; for (const o of x.combat!.units) if (o !== u && o.side === 'pc') o.pos = K('A12'); });
    const u = me(g), r = routeHazards(g.combat!, u, K('D2'))!;
    expect(paths(g.combat!, u.pos, u.id).dist[K('D2')]).toBe(2);
    expect(r.tiles).toBe(2); expect(r.crosses.map((c) => c.ref)).toEqual(['C2']);
    const moved = ap(g, { type: 'combat/move', unitId: u.id, to: K('D2') } as Action);
    expect(me(moved).pos).toBe(K('D2'));
    // With the AP for it, the detour (4 tiles, 2 AP) goes around.
    const rich = set(g, (x) => { me(x).ap = 2; });
    const r2 = routeHazards(rich.combat!, me(rich), K('D2'))!; expect(r2.crosses).toEqual([]); expect(r2.tiles).toBe(4);
    // A sprint reaches 3 × Movement tiles: a 7-tile detour is too far, so it sprints the short way.
    const sprint = set(g, (x) => { me(x).ap = 6; me(x).movement = 1; });
    expect(routeHazards(sprint.combat!, me(sprint), K('D2'), 'sprint')!.tiles).toBe(2);
  });
});

describe('dropped plates can be studied (review fix to item 692)', () => {
  it('a plate with no note rolls its lesson on the fight\'s dice; a Heart plate\'s lesson is learned from the pack', () => {
    for (let s = 1; s < 40; s++) {
      const w = rollPlateNote({ state: s }, 'sigil_plate'); expect(SIGIL[plateLesson(w)]).toBeTruthy();
      const h = rollPlateNote({ state: s }, 'heart_plate'), id = plateLesson(h), kind = h.split(':')[0];
      expect(kind === 'tone' ? TONE[id] && id !== 'raw' : kind === 'school' ? SCHOOL[id] : MODULE[id]).toBeTruthy();
    }
    expect(rollPlateNote({ state: 3 }, 'sigil_plate')).toBe(rollPlateNote({ state: 3 }, 'sigil_plate'));
    let g = turn(start(), { combat: { name: 'Fight', difficulty: 'easy', enemies: [{ name: 'Adept', tier: 'minion', weapon: 'fists', at: 'C2', drops: { items: [{ item: 'heart_plate' }, { item: 'sigil_plate' }] } } as any] } });
    const foe = g.combat!.units.find((u) => u.side === 'foe')!, at = foe.pos;
    g = set(g, (x) => { const f = x.combat!.units.find((u) => u.side === 'foe')!; f.dead = true; f.hp = 0; });
    for (let i = 0; i < 8 && g.phase === 'combat'; i++) { const u = active(g.combat!)!; g = ap(g, { type: 'combat/end-turn', unitId: u.id }, u.charId === rook(g).id ? H : P2); }
    expect(g.phase).toBe('story');
    const plates = (pileOn(storyObjects(g), at)!.items || []).map((e) => e.pack!).filter((p) => /plate/.test(p.id));
    expect(plates.length).toBe(2); for (const p of plates) expect(p.note).toBeTruthy();
    g = set(g, (x) => { const c = rook(x); c.pack = [...packOf(c), ...plates]; c.soulKnown = { schools: [], modules: [], tones: [] } as any;
      // Outburst 4.0 (rules 1.8) gates modules by Soul skill and tones by Lore Master: a trained reader learns any lesson.
      for (const k of ['empathy', 'camaraderie', 'implication', 'will_power', 'lore_master', 'composure', 'faith', 'conscience', 'authority']) c.skills[k] = Math.max(c.skills[k] || 0, 4); });
    const hp = plates.find((p) => p.id === 'heart_plate')!, id = plateLesson(hp.note), kind = hp.note!.split(':')[0];
    g = ap(g, { type: 'magic/learn', charId: rook(g).id, [kind]: id, from: 'plate' } as any);
    const k: any = rook(g).soulKnown; expect((kind === 'tone' ? k.tones : kind === 'school' ? k.schools : k.modules)).toContain(id);
    expect(packOf(rook(g)).some((p) => p.id === 'heart_plate')).toBe(false);
  });
});

describe('stims and the Essence from a pile (review fix)', () => {
  it('a stim picked up joins the usable stims, not the pack; an Essence joins the Essence', () => {
    let g = fight(start());
    const s0 = rook(g).stims, e0 = rook(g).essence;
    g = set(g, (x) => { dropOnTile(x.combat!.objects!, me(x).pos, [{ id: 'stim_injector', item: 'stim_injector', name: 'Stim injector', qty: 2, kind: 'med' }, { id: 'essence_of_experience', item: 'essence_of_experience', name: 'Essence of Experience', qty: 1, kind: 'tool' }]); });
    g = ap(g, { type: 'combat/pickup', unitId: me(g).id, tile: refOf(me(g).pos) } as Action);
    expect(rook(g).stims).toBe(s0 + 2); expect(rook(g).essence).toBe(e0 + 1);
    expect(packOf(rook(g)).some((p) => /stim|essence/.test(p.id))).toBe(false);
    // And it is used at once: Ash stands next to Rook.
    g = set(g, (x) => { const [a, b] = me(x).pos.split(',').map(Number), ash = x.combat!.units.find((u) => u.side === 'pc' && u !== me(x))!; ash.pos = (a + 1) + ',' + b; ash.hp = ash.maxHp - 20; me(x).ap = 6; });
    const ash = g.combat!.units.find((u) => u.side === 'pc' && u.charId !== rook(g).id)!;
    g = ap(g, { type: 'combat/stim', unitId: me(g).id, targetId: ash.id } as Action);
    expect(rook(g).stims).toBe(s0 + 1);
  });
});

describe('off-hand guns reload only from what is carried (review fix)', () => {
  it('no spares entry: no free magazine; a full off-hand gun isn\'t reloaded', () => {
    let g = set(start(), (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 12; c.offHand = { id: 'drifter_revolver', loaded: 0 }; c.pack = [magsOf('service_pistol', 1)]; });
    g = fight(g);
    expect(me(g).offMags).toEqual([]);
    expect(refused(g, { type: 'combat/reload', unitId: me(g).id, hand: 'off' } as Action)).toBe('No loaded spare for the off-hand gun.');
    const full = set(g, (x) => { me(x).offAmmo = 6; me(x).offMags = [6]; });
    expect(refused(full, { type: 'combat/reload', unitId: me(full).id, hand: 'off' } as Action)).toBe('Already full.');
    // An enemy's off-hand gun still never runs out (until stat blocks list it).
    const e = set(g, (x) => { const f = x.combat!.units.find((u) => u.side === 'foe')!; f.offWeapon = 'drifter_revolver'; f.offAmmo = 0; f.ap = 6; });
    const f = e.combat!.units.find((u) => u.side === 'foe')!; expect(reloadHands(e.combat!, f, 'off')).toBeNull(); expect(f.offAmmo).toBe(6);
  });
  it('the same model in both hands: the off-hand reload takes the spare\'s type with it, and the rest stay in line (item 680)', () => {
    let g = set(start(), (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 12; c.offHand = { id: 'service_pistol', loaded: 0 }; c.pack = [{ ...magsOf('service_pistol', 2), mags: [12, 11], magTypes: ['armor_piercing', null] }]; });
    g = fight(g);
    const cb = g.combat!, u = me(g);
    expect(reloadHands(cb, u, 'off')).toBeNull();
    expect(u.offAmmo).toBe(12); expect(u.offAmmoType).toBe('armor_piercing'); expect(u.mags).toEqual([11]); expect(u.magTypes).toEqual([null]);
    // Tactical: the old one goes back with its type.
    u.ap = 6; u.offAmmo = 3; expect(reloadHands(cb, u, 'off', true)).toBeNull();
    expect(u.offAmmo).toBe(11); expect(u.offAmmoType).toBeNull(); expect(u.mags).toEqual([3]); expect(u.magTypes).toEqual(['armor_piercing']);
  });
  it('a typed magazine picked up for a different off-hand gun keeps its type, in line with the magazines', () => {
    let g = set(start(), (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 12; c.offHand = { id: 'drifter_revolver', loaded: 6 };
      c.pack = [magsOf('service_pistol', 1), { ...magsOf('drifter_revolver', 2), magTypes: ['hollow_point', null] }]; });
    g = fight(g);
    g = set(g, (x) => { dropOnTile(x.combat!.objects!, me(x).pos, [magItem('drifter_revolver', 6, 'incendiary')]); });
    g = ap(g, { type: 'combat/pickup', unitId: me(g).id, tile: refOf(me(g).pos) } as Action);
    expect(me(g).offMagTypes).toEqual(['hollow_point', null, 'incendiary']);
    g = win(g);
    const e = packOf(rook(g)).find((x) => x.weapon === 'drifter_revolver' && x.mags)!;
    expect(e.mags).toEqual([6, 6, 6]); expect(e.magTypes).toEqual(['hollow_point', null, 'incendiary']);
  });
});

describe('a loaded gun keeps its rounds\' type in and out of the hand (review fix)', () => {
  it('put away and drawn again, or swapped between hands, special rounds stay special', () => {
    let g = set(start(), (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 10; c.loadedType = 'incendiary'; c.offHand = null; c.pack = [magsOf('service_pistol', 1), gun('drifter_revolver', { loaded: 6 })]; });
    g = fight(g);
    expect(me(g).ammoType).toBe('incendiary');
    g = ap(g, { type: 'combat/equip', unitId: me(g).id, item: 'drifter_revolver', to: 'main' } as Action);
    expect(packOf(rook(g)).find((p) => p.weapon === 'service_pistol' && !p.mags)).toMatchObject({ loaded: 10, ammoType: 'incendiary' });
    g = fresh(g);
    g = ap(g, { type: 'combat/equip', unitId: me(g).id, item: 'service_pistol', to: 'main' } as Action);
    expect(me(g).ammo).toBe(10); expect(me(g).ammoType).toBe('incendiary');
    // Into the off hand and back by a swap.
    g = fresh(g); g = ap(g, { type: 'combat/equip', unitId: me(g).id, item: 'drifter_revolver', to: 'main' } as Action);
    g = fresh(g); g = ap(g, { type: 'combat/equip', unitId: me(g).id, item: 'service_pistol', to: 'off' } as Action);
    expect(rook(g).offHand).toMatchObject({ id: 'service_pistol', loaded: 10, ammoType: 'incendiary' });
    g = fresh(g); g = ap(g, { type: 'combat/swap', unitId: me(g).id, from: 'off' } as Action);
    expect(me(g).weapon).toBe('service_pistol'); expect(me(g).ammoType).toBe('incendiary');
  });
  it('a gun dropped by the dead with special rounds in it keeps them when drawn', () => {
    const c: Character = JSON.parse(JSON.stringify(rook(start()))); c.pack = [gun('service_pistol', { loaded: 7, ammoType: 'hollow_point' })];
    expect(equip(c, 0, 'main')).toBeNull(); expect(c.loadedType).toBe('hollow_point'); expect(c.loaded).toBe(7);
    const d: Character = JSON.parse(JSON.stringify(rook(start()))); d.pack = [gun('service_pistol', { ammoType: 'hollow_point' })]; // an empty gun has no type
    expect(equip(d, 0, 'main')).toBeNull(); expect(d.loadedType).toBeNull();
  });
});

describe('heat stays through a change of hands (review fix to item 689)', () => {
  it('two swaps don\'t cool a gun', () => {
    let g = set(start(), (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 12; c.offHand = { id: 'drifter_revolver', loaded: 6 }; c.pack = [magsOf('service_pistol', 1)]; });
    g = fight(g); g = set(g, (x) => { me(x).heat = 3; });
    g = ap(g, { type: 'combat/swap', unitId: me(g).id, from: 'off' } as Action); g = ap(g, { type: 'combat/swap', unitId: me(g).id, from: 'off' } as Action);
    expect(me(g).heat).toBe(3); expect(me(g).weapon).toBe('service_pistol');
  });
});

describe('reloading a full gun (review fix)', () => {
  it('a full magazine gun refuses both reloads; reload both refuses a full off-hand gun', () => {
    let g = set(start(), (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 12; c.offHand = { id: 'drifter_revolver', loaded: 6 }; c.pack = [magsOf('service_pistol', 2), magsOf('drifter_revolver', 1)]; });
    g = fight(g);
    expect(refused(g, { type: 'combat/reload', unitId: me(g).id } as Action)).toBe('Already full.');
    expect(refused(g, { type: 'combat/reload', unitId: me(g).id, tactical: true } as Action)).toBe('Already full.');
    expect(refused(g, { type: 'combat/reload', unitId: me(g).id, hand: 'both' } as Action)).toBe('Already full.');
    const half = set(g, (x) => { me(x).ammo = 4; });
    expect(refused(half, { type: 'combat/reload', unitId: me(half).id, hand: 'both' } as Action)).toMatch(/off-hand gun is full/);
    expect(weaponActions(me(g)).find((x) => x.id === 'reload')!.why).toBe('Already full.');
  });
});

describe('ammunition is not a weapon (review fix)', () => {
  it('a magazine stack can\'t be drawn or equipped', () => {
    let g = set(start(), (x) => { const c = rook(x); c.weapon = 'service_pistol'; c.weaponState = {}; c.loaded = 12; c.offHand = null; c.pack = [magsOf('hellraiser_service_rifle', 3), roundsOf('rifle', 20)]; });
    g = fight(g);
    expect(refused(g, { type: 'combat/equip', unitId: me(g).id, item: 0, to: 'main' } as Action)).toBe('That is ammunition, not a weapon.');
    expect(refused(g, { type: 'combat/equip', unitId: me(g).id, item: 1, to: 'off' } as Action)).toBe('That is ammunition, not a weapon.');
    expect(gearPlan(rook(g), { op: 'draw', item: 0, to: 'main' }).why).toBe('That is ammunition, not a weapon.');
  });
});

describe('fog for a pile\'s fx and the drop line (review fix to item 676)', () => {
  it('a drop behind the wall: no pile fx and no contents in a player\'s log; the host\'s state keeps both', () => {
    let g = fight(start());
    const far = K('P11');
    g = set(g, (x) => { const cb = x.combat!, f = cb.units.find((u) => u.side === 'foe')!; f.pos = far; f.weapon = 'service_pistol'; f.ammo = 9; f.mags = [12]; f.dead = true; f.hp = 0; rollDeathDrops(cb, x.rng, f); dropToPile(cb, far, [magItem('service_pistol', 3)]); });
    expect(g.combat!.fx!.some((e) => e.k === 'pile' && e.at === far)).toBe(true);
    expect(g.combat!.log.some((l) => /Raider drops: Service pistol/.test(l))).toBe(true);
    const v = viewFor(g, P2).combat!;
    expect((v.fx || []).some((e) => e.k === 'pile' && e.at === far)).toBe(false);
    expect(v.log.some((l) => / drops: /.test(l))).toBe(false); expect(v.log).toContain('Raider falls; whatever it carried lies where it fell.');
    expect((v as any).dropLines).toBeUndefined();
    // In sight: the line and the fx stay.
    const near = set(g, (x) => { const cb = x.combat!, f = cb.units.find((u) => u.side === 'foe')!; f.pos = K('C4'); cb.dropLines = []; cb.deadSeen = []; f.dead = true; rollDeathDrops(cb, x.rng, f); });
    const vn = viewFor(near, P2).combat!; expect(vn.log.some((l) => /Raider drops: /.test(l))).toBe(true); expect((vn.fx || []).some((e) => e.k === 'pile' && e.at === K('C4'))).toBe(true);
  });
  it('a carried person dropped mid-fight shows no drops in a player\'s view', () => {
    const g = set(fight(start()), (x) => { x.combat!.dropped = [{ npc: { id: 'n9', name: 'Courier', side: 'neutral', tier: 'minion', weapon: 'fists', pos: K('C4'), drops: { table: 'person' } } as any, at: K('C4'), by: rook(x).id }]; });
    expect((viewFor(g, P2).combat!.dropped![0].npc as any).drops).toBeUndefined();
    expect((g.combat!.dropped![0].npc as any).drops).toEqual({ table: 'person' });
  });
});

describe('the Narrator\'s pile ops (review fix to item 681)', () => {
  it('objects[] piles count with ground[] against 6 a turn; an op with no kind never touches a pile', () => {
    const objs = ['C2', 'C3', 'C4', 'C5', 'C6'].map((at) => ({ action: 'place', kind: 'pile', at, items: [{ item: 'flare' }] }));
    let g = turn(start(), { objects: objs as any, ground: [{ at: 'D2', items: [{ item: 'flare' }] }, { at: 'D3', items: [{ item: 'flare' }] }] } as any);
    const piles = storyObjects(g).filter((o) => o.kind === 'pile').map((o) => refOf(o.pos)).sort();
    expect(piles).toEqual(['C2', 'C3', 'C4', 'C5', 'C6', 'D2']);
    g = turn(g, { objects: [{ action: 'remove', at: 'C2' }] as any });
    expect(pileOn(storyObjects(g), K('C2'))).toBeTruthy();
    g = turn(g, { objects: [{ action: 'remove', id: 'pile-' + K('C2').replace(',', '-') }] as any });
    expect(pileOn(storyObjects(g), K('C2'))).toBeUndefined();
  });
});

describe('pile labels (review fix to item 700)', () => {
  it('a weapon says its rounds and wear; rounds of a calibre named for a gun say "rounds"', () => {
    const max = maxDurOf('service_pistol');
    expect(itemLabel(gun('service_pistol', { loaded: 9, dur: Math.round(max * 0.5) }))).toBe('Service pistol (.32 Decrkm) · 9/12 loaded · worn 50%');
    expect(itemLabel(gun('service_pistol', { loaded: 4, ammoType: 'hollow_point' }))).toBe('Service pistol (.32 Decrkm) · 4/12 loaded hollow-point');
    expect(itemLabel(gun('combat_knife'))).toBe('Combat knife');
    expect(calName('rifle')).toBe('Rifle rounds'); expect(calName('.32 decrkm')).toBe('.32 Decrkm'); expect(calName('shell')).toBe('Shell');
    expect(itemLabel(roundsOf('rifle', 30))).toBe('30 × Rifle rounds');
  });
});

describe('the Proving Ground\'s off-hand gun comes loaded (review fix)', () => {
  it('equipped in the off hand by the tools, a magazine gun is full, as the tools say', () => {
    let g = newGame('PROVE9', { id: H, name: 'Host' }, 'seed-proving');
    g = ap(g, { type: 'char/add', sheet: sheet('Vel') });
    g = ap(g, { type: 'sandbox/start' } as Action);
    const c = Object.values(g.characters)[0];
    g = ap(g, { type: 'sandbox/give', charId: c.id, item: 'service_pistol', equip: true } as Action);
    g = ap(g, { type: 'sandbox/give', charId: c.id, item: 'magistrate_pistol' } as Action);
    const i = packOf(g.characters[c.id]).findIndex((p) => p.weapon === 'magistrate_pistol' && !p.mags);
    g = ap(g, { type: 'sandbox/equip', charId: c.id, idx: i, to: 'off' } as Action);
    expect(g.characters[c.id].offHand).toMatchObject({ id: 'magistrate_pistol', loaded: 7 });
  });
});
