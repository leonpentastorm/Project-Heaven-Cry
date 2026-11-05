import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, type Sheet, type GameState, apply, deriveCreation, eligibleClasses, levelForXp, maxHp, mod, movement, newCharacter, newGame,
  pendingPerkSteps, validateSheet, viewFor, active, apForTiles, paths, startCombat, MAPS, RuleError,
} from '../src';

const sheetFrom = (archId: string, name = 'Test'): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};

describe('spec tables', () => {
  it('skill modifier: −2 at 0, else points − 1 (Core resolution)', () => {
    expect([0, 1, 2, 3, 5, 7, 10].map(mod)).toEqual([-2, 0, 1, 2, 4, 6, 9]);
  });
  it('XP table levels (Levels and XP)', () => {
    expect(levelForXp(0)).toBe(1); expect(levelForXp(249)).toBe(2); expect(levelForXp(250)).toBe(3); expect(levelForXp(15250)).toBe(20);
  });
  it('HP and movement (Derived stats)', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    c.attrs.endurance = 3; c.skills.durability = 2; c.level = 3;
    expect(maxHp(c)).toBe(100 + 15 * 2 + 2 * (5 + 4));
    c.attrs.agility = 3; c.armourClass = 0; expect(movement(c)).toBe(2);
    c.armourClass = 5; expect(movement(c)).toBe(1);
  });
});

describe('creation', () => {
  it('every archetype is a legal, fully spent sheet', () => {
    for (const a of ARCHETYPES) expect(validateSheet(sheetFrom(a.id)), a.id).toBeNull();
  });
  it('rejects unspent points and broken trees', () => {
    expect(validateSheet({ ...sheetFrom(ARCHETYPES[0].id), skills: { durability: 3 } })).toMatch(/Spend all 10/);
    expect(deriveCreation({ durability: 8 }).ok).toBe(false);
  });
  it('a 7/1/1 build is legal (no creation caps)', () => {
    const allIn = ARCHETYPES.find((x) => x.family === 'all_in')!;
    expect(validateSheet(sheetFrom(allIn.id))).toBeNull();
  });
});

describe('classes and perk steps', () => {
  it('closest-class rule offers the two highest totals', () => {
    const e = eligibleClasses({ sensory: 3, camaraderie: 3, proficiency: 2, athletics: 2 });
    expect(e[0].id).toBe('medic');
  });
  it('one perk step per Mastery level', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    c.skills = { camaraderie: 5 };
    expect(pendingPerkSteps(c)[0].choices.length).toBe(2);
  });
});

describe('combat', () => {
  it('movement cost: tiles ÷ Movement, rounded up, with carry-over', () => {
    expect(apForTiles(4, 0, 1)).toBe(4); expect(apForTiles(3, 0, 2)).toBe(2); expect(apForTiles(3, 1, 2)).toBe(1);
  });
  it('wreck tiles count double on the rear pad', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const cb = startCombat('t', 'rear_pad', [{ c }], [{ name: 'E', tier: 'minion', weapon: 'service_pistol' }], 'easy', { state: 1 });
    const u = cb.units[0]; u.pos = '1,8';
    expect(paths(cb, u.pos, u.id).dist['1,9']).toBe(2);
    expect(MAPS.rear_pad.cover.length).toBe(4);
  });
});

