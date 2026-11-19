// PHC room relay: serves the web game (static assets) and runs one Durable Object per room.
// The host's browser is authoritative (it runs the engine and the Narrator with the host's own key). The room
// object relays guests' actions to the host, delivers each player's filtered view, keeps the latest views and the
// host's save for reconnects, and reports who is online. It never sees an API key.
// A socket that is closing or gone must never stop a message reaching the others (docs/design/handoffs/coop-stall.md):
// every send goes through post(), which never throws.
// The site's files are Workers Static Assets (0.33; wrangler.jsonc "assets"): the Worker runs first only for /room/*,
// /health and /hf/* (run_worker_first); everything else is served by the asset layer, cached headers from
// apps/web/public/_headers. The site used to be KV (tools/deploy_site.py before 0.33).
import { DurableObject } from 'cloudflare:workers';
import { tokenOk, guestSeat, placeFor, alarmPlan, FLUSH_MS } from './policy';

interface Env { ROOMS: DurableObjectNamespace<Room>; ASSETS: Fetcher }
interface Tag { pid: string; role: 'host' | 'guest'; name: string }

const CLOSING = 2, CLOSED = 3; // WebSocket.readyState
/** Send to one socket, and never throw. A socket the room has replaced (or whose player has gone without a word) stays
 *  in the room's list, closing, until the other end answers; send() on it throws. That used to end the loop it was in,
 *  so the player's newer socket never got its view and the fight stood still for them. Returns whether it was sent. */
function post(ws: Pick<WebSocket, 'send'>, s: string): boolean {
  try { ws.send(s); return true; } catch { return false; }
}

export default {
  async fetch(req: Request, env: Env): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/room\/([A-Z0-9]{6})\/ws$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      // A host's link makes the room near the host when it is the first (a hint is used only by an object's first get)
      const hint = url.searchParams.get('role') === 'host' ? placeFor((req as any).cf) : undefined;
      return env.ROOMS.get(env.ROOMS.idFromName(m[1]), hint ? { locationHint: hint } : undefined).fetch(req);
    }
    if (url.pathname === '/health') return new Response('ok');
    if (url.pathname.startsWith('/hf/')) return hfModel(req, url);
    return env.ASSETS.fetch(req);
  },
} satisfies ExportedHandler<Env>;

/** The Narrator's voice model (Kokoro), fetched from Hugging Face by the Worker and passed on from this origin, so a
 * browser never talks to Hugging Face itself (blocked networks, content blockers, CORS). Only that one model repo is
 * served; the edge caches each file. */
const HF_ALLOWED = /^\/hf\/onnx-community\/Kokoro-82M-v1\.0-ONNX\/resolve\/[\w.-]+\/[\w./-]+$/;
async function hfModel(req: Request, url: URL): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  if (!HF_ALLOWED.test(url.pathname) || url.pathname.includes('..')) return new Response('Not found', { status: 404 });
  const upstream = 'https://huggingface.co/' + url.pathname.slice(4);
  const headers: Record<string, string> = {};
  const range = req.headers.get('range'); if (range) headers.range = range;
  const r = await fetch(upstream, { method: req.method, headers, redirect: 'follow', cf: { cacheEverything: true, cacheTtl: 60 * 60 * 24 * 30 } } as RequestInit);
  const out = new Headers();
  for (const h of ['content-type', 'content-length', 'content-range', 'accept-ranges', 'etag', 'last-modified']) { const v = r.headers.get(h); if (v) out.set(h, v); }
  out.set('cache-control', r.ok ? 'public, max-age=2592000' : 'no-store');
  return new Response(r.body, { status: r.status, headers: out });
}

