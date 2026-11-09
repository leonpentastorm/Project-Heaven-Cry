// The combat action list's engine-driven parts (plan 2.9, 3): weapon-granted actions show only for the weapons that
// grant them, by their own names; the Perks tab only for holders; the Class tab with the class emblem and only the
// moves the rank has unlocked.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, newCharacter, startCombat, MAPS, type Character } from '@engine';
import { actionGroups, catalogue, pkId, classOf, pickChoice, wantsDetail, perkEntries, PK, PKI } from './commands';
import { beforeAll as beforeAllAdv, afterAll as afterAllAdv } from 'vitest';
import { _setAdvancedLive } from '@engine';
// Class Roster Revision 3 shelves advanced classes; this file's advanced-move UI tests turn them on (test-only switch).
beforeAllAdv(() => _setAdvancedLive(true)); afterAllAdv(() => _setAdvancedLive(null));

const charWith = (o: Partial<Character> = {}): Character => {
  const a = ARCHETYPES.find((x: any) => x.id === 'sharpshooter') || ARCHETYPES[0];
  const c = newCharacter('c1', 'p1', { name: 'T', portrait: '', origin: 'x', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} });
  return Object.assign(c, o);
};
const fight = (c: Character) => {
  const cb = startCombat('t', { ...MAPS.yard }, [{ c, pos: '1,5' }], [{ name: 'E', tier: 'soldier', weapon: 'service_pistol', at: 'J6' }], 'easy', { state: 5 }, []);
  const u = cb.units.find((x: any) => x.side === 'pc')!; cb.turn = cb.order.indexOf(u.id); u.ap = 6;
  const g = { characters: { [c.id]: c }, story: { scene: { n: 1 }, round: 1 }, sessionN: 1 };
  return { cb, u, g };
};
const ids = (gr: any[], tab: string) => (gr.find((x) => x[3] === tab)?.[1] || []).map((i: any) => i[0]);
const labels = (gr: any[], tab: string) => (gr.find((x) => x[3] === tab)?.[1] || []).map((i: any) => i[1]);

describe('weapon-granted actions in the action list', () => {
  it('a bow shows no Clear jam and no magazine; it nocks arrows', () => {
    const { cb, u, g } = fight(charWith()); u.weapon = 'recurve_bow'; u.mags = []; u.loose = 10; u.ammo = 0;
    const gr = actionGroups(cb, u, null, { g });
    expect(ids(gr, 'utility')).not.toContain('clear'); expect(ids(gr, 'utility')).not.toContain('load');
    expect(labels(gr, 'utility')).toContain('Nock an arrow');
    expect(ids(gr, 'attack')).not.toContain('brace');
  });
  it('a revolver reloads with a speedloader; an LMG braces; a knife reloads nothing and holds a strike', () => {
    const { cb, u, g } = fight(charWith());
    u.weapon = 'drifter_revolver'; u.ammo = 2; u.mags = [6];
    // Rules 1.9: a gun with tracked spares offers the speed and the tactical reload, by its own word.
    expect(labels(actionGroups(cb, u, null, { g }), 'utility')).toContain('Speedloader (speed)');
    expect(labels(actionGroups(cb, u, null, { g }), 'utility')).toContain('Speedloader (tactical)');
    u.weapon = 'hellraiser_lmg'; expect(ids(actionGroups(cb, u, null, { g }), 'attack')).toContain('brace');
    u.weapon = 'combat_knife';
    const gr = actionGroups(cb, u, null, { g });
    expect(ids(gr, 'utility')).not.toContain('reload');
    expect(labels(gr, 'attack')).toContain('Hold a strike');
  });
  it('a disabled weapon action carries the engine\'s reason', () => {
    const { cb, u, g } = fight(charWith()); u.weapon = 'service_pistol'; u.jammed = false;
    const e = catalogue(cb, u, null, { g }).find((x) => x.action === 'clear')!;
    expect(e.why).toBe('Not jammed.');
  });
});

