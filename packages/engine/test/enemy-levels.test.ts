// Rules 1.15 (balance pass, step 1), from the spec's sentences: every enemy has a level; the table; a fight's level from
// its squad, a set level, the clamp; a fight saved before the rule keeps its numbers; Vermin; the level gap; criticals
// at ×1.5 and never past ×2.0, for characters and enemies; companions; the Proving Ground's spawn.
import { describe, expect, it } from 'vitest';
import {
  ENEMY, ENEMIES, ENEMY_LEVELS, enemyStats, clampEnemyLevel, fightLevelOf, fightLevel, levelGap, squadLevel, LOOT, SANDBOX_TIERS,
  critMult, CRIT_BASE, CRIT_MAX, attackDamage, previewAttack, resolveAttack, applyDamage, apply, newGame, ARCHETYPES, npcsOf, COMBAT_XP, combatXp, d20,
  type Unit, type GameState, type Sheet,
} from '../src';
import { fightWith, storyWith, withGame, CLASSIC } from './helpers/perkfight';

const rngFor = (want: number) => { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === want) return { state: s }; } throw new Error('no seed'); };

describe('the table (enemies.json: a tier\'s level 1 row raised by its level\'s row)', () => {
  it('five tiers, weakest first, each with its level 1 numbers and a damage factor; all provisional', () => {
    expect(ENEMIES.map((e) => e.id)).toEqual(['vermin', 'minion', 'soldier', 'elite', 'boss']);
    const row = (id: string) => { const t = ENEMY[id]; return [t.hp, t.armour, t.defense, t.attack_bonus, t.damage]; };
    expect(row('vermin')).toEqual([15, 0, 10, 0, 0.5]);
    expect(row('minion')).toEqual([70, 0, 10, 1, 1]);
    expect(row('soldier')).toEqual([140, 5, 11, 3, 0.78]);
    expect(row('elite')).toEqual([240, 10, 12, 5, 1.05]);
    expect(row('boss')).toEqual([960, 10, 13, 6, 1.2]);
    expect(ENEMIES.every((e: any) => e.provisional === true)).toBe(true); expect((ENEMY_LEVELS as any).provisional).toBe(true);
  });
  it('one row for each level 1 to 20; level 1 changes nothing', () => {
    expect(ENEMY_LEVELS.table.map((r) => r.level)).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
    expect(ENEMY_LEVELS.table[0]).toMatchObject({ hp_mult: 1, armour_mult: 1, defense_plus: 0, attack_plus: 0, damage_mult: 1 });
    for (const t of ENEMIES) expect(enemyStats(t.id, 1)).toMatchObject({ level: 1, hp: t.hp, armour: t.armour, defense: t.defense, attack_bonus: t.attack_bonus, damage: t.damage });
  });
  it('a Soldier at levels 1, 3, 6, 9, 12 and 20 (the spec\'s working table)', () => {
    const at = (l: number) => { const s = enemyStats('soldier', l); return [s.hp, s.armour, s.defense, s.attack_bonus]; };
    expect(at(1)).toEqual([140, 5, 11, 3]);
    expect(at(3)).toEqual([162, 5, 12, 3]);
    expect(at(6)).toEqual([193, 6, 13, 4]);
    expect(at(9)).toEqual([216, 7, 15, 4]);
    expect(at(12)).toEqual([244, 8, 16, 5]);
    expect(at(20)).toEqual([253, 8, 17, 9]);
    expect(enemyStats('soldier', 20).damage).toBeCloseTo(0.78 * 1.82, 3);
  });
  it('the other tiers at the top: HP ×1.81, armour ×1.60, Defense +6, attack +6, damage ×1.82', () => {
    expect(enemyStats('vermin', 20)).toMatchObject({ hp: 27, armour: 0, defense: 16, attack_bonus: 6 });
    expect(enemyStats('minion', 20)).toMatchObject({ hp: 127, armour: 0, defense: 16, attack_bonus: 7 });
    expect(enemyStats('elite', 12)).toMatchObject({ hp: 418, armour: 16, defense: 17, attack_bonus: 7 });
    expect(enemyStats('boss', 20)).toMatchObject({ hp: 1738, armour: 16, defense: 19, attack_bonus: 12 });
    expect(enemyStats('boss', 20).damage).toBeCloseTo(1.2 * 1.82, 3);
  });
  it('a level is held between 1 and 20, whole', () => {
    expect([clampEnemyLevel(0), clampEnemyLevel(-4), clampEnemyLevel(99), clampEnemyLevel(7.9), clampEnemyLevel('x'), clampEnemyLevel(undefined)]).toEqual([1, 1, 20, 7, 1, 1]);
    expect(enemyStats('soldier', 99)).toEqual(enemyStats('soldier', 20)); expect(enemyStats('soldier', 0)).toEqual(enemyStats('soldier', 1));
    expect(enemyStats('no_such_tier', 1).hp).toBe(ENEMY.minion.hp);
  });
});

