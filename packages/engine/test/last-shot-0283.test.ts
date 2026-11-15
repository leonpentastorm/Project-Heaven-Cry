// 0.28.3 (Leon's playtest of 15 Nov 2026: "it always tanks the last shot"): a hit a protection holds at its floor
// reports the damage that landed (0), never the damage it would have done. Played through the reducer: a real Burst.
import { describe, it, expect } from 'vitest';
import { fightWith } from './helpers/perkfight';
import { healthView, RULES } from '../src';

describe('a held hit reports what it took', () => {
  it('a Burst at a full-HP Elite of your level: the guard leaves it on 1 HP and the next roll says 0 damage, not the roll\'s number', () => {
    const f = fightWith([{ level: 6, weapon: 'hellraiser_service_rifle' }], [{ tier: 'elite', level: 6 }]);
    const put = (u: any, x: number, y: number) => { u.pos = x + ',' + y; };
    f.turn(f.pc); put(f.pc, 3, 5); put(f.foe, 6, 5); f.pc.attack = 60; f.pc.dmgMult = 500; f.foe.def = 1; f.pc.ap = 9; f.pc.ammo = 30;
    const n0 = f.cb.log.length, fx0 = (f.cb.fx || []).length, hp0 = f.foe.hp;
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'burst' } as any);
    expect(f.foe.hp).toBe(1); expect(f.foe.dead).toBeFalsy();
    const shots = (f.cb.fx || []).slice(fx0).filter((e: any) => e.k === 'shot' && e.target === f.foe.id && e.hit);
    expect(shots.length).toBeGreaterThanOrEqual(2);
    // every number shown adds up to the HP the Elite lost
    expect(shots.reduce((t: number, e: any) => t + e.dmg, 0)).toBe(hp0 - 1);
    const held = f.cb.log.slice(n0).filter((l) => / · no damage/.test(l));
    expect(held.length).toBeGreaterThan(0);
    for (const l of held) expect(l).toMatch(/, 0 damage/);
  });
});

describe("rules 1.55 item 29: an un-Analyzed creature's health is one word of the data's ladder, never a bar", () => {
  const L = (RULES as any).combat.health_look;
  it('the ladder is data: five words, their thresholds and tones, provisional', () => {
    expect(L.ladder.map((r: any) => r.word)).toEqual(['unhurt', 'scratched', 'hurt', 'badly hurt', 'near death']);
    expect(L.ladder.filter((r: any) => !r.full).map((r: any) => r.above)).toEqual([0.75, 0.5, 0.25, 0]);
    expect(L.provisional).toBe(true); expect(L.step).toBeUndefined();
  });
  it('a 140 HP foe hit for 43 three times reads hurt (69%), badly hurt (39%), near death (8%); no bar', () => {
    const f = fightWith([{}], [{ tier: 'soldier' }]); const foe = f.foe; foe.maxHp = 140; foe.hp = 140; delete (foe as any).analyzedBy;
    expect(healthView(foe)).toEqual({ known: false, pct: null, word: 'unhurt', short: 'ok', tone: 'calm', full: true });
    const seen = [97, 54, 11].map((hp) => { foe.hp = hp; return healthView(foe); });
    expect(seen.map((v) => v.word)).toEqual(['hurt', 'badly hurt', 'near death']);
    // rules 1.55 item 43: each rung's short form is the data's (the map token's chip when two would collide)
    expect(seen.map((v) => v.short)).toEqual(L.ladder.slice(2).map((r: any) => r.short)); expect(seen.some((v) => v.full)).toBe(false);
    expect(seen.every((v) => v.pct === null && !v.known)).toBe(true);
    // the thresholds are the data's: each rung's own edge, and full HP only for the first
    const at = (hp: number) => { foe.hp = hp; return healthView(foe).word; };
    expect([139, 106, 105, 71, 70, 36, 35, 1].map(at)).toEqual(['scratched', 'scratched', 'hurt', 'hurt', 'badly hurt', 'badly hurt', 'near death', 'near death']);
  });
  it('through the reducer: real shots at an un-Analyzed Soldier walk it down the ladder to the kill, never back up', () => {
    const f = fightWith([{ weapon: 'hellraiser_service_rifle' }], [{ tier: 'soldier', classic: true }]);
    const put = (u: any, x: number, y: number) => { u.pos = x + ',' + y; };
    f.turn(f.pc); put(f.pc, 3, 5); put(f.foe, 6, 5); f.foe.def = 1; f.foe.maxHp = 400; f.foe.hp = 400; f.foe.armour = 0;
    const order = L.ladder.map((r: any) => r.word), words: string[] = [healthView(f.foe).word];
    for (let i = 0; i < 30 && !f.foe.dead; i++) {
      f.pc.ap = 9; f.pc.ammo = 30; f.pc.attack = 60; f.pc.jammed = false;
      f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
      const v = healthView(f.foe); if (f.foe.dead) { expect(v.word).toBe(L.dead); break; }
      expect(v.pct).toBeNull(); expect(order.indexOf(v.word)).toBeGreaterThanOrEqual(order.indexOf(words[words.length - 1])); words.push(v.word);
    }
    expect(f.foe.dead).toBe(true); expect(new Set(words).size).toBeGreaterThan(2);
  });
  it('an Analyzed foe and the squad read exactly, as before (the bar and the number)', () => {
    const f = fightWith([{}], [{ tier: 'soldier' }]); const foe = f.foe; foe.maxHp = 140; foe.hp = 11; foe.analyzedBy = 'Tester';
    expect(healthView(foe)).toMatchObject({ known: true, pct: 11 / 140 * 100 });
    f.pc.hp = f.pc.maxHp - 1; expect(healthView(f.pc)).toMatchObject({ known: true, pct: (f.pc.maxHp - 1) / f.pc.maxHp * 100 });
  });
});
