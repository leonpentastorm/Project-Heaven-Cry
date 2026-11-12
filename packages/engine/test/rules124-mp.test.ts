// Rules revision 1.24 (the MP rework; 12 Nov 2026; spec: "Rules revision 1.24"; docs/design/handoffs/mp-rework.md).
// What this file pins, each from a sentence of the spec:
//   the pool        Max MP = 100 + 75 × (Determination − 1) + 25 × (Insight − 1); Virtue gives none; 1,000 at both 10
//   a Pump's MP     a tenth of what the Begin cost, for each stage reached (10, 20, 30, 40%), 1 MP at least; a free
//                   Pump still owes it; a feeling Pump costs the same; Overdraw pays both stages; the swell and a fed
//                   glyph cost none; short of MP the Pump is refused; Revert gives it back; the meter does not move
//   who pays        a character's own heart with an Emanator in a hand; not a heart on the air, not an enemy caster
//   the Begin's     whatever changed the Begin's price is in the Pump's (thin air, Insight); a Begin that cost
//   price           nothing pumps for nothing
//   the preview     previewPump and the plan say the MP before anything is paid
//   old saves       an Emanator keeps its share of the pool (full stays full), once; a fight in progress follows
//   archetypes      every preset is legal; the seven re-spread ones; no caster preset leans on Virtue for MP
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import {
  maxMp, maxMpOld, MP_BASE, MP_PER_DETERMINATION, MP_PER_INSIGHT, MP_REV, migrateCharacterMp, mpNow, magicOf,
  previewPump, previewOutburstPlan, pumpMp, pumpsMp, paysPumpMp, PUMP_MP_SHARE, SOUL_RULES, MAX_STAGE, FEELINGS, heartMagic, HEART_CASTERS,
  magicTurnStart, ARCHETYPES, SKILL, ATTRS, CLASS, BUDGET, apply,
  type Unit, type OutburstDesign, type Character,
} from '../src';
import attributesJ from '../../../data/attributes.json';
import rulesJ from '../../../data/rules.json';
import { fightWith, storyWith, withGame, type CharSpec } from './helpers/perkfight';

const SOUL = { archetype: 'stormcaller', kit: 'soul' } as const;
const OD = 'skill:will_power.3#overdraw';
/** A Soul caster at 3,5 on its turn with an Emanator in hand: no Insight saving, Normal air, 1,000 MP, Strain limit 20,
 * every feeling felt, no free Pump unless the test gives one. */
