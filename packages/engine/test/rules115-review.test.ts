// Rules 1.15, the adversarial review (11 Nov 2026): the cases that were found broken or untested, each from a sentence
// of "Rules revision 1.15" in the spec. The table itself and the first build are in enemy-levels.test.ts.
import { describe, expect, it } from 'vitest';
import {
  FIGHT_TOOLS, ENEMY, ENEMY_LEVELS, enemyStats, levelGiven, fightLevel, levelGap, farBelow, levelCompanion, unitFromEnemy, critMult, CRIT_BASE, CRIT_MAX,
  attackDamage, previewAttack, resolveAttack, applyDamage, apply, npcsOf, squadLevel, d20, LOOT, PERKS, TRAITS, WEAPONS, RARITY, COMBAT_XP,
  newGame, ARCHETYPES, type GameState, type Unit, type Sheet,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

const rngFor = (want: number) => { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === want) return { state: s }; } throw new Error('no seed'); };
const fightBy = (s: ReturnType<typeof storyWith>, combat: any) => { s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'soldier', weapon: 'service_pistol' }], ...combat } } } as any); return s.g.combat!; };
const foesOf = (cb: { units: Unit[] }) => cb.units.filter((u) => u.side === 'foe');

describe('a level someone gives', () => {
  it('is a number, or a string that is one; anything else is no level at all', () => {
    expect([0, 99, 7.9, -4, '12', ' 3 '].map(levelGiven)).toEqual([1, 20, 7, 1, 12, 3]);
    expect(['', 'abc', null, undefined, true, false, [], [5], {}, NaN, Infinity, -Infinity, '1e3', '12 levels'].map(levelGiven)).toEqual(Array(14).fill(null));
  });
  it('the Narrator\'s fight: 0 and 99 are held to 1 and 20; a word, an empty string, true or nothing is the squad\'s level', () => {
    const lv = (level: unknown) => { const cb = fightBy(storyWith([{ level: 6 }]), { level, enemies: [{ name: 'R', tier: 'soldier', weapon: 'service_pistol', level }] }); return [cb.level, foesOf(cb)[0].level]; };
    expect(lv(0)).toEqual([1, 1]); expect(lv(99)).toEqual([20, 20]); expect(lv('12')).toEqual([12, 12]); expect(lv(7.9)).toEqual([7, 7]);
    for (const none of ['abc', '', null, undefined, true, [], {}, NaN, Infinity]) expect(lv(none)).toEqual([6, 6]);
  });
  it('the shift: whole, −3 to +2; anything that is not a number is no shift', () => {
    const sh = (level_shift: unknown) => fightBy(storyWith([{ level: 6 }]), { level_shift }).level;
    expect(['2', 1.7, -2.9, 9, -9, Infinity, -Infinity].map(sh)).toEqual([8, 7, 4, 8, 3, 8, 3]);
    expect(['x', null, undefined, [], {}, NaN].map(sh)).toEqual([6, 6, 6, 6, 6, 6]);
  });
  it('a level given outright is the fight\'s level as it stands: a shift is not added to it', () => {
    expect(fightLevel([{ level: 6 }], { level: 9, shift: 2 })).toBe(9);
    expect(fightBy(storyWith([{ level: 6 }]), { level: 9, level_shift: 2 }).level).toBe(9);
    expect(fightLevel([{ level: 6 }], { level: 'abc', shift: 2 })).toBe(8);
  });
  it('an empty squad fights at level 1; a squad of levels 1 and 20 at level 10', () => {
    expect(fightLevel([])).toBe(1);
    const s = storyWith([{ level: 5 }]); for (const c of Object.values(s.g.characters)) c.dead = true;
    expect(squadLevel(s.g)).toBe(1);
    expect(fightWith([{ level: 1 }, { level: 20 }], [{}]).cb.level).toBe(10);
  });
  it('a tier the game does not know is a Minion of the fight\'s level', () => {
    const cb = fightBy(storyWith([{ level: 6 }]), { enemies: [{ name: 'Wyrm', tier: 'dragon', weapon: 'service_pistol' }] });
    expect(foesOf(cb)[0]).toMatchObject({ tier: 'minion', level: 6, maxHp: enemyStats('minion', 6).hp });
  });
});

