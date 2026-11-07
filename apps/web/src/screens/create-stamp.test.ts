// The Lock in stamp (screens/create.js): a legal record is stamped APPROVED, then filed after the stamp is seen;
// a refused record gets no stamp, only the reason; a double press files once.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const calls = vi.hoisted(() => ({ go: [] as any[], act: [] as any[], toast: [] as any[], sfx: [] as any[], saved: 0, state: { screen: 'create', code: null as string | null, game: null as any, draft: null } }));
vi.mock('../game/store', () => ({
  getState: () => calls.state, go: (...a: any[]) => { calls.go.push(a); }, act: (a: any) => { calls.act.push(a); }, toast: (...a: any[]) => { calls.toast.push(a); },
  saveToLibrary: () => { calls.saved++; },
}));
vi.mock('../game/sfx', () => ({ sfx: (...a: any[]) => { calls.sfx.push(a); }, reducedMotion: () => false }));
vi.mock('../game/charfile', () => ({ uploadPortrait: () => {}, bigPortrait: (x: string) => x }));
vi.stubGlobal('window', { scrollTo: () => {}, addEventListener: () => {}, removeEventListener: () => {}, location: { search: '', hash: '' } });
vi.stubGlobal('location', { search: '', hash: '' });
const { CreateLogic, STAMP_MS } = await import('./create.js');

/** A Create screen on the Lock in step with a legal build (the Bulwark preset, a kit, a name and an origin). */
function screen() {
  const l: any = new CreateLogic({ sampleName: 'Test', sampleArch: 'bulwark', startStep: 'lockin' });
  l.setState = (x: any) => { l.state = { ...l.state, ...(typeof x === 'function' ? x(l.state) : x) }; };
  return l;
}

describe('the Lock in stamp', () => {
  beforeEach(() => { vi.useFakeTimers(); calls.go = []; calls.act = []; calls.toast = []; calls.sfx = []; calls.saved = 0; calls.state = { screen: 'create', code: null, game: null, draft: null }; });
  afterEach(() => { vi.useRealTimers(); });

  it('a legal record is stamped, thumps, and is filed only after the stamp has been seen', () => {
    const l = screen();
    expect(l.renderVals().cantLock).toBe(false);
    expect(l.renderVals().stamped).toBe(false);
    l.renderVals().lockIn();
    const v = l.renderVals();
    expect(v.stamped).toBe(true);
    expect(v.stampMode).toBe('slam');
    expect(v.lockLabel).toBe('Approved ✓');
    expect(v.sealStyle).toMatch(/opacity: 0$/); // the white seal gives way to the red one
    expect(calls.sfx.map((c) => c[0])).toContain('stamp');
    expect(calls.saved).toBe(1);
    expect(calls.go).toHaveLength(0);
    vi.advanceTimersByTime(STAMP_MS - 50);
    expect(calls.go).toHaveLength(0);
    vi.advanceTimersByTime(60);
    expect(calls.go).toEqual([['home', { draft: null }]]);
  });

  it('a double press files the record once', () => {
    const l = screen();
    l.renderVals().lockIn(); l.renderVals().lockIn(); l.lockIn();
    vi.advanceTimersByTime(STAMP_MS * 3);
    expect(calls.go).toHaveLength(1);
    expect(calls.saved).toBe(1);
    expect(calls.sfx.filter((c) => c[0] === 'stamp')).toHaveLength(1);
  });

  it('in a room lobby the record is brought to the room after the stamp', () => {
    calls.state = { screen: 'create', code: 'ABC123', game: { phase: 'lobby' }, draft: null };
    const l = screen();
    l.renderVals().lockIn();
    expect(calls.act).toHaveLength(0);
    vi.advanceTimersByTime(STAMP_MS + 10);
    expect(calls.act.map((a) => a.type)).toEqual(['char/add']);
    expect(calls.go).toEqual([['room', { draft: null }]]);
  });

  it('a refused record gets no stamp, only the reason', () => {
    const l = screen();
    l.state = { ...l.state, skills: { ...l.state.skills, durability: 10 } }; // over the creation budget: the engine refuses
    l.lockIn();
    expect(l.renderVals().stamped).toBe(false);
    expect(calls.toast).toHaveLength(1);
    expect(calls.sfx.map((c) => c[0])).toEqual(['error']);
    vi.advanceTimersByTime(STAMP_MS * 2);
    expect(calls.go).toHaveLength(0);
    expect(calls.saved).toBe(0);
  });

  it('a player who left the screen during the stamp is not pulled away from where they went', () => {
    const l = screen();
    l.renderVals().lockIn();
    calls.state = { ...calls.state, screen: 'home' };
    vi.advanceTimersByTime(STAMP_MS + 10);
    expect(calls.go).toHaveLength(0);
    expect(calls.toast).toHaveLength(1); // still told it was saved
  });
});
