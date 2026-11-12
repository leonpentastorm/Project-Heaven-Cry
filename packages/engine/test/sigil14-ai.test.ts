// Enemy Sigil casting and Sigil-aware enemy movement, rules revision 1.4 (spec: Mana, Sigils 8 "Enemy casters";
// packages/engine/src/ai-sigil.ts; data/enemies.json `casters`). The AI only chooses; every spell it casts is a real
// planEvoke plan and every step a real action, so the tests check the choice and what the engine then did.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  ARCHETYPES, MAPS, newCharacter, startCombat, refOf, d20, enemyTurn, apply, newGame, sandboxWave, validateCampaign, PROVING_GROUND, condOn, objectsOf,
  CASTER, CASTERS, casterCombos, aiTileRisk, aiPlanValue, planEvoke, drawGlyph, makeObject,
  type Sheet, type Combat, type Unit, type MapDef, type GameState,
} from '../src';
import { counted } from '../src/kit';
// The planners' work, counted (src/kit.ts work / counted), with a quarter of slack over what was measured on 12 Nov 2026: three
// Sigil casters' turn 2,811 planEvoke calls; ten rounds of three hearts 2,933 Outburst plans; twelve enemy turns on the yard 61 path searches.
const WORK_MAX = { sigil: 3500, soul: 3700, yard: 80 };

const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (archId: string, name: string): Sheet => { const a = arch(archId); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const open = (w = 20, h = 20, solid: string[] = []): MapDef => ({ ...MAPS.yard16, w, h, cover: [], full: [], solid, difficult: [], pcStart: ['2,5', '2,6', '2,7', '2,8'], foeStart: ['15,5', '15,6', '15,7', '15,8', '15,9', '15,10', '15,11', '15,12'] });
/** A seed whose next n d20 rolls are all 2–19 (no criticals, no natural 1s). */
function seed(n = 40, from = 1): { state: number } { for (let s = from; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return { state: s }; } throw new Error('no seed'); }
interface PcAt { at: string; weapon?: string }
interface FoeAt { at: string; name?: string; tier?: string; weapon?: string; sigils?: string[] | true; caster?: string }
/** Players (sigilists with the given weapon) and foes; the foes' turn order puts foes[0] up; players soak 500 HP. */
function fight(pcs: PcAt[], foes: FoeAt[], map = open()) {
  const cs = pcs.map((p, i) => ({ c: newCharacter('c' + i, 'p1', sheet('sigilist', 'Player ' + (i + 1))), pos: p.at }));
  const cb = startCombat('t', map, cs, foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || 'soldier', weapon: f.weapon || 'combat_knife', at: refOf(f.at), ...(f.sigils ? { sigils: f.sigils } : {}), ...(f.caster ? { caster: f.caster } : {}) })), 'easy', { state: 7 }, []);
  cb.objects = [];
  const ps = cb.units.filter((x) => x.side === 'pc'), es = cb.units.filter((x) => x.side === 'foe');
  ps.forEach((x, i) => { x.hp = x.maxHp = 500; x.armour = 0; x.def = 10; x.sv = { body: 0, brain: 0, heart: 0 }; if (pcs[i].weapon) x.weapon = pcs[i].weapon!; });
  for (const e of es) { e.mg && (e.mg.flux = 0); }
  cb.mana = 15;
  return { cb, ps, es, e: es[0], p: ps[0] };
}
/** foes[0]'s turn with full AP. */
function turn(cb: Combat, e: Unit, rng = seed()) { cb.turn = cb.order.indexOf(e.id); e.ap = 6; enemyTurn(cb, rng); }
const by = (cb: Combat, u: Unit, re: RegExp) => cb.log.filter((l) => l.startsWith(u.name) && re.test(l));
const field = (cb: Combat, tiles: string[], side: 'pc' | 'foe', by: string, words = ['fire', 'stay']) => (cb.zones ||= []).push({ id: 'z' + (cb.zones!.length + 1), kind: 'field', tiles, words, by, side, left: 3, mult: 0.5, who: 'Player 1', hit: {}, element: 'fire' } as any);

