// The Momentum chain 2.0 (rules 1.56, the Breaker; docs/design/proposals/2026-11-momentum-2.0.md). Every rule is a data
// row on the Breaker's `gain` (data/classes.json fighter), run by the item-op runner; every test goes through the
// reducer (a technique, a perk action, a cover smash) and reads the numbers from the data.
import { describe, it, expect, beforeEach } from 'vitest';
import './helpers/yard16';
import { CLASSES, enemyTurn, makeObject, PHYS_RULES, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';
import { withGame } from './helpers/perkfight';
import { onHook } from '../src/effects/hooks';

// Forced saves (the dice of a save are not the attack's rig): 'pass' or 'fail' decides every save until reset.
let SAVE: 'pass' | 'fail' | null = null;
onHook('save', (ctx: any) => { if (SAVE === 'pass') ctx.pass = true; if (SAVE === 'fail') ctx.fail = true; });
beforeEach(() => { rig(null); SAVE = null; });

const FIGHTER: any = (CLASSES as any[]).find((b) => b.id === 'fighter');
const row = (id: string): any => FIGHTER.gain.find((m: any) => m.id === id);
const LAUNCH = row('launch').effects[0];
const SK = { athletics: 6, raw_power: 6, dexterity: 6 };
type F = ReturnType<typeof fight>;
/** A Breaker (or, cls null, a classless fighter) on C5, foes where given (default one next to it on D5), its turn. */
function fight(o: { weapon?: string; known?: string[]; foes?: { at: string; tier?: string }[]; m?: number; cls?: string | null; level?: number } = {}) {
  const foes = o.foes || [{ at: 'D5' }];
  const f = physFight([{ weapon: o.weapon || 'sabre', known: o.known || [], skills: SK, classId: o.cls === undefined ? 'fighter' : o.cls, level: o.level ?? 3 } as any], foes.map((x) => ({ tier: x.tier || 'elite', ...x })) as any);
  f.cb.objects = [];
  f.put(f.pc, 'C5'); foes.forEach((x, i) => { const u = f.put(f.foes[i], x.at); u.hp = u.maxHp = 900; });
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1;
  f.turn(f.pc);
  for (const u of f.cb.units) { delete u.openerUsed; if (u.side === 'pc') u.hp = u.maxHp; }
  f.pc.ap = 9;
  f.momentum(f.pc, o.m ?? 1);
  return f;
}
const weak = (u: Unit) => { (u as any).sv = { body: -50, brain: -50, heart: -50 }; SAVE = 'fail'; };
const strong = (u: Unit) => { (u as any).sv = { body: 90, brain: 90, heart: 90 }; SAVE = 'pass'; };
const launch = (f: F, t: Unit, by = 'host') => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'class:fighter.launch', actionId: LAUNCH.action, targetId: t.id } as any, by);
const refusal = (fn: () => unknown): string => { try { fn(); return ''; } catch (e: any) { return String(e?.message || e); } };

