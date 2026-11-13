// Client store. The host's browser holds the authoritative GameState, applies every action through the engine,
// runs the AI Narrator with the host's key, and sends each player their filtered view through the room relay.
// Guests send actions to the host and render the view they get back.
import { type Action, type GameState, type Sheet, RuleError, apply, newGame, viewFor, votesOf, rerollFrom, migrateLoaded, fightRulingOf, gearPreview } from '@engine';
import { FIGHT_TIMEOUT_MS } from '../narrator/fight';
import { newRoomPlay, testRoom } from './modes';
import { type NarratorProvider, scriptedProvider } from '../narrator/anthropic';
import { type ProviderId, makeProvider, polishWith, providerInfo, notReadyReason } from '../narrator/providers';
import { connect, type Conn } from './net';
import { DEFAULT_START, shownStart } from './starts';
import { battlePace } from './combatSpeed';


export type Screen = 'home' | 'create' | 'room' | 'main' | 'combat' | 'levelup' | 'ultimate' | 'run';
export interface Me { id: string; name: string }
export interface ClientState {
  me: Me; role: 'host' | 'guest' | null; code: string | null; game: GameState | null;
  conn: 'offline' | 'connecting' | 'online' | 'host-away' | 'error'; connNote: string;
  library: (Sheet & { savedAt: number })[]; draft: Partial<Sheet> | null;
  screen: Screen; levelupChar: string | null; toast: { text: string; at: number; ok?: boolean } | null; savedAt?: number;
  /** The room screen opens scrolled to this part (the Narrator chip's Change key). */ roomFocus?: 'narrator' | null;
  /** The host's AI Narrator settings. provider: which service; baseUrl: the address, for local and third-party sites. */
  narrator: { provider: ProviderId; key: string; model: string; baseUrl: string; effort: 'low' | 'medium' | 'high'; remember: boolean; scripted: boolean };
}

const LS = { me: 'phc.me', lib: 'phc.library', key: 'phc.narrator', room: 'phc.room', sessions: 'phc.sessions', game: (c: string) => 'phc.game.' + c };
const read = (k: string, d: any) => { try { const v = localStorage.getItem(k); return v ? JSON.parse(v) : d; } catch { return d; } };
const write = (k: string, v: any) => { try { localStorage.setItem(k, JSON.stringify(v)); } catch { /* full or private mode */ } };
// The host's full save, archive and all, lives in IndexedDB on the host's computer: no size limit worth worrying about
// (spec: The Narrator's memory). localStorage and the room server keep a slim copy without the archive.
const IDB = 'phc-saves';
const idb = (): Promise<IDBDatabase | null> => new Promise((res) => { try { const r = indexedDB.open(IDB, 1); r.onupgradeneeded = () => r.result.createObjectStore('games'); r.onsuccess = () => res(r.result); r.onerror = () => res(null); } catch { res(null); } });
async function idbPut(code: string, v: GameState) { const db = await idb(); if (!db) return; try { db.transaction('games', 'readwrite').objectStore('games').put(v, code); } catch { /* */ } }
async function idbGet(code: string): Promise<GameState | null> { const db = await idb(); if (!db) return null; return new Promise((res) => { try { const r = db.transaction('games', 'readonly').objectStore('games').get(code); r.onsuccess = () => res(r.result || null); r.onerror = () => res(null); } catch { res(null); } }); }
/** A save without the archive (it can grow without end; only the host's IndexedDB keeps it). */
const slim = (g: GameState): GameState => (g.archive ? { ...g, archive: undefined } : g);
const rid = (n = 10) => Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => 'abcdefghijkmnpqrstuvwxyz23456789'[b % 32]).join('');
export const roomCode = () => Array.from(crypto.getRandomValues(new Uint8Array(6)), (b) => 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'[b % 32]).join('');

const savedNarr = read(LS.key, null);
let S: ClientState = {
  me: read(LS.me, null) || { id: 'p' + rid(), name: '' }, role: null, code: null, game: null, conn: 'offline', connNote: '',
  library: read(LS.lib, []), draft: null, screen: 'home', levelupChar: null, toast: null,
  // Saves from before providers existed have no provider: they were Anthropic.
  narrator: { provider: providerInfo(savedNarr?.provider).id, key: savedNarr?.key || '', model: savedNarr?.model || 'claude-opus-5-5', baseUrl: savedNarr?.baseUrl || '',
    effort: savedNarr?.effort || 'medium', remember: !!savedNarr?.key, scripted: false },
};
write(LS.me, S.me);

const subs = new Set<() => void>();
export const getState = () => S;
export const subscribe = (f: () => void) => { subs.add(f); return () => { subs.delete(f); }; };
function set(patch: Partial<ClientState>) { S = { ...S, ...patch }; subs.forEach((f) => f()); }
/** A toast for 4.5 s (in a fight, × the combat speed: game/combatSpeed.ts). */
export const toast = (text: string, ok = false) => { const k = battlePace(); set({ toast: { text, at: Date.now(), ok } }); setTimeout(() => { if (S.toast && Date.now() - S.toast.at >= 4500 * k) set({ toast: null }); }, 5000 * k); };

let conn: Conn | null = null;
/** The room link's vital signs, for a stalled room (window.__phc.net(); docs/design/handoffs/coop-stall.md). */
const net = { lastAt: 0, last: '', got: 0, resyncs: 0 };
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
  const n = { ...S.narrator, ...patch };
  // A new service starts on its own default model (an Anthropic model id means nothing to OpenRouter). The key stays:
  // players often paste it before picking the service. A local address is no use to a website, and the reverse.
  if (patch.provider && patch.provider !== S.narrator.provider) {
    const p = providerInfo(patch.provider);
    if (!('model' in patch)) n.model = p.defaultModel;
    if (!('baseUrl' in patch) && (p.id === 'ollama' || S.narrator.provider === 'ollama')) n.baseUrl = '';
  }
  set({ narrator: n });
  const keep = { provider: n.provider, model: n.model, baseUrl: n.baseUrl, effort: n.effort };
  write(LS.key, n.remember ? { ...keep, key: n.key } : keep);
  if (S.role === 'host' && hostState?.narrator.error && !notReadyReason(n)) act({ type: 'narrator/retry' });
  queueMicrotask(maybeFightRule); // rules 1.14: a fight under way learns whether a Narrator is connected now
}

