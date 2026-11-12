// Two crashes found while sweeping every action for the golden tables (docs/design/handoffs/unified-damage-stage-a.md,
// section 6 item 6): Overclock (skill:brain_power.3) and Will Shield (class:guardian.will_shield) threw a TypeError
// ("maxWords" / "costSave" of undefined) when their PREVIEW was asked for a unit with no magic (no Evoker and no
// Emanator in hand: `u.mg` is unset). Their buttons were greyed with the reason all along; the preview ran anyway.
import { describe, it, expect } from 'vitest';
import { previewPerkAction, runPerkAction, RuleError } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

describe('a preview on a unit with no magic refuses with the reason; it never throws', () => {
  const setup = () => {
    const f = fightWith([{ classId: 'guardian', skills: { brain_power: 3, will_power: 3 }, attrs: { intelligence: 3, determination: 3 } }, {}], [{}]);
    const [me, ally] = f.pcs; f.turn(me); delete (me as any).mg;
    return { f, me, ally, who: { u: me, c: f.g.characters[me.charId!], cb: f.cb, g: f.g } };
  };
  it('Overclock: no Evoker, so no preview line and no TypeError', () => {
    const { f, who } = setup();
    withGame(f.g, () => {
      const pv = previewPerkAction(who, 'skill:brain_power.3', { actionId: 'overclock' }, 'combat');
      expect(pv.ok).toBe(false); expect(typeof pv.why).toBe('string'); expect(pv.why).not.toMatch(/undefined|TypeError/);
      expect(runPerkAction(who, 'skill:brain_power.3', { actionId: 'overclock' }, f.g.rng, 'combat')).toBe(pv.why);
    });
  });
  it('Will Shield (on an ally and on yourself): no Soul magic, so refused with the reason', () => {
    const { f, me, ally, who } = setup();
    withGame(f.g, () => {
      for (const [actionId, args] of [['will_shield', { targetId: ally.id }], ['will_shield_self', {}]] as const) {
        const pv = previewPerkAction(who, 'class:guardian.will_shield', { actionId, ...args }, 'combat');
        expect(pv.ok).toBe(false); expect(pv.why).toMatch(/no Soul magic/i);
        expect(runPerkAction(who, 'class:guardian.will_shield', { actionId, ...args }, f.g.rng, 'combat')).toBe(pv.why);
      }
      expect(ally.shield || 0).toBe(0); expect(me.shield || 0).toBe(0);
    });
  });
  it('through the reducer the click is a rule refusal, not a crash', () => {
    const { f, me, ally } = setup();
    for (const a of [{ id: 'skill:brain_power.3', actionId: 'overclock' }, { id: 'class:guardian.will_shield', actionId: 'will_shield', targetId: ally.id }]) {
      let err: any = null; try { f.act({ type: 'combat/perk', unitId: me.id, ...a } as any); } catch (e) { err = e; }
      // (the reducer rebuilds nothing here: the unit it reads still has no magic)
      if (err) expect(err instanceof RuleError || err?.name === 'RuleError').toBe(true);
    }
  });
});
