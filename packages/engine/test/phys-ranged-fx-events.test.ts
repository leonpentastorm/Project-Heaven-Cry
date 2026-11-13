// Physical 2.0 (rules 1.12), ranged: the effects events the ranged effects key on (apps/web/src/game/fx/ranged.ts,
// EVENTS_FOR_THE_LEAD E1–E17). Every event and field is presentation only: these tests check the payloads, and that a
// holder the other side can't see is kept to its own side (`only`), as watch_set already was.
import { describe, it, expect, beforeEach, vi } from 'vitest';
// Saves roll a d20 that the attack rig doesn't reach: D.die forces every d20 (an attack's own is then set by rig()).
const D = vi.hoisted(() => ({ die: null as number | null }));
vi.mock('../src/rng', async (orig) => { const m: any = await orig(); return { ...m, d20: (r: any) => { const v = m.d20(r); return D.die ?? v; } }; });
import { TECHNIQUE, WEAPON, heatLimit, resolveAttack, objectsAt, packOf, type Unit } from '../src';
import { fxTaps } from '../src/fxtap';
import { onHook } from '../src/effects/hooks';
import { physFight, rig } from './helpers/physfight';
import { calm, type PhysF as F } from './helpers/physfight-ranged';

// Every effects event, uncapped (cb.fx keeps the last 40), from the moment `mark()` is called.
const EV: any[] = [];
fxTaps.push((_cb, ev) => { EV.push(ev); });
const mark = () => { EV.length = 0; };
const evs = (k: string, unit?: string) => EV.filter((e) => e.k === k && (!unit || e.unit === unit));
// the volley name the attack hooks see, by roll
const VOLLEYS: (string | null)[] = [];
onHook('attack_roll', (ctx: any) => { VOLLEYS.push(ctx.volley ?? null); });
beforeEach(() => { rig(null); D.die = null; EV.length = 0; VOLLEYS.length = 0; });

/** One gunner at C5 knowing `known`, against foes (default: a soldier at H5), on the gunner's turn, every meter calm. */
function gunner(weapon: string, known: string[], foes: any[] = [{ at: 'H5', tier: 'soldier' }], more: any[] = []): F {
  const f = physFight([{ weapon, known, skills: { dexterity: 6 } }, ...more], foes);
  f.put(f.pc, 'C5'); foes.forEach((x, i) => { if (x.at) f.put(f.foes[i], x.at); });
  more.forEach((m, i) => f.put(f.pcs[i + 1], m.at || 'C7'));
  calm(f); for (const u of f.cb.units) { delete (u as any).hitRound; delete (u as any).pressedThis; delete (u as any).stopped; u.hidden = false; }
  f.turn(f.pc); f.pc.heat = 0; mark();
  return f;
}
const tough = (f: F, u: Unit) => { f.unit(u.id).hp = 999; f.unit(u.id).maxHp = 999; };
const give = (f: F, type: string, qty: number) => { const c = f.char(f.pc); c.pack = [...packOf(c), { id: 'ammo_' + type, item: 'ammo_' + type, name: type + ' rounds', qty, kind: 'ammo' } as any]; };

describe('E1 technique: line, opt, ammo (and the weapon)', () => {
  it('Burst on an automatic weapon says its Auto line; Called Shot its part; Load Special its round', () => {
    const f = gunner('hellraiser_service_rifle', ['burst', 'called_shot', 'load_special']); tough(f, f.foe); rig({ hit: false, die: 5 });
    expect(f.tech('burst', { targetId: f.foe.id })).toBeNull();
    expect(evs('technique', f.pc.id).at(-1)).toMatchObject({ id: 'burst', line: 'auto', opt: null, ammo: null, weapon: 'hellraiser_service_rifle' });
    expect(f.tech('called_shot', { targetId: f.foe.id, opt: 'leg' })).toBeNull();
    expect(evs('technique', f.pc.id).at(-1)).toMatchObject({ id: 'called_shot', opt: 'leg' });
    give(f, 'hollow_point', 2); f.pc.ap = 6;
    expect(f.tech('load_special', { ammo: 'hollow_point' })).toBeNull();
    expect(evs('technique', f.pc.id).at(-1)).toMatchObject({ id: 'load_special', ammo: 'hollow_point' });
  });
  it('a plain weapon with no line for it: line null', () => {
    const f = gunner('service_pistol', ['shot']); rig({ hit: false, die: 5 });
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect(evs('technique', f.pc.id).at(-1)).toMatchObject({ id: 'shot', line: null, opt: null, ammo: null });
  });
  it('Lob with a carried grenade: ammo names the grenade', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: ['lob'], skills: { dexterity: 6 } }, { weapon: 'hellraiser_service_rifle' }], [{ at: '8,5' }]);
    f.put(f.pc, '2,5'); f.put(f.pcs[1], '12,1'); f.put(f.foe, '8,5'); calm(f); f.turn(f.pc); f.pc.throwables = { frag_grenade: 1 }; mark(); rig({ hit: false, die: 1 });
    expect(f.tech('lob', { tile: '8,5', item: 'frag_grenade' })).toBeNull();
    expect(evs('technique', f.pc.id).at(-1)).toMatchObject({ id: 'lob', ammo: 'frag_grenade', tile: '8,5' });
    expect(evs('shot', f.pc.id).at(-1)).toMatchObject({ tech: 'lob', vi: 0 });
  });
});

