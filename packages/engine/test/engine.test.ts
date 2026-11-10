import { describe, expect, it } from 'vitest';
import {
  PORTRAIT_MAX, SHEET_REV,
  ARCHETYPES, votesOf, rerollFrom, memoryOf, recall, SCENES_PER_CHAPTER, apLeft, npcsOf, momentsOpen, wikiKinds, wikiLookup, wikiEntries, ytId, ytStart, songOf, musicFor, startSong, songMod, type Sheet, type GameState, apply, resolveAttack, deriveCreation, eligibleClasses, levelForXp, maxHp, mod, movement, newCharacter, newGame,
  standable, loadedOf, pendingPerkSteps, validateSheet, viewFor, active, apForTiles, paths, startCombat, MAPS, RuleError, overweightKg, equip, fitMod, useWeaponSkill, fieldRepair, pairedAttack, defense, visibility, shove, toggleProne, setOverwatch, fireBurst, brace, refOf, keyOf, notesAt, BUILT_IN_CAMPAIGNS, validateCampaign, zoneMap, makeObject, moveUnit, damageObject, toggleDoor, storyObjects, mapBrief, positionsOf, combatReport, rollInjury, armPenalty, beginTurn, WEAPON, packOf, reload, analyze, carriedKg, spareMags, previewAttack, lineOfSight, shootCover, pickUp, loadMagazine, coverOf, loadAll,
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
    c.attrs.endurance = 3; c.skills.pain_threshold = 2; c.level = 3; // rules 1.13: HP a level reads Pain Threshold
    expect(maxHp(c)).toBe(100 + 15 * 2 + 2 * (5 + 4));
    c.attrs.agility = 3; c.armourClass = 0; expect(movement(c)).toBe(2);
    c.armourClass = 5; expect(movement(c)).toBe(1);
  });
});

describe('creation', () => {
  it('a room refuses a portrait bigger than its small copy (Character files)', () => {
    let g = newGame('PRT1', { id: 'host', name: 'Host' });
    expect(() => apply(g, { type: 'char/add', sheet: { ...sheetFrom(ARCHETYPES[0].id, 'Big'), portrait: 'data:image/jpeg;base64,' + 'A'.repeat(PORTRAIT_MAX) } }, 'host')).toThrow(/too big/);
    g = apply(g, { type: 'char/add', sheet: { ...sheetFrom(ARCHETYPES[0].id, 'Small'), portrait: 'data:image/jpeg;base64,' + 'A'.repeat(30000) } }, 'host');
    expect(Object.values(g.characters).length).toBe(1);
    const big = sheetFrom(ARCHETYPES[0].id, 'Wordy'); big.identity = { history: 'x'.repeat(40000) } as any;
    expect(() => apply(g, { type: 'char/add', sheet: big }, 'host')).toThrow(/too much text/);
    const half = sheetFrom(ARCHETYPES[0].id, 'Half'); const k = Object.keys(half.skills)[0]; half.skills[k] -= 0.5;
    expect(validateSheet(half)).toMatch(/whole numbers/);
  });
  it('rewordings count in the spend but not as Narrator turns', () => {
    let g = newGame('USE1', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'narrator/usage', input: 10, output: 10, cacheRead: 0, costUsd: 0.2 }, 'host');
    g = apply(g, { type: 'narrator/usage', input: 10, output: 10, cacheRead: 0, costUsd: 0.01, kind: 'rewrite' }, 'host');
    const u = g.narrator.usage;
    expect(u.calls).toBe(1); expect(u.rewrites).toBe(1); expect(u.costUsd).toBeCloseTo(0.21); expect(u.last).toBe(0.2); expect(u.recent).toEqual([0.2]);
  });
  it('every archetype is a legal, fully spent sheet', () => {
    for (const a of ARCHETYPES) expect(validateSheet(sheetFrom(a.id)), a.id).toBeNull();
  });
  it('rejects unspent points and broken trees', () => {
    expect(validateSheet({ ...sheetFrom(ARCHETYPES[0].id), skills: { durability: 3 } })).toMatch(/Spend all 10/);
    expect(deriveCreation({ durability: 8 }).ok).toBe(false);
  });
  it('a Core point can\'t be traded for Attribute points (rules 1.11): 6/1/1 with 12 Attribute points is refused', () => {
    const d = deriveCreation({ durability: 6 }, { endurance: 6, strength: 6, agility: 3 }, { body: 6 });
    expect(d.attrSpent).toBe(12); expect(d.traded).toBe(0); expect(d.ok).toBe(false);
    expect(deriveCreation({ durability: 6 }, { endurance: 6, strength: 6 }, { body: 7 }).ok).toBe(true); // 10 Attribute, 6 Core
  });
  it('Mind Without Fog gives 1 more Core point at creation (rules 1.11; it was 2)', () => {
    expect(deriveCreation({ durability: 8 }, {}, {}, 7).ok).toBe(true);  // 8/1/1 with the trait's point
    const base = sheetFrom(ARCHETYPES.find((x) => x.family === 'all_in')!.id);
    const fog = { ...base, traits: ['mind_without_fog'], cores: { ...base.cores, mind: 2 }, rulesRev: SHEET_REV };
    expect(validateSheet(fog as any)).toBeNull();
    expect(validateSheet({ ...fog, cores: { ...base.cores, mind: 3 } } as any)).toMatch(/break the tree or the budgets/);
  });
  it('a sheet locked in before 1.11 (no rulesRev) stays legal by the budgets of its day (item 931)', () => {
    const base = sheetFrom(ARCHETYPES.find((x) => x.family === 'all_in')!.id);
    const oldFog = { ...base, traits: ['mind_without_fog'], cores: { ...base.cores, mind: 3 } }; // 8 Core points
    expect((oldFog as any).rulesRev).toBeUndefined(); expect(validateSheet(oldFog as any)).toBeNull();
    const a0 = ARCHETYPES[0], s0 = sheetFrom(a0.id);
    const traded = { ...s0, skills: { durability: 6, guts: 4 }, attrs: { endurance: 6, strength: 6, agility: 3 }, cores: { body: 6, mind: 1, soul: 1 } }; // 5 Core, 12 Attribute
    expect(validateSheet(traded as any)).toBeNull();
    expect(validateSheet({ ...traded, rulesRev: SHEET_REV } as any)).toMatch(/break the tree or the budgets|Place every/);
    const c = newCharacter('x', 'p', oldFog as any); expect(c.cores.mind).toBe(3);
  });
  it('a 7/1/1 build is legal (no creation caps)', () => {
    const allIn = ARCHETYPES.find((x) => x.family === 'all_in')!;
    expect(validateSheet(sheetFrom(allIn.id))).toBeNull();
  });
});

