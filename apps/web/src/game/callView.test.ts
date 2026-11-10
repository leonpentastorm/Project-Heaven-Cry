// The Calls pad (game/callView.ts, the Calls tab of game/commands.ts): built on real fights through the engine. The
// screen works out no number: every cost, reach, step text, save TN and refusal is the engine's.
import { describe, expect, it } from 'vitest';
import { CALL, callPad, callRangeAt } from '@engine';
import { physFight } from '../../../../packages/engine/test/helpers/physfight';
import { callChips, callItems, callAction, parseCall, callTile, callTakes, callPrompt, callPreviewOf, callLines, callReach, orderPicks, orderToggle, orderOpt, orderMax, ORDER_THINGS } from './callView';
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
  it('ids: a Call action and back', () => {
    expect(callAction('call.rally')).toBe('cl:call.rally'); expect(parseCall('cl:call.rally')).toBe('call.rally'); expect(parseCall('tq:main:cut')).toBeNull(); expect(parseCall(null)).toBeNull();
    expect(TAB_NAME.calls).toBe('Calls');
  });
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
    expect(f.bound(() => callItems(f.g, f.cb, f.unit(f.pc.id)))[0][4]).toBe('Needs 2 AP.');
    f.unit(f.pc.id).ap = 6; (f.unit(f.pc.id).conds ||= {} as any).silenced = 2;
    c = chips(f)[0];
    expect(c.ok).toBe(false); expect(c.why).toMatch(/Silenced/);
  });
});

describe('a picked Call', () => {
  it('its aim decides who a click takes: an enemy, an ally, or yourself too', () => {
    const f = fight({ charisma: 3, intimidation: 3, lore_master: 3 }, { ally: true });
    const me = f.unit(f.pc.id), ally = f.unit(f.pcs[1].id), foe = f.unit(f.foe.id);
    expect([callTakes('enemy', me, foe), callTakes('enemy', me, ally), callTakes('enemy', me, me)]).toEqual([true, false, false]);
    expect([callTakes('ally', me, foe), callTakes('ally', me, ally), callTakes('ally', me, me)]).toEqual([false, true, false]);
    expect([callTakes('self-or-ally', me, foe), callTakes('self-or-ally', me, ally), callTakes('self-or-ally', me, me)]).toEqual([false, true, true]);
    const C = chips(f), by = (id: string) => C.find((c: any) => c.id === id)!;
    expect(callPrompt(by('call.threaten'), {}, '')).toBe('Click an enemy within ' + by('call.threaten').reach + '.');
    expect(callPrompt(by('call.rally'), {}, '')).toBe('Click an ally within ' + by('call.rally').reach + '.');
    expect(callPrompt(by('call.name_it'), {}, '')).toBeNull(); // yourself, when nobody is picked
    expect(callPrompt(by('call.rally'), { target: ally }, '')).toBeNull();
  });
  it('the preview in words: the notes, and for a hindering Call who saves with what against which TN', () => {
    const f = fight({ charisma: 3, intimidation: 3 }, { ally: true });
    const me = f.unit(f.pc.id), ally = f.unit(f.pcs[1].id), foe = f.unit(f.foe.id);
    const before = JSON.stringify(f.cb);
    const r = f.bound(() => callPreviewOf(f.g, f.cb, me, 'call.rally', { targetId: ally.id }));
    expect(r.ok).toBe(true);
    const L = callLines(f.cb, r);
    expect(L.notes.length).toBeGreaterThan(0); expect(L.save).toBe('');
    if (r.gives) expect(L.gives).toBe(ally.name + ' gets ' + r.gives.ap + ' AP ' + r.gives.when);
    const t = f.bound(() => callPreviewOf(f.g, f.cb, me, 'call.threaten', { targetId: foe.id }));
    expect(t.ok).toBe(true); expect(t.save).toBeTruthy();
    expect(callLines(f.cb, t).save).toBe(foe.name + ' rolls a Heart save against TN ' + t.save!.tn);
    expect(JSON.stringify(f.cb)).toBe(before); // a preview changes nothing
    // out of reach: the engine's reason
    f.put(f.foe, '19,2');
    const far = f.bound(() => callPreviewOf(f.g, f.cb, me, 'call.threaten', { targetId: foe.id }));
    expect(far.ok).toBe(false); expect(far.why).toMatch(/Too far to be heard/);
  });
  it('the reach on the grid: every tile within the Call\'s range, the speaker\'s own included', () => {
    const f = fight({ charisma: 3 }, { ally: true });
    const me = f.unit(f.pc.id), c = chips(f)[0], R = callReach(f.cb, me, c.range);
    expect(R.has(me.pos)).toBe(true);
    const [x, y] = me.pos.split(',').map(Number);
    expect(R.has(x + c.range + ',' + y)).toBe(x + c.range < f.cb.map.w); expect(R.has(x + c.range + 1 + ',' + y)).toBe(false);
  });
  it('Order: one thing (two at step 3), move from step 2, and a tile for a move', () => {
    expect(ORDER_THINGS.map((t) => t[0])).toEqual(['reload', 'stand', 'pickup', 'move']);
    expect(orderMax(1)).toBe(1); expect(orderMax(3)).toBe(2);
    expect(orderPicks(['move'], 1)).toEqual([]); expect(orderPicks(['move'], 2)).toEqual(['move']);
    expect(orderToggle([], 'reload', 1)).toEqual(['reload']);
    expect(orderToggle(['reload'], 'stand', 1)).toEqual(['stand']); // one thing: the new pick replaces the old
    expect(orderToggle(['reload'], 'stand', 3)).toEqual(['reload', 'stand']);
    expect(orderToggle(['reload', 'stand'], 'move', 3)).toEqual(['stand', 'move']);
    expect(orderToggle(['reload', 'stand'], 'reload', 3)).toEqual(['stand']);
    expect(orderOpt(['stand', 'move'], 3)).toBe('stand+move'); expect(orderOpt(null, 3)).toBe('');
    expect(callTile('call.order', 3, 'stand+move')).toBe('need'); expect(callTile('call.order', 3, 'reload')).toBeNull();
    expect(callTile('call.cue', 1, '')).toBeNull(); expect(callTile('call.cue', 2, '')).toBe('may'); expect(callTile('call.warn', 1, '')).toBe('may'); expect(callTile('call.rally', 3, '')).toBeNull();
    // through the engine: an ally told to stand up and move
    const f = fight({ authority: 7 }, { ally: true });
    const me = f.unit(f.pc.id), ally = f.unit(f.pcs[1].id), c = chips(f)[0];
    expect(callPrompt(c, { target: ally }, '')).toBe('Pick what to order below.');
    expect(callPrompt(c, { target: ally }, 'move')).toBe('Now click the tile they move to.');
    ally.prone = true;
    const [ax, ay] = ally.pos.split(',').map(Number), to = ax + ',' + (ay + 1);
    const pv = f.bound(() => callPreviewOf(f.g, f.cb, me, 'call.order', { targetId: ally.id, tile: to, opt: orderOpt(['stand', 'move'], c.step) }));
    expect(pv.why).toBeNull(); expect(pv.ok).toBe(true);
    f.act({ type: 'combat/call', unitId: me.id, id: 'call.order', targetId: ally.id, tile: to, opt: 'stand+move' } as any);
    expect(f.unit(ally.id).prone).toBeFalsy(); expect(f.unit(ally.id).pos).toBe(to);
  });
});
