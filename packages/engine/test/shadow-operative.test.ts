// Classes 3.0, step 6 (rules 1.32; docs/design/shadow-spec.md): the verbs at work, the silent attack's spot-back, the
// Operative's moves, the other side and old saves. Numbers from data (rules.json shadow, shadow.json, classes.json).
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { resolveAttack, itemInfo, CLASS, SKILL, PERK, condOn, type Unit } from '../src';
import actionsJ from '../../../data/actions.json';
import { resOf, FOE_TAGS } from '../src/tactics';
import { skulks } from '../src/combat';
import { applyCond } from '../src/magic';
import { allVerbs } from '../src/effects/collect';
import shadowJ from '../../../data/shadow.json';
/** A verb's refusal in words, from its data (Classes 3.0 step 10: the grant's `why`, its reach's `why`). */
const grantOf = (id: string): any => (shadowJ as any).items.find((x: any) => x.id === id).effects.find((e: any) => e.op === 'grant_action');
const esc = (t: string) => new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));

const VERB = (id: string) => allVerbs().find((v: any) => v.id === id) as any;
const door = (ing: number, extra: CharSpec = {}): CharSpec => ({ ...extra, skills: { ingenuity: ing, ...(extra.skills || {}) }, attrs: { perception: Math.max(ing, 3), ...(extra.attrs || {}) } });
const operative = (ing = 7, extra: CharSpec = {}): CharSpec => ({ ...door(ing, extra), classId: 'infiltrator', level: 12, attrs: { perception: 8, ...(extra.attrs || {}) } });
type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const hideNow = (f: F, u: Unit) => withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(u.id), 'hidden', undefined, undefined, { skipSave: true }));
const shadow = (f: F, u: Unit) => resOf(f.unit(u.id), 'shadow');
const setShadow = (f: F, u: Unit, n: number) => { (f.unit(u.id).res ||= {}).shadow = n; };
const foeAt = (f: F, pos: string, blind = false) => { const t = f.unit(f.foe.id); t.pos = pos; if (blind) t.vision = 1; return t; };
const use = (f: F, u: Unit, id: string, targetId?: string) => f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:' + id, ...(targetId ? { targetId } : {}) } as any);

describe('the verbs at work', () => {
  const setup = (ing: number, foePos = '2,4') => {
    const f = fightWith([door(ing)], [{}]); const t = foeAt(f, foePos);
    const u = f.turn(f.pc); at(f, u, '1,4'); return { f, u: f.unit(u.id), t };
  };
  it('Lift, unseen: a spare magazine leaves the enemy for the pile on your tile', () => {
    const { f, u, t } = setup(3); hideNow(f, u);
    const before = (f.unit(t.id).mags || []).length;
    use(f, u, 'shadow.lift', t.id);
    expect((f.unit(t.id).mags || []).length).toBe(Math.max(0, before - 1));
  });
  it('Read Intent is a Vigilance perk now (rules 1.74 item 6009): no Shadow verb of that name; your Spot Reads its target', () => {
    expect(VERB('shadow.read_intent')).toBeUndefined();
    const spot = (perks: any) => { const f = fightWith([{ skills: { vigilant: 3 }, perks }], [{}]); const t = foeAt(f, '6,4'); const u = f.turn(f.pc); at(f, u, '1,4');
      f.act({ type: 'combat/call', unitId: u.id, id: 'call.spot', targetId: t.id } as any); return condOn(f.unit(t.id), 'read'); };
    expect(spot({ read_intent: 'I' })).toBe(true); expect(spot({})).toBe(false);
  });
  it('Fade: from Seen to Hidden next to cover, a fresh entry, for its Shadow', () => {
    const { f, u } = setup(5, '8,4'); setShadow(f, u, 2); at(f, u, '3,4');
    const g = VERB('shadow.fade').effects[0], entry = f.unit(u.id).hideEntry || 0;
    use(f, u, 'shadow.fade');
    const v = f.unit(u.id);
    expect(v.hidden).toBe(true); expect(v.hideEntry).toBe(entry + 1);
    expect(shadow(f, u)).toBe(2 - g.res.shadow);
  });
  it('Timing: Off Balance; a target already Off Balance can\'t be picked', () => {
    const { f, u, t } = setup(VERB('shadow.timing').requires[0].min, '6,4'); hideNow(f, u); setShadow(f, u, 3);
    use(f, u, 'shadow.timing', t.id);
    expect(condOn(f.unit(t.id), 'off_balance')).toBe(true);
    expect(() => use(f, u, 'shadow.timing', t.id)).toThrow();
  });
  it('Disable refuses a target that is not a machine', () => {
    const f = fightWith([operative(7)], [{}]); const t = foeAt(f, '2,4'); const u = f.unit(f.turn(f.pc).id); at(f, u, '1,4'); hideNow(f, u); setShadow(f, u, 3);
    expect(() => use(f, u, 'shadow.disable', t.id)).toThrow(esc(grantOf('shadow.disable').reach.why.target_kind));
  });
  it('Still Breath (an Acuity perk since rules 1.74 item 6005; was Ingenuity 5): spot rolls against you lower by cover', () => {
    // rules 1.90 item 7812: Ingenuity 5 carries only the Scout (the ambush's scout bonus), never Still Breath again
    expect((SKILL.ingenuity as any).unlocks['5'].effects.map((x: any) => x.stat || x.op)).toEqual(['ambush_scout']);
    const e = (PERK.still_breath as any).tiers.I.effects[0];
    expect(e).toMatchObject({ op: 'roll_mod', when: 'spot', if: { by_cover: ['here'] } });
    expect(e.value).toBeLessThan(0);
  });
});