describe('classes and perk steps', () => {
  it('the class of the highest attribute (Class Roster Revision 3)', () => {
    const e = eligibleClasses({ attrs: { endurance: 2, insight: 5, virtue: 3 } });
    expect(e.map((x) => x.id)).toEqual(['bard']);
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
    expect(() => apply(g, { type: 'story/move', charId: id, to: 'G4' }, 'host')).toThrow(/round to open/); // the Narrator is opening
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'The guns stop.' } as any }, 'host');
    g = apply(g, { type: 'story/move', charId: id, to: 'H5' }, 'host'); expect(g.story.positions![id]).toBe('7,4');
    expect(g.story.ap![id]).toBe(5); expect(g.story.trail![id]).toEqual(['8,3', '7,4']);
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
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'The guns stop.' } as any }, 'host'); // the opening
    const id0 = Object.keys(g.characters)[0], exit = storyObjects(g).find((o) => o.to === 'rear_pad')!;
    expect(exit.name).toBe('To Outpost-813 rear landing pad');
    g.story.positions![id0] = '14,5'; // O6, next to the exit
    g = apply(g, { type: 'poi/travel', charId: id0, objId: exit.id }, 'host');
    expect(g.story.entries.at(-1)!.text).toMatch(/asks to travel to Outpost-813 rear landing pad/);
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

describe('vision, stances and reactions', () => {
  const setup = (dark = false) => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const map = { ...MAPS.yard, dark, cover: [], full: [] };
    const cb = startCombat('t', map, [{ c, pos: '1,5' }], [{ name: 'E', tier: 'soldier', weapon: 'hellraiser_service_rifle', at: 'J6' }], 'easy', { state: 5 }, []);
    const u = cb.units.find((x) => x.side === 'pc')!; u.weapon = 'hellraiser_service_rifle'; u.ammo = 24; u.ap = 9;
    return { c, cb, u, e: cb.units.find((x) => x.side === 'foe')! };
  };
  it('darkness halves sight; fog hides what nobody sees; Sensory senses what is close', () => {
    let { cb, u, e } = setup(false); u.vision = 12; e.pos = '11,5';
    expect(visibility(cb).seen.has(e.id)).toBe(true);
    ({ cb, u, e } = setup(true)); u.vision = 12; u.sensory = 3; e.pos = '11,5';
    const v = visibility(cb); expect(v.seen.has(e.id)).toBe(false); expect(previewAttack(cb, u, e, 'shot').why).toMatch(/can't see/);
    e.pos = '3,5'; expect(visibility(cb).sensed.has(e.id)).toBe(false); expect(visibility(cb).seen.has(e.id)).toBe(true); // 2 tiles: within half sight
  });
  it('prone, shove, brace, burst, overwatch and opportunity attacks', () => {
    const { cb, u, e, c } = setup(false); u.ap = 9; e.pos = '2,5';
    const base = previewAttack(cb, u, e, 'shot').toHit; e.prone = true;
    expect(previewAttack(cb, u, e, 'shot').toHit).toBe(base - 2); expect(previewAttack(cb, u, e, 'melee').toHit).toBeGreaterThan(previewAttack({ ...cb } as any, u, { ...e, prone: false } as any, 'melee').toHit);
    e.prone = false; u.strength = 20; expect(shove(cb, { state: 3 }, u, e)).toBeNull(); expect(e.pos).toBe('3,5');
    u.ap = 9; expect(fireBurst(cb, { state: 9 }, u, e, c)).toBeNull(); expect(u.ap).toBe(6);
    u.ap = 9; expect(brace(cb, u)).toMatch(/nothing to brace/); // weapon-granted (plan 2.9): only heavy weapons brace
    const w0 = u.weapon; u.weapon = 'hellraiser_lmg'; expect(brace(cb, u)).toBeNull(); expect(u.braced).toBe(true); u.weapon = w0;
    expect(toggleProne(cb, u)).toBeNull(); expect(moveUnit(cb, u, '1,6')).toMatch(/Stand up/); toggleProne(cb, u);
    // overwatch: e moves in sight and takes the shot
    u.ap = 9; e.pos = '8,5'; expect(setOverwatch(cb, u, 'shot')).toBeNull(); e.ap = 9;
    const before = cb.log.length; moveUnit(cb, e, '7,5', { state: 11 }); expect(cb.log.slice(before).some((l) => /overwatch/.test(l))).toBe(true);
    // opportunity attack: leaving melee reach without disengaging
    cb.round++; e.pos = '2,5'; u.pos = '1,5'; e.ap = 9; const b2 = cb.log.length; moveUnit(cb, e, '4,5', { state: 13 });
    expect(cb.log.slice(b2).some((l) => /opportunity/.test(l))).toBe(true);
    cb.round++; e.pos = '2,5'; e.ap = 9; const b3 = cb.log.length; moveUnit(cb, e, '3,5', { state: 13 }, 'disengage');
    expect(cb.log.slice(b3).some((l) => /opportunity/.test(l))).toBe(false);
  });
});

