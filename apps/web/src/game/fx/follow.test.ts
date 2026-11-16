// Follow strikes (rules 1.58, hands 5e): which melee events are the off hand's follow, and how each is drawn.
import { describe, it, expect } from 'vitest';
import { followFxOf, FOLLOW_MS } from './follow';

describe('fx/follow: the off hand follow strike', () => {
  it('reads the engine flag on the melee event, keyed by category', () => {
    expect(followFxOf({ k: 'melee', follow: true, cat: 'shield' } as any)).toBe('shield');
    expect(followFxOf({ k: 'melee', follow: true, cat: 'light_melee' } as any)).toBe('blade');
  });
  it('leaves every other event to the base handlers', () => {
    expect(followFxOf({ k: 'melee', cat: 'shield' } as any)).toBeNull();
    expect(followFxOf({ k: 'shot', follow: true } as any)).toBeNull();
  });
  it('comes after the main swing', () => { expect(FOLLOW_MS.delay).toBeGreaterThan(0); });
});
