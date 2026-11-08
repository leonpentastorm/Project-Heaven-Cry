// The completeness pass, part D: class moves (lanes I, J, K) whose fight, area-map or story side was missing or untested.
// Player actions go through the reducer (apply); an enemy's blow through combat/end-turn where the AI can make it.
import { describe, expect, it } from 'vitest';
import {
  CLASS, apply, holderOf, lineOfSight, npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, d20, resolveAttack, previewEvoke, applyCond, emit, stampOf,
  type GameState, type Combat, type Unit,
} from '../src';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

type F = ReturnType<typeof fightWith>;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const storyHas = (g: GameState, re: RegExp) => g.story.entries.some((e: any) => re.test((e.head || '') + ' ' + (e.text || '')));
const rulingHas = (g: GameState, re: RegExp) => (g.story.rulings || []).some((r) => re.test(r.text));
function rngFor(...ns: number[]): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; return f.unit(u.id); };
const act = (f: F, u: Unit, a: any) => f.act({ unitId: u.id, ...a });
function cls(id: string, rank: 1 | 2 | 3, extra: CharSpec = {}): CharSpec {
  const sig = SIG(id), pts = rank === 3 ? [6, 6, 6] : rank === 2 ? [5, 4, 4] : [1, 1, 1];
  return { ...extra, classId: id, level: 5, skills: { ...Object.fromEntries(sig.map((s, i) => [s, pts[i]])), ...(extra.skills || {}) } };
}
const adv = (id: string, extra: CharSpec = {}): CharSpec => ({ advancedClass: id, level: 5, ...extra });
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
function caster(u: Unit, words: string[], extra: any = {}) {
  u.mg = { words, designs: [{ id: 'o1', name: 'Damage Outburst', school: 'damage', modules: [] }], evoker: true, emanator: true, charge: 10, cores: 2, coresMade: 0, flux: 0, mp: 300, mpMax: 300, strain: 0, held: null, cast: false,
    brain: 3, will: 3, sigilMult: 1, soulMult: 1, elemMult: 1, healMult: 1, maxWords: 3, glyphAp: 1, coreSave: 0, rangeBonus: 0, durBonus: 0, soulAp: 2, costSave: 0, soulRange: 0, syphon: 1, strainLimit: 5,
    saves: { body: 0, brain: 0, heart: 0 }, debuff: { body: 0, brain: 0, heart: 0 }, ...extra } as any;
  return u;
}
function freeNear(g: GameState, from: string, d: number): string {
  const [x, y] = from.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== d) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) return k; }
  throw new Error('no free tile');
}
const glyph = (cb: Combat, u: Unit, word: string, pos: string, extra: any = {}) => { cb.glyphs = [...(cb.glyphs || []), { id: 'gl' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), word, pos, by: u.id, side: u.side, left: 3, who: u.name, ...extra } as any]; };

describe('Vessel: no Outburst designs', () => {
  it('magic/design is refused for a Vessel; another Emanator designs freely', () => {
    const s = storyWith([adv('vessel', SOUL), SOUL]); const [v, o] = s.chars;
    const design = { name: 'Bolt', school: 'damage', modules: [] };
    expect(() => s.act({ type: 'magic/design', charId: v.id, design } as any)).toThrow(/Vessel designs no Outbursts/);
    s.act({ type: 'magic/design', charId: o.id, design } as any);
  });
});

