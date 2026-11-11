// Rules 1.5 (Outburst 2.0): regressions for the review of 8 Nov 2026 (spec items 541–544 and the engine fixes beside
// them). Player actions go through apply() (combat/outburst, combat/pump, combat/release, combat/letgo, combat/attack,
// combat/end-turn, magic/design, story/perk, world/act); the preview and the AI's pricing are called directly.
import { describe, expect, it } from 'vitest';
import {
  d20, previewOutburstPlan, previewPump, pumpsAp, freePumps, condOn, stageMult, emit, CLASS, type Combat, type Unit, type OutburstDesign, type Character,
} from '../src';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

function calmSeed(n = 60): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calmSeed();
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];

/** As outburst20.test.ts: a Soul caster at 3,5 on its turn (Soul ×1, Healing ×1, reach 4, Strain limit 20, no free
 * Pumps, 9999 MP, 60 AP); everyone 500 HP, no armour, Defense −99, saves −99 unless changed. */
function rig(foes: string[] = ['6,5'], allies: string[] = [], mana = 15) {
  const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' }, ...allies.map(() => ({ archetype: 'stormcaller', kit: 'soul' }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = mana;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; });
  f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; (x as any).elemTaken = 0; (x as any).healRecv = 1; }
  for (const p of f.pcs) Object.assign(p.mg!, { emanator: true, mp: 9999, mpMax: 9999, soulMult: 1, soulBase: 20, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, debuff: { body: 0, brain: 0, heart: 0 } });
  for (const p of f.pcs) { p.sk = {}; p.dbf = {}; }
  const u = f.turn(f.pc); u.ap = 60;
  f.g.rng.state = SEED;
  return f;
}
type F = ReturnType<typeof rig>;
function give(u: Unit, d: Partial<OutburstDesign>): string { const id = 'd' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: [], ...d } as OutburstDesign); return id; }
const A = (f: F, a: Record<string, any>, u: Unit = f.pc) => f.act({ unitId: u.id, ...a } as any);
const begin = (f: F, design: string, o: Record<string, any> = {}) => A(f, { type: 'combat/outburst', design, ...o });
const pump = (f: F, n = 1) => { for (let i = 0; i < n; i++) A(f, { type: 'combat/pump' }); };
const release = (f: F, aim?: string) => A(f, { type: 'combat/release', ...(aim ? { aim } : {}) });
const me = (f: F) => f.unit(f.pc.id);
const lost = (u: Unit) => 500 - u.hp;
const charOf = (f: { g: any }, u: Unit): Character => f.g.characters[u.charId!];

describe('the second school works on the primary\'s side (item 542)', () => {
  it('an old Buff design with a hostile rider heals the ally and lands nothing hostile on it', () => {
    for (const [school2, option2] of [['damage', undefined], ['status', undefined], ['control', 'pinned'], ['control', 'push']] as const) {
      const f = rig(['12,5'], ['4,5']); const ally = f.pcs[1]; ally.hp = 100;
      const d = give(f.pc, { school: 'buff', option: 'heal', school2, ...(option2 ? { option2 } : {}) });
      begin(f, d); pump(f); release(f, '4,5');
      const a = f.unit(ally.id);
      expect(a.hp, school2).toBe(136); expect(a.pos, school2).toBe('4,5'); // 30 × stage 1 (×1.2, rules 1.17)
      expect(condOn(a, 'shaken') || condOn(a, 'pinned'), school2).toBe(false);
      expect(withGame(f.g, () => previewOutburstPlan(f.cb, me(f), d, '4,5')).affected[0].second).toBe('');
    }
  });
  it('magic/design refuses a cross-side pairing and keeps a same-side one (Buff + Inverse Damage)', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const c = s.g.characters[s.chars[0].id];
    c.soulKnown = { schools: ['damage', 'buff', 'status', 'control'], modules: ['inverse'], tones: [] }; c.skills.will_power = 6; c.outbursts = [];
    const design = (d: any) => s.act({ type: 'magic/design', charId: c.id, design: { id: '', name: 'X', modules: [], ...d } } as any, c.owner);
    expect(() => design({ school: 'buff', option: 'heal', school2: 'status', option2: 'inspired' })).toThrow(/same side/);
    expect(() => design({ school: 'buff', school2: 'control' })).toThrow(/same side/);
    expect(() => design({ school: 'damage', school2: 'buff' })).toThrow(/same side/);
    design({ school: 'buff', option: 'heal', school2: 'damage', modules: ['inverse'] });
    expect(s.g.characters[c.id].outbursts!.at(-1)).toMatchObject({ school: 'buff', school2: 'damage', modules: ['inverse'] });
  });
});

