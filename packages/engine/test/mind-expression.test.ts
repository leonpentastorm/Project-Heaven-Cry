// Rules 1.74 (Mind), Expression: Visualization's four fork options (ruling layer section 5b), Improvisation's and
// Charisma's new perks, the old saves' remap. Rally, Parley, Quick Sketch, Salvage and Cash in at 2 are tested beside
// their systems (calls, perks-e, rigger, figments-2). Numbers are read from data; every change goes through the reducer
// (combat/perk on Picture and the Masterwork, combat/owned orders, door/pick) or the load door (migrateLoaded).
import { describe, it, expect } from 'vitest';
import { figFight } from './helpers/figfight';
import { withGame, fightWith } from './helpers/perkfight';
import { applyDamage, attackDamage, migrateLoaded, coreAp, heldMax, type Unit } from '../src';
import { toHitTerms } from '../src/rolls';
import { tiesOf } from '../src/kit';
import { FORM, ladderAt } from '../src/figments';
import forksJ from '../../../data/forks.json';
import perksJ from '../../../data/perks.json';

const FORK = (id: string): any => (forksJ as any).items.find((x: any) => x.id === id);
const PK = (id: string): any => (perksJ as any).items.find((x: any) => x.id === id);
const V = (picks: string[], extra: any = {}) => figFight([{ ...extra, skills: { visualization: 8, ...(extra.skills || {}) }, picks, forms: ['double', 'beast', 'snare'], weapon: 'service_pistol' }], [{ tier: 'soldier', at: '9,4', classic: true }]);
type F = ReturnType<typeof figFight>;
const make = (f: F, form = 'beast', tile = '3,4') => { let u = f.turn(f.pc); u.ap = 9; f.picture(u, form, tile); u = f.unit(u.id); return { u, fig: f.figments(u)[f.figments(u).length - 1] }; };
const hit = (f: F, t: Unit, n: number, by: Unit) => { const was = f.unit(t.id).hp; withGame(f.g, () => applyDamage(f.cb, f.unit(t.id), n, { by, type: 'weapon' } as any)); return was - f.unit(t.id).hp; };

describe('Visualization: the forks at 4 (rules 1.74 item 6041)', () => {
  it('Hard Light: your Figments take less damage by the row; one destroyed gives you AP next turn, once a round', () => {
    const plain = V(['fork.figment.sharp_light', 'fork.figment.many_hands']), hard = V(['fork.figment.hard_light', 'fork.figment.many_hands']);
    const a = make(plain), b = make(hard);
    for (const x of [a.fig, b.fig]) { (x as any).armour = 0; }
    const tp = hit(plain, a.fig, 10, plain.foe), th = hit(hard, b.fig, 10, hard.foe);
    expect(tp).toBe(10); expect(th).toBe(Math.floor(10 * FORK('fork.figment.hard_light').effects[0].value));
    const n0 = hard.unit(b.u.id).apNext || 0; hit(hard, b.fig, 9999, hard.foe);
    expect((hard.unit(b.u.id).apNext || 0) - n0).toBe(FORK('fork.figment.hard_light').effects[1].value);
  });
  it('Sharp Light: your Figments\' blows deal more by the row; after one drops a foe, the next order costs no AP', () => {
    const f = V(['fork.figment.sharp_light', 'fork.figment.many_hands']); const { u, fig } = make(f);
    const d = withGame(f.g, () => attackDamage(f.cb, f.unit(fig.id), f.foe, 'melee', null, { preview: true }));
    expect(d.mults.filter((m: any) => m.label === 'Sharp Light').map((m: any) => m.v)).toEqual([FORK('fork.figment.sharp_light').effects[0].value]);
    hit(f, f.foe, 99999, f.unit(fig.id));
    const ap = f.unit(u.id).ap; f.order(f.unit(u.id), f.unit(fig.id), 'figment_redraw', { tile: '3,5' });
    expect(f.unit(u.id).ap).toBe(ap);
  });
});

