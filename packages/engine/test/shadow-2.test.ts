// Rules 1.56, Shadow 2.0 slice 1 (docs/design/proposals/2026-11-shadow-2.0.md; spec items 4330 to 4339): a door a player
// can find. Hide on the door's tab with its refusals as data, Go to Ground (Hide 1 AP less for the door), First Shade (the
// first Hide of a fight gives Shadow, so the first Break comes the same turn), Tag (a verb at Ingenuity 1) and Tagged (+1 to
// hit from Hidden on a Marked foe), Ghost Kill (a kill while no enemy's eyes reach you sinks you back into Hidden). Every
// rule through the reducer's real actions; every number read from data.
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { survivalRoom, startRun, chooseNode } from './helpers/survival';
import { Rec } from './helpers/replay';
import { previewAttack, SKILL, condOn, apply, beginTurn, moveOptions, basicActions, DOOR_TABS, doorTabsOf, type Unit } from '../src';
import { resOf, seenByFoes, hideBlock, HIDE_WHY } from '../src/tactics';
import { applyCond } from '../src/magic';
import { price } from '../src/effects/cost';
import actionsJ from '../../../data/actions.json';
import shadowJ from '../../../data/shadow.json';

const DOOR: any = (SKILL.ingenuity as any).unlocks['1'];
const eff = (label: string) => DOOR.effects.find((e: any) => e.label === label);
const GROUND = eff('Go to Ground'), FIRST = eff('First Shade'), TAGGED = eff('Tagged'), GHOST = eff('Ghost Kill');
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
  it('the SHADOW tab lists Hide (shadow.json tab_also) for a unit with Ingenuity 1, and its note and hint are data', () => {
    expect((shadowJ as any).tab_also).toEqual(['hide']);
    expect(DOOR_TABS.shadow.note).toBe((shadowJ as any).tab_note);
    expect(DOOR_TABS.shadow.hint.length).toBeGreaterThan(0);
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

describe('Ghost Kill', () => {
  const kill = (blindOther: boolean, o: { marked?: boolean } = {}) => {
    // the other foe stands where its eyes reach you (6,4 sees 1,4 on this yard), blind while you Hide, then looking or not
    const f = fightWith([door(1)], [{ tier: 'minion' }, { tier: 'minion' }]); const t = foeAt(f, 0, '3,4', true), w = foeAt(f, 1, '6,4', true), sight = f.cb.units.find((x) => x.side === 'pc')!.vision;
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
    const N = Number((globalThis as any).process?.env?.HIDE_N) || 24; let ok = 0, seenAtStart = 0, n = 0;
    for (let i = 0; i < N; i++) {
      const seed = 'HIDE' + i, g0: any = survivalRoom(seed, [{ build: 'plain_gun', level: 1 }], { test: true });
      g0.characters.c1.skills.ingenuity = 1;
      const r = new Rec(startRun(g0, seed), [{ build: 'plain_gun', level: 1 }]);
      const node = chooseNode(r.g, ['fight']); if (!node) continue;
      r.must({ type: 'run/move', node: node.id });
      const g = r.g, cb = g.combat; if (!cb) continue;
      const u = cb.units.find((x: Unit) => x.side === 'pc')!; n++;
      cb.turn = cb.order.indexOf(u.id); delete cb.window; withGame(g, () => beginTurn(cb, g.rng));
      const me = cb.units.find((x: Unit) => x.id === u.id)!, hideAp = withGame(g, () => price({ cb, u: me }, 'hide').ap), apMax = me.ap;
      if (withGame(g, () => seenByFoes(cb, me))) seenAtStart++; else { ok++; continue; }
      const opts = withGame(g, () => moveOptions(g, cb, me.id, 'move'));
      const spot = Object.entries(opts.tiles).some(([k, o]) => o.ap + hideAp <= apMax && !withGame(g, () => seenByFoes(cb, { ...me, pos: k } as Unit)));
      if (spot) ok++;
    }
    (globalThis as any).console?.log?.('hide spots: ' + ok + ' / ' + n + ' (seen at the start ' + seenAtStart + ')');
    expect(n).toBeGreaterThan(N / 2);
    expect(ok / n).toBeGreaterThanOrEqual(0.8);
    void apply;
  });
});
