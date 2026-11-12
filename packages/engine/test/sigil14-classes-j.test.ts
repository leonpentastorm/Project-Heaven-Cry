// Lane classes-j under Sigil rules 1.4 (decision 98; docs/design/sigil-1.4-impact.md): the Blade Scribe, Siege Engineer
// and Spellslinger moves that touch Sigils, each shown working through the reducer (apply): Sword Form draws on your
// own tile, Edge Sigil's elements (ACID in, STONE out), Three-Cut Script's spell as Touch on the last target, Deploy
// Cover's STAY glyph beside the barricade, Inscribed Rounds' Elements and Afflictions, Spell Magazine's spell as Touch.
import { describe, expect, it } from 'vitest';
import './helpers/grammar-only'; // rules 1.17: the Line multiplier is off here (these tests pin the grammar's own numbers)
import { d20, emit, objectsOf, condOn, type Unit, type Combat, type Character } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

function rngFor(n: number): number { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return s; } throw new Error('no seed'); }
/** A seed whose next k d20 rolls are all 2–19 (no criticals, no natural 1s). */
function calm(k = 12): number { for (let s = 1; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < k && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const seed = (f: { g: any }, n: number) => { f.g.rng.state = rngFor(n); };
const at = (u: Unit, k: string) => { u.pos = k; return u; };
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const charOf = (g: any, u: Unit): Character => g.characters[u.charId!];
const tough = (u: Unit, def = 0) => { u.hp = u.maxHp = 999; u.def = def; u.armour = 0; u.injResist = 0; (u as any).sv = { body: -99, brain: -99, heart: -99 }; return u; };
const cls = (adv: string, extra: any = {}) => ({ advancedClass: adv, ...extra });
const mk = (id: string, t: string) => 'class:' + id + '#' + t;
const evoker = (u: Unit, words: string[], extra: any = {}) => { u.mg = { words, designs: [], evoker: true, emanator: false, charge: 10, cores: 0, coresMade: 0, flux: 0, mp: 0, mpMax: 0, strain: 0, held: null, cast: false, brain: 2, will: 0, sigilMult: 1, sigilBoon: 1, soulMult: 1, soulBoon: 1, deal: 1, elemMult: 1, healMult: 1, maxWords: 3, glyphAp: 1, coreSave: 0, rangeBonus: 0, durBonus: 0, soulAp: 2, costSave: 0, soulRange: 0, syphon: 1, strainLimit: 3, saves: { body: 0, brain: 0, heart: 0 }, debuff: { body: 0, brain: 0, heart: 0 }, ...extra } as any; return u; };
const foes = (cb: Combat) => cb.units.filter((u) => u.side === 'foe');
const zonesOf = (cb: Combat, kind: string) => (cb.zones || []).filter((z) => z.kind === kind);

// ============================================================ Blade Scribe
describe('Blade Scribe under 1.4', () => {
  it('Sword Form: the glyph goes on your own tile for no AP (charge and Flux paid), even on a miss', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'seek']); tough(at(f.foe, '3,5'), 99); pc.ap = 6;
    seed(f, 5);
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'melee', mods: [mk('blade_scribe.sword_form', 'word_fire')] } as any);
    expect(f.pc.ap).toBe(4); expect(f.pc.mg!.charge).toBe(8); expect(f.pc.mg!.flux).toBe(1);
    expect((f.cb.glyphs || []).map((g) => g.pos + ':' + g.word)).toEqual(['2,5:fire']); // not the target's tile
  });
  it('Sword Form: refused (nothing spent, the strike still lands) when your tile already holds a glyph', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'seek']); tough(at(f.foe, '3,5')); pc.ap = 9;
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'melee', mods: [mk('blade_scribe.sword_form', 'word_fire')] } as any);
    const ch = f.pc.mg!.charge, n = f.foe.hp;
    seed(f, 15);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'melee', mods: [mk('blade_scribe.sword_form', 'word_seek')] } as any);
    expect(logHas(f.cb, /Sword Form: One glyph per tile/)).toBe(true);
    expect(f.pc.mg!.charge).toBe(ch); expect((f.cb.glyphs || []).length).toBe(1); expect(f.foe.hp).toBeLessThan(n);
  });
  it('Sword Form: the glyph joins a Line you then walk and Evoke (FIRE · SEEK, the Line read along)', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'seek']); tough(at(f.foe, '2,4')); pc.ap = 9;
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'melee', mods: [mk('blade_scribe.sword_form', 'word_fire')] } as any);
    f.pc.pos = '3,5';
    f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'seek', tile: '3,5' } as any);
    const far = foes(f.cb)[0]; at(far, '6,5'); tough(far, -99); const hp = far.hp; f.pc.pos = '1,5'; f.pc.ap = 9; // beyond the FIRE end: the Line fires along, east
    f.act({ type: 'combat/evoke', unitId: f.pc.id, tile: '3,5', aim: '6,5' } as any);
    expect(logHas(f.cb, /evokes FIRE · SEEK/)).toBe(true);
    expect(foes(f.cb)[0].hp).toBeLessThan(hp);
  });
  it('Edge Sigil: SHOCK adds its 30 as Elemental; ACID adds 15 with no Corroded; STONE adds nothing', () => {
    for (const [w, re, n] of [['shock', /Edge Sigil: SHOCK runs down the blade · 30 damage/, true], ['acid', /Edge Sigil: ACID runs down the blade · 15 damage/, true], ['stone', /Edge Sigil/, false]] as const) {
      const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
      const pc = f.turn(at(f.pc, '2,5')); evoker(pc, [w]); tough(at(f.foe, '3,5')); pc.ap = 6;
      seed(f, 10);
      f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'melee', mods: [mk('blade_scribe.sword_form', 'word_' + w)] } as any);
      expect(logHas(f.cb, re)).toBe(n);
      if (w === 'acid') expect(condOn(f.foe, 'corroded')).toBe(false);
    }
  });
  it('Three-Cut Script: three cuts leave no glyphs; the words resolve as Touch on the last target, Reach ignored, ×0.9 a repeat', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'seek']); tough(at(f.foe, '3,5'), -99); pc.ap = 9;
    f.g.rng.state = calm();
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'blade_scribe.three_cut_script', targetId: f.foe.id, choice: 'fire,seek,fire' } as any);
    expect(f.pc.ap).toBe(3);
    expect(f.cb.log.filter((l) => /strikes Foe 1/.test(l)).length).toBe(3);
    expect((f.cb.glyphs || []).length).toBe(0);
    expect(f.pc.mg!.charge).toBe(10 - (2 + 2 + 2) - 3); expect(f.pc.mg!.flux).toBe(3);
    // FIRE + half a FIRE = 45 (item 589), one repeat ×0.9 = 41 (40.5 rounds up); SEEK's Reach multiplier doesn't apply (Touch)
    expect(logHas(f.cb, /The script resolves on Foe 1 \(3 charge\) · FIRE hits Foe 1 \(d20 \d+\) · 41 damage to Foe 1/)).toBe(true);
    expect((f.cb.fx || []).some((e: any) => e.k === 'evoke' && e.shape === 'touch' && e.impact === '3,5')).toBe(true);
  });
  it('Three-Cut Script: a Burst applies at the last target (SPREAD catches the foe beside it, and an ally: friendly fire)', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' }), {}], [{ at: 'O10' }, { at: 'O11' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'spread']); const [a, b] = foes(f.cb);
    tough(at(a, '3,5'), -99); tough(at(b, '4,5'), -99); const ally = f.cb.units.find((u) => u.side === 'pc' && u !== pc)!; at(ally, '3,6'); ally.hp = ally.maxHp = 999; ally.def = -99;
    const hb = b.hp, ha = ally.hp; pc.ap = 9; f.g.rng.state = calm(16);
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'blade_scribe.three_cut_script', targetId: a.id, choice: 'fire,spread,spread' } as any);
    expect(logHas(f.cb, /The script resolves on Foe 1/)).toBe(true);
    expect(foes(f.cb)[1].hp).toBeLessThan(hb);
    expect(f.cb.units.find((u) => u.id === ally.id)!.hp).toBeLessThan(ha);
  });
  it('Three-Cut Script: the 1.4 grammar refuses a second Reach word and a spell of Subjects only, before anything is spent', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'seek', 'arc']); tough(at(f.foe, '3,5')); pc.ap = 9;
    expect(() => f.act({ type: 'combat/perk', unitId: pc.id, id: 'blade_scribe.three_cut_script', targetId: f.foe.id, choice: 'fire,seek,arc' } as any)).toThrow(/second Reach word/);
    expect(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'blade_scribe.three_cut_script', targetId: f.foe.id, choice: 'fire,fire,fire' } as any)).toThrow(/another word/);
    expect(f.pc.mg!.charge).toBe(10); expect(f.pc.ap).toBe(9);
  });
  it('Three-Cut Script: TWICE\'s second missile flies (it was paid for): at another target you cut, else the nearest enemy next to the last', () => {
    for (const split of [false, true]) {
      const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }, { at: 'O11' }]);
      const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'twice']); const [a, b] = foes(f.cb);
      tough(at(a, '3,5'), -99); tough(at(b, '3,4'), -99); pc.ap = 9; f.g.rng.state = calm(16);
      const targetIds = split ? [b.id, a.id, a.id] : [a.id, a.id, a.id];
      f.act({ type: 'combat/perk', unitId: pc.id, id: 'blade_scribe.three_cut_script', targetId: a.id, targetIds, choice: 'fire,twice,fire' } as any);
      expect(f.pc.mg!.flux).toBe(4); // TWICE's Flux paid
      expect(logHas(f.cb, /missile 2 at /)).toBe(true);
      const ev = (f.cb.fx || []).filter((e: any) => e.k === 'evoke' && e.by === 'three_cut_script').pop() as any;
      expect(ev.missiles.map((m: any) => m.impact)).toEqual(['3,5', '3,4']);
    }
  });
  it('Three-Cut Script: STAY places a field on the last target\'s tile instead of striking', () => {
    const f = fightWith([cls('blade_scribe', { weapon: 'sabre' })], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'stay']); tough(at(f.foe, '3,5'), -99); pc.ap = 9;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'blade_scribe.three_cut_script', targetId: f.foe.id, choice: 'fire,stay,stay' } as any);
    const z = zonesOf(f.cb, 'field');
    expect(z.length).toBe(1); expect(z[0].tiles).toContain('3,5');
  });
});