describe('the Narrator names a tier and a level, never a number', () => {
  it('numbers pinned on an enemy are a test tool: the game ignores them', () => {
    const was = FIGHT_TOOLS.pinned; FIGHT_TOOLS.pinned = false;
    try {
      const cb = fightBy(storyWith([{ level: 6 }]), { enemies: [{ name: 'R', tier: 'soldier', weapon: 'service_pistol', fixed: { hp: 9999, defense: 30, attack_bonus: 20, armour: 50 } }] });
      expect(foesOf(cb)[0]).toMatchObject({ level: 6, maxHp: enemyStats('soldier', 6).hp, def: 13, armour: 6, attack: 4 });
    } finally { FIGHT_TOOLS.pinned = was; }
  });
  it('even as a test tool, numbers that are not numbers pin nothing (the unit is never left without HP)', () => {
    const cb = fightBy(storyWith([{ level: 6 }]), { enemies: [{ name: 'R', tier: 'soldier', weapon: 'service_pistol', fixed: {} }, { name: 'Q', tier: 'soldier', weapon: 'service_pistol', fixed: { hp: 0, defense: 1, attack_bonus: 1, armour: 1 } }] });
    for (const u of foesOf(cb)) expect(u).toMatchObject({ level: 6, hp: enemyStats('soldier', 6).hp, def: 13 });
  });
});

describe('a campaign file may give a fight, or one enemy, a level', () => {
  const withCampaign = (level: number) => {
    const s = storyWith([{ level }]);
    const camp: any = (s.g as any).campaign;
    return { s, camp };
  };
  it('an encounter\'s level is the fight\'s; an encounter enemy\'s level is its own; the fight\'s own list wins over both', () => {
    const { s, camp } = withCampaign(4);
    expect(camp?.zones?.length).toBeGreaterThan(0);
    camp.encounters = [{ name: 'The Gate', zone: camp.zones[0].id, when: 'x', difficulty: 'hard', level: 11, enemies: [{ name: 'Gate captain', tier: 'elite', weapon: 'sabre', level: 14 }, { name: 'Gate guard', tier: 'soldier', weapon: 'sabre' }] }];
    const cb = fightBy(s, { name: 'the gate', enemies: [{ name: 'Gate captain', tier: 'elite', weapon: 'sabre' }, { name: 'Gate guard', tier: 'soldier', weapon: 'sabre' }, { name: 'Gate guard', tier: 'soldier', weapon: 'sabre', level: 2 }] });
    expect(cb.level).toBe(11); expect(foesOf(cb).map((u) => u.level)).toEqual([14, 11, 2]);
  });
});