describe('a fight has a level', () => {
  it('the average level of the characters in it, rounded down', () => {
    expect(fightLevelOf([3, 6])).toBe(4); expect(fightLevelOf([1, 1, 1, 2])).toBe(1); expect(fightLevelOf([20, 20])).toBe(20); expect(fightLevelOf([])).toBe(1);
    const f = fightWith([{ level: 3 }, { level: 6 }], [{}, { tier: 'elite' }]);
    expect(f.cb.level).toBe(4); expect(squadLevel(f.g)).toBe(4);
    expect(f.foes.map((u) => u.level)).toEqual([4, 4]);
    expect(f.foes[0]).toMatchObject({ maxHp: enemyStats('soldier', 4).hp, def: 12, armour: 6, attack: 3 });
    expect(f.foes[1].maxHp).toBe(enemyStats('elite', 4).hp);
    expect(f.pcs.map((u) => u.level)).toEqual([3, 6]);
  });
  it('a set level wins over the squad\'s; one enemy may have its own; both are held to 1 to 20', () => {
    const f = fightWith([{ level: 2 }], [{}, { level: 14 }, { level: 99 }, { level: 0 }], { level: 9 });
    expect(f.cb.level).toBe(9);
    expect(f.foes.map((u) => u.level)).toEqual([9, 14, 20, 1]);
    expect(f.foes[0].maxHp).toBe(216); expect(f.foes[1].def).toBe(17); expect(f.foes[2].maxHp).toBe(253); expect(f.foes[3].maxHp).toBe(140);
    expect(fightWith([{ level: 2 }], [{}], { level: 40 }).cb.level).toBe(20);
    expect(fightWith([{ level: 2 }], [{}], { level: -3 }).cb.level).toBe(1);
  });
  it('the Narrator\'s shift is −3 to +2 on the squad\'s level, and never leaves 1 to 20', () => {
    const chars = [{ level: 6 }, { level: 6 }];
    expect(fightLevel(chars)).toBe(6);
    expect([fightLevel(chars, { shift: 2 }), fightLevel(chars, { shift: 9 }), fightLevel(chars, { shift: -3 }), fightLevel(chars, { shift: -9 })]).toEqual([8, 8, 3, 3]);
    expect(fightLevel([{ level: 1 }], { shift: -3 })).toBe(1); expect(fightLevel([{ level: 20 }], { shift: 2 })).toBe(20);
    expect(ENEMY_LEVELS.narrator_shift).toEqual({ min: -3, max: 2 });
    const s = storyWith([{ level: 6 }]);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Deadly', map: 'yard', difficulty: 'hard', level_shift: 2, enemies: [{ name: 'Raider', tier: 'soldier', weapon: 'service_pistol' }] } } } as any);
    expect(s.g.combat!.level).toBe(8); expect(s.g.combat!.units.find((u) => u.side === 'foe')!.level).toBe(8);
  });
  it('XP for a fight is unchanged: by difficulty, whatever the level', () => {
    expect(COMBAT_XP).toEqual({ easy: 25, standard: 50, hard: 100, boss: 200 });
    expect(combatXp(fightWith([{ level: 12 }], [{}], { level: 14 }).cb)).toBe(50);
  });
  it('an enemy deals its weapon\'s damage × its tier\'s factor × its level\'s factor', () => {
    const dmg = (level: number, tier = 'soldier') => { const f = fightWith([{}], [{ tier, weapon: 'hellraiser_service_rifle' }], { level }); return withGame(f.g, () => attackDamage(f.cb, f.foe, f.pc, 'shot', null, { preview: true })); };
    const l1 = dmg(1), l20 = dmg(20);
    expect(l1.base).toBe(30); expect(l1.mults.find((m) => m.label === 'tier and level')!.v).toBeCloseTo(0.78, 3); expect(l1.total).toBeCloseTo(23.4, 3);
    expect(l20.total).toBeCloseTo(42.6, 2); // 30 × 0.78 × 1.82, the factor held to three places (×1.42)
    expect(dmg(1, 'minion').mults.some((m) => m.label === 'tier and level')).toBe(false); // ×1.0: its weapon's own damage
    expect(dmg(1, 'boss').total).toBeCloseTo(36, 3);
  });
});

