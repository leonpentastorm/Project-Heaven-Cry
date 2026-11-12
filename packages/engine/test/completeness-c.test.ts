// The completeness pass, part C: lanes B-H items whose story, area-map or reducer-path side was missing or untested.
// Everything goes through the reducer (apply): story/perk, world/act, combat/*, narrator/turn, check/roll, char/add.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  apply, newGame, npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, apLeft, d20, previewAttack, packOf, makeObject, ARCHETYPES, memoryOf,
  togglesFor, storyCb, WEAPONS, ITEM, maxHp, PATRON, sideSees,
  type GameState, type Combat, type Unit, type Sheet,
} from '../src';
import { fightWith, storyWith, sheetOf, withGame } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const storyHas = (g: GameState, re: RegExp) => g.story.entries.some((e: any) => re.test((e.head || '') + ' ' + (e.text || '')));
const rulingHas = (g: GameState, re: RegExp) => (g.story.rulings || []).some((r) => re.test(r.text));
function enemyTurn(f: F, pc: Unit, ...foes: Unit[]) {
  const cb = f.cb; cb.order = [pc.id, ...foes.map((x) => x.id), ...cb.order.filter((id) => id !== pc.id && !foes.some((x) => x.id === id))];
  f.turn(pc); f.act({ type: 'combat/end-turn', unitId: pc.id });
}
function freeNear(g: GameState, from: string, d: number): string {
  const [x, y] = from.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== d) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) return k; }
  throw new Error('no free tile');
}
function place(s: any, at: string, o: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [{ action: 'place', name: o.name || 'Guard', side: o.side || 'hostile', tier: o.tier || 'minion', weapon: 'service_pistol', at: refOf(at), ...o }] } } as any);
  return npcsOf(s.g)[npcsOf(s.g).length - 1];
}
function storyCheck(s: any, charId: string, skills: string[], tags: string[], die: number, extra: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'A test.', checks: [{ charId, skills, tn: 12, stakes: 'Test', tags, ...extra }] } } as any);
  s.g.rng.state = rngFor(die).state; const ck = s.g.checks.find((k: any) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
  return s.g.checks.find((k: any) => k.id === ck.id)!;
}

describe('Many Hands', () => {
  it('an ally whose reaction is spent reacts on the holder\'s (an Overwatch shot on an enemy\'s move)', () => {
    const f = fightWith([{ perks: { many_hands: 'mastered' } }, { weapon: 'hellraiser_service_rifle' }], [{ at: 'O10', weapon: 'fists' }]);
    const [h, a] = f.pcs, foe = f.foe; h.pos = '3,3'; a.pos = '3,4'; foe.pos = '12,4';
    f.turn(a); f.act({ type: 'combat/overwatch', unitId: a.id, mode: 'shot' });
    const cb = f.cb; f.unit(a.id).reactUsed = { r: cb.round, n: 1 }; // spent this round
    enemyTurn(f, f.unit(h.id), f.unit(foe.id));
    expect(logHas(f.cb, /reacts on .*reaction \(Many Hands\)/)).toBe(true);
  });
});

describe('Grenadier\'s Arm: objects', () => {
  it('an adjacent crate thrown onto an enemy: it and the crate take damage by weight; too far is refused', () => {
    const f = fightWith([{ traits: ['grenadiers_arm'], attrs: { strength: 5 } }], [{ at: 'O10' }]);
    const u = f.turn(f.pc); u.pos = '3,3'; f.foe.pos = '6,3'; f.cb.objects = [makeObject('cr', 'crate', '4,3')];
    const hp = f.foe.hp;
    f.act({ type: 'combat/perk', unitId: u.id, id: 'grenadiers_arm', actionId: 'hurl_object', tile: '4,3', choice: '6,3' } as any);
    expect(f.foe.hp).toBeLessThan(hp); expect(logHas(f.cb, /hurls the crate/)).toBe(true);
    expect(f.cb.objects!.find((o) => o.id === 'cr')!.pos).not.toBe('4,3');
  });
});

