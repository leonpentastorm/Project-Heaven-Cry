// Conditions (engine foundations 2, review finding F4): one table (data/conditions.json through src/condtable.ts),
// one door (applyCond / endCond in magic.ts), one write of each flag (src/unitstate.ts). The table of every condition
// on every tier is test/golden/conditions.json; these are the rules' own sentences. The area shapes of the kit
// (kit.ts Area, the rest of F6) are at the end.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import {
  applyCond, endCond, setProne, hideAgain, restoreConds, clearConds, setCondRounds, condsAside, condOn, condMods, condDef, isBoon, isCondition, debuffsOf,
  rollInjury, bleedTick, hide, reveal, setBraced, setDowned, stagger, beginTurn, condTurnEnd, unitSave, condHit, CONDITION_ROWS,
  inArea, tilesIn, unitsIn, type Unit,
} from '../src';
import { onHook, onStat, genericOf } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

// stand-ins for an item on the two doors of an immunity (test only)
const DOOR: { query?: string; ids?: string[]; hook?: string; seen: string[]; injury: any[] } = { seen: [], injury: [] };
for (const id of ['weakened', 'bleeding', 'bleed', 'prone', 'dazed', 'hidden', 'guarded']) onStat(('immune:' + id) as any, (x: any) => (DOOR.query && x.u?.id === DOOR.query && (DOOR.ids || []).includes(id) ? 1 : 0));
onHook('cond_apply', (ctx: any) => { DOOR.seen.push(ctx.id); if (DOOR.hook && ctx.t?.id === DOOR.hook) { ctx.cancel = true; ctx.why = 'test'; } });
onHook('injury', (ctx: any) => { DOOR.injury.push({ loc: ctx.loc, called: !!ctx.called }); });
const clear = () => { delete DOOR.query; delete DOOR.ids; delete DOOR.hook; DOOR.seen = []; DOOR.injury = []; };

function field() {
  const f = fightWith([{}, {}], [{ tier: 'soldier', classic: true }, { tier: 'soldier', classic: true }]);
  const cb = f.cb; cb.objects = []; cb.zones = []; cb.hazards = [];
  const [a, w] = f.pcs, [t, o] = f.foes; a.pos = '5,5'; t.pos = '6,5'; w.pos = '1,9'; o.pos = '14,9';
  for (const u of cb.units) { u.hp = u.maxHp; setBraced(u, false); endCond(u, 'hidden', cb); }
  clear();
  const put = (id: string, opts: any = { skipSave: true }, who: Unit = t, rounds?: number) => withGame(f.g, () => applyCond(cb, f.g.rng, a, who, id, rounds, undefined, opts));
  return { f, cb, a, w, t, o, put, rng: f.g.rng };
}

describe('the condition table is the data', () => {
  it('every row loads; the engine keeps it in the table, as a flag or as a unit state, as the row says', () => {
    for (const r of CONDITION_ROWS) { const d = condDef(r.id)!; expect(d.engine).toBe(r.engine); expect(d.text).toBe(r.text); expect(!!d.boon).toBe(!!r.boon); expect(!d.noSave).toBe(r.save); }
    expect(condDef('left_brain_debuff')!.key).toBe('ldebuff'); expect(condDef('afraid')!.id).toBe('fear'); expect(condDef('stun')!.id).toBe('stunned');
  });
  it('durations are in one unit: rounds are the bearer\'s turn ends; "until" never ticks', () => {
    const x = field(); x.put('weakened'); expect(x.t.conds!.weakened).toBe(condDef('weakened')!.rounds);
    x.put('burning'); withGame(x.f.g, () => { for (let i = 0; i < 4; i++) condTurnEnd(x.cb, x.t, x.rng); });
    expect(condOn(x.t, 'weakened')).toBe(false); expect(condOn(x.t, 'burning')).toBe(true);
  });
  it('a boon has no family and nobody saves against it; a unit state is not put on by applyCond', () => {
    for (const id of ['guarded', 'inspired', 'quickened', 'sharpened', 'withdrawing', 'emplaced', 'witnessed', 'hopeful', 'last_turn']) { expect(isBoon(id), id).toBe(true); expect(condDef(id)!.fam, id).toBeUndefined(); }
    const x = field();
    for (const id of ['braced', 'downed', 'overwatch']) { expect(isCondition(id)).toBe(false); expect(x.put(id)).toBe(''); }
    expect(x.t.braced).toBe(false); expect(x.t.downed).toBe(false);
  });
  it('the numbers are the row\'s: Defense, Movement, vision, to hit and saves go on with the condition and come off with it', () => {
    const x = field(), def0 = x.t.def, mv0 = x.t.movement, vis0 = x.t.vision;
    x.put('guarded'); expect(x.t.def).toBe(def0 + condMods('guarded').defense!); x.put('guarded'); expect(x.t.def).toBe(def0 + 2); // no stacking
    x.put('corroded'); expect(x.t.def).toBe(def0 + 2 + condMods('corroded').defense!);
    x.put('slowed'); expect(x.t.movement).toBe(mv0 * condMods('slowed').moveMult!); x.put('blinded'); expect(x.t.vision).toBe(condMods('blinded').vision);
    const save0 = unitSave(x.t, 'heart'); x.put('shaken'); expect(unitSave(x.t, 'heart')).toBe(save0 + condMods('shaken').save!.heart!);
    const hit0 = condHit(x.t, x.a, x.cb); x.put('pinned'); expect(condHit(x.t, x.a, x.cb)).toBe(hit0 + condMods('pinned').hit!.own_attacks!); expect(hit0).toBe(condMods('blinded').hit!.own_attacks!);
    clearConds(x.t, x.cb); expect([x.t.def, x.t.movement, x.t.vision]).toEqual([def0, mv0, vis0]); expect(Object.keys(x.t.conds || {})).toEqual([]);
  });
});