// ---------- rooms ----------
export function hostRoom(code = roomCode()) {
  if (!S.me.name) return toast('Enter your name first.');
  const saved: GameState | null = migrateLoaded(read(LS.game(code), null));
  hostState = saved || newGame(code, { id: S.me.id, name: S.me.name });
  // Classes 3.0 step 10b: a new room starts on the menu's first start, never on a hidden campaign (game/starts.ts, the
  // campaign's `listed`); a saved room keeps the start it was played with.
  if (!saved && !shownStart(hostState, hostState.settings.start)) hostState.settings.start = DEFAULT_START;
  // Rules 1.39: a new room selects its mode (data/modes.json default: Survival; a browser suite's page: its test hook,
  // game/modes.ts); a saved room keeps its own (one from before modes reads as a campaign: migrateLoaded).
  if (!saved) { hostState.settings.play = newRoomPlay(); if (testRoom()) hostState.settings.test = true; }
  befores = {}; loadBefores(code);
  // The full save (with the archive) comes back from IndexedDB a moment later.
  idbGet(code).then((full) => {
    if (!full || !hostState || hostState.code !== code) return;
    // localStorage lost it (full, or cleared): the IndexedDB save is the whole game.
    if (!saved && full.v > hostState.v) { hostState = migrateLoaded(full); set({ game: viewFor(hostState, S.me.id), screen: screenFor(hostState) }); broadcast(true); return; }
    if (full.archive && !hostState.archive) hostState.archive = full.archive;
  });
  write(LS.room, { code, role: 'host' });
  set({ role: 'host', code, game: viewFor(hostState, S.me.id), screen: screenFor(hostState), conn: 'connecting' });
  conn = connect({ code, pid: S.me.id, name: S.me.name, role: 'host', token: hostToken(code) }, onMessage, onConn);
  persist();
  fightAsked = null; queueMicrotask(maybeFightRule); // rules 1.14: a fight saved while an attempt waited asks the Narrator again
}
export function joinRoom(code: string) {
  if (!S.me.name) return toast('Enter your name first.');
  code = code.trim().toUpperCase();
  if (!/^[A-Z0-9]{6}$/.test(code)) return toast('Room codes are 6 letters and numbers.');
  write(LS.room, { code, role: 'guest' });
  set({ role: 'guest', code, game: null, screen: 'room', conn: 'connecting' });
  conn = connect({ code, pid: S.me.id, name: S.me.name, role: 'guest' }, onMessage, onConn);
}
// ---------- saved sessions (the title screen's list) ----------
export interface SessionInfo { code: string; role: 'host' | 'guest'; title: string; chars: string; players: string; phase: string; round: number; savedAt: number }
export const listSessions = (): SessionInfo[] => read(LS.sessions, []);
function noteSession(g: GameState, role: 'host' | 'guest') {
  const info: SessionInfo = { code: g.code, role, title: g.story.scene.title || (g.phase === 'lobby' ? 'In the lobby' : 'Story under way'), chars: Object.values(g.characters).map((c) => c.name).join(', '),
    players: g.players.map((p) => p.name).join(', '), phase: g.phase, round: g.story.round, savedAt: Date.now() };
  write(LS.sessions, [info, ...listSessions().filter((x) => x.code !== g.code)].slice(0, 20));
}
export function forgetSession(code: string) {
  write(LS.sessions, listSessions().filter((x) => x.code !== code));
  try { localStorage.removeItem(LS.game(code)); } catch { /* */ }
  idb().then((db) => { try { db?.transaction('games', 'readwrite').objectStore('games').delete(code); } catch { /* */ } });
  if (read(LS.room, null)?.code === code) write(LS.room, null);
  set({});
}
/** Save now: the host writes this browser's save and the room server's copy; guests are saved by the host. */
/** For a problem report: the host's whole game (archive included), else what this player sees. */
export const reportState = (): GameState | null => hostState || S.game;
export const reportBefores = () => Object.keys(befores).length;
export function saveNow() {
  if (S.role !== 'host' || !hostState) return toast('The host\'s browser keeps the save for everyone. Ask the host to save.');
  persist(); if (conn) conn.send({ t: 'save', state: slim(hostState) }); lastSave = Date.now();
  set({ savedAt: Date.now() });
  toast('Saved · room ' + hostState.code + '. Find it under Saved sessions on the title screen.', true);
}
export function resumeSession(code: string) { const x = listSessions().find((s) => s.code === code); if (!x) return; x.role === 'host' ? hostRoom(code) : joinRoom(code); }

