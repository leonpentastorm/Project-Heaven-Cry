// WebSocket link to the room relay (apps/server). Reconnects with backoff; queues messages while down.
export interface Conn { send(m: any): void; close(): void; state: 'open' | 'closed' | 'error' }
export interface ConnOpts { code: string; pid: string; name: string; role: 'host' | 'guest'; token?: string }

export function connect(o: ConnOpts, onMessage: (m: any) => void, onState: (s: Conn['state'], note?: string) => void): Conn {
  let ws: WebSocket | null = null, closed = false, tries = 0;
  const queue: string[] = [];
  const base = (import.meta as any).env?.VITE_ROOM_URL || (location.protocol === 'https:' ? 'wss://' : 'ws://') + location.host;
  const url = `${base}/room/${o.code}/ws?pid=${encodeURIComponent(o.pid)}&name=${encodeURIComponent(o.name)}&role=${o.role}${o.token ? '&token=' + o.token : ''}`;
  const c: Conn = {
    state: 'closed',
    send(m) { const s = JSON.stringify(m); if (ws && ws.readyState === 1) ws.send(s); else if (queue.length < 200) queue.push(s); },
    close() { closed = true; ws?.close(); },
  };
  const open = () => {
    if (closed) return;
    ws = new WebSocket(url);
    ws.onopen = () => { tries = 0; c.state = 'open'; onState('open'); while (queue.length && ws!.readyState === 1) ws!.send(queue.shift()!); };
    ws.onmessage = (ev) => { try { onMessage(JSON.parse(ev.data)); } catch (e) { console.error(e); } };
    ws.onclose = (ev) => {
      c.state = 'closed';
      if (closed) return;
      if (ev.code === 4001 || ev.code === 4003) { c.state = 'error'; onState('error', ev.reason); return; }
      onState('closed'); setTimeout(open, Math.min(8000, 500 * 2 ** tries++));
    };
    ws.onerror = () => { /* onclose follows */ };
  };
  open();
  setInterval(() => { if (ws && ws.readyState === 1) ws.send('{"t":"ping"}'); }, 25000);
  return c;
}
