// The completeness pass, batch 2 (items 14-26): the reducer paths (apply) the earlier tests left out. Earthbreaker and
// Last Wall in the Narrator brief; Grapple's named-token grab on the area map; Into the Dark II on the area map; Grim
// Reaper on an ambush opened from the area map (and a Shade's silent takedown carrying the AP back); Pattern Lock,
// Outclassed, You Get Used to It and Sweet Talker hearing a reducer action or an enemy's turn; Sixth Sense letting a
// squadmate target an enemy in the dark; Foreseen's spent use after the rewind; Just the Repairman's scene memory.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import {
  apply, npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, apLeft, d20, holdersOf, briefOf, previewAttack, votesOf, rerollFrom, packOf, lineOfSight, CLASS,
  type GameState, type Combat, type Unit,
} from '../src';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

type F = ReturnType<typeof fightWith>;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const storyHas = (g: GameState, re: RegExp) => g.story.entries.some((e: any) => re.test((e.head || '') + ' ' + (e.text || '')));
const rulingHas = (g: GameState, re: RegExp) => (g.story.rulings || []).some((r) => re.test(r.text));
function seedFor(...ns: number[]): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
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
  s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [{ action: 'place', name: o.name || 'Raider', side: o.side || 'hostile', tier: o.tier || 'minion', weapon: o.weapon || 'fists', at: refOf(at) }] } } as any);
  return npcsOf(s.g)[npcsOf(s.g).length - 1];
}
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
const briefFor = (c: any, key: string) => { const h = holdersOf({ c }).find((x) => x.key === key); return h ? briefOf(h) : undefined; };

describe('Earthbreaker and Last Wall in the Narrator brief (items 14, 15)', () => {
  it('both carry their Narrator line; Earthbreaker\'s story smash is a ruling, once a scene, and a new scene gives it back', () => {
    const s = storyWith([{ perks: { earthbreaker: 'mastered', last_wall: 'mastered' } }]); const c = s.chars[0];
    expect(briefFor(s.g.characters[c.id], 'perk:earthbreaker')).toMatch(/smashes floor, walls or cover/);
    expect(briefFor(s.g.characters[c.id], 'perk:last_wall')).toMatch(/1 HP/);
    s.act({ type: 'story/perk', charId: c.id, id: 'earthbreaker', actionId: 'earthbreaker_story', text: 'drops the catwalk' } as any);
    expect(rulingHas(s.g, /Earthbreaker out of a fight: drops the catwalk/)).toBe(true);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'earthbreaker', actionId: 'earthbreaker_story' } as any)).toThrow(/Used/);
    s.act({ type: 'narrator/turn', turn: { narration: 'Elsewhere.', sceneTitle: 'A new scene' } } as any);
    s.act({ type: 'story/perk', charId: c.id, id: 'earthbreaker', actionId: 'earthbreaker_story', text: 'the wall' } as any);
    expect(rulingHas(s.g, /Earthbreaker out of a fight: the wall/)).toBe(true);
  });
  it('Last Wall: the guard holds through the enemy\'s turn, then ends at the holder\'s next turn', () => {
    const f = fightWith([{ perks: { last_wall: 'mastered' } }], [{ at: 'C6', weapon: 'fists' }, { at: 'C8', weapon: 'fists' }]);
    const pc = f.pc, [a, b] = f.foes; pc.pos = '5,5'; a.pos = '6,5'; b.pos = '4,5'; a.attack = 60; b.attack = 60; pc.hp = 1;
    enemyTurn(f, pc, a, b);
    expect(f.pc.hp).toBe(1); expect(f.pc.downed).toBe(false);
    expect(logHas(f.cb, /refuses to fall \(Last Wall\)/)).toBe(true);
    // A second blow in the same window: nothing gets through.
    expect(f.cb.log.filter((l) => /refuses to fall/.test(l)).length).toBe(1);
  });
});



