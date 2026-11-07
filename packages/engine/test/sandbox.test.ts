// The Proving Ground (practice mode): endless waves, infinite retry, the tools panel's actions, and no Narrator.
import { describe, expect, it } from 'vitest';
import {
  ARCHETYPES, type Sheet, type GameState, type Action, newGame, apply, RuleError, sandboxWave, PROVING_GROUND, validateCampaign, zoneMap, active,
  WEAPON, maxHp, classRank, packOf, hasEvoker, viewFor, ADVANCED_CLASSES, CLASS, MANA_START, mapFor, standable,
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
const start = (g = lobby()) => apply(g, { type: 'sandbox/start' }, HOST);
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
  it('start opens wave 1 with no Narrator work, no XP and no story', () => {
    const before = lobby(), g = start(before);
    expect(g.phase).toBe('combat');
    expect(g.sandbox).toMatchObject({ wave: 1, state: 'fighting', ai: true, attempt: 1 });
    expect(g.story.work).toBeNull();
    expect(g.combat!.noXp).toBe(true);
    expect(g.combat!.units.filter((u) => u.side === 'foe').length).toBe(sandboxWave(1).length);
    expect(g.story.entries.length).toBe(before.story.entries.length);
    expect(active(g.combat!)!.side).toBe('pc'); // enemies who rolled higher already acted
  });
  it('a quick start with nobody locked in makes a test character (removed on leaving)', () => {
    const g = start(lobby(false));
    const c = charOf(g); expect(c.name).toMatch(/^Recruit /);
    const back = apply(g, { type: 'sandbox/end' }, HOST);
    expect(back.phase).toBe('lobby'); expect(Object.keys(back.characters)).toEqual([]);
  });
  it('a cleared wave waits, then the next comes with the squad as it stands; the best wave is kept', () => {
    let g = start();
    g = killAll(g);
    g = apply(g, { type: 'combat/prone', unitId: pc(g).id }, HOST);
    expect(g.combat!.over).toBe('win');
    expect(g.sandbox).toMatchObject({ state: 'cleared', best: 1 });
    expect(g.phase).toBe('combat'); expect(g.story.work).toBeNull(); // no finishCombat, no Narrator call
    expect(charOf(g).xp).toBe(0);
    const hurt: GameState = JSON.parse(JSON.stringify(g)); const u = pc(hurt); u.hp = 40;
    expect(refused(hurt, { type: 'sandbox/wave', wave: 4 }, GUEST)).toMatch(/host/);
    const g2 = apply(hurt, { type: 'sandbox/wave' }, GUEST);
    expect(g2.sandbox).toMatchObject({ wave: 2, state: 'fighting', best: 1 });
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
    expect(g.combat!.over).toBe('loss'); expect(g.sandbox!.state).toBe('fallen'); expect(g.phase).toBe('combat'); expect(g.story.work).toBeNull();
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
  it('players use the tools on their own characters only; the host on anyone', () => {
    let g = lobby(); g = apply(g, { type: 'char/add', sheet: sheetFrom('field_medic', 'Ona', 'medic') }, GUEST); g = start(g);
    const mine = Object.values(g.characters).find((c) => c.owner === GUEST)!, hosts = charOf(g);
    expect(refused(g, { type: 'sandbox/give', charId: hosts.id, item: 'sabre' }, GUEST)).toMatch(/Not your/);
    g = apply(g, { type: 'sandbox/give', charId: mine.id, item: 'sabre' }, GUEST);
    g = apply(g, { type: 'sandbox/give', charId: mine.id, item: 'maul' }, HOST);
    expect(packOf(g.characters[mine.id]).filter((it) => it.kind === 'weapon').map((it) => it.weapon)).toEqual(expect.arrayContaining(['sabre', 'maul']));
  });
});

describe('outside the Proving Ground, and leaving it', () => {
  it('every sandbox action is refused outside it', () => {
    const g = lobby(), c = charOf(g);
    const acts: Action[] = [{ type: 'sandbox/wave' }, { type: 'sandbox/retry' }, { type: 'sandbox/give', charId: c.id, item: 'sabre' }, { type: 'sandbox/class', charId: c.id, classId: 'medic' },
      { type: 'sandbox/level', charId: c.id, level: 5 }, { type: 'sandbox/refill' }, { type: 'sandbox/learn', charId: c.id, word: 'fire' }, { type: 'sandbox/spawn', tier: 'minion', weapon: 'fists', at: 'H6' },
      { type: 'sandbox/clear' }, { type: 'sandbox/ai', on: false }, { type: 'sandbox/mana', value: 3 }, { type: 'sandbox/end' }, { type: 'sandbox/skill', charId: c.id, skill: 'athletics', points: 3 }];
    for (const a of acts) expect(refused(g, a), a.type).toMatch(/Proving Ground is not open/);
    expect(refused(g, { type: 'sandbox/start' }, GUEST)).toMatch(/host/);
    const story = apply(g, { type: 'session/start' }, HOST);
    expect(refused(story, { type: 'sandbox/start' })).toMatch(/room/);
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
});
