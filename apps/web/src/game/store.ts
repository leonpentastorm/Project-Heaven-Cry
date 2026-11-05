// Client store. The host's browser holds the authoritative GameState, applies every action through the engine,
// runs the AI Narrator with the host's key, and sends each player their filtered view through the room relay.
// Guests send actions to the host and render the view they get back.
import { type Action, type GameState, type Sheet, RuleError, apply, newGame, viewFor } from '@engine';
import { type NarratorProvider, anthropicProvider, scriptedProvider, polish } from '../narrator/anthropic';
import { connect, type Conn } from './net';

export type Screen = 'home' | 'create' | 'room' | 'main' | 'combat' | 'levelup' | 'ultimate';
export interface Me { id: string; name: string }
export interface ClientState {
  me: Me; role: 'host' | 'guest' | null; code: string | null; game: GameState | null;
  conn: 'offline' | 'connecting' | 'online' | 'host-away' | 'error'; connNote: string;
  library: (Sheet & { savedAt: number })[]; draft: Partial<Sheet> | null;
  screen: Screen; levelupChar: string | null; toast: { text: string; at: number } | null;
  narrator: { key: string; model: string; effort: 'low' | 'medium' | 'high'; remember: boolean; scripted: boolean };
}

const LS = { me: 'phc.me', lib: 'phc.library', key: 'phc.narrator', room: 'phc.room', game: (c: string) => 'phc.game.' + c };
const read = (k: string, d: any) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const write = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or private mode */ } };
const rid = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
export const roomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

const savedNarr = read(LS.key, null);
let S: ClientState = {
  me: read(LS.me, null) || { id: 'p' + rid(), name: '' }, role: null, code: null, game: null, conn: 'offline', connNote: '',
  library: read(LS.lib, []), draft: null, screen: 'home', levelupChar: null, toast: null,
  narrator: { key: savedNarr?.key || '', model: savedNarr?.model || 'claude-opus-5-5', effort: savedNarr?.effort || 'medium', remember: !!savedNarr?.key, scripted: false },
};
write(LS.me, S.me);

const subs = new Set<() => void>();
export const getState = () => S;
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
function set(patch: Partial<ClientState>) { S = { ...S, ...patch }; subs.forEach((f) => f()); }
export const toast = (text: string) => { set({ toast: { text, at: Date.now() } }); setTimeout(() => { if (S.toast && Date.now() - S.toast.at >= 4500) set({ toast: null }); }, 5000); };

let conn: Conn | null = null;
let hostState: GameState | null = null;

// ---------- identity, library, navigation ----------
export function setName(name: string) { set({ me: { ...S.me, name } }); write(LS.me, S.me); }
export function go(screen: Screen, extra: Partial<ClientState> = {}) { set({ screen, ...extra }); }
export function saveToLibrary(sheet: Sheet) {
  const lib = [{ ...sheet, savedAt: Date.now() }, ...S.library.filter((x) => x.name !== sheet.name)].slice(0, 30);
  set({ library: lib }); write(LS.lib, lib);
}
export function removeFromLibrary(name: string) { const lib = S.library.filter((x) => x.name !== name); set({ library: lib }); write(LS.lib, lib); }
export function setNarrator(patch: Partial<ClientState['narrator']>) {
  const n = { ...S.narrator, ...patch }; set({ narrator: n });
  if (n.remember) write(LS.key, { key: n.key, model: n.model, effort: n.effort }); else write(LS.key, { model: n.model, effort: n.effort });
  if (S.role === 'host' && hostState?.narrator.error && n.key) act({ type: 'narrator/retry' });
}

// ---------- rooms ----------
export function hostRoom(code = roomCode()) {
  if (!S.me.name) return toast('Enter your name first.');
  const saved: GameState | null = read(LS.game(code), null);
  hostState = saved || newGame(code, { id: S.me.id, name: S.me.name });
  write(LS.room, { code, role: 'host' });
  set({ role: 'host', code, game: viewFor(hostState, S.me.id), screen: screenFor(hostState), conn: 'connecting' });
  conn = connect({ code, pid: S.me.id, name: S.me.name, role: 'host', token: hostToken(code) }, onMessage, onConn);
  persist();
}
export function joinRoom(code: string) {
  if (!S.me.name) return toast('Enter your name first.');
  code = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return toast('Room codes are 6 letters and numbers.');
  write(LS.room, { code, role: 'guest' });
  set({ role: 'guest', code, game: null, screen: 'room', conn: 'connecting' });
  conn = connect({ code, pid: S.me.id, name: S.me.name, role: 'guest' }, onMessage, onConn);
}
export function leaveRoom() { conn?.close(); conn = null; hostState = null; write(LS.room, null); set({ role: null, code: null, game: null, screen: 'home', conn: 'offline' }); }
export function resumeRoom() { const r = read(LS.room, null); if (r?.code && S.me.name) (r.role === 'host' ? hostRoom(r.code) : joinRoom(r.code)); }
export const lastRoom = () => read(LS.room, null) as { code: string; role: string } | null;
function hostToken(code: string) { const k = 'phc.hosttoken.' + code; let t = read(k, null); if (!t) { t = rid(24); write(k, t); } return t; }

function onConn(state: Conn['state'], note = '') {
  if (S.role === 'host') set({ conn: state === 'open' ? 'online' : state === 'closed' ? 'connecting' : 'error', connNote: note });
  else set({ conn: state === 'open' ? 'online' : state === 'closed' ? 'connecting' : 'error', connNote: note });
  if (state === 'open' && S.role === 'host' && hostState) broadcast(true);
}

