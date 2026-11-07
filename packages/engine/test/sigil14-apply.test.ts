// Sigil rules 1.4 through the reducer (completeness batch 1): every word the other suites only call directly, the section 7
// patterns with no test, the Delivery and Burst mixes, the previews the screen reads (LEECH, NULL, LIGHT, turret reach,
// Boon notes, COMMAND's move tiles), QUICKEN's log and KIN's refused aims. Every spell is drawn and Evoked with
// apply() (combat/draw, combat/evoke with aim, aims, dest, order and orderTo), the same path a player's click takes.
import { describe, expect, it } from 'vitest';
import { d20, previewEvoke, placedMagic, condOn, applyCond, objectsOf, type Combat, type Unit } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

/** A seed whose next n d20 rolls are all 2-19 (no criticals, no natural 1s). */
function calm(n = 40): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calm();
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k);

/** A Sigil caster at D6 (3,5) on its turn who knows the words given (Max Sigil words 4, a deep core, Glyph AP 1, every
 * multiplier ×1, no range or duration bonus, Normal air); foes at the tiles given and allies (more PCs) where `allies`
 * puts them. Everyone: 500 HP, no armour, Defense −99 and saves −99, so every roll hits and every save fails (the seed
 * has no natural 1 or 20), and the numbers are the spec's. The yard map, cleared of cover and objects (16 × 11). */
function rig(words: string[], foes: string[] = ['14,9'], allies: string[] = []) {
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil' }, ...allies.map(() => ({ archetype: 'sigilist', kit: 'sigil' }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; });
  f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; }
  const u = f.turn(f.pc); arm(u, words);
  for (const a of f.pcs.slice(1)) arm(a, words);
  f.g.rng.state = SEED;
  return f;
}
function arm(u: Unit, words: string[]) {
  u.ap = 60; const m = u.mg!;
  Object.assign(m, { evoker: true, words: [...words], charge: 999, glyphAp: 1, maxWords: 4, flux: -99, sigilMult: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0 });
}
type F = ReturnType<typeof rig>;
/** Walk a Line through the reducer: each word drawn on its own tile in order; the caster ends on the last tile. */
function line(f: F, words: string[], tiles: string[]) { words.forEach((w, i) => { f.pc.pos = tiles[i]; f.act({ type: 'combat/draw', unitId: f.pc.id, word: w, tile: tiles[i] }); }); }
const evoke = (f: F, tile: string, aim: string, o: Record<string, any> = {}) => f.act({ type: 'combat/evoke', unitId: f.pc.id, tile, aim, ...o } as any);
const plan = (f: F, tile: string, aim: string, o: Record<string, any> = {}) => withGame(f.g, () => previewEvoke(f.cb, f.pc, tile, aim, o));
/** The 2-, 3- and 4-glyph Lines on row 5 ending on D6 (3,5): each fires east, past the first glyph. */
const L2 = ['4,5', '3,5'], L3 = ['5,5', '4,5', '3,5'], L4 = ['6,5', '5,5', '4,5', '3,5'];

