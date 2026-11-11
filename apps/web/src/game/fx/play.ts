// Plays the engine's presentation events (packages/engine/src/combat.ts, FxEvent) as sound and pictures over the grid.
// Every player's screen plays the same events from the shared game state, in order, each given its beat so a burst of
// enemy actions reads as a sequence. Nothing here changes the game; nothing waits on it; a hidden tab skips it all.
import { type FxEvent, type GameState, SIGIL, WEAPON, visibility, phys, refOf } from '@engine';
import { sfx, reducedMotion, type Sfx } from '../sfx';
import { GLYPH_PATHS, SIGIL_INK, SIGIL_GLOW, SOUL_INK, SOUL_WARM } from '../glyphs';
import { type ElementFx, type MissileKind, ELEMENTS, bubbles, elementFx, elementImpact, elementTrail, jag, mix, shardCss, shards, snapFrame, turretNode } from './elements';
import { soulHandlers, soulBeat, discharge } from './soul';
import { feelingHandlers, feelingBeat } from './feelings';
import { faithHandlers, faithBeat } from './faith';
import { classHandlers, classBeat } from './classes';
import { physHandlers, physBeat } from './physical';
import { meleeTechHandlers, meleeTechBeat, meleePrepass } from './melee-techniques';
import { wrapRanged, rangedBeat, rangedBatch, resetRanged } from './ranged';
import { grandLook } from './grand';
import { worldHandlers, worldBeat } from './world';
import { cutInForFx, showSpotlight, cancelSpotlight, noteSlowed, dropCutIns, CUTIN_MS, CUTIN_TEMPO, CUTIN_SKIP_MS, cutInCap } from '../spotlight';
import { closeCutIns } from '../cutIn';
import { setInBattle, getCombatSpeed, combatTempo, battlePace, inBattle } from '../combatSpeed';
import { DRAW_MS, brassOf, coreOf, drawArrow, dropMag, ejectCore, ejectShell, loadRounds, stowArrows, whoOf } from './brass';
import { reloadCard } from './reload';
import { bangMark, bangDue, tickDue, noteSight, noteOverwatch, tagChip, aimLine, resetSight, HOSTILE_INK, OTHER_INK } from './sight';
import { type Pt, resetFloats, reanchor, after, bumpGen, withTempo, fxTempo, fxPace, fxScale, slow, particle, anim, angle, anchor, burst, centre, flash, floatText, gridShown, hasLayer, lunge, panOf, put, ring, screenTint, shake, shakeScreen, slideFrom, sprite, svg, tileEl, timerRing, tokenEl } from './dom';

import { activeCamera } from '../cameraView';
import { fxTiles, glideMs, movesCamera } from '../camera';
const HP = '#F65157', OK = '#6FEA77', MUTED = '#A3AEC2', WHITE = '#FFFFFF', MUZZLE = '#FFE2A0', HOT = '#FFF3C4';
/** The window event fired as each effect plays (detail: the FxEvent), and when the queue runs dry. */
export const FX_EVENT = 'phc-fx', FX_IDLE = 'phc-fx-idle', FX_HOLD = 'phc-fx-hold';

// ---------- what the layer knows about the game right now ----------
interface UnitInfo { pos: string; name: string; side: string; robot: boolean; dead?: boolean; charId?: string }
let units = new Map<string, UnitInfo>();
let seenTiles: Set<string> | null = null;
/** The units the squad sees now (its own and the hostiles in sight; null: everyone, outside a fight). */
let seenUnits: Set<string> | null = null;
/** The game on screen (the spotlight gate builds its cut-in from it). */
let ctxGame: GameState | null = null;
/** The characters' names (a Miracle's cut-in calls the devoted by name). */
let charNames = new Map<string, string>();
/** World Play 1.7 kinds that are machines (a robot bleeds sparks, not blood). */
const MACHINE_KIND = new Set(['robot', 'drone', 'machine']);
const ROBOT = /drone|robot|\bbot\b|turret|automaton|mech\b|android|construct|sentry/i;
/** Called by FxLayer before playing a batch: where everyone is now, and (in a fight) what the squad can see. */
export function setContext(g: GameState | null, screen: string) {
  units = new Map(); seenTiles = null; seenUnits = null; ctxGame = g; charNames = new Map();
  setInBattle(!!g?.combat && screen === 'combat'); // the combat speed applies in a fight (game/combatSpeed.ts)
  if (!g) return;
  for (const c of Object.values(g.characters || {})) if (c && (c as any).id) charNames.set((c as any).id, String((c as any).name || ''));
  if (screen === 'combat' && g.combat) {
    for (const u of g.combat.units) units.set(u.id, { pos: u.pos, name: u.name, side: u.side, robot: ROBOT.test(u.name) || MACHINE_KIND.has((u as any).kind), dead: !!u.dead, charId: u.charId || undefined });
    try { const v = visibility(g.combat, 'pc'); seenTiles = v.tiles; seenUnits = new Set([...v.seen, ...g.combat.units.filter((u) => u.side === 'pc').map((u) => u.id)]); } catch { seenTiles = null; seenUnits = null; }
  } else {
    for (const c of Object.values(g.characters)) { const p = g.story.positions?.[c.id]; if (p) units.set('pc-' + c.id, { pos: p, name: c.name, side: 'pc', robot: false, charId: c.id }); }
    for (const n of g.story.npcs || []) units.set(n.id, { pos: n.pos, name: n.name, side: 'foe', robot: ROBOT.test(n.name) || MACHINE_KIND.has(n.kind || '') });
  }
}
const unit = (id: string | null | undefined) => (id ? units.get(id) : undefined);
/** The tiles the squad sees now (null: everything, outside a fight). */
export const seenNow = () => seenTiles;

// ---------- the fallen ----------
// A unit killed by an action is gone from the grid in the very render that brings the action's effects, so its token
// can't shake or fall. The layer keeps a copy of every living unit's token from the last render it saw; a kill plays
// on that copy (a ghost over the tile), which falls and fades.
const lastTok = new Map<string, HTMLElement>();
const ghosts = new Map<string, HTMLElement>();
/** After each render: copy the living units' tokens (never overwritten by a dead unit's empty tile). */
export function rememberTokens() {
  try { rememberTiles(); } catch { /* the effects never stop the game */ }
  for (const id of [...lastTok.keys()]) if (!units.has(id)) lastTok.delete(id);
  for (const [id, u] of units) { if (u.dead || heldIds().has(id)) continue; const t = tokenEl(tileEl(u.pos)); if (t) lastTok.set(id, t.cloneNode(true) as HTMLElement); } // a held token is see-through: keep the last good copy
}
function ghostOf(id: string | null | undefined, key: string | null | undefined, life = 2400): HTMLElement | null {
  if (!id || !key || !visible(key)) return null;
  const had = ghosts.get(id); if (had && had.isConnected) return had;
  const src = lastTok.get(id) || lookEl(id), p = centre(key); if (!src || !p) return null;
  const copy = src.cloneNode(true) as HTMLElement, ms = life;
  copy.style.opacity = ''; // a copy kept from a see-through (held) token
  const box = put(copy, p, p.s, p.s, ms); box.style.zIndex = '1';
  anchor(box, key, ms);
  ghosts.set(id, copy); setTimeout(() => { if (ghosts.get(id) === copy) ghosts.delete(id); }, slow(ms));
  return copy;
}
/** The token to shake: the live one, else (for a unit this action killed) its ghost. */
const tokOrGhost = (id: string | null | undefined, key: string | null | undefined, killed: boolean) => tokOf(id, key || undefined) || (killed ? ghostOf(id, key) : null);
/** Can the squad see this tile? (Outside a fight, everything on the map is in view.) */
const visible = (k: string | null | undefined) => !k || !seenTiles || seenTiles.has(k);
/** Where a unit's token is on screen now (it may have moved since the event); a walker stopped on the event's tile (an
 *  Overwatch shot mid-walk) is the token there. */
const tokOf = (id: string | null | undefined, fallback?: string) => parkedOn(id, fallback) || standOf(id, fallback) || tokenEl(tileEl(unit(id)?.pos || fallback));
/** A unit held where it was (its walk or its push not played yet): the stand-in on that tile is its token (a shot lands on
 *  it, a flash shows on it). */
function standOf(id: string | null | undefined, key: string | null | undefined): HTMLElement | null {
  const w = id ? waiting.get(id) : undefined, st = w?.stand; if (!st || !st.isConnected || (key && st.getAttribute('data-phc-stand-at') !== key)) return null;
  const c = st.firstElementChild as HTMLElement | null; return (c?.querySelector('[data-phc-gtok]') as HTMLElement | null) || c;
}
/** Does the squad see this unit now (its own always; everyone outside a fight)? */
const seesUnit = (id: string | null | undefined) => !id || !seenUnits || seenUnits.has(id);
const at = (k: string | null | undefined) => (visible(k) ? centre(k) : null);
/** Did the squad see this unit when the event happened (a turn, a stance: the engine's seen, stamped then)? An old save
 *  without it: the tile is in sight. */
const sawThen = (e: FxEvent) => (e.seen && typeof e.seen.pc === 'number' ? !!e.seen.pc : visible(e.at));
/** A one-shot combat sound at a point (panned). Its delay follows the combat speed and the tempo (fx/dom.ts fxScale); in
 *  an action slowed after a spotlight cut-in it also plays at the tempo's rate (× 0.85). The combat speed alone never
 *  changes a sound's pitch. */
const play = (s: Sfx, p: Pt | null, o: { rate?: number; gain?: number; delay?: number; lowpass?: number } = {}) => {
  const tp = fxTempo(), k = fxScale();
  sfx(s, { ...o, pan: panOf(p), ...(tp !== 1 ? { rate: (o.rate || 1) * tp } : {}), ...(o.delay && k !== 1 ? { delay: o.delay * k } : {}) });
};
const jitter = (r = 0.06) => 1 + (Math.random() * 2 - 1) * r;
/** Which way each unit last aimed (radians on screen, 0 = right), from its last shot or Evoke: behind it (the opposite
 *  way) is where a casing flies, a break-action kicks its hulls and an Evoker throws its spent core. Before any, a
 *  random way (an Evoker's core) or, for a reload, away from the other side's half of the map. */
const aims = new Map<string, number>();
const aimFor = (id: string | null | undefined, guess?: number) => (id && aims.has(id) ? aims.get(id)! : guess ?? (unit(id)?.side === 'pc' ? 0 : Math.PI));
/** Does this shot wait for the archer's draw (a bow, not a crossbow: its bolt is already on)? */
const drawsArrow = (e: FxEvent) => !e.ricochet && !reducedMotion() && brassOf(e.weapon || '', e.cat || '').bow === 'bow';

// ---------- walking (combat clarity) ----------
// A walk is drawn by a copy of the token that walks the path while the real one (already where the walk ends) is hidden.
// In the fog of war the copy is see-through where your side doesn't see the walker: a hostile coming out of the fog walks
// in from the last unseen tile, fading up over that step (and a "!" pops as it comes into sight); one walking off into
// the fog fades over its first unseen step and is gone. The engine says where each side saw the walker (the move event's
// sight), so nothing is shown where it wasn't seen. A walk cut by a reaction (an Overwatch shot) stops: its copy stands
// on the tile where it was shot until the rest of the walk plays (parked), and the shot lands on it.
interface Parked { box: HTMLElement; key: string; hide: Animation | null }
const parked = new Map<string, Parked>();
/** A stopped walker waits for the rest of its walk (or its fall) however long the reaction beats take: several
 *  overwatchers, a killzone's held shots, a bow's draw. It goes when its next walk or its 'down' plays, when the queue
 *  runs dry, or at the latest after HOLD_MS (ms at Fast). */
function unpark(id: string, keepHide = false) { const p = parked.get(id); if (!p) return null; parked.delete(id); p.box.remove(); if (!keepHide) p.hide?.cancel(); holdChanged(); return p; }
/** The stopped walker standing on this tile (the token to hit, shake or flash there). */
function parkedOn(id: string | null | undefined, key: string | null | undefined): HTMLElement | null {
  const p = id ? parked.get(id) : undefined; if (!p || !p.box.isConnected || (key && p.key !== key)) return null;
  return (p.box.firstElementChild as HTMLElement) || null;
}
/** Which tiles of a move the squad saw the walker on: the engine's sight for this side, else (an old save, the area map)
 *  what the squad sees now. */
export function moveSeen(e: FxEvent, path: string[], mine: boolean, seeNow: (k: string) => boolean): boolean[] {
  if (mine) return path.map(() => true);
  const s: string | undefined = e.sight && typeof e.sight.pc === 'string' ? e.sight.pc : undefined;
  if (s && s.length === path.length) return path.map((_, i) => s[i] === '1');
  return path.map((k) => seeNow(k));
}
/** The part of a walk to draw: from one tile before it is first seen (the fog edge) to one tile after it is last seen;
 *  entered: the index it comes into sight at (> 0: from the fog), left: the index it was last seen at (< last: into the
 *  fog). null: never seen. Pure (tests). */
export function walkSpan(seen: boolean[]): { from: number; to: number; entered: number; left: number } | null {
  const first = seen.indexOf(true), last = seen.lastIndexOf(true); if (first < 0) return null;
  return { from: Math.max(0, first - 1), to: Math.min(seen.length - 1, last + 1), entered: first, left: last };
}
/** The steps a move takes on screen (for its beat): its seen part, or the whole path without sight. Pure (tests). */
export function moveSteps(e: { path?: string[]; sight?: { pc?: string }; [k: string]: any }, mine: boolean): number {
  const n = (e.path?.length || 2);
  if (mine || !e.sight || typeof e.sight.pc !== 'string' || e.sight.pc.length !== n) return n - 1;
  const sp = walkSpan([...e.sight.pc].map((c) => c === '1'));
  return sp ? sp.to - sp.from : 0;
}
// ---------- units waiting for their turn to be shown ----------
// The engine runs the other side's turns at once, so a new state already shows every unit where its turn ended, while
// the queue is still playing the turns one by one. Until a unit's own walk plays, its token stays where it was (a
// stand-in on the walk's first tile, if you saw it there) and the real one is hidden; a hostile that comes into sight
// without walking (your walk found it, a reveal) stays hidden until its moment plays. Set when a batch arrives, before
// it is painted (FxLayer's layout effect); released by the walk or the sight event, or after HOLD_MS whatever happens.
interface Waiting { hide: Animation | null; stand: HTMLElement | null; timer: number }
const waiting = new Map<string, Waiting>();
/** Units whose walk is playing now (the combat screen draws their real token see-through until it ends). */
const walking = new Map<string, number>();
export const HOLD_MS = 9000;
/** A held unit is never let go while the queue that holds its moment is still playing (a long enemy phase, a cut-in in
 *  the middle): it waits past HOLD_MS, to this cap at most. Before, the 9 s ran out and a unit an enemy pushed late in
 *  its phase stood on the tile it was pushed to before the blow that pushed it had played (Leon, 10 Nov 2026). */
export const HOLD_CAP_MS = 60000;
/** Stop holding a unit: its stand-in goes; its real token shows again (unless keepHide: a walker took it over). */
export function releaseMover(id: string, keepHide = false) {
  const w = waiting.get(id); if (!w) return; waiting.delete(id); clearTimeout(w.timer); w.stand?.remove(); if (!keepHide) w.hide?.cancel();
  holdChanged();
}
/** A unit held where it was last seen drops out of sight: its stand-in fades there (300 ms). Returns false when it was
 *  not held with a stand-in. */
