// Sigil rules 1.4, completeness batch 2 (spec items 481-489): COMMAND · move checked when planned and on its turn, every
// save in the log, a Stack's area around its caster, the four Sigil skill unlocks (Overclock, Twin Draw, Proven Formula,
// Paint the Field), the Evoker blade's Edge Word, Barrage and ACID, Stonewall's line of fire from the spell's origin, and
// the class-move previews the grid paints. Everything a player does goes through apply() (combat/draw, combat/evoke,
// combat/perk, combat/attack).
import { describe, expect, it } from 'vitest';
import './helpers/grammar-only'; // rules 1.17: the Line multiplier is off here (these tests pin the grammar's own numbers)
import { d20, emit, applyCond, previewEvoke, previewDraw, previewPerkAction, drawGlyph, evoke as evokeSpell, condOn, CLASS, allItems, itemsOf, heldOfChar, type Combat, type Unit } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

function calm(n = 40): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calm();
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));

/** A Sigil caster at D6 (3,5) on its turn (Glyph AP 1, a deep core, multipliers ×1, no bonuses), foes and allies where
 * given; everyone 500 HP, no armour, Defense and saves −99 (every roll hits, every save fails on this seed). */
function rig(words: string[], foes: string[] = ['14,9'], o: { skills?: Record<string, number>; maxWords?: number; allies?: string[]; spec?: CharSpec } = {}) {
  const allies = o.allies || [];
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil', ...(o.spec || {}), skills: { ...(o.spec?.skills || {}), ...(o.skills || {}) } }, ...allies.map(() => ({ archetype: 'sigilist', kit: 'sigil' }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; });
  f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; }
  const u = f.turn(f.pc); arm(u, words, o.maxWords ?? 4);
  f.g.rng.state = SEED;
  return f;
}
function arm(u: Unit, words: string[], maxWords = 4) {
  u.ap = 60; const m = u.mg!;
  Object.assign(m, { evoker: true, words: [...words], charge: 999, glyphAp: 1, maxWords, flux: -99, sigilMult: 1, sigilBoon: 1, deal: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0 });
}
type F = ReturnType<typeof rig>;
function line(f: F, words: string[], tiles: string[]) { words.forEach((w, i) => { f.pc.pos = tiles[i]; f.act({ type: 'combat/draw', unitId: f.pc.id, word: w, tile: tiles[i] }); }); }
const evoke = (f: F, tile: string, aim: string, o: Record<string, any> = {}) => f.act({ type: 'combat/evoke', unitId: f.pc.id, tile, aim, ...o } as any);
const plan = (f: F, tile: string, aim: string, o: Record<string, any> = {}) => withGame(f.g, () => previewEvoke(f.cb, f.pc, tile, aim, o));
const perk = (f: F, id: string, actionId: string, extra: Record<string, any> = {}) => f.act({ type: 'combat/perk', unitId: f.pc.id, id, actionId, ...extra } as any);
const L2 = ['4,5', '3,5'], L3 = ['5,5', '4,5', '3,5'];