describe('caster archetypes (data/enemies.json casters)', () => {
  it('a foe naming a caster gets its tier\'s stat block, an Evoker with the archetype\'s words and its spell bias', () => {
    expect(CASTERS.map((c) => c.id)).toEqual(['sigil_novice', 'sigil_adept', 'sigil_warden', 'sigil_magister']);
    const { e, es } = fight([{ at: '2,5' }], [{ at: '12,5', caster: 'sigil_adept' }, { at: '12,8', caster: 'sigil_warden', tier: 'elite', sigils: ['spark', 'seek'] }]);
    expect(e.mg!.evoker).toBe(true); expect(e.mg!.words).toEqual(CASTER.sigil_adept.sigils); expect(e.mg!.maxWords).toBe(3);
    expect((e.mg as any).aiBias).toBe(1.3); expect((e as any).caster).toBe('sigil_adept');
    expect(es[1].mg!.words).toEqual(['spark', 'seek']); expect(es[1].mg!.maxWords).toBe(4); // its own sigils win
  });
  it('the AI weighs a pruned set of grammar-valid spells (no second Reach word, at most Max Sigil words)', () => {
    const cs = casterCombos(CASTER.sigil_warden.sigils, 4);
    expect(cs.length).toBeGreaterThan(10); expect(cs.length).toBeLessThan(200); // kept per length (item 491)
    for (const c of cs) { expect(c.words.length).toBeLessThanOrEqual(4); expect(c.words.filter((w) => ['seek', 'arc', 'sense', 'relay'].includes(w)).length).toBeLessThanOrEqual(1); }
    for (const k of ['harm', 'boon', 'null', 'blink', 'place']) expect(cs.some((c) => c.kind === k), k).toBe(true);
  });
});