describe('Beloved Spells and the Twinbound twin use the 1.5 design rules', () => {
  const adv = (id: string): CharSpec => ({ advancedClass: id, level: 5, archetype: 'stormcaller', kit: 'soul' });
  it('a Beloved design keeps its tone and second-school option; two shapes, Size alone and a bad option are refused or cleaned', () => {
    const s = storyWith([adv('devoted')]); const id = s.chars[0].id, c = s.g.characters[id];
    c.soulKnown = { schools: ['damage', 'control'], modules: ['wave', 'lance', 'size'], tones: ['fire'] }; c.skills.will_power = 6; c.skills.empathy = 8; c.outbursts = [];
    const bd = (text: string) => s.act({ type: 'story/perk', charId: id, id: 'devoted.beloved_spells', actionId: 'beloved_design', text } as any);
    expect(() => bd(JSON.stringify({ school: 'damage', modules: ['wave', 'lance'] }))).toThrow(/One shape/);
    expect(() => bd('damage: size')).toThrow(/Size needs a shape/);
    bd(JSON.stringify({ school: 'damage', modules: ['wave'], tone: 'fire', school2: 'control', option2: 'pull', option: 'x' }));
    const d = s.g.characters[id].outbursts!.at(-1)!;
    expect(d).toMatchObject({ modules: ['wave'], tone: 'fire', school2: 'control', option2: 'pull' }); expect(d.option).toBeUndefined();
  });
  it('a twin design with two shapes is refused', () => {
    const s = storyWith([adv('twinbound')]); const id = s.chars[0].id, c = s.g.characters[id];
    c.soulKnown = { schools: ['damage'], modules: ['wave', 'lance'], tones: [] }; c.skills.will_power = 6;
    const bad = JSON.stringify({ designs: [{ school: 'damage', modules: ['wave', 'lance'] }, { school: 'damage', modules: [] }, { school: 'damage', modules: [] }] });
    expect(() => s.act({ type: 'story/perk', charId: id, id: 'twinbound.manifest', text: bad } as any)).toThrow(/Outburst 1: One shape/);
  });
});

describe('Fighting it out and Tending others: the turn\'s first only, even at Strain 0', () => {
  it('a first attack at Strain 0 uses the calm; a later attack the same turn doesn\'t calm', () => {
    const f = rig(); f.foe.hp = f.foe.maxHp = 5000;
    A(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'shot' }); expect(me(f).mg!.calmFight).toBe(true);
    me(f).mg!.strain = 2;
    A(f, { type: 'combat/attack', targetId: f.foe.id, mode: 'shot' }); expect(me(f).mg!.strain).toBe(2);
    expect(fx(f.cb, 'calm').filter((e) => e.way === 'fight').length).toBe(0);
  });
});

