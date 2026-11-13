// Lane A (Body, melee, damage taken): every item at every tier, in play. Player actions go through the reducer
// (apply: combat/perk, combat/move, combat/attack, story/perk, narrator/turn, check/roll); what enemies and the world
// do to a character goes through the same engine functions their turns use (resolveAttack, applyDamage, applyCond,
// shove, blessing), with the game bound.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  applyDamage, applyCond, resolveAttack, previewAttack, shove, healUnit, blessing, movement, carryLimit, maxHp, skillRollMod, PATRONS, condOn,
  type Unit, type Combat,
} from '../src';
import { behindLine } from '../src/perks/a';
import { fightWith, storyWith, withGame, rng } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
/** Put units where a test needs them (the live fight state; the next act copies it). */
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; };
const sure = (u: Unit) => { u.attack = 60; }; // hits on anything but a natural 1
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const pcAct = (f: F, a: any) => f.act({ unitId: f.pc.id, ...a });
/** A Narrator check on a character, then roll it. Returns the check entry's head. */
function storyCheck(s: ReturnType<typeof storyWith>, charId: string, skills: string[], extra: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Try it.', checks: [{ charId, skills, tn: 12, stakes: 'It works.', ...extra }] } } as any);
  const ck = s.g.checks.find((k) => !k.done)!;
  return { ck, roll: () => { s.act({ type: 'check/roll', checkId: ck.id }); return s.g.story.entries.filter((e) => e.kind === 'check').at(-1)!.head!; } };
}

describe('Stonewall', () => {
  it('geometry: the ray from the attacker through the guard, 1 (I) or 2 (II) tiles on', () => {
    expect(behindLine('2,5', '5,5', '6,5', 1)).toBe(true);
    expect(behindLine('2,5', '5,5', '7,5', 1)).toBe(false);
    expect(behindLine('2,5', '5,5', '7,5', 2)).toBe(true);
    expect(behindLine('2,2', '4,4', '5,5', 1)).toBe(true);
    expect(behindLine('2,5', '5,5', '5,6', 2)).toBe(false);
  });
  for (const tier of ['I', 'II'] as const) it('Tier ' + tier + ': an ally behind the guard takes ' + (tier === 'I' ? '25' : '50') + '% less from a ranged shot', () => {
    const f = fightWith([{ perks: { bulwark: tier } }, {}], [{ at: 'C6' }]);
    const [guard, ally] = f.pcs, foe = f.foe; sure(foe);
    at(f, foe, '2,5'); at(f, guard, '5,5'); at(f, ally, tier === 'I' ? '6,5' : '7,5');
    const shot = (seed: number) => withGame(f.g, () => { f.g.rng.state = seed; const hp = ally.hp; resolveAttack(f.cb, f.g.rng, foe, ally, 'shot', null, { noAp: true }); const d = hp - ally.hp; ally.hp = ally.maxHp; return d; });
    const covered = shot(11);
    expect(logHas(f.cb, /Stonewall/)).toBe(true);
    at(f, guard, '5,8'); // off the line
    const open = shot(11);
    expect(open).toBeGreaterThan(0);
    expect(covered).toBe(Math.floor(open * (tier === 'I' ? 0.75 : 0.5)));
  });
});

describe('Shrug It Off', () => {
  it('Tier I: 2 AP, removes a Body debuff; refused with nothing to remove', () => {
    const f = fightWith([{ perks: { shrug_it_off: 'I' } }]);
    let u = f.turn(f.pc);
    expect(() => pcAct(f, { type: 'combat/perk', id: 'shrug_it_off' })).toThrow(/No Body debuff/);
    withGame(f.g, () => applyCond(f.cb, rng(), f.foe, f.unit(u.id), 'pinned', undefined, undefined, { skipSave: true }));
    expect(condOn(f.pc, 'pinned')).toBe(true);
    pcAct(f, { type: 'combat/perk', id: 'shrug_it_off' });
    u = f.pc; expect(condOn(u, 'pinned')).toBe(false); expect(u.ap).toBe(4); expect(u.shield || 0).toBe(0);
  });
  it('Tier II: 1 AP and a shield of 10% of max HP (Healing received applies)', () => {
    const f = fightWith([{ perks: { shrug_it_off: 'II' } }]);
    const u = f.turn(f.pc); u.prone = true;
    pcAct(f, { type: 'combat/perk', id: 'shrug_it_off' });
    expect(f.pc.prone).toBe(false); expect(f.pc.ap).toBe(5);
    expect(f.pc.shield).toBe(Math.floor(Math.floor(0.1 * f.pc.maxHp * (f.pc.healRecv || 1))));
  });
  it('story: ends a story Body condition, or asks the Narrator about a narrated one', () => {
    const s = storyWith([{ perks: { shrug_it_off: 'I' } }]);
    const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'The gas.', conditions: [{ target: c.id, id: 'nausea' }] } } as any);
    expect((s.g.characters[c.id].persistentConds || []).map((p) => p.id)).toContain('nausea');
    s.act({ type: 'story/perk', charId: c.id, id: 'shrug_it_off' });
    expect((s.g.characters[c.id].persistentConds || []).map((p) => p.id)).not.toContain('nausea');
    s.act({ type: 'story/perk', charId: c.id, id: 'shrug_it_off' });
    expect(s.g.story.rulings!.some((r) => r.key === 'perk:shrug_it_off')).toBe(true);
  });
});

