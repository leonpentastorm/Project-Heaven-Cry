// Rules 1.78 (0.32, the leftovers lane): the client's halves. Each reads the engine's event or view; nothing here
// works out a rule.
//   item 6603  the fight joined: the alarm event with joined draws CONTACT! and says no toast (BATTLE START says it)
import { describe, expect, it } from 'vitest';
import { worldWord, worldLine } from './fx/world';

describe('item 6603: the fight joined', () => {
  it('CONTACT! over the tile, no toast; a plain alarm keeps its word and its line', () => {
    expect(worldWord({ k: 'alarm', joined: true } as any)).toBe('CONTACT!');
    expect(worldLine({ k: 'alarm', joined: true } as any)).toBe('');
    expect(worldWord({ k: 'alarm' } as any)).toBe('ALARM!');
    expect(worldLine({ k: 'alarm' } as any)).toMatch(/alarm is up/);
  });
});