describe('2.6 a silent attack from Hidden', () => {
  it('the surviving target that can see your tile rolls to spot you', () => {
    const f = fightWith([door(5, { weapon: 'hellraiser_service_rifle' })], [{ tier: 'soldier' }]); const t = foeAt(f, '8,8');
    const u = f.turn(f.pc); at(f, u, '1,8'); f.unit(u.id).mods = ['mod_suppressor']; hideNow(f, u); f.unit(t.id).hp = 999; f.unit(t.id).maxHp = 999;
    const n = f.cb.log.length;
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(u.id), f.unit(t.id), 'shot', null, { free: true }));
    expect(f.cb.log.slice(n).some((l) => /looks for/.test(l))).toBe(true);
  });
});

describe('the Operative', () => {
  it('ranks: Mark and Vanish; Toxin and Sabotage; Execution and Called Shot; Field Fix out (its key kept)', () => {
    const ids = (r: string) => (CLASS.infiltrator as any).ranks[r].moves.map((m: any) => m.ref || m.id);
    expect(ids('I')).toEqual(['assassin.mark', 'vanish']);
    expect(ids('II')).toEqual(['assassin.toxin', 'sabotage']);
    expect(ids('III')).toEqual(['assassin.execution', 'gunslinger.called_shot']);
    expect(itemInfo('class:infiltrator.field_fix')).toBeTruthy();
  });
  it('Analyze: its AP, Read on its target, and Shadow once a turn when the target can\'t see you', () => {
    const tc: any = (CLASS.infiltrator as any).gain[0];
    const f = fightWith([operative(7)], [{}, {}]); const [a, b] = f.foes; f.unit(a.id).pos = '3,4'; f.unit(b.id).pos = '3,6';
    const u = f.turn(f.pc); at(f, u, '1,4'); hideNow(f, u);
    const ap = f.unit(u.id).ap, s0 = shadow(f, u);
    f.act({ type: 'combat/analyze', unitId: u.id, targetId: a.id } as any);
    expect(ap - f.unit(u.id).ap).toBe((actionsJ as any).items.find((x: any) => x.id === 'analyze').ap); // rules 1.74 item 6011: the plain price (Quick Read owns the cut)
    expect(condOn(f.unit(a.id), 'read')).toBe(true);
    expect(shadow(f, u)).toBe(s0 + tc.numbers.gain);
    f.act({ type: 'combat/analyze', unitId: u.id, targetId: b.id } as any);
    expect(shadow(f, u)).toBe(s0 + tc.numbers.gain); // once a turn
  });
  // Rules 1.74 item 6011: Vanish is the Operative's free Hide, once a turn (it was Fade at no Shadow).
  it('Vanish is data: the first Hide of an Operative each turn costs 0 AP; Fade takes its Shadow again', () => {
    const f = fightWith([operative(7)], [{}]); foeAt(f, '14,9', true);
    const u = f.turn(f.pc); at(f, u, '1,4'); const ap = f.unit(u.id).ap;
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    expect(f.unit(u.id).hidden).toBe(true); expect(f.unit(u.id).ap).toBe(ap);
    const g = fightWith([operative(7)], [{}]); foeAt(g, '8,4');
    const v = g.turn(g.pc); at(g, v, '3,4'); setShadow(g, v, 2);
    use(g, v, 'shadow.fade');
    expect(g.unit(v.id).hidden).toBe(true); expect(shadow(g, v)).toBe(2 - VERB('shadow.fade').effects[0].res.shadow);
  });
  it('Toxin coats a gun (weapon-neutral)', () => {
    const f = fightWith([operative(7, { weapon: 'hellraiser_service_rifle' })], [{}]);
    const u = f.turn(f.pc);
    f.act({ type: 'combat/perk', unitId: u.id, id: 'class:assassin.toxin', actionId: 'toxin_weakened' } as any);
    expect(f.cb.log.some((l) => /coats the weapon/.test(l))).toBe(true);
  });
  it('Called Shot with a blade strikes', () => {
    const f = fightWith([operative(7, { weapon: 'combat_knife' })], [{}]); const t = foeAt(f, '2,4');
    const u = f.turn(f.pc); at(f, u, '1,4'); f.unit(t.id).hp = 999;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'gunslinger.called_shot', targetId: t.id, choice: 'leg' } as any);
    expect(f.cb.log.some((l) => /strikes/.test(l))).toBe(true);
  });
  it('Sabotage (rules 1.74 item 6011): an Operative Disable Stuns a machine and costs it no Shadow', () => {
    const f = fightWith([operative(7)], [{ name: 'Drill drone' }]); const t = foeAt(f, '2,4');
    const u = f.turn(f.pc); at(f, u, '1,4'); hideNow(f, u); setShadow(f, u, 1); f.unit(t.id).sv = { body: -50, brain: -50, heart: -50 } as any;
    use(f, u, 'shadow.disable', t.id);
    expect(condOn(f.unit(t.id), 'stunned')).toBe(true); expect(shadow(f, u)).toBe(1);
  });
});

