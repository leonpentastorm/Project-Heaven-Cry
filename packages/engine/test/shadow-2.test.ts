// Rules 1.56, Shadow 2.0 slice 1 (docs/design/proposals/2026-11-shadow-2.0.md; spec items 4330 to 4339): a door a player
// can find. Hide on the door's tab with its refusals as data, Go to Ground (Hide 1 AP less for the door), First Shade (the
// first Hide of a fight gives Shadow, so the first Break comes the same turn), Tag (a verb at Ingenuity 1) and Tagged (+1 to
// hit from Hidden on a Marked foe), Ghost Kill (a kill while no enemy's eyes reach you sinks you back into Hidden). Every
// rule through the reducer's real actions; every number read from data.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { survivalRoom, startRun, chooseNode, walkIn } from './helpers/survival';
import { Rec } from './helpers/replay';
import { HIDDEN_ATTACK } from '../src/tactics';
import { previewAttack, RULES, SKILL, condOn, apply, beginTurn, moveOptions, basicActions, DOOR_TABS, doorTabsOf, actionsFor, refOf, type Unit } from '../src';
import { resOf, seenByFoes, hideBlock, HIDE_WHY } from '../src/tactics';
import { applyCond } from '../src/magic';
import { onHook } from '../src/effects/hooks';
import { price } from '../src/effects/cost';
import actionsJ from '../../../data/actions.json';
import shadowJ from '../../../data/shadow.json';

const DOOR: any = (SKILL.ingenuity as any).unlocks['1'];
const eff = (label: string) => DOOR.effects.find((e: any) => e.label === label);
const GROUND = eff('Go to Ground'), FIRST = eff('First Shade'), TAGGED = eff('Tagged');
// Ghost Kill opens at Ingenuity 3 (the lead's ruling, 16 Nov 2026: too much for a 1-point dip; spec item 4342)
const GHOST_STEP: any = (SKILL.ingenuity as any).unlocks['3'], GHOST = GHOST_STEP.effects.find((e: any) => e.label === 'Ghost Kill'), GHOST_AT = Number(Object.entries((SKILL.ingenuity as any).unlocks).find(([, v]) => v === GHOST_STEP)![0]);
const HIDE: any = (actionsJ as any).items.find((a: any) => a.id === 'hide');
const TAG: any = (shadowJ as any).items.find((x: any) => x.id === 'shadow.tag');
const BREAK_MODS = ['skill:ingenuity.1#shadow.break'];
const door = (ing: number, extra: CharSpec = {}): CharSpec => ({ weapon: 'hellraiser_service_rifle', ...extra, skills: { ingenuity: ing, ...(extra.skills || {}) }, attrs: { perception: Math.max(ing, 3), ...(extra.attrs || {}) } });
type F = ReturnType<typeof fightWith>;
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const shadow = (f: F, u: Unit) => resOf(f.unit(u.id), 'shadow');
const foeAt = (f: F, i: number, pos: string, blind = false) => { const t = f.foes[i]; t.pos = pos; if (blind) t.vision = 1; return t; };
const fxSince = (f: F, n: number) => (f.cb.fx || []).filter((e: any) => e.n > n);