function fadeStandIn(id: string): boolean {
  const w = waiting.get(id); if (!w) return false;
  waiting.delete(id); clearTimeout(w.timer); w.hide?.cancel();
  const st = w.stand; holdChanged(); if (!st) return false;
  anim(st, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' });
  setTimeout(() => st.remove(), slow(300) + 40);
  return true;
}
/** Every unit whose real token the screen keeps see-through now: waiting for its moment, walking, or stopped mid-walk. */
function heldIds(): Set<string> { return new Set([...waiting.keys(), ...walking.keys(), ...parked.keys()]); }
/** How far each fight's events have been taken up by the layer (FxLayer: queued, or synced silently), by stream. */
const processed = new Map<string, number>();
/** How far each stream has been handed to the queue (queued) and has actually played or been skipped (played). */
const queuedTo = new Map<string, number>(), playedTo = new Map<string, number>();
const notePlayed = (stream: string | undefined, n: number, turnOf?: string) => { if (!stream || !n) return; moved(); if (turnOf) turnShown.set(stream, turnOf); if (n > (playedTo.get(stream) || 0)) { playedTo.set(stream, n); holdChanged(); } };
// ---------- the way out (docs/design/handoffs/coop-stall.md) ----------
// The combat screen shows the turn, the log and the HP as far as the effects have played, so an effect that is counted
// as waiting but will never play would lock the screen for good (seen once: the action panel greyed out on the player's
// own turn and never came back). So the wait has a bound. A stream whose effects wait while nothing has moved in these
// books (nothing queued, taken up or played) for STUCK_MS and nothing is left to play them (no timer, no gate), or for
// STUCK_HARD_MS whatever is left, is settled: everything in it counts as played and the screen shows the real state.
/** How long nothing may move, with nothing left to play, before a waiting stream is settled (ms, wall clock: longer than
 *  FxLayer's own wait for the grid before it queues a batch, about 4.7 s). */
export const STUCK_MS = 6000;
/** How long nothing may move at all before a waiting stream is settled, whatever is still scheduled (no beat, cut-in or
 *  Miracle holds the stage a fraction as long). */
export const STUCK_HARD_MS = 45000;
/** When something last moved in the books, and when each stream's newest effect was first seen by the screen. */
let lastMove = 0, settled = 0;
const topSeen = new Map<string, { n: number; at: number }>();
const moved = () => { lastMove = typeof performance !== 'undefined' ? performance.now() : 0; };
/** Which of a fight's effects still wait to be shown (null: the layer has not met this fight, the state is what shows).
 *  Settles a stuck stream first (see above). */
function waitingIn(cb: { fx?: FxEvent[] }, key: string): ((e: FxEvent) => boolean) | null {
  const p = processed.get(key); if (p == null) return null;
  let done = playedTo.get(key) || 0; const q = queuedTo.get(key) || 0;
  const fx = cb.fx || [], top = fx.length ? fx[fx.length - 1].n || 0 : 0, now = performance.now();
  let seen = topSeen.get(key); if (!seen || seen.n !== top) topSeen.set(key, (seen = { n: top, at: now }));
  if (top > done) {
    const quiet = now - Math.max(lastMove, seen.at);
    if (quiet > STUCK_HARD_MS || (quiet > STUCK_MS && !timers.length && !held && now > queueEnd)) {
      try { console.warn('[phc] a fight\'s effects stopped playing: showing the real state', { stream: key, played: done, queued: q, takenUp: p, newest: top, quietMs: Math.round(quiet) }); } catch { /* */ }
      playedTo.set(key, (done = top)); settled++;
    }
  }
  return (e) => e.n > done && (e.n <= q || e.n > p);
}
/** The unit whose turn banner played last, by stream. */
const turnShown = new Map<string, string>();
/**
 * Whose turn the screen shows while other turns are still playing out: the unit of the last turn banner that has
 * played, as long as a later turn's banner is still waiting (null: nothing waits, the state's own turn is the one on
 * screen). The host works a whole hostile phase out in one step, so the state says "your turn" long before the
 * hostiles' moves have been shown.
 */
export function fxShownTurn(g: GameState | null | undefined): { unit: string | null } | null {
  const cb = g?.combat, key = fightStream(g); if (!cb || !key || cb.over || !hasLayer()) return null; // no effects layer: nothing will play, the state is what shows
  const w = waitingIn(cb, key); if (!w) return null;
  const waits = (cb.fx || []).some((e) => e.k === 'turn' && w(e));
  return waits ? { unit: turnShown.get(key) || null } : null;
}
/** These events are about to be queued (FxLayer, before a delayed queueFx): they count as not yet played. */
export function noteQueued(stream: string | null | undefined, n: number) { moved(); if (stream && n > (queuedTo.get(stream) || 0)) queuedTo.set(stream, n); }
/** How many of the fight's log lines show now: those written before the first effect still to play (null: all). */
export function fxShownLog(g: GameState | null | undefined): number | null {
  const cb = g?.combat, key = fightStream(g); if (!cb || !key || cb.over || !hasLayer()) return null; // no effects layer: nothing will play, the state is what shows
  const w = waitingIn(cb, key); if (!w) return null;
  for (const e of cb.fx || []) if (w(e) && typeof e.L === 'number') return e.L;
  return null;
}
/**
 * The HP each unit shows now: what it had before the first effect that changes it and has not played yet (the engine
 * stamps hp: {unit: [was, now]} on the event a change follows; combat.ts emitFx). A unit with nothing waiting is not in
 * the map (it shows its real HP). So a bar falls when the hit lands on screen, not when the state arrives.
 */
export function fxShownHp(g: GameState | null | undefined): Map<string, number> {
  const out = new Map<string, number>(), cb = g?.combat, key = fightStream(g); if (!cb || !key || !hasLayer()) return out;
  const w = waitingIn(cb, key); if (!w) return out;
  for (const e of cb.fx || []) {
    if (!e.hp || !w(e)) continue;
    for (const [id, v] of Object.entries(e.hp as Record<string, [number, number]>)) if (!out.has(id)) out.set(id, v[0]);
  }
  return out;
}
export function setProcessed(stream: string | null | undefined, n: number) { if (!stream || processed.get(stream) === n) return; moved(); processed.set(stream, n); holdChanged(); }
/** The fight's effects stream key (its numbering restarts with every fight). */
export const fightStream = (g: GameState | null | undefined): string | null =>
  g && g.combat ? 'cb|' + g.code + '|' + g.combat.name + '|' + (g.combat.log[0] || '') : null;
/** The units the combat screen draws see-through now (combat.js): those held, walking or stopped mid-walk, and those
 *  with a walk or a coming-into-sight in events the layer has not taken up yet (a new state is painted before its
 *  effects are queued: without this a hostile would show at its walk's end for a frame, or for the whole combat-in). */
export function fxHeldUnits(g: GameState | null | undefined): Set<string> {
  const out = heldIds(), cb = g?.combat, key = fightStream(g); if (!cb || !key) return out;
  let p = processed.get(key);
  if (p == null && (cb.round || 1) <= 1 && (cb.fx || []).length <= 40 && ((cb.fx || [])[0]?.n || 1) <= 1) p = 0; // a fight's opening: it will play (FxLayer's own test)
  if (p == null) return out;
  for (const e of cb.fx || []) if (e.n > p && e.unit && mineOnly(e) && (e.k === 'move' || (e.k === 'sight' && (e.how === 'enter' || e.how === 'reveal')))) out.add(String(e.unit));
  for (const e of cb.fx || []) if (e.n > p && e.k === 'shove' && e.target && e.ok && e.from !== e.to && mineOnly(e)) out.add(String(e.target));
  return out;
}
/** What each unit's token looks like (the combat screen tells the layer every render): a walk whose unit has no token
 *  on screen (it died at the end of it, it was never in sight before) is drawn from this. */
export interface TokenLook { id: string; src: string; style: string; kind?: { text: string; style: string } | null; hp?: { box: string; chip: string; fill: string } | null }
const looks = new Map<string, TokenLook>();
export function setTokenLooks(list: TokenLook[]) { looks.clear(); for (const l of list) looks.set(l.id, l); }
function lookEl(id: string): HTMLElement | null {
  const l = looks.get(id); if (!l || !l.src || typeof document === 'undefined') return null;
  const i = document.createElement('img'); i.src = l.src; i.alt = ''; i.setAttribute('style', l.style); return i;
}
/** A walker, a stand-in or a fading copy of a unit: its token with its kind chip and HP bar as on its tile (a hostile is
 *  read by those: they must not pop on when the walk ends). Drawn at the tile's own size and scaled to the map's zoom;
 *  box: the size of the layer box to put it in (a tile on screen). */
function unitCopy(id: string, src: HTMLElement, p: Pt): HTMLElement {
  const base = (src.matches?.('[data-phc-group]') ? src.querySelector('[data-phc-gtok]') : src) as HTMLElement | null;
  let anyTile = tileEl(unit(id)?.pos);
  if (!anyTile) for (const x of units.values()) { anyTile = tileEl(x.pos); if (anyTile) break; }
  const natural = anyTile && anyTile.offsetWidth > 4 ? anyTile.offsetWidth : 46, k = p.s / natural;
  const wrap = document.createElement('div');
  wrap.setAttribute('data-phc-group', id);
  wrap.style.cssText = 'position:relative;flex:none;width:' + natural + 'px;height:' + natural + 'px;display:grid;place-items:center;transform:scale(' + k.toFixed(4) + ');transform-origin:50% 50%';
  if (base) {
    const tok = base.cloneNode(true) as HTMLElement;
    tok.setAttribute('data-phc-gtok', '1');
    tok.style.opacity = '1'; tok.style.translate = ''; tok.style.rotate = ''; tok.style.filter = ''; tok.style.boxShadow = ''; tok.style.margin = '0';
    wrap.appendChild(tok);
  }
  const l = looks.get(id);
  if (l?.kind) { const c = document.createElement('span'); c.textContent = l.kind.text; c.setAttribute('style', l.kind.style); wrap.appendChild(c); }
  if (l?.hp) {
    const b = document.createElement('span'); b.setAttribute('style', l.hp.box);
    const c1 = document.createElement('span'); c1.setAttribute('style', l.hp.chip); const c2 = document.createElement('span'); c2.setAttribute('style', l.hp.fill);
    b.append(c1, c2); wrap.appendChild(b);
  }
  return wrap;
}
/** Put a unit copy on the layer over a tile (p) for ms; returns the layer box (the copy is its first child). */
function putCopy(id: string, src: HTMLElement, p: Pt, ms: number): HTMLElement {
  const box = put(unitCopy(id, src, p), p, p.s, p.s, ms);
  box.style.display = 'grid'; box.style.placeItems = 'center';
  return box;
}
/** Is this unit held (its moment not played yet)? */
export const isHeld = (id: string) => waiting.has(id);
/** Which units of a batch to hold, and how: 'walk' (its first walk; stand: the tile to keep it on, if seen there),
 *  'sight' (it comes into sight without walking: hidden until then) or 'lost' (it drops out of sight: a copy stays where
 *  it was last seen, stand, until that moment plays and it fades). Pure (tests). */
export function moversOf(evs: FxEvent[], sideOf: (id: string) => string | undefined): Map<string, { kind: 'walk' | 'sight' | 'lost'; stand: string | null }> {
  const out = new Map<string, { kind: 'walk' | 'sight' | 'lost'; stand: string | null }>();
  for (const e of evs) {
    if (!mineOnly(e)) continue;
    // a push (Stopping Shot, a shove): the unit stays where it was until its push plays (live check, 10 Nov 2026: it
    // stood on the tile it was pushed to before the shot that pushed it landed)
    if (e.k === 'shove' && e.target && e.ok && e.from && e.to && e.from !== e.to) { const t = String(e.target); if (!out.has(t)) out.set(t, { kind: 'walk', stand: String(e.from) }); continue; }
    if (!e.unit) continue;
    const id = String(e.unit);
    if (out.has(id)) continue;
    if (e.k === 'move') {
      const path: string[] = (e.path || [e.from, e.to]).filter(Boolean);
      const mine = sideOf(id) === 'pc', seen0 = mine || !e.sight || typeof e.sight.pc !== 'string' || e.sight.pc[0] === '1';
      out.set(id, { kind: 'walk', stand: seen0 ? path[0] || null : null });
    } else if (e.k === 'sight' && (e.how === 'enter' || e.how === 'reveal')) out.set(id, { kind: 'sight', stand: null });
    else if (e.k === 'sight' && e.how === 'lost' && e.at) out.set(id, { kind: 'lost', stand: String(e.at) }); // it stays where it was last seen until it fades
  }
  return out;
}
/** Hold the units a batch is about to show (see above). Fights only. */
export function holdMovers(evs: FxEvent[]) {
  if (!seenUnits || !hasLayer()) return;
  for (const [id, m] of moversOf(evs, (x) => unit(x)?.side)) {
    if (waiting.has(id) || parked.has(id)) continue;
    const u = unit(id); if (!u) continue;
    const live = !u.dead && seesUnit(id) ? tokenEl(tileEl(u.pos)) : null;
    if (!live && !m.stand && !(u.dead || seesUnit(id))) continue;
    const hide = live ? anim(live, [{ opacity: 0 }, { opacity: 0 }], { duration: HOLD_CAP_MS }) : null;
    let stand: HTMLElement | null = null;
    const p = m.stand && (m.stand !== u.pos || m.kind === 'lost') ? centre(m.stand) : null, src = lastTok.get(id) || live || lookEl(id);
    if ((m.kind === 'walk' || m.kind === 'lost') && p && src) {
      stand = putCopy(id, src, p, HOLD_CAP_MS); stand.setAttribute('data-phc-stand', id); stand.setAttribute('data-phc-stand-at', m.stand!);
      anchor(stand, m.stand!, HOLD_CAP_MS);
    } else if (m.kind === 'walk' && m.stand === u.pos && hide) { hide.cancel(); } // it ends where it began: nothing to hold
    const t0 = performance.now(), entry = { hide: m.kind === 'walk' && m.stand === u.pos ? null : hide, stand, timer: 0 };
    const tick = () => { // let go once its queue has run out (or at the cap), never in the middle of it
      if (waiting.get(id) !== entry) return;
      if (performance.now() < queueEnd && performance.now() - t0 < slow(HOLD_CAP_MS)) { entry.timer = window.setTimeout(tick, 400); return; }
      releaseMover(id);
    };
    entry.timer = window.setTimeout(tick, slow(HOLD_MS));
    waiting.set(id, entry);
  }
  // A unit this batch kills is gone from the grid at once, but its fall plays later (after a takedown cut-in, after the
  // shot's flight): its ghost stands on its tile from now until its 'down' plays (live check: the token vanished and its
  // loot pile showed during the cut-in, then came back alive for the shot).
  for (const e of evs) if (e.k === 'down' && e.dead && e.unit && mineOnly(e) && unit(String(e.unit))?.dead) ghostOf(String(e.unit), e.at, HOLD_MS);
  holdTiles(evs);
  holdChanged();
}

// ---------- cover and clouds waiting for their moment ----------
// The grid shows the state after the action at once: a wall already rubble (or at its new HP) while the shell that
// breaks it is still in the air, a smoke cloud's tint before the grenade lands. Each render keeps a copy of every tile
// with breakable cover on it; a batch that damages that cover puts the copy over the tile until the last 'object' event
// for it plays. A smoke grenade's cloud tint (the tile's zone layer) is held see-through until its 'explode' plays.
const lastTiles = new Map<string, HTMLElement>();
const tileHolds = new Map<string, { box: HTMLElement; left: number; timer: number }>();
const cloudHolds = new Map<string, Animation[]>();
/** After each render: copy the tiles with breakable cover (not one held now: its copy is the old look). */
function rememberTiles() {
  const objs: any[] = (ctxGame?.combat as any)?.objects || [];
  const keys = new Set<string>(objs.filter((o) => o && o.pos && o.hp != null && o.hp > 0).map((o) => String(o.pos)));
  for (const k of [...lastTiles.keys()]) if (!keys.has(k) && !tileHolds.has(k)) lastTiles.delete(k);
  for (const k of keys) { if (tileHolds.has(k)) continue; const el = tileEl(k); if (el) lastTiles.set(k, el.cloneNode(true) as HTMLElement); }
}
/** The tiles (and clouds) a batch changes, held as they were. Pure part: which tiles, how many object events each. */
export function tilesOf(evs: FxEvent[]): { objects: Map<string, number>; clouds: { at: string; radius: number; n: number }[] } {
  const objects = new Map<string, number>(), clouds: { at: string; radius: number; n: number }[] = [];
  for (const e of evs) {
    if (!mineOnly(e) || !e.at) continue;
    if (e.k === 'object' && Number(e.dmg) > 0) objects.set(String(e.at), (objects.get(String(e.at)) || 0) + 1);
    if (e.k === 'explode' && gunOf(String(e.what || ''), '').blast === 'smoke') clouds.push({ at: String(e.at), radius: Number(e.radius) || 1, n: e.n || 0 });
  }
  return { objects, clouds };
}
function holdTiles(evs: FxEvent[]) {
  if (!hasLayer() || reducedMotion()) return;
  const { objects, clouds } = tilesOf(evs);
  for (const [k, n] of objects) {
    const had = tileHolds.get(k); if (had) { had.left += n; continue; }
    const src = lastTiles.get(k), tile = tileEl(k), p = centre(k); if (!src || !tile || !p || !visible(k)) continue;
    const r = tile.getBoundingClientRect(), copy = document.createElement('div');
    copy.className = String(src.className || '').replace(/\bphc-tok\b/g, 'phc-tok-was');
    copy.setAttribute('style', (src.getAttribute('style') || '') + ';width:100%;height:100%;margin:0;position:relative;pointer-events:none');
    for (const c of Array.from(src.childNodes)) copy.appendChild(c.cloneNode(true));
    const box = put(copy, p, r.width, r.height, HOLD_MS); box.style.zIndex = '0'; box.setAttribute('data-phc-tile-was', k);
    anchor(box, k, HOLD_MS);
    tileHolds.set(k, { box, left: n, timer: window.setTimeout(() => releaseTile(k, true), slow(HOLD_MS)) });
  }
  for (const c of clouds) {
    const id = c.at + '|' + c.n; if (cloudHolds.has(id)) continue;
    const anims: Animation[] = [];
    const R = Math.max(0, Math.min(6, Math.round(c.radius))), [cx, cy] = c.at.split(',').map(Number);
    for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) {
      const z = zoneLayerOf(tileEl((cx + dx) + ',' + (cy + dy))); if (!z) continue;
      const a = anim(z, [{ opacity: 0 }, { opacity: 0 }], { duration: HOLD_MS }); if (a) anims.push(a);
    }
    cloudHolds.set(id, anims);
  }
}
/** A tile's zone layer (combat.js: placed magic, smoke, light), by its style. */
function zoneLayerOf(tile: HTMLElement | null): HTMLElement | null {
  if (!tile) return null;
  for (const c of Array.from(tile.children) as HTMLElement[]) { const st = c.getAttribute('style') || ''; if (/z-index:\s*1(\D|$)/.test(st) && /box-sizing:\s*border-box/.test(st)) return c; }
  return null;
}
/** One of a held tile's object events played: the last one shows the tile as it is now. */
function releaseTile(k: string, all = false) {
  const h = tileHolds.get(k); if (!h) return;
  if (!all && --h.left > 0) return;
  tileHolds.delete(k); clearTimeout(h.timer);
  const box = h.box; anim(box, [{ opacity: 1 }, { opacity: 0 }], { duration: 120, fill: 'forwards' }); setTimeout(() => box.remove(), slow(120) + 30);
}
function releaseCloud(e: FxEvent) {
  for (const [id, anims] of cloudHolds) if (id === e.at + '|' + (e.n || 0) || (!e.n && id.startsWith(e.at + '|'))) { for (const a of anims) a.cancel(); cloudHolds.delete(id); }
}
function releaseAllTiles() { for (const k of [...tileHolds.keys()]) releaseTile(k, true); for (const anims of cloudHolds.values()) for (const a of anims) a.cancel(); cloudHolds.clear(); }

function walkUnit(e: FxEvent, path: string[], per: number, seen: boolean[]) {
  const sp = walkSpan(seen); if (!sp) return;
  const id = String(e.unit || ''), u = unit(id), mine = u?.side === 'pc';
  const sub = path.slice(sp.from, sp.to + 1), ops = seen.slice(sp.from, sp.to + 1);
  const pts = sub.map((k) => centre(k)); if (pts.some((p) => !p) || pts.length < 1) return;
  // final: the unit stands where this walk ends. Otherwise its copy stops there (an Overwatch shot mid-walk, a second
  // walk to come) and waits; so does one that dies there (its fall plays on the copy, from its 'down').
  const final = !u || (u.pos === e.to && !u.dead);
  const live = u && !u.dead && seesUnit(id) ? tokenEl(tileEl(u.pos)) : null;
  const was = parked.get(id), src = (was?.box.firstElementChild as HTMLElement | null) || live || lastTok.get(id) || lookEl(id);
  const enteredAt = sp.entered > 0 ? sp.entered - sp.from : -1, leftAt = sp.left < path.length - 1 ? sp.left - sp.from : -1;
  const hostile = !mine;
  // The "!" and the record, timed to the step it comes into sight on.
  if (enteredAt > 0) {
    const tile = path[sp.entered];
    after(() => { const p = centre(tile); const show = hostile && bangDue(id, performance.now()); if (p && show) { bangMark(tile, p, true); if (tickDue(performance.now())) play('sighted', p, { gain: 0.9 }); } noteSight(id, 'enter', tile, show); }, enteredAt * per);
  }
  if (leftAt >= 0) after(() => noteSight(id, 'leave', path[sp.left]), (leftAt + 1) * per);
  const last = pts[pts.length - 1]!;
  if (!src) return;
  if (reducedMotion() || pts.length < 2) {
    // No walk: a hostile coming out of the fog fades in where it stands; one going into it fades out where it was seen.
    unpark(id);
    if (enteredAt > 0 && live) anim(live, [{ opacity: 0 }, { opacity: 1 }], { duration: 300, easing: 'ease-out' });
    if (leftAt >= 0) { const p = pts[leftAt]!, box = putCopy(id, src, p, 320); anim(box, [{ opacity: 1 }, { opacity: 0 }], { duration: 320, fill: 'forwards' }); }
    return;
  }
  // The walker: the token with its kind chip and HP bar (unitCopy), so nothing pops on where the walk ends.
  const ms = per * (pts.length - 1), life = final ? ms : HOLD_MS;
  unpark(id, true);
  const box = putCopy(id, src, last, life);
  box.setAttribute('data-phc-walker', id);
  anim(box, pts.map((p, i) => ({ transform: 'translate(' + (p!.x - last.x) + 'px,' + (p!.y - last.y) + 'px) translateY(' + (i % 2 ? -3 : 0) + 'px)', opacity: ops[i] ? 1 : 0 })), { duration: ms, easing: 'linear', fill: 'forwards' });
  // The real token (where the whole walk ends) stays hidden while any part of it plays.
  was?.hide?.cancel();
  const hide = live ? anim(live, [{ opacity: 0 }, { opacity: 0 }], { duration: life }) : null;
  if (!final) {
    const entry: Parked = { box, key: String(e.to), hide }; parked.set(id, entry);
    setTimeout(() => { if (parked.get(id) === entry) unpark(id); }, slow(life)); // the cap; it normally goes long before
  } else {
    const t = window.setTimeout(() => { if (walking.get(id) === t) { walking.delete(id); holdChanged(); } }, slow(ms));
    walking.set(id, t);
  }
  holdChanged();
}

// ---------- weapons ----------
type Look = 'bullet' | 'pellets' | 'arrow' | 'lob' | 'rocket' | 'flame' | 'bolt' | 'beam' | 'thrown';
interface Gun { sound: Sfx | null; rate?: number; look: Look; color?: string; blast?: 'frag' | 'fire' | 'smoke' | 'flash' | 'zap' }
function gunOf(id: string, cat: string): Gun {
  switch (id) {
    case 'magistrate_pistol': return { sound: 'gun_revolver', rate: 1.05, look: 'bullet' };
    case 'parlour_pistol': return { sound: 'gun_pistol', rate: 1.15, look: 'bullet' };
    case 'frontier_hand_cannon': return { sound: 'gun_magnum', rate: 0.9, look: 'bullet' };
    case 'long_rifle': case 'ccec_marksman_rifle': return { sound: 'gun_sniper', look: 'bullet' };
    case 'lever_carbine': return { sound: 'gun_lever', look: 'bullet' };
    case 'adamantile_battle_rifle': return { sound: 'gun_rifle', rate: 0.9, look: 'bullet' };
    case 'sawn_off': return { sound: 'gun_shotgun', rate: 1.05, look: 'pellets' };
    case 'blackpoint_700': return { sound: 'gun_heavy', rate: 0.85, look: 'bullet' };
    case 'hellraiser_lmg': case 'hellraiser_rotary': return { sound: 'gun_rifle', rate: 0.85, look: 'bullet' };
    case 'smetanita_thumper': return { sound: 'explosion_boom', rate: 2.2, look: 'lob', blast: 'frag' };
    case 'breacher_tube': return { sound: 'vent', rate: 1.6, look: 'rocket', blast: 'frag' };
    case 'purifier_flamer': return { sound: 'vent', rate: 0.7, look: 'flame', blast: 'fire' };
    case 'crossbow': case 'repeating_crossbow': return { sound: 'swish', rate: 0.7, look: 'arrow' };
    case 'frag_grenade': case 'satchel_charge': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'frag' };
    case 'incendiary_grenade': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'fire' };
    case 'smoke_grenade': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'smoke' };
    case 'flashbang': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'flash' };
    case 'bot_scrambler': return { sound: 'swish', rate: 0.6, look: 'lob', blast: 'zap' };
    case 'core_rifle': return { sound: 'sigil_evoke', rate: 1.35, look: 'bolt', color: SIGIL_INK };
    case 'lumeri_censer_gun': return { sound: 'gun_shotgun', look: 'pellets', color: SOUL_WARM };
  }
  if (cat === 'revolver') return { sound: 'gun_revolver', look: 'bullet' };
  if (cat === 'smg') return { sound: 'gun_smg', look: 'bullet' };
  if (cat === 'rifle') return { sound: 'gun_rifle', look: 'bullet' };
  if (cat === 'shotgun') return { sound: 'gun_shotgun', look: 'pellets' };
  if (cat === 'heavy') return { sound: 'gun_heavy', look: 'bullet' };
  if (cat === 'bow') return { sound: 'swish', rate: 0.8, look: 'arrow' };
  if (cat === 'thrown') return { sound: 'swish', rate: 0.7, look: 'lob' };
  // a thrown melee weapon (Throw, Flurry's Thrown line): a swish, and its flight is drawn by its melee_fx (the weapon's
  // own icon; fx/melee-techniques.ts), not a tracer. Before this it fell through to a pistol shot.
  if (/melee|unarmed/.test(cat)) return { sound: 'swish', rate: 0.8, look: 'thrown' };
  return { sound: 'gun_pistol', look: 'bullet' };
}
/** What a reload handles, for its sound: arrows and bolts, a fuel canister, a launcher's shell, shotgun-style shells,
 *  or a gun's rounds and magazines. */
