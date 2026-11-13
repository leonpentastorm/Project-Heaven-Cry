// Soul magic, rules revision 1.8 (Outburst 4.0, accepted direction 9 Nov 2026; docs/design/outburst-4.0-spec.md): feelings
// poured in live, residue, Revert Pump, the new modules and their gates, practice and picks, Visualization out of Soul
// magic, the low-level changes. Every rule through apply() where a player takes it; triggers through the engine's own
// paths (damage, heals, Overreach, travel).
import { describe, expect, it } from 'vitest';
import {
  d20, stageMult, apply, newCharacter, FEELINGS, FEELING, feelDelta, practiceOf, picksAt, nextPickAt, soulPicksLeft, masteryPractice,
  applyDamage, healUnit, heldMult, previewOutburstPlan, newGame, ARCHETYPES, type Combat, type Unit, type OutburstDesign,
} from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

function calmSeed(n = 60): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calmSeed();
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));

/** A Soul caster at 3,5 on its turn (as outburst20's rig): Soul ×1, Healing ×1, reach 4, Strain limit 20, 9999 MP, 60 AP,
 * every feeling known; foes and allies at the tiles given, 500 HP, no armour, Defense −99, saves −99. */
function rig(foes: string[] = ['6,5'], allies: string[] = [], o: { first?: boolean } = {}) {
  const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' }, ...allies.map(() => ({ archetype: 'stormcaller', kit: 'soul' }))], foes.map(() => ({ tier: 'minion' })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pcs.forEach((p, i) => { p.pos = i ? allies[i - 1] : '3,5'; });
  f.foes.forEach((e, i) => { e.pos = foes[i]; });
  for (const x of [...f.pcs, ...f.foes]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.sv = { body: -99, brain: -99, heart: -99 } as any; x.hidden = false; (x as any).healRecv = 1; }
  for (const p of f.pcs) {
    Object.assign(p.mg!, { emanator: true, mp: 9999, mpMax: 9999, soulMult: 1, soulBoon: 1, deal: 1, soulBase: 20, healMult: 1, will: 0, soulRange: 0, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, firstUsed: !o.first, feelings: FEELINGS.map((x) => x.id), debuff: { body: 0, brain: 0, heart: 0 } });
    p.sk = {}; p.dbf = {};
  }
  const u = f.turn(f.pc); u.ap = 60;
  f.g.rng.state = SEED;
  return f;
}
type F = ReturnType<typeof rig>;
function give(u: Unit, d: Partial<OutburstDesign>): string { const id = 'd' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: [], ...d } as OutburstDesign); return id; }
const A = (f: F, a: Record<string, any>, u: Unit = f.pc) => f.act({ unitId: u.id, ...a } as any);
const begin = (f: F, design: string, u: Unit = f.pc, o: Record<string, any> = {}) => A(f, { type: 'combat/outburst', design, ...o }, u);
const pump = (f: F, feeling?: string, u: Unit = f.pc) => A(f, { type: 'combat/pump', ...(feeling ? { feeling } : {}) }, u);
const release = (f: F, aim?: string, u: Unit = f.pc) => A(f, { type: 'combat/release', ...(aim ? { aim } : {}) }, u);
const lost = (u: Unit) => 500 - u.hp;
const me = (f: F) => f.unit(f.pc.id);
const charOf = (f: F) => f.g.characters[f.pc.charId!];