// ---------------------------------------------------------------------------------------------------------------------
describe('gap 1: the 29 words no reducer test drew, each drawn and Evoked through apply()', () => {
  it('Elements: FREEZE 25 + Slowed, SHOCK 30, STONE 35, GALE 15 and 2 tiles away, ACID 15 then Corroded (5 at its turn start, Defense −2)', () => {
    for (const [w, dmg] of [['freeze', 25], ['shock', 30], ['stone', 35], ['gale', 15], ['acid', 15]] as const) {
      const f = rig([w, 'seek'], ['8,5']); line(f, [w, 'seek'], L2);
      evoke(f, '3,5', '8,5');
      expect(500 - f.foe.hp, w).toBe(dmg);
      if (w === 'freeze') expect(condOn(f.foe, 'slowed')).toBe(true);
      if (w === 'gale') expect(f.foe.pos).toBe('10,5');
      if (w === 'acid') {
        expect(condOn(f.foe, 'corroded')).toBe(true); expect(f.foe.def).toBe(-101);
        f.turn(f.foe); expect(500 - f.foe.hp).toBe(15 + 5); expect(logHas(f.cb, /corrodes/)).toBe(true);
      }
    }
  });
  it('Afflictions: BIND Pinned, BLIND Blinded, SLOW Slowed, MUDDLE Left Brain Debuff, DREAD Shaken, SILENCE Silenced', () => {
    for (const [w, c] of [['bind', 'pinned'], ['blind', 'blinded'], ['slow', 'slowed'], ['muddle', 'ldebuff'], ['dread', 'shaken'], ['silence', 'silenced']] as const) {
      const f = rig([w, 'seek'], ['8,5']); line(f, [w, 'seek'], L2);
      evoke(f, '3,5', '8,5');
      expect(condOn(f.foe, c), w).toBe(true); expect(f.foe.hp).toBe(500);
    }
  });
  it('COMMAND (Charm, COMMAND · SEEK): the order and its tile ride the action; the preview marks the 3-tile walk a move order may pick', () => {
    const f = rig(['command', 'seek'], ['8,5']); line(f, ['command', 'seek'], L2);
    const pv = plan(f, '3,5', '8,5', { order: 'move' });
    expect(pv.missiles[0].orderTo).toContain('8,8'); expect(pv.missiles[0].orderTo).not.toContain('8,9'); expect(pv.missiles[0].orderTo).not.toContain('8,5');
    evoke(f, '3,5', '8,5', { order: 'move', orderTo: '8,7' });
    expect(condOn(f.foe, 'commanded')).toBe(true); expect(f.foe.condArg?.commanded).toBe('move:8,7');
    const k = rig(['command', 'seek'], ['8,5']); line(k, ['command', 'seek'], L2); evoke(k, '3,5', '8,5', { order: 'kneel' });
    expect(k.foe.condArg?.commanded).toBe('kneel');
  });
  it('Boons: WARD 30 shield on an ally; CLEANSE · SEEK ends the newest condition (the preview names it)', () => {
    const f = rig(['ward', 'seek', 'cleanse'], ['14,9'], ['8,5']); line(f, ['ward', 'seek'], L2);
    evoke(f, '3,5', '8,5'); expect(f.pcs[1].shield).toBe(30);
    withGame(f.g, () => { applyCond(f.cb, f.g.rng, null, f.pcs[1], 'slowed', 3, undefined, { skipSave: true }); applyCond(f.cb, f.g.rng, null, f.pcs[1], 'pinned', 2, undefined, { skipSave: true }); });
    line(f, ['cleanse', 'seek'], L2);
    const pv = plan(f, '3,5', '8,5'); expect(pv.affected[0].notes).toEqual(['ends Pinned']);
    evoke(f, '3,5', '8,5');
    expect(condOn(f.pcs[1], 'pinned')).toBe(false); expect(condOn(f.pcs[1], 'slowed')).toBe(true); expect(logHas(f.cb, /cleansed of Pinned/)).toBe(true);
  });
  it('Workings: VEIL smoke radius 1; LIGHT radius 4 for the scene, revealing the Hidden; MASK · CONDENSE on yourself (Invisibility)', () => {
    const f = rig(['veil', 'light', 'seek', 'mask', 'condense'], ['10,6']);
    f.foe.hidden = true; line(f, ['light', 'seek'], L2);
    const pv = plan(f, '3,5', '8,5'); expect(pv.missiles[0].light.length).toBe(81); expect(pv.missiles[0].light).toContain('10,6'); // 9 × 9 round 8,5, all on the map
    evoke(f, '3,5', '8,5');
    expect(f.foe.hidden).toBe(false); expect(logHas(f.cb, /LIGHT reveals Foe 1/)).toBe(true);
    expect(f.cb.zones!.find((z) => z.kind === 'light')!.left).toBe(99);
    line(f, ['veil', 'seek'], L2); evoke(f, '3,5', '8,5'); // smoke blocks sight, not light
    const veil = f.cb.zones!.find((z) => z.kind === 'veil')!; expect(veil.tiles.length).toBe(9); expect(veil.tiles).toContain('9,6');
    line(f, ['mask', 'condense'], L2); evoke(f, '3,5', '3,5');
    expect(f.pc.hidden).toBe(true); expect(f.pc.maskLeft).toBe(2);
  });
  it('STEP · CONDENSE on yourself (Blink): you land on the tile you pick, up to 4 away; RAISE and NULL are drawn in their own tests below', () => {
    const f = rig(['step', 'condense']); line(f, ['step', 'condense'], L2);
    expect(() => evoke(f, '3,5', '3,5')).toThrow(/Pick where STEP lands/);
    evoke(f, '3,5', '3,5', { dest: '6,8' }); expect(f.pc.pos).toBe('6,8'); expect(fx(f.cb, 'blink').length).toBe(1);
  });
  it('SENSE: appears at a target out of sight, ×0.6 (FIRE 18)', () => {
    const f = rig(['fire', 'sense'], ['8,5']); f.cb.map = { ...f.cb.map, solid: ['6,4', '6,5', '6,6'] } as any;
    line(f, ['fire', 'sense'], L2); evoke(f, '3,5', '8,5'); expect(500 - f.foe.hp).toBe(18);
  });
  it('PULL: BIND · SEEK · PULL drags the target 3 tiles toward you', () => {
    const f = rig(['bind', 'seek', 'pull'], ['10,5']); line(f, ['bind', 'pull', 'seek'], L3);
    evoke(f, '3,5', '10,5'); expect(f.foe.pos).toBe('7,5'); expect(condOn(f.foe, 'pinned')).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('gap 2: the section 7 patterns, Evoked through apply()', () => {
  it('Grenade, FIRE · ARC · SPREAD: 14 to everyone within 2 (30 × 0.8 × 0.6 = 14.4)', () => {
    const f = rig(['fire', 'arc', 'spread'], ['9,5', '10,6', '12,5']); line(f, ['fire', 'spread', 'arc'], L3);
    evoke(f, '3,5', '9,5'); expect(f.foes.map((e) => 500 - e.hp)).toEqual([14, 14, 0]);
  });
  it('Tesla tower, SHOCK · SEEK · WATCH · CHAIN: at your next turn start it zaps the nearest creature (an ally too) 15, then chains forward 11', () => {
    const f = rig(['shock', 'seek', 'watch', 'chain'], ['10,5', '12,5'], ['8,6']); line(f, ['shock', 'seek', 'watch', 'chain'], L4);
    const pv = plan(f, '3,5', '8,5');
    expect(pv.missiles[0].placed).toBe('turret'); expect(pv.missiles[0].turret!.range).toBe(8);
    expect(pv.missiles[0].turret!.reach).toContain('12,5'); expect(pv.missiles[0].turret!.next).toEqual([f.pcs[1].id]); // the ally is nearest
    evoke(f, '3,5', '8,5'); expect(f.foe.hp).toBe(500); // a turret doesn't strike when Evoked
    const row = withGame(f.g, () => placedMagic(f.cb, 'pc')).find((z) => z.kind === 'turret')!;
    expect(row.reach).toContain('10,5'); expect(row.next).toEqual([f.pcs[1].id]);
    f.turn(f.pc);
    expect(500 - f.pcs[1].hp).toBe(15); expect(500 - f.foes[0].hp).toBe(11); expect(f.foes[1].hp).toBe(500);
  });
  it('Safe Tesla post, SHOCK · WATCH · CHAIN · KIN: zaps the enemy next to it 15, chains forward 11, never your side', () => {
    const f = rig(['shock', 'watch', 'chain', 'kin'], ['8,5', '10,5'], ['7,6']); line(f, ['shock', 'watch', 'chain', 'kin'], L4);
    const pv = plan(f, '3,5', '7,5'); expect(pv.missiles[0].turret!.range).toBe(1); expect(pv.missiles[0].turret!.next).toEqual([f.foes[0].id]);
    evoke(f, '3,5', '7,5');
    f.turn(f.pc);
    expect(f.foes.map((e) => 500 - e.hp)).toEqual([15, 11]); expect(f.pcs[1].hp).toBe(500);
  });
  it('Healing post, MEND · WATCH: heals whoever stands next to it 13 a round (25 × 0.5 = 12.5, rounded to the nearest: item 456)', () => {
    const f = rig(['mend', 'watch'], ['14,9'], ['6,5']); f.pcs[1].hp = 400; line(f, ['mend', 'watch'], L2);
    const pv = plan(f, '3,5', '5,5'); expect(pv.missiles[0].turret).toMatchObject({ range: 1, next: [f.pcs[1].id] });
    evoke(f, '3,5', '5,5');
    f.turn(f.pc);
    expect(f.pcs[1].hp).toBe(413); expect(logHas(f.cb, /Tester 2 heals 13/)).toBe(true);
  });
  it('Acid rain, ACID · ARC · STAY · SPREAD: a 5 × 5 field; whoever starts a turn in it takes 15 × 0.8 × 0.6 × 0.5 = 4 and is Corroded', () => {
    const f = rig(['acid', 'arc', 'stay', 'spread'], ['9,6']); line(f, ['acid', 'arc', 'stay', 'spread'], L4);
    evoke(f, '3,5', '9,5');
    const z = f.cb.zones!.find((x) => x.kind === 'field')!; expect(z.tiles.length).toBe(25); expect(f.foe.hp).toBe(500);
    f.turn(f.foe);
    expect(500 - f.foe.hp).toBe(4); expect(condOn(f.foe, 'corroded')).toBe(true); expect(logHas(f.cb, /caught in .*ACID field/)).toBe(true);
  });
  it('Swap a friend, STEP · RELAY: your relay jumps to the tile you pick (no save for your side)', () => {
    const f = rig(['step', 'relay'], ['14,9'], ['7,5']); line(f, ['step', 'relay'], L2);
    evoke(f, '3,5', '7,5', { dest: '7,9' }); expect(f.pcs[1].pos).toBe('7,9');
  });
  it('Haste, QUICKEN · RELAY: +2 AP on the ally\'s next turn; the log says so and lists no rounds (gap 11)', () => {
    const f = rig(['quicken', 'relay'], ['14,9'], ['7,5', '7,8']); line(f, ['quicken', 'relay'], L2);
    const pv = plan(f, '3,5', '7,5'); expect(pv.affected.find((a) => a.unit === f.pcs[1].id)!.notes).toEqual(['+2 AP on their next turn (ceiling 9)']);
    evoke(f, '3,5', '7,5');
    const last = f.cb.log[f.cb.log.length - 1]; expect(last).toMatch(/Tester 2 is Quickened \(\+2 AP on their next turn\)/); expect(last).not.toMatch(/99/);
    expect(condOn(f.pcs[1], 'quickened')).toBe(true);
    const a = f.turn(f.pcs[1].id).ap, b = f.turn(f.pcs[2].id).ap;
    expect(a - b).toBe(2); expect(logHas(f.cb, /Tester 2 is Quickened: \+2 AP this turn/)).toBe(true); expect(condOn(f.unit(f.pcs[1].id), 'quickened')).toBe(false);
  });
  it('Bless the squad, SHARPEN · SPREAD on your own tile: you and everyone within 2 are Sharpened, an enemy there too', () => {
    const f = rig(['sharpen', 'spread'], ['5,5', '6,5'], ['4,7']); line(f, ['sharpen', 'spread'], L2);
    const pv = plan(f, '3,5', '3,5'); expect(pv.affected.find((a) => a.self)!.notes).toEqual(['next attack +3 to hit, ×1.25 damage']);
    evoke(f, '3,5', '3,5');
    expect([f.pc, f.pcs[1], f.foes[0], f.foes[1]].map((x) => condOn(x, 'sharpened'))).toEqual([true, true, true, false]);
  });
  it('Stone wall, RAISE · SEEK · PUSH: a fan of wall from where it lands, every tile empty', () => {
    const f = rig(['raise', 'seek', 'push']); line(f, ['raise', 'push', 'seek'], L3);
    const pv = plan(f, '3,5', '7,5'), want = pv.missiles[0].raise;
    expect(want).toContain('7,5'); expect(want.some((k) => k.endsWith(',4')) && want.some((k) => k.endsWith(',6'))).toBe(true); // it fans out
    evoke(f, '3,5', '7,5');
    const walls = objectsOf(f.cb).filter((o) => o.kind === 'sigil_wall').map((o) => o.pos).sort();
    expect(walls).toEqual([...want].sort()); expect(walls.every((k) => +k.split(',')[0] >= 7)).toBe(true);
  });
  it('Fortress, RAISE · SPREAD on your own tile: walls on every empty tile within 2; your tile stays open (and the Line\'s other glyph tile, which wasn\'t empty)', () => {
    const f = rig(['raise', 'spread']); line(f, ['raise', 'spread'], L2);
    evoke(f, '3,5', '3,5');
    const walls = objectsOf(f.cb).filter((o) => o.kind === 'sigil_wall').map((o) => o.pos);
    expect(walls.length).toBe(23); expect(walls).not.toContain('3,5'); expect(walls).not.toContain('4,5'); expect(walls).toContain('1,3'); expect(walls).toContain('5,7');
  });
  it('NULL · SEEK unmakes a field; the preview lists what it would unmake', () => {
    const f = rig(['fire', 'seek', 'stay', 'null']); line(f, ['fire', 'stay', 'seek'], L3);
    evoke(f, '3,5', '8,5'); expect(f.cb.zones!.some((z) => z.kind === 'field')).toBe(true);
    line(f, ['null', 'seek'], L2);
    const pv = plan(f, '3,5', '8,5'); expect(pv.missiles[0].nulls).toBe(1); expect(pv.missiles[0].nullHits).toEqual([expect.objectContaining({ kind: 'field', tiles: ['8,5'], side: 'pc' })]);
    evoke(f, '3,5', '8,5');
    expect(f.cb.zones!.some((z) => z.kind === 'field')).toBe(false); expect(logHas(f.cb, /NULL unmakes field/)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('gaps 3–4: the Delivery and Burst mixes', () => {
  it('STAY + TWICE: two fields, one at each aim; each bites ×0.5', () => {
    const f = rig(['fire', 'seek', 'stay', 'twice'], ['14,9']); line(f, ['fire', 'stay', 'twice', 'seek'], L4);
    evoke(f, '3,5', '9,4', { aims: ['9,4', '9,7'] });
    const fields = f.cb.zones!.filter((z) => z.kind === 'field' && z.by === f.pc.id);
    expect(fields.map((z) => z.tiles)).toEqual([['9,4'], ['9,7']]);
    f.foe.pos = '9,7'; f.turn(f.foe); expect(500 - f.foe.hp).toBe(15);
  });
  it('WAIT + TWICE: two hidden traps; stepping on one sets it off at full strength', () => {
    const f = rig(['fire', 'seek', 'wait', 'twice'], ['14,9']); line(f, ['fire', 'wait', 'twice', 'seek'], L4);
    evoke(f, '3,5', '9,4', { aims: ['9,4', '9,7'] });
    const traps = f.cb.zones!.filter((z) => z.kind === 'trap' && z.by === f.pc.id);
    expect(traps.map((z) => z.tiles[0])).toEqual(['9,4', '9,7']); expect(traps.every((z: any) => z.hidden)).toBe(true);
    f.foe.pos = '9,4'; f.turn(f.foe);
    expect(500 - f.foe.hp).toBe(30); expect(f.cb.zones!.filter((z) => z.kind === 'trap').map((z) => z.tiles[0])).toEqual(['9,7']);
  });
  it('CHAIN + LEECH: you heal from every jump (30 + 23 dealt → 26); the preview shows the heal before you Evoke (gap 6)', () => {
    const f = rig(['fire', 'seek', 'chain', 'leech'], ['8,5', '10,5']); f.pc.hp = 300; line(f, ['fire', 'chain', 'leech', 'seek'], L4);
    const pv = plan(f, '3,5', '8,5'); expect(pv.affected.map((a) => a.dmg)).toEqual([30, 23]); expect(pv.leech).toMatchObject({ heal: 26, restored: 26 });
    evoke(f, '3,5', '8,5');
    expect(f.foes.map((e) => 500 - e.hp)).toEqual([30, 23]); expect(f.pc.hp).toBe(326); expect(logHas(f.cb, /drinks 26 HP \(LEECH\)/)).toBe(true);
  });
  it('Vampiric bolt\'s preview: 15 if it hits, capped by what the target has left and by your missing HP', () => {
    const f = rig(['fire', 'seek', 'leech'], ['8,5']); f.pc.hp = 490; line(f, ['fire', 'leech', 'seek'], L3);
    expect(plan(f, '3,5', '8,5').leech).toEqual({ heal: 15, restored: 10, expected: 14 }); // expected: a hit is 95% at best
    f.foe.hp = 8; expect(plan(f, '3,5', '8,5').leech!.heal).toBe(4); // 8 dealt at most
  });
  it('CONDENSE + PUSH: ×1.5 on the first tile (45), ×0.7 in the cone (21)', () => {
    const f = rig(['fire', 'condense', 'push'], ['6,5', '7,5']); line(f, ['fire', 'condense', 'push'], L3);
    const pv = plan(f, '3,5', '6,5'); expect(pv.missiles[0].burst.mult['6,5']).toBe(1.5); expect(pv.missiles[0].burst.mult['7,5']).toBe(0.7);
    evoke(f, '3,5', '6,5'); expect(f.foes.map((e) => 500 - e.hp)).toEqual([45, 21]);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('gap 12: KIN: you and your allies can\'t be picked (your own tile is the one exception)', () => {
  it('an ally\'s tile is not pickable and the aim is refused before anything is spent', () => {
    const f = rig(['fire', 'seek', 'kin'], ['9,5'], ['7,5']); line(f, ['fire', 'kin', 'seek'], L3);
    const pv = plan(f, '3,5', '7,5'); expect(pv.ok).toBe(false); expect(pv.why).toMatch(/KIN/); expect(pv.pickable).not.toContain('7,5'); expect(pv.pickable).toContain('9,5');
    const ap = f.pc.ap, ch = f.pc.mg!.charge, n = f.cb.glyphs!.length;
    expect(() => evoke(f, '3,5', '7,5')).toThrow(/KIN/);
    expect([f.pc.ap, f.pc.mg!.charge, f.cb.glyphs!.length, f.pcs[1].hp]).toEqual([ap, ch, n, 500]);
    // An ally in a bolt's way still stops it (KIN changes who, not how it flies): the bolt fizzles on them.
    const b = plan(f, '3,5', '9,5'); expect(b.ok).toBe(true); expect(b.missiles[0].blockedAt).toBe('7,5'); expect(b.fizzle).toBe(true);
  });
  it('TWICE with KIN never auto-aims the other missile at your side, even for a Boon', () => {
    const f = rig(['mend', 'seek', 'twice', 'kin'], ['8,4', '8,7'], ['8,5']); line(f, ['mend', 'twice', 'kin', 'seek'], L4);
    const pv = plan(f, '3,5', '8,4'); expect(pv.ok).toBe(true); expect(pv.missiles.map((m) => m.aim)).toEqual(['8,4', '8,7']);
  });
});
