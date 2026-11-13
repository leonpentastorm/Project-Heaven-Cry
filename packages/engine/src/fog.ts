// Fog of war in a player's view (engine review 4, finding 4; spec: Vision). viewFor (game.ts) sends each player only what
// their side sees: this module is the ONE place that decides what a view of a fight may hold. The client draws what it
// is given and never filters by sight itself (apps/web/src/game/boundary.test.ts holds it to that).
//
// What it does, for the viewer's side (`me`), from the side's sight now (visibility):
//   - units: a living hostile the side doesn't see is absent. One the side senses (Sensory) is a tile in `fog.sensed`,
//     with no id, name, HP or intent. Its place in the turn order is an opaque '?N' (the turn bar shows "Unseen hostile").
//   - every other reference to an unseen unit (another unit's grapple, a glyph's drawer, a field's caster, a counter keyed
//     by its id) is the token '?' (UNSEEN), or dropped where it is a key.
//   - the other side's glyphs, traces and False Images show only on tiles the side sees; its zones only on the tiles of
//     them the side sees. A False Image of an unseen owner carries `look` (the face it wears), not its owner's id.
//   - fx: a hostile's walk is cut to the part the side saw (plus the one fog-edge tile each way the client walks it in
//     from and out to); a walk never seen is dropped. An event that names an unseen unit has that id as '?', that unit's
//     name as 'Unseen hostile', and every tile the side doesn't see as null. HP stamps of unseen units are dropped.
//   - `fog`: the tiles the side sees and the tiles where it senses something, for the client's shading.
//   - log: each line carries, from when it was written (say(), log.ts: cb.logSee), whether this side saw the units it
//     names. A line about none the side saw is not sent; one that also names a unit the side saw (its own, say) is sent
//     with each unseen unit's name as 'something unseen'. The fx's L (lines before it) counts the lines sent. A line with
//     no mark (it names nobody, an old save) is sent as it is.
import { visibility, type Combat, type FxEvent, type LogMark, type Unit } from './combat';
import { bindGame } from './effects/hooks';

type Side = 'pc' | 'foe';
/** An unseen unit, wherever a view would have named it. */
export const UNSEEN = '?';
/** An unseen unit's name, wherever a view's fx would have said it. */
export const UNSEEN_NAME = 'Unseen hostile';
/** An unseen unit's name, wherever a log line sent to a player would have said it. */
export const UNSEEN_LOG = 'something unseen';
/** An unseen unit's tile, wherever a log line sent to a player would have said it. */
export const UNSEEN_TILE = 'somewhere unseen';
const escRe = (x: string) => x.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The log as one side may read it: the lines it may read (unseen names replaced), and for each old line count the
 * number of lines kept before it (keptBefore[i]), so an fx's L can be moved. */
export function fogLog(log: string[], marks: LogMark[] | undefined, me: Side): { log: string[]; keptBefore: (i: number) => number } {
  if (!marks || !marks.length) return { log, keptBefore: (i) => i };
  const out: string[] = [], before: number[] = [];
  for (let i = 0; i < log.length; i++) {
    before.push(out.length);
    const m = marks[i], s = m ? m[me] : undefined;
    if (s === undefined) { out.push(log[i]); continue; }
    if (s === 0) continue;
    let line = log[i];
    const swap = (list: string[] | undefined, by: string, word: string) => { for (const n of [...(list || [])].sort((a, b) => b.length - a.length)) line = line.replace(new RegExp('(^|[^' + word + '])' + escRe(n) + '(?![' + word + '])', 'g'), (_x, a) => a + by); };
    swap(s.n, UNSEEN_LOG, '\\w'); swap(s.t, UNSEEN_TILE, '\\w,');
    out.push(line.replace(/^something unseen/, 'Something unseen'));
  }
  before.push(out.length);
  return { log: out, keptBefore: (i) => before[Math.max(0, Math.min(i, before.length - 1))] };
}
/** An unseen unit's place in the turn order ('?3': the fourth in the order). */
export const isUnseenId = (id: unknown): boolean => typeof id === 'string' && id.startsWith(UNSEEN);
/** What the viewer's side sees, as the view carries it (cb.fog). full: the viewer is the human Narrator, who is sent
 *  everything; tiles and sensed are still the players' side's, for shading. */