describe('enemy casters choose by situation (spec: Sigils 8)', () => {
  it('a cluster of players: a Burst that hits more than one (ARC · SPREAD), drawn and walked away and Evoked back', () => {
    const { cb, e, ps } = fight([{ at: '5,5' }, { at: '5,6' }, { at: '6,5' }], [{ at: '10,5', sigils: ['fire', 'arc', 'spread'] }]);
    const hp = ps.map((p) => p.hp);
    turn(cb, e);
    expect(by(cb, e, /draws FIRE/).length + by(cb, e, /draws ARC/).length + by(cb, e, /draws SPREAD/).length).toBe(3);
    expect(by(cb, e, /evokes/).length).toBe(1);
    expect(ps.filter((p, i) => p.hp < hp[i]).length).toBeGreaterThanOrEqual(2);
  });
  it('its own side in the blast: it adds KIN (no friendly fire) rather than hit its ally', () => {
    const { cb, e, es, ps } = fight([{ at: '5,5' }, { at: '5,6' }], [{ at: '10,5', sigils: ['fire', 'arc', 'spread', 'kin'] }, { at: '6,6', weapon: 'combat_knife' }]);
    es[1].hp = es[1].maxHp; const ally = es[1].hp, hp = ps.map((p) => p.hp);
    e.mg!.maxWords = 4; e.movement = 3; e.mg!.charge = 99; // four glyphs and the walk fit in 6 AP, one core
    turn(cb, e);
    expect(by(cb, e, /draws KIN/).length).toBe(1);
    expect(es[1].hp).toBe(ally);
    expect(ps.some((p, i) => p.hp < hp[i])).toBe(true);
  });
  it('a hurt ally and no player in its reach: MEND on the ally', () => {
    const { cb, e, es } = fight([{ at: '1,18' }], [{ at: '12,5', sigils: ['spark', 'mend', 'seek'] }, { at: '13,7' }]);
    es[1].hp = 15; for (const x of es) x.ap = 0;
    turn(cb, e);
    expect(by(cb, e, /evokes/).length).toBe(1);
    expect(es[1].hp).toBeGreaterThan(15);
  });
  it('a player charging in with a melee weapon: BIND before it arrives (worth more than a SPARK)', () => {
    const { cb, e, p } = fight([{ at: '6,5', weapon: 'sabre' }], [{ at: '11,5', sigils: ['spark', 'bind', 'seek'] }]);
    p.sv = { body: -99, brain: -99, heart: -99 };
    turn(cb, e);
    expect(by(cb, e, /draws BIND/).length).toBe(1);
    expect(condOn(p, 'pinned')).toBe(true);
  });
  it('a player field beside its side: NULL unmakes it', () => {
    const { cb, e, ps } = fight([{ at: '2,15' }], [{ at: '12,5', sigils: ['null', 'seek'] }, { at: '9,7' }]);
    field(cb, ['8,5', '8,6', '8,7', '9,5', '9,6'], 'pc', ps[0].id);
    turn(cb, e);
    expect(by(cb, e, /draws NULL/).length).toBe(1);
    const left = (cb.zones || []).filter((z) => z.kind === 'field').flatMap((z) => z.tiles);
    expect(left.length).toBeLessThan(5); // NULL unmakes the tiles it lands on (the field shrinks)
  });
  it('a player next to it: STEP out of melee, the Line walked sideways so it never leaves the player\'s reach (no opportunity attack)', () => {
    const { cb, e, p } = fight([{ at: '9,5', weapon: 'sabre' }], [{ at: '10,5', sigils: ['step', 'seek'], weapon: 'service_pistol' }]);
    e.hp = 20;
    turn(cb, e);
    expect(by(cb, e, /evokes/).length).toBe(1);
    expect(Math.max(Math.abs(+e.pos.split(',')[0] - 9), Math.abs(+e.pos.split(',')[1] - 5))).toBeGreaterThan(1);
    expect(cb.log.some((l) => /opportunity attack/.test(l))).toBe(false);
  });
  it('a trap where the player will cross toward it: hidden from the players', () => {
    const { cb, e } = fight([{ at: '6,5' }], [{ at: '9,5', sigils: ['spark', 'wait'], weapon: 'fists' }]);
    turn(cb, e);
    const t = (cb.zones || []).find((z) => z.kind === 'trap')!;
    expect(t.side).toBe('foe'); expect((t as any).hidden).toBe(true);
    expect((cb.fx || []).find((x) => x.k === 'trap_set')!.only).toBe('foe');
  });
  it('Flux: it vents first rather than overload; no charge: it loads a core first', () => {
    const a = fight([{ at: '5,5' }], [{ at: '10,5', sigils: ['spark', 'seek'] }]);
    a.e.mg!.flux = 5; turn(a.cb, a.e);
    expect(by(a.cb, a.e, /vents/).length).toBe(1); expect(a.cb.log.some((l) => /OVERLOAD/.test(l))).toBe(false); expect(by(a.cb, a.e, /evokes/).length).toBe(1);
    const b = fight([{ at: '5,5' }], [{ at: '10,5', sigils: ['spark', 'seek'] }]);
    b.e.mg!.charge = 0; turn(b.cb, b.e);
    expect(by(b.cb, b.e, /fresh core/).length).toBe(1); expect(by(b.cb, b.e, /evokes/).length).toBe(1);
    const c = fight([{ at: '5,5' }], [{ at: '10,5', sigils: ['spark', 'seek'] }]);
    c.e.mg!.charge = 0; c.e.mg!.cores = 0; turn(c.cb, c.e);
    expect(by(c.cb, c.e, /evokes|draws/).length).toBe(0); // nothing to cast with
  });
  it('the AI never cheats: a Hidden player is not a target, and a plan it scores is the engine\'s own plan', () => {
    const { cb, e, p } = fight([{ at: '5,5' }], [{ at: '10,5', sigils: ['spark', 'seek'], weapon: 'fists' }]);
    p.hidden = true; turn(cb, e);
    expect(by(cb, e, /draws|evokes/).length).toBe(0);
    p.hidden = false; e.pos = '7,5'; drawGlyph(cb, seed(), e, 'spark'); e.pos = '8,5'; drawGlyph(cb, seed(), e, 'seek');
    const pv = planEvoke(cb, e, '7,5', p.pos);
    expect(pv.ok).toBe(true); expect(aiPlanValue(cb, e, pv)).toBeGreaterThan(0);
  });
  it('weighs a full warden turn quickly (pruned candidates, the engine\'s planner)', () => {
    const { cb, es } = fight([{ at: '4,5' }, { at: '4,7' }, { at: '5,9' }, { at: '3,11' }], [{ at: '12,6', caster: 'sigil_warden', tier: 'elite' }, { at: '12,9', caster: 'sigil_warden', tier: 'elite' }, { at: '13,7', caster: 'sigil_adept' }]);
    es[2].hp = 20;
    const { work } = counted(() => { for (const e of es) turn(cb, e); });
    // work, not milliseconds (a count is the same on a loaded machine): the candidates the three casters weighed
    expect(work.planEvoke).toBeLessThan(WORK_MAX.sigil);
    expect(cb.log.some((l) => /evokes/.test(l))).toBe(true);
  });
  it('is deterministic: the same fight plays out the same', () => {
    const run = () => { const { cb, e } = fight([{ at: '5,5' }, { at: '5,6' }], [{ at: '10,5', caster: 'sigil_adept' }, { at: '12,8', caster: 'sigil_warden', tier: 'elite' }]); turn(cb, e); return cb.log.join('\n'); };
    expect(run()).toBe(run());
  });
});

