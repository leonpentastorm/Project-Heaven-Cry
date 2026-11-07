// The completeness pass, batch 6 (items 66-77): class moves whose other side was missing or untested, through the
// reducer (apply). Interpose's critical injury (the Defender's and the Adamantile Knight's) on an enemy's turn; Heart
// Surge's doubled push; Drink It In's real spell price; Inspire on Sigil and Soul strikes; the Glyph Mason's Survey reach
// for an ally and the Keystone through two Evokes in one turn; the story sides of Sanctuary, Strike Call, Extraction,
// Four Hearts and Stored Spell; Quicken and the twin on the area map.
import { describe, expect, it } from 'vitest';
import {
  CLASS, npcsOf, positionsOf, standable, zoneMap, storyObjects, d20, previewOutburst, maxHp,
  type GameState, type Combat, type Unit,
} from '../src';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const storyHas = (g: GameState, re: RegExp) => g.story.entries.some((e: any) => re.test((e.head || '') + ' ' + (e.text || '')));
const rulingHas = (g: GameState, re: RegExp) => (g.story.rulings || []).some((r) => re.test(r.text));
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; return f.unit(u.id); };
const act = (f: F, u: Unit, a: any, by = 'host') => f.act({ unitId: u.id, ...a }, by);
const open = (cb: Combat) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; };
function cls(id: string, rank: 1 | 2 | 3, extra: CharSpec = {}): CharSpec {
  const sig = CLASS[id].signature, pts = rank === 3 ? [6, 6, 6] : rank === 2 ? [5, 4, 4] : [1, 1, 1];
  return { ...extra, classId: id, level: 5, skills: { ...Object.fromEntries(sig.map((s, i) => [s, pts[i]])), ...(extra.skills || {}) } };
}
const adv = (id: string, extra: CharSpec = {}): CharSpec => ({ advancedClass: id, level: 5, ...extra });
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
function caster(u: Unit, words: string[], extra: any = {}) {
  u.mg = { words, designs: [{ id: 'o1', name: 'Damage Outburst', school: 'damage', modules: [] }], evoker: true, emanator: true, charge: 30, cores: 2, coresMade: 0, flux: 0, mp: 300, mpMax: 300, strain: 0, held: null, cast: false,
    brain: 3, will: 3, sigilMult: 1, soulMult: 1, elemMult: 1, healMult: 1, maxWords: 3, glyphAp: 1, coreSave: 0, rangeBonus: 0, durBonus: 0, soulAp: 2, costSave: 0, soulRange: 0, syphon: 1, strainLimit: 9,
    saves: { body: 0, brain: 0, heart: 0 }, debuff: { body: 0, brain: 0, heart: 0 }, ...extra } as any;
  return u;
}
const glyph = (cb: Combat, u: Unit, word: string, pos: string) => { cb.glyphs = [...(cb.glyphs || []), { id: 'gl' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1), word, pos, by: u.id, side: u.side, left: 3, who: u.name } as any]; };
/** The PC ends its turn and the given units act next (their AI through combat/end-turn). */
function enemyTurn(f: F, pc: Unit, ...foes: Unit[]) {
  const cb = f.cb; cb.order = [pc.id, ...foes.map((x) => x.id), ...cb.order.filter((id) => id !== pc.id && !foes.some((x) => x.id === id))];
  f.turn(pc); f.act({ type: 'combat/end-turn', unitId: pc.id });
}
function freeNear(g: GameState, from: string, d: number): string {
  const [x, y] = from.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== d) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) return k; }
  throw new Error('no free tile');
}
const cheb = (a: string, b: string) => Math.max(Math.abs(+a.split(',')[0] - +b.split(',')[0]), Math.abs(+a.split(',')[1] - +b.split(',')[1]));
void d20;