export interface FightFog { tiles: string[]; sensed: string[]; full?: boolean }
/** The sight a screen draws with: the view's own (cb.fog). A fight with none (the area map's throwaway fight, a test's
 *  hand-made fight) is worked out here, for the players' side, so a screen never computes sight itself. */
export function fightSight(cb: Combat): { tiles: Set<string>; sensed: Set<string>; full: boolean } {
  const f = (cb as Combat & { fog?: FightFog }).fog;
  if (f) return { tiles: new Set(f.tiles), sensed: new Set(f.sensed), full: !!f.full };
  const v = visibility(cb, 'pc'), at = new Map(cb.units.map((u) => [u.id, u.pos]));
  return { tiles: v.tiles, sensed: new Set([...v.sensed].map((id) => at.get(id)!).filter(Boolean)), full: false };
}

const TILE = /^-?\d+,-?\d+$/;
interface Ctx { hid: Map<string, Unit>; names: Set<string>; tiles: Set<string> }
/** Does x (deeply) name an unseen unit, as a value? */
function names(x: unknown, c: Ctx): boolean {
  if (typeof x === 'string') return c.hid.has(x);
  if (Array.isArray(x)) return x.some((y) => names(y, c));
  if (x && typeof x === 'object') return Object.values(x).some((y) => names(y, c));
  return false;
}
/** x with every unseen unit's id as '?' and every key that is one dropped; with o.near, also its name as 'Unseen hostile'
 *  and every tile the side doesn't see as null (dropped from a list). A copy where anything changed. */
function scrub<T>(x: T, c: Ctx, o: { near?: boolean } = {}): T {
  const one = (v: unknown): unknown => {
    if (typeof v === 'string') return c.hid.has(v) ? UNSEEN : o.near && c.names.has(v) ? UNSEEN_NAME : o.near && TILE.test(v) && !c.tiles.has(v) ? null : v;
    if (Array.isArray(v)) { const m = v.map(one); return m.every((y, i) => y === v[i]) ? v : m.filter((y, i) => !(y === null && typeof v[i] === 'string')); }
    if (v && typeof v === 'object') {
      let out: Record<string, unknown> | null = null;
      for (const [k, y] of Object.entries(v)) {
        if (c.hid.has(k)) { out ||= { ...v }; delete out[k]; continue; }
        const z = one(y); if (z !== y) { out ||= { ...v }; out[k] = z; }
      }
      return out || v;
    }
    return v;
  };
  return one(x) as T;
}

/** One fx event as the side may see it, or null. */
function fogFx(e: FxEvent, me: Side, own: Set<string>, c: Ctx): FxEvent | null {
  const x = e as FxEvent & { path?: string[]; sight?: Record<string, string>; seen?: Record<string, number>; hp?: Record<string, unknown> };
  let out: FxEvent = x;
  if (x.hp && Object.keys(x.hp).some((id) => c.hid.has(id))) { const hp = Object.fromEntries(Object.entries(x.hp).filter(([id]) => !c.hid.has(id))); out = { ...out, hp }; if (!Object.keys(hp).length) delete (out as any).hp; }
  // A hostile's walk: the part this side saw, with the fog-edge tile each way (the client walks it in and out there).
  if (x.k === 'move' && x.unit && !own.has(String(x.unit))) {
    const path = (x.path || [x.from, x.to]).filter(Boolean) as string[], s = x.sight?.[me];
    if (typeof s !== 'string' || s.length !== path.length) return c.hid.has(String(x.unit)) ? null : out;
    const first = s.indexOf('1'), last = s.lastIndexOf('1'); if (first < 0) return null;
    const a = Math.max(0, first - 1), b = Math.min(path.length - 1, last + 1), p = path.slice(a, b + 1);
    const { unit, ...rest } = out as any;
    return { ...scrub(rest, c, { near: true }), unit, path: p, from: p[0], to: p[p.length - 1], sight: { [me]: s.slice(a, b + 1) } } as FxEvent;
  }
  // A unit coming into or going out of this side's sight: this side saw it there (sightFx: `only` this side).
  if (x.k === 'sight') return out;
  // A turn's ring or a stance's word this side didn't see happen: not where it was.
  if ((x.k === 'turn' || x.k === 'stance') && x.seen && x.seen[me] === 0) out = { ...out, at: null } as FxEvent;
  return names(out, c) ? scrub(out, c, { near: true }) : out;
}

