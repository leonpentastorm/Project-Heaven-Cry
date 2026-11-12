// The bug sweep of 12 Nov 2026 (spec section 14, items 1380 on): each test was written to fail on the code as it stood.
//   1. a bow's damage formula is read from weapons.json (the longbow dealt a flat 20)
//   2. an enemy's blast splash grows with its tier and level
//   3. the generic `heal` op honours `scale: healing_given`
//   4. an enemy technique goes at the target a plain attack would choose
//   8. a shield stops blasts, traps and hazards; not damage over time, not true damage
//   9. the Elite and Boss guard covers every action
import { describe, it, expect } from 'vitest';
import {
  WEAPON, WEAPONS, ENEMY, ENEMY_LEVELS, weaponDamage, damageFormula, resolveAttack, hurtUnit, applyDamage, grantShield, blast, damageObject, objectsOf,
  enemyStats, healingMult, harm, attackDamage, applyCond, condOn, endCond, phys, enemyPreference, BOSS_GUARD, unguarded, guardNextAction, pastShields, apply, type Unit,
} from '../src';
import { genericOf } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const put = (u: Unit, x: number, y: number) => { u.pos = x + ',' + y; };
/** A unit that can take anything: no armour, a lot of HP. */
const bag = (u: Unit, hp = 5000) => { u.armour = 0; u.maxHp = hp; u.hp = hp; u.shield = 0; return u; };

describe('1. a weapon whose damage is a formula reads it from the data', () => {
  it('the longbow deals 25 + 6 × Raw Power, the recurve bow 20 + 5 × Raw Power', () => {
    expect(weaponDamage(WEAPON.longbow, 6, 0)).toBe(25);
    expect(weaponDamage(WEAPON.longbow, 6, 4)).toBe(49);
    expect(weaponDamage(WEAPON.recurve_bow, 6, 4)).toBe(40);
  });
  it('every weapon whose damage is text is a formula the engine can read (none falls back to 20 unseen)', () => {
    const texts = WEAPONS.filter((w) => typeof w.damage === 'string');
    expect(texts.map((w) => w.id).sort()).toEqual(['longbow', 'recurve_bow']);
    for (const w of texts) { const f = damageFormula(w.damage); expect(f, w.id + ': ' + w.damage).not.toBeNull(); expect(weaponDamage(w, 3, 3)).toBe(f!.base + 3 * f!.perRawPower); }
    expect(damageFormula('lots')).toBeNull(); expect(damageFormula('30')).toEqual({ base: 30, perRawPower: 0 });
  });
  it('in a fight: a longbow in strong arms hits for its formula before armour', () => {
    const f = fightWith([{ weapon: 'longbow', skills: { raw_power: 4, dexterity: 4 } }], [{ tier: 'soldier', classic: true }]);
    const pc = f.pc, foe = bag(f.foe); put(pc, 3, 5); put(foe, 8, 5); pc.attack = 60;
    const who = f.g.characters[pc.charId!], d = withGame(f.g, () => attackDamage(f.cb, pc, foe, 'shot', who));
    expect(d.base).toBe(49); // 25 + 6 × 4, before the multipliers
    let r: any; withGame(f.g, () => { for (let i = 0; i < 6 && !(r && r.hit && !r.crit); i++) { foe.hp = foe.maxHp; pc.ap = 6; pc.ammo = 5; r = resolveAttack(f.cb, f.g.rng, pc, foe, 'shot', who); } });
    expect(r.hit).toBe(true); expect(r.damage).toBe(Math.max(1, Math.floor(d.total) - d.armour)); expect(r.damage).toBeGreaterThan(49);
  });
});