export function reloadKind(id: string, cat: string, look: Look = gunOf(id, cat).look): 'bow' | 'fuel' | 'launcher' | 'shells' | 'gun' {
  if (look === 'arrow' || cat === 'bow') return 'bow';
  if (look === 'flame') return 'fuel';
  if (look === 'lob' || look === 'rocket') return 'launcher';
  if (look === 'pellets' || cat === 'shotgun') return 'shells';
  return 'gun';
}
/** A burst or full-auto volley has one long recording; the shots inside it then fire silently. */
function volleySound(cat: string, mode: string, weapon = ''): { s: Sfx; rate?: number } | null {
  if (mode !== 'burst' && mode !== 'auto') return null;
  if (cat === 'shotgun') return null;
  // only a gun rattles: a bow's volley is its arrows, each with its own draw and release (and so for anything else that isn't bullets)
  if (gunOf(weapon, cat).look !== 'bullet') return null;
  if (mode === 'auto') return cat === 'heavy' ? { s: 'auto_heavy' } : cat === 'rifle' ? { s: 'auto_rifle' } : { s: 'auto_smg', rate: cat === 'pistol' ? 1.1 : 1 };
  return cat === 'rifle' || cat === 'heavy' ? { s: 'burst_rifle' } : { s: 'burst_smg', rate: cat === 'pistol' ? 1.1 : 1 };
}
let volley: { unit: string; silent: boolean; until: number } | null = null;

