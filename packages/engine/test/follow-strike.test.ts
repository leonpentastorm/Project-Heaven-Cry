// Rules 1.58 (hands 5e): follow strikes. A follows item in the off hand (every shield, Afterword) strikes once after each melee technique of a one-handed main weapon, as the unit's own action: its
// own roll at the follow row's extra, its own line, no AP; a rider (no Momentum, no Pressure, no other item's limited
// use, no Answer to its miss); a shield's that lands gives 1 Guard once a turn. Everything through the reducer
// (combat/technique, combat/attack, combat/paired) or the engine's own reactions. docs/design/proposals/2026-11-follow-strike.md.
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON, ITEM, gearEntry, followsId, heldOfChar, d20, pairs, resolveAttack, packOf, type Unit } from '../src';
import { onHook } from '../src/effects/hooks';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => { rig(null); REDIRECT = null; ROLL = null; });
// a test's own dice for the PC's rolls (after rig's): read at each roll
let ROLL: ((ctx: any) => void) | null = null;
onHook('attack_roll', (ctx: any) => { ROLL?.(ctx); });
// a test redirect (as a captive held as a shield or Confused would): the attack goes at this unit instead
let REDIRECT: string | null = null;
onHook('attack_target', (ctx: any) => { if (REDIRECT && ctx.att?.side === 'pc' && !ctx.att.swapMain) { const v = ctx.cb.units.find((x: Unit) => x.id === REDIRECT); if (v) ctx.tgt = v; } });

const FOLLOW = phys.TECHNIQUES.find((t) => t.group === 'follow')!;
type F = ReturnType<typeof fight>;
/** A PC on C5 (gladius by default), its off hand as given (a shield: carried as offItem; a weapon: offWeapon), a foe on
 *  D5 with HP to spare (a second foe on D4 when asked). */
function fight(o: { weapon?: string; off?: string | null; dur?: number; guard?: number; m?: number; known?: string[]; traits?: string[]; foe2?: boolean; skills?: Record<string, number>; classId?: string } = {}) {
  const sk = { athletics: 4, raw_power: 6, dexterity: 8, durability: o.dur ?? 3, ...(o.skills || {}) };
  const f = physFight([{ weapon: o.weapon || 'legion_gladius', known: o.known || [], skills: sk, ...(o.traits ? { traits: o.traits } : {}), ...(o.classId ? { classId: o.classId } : {}) }], [{ tier: 'soldier' }, ...(o.foe2 ? [{ tier: 'soldier' }] : [])]);
  f.cb.objects = [];
  f.put(f.pc, 'C5');
  const off = o.off === undefined ? 'buckler' : o.off, c = f.char(f.pc);
  c.offHand = null; if (off) c.pack = [...(c.pack || []), { ...gearEntry(off)! } as any];
  const foe = f.put(f.foe, 'D5'); foe.hp = foe.maxHp = 900;
  if (o.foe2) { const v = f.put(f.foes[1], 'D4'); v.hp = v.maxHp = 900; }
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1;
  f.turn(f.pc);
  // the off hand drawn the real way: the fight's own gear change (rule 5: through the reducer)
  if (off) { const ap = f.unit(f.pc.id).ap; f.unit(f.pc.id).ap = 9; f.act({ type: 'combat/equip', unitId: f.pc.id, item: off, to: 'off' } as any); f.unit(f.pc.id).ap = ap; }
  for (const u of f.cb.units) { delete u.openerUsed; delete (u as any).reactUsed; if (u.side === 'pc') u.hp = u.maxHp; }
  f.momentum(f.pc, o.m ?? 1); if (f.pc.resMax?.guard != null) f.pc.res!.guard = o.guard ?? 0;
  f.cb.fx = [];
  return f;
}
const melees = (f: F) => f.fx('melee') as any[];
const follows = (f: F) => melees(f).filter((e) => e.follow);
const guard = (f: F) => f.unit(f.pc.id).res?.guard ?? 0;
/** Dice with no natural 1 or 20 in the next rolls (a fumble wears 5 more; a 20 saves whatever the bonus). */
const calm = (f: F) => { for (let s = 1; ; s++) { const r = { state: s }; if (Array.from({ length: 12 }, () => d20(r)).every((n) => n !== 1 && n !== 20)) { f.g.rng.state = s; return; } } };

