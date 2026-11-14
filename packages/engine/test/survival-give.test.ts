// Survival step 4b (rules 1.46; survival-spec rule 47, section 4.2 primitive 13, section 8.3): gives between players
// through the one reducer (credits, a pack entry, a graded weapon with mods and a Relic property arriving whole and
// unmerged; every refusal in words), the shop's Upgrade tab joined to 4a's grade step through the services seam (the
// full price, one step a visit, the before/after numbers), a focus's grade on its door's rolls on its card, and the
// full-screen place's view of every safe node (its face, its tabs, its cards). Numbers are read from data.
import { describe, expect, it } from 'vitest';
import { type GameState, apply, RuleError, creditsOf, packOf, gearPreview, shopView, placeView, giveView, gradePrice, GRADE_UP, RARITY, BOON_CAP, worthOf, GIVE, FACES } from '../src';
import { survivalRoom, ownerOf } from './helpers/survival';
import type { Pc } from './helpers/replay';

const DUO: Pc[] = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];
const refused = (g: GameState, a: any, by = 'host') => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
const started = (pcs: Pc[] = DUO, seed = 'PHC-0001') => apply(survivalRoom(seed, pcs, { test: true }), { type: 'run/start', seed }, 'host');
const clone = (g: GameState): GameState => JSON.parse(JSON.stringify(g));
/** The squad at a node of this kind (depth 5), every player marking it. */
function at(kind: string, o: { pcs?: Pc[]; credits?: number; prep?: (g: GameState) => void } = {}): GameState {
  const g0 = clone(started(o.pcs || DUO)), r = g0.run!;
  const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
  n.kind = kind as any; r.at = prev.id; r.state = 'map';
  for (const c of Object.values(g0.characters)) c.credits = o.credits ?? 10000;
  o.prep?.(g0);
  let g = g0; for (let i = 0; i < (o.pcs || DUO).length && g.run!.at !== n.id; i++) g = apply(g, { type: 'run/move', node: n.id }, ownerOf(i));
  return g;
}
const lastLine = (g: GameState) => [...g.story.entries].reverse().find((e: any) => e.kind === 'system')?.text || '';