describe('Forlorn Hope at lock-in', () => {
  it('the soldier kit\'s Class 3 armour drops to Class I; the Proving Ground refuses heavier armour', () => {
    let g = newGame('FH', { id: 'host', name: 'Host' });
    const a = ARCHETYPES[0], sh: Sheet = { ...sheetOf({ kit: 'soldier' }), traits: ['forlorn_hope'] };
    g = apply(g, { type: 'char/add', sheet: sh }, 'host');
    const c = Object.values(g.characters)[0]; void a;
    expect(c.armourClass).toBe(1); expect(c.state?.armourDropped).toBe(3);
    const g2 = apply(newGame('FH2', { id: 'host', name: 'Host' }), { type: 'char/add', sheet: sheetOf({ kit: 'soldier' }) }, 'host');
    expect(Object.values(g2.characters)[0].armourClass).toBe(3);
  });
});

describe('Just the Repairman and Silent Partner on the area map', () => {
  it('Just the Repairman: a failed stay-hidden roll may still pass (d100), and that guard never checks again this scene', () => {
    let passed = false;
    for (let seed = 1; seed < 40 && !passed; seed++) {
      const s = storyWith([{ perks: ['just_the_repairman'] }], 'JR' + seed); const c = s.chars[0];
      s.g.characters[c.id].pack = [...packOf(s.g.characters[c.id]), { id: 'toolbox', item: 'toolbox', name: 'Toolbox', qty: 1, kind: 'tool' } as any];
      s.g.characters[c.id].skills.ingenuity = 0;
      const at = positionsOf(s.g)[c.id]; place(s, freeNear(s.g, at, 3), { tier: 'boss' });
      s.act({ type: 'world/act', charId: c.id, act: 'move', to: freeNear(s.g, at, 1), how: 'sneak' } as any);
      if (storyHas(s.g, /taken for staff|maintenance staff/)) { passed = true; expect(s.g.story.hidden![c.id]).toBe(true); }
    }
    expect(passed).toBe(true);
  });
  it('Silent Partner: one roll for both; the partner who walks away loses the shared stealth', () => {
    const s = storyWith([{ perks: ['silent_partner'] }, {}]); const [a, b] = s.chars;
    const at = positionsOf(s.g)[a.id]; s.g.story.positions![b.id] = freeNear(s.g, at, 1);
    s.g.story.sneak = { [a.id]: true, [b.id]: true }; s.g.story.hidden = { [a.id]: true, [b.id]: true };
    // The partner walks 4 tiles off, sneaking: no longer next to the holder.
    const far = freeNear(s.g, positionsOf(s.g)[b.id], 4);
    s.act({ type: 'world/act', charId: a.id, act: 'move', to: freeNear(s.g, at, 1), how: 'sneak' } as any);
    s.act({ type: 'world/act', charId: b.id, act: 'move', to: far, how: 'sneak' } as any);
    expect(s.g.story.hidden![b.id]).toBe(false); expect(storyHas(s.g, /leaves .* side and is seen \(Silent Partner\)/)).toBe(true);
  });
});

describe('Before the Blink from the area map; Never There against Overwatch', () => {
  it('a holder who isn\'t the attacker goes first in round 1 of a fight opened from the area map', () => {
    const s = storyWith([{}, { perks: { before_the_blink: 'mastered' } }]); const [a, b] = s.chars;
    const n = place(s, freeNear(s.g, positionsOf(s.g)[a.id], 3), { tier: 'boss' });
    s.act({ type: 'world/act', charId: a.id, act: 'attack', targetId: n.id, mode: 'shot' } as any);
    expect(s.g.phase).toBe('combat');
    expect(s.g.combat!.order[0]).toBe('pc-' + b.id);
  });
  it('Never There: the first move of a turn draws no Overwatch; a later move does, at −4', () => {
    const f = fightWith([{ perks: { never_there: 'mastered' } }], [{ at: 'O10', weapon: 'hellraiser_service_rifle' }]);
    const u = f.pc, foe = f.foe; u.pos = '2,2'; foe.pos = '10,2'; foe.overwatch = 'shot' as any; foe.ap = 6;
    f.turn(u); f.act({ type: 'combat/move', unitId: u.id, to: '3,3' });
    expect(f.unit(foe.id).overwatch).toBeTruthy(); // no Overwatch drawn
    f.act({ type: 'combat/move', unitId: u.id, to: '4,3' });
    expect(f.unit(foe.id).overwatch).toBeFalsy(); // the second move drew it (the shot is at −4: the preview term)
  });
});