// ---------------------------------------------------------------------------------------------------------------------
describe('Interpose: the critical injury lands on whoever took the hit (item 66)', () => {
  /** An Ork with fists strikes the ally on its turn (combat/end-turn) until a critical lands; the guard stands beside. */
  function crit(guard: CharSpec, giveGuard: (u: Unit) => void) {
    for (let sd = 1; sd < 400; sd++) {
      const f = fightWith([{}, guard], [{ at: 'C6', weapon: 'fists' }], { seed: 'IJ' + sd });
      const [ally, def] = f.pcs, ork = f.foe; open(f.cb);
      at(f, ally, '5,5'); at(f, def, '4,5'); at(f, ork, '6,5'); f.unit(ork.id).attack = 60; f.unit(ork.id).ap = 6; f.unit(ork.id).bank = 0;
      f.cb.round = 1; (f.unit(ork.id) as any).apNext = undefined;
      f.unit(ally.id).injResist = 0; f.unit(def.id).injResist = 0; f.unit(def.id).def = 99; f.unit(def.id).hp = f.unit(def.id).maxHp = 999; giveGuard(f.unit(def.id));
      const n0 = f.cb.log.length; enemyTurn(f, f.unit(ally.id), f.unit(ork.id));
      // The Interpose is the reaction on the first blow: that blow must be the critical.
      const first = f.cb.log.slice(n0).find((l) => /strikes Tester 1/.test(l)) || '';
      if (/CRITICAL/.test(first) && logHas(f.cb, /interposes for/)) return { f, ally, def };
    }
    throw new Error('no critical in 400 fights');
  }
  const guard = (u: Unit) => { u.res = { ...(u.res || {}), guard: 3 }; u.resMax = { ...(u.resMax || {}), guard: 5 }; };
  it('the Defender: an Ork\'s critical on its turn wounds the Defender, not the ally', () => {
    const { f, ally } = crit(cls('defender', 1), guard);
    expect(logHas(f.cb, /injury lands on .*\(Interpose\)/)).toBe(true);
    expect((f.unit(ally.id).injuries || []).length).toBe(0);
  });
  it('the Adamantile Knight\'s granted Interpose does the same', () => {
    const { f, ally } = crit(adv('adamantile_knight'), guard);
    expect(logHas(f.cb, /injury lands on .*\(Interpose\)/)).toBe(true);
    expect((f.unit(ally.id).injuries || []).length).toBe(0);
  });
});

describe('Heart Surge doubles a Control push (item 67)', () => {
  it('a push Outburst (combat/outburst) moves the foe 3 tiles; with the surge 6', () => {
    const run = (mods: string[], sd: number) => {
      const f = fightWith([cls('channeler', 3, SOUL)], [{}], { seed: 'HP' + sd }); open(f.cb);
      const u = f.turn(f.pc); at(f, u, '2,2'); const foe = at(f, f.foe, '3,2'); foe.hp = foe.maxHp = 999; (foe as any).saves = { body: -30, brain: 0, heart: 0 };
      f.unit(u.id).mg!.designs.push({ id: 'push1', name: 'Shove', school: 'control', option: 'push', modules: [] } as any); f.unit(u.id).mg!.mp = 300; f.unit(u.id).ap = 9;
      act(f, f.unit(u.id), { type: 'combat/outburst', design: 'push1', aim: '3,2', mods });
      return cheb('3,2', f.unit(foe.id).pos);
    };
    let ok = false;
    for (let sd = 1; sd < 40 && !ok; sd++) { const plain = run([], sd); if (plain !== 3) continue; expect(run(['class:channeler.heart_surge#surge'], sd)).toBe(6); ok = true; }
    expect(ok).toBe(true);
  });
});