// ============================================================ Siege Engineer
describe('Siege Engineer under 1.4', () => {
  it('Deploy Cover: a STAY glyph you draw on your tile beside the barricade makes it full cover; Evoking it away ends that', () => {
    const f = fightWith([cls('siege_engineer')], [{ at: 'O10' }]);
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['stay', 'fire']); pc.ap = 9;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'siege_engineer.deploy_cover', tile: '3,5' } as any);
    const bar = () => objectsOf(f.cb).find((o) => o.name === 'Portable barricade')!;
    expect(bar().kind).toBe('crate');
    f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'stay', tile: '2,5' } as any);
    expect(bar().kind).toBe('barricade');
    // a glyph two tiles away doesn't, and an enemy's STAY doesn't
    f.cb.glyphs = [{ id: 'gx', word: 'stay', pos: '1,5', by: f.pc.id, side: 'pc', left: 2, who: 'x' } as any, { id: 'gy', word: 'stay', pos: '4,5', by: f.foe.id, side: 'foe', left: 2, who: 'y' } as any];
    withGame(f.g, () => emit(f.cb, 'turn_end', { u: f.pc, cb: f.cb, rng: f.g.rng }));
    expect(bar().kind).toBe('crate');
  });
});

// ============================================================ Spellslinger
describe('Spellslinger under 1.4', () => {
  it('Inscribed Rounds: an ACID round bites for 7 and Corrodes; a BIND round Pins; a Boon (WARD) is refused', () => {
    const s = storyWith([cls('spellslinger', { weapon: 'spellslinger_pistol' })]); const c = s.g.characters[s.chars[0].id];
    c.sigils = ['ward', 'seek']; c.evoCharge = 10;
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'spellslinger.inscribed_rounds', choice: 'ward', text: '2' } as any)).toThrow(/Element or an Affliction/);
    for (const [w, re, cond] of [['acid', /inscribed ACID round bites · 7 damage/, 'corroded'], ['bind', /inscribed BIND round bites/, 'pinned']] as const) {
      const f = fightWith([cls('spellslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
      (charOf(f.g, f.pc).state ||= {})['class:spellslinger.inscribed_rounds'] = { word: w, n: 2 };
      const pc = f.turn(at(f.pc, '2,5')); evoker(pc, [w]); tough(at(f.foe, '5,5')); seed(f, 10);
      f.act({ type: 'combat/attack', unitId: pc.id, targetId: f.foe.id, mode: 'shot' } as any);
      expect(logHas(f.cb, re)).toBe(true);
      expect(condOn(f.foe, cond)).toBe(true);
    }
  });
  it('Spell Magazine: stored as words (1.4 grammar); its first hit fires the spell as Touch on the target, no roll', () => {
    const s = storyWith([cls('spellslinger', { weapon: 'spellslinger_pistol' })]); const c = s.g.characters[s.chars[0].id];
    c.sigils = ['fire', 'seek', 'spread']; c.evoCharge = 10;
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'spellslinger.spell_magazine', actionId: 'spell_magazine', choice: 'fire' } as any)).toThrow(/another word/);
    s.act({ type: 'story/perk', charId: c.id, id: 'spellslinger.spell_magazine', actionId: 'spell_magazine', choice: 'fire,seek' } as any);
    expect(s.g.characters[c.id].state!['class:spellslinger.spell_magazine'].words).toEqual(['fire', 'seek']);
    expect(s.g.characters[c.id].evoCharge).toBe(10 - (2 + 2) - 2);
    const f = fightWith([cls('spellslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }, { at: 'O11' }]);
    (charOf(f.g, f.pc).state ||= {})['class:spellslinger.spell_magazine'] = { words: ['fire', 'spread'], rest: (f.g.sessionN ?? 1) + '.' + (f.g.restN ?? 0) };
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'spread']); const [a, b] = foes(f.cb); tough(at(a, '6,5')); tough(at(b, '6,6')); pc.ap = 6;
    const hb = b.hp;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'spellslinger.spell_magazine', actionId: 'load_spell_magazine' } as any);
    seed(f, 10);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: a.id, mode: 'shot' } as any);
    expect(logHas(f.cb, /spell magazine fires FIRE · SPREAD into Foe 1 · FIRE catches Foe 1/)).toBe(true);
    expect(foes(f.cb)[1].hp).toBeLessThan(hb); // the Burst centres on the target
  });
  it('Spell Magazine: TWICE\'s second missile goes to the nearest enemy next to the target', () => {
    const f = fightWith([cls('spellslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }, { at: 'O11' }]);
    (charOf(f.g, f.pc).state ||= {})['class:spellslinger.spell_magazine'] = { words: ['fire', 'twice'], rest: (f.g.sessionN ?? 1) + '.' + (f.g.restN ?? 0) };
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'twice']); const [a, b] = foes(f.cb); tough(at(a, '6,5')); tough(at(b, '6,6')); pc.ap = 6;
    const hb = b.hp;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'spellslinger.spell_magazine', actionId: 'load_spell_magazine' } as any);
    seed(f, 10);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: a.id, mode: 'shot' } as any);
    expect(logHas(f.cb, /spell magazine fires FIRE · TWICE into Foe 1 · missile 1 at .*missile 2 at /)).toBe(true);
    expect(foes(f.cb)[1].hp).toBeLessThan(hb);
  });
  it('Spell Magazine: WAIT sets its trap on the target\'s tile; a 1.2 magazine with RETURN fires nothing', () => {
    const f = fightWith([cls('spellslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    (charOf(f.g, f.pc).state ||= {})['class:spellslinger.spell_magazine'] = { words: ['fire', 'wait'], rest: (f.g.sessionN ?? 1) + '.' + (f.g.restN ?? 0) };
    const pc = f.turn(at(f.pc, '2,5')); evoker(pc, ['fire', 'wait']); tough(at(f.foe, '6,5')); pc.ap = 9;
    f.act({ type: 'combat/perk', unitId: pc.id, id: 'spellslinger.spell_magazine', actionId: 'load_spell_magazine' } as any);
    seed(f, 10);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
    expect(zonesOf(f.cb, 'trap').map((z) => z.tiles[0])).toEqual(['6,5']);

    const g = fightWith([cls('spellslinger', { weapon: 'service_pistol' })], [{ at: 'O10' }]);
    (charOf(g.g, g.pc).state ||= {})['class:spellslinger.spell_magazine'] = { words: ['fire', 'return'], rest: (g.g.sessionN ?? 1) + '.' + (g.g.restN ?? 0) };
    const p2 = g.turn(at(g.pc, '2,5')); evoker(p2, ['fire']); tough(at(g.foe, '6,5')); p2.ap = 9;
    g.act({ type: 'combat/perk', unitId: p2.id, id: 'spellslinger.spell_magazine', actionId: 'load_spell_magazine' } as any);
    seed(g, 10);
    g.act({ type: 'combat/attack', unitId: g.pc.id, targetId: g.foe.id, mode: 'shot' } as any);
    expect(logHas(g.cb, /doesn't hold under the new grammar/)).toBe(true);
  });
});