describe('a fight saved before the rule keeps the numbers its units have', () => {
  it('a unit with no level stays as it is, deals plain weapon damage and stands outside the level gap', () => {
    const f = fightWith([{ level: 12 }], [{ weapon: 'hellraiser_service_rifle' }]);
    // the save: the old Soldier's numbers, no level on anyone
    const old: GameState = JSON.parse(JSON.stringify(f.g));
    for (const u of old.combat!.units) { delete u.level; delete u.lvlDmg; if (u.side === 'foe') Object.assign(u, { hp: 60, maxHp: 60, def: 12, armour: 5, attack: 3 }); }
    delete old.combat!.level;
    const pc = old.combat!.units.find((u) => u.side === 'pc')!, foe = old.combat!.units.find((u) => u.side === 'foe')!;
    old.combat!.turn = old.combat!.order.indexOf(pc.id); delete old.combat!.window; pc.ap = 6; pc.pos = '3,5'; foe.pos = '7,5';
    const g = apply(old, { type: 'combat/end-turn', unitId: pc.id } as any, 'host'); // the save loads and plays on
    const after = g.combat!.units.find((u) => u.side === 'foe')!;
    expect(after).toMatchObject({ maxHp: 60, def: 12, armour: 5, attack: 3 }); expect(after.level).toBeUndefined(); expect(g.combat!.level).toBeUndefined();
    const cb = g.combat!, p2 = cb.units.find((u) => u.side === 'pc')!;
    withGame(g, () => {
      const d = attackDamage(cb, after, p2, 'shot', null, { preview: true });
      expect(d.total).toBe(30); expect(d.mults.some((m) => /level/.test(m.label))).toBe(false);
      expect(levelGap(p2, after)).toBe(0);
      expect((previewAttack(cb, p2, after, 'shot').terms || []).some((t) => t.label === 'level gap')).toBe(false);
    });
  });
  it('the test helper\'s classic foes are such units: the old fixed numbers at any level', () => {
    const f = fightWith([{ level: 15 }], [{}, { tier: 'boss' }], { classic: true });
    expect(f.foes[0]).toMatchObject({ maxHp: CLASSIC.soldier.hp, def: 12, armour: 5, attack: 3 }); expect(f.foes[1].maxHp).toBe(200);
    expect(f.foes.every((u) => u.level === undefined && u.lvlDmg === undefined)).toBe(true);
  });
});

