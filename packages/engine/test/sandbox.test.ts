// The Proving Ground (practice mode): endless waves, infinite retry, the tools panel's actions, and no Narrator.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, type Sheet, type GameState, type Action, newGame, apply, RuleError, sandboxWave, PROVING_GROUND, SANDBOX_PORTRAIT, validateCampaign, zoneMap, active,
  WEAPON, maxHp, classRank, packOf, hasEvoker, hasEmanator, viewFor, ADVANCED_CLASSES, CLASS, MANA_START, mapFor, standable, sandboxNext, refOf, positionsOf, npcsOf,
} from '../src';

const sheetFrom = (archId: string, name: string, kit = 'soldier'): Sheet => {
  const a = ARCHETYPES.find((x) => x.id === archId)!;
  return { name, portrait: '', origin: 'Thousand-Planet frontier', kit, traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} };
};
const HOST = 'h1', GUEST = 'p2';
const lobby = (withChar = true) => {
  let g = newGame('PROVE1', { id: HOST, name: 'Host' }, 'seed-proving');
  g = apply(g, { type: 'player/join', id: GUEST, name: 'Guest' }, HOST);
  if (withChar) g = apply(g, { type: 'char/add', sheet: sheetFrom('sharpshooter', 'Vel') }, HOST);
  return g;
};
/** Open the Proving Ground: gearing up, no fight. */
const open = (g = lobby()) => apply(g, { type: 'sandbox/start' }, HOST);
/** Open it and start the fight with what stands on the map (wave 1). */
const start = (g = lobby()) => apply(open(g), { type: 'sandbox/fight' }, HOST);
const pc = (g: GameState) => g.combat!.units.find((u) => u.side === 'pc')!;
const charOf = (g: GameState) => Object.values(g.characters).find((c) => c.owner === HOST)!;
const refused = (g: GameState, a: Action, by = HOST) => { try { apply(g, a, by); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };
/** Every enemy dead (the next action that checks the fight sees the wave won). */
const killAll = (g: GameState) => { const x: GameState = JSON.parse(JSON.stringify(g)); for (const u of x.combat!.units) if (u.side === 'foe') { u.hp = 0; u.dead = true; } return x; };

describe('the Proving Ground map', () => {
  it('validates as a campaign and has room for every wave', () => {
    expect(validateCampaign(PROVING_GROUND)).toEqual([]);
    const z = PROVING_GROUND.zones[0];
    expect([z.w, z.h]).toEqual([16, 12]);
    const g = start(), map = zoneMap(g);
    expect(map.id).toBe('proving_ground');
    expect(map.foeStart.length).toBeGreaterThanOrEqual(8);
    const kinds = new Set((g.combat!.objects || []).map((o) => o.kind));
    for (const k of ['crate', 'low_wall', 'pillar', 'barricade', 'barrel', 'door', 'trap', 'fire', 'toxic']) expect(kinds.has(k), k).toBe(true);
    // The practice mine is visible; doors start closed.
    expect(g.combat!.objects!.find((o) => o.kind === 'trap')!.hidden).toBe(false);
  });
});

describe('waves', () => {
  it('get bigger and harder: soldiers from wave 2, elites from 4, a champion every 5th, at most 8', () => {
    expect(sandboxWave(1).every((f) => f.tier === 'minion')).toBe(true);
    expect(sandboxWave(2).some((f) => f.tier === 'soldier')).toBe(true);
    expect(sandboxWave(4).some((f) => f.tier === 'elite')).toBe(true);
    expect(sandboxWave(5).some((f) => f.tier === 'boss')).toBe(true);
    expect(sandboxWave(4).some((f) => f.tier === 'boss')).toBe(false);
    for (let n = 1; n <= 30; n++) { const w = sandboxWave(n); expect(w.length).toBeGreaterThan(0); expect(w.length).toBeLessThanOrEqual(8); for (const f of w) expect(WEAPON[f.weapon], f.weapon).toBeTruthy(); }
    const pts = (n: number) => sandboxWave(n).reduce((t, f) => t + ({ minion: 1, soldier: 2, elite: 4, boss: 8 } as any)[f.tier], 0);
    expect(pts(8)).toBeGreaterThan(pts(2));
    expect(sandboxWave(7)).toEqual(sandboxWave(7)); // deterministic: a retried wave is the same wave
  });
  it('opens gearing up: the squad and wave 1 stand on the map, no fight, no Narrator work', () => {
    const g = open();
    expect(g.phase).toBe('story'); expect(g.combat).toBeNull();
    expect(g.sandbox).toMatchObject({ wave: 1, state: 'ready', ai: true, attempt: 1, auto: false, fights: 0 });
    expect(sandboxNext(g.sandbox!)).toBe(1);
    expect(g.story.work).toBeNull(); expect(g.story.await).toBe('players');
    expect(g.story.zone).toBe('proving_ground');
    const pos = positionsOf(g); expect(pos[charOf(g).id]).toBeTruthy();
    const foes = npcsOf(g); expect(foes.map((n) => n.tier)).toEqual(sandboxWave(1).map((f) => f.tier));
    expect(foes.every((n) => n.side === 'hostile' && !Object.values(pos).includes(n.pos))).toBe(true);
  });
  it('the fight starts from the map: Start the fight, wave 1, no XP, the Narrator never called', () => {
    // The host's button; a guest can start it once every player with a fighter is READY (multiplayer).
    const g0 = apply(apply(open(), { type: 'sandbox/ai', on: false }, HOST), { type: 'sandbox/ready', on: true }, HOST), g = apply(g0, { type: 'sandbox/fight' }, GUEST);
    expect(g.phase).toBe('combat');
    expect(g.sandbox).toMatchObject({ wave: 1, state: 'fighting', attempt: 1, fights: 1 });
    expect(g.story.work).toBeNull(); expect(g.combat!.noXp).toBe(true);
    expect(g.combat!.name).toBe('Proving Ground · Wave 1');
    // The drill units that stood on the map are the ones in the fight, where they stood.
    const foes = g.combat!.units.filter((u) => u.side === 'foe');
    expect(foes.map((u) => u.npcId).sort()).toEqual(npcsOf(g0).map((n) => n.id).sort());
    for (const u of foes) expect(u.pos).toBe(npcsOf(g0).find((n) => n.id === u.npcId)!.pos);
    expect(g.combat!.units.find((u) => u.charId)!.pos).toBe(positionsOf(g0)[charOf(g0).id]);
    expect(active(g.combat!)!.side).toBe('pc'); // enemies who rolled higher already acted
    expect(refused(g, { type: 'sandbox/fight' })).toMatch(/already on/);
  });
  it('with nothing on the map, Start the fight brings the wave chosen', () => {
    let g = apply(open(), { type: 'sandbox/clear' }, HOST);
    expect(npcsOf(g).length).toBe(0);
    g = apply(g, { type: 'sandbox/stage', wave: 4 }, HOST); expect(npcsOf(g).map((n) => n.tier)).toEqual(sandboxWave(4).map((f) => f.tier));
    g = apply(g, { type: 'sandbox/clear' }, HOST);
    g = apply(g, { type: 'sandbox/fight' }, HOST);
    expect(g.sandbox!.wave).toBe(4);
    expect(g.combat!.units.filter((u) => u.side === 'foe').map((u) => u.tier)).toEqual(sandboxWave(4).map((f) => f.tier));
    expect(refused(open(), { type: 'sandbox/stage', wave: 3 }, GUEST)).toMatch(/host/);
  });
  it('attacking a drill unit on the area map starts the fight (as any overworld attack does), as the next wave', () => {
    const g0 = open(), c = charOf(g0), me = positionsOf(g0)[c.id];
    // Bring one drill unit next to us so a strike is in reach, then hit it.
    const x: GameState = JSON.parse(JSON.stringify(g0)); const [mx, my] = me.split(',').map(Number);
    const near = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (mx + dx) + ',' + (my + dy)).find((k) => standable(zoneMap(x), k) && !(x.story.objects || []).some((o) => o.pos === k))!;
    x.story.npcs = [{ ...npcsOf(x)[0], pos: near }];
    const g = apply(x, { type: 'world/act', charId: c.id, act: 'attack', targetId: npcsOf(x)[0].id, mode: 'melee' }, HOST);
    expect(g.combat).toBeTruthy(); expect(g.sandbox!.fights).toBe(1); expect(g.story.work).toBeNull();
    if (g.phase === 'combat') { expect(g.sandbox).toMatchObject({ state: 'fighting', wave: 1 }); expect(g.combat!.noXp).toBe(true); expect(g.combat!.name).toMatch(/Wave 1/); }
    else expect(g.sandbox!.state).toBe('cleared'); // won in one blow
  });
  it('gearing up: moving costs nothing, no rounds close, no Narrator; Say and the story stay refused', () => {
    const g0 = open(), c = charOf(g0), me = positionsOf(g0)[c.id], [mx, my] = me.split(',').map(Number);
    let g = g0;
    for (const dx of [1, 2, 1, 0]) { const k = (mx + dx) + ',' + my; if (!standable(zoneMap(g), k) || (g.story.objects || []).some((o) => o.pos === k)) continue; g = apply(g, { type: 'world/act', charId: c.id, act: 'move', to: refOf(k) }, HOST); }
    expect(g.story.ap?.[c.id] ?? 6).toBe(6); expect(g.story.await).toBe('players'); expect(g.story.work).toBeNull(); expect(g.phase).toBe('story');
    g = apply(g, { type: 'world/act', charId: c.id, act: 'end' }, HOST); expect(g.story.work).toBeNull(); expect(g.story.await).toBe('players');
    expect(refused(g, { type: 'story/speak', text: 'Hello?' })).toMatch(/no Narrator/);
    expect(refused(g, { type: 'combat/end-turn', unitId: 'pc-' + c.id })).toMatch(/No fight/);
  });
  it('gearing up: each action is a fresh round for its character (the last move\'s trail only, the weapon cooling, a fresh look)', () => {
    const g0 = open(), c = charOf(g0), me = positionsOf(g0)[c.id], [mx, my] = me.split(',').map(Number);
    const map = zoneMap(g0), ok = (k: string) => standable(map, k) && !(g0.story.objects || []).some((o) => o.pos === k) && !npcsOf(g0).some((t) => t.pos === k);
    const there = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (mx + dx) + ',' + (my + dy)).find(ok)!;
    let g = g0;
    for (let i = 0; i < 10; i++) { g = apply(g, { type: 'world/act', charId: c.id, act: 'move', to: refOf(there) }, HOST); g = apply(g, { type: 'world/act', charId: c.id, act: 'move', to: refOf(me) }, HOST); }
    expect((g.story.trail?.[c.id] || []).length).toBeLessThanOrEqual(2);
    const x: GameState = JSON.parse(JSON.stringify(g)); (x.story.heat ||= {})[c.id] = 5; (x.story.noticed ||= {})['foe-s1|' + c.id] = x.story.round;
    g = apply(x, { type: 'world/act', charId: c.id, act: 'move', to: refOf(there) }, HOST);
    expect(g.story.heat![c.id]).toBe(3);
    expect(g.story.noticed?.['foe-s1|' + c.id]).toBeUndefined();
  });
  it('a quick start with nobody locked in makes a test character (removed on leaving)', () => {
    const g = start(lobby(false));
    const c = charOf(g); expect(c.name).toBe('Recruit'); expect(c.portrait).toBe(SANDBOX_PORTRAIT); // Wick, the Narrator's avatar
    expect(g.story.entries.every((e) => !/M813|Last Ship/i.test(e.text))).toBe(true); expect(g.story.scene.title).toBe('The Proving Ground');
    const back = apply(g, { type: 'sandbox/end' }, HOST);
    expect(back.phase).toBe('lobby'); expect(Object.keys(back.characters)).toEqual([]);
  });
  it('the test character is numbered when the room already has a Recruit', () => {
    let g = newGame('PROVE2', { id: HOST, name: 'Host' }, 'seed-proving');
    g = apply(g, { type: 'player/join', id: GUEST, name: 'Guest' }, HOST);
    g = apply(g, { type: 'char/add', sheet: sheetFrom('sharpshooter', 'Recruit') }, GUEST);
    g = apply(g, { type: 'sandbox/start', archetype: 'bulwark' }, HOST);
    expect(charOf(g).name).toBe('Recruit 2'); expect(charOf(g).portrait).toBe(SANDBOX_PORTRAIT);
  });
  it('a cleared wave waits, then the next comes with the squad as it stands; the best wave is kept', () => {
    let g = start();
    g = killAll(g);
    g = apply(g, { type: 'combat/prone', unitId: pc(g).id }, HOST);
    expect(g.combat!.over).toBe('win');
    expect(g.sandbox).toMatchObject({ state: 'cleared', best: 1 });
    // Back to gearing up (the finished fight is kept for the combat screen); no finishCombat, no Narrator call.
    expect(g.phase).toBe('story'); expect(g.story.work).toBeNull(); expect(g.story.await).toBe('players');
    expect(charOf(g).xp).toBe(0); expect(sandboxNext(g.sandbox!)).toBe(2);
    expect(positionsOf(g)[charOf(g).id]).toBe(pc(g).pos); // where the fight left them
    const hurt: GameState = JSON.parse(JSON.stringify(g)); charOf(hurt).hp = 40;
    expect(refused(hurt, { type: 'sandbox/wave', wave: 4 }, GUEST)).toMatch(/host/);
    const g2 = apply(hurt, { type: 'sandbox/wave' }, GUEST);
    expect(g2.sandbox).toMatchObject({ wave: 2, state: 'fighting', best: 1, attempt: 1 });
    expect(pc(g2).hp).toBe(40); // carried in
    expect(g2.combat!.name).toMatch(/Wave 2/);
    expect(g2.combat!.units.filter((x) => x.side === 'foe').map((x) => x.tier)).toEqual(sandboxWave(2).map((f) => f.tier));
  });
  it('a fallen squad retries the same wave refilled, or restarts from wave 1; nobody stays dead', () => {
    const x: GameState = JSON.parse(JSON.stringify(start()));
    const u = pc(x); u.hp = 0; u.ammo = 0; u.dead = true; u.downed = true;
    x.sandbox!.wave = 3; x.combat!.over = 'loss'; x.sandbox!.state = 'fallen';
    expect(refused(x, { type: 'sandbox/wave' })).toMatch(/retry/i);
    const r = apply(x, { type: 'sandbox/retry' }, GUEST);
    expect(r.sandbox).toMatchObject({ wave: 3, state: 'fighting', attempt: 2 });
    const c = charOf(r); expect(c.dead).toBe(false); expect(c.hp).toBe(maxHp(c));
    const ru = pc(r); expect(ru.hp).toBe(ru.maxHp); expect(ru.ammo).toBe(WEAPON[ru.weapon].magazine ?? 0); expect(ru.dead).toBe(false);
    expect(r.combat!.log[0]).toMatch(/WAVE 3 · attempt 2/);
    const one = apply(x, { type: 'sandbox/retry', restart: true }, HOST);
    expect(one.sandbox!.wave).toBe(1); expect(one.story.mana).toBe(MANA_START);
  });
  it('mid-fight only the host retries or restarts; a guest can once the squad has fallen', () => {
    const g = start();
    expect(refused(g, { type: 'sandbox/retry', restart: true }, GUEST)).toMatch(/host/i);
    expect(refused(g, { type: 'sandbox/retry' }, GUEST)).toMatch(/host/i);
    expect(apply(g, { type: 'sandbox/retry' }, HOST).sandbox!.attempt).toBe(2);
    // a second Retry click arriving after the first already restarted the fight is refused for a guest
    const x: GameState = JSON.parse(JSON.stringify(g)); x.combat!.over = 'loss'; x.sandbox!.state = 'fallen';
    const r = apply(x, { type: 'sandbox/retry' }, GUEST);
    expect(refused(r, { type: 'sandbox/retry' }, GUEST)).toMatch(/host/i);
  });
  it('jumping to the wave already on the field is a new attempt (fresh banner and effects on the client)', () => {
    const g = start(), again = apply(g, { type: 'sandbox/wave', wave: 1 }, HOST);
    expect(again.sandbox!.attempt).toBe(2); expect(again.combat!.log[0]).toMatch(/attempt 2/);
    expect(apply(g, { type: 'sandbox/wave', wave: 4 }, HOST).sandbox!.attempt).toBe(1);
  });
  it('the engine reports a real loss as fallen (no finishCombat, no Narrator)', () => {
    let g = start();
    g = JSON.parse(JSON.stringify(g)); for (const u of g.combat!.units) if (u.side === 'pc') { u.hp = 0; u.downed = true; u.saves = { ok: 0, fail: 2 }; }
    // Ending the downed PC's turn runs the enemies; checkOver sees every PC down.
    g = apply(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id }, HOST);
    expect(g.combat!.over).toBe('loss'); expect(g.sandbox!.state).toBe('fallen'); expect(g.phase).toBe('story'); expect(g.story.work).toBeNull();
    // Nothing is lost: everyone is back up and refilled at the start, the field empty; the next fight is the same wave.
    const c = charOf(g); expect(c.dead).toBe(false); expect(c.hp).toBe(maxHp(c)); expect(npcsOf(g).length).toBe(0);
    expect(sandboxNext(g.sandbox!)).toBe(1);
    const again = apply(g, { type: 'sandbox/fight' }, HOST);
    expect(again.sandbox).toMatchObject({ wave: 1, attempt: 2, state: 'fighting', fights: 2 });
    expect(again.combat!.units.filter((u) => u.side === 'foe').length).toBe(sandboxWave(1).length);
  });
  it('the host can stop a fight: back to gearing up, the enemies left where they stand', () => {
    const g = start(), standing = g.combat!.units.filter((u) => u.side === 'foe' && !u.dead).length;
    expect(refused(g, { type: 'sandbox/stop' }, GUEST)).toMatch(/host/);
    const s = apply(g, { type: 'sandbox/stop' }, HOST);
    expect(s.phase).toBe('story'); expect(s.combat).toBeNull(); expect(s.sandbox!.state).toBe('ready');
    expect(npcsOf(s).length).toBe(standing);
    expect(refused(s, { type: 'sandbox/stop' })).toMatch(/No fight/);
    expect(apply(s, { type: 'sandbox/fight' }, HOST).sandbox!.attempt).toBe(2);
  });
  it('stopping keeps both sides as they were: wounded drill units stay wounded, and units the fight never seated stay on the map', () => {
    let g = open();
    // Fill the map past what one fight seats.
    const map = zoneMap(g);
    for (let y = 0, n = 0; y < map.h && n < 10; y++) for (let x = 0; x < map.w && n < 10; x++) {
      const k = x + ',' + y;
      if (!standable(map, k) || Object.values(positionsOf(g)).includes(k) || npcsOf(g).some((t) => t.pos === k) || (g.story.objects || []).some((o) => o.pos === k)) continue;
      g = apply(g, { type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: refOf(k) }, HOST); n++;
    }
    const total = npcsOf(g).filter((t) => t.side === 'hostile').length;
    g = apply(g, { type: 'sandbox/fight' }, HOST);
    const seated = g.combat!.units.filter((u) => u.side === 'foe');
    expect(seated.length).toBeLessThan(total);
    const x: GameState = JSON.parse(JSON.stringify(g)), hurt = x.combat!.units.find((u) => u.side === 'foe' && !u.dead)!;
    hurt.hp = 3; const pcu = x.combat!.units.find((u) => u.side === 'pc')!; pcu.hp = 50;
    const s = apply(x, { type: 'sandbox/stop' }, HOST);
    expect(npcsOf(s).filter((t) => t.side === 'hostile').length).toBe(total);
    expect(new Set(npcsOf(s).map((t) => t.pos)).size).toBe(npcsOf(s).length); // nobody shares a tile
    expect(npcsOf(s).find((t) => t.id === hurt.npcId)!.hp).toBe(3);
    expect(charOf(s).hp).toBe(50);
    const again = apply(s, { type: 'sandbox/fight' }, HOST);
    expect(again.combat!.units.find((u) => u.npcId === hurt.npcId)!.hp).toBe(3);
    expect(again.combat!.units.find((u) => u.side === 'pc')!.hp).toBeLessThanOrEqual(50); // the drill units may already have acted
  });
});

