// Rules 1.55 items 30 to 32 (0.28.2, the lead's rulings R1 and R2 on Leon's playtest): a give of any item anywhere out
// of a fight (the path map, the field), counted items (stims) given as items, a stim used on a friend with no map under
// the squad (the fight's own stim). (The field's own actions are in survival-field-fight.test.ts since 0.28.3: rules
// 1.55 items 61 to 67.) Everything through the reducer with real actions; numbers are read from the state and the data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, reachable, packOf, giveView, magazineWorth, maxHp } from '../src';
import { survivalRoom, startRun, ownerOf, leaveField, walkIn } from './helpers/survival';
import type { Pc } from './helpers/replay';

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
  g = walkIn(g); expect(g.run!.state).toBe('fight');
  return g;
}
/** The won fight's field (the test room's skip). */
const toField = (g: GameState) => { const f = apply(g, { type: 'run/skip' }, 'host'); expect(f.run!.state).toBe('field'); return f; };

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
    expect(giveView(healed, 'host').rows.find((r) => r.kind === 'count' && r.id === 'stim_injector')!.use!.why.c2).toBeNull();
    expect(refused(healed, { type: 'world/act', charId: 'c2', act: 'stim', targetId: 'c1' } as any)).toBe('Not your character.');
  });
});