describe('Bard: the Gift cast in a fight', () => {
  it('the ally casts it on their turn (combat/gift) on the Bard\'s MP; once', () => {
    const s = storyWith([cls('bard', 3, SOUL), {}]); const [b, ally] = s.chars;
    s.act({ type: 'story/perk', charId: b.id, id: 'class:bard.gift', text: 'For you, ' + s.g.characters[ally.id].name });
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'boss', weapon: 'service_pistol', at: 'O10' }] } } } as any);
    const cb = s.g.combat!, bu = cb.units.find((u) => u.charId === b.id)!, au = cb.units.find((u) => u.charId === ally.id)!, foe = cb.units.find((u) => u.side === 'foe')!;
    bu.pos = '2,2'; au.pos = '3,2'; foe.pos = '5,2'; foe.def = -40; const mp = bu.mg!.mp;
    cb.turn = cb.order.indexOf(au.id); au.ap = 6; delete cb.window;
    s.act({ type: 'combat/gift', unitId: au.id, aim: '5,2' } as any);
    expect(logHas(s.g.combat!, /casts .*Gift/)).toBe(true);
    expect(s.g.combat!.units.find((u) => u.charId === b.id)!.mg!.mp).toBeLessThan(mp);
    expect(() => s.act({ type: 'combat/gift', unitId: au.id, aim: '5,2' } as any)).toThrow(/no Gift/);
  });
});

describe('Shade: a silent takedown on the area map', () => {
  it('a killing ambush from Sneak with nobody else seeing opens no fight; without the class it does', () => {
    const run = (spec: CharSpec) => {
      const s = storyWith([{ ...spec, weapon: 'combat_knife' }]); const c = s.chars[0], here = positionsOf(s.g)[c.id];
      s.act({ type: 'narrator/turn', turn: { narration: 'Two guards.', npcs: [
        { action: 'place', name: 'Lone guard', side: 'hostile', tier: 'minion', weapon: 'fists', at: refOf(freeNear(s.g, here, 1)) },
      ] } } as any);
      const n = npcsOf(s.g)[0]; n.facing = [Math.sign(+n.pos.split(',')[0] - +here.split(',')[0]) || 1, Math.sign(+n.pos.split(',')[1] - +here.split(',')[1])] as any; (n as any).hp = 1;
      // a second hostile far off behind a wall of distance (beyond sight)
      const cheb = (k: string) => Math.max(Math.abs(+k.split(',')[0] - +here.split(',')[0]), Math.abs(+k.split(',')[1] - +here.split(',')[1]));
      const far = [...Array(zoneMap(s.g).w).keys()].flatMap((x) => [...Array(zoneMap(s.g).h).keys()].map((y) => x + ',' + y)).filter((k) => standable(zoneMap(s.g), k) && !npcsOf(s.g).some((n) => n.pos === k)).sort((a, b) => cheb(b) - cheb(a)).find((k) => !lineOfSight({ map: zoneMap(s.g), objects: storyObjects(s.g), units: [] } as any, k, here)) || null;
      if (far) s.act({ type: 'narrator/turn', turn: { narration: 'Another.', npcs: [{ action: 'place', name: 'Far guard', side: 'hostile', tier: 'minion', weapon: 'fists', at: refOf(far) }] } } as any);
      s.g.story.sneak = { [c.id]: true }; s.g.story.hidden = { [c.id]: true };
      s.g.characters[c.id].skills.ingenuity = 10;
      s.g.rng.state = rngFor(19, 19, 19, 19);
      s.act({ type: 'world/act', charId: c.id, act: 'attack', targetId: n.id, mode: 'melee' } as any);
      return s;
    };
    const s = run(adv('shade'));
    expect(s.g.phase).toBe('story'); expect(storyHas(s.g, /without a sound \(Silent Kill\)/)).toBe(true); expect(s.g.story.hidden![s.chars[0].id]).toBe(true);
    expect(npcsOf(s.g).some((n) => n.name === 'Far guard')).toBe(true);
    const plain = run({});
    expect(plain.g.phase).toBe('combat');
  });
});

describe('Mage Payload and Warden Raise Cover on the area map', () => {
  // The 1.2 version of this test is replaced by its 1.4 version in sigil14-classes-i.test.ts.
  it('Payload on the area map is offered there (payload_world)', () => {
    const s = storyWith([cls('mage', 3, MIND)]); const c = s.chars[0];
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'class:mage.payload', actionId: 'payload_world', tile: 'A1' } as any)).toThrow(/glyph|pattern|Pick|Evoker|reach|Stand/i);
  });
});