describe('Vermin: a tier under Minion', () => {
  it('15 HP, no armour, weak attacks, fast; no techniques, no Calls, no spare magazines, nothing from the drop tables', () => {
    const v: any = ENEMY.vermin;
    expect(v).toMatchObject({ name: 'Vermin', hp: 15, armour: 0, damage: 0.5, movement: 2, spare_mags: 0, calls: [], call_level: 0, techniques: { melee: [], ranged: [] } });
    expect(LOOT.rolls_by_tier.vermin).toBe(0);
    expect(SANDBOX_TIERS.vermin.weapons.length).toBeGreaterThan(0);
  });
  it('a fight takes it; one hit kills one at equal level', () => {
    for (const level of [1, 9, 20]) {
      const f = fightWith([{ level, weapon: 'hellraiser_service_rifle' }], [{ tier: 'vermin', weapon: 'beast_bite', at: 'H6' }, { tier: 'vermin', weapon: 'beast_bite' }]);
      expect(f.foes.every((u) => u.tier === 'vermin' && u.level === level && !u.techs && !u.calls)).toBe(true);
      const pc = f.turn(f.pc), foe = f.foe; pc.pos = '3,5'; foe.pos = '7,5';
      const r = withGame(f.g, () => resolveAttack(f.cb, rngFor(15), pc, foe, 'shot', null, { free: true }));
      expect(r.hit).toBe(true); expect(r.crit).toBe(false); expect(r.killed).toBe(true);
    }
  });
  it('the Narrator may place one, and the Proving Ground may spawn one', () => {
    const s = storyWith([{}]);
    s.act({ type: 'narrator/turn', turn: { narration: 'They pour out of the vent.', combat: { name: 'Swarm', map: 'yard', difficulty: 'easy', enemies: Array.from({ length: 6 }, (_, i) => ({ name: 'Vent mite ' + (i + 1), tier: 'vermin', weapon: 'beast_bite' })) } } } as any);
    expect(s.g.combat!.units.filter((u) => u.tier === 'vermin').length).toBe(6);
  });
});

describe('the level gap', () => {
  it('+1 to hit for the higher and −1 for the lower, a level, to 5 levels; nothing at equal level or between characters', () => {
    const terms = (pcLevel: number, foeLevel: number) => { const f = fightWith([{ level: pcLevel }, { level: pcLevel }], [{ weapon: 'hellraiser_service_rifle' }], { level: foeLevel }); const [a, b] = f.pcs; a.pos = '3,5'; b.pos = '3,7'; f.foe.pos = '7,5'; f.cb.objects = [];
      return withGame(f.g, () => { const gap = (x: Unit, y: Unit) => (previewAttack(f.cb, x, y, 'shot', { free: true }).terms || []).find((t) => t.label === 'level gap')?.v ?? 0; return [gap(a, f.foe), gap(f.foe, a), gap(a, b)]; }); };
    expect(terms(6, 6)).toEqual([0, 0, 0]);
    expect(terms(6, 9)).toEqual([-3, 3, 0]);
    expect(terms(6, 4)).toEqual([2, -2, 0]);
    expect(terms(1, 20)).toEqual([-5, 5, 0]); // never more than 5
    expect(ENEMY_LEVELS.gap).toMatchObject({ to_hit_per_level: 1, max_levels: 5, one_hit_levels_below: 5 });
  });
  it('far below: an enemy 5 or more levels below the character who hurts it is taken out by that hit; 4 below is not', () => {
    const hit = (pcLevel: number, foeLevel: number, tier = 'soldier') => { const f = fightWith([{ level: pcLevel }], [{ tier }], { level: foeLevel }); const foe = f.foe;
      withGame(f.g, () => applyDamage(f.cb, foe, 12, { by: f.pc, type: 'weapon', shield: true, credit: 'all' } as any)); return { hp: foe.hp, max: foe.maxHp, dead: foe.dead }; };
    expect(hit(10, 5)).toMatchObject({ hp: 0, dead: true });
    expect(hit(20, 1, 'minion')).toMatchObject({ hp: 0, dead: true });
    // an Elite and a Boss are never taken out by the gap: they lose the 12 and fight on
    for (const tier of ['elite', 'boss']) { const r = hit(20, 1, tier); expect(r.dead).toBe(false); expect(r.hp).toBe(r.max - 12); }
    const near = hit(10, 6); expect(near.hp).toBe(near.max - 12); expect(near.dead).toBe(false);
    // the other way round it is only the to-hit line: a character far below an enemy is not taken out by one hit
    const f = fightWith([{ level: 1 }], [{}], { level: 12 }), hp = f.pc.hp;
    withGame(f.g, () => applyDamage(f.cb, f.pc, 12, { by: f.foe, type: 'weapon', shield: true, credit: 'all' } as any));
    expect(f.pc.hp).toBe(hp - 12);
  });
});

