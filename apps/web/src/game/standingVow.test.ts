// 0.32 (to-do F), rules 1.72 item 5705: the vow pop-up reads the standing vow the engine carries on the character,
// and sets it through the real action (faith/vow out of a fight); each fight swears it as it starts.
import { describe, expect, it } from 'vitest';
import { setDevotionXp, devotionThreshold } from '@engine';
import '../../../../packages/engine/test/helpers/yard16';
import { storyWith } from '../../../../packages/engine/test/helpers/perkfight';
import { vowPopupView, standingVowAction, swearsVows, vowWords } from './standingVow';

const faithful = (c: any) => { c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.skills.faith = 3; setDevotionXp(c, devotionThreshold(3)); };

describe('the standing vow', () => {
  it('the pop-up asks only the viewer\'s Faithful characters, and is due until each has a choice (unsworn counts)', () => {
    const s = storyWith([{ name: 'Saint' }, { name: 'Doubter' }]);
    const [a, b] = Object.values(s.g.characters) as any[]; faithful(a); b.belief = { kind: 'atheist' };
    expect(swearsVows(s.g, a.id)).toBe(true); expect(swearsVows(s.g, b.id)).toBe(false);
    let v = vowPopupView(s.g, 'host'); expect(v.chars.map((c) => c.name)).toEqual(['Saint']); expect(v.due).toBe(true); expect(v.chars[0].canChange).toBe(true);
    s.act(standingVowAction(a.id, { unsworn: true }) as any); v = vowPopupView(s.g, 'host'); expect(v.due).toBe(false); expect(vowWords(v.chars[0])).toBe('Fighting unsworn');
  });
  it('a Shield vow names the ally; the fight that starts swears it on the ally\'s unit', () => {
    const s = storyWith([{ name: 'Saint', skills: { faith: 3 } } as any, { name: 'Gun' }]);
    const [a, b] = Object.values(s.g.characters) as any[]; faithful(a);
    const shield = vowPopupView(s.g, 'host').chars[0].vows.find((x) => x.needsAlly)!;
    s.act(standingVowAction(a.id, { id: shield.id, allyCharId: b.id }) as any);
    expect(vowWords(vowPopupView(s.g, 'host').chars[0])).toBe('Vow: ' + shield.name + ' (Gun)');
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Vow', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '12,9' }] } } } as any);
    const cb: any = s.g.combat, me = cb.units.find((x: any) => x.charId === a.id), al = cb.units.find((x: any) => x.charId === b.id);
    expect(me.vow).toMatchObject({ id: shield.id, allyId: al.id, state: 'sworn' });
  });
});