describe('E1a shot: tech and vi', () => {
  it('a Burst\'s rolls carry the technique and their place; a plain Shot is tech shot, vi 0', () => {
    const f = gunner('hellraiser_service_rifle', ['burst', 'shot']); tough(f, f.foe); rig({ hit: false, die: 5 });
    f.tech('burst', { targetId: f.foe.id });
    expect(evs('shot', f.pc.id).map((e) => [e.tech, e.vi])).toEqual([['burst', 0], ['burst', 1]]); // rules 1.18: a Burst is two rolls
    mark(); f.tech('shot', { targetId: f.foe.id });
    expect(evs('shot', f.pc.id).map((e) => [e.tech, e.vi])).toEqual([['shot', 0]]);
  });
  it('a no-roll round (Warning Shot) carries its technique too', () => {
    const f = gunner('service_pistol', ['warning_shot']); D.die = 20;
    expect(f.tech('warning_shot', { targetId: f.foe.id })).toBeNull();
    expect(evs('shot', f.pc.id).at(-1)).toMatchObject({ tech: 'warning_shot', vi: 0, warning: true, target: null });
  });
});

describe('E2 swap_in: Snap Shot\'s draw', () => {
  it('the drawn weapon, from the pack, before the shot', () => {
    const f = gunner('ccec_marksman_rifle', ['snap_shot']); const c: any = f.char(f.pc);
    c.pack = [...(c.pack || []), { id: 'service_pistol', name: 'service_pistol', qty: 1, kind: 'weapon', weapon: 'service_pistol', loaded: 12 }]; mark(); rig({ hit: false, die: 5 });
    expect(f.tech('snap_shot', { targetId: f.foe.id, item: c.pack.length - 1 })).toBeNull();
    const sw = evs('swap_in', f.pc.id); expect(sw.length).toBe(1);
    expect(sw[0]).toMatchObject({ unit: f.pc.id, at: f.pc.pos, weapon: 'service_pistol', from: 'pack', tech: 'snap_shot' }); expect(sw[0].only).toBeUndefined();
    expect(EV.indexOf(sw[0])).toBeLessThan(EV.indexOf(evs('shot', f.pc.id)[0]));
    expect(evs('shot', f.pc.id)[0]).toMatchObject({ tech: 'snap_shot', weapon: 'service_pistol' });
  });
});

describe('E3 carry, E14 object max: Punch Through', () => {
  it('Heavy: the round carries on from the target to the next in line', () => {
    const f = gunner('hellraiser_lmg', ['punch_through'], [{ at: 'G5', tier: 'soldier' }, { at: 'J5', tier: 'soldier' }]); const [a, b] = f.foes;
    tough(f, a); tough(f, b); f.unit(f.pc.id).braced = true; mark(); rig({ hit: true, die: 12 });
    expect(f.tech('punch_through', { targetId: a.id })).toBeNull();
    expect(evs('carry', f.pc.id)).toEqual([expect.objectContaining({ unit: f.pc.id, from: a.pos, to: b.pos, target: b.id, tech: 'punch_through' })]);
  });
  it('the cover it struck says its most HP', () => {
    const f = gunner('ccec_marksman_rifle', ['punch_through'], [{ at: 'G5', tier: 'soldier' }]); tough(f, f.foe);
    const tile = f.pv('shot', { targetId: f.foe.id }).attacks[0].pv.coverTile!; const o = objectsAt(f.cb, tile).find((x) => x.hp != null)!; o.hp = o.max = 500;
    mark(); rig({ hit: false, die: 5 }); f.tech('punch_through', { targetId: f.foe.id });
    expect(evs('object').at(-1)).toMatchObject({ at: tile, max: 500, broken: false });
    expect(evs('object').at(-1).hp).toBeLessThan(500);
  });
});