describe('Visualization: the forks at 8 (rules 1.74 item 6041)', () => {
  it('Many Hands: one more Figment held; Picture costs a charge less, never under its floor', () => {
    const plain = V(['fork.figment.sharp_light', 'fork.figment.masterwork']), many = V(['fork.figment.sharp_light', 'fork.figment.many_hands']);
    const a = make(plain), b = make(many);
    expect(heldMax(b.u)).toBe(heldMax(a.u) + FORK('fork.figment.many_hands').effects[0].value);
    const ch = (f: F, u: Unit) => f.unit(u.id).mg!.vcharge!;
    const c0 = ch(plain, a.u), c1 = ch(many, b.u); const k0 = c0, k1 = c1;
    plain.picture(a.u, 'snare', '3,6'); many.picture(b.u, 'snare', '3,6');
    expect((k1 - ch(many, b.u))).toBe(Math.max(FORK('fork.figment.many_hands').effects[1].min, (k0 - ch(plain, a.u)) + FORK('fork.figment.many_hands').effects[1].value));
  });
  it('Masterwork: name a Figment; it hits truer and takes less; once a round one order to it is free; naming another moves the mark', () => {
    const f = V(['fork.figment.sharp_light', 'fork.figment.masterwork']); const { u } = make(f, 'beast', '3,4'); f.picture(f.unit(u.id), 'beast', '3,6');
    const [a, b] = f.figments(f.unit(u.id)); const mw = FORK('fork.figment.masterwork').effects;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:fork.figment.masterwork', targetId: a.id } as any);
    expect(tiesOf(f.cb, f.unit(u.id), 'masterwork', 'from'), f.cb.log.slice(-3).join(' | ')).not.toEqual([]);
    expect(tiesOf(f.cb, f.unit(u.id), 'masterwork', 'from').map((t: any) => t.to)).toEqual([a.id]);
    expect(withGame(f.g, () => toHitTerms(f.cb, f.unit(a.id), f.foe, 'weapon')).filter((x) => x.label === 'Masterwork').map((x) => x.v)).toEqual([mw[1].value]);
    (f.unit(a.id) as any).armour = 0; const dmg = Math.floor(f.unit(a.id).maxHp / 2); // rules 1.95: a blow the Figment's new-scale bar survives
    expect(hit(f, f.unit(a.id), dmg, f.foe)).toBe(Math.floor(dmg * mw[2].value));
    const ap = f.unit(u.id).ap; f.order(f.unit(u.id), f.unit(a.id), 'figment_redraw', { tile: '4,4' }); expect(f.unit(u.id).ap).toBe(ap);
    f.unit(u.id).mg!.vcharge = 50; f.cb.round++; f.turn(f.unit(u.id));
    f.act({ type: 'combat/perk', unitId: u.id, id: 'verb:fork.figment.masterwork', targetId: b.id } as any);
    expect(tiesOf(f.cb, f.unit(u.id), 'masterwork', 'from').map((t: any) => t.to)).toEqual([b.id]);
  });
});

describe('Improvisation and Charisma: the perks (rules 1.74 items 6042, 6043)', () => {
  it('Jury-Rig: a Figment of yours destroyed gives AP next turn (II: and charge); with Hard Light only the fork\'s AP stands', () => {
    const run = (tier: string, picks: string[]) => { const f = V(picks, { skills: { proficiency: 5 }, perks: { jury_rig: tier } }); const { u, fig } = make(f); const n0 = f.unit(u.id).apNext || 0, c0 = f.unit(u.id).mg!.vcharge!; hit(f, fig, 9999, f.foe); return [(f.unit(u.id).apNext || 0) - n0, f.unit(u.id).mg!.vcharge! - c0]; };
    const j = PK('jury_rig').tiers;
    expect(run('I', ['fork.figment.sharp_light', 'fork.figment.many_hands'])).toEqual([j.I.effects[0].value, 0]);
    expect(run('II', ['fork.figment.sharp_light', 'fork.figment.many_hands'])).toEqual([j.II.effects[0].value, j.II.effects[1].value]);
    expect(run('I', ['fork.figment.hard_light', 'fork.figment.many_hands'])[0]).toBe(FORK('fork.figment.hard_light').effects[1].value);
  });
  it('Tuned II: a core swap costs less; tier I does not', () => {
    const cost = (tier: string) => { const f = fightWith([{ skills: { proficiency: 5 }, perks: { tuned: tier } }], [{}]); const u = f.turn(f.pc); return withGame(f.g, () => coreAp(f.unit(u.id), f.cb)); };
    expect(cost('II')).toBe(Math.max(PK('tuned').tiers.II.effects[1].min, cost('I') + PK('tuned').tiers.II.effects[1].value));
  });
  it('Showman: Picture costs a charge less (I); once a turn one Figment order costs no AP (II)', () => {
    const run = (tier: string | null) => { const f = V(['fork.figment.sharp_light', 'fork.figment.masterwork'], { skills: { charisma: 5 }, perks: tier ? { showman: tier } : {} }); let u = f.turn(f.pc); u.ap = 9; const c0 = u.mg!.vcharge!;
      f.picture(u, 'beast', '3,4'); u = f.unit(u.id); const charge = c0 - u.mg!.vcharge!; const fig = f.figments(u)[0];
      const ap = u.ap; f.order(u, fig, 'figment_redraw', { tile: '3,5' }); return [charge, ap - f.unit(u.id).ap]; };
    const plain = run(null), one = run('I'), two = run('II');
    expect(one[0]).toBe(Math.max(1, plain[0] - 1)); expect(one[1]).toBe(plain[1]); expect(two[1]).toBe(0);
    expect(FORM.beast.charge).toBe(plain[0]);
  });
});

describe('old saves (rules 1.74 item 6044)', () => {
  it('Improvisation 5 and Charisma 5: Tuned, Smooth and Parley are preselected; a held Talks Broke Down is Parley at its tier', () => {
    const f = fightWith([{ skills: { proficiency: 5, charisma: 5 }, attrs: { expression: 5 }, perks: { talks_broke_down: 'I' } }], [{}]);
    const g: any = JSON.parse(JSON.stringify(f.g)); g.combat = null;
    for (const c of Object.values(g.characters) as any[]) { delete c.perkRev; delete c.perkRepick; }
    const c: any = Object.values(migrateLoaded(g).characters)[0];
    expect(c.perkRepick.proficiency).toEqual([{ id: 'field_repair', tier: 'I' }, { id: 'tuned', tier: 'I' }]); // rules 1.82 item 7008: Field Repair (3) is a passive turned perk too
    expect(c.perkRepick.charisma).toEqual([{ id: 'talks_broke_down', tier: 'I' }, { id: 'smooth', tier: 'I' }]);
    expect(ladderAt(9).noSnap).toBe(false);
  });
});