// ---------------------------------------------------------------------------------------------------------------------
describe('gap 13: COMMAND · move is checked when planned, Evoked and obeyed (item 481)', () => {
  it('a tile past the 3-tile walk, or none, is refused before anything is spent; a good one previews its walk', () => {
    const f = rig(['command', 'seek'], ['8,5']); line(f, ['command', 'seek'], L2);
    const far = plan(f, '3,5', '8,5', { order: 'move', orderTo: '8,9' });
    expect(far.ok).toBe(false); expect(far.why).toMatch(/at most 3 tiles/);
    expect(plan(f, '3,5', '8,5', { order: 'move' }).why).toMatch(/pick the tile/);
    const ch = f.pc.mg!.charge, ap = f.pc.ap;
    expect(() => evoke(f, '3,5', '8,5', { order: 'move', orderTo: '19,19' })).toThrow(/at most 3 tiles/);
    expect(f.pc.mg!.charge).toBe(ch); expect(f.pc.ap).toBe(ap); expect(condOn(f.foe, 'commanded')).toBe(false);
    const ok = plan(f, '3,5', '8,5', { order: 'move', orderTo: '8,8' });
    expect(ok.ok).toBe(true); expect(ok.missiles[0].orderPath).toEqual(['8,6', '8,7', '8,8']);
    evoke(f, '3,5', '8,5', { order: 'move', orderTo: '8,8' }); expect(f.foe.condArg?.commanded).toBe('move:8,8');
    f.turn(f.foe); expect(f.foe.pos).toBe('8,8'); expect(logHas(f.cb, /obeys: move to/)).toBe(true);
  });
  it('on its turn the walk is checked again: blocked, it stays and the log says why (no "obeys")', () => {
    const f = rig(['command', 'seek'], ['8,5', '14,9']); line(f, ['command', 'seek'], L2);
    evoke(f, '3,5', '8,5', { order: 'move', orderTo: '8,8' });
    f.foes[1].pos = '8,8'; // someone now stands on the tile
    const [a] = f.foes; f.turn(a);
    expect(f.unit(a.id).pos).toBe('8,5'); expect(logHas(f.cb, /Commanded to walk to .* but can't \(no way through\): it stays/)).toBe(true);
    expect(logHas(f.cb, /obeys: move/)).toBe(false);
  });
});

describe('gap 15: every save is in the log, failed ones too (spec 9.11, item 489 a)', () => {
  it('Afflictions, FREEZE\'s Slowed and STEP log the d20 + save vs TN when the save fails', () => {
    for (const [w, re] of [['bind', /is Pinned \(\d+ rounds?; body save d20 [^)]* vs \d+/], ['dread', /is Shaken \(\d+ rounds?; heart save d20 [^)]* vs \d+/], ['muddle', /brain save d20 [^)]* vs \d+/],
      ['command', /is Commanded \(1 round; brain save d20 [^)]* vs \d+/], ['freeze', /is Slowed \(\d+ rounds?; body save d20 [^)]* vs \d+/]] as const) {
      const f = rig([w, 'seek'], ['8,5']); line(f, [w, 'seek'], L2); evoke(f, '3,5', '8,5', w === 'command' ? { order: 'halt' } : {});
      expect(logHas(f.cb, re), w).toBe(true);
    }
    const s = rig(['step', 'seek'], ['8,5']); line(s, ['step', 'seek'], L2); evoke(s, '3,5', '8,5', { dest: '9,7' });
    expect(s.foe.pos).toBe('9,7'); expect(logHas(s.cb, /steps to \S+ \(body save d20 [^)]* vs \d+/)).toBe(true);
  });
  it('a save that succeeds still reads "resists (… save X vs Y)"', () => {
    const f = rig(['bind', 'seek'], ['8,5']); f.foe.sv = { body: 99, brain: 99, heart: 99 } as any; line(f, ['bind', 'seek'], L2); evoke(f, '3,5', '8,5');
    expect(logHas(f.cb, /resists \(body save d20 [^)]* vs \d+/)).toBe(true); expect(condOn(f.foe, 'pinned')).toBe(false);
  });
});

describe('gap 16: a Stack fires all around its caster, not around the Stack (item 489 b)', () => {
  it('Touch from a caster beside the Stack reaches the caster\'s neighbours only', () => {
    const f = rig(['fire', 'condense'], ['5,5', '4,5']); (f.pc.mg as any).glyphsPerTile = 2;
    f.pc.pos = '3,5'; f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'fire', tile: '3,5' }); f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'condense', tile: '3,5' });
    f.pc.pos = '2,5'; // beside the Stack, to its west
    const [far, near] = f.foes; f.unit(far.id).pos = '4,4'; f.unit(near.id).pos = '1,4';
    const pv = plan(f, '3,5', '4,4'); expect(pv.ok).toBe(false); // next to the Stack, 2 from the caster
    expect(pv.area).toContain('3,5'); expect(pv.area).toContain('1,4'); expect(pv.area).not.toContain('4,4');
    evoke(f, '3,5', '1,4'); expect(500 - f.unit(near.id).hp).toBe(45); expect(f.unit(far.id).hp).toBe(500); // FIRE × CONDENSE 1.5
  });
});