describe('E4 volley: dump, rake, suppress', () => {
  it('Mag Dump: one dump volley with the rounds, its rolls chained; no hook sees a named volley (no rules change)', () => {
    const f = gunner('service_pistol', ['mag_dump'], [{ at: 'G5', tier: 'elite' }]); tough(f, f.foe); rig({ hit: false, die: 5 });
    const ammo0 = f.pc.ammo; expect(f.tech('mag_dump', { targetId: f.foe.id })).toBeNull();
    const v = evs('volley', f.pc.id); expect(v.length).toBe(1);
    const N = TECHNIQUE.mag_dump.numbers; // rules 1.38: rounds_per_roll a roll, the cap their product
    expect(v[0]).toMatchObject({ mode: 'dump', shots: Math.min(ammo0, N.rounds_per_roll * N.max_rolls), rolls: 3, target: f.foe.id, tech: 'mag_dump', weapon: 'service_pistol' });
    const shots = evs('shot', f.pc.id); expect(shots.length).toBe(3); // rules 1.18: three rolls at most
    expect(shots.every((e) => e.chain && e.tech === 'mag_dump')).toBe(true); expect(shots.map((e) => e.vi)).toEqual([0, 1, 2]);
    expect(EV.indexOf(v[0])).toBeLessThan(EV.indexOf(shots[0]));
    expect(VOLLEYS.every((x) => x === null)).toBe(true);
  });
  it('a refused dump leaves no volley behind', () => {
    const f = gunner('service_pistol', ['mag_dump']); f.pc.ammo = 0;
    expect(f.tech('mag_dump', { targetId: f.foe.id })).not.toBeNull(); expect(evs('volley', f.pc.id).length).toBe(0);
  });
  it('the 3-target Rake: one rake volley naming its targets, rolls chained', () => {
    const f = gunner('service_pistol', ['rake'], [{ at: 'G5', tier: 'soldier' }, { at: 'G6', tier: 'soldier' }]); const [a, b] = f.foes; tough(f, a); tough(f, b); mark(); rig({ hit: false, die: 5 });
    expect(f.tech('rake', { targetId: a.id })).toBeNull();
    const v = evs('volley', f.pc.id); expect(v.length).toBe(1);
    expect(v[0]).toMatchObject({ mode: 'rake', shots: 6, tech: 'rake' }); expect([...v[0].targets].sort()).toEqual([a.id, b.id].sort());
    const shots = evs('shot', f.pc.id); expect(shots.length).toBe(2); expect(shots.every((e) => e.chain && e.tech === 'rake')).toBe(true);
    expect(VOLLEYS.every((x) => x === null)).toBe(true);
  });
  it('Suppress: one suppress volley of 3 rounds, its one roll chained', () => {
    const f = gunner('hellraiser_service_rifle', ['suppress']); tough(f, f.foe); rig({ hit: false, die: 5 });
    expect(f.tech('suppress', { targetId: f.foe.id })).toBeNull();
    expect(evs('volley', f.pc.id)).toEqual([expect.objectContaining({ mode: 'suppress', shots: 3, target: f.foe.id, tech: 'suppress' })]);
    expect(evs('shot', f.pc.id)).toEqual([expect.objectContaining({ chain: true, tech: 'suppress', vi: 0 })]);
    expect(VOLLEYS.every((x) => x === null)).toBe(true);
  });
});

describe('E5 save', () => {
  it('Warning Shot: the Heart save, passed and failed, with the technique', () => {
    const f = gunner('service_pistol', ['warning_shot']); D.die = 20;
    f.tech('warning_shot', { targetId: f.foe.id });
    expect(evs('save')).toEqual([expect.objectContaining({ unit: f.foe.id, at: f.foe.pos, ok: true, tech: 'warning_shot' })]);
    const g = gunner('service_pistol', ['warning_shot']); D.die = 1;
    g.tech('warning_shot', { targetId: g.foe.id });
    expect(evs('save')).toEqual([expect.objectContaining({ unit: g.foe.id, ok: false, tech: 'warning_shot' })]);
  });
  it('a preview rolls nothing and sends nothing', () => {
    const f = gunner('service_pistol', ['warning_shot']); f.pv('warning_shot', { targetId: f.foe.id }); expect(evs('save').length).toBe(0);
  });
});

