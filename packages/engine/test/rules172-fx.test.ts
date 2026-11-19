// @ts-nocheck (test fixtures: plain objects)
// Rules 1.72 (0.32 step 2): the effects lane's events, each sent by the engine and proved through the reducer.
//   5700 a cleanse op says what it removed (boon, word cleanse, cond)         Soothe
//   5701 a tie the tie op ends is an event (stance, what untie)                Let go
//   5702 a prayer's hurt carries its element (the damage type)                Lightning Rod
//   5703 Everyone Home's shields go through the one mend's effect (boon ward)  Everyone Home
//   5704 a prayer that only changes a state says its data name (stance)      Luck on oneself
//   5705 the standing vow: set out of a fight by faith/vow, sworn as each fight starts; changed only where allowed
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { condOn, WHISPER, FAITH_PATRON, VOW, type Action } from '../src';
import { fightWith, storyWith } from './helpers/perkfight';

const fxOf = (cb: any, k: string) => (cb.fx || []).filter((e: any) => e.k === k);
const since = (cb: any, n: number) => (cb.fx || []).filter((e: any) => e.n > n);
const lastN = (cb: any) => ((cb.fx || []).at(-1)?.n ?? 0);

function holy(patron: string) {
  const f = fightWith([{ name: 'Priest', skills: { faith: 7 } } as any, { name: 'Ally' }], [{ at: 'F6' }, { at: 'G6' }]);
  const c = f.g.characters[f.pc.charId!];
  c.belief = { kind: 'faithful', patron }; c.patron = patron; c.devotion = 10;
  c.skills = { ...c.skills, faith: 7 }; c.attrs = { ...c.attrs, virtue: 7 };
  const [pr, al] = f.pcs, [f0, f1] = f.foes;
  pr.pos = '2,5'; al.pos = '2,6'; f0.pos = '5,5'; f1.pos = '6,5';
  for (const u of f.cb.units) { u.hp = u.maxHp = 2000; u.conds = {}; u.shield = 0; }
  f.turn(pr);
  return { f, pr, al, foe: f0, pray: (kind: string, id: string, x: any = {}) => f.act({ type: 'faith/pray', unitId: pr.id, kind, id, ...x } as Action) };
}
function tend() { // rules 1.75: Soothe is Steady Hands II's, Tug Pull Together's
  const s = storyWith([{ name: 'Mender', skills: { empathy: 5, camaraderie: 5 }, perks: { steady_hands: 'II', pull_together: 'I' }, level: 5, weapon: 'service_pistol' } as any, { name: 'Ally', level: 5, weapon: 'service_pistol' } as any]);
  s.g.characters[s.chars[0].id].offHand = { id: 'attuner' };
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Tend', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '12,9', no_surrender: true }] } } } as any);
  const cb = () => s.g.combat, pcs = () => cb().units.filter((u) => u.side === 'pc');
  pcs()[0].pos = '3,3'; pcs()[1].pos = '4,3';
  const turn = () => { const c = cb(), u = pcs()[0]; c.turn = c.order.indexOf(u.id); delete c.window; c.window = undefined; };
  turn();
  const act = (id: string, x: any = {}) => { pcs()[0].ap = 9; return s.act({ type: 'combat/perk', unitId: pcs()[0].id, id, ...x } as any); };
  return { s, cb, pcs, act };
}

