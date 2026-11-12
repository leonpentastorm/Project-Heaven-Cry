// The Calls pad (game/callView.ts, the Calls tab of game/commands.ts): built on real fights through the engine. The
// screen works out no number: every cost, reach, step text, save TN and refusal is the engine's.
import { describe, expect, it } from 'vitest';
import { CALL, callPad, callRangeAt, actionsFor, previewDescriptor, stepOn, ORDER_THINGS, orderMax } from '@engine';
import { physFight } from '../../../../packages/engine/test/helpers/physfight';
import { callChips } from './callView';
import { actionGroups, TAB_NAME } from './commands';

const GAMMAS = ['authority', 'charisma', 'eloquence', 'lore_master', 'reaction_speed', 'vigilant', 'sensory', 'intimidation', 'implication'];
const none = Object.fromEntries(GAMMAS.map((s) => [s, 0]));
function fight(skills: Record<string, number>, o: { ally?: boolean } = {}) {
  const f = physFight([{ weapon: 'service_pistol', skills: { ...none, ...skills } }, ...(o.ally ? [{ name: 'Ally', weapon: 'service_pistol', skills: { ...none } }] : [])], [{}]);
  f.pcs.forEach((u, i) => f.put(u, 2 + i + ',2')); f.put(f.foe, '6,2');
  f.cb.order = [...f.pcs.map((u) => u.id), f.foe.id]; f.turn(f.pc);
  return f;
}
const chips = (f: any) => f.bound(() => callChips(f.g, f.cb, f.unit(f.pc.id)));
const tabs = (f: any) => f.bound(() => actionGroups(f.cb, f.unit(f.pc.id), f.char(f.pc), { g: f.g, noNarrator: true }));

describe('the Calls tab', () => {
  it('the Calls tab\'s name', () => { expect(TAB_NAME.calls).toBe('Calls'); });
  it('no talking skill: no Calls tab at all', () => {
    const f = fight({});
    expect(chips(f)).toEqual([]);
    expect(tabs(f).some((gr: any) => gr[3] === 'calls')).toBe(false);
  });
  it('three talking skills: the tab comes last, one row per Call, with the engine\'s cost, reach and step text', () => {
    const f = fight({ charisma: 3, intimidation: 5, authority: 7 }, { ally: true });
    const G = tabs(f), last = G[G.length - 1];
    expect(last[3]).toBe('calls');
    const pad = f.bound(() => callPad(f.cb, f.unit(f.pc.id)));
    expect(last[1].map((r: any) => r[0])).toEqual(pad.map((e: any) => 'cl:' + e.id));
    expect(last[1].map((r: any) => r[0]).sort()).toEqual(['cl:call.order', 'cl:call.rally', 'cl:call.threaten']);
    const C = chips(f);
    for (const c of C) {
      const e = pad.find((x: any) => x.id === c.id)!;
      expect(c).toMatchObject({ name: e.name, ap: e.ap, range: e.range, step: e.step, text: e.text, ok: e.ok, aim: e.aim });
      expect(c.range).toBe(callRangeAt(e.level));
      expect(c.apText).toBe(e.ap + ' AP'); expect(c.reach).toBe(e.range + ' tiles');
      expect(c.text).toBe(CALL[c.id].steps[e.step - 1].text);
      const row = last[1].find((r: any) => r[0] === c.action)!;
      expect(row[2]).toBe(c.apText + ' · ' + c.reach); expect(row[3]).toContain(c.text);
    }
    // 5 points: 1 AP; a hindering Call shows its save and the TN from this speaker
    const th = C.find((c: any) => c.id === 'call.threaten')!, e = pad.find((x: any) => x.id === 'call.threaten')!;
    expect(th.ap).toBe(1); expect(th.save).toBe('Heart save, TN ' + e.save!.tn); expect(th.aimWord).toBe('an enemy');
    expect(C.find((c: any) => c.id === 'call.rally')!.save).toBe('');
    // the next step is named with the points it opens at
    expect(C.find((c: any) => c.id === 'call.rally')!.next).toMatch(/^At 7 Charisma: /);
    expect(C.find((c: any) => c.id === 'call.order')!.next).toBe('');
  });
  it('refused by the engine: greyed with its reason (Silenced; AP short)', () => {
    const f = fight({ charisma: 3 }, { ally: true });
    f.unit(f.pc.id).ap = 1;
    let c = chips(f)[0];
    expect(c.ok).toBe(false); expect(c.why).toBe('Needs 2 AP.');
    expect(tabs(f).find((gr: any) => gr[3] === 'calls')[1][0][4]).toBe('Needs 2 AP.');
    f.unit(f.pc.id).ap = 6; (f.unit(f.pc.id).conds ||= {} as any).silenced = 2;
    c = chips(f)[0];
    expect(c.ok).toBe(false); expect(c.why).toMatch(/Silenced/);
  });
});