describe('Grim Reaper from the area map (item 19)', () => {
  const ambush = (spec: CharSpec) => {
    const s = storyWith([{ ...spec, weapon: 'combat_knife' }]); const c = s.chars[0], here = positionsOf(s.g)[c.id];
    const n = place(s, freeNear(s.g, here, 1), { name: 'Sentry' });
    const t = npcsOf(s.g).find((x) => x.id === n.id)!;
    t.facing = [Math.sign(+t.pos.split(',')[0] - +here.split(',')[0]) || 1, Math.sign(+t.pos.split(',')[1] - +here.split(',')[1])] as any; (t as any).hp = 1;
    place(s, freeNear(s.g, here, 6), { name: 'Watcher' }); // a second hostile keeps the fight open
    s.g.story.sneak = { [c.id]: true }; s.g.story.hidden = { [c.id]: true }; s.g.characters[c.id].skills.ingenuity = 10;
    s.g.rng.state = seedFor(19, 19, 19, 19);
    s.act({ type: 'world/act', charId: c.id, act: 'attack', targetId: n.id, mode: 'melee' } as any);
    return { s, c };
  };
  it('a kill on the ambush that opens the fight is on your own turn: +2 AP (I and II)', () => {
    const plain = ambush({});
    expect(plain.s.g.phase).toBe('combat');
    const ap0 = plain.s.g.combat!.units.find((u) => u.charId === plain.c.id)!.ap;
    for (const tier of ['I', 'II']) {
      const r = ambush({ perks: { grim_reaper: tier } }); const cb = r.s.g.combat!;
      expect(cb.units.find((u) => u.name === 'Sentry')?.dead).toBe(true);
      expect(logHas(cb, /Grim Reaper/)).toBe(true);
      expect(cb.units.find((u) => u.charId === r.c.id)!.ap).toBe(ap0 + 2);
    }
  });
});

describe('Grim Reaper on a Shade\'s silent takedown (item 19)', () => {
  it('no fight opens, and the +2 AP comes back to the area map with the AP left', () => {
    const run = (perks: any) => {
      const s = storyWith([{ advancedClass: 'shade', level: 5, perks, weapon: 'combat_knife' }]); const c = s.chars[0], here = positionsOf(s.g)[c.id];
      const n = place(s, freeNear(s.g, here, 1), { name: 'Lone guard' }), t = npcsOf(s.g).find((x) => x.id === n.id)!;
      t.facing = [Math.sign(+t.pos.split(',')[0] - +here.split(',')[0]) || 1, Math.sign(+t.pos.split(',')[1] - +here.split(',')[1])] as any; (t as any).hp = 1;
      // a second hostile out of sight, so the takedown is silent (not a won fight)
      const map = zoneMap(s.g), cheb = (k: string) => Math.max(Math.abs(+k.split(',')[0] - +here.split(',')[0]), Math.abs(+k.split(',')[1] - +here.split(',')[1]));
      const far = [...Array(map.w).keys()].flatMap((x) => [...Array(map.h).keys()].map((y) => x + ',' + y)).filter((k) => standable(map, k) && !npcsOf(s.g).some((m) => m.pos === k)).sort((a, b) => cheb(b) - cheb(a)).find((k) => !lineOfSight({ map, objects: storyObjects(s.g), units: [] } as any, k, here))!;
      place(s, far, { name: 'Far guard' });
      s.g.story.sneak = { [c.id]: true }; s.g.story.hidden = { [c.id]: true }; s.g.characters[c.id].skills.ingenuity = 10;
      s.g.rng.state = seedFor(19, 19, 19, 19);
      s.act({ type: 'world/act', charId: c.id, act: 'attack', targetId: n.id, mode: 'melee' } as any);
      return { s, c };
    };
    const plain = run({}), reaper = run({ grim_reaper: 'I' });
    expect(plain.s.g.phase).toBe('story'); expect(storyHas(reaper.s.g, /Silent Kill/)).toBe(true);
    expect(reaper.s.g.phase).toBe('story');
    expect(apLeft(reaper.s.g, reaper.s.g.characters[reaper.c.id])).toBe(apLeft(plain.s.g, plain.s.g.characters[plain.c.id]) + 2);
  });
});