describe('"landed" means took effect (item 543)', () => {
  it('a push the foe saves against carries no damage rider; a resisted Status carries none either', () => {
    let f = rig(); f.foe.sv = { body: 99, brain: 99, heart: 99 } as any;
    let d = give(f.pc, { school: 'control', option: 'push', school2: 'damage' });
    begin(f, d); pump(f); release(f, '6,5');
    expect(f.foe.pos).toBe('6,5'); expect(lost(f.foe)).toBe(0); expect(logHas(f.cb, /holds its ground/)).toBe(true);
    f = rig(); f.foe.sv = { body: 99, brain: 99, heart: 99 } as any;
    d = give(f.pc, { school: 'status', option: 'shaken', school2: 'damage' });
    begin(f, d); pump(f); release(f, '6,5');
    expect(condOn(f.foe, 'shaken')).toBe(false); expect(lost(f.foe)).toBe(0);
    // A failed save still lands both.
    f = rig(); d = give(f.pc, { school: 'control', option: 'push', school2: 'damage' });
    begin(f, d); pump(f); release(f, '6,5'); expect(f.foe.pos).toBe('9,5'); expect(lost(f.foe)).toBe(12);
  });
});

describe('Let it go gives back only what the swells cost (item 541)', () => {
  it('Begin, Pump ×4, let go: no Strain back (the stages were bought with AP)', () => {
    const f = rig(); const d = give(f.pc, {}); me(f).mg!.strain = 6;
    begin(f, d); pump(f, 4); expect(me(f).mg!.strain).toBe(7);
    A(f, { type: 'combat/letgo' }); expect(me(f).mg!.strain).toBe(7); expect(fx(f.cb, 'letgo').at(-1)).toMatchObject({ stage: 4, by: 0 });
  });
  it('one swell and two Pumps: −1 (the swell\'s Strain), not −3; Flooded swells count 2', () => {
    let f = rig(); let d = give(f.pc, {});
    begin(f, d); f.turn(f.pc); me(f).ap = 60; pump(f, 2); me(f).mg!.strain = 5;
    expect(me(f).mg!.held!.stage).toBe(3); A(f, { type: 'combat/letgo' }); expect(me(f).mg!.strain).toBe(4);
    f = rig(['6,5'], [], 35); d = give(f.pc, {});
    begin(f, d); f.turn(f.pc); me(f).ap = 60; pump(f, 2); me(f).mg!.strain = 9;
    A(f, { type: 'combat/letgo' }); expect(me(f).mg!.strain).toBe(7);
  });
});

describe('The Twin Pays: an ordinary Begin after a let-go twin cast pays its swells (perks/d.ts)', () => {
  it('Begin twin, let go, Begin again: each swell costs +1 Strain', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', perks: { the_twin_pays: 'mastered' } }], [{}]);
    const u0 = f.turn(f.pc); u0.ap = 9; u0.mg!.mp = 500; u0.mg!.strainLimit = 20; const d = u0.mg!.designs[0].id;
    f.act({ type: 'combat/outburst', unitId: u0.id, design: d, hold: true, mods: ['twin'] } as any);
    f.act({ type: 'combat/letgo', unitId: u0.id } as any);
    f.act({ type: 'combat/outburst', unitId: u0.id, design: d, hold: true } as any);
    const s0 = f.pc.mg!.strain; expect(s0).toBeGreaterThan(0);
    withGame(f.g, () => emit(f.cb, 'turn_end', { u: f.pc, cb: f.cb, rng: f.g.rng }));
    const u1 = f.turn(f.pc); expect(u1.mg!.held!.stage).toBe(1); expect(u1.mg!.strain).toBe(s0); // −1 turn start, +1 swell
    const u2 = f.turn(f.pc); expect(u2.mg!.held!.stage).toBe(2); expect(u2.mg!.strain).toBe(s0);
  });
  it('the twin pays the Begin\'s AP too (Leon, 11 Nov 2026): 0 AP, 0 MP; the next Begin costs its AP again', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', perks: { the_twin_pays: 'mastered' } }], [{}]);
    const u0 = f.turn(f.pc); u0.ap = 6; u0.mg!.mp = 500; u0.mg!.strainLimit = 20; const d = u0.mg!.designs[0].id, mp0 = u0.mg!.mp;
    f.act({ type: 'combat/outburst', unitId: u0.id, design: d, hold: true, mods: ['twin'] } as any);
    expect(f.pc.ap).toBe(6); expect(f.pc.mg!.mp).toBe(mp0); expect(f.pc.mg!.held).toBeTruthy();
    f.act({ type: 'combat/letgo', unitId: u0.id } as any);
    const ap1 = f.pc.ap; f.act({ type: 'combat/outburst', unitId: u0.id, design: d, hold: true, mods: ['twin'] } as any);
    expect(f.pc.ap).toBeLessThan(ap1); // used this fight: an ordinary Begin
  });
});

