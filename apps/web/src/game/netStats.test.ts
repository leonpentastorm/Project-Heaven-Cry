// @vitest-environment jsdom
// The room link's delay reading and the guest's "sending" mark (0.33, ROADMAP "Multiplayer input delay"), through the
// real store: a guest's act goes out with a nonce and shows the mark; the host's answer carries the nonce back (ack)
// with its own time; the room's stamp (leg) splits the guest's delay into its parts; a refusal ends the mark too. And
// a guest brings its seat token (0.33 server fixes), the same one each time it comes back.
import { describe, expect, it, vi } from 'vitest';
import { ARCHETYPES, newGame, viewFor, type Sheet } from '@engine';
import { netLineText } from './NetLine';
import { tokenOk, guestSeat, placeFor, alarmPlan, PURGE_MS } from '../../../server/src/policy';

interface Link { o: any; onMessage: (m: any, bytes?: number) => void; onState: (s: string, note?: string) => void; sent: any[]; state: string }
const links: Link[] = [];
vi.mock('./net', () => ({
  connect: (o: any, onMessage: (m: any, bytes?: number) => void, onState: (s: string, note?: string) => void) => {
    const link: Link = { o, onMessage, onState, sent: [], state: 'open' }; links.push(link);
    return { get state() { return link.state; }, send: (m: any) => { link.sent.push(m); return JSON.stringify(m).length; }, close() { /* */ } };
  },
  hop: () => {},
}));

async function fresh() {
  vi.resetModules(); links.length = 0; localStorage.clear();
  const store = await import('./store'), stats = await import('./netStats'); await store.loadEngine(); // (the engine loads on demand since 0.33: in before the room is opened, as on a page that has warmed it)
  await new Promise((r) => setTimeout(r, 5));
  return { store, stats };
}
const sheet = (name: string): Sheet => { const a = ARCHETYPES[0]; return { name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'medic', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...a.cores }, identity: {} } as any; };

describe('a guest action, timed', { timeout: 30_000 }, () => {
  it('sends a nonce, shows the mark where it pressed, and reads the answer into its parts', async () => {
    const { store, stats } = await fresh();
    store.setName('Mai'); store.joinRoom('ABCDEF');
    const link = links[0], g = newGame('ABCDEF', { id: 'host1', name: 'Leon' });
    link.onState('open'); link.onMessage({ t: 'view', state: viewFor(g, store.getState().me.id) });
    stats.notePoint(120, 80);
    store.act({ type: 'story/pass' } as any);
    const sent = link.sent.find((m) => m.t === 'act');
    expect(sent.nonce).toMatch(/^\w{6}$/);
    expect(stats.pendingNow()).toMatchObject({ nonce: sent.nonce, kind: 'story/pass', x: 120, y: 80 });
    link.onMessage({ t: 'view', state: { ...viewFor(g, store.getState().me.id), v: g.v + 1 }, ack: sent.nonce, leg: 300, hostMs: 20, rt: 1 }, 5000);
    expect(stats.pendingNow(), 'the answer ends the mark').toBeNull();
    const s = stats.netSummary();
    expect(s.last).toMatchObject({ kind: 'story/pass', leg: 300, hostMs: 20, bytes: 5000 });
    expect(s.lastParts).toMatchObject({ hostLink: 280, host: 20 });
    expect(s.lastParts!.you).toBe(Math.max(0, s.last!.total - 300));
    // the bundle carries the samples with their parts
    expect(stats.netReport().acts[0]).toMatchObject({ hostLink: 280, host: 20 });
  });
  it('a refusal ends the mark and is kept as refused; a lost link ends it too', async () => {
    const { store, stats } = await fresh();
    store.setName('Mai'); store.joinRoom('ABCDEF');
    const link = links[0];
    link.onState('open');
    store.act({ type: 'story/pass' } as any);
    const n1 = link.sent.find((m) => m.t === 'act').nonce;
    link.onMessage({ t: 'err', message: 'No.', nonce: n1, leg: 90 });
    expect(stats.pendingNow()).toBeNull();
    expect(stats.netSummary().last).toMatchObject({ refused: true, leg: 90 });
    store.act({ type: 'story/pass' } as any);
    expect(stats.pendingNow()).not.toBeNull();
    link.onState('closed');
    expect(stats.pendingNow()).toBeNull();
  });
  it('a guest brings a seat token, the same one when it joins again', async () => {
    const { store } = await fresh();
    store.setName('Mai'); store.joinRoom('ABCDEF'); store.joinRoom('ABCDEF');
    expect(tokenOk(links[0].o.token)).toBe(true);
    expect(links[1].o.token).toBe(links[0].o.token);
  });
});