describe('the data', () => {
  it('one follow row (the engine makes it); every shield and Afterword carry `follows`; nothing else does (no graft)', () => {
    expect(FOLLOW).toMatchObject({ system: 'melee', free: false, comes_with: [] }); expect(phys.given(FOLLOW)).toBe(true);
    for (const id of ['buckler', 'riot_shield', 'pavise', 'afterword']) expect((WEAPON as any)[id].phys.props, id).toContain('follows');
    expect((ITEM as any).mod_follow_graft).toBeUndefined(); expect(followsId('sabre')).toBe(false);
  });
});

describe('a Cut and its follow (gladius + buckler)', () => {
  it('two rolls, the second the follow; AP is the Cut\'s; Momentum from the main hit only; each weapon wears 1', () => {
    const f = fight(); calm(f); rig({ hit: true });
    const ap0 = f.pc.ap, dur0 = f.pc.dur!, pv = f.pv('cut', { targetId: f.foe.id });
    expect(pv.attacks.map((a) => !!a.follow)).toEqual([false, true]); expect(pv.attacks[1]).toMatchObject({ target: f.foe.id, item: 'buckler' });
    expect((pv.attacks[1].pv as any).terms.some((t: any) => t.v === (FOLLOW.numbers as any).extra)).toBe(true);
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect(melees(f).length).toBe(2); expect(follows(f)).toHaveLength(1); expect(follows(f)[0]).toMatchObject({ tech: FOLLOW.id, weapon: 'buckler', target: f.foe.id, chain: true });
    expect(f.pc.ap).toBe(ap0 - pv.ap); expect(f.momentum(f.pc)).toBe(2);
    expect(f.pc.dur).toBe(dur0 - 1); expect(f.pc.offDur).toBe((WEAPON as any).buckler.durability - 1);
    expect(f.cb.log.some((l: any) => /Buckler follows/.test(typeof l === 'string' ? l : l.text))).toBe(true);
    expect(f.pc.weapon).toBe('legion_gladius'); expect(f.pc.swapMain).toBeUndefined();
  });
  it('the follow\'s wear goes home to the off hand\'s GearState at the fight\'s end', () => {
    const f = fight(); calm(f); rig({ hit: true });
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    const left = f.pc.offDur!; f.pc.ap = 6; f.act({ type: 'combat/stow', unitId: f.pc.id, slot: 'off' } as any); // a gear change writes the unit back first
    expect(packOf(f.char(f.pc)).find((x) => x.weapon === 'buckler')?.dur).toBe(left);
  });
  it('a Flurry (several rolls) draws one follow, at its first roll\'s target', () => {
    const f = fight({ known: ['flurry'], m: 3 }); calm(f); rig({ hit: true });
    expect(f.tech('flurry', { targetId: f.foe.id })).toBeNull();
    expect(melees(f).length).toBeGreaterThan(2); expect(follows(f)).toHaveLength(1); expect(follows(f)[0].target).toBe(f.foe.id);
  });
  it('the main blow kills: no follow, and nothing is said', () => {
    const f = fight(); rig({ hit: true }); f.foe.hp = 1;
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect(follows(f)).toHaveLength(0); expect(f.cb.log.some((l: any) => /follows/.test(typeof l === 'string' ? l : l.text))).toBe(false);
  });
  it('a redirected blow: the follow goes at the unit really struck', () => {
    const f = fight({ foe2: true }); calm(f); rig({ hit: true }); REDIRECT = f.foes[1].id;
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect(follows(f)).toHaveLength(1); expect(follows(f)[0].target).toBe(f.foes[1].id);
  });
  it('a follows item worn to 0 makes no follow', () => {
    const f = fight(); rig({ hit: true }); f.pc.offDur = 0;
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(0);
  });
});