describe('the tools', () => {
  it('give and equip a weapon mid-fight: it arrives loaded with magazines, and the fighter is rebuilt', () => {
    let g = start(); const c = charOf(g), hpBefore = pc(g).hp - 7;
    g = JSON.parse(JSON.stringify(g)); pc(g).hp = hpBefore;
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'drifter_revolver', rarity: 'masterwork', equip: true }, HOST);
    const u = pc(g), ch = charOf(g);
    expect(ch.weapon).toBe('drifter_revolver'); expect(ch.weaponState?.rarity).toBe('masterwork');
    expect(u.weapon).toBe('drifter_revolver'); expect(u.ammo).toBe(6); expect(u.hp).toBe(hpBefore); // the fight's state is kept
    expect(packOf(ch).some((it) => it.calibre === WEAPON.drifter_revolver.ammo)).toBe(true);
    // items and armour
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'field_helmet', equip: true }, HOST);
    expect(charOf(g).worn?.head).toBe('field_helmet');
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'evoker' }, HOST);
    expect(hasEvoker(charOf(g))).toBe(true); expect(pc(g).mg?.evoker).toBe(true);
    g = apply(g, { type: 'sandbox/armour', charId: c.id, armourClass: 4 }, HOST); expect(pc(g).armour).toBeGreaterThanOrEqual(20);
    // the ordinary equip action works mid-fight here (it is refused in a normal fight)
    const idx = packOf(charOf(g)).findIndex((it) => it.weapon === 'hellraiser_service_rifle' && it.kind === 'weapon');
    expect(idx).toBeGreaterThanOrEqual(0);
    g = apply(g, { type: 'gear/equip', charId: c.id, idx, to: 'main' }, HOST); expect(pc(g).weapon).toBe('hellraiser_service_rifle');
  });
  it('class (base with rank, advanced), level, skill', () => {
    let g = start(); const c = charOf(g);
    g = apply(g, { type: 'sandbox/class', charId: c.id, classId: 'medic', rank: 3 }, HOST);
    expect(charOf(g).classId).toBe('medic'); expect(classRank(charOf(g))).toBe(3);
    const adv = ADVANCED_CLASSES[0];
    g = apply(g, { type: 'sandbox/class', charId: c.id, classId: adv.id }, HOST);
    expect(g.sandbox!.advanced[c.id]).toBe(adv.id); expect(CLASS[charOf(g).classId!]).toBeTruthy(); expect(charOf(g).classId).toBe(adv.parents[0]);
    g = apply(g, { type: 'sandbox/level', charId: c.id, level: 10 }, HOST);
    expect(charOf(g).level).toBe(10); expect(pc(g).maxHp).toBe(maxHp(charOf(g))); expect(pc(g).hp).toBe(pc(g).maxHp);
    g = apply(g, { type: 'sandbox/level', charId: c.id, level: 2 }, HOST); expect(charOf(g).level).toBe(2);
    g = apply(g, { type: 'sandbox/skill', charId: c.id, skill: 'brain_power', points: 7 }, HOST);
    const ch = charOf(g); expect(ch.skills.brain_power).toBe(7); expect(ch.attrs.intelligence).toBeGreaterThanOrEqual(7); expect(ch.cores.mind).toBeGreaterThanOrEqual(7);
  });
  it('refill: HP, AP on its turn, ammo, MP, charge, cores; learn any word, school and module; designs', () => {
    let g = start(); const c = charOf(g);
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'emanator' }, HOST);
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'evoker' }, HOST);
    g = JSON.parse(JSON.stringify(g)); const u = pc(g); u.hp = 5; u.ammo = 0; u.ap = 0; u.jammed = true; u.mg!.mp = 3; u.mg!.charge = 1;
    g = apply(g, { type: 'sandbox/refill', charId: c.id }, HOST);
    const r = pc(g); expect(r.hp).toBe(r.maxHp); expect(r.ap).toBe(6); expect(r.ammo).toBe(WEAPON[r.weapon].magazine); expect(r.jammed).toBe(false);
    expect(r.mg!.mp).toBe(r.mg!.mpMax); expect(r.mg!.charge).toBe(10); expect(r.mg!.cores).toBeGreaterThanOrEqual(4);
    g = apply(g, { type: 'sandbox/learn', charId: c.id, word: 'fire' }, HOST);
    g = apply(g, { type: 'sandbox/learn', charId: c.id, school: 'buff', module: 'bounce' }, HOST);
    expect(charOf(g).sigils).toContain('fire'); expect(pc(g).mg!.words).toContain('fire');
    expect(charOf(g).soulKnown!.schools).toContain('buff');
    g = apply(g, { type: 'sandbox/design', charId: c.id, design: { id: '', name: 'Mend', school: 'buff', modules: ['bounce'] } }, HOST);
    expect(pc(g).mg!.designs.some((d) => d.name === 'Mend')).toBe(true);
    expect(refused(g, { type: 'sandbox/learn', charId: c.id, word: 'not_a_word' })).toMatch(/word/);
  });
  it('spawn, clear, enemy AI off, the mana meter', () => {
    let g = start(); const map = mapFor(g, 'proving_ground')!;
    const free = ['H6', 'J6', 'H8'].find((r) => { const k = r === 'H6' ? '7,5' : r === 'J6' ? '9,5' : '7,7'; return standable(map, k) && !g.combat!.units.some((u) => u.pos === k); })!;
    g = apply(g, { type: 'sandbox/spawn', tier: 'elite', weapon: 'war_axe', at: free }, HOST);
    const e = g.combat!.units.find((u) => u.id.startsWith('foe-s'))!; expect(e).toMatchObject({ tier: 'elite', weapon: 'war_axe', side: 'foe' }); expect(g.combat!.order).toContain(e.id);
    expect(refused(g, { type: 'sandbox/spawn', tier: 'elite', weapon: 'war_axe', at: free })).toMatch(/stand/);
    expect(refused(g, { type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: 'A1' }, GUEST)).toMatch(/host/);
    g = apply(g, { type: 'sandbox/clear' }, HOST);
    expect(g.combat!.units.some((u) => u.side === 'foe')).toBe(false); expect(g.combat!.over).toBeNull(); expect(active(g.combat!)!.side).toBe('pc');
    // An empty field never ends as a win: practise freely, then call a wave.
    g = apply(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id }, HOST); expect(g.combat!.over).toBeNull();
    g = apply(g, { type: 'sandbox/mana', value: 33 }, HOST); expect(g.combat!.mana).toBe(33); expect(g.story.mana).toBe(33);
    g = apply(g, { type: 'sandbox/ai', on: false }, HOST); expect(g.sandbox!.ai).toBe(false);
    g = apply(g, { type: 'sandbox/wave', wave: 2 }, HOST);
    const hp = g.combat!.units.filter((u) => u.side === 'pc').map((u) => u.hp);
    // With the AI off, enemies pass: ending turns through a whole round leaves the squad untouched.
    for (let i = 0; i < 3; i++) g = apply(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id }, HOST);
    expect(g.combat!.units.filter((u) => u.side === 'pc').map((u) => u.hp)).toEqual(hp);
  });
  it('gearing up: the tools change the character itself, and a finished fight never writes over them', () => {
    let g = killAll(start());
    g = apply(g, { type: 'combat/prone', unitId: pc(g).id }, HOST);
    expect(g.phase).toBe('story'); expect(g.combat!.over).toBe('win');
    const c = charOf(g);
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'drifter_revolver', equip: true }, HOST);
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'field_helmet', equip: true }, HOST);
    expect(charOf(g).weapon).toBe('drifter_revolver'); expect(charOf(g).loaded).toBe(6); expect(charOf(g).worn?.head).toBe('field_helmet');
    // the ordinary gear actions work here too (the character sheet's own buttons)
    g = apply(g, { type: 'gear/unequip', charId: c.id, slot: 'head' }, HOST); expect(charOf(g).worn?.head).toBeUndefined();
    // the main hand empties to fists, and the weapon goes to the pack
    g = apply(g, { type: 'sandbox/unequip', charId: c.id, slot: 'main' }, HOST);
    expect(charOf(g).weapon).toBe('fists'); expect(packOf(charOf(g)).some((it) => it.weapon === 'drifter_revolver' && it.kind === 'weapon')).toBe(true);
    expect(refused(g, { type: 'sandbox/unequip', charId: c.id, slot: 'main' })).toMatch(/empty/);
    const idx = packOf(charOf(g)).findIndex((it) => it.weapon === 'drifter_revolver' && it.kind === 'weapon');
    g = apply(g, { type: 'sandbox/equip', charId: c.id, idx, to: 'main' }, HOST);
    g = apply(g, { type: 'sandbox/wave' }, HOST);
    expect(pc(g).weapon).toBe('drifter_revolver'); expect(pc(g).ammo).toBe(6);
  });
  it('the magic kit: an Evoker in the off hand, cores, words, an Emanator, full MP and two designs; magic works at once', () => {
    let g = open(); const c = charOf(g);
    g = apply(g, { type: 'sandbox/kit', charId: c.id }, HOST);
    const ch = charOf(g);
    expect(hasEvoker(ch)).toBe(true); expect(hasEmanator(ch)).toBe(true);
    // In the off hand where it fits; next to a two-handed weapon it is carried in the pack (carried is enough).
    expect((WEAPON[ch.weapon] as any).hands === '2H' ? packOf(ch).some((it) => (it.item || it.id) === 'evoker') : ch.offHand?.id === 'evoker').toBe(true);
    expect(packOf(ch).find((it) => (it.item || it.id) === 'standard_core')!.qty).toBeGreaterThanOrEqual(4);
    expect(ch.sigils).toEqual(expect.arrayContaining(['fire', 'push']));
    expect((ch.outbursts || []).map((d) => d.school)).toEqual(expect.arrayContaining(['damage', 'buff']));
    expect(ch.mp).toBeGreaterThan(0);
    // twice is harmless (no second Evoker, no duplicate designs)
    const again = apply(g, { type: 'sandbox/kit', charId: c.id }, HOST);
    expect((charOf(again).outbursts || []).length).toBe((ch.outbursts || []).length);
    expect(packOf(charOf(again)).filter((it) => (it.item || it.id) === 'evoker').length + (charOf(again).offHand?.id === 'evoker' ? 1 : 0)).toBe(1);
    // In the fight: draw FIRE on our own tile, and the Outburst designs are ready.
    g = apply(apply(g, { type: 'sandbox/ai', on: false }, HOST), { type: 'sandbox/fight' }, HOST);
    const u = pc(g);
    expect(u.mg?.evoker).toBe(true); expect(u.mg!.words).toContain('fire'); expect(u.mg!.designs.length).toBeGreaterThanOrEqual(2);
    for (let i = 0; i < 4 && active(g.combat!)!.id !== u.id; i++) g = apply(g, { type: 'combat/end-turn', unitId: active(g.combat!)!.id }, HOST);
    g = apply(g, { type: 'combat/draw', unitId: u.id, word: 'fire', tile: refOf(u.pos) }, HOST);
    expect((g.combat!.glyphs || []).some((x) => x.word === 'fire')).toBe(true);
    // a Sigils-only kit for someone else, mid-fight
    expect(refused(g, { type: 'sandbox/kit', charId: c.id }, GUEST)).toMatch(/Not your/);
  });
  it('spawning while gearing up puts an idle drill unit on the map; clearing empties it', () => {
    let g = apply(open(), { type: 'sandbox/clear' }, HOST);
    const map = zoneMap(g), taken = new Set(Object.values(positionsOf(g)));
    const k = ['7,5', '9,5', '7,7', '8,6'].find((x) => standable(map, x) && !taken.has(x) && !(g.story.objects || []).some((o) => o.pos === x))!;
    g = apply(g, { type: 'sandbox/spawn', tier: 'elite', weapon: 'war_axe', at: refOf(k) }, HOST);
    expect(npcsOf(g)).toEqual([expect.objectContaining({ tier: 'elite', weapon: 'war_axe', side: 'hostile', pos: k })]);
    expect(g.phase).toBe('story');
    expect(refused(g, { type: 'sandbox/spawn', tier: 'minion', weapon: 'war_axe', at: refOf(k) })).toMatch(/stand/);
    g = apply(g, { type: 'sandbox/fight' }, HOST);
    expect(g.combat!.units.filter((u) => u.side === 'foe').map((u) => u.tier)).toEqual(['elite']);
  });
  it('players use the tools on their own characters only; the host on anyone', () => {
    let g = lobby(); g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'Ona', 'medic') }, GUEST); g = start(g);
    const mine = Object.values(g.characters).find((c) => c.owner === GUEST)!, hosts = charOf(g);
    expect(refused(g, { type: 'sandbox/give', charId: hosts.id, item: 'sabre' }, GUEST)).toMatch(/Not your/);
    g = apply(g, { type: 'sandbox/give', charId: mine.id, item: 'sabre' }, GUEST);
    g = apply(g, { type: 'sandbox/give', charId: mine.id, item: 'maul' }, HOST);
    expect(packOf(g.characters[mine.id]).filter((it) => it.kind === 'weapon').map((it) => it.weapon)).toEqual(expect.arrayContaining(['sabre', 'maul']));
  });
});