describe('rules 1.46: gives between players (rule 47, primitive 13)', () => {
  it('credits move from one purse to the other at a safe node, logged in words, no confirm from the receiver', () => {
    let g = at('rest', { credits: 500 });
    g = apply(g, { type: 'gear/give', charId: 'c1', to: 'c2', credits: 300 }, 'host');
    expect(creditsOf(g.characters.c1)).toBe(200); expect(creditsOf(g.characters.c2)).toBe(800);
    expect(lastLine(g)).toBe(g.characters.c1.name + ' gives ' + g.characters.c2.name + ' 300 credits.');
    expect(g.run!.visit!.log![0]).toMatch(/gives .* 300 credits/);
    expect(refused(g, { type: 'gear/give', charId: 'c1', to: 'c2', credits: 201 })).toBe(g.characters.c1.name + ' has 200 credits.');
    expect(refused(g, { type: 'gear/give', charId: 'c1', to: 'c2', credits: 0 })).toBe('Give 1 credit or more.');
  });

  it('a graded weapon with mods and a Relic property arrives whole and unmerged, beside the receiver\'s own of the same kind', () => {
    let g = at('forge', { prep: (x) => {
      const gun = x.characters.c1.weapon;
      x.characters.c1.pack = [...packOf(x.characters.c1), { id: gun, weapon: gun, name: 'gift', qty: 1, kind: 'weapon', rarity: 'relic', dur: 7, mods: ['mod_red_dot', 'mod_suppressor'], prop: 'prop.keen' }];
      x.characters.c2.pack = [...packOf(x.characters.c2), { id: gun, weapon: gun, name: 'own', qty: 1, kind: 'weapon' }];
    } });
    const gun = g.characters.c1.weapon, idx = packOf(g.characters.c1).findIndex((x) => x.prop === 'prop.keen'), had = packOf(g.characters.c2).length;
    g = apply(g, { type: 'gear/give', charId: 'c1', to: 'c2', idx }, 'host');
    const got = packOf(g.characters.c2).filter((x) => x.weapon === gun);
    expect(packOf(g.characters.c2).length).toBe(had + 1); expect(got.length).toBe(2);
    const gift = got.find((x) => x.prop === 'prop.keen')!;
    expect(gift).toMatchObject({ rarity: 'relic', dur: 7, mods: ['mod_red_dot', 'mod_suppressor'], prop: 'prop.keen', qty: 1 });
    expect(packOf(g.characters.c1).some((x) => x.prop === 'prop.keen')).toBe(false);
    expect(lastLine(g)).toMatch(/gives .*relic.*Keen.*2 mods/i);
  });

  it('stacks give part of themselves; loose rounds merge by calibre as a pickup does', () => {
    let g = at('shrine', { prep: (x) => { x.characters.c1.pack = [...packOf(x.characters.c1), { id: 'stim_x', item: 'spare_parts', name: 'Spare parts', qty: 3, kind: 'tool' }]; } });
    const idx = packOf(g.characters.c1).findIndex((x) => x.id === 'stim_x');
    g = apply(g, { type: 'gear/give', charId: 'c1', to: 'c2', idx, qty: 2 }, 'host');
    expect(packOf(g.characters.c1).find((x) => x.id === 'stim_x')!.qty).toBe(1);
    expect(packOf(g.characters.c2).find((x) => x.id === 'stim_x')!.qty).toBe(2);
    expect(refused(g, { type: 'gear/give', charId: 'c1', to: 'c2', idx: packOf(g.characters.c1).findIndex((x) => x.id === 'stim_x'), qty: 5 })).toBe('Give 1 to 1 of those.');
  });

  it('refusals in words: in a fight, at a fight node, a boon, a training, the armour class, a Relic past the receiver\'s cap, not yours, solo', () => {
    const g = at('rest');
    const fight = clone(g); fight.run!.state = 'fight';
    expect(refused(fight, { type: 'gear/give', charId: 'c1', to: 'c2', credits: 5 })).toBe('Hand things over after the fight.');
    const fnode = clone(g); fnode.run!.nodes.find((n) => n.id === fnode.run!.at)!.kind = 'fight';
    expect(refused(fnode, { type: 'gear/give', charId: 'c1', to: 'c2', credits: 5 })).toMatch(/^Gives are made at a node with no fight/);
    expect(GIVE.where).not.toContain('fight');
    const boon = clone(g); boon.characters.c1.relics = ['prop.keen'];
    expect(refused(boon, { type: 'gear/give', charId: 'c1', to: 'c2', relic: 'prop.keen' })).toMatch(/never given/);
    expect(refused(g, { type: 'gear/give', charId: 'c1', to: 'c2', train: 'drill' })).toMatch(/^Training is .* never given\.$/);
    expect(refused(g, { type: 'gear/give', charId: 'c1', to: 'c2', armour: true })).toMatch(/armour class is fitted/);
    const cap = clone(g), gun = cap.characters.c1.weapon;
    cap.characters.c1.pack = [...packOf(cap.characters.c1), { id: gun, weapon: gun, name: 'x', qty: 1, kind: 'weapon', rarity: 'relic', prop: 'prop.keen' }];
    cap.characters.c2.relics = Array(Math.ceil((BOON_CAP - worthOf('prop.keen') + 1) / worthOf('prop.keen'))).fill('prop.keen');
    expect(refused(cap, { type: 'gear/give', charId: 'c1', to: 'c2', idx: packOf(cap.characters.c1).length - 1 })).toMatch(/past the run's cap/);
    expect(refused(g, { type: 'gear/give', charId: 'c2', to: 'c1', credits: 5 }, 'host')).toMatch(/^Only .*'s player gives/);
    const solo = at('rest', { pcs: [{ build: 'plain_gun', level: 1 }] });
    expect(refused(solo, { type: 'gear/give', charId: 'c1', to: 'c1', credits: 5 })).toMatch(/nobody to give to/);
    expect(giveView(solo, 'host').none).toMatch(/nobody to give to/);
  });

  it('the Give tab\'s view lists every line with its reasons per receiver; a give in the shop is in its log and the keeper says the "gave" line', () => {
    const shop = at('shop');
    expect(shop.run!.state).toBe('shop');
    const v = giveView(shop, 'host');
    expect(v.to.map((t) => t.id)).toEqual(['c2']);
    expect(v.rows.find((r) => r.kind === 'credits')!.why.c2).toBeNull();
    expect(v.rows.find((r) => r.key === 'train')!.why.c2).toMatch(/never given/);
    expect(v.rows.some((r) => r.kind === 'held' && r.unequip === 'main')).toBe(true);
    const g = apply(shop, { type: 'gear/give', charId: 'c1', to: 'c2', credits: 40 }, 'host');
    expect(g.run!.shop!.log[0]).toMatch(/gives .* 40 credits/);
    const face = FACES.find((f) => f.id === g.run!.shop!.face)!;
    expect(g.run!.shop!.line.kind).toBe('gave'); expect(face.lines.gave).toContain(g.run!.shop!.line.text);
  });
});

describe('rules 1.46: the shop\'s Upgrade tab is 4a\'s grade step (the services seam)', () => {
  it('a card per carried weapon or focus at the full price, with the numbers before and after; one step a visit, refused in words', () => {
    let g = at('shop', { prep: (x) => { x.run!.stage = 2; } });
    const v = shopView(g as any, 'host')!, card = v.services.find((s) => s.key === 'grade:main')!;
    expect(card.price).toBe(gradePrice('fine', 'shop')); expect(card.why).toBeNull();
    expect(card.action).toMatchObject({ type: 'run/upgrade', charId: 'c1', where: 'main', place: 'shop' });
    expect(card.note).toMatch(new RegExp('at a Forge: ' + gradePrice('fine', 'forge')));
    expect(card.lines.some((l) => /To hit/.test(l.label) && l.before !== l.after)).toBe(true);
    const before = creditsOf(g.characters.c1);
    g = apply(g, card.action as any, 'host');
    expect(g.characters.c1.weaponState?.rarity).toBe('fine');
    expect(before - creditsOf(g.characters.c1)).toBe(GRADE_UP.price.fine * GRADE_UP.places.shop);
    expect(g.run!.shop!.log[0]).toMatch(/Fine now/);
    const again = shopView(g as any, 'host')!.services.find((s) => s.key.startsWith('grade:'))!;
    expect(again.why).toMatch(/One grade step a visit/);
  });

  it('a focus card shows its grade on the door\'s rolls (rules 1.43 focusAccTerm): Standard +0, Fine +1', () => {
    const g = started(DUO), c = g.characters.c2;
    const line = (r: any) => gearPreview(c, { id: 'evoker', rarity: r }).lines.find((l) => l.key === 'door_acc')!;
    expect(line('standard').num).toBe(0); expect(line('fine').num).toBe(RARITY.fine.acc); expect(line('masterwork').num).toBe(RARITY.masterwork.acc);
  });
});

describe('rules 1.46: every safe node opens as a full-screen place', () => {
  it('the Forge: the armourer, Upgrade / Mods and pieces / Armour fitting / Give, its cards the engine\'s options', () => {
    const g = at('forge'), v = placeView(g, 'host')!;
    const after = apply(g, v.cards.find((x) => x.o.key === 'grade:main')!.o.action as any, 'host');
    expect(placeView(after, 'host')!.log[0]).toMatch(/Fine now/); // the visit's log strip
    expect(v.face.id).toBe('armourer'); expect(v.face.line).toBeTruthy();
    expect(v.tabs.map((t) => t.id)).toEqual(['upgrade', 'stock', 'fit', 'give']);
    const grade = v.cards.find((x) => x.o.key === 'grade:main')!;
    expect(grade.o.price).toBe(gradePrice('fine', 'forge')); expect(grade.lines.length).toBeGreaterThan(0);
  });
  it('a training ground, a shrine (its rolled patron), a crossroads and a rest each have their face and tabs', () => {
    for (const [k, face, tab] of [['training', 'sergeant', 'train'], ['shrine', 'patron', 'shrine'], ['event', 'broker', 'trade'], ['rest', 'medic', 'train']] as const) {
      const v = placeView(at(k), 'host')!;
      expect(v.face.id).toBe(face); expect(v.tabs.map((t) => t.id)).toEqual([tab, 'give']);
      expect(v.cards.length).toBeGreaterThan(0);
      if (k === 'shrine') expect(v.face.patron).toBeTruthy();
    }
    expect(placeView(at('shop'), 'host')).toBeNull(); // the shop has its own view
  });
});