describe('every enemy and the other side\'s magic', () => {
  it('walks around a field of yours it knows of instead of through it', () => {
    const { cb, e, p } = fight([{ at: '3,5', weapon: 'fists' }], [{ at: '10,5', tier: 'minion', weapon: 'fists' }]);
    const tiles = ['8,3', '8,4', '8,5', '8,6', '8,7']; field(cb, tiles, 'pc', p.id);
    e.hp = e.maxHp = 30; // the old Minion's HP: a field that would nearly kill it is one it walks round
    const hp = e.hp; turn(cb, e);
    expect(e.hp).toBe(hp);
    const walked = (cb.fx || []).filter((x) => x.k === 'move' && x.unit === e.id).flatMap((x) => x.path);
    expect(walked.length).toBeGreaterThan(1); expect(walked.some((k: string) => tiles.includes(k))).toBe(false);
    expect(aiTileRisk(cb, e, '8,5')).toBeGreaterThan(0); expect(aiTileRisk(cb, e, '8,9')).toBe(0);
  });
  it('steps around a spotted trap of yours, but walks onto one it hasn\'t spotted (it doesn\'t know)', () => {
    const mk = (spotted: string[]) => { const f = fight([{ at: '4,5', weapon: 'fists' }], [{ at: '8,5', tier: 'minion', weapon: 'fists' }]);
      (f.cb.zones ||= []).push({ id: 'tr1', kind: 'trap', tiles: ['6,5'], words: ['spark', 'wait'], by: f.p.id, side: 'pc', left: 3, mult: 1, who: 'Player 1', triggers: 1, hidden: true, spotted, element: 'spark', dir: [1, 0] } as any); return f; };
    const a = mk(['foe']); expect(aiTileRisk(a.cb, a.e, '6,5')).toBeGreaterThan(100); turn(a.cb, a.e);
    expect((a.cb.zones || []).some((z) => z.id === 'tr1')).toBe(true);
    const b = mk([]); expect(aiTileRisk(b.cb, b.e, '6,5')).toBe(0);
  });
  it('steps out of a field of yours it stands in, even without an Evoker', () => {
    const { cb, e, p } = fight([{ at: '2,15', weapon: 'fists' }], [{ at: '10,5', tier: 'minion', weapon: 'service_pistol' }]);
    field(cb, ['10,5'], 'pc', p.id); p.hidden = true;
    turn(cb, e); expect(e.pos).not.toBe('10,5');
  });
  it('strikes a turret of yours that has its side in reach, when no player is in its reach', () => {
    const { cb, e, p } = fight([{ at: '2,15' }], [{ at: '10,5', tier: 'soldier', weapon: 'service_pistol' }]);
    p.hidden = true;
    (cb.zones ||= []).push({ id: 'tu1', kind: 'turret', tiles: ['8,5'], words: ['spark', 'watch', 'seek'], by: p.id, side: 'pc', left: 2, mult: 0.5, who: 'Player 1', hp: 10, def: -99, hidden: false, spotted: [], element: 'spark' } as any);
    turn(cb, e);
    expect((cb.zones || []).some((z) => z.id === 'tu1')).toBe(false);
    expect(cb.log.some((l) => /Foe 1 hits it/.test(l))).toBe(true);
  });
  it('breaks a RAISE wall of yours that blocks its only way to you', () => {
    const solid = Array.from({ length: 20 }, (_, y) => '8,' + y).filter((k) => k !== '8,5');
    const { cb, e } = fight([{ at: '3,5', weapon: 'fists' }], [{ at: '9,5', tier: 'minion', weapon: 'fists' }], open(20, 20, solid));
    objectsOf(cb).push(makeObject('sw1', 'sigil_wall', '8,5', { hp: 30, max: 30, by: 'pc', side: 'pc', left: 3, sigilWall: true } as any));
    turn(cb, e);
    expect(by(cb, e, /smashes the raise wall/i).length).toBeGreaterThan(0);
    expect(objectsOf(cb).find((o) => o.id === 'sw1')?.hp ?? 0).toBeLessThan(30);
  });
});