describe('finding the door: Hide on the SHADOW tab, its refusals as data', () => {
  it('the SHADOW tab lists Hide (shadow.json tab_also) for a unit with Ingenuity 1; how the door works is the door_line of its skill (one reader)', () => {
    expect((shadowJ as any).tab_also).toEqual(['hide']);
    expect(DOOR_TABS.shadow.also).toEqual(['hide']);
    expect((SKILL.ingenuity as any).door_tab).toBe('shadow');
    expect(String((SKILL.ingenuity as any).door_line)).toMatch(/Hide/);
    expect((shadowJ as any).tab_note).toBeUndefined(); expect((shadowJ as any).hint).toBeUndefined();
    const f1 = fightWith([door(1)], [{}]), f0 = fightWith([door(0)], [{}]);
    expect(doorTabsOf(f1.pc).map((d) => d.tab)).toContain('shadow');
    expect(doorTabsOf(f0.pc).map((d) => d.tab)).not.toContain('shadow');
    expect(doorTabsOf(f1.g.characters[f1.pc.charId!] as any).map((d) => d.tab)).toContain('shadow');
  });
  it('seen: the refusal names the fix (actions.json hide.why.seen); the row says the same and the reducer refuses with it', () => {
    const f = fightWith([door(1)], [{}]); foeAt(f, 0, '5,4');
    const u = f.turn(f.pc); at(f, u, '1,4');
    expect(withGame(f.g, () => hideBlock(f.cb, f.unit(u.id)))).toBe(HIDE.why.seen);
    const row = withGame(f.g, () => basicActions(f.cb, f.unit(u.id), { g: f.g })).find((r) => r.id === 'hide');
    expect(row?.why).toBe(HIDE.why.seen);
    expect(() => f.act({ type: 'combat/hide', unitId: u.id } as any)).toThrow(HIDE.why.seen);
  });
  it('the row stays on the bar while Hidden, greyed with what to do instead; Marked has its own text', () => {
    const f = fightWith([door(1)], [{}]); foeAt(f, 0, '14,5', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    const row = withGame(f.g, () => basicActions(f.cb, f.unit(u.id), { g: f.g })).find((r) => r.id === 'hide');
    expect(row?.why).toBe(HIDE.why.hidden);
    expect(HIDE_WHY.marked).toBe(HIDE.why.marked);
    const g = fightWith([door(1)], [{}]); const v = g.turn(g.pc);
    withGame(g.g, () => applyCond(g.cb, g.g.rng, g.foe, g.unit(v.id), 'marked', undefined, undefined, { skipSave: true }));
    expect(withGame(g.g, () => hideBlock(g.cb, g.unit(v.id)))).toBe(HIDE.why.marked);
  });
});

describe('Go to Ground and First Shade: Hide, then Break, in one turn', () => {
  it('an Ingenuity-1 character Hides for the door\'s price, gets First Shade\'s Shadow at once and Breaks the same turn', () => {
    const f = fightWith([door(1)], [{ tier: 'soldier' }]); foeAt(f, 0, '6,4', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    const ap0 = f.unit(u.id).ap;
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    expect(ap0 - f.unit(u.id).ap).toBe(Math.max(GROUND.min, HIDE.ap + GROUND.value));
    expect(f.unit(u.id).hidden).toBe(true);
    expect(shadow(f, u)).toBe(FIRST.value);
    const n = f.cb.fxSeq || 0;
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'shot', mods: BREAK_MODS } as any);
    expect(shadow(f, u)).toBe(0);
    expect(f.unit(u.id).hidden).toBeFalsy();
    expect(fxSince(f, n).some((e: any) => e.k === 'stance' && e.what === 'break' && e.target === u.id)).toBe(true);
  });
  it('the price is the one price (effects/cost.ts) every reader asks: the row, the reducer', () => {
    const f = fightWith([door(1)], [{}]); const u = f.turn(f.pc);
    const p = withGame(f.g, () => price({ cb: f.cb, u: f.unit(u.id) }, 'hide').ap);
    const row = withGame(f.g, () => basicActions(f.cb, f.unit(u.id), { g: f.g })).find((r) => r.id === 'hide');
    expect(row?.ap).toBe(p);
    const f0 = fightWith([door(0)], [{}]); const u0 = f0.turn(f0.pc);
    expect(withGame(f0.g, () => price({ cb: f0.cb, u: f0.unit(u0.id) }, 'hide').ap)).toBe(HIDE.ap);
  });
  it('First Shade is once a fight, and only with no Shadow held: the Operative (who starts with Shadow) gets none', () => {
    const f = fightWith([door(1)], [{}]); foeAt(f, 0, '14,5', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    f.act({ type: 'combat/hide', unitId: u.id } as any); expect(shadow(f, u)).toBe(FIRST.value);
    (f.unit(u.id).res as any).shadow = 0; withGame(f.g, () => { f.unit(u.id).hidden = false; });
    f.act({ type: 'combat/hide', unitId: u.id } as any); expect(shadow(f, u)).toBe(0); // once a fight
    const o = fightWith([door(7, { classId: 'infiltrator', level: 12, attrs: { perception: 8 } })], [{}]); foeAt(o, 0, '14,5', true);
    const v = o.turn(o.pc); at(o, v, '1,4'); const had = shadow(o, v);
    expect(had).toBeGreaterThan(0);
    o.act({ type: 'combat/hide', unitId: v.id } as any);
    expect(shadow(o, v)).toBe(had);
  });
});

describe('Tag and Tagged', () => {
  it('Tag (Ingenuity 1, from Hidden) Marks a foe that can\'t see you; then an attack from Hidden on it shows Tagged', () => {
    const f = fightWith([door(1)], [{ tier: 'soldier' }]); const t = foeAt(f, 0, '6,4', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    const n = f.cb.fxSeq || 0, ap0 = f.unit(u.id).ap;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.tag', targetId: t.id } as any);
    expect(condOn(f.unit(t.id), 'marked')).toBe(true);
    expect(ap0 - f.unit(u.id).ap).toBe(TAG.effects[0].ap);
    expect(fxSince(f, n).some((e: any) => e.k === 'stance' && e.what === 'tag')).toBe(true);
    const terms = withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), f.unit(t.id), 'shot').terms || []);
    expect(terms.find((x: any) => x.label === 'Tagged')?.v).toBe(TAGGED.value);
    expect(() => f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.tag', targetId: t.id } as any)).toThrow(); // once a turn
  });
  it('not from the open: Tag needs you Hidden', () => {
    const f = fightWith([door(1)], [{}]); const t = foeAt(f, 0, '6,4', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    expect(() => f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:shadow.tag', targetId: t.id } as any)).toThrow();
    expect(condOn(f.unit(t.id), 'marked')).toBe(false);
  });
});

describe('Unseen Hand (rules 1.81 item 6900): an attack from Hidden rolls with Ingenuity when that is higher', () => {
  const UNSEEN = eff('from Hidden');
  // the skill the real attack rolled with, as the fight's own hook tells it (attack_roll carries `via`)
  const SEEN_VIA: { id: string | null; via: string | null } = { id: null, via: null };
  onHook('attack_roll', (c: any) => { if (c.att?.id === SEEN_VIA.id) SEEN_VIA.via = c.via; });
  const rolledWith = (f: F, u: Unit, t: Unit, mods: string[] = []) => { SEEN_VIA.id = u.id; SEEN_VIA.via = null;
    try { f.act({ type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot', mods } as any); } finally { SEEN_VIA.id = null; }
    return SEEN_VIA.via; };
  it('the door holds it as data (roll_with, if_higher, on self_has hidden)', () => {
    expect(UNSEEN).toMatchObject({ op: 'roll_with', when: 'attack', skill: 'ingenuity', if_higher: true, if: { self_has: ['hidden'] } });
  });
  it('Hidden, an Ingenuity-5 character with no rifle skill Breaks with Ingenuity; seen, the same shot rolls with the rifle\'s own skill', () => {
    const f = fightWith([door(5)], [{ tier: 'soldier' }]); const t = foeAt(f, 0, '6,4', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    const open = withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), f.unit(t.id), 'shot'));
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    const hid = withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), f.unit(t.id), 'shot'));
    expect(open.via).not.toBe('ingenuity'); expect(hid.via).toBe('ingenuity');
    expect(hid.toHit).toBeGreaterThan(open.toHit);
    expect(rolledWith(f, u, t, BREAK_MODS)).toBe('ingenuity');
    expect(f.unit(u.id).hidden).toBeFalsy();
    expect(withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), f.unit(t.id), 'shot')).via).not.toBe('ingenuity');
  });
  it('never on top: a weapon skill higher than Ingenuity keeps its own roll from Hidden', () => {
    const f = fightWith([door(1, { skills: { ingenuity: 1, dexterity: 6 }, attrs: { perception: 3, agility: 6 } })], [{ tier: 'soldier' }]); const t = foeAt(f, 0, '6,4', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    expect(f.unit(u.id).hidden).toBe(true);
    expect(withGame(f.g, () => previewAttack(f.cb, f.unit(u.id), f.unit(t.id), 'shot')).via).not.toBe('ingenuity');
  });
});

