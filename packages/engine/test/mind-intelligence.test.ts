// Rules 1.74 (Mind), Intelligence: Brain Power's ladder and forks, Rumination's and Eloquence's new perks and Mastered
// engine halves, Brief re-stepped (calls.test.ts), the Sigilist's Backdraft, the old saves' remap. Numbers are read
// from data; every change goes through the reducer (combat/draw, combat/evoke, combat/vent, combat/call, combat/parley,
// combat/perk, door/pick) or the load door (migrateLoaded).
import { describe, it, expect } from 'vitest';
import './helpers/grammar-only';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { PERK, SKILL, CLASS, d20, condOn, migrateLoaded, pendingRepicks, sigilCoreSaving, itemsOf, heldOfChar, levelFactor, type Unit } from '../src';
import { fluxMaxOf, applyCond } from '../src/magic';
import { toHitTerms } from '../src/rolls';
import forksJ from '../../../data/forks.json';
import classesJ from '../../../data/classes.json';

const FORK = (id: string): any => (forksJ as any).items.find((x: any) => x.id === id);
function calm(n = 40): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calm();
/** A Sigil caster at 3,5 with a fresh Evoker, foes as minions with no saves, no armour, no Defense (the sigil tests' rig). */
function rig(words: string[], foes: string[] = ['14,9'], spec: CharSpec = {}, allies: string[] = []) {
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil', ...spec }, ...allies.map(() => ({ archetype: 'sigilist', kit: 'sigil' }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; });
  f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; }
  const u = f.turn(f.pc); u.ap = 60; Object.assign(u.mg!, { evoker: true, words: [...words], charge: 999, glyphAp: 1, maxWords: 4, flux: 0, sigilMult: 1, sigilBoon: 1, deal: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0 });
  f.g.rng.state = SEED;
  return f;
}
type F = ReturnType<typeof rig>;
const draw = (f: F, w: string, tile: string) => { f.pc.pos = tile; f.act({ type: 'combat/draw', unitId: f.pc.id, word: w, tile }); };
const L2 = ['4,5', '3,5'];
const line = (f: F, words = ['fire', 'seek']) => words.forEach((w, i) => draw(f, w, L2[i]));
const evoke = (f: F, aim = '8,5') => f.act({ type: 'combat/evoke', unitId: f.pc.id, tile: '3,5', aim } as any);
const dealt = (f: F, e: Unit) => 500 - f.unit(e.id).hp;

describe('Brain Power: the ladder (rules 1.74 item 6020)', () => {
  it('Overclock is held from Brain Power 2; the core-charge cut a Sigil comes at 3, 5 and 9', () => {
    const held = (bp: number) => { const f = rig(['fire', 'seek'], ['8,5'], { skills: { brain_power: bp } }); return itemsOf(heldOfChar(f.g.characters[f.pc.charId!])).map((i) => i.key); };
    expect(held(1)).not.toContain('skill:brain_power.2'); expect(held(2)).toContain('skill:brain_power.2');
    const cut = (bp: number) => { const f = rig(['fire'], ['8,5'], { skills: { brain_power: bp } }); return sigilCoreSaving(f.g.characters[f.pc.charId!]); };
    const pp: any = (SKILL as any).brain_power.per_point;
    expect(pp.charge_at).toEqual([3, 5, 9]);
    expect([2, 3, 4, 5, 8, 9, 10].map(cut)).toEqual([0, 1, 1, 2, 2, 3, 3].map((n) => n * pp.numbers.charge));
  });
});

