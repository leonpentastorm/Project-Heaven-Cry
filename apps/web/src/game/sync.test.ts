// @vitest-environment jsdom
// Keeping a guest in step (docs/design/handoffs/coop-stall.md): a guest says which version of the game it has every few
// seconds, and the host sends the view again when that is not its own. A view lost on the way no longer leaves the
// guest on an old state until the host's next action (which, in a fight, may be waiting for that very guest).
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { newGame, viewFor } from '@engine';

interface Link { o: any; onMessage: (m: any) => void; onState: (s: string, note?: string) => void; sent: any[]; state: string }
const links: Link[] = [];
vi.mock('./net', () => ({
  connect: (o: any, onMessage: (m: any) => void, onState: (s: string, note?: string) => void) => {
    const link: Link = { o, onMessage, onState, sent: [], state: 'open' }; links.push(link);
    return { get state() { return link.state; }, send: (m: any) => { link.sent.push(m); }, close() { /* */ } };
  },
}));

async function freshStore() {
  vi.resetModules(); links.length = 0; localStorage.clear();
  const store = await import('./store');
  await new Promise((r) => setTimeout(r, 5)); // the store looks for a room to resume a beat after it loads: let that pass
  return store;
}
beforeEach(() => { vi.useRealTimers(); });

describe('a guest checks in with its version', () => {
  it('every 30 s outside a fight, every 5 s in one; never while the link is down', async () => {
    const store = await freshStore();
    store.setName('Mai'); store.joinRoom('ABCDEF');
    const link = links[0], g = newGame('ABCDEF', { id: 'host1', name: 'Leon' });
    link.onState('open');
    link.onMessage({ t: 'view', state: viewFor(g, store.getState().me.id) });
    const t0 = 1_000_000;
    expect(store.syncTick(t0)).toBe(true);
    expect(link.sent.at(-1)).toEqual({ t: 'sync', v: g.v });
    expect(store.syncTick(t0 + store.SYNC_FIGHT_MS + 100), 'not in a fight: too soon').toBe(false);
    expect(store.syncTick(t0 + store.SYNC_IDLE_MS + 100)).toBe(true);
    // a fight is on: the check-in comes every few seconds
    const fight: any = { ...viewFor(g, store.getState().me.id), v: g.v + 1, phase: 'combat', combat: { name: 'Pad', log: ['x'], round: 1, turn: 0, order: [], units: [], fx: [], over: false } };
    link.onMessage({ t: 'view', state: fight });
    const t1 = t0 + store.SYNC_IDLE_MS + 200;
    expect(store.syncTick(t1 + 1000), 'too soon').toBe(false);
    expect(store.syncTick(t1 + store.SYNC_FIGHT_MS)).toBe(true);
    expect(link.sent.at(-1)).toEqual({ t: 'sync', v: g.v + 1 });
    link.state = 'closed';
    const n = link.sent.length;
    expect(store.syncTick(t1 + store.SYNC_FIGHT_MS * 10)).toBe(false);
    expect(link.sent.length).toBe(n);
  });
  it('a view sent as an answer is taken like any other, and counted', async () => {
    const store = await freshStore();
    store.setName('Mai'); store.joinRoom('ABCDEF');
    const link = links[0], g = newGame('ABCDEF', { id: 'host1', name: 'Leon' });
    link.onState('open');
    link.onMessage({ t: 'view', state: viewFor(g, 'x') });
    link.onMessage({ t: 'view', state: { ...viewFor(g, 'x'), v: g.v + 3 }, resync: true });
    expect(store.getState().game!.v).toBe(g.v + 3);
    expect((globalThis as any).__phc.net().resyncs).toBe(1);
  });
});

describe('the host answers a check-in', () => {
  it('the view again for a player on another version; nothing for one in step or for a stranger; a player down as away is back', async () => {
    const store = await freshStore();
    store.setName('Leon'); store.hostRoom('ABCDEF');
    const link = links[0];
    link.onState('open');
    link.onMessage({ t: 'presence', pid: 'guest1', name: 'Mai', online: true });
    await new Promise((r) => setTimeout(r, 5)); // the opening broadcast goes out a beat after the link opens
    const v = (globalThis as any).__phc.net().hostV;
    link.sent.length = 0;
    link.onMessage({ t: 'sync', from: 'guest1', name: 'Mai', v });
    expect(link.sent.filter((m) => m.t === 'view'), 'in step: nothing').toEqual([]);
    link.onMessage({ t: 'sync', from: 'stranger', name: 'X', v: 0 });
    expect(link.sent.filter((m) => m.t === 'view'), 'not in the room: nothing').toEqual([]);
    link.onMessage({ t: 'sync', from: 'guest1', name: 'Mai', v: v - 1 });
    const views = link.sent.filter((m) => m.t === 'view');
    expect(views.length).toBe(1);
    expect(views[0]).toMatchObject({ pid: 'guest1', resync: true }); expect(views[0].state.v).toBe(v);
    // the host has the guest down as away (its return was lost): a check-in brings it back, and everyone gets the view
    link.onMessage({ t: 'presence', pid: 'guest1', name: 'Mai', online: false });
    link.sent.length = 0;
    link.onMessage({ t: 'sync', from: 'guest1', name: 'Mai', v: 0 });
    const back = link.sent.filter((m) => m.t === 'view' && m.pid === 'guest1');
    expect(back.length).toBe(1);
    expect(back[0].state.players.find((p: any) => p.id === 'guest1').online).toBe(true);
  });
});
