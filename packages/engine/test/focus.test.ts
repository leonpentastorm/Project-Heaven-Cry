// A magic focus counts only when it is held in a hand (spec: Hands 2; items 630-635; decision 103). Every rule goes
// through apply(), the path a player's click takes.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  apply, newGame, newCharacter, hasEvoker, hasEmanator, carriesEvoker, carriesEmanator, focusHand, packOf, positionsOf, migrateCharacterFocus,
  ARCHETYPES, KITS, refOf, type Action, type Character, type GameState, type Unit,
} from '../src';
import { storyWith, sheetOf } from './helpers/perkfight';

const HOST = 'host';
const refused = (g: GameState, a: any, by = HOST): string => { try { apply(g, a as Action, by); return ''; } catch (e: any) { return String(e.message || e); } };
const tool = (id: string, qty = 1): any => ({ id, item: id, name: id, qty, kind: 'tool' });
const gun = (id: string): any => ({ id, name: id, qty: 1, kind: 'weapon', weapon: id });

/** A story with one Sigil-kit and one Soul-kit character; `setup` changes them before the fight; then a fight against one
 * soldier, on the first character's turn with full AP. */
function fight(setup: (sig: Character, soul: Character) => void, foes: any[] = [{ name: 'Target', tier: 'soldier', weapon: 'service_pistol', at: 'L6' }]) {
  const s = storyWith([{ name: 'Sigilist', kit: 'sigil', archetype: 'sigilist', skills: { brain_power: 5 } }, { name: 'Heart', kit: 'soul', skills: { will_power: 5 } }]);
  const [a, b] = s.chars.map((c) => s.g.characters[c.id]);
  a.sigils = ['fire', 'seek']; a.evoCharge = 10;
  setup(a, b);
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Focus test', map: 'yard16', difficulty: 'standard', enemies: foes } } } as any);
  const api = {
    get g(): GameState { return s.g; },
    unit: (c: Character): Unit => s.g.combat!.units.find((u) => u.charId === c.id)!,
    char: (c: Character): Character => s.g.characters[c.id],
    act: (a: any) => s.act(a as Action, HOST),
    /** Make it this character's turn with full AP (enemy turns pass through end-turn). */
    turn(c: Character) {
      for (let i = 0; i < 12 && s.g.combat!.order[s.g.combat!.turn] !== api.unit(c).id && !s.g.combat!.over; i++) s.act({ type: 'combat/end-turn', unitId: s.g.combat!.order[s.g.combat!.turn] } as any);
      return api.unit(c);
    },
    sig: a, soul: b,
  };
  return api;
}
type F = ReturnType<typeof fight>;
const draw = (f: F, c: Character) => { const u = f.turn(c); f.act({ type: 'combat/draw', unitId: u.id, word: 'fire', tile: refOf(u.pos) }); return f.g.combat!.glyphs || []; };
const drawRefused = (f: F, c: Character) => { const u = f.turn(c); return refused(f.g, { type: 'combat/draw', unitId: u.id, word: 'fire', tile: refOf(u.pos) }); };