describe('weapons v2', () => {
  const give = (c: any, extra: any[]) => { c.pack = [...packOf(c), ...extra]; };
  it('equip, slot armour, mods, durability and repair, rarity', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    give(c, [{ id: 'buckler', item: 'buckler', name: 'Buckler', qty: 1, kind: 'tool' }, { id: 'ballistic_helmet', item: 'ballistic_helmet', name: 'Helmet', qty: 1, kind: 'tool' },
      { id: 'mod_quick_release', item: 'mod_quick_release', name: 'QR', qty: 1, kind: 'tool' }, { id: 'magistrate_pistol', name: 'Magistrate', qty: 1, kind: 'weapon', weapon: 'magistrate_pistol', rarity: 'masterwork' }]);
    const d0 = defense(c);
    expect(equip(c, packOf(c).findIndex((x) => x.id === 'buckler'), 'off')).toBeNull(); expect(defense(c)).toBe(d0 + 1);
    expect(equip(c, packOf(c).findIndex((x) => x.id === 'ballistic_helmet'), 'worn')).toBeNull(); expect(c.worn!.head).toBe('ballistic_helmet');
    expect(equip(c, packOf(c).findIndex((x) => x.id === 'magistrate_pistol'), 'main')).toBeNull(); expect(c.weapon).toBe('magistrate_pistol');
    expect(packOf(c).some((x) => x.weapon === 'service_pistol')).toBe(true); // the old pistol went back to the pack
    expect(fitMod(c, packOf(c).findIndex((x) => x.id === 'mod_quick_release'))).toBeNull();
    const cb = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'E', tier: 'boss', weapon: 'service_pistol', at: 'D5' }], 'easy', { state: 4 }, []);
    const u = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
    expect(u.armour).toBe(10 + 2); expect(u.attack).toBe(mod(c.skills.dexterity || 0) + 2); // medium armour + helmet; masterwork +2
    u.ap = 9; u.ammo = 0; u.mags = [7]; expect(reload(cb, u)).toBeNull(); expect(u.ap).toBe(8); // quick-release: 1 AP
    const d1 = u.dur!; u.ap = 9; resolveAttack(cb, { state: 3 }, u, e, 'shot', c); expect(u.dur).toBeLessThan(d1);
    u.dur = 10; u.proficiency = 3; u.parts = 1; u.ap = 9; expect(fieldRepair(cb, u)).toBeNull(); expect(u.dur).toBeGreaterThan(10); expect(u.parts).toBe(0);
    u.dur = 0; expect(previewAttack(cb, u, e, 'shot').why).toMatch(/Broken/);
  });
  it('weapon skill actions and paired attacks', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const cb = startCombat('t', 'yard', [{ c, pos: '1,5' }], [{ name: 'E', tier: 'boss', weapon: 'service_pistol', at: 'C5' }, { name: 'F', tier: 'boss', weapon: 'service_pistol', at: 'C6' }], 'easy', { state: 4 }, []);
    const u = cb.units.find((x) => x.side === 'pc')!, [e, f] = cb.units.filter((x) => x.side === 'foe');
    u.weapon = 'drifter_revolver'; u.ammo = 6; u.ap = 9; const before = cb.log.length;
    expect(useWeaponSkill(cb, { state: 8 }, u, e, c)).toBeNull(); expect(u.ap).toBe(6); expect(cb.log.slice(before).filter((l) => /fires at/.test(l)).length).toBe(3); // Fan the Hammer
    u.weapon = 'adamantile_greatsword'; u.pos = '2,5'; e.pos = '3,5'; f.pos = '3,6'; u.ap = 9; u.maxDur = 0;
    expect(useWeaponSkill(cb, { state: 8 }, u, null, c)).toBeNull(); expect(u.ap).toBe(5); // Sweep hits both
    u.weapon = 'combat_knife'; u.offWeapon = 'hatchet'; u.ap = 9; const b2 = cb.log.length;
    expect(pairedAttack(cb, { state: 2 }, u, e, null, c)).toBeNull(); expect(u.ap).toBe(6); expect(cb.log.slice(b2).filter((l) => /strikes/.test(l)).length).toBe(2);
  });
  it('the Narrator hands out loot', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 's');
    g = apply(g, { type: 'char/add', sheet: sheetFrom(ARCHETYPES[0].id, 'MPAT') }, 'host'); g = apply(g, { type: 'session/start' }, 'host');
    const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', loot: [{ charId: id, item: 'legion_bullpup', qty: 1, rarity: 'fine', name: 'Keel\'s bullpup' }, { charId: id, item: 'riot_shield', qty: 1 }] } as any }, 'host');
    const pack = packOf(g.characters[id]);
    expect(pack.find((x) => x.weapon === 'legion_bullpup')!.rarity).toBe('fine'); expect(pack.some((x) => x.id === 'riot_shield')).toBe(true);
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
    expect(g.story.await).toBe('players'); expect(g.story.needs).toBe(true); // the round goes on; the Narrator will narrate it
    g = apply(g, { type: 'world/act', charId: id, act: 'end' }, 'host');
    expect(g.story.await).toBe('narrator');
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
    const heavy = { ...c, pack: [...packOf(c), { id: 'rocks', name: 'Rocks', qty: 6, kind: 'weapon' as const, weapon: 'blackpoint_700' }] }; // +90 kg
    expect(overweightKg(heavy)).toBeGreaterThan(0); expect(movement(heavy)).toBe(Math.max(0.5, movement(c) - Math.ceil(overweightKg(heavy) / 5)));
  });
  it('reloading uses up magazines and drops the one in the gun, rounds and all', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id)); // medic kit: pistol, 2 spare magazines
    expect(spareMags(c)).toEqual([12, 12]);
    const cb = startCombat('t', 'yard', [{ c }], [], 'easy', { state: 3 });
    const u = cb.units[0]; u.ap = 6;
    u.ammo = 5; expect(reload(cb, u)).toBeNull();
    // Rules 1.9: a speed reload drops the old magazine into the pile on the tile, rounds kept (cb.floor is retired).
    const pile = () => cb.objects!.find((o) => o.kind === 'pile' && o.pos === u.pos)!;
    expect(u.ammo).toBe(12); expect(u.mags).toEqual([12]); expect(pile().items!.map((e) => e.name)).toEqual(['Service pistol magazine 5/12']);
    u.ammo = 0; expect(reload(cb, u)).toBeNull(); expect(pile().items!.map((e) => e.pack!.mags)).toEqual([[5], [0]]); expect(u.mags).toEqual([]);
    expect(cb.floor).toBeUndefined();
    u.ammo = 3; expect(reload(cb, u)).toMatch(/No loaded spare magazines/);
  });
  it('weights: everything counts, down to the round', () => {
    const c = newCharacter('c1', 'p1', sheetFrom(ARCHETYPES[0].id));
    const k = carriedKg(c);
    // pistol 1 + empty magazine 0.1 + 12 rounds × 0.01; Medium armour 8; 2 magazines (0.2 + 24 × 0.01), field kit 1.5, 3 stims 0.3, Essence 0.1
    expect(k.weapon).toBeCloseTo(1.22, 5); expect(k.armour).toBe(8); expect(k.pack).toBeCloseTo(0.44 + 0.24 + 1.5 + 0.48 + 0.3 + 0.1, 5); // + 24 loose rounds, 3 spare-parts charges
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
    u.ap = 6; expect(pickUp(cb, u, u.pos, null, c)).toBeNull(); expect(u.mags).toEqual([12, 0]); expect(u.ap).toBe(5);
    expect(cb.objects!.some((o) => o.kind === 'pile')).toBe(false); // an empty pile leaves the map
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
  expect(g.story.await).toBe('players'); // speaking doesn't end the turn: AP are left
  act({ type: 'world/act', charId: mpat.id, act: 'end' }); act({ type: 'world/act', charId: ninety.id, act: 'end' }, 'p2');
  expect(g.story.await).toBe('narrator');
  act({ type: 'narrator/turn', turn: { narration: 'Keel blocks the ramp.', checks: [{ charId: mpat.id, skills: ['authority', 'camaraderie'], tn: 12, stakes: 'Stare him down.' }], xp: [{ charId: 'all', source: 'quest', amount: 250 }] } });
  expect(g.story.await).toBe('rolls');
  act({ type: 'check/roll', checkId: g.checks[0].id });
  expect(g.story.await).toBe('rolls');
  act({ type: 'check/accept', checkId: g.checks[0].id });
  expect(g.story.await).toBe('narrator');
  expect(g.characters[mpat.id].level).toBe(3);
  const cls = eligibleClasses(g.characters[mpat.id])[0].id;
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

describe('music (spec: Music)', () => {
  const songLink = 'https://www.youtube.com/watch?v=dQw4w9WgXcQ&t=1m5s';
  const room = (traits: string[] = []) => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'music');
    const act = (a: any, by = 'host') => { g = apply(g, a, by); };
    act({ type: 'player/join', id: 'p2', name: 'Friend' });
    act({ type: 'char/add', sheet: { ...sheetFrom('field_medic', 'MPAT'), traits, identity: { song: songLink, songTitle: 'Song A', songArtist: 'Artist A' } } });
    act({ type: 'char/add', sheet: { ...sheetFrom('field_medic', 'Seven'), identity: { song: 'https://youtu.be/aaaaaaaaaaa', songTitle: 'Song B' } } }, 'p2');
    act({ type: 'session/start' });
    act({ type: 'narrator/turn', turn: { narration: 'Begin.', sceneTitle: 'Shield line' } });
    const [a, b] = Object.values(g.characters);
    return { get g() { return g; }, set g(x) { g = x; }, act, a, b };
  };
  it('reads YouTube links: id and start time', () => {
    expect(ytId(songLink)).toBe('dQw4w9WgXcQ'); expect(ytId('https://youtu.be/dQw4w9WgXcQ?si=x')).toBe('dQw4w9WgXcQ'); expect(ytId('not a link')).toBeNull();
    expect(ytStart(songLink)).toBe(65); expect(songOf({ identity: { song: songLink } } as any)!.start).toBe(65);
  });
  it('area music comes from the zone, else the campaign; a fight switches to the game\'s fight music', () => {
    const r = room();
    for (const z of r.g.campaign!.zones) delete z.music;
    r.g.campaign!.music = { ambient: { yt: 'aaaaaaaaaaa', title: 'Camp' }, combat: { yt: 'bbbbbbbbbbb', title: 'Fight' } } as any;
    expect(musicFor(r.g).track!.title).toBe('Camp');
    r.g.campaign!.zones.find((z) => z.id === r.g.story.zone)!.music = { ambient: { yt: 'ccccccccccc', title: 'Zone', artist: '' } };
    expect(musicFor(r.g).track!.title).toBe('Zone'); expect(musicFor(r.g).layer).toBe('ambient');
    r.act({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Odd fight', difficulty: 'easy', enemies: [{ name: 'E', tier: 'minion', weapon: 'service_pistol' }] } } });
    expect(musicFor(r.g)).toMatchObject({ layer: 'combat', track: { title: 'Gunline', ost: 'gunline' } });
  });
  it('a spotlight: once per scene, never cuts off a playing song, ends after one play (host says so)', () => {
    const r = room(), log: string[] = [], g = r.g;
    const a = g.characters[r.a.id], b = g.characters[r.b.id];
    expect(startSong(g, a, 'a critical success', 'spotlight', (t) => log.push(t))).toBe(true);
    expect(musicFor(g)).toMatchObject({ layer: 'spotlight', charId: a.id });
    expect(startSong(g, b, 'x', 'spotlight', () => {})).toBe(false);
    const seq = g.music!.now!.seq; r.g = g; r.act({ type: 'music/end', seq });
    expect(r.g.music!.now).toBeNull();
    expect(startSong(r.g, r.g.characters[a.id], 'again', 'spotlight', () => {})).toBe(false);
    expect(startSong(r.g, r.g.characters[b.id], 'b turn', 'spotlight', () => {})).toBe(true);
    expect(log[0]).toContain('MPAT');
    expect(() => r.act({ type: 'music/end', seq: 1 }, 'p2')).toThrow(RuleError);
  });
  it('a music trait plays on demand, pins for 2 area changes, and its bonus follows the song', () => {
    const r = room(['headbanger']);
    const zones = r.g.campaign!.zones.map((z) => z.id);
    expect(packOf(r.g.characters[r.a.id]).some((x) => x.id === 'musek_blestor')).toBe(true);
    expect(songMod(r.g, r.g.characters[r.a.id], 'raw_power')).toBe(0);
    expect(() => r.act({ type: 'music/play', charId: r.b.id }, 'p2')).toThrow(RuleError);
    r.act({ type: 'music/play', charId: r.a.id });
    expect(songMod(r.g, r.g.characters[r.a.id], 'raw_power')).toBe(1);
    expect(songMod(r.g, r.g.characters[r.a.id], 'analysis')).toBe(0);
    r.act({ type: 'music/pin', charId: r.a.id });
    expect(r.g.music!.now!.layer).toBe('pin');
    r.act({ type: 'narrator/turn', turn: { narration: 'Go.', travel: zones[1] } });
    expect(r.g.music!.now!.areasLeft).toBe(1);
    r.act({ type: 'narrator/turn', turn: { narration: 'Go.', travel: zones[2] } });
    expect(r.g.music!.now).toBeNull();
    expect(songMod(r.g, r.g.characters[r.a.id], 'raw_power')).toBe(1);
    r.act({ type: 'narrator/turn', turn: { narration: 'Go.', travel: zones[0] } });
    r.act({ type: 'narrator/turn', turn: { narration: 'Go.', travel: zones[1] } });
    expect(songMod(r.g, r.g.characters[r.a.id], 'raw_power')).toBe(0);
    r.act({ type: 'narrator/turn', turn: { narration: 'Go.', travel: zones[2] } });
    r.act({ type: 'narrator/turn', turn: { narration: 'Go.', travel: zones[0] } });
    expect(songMod(r.g, r.g.characters[r.a.id], 'analysis')).toBe(-1);
    expect(songMod(r.g, r.g.characters[r.a.id], 'raw_power')).toBe(0);
  });
  it('in a fight: Play my song costs 2 AP, and a song started in the fight stops when it ends', () => {
    const r = room(['headbanger']);
    r.act({ type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'Test', difficulty: 'easy', enemies: [{ name: 'E', tier: 'minion', weapon: 'service_pistol' }] } } });
    let u = active(r.g.combat!)!;
    for (let i = 0; i < 6 && u.charId !== r.a.id; i++) { r.act({ type: 'combat/end-turn', unitId: u.id }, r.g.characters[u.charId!].owner); u = active(r.g.combat!)!; }
    expect(u.charId).toBe(r.a.id);
    const ap = u.ap; r.act({ type: 'combat/song', unitId: u.id });
    expect(active(r.g.combat!)!.ap).toBe(ap - 2);
    expect(r.g.music!.now).toMatchObject({ inCombat: true, charId: r.a.id });
    expect(active(r.g.combat!)!.song).toBe(1);
    r.act({ type: 'music/end', seq: r.g.music!.now!.seq });
    expect(r.g.music!.now).not.toBeNull();
  });
});