function onMessage(m: any) {
  if (S.role === 'host') {
    if (m.t === 'snapshot' && m.state && (!hostState || m.state.v > hostState.v) && m.state.code === S.code) { hostState = m.state; set({ game: viewFor(hostState!, S.me.id), screen: screenFor(hostState!) }); }
    if (m.t === 'presence') {
      if (m.online && m.pid !== S.me.id) runHost({ type: 'player/join', id: m.pid, name: m.name }, S.me.id, null);
      else if (!m.online && hostState?.players.some((p) => p.id === m.pid)) runHost({ type: 'player/online', id: m.pid, online: false }, S.me.id, null);
    }
    if (m.t === 'act') runHost(m.action, m.from, m.nonce);
  } else {
    if (m.t === 'view') { const prev = S.game; set({ game: m.state, conn: 'online' }); followPhase(prev, m.state); }
    if (m.t === 'err') toast(m.message);
    if (m.t === 'host') set({ conn: m.online ? 'online' : 'host-away' });
  }
}

/** Where a player should be, given the game: combat follows the fight, story otherwise. */
function screenFor(g: GameState): Screen { return g.phase === 'lobby' ? 'room' : g.phase === 'combat' ? 'combat' : 'main'; }
function followPhase(prev: GameState | null, g: GameState) {
  if (S.screen === 'create' || S.screen === 'levelup' || S.screen === 'ultimate') return;
  // A finished fight keeps its players on the grid until they click "Back to the story".
  if (prev && prev.phase === 'combat' && g.phase === 'story' && S.screen === 'combat') return;
  if (!prev || prev.phase !== g.phase) set({ screen: screenFor(g) });
  if (g.awards.some((a) => g.characters[a.charId]?.owner === S.me.id)) set({ screen: 'ultimate' });
}

// ---------- actions ----------
/** Every click goes here: the host applies it, a guest sends it to the host. */
export function act(a: Action) {
  if (S.role === 'host') runHost(a, S.me.id, null);
  else if (S.role === 'guest') { if (!conn) return toast('Not connected.'); conn.send({ t: 'act', action: a, nonce: rid(6) }); }
}

function runHost(a: Action, by: string, nonce: string | null) {
  if (!hostState) return;
  try {
    hostState = apply(hostState, a, by);
  } catch (e) {
    const msg = e instanceof RuleError ? e.message : 'Something went wrong: ' + String((e as Error)?.message || e);
    if (!(e instanceof RuleError)) console.error(e);
    if (by === S.me.id) toast(msg); else conn?.send({ t: 'err', pid: by, message: msg, nonce });
    return;
  }
  const prev = S.game;
  set({ game: viewFor(hostState, S.me.id) });
  followPhase(prev, S.game!);
  persist();
  broadcast(false);
  queueMicrotask(maybeNarrate);
}

let lastSave = 0;
function persist() { if (hostState) write(LS.game(hostState.code), hostState); }
function broadcast(force: boolean) {
  if (!conn || !hostState) return;
  for (const p of hostState.players) if (p.id !== S.me.id) conn.send({ t: 'view', pid: p.id, state: viewFor(hostState, p.id) });
  if (force || Date.now() - lastSave > 1500) { lastSave = Date.now(); conn.send({ t: 'save', state: hostState }); }
}

// ---------- the AI Narrator (host only) ----------
let narrating = false;
export function provider(): NarratorProvider | null {
  if (S.narrator.scripted) return scriptedProvider();
  return S.narrator.key ? anthropicProvider(S.narrator.key, S.narrator.model, S.narrator.effort) : null;
}
async function maybeNarrate() {
  const g = hostState;
  if (!g || narrating || !g.story.work || g.narrator.busy || g.narrator.error) return;
  if (g.settings.mode !== 'ai') return;
  const p = provider();
  if (!p) { runHost({ type: 'narrator/error', message: 'Add your Anthropic API key in the Narrator settings (Room screen) so the AI Narrator can answer.' }, S.me.id, null); return; }
  narrating = true;
  runHost({ type: 'narrator/begin' }, S.me.id, null);
  try {
    const { turn, usage } = await p.turn(hostState!);
    runHost({ type: 'narrator/usage', ...usage }, S.me.id, null);
    runHost({ type: 'narrator/turn', turn }, S.me.id, null);
  } catch (e) {
    runHost({ type: 'narrator/error', message: String((e as Error)?.message || e) }, S.me.id, null);
  } finally { narrating = false; queueMicrotask(maybeNarrate); }
}
export const retryNarrator = () => act({ type: 'narrator/retry' });
export async function polishText(text: string, charName: string) {
  if (S.role !== 'host' || !S.narrator.key) throw new Error('Only the host\'s key can polish.');
  return polish(S.narrator.key, text, charName);
}

// A refresh drops you back into your room (unless an invite link points somewhere else).
setTimeout(() => { const r = read(LS.room, null), invite = new URLSearchParams(location.search).get('room'); if (r?.code && S.me.name && (!invite || invite.toUpperCase() === r.code)) resumeRoom(); }, 0);

/** Testing hook: lets the end-to-end test swap in the scripted Narrator. */
(globalThis as any).__phc = { getState, act, setNarrator, toast };
