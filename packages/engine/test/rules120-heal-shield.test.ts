// Rules revision 1.20 (the heal and shield pass; 12 Nov 2026; spec: "Rules revision 1.20"). What this file pins, each
// from a sentence of the spec:
//   the level factor   healing and shields from Sigil, the Outburst and prayer grow with the caster's level, by the
//                      level row of the enemy table's damage column; an enemy caster's do not (its own bases stay)
//   the bases          MEND 10, WARD 12; the Buff heal 7; Inverse 10 and Shell 4 (× the Soul multiplier, never the
//                      Damage base); Love ×0.25 and ×0.15 of the Buff heal; in a shape ×0.4; Will Shield 12, the
//                      Bard's Mend 9; the prayers (Health 5, Protection 6, Warm Hands 10, Saint's Shield 12,
//                      Absolution 7, Hearthlight 4, Coin for the Ferry 5, Mother Ember 10 + 3 × Devotion)
//   the round limit    WITHDRAWN by rules 1.23 (Leon, 12 Nov 2026): nothing limits a round's healing (pinned here as
//                      gone; the rest of rules 1.23 is in rules123-defence.test.ts)
//   shields            the bigger one stands; a point of shield is a point of HP (taken after armour)
// The bands themselves (percent of a Soldier-turn) are pinned in balance/heal-measure.test.ts.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import {
  SIGIL, SCHOOL, MODULE, FEELING, FEELINGS, WHISPERS, FAITH_PATRON, RULES, ENEMY_LEVELS, SOUL_DAMAGE, CLASS_MOVE_POOL,
  mendFactor, MENDING, BUFF_HEAL, BUFF_HEAL_ENEMY, BOON_AREA, outburstHeal, inverseShield, shellShield, loveHeal,
  healUnit, grantShield, heal, heartMagic, HEART_CASTERS, drawGlyph, evoke, previewOutburstPlan, d20,
  type Unit, type OutburstDesign,
} from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';

const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const, SIG = { archetype: 'sigilist', kit: 'sigil' } as const;
/** A caster at 3,5 on its turn and one ally at 4,5; every multiplier ×1 unless the test sets it; everyone 500 HP. */
function rig(spec: CharSpec = {}, o: { level?: number } = {}) {
  const f = fightWith([{ ...SOUL, ...spec, ...(o.level ? { level: o.level } : {}) }, { ...SOUL }], [{ tier: 'minion' }]);
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pcs[0].pos = '3,5'; f.pcs[1].pos = '4,5'; f.foe.pos = '12,5';
  for (const x of [...f.pcs, f.foe]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; (x as any).healRecv = 1; (x as any).shieldRecv = 1; }
  for (const p of f.pcs) if (p.mg) { Object.assign(p.mg, { emanator: true, evoker: true, mp: 9999, mpMax: 9999, charge: 999, flux: -99, soulMult: 1, soulBoon: 1, deal: 1, sigilMult: 1, sigilBoon: 1, healMult: 1, strain: 0, strainLimit: 20, freePumps: 0, freePumpsMax: 0, freeUsed: 0, firstUsed: true, feelings: FEELINGS.map((q) => q.id), maxWords: 4, glyphAp: 1, coreSave: 0, rangeBonus: 0 }); }
  const u = f.turn(f.pc); u.ap = 60;
  return f;
}
type F = ReturnType<typeof rig>;
const me = (f: F) => f.unit(f.pc.id), ally = (f: F) => f.unit(f.pcs[1].id);
const give = (u: Unit, d: Partial<OutburstDesign>): string => { const id = 'd' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'buff', option: 'heal', modules: [], ...d } as OutburstDesign); return id; };
const A = (f: F, a: Record<string, any>) => f.act({ unitId: f.pc.id, ...a } as any);
function seed(n = 16): { state: number } { for (let s = 1; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return { state: s }; } throw new Error('no seed'); }

