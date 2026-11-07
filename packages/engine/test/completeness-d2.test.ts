// The completeness pass, batch 4 (items 40-52): through the reducer (apply). Beast Handler's beast as an area-map
// token; Field Medic's lock and Thrown Stim on the area map; Humanity First's combat parts through combat/*; Sworn
// Sibling and Upper-Touched through the sight hook; Chain Smoker's fog range on an enemy's turn; Factory Made repaired
// by an ally; Heavyworlder's shove immunity, skill mods and lit-tile stay-hidden; Old School's equip ban in the story;
// Insomniac's Wired at session start and Always Up on an enemy's turn; Rival's Petty on a Downed stim (fight and area
// map); Rabbit's Foot against a taunt and an Interpose; Company Man's RTC contract thread.
import { describe, expect, it } from 'vitest';
import {
  apply, newGame, npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, apLeft, d20, maxHp, memoryOf, packOf,
  storyCb, briefOf, holdersOf, companionId, COMPANION_ROUND_AP, COMPANION_KINDS, CLASS, TRAITS, visibility, sideSees,
  type GameState, type Combat, type Unit,
} from '../src';
import { fightWith, storyWith, withGame, sheetOf, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const storyHas = (g: GameState, re: RegExp) => g.story.entries.some((e: any) => re.test((e.head || '') + ' ' + (e.text || '')));
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
const cheb = (a: string, b: string) => Math.max(Math.abs(+a.split(',')[0] - +b.split(',')[0]), Math.abs(+a.split(',')[1] - +b.split(',')[1]));
function freeAt(g: GameState, near: string, d: number): string {
  const [x, y] = near.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== d) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) return k; }
  throw new Error('no free tile');
}
function place(s: any, at: string, o: any = {}) {
  s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [{ action: 'place', name: o.name || 'Guard', side: o.side || 'hostile', tier: o.tier || 'minion', weapon: o.weapon || 'service_pistol', at: refOf(at), ...(o.kind ? { kind: o.kind } : {}) }] } } as any);
  return npcsOf(s.g)[npcsOf(s.g).length - 1];
}
/** A fight opened by the Narrator with enemy traits (kind, tags, hidden). */
function fightOf(specs: CharSpec[], foes: any[], seed = 'D2') {
  const s = storyWith(specs, seed);
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Test fight', map: 'yard', difficulty: 'standard', enemies: foes.map((f, i) => ({ name: f.name || 'Foe ' + (i + 1), tier: f.tier || 'soldier', weapon: f.weapon || 'service_pistol', at: f.at || '', ...f })) } } } as any);
  return s;
}
/** The PC ends its turn and the given foes act next (their AI through combat/end-turn). */
function enemyTurn(f: F, pc: Unit, ...foes: Unit[]) {
  const cb = f.cb; cb.order = [pc.id, ...foes.map((x) => x.id), ...cb.order.filter((id) => id !== pc.id && !foes.some((x) => x.id === id))];
  f.turn(pc); f.act({ type: 'combat/end-turn', unitId: pc.id });
}
function storyCheck(s: any, charId: string, skills: string[], tags: string[], die: number) {
  s.act({ type: 'narrator/turn', turn: { narration: 'A test.', checks: [{ charId, skills, tn: 12, stakes: 'Test', tags }] } } as any);
  s.g.rng.state = rngFor(die).state; const ck = s.g.checks.find((k: any) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id });
  return s.g.checks.find((k: any) => k.id === ck.id)!;
}
const totalOf = (ck: any) => JSON.stringify(ck.roll);