describe('2. an enemy\'s blast splash grows with its tier and level, as its direct hit does', () => {
  it('an Elite at level 12 with the thumper: the one beside its target takes 40 × the Elite\'s damage factor', () => {
    const f = fightWith([{ level: 12 }, { level: 12 }], [{ tier: 'elite', weapon: 'smetanita_thumper', level: 12 }]);
    const [a, b] = f.pcs, foe = f.foe; bag(a); bag(b); put(a, 3, 5); put(b, 3, 6); put(foe, 9, 5); foe.attack = 60; foe.ap = 6;
    const factor = enemyStats('elite', 12).damage; expect(factor).toBeGreaterThan(1); expect(foe.lvlDmg).toBe(factor);
    let r: any; withGame(f.g, () => { for (let i = 0; i < 6 && !(r && r.hit); i++) { b.hp = b.maxHp; foe.ap = 6; foe.ammo = 3; r = resolveAttack(f.cb, f.g.rng, foe, a, 'shot', null); } });
    expect(r.hit).toBe(true);
    expect(b.maxHp - b.hp).toBe(Math.floor(40 * factor));
  });
  it('a character\'s splash is the weapon\'s own number (no enemy factor)', () => {
    const f = fightWith([{ weapon: 'smetanita_thumper', level: 12 }], [{ tier: 'soldier', level: 12 }, { tier: 'soldier', level: 12 }]);
    const pc = f.pc, [x, y] = f.foes; bag(x); bag(y); put(pc, 3, 5); put(x, 9, 5); put(y, 9, 6); pc.attack = 60;
    let r: any; withGame(f.g, () => { for (let i = 0; i < 6 && !(r && r.hit); i++) { y.hp = y.maxHp; pc.ap = 6; pc.ammo = 3; r = resolveAttack(f.cb, f.g.rng, pc, x, 'shot', f.g.characters[pc.charId!]); } });
    expect(r.hit).toBe(true); expect(y.maxHp - y.hp).toBe(40);
  });
});

describe('3. the generic heal op honours its scale', () => {
  it('scale: healing_given multiplies by the healer\'s Healing given; no scale does not', () => {
    const f = fightWith([{ skills: { empathy: 5 }, attrs: { insight: 5 } }, {}], [{}]);
    const [me, ally] = f.pcs, c = f.g.characters[me.charId!], hg = healingMult(c); expect(hg).toBeGreaterThan(1.5);
    const op = genericOf('heal')!, h: any = { cb: f.cb, u: me, c, g: f.g, info: { name: 'Test heal' } };
    bag(ally, 1000); ally.healRecv = 1;
    withGame(f.g, () => {
      ally.hp = 100; op.run!(h, { op: 'heal', value: 10, target: 'ally' }, { targetId: ally.id }, f.g.rng); expect(ally.hp).toBe(110);
      ally.hp = 100; op.run!(h, { op: 'heal', value: 10, target: 'ally', scale: 'healing_given' }, { targetId: ally.id }, f.g.rng); expect(ally.hp).toBe(100 + Math.floor(10 * hg));
      ally.hp = 100; op.run!(h, { op: 'heal', value: 10, target: 'ally', scale: 'healing_given*ambient_healing' }, { targetId: ally.id }, f.g.rng); expect(ally.hp).toBe(100 + Math.floor(10 * hg));
    });
  });
});