describe('E6 lane / lane_end: Suppress, Heavy, Braced', () => {
  it('the held lane is drawn where it is set, and taken down at the holder\'s next turn', () => {
    const f = gunner('hellraiser_lmg', ['suppress']); tough(f, f.foe); f.unit(f.pc.id).braced = true; rig({ hit: false, die: 5 });
    expect(f.tech('suppress', { targetId: f.foe.id, line: 'heavy' })).toBeNull();
    expect(evs('lane', f.pc.id)).toEqual([expect.objectContaining({ unit: f.pc.id, at: f.foe.pos, r: 3 })]);
    f.turn(f.foe); f.turn(f.pc);
    expect(evs('lane_end', f.pc.id)).toEqual([expect.objectContaining({ unit: f.pc.id })]);
  });
  it('the holder falling takes it down too', () => {
    const f = gunner('hellraiser_lmg', ['suppress']); tough(f, f.foe); f.unit(f.pc.id).braced = true; rig({ hit: false, die: 5 });
    expect(f.tech('suppress', { targetId: f.foe.id, line: 'heavy' })).toBeNull(); expect(evs('lane', f.pc.id).length).toBe(1); f.unit(f.pc.id).hp = 1;
    f.turn(f.foe); rig({ hit: true, die: 12 }); f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pc.id), 'shot', null, { noAp: true }));
    expect(evs('lane_end', f.pc.id).length).toBe(1);
  });
});

describe('E7 heat: Mag Dump to one under the limit', () => {
  it('why dump, with the Heat as it stands after the action and the limit', () => {
    const f = gunner('service_pistol', ['mag_dump'], [{ at: 'G5', tier: 'elite' }]); tough(f, f.foe); rig({ hit: false, die: 5 });
    const lim = heatLimit(f.pc, WEAPON.service_pistol);
    f.tech('mag_dump', { targetId: f.foe.id });
    expect(evs('heat', f.pc.id)).toEqual([expect.objectContaining({ unit: f.pc.id, why: 'dump', was: 0, now: f.pc.heat, limit: lim })]);
    expect(f.pc.heat).toBe(lim - 1);
  });
});

describe('E8 technique with: Crossfire\'s ally', () => {
  it('names the ally whose hit made it legal', () => {
    const f = gunner('long_rifle', ['crossfire'], [{ at: 'H5', tier: 'soldier' }], [{ at: 'C7', weapon: 'service_pistol', known: [] }]); tough(f, f.foe);
    const ally = f.pcs[1]; f.turn(ally); rig({ hit: true, die: 12 }); f.tech('shot', { targetId: f.foe.id });
    f.turn(f.pc); f.pc.heat = 0; mark();
    expect(f.tech('crossfire', { targetId: f.foe.id })).toBeNull();
    expect(evs('technique', f.pc.id).at(-1)).toMatchObject({ id: 'crossfire', with: ally.id });
  });
});

describe('E9 shot round, E16 load weapon and hand: Load Special', () => {
  it('the load names the weapon and hand; the next Fire\'s shot carries the round', () => {
    const f = gunner('service_pistol', ['load_special', 'shot']); give(f, 'hollow_point', 2); tough(f, f.foe); rig({ hit: true, die: 12 });
    expect(f.tech('load_special', { ammo: 'hollow_point' })).toBeNull();
    expect(evs('load', f.pc.id).at(-1)).toMatchObject({ special: 'hollow_point', weapon: 'service_pistol', hand: 'main' });
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect(evs('shot', f.pc.id).at(-1)).toMatchObject({ round: 'hollow_point', tech: 'shot' });
    mark(); f.tech('shot', { targetId: f.foe.id });
    expect(evs('shot', f.pc.id).at(-1).round).toBeUndefined(); // the magazine's own standard round
  });
});

describe('E10 routed, E11 free_reload, E15 stopped apLoss: the Takes', () => {
  const taker = () => { const f = gunner('service_pistol', ['rout', 'last_round', 'stopping_shot'], [{ at: 'H3', tier: 'soldier' }]); f.put(f.pc, 'C3'); f.put(f.foe, 'H3'); for (const u of f.cb.units) delete u.apDebt; mark(); return f; };
  it('Rout: the run, from where it stood to where it goes, by whom', () => {
    const f = taker(); f.press(f.foe, 2, f.pc); D.die = 1; const from = f.foe.pos; mark();
    expect(f.tech('rout', { targetId: f.foe.id })).toBeNull();
    const r = evs('routed', f.foe.id); expect(r.length).toBe(1);
    expect(r[0]).toMatchObject({ unit: f.foe.id, from, by: f.pc.id }); expect(r[0].to).toBe(f.foe.pos);
    expect(evs('shot', f.pc.id).at(-1)).toMatchObject({ rout: true, tech: 'rout' });
  });
  it('Last Round: the free reload it earns', () => {
    const f = taker(); f.press(f.foe, 2, f.pc); f.pc.ammo = 1; f.foe.hp = 1; mark(); rig({ hit: true, die: 12 });
    expect(f.tech('last_round', { targetId: f.foe.id })).toBeNull();
    expect(evs('free_reload', f.pc.id)).toEqual([expect.objectContaining({ unit: f.pc.id, at: f.pc.pos, tech: 'last_round' })]);
  });
  it('Stopping Shot: the AP the stop costs (the data number)', () => {
    const f = taker(); f.press(f.foe, 2, f.pc); tough(f, f.foe); mark(); rig({ hit: true, die: 12 }); D.die = 1;
    expect(f.tech('stopping_shot', { targetId: f.foe.id })).toBeNull();
    expect(evs('stopped', f.foe.id).at(-1)).toMatchObject({ how: 'push', by: f.pc.id, apLoss: 1 });
  });
});

