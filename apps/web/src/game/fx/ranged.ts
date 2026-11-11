// Physical 2.0 B (rules 1.12): the ranged techniques, the quiver and thrown weapons as effects and sound. Why this file
// exists: docs/design/handoffs/physical-2.0-B-fx-NOTE.md (Leon, 10 Nov 2026: C's Part 4 shows a technique as a label over
// an ordinary shot; each lane makes the effects for its own techniques). C's fx/physical.ts still names the technique
// and pulses the Pressure; this file shows what the technique did differently: a Burst's step-down, a Rake's sweep, a
// Mag Dump's one long stream, a round punching through cover, a warning shot that misses on purpose, a held Bead, a
// Spot's pin, a held lane, a Watch held and broken, a grenade landing as what it is.
//
// How it plugs in (play.ts, additive only): wrapRanged(H, kit) wraps the handlers it decorates (each still calls the
// one it wraps, unless the base would show something wrong: a loose round never floats MISS) and adds the keys the
// engine sends that had no handler (bead, bead_end, spot, heat, watch_end, and the events listed for the lead below).
// rangedBeat(e) gives the few events whose beat changes; everything else keeps its beat.
//
// Which technique a shot belongs to: the engine's 'technique' event comes first, then the action's shots, objects,
// hurts and conditions. tagOf() reads them in order (the queue computes every beat in order before anything plays, so
// the tags are ready when the handlers run) and keeps each technique's record with its shots and what followed, so a
// shot can look ahead (the cover a Punch Through breaks, the targets a Rake sweeps). The ranged engine (rules 1.12,
// claude/physical-2.0-B-ranged, events E1–E17) marks every technique's shot with `tech` and `vi`, so a shot is tagged by
// what the engine says; a technique event that carries `weapon` comes from that engine, and a shot of its user with no
// `tech` after it is another action. The guesses (a technique's roll count, chained rolls, one target) stay only for
// events recorded before those fields (an older replay), as do the fallbacks noted at each handler (a Called Shot's
// part read from the condition it caused, Load Special's round matched by hand, the Rake's targets from its shots).
//
// Asset rule (CLAUDE.md): rings, lines, strokes, pips and words are drawn here (fx/rangedParts.ts); the one textured
// piece is the cover debris (Cethiel, CC0, credited in fx/fxCredits.ts), and the brass tinkle (Kenney, CC0, credited in
// sfxCredits.ts). Fog: every point comes through the kit's at() (null out of sight). Nothing here changes the game.
import type { FxEvent } from '@engine';
import type { Sfx } from '../sfx';
import { reducedMotion } from '../sfx';
import { type Pt, after, angle, anim, burst, centre, flash, floatText, lunge, ring, shake, shakeScreen } from './dom';
import { tagChip } from './sight';
import { DRAW_MS, brassOf, ejectShell, whoOf } from './brass';
import { physBeat, NAME_DY, NAME_RISE } from './physical';
import * as P from './rangedParts';

const { WHITE, HP, MUTED } = P;
const HOT = '#FFF3C4';
type XY = { x: number; y: number };
type Handler = (e: FxEvent) => void;

/** What play.ts lends this file (the same pieces its own shot handler uses), so nothing private there is exported. */
export interface RangedKit {
  at(k: string | null | undefined): Pt | null;
  tokOf(id: string | null | undefined, fallback?: string): HTMLElement | null;
  posOf(id: string | null | undefined): string | undefined;
  play(s: Sfx, p: Pt | null, o?: { rate?: number; gain?: number; delay?: number; lowpass?: number }): void;
  gunOf(id: string, cat: string): { sound: Sfx | null; rate?: number; look: string; color?: string; blast?: string };
  muzzle(from: Pt, to: Pt, color?: string): XY;
  projectile(a: XY, b: XY, ms: number, look: any, s: number, color?: string): void;
  missPoint(from: Pt, to: Pt): XY;
  dust(p: XY, s: number, color?: string): void;
  explosion(k: string | undefined, radius?: number, kind?: any, point?: Pt): void;
  corners(p: Pt, color: string, ms: number): void;
  /** Does the viewer's side see this unit now (play.ts seesUnit: a Hidden unit on a tile in sight is not seen)? */
  seesUnit?(id: string | null | undefined): boolean;
}
/** The kit's seesUnit, kept for the beats (a hidden actor's Bead, Heat or lost Watch holds no stage). */
let seesActor: (id: string | null | undefined) => boolean = () => true;

/** The events (or fields) this file reads that the ranged engine doesn't send yet: the list for the lead. E1–E17 are
 *  all sent now (claude/physical-2.0-B-ranged, 5b626b6; the result note's "The effects events"), so nothing is missing;
 *  the fallbacks for each stay only for replays recorded before them. */
export const EVENTS_FOR_THE_LEAD: string[] = [];
/** The events this file once asked for, now sent by the engine (kept for the tests and the note). */
export const EVENTS_SENT = ['E1', 'E1a', 'E2', 'E3', 'E4', 'E5', 'E6', 'E7', 'E8', 'E9', 'E10', 'E11', 'E12', 'E13', 'E14', 'E15', 'E16', 'E17'];

// ---------- which technique an event belongs to ----------
export interface TechRec {
  id: string; unit: string; target: string | null; tile: string | null; at: string | null;
  line: string | null; opt: any; ammo: string | null; with: string | null; group: string; hand: string;
  /** Storm's or Shift's own move was seen (a second move is another action) */
  moved: boolean;
  /** the engine marks this technique's shots with `tech` (its event carries `weapon`, E1): a shot without it isn't its */
  sure: boolean;
  /** the special round this Fire fired (Load Special's, read from the load) */
  round?: string;
  /** shots tagged to it, in order; the volleys; the objects it struck; what followed (hurts, conditions, stops…) */
  shots: FxEvent[]; volleys: FxEvent[]; objects: FxEvent[]; after: FxEvent[];
  /** how many shots it may own (a plain shot after it, the same turn, isn't its) */
  max: number;
}
/** How many rolls a technique fires at most (past these, a shot from the same unit is another action). */
const SHOTS: Record<string, number> = {
  shot: 1, aimed_shot: 1, snap_shot: 1, burst: 3, called_shot: 1, walking_fire: 3, punch_through: 1, lob: 1,
  suppress: 1, rake: 12, warning_shot: 1, flush: 1, mag_dump: 4, crossfire: 1,
  bead: 0, spot: 0, brace: 0, load_special: 0, shift: 0, vent: 0, head_down: 0,
  dead_centre: 1, pin_down: 1, rout: 1, stopping_shot: 1, storm: 1, last_round: 1,
  overwatch: 3, deny: 1, cover_me: 1, dead_to_rights: 1,
};
/** Techniques whose next event names them already (Brace's stance says BRACED; a Watch's watch_set says HOLDING …):
 *  their own name doesn't float as well. */
export const SAID_AFTER = new Set(['brace', 'overwatch', 'deny', 'cover_me', 'dead_to_rights']);
const cur = new Map<string, TechRec>();
let last: TechRec | null = null;
const tags = new WeakMap<object, TechRec | null>();
const viOf = new WeakMap<object, number>();
/** A technique's draw from the pack (E2) comes before its technique event: the draw is tagged with it when it arrives. */
const swaps = new Map<string, object>();
const OWN = new Set(['shot', 'volley', 'load', 'stance', 'heat', 'bead', 'spot', 'move', 'swap_in', 'free_reload', 'lane', 'carry']);
const FOLLOW = new Set(['object', 'hurt', 'cond', 'stopped', 'pressure', 'explode', 'shove', 'save', 'routed']);
/** Events from a technique's user that don't start another action (the rest do: a reload, a melee swing, a cast, a
 *  pickup… close the technique's record, so nothing after it in the turn is drawn as the technique's). */
const KEEP = new Set([...OWN, ...FOLLOW, 'technique', 'turn', 'watch_set', 'watch_end', 'watch_fire', 'overwatch', 'bead_end', 'momentum', 'sight', 'down', 'pile', 'miss', 'cover', 'lane_end']);
/** Techniques whose later rolls are one volley (chained): a shot that isn't chained is another action. */
const CHAINED = new Set(['burst', 'walking_fire']);
/** Techniques whose rolls all go at one target: a shot at another is another action. */
const ONE_TARGET = new Set(['mag_dump', 'overwatch', 'dead_to_rights', 'cover_me', 'deny']);
const rec = (id: string, e: any, max = SHOTS[id] ?? 1): TechRec => ({
  id, unit: String(e.unit || ''), target: e.target ?? e.targetId ?? null, tile: e.tile ?? null, at: e.at ?? e.from ?? null,
  line: e.line ?? null, opt: e.opt ?? null, ammo: e.ammo ?? null, with: e.with ?? null, group: e.group || '', hand: e.hand || 'main',
  shots: [], volleys: [], objects: [], after: [], max, moved: false, sure: e.k === 'technique' && 'weapon' in e,
});
/** Close a unit's technique: what it does next is its own action. */
function closeRec(u: string) { const r = cur.get(u); cur.delete(u); if (last && (last === r || last.unit === u)) last = null; }
/** Does this shot start another action rather than continue the technique r (fewer rolls than its most, a plain shot
 *  after it)? The engine sends no action marker yet (E1a `tech` on the shot settles it), so: past its rolls; a Burst's
 *  later rolls are chained; a Mag Dump's or a Watch's all go at one target; a Rake never rolls twice at one target. */
