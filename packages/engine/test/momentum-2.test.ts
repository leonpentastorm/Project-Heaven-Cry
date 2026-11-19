// The Momentum chain 2.0 (rules 1.56, the Breaker; docs/design/proposals/2026-11-momentum-2.0.md). Every rule is a data
// row on the Breaker's `gain` (data/classes.json fighter), run by the item-op runner; every test goes through the
// reducer (a technique, a perk action, a cover smash) and reads the numbers from the data.
import { describe, it, expect, beforeEach } from 'vitest';
import './helpers/yard16';
import { CLASSES, enemyTurn, makeObject, PHYS_RULES, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';
import { chainOf } from '../src/physical/core';
import { withGame } from './helpers/perkfight';
import { onHook } from '../src/effects/hooks';
import PERKSJ from '../../../data/perks.json';

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
function fight(o: { weapon?: string; known?: string[]; foes?: { at: string; tier?: string }[]; m?: number; cls?: string | null; level?: number; perks?: Record<string, string>; attrs?: Record<string, number> } = {}) {
  const foes = o.foes || [{ at: 'D5' }];
  const f = physFight([{ weapon: o.weapon || 'sabre', known: o.known || [], skills: SK, ...(o.perks ? { perks: o.perks } : {}), ...(o.attrs ? { attrs: o.attrs } : {}), classId: o.cls === undefined ? 'fighter' : o.cls, level: o.level ?? 3 } as any], foes.map((x) => ({ tier: x.tier || 'elite', ...x })) as any);
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
  it('refused under 2 Momentum, in the engine\'s words', () => {
    const f = fight({ m: 1 });
    expect(refusal(() => launch(f, f.foe))).toMatch(/Momentum/);
  });
  // The 0.29 consolidation (SF1): a Boss holds against every forced move of a player's item (rules.json
  // forced_movement.boss_holds), Launch's flight included: it takes the blow and the save, and stays on its tile.
  for (const tier of ['boss', 'soldier']) it('on a ' + tier + ': the blow lands; ' + (tier === 'boss' ? 'it is never moved' : 'it flies'), () => {
    const b = fight({ m: 3, foes: [{ at: 'D5', tier }] }); weak(b.foe); const was = b.foe.pos, hp = b.foe.hp, n = b.cb.log.length;
    expect(refusal(() => launch(b, b.foe))).toBe('');
    const t = b.unit(b.foe.id), said = b.cb.log.slice(n).join(' | '); expect(t.hp).toBeLessThan(hp);
    // the say follows what happened (0.29.0 playtest: "Boss flies." over a Boss that stayed): the forced move's own refusal
    if (tier === 'boss') { expect(t.pos).toBe(was); expect(said).not.toMatch(/ flies/); expect(said).toMatch(/holds its ground \(too big to be moved\)/); }
    else { expect(t.pos).not.toBe(was); expect(said).toMatch(/ flies/); }
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

// Rules 1.56, the 0.29 integration: Keep Swinging (perks.json breaching_strike) counts a Finisher by its technique group
// (techniques.json group finisher; the Launch, an action, through rules.group_actions), never by a list of ids.
// Rules 1.60 item 4625 (R7): the kill gives no Momentum now; it puts the perk's condition (the next Strike or Opener free).
describe('Keep Swinging counts every Breaker Finisher by its group: Cleave, Break, Coup and Launch', () => {
  const PERK: any = (PERKSJ as any).items.find((p: any) => p.id === 'breaching_strike');
  const cond = PERK.tiers.I.effects[1].condition;
  const drop = (how: string, perk: boolean) => {
    const f = fight({ m: 3, perks: perk ? { breaching_strike: 'I' } : undefined, foes: [{ at: 'D5' }, { at: 'H9' }] }); weak(f.foe); f.unit(f.foe.id).hp = 1; rig({ hit: true, die: 12 });
    if (how === 'launch') launch(f, f.foe); else f.tech(how, { targetId: f.foe.id });
    rig(null); const t = f.unit(f.foe.id); return { m: f.momentum(f.pc), down: !!t.dead || t.hp <= 0, swinging: !!f.unit(f.pc.id).conds?.[cond] };
  };
  for (const how of ['cleave', 'break', 'coup', 'launch']) it(how + ': the kill puts the perk\'s condition on, and leaves no more Momentum than without it', () => {
    const a = drop(how, true), b = drop(how, false);
    expect(a.down).toBe(true); expect(b.down).toBe(true);
    expect(a.m).toBe(b.m); expect(a.swinging).toBe(true); expect(b.swinging).toBe(false);
  });
});

// The 0.29 consolidation (MF1): ONE reading of "is a Finisher" (physical/data.ts techGroupOf): a Launch that drops its
// foe is a Finisher for Measured Blow's follow-through (rules 1.73 item 5808: Follow Through left Raw Power 5 for the
// Breaker's rank III) and ends the melee chain, as Cleave, Break and Coup do.
describe('a Launch kill is a Finisher everywhere: Measured Blow and the end of the chain', () => {
  for (const how of ['cleave', 'break', 'coup', 'launch']) it(how + ': a rank III Breaker follows through (x1) and the chain has ended', () => {
    const f = fight({ m: 3, level: 12, attrs: { strength: 8 } }); weak(f.foe); f.foe.hp = 1; rig({ hit: true, die: 12 });
    if (how === 'launch') launch(f, f.foe); else f.tech(how, { targetId: f.foe.id });
    rig(null);
    expect(f.cb.log.some((l: any) => /follows through \(Measured Blow\)/.test(typeof l === 'string' ? l : l?.text || ''))).toBe(true);
    expect(chainOf(f.cb, f.unit(f.pc.id)).ended).toBe(true);
  });
});

// Item 5531 (the lead's ruling on row 15d of the outside playtest): after a Finisher the chain is locked to every action
// the technique data places in a melee group: the Breaker's Barrel In (its own action id `barrel_in`, an Opener by rules.group_actions; the old id `lunge` still finds it)
// is refused in the list, the preview and the reducer, in the data's one sentence; the basic Shove (no Momentum) is not.
import { actionsFor } from '../src';
describe('item 5531: the Finisher lock holds Barrel In; Shove stays', () => {
  it('a Breaker who Coups is refused Barrel In this turn, with the chain\'s own words, and may still Shove', () => {
    const f = fight({ m: 3, foes: [{ at: 'D5' }, { at: 'E7' }] }); weak(f.foe); f.unit(f.foe.id).hp = 1; rig({ hit: true, die: 12 });
    f.tech('coup', { targetId: f.foe.id }); rig(null);
    expect(chainOf(f.cb, f.unit(f.pc.id)).ended).toBe(true);
    f.momentum(f.pc, 2); f.pc.ap = 9; const other = f.foes[1];
    const list = withGame(f.g, () => actionsFor(f.g, f.pc.id, 'host'));
    const bi = list.find((d: any) => d.id.includes('fighter.lunge'))!; expect(bi).toBeTruthy();
    expect(bi.id).toMatch(/#barrel_in$/); // spec item 5608: its own action id, an Opener by techniques.json rules.group_actions
    expect(refusal(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'class:fighter.lunge', actionId: 'barrel_in', targetId: other.id } as any))).toContain(PHYS_RULES.chain_ended.replace(/\.$/, ''));
    expect(bi.why).toContain(PHYS_RULES.chain_ended.replace(/\.$/, ''));
    expect(refusal(() => f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'class:fighter.lunge', actionId: 'lunge', targetId: other.id } as any))).toContain(PHYS_RULES.chain_ended.replace(/\.$/, ''));
    f.put(f.unit(other.id), 'D5');
    expect(refusal(() => f.act({ type: 'combat/shove', unitId: f.pc.id, targetId: other.id } as any))).toBe('');
  });
  it('item K (0.31.11): the list reads the chain as the technique gate does (chainOf, the stamp of this turn), so a chain kept from an earlier turn locks nothing', () => {
    const f = fight({ m: 3, foes: [{ at: 'D5' }, { at: 'E7' }] }); weak(f.foe); f.unit(f.foe.id).hp = 1; rig({ hit: true, die: 12 });
    f.tech('coup', { targetId: f.foe.id }); rig(null);
    f.momentum(f.pc, 2); f.pc.ap = 9;
    const pc = f.unit(f.pc.id); (pc as any).chain = { ...(pc as any).chain, t: 'an earlier turn' }; // ended, but not this turn's
    expect(chainOf(f.cb, pc).ended).toBe(false);
    const bi = withGame(f.g, () => actionsFor(f.g, f.pc.id, 'host')).find((d: any) => d.id.includes('fighter.lunge'))!;
    expect(bi.why || '').not.toContain(PHYS_RULES.chain_ended.replace(/\.$/, ''));
  });
});