describe('4. an enemy technique goes at the target a plain attack would choose', () => {
  const setup = () => {
    const f = fightWith([{ level: 6 }, { level: 6 }, { level: 6 }], [{ tier: 'soldier', weapon: 'hellraiser_service_rifle', level: 6 }]);
    const [a, b, c] = f.pcs, foe = f.foe;
    put(a, 3, 3); put(b, 3, 5); put(c, 3, 7); put(foe, 10, 5); for (const p of [a, b, c]) { p.hidden = false; }
    f.turn(foe);
    return { f, a: f.pcs[0], b: f.pcs[1], c: f.pcs[2], foe: f.foe };
  };
  const pick = (f: F, foe: Unit) => withGame(f.g, () => phys.aiTechnique(f.cb, foe));
  it('the most hurt, not the first in the fight\'s list', () => {
    const { f, a, c, foe } = setup(); c.hp = Math.floor(c.maxHp / 3);
    const p = pick(f, foe); expect(p, 'a Soldier with a rifle has a technique it wants').not.toBeNull();
    expect(p!.target?.id).toBe(c.id); expect(p!.target?.id).not.toBe(a.id);
    expect(withGame(f.g, () => enemyPreference(f.cb, foe, f.pcs).order[0].id)).toBe(c.id);
  });
  it('its Taunter before the most hurt', () => {
    const { f, b, c, foe } = setup(); c.hp = Math.floor(c.maxHp / 3);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, b, foe, 'taunted', 2, undefined, { skipSave: true })); expect(condOn(foe, 'taunted')).toBe(true);
    expect(withGame(f.g, () => enemyPreference(f.cb, foe, f.pcs).order[0].id)).toBe(b.id);
    expect(pick(f, foe)!.target?.id).toBe(b.id);
  });
  it('the squad\'s healer by the tier\'s weight (rules 1.23), as a plain attack weighs it', () => {
    const { f, a, b, c, foe } = setup(); a.hp = a.maxHp - 5;
    withGame(f.g, () => { c.hp = Math.floor(c.maxHp / 2); grantShield(f.cb, b, 40, c); c.hp = c.maxHp; }); // c has shielded an ally: it is the healer
    const pref = withGame(f.g, () => enemyPreference(f.cb, foe, f.pcs));
    expect(pref.healer?.id).toBe(c.id); expect(pref.order[0].id).toBe(c.id);
    const p = pick(f, foe)!; expect(p.target?.id).toBe(c.id); expect(p.why).toBe('healer');
  });
});

describe('8. a shield stops blasts, traps and hazards; not damage over time, not true damage', () => {
  const one = () => { const f = fightWith([{}, {}], [{ classic: true }]); const u = bag(f.pc, 200); u.shield = 30; return { f, u }; };
  it('a blast with nobody behind it (a barrel), a trap and a hazard meet the shield first', () => {
    for (const why of ['explosion', 'trap', 'hazard', 'thrown', 'weapon']) {
      const { f, u } = one(); let line = '';
      withGame(f.g, () => { line = hurtUnit(u, 20, true, f.cb, why); });
      expect(u.shield, why).toBe(10); expect(u.hp, why).toBe(200); expect(line, why).toMatch(/shield takes it/);
      withGame(f.g, () => { line = hurtUnit(u, 25, true, f.cb, why); });
      expect(u.shield, why).toBe(0); expect(u.hp, why).toBe(185); expect(line, why).toMatch(/takes 15 \(10 on the shield\)/);
      expect((f.cb.fx || []).some((e: any) => e.k === 'shield' && e.target === u.id), why + ': the shield\'s own effect is shown').toBe(true);
    }
  });
  it('a grenade thrown by an enemy: the shield takes it', () => {
    const { f, u } = one(); put(u, 3, 5); put(f.pcs[1], 12, 1);
    withGame(f.g, () => blast(f.cb, f.g.rng, f.foe, '3,5', 'frag_grenade'));
    expect(u.shield).toBe(0); expect(u.hp).toBe(200 - (40 - 30));
  });
  it('a barrel going up next to you: the shield takes it', () => {
    const { f, u } = one(); const barrel = objectsOf(f.cb).find((o) => o.kind === 'barrel');
    if (!barrel) { f.cb.objects!.push({ id: 'tb', kind: 'barrel', name: 'Barrel', pos: '5,5', hp: 1, max: 20 } as any); }
    const b = objectsOf(f.cb).find((o) => o.kind === 'barrel')!; b.hp = 1; const [bx, by] = b.pos.split(',').map(Number); put(u, bx + 1, by);
    for (const v of f.cb.units) if (v !== u) put(v, (bx + 8) % 16, (by + 5) % 11);
    withGame(f.g, () => damageObject(f.cb, b.pos, 50));
    expect(u.shield).toBe(0); expect(u.hp).toBe(200 - (40 - 30));
  });
  it('damage over time goes past it: Bleeding, Burning, Corroded', () => {
    const { f, u } = one();
    withGame(f.g, () => applyDamage(f.cb, u, 5, { type: 'bleed', by: null, shield: true, credit: 'hp' } as any));
    expect(u.shield).toBe(30); expect(u.hp).toBe(195);
    withGame(f.g, () => applyCond(f.cb, f.g.rng, null, u, 'burning', undefined, 'body', { skipSave: true })); expect(condOn(u, 'burning')).toBe(true);
    f.turn(u); // the tick at the start of its turn
    expect(u.shield, 'Burning').toBe(30); expect(u.hp, 'Burning: 10 at the start of the turn').toBe(185);
    endCond(u, 'burning'); withGame(f.g, () => applyCond(f.cb, f.g.rng, null, u, 'corroded', 3, 'body', { skipSave: true })); expect(condOn(u, 'corroded')).toBe(true);
    f.turn(u);
    expect(u.shield, 'Corroded').toBe(30); expect(u.hp, 'Corroded: 5 at the start of the turn').toBe(180);
  });
  it('true damage goes past it; Soul and Sigil damage do not', () => {
    const { f, u } = one();
    withGame(f.g, () => harm(f.cb, f.g.rng, null, u, 12, 'true'));
    expect(u.shield).toBe(30); expect(u.hp).toBe(188);
    withGame(f.g, () => harm(f.cb, f.g.rng, f.foe, u, 12, 'soul'));
    expect(u.shield).toBe(18); expect(u.hp).toBe(188);
    expect(pastShields({ type: 'weapon' })).toBe(false); expect(pastShields({ type: 'explosion' })).toBe(false); expect(pastShields({ type: 'overload', dmgType: 'true' })).toBe(true);
  });
});

