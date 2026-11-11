// Rules 1.5 (Outburst 2.0): the gaps closed after the review of 8 Nov 2026. Tending others through every kind of
// cleanse, stim and shield (section 3.3); tones, schools and modules from plates (section 5, spec 4.4); the preview's
// everyone-affected list (section 7); Storm Hand's Gauntlet riders and Discharge (section 8). Player actions go through
// apply() (combat/perk, combat/pray, combat/stim, combat/outburst, combat/pump, combat/release, combat/attack,
// combat/class, magic/learn); the preview is called directly.
import { afterEach, describe, expect, it } from 'vitest';
import {
  d20, previewOutburstPlan, condOn, PERK, PATRON, CLASS, type Combat, type Unit, type OutburstDesign, type Character,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';
import { useRevision2Classes, SIG } from './helpers/legacy';
useRevision2Classes(); // Revision 2 classes and advanced classes for this file's handler tests (Class Roster Rev 3)

const withG = <T>(f: { g: any }, fn: () => T): T => withGame(f.g, fn);

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


// ---------------------------------------------------------------------------------------------------------------------
/** Test-only items: an ally cleanse and an ally shield as plain data (the generic ops), and a patron whose Blessing
 * cleanses. Removed after each test. */
const TEST_PERKS: Record<string, any> = {
  test_wash: { id: 'test_wash', name: 'Test Wash', tier: 'acquired', text: 'Cleanse an ally.', adjudication: 'engine', effects: [], tiers: { I: { requires: [], ap_cost: 1, text: '', effects: [{ op: 'grant_action', action: 'wash', ap: 1, uses: 'at_will' }, { op: 'cleanse', target: 'ally' }] } } },
  test_ward: { id: 'test_ward', name: 'Test Ward', tier: 'acquired', text: 'Shield an ally.', adjudication: 'engine', effects: [], tiers: { I: { requires: [], ap_cost: 1, text: '', effects: [{ op: 'grant_action', action: 'ward', ap: 1, uses: 'at_will' }, { op: 'shield', target: 'ally', value: 20 }] } } },
};
const TEST_PATRON = { id: 'test_patron', name: 'The Test Saint', blessings: [{ id: 'test_absolve', name: 'Test Absolve', text: 'Cleanse.', effects: [{ op: 'cleanse' }], adjudication: 'engine' }] };
afterEach(() => { for (const k of Object.keys(TEST_PERKS)) delete (PERK as any)[k]; delete (PATRON as any).test_patron; });
/** Hold a perk (the character and the fight's snapshot of what the unit holds). */
function givePerk(f: F, id: string) { charOf(f, f.pc).perks = [{ id, tier: 'I' } as any]; if (f.pc.held) f.pc.held = { ...f.pc.held, perks: [{ id, tier: 'I' as any }] }; }
const tends = (cb: Combat) => fx(cb, 'calm').filter((e) => e.way === 'tend').length;

describe('tending others: every cleanse, stim and shield given to an ally counts (section 3.3)', () => {
  it('a perk or class move\'s generic cleanse on an ally: −1 Strain, the first only', () => {
    Object.assign(PERK, TEST_PERKS);
    const f = rig(['12,5'], ['4,5']); const ally = f.pcs[1]; givePerk(f, 'test_wash');
    me(f).mg!.strain = 3; f.unit(ally.id).conds = { shaken: 2 } as any;
    A(f, { type: 'combat/perk', id: 'test_wash', actionId: 'wash', targetId: ally.id });
    expect(condOn(f.unit(ally.id), 'shaken')).toBe(false); expect(me(f).mg!.strain).toBe(2); expect(tends(f.cb)).toBe(1);
    f.unit(ally.id).conds = { shaken: 2 } as any;
    A(f, { type: 'combat/perk', id: 'test_wash', actionId: 'wash', targetId: ally.id }); expect(me(f).mg!.strain).toBe(2);
  });
  it('a cleanse with nothing to wash off is not tending', () => {
    Object.assign(PERK, TEST_PERKS);
    const f = rig(['12,5'], ['4,5']); const ally = f.pcs[1]; givePerk(f, 'test_wash');
    me(f).mg!.strain = 3; f.unit(ally.id).conds = {} as any;
    A(f, { type: 'combat/perk', id: 'test_wash', actionId: 'wash', targetId: ally.id }); expect(me(f).mg!.strain).toBe(3); expect(tends(f.cb)).toBe(0);
  });
  it('a generic shield on an ally: −1 Strain', () => {
    Object.assign(PERK, TEST_PERKS);
    const f = rig(['12,5'], ['4,5']); const ally = f.pcs[1]; givePerk(f, 'test_ward');
    me(f).mg!.strain = 3;
    A(f, { type: 'combat/perk', id: 'test_ward', actionId: 'ward', targetId: ally.id });
    expect(f.unit(ally.id).shield).toBe(20); expect(me(f).mg!.strain).toBe(2); expect(tends(f.cb)).toBe(1);
  });
  it('a prayed Blessing that cleanses an ally: −1 Strain', () => {
    (PATRON as any).test_patron = TEST_PATRON;
    const f = rig(['12,5'], ['4,5']); const ally = f.pcs[1], c = charOf(f, f.pc);
    c.patron = 'test_patron'; c.skills.faith = 10; me(f).mg!.strain = 3; f.unit(ally.id).conds = { shaken: 2 } as any; f.unit(ally.id).hp = 500;
    A(f, { type: 'combat/pray', choice: 'test_absolve', targetId: ally.id });
    expect(logHas(f.cb, /Test Absolve/)).toBe(true); expect(condOn(f.unit(ally.id), 'shaken')).toBe(false);
    expect(me(f).mg!.strain).toBe(2); expect(tends(f.cb)).toBe(1);
  });
  it('a stim given to an ally (combat/stim), even at full HP: −1 Strain; a stim that revives counts too', () => {
    const f = rig(['12,5'], ['4,5']); const ally = f.pcs[1]; charOf(f, f.pc).stims = 3; me(f).mg!.strain = 3;
    A(f, { type: 'combat/stim', targetId: ally.id }); expect(charOf(f, f.pc).stims).toBe(2); expect(me(f).mg!.strain).toBe(2); expect(tends(f.cb)).toBe(1);
    const g = rig(['12,5'], ['4,5']); const al2 = g.pcs[1]; charOf(g, g.pc).stims = 3; me(g).mg!.strain = 3;
    Object.assign(g.unit(al2.id), { hp: 0, downed: true, saves: { ok: 0, fail: 0 } });
    A(g, { type: 'combat/stim', targetId: al2.id }); expect(g.unit(al2.id).downed).toBe(false); expect(me(g).mg!.strain).toBe(2);
  });
  it('tending yourself or a foe is not tending others', () => {
    Object.assign(PERK, TEST_PERKS);
    const f = rig(['4,5']); givePerk(f, 'test_ward'); me(f).mg!.strain = 3;
    A(f, { type: 'combat/perk', id: 'test_ward', actionId: 'ward', targetId: f.pc.id }); expect(me(f).mg!.strain).toBe(3);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('tones, schools and modules from Heart plates (section 5; spec 4.4, item 546)', () => {
  const plate = (note: string, qty = 1) => ({ id: 'heart_plate', item: 'heart_plate', name: 'Heart plate', qty, kind: 'med', note } as any);
  const learner = (pack: any[]) => { const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const c = s.g.characters[s.chars[0].id]; c.pack = pack; c.soulKnown = { schools: ['damage'], modules: [], tones: [] }; return { s, id: c.id, c: () => s.g.characters[c.id] }; };
  it('magic/learn from a Heart plate teaches its tone; the plate crumbles', () => {
    const z = learner([plate('fire', 2)]);
    z.s.act({ type: 'magic/learn', charId: z.id, tone: 'fire', from: 'plate' });
    expect(z.c().soulKnown!.tones).toContain('fire'); expect(z.c().pack!.find((x: any) => x.item === 'heart_plate')!.qty).toBe(1);
    expect(z.s.g.story.entries.some((e: any) => /learns the Fire tone of Outbursts \(from a Heart plate\)/.test(e.text))).toBe(true);
  });
  it('a school or a module from a plate ("school:control", "Wave module" read as their ids)', () => {
    const a = learner([plate('school:control')]); a.s.act({ type: 'magic/learn', charId: a.id, school: 'control', from: 'plate' });
    expect(a.c().soulKnown!.schools).toContain('control'); expect(a.c().pack!.some((x: any) => x.item === 'heart_plate')).toBe(false);
    const b = learner([plate('Wave module')]); b.c().skills.lore_master = 0;
    expect(() => b.s.act({ type: 'magic/learn', charId: b.id, module: 'wave', from: 'plate' })).toThrow(/Lore Master 2/); // rules 1.8: gates (item 811)
    b.c().skills.lore_master = 2; b.s.act({ type: 'magic/learn', charId: b.id, module: 'wave', from: 'plate' });
    expect(b.c().soulKnown!.modules).toContain('wave');
  });
  it('refused without the plate, for a known lesson (the plate is kept), or for a Sigil word without a Sigil plate', () => {
    const a = learner([plate('frost')]);
    expect(() => a.s.act({ type: 'magic/learn', charId: a.id, tone: 'fire', from: 'plate' })).toThrow(/no Heart plate with that lesson/);
    a.c().soulKnown!.tones = ['frost'];
    expect(() => a.s.act({ type: 'magic/learn', charId: a.id, tone: 'frost', from: 'plate' })).toThrow(/knows that already/); expect(a.c().pack![0].qty).toBe(1);
    expect(() => a.s.act({ type: 'magic/learn', charId: a.id, word: 'fire', from: 'plate' })).toThrow(/no plate with that word/);
    expect(() => a.s.act({ type: 'magic/learn', charId: a.id, from: 'plate' } as any)).toThrow(/A plate teaches/);
  });
  it('the Narrator\'s loot carries a plate\'s lesson in note', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const id = s.chars[0].id;
    s.act({ type: 'narrator/turn', turn: { narration: 'A slate in the rubble.', loot: [{ charId: id, item: 'heart_plate', qty: 1, note: 'storm' }, { charId: id, item: 'sigil_plate', qty: 1, note: 'ward' }] } } as any);
    const pack = s.g.characters[id].pack!;
    expect(pack.find((x: any) => x.item === 'heart_plate')).toMatchObject({ note: 'storm', name: 'Heart plate (STORM)' });
    expect(pack.find((x: any) => x.item === 'sigil_plate')).toMatchObject({ note: 'ward' });
    s.g.characters[id].soulKnown = { schools: ['damage'], modules: [], tones: [] };
    s.act({ type: 'magic/learn', charId: id, tone: 'storm', from: 'plate' }); expect(s.g.characters[id].soulKnown!.tones).toContain('storm');
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the preview lists everyone a release would reach, past its area too (section 7)', () => {
  const ids = (p: any, via?: string) => p.affected.filter((a: any) => !via || a.via === via).map((a: any) => a.unit);
  it('Storm at stage 2: the chain target, at half, with its expected number; the release then hits exactly them', () => {
    const f = rig(['6,5', '7,6', '11,5']); const d = give(f.pc, { tone: 'storm' }); const [a, b, c] = f.foes;
    const p = withG(f, () => previewOutburstPlan(f.cb, me(f), d, '6,5', { stage: 2 }));
    expect(ids(p, 'area')).toEqual([a.id]); expect(ids(p, 'chain')).toEqual([b.id]); expect(ids(p)).not.toContain(c.id);
    const chain = p.affected.find((x: any) => x.via === 'chain')!;
    expect(chain).toMatchObject({ enemy: true, roll: null, dmg: Math.floor(20 * 1.6 * 0.5) }); expect(chain.rider).toMatch(/chains from/);
    begin(f, d); pump(f, 2); release(f, '6,5');
    expect(lost(f.unit(b.id))).toBe(chain.dmgAfterArmour); expect(lost(f.unit(c.id))).toBe(0);
  });
  it('Storm at stage 4: two chains, and Shaken with its save on each', () => {
    const f = rig(['6,5', '7,6', '8,7']); const d = give(f.pc, { tone: 'storm' });
    const p = withG(f, () => previewOutburstPlan(f.cb, me(f), d, '6,5', { stage: 4 }));
    expect(ids(p, 'chain')).toEqual([f.foes[1].id, f.foes[2].id]);
    expect(p.affected.find((x: any) => x.via === 'chain')!.saves.map((s: any) => s.cond)).toEqual(['shaken']);
  });
  it('Fire at stage 4: the foes beside the target catch Burning (spread)', () => {
    const f = rig(['6,5', '6,6', '10,5']); const d = give(f.pc, { tone: 'fire' });
    const p = withG(f, () => previewOutburstPlan(f.cb, me(f), d, '6,5', { stage: 4 }));
    expect(ids(p, 'spread')).toEqual([f.foes[1].id]); expect(p.affected.find((x: any) => x.via === 'spread')!.rider).toMatch(/Burning 2 rounds \(spreads from/);
    const s2 = withG(f, () => previewOutburstPlan(f.cb, me(f), d, '6,5', { stage: 3 })); expect(ids(s2, 'spread')).toEqual([]);
  });
  it('Gale at stage 4: everyone within 1 of the target, an ally too, marked as pushed', () => {
    const f = rig(['6,5', '7,5'], ['6,4']); const d = give(f.pc, { tone: 'gale' }); const ally = f.pcs[1];
    const p = withG(f, () => previewOutburstPlan(f.cb, me(f), d, '6,5', { stage: 4 }));
    expect(ids(p, 'push').sort()).toEqual([f.foes[1].id, ally.id].sort());
    expect(p.affected.find((x: any) => x.unit === ally.id)).toMatchObject({ ally: true, via: 'push' });
  });
  it('Storm Front: the two arcs with their numbers and rolls, on a snap preview with the toggle and on the held release', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul', classId: 'channeler', level: 5, skills: { [SIG('channeler')[0]]: 5, [SIG('channeler')[1]]: 4, [SIG('channeler')[2]]: 4 } }], [{}, {}, {}, {}]);
    const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = [];
    for (const x of cb.units) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.hidden = false; }
    Object.assign(f.pc.mg!, { emanator: true, mp: 999, mpMax: 999, soulMult: 1, soulBase: 20, will: 0, soulRange: 0, strain: 0, strainLimit: 20, freePumps: 0, freePumpsMax: 0 });
    const u = f.turn(f.pc); u.ap = 9; f.unit(u.id).pos = '2,2'; const [a, b, c, far] = f.foes; f.unit(a.id).pos = '6,2'; f.unit(b.id).pos = '7,2'; f.unit(c.id).pos = '6,3'; f.unit(far.id).pos = '12,8';
    const d = give(f.unit(u.id), {}), mods = ['class:channeler.storm_front#storm'];
    const no = withG(f, () => previewOutburstPlan(f.cb, f.unit(u.id), d, '6,2')); expect(ids(no, 'arc')).toEqual([]);
    const p = withG(f, () => previewOutburstPlan(f.cb, f.unit(u.id), d, '6,2', { mods }));
    expect(ids(p, 'arc').sort()).toEqual([b.id, c.id].sort()); expect(p.affected.find((x: any) => x.via === 'arc')!.roll).not.toBeNull();
    f.act({ type: 'combat/outburst', unitId: u.id, design: d, mods } as any);
    const h = withG(f, () => previewOutburstPlan(f.cb, f.unit(u.id), 'held', '6,2')); expect(ids(h, 'arc').sort()).toEqual([b.id, c.id].sort());
    expect(ids(h)).not.toContain(far.id);
  });
});