describe('rules 1.72: the effects lane\'s engine events', () => {
  it('5700: Soothe ends a condition and the cleanse says which (boon cleanse, its cond)', () => {
    const t = tend(), al = () => t.pcs()[1];
    t.act('verb:tend.bond', { targetId: al().id });
    const a = al(); a.conds = { ...(a.conds || {}), weakened: 2, slowed: 2 }; a.condAt = { weakened: 1, slowed: 2 };
    const n = lastN(t.cb());
    t.act('perk:steady_hands', { actionId: 'tend_soothe', targetId: al().id });
    expect(condOn(al(), 'slowed')).toBe(false);
    const ev = since(t.cb(), n).filter((e) => e.k === 'boon' && e.word === 'cleanse');
    expect(ev.map((e) => [e.target, e.cond])).toEqual([[al().id, 'slowed']]);
  });
  it('5701: Let go ends the Bond and says so (stance untie, the far end, the kind)', () => {
    const t = tend(), al = () => t.pcs()[1], me = () => t.pcs()[0];
    t.act('verb:tend.bond', { targetId: al().id });
    const n = lastN(t.cb());
    t.act('verb:tend.let_go', { targetId: al().id });
    const ev = since(t.cb(), n).filter((e) => e.k === 'stance' && e.what === 'untie');
    expect(ev.map((e) => [e.unit, e.target, e.how])).toEqual([[me().id, al().id, 'bond']]);
  });
  it('5706: Tug on an ally already beside the Mender says so (tending.json, the ally branch say); a far ally is drawn in', () => {
    const t = tend(), al = () => t.pcs()[1];
    t.act('verb:tend.bond', { targetId: al().id });
    let n = t.cb().log.length; t.act('perk:pull_together', { actionId: 'tend_tug', targetId: al().id });
    expect(t.cb().log.slice(n).join(' ')).toMatch(/already at their side/);
    al().pos = '7,3'; n = t.cb().log.length; t.act('perk:pull_together', { actionId: 'tend_tug', targetId: al().id });
    expect(t.cb().log.slice(n).join(' ')).toMatch(/draws Ally in along the Bond/); expect(t.cb().log.slice(n).join(' ')).not.toMatch(/already/);
  });
  it('5702: a storm prayer\'s hurt carries its element', () => {
    const h = holy('old_overcast'), n = lastN(h.f.cb);
    h.pray('hymn', 'lightning_rod', { targetId: h.foe.id });
    const hurts = since(h.f.cb, n).filter((e) => e.k === 'hurt' && e.target === h.foe.id);
    expect(hurts.length).toBeGreaterThan(0);
    for (const e of hurts) expect(e.element).toBe('lightning');
  });
  it('5703: Everyone Home\'s shield on each ally is numbered like any other (boon ward, its amount)', () => {
    const h = holy('mother_ember'), n = lastN(h.f.cb);
    h.pray('miracle', FAITH_PATRON.mother_ember.miracle.id);
    const wards = since(h.f.cb, n).filter((e) => e.k === 'boon' && e.word === 'ward');
    const pcs = h.f.cb.units.filter((u) => u.side === 'pc' && !u.dead);
    expect(wards.map((e) => e.target).sort()).toEqual(pcs.map((u) => u.id).sort());
    for (const e of wards) expect(e.amount).toBe(h.f.unit(e.target).shield);
  });
  it('5704: a prayer that changes only a state says its data name where it lands; one that heals does not', () => {
    const h = holy('nerukhan'), n = lastN(h.f.cb);
    h.pray('whisper', 'luck', { targetId: h.pr.id });
    const st = since(h.f.cb, n).filter((e) => e.k === 'stance' && e.what === 'prayer');
    expect(st.map((e) => [e.unit, e.word])).toEqual([[h.pr.id, WHISPER.luck.name]]);
    const g = holy('nerukhan'), m = lastN(g.f.cb); g.f.unit(g.al.id).hp = 100;
    g.pray('whisper', 'health', { targetId: g.al.id });
    expect(since(g.f.cb, m).some((e) => e.k === 'stance' && e.what === 'prayer')).toBe(false);
  });
  it('5705: the standing vow is set out of a fight and sworn as each fight starts; an old save has none', () => {
    const s = storyWith([{ name: 'Priest', skills: { faith: 3 } } as any, { name: 'Ally' }]);
    const pid = s.chars[0].id, aid = s.chars[1].id, c = () => s.g.characters[pid];
    c().belief = { kind: 'faithful', patron: 'nerukhan' }; c().patron = 'nerukhan';
    const shield = Object.keys(VOW).find((k) => VOW[k].needs_ally)!, plain = Object.keys(VOW).find((k) => !VOW[k].needs_ally && !VOW[k].needs_yielding_foe)!;
    expect(() => s.act({ type: 'faith/vow', unitId: pid, id: shield } as Action)).toThrow(/Name the ally/);
    s.act({ type: 'faith/vow', unitId: pid, id: shield, allyId: aid } as Action);
    expect(c().vowStanding).toEqual({ id: shield, allyCharId: aid });
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Vow', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '12,9' }] } } } as any);
    const u = s.g.combat.units.find((x) => x.charId === pid), al = s.g.combat.units.find((x) => x.charId === aid);
    expect(u.vow).toEqual({ id: shield, allyId: al.id, state: 'sworn' });
    expect(fxOf(s.g.combat, 'vow').some((e) => e.state === 'sworn' && e.unit === u.id)).toBe(true);
    // in a Survival run the vow changes only at a node whose kind's row says vow_change (the rest)
    (s.g as any).run = { note: { kind: 'shrine' } }; s.g.combat = null; s.g.phase = 'story';
    expect(() => s.act({ type: 'faith/vow', unitId: pid, id: plain } as Action)).toThrow(/at a rest/);
    (s.g as any).run = { note: { kind: 'rest' } };
    s.act({ type: 'faith/vow', unitId: pid, id: '' } as Action);
    expect(c().vowStanding).toEqual({ id: null });
    // an old save: no standing vow, the fight starts with none (it asks as before)
    const o = storyWith([{ name: 'Old', skills: { faith: 3 } } as any]); const oc = o.g.characters[o.chars[0].id];
    oc.belief = { kind: 'faithful', patron: 'nerukhan' }; oc.patron = 'nerukhan'; delete oc.vowStanding;
    o.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Old', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '12,9' }] } } } as any);
    expect(o.g.combat.units.find((x) => x.charId === oc.id).vow || null).toBeNull();
  });
});