describe("the Narrator's wiki (glossary)", () => {
  it('has an entry for every rule-bearing kind, found by key or by name', () => {
    const kinds = wikiKinds();
    for (const k of ['skill', 'trait', 'perk', 'weapon', 'item', 'condition', 'class', 'patron', 'enemy', 'object', 'sigil', 'school', 'module']) expect(kinds[k]?.length, k).toBeGreaterThan(0);
    expect(wikiLookup('weapon:service_pistol')!.text).toContain('Snap Shot');
    expect(wikiLookup('condition:Bleeding')!.key).toBe('condition:bleeding');
    expect(wikiLookup('item:musek_blestor')!.text).toContain('favourite song');
    expect(wikiLookup('nope:x')).toBeNull();
  });
  it('never lists Ultimate perks (they are a secret)', () => {
    expect(wikiEntries().some((e) => e.key.startsWith('perk:') && /\(ultimate/.test(e.text))).toBe(false);
  });
});

describe('campaign art (spec: Campaigns, art)', () => {
  const start = () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'art');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    return apply(g, { type: 'session/start' }, 'host');
  };
  it('built-in campaigns validate; every M813 zone has its map and banner', () => {
    for (const c of BUILT_IN_CAMPAIGNS) expect(validateCampaign(c), c.id).toEqual([]);
    const m = BUILT_IN_CAMPAIGNS.find((c) => c.id === 'm813')!;
    for (const z of m.zones) { expect(z.art?.map, z.id).toMatch(/^map-m813/); expect(z.art?.banner, z.id).toMatch(/^ill-m813/); }
  });
  it('objects keep their sprite, box and portrait on the map', () => {
    const g = start(), objs = storyObjects(g);
    expect(objs.find((o) => o.name === 'Sergeant Nine-Nine')!.portrait).toBe('char-m813-nine-nine');
    expect(objs.find((o) => o.name === 'Enemy drop pod')!.sprite).toBe('sprite-obj-drop-pod');
  });
  it('story moments open by zone, once each; spoilers stay gated', () => {
    let g = start();
    expect(momentsOpen(g).map((m) => m.id)).toEqual(['how-many']);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Try the ending early.', moment: 'the-demand' } }, 'host');
    expect(g.story.entries.some((e) => e.kind === 'art')).toBe(false);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'How many?', moment: 'how-many' } }, 'host');
    expect(g.story.entries.filter((e) => e.kind === 'art').map((e) => e.art)).toEqual(['ill-m813-how-many']);
    expect(momentsOpen(g)).toEqual([]);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Years later.', travel: 'outpost_1' } }, 'host');
    expect(momentsOpen(g).map((m) => m.id)).toEqual(['the-demand']);
  });
  it('enemies get campaign portraits by name; same-named ones alternate', () => {
    let g = start();
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Guns.', combat: { name: 'The ramp', difficulty: 'standard', enemies: [{ name: 'Chief Engineer Keel', tier: 'soldier', weapon: 'drifter_revolver' }, { name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }, { name: 'Engineer', tier: 'minion', weapon: 'service_pistol' }] } } }, 'host');
    const foes = g.combat!.units.filter((u) => u.side === 'foe');
    expect(foes.map((u) => u.img)).toEqual(['char-m813-keel', 'char-m813-engineer-a', 'char-m813-engineer-b']);
  });
});