function heart(spec: CharSpec = {}) {
  const f = fightWith([{ ...SOUL, ...spec }], [{ tier: 'minion' }]);
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pc.pos = '3,5'; f.foe.pos = '6,5';
  for (const x of [f.pc, f.foe]) { x.hp = x.maxHp = 500; x.armour = 0; x.def = -99; x.hidden = false; }
  Object.assign(f.pc.mg!, { emanator: true, mp: 1000, mpMax: 1000, strain: 0, strainLimit: 20, costSave: 0, freePumps: 0, freePumpsMax: 0, freeUsed: 0, firstUsed: true, feelings: FEELINGS.map((x) => x.id) });
  const u = f.turn(f.pc); u.ap = 60;
  return f;
}
type F = ReturnType<typeof heart>;
/** A design of 30 MP in Normal air with no saving: Damage (20) with At Once (10). */
const give = (u: Unit, d: Partial<OutburstDesign> = {}): string => { const id = 'd' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test ' + id, school: 'damage', modules: ['at_once'], ...d } as OutburstDesign); return id; };
const A = (f: F, a: Record<string, any>) => f.act({ unitId: f.pc.id, ...a } as any);
const me = (f: F) => f.unit(f.pc.id);
const pv = (f: F, feeling?: string) => withGame(f.g, () => previewPump(f.cb, me(f), feeling));
const held = (f: F) => me(f).mg!.held!;
const char = (attrs: Record<string, number> = {}, o: Partial<Character> = {}): Character => { const s = storyWith([{ ...SOUL }]); const c = s.chars[0]; Object.assign(c.attrs, { insight: 1, determination: 1, virtue: 1, ...attrs }); Object.assign(c, o); return c; };

describe('rules 1.24: Max MP is Determination\'s and Insight\'s', () => {
  it('100 + 75 × (Determination − 1) + 25 × (Insight − 1): 100 with neither raised, 1,000 with both at 10', () => {
    expect([MP_BASE, MP_PER_DETERMINATION, MP_PER_INSIGHT]).toEqual([100, 75, 25]);
    expect(maxMp(char())).toBe(100);
    expect(maxMp(char({ determination: 2 }))).toBe(175); expect(maxMp(char({ insight: 2 }))).toBe(125);
    expect(maxMp(char({ determination: 4, insight: 4 }))).toBe(400);
    expect(maxMp(char({ determination: 10 }))).toBe(775); expect(maxMp(char({ insight: 10 }))).toBe(325);
    expect(maxMp(char({ determination: 10, insight: 10 }))).toBe(1000);
  });
  it('Virtue gives no MP: a build that only prays has the bare 100, and a caster needs no Virtue', () => {
    expect(maxMp(char({ virtue: 10 }))).toBe(100); expect(maxMpOld(char({ virtue: 10 }))).toBe(1000);
    expect(maxMp(char({ determination: 7, virtue: 1 }))).toBe(maxMp(char({ determination: 7, virtue: 7 })));
  });
  it('the data says the same, and says it is provisional', () => {
    const der = (id: string) => (attributesJ as any).items.find((a: any) => a.id === id).derived as any[];
    expect(der('virtue').some((d) => d.stat === 'mp_max')).toBe(false);
    expect(der('determination').find((d) => d.stat === 'mp_max')).toMatchObject({ per_point_above_1: 75, provisional: true });
    expect(der('insight').find((d) => d.stat === 'mp_max')).toMatchObject({ per_point_above_1: 25, provisional: true });
    expect((rulesJ as any).derived.magic.max_mp).toMatch(/^100 \+ 75\*\(determination-1\) \+ 25\*\(insight-1\)/);
    expect((SOUL_RULES as any).cycle.pump_mp).toMatchObject({ share_per_stage: 0.1, provisional: true }); expect(PUMP_MP_SHARE).toBe(0.1);
  });
  it('no Emanator, no MP (unchanged); a rest and a new session fill the new pool', () => {
    const s = storyWith([{ ...SOUL }]); const c = s.chars[0]; expect(mpNow(c)).toBe(maxMp(c));
    c.mp = 5; const g = s.act({ type: 'session/next' } as any); expect(g.characters[c.id].mp).toBe(maxMp(g.characters[c.id]));
    const m = magicOf(g.characters[c.id])!; expect(m.mpMax).toBe(maxMp(g.characters[c.id])); expect(m.mp).toBe(m.mpMax);
  });
});

describe('rules 1.24: a Pump costs MP', () => {
  it('a tenth of the Begin\'s price for each stage reached: 3, 6, 9 and 12 on a 30 MP design; a full heart costs the Begin again', () => {
    const f = heart(), d = give(f.pc); A(f, { type: 'combat/outburst', design: d, hold: true });
    expect(held(f).cost).toBe(30); expect(me(f).mg!.mp).toBe(970);
    const paid: number[] = [];
    for (let s = 1; s <= MAX_STAGE; s++) { const p = pv(f); expect(p).toMatchObject({ ok: true, ap: 1, stage: s }); const was = me(f).mg!.mp; A(f, { type: 'combat/pump' }); paid.push(was - me(f).mg!.mp); expect(paid[s - 1]).toBe(p.mp); }
    expect(paid).toEqual([3, 6, 9, 12]); expect(paid.reduce((a, b) => a + b, 0)).toBe(held(f).cost);
    expect(held(f).pumpMp).toBe(30); expect(me(f).mg!.mp).toBe(940);
    expect(f.cb.log.some((l: string) => /pumps the heart: .* at stage 4 \(×1\.6\), 12 MP\./.test(l))).toBe(true);
    expect((f.cb.fx || []).filter((e: any) => e.k === 'pump').map((e: any) => e.mp)).toEqual([3, 6, 9, 12]);
  });
  it('the helpers the screens and the policies read give the same numbers', () => {
    const f = heart(), d = give(f.pc), u = me(f);
    expect(paysPumpMp(u)).toBe(true);
    expect([0, 1, 2, 3].map((s) => pumpMp(u, s, 1, 1, 30))).toEqual([3, 6, 9, 12]); expect(pumpMp(u, 0, 2, 1, 30)).toBe(9); expect(pumpsMp(u, 4, 0, 30)).toBe(30);
    expect(pumpMp(u, 4, 1, 1, 30)).toBe(0); // nothing above stage 4
    expect(pumpMp(u, 0, 1, 1, 5)).toBe(1); expect(pumpMp(u, 0, 1, 1, 0)).toBe(0); // 1 MP at least, unless the Begin cost none
    const pl = withGame(f.g, () => previewOutburstPlan(f.cb, u, d, '6,5', { stage: 2 })); expect(pl.mp).toBe(30 + 3 + 6);
  });
  it('a free Pump is free of AP only: its MP is still owed', () => {
    const f = heart(), d = give(f.pc); A(f, { type: 'combat/outburst', design: d, hold: true });
    me(f).mg!.freePumps = 1; me(f).mg!.freePumpsMax = 1;
    expect(pv(f)).toMatchObject({ ok: true, ap: 0, free: true, mp: 3 });
    const ap = me(f).ap; A(f, { type: 'combat/pump' }); expect(me(f).ap).toBe(ap); expect(me(f).mg!.mp).toBe(967);
    me(f).mg!.firstUsed = false; me(f).mg!.freeUsed = 0; // the fight's free first Pump too
    expect(pv(f)).toMatchObject({ ok: true, ap: 0, freeKind: 'first', mp: 6 });
  });
  it('a feeling Pump costs the same MP as a plain one', () => {
    const f = heart(), d = give(f.pc); A(f, { type: 'combat/outburst', design: d, hold: true });
    for (const feel of ['rage', 'love', 'calm', 'abandon']) expect(pv(f, feel).mp).toBe(pv(f).mp);
    A(f, { type: 'combat/pump', feeling: 'rage' }); expect(me(f).mg!.mp).toBe(967); expect(held(f).felt).toEqual(['rage']);
  });
  it('Overdraw adds two stages and pays for both', () => {
    const f = heart(), d = give(f.pc); A(f, { type: 'combat/outburst', design: d, hold: true });
    f.cb.mods = [OD]; const p = pv(f); delete (f.cb as any).mods;
    expect(p).toMatchObject({ ok: true, stage: 2, mp: 9 }); // 10% + 20% of 30
    A(f, { type: 'combat/pump', mods: [OD] }); expect(held(f).stage).toBe(2); expect(me(f).mg!.mp).toBe(961); expect(held(f).pumpMp).toBe(9);
    A(f, { type: 'combat/revert' }); expect(held(f).stage).toBe(0); expect(me(f).mg!.mp).toBe(970); expect(held(f).pumpMp).toBe(0);
  });
  it('short of MP the Pump is refused, with the reason, and nothing changes; Release still works', () => {
    const f = heart(), d = give(f.pc); A(f, { type: 'combat/outburst', design: d, hold: true }); A(f, { type: 'combat/pump' });
    me(f).mg!.mp = 5;
    const p = pv(f); expect(p).toMatchObject({ ok: false, mp: 6, stage: 1 }); expect(p.why).toBe('A Pump to stage 2 needs 6 MP (5): Syphon first, or Release what you hold.');
    const ap = me(f).ap; expect(() => A(f, { type: 'combat/pump' })).toThrow(/needs 6 MP/);
    expect(held(f).stage).toBe(1); expect(me(f).mg!.mp).toBe(5); expect(me(f).ap).toBe(ap);
    const pl = withGame(f.g, () => previewOutburstPlan(f.cb, me(f), 'held', '6,5')); expect(pl.ok).toBe(true); expect(pl.mp).toBe(0);
    expect(withGame(f.g, () => previewOutburstPlan(f.cb, me(f), 'held', '6,5', { stage: 3 })).why).toBe('The Pumps need 15 MP (5).');
    A(f, { type: 'combat/release', aim: '6,5' }); expect(me(f).mg!.held).toBeNull();
  });
  it('Revert Pump gives the MP back', () => {
    const f = heart(), d = give(f.pc); A(f, { type: 'combat/outburst', design: d, hold: true });
    A(f, { type: 'combat/pump' }); A(f, { type: 'combat/pump' }); expect(me(f).mg!.mp).toBe(961);
    A(f, { type: 'combat/revert' }); expect(me(f).mg!.mp).toBe(967); A(f, { type: 'combat/revert' }); expect(me(f).mg!.mp).toBe(970);
    me(f).mg!.mp = 999; A(f, { type: 'combat/pump' }); A(f, { type: 'combat/revert' }); expect(me(f).mg!.mp).toBe(999);
  });
  it('the swell costs no MP, and a Pump does not move the mana meter', () => {
    const f = heart(), d = give(f.pc); A(f, { type: 'combat/outburst', design: d, hold: true });
    const meter = f.cb.mana; A(f, { type: 'combat/pump' }); A(f, { type: 'combat/pump' }); expect(f.cb.mana).toBe(meter);
    const mp = me(f).mg!.mp; withGame(f.g, () => magicTurnStart(f.cb, f.g.rng, me(f)));
    expect(held(f).stage).toBe(3); expect(me(f).mg!.mp).toBe(mp); expect(held(f).pumpMp).toBe(9);
    expect(pv(f).mp).toBe(12); // the next Pump reaches stage 4: it is priced by the stage it reaches
  });
  it('the Begin\'s price is the base: thin air and Insight change a Pump as they changed the Begin', () => {
    let f = heart(), d = give(f.pc); f.cb.mana = 5; // Thin: Soul cost ×1.5
    A(f, { type: 'combat/outburst', design: d, hold: true }); expect(held(f).cost).toBe(45); expect(pv(f).mp).toBe(5); // 4.5 rounds up
    A(f, { type: 'combat/pump' }); expect(pv(f).mp).toBe(9);
    f = heart(); d = give(f.pc); me(f).mg!.costSave = 0.45; // Insight 10
    A(f, { type: 'combat/outburst', design: d, hold: true }); expect(held(f).cost).toBe(17); expect([pv(f).mp, pumpsMp(me(f), 4, 0)]).toEqual([2, 2 + 3 + 5 + 7]);
  });
  it('a Begin that cost no MP pumps for none', () => {
    const f = heart(), d = give(f.pc); A(f, { type: 'combat/outburst', design: d, hold: true });
    held(f).cost = 0; expect(pv(f)).toMatchObject({ ok: true, mp: 0 });
    me(f).mg!.mp = 0; A(f, { type: 'combat/pump' }); expect(held(f).stage).toBe(1);
  });
});

describe('rules 1.24: who pays MP for a Pump', () => {
  it('a heart that draws on the air (no Emanator in hand) pays none', () => {
    const f = heart(), d = give(f.pc); me(f).mg!.emanator = false; me(f).mg!.mp = 0;
    A(f, { type: 'combat/outburst', design: d, hold: true }); expect(paysPumpMp(me(f))).toBe(false);
    expect(pv(f)).toMatchObject({ ok: true, ap: 1, mp: 0 }); A(f, { type: 'combat/pump' }); expect(held(f).stage).toBe(1); expect(me(f).mg!.mp).toBe(0);
  });
  it('an enemy caster\'s Pump is as it was: no MP', () => {
    const f = heart(), foe = f.foe; foe.mg = heartMagic(foe, HEART_CASTERS[0]);
    expect(paysPumpMp(foe)).toBe(false); expect(pumpMp(foe, 0, 1, 1, 30)).toBe(0);
  });
});

describe('rules 1.24: old saves', () => {
  it('an Emanator keeps its share of the pool, once: half stays half, full stays full', () => {
    const c = char({ virtue: 5, determination: 3, insight: 2 }, { mp: 250 }); delete c.mpRev;
    expect(maxMpOld(c)).toBe(500); expect(maxMp(c)).toBe(275);
    const notes = migrateCharacterMp(c);
    expect(c.mp).toBe(138); expect(c.mpRev).toBe(MP_REV); expect(notes).toEqual([c.name + '\'s Emanator now holds up to 275 MP (it was 500): Max MP comes from Determination and Insight now, not Virtue (rules 1.24).']);
    expect(migrateCharacterMp(c)).toEqual([]); expect(c.mp).toBe(138);
    const full = char({ virtue: 2, determination: 7, insight: 3 }, { mp: 200 }); delete full.mpRev; // the old all-in caster: 200 of 200
    migrateCharacterMp(full); expect(full.mp).toBe(maxMp(full)); expect(full.mp).toBe(600);
    const never = char({ virtue: 4 }); delete never.mpRev; delete never.mp; migrateCharacterMp(never); expect(never.mp).toBeUndefined(); expect(mpNow(never)).toBe(maxMp(never));
    const over = char({ virtue: 2, determination: 1 }, { mp: 900 }); delete over.mpRev; migrateCharacterMp(over); expect(over.mp).toBe(100); // never above the pool
  });
  it('a new character is stamped and is never moved', () => {
    const c = char({ virtue: 6, determination: 2 }, { mp: 60 }); expect(c.mpRev).toBe(MP_REV); expect(migrateCharacterMp(c)).toEqual([]); expect(c.mp).toBe(60);
  });
  it('the first action on an old save moves the sheet and the units of a fight in progress, and says so', () => {
    const f = heart(); const g0 = JSON.parse(JSON.stringify(f.g));
    const c = g0.characters[f.pc.charId!]; Object.assign(c.attrs, { virtue: 4, determination: 2, insight: 1 }); delete c.mpRev; c.mp = 200; // 200 of the old 400
    const u0 = g0.combat.units.find((x: Unit) => x.side === 'pc'); u0.mg.mp = 200; u0.mg.mpMax = 400;
    const g = apply(g0, { type: 'combat/prone', unitId: u0.id } as any, 'host');
    const u = g.combat!.units.find((x: Unit) => x.side === 'pc')!;
    expect(g.characters[c.id].mpRev).toBe(MP_REV); expect(maxMp(g.characters[c.id])).toBe(175);
    expect(u.mg!.mpMax).toBe(175); expect(u.mg!.mp).toBe(88); expect(g.characters[c.id].mp).toBe(88);
    expect(g.story.entries.some((e: any) => /Emanator now holds up to 175 MP \(it was 400\)/.test(e.text || ''))).toBe(true);
  });
});

describe('rules 1.24: the archetypes', () => {
  const attrOf = (s: string) => SKILL[s].attribute, coreOf = (a: string) => ATTRS.find((x) => x.id === a)!.core;
  it('every preset is still legal: 10 Skill and 10 Attribute points, Skill ≤ Attribute, the Core its family\'s highest', () => {
    expect(ARCHETYPES.length).toBe(46);
    for (const a of ARCHETYPES as any[]) {
      expect(Object.values(a.preset as Record<string, number>).reduce((x, y) => x + y, 0), a.id).toBe(BUDGET.skill);
      expect(Object.values(a.attributes as Record<string, number>).reduce((x, y) => x + y - 1, 0), a.id).toBe(BUDGET.attr);
      for (const [s, v] of Object.entries(a.preset as Record<string, number>)) expect(a.attributes[attrOf(s)], a.id + ' ' + s).toBeGreaterThanOrEqual(v);
      for (const core of ['body', 'mind', 'soul']) expect(a.cores[core], a.id + ' ' + core).toBe(Math.max(...Object.entries(a.attributes as Record<string, number>).filter(([k]) => coreOf(k) === core).map(([, v]) => v)));
      const top = Math.max(...Object.values(a.attributes as Record<string, number>));
      expect([...a.leans].sort(), a.id).toEqual(Object.values(CLASS).filter((c: any) => c.attribute && !c.advanced && a.attributes[c.attribute] === top).map((c: any) => c.id).sort());
    }
  });
  it('the seven re-spread presets', () => {
    const at = (id: string) => Object.fromEntries(Object.entries((ARCHETYPES as any[]).find((a) => a.id === id).attributes).filter(([, v]) => (v as number) > 1));
    expect(at('stormcaller')).toEqual({ expression: 4, insight: 4, determination: 5 });
    expect(at('mender')).toEqual({ endurance: 3, insight: 5, determination: 5 });
    expect(at('zealot')).toEqual({ endurance: 3, strength: 3, agility: 3, virtue: 5 });
    expect(at('troubadour')).toEqual({ expression: 3, insight: 5, determination: 3, virtue: 3 });
    expect(at('heartreader')).toEqual({ insight: 7, determination: 5 });
    expect(at('unbroken')).toEqual({ insight: 5, determination: 7 });
    expect(at('prophet')).toEqual({ insight: 5, virtue: 7 });
  });
  it('no preset holds Virtue without a Virtue skill; the casters\' pools, and the pools of those who only pray', () => {
    for (const a of ARCHETYPES as any[]) {
      const need = Math.max(1, ...Object.entries(a.preset as Record<string, number>).filter(([s]) => attrOf(s) === 'virtue').map(([, v]) => v));
      if (need === 1) expect(a.attributes.virtue, a.id).toBe(1); // Virtue with no Virtue skill was there for MP
    }
    const pool = (id: string) => { const a = (ARCHETYPES as any[]).find((x) => x.id === id).attributes; return MP_BASE + MP_PER_DETERMINATION * (a.determination - 1) + MP_PER_INSIGHT * (a.insight - 1); };
    expect([pool('stormcaller'), pool('witch'), pool('unbroken'), pool('heartreader'), pool('mender')]).toEqual([475, 500, 650, 550, 500]);
    expect([pool('zealot'), pool('prophet'), pool('crusader')]).toEqual([100, 200, 100]);
  });
});