describe('a focus counts only in a hand', () => {
  it('the Sigil and Soul kits start with their focus in the off hand (one-handed guns)', () => {
    expect(KITS.sigil.offHand).toBe('evoker'); expect(KITS.soul.offHand).toBe('emanator');
    const a = ARCHETYPES[0], c = newCharacter('x', 'p', { ...sheetOf({ name: 'K' }), kit: 'sigil', archetype: a.id } as any);
    expect(c.offHand?.id).toBe('evoker'); expect(hasEvoker(c)).toBe(true); expect(focusHand(c, 'evoker')).toBe('off');
  });
  it('a two-handed rifle and the Evoker in the pack: no drawing ("Needs an Evoker in hand.")', () => {
    const f = fight((a) => { a.weapon = 'hellraiser_service_rifle'; a.loaded = 30; a.offHand = null; a.pack = [...packOf(a), tool('evoker')]; });
    expect(hasEvoker(f.char(f.sig))).toBe(false); expect(carriesEvoker(f.char(f.sig))).toBe(true); expect(focusHand(f.char(f.sig), 'evoker')).toBe('pack');
    expect(drawRefused(f, f.sig)).toBe('Needs an Evoker in hand.');
    expect(f.unit(f.sig).mg!.charge).toBe(10); // the carried Evoker keeps its core's charge
  });
  it('a two-handed rifle with an Evoker left in the off hand (an old save): it doesn\'t count', () => {
    const f = fight((a) => { a.weapon = 'hellraiser_service_rifle'; a.loaded = 30; a.offHand = { id: 'evoker' }; });
    expect(hasEvoker(f.char(f.sig))).toBe(false); expect(drawRefused(f, f.sig)).toMatch(/Needs an Evoker in hand/);
  });
  it('a one-handed pistol and the Evoker in the off hand: drawing works', () => {
    const f = fight(() => {});
    expect(f.char(f.sig).weapon).toBe('service_pistol'); expect(f.char(f.sig).offHand?.id).toBe('evoker');
    expect(draw(f, f.sig).some((x) => x.word === 'fire')).toBe(true);
  });
  it('the Evoker blade alone (no Evoker item): drawing works', () => {
    const f = fight((a) => { a.weapon = 'evoker_blade'; a.loaded = 0; a.offHand = null; });
    expect(focusHand(f.char(f.sig), 'evoker')).toBe('main'); expect(draw(f, f.sig).some((x) => x.word === 'fire')).toBe(true);
  });
  it('the spellslinger\'s pistol and the Grand staff (two-handed) count as an Evoker while held', () => {
    const p = fight((a) => { a.weapon = 'spellslinger_pistol'; a.loaded = 12; a.offHand = null; });
    expect(draw(p, p.sig).some((x) => x.word === 'fire')).toBe(true);
    const st = fight((a) => { a.weapon = 'grand_staff'; a.loaded = 0; a.offHand = { id: 'evoker' }; });
    expect(focusHand(st.char(st.sig), 'evoker')).toBe('main'); expect(draw(st, st.sig).some((x) => x.word === 'fire')).toBe(true);
  });
  it('the Emanator gauntlet: MP pays the Outburst, Syphon works; with the Emanator in the pack it draws on the air', () => {
    const f = fight((_, b) => { b.weapon = 'emanator_gauntlet'; b.loaded = 0; b.offHand = null; b.mp = 100; });
    let u = f.turn(f.soul); expect(u.mg!.emanator).toBe(true);
    const mp0 = u.mg!.mp, d = f.char(f.soul).outbursts![0];
    f.act({ type: 'combat/outburst', unitId: u.id, design: d.id, hold: true }); u = f.unit(f.soul);
    expect(u.mg!.held).toBeTruthy(); expect(u.mg!.mp).toBeLessThan(mp0);
    // In the pack: Syphon refused; Begin costs no MP and +2 Strain more (item 631).
    const p = fight((_, b) => { b.offHand = null; b.pack = [...packOf(b), tool('emanator')]; b.mp = 100; });
    let v = p.turn(p.soul); expect(v.mg!.emanator).toBe(false); expect(carriesEmanator(p.char(p.soul))).toBe(true);
    expect(refused(p.g, { type: 'combat/syphon', unitId: v.id })).toBe('Needs an Emanator in hand.');
    const mp1 = v.mg!.mp, st0 = v.mg!.strain;
    p.act({ type: 'combat/outburst', unitId: v.id, design: p.char(p.soul).outbursts![0].id, hold: true }); v = p.unit(p.soul);
    expect(v.mg!.held).toBeTruthy(); expect(v.mg!.mp).toBe(mp1); expect(v.mg!.strain).toBeGreaterThanOrEqual(st0 + 3);
  });
  it('swapping the Evoker from the pack into the off hand costs 1 AP; then drawing works', () => {
    const f = fight((a) => { a.offHand = null; a.pack = [...packOf(a), tool('evoker')]; });
    let u = f.turn(f.sig); expect(drawRefused(f, f.sig)).toMatch(/Evoker in hand/);
    const ap = u.ap, idx = packOf(f.char(f.sig)).findIndex((x) => (x.item || x.id) === 'evoker');
    f.act({ type: 'combat/swap', unitId: u.id, from: idx, to: 'off' }); u = f.unit(f.sig);
    expect(u.ap).toBe(ap - 1); expect(f.char(f.sig).offHand?.id).toBe('evoker'); expect(u.mg!.evoker).toBe(true);
    expect(f.g.combat!.log.some((l) => /takes the Evoker in the off hand \(1 AP\) · an Evoker in hand/.test(l))).toBe(true);
    expect(draw(f, f.sig).some((x) => x.word === 'fire')).toBe(true);
  });
  it('rules 1.9: the sheet\'s equip action in a fight draws the Evoker from the pack (1 AP) and casting works; put away (1 AP), it stops', () => {
    const f = fight((a) => { a.offHand = null; a.pack = [...packOf(a), tool('evoker')]; });
    let u = f.turn(f.sig); expect(drawRefused(f, f.sig)).toBe('Needs an Evoker in hand.');
    const ap = u.ap;
    f.act({ type: 'gear/equip', charId: f.sig.id, idx: 'evoker', to: 'off' }); u = f.unit(f.sig);
    expect(u.ap).toBe(ap - 1); expect(u.mg!.evoker).toBe(true); expect(u.mg!.charge).toBe(10); // the core's charge came with it
    expect(draw(f, f.sig).some((x) => x.word === 'fire')).toBe(true);
    u = f.unit(f.sig); const ap2 = u.ap;
    f.act({ type: 'combat/stow', unitId: u.id, slot: 'off' }); u = f.unit(f.sig);
    expect(u.ap).toBe(ap2 - 1); expect(u.mg!.evoker).toBe(false); expect(drawRefused(f, f.sig)).toBe('Needs an Evoker in hand.');
  });
  it('a two-handed weapon refuses the off-hand swap; drawing one in (2 AP) stows the Evoker and stops new casts', () => {
    const f = fight((a) => { a.pack = [...packOf(a), gun('hellraiser_service_rifle')]; });
    let u = f.turn(f.sig);
    const idx = packOf(f.char(f.sig)).findIndex((x) => x.weapon === 'hellraiser_service_rifle'), ap = u.ap;
    f.act({ type: 'combat/swap', unitId: u.id, from: idx }); u = f.unit(f.sig);
    expect(u.ap).toBe(ap - 2); // rules 1.9 (item 684): a two-handed draw is 2 AP, one a hand (item 633's 1 AP is superseded)
    expect(f.char(f.sig).weapon).toBe('hellraiser_service_rifle'); expect(f.char(f.sig).offHand ?? null).toBeNull(); expect(u.mg!.evoker).toBe(false);
    expect(f.g.combat!.log.some((l) => /the Evoker stowed: no Sigils/.test(l))).toBe(true);
    expect(drawRefused(f, f.sig)).toBe('Needs an Evoker in hand.');
    const ev = packOf(f.char(f.sig)).findIndex((x) => (x.item || x.id) === 'evoker');
    expect(refused(f.g, { type: 'combat/swap', unitId: u.id, from: ev, to: 'off' })).toMatch(/needs both hands/);
  });
  it('an Outburst already held stays held when the Emanator is put away, and still releases', () => {
    const f = fight((_, b) => { b.mp = 100; b.pack = [...packOf(b), gun('hellraiser_service_rifle')]; });
    let u = f.turn(f.soul);
    f.act({ type: 'combat/outburst', unitId: u.id, design: f.char(f.soul).outbursts![0].id, hold: true }); u = f.unit(f.soul);
    expect(u.mg!.held).toBeTruthy();
    const idx = packOf(f.char(f.soul)).findIndex((x) => x.weapon === 'hellraiser_service_rifle');
    f.act({ type: 'combat/swap', unitId: u.id, from: idx }); u = f.unit(f.soul);
    expect(u.mg!.emanator).toBe(false); expect(u.mg!.held).toBeTruthy();
    const foe = f.g.combat!.units.find((x) => x.side === 'foe')!, [ux, uy] = u.pos.split(',').map(Number);
    foe.pos = (ux + 2) + ',' + uy; // within the design's reach
    f.act({ type: 'combat/release', unitId: u.id, aim: refOf(foe.pos) }); u = f.unit(f.soul);
    expect(u.mg!.held).toBeFalsy();
  });
  it('an enemy caster still casts: its Evoker is in hand', () => {
    const f = fight(() => {}, [{ name: 'Hedge-witch', tier: 'soldier', weapon: 'service_pistol', at: 'F6', caster: 'sigil_adept' }]);
    const foe = () => f.g.combat!.units.find((x) => x.side === 'foe')!;
    expect(foe().mg!.evoker).toBe(true);
    for (let i = 0; i < 16 && !f.g.combat!.over; i++) {
      if ((f.g.combat!.glyphs || []).some((x) => x.side === 'foe') || f.g.combat!.log.some((l) => /Hedge-witch (draws|evokes)/i.test(l))) break;
      f.act({ type: 'combat/end-turn', unitId: f.g.combat!.order[f.g.combat!.turn] });
    }
    expect((f.g.combat!.glyphs || []).some((x) => x.side === 'foe') || f.g.combat!.log.some((l) => /Hedge-witch (draws|evokes)/i.test(l))).toBe(true);
  });
});

