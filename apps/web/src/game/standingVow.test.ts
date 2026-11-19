// 0.32 (to-do F): the vow pop-up's standing vow, sworn for the player through faith/vow at a fight's start.
import { describe, expect, it, beforeEach } from 'vitest';
import { setDevotionXp, devotionThreshold } from '@engine';
import '../../../../packages/engine/test/helpers/yard16';
import { fightWith, storyWith } from '../../../../packages/engine/test/helpers/perkfight';
import { vowPopupView, setStandingVow, vowActionFor, clearStandingVows, swearsVows } from './standingVow';

const faithful = (c: any) => { c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.skills.faith = 3; setDevotionXp(c, devotionThreshold(3)); };
beforeEach(() => clearStandingVows());

describe('the standing vow', () => {
  it('the pop-up asks only the viewer\'s Faithful characters, and is due until each has a choice (unsworn counts)', () => {
    const s = storyWith([{ name: 'Saint' }, { name: 'Doubter' }]);
    const [a, b] = Object.values(s.g.characters) as any[]; faithful(a); b.belief = { kind: 'atheist' };
    expect(swearsVows(s.g, a.id)).toBe(true); expect(swearsVows(s.g, b.id)).toBe(false);
    let v = vowPopupView(s.g, 'host'); expect(v.chars.map((c) => c.name)).toEqual(['Saint']); expect(v.due).toBe(true);
    setStandingVow(s.g, a.id, { unsworn: true }); v = vowPopupView(s.g, 'host'); expect(v.due).toBe(false);
  });
  it('at a fight\'s start the standing vow is the real faith/vow (Shield names the ally\'s unit), and the engine takes it', () => {
    const f = fightWith([{ name: 'Saint', skills: { faith: 3 } }, { name: 'Gun' }], [{ at: 'F6' }]);
    const c: any = f.g.characters[f.pc.charId!]; faithful(c);
    const shield = (vowPopupView(f.g, 'host').chars[0].vows.find((x) => x.needsAlly))!;
    const ally: any = f.pcs[1];
    setStandingVow(f.g, c.id, { id: shield.id, allyCharId: ally.charId });
    const me = f.turn(f.pc), a = vowActionFor(f.g, f.cb, me)!;
    expect(a).toEqual({ type: 'faith/vow', unitId: me.id, id: shield.id, allyId: ally.id });
    f.act(a as any);
    expect(f.unit(me.id).vow).toMatchObject({ id: shield.id, allyId: ally.id, state: 'sworn' });
    setStandingVow(f.g, c.id, { unsworn: true }); expect(vowActionFor(f.g, f.cb, me)).toBeNull();
  });
});
