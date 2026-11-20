// Rules 1.78 (0.32, the leftovers lane): the client's halves. Each reads the engine's event or view; nothing here
// works out a rule.
//   item 6603  (retired by rules 1.87: no fight is joined after it starts; the alarm keeps its own word and line)
//   item 6604  aim marks: the enemies the side has read aiming at one unit are one crosshair with their count
import { describe, expect, it } from 'vitest';
import { worldWord, worldLine } from './fx/world';
import { classMarks } from './classMarks';

describe('item 6603 (retired by rules 1.87): the alarm', () => {
  it('a plain alarm keeps its word and its line', () => {
    expect(worldWord({ k: 'alarm' } as any)).toBe('ALARM!');
    expect(worldLine({ k: 'alarm' } as any)).toMatch(/alarm is up/);
  });
});

describe('item 6604: aim marks with a count', () => {
  const gun = { id: 'pc-g', side: 'pc', name: 'Gun', pos: '3,9' }, medic = { id: 'pc-m', side: 'pc', name: 'Medic', pos: '2,6' };
  const foe = (id: string, pos: string, target: string | null, kind = 'attack') => ({ id, side: 'foe', name: id, pos, readIntent: { kind, text: 'shoot', targetId: target, by: medic.id } });
  it('two read enemies aiming at the Bonded ally: one crosshair, "◎ 2"; one: "◎"; a move is an arrow, never counted', () => {
    const two = classMarks({ units: [medic, gun, foe('s1', '4,9', gun.id), foe('s2', '9,9', gun.id)] }, 'pc');
    const aim = two['3,9'].marks.filter((m) => m.text.startsWith('◎'));
    expect(aim.map((m) => m.text)).toEqual(['◎ 2']);
    const one = classMarks({ units: [medic, gun, foe('s1', '4,9', gun.id), foe('s2', '9,9', medic.id, 'move')] }, 'pc');
    expect(one['3,9'].marks.filter((m) => m.text.startsWith('◎')).map((m) => m.text)).toEqual(['◎']);
    expect(one['2,6'].marks.map((m) => m.text)).toContain('▸');
  });
});