describe('perks and traits from the tools', () => {
  it('gives and takes a perk at a tier, and a trait, mid-fight too', () => {
    let g = start(); const c = charOf(g);
    g = apply(g, { type: 'sandbox/perk', charId: c.id, perk: 'breaching_strike', tier: 'II' }, HOST);
    expect(g.characters[c.id].perks).toContainEqual({ id: 'breaching_strike', tier: 'II' });
    g = apply(g, { type: 'sandbox/perk', charId: c.id, perk: 'breaching_strike', tier: 'I' }, HOST);
    expect(g.characters[c.id].perks.filter((x) => x.id === 'breaching_strike')).toEqual([{ id: 'breaching_strike', tier: 'I' }]);
    g = apply(g, { type: 'sandbox/perk', charId: c.id, perk: 'breaching_strike', tier: null }, HOST);
    expect(g.characters[c.id].perks.some((x) => x.id === 'breaching_strike')).toBe(false);
    g = apply(g, { type: 'sandbox/trait', charId: c.id, trait: 'pain_eater' }, HOST);
    expect(g.characters[c.id].traits).toContain('pain_eater');
    expect(refused(g, { type: 'sandbox/trait', charId: c.id, trait: 'pain_eater' })).toMatch(/Already held/);
    expect(refused(g, { type: 'sandbox/perk', charId: c.id, perk: 'nope' })).toMatch(/No such perk/);
    expect(refused(g, { type: 'sandbox/perk', charId: c.id, perk: 'breaching_strike' }, GUEST)).toMatch(/Not your character/);
    g = apply(g, { type: 'sandbox/trait', charId: c.id, trait: 'pain_eater', on: false }, HOST);
    expect(g.characters[c.id].traits).not.toContain('pain_eater');
  });
});