describe('overworld rounds (spec: Overworld rounds)', () => {
  const open = (seed = 'ow') => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
    return { g, id: Object.keys(g.characters)[0] };
  };
  it('a round: AP for moves and actions, the Say, End turn; a round of only moves needs no Narrator', () => {
    let { g, id } = open(); const r0 = g.story.round;
    g = apply(g, { type: 'story/move', charId: id, to: 'H5' }, 'host'); expect(apLeft(g, g.characters[id])).toBe(5);
    { const t = JSON.parse(JSON.stringify(g)); t.story.ap[id] = 0; expect(() => apply(t, { type: 'story/move', charId: id, to: 'G5' }, 'host')).toThrow(/Needs \d+ AP/); }
    g = apply(g, { type: 'story/pass' }, 'host'); expect(g.story.await).toBe('players'); // passing the Say keeps the AP
    g = apply(g, { type: 'world/act', charId: id, act: 'end' }, 'host');
    expect(g.story.await).toBe('players'); expect(g.story.round).toBe(r0 + 1); expect(apLeft(g, g.characters[id])).toBe(6);
    expect(g.story.entries.at(-1)!.text).toBe('Round ' + (r0 + 1) + '.');
    g = apply(g, { type: 'story/speak', text: 'Nine-Nine, report.' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'end' }, 'host');
    expect(g.story.await).toBe('narrator'); // a line said needs the Narrator
  });
  it('people stand on the overworld map; the Narrator places and moves them', () => {
    let { g } = open();
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'To the pad.', travel: 'rear_pad' } as any }, 'host');
    expect(npcsOf(g).map((n) => n.name + '@' + refOf(n.pos) + ':' + n.side)).toEqual(['Chief Engineer Keel@M4:neutral', 'Engineer@M2:neutral', 'Engineer@M6:neutral']);
    expect(npcsOf(g).map((n) => n.portrait)).toEqual(['char-m813-keel', 'char-m813-engineer-a', 'char-m813-engineer-b']);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Drones.', npcs: [{ action: 'place', name: 'Scavenger drone', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: 'C3' }] } as any }, 'host');
    const d = npcsOf(g).find((n) => n.name === 'Scavenger drone')!; expect(refOf(d.pos)).toBe('C3');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'It drifts.', npcs: [{ action: 'move', id: d.id, at: 'D3' }] } as any }, 'host');
    expect(refOf(npcsOf(g).find((n) => n.id === d.id)!.pos)).toBe('D3');
  });
  it('shooting something with no HP spends a round, shows as an action, and an empty gun must reload', () => {
    let { g, id } = open('ammo');
    const c0 = g.characters[id], at = positionsOf(g)[id];
    // A thing with no HP, in plain sight one tile away.
    const [x, y] = at.split(',').map(Number), k = [x + 1 + ',' + y, x - 1 + ',' + y, x + ',' + (y + 1), x + ',' + (y - 1)].find((t) => standable(zoneMap(g), t) && !storyObjects(g).some((o) => o.pos === t))!;
    g.story.objects = [...storyObjects(g), makeObject('o-test', 'poi', k, { name: 'Old console' })];
    const loaded = loadedOf(c0);
    g = apply(g, { type: 'world/act', charId: id, act: 'attack', objId: 'o-test', mode: 'shot' }, 'host');
    expect(g.characters[id].loaded).toBe(loaded - 1);
    const line = g.story.entries.at(-1)!; expect(line.act).toBe(true); expect(line.text).toMatch(/fires at the old console/);
    const t = JSON.parse(JSON.stringify(g)); t.characters[id].loaded = 0; t.story.ap[id] = 0;
    t.story.ap = {}; // fresh AP
    expect(() => apply(t, { type: 'world/act', charId: id, act: 'attack', objId: 'o-test', mode: 'shot' }, 'host')).toThrow(/Empty: reload/);
  });
  it('attacking in the open starts the fight; the attacker sits out round 1', () => {
    let { g, id } = open('seen');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A drone.', npcs: [{ action: 'place', name: 'Scavenger drone', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: 'L4' }] } as any }, 'host');
    const d = npcsOf(g)[0];
    g = apply(g, { type: 'world/act', charId: id, act: 'attack', targetId: d.id, mode: 'shot' }, 'host');
    expect(g.phase).toBe('combat'); expect(g.combat!.name).toMatch(/^Fight at L4/);
    const me = g.combat!.units.find((u) => u.charId === id)!;
    expect(me.waitRound).toBe(2); expect(g.combat!.log.some((l) => l.startsWith('MPAT') && /fires|shoots|d20/.test(l))).toBe(true);
    expect(npcsOf(g)).toEqual([]);
  });
  it('sneaking: hidden until seen; an Ingenuity roll to stay hidden; an ambush opens on your turn with the AP left', () => {
    let { g, id } = open('hide');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A drone, facing away.', npcs: [{ action: 'place', name: 'Scavenger drone', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: 'O4' }] } as any }, 'host');
    const d = npcsOf(g)[0]; d.facing = [1, 0]; // looking east, away from the party
    g = apply(g, { type: 'world/act', charId: id, act: 'move', to: 'J4', how: 'sneak' }, 'host');
    expect(g.story.sneak![id]).toBe(true); expect(g.story.hidden![id]).toBe(true);
    const seen = g.story.entries.some((e) => /STAY HIDDEN/.test(e.head || ''));
    if (!seen || g.story.hidden![id]) {
      const left = apLeft(g, g.characters[id]);
      g = apply(g, { type: 'world/act', charId: id, act: 'attack', targetId: d.id, mode: 'shot' }, 'host');
      expect(g.combat!.name).toMatch(/^Ambush at O4/); (globalThis as any).__ambush = true;
      expect(g.combat!.order[0]).toBe('pc-' + id);
      expect(g.combat!.units.find((u) => u.charId === id)!.ap).toBe(left - 2);
    }
  });
  it('the shared spotlight: who is dealing with what, and what they hover', () => {
    let { g, id } = open();
    const poi = storyObjects(g).find((o) => o.name === 'Sergeant Nine-Nine')!;
    g = apply(g, { type: 'story/focus', charId: id, objId: poi.id }, 'host');
    const seq = g.story.focus!.seq;
    g = apply(g, { type: 'story/focus', charId: id, objId: poi.id, hover: 1 }, 'host');
    expect(g.story.focus).toMatchObject({ charId: id, objId: poi.id, hover: 1, seq });
    g = apply(g, { type: 'story/unfocus' }, 'host'); expect(g.story.focus).toBeNull();
  });
});

