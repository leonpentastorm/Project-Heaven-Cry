import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, type Sheet, type GameState, apply, deriveCreation, eligibleClasses, levelForXp, maxHp, mod, movement, newCharacter, newGame,
  pendingPerkSteps, validateSheet, viewFor, active, apForTiles, paths, startCombat, MAPS, RuleError, refOf, keyOf, notesAt, BUILT_IN_CAMPAIGNS, validateCampaign, zoneMap, makeObject, moveUnit, damageObject, toggleDoor, storyObjects, mapBrief, positionsOf, combatReport, rollInjury, armPenalty, beginTurn, WEAPON, packOf, reload, analyze, carriedKg, spareMags, previewAttack, lineOfSight, shootCover, pickUp, loadMagazine, coverOf, loadAll,
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

describe('grid references and the story map', () => {
  it('A1 is the top-left tile; columns are letters, rows numbers', () => {
    expect(refOf('0,0')).toBe('A1'); expect(refOf('15,10')).toBe('P11'); expect(refOf('26,0')).toBe('AA1');
    expect(keyOf('c7')).toBe('2,6'); expect(keyOf('Q1', MAPS.rear_pad)).toBeNull(); expect(keyOf('nonsense')).toBeNull();
    expect(mapBrief(MAPS.rear_pad)).toContain('L3–L5: Stacked platinum crates');
    expect(notesAt(MAPS.rear_pad, keyOf('L4')!)[0]).toMatch(/crates/); expect(notesAt(MAPS.yard, keyOf('H2')!)[0]).toMatch(/half cover/);
  });
  it('players move themselves; the Narrator moves them; fights start where they stand', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 's');
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    const id = Object.keys(g.characters)[0];
    expect(refOf(positionsOf(g)[id])).toBe('I4'); // the campaign's first start tile
    g = apply(g, { type: 'story/move', charId: id, to: 'C7' }, 'host'); expect(g.story.positions![id]).toBe('2,6');
    expect(() => apply(g, { type: 'story/move', charId: id, to: 'J7' }, 'host')).toThrow(/in the way/); // the triage line
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', moves: [{ charId: id, to: 'F4' }],
      combat: { name: 'Line', map: 'shield_line', difficulty: 'easy', enemies: [{ name: 'Keel', tier: 'soldier', weapon: 'service_pistol', at: 'J5' }] } } as any }, 'host');
    const u = g.combat!.units.find((x) => x.charId === id)!, k = g.combat!.units.find((x) => x.side === 'foe')!;
    expect(refOf(u.pos)).toBe('F4'); expect(refOf(k.pos)).toBe('J5');
    expect(combatReport(g.combat!)).toContain('MPAT: ' + u.hp + '/' + u.maxHp + ' HP at F4');
  });
});

describe('campaigns', () => {
  it('every built-in campaign is valid', () => {
    for (const c of BUILT_IN_CAMPAIGNS) expect(validateCampaign(c), c.id).toEqual([]);
    expect(validateCampaign({ id: 'x' })).not.toEqual([]);
  });
  it('M813 starts on the shield line (the tutorial); travel keeps each zone as it was left', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 's');
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    expect(g.campaign!.id).toBe('m813'); expect(zoneMap(g).id).toBe('shield_line');
    const skills = new Set(storyObjects(g).flatMap((o) => o.approaches.flatMap((a) => a.skills)));
    expect(skills.size).toBe(27); // every skill has a way in, in the tutorial zone
    expect(storyObjects(g).find((o) => o.kind === 'trap')!.hidden).toBe(true);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', travel: 'rear_pad' } as any }, 'host');
    const ramp = storyObjects(g).find((o) => o.name === 'The loading ramp')!;
    expect(ramp.approaches.length).toBe(5); expect(refOf(ramp.pos)).toBe('M5');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', objects: [{ action: 'remove', id: ramp.id }] } as any }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', travel: 'shield_line' } as any }, 'host');
    expect(storyObjects(g).some((o) => o.name === 'Sergeant Nine-Nine')).toBe(true);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', travel: 'rear_pad' } as any }, 'host');
    expect(storyObjects(g).some((o) => o.name === 'The loading ramp')).toBe(false); // still gone
  });
  it('no walking through walls or closed doors: wall corners and story moves', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 's');
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', travel: 'outpost_1' } as any }, 'host');
    const id = Object.keys(g.characters)[0];
    expect(() => apply(g, { type: 'story/move', charId: id, to: 'P2' }, 'host')).toThrow(/no way through/); // behind the locked security door
    g = apply(g, { type: 'story/move', charId: id, to: 'D7' }, 'host');
    const map = zoneMap(g), cb = startCombat('t', map, [{ c: g.characters[id], pos: '4,3' }], [], 'easy', { state: 1 }, storyObjects(g));
    expect(paths(cb, '4,3', cb.units[0].id).dist['5,4']).toBeUndefined(); // E4 to F5 squeezes between the office walls
  });
  it('a host can load their own campaign file in the lobby', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 's');
    const mine = { ...JSON.parse(JSON.stringify(BUILT_IN_CAMPAIGNS[4])), id: 'mine', title: 'My Campaign' };
    g = apply(g, { type: 'campaign/load', campaign: mine } as any, 'host');
    expect(g.settings.start).toBe('mine');
    expect(() => apply(g, { type: 'campaign/load', campaign: { id: 'bad' } } as any, 'host')).toThrow(/problems/);
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id) }, 'host'); g = apply(g, { type: 'session/start' }, 'host');
    expect(g.campaign!.title).toBe('My Campaign');
  });
});