describe('Heart\'s Own: the Short is checked at the turn\'s end when the raised limit falls (item 544)', () => {
  it('2 over the raised limit, release the Beloved spell, end the turn: 4 over the plain limit shorts', () => {
    const f = fightWith([{ advancedClass: 'devoted', level: 5, archetype: 'stormcaller', kit: 'soul' }], [{}]); (charOf(f, f.pc) as any).state = { beloved: ['o1'] };
    const u = f.turn(f.pc); u.ap = 9; u.mg!.mp = 500; const plain = u.mg!.strainLimit;
    f.foe.pos = '6,' + u.pos.split(',')[1]; f.foe.hp = f.foe.maxHp = 999;
    f.act({ type: 'combat/outburst', unitId: u.id, design: 'o1', hold: true } as any);
    expect(f.pc.mg!.strainLimit).toBe(plain + 2);
    f.pc.mg!.strain = plain + 4; // 2 over the raised limit: legal
    f.act({ type: 'combat/release', unitId: u.id, aim: f.foe.pos } as any);
    f.act({ type: 'combat/end-turn', unitId: u.id } as any);
    expect(logHas(f.cb, /MANA SHORT/)).toBe(true);
    const pc = f.unit(f.pc.id); expect(pc.mg!.strainLimit).toBe(plain); expect(pc.mg!.strain).toBeLessThanOrEqual(plain);
  });
});

describe('a held design can\'t be edited (magic/design)', () => {
  it('Begin on the area map, then edit the same design: refused', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const c = s.g.characters[s.chars[0].id];
    const d = c.outbursts![0];
    s.act({ type: 'world/act', charId: c.id, act: 'outburst', design: d.id } as any, c.owner);
    expect(() => s.act({ type: 'magic/design', charId: c.id, design: { ...d, tone: 'fire' } } as any, c.owner)).toThrow(/holding that Outburst/);
  });
});

describe('a fight saved under 1.2 gets its free Pumps back', () => {
  it('a unit with no freePumpsMax reads Empathy\'s free Pumps from its character', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' }], [{}]); const u = f.turn(f.pc), c = charOf(f, u);
    c.skills.empathy = 7; delete (u.mg as any).freePumpsMax; delete (u.mg as any).freePumps; u.ap = 9;
    f.act({ type: 'combat/outburst', unitId: u.id, design: u.mg!.designs[0].id, hold: true } as any);
    const m = f.unit(u.id).mg!; expect(m.freePumpsMax).toBe(freePumps(c)); expect(freePumps(c)).toBe(2);
    expect(withGame(f.g, () => previewPump(f.cb, f.unit(u.id)))).toMatchObject({ ok: true, ap: 0, free: true });
  });
});