describe('the host answers with the nonce and its time', { timeout: 30_000 }, () => {
  it('the acting guest\'s view carries ack and hostMs; a refusal goes back with the nonce', async () => {
    const { store, stats } = await fresh();
    store.setName('Leon'); store.hostRoom('ABCDEF');
    const link = links[0]; link.onState('open');
    link.onMessage({ t: 'presence', pid: 'guest1', name: 'Mai', online: true });
    link.onMessage({ t: 'presence', pid: 'guest2', name: 'Bo', online: true });
    await new Promise((r) => setTimeout(r, 5));
    link.sent.length = 0;
    link.onMessage({ t: 'act', from: 'guest1', action: { type: 'char/add', sheet: sheet('Wren') }, nonce: 'abc123', rt: 1 });
    const views = link.sent.filter((m) => m.t === 'view');
    const mine = views.find((m) => m.pid === 'guest1'), other = views.find((m) => m.pid === 'guest2');
    expect(mine).toMatchObject({ ack: 'abc123' }); expect(typeof mine.hostMs).toBe('number');
    expect(other.ack, 'only the acting player\'s view answers it').toBeUndefined();
    expect(stats.netSummary().host.answers).toBe(1);
    link.sent.length = 0;
    link.onMessage({ t: 'act', from: 'guest1', action: { type: 'player/kick', id: 'guest2' }, nonce: 'def456', rt: 2 });
    expect(link.sent.find((m) => m.t === 'err')).toMatchObject({ pid: 'guest1', nonce: 'def456' });
  });
});

describe('the ping line\'s words', () => {
  const base = { ping: 182, pingMedian: 180, last: null, lastParts: null, actMedian: null, actions: 0, host: { answers: 0, lastMs: 0, lastBytes: 0 } };
  it('a guest: the room, the last action and its parts', () => {
    expect(netLineText('guest', base as any)).toBe('LINK · room 182 ms');
    const last = { at: 0, kind: 'x', total: 2410, leg: 1950, hostMs: 12, bytes: 1 };
    expect(netLineText('guest', { ...base, last, lastParts: { you: 460, hostLink: 1938, host: 12 }, actMedian: 2300, actions: 4 } as any))
      .toBe('LINK · room 182 ms · last action 2.41 s (you–room 460 ms · room–host 1.94 s · host 12 ms) · usual 2.30 s');
  });
  it('the host: its own time answering', () => {
    expect(netLineText('host', { ...base, host: { answers: 3, lastMs: 14, lastBytes: 48_000 } } as any)).toBe('LINK · room 182 ms · answering a guest 14 ms, 47 KB');
  });
});

describe('the room server\'s rules (apps/server/src/policy.ts)', () => {
  it('tokens: 16 to 64 word characters', () => {
    expect(tokenOk('')).toBe(false); expect(tokenOk(null)).toBe(false); expect(tokenOk('short')).toBe(false);
    expect(tokenOk('a'.repeat(24))).toBe(true); expect(tokenOk('a'.repeat(65))).toBe(false); expect(tokenOk('a'.repeat(20) + '&x=1')).toBe(false);
  });
  it('a guest seat: claimed by the first token, kept by it; a link with no token only while the seat has none', () => {
    const t = 'k'.repeat(24);
    expect(guestSeat(undefined, t)).toBe('claim');
    expect(guestSeat(undefined, null)).toBe('ok');
    expect(guestSeat(t, t)).toBe('ok');
    expect(guestSeat(t, 'z'.repeat(24))).toBe('refuse');
    expect(guestSeat(t, null)).toBe('refuse');
  });
  it('placement: the host\'s continent, split east and west where Cloudflare has two', () => {
    expect(placeFor({ continent: 'NA', longitude: '-122.4' })).toBe('wnam');
    expect(placeFor({ continent: 'NA', longitude: '-74' })).toBe('enam');
    expect(placeFor({ continent: 'AS', longitude: '105.8' })).toBe('apac');
    expect(placeFor({ continent: 'EU', longitude: '2.3' })).toBe('weur');
    expect(placeFor({ continent: 'EU', longitude: '30' })).toBe('eeur');
    expect(placeFor(undefined)).toBeUndefined();
  });
  it('the alarm: a room in use rings again later; an idle one is emptied after PURGE_MS', () => {
    expect(alarmPlan({ now: 1000, seen: 0, live: 1 })).toEqual({ purge: false, next: 1000 + PURGE_MS });
    expect(alarmPlan({ now: 1000, seen: 500, live: 0 })).toEqual({ purge: false, next: 500 + PURGE_MS });
    expect(alarmPlan({ now: PURGE_MS + 600, seen: 500, live: 0 })).toEqual({ purge: true, next: null });
  });
});