describe('map objects and points of interest', () => {
  it('traps spring, barrels explode, doors block until opened', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const cb = startCombat('t', 'yard', [{ c, pos: '1,1' }], [{ name: 'E', tier: 'minion', weapon: 'service_pistol', at: 'P1' }], 'easy', { state: 3 },
      [makeObject('t1', 'trap', '3,1'), makeObject('b1', 'barrel', '13,1'), makeObject('d1', 'door', '1,3')]);
    const u = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
    u.ap = 9; u.vigilant = 0; const hp = u.hp;
    expect(moveUnit(cb, u, '5,1')).toBeNull();
    expect(u.pos).toBe('3,1'); expect(u.hp).toBeLessThan(hp); // stopped on the hidden trap
    e.pos = '14,1'; const ehp = e.hp; damageObject(cb, '13,1', 99);
    expect(e.hp).toBeLessThan(ehp); expect(cb.objects!.some((o) => o.kind === 'fire' && o.pos === '13,1')).toBe(true);
    u.pos = '1,2'; u.ap = 9;
    expect(paths(cb, u.pos, u.id).dist['1,3']).toBeUndefined(); // closed door blocks
    expect(toggleDoor(cb, u, '1,3')).toBeNull(); expect(paths(cb, u.pos, u.id).dist['1,3']).toBe(1);
  });
  it('POIs: the Narrator writes approaches, players try them, success acts by itself, tries are kept', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 's');
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A barricade.', objects: [{ action: 'place', id: '', kind: 'barricade', at: 'L4', name: 'Rune-marked barricade', text: 'Welded plates, a rune scratched in.',
      approaches: [{ label: 'Break it down', skills: ['raw_power', 'durability'], tn: 8, stakes: 'Smash through.', success: 'remove' }, { label: 'Read the rune', skills: ['ingenuity', 'lore_master'], tn: 12, stakes: 'What is it warding?', success: '' }] }] } as any }, 'host');
    const bar = storyObjects(g).find((o) => o.kind === 'barricade')!;
    expect(refOf(bar.pos)).toBe('L4'); expect(bar.approaches).toHaveLength(2);
    expect(() => apply(g, { type: 'poi/try', charId: id, objId: bar.id, idx: 0 }, 'host')).toThrow(/Walk up/);
    g = apply(g, { type: 'story/move', charId: id, to: 'K4' }, 'host');
    g = apply(g, { type: 'poi/try', charId: id, objId: bar.id, idx: 0 }, 'host');
    const ck = g.checks.find((k) => k.poi)!; expect(ck.skills).toEqual(['raw_power', 'durability']); expect(ck.tn).toBe(8);
    g = apply(g, { type: 'check/roll', checkId: ck.id }, 'host'); g = apply(g, { type: 'check/accept', checkId: ck.id }, 'host');
    const after = storyObjects(g).find((o) => o.id === bar.id);
    const ok = g.checks.find((k) => k.id === ck.id)!.roll!.ok;
    if (ok) expect(after).toBeUndefined(); else expect(after!.approaches[0].tries[0].name).toBe('MPAT');
    expect(g.story.await).toBe('narrator'); // the attempt was MPAT's turn this round
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
    expect(MAPS.rear_pad.cover.length).toBe(3); expect(MAPS.rear_pad.full).toEqual(['10,6']);
  });
  it('injuries: the d6 table, arm penalties by hand, half Movement once, bleeding', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const seen = new Set<string>();
    for (let seed = 1; seed < 400 && seen.size < 4; seed++) {
      const cb = startCombat('t', 'yard', [{ c }], [{ name: 'E', tier: 'minion', weapon: 'service_pistol' }], 'easy', { state: 7 });
      const u = cb.units.find((x) => x.side === 'foe')!, mv = u.movement;
      const line = rollInjury({ state: seed }, u);
      if (/head/.test(line)) { expect(u.dazedNext).toBe(1); seen.add('head'); }
      if (/torso/.test(line)) { expect(u.bleed).toBe(3); seen.add('torso'); }
      if (/arm/.test(line)) { expect(u.injuries![0].loc).toBe('arm'); seen.add('arm'); }
      if (/leg/.test(line)) { expect(u.movement).toBe(mv / 2); rollInjury({ state: seed }, u); expect(u.movement).toBe(mv / 2); seen.add('leg'); }
    }
    expect(seen.size).toBe(4);
    const cb = startCombat('t', 'yard', [{ c }], [], 'easy', { state: 3 });
    const u = cb.units[0];
    u.injuries = [{ loc: 'arm', side: 'left' }];
    expect(armPenalty(u, WEAPON.service_pistol)).toBe(0); // pistol in the right hand
    expect(armPenalty(u, WEAPON.hellraiser_service_rifle)).toBe(-2); // two hands
    u.injuries = [{ loc: 'arm', side: 'right' }];
    expect(armPenalty(u, WEAPON.service_pistol)).toBe(-2);
    u.bleed = 3; const hp = u.hp; cb.order = [u.id]; cb.turn = 0; beginTurn(cb, { state: 1 });
    expect(u.hp).toBe(hp - 5); expect(u.bleed).toBe(2);
    expect(movement({ ...c, injuries: [{ loc: 'leg', side: 'left' }] })).toBe(movement(c) / 2);
    expect(packOf(c).map((x) => x.id)).toContain('field_kit');
  });
  it('reloading uses up magazines and drops the one in the gun, rounds and all', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id)); // medic kit: pistol, 2 spare magazines
    expect(spareMags(c)).toEqual([12, 12]);
    const cb = startCombat('t', 'yard', [{ c }], [], 'easy', { state: 3 });
    const u = cb.units[0]; u.ap = 6;
    u.ammo = 5; expect(reload(cb, u)).toBeNull();
    expect(u.ammo).toBe(12); expect(u.mags).toEqual([12]); expect(cb.floor![0].text).toBe('magazine with 5 rounds');
    u.ammo = 0; expect(reload(cb, u)).toBeNull(); expect(cb.floor![1].text).toBe('empty magazine'); expect(u.mags).toEqual([]);
    u.ammo = 3; expect(reload(cb, u)).toMatch(/No loaded spare magazines/);
  });
  it('weights: everything counts, down to the round', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const k = carriedKg(c);
    // pistol 1 + empty magazine 0.1 + 12 rounds × 0.01; Medium armour 8; 2 magazines (0.2 + 24 × 0.01), field kit 1.5, 3 stims 0.3, Essence 0.1
    expect(k.weapon).toBeCloseTo(1.22, 5); expect(k.armour).toBe(8); expect(k.pack).toBeCloseTo(0.44 + 0.24 + 1.5 + 0.3 + 0.1, 5); // + 24 loose rounds
  });
  it('cover: half is −5 and can be shot to rubble; full blocks sight', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const cb = startCombat('t', 'yard', [{ c }], [{ name: 'E', tier: 'minion', weapon: 'service_pistol' }], 'easy', { state: 3 });
    const u = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
    u.ap = 9; u.pos = '1,3'; e.pos = '6,3'; // half cover at 5,3 sits between them
    const open = previewAttack(cb, u, { ...e, pos: '6,1' } as any, 'shot'), behind = previewAttack(cb, u, e, 'shot');
    expect(behind.cover).toBe(5); expect(behind.toHit).toBe(open.toHit - 5);
    expect(lineOfSight(cb, '9,6', '11,6')).toBe(false); // full cover at 10,6
    expect(lineOfSight(cb, '4,3', '6,3')).toBe(true);  // half cover doesn't block sight
    while (coverOf(cb)['5,3']) { u.ap = 9; expect(shootCover(cb, u, '5,3', c)).toBeNull(); }
    expect(shootCover(cb, u, '5,3', c)).toMatch(/Nothing there/);
    expect(coverOf(cb)['5,3']).toBeUndefined(); expect(cb.objects!.some((o) => o.kind === 'rubble' && o.pos === '5,3')).toBe(true);
    expect(previewAttack(cb, u, e, 'shot').coverTile).toBe('5,4'); // the crate beside it still protects
  });
  it('picking up and loading magazines', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const cb = startCombat('t', 'yard', [{ c }], [], 'easy', { state: 3 });
    const u = cb.units[0]; u.ap = 6; u.ammo = 0;
    reload(cb, u); expect(u.mags).toEqual([12]);
    u.ap = 6; expect(pickUp(cb, u, u.pos)).toBeNull(); expect(u.mags).toEqual([12, 0]); expect(u.ap).toBe(5);
    expect(loadMagazine(cb, u)).toBeNull(); // 12 rounds at 5 a point: 3 AP
    expect(u.mags).toEqual([12, 12]); expect(u.loose).toBe(12); expect(u.ap).toBe(2);
    c.pack = packOf(c).map((x) => (x.mags ? { ...x, mags: [0, 5] } : x));
    expect(loadAll(c)).toBe(19); expect(spareMags(c)).toEqual([12, 12]);
  });
  it('Analyze: 2 AP, range 4 + Analysis, line of sight, shared with the squad', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const cb = startCombat('t', 'yard', [{ c }], [{ name: 'E', tier: 'soldier', weapon: 'service_pistol' }], 'easy', { state: 3 });
    const u = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
    u.ap = 6; u.analysis = 0; u.pos = '1,5'; e.pos = '9,5';
    expect(analyze(cb, u, e)).toMatch(/range/);
    e.pos = '4,5'; expect(analyze(cb, u, e)).toBeNull(); expect(u.ap).toBe(4); expect(e.analyzedBy).toBe(u.name); expect(e.weakPoint).toBe(false);
    expect(analyze(cb, u, e)).toMatch(/already/);
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