function endsAction(r: TechRec, e: any): boolean {
  const n = r.shots.length;
  if (n >= r.max) return true;
  if (!n) return false;
  if (CHAINED.has(r.id) && !e.chain) return true;
  const t0 = (r.shots[0] as any).target;
  if (ONE_TARGET.has(r.id) && t0 && e.target !== t0) return true;
  if (r.id === 'rake' && e.target && r.shots.some((s: any) => s.target === e.target)) return true;
  return false;
}
/** The queue computes beats on the batch's own events, but plays copies of them (playFx: { n: 0, ...e }): an event is
 *  known by its number, kind, unit, tile and id, so the copy finds the record its original was tagged with. The fight's
 *  numbering restarts with every fight: rangedBatch() forgets everything when the stream changes or its numbering goes
 *  back, so a later fight's event never finds an earlier one's. */
const canonical = new Map<string, object>();
const keyOf = (e: any) => (e.n ? e.n + '|' + e.k + '|' + (e.unit || '') + '|' + (e.at || e.to || '') + '|' + (e.target || '') + '|' + (e.id || '') : '');
function canon(e: any): any {
  const k = keyOf(e); if (!k) return e;
  const had = canonical.get(k); if (had) return had;
  canonical.set(k, e);
  if (canonical.size > 600) for (const old of [...canonical.keys()].slice(0, 200)) canonical.delete(old);
  return e;
}
/** The technique record an event belongs to (null: none), computed once per event, in the order they come. */
export function tagOf(e0: any): TechRec | null {
  if (!e0 || typeof e0 !== 'object') return null;
  const e = canon(e0);
  if (tags.has(e)) return tags.get(e) ?? null;
  let r: TechRec | null = null;
  const u = e.unit ? String(e.unit) : '';
  try {
    if (batchStart.has(e)) { cur.clear(); last = null; } // another batch: another action (the engine sends one per action)
    if (e.k === 'technique') {
      if (e.system === 'ranged' && !e.refused && u && !e.reaction) {
        r = rec(String(e.id || ''), e); cur.set(u, r); last = r;
        const sw: any = swaps.get(u); if (sw && sw.tech === r.id) tags.set(sw, r);
      } else if (u) closeRec(u);
      if (u) swaps.delete(u);
    } else if (e.k === 'watch_fire' || e.k === 'overwatch') {
      // a held shot sprung: the shots that follow from its holder are the Watch's
      if (u) { r = rec(String(e.id || 'overwatch'), { ...e, at: e.from }); r.target = e.target ?? null; cur.set(u, r); last = r; }
    } else if (e.k === 'turn') {
      if (u) cur.delete(u); last = null;
    } else if (OWN.has(e.k)) {
      r = (u && cur.get(u)) || null;
      // what of the unit's own can't be this technique's closes it (a plain load, a second volley, a walk after it)
      if (r && e.k === 'shot' && !('tech' in e) && (r.sure || endsAction(r, e))) { closeRec(u); r = null; }
      else if (r && e.k === 'volley' && (r.shots.length || (e.tech && e.tech !== r.id))) { closeRec(u); r = null; }
      else if (r && e.k === 'move' && e.unit === r.unit) { if ((r.id === 'storm' || r.id === 'shift') && !r.moved && !r.shots.length) r.moved = true; else { closeRec(u); r = null; } }
      else if (r && (e.k === 'load' && r.id !== 'load_special' || e.k === 'stance' && r.group !== 'set' || e.k === 'bead' && r.id !== 'bead' || e.k === 'spot' && r.id !== 'spot')) { closeRec(u); r = null; }
      if (e.k === 'shot' && 'tech' in e) r = e.tech ? (r && r.id === e.tech ? r : rec(String(e.tech), e)) : null; // E1a: the engine says
      if (r && e.k === 'shot') { viOf.set(e, Number.isFinite(e.vi) ? Number(e.vi) : r.shots.length); r.shots.push(e); last = r; }
      if (r && e.k === 'volley') r.volleys.push(e);
      if (r && e.k === 'free_reload') r.after.push(e); // Last Round's chip then comes from the event, once
      if (e.k === 'swap_in' && u) swaps.set(u, e);
      if (!r && e.k === 'move' && last && last.unit !== u && (last.id === 'rout')) { r = last; r.after.push(e); } // a routed unit runs
      else if (!r && u && last && last.unit !== u && (e.k === 'shot' || e.k === 'move' || e.k === 'volley')) last = null; // another unit acts: what follows is its
    } else if (FOLLOW.has(e.k)) {
      r = (e.by && cur.get(String(e.by))) || last;
      if (r) (e.k === 'object' ? r.objects : r.after).push(e);
    } else if (u && !KEEP.has(e.k)) {
      // the unit does something else (a reload, a swing, a cast): its technique is over; another unit's action ends `last`
      if (cur.has(u)) closeRec(u); else if (last && last.unit !== u) last = null;
    }
  } catch { r = null; }
  tags.set(e, r);
  return r;
}
/** Forget every technique in flight (a new fight, a fight started over, clearFx, the tests). */
export function resetRanged() { canonical.clear(); cur.clear(); swaps.clear(); last = null; hits.clear(); pstate.clear(); pending.clear(); bStream = undefined; bTop = 0; }
/** First events of a batch (a batch is one action, or several: each boundary closes what was open). */
const batchStart = new WeakSet<object>();
let bStream: string | undefined, bTop = 0;
/** play.ts queueFx calls this on every batch, before anything plays: a new stream (another fight, the area map) or a
 *  numbering that went back (the same fight started over: the engine restarts fxSeq) forgets everything; otherwise the
 *  batch's first event closes what was open. Then the batch is tagged in the engine's order, whatever order its beats
 *  are later computed or played in. */
export function rangedBatch(evs: FxEvent[], stream?: string) {
  if (!Array.isArray(evs) || !evs.length) return;
  try {
    const first: any = evs.find((e: any) => e && e.n), known = !!first && canonical.has(keyOf(first));
    if (!known && ((stream ?? '') !== (bStream ?? '') || (first && first.n <= bTop))) resetRanged();
    bStream = stream;
    for (const e of evs as any[]) if (e && e.n) bTop = Math.max(bTop, Number(e.n) || 0);
    if (!known && evs[0] && typeof evs[0] === 'object') batchStart.add(canon(evs[0]));
    for (const e of evs) tagOf(e);
  } catch { /* the effects never stop the game */ }
}

// ---------- what the screen remembers ----------
/** The last hit on each target (Crossfire draws the line from the ally who made it). */
const hits = new Map<string, { unit: string; n: number }>();
/** Each unit's last Pressure state (a Take on a Suppressed target says its cover doesn't count). */
const pstate = new Map<string, string>();
/** A special round loaded (Load Special) and not fired yet, by unit: only for a load recorded before E16 (one that
 *  carries `weapon`); the ranged engine puts `round` on the shot that fires it (E9), so nothing is kept for it. */
const pending = new Map<string, { type: string; hand: string }>();
/** Objects whose debris a shot already threw (the object event then only says the damage). */
const thrown = new WeakSet<object>();
/** Techniques whose carry (Punch Through Heavy) or rout was already drawn from its own event. */
const drawn = new WeakSet<object>();

// ---------- pure helpers (tests) ----------
/** A round fired with no attack (rules 1.12: looseRound): what it is on screen, or null for a real shot. */
export function looseKind(e: any): 'warning' | 'rout' | 'covering' | 'arc' | 'flush' | null {
  if (!e || e.k !== 'shot' || e.target) return null;
  if (e.warning) return 'warning';
  if (e.rout) return 'rout';
  if (e.covering || e.cover === true) return 'covering';
  if (e.flush) return e.object ? 'flush' : 'arc';
  return null;
}
/** Why a Watch or a Bead ended that says nothing on screen (it fired, it was replaced, the turn came round, or its holder
 *  chose to drop it: Head Down, which C's name already says). */