describe('rules 1.20: the level factor', () => {
  it('is the level row of the enemy table\'s damage column, and every number of the revision is provisional', () => {
    for (const r of ENEMY_LEVELS.table) expect(mendFactor(r.level)).toBe(r.damage_mult);
    expect([1, 3, 6, 9, 12, 20].map(mendFactor)).toEqual([1, 1.05, 1.13, 1.24, 1.38, 1.82]); expect(mendFactor(null)).toBe(1); expect(mendFactor(99)).toBe(1.82);
    expect((RULES as any).mending.provisional).toBe(true); expect(MENDING.shield_over_heal).toBe(1.2);
    expect((SIGIL.mend as any).provisional).toBe(true); expect((SCHOOL.buff as any).provisional).toBe(true); expect((MODULE.inverse as any).provisional).toBe(true); expect((MODULE.shell as any).provisional).toBe(true);
  });
  it('a character\'s heart carries it; an enemy caster\'s does not, and keeps the old bases', () => {
    const f = rig({}, { level: 12 }); expect(me(f).mg!.mend).toBe(1.38);
    const foe = f.foe; foe.mg = heartMagic(foe, HEART_CASTERS[0]); expect(foe.mg!.mend).toBeUndefined();
    const d: any = { id: 'x', school: 'buff', option: 'heal', modules: [] };
    expect(outburstHeal(foe.mg!, d, 1)).toBe(BUFF_HEAL_ENEMY * foe.mg!.healMult); expect(BUFF_HEAL_ENEMY).toBe(30);
    expect((SIGIL.mend as any).heal_enemy).toBe(25); expect((SIGIL.ward as any).shield_enemy).toBe(30);
  });
});

describe('rules 1.20: Sigil', () => {
  it('MEND 10 and WARD 12, × the Sigil multiplier × Healing given × the level factor', () => {
    expect((SIGIL.mend as any).heal).toBe(10); expect((SIGIL.ward as any).shield).toBe(12);
    const f = rig({ ...SIG }, { level: 12 }), u = me(f), rng = seed(); u.mg!.words = ['mend', 'ward', 'seek']; u.mg!.sigilMult = 2; u.mg!.sigilBoon = 2; u.mg!.healMult = 1.5; ally(f).hp = 100; ally(f).pos = '8,5'; // rules 1.26: a boon reads the landed sigil_mend Stat (sigilBoon)
    withGame(f.g, () => {
      u.pos = '5,5'; expect(drawGlyph(f.cb, rng, u, 'mend')).toBeFalsy(); u.pos = '4,5'; expect(drawGlyph(f.cb, rng, u, 'seek')).toBeFalsy();
      expect(evoke(f.cb, rng, u, '4,5', '8,5')).toBeNull();
    });
    expect(ally(f).hp).toBe(100 + Math.round(10 * 2 * 1.5 * 1.38)); // 41
    withGame(f.g, () => {
      u.pos = '5,6'; expect(drawGlyph(f.cb, rng, u, 'ward')).toBeFalsy(); u.pos = '4,6'; expect(drawGlyph(f.cb, rng, u, 'seek')).toBeFalsy(); ally(f).pos = '8,6';
      expect(evoke(f.cb, rng, u, '4,6', '8,6')).toBeNull();
    });
    expect(ally(f).shield).toBe(Math.round(12 * 2 * 1.5 * 1.38)); // 50
  });
});

describe('MEND\'s base by who casts it (truth pass 3)', () => {
  it('an allied caster that is not a character (no sheet, on the players\' side) mends at the character base, as before; only an enemy caster takes the enemy base', () => {
    const run = (strip: boolean) => {
      const f = rig({ ...SIG }, { level: 12 }), u = me(f), rng = seed(); u.mg!.words = ['mend', 'seek']; u.mg!.sigilMult = 2; u.mg!.healMult = 1.5; ally(f).hp = 100; ally(f).pos = '8,5';
      if (strip) { delete (u as any).charId; delete (u as any).ctrl; }
      withGame(f.g, () => { u.pos = '5,5'; drawGlyph(f.cb, rng, u, 'mend'); u.pos = '4,5'; drawGlyph(f.cb, rng, u, 'seek'); evoke(f.cb, rng, u, '4,5', '8,5'); });
      return ally(f).hp - 100;
    };
    const asChar = run(false), asAlly = run(true);
    expect(asChar).toBeGreaterThan(0); expect(asAlly).toBe(asChar); // the enemy base (25) would give 2.5 times as much
  });
});