describe('every blow counts: held (measured over the melee band at level 20; the draft, Measured)', () => {
  it('a Breaker Strike that hits gives none of its own (only the plain attack engine +1 stands)', () => {
    expect(row('every_blow')).toBeUndefined();
    const f = fight({ known: ['bash'], m: 2 }); rig({ hit: true, die: 12 });
    expect(f.tech('bash', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(1);
  });
});

describe('the Charge carries, and bowls over', () => {
  const charge = (o: { tier?: string; save?: (u: Unit) => void; offBalance?: boolean } = {}) => {
    const f = fight({ known: ['charge'], foes: [{ at: 'H5', tier: o.tier }], m: 0 }); rig({ hit: true, die: 12 });
    if (o.save) o.save(f.foe);
    if (o.offBalance) (f.unit(f.foe.id).conds ||= {}).off_balance = 2;
    f.walk(f.pc, 'G5'); f.momentum(f.pc, 0);
    const before = f.fx('momentum').length;
    expect(f.tech('charge', { targetId: f.foe.id })).toBeNull();
    return { f, t: f.unit(f.foe.id), before };
  };
  it("a Charge that hits: the row's +2, the blow's +1 and closing in; a failed Body save: Prone (and Off Balance)", () => {
    const { f, t, before } = charge({ save: weak });
    expect(f.momentum(f.pc)).toBe(Math.min(f.pc.resMax!.momentum, 2 + row('charge_carries').effects[0].value)); // closing in (up to 2) + the Charge's row
    expect(t.prone).toBe(true); expect(t.conds?.off_balance).toBeTruthy();
    expect(f.fx('momentum').length).toBeGreaterThan(before); // the counter's moment (fx/breaker.ts) has its event
  });
  it('a made Body save: the target stays standing, even when it was already Off Balance', () => {
    expect(charge({ save: strong }).t.prone).toBeFalsy();
    expect(charge({ save: strong, offBalance: true }).t.prone).toBeFalsy();
  });
  it("a Boss is never bowled over, however it saves (the row's own tier filter)", () => {
    const { f, t } = charge({ tier: 'boss', save: weak });
    expect(row('charge_carries').effects.every((e: any) => e.op === 'resource' || e.if?.target_not_tier?.includes('boss'))).toBe(true);
    expect(t.prone).toBeFalsy(); expect(t.conds?.off_balance).toBeFalsy();
    expect(f.momentum(f.pc)).toBeGreaterThan(0); // the Momentum still comes
  });
});

describe('four ways to finish', () => {
  it('a Breaker has Cleave, Break and Coup with bare fists (weapon-neutral); a classless fighter does not', () => {
    const f = fight({ weapon: 'fists', m: 2 });
    const ids = f.pad().flatMap((g) => g.entries).map((e) => e.id);
    for (const id of ['cleave', 'break', 'coup']) expect(ids, id).toContain(id);
    const g = fight({ weapon: 'fists', m: 2, cls: null, level: 1 });
    expect(g.pad().flatMap((x) => x.entries).map((e) => e.id)).not.toContain('cleave');
  });
  it('Cleave: the Breaker to-hit term cancels the off-home penalty with any weapon', () => {
    const f = fight({ weapon: 'fists', m: 2 });
    expect(JSON.stringify((f.pv('cleave', { targetId: f.foe.id }) as any).attacks?.[0]?.pv?.terms || [])).toMatch(/Cleave \(Breaker\)/);
  });
  it('Break leaves its target Exposed', () => {
    const f = fight({ m: 2 }); rig({ hit: true, die: 12 }); strong(f.foe);
    expect(f.tech('break', { targetId: f.foe.id })).toBeNull();
    expect(f.unit(f.foe.id).conds?.exposed).toBeTruthy();
  });
  it('Coup as Execute: the to-hit term and the ×1.2 only against a foe under half HP', () => {
    const f = fight({ m: 2 }); const t = f.unit(f.foe.id);
    t.hp = Math.floor(t.maxHp * 0.4);
    const terms = (f.pv('coup', { targetId: t.id }) as any).attacks?.[0]?.pv?.terms || [];
    expect(JSON.stringify(terms)).toMatch(/Execute/);
    t.hp = t.maxHp;
    expect(JSON.stringify((f.pv('coup', { targetId: t.id }) as any).attacks?.[0]?.pv?.terms || [])).not.toMatch(/Execute/);
  });
});

describe('Launch', () => {
  it('refused under 2 Momentum, in the engine\'s words; refused on a Boss by the reach\'s own why', () => {
    const f = fight({ m: 1 });
    expect(refusal(() => launch(f, f.foe))).toMatch(/Momentum/);
    const b = fight({ m: 3, foes: [{ at: 'D5', tier: 'boss' }] });
    expect(refusal(() => launch(b, b.foe))).toBe(LAUNCH.reach.why.target_not_tier.replace('{target}', b.foe.name));
  });
  it('a failed save: Off Balance, 3 tiles, Prone, a blow; all Momentum spent', () => {
    const f = fight({ m: 4 }); weak(f.foe); const hp = f.foe.hp;
    launch(f, f.foe);
    const t = f.unit(f.foe.id);
    expect(t.pos).toBe(f.tile('G5')); expect(t.prone).toBe(true); expect(t.hp).toBeLessThan(hp);
    expect(f.momentum(f.pc)).toBe(0);
    expect(f.fx('shove').some((e: any) => e.target === t.id && e.unit === f.pc.id)).toBe(true);
  });
  it('a saved Launch moves 1 tile and leaves it standing', () => {
    const f = fight({ m: 2 }); strong(f.foe);
    launch(f, f.foe);
    const t = f.unit(f.foe.id); expect(t.pos).toBe(f.tile('E5')); expect(t.prone).toBeFalsy();
  });
  it('a saved Launch is the short push even when the target was already Off Balance', () => {
    const f = fight({ m: 2 }); strong(f.foe); (f.unit(f.foe.id).conds ||= {}).off_balance = 2;
    launch(f, f.foe);
    const t = f.unit(f.foe.id); expect(t.pos).toBe(f.tile('E5')); expect(t.prone).toBeFalsy();
  });
  it("the Launch's flight names its cause (the shove effect's source: the data's launch_source), so a screen draws LAUNCHED for it alone", () => {
    const f = fight({ m: 4 }); weak(f.foe);
    launch(f, f.foe);
    const sh = f.fx('shove').filter((e: any) => e.target === f.foe.id && e.ok);
    expect(sh.length).toBeGreaterThan(0);
    expect(sh.every((e: any) => e.source === (PHYS_RULES as any).momentum.show.launch_source)).toBe(true);
  });
  it('more Momentum, a harder blow (the amount reads what is left after the 2 are paid)', () => {
    const dmg = (m: number) => { const f = fight({ m }); weak(f.foe); const hp = f.foe.hp; launch(f, f.foe); return hp - f.unit(f.foe.id).hp; };
    expect(dmg(5)).toBeGreaterThan(dmg(2));
  });
  it('onto a burning tile: the tile acts on it (more harm than the same Launch onto bare ground)', () => {
    const go = (fire: boolean) => { const f = fight({ m: 3 }); weak(f.foe); if (fire) (f.cb as any).hazards = [{ id: 'hz', kind: 'fire', severity: 'light', zone: 'z', tiles: [f.tile('G5')], approaches: [] }]; const hp = f.foe.hp; launch(f, f.foe); return { f, lost: hp - f.unit(f.foe.id).hp }; };
    const bare = go(false), burn = go(true);
    expect(burn.f.unit(burn.f.foe.id).pos).toBe(burn.f.tile('G5'));
    expect(burn.lost).toBeGreaterThan(bare.lost);
  });
});

describe('the map gives way: Wrecker and Breach', () => {
  it('smashing a crate gives the row\'s Momentum and Exposes a seen foe within 2; a Break finisher does neither', () => {
    const f = fight({ foes: [{ at: 'E4' }, { at: 'J5' }], m: 1 });
    f.cb.objects = [makeObject('c1', 'crate', f.tile('C4'))];
    f.act({ type: 'combat/shoot-cover', unitId: f.pc.id, tile: f.tile('C4') } as any);
    expect(f.momentum(f.pc)).toBe(1 + row('wrecker').effects[0].value);
    expect(f.unit(f.foes[0].id).conds?.exposed).toBeTruthy();
    expect(f.unit(f.foes[1].id).conds?.exposed).toBeFalsy();
    const g = fight({ foes: [{ at: 'D5' }, { at: 'E6' }], m: 2 }); rig({ hit: false, die: 2 });
    expect(g.tech('break', { targetId: g.foe.id })).toBeNull();
    expect(g.unit(g.foes[1].id).conds?.exposed).toBeFalsy();
  });
});

describe('the enemy AI still plays', () => {
  it('a seeded fight with a Breaker runs enemy turns to the end of a few rounds', () => {
    const f = fight({ m: 3, foes: [{ at: 'H5' }, { at: 'H7' }] });
    for (const u of f.foes) { const x = f.unit(u.id); x.hp = x.maxHp = 60; }
    for (let r = 0; r < 4 && !f.cb.over; r++) {
      f.act({ type: 'combat/end-turn', unitId: f.cb.order[f.cb.turn] } as any);
      withGame(f.g, () => { let n = 0; while (!f.cb.over && f.cb.units.find((x) => x.id === f.cb.order[f.cb.turn])?.side === 'foe' && n++ < 10) enemyTurn(f.cb, f.g.rng); });
    }
    expect(f.cb.round).toBeGreaterThan(1);
  });
});