describe('critical hits: ×1.5, to ×2.0 at most', () => {
  const sheet = (attrs: Record<string, number>, skills: Record<string, number>, traits: string[] = []) => fightWith([{ attrs, skills, traits, weapon: 'hellraiser_service_rifle' }], [{ at: 'J6' }], { classic: true });
  it('the floor: Perception 1 and no Dexterity is ×1.5; each point of Perception above 1 is +3%, each point of Dexterity +2%', () => {
    expect([CRIT_BASE, CRIT_MAX]).toEqual([1.5, 2]);
    const cm = (per: number, dex: number) => { const f = sheet({ perception: per }, { dexterity: dex }); return withGame(f.g, () => critMult(f.g.characters[f.pc.charId!])); };
    expect(cm(1, 0)).toBe(1.5);
    expect(cm(3, 4)).toBeCloseTo(1.64, 6); // the baseline's rifleman at level 1 (it was 2.4)
    expect(cm(5, 10)).toBeCloseTo(1.82, 6); // and at level 20 (it was 2.9)
    expect(cm(10, 10)).toBeCloseTo(1.97, 6);
  });
  it('the ceiling: Perception 10, Dexterity 10 and Breath Held together are ×2.0, not ×2.22', () => {
    const f = sheet({ perception: 10 }, { dexterity: 10 }, ['one_shot']); const pc = f.turn(f.pc), foe = f.foe; pc.pos = '3,5'; foe.pos = '7,5'; foe.hp = foe.maxHp = 9999; foe.armour = 0; foe.critTaken = 0;
    const plain = withGame(f.g, () => attackDamage(f.cb, pc, foe, 'shot', f.g.characters[pc.charId!], {})).total;
    f.g.rng.state = rngFor(20).state;
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: foe.id, mode: 'shot' } as any);
    const lost = 9999 - f.foe.hp;
    expect(lost / plain).toBeGreaterThan(1.98); expect(lost / plain).toBeLessThanOrEqual(2.0001);
  });
  it('a low sheet with Breath Held: +25% on the critical (×1.5 → ×1.75)', () => {
    const f = sheet({ perception: 1 }, { dexterity: 0 }, ['one_shot']); const pc = f.turn(f.pc), foe = f.foe; pc.pos = '3,5'; foe.pos = '7,5'; foe.hp = foe.maxHp = 9999; foe.armour = 0; foe.critTaken = 0;
    const plain = withGame(f.g, () => attackDamage(f.cb, pc, foe, 'shot', f.g.characters[pc.charId!], {})).total;
    f.g.rng.state = rngFor(20).state;
    f.act({ type: 'combat/attack', unitId: pc.id, targetId: foe.id, mode: 'shot' } as any);
    expect((9999 - f.foe.hp) / plain).toBeGreaterThan(1.72); expect((9999 - f.foe.hp) / plain).toBeLessThanOrEqual(1.7501);
  });
  it('an enemy\'s critical is ×1.5 (it was ×2), less the target\'s Critical damage taken', () => {
    const f = fightWith([{}], [{ weapon: 'hellraiser_service_rifle' }]); const pc = f.pc, foe = f.foe;
    const crit = (taken: number) => { pc.critTaken = taken; return withGame(f.g, () => { const d = attackDamage(f.cb, foe, pc, 'shot', null, { crit: true }); return d.mults.find((m) => m.label === 'critical')!.v; }); };
    expect(crit(0)).toBe(1.5); expect(crit(0.5)).toBe(1.25);
  });
});