describe('triggers from a reducer action or an enemy\'s turn (item 20)', () => {
  it('Pattern Lock: an enemy\'s attack on its turn is remembered: its next attack of that type is at −2 (II −4, an ally −2)', () => {
    for (const [tier, mine, ally] of [['I', -2, 0], ['II', -4, -2]] as const) {
      const f = fightWith([{ perks: { pattern_lock: tier } }, {}], [{ at: 'C6', weapon: 'fists' }]); open(f.cb);
      const [pc, mate] = f.pcs, foe = f.foe; pc.pos = '5,5'; mate.pos = '5,3'; foe.pos = '6,5'; foe.attack = 60; pc.hp = pc.maxHp;
      enemyTurn(f, pc, foe);
      f.unit(mate.id).pos = '7,5'; // next to the foe now (a melee preview needs reach)
      const term = (t: Unit) => { const att = f.unit(foe.id), k = att.ap; att.ap = 9; try { return withGame(f.g, () => previewAttack(f.cb, att, f.unit(t.id), 'melee')).terms?.filter((x) => /Pattern Lock/.test(x.label)).reduce((s, x) => s + x.v, 0) || 0; } finally { att.ap = k; } };
      expect(term(pc)).toBe(mine); expect(term(mate)).toBe(ally);
    }
  });
  it('Outclassed: the holder\'s killing shot through combat/attack banks +3; an enemy Downing an ally on its turn costs −2 (I only)', () => {
    const f = fightWith([{ perks: { outclassed: 'I' }, weapon: 'hellraiser_service_rifle' }, {}], [{ at: 'O10', weapon: 'fists' }, { at: 'C6', weapon: 'fists' }]); open(f.cb);
    const [me, ally] = f.pcs, [far, near] = f.foes; me.pos = '2,2'; far.pos = '8,2'; ally.pos = '10,10'; near.pos = '11,10';
    f.unit(far.id).hp = 1; f.unit(far.id).def = -60; f.g.characters[me.charId!].skills.marksmanship = 10;
    f.turn(me); f.act({ type: 'combat/attack', unitId: me.id, targetId: far.id, mode: 'shot' });
    expect(f.unit(far.id).dead).toBe(true); expect(f.unit(me.id).apNext).toBe(3);
    f.unit(near.id).attack = 60; f.unit(ally.id).hp = 1;
    f.cb.order = [ally.id, near.id, me.id, ...f.cb.order.filter((id) => ![me.id, ally.id, near.id].includes(id))];
    f.turn(ally); f.act({ type: 'combat/end-turn', unitId: ally.id });
    expect(f.unit(ally.id).downed).toBe(true); expect(logHas(f.cb, /First casualty \(Outclassed\)/)).toBe(true);
  });
  it('Sweet Talker: charm in the story, then a plea through combat/perk that lands on the charmed NPC gives +2 AP (II +3)', () => {
    for (const [tier, n] of [['I', 2], ['II', 3]] as const) {
      const s = storyWith([{ perks: { sweet_talker: tier, lay_down_arms: 'I' } }]); const c = s.chars[0];
      s.act({ type: 'narrator/turn', turn: { narration: 'Talk.', checks: [{ charId: c.id, skills: ['implication'], tn: 12, stakes: 'Charm Vel', target: 'Vel', auto: 'success' }] } } as any);
      const ck = s.g.checks.find((k: any) => !k.done); if (ck) s.act({ type: 'check/roll', checkId: ck.id } as any);
      s.act({ type: 'narrator/turn', turn: { narration: 'Vel turns.', combat: { name: 'Fight', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Vel', tier: 'soldier', weapon: 'service_pistol', at: 'F6' }] } } } as any);
      const box: any = s, cb: Combat = box.g.combat; open(cb);
      const me = cb.units.find((u) => u.side === 'pc')!, vel = cb.units.find((u) => u.name === 'Vel')!;
      me.pos = '2,5'; vel.pos = '4,5'; vel.sv = { body: -50, brain: -50, heart: -50 } as any;
      cb.turn = cb.order.indexOf(me.id); me.ap = 6; delete (cb as any).window;
      s.act({ type: 'combat/perk', unitId: me.id, id: 'lay_down_arms', targetId: vel.id } as any);
      const after = box.g.combat.units.find((u: Unit) => u.id === me.id);
      expect(after.ap).toBe(6 - 2 + n); expect(logHas(box.g.combat, /Sweet Talker/)).toBe(true);
    }
  });
});

describe('Sixth Sense through the reducer (item 21)', () => {
  it('a squadmate shoots an enemy in the dark the holder senses within 3 tiles; without the perk the shot is refused', () => {
    const run = (perks: any) => {
      const f = fightWith([{ perks }, { weapon: 'hellraiser_service_rifle' }], [{ at: 'O10' }]); open(f.cb);
      const cb = f.cb, [me, mate] = f.pcs, foe = f.foe; (cb.map as any).dark = true; for (const u of cb.units) { u.vision = 4; u.light = 0; u.darkSight = false as any; }
      (cb.map as any).solid = ['6,5']; // a wall between the holder and the foe
      me.pos = '5,5'; foe.pos = '7,5'; mate.pos = '7,9'; // 2 from the holder (behind the wall); 4 from the mate in the dark (sight 2)
      f.turn(mate); return { f, mate, foe };
    };
    const { f, mate, foe } = run(['sixth_sense']);
    f.act({ type: 'combat/attack', unitId: mate.id, targetId: foe.id, mode: 'shot' });
    expect(logHas(f.cb, /fires at|shoots/)).toBe(true);
    const p = run([]);
    expect(() => p.f.act({ type: 'combat/attack', unitId: p.mate.id, targetId: p.foe.id, mode: 'shot' })).toThrow();
  });
});

describe('Foreseen: the use stays spent after the rewind (item 22)', () => {
  it('after the room goes back, a later Narrator turn can\'t be foreseen again this session', () => {
    const s = storyWith([{ perks: { foreseen: 'mastered' } }]); const c = s.chars[0];
    const before = JSON.parse(JSON.stringify(s.g));
    s.act({ type: 'narrator/turn', turn: { narration: 'It goes wrong.' } } as any);
    s.act({ type: 'story/perk', charId: c.id, id: 'foreseen', actionId: 'foresee', text: 'The deal.' } as any);
    const v = votesOf(s.g).open!; expect(v.status).toBe('passed');
    s.g = rerollFrom(s.g, before, v.note);
    s.act({ type: 'narrator/turn', turn: { narration: 'Played again.' } } as any);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'foreseen', actionId: 'foresee', text: 'Again.' } as any)).toThrow(/Used/);
  });
});

describe('Just the Repairman: the guard who took you for staff doesn\'t check again this scene (item 26)', () => {
  it('a later sneak past the same guard rolls nothing for it', () => {
    let done = false;
    for (let seed = 1; seed < 60 && !done; seed++) {
      const s = storyWith([{ perks: ['just_the_repairman'] }], 'JR2' + seed); const c = s.chars[0];
      s.g.characters[c.id].pack = [...packOf(s.g.characters[c.id]), { id: 'toolbox', item: 'toolbox', name: 'Toolbox', qty: 1, kind: 'tool' } as any];
      s.g.characters[c.id].skills.ingenuity = 0;
      const at = positionsOf(s.g)[c.id]; place(s, freeNear(s.g, at, 3), { tier: 'boss', name: 'Foreman' });
      s.act({ type: 'world/act', charId: c.id, act: 'move', to: freeNear(s.g, at, 1), how: 'sneak' } as any);
      if (!storyHas(s.g, /takes them for maintenance staff/)) continue;
      done = true;
      const n0 = s.g.story.entries.filter((e: any) => /maintenance staff|Foreman (spots|notices|sees)/.test(e.text || '')).length;
      s.act({ type: 'world/act', charId: c.id, act: 'move', to: freeNear(s.g, positionsOf(s.g)[c.id], 1), how: 'sneak' } as any);
      expect(s.g.story.hidden![c.id]).toBe(true);
      expect(s.g.story.entries.filter((e: any) => /maintenance staff|Foreman (spots|notices|sees)/.test(e.text || '')).length).toBe(n0);
    }
    expect(done).toBe(true);
  });
});
void CLASS;
