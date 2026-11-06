// The Proving Ground's entry points: the title opens a room and goes straight in; nothing waits on a Narrator.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES } from '@engine';

const calls: any[] = [];
let role: string | null = null;
vi.mock('./store', () => ({
  act: (a: any) => calls.push(a), hostRoom: () => { calls.push('hostRoom'); role = 'host'; }, getState: () => ({ role }),
}));
vi.mock('./fx/FxLayer', () => ({ fxBusyUntil: () => 0 }));
vi.mock('./sfx', () => ({ sfx: () => {}, reducedMotion: () => false }));
const { startProvingGround, openProvingGround, QUICK_ARCHETYPES, provingGroundWhy } = await import('./sandbox');

describe('opening the Proving Ground', () => {
  it('from the title: a fresh room, then sandbox/start in the same tick', () => {
    calls.length = 0; role = null;
    startProvingGround('bulwark');
    expect(calls).toEqual(['hostRoom', { type: 'sandbox/start', archetype: 'bulwark' }]);
  });
  it('from the room: the host sends sandbox/start; guests are told the host opens it', () => {
    calls.length = 0; openProvingGround();
    expect(calls).toEqual([{ type: 'sandbox/start' }]);
    expect(provingGroundWhy({ phase: 'lobby' } as any, false)).toMatch(/host/);
    expect(provingGroundWhy({ phase: 'lobby' } as any, true)).toBeNull();
  });
  it('quick test characters are real archetypes', () => {
    expect(QUICK_ARCHETYPES.length).toBeGreaterThan(2);
    for (const id of QUICK_ARCHETYPES) expect(ARCHETYPES.some((a) => a.id === id)).toBe(true);
  });
});