describe('Brain Power: the forks (rules 1.74 item 6021)', () => {
  const bp = (picks: string[]): CharSpec => ({ skills: { brain_power: 8 }, picks });
  it('Overflux: a Sigil Evoked with the Flux at its limit deals more, by the row', () => {
    const run = (picks: string[]) => { const f = rig(['fire', 'seek'], ['8,5'], bp(picks)); line(f); f.pc.mg!.flux = withGame(f.g, () => fluxMaxOf(f.pc, f.cb)); evoke(f); return dealt(f, f.foe); };
    const plain = run(['fork.sigil.clean_vent', 'fork.sigil.written_in_advance']), over = run(['fork.sigil.overflux', 'fork.sigil.written_in_advance']);
    expect(plain).toBeGreaterThan(0); expect(over).toBe(Math.round(plain * FORK('fork.sigil.overflux').effects[0].value));
  });
  it('Clean Vent: once a turn the Vent pushes the foes next to you a tile and scorches them', () => {
    const f = rig(['fire', 'seek'], ['4,5', '3,7'], bp(['fork.sigil.clean_vent', 'fork.sigil.written_in_advance']));
    const [near, far] = f.foes; f.pc.mg!.flux = 3;
    f.act({ type: 'combat/vent', unitId: f.pc.id } as any);
    expect(f.unit(near.id).pos).toBe('5,5'); expect(dealt(f, near)).toBeGreaterThanOrEqual(Math.floor(FORK('fork.sigil.clean_vent').amounts.scorch.base)); // rules 1.95: a two-place base, the formula floors at the end expect(dealt(f, far)).toBe(0);
    f.unit(near.id).pos = '4,5'; const hp = f.unit(near.id).hp; f.pc.mg!.flux = 3;
    f.act({ type: 'combat/vent', unitId: f.pc.id } as any);
    expect(f.unit(near.id).pos).toBe('4,5'); expect(f.unit(near.id).hp).toBe(hp); // once a turn
  });
  it('Written in Advance: the first Evoke after a turn you ended with glyphs drawn deals more', () => {
    const run = (picks: string[]) => {
      const f = rig(['fire', 'seek'], ['8,5'], bp(picks)); line(f);
      f.act({ type: 'combat/end-turn', unitId: f.pc.id } as any); f.cb.round++; f.turn(f.pc); f.pc.ap = 60; f.g.rng.state = SEED;
      evoke(f); return dealt(f, f.foe);
    };
    const plain = run(['fork.sigil.clean_vent', 'fork.sigil.running_script']), aged = run(['fork.sigil.clean_vent', 'fork.sigil.written_in_advance']);
    expect(plain).toBeGreaterThan(0); expect(aged).toBe(Math.round(plain * FORK('fork.sigil.written_in_advance').effects[2].value));
  });
  it('Running Script: after an Evoke, the next glyph this turn costs no AP and adds no Flux; the one after pays', () => {
    const f = rig(['fire', 'seek'], ['8,5'], bp(['fork.sigil.clean_vent', 'fork.sigil.running_script'])); line(f); evoke(f);
    const ap0 = f.pc.ap, fl0 = f.pc.mg!.flux; draw(f, 'fire', '4,5');
    expect(f.pc.ap).toBe(ap0); expect(f.pc.mg!.flux).toBe(fl0);
    const ap1 = f.pc.ap; draw(f, 'seek', '3,5'); expect(f.pc.ap).toBeLessThan(ap1);
  });
});

describe('Rumination and Eloquence: the new perks and Mastered halves (rules 1.74 items 6022, 6023)', () => {
  it('Thinking Aloud: after a Call, the next Evoke this turn costs 0 AP; II: the next glyph adds no Flux', () => {
    const run = (tier: string | null) => {
      const f = rig(['fire', 'seek'], ['8,5'], { skills: { eloquence: 3 }, perks: tier ? { thinking_aloud: tier } : {} }, ['3,7']);
      f.act({ type: 'combat/call', unitId: f.pc.id, id: 'call.brief', targetId: f.pcs[1].id } as any);
      const fl0 = f.pc.mg!.flux; line(f); const fl1 = f.pc.mg!.flux; const ap = f.pc.ap; evoke(f);
      return { evoke: ap - f.pc.ap, flux: fl1 - fl0 };
    };
    const none = run(null), one = run('I'), two = run('II');
    expect(none.evoke).toBeGreaterThan(0); expect(one.evoke).toBe(0); expect(two.evoke).toBe(0);
    expect(one.flux).toBe(none.flux); expect(two.flux).toBeLessThan(none.flux);
  });
  it('Index II: in a fight, the next Brain save after an Index answer is better by the row; tier I gives none', () => {
    const run = (tier: string) => {
      const f = rig(['fire'], ['5,5'], { skills: { rumination: 5 }, perks: { index: tier } }); f.unit(f.pc.id).sv = { body: 0, brain: 0, heart: 0 } as any;
      f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'perk:index', actionId: 'index_question' } as any);
      f.g.rng.state = SEED;
      const l = withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.unit(f.pc.id), 'left_brain_debuff', undefined, 'brain'));
      const m = l.match(/= (−?-?\d+)/); if (!m) throw new Error('no save total in: ' + l); return Number(m[1].replace('−', '-'));
    };
    const one = run('I'), two = run('II');
    expect(Number.isFinite(one)).toBe(true); expect(two - one).toBe((PERK.index as any).tiers.II.effects[3].value);
  });
  it('Footnote II: once cited, the own Sigils of the citer count the fact too (a to-hit term); tier I does not', () => {
    const term = (tier: string) => {
      const f = rig(['fire'], ['8,5'], { skills: { rumination: 5 }, perks: { footnote: tier } });
      f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'perk:footnote', actionId: 'cite_fight', targetId: f.foe.id } as any);
      return withGame(f.g, () => toHitTerms(f.cb, f.unit(f.pc.id), f.unit(f.foe.id), 'sigil')).filter((x) => x.label === 'Footnote').map((x) => x.v);
    };
    expect(term('I')).toEqual([]); expect(term('II').length).toBe(1);
  });
  it('Opening Argument II: the first Persuade, Threaten or Parley of a fight costs 0 AP; the next its price', () => {
    const run = (tier: string) => {
      const f = rig(['fire'], ['5,5', '5,6'], { skills: { eloquence: 5 }, perks: { opening_argument: tier } }); const [a, b] = f.foes;
      const ap0 = f.pc.ap; f.act({ type: 'combat/parley', unitId: f.pc.id, targetId: a.id, kind: 'persuade' } as any); const first = ap0 - f.pc.ap;
      const ap1 = f.pc.ap; f.act({ type: 'combat/parley', unitId: f.pc.id, targetId: b.id, kind: 'threaten' } as any); return [first, ap1 - f.pc.ap];
    };
    const [i1, i2] = run('I'), [ii1, ii2] = run('II');
    expect(i1).toBeGreaterThan(0); expect(i2).toBe(i1); expect(ii1).toBe(0); expect(ii2).toBe(i1);
  });
  it('Established Fact (engine half): once a fight, your own Overload deals you no damage', () => {
    const run = (perks: any) => { const f = rig(['fire', 'seek'], ['14,9'], { skills: { rumination: 10 }, perks }); const out: number[] = [];
      for (let i = 0; i < 2; i++) { f.pc.mg!.flux = withGame(f.g, () => fluxMaxOf(f.pc, f.cb)); f.pc.mg!.lockRound = undefined as any; const hp = f.unit(f.pc.id).hp; draw(f, 'fire', '4,5'); out.push(hp - f.unit(f.pc.id).hp); f.cb.glyphs = []; f.cb.round++; }
      return out; };
    const held = run({ established_fact: 'mastered' });
    expect(held[0]).toBe(0); expect(held[1]).toBeGreaterThan(0);
  });
  it('Closing Argument (engine half): once a fight, your Persuade gets no save', () => {
    const f = rig(['fire'], ['5,5', '5,6'], { skills: { eloquence: 10 }, perks: { closing_argument: 'mastered' } }); const [a, b] = f.foes;
    for (const e of [a, b]) f.unit(e.id).sv = { body: 99, brain: 99, heart: 99 } as any;
    f.act({ type: 'combat/parley', unitId: f.pc.id, targetId: a.id, kind: 'persuade' } as any);
    f.act({ type: 'combat/parley', unitId: f.pc.id, targetId: b.id, kind: 'persuade' } as any);
    expect(condOn(f.unit(a.id), 'left_brain_debuff')).toBe(true); expect(condOn(f.unit(b.id), 'left_brain_debuff')).toBe(false);
  });
});