describe('gap 17: the Sigil skill unlocks are items the engine runs (items 482-485)', () => {
  it('skill unlocks become items once the points reach them, and are in the coverage report', () => {
    const keys = allItems().filter((i) => i.kind === 'skill').map((i) => i.key);
    expect([...keys].sort()).toEqual(['skill:brain_power.3', 'skill:brain_power.5', 'skill:rumination.5', 'skill:visualization.5', 'skill:will_power.3', 'skill:will_power.5', // rules 1.5: Will Power's two (items 539, 540)
      'skill:raw_power.3', 'skill:raw_power.5', 'skill:dexterity.5', 'skill:proficiency.5', 'skill:camaraderie.1', 'skill:camaraderie.3', 'skill:composure.5'].sort()); // rules 1.13 (perks/skeleton.ts); the list is the data's (skills.json unlocks marked `item`: Classes 3.0 P6), in its order
    const f = rig(['fire', 'seek'], ['8,5'], { skills: { brain_power: 3, rumination: 4, visualization: 0 } });
    const held = itemsOf(heldOfChar(f.g.characters[f.pc.charId!])).filter((i) => i.kind === 'skill').map((i) => i.key);
    expect(held).toEqual(['skill:brain_power.3']);
  });
  it('Overclock: the next glyph may make the spell one word past Max Sigil words, for +2 charge; gone with that glyph; refused at 4', () => {
    const plain = rig(['fire', 'seek', 'condense'], ['8,5'], { skills: { brain_power: 3 }, maxWords: 2 });
    line(plain, ['fire', 'seek'], L2.map((k) => k.replace(',5', ',7')));
    plain.pc.pos = '2,7'; expect(withGame(plain.g, () => previewDraw(plain.cb, plain.pc, 'condense')).why).toMatch(/Past your cap/);
    const f = rig(['fire', 'seek', 'condense'], ['8,5'], { skills: { brain_power: 3 }, maxWords: 2 });
    perk(f, 'skill:brain_power.3', 'overclock'); expect(f.pc.mg!.maxWords).toBe(3);
    const c0 = f.pc.mg!.charge; line(f, ['condense'], ['5,5']); expect(c0 - f.pc.mg!.charge).toBe(1 + 2); // CONDENSE 1 + Overclock 2
    const c1 = f.pc.mg!.charge; line(f, ['fire', 'seek'], ['4,5', '3,5']); expect(c1 - f.pc.mg!.charge).toBe(4); // no more +2
    expect(logHas(f.cb, /Overclock: \+2 charge on CONDENSE/)).toBe(true);
    const pv = plan(f, '3,5', '8,5'); expect(pv.ok).toBe(true); expect(pv.pattern!.words).toEqual(['condense', 'fire', 'seek']);
    evoke(f, '3,5', '8,5'); expect(500 - f.foe.hp).toBe(45); expect(f.pc.mg!.maxWords).toBe(2); // the glyph left the ground
    const four = rig(['fire', 'seek'], ['8,5'], { skills: { brain_power: 3 }, maxWords: 4 });
    expect(() => perk(four, 'skill:brain_power.3', 'overclock')).toThrow(/already 4/);
  });
  it('Twin Draw: once a fight, the second spell\'s glyphs cost no Glyph AP until it is as long as the first', () => {
    const f = rig(['fire', 'seek', 'bind', 'condense'], ['14,9'], { skills: { brain_power: 5 } });
    perk(f, 'skill:brain_power.5', 'twin_draw');
    let ap = f.pc.ap; line(f, ['fire', 'seek'], ['4,5', '3,5']); expect(ap - f.pc.ap).toBe(2); // spell A: 2 glyphs, paid
    ap = f.pc.ap; line(f, ['bind', 'seek', 'condense'], ['4,8', '5,8', '6,8']); expect(ap - f.pc.ap).toBe(1); // B: 2 free, the 3rd paid
    expect(logHas(f.cb, /Twin Draw: second spell, glyph 2, no Glyph AP/)).toBe(true); expect(logHas(f.cb, /Twin Draw ends/)).toBe(true);
    expect(() => perk(f, 'skill:brain_power.5', 'twin_draw')).toThrow(); // once per combat
    const no = rig(['fire', 'seek'], ['14,9'], { skills: { brain_power: 4 } });
    expect(() => perk(no, 'skill:brain_power.5', 'twin_draw')).toThrow(); // needs Mastery 2
  });
  it('Proven Formula (rules 1.13): no Sigil discount any more; +3 on the save against a condition that has already hit you this fight', () => {
    const f = rig(['spark', 'seek', 'fire'], ['8,5'], { skills: { rumination: 5 } });
    line(f, ['spark', 'seek'], L2); expect(plan(f, '3,5', '8,5').ap).toBe(1);
    evoke(f, '3,5', '8,5');
    line(f, ['spark', 'seek'], L2); expect(plan(f, '3,5', '8,5').ap).toBe(1); // the same spell again: full price
    const ask = (id: string) => withGame(f.g, () => emit(f.cb, 'cond_apply', { by: f.foe, t: f.pc, id, fam: 'brain', rounds: 1, skipSave: false, cancel: false, saveAdd: 0, tnAdd: 0, cb: f.cb, rng: f.g.rng })).saveAdd;
    expect(ask('confused')).toBe(0);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, f.foe, f.pc, 'confused', 1, undefined, { skipSave: true }));
    expect(ask('confused')).toBe(3); expect(ask('fear')).toBe(0); // only what has already hit you
    expect(logHas(f.cb, /Proven Formula/)).toBe(true);
    const no = rig(['spark', 'seek'], ['8,5'], { skills: { rumination: 4 } });
    withGame(no.g, () => applyCond(no.cb, no.g.rng, no.foe, no.pc, 'confused', 1, undefined, { skipSave: true }));
    expect(withGame(no.g, () => emit(no.cb, 'cond_apply', { by: no.foe, t: no.pc, id: 'confused', fam: 'brain', rounds: 1, skipSave: false, cancel: false, saveAdd: 0, tnAdd: 0, cb: no.cb, rng: no.g.rng })).saveAdd).toBe(0);
  });
  it('Paint the Field: a spell with no Burst gets a free SPREAD or PUSH (no charge, no Flux); a spell with a Burst ignores it', () => {
    const f = rig(['spark', 'seek'], ['8,5', '9,6'], { skills: { visualization: 5 } });
    line(f, ['spark', 'seek'], L2);
    const plain = plan(f, '3,5', '8,5'), pv = plan(f, '3,5', '8,5', { paint: 'spread' });
    expect(plain.targets.length).toBe(1); expect(pv.targets.length).toBe(2); expect(pv.charge).toBe(plain.charge); expect(pv.spell!.spread).toBe(1);
    const flux = f.pc.mg!.flux; evoke(f, '3,5', '8,5', { paint: 'spread' });
    expect(500 - f.foes[0].hp).toBe(9); expect(500 - f.foes[1].hp).toBe(9); expect(f.pc.mg!.flux).toBe(flux); // SPARK 15 × SPREAD 0.6
    expect(logHas(f.cb, /Paint the Field: a free SPREAD/)).toBe(true);
    // A spell that has a Burst word ignores it; a caster without the unlock gets nothing.
    const b = rig(['spark', 'condense'], ['4,6'], { skills: { visualization: 5 } }); line(b, ['spark', 'condense'], L2);
    expect(plan(b, '3,5', b.foe.pos, { paint: 'spread' }).spell!.spread).toBe(0);
    const n = rig(['spark', 'seek'], ['8,5', '9,6'], { skills: { visualization: 4 } }); line(n, ['spark', 'seek'], L2);
    expect(plan(n, '3,5', '8,5', { paint: 'spread' }).targets.length).toBe(1);
  });
});