describe('rules 1.20: the Outburst', () => {
  it('the Buff heal is 7 × Healing given × the stage multiplier × the level factor', () => {
    expect(BUFF_HEAL).toBe(7); expect((SCHOOL.buff as any).heal).toBe(7);
    const f = rig({}, { level: 6 }); me(f).mg!.healMult = 2; ally(f).hp = 100;
    const d = give(me(f), {}); A(f, { type: 'combat/outburst', design: d, hold: true }); A(f, { type: 'combat/pump' }); A(f, { type: 'combat/pump' });
    const pv = withGame(f.g, () => previewOutburstPlan(f.cb, me(f), 'held', '4,5')); expect(pv.affected[0].heal).toBe(Math.floor(7 * 2 * 1.2 * 1.13));
    A(f, { type: 'combat/release', aim: '4,5' }); expect(ally(f).hp).toBe(100 + Math.floor(7 * 2 * 1.2 * 1.13)); // 18
  });
  it('in a shape each ally is healed for ×0.4; the shape\'s damage multiplier is not used', () => {
    expect(BOON_AREA).toBe(0.4); expect((SCHOOL.buff as any).area_mult).toBe(0.4);
    const f = rig(); me(f).mg!.healMult = 10; ally(f).hp = 100; me(f).hp = 100;
    const d = give(me(f), { modules: ['aura'] }); A(f, { type: 'combat/outburst', design: d, hold: true }); A(f, { type: 'combat/pump' }); A(f, { type: 'combat/release' });
    expect(ally(f).hp).toBe(100 + Math.floor(7 * 10 * 1.0 * 0.4)); expect(me(f).hp).toBe(100 + Math.floor(7 * 10 * 1.0 * 0.4)); // 28 each
  });
  it('Inverse and Shell have shield bases of their own: the Damage base does not move them', () => {
    expect((MODULE.inverse as any).shield).toBe(10); expect((MODULE.shell as any).shield).toBe(4);
    const f = rig({}, { level: 20 }), m = me(f).mg!; m.soulMult = 2; m.soulBoon = 2; // rules 1.26: a Soul shield reads the landed soul_mend Stat (soulBoon)
    const inv: any = { id: 'i', school: 'damage', modules: ['inverse'] }, wave: any = { id: 'w', school: 'damage', modules: ['inverse', 'wave'] }, bolt: any = { id: 'b', school: 'damage', modules: [] };
    const was = [inverseShield(m, inv, 1.4), shellShield(m, bolt, 1.4)];
    expect(was[0]).toBeCloseTo(10 * 2 * 1.4 * 1.82, 5); expect(was[1]).toBeCloseTo(4 * 2 * 1.4 * 1.82, 5);
    expect(inverseShield(m, wave, 1.4)).toBeCloseTo(was[0] * 0.4, 5);
    m.soulBase = SOUL_DAMAGE * 3; expect([inverseShield(m, inv, 1.4), shellShield(m, bolt, 1.4)]).toEqual(was); // three times the damage: the same shields
    m.soulBase = SOUL_DAMAGE;
    const d = give(me(f), { school: 'damage', option: undefined, modules: ['inverse'] }); A(f, { type: 'combat/outburst', design: d, hold: true }); A(f, { type: 'combat/pump' }); A(f, { type: 'combat/release', aim: '4,5' });
    expect(ally(f).shield).toBe(Math.floor(10 * 2 * 1.0 * 1.82)); // 36
  });
  it('Love heals a share of the Buff school\'s heal (×0.25 in the shape, ×0.15 alone), not a share of the damage', () => {
    expect((FEELING.love.pour as any).heal_share).toBe(0.25); expect((FEELING.love.pour as any).lone_heal_share).toBe(0.15);
    expect((FEELING.love.pour as any).heal_of_power).toBeUndefined();
    const f = rig(), m = me(f).mg!; m.healMult = 4; const bolt: any = { id: 'b', school: 'damage', modules: [] };
    const a = loveHeal(m, bolt, 2), lone = loveHeal(m, bolt, 2, true); expect(a).toBeCloseTo(7 * 4 * 2 * 0.25, 5); expect(lone).toBeCloseTo(7 * 4 * 2 * 0.15, 5);
    m.soulMult = 9; m.soulBase = 999; expect(loveHeal(m, bolt, 2)).toBe(a);
    // on a healing Outburst: each ally it reaches heals a quarter more
    const g = rig(); me(g).mg!.healMult = 10; ally(g).hp = 100;
    const d = give(me(g), {}); A(g, { type: 'combat/outburst', design: d, hold: true }); A(g, { type: 'combat/pump', feeling: 'love' }); A(g, { type: 'combat/release', aim: '4,5' });
    expect(ally(g).hp).toBe(100 + Math.floor(7 * 10 * 1.1) + Math.floor(7 * 10 * 1.1 * 0.25)); // 77 + 19
  });
  it('the class moves: Will Shield left (rules 1.31: the Chaplain\'s Ward); the Bard\'s Mend is Brimming (rules 1.33)', () => {
    expect(CLASS_MOVE_POOL['guardian.will_shield']).toBeUndefined();
    expect(CLASS_MOVE_POOL['bard.mend'].heal_base).toBeUndefined(); // a Tending overheal becomes a shield: test/tending.test.ts
  });
});