describe('the story and the area map read the same hands', () => {
  it('drawing on the area map with the Evoker in the pack is refused', () => {
    const s = storyWith([{ name: 'Sigilist', kit: 'sigil', archetype: 'sigilist', skills: { brain_power: 5 } }]);
    const c = s.g.characters[s.chars[0].id]; c.sigils = ['fire', 'seek']; c.offHand = null; c.pack = [...packOf(c), tool('evoker')];
    const at = positionsOf(s.g)[c.id];
    expect(refused(s.g, { type: 'world/act', charId: c.id, act: 'draw', word: 'fire', tile: at })).toMatch(/Needs an Evoker in hand/);
  });
  it('a long rest refills the MP of an Emanator carried in the pack', () => {
    const s = storyWith([{ name: 'Heart', kit: 'soul', skills: { will_power: 5 } }]);
    const c = s.g.characters[s.chars[0].id]; c.offHand = null; c.pack = [...packOf(c), tool('emanator')]; c.mp = 0;
    s.act({ type: 'narrator/turn', turn: { narration: 'You sleep.', rest: { kind: 'long' } } } as any);
    expect(s.g.characters[c.id].mp).toBeGreaterThan(0);
  });
  it('old saves: a focus only in the pack moves to a free off hand once, with a note; a two-handed weapon keeps it in the pack', () => {
    const s = storyWith([{ name: 'Old', kit: 'sigil', archetype: 'sigilist' }, { name: 'Rifle', kit: 'sigil', archetype: 'sigilist' }]);
    const [a, b] = s.chars.map((c) => s.g.characters[c.id]);
    for (const c of [a, b]) { delete c.focusRev; c.offHand = null; c.pack = [...packOf(c), tool('evoker')]; }
    b.weapon = 'hellraiser_service_rifle';
    s.act({ type: 'story/pass' } as any);
    expect(s.g.characters[a.id].offHand?.id).toBe('evoker'); expect(hasEvoker(s.g.characters[a.id])).toBe(true);
    expect(s.g.characters[b.id].offHand ?? null).toBeNull(); expect(focusHand(s.g.characters[b.id], 'evoker')).toBe('pack');
    expect(s.g.story.entries.some((e) => /Old: a focus counts only in a hand now; the Evoker goes to the off hand/.test(String(e.text)))).toBe(true);
    expect(s.g.story.entries.some((e) => /Rifle: a focus counts only in a hand now; the Evoker stays in the pack \(a two-handed weapon\)/.test(String(e.text)))).toBe(true);
    expect(migrateCharacterFocus(s.g.characters[a.id])).toEqual([]); // once
  });
});