describe('applyCond: the one door', () => {
  it('both doors of an immunity are asked for every condition, table or flag: the query and the hook', () => {
    for (const id of ['weakened', 'bleeding', 'prone', 'dazed', 'hidden', 'guarded']) {
      let x = field(); DOOR.query = x.t.id; DOOR.ids = [id]; expect(x.put(id), id + ' query').toMatch(/untouched/);
      expect(condOn(x.t, id) || x.t.bleed || x.t.prone || x.t.dazedNext || x.t.hidden, id).toBeFalsy();
      x = field(); DOOR.hook = x.t.id; expect(x.put(id), id + ' hook').toMatch(/untouched \(test\)/);
      expect(condOn(x.t, id) || x.t.bleed || x.t.prone || x.t.dazedNext || x.t.hidden, id).toBeFalsy();
    }
    const x = field(); DOOR.query = x.t.id; DOOR.ids = ['bleed']; x.put('bleeding'); expect(x.t.bleed || 0).toBe(0); // the data's word for it
    clear();
  });
  it('Bleeding lasts the row\'s 3 rounds: it bites at the start of three of the bearer\'s turns, then it is gone', () => {
    const x = field(); x.put('bleeding'); expect(x.t.bleed).toBe(condDef('bleeding')!.rounds);
    const hp0 = x.t.hp; let bites = 0;
    withGame(x.f.g, () => { for (let i = 0; i < 5; i++) { const was = x.t.hp; bleedTick(x.cb, x.t); if (x.t.hp < was) bites++; } });
    expect(bites).toBe(3); expect(x.t.bleed).toBe(0); expect(hp0 - x.t.hp).toBe(15); expect(debuffsOf(x.t)).toEqual([]);
  });
  it('knocked Prone ends Braced however it lands; dropping by choice keeps it (review, item 1583); standing, kneeling and dropping are the unit\'s own (setProne): nobody is asked', () => {
    let x = field(); setBraced(x.t, true); x.put('prone'); expect([x.t.prone, x.t.braced]).toEqual([true, false]);
    x = field(); setBraced(x.t, true); DOOR.hook = x.t.id; setProne(x.cb, x.t, true); expect([x.t.prone, x.t.braced]).toEqual([true, true]); expect(DOOR.seen).toEqual([]);
    setProne(x.cb, x.t, false); setProne(x.cb, x.t, true, { endBrace: true }); expect([x.t.prone, x.t.braced]).toEqual([true, false]); expect(DOOR.seen).toEqual([]); // kneeling on an order
    setProne(x.cb, x.t, false); expect(x.t.prone).toBe(false); expect(x.t.condAt?.prone).toBeUndefined(); clear();
  });
  it('Hidden as a condition keeps the same books as the Hide action; a Marked unit can\'t; hideAgain is the same entry', () => {
    const x = field(); x.put('hidden'); expect(x.t.hidden).toBe(true); expect(x.t.hideEntry).toBe(1); expect(x.cb.lastSeen?.pc?.[x.t.id]).toBe(x.t.pos);
    x.put('hidden'); expect(x.t.hideEntry).toBe(1); // already Hidden: not a second ambush
    endCond(x.t, 'hidden', x.cb); expect(x.t.hidden).toBe(false); expect(x.cb.lastSeen?.pc?.[x.t.id]).toBeUndefined();
    expect(withGame(x.f.g, () => hideAgain(x.cb, x.rng, x.t))).toBe(true); expect(x.t.hideEntry).toBe(1);
    endCond(x.t, 'hidden', x.cb); x.put('marked'); expect(withGame(x.f.g, () => hideAgain(x.cb, x.rng, x.t))).toBe(false); expect(withGame(x.f.g, () => hide(x.cb, x.t))).toMatch(/Marked/);
    endCond(x.t, 'marked', x.cb); withGame(x.f.g, () => { hide(x.cb, x.t); reveal(x.cb, x.t, 'test'); }); expect(x.t.hidden).toBe(false); expect(x.cb.lastSeen?.pc?.[x.t.id]).toBeUndefined();
  });
  it('the few other writes: setCondRounds, restoreConds (numbers applied once), condsAside (put back as they were)', () => {
    const x = field(), def0 = x.t.def;
    x.put('fear'); setCondRounds(x.t, 'afraid', 5); expect(x.t.conds!.fear).toBe(5); setCondRounds(x.t, 'fear', 0, { cb: x.cb }); expect(condOn(x.t, 'fear')).toBe(false);
    restoreConds(x.t, { guarded: 2, left_brain_debuff: 1, bleeding: 3 }); restoreConds(x.t, { guarded: 1 });
    expect(x.t.def).toBe(def0 + 2); expect(x.t.conds).toMatchObject({ guarded: 2, ldebuff: 1 }); expect(x.t.bleed || 0).toBe(0); // a flag is not carried this way
    x.put('disarmed'); const back = condsAside(x.t, ['disarmed', 'lowered']); expect(condOn(x.t, 'disarmed')).toBe(false); back(); expect(x.t.conds!.disarmed).toBe(99);
  });
  it('the generic cleanse op sees the flag conditions and never ends a boon', () => {
    const x = field(); x.put('guarded'); x.put('bleeding'); x.put('prone');
    const h: any = { u: x.a, cb: x.cb, g: x.f.g, info: { id: 't', name: 'T' } };
    expect(withGame(x.f.g, () => genericOf('cleanse')!.run!(h, { op: 'cleanse', target: 'target', condition: 'bleeding' }, { targetId: x.t.id }, x.rng))).toMatch(/shakes off bleeding/);
    withGame(x.f.g, () => genericOf('cleanse')!.run!(h, { op: 'cleanse', target: 'target', count: 9 }, { targetId: x.t.id }, x.rng));
    expect([x.t.bleed, x.t.prone, condOn(x.t, 'guarded')]).toEqual([0, false, true]);
  });
});