describe('the Narrator maps typed intents to engine actions', () => {
  it('"I move to J4 and shoot the drone": run as the player\'s own actions when the next round opens', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'intent');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'A drone.', npcs: [{ action: 'place', name: 'Scavenger drone', side: 'hostile', tier: 'minion', weapon: 'service_pistol', at: 'M4' }] } as any }, 'host');
    const id = Object.keys(g.characters)[0], d = npcsOf(g)[0];
    g = apply(g, { type: 'story/speak', text: 'I move to J4 and shoot that drone with my pistol.' }, 'host');
    g = apply(g, { type: 'world/act', charId: id, act: 'end' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'MPAT steps out and fires.', actions: [{ charId: id, act: 'move', to: 'J4' }, { charId: id, act: 'attack', targetId: d.id, mode: 'shot' }, { charId: id, act: 'move', to: 'A1' }] } as any }, 'host');
    expect(g.phase).toBe('combat'); expect(g.combat!.name).toBe('Fight at M4');
    expect(refOf(g.combat!.units.find((u) => u.charId === id)!.pos)).toBe('J4');
  });
  it('an action the rules forbid is reported, not done', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'intent2');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Go.', actions: [{ charId: id, act: 'move', to: 'J7' }] } as any }, 'host');
    expect(g.story.entries.at(-1)!.text).toMatch(/^MPAT can't move there/);
  });
});

describe("the Narrator's memory (spec: The Narrator's memory)", () => {
  const start = () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'mem');
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Mai' }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    return apply(g, { type: 'narrator/turn', turn: { narration: 'Open.', sceneTitle: 'The shield line' } as any }, 'host');
  };
  it('the Narrator keeps records: people, threads, facts (retired when untrue), factions, pins', () => {
    let g = start();
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', memory: [
      { op: 'person', name: 'Chief Engineer Keel', role: 'engineer', attitude: -1, notes: 'Holds the ramp.', update: 'Refused the medics.' },
      { op: 'thread', title: 'Get the column aboard', kind: 'goal', who: ['Keel'], text: 'Twenty-three robots, one ship.' },
      { op: 'fact', text: 'The ship leaves at dawn.', importance: 4 }, { op: 'faction', name: 'The 258th', change: 10 }, { op: 'pin', text: 'MPAT is a robot medic.' }] } as any }, 'host');
    const m = memoryOf(g), f = m.facts.find((x) => x.text === 'The ship leaves at dawn.')!;
    expect(m.people[0]).toMatchObject({ name: 'Chief Engineer Keel', attitude: -1 }); expect(m.people[0].log![0]).toMatch(/Refused the medics/);
    expect(m.threads[0]).toMatchObject({ title: 'Get the column aboard', status: 'open' }); expect(m.factions[0].standing).toBe(10); expect(m.pins).toEqual(['MPAT is a robot medic.']);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', memory: [{ op: 'fact', id: f.id, retire: true, text: 'The ship left early, at midnight.' }, { op: 'thread', title: 'Get the column aboard', status: 'failed', update: 'The ship left.' }] } as any }, 'host');
    expect(memoryOf(g).facts.some((x) => x.id === f.id)).toBe(false); expect(memoryOf(g).threads[0].status).toBe('failed');
  });
  it('the engine writes canon: fights, the dead, travel', () => {
    let g = start();
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', memory: [{ op: 'person', name: 'Scavenger drone' }], combat: { name: 'Drones', difficulty: 'easy', enemies: [{ name: 'Scavenger drone', tier: 'minion', weapon: 'service_pistol', at: 'L4' }] } } as any }, 'host');
    for (const u of g.combat!.units) if (u.side === 'foe') { u.hp = 0; u.dead = true; }
    g = apply(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id }, g.characters[active(g.combat!)!.charId!]?.owner || 'host');
    const facts = memoryOf(g).facts.filter((x) => x.canon);
    expect(facts.some((x) => /won the fight "Drones".*killed: Scavenger drone/.test(x.text))).toBe(true);
    expect(memoryOf(g).people.find((p) => p.name === 'Scavenger drone')!.status).toBe('dead');
  });
  it('scenes roll into chapters and the saga; players never receive memory or the archive', () => {
    let g = start();
    for (let i = 0; i < SCENES_PER_CHAPTER; i++) g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', sceneTitle: 'Scene ' + i, endScene: { summary: 'Summary ' + i } } as any }, 'host');
    expect(memoryOf(g).scenes.length).toBe(SCENES_PER_CHAPTER);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', chapter: { title: 'The line', summary: 'They held.', saga: 'The 258th held the line.' } } as any }, 'host');
    expect(memoryOf(g).chapters[0]).toMatchObject({ title: 'The line', summary: 'They held.' }); expect(memoryOf(g).saga).toBe('The 258th held the line.');
    expect(memoryOf(g).scenes.length).toBe(0);
    g.archive = [{ id: 'old', kind: 'narration', text: 'Long ago.' } as any];
    expect(viewFor(g, 'p2').memory).toBeUndefined(); expect(viewFor(g, 'host').archive).toBeUndefined();
  });
  it('the live log scrolls into the archive instead of being lost', () => {
    let g = start();
    for (let i = 0; i < 450; i++) g = apply(g, { type: 'narrator/turn', turn: { narration: 'Line ' + i } as any }, 'host');
    expect(g.story.entries.length).toBe(400); expect(g.archive!.length).toBeGreaterThan(50);
    expect(recall(g, 'Line 3')[0]).toBeTruthy();
  });
});