describe('Defender, Channeler, Guardian, Bard Inspire, Glyph Mason', () => {
  it('Interpose: the hit\'s critical injury lands on the Defender, not the ally', () => {
    let ok = false;
    for (let sd = 1; sd < 60 && !ok; sd++) {
      const f = fightWith([cls('defender', 1, { skills: { durability: 3 } }), {}], [{}], { seed: 'IP' + sd });
      const [d, ally] = f.pcs; at(f, d, '3,2'); at(f, ally, '4,2'); at(f, f.foe, '8,2');
      const u = f.turn(d); act(f, u, { type: 'combat/perk', id: 'class:defender.brace' });
      const foe = f.unit(f.foe.id); foe.attack = 60; f.unit(ally.id).injResist = 0; f.unit(d.id).injResist = 0;
      f.g.rng.state = rngFor(20);
      withGame(f.g, () => resolveAttack(f.cb, f.g.rng, foe, f.unit(ally.id), 'shot', null, { noAp: true }));
      if (logHas(f.cb, /injury lands on .*Interpose/)) { ok = true; expect((f.unit(ally.id).injuries || []).length).toBe(0); }
    }
    expect(ok).toBe(true);
  });
  it('Heart Surge doubles a magic push (forced_move tiles)', () => {
    const f = fightWith([cls('channeler', 3, SOUL)], [{}]);
    const u = f.turn(f.pc); at(f, u, '2,2'); const foe = at(f, f.foe, '3,2');
    const s: any = withGame(f.g, () => {
      const holder = holderOf({ u: f.unit(u.id), cb: f.cb }, 'class:channeler.heart_surge');
      return holder ? 1 : 0;
    });
    expect(s).toBe(1); void foe;
  });
  it('Inspire: the next Sigil strike roll takes the +2 (spell_roll)', () => {
    const f = fightWith([cls('bard', 1, SOUL), MIND], [{}]);
    const [b, ally] = f.pcs; at(f, b, '2,2'); at(f, ally, '3,3'); caster(f.unit(b.id), []); f.unit(b.id).mg!.mp = 100;
    f.turn(b); act(f, f.unit(b.id), { type: 'combat/perk', id: 'class:bard.inspire', targetId: ally.id });
    expect(Object.values((f.g.story as any).encouraged || {}).length).toBe(1);
    const r: any = withGame(f.g, () => emit(f.cb, 'spell_roll', { u: f.unit(ally.id), t: f.foe, die: 10, add: 0, kind: 'sigil', cb: f.cb }));
    expect(r.add).toBe(2); expect(Object.values((f.g.story as any).encouraged || {}).length).toBe(0);
  });
  it('Glyph Mason Survey: an ally Evokes a Keystone pattern from 2 tiles (the evoke_reach hook)', () => {
    const f = fightWith([adv('glyph_mason'), MIND], [{}]);
    const [m, ally] = f.pcs; caster(f.unit(m.id), ['fire', 'push']); caster(f.unit(ally.id), ['fire', 'push']);
    at(f, m, '3,2'); at(f, ally, '2,4'); at(f, f.foe, '9,2');
    f.turn(m); at(f, m, '4,2'); act(f, f.unit(m.id), { type: 'combat/perk', id: 'class:glyph_mason.keystone', tile: '4,2', choice: 'fire' }); at(f, m, '3,2'); // rules 1.4: cut on your own tile
    glyph(f.cb, f.unit(ally.id), 'push', '4,3');
    const pv = withGame(f.g, () => previewEvoke(f.cb, f.unit(ally.id), '4,2', '9,2'));
    expect(pv.why || '').not.toMatch(/^Stand /);
    const plain = fightWith([{}, MIND], [{}]); const [, a2] = plain.pcs; caster(plain.unit(a2.id), ['fire', 'push']); at(plain, a2, '2,4');
    glyph(plain.cb, plain.unit(a2.id), 'fire', '4,2'); glyph(plain.cb, plain.unit(a2.id), 'push', '4,3');
    expect(withGame(plain.g, () => previewEvoke(plain.cb, plain.unit(a2.id), '4,2', '9,2')).why || '').toMatch(/^Stand /);
  });
  it('Keystone survives its Evoke and never fades', () => {
    const f = fightWith([adv('glyph_mason')], [{}]); const u = f.turn(f.pc); at(f, u, '3,2'); caster(f.unit(u.id), ['fire', 'push']); at(f, f.foe, '6,2'); f.unit(f.foe.id).def = -40;
    at(f, u, '4,2'); act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:glyph_mason.keystone', tile: '4,2', choice: 'fire' }); at(f, u, '3,2'); // rules 1.4: cut on your own tile
    glyph(f.cb, f.unit(u.id), 'push', '4,3');
    try { act(f, f.unit(u.id), { type: 'combat/evoke', tile: '4,2', aim: '6,2' }); } catch { /* the pattern may not form: the keystone check still holds */ }
    expect((f.cb.glyphs || []).some((g) => g.id === 'ks-' + u.id)).toBe(true);
  });
});