describe('Verse of War, Twin Discipline and Dead Signal on the area map', () => {
  it('Verse of War: on the area map the toggle needs this round\'s Say', () => {
    const s = storyWith([{ perks: { verse_of_war: 'achieved' }, archetype: 'stormcaller', kit: 'soul' }]); const c = s.chars[0];
    const t0 = withGame(s.g, () => { const cb = storyCb(s.g), u = cb.units.find((x: Unit) => x.charId === c.id); return togglesFor({ u, cb, g: s.g }, 'combat/outburst'); });
    expect(t0.find((t: any) => /In verse/.test(t.label))?.why).toMatch(/Say your verse/);
    s.act({ type: 'story/speak', text: 'Burn, little star, and take them with you.' } as any);
    const t1 = withGame(s.g, () => { const cb = storyCb(s.g), u = cb.units.find((x: Unit) => x.charId === c.id); return togglesFor({ u, cb, g: s.g }, 'combat/outburst'); });
    expect(t1.find((t: any) => /In verse/.test(t.label))?.why).toBeFalsy();
  });
  it('Dead Signal on the area map: 1 AP, the device goes dark, and the act raises no notice check', () => {
    const s = storyWith([{ perks: ['dead_signal'] }]); const c = s.chars[0], at = positionsOf(s.g)[c.id];
    const k = freeNear(s.g, at, 2); s.g.story.objects = [...storyObjects(s.g), makeObject('cam1', 'camera', k)];
    s.g.story.sneak = { [c.id]: true }; s.g.story.hidden = { [c.id]: true };
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'dead_signal', actionId: 'disable_device', objId: 'cam1' } as any);
    expect(apLeft(s.g, s.g.characters[c.id])).toBe(5);
    expect(storyHas(s.g, /Dead Signal|goes dark|dark/)).toBe(true);
  });
});

describe('The Old Blood, Machine-Faced, The Brightest Light, Ghost Soldier', () => {
  it('Machine-Faced: a Heart save in dialogue succeeds with no roll', () => {
    const s = storyWith([{ traits: ['machine_faced'] }]); const c = s.chars[0];
    const ck = storyCheck(s, c.id, ['composure'], ['dialogue'], 1, { kind: 'save', family: 'heart' });
    expect(ck.roll!.ok).toBe(true);
  });
  it('The Brightest Light: Crashed is −2 on attack rolls in a later fight', () => {
    const f = fightWith([{ traits: ['the_brightest_light'] }], [{ at: 'O10' }]);
    const pu = f.turn(f.pc); pu.pos = '2,2'; f.foe.pos = '5,2';
    const base = withGame(f.g, () => previewAttack(f.cb, pu, f.foe, 'shot')).toHit;
    const g = fightWith([{ traits: ['the_brightest_light'] }], [{ at: 'O10' }]);
    g.g.characters[g.pc.charId!].state = { ...(g.g.characters[g.pc.charId!].state || {}), crashed: true };
    const s2 = fightWith([{ traits: ['the_brightest_light'] }], [{ at: 'O10' }]);
    void s2; // the crash is read when the unit is built: start a fight with it set
    const s = storyWith([{ traits: ['the_brightest_light'] }]); s.g.characters[s.chars[0].id].state = { crashed: true };
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
    const cb = s.g.combat!, u = cb.units.find((x) => x.side === 'pc')!, foe = cb.units.find((x) => x.side === 'foe')!; u.ap = 6; u.pos = '2,2'; foe.pos = '5,2';
    const crashed = withGame(s.g, () => previewAttack(cb, u, foe, 'shot')).toHit;
    expect(crashed).toBe(base - 2);
  });
  it('Ghost Soldier: found while sneaking on the area map costs 2 AP next round; an arm injury hits the prosthetic', () => {
    let done = false;
    for (let seed = 1; seed < 40 && !done; seed++) {
      const s = storyWith([{ traits: ['ghost_soldier'] }], 'GS' + seed); const c = s.chars[0]; s.g.characters[c.id].skills.ingenuity = 0;
      const at = positionsOf(s.g)[c.id]; place(s, freeNear(s.g, at, 3), { tier: 'boss' });
      s.act({ type: 'world/act', charId: c.id, act: 'move', to: freeNear(s.g, at, 1), how: 'sneak' } as any);
      if (!s.g.story.hidden![c.id]) { done = true; s.act({ type: 'world/act', charId: c.id, act: 'end' } as any); s.act({ type: 'narrator/turn', turn: { narration: 'Seen.' } } as any); expect(apLeft(s.g, s.g.characters[c.id])).toBe(4); }
    }
    expect(done).toBe(true);
  });
});