describe('the level gap', () => {
  it('characters of levels 1 and 20 in one fight (level 10): each reads its own gap, held to 5 levels', () => {
    const f = fightWith([{ level: 1 }, { level: 20 }], [{}]);
    const [lo, hi] = f.pcs, foe = f.foe;
    expect([levelGap(lo, foe), levelGap(foe, lo), levelGap(hi, foe), levelGap(foe, hi)]).toEqual([-5, 5, 5, -5]);
    expect(levelGap(lo, hi)).toBe(0);
  });
  it('far below (5 levels or more): the card says so, one hit takes it out whatever its HP and shield, and the log says why', () => {
    const f = fightWith([{ level: 20 }], [{ tier: 'boss' }], { level: 15 });
    const pc = f.turn(f.pc), boss = f.foe; pc.pos = '3,5'; boss.pos = '7,5'; boss.shield = 200;
    withGame(f.g, () => {
      const pv = previewAttack(f.cb, pc, boss, 'shot');
      expect(pv.terms!.some((t) => /far below your level/.test(t.label))).toBe(true);
      expect(Math.floor(pv.dmg!.total)).toBeLessThan(boss.hp);
      const r = resolveAttack(f.cb, rngFor(15), pc, boss, 'shot', f.g.characters[pc.charId!]);
      expect(r.hit).toBe(true); expect(boss.dead).toBe(true); expect(boss.hp).toBe(0);
      expect(f.cb.log.some((l) => /far below .* level: one hit is enough/.test(l))).toBe(true);
    });
  });
  it('4 levels below is not: the card has no such line and the hit deals its damage', () => {
    const f = fightWith([{ level: 20 }], [{}], { level: 16 }); const pc = f.turn(f.pc), foe = f.foe; pc.pos = '3,5'; foe.pos = '7,5';
    withGame(f.g, () => { expect(previewAttack(f.cb, pc, foe, 'shot').terms!.some((t) => /far below/.test(t.label))).toBe(false); applyDamage(f.cb, foe, 10, { by: pc, type: 'weapon' } as any); });
    expect(foe.hp).toBe(foe.maxHp - 10); expect(farBelow(foe, pc, f.cb)).toBe(false);
  });
  it('it is the hit that counts: damage past shields too; a hit that every reduction brought to 0 takes nothing out', () => {
    const f = fightWith([{ level: 20 }], [{}, {}], { level: 12 }); const pc = f.pc, [a, b] = f.foes;
    withGame(f.g, () => { applyDamage(f.cb, a, 1, { by: pc, type: 'bleed', shield: false } as any); applyDamage(f.cb, b, 0, { by: pc, type: 'weapon' } as any); });
    expect(a.dead).toBe(true); expect(b.hp).toBe(b.maxHp);
  });
  it('an enemy never takes a character out this way, and enemies never do it to each other', () => {
    const f = fightWith([{ level: 1 }], [{ level: 20 }, { level: 1 }]); const pc = f.pc, [big, small] = f.foes;
    withGame(f.g, () => { applyDamage(f.cb, pc, 5, { by: big, type: 'weapon' } as any); applyDamage(f.cb, small, 5, { by: big, type: 'weapon' } as any); });
    expect(pc.downed).toBe(false); expect(small.hp).toBe(small.maxHp - 5);
  });
  it('a twin stands at its owner\'s level, however it was called, and keeps its own damage', () => {
    const f = fightWith([{ level: 18 }], [{}], { level: 18 }); const owner = f.pc, foe = f.foe;
    // called in the fight: built as a level 1 unit on its owner's side
    const tw: any = unitFromEnemy('tw-' + owner.id, 'the twin', 'minion', 'fists', '2,2', { state: 3 }); Object.assign(tw, { side: 'pc', tier: undefined, twinOf: owner.id });
    f.cb.units.push(tw);
    expect(levelGap(tw, foe, f.cb)).toBe(0); expect(levelGap(foe, tw, f.cb)).toBe(0);
    foe.level = 13; expect(levelGap(tw, foe, f.cb)).toBe(5); expect(farBelow(foe, tw, f.cb)).toBe(true);
    // called on the area map: a companion
    const u: any = unitFromEnemy('cp', 'the twin', 'minion', 'fists', '2,3', { state: 3 }); Object.assign(u, { side: 'pc', tier: undefined, companion: 'twin', hp: 40, maxHp: 40, def: 15 });
    levelCompanion(u, { hp: 50, defense: 12, attack_bonus: 0, armour: 0 }, 18);
    expect(u).toMatchObject({ level: 18, hp: 40, maxHp: 40, def: 15 }); expect(u.lvlDmg).toBeUndefined();
  });
});

describe('critical hits: never under ×1.5, never over ×2.0', () => {
  it('every perk, every trait, a Masterwork weapon, Perception 10 and Dexterity 10 on one sheet: ×1.97 on the sheet, ×2.0 at most on a hit', () => {
    const perks = Object.fromEntries(PERKS.map((p) => [p.id, p.tier === 'acquired' ? 'II' : p.tier]));
    const f = fightWith([{ level: 20, perks, traits: TRAITS.map((t) => t.id), attrs: { perception: 10 }, skills: { dexterity: 10 }, weapon: 'long_rifle' }], [{ tier: 'boss' }], { classic: true });
    const pc = f.pc, c = f.g.characters[pc.charId!]; c.weaponState = { ...(c.weaponState || {}), rarity: Object.keys(RARITY).slice(-1)[0] } as any;
    const m = critMult(c); expect(m).toBeGreaterThanOrEqual(CRIT_BASE); expect(m).toBeLessThanOrEqual(CRIT_MAX);
    pc.pos = '3,5'; f.foe.pos = '7,5';
    withGame(f.g, () => {
      for (const w of WEAPONS.filter((x) => x.category !== 'thrown')) { pc.weapon = w.id; const d = attackDamage(f.cb, pc, f.foe, /melee|unarmed/.test(w.category) ? 'melee' : 'shot', c, { crit: true }); expect(d.crit, w.id).toBeLessThanOrEqual(CRIT_MAX); expect(d.crit, w.id).toBeGreaterThanOrEqual(CRIT_BASE); }
    });
  });
  it('an old save\'s character with those points: the multiplier is worked out from the sheet each time, so it is the new one', () => {
    const f = fightWith([{ attrs: { perception: 10 }, skills: { dexterity: 10 }, traits: ['one_shot'] }], [{}]);
    const g: GameState = JSON.parse(JSON.stringify(f.g)); const c = Object.values(g.characters)[0];
    expect(critMult(c)).toBeCloseTo(1.97, 3);
  });
  it('nothing takes it under ×1.5; a target\'s Critical damage taken cuts only the part above ×1', () => {
    const f = fightWith([{ attrs: { perception: 1 }, skills: { dexterity: 0 } }], [{}]); const pc = f.pc, foe = f.foe, c = f.g.characters[pc.charId!];
    expect(critMult(c)).toBe(1.5);
    withGame(f.g, () => { foe.critTaken = 0.5; expect(attackDamage(f.cb, pc, foe, 'shot', c, { crit: true }).crit).toBeCloseTo(1.25, 5); });
  });
  it('an enemy of any tier and level, and a companion: ×1.5; what the card shows is what the hit does', () => {
    for (const [tier, level] of [['vermin', 1], ['soldier', 12], ['boss', 20]] as const) {
      const f = fightWith([{ level }], [{ tier, weapon: 'hellraiser_service_rifle' }]); const pc = f.pc, foe = f.foe; pc.pos = '3,5'; foe.pos = '7,5'; foe.ap = 6; pc.critTaken = 0;
      withGame(f.g, () => {
        const pv = previewAttack(f.cb, foe, pc, 'shot'); expect(pv.dmg!.crit).toBe(1.5);
        const want = Math.max(1, Math.floor(pv.dmg!.total * 1.5) - pv.dmg!.armour), hp0 = pc.hp + (pc.shield || 0);
        const r = resolveAttack(f.cb, rngFor(20), foe, pc, 'shot', null); expect(r.crit).toBe(true); expect(hp0 - pc.hp - (pc.shield || 0)).toBe(Math.min(hp0, want));
      });
    }
  });
});