describe('rules 1.20: prayer', () => {
  const val = (e: any, op: string): number => { const f = (l: any[]): any => { for (const q of l || []) { if (q.op === op && typeof q.value === 'number') return q.value; const n = f(q.effects); if (n != null) return n; } return null; }; return f(e.effects); };
  const hymn = (p: string, id: string) => (FAITH_PATRON[p].hymns as any[]).find((h) => h.id === id);
  it('the bases', () => {
    const w = (id: string) => (WHISPERS as any[]).find((q) => q.id === id);
    expect(val(w('health'), 'heal')).toBe(5); expect(val(w('protection'), 'shield')).toBe(6);
    expect(val(hymn('mother_ember', 'warm_hands'), 'heal')).toBe(13); expect(val(hymn('nerukhan', 'saints_shield'), 'shield')).toBe(16); // rules 1.22: 13 and 16 (10 and 12 here), for a Hymn that waits on its cooldown
    expect(val(hymn('nerukhan', 'absolution'), 'heal')).toBe(9); /* rules 1.22: 9 (7) */ expect(val(hymn('mother_ember', 'hearthlight'), 'heal')).toBe(4); expect(val(hymn('toll_keeper', 'coin_for_the_ferry'), 'heal')).toBe(5);
    expect(val(FAITH_PATRON.mother_ember.miracle, 'shield')).toBe(17);
    expect(FAITH_PATRON.mother_ember.intervention.effects[0]).toMatchObject({ value: 10, per_devotion: 3 });
    for (const [h, s] of [[val(w('health'), 'heal'), val(w('protection'), 'shield')], [13, 16]]) expect(s / h).toBeCloseTo(1.2, 1); // a shield is 1.2 times the heal of the same cost
  });
});

describe('rules 1.20: the round limit is withdrawn (rules 1.23)', () => {
  it('spells and prayers restore what they restore: nothing is cut at half of max HP, round after round', () => {
    expect(MENDING.round_limit?.share_of_max_hp).toBeUndefined(); expect(MENDING.round_limit?.withdrawn).toMatch(/1\.23/);
    const f = rig(), t = ally(f); t.maxHp = 200; t.hp = 10;
    withGame(f.g, () => {
      expect(healUnit(f.cb, t, 70, me(f), 'soul')).toMatchObject({ restored: 70, limited: false });
      expect(healUnit(f.cb, t, 70, me(f), 'blessing')).toMatchObject({ restored: 70, limited: false }); expect(t.hp).toBe(150); // (rules 1.20: 30, at the limit)
      expect(healUnit(f.cb, t, 70, me(f), 'sigil')).toMatchObject({ restored: 50, limited: false }); expect(t.hp).toBe(200); // only max HP stops a heal
      t.hp = 10; expect(heal(t, 150, f.cb, me(f))).toMatch(/heals 150$/);
    });
  });
  it('a Downed ally gets up with the whole heal', () => {
    const f = rig(), t = ally(f); t.maxHp = 200; t.hp = 10;
    withGame(f.g, () => {
      healUnit(f.cb, t, 100, me(f), 'soul');
      t.hp = 0; t.downed = true; const r = healUnit(f.cb, t, 60, me(f), 'soul'); expect(r.revived).toBe(true); expect(t.hp).toBe(60); // (rules 1.20: 1 HP, the round's room being gone)
    });
  });
});

describe('rules 1.20: shields', () => {
  it('the bigger shield stands, whoever gave it; a point of shield is a point of HP', () => {
    const f = rig(), t = ally(f);
    withGame(f.g, () => { grantShield(f.cb, t, 30, me(f)); grantShield(f.cb, t, 20, me(f)); expect(t.shield).toBe(30); grantShield(f.cb, t, 45, f.pcs[1]); expect(t.shield).toBe(45); });
  });
});