export function leaveRoom() { if (S.role === 'host' && hostState) { persist(); conn?.send({ t: 'save', state: slim(hostState) }); } conn?.close(); conn = null; hostState = null; write(LS.room, null); set({ role: null, code: null, game: null, screen: 'home', conn: 'offline' }); }
export function resumeRoom() { const r = read(LS.room, null); if (r?.code && S.me.name) (r.role === 'host' ? hostRoom(r.code) : joinRoom(r.code)); }
export const lastRoom = () => read(LS.room, null) as { code: string; role: string } | null;
function hostToken(code: string) { const k = 'phc.hosttoken.' + code; let t = read(k, null); if (!t) { t = rid(24); write(k, t); } return t; }

function onConn(state: Conn['state'], note = '') {
  if (S.role === 'host') set({ conn: state === 'open' ? 'online' : state === 'closed' ? 'connecting' : 'error', connNote: note });
  else set({ conn: state === 'open' ? 'online' : state === 'closed' ? 'connecting' : 'error', connNote: note });
  // The link is back: everyone gets the state as it is now. A beat later, so it goes out after whatever the link kept
  // while it was down (net.ts sends that as soon as this returns): the newest view must be the last to arrive.
  if (state === 'open' && S.role === 'host' && hostState) setTimeout(() => broadcast(true), 0);
}

