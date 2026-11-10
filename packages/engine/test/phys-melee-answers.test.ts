// Physical 2.0 (rules 1.12), the melee Answers built by the melee lane: Parry (25) and Keep Back (27).
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { phys, resolveAttack, dist } from '../src';
import { emit } from '../src/effects/hooks';
import { physFight, rig } from './helpers/physfight';

// Forced saves and parry rolls: while D20.v is set, every d20 the engine rolls is that number (attack rolls are rigged
// on top of it with rig()). Set after the fight is built, so initiative and the opening turns roll as usual.
const D20 = vi.hoisted(() => ({ v: null as number | null }));
vi.mock('../src/rng', async (orig) => { const m: any = await orig(); return { ...m, d20: (r: any) => (D20.v != null ? D20.v : m.d20(r)) }; });
beforeEach(() => { rig(null); D20.v = null; });
const parries = (f: any) => f.cb.log.filter((l: string) => / parries/.test(l));
/** A clean round for the test: the fight's opening turns (an enemy may act first) leave no reaction spent. */
const fresh = (f: any) => { for (const u of f.cb.units) { delete u.reactUsed; u.reactedRound = undefined; } return f; };
const answered = (f: any, name: string) => f.cb.log.filter((l: string) => new RegExp('answers with ' + name).test(l)).length;

describe('Parry', () => {
  // the PC parries; the foe (a sabre) swings on its own turn. attack: −100 (the parry always wins) or +100 (it never does).
  const fight = (weapon: string, known: string[] = ['parry'], foeAttack = -100, more: any[] = []) => {
    const f = physFight([{ weapon, known, skills: { athletics: 4, raw_power: 4 } }, ...more], [{ at: 'D5', tier: 'elite', weapon: 'sabre' }]);
    f.put(f.pc, 'C5'); if (more.length) f.put(f.pcs[1], 'C6');
    f.turn(f.foe); fresh(f); f.foe.attack = foeAttack; rig({ hit: true, die: 10 });
    return f;
  };
  const swing = (f: any, at = f.pc) => { const hp = f.unit(at.id).hp; f.bound(() => resolveAttack(f.cb, f.g.rng, f.foe, f.unit(at.id), 'melee', null, { noAp: true })); return hp - f.unit(at.id).hp; };
  const full = (weapon: string) => swing(fight(weapon, []));

  it('base (a weapon with neither Light nor Heavy): a won parry halves the hit, as the reaction, for 0 AP and no Momentum', () => {
    const d = full('bot_thread_banner'); expect(d).toBeGreaterThan(1);
    const f = fight('bot_thread_banner'); const ap = f.pc.ap;
    expect(swing(f)).toBe(Math.floor(d / 2));
    expect(answered(f, 'Parry')).toBe(1); expect(f.pc.reactUsed?.n).toBe(1); expect(f.pc.ap).toBe(ap);
    expect(f.momentum(f.pc)).toBe(0);
    expect(swing(f)).toBe(d); // the reaction is spent: the second hit lands whole
  });
  it('a lost parry still spends the reaction and the hit lands whole', () => {
    const d = full('bot_thread_banner'), f = fight('bot_thread_banner', ['parry'], 100);
    expect(swing(f)).toBe(d); expect(answered(f, 'Parry')).toBe(1); expect(parries(f)[0]).toMatch(/gets through/);
  });
  it('fires only on a melee hit: not on a miss, and not on a shot', () => {
    const f = fight('bot_thread_banner'); rig({ hit: false, die: 5 }); swing(f); expect(answered(f, 'Parry')).toBe(0);
    const g = physFight([{ weapon: 'bot_thread_banner', known: ['parry'] }], [{ at: 'H5', tier: 'elite' }]); g.put(g.pc, 'C5'); g.turn(g.foe); rig({ hit: true, die: 10 });
    g.bound(() => resolveAttack(g.cb, g.g.rng, g.foe, g.pc, 'shot', null, { noAp: true })); expect(answered(g, 'Parry')).toBe(0);
  });
  it('Light: a won parry gives 1 Momentum (and none without Light)', () => {
    const f = fight('sabre'); swing(f); expect(f.momentum(f.pc)).toBe(1);
    const g = fight('maul'); swing(g); expect(g.momentum(g.pc)).toBe(0);
  });
  it('Heavy: parries for an adjacent ally; without Heavy it does not', () => {
    const ally = { weapon: 'bot_thread_banner', skills: { athletics: 4 } };
    const base = fight('maul', [], -100, [ally]); const whole = swing(base, base.pcs[1]);
    const f = fight('maul', ['parry'], -100, [ally]); expect(swing(f, f.pcs[1])).toBe(Math.floor(whole / 2));
    expect(f.pc.reactUsed?.n).toBe(1); expect(parries(f)[0]).toMatch(/for /);
    const g = fight('sabre', ['parry'], -100, [ally]); expect(swing(g, g.pcs[1])).toBe(whole); expect(answered(g, 'Parry')).toBe(0);
    const h = fight('maul', ['parry'], -100, [ally]); h.put(h.pcs[1], 'D7'); h.put(h.foe, 'D6'); expect(swing(h, h.pcs[1])).toBe(whole); // not adjacent
  });
  it('Heavy: an ally that can parry for itself does, and the hit is halved once', () => {
    const f = fight('maul', ['parry'], -100, [{ weapon: 'bot_thread_banner', known: ['parry'] }]);
    const whole = (() => { const b = fight('maul', [], -100, [{ weapon: 'bot_thread_banner' }]); return swing(b, b.pcs[1]); })();
    expect(swing(f, f.pcs[1])).toBe(Math.floor(whole / 2));
    expect(answered(f, 'Parry')).toBe(1); expect(f.unit(f.pcs[1].id).reactUsed?.n).toBe(1); expect(f.pc.reactUsed?.n ?? 0).toBe(0);
  });
  it('Heavy: a shield in the off hand adds +2 to the parry roll; without Heavy it adds nothing', () => {
    const bonus = (weapon: string, shield: boolean) => {
      const f = fight(weapon); if (shield) f.char(f.pc).offHand = { id: 'riot_shield' } as any;
      swing(f); const m = parries(f)[0].match(/d20 (\d+) ([+−])(\d+)/)!; return (m[2] === '−' ? -1 : 1) * Number(m[3]);
    };
    expect(bonus('ork_machete', true) - bonus('ork_machete', false)).toBe(2);
    expect(bonus('sabre', true) - bonus('sabre', false)).toBe(0);
  });
  it('protective: it works while Suppressed (Riposte does not)', () => {
    const f = fight('bot_thread_banner'); f.press(f.pc, 3, f.foe); swing(f); expect(answered(f, 'Parry')).toBe(1);
  });
  it('not against a target Feint has set up (it can\'t Answer), and not on your own turn', () => {
    const f = fight('bot_thread_banner'); (f.foe as any).setUp = { t: phys.turnStamp(f.cb), target: f.pc.id, noAnswer: true };
    swing(f); expect(answered(f, 'Parry')).toBe(0);
    const g = fight('bot_thread_banner'); g.turn(g.pc); swing(g); expect(answered(g, 'Parry')).toBe(0);
  });
  it('refusals: it is a reaction, never used as an action; the pad lists it as built; a preview changes nothing', () => {
    const f = fight('bot_thread_banner'); f.turn(f.pc);
    expect(f.tech('parry')).toMatch(/reaction/); expect(f.pc.ap).toBe(6);
    const e = f.pad().flatMap((g) => g.entries).find((x) => x.id === 'parry')!; expect(e.built).toBe(true); expect(e.group).toBe('answer');
    const before = JSON.stringify(f.cb); const pv = f.pv('parry'); expect(pv.ok).toBe(false); expect(JSON.stringify(f.cb)).toBe(before);
  });
  it('the gladius lends it as its signature', () => {
    const f = fight('legion_gladius', []); swing(f); expect(answered(f, 'Parry')).toBe(1);
  });
});