// A picked Call runs on the one action flow (game/actionFlow.ts): who a click takes, what to ask next, the preview in
// words, the reach and Order's things are the engine's descriptor and preview (descriptors.ts).
const pv = (f: any, id: string, picks: any = {}) => previewDescriptor(f.g, f.pc.id, 'cl:' + id, picks, 'host')!;
const desc = (f: any, id: string) => actionsFor(f.g, f.pc.id, 'host').find((d) => d.id === 'cl:' + id)!;
describe('a picked Call', () => {
  it('its aim decides who a click takes: an enemy, an ally, or yourself too', () => {
    const f = fight({ charisma: 3, intimidation: 3, lore_master: 3 }, { ally: true });
    const me = f.unit(f.pc.id), ally = f.unit(f.pcs[1].id), foe = f.unit(f.foe.id);
    const step = (id: string) => desc(f, id).picks.find((s) => s.key === 'targetId')!;
    expect(step('call.threaten').choices).toEqual([foe.id]);
    expect(step('call.rally').choices).toEqual([ally.id]);
    expect(step('call.name_it').choices!.sort()).toEqual([me.id, ally.id].sort()); expect(step('call.name_it').optional).toBe(true);
    const C = chips(f), by = (id: string) => C.find((c: any) => c.id === id)!;
    expect(pv(f, 'call.threaten').ask).toBe('Click an enemy within ' + by('call.threaten').reach + '.');
    expect(pv(f, 'call.rally').ask).toBe('Click an ally within ' + by('call.rally').reach + '.');
    expect(pv(f, 'call.name_it').ask).toBeNull(); // yourself, when nobody is picked
    expect(pv(f, 'call.rally', { targetId: ally.id }).ask).toBeNull();
  });
  it('the preview in words: the notes, and for a hindering Call who saves with what against which TN', () => {
    const f = fight({ charisma: 3, intimidation: 3 }, { ally: true });
    const ally = f.unit(f.pcs[1].id), foe = f.unit(f.foe.id);
    const before = JSON.stringify(f.cb);
    const r = pv(f, 'call.rally', { targetId: ally.id });
    expect(r.ok).toBe(true); expect(r.action).toMatchObject({ type: 'combat/call', id: 'call.rally', targetId: ally.id });
    expect(r.lines.filter((l) => l.k === 'note').length).toBeGreaterThan(0); expect(r.lines.some((l) => l.k === 'save')).toBe(false);
    const t = pv(f, 'call.threaten', { targetId: foe.id });
    expect(t.ok).toBe(true); expect(t.lines.find((l) => l.k === 'save')!.text).toMatch(new RegExp('^' + foe.name + ' rolls a Heart save against TN \\d+$'));
    expect(JSON.stringify(f.cb)).toBe(before); // a preview changes nothing
    // out of reach: the engine's reason
    f.put(f.foe, '19,2');
    const far = pv(f, 'call.threaten', { targetId: foe.id });
    expect(far.ok).toBe(false); expect(far.why).toMatch(/Too far to be heard/); expect(far.action).toBeNull();
  });
  it('the reach on the grid: every tile within the Call\'s range, the speaker\'s own included', () => {
    const f = fight({ charisma: 3 }, { ally: true });
    const me = f.unit(f.pc.id), c = chips(f)[0], R = new Set(pv(f, c.id).marks.tiles.filter((t) => t.kind === 'reach').map((t) => t.tile));
    expect(R.has(me.pos)).toBe(true);
    const [x, y] = me.pos.split(',').map(Number);
    expect(R.has(x + c.range + ',' + y)).toBe(x + c.range < f.cb.map.w); expect(R.has(x + c.range + 1 + ',' + y)).toBe(false);
  });
  it('Order: one thing (two at step 3), move from step 2, and a tile for a move', () => {
    expect(ORDER_THINGS.map((t) => t[0])).toEqual(['reload', 'stand', 'pickup', 'move']);
    expect(orderMax(1)).toBe(1); expect(orderMax(3)).toBe(2);
    const f = fight({ authority: 7 }, { ally: true });
    const me = f.unit(f.pc.id), ally = f.unit(f.pcs[1].id), d = desc(f, 'call.order'), opt = d.picks.find((s) => s.key === 'opt')!;
    expect(opt.max).toBe(2); expect(opt.options!.every((o) => !o.why)).toBe(true);
    const tile = d.picks.find((s) => s.key === 'tile')!;
    expect(stepOn(tile, { opt: ['stand'] })).toBe(false); expect(stepOn(tile, { opt: ['stand', 'move'] })).toBe(true);
    expect(pv(f, 'call.order', { targetId: ally.id }).ask).toBe('Pick what to order below.');
    expect(pv(f, 'call.order', { targetId: ally.id, opt: ['move'] }).ask).toBe('Now click the tile they move to.');
    // a speaker at step 1: MOVE is greyed with when it opens
    const f1 = fight({ authority: 1 }, { ally: true });
    expect(desc(f1, 'call.order').picks.find((s) => s.key === 'opt')!.options!.find((o) => o.id === 'move')!.why).toMatch(/^From 3 points of /);
    // through the engine: an ally told to stand up and move
    ally.prone = true;
    const [ax, ay] = ally.pos.split(',').map(Number), to = ax + ',' + (ay + 1);
    const r = pv(f, 'call.order', { targetId: ally.id, tile: to, opt: ['stand', 'move'] });
    expect(r.why).toBeNull(); expect(r.ok).toBe(true);
    f.act(r.action as any);
    expect(f.unit(ally.id).prone).toBeFalsy(); expect(f.unit(ally.id).pos).toBe(to);
    void me;
  });
});