describe('gap 19: the Evoker blade\'s Edge Word (item 487)', () => {
  it('a hit leaves the next glyph this turn at 0 AP (charge still paid); a miss or the next turn leaves nothing', () => {
    const f = rig(['fire', 'seek'], ['4,5'], { spec: { weapon: 'evoker_blade' } });
    f.pc.weapon = 'evoker_blade'; f.pc.ap = 60;
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any); // the blade is a 'mana' weapon: its strike is the weapon's own attack, not unarmed melee
    expect(logHas(f.cb, /Edge Word: your next glyph this turn costs 0 AP/)).toBe(true);
    const ap = f.pc.ap, ch = f.pc.mg!.charge;
    expect(withGame(f.g, () => previewDraw(f.cb, f.pc, 'fire')).cost.ap).toBe(0);
    f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'fire', tile: f.pc.pos });
    expect(f.pc.ap).toBe(ap); expect(ch - f.pc.mg!.charge).toBe(2); expect(logHas(f.cb, /Edge Word: no AP/)).toBe(true);
    f.pc.pos = '3,6'; expect(withGame(f.g, () => previewDraw(f.cb, f.pc, 'seek')).cost.ap).toBe(1); // only one
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
    f.act({ type: 'combat/end-turn', unitId: f.pc.id } as any);
    expect(f.unit(f.pc.id).edgeWord).toBeFalsy(); // it ends with the turn
  });
});

describe('gap 23: Barrage and the 1.4 elements (item 486)', () => {
  it('FIRE, FREEZE, SHOCK, STONE and ACID cost 1 charge less; SPARK and GALE stay at 1', () => {
    const sig = SIG('mage');
    const f = rig(['fire', 'freeze', 'shock', 'stone', 'acid', 'spark', 'gale'], ['14,9'], { spec: { classId: 'mage', level: 5, skills: Object.fromEntries(sig.map((s) => [s, 1])) } });
    const cost = (w: string) => withGame(f.g, () => previewDraw(f.cb, f.pc, w)).cost.charge;
    expect(['fire', 'freeze', 'shock', 'stone', 'acid', 'spark', 'gale'].map(cost)).toEqual([1, 1, 1, 1, 1, 1, 1]);
    const n = rig(['acid'], ['14,9']); expect(withGame(n.g, () => previewDraw(n.cb, n.pc, 'acid')).cost.charge).toBe(2);
  });
});

