// PHC room relay: serves the web game (static assets) and runs one Durable Object per room.
// The host's browser is authoritative (it runs the engine and the Narrator with the host's own key). The room
// object relays guests' actions to the host, delivers each player's filtered view, keeps the latest views and the
// host's save for reconnects, and reports who is online. It never sees an API key.
// A socket that is closing or gone must never stop a message reaching the others (docs/design/handoffs/coop-stall.md):
// every send goes through post(), which never throws.
import { DurableObject } from 'cloudflare:workers';

interface Env { ROOMS: DurableObjectNamespace<Room>; ASSETS?: Fetcher; SITE?: KVNamespace }
interface Tag { pid: string; role: 'host' | 'guest'; name: string }

const CLOSING = 2, CLOSED = 3; // WebSocket.readyState
/** Send to one socket, and never throw. A socket the room has replaced (or whose player has gone without a word) stays
 *  in the room's list, closing, until the other end answers; send() on it throws. That used to end the loop it was in,
 *  so the player's newer socket never got its view and the fight stood still for them. Returns whether it was sent. */
function post(ws: Pick<WebSocket, 'send'>, s: string): boolean {
  try { ws.send(s); return true; } catch { return false; }
}

export default {
  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const m = url.pathname.match(/^\/room\/([A-Z0-9]{6})\/ws$/);
    if (m) {
      if (req.headers.get('Upgrade') !== 'websocket') return new Response('Expected a WebSocket', { status: 426 });
      return env.ROOMS.get(env.ROOMS.idFromName(m[1])).fetch(req);
    }
    if (url.pathname === '/health') return new Response('ok');
    if (url.pathname.startsWith('/hf/')) return hfModel(req, url);
    if (env.ASSETS) return env.ASSETS.fetch(req); // local dev (wrangler.dev.jsonc)
    return serveSite(req, env, ctx);
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

/** The built web game, from Workers KV (uploaded by tools/deploy_site.py), cached at the edge. */
async function serveSite(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
  if (req.method !== 'GET' && req.method !== 'HEAD') return new Response('Method not allowed', { status: 405 });
  const url = new URL(req.url);
  // A versioned asset (?v=<content hash>: the title layers, replaced under the same name) is its own cache entry, so a
  // new picture is never served from the old one's cache; any other query string is ignored.
  const v = (url.searchParams.get('v') || '').replace(/[^\w-]/g, '').slice(0, 32);
  const cache = caches.default, cacheKey = new Request(url.origin + url.pathname + (v ? '?v=' + v : ''), { method: 'GET' });
  const hit = await cache.match(cacheKey);
  if (hit) return hit;
  let key = url.pathname === '/' ? 'index.html' : decodeURIComponent(url.pathname.slice(1));
  let got = await env.SITE!.getWithMetadata<{ ct: string }>(key, 'arrayBuffer');
  if (!got.value && !key.includes('.')) { key = 'index.html'; got = await env.SITE!.getWithMetadata<{ ct: string }>(key, 'arrayBuffer'); }
  if (!got.value) return new Response('Not found', { status: 404 });
  const hashed = /^assets\/index-[\w-]+\.(js|css)$/.test(key) || !!v;
  const res = new Response(got.value, { headers: {
    'content-type': got.metadata?.ct || 'application/octet-stream',
    'cache-control': key === 'index.html' ? 'no-cache' : hashed ? 'public, max-age=31536000, immutable' : 'public, max-age=86400',
    'x-content-type-options': 'nosniff',
  } });
  if (key !== 'index.html') ctx.waitUntil(cache.put(cacheKey, res.clone()));
  return res;
}

export class Room extends DurableObject<Env> {
  async fetch(req: Request): Promise<Response> {
    const url = new URL(req.url);
    const pid = (url.searchParams.get('pid') || '').slice(0, 40), name = (url.searchParams.get('name') || 'Player').slice(0, 40);
    const role = url.searchParams.get('role') === 'host' ? 'host' : 'guest', token = url.searchParams.get('token') || '';
    const pair = new WebSocketPair(), [client, server] = [pair[0], pair[1]];
    if (!pid) { this.ctx.acceptWebSocket(server); server.close(4001, 'Missing player id'); return new Response(null, { status: 101, webSocket: client }); }
    // The first host to connect claims the room; later host connections must bring the same token.
    if (role === 'host') {
      const owner = await this.ctx.storage.get<{ pid: string; token: string }>('owner');
      if (!owner) await this.ctx.storage.put('owner', { pid, token });
      else if (owner.pid !== pid || owner.token !== token) { this.ctx.acceptWebSocket(server); server.close(4003, 'This room already has a host.'); return new Response(null, { status: 101, webSocket: client }); }
    } else {
      const owner = await this.ctx.storage.get<{ pid: string }>('owner');
      if (owner?.pid === pid) { this.ctx.acceptWebSocket(server); server.close(4003, 'You are this room\'s host: open it as the host.'); return new Response(null, { status: 101, webSocket: client }); }
    }
    for (const ws of this.ctx.getWebSockets(pid)) { try { ws.close(4000, 'Replaced by a newer connection'); } catch { /* */ } }
    this.ctx.acceptWebSocket(server, [pid, role]);
    server.serializeAttachment({ pid, role, name } satisfies Tag);
    if (role === 'host') {
      const save = await this.ctx.storage.get('save');
      if (save) post(server, JSON.stringify({ t: 'snapshot', state: save }));
      for (const ws of this.live('guest')) { const a = ws.deserializeAttachment() as Tag | null; if (a) post(server, JSON.stringify({ t: 'presence', pid: a.pid, name: a.name, online: true })); }
      this.toGuests({ t: 'host', online: true });
    } else {
      const view = await this.ctx.storage.get('view:' + pid);
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
        const s = JSON.stringify(m.resync ? { t: 'view', state: m.state, resync: true } : { t: 'view', state: m.state });
        for (const g of this.ctx.getWebSockets(m.pid)) post(g, s);
        await this.ctx.storage.put('view:' + m.pid, m.state);
      } else if (m.t === 'save') {
        await this.ctx.storage.put('save', m.state);
      } else if (m.t === 'err' && typeof m.pid === 'string') {
        for (const g of this.ctx.getWebSockets(m.pid)) post(g, JSON.stringify({ t: 'err', message: m.message, nonce: m.nonce }));
      }
    } else if (m.t === 'act') {
      if (!this.live('host').length) { post(ws, JSON.stringify({ t: 'err', message: 'The host is offline. Your action wasn\'t sent.' })); return; }
      this.toHost({ t: 'act', from: a.pid, action: m.action, nonce: m.nonce });
    } else if (m.t === 'sync') {
      // A guest's check-in: the version of the game it has (m.v). The host answers with the view if that isn't its
      // own (apps/web/src/game/store.ts answerSync); with the host away, the last view the room kept goes out instead.
      if (this.live('host').length) { this.toHost({ t: 'sync', from: a.pid, name: a.name, v: m.v }); return; }
      const view = await this.ctx.storage.get<{ v?: number }>('view:' + a.pid);
      if (view && view.v !== m.v) post(ws, JSON.stringify({ t: 'view', state: view, resync: true }));
    }
  }

  async webSocketClose(ws: WebSocket) {
    const a = ws.deserializeAttachment() as Tag | null;
    if (!a) return;
    if (a.role === 'host') { if (this.live('host').filter((x) => x !== ws).length === 0) this.toGuests({ t: 'host', online: false }); }
    else if (this.live(a.pid).filter((x) => x !== ws).length === 0) this.toHost({ t: 'presence', pid: a.pid, name: a.name, online: false });
  }
  async webSocketError(ws: WebSocket) { await this.webSocketClose(ws); }

  /** The sockets with this tag (a player id, 'host' or 'guest') that are not closing or closed. */
  private live(tag: string): WebSocket[] { return this.ctx.getWebSockets(tag).filter((x) => x.readyState !== CLOSING && x.readyState !== CLOSED); }
  private toHost(m: unknown) { const s = JSON.stringify(m); for (const h of this.ctx.getWebSockets('host')) post(h, s); }
  private toGuests(m: unknown) { const s = JSON.stringify(m); for (const g of this.ctx.getWebSockets('guest')) post(g, s); }
}