export class Room extends DurableObject<Env> {
  /** Views and the save waiting to be written (FLUSH_MS after the first; the alarm writes them). A view a guest needs is
   *  read from here first. Lost if the object is evicted before the alarm: the host sends a view again on the guest's
   *  next check-in (store.ts answerSync) and a save every 1.5 s, and keeps its own copy (IndexedDB). */
  private pending = new Map<string, unknown>();
  private flushAt = 0;
  /** When the room passed each guest action to the host (its clock), by nonce, to stamp the host's answer with the
   *  room-to-host-and-back time (leg) for the guest's delay reading (netStats.ts). Kept for the last 64 actions. */
  private acts = new Map<string, number>();

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    // The link's ping is answered by the runtime without waking the room: the ping line (netStats.ts) reads the time
    // to the room from it. The exact text is the client's PING (net.ts).
    ctx.setWebSocketAutoResponse(new WebSocketRequestResponsePair('{"t":"ping"}', '{"t":"pong"}'));
  }

  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pid = (url.searchParams.get('pid') || '').slice(0, 40), name = (url.searchParams.get('name') || 'Player').slice(0, 40);
    const role = url.searchParams.get('role') === 'host' ? 'host' : 'guest', token = url.searchParams.get('token');
    const pair = new WebSocketPair(), [client, server] = [pair[0], pair[1]];
    const refuse = (code: number, why: string) => { this.ctx.acceptWebSocket(server); server.close(code, why); return new Response(null, { status: 101, webSocket: client }); };
    if (!pid) return refuse(4001, 'Missing player id');
    // The first host to connect claims the room with its token; later host connections must bring the same token.
    if (role === 'host') {
      const owner = await this.ctx.storage.get<{ pid: string; token: string }>('owner');
      if (!owner) { if (!tokenOk(token)) return refuse(4001, 'This browser sent no host key: reload the page.'); await this.ctx.storage.put('owner', { pid, token }); }
      else if (owner.pid !== pid || owner.token !== token) return refuse(4003, 'This room already has a host.');
    } else {
      const owner = await this.ctx.storage.get<{ pid: string }>('owner');
      if (owner?.pid === pid) return refuse(4003, "You are this room's host: open it as the host.");
      const key = 'seat:' + pid, seat = guestSeat(await this.ctx.storage.get<string>(key), token);
      if (seat === 'refuse') return refuse(4003, 'That seat in this room belongs to another browser.');
      if (seat === 'claim') await this.ctx.storage.put(key, token);
    }
    for (const ws of this.ctx.getWebSockets(pid)) { try { ws.close(4000, 'Replaced by a newer connection'); } catch { /* */ } }
    this.ctx.acceptWebSocket(server, [pid, role]);
    server.serializeAttachment({ pid, role, name } satisfies Tag);
    await this.ctx.storage.put('seen', Date.now());
    await this.arm();
    if (role === 'host') {
      const save = this.pending.get('save') ?? await this.ctx.storage.get('save');
      if (save) post(server, JSON.stringify({ t: 'snapshot', state: save }));
      for (const ws of this.live('guest')) { const a = ws.deserializeAttachment() as Tag | null; if (a) post(server, JSON.stringify({ t: 'presence', pid: a.pid, name: a.name, online: true })); }
      this.toGuests({ t: 'host', online: true });
    } else {
      const view = this.pending.get('view:' + pid) ?? await this.ctx.storage.get('view:' + pid);
      if (view) post(server, JSON.stringify({ t: 'view', state: view }));
      const hostOn = this.live('host').length > 0;
      post(server, JSON.stringify({ t: 'host', online: hostOn }));
      this.toHost({ t: 'presence', pid, name, online: true });
    }
    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, raw: string | ArrayBuffer) {
    if (typeof raw !== 'string' || raw.length > 2_000_000) return;
    const a = ws.deserializeAttachment() as Tag | null;
    if (!a) return;
    let m: any; try { m = JSON.parse(raw); } catch { return; }
    if (m.t === 'ping') return;
    if (a.role === 'host') {
      if (m.t === 'view' && typeof m.pid === 'string') {
        // resync: the host's answer to a guest's check-in (below), marked so the guest can count them
        // rt: when the room passed it on (its clock), for the hop timings (coop-loop.mjs, netStats.ts)
        // ack, hostMs, leg: the answer to a guest's action (its nonce), the host's own time on it, and the room's time
        // from passing the action on to this answer (netStats.ts splits the delay into its parts with them)
        const out: any = { t: 'view', state: m.state, rt: Date.now() };
        if (m.resync) out.resync = true;
        if (typeof m.ack === 'string') {
          out.ack = m.ack; if (typeof m.hostMs === 'number') out.hostMs = m.hostMs;
          const at = this.acts.get(m.ack); if (at != null) { out.leg = out.rt - at; this.acts.delete(m.ack); }
        }
        const s = JSON.stringify(out);
        for (const g of this.ctx.getWebSockets(m.pid)) post(g, s);
        this.keep('view:' + m.pid, m.state);
      } else if (m.t === 'save') {
        this.keep('save', m.state);
      } else if (m.t === 'err' && typeof m.pid === 'string') {
        const out: any = { t: 'err', message: m.message, nonce: m.nonce };
        if (typeof m.nonce === 'string') { const at = this.acts.get(m.nonce); if (at != null) { out.leg = Date.now() - at; this.acts.delete(m.nonce); } }
        const s = JSON.stringify(out);
        for (const g of this.ctx.getWebSockets(m.pid)) post(g, s);
      }
    } else if (m.t === 'act') {
      if (!this.live('host').length) { post(ws, JSON.stringify({ t: 'err', message: "The host is offline. Your action wasn't sent.", nonce: m.nonce })); return; }
      const rt = Date.now();
      if (typeof m.nonce === 'string') { this.acts.set(m.nonce, rt); if (this.acts.size > 64) { const first = this.acts.keys().next().value; if (first != null) this.acts.delete(first); } }
      this.toHost({ t: 'act', from: a.pid, action: m.action, nonce: m.nonce, rt });
    } else if (m.t === 'sync') {
      // A guest's check-in: the version of the game it has (m.v). The host answers with the view if that isn't its
      // own (apps/web/src/game/store.ts answerSync); with the host away, the last view the room kept goes out instead.
      if (this.live('host').length) { this.toHost({ t: 'sync', from: a.pid, name: a.name, v: m.v }); return; }
      const view = (this.pending.get('view:' + a.pid) ?? await this.ctx.storage.get('view:' + a.pid)) as { v?: number } | undefined;
      if (view && view.v !== m.v) post(ws, JSON.stringify({ t: 'view', state: view, resync: true }));
    }
  }

  async webSocketClose(ws: WebSocket) {
    const a = ws.deserializeAttachment() as Tag | null;
    if (!a) return;
    if (a.role === 'host') { if (this.live('host').filter((x) => x !== ws).length === 0) this.toGuests({ t: 'host', online: false }); }
    else if (this.live(a.pid).filter((x) => x !== ws).length === 0) this.toHost({ t: 'presence', pid: a.pid, name: a.name, online: false });
    // the last one out: what waits is written now, not on the alarm
    if (this.ctx.getWebSockets().every((x) => x === ws || x.readyState === CLOSING || x.readyState === CLOSED)) await this.flush();
  }
  async webSocketError(ws: WebSocket) { await this.webSocketClose(ws); }

  /** The alarm: write what waits; then empty a room nobody has opened for PURGE_MS, or ring again (policy.ts). */
  async alarm() {
    await this.flush();
    const seen = (await this.ctx.storage.get<number>('seen')) ?? 0;
    const plan = alarmPlan({ now: Date.now(), seen, live: this.live('host').length + this.live('guest').length });
    if (plan.purge) { await this.ctx.storage.deleteAlarm(); await this.ctx.storage.deleteAll(); this.pending.clear(); return; }
    if (plan.next != null && !this.flushAt) await this.ctx.storage.setAlarm(plan.next);
  }

  /** Keep a view or the save, to be written on the alarm (coalesced: the latest of each key is written once). */
  private keep(key: string, value: unknown) {
    this.pending.set(key, value);
    if (!this.flushAt) { this.flushAt = Date.now() + FLUSH_MS; void this.ctx.storage.setAlarm(this.flushAt); }
  }
  private async flush() {
    this.flushAt = 0;
    if (!this.pending.size) return;
    const batch = Object.fromEntries(this.pending), keys = Object.keys(batch); this.pending.clear();
    for (let i = 0; i < keys.length; i += 128) await this.ctx.storage.put(Object.fromEntries(keys.slice(i, i + 128).map((k) => [k, batch[k]]))); // put() takes 128 keys at most
  }
  /** A room always has an alarm: an earlier flush's, or the purge's (rooms from before 0.33 get theirs here). */
  private async arm() { if (!this.flushAt && (await this.ctx.storage.getAlarm()) == null) await this.ctx.storage.setAlarm(Date.now() + FLUSH_MS); }

  /** The sockets with this tag (a player id, 'host' or 'guest') that are not closing or closed. */
  private live(tag: string): WebSocket[] { return this.ctx.getWebSockets(tag).filter((x) => x.readyState !== CLOSING && x.readyState !== CLOSED); }
  private toHost(m: unknown) { const s = JSON.stringify(m); for (const h of this.ctx.getWebSockets('host')) post(h, s); }
  private toGuests(m: unknown) { const s = JSON.stringify(m); for (const g of this.ctx.getWebSockets('guest')) post(g, s); }
}