describe('Drink It In: the spell\'s real price (item 68)', () => {
  /** Guardian (rank II) shields the ally; a third PC turned hostile casts at the ally through the reducer. */
  function setup(rogueSpec: CharSpec) {
    const f = fightWith([cls('guardian', 2, SOUL), {}, rogueSpec], [{ at: 'P15' }]); open(f.cb);
    const [gd, ally, rogue] = f.pcs; at(f, gd, '3,3'); at(f, ally, '5,3'); at(f, rogue, '8,3'); at(f, f.foe, '15,15');
    const u = f.turn(gd); act(f, u, { type: 'combat/perk', id: 'class:guardian.will_shield', actionId: 'will_shield', targetId: ally.id });
    f.unit(ally.id).shield = 500; f.unit(ally.id).def = -40;
    f.unit(gd.id).mg!.mp = 10; f.unit(rogue.id).side = 'foe';
    return { f, gd, ally, rogue };
  }
  it('an Outburst with a module: the gain is its MP cost (not the 25 stand-in)', () => {
    const { f, gd, ally, rogue } = setup(SOUL);
    caster(f.unit(rogue.id), [], { will: 40, designs: [{ id: 'hx', name: 'Homing bolt', school: 'damage', modules: ['homing'] }] });
    const r = f.turn(rogue), cost = withGame(f.g, () => previewOutburst(f.cb, f.unit(rogue.id), 'hx', '5,3')).cost;
    expect(cost).not.toBe(25);
    act(f, r, { type: 'combat/outburst', design: 'hx', aim: '5,3' }, 'p2');
    expect(logHas(f.cb, /hits Tester 2/)).toBe(true); expect(f.unit(gd.id).mg!.mp).toBe(10 + cost);
    expect(f.unit(ally.id).shield).toBeLessThan(500);
  });
  it('a three-word Sigil (combat/evoke): 30 MP, 10 a word', () => {
    let seen = false;
    for (let sd = 1; sd < 30 && !seen; sd++) {
      const { f, gd, rogue } = setup(MIND); f.g.rng.state = sd;
      caster(f.unit(rogue.id), ['fire', 'spark', 'condense']); at(f, f.unit(rogue.id), '6,3');
      for (const w of ['fire', 'spark', 'condense']) glyph(f.cb, f.unit(rogue.id), w, '6,3');
      const r = f.turn(rogue); act(f, r, { type: 'combat/evoke', tile: '6,3', aim: '5,3' }, 'p2');
      if (logHas(f.cb, /drinks the spell off the shield/)) { seen = true; expect(f.unit(gd.id).mg!.mp).toBe(40); }
    }
    expect(seen).toBe(true);
  });
  it('Drink It In off (combat/perk drink_off): no MP; on again: it drinks', () => {
    const run = (off: boolean) => {
      const { f, gd, rogue } = setup(SOUL);
      if (off) { f.turn(gd); act(f, f.unit(gd.id), { type: 'combat/perk', id: 'class:guardian.drink_it_in', actionId: 'drink_off' }); }
      caster(f.unit(rogue.id), []); const r = f.turn(rogue); f.unit(rogue.id).mg!.will = 40;
      act(f, r, { type: 'combat/outburst', design: 'o1', aim: '5,3' }, 'p2');
      return f;
    };
    const off = run(true); expect(off.unit(off.pcs[0].id).mg!.mp).toBe(10); expect(logHas(off.cb, /drinks the spell/)).toBe(false);
    const on = run(false); expect(on.unit(on.pcs[0].id).mg!.mp).toBeGreaterThan(10);
    const back = (() => {
      const { f, gd, rogue } = setup(SOUL); f.turn(gd);
      act(f, f.unit(gd.id), { type: 'combat/perk', id: 'class:guardian.drink_it_in', actionId: 'drink_off' });
      act(f, f.unit(gd.id), { type: 'combat/perk', id: 'class:guardian.drink_it_in', actionId: 'drink_on' });
      caster(f.unit(rogue.id), []); const r = f.turn(rogue); f.unit(rogue.id).mg!.will = 40;
      act(f, r, { type: 'combat/outburst', design: 'o1', aim: '5,3' }, 'p2'); return f;
    })();
    expect(back.unit(back.pcs[0].id).mg!.mp).toBeGreaterThan(10);
  });
});