describe('Used to the Pain', () => {
  // rules 1.13: no AP any more. A light first hit hardens you against the next hit; a heavy one doesn't.
  const hits = (tier: string, first: number) => {
    const f = fightWith([{ perks: { used_to_the_pain: tier } }]); const pc = f.pc, hp = pc.maxHp;
    const src = () => ({ by: f.foe, type: 'weapon', ranged: true }) as any;
    return withGame(f.g, () => {
      applyDamage(f.cb, pc, Math.floor(hp * first), src());
      const a = pc.hp; applyDamage(f.cb, pc, 20, src()); const second = a - pc.hp;
      const b = pc.hp; applyDamage(f.cb, pc, 20, src()); return { second, third: b - pc.hp, ap: f.turn(pc).ap, log: f.cb.log };
    });
  };
  it('Tier I: a first hit under 20% of max HP makes the next hit deal 25% less; only that one; a heavy first hit gives nothing', () => {
    const light = hits('I', 0.1); expect(light.second).toBe(15); expect(light.third).toBe(20); expect(light.ap).toBe(6);
    expect(light.log.some((l) => /Used to the Pain/.test(l))).toBe(true);
    const heavy = hits('I', 0.25); expect(heavy.second).toBe(20); expect(heavy.ap).toBe(6); // no AP penalty either
  });
  it('Tier II: the threshold is 30%, and the next hit deals 40% less', () => {
    expect(hits('II', 0.25).second).toBe(12);
    expect(hits('II', 0.35).second).toBe(20);
  });
});

describe('Scar Tissue', () => {
  it('Tier I: each wound adds 5% Elemental reduction (up to 25%), on top of the derived reduction', () => {
    const f = fightWith([{ perks: { scar_tissue: 'I' }, skills: { pain_threshold: 0 } }]);
    const u = f.pc;
    withGame(f.g, () => {
      for (let i = 0; i < 7; i++) applyDamage(f.cb, u, 1, { by: f.foe, type: 'weapon' });
      u.hp = u.maxHp;
      const r = applyDamage(f.cb, u, 100, { by: f.foe, type: 'elemental', dmgType: 'fire' });
      expect(r.dealt).toBe(Math.floor(100 * (1 - (u.elemTaken || 0)) * 0.75));
    });
  });
  it('Tier II: up to 40%, and each wound adds 5 points of Injury resistance (provisional "limb damage")', () => {
    const f = fightWith([{ perks: { scar_tissue: 'II' }, skills: { pain_threshold: 0 } }]);
    const u = f.pc, base = u.injResist || 0;
    withGame(f.g, () => {
      for (let i = 0; i < 9; i++) applyDamage(f.cb, u, 1, { by: f.foe, type: 'weapon' });
      expect(u.injResist).toBe(base + 40);
      u.hp = u.maxHp;
      const r = applyDamage(f.cb, u, 100, { by: f.foe, type: 'elemental', dmgType: 'lightning' });
      expect(r.dealt).toBe(Math.floor(100 * (1 - (u.elemTaken || 0)) * 0.6));
    });
  });
});