export const quietEnd = (why: unknown) => !why || ['replaced', 'fired', 'turn', 'head down'].includes(String(why));
/** The word a special round or arrow shows (E9 `round`, Load Special's `special`). */
export const ROUND_WORD: Record<string, string> = { armor_piercing: 'AP ROUND', armour_piercing: 'AP ROUND', hollow_point: 'HOLLOW-POINT', broadhead: 'BROADHEAD', incendiary: 'INCENDIARY', enhanced: 'ENHANCED' };
/** A Burst's step-down per later roll (2 rolls: the second at −2; 3 rolls, Auto: each −1 more). Pure. */
export const stepDown = (vi: number, rolls: number) => (vi <= 0 ? 0 : rolls >= 3 ? vi : 2);
/** The part a Called Shot struck: the engine's opt (E1), else read from what it caused (Slowed, lowered, Dazed, Prone). */
export function partOf(r: TechRec | null): 'leg' | 'arm' | 'head' | null {
  if (!r) return null;
  if (r.opt === 'leg' || r.opt === 'arm' || r.opt === 'head') return r.opt;
  for (const x of r.after) {
    if (r.target && (x.target || x.unit) !== r.target) continue; // what happened to someone else isn't the part struck
    if (x.k === 'cond') { const id = String(x.id || x.cond || ''); if (/slow/.test(id)) return 'leg'; if (/lower/.test(id)) return 'arm'; if (/daze/.test(id)) return 'head'; }
    if (x.k === 'stopped' && /prone/.test(String(x.how || ''))) return 'leg';
  }
  return null;
}
/** Tiles within r (Chebyshev, the grid's reach) of a tile key, nearest first, at most cap. Pure. */
export function tilesWithin(key: string, r: number, cap = 12): string[] {
  const [x, y] = String(key).split(',').map(Number); if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  const out: { k: string; d: number }[] = [];
  const R = Math.max(0, Math.min(4, Math.round(r) || 0));
  for (let dy = -R; dy <= R; dy++) for (let dx = -R; dx <= R; dx++) if (x + dx >= 0 && y + dy >= 0) out.push({ k: x + dx + ',' + (y + dy), d: Math.max(Math.abs(dx), Math.abs(dy)) + Math.hypot(dx, dy) * 0.01 });
  return out.sort((a, b) => a.d - b.d).slice(0, cap).map((o) => o.k);
}
/** The puff spacing for a smoke cloud of radius r: every tile at r 1, every other one beyond (each puff covers ~2.7
 *  tiles), so the cloud covers the radius box without 49 sprites. Pure. */
export const smokeStride = (r: number) => (Math.round(r) >= 2 ? 2 : 1);
/** The tiles a smoke cloud puts a puff on: a grid of stride smokeStride(r) over the whole (2r+1)² box, its edges always
 *  included, centre first. Pure. */
export function smokeTiles(key: string, r: number): string[] {
  const [x, y] = String(key).split(',').map(Number); if (!Number.isFinite(x) || !Number.isFinite(y)) return [];
  const R = Math.max(0, Math.min(4, Math.round(r) || 0)), st = smokeStride(R), offs: number[] = [];
  for (let d = -R; d <= R; d += st) offs.push(d);
  if (offs[offs.length - 1] !== R) offs.push(R);
  const out: { k: string; d: number }[] = [];
  for (const dy of offs) for (const dx of offs) if (x + dx >= 0 && y + dy >= 0) out.push({ k: x + dx + ',' + (y + dy), d: Math.hypot(dx, dy) });
  return out.sort((a, b) => a.d - b.d).map((o) => o.k);
}
/** Does this rec's shots play as one stream (Mag Dump, the 3-target Rake), one recording and chained beats? */
/** What a weapon fires, as play.ts draws it (set when the handlers are wrapped): only bullets stream, rattle and spray. */
let gunLook: (id: string, cat: string) => string = () => 'bullet';
const streams = (e: any, r: TechRec | null) => !!r && gunLook(String(e.weapon || ''), String(e.cat || '')) === 'bullet' && ((r.id === 'mag_dump' && e.cat !== 'shotgun') || (r.id === 'rake' && !r.volleys.some((v) => v.mode === 'auto')));
/** The chambered special round this shot fires (Load Special), or ''. Spends it. */
function roundOf(r: TechRec | null, e: any): string {
  if (!r || r.group !== 'fire' || !e.unit) return '';
  if (r.round) return '';
  const pd = pending.get(String(e.unit)); if (!pd || pd.hand !== (r.hand || 'main') || r.shots[0] !== canon(e)) return '';
  pending.delete(String(e.unit)); r.round = pd.type;
  return pd.type;
}
const bowDraw = (e: any) => (!e.ricochet && !reducedMotion() && brassOf(e.weapon || '', e.cat || '').bow === 'bow' ? DRAW_MS : 0);

/** The time a base shot's tracer takes (play.ts fire(): px per ms by look, clamped). */
function flightOf(a: XY | null, b: XY | null, look = 'bullet'): number {
  if (!a || !b) return 0;
  const sp = look === 'lob' ? 0.55 : look === 'arrow' ? 1.1 : look === 'rocket' ? 0.9 : 2.2;
  return Math.max(60, Math.min(look === 'lob' ? 650 : 320, Math.hypot(b.x - a.x, b.y - a.y) / sp));
}
/** How long each ranged event holds the stage (ms at Fast), or undefined to leave it to the others (physBeat, the base).
 *  A plain technique adds at most ~130 ms; Mag Dump and the Rake play shorter than today (one stream, not 4 shots). */
export function rangedBeat(e: FxEvent): number | undefined {
  if (!e || typeof e !== 'object') return undefined;
  let r: TechRec | null = null;
  try { r = tagOf(e); } catch { return undefined; }
  switch (e.k) {
    case 'technique': return r && r.id === 'snap_shot' ? (physBeat(e) ?? 120) + 60 : undefined;
    case 'shot': {
      const lk = looseKind(e);
      if (lk) {
        // no impact to wait for (the flush: its flinch); a launcher's round is slower than a bullet, and what follows
        // (the Arc's wound, the cover it breaks) waits for it to come down
        const hold = lk === 'flush' ? 270 : 260, look = gunLook(String(e.weapon || ''), String(e.cat || ''));
        return look === 'lob' || look === 'rocket' ? Math.max(hold, flightOf(centre(e.from), centre(e.to), look) + 30) : hold;
      }
      if (!r) return undefined;
      const vi = viOf.get(canon(e)) ?? 0;
      if (r.id === 'mag_dump' && streams(e, r)) return vi === 0 ? 300 : 110;
      if (r.id === 'rake' && streams(e, r)) return vi === 0 ? 260 : 170;
      if (r.id === 'punch_through' && !e.chain) return 440 + bowDraw(e);
      if (r.id === 'last_round' && !e.chain) return 520 + bowDraw(e);
      return undefined;
    }
    case 'bead': return seesActor(e.unit) ? 160 : 0;
    case 'spot': return 160;
    case 'bead_end': case 'watch_end': return quietEnd(e.why) || !seesActor(e.unit) ? 0 : 80;
    case 'heat': return seesActor(e.unit) ? 140 : 0;
    case 'watch_fire': return e.id === 'dead_to_rights' ? 300 : undefined;
    case 'lane': return 60;
    case 'lane_end': case 'routed': return 0;
    case 'save': return e.ok ? 80 : 0;
    case 'free_reload': return 80;
    case 'carry': return e.to ? 140 : undefined; // (a carried body is World Play's beat)
    case 'swap_in': return 60;
    default: return undefined;
  }
}

// ---------- the handlers ----------
/** Wrap play.ts's handlers with the ranged ones (each gets the handler it wraps as `base`), and add the new keys. */
export function wrapRanged(H: Record<string, Handler>, K: RangedKit) {
  gunLook = (id, cat) => { try { return K.gunOf(id, cat).look; } catch { return 'bullet'; } };
  if (K.seesUnit) { const f = K.seesUnit; seesActor = (id) => { try { return f(id); } catch { return true; } }; }
  const bases: Record<string, Handler> = { ...H };
  const R = rangedHandlers(K, bases);
  for (const [k, f] of Object.entries(R)) {
    const base = bases[k] || (() => {});
    H[k] = (e: FxEvent) => f(e, base);
  }
}

