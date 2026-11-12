// Rules revision 1.17 (the magic step of the balance pass, 11 Nov 2026; spec: "Rules revision 1.17"). What this file
// pins, each from a sentence of the spec:
//   Sigil     the Line multiplier (×1.7 / ×1.75 / ×1.8 by length; damage only; characters only), no ceiling on a
//             spell's damage, a critical ×1.5 (to ×2.0), the level gap on the roll to hit, and the standing rule that one
//             Evoke never takes an Elite or a Boss of the caster's level from full HP to nothing.
//   Outburst  the stage table (×0.8, then +0.4 a stage), the Damage base (28 for a character, 18 for an enemy caster),
//             a critical ×1.5, the level gap, every feeling's step and cost (none under a plain Pump's +0.4 but Relief),
//             Calm, Shame, Relief, Love and Guilt as their cards now say, Abandon once, and the repriced modules.
// The targets themselves (percent of the plain rifle) are pinned cheaply in balance/magic-measure.test.ts.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import {
  ARCHETYPES, MAPS, newCharacter, startCombat, refOf, d20, drawGlyph, evoke, previewEvoke, compileSpell, lineMult, LINE_MULT, lineMultFor, spellCritMult, capParts,
  STAGE_MULT, stageMult, SOUL_DAMAGE, SOUL_DAMAGE_ENEMY, outburstDamage, heldMult, previewOutburstPlan, previewPump, heartMagic, HEART_CASTERS, migrateDesign,
  FEELINGS, FEELING, PLAIN_STEP, feelingStep, MODULE, RETIRED_MODULE, SOUL_RULES, SIGIL_GRAMMAR, CRIT_BASE, CRIT_MAX,
  type Sheet, type Combat, type Unit, type MapDef, type OutburstDesign,
} from '../src';
import { fightWith, withGame } from './helpers/perkfight';

