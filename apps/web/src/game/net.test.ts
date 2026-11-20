// @vitest-environment jsdom
// The room link's three faults (docs/design/handoffs/0.32-COOP.md, item 2): (a) a link the room replaced (close 4000:
// the same player opened the room in another tab) stops for good instead of taking the room back, so two tabs no longer
// kick each other for ever; (b) a closed link leaves no keep-alive and no retry running; (c) a page that hosts or joins
// again closes its old link first.
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

class FakeWS {
  static all: FakeWS[] = [];
  readyState = 0; sent: string[] = []; url: string;
  onopen: (() => void) | null = null; onmessage: ((e: { data: string }) => void) | null = null;
  onclose: ((e: { code: number; reason: string }) => void) | null = null; onerror: (() => void) | null = null;
  constructor(url: string) { this.url = url; FakeWS.all.push(this); }
  send(s: string) { this.sent.push(s); }
  close() { this.readyState = 3; }
  /** the server side */ open() { this.readyState = 1; this.onopen?.(); }
  drop(code: number, reason = '') { this.readyState = 3; this.onclose?.({ code, reason }); }
}

beforeEach(() => { FakeWS.all = []; vi.stubGlobal('WebSocket', FakeWS as any); vi.useFakeTimers(); });
afterEach(() => { vi.useRealTimers(); vi.unstubAllGlobals(); });

const opts = { code: 'ABCDEF', pid: 'p1', name: 'Mai', role: 'guest' as const };

describe('the room link (net.ts)', () => {
  it('a link closed by an ordinary drop tries again, with its back-off', async () => {
    const { connect } = await import('./net');
    const states: string[] = [];
    connect(opts, () => {}, (s) => states.push(s));
    FakeWS.all[0].open(); FakeWS.all[0].drop(1006);
    expect(states).toEqual(['open', 'closed']);
    vi.advanceTimersByTime(600);
    expect(FakeWS.all.length, 'a second socket after the back-off').toBe(2);
  });
  it('(a) replaced by another tab (4000): it stops, says so, and never takes the room back by itself', async () => {
    const { connect } = await import('./net');
    const states: [string, string?][] = [];
    const c = connect(opts, () => {}, (s, n) => states.push([s, n]));
    FakeWS.all[0].open(); FakeWS.all[0].drop(4000, 'Replaced by a newer connection');
    expect(states.at(-1)).toEqual(['replaced', 'Replaced by a newer connection']);
    expect(c.state).toBe('replaced');
    vi.advanceTimersByTime(60_000);
    expect(FakeWS.all.length, 'no new socket: the other tab keeps the room').toBe(1);
    expect(vi.getTimerCount(), 'no keep-alive left running').toBe(0);
  });
  it('refused (4001, 4003): it stops as before', async () => {
    const { connect } = await import('./net');
    for (const code of [4001, 4003]) {
      FakeWS.all = [];
      const states: string[] = [];
      connect(opts, () => {}, (s) => states.push(s));
      FakeWS.all[0].drop(code, 'no');
      vi.advanceTimersByTime(60_000);
      expect(states).toEqual(['error']);
      expect(FakeWS.all.length).toBe(1);
    }
    expect(vi.getTimerCount()).toBe(0);
  });
  it('(b) close() clears the keep-alive and a retry that was waiting', async () => {
    const { connect } = await import('./net');
    const c = connect(opts, () => {}, () => {});
    FakeWS.all[0].open();
    expect(vi.getTimerCount(), 'the keep-alive').toBe(1);
    vi.advanceTimersByTime(5_000);
    expect(FakeWS.all[0].sent).toContain('{"t":"ping"}');
    FakeWS.all[0].drop(1006); // a retry is now waiting
    expect(vi.getTimerCount()).toBe(2);
    c.close();
    expect(vi.getTimerCount(), 'nothing left running').toBe(0);
    vi.advanceTimersByTime(60_000);
    expect(FakeWS.all.length, 'the waiting retry never opened a socket').toBe(1);
  });
  it('an old socket\'s late close never moves a link that has a newer one', async () => {
    const { connect } = await import('./net');
    const states: string[] = [];
    connect(opts, () => {}, (s) => states.push(s));
    const first = FakeWS.all[0]; first.open(); first.drop(1006);
    vi.advanceTimersByTime(600); FakeWS.all[1].open();
    first.drop(4000); // the room closing the first socket, heard late
    expect(states.at(-1)).toBe('open');
  });
});

describe('(c) hosting or joining again closes the old link (store.ts)', { timeout: 30_000 }, () => {
  it('joinRoom twice: the first link is closed, its socket and keep-alive gone', async () => {
    vi.useRealTimers();
    vi.resetModules(); localStorage.clear();
    const store = await import('./store');
    await new Promise((r) => setTimeout(r, 5));
    store.setName('Mai');
    store.joinRoom('ABCDEF');
    const first = FakeWS.all.at(-1)!; const closeSpy = vi.spyOn(first, 'close');
    store.joinRoom('GHJKLM');
    expect(closeSpy).toHaveBeenCalled();
    first.drop(1006); // its close, heard: the old link must not try again
    await new Promise((r) => setTimeout(r, 700));
    expect(FakeWS.all.filter((w) => w.url.includes('/ABCDEF/')).length, 'the old room is not opened again').toBe(1);
    store.hostRoom('NPQRST');
    expect(FakeWS.all.at(-2)!.readyState, 'joining, then hosting: the guest link is closed').toBe(3);
  });
});