describe('never', () => {
  it('a gun in the main hand: a Shot, the old melee attack with the pistol; a thrown knife', () => {
    const f = fight({ weapon: 'service_pistol' }); rig({ hit: true });
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(0);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'melee' } as any); expect(follows(f)).toHaveLength(0);
    const k = fight({ weapon: 'combat_knife', known: ['throw'] }); rig({ hit: true }); k.put(k.foe, 'F5');
    expect(k.tech('throw', { targetId: k.foe.id })).toBeNull(); expect(follows(k)).toHaveLength(0);
  });
  it('a reaction: a Riposte made on the foe\'s turn draws no follow', () => {
    const f = fight({ known: ['riposte'] }); f.turn(f.foe); f.foe.weapon = 'combat_knife'; f.foe.attack = -100; rig({ hit: false });
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pc.id), 'melee', null, { noAp: true }));
    expect(melees(f).some((e) => e.unit === f.pc.id && e.tech === 'riposte')).toBe(true); expect(follows(f)).toHaveLength(0);
  });
  it('Shield Bash: 1 AP, the shield\'s line x its mult, no follow and no follow Guard', () => {
    const f = fight({ guard: 2 }); calm(f); rig({ hit: true });
    const ap0 = f.pc.ap, pv = f.pv('shield_bash', { targetId: f.foe.id });
    expect(pv.ap).toBe(1); expect(pv.attacks).toHaveLength(1); expect(pv.attacks[0].pv.dmg!.mults.some((m: any) => m.v === phys.TECHNIQUE.shield_bash.numbers.mult)).toBe(true);
    expect(f.tech('shield_bash', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(ap0 - 1); expect(follows(f)).toHaveLength(0); expect(guard(f)).toBe(1); // its own cost, nothing back
  });
  it('a paired attack and a both-hands technique: a follows weapon is never the second weapon', () => {
    const f = fight({ off: 'afterword' }); rig({ hit: true });
    expect(f.bound(() => pairs(f.pc))).toBe(false);
    expect(() => f.act({ type: 'combat/paired', unitId: f.pc.id, targetId: f.foe.id } as any)).toThrow(/follows/);
    expect(f.pv('bash', { targetId: f.foe.id, hand: 'both' }).ok).toBe(false);
  });
  it('Heavyworlder: a two-handed weapon held in one hand draws no follow', () => {
    const f = fight({ weapon: 'maul', traits: ['heavyworlder'], skills: { raw_power: 8 } }); rig({ hit: true });
    expect(f.pc.offItem).toBe('buckler');
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(0);
  });
});

describe('a rider', () => {
  it('no Momentum and no Pressure: a Cut and its follow land, the Pressure is shed once', () => {
    const f = fight(); calm(f); rig({ hit: true }); const p0 = f.press(f.pc, 4);
    const shed = (phys.PHYS_RULES as any).pressure.melee_hit_sheds;
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(1);
    expect(p0).toBeGreaterThan(shed); expect(f.pressure(f.pc)).toBe(p0 - shed); expect(f.momentum(f.pc)).toBe(2);
    expect(f.pressure(f.foe)).toBe(0);
  });
  it('a miss of the follow draws no Riposte from a foe that has it', () => {
    const f = fight(); calm(f); (f.foe as any).techs = ['riposte']; f.foe.weapon = 'combat_knife';
    let n = 0; ROLL = (ctx) => { if (ctx.att?.id === f.pc.id) { n++; ctx.hit = n === 1; } };
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect(follows(f)).toHaveLength(1); expect(follows(f)[0].hit).toBe(false);
    expect(melees(f).some((e) => e.unit === f.foe.id)).toBe(false);
  });
  it('spends no other item\'s limited use: a once-a-turn hit line of the main weapon is still there after the follow', () => {
    // a modifier row on the gladius (a fitted mod): once a turn, a melee hit gives 1 Momentum. The follow is no "melee
    // hit" for it, and spends nothing of it; the next Cut still has it.
    (ITEM as any).test_once = { id: 'test_once', name: 'Test once', category: 'mod', text: 'test', adjudication: 'engine', effects: [{ op: 'resource', when: 'hit', if: { melee: true }, resource: 'momentum', value: 1, limit: { per: 'per_turn', n: 1 } }] };
    try {
      const f = fight(); calm(f); rig({ hit: true });
      const c = f.char(f.pc); c.weaponState = { ...(c.weaponState || {}), mods: ['test_once'] } as any; f.pc.held = heldOfChar(c);
      // the first Cut misses and its follow lands: the line neither fires nor is spent (the follow is no melee hit for it)
      let n = 0; rig(null); ROLL = (ctx) => { if (ctx.att?.id === f.pc.id) { n++; ctx.hit = n !== 1; } };
      expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(1); expect(follows(f)[0].hit).toBe(true);
      expect(f.momentum(f.pc)).toBe(1);
      // the next Cut lands: its own +1 and the line's, which is still there
      expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(f.momentum(f.pc)).toBe(3);
    } finally { delete (ITEM as any).test_once; }
  });
});