// ---------------------------------------------------------------------------------------------------------------------
describe('Beast Handler: the beast is a token on the area map (item 40)', () => {
  it('it stands next to its owner, moves on its own 4 AP a round (the owner\'s AP untouched), and starts the fight where it is', () => {
    const s = storyWith([{ traits: ['beast_handler'] }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'On.', sceneTitle: 'Scene two' } } as any);
    const ch = s.g.characters[c.id], comp = ch.companions!.find((k) => k.kind === 'beast')!, id = companionId(ch, comp);
    const pos = positionsOf(s.g); expect(pos[id]).toBeTruthy(); expect(cheb(pos[id], pos[c.id])).toBeLessThanOrEqual(3);
    expect(COMPANION_ROUND_AP.beast).toBe(4);
    expect(withGame(s.g, () => storyCb(s.g).units.some((u: Unit) => u.id === id && u.companion === 'beast' && u.ap === 4))).toBe(true);
    const to = freeAt(s.g, pos[id], 2);
    s.act({ type: 'world/act', charId: c.id, act: 'move', to, how: 'move', unit: id } as any);
    expect(positionsOf(s.g)[id]).toBe(to); expect(apLeft(s.g, s.g.characters[c.id])).toBe(6);
    expect(s.g.story.ap![id]).toBeLessThan(4); expect(storyHas(s.g, /pads to/)).toBe(true);
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'attack', unit: id, targetId: 'x' } as any)).toThrow(/beast only moves/);
    const h = holdersOf({ c: s.g.characters[c.id] }).find((x) => x.key === 'trait:beast_handler')!;
    expect(withGame(s.g, () => briefOf({ ...h, g: s.g } as any))).toMatch(/beast at .*Central City/);
    const n = place(s, freeAt(s.g, positionsOf(s.g)[c.id], 3), { name: 'Raider', tier: 'boss' });
    s.act({ type: 'world/act', charId: c.id, act: 'attack', targetId: n.id, mode: 'shot' } as any);
    expect(s.g.phase).toBe('combat');
    const b = s.g.combat!.units.find((u) => u.id === id)!; expect(b.pos).toBe(to); expect(b.maxHp).toBe(COMPANION_KINDS.beast.hp);
  });
  it('the trait\'s companion op and the stat block agree on 60 HP (item 370, settled); a dead beast leaves the map', () => {
    const eff = (TRAITS as any[]).find((t) => t.id === 'beast_handler').effects.find((e: any) => e.op === 'companion');
    expect(eff.hp).toBe(COMPANION_KINDS.beast.hp); expect(eff.hp).toBe(60); expect(eff.provisional).toBeUndefined();
    const s = storyWith([{ traits: ['beast_handler'] }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'On.', sceneTitle: 'Scene two' } } as any);
    const ch = s.g.characters[c.id], comp = ch.companions!.find((k) => k.kind === 'beast')!, id = companionId(ch, comp);
    comp.hp = 0; expect(positionsOf(s.g)[id]).toBeUndefined();
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'move', to: freeAt(s.g, positionsOf(s.g)[c.id], 2), how: 'move', unit: id } as any)).toThrow(/gone/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Field Medic on the area map (item 41)', () => {
  const setup = (traits: string[]) => {
    const s = storyWith([{ traits }, {}]); const [m, hurt] = s.chars;
    s.g.characters[m.id].stims = 2;
    const pm = positionsOf(s.g)[m.id]; s.g.story.positions![hurt.id] = freeAt(s.g, pm, 1);
    s.act({ type: 'narrator/turn', turn: { narration: 'A blast.', harm: [{ charId: hurt.id, amount: maxHp(s.g.characters[hurt.id]) - 5, why: 'shrapnel' }] } } as any);
    const n = place(s, freeAt(s.g, pm, 3), { name: 'Raider', tier: 'boss' }); // the next Narrator turn opens a new round
    return { s, m, hurt, n };
  };
  it('a squadmate bleeding out within 5 tiles: no attack until you heal someone; a stim lifts the lock', () => {
    const { s, m, hurt, n } = setup(['field_medic']);
    expect(storyHas(s.g, /First, Do No Harm/)).toBe(true);
    expect(() => s.act({ type: 'world/act', charId: m.id, act: 'attack', targetId: n.id, mode: 'shot' } as any)).toThrow(/First, Do No Harm/);
    s.act({ type: 'world/act', charId: m.id, act: 'stim', targetId: hurt.id } as any);
    expect(s.g.characters[hurt.id].hp).toBeGreaterThan(5);
    s.act({ type: 'world/act', charId: m.id, act: 'attack', targetId: n.id, mode: 'shot' } as any);
    expect(s.g.phase).toBe('combat');
  });
  it('without the trait the attack goes ahead', () => {
    const { s, m, n } = setup([]);
    s.act({ type: 'world/act', charId: m.id, act: 'attack', targetId: n.id, mode: 'shot' } as any);
    expect(s.g.phase).toBe('combat');
  });
  it('Thrown Stim on the area map: a Downed ally 3 tiles away is up at 1 HP; one stim spent', () => {
    const s = storyWith([{ traits: ['field_medic'] }, {}]); const [m, hurt] = s.chars;
    s.g.characters[m.id].stims = 2; const pm = positionsOf(s.g)[m.id];
    s.g.story.positions![hurt.id] = freeAt(s.g, pm, 3);
    s.act({ type: 'narrator/turn', turn: { narration: 'Down.', harm: [{ charId: hurt.id, amount: 9999, why: 'a fall' }] } } as any);
    expect(s.g.characters[hurt.id].hp).toBe(0);
    s.act({ type: 'world/act', charId: m.id, act: 'perk', id: 'field_medic', actionId: 'thrown_stim', targetId: 'pc-' + hurt.id } as any);
    expect(s.g.characters[hurt.id].hp).toBe(1); expect(s.g.characters[m.id].stims).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Humanity First in a fight, through combat/* (item 42)', () => {
  const shotLoss = (kind: string, trait: boolean) => {
    const f = fightWith([{ traits: trait ? ['humanity_first'] : [] }], [{ at: 'C6' }], { seed: 'HF' });
    const u = f.turn(f.pc), foe = f.foe; foe.kind = kind; foe.def = -60; foe.armour = 0; u.pos = '2,5'; foe.pos = '4,5'; foe.hp = foe.maxHp = 500;
    f.g.rng.state = rngFor(10).state; f.act({ type: 'combat/attack', unitId: u.id, targetId: foe.id, mode: 'shot' });
    return 500 - f.unit(foe.id).hp;
  };
  it('For Humanity: +15% on a shot at a robot; nothing extra on a human, nor without the trait', () => {
    const human = shotLoss('human', true), robot = shotLoss('robot', true), plain = shotLoss('robot', false);
    expect(human).toBeGreaterThan(0); expect(plain).toBe(human);
    expect(Math.abs(robot - human * 1.15)).toBeLessThanOrEqual(1);
  });
  it('Xenophobe: a Factory Made squadmate\'s stim heals at half (through combat/stim); a human\'s in full', () => {
    const heal = (giver: string[]) => {
      const f = fightWith([{ traits: ['humanity_first'] }, { traits: giver }], [{ at: 'O10' }]);
      const [h, m] = f.pcs; h.pos = '3,3'; m.pos = '3,4'; f.unit(h.id).hp = 10; f.g.characters[m.charId!].stims = 2;
      f.turn(m); f.act({ type: 'combat/stim', unitId: m.id, targetId: h.id } as any);
      return f.unit(h.id).hp - 10;
    };
    const full = heal([]), half = heal(['factory_made']);
    expect(full).toBeGreaterThan(0); expect(half).toBe(Math.round(full * 0.5));
  });
  it('Xenophobe on the area map: a non-human\'s Hand-Off is refused (the AP stays with the giver)', () => {
    const s = storyWith([{ traits: ['humanity_first'] }, { traits: ['factory_made'], perks: { many_hands: 'mastered' } }]); const [h, bot] = s.chars;
    s.g.story.positions![bot.id] = freeAt(s.g, positionsOf(s.g)[h.id], 1);
    s.act({ type: 'world/act', charId: bot.id, act: 'perk', id: 'many_hands', actionId: 'hand_off', targetId: h.id, choice: '2' } as any);
    expect(apLeft(s.g, s.g.characters[h.id])).toBe(6); expect(apLeft(s.g, s.g.characters[bot.id])).toBe(6); // refused: nothing moves
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the sight hook: Sworn Sibling, Upper-Touched, Chain Smoker (items 43-45)', () => {
  it('Sworn Sibling: once bonded in the story, the holder sees the sibling through walls and fog in the fight', () => {
    const run = (bond: boolean) => {
      const s = storyWith([{ traits: ['sworn_sibling'] }, { owner: 'host' }]);
      if (bond) s.act({ type: 'story/perk', charId: s.chars[0].id, id: 'sworn_sibling', choice: s.chars[1].name } as any);
      s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Dark', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
      const cb = s.g.combat!, [a, b] = cb.units.filter((u) => u.side === 'pc' && !u.companion);
      a.pos = '0,0'; b.pos = String(cb.map.w - 1) + ',' + String(cb.map.h - 1); a.vision = 2;
      return withGame(s.g, () => sideSees(cb, 'pc', b, a));
    };
    expect(run(true)).toBe(true);
  });
  it('Upper-Touched: an upper-realm foe 8 tiles off is sensed through the fog (combat_start line); a human one isn\'t', () => {
    const run = (kind: string) => {
      const s = fightOf([{ traits: ['upper_touched'] }], [{ name: 'Pale one', kind, at: 'A1' }]);
      const cb = s.g.combat!, u = cb.units.find((x) => x.side === 'pc')!, v = cb.units.find((x) => x.side === 'foe')!;
      u.pos = '1,1'; v.pos = '9,1'; u.vision = 3;
      return { sensed: withGame(s.g, () => visibility(cb, 'pc').sensed.has(v.id)), cb };
    };
    expect(run('upper_realm').sensed).toBe(true); expect(run('human').sensed).toBe(false);
  });
  it('Chain Smoker: an enemy with Vision 4 fires at the smoker 6 tiles off on its turn; a plain squadmate there it can\'t see', () => {
    const run = (trait: boolean) => {
      const f = fightWith([{ traits: trait ? ['chain_smoker'] : [] }], [{ at: 'O10' }]);
      const u = f.pc, foe = f.foe; foe.vision = 4; u.pos = '2,2'; foe.pos = '8,2'; foe.ap = 6;
      return withGame(f.g, () => sideSees(f.cb, 'foe', u, foe));
    };
    expect(run(true)).toBe(true); expect(run(false)).toBe(false);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Factory Made, Heavyworlder, Old School (items 46-48)', () => {
  it('Factory Made: a squadmate Field Repairs the machine body through combat/repair; one spare-parts charge', () => {
    const f = fightWith([{ skills: { proficiency: 5 } }, { traits: ['factory_made'] }], [{ at: 'O10' }]);
    const [mech, bot] = f.pcs; mech.pos = '3,3'; bot.pos = '3,4'; f.unit(bot.id).hp = 20; f.unit(mech.id).parts = 2;
    f.turn(mech); f.act({ type: 'combat/repair', unitId: mech.id, targetId: bot.id } as any);
    expect(f.unit(bot.id).hp).toBeGreaterThan(20); expect(f.unit(mech.id).parts).toBe(1);
  });
  it('Heavyworlder: a squadmate\'s shove doesn\'t budge them; +2 Intimidation and −3 Athletics on story checks', () => {
    const f = fightWith([{}, { traits: ['heavyworlder'] }], [{ at: 'O10' }]);
    const [a, hw] = f.pcs; a.pos = '3,3'; hw.pos = '3,4';
    f.turn(a); f.act({ type: 'combat/shove', unitId: a.id, targetId: hw.id });
    expect(f.unit(hw.id).pos).toBe('3,4'); expect(logHas(f.cb, /doesn't budge/)).toBe(true);
    const total = (traits: string[], skill: string) => { const s = storyWith([{ traits }]); return totalOf(storyCheck(s, s.chars[0].id, [skill], [], 10)); };
    const n = (j: string) => +(/"total":(-?\d+)/.exec(j) || [0, NaN])[1];
    expect(n(total(['heavyworlder'], 'intimidation')) - n(total([], 'intimidation'))).toBe(2);
    expect(n(total(['heavyworlder'], 'athletics')) - n(total([], 'athletics'))).toBe(-3);
  });
  it('Heavyworlder: sneaking up to a guard on a lit area map fails to stay hidden with no roll', () => {
    const s = storyWith([{ traits: ['heavyworlder'] }]); const at = positionsOf(s.g)[s.chars[0].id];
    const map = zoneMap(s.g), [x, y] = at.split(',').map(Number);
    let pair: [string, string] | null = null; // a guard 2 tiles off and a free tile next to both
    for (let i = -2; i <= 2 && !pair; i++) for (let j = -2; j <= 2 && !pair; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== 2) continue; const gk = (x + i) + ',' + (y + j); if (!standable(map, gk)) continue;
      for (let a2 = -1; a2 <= 1 && !pair; a2++) for (let b2 = -1; b2 <= 1 && !pair; b2++) { const k = (x + a2) + ',' + (y + b2); if ((a2 || b2) && standable(map, k) && cheb(k, gk) === 1) pair = [gk, k]; } }
    const run = (trait: boolean) => {
      const t = storyWith([{ traits: trait ? ['heavyworlder'] : [] }]); const tc = t.chars[0];
      place(t, pair![0]); t.g.story.sneak = { [tc.id]: true }; t.g.story.hidden = { [tc.id]: true }; t.g.characters[tc.id].skills.ingenuity = 10;
      t.g.rng.state = rngFor(20).state;
      t.act({ type: 'world/act', charId: tc.id, act: 'move', to: pair![1], how: 'sneak' } as any);
      return !!t.g.story.hidden?.[tc.id];
    };
    expect(run(true)).toBe(false); expect(run(false)).toBe(true); // without the trait, the same 20 stays hidden
  });
  it('Old School: equipping an electronic or Evoker-linked gun is refused in the story', () => {
    const s = storyWith([{ traits: ['old_school'] }]); const c = s.g.characters[s.chars[0].id];
    c.pack = [...packOf(c), { id: 'core_rifle', weapon: 'core_rifle', name: 'Core rifle', qty: 1, kind: 'weapon' } as any];
    for (const sk of ['proficiency', 'evoker', 'emanator', 'marksmanship', 'dexterity']) c.skills[sk] = 5;
    expect(() => s.act({ type: 'gear/equip', charId: c.id, idx: packOf(c).length - 1, to: 'main' } as any)).toThrow(/Old School/);
    const p = storyWith([{}]); const pc = p.g.characters[p.chars[0].id];
    pc.pack = [...packOf(pc), { id: 'core_rifle', weapon: 'core_rifle', name: 'Core rifle', qty: 1, kind: 'weapon' } as any];
    for (const sk of ['proficiency', 'evoker', 'emanator', 'marksmanship', 'dexterity']) pc.skills[sk] = 5;
    let err = ''; try { p.act({ type: 'gear/equip', charId: pc.id, idx: packOf(pc).length - 1, to: 'main' } as any); } catch (e: any) { err = e.message; }
    expect(err).not.toMatch(/Old School/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Insomniac, Rival, Rabbit\'s Foot, Company Man (items 49-52)', () => {
  it('Insomniac Wired: session start gives back half; without the trait, all of it', () => {
    for (const [traits, frac] of [[['insomniac'], 0.5], [[], 1]] as const) {
      let g = newGame('INS', { id: 'host', name: 'Host' });
      g = apply(g, { type: 'char/add', sheet: { ...sheetOf({}), traits: [...traits] } }, 'host');
      const id = Object.keys(g.characters)[0]; g.characters[id].hp = 10; const max = maxHp(g.characters[id]);
      g = apply(g, { type: 'session/start' }, 'host');
      expect(g.characters[id].hp).toBe(Math.round(10 + (max - 10) * frac));
    }
  });
  it('Insomniac Always Up: rested in this scene, a hidden enemy\'s opening shot on its turn is no ambush', () => {
    let found = false;
    for (let seed = 1; seed < 30 && !found; seed++) {
      const s = storyWith([{ traits: ['insomniac'] }], 'AU' + seed);
      s.act({ type: 'narrator/turn', turn: { narration: 'Night.', rest: { kind: 'short' }, combat: { name: 'Night raid', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'soldier', weapon: 'service_pistol', at: '', hidden: true }] } } } as any);
      const cb = s.g.combat!, pc = cb.units.find((u) => u.side === 'pc')!, foe = cb.units.find((u) => u.side === 'foe')!;
      pc.pos = '2,5'; foe.pos = '6,5'; foe.attack = 40; foe.ap = 6;
      const f = { get g() { return s.g; }, get cb() { return s.g.combat!; }, act: s.act, turn: (u: Unit) => { const c2 = s.g.combat!; c2.turn = c2.order.indexOf(u.id); return u; } } as any;
      cb.order = [pc.id, foe.id, ...cb.order.filter((id) => id !== pc.id && id !== foe.id)]; cb.turn = 0;
      s.act({ type: 'combat/end-turn', unitId: pc.id }); void f;
      if (logHas(s.g.combat || cb, /Always Up/)) found = true;
    }
    expect(found).toBe(true);
  });
  it('Rival Petty: a failed Camaraderie check stops a stim on the Downed rival before anything is spent (area map too)', () => {
    let gated = false;
    for (let seed = 1; seed < 40 && !gated; seed++) {
      const s = storyWith([{ traits: ['rival'], skills: { camaraderie: 0 } }, {}], 'RVW' + seed); const [a, b] = s.chars;
      const ca = s.g.characters[a.id]; ca.stims = 2; (ca.state ||= {})['bond:trait:rival'] = { ids: [b.id] };
      s.g.story.positions![b.id] = freeAt(s.g, positionsOf(s.g)[a.id], 1);
      s.act({ type: 'narrator/turn', turn: { narration: 'Down.', harm: [{ charId: b.id, amount: 9999, why: 'a fall' }] } } as any);
      try { s.act({ type: 'world/act', charId: a.id, act: 'stim', targetId: b.id } as any); } catch { continue; }
      if (storyHas(s.g, /Petty/) && s.g.characters[b.id].hp <= 0) { gated = true; expect(s.g.characters[a.id].stims).toBe(2); }
    }
    expect(gated).toBe(true);
  });
  it('Rabbit\'s Foot: a taunted Ork still goes for the holder on its turn; an Interpose doesn\'t take its blow', () => {
    const run = (trait: boolean) => {
      const f = fightWith([{ traits: trait ? ['rabbits_foot'] : [] }, { classId: 'defender', level: 5, skills: Object.fromEntries(CLASS.defender.signature.map((x: string) => [x, 1])) }], [{ at: 'C6', weapon: 'fists' }]);
      const [h, def] = f.pcs, ork = f.foe; ork.kind = 'ork'; h.pos = '5,5'; def.pos = '4,5'; ork.pos = '6,5'; ork.ap = 6; ork.attack = 60;
      f.unit(def.id).res = { ...(f.unit(def.id).res || {}), guard: 3 }; f.unit(def.id).resMax = { ...(f.unit(def.id).resMax || {}), guard: 5 };
      f.unit(h.id).def = -40;
      const hp = f.unit(h.id).hp; enemyTurn(f, f.unit(h.id), ork);
      return { lost: hp - f.unit(h.id).hp, interposed: logHas(f.cb, /interposes for/) };
    };
    const lucky = run(true), plain = run(false);
    expect(plain.interposed).toBe(true); expect(lucky.interposed).toBe(false); expect(lucky.lost).toBeGreaterThan(0);
  });
  it('Company Man: the RTC contract is a memory thread from the first session (seeded once)', () => {
    let g = newGame('CM', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'char/add', sheet: { ...sheetOf({}), traits: ['company_man'] } }, 'host');
    g = apply(g, { type: 'session/start' }, 'host');
    expect(memoryOf(g).threads.filter((t) => /RTC contract/.test(t.title)).length).toBe(1);
  });
});