function onMessage(m: any) {
  net.lastAt = Date.now(); net.last = String(m?.t || ''); net.got++;
  if (S.role === 'host') {
    if (m.t === 'snapshot' && m.state && (!hostState || m.state.v > hostState.v) && m.state.code === S.code) { hostState = migrateLoaded(m.state); set({ game: viewFor(hostState!, S.me.id), screen: screenFor(hostState!) }); }
    if (m.t === 'presence') {
      if (m.online && m.pid !== S.me.id) runHost({ type: 'player/join', id: m.pid, name: m.name }, S.me.id, null);
      else if (!m.online && hostState?.players.some((p) => p.id === m.pid)) runHost({ type: 'player/online', id: m.pid, online: false }, S.me.id, null);
    }
    if (m.t === 'act') runHost(m.action, m.from, m.nonce);
    if (m.t === 'sync') answerSync(String(m.from || ''), Number(m.v));
  } else {
    if (m.t === 'view') { if (m.resync) net.resyncs++; const prev = S.game; set({ game: migrateLoaded(m.state), conn: 'online' }); followPhase(prev, m.state); noteSession(m.state, 'guest'); provingClosed(prev, m.state); }
    if (m.t === 'err') toast(m.message);
    if (m.t === 'host') set({ conn: m.online ? 'online' : 'host-away' });
  }
}

// ---------- keeping a guest in step (docs/design/handoffs/coop-stall.md) ----------
// A view that never arrives leaves a guest on an old state for good: nothing else would send it again until the host's
// next action, and in a fight the host may be waiting for that very guest. So a guest says every few seconds which
// version of the game it has (more often in a fight), and the host sends the view again when that is not its own.
/** How often a guest checks in: in a fight, and otherwise (ms). */
export const SYNC_FIGHT_MS = 5000, SYNC_IDLE_MS = 30000;
let syncAt = 0;
/** A guest's check-in, when one is due (called on a timer; exported for the tests). */
export function syncTick(now = Date.now()) {
  if (S.role !== 'guest' || !conn || conn.state !== 'open') return false;
  const g = S.game, fight = !!g && g.phase === 'combat' && !!g.combat && !g.combat.over;
  if (now - syncAt < (fight ? SYNC_FIGHT_MS : SYNC_IDLE_MS)) return false;
  syncAt = now; conn.send({ t: 'sync', v: g ? g.v : -1 });
  return true;
}
if (typeof setInterval !== 'undefined') setInterval(() => syncTick(), 1000);
/** The host answers a guest's check-in: a player of this room on another version gets its view again, and one the
 *  host has down as away (its return was lost) is back. Someone who is not in the room gets nothing: joining is by
 *  arriving (the room's presence message), never by this. */
function answerSync(pid: string, v: number) {
  if (!hostState || !pid || pid === S.me.id) return;
  const p = hostState.players.find((x) => x.id === pid); if (!p) return;
  if (!p.online) { runHost({ type: 'player/join', id: pid, name: p.name }, S.me.id, null); return; } // runHost sends everyone their view
  if (v !== hostState.v) conn?.send({ t: 'view', pid, state: viewFor(hostState, pid), resync: true });
}

/** A guest sees the host close the Proving Ground: opened from the title, the room closes too (to the title); opened
 *  from a room, everyone is back in it. */
function provingClosed(prev: GameState | null, g: GameState) {
  if (!prev?.sandbox || g.sandbox) return;
  if (prev.sandbox.standalone) { const code = g.code; toast('The host closed the Proving Ground.'); leaveRoom(); forgetSession(code); }
  else toast('The host closed the Proving Ground: back to the room.');
}
/** Where a player should be, given the game: combat follows the fight, story otherwise. */
function screenFor(g: GameState): Screen { return g.phase === 'lobby' ? 'room' : g.phase === 'combat' ? 'combat' : homeScreen(g); }
/** Where "back" goes outside a fight: a Survival run's path map (rules 1.41), else the story. */
export const homeScreen = (g: GameState | null | undefined): Screen => (g && g.phase === 'combat' ? 'combat' : g && g.run && g.run.state !== 'over' ? 'run' : g && g.phase === 'lobby' ? 'room' : 'main');
function followPhase(prev: GameState | null, g: GameState) {
  if (S.screen === 'create' || S.screen === 'levelup' || S.screen === 'ultimate') return;
  // A finished fight keeps its players on the grid until they click "Back to the story".
  if (prev && prev.phase === 'combat' && g.phase !== 'combat' && S.screen === 'combat') return; // (a lost Survival run goes to the lobby: its card shows first too)
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
  persistSoon();
  broadcast(false);
  queueMicrotask(maybeNarrate);
  queueMicrotask(maybeFightRule);
  queueMicrotask(carryOutVote);
}