describe('one injury table (rollInjury) and the unit states', () => {
  it('an injury\'s Daze and Bleeding are conditions: the items are asked; a Called Shot names the place and asks the same hook', () => {
    let x = field(); x.t.injResist = 0;
    expect(withGame(x.f.g, () => rollInjury(x.rng, x.t, x.cb, x.a, { loc: 'head' }))).toBe(' · CALLED SHOT: head, Dazed'); expect(x.t.dazedNext).toBe(1); expect(DOOR.seen).toContain('dazed'); expect(DOOR.injury).toEqual([{ loc: 'head', called: true }]);
    x = field(); x.t.injResist = 0; DOOR.hook = x.t.id;
    expect(withGame(x.f.g, () => rollInjury(x.rng, x.t, x.cb, x.a, { loc: 'head' }))).toBe(' · CALLED SHOT: head'); expect(x.t.dazedNext || 0).toBe(0);
    x = field(); x.t.injResist = 0; expect(withGame(x.f.g, () => rollInjury(x.rng, x.t, x.cb, x.a, { loc: 'leg', side: 'left' }))).toBe(' · CALLED SHOT: left leg, half Movement');
    x = field(); x.t.injResist = 100; expect(withGame(x.f.g, () => applyCond(x.cb, x.rng, x.a, x.t, 'injured'))).toMatch(/injury resisted/); clear();
  });
  it('setDowned: back up clears the death saves; stagger keeps the larger; Dazed is spent by the turn it costs', () => {
    const x = field(); x.w.saves = { ok: 1, fail: 2 }; setDowned(x.w, true); setDowned(x.w, false); expect(x.w.saves).toEqual({ ok: 0, fail: 0 });
    stagger(x.t, 2); stagger(x.t, 1); expect(x.t.stunnedNext).toBe(2);
    x.put('dazed'); x.cb.turn = x.cb.order.indexOf(x.t.id); withGame(x.f.g, () => beginTurn(x.cb, x.rng));
    expect([x.t.dazedNext, x.t.stunnedNext]).toEqual([0, 0]); expect(debuffsOf(x.t)).toEqual([]);
  });
});