describe('9. the Elite and Boss guard covers every action', () => {
  const big = 99999;
  const duel = (tier: string, lv: number, foeLv: number) => { const f = fightWith([{ level: lv }, { level: lv }], [{ tier, level: foeLv }, { tier: 'soldier', level: foeLv }]); return { f, pc: f.pc, foe: f.foes[0] }; };
  const KINDS: Record<string, any> = {
    'a weapon': { type: 'weapon', ranged: true, shield: true, credit: 'all' }, 'an Outburst': { type: 'soul', dmgType: 'soul', shield: true, credit: 'hp' },
    'a spell': { type: 'elemental', dmgType: 'fire', spell: true, shield: true, credit: 'hp' }, 'a prayer': { type: 'soul', dmgType: 'soul', shield: true, credit: 'hp' },
    'a class move': { type: 'physical', shield: true, credit: 'all' }, 'a blast': { type: 'explosion', explosive: true, shield: true, credit: 'hp' },
  };
  it('the data holds it: Elite and Boss, left on 1 HP', () => {
    expect((ENEMY_LEVELS.gap as any).full_hp_guard).toMatchObject({ tiers: ['elite', 'boss'], hp: 1 }); expect(BOSS_GUARD).toMatchObject({ tiers: ['elite', 'boss'], hp: 1 });
  });
  for (const tier of ['elite', 'boss']) for (const [what, src] of Object.entries(KINDS)) it(what + ' never takes a full-HP ' + tier + ' of the character\'s level from full to nothing', () => {
    const { f, pc, foe } = duel(tier, 6, 6);
    const r = withGame(f.g, () => applyDamage(f.cb, foe, big, { ...src, by: pc }));
    expect(foe.hp).toBe(1); expect(foe.dead).toBeFalsy(); expect(r.killed).toBe(false);
    expect(f.cb.log.join('\n')).toMatch(/left on 1 HP/);
    // the same action's other rolls and jumps are held too
    withGame(f.g, () => applyDamage(f.cb, foe, big, { ...src, by: pc }));
    expect(foe.hp).toBe(1);
    // the next action finishes it
    withGame(f.g, () => { guardNextAction(); applyDamage(f.cb, foe, big, { ...src, by: pc }); });
    expect(foe.dead).toBe(true);
  });
  it('hurtUnit\'s blast credited to a character is held too', () => {
    const { f, pc, foe } = duel('elite', 6, 6); foe.armour = 0;
    withGame(f.g, () => hurtUnit(foe, big, true, f.cb, 'explosion', pc));
    expect(foe.hp).toBe(1);
  });
  it('a real shot: a rifle hit for far more than its HP leaves an equal-level Elite on 1 HP; the next action is a new one', () => {
    const f = fightWith([{ level: 6, weapon: 'hellraiser_service_rifle' }], [{ tier: 'elite', level: 6 }]);
    const pc = f.pc, foe = f.foe; put(pc, 3, 5); put(foe, 8, 5); pc.attack = 60; pc.dmgMult = 500; foe.def = 1;
    f.turn(pc); f.pc.attack = 60; f.pc.dmgMult = 500; f.foe.def = 1; put(f.pc, 3, 5); put(f.foe, 8, 5);
    for (let i = 0; i < 3 && f.foe.hp >= f.foe.maxHp; i++) { f.pc.ap = 6; f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any); f.pc.attack = 60; f.pc.dmgMult = 500; }
    expect(f.foe.hp).toBe(1); expect(f.foe.dead).toBeFalsy();
    for (let i = 0; i < 3 && !f.foe.dead; i++) { f.pc.ap = 6; f.pc.attack = 60; f.pc.dmgMult = 500; f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any); }
    expect(f.foe.dead).toBe(true);
  });
  it('no guard: an Elite already hurt, one below the character\'s level, a Soldier, a Minion', () => {
    { const { f, pc, foe } = duel('elite', 6, 6); foe.hp = foe.maxHp - 1; withGame(f.g, () => applyDamage(f.cb, foe, big, { ...KINDS['a weapon'], by: pc })); expect(foe.dead).toBe(true); }
    { const { f, pc, foe } = duel('elite', 8, 6); withGame(f.g, () => applyDamage(f.cb, foe, big, { ...KINDS['a weapon'], by: pc })); expect(foe.dead).toBe(true); }
    { const { f, pc, foe } = duel('boss', 6, 9); withGame(f.g, () => applyDamage(f.cb, foe, big, { ...KINDS['a weapon'], by: pc })); expect(foe.hp, 'a Boss above the character\'s level is held').toBe(1); }
    for (const tier of ['soldier', 'minion']) { const { f, pc, foe } = duel(tier, 6, 6); withGame(f.g, () => applyDamage(f.cb, foe, big, { ...KINDS['a weapon'], by: pc })); expect(foe.dead, tier).toBe(true); }
  });
  it('no guard: damage with nobody behind it, a trap, a hazard, an enemy\'s own side, and what is run unguarded (a Miracle, a field, a turret)', () => {
    { const { f, foe } = duel('elite', 6, 6); withGame(f.g, () => applyDamage(f.cb, foe, big, { type: 'explosion', by: null, shield: true, credit: 'hp' })); expect(foe.dead).toBe(true); }
    for (const why of ['trap', 'hazard']) { const { f, pc, foe } = duel('elite', 6, 6); withGame(f.g, () => hurtUnit(foe, big, true, f.cb, why, pc)); expect(foe.dead, why).toBe(true); }
    { const { f, foe } = duel('elite', 6, 6); const other = f.foes[1]; withGame(f.g, () => applyDamage(f.cb, foe, big, { ...KINDS['a weapon'], by: other })); expect(foe.dead).toBe(true); }
    { const { f, pc, foe } = duel('boss', 6, 6); withGame(f.g, () => unguarded(() => applyDamage(f.cb, foe, big, { ...KINDS['a prayer'], by: pc }))); expect(foe.dead).toBe(true); }
  });
  it('two characters in one step each get their own action: the second finishes what the first left on 1 HP', () => {
    const { f, pc, foe } = duel('elite', 6, 6), other = f.pcs[1];
    withGame(f.g, () => { applyDamage(f.cb, foe, big, { ...KINDS['a weapon'], by: pc }); expect(foe.hp).toBe(1); applyDamage(f.cb, foe, big, { ...KINDS['a weapon'], by: other }); });
    expect(foe.dead).toBe(true);
  });
  void ENEMY; void apply;
});