describe('Iron Stomach', () => {
  it('Tier I: Fear and Nausea last at most 1 round', () => {
    const f = fightWith([{ perks: { iron_stomach: 'I' } }]);
    withGame(f.g, () => { applyCond(f.cb, rng(), f.foe, f.pc, 'fear', 3, undefined, { skipSave: true }); applyCond(f.cb, rng(), f.foe, f.pc, 'nausea', undefined, undefined, { skipSave: true }); });
    expect(f.pc.conds!.fear).toBe(1); expect(f.pc.conds!.nausea).toBe(1);
  });
  it('Tier II: immune (no save rolled); story Fear-tagged checks pass automatically', () => {
    const f = fightWith([{ perks: { iron_stomach: 'II' } }]);
    const out = withGame(f.g, () => applyCond(f.cb, rng(), f.foe, f.pc, 'nausea'));
    expect(out).toMatch(/untouched/); expect(condOn(f.pc, 'nausea')).toBe(false);
    const s = storyWith([{ perks: { iron_stomach: 'II' } }]);
    expect(storyCheck(s, s.chars[0].id, ['composure'], { tags: ['horror'], tn: 20 }).roll()).toMatch(/SUCCESS \(AUTO\)/);
  });
});



describe('Earthbreaker', () => {
  it('once per combat, 4 AP: everyone in the 3×3 takes melee damage and falls Prone; cover in it breaks', () => {
    const f = fightWith([{ perks: { earthbreaker: 'mastered' } }], [{ at: 'C6' }, { at: 'H6' }]);
    const u = f.turn(f.pc); at(f, u, '5,6'); at(f, f.foes[0], '4,4'); at(f, f.foes[1], '6,4');
    pcAct(f, { type: 'combat/perk', id: 'earthbreaker', tile: '5,5' }); // the crates at 5,3 and 5,4: 5,4 is in the area
    expect(f.pc.ap).toBe(2);
    for (const v of f.foes) { expect(v.hp).toBeLessThan(v.maxHp); if (!v.dead) expect(v.prone).toBe(true); }
    expect((f.cb.objects || []).some((o) => o.pos === '5,4' && o.kind === 'crate')).toBe(false);
    expect((f.cb.objects || []).some((o) => o.pos === '5,3' && o.kind === 'crate')).toBe(true);
    f.unit(f.pc.id).ap = 6;
    expect(() => pcAct(f, { type: 'combat/perk', id: 'earthbreaker', tile: '5,5' })).toThrow(/Used/);
  });
});

describe('Last Wall', () => {
  it('once per combat a lethal blow leaves 1 HP and nothing gets through until your next turn', () => {
    const f = fightWith([{ perks: { last_wall: 'mastered' } }]);
    const u = f.pc;
    withGame(f.g, () => {
      applyDamage(f.cb, u, 9999, { by: f.foe, type: 'weapon' });
      expect(u.hp).toBe(1); expect(u.downed).toBe(false);
      expect(applyDamage(f.cb, u, 50, { by: f.foe, type: 'weapon' }).prevented).toBe(true);
      expect(applyDamage(f.cb, u, 5, { type: 'bleed' }).prevented).toBe(true);
    });
    f.turn(u);
    withGame(f.g, () => applyDamage(f.cb, f.pc, 50, { by: f.foe, type: 'weapon' }));
    expect(f.pc.downed).toBe(true);
  });
  it('self-inflicted damage (Mana Short) is not held', () => {
    const f = fightWith([{ perks: { last_wall: 'mastered' } }]);
    withGame(f.g, () => applyDamage(f.cb, f.pc, 9999, { by: f.pc, type: 'short' }));
    expect(f.pc.downed).toBe(true);
  });
});

describe('Walking Wounded', () => {
  it('a head injury doesn\'t Daze and a leg injury doesn\'t slow; below half HP you take 20% less damage (no AP)', () => {
    const f = fightWith([{ perks: { walking_wounded: 'mastered' } }]);
    const u = f.pc, mv = u.movement;
    withGame(f.g, () => { for (let s = 1; s < 60; s++) { applyCond(f.cb, rng(s), f.foe, u, 'injured'); } });
    expect(u.injuries!.some((i) => i.loc === 'leg')).toBe(true);
    expect(u.movement).toBe(mv); expect(u.dazedNext || 0).toBe(0);
    const hit = () => withGame(f.g, () => { const a = f.unit(u.id).hp; applyDamage(f.cb, f.unit(u.id), 20, { by: f.foe, type: 'weapon', ranged: true }); return a - f.unit(u.id).hp; });
    f.unit(u.id).hp = u.maxHp; expect(hit()).toBe(20);
    f.unit(u.id).hp = Math.floor(u.maxHp / 2) - 1; expect(hit()).toBe(16);
    expect(f.turn(u).ap).toBe(6);
  });
  it('out of a fight, a leg injury doesn\'t halve Movement', () => {
    const s = storyWith([{ perks: { walking_wounded: 'mastered' } }, {}]);
    const [a, b] = s.chars.map((c) => s.g.characters[c.id]);
    const m0 = movement(a); a.injuries = [{ loc: 'leg', side: 'left' }]; b.injuries = [{ loc: 'leg', side: 'left' }];
    expect(movement(a)).toBe(m0); expect(movement(b)).toBeLessThan(movement({ ...b, injuries: [] }));
  });
});