describe('the Proving Ground', () => {
  it('the Sigil kit puts the Evoker in a free off hand; the Soul kit the Emanator; a two-handed weapon keeps it in the pack and the tool says so', () => {
    let g = newGame('PGFOCUS', { id: HOST, name: 'Host' });
    g = apply(g, { type: 'sandbox/start', archetype: 'sharpshooter' } as any, HOST);
    const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'sandbox/give', charId: id, item: 'service_pistol', equip: true } as any, HOST);
    g = apply(g, { type: 'sandbox/kit', charId: id, kind: 'sigil' } as any, HOST);
    expect(g.characters[id].offHand?.id).toBe('evoker'); expect(hasEvoker(g.characters[id])).toBe(true);
    g = apply(g, { type: 'sandbox/kit', charId: id, kind: 'soul' } as any, HOST);
    expect(hasEmanator(g.characters[id])).toBe(false); expect(carriesEmanator(g.characters[id])).toBe(true);
    expect(g.story.entries.some((e) => /an Emanator \(in the pack: your off hand holds Evoker; swap it into a hand to cast\)/.test(String(e.text)))).toBe(true);
    let h = newGame('PGFOCUS2', { id: HOST, name: 'Host' });
    h = apply(h, { type: 'sandbox/start', archetype: 'sharpshooter' } as any, HOST);
    const id2 = Object.keys(h.characters)[0];
    h = apply(h, { type: 'sandbox/give', charId: id2, item: 'hellraiser_service_rifle', equip: true } as any, HOST);
    h = apply(h, { type: 'sandbox/kit', charId: id2, kind: 'sigil' } as any, HOST);
    expect(hasEvoker(h.characters[id2])).toBe(false);
    expect(h.story.entries.some((e) => /an Evoker \(in the pack: your two-handed .* fills both hands; swap it into a hand to cast\)/.test(String(e.text)))).toBe(true);
  });
});

describe('the spent core\'s picture names the Evoker that throws it out (fx only)', () => {
  it('an off-hand Evoker, an Evoker blade in the hand', () => {
    const last = (f: F) => (f.g.combat!.fx || []).filter((e) => e.k === 'core').pop();
    const f = fight(() => {});
    let u = f.turn(f.sig); f.act({ type: 'combat/core', unitId: u.id });
    expect(last(f)).toMatchObject({ k: 'core', unit: u.id, focus: 'evoker' });
    const b = fight((a) => { a.weapon = 'evoker_blade'; a.offHand = null; });
    u = b.turn(b.sig); expect(u.mg!.evoker).toBe(true); b.act({ type: 'combat/core', unitId: u.id });
    expect(last(b)).toMatchObject({ k: 'core', focus: 'evoker_blade' });
  });
});
