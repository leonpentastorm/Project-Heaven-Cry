// Outburst 4.0 (rules 1.8) review fixes, through apply(): Revert after a Feed, a Fuse's release hook and items' multipliers,
// the shelved advanced-class modules, the area map's dry run and practice, and fuses that outlive the fight.
import { describe, expect, it } from 'vitest';
import { d20, FEELINGS, CLASS, positionsOf, zoneMap, npcsOf, storyObjects, refOf, checkOutburstDesign, startingMagicError, apply, newGame, ARCHETYPES, type Unit, type OutburstDesign, type GameState } from '../src';
import { onHook } from '../src/effects/hooks';
import { fightWith, storyWith } from './helpers/perkfight';

function calmSeed(n = 60): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calmSeed();
const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
type F = ReturnType<typeof fightWith>;
/** outburst40's rig: a Soul caster at 3,5 on its turn, 60 AP, Soul ×1, every feeling known; foes 500 HP, no defence. */
function rig(foes: string[] = ['6,5'], spec: any = SOUL) {
  const f = fightWith([spec], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pc.pos = '3,5'; f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of cb.units) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; (x as any).healRecv = 1; }
  Object.assign(f.pc.mg!, { emanator: true, mp: 9999, mpMax: 9999, soulMult: 1, soulBase: 20, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, firstUsed: true, feelings: FEELINGS.map((x) => x.id), debuff: { body: 0, brain: 0, heart: 0 } });
  const u = f.turn(f.pc); u.ap = 60; f.g.rng.state = SEED;
  return f;
}
function give(u: Unit, d: Partial<OutburstDesign>): string { const id = 'r' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: [], ...d } as OutburstDesign); return id; }
const A = (f: F, a: Record<string, any>) => f.act({ unitId: f.pc.id, ...a } as any);
const me = (f: F) => f.unit(f.pc.id);
const lost = (u: Unit) => 500 - u.hp;
const storyHas = (g: GameState, re: RegExp) => g.story.entries.some((e: any) => re.test((e.head || '') + ' ' + (e.text || '')));

describe('Revert after a Feed (rules 1.8 item 808)', () => {
  it('Begin, Pump, Feed, Revert: back to stage 1 (the Feed\'s stage stays), 1 AP back, the glyph stays eaten', () => {
    const f = rig(); const d = give(f.pc, {});
    A(f, { type: 'combat/outburst', design: d }); A(f, { type: 'combat/pump' }); expect(me(f).mg!.held!.stage).toBe(1);
    f.cb.glyphs = [{ id: 'g1', word: 'fire', pos: '3,5', by: f.foe.id, side: 'foe', left: 3, who: 'Foe', v: 14 } as any];
    A(f, { type: 'combat/feed' }); expect(me(f).mg!.held!.stage).toBe(2);
    const ap = me(f).ap;
    A(f, { type: 'combat/revert' });
    expect(me(f).mg!.held!.stage).toBe(1); expect(me(f).ap).toBe(ap + 1); expect(f.cb.glyphs || []).toEqual([]);
  });
});

describe('Fuse and the release hook (rules 1.8 section 4)', () => {
  it('\'outburst_release\' fires once for a fused release, and Heart Surge\'s multiplier reaches the delayed blast', () => {
    let n = 0, on = false; onHook('outburst_release', () => { if (on) n++; });
    const run = (surge: boolean) => {
      const f = rig(['6,5'], { ...SOUL, classId: 'channeler', level: 12, attrs: { [CLASS.channeler.attribute]: 8 } });
      const d = give(f.pc, { modules: ['fuse', 'at_once'] }); n = 0; on = true;
      A(f, { type: 'combat/outburst', design: d, aim: '6,5', ...(surge ? { mods: ['class:channeler.heart_surge#surge'] } : {}) });
      expect(lost(f.foe)).toBe(0); expect((f.cb.zones || []).some((z: any) => z.kind === 'fuse')).toBe(true);
      f.turn(f.pc); on = false;
      return { n, dmg: lost(f.foe) };
    };
    const plain = run(false), surged = run(true);
    expect(plain.n).toBe(1); expect(surged.n).toBe(1);
    expect(plain.dmg).toBe(Math.floor(20 * 0.8 * 0.8)); // a snap at stage 0 (×0.8), At Once ×0.8 (rules 1.17)
    expect(surged.dmg).toBe(Math.floor(20 * 1 * 0.8)); // surged: read a stage higher (stage 1, ×1.0)
  });
  it('a Fuse still waiting when the fight ends fizzles: never carried to the area map', () => {
    const f = rig(['6,5']); f.foe.hp = 1;
    const fz = give(f.pc, { modules: ['fuse', 'at_once'] }), kill = give(f.pc, { modules: ['at_once'] });
    A(f, { type: 'combat/outburst', design: fz, aim: '4,4' }); expect((f.cb.zones || []).some((z: any) => z.kind === 'fuse')).toBe(true);
    A(f, { type: 'combat/outburst', design: kill, aim: '6,5' });
    expect(f.g.phase).toBe('story');
    expect((f.g.story.zones || []).some((z: any) => z.kind === 'fuse')).toBe(false);
    expect(storyHas(f.g, /A fuse fizzles out/)).toBe(true);
  });
});