describe('enemy casters are their tier at the fight\'s level', () => {
  it('a Sigil adept and a Heart adept at level 12: a Soldier\'s numbers at 12, spells ×(0.78 × 1.38); at level 1, ×0.78', () => {
    for (const [caster, key, base] of [['sigil_adept', 'sigilMult', 1], ['heart_adept', 'soulMult', 1.2]] as const) {
      const at = (level: number) => foesOf(fightBy(storyWith([{ level }]), { enemies: [{ name: 'Adept', tier: 'soldier', caster, weapon: 'combat_knife' }] }))[0] as any;
      const hi = at(12), lo = at(1);
      expect(hi).toMatchObject({ level: 12, maxHp: 244, def: 16, armour: 8 }); expect(hi.lvlDmg).toBeCloseTo(0.78 * 1.38, 3);
      expect(hi.mg[key]).toBeCloseTo(base * hi.lvlDmg, 6); expect(lo.mg[key]).toBeCloseTo(base * 0.78, 6);
    }
  });
});

describe('Vermin in every list of tiers', () => {
  it('drops nothing from the tables, gives 1 kill, saves and notices as a Minion', () => {
    expect(LOOT.rolls_by_tier.vermin).toBe(0); expect(ENEMY.vermin.kills).toBe(1);
    expect(Object.keys(LOOT.rolls_by_tier).sort()).toEqual(Object.keys(ENEMY).sort());
  });
  it('the Narrator can place one on the map and start a fight with one; XP is by difficulty, whatever the tiers', () => {
    const s = storyWith([{ level: 3 }]);
    s.act({ type: 'narrator/turn', turn: { narration: 'Rats.', npcs: [{ action: 'place', name: 'Rat', side: 'hostile', tier: 'vermin', weapon: 'beast_bite', at: 'H6' }] } } as any);
    expect(npcsOf(s.g).find((n) => n.name === 'Rat')!.tier).toBe('vermin');
    const cb = fightBy(s, { difficulty: 'easy', enemies: [{ name: 'Rat', tier: 'vermin', weapon: 'beast_bite' }] });
    expect(foesOf(cb).every((u) => u.tier === 'vermin' && u.level === 3 && u.maxHp === 17)).toBe(true);
    expect(COMBAT_XP[cb.difficulty]).toBe(25);
  });
});