describe('Nothing Left to Fear', () => {
  it('immune to Fear; allies within 3 who see you can\'t be made Afraid, and lose Fear at their turn start', () => {
    const f = fightWith([{ perks: { nothing_left_to_fear: 'mastered' } }, {}]);
    const [me, ally] = f.pcs; at(f, me, '1,4'); at(f, ally, '2,6');
    withGame(f.g, () => {
      expect(applyCond(f.cb, rng(), f.foe, me, 'fear')).toMatch(/untouched/);
      expect(applyCond(f.cb, rng(), f.foe, ally, 'fear')).toMatch(/Nothing Left to Fear/);
    });
    at(f, ally, '1,9'); withGame(f.g, () => applyCond(f.cb, rng(), f.foe, ally, 'fear', 3, undefined, { skipSave: true }));
    expect(condOn(f.unit(ally.id), 'fear')).toBe(true);
    at(f, ally, '2,6'); f.turn(ally);
    expect(condOn(f.unit(ally.id), 'fear')).toBe(false);
  });
});

describe('Bite the Bullet', () => {
  it('once per combat: up for one more turn, then Downed unless healed; hits meanwhile are death-save failures', () => {
    const f = fightWith([{ perks: { bite_the_bullet: 'achieved' } }]);
    const u = f.pc;
    withGame(f.g, () => applyDamage(f.cb, u, 9999, { by: f.foe, type: 'weapon' }));
    expect(u.downed).toBe(false); expect(condOn(u, 'last_turn')).toBe(true);
    withGame(f.g, () => applyDamage(f.cb, u, 30, { by: f.foe, type: 'weapon', crit: true }));
    expect(u.saves.fail).toBe(2); expect(u.hp).toBe(1);
    f.turn(u); pcAct(f, { type: 'combat/end-turn' });
    expect(f.unit(u.id).downed).toBe(true);
  });
  it('healed in time, the Last Turn ends standing; a second drop the same fight goes down', () => {
    const f = fightWith([{ perks: { bite_the_bullet: 'achieved' } }]);
    const u = f.pc;
    withGame(f.g, () => { applyDamage(f.cb, u, 9999, { by: f.foe, type: 'weapon' }); healUnit(f.cb, u, 20, null, 'stim'); });
    expect(condOn(u, 'last_turn')).toBe(false); expect(u.hp).toBeGreaterThan(1);
    withGame(f.g, () => applyDamage(f.cb, u, 9999, { by: f.foe, type: 'weapon' }));
    expect(u.downed).toBe(true);
  });
});

describe('Siege Engine', () => {
  it('Shove costs 1 AP; nothing shoves or knocks you back', () => {
    const f = fightWith([{ perks: { siege_engine: 'achieved' } }, { perks: { breaching_strike: 'I' } }], [{ at: 'C6' }]);
    const u = f.turn(f.pc); at(f, u, '3,5'); at(f, f.foe, '4,5');
    pcAct(f, { type: 'combat/shove', targetId: f.foe.id });
    expect(f.pc.ap).toBe(5);
    const foe = f.foe; foe.strength = 30; foe.ap = 6; at(f, foe, '4,5');
    withGame(f.g, () => shove(f.cb, rng(3), foe, f.pc));
    expect(f.pc.pos).toBe('3,5'); expect(logHas(f.cb, /Siege Engine/)).toBe(true);
  });
});

describe('Pain Eater', () => {
  it('Bloodied: ×1.5 damage dealt; Fresh: ×1.5 damage taken; exactly half: neither', () => {
    const f = fightWith([{ traits: ['pain_eater'] }]);
    const u = f.pc;
    withGame(f.g, () => {
      u.hp = u.maxHp; expect(applyDamage(f.cb, u, 20, { by: f.foe, type: 'weapon' }).dealt).toBe(30);
      u.hp = Math.floor(u.maxHp / 2) - 1;
      expect(previewAttack(f.cb, u, f.foe, 'shot').dmg!.mults.some((m) => /Pain Eater/.test(m.label))).toBe(true);
      expect(applyDamage(f.cb, u, 20, { by: f.foe, type: 'weapon' }).dealt).toBe(20);
    });
  });
});