describe('kit.ts areas: one description, one "which tiles", one "who is in it"', () => {
  it('burst and aura are squares by the grid\'s distance; the aura leaves its own tile out', () => {
    expect(inArea({ shape: 'burst', at: '5,5', r: 1 }, '6,6')).toBe(true); expect(inArea({ shape: 'burst', at: '5,5', r: 1 }, '5,5')).toBe(true); expect(inArea({ shape: 'burst', at: '5,5', r: 1 }, '7,5')).toBe(false);
    expect(inArea({ shape: 'aura', at: '5,5', r: 1 }, '5,5')).toBe(false); expect(inArea({ shape: 'aura', at: '5,5', r: 1 }, '4,6')).toBe(true);
    const x = field(); expect(tilesIn(x.cb, { shape: 'burst', at: '0,0', r: 1 }).sort()).toEqual(['0,0', '0,1', '1,0', '1,1']); expect(tilesIn(x.cb, { shape: 'aura', at: '5,5', r: 1 })).toHaveLength(8);
  });
  it('a cone: within n tiles and about 45 degrees of the line, toward a tile or a direction; round by default, square for a Sigil PUSH', () => {
    const cone = { shape: 'cone' as const, from: '5,5', toward: '9,5', n: 3 };
    expect(inArea(cone, '5,5')).toBe(false); expect(inArea(cone, '8,5')).toBe(true); expect(inArea(cone, '9,5')).toBe(false); expect(inArea(cone, '7,7')).toBe(true); expect(inArea(cone, '6,7')).toBe(false); expect(inArea(cone, '4,5')).toBe(false);
    expect(inArea({ ...cone, toward: [1, 0] }, '8,5')).toBe(true);
    expect(inArea({ ...cone, n: 2 }, '7,7')).toBe(false); expect(inArea({ ...cone, n: 2, reach: 'square' }, '7,7')).toBe(true); // 2.83 as the crow flies, 2 by the grid
  });
  it('a line is the run of tiles toward a tile; a band is everything ahead within a width of that line', () => {
    const x = field(); expect(tilesIn(x.cb, { shape: 'line', from: '5,5', toward: '9,5', n: 2 })).toEqual(['6,5', '7,5']); expect(tilesIn(x.cb, { shape: 'line', from: '5,5', toward: '7,7' })).toEqual(['6,6', '7,7']);
    const band = { shape: 'band' as const, from: '5,5', toward: '9,5', width: 1.5 };
    expect(inArea(band, '12,6')).toBe(true); expect(inArea(band, '12,7')).toBe(false); expect(inArea(band, '4,5')).toBe(false); expect(inArea(band, '5,5')).toBe(false);
  });
  it('unitsIn: who stands in it, by the kit\'s rule of who counts (not dead, Downed or surrendered unless asked), a side, and whom to leave out', () => {
    const x = field(); x.o.pos = '7,5'; x.w.pos = '6,6';
    const burst = { shape: 'burst' as const, at: '6,5', r: 1 };
    expect(unitsIn(x.cb, burst).map((u) => u.id).sort()).toEqual([x.a.id, x.t.id, x.o.id, x.w.id].sort());
    expect(unitsIn(x.cb, burst, { side: 'foe', not: [x.t] })).toEqual([x.o]);
    setDowned(x.w, true); expect(unitsIn(x.cb, burst, { side: 'pc' })).toEqual([x.a]); expect(unitsIn(x.cb, burst, { side: 'pc', downed: true }).length).toBe(2);
    expect(unitsIn(x.cb, ['7,5', '1,1'])).toEqual([x.o]);
  });
});
