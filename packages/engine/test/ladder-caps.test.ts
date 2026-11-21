// 0.31.11: a skill ladder's capped per-point gains (src/ladder.ts ladderCaps). A row that names what it grows stops on
// the last point where the engine's own value still moves; one test per capped row, on characters made through the
// reducer (char/add), so the value read is the one the game plays.
import { describe, expect, it } from 'vitest';
import { ARCHETYPES, apply, newGame, ladderCaps, SKILL, elementalTakenPct, ELEMENTAL_CAP, guardPool, prayerCooldown, classResources, type GameState, type Sheet } from '../src';

const rowOf = (skill: string, grows: string) => (SKILL[skill] as any).per_point.rows.findIndex((r: any) => r.grows === grows);
function made(edit: (c: any) => void = () => {}) {
  const a = ARCHETYPES[0];
  const sheet = { name: 'T', portrait: '', origin: 'x', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any as Sheet;
  let G: GameState = newGame('R', { id: 'h', name: 'H' }, 'ladder');
  G = apply(G, { type: 'char/add', sheet } as any, 'h');
  const c: any = Object.values(G.characters)[0]; edit(c); return c;
}
const at = (c: any, skill: string, n: number) => ({ ...c, skills: { ...c.skills, [skill]: n } });

describe('ladderCaps: a capped per-point row shows only where it still adds', () => {
  it('Pain Threshold: elemental resistance adds on every level to 10 (rules 1.70 item 5540: +6% a point, under the 80% cap)', () => {
    const i = rowOf('pain_threshold', 'elemental_taken'); expect(i).toBeGreaterThanOrEqual(0);
    const per = (SKILL as any).pain_threshold.per_point.numbers.elemental_taken;
    expect(per).toBeCloseTo(0.06);
    expect(ELEMENTAL_CAP).toBeCloseTo(0.8);
    const c = made(), last = ladderCaps('pain_threshold', c)[i];
    expect(last).toBe(10);
    for (let n = 1; n <= last; n++) expect(elementalTakenPct(at(c, 'pain_threshold', n))).toBeGreaterThan(elementalTakenPct(at(c, 'pain_threshold', n - 1)));
    expect(elementalTakenPct(at(c, 'pain_threshold', last))).toBeCloseTo(per * last);
    expect(elementalTakenPct(at(c, 'pain_threshold', last))).toBeLessThanOrEqual(ELEMENTAL_CAP);
    // the engine's cap still holds: a value past it (a point count the ladder never reaches) is held at the cap
    expect(elementalTakenPct(at(c, 'pain_threshold', Math.ceil(ELEMENTAL_CAP / per) + 5))).toBeCloseTo(ELEMENTAL_CAP);
    expect(ladderCaps('pain_threshold', null)[i]).toBe(10);
  });
  it('Durability: Guard plates held stop at the pool\'s cap for a non-Bulwark; a Bulwark\'s own pool moves it', () => {
    const i = rowOf('durability', 'guard_pool'); expect(i).toBeGreaterThanOrEqual(0);
    const c = made((x) => { x.classId = 'marksman'; }), last = ladderCaps('durability', c)[i];
    expect(guardPool(at(c, 'durability', 10))).toBe(guardPool(at(c, 'durability', last))); // rules 1.97 item 8340: the Reach steps (and the family gates) say where it stops
    expect(guardPool(at(c, 'durability', last + 1))).toBe(guardPool(at(c, 'durability', last)));
    expect(guardPool(at(c, 'durability', last))).toBeGreaterThan(guardPool(at(c, 'durability', last - 1)));
    // the Bulwark (id defender): the larger of its class pool and Durability's is what it holds, read the same way
    const b = made((x) => { x.classId = 'defender'; x.level = 3; });
    const own = Math.max(0, ...classResources(at(b, 'durability', 0)).filter((r) => r.id === 'guard').map((r) => r.max));
    const lastB = ladderCaps('durability', b)[i];
    const held = (n: number) => Math.max(guardPool(at(b, 'durability', n)), ...classResources(at(b, 'durability', n)).filter((r) => r.id === 'guard').map((r) => r.max));
    expect(lastB === 0 ? held(10) === held(0) : held(lastB) > held(lastB - 1) && held(10) === held(lastB)).toBe(true);
    if (own > guardPool({ skills: { durability: 10 } })) expect(lastB).toBe(0); // its class holds more than Durability ever adds
  });
  it('Faith: the Hymn wait stops at its floor (the last point where it still shortens, by the character\'s Virtue)', () => {
    const i = rowOf('faith', 'hymn_wait'); expect(i).toBeGreaterThanOrEqual(0);
    for (const virtue of [1, 10]) {
      const c = made((x) => { x.attrs.virtue = virtue; }), last = ladderCaps('faith', c)[i];
      expect(last).toBeGreaterThan(0);
      expect(prayerCooldown(at(c, 'faith', last))).toBeLessThan(prayerCooldown(at(c, 'faith', last - 1)));
      for (let n = last; n <= 10; n++) expect(prayerCooldown(at(c, 'faith', n))).toBe(prayerCooldown(at(c, 'faith', last)));
    }
    // a higher Virtue reaches the floor at a lower Faith
    expect(ladderCaps('faith', made((x) => { x.attrs.virtue = 10; }))[i]).toBeLessThan(ladderCaps('faith', made((x) => { x.attrs.virtue = 1; }))[i]);
  });
  it('a row that names nothing has no cap; only the named rows are read', () => {
    expect(ladderCaps('sensory', null)).toEqual({});
    expect(Object.keys(ladderCaps('pain_threshold', null))).toEqual([String(rowOf('pain_threshold', 'elemental_taken'))]);
  });
});
