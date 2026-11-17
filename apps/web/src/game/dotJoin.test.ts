import { describe, expect, it } from 'vitest';
import { dotJoin } from './dotJoin';
describe('dotJoin (rules 1.66 item 5209)', () => {
  it('says a reason once', () => {
    expect(dotJoin('Jammed: clear it first.', 'Jammed: clear it first.')).toBe('Jammed: clear it first.');
    expect(dotJoin('Jammed: clear it first.', 'Jammed: clear it first')).toBe('Jammed: clear it first.');
    expect(dotJoin('No stims left.', 'Heal an ally.')).toBe('No stims left. · Heal an ally.');
    expect(dotJoin('', 'Heal an ally.', null)).toBe('Heal an ally.');
  });
});