describe('Factory Made', () => {
  it('heals at half, Field Repairs itself (10 HP per Proficiency point), shrugs off toxic spills; lightning ×2', () => {
    const f = fightWith([{ traits: ['factory_made'], skills: { proficiency: 4 } }]);
    const u = f.turn(f.pc);
    expect(u.hazardImmune).toContain('toxic');
    withGame(f.g, () => { u.hp = 50; const r = healUnit(f.cb, u, 40, null, 'stim'); expect(r.restored).toBe(Math.floor(Math.floor(40 * (u.healRecv || 1)) * 0.5)); });
    f.unit(u.id).parts = 1; f.unit(u.id).hp = 40;
    pcAct(f, { type: 'combat/perk', id: 'factory_made', actionId: 'self_repair' });
    expect(f.pc.hp).toBe(80); expect(f.pc.parts).toBe(0);
    withGame(f.g, () => { f.pc.hp = f.pc.maxHp; expect(applyDamage(f.cb, f.pc, 10, { by: f.foe, type: 'sigil', dmgType: 'lightning' }).dealt).toBe(20); });
  });
  it('a healing Blessing works at half power (halved once, not twice)', () => {
    const f = fightWith([{ traits: ['factory_made'] }, {}]);
    const [me, other] = f.pcs, bl = { id: 't', name: 'Test mercy', effects: [{ op: 'stat_mod', stat: 'hp', value: 40 }], adjudication: 'engine', text: '' };
    withGame(f.g, () => { me.hp = 10; other.hp = 10; blessing(f.cb, rng(), other, me, bl, 1); blessing(f.cb, rng(), me, other, bl, 1); });
    expect(me.hp - 10).toBe(Math.floor(Math.floor(20 * (me.healRecv || 1)))); expect(other.hp - 10).toBe(Math.floor(40 * (other.healRecv || 1)));
  });
  it('story: ten minutes and a spare-parts charge restore 10 HP per Proficiency point', () => {
    const s = storyWith([{ traits: ['factory_made'], skills: { proficiency: 3 } }]);
    const c = s.g.characters[s.chars[0].id]; c.hp = 20; c.pack = [...(c.pack || []), { id: 'spare_parts', item: 'spare_parts', qty: 1 } as any];
    s.act({ type: 'story/perk', charId: c.id, id: 'factory_made', actionId: 'repair_story' });
    expect(s.g.characters[c.id].hp).toBe(50);
  });
});

describe('Glass Runner', () => {
  it('the first move each combat has 1 AP of tiles free; later moves pay', () => {
    const f = fightWith([{ traits: ['glass_runner'] }]);
    const u = f.turn(f.pc), mv = u.movement;
    pcAct(f, { type: 'combat/move', to: '1,' + (4 - mv) });
    expect(f.pc.ap).toBe(6);
    pcAct(f, { type: 'combat/move', to: '1,0' });
    expect(f.pc.ap).toBeLessThan(6);
  });
  it('Glass: a limb injury from a critical does +50% more; a broken leg quarters Movement', () => {
    const f = fightWith([{ traits: ['glass_runner'] }]);
    const foe = f.foe, u = f.pc; sure(foe); at(f, foe, '4,4');
    let seen = false;
    withGame(f.g, () => { for (let s = 1; s < 3000 && !seen; s++) { u.hp = u.maxHp; u.downed = false; u.injuries = []; u.injResist = 0; const n = f.cb.log.length; resolveAttack(f.cb, f.g.rng, foe, u, 'shot', null, { noAp: true }); if (f.cb.log.slice(n).some((l) => /INJURY \(d6 \d\): (left|right) (arm|leg)/.test(l))) { seen = true; expect(f.cb.log.slice(n).some((l) => /Glass bones/.test(l))).toBe(true); } } });
    expect(seen).toBe(true);
    const s = storyWith([{ traits: ['glass_runner'] }]); const c = s.g.characters[s.chars[0].id];
    const m0 = movement(c); c.injuries = [{ loc: 'leg', side: 'left' }];
    expect(movement(c)).toBe(Math.max(0.5, m0 * 0.25));
  });
});

