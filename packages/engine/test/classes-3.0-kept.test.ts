// Classes 3.0 step 4 (rules 1.29 section 2; docs/design/rev4-moves-and-rename.md section 1): the classes that keep
// their mechanic, each made a little better. Numbers are read from the data, never typed here.
//   Bulwark (defender): a fight starts with Guard (Brace's combat_start item op).
//   Breaker (fighter): once a turn, the first hit on a Shaken or Frightened enemy gives Momentum (Lunge's hit item op),
//     with any weapon.
//   Sigilist (mage) and Channeler: unchanged (their moves are as before; the Sigilist's only change, BLIND / SLOW /
//     MUDDLE back to the common list, is the Rigger's move leaving: another step).
import { describe, expect, it } from 'vitest';
import { CLASS, CLASS_MOVE_POOL, applyCond, resolveAttack, d20 } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';

const cls = (id: string, n: number, extra: CharSpec = {}): CharSpec => ({ ...extra, classId: id, level: 12, attrs: { [CLASS[id].attribute]: n, ...(extra.attrs || {}) } });
/** The item op in a pool move's data that carries the change (by its trigger and resource). */
const opOf = (key: string, when: string, res: string) => (CLASS_MOVE_POOL[key].effects as any[]).find((e) => e.when === when && e.op === 'resource' && e.resource === res);
const START_GUARD = opOf('defender.brace', 'combat_start', 'guard');
const SHAKEN_MOMENTUM = opOf('fighter.lunge', 'hit', 'momentum');
function rngFor(...ns: number[]): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }

describe('Bulwark: a fight starts with Guard (rules 1.29 section 2)', () => {
  it('the data: one item op on Brace (the Bulwark\'s rank I move), combat_start, Guard', () => {
    expect(START_GUARD).toBeTruthy(); expect(START_GUARD.value).toBeGreaterThan(0);
    expect(CLASS.defender.ranks.I.moves.map((m: any) => m.key)).toContain('class:defender.brace');
  });
  it('a Bulwark at every rank holds that Guard when the fight starts; no other class does', () => {
    for (const n of [3, 5, 8]) { const f = fightWith([cls('defender', n)], [{}]); expect(f.pc.res!.guard, 'rank at ' + n).toBe(START_GUARD.value); }
    for (const id of Object.keys(CLASS).filter((k) => k !== 'defender')) { const f = fightWith([cls(id, 8)], [{}]); expect(f.pc.res?.guard ?? 0, id).toBe(0); }
  });
  it('the Guard soaks a hit as any Guard does, and the cap is the class\'s (the start never passes it)', () => {
    const f = fightWith([cls('defender', 8)], [{}]);
    expect(f.pc.res!.guard).toBeLessThanOrEqual(f.pc.resMax!.guard);
  });
});

describe('Breaker: Momentum on a Shaken or Frightened enemy, once a turn, any weapon (rules 1.29 section 2)', () => {
  it('the data: one item op on Lunge (the Breaker\'s rank I move): hit, own turn, hostile, target Shaken or Fear, once a turn', () => {
    expect(SHAKEN_MOMENTUM).toBeTruthy();
    expect(SHAKEN_MOMENTUM.if).toEqual({ own_turn: true, hostile: true, target_has: ['shaken', 'fear'] });
    expect(SHAKEN_MOMENTUM.limit).toEqual({ per: 'per_turn', n: 1 });
    expect(SHAKEN_MOMENTUM.if.melee).toBeUndefined(); expect(SHAKEN_MOMENTUM.if.mode).toBeUndefined(); // weapon-neutral (audit 3.2: keep it so)
  });
  /** The Breaker's Momentum after its hits on its own turn (cond on the target first, or none). */
  function momentumAfter(weapon: string, mode: 'melee' | 'shot', cond: string | null, hits: number, classId = 'fighter'): number {
    const f = fightWith([cls(classId, 8, { weapon })], [{}]);
    const u = f.turn(f.pc), t = f.foe; f.unit(t.id).pos = mode === 'melee' ? '5,2' : '9,2'; f.unit(u.id).pos = '4,2';
    t.hp = t.maxHp = 9999; f.unit(u.id).attack = 60; f.unit(u.id).ap = 9; if (f.unit(u.id).res?.momentum != null) f.unit(u.id).res!.momentum = 0; // from 0, so the cap never hides a gain
    f.g.rng.state = rngFor(15, 14, 13);
    withGame(f.g, () => {
      if (cond) applyCond(f.cb, f.g.rng, f.unit(u.id), f.unit(t.id), cond, 3, undefined, { skipSave: true });
      for (let i = 0; i < hits; i++) { const r = resolveAttack(f.cb, f.g.rng, f.unit(u.id), f.unit(t.id), mode, f.g.characters[f.unit(u.id).charId!]); expect(r.refused, 'hit ' + i).toBeFalsy(); }
    });
    return f.unit(u.id).res?.momentum ?? 0;
  }
  it('a blow on a Shaken enemy gives the data\'s Momentum on top of the plain hit\'s; the second hit that turn does not', () => {
    const plain1 = momentumAfter('sabre', 'melee', null, 1), shaken1 = momentumAfter('sabre', 'melee', 'shaken', 1);
    expect(shaken1 - plain1).toBe(SHAKEN_MOMENTUM.value);
    const plain2 = momentumAfter('sabre', 'melee', null, 2), shaken2 = momentumAfter('sabre', 'melee', 'shaken', 2);
    expect(shaken2 - plain2).toBe(SHAKEN_MOMENTUM.value); // once a turn
  });
  it('a shot from a rifle on a Frightened enemy gives it too (weapon-neutral)', () => {
    expect(momentumAfter('hellraiser_service_rifle', 'shot', 'fear', 1) - momentumAfter('hellraiser_service_rifle', 'shot', null, 1)).toBe(SHAKEN_MOMENTUM.value);
  });
  it('another class gets nothing for the same hit', () => {
    expect(momentumAfter('sabre', 'melee', 'shaken', 1, 'defender')).toBe(momentumAfter('sabre', 'melee', null, 1, 'defender'));
  });
});

describe('Sigilist and Channeler keep their moves (rules 1.29 section 2)', () => {
  it('their ranks list the same six moves each (by key)', () => {
    expect(['I', 'II', 'III'].flatMap((r) => CLASS.mage.ranks[r].moves.map((m: any) => m.key))).toEqual(['class:mage.barrage', 'class:mage.core_change', 'class:mage.overcharge', 'class:mage.bleed_the_flux', 'class:mage.payload', 'class:scribe.stored_spell']);
    expect(['I', 'II', 'III'].flatMap((r) => CLASS.channeler.ranks[r].moves.map((m: any) => m.key))).toEqual(['class:channeler.shape', 'class:channeler.iron_heart', 'class:channeler.storm_front', 'class:channeler.occult_library', 'class:channeler.heart_surge', 'class:channeler.eye_of_the_storm']);
  });
});