describe('Guard from a shield\'s follow (once a turn across every shield)', () => {
  it('buckler in the main hand, riot shield in the off: two follows land and a Bash: the plate once, doubled by the two shields (rules 1.59 T4), never above the pool', () => {
    const f = fight({ weapon: 'buckler', off: 'riot_shield', dur: 5, guard: 1, m: 3 }); calm(f); rig({ hit: true });
    const plate = phys.PHYS_RULES.guard.two_shield_mult; // the plate's 1, x2 with a shield in each hand
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect(follows(f)).toHaveLength(1); expect(follows(f)[0].weapon).toBe('riot_shield'); expect(guard(f)).toBe(1 + plate);
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect(follows(f)).toHaveLength(2); expect(guard(f)).toBe(1 + plate);
    expect(f.tech('shield_bash', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(2); expect(guard(f)).toBe(plate);
    expect(f.fx('guard').some((e: any) => e.why === 'gain' && e.unit === f.pc.id)).toBe(true);
  });
});

describe('the hand pairs', () => {
  it('main shield + off shield: the off one follows; main shield + focus: none', () => {
    const f = fight({ weapon: 'buckler', off: 'buckler' }); calm(f); rig({ hit: true });
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(1);
    const g = fight({ weapon: 'buckler', off: 'evoker' }); rig({ hit: true });
    expect(g.tech('cut', { targetId: g.foe.id })).toBeNull(); expect(follows(g)).toHaveLength(0);
  });
  it('main shield + off sabre: ordinary dual wielding (Both opens), no follow', () => {
    const f = fight({ weapon: 'buckler', off: 'sabre' }); rig({ hit: true });
    expect(f.bound(() => pairs(f.pc))).toBe(true);
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(0);
  });
  it('gladius + Afterword: no Both, no off-hand attack of its own; the follow at x0.25 and Bleeding once a turn', () => {
    const f = fight({ off: 'afterword' }); calm(f); rig({ hit: true });
    expect(f.pad(f.pc, 'off').flatMap((g) => g.entries)).toEqual([]);
    const pv = f.pv('cut', { targetId: f.foe.id }); expect(pv.attacks[1]).toMatchObject({ follow: true, item: 'afterword' });
    expect(pv.attacks[1].pv.dmg!.mults.some((m: any) => m.v === (ITEM as any).mod_afterword.effects[0].value)).toBe(true);
    (f.foe as any).sv = { body: -50, brain: -50, heart: -50 };
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(1);
    expect(f.foe.bleed).toBeGreaterThan(0);
  });
  it('main Afterword + off gladius: the off one is no follows item, so Both opens and nothing follows', () => {
    const f = fight({ weapon: 'afterword', off: 'legion_gladius' }); rig({ hit: true });
    expect(f.bound(() => pairs(f.pc))).toBe(true);
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull(); expect(follows(f)).toHaveLength(0);
  });
});

describe('gear', () => {
  it('a follows item asks no +2 in the off hand; a sabre beside a main-hand shield does', () => {
    const f = fight({ off: null, skills: { dexterity: 0 } }); const c = f.char(f.pc);
    c.pack = [{ id: 'afterword', name: 'Afterword', qty: 1, kind: 'weapon', weapon: 'afterword' } as any];
    f.pc.ap = 6; f.act({ type: 'combat/equip', unitId: f.pc.id, item: 'afterword', to: 'off' } as any); expect(f.pc.offWeapon).toBe('afterword');
    const g = fight({ weapon: 'buckler', off: null, skills: { dexterity: 0 } }); const d = g.char(g.pc);
    d.pack = [{ id: 'sabre', name: 'Sabre', qty: 1, kind: 'weapon', weapon: 'sabre' } as any];
    expect(() => g.act({ type: 'combat/equip', unitId: g.pc.id, item: 'sabre', to: 'off' } as any)).toThrow(/second weapon/);
  });
});
