// Rules 1.55 items 71 to 75 (the Durability tank; docs/design/proposals/2026-11-tank-fit.md). Through the reducer:
//   T.1 the Guard technique is Durability's own: with a gun in the hand it is on the pad and the reducer takes it
//   T.2 Guard soaks techniques.json rules.guard.soak a point (against a real enemy attack)
//   T.3 while Guard is held, a weapon attack rolls with Durability's modifier in place of the weapon skill's when it is
//       higher (skills.json durability.1, op roll_with): in the roll the reducer makes, the attack's preview and the gear card
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, resolveAttack, previewAttack, gearPreview, mod, SKILL, type Unit } from '../src';
import { physFight, rig } from './helpers/physfight';

beforeEach(() => rig(null));
const G = phys.PHYS_RULES.guard;
const DOOR: any = (SKILL as any).durability.unlocks['1'].effects[0];
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

describe('T.1 the Guard technique is Durability\'s own, with any weapon', () => {
  it('a rifle\'s pad draws it at Durability 1 and up, and the reducer takes it: Guard every turn', () => {
    const f = fight(7);
    const e = f.pad().flatMap((g) => g.entries).find((x) => x.id === 'guard');
    expect(e).toMatchObject({ ok: true, ap: 1 });
    expect(f.tech('guard')).toBeNull();
    expect(guard(f)).toBe(G.max); expect(f.unit(f.pc.id).ap).toBe(5);
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

describe('T.3 while Guard is held, the tank rolls with Durability (op roll_with, never on top of the weapon skill)', () => {
  // the attack's own modifier, as the reducer rolls it (the log's d20 line), holding `g` Guard
  const shot = (dur: number, g: number, dex = 0) => {
    const f = fight(dur, { dex }); guard(f, g); rig({ die: 10 });
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
    const line = f.cb.log.find((l) => /fires at/.test(l)) || '', m = /d20 10 ([−+-]\s?\d+)/.exec(line);
    return m ? Number(m[1].replace('−', '-').replace(/\s/g, '')) : NaN;
  };
  const gain = (dur: number, dex = 0) => shot(dur, 1, dex) - shot(dur, 0, dex);
  it('the data: roll_with Durability, if higher, while the holder has Guard', () => {
    expect(DOOR).toMatchObject({ op: 'roll_with', when: 'attack', skill: 'durability', if_higher: true, if: { self_has_res: ['guard'] } });
  });
  it('Durability 7, weapon skill 0, holding Guard: the shot rolls with Durability (its modifier in place of the weapon skill)', () => {
    expect(gain(7)).toBe(mod(7) - mod(0));
  });
  it('Durability 7, weapon skill 7: no change (it never stacks)', () => { expect(gain(7, 7)).toBe(0); });
  it('Durability 1, weapon skill 0: the better of the two (a 1-point dip gives a 1-point roll)', () => { expect(gain(1)).toBe(mod(1) - mod(0)); expect(mod(1)).toBeGreaterThan(mod(0)); });
  it('without Guard: the weapon skill (the skill term of the preview, no "Hits with" term)', () => {
    const f = fight(7); expect(guard(f)).toBe(0);
    const t = f.bound(() => previewAttack(f.cb, f.unit(f.pc.id), f.unit(f.foe.id), 'shot', { free: true })).terms!;
    expect(t.some((x) => /^Hits with/.test(x.label))).toBe(false);
    guard(f, 1);
    const h = f.bound(() => previewAttack(f.cb, f.unit(f.pc.id), f.unit(f.foe.id), 'shot', { free: true })).terms!;
    expect(h.find((x) => /^Hits with/.test(x.label))?.label).toBe('Hits with: ' + (SKILL as any).durability.name + ' (' + DOOR.label + ')');
    expect(h.some((x) => x.label === 'skill')).toBe(false);
  });
  it('an enemy unit is unaffected: its shot at the tank rolls the same whether the tank holds Guard or not', () => {
    const foeShot = (g: number) => {
      const f = fight(7, { foeAt: 'G5' }); guard(f, g); rig({ die: 10 });
      f.turn(f.foe); f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(f.pc.id), 'shot', null, { noAp: true }));
      const line = f.cb.log.filter((l) => /d20 10/.test(l)).pop() || '', m = /d20 10 ([−+-]\s?\d+)/.exec(line);
      return m ? Number(m[1].replace('−', '-').replace(/\s/g, '')) : NaN;
    };
    const a = foeShot(0); expect(Number.isNaN(a)).toBe(false); expect(foeShot(1)).toBe(a);
  });
  it('the gear card says what the attack would roll with: "Hits with: Durability (holding Guard)"', () => {
    const f = fight(7), c = f.char(f.pc), p = f.bound(() => gearPreview(c, { id: 'hellraiser_service_rifle' }));
    expect(p.lines.find((l) => l.key === 'hits_with_alt')?.value).toBe((SKILL as any).durability.name + ' (' + DOOR.label + ') · +' + mod(7));
    const g = fight(7, { dex: 7 }), q = g.bound(() => gearPreview(g.char(g.pc), { id: 'hellraiser_service_rifle' }));
    expect(q.lines.some((l) => l.key === 'hits_with_alt')).toBe(false); // not higher: no line
  });
});
void ({} as Unit);