describe('the stage table and the free first Pump (rules 1.8, sections 2 and 6)', () => {
  it('stage 0 is ×0.8: a snap cast deals 20 × 0.8', () => {
    expect(stageMult(0)).toBe(0.8);
    const f = rig(); const d = give(f.pc, {}); begin(f, d, f.pc, { aim: '6,5' }); expect(lost(f.foe)).toBe(16);
  });
  it('the first Pump each fight is free (before Empathy\'s); the second costs 1 AP; it does not come back next turn', () => {
    const f = rig(['6,5'], [], { first: true }); const d = give(f.pc, {});
    begin(f, d); expect(me(f).ap).toBe(58);
    pump(f); expect(me(f).ap).toBe(58); expect(logHas(f.cb, /the fight's free first Pump/)).toBe(true);
    pump(f); expect(me(f).ap).toBe(57);
    A(f, { type: 'combat/letgo' }); f.turn(f.pc); me(f).ap = 60; begin(f, d); pump(f); expect(me(f).ap).toBe(57);
  });
});

describe('feelings poured in (section 3; steps and behaviours as rules 1.19 set them)', () => {
  it('a feeling pump adds its own step instead of the plain +0.2; Rage is +0.5 and 1 Strain at the pump; each feeling goes in once', () => {
    const f = rig(); const d = give(f.pc, { modules: ['at_once'] }); begin(f, d); const s0 = me(f).mg!.strain;
    pump(f, 'rage'); expect(me(f).mg!.strain).toBe(s0 + 1); expect(heldMult(f.cb, me(f), me(f).mg!.held)).toBe(1.3);
    expect(fx(f.cb, 'pump').at(-1)).toMatchObject({ feeling: 'rage', family: 'wild', step: 0.5, mult: 1.3 });
    expect(() => pump(f, 'rage')).toThrow(/already in this Outburst/);
    pump(f, 'shame'); pump(f); expect(me(f).mg!.held!.felt).toEqual(['rage', 'shame']);
    release(f, '6,5'); expect(fx(f.cb, 'release').at(-1).mult).toBe(2); expect(lost(f.foe)).toBe(Math.floor(20 * 2 * 0.8)); // 1.4 + 0.3 + 0.3; At Once ×0.8
  });
  it('a feeling you haven\'t felt can\'t be poured in; an unknown one is refused', () => {
    const f = rig(); me(f).mg!.feelings = ['rage']; const d = give(f.pc, {}); begin(f, d);
    expect(() => pump(f, 'grief')).toThrow(/haven't felt Grief/); expect(() => pump(f, 'bliss')).toThrow(/No such feeling/);
  });
  it('Love on a Damage Burst heals the allies inside and spares them; the counter reads "now HEALS"', () => {
    const f = rig(['6,5'], ['6,6']); const ally = f.pcs[1]; ally.hp = 400;
    const d = give(f.pc, { modules: ['burst'] }); begin(f, d); pump(f, 'love');
    expect(fx(f.cb, 'pump').at(-1).does).toBe('now HEALS');
    release(f, '6,5');
    expect(lost(f.foe)).toBe(Math.floor(20 * 1.1 * 0.7)); expect(f.unit(ally.id).hp).toBe(400 + Math.floor(11.3 * 1.1 * 0.25)); // Love's step +0.3; the ally heals ×0.25 of the Buff school's heal at that multiplier (rules 1.36: 11.3)
  });
  it('Joy no longer chains: a Bolt is a critical from 18 up. Calm no longer lands by itself: two rolls, the better kept, at −0.4, and no critical', () => {
    const f = rig(['6,5', '7,6']); const d = give(f.pc, { modules: ['at_once'] }); begin(f, d); pump(f, 'joy'); release(f, '6,5');
    expect(lost(f.foes[1])).toBe(0); expect(lost(f.foes[0])).toBe(Math.floor(20 * 1.1 * 0.8));
    // Joy: find a seed whose roll is 18 or 19 and see the critical
    let crit = 0, plain = 0;
    for (let s = 1; s <= 60; s++) { const g = rig(); const e = give(g.pc, {}); begin(g, e); pump(g, 'joy'); g.g.rng.state = s * 7919; release(g, '6,5'); const m = /d20 (\d+)(, CRITICAL)?/.exec(g.cb.log.join('\n').split('releases').pop()!); if (!m) continue; if (+m[1] >= 18) { expect(m[2]).toBeTruthy(); crit++; } else { expect(m[2]).toBeFalsy(); plain++; } }
    expect(crit).toBeGreaterThan(0); expect(plain).toBeGreaterThan(0);
    // Calm: two dice in the log, the better one kept, never a critical; the multiplier went DOWN
    const g = rig(); const e = give(g.pc, {}); begin(g, e); pump(g, 'calm'); expect(heldMult(g.cb, me(g), me(g).mg!.held)).toBe(0.4); release(g, '6,5');
    const m = /d20 (\d+) and (\d+), Calm keeps (\d+)/.exec(g.cb.log.join('\n'))!; expect(m).toBeTruthy(); expect(+m[3]).toBe(Math.max(+m[1], +m[2]));
    expect(logHas(g.cb, /CRITICAL/)).toBe(false); expect(lost(g.foe)).toBe(Math.floor(20 * 0.4));
    const h = rig(); h.foe.def = 99; const k = give(h.pc, {}); begin(h, k); pump(h, 'calm'); h.g.rng.state = 5; release(h, '6,5');
    if (!/d20 \d+ and \d+, Calm keeps 20/.test(h.cb.log.join('\n'))) expect(lost(h.foe)).toBe(0); // it can miss now
    // the preview shows the better-of-two chance
    const q = rig(); q.foe.def = 8; const dq = give(q.pc, {}); begin(q, dq); const p0 = withGame(q.g, () => previewOutburstPlan(q.cb, me(q), 'held', '6,5')).affected[0].roll!.pct; pump(q, 'calm');
    const p1 = withGame(q.g, () => previewOutburstPlan(q.cb, me(q), 'held', '6,5')).affected[0].roll!.pct; expect(p1).toBeCloseTo(100 * (1 - (1 - p0 / 100) ** 2), 0); expect(p1).toBeGreaterThan(p0);
  });
  it('Spite: +0.5 against whoever last hurt you, the plain +0.2 against anyone else', () => {
    const f = rig(['6,5', '6,7']); (me(f) as any).feelHurtBy = f.foes[1].id;
    expect(feelDelta(f.cb, me(f), ['spite'], 1, f.foes[1])).toBe(0.3); expect(feelDelta(f.cb, me(f), ['spite'], 1, f.foes[0])).toBe(0);
  });
  it('Grief, Despair, Loneliness and Belonging read the moment; Pride is a flat +0.6', () => {
    const f = rig(['6,5'], ['3,6', '4,5', '2,5']);
    expect(feelDelta(f.cb, me(f), ['pride'], 4, null)).toBe(0.4); expect(feelDelta(f.cb, me(f), ['pride'], 1, null)).toBe(0.4);
    expect(feelDelta(f.cb, me(f), ['belonging'], 1, null)).toBe(0.3); // 3 allies within 3: +0.5
    expect(feelDelta(f.cb, me(f), ['despair'], 1, null)).toBe(0); me(f).hp = 250; expect(feelDelta(f.cb, me(f), ['despair'], 1, null)).toBe(0.2); // half HP missing: +0.4
    expect(feelDelta(f.cb, me(f), ['loneliness'], 1, null)).toBe(0); // allies near: the plain +0.2
    expect(feelDelta(f.cb, me(f), ['grief'], 1, null)).toBe(0); f.pcs[1].downed = true; expect(feelDelta(f.cb, me(f), ['grief'], 1, null)).toBe(0.3); // an ally has fallen: +0.5
    const g = rig(); expect(feelDelta(g.cb, me(g), ['loneliness'], 1, null)).toBe(0.2); // alone: +0.4
  });
  it('behaviours on the targets hit: Cruelty bleeds and spreads, Contempt scorns, Awe staggers, Dread takes the reaction, Guilt Taunts; Grief no longer Slows and Longing no longer pulls', () => {
    const f = rig(['6,5', '7,5']); const d = give(f.pc, { modules: ['at_once'] }); begin(f, d);
    for (const x of ['grief', 'cruelty', 'contempt', 'awe']) pump(f, x);
    release(f, '6,5'); const t = f.foes[0];
    expect(t.conds?.slowed || 0).toBe(0); expect(t.bleed).toBeGreaterThan(0); expect(f.foes[1].bleed).toBeGreaterThan(0);
    expect(t.conds?.scorned).toBeGreaterThan(0); expect(t.apDebt).toBe(1);
    const g = rig(); const e = give(g.pc, { modules: ['at_once'] }); begin(g, e); pump(g, 'guilt'); pump(g, 'dread'); release(g, '6,5');
    expect(g.foe.conds?.taunted).toBeGreaterThan(0); expect(g.foe.condBy?.taunted).toBe(g.pc.id); expect(logHas(g.cb, /loses its reaction \(Dread\)/)).toBe(true);
    const h = rig(['7,5']); const k = give(h.pc, { modules: ['at_once'] }); begin(h, k); pump(h, 'longing'); release(h, '7,5'); expect(h.foe.pos).toBe('7,5');
  });
  it('Fear throws YOU 2 tiles back from where you aimed; the target is not pushed and not Shaken', () => {
    const g = rig(); const e = give(g.pc, { modules: ['at_once'] }); begin(g, e); pump(g, 'fear'); release(g, '6,5');
    expect(g.foe.pos).toBe('6,5'); expect(g.foe.conds?.shaken || 0).toBe(0); expect(me(g).pos).toBe('1,5'); expect(logHas(g.cb, /\(Fear\)/)).toBe(true);
  });
  it('Longing adds 2 reach at the release', () => {
    const f = rig(['9,5']); const d = give(f.pc, { modules: ['at_once'] }); begin(f, d);
    expect(() => release(f, '9,5')).toThrow(/Out of reach/); pump(f, 'longing'); release(f, '9,5'); expect(lost(f.foe)).toBeGreaterThan(0);
  });
  it('Defiance: saves against the release are 4 harder (not gone), and your next save passes; Mercy talks a beaten foe down', () => {
    const f = rig(); f.foe.sv = { body: 99, brain: 99, heart: 99 } as any;
    const d = give(f.pc, { school: 'status', option: 'shaken' }); begin(f, d); pump(f, 'defiance'); release(f, '6,5');
    expect(f.foe.conds?.shaken || 0).toBe(0); expect((me(f) as any).feelSaveNext).toBe(true); // a sure save still saves
    const q = rig(); const dq = give(q.pc, { school: 'status', option: 'shaken' }); begin(q, dq);
    const tn0 = withGame(q.g, () => previewOutburstPlan(q.cb, me(q), 'held', '6,5')).affected[0].saves[0].tn; pump(q, 'defiance');
    expect(withGame(q.g, () => previewOutburstPlan(q.cb, me(q), 'held', '6,5')).affected[0].saves[0].tn).toBe(tn0 + 4);
    q.foe.sv = { body: 0, brain: 0, heart: 0 } as any; release(q, '6,5'); expect(logHas(q.cb, new RegExp('vs ' + (tn0 + 4)))).toBe(true);
    const g = rig(); g.foe.hp = 100; const e = give(g.pc, { modules: ['at_once'] }); begin(g, e); pump(g, 'mercy'); release(g, '6,5');
    expect(g.foe.surrendered).toBe(true);
  });
  it('after the strike: Hope takes one harmful condition off each ally in the shape (the newest), Shame costs you 8, Relief takes 2 Strain off at −0.2, Pride costs 2 Strain unless someone goes down', () => {
    const f = rig(['6,5'], ['6,6']); f.pcs[1].conds = { fear: 2, slowed: 2 }; f.pcs[1].condAt = { fear: 1, slowed: 2 } as any;
    const d = give(f.pc, { modules: ['burst'] }); begin(f, d); pump(f, 'hope'); pump(f, 'shame'); const hp = me(f).hp; release(f, '6,5');
    expect(f.unit(f.pcs[1].id).conds?.slowed || 0).toBe(0); expect(f.unit(f.pcs[1].id).conds?.fear).toBeGreaterThan(0); expect(f.unit(f.pcs[1].id).conds?.hopeful || 0).toBe(0); expect(me(f).hp).toBe(hp - 8);
    const g = rig(); const e = give(g.pc, { modules: ['at_once'] }); begin(g, e); pump(g, 'rage'); pump(g, 'abandon'); pump(g, 'relief'); expect(me(g).mg!.strain).toBe(4);
    expect(heldMult(g.cb, me(g), me(g).mg!.held)).toBe(1.9); release(g, '6,5'); expect(me(g).mg!.strain).toBe(2); // 0.8 + 0.5 + 0.8 − 0.2
    const h = rig(); const k = give(h.pc, { modules: ['at_once'] }); begin(h, k); pump(h, 'pride'); expect(me(h).mg!.strain).toBe(1); release(h, '6,5'); expect(me(h).mg!.strain).toBe(3); expect(logHas(h.cb, /pride stings/)).toBe(true);
    const w = rig(); w.foe.hp = 5; const kw = give(w.pc, { modules: ['at_once'] }); begin(w, kw); pump(w, 'pride'); release(w, '6,5'); expect(me(w).mg!.strain).toBe(1); // it took the foe down: no Strain
  });
});

describe('the release preview counts feelings (section 7)', () => {
  it('previewOutburstPlan: the multiplier with the steps, Love\'s heal on an ally, the words and the residue tiles', () => {
    const f = rig(['6,5'], ['6,6']); const d = give(f.pc, { modules: ['burst'] }); begin(f, d); pump(f, 'love'); pump(f, 'rage');
    const p = withGame(f.g, () => previewOutburstPlan(f.cb, me(f), 'held', '6,5'));
    expect(p.mult).toBe(1.6); expect(p.felt).toEqual(['love', 'rage']); expect(p.does).toEqual(['now HEALS']);
    expect(p.residue).toMatchObject({ feeling: 'rage', kind: 'harms' }); expect(p.residue!.tiles.length).toBe(9);
    const ally = p.affected.find((x) => x.unit === f.pcs[1].id)!; expect(ally.heal).toBeGreaterThan(0); expect(ally.dmg).toBe(0);
    expect(p.affected.find((x) => x.unit === f.foe.id)!.dmg).toBe(Math.floor(20 * 1.6 * 0.7)); // 1.2 + (0.3 − 0.2) + (0.5 − 0.2)
  });
});

describe('Revert Pump (section 3.1, item 808)', () => {
  it('undoes the last pump: stage, feeling, AP, the free Pump and the Strain; again back to the start of the turn; not across turns', () => {
    const f = rig(['6,5'], [], { first: true }); const d = give(f.pc, {}); begin(f, d); const s0 = me(f).mg!.strain;
    pump(f); pump(f, 'rage'); expect(me(f).ap).toBe(57); expect(me(f).mg!.strain).toBe(s0 + 1);
    A(f, { type: 'combat/revert' }); expect(me(f).mg!.held!.stage).toBe(1); expect(me(f).mg!.held!.felt).toEqual([]); expect(me(f).ap).toBe(58); expect(me(f).mg!.strain).toBe(s0);
    A(f, { type: 'combat/revert' }); expect(me(f).mg!.held!.stage).toBe(0); expect(me(f).mg!.firstUsed).toBe(false);
    expect(() => A(f, { type: 'combat/revert' })).toThrow(/No pump to undo/);
    pump(f); A(f, { type: 'combat/end-turn' }); f.turn(f.pc); expect(() => A(f, { type: 'combat/revert' })).toThrow(/No pump to undo/);
  });
});

describe('residue (section 3.3, item 807)', () => {
  it('the strongest feeling (most pumps, ties to the latest) stays on the area for 2 rounds; harming residue hurts anyone who starts a turn there', () => {
    const f = rig(); const d = give(f.pc, { modules: ['at_once'] }); begin(f, d); pump(f, 'grief'); pump(f, 'rage'); release(f, '6,5');
    const z = (f.cb.zones || []).find((x: any) => x.kind === 'residue') as any; expect(z.feeling).toBe('rage'); expect(z.tiles).toEqual(['6,5']); expect(z.left).toBe(2);
    expect(fx(f.cb, 'residue').at(-1)).toMatchObject({ feeling: 'rage', kind: 'harms' });
    const hp = f.foe.hp; f.turn(f.foe); expect(f.unit(f.foe.id).hp).toBe(hp - 5);
  });
  it('helping residue works for the caster\'s side only: Love heals an ally 5, Joy +1 to rolls', () => {
    const f = rig(['8,8'], ['6,5']); f.pcs[1].hp = 400; const d = give(f.pc, { school: 'buff', option: 'defense' }); begin(f, d); pump(f, 'love'); release(f, '6,5');
    const z = (f.cb.zones || []).find((x: any) => x.kind === 'residue') as any; expect(z.feeling).toBe('love');
    const hp = f.unit(f.pcs[1].id).hp; f.turn(f.pcs[1]); expect(f.unit(f.pcs[1].id).hp).toBe(hp + 5);
  });
});

describe('the new modules (section 4)', () => {
  it('Split takes a second creature within 2 of the aim; Volley is 3 bolts at ×0.4; Return strikes twice, the second time at ×0.3 (rules 1.17)', () => {
    const f = rig(['6,5', '6,6']); const d = give(f.pc, { modules: ['split'] }); begin(f, d, f.pc, { aim: '6,5' });
    expect(lost(f.foes[0])).toBe(16); expect(lost(f.foes[1])).toBe(16);
    const g = rig(); const e = give(g.pc, { modules: ['volley'] }); begin(g, e, g.pc, { aim: '6,5' }); expect(lost(g.foe)).toBe(3 * Math.floor(20 * 0.8 * 0.4));
    const h = rig(); const k = give(h.pc, { modules: ['return'] }); begin(h, k, h.pc, { aim: '6,5' }); expect(lost(h.foe)).toBe(16 + Math.floor(16 * 0.3));
  });
  it('Bloom grows a Burst +1 radius a stage; Anchor pins; Lure pulls 2; Shell shields you', () => {
    const f = rig(['8,5']); const d = give(f.pc, { modules: ['burst', 'bloom'] }); begin(f, d); pump(f); pump(f); release(f, '6,5'); expect(lost(f.foe)).toBeGreaterThan(0);
    const g = rig(['6,5']); const e = give(g.pc, { modules: ['anchor', 'at_once'] }); begin(g, e, g.pc, { aim: '6,5' }); expect(g.foe.conds?.pinned).toBeGreaterThan(0);
    const h = rig(['7,5']); const k = give(h.pc, { modules: ['lure', 'at_once'] }); begin(h, k, h.pc, { aim: '7,5' }); expect(h.foe.pos).toBe('5,5');
    const i = rig(); const s = give(i.pc, { modules: ['shell'] }); begin(i, s, i.pc, { aim: '6,5' }); expect(me(i).shield).toBe(Math.floor(4 * 0.8)); // rules 1.20: 4 × the Soul multiplier × the stage multiplier (stage 0)
  });
  it('Quiet halves the hold\'s Strain (rounded down) and deals ×0.8', () => {
    const f = rig(); const d = give(f.pc, { modules: ['quiet', 'at_once'] }); begin(f, d); expect(me(f).mg!.strain).toBe(0);
    pump(f, 'abandon'); expect(me(f).mg!.strain).toBe(1); release(f, '6,5'); expect(lost(f.foe)).toBe(Math.floor(20 * (0.8 + 0.8) * 0.8 * 0.8)); // Abandon +0.8, Quiet ×0.8, At Once ×0.8
  });
  it('Fuse waits: it goes off when a creature steps into its area, or at your next turn start', () => {
    const f = rig(['8,5']); const d = give(f.pc, { modules: ['fuse', 'at_once'] }); begin(f, d, f.pc, { aim: '6,5' });
    expect(lost(f.foe)).toBe(0); expect((f.cb.zones || []).some((z: any) => z.kind === 'fuse')).toBe(true);
    f.turn(f.pc); expect(lost(f.foe)).toBe(0); expect((f.cb.zones || []).some((z: any) => z.kind === 'fuse')).toBe(false); expect(logHas(f.cb, /fused .* goes off/)).toBe(true);
  });
  it('Linger leaves a 2-round field; Silent keeps a Hidden caster hidden where a plain release reveals', () => {
    const f = rig(['6,5']); const d = give(f.pc, { modules: ['linger', 'at_once'] }); begin(f, d, f.pc, { aim: '6,5' });
    const hp = f.foe.hp; f.turn(f.foe); expect(f.unit(f.foe.id).hp).toBe(hp - 5);
    const g = rig(); me(g).hidden = true; const e = give(g.pc, { modules: ['silent'] }); begin(g, e, g.pc, { aim: '6,5' }); expect(me(g).hidden).toBe(true);
    const h = rig(); me(h).hidden = true; const k = give(h.pc, {}); begin(h, k, h.pc, { aim: '6,5' }); expect(me(h).hidden).toBe(false);
  });
  it('Thread: a Buff release threads two allies; the next heal on one heals the other as much', () => {
    const f = rig(['9,9'], ['5,5', '5,6']); const [, a, b] = f.pcs; a.hp = 400; b.hp = 400;
    const d = give(f.pc, { school: 'buff', option: 'defense', modules: ['burst', 'thread'] }); begin(f, d, f.pc, { aim: '5,5' });
    expect((f.unit(a.id) as any).thread).toBe(b.id);
    withGame(f.g, () => healUnit(f.cb, f.unit(a.id), 30, null, 'soul')); expect(f.unit(b.id).hp).toBe(430);
  });
});

describe('triggers unlock feelings (item 815)', () => {
  it('Rage from a heavy hit, Grief from an ally going Down, Love from tending an ally; a log line and fx felt', () => {
    const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' }, { archetype: 'stormcaller', kit: 'soul' }], [{}]); const [a, b] = f.pcs;
    expect(f.g.characters[a.charId!].feelings).toEqual(expect.arrayContaining(['rage', 'love'])); f.g.characters[a.charId!].feelings = [];
    withGame(f.g, () => applyDamage(f.cb, f.unit(a.id), Math.ceil(f.unit(a.id).maxHp * 0.3), { by: f.foe, type: 'weapon' } as any));
    expect(f.g.characters[a.charId!].feelings).toContain('rage'); expect(f.g.characters[a.charId!].feelings).toContain('spite');
    withGame(f.g, () => applyDamage(f.cb, f.unit(b.id), 99999, { by: f.foe, type: 'weapon', credit: 'all' } as any));
    expect(f.g.characters[a.charId!].feelings).toContain('grief');
    withGame(f.g, () => healUnit(f.cb, f.unit(b.id), 20, f.unit(a.id), 'stim'));
    expect(f.g.characters[a.charId!].feelings).toContain('love'); expect(f.g.characters[b.charId!].feelings).toContain('hope');
    expect(fx(f.cb, 'felt').some((e) => e.feeling === 'grief')).toBe(true); expect(logHas(f.cb, /has felt Grief/)).toBe(true);
  });
  it('Defiance and Abandon from Overreach; the Narrator grants a feeling; non-casters don\'t feel', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }, { archetype: 'sigilist', kit: 'sigil' }]); const [c, n] = s.chars; s.g.characters[c.id].skills.will_power = 5;
    s.act({ type: 'narrator/turn', turn: { narration: 'x', overreach: [{ charId: c.id, skill: 'will_power', push: 'more' }] } } as any);
    const o = s.g.overreach.at(-1)!; s.act({ type: 'overreach/choose', id: o.id, choice: 'indulge' } as any, c.owner);
    expect(s.g.characters[c.id].feelings).toContain('abandon');
    s.act({ type: 'narrator/turn', turn: { narration: 'y', magic: [{ charId: c.id, feeling: 'wonder', reason: 'the sky opened' }, { charId: n.id, feeling: 'awe' }] } } as any);
    expect(s.g.characters[c.id].feelings).toContain('wonder'); expect(s.g.characters[n.id].feelings || []).not.toContain('awe');
    expect(s.g.story.entries.some((e: any) => /has felt Wonder \(the sky opened\)/.test(e.text))).toBe(true);
  });
});