// A full scripted session: lobby → story → checks → XP → level 3 → class → combat to the end.
function play(seed: string) {
  let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
  const act = (a: any, by = 'host') => { g = apply(g, a, by); };
  act({ type: 'player/join', id: 'p2', name: 'Friend' });
  act({ type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') });
  act({ type: 'char/add', sheet: sheetFrom(ARCHETYPES.find((a) => a.family !== 'all_in' && a.preset.dexterity)?.id || ARCHETYPES[1].id, 'Ninety-Two') }, 'p2');
  act({ type: 'session/start' });
  const [mpat, ninety] = Object.values(g.characters);
  act({ type: 'narrator/begin' });
  act({ type: 'narrator/turn', turn: { narration: 'The rear pad. One ship, loading.', sceneTitle: 'The rear pad', hooks: [{ skill: 'camaraderie', tn: 8, truth: 'true', line: 'They will not leave you.' }] } });
  expect(g.story.await).toBe('players');
  expect(() => apply(g, { type: 'story/speak', text: 'x' }, 'nobody')).toThrow(RuleError);
  act({ type: 'story/speak', text: 'I walk up the ramp.' });
  act({ type: 'story/speak', text: 'I cover him.' }, 'p2');
  expect(g.story.await).toBe('narrator');
  act({ type: 'narrator/turn', turn: { narration: 'Keel blocks the ramp.', checks: [{ charId: mpat.id, skills: ['authority', 'camaraderie'], tn: 12, stakes: 'Stare him down.' }], xp: [{ charId: 'all', source: 'quest', amount: 250 }] } });
  expect(g.story.await).toBe('rolls');
  act({ type: 'check/roll', checkId: g.checks[0].id });
  expect(g.story.await).toBe('rolls');
  act({ type: 'check/accept', checkId: g.checks[0].id });
  expect(g.story.await).toBe('narrator');
  expect(g.characters[mpat.id].level).toBe(3);
  const cls = eligibleClasses(g.characters[mpat.id].skills)[0].id;
  act({ type: 'levelup/class', charId: mpat.id, classId: cls });
  act({ type: 'narrator/turn', turn: { narration: 'Guns come up.', combat: { name: 'Rear pad', difficulty: 'easy', enemies: [{ name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }, { name: 'Keel', tier: 'soldier', weapon: 'drifter_revolver' }] } } });
  expect(g.phase).toBe('combat');
  // Players: shoot the nearest hostile they can, else close in, else end the turn.
  for (let i = 0; i < 400 && g.phase === 'combat'; i++) {
    const cb = g.combat!, u = active(cb)!, owner = g.characters[u.charId!].owner;
    const foe = cb.units.find((t) => t.side === 'foe' && !t.dead && !t.downed);
    try { act({ type: 'combat/attack', unitId: u.id, targetId: foe!.id, mode: 'shot' }, owner); continue; } catch { /* fall through */ }
    try { if (u.ammo === 0) { act({ type: 'combat/reload', unitId: u.id }, owner); continue; } } catch { /* */ }
    const P = paths(cb, u.pos, u.id), step = Object.keys(P.dist).filter((k) => k !== u.pos && apForTiles(P.dist[k], u.bank, u.movement) <= u.ap)
      .sort((a, b) => Number(b.split(',')[0]) - Number(a.split(',')[0]))[0];
    try { if (step && u.ap >= 3) { act({ type: 'combat/move', unitId: u.id, to: step }, owner); continue; } } catch { /* */ }
    act({ type: 'combat/end-turn', unitId: u.id }, owner);
  }
  return { g, mpat: mpat.id, ninety: ninety.id };
}

describe('a full session', () => {
  it('plays from lobby to the end of a fight', () => {
    const { g } = play('seed-1');
    expect(g.phase).toBe('story');
    expect(g.combat?.over).toBeTruthy();
    expect(g.story.work?.kind).toBe('combat_end');
  });
  it('is deterministic: same seed, same log', () => {
    expect(JSON.stringify(play('seed-2').g)).toBe(JSON.stringify(play('seed-2').g));
  });
  it('keeps voices private', () => {
    const { g } = play('seed-3');
    const voices = g.story.entries.filter((e) => e.kind === 'voice');
    expect(voices.every((e) => e.to)).toBe(true);
    const v = viewFor(g, 'p2');
    expect(v.story.entries.some((e) => e.to && e.to !== 'p2')).toBe(false);
    expect(v.story.scene.hooks.length).toBe(0);
  });
});