describe('Keep Back', () => {
  // the PC stands on D4; the foe walks in along row 5 from H5 toward C4. save: the d20 of the foe's Body save (2 fails it,
  // 19 makes it, null: the game's dice).
  const fight = (weapon: string, known: string[] = ['keep_back'], save: number | null = 2, seed?: string) => {
    const f = physFight([{ weapon, known, skills: { athletics: 4, raw_power: 4 } }], [{ at: 'H5', tier: 'elite', weapon: 'sabre' }], { seed });
    f.put(f.pc, 'D4'); f.put(f.foe, 'H5'); f.turn(f.foe); fresh(f); rig({ hit: true, die: 12 }); D20.v = save;
    return f;
  };
  const d = (f: any) => dist(f.foe.pos, f.pc.pos);

  it('base: strikes the enemy stepping into reach; on a failed Body save it stops there (as the reaction, 0 AP, Momentum +1)', () => {
    const f = fight('sabre'); const hp = f.foe.hp, ap = f.pc.ap;
    f.walk(f.foe, 'C4');
    expect(answered(f, 'Keep Back')).toBe(1); expect(f.foe.hp).toBeLessThan(hp);
    expect(d(f)).toBe(1); expect(f.foe.pos).not.toBe(f.tile('C4')); expect(f.foe.prone).toBeFalsy();
    expect(f.cb.log.some((l) => /fails the save against Keep Back/.test(l))).toBe(true);
    expect(f.pc.reactUsed?.n).toBe(1); expect(f.pc.ap).toBe(ap); expect(f.momentum(f.pc)).toBe(1);
  });
  it('a miss: no save, the enemy walks on', () => {
    const f = fight('sabre'); rig({ hit: false, die: 3 }); f.walk(f.foe, 'C4');
    expect(answered(f, 'Keep Back')).toBe(1); expect(f.foe.pos).toBe(f.tile('C4'));
    expect(f.cb.log.some((l) => /save against Keep Back/.test(l))).toBe(false);
  });
  it('a saved Body save: hit, but it walks on', () => {
    const f = fight('sabre', ['keep_back'], 19); const hp = f.foe.hp; f.walk(f.foe, 'C4');
    expect(f.foe.hp).toBeLessThan(hp); expect(f.foe.pos).toBe(f.tile('C4'));
  });
  it('Reach: the reach is 2 tiles (and 1 without Reach); Hook: a failed save also leaves it Prone', () => {
    // the glaive has both: one line applies (the first, Reach: a reaction has no line to choose)
    const f = fight('glaive'); f.walk(f.foe, 'C4');
    expect(answered(f, 'Keep Back')).toBe(1); expect(d(f)).toBe(2); expect(f.foe.prone).toBeFalsy();
    const g = fight('war_axe'); g.walk(g.foe, 'C4'); // Hook without Reach
    expect(d(g)).toBe(1); expect(g.foe.prone).toBe(true);
    const s = fight('grand_staff'); s.walk(s.foe, 'C4'); expect(d(s)).toBe(2); // a Reach weapon without the old reach_2 entry still strikes at 2
    const h = fight('lance'); h.walk(h.foe, 'C4'); // Reach without Hook
    expect(d(h)).toBe(2); expect(h.foe.prone).toBeFalsy();
  });
  it('only the step that enters the reach; an enemy already inside does not set it off', () => {
    const f = fight('sabre'); f.put(f.foe, 'E5'); f.walk(f.foe, 'C4'); expect(answered(f, 'Keep Back')).toBe(0);
  });
  it('not while Suppressed, not on a forced move, not for an ally, not on your own turn', () => {
    const f = fight('sabre'); f.press(f.pc, 3, f.foe); f.walk(f.foe, 'C4'); expect(answered(f, 'Keep Back')).toBe(0); expect(f.foe.pos).toBe(f.tile('C4'));
    const g = fight('sabre'); g.put(g.foe, 'F5');
    g.bound(() => emit(g.cb, 'move_step', { u: g.foe, from: g.tile('F5'), at: g.tile('E5'), i: 0, route: [], how: 'forced', stop: false, cb: g.cb, rng: g.g.rng, forced: true }));
    expect(answered(g, 'Keep Back')).toBe(0);
    const h = physFight([{ weapon: 'sabre', known: ['keep_back'] }, { weapon: 'sabre' }], [{ at: 'J9' }]); h.put(h.pc, 'D4'); h.put(h.pcs[1], 'H5'); h.turn(h.pcs[1]);
    h.walk(h.pcs[1], 'C4'); expect(answered(h, 'Keep Back')).toBe(0);
    const k = fight('sabre'); k.turn(k.pc); k.put(k.foe, 'F5');
    k.bound(() => emit(k.cb, 'move_step', { u: k.foe, from: k.tile('F5'), at: k.tile('E5'), i: 0, route: [], how: 'move', stop: false, cb: k.cb, rng: k.g.rng }));
    expect(answered(k, 'Keep Back')).toBe(0);
  });
  it('once a round: a second enemy walks in freely', () => {
    const f = physFight([{ weapon: 'sabre', known: ['keep_back'] }], [{ at: 'H5', tier: 'elite', weapon: 'sabre' }, { at: 'H3', tier: 'elite', weapon: 'sabre' }]);
    f.put(f.pc, 'D4'); f.turn(f.foe); rig({ hit: false, die: 3 }); f.walk(f.foe, 'C4');
    f.turn(f.foes[1]); f.walk(f.foes[1], 'C3'); expect(answered(f, 'Keep Back')).toBe(1);
  });
  it('a melee stop is not held back by Stopped once (the core sets and checks it only for ranged techniques)', () => {
    const f = fight('sabre'); (f.foe as any).stopped = 1; f.walk(f.foe, 'C4'); expect(d(f)).toBe(1); expect(f.foe.pos).not.toBe(f.tile('C4'));
  });
  it('the same seed gives the same result (the dice come from the game)', () => {
    const a = fight('sabre', ['keep_back'], null, 'KB1'); rig(null); a.walk(a.foe, 'C4');
    const b = fight('sabre', ['keep_back'], null, 'KB1'); rig(null); b.walk(b.foe, 'C4');
    expect(b.foe.pos).toBe(a.foe.pos); expect(b.foe.hp).toBe(a.foe.hp);
  });
  it('refusals: it is a reaction, never used as an action; the pad lists it as built; a preview changes nothing; the glaive lends it', () => {
    const f = fight('sabre'); f.turn(f.pc);
    expect(f.tech('keep_back')).toMatch(/reaction/); expect(f.pc.ap).toBe(6);
    expect(f.pad().flatMap((g) => g.entries).find((x) => x.id === 'keep_back')?.built).toBe(true);
    const before = JSON.stringify(f.cb); expect(f.pv('keep_back').ok).toBe(false); expect(JSON.stringify(f.cb)).toBe(before);
    const g = fight('glaive', []); g.walk(g.foe, 'C4'); expect(answered(g, 'Keep Back')).toBe(1);
  });
});
