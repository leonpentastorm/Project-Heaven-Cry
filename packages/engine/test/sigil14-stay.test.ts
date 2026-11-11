// STAY, as Leon ruled it (item 422, 8 Nov 2026): the spell strikes once when Evoked (or when its trap springs), then
// stays as a field; the field takes whoever it has not affected yet at full, and whoever it has (its placing strike or an
// earlier bite) at ×0.5; at most once per creature per round.
import { describe, expect, it } from 'vitest';
import './helpers/grammar-only'; // rules 1.17: the Line multiplier is off here (these tests pin the grammar's own numbers)
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  ARCHETYPES, MAPS, newCharacter, startCombat, refOf, d20, apply, newGame, positionsOf, viewFor, magicTurnStart, magicRoundTick, moveUnit, endTurn, active,
  drawGlyph, previewDraw, evoke, previewEvoke, planEvoke, findPattern, evokeOrigins, patternAt, placedMagic, grammarError, compileSpell, scuff, strikeTurret,
  migrateSigil, migrateCharacterSigils, boltPath, enemyAvoidMagic, migrateWords, startingWordsError, condOn, applyCond, enemyTurn, condTurnEnd, unitSees, lineOfSight, SIGIL_REV,
  type Sheet, type Combat, type Unit, type Character, type GameState, type MapDef,
} from '../src';

const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (archId: string, name: string, extra: Partial<Sheet> = {}): Sheet => { const a = arch(archId); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {}, ...extra }; };
const open = (w = 20, h = 20): MapDef => ({ ...MAPS.yard16, w, h, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5', '2,6', '2,7', '2,8'], foeStart: ['15,5', '15,6', '15,7', '15,8', '15,9', '15,10', '15,11', '15,12'] });
/** A seed whose next n d20 rolls are all 2–19 (no criticals, no natural 1s). */
function seed(n = 16, from = 1): { state: number } { for (let s = from; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return { state: s }; } throw new Error('no seed'); }
/** A seed whose next d20 is n. */
function rollIs(n: number): { state: number } { for (let s = 1; s < 200000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
interface FoeAt { at: string; name?: string; tier?: string; weapon?: string; sigils?: string[] | true }
/** A caster at C6 (2,5) who knows every word given, Max Sigil words 4, plenty of AP, charge and no Flux worries; foes
 * that never dodge or save (Defense −99, saves −99) and soak 500 HP; multipliers ×1 so the numbers are the spec's. */
function setup(words: string[], foes: FoeAt[] = [{ at: '9,5' }], o: { map?: MapDef; allies?: string[] } = {}) {
  const c = newCharacter('c1', 'p1', sheet('sigilist', 'Ilse')), extra = (o.allies || []).map((at, i) => ({ c: newCharacter('a' + i, 'p1', sheet('sigilist', 'Ally ' + (i + 1))), pos: at }));
  const cb = startCombat('t', o.map || open(), [{ c, pos: '2,5' }, ...extra], foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || 'minion', weapon: f.weapon || 'service_pistol', at: refOf(f.at), ...(f.sigils ? { sigils: f.sigils } : {}) })), 'easy', { state: 7 }, []);
  cb.objects = [];
  const u = cb.units.find((x) => x.charId === 'c1')!, es = cb.units.filter((x) => x.side === 'foe'), allies = cb.units.filter((x) => x.side === 'pc' && x !== u);
  for (const x of [u, ...allies]) { x.ap = 99; x.mg!.words = [...words]; x.mg!.maxWords = 4; x.mg!.charge = 999; x.mg!.flux = -99; x.mg!.sigilMult = 1; x.mg!.elemMult = 1; x.mg!.healMult = 1; x.mg!.rangeBonus = 0; x.mg!.durBonus = 0; x.mg!.coreSave = 0; x.mg!.glyphAp = 1; x.hp = x.maxHp = 500; x.armour = 0; x.def = 10; }
  for (const e of es) { e.def = -99; e.hp = e.maxHp = 500; e.armour = 0; e.sv = { body: -99, brain: -99, heart: -99 }; }
  cb.mana = 15; // Normal air: Healing given ×1
  return { cb, u, e: es[0], es, allies, rng: seed() };
}
/** Walk a Line: draw each word on the tile given (the caster steps there for free first). Ends on the last tile. */
function draw(cb: Combat, rng: { state: number }, u: Unit, words: string[], tiles: string[]) {
  for (let i = 0; i < words.length; i++) { u.pos = tiles[i]; const e = drawGlyph(cb, rng, u, words[i]); if (e) throw new Error(words[i] + ' at ' + tiles[i] + ': ' + e); }
}
const row = (x0: number, y: number, n: number, dx = 1, dy = 0) => Array.from({ length: n }, (_, i) => (x0 + i * dx) + ',' + (y + i * dy));
const lastLog = (cb: Combat) => cb.log[cb.log.length - 1];
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e) => e.k === k);
const dmgTo = (e: Unit, hp0: number) => hp0 - e.hp - 0;