describe('practice, gates and picks (section 5)', () => {
  it('a release earns 1 + stages past 1 + feelings; picks at 5, 15, then every +15', () => {
    expect([0, 4, 5, 14, 15, 29, 30, 45].map(picksAt)).toEqual([0, 0, 1, 1, 2, 2, 3, 4]); expect(nextPickAt(5)).toBe(15); expect(nextPickAt(31)).toBe(45);
    const f = rig(); const c = charOf(f); c.soulPractice = 0; const d = give(f.pc, { modules: ['at_once'] }); begin(f, d); pump(f); pump(f, 'rage'); pump(f, 'love'); release(f, '6,5');
    expect(charOf(f).soulPractice).toBe(1 + 2 + 2); expect(fx(f.cb, 'practice').at(-1)).toMatchObject({ gain: 5, total: 5 });
  });
  it('Mastery adds +5 a level in each gate skill; Mastered gives a free pick from its own modules; picks respect the gates', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const c = s.g.characters[s.chars[0].id];
    c.skills = { ...c.skills, will_power: 3, lore_master: 1, empathy: 0, camaraderie: 0, implication: 0, composure: 0 }; c.soulPractice = 0;
    expect(masteryPractice(c)).toBe(5); expect(practiceOf(c)).toBe(5); expect(soulPicksLeft(c).practice).toBe(1);
    expect(() => s.act({ type: 'magic/pick', charId: c.id, module: 'fuse' } as any, c.owner)).toThrow(/Fuse needs Lore Master 4/);
    expect(() => s.act({ type: 'magic/pick', charId: c.id, module: 'echo' } as any, c.owner)).toThrow(/Heartfed/);
    s.act({ type: 'magic/pick', charId: c.id, module: 'quiet' } as any, c.owner);
    expect(s.g.characters[c.id].soulKnown!.modules).toContain('quiet'); expect(soulPicksLeft(s.g.characters[c.id]).practice).toBe(0);
    expect(() => s.act({ type: 'magic/pick', charId: c.id, module: 'size' } as any, c.owner)).toThrow(/No practice pick/);
    s.g.characters[c.id].skills.implication = 10;
    expect(() => s.act({ type: 'magic/pick', charId: c.id, module: 'swift', via: 'implication' } as any, c.owner)).toThrow(/not a Insinuation module/);
    s.act({ type: 'magic/pick', charId: c.id, module: 'anchor', via: 'implication' } as any, c.owner);
    expect(soulPicksLeft(s.g.characters[c.id]).mastered).toEqual([]);
  });
});