describe('8. the other side', () => {
  it('Execution never fires on an Elite that was at full HP when the action began', () => {
    const f = fightWith([operative(9, { weapon: 'hellraiser_service_rifle' })], [{ tier: 'elite', level: 1 }]); const t = foeAt(f, '3,4');
    const u = f.turn(f.pc); at(f, u, '1,4');
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.unit(u.id), f.unit(t.id), 'marked', undefined, undefined, { skipSave: true }));
    const e = f.unit(t.id); e.maxHp = 40; e.hp = 40; f.unit(u.id).attack = 60;
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(u.id), f.unit(t.id), 'shot', null, { free: true }));
    expect(f.unit(t.id).dead && f.cb.log.some((l) => /EXECUTION/.test(l))).toBeFalsy();
  });
  it('skulk is an enemy tag; only Vermin, Minions and Soldiers skulk', () => {
    expect(FOE_TAGS).toContain('skulk');
    expect(skulks({ tags: ['skulk'], tier: 'soldier' } as any)).toBe(true);
    expect(skulks({ tags: ['skulk'], tier: 'elite' } as any)).toBe(false);
  });
});

describe('old saves', () => {
  it('an old Operative loads: no res.shadow is 0, its move keys resolve', () => {
    for (const k of ['class:infiltrator.vanish', 'class:infiltrator.sabotage', 'class:infiltrator.field_fix', 'class:assassin.mark', 'class:gunslinger.called_shot']) expect(itemInfo(k)).toBeTruthy();
    const f = fightWith([operative(7)], [{}]); const u = f.unit(f.pc.id); delete (u.res as any).shadow;
    expect(resOf(u, 'shadow')).toBe(0);
  });
});

describe('Shadow and Bonds (the step 6 and step 7 merge)', () => {
  it('a Traced unit (always seen, rules 1.33) can\'t be made Hidden by any door: Fade, Vanish or the condition op', () => {
    const f = fightWith([door(5)], [{}]); foeAt(f, '14,5', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(u.id), 'traced', undefined, undefined, { skipSave: true }));
    expect(condOn(f.unit(u.id), 'traced')).toBe(true);
    hideNow(f, u);
    expect(f.unit(u.id).hidden).toBeFalsy();
  });
});