describe('companions are their owner\'s level', () => {
  const sheetFrom = (name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === 'sharpshooter')!; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
  const droneAt = (level: number, hp?: number) => {
    let g = newGame('LV' + level, { id: 'host', name: 'Host' });
    g = apply(g, { type: 'char/add', sheet: sheetFrom('Handler') }, 'host');
    const c = Object.values(g.characters)[0]; c.level = level; c.companions = [{ id: 'd1', kind: 'drone', name: 'Bolt', ...(hp != null ? { hp } : {}) } as any];
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Go.', sceneTitle: 'Test' } }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'minion', weapon: 'fists' }] } } } as any, 'host');
    return g.combat!.units.find((u) => u.companion === 'drone')!;
  };
  it('the drone\'s own block is its level 1 block; the level table raises it', () => {
    expect(droneAt(1)).toMatchObject({ level: 1, maxHp: 30, hp: 30, def: 12, armour: 5, attack: 3, lvlDmg: 1 });
    expect(droneAt(20)).toMatchObject({ level: 20, maxHp: 54, hp: 54, def: 18, armour: 8, attack: 9, lvlDmg: 1.82 });
  });
  it('the HP it carried from before is kept, never raised by the table', () => {
    expect(droneAt(20, 20)).toMatchObject({ maxHp: 54, hp: 20 });
  });
});

describe('the Proving Ground', () => {
  const sheetFrom = (name: string): Sheet => { const a = ARCHETYPES.find((x) => x.id === 'sharpshooter')!; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; };
  const open = (level: number) => {
    let g = newGame('PG' + level, { id: 'h1', name: 'Host' }, 'seed-levels');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('Vel') }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1');
    const c = Object.values(g.characters)[0];
    if (level > 1) g = apply(g, { type: 'sandbox/level', charId: c.id, level } as any, 'h1');
    return g;
  };
  it('a wave is the squad\'s level', () => {
    const g = apply(open(7), { type: 'sandbox/fight' } as any, 'h1');
    expect(g.combat!.level).toBe(7);
    const foes = g.combat!.units.filter((u) => u.side === 'foe'); expect(foes.length).toBeGreaterThan(0);
    for (const u of foes) { expect(u.level).toBe(7); expect(u.maxHp).toBe(enemyStats(u.tier!, 7).hp); }
  });
  it('the spawn tool: the squad\'s level when none is given, its own level when one is, held to 1 to 20; Vermin too', () => {
    let g = open(7);
    g = apply(g, { type: 'sandbox/clear' } as any, 'h1');
    g = apply(g, { type: 'sandbox/spawn', tier: 'soldier', weapon: 'sabre', at: 'H6' } as any, 'h1');
    g = apply(g, { type: 'sandbox/spawn', tier: 'elite', weapon: 'sabre', at: 'H7', level: 12 } as any, 'h1');
    g = apply(g, { type: 'sandbox/spawn', tier: 'vermin', weapon: 'beast_bite', at: 'H8', level: 99 } as any, 'h1');
    expect(npcsOf(g).map((n) => n.level)).toEqual([undefined, 12, 20]);
    expect(() => apply(g, { type: 'sandbox/spawn', tier: 'giant', weapon: 'sabre', at: 'H9' } as any, 'h1')).toThrow(/vermin, minion, soldier, elite or boss/);
    g = apply(g, { type: 'sandbox/fight' } as any, 'h1');
    const by = (tier: string) => g.combat!.units.find((u) => u.tier === tier)!;
    expect(by('soldier')).toMatchObject({ level: 7, maxHp: enemyStats('soldier', 7).hp });
    expect(by('elite')).toMatchObject({ level: 12, maxHp: 418 });
    expect(by('vermin')).toMatchObject({ level: 20, maxHp: 27 });
    // into a running fight
    g = apply(g, { type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: 'B2' } as any, 'h1');
    g = apply(g, { type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: 'B3', level: 3 } as any, 'h1');
    const ms = g.combat!.units.filter((u) => u.tier === 'minion' && u.id.startsWith('foe-s')).slice(-2);
    expect(ms.map((u) => u.level)).toEqual([7, 3]); expect(ms.map((u) => u.maxHp)).toEqual([enemyStats('minion', 7).hp, enemyStats('minion', 3).hp]);
  });
});