describe('the Perks and Class tabs', () => {
  it('no Perks tab without an active item; a holder sees it with the AP and uses', () => {
    const plain = fight(charWith());
    expect(actionGroups(plain.cb, plain.u, plain.g.characters.c1, { g: plain.g }).some((x) => x[3] === 'perks')).toBe(false);
    const c = charWith({ perks: [{ id: 'earthbreaker', tier: 'mastered' }] }), f = fight(c);
    const gr = actionGroups(f.cb, f.u, c, { g: f.g }), pk = gr.find((x) => x[3] === 'perks')!;
    expect(pk).toBeTruthy();
    expect(pk[1][0][0]).toBe(pkId({ id: 'perk:earthbreaker', actionId: 'earthbreaker' }));
    expect(pk[1][0][2]).toMatch(/4 AP · 1\/1 combat/);
  });
  it('the Class tab lists the moves the rank unlocks, under the class name, with its emblem', () => {
    const c = charWith({ classId: 'gunslinger' as any }); c.classId = 'marksman'; c.advancedClass = 'gunslinger';
    const f = fight(c), gr = actionGroups(f.cb, f.u, c, { g: f.g }), cl = gr.find((x) => x[3] === 'class')!;
    expect(cl[0]).toMatch(/CLASS · GUNSLINGER/);
    expect(cl[1].map((i: any) => i[1])).toEqual(expect.arrayContaining(['Six for Six', 'Called Shot']));
    expect(cl[1].map((i: any) => i[1])).not.toContain('The Draw'); // automatic at the fight's start: no dead button
    const k = classOf(c)!; expect(k.icon).toMatch(/^data:image\/svg\+xml/); expect(k.ink).toBe('#F2A54A');
  });
});

describe('the Perks tab: items used from another action are read-only (Leon, 9 Nov 2026)', () => {
  it('Overdraw, Pure Heart and The Twin Pays have no Confirm (no pk: action) but a row to read, and never become turn-card commands', () => {
    const c = charWith({ skills: { ...charWith().skills, will_power: 10 } as any, perks: [{ id: 'the_twin_pays', tier: 'mastered' }] }), f = fight(c);
    const gr = actionGroups(f.cb, f.u, c, { g: f.g }), rows = (gr.find((x) => x[3] === 'perks')?.[1] || []) as any[];
    const keys = ['skill:will_power.3', 'skill:will_power.5', 'perk:the_twin_pays'];
    // not one of them runs from the tab (a pk: id is a Confirm)
    for (const k of keys) expect(rows.some((r) => r[0].startsWith(PK + k + '#'))).toBe(false);
    const ro = rows.filter((r) => r[0].startsWith(PKI));
    expect(ro.map((r) => r[0]).sort()).toEqual(keys.map((k) => PKI + k).sort());
    expect(ro.find((r) => r[0] === PKI + 'skill:will_power.3')).toMatchObject({ 1: 'Overdraw', 2: 'on Pump · 1/1 combat' });
    expect(ro.find((r) => r[0] === PKI + 'skill:will_power.5')![2]).toMatch(/^automatic/);
    expect(ro.find((r) => r[0] === PKI + 'perk:the_twin_pays')![3]).toMatch(/^Used from Begin\. /);
    expect(catalogue(f.cb, f.u, c, { g: f.g }).some((e) => e.action.startsWith(PKI))).toBe(false);
  });
});

describe('a perk action\'s detail (picks, words, names)', () => {
  it('maps a typed option label to its id; a multi pick keeps each word', () => {
    const e = { options: [{ id: 'head', label: 'Head' }, { id: 'arm', label: 'Arm' }], pickMulti: 1 };
    expect(pickChoice(e, 'Head')).toBe('head'); expect(pickChoice(e, 'somewhere')).toBe('somewhere');
    expect(pickChoice({ options: [{ id: 'fire', label: 'FIRE' }, { id: 'push', label: 'PUSH' }], pickMulti: 3 }, 'FIRE, push')).toBe('fire push');
  });
  it('Called Shot offers head, arm or leg in the Class tab and wants a detail', () => {
    const c = charWith({ classId: 'gunslinger' as any }); c.classId = 'marksman'; c.advancedClass = 'gunslinger';
    const f = fight(c), e = perkEntries(f.g, f.cb, f.u, c, 'combat').find((x: any) => x.actionId === 'called_shot')!;
    expect(e.options!.map((o: any) => o.id)).toEqual(['head', 'arm', 'leg']); expect(wantsDetail(e, null)).toBe(true);
  });
});