/**
 * The fight as the viewer's side may know it (see the top of this file). real: the whole fight; view: viewFor's copy
 * of it so far (the other filters already applied). g: the game, bound while sight is worked out (the 'sees' hooks).
 * full: the human Narrator: everything stays; only `fog` is added (the players' side's sight, for shading).
 */
export function fogFight(g: unknown, real: Combat, view: Combat, me: Side, full = false): Combat {
  // Sight is asked on a copy of the units: a read must never leave a mark on the host's live fight.
  const probe = { ...real, units: real.units.map((u) => ({ ...u })) } as Combat;
  const was = bindGame(g); let vis: ReturnType<typeof visibility>;
  try { vis = visibility(probe, me); } finally { bindGame(was); }
  const posOf = new Map(real.units.map((u) => [u.id, u.pos]));
  const fog: FightFog = { tiles: [...vis.tiles], sensed: [...new Set([...vis.sensed].map((id) => posOf.get(id)!).filter(Boolean))] };
  if (full) { const { logSee: _all, ...whole } = view; return { ...whole, fog: { ...fog, full: true } } as Combat; }
  const hid = new Map(real.units.filter((u) => u.side !== me && !u.dead && !vis.seen.has(u.id)).map((u) => [u.id, u]));
  const seenNames = new Set(real.units.filter((u) => !hid.has(u.id)).map((u) => u.name));
  const c: Ctx = { hid, names: new Set([...hid.values()].map((u) => u.name).filter((n) => !!n && !seenNames.has(n))), tiles: vis.tiles };
  const own = new Set(real.units.filter((u) => u.side === me).map((u) => u.id));
  const { units, order, fx, glyphs, traces, zones, images, sightWas, lastSeen, seenAt, sightPos, log, logSee, ...rest } = view as Combat & { sightPos?: unknown };
  const lg = fogLog(log || [], logSee, me);
  const mine = (x: { side?: string }) => x.side === me;
  const out = {
    ...scrub(rest, c),
    units: units.filter((u) => !hid.has(u.id)).map((u) => scrub(u, c)),
    order: order.map((id, i) => (hid.has(id) ? UNSEEN + i : id)),
    log: lg.log,
    fx: (fx || []).map((e) => fogFx(e, me, own, c)).filter((e): e is FxEvent => !!e).map((e) => (typeof e.L === 'number' && lg.log !== log ? { ...e, L: lg.keptBefore(e.L) } : e)),
    ...(glyphs ? { glyphs: glyphs.filter((x) => mine(x) || vis.tiles.has(x.pos)).map((x) => scrub(x, c, { near: !mine(x) })) } : {}),
    ...(traces ? { traces: traces.filter((x) => mine(x) || vis.tiles.has(x.pos)).map((x) => scrub(x, c, { near: !mine(x) })) } : {}),
    ...(zones ? { zones: zones.map((z) => (mine(z) ? scrub(z, c) : { ...scrub(z, c, { near: true }), tiles: z.tiles.filter((k) => vis.tiles.has(k)) })).filter((z) => z.tiles.length) } : {}),
    ...(images ? { images: images.filter((i) => mine(i) || vis.tiles.has(i.pos)).map((i) => {
      const o = hid.get(i.owner); if (!o) return scrub(i, c);
      return { ...scrub(i, c), owner: UNSEEN, look: { name: o.name, short: (o as any).short, img: (o as any).img, kind: (o as any).kind, side: o.side } };
    }) } : {}),
    fog,
  };
  return out as unknown as Combat;
}
