// 0.28.2 (Leon, the playtest: "no unlocks, no nothing, there isn't even a special icon for each summon"): the screens'
// views of Figments, through the reducer. The ladder view (every step open or locked with its requirement, the latest
// and the next), the design workshop view (forms, traits, designs, the reducer's own refusals) and the icons each row
// names (figments.json `icon`, catalogued in art/catalog.json figment_icons). Every number is read from the data.
import { describe, it, expect } from 'vitest';
import { storyWith } from './helpers/perkfight';
import { figFight } from './helpers/figfight';
import FIGJ from '../../../data/figments.json';
import CATJ from '../../../art/catalog.json';
import { figmentLadderView, figmentDesignView, figmentLookOf, pictureOptions, ladderAt, FORM, FIG_DESIGN_IN_FIGHT, formsOf, formWhy } from '../src';

const F: any = FIGJ, CAT: any = CATJ;
/** The points of the first ladder step that gives this (designs > 0). */
const firstDesigns = (): number => F.ladder.find((r: any) => (r.designs || 0) > 0).points;

describe('figment icons: every row names one, the catalog has it', () => {
  it('every form, the Scrap Turret and Picture carry an icon in figment_icons', () => {
    for (const row of [...F.forms, F.turret]) { expect(row.icon).toBeTruthy(); expect(CAT.figment_icons[row.icon]).toBeTruthy(); }
    expect(figmentLookOf(F.turret.id)!.icon).toBe(F.turret.icon);
    for (const f of F.forms) expect(figmentLookOf(f.id)).toMatchObject({ name: f.name, icon: f.icon });
    expect(figmentLookOf('no_such_thing')).toBeNull();
  });
  it("Picture's pick list carries each choice's icon (a design: its form's)", () => {
    const s = storyWith([{ skills: { visualization: 5 } }]); const id = s.chars[0].id;
    s.act({ type: 'figments/design', charId: id, design: { id: 'h', name: 'Hound', form: 'beast', traits: ['swift'] } } as any);
    const opts = pictureOptions(s.g.characters[id]);
    expect(opts[0]).toMatchObject({ id: 'd:h', icon: FORM.beast.icon });
    for (const o of opts.slice(1)) expect(o.icon).toBe(FORM[o.id].icon);
  });
  it('a pictured Figment is a unit whose companion row gives its icon (what the token draws)', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '9,4', classic: true }]);
    let u = f.turn(f.pc); f.picture(u, 'beast', '3,4'); u = f.unit(u.id);
    const b: any = f.figments(u)[0]; expect(figmentLookOf(b.companion)!.icon).toBe(FORM.beast.icon);
  });
});

describe('the ladder view (the moment something opens)', () => {
  it('every step of the data, open at its points, locked under them; the latest reached and the next', () => {
    for (const p of [0, 1, 2, 3, 5, 7, 10]) {
      const v = figmentLadderView(p);
      expect(v.door).toBe(F.visualizer.door); expect(v.steps.length).toBe(F.ladder.length);
      v.steps.forEach((s, i) => { expect(s.points).toBe(F.ladder[i].points); expect(s.open).toBe(p >= F.ladder[i].points); expect(s.text).toBe(F.ladder[i].text); });
      const reached = F.ladder.filter((r: any) => p >= r.points);
      expect(v.latest?.points ?? null).toBe(reached.length ? reached[reached.length - 1].points : null);
      expect(v.next?.points ?? null).toBe(F.ladder.find((r: any) => p < r.points)?.points ?? null);
      expect(v.known.n).toBe(p >= F.forms_known.from ? Math.min(F.forms_known.count.max, F.forms_known.count.base + p) : 0); // rules 1.70 item 5541
    }
  });
  it('the view names the forms a character learned, with their icons (rules 1.70 item 5541)', () => {
    const s = storyWith([{ skills: { visualization: 2 }, forms: ['eye'] }]); const c = s.g.characters[s.chars[0].id];
    const v = figmentLadderView(2, c);
    expect(v.known.chosen.map((x) => x.id)).toEqual(formsOf(c)); for (const x of v.known.chosen) expect(x.icon).toBe(FORM[x.id].icon);
  });
  it('raising Visualization through the reducer (a level-up point) moves the latest step', () => {
    const s = storyWith([{ skills: { visualization: firstDesigns() - 1 }, attrs: { expression: 7 } }]); const id = s.chars[0].id;
    const before = figmentLadderView(s.g.characters[id].skills.visualization).latest!.points;
    (s.g.characters[id] as any).unspent = { ...((s.g.characters[id] as any).unspent || {}), skill: 1 };
    s.act({ type: 'levelup/raise', charId: id, kind: 'skill', id: F.visualizer.door } as any);
    const c = s.g.characters[id]; expect(c.skills.visualization).toBe(firstDesigns());
    const v = figmentLadderView(c.skills.visualization); expect(v.latest!.points).toBe(firstDesigns()); expect(v.latest!.points).toBeGreaterThan(before);
  });
});