describe('Inspire on Sigil and Soul strikes (item 69)', () => {
  /** The strike's total in the miss line ("d20 r → total vs def"), with and without Inspire, on the same dice. */
  function total(inspire: boolean, kind: 'sigil' | 'soul') {
    const f = fightWith([cls('bard', 1, SOUL), kind === 'sigil' ? MIND : SOUL], [{}], { seed: 'INS' }); open(f.cb);
    const [b, ally] = f.pcs; at(f, b, '2,2'); at(f, ally, '3,3'); const foe = at(f, f.foe, '5,3'); foe.def = 99; foe.hp = foe.maxHp = 999;
    caster(f.unit(ally.id), ['fire', 'condense']);
    if (inspire) { const u = f.turn(b); f.unit(b.id).mg!.mp = 100; act(f, u, { type: 'combat/perk', id: 'class:bard.inspire', actionId: 'inspire', targetId: ally.id }); }
    const a = f.turn(ally); f.g.rng.state = 4242;
    if (kind === 'sigil') { glyph(f.cb, f.unit(ally.id), 'fire', '4,3'); glyph(f.cb, f.unit(ally.id), 'condense', '4,3'); act(f, a, { type: 'combat/evoke', tile: '4,3', aim: '5,3' }); }
    else act(f, a, { type: 'combat/outburst', design: 'o1', aim: '5,3' });
    const m = f.cb.log.map((l) => /misses Foe 1 \(d20 (\d+) → (-?\d+)/.exec(l)).find(Boolean);
    return { die: +m![1], tot: +m![2], left: Object.values((f.g.story as any).encouraged || {}).length };
  }
  for (const kind of ['sigil', 'soul'] as const) it(kind + ': the next strike roll is +2, and Inspire is spent on it', () => {
    const plain = total(false, kind), ins = total(true, kind);
    expect(ins.die).toBe(plain.die); expect(ins.tot).toBe(plain.tot + 2); expect(ins.left).toBe(0);
  });
});

describe('Glyph Mason: an ally\'s Survey reach; the Keystone through two Evokes in a turn (items 70, 71)', () => {
  // TODO(sigil-1.4): this class/perk move still reads the 1.2 Sigil rules (a Stack, adjacent drawing, Form/Motion); its lane rewrites handler and test.
  it.skip('an ally Evokes the Keystone pattern from 2 tiles (combat/evoke); without a Keystone the plain rule refuses', () => {
    const run = (mason: boolean) => {
      const f = fightWith([mason ? adv('glyph_mason') : {}, MIND], [{}]); open(f.cb);
      const [m, ally] = f.pcs; caster(f.unit(m.id), ['fire', 'push']); caster(f.unit(ally.id), ['fire', 'push']);
      at(f, m, '3,2'); at(f, ally, '2,4'); const foe = at(f, f.foe, '9,2'); foe.def = -40; foe.hp = foe.maxHp = 999;
      if (mason) { f.turn(m); act(f, f.unit(m.id), { type: 'combat/perk', id: 'class:glyph_mason.keystone', tile: '4,2', choice: 'fire' }); }
      else glyph(f.cb, f.unit(ally.id), 'fire', '4,2');
      glyph(f.cb, f.unit(ally.id), 'push', '4,3');
      const a = f.turn(ally); const ch = f.unit(ally.id).mg!.charge;
      act(f, a, { type: 'combat/evoke', tile: '4,2', aim: '9,2' });
      return { f, ch, ally };
    };
    const { f, ch, ally } = run(true);
    expect(f.unit(ally.id).pos).toBe('2,4'); expect(f.unit(ally.id).mg!.charge).toBeLessThan(ch);
    expect((f.cb.glyphs || []).some((g) => g.id.startsWith('ks-'))).toBe(true);
    expect(() => run(false)).toThrow(/Stand /);
  });
  // TODO(sigil-1.4): this class/perk move still reads the 1.2 Sigil rules (a Stack, adjacent drawing, Form/Motion); its lane rewrites handler and test.
  it.skip('the Keystone stays through an Evoke: a second Evoke the same turn finds it; rounds and scuffs don\'t take it', () => {
    const f = fightWith([adv('glyph_mason')], [{}]); open(f.cb); const u = f.turn(f.pc); at(f, u, '3,2'); caster(f.unit(u.id), ['fire', 'push']);
    const foe = at(f, f.foe, '6,2'); foe.def = -40; foe.hp = foe.maxHp = 999; f.unit(u.id).ap = 9;
    act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:glyph_mason.keystone', tile: '4,2', choice: 'fire' });
    for (let i = 0; i < 2; i++) {
      act(f, f.unit(u.id), { type: 'combat/draw', word: 'push', tile: '4,2' });
      act(f, f.unit(u.id), { type: 'combat/evoke', tile: '4,2', aim: '6,2' });
      const ks = (f.cb.glyphs || []).find((g) => g.id === 'ks-' + u.id); expect(ks).toBeTruthy(); expect(ks!.word).toBe('fire');
    }
    expect(f.unit(foe.id).hp).toBeLessThan(999);
    f.unit(u.id).pos = '4,2'; expect(() => act(f, f.unit(u.id), { type: 'combat/scuff' })).toThrow(/Keystone can't be scuffed/);
  });
});

describe('class story actions through the reducer (items 72-75)', () => {
  it('Sanctuary: 60 MP and a ruling; once a scene; a new scene gives it back', () => {
    const s = storyWith([cls('guardian', 3, SOUL)]); const id = s.chars[0].id; s.g.characters[id].mp = 200;
    s.act({ type: 'story/perk', charId: id, id: 'class:guardian.sanctuary', actionId: 'sanctuary_story', text: 'the collapsing hall' } as any);
    expect(s.g.characters[id].mp).toBe(140); expect(rulingHas(s.g, /Sanctuary out of combat \(60 MP paid\)/)).toBe(true);
    expect(() => s.act({ type: 'story/perk', charId: id, id: 'class:guardian.sanctuary', actionId: 'sanctuary_story' } as any)).toThrow(/Used/);
    s.act({ type: 'narrator/turn', turn: { narration: 'Later.', sceneTitle: 'Another scene' } } as any);
    s.act({ type: 'story/perk', charId: id, id: 'class:guardian.sanctuary', actionId: 'sanctuary_story' } as any);
    expect(s.g.characters[id].mp).toBe(80);
  });
  it('Strike Call and Extraction: credits paid, rulings posted, Extraction once a session', () => {
    const s = storyWith([adv('rtc_contractor')]); const id = s.chars[0].id; (s.g.characters[id] as any).state = { ...((s.g.characters[id] as any).state || {}), credits: 2000 };
    s.act({ type: 'story/perk', charId: id, id: 'class:rtc_contractor.strike_call', actionId: 'strike_call_story', text: 'the gate turret' } as any);
    expect(rulingHas(s.g, /Strike Call \(300 credits spent\) on "the gate turret"/)).toBe(true);
    s.act({ type: 'story/perk', charId: id, id: 'class:rtc_contractor.extraction', actionId: 'extraction_story', text: 'the rooftop' } as any);
    expect(rulingHas(s.g, /Extraction \(500 credits spent\)/)).toBe(true);
    expect((s.g.characters[id] as any).state.credits).toBe(1200);
    expect(() => s.act({ type: 'story/perk', charId: id, id: 'class:rtc_contractor.extraction', actionId: 'extraction_story', text: 'again' } as any)).toThrow(/Used|session/);
  });
  it('Four Hearts: the gauge ruling, then the Narrator\'s points (traitState heartfed_add) land on the gauges', () => {
    const s = storyWith([adv('heartfed', SOUL)]); const id = s.chars[0].id;
    s.act({ type: 'story/perk', charId: id, id: 'class:heartfed.four_hearts', actionId: 'gauge_story', text: 'Watching the camp burn' } as any);
    expect(rulingHas(s.g, /feels it: "Watching the camp burn".*heartfed_add/)).toBe(true);
    s.act({ type: 'narrator/turn', turn: { narration: 'The fire takes the tents.', traitState: [{ charId: id, key: 'heartfed_add', value: { grief: 2, rage: 1 } }] } } as any);
    const hf = (s.g.characters[id] as any).state.heartfed;
    expect(hf.grief).toBe(2); expect(hf.rage).toBe(1); expect((s.g.characters[id] as any).state.heartfed_add).toBeUndefined();
    expect(storyHas(s.g, /Grief rises to 2 \(the story\)/)).toBe(true);
    // The old form (the whole object, no scene) adds too instead of resetting.
    s.act({ type: 'narrator/turn', turn: { narration: 'More.', traitState: [{ charId: id, key: 'heartfed', value: { fear: 3 } }] } } as any);
    expect((s.g.characters[id] as any).state.heartfed.fear).toBe(3);
  });
  it('Stored Spell: written in the story (write), then set off there (trigger_story): its numbers in the ruling', () => {
    const s = storyWith([cls('scribe', 3, MIND)]); const c = s.g.characters[s.chars[0].id];
    c.sigils = [...new Set([...(c.sigils || []), 'fire', 'push'])]; (c as any).evoCharge = 20;
    s.act({ type: 'story/perk', charId: c.id, id: 'class:scribe.stored_spell', actionId: 'write', text: 'FIRE PUSH stack' } as any);
    s.act({ type: 'story/perk', charId: c.id, id: 'class:scribe.stored_spell', actionId: 'trigger_story', text: 'the door ward' } as any);
    expect(rulingHas(s.g, /Stored spell fire.*\(stack\) set off out of combat/i)).toBe(true);
  });
});

describe('Quicken and the twin on the area map (items 76, 77)', () => {
  it('Quicken (world/act): 1 charge, the ally has +1 AP this overworld round; not on yourself', () => {
    const s = storyWith([cls('scribe', 1, MIND), {}]); const [sc, ally] = s.chars;
    const ch = s.g.characters[sc.id]; (ch as any).evoCharge = 10;
    s.act({ type: 'world/act', charId: sc.id, act: 'perk', id: 'class:scribe.quicken', actionId: 'quicken_world', targetId: ally.id } as any);
    expect(s.g.story.ap?.[ally.id]).toBe(7); expect(s.g.story.ap?.[sc.id]).toBe(4); expect((s.g.characters[sc.id] as any).evoCharge).toBe(9);
    expect(() => s.act({ type: 'world/act', charId: sc.id, act: 'perk', id: 'class:scribe.quicken', actionId: 'quicken_world', targetId: ally.id } as any)).toThrow(/Used|once/i);
    const t = storyWith([cls('scribe', 1, MIND)]); (t.g.characters[t.chars[0].id] as any).evoCharge = 10;
    expect(() => t.act({ type: 'world/act', charId: t.chars[0].id, act: 'perk', id: 'class:scribe.quicken', actionId: 'quicken_world', targetId: t.chars[0].id } as any)).toThrow(/yourself/);
  });
  it('the twin is called on the area map: a token with its own 4 AP (moves only), held within 6 tiles; a fight starts with it called', () => {
    const s = storyWith([adv('twinbound', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: 'damage: move; damage; damage' } as any);
    const here = positionsOf(s.g)[c.id], spot = freeNear(s.g, here, 2);
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'class:twinbound.call', actionId: 'call_world', tile: spot } as any);
    const tid = 'cp-' + c.id + '-twin';
    expect(positionsOf(s.g)[tid]).toBe(spot); expect(s.g.story.ap?.[c.id]).toBe(4);
    const half = Math.floor(0.5 * maxHp(s.g.characters[c.id])); expect(s.g.characters[c.id].companions!.find((k) => k.kind === 'twin')!.hp).toBe(half);
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'class:twinbound.call', actionId: 'call_world', tile: freeNear(s.g, here, 1) } as any)).toThrow(/already/);
    // Its own move: its AP, not the owner's.
    const step = freeNear(s.g, spot, 1);
    s.act({ type: 'world/act', charId: c.id, unit: tid, act: 'move', to: step } as any);
    expect(positionsOf(s.g)[tid]).toBe(step); expect(s.g.story.ap?.[tid]).toBeLessThan(4); expect(s.g.story.ap?.[c.id]).toBe(4);
    expect(() => s.act({ type: 'world/act', charId: c.id, unit: tid, act: 'perk', id: 'x' } as any)).toThrow(/only moves/);
    // A fight: it stands beside the owner as the called twin, right after them in the order, and Call is barred.
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: zoneMap(s.g).id, difficulty: 'standard', enemies: [{ name: 'Foe 1', tier: 'soldier', weapon: 'service_pistol', at: '' }] } } } as any);
    const cb = s.g.combat!, pc = cb.units.find((x) => x.charId === c.id)!, tw = cb.units.find((x) => (x as any).twinOf === pc.id)!;
    expect(tw).toBeTruthy(); expect(tw.companion).toBeUndefined(); expect(tw.maxHp).toBe(half); expect(tw.def).toBe(pc.def);
    expect(cb.order[cb.order.indexOf(pc.id) + 1]).toBe(tw.id);
    expect(s.g.characters[c.id].companions || []).toEqual([]);
    expect(logHas(cb, /stands beside/)).toBe(true);
  });
  it('the twin follows its owner within 6 on the area map, and can be let go', () => {
    const s = storyWith([adv('twinbound', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: 'damage: move; damage; damage' } as any);
    const here = positionsOf(s.g)[c.id], spot = freeNear(s.g, here, 1);
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'class:twinbound.call', actionId: 'call_world', tile: spot } as any);
    const tid = 'cp-' + c.id + '-twin';
    // The owner walks away (fresh rounds give AP): the twin is never left more than 6 behind.
    for (let i = 0; i < 4; i++) {
      s.g.story.ap = { ...(s.g.story.ap || {}), [c.id]: 9 };
      const now = positionsOf(s.g)[c.id]; let to = ''; for (const d of [4, 3, 2]) { try { to = freeNear(s.g, now, d); break; } catch { /* next */ } }
      try { s.act({ type: 'world/act', charId: c.id, act: 'move', to } as any); } catch { /* blocked: try the next leg */ }
      expect(cheb(positionsOf(s.g)[tid], positionsOf(s.g)[c.id])).toBeLessThanOrEqual(6);
    }
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'class:twinbound.call', actionId: 'dismiss_world' } as any);
    expect(positionsOf(s.g)[tid]).toBeUndefined(); expect(s.g.characters[c.id].companions || []).toEqual([]);
  });
  it('the twin stays on the area map through a scene change and a zone change (Leon, 7 Nov 2026: until let go or a fight)', () => {
    const s = storyWith([adv('twinbound', SOUL)]); const c = s.chars[0];
    s.act({ type: 'story/perk', charId: c.id, id: 'twinbound.manifest', text: 'damage: move; damage; damage' } as any);
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'class:twinbound.call', actionId: 'call_world', tile: freeNear(s.g, positionsOf(s.g)[c.id], 1) } as any);
    const tid = 'cp-' + c.id + '-twin', has = () => (s.g.characters[c.id].companions || []).some((k) => k.kind === 'twin');
    s.act({ type: 'narrator/turn', turn: { narration: 'Later.', sceneTitle: 'A new scene' } } as any);
    expect(has()).toBe(true); expect(positionsOf(s.g)[tid]).toBeTruthy();
    const zones = (s.g.campaign as any).zones.map((z: any) => z.id), other = zones.find((z: string) => z !== zoneMap(s.g).id);
    expect(other).toBeTruthy();
    s.act({ type: 'narrator/turn', turn: { narration: 'On.', travel: other } } as any);
    expect(zoneMap(s.g).id).toBe(other); expect(has()).toBe(true);
    expect(cheb(positionsOf(s.g)[tid], positionsOf(s.g)[c.id])).toBeLessThanOrEqual(3); // placed beside its owner
  });
});
