// The room link's delay, measured where it happens (0.33, ROADMAP "Multiplayer input delay"). Every guest action is
// timed from its send to the host's answer (the view that carries its nonce back as `ack`, or the refusal), and split
// into its parts without comparing two computers' clocks:
//   total   the guest's clock: sent -> answer received;
//   leg     the room's clock: action passed to the host -> the host's answer back at the room (the server's `leg`);
//   hostMs  the host's clock: action received -> its answer sent (the engine and the views);
//   so you <-> room (both ways) = total - leg, and room <-> host (both ways) = leg - hostMs.
// The ping (net.ts, every PING_MS) is answered by the room itself without waking it: the time to the room and back.
// Read on screen (NetLine.tsx) and in the Report a problem bundle (report.tsx `net`). The client decides no rule here:
// `pending` is only what the guest's screen shows while its click is on the way (the "sending" mark).

export interface ActSample { at: number; kind: string; total: number; leg?: number; hostMs?: number; bytes: number; refused?: boolean }
export interface Pending { nonce: string; kind: string; at: number; x?: number; y?: number }

const KEEP = 60;
let acts: ActSample[] = [];
let pings: number[] = [];
let pingSentAt = 0;
const out = new Map<string, { at: number; kind: string }>();
let pending: Pending | null = null;
let host = { answers: 0, lastMs: 0, lastBytes: 0 };
let lastPoint: { x: number; y: number; at: number } | null = null;
const subs = new Set<() => void>();
const tell = () => { for (const f of subs) f(); };
export const subscribeNet = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Where the player last pressed (the "sending" mark is drawn there). Set by a page-wide pointerdown listener. */
export function notePoint(x: number, y: number) { lastPoint = { x, y, at: now() }; }
if (typeof addEventListener === 'function') addEventListener('pointerdown', (e: PointerEvent) => notePoint(e.clientX, e.clientY), { capture: true, passive: true });

/** A guest sent an action. */
export function sentAct(nonce: string, kind: string) {
  const t = now(); out.set(nonce, { at: t, kind });
  if (out.size > KEEP) { const k = out.keys().next().value; if (k != null) out.delete(k); }
  const p = lastPoint && t - lastPoint.at < 600 ? lastPoint : null;
  pending = { nonce, kind, at: t, ...(p ? { x: p.x, y: p.y } : {}) }; tell();
}
/** The answer to a guest's action reached it: a view with `ack`, or a refusal (`err` with the nonce). */
export function answered(m: { ack?: string; nonce?: string; leg?: number; hostMs?: number }, bytes: number, refused = false) {
  const nonce = refused ? m.nonce : m.ack; if (!nonce) return;
  const o = out.get(nonce); if (!o) return; out.delete(nonce);
  const s: ActSample = { at: Date.now(), kind: o.kind, total: Math.round(now() - o.at), bytes };
  if (typeof m.leg === 'number') s.leg = m.leg;
  if (typeof m.hostMs === 'number') s.hostMs = m.hostMs;
  if (refused) s.refused = true;
  acts = [...acts.slice(-(KEEP - 1)), s];
  if (pending?.nonce === nonce) pending = null;
  tell();
}
/** Nothing will answer (the link went down, the host is away): the "sending" mark goes. */
export function dropPending() { if (pending) { pending = null; tell(); } }
export const pendingNow = () => pending;

/** The ping: sent (net.ts) and its answer. One in flight at a time. */
export function sentPing() { pingSentAt = now(); }
export function gotPong() { if (!pingSentAt) return; pings = [...pings.slice(-(KEEP - 1)), Math.round(now() - pingSentAt)]; pingSentAt = 0; tell(); }

/** The host answered a guest's action: its own time on it and the size of what it sent. */
export function hostAnswered(ms: number, bytes: number) { host = { answers: host.answers + 1, lastMs: Math.round(ms), lastBytes: bytes }; }

const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); return s[s.length >> 1]; };
/** The parts of one sample (ms): you <-> room, room <-> host, host. Null where the room or host did not stamp it. */
export function parts(s: ActSample) {
  const room = s.leg != null ? Math.max(0, s.total - s.leg) : null;
  const hostLink = s.leg != null && s.hostMs != null ? Math.max(0, s.leg - s.hostMs) : null;
  return { you: room, hostLink, host: s.hostMs ?? null };
}
/** What the ping line shows: the latest ping, the last action and its parts, the medians. */
export function netSummary() {
  const last = acts[acts.length - 1] || null, recent = acts.slice(-20);
  return {
    ping: pings.length ? pings[pings.length - 1] : null, pingMedian: median(pings.slice(-10)),
    last, lastParts: last ? parts(last) : null, actMedian: median(recent.map((s) => s.total)), actions: acts.length,
    host: { ...host },
  };
}
/** The Report a problem bundle's `net`: every sample kept, and the summary. */
export function netReport() { return { summary: netSummary(), acts: acts.map((s) => ({ ...s, ...parts(s) })), pings: [...pings] }; }
/** A clean slate (a new room; the tests). */
export function resetNet() { acts = []; pings = []; pingSentAt = 0; out.clear(); pending = null; host = { answers: 0, lastMs: 0, lastBytes: 0 }; lastPoint = null; tell(); }