describe('the design workshop view, against the reducer (figments/design)', () => {
  it("below the first design step: no room, the reason names the step's points; the reducer refuses with the same words", () => {
    const s = storyWith([{ skills: { visualization: 1 } }]); const id = s.chars[0].id;
    const v = figmentDesignView(s.g.characters[id]);
    expect(v.designsMax).toBe(0); expect(v.newWhy).toBe('Designs open at Visualization ' + firstDesigns() + '.');
    expect(() => s.act({ type: 'figments/design', charId: id, design: { name: 'A', form: 'double', traits: [] } } as any)).toThrow(v.newWhy!);
  });
  it("forms open by the ladder, the rest locked with the form's own points; every trait with its charge", () => {
    const s = storyWith([{ skills: { visualization: 3 } }]); const c = s.g.characters[s.chars[0].id];
    const v = figmentDesignView(c);
    // rules 1.56: open is the character's (the ladder's forms and the forks it took: a pre-forks one keeps Eye and Wall)
    for (const f of v.forms) { const row = FORM[f.id]; expect(f.open).toBe(formsOf(c).includes(f.id)); expect(f.icon).toBe(row.icon); if (!f.open) expect(f.why).toBe(formWhy(c, f.id)); }
    expect(formsOf(c)).toEqual(expect.arrayContaining(['eye', 'wall'])); expect(formsOf(c)).not.toContain('ward');
    expect(v.traits.length).toBe(F.traits.length); expect(v.traitsMax).toBe(ladderAt(3).traits);
    for (const t of v.traits) expect(t.charge).toBe(F.trait_charge + (F.traits.find((x: any) => x.id === t.id).charge || 0));
  });
  it("a draft's verdict is the reducer's: a locked form, too many traits and a full shelf are refused with the view's words", () => {
    const s = storyWith([{ skills: { visualization: 3 } }]); const id = s.chars[0].id;
    const v = figmentDesignView(s.g.characters[id]);
    const locked = { id: '', name: 'Hound', form: 'beast', traits: [] }, two = { id: '', name: 'Two', form: 'eye', traits: ['keen', 'swift'] };
    expect(v.draftWhy(locked)).toMatch(/forms you know/); expect(() => s.act({ type: 'figments/design', charId: id, design: locked } as any)).toThrow(v.draftWhy(locked)!);
    expect(v.draftWhy(two)).toMatch(/trait/); expect(() => s.act({ type: 'figments/design', charId: id, design: two } as any)).toThrow(v.draftWhy(two)!);
    const ok = { id: '', name: 'Lookout', form: 'eye', traits: ['keen'] }; expect(v.draftWhy(ok)).toBeNull();
    for (let i = 0; i < v.designsMax; i++) s.act({ type: 'figments/design', charId: id, design: { ...ok, name: 'Lookout ' + i } } as any);
    const full = figmentDesignView(s.g.characters[id]);
    expect(full.designs.length).toBe(v.designsMax); expect(full.newWhy).toMatch(/drop one first/);
    expect(() => s.act({ type: 'figments/design', charId: id, design: ok } as any)).toThrow(full.newWhy!);
    // an existing design is edited in place (its id has room); dropping one makes room again
    const d0 = full.designs[0];
    expect(full.draftWhy({ id: d0.id, name: 'Renamed', form: 'eye', traits: [] })).toBeNull();
    s.act({ type: 'figments/design', charId: id, design: { id: d0.id, name: 'Renamed', form: 'eye', traits: [] } } as any);
    expect(figmentDesignView(s.g.characters[id]).designs[0]).toMatchObject({ id: d0.id, name: 'Renamed', traits: [] });
    s.act({ type: 'figments/design', charId: id, drop: d0.id } as any);
    expect(figmentDesignView(s.g.characters[id]).newWhy).toBeNull();
  });
  it("a kept design shows its form's look, its traits and the charge Picture will take; it is what Picture offers", () => {
    const s = storyWith([{ skills: { visualization: 5 } }]); const id = s.chars[0].id;
    s.act({ type: 'figments/design', charId: id, design: { id: 'h', name: 'Hound', form: 'beast', traits: ['swift'] } } as any);
    const v = figmentDesignView(s.g.characters[id]), d = v.designs[0];
    expect(d).toMatchObject({ id: 'h', name: 'Hound', form: 'beast', ready: true, why: null }); expect(d.look!.icon).toBe(FORM.beast.icon);
    expect(d.charge).toBe(v.chargeOf('beast', ['swift'])); expect(d.charge).toBe(FORM.beast.charge + F.trait_charge);
    expect(pictureOptions(s.g.characters[id]).map((o) => o.id)).toContain('d:h');
  });
  it('in a fight the view says what the reducer says: designs are made out of combat', () => {
    const f = figFight([{ skills: { visualization: 5 }, level: 5, weapon: 'service_pistol' }], [{ tier: 'soldier', at: '9,4', classic: true }]);
    const id = f.pc.charId!, v = figmentDesignView(f.g.characters[id], { inFight: f.g.phase === 'combat' });
    expect(v.newWhy).toBe(FIG_DESIGN_IN_FIGHT); expect(v.draftWhy({ id: '', name: 'A', form: 'double', traits: [] })).toBe(FIG_DESIGN_IN_FIGHT);
    expect(() => f.act({ type: 'figments/design', charId: id, design: { id: '', name: 'A', form: 'double', traits: [] } } as any)).toThrow(FIG_DESIGN_IN_FIGHT);
  });
});