let lastSave = 0;
let idbTimer: any = null;
let lsTimer: any = null;
/** After an action: the save is written as soon as the action has been handled and drawn, not inside the click (the
 * whole state is turned into text for localStorage: 0.3 ms on a fresh fight, 1 ms after 50 fights, more on a long
 * campaign), and once for several actions run in the same step. So between an action and the next task the save on
 * disk is one step behind; three things close that gap where a timer cannot be trusted:
 *   - the tab is out of view (the host's tab in the background is when guests' actions arrive, and browsers run a
 *     hidden tab's timers late, about once a second): the write is made at once, inside the action, as it was before;
 *   - the tab goes out of view with a write waiting (`visibilitychange`: on a phone the last event a page is sure to
 *     get before it is frozen or thrown away): written at once;
 *   - the page is left (`pagehide`): written at once.
 * A crash between an action and the next task can still lose that one step; the room server's copy and IndexedDB are
 * behind by more than that in any case. */
const pageHidden = () => typeof document !== 'undefined' && document.visibilityState === 'hidden';
function persistSoon() { if (!hostState) return; if (pageHidden()) { persist(); return; } if (lsTimer == null) lsTimer = setTimeout(() => { lsTimer = null; persist(); }, 0); }
const flushSave = () => { if (lsTimer != null) persist(); };
if (typeof addEventListener === 'function') addEventListener('pagehide', flushSave);
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') document.addEventListener('visibilitychange', () => { if (pageHidden()) flushSave(); });
function persist() { if (lsTimer != null) { clearTimeout(lsTimer); lsTimer = null; } if (hostState) { write(LS.game(hostState.code), slim(hostState)); noteSession(hostState, 'host'); clearTimeout(idbTimer); const g = hostState; idbTimer = setTimeout(() => idbPut(g.code, g), 400); } }
function broadcast(force: boolean) {
  if (!conn || !hostState) return;
  for (const p of hostState.players) if (p.id !== S.me.id) conn.send({ t: 'view', pid: p.id, state: viewFor(hostState, p.id) });
  if (force || Date.now() - lastSave > 1500) { lastSave = Date.now(); conn.send({ t: 'save', state: slim(hostState) }); }
}

// ---------- the AI Narrator (host only) ----------
let narrating = false;
export function provider(): NarratorProvider | null {
  if (S.narrator.scripted) return scriptedProvider();
  return makeProvider(S.narrator);
}
async function maybeNarrate() {
  const g = hostState;
  if (!g || narrating || !g.story.work || g.narrator.busy || g.narrator.error) return;
  if (g.sandbox) return; // the Proving Ground never calls the Narrator
  if (g.settings.mode !== 'ai') return;
  const p = provider();
  if (!p) { runHost({ type: 'narrator/error', message: (notReadyReason(S.narrator) || 'Set up the AI Narrator').replace(/ to start$/, '') + ' in the Narrator settings (Room screen) so the AI Narrator can answer.' }, S.me.id, null); return; }
  narrating = true;
  runHost({ type: 'narrator/begin' }, S.me.id, null);
  try {
    const { turn, usage } = await p.turn(hostState!);
    runHost({ type: 'narrator/usage', ...usage }, S.me.id, null);
    // Keep the state from just before this turn: a reroll the room votes for goes back to it (spec: Rerolls and edits).
    const pre = hostState!, turnsBefore = votesOf(pre).turns.at(-1);
    runHost({ type: 'narrator/turn', turn }, S.me.id, null);
    // A turn the engine refused leaves the state as it was (busy): say so, or the story would wait for good.
    if (hostState === pre && hostState?.narrator.busy) { runHost({ type: 'narrator/error', message: 'The Narrator\'s turn could not be applied; retry.' }, S.me.id, null); return; }
    const opened = hostState ? votesOf(hostState).turns.at(-1) : undefined;
    if (opened && opened !== turnsBefore) keepBefore(opened, pre);
  } catch (e) {
    const spent = (e as any)?.usage; if (spent) runHost({ type: 'narrator/usage', ...spent }, S.me.id, null);
    runHost({ type: 'narrator/error', message: String((e as Error)?.message || e) }, S.me.id, null);
  } finally { narrating = false; queueMicrotask(maybeNarrate); }
}
export const retryNarrator = () => act({ type: 'narrator/retry' });