describe('Right of Way', () => {
  it('can\'t be Shoved; −0.5 Movement (provisional); +2 Intimidation against a blocker', () => {
    const f = fightWith([{ traits: ['right_of_way'] }, {}]);
    const [me, plain] = f.pcs; expect(me.movement).toBe(plain.movement - 0.5);
    f.foe.strength = 30; at(f, f.foe, '2,4');
    withGame(f.g, () => shove(f.cb, rng(), f.foe, me));
    expect(f.pc.pos).toBe('1,4');
    const s = storyWith([{ traits: ['right_of_way'] }]);
    expect(storyCheck(s, s.chars[0].id, ['intimidation'], { tags: ['vs_blocker_or_interrupter'] }).roll()).toMatch(/\+2 Right of Way/);
  });
});

describe('Heavyworlder', () => {
  it('carry ×2, −0.5 Movement, +2 to hit against them, and no hiding in the light', () => {
    const f = fightWith([{ traits: ['heavyworlder'] }, {}]);
    const [me, plain] = f.pcs; at(f, f.foe, '3,4');
    expect(me.movement).toBe(plain.movement - 0.5);
    const c = f.g.characters[me.charId!]; expect(carryLimit(c)).toBe(2 * carryLimit({ ...c, traits: [] }));
    const pv = withGame(f.g, () => previewAttack(f.cb, f.foe, me, 'shot', { free: true }));
    expect(pv.terms!.some((t) => /big target/.test(t.label) && t.v === 2)).toBe(true);
    const u = f.turn(me); at(f, f.foe, '15,10'); f.unit(f.foe.id).vision = 1; void u;
    pcAct(f, { type: 'combat/hide' });
    expect(f.pc.hidden).toBe(false); expect(logHas(f.cb, /too big to hide/)).toBe(true);
  });
});

describe('Crawler-Blooded', () => {
  it('Crawlers never attack you first; a Lumeri Blessing burns you for 10', () => {
    const f = fightWith([{ traits: ['crawler_blooded'] }], [{ at: 'C6' }]);
    const foe = f.foe; foe.kind = 'crawler'; at(f, foe, '3,4');
    expect(withGame(f.g, () => previewAttack(f.cb, foe, f.pc, 'shot')).why).toMatch(/never attack/);
    f.turn(f.pc); sure(f.pc); f.unit(f.foe.id).hp = 999; f.unit(f.foe.id).maxHp = 999;
    pcAct(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'shot' });
    expect(withGame(f.g, () => previewAttack(f.cb, f.foe, f.pc, 'shot', { free: true })).ok).toBe(true);
    const lum = PATRONS.find((p) => p.faction === 'lumeri')!; f.g.characters[f.pc.charId!].patron = lum.id;
    const hp = f.pc.hp; withGame(f.g, () => blessing(f.cb, rng(), f.pc, f.pc, { id: 'x', name: 'Light', effects: [], adjudication: 'engine', text: '' }, 1));
    expect(hp - f.pc.hp).toBe(10);
  });
});

describe('Old Timer', () => {
  it('starts a session with 2 Echo; once a session a Rumination check succeeds without the die', () => {
    const s = storyWith([{ traits: ['old_timer'] }]);
    const id = s.chars[0].id; expect(s.g.characters[id].echo).toBe(2);
    const k = storyCheck(s, id, ['rumination'], { tn: 20 });
    s.act({ type: 'story/perk', charId: id, id: 'old_timer', checkId: k.ck.id });
    expect(k.roll()).toMatch(/SUCCESS \(AUTO\)/);
    storyCheck(s, id, ['analysis']);
    expect(() => s.act({ type: 'story/perk', charId: id, id: 'old_timer' })).toThrow(/Used/);
  });
  it('without a full rest: −2 on Body skills until a long rest; −0.5 Movement; −10% max HP', () => {
    const s = storyWith([{ traits: ['old_timer'] }, {}]);
    const id = s.chars[0].id;
    s.act({ type: 'narrator/turn', turn: { narration: 'A cold night.', traitState: [{ charId: id, key: 'no_full_rest', value: true }] } } as any);
    expect(skillRollMod({ c: s.g.characters[id] }, 'athletics').add).toBe(-2);
    expect(skillRollMod({ c: s.g.characters[id] }, 'eloquence').add).toBe(0);
    s.act({ type: 'narrator/turn', turn: { narration: 'You sleep.', rest: { kind: 'long' } } } as any);
    expect(skillRollMod({ c: s.g.characters[id] }, 'athletics').add).toBe(0);
    const [a, b] = s.chars.map((c) => s.g.characters[c.id]);
    expect(movement(a)).toBe(movement(b) - 0.5);
    expect(maxHp(a)).toBe(Math.round(maxHp({ ...a, traits: [] }) * 0.9));
  });
});