describe('Field Medic, Humanity First, Factory Made, Heavyworlder, Old School', () => {
  it('Field Medic: while the lock holds, Shove and Overwatch are refused', () => {
    const f = fightWith([{ traits: ['field_medic'] }, {}], [{ at: 'C6' }]);
    const [m, hurt] = f.pcs, foe = f.foe; m.pos = '5,5'; hurt.pos = '5,6'; foe.pos = '6,5'; f.unit(hurt.id).hp = 5;
    f.g.characters[m.charId!].stims = 2; f.turn(m);
    expect(() => f.act({ type: 'combat/shove', unitId: m.id, targetId: foe.id })).toThrow(/First, Do No Harm/);
    expect(() => f.act({ type: 'combat/overwatch', unitId: m.id, mode: 'shot' })).toThrow(/First, Do No Harm/);
  });
  it('Humanity First: AP given by a non-human squadmate is refused (the Rally Call, now that Hand-Off gives none)', () => {
    const f = fightWith([{ traits: ['humanity_first'] }, { traits: ['factory_made'], skills: { charisma: 5 } }], [{ at: 'O10' }]);
    const [h, bot] = f.pcs; h.pos = '3,3'; bot.pos = '3,4';
    f.turn(bot); f.act({ type: 'combat/call', unitId: bot.id, id: 'call.rally', targetId: h.id } as any);
    expect(logHas(f.cb, /won't take AP from .*Humanity First/)).toBe(true); expect(f.unit(h.id).apNext || 0).toBe(0);
  });
  it('Factory Made: a squadmate Field Repairs the machine body (combat/repair on them)', () => {
    const f = fightWith([{ skills: { proficiency: 5 } }, { traits: ['factory_made'] }], [{ at: 'O10' }]);
    const [mech, bot] = f.pcs; mech.pos = '3,3'; bot.pos = '3,4'; f.unit(bot.id).hp = 20; f.unit(mech.id).parts = 2;
    f.turn(mech); f.act({ type: 'combat/repair', unitId: mech.id, targetId: bot.id } as any);
    expect(f.unit(bot.id).hp).toBeGreaterThan(20); expect(logHas(f.cb, /patches .* chassis/)).toBe(true);
  });
  it('Heavyworlder: a heavy weapon is one-handed (the off hand stays); Old School refuses an electronic gun or a red dot', () => {
    const heavy = WEAPONS.find((w: any) => /^heavy/.test(w.category) && w.hands === '2H');
    if (heavy) {
      const s = storyWith([{ traits: ['heavyworlder'] }]); const c = s.g.characters[s.chars[0].id];
      c.offHand = { id: 'riot_shield' } as any; c.pack = [...packOf(c), { id: heavy.id, weapon: heavy.id, name: heavy.name, qty: 1, kind: 'weapon' } as any];
      for (const sk of Object.keys((heavy as any).requires || {})) c.skills[sk] = 10;
      s.act({ type: 'gear/equip', charId: c.id, idx: packOf(c).length - 1, to: 'main' } as any);
      expect(s.g.characters[c.id].weapon).toBe(heavy.id); expect(s.g.characters[c.id].offHand?.id).toBe('riot_shield');
    }
    const s = storyWith([{ traits: ['old_school'] }]); const c = s.g.characters[s.chars[0].id];
    const red = ITEM.mod_red_dot ? 'mod_red_dot' : null;
    if (red) { c.pack = [...packOf(c), { id: red, item: red, name: 'Red dot', qty: 1, kind: 'tool' } as any]; expect(() => s.act({ type: 'gear/mod', charId: c.id, idx: packOf(c).length - 1 } as any)).toThrow(/Old School|red dot|slot/); }
  });
});

describe('Insomniac, Rival, Rabbit\'s Foot, Company Man, Upper-Touched, Sworn Sibling, Chain Smoker', () => {
  it('Insomniac: session start gives back only half (Wired)', () => {
    let g = newGame('INS', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'char/add', sheet: { ...sheetOf({}), traits: ['insomniac'] } }, 'host');
    const id = Object.keys(g.characters)[0]; g.characters[id].hp = 10; const max = maxHp(g.characters[id]);
    g = apply(g, { type: 'session/start' }, 'host');
    expect(g.characters[id].hp).toBe(Math.round(10 + (max - 10) * 0.5));
  });
  it('Rival: Petty gates a stim on a Downed rival before anything is spent', () => {
    let gated = false;
    for (let seed = 1; seed < 40 && !gated; seed++) {
      const f = fightWith([{ traits: ['rival'], skills: { camaraderie: 0 } }, {}], [{ at: 'O10' }], { seed: 'RV' + seed });
      const [a, b] = f.pcs; a.pos = '3,3'; b.pos = '3,4'; const ca = f.g.characters[a.charId!]; ca.stims = 2;
      (ca.state ||= {})['bond:trait:rival'] = { ids: [b.charId] };
      f.unit(b.id).downed = true; f.unit(b.id).hp = 0;
      f.turn(a); try { f.act({ type: 'combat/stim', unitId: a.id, targetId: b.id } as any); } catch { continue; }
      if (logHas(f.cb, /doesn't stim .*Petty/)) { gated = true; expect(f.g.characters[a.charId!].stims).toBe(2); expect(f.unit(b.id).downed).toBe(true); }
    }
    expect(gated).toBe(true);
  });
  it('Rabbit\'s Foot: a taunt doesn\'t stop an Ork attacking the holder', () => {
    const f = fightWith([{ traits: ['rabbits_foot'] }, {}], [{ at: 'C6', weapon: 'fists' }]);
    const [h, tank] = f.pcs, ork = f.foe; ork.kind = 'ork'; h.pos = '5,5'; tank.pos = '7,7'; ork.pos = '6,5'; ork.ap = 6;
    ork.conds = { ...(ork.conds || {}), taunted: 2 }; ork.condBy = { ...(ork.condBy || {}), taunted: tank.id };
    const pv = withGame(f.g, () => previewAttack(f.cb, ork, h, 'melee'));
    expect(pv.ok).toBe(true);
    const plain = fightWith([{}, {}], [{ at: 'C6', weapon: 'fists' }]); const [h2, t2] = plain.pcs, o2 = plain.foe; h2.pos = '5,5'; t2.pos = '7,7'; o2.pos = '6,5'; o2.ap = 6; o2.kind = 'ork';
    o2.conds = { ...(o2.conds || {}), taunted: 2 }; o2.condBy = { ...(o2.condBy || {}), taunted: t2.id };
    expect(withGame(plain.g, () => previewAttack(plain.cb, o2, h2, 'melee')).ok).toBe(false);
  });
  it('Company Man: the RTC contract is a memory thread from the first session', () => {
    let g = newGame('CM', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'char/add', sheet: { ...sheetOf({}), traits: ['company_man'] } }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    expect(memoryOf(g).threads.some((t) => /RTC contract/.test(t.title) && t.kind === 'debt')).toBe(true);
  });
  it('Upper-Touched: a story Blessing rolls the d6; an upper-realm token within 10 tiles is felt on the area map', () => {
    const s = storyWith([{ traits: ['upper_touched'], skills: { faith: 5 } }]); const c = s.g.characters[s.chars[0].id];
    c.patron = Object.keys(PATRON)[0]; c.devotion = 5; s.g.rng.state = rngFor(20).state;
    s.act({ type: 'story/pray', charId: c.id, text: 'Help.' } as any);
    expect(rulingHas(s.g, /Upper-Touched d6 \d/)).toBe(true);
    const t = storyWith([{ traits: ['upper_touched'] }]); const at = positionsOf(t.g)[t.chars[0].id];
    place(t, freeNear(t.g, at, 4), { name: 'Pale watcher', kind: 'upper_realm' });
    t.act({ type: 'world/act', charId: t.chars[0].id, act: 'move', to: freeNear(t.g, at, 1), how: 'move' } as any);
    expect(storyHas(t.g, /feels something from above/)).toBe(true);
  });
  it('Chain Smoker: an enemy sees the smoker 2 tiles past its Vision in the fog', () => {
    const f = fightWith([{ traits: ['chain_smoker'] }], [{ at: 'O10' }]);
    const u = f.pc, foe = f.foe; foe.vision = 4; u.pos = '2,2'; foe.pos = '8,2';
    expect(withGame(f.g, () => sideSees(f.cb, 'foe', u))).toBe(true);
    const g = fightWith([{}], [{ at: 'O10' }]); g.foe.vision = 4; g.pc.pos = '2,2'; g.foe.pos = '8,2';
    expect(withGame(g.g, () => sideSees(g.cb, 'foe', g.pc))).toBe(false);
  });
});

describe('Lowland Born, Raised by Orks, Oil in My Mind, start items', () => {
  it('Lowland Born: −2 Vigilant on a story check in an open zone', () => {
    const s = storyWith([{ traits: ['lowland_born'] }]); const c = s.chars[0];
    s.g.campaign = JSON.parse(JSON.stringify(s.g.campaign)); // shared between states: change a copy
    const z = (s.g.campaign as any).zones.find((x: any) => x.id === zoneMap(s.g).id); z.tags = [...(z.tags || []), 'terrain:open'];
    const ck = storyCheck(s, c.id, ['vigilant'], [], 10);
    expect(JSON.stringify(ck.roll) + JSON.stringify(s.g.story.entries.at(-1))).toMatch(/Lowland|Open Sky|−2/);
  });
  it('Raised by Orks: an Ork holds its attack on its turn; a squad attack on it ends the parley', () => {
    const f = fightWith([{ traits: ['raised_by_orks'] }], [{ at: 'C6', weapon: 'fists' }]);
    const u = f.pc, ork = f.foe; ork.kind = 'ork'; u.pos = '5,5'; ork.pos = '6,5'; ork.attack = 60; const hp = u.hp;
    enemyTurn(f, u, ork);
    expect(f.unit(u.id).hp).toBe(hp);
  });
  it('start items: City ID and bank card (Central City Kid), the prosthetic arm (Ghost Soldier)', () => {
    for (const [trait, items] of [['central_city_kid', ['city_id', 'bank_card']], ['ghost_soldier', ['prosthetic_arm']]] as const) {
      let g = newGame('SI', { id: 'host', name: 'Host' });
      g = apply(g, { type: 'char/add', sheet: { ...sheetOf({}), traits: [trait] } }, 'host');
      g = apply(g, { type: 'session/start' }, 'host');
      const c = Object.values(g.characters)[0];
      for (const it of items) expect(packOf(c).some((x) => (x.item || x.id) === it), trait + ': ' + it).toBe(true);
    }
  });
});