describe('STAY (item 422): one strike, then the field', () => {
  it('the placing strike hits at full; the preview shows it and the field tiles', () => {
    const { cb, u, e, rng } = setup(['fire', 'seek', 'stay'], [{ at: '9,5' }]);
    draw(cb, rng, u, ['fire', 'stay', 'seek'], ['4,5', '3,5', '2,5']);
    const pv = previewEvoke(cb, u, '2,5', '9,5');
    expect(pv.ok).toBe(true); expect(pv.targets).toEqual([e.id]); expect(pv.missiles[0].placed).toBe('field'); expect(pv.missiles[0].burst.tiles).toEqual(['9,5']);
    const a = pv.affected.find((x) => x.unit === e.id)!; expect(a.mult).toBe(1); expect(a.dmgAfterArmour).toBe(30);
    const hp = e.hp; expect(evoke(cb, rng, u, '2,5', '9,5')).toBeNull();
    expect(hp - e.hp).toBe(30);
    const z: any = cb.zones!.find((x) => x.kind === 'field')!; expect(z.tiles).toEqual(['9,5']); expect(z.ever[e.id]).toBe(true);
  });
  it('a creature the field has not affected walking in takes full; one it struck takes half; once per round', () => {
    const { cb, u, es, rng } = setup(['fire', 'seek', 'stay'], [{ at: '9,5' }, { at: '12,5' }]);
    const [a, b] = es;
    draw(cb, rng, u, ['fire', 'stay', 'seek'], ['4,5', '3,5', '2,5']); evoke(cb, rng, u, '2,5', '9,5');
    let hp = a.hp; magicTurnStart(cb, rng, a); expect(a.hp).toBe(hp); // the strike was this round's
    hp = a.hp; a.ap = 9; moveUnit(cb, a, '9,6', rng); moveUnit(cb, a, '9,5', rng); expect(a.hp).toBe(hp); // still this round
    cb.round++;
    hp = a.hp; magicTurnStart(cb, rng, a); expect(hp - a.hp).toBe(15); // starts its turn there: half
    a.ap = 9; moveUnit(cb, a, '9,6', rng); hp = a.hp; moveUnit(cb, a, '9,5', rng); expect(a.hp).toBe(hp); // once per round
    cb.round++; a.ap = 9; moveUnit(cb, a, '9,6', rng); hp = a.hp; moveUnit(cb, a, '9,5', rng); expect(hp - a.hp).toBe(15); // walks back in: half
    a.pos = '9,8';
    const hb = b.hp; b.pos = '10,5'; b.ap = 9; moveUnit(cb, b, '9,5', rng); expect(hb - b.hp).toBe(30); // a newcomer: full
    cb.round++; const hb2 = b.hp; magicTurnStart(cb, rng, b); expect(hb2 - b.hp).toBe(15); // then half
  });
  it('a KIN field: the strike spares your side and hits the foe at full; after, half to it and nothing to your side', () => {
    const { cb, u, e, allies, rng } = setup(['fire', 'stay', 'spread', 'kin'], [{ at: '4,5' }], { allies: ['3,6'] });
    draw(cb, rng, u, ['fire', 'stay', 'spread', 'kin'], ['5,6', '4,6', '3,6', '2,6']);
    allies[0].pos = '3,6'; e.pos = '4,6'; u.pos = '2,6';
    const hp = e.hp, ah = allies[0].hp, uh = u.hp; expect(evoke(cb, rng, u, '2,6', u.pos)).toBeNull();
    expect(hp - e.hp).toBe(18); expect(allies[0].hp).toBe(ah); expect(u.hp).toBe(uh);
    cb.round++; const h2 = e.hp; magicTurnStart(cb, rng, e); expect(h2 - e.hp).toBe(9);
    magicTurnStart(cb, rng, allies[0]); expect(allies[0].hp).toBe(ah);
  });
  it('a trap with STAY: the springing is the placing strike (full), then the field takes it at half; a newcomer at full', () => {
    const { cb, u, es, rng } = setup(['fire', 'wait', 'stay', 'spread'], [{ at: '12,5' }, { at: '14,9' }]);
    const [a, b] = es;
    draw(cb, rng, u, ['fire', 'wait', 'stay', 'spread'], ['5,5', '4,5', '3,5', '2,5']); expect(evoke(cb, rng, u, '2,5', '6,5')).toBeNull();
    expect(cb.zones!.some((z) => z.kind === 'field')).toBe(false);
    const hp = a.hp; a.pos = '8,5'; a.ap = 9; moveUnit(cb, a, '6,5', rng);
    expect(hp - a.hp).toBe(18); expect(cb.zones!.some((z) => z.kind === 'trap')).toBe(false);
    const z: any = cb.zones!.find((x) => x.kind === 'field')!; expect(z.tiles.length).toBe(25); expect(z.ever[a.id]).toBe(true);
    cb.round++; const h2 = a.hp; magicTurnStart(cb, rng, a); expect(h2 - a.hp).toBe(9);
    const hb = b.hp; b.pos = '8,6'; b.ap = 9; moveUnit(cb, b, '7,6', rng); expect(hb - b.hp).toBe(18);
  });
});