describe('gap 24: Stonewall traces the line of fire from where the spell comes from (item 488)', () => {
  /** A hostile caster on the foe side (the Sigil words given), Stonewall I on PC 2, PC 3 its ally. */
  function bulwark(gPos: string, tPos: string) {
    const f = fightWith([{ archetype: 'sigilist', kit: 'sigil' }, { archetype: 'sigilist', kit: 'sigil', perks: { bulwark: 'I' } }, { archetype: 'sigilist', kit: 'sigil' }], [{ tier: 'minion' }]);
    const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
    const [p1, g, t] = f.pcs, e = f.foe;
    p1.pos = '15,10'; g.pos = gPos; t.pos = tPos;
    for (const x of [...f.pcs, e]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; }
    e.mg = JSON.parse(JSON.stringify(p1.mg)); arm(e, ['fire', 'arc', 'seek']); e.side = 'foe';
    f.g.rng.state = SEED;
    return { f, g, t, e };
  }
  it('across a vertical Line, an ARC lob from the lane\'s glyph passes over the guard: Stonewall cuts it, though the caster is off that line', () => {
    // The Line is FIRE on 4,2 and ARC on 4,3; the caster beside it on 3,2 fires across (east), the lanes on rows 2 and 3.
    // The target on 6,3 is in row 3's lane (the lob leaves from 4,3), the guard on 5,3 between: origin, guard, target in a
    // row. From the caster's tile (3,2) the ray through the guard misses the target (the 1.3 caster-based reading).
    const { f, t, e } = bulwark('5,3', '6,3');
    withGame(f.g, () => {
      const cb = f.cb, rng = f.g.rng;
      for (const [w, k] of [['fire', '4,2'], ['arc', '4,3']] as const) { e.pos = k; expect(drawGlyph(cb, rng, e, w, k)).toBeNull(); }
      e.pos = '3,2';
      expect(evokeSpell(cb, rng, e, '4,2', '6,3')).toBeNull();
    });
    expect(500 - f.unit(t.id).hp).toBe(18); // FIRE 30 × ARC 0.8 = 24, Stonewall I −25% = 18
    expect(logHas(f.cb, /Stonewall/)).toBe(true);
  });
  it('a Touch spell from the glyph the guard stands on has no line through the guard: no Stonewall (the caster-based ray would have given one)', () => {
    const { f, t, e } = bulwark('4,3', '5,3');
    withGame(f.g, () => {
      const cb = f.cb, rng = f.g.rng; arm(e, ['fire', 'condense']);
      for (const [w, k] of [['fire', '4,2'], ['condense', '4,3']] as const) { e.pos = k; expect(drawGlyph(cb, rng, e, w, k)).toBeNull(); }
      e.pos = '3,3'; // beside the Line: across (east); the caster, the guard on 4,3 and the target on 5,3 are in a row
      expect(evokeSpell(cb, rng, e, '4,2', '5,3')).toBeNull();
    });
    expect(500 - f.unit(t.id).hp).toBe(45); expect(logHas(f.cb, /Stonewall/)).toBe(false);
  });
});

describe('gap 20: class moves that cast give the grid their area, tiles and targets (item 489 c)', () => {
  it('Payload\'s preview carries the doubled Burst tiles, the area it may aim into and who it hits, marked as Sigil', () => {
    const sig = SIG('mage');
    const f = rig(['spark', 'spread'], ['5,5', '9,5'], { spec: { classId: 'mage', level: 5, skills: Object.fromEntries(sig.map((s) => [s, 6])) } });
    line(f, ['spread', 'spark'], ['4,5', '3,5']);
    const pv: any = withGame(f.g, () => previewPerkAction({ u: f.pc, cb: f.cb, g: f.g }, 'class:mage.payload', { actionId: 'payload', tile: '3,5', choice: '5,5' }, 'combat'));
    expect(pv.ok).toBe(true); expect(pv.sigil).toBe(true);
    expect(pv.tiles).toContain('9,5'); expect(pv.tiles).not.toContain('10,5'); // radius 4 (doubled) around 5,5
    expect(pv.area.length).toBeGreaterThan(0); expect(pv.targets).toEqual(expect.arrayContaining(f.foes.map((x) => x.id))); expect(pv.targets).toContain(f.pc.id); // friendly fire: the caster is in the radius
  });
});