describe('Visualization out, low level in (sections 2 and 6)', () => {
  it('the first tone is free at Lore Master 1, not Visualization', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const c = s.g.characters[s.chars[0].id];
    c.outbursts = []; c.skills.visualization = 3; c.skills.lore_master = 0; c.soulKnown = { ...c.soulKnown!, tones: [] };
    expect(() => s.act({ type: 'magic/design', charId: c.id, design: { id: '', name: 'Hot', school: 'damage', modules: [], tone: 'fire' } } as any, c.owner)).toThrow(/Fire tone/);
    s.g.characters[c.id].skills.lore_master = 1;
    s.act({ type: 'magic/design', charId: c.id, design: { id: '', name: 'Hot', school: 'damage', modules: [], tone: 'fire' } } as any, c.owner);
    expect(s.g.characters[c.id].soulKnown!.tones).toEqual(['fire']);
  });
  it('a new caster: 3 designs, Damage, Buff and Control, Wave and Move, 2 feelings of their choice; at least 3 ready', () => {
    const s = storyWith([{ archetype: 'stormcaller', kit: 'soul' }]); const base = s.g.characters[s.chars[0].id];
    expect(base.outbursts!.length).toBe(3); expect(base.feelings).toEqual(['rage', 'love']);
    const sheet: any = { ...base, feelings: ['grief', 'joy'], outburst: { school: 'damage', modules: ['move'] } };
    const c = newCharacter('x', 'p', sheet); expect(c.feelings).toEqual(['grief', 'joy']); expect(c.outbursts![0].name).toBe('Damage Outburst');
    let g = s.g; expect(() => apply(g, { type: 'char/add', sheet: { ...sheet, feelings: ['grief', 'grief'] } } as any, 'host')).toThrow(/different feelings/);
  });
});

