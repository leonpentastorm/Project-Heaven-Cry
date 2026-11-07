// The hooks-gap pass (rules 1.3): core hooks the lanes asked for, each tested through the item that needed it.
import { describe, expect, it } from 'vitest';
import { harm, applyCond, blessing, emitStory, newRound, setStoryCond, glyphCost, condOn, throwItem, type Combat } from '../src';
import { fightWith, storyWith, withGame, rng } from './helpers/perkfight';

const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));

describe('spell damage goes through damage_out (A4, F3)', () => {
  it('Pain Eater (Bloodied) multiplies a Soul hit once, before armour', () => {
    const f = fightWith([{ traits: ['pain_eater'] }]);
    const pc = f.pc, foe = f.foe; pc.hp = Math.floor(pc.maxHp / 2) - 1; foe.hp = foe.maxHp = 500; foe.shield = 0;
    withGame(f.g, () => harm(f.cb, rng(), pc, foe, 20, 'soul'));
    expect(500 - foe.hp).toBe(30);
  });
  it('damage with no attacker (a hazard) gets no attacker multipliers', () => {
    const f = fightWith([{ traits: ['pain_eater'] }]);
    const foe = f.foe; foe.hp = foe.maxHp = 500; foe.shield = 0; f.pc.hp = Math.floor(f.pc.maxHp / 2) - 1;
    withGame(f.g, () => harm(f.cb, rng(), null, foe, 20, 'soul'));
    expect(500 - foe.hp).toBe(20);
  });
});

describe('blessing_in power (A5, F5)', () => {
  it('Factory Made: a healing Blessing works at half power, and its heal is not halved again', () => {
    const f = fightWith([{ traits: ['factory_made'] }, { name: 'Priest' }]);
    const [me, priest] = f.pcs; me.hp = 1;
    const bl = { name: 'Mend', text: 'Heal 40.', adjudication: 'engine', effects: [{ op: 'stat_mod', stat: 'hp', value: 40 }] };
    withGame(f.g, () => blessing(f.cb, rng(), priest, me, bl, 1));
    expect(me.hp).toBe(1 + 20);
  });
});

describe('cost refusals (D2, D5, K5)', () => {
  it('glyph_cost fail refuses with its own reason, not "Needs 99 AP"', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'sigil', traits: ['sigil_savant'] }]);
    const c = f.g.characters[f.pc.charId!]; (c.state ||= {}).sigil_savant = { practised: [] };
    const gc = withGame(f.g, () => glyphCost(f.cb, f.pc, 'fire'));
    expect(gc.fail).toMatch(/practised/); expect(gc.ap).toBeLessThan(99);
  });
});

describe('death saves ask every unit (A2)', () => {
  it('an ally Squad Anchor gives a Downed unit +1', () => {
    const f = fightWith([{ traits: ['squad_anchor'] }, { name: 'Ally' }]);
    const [a, b] = f.pcs; a.pos = '2,5'; b.pos = '2,6'; b.hp = 0; b.downed = true;
    f.turn(b);
    expect(logHas(f.cb, /death save d20 \d+ \+1/)).toBe(true);
  });
});

describe('volleys price their AP through the items (A6, I2)', () => {
  it('Fire Discipline: the first burst a turn is 2 AP, the next 3', () => {
    const f = fightWith([{ classId: 'marksman', level: 3, weapon: 'hellraiser_service_rifle' }], [{ at: 'F5' }]);
    const u = f.turn(f.pc); f.unit(u.id).maxDur = 0;
    const ap = f.unit(u.id).ap;
    f.act({ type: 'combat/attack', unitId: u.id, targetId: f.foe.id, mode: 'burst' } as any);
    const one = ap - f.unit(u.id).ap; expect(one).toBe(2);
  });
});

describe('Siege Engine prices breaking cover (A1)', () => {
  it('shooting cover costs 1 AP less (at least 1)', () => {
    const f = fightWith([{ perks: { siege_engine: 'achieved' }, weapon: 'hellraiser_service_rifle' }], [{ at: 'O10' }]);
    const u = f.turn(f.pc), cb = f.cb;
    cb.objects = [...(cb.objects || []), { id: 'bx', kind: 'crate', name: 'Crate', pos: '4,5', hp: 40 } as any];
    f.unit(u.id).pos = '2,5'; f.unit(u.id).maxDur = 0; const ap = f.unit(u.id).ap;
    f.act({ type: 'combat/shoot-cover', unitId: u.id, tile: '4,5' } as any);
    expect(ap - f.unit(u.id).ap).toBeLessThanOrEqual(1);
  });
});

