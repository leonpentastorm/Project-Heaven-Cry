// The 0.32 merge: fixes from the review of the shared step (Step 2), each through the reducer or the engine's own
// answers to the screens. M2: seen_range is read wherever a unit is looked at (the Overwatch trigger, the AI's eyes).
import { describe, it, expect } from 'vitest';
import './helpers/yard16';
import { fightWith, withGame } from './helpers/perkfight';
import { perceivedFoes } from '../src';
import { applyCond } from '../src/magic';
import CONDS from '../../../data/conditions.json';

const seenOf = (id: string): number => ((CONDS as any).items.find((c: any) => c.id === id).effects.find((e: any) => e.stat === 'seen_range')).value;

describe('M2: the looked-at unit is named wherever eyes are asked (seen_range, rules 1.70 item 5545)', () => {
  /** A PC `d` tiles from a soldier holding a shot on overwatch, open ground; `cond` laid on the PC first. */
  function rig(d: number, cond: string | null) {
    const f = fightWith([{ name: 'Sneak' }], [{ tier: 'soldier', at: '14,5' }]);
    f.cb.objects = []; const foe = f.unit(f.foe.id); foe.pos = (2 + d) + ',5'; foe.vision = 12;
    const u = f.turn(f.pc); f.unit(u.id).pos = '2,5'; f.unit(u.id).ap = 6;
    if (cond) withGame(f.g, () => applyCond(f.cb, f.g.rng, null, f.unit(u.id), cond, 3, undefined, { skipSave: true }));
    f.unit(foe.id).overwatch = 'shot';
    return { f, u: f.unit(u.id), foe: f.unit(foe.id) };
  }
  it('a foe\'s held Overwatch does not fire on a mover at the edge whose seen range is lowered (Dimmed); a plain mover there is shot', () => {
    const d = 12 + seenOf('dimmed') + 1; // inside the foe's 12, outside 12 less Dimmed's
    for (const cond of [null, 'dimmed']) {
      const r = rig(d, cond), n = r.f.cb.log.length;
      r.f.act({ type: 'combat/move', unitId: r.u.id, to: '1,5' } as any);
      const fired = r.f.cb.log.slice(n).join(' ').includes('fires from overwatch');
      expect(fired, String(cond)).toBe(cond === null);
    }
  });
  it('a Prone character at the edge of a foe\'s eyes is not among the foes the AI perceives (its target list); standing there it is', () => {
    const d = 12 + seenOf('prone') + 1;
    for (const prone of [false, true]) {
      const r = rig(d, null); r.f.unit(r.foe.id).overwatch = null;
      if (prone) r.f.act({ type: 'combat/prone', unitId: r.u.id } as any);
      const seen = withGame(r.f.g, () => perceivedFoes(r.f.cb, r.f.unit(r.foe.id)).map((x) => x.id));
      expect(seen.includes(r.u.id), 'prone ' + prone).toBe(!prone);
    }
  });
});

describe("m1: each Call once a turn for every Call paid in AP, an ally's windows included (rules 1.70 item 5535)", () => {
  it("a Rally made in an ally's On My Mark window is refused again in the same turn's Supreme Command window, under 10 points", () => {
    const f = fightWith([{ name: 'Officer', perks: { on_my_mark: 'mastered', supreme_command: 'mastered' } }, { name: 'Speaker', skills: { charisma: 5 } }, { name: 'Third' }], [{ at: '14,9' }]);
    const [off, sp, third] = f.pcs; f.unit(off.id).pos = '2,7'; f.unit(sp.id).pos = '2,5'; f.unit(third.id).pos = '3,5';
    f.turn(f.unit(off.id));
    f.act({ type: 'combat/perk', unitId: off.id, id: 'on_my_mark', targetId: sp.id } as any);
    expect(f.cb.window?.kind).toBe('On My Mark');
    f.act({ type: 'combat/call', unitId: sp.id, id: 'call.rally', targetId: third.id } as any);
    expect(f.cb.window).toBeUndefined();
    f.act({ type: 'combat/perk', unitId: off.id, id: 'supreme_command' } as any);
    while (f.cb.window && f.cb.window.queue[0]?.unitId !== sp.id) { const id = f.cb.window.queue[0].unitId, ch = f.unit(id).charId; f.act({ type: 'combat/decline', unitId: id } as any, ch ? f.g.characters[ch].owner : 'host'); }
    expect(f.cb.window?.queue[0]?.unitId).toBe(sp.id);
    expect(() => f.act({ type: 'combat/call', unitId: sp.id, id: 'call.rally', targetId: off.id } as any)).toThrow(/once a turn/);
  });
});
