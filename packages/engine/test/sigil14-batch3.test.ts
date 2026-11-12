// Sigil rules 1.4, completeness batch 3 (spec items 490-491): the enemy AI's COMMAND orders (move a player out of its
// guards' reach, halt a charger, drop a shooter's weapon, else kneel; never into harm) and the boss-tier caster (the
// Sigil magister: enemies.json `casters`, the Proving Ground's champion waves, the boss tier's default words). Enemy
// turns run through apply() (combat/end-turn hands the round to the enemies), and the player obeys on its own turn.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  d20, armFoe, aiCommandOrder, casterCombos, CASTER, CASTERS, condOn, sandboxWave, enemyMagic, startCombat, newCharacter, MAPS, refOf, ARCHETYPES,
  apply, newGame, wikiLookup, type Combat, type Unit, type GameState, type Sheet,
} from '../src';
import sigilsJ from '../../../data/sigils.json';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

function calm(n = 60): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calm();
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
interface FoeAt { at: string; words?: string[]; caster?: string; tier?: string; weapon?: string }

/** One player (a sigilist with the given weapon) and foes on an open yard; the player's turn first, then the foes in the
 * order given. Everyone 500 HP, no armour; the player's saves −99 (every COMMAND lands on this seed). */
function scene(pc: { at: string; weapon?: string }, foes: FoeAt[]) {
  const f = fightWith([{ archetype: 'sigilist', kit: 'sigil', weapon: pc.weapon || 'combat_knife' }], foes.map((x) => ({ tier: x.tier || 'soldier', weapon: x.weapon || 'combat_knife' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15; cb.zones = []; cb.glyphs = [];
  const p = f.pc; p.pos = pc.at; p.hp = p.maxHp = 500; p.armour = 0; p.sv = { body: -99, brain: -99, heart: -99 } as any; p.hidden = false; delete (p as any).conds;
  f.foes.forEach((e, i) => {
    e.pos = foes[i].at; e.hp = e.maxHp = 500; e.armour = 0; e.hidden = false; delete e.mg;
    if (foes[i].words || foes[i].caster) armFoe(e, { ...(foes[i].words ? { sigils: foes[i].words } : {}), ...(foes[i].caster ? { caster: foes[i].caster } : {}) });
    const mg = (e as Unit).mg; if (mg) mg.flux = 0;
  });
  cb.order = [p.id, ...f.foes.map((e) => e.id)];
  f.turn(p); f.g.rng.state = SEED;
  return f;
}
type F = ReturnType<typeof scene>;
/** The player ends its turn: the foes act (runEnemies), then the player's next turn begins (it obeys its order). */
const endTurn = (f: F) => f.act({ type: 'combat/end-turn', unitId: f.pc.id });
const commandLine = (cb: Combat) => cb.log.find((l) => /COMMAND/.test(l) && /evokes/.test(l)) || '';

// ---------------------------------------------------------------------------------------------------------------------
describe('item 490: an enemy caster COMMANDs with the order that fits its target (through apply)', () => {
  it('a player next to its guard: the move order walks it out of their reach (3 tiles, at least 2 from them), on its own turn', () => {
    const f = scene({ at: '5,5' }, [{ at: '12,5', words: ['command', 'seek'] }, { at: '5,6' }]);
    const plan = withGame(f.g, () => aiCommandOrder(f.cb, f.foes[0], f.pc));
    expect(plan.order).toBe('move'); expect(plan.value).toBe(20);
    const was = f.pc.pos;
    endTurn(f);
    expect(commandLine(f.cb)).toMatch(/COMMAND/);
    expect(logHas(f.cb, /obeys: move to/)).toBe(true);
    expect(f.pc.pos).not.toBe(was);
    const d = (a: string, b: string) => Math.max(Math.abs(+a.split(',')[0] - +b.split(',')[0]), Math.abs(+a.split(',')[1] - +b.split(',')[1]));
    expect(d(was, f.pc.pos)).toBeGreaterThanOrEqual(2); expect(d(was, f.pc.pos)).toBeLessThanOrEqual(3);
    expect(condOn(f.pc, 'commanded')).toBe(false); // the move order is spent once walked
  });
  it('a player charging in with a melee weapon is halted: on its turn it can\'t move', () => {
    const f = scene({ at: '7,5', weapon: 'sabre' }, [{ at: '13,5', words: ['command', 'seek'] }]);
    expect(withGame(f.g, () => aiCommandOrder(f.cb, f.foes[0], f.pc)).order).toBe('halt');
    endTurn(f);
    expect(commandLine(f.cb)).toMatch(/COMMAND/);
    expect(logHas(f.cb, /obeys: halt/)).toBe(true);
    expect(() => f.act({ type: 'combat/move', unitId: f.pc.id, to: '6,5' } as any)).toThrow(/Commanded to halt/);
  });
  it('a shooter with one of the caster\'s side in range and sight is made to drop its weapon (Disarmed)', () => {
    const f = scene({ at: '8,5', weapon: 'service_pistol' }, [{ at: '13,5', words: ['command', 'seek'] }]);
    expect(withGame(f.g, () => aiCommandOrder(f.cb, f.foes[0], f.pc)).order).toBe('drop');
    endTurn(f);
    expect(logHas(f.cb, /obeys: drop/)).toBe(true);
    expect(condOn(f.pc, 'disarmed')).toBe(true);
  });
});

describe('item 490: how the order is chosen (aiCommandOrder)', () => {
  it('never sends a player into harm: a field on the best tile moves the order elsewhere; a burst spell never gives the move order', () => {
    const f = scene({ at: '5,5' }, [{ at: '12,5', words: ['command', 'seek'] }, { at: '5,6' }]);
    const a = withGame(f.g, () => aiCommandOrder(f.cb, f.foes[0], f.pc));
    expect(a.order).toBe('move');
    f.cb.zones = [{ id: 'z1', kind: 'field', tiles: [a.orderTo!], words: ['fire', 'stay'], by: f.foes[0].id, side: 'foe', left: 3, mult: 0.5, who: 'x', hit: {} } as any];
    const b = withGame(f.g, () => aiCommandOrder(f.cb, f.foes[0], f.pc));
    expect(b.order).toBe('move'); expect(b.orderTo).not.toBe(a.orderTo);
    expect(withGame(f.g, () => aiCommandOrder(f.cb, f.foes[0], f.pc, false)).order).toBe('drop'); // not single-target: next to a guard, armed
  });
  it('a pinned, unarmed player it can\'t move or disarm is made to kneel; one already Commanded is worth nothing more', () => {
    const f = scene({ at: '5,5', weapon: 'fists' }, [{ at: '12,5', words: ['command', 'seek'] }, { at: '5,6' }]);
    (f.pc as any).conds = { pinned: 1 };
    expect(withGame(f.g, () => aiCommandOrder(f.cb, f.foes[0], f.pc))).toMatchObject({ order: 'kneel', value: 9 });
  });
  it('a caster with many damage words still weighs its COMMAND (every Affliction keeps its strongest spell)', () => {
    const cs = casterCombos(CASTER.sigil_magister.sigils, 4);
    expect(cs.some((c) => c.words.includes('command'))).toBe(true);
    expect(cs.length).toBeLessThan(200);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('item 491: the boss-tier caster (Sigil magister)', () => {
  it('enemies.json casters has a boss-tier archetype with the boss default words and more; a boss with sigils: true gets the nine', () => {
    expect(CASTERS.map((c) => c.id)).toContain('sigil_magister');
    const m = CASTER.sigil_magister, nine = (sigilsJ as any).enemy_ai.default_words.boss as string[];
    expect(m.tier).toBe('boss'); expect(nine.length).toBe(9);
    for (const w of nine) expect(m.sigils).toContain(w);
    expect(m.sigils).toContain('command');
    expect(wikiLookup('enemy:casters')!.text).toMatch(/Sigil magister \(boss\): FIRE/); // the Narrator's wiki names it
    const a = ARCHETYPES.find((x: any) => x.id === 'sigilist')!;
    const sheet: Sheet = { name: 'P', portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
    const cb = startCombat('t', MAPS.yard16, [{ c: newCharacter('c0', 'p1', sheet), pos: '2,5' }], [{ name: 'Champion', tier: 'boss', weapon: 'hellraiser_lmg', at: refOf('15,5'), sigils: true }], 'boss', { state: 3 }, []);
    const boss = cb.units.find((u) => u.side === 'foe')!;
    expect(boss.mg!.words).toEqual(nine); expect(boss.mg!.maxWords).toBe(4);
    expect(enemyMagic(boss, CASTER.sigil_magister.sigils).maxWords).toBe(4);
  });
  it('a Narrator encounter may name the magister for a boss foe (through apply): Evoker, its words, Max Sigil words 4, spell bias 1.2', () => {
    const s = storyWith([{ archetype: 'sigilist', kit: 'sigil' }]);
    s.act({ type: 'narrator/turn', turn: { narration: 'The champion writes.', combat: { name: 'Boss', map: 'yard16', difficulty: 'boss', enemies: [{ name: 'The Magister', tier: 'boss', weapon: 'magistrate_pistol', caster: 'sigil_magister', at: '' }] } } } as any);
    const u = s.g.combat!.units.find((x) => x.side === 'foe')!;
    expect(u.mg!.evoker).toBe(true); expect(u.mg!.words).toEqual(CASTER.sigil_magister.sigils); expect(u.mg!.maxWords).toBe(4);
    expect((u.mg as any).aiBias).toBe(1.2); expect((u as any).caster).toBe('sigil_magister');
  });
  it('champion waves from wave 10 carry a Sigil magister (same tier and points); earlier champion waves don\'t', () => {
    expect(sandboxWave(5).some((f) => f.caster === 'sigil_magister')).toBe(false);
    expect(sandboxWave(10).find((f) => f.caster === 'sigil_magister')).toMatchObject({ tier: 'boss', weapon: 'magistrate_pistol', name: 'Sigil magister 1' });
    expect(sandboxWave(10)).toEqual(sandboxWave(10));
    expect(sandboxWave(15).filter((f) => f.caster === 'sigil_magister').length).toBe(1);
    expect(sandboxWave(11).some((f) => f.caster === 'sigil_magister')).toBe(false);
  });
  it('through apply(): wave 10 fights with a Sigil magister carrying an Evoker', () => {
    let g: GameState = newGame('PROVE', { id: 'h1', name: 'Host' }, 'seed-boss');
    const a = ARCHETYPES.find((x: any) => x.id === 'sigilist')!;
    g = apply(g, { type: 'char/add', sheet: { name: 'Vel', portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1');
    g = apply(g, { type: 'sandbox/fight' }, 'h1');
    g = apply(g, { type: 'sandbox/wave', wave: 10 }, 'h1');
    const m = g.combat!.units.find((u) => /Sigil magister/.test(u.name))!;
    expect(m.tier).toBe('boss'); expect(m.mg!.evoker).toBe(true); expect(m.mg!.words).toEqual(CASTER.sigil_magister.sigils);
  });
  it('a magister casts on its turn with its own words only (through apply): a spell that fits the turn, not a 4-glyph one it can\'t finish', () => {
    const f = scene({ at: '5,5' }, [{ at: '12,5', tier: 'boss', caster: 'sigil_magister', weapon: 'fists' }]);
    const m = f.foes[0]; expect(m.mg!.words).toEqual(CASTER.sigil_magister.sigils);
    const hp = f.pc.hp;
    endTurn(f);
    const drawn = f.cb.log.filter((l) => l.startsWith(m.name) && /draws [A-Z]+/.test(l)).map((l) => /draws ([A-Z]+)/.exec(l)![1].toLowerCase());
    expect(drawn.length).toBeGreaterThanOrEqual(2);
    for (const w of drawn) expect(CASTER.sigil_magister.sigils).toContain(w);
    expect(f.cb.log.some((l) => l.startsWith(m.name) && /evokes/.test(l))).toBe(true);
    expect(f.pc.hp < hp || condOn(f.pc, 'commanded') || logHas(f.cb, /obeys/)).toBe(true);
  });
});