// ---------- the Narrator's answer inside a fight (rules 1.14; host only) ----------
// An attempt opens one pending fight ruling and the fight waits. With an AI Narrator the host's browser asks for the
// answer once, in a small call (narrator/fight.ts), and applies it with narrator/fight-ruling; the engine validates it.
// An error, or no answer in FIGHT_TIMEOUT_MS, gives the attempt back (narrator/fight-skip) and says so in the log, so a
// dead key never locks a fight. A human Narrator answers on their own screen: nothing is called here.
let fightAsked: string | null = null;
/** Is an AI Narrator set up in this browser (a key, a model; or the scripted one)? */
const narratorSetUp = () => S.narrator.scripted || !notReadyReason(S.narrator);
async function maybeFightRule() {
  const g = hostState;
  if (S.role !== 'host' || !g || g.phase !== 'combat' || !g.combat || g.settings.mode !== 'ai') return;
  // The engine refuses attempts while no Narrator is connected: tell it when that changes (only in a fight).
  if (!g.sandbox && !!g.narrator.offline === narratorSetUp()) { runHost({ type: 'narrator/ready', ready: narratorSetUp() }, S.me.id, null); return; }
  const r = fightRulingOf(g.combat); if (!r || fightAsked === r.id) return;
  fightAsked = r.id;
  const waiting = () => !!hostState && fightRulingOf(hostState.combat)?.id === r.id;
  const giveBack = (note: string) => { if (waiting()) runHost({ type: 'narrator/fight-skip', id: r.id, note }, S.me.id, null); };
  const p = g.sandbox ? null : provider();
  if (!p || !p.fight) { giveBack('No Narrator is connected.'); return; }
  let timer: any = null;
  try {
    const res = await Promise.race([p.fight(g, r), new Promise<never>((_, rej) => { timer = setTimeout(() => rej(new Error('fight-timeout')), FIGHT_TIMEOUT_MS); })]);
    if (res.usage && (res.usage.input || res.usage.output)) runHost({ type: 'narrator/usage', ...res.usage, kind: 'fight' }, S.me.id, null);
    if (!waiting()) return; // the host skipped the wait meanwhile
    try { hostState = apply(hostState!, { type: 'narrator/fight-ruling', id: r.id, lines: res.answer.lines, effect: res.answer.effect }, S.me.id); }
    catch { giveBack('The Narrator\'s answer could not be used.'); return; }
    const prev = S.game; set({ game: viewFor(hostState, S.me.id) }); followPhase(prev, S.game!); persistSoon(); broadcast(false);
    queueMicrotask(maybeNarrate); // the answer may have ended the fight (a surrender): whatever follows runs as after any action
  } catch (e) {
    const spent = (e as any)?.usage; if (spent) runHost({ type: 'narrator/usage', ...spent, kind: 'fight' }, S.me.id, null);
    giveBack((e as Error)?.message === 'fight-timeout' ? 'The Narrator took too long to answer.' : 'The Narrator could not be reached.');
  } finally { clearTimeout(timer); }
}
export async function polishText(text: string, charName: string) {
  if (S.role !== 'host' || notReadyReason(S.narrator)) throw new Error('Only the host\'s key can polish.');
  return polishWith(S.narrator, text, charName);
}

// A refresh drops you back into your room (unless an invite link points somewhere else).
setTimeout(() => { const r = read(LS.room, null), invite = new URLSearchParams(location.search).get('room'); if (r?.code && S.me.name && (!invite || invite.toUpperCase() === r.code)) resumeRoom(); }, 0);