describe('rules 1.61 item 4970: the shot that shows moves no Shadow outcome', () => {
  // An Ingenuity-1 rifle character, not Hidden, out of reach of every foe's eyes, kills a 1-HP minion: its attack shows
  // it to the foes (Unit.shownTo, item 4963), and still the kill was seen by nobody's eyes, so '+1 for a kill nobody saw'.
  it('an unseen kill with the reveal on gives Shadow, and the attacker is still shown to the foes', () => {
    expect(String((RULES.combat.attack as any).attack_reveal?.until)).toBe('attacker_turn_start');
    const KILL = DOOR.effects.find((e: any) => e.when === 'hit' && (e.if?.self_sight || []).includes('unseen'));
    const f = fightWith([door(1)], [{ tier: 'minion' }, { tier: 'minion' }]); const t = foeAt(f, 0, '3,4', true); foeAt(f, 1, '6,4', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    expect(withGame(f.g, () => seenByFoes(f.cb, f.unit(u.id)))).toBe(false);
    expect(f.unit(u.id).hidden).toBeFalsy(); expect(shadow(f, u)).toBe(0);
    f.unit(t.id).hp = 1; f.unit(u.id).attack = 60; // the blow lands and drops it
    f.act({ type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot' } as any);
    expect(f.unit(t.id).hp).toBeLessThanOrEqual(0);
    expect(f.unit(u.id).shownTo).toBe('foe');
    expect(shadow(f, u)).toBe(KILL.value);
  });
});

describe('Ghost Kill', () => {
  const kill = (blindOther: boolean, o: { marked?: boolean; ing?: number } = {}) => {
    // the other foe stands where its eyes reach you (6,4 sees 1,4 on this yard), blind while you Hide, then looking or not
    const f = fightWith([door(o.ing ?? GHOST_AT)], [{ tier: 'minion' }, { tier: 'minion' }]); const t = foeAt(f, 0, '3,4', true), w = foeAt(f, 1, '6,4', true), sight = f.cb.units.find((x) => x.side === 'pc')!.vision;
    const u = f.turn(f.pc); at(f, u, '1,4');
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    if (!f.unit(u.id).hidden) throw new Error('could not hide: ' + f.cb.log.slice(-2).join(' / '));
    if (!blindOther) f.unit(w.id).vision = sight;
    if (o.marked) withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foes[1], f.unit(u.id), 'marked', undefined, undefined, { skipSave: true }));
    f.unit(t.id).hp = 1; f.unit(u.id).attack = 60; // the blow lands and drops it
    f.act({ type: 'combat/attack', unitId: u.id, targetId: t.id, mode: 'shot', mods: BREAK_MODS } as any);
    expect(f.unit(t.id).hp).toBeLessThanOrEqual(0);
    return { f, u: f.unit(u.id) };
  };
  it('a kill while no enemy\'s eyes reach you: you sink back into Hidden (the same entry: no fresh ambush)', () => {
    const { f, u } = kill(true);
    expect(f.unit(u.id).hidden).toBe(true);
    expect(f.cb.log.some((l: string) => /Ghost Kill/.test(l))).toBe(true);
    expect(GHOST.same_entry).toBe(true);
  });
  it('it opens at its unlock step (Ingenuity 3): below it, the same kill out of view leaves you revealed', () => {
    expect(GHOST_AT).toBe(3);
    const low = kill(true, { ing: GHOST_AT - 1 }); expect(low.f.unit(low.u.id).hidden).toBeFalsy();
    expect(low.f.cb.log.some((l: string) => /Ghost Kill/.test(l))).toBe(false);
  });
  it('not when another enemy sees you, nor while Marked', () => {
    const seen = kill(false); expect(seen.f.unit(seen.u.id).hidden).toBeFalsy();
    const marked = kill(true, { marked: true }); expect(marked.f.unit(marked.u.id).hidden).toBeFalsy();
  });
  it('the flag never outlives its action: a later move out of view does not re-hide', () => {
    const { f, u } = kill(false);
    f.unit(f.foes[1].id).vision = 1; // the watcher goes blind: now out of view
    f.act({ type: 'combat/move', unitId: u.id, to: '1,5' } as any);
    expect(f.unit(u.id).hidden).toBeFalsy();
  });
});

describe('the Hide-spot measure (rules 1.56 item 4336): a spot to Hide from is in reach in most stage-1 first fights', () => {
  it('at least 80% of seeded stage-1 Survival first fights have a tile in one Move\'s reach out of every foe\'s eyes with the door\'s Hide still paid', () => {
    const N = Number((globalThis as any).process?.env?.HIDE_N) || 24; let ok = 0, seenAtStart = 0, n = 0, shaded = 0, unseenEyes = 0, ms = 0;
    for (let i = 0; i < N; i++) {
      const seed = 'HIDE' + i, g0: any = survivalRoom(seed, [{ build: 'plain_gun', level: 1 }], { test: true });
      g0.characters.c1.skills.ingenuity = 1;
      const r = new Rec(startRun(g0, seed), [{ build: 'plain_gun', level: 1 }]);
      const node = chooseNode(r.g, ['fight']); if (!node) continue;
      r.must({ type: 'run/move', node: node.id }); r.g = walkIn(r.g);
      const g = r.g, cb = g.combat; if (!cb) continue;
      const u = cb.units.find((x: Unit) => x.side === 'pc')!; n++;
      cb.turn = cb.order.indexOf(u.id); delete cb.window; withGame(g, () => beginTurn(cb, g.rng));
      const me = cb.units.find((x: Unit) => x.id === u.id)!, hideAp = withGame(g, () => price({ cb, u: me }, 'hide').ap), apMax = me.ap;
      if (withGame(g, () => seenByFoes(cb, me))) seenAtStart++; else { ok++; continue; }
      const opts = withGame(g, () => moveOptions(g, cb, me.id, 'move'));
      const spot = Object.entries(opts.tiles).some(([k, o]) => o.ap + hideAp <= apMax && !withGame(g, () => seenByFoes(cb, { ...me, pos: k } as Unit)));
      // the Hide row's own spots (item 11), read through the descriptor the screen reads
      const t0 = Date.now(), row = actionsFor(g, me.id, null).find((d) => d.id === 'hide')!; ms = Math.max(ms, Date.now() - t0);
      if (row.spots?.length) shaded++; else if (spot && !row.eyes?.length) unseenEyes++; // seen by an enemy you can't see: the plain refusal (fog)
      if (spot) ok++;
    }
    (globalThis as any).console?.log?.('hide spots: ' + ok + ' / ' + n + ' (seen at the start ' + seenAtStart + ', shaded by the Hide row ' + shaded + ', seen only by eyes the side cannot see ' + unseenEyes + ', slowest row ' + ms + ' ms)');
    expect(shaded + unseenEyes).toBe(ok - (n - seenAtStart)); // the row shades a spot whenever one is in reach (and the side sees who sees it)
    expect(n).toBeGreaterThan(N / 2);
    expect(ok / n).toBeGreaterThanOrEqual(0.8);
    void apply;
  });
});

describe('where to Hide (rules 1.56 item 11): the Hide row shades the tiles this turn\'s Move reaches out of every enemy\'s eyes', () => {
  const setup = (vision?: number) => {
    const f = fightWith([door(1)], [{}]); const t = foeAt(f, 0, '14,6'); if (vision) t.vision = vision;
    const u = f.turn(f.pc); at(f, u, '7,3');
    return { f, u: f.unit(u.id) };
  };
  const hideRow = (f: F, id: string) => actionsFor(f.g, id, null).find((d) => d.id === 'hide')!;
  it('seen: the row lists the spots, nearest first, and its refusal names the nearest; Moving to any spot, Hide goes through', () => {
    const { f, u } = setup();
    const d = hideRow(f, u.id);
    expect(d.available).toBe(false);
    expect(d.eyes).toEqual([f.foe.id]);
    expect(d.spots!.length).toBeGreaterThan(0);
    expect(d.why).toBe(HIDE.why.seen_to.replace('{who}', '1 enemy').replace('{tile}', refOf(d.spots![0])));
    for (const k of d.spots!) {
      const { f: g, u: v } = setup();
      g.act({ type: 'combat/move', unitId: v.id, to: k } as any);
      expect(g.unit(v.id).pos).toBe(k);
      g.act({ type: 'combat/hide', unitId: v.id } as any);
      expect(g.unit(v.id).hidden, 'spot ' + k).toBe(true);
    }
  });
  it('a tile this turn\'s Move reaches but no shaded spot: still in an enemy\'s eyes there (the shading is complete)', () => {
    const { f, u } = setup();
    const d = hideRow(f, u.id), shaded = new Set(d.spots), mo = withGame(f.g, () => moveOptions(f.g, f.cb, u.id, 'move'));
    const hideAp = d.cost.ap, rest = Object.entries(mo.tiles).filter(([k, o]) => !shaded.has(k) && o.ap + hideAp <= u.ap);
    expect(rest.length).toBeGreaterThan(0);
    for (const [k] of rest) expect(withGame(f.g, () => seenByFoes(f.cb, f.unit(u.id), k)), 'tile ' + k).toBe(true);
  });
  it('no tile in reach is out of their eyes: no spots, and the refusal says so and points to smoke or cover', () => {
    const f = fightWith([door(1)], [{}]); const t = foeAt(f, 0, '6,4'); t.vision = 99;
    const u = f.turn(f.pc); at(f, u, '1,4'); f.unit(u.id).ap = 2; // one tile of Move left with Hide paid: all in its eyes
    const d = hideRow(f, u.id);
    expect(d.spots).toEqual([]);
    expect(d.why).toBe(HIDE.why.seen_none.replace('{who}', '1 enemy'));
    expect(d.why).toMatch(/smoke/);
  });
  it('who sees you: unseen, the row names no eyes and no spots; an enemy the side does not see is never named', () => {
    const f = fightWith([door(1)], [{}]); foeAt(f, 0, '14,5', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    const d = hideRow(f, u.id);
    expect(d.eyes).toEqual([]); expect(d.spots).toBeUndefined(); expect(d.available).toBe(true);
  });
});

describe('the moments your side sees (rules 1.56 items 8 and 13): Shadow gained and lost, and being found', () => {
  const found = (f: F, n: number, id: string) => fxSince(f, n).filter((e: any) => e.k === 'stance' && e.what === 'found' && e.unit === id);
  it('a gain and a loss each send their effect: First Shade (shadow_gain), a turn begun seen holding Shadow (shadow_loss)', () => {
    const f = fightWith([door(1)], [{}]); const t = foeAt(f, 0, '14,5', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    let n = f.cb.fxSeq || 0;
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    expect(fxSince(f, n).some((e: any) => e.k === 'stance' && e.what === 'shadow_gain' && e.target === u.id)).toBe(true);
    withGame(f.g, () => { f.unit(u.id).hidden = false; }); f.unit(t.id).vision = 99; t.pos = '6,4';
    n = f.cb.fxSeq || 0; const had = shadow(f, u);
    f.turn(u.id);
    expect(shadow(f, u)).toBe(had - 1);
    expect(fxSince(f, n).some((e: any) => e.k === 'stance' && e.what === 'shadow_loss' && e.target === u.id)).toBe(true);
  });
  it('an attack from Hidden: FOUND (how: attack) goes to your own side only', () => {
    const f = fightWith([door(1)], [{}]); foeAt(f, 0, '6,4', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    const n = f.cb.fxSeq || 0;
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'shot' } as any);
    const ev = found(f, n, u.id);
    expect(ev.length).toBe(1); expect(ev[0].how).toBe('attack'); expect(ev[0].only).toBe('pc');
  });
  it('a hit on a Hidden unit: FOUND (how: hit), naming who hit it', () => {
    const f = fightWith([door(1), {}], [{}]); foeAt(f, 0, '14,5', true);
    const [a, b] = f.pcs; at(f, a, '1,4'); at(f, b, '3,4');
    f.turn(a.id); f.act({ type: 'combat/hide', unitId: a.id } as any);
    f.turn(b.id); f.unit(b.id).attack = 60; const n = f.cb.fxSeq || 0;
    f.act({ type: 'combat/attack', unitId: b.id, targetId: a.id, mode: 'shot' } as any);
    expect(f.unit(a.id).hidden).toBeFalsy();
    const ev = found(f, n, a.id);
    expect(ev.map((e: any) => e.how)).toContain('hit');
    expect(ev.find((e: any) => e.how === 'hit')?.by).toBe(b.id);
  });
  it('an enemy that ends its turn next to you: FOUND (how: close), naming it', () => {
    const f = fightWith([door(1)], [{}]); const t = foeAt(f, 0, '4,4', true);
    const u = f.turn(f.pc); at(f, u, '1,4');
    f.act({ type: 'combat/hide', unitId: u.id } as any);
    f.unit(t.id).pos = '2,4'; f.unit(t.id).ap = 0; // it stands next to you with nothing left to do: its turn ends there
    const n = f.cb.fxSeq || 0;
    f.act({ type: 'combat/end-turn', unitId: u.id } as any);
    const ev = found(f, n, u.id);
    expect(ev.length).toBe(1); expect(ev[0].how).toBe('close'); expect(ev[0].by).toBe(t.id);
  });
});

describe('rules 1.82 item 7012: an attack from Hidden gives the tile away; a silent one does not', () => {
  it('with the switch at tile (it ships at reveal): a loud shot from Hidden: still Hidden, the foes know the tile, said once; a silent weapon: nothing told', () => {
    const was = HIDDEN_ATTACK.gives; HIDDEN_ATTACK.gives = 'tile';
    try {
    const shoot = (weapon?: string) => {
      const f = fightWith([{ ...door(1), ...(weapon ? { weapon } : {}) }], [{}]); foeAt(f, 0, '6,4', true);
      const u = f.turn(f.pc); at(f, u, '1,4'); f.act({ type: 'combat/hide', unitId: u.id } as any);
      const was = f.cb.seenAt?.foe?.[u.id]; f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'shot' } as any);
      return { f, u: f.unit(u.id), was };
    };
    const loud = shoot(); expect(loud.u.hidden).toBe(true); expect(loud.f.cb.seenAt?.foe?.[loud.u.id]).toBe(loud.u.pos);
    expect(loud.f.cb.log.filter((l: string) => l.includes('gives its position away')).length).toBe(1);
    const quiet = shoot('whisper_smg'); expect(quiet.u.hidden).toBe(true); expect(quiet.f.cb.seenAt?.foe?.[quiet.u.id]).toBe(quiet.was);
    } finally { HIDDEN_ATTACK.gives = was; }
  });
  it('the switch ships at reveal (the rule before) until Leon says', () => { expect(HIDDEN_ATTACK.gives).toBe('reveal'); });
});