describe('the Proving Ground wave pool (game.ts sandboxWave)', () => {
  const HOST = 'h1';
  const lobby = () => { let g: GameState = newGame('PROVE', { id: HOST, name: 'Host' }, 'seed-ai'); g = apply(g, { type: 'char/add', sheet: sheet('sigilist', 'Vel') }, HOST); return g; };
  it('casters join the waves: a Sigil novice on wave 2, a Sigil adept on odd waves from 3, a Sigil warden on even waves from 6, same tiers', () => {
    expect(sandboxWave(1).some((f) => f.caster)).toBe(false);
    expect(sandboxWave(2).find((f) => f.caster)).toMatchObject({ caster: 'sigil_novice', tier: 'minion', name: 'Sigil novice 1' });
    expect(sandboxWave(3).find((f) => f.caster === 'sigil_adept')).toMatchObject({ tier: 'soldier', weapon: 'combat_knife' });
    expect(sandboxWave(6).find((f) => f.caster === 'sigil_warden')).toMatchObject({ tier: 'elite', weapon: 'sabre' });
    expect(sandboxWave(9)).toEqual(sandboxWave(9));
    expect(validateCampaign(PROVING_GROUND)).toEqual([]);
  });
  it('through apply(): wave 3 fights with a Sigil adept that carries an Evoker (jumped to, and staged then fought)', () => {
    let g = apply(lobby(), { type: 'sandbox/start' }, HOST);
    g = apply(g, { type: 'sandbox/fight' }, HOST);
    const a = apply(g, { type: 'sandbox/wave', wave: 3 }, HOST);
    const adept = a.combat!.units.find((u) => /Sigil adept/.test(u.name))!;
    expect(adept.mg!.evoker).toBe(true); expect(adept.mg!.words).toEqual(CASTER.sigil_adept.sigils);
    let s = apply(lobby(), { type: 'sandbox/start' }, HOST);
    s = apply(s, { type: 'sandbox/stage', wave: 3 }, HOST);
    expect((s.story.npcs || []).some((n) => n.caster === 'sigil_adept')).toBe(true);
    s = apply(s, { type: 'sandbox/fight' }, HOST);
    expect(s.combat!.units.find((u) => /Sigil adept/.test(u.name))!.mg!.evoker).toBe(true);
  });
  it('a campaign NPC may name a caster of its tier; another tier or an unknown one is refused', () => {
    const c = JSON.parse(JSON.stringify(PROVING_GROUND));
    c.zones[0].npcs = [{ name: 'Hedge scribe', side: 'hostile', tier: 'soldier', weapon: 'combat_knife', at: 'J6', caster: 'sigil_adept' }];
    expect(validateCampaign(c)).toEqual([]);
    c.zones[0].npcs[0].caster = 'sigil_warden';
    expect(validateCampaign(c).join(' ')).toMatch(/Sigil caster/);
  });
});