// ---------- the pieces of a shot ----------
function muzzle(from: Pt, to: Pt, color = MUZZLE) {
  const a = angle(from, to), r = (a * 180) / Math.PI + 90, off = from.s * 0.42;
  const p = { x: from.x + Math.cos(a) * off, y: from.y + Math.sin(a) * off };
  burst('muzzle', { x: p.x + Math.cos(a) * from.s * 0.3, y: p.y + Math.sin(a) * from.s * 0.3 }, from.s * 1.05, 140, { color, rot: r, from: 0.7, to: 1.2, fade: 0 });
  burst('flare', p, from.s * 1.15, 150, { color: HOT, from: 0.6, to: 1.5 });
  return p;
}
/** A projectile from a to b over ms (straight, or lobbed). */
function projectile(a: { x: number; y: number }, b: { x: number; y: number }, ms: number, look: Look, s: number, color?: string) {
  if (reducedMotion()) return;
  const ang = Math.atan2(b.y - a.y, b.x - a.x), deg = (ang * 180) / Math.PI;
  const el = document.createElement('div');
  const len = look === 'arrow' ? s * 0.55 : look === 'bolt' || look === 'beam' ? s * 0.7 : look === 'rocket' ? s * 0.35 : look === 'lob' ? s * 0.18 : s * 0.8;
  const hgt = look === 'lob' ? s * 0.18 : look === 'rocket' ? 5 : look === 'arrow' ? 2 : 4;
  el.style.cssText = 'width:100%;height:100%;border-radius:' + (look === 'lob' ? '50%' : '2px') + ';' + (look === 'arrow' ? 'background:linear-gradient(90deg,rgba(201,183,156,0),#C9B79C 30%,#E7EBF3)'
    : look === 'lob' ? 'background:#2A3242;border:2px solid #A3AEC2' : look === 'rocket' ? 'background:linear-gradient(90deg,rgba(255,180,90,0),#FFB45A 40%,#FFFFFF);box-shadow:0 0 8px #FFB45A'
    : 'background:linear-gradient(90deg,rgba(255,243,196,0),' + (color || HOT) + ' 70%,#FFFFFF);box-shadow:0 0 8px ' + (color || '#FFD27A') + ',0 0 2px #FFFFFF');
  const box = put(el, a, len, hgt, ms);
  box.style.left = a.x - len + 'px'; box.style.top = a.y - hgt / 2 + 'px'; box.style.transformOrigin = '100% 50%';
  const dx = b.x - a.x, dy = b.y - a.y;
  if (look === 'lob') {
    const h = Math.max(30, Math.hypot(dx, dy) * 0.35), f: Keyframe[] = [];
    for (let i = 0; i <= 8; i++) { const t = i / 8; f.push({ transform: 'translate(' + dx * t + 'px,' + (dy * t - 4 * h * t * (1 - t)) + 'px) rotate(' + t * 540 + 'deg)' }); }
    anim(box, f, { duration: ms, easing: 'linear', fill: 'forwards' });
  } else anim(box, [{ transform: 'translate(0,0) rotate(' + deg + 'deg)', opacity: 1 }, { transform: 'translate(' + dx + 'px,' + dy + 'px) rotate(' + deg + 'deg)', opacity: 1 }], { duration: ms, easing: 'linear', fill: 'forwards' });
}
/** Where a miss ends up: past the target and off to one side. */
function missPoint(from: Pt, to: Pt): { x: number; y: number } {
  const a = angle(from, to), side = (Math.random() < 0.5 ? -1 : 1) * to.s * (0.35 + Math.random() * 0.3), over = to.s * (0.9 + Math.random() * 0.8);
  return { x: to.x + Math.cos(a) * over - Math.sin(a) * side, y: to.y + Math.sin(a) * over + Math.cos(a) * side };
}
/** A target is hit: flash, sparks or blood, a decal that stays a few seconds, the token shakes, a number rises. */
function impact(e: FxEvent, p: Pt, tid: string | null, o: { crit?: boolean; melee?: boolean; color?: string; sound?: Sfx | null; dmg?: number } = {}) {
  const u = unit(tid), robot = !!u?.robot, tok = tokOrGhost(tid, e.to || u?.pos, !!e.killed || !!u?.dead);
  burst(o.crit ? 'flash_crit' : 'flash_star', p, p.s * (o.crit ? 1.9 : 1.1), o.crit ? 260 : 170, { color: o.color || WHITE, from: 0.3, to: 1.2, rot: Math.random() * 90 });
  burst(Math.random() < 0.5 ? 'spark_burst' : 'spark_burst_2', p, p.s * 0.8, 260, { color: o.color || (robot ? '#FFD27A' : '#C2272F'), from: 0.4, to: 1.15 });
  decal(e.to || u?.pos, robot || o.color ? 'scorch' : 'blood_' + (1 + Math.floor(Math.random() * 3)), robot || o.color ? '#1A1A1A' : '#7A0E16');
  shake(tok, o.crit ? 1.6 : 1); flash(tok, 'hurt');
  if (o.crit) shakeScreen(0.8);
  const snd = o.sound !== undefined ? o.sound : robot ? 'hit_metal' : o.crit ? 'hit_heavy' : 'hit_flesh';
  if (snd) play(snd, p, { rate: jitter() });
  if (o.dmg != null) floatText(o.dmg > 0 ? '−' + o.dmg + (o.crit ? '!' : '') : o.dmg === 0 && e.downedHit ? 'HIT' : '0', p, HP, { big: o.crit });
}
/** A mark left on a tile for a few seconds (blood, scorch), anchored so it follows the map. */
function decal(k: string | undefined, name: string, color: string, ms = 3200, size = 0.55) {
  const p = k ? centre(k) : null; if (!p || !k) return;
  const off = { x: (Math.random() - 0.5) * p.s * 0.3, y: (Math.random() - 0.5) * p.s * 0.3 };
  const box = put(sprite(name, color), { x: p.x + off.x, y: p.y + off.y }, p.s * size, p.s * size, ms);
  box.style.zIndex = '0';
  anchor(box, k, ms, off.y / p.s);
  anim(box, [{ opacity: 0, transform: 'scale(.5) rotate(' + Math.random() * 360 + 'deg)' }, { opacity: 0.85, transform: 'scale(1) rotate(' + Math.random() * 360 + 'deg)', offset: 0.04 }, { opacity: 0.75, offset: 0.75 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}
function dust(p: { x: number; y: number }, s: number, color = '#A3AEC2') {
  burst('dust', p, s * 0.7, 520, { color, from: 0.3, to: 1.1 });
  burst('dirt', p, s * 0.5, 380, { color: '#7F8BA1', from: 0.5, to: 1.2 });
}
/** A flashbang's white-out: over the map only (not the panels, the header or the turn bar; live check, 10 Nov 2026),
 *  brightest at the blast and falling off over a dozen tiles. Without a map on screen, the whole-screen tint. */
function mapFlash(k: string | undefined, p: Pt, ms = 350) {
  let g: HTMLElement | null = tileEl(k) || null; const tw = g ? g.getBoundingClientRect().width : 0;
  while (g && g.parentElement && g.getBoundingClientRect().width < tw * 4) g = g.parentElement;
  const r = g && g !== tileEl(k) ? g.getBoundingClientRect() : null;
  if (!r || r.width < 10) { screenTint('white', ms); return; }
  const d = document.createElement('div'), cx = p.x - r.left, cy = p.y - r.top;
  d.style.cssText = 'width:100%;height:100%;border-radius:6px;background:radial-gradient(circle at ' + cx + 'px ' + cy + 'px, rgba(255,255,255,.9) 0, rgba(255,255,255,.6) ' + p.s * 2.5 + 'px, rgba(255,255,255,.22) ' + p.s * 7 + 'px, rgba(255,255,255,.08) ' + p.s * 12 + 'px)';
  const box = put(d, { x: r.left + r.width / 2, y: r.top + r.height / 2 }, r.width, r.height, ms); box.style.zIndex = '2';
  anim(box, [{ opacity: 0 }, { opacity: 1, offset: 0.12 }, { opacity: 1, offset: 0.5 }, { opacity: 0 }], { duration: ms, fill: 'forwards' });
}
function explosion(k: string | undefined, radius = 1, kind: 'frag' | 'fire' | 'smoke' | 'flash' | 'zap' = 'frag', point?: Pt) {
  const p = point || centre(k); if (!p) return;
  const size = p.s * (1.2 + radius * 1.1);
  if (kind === 'smoke') { burst('puff', p, size, 1600, { from: 0.3, to: 1.4, fade: 0 }); play('vent', p, { rate: 0.8 }); return; }
  if (kind === 'flash') { burst('flare', p, size * 2, 400, { color: WHITE, from: 0.2, to: 2 }); mapFlash(k, p, 350); play('explosion', p, { rate: 1.4, gain: 0.6 }); return; }
  if (kind === 'zap') { burst('zap', p, size, 420, { color: SIGIL_INK, from: 0.5, to: 1.3 }); play('sigil_overload', p, { rate: 1.3 }); return; }
  burst('fireflash_' + (1 + Math.floor(Math.random() * 2)), p, size * 0.8, 160, { from: 0.3, to: 1.2, fade: 0.6 });
  burst('boom_' + (1 + Math.floor(Math.random() * 3)), p, size, 560, { from: 0.6, to: 1.5, delay: 60 });
  if (kind === 'fire') burst('flame', p, size * 0.8, 900, { color: '#F68A38', from: 0.6, to: 1.2, delay: 120 });
  burst('smoke_black', { x: p.x, y: p.y - p.s * 0.2 }, size * 1.1, 1400, { from: 0.6, to: 1.6, delay: 200 });
  if (!point) decal(k, 'scorch', '#111111', 4200, 0.9 + radius * 0.4);
  shakeScreen(1 + radius * 0.3);
  play('explosion', p, { gain: point ? 0.7 : 1 }); play('explosion_boom', p, { gain: point ? 0.5 : 0.8 });
}

/** What a reload throws off, from behind the portrait: a revolver's or break-action's spent brass, the magazine (or
 *  canister, or bolt box) dropping to the floor, a bow's arrows slid into the quiver, a crossbow's bolt drawn from behind
 *  and set. A tactical reload drops nothing: its old magazine goes into the pack on the reload card (fx/reload.ts), and
 *  one falling under the portrait would read as a speed reload (review, 9 Nov 2026). An off-hand gun's reload does the
 *  same for that gun; a reload of both guns (e.off) throws off both. */
function reloadPieces(e: FxEvent, p: Pt, ms: number) {
  const who = whoOf(tokOf(e.unit, e.at));
  if (!who) return;
  const aim = aimFor(e.unit);
  const one = (weapon: string, cat: string, how: string, tactical: boolean, rounds: number | undefined, delay: number, noDrop = false) => {
    const br = brassOf(weapon, cat), size = Math.max(1, Math.min(6, Number((WEAPON as any)[weapon]?.magazine) || 6));
    if (br.bow === 'bow') { stowArrows(who, how === 'loose' ? Math.min(3, Math.max(1, rounds || 2)) : 1, aim, ms * 0.8); return; }
    if (br.bow === 'crossbow' && how !== 'mag') { after(() => drawArrow(who, aim, { ms: ms * 0.6, bolt: true }), delay + ms * 0.15); return; }
    if (br.load) loadRounds(who, br, rounds || size, aim, ms, { delay: delay + ms * 0.06, spent: size });
    // a speed reload's magazine leaves the reload card falling toward the unit (fx/reload.ts) and reaches it about a
    // third of the way in: from there it drops out from under the portrait to the ground, where the pile is
    // (nothing falls when nothing lands: unlimited spares, a companion's or a twin's, e.noDrop)
    if (!tactical && !noDrop && (how === 'mag' || br.mag === 'fuel_can')) dropMag(who, br.mag, { delay: delay + ms * (br.mag === 'fuel_can' ? 0.12 : 0.3) });
  };
  one(e.weapon || '', e.cat || '', e.how || 'mag', !!e.tactical, e.rounds, 0, !!e.noDrop);
  if (e.off) one(e.off.weapon || '', e.off.cat || '', e.off.how || 'mag', !!e.off.tactical, e.off.rounds, 160, !!e.off.noDrop);
}

// ---------- event handlers ----------
type Handler = (e: FxEvent) => void;
const H: Record<string, Handler> = {
  spotlight() { /* drawn by the cut-in layer (game/spotlight); the queue's gate plays it before its action */ },
  turn(e) { const p = sawThen(e) ? centre(e.at) : null; if (p) ring(p, e.side === 'pc' ? WHITE : HP, 520, { from: 0.45, to: 1.05, width: 4 }); },
  move(e) {
    const path: string[] = (e.path || [e.from, e.to]).filter(Boolean);
    if (path.length < 2) return;
    const per = e.how === 'sprint' ? 75 : 115, mine = unit(e.unit)?.side === 'pc';
    // The engine's sight counts in a fight only: the area map draws every token it has (its throwaway fight's sight is
    // not the map's).
    const seen = moveSeen(seenUnits ? e : { ...e, sight: undefined }, path, mine, (k) => visible(k) && (mine || seesUnit(e.unit) || !seenUnits)), sp = walkSpan(seen);
    const id = String(e.unit || ''), u = unit(id);
    // Never in sight: nothing drawn, nothing heard. Only the walk's last part lets the unit go (it stands where this
    // ends, or nothing more of it comes in this batch); a fogged part before more of the walk keeps it held, so its
    // token never shows at the walk's end while the rest plays (a walk split by a heart watch, an OA, a trap).
    if (!sp) { if (!u || u.dead || u.pos === e.to || lastOfUnit.has(e)) { releaseMover(id); if (parked.has(id)) unpark(id); } return; }
    walkUnit(e, path, per, seen);
    releaseMover(String(e.unit || '')); // the walker (and its own hide) has taken over from the stand-in
    // Footsteps only where the walker is seen (a step in the fog would give it away).
    let k = 0;
    for (let i = sp.from + 1; i <= sp.to && k < 8; i++) if (seen[i]) { play('step', centre(path[i]), { delay: (i - sp.from - 1) * per + 40, rate: jitter(0.1) * (e.how === 'sprint' ? 1.1 : 1), gain: 0.8 }); k++; }
  },
  sight(e) {
    const id = String(e.unit || ''), p = centre(e.at), hostile = unit(id)?.side !== 'pc';
    if (e.how === 'lost') {
      // It drops out of your sight where you last saw it (your walk took your eyes off it, a door, a watcher fell): the
      // copy kept there fades out; never a pop.
      if (!fadeStandIn(id) && p) { const src = lastTok.get(id) || lookEl(id); if (src) { const box = putCopy(id, src, p, 340); anchor(box, e.at, 340); anim(box, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-in', fill: 'forwards' }); } }
      noteSight(id, 'leave', e.at);
      return;
    }
    if (e.how === 'hide') {
      if (!visible(e.at)) { releaseMover(id); return; } // a tile you don't see: nothing to fade, nothing to say
      // It fades from your eyes where you last saw it (a copy of its token: the real one is already gone).
      const src = lastTok.get(id);
      if (p && src) {
        const box = putCopy(id, src, p, 700); anchor(box, e.at, 700);
        anim(box, reducedMotion() ? [{ opacity: 0.9 }, { opacity: 0 }] : [{ opacity: 0.95, filter: 'none', transform: 'scale(1)' }, { opacity: 0.55, filter: 'blur(1px) brightness(1.4)', transform: 'scale(1.03)', offset: 0.35 }, { opacity: 0, filter: 'blur(3px)', transform: 'scale(.96)' }], { duration: 700, easing: 'ease-in', fill: 'forwards' });
      }
      if (p) floatText('HIDDEN', p, OTHER_INK, { small: true });
      play('sg_mask', p, { gain: 0.35, rate: 1.2 });
      noteSight(id, 'hide', e.at);
      return;
    }
    const held = isHeld(id); releaseMover(id);
    const tok = tokOf(id, e.at);
    if (e.how === 'enter' && held && tok) anim(tok, [{ opacity: 0 }, { opacity: 1 }], { duration: 260, easing: 'ease-out' }); // it was kept hidden until now: it fades up
    if (e.how === 'reveal' && tok && !reducedMotion()) {
      // A reveal shimmers in: the token comes up out of nothing through a bright flicker, a ring closes on it.
      anim(tok, [{ opacity: 0, filter: 'brightness(2.4) saturate(0)' }, { opacity: 0.5, filter: 'brightness(2) saturate(0)', offset: 0.25 }, { opacity: 0.2, offset: 0.4 }, { opacity: 1, filter: 'brightness(1.4)', offset: 0.7 }, { opacity: 1, filter: 'none' }], { duration: 520, easing: 'ease-out' });
      if (p) ring(p, hostile ? HOSTILE_INK : OTHER_INK, 520, { from: 1.6, to: 0.95, width: 2 });
    } else if (e.how === 'reveal' && tok) anim(tok, [{ opacity: 0 }, { opacity: 1 }], { duration: 250 });
    const show = hostile && bangDue(id, performance.now());
    if (p && show) { bangMark(e.at, p, true); if (tickDue(performance.now())) play('sighted', p, { gain: 0.9 }); }
    // REVEALED floats up from under the token, clear of the "!" on its corner (both are red: they must not run together).
    if (p && e.how === 'reveal') floatText('REVEALED', { ...p, y: p.y + p.s * 1.05 }, hostile ? HOSTILE_INK : OTHER_INK, { small: true, delay: 160 });
    noteSight(id, e.how === 'reveal' ? 'reveal' : 'enter', e.at, show);
  },
  overwatch(e) {
    // A held shot sprung: the watcher's mark flashes and says so, its aim draws to the tile the mover is stopped on
    // (its walk waits there: the parked walker), then the shot plays as the next beat.
    const watcherSeen = seesUnit(e.unit), wp = watcherSeen ? centre(e.from) : null, tp = at(e.at);
    const hostile = unit(e.unit)?.side !== 'pc', ink = hostile ? HOSTILE_INK : WHITE;
    if (wp) { ring(wp, ink, 560, { from: 1.55, to: 0.95, width: 3 }); flash(tokOf(e.unit, e.from), 'white'); tagChip(e.from, wp, 'OVERWATCH', ink, 1050); }
    else if (tp) tagChip(e.at, tp, 'OVERWATCH', ink, 1050, -1.25); // a watcher you can't see: the word over the mover alone
    if (tp) corners(tp, ink, 560);
    if (wp && tp) aimLine(wp, tp, ink, 600);
    play('rack', wp || tp, { rate: 1.2, gain: 0.55 });
    noteOverwatch({ watcher: watcherSeen ? String(e.unit) : '', target: String(e.target), tile: String(e.at), at: Math.round(performance.now()) });
  },
  shot(e) {
    // a thrown weapon is never a gunshot, whatever the event names as the weapon (a gun in the other hand, a blade that
    // is also a focus): a swish, no muzzle flash, no casing
    const g: Gun = e.thrown && gunOf(e.weapon || '', e.cat || '').look !== 'lob' ? { sound: 'swish', rate: 0.8, look: 'thrown' } : gunOf(e.weapon || '', e.cat || ''), br = e.thrown ? null : brassOf(e.weapon || '', e.cat || ''), from = at(e.from), toP = centre(e.to), shooterSeen = visible(e.from);
    const silent = !!(volley && volley.unit === e.unit && volley.silent && e.chain && performance.now() < volley.until);
    // A bow's shot waits for the draw: the arrow comes from the quiver behind the portrait to the front, then flies.
    const draw = drawsArrow(e) ? DRAW_MS : 0;
    if (!toP) { if (!silent && g.sound) play(g.sound, from, { rate: (g.rate || 1) * jitter(0.04), delay: draw }); return; }
    const shooterTok = shooterSeen ? tokOf(e.unit, e.from) : null;
    if (e.killed && e.target) tokOrGhost(e.target, e.to, true);
    // a Trick Shot ricochet flies on from the first target: no draw, no casing, no recoil, and the shooter's aim stays
    const rico = !!e.ricochet, aim = from && !rico ? angle(from, toP) : aimFor(e.unit);
    if (e.unit && !rico) aims.set(e.unit, aim);
    if (draw) {
      if (from && shooterTok) { drawArrow(whoOf(shooterTok), aim, { ms: draw }); play('swish', from, { rate: 1.7 * jitter(), gain: 0.35 }); }
      after(() => fire(), draw);
    } else fire();
    function fire() {
      if (!silent && g.sound) play(g.sound, from || toP, { rate: (g.rate || 1) * jitter(0.04) });
      if (!toP) return;
      let mp: { x: number; y: number } | null = null;
      if (from && shooterSeen && g.look !== 'lob' && g.look !== 'flame' && g.look !== 'arrow' && g.look !== 'thrown') mp = muzzle(from, toP, g.color);
      if (from && shooterTok && !rico) { const a = angle(from, toP); lunge(shooterTok, -Math.cos(a) * 3, -Math.sin(a) * 3, 120); }
      // the casing: thrown out behind the shooter (away from the target), with a wisp of smoke; a pump, a lever or a
      // bolt is worked first, so its casing comes a beat later
      if (br && from && shooterTok && br.when === 'shot' && !rico) { const who = whoOf(shooterTok); ejectShell(who, br.shell, aim, { delay: br.cycle }); if (br.load === 'pump' && br.cycle) play('rack', from, { delay: br.cycle - 40, gain: 0.55, rate: 1.1 }); }
      const start = mp || (from ? { x: from.x, y: from.y } : null);
      const dist = start ? Math.hypot(toP.x - start.x, toP.y - start.y) : 0;
      const speed = g.look === 'lob' ? 0.55 : g.look === 'arrow' || g.look === 'thrown' ? 0.9 : g.look === 'rocket' ? 0.9 : 2.2; // px per ms
      const ft = start ? Math.max(60, Math.min(g.look === 'lob' ? 650 : 320, dist / speed)) : 0;
      const coverP = e.cover ? centre(e.cover) : null;
      const end = e.hit ? toP : coverP || missPoint(from || toP, toP);
      if (start) {
        if (g.look === 'pellets') for (let i = 0; i < 5; i++) { const sp = toP.s * 0.35, q = { x: end.x + (Math.random() - 0.5) * sp, y: end.y + (Math.random() - 0.5) * sp }; projectile(start, q, ft * jitter(0.15), 'bullet', toP.s * 0.8, g.color); }
        else if (g.look === 'flame') { for (let i = 0; i < 6; i++) { const t = (i + 1) / 6; burst('flame', { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }, toP.s * (0.5 + t * 0.5), 420, { color: '#F68A38', from: 0.4, to: 1.2, delay: i * 45, blend: 'screen' }); } }
        else if (!(g.look === 'thrown' && e.thrown)) projectile(start, end, ft, g.look === 'thrown' ? 'arrow' : g.look, toP.s, g.color); // a thrown melee weapon's flight is its melee_fx; any other melee-category shot keeps a tracer
      }
      after(() => {
        if (e.object) { burst('spark_burst', toP, toP.s * 0.8, 280, { color: '#FFD27A' }); dust(toP, toP.s); play('hit_wood', toP, { rate: jitter() }); return; }
        // A charge that misses still goes off where it lands (a smaller blast, no scorch: the engine hurt nobody there);
        // a flamer's miss is a gout of fire on the floor, not a blast.
        const wide = !e.hit && !coverP;
        if (g.blast && !(wide && g.look === 'flame')) explosion(e.hit ? e.to : undefined, e.hit ? 1 : 0.6, g.blast, e.hit ? undefined : { x: end.x, y: end.y, s: toP.s });
        if (e.hit) impact(e, toP, e.target, { crit: e.crit, dmg: e.dmg, color: g.look === 'bolt' ? SIGIL_INK : undefined, sound: g.look === 'arrow' ? 'hit_flesh' : undefined });
        else if (coverP) { burst('spark_burst', coverP, coverP.s * 0.7, 260, { color: '#FFD27A' }); dust(coverP, coverP.s); play('hit_metal', coverP, { rate: jitter() }); floatText('COVER', toP, MUTED, { small: true }); }
        else {
          if (g.look === 'flame') { burst('flame', end, toP.s * 0.9, 600, { color: '#F68A38', from: 0.5, to: 1.1 }); play('vent', toP, { rate: 0.6, gain: 0.8 }); }
          else if (!g.blast) play(g.look === 'arrow' ? 'hit_wood' : g.look === 'lob' || g.look === 'rocket' ? 'hit_heavy' : 'whiz', toP, { rate: g.look === 'lob' ? 0.7 : jitter(0.15), delay: 0 });
          dust(end, toP.s); floatText(e.fumble ? 'FUMBLE' : e.image ? 'DECOY' : 'MISS', toP, e.image ? SIGIL_INK : MUTED); // through a False Image (it scatters: image_gone)
        }
        if (e.jam || (e.fumble && !/melee|unarmed/.test(e.cat || ''))) { const fp = from || toP; floatText('JAMMED', fp, HP, { small: true, delay: 120 }); play('dry_click', fp, { delay: 160 }); }
      }, ft);
    }
  },
  melee(e) {
    const from = at(e.from), toP = centre(e.to), cat = e.cat || 'unarmed';
    play(cat === 'heavy_melee' ? 'swish' : 'swish', from || toP, { rate: (cat === 'heavy_melee' ? 0.75 : cat === 'unarmed' ? 1.2 : 1) * jitter(0.08) });
    if (!toP) return;
    if (e.killed && e.target) tokOrGhost(e.target, e.to, true);
    if (from) {
      const a = angle(from, toP), d = from.s * 0.55;
      lunge(tokOf(e.unit, e.from), Math.cos(a) * from.s * 0.3, Math.sin(a) * from.s * 0.3, 240);
      const tint = /evoker_blade/.test(e.weapon || '') ? SIGIL_INK : /emanator_gauntlet/.test(e.weapon || '') ? SOUL_INK : WHITE;
      // The arc: a bright cut in front of the attacker, a wider tinted echo behind it.
      const sp = { x: from.x + Math.cos(a) * d, y: from.y + Math.sin(a) * d }, rot = (a * 180) / Math.PI + (cat === 'heavy_melee' ? 45 : 0), big = cat === 'heavy_melee' ? 2.1 : 1.6;
      burst(cat === 'heavy_melee' ? 'slash_wide' : 'slash', sp, from.s * big * 1.15, 300, { color: tint === WHITE ? '#A3AEC2' : tint, rot: rot - 18, from: 0.5, to: 1.1, delay: 30 });
      burst(cat === 'heavy_melee' ? 'slash_wide' : 'slash', sp, from.s * big, 280, { color: tint, rot, from: 0.65, to: 1.2 });
    }
    after(() => {
      if (e.object) { dust(toP, toP.s); play('chop', toP); return; }
      if (e.hit) impact(e, toP, e.target, { crit: e.crit, dmg: e.dmg, melee: true, sound: cat === 'heavy_melee' ? 'chop' : cat === 'light_melee' ? 'slice' : 'hit_heavy' });
      else { floatText(e.fumble ? 'FUMBLE' : e.image ? 'DECOY' : 'MISS', toP, e.image ? SIGIL_INK : MUTED); play('whiz', toP, { rate: 0.7 }); }
    }, 120);
  },
  volley(e) {
    const vs = volleySound(e.cat || '', e.mode, e.weapon || ''), p = at(e.from) || centre(e.to);
    volley = { unit: e.unit, silent: !!vs, until: performance.now() + slow(2500) }; // the shots it covers are spaced at the pace
    if (vs) play(vs.s, p, { rate: vs.rate });
    if (e.mode === 'skill' && e.name) { const q = centre(e.from); if (q && visible(e.from)) floatText(String(e.name).toUpperCase(), q, WHITE, { small: true, ms: 1100 }); }
    if (e.mode === 'auto' && p && e.to && gunOf(e.weapon || '', e.cat || '').look === 'bullet') {
      // The spray: extra tracers fanning around the line (the engine rolls one shot per enemy near it).
      const toP = centre(e.to); if (!toP || !visible(e.from)) return;
      const br = brassOf(e.weapon || '', e.cat || ''), who = br.when === 'shot' ? whoOf(tokOf(e.unit, e.from)) : null, aim = angle(p, toP);
      for (let i = 0; i < 7; i++) after(() => { const m = muzzle(p, toP); projectile(m, missPoint(p, toP), 150, 'bullet', toP.s); if (who) ejectShell(who, br.shell, aim); }, i * 85);
    }
  },
  reload(e) {
    const p = at(e.at), ms = e.dur || 1200, cat = e.cat || '', look = gunOf(e.weapon || '', cat).look;
    const kind = reloadKind(e.weapon || '', cat, look);
    const n = Math.max(2, Math.min(6, e.rounds || 4)), each = (i: number, k: number) => (i * ms * 0.8) / k;
    if (kind === 'bow') {
      // Arrows or bolts drawn from the quiver and nocked; a crossbow's latch clicks home at the end.
      const k = e.how === 'loose' ? Math.min(3, n) : 1;
      for (let i = 0; i < k; i++) play('swish', p, { delay: each(i, k), rate: 1.5 * jitter(), gain: 0.55 });
      if (cat === 'bow' && /crossbow/.test(e.weapon || '')) play('dry_click', p, { delay: ms * 0.8, rate: 0.7 });
    } else if (kind === 'fuel') { play('hit_metal', p, { rate: 0.75, gain: 0.7 }); play('vent', p, { delay: ms * 0.55, rate: 0.9, gain: 0.7 }); play('mag_in', p, { delay: ms * 0.85, rate: 0.8 }); }
    else if (kind === 'launcher') { const k = Math.min(3, e.rounds || 1); for (let i = 0; i < k; i++) play('round_in', p, { delay: each(i, k), rate: 0.7 * jitter() }); play('rack', p, { delay: ms * 0.82, rate: 0.85 }); }
    else if (kind === 'shells') { play('reload_shells', p, { rate: Math.max(0.85, Math.min(1.3, 1250 / ms)) }); play('rack', p, { delay: ms * 0.8 }); }
    else if (e.how === 'loose') { for (let i = 0; i < n; i++) play('round_in', p, { delay: each(i, n), rate: jitter() }); play('mag_in', p, { delay: ms * 0.85 }); }
    else play(cat === 'rifle' || cat === 'heavy' || cat === 'smg' ? 'reload_rifle' : cat === 'pistol' || cat === 'revolver' ? 'reload_pistol' : 'reload_mag', p, { rate: Math.max(0.85, Math.min(1.3, 1250 / ms)) });
    // the reload card over the unit (fx/reload.ts): the magazine out and in, large, and the count; it replaces the timer
    // ring, which a pile's stack on the tile hid (Leon, 9 Nov 2026)
    if (p) { reloadCard(e, e.at, ms); reloadPieces(e, p, ms); }
  },
  load(e) {
    const p = at(e.at), ms = e.dur || 1400, n = Math.max(2, Math.min(8, Math.ceil((e.rounds || 5) / 2)));
    for (let i = 0; i < n; i++) play('round_in', p, { delay: (i * ms * 0.85) / n, rate: jitter() });
    if (p) timerRing(e.at, ms, WHITE, 'LOAD');
  },
  clear(e) {
    const p = at(e.at), ms = e.dur || 1000;
    play('dry_click', p); play('jam_clear', p, { delay: ms * 0.35 }); play('rack', p, { delay: ms * 0.75 });
    if (p) timerRing(e.at, ms, WHITE, 'UNJAM');
  },
  repair(e) {
    const p = at(e.at), ms = e.dur || 1400;
    for (let i = 0; i < 3; i++) play('hit_metal', p, { delay: 150 + i * ms * 0.28, rate: jitter(0.15) });
    if (p) { timerRing(e.at, ms, WHITE, 'REPAIR'); for (let i = 0; i < 3; i++) burst('spark_burst', p, p.s * 0.5, 220, { color: '#FFD27A', delay: 150 + i * ms * 0.28 }); }
  },
  core(e) {
    const p = at(e.at), ms = e.dur || 1000; play('sigil_core', p);
    if (p) {
      // the spent core is thrown out of the Evoker like a casing; the fresh one's light settles in
      ejectCore(whoOf(tokOf(e.unit, e.at)), coreOf(e.focus), aimFor(e.unit, Math.random() * Math.PI * 2));
      play('dry_click', p, { rate: 1.6, gain: 0.5 });
      timerRing(e.at, ms, SIGIL_INK, 'CORE'); squares(p, SIGIL_INK, 8, 0.6, ms * 0.6, ms * 0.3);
    }
  },
  crystallise(e) {
    const p = at(e.at), ms = e.dur || 1400; play('soul_hold', p, { rate: 1.2 }); play('crystal', p, { delay: ms * 0.9 });
    if (p) { timerRing(e.at, ms, SOUL_INK, 'CRYSTAL'); motes(p, SOUL_INK, 10, true, ms * 0.8); burst('magic_star', p, p.s * 0.8, 500, { color: SOUL_WARM, delay: ms * 0.9 }); }
  },
  stim(e) {
    const from = at(e.from), p = centre(e.to); play('stim', from || p);
    if (!p) return;
    pluses(p, OK, 7);
    flash(tokOf(e.target, e.to), 'heal');
    if (e.revive) { ring(p, OK, 700, { from: 0.4, to: 1.4, width: 6 }); floatText('UP', p, OK, { big: true }); }
    else floatText('+' + (e.heal || 0), p, OK);
  },
  heal(e) { const p = centre(e.at); if (!p) return; pluses(p, OK, 6); flash(tokOf(e.target, e.at), 'heal'); floatText(e.revive ? 'UP' : '+' + (e.amount || 0), p, OK, { big: !!e.revive }); play('crystal', p, { rate: 1.3, gain: 0.7 }); },
  hurt(e) {
    const p = at(e.at); if (!p) return;
    const why = e.why || '', tok = tokOrGhost(e.target, e.at, !!e.killed);
    const color = why === 'sigil' || why === 'elemental' || why === 'wall' ? SIGIL_INK : why === 'soul' ? SOUL_INK : undefined;
    if (why === 'burn') burst('flame', p, p.s * 0.9, 600, { color: '#F68A38', from: 0.5, to: 1.1 });
    if (why === 'bleed') decal(e.at, 'blood_' + (1 + Math.floor(Math.random() * 3)), '#7A0E16', 2600, 0.35);
    if (e.element) elementImpact(p, e.element, why === 'soul' ? 'soul' : 'sigil', { power: why === 'acid' ? 0.4 : 0.55, quiet: true, decalKey: why === 'acid' ? null : e.at });
    else if (color) { squaresOrMotes(p, color, why === 'soul'); }
    if (why === 'acid') { bubbles(p, ELEMENTS.acid, 'sigil', 4, 900); play('stim', p, { gain: 0.4, rate: 1.2 }); }
    shake(tok, why === 'explosion' ? 1.6 : 0.8); flash(tok, color === SOUL_INK ? 'soul' : color ? 'magic' : 'hurt');
    if (why !== 'explosion' && why !== 'trap' && why !== 'strain') play(unit(e.target)?.robot ? 'hit_metal' : 'hit_flesh', p, { rate: jitter(), gain: why === 'bleed' || why === 'burn' ? 0.6 : 1 });
    floatText(e.dmg > 0 ? '−' + e.dmg : 'HIT', p, HP);
  },
  shield(e) { const p = at(e.at); if (!p) return; ring(p, SIGIL_INK, 420, { from: 0.7, to: 1.05, width: 7 }); floatText('SHIELD −' + (e.absorbed || 0), p, SIGIL_INK, { small: true }); play('hit_metal', p, { rate: 1.4, gain: 0.6 }); },
  down(e) {
    if (e.unit && parked.has(String(e.unit))) unpark(String(e.unit)); // a walker stopped to be shot (or struck leaving a tile: an OA): its fall takes over, where it fell
    const p = at(e.at), live = tokOf(e.unit, e.at), tok = live || ghostOf(e.unit, e.at); play('body_fall', p || centre(e.at), { rate: jitter(0.08) });
    if (!p) return;
    const fallen = { filter: 'grayscale(1) brightness(.55)', translate: '0 ' + p.s * 0.12 + 'px', rotate: '-14deg' };
    if (tok && !live) anim(tok, [{ filter: 'none', translate: '0 0', rotate: '0deg', opacity: 1 }, { ...fallen, opacity: 1, offset: 0.3 }, { ...fallen, opacity: 0.85, offset: 0.7 }, { ...fallen, opacity: 0 }], { duration: reducedMotion() ? 900 : 1700, easing: 'ease-out', fill: 'forwards' });
    else if (tok && !reducedMotion()) anim(tok, [{ filter: 'none', translate: '0 0', rotate: '0deg' }, { ...fallen, offset: 0.35 }, { ...fallen, offset: 0.85 }, { filter: 'none', translate: '0 0', rotate: '0deg' }], { duration: 1400, easing: 'ease-out' });
    dust({ x: p.x, y: p.y + p.s * 0.2 }, p.s);
    floatText(e.dead ? 'DEAD' : 'DOWNED', p, HP, { delay: 150 });
  },
  explode(e) { if (e.what === 'discharge') { discharge(SOUL_KIT, e); return; } explosion(e.at, e.radius || 1, e.what === 'fire' ? 'fire' : 'frag'); },
  object(e) { const p = at(e.at); if (!p) return; if (e.broken) { dust(p, p.s * 1.3); burst('smoke_soft', p, p.s, 700, { color: '#7F8BA1' }); play('body_fall', p, { rate: 0.8, delay: 90 }); floatText('BROKEN', p, MUTED, { small: true }); } },
  door(e) { const p = at(e.at); play(e.open ? 'door_open' : 'door_close', p || centre(e.at)); if (p) dust({ x: p.x, y: p.y + p.s * 0.3 }, p.s * 0.6); },
  trap(e) { const p = at(e.at); play('chop', p, { rate: 0.8 }); if (p) { burst('spark_burst', p, p.s, 300, { color: HP }); floatText('TRAP', p, HP, { small: true }); } },
  shove(e) {
    // a unit held where it was (holdMovers): a step of a longer push moves its stand-in on; the last step lets it go
    const tid = e.target ? String(e.target) : '', w = tid ? waiting.get(tid) : undefined;
    if (w && e.ok && e.from !== e.to) {
      const u = unit(tid);
      if (w.stand && u && u.pos !== e.to) {
        const a = centre(e.from), b = centre(e.to), inner = w.stand.firstElementChild as HTMLElement | null;
        reanchor(w.stand, e.to); w.stand.setAttribute('data-phc-stand-at', e.to);
        if (a && b && inner && !reducedMotion()) anim(inner, [{ translate: (a.x - b.x) + 'px ' + (a.y - b.y) + 'px' }, { translate: '0 0' }], { duration: 220, easing: 'cubic-bezier(.2,.9,.3,1)' });
        const p = at(e.to); if (p) play('hit_heavy', p, { rate: 0.9, gain: 0.6 });
        return;
      }
      releaseMover(tid);
    }
    if (e.ok && e.from !== e.to) slideFrom(e.from, e.to);
    if (e.magic && e.ok && e.from !== e.to) dragTrail(e.from, e.to, !!e.pull);
    const p = at(e.to); if (!p) return;
    shake(tokOf(e.target, e.to), 0.6); play(e.magic ? 'vent' : 'hit_heavy', p, { rate: e.magic ? 1.4 : 0.9, gain: 0.8 });
    if (e.prone) { floatText('PRONE', p, WHITE, { small: true }); play('body_fall', p, { delay: 120 }); }
    else if (!e.ok) floatText('HOLDS', p, MUTED, { small: true });
  },
  stance(e) {
    const p = sawThen(e) ? centre(e.at) : null; if (!p) return;
    if (e.what === 'hide' && unit(e.unit)?.side !== 'pc') return; // its 'sight' hide says it (HIDDEN, fading where it stood)
    const word = e.what === 'prone' ? 'PRONE' : e.what === 'stand' ? 'UP' : e.what === 'brace' ? 'BRACED' : e.what === 'hide' ? 'HIDDEN' : 'OVERWATCH';
    floatText(word, p, WHITE, { small: true });
    play(e.what === 'prone' ? 'body_fall' : e.what === 'overwatch' ? 'rack' : e.what === 'hide' ? 'sg_mask' : 'step', p, { rate: e.what === 'prone' ? 1.3 : 1, gain: e.what === 'hide' ? 0.35 : 0.6 });
    if (e.what === 'overwatch') ring(p, WHITE, 600, { from: 1.4, to: 0.9, width: 3 });
  },
  analyze(e) {
    const p = at(e.to); if (!p) return;
    const s = svg(40, 40, '<path d="M4 12 V4 H12 M28 4 H36 V12 M36 28 V36 H28 M12 36 H4 V28" fill="none" stroke="#FFFFFF" stroke-width="3"/>');
    const box = put(s, p, p.s * 1.3, p.s * 1.3, 700);
    anim(box, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { opacity: 0.2, offset: 0.6 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 700, fill: 'forwards' });
    play('sigil_draw', p, { rate: 1.8, gain: 0.5 });
    // Rules 1.10: Analyze aimed at a glyph or a trace reads (copies) its word.
    if (e.glyph) { play('sg_study', p, { delay: 260 }); floatText('COPIED', p, SIGIL_INK, { small: true, delay: 300 }); }
    else floatText('ANALYZED', p, WHITE, { small: true, delay: 300 });
  },
  // pickup and pile: fx/world.ts (rules 1.9, the pick-up names what was taken).
  cover() { /* folded into the shot */ },
  // ---------- Sigils (rules 1.4): cyan, square, snapping; each element in its own way (fx/elements.ts) ----------
  draw(e) {
    const p = at(e.tile); if (!p) return;
    const d = GLYPH_PATHS[e.word] || 'M6 6 H18 V18 H6 Z', el = elementFx(e.element || e.word);
    const s = svg(24, 24, '<path d="' + d + '" pathLength="1" fill="none" stroke="' + SIGIL_INK + '" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1" stroke-dashoffset="1" style="filter:drop-shadow(0 0 3px ' + SIGIL_GLOW + ')"/>');
    const box = put(s, p, p.s * 0.8, p.s * 0.8, 900);
    const path = s.querySelector('path'); if (path) anim(path, [{ strokeDashoffset: 1 }, { strokeDashoffset: 0 }], { duration: reducedMotion() ? 1 : 320, easing: 'ease-out', fill: 'forwards' });
    anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 900, fill: 'forwards' });
    // The glyph locks into its tile: a square frame snaps on (a Line that grows, a fresh start, or a Stack's second).
    snapFrame(p, e.effect === 'breaks' ? MUTED : SIGIL_INK, 'sigil', 380, { delay: 260, from: 1.3, to: e.effect === 'stacks' ? 0.8 : 1 });
    squares(p, el.id === 'raw' ? SIGIL_INK : el.ink, 6, 0.5, 600, 300);
    // Each word is a note: a pattern drawn word by word plays a short melody.
    play('sigil_draw', p, { rate: NOTE[(hash(e.word) % NOTE.length)] });
    // Sigil 1.5 (rules 1.10): the glyph joins a stroke (a Line grows, or a junction joins two): a glassy link after the note.
    if (e.effect === 'extends') play('sg_join', p, { delay: 240, rate: e.junction ? 0.85 : 1 });
  },
  // Sigil 1.5 (rules 1.10): an Evoke's study crossed a threshold, or a word became Mastered and its inflection came on.
  sigil_growth(e) {
    const p = at(e.at), now: string[] = e.mastered || [];
    if (now.length) { play('sg_inflect', p, { delay: 300 }); if (p) { ring(p, SIGIL_INK, 800, { from: 0.6, to: 2.2, width: 2, delay: 300 }); floatText('INFLECTION ON · ' + now.map((w) => w.toUpperCase()).join(' · '), p, SIGIL_INK, { small: true, delay: 300 }); } }
    else { play('sg_study', p, { delay: 200, gain: 0.7 }); if (p) floatText('A NEW WORD CAN BE LEARNED', p, SIGIL_INK, { small: true, delay: 200 }); }
  },
  glyph_fade(e) { const p = at(e.tile); if (!p) return; fallingSquares(p, MUTED, 5, 500); floatText((e.word || '').toUpperCase() + ' FADES', p, MUTED, { small: true }); },
  scuff(e) { const p = at(e.at); if (p) { dust(p, p.s); squares(p, MUTED, 6, 0.4, 400); } play('step', p, { rate: 0.7 }); },
  evoke(e) {
    // the way the spell went: behind it is where the Evoker throws its spent core at the next core change
    if (e.unit) { const d = e.dir || [0, 0], a = centre(e.at), b = centre(e.impact || e.src); if (d[0] || d[1]) aims.set(e.unit, Math.atan2(d[1], d[0])); else if (a && b && (a.x !== b.x || a.y !== b.y)) aims.set(e.unit, angle(a, b)); }
    // The Grand Sigilist plants the staff (fx/grand.ts draws the standing form): a flash on the staff, a ring wave out
    // across the radius in the word's tint, the tiles lighting up from the centre, the word's name.
    if (e.shape === 'grand') {
      const c = at(e.src || e.impact), w = (e.words || [])[0] || '', L = grandLook(w), tiles: string[] = e.tiles || [];
      play('sigil_evoke', c || at(e.at), { rate: 0.7, gain: 1 });
      if (!c) return;
      burst('flash_star', c, c.s * 2.2, 420, { color: WHITE, from: 0.3, to: 1.4 });
      if (!reducedMotion()) for (let i = 0; i < 2; i++) burst('ring', c, c.s * 5.4, 700, { color: L.tint, from: 0.15, to: 1, delay: i * 180, fade: 0 });
      const [cx, cy] = String(e.src || e.impact).split(',').map(Number);
      for (const k of tiles) { const q = at(k); if (!q) continue; const [x, y] = k.split(',').map(Number), d = Math.max(Math.abs(x - cx), Math.abs(y - cy));
        burst('glow', q, q.s * 1.1, 420, { color: L.tint, from: 0.4, to: 1.1, delay: 80 + d * 120, blend: 'screen' }); }
      if (L.element) after(() => elementImpact(c, elementFx(L.element).id, 'sigil', { power: 0.9, quiet: true }), 120);
      floatText('GRAND ' + (w ? w.toUpperCase() : ''), c, L.tint, { delay: 260 });
      return;
    }
    const tiles: string[] = e.tiles || [], el = e.element || null;
    const missiles: any[] = Array.isArray(e.missiles) && e.missiles.length ? e.missiles : e.src && e.impact ? [{ origin: e.src, impact: e.impact, kind: e.cone ? 'touch' : 'bolt', burst: [e.impact] }] : [];
    const src = centre(missiles[0]?.origin || e.src || e.at);
    play('sigil_evoke', src || at(e.at));
    // The pattern flashes white and collapses into where it fires from.
    for (const k of tiles) { const q = at(k); if (!q) continue; burst('flare', q, q.s * 1.2, 260, { color: WHITE, from: 0.5, to: 1.5 }); if (src && !reducedMotion()) squaresTo(q, src, SIGIL_INK, 3, 220); }
    if (missiles.length > 1 && src) { snapFrame(src, WHITE, 'sigil', 300, { from: 0.6, to: 1.4 }); floatText('×' + missiles.length, src, SIGIL_INK, { small: true }); } // TWICE: the spell splits
    const glyph = subjectGlyph(e.words || []);
    missiles.forEach((m, i) => after(() => missile(e, m, el, glyph), 230 + i * 110));
  },
  chain(e) {
    const a = at(e.from) || centre(e.from), b = at(e.to); if (!a || !b) return;
    const el = elementFx(e.element);
    if (e.jump == null && e.unit) { // Storm's chain off a released Outburst: violet first, then the element
      jag(a, b, { ...el, core: WHITE, ink: SOUL_INK }, 'soul', 300); jag(a, b, el, 'soul', 240, 70);
      elementImpact(b, el.id, 'soul', { power: 0.5, quiet: true }); play('el_zap', b, { rate: 0.9, gain: 0.7, lowpass: 2600 }); return;
    }
    jag(a, b, { ...el, core: WHITE, ink: SIGIL_INK }, 'sigil', 260); jag(a, b, el, 'sigil', 200, 60);
    burst('zap', b, b.s * 1.1, 260, { color: WHITE, from: 0.5, to: 1.2 });
    chip(b, String(e.jump || 1), SIGIL_INK);
    play('el_zap', b, { rate: 1 + 0.12 * (e.jump || 1) });
  },
  fizzle(e) {
    const tiles: string[] = (e.tiles || []).slice(0, 12), p0 = at(e.at);
    for (const k of tiles.length ? tiles : [e.at]) { const q = at(k); if (q) fallingSquares(q, SIGIL_INK, 6, 650); }
    if (p0) { glitch(p0, 260); floatText('FIZZLE', p0, MUTED, { small: true, delay: 120 }); }
    play('sg_fizzle', p0 || centre(e.at));
  },
  field(e) {
    const tiles: string[] = e.tiles || [], el = elementFx(e.element), first = at(tiles[0]);
    tiles.slice(0, 16).forEach((k, i) => { const q = at(k); if (q) elementImpact(q, el.id, 'sigil', { power: 0.45, delay: i * 40, quiet: true }); });
    if (first) floatText((el.word ? el.word + ' ' : '') + 'FIELD', first, el.id === 'raw' ? SIGIL_INK : el.ink, { small: true, delay: 200 });
    play(el.sound.impact, first || centre(tiles[0]), { rate: 0.85, gain: 0.8 });
  },
  field_tick(e) { const p = at(e.at); if (!p) return; const el = elementFx(e.element); elementImpact(p, el.id, 'sigil', { power: 0.5, quiet: true }); play(el.sound.tick, p, { gain: 0.6, rate: jitter(0.1) }); },
  field_gone(e) { for (const k of (e.tiles || [e.tile]).slice(0, 16)) { const q = at(k); if (q) squares(q, MUTED, 4, 0.4, 500); } },
  trap_set(e) {
    if (!mineOnly(e)) return;
    const p = at(e.tile); if (!p) return;
    // Faint on purpose: only its own side sees it go down, and it sinks out of sight.
    snapFrame(p, SIGIL_INK, 'sigil', 700, { from: 1.2, to: 0.85, width: 2 });
    const s = svg(24, 24, '<path d="' + (GLYPH_PATHS.wait || '') + '" fill="none" stroke="' + SIGIL_INK + '" stroke-width="1.6" stroke-linecap="round"/>');
    const box = put(s, p, p.s * 0.6, p.s * 0.6, 900);
    anim(box, [{ opacity: 0 }, { opacity: 0.55, offset: 0.3 }, { opacity: 0, transform: 'scale(.6)' }], { duration: 900, easing: 'steps(5, end)', fill: 'forwards' });
    play('sg_trap_set', p, { gain: 0.5 });
  },
  trap_spotted(e) {
    if (!mineOnly(e)) return;
    const p = at(e.tile); if (!p) return;
    corners(p, HP, 700); floatText('TRAP SPOTTED', p, HP, { small: true, delay: 250 }); play('sigil_draw', p, { rate: 2, gain: 0.6 });
  },
  trap_sprung(e) {
    const p = at(e.tile); if (!p) return;
    spikes(p, elementFx(e.element));
    elementImpact(p, e.element, 'sigil', { power: 1, delay: 90, decalKey: e.tile, sound: (s, o) => play(s, p, o) });
    play('sg_trap_sprung', p); floatText('TRAP', p, HP, { small: true, delay: 150 });
  },
  trap_gone(e) { if (!mineOnly(e)) return; const p = at(e.tile); if (p) squares(p, MUTED, 4, 0.3, 400); },
  turret_placed(e) {
    if (e.only && !mineOnly(e)) return;
    const p = at(e.tile); if (!p) return;
    // The pillar rises out of the tile in three snaps; the standing look (ambient.ts) takes over once it stands.
    const n = turretNode(e.element, e.side === viewer);
    const box = put(n, { x: p.x, y: p.y - p.s * 0.12 }, p.s * 0.7, p.s * 0.9, 700);
    anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: 1 }] : [{ transform: 'translateY(40%) scaleY(0)', opacity: 0 }, { transform: 'translateY(0) scaleY(1)', opacity: 1 }], { duration: 420, easing: 'steps(3, end)', fill: 'forwards' });
    anim(box, [{ opacity: 1 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 700, delay: 0, fill: 'forwards' });
    squares(p, SIGIL_INK, 8, 0.5, 500);
    play('sg_turret', p);
  },
  turret_shot(e) {
    const a0 = at(e.from), b = centre(e.to); if (!b) return;
    const top = a0 ? { x: a0.x, y: a0.y - a0.s * 0.45, s: a0.s } : null;
    if (top) { burst('flare', top, top.s * 0.7, 160, { color: WHITE, from: 0.4, to: 1.3 }); play('el_zap', top, { rate: 1.15 }); }
    const kind = e.kind === 'lob' ? 'lob' : e.kind === 'appear' ? 'appear' : 'bolt';
    const ft = top ? elementTrail(top, b, e.element, 'sigil', kind) : 0;
    after(() => { if (visible(e.to)) elementImpact(b, e.element, 'sigil', { power: 0.7, sound: (s, o) => play(s, b, o) }); }, ft);
  },
  turret_destroyed(e) {
    if (e.only && !mineOnly(e)) return;
    const p = at(e.tile); if (!p) return;
    for (let i = 0; i < 3; i++) fallingSquares({ x: p.x, y: p.y - p.s * (0.1 + i * 0.15), s: p.s }, SIGIL_INK, 4, 600, i * 50);
    burst('spark_burst', p, p.s, 280, { color: SIGIL_INK }); floatText(e.why === 'time' ? 'TURRET FADES' : 'TURRET DOWN', p, MUTED, { small: true });
    play('sg_turret_break', p);
  },
  wall_raised(e) {
    const tiles: string[] = e.tiles || [];
    tiles.slice(0, 8).forEach((k, i) => { const q = at(k); if (q) after(() => slab(q, true), i * 70); });
    const p = at(tiles[0]); play('el_stone_rise', p || centre(tiles[0])); if (p) shakeScreen(0.3);
  },
  wall_crumbled(e) {
    const tiles: string[] = e.tiles || [];
    tiles.slice(0, 8).forEach((k, i) => { const q = at(k); if (q) after(() => slab(q, false), i * 60); });
    play('el_stone_crumble', at(tiles[0]) || centre(tiles[0]));
  },
  null_wave(e) {
    const p = at(e.at) || centre(e.at); if (!p) return;
    // A square shockwave, then every glyph it wipes flickers out in scattered squares.
    for (let i = 0; i < 3; i++) snapFrame(p, i ? SIGIL_INK : WHITE, 'sigil', 600, { from: 0.4, to: 2.6 + i * 0.6, delay: i * 90, width: 4 - i });
    for (const k of [...(e.glyphs || []), ...(e.walls || [])].slice(0, 16)) { const q = at(k); if (q) after(() => { glitch(q, 200); fallingSquares(q, SIGIL_INK, 5, 500); }, 160); }
    if (e.removed) floatText('NULL ×' + e.removed, p, WHITE, { small: true, delay: 200 }); else floatText('NULL', p, MUTED, { small: true, delay: 200 });
    play('sg_null', p);
  },
  blink(e) {
    const a = at(e.from), b = at(e.to);
    if (a) { beamUp(a, true); fallingSquares(a, SIGIL_INK, 6, 380); play('sg_blink', a); }
    if (b) after(() => { beamUp(b, false); squaresTo({ x: b.x, y: b.y - b.s }, b, SIGIL_INK, 5, 200); const t = tokOf(e.target, e.to); if (t) anim(t, [{ opacity: 0 }, { opacity: 0.4, offset: 0.4 }, { opacity: 1 }], { duration: 260, easing: 'steps(4, end)' }); play('sg_blink', b, { rate: 1.3 }); }, a ? 240 : 0);
  },
  mask(e) {
    const p = at(e.at); if (!p) return;
    const tok = tokOf(e.target, e.at), outline = { filter: 'grayscale(1) brightness(.15) drop-shadow(0 0 1px ' + SIGIL_INK + ') drop-shadow(0 0 2px ' + SIGIL_GLOW + ')', opacity: 0.5 };
    if (tok) anim(tok, e.fade ? [outline, { filter: 'none', opacity: 1 }] : [{ filter: 'none', opacity: 1 }, outline, { filter: 'none', opacity: 1 }], { duration: e.fade ? 500 : 1400, easing: 'steps(6, end)' });
    snapFrame(p, SIGIL_INK, 'sigil', 500, { from: 1, to: 0.7, width: 2 });
    floatText(e.fade ? 'UNMASKED' : 'MASKED', p, e.fade ? MUTED : SIGIL_INK, { small: true });
    play('sg_mask', p, { rate: e.fade ? 1.2 : 1 });
  },
  leech(e) {
    const to = at(e.to) || centre(e.to); if (!to) return;
    const el = elementFx(e.element);
    for (const k of (e.from || []).slice(0, 4)) { const a = at(k); if (!a) continue; for (let i = 0; i < 7; i++) particle(a, Math.max(4, a.s * 0.1), shardCss(el, 'sigil'), [{ transform: 'translate(0,0)', opacity: 0.2 }, { transform: 'translate(' + ((to.x - a.x) / 2 + (Math.random() - 0.5) * 30) + 'px,' + ((to.y - a.y) / 2 + (Math.random() - 0.5) * 30) + 'px) rotate(90deg)', opacity: 1, offset: 0.5 }, { transform: 'translate(' + (to.x - a.x) + 'px,' + (to.y - a.y) + 'px) rotate(180deg)', opacity: 0.3 }], 620, i * 45, 'steps(8, end)'); }
    after(() => { pluses(to, OK, 4); flash(tokOf(e.unit, e.to), 'heal'); floatText('+' + (e.amount || 0), to, OK); }, 560);
    play('sg_leech', to);
  },
  command(e) {
    const p = at(e.at); if (!p) return;
    const from = e.by ? at(unit(e.by)?.pos) : null;
    if (from) linkChain(from, p, 380);
    after(() => {
      const s = svg(24, 24, '<rect x="2" y="2" width="20" height="20" fill="rgba(10,13,19,.75)" stroke="' + SIGIL_INK + '" stroke-width="1.5"/><path d="' + GLYPH_PATHS.command + '" fill="none" stroke="' + SIGIL_INK + '" stroke-width="2" stroke-linecap="round"/>');
      const box = put(s, { x: p.x, y: p.y - p.s * 0.8 }, p.s * 0.5, p.s * 0.5, 1100); anchor(box, e.at, 1100, -0.8);
      anim(box, [{ transform: 'scale(1.6)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: 1100, easing: 'steps(6, end)', fill: 'forwards' });
      const order = String(e.order || '').toUpperCase(); floatText(order ? 'COMMAND: ' + order : 'COMMANDED', p, SIGIL_INK, { small: true, delay: 120 });
      if (e.to) { const q = at(e.to); if (q) squaresTo(p, q, SIGIL_INK, 4, 360, 200); }
    }, from ? 360 : 0);
    play('sg_command', p);
  },
  boon(e) {
    const p = at(e.at); if (!p) return;
    const tok = tokOf(e.target, e.at);
    switch (e.word) {
      case 'ward': brackets(p, SIGIL_INK); floatText('WARD +' + (e.amount || 0), p, SIGIL_INK, { small: true, delay: 200 }); play('sg_ward', p); break;
      case 'mend': pluses(p, OK, 6); squares(p, OK, 5, 0.5, 500); flash(tok, 'heal'); floatText('+' + (e.amount || 0), p, OK, { delay: 150 }); play('sg_mend', p); break;
      case 'quicken': speedRing(p); floatText('QUICKENED', p, WHITE, { small: true, delay: 200 }); play('sg_quicken', p); break;
      case 'sharpen': glint(p); floatText('SHARPENED', p, WHITE, { small: true, delay: 200 }); play('sg_sharpen', p); break;
      case 'cleanse': chipShatter(p, condWord(e.cond)); play('sg_cleanse', p); play('el_shatter', p, { delay: 220, gain: 0.6 }); break;
      default: snapFrame(p, SIGIL_INK); play('sg_ward', p, { gain: 0.6 });
    }
  },
  veil(e) { for (const k of (e.tiles || [e.at]).slice(0, 12)) { const q = at(k); if (q) burst('puff', q, q.s * 1.4, 1500, { from: 0.4, to: 1.3, fade: 0 }); } play('vent', at(e.at) || centre(e.at), { rate: 0.75 }); },
  light(e) { for (const k of (e.tiles || [e.at]).slice(0, 12)) { const q = at(k); if (q) burst('glow', q, q.s * 1.4, 900, { color: '#FFF8E1', from: 0.3, to: 1.2 }); } const p = at(e.at); if (p) snapFrame(p, WHITE, 'sigil', 500, { from: 0.5, to: 2 }); play('sg_light', p || centre(e.at)); },
  miss(e) {
    const p = at(e.at); if (!p) return;
    if (e.by === 'soul') motes(p, SOUL_INK, 5, false, 400); else shards(p, elementFx(e.element), 'sigil', 5, 0.5, 350);
    floatText('MISS', p, MUTED); play('whiz', p, { rate: 1.3 });
  },
  cond(e) { const p = at(e.at); if (!p) return; floatText(e.resisted ? 'RESISTED' : condWord(e.id), p, e.resisted ? MUTED : condBoon(e.id) ? OK : WHITE, { small: true, delay: 200 }); if (e.id === 'corroded' && !e.resisted) bubbles(p, ELEMENTS.acid, 'sigil', 4, 900, 200); },
  overload(e) { const p = at(e.at); play('sigil_overload', p || centre(e.at)); screenTint('red', 420); if (p) { glitch(p, 420); squares(p, HP, 14, 1.2, 500); shake(tokOf(e.unit, e.at), 1.2); } },
  vent(e) { const p = at(e.at); play('vent', p, e.bleed ? { rate: 1.4, gain: 0.5 } : {}); if (p && e.bleed) floatText('BLED +1', p, SIGIL_INK, { small: true }); if (p) for (let i = 0; i < (e.bleed ? 3 : 10); i++) squaresTo(p, { x: p.x + (Math.random() - 0.5) * p.s, y: p.y - p.s * (1.5 + Math.random()) }, SIGIL_INK, 1, 600, i * 40); },
  // ---------- Outbursts (1.2 events in old logs; the 1.5 heart is in soul.ts) ----------
  grow(e) {
    const p = at(e.at), st = e.stage || 2, col = mix(SOUL_INK, SOUL_WARM, (st - 1) / 3);
    play('heartbeat', p, { rate: 1 + 0.12 * st });
    if (p) { ring(p, col, 600, { from: 0.5, to: 1.1 + 0.15 * st, width: 4 + st }); floatText('STAGE ' + st, p, col, { small: true }); }
  },
  syphon(e) { const p = at(e.at); play('soul_hold', p, { rate: 1.4 }); if (p) { for (let i = 0; i < 10; i++) { const a = Math.random() * Math.PI * 2, r = p.s * (1.4 + Math.random()); moteTo({ x: p.x + Math.cos(a) * r, y: p.y + Math.sin(a) * r }, p, SOUL_INK, 500, i * 40); } floatText('+' + (e.mp || 0) + ' MP', p, '#5C9EFF', { small: true, delay: 300 }); } },
  mana() { /* the meter shows it */ },
  song() { /* the music plays it */ },
};
/** The Soul heart's handlers (fx/soul.ts), lent this layer's fog-aware lookups. They override the 1.2 names they share. */
const SOUL_KIT = { at, tokOf, posOf: (id: string | null | undefined) => unit(id)?.pos, play };
Object.assign(H, soulHandlers(SOUL_KIT));
// Outburst 4.0 (fx/feelings.ts): feelings felt and poured, residue, Revert, practice, Fuse, Linger, Thread.
Object.assign(H, feelingHandlers(SOUL_KIT));
// Blessing 2.0 (fx/faith.ts): prayers, Witnessed, interventions, Devotion, vows, the patron's lines and Miracles.
Object.assign(H, faithHandlers({ ...SOUL_KIT, posOfChar: (charId) => { if (!charId) return undefined; for (const u of units.values()) if (u.charId === charId) return u.pos; return undefined; },
  nameOfChar: (charId) => (charId ? charNames.get(charId) : undefined), hurry: (ms) => hurryFx(ms) }));
const NOTE = [1, 1.122, 1.26, 1.498, 1.682, 2];
const hash = (s: string) => { let h = 0; for (const c of String(s || '')) h = (h * 31 + c.charCodeAt(0)) >>> 0; return h; };
const COND_WORD: Record<string, string> = { slowed: 'SLOWED', pinned: 'PINNED', blinded: 'BLINDED', burning: 'BURNING', shaken: 'SHAKEN', fear: 'AFRAID', confused: 'CONFUSED', ldebuff: 'MUDDLED', rdebuff: 'UNSETTLED', silenced: 'SILENCED', guarded: 'GUARDED', inspired: 'INSPIRED', corroded: 'CORRODED', quickened: 'QUICKENED', sharpened: 'SHARPENED', commanded: 'COMMANDED', bound: 'BOUND', muddled: 'MUDDLED', dreaded: 'AFRAID', hidden: 'HIDDEN' };
const condWord = (id: string) => COND_WORD[id] || String(id || '').toUpperCase();
const condBoon = (id: string) => id === 'guarded' || id === 'inspired' || id === 'quickened' || id === 'sharpened';

// ---------- particles: Sigil squares, Soul motes, heal pluses ----------
function squares(p: Pt, color: string, n: number, spread: number, ms: number, delay = 0) {
  if (reducedMotion()) n = Math.min(n, 3);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * Math.PI * 2, r = p.s * spread * (0.4 + Math.random() * 0.6), sz = Math.max(3, p.s * (0.06 + Math.random() * 0.05));
    particle(p, sz, 'background:' + color + ';box-shadow:0 0 4px ' + color, [{ transform: 'translate(0,0) rotate(0)', opacity: 1 }, { transform: 'translate(' + Math.cos(a) * r + 'px,' + (Math.sin(a) * r - p.s * 0.2) + 'px) rotate(90deg)', opacity: 0 }], ms * (0.7 + Math.random() * 0.5), delay + i * 15);
  }
}
function squaresTo(a: { x: number; y: number }, b: { x: number; y: number }, color: string, n: number, ms: number, delay = 0) {
  for (let i = 0; i < n; i++) particle(a, 5, 'background:' + color + ';box-shadow:0 0 4px ' + color, [{ transform: 'translate(0,0)', opacity: 1 }, { transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px)', opacity: 0.2 }], ms, delay + i * 30);
}
/** Soul particles: soft round motes that drift up (or rise from the floor). */
function motes(p: Pt, color: string, n: number, rise: boolean, ms: number) {
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * p.s, sz = Math.max(3, p.s * (0.07 + Math.random() * 0.06));
    particle({ x: p.x + x, y: p.y + (rise ? p.s * 0.3 : 0) }, sz, 'border-radius:50%;background:' + color + ';box-shadow:0 0 8px ' + color + ';filter:blur(.5px)', [{ transform: 'translate(0,0)', opacity: 0 }, { opacity: 1, offset: 0.25 }, { transform: 'translate(' + x * 0.3 + 'px,-' + p.s * (0.6 + Math.random() * 0.5) + 'px)', opacity: 0 }], ms * (0.7 + Math.random() * 0.5), i * 30);
  }
}
function moteTo(a: { x: number; y: number }, b: { x: number; y: number }, color: string, ms: number, delay = 0) {
  const sz = 6 + Math.random() * 5, wob = (Math.random() - 0.5) * 40;
  particle(a, sz, 'border-radius:50%;background:' + color + ';box-shadow:0 0 10px ' + color + ';filter:blur(.6px)', [{ transform: 'translate(0,0)', opacity: 0.2 }, { transform: 'translate(' + ((b.x - a.x) / 2 + wob) + 'px,' + ((b.y - a.y) / 2 - wob) + 'px)', opacity: 1, offset: 0.5 }, { transform: 'translate(' + (b.x - a.x) + 'px,' + (b.y - a.y) + 'px)', opacity: 0.4 }], ms, delay);
}
const squaresOrMotes = (p: Pt, color: string, soul: boolean) => (soul ? motes(p, color, 5, false, 500) : squares(p, color, 6, 0.6, 400));
function pluses(p: Pt, color: string, n: number) {
  for (let i = 0; i < n; i++) {
    const x = (Math.random() - 0.5) * p.s * 0.9, sz = p.s * (0.22 + Math.random() * 0.12);
    const run = () => {
      const t = document.createElement('div'); t.textContent = '+';
      t.style.cssText = "font:700 " + Math.round(sz) + "px 'Chakra Petch',sans-serif;color:" + color + ';text-shadow:0 0 6px ' + color + ';display:grid;place-items:center;width:100%;height:100%';
      const box = put(t, { x: p.x + x, y: p.y + p.s * 0.2 }, sz, sz, 900);
      anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.2 }, { transform: 'translateY(-' + p.s * (0.6 + Math.random() * 0.4) + 'px)', opacity: 0 }], { duration: 900, easing: 'ease-out', fill: 'forwards' });
    };
    after(run, i * 60);
  }
}

// ---------- Sigil pieces (rules 1.4) ----------
/** Whose eyes this screen is: the squad (the Proving Ground's team fight and every room play from the PC side). */
let viewer: 'pc' | 'foe' = 'pc';
export const setViewer = (s: 'pc' | 'foe') => { viewer = s; };
/** An event marked only for one side plays only on that side's screens (the room view drops them already; this is the
 *  second lock, for the area map's stream and the host's own view). */
const mineOnly = (e: FxEvent) => !e.only || e.only === viewer;
/** The glyph a lobbed spell carries over: its first Subject's stroke. */
function subjectGlyph(words: string[]): string {
  const w = words.find((x) => SIGIL[x]?.group === 'subject') || words[0];
  const d = (w && GLYPH_PATHS[w]) || 'M6 6 H18 V18 H6 Z';
  return '<svg viewBox="0 0 24 24" width="80%" height="80%"><path d="' + d + '" fill="none" stroke="' + SIGIL_INK + '" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>';
}
/** One missile of an Evoke: flies by its Reach (SEEK's beam stops at its block tile, ARC lobs, SENSE appears, RELAY hops
 *  through the ally), then its Burst lands tile by tile in the element's look. */
function missile(e: FxEvent, m: any, el: string | null, glyph: string) {
  const origin = centre(m.origin), kind = (m.kind || 'bolt') as MissileKind;
  const end = m.blockedAt || m.impact, endP = centre(end);
  if (!endP) return;
  let ft = 0;
  if (origin && kind === 'relay' && Array.isArray(m.hops) && m.hops.length) {
    // RELAY: a beam to each ally on the way, a ring on them as it passes through, then on to the impact.
    let a = origin;
    for (const h of [...m.hops, end]) { const b = centre(h); if (!b) continue; const t0 = ft; after(() => { elementTrail(a, b, el, 'sigil', 'bolt'); }, t0); ft += Math.max(110, Math.hypot(b.x - a.x, b.y - a.y) / 2.4); if (h !== end) { const hb = b; after(() => { snapFrame(hb, SIGIL_INK, 'sigil', 320, { from: 0.6, to: 1.2 }); play('el_zap', hb, { rate: 1.4, gain: 0.5 }); }, ft); } a = b; }
  } else if (origin && kind === 'appear') {
    // SENSE: no flight; a frame snaps in where it appears.
    snapFrame(endP, WHITE, 'sigil', 360, { from: 2, to: 1 }); ft = 160;
  } else if (origin && (kind === 'bolt' || kind === 'lob' || kind === 'touch')) ft = elementTrail(origin, endP, el, 'sigil', kind, { glyph });
  after(() => {
    if (m.blockedAt && m.blockedAt !== m.impact) { const q = centre(m.blockedAt); if (q) { burst('spark_burst', q, q.s * 0.7, 240, { color: SIGIL_INK }); floatText('BLOCKED', q, MUTED, { small: true }); } }
    if (m.placed || e.fizzle) { const q = at(m.impact); if (q) snapFrame(q, SIGIL_INK, 'sigil', 360); return; }
    const tiles: string[] = Array.isArray(m.burst) && m.burst.length ? m.burst : [m.impact];
    const core = centre(m.core || m.impact) || endP;
    tiles.slice(0, 24).forEach((k) => {
      const q = at(k); if (!q) return;
      const dd = Math.hypot(q.x - core.x, q.y - core.y) / Math.max(1, q.s);
      elementImpact(q, el, 'sigil', { power: k === (m.core || m.impact) ? 1 : 0.6, delay: Math.round(dd * 60), decalKey: k === (m.core || m.impact) ? k : null, quiet: true });
    });
    const fx = elementFx(el); play(fx.sound.impact, core, { rate: fx.sound.rate * jitter(0.05), gain: tiles.length > 1 ? 1 : 0.8 });
    if (tiles.length > 2) shakeScreen(0.3 + Math.min(0.6, tiles.length * 0.05) * fx.shake);
  }, ft);
}
/** PULL's drag (or a GALE push): a trail of squares along the way the body was moved, link marks for a pull. */
function dragTrail(from: string, to: string, pull: boolean) {
  const a = centre(from), b = centre(to); if (!a || !b || (!visible(from) && !visible(to))) return;
  const n = Math.max(3, Math.min(12, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (a.s * 0.3))));
  const el = pull ? ELEMENTS.raw : ELEMENTS.gale;
  for (let i = 0; i < n; i++) { const t = i / n, q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; particle(q, Math.max(3, a.s * (pull ? 0.1 : 0.3)), pull ? 'border:2px solid ' + SIGIL_INK + ';transform:rotate(45deg)' : shardCss(el, 'sigil'), [{ opacity: 0.9 }, { opacity: 0 }], 520, i * 18, 'steps(4, end)'); }
  if (pull) floatText('PULLED', b, SIGIL_INK, { small: true });
}
/** Squares that fall off a tile and drop out of sight (a fizzle, a fading glyph, a broken turret). */
function fallingSquares(p: Pt, color: string, n: number, ms: number, delay = 0) {
  if (reducedMotion()) n = Math.min(n, 2);
  for (let i = 0; i < n; i++) { const x = (Math.random() - 0.5) * p.s * 0.8, sz = Math.max(3, p.s * (0.07 + Math.random() * 0.05)); particle({ x: p.x + x, y: p.y - p.s * 0.1 }, sz, 'background:' + color + ';box-shadow:0 0 0 1px ' + SIGIL_GLOW, [{ transform: 'translate(0,0) rotate(0deg)', opacity: 1 }, { transform: 'translate(' + x * 0.4 + 'px,-' + p.s * 0.15 + 'px) rotate(90deg)', opacity: 1, offset: 0.25 }, { transform: 'translate(' + x * 0.6 + 'px,' + p.s * 0.6 + 'px) rotate(180deg)', opacity: 0 }], ms * (0.8 + Math.random() * 0.4), delay + i * 25, 'steps(6, end)'); }
}
/** A glitch over a tile: offset cyan and red slices and a hue flicker (an overload, NULL wiping a glyph, a fizzle). */
function glitch(p: Pt, ms: number) {
  if (reducedMotion()) { burst('flare', p, p.s, 160, { color: HP }); return; }
  for (let i = 0; i < 5; i++) {
    const y = (Math.random() - 0.5) * p.s * 1.2, w = p.s * (0.6 + Math.random() * 0.8);
    particle({ x: p.x + (Math.random() - 0.5) * p.s * 0.4, y: p.y + y }, w, 'height:' + Math.max(2, p.s * 0.06) + 'px;margin-top:' + (w / 2 - 2) + 'px;background:' + (i % 2 ? HP : SIGIL_INK) + ';mix-blend-mode:screen', [{ transform: 'translateX(0)', opacity: 1 }, { transform: 'translateX(' + (Math.random() - 0.5) * p.s * 0.6 + 'px)', opacity: 1, offset: 0.5 }, { transform: 'translateX(0)', opacity: 0 }], ms, i * 30, 'steps(3, end)');
  }
}
/** A small numbered chip at a tile (CHAIN's jump count). */
function chip(p: Pt, text: string, color: string) {
  const t = document.createElement('div'); t.textContent = text;
  t.style.cssText = "width:100%;height:100%;display:grid;place-items:center;font:700 " + Math.round(p.s * 0.3) + "px 'Chakra Petch',sans-serif;color:#0A0D13;background:" + color + ';box-shadow:0 0 0 2px #0A0D13,0 0 8px ' + SIGIL_GLOW;
  const box = put(t, { x: p.x + p.s * 0.35, y: p.y - p.s * 0.4 }, p.s * 0.4, p.s * 0.4, 900); box.style.zIndex = '3';
  anim(box, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.2 }, { opacity: 1, offset: 0.75 }, { opacity: 0 }], { duration: 900, easing: 'steps(5, end)', fill: 'forwards' });
}
/** A reticle's corners closing on a tile (a spotted trap). */
function corners(p: Pt, color: string, ms: number) {
  const s = svg(40, 40, '<path d="M4 12 V4 H12 M28 4 H36 V12 M36 28 V36 H28 M12 36 H4 V28" fill="none" stroke="' + color + '" stroke-width="3"/>');
  const box = put(s, p, p.s * 1.3, p.s * 1.3, ms);
  anim(box, [{ transform: 'scale(1.8)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.4 }, { opacity: 0.3, offset: 0.6 }, { opacity: 1, offset: 0.8 }, { opacity: 0 }], { duration: ms, easing: 'steps(6, end)', fill: 'forwards' });
}
/** WAIT going off: square spikes snap up out of the tile. */
function spikes(p: Pt, el: ElementFx) {
  for (let i = 0; i < 5; i++) {
    const x = (i - 2) * p.s * 0.17, h = p.s * (0.35 + ((i * 7) % 3) * 0.12);
    particle({ x: p.x + x, y: p.y + p.s * 0.2 - h / 2 }, h, 'width:' + Math.max(3, p.s * 0.1) + 'px;margin-left:' + (h / 2 - p.s * 0.05) + 'px;background:linear-gradient(0deg,' + SIGIL_INK + ',' + el.core + ');box-shadow:0 0 6px ' + SIGIL_GLOW, [{ transform: 'scaleY(0)', transformOrigin: '50% 100%', opacity: 1 }, { transform: 'scaleY(1)', transformOrigin: '50% 100%', opacity: 1, offset: 0.3 }, { transform: 'scaleY(1)', opacity: 0 }], 520, i * 20, 'steps(4, end)');
  }
}
/** A RAISE wall rising out of the floor (stone slab, dust at its foot), or crumbling into falling chips. */
function slab(p: Pt, up: boolean) {
  const st = ELEMENTS.stone;
  if (up) {
    const d = document.createElement('div');
    d.style.cssText = 'width:100%;height:100%;background:linear-gradient(180deg,#C9D3E3,#7F8BA1 60%,#4A3A20);box-shadow:inset 0 0 0 2px ' + SIGIL_INK + ';clip-path:inset(0 0 0 0)';
    const box = put(d, p, p.s * 0.9, p.s * 0.9, 800);
    anim(box, reducedMotion() ? [{ opacity: 0 }, { opacity: 1, offset: 0.4 }, { opacity: 0 }] : [{ clipPath: 'inset(100% 0 0 0)', opacity: 1 }, { clipPath: 'inset(0 0 0 0)', opacity: 1, offset: 0.45 }, { clipPath: 'inset(0 0 0 0)', opacity: 0 }], { duration: 800, easing: 'steps(5, end)', fill: 'forwards' });
    dust({ x: p.x, y: p.y + p.s * 0.35 }, p.s, st.ink);
  } else { shards(p, st, 'sigil', 10, 0.5, 700); dust({ x: p.x, y: p.y + p.s * 0.2 }, p.s * 1.2, st.ink); }
}
/** STEP: a column of light that takes the body out (up) or sets it down. */
function beamUp(p: Pt, out: boolean) {
  const d = document.createElement('div');
  d.style.cssText = 'width:100%;height:100%;background:linear-gradient(0deg,rgba(139,222,238,0),' + SIGIL_INK + ' 40%,#FFFFFF 50%,' + SIGIL_INK + ' 60%,rgba(139,222,238,0));box-shadow:0 0 12px ' + SIGIL_GLOW;
  const box = put(d, { x: p.x, y: p.y - p.s * 0.5 }, p.s * 0.45, p.s * 2, 360);
  anim(box, out ? [{ transform: 'scaleX(1) scaleY(.3)', opacity: 1 }, { transform: 'scaleX(.1) scaleY(1)', opacity: 0 }] : [{ transform: 'scaleX(.1) scaleY(1)', opacity: 0 }, { transform: 'scaleX(1) scaleY(.3)', opacity: 1, offset: 0.6 }, { opacity: 0 }], { duration: 360, easing: 'steps(5, end)', fill: 'forwards' });
}
/** COMMAND's glyph chain: linked squares snapping out from the caster to the commanded. */
function linkChain(a: Pt, b: Pt, ms: number) {
  const n = Math.max(3, Math.min(10, Math.round(Math.hypot(b.x - a.x, b.y - a.y) / (a.s * 0.5))));
  for (let i = 1; i <= n; i++) { const t = i / (n + 1), q = { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }; particle(q, Math.max(5, a.s * 0.14), 'border:2px solid ' + SIGIL_INK + ';box-shadow:0 0 5px ' + SIGIL_GLOW + ';transform:rotate(45deg)', [{ opacity: 0, transform: 'rotate(45deg) scale(.4)' }, { opacity: 1, transform: 'rotate(45deg) scale(1)', offset: 0.3 }, { opacity: 1, offset: 0.7 }, { opacity: 0 }], ms + 300, (ms * i) / n, 'steps(3, end)'); }
}
/** WARD: four brackets close in around the token into a square shield. */
function brackets(p: Pt, color: string) {
  const s = svg(40, 40, '<path d="M4 14 V4 H14 M26 4 H36 V14 M36 26 V36 H26 M14 36 H4 V26" fill="none" stroke="' + color + '" stroke-width="3.5" style="filter:drop-shadow(0 0 3px ' + SIGIL_GLOW + ')"/><rect x="6" y="6" width="28" height="28" fill="' + color + '" opacity=".14"/>');
  const box = put(s, p, p.s * 1.25, p.s * 1.25, 800);
  anim(box, [{ transform: 'scale(1.7)', opacity: 0 }, { transform: 'scale(1)', opacity: 1, offset: 0.35 }, { opacity: 1, offset: 0.7 }, { transform: 'scale(1.05)', opacity: 0 }], { duration: 800, easing: 'steps(6, end)', fill: 'forwards' });
}
/** QUICKEN: a segmented ring spinning fast at the feet, speed streaks lifting off. */
function speedRing(p: Pt) {
  const s = svg(100, 100, '<circle cx="50" cy="50" r="40" fill="none" stroke="' + WHITE + '" stroke-width="5" stroke-dasharray="14 10"/><circle cx="50" cy="50" r="32" fill="none" stroke="' + SIGIL_INK + '" stroke-width="3" stroke-dasharray="6 8"/>');
  const box = put(s, { x: p.x, y: p.y + p.s * 0.15 }, p.s * 1.3, p.s * 0.65, 800);
  anim(box, reducedMotion() ? [{ opacity: 1 }, { opacity: 0 }] : [{ transform: 'rotate(0deg) scale(.6)', opacity: 0 }, { transform: 'rotate(180deg) scale(1)', opacity: 1, offset: 0.4 }, { transform: 'rotate(540deg) scale(1.1)', opacity: 0 }], { duration: 800, easing: 'steps(12, end)', fill: 'forwards' });
  for (let i = 0; i < 5; i++) particle({ x: p.x + (i - 2) * p.s * 0.18, y: p.y }, p.s * 0.5, 'width:2px;margin-left:' + (p.s * 0.25 - 1) + 'px;background:linear-gradient(0deg,rgba(255,255,255,0),#FFFFFF)', [{ transform: 'translateY(0)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translateY(-' + p.s * 0.6 + 'px)', opacity: 0 }], 420, i * 50, 'ease-out');
}
/** SHARPEN: a glint sweeping across the token like light on a blade, and a star at its tip. */
function glint(p: Pt) {
  const d = document.createElement('div');
  d.style.cssText = 'width:100%;height:100%;background:linear-gradient(90deg,rgba(255,255,255,0),#FFFFFF 50%,rgba(255,255,255,0));transform:rotate(-35deg)';
  const box = put(d, p, p.s * 0.25, p.s * 1.3, 460); box.style.mixBlendMode = 'screen';
  anim(box, [{ transform: 'translateX(-' + p.s * 0.6 + 'px)', opacity: 0 }, { opacity: 1, offset: 0.3 }, { transform: 'translateX(' + p.s * 0.6 + 'px)', opacity: 0 }], { duration: 460, easing: 'ease-out', fill: 'forwards' });
  burst('flash_star', { x: p.x + p.s * 0.35, y: p.y - p.s * 0.35 }, p.s * 0.6, 300, { color: WHITE, delay: 300, from: 0.2, to: 1.1 });
}
/** CLEANSE: the condition, a small chip over the head, shatters into fragments. */
function chipShatter(p: Pt, word: string) {
  const q = { x: p.x, y: p.y - p.s * 0.65, s: p.s };
  const t = document.createElement('div'); t.textContent = word;
  t.style.cssText = "width:100%;height:100%;display:grid;place-items:center;font:700 " + Math.max(9, Math.round(p.s * 0.22)) + "px 'Chakra Petch',sans-serif;color:#0A0D13;background:" + MUTED + ';white-space:nowrap';
  const box = put(t, q, p.s * 1.4, p.s * 0.32, 520);
  anim(box, [{ opacity: 0, transform: 'scale(.6)' }, { opacity: 1, transform: 'scale(1)', offset: 0.25 }, { opacity: 1, offset: 0.55 }, { opacity: 0, transform: 'scale(1.1)' }], { duration: 520, easing: 'steps(4, end)', fill: 'forwards' });
  after(() => { shards(q, { ...ELEMENTS.freeze, ink: MUTED, core: WHITE }, 'sigil', 10, 0.8, 520); floatText('CLEANSED', p, OK, { small: true }); }, 300);
}

// World Play 1.7 (fx/world.ts): carrying, searches, hazards, triggers, the alarm, approaches, talk, markers.
Object.assign(H, worldHandlers({ at, tokOf, posOf: (id) => unit(id)?.pos, play }));
// Class Roster Revision 3's moves (fx/classes.ts): the same kit as the Soul handlers, plus a few particles from here.
Object.assign(H, classHandlers({ at, tokOf, posOf: (id) => unit(id)?.pos, play, squares, dust, corners, glitch, condWord }));
// Physical 2.0 (fx/physical.ts): techniques, Momentum, Pressure, held Watches, Stopped, drill.
Object.assign(H, physHandlers({ at, tokOf, posOf: (id) => unit(id)?.pos, play, nameOf: (id) => (phys.TECHNIQUE as any)[id]?.name || id }));
// The melee techniques' own beats (fx/melee-techniques.ts): arcs, thrown weapons, holds, slams, skids, falls, clashes…
Object.assign(H, meleeTechHandlers({ at, tokOf, posOf: (id) => unit(id)?.pos, sideOf: (id) => unit(id)?.side, play, sawThen }));
// Physical 2.0 B (fx/ranged.ts): the ranged techniques, the quiver and thrown weapons; it wraps the handlers above.
wrapRanged(H, { at, tokOf, posOf: (id) => unit(id)?.pos, play, gunOf, muzzle, projectile, missPoint, dust, explosion, corners, seesUnit });

// ---------- the queue ----------
/** How long each kind holds the stage before the next event starts (ms), at the combat speed (game/combatSpeed.ts). */
const beatOf = (e: FxEvent): number => { const b = baseBeat(e); return b ? b * fxPace() : b; };
/** The beat at Fast (the written timings). */
function baseBeat(e: FxEvent): number {
  if (!mineOnly(e)) return 0;
  if (e.k === 'spotlight') return 0; // the cut-in is the queue's gate (below), not a beat
  const sb = soulBeat(e); if (sb !== undefined) return sb;
  const fe = feelingBeat(e); if (fe !== undefined) return fe;
  const kb = classBeat(e); if (kb !== undefined) return kb;
  const mb = meleeTechBeat(e); if (mb !== undefined) return mb;
  const rb = rangedBeat(e); if (rb !== undefined) return rb;
  const pb = physBeat(e); if (pb !== undefined) return pb;
  const fb = faithBeat(e); if (fb !== undefined) return fb;
  const wb = worldBeat(e); if (wb !== undefined) return wb;
  if (e.k === 'explode' && e.what === 'discharge') return 520;
  switch (e.k) {
    case 'turn': return 140;
    case 'move': { const n = moveSteps(e, units.get(e.unit)?.side === 'pc'); return n ? Math.min(1100, Math.max(160, n * (e.how === 'sprint' ? 75 : 115))) : 60; } // a walk wholly in the fog: a breath, not a pause
    case 'sight': return e.by ? 0 : e.how === 'reveal' ? 480 : e.how === 'hide' ? 380 : e.how === 'lost' ? 300 : 120; // by: on its walker's step (runQueue)
    case 'overwatch': return 560;
    case 'shot': return (e.chain || e._quick ? 170 : e.object ? 150 : 400) + (drawsArrow(e) ? DRAW_MS : 0);
    case 'melee': return e.chain || e._quick ? 240 : 420; // _quick: a Sweep's, Cleave's or Flurry's later strikes (fx/melee-techniques.ts quickStrikes)
    case 'volley': return e.mode === 'auto' ? 260 : 90;
    case 'reload': case 'load': case 'clear': case 'repair': case 'core': case 'crystallise': return Math.min(1200, (e.dur || 1000) * 0.85);
    case 'explode': return 220; // whoever stands in the blast is hurt with it, not after the smoke
    case 'evoke': return 700 + Math.max(0, ((e.missiles?.length || 1) - 1) * 110) + (e.missiles?.some((m: any) => m.kind === 'lob') ? 250 : 0) + (e.missiles?.some((m: any) => m.kind === 'relay') ? 200 : 0);
    case 'chain': return 230;
    case 'field': case 'wall_raised': case 'null_wave': case 'turret_placed': return 420;
    case 'turret_shot': return e.kind === 'lob' ? 560 : 340;
    case 'trap_sprung': case 'blink': case 'leech': case 'command': case 'boon': case 'fizzle': case 'mask': return 380;
    case 'field_tick': case 'trap_set': case 'trap_spotted': case 'wall_crumbled': case 'turret_destroyed': case 'veil': case 'light': return 240;
    case 'glyph_fade': case 'field_gone': case 'trap_gone': return 80;
    case 'release': return 750;
    case 'outburst': return e.hold ? 600 : 250;
    case 'short': return 700;
    case 'down': return 380;
    case 'stim': case 'overload': case 'vent': case 'syphon': case 'grow': case 'analyze': case 'draw': return 420;
    case 'hurt': case 'heal': case 'shove': case 'trap': case 'door': return 260;
    case 'mana': case 'song': case 'cover': case 'object': case 'cond': case 'shield': return 60;
    default: return 200;
  }
}
let timers: { id: number; at: number; run: () => void }[] = [];
let queueEnd = 0, idleTimer = 0, turnsUntil = 0;
/** The longest the screen may hold the player's input while other units' turns play (a stuck clock never locks play). */
export const TURNS_HOLD_MAX = 8000;
// ---------- the spotlight gate (docs/design/cutin-spec.md 6.2, decision 113) ----------
// A fight's batch with a 'spotlight' moment stops at a gate just before the action it happened in (its `from`): the
// cut-in plays, then that action plays slowed (tempo 0.85: every beat, duration and delay ÷ 0.85; one-shot sounds at
// rate × 0.85), then everything after it at normal speed. Events behind a closed gate wait unscheduled and are scheduled
// from the cut-in's actual end (a skip moves them earlier). The gate always opens by its cap (spotlight/timing.ts cutInCap).
/** The events waiting behind a gate (new batches join behind them, in order). */
let held: { evs: FxEvent[]; stream?: string; speed: number } | null = null;
/** While a cut-in shows: its planned end (input is held only then). */
let gateUntil = 0;
/** A gate's cut-in is on screen now (hurryFx leaves it alone). */
let gateShowing = false;
/** Spotlight events already decided (shown, or not shown by this player's setting), by stream, scene and n. Cleared with
 *  the queue (clearFx) and when a fight's numbering starts over (forgetSpotlights). */
const decided = new Set<string>();
/** The same fight started over under the same stream key (the Proving Ground's Retry): its spotlights are new ones. */
export function forgetSpotlights(stream?: string) { if (!stream) { decided.clear(); return; } for (const k of [...decided]) if (k.startsWith(stream + '|')) decided.delete(k); }
/** Until when (performance.now() clock) other units' turns are still being shown: the engine runs the enemies' turns at
 *  once, so the state says "your turn" while their moves still play. The combat screen holds your actions until then,
 *  and while a spotlight cut-in shows. */
export const turnsBusyUntil = () => {
  const now = performance.now(), until = Math.min(Math.max(turnsUntil, gateUntil), now + TURNS_HOLD_MAX * fxPace());
  // Nothing left to play and no cut-in up: whatever the clocks say (an estimate nothing corrected), the hold is a banner's
  // tail at most. Without this the cap above moved with the clock and so never ran out.
  return !timers.length && !held && !gateShowing ? Math.min(until, now + TURN_TAIL_MS * fxPace()) : until;
};
/** A turn banner's tail: how long input stays held after the last of the other turns has started to play (ms at Fast). */
export const TURN_TAIL_MS = 120;
// For the e2e suites (they wait for the other turns to finish playing before they act, as a player must).
if (typeof window !== 'undefined') (window as any).__phcHold = turnsBusyUntil;
/** When the queued effects will have played (performance.now() clock): a turn banner can wait for the enemies' moves. */
export const fxBusyUntil = () => Math.max(queueEnd, performance.now());
/** Run one event's effect now, outside the queue (for the turn intro, the Proving Ground, a test button). tempo: 0.85 for
 *  an action slowed after a spotlight cut-in. */
export function playFx(e: Partial<FxEvent> & { k: string }, stream?: string, tempo = 1) {
  const ev = { n: 0, ...e } as FxEvent;
  try { if (mineOnly(ev)) withTempo(tempo, () => H[ev.k]?.(ev)); } catch (err) { console.warn('fx', ev.k, err); }
  try { if (ev.k === 'object' && ev.at) releaseTile(String(ev.at)); else if (ev.k === 'explode' && ev.at) releaseCloud(ev); } catch { /* */ }
  // The turn intro (turnIntro.tsx) times enemy-turn banners on this clock instead of estimating. stream names whose
  // numbering n belongs to (FxLayer's stream key: 'cb|…' for a fight, 'st|…' for the area map).
  if (ev.n) try { window.dispatchEvent(new CustomEvent('phc:fx-at', { detail: { n: ev.n, stream: stream || '' } })); } catch { /* */ }
  try { window.dispatchEvent(new CustomEvent(FX_EVENT, { detail: ev })); } catch { /* */ }
  // its HP changes show a beat into it (the hit lands), not as it starts
  if (ev.n && ev.hp) { const n = ev.n; window.setTimeout(() => notePlayed(stream, n), slow(ev.k === 'shot' || ev.k === 'melee' ? 260 : 80)); } else notePlayed(stream, ev.n, ev.k === 'turn' && ev.unit ? String(ev.unit) : undefined);
}
/** How much faster than normal a backlog may play: past this, the oldest effects are skipped instead (they never play in a
 *  blur: "the battle keeps going in super speed"). */
export const MAX_SPEEDUP = 1.35;
/** Skip an effect: nothing drawn or heard, but its place in the stream is announced so turn banners keep their clock. */
function skipFx(e: FxEvent, stream?: string) { notePlayed(stream, e.n); try { if (e.k === 'object' && e.at) releaseTile(String(e.at)); else if (e.k === 'explode' && e.at) releaseCloud(e); else if (e.k === 'shove' && e.target) releaseMover(String(e.target)); } catch { /* */ } if (e.n) try { window.dispatchEvent(new CustomEvent('phc:fx-at', { detail: { n: e.n, stream: stream || '' } })); } catch { /* */ } }
/** How far past the room a spotlight's protected tail may run (its action and everything after it) before the protection
 *  gives way: the moment is then skipped like any old effect, with no cut-in, so play never lags far. */
export const PROTECT_GRACE = 1.5;
/** Which events of a batch play, and how fast: the newest that fit in the room at no more than MAX_SPEEDUP; keep (when
 *  given) plays only the last few (a decided fight). protect: never skip from this index on (a spotlight's action), as
 *  long as that tail fits in PROTECT_GRACE × the room at MAX_SPEEDUP; `protected` says whether it held. Pure (tests). */
export function planQueue(beats: number[], room: number, keep?: number, protect = -1): { from: number; speed: number; protected?: boolean } {
  let from = keep != null ? Math.max(0, beats.length - keep) : 0;
  const sum = (i: number) => beats.slice(i).reduce((t, b) => t + b, 0);
  while (from < beats.length - 1 && sum(from) / MAX_SPEEDUP > room) from++;
  let held = protect >= 0 && from <= protect;
  if (protect >= 0 && from > protect && sum(protect) / MAX_SPEEDUP <= room * PROTECT_GRACE) { from = protect; held = true; }
  const total = sum(from);
  return { from, speed: total > room ? Math.max(1 / MAX_SPEEDUP, room / total) : 1, ...(protect >= 0 ? { protected: held } : {}) };
}
export interface Gate { at: number; from: number; to: number; spots: FxEvent[] }
/**
 * The gates in a fight's batch: every spotlight not yet decided, grouped by its action (`from`; an event with no `from`
 * gates itself). `at` is the index the gate stands before (the first event of the action still in the batch); the
 * slowed segment is from ≤ n < to (the group's last spotlight). Pure (tests).
 */
export function gatesOf(evs: FxEvent[], isDecided: (e: FxEvent) => boolean = () => false): Gate[] {
  const groups = new Map<number, FxEvent[]>();
  for (const e of evs) if (e.k === 'spotlight' && !isDecided(e)) { const f = Number.isFinite(e.from) ? Number(e.from) : e.n; (groups.get(f) || groups.set(f, []).get(f)!).push(e); }
  const out: Gate[] = [];
  for (const [from, spots] of groups) {
    const at = evs.findIndex((x) => x.n >= Math.min(from, spots[0].n));
    out.push({ at: at < 0 ? 0 : at, from, to: Math.max(...spots.map((x) => x.n)), spots });
  }
  return out.sort((a, b) => a.at - b.at);
}
/** The slowed segment's events: those with from ≤ n < to, but never a turn banner. Pure (tests). */
export const slowedIn = (e: FxEvent, seg: { from: number; to: number } | null) => !!seg && e.n >= seg.from && e.n < seg.to && e.k !== 'turn';
/** The time each event starts at, from t0, with the slowed segment ÷ tempo (and the rest at speed). Pure (tests). */
export function timeline(evs: FxEvent[], beats: number[], t0: number, speed = 1, seg: { from: number; to: number } | null = null, tempo = CUTIN_TEMPO): number[] {
  let t = t0; return evs.map((e, i) => { const at = t; t += slowedIn(e, seg) ? beats[i] / tempo : beats[i] * speed; return at; });
}
const keyOf = (stream: string | undefined, e: FxEvent) => (stream || '') + '|' + ((e as any).scene || '') + '|' + e.n;
const isFight = (stream?: string) => !!stream && stream.startsWith('cb|');
/** Queue events to play in order, each after the previous one's beat. A long backlog plays a little faster, and past that
 *  its oldest effects are skipped, so play never lags far and never races. keep: play only the last few (the fight is
 *  decided: what happened after it matters, not a replay of every step). A spotlight's action is never skipped. */
export function queueFx(evs: FxEvent[], stream?: string, opts: { keep?: number; from?: number } = {}) {
  if (!evs.length) return;
  noteQueued(stream, Math.max(...evs.map((e) => e.n || 0)));
  if (opts.from == null) rangedBatch(evs, stream); // fx/ranged.ts: tag the batch's techniques in order (a new fight forgets the last)
  // A Miracle is a fixed hold, never compressed or skipped (everyone in the room sees the god answer, even in a backlog
  // or a decided fight), and what follows it (its effects) starts as its cut-in lands: Leon's order, "the screen zooms
  // to the map, then the miracle happens". What came before it plays first as usual (a decided fight skips it: the
  // Miracle is what it shows); what follows is planned on its own, its room counted from the landing.
  const mi = evs.findIndex((e) => e.k === 'miracle');
  if (mi >= 0) {
    // One stage (decision 113): a spotlight moment in the Miracle's own action (a boss it takes down, a god's crit) shows
    // only the Miracle: no strip, no slowed action.
    if (isFight(stream)) for (const e of evs) if (e.k === 'spotlight' && sameAction(e, evs[mi])) decided.add(keyOf(stream, e));
    const pre = evs.slice(0, mi), post = evs.slice(mi + 1);
    if (opts.keep != null) for (const e of pre) skipFx(e, stream); else queuePlain(pre, stream, {});
    queuePlain([evs[mi]], stream, { from: Math.max(performance.now(), queueEnd) }); // never skipped or sped up: it starts at the queue's end and holds its full beat
    queueFx(post, stream, { from: Math.max(performance.now(), queueEnd) }); // a later Miracle in the batch: the same again
    return;
  }
  queuePlain(evs, stream, opts);
}
/** Is this spotlight moment from the same action as the event x (its from ≤ x.n ≤ its n)? Pure (tests). */
export const sameAction = (sp: FxEvent, x: FxEvent) => { const f = Number.isFinite(sp.from) ? Number(sp.from) : sp.n; return x.n >= f && x.n <= sp.n; };
/** queueFx for a batch with no Miracle in it. from: count the backlog from this time (after a Miracle's hold). */
function queuePlain(evs: FxEvent[], stream: string | undefined, opts: { keep?: number; from?: number }) {
  if (!evs.length) return;
  evs = meleePrepass(evs); // the melee techniques' movement beats over their moves, quick later strikes, Thrown Flurry flights
  if (held) { held.evs.push(...evs); return; } // a gate is closed: join behind it
  const now = performance.now(), base = Math.max(now, queueEnd);
  // A fight plays every effect, in order, at the speed the player chose (Leon, 11 Nov 2026: "the animation must be
  // obeyed"). Before this a long enemy phase was sped up and its oldest effects skipped: a skipped push dropped a unit
  // on its end tile, HP fell before the hit showed, and the enemy's moves ran on into the player's turn. Only a decided
  // fight (keep) and the streams outside a fight still fit themselves into the room.
  const backlog = base - Math.max(now, Math.min(base, opts.from ?? now)), k = fxPace(), room = isFight(stream) && opts.keep == null ? Infinity : Math.max(1500 * k, 7000 * k - backlog);
  const gates = isFight(stream) ? gatesOf(evs, (e) => decided.has(keyOf(stream, e))) : [];
  const plan = planQueue(evs.map(beatOf), room, opts.keep, gates.length ? gates[0].at : -1);
  // A gate whose action is (partly) skipped shows no cut-in: the moment went by in the backlog.
  for (const gt of gates) if (gt.at < plan.from) for (const sp of gt.spots) decided.add(keyOf(stream, sp));
  for (const e of evs.slice(0, plan.from)) skipFx(e, stream);
  // A unit held for a moment that was skipped (the backlog) shows where it is now, unless a later one of its plays.
  if (plan.from > 0) { const later = new Set(evs.slice(plan.from).filter((e) => e.k === 'move' || e.k === 'sight').map((e) => String(e.unit || ''))); for (const e of evs.slice(0, plan.from)) if (e.unit && !later.has(String(e.unit))) releaseMover(String(e.unit)); }
  runQueue(evs.slice(plan.from), stream, base, plan.speed, null, null);
}
/** The camera leaves this much before a glide's length ahead of its beat, so the glide is over when the beat plays. */
export const CAM_EARLY_MS = 40;
/** The camera rests this long (at Fast; it follows the combat speed) where a move takes it, or the move is not made. */
export const CAM_REST_MS = 350;
/** The order the camera's looks were planned in, and the latest one that has run (see runQueue). */
let camOrd = 0, camDone = 0;
/** The last walk or sight event of each unit in a batch being scheduled: only that one lets a held unit go when its walk
 *  is out of sight (H.move). */
const lastOfUnit = new WeakSet<FxEvent>();
/** When a sight change a walker's eyes made (by, byAt: the walker and its tile then) plays: on that step of its walk,
 *  from the walks scheduled so far (when each starts, its path, its pace per tile). null: no such walk. Pure (tests). */
export function stepTime(walks: Map<string, { t: number; path: string[]; ms: number }[]>, by: string, byAt: string): number | null {
  const list = walks.get(by) || [];
  for (let j = list.length - 1; j >= 0; j--) { const w = list[j], i = w.path.lastIndexOf(byAt); if (i >= 0) return w.t + i * w.ms; }
  return null;
}
/** Schedule a batch from t; stop at the first gate whose cut-in this player will see (the rest wait behind it). */
function runQueue(evs: FxEvent[], stream: string | undefined, t: number, speed: number, seg: { from: number; to: number } | null, cutId: string | null) {
  const now = performance.now();
  const gates = isFight(stream) ? gatesOf(evs, (e) => decided.has(keyOf(stream, e))) : [];
  let lastTurn = -1;
  { const had = new Set<string>(); for (let i = evs.length - 1; i >= 0; i--) { const e = evs[i], id = String(e.unit || ''); if ((e.k === 'move' || e.k === 'sight') && id && !had.has(id)) { had.add(id); lastOfUnit.add(e); } } }
  const walks = new Map<string, { t: number; path: string[]; ms: number }[]>();
  const cam = document.hidden ? null : activeCamera(); let camAt: { x: number; y: number } | null = null;
  let lastGo: { arrives: number; from: { x: number; y: number } | null; rec: { skip: boolean } } | null = null;
  for (let i = 0; i < evs.length; i++) {
    const e = evs[i], gate = gates.find((x) => x.at === i);
    if (gate) {
      for (const sp of gate.spots) decided.add(keyOf(stream, sp));
      const c = document.hidden ? null : cutInForFx(ctxGame, gate.spots, stream);
      if (c) { closeGate(evs.slice(i), stream, t, gate, c, lastTurn, speed); return; }
    }
    const slowed = slowedIn(e, seg), tp = slowed ? CUTIN_TEMPO : 1, beat = beatOf(e);
    // The camera (roadmap 2c): the camera goes to a beat whose tiles are off screen, and is there when the beat plays:
    // it leaves a glide's length before the beat's time (while the beat before it ends), so no beat is ever delayed
    // (a wait put into the queue here broke the turn hand-over and the melee techniques' paired beats). A turn's banner
    // plays as the camera leaves for its unit. Planned here from where the camera will be by then (cam.plan), done when
    // the time comes (cam.show: not while the player aims or drags; what still does not show gets an arrow at the
    // window's edge).
    let look: (() => void) | null = null;
    if (cam && mineOnly(e)) {
      const isTurn = e.k === 'turn', keys = isTurn ? (sawThen(e) && typeof e.at === 'string' && visible(e.at) ? [String(e.at)] : []) : beat > 0 || e.k === 'move' ? fxTiles(e, (id) => unit(id)?.pos, (k) => visible(k)) : [];
      if (keys.length) {
        // A result (a wound, a heal, a unit going down) never moves the camera: off screen it only gets its arrow.
        const moves = isTurn || movesCamera(e.k);
        let to: { x: number; y: number } | null = moves ? cam.plan(keys, camAt, isTurn ? 'turn' : 'beat') : null;
        const glide = glideMs(fxPace(), reducedMotion()) / tp, leaves = isTurn ? t : t - glide - CAM_EARLY_MS;
        // No going somewhere only to leave at once: when this beat takes the camera away before it has rested where
        // the move before sent it (a hostile's turn banner, then its shot at a unit on the far side 0.4 s later), that
        // move is not made (its place gets an arrow at the window's edge) and the camera goes straight here.
        if (to && lastGo && leaves - lastGo.arrives < CAM_REST_MS * fxPace() / tp) { lastGo.rec.skip = true; camAt = lastGo.from; to = cam.plan(keys, camAt, isTurn ? 'turn' : 'beat'); lastGo = null; }
        const rec = { skip: false };
        // The same for a turn's banner, looked up ahead (a banner at the head of a batch plays before the rest is
        // planned): the unit's next beat is on another part of the map before the camera would have rested on it.
        if (to && isTurn) {
          let tt = t + beat * speed;
          for (let j = i + 1; j < evs.length && evs[j].k !== 'turn' && !gates.some((x) => x.at === j); j++) {
            const x = evs[j], bx = beatOf(x), ks = mineOnly(x) && movesCamera(x.k) && (bx > 0 || x.k === 'move') ? fxTiles(x, (id) => unit(id)?.pos, (k) => visible(k)) : [];
            if (ks.length) { if (cam.plan(ks, to, 'beat') && tt - glide - CAM_EARLY_MS - (t + glide) < CAM_REST_MS * fxPace() / tp) { rec.skip = true; to = null; } break; }
            tt += bx * speed;
          }
        }
        if (to) { lastGo = { arrives: leaves + glide, from: camAt, rec }; camAt = to; }
        const who = unit(e.unit) || unit(e.target), tag = { color: who && who.side === 'pc' ? WHITE : HP, label: (who && seesUnit(String(e.unit || e.target || '')) ? who.name : isTurn ? 'A turn' : 'Something') + ' at ' + refOf(keys[0]) };
        // A beat's own look never takes the camera back from a later beat's: the camera may already have left for
        // the next one (its early start), and a technique's name over the attacker would pull it back from the
        // target just before the shot lands. A look that comes late only raises its arrow.
        const ord = ++camOrd;
        look = () => { const late = ord < camDone; if (!late) camDone = ord; try { if (isTurn && rec.skip) activeCamera()?.passTurn(keys[0]); activeCamera()?.show(keys, isTurn ? 'turn' : 'beat', tag, moves && !late && !rec.skip); } catch { /* */ } };
        // The early start has its own timer only when there is a glide to make (no extra timer otherwise).
        if (to && !isTurn) { if (leaves - now <= 4) look(); else schedule(look, leaves); }
      }
    }
    if (e.k === 'turn') lastTurn = t;
    const camLook = look;
    const wait = t - now, go = () => { if (camLook) camLook(); if (slowed && cutId) noteSlowed(cutId, e, beat / tp, tp); noteFx(e, beat / (slowed ? tp : 1)); playFx(e, stream, tp); };
    // A walk's clock: a sight change its walker's eyes made plays on that step (a hostile found or lost mid-walk), not
    // after the whole walk.
    if (e.k === 'move' && e.unit && mineOnly(e)) { const id = String(e.unit); (walks.get(id) || walks.set(id, []).get(id)!).push({ t, path: (e.path || [e.from, e.to]).filter(Boolean), ms: (e.how === 'sprint' ? 75 : 115) * fxPace() / tp }); }
    if (e.k === 'sight' && e.by && e.byAt) { const at = stepTime(walks, String(e.by), String(e.byAt)); if (at != null && at < t) { if (at - now <= 4) go(); else schedule(go, at); continue; } }
    if (wait <= 4) go();
    else schedule(go, t);
    // A slowed event's whole beat follows the tempo (a bow's draw included: its after() is slowed too). Otherwise a bow's
    // draw holds its full time even when a backlog plays faster (the arrow can't fly before it is loosed), and a Miracle
    // (behind a gate that was closed when it came) is never sped up.
    const draw = drawsArrow(e) && mineOnly(e) ? DRAW_MS * fxPace() : 0;
    t += (slowed ? beat / tp : e.k === 'miracle' ? beat : (beat - draw) * speed + draw);
  }
  queueEnd = t;
  // A batch that changes turns: the last turn it shows starts when its banner plays; input waits for it.
  if (lastTurn >= 0) { const was = turnsUntil; turnsUntil = Math.max(turnsUntil, lastTurn + TURN_TAIL_MS * fxPace()); if (turnsUntil !== was) holdChanged(); }
  clearTimeout(idleTimer); idleTimer = window.setTimeout(idle, t - now + 50);
}
/** The queue ran dry: a walker still stopped mid-walk (the rest of its walk never came) goes, its real token shows. */
function idle() {
  if (!held) for (const id of [...parked.keys()]) unpark(id);
  try { window.dispatchEvent(new CustomEvent(FX_IDLE)); } catch { /* */ }
}
const holdChanged = () => { try { window.dispatchEvent(new CustomEvent(FX_HOLD)); } catch { /* */ } };
/** Run f at performance.now() time t (a timer the queue can move: hurryFx). */
function schedule(run: () => void, t: number) {
  const entry = { id: 0, at: t, run };
  entry.id = window.setTimeout(() => { timers = timers.filter((x) => x !== entry); run(); }, Math.max(0, t - performance.now()));
  timers.push(entry);
}
/** Close a gate at time t: the rest of the batch waits; the cut-in plays at t; when it ends (or is skipped, or the cap)
 *  the rest plays from then, the gate's action slowed. Until then queueEnd and the turns' hold are estimates. */
function closeGate(rest: FxEvent[], stream: string | undefined, t: number, gate: Gate, c: { spec: any; slow: boolean }, lastTurn: number, speed = 1) {
  held = { evs: rest, stream, speed };
  const n = c.spec.strips.length, god = c.spec.strips.some((s: any) => s.god), k = fxPace(), cutMs = CUTIN_MS(n, god, !c.slow, !!c.spec.short) * k;
  const seg = c.slow ? { from: gate.from, to: gate.to } : null;
  // Estimates (a skip moves them earlier when the gate opens).
  const beats = rest.map(beatOf), times = timeline(rest, beats, t + cutMs, speed, seg);
  rest.forEach((e, i) => { if (e.k === 'turn') lastTurn = times[i]; });
  const turnsWas = turnsUntil;
  queueEnd = (times.length ? times[times.length - 1] + beats[beats.length - 1] / (slowedIn(rest[rest.length - 1], seg) ? CUTIN_TEMPO : 1) : t + cutMs);
  if (lastTurn >= 0) turnsUntil = Math.max(turnsUntil, lastTurn + TURN_TAIL_MS * k);
  gateUntil = t + cutMs; holdChanged();
  const id = c.spec.id;
  let opened = false, cap = 0;
  const open = (shown: boolean) => {
    if (opened) return; opened = true; clearTimeout(cap); gateShowing = false;
    // Opened by the cap: the cut-in never came on (or hung); it must not show later over the aftermath.
    if (!shown) cancelSpotlight(id);
    const h = held; held = null; gateUntil = 0;
    if (h) { turnsUntil = turnsWas; runQueue(h.evs, h.stream, performance.now(), h.speed, shown ? seg : null, shown ? id : null); }
    holdChanged();
  };
  const go = () => {
    // The pace now, not when the gate closed (review fix: a Fast -> Normal change while it waited behind a backlog gave
    // a cap shorter than the cut-in, which then cut the crit short): the cut-in plays at this same pace (opts.pace), and
    // the cap allows for a story cut-in's skip (preempt) before it.
    const k2 = fxPace(), ms2 = CUTIN_MS(n, god, !c.slow, !!c.spec.short) * k2;
    gateShowing = true; gateUntil = performance.now() + ms2; holdChanged();
    cap = window.setTimeout(() => open(false), (cutInCap(!!c.spec.short) + 100 + CUTIN_SKIP_MS) * k2);
    // preempt: a cut-in already on screen (a story one, a client-door preview) gives way at once, so this one plays
    // before its action, never after it.
    showSpotlight(c.spec, { prefApplied: true, preempt: true, pace: k2 }).then((r) => open(r !== 'off')).catch(() => open(false));
  };
  if (t - performance.now() <= 4) go(); else schedule(go, t);
}
/** Move everything queued up by ms (a skipped Miracle cut-in: what it was holding plays now). Never before now; the turn
 *  hold and the idle signal move with it. A spotlight gate's cut-in on screen is left alone (its own end reschedules
 *  what waits behind it); a gate not reached yet moves up with the rest, and its estimates with it. */
export function hurryFx(ms: number) {
  if (!(ms > 0) || gateShowing) return;
  const now = performance.now(), was = timers; timers = [];
  for (const x of was) { clearTimeout(x.id); schedule(x.run, Math.max(now, x.at - ms)); }
  queueEnd = Math.max(now, queueEnd - ms);
  if (gateUntil > now) gateUntil = Math.max(now, gateUntil - ms);
  if (turnsUntil > now) turnsUntil = Math.max(now, turnsUntil - ms);
  holdChanged();
  clearTimeout(idleTimer); idleTimer = window.setTimeout(idle, queueEnd - now + 50);
}
/** Drop everything queued (the game changed, the tab was hidden), a closed gate and every cut-in with it. */
export function clearFx() { moved(); for (const [k, n] of queuedTo) playedTo.set(k, Math.max(playedTo.get(k) || 0, n)); turnShown.clear();  releaseAllTiles(); resetFloats(); for (const id of [...parked.keys()]) unpark(id); for (const id of [...waiting.keys()]) releaseMover(id); for (const t of walking.values()) clearTimeout(t); walking.clear(); resetSight(); for (const x of timers) clearTimeout(x.id); timers = []; queueEnd = 0; turnsUntil = 0; gateUntil = 0; gateShowing = false; held = null; volley = null; decided.clear(); bumpGen(); dropCutIns(); closeCutIns(); resetRanged(); }
/** Is there a grid on screen to draw on? */
export const canDraw = () => hasLayer() && gridShown();
/** The Proving Ground and the e2e scripts play single effects by hand (window.__phcFx.playFx({ k: 'pump', … })). */
if (typeof window !== 'undefined') (window as any).__phcFx = { playFx, queueFx };

// ---------- the combat speed's test hook ----------
/** The last effects the queue played: kind, n, when (performance.now()) and the beat it held (ms, at the speed). */
const FX_LOG: { n: number; k: string; at: number; beat: number }[] = [];
function noteFx(e: FxEvent, beat: number) { FX_LOG.push({ n: e.n, k: e.k, at: Math.round(performance.now()), beat: Math.round(beat) }); if (FX_LOG.length > 40) FX_LOG.splice(0, FX_LOG.length - 40); }
/** For the e2e suites (combat-speed.mjs): the speed, its multiplier, the pace in force now (1 outside a fight), the
 *  spotlight tempo, the beat a kind of event would hold now (beat('shot')), and the last effects played. */
export function combatTempoInfo() {
  const speed = getCombatSpeed();
  return { speed, mult: combatTempo(speed), pace: battlePace(), battle: inBattle(), tempo: fxTempo(), scale: fxScale(),
    beat: (k: string, e: Record<string, unknown> = {}) => beatOf({ n: 0, ...e, k } as any), fx: FX_LOG.slice() };
}
/** A cheap debug hook for a stalled fight (docs/design/handoffs/coop-stall.md): where each effects stream stands and
 *  what the queue is waiting for. Read by the e2e suites and by a tester's console (window.__phcFxDebug()). */
export function fxDebug() {
  const now = performance.now(), ms = (t: number) => (t ? Math.round(t - now) : 0);
  return { processed: Object.fromEntries(processed), queuedTo: Object.fromEntries(queuedTo), playedTo: Object.fromEntries(playedTo), turnShown: Object.fromEntries(turnShown),
    queueEndIn: ms(queueEnd), turnsIn: ms(turnsUntil), gateIn: ms(gateUntil), gateShowing, heldBehindGate: held ? held.evs.length : 0, timers: timers.length,
    waiting: [...waiting.keys()], walking: [...walking.keys()], parked: [...parked.keys()], quietMs: Math.round(now - lastMove), settled, hidden: typeof document !== 'undefined' && document.hidden, layer: hasLayer() };
}
if (typeof window !== 'undefined') (window as any).__phcFxDebug = fxDebug;
if (typeof window !== 'undefined') (window as any).__phcCombatTempo = () => { const t = combatTempoInfo(); return { ...t, beat: undefined, shotBeat: t.beat('shot', { hit: true }) }; };