describe('the shelved advanced-class modules (rules 1.8 section 4)', () => {
  it('can\'t be taught (Narrator, plate, Proving Ground) or put in a design while the class is shelved', () => {
    const s = storyWith([SOUL]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'A lesson.', magic: [{ charId: c.id, module: 'echo', reason: 'a dream' }] } } as any);
    expect(s.g.characters[c.id].soulKnown?.modules || []).not.toContain('echo');
    s.act({ type: 'narrator/turn', turn: { narration: 'A lesson.', magic: [{ charId: c.id, module: 'split', reason: 'a dream' }] } } as any);
    expect(s.g.characters[c.id].soulKnown?.modules).toContain('split');
    const ch = s.g.characters[c.id]; ch.soulKnown!.modules.push('echo'); // an old save that learned it
    expect(checkOutburstDesign(ch, { school: 'damage', modules: ['echo'] }, 3, 'x')).toMatch(/Heartfed/);
    let g = newGame('PROVE2', { id: 'h1', name: 'Host' }, 'seed-proving'); const a = ARCHETYPES.find((x) => x.id === 'stormcaller')!;
    g = apply(g, { type: 'char/add', sheet: { name: 'Vel', portrait: '', origin: 'x', kit: 'soul', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1'); const id = Object.keys(g.characters)[0];
    expect(() => apply(g, { type: 'sandbox/learn', charId: id, module: 'halo' } as any, 'h1')).toThrow(/Saint/);
    g = apply(g, { type: 'sandbox/learn', charId: id, module: 'fuse' } as any, 'h1'); expect(g.characters[id].soulKnown!.modules).toContain('fuse');
  });
  it('can\'t come in through a Proving Ground design or a starting Outburst either', () => {
    let g = newGame('PROVE3', { id: 'h1', name: 'Host' }, 'seed-proving'); const a = ARCHETYPES.find((x) => x.id === 'stormcaller')!;
    g = apply(g, { type: 'char/add', sheet: { name: 'Vel', portrait: '', origin: 'x', kit: 'soul', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1'); const id = Object.keys(g.characters)[0];
    expect(() => apply(g, { type: 'sandbox/design', charId: id, design: { id: '', name: 'X', school: 'damage', modules: ['echo'] } } as any, 'h1')).toThrow(/Heartfed/);
    expect(g.characters[id].soulKnown?.modules || []).not.toContain('echo');
    expect(startingMagicError({ outburst: { school: 'damage', modules: ['echo'] }, skills: {} } as any)).toMatch(/Heartfed/);
    expect(startingMagicError({ outburst: { school: 'damage', modules: ['split'] }, skills: {} } as any)).toBeNull();
  });
});

describe('the area map\'s dry run (rules 1.8 practice)', () => {
  it('a snap release on the area map counts its practice once', () => {
    const s = storyWith([SOUL]); const c = s.chars[0], ch = s.g.characters[c.id];
    ch.mp = 500; ch.skills.lore_master = Math.max(ch.skills.lore_master || 0, 1);
    const d = ch.outbursts!.find((x) => !x.modules.some((m) => ['fuse', 'wave', 'lance', 'aura'].includes(m))) || ch.outbursts![0];
    const here = positionsOf(s.g)[c.id], [x, y] = here.split(',').map(Number), map = zoneMap(s.g);
    const taken = new Set([...Object.values(positionsOf(s.g)), ...npcsOf(s.g).map((n) => n.pos), ...storyObjects(s.g).map((o) => o.pos)]);
    const bad = new Set([...(map.solid || []), ...(map.cover || []), ...(map.full || [])]);
    let aim = '';
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [2, 0], [-2, 0]]) { const k = (x + dx) + ',' + (y + dy); if (x + dx >= 0 && y + dy >= 0 && x + dx < map.w && y + dy < map.h && !taken.has(k) && !bad.has(k)) { aim = k; break; } }
    expect(aim).not.toBe('');
    const p0 = s.g.characters[c.id].soulPractice || 0;
    s.act({ type: 'world/act', charId: c.id, act: 'outburst', design: d.id, aim: refOf(aim), hold: false } as any);
    expect(s.g.phase).toBe('story');
    expect((s.g.characters[c.id].soulPractice || 0) - p0).toBe(1); // stage 0, no feelings: 1
  });
});