/** Testing hook: lets the end-to-end test swap in the scripted Narrator. */
(globalThis as any).__phc = { getState, act, setNarrator, toast, go,
  /** The engine's gear preview for a character (the survival suite checks a shop card's numbers against it). */
  gearPreview: (charId: string, inst: { id: string; rarity?: any }) => { const c = S.game?.characters?.[charId]; return c ? gearPreview(c, inst) : null; },
  /** The host's whole game (the e2e fog check compares a guest's view with it); null on a guest's computer. */
  truth: () => hostState,
  /** The room link now: this player's role, the link's state, the last message and how long ago, the game's version. */
  net: () => ({ role: S.role, conn: S.conn, link: conn?.state || 'none', last: net.last, lastAgoMs: net.lastAt ? Date.now() - net.lastAt : -1, got: net.got, resyncs: net.resyncs, v: S.game?.v ?? -1, hostV: hostState?.v ?? -1 }) };

// ---------- rerolls and edits (spec: Rerolls and edits) ----------
// The host's copies of the state from just before each of the Narrator's latest turns, by the line the turn opened with.
// Only on the host's computer (memory and IndexedDB): the room server and the players never get them.
let befores: Record<string, GameState> = {};
function keepBefore(entryId: string, pre: GameState) {
  befores[entryId] = { ...pre, archive: undefined };
  const keep = new Set(hostState ? votesOf(hostState).turns : []);
  for (const k of Object.keys(befores)) if (!keep.has(k)) delete befores[k];
  if (hostState) { const code = hostState.code, copy = befores; idb().then((db) => { try { db?.transaction('games', 'readwrite').objectStore('games').put(copy, code + '#befores'); } catch { /* */ } }); }
}
export async function loadBefores(code: string) { const db = await idb(); if (!db) return; await new Promise<void>((res) => { try { const r = db.transaction('games', 'readonly').objectStore('games').get(code + '#befores'); r.onsuccess = () => { if (r.result) befores = r.result; res(); }; r.onerror = () => res(); } catch { res(); } }); }
let carrying = false;
/** A vote passed: the host's browser carries it out. A reroll goes back to the kept copy and asks the Narrator again;
 * an edit asks the Narrator to reword its own line, and it refuses anything that would change what happened. */
async function carryOutVote() {
  const o = hostState ? votesOf(hostState).open : null;
  if (!o || o.status === 'open' || carrying) return;
  if (o.status === 'failed') { runHost({ type: 'vote/close' }, S.me.id, null); return; }
  carrying = true;
  try {
    if (o.kind === 'reroll') {
      const before = befores[o.entryId];
      if (!before) { toast('The copy from before that turn isn\'t on this computer any more: the reroll can\'t be done.'); runHost({ type: 'vote/close' }, S.me.id, null); return; }
      hostState = rerollFrom(hostState!, before, o.note);
      for (const k of Object.keys(befores)) if (!votesOf(hostState).turns.includes(k)) delete befores[k];
      const prev = S.game; set({ game: viewFor(hostState, S.me.id) }); followPhase(prev, S.game!); persistSoon(); broadcast(true);
      queueMicrotask(maybeNarrate);
    } else {
      const p = provider();
      if (!p || !p.rewrite) { runHost({ type: 'narrator/rewrite', entryId: o.entryId, text: '', refused: 'no AI Narrator is set up to reword it.' }, S.me.id, null); return; }
      const e = hostState!.story.entries.find((x) => x.id === o.entryId)!;
      try {
        const r = await p.rewrite(hostState!, e.text, o.note);
        if (r.usage) runHost({ type: 'narrator/usage', ...r.usage, kind: 'rewrite' }, S.me.id, null);
        runHost({ type: 'narrator/rewrite', entryId: o.entryId, text: r.text, refused: r.refused || undefined }, S.me.id, null);
      } catch (err) { runHost({ type: 'narrator/rewrite', entryId: o.entryId, text: '', refused: 'the rewrite failed (' + String((err as Error)?.message || err).slice(0, 120) + ').' }, S.me.id, null); }
    }
  } finally { carrying = false; }
}

/** Redraw the screens (for things outside the game state, like the voice). */
export const poke = () => set({});