// ---------- Sigil ----------
const arch = (id: string) => ARCHETYPES.find((a: any) => a.id === id)!;
const sheet = (name: string): Sheet => { const a = arch('sigilist'); return { name, portrait: '', origin: 'Central City', kit: 'sigil', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
const open = (): MapDef => ({ ...MAPS.yard16, w: 20, h: 20, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5', '2,6'], foeStart: ['15,5', '15,6', '15,7', '15,8'] });
function seed(n = 16): { state: number } { for (let s = 1; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return { state: s }; } throw new Error('no seed'); }
function rollIs(n: number): { state: number } { for (let s = 1; s < 200000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
/** A caster at 2,5 with every multiplier ×1; foes that never dodge or save, 500 HP, no armour. */
function sigil(words: string[], foes: { at: string; tier?: string; sigils?: string[] }[] = [{ at: '9,5' }], allyAt?: string) {
  const c = newCharacter('c1', 'p1', sheet('Ilse')), ally = allyAt ? [{ c: newCharacter('a1', 'p1', sheet('Ally')), pos: allyAt }] : [];
  const cb = startCombat('t', open(), [{ c, pos: '2,5' }, ...ally], foes.map((f, i) => ({ name: 'Foe ' + (i + 1), tier: f.tier || 'minion', weapon: 'service_pistol', at: refOf(f.at), ...(f.sigils ? { sigils: f.sigils } : {}) })), 'easy', { state: 7 }, []);
  cb.objects = [];
  const u = cb.units.find((x) => x.charId === 'c1')!, es = cb.units.filter((x) => x.side === 'foe'), al = cb.units.find((x) => x.charId === 'a1');
  for (const x of cb.units.filter((q) => q.side === 'pc')) { x.ap = 99; x.mg!.words = [...words]; x.mg!.maxWords = 4; x.mg!.charge = 999; x.mg!.flux = -99; x.mg!.sigilMult = 1; x.mg!.sigilBoon = 1; x.mg!.deal = 1; x.mg!.elemMult = 1; x.mg!.healMult = 1; x.mg!.rangeBonus = 0; x.mg!.durBonus = 0; x.mg!.coreSave = 0; x.mg!.glyphAp = 1; x.hp = x.maxHp = 500; x.armour = 0; x.def = 10; }
  for (const e of es) { e.def = -99; e.hp = e.maxHp = 500; e.armour = 0; e.sv = { body: -99, brain: -99, heart: -99 }; }
  cb.mana = 15;
  return { cb, u, e: es[0], es, ally: al, rng: seed() };
}
function draw(cb: Combat, rng: { state: number }, u: Unit, words: string[], tiles: string[]) {
  for (let i = 0; i < words.length; i++) { u.pos = tiles[i]; const e = drawGlyph(cb, rng, u, words[i]); if (e) throw new Error(words[i] + ' at ' + tiles[i] + ': ' + e); }
}
/** Draw the Line walking away from the foe (ending on the last tile) and Evoke it at the foe. Returns the HP lost. */
function cast(s: ReturnType<typeof sigil>, words: string[], rng = s.rng, t: Unit = s.e): number {
  const tiles = words.map((_, i) => (5 - i) + ',5'); draw(s.cb, s.rng, s.u, words, tiles);
  const hp = t.hp, err = evoke(s.cb, rng, s.u, tiles[tiles.length - 1], t.pos); if (err) throw new Error(err);
  return hp - t.hp;
}

describe('Sigil: the Line multiplier (rules 1.17)', () => {
  it('the data: ×1.87 for 2 glyphs, ×1.93 for 3, ×1.98 for 4 (rules 1.26, the re-fit; ×1.7 / 1.75 / 1.8 in rules 1.17); nothing under 2 glyphs', () => {
    expect(LINE_MULT).toEqual({ 2: 1.87, 3: 1.93, 4: 1.98 }); expect([1, 2, 3, 4, 5].map(lineMult)).toEqual([1, 1.87, 1.93, 1.98, 1.98]);
    expect(SIGIL_GRAMMAR.line_mult.provisional).toBe(true);
  });
  it('a character\'s Line multiplies its damage by its length, in the preview and in the hit', () => {
    const a = sigil(['fire', 'seek']); expect(cast(a, ['fire', 'seek'])).toBe(Math.round(30 * LINE_MULT[2])); // 56
    const b = sigil(['fire', 'condense', 'seek']); expect(cast(b, ['fire', 'condense', 'seek'])).toBe(Math.round(30 * 1.5 * LINE_MULT[3])); // 87
    // 4 glyphs: STONE 35 in full (Sigil), FIRE at half (Elemental), CONDENSE ×1.5, the Line ×1.8
    const c = sigil(['stone', 'fire', 'condense', 'seek']);
    draw(c.cb, c.rng, c.u, ['stone', 'fire', 'condense', 'seek'], ['5,5', '4,5', '3,5', '2,5']);
    const pv = previewEvoke(c.cb, c.u, '2,5', c.e.pos); expect(pv.affected[0].dmg).toBe(Math.round(35 * 1.5 * LINE_MULT[4]) + Math.round(15 * 1.5 * LINE_MULT[4]));
    const hp = c.e.hp; expect(evoke(c.cb, c.rng, c.u, '2,5', c.e.pos)).toBeNull(); expect(hp - c.e.hp).toBe(pv.affected[0].dmg);
  });
  it('damage only: the Line multiplier does not touch a heal (MEND 10 since rules 1.20)', () => {
    const s = sigil(['mend', 'seek'], [{ at: '15,5' }], '9,5'); s.ally!.hp = 100;
    draw(s.cb, s.rng, s.u, ['mend', 'seek'], ['5,5', '4,5']); expect(evoke(s.cb, s.rng, s.u, '4,5', '9,5')).toBeNull();
    expect(s.ally!.hp).toBe(110);
  });
  it('an enemy caster\'s Line takes no multiplier: its damage comes from the enemy table', () => {
    const s = sigil(['fire', 'seek'], [{ at: '9,5', sigils: ['fire', 'seek'] }]), sp = compileSpell(['fire', 'seek']);
    expect(lineMultFor(s.u, sp)).toBe(LINE_MULT[2]); expect(lineMultFor(s.e, sp)).toBe(1); expect(lineMultFor(null, sp)).toBe(1);
  });
  it('no ceiling: a spell is never scaled down to 350 (the targets stay targets)', () => {
    expect(capParts([400, 300], false)).toEqual([400, 300]);
    const s = sigil(['fire', 'seek']); s.u.mg!.sigilMult = 10; s.e.hp = s.e.maxHp = 5000;
    expect(cast(s, ['fire', 'seek'])).toBe(Math.round(30 * LINE_MULT[2] * 10)); // 561
  });
});

describe('Sigil: a critical, the level gap, and the Elite and Boss guard (rules 1.17)', () => {
  it('a critical is ×1.5 (the caster\'s own critical multiplier, never past ×2.0), not ×2', () => {
    const s = sigil(['fire', 'seek']); const cm = spellCritMult(s.cb, s.u, s.e);
    expect(cm).toBeGreaterThanOrEqual(CRIT_BASE); expect(cm).toBeLessThanOrEqual(CRIT_MAX); expect(cm).toBeLessThan(2);
    expect(cast(s, ['fire', 'seek'], rollIs(20))).toBe(Math.round(30 * LINE_MULT[2] * cm));
    const half = sigil(['fire', 'seek']); half.e.critTaken = 0.5; // the target's Critical damage taken cuts the part above ×1
    expect(spellCritMult(half.cb, half.u, half.e)).toBeCloseTo(1 + (cm - 1) / 2);
    s.u.critTaken = 0; expect(spellCritMult(s.cb, s.e, s.u)).toBe(CRIT_BASE); // an enemy's
  });
  it('a spell\'s roll to hit reads the level gap: ±1 a level, like a weapon\'s', () => {
    const s = sigil(['fire', 'seek']); draw(s.cb, s.rng, s.u, ['fire', 'seek'], ['5,5', '4,5']);
    s.u.level = 6; s.e.level = 6; (s.e as any).lvlDmg = 1; const even = previewEvoke(s.cb, s.u, '4,5', s.e.pos).affected[0].roll!.bonus;
    s.e.level = 9; expect(previewEvoke(s.cb, s.u, '4,5', s.e.pos).affected[0].roll!.bonus).toBe(even - 3);
    s.e.level = 4; expect(previewEvoke(s.cb, s.u, '4,5', s.e.pos).affected[0].roll!.bonus).toBe(even + 2);
  });
  const big = (tier: string, words = ['fire', 'seek']) => { const s = sigil(words, [{ at: '9,5', tier }]); s.u.mg!.sigilMult = 10; s.e.hp = s.e.maxHp = 200; s.u.level = 6; s.e.level = 6; (s.e as any).lvlDmg = 1; return s; };
  it('one Evoke never takes an Elite or a Boss of your level from full HP to nothing: it is left on 1 HP', () => {
    for (const tier of ['elite', 'boss']) {
      const s = big(tier); expect(cast(s, ['fire', 'seek'])).toBe(199); expect(s.e.hp).toBe(1); expect(s.e.dead).toBeFalsy();
      expect(s.cb.log.at(-1)).toMatch(/too tough to fall to one spell: 1 HP left/);
      expect(cast(s, ['fire', 'seek'])).toBe(1); expect(s.e.dead).toBe(true); // the second Evoke finishes it
    }
  });
  it('the guard is for full HP, for Elites and Bosses, and for enemies at or above your level only', () => {
    const hurt = big('elite'); hurt.e.hp = 199; cast(hurt, ['fire', 'seek']); expect(hurt.e.dead).toBe(true);
    const soldier = big('soldier'); cast(soldier, ['fire', 'seek']); expect(soldier.e.dead).toBe(true);
    const below = big('elite'); below.e.level = 4; cast(below, ['fire', 'seek']); expect(below.e.dead).toBe(true); // 2 levels under the caster
    const above = big('elite'); above.e.level = 8; above.e.def = -99; cast(above, ['fire', 'seek']); expect(above.e.hp).toBe(1);
  });
  it('TWICE: both missiles of one Evoke are held by the guard', () => {
    const words = ['fire', 'twice', 'seek'], s = big('boss', words); draw(s.cb, s.rng, s.u, words, ['5,5', '4,5', '3,5']);
    expect(evoke(s.cb, s.rng, s.u, '3,5', s.e.pos, { aims: [s.e.pos, s.e.pos] } as any)).toBeNull();
    expect(s.cb.log.at(-1)).toMatch(/missile 2 .*hits Foe 1/); expect(s.e.hp).toBe(1); expect(s.e.dead).toBeFalsy();
  });
});

// ---------- Outburst ----------
const SEED = (() => { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < 60 && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); })();
/** A Soul caster at 3,5 on its turn, Soul multiplier 1, plenty of MP and AP, Strain limit 20, every feeling felt; the
 * Damage base is the game's own (28). Foes and allies 500 HP, no armour, Defense −99, saves −99. */
function heart(foes: string[] = ['6,5'], allies: string[] = []) {
  const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' }, ...allies.map(() => ({ archetype: 'stormcaller', kit: 'soul' }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; }); f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; (x as any).elemTaken = 0; (x as any).healRecv = 1; }
  for (const p of f.pcs) { Object.assign(p.mg!, { emanator: true, mp: 9999, mpMax: 9999, soulMult: 1, soulBoon: 1, deal: 1, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, firstUsed: true, feelings: FEELINGS.map((x) => x.id), debuff: { body: 0, brain: 0, heart: 0 } }); p.sk = {}; p.dbf = {}; }
  const u = f.turn(f.pc); u.ap = 60; f.g.rng.state = SEED;
  return f;
}
type F = ReturnType<typeof heart>;
const give = (u: Unit, d: Partial<OutburstDesign> = {}): string => { const id = 'd' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: [], ...d } as OutburstDesign); return id; };
const A = (f: F, a: Record<string, any>) => f.act({ unitId: f.pc.id, ...a } as any);
const begin = (f: F, design: string, o: Record<string, any> = {}) => A(f, { type: 'combat/outburst', design, ...o });
const pump = (f: F, feeling?: string) => A(f, { type: 'combat/pump', ...(feeling ? { feeling } : {}) });
const release = (f: F, aim = '6,5') => A(f, { type: 'combat/release', aim });
const me = (f: F) => f.unit(f.pc.id);
const lost = (u: Unit) => 500 - u.hp;

// Rules 1.19 (the Outburst rework, round 2) changed the stage table, the Damage base and every feeling: those are pinned
// in rules119-outburst.test.ts. What rules 1.17 set and still stands is pinned here.
describe('Outburst: what rules 1.17 set and still stands', () => {
  it('a character\'s heart carries its own Damage base; an enemy caster has none of its own and reads the enemy base', () => {
    expect(SOUL_RULES.damage.provisional).toBe(true);
    const f = heart(); expect(me(f).mg!.soulBase).toBe(SOUL_DAMAGE);
    const d = give(f.pc); begin(f, d, { aim: '6,5' }); expect(lost(f.foe)).toBe(Math.floor(SOUL_DAMAGE * 0.8)); // a snap cast
    const g = heart(); const e = give(g.pc); begin(g, e); for (let i = 0; i < 4; i++) pump(g); release(g); expect(lost(g.foe)).toBe(Math.floor(SOUL_DAMAGE * stageMult(4)));
    const foe = g.foes[0]; foe.mg = heartMagic(foe, HEART_CASTERS[0]); expect(foe.mg!.soulBase).toBeUndefined();
    expect(outburstDamage(foe.mg!, { id: 'x', name: 'x', school: 'damage', modules: [] } as any, 1)).toBeCloseTo(SOUL_DAMAGE_ENEMY * foe.mg!.soulMult);
    // a fight saved before rules 1.17: the character's heart gets its base back the first time it is read
    delete me(g).mg!.soulBase; const d2 = give(g.pc); begin(g, d2); expect(me(g).mg!.soulBase).toBe(SOUL_DAMAGE);
  });
  it('a critical is ×1.5 (to ×2.0 at most), not ×2; the roll reads the level gap', () => {
    const f = heart(); const d = give(f.pc); f.g.rng.state = rollIs(20).state;
    const cm = withGame(f.g, () => spellCritMult(f.cb, me(f), f.foe)); expect(cm).toBeGreaterThanOrEqual(1.5); expect(cm).toBeLessThan(2);
    begin(f, d, { aim: '6,5' }); expect(lost(f.foe)).toBe(Math.floor(SOUL_DAMAGE * 0.8 * cm));
    const g = heart(); const e = give(g.pc); me(g).level = 6; g.foe.level = 6; (g.foe as any).lvlDmg = 1;
    const even = withGame(g.g, () => previewOutburstPlan(g.cb, me(g), e, '6,5')).affected[0].roll!.bonus;
    g.foe.level = 9; expect(withGame(g.g, () => previewOutburstPlan(g.cb, me(g), e, '6,5')).affected[0].roll!.bonus).toBe(even - 3);
  });
  it('Love with no ally in the shape heals the most wounded ally in reach, or you (rules 1.20: ×0.15 of the Buff school\'s heal at that multiplier)', () => {
    const love = Math.floor(7 * 10 * heldMult(null, heart().pc, { stage: 1, felt: ['love'] }) * 0.15); // Healing given ×10 here, so the number is readable
    const f = heart(); me(f).mg!.healMult = 10; me(f).hp = 400; const d = give(f.pc, { modules: ['at_once'] }); begin(f, d); pump(f, 'love');
    const plan = withGame(f.g, () => previewOutburstPlan(f.cb, me(f), 'held', '6,5'));
    expect(plan.affected.find((a) => a.unit === f.pc.id)!.heal).toBe(love);
    release(f); expect(me(f).hp).toBe(400 + love);
    const g = heart(['6,5'], ['3,6']); me(g).mg!.healMult = 10; me(g).hp = 450; g.unit(g.pcs[1].id).hp = 300; const e = give(g.pc, { modules: ['at_once'] }); begin(g, e); pump(g, 'love'); release(g);
    expect(g.unit(g.pcs[1].id).hp).toBe(300 + love); expect(me(g).hp).toBe(450); // the ally was hurt worse
  });
  it('each card opens with its step in plain words and names no rule', () => {
    for (const f of FEELINGS) {
      const base = f.step.base!, sign = base < 0 ? '−' : '+';
      expect(f.pour.text.startsWith(sign + (Math.abs(base) % 1 ? Math.abs(base).toFixed(1) : String(Math.abs(base)))), f.id + ': ' + f.pour.text).toBe(true);
      expect(f.pour.text, f.id).not.toMatch(/item \d|rules \d|section \d/i);
      expect(f.step.text, f.id).toMatch(/^[+−]\d/);
    }
  });
});

describe('Outburst: the modules that were repriced (rules 1.17)', () => {
  it('Impact is retired (it did nothing): an old design holding it loses it and keeps working', () => {
    expect(MODULE.impact).toBeUndefined(); expect(RETIRED_MODULE.impact).toMatchObject({ becomes: null });
    expect(migrateDesign({ id: 'o', name: 'Old', school: 'damage', modules: ['impact', 'move'] } as any).modules).toEqual(['move']);
    expect(SOUL_RULES.gates.skills.will_power).not.toContain('impact');
  });
  it('At Once ×0.8, Return\'s second hit ×0.3, Quiet +5 MP (Shell and Inverse have shield bases of their own since rules 1.20)', () => {
    expect((MODULE.at_once as any).damage_mult).toBe(0.8); expect((MODULE.return as any).second_mult).toBe(0.3);
    expect((MODULE.shell as any).shield).toBe(4); expect((MODULE.inverse as any).shield).toBe(10); expect(MODULE.quiet.cost).toBe(5);
    const a = heart(); begin(a, give(a.pc, { modules: ['at_once'] }), { aim: '6,5' }); expect(lost(a.foe)).toBe(Math.floor(SOUL_DAMAGE * 0.8 * 0.8));
    const r = heart(); begin(r, give(r.pc, { modules: ['return'] }), { aim: '6,5' }); expect(lost(r.foe)).toBe(Math.floor(SOUL_DAMAGE * 0.8) + Math.floor(SOUL_DAMAGE * 0.8 * 0.3));
    const pr = heart(); const dr = give(pr.pc, { modules: ['return'] }); expect(withGame(pr.g, () => previewOutburstPlan(pr.cb, me(pr), dr, '6,5')).affected[0].dmg).toBe(Math.floor(SOUL_DAMAGE * 0.8 * 1.3));
    const s = heart(); begin(s, give(s.pc, { modules: ['shell'] }), { aim: '6,5' }); expect(me(s).shield).toBe(Math.floor(4 * 0.8)); // rules 1.20: 4 × the Soul multiplier × the stage multiplier
    const i = heart(['12,5'], ['4,5']); begin(i, give(i.pc, { modules: ['inverse'] }), { aim: '4,5' }); expect(i.unit(i.pcs[1].id).shield).toBe(Math.floor(10 * 0.8)); // rules 1.20: 10 × the Soul multiplier × the stage multiplier
  });
});
