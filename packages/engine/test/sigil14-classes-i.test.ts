// Lane classes-i under Sigil rules 1.4 (spec: "the old classes under the new Sigil rules"; items 430, 437, 448;
// docs/design/sigil-1.4-impact.md, base classes): the Mage's Barrage, Overcharge and Payload, the Warden's Raise Cover
// and Seal, the Scribe's Stored Spell and the Trickster's Rewrite, every one through the reducer (apply).
import { describe, expect, it } from 'vitest';
import {
  CLASS, SIGIL_REV, d20, applyCond, condOn, previewAttack, attackDamage, objectsOf, positionsOf, npcsOf, standable, zoneMap, storyObjects, refOf, packOf, sigilCoreSaving, emit,
  type Unit, type Combat, type GameState,
} from '../src';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const MIND = { archetype: 'sigilist', kit: 'sigil' } as const;
function cls(id: string, rank: 1 | 2 | 3, extra: CharSpec = {}): CharSpec {
  const sig = CLASS[id].signature, pts = rank === 3 ? [6, 6, 6] : rank === 2 ? [5, 4, 4] : [1, 1, 1];
  return { ...extra, classId: id, level: 5, skills: { ...Object.fromEntries(sig.map((s, i) => [s, pts[i]])), ...(extra.skills || {}) } };
}
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fxOf = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k);
/** A seed whose next n d20 rolls are all 2–19 (no natural 1 to miss, no critical to double). */
function plain(n = 12): number { for (let s = 1; s < 200000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
/** The caster knows these words, has plenty of AP and charge, no Flux, multipliers ×1; foes never dodge or save. */
function prep(f: F, u: Unit, words: string[], maxWords = 4) {
  const m = f.unit(u.id).mg!; f.cb.objects = [];
  Object.assign(m, { words: [...words], maxWords, charge: 99, flux: 0, sigilMult: 1, elemMult: 1, healMult: 1, rangeBonus: 0, durBonus: 0, coreSave: 0, glyphAp: 1 });
  f.unit(u.id).ap = 9;
  for (const e of f.foes) { const x = f.unit(e.id); x.def = -99; x.hp = x.maxHp = 999; x.armour = 0; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.pos = '15,10'; }
  f.g.rng.state = plain();
}
const at = (f: F, u: Unit, pos: string) => { f.unit(u.id).pos = pos; f.unit(u.id).ap = 9; };
const act = (f: F, u: Unit, a: any) => f.act({ unitId: u.id, ...a });
/** Draw a Line: step onto each tile (free) and draw its word there. */
function walk(f: F, u: Unit, words: string[], tiles: string[]) { words.forEach((w, i) => { at(f, u, tiles[i]); act(f, u, { type: 'combat/draw', word: w, tile: tiles[i] }); }); }

// ======================================================================================================== MAGE
describe('Mage under 1.4', () => {
  it('Barrage: FIRE costs 1 charge less when drawn (2 → 1)', () => {
    const f = fightWith([cls('mage', 1, MIND)], [{}]); const u = f.turn(f.pc); prep(f, u, ['fire', 'seek']); at(f, u, '4,2');
    const ch = f.unit(u.id).mg!.charge;
    act(f, u, { type: 'combat/draw', word: 'fire', tile: '4,2' });
    expect(f.unit(u.id).mg!.charge).toBe(ch - 1);
  });
  it('Overcharge: the next glyph is free (no charge, no AP, still Flux) and the spell may hold one word past Max Sigil words; it ends when the glyph leaves the ground', () => {
    const f = fightWith([cls('mage', 2, MIND)], [{}]); const u = f.turn(f.pc); prep(f, u, ['spark', 'seek', 'condense'], 2);
    const foe = f.unit(f.foe.id); foe.pos = '1,2';
    act(f, u, { type: 'combat/perk', id: 'class:mage.overcharge', actionId: 'overcharge' });
    expect(f.unit(u.id).mg!.maxWords).toBe(3);
    at(f, u, '4,2'); const ch = f.unit(u.id).mg!.charge;
    act(f, u, { type: 'combat/draw', word: 'spark', tile: '4,2' });
    expect(f.unit(u.id).mg!.charge).toBe(ch); expect(f.unit(u.id).ap).toBe(9); expect(f.unit(u.id).mg!.flux).toBe(1);
    walk(f, u, ['seek', 'condense'], ['5,2', '6,2']);
    // Three glyphs at Max Sigil words 2: the Overcharged glyph carries the spell. Standing on the last glyph (6,2), it fires
    // west past the first (4,2); the firing charge is 1 less (the free glyph adds nothing to it).
    const ch2 = f.unit(u.id).mg!.charge;
    act(f, f.unit(u.id), { type: 'combat/evoke', tile: '6,2', aim: '1,2' });
    expect(f.unit(f.foe.id).hp).toBeLessThan(999);
    expect(ch2 - f.unit(u.id).mg!.charge).toBe(Math.max(1, Math.max(1, 3 - (f.unit(u.id).mg!.coreSave || 0)) - 1));
    expect(f.unit(u.id).mg!.maxWords).toBe(2);
  });
  it('Overcharge never passes 4 glyphs (item 437)', () => {
    const f = fightWith([cls('mage', 2, MIND)], [{}]); const u = f.turn(f.pc); prep(f, u, ['spark', 'seek', 'condense'], 4);
    act(f, u, { type: 'combat/perk', id: 'class:mage.overcharge', actionId: 'overcharge' });
    walk(f, u, ['spark', 'seek', 'condense', 'condense'], ['3,2', '4,2', '5,2', '6,2']);
    at(f, u, '7,2');
    expect(() => act(f, u, { type: 'combat/draw', word: 'condense', tile: '7,2' })).toThrow(/at most 4/);
  });

  /** SPARK and a second word on a Line at 5,2 (drawn first) and 4,2; the Mage stands on 4,2, so it fires east, Touch:
   * the area is 6,2 and 6,3. Foe 1 on aim, foe 2 where given. */
  function payloadFight(second: string, foe2: string, payload: boolean, aim = '6,2') {
    const f = fightWith([cls('mage', 3, MIND)], [{}, {}]); const u = f.turn(f.pc); prep(f, u, ['spark', second]);
    const [a, b] = f.foes; f.unit(a.id).pos = '6,2'; f.unit(b.id).pos = foe2;
    walk(f, u, [second, 'spark'], ['5,2', '4,2']);
    const flux = f.unit(u.id).mg!.flux;
    if (payload) act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:mage.payload', actionId: 'payload', tile: '4,2', choice: aim });
    else act(f, f.unit(u.id), { type: 'combat/evoke', tile: '4,2', aim });
    return { f, u: f.unit(u.id), a: f.unit(a.id), b: f.unit(b.id), flux };
  }
  it('Payload doubles a SPREAD radius (2 → 4) and adds Flux equal to the glyphs', () => {
    const p = payloadFight('spread', '10,2', true);
    expect(p.a.hp).toBeLessThan(999); expect(p.b.hp).toBe(999 - 9); // SPARK 15 × SPREAD 0.6
    expect(p.u.mg!.flux).toBe(p.flux + 2); expect(logHas(p.f.cb, /PAYLOAD: SPREAD radius 2 → 4/)).toBe(true);
    const q = payloadFight('spread', '10,2', false);
    expect(q.b.hp).toBe(999); expect(q.u.mg!.flux).toBe(q.flux);
  });
  it('Payload doubles a PUSH cone\'s length (3 → 6)', () => {
    expect(payloadFight('push', '10,2', true).b.hp).toBeLessThan(999);
    expect(payloadFight('push', '10,2', false).b.hp).toBe(999);
  });
  it('Payload gives a one-target spell one more missile, at the nearest other target in the area', () => {
    const p = payloadFight('condense', '6,3', true);
    expect(p.a.hp).toBe(999 - 23); expect(p.b.hp).toBe(999 - 23); // SPARK 15 × CONDENSE 1.5 = 22.5, rounded to the nearest (item 456), each
    expect(logHas(p.f.cb, /one more missile \(1 → 2\)/)).toBe(true);
    expect(payloadFight('condense', '6,3', false).b.hp).toBe(999);
  });
  it('Payload is refused on a STAY, WAIT or WATCH spell, before anything is spent', () => {
    const f = fightWith([cls('mage', 3, MIND)], [{}]); const u = f.turn(f.pc); prep(f, u, ['spark', 'stay']);
    walk(f, u, ['stay', 'spark'], ['5,2', '4,2']); const ch = f.unit(u.id).mg!.charge;
    expect(() => act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:mage.payload', actionId: 'payload', tile: '4,2', choice: '6,2' })).toThrow(/STAY, WAIT or WATCH/);
    expect(f.unit(u.id).mg!.charge).toBe(ch); expect(f.cb.glyphs!.length).toBe(2);
  });
  it('Payload on the area map: a Line that reaches a hostile token opens the fight with the Payload', () => {
    const s = storyWith([cls('mage', 3, MIND)]); const c = s.chars[0], ch = s.g.characters[c.id];
    if (!(ch.pack || []).some((x: any) => (x.item || x.id) === 'evoker')) ch.pack = [...packOf(ch), { id: 'evoker', item: 'evoker', name: 'Evoker', qty: 1, kind: 'tool' } as any];
    ch.sigils = [...new Set([...(ch.sigils || []), 'spark', 'spread'])]; ch.evoCharge = 10;
    const here = positionsOf(s.g)[c.id], map = zoneMap(s.g), taken = new Set([...Object.values(positionsOf(s.g)), ...npcsOf(s.g).map((n) => n.pos), ...storyObjects(s.g).map((o) => o.pos)]);
    const [hx, hy] = here.split(',').map(Number); let gl = '', tgt = '';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) { const g1 = (hx + dx) + ',' + (hy + dy), t = (hx - dx) + ',' + (hy - dy); if (standable(map, g1) && standable(map, t) && !taken.has(g1) && !taken.has(t)) { gl = g1; tgt = t; break; } }
    expect(gl).not.toBe('');
    const full = () => { s.g.story.ap = { ...(s.g.story.ap || {}), [c.id]: 9 }; };
    full(); s.act({ type: 'world/act', charId: c.id, act: 'draw', word: 'spread', tile: here } as any);
    full(); s.act({ type: 'world/act', charId: c.id, act: 'move', to: gl } as any);
    full(); s.act({ type: 'world/act', charId: c.id, act: 'draw', word: 'spark', tile: gl } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Someone.', npcs: [{ action: 'place', name: 'Scavenger', side: 'hostile', tier: 'boss', weapon: 'service_pistol', at: refOf(tgt) }] } } as any);
    full(); s.g.rng.state = plain();
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'class:mage.payload', actionId: 'payload_world', tile: gl, choice: tgt } as any);
    // The fight opens on this map with the Payload as its first move.
    expect(s.g.phase).toBe('combat');
    expect(s.g.combat!.log.some((l) => /PAYLOAD: SPREAD radius 2 → 4/.test(l))).toBe(true);
    const sc = s.g.combat!.units.find((x) => x.name === 'Scavenger')!; expect(sc.hp).toBeLessThan(sc.maxHp); // a boss, so the spell doesn't end the fight
  });
});

// ======================================================================================================== WARDEN
describe('Warden under 1.4', () => {
  it('Raise Cover: a lone STAY glyph, Evoked from a tile next to it, stands as a two-tile cover rune; then it fades', () => {
    const f = fightWith([cls('warden', 1, MIND)], [{}]); const u = f.turn(f.pc); prep(f, u, ['stay', 'spark']); f.unit(f.foe.id).pos = '12,2';
    at(f, u, '4,2'); act(f, u, { type: 'combat/draw', word: 'stay', tile: '4,2' });
    expect(() => act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:warden.raise_cover' })).toThrow(/Step off the STAY glyph/);
    at(f, u, '3,2'); const ch = f.unit(u.id).mg!.charge;
    act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:warden.raise_cover' });
    const runes = objectsOf(f.cb).filter((o) => /^rune_/.test(o.id));
    expect(runes.length).toBe(2); expect(runes[0].pos).toBe('4,2'); expect(f.cb.glyphs!.length).toBe(0);
    expect(f.unit(u.id).mg!.charge).toBe(ch - 1);
    expect(fxOf(f.cb, 'wall_raised').length).toBe(1); expect(fxOf(f.cb, 'evoke').pop()!.shape).toBe('rune');
    const g = f.g, left = 2 + (f.unit(u.id).mg!.durBonus || 0);
    withGame(g, () => { for (let i = 0; i < left; i++) { f.cb.round++; emit(f.cb, 'round_start', { cb: f.cb, round: f.cb.round, rng: g.rng }); } });
    expect(objectsOf(f.cb).filter((o) => /^rune_/.test(o.id)).length).toBe(0);
  });
  it('Raise Cover: a STAY glyph in a Line is not lone', () => {
    const f = fightWith([cls('warden', 1, MIND)], [{}]); const u = f.turn(f.pc); prep(f, u, ['stay', 'spark']);
    walk(f, u, ['stay', 'spark'], ['4,2', '5,2']); at(f, u, '4,3');
    expect(() => act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:warden.raise_cover' })).toThrow(/lone STAY/);
  });
  it('Raise Cover on the area map: the rune stands as objects there and fades by overworld rounds', () => {
    const s = storyWith([cls('warden', 1, MIND)]); const c = s.chars[0], here = positionsOf(s.g)[c.id], map = zoneMap(s.g);
    const [hx, hy] = here.split(',').map(Number), taken = new Set([...Object.values(positionsOf(s.g)), ...npcsOf(s.g).map((n) => n.pos), ...storyObjects(s.g).map((o) => o.pos)]);
    const gl = [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => (hx + dx) + ',' + (hy + dy)).find((k) => standable(map, k) && !taken.has(k))!;
    s.g.story.glyphs = [{ id: 'gl1', word: 'stay', pos: gl, by: 'pc-' + c.id, side: 'pc', left: 3, who: c.name, v: SIGIL_REV } as any];
    s.act({ type: 'world/act', charId: c.id, act: 'perk', id: 'class:warden.raise_cover', actionId: 'raise_cover' } as any);
    expect(storyObjects(s.g).some((o) => /Cover rune/.test(o.name) && o.pos === gl)).toBe(true);
    for (let i = 0; i < 4; i++) { s.act({ type: 'world/act', charId: c.id, act: 'end' } as any); s.act({ type: 'narrator/turn', turn: { narration: 'Time passes.' } } as any); }
    expect(storyObjects(s.g).some((o) => /Cover rune/.test(o.name))).toBe(false);
  });
  it('Seal: reach 8 + the range bonus; an area fx (no Ring); an enemy caster inside pays double charge', () => {
    const f = fightWith([cls('warden', 3, MIND)], [{}]); const u = f.turn(f.pc); prep(f, u, ['spark', 'seek']); at(f, u, '1,2');
    expect(() => act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:warden.seal', tile: '11,2' })).toThrow(/Out of range \(8/);
    const ch = f.unit(u.id).mg!.charge;
    act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:warden.seal', tile: '8,2' });
    expect(f.unit(u.id).mg!.charge).toBe(ch - 2);
    const ev: any = fxOf(f.cb, 'evoke').pop(); expect(ev.shape).toBe('area'); expect(ev.tiles.length).toBe(9);
    expect(f.cb.zones!.some((z: any) => z.kind === 'seal')).toBe(true);
  });
});

// ======================================================================================================== SCRIBE
describe('Scribe Stored Spell under 1.4', () => {
  function scribe(text: string) {
    const s = storyWith([cls('scribe', 3, { ...MIND, skills: { proficiency: 11, eloquence: 6, rumination: 1 } })]);
    const c = s.chars[0], ch = s.g.characters[c.id]; ch.sigils = ['spark', 'seek', 'condense', 'stay', 'fire']; ch.evoCharge = 10;
    const before = s.g.characters[c.id].evoCharge!;
    s.act({ type: 'story/perk', charId: c.id, id: 'class:scribe.stored_spell', actionId: 'write', text });
    return { s, c, before };
  }
  function fight(s: any, c: any) {
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol' }] } } } as any);
    const cb: Combat = s.g.combat!, u = cb.units.find((x) => x.charId === c.id)!, foe = cb.units.find((x) => x.side === 'foe')!;
    cb.objects = []; Object.assign(u.mg!, { sigilMult: 1, elemMult: 1, rangeBonus: 0 }); u.pos = '8,2'; foe.pos = '2,2'; foe.def = -99; foe.hp = foe.maxHp = 999; foe.armour = 0;
    cb.turn = cb.order.indexOf(u.id); u.ap = 6; s.g.rng.state = plain();
    return { cb, u, foe };
  }
  it('written in the story as words (no shape): its charge and firing charge paid; STAY refused; the cap holds', () => {
    const { s, c, before } = scribe('SPARK SEEK');
    expect(before - s.g.characters[c.id].evoCharge!).toBe(1 + 2 + Math.max(1, 2 - sigilCoreSaving(s.g.characters[c.id])));
    expect(() => s.act({ type: 'story/perk', charId: c.id, id: 'class:scribe.stored_spell', actionId: 'write', text: 'FIRE SEEK' })).toThrow(/at most/);
    const t = storyWith([cls('scribe', 3, MIND)]); const tc = t.chars[0]; t.g.characters[tc.id].sigils = ['spark', 'stay']; t.g.characters[tc.id].evoCharge = 10;
    expect(() => t.act({ type: 'story/perk', charId: tc.id, id: 'class:scribe.stored_spell', actionId: 'write', text: 'SPARK STAY' })).toThrow(/STAY, WAIT or WATCH/);
  });
  it('triggered in a fight for 1 AP: it goes off from the Scribe\'s tile with its own Reach, all around; no charge; the map\'s glyphs stay', () => {
    const { s, c } = scribe('SPARK SEEK'); const { cb, u, foe } = fight(s, c);
    cb.glyphs = [{ id: 'gl90', word: 'spark', pos: '9,2', by: u.id, side: 'pc', left: 3, who: u.name, v: SIGIL_REV } as any]; (cb as any).sigilV = SIGIL_REV;
    const ch = u.mg!.charge;
    s.act({ type: 'combat/perk', unitId: u.id, id: 'class:scribe.stored_spell', actionId: 'trigger', tile: '2,2' });
    const cb2: Combat = s.g.combat!, me = cb2.units.find((x) => x.id === u.id)!;
    expect(cb2.log.some((l) => /triggers a stored spell \(SPARK · SEEK\)/.test(l))).toBe(true);
    expect(cb2.units.find((x) => x.id === foe.id)!.hp).toBe(999 - 15); // west of the Scribe: no facing
    expect(me.ap).toBe(5); expect(me.mg!.charge).toBe(ch);
    expect(cb2.glyphs!.map((g) => g.id)).toEqual(['gl90']);
    expect(fxOf(cb2, 'evoke').pop()!.shape).toBe('stack');
    expect(() => s.act({ type: 'combat/perk', unitId: u.id, id: 'class:scribe.stored_spell', actionId: 'trigger', tile: '2,2' })).toThrow(/Nothing stored/);
  });
  it('a Touch spell reaches only the tiles next to the object', () => {
    const { s, c } = scribe('SPARK CONDENSE'); const { u } = fight(s, c);
    expect(() => s.act({ type: 'combat/perk', unitId: u.id, id: 'class:scribe.stored_spell', actionId: 'trigger', tile: '2,2' })).toThrow(/Out of the area/);
    expect(s.g.combat!.units.find((x) => x.id === u.id)!.ap).toBe(6);
  });
  it('a 1.2 stored spell still fires: its shape is ignored and RETURN reads as SEEK', () => {
    const { s, c } = scribe('SPARK SEEK');
    const st = s.g.story.ps![c.id].items['class:scribe.stored_spell'];
    st.spells[0] = { ...st.spells[0], words: ['fire', 'return'], shape: 'stack' };
    const { u, foe } = fight(s, c);
    s.act({ type: 'combat/perk', unitId: u.id, id: 'class:scribe.stored_spell', actionId: 'trigger', tile: foe.pos });
    expect(s.g.combat!.log.some((l) => /triggers a stored spell \(FIRE · SEEK\)/.test(l))).toBe(true);
  });
});

// ======================================================================================================== TRICKSTER
describe('Trickster Rewrite under 1.4', () => {
  /** Rewrite the foe until a seed makes its Brain save fail (it fails on anything but a natural 20). */
  function rewrite(cond: string) {
    for (let seed = 1; seed < 40; seed++) {
      const f = fightWith([cls('trickster', 3, MIND)], [{}], { seed: 'RW14' + seed }); const u = f.turn(f.pc); prep(f, u, ['bind']);
      at(f, u, '3,2'); const foe = f.unit(f.foe.id); foe.pos = '7,2';
      withGame(f.g, () => applyCond(f.cb, { state: 1 }, f.unit(u.id), f.unit(f.foe.id), cond, 2, undefined, { skipSave: true }));
      f.g.rng.state = seed;
      act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:trickster.rewrite', targetId: f.foe.id });
      if (!logHas(f.cb, /resists/)) return f;
    }
    throw new Error('no failing save');
  }
  it('Quickened flips to Dazed (−2 AP on its next turn)', () => {
    const f = rewrite('quickened'), foe = f.unit(f.foe.id);
    expect(condOn(foe, 'quickened')).toBe(false); expect(foe.dazedNext).toBe(1);
    expect(logHas(f.cb, /haste turns to a stagger/)).toBe(true);
  });
  it('Sharpened flips to −3 to hit and ×0.8 damage on its next attack', () => {
    const f = rewrite('sharpened'), foe = f.unit(f.foe.id), pc = f.unit(f.pc.id);
    expect(condOn(foe, 'sharpened')).toBe(false); foe.ap = 6;
    const pv = withGame(f.g, () => previewAttack(f.cb, foe, pc, 'shot'));
    expect(pv.terms!.some((t: any) => t.v === -3 && /Rewritten/.test(t.label))).toBe(true);
    const d = withGame(f.g, () => attackDamage(f.cb, foe, pc, 'shot', null, { preview: true }));
    expect(d.mults.some((m: any) => m.v === 0.8 && /Rewritten/.test(m.label))).toBe(true);
  });
  it('Rewrite reaches 8 tiles + the Sigil range bonus', () => {
    const f = fightWith([cls('trickster', 3, MIND)], [{}]); const u = f.turn(f.pc); prep(f, u, ['bind']); at(f, u, '1,2'); f.unit(f.foe.id).pos = '11,2';
    expect(() => act(f, f.unit(u.id), { type: 'combat/perk', id: 'class:trickster.rewrite', targetId: f.foe.id })).toThrow(/Out of range \(8/);
  });
});
