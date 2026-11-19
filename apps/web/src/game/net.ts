// WebSocket link to the room relay (apps/server). Reconnects with backoff; queues messages while down.
// It stops for good (no more tries) when the room refuses it (4001 no player id, 4003 not the host) or replaces it
// (4000: the same player connected again, from another tab or browser). Two tabs of one player used to take the room
// from each other for ever, each one's retry closing the other; now the replaced one stops and the player chooses
// (App.tsx: "Opened in another tab", Take over here).
import { sentPing, gotPong } from './netStats';
export interface Conn { /** returns the message's length (characters) */ send(m: any): number; close(): void; state: 'open' | 'closed' | 'error' | 'replaced' }
export interface ConnOpts { code: string; pid: string; name: string; role: 'host' | 'guest'; token?: string }
/** The room's close codes: replaced by a newer link of the same player; refused (no player id, not the host). */
export const CLOSE_REPLACED = 4000, CLOSE_REFUSED = [4001, 4003];
/** The keep-alive is also the ping line's ping (netStats.ts): the room answers this exact text with PONG itself, without
 *  waking (apps/server setWebSocketAutoResponse). Every PING_MS while the link is open (0.33: was 25 s, keep-alive only). */
export const PING = '{"t":"ping"}', PONG = '{"t":"pong"}', PING_MS = 5000;
/** The link's hops, for the co-op loop suite (apps/web/e2e/coop-loop.mjs): when a page has set window.__phcHops to an
 *  array, every message out and in is stamped there (its kind, nonce, version, the relay's own stamp, the time). Off,
 *  it costs one property read a message. */
export function hop(dir: string, m: any) {
  const h = (globalThis as any).__phcHops; if (!Array.isArray(h) || !m || m.t === 'ping' || m.t === 'pong' || h.length >= 50000) return;
  h.push({ dir, t: m.t, nonce: m.nonce, v: m.state?.v ?? m.v, pid: m.pid ?? m.from, rt: m.rt, at: performance.timeOrigin + performance.now() });
}

export function connect(o: ConnOpts, onMessage: (m: any, bytes: number) => void, onState: (s: Conn['state'], note?: string) => void): Conn {
  let ws: WebSocket | null = null, closed = false, tries = 0;
  let retry: ReturnType<typeof setTimeout> | null = null;
  const queue: string[] = [];
  const base = (import.meta as any).env?.VITE_ROOM_URL || (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  const url = `${base}/room/${o.code}/ws?pid=${encodeURIComponent(o.pid)}&name=${encodeURIComponent(o.name)}&role=${o.role}${o.token ? '&token=' + encodeURIComponent(o.token) : ''}`;
  // The keep-alive and the next try's timer are both cleared when the link ends: a closed link leaves nothing running
  // (a page that hosted or joined twice kept the first link's ping, and its retries reopened it).
  const ping = setInterval(() => { if (ws && ws.readyState === 1) { sentPing(); ws.send(PING); } }, PING_MS);
  const stop = () => { closed = true; clearInterval(ping); if (retry != null) { clearTimeout(retry); retry = null; } };
  const c: Conn = {
    state: 'closed',
    send(m) { hop('out', m); const s = JSON.stringify(m); if (ws && ws.readyState === 1) ws.send(s); else if (queue.length < 200) queue.push(s); return s.length; },
    close() { stop(); c.state = 'closed'; ws?.close(); },
  };
  const open = () => {
    retry = null;
    if (closed) return;
    const me = new WebSocket(url); ws = me;
    me.onopen = () => { if (ws !== me || closed) return; tries = 0; c.state = 'open'; onState('open'); while (queue.length && me.readyState === 1) me.send(queue.shift()!); };
    me.onmessage = (ev) => { if (ws !== me || closed) return; if (ev.data === PONG) { gotPong(); return; } let m: any; try { m = JSON.parse(ev.data); } catch (e) { console.error(e); return; } hop('in', m); try { onMessage(m, typeof ev.data === 'string' ? ev.data.length : 0); } catch (e) { console.error(e); } };
    me.onclose = (ev) => {
      if (closed || ws !== me) return;
      c.state = 'closed';
      if (CLOSE_REFUSED.includes(ev.code)) { stop(); c.state = 'error'; onState('error', ev.reason); return; }
      if (ev.code === CLOSE_REPLACED) { stop(); c.state = 'replaced'; onState('replaced', ev.reason); return; }
      onState('closed'); retry = setTimeout(open, Math.min(8000, 500 * 2 ** tries++));
    };
    me.onerror = () => { /* onclose follows */ };
  };
  open();
  return c;
}