describe('the Sigilist: Backdraft (rules 1.74 item 6025)', () => {
  it('when your Evoker overloads, every foe next to you takes its damage too (a flat amount, by level); a foe farther off takes none', () => {
    const f = rig(['fire', 'seek'], ['5,5', '8,8'], { classId: 'mage', level: 6, attrs: { intelligence: 5 } }); const [near, far] = f.foes;
    expect(((classesJ as any).base.find((b: any) => b.id === 'mage').ranks.II.moves[0]).id).toBe('backdraft');
    f.pc.mg!.flux = withGame(f.g, () => fluxMaxOf(f.pc, f.cb)); const hp = f.unit(f.pc.id).hp;
    draw(f, 'fire', '4,5');
    const self = hp - f.unit(f.pc.id).hp;
    expect(self).toBeGreaterThan(0); expect(dealt(f, near)).toBe(Math.floor(self * levelFactor('deal', f.unit(f.pc.id).level))); expect(dealt(f, far)).toBe(0); // a flat amount: it grows with the level, as every character's
  });
});

describe('old saves (rules 1.74 item 6024)', () => {
  it('Rumination 5 and Eloquence 5: the old passives are preselected perks; a Burden of Proof becomes Objection!', () => {
    const f = fightWith([{ skills: { rumination: 5, eloquence: 5 }, attrs: { intelligence: 5 } }], [{}]);
    const g: any = JSON.parse(JSON.stringify(f.g)); g.combat = null;
    for (const c of Object.values(g.characters) as any[]) { delete c.perkRev; delete c.perkRepick; c.perks = [...c.perks.filter((p: any) => !PERK[p.id] || !(PERK[p.id] as any).skills.includes('eloquence')), { id: 'burden_of_proof', tier: 'II' }]; }
    const c: any = Object.values(migrateLoaded(g).characters)[0];
    expect(c.perkRepick.rumination).toEqual([{ id: 'index', tier: 'I' }, { id: 'proven_formula', tier: 'I' }]);
    expect(c.perkRepick.eloquence, JSON.stringify(c.perkRepick.eloquence)).toEqual([{ id: 'objection', tier: 'II' }]);
    expect(c.perks.some((p: any) => p.id === 'burden_of_proof')).toBe(false);
    expect(pendingRepicks(c).map((x: any) => x.skill)).toEqual(expect.arrayContaining(['rumination', 'eloquence']));
  });
});