describe('The Brightest Light', () => {
  it('Blaze: +10% damage per kill this fight; weapons wear twice as fast; Crashed after the fight until a rest', () => {
    const f = fightWith([{ traits: ['the_brightest_light'] }], [{ at: 'C6' }, { at: 'H6' }]);
    const u = f.turn(f.pc); sure(u); at(f, f.foes[0], '3,4'); f.unit(f.foes[0].id).hp = 1;
    const d0 = u.dur!;
    pcAct(f, { type: 'combat/attack', targetId: f.foes[0].id, mode: 'shot' });
    expect(f.pc.dur).toBe(d0 - 2);
    const pv = withGame(f.g, () => previewAttack(f.cb, f.pc, f.foes[1], 'shot'));
    expect(pv.dmg!.mults.find((m) => /Blaze/.test(m.label))!.v).toBeCloseTo(1.1);
    f.unit(f.foes[1].id).hp = 1; at(f, f.foes[1], '3,5'); f.unit(f.pc.id).ap = 6;
    pcAct(f, { type: 'combat/attack', targetId: f.foes[1].id, mode: 'shot' });
    expect(f.g.phase).toBe('story');
    const c = f.g.characters[f.pc.charId!]; expect(c.state!.crashed).toBe(true);
    expect(skillRollMod({ c }, 'eloquence').add).toBe(-2);
    f.act({ type: 'narrator/turn', turn: { narration: 'You rest.', rest: { kind: 'short' } } } as any);
    expect(f.g.characters[c.id].state!.crashed).toBeFalsy();
  });
});

describe('Squad Anchor', () => {
  it('allies within 2 get +1 Defense and +1 on saves; moving more than 2 tiles drops it and costs 1 AP next turn', () => {
    const f = fightWith([{ traits: ['squad_anchor'] }, {}], [{ at: 'C6' }]);
    const [me, ally] = f.pcs; at(f, me, '1,4'); at(f, ally, '1,6'); at(f, f.foe, '6,5');
    const term = () => withGame(f.g, () => previewAttack(f.cb, f.foe, f.unit(ally.id), 'shot', { free: true })).terms!.some((t) => /Squad Anchor/.test(t.label));
    expect(term()).toBe(true);
    const save = (seed: number) => withGame(f.g, () => { const a = f.unit(ally.id); delete a.conds?.pinned; return applyCond(f.cb, rng(seed), f.foe, a, 'pinned'); });
    const num = (s: string) => Number(/save d20 \d+ [+−]\d+ = (-?\d+) vs/.exec(s)?.[1] ?? NaN);
    let compared = 0;
    for (let seed = 1; seed < 30; seed++) {
      const near = num(save(seed)); at(f, me, '1,10'); const far = num(save(seed)); at(f, me, '1,4');
      if (Number.isNaN(near) || Number.isNaN(far)) continue;
      expect(near).toBe(far + 1); compared++;
    }
    expect(compared).toBeGreaterThan(0);
    f.turn(me);
    pcAct(f, { type: 'combat/move', to: '1,0' });
    expect(term()).toBe(false);
    expect(f.turn(f.pc).ap).toBe(5);
  });
});

describe('Augmented', () => {
  it('pick once; arm: ×1.2 weapon damage; EMP takes it offline for 2 turns', () => {
    const s = storyWith([{ traits: ['augmented'] }]);
    const id = s.chars[0].id;
    s.act({ type: 'story/perk', charId: id, id: 'augmented', actionId: 'augment_pick', choice: 'arm' });
    expect(s.g.characters[id].state!.augment).toBe('arm');
    expect(() => s.act({ type: 'story/perk', charId: id, id: 'augmented', actionId: 'augment_pick', choice: 'eye' })).toThrow();
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'C6' }] } } } as any);
    const cb = s.g.combat!, u = cb.units.find((x) => x.side === 'pc')!, foe = cb.units.find((x) => x.side === 'foe')!;
    expect(withGame(s.g, () => previewAttack(cb, u, foe, 'shot')).dmg!.mults.some((m) => /Augmented arm/.test(m.label))).toBe(true);
    withGame(s.g, () => applyDamage(cb, u, 5, { by: foe, type: 'weapon', dmgType: 'emp' }));
    expect(condOn(u, 'augment_offline')).toBe(true);
    expect(withGame(s.g, () => previewAttack(cb, u, foe, 'shot')).dmg!.mults.some((m) => /Augmented arm/.test(m.label))).toBe(false);
  });
  it('legs: +1 Movement and a jump; eye: +2 Vision; maintenance after a rest', () => {
    const s = storyWith([{ traits: ['augmented'] }, { traits: ['augmented'] }, {}]);
    const [a, b, plain] = s.chars.map((c) => c.id);
    s.act({ type: 'story/perk', charId: a, id: 'augmented', actionId: 'augment_pick', choice: 'legs' });
    s.act({ type: 'story/perk', charId: b, id: 'augmented', actionId: 'augment_pick', choice: 'eye' }, s.g.characters[b].owner);
    expect(movement(s.g.characters[a])).toBe(movement(s.g.characters[plain]) + 1);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'P10' }] } } } as any);
    const cb = s.g.combat!, ua = cb.units.find((x) => x.charId === a)!, ub = cb.units.find((x) => x.charId === b)!, up = cb.units.find((x) => x.charId === plain)!;
    expect(ub.vision).toBe(up.vision! + 2); expect(ub.darkSight).toBe(true); expect(ua.movement).toBe(up.movement + 1);
    const s2 = storyWith([{ traits: ['augmented'] }]);
    s2.act({ type: 'story/perk', charId: s2.chars[0].id, id: 'augmented', actionId: 'augment_pick', choice: 'eye' });
    s2.act({ type: 'narrator/turn', turn: { narration: 'Rest.', rest: { kind: 'long' } } } as any);
    expect(s2.g.story.entries.some((e) => /maintenance on the eye augment/.test(e.text || ''))).toBe(true);
  });
});

