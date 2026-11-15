// Rules 1.55, 0.28.3-T (the Durability tank; docs/design/proposals/2026-11-tank-fit.md). Through the reducer:
//   T.1 the Guard technique is Durability's own: with a gun in the hand it is on the pad and the reducer takes it
//   T.2 Guard soaks techniques.json rules.guard.soak a point (against a real enemy attack)
//   T.3 while Guard is held, a weapon attack rolls +1 to hit a Durability point above 3, at most +4 (skills.json
//       durability.1): in the attack's own preview (the card) and in the roll the reducer makes; nothing without Guard
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, resolveAttack, previewAttack, SKILL, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const G = phys.PHYS_RULES.guard;
const DOOR: any = (SKILL as any).durability.unlocks['1'].effects[0];
const LABEL = DOOR.label as string;
/** One PC on C5 with `dur` Durability and `weapon`, the foe on D5 (or `foeAt`), the PC's turn. */
function fight(dur: number, o: { weapon?: string; foeAt?: string; foeWeapon?: string; dex?: number } = {}) {
  const f = physFight([{ weapon: o.weapon || 'hellraiser_service_rifle', known: [], skills: { durability: dur, dexterity: o.dex ?? 0, athletics: 0, raw_power: 0 } }], [{ tier: 'soldier', weapon: o.foeWeapon || 'service_pistol' }]);
  f.cb.objects = [];
  f.put(f.pc, 'C5'); const foe = f.put(f.foe, o.foeAt || 'G5'); foe.hp = foe.maxHp = 900;
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
  for (const u of f.cb.units) if (u.side === 'pc') { u.hp = u.maxHp; u.armour = 0; }
  return f;
}
type F = ReturnType<typeof fight>;
const guard = (f: F, n?: number) => { const x = f.unit(f.pc.id); if (n != null) x.res!.guard = n; return x.res?.guard ?? 0; };
/** The to-hit term the Guard door adds to the PC's shot at the foe, as the attack's own preview gives it (0: none). */
const term = (f: F) => f.bound(() => previewAttack(f.cb, f.unit(f.pc.id), f.unit(f.foe.id), 'shot', { free: true })).terms!.find((t) => t.label === LABEL)?.v ?? 0;

describe('T.1 the Guard technique is Durability\'s own, with any weapon', () => {
  it('a rifle\'s pad draws it at Durability 1 and up, and the reducer takes it: Guard every turn', () => {
    const f = fight(7);
    const e = f.pad().flatMap((g) => g.entries).find((x) => x.id === 'guard');
    expect(e).toMatchObject({ ok: true, ap: 1 });
    expect(f.tech('guard')).toBeNull();
    expect(guard(f)).toBe(5); expect(f.unit(f.pc.id).ap).toBe(5);
    expect(f.tech('guard')).toMatch(/already on Guard/); // once a turn
    const none = fight(0); expect(none.pad().flatMap((g) => g.entries).some((x) => x.id === 'guard')).toBe(false);
    expect(none.tech('guard')).not.toBeNull();
  });
});

describe('T.2 Guard soaks rules.guard.soak a point, against a real enemy attack', () => {
  it('the same blow, with 5 Guard and with none: the difference is the points spent × the soak (the last kept back)', () => {
    expect(G.soak).toBe(6);
    const blow = (n: number) => {
      const f = fight(7, { foeAt: 'D5', foeWeapon: 'maul' }); guard(f, n); rig({ hit: true, die: 12 });
      const t = f.unit(f.pc.id), hp = t.hp; f.turn(f.foe);
      f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), t, 'melee', null, { noAp: true }));
      return { lost: hp - f.unit(f.pc.id).hp, left: guard(f) };
    };
    const bare = blow(0), held = blow(5), spent = 5 - held.left;
    expect(bare.lost).toBeGreaterThan(G.soak);
    expect(spent).toBeGreaterThan(0); expect(held.left).toBeGreaterThanOrEqual(G.keep_back);
    expect(held.lost).toBe(Math.max(0, bare.lost - spent * G.soak));
  });
});

describe('T.3 while Guard is held, the tank hits through its door', () => {
  it('the term is +1 a Durability point above 3, at most +4, read from the data', () => {
    const want = (dur: number) => Math.min(DOOR.value.max, Math.max(DOOR.value.min, DOOR.value.base + dur * DOOR.value.per[0].value));
    for (const dur of [1, 3, 4, 5, 7, 9]) { const f = fight(dur); guard(f, 1); expect(term(f), 'Durability ' + dur).toBe(want(dur)); }
    expect(want(7)).toBe(4); expect(want(3)).toBe(0);
  });
  it('only while Guard is held: none at 0 Guard, none for a character with no Durability', () => {
    const f = fight(7); expect(guard(f)).toBe(0); expect(term(f)).toBe(0);
    expect(f.tech('guard')).toBeNull(); expect(term(f)).toBe(4);
    guard(f, 0); expect(term(f)).toBe(0);
    const n = fight(0, { dex: 3 }); expect(term(n)).toBe(0);
  });
  it('the reducer\'s own shot rolls with it (the log\'s modifier is 4 higher holding Guard), damage unchanged', () => {
    const shot = (g: number) => {
      const f = fight(7); guard(f, g); rig({ die: 10 });
      f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
      const line = f.cb.log.find((l) => /fires at/.test(l)) || '', m = /d20 10 ([−+-]\s?\d+)/.exec(line);
      return { mod: m ? Number(m[1].replace('−', '-').replace(/\s/g, '')) : NaN, line };
    };
    const a = shot(0), b = shot(1);
    expect(b.mod - a.mod, a.line + ' / ' + b.line).toBe(4);
  });
});
void ({} as Unit);