describe('anyone is a target (spec: Anyone is a target)', () => {
  const two = (seed: string) => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Mai' }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'Seven') }, 'p2');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
    const [a, b] = Object.keys(g.characters);
    return { g, a, b };
  };
  it('friendly fire on the overworld: the shot resolves on the map, no fight; the Narrator hears of it', () => {
    let { g, a, b } = two('ff');
    const hp0 = g.characters[b].hp;
    g = apply(g, { type: 'world/act', charId: a, act: 'attack', targetId: b, mode: 'melee' }, 'host');
    expect(g.phase).toBe('story'); expect(g.story.needs).toBe(true);
    expect(g.story.entries.some((e) => /MPAT .*Seven/.test(e.text))).toBe(true);
    expect(memoryOf(g).facts.some((f) => f.canon && /attacked Seven \(an ally\)/.test(f.text))).toBe(true);
    // a Downed ally stays down on the overworld until stimmed or treated
    g.characters[b].hp = 0;
    expect(() => apply(g, { type: 'world/act', charId: b, act: 'move', to: 'H4' }, 'p2')).toThrow(/Downed/);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', treat: [{ charId: b, loc: 'all' }] } as any }, 'host');
    expect(g.characters[b].hp).toBe(1); expect(hp0).toBeGreaterThan(1);
  });
  it('a point-of-interest person becomes a token and the fight starts; a bystander fight gives no XP and is remembered', () => {
    let { g, a } = two('poi');
    g.story.positions![a] = keyOf('H4')!; // next to Sergeant Nine-Nine at H5
    const xp0 = g.characters[a].xp;
    g = apply(g, { type: 'world/act', charId: a, act: 'attack', targetId: 'Sergeant Nine-Nine', mode: 'melee' }, 'host');
    expect(g.phase).toBe('combat'); expect(g.combat!.noXp).toBe(true);
    const nine = g.combat!.units.find((u) => u.name === 'Sergeant Nine-Nine')!;
    expect(nine.img).toBe('char-m813-nine-nine'); expect(nine.npcId).toBeTruthy();
    expect(memoryOf(g).people.find((p) => p.name === 'Sergeant Nine-Nine')!.attitude).toBe(-3);
    for (const u of g.combat!.units) if (u.side === 'foe') { u.hp = 0; u.dead = true; }
    const cur = active(g.combat!)!; g = apply(g, { type: 'combat/end-turn', unitId: cur.id }, g.characters[cur.charId!]?.owner || 'host');
    expect(g.characters[a].xp).toBe(xp0); expect(memoryOf(g).people.find((p) => p.name === 'Sergeant Nine-Nine')!.status).toBe('dead');
  });
  it("objects: shoot what has HP; anything else is the Narrator's to rule", () => {
    let { g, a } = two('obj');
    const pod = storyObjects(g).find((o) => o.name === 'Enemy drop pod')!; const hp = pod.hp!;
    g.story.positions![a] = keyOf('D9')!;
    g = apply(g, { type: 'world/act', charId: a, act: 'attack', objId: pod.id, mode: 'shot' }, 'host');
    expect(storyObjects(g).find((o) => o.id === pod.id)?.hp ?? 0).toBeLessThan(hp);
  });
  it('queued actions find a target by name; mid-fight anyone is a target, and friendly fire earns no kills', () => {
    let { g, a, b } = two('names');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Doc Michel steps out.', npcs: [{ action: 'place', name: 'Doc Michel', side: 'neutral', tier: 'minion', weapon: 'service_pistol', at: 'J4' }], actions: [{ charId: a, act: 'attack', targetId: 'Doc Michel', mode: 'shot' }] } as any }, 'host');
    expect(g.phase).toBe('combat'); expect(g.combat!.units.some((u) => u.name === 'Doc Michel')).toBe(true);
    const cb = g.combat!; const me = cb.units.find((u) => u.charId === a)!, ally = cb.units.find((u) => u.charId === b)!;
    ally.pos = keyOf('I5')!; me.pos = keyOf('I4')!; me.waitRound = undefined; cb.order = [me.id, ...cb.order.filter((x) => x !== me.id)]; cb.turn = 0; me.ap = 6;
    g = apply(g, { type: 'combat/attack', unitId: me.id, targetId: ally.id, mode: 'melee' }, 'host');
    expect(g.combat!.units.find((u) => u.charId === a)!.kills).toBe(0);
  });
  it('a resumed save from before the art gets it, without losing what play changed', () => {
    let { g } = two('old');
    // make it look like a pre-art save
    for (const z of g.campaign!.zones) { delete (z as any).art; delete (z as any).npcs; for (const o of z.objects || []) { delete (o as any).sprite; delete (o as any).portrait; } }
    delete (g.campaign as any).sprites; for (const o of g.story.objects!) { delete o.sprite; delete o.portrait; }
    const nine = g.story.objects!.find((o) => o.name === 'Sergeant Nine-Nine')!; nine.approaches[0].tries.push({ charId: 'x', name: 'X', ok: true, total: 15, scene: 1 });
    g = apply(g, { type: 'campaign/refresh' }, 'host');
    expect(g.campaign!.zones[0].art?.map).toBe('map-m813-shield-line');
    const n2 = g.story.objects!.find((o) => o.name === 'Sergeant Nine-Nine')!;
    expect(n2.portrait).toBe('char-m813-nine-nine'); expect(n2.approaches[0].tries).toHaveLength(1);
    expect(g.story.objects!.find((o) => o.name === 'Enemy drop pod')!.sprite).toBe('sprite-obj-drop-pod');
    expect(() => apply(g, { type: 'campaign/refresh' }, 'p2')).toThrow(/Host only/);
  });
  it('a resumed save from before the sigil marks gets them in zones not yet entered (objects only added are no layout change)', () => {
    let { g } = two('marks');
    const cur = g.story.zone;
    for (const z of g.campaign!.zones) z.objects = (z.objects || []).filter((o: any) => o.kind !== 'sigil_mark');
    g = apply(g, { type: 'campaign/refresh' }, 'host');
    const withMarks = g.campaign!.zones.filter((z) => (z.objects || []).some((o: any) => o.kind === 'sigil_mark')).map((z) => z.id);
    expect(withMarks.length).toBe(3); expect(withMarks.filter((id) => id !== cur).length).toBeGreaterThan(0);
  });
  it("a custom campaign file is marked custom and can't take a built-in id", () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'custom');
    g = apply(g, { type: 'campaign/load', campaign: { ...BUILT_IN_CAMPAIGNS[0], title: 'Mine' } as any }, 'host');
    expect(g.campaign!.custom).toBe(true); expect(g.campaign!.id).toBe('m813-custom');
  });
});

describe('the Memory menu (host edits)', () => {
  it('the host reads and fixes memory; nobody else can; only the host sees it', () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'edit');
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Mai' }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', memory: [{ op: 'person', name: 'Keel', attitude: 2 }, { op: 'fact', text: 'Keel is kind.' }] } as any }, 'host');
    const keel = memoryOf(g).people[0], f = memoryOf(g).facts.find((x) => x.text === 'Keel is kind.')!;
    g = apply(g, { type: 'memory/edit', edit: { kind: 'person', id: keel.id, patch: { attitude: -2, notes: 'He left them to die.', name: 'Chief Engineer Keel' } } }, 'host');
    expect(memoryOf(g).people[0]).toMatchObject({ name: 'Chief Engineer Keel', attitude: -2, notes: 'He left them to die.' });
    g = apply(g, { type: 'memory/edit', edit: { kind: 'fact', id: f.id, remove: true } }, 'host');
    expect(memoryOf(g).facts.some((x) => x.id === f.id)).toBe(false);
    g = apply(g, { type: 'memory/edit', edit: { kind: 'thread', patch: { title: 'Find the comrade', kind: 'goal' } } }, 'host');
    g = apply(g, { type: 'memory/edit', edit: { kind: 'saga', text: 'The line held.' } }, 'host');
    g = apply(g, { type: 'memory/edit', edit: { kind: 'pin', text: 'MPAT never leaves anyone.' } }, 'host');
    expect(memoryOf(g)).toMatchObject({ saga: 'The line held.', pins: ['MPAT never leaves anyone.'] }); expect(memoryOf(g).threads[0].title).toBe('Find the comrade');
    expect(() => apply(g, { type: 'memory/edit', edit: { kind: 'saga', text: 'hacked' } }, 'p2')).toThrow(/Only the host/);
    expect(viewFor(g, 'host').memory).toBeTruthy(); expect(viewFor(g, 'p2').memory).toBeUndefined();
  });
});