describe('outside the Proving Ground, and leaving it', () => {
  it('every sandbox action is refused outside it', () => {
    const g = lobby(), c = charOf(g);
    const acts: Action[] = [{ type: 'sandbox/wave' }, { type: 'sandbox/retry' }, { type: 'sandbox/give', charId: c.id, item: 'sabre' }, { type: 'sandbox/class', charId: c.id, classId: 'medic' },
      { type: 'sandbox/level', charId: c.id, level: 5 }, { type: 'sandbox/refill' }, { type: 'sandbox/learn', charId: c.id, word: 'fire' }, { type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: 'H6' },
      { type: 'sandbox/clear' }, { type: 'sandbox/ai', on: false }, { type: 'sandbox/mana', value: 3 }, { type: 'sandbox/end' }, { type: 'sandbox/skill', charId: c.id, skill: 'athletics', points: 3 },
      { type: 'sandbox/perk', charId: c.id, perk: 'breaching_strike' }, { type: 'sandbox/trait', charId: c.id, trait: 'pain_eater' }];
    for (const a of acts) expect(refused(g, a), a.type).toMatch(/Proving Ground is not open/);
    expect(refused(g, { type: 'sandbox/start' }, GUEST)).toMatch(/host/);
    const story = apply(g, { type: 'session/start' }, HOST);
    expect(refused(story, { type: 'sandbox/start' })).toMatch(/room/);
    for (const a of [{ type: 'sandbox/fight' }, { type: 'sandbox/stop' }, { type: 'sandbox/stage' }, { type: 'sandbox/kit', charId: c.id }] as Action[]) expect(refused(g, a), a.type).toMatch(/Proving Ground is not open/);
  });
  it('the Narrator and the story are refused inside it', () => {
    const g = start();
    expect(refused(g, { type: 'narrator/turn', turn: { narration: 'Hello.' } })).toMatch(/no Narrator/);
    expect(refused(g, { type: 'narrator/retry' })).toMatch(/no Narrator/);
    expect(refused(g, { type: 'session/start' })).toMatch(/no Narrator/);
  });
  it('views never carry the saved room; leaving restores characters, campaign and story', () => {
    const before = lobby(); let g = start(before); const c = charOf(g);
    expect(viewFor(g, GUEST).sandbox!.saved.characters).toEqual({});
    g = apply(g, { type: 'sandbox/level', charId: c.id, level: 12 }, HOST);
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'maul', equip: true }, HOST);
    const back = apply(g, { type: 'sandbox/end' }, HOST);
    expect(back.phase).toBe('lobby'); expect(back.combat).toBeNull(); expect(back.sandbox).toBeNull();
    expect(back.characters[c.id].level).toBe(1); expect(back.characters[c.id].weapon).toBe(before.characters[c.id].weapon);
    expect(back.campaign ?? null).toEqual(before.campaign ?? null); expect(back.story).toEqual(before.story);
    // and the room can start its real session afterwards
    expect(apply(back, { type: 'session/start' }, HOST).phase).toBe('story');
  });
  it('leaving while gearing up, after a fight, or mid-fight: back to the lobby with the room as it was, for everyone', () => {
    const before = lobby(); before.memory = { pins: ['keep me'] } as any;
    const fought = apply(killAll(start(before)), { type: 'combat/prone', unitId: pc(start(before)).id }, HOST);
    for (const g of [open(before), start(before), fought]) {
      const c = charOf(g);
      const g2 = apply(g, { type: 'sandbox/kit', charId: c.id }, HOST);
      expect(refused(g2, { type: 'sandbox/end' }, GUEST)).toMatch(/host/);
      const back = apply(g2, { type: 'sandbox/end' }, HOST);
      expect(back.phase).toBe('lobby'); expect(back.sandbox).toBeNull(); expect(back.combat).toBeNull();
      expect(back.story).toEqual(before.story); expect(back.characters).toEqual(before.characters);
      expect(back.memory).toEqual(before.memory);
      // what a guest sees: the lobby
      expect(viewFor(back, GUEST).phase).toBe('lobby');
    }
  });
});
