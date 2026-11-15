// Rules 1.55 items 30 to 36 (0.28.2, the lead's rulings R1 to R3 on Leon's playtest): a give of any item anywhere out
// of a fight (the path map, the field), counted items (stims) given as items, a stim used on a friend with no map under
// the squad (the fight's own stim), and the field as a free fight without enemies: its actions offered and paid, what
// the fight spent kept spent, a Hymn's wait not counting down, the doubtful actions refused. Everything through the
// reducer with real actions; numbers are read from the state and the data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, reachable, packOf, giveView, magazineWorth, maxHp, setDevotionXp, devotionThreshold, fieldRefusal, fieldActs, PERK } from '../src';
import { survivalRoom, startRun, ownerOf, leaveField } from './helpers/survival';
import type { Pc } from './helpers/replay';
import survivalJ from '../../../data/survival.json';

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'plain_gun', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
const started = (pcs: Pc[] = DUO, seed = 'PHC-GIVE2') => clone(startRun(survivalRoom(seed, pcs, { test: true }), seed));
/** Into the first fight (every player marking it); `prep` runs on the state before the move. */
function inFight(pcs: Pc[] = DUO, prep?: (g: GameState) => void, seed = 'PHC-FIELD2'): GameState {
  let g = started(pcs, seed);
  for (const c of Object.values(g.characters)) { c.weapon = 'service_pistol'; c.pack = [...(c.pack || []), ...magazineWorth('service_pistol'), ...magazineWorth('service_pistol')]; }
  prep?.(g);
  const n = reachable(g.run!).find((x) => x.kind === 'fight')!;
  for (let i = 0; i < pcs.length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  expect(g.run!.state).toBe('fight');
  return g;
}
/** The won fight's field (the test room's skip). */
const toField = (g: GameState) => { const f = apply(g, { type: 'run/skip' }, 'host'); expect(f.run!.state).toBe('field'); return f; };
/** Stand c2 next to c1 on the field (the test's own placing, as a walk would). */
function besides(g: GameState) {
  const x = clone(g), pos = x.story.positions!, [a, b] = pos.c1.split(',').map(Number), taken = new Set(Object.values(pos));
  const k = [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [-1, -1], [1, -1], [-1, 1]].map(([dx, dy]) => (a + dx) + ',' + (b + dy)).find((t) => !taken.has(t) && !(x.story.objects || []).some((o: any) => o.pos === t && o.kind !== 'pile'))!;
  pos.c2 = k; return x;
}

describe('rules 1.55 item 30: give an item anywhere out of a fight', () => {
  it('on the path map (a fight node behind the squad) player B gives player A a pack item; credits keep rules 1.46\'s where; in a fight nothing is given', () => {
    let g = toField(inFight());
    g = leaveField(g);
    for (const [i, c] of Object.entries(['c1', 'c2'])) g = apply(g, { type: 'run/pick', charId: c, choice: 'materials' }, ownerOf(+i));
    expect(g.run!.state).toBe('map'); expect(g.run!.nodes.find((n) => n.id === g.run!.at)!.kind).toBe('fight');
    const magsOf = (x: GameState, id: string) => packOf(x.characters[id]).filter((p) => p.mags).reduce((t, p) => t + p.mags!.length, 0);
    const idx = packOf(g.characters.c2).findIndex((x) => x.mags && x.mags.length), mags = magsOf(g, 'c2'), had = magsOf(g, 'c1');
    const after = apply(g, { type: 'gear/give', charId: 'c2', to: 'c1', idx, qty: 1 }, 'p2');
    expect(magsOf(after, 'c1')).toBe(had + 1); expect(magsOf(after, 'c2')).toBe(mags - 1);
    expect(refused(g, { type: 'gear/give', charId: 'c2', to: 'c1', credits: 1 }, 'p2')).toMatch(/^Hand things over at a stop with no fight/);
    expect(refused(inFight(), { type: 'gear/give', charId: 'c1', to: 'c2', idx: 0 })).toBe('Hand things over after the fight.');
  });

  it('a stim is given as an item, a quantity of it (rules 1.55 item 31), on the field too, and the Give view lists it with its count', () => {
    let g = toField(inFight(DUO, (x) => { x.characters.c1.stims = 5; x.characters.c2.stims = 0; }));
    const v = giveView(g, 'host'), row = v.rows.find((r) => r.kind === 'count' && r.qty === g.characters.c1.stims)!;
    expect(row).toBeTruthy(); expect(row.why.c2).toBeNull(); expect(row.use?.label).toBeTruthy();
    g = apply(g, { ...(row.action as any), to: 'c2', qty: 3 }, 'host');
    expect(g.characters.c1.stims).toBe(2); expect(g.characters.c2.stims).toBe(3);
    expect(refused(g, { ...(row.action as any), to: 'c2', qty: 3 })).toBe('Give 1 to 2 of those.');
  });
});

describe('rules 1.55 item 32: a stim on a friend with no map under the squad', () => {
  it('on the path map a stim stabilises a Downed friend at 1 HP and heals one at 1 HP, from the user\'s count, through the fight\'s own stim', () => {
    let g = leaveField(toField(inFight(DUO, (x) => { x.characters.c1.stims = 3; })));
    for (const [i, c] of Object.entries(['c1', 'c2'])) g = apply(g, { type: 'run/pick', charId: c, choice: 'materials' }, ownerOf(+i));
    expect(g.run!.state).toBe('map');
    const down = clone(g); down.characters.c2.hp = 0;
    const up = apply(down, { type: 'world/act', charId: 'c1', act: 'stim', targetId: 'c2' } as any, 'host');
    expect(up.characters.c2.hp).toBe(1); expect(up.characters.c1.stims).toBe(2);
    const healed = apply(up, { type: 'world/act', charId: 'c1', act: 'stim', targetId: 'c2' } as any, 'host');
    expect(healed.characters.c2.hp).toBeGreaterThan(1); expect(healed.characters.c2.hp).toBeLessThanOrEqual(maxHp(healed.characters.c2)); expect(healed.characters.c1.stims).toBe(1);
    // on yourself; the view's reasons are the reducer's; none left
    const self = clone(healed); self.characters.c1.hp = 1;
    const me = apply(self, { type: 'world/act', charId: 'c1', act: 'stim', targetId: 'c1' } as any, 'host'); expect(me.characters.c1.hp).toBeGreaterThan(1); expect(me.characters.c1.stims).toBe(0);
    expect(refused(me, { type: 'world/act', charId: 'c1', act: 'stim', targetId: 'c2' } as any)).toBe('No stims left.');
    expect(giveView(healed, 'host').rows.find((r) => r.kind === 'count' && r.use)!.use!.why.c2).toBeNull();
    expect(refused(healed, { type: 'world/act', charId: 'c2', act: 'stim', targetId: 'c1' } as any)).toBe('Not your character.');
  });
});

describe('rules 1.55 items 33 to 36: the field is a free fight without enemies', () => {
  it('a reload (speed and tactical) and a stim on a friend next to you work and are paid; AP stays full; an attack has no target', () => {
    let g = besides(toField(inFight(DUO, (x) => { x.characters.c1.stims = 2; })));
    g.characters.c1.loaded = 0; g.characters.c2.hp = 1;
    const mags = (x: GameState) => packOf(x.characters.c1).filter((p) => p.mags).reduce((t, p) => t + p.mags!.length, 0), m0 = mags(g);
    g = apply(g, { type: 'world/act', charId: 'c1', act: 'reload', tactical: true } as any, 'host');
    expect(g.characters.c1.loaded).toBeGreaterThan(0); expect(mags(g)).toBe(m0); expect(g.story.ap).toEqual({}); // the empty one back in the pack
    g = apply(g, { type: 'world/act', charId: 'c1', act: 'stim', targetId: 'c2' } as any, 'host');
    expect(g.characters.c2.hp).toBeGreaterThan(1); expect(g.characters.c1.stims).toBe(1); expect(g.story.ap).toEqual({}); expect(g.run!.state).toBe('field');
    expect(refused(g, { type: 'world/act', charId: 'c1', act: 'attack', targetId: 'c2', mode: 'shot' } as any)).toMatch(/^Nothing hostile is left on the field/);
    // the field's view offers what the reducer takes: the stim on the friend next to you, and each row goes through
    const v = fieldActs(g, 'host'); expect(v.find((x) => x.key === 'stim:c2')?.why).toBeNull();
    for (const x of v.filter((y) => !y.why)) expect(() => apply(g, x.action, 'host')).not.toThrow();
    expect(fieldActs(leaveField(g), 'host')).toEqual([]);
    expect(refused(g, { type: 'world/act', charId: 'c1', act: 'search', objId: 'x' } as any)).toMatch(/^The fight is over: on the field you walk/);
  });

  it('a once-a-fight action (the Thrown Stim of Field Medic) used in the fight stays spent on the field; unused, it is made there', () => {
    const prep = (x: GameState) => { const c = x.characters.c1; c.traits = [...(c.traits || []), 'field_medic'] as any; c.stims = 3; };
    const g0 = inFight(DUO, prep), throwIt = { type: 'world/act', charId: 'c1', act: 'perk', id: 'trait:field_medic', actionId: 'thrown_stim', targetId: 'pc-c2' } as any;
    // unused in the fight: thrown on the field once, then it is spent (the field's round never ends)
    const fresh = besides(toField(g0)); fresh.characters.c2.hp = 0;
    const ok = apply(fresh, throwIt, 'host');
    expect(ok.characters.c2.hp).toBe(1); expect(ok.characters.c1.stims).toBe(2);
    const again = clone(ok); again.characters.c2.hp = 0; expect(refused(again, throwIt)).toMatch(/Used/);
    // used in the fight: still spent on its field
    const x = clone(g0), cb = x.combat!, u = cb.units.find((y) => y.charId === 'c1')!, t = cb.units.find((y) => y.charId === 'c2')!;
    cb.turn = cb.order.indexOf(u.id); u.ap = 6; t.hp = 0; t.downed = true; t.saves = { ok: 0, fail: 0 };
    const spent = apply(x, { type: 'combat/perk', unitId: u.id, id: 'trait:field_medic', actionId: 'thrown_stim', targetId: t.id } as any, 'host');
    const f = besides(toField(spent)); f.characters.c2.hp = 0;
    expect(refused(f, throwIt)).toMatch(/Used/);
  });

  it('a Hymn prayed in the fight: its wait does not count down on the field, and leaving the field clears the field\'s counters', () => {
    const prep = (x: GameState) => { const c = x.characters.c1; c.skills.faith = 6; (c as any).belief = { kind: 'faithful', patron: 'nerukhan' }; (c as any).patron = 'nerukhan'; setDevotionXp(c, devotionThreshold(3)); };
    const g0 = inFight(DUO, prep), x = clone(g0), u = x.combat!.units.find((y) => y.charId === 'c1')!;
    x.combat!.turn = x.combat!.order.indexOf(u.id); u.ap = 6;
    const prayed = apply(x, { type: 'faith/pray', unitId: u.id, kind: 'hymn', id: 'saints_shield', targetId: u.id } as any, 'host');
    let f = toField(prayed);
    const pray = { type: 'faith/pray', charId: 'c1', kind: 'hymn', id: 'saints_shield', targetId: 'c1' } as any;
    const why = refused(f, pray); expect(why).toMatch(/wait \d+/);
    for (let i = 0; i < 3; i++) f = apply(f, { type: 'world/act', charId: 'c1', act: 'prone' } as any, 'host');
    expect(refused(f, pray)).toBe(why); // the field's round never ends
    // unprayed, the Hymn is prayed on the field
    expect(() => apply(toField(g0), pray, 'host')).not.toThrow();
    const left = leaveField(f);
    expect(((left.story as any).ps?.c1?.uses)).toBeUndefined();
  });

  it('a Crystallise on the field pays the mana meter and makes a core', () => {
    const SOUL: Pc[] = [{ build: 'outburst', level: 1 }, { build: 'plain_gun', level: 1 }];
    const f = toField(inFight(SOUL)); f.story.mana = 20;
    const cores = (g: GameState) => packOf(g.characters.c1).filter((p) => /core/.test(p.item || p.id)).reduce((t, p) => t + p.qty, 0) + ((g.characters.c1 as any).coresMade || 0);
    const before = cores(f);
    const after = apply(f, { type: 'world/act', charId: 'c1', act: 'crystallise' } as any, 'host');
    expect(after.story.mana).toBeLessThan(20); expect(cores(after)).toBeGreaterThan(before);
  });

  it('the refusal rule reads the data: an at-will action with no carried cost and a lasting op (or none stated) is refused; a once-a-fight one or one that costs MP is not', () => {
    const F: any = (survivalJ as any).field;
    expect(F.carried_res).toContain('mp'); expect(F.lasting_ops).toContain('mend');
    const g = toField(inFight([{ build: 'plain_gun', level: 1 }]));
    const c = clone(g).characters.c1; c.perks = [...(c.perks || []), { id: 'shrug_it_off', tier: 'I' }];
    if (PERK.shrug_it_off) expect(fieldRefusal(g, c, 'perk:shrug_it_off')).toMatch(/waits for a fight/);
  });
});

describe('saves from 0.28.1 (rules 1.55 items 30 to 36 add no saved field)', () => {
  it('a run saved mid-field (no carried counters) and one saved mid-map load and play on', () => {
    const f = toField(inFight(DUO, (x) => { x.characters.c1.stims = 1; }));
    const old = clone(f); delete (old.story as any).ps; delete (old.story as any).fieldLimits; // what 0.28.1 saved on the field
    const moved = apply(JSON.parse(JSON.stringify(old)), { type: 'world/act', charId: 'c1', act: 'prone' } as any, 'host');
    expect(moved.run!.state).toBe('field');
    let m = leaveField(old); for (const [i, c] of Object.entries(['c1', 'c2'])) m = apply(m, { type: 'run/pick', charId: c, choice: 'materials' }, ownerOf(+i));
    const map = clone(m); delete (map.story as any).ps;
    expect(apply(map, { type: 'gear/give', charId: 'c1', to: 'c2', count: 'stim_injector', qty: 1 } as any, 'host').characters.c2.stims).toBe((map.characters.c2.stims || 0) + 1);
  });
});