describe('the release preview (the same standard as Sigil\'s)', () => {
  const cls = (id: string, rank: 1 | 3): CharSpec => { const sig = SIG(id), pts = rank === 3 ? [6, 6, 6] : [1, 1, 1]; return { archetype: 'stormcaller', kit: 'soul', classId: id, level: 5, skills: Object.fromEntries(sig.map((s, i) => [s, pts[i]])) }; };
  it('Pumps are priced through outburst_pump (Shape): stage 1 → 3 with 2 AP is legal', () => {
    const f = fightWith([cls('channeler', 1)], [{}]); const u = f.turn(f.pc); const m = u.mg!; m.freePumps = 0; m.freePumpsMax = 0; m.firstUsed = true; m.mp = 500; u.ap = 9;
    const d = m.designs.find((x) => x.school === 'damage')!.id; f.foe.pos = '6,' + u.pos.split(',')[1];
    f.act({ type: 'combat/outburst', unitId: u.id, design: d, hold: true } as any);
    const v = f.unit(u.id); v.mg!.held!.stage = 1; v.ap = 2;
    const plan = withGame(f.g, () => previewOutburstPlan(f.cb, v, 'held', f.foe.pos, { stage: 3 }));
    expect(plan.ap).toBe(2); expect(plan.ok).toBe(true);
    expect(withGame(f.g, () => pumpsAp(f.cb, v, v.mg!.designs.find((x) => x.id === d)!, 2, 1))).toBe(1);
  });
  it('Heart Surge on: the plan shows the surged stage and multiplier, and a refused release doesn\'t spend it', () => {
    const f = fightWith([cls('channeler', 3)], [{}]); const u = f.turn(f.pc); const m = u.mg!; m.mp = 500; m.strainLimit = 20; u.ap = 9;
    const d = m.designs.find((x) => x.school === 'damage')!.id; f.foe.pos = '6,' + u.pos.split(',')[1];
    f.act({ type: 'combat/outburst', unitId: u.id, design: d, hold: true } as any); f.act({ type: 'combat/pump', unitId: u.id } as any); f.act({ type: 'combat/pump', unitId: u.id } as any);
    const mods = ['class:channeler.heart_surge#surge'], v = f.unit(u.id);
    expect(withGame(f.g, () => previewOutburstPlan(f.cb, v, 'held', f.foe.pos)).stage).toBe(2);
    const p = withGame(f.g, () => previewOutburstPlan(f.cb, v, 'held', f.foe.pos, { mods }));
    expect(p.stage).toBe(3); expect(p.mult).toBe(stageMult(3)); expect((f.cb as any).mods).toBeUndefined();
    expect(() => f.act({ type: 'combat/release', unitId: u.id, aim: '40,40', mods } as any)).toThrow();
    expect(f.unit(u.id).mg!.held!.stage).toBe(2);
    f.act({ type: 'combat/release', unitId: u.id, aim: f.foe.pos, mods } as any);
    expect(fx(f.cb, 'release').at(-1)).toMatchObject({ stage: 3 });
  });
  it('damage is floored as the hit floors it (soulMult 1.45, stage 2: 20 × 1.45 × 1.6 = 46.4 → 46)', () => {
    const f = rig(); me(f).mg!.soulMult = 1.45; const d = give(f.pc, {});
    begin(f, d); pump(f, 2);
    const plan = withGame(f.g, () => previewOutburstPlan(f.cb, me(f), 'held', '6,5'));
    expect(plan.affected[0].dmg).toBe(46);
    release(f, '6,5'); expect(lost(f.foe)).toBe(46);
  });
  it('the reach ring follows the hooked range (Verse of War: +1), as the aim check does', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', perks: { verse_of_war: 'achieved' } }], [{}]); const u = f.turn(f.pc); u.mg!.mp = 500; u.ap = 9;
    const d = u.mg!.designs[0].id, mods = ['verse'];
    const plain = withGame(f.g, () => previewOutburstPlan(f.cb, f.unit(u.id), d, undefined, { mods }));
    f.act({ type: 'combat/say', charId: f.pc.charId!, text: 'Burn, and remember the burning' } as any);
    const verse = withGame(f.g, () => previewOutburstPlan(f.cb, f.unit(u.id), d, undefined, { mods }));
    expect(verse.reach).toBe(plain.reach + 1);
    const [x, y] = f.unit(u.id).pos.split(',').map(Number), far = (x + verse.reach) + ',' + y;
    expect(verse.reachTiles.length).toBeGreaterThan(plain.reachTiles.length);
    if (verse.reachTiles.includes(far)) expect(withGame(f.g, () => previewOutburstPlan(f.cb, f.unit(u.id), d, far, { mods })).why || '').not.toMatch(/reach/);
  });
});