describe('a fight saved before the rule, and the one after it', () => {
  it('the saved fight plays on with its own numbers; the next fight in the same save uses the table', () => {
    const f = fightWith([{ level: 12 }], [{ weapon: 'fists' }]);
    const old: GameState = JSON.parse(JSON.stringify(f.g));
    for (const u of old.combat!.units) { delete u.level; delete u.lvlDmg; if (u.side === 'foe') Object.assign(u, { hp: 1, maxHp: 60, def: 12, armour: 5, attack: 3 }); }
    delete old.combat!.level;
    const pc = old.combat!.units.find((u) => u.side === 'pc')!, foe = old.combat!.units.find((u) => u.side === 'foe')!;
    old.combat!.turn = old.combat!.order.indexOf(pc.id); delete old.combat!.window; pc.ap = 6; pc.pos = '3,5'; foe.pos = '4,5';
    let g = old;
    withGame(g, () => { expect(levelGap(pc, foe, g.combat)).toBe(0); expect(farBelow(foe, pc, g.combat)).toBe(false); applyDamage(g.combat!, foe, 30, { by: pc, type: 'weapon' } as any); });
    expect(foe.dead).toBe(true); expect(foe.maxHp).toBe(60);
    g = apply(g, { type: 'combat/end-turn', unitId: pc.id } as any, 'host');
    expect(g.phase).not.toBe('combat'); // its last enemy fell: the saved fight is over
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Again.', combat: { name: 'Next', map: 'yard', difficulty: 'standard', enemies: [{ name: 'New', tier: 'soldier', weapon: 'fists' }] } } } as any, 'host');
    const nf = g.combat!.units.find((u) => u.side === 'foe')!;
    expect(g.combat!.level).toBe(12); expect(nf).toMatchObject({ level: 12, maxHp: 244, def: 16, armour: 8 }); expect(g.combat!.units.find((u) => u.side === 'pc')!.level).toBe(12);
  });
});

describe('the same seed is the same fight', () => {
  it('two fights from one seed, played by the same clicks, end in the same state', () => {
    const play = () => { const f = fightWith([{ level: 9 }, { level: 4 }], [{ tier: 'elite', weapon: 'legion_bullpup' }, { tier: 'vermin', weapon: 'beast_bite' }, { level: 12 }], { seed: 'SAME-115' });
      for (let i = 0; i < 12 && f.g.phase === 'combat'; i++) { const cb = f.cb, id = cb.window?.queue[0]?.unitId ?? cb.order[cb.turn]; try { f.act({ type: 'combat/end-turn', unitId: id } as any); } catch { break; } }
      return JSON.stringify(f.g.combat?.units.map((u) => [u.id, u.level, u.hp, u.pos, u.ammo])) + '|' + f.g.rng.state; };
    expect(play()).toBe(play());
  });
});

describe('the Proving Ground after a level-up', () => {
  const sheet: Sheet = (() => { const a = ARCHETYPES.find((x) => x.id === 'sharpshooter')!; return { name: 'Vel', portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} }; })();
  it('a level-up in the middle of a fight: the fighter is the new level, the wave keeps its numbers, a unit spawned with no level is the squad\'s new level, and the next wave is too', () => {
    let g = newGame('PG115', { id: 'h1', name: 'Host' }, 'seed-115');
    g = apply(g, { type: 'char/add', sheet }, 'h1'); g = apply(g, { type: 'sandbox/start' }, 'h1');
    const cid = Object.keys(g.characters)[0];
    g = apply(g, { type: 'sandbox/level', charId: cid, level: 4 } as any, 'h1');
    g = apply(g, { type: 'sandbox/fight' } as any, 'h1');
    const wave = g.combat!.units.filter((u) => u.side === 'foe').map((u) => [u.id, u.level, u.maxHp]);
    expect(wave.every((x) => x[1] === 4)).toBe(true);
    g = apply(g, { type: 'sandbox/level', charId: cid, level: 15 } as any, 'h1');
    expect(g.combat!.units.find((u) => u.charId === cid)!.level).toBe(15);
    expect(g.combat!.units.filter((u) => u.side === 'foe').map((u) => [u.id, u.level, u.maxHp])).toEqual(wave);
    g = apply(g, { type: 'sandbox/spawn', tier: 'soldier', weapon: 'sabre', at: 'B2' } as any, 'h1');
    expect(g.combat!.units.filter((u) => u.id.startsWith('foe-s')).slice(-1)[0]).toMatchObject({ level: 15, maxHp: enemyStats('soldier', 15).hp });
    g = apply(g, { type: 'sandbox/spawn', tier: 'soldier', weapon: 'sabre', at: 'B3', level: '' } as any, 'h1'); // an empty field is no level
    expect(g.combat!.units.filter((u) => u.id.startsWith('foe-s')).slice(-1)[0].level).toBe(15);
    g = apply(g, { type: 'sandbox/clear' } as any, 'h1');
    if (g.phase === 'combat') g = apply(g, { type: 'sandbox/stop' } as any, 'h1');
    g = apply(g, { type: 'sandbox/fight' } as any, 'h1');
    expect(g.combat!.level).toBe(15); expect(g.combat!.units.filter((u) => u.side === 'foe').every((u) => u.level === 15)).toBe(true);
  });
});