describe('the story side', () => {
  it('stay_hidden auto: Every Lie Is a Door succeeds with no roll', () => {
    const s = storyWith([{ perks: { every_lie_is_a_door: 'ultimate' } }]);
    const c = s.g.characters[s.chars[0].id]; (c.state ||= {}).lie_door = 'We are the inspectors.';
    const out: any = emitStory(s.g, 'stay_hidden', { c, npc: { id: 'n1', name: 'Guard', tier: 'soldier' }, mod: 0, tn: 30, g: s.g });
    expect(out.auto).toBe('success');
  });
  it('a Shaken NPC gives everyone +2 on social checks against them (F2)', () => {
    const s = storyWith([{}]); const id = s.chars[0].id;
    s.act({ type: 'narrator/turn', turn: { narration: 'He shakes.', conditions: [{ target: 'Keel', id: 'shaken' }], checks: [{ charId: id, skills: ['charisma'], tn: 12, stakes: 'Talk.', tags: ['dialogue'], target: 'Keel' }] } } as any);
    const ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
    const done = s.g.checks.find((k) => k.id === ck.id)!;
    expect((done.mods || []).some((m: any) => /Keel is Shaken/.test(m.label) && m.add === 2)).toBe(true);
  });
  it('a session Shaken comes into a fight, and stays a session Shaken after it (F1)', () => {
    const s = storyWith([{}]); const id = s.chars[0].id;
    setStoryCond(s.g, s.g.characters[id], 'shaken', 'session');
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'easy', enemies: [{ name: 'Foe', tier: 'minion', weapon: 'service_pistol', at: '' }] } } } as any);
    const u = s.g.combat!.units.find((x) => x.charId === id)!;
    expect(condOn(u, 'shaken')).toBe(true);
  });
  it('Southern Fist: +1 AP on the area map round (round_ap)', () => {
    const s = storyWith([{ traits: ['southern_fist'], weapon: 'fists' }]); const id = s.chars[0].id;
    s.g.characters[id].weapon = 'fists'; (s.g.characters[id] as any).offHand = null;
    withGame(s.g, () => newRound(s.g));
    expect(s.g.story.ap?.[id]).toBe(7);
  });
  it('a character locked in mid-session hears session_start (Old Timer: +1 Echo, A14)', () => {
    const s = storyWith([{}]);
    const g = s.g, sheet = { name: 'Late', portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: ['old_timer'], skills: { ...s.chars[0].skills }, attrs: { ...s.chars[0].attrs }, cores: { ...s.chars[0].cores }, identity: {} } as any;
    s.act({ type: 'char/add', sheet }); void g;
    const late = Object.values(s.g.characters).find((c) => c.name === 'Late')!;
    expect(late.echo).toBe(2);
  });
});

describe('throw cancel (C1)', () => {
  it('a caught grenade never goes off', () => {
    const f = fightWith([{ perks: { catch: 'I' } }], [{ at: 'H6' }]);
    const pc = f.pc, foe = f.foe; (foe as any).throwables = { incendiary_grenade: 1 }; foe.ap = 6;
    const was = (f.cb.objects || []).length;
    withGame(f.g, () => throwItem(f.cb, rng(), foe, 'incendiary_grenade', pc.pos));
    expect((f.cb.objects || []).length).toBe(was);
    expect(logHas(f.cb, /catches it/)).toBe(true);
  });
});

describe('injury hook (A9)', () => {
  it('Walking Wounded: a critical\'s head injury keeps no Daze', () => {
    const f = fightWith([{ perks: { walking_wounded: 'mastered' } }]);
    const u = f.pc;
    withGame(f.g, () => { for (let s = 1; s < 40; s++) applyCond(f.cb, rng(s), f.foe, u, 'injured'); });
    expect(u.dazedNext || 0).toBe(0);
  });
});