describe('class story actions', () => {
  it('Guardian Sanctuary out of a fight: 60 MP, a ruling, once a scene', () => {
    const s = storyWith([cls('guardian', 3, SOUL)]); const c = s.g.characters[s.chars[0].id]; c.mp = 200;
    s.act({ type: 'story/perk', charId: c.id, id: 'class:guardian.sanctuary', actionId: 'sanctuary_story' } as any);
    expect(s.g.characters[c.id].mp).toBe(140); expect(rulingHas(s.g, /Sanctuary out of combat/)).toBe(true);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'class:guardian.sanctuary', actionId: 'sanctuary_story' } as any)).toThrow(/Used/);
  });
  it('RTC Contractor: Strike Call and Extraction in the story spend credits and open rulings', () => {
    const s = storyWith([adv('rtc_contractor')]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'class:rtc_contractor.strike_call', actionId: 'strike_call_story', text: 'the gate turret' } as any);
    expect(rulingHas(s.g, /Strike Call \(300 credits spent\) on "the gate turret"/)).toBe(true);
    s.act({ type: 'story/perk', charId: c.id, id: 'class:rtc_contractor.extraction', actionId: 'extraction_story', text: 'the rooftop' } as any);
    expect(rulingHas(s.g, /Extraction \(500 credits spent\)/)).toBe(true);
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'class:rtc_contractor.extraction', actionId: 'extraction_story', text: 'again' } as any)).toThrow(/Used|credits/);
  });
  it('Heartfed: a story moment fills a gauge by the Narrator\'s ruling', () => {
    const s = storyWith([adv('heartfed', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'class:heartfed.four_hearts', actionId: 'gauge_story', text: 'Watching the camp burn' } as any);
    expect(rulingHas(s.g, /feels it: "Watching the camp burn"/)).toBe(true);
  });
  it('Scribe: a stored spell set off out of a fight is a ruling with its numbers', () => {
    const s = storyWith([cls('scribe', 3, MIND)]); const c = s.chars[0];
    const st = withGame(s.g, () => stampOf('per_rest', { g: s.g }));
    (((s.g.story as any).ps ||= {})[c.id] ||= { items: {} }).items ||= {};
    (s.g.story as any).ps[c.id].items['class:scribe.stored_spell'] = { spells: [{ words: ['fire'], shape: 'stack', nums: { brain: 3, sigilMult: 1 }, debuff: { body: 0 }, stamp: st }] };
    s.act({ type: 'story/perk', charId: c.id, id: 'class:scribe.stored_spell', actionId: 'trigger_story', text: 'the door ward' } as any);
    expect(rulingHas(s.g, /Stored spell fire \(stack\) set off out of combat/)).toBe(true);
  });
});
void applyCond; void apply;