describe('Southern Fist', () => {
  it('gloves only: +1 AP a turn and ×1.2 unarmed damage; any other weapon costs +1 AP to attack with', () => {
    const f = fightWith([{ traits: ['southern_fist'], weapon: 'fists' }, { traits: ['southern_fist'] }], [{ at: 'C6' }]);
    const [fist, gun] = f.pcs; at(f, f.foe, '2,5'); at(f, fist, '1,4');
    expect(f.turn(fist).ap).toBe(7);
    const pv = withGame(f.g, () => previewAttack(f.cb, f.unit(fist.id), f.foe, 'melee'));
    expect(pv.dmg!.mults.some((m) => /These Hands/.test(m.label))).toBe(true);
    const g = f.turn(gun);
    expect(withGame(f.g, () => previewAttack(f.cb, g, f.foe, 'shot')).ap).toBe(3);
    expect(withGame(f.g, () => previewAttack(f.cb, g, f.foe, 'melee')).ap).toBe(2);
  });
});

describe('Raised by Orks', () => {
  it('Orks parley first; +20% melee; can\'t read (text-tagged checks fail)', () => {
    const f = fightWith([{ traits: ['raised_by_orks'] }, {}], [{ at: 'C6' }]);
    const foe = f.foe; foe.kind = 'ork'; at(f, foe, '2,4');
    expect(withGame(f.g, () => previewAttack(f.cb, foe, f.pc, 'melee')).why).toMatch(/parley/);
    expect(withGame(f.g, () => previewAttack(f.cb, f.pc, foe, 'melee')).dmg!.mults.some((m) => /Raised by Orks/.test(m.label))).toBe(true);
    const s = storyWith([{ traits: ['raised_by_orks'] }]);
    expect(storyCheck(s, s.chars[0].id, ['rumination'], { tags: ['text'], tn: 8 }).roll()).toMatch(/FAILURE \(AUTO\)/);
  });
});

// ---------- hooks gap (rules 1.3): the core hooks these items were waiting for ----------
describe('hooks gap: lane A', () => {
  it('Squad Anchor: a Downed ally within 2 tiles gets +1 on the death save', () => {
    const f = fightWith([{ traits: ['squad_anchor'] }, { name: 'Ally' }]);
    const [a, b] = f.pcs; a.pos = '2,5'; b.pos = '3,5';
    const ub = f.unit(b.id); ub.hp = 0; ub.downed = true;
    f.turn(ub);
    expect(logHas(f.cb, /death save d20 \d+ \+1/)).toBe(true);
  });
  it('Southern Fist: a burst costs +1 AP (the volley prices its AP through attack_preview)', () => {
    const f = fightWith([{ traits: ['southern_fist'] }], [{ at: 'F5' }]);
    const u = f.pc; u.weapon = 'hellraiser_service_rifle'; u.ammo = 30; u.maxDur = 0; u.jammed = false; u.heat = 0;
    const ap = u.ap; f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'burst' } as any);
    const uu = f.unit(u.id); expect(ap - uu.ap, f.cb.log.slice(-3).join(' | ')).toBe(4);
  });
});
