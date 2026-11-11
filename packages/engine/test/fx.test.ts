// Presentation events (combat.ts FxEvent): the effects layer animates from these, so the main actions must emit them,
// and emitting them must never change a roll.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, type Sheet, type GameState, newCharacter, newGame, apply, positionsOf, standable, zoneMap, storyObjects, startCombat, resolveAttack, reload, clearJam, useWeaponSkill, FX_CAP, emitFx, trimFx, type Combat } from '../src';

const sheetFrom = (archId: string, name = 'Test'): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
const fight = () => {
  const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
  const cb = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'E', tier: 'boss', weapon: 'service_pistol', at: 'D5' }], 'easy', { state: 4 }, []);
  return { c, cb, u: cb.units.find((x) => x.side === 'pc')!, e: cb.units.find((x) => x.side === 'foe')! };
};
const after = (cb: Combat, n: number) => (cb.fx || []).filter((x) => x.n > n);

describe('presentation events', () => {
  it('a shot emits a shot event, a reload a reload event, a jam clear a clear event', () => {
    const { c, cb, u, e } = fight();
    expect((cb.fx || []).some((x) => x.k === 'turn')).toBe(true);
    let n0 = cb.fxSeq || 0; u.ap = 9;
    const r = resolveAttack(cb, { state: 3 }, u, e, 'shot', c);
    const shot = after(cb, n0).find((x) => x.k === 'shot')!;
    expect(shot).toBeTruthy();
    expect(shot).toMatchObject({ unit: u.id, target: e.id, from: '1,5', to: '3,4', hit: r.hit, crit: r.crit, dmg: r.damage, weapon: u.weapon });
    n0 = cb.fxSeq!; u.ammo = 0; u.mags = [7]; u.ap = 9;
    expect(reload(cb, u)).toBeNull();
    const rl = after(cb, n0).find((x) => x.k === 'reload')!;
    expect(rl).toMatchObject({ unit: u.id, at: u.pos, how: 'mag' }); expect(rl.dur).toBeGreaterThan(500);
    // the counts the reload card draws (fx/reload.ts): what was in the gun, what is in it now, its size
    expect(rl).toMatchObject({ left: 0, ammo: 7 }); expect(rl.cap).toBeGreaterThanOrEqual(7);
    expect(rl.noDrop).toBeUndefined(); // a speed reload with spares of its own: the old one lands in the pile
    // an enemy carries its tier's spares and speed-reloads: its old magazine lands in the pile too
    n0 = cb.fxSeq!; e.ammo = 0; e.ap = 9; expect(e.mags?.length).toBeGreaterThan(0);
    expect(reload(cb, e)).toBeNull();
    let er = after(cb, n0);
    expect(er.find((x) => x.k === 'reload')!.noDrop).toBeUndefined(); expect(er.some((x) => x.k === 'pile')).toBe(true);
    // unlimited spares (a companion, a twin: no mags) drop nothing in the pile: the event says so (the card shows no drop)
    n0 = cb.fxSeq!; e.mags = undefined; e.ammo = 0; e.ap = 9;
    expect(reload(cb, e)).toBeNull();
    er = after(cb, n0);
    expect(er.find((x) => x.k === 'reload')).toMatchObject({ unit: e.id, how: 'mag', left: 0, noDrop: true });
    expect(er.some((x) => x.k === 'pile')).toBe(false);
    n0 = cb.fxSeq!; u.jammed = true; u.ap = 9; expect(clearJam(cb, u)).toBeNull();
    expect(after(cb, n0).map((x) => x.k)).toEqual(['clear']);
  });
  it('a weapon skill volley marks its shots as a chain', () => {
    const { c, cb, u, e } = fight();
    u.weapon = 'drifter_revolver'; u.ammo = 6; u.ap = 9; const n0 = cb.fxSeq || 0;
    expect(useWeaponSkill(cb, { state: 8 }, u, e, c)).toBeNull();
    const evs = after(cb, n0);
    expect(evs[0]).toMatchObject({ k: 'volley', mode: 'skill' });
    expect(evs.filter((x) => x.k === 'shot' && x.chain).length).toBeGreaterThan(0);
  });
  it('events never change the dice, and the queue is capped between actions', () => {
    const a = fight(), b = fight();
    a.u.ap = 9; b.u.ap = 9; b.cb.fx = undefined;
    const ra = resolveAttack(a.cb, { state: 11 }, a.u, a.e, 'shot', a.c), rb = resolveAttack(b.cb, { state: 11 }, b.u, b.e, 'shot', b.c);
    expect(ra).toEqual(rb);
    // one action keeps all it emits (a long hostile phase); the list is trimmed before the next action
    const had = a.cb.fx!.length; for (let i = 0; i < 100; i++) emitFx(a.cb, 'x');
    expect(a.cb.fx!.length).toBe(had + 100);
    trimFx(a.cb); expect(a.cb.fx!.length).toBe(FX_CAP); expect(a.cb.fx![FX_CAP - 1].n).toBe(a.cb.fxSeq);
  });
  it('area-map actions keep their events in the story', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'fx');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
    const id = Object.keys(g.characters)[0], at = positionsOf(g)[id], [x, y] = at.split(',').map(Number);
    const to = [x + 1 + ',' + y, x - 1 + ',' + y, x + ',' + (y + 1), x + ',' + (y - 1)].find((t) => standable(zoneMap(g), t) && !storyObjects(g).some((o) => o.pos === t))!;
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to, how: 'move' }, 'host');
    const mv = (g.story.fx || []).find((e) => e.k === 'move')!;
    expect(mv).toMatchObject({ unit: 'pc-' + id, from: at, to }); expect(g.story.fxSeq).toBe(g.story.fx!.at(-1)!.n);
  });
});
