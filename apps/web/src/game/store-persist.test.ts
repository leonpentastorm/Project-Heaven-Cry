// The host's save to localStorage: written right after an action has been handled (not inside the click), once for
// several actions run in the same step, and at once when the page is left or the room is closed.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES } from '@engine';

const kept = new Map<string, string>(); let gameWrites = 0; const hooks: Record<string, () => void> = {};
(globalThis as any).localStorage = { getItem: (k: string) => kept.get(k) ?? null, setItem: (k: string, v: string) => { if (k.startsWith('phc.game.')) gameWrites++; kept.set(k, String(v)); }, removeItem: (k: string) => { kept.delete(k); }, clear: () => kept.clear(), key: (i: number) => [...kept.keys()][i] ?? null, get length() { return kept.size; } };
(globalThis as any).location = { search: '', origin: 'http://localhost', protocol: 'http:', host: 'localhost' };
(globalThis as any).addEventListener = (name: string, fn: () => void) => { hooks[name] = fn; }; // the page's own events (pagehide)
vi.mock('./net', () => ({ connect: () => ({ send: () => {}, close: () => {}, state: 'open' }) }));
const store = await import('./store');
const tick = async (n = 2) => { for (let i = 0; i < n; i++) await new Promise((r) => setTimeout(r, 0)); };
const saved = () => JSON.parse(kept.get('phc.game.PSTEST') || 'null');
const sheet = (name: string) => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };

describe('the host\'s save to localStorage', () => {
  it('opening a room writes it at once', async () => {
    store.setName('Host'); store.hostRoom('PSTEST');
    expect(saved()?.code).toBe('PSTEST'); await tick();
  });
  it('an action is saved right after it, not inside it; two actions in one step are one write', async () => {
    const v0 = store.reportState()!.v, w0 = gameWrites;
    store.act({ type: 'char/add', sheet: sheet('One') }); store.act({ type: 'char/add', sheet: sheet('Two') });
    expect(store.reportState()!.v).toBe(v0 + 2);
    expect(saved().v).toBe(v0); expect(gameWrites).toBe(w0); // not yet: the click returns first
    await tick();
    expect(saved().v).toBe(v0 + 2); expect(gameWrites).toBe(w0 + 1);
    expect(Object.keys(saved().characters).length).toBe(2);
  });
  it('leaving the page before the write ran writes it at once; with nothing waiting, leaving writes nothing', async () => {
    const v0 = store.reportState()!.v;
    store.act({ type: 'player/online', id: store.getState().me.id, online: true } as any);
    expect(saved().v).toBe(v0);
    hooks.pagehide(); expect(saved().v).toBe(v0 + 1);
    const w = gameWrites; await tick(); expect(gameWrites).toBe(w); // the waiting write was taken back
    // a save changed from outside (a test, another tab) is not written over by leaving the page
    kept.set('phc.game.PSTEST', JSON.stringify({ ...saved(), marker: 1 })); hooks.pagehide(); expect(saved().marker).toBe(1);
  });
  it('closing the room writes it at once', async () => {
    const v0 = store.reportState()!.v;
    store.act({ type: 'player/online', id: store.getState().me.id, online: true } as any);
    store.leaveRoom();
    expect(saved().v).toBe(v0 + 1);
  });
});