describe('E12 Cover Me\'s round: covering, not cover', () => {
  it('the covering burst is marked covering: true', () => {
    const f = gunner('service_pistol', ['cover_me'], [{ at: 'H5', tier: 'soldier', weapon: 'service_pistol' }], [{ at: 'C7', weapon: 'service_pistol' }]); const ally = f.pcs[1];
    expect(f.tech('cover_me', { allyId: ally.id })).toBeNull();
    f.turn(f.foe); rig({ hit: false, die: 5 }); mark();
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(ally.id), 'shot', null, { noAp: true }));
    const s = evs('shot', f.pc.id); expect(s.length).toBe(1);
    expect(s[0]).toMatchObject({ covering: true, target: null, tech: 'cover_me', vi: 0 }); expect('cover' in s[0]).toBe(false);
  });
});

describe('E13 watch_fire why: Dead to Rights', () => {
  it('says what set it off', () => {
    const f = gunner('service_pistol', ['dead_to_rights'], [{ at: 'H5', tier: 'soldier', weapon: 'service_pistol' }], [{ at: 'C7', weapon: 'service_pistol' }]);
    f.press(f.foe, 2, f.pc); expect(f.tech('dead_to_rights', { targetId: f.foe.id })).toBeNull();
    f.turn(f.foe); rig({ hit: false, die: 5 }); mark();
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pcs[1].id), 'shot', null, { noAp: true }));
    expect(evs('watch_fire', f.pc.id)).toEqual([expect.objectContaining({ id: 'dead_to_rights', why: 'attacks', target: f.foe.id })]);
    expect(evs('shot', f.pc.id)[0]).toMatchObject({ tech: 'dead_to_rights', vi: 0 });
  });
});

describe('E17 only: a holder the other side can\'t see keeps its Bead, Watch and Heat to its own side', () => {
  it('Bead and its end: none when seen; only its side when Hidden', () => {
    const f = gunner('service_pistol', ['bead']); expect(f.tech('bead', { targetId: f.foe.id })).toBeNull();
    expect(evs('bead', f.pc.id)[0].only).toBeUndefined();
    const g = gunner('service_pistol', ['bead']); g.unit(g.pc.id).hidden = true;
    expect(g.tech('bead', { targetId: g.foe.id })).toBeNull();
    expect(evs('bead', g.pc.id)[0]).toMatchObject({ only: 'pc', target: g.foe.id });
    g.walk(g.pc, 'C4');
    expect(evs('bead_end', g.pc.id)).toEqual([expect.objectContaining({ why: 'moved', only: 'pc' })]);
  });
  it('a lost Watch and a vent', () => {
    const f = gunner('service_pistol', ['dead_to_rights', 'head_down', 'vent']); f.unit(f.pc.id).hidden = true;
    f.press(f.pc, 1); expect(f.tech('dead_to_rights', { targetId: f.foe.id })).toBeNull(); expect(f.pc.watch?.id).toBe('dead_to_rights'); mark();
    expect(f.tech('head_down', {})).toBeNull();
    expect(evs('watch_end', f.pc.id)).toEqual([expect.objectContaining({ id: 'dead_to_rights', why: 'head down', only: 'pc' })]);
    f.pc.heat = 3; mark(); expect(f.tech('vent', {})).toBeNull();
    expect(evs('heat', f.pc.id)).toEqual([expect.objectContaining({ why: 'vent', was: 3, now: 1, limit: heatLimit(f.pc, WEAPON.service_pistol), only: 'pc' })]);
    const g = gunner('service_pistol', ['vent']); g.pc.heat = 3; g.tech('vent', {}); expect(evs('heat', g.pc.id)[0].only).toBeUndefined();
  });
});
