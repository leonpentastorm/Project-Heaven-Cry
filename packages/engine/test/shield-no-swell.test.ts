// Rules 1.57 (A2, Leon, 16 Nov 2026, verbatim: "build the no swell when using a shield rule, not when having guard on,
// when you equip a shield period"). While a character holds a shield in either hand, a held Outburst does not gain its
// stage at the turn start (the swell from HOLDING); the Strain of holding comes as at full stage; a Pump is untouched.
// The condition is the swell row's own slot (soul_modules.json cycle.swell.unless: self_holds {hands: {props:
// [shield]}}), read through the existing predicates. Every step through the reducer: combat/equip, combat/outburst,
// combat/pump, the turn start.
import { describe, expect, it } from 'vitest';
import { d20, gearEntry, SOUL_RULES, swellBlockedWhy, type Combat, type Unit, type OutburstDesign } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

function calmSeed(n = 60): number { for (let s = 1; s < 2000000; s++) { const r = { state: s }; let ok = true; for (let i = 0; i < n && ok; i++) { const v = d20(r); ok = v > 1 && v < 20; } if (ok) return s; } throw new Error('no seed'); }
const SEED = calmSeed();
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];
const LINE = String((SOUL_RULES as any).cycle.swell.unless_text);

/** A Soul caster on its turn with lots of AP and MP and a high Strain limit, the foe far away; `shield` put in a hand
 * through the fight's own gear change (combat/equip, 1 AP). */
function rig(shield: { id: string; to: 'main' | 'off' } | null) {
  const f = fightWith([{ archetype: 'stormcaller', kit: 'soul' }], [{ tier: 'minion' }]);
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = []; cb.mana = 15;
  f.pc.pos = '3,5'; f.foe.pos = '15,10';
  const c = f.g.characters[f.pc.charId!]; c.pack = [...(c.pack || []), { ...gearEntry(shield?.id || 'buckler')! }];
  let u = f.turn(f.pc); u.ap = 60;
  if (shield) { f.act({ type: 'combat/equip', unitId: u.id, item: shield.id, to: shield.to } as any); u = f.unit(f.pc.id); }
  Object.assign(u.mg!, { mp: 9999, mpMax: 9999, strain: 0, strainLimit: 20, freePumps: 0, freePumpsMax: 0, firstUsed: true });
  const id = 'd' + (u.mg!.designs.length + 1); u.mg!.designs.push({ id, name: 'Test', school: 'damage', modules: [] } as unknown as OutburstDesign);
  f.g.rng.state = SEED;
  return { f, id, me: (): Unit => f.unit(f.pc.id) };
}
const begin = (r: ReturnType<typeof rig>) => r.f.act({ type: 'combat/outburst', unitId: r.f.pc.id, design: r.id } as any);
const pump = (r: ReturnType<typeof rig>) => r.f.act({ type: 'combat/pump', unitId: r.f.pc.id } as any);

describe('rules 1.57 (A2): no swell with a shield in hand', () => {
  it('without a shield a held Outburst swells at the next turn start (as before)', () => {
    const r = rig(null); begin(r); expect(r.me().mg!.held!.stage).toBe(0);
    r.f.turn(r.f.pc); expect(r.me().mg!.held!.stage).toBe(1); expect(fx(r.f.cb, 'swell').length).toBe(1);
    expect(withGame(r.f.g, () => swellBlockedWhy(r.f.cb, r.me()))).toBeNull();
  });
  for (const shield of [{ id: 'buckler', to: 'main' as const }, { id: 'riot_shield', to: 'off' as const }]) it('a shield in the ' + shield.to + ' hand: the stage holds, the Strain of holding still comes, and the heart says why', () => {
    const r = rig(shield);
    expect(r.f.g.characters[r.f.pc.charId!][shield.to === 'main' ? 'weapon' : 'offHand'] as any).toEqual(shield.to === 'main' ? shield.id : expect.objectContaining({ id: shield.id }));
    begin(r); const m = r.me().mg!; expect(m.held!.stage).toBe(0); m.strain = 4; m.cast = true;
    expect(withGame(r.f.g, () => swellBlockedWhy(r.f.cb, r.me()))).toBe(LINE);
    r.f.turn(r.f.pc);
    expect(r.me().mg!.held!.stage).toBe(0); expect(fx(r.f.cb, 'swell').length).toBe(0);
    // turn start −1, then the Strain of holding one more turn (soul_modules.json cycle.swell_strain), as at full stage
    expect(r.me().mg!.strain).toBe(4 - 1 + (SOUL_RULES as any).cycle.swell_strain);
    expect(r.f.cb.log.some((l) => l.includes('holds at stage 0') && l.includes(LINE.replace(/\.$/, '')))).toBe(true);
  });
  it('a Pump still raises the stage with a shield in hand (free or with AP: untouched)', () => {
    const r = rig({ id: 'buckler', to: 'main' }); begin(r); const ap = r.me().ap;
    pump(r); expect(r.me().mg!.held!.stage).toBe(1); expect(r.me().ap).toBe(ap - (SOUL_RULES as any).cycle.pump_ap);
    r.f.turn(r.f.pc); expect(r.me().mg!.held!.stage).toBe(1); // and still no swell
    r.me().ap = 60; pump(r); expect(r.me().mg!.held!.stage).toBe(2);
  });
  it('putting the shield away lets the heart swell again (it is the hands, not Guard)', () => {
    const r = rig({ id: 'buckler', to: 'main' }); begin(r);
    r.f.act({ type: 'combat/stow', unitId: r.f.pc.id, slot: 'main' } as any);
    r.f.turn(r.f.pc); expect(r.me().mg!.held!.stage).toBe(1);
  });
});