describe('the Proving Ground tools (section 8)', () => {
  it('grant any feeling (and take it back), add practice, unlock any module ignoring gates; magic/pick maps through', () => {
    let g = newGame('PROVE1', { id: 'h1', name: 'Host' }, 'seed-proving');
    const a = ARCHETYPES.find((x) => x.id === 'stormcaller')!;
    g = apply(g, { type: 'char/add', sheet: { name: 'Vel', portrait: '', origin: 'x', kit: 'soul', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any }, 'h1');
    g = apply(g, { type: 'sandbox/start' }, 'h1'); const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'sandbox/learn', charId: id, feeling: 'awe' } as any, 'h1'); expect(g.characters[id].feelings).toContain('awe');
    g = apply(g, { type: 'sandbox/learn', charId: id, feeling: 'awe', forget: true } as any, 'h1'); expect(g.characters[id].feelings).not.toContain('awe');
    g = apply(g, { type: 'sandbox/practice', charId: id, n: 20 } as any, 'h1'); expect(g.characters[id].soulPractice).toBe(20);
    g = apply(g, { type: 'sandbox/learn', charId: id, module: 'fuse' } as any, 'h1'); expect(g.characters[id].soulKnown!.modules).toContain('fuse');
    g = apply(g, { type: 'magic/pick', charId: id, module: 'volley' } as any, 'h1'); expect(g.characters[id].soulKnown!.modules).toContain('volley');
  });
});