export function rangedHandlers(K: RangedKit, bases: Record<string, Handler>): Record<string, (e: any, base: Handler) => void> {
  const { at, tokOf, posOf, play } = K;
  const posAt = (id: string | null | undefined) => at(posOf(id));
  /** The actor's own tile, only if the viewer sees the actor (not just the tile: a Hidden unit's Watch, Bead, Heat or
   *  round never gives away where it is; the engine marks watch_set `only` for the same reason). */
  const actorAt = (e: any, k: string | null | undefined) => (seesActor(e?.unit) ? at(k) : null);
  const jit = (r = 0.06) => 1 + (Math.random() * 2 - 1) * r;
  /** The time a base shot's tracer takes (play.ts fire(): px per ms by look, clamped). */
  const flight = flightOf;
  const word = (text: string, p: Pt, color: string, dy = -0.6, o: { delay?: number; ms?: number; big?: boolean; rise?: number } = {}) => floatText(text, { x: p.x, y: p.y + dy * p.s, s: p.s }, color, { small: !o.big, big: o.big, ms: o.ms ?? 640, delay: o.delay, rise: o.rise });
  const upper = (x: unknown) => String(x || '').replace(/_/g, ' ').toUpperCase();

  /** Debris off struck cover: the burst along the shot, dust, the crack that stays, the sound by material. */
  function coverHit(key: string, ang: number, kind: string | null | undefined, big = 1, quiet = false, noDust = false) {
    const p = at(key); if (!p) return;
    const m = P.coverMaterial(kind);
    P.debris(p, ang, m.tint, big);
    if (!noDust) K.dust(p, p.s * (0.8 + 0.3 * big), m.tint);
    if (m.label === 'metal') burst('spark_burst', p, p.s * 0.7, 240, { color: '#FFD27A', from: 0.4, to: 1.1 });
    P.crack(key, p, ang);
    if (!quiet) play(m.sound, p, { rate: jit(0.1), gain: m.sound === 'el_stone' ? 0.6 : 0.9 });
  }
  /** The angle the last shot at or through a tile flew (debris goes on along it); a guess from the user otherwise. */
  const shotAngle = (r: TechRec | null, key: string): number => {
    const s = r?.shots[r.shots.length - 1] as any, a = s ? centre(s.from) : r ? centre(r.at) : null, b = centre(key);
    return a && b && (a.x !== b.x || a.y !== b.y) ? angle(a, b) : 0;
  };
  /** A special round's look on a flight and at its end (E9 round; Load Special's special). */
  function roundFx(round: string, start: XY, end: Pt, ft: number, hit: boolean) {
    if (!round || round === 'standard') return;
    const steps = 3;
    if (round === 'incendiary') for (let i = 1; i <= steps + 1; i++) { const t = i / (steps + 2); const q = { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }; burst('fireflash_' + (1 + (i % 2)), q, end.s * 0.95, 520, { from: 0.7, to: 1.1, fade: 0.25, delay: ft * t }); burst('flame', q, end.s * 0.85, 480, { color: '#FFB45A', from: 0.7, to: 1.1, fade: 0.2, delay: ft * t }); }
    else if (round === 'enhanced') for (let i = 1; i <= steps; i++) { const t = i / (steps + 1); burst('glow', { x: start.x + (end.x - start.x) * t, y: start.y + (end.y - start.y) * t }, end.s * 0.4, 260, { color: WHITE, from: 0.5, to: 1, delay: ft * t, blend: 'screen' }); }
    else if (/armou?r_piercing/.test(round)) { burst('flash_star', start, end.s * 0.4, Math.max(120, ft), { color: WHITE, from: 0.6, to: 0.8 }); P.line(start, end, { color: WHITE, width: 1.6, ms: ft + 200, draw: ft, opacity: 0.9 }); }
    after(() => {
      if (!hit) return;
      if (/armou?r_piercing/.test(round)) {
        // it goes through: a hard white streak out the far side, and a ring of sparks at the hole (live check: it read as
        // any plain hit)
        const g = Math.atan2(end.y - start.y, end.x - start.x), out = { x: end.x + Math.cos(g) * end.s * 1.1, y: end.y + Math.sin(g) * end.s * 1.1 };
        P.line(end, out, { color: WHITE, width: 2.6, ms: 300, draw: 90 });
        burst('spark_burst', end, end.s * 1.1, 300, { color: WHITE, from: 0.3, to: 1.3 });
        burst('flash_star', out, end.s * 0.55, 220, { color: '#FFD27A', from: 0.3, to: 1.1, delay: 60 });
        play('hit_metal', end, { gain: 0.5, rate: 1.35 });
      }
      else if (round === 'hollow_point' || round === 'broadhead') { burst('spark_burst_2', end, end.s * 0.9, 300, { color: '#C2272F', from: 0.5, to: 1.3 }); play('hit_heavy', end, { gain: 0.3 }); }
      else if (round === 'incendiary') { burst('flame', end, end.s * 0.9, 600, { color: '#F68A38', from: 0.5, to: 1.2 }); play('el_fire', end, { gain: 0.4 }); }
      else if (round === 'enhanced') { burst('glow', end, end.s * 1.2, 360, { color: WHITE, from: 0.4, to: 1.2, blend: 'screen' }); play('sg_sharpen', end, { gain: 0.3 }); }
      word(ROUND_WORD[round] ? ROUND_WORD[round].replace(' ROUND', '') : upper(round), end, WHITE, -0.95, { ms: 560 });
    }, ft);
  }

  /** Is a smoke cloud seen: a tile of it in sight, or a seen thrower (a Lob's user)? */
  const cloudSeen = (e: any, r: TechRec | null, tiles: string[]) => tiles.some((k) => !!at(k)) || (!!r && r.id === 'lob' && seesActor(r.unit) && !!at(posOf(r.unit)));
  /** Dirt kicked up by a round that missed on purpose (a warning shot, suppression, a covering burst): the dirt and
   *  dust sprites (credited in fxCredits.ts) in a light ground tint, big enough to read on the dark board. */
  function kick(q: XY, s: number, k = 1) {
    burst('dust', q, s * 1.05 * k, 520, { color: '#E7EBF3', from: 0.5, to: 1.15, fade: 0.3 });
    burst('dirt', { x: q.x, y: q.y - s * 0.1 }, s * 0.8 * k, 460, { color: '#E2C394', from: 0.55, to: 1.2, fade: 0.2 });
  }
  /** What a weapon's round looks like in flight, for the extra rounds drawn here (Leon, 11 Nov 2026: a grenade
   *  launcher's Suppress drew bullet tracers): a launcher's is lobbed, a tube's is a rocket, a bow's an arrow, a flamer's
   *  a gout of fire; everything else is a tracer. */
  const ownLook = (g: { look: string }) => (g.look === 'arrow' || g.look === 'lob' || g.look === 'rocket' || g.look === 'flame' ? g.look : 'bullet');
  /** Draw one such round from a to b over ms. */
  function fly(g: { look: string; color?: string }, a: XY, b: XY, ms: number, s: number) {
    const look = ownLook(g);
    if (look === 'flame') { for (let i = 0; i < 4; i++) { const t = (i + 1) / 4; burst('flame', { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t }, s * (0.5 + t * 0.5), 420, { color: '#F68A38', from: 0.4, to: 1.2, delay: i * 45, blend: 'screen' }); } return; }
    K.projectile(a, b, ms, look, s, look === 'bullet' ? g.color : undefined);
  }
  /** Where such a round comes down without hitting anyone: a charge goes off small (as a base shot's miss does), a
   *  bullet or an arrow kicks up dirt. */
  function lands(g: { look: string; blast?: string }, q: XY, s: number, k = 1) {
    if (g.blast && ownLook(g) !== 'bullet' && ownLook(g) !== 'flame') K.explosion(undefined, 0.6, g.blast, { x: q.x, y: q.y, s });
    else if (ownLook(g) === 'flame') burst('flame', q, s * 0.9, 600, { color: '#F68A38', from: 0.5, to: 1.1 });
    else kick(q, s, k);
  }
  /** The weapon a unit last fired (its shots say), for a round drawn from an event that doesn't name one. */
  const fired = new Map<string, { weapon: string; cat: string }>();
  const gunFor = (id: string | null | undefined) => { const f = id ? fired.get(String(id)) : null; return f ? K.gunOf(f.weapon, f.cat) : { look: 'bullet' }; };
  /** A round fired with no attack roll: a tracer that misses on purpose (never MISS), a covering burst, an arc, the
   *  round into the cover (Flush). */
  function loose(e: any, kind: NonNullable<ReturnType<typeof looseKind>>, r: TechRec | null) {
    const g = (e.thrown ? { sound: 'swish' as Sfx, rate: 0.8, look: 'thrown' } : K.gunOf(e.weapon || '', e.cat || '')), from = at(e.from), toP = centre(e.to);
    if (g.sound) play(g.sound, from || toP, { rate: (g.rate || 1) * jit(0.04) });
    if (!toP) return;
    const shooter = from ? tokOf(e.unit, e.from) : null;
    const mp = from && g.look !== 'lob' && g.look !== 'flame' && g.look !== 'arrow' ? K.muzzle(from, toP, g.color) : null;
    const ang = from ? angle(from, toP) : -Math.PI / 2, s = toP.s;
    if (from && shooter) { lunge(shooter, -Math.cos(ang) * 3, -Math.sin(ang) * 3, 120); const br = brassOf(e.weapon || '', e.cat || ''); if (br.when === 'shot') ejectShell(whoOf(shooter), br.shell, ang, { delay: br.cycle }); }
    const start: XY = mp || (from ? { x: from.x, y: from.y } : { x: toP.x - Math.cos(ang) * s * 3, y: toP.y - Math.sin(ang) * s * 3 });
    const look = ownLook(g), tracer = look === 'bullet';
    // the round raised the Heat to the limit: the gun jams, as the base shot says it (JAMMED, the dry click)
    if (e.jam) { const fp = from || toP; after(() => { floatText('JAMMED', fp, HP, { small: true }); play('dry_click', fp); }, flight(start, toP, look) + 120); }
    const over = (lift: number, past: number): XY => ({ x: toP.x + Math.cos(ang) * s * past, y: toP.y + Math.sin(ang) * s * past - s * lift });
    if (kind === 'warning' || kind === 'rout') {
      // over its head, a fixed side (never random): the dirt kicks up behind it
      const end = over(kind === 'rout' ? 0.5 : 0.3, 1);
      const ft = flight(start, end, look);
      fly(g, start, end, ft, s);
      if (tracer) play('whiz', toP, { delay: ft * 0.55, gain: 0.9, rate: kind === 'rout' ? 0.85 : 1 });
      after(() => lands(g, { x: end.x, y: end.y + s * 0.3 }, s), ft);
      const tp = at(e.to);
      if (tp && (e.loud || r?.line === 'loud')) after(() => ring({ x: tp.x, y: tp.y - s * 0.3, s }, WHITE, 360, { from: 0.4, to: 1.2, width: 2 }), ft * 0.6);
      // the near miss marked: a stroke over the head, drawn the way the round went, on a dark under-stroke
      if (tp) { const y = tp.y - s * (kind === 'rout' ? 0.62 : 0.55), dir = Math.cos(ang) < 0 ? -1 : 1; after(() => P.mark(P.line({ x: tp.x - dir * s * 0.4, y }, { x: tp.x + dir * s * 0.4, y }, { color: WHITE, width: 2.4, ms: 480, draw: 90, opacity: 1, under: true }), 'over'), ft * 0.5); }
      return;
    }
    if (kind === 'covering') {
      // the covering burst: three short tracers at the attacker's feet and side, dirt kicking up, its attack spoiled
      const offs: XY[] = [{ x: -0.35, y: 0.3 }, { x: 0.32, y: 0.36 }, { x: 0.45, y: -0.12 }];
      offs.forEach((o, i) => after(() => {
        const end = { x: toP.x + o.x * s, y: toP.y + o.y * s };
        const cft = flight(start, end, look) * 0.8;
        fly(g, start, end, cft, s * 0.7);
        after(() => lands(g, end, s, 0.8), tracer ? 90 : cft);
      }, i * 55));
      if (tracer) play('whiz', toP, { delay: 110, gain: 0.6, rate: 1.15 });
      const tp = at(e.to); if (tp) word('COVERED −2', tp, WHITE, 0.75, { delay: 160, rise: 0.2 }); // under the attacker: above it is the ally it went for
      return;
    }
    if (kind === 'arc') {
      // Flush Arc: the round drops over the cover onto the target (the hurt that follows says half damage)
      const ft = tracer ? Math.min(420, flight(start, toP, 'bullet') * 1.6) : flight(start, toP, look);
      P.arcPath(start, toP, Math.max(18, s * 0.6), { color: HOT, ms: ft + 160, dash: '3 3', width: 2 });
      fly(g, start, toP, ft, tracer ? s * 0.8 : s);
      after(() => K.dust(toP, s * 0.6), ft);
      return;
    }
    // Flush: the round into the cover, which bursts as it lands (the object that follows only says the damage); then the
    // target flinches away from it
    const ft = flight(start, toP, look);
    fly(g, start, toP, ft, s);
    const ob: any = r?.objects.find((o: any) => o.at === e.to) || null;
    if (ob && Number(ob.dmg) > 0) {
      thrown.add(ob);
      const big = ob.broken ? 1.5 : r?.line === 'spread' || r?.line === 'blast' ? 1.3 : 1;
      after(() => { coverHit(ob.at, ang, ob.what, big); after(() => { const q = at(ob.at); if (q) P.debris(q, ang + 0.5, P.coverMaterial(ob.what).tint, big * 0.85); }, 70); }, ft);
    }
    after(() => {
      burst('flash_star', toP, s * 1.1, 200, { color: WHITE, from: 0.4, to: 1.2 });
      const tid = r?.target, tk = posOf(tid), tp = at(tk);
      if (tp && tid) {
        const a = angle(toP, tp), tok = tokOf(tid, tk);
        lunge(tok, Math.cos(a) * s * 0.55, Math.sin(a) * s * 0.55, 200); after(() => shake(tok, 0.7), 160);
      }
    }, ft);
  }

  /** Mag Dump's stream: a tracer every ~45 ms for the magazine (cap 12), climbing and spreading, brass pouring out, the
   *  shooter juddering, then the barrel smoking and the dry click. */
  function dumpStream(e: any, r: TechRec) {
    const from = at(e.from), toP = centre(e.to); if (!from || !toP) return;
    // the rounds the magazine held (E4 volley `shots`); before E4, about three a roll
    const vol: any = r.volleys.find((v: any) => v.mode === 'dump'), loaded = Number(vol?.shots);
    const n = Math.min(12, Math.max(4, Number.isFinite(loaded) && loaded > 0 ? loaded : r.shots.length * 3)), a = angle(from, toP), s = toP.s;
    const tok = tokOf(e.unit, e.from), br = brassOf(e.weapon || '', e.cat || ''), who = tok && br.when === 'shot' ? whoOf(tok) : null;
    for (let i = 0; i < n; i++) after(() => {
      const m = i % 2 === 0 ? K.muzzle(from, toP) : { x: from.x + Math.cos(a) * s * 0.42, y: from.y + Math.sin(a) * s * 0.42 };
      const spread = s * (0.12 + 0.045 * i), climb = s * 0.03 * i;
      const end = { x: toP.x + (Math.random() - 0.5) * spread - Math.sin(a) * (Math.random() - 0.5) * spread, y: toP.y - climb + (Math.random() - 0.5) * spread };
      K.projectile(m, end, 110, 'bullet', s * 0.9);
      if (who && i % 2 === 0) ejectShell(who, br.shell, a);
    }, i * 45);
    if (tok) for (let k = 0; k < 4; k++) after(() => lunge(tok, -Math.cos(a) * 2.5, -Math.sin(a) * 2.5, 90), k * 110);
    for (let k = 0; k < 3; k++) play('brass', from, { delay: 200 + k * 170, gain: 0.55, rate: jit(0.12) });
    after(() => {
      const mp = { x: from.x + Math.cos(a) * s * 0.5, y: from.y + Math.sin(a) * s * 0.5 - s * 0.1 };
      burst('smoke_soft', mp, s * 0.9, 700, { color: MUTED, from: 0.3, to: 1.3 });
      play('dry_click', from, { gain: 0.8 });
    }, n * 45 + 80);
  }

  return {
    technique(e, base) {
      const r = tagOf(e);
      // the event right after says the name already (Brace's BRACED, a Watch's HOLDING …): said once (live check)
      if (!(r && !e.refused && SAID_AFTER.has(r.id))) base(e);
      if (!r || e.refused) return;
      const a = actorAt(e, e.at), tk = posOf(e.target), b = at(tk);
      switch (r.id) {
        case 'aimed_shot':
          if (a && b) { P.line(a, b, { width: 1.2, ms: 460, draw: 140, opacity: 0.8 }); const g = angle(a, b); burst('flash_star', { x: a.x + Math.cos(g) * a.s * 0.5, y: a.y + Math.sin(g) * a.s * 0.5 }, a.s * 0.5, 200, { color: WHITE, delay: 100, from: 0.3, to: 1 }); }
          break;
        case 'snap_shot':
          if (a) { P.speedArc(a, b ? angle(a, b) : 0); play('swish', a, { rate: 1.8, gain: 0.55 }); play('rack', a, { gain: 0.4, delay: 50, rate: 1.2 }); }
          break;
        case 'called_shot':
          if (b) { const part = partOf(r); P.reticle(P.partPoint(b, part), b.s * 0.55, { ms: 460 }); }
          break;
        case 'walking_fire': {
          const d = at(e.tile); if (a && d) P.route([a, d], { s: a.s, ms: 560 });
          break;
        }
        case 'lob': {
          // the thrower knows where it aimed: a seen thrower's arc lands on its tile even where the cloud it makes will
          // hide it (a smoke grenade: the tiles are out of sight by the time this plays)
          const d = at(e.tile) || (a && e.tile ? centre(e.tile) : null) || b;
          if (a && d) P.arcPath(a, d, Math.max(26, Math.hypot(d.x - a.x, d.y - a.y) * 0.3), { color: WHITE, ms: 560 });
          if (d && e.tile && !e.target) P.reticle(d, d.s * 0.8, { ms: 460 });
          break;
        }
        case 'crossfire': {
          const ally = r.with || (r.target ? hits.get(r.target)?.unit : null), c = ally && ally !== r.unit ? posAt(ally) : null;
          if (b && c) P.line(c, b, { width: 1.2, ms: 520, draw: 160, opacity: 0.6 });
          if (b && a) P.line(a, b, { width: 1.6, ms: 520, draw: 160 });
          if (b) after(() => P.crossX(b), 120);
          break;
        }
        case 'shift': {
          const d = at(e.tile); if (a && d) P.route([a, d], { color: MUTED, s: a.s, dash: '3 4' });
          if (a) word('UNHEARD', a, MUTED, NAME_DY, { rise: NAME_RISE });
          break;
        }
        case 'head_down': {
          const tok = tokOf(e.unit, e.at);
          if (tok && !reducedMotion()) anim(tok, [{ scale: '1', translate: '0 0' }, { scale: '.85', translate: '0 4px', offset: 0.35 }, { scale: '.85', translate: '0 4px', offset: 0.75 }, { scale: '1', translate: '0 0' }], { duration: 420, easing: 'ease-out' });
          if (a) ring(a, MUTED, 380, { from: 1.4, to: 0.7, width: 3 });
          break;
        }
        case 'dead_centre':
          if (b) { P.reticle(b, b.s * 0.9, { dot: true, lock: HP, ms: 460 }); const st = r.target ? pstate.get(r.target) : ''; if (st === 'suppressed' || st === 'broken') word('COVER IGNORED', b, MUTED, 0.75, { delay: 160 }); }
          break;
        case 'storm':
          if (a && b) P.line(a, b, { color: HP, width: 2, dash: '7 5', ms: 560 });
          if (b && tk) tagChip(tk, b, 'NO REACTION', MUTED, 760, -1.2);
          break;
        default: break;
      }
    },

    shot(e, base) {
      const r = tagOf(e), kind = looseKind(e);
      if (e.hit && e.target) hits.set(String(e.target), { unit: String(e.unit || ''), n: e.n || 0 });
      if (e.unit && e.weapon && !e.thrown) fired.set(String(e.unit), { weapon: String(e.weapon), cat: String(e.cat || '') });
      if (kind) { loose(e, kind, r); return; }
      const id = r?.id || '', vi = viOf.get(canon(e)) ?? 0;
      const from = at(e.from), toP = centre(e.to), g = (e.thrown ? { sound: 'swish' as Sfx, rate: 0.8, look: 'thrown' } : K.gunOf(e.weapon || '', e.cat || ''));
      const ft = flight(from, toP, g.look) + bowDraw(e);
      // a special round (E9; or the one Load Special put in the chamber, which only a Fire technique's first shot from
      // the hand it was loaded for fires: a plain shot, a Press, a Take or a Watch leaves it chambered, as the engine does)
      // (E9: the engine's `round` says it; a shot with `tech` and no `round` fired a standard one)
      if (e.round && e.unit) pending.delete(String(e.unit));
      const round = e.round || ('tech' in e ? '' : roundOf(r, e));
      if (round && from && toP) roundFx(String(round), from, toP, ft, !!e.hit);
      // the streams: one recording for the whole run, the later rolls silent and chained
      if (r && streams(e, r)) {
        if (vi === 0) {
          if (!r.volleys.length) bases.volley?.({ k: 'volley', n: 0, unit: e.unit, from: e.from, cat: e.cat, weapon: e.weapon, mode: 'auto' } as any);
          if (id === 'mag_dump') dumpStream(e, r);
          else {
            // the Rake's sweep over its targets (E4 `targets`, in the engine's order); before E4, its shots' targets
            const vol: any = r.volleys.find((v: any) => v.mode === 'rake'), ids: string[] = Array.isArray(vol?.targets) ? vol.targets : [];
            const pts = (ids.length ? ids.map((id) => centre(posOf(id))) : r.shots.map((x: any) => centre(x.to))).filter(Boolean) as Pt[];
            if (pts.length >= 2) P.sweep(pts, 250);
          }
        }
        base({ ...e, chain: true });
        return;
      }
      base(e);
      if (!toP) {
        return;
      }
      const tp = at(e.to);
      switch (id) {
        case 'burst': case 'walking_fire': {
          // the step-down shows: each later roll climbs (the token kicks up) and a muted −N flicks off the muzzle
          const st = stepDown(vi, r!.shots.length);
          if (st && from) {
            const a = angle(from, toP);
            word('−' + st, { x: from.x + Math.cos(a) * from.s * 0.5, y: from.y + Math.sin(a) * from.s * 0.5, s: from.s }, WHITE, 0.3, { ms: 480, rise: 0.2 });
            lunge(tokOf(e.unit, e.from), 0, -2 - vi, 110);
          }
          break;
        }
        case 'suppress': {
          // one roll, three rounds: two more crack past within half a tile, dirt at its feet
          if (!from) break;
          const a = angle(from, toP), s = toP.s, g = K.gunOf(e.weapon || '', e.cat || ''), look = g.look;
          // what goes past is what the weapon fires (Leon, 11 Nov 2026: a grenade launcher's Suppress drew bullet
          // tracers): a launcher's two more rounds are lobbed and go off small beside the target, a bow's are arrows,
          // a flamer's gout is the one the shot draws
          if (look === 'flame' || look === 'thrown') break;
          const own = ownLook(g);
          for (const [k, side] of [[0, -1], [1, 1]] as [number, number][]) after(() => {
            const end = { x: toP.x + Math.cos(a) * s * 0.9 - Math.sin(a) * side * s * 0.42, y: toP.y + Math.sin(a) * s * 0.9 + Math.cos(a) * side * s * 0.42 };
            const ft = flight(from, end, own);
            fly(g, from, end, ft, own === 'bullet' ? s * 0.8 : s);
            if (own === 'bullet' || own === 'arrow') play(own === 'arrow' ? 'swish' : 'whiz', toP, { delay: ft * 0.6, gain: 0.55, rate: k ? 0.9 : 1.12 });
            after(() => lands(g, own === 'bullet' || own === 'arrow' ? { x: toP.x + side * s * 0.42, y: toP.y + s * 0.62 } : end, s, 0.85), ft); // at its feet, below the token
          }, 50 + k * 60);
          break;
        }
        case 'called_shot':
          if (e.hit && tp) { const q = P.partPoint(tp, partOf(r)); after(() => burst('flash_star', q, tp.s * 0.6, 200, { color: WHITE, from: 0.3, to: 1.2 }), ft); }
          break;
        case 'punch_through': {
          // the round doesn't stop at the cover: it bursts the cover on the way through
          const ob: any = r!.objects[0];
          const cp = ob ? centre(ob.at) : null;
          if (ob && cp && from) {
            const frac = Math.max(0.15, Math.min(0.95, Math.hypot(cp.x - from.x, cp.y - from.y) / Math.max(1, Math.hypot(toP.x - from.x, toP.y - from.y))));
            thrown.add(ob);
            after(() => coverHit(ob.at, angle(from, toP), ob.what, ob.broken ? 1.5 : 1), ft * frac);
          }
          break;
        }
        case 'dead_centre':
          if (e.hit && tp) after(() => { burst('flash_crit', tp, tp.s * 1.6, 260, { color: WHITE, from: 0.3, to: 1.3 }); shakeScreen(0.5); }, ft);
          break;
        case 'stopping_shot':
          if (e.hit && tp && from) after(() => P.chevrons(tp, angle(from, toP), tp.s), ft);
          break;
        case 'last_round': {
          const sp = from || tp;
          if (sp) after(() => {
            play('dry_click', sp, { gain: 0.9 }); // C's float already names it: the click and the chip say what it did
            const bow = brassOf(e.weapon || '', e.cat || '').bow;
            if (e.killed && !bow && !r!.after.some((x) => x.k === 'free_reload') && from) tagChip(e.from, from, 'FREE RELOAD', WHITE, 1000, 0.9);
          }, ft + 60);
          break;
        }
        case 'lob':
          // the launcher's round or the grenade leaves a short grey trail along its arc
          if (e.object && from && !reducedMotion()) {
            const lft = flight(from, toP, 'lob'), dx = toP.x - from.x, dy = toP.y - from.y, h = Math.max(30, Math.hypot(dx, dy) * 0.35);
            for (const t of [0.25, 0.5, 0.75]) burst('smoke_soft', { x: from.x + dx * t, y: from.y + dy * t - 4 * h * t * (1 - t) }, toP.s * 0.45, 600, { color: MUTED, from: 0.4, to: 1.1, delay: lft * t });
          }
          break;
        default:
          // a ranged technique's shot whose miss the cover took: the cover throws debris (a plain Shot is today's; the base
          // already puts sparks, dust and its sound there)
          if (r && !e.hit && typeof e.cover === 'string' && from) after(() => coverHit(e.cover, angle(from, toP), null, 0.8, true, true), ft);
      }
    },

    volley(e, base) {
      tagOf(e);
      if (e.mode === 'dump' || e.mode === 'rake') base({ ...e, mode: 'auto', to: undefined }); // E4: one recording; the stream draws the rounds
      else if (e.mode === 'suppress') base({ ...e, mode: 'burst', to: undefined });
      else base(e);
      if (e.mode === 'auto' && K.gunOf(e.weapon || '', e.cat || '').look === 'bullet') { const p = at(e.from); for (let k = 0; k < 3; k++) play('brass', p, { delay: 260 + k * 180, gain: 0.5, rate: jit(0.12) }); }
    },

    object(e, base) {
      // only cover a ranged technique's round struck is ours: a melee blow on a crate, the crates in a blast, a plain
      // shot's object are the base's (and the melee lane's)
      const r = tagOf(e), p = at(e.at), ours = !!r && r.shots.length > 0 && !r.after.some((x) => x.k === 'explode');
      if (!ours) { base(e); return; }
      if (p && Number(e.dmg) > 0 && !thrown.has(canon(e))) {
        const flush = r?.id === 'flush', big = e.broken ? 1.5 : flush && (r?.line === 'spread' || r?.line === 'blast') ? 1.3 : 1;
        coverHit(e.at, shotAngle(r, e.at), e.what, big);
        if (flush) after(() => P.debris(p, shotAngle(r, e.at) + 0.5, P.coverMaterial(e.what).tint, big * 0.85), 70); // heavier: a second burst
      }
      if (p && Number(e.dmg) > 0 && !e.broken) word('COVER −' + e.dmg + (Number.isFinite(e.max) && Number.isFinite(e.hp) ? ' · ' + e.hp + '/' + e.max : ''), p, MUTED, 0.6, { delay: 120 });
      base(e);
    },

    explode(e, base) {
      const r = tagOf(e), what = String(e.what || ''), g = K.gunOf(what, ''), kind = g.blast, p = at(e.at), rad = Number(e.radius) || 1;
      // a grenade lands as what it is (smoke, a flash, the scrambler, fire); the engine sends the item's id
      if (kind && what !== 'fire' && kind !== 'frag') {
        if (kind === 'smoke') {
          // the whole radius clouds over: fewer, larger puffs spread over every tile of the box. The cloud is already in
          // the state, so its own tiles are out of sight when this plays: a cloud seen at all (a tile of it in sight, or
          // its thrower) is drawn whole (live check: only its one visible column puffed)
          const st = smokeStride(rad), tiles = smokeTiles(e.at, rad);
          const seen = cloudSeen(e, r, tiles);
          tiles.forEach((k, i) => { const q = seen ? centre(k) : null; if (q) burst('puff', q, q.s * (st > 1 ? 2.7 : 1.7), 1900, { from: 0.3, to: 1.3, fade: 0, delay: Math.min(8, i) * 50 }); });
          play('vent', p || centre(e.at), { rate: 0.75 });
        } else K.explosion(e.at, rad, kind);
      } else base(e);
      const bp = p || (kind === 'smoke' && cloudSeen(e, r, smokeTiles(e.at, rad)) ? centre(e.at) : null);
      if (bp && kind && (r?.id === 'lob' || g.look === 'lob' || g.look === 'rocket')) P.radiusBox(bp, rad, kind === 'smoke' || kind === 'flash' || kind === 'zap' ? MUTED : HP, 560);
    },

    stance(e, base) {
      base(e);
      if (e.what !== 'brace' || (e.seen && e.seen.pc === 0)) return;
      const p = at(e.at); if (!p) return;
      const tok = tokOf(e.unit, e.at);
      if (tok && !reducedMotion()) anim(tok, [{ translate: '0 0', scale: '1 1' }, { translate: '0 3px', scale: '1 .95', offset: 0.3 }, { translate: '0 3px', scale: '1 .95', offset: 0.8 }, { translate: '0 0', scale: '1 1' }], { duration: 360, easing: 'ease-out' });
      // the feet planted: two strokes below the token's HP bar, splayed out
      const y = p.y + p.s * 0.6;
      for (const sx of [-1, 1]) P.line({ x: p.x + sx * p.s * 0.1, y: y - p.s * 0.05 }, { x: p.x + sx * p.s * 0.3, y: y + p.s * 0.07 }, { width: 2.4, ms: 520, draw: 120, under: true });
      play('hit_heavy', p, { rate: 1.4, gain: 0.3 });
      const r = tagOf(e); if (r?.line === 'auto') word('SUPPRESS +1', p, WHITE, 0.55, { delay: 120 });
    },

    load(e, base) {
      base(e);
      if (!e.special) return;
      const sp = String(e.special), lr = tagOf(e);
      if (e.unit && !('weapon' in e)) pending.set(String(e.unit), { type: sp, hand: lr?.id === 'load_special' ? lr.hand : 'main' });
      const p = actorAt(e, e.at); if (!p) return;
      // the round's name on a chip under the token: above it are C's name (LOAD SPECIAL) and the base's LOAD timer ring
      tagChip(e.at, p, ROUND_WORD[sp] || upper(sp) + ' ROUND', WHITE, 640, 0.9);
      ring(p, WHITE, 420, { from: 0.5, to: 1.1, width: 2 });
    },

    heat(e) {
      const p = actorAt(e, e.at || posOf(e.unit)); if (!p) return;
      const now = Number(e.now) || 0, was = Number(e.was) || 0, lim = Number(e.limit) || Math.max(6, now, was);
      P.heatBar(p, was, now, lim, e.why === 'dump' ? 'HEAT ' + now + '/' + lim : 'HEAT ' + was + ' → ' + now, 1000);
      if (e.why === 'vent' || now < was) {
        for (let i = 0; i < 3; i++) burst('puff', { x: p.x + (i - 1) * p.s * 0.3, y: p.y - p.s * 0.62 }, p.s * 1.05, 900, { from: 0.4, to: 1.25, fade: 0.1, delay: i * 90 });
        play('vent', p, { rate: 1.15, gain: 0.7 });
      }
    },

    bead(e) {
      tagOf(e);
      const a = actorAt(e, e.at), b = at(e.to || posOf(e.target)); if (!a) return;
      if (b) { P.line(a, b, { width: 1.4, ms: 1000, draw: 220, opacity: 0.85 }); after(() => P.reticle(b, b.s * 1.05, { ms: 700 }), 160); }
      tagChip(e.at, a, 'SIGHTS HELD', WHITE, 1000, 0.9); // C's float says BEAD over the token; the chip, under it, says what it holds
      play('dry_click', a, { rate: 1.8, gain: 0.25 });
    },
    bead_end(e) {
      if (quietEnd(e.why)) return;
      const a = actorAt(e, e.at), b = posAt(e.target);
      if (a && b) P.snapLine(a, b, MUTED);
      if (a) word('BEAD LOST · ' + upper(e.why), a, MUTED, NAME_DY, { rise: NAME_RISE, ms: 900 });
    },
    spot(e) {
      tagOf(e);
      const b = at(e.to || posOf(e.target)); if (!b) return;
      P.pin(b, WHITE, !!e.hidden);
      ring(b, WHITE, 520, { from: 0.4, to: 1.3, width: 2 }); ring(b, WHITE, 520, { from: 0.4, to: 1.3, width: 2, delay: 200 });
      tagChip(e.to || posOf(e.target) || '', b, 'SPOTTED', WHITE, 1100, -1.45);
      play('sighted', b, { gain: 0.6 });
    },

    watch_set(e, base) {
      base(e);
      const p = at(e.at || posOf(e.unit)); if (!p) return;
      switch (e.id) {
        case 'overwatch': P.radar(p, 1.6, 560); break;
        case 'deny': {
          const tiles: string[] = Array.isArray(e.tiles) && e.tiles.length ? e.tiles : e.tile ? [e.tile] : [];
          tiles.forEach((k, i) => { const q = at(k); if (q) after(() => P.hatch(q, 640), i * 50); });
          const mid = at(e.tile || tiles[Math.floor(tiles.length / 2)]); if (mid) P.line(p, mid, { dash: '5 5', width: 1.6, ms: 640 });
          break;
        }
        case 'cover_me': {
          const ids: string[] = Array.isArray(e.allyIds) && e.allyIds.length ? e.allyIds : e.allyId ? [e.allyId] : [];
          for (const id of ids) { const q = posAt(id); if (!q) continue; P.line(p, q, { width: 1.6, ms: 700, draw: 200, opacity: 0.8 }); after(() => P.chevrons({ x: q.x, y: q.y - q.s * 0.55 }, -Math.PI / 2, q.s * 0.7, 520), 160); }
          break;
        }
        case 'dead_to_rights': {
          const q = posAt(e.targetId || e.target); if (!q) break;
          P.line(p, q, { color: HP, width: 1, ms: 640, draw: 160, opacity: 0.75 });
          after(() => P.reticle(q, q.s * 1.1, { ms: 600 }), 120);
          break;
        }
        default: break;
      }
    },
    watch_fire(e, base) {
      tagOf(e);
      const p = at(e.from || posOf(e.unit)), q = at(e.at || posOf(e.target));
      // the reaction snap: the holder's line to the target in a flash, before C's crosshair
      if (p && q) P.line(p, q, { width: 2.2, ms: 280, draw: 80 });
      if (p) flash(tokOf(e.unit, e.from), 'white');
      play('rack', p || q, { gain: 0.4, rate: 1.3 });
      base(e);
      if (e.id === 'dead_to_rights' && q) {
        const tok = tokOf(e.target, e.at);
        if (tok) anim(tok, [{ filter: 'grayscale(.6) brightness(1.2)' }, { filter: 'grayscale(.6) brightness(1.2)', offset: 0.8 }, { filter: 'none' }], { duration: 160 });
        word('FIRST' + (e.why ? ' · ' + upper(e.why) : ''), q, WHITE, NAME_DY, { ms: 760, rise: NAME_RISE });
      }
    },
    watch_end(e) {
      if (quietEnd(e.why)) return;
      const p = actorAt(e, e.at || posOf(e.unit)); if (!p) return;
      P.breakRing(p);
      word('WATCH LOST · ' + upper(e.why), p, MUTED, NAME_DY, { rise: NAME_RISE, ms: 900 });
    },

    stopped(e, base) {
      base(e);
      const r = tagOf(e), k = posOf(e.unit), p = at(k); if (!p) return;
      const how = String(e.how || '');
      if (/pinned/.test(how) && r && r.id === 'pin_down') {
        const nailed = !!(e.untilAp || e.nailed || r?.line === 'drawn' || r?.line === 'silent');
        after(() => { P.stakes(p, nailed); play('chop', p, { rate: 0.7, gain: 0.7 }); }, 60);
        if (nailed) word('NAILED · ' + (e.untilAp || 2) + ' AP', p, WHITE, 0.6, { delay: 140 });
      }
      // a push is only ours when Stopping Shot made it (its chevrons come with the hit, from the shot); a melee opener's
      // push is the melee lane's. The AP it costs shows only when the engine says (E15 apLoss: the number is data).
      if (/push/.test(how) && r?.id === 'stopping_shot' && Number(e.apLoss) > 0) word('−' + Number(e.apLoss) + ' AP', p, WHITE, 0.55, { delay: 140 });
    },
    pressure(e, base) {
      base(e);
      tagOf(e);
      if (e.unit && e.state) pstate.set(String(e.unit), String(e.state));
      if (e.why === 'the held lane' && e.by) {
        // the lane catches someone: one snap round from its holder
        const a = posAt(e.by), b = at(e.at || posOf(e.unit));
        const g = gunFor(e.by);
        if (a && b) { fly(g, a, b, ownLook(g) === 'bullet' ? 120 : flight(a, b, ownLook(g)), b.s * 0.8); if (ownLook(g) === 'bullet') play('whiz', b, { delay: 80, gain: 0.5 }); }
      }
    },
    hurt(e, base) {
      const r = tagOf(e);
      if (r && r.id === 'punch_through' && e.why === 'weapon' && r.target && e.target !== r.target && !drawn.has(r)) {
        // Punch Through Heavy: the round carries on from the target into the next in line (half the flash)
        drawn.add(r);
        const a = posAt(r.target), b = at(e.at);
        const g = gunFor(r.unit), ft = ownLook(g) === 'bullet' ? 110 : flight(a, b, ownLook(g));
        if (a && b) { fly(g, a, b, ft, b.s * 0.8); after(() => base(e), ft - 10); return; }
      }
      base(e);
    },
    cond(e, base) {
      base(e);
      const r = tagOf(e);
      if (r?.id !== 'called_shot' || !r.target || (e.target || e.unit) !== r.target) return;
      const p = at(e.at || posOf(e.target || e.unit)), part = partOf(r); if (!p || !part) return;
      // beside the struck point, clear of the damage number's lane above the token
      const q = P.partPoint(p, part);
      word(part.toUpperCase(), { x: p.x + p.s * 1.05, y: q.y + p.s * 0.35, s: p.s }, WHITE, 0, { delay: 60, ms: 620 });
    },
    move(e, base) {
      base(e);
      const r = tagOf(e); if (!r) return;
      const path: string[] = (e.path || [e.from, e.to]).filter(Boolean), a = at(path[0]), b = at(path[1] || path[0]);
      if (!a || !b) return;
      const ang = angle(a, b);
      if (r.id === 'storm' && e.unit === r.unit) P.streaks(a, ang, a.s);
      if (r.id === 'rout' && e.unit !== r.unit && !drawn.has(canon(e))) { P.streaks(a, ang, a.s); word('ROUTED', a, WHITE, -0.7, { ms: 700 }); }
      if (r.id === 'shift' && e.unit === r.unit) after(() => P.streaks(a, ang, a.s * 0.6, 260, MUTED), 40);
    },

    // ---------- the ranged engine's effects events (E2, E3, E5, E6, E10, E11) ----------
    save(e) {
      if (!e.ok) return;
      const r = tagOf(e), p = at(e.at || posOf(e.unit)); if (!p) return;
      word((e.tech || r?.id) === 'warning_shot' ? 'STEADY' : 'HOLDS', p, MUTED, -0.6);
    },
    lane(e) {
      tagOf(e);
      const p = at(e.at); if (!p) return;
      P.laneRing(p, Number(e.r) || 3, HP, 900);
      tagChip(e.at, p, 'LANE HELD', WHITE, 1000, -0.6);
    },
    lane_end() { /* the ring was a beat, not a standing marker: nothing to take down */ },
    free_reload(e) { tagOf(e); const p = actorAt(e, e.at || posOf(e.unit)); if (p) tagChip(e.at || posOf(e.unit) || '', p, 'FREE RELOAD', WHITE, 1000, 0.9); },
    routed(e) {
      const r = tagOf(e), a = at(e.from), b = at(e.to); if (!a) return;
      P.streaks(a, b ? angle(a, b) : 0, a.s);
      word('ROUTED', a, WHITE, -0.7, { ms: 700 });
      // its move (next) needn't say it again
      if (r) for (const x of r.after) if (x.k === 'move' && x.unit === e.unit) drawn.add(x);
    },
    carry(e, base) {
      if (!e.to) return base(e); // World Play's carry (a body lifted on the area map) is not a round carrying on
      const r = tagOf(e), a = at(e.from), b = at(e.to); if (r) drawn.add(r);
      const g = gunFor(e.unit), ft = ownLook(g) === 'bullet' ? 110 : flight(a, b, ownLook(g));
      if (a && b) fly(g, a, b, ft, b.s * 0.8);
      if (b) burst('flash_star', b, b.s * 0.6, 150, { color: WHITE, from: 0.3, to: 1, delay: ft });
    },
    swap_in(e) {
      const p = actorAt(e, e.at), tk = tagOf(e)?.target ?? cur.get(String(e.unit || ''))?.target, b = posAt(tk); if (!p) return;
      P.speedArc(p, b ? angle(p, b) : 0); play('swish', p, { rate: 1.8, gain: 0.5 }); play('rack', p, { gain: 0.4, delay: 40 });
    },
  };
}
