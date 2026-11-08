// The Proving Ground never calls the Narrator, on any path: the store's gate (maybeNarrate) holds even when a state with
// Narrator work in it arrives, and the multiplayer actions never queue any.
import { describe, expect, it, vi } from 'vitest';

(globalThis as any).location = { search: '', origin: 'http://localhost', protocol: 'http:', host: 'localhost' };
let onMsg: (m: any) => void = () => {};
vi.mock('./net', () => ({ connect: (_o: any, m: (x: any) => void) => { onMsg = m; return { send: () => {}, close: () => {}, state: 'open' }; } }));
const turn = vi.fn(async () => { throw new Error('the Narrator was called'); });
vi.mock('../narrator/anthropic', () => ({ anthropicProvider: () => ({ turn }), scriptedProvider: () => ({ turn }), polish: async () => '', MODELS: [{ id: 'claude-opus-5-5', label: 'Opus', input: 4, output: 20, cacheRead: 0.2, cacheWrite: 5 }] }));
const store = await import('./store');
const tick = () => new Promise((r) => setTimeout(r, 0));

describe('the Narrator in the Proving Ground', () => {
  it('is never called, with friends joining, READY, a fight, and even a state that carries Narrator work', async () => {
    store.setName('Host'); store.setNarrator({ scripted: true });
    store.hostRoom('PGTEST'); await tick();
    store.act({ type: 'sandbox/start', standalone: true }); await tick();
    onMsg({ t: 'presence', pid: 'p2', name: 'Mai', online: true }); await tick();
    const g = store.getState().game!;
    expect(g.sandbox).toBeTruthy(); expect(Object.values(g.characters).map((c) => c.name)).toEqual(['Recruit', 'Recruit 2']);
    store.act({ type: 'sandbox/ready', on: true }); await tick();
    onMsg({ t: 'act', from: 'p2', action: { type: 'sandbox/ready', on: true }, nonce: 'n1' }); await tick();
    store.act({ type: 'sandbox/fight' }); await tick();
    expect(store.getState().game!.phase).toBe('combat');
    // A save that somehow carries Narrator work (an old or hand-edited state): the gate still holds.
    const odd = JSON.parse(JSON.stringify(store.reportState())); odd.v += 100; odd.story.work = { kind: 'round' }; odd.narrator.error = null; odd.narrator.busy = false;
    onMsg({ t: 'snapshot', state: odd }); await tick();
    store.act({ type: 'sandbox/mana', value: 20 }); await tick(); await tick();
    expect(turn).not.toHaveBeenCalled();
    expect(store.reportState()!.narrator.busy).toBe(false);
  });
  it('outside it the same state does call the Narrator (the gate is what stops it)', async () => {
    const st = JSON.parse(JSON.stringify(store.reportState())); st.v += 100; st.sandbox = null; st.phase = 'story'; st.combat = null; st.story.work = { kind: 'round' };
    onMsg({ t: 'snapshot', state: st }); await tick();
    store.act({ type: 'story/unfocus' }); await tick(); await tick();
    expect(turn).toHaveBeenCalled();
  });
});