describe('anyone is a target: review fixes', () => {
  const two = (seed: string) => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, seed);
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Mai' }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'Seven') }, 'p2');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Open.' } as any }, 'host');
    const [a, b] = Object.keys(g.characters); return { g, a, b };
  };
  it('a point-of-interest person who died stays dead; one who lives is the same token', () => {
    let { g, a } = two('poi2');
    g.story.positions![a] = keyOf('H4')!;
    const nine = storyObjects(g).find((o) => o.name === 'Sergeant Nine-Nine')!;
    g = apply(g, { type: 'world/act', charId: a, act: 'attack', objId: nine.id, mode: 'melee' }, 'host');
    expect(storyObjects({ ...g, story: { ...g.story } }).length).toBeGreaterThan(0);
    for (const u of g.combat!.units) if (u.side === 'foe') { u.hp = 0; u.dead = true; }
    const cur = active(g.combat!)!; g = apply(g, { type: 'combat/end-turn', unitId: cur.id }, g.characters[cur.charId!]?.owner || 'host');
    expect(storyObjects(g).find((o) => o.id === nine.id)!.dead).toBe(true);
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'After.' } as any }, 'host');
    expect(() => apply(g, { type: 'world/act', charId: a, act: 'attack', objId: nine.id, mode: 'melee' }, 'host')).toThrow(/is dead/);
  });
  it('a Downed ally keeps their death-save failures between shots, and can be finished off', () => {
    let { g, a, b } = two('saves');
    g.story.positions![b] = keyOf('I5')!; g.characters[b].hp = 0;
    let died = false;
    for (let i = 0; i < 12 && !died; i++) {
      g.story.ap = {}; g.story.ended = {};
      try { g = apply(g, { type: 'world/act', charId: a, act: 'attack', targetId: b, mode: 'melee' }, 'host'); } catch { /* a miss is fine */ }
      died = !!g.characters[b].dead;
    }
    expect(died).toBe(true);
  });
  it('a Downed character can\'t work points of interest or take the spotlight', () => {
    let { g, b } = two('downpoi');
    g.characters[b].hp = 0; g.story.positions![b] = keyOf('H4')!;
    const nine = storyObjects(g).find((o) => o.name === 'Sergeant Nine-Nine')!;
    expect(() => apply(g, { type: 'poi/examine', charId: b, objId: nine.id }, 'p2')).toThrow(/Downed/);
    expect(() => apply(g, { type: 'story/focus', charId: b, objId: nine.id }, 'p2')).toThrow(/can't/);
  });
  it('a failed queued attack leaves no stray token behind', () => {
    let { g, a } = two('stray');
    const before = npcsOf(g).length;
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'x', actions: [{ charId: a, act: 'attack', objId: storyObjects(g).find((o) => o.name === 'Sergeant Nine-Nine')!.id, mode: 'melee' }] } as any }, 'host');
    if (g.phase === 'story') expect(npcsOf(g).length).toBe(before);
  });
});

describe('rerolls and edits by unanimous vote (spec: Rerolls and edits)', () => {
  const room = () => {
    let g: GameState = newGame('ROOM', { id: 'host', name: 'Leon' }, 'vote');
    g = apply(g, { type: 'player/join', id: 'p2', name: 'Mai' }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'MPAT') }, 'host');
    g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'Seven') }, 'p2');
    g = apply(g, { type: 'session/start' }, 'host');
    const before = g;
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'Keel shoots first.', loot: [{ charId: Object.keys(g.characters)[0], item: 'stim_injector', qty: 2 }] } as any }, 'host');
    const line = g.story.entries.find((e) => e.kind === 'narration')!;
    return { g, before, line };
  };
  it('players suggest, only the host starts a vote, and everyone must say yes', () => {
    let { g, line } = room();
    g = apply(g, { type: 'vote/suggest', kind: 'reroll', entryId: line.id, note: 'Keel would not shoot first.' }, 'p2');
    expect(votesOf(g).suggestions).toHaveLength(1);
    expect(() => apply(g, { type: 'vote/start', kind: 'reroll', entryId: line.id }, 'p2')).toThrow(/Only the host/);
    g = apply(g, { type: 'vote/start', kind: 'reroll', entryId: line.id, suggestionId: votesOf(g).suggestions[0].id }, 'host');
    expect(votesOf(g).open).toMatchObject({ status: 'open', note: 'Keel would not shoot first.', suggestedBy: 'p2', yes: ['host'] });
    const failed = apply(g, { type: 'vote/cast', yes: false }, 'p2');
    expect(votesOf(failed).open!.status).toBe('failed');
    g = apply(g, { type: 'vote/cast', yes: true }, 'p2');
    expect(votesOf(g).open!.status).toBe('passed');
  });
  it('a passed reroll undoes the turn and everything after it, and asks the Narrator again', () => {
    let { g, before, line } = room();
    // loot[] stims join the character's stims (rules 1.9 review fix: a stim in the pack could never be used).
    const id = Object.keys(g.characters)[0], packed = JSON.stringify(before.characters[id].pack), stims = before.characters[id].stims;
    expect(g.characters[id].stims).toBe(stims + 2);
    g = apply(g, { type: 'vote/start', kind: 'reroll', entryId: line.id, note: 'Keel talks instead.' }, 'host');
    g = apply(g, { type: 'vote/cast', yes: true }, 'p2');
    const r = rerollFrom(g, before, 'Keel talks instead.');
    expect(JSON.stringify(r.characters[id].pack)).toBe(packed); expect(r.characters[id].stims).toBe(stims); expect(r.v).toBe(g.v + 1);
    expect(r.story.work).toMatchObject({ kind: 'opening', redo: 'Keel talks instead.' }); expect(r.narrator.busy).toBe(false);
    expect(r.story.entries.find((e) => e.rerolled)!.text).toBe('Keel shoots first.');
    expect(votesOf(r).open).toBeNull();
  });
  it('an edit only changes the words, only after a passed vote, and the original is kept', () => {
    let { g, line } = room();
    expect(() => apply(g, { type: 'narrator/rewrite', entryId: line.id, text: 'Leon steals 2 million.' }, 'host')).toThrow(/No edit was voted/);
    g = apply(g, { type: 'vote/start', kind: 'edit', entryId: line.id, note: 'Make Keel sound scared, not cruel.' }, 'host');
    g = apply(g, { type: 'vote/cast', yes: true }, 'p2');
    expect(() => apply(g, { type: 'narrator/rewrite', entryId: line.id, text: 'x' }, 'p2')).toThrow(/host/);
    const id = Object.keys(g.characters)[0], stims = g.characters[id].stims;
    g = apply(g, { type: 'narrator/rewrite', entryId: line.id, text: 'Keel fires, hands shaking.' }, 'host');
    const e = g.story.entries.find((x) => x.id === line.id)!;
    expect(e.text).toBe('Keel fires, hands shaking.'); expect(e.original).toBe('Keel shoots first.'); expect(g.characters[id].stims).toBe(stims);
  });
});
