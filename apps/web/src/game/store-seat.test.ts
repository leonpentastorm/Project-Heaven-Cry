// A guest's seat token (0.33 review): a browser whose localStorage refuses new writes (full, or blocked) must bring the
// same token after a reload, or the room refuses it its own seat for good (apps/server policy.ts guestSeat).
import { describe, expect, it, vi } from 'vitest';

const kept = new Map<string, string>(); let full = false;
(globalThis as any).localStorage = {
  getItem: (k: string) => kept.get(k) ?? null,
  setItem: (k: string, v: string) => { if (full) throw new Error('QuotaExceededError'); kept.set(k, String(v)); },
  removeItem: (k: string) => { kept.delete(k); },
};
(globalThis as any).location = { search: '', origin: 'http://localhost', protocol: 'http:', host: 'localhost' };
(globalThis as any).addEventListener = () => {};
(globalThis as any).document = { visibilityState: 'visible', addEventListener: () => {} };
const sent: { role: string; token: string; pid: string }[] = [];
vi.mock('./net', () => ({ connect: (o: any) => { sent.push(o); return { send: () => {}, close: () => {}, state: 'open' }; } }));

/** A fresh page: the store module loaded again over the same localStorage. */
async function page() { vi.resetModules(); const s = await import('./store'); await s.loadEngine(); return s; }

describe('a guest\'s seat token', () => {
  it('a player id saved long ago, storage now full: the token after a reload is the one the room keeps', async () => {
    kept.clear(); full = false;
    let s = await page(); s.setName('Guest'); const pid = s.getState().me.id; // phc.me (the id and its seat secret) written while there was room
    full = true; // the storage fills up: nothing new is written from here on
    s.joinRoom('SEATQ1'); const first = sent[sent.length - 1];
    expect(first.pid).toBe(pid); expect(first.token).toMatch(/^\w{16,64}$/);
    expect(kept.has('phc.seattoken.SEATQ1')).toBe(false); // the write failed
    s.joinRoom('SEATQ1'); expect(sent[sent.length - 1].token).toBe(first.token); // the same page: the same token
    s = await page(); s.joinRoom('SEATQ1'); // a reload (Continue, Take over)
    expect(sent[sent.length - 1].pid).toBe(pid); expect(sent[sent.length - 1].token).toBe(first.token);
    s.joinRoom('SEATQ2'); expect(sent[sent.length - 1].token).not.toBe(first.token); // another room, another token
  });
  it('a token a room already keeps (saved before) is brought as it is', async () => {
    kept.clear(); full = false;
    let s = await page(); s.setName('Old'); kept.set('phc.seattoken.SEATQ3', JSON.stringify('abcdefghijkmnpqrstuvw')); // (written as JSON, as store.ts write does)
    s = await page(); s.joinRoom('SEATQ3'); expect(sent[sent.length - 1].token).toBe('abcdefghijkmnpqrstuvw');
  });
});
