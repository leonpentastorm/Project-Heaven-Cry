// The engine's one dry run (engine review 4, finding 2). A screen that wants to know what something WOULD do asks here:
// the engine makes its own copy of the fight, binds the game for the items' handlers, applies the fog for the side that
// is looking, runs the thing and throws the copy away. The live state is never written (test/preview.test.ts compares
// it before and after, deeply).
//
//   dryRun(g, cb, unitId, (cb, u, rng) => shove(cb, rng, u, t))    an engine action tried on a copy: its refusal, the
//                                                                  unit afterwards, the AP it spent
//   previewAction(g, action, by)                                   the same through the reducer itself: the whole
//                                                                  action as a player's click would run it
//   preview(g, cb, (cb, g, rng) => …)                              anything else that may write: on the copy
//   withGame(g, () => perkActionsFor(…))                           a read-only question: the game bound, nothing copied
//   fightSeenBy(cb, side)                                          the fight as a side sees it (units out of sight absent)
//   previewSeenBy(cb, side, run, fields)                           a preview's verdict from the whole fight, and
//                                                                  everything that tells of units from what the side sees
//   fightWith(cb, mods)                                            the fight with an action's switches set, for a preview
//
// What a client must never do again: copy a fight by hand, call bindGame, set cb.mods, or hide units from a preview by
// their ids or names. A lint test (apps/web/src/game/boundary.test.ts) fails when one comes back.
import type { Combat, Unit } from './combat';
import { visibility } from './combat';
import type { Rng } from './rng';
import { bindGame } from './effects/hooks';
import { apply, RuleError, type Action, type GameState } from './game';

type Side = 'pc' | 'foe';
const clone = <T>(v: T): T => {
  if (v == null || typeof v !== 'object') return v;
  const sc: (<X>(x: X) => X) | undefined = (globalThis as any).structuredClone;
  if (!sc) return JSON.parse(JSON.stringify(v));
  try { return sc(v); } catch { return JSON.parse(JSON.stringify(v)); } // a view may carry something a structured clone refuses: the plain copy then
};

/** Ask the engine a read-only question with the game bound (items' handlers see the live character and the counters).
 * For lists and labels only: anything that may write goes through preview() or dryRun(). */
export function withGame<T>(g: any, fn: () => T): T {
  const was = bindGame(g || null);
  try { return fn(); } finally { bindGame(was); }
}

/** A throwaway copy of the fight, with nothing in its log, notes or effects (a dry run's own lines are its own). */
export function copyFight(cb: Combat, o: { mods?: string[] | null } = {}): Combat {
  const c: Combat = clone({ ...cb, log: [], notes: [], fx: [] } as Combat);
  if (o.mods) c.mods = [...o.mods]; else delete c.mods;
  return c;
}
/** The game a dry run's handlers see: its own characters, counters and dice, and the copied fight. The story's entries
 * and the campaign are shared (never written by an action's handlers; copying them on every preview would cost more
 * than everything else together). */
export function shadowGame(g: any, cb: Combat | null): any {
  if (!g) return g;
  const story = g.story ? { ...clone({ ...g.story, entries: undefined, journal: undefined }), entries: (g.story.entries || []).slice(), journal: (g.story.journal || []).slice() } : g.story;
  return { ...g, rng: g.rng ? { ...g.rng } : { state: 1 }, characters: clone(g.characters || {}), story, ...(g.narrator ? { narrator: { ...g.narrator } } : {}), ...(cb && g.combat ? { combat: cb } : {}) };
}

export interface PreviewOpts {
  /** The side that is looking: units it can't see are not in the copy (nothing of them can be marked, counted or named). */
  viewer?: Side | null;
  /** The switches set on the action being previewed (Ricochet, Heart Surge…), as the click would carry them. */
  mods?: string[] | null;
}
/** Run fn on a throwaway copy of the fight, with a shadow of the game bound. What fn returns is the preview; the live
 * fight and game are untouched. rng is the copy's own (a preview's roll never moves the real dice). */
export function preview<T>(g: any, cb: Combat, fn: (cb: Combat, g: any, rng: Rng) => T, o: PreviewOpts = {}): T {
  const seen = o.viewer ? fightSeenBy(cb, o.viewer) : cb, c = copyFight(seen, o), sg = shadowGame(g, c);
  const was = bindGame(sg || null);
  try { return fn(c, sg, sg?.rng || { state: 1 }); } finally { bindGame(was); }
}

export interface DryRun { /** the engine's refusal in plain words, or null: it would go through */ err: string | null;
  /** the unit on the copy, as the action left it (null: no such unit) */ u: Unit | null;
  /** the copy the action ran on */ cb: Combat;
  /** the AP the action took from the unit (0 when refused) */ ap: number }
/** Try an engine action on a throwaway copy: the engine's own refusal (or null), the unit afterwards and the AP it paid.
 * How a screen learns a cost or a reason without working out a rule. */
export function dryRun(g: any, cb: Combat, unitId: string, fn: (cb: Combat, u: Unit, rng: Rng, g: any) => string | null | undefined, o: PreviewOpts = {}): DryRun {
  return preview(g, cb, (c, sg, rng) => {
    const u = c.units.find((x) => x.id === unitId) || null, ap0 = u ? u.ap : 0;
    let err: string | null = null;
    try { err = u ? fn(c, u, rng, sg) || null : 'No unit.'; } catch (e: any) { err = String((e && e.message) || e); }
    return { err, u, cb: c, ap: err || !u ? 0 : Math.max(0, Math.round((ap0 - u.ap) * 100) / 100) };
  }, o);
}

export interface ActionVerdict { ok: boolean; /** the reducer's refusal, in its own words */ why: string | null;
  /** AP the acting unit paid (after anything lent to it: Encore, a Brief) */ ap: number;
  /** the game after the action (a copy), when it went through */ g: GameState | null }
/** A whole action as a click would run it, through the reducer on a copy (apply() copies the game itself): every gate
 * the reducer has (whose turn, the unit's fixed action list, the switches, Encore's lend) is in the verdict. It copies
 * the whole game, so ask it for the action a player has picked, not for every tile of a map. */
export function previewAction(g: GameState, action: Action, by: string): ActionVerdict {
  const uid = (action as any).unitId, apOf = (x: GameState) => x.combat?.units.find((u) => u.id === uid)?.ap ?? 0;
  try { const after = apply(g, action, by); return { ok: true, why: null, ap: Math.max(0, Math.round((apOf(g) - apOf(after)) * 100) / 100), g: after }; }
  catch (e: any) { if (e instanceof RuleError) return { ok: false, why: e.message, ap: 0, g: null }; throw e; }
}

/** The fight as a side sees it: living units out of its sight are absent (the dead stay: a body is no secret). The same
 * object when nothing is hidden from that side. A shallow view: nothing in it may be written. */
export function fightSeenBy(cb: Combat, side: Side): Combat {
  const seen = visibility(cb, side).seen, keep = (u: Unit) => u.side === side || u.dead || seen.has(u.id);
  return cb.units.every(keep) ? cb : { ...cb, units: cb.units.filter(keep) };
}
/** A preview for a viewer. The verdict (whether it can be done, why not, what it costs: everything not named in
 * `fields`) is the whole fight's. The fields that mark, count or name units are worked out on the fight as the side sees
 * it, so a unit in the fog is never told of: not by id, not by name, not by a count. */
export function previewSeenBy<T extends object>(cb: Combat, side: Side, run: (cb: Combat) => T, fields: (keyof T)[], /** the whole fight's preview, when the caller already has it */ whole?: T): T {
  const real = whole ?? run(cb), seen = fightSeenBy(cb, side);
  if (seen === cb || !real) return real;
  const shown = run(seen), out: any = { ...real };
  for (const f of fields) out[f] = shown ? (shown as any)[f] : Array.isArray((real as any)[f]) ? [] : undefined;
  return out;
}
/** The fight with an action's switches set on it, for a preview that reads them (cb.mods). A copy of the top level:
 * the fight a screen holds is never written. */
export const fightWith = (cb: Combat, mods: string[] | null | undefined): Combat => (mods ? { ...cb, mods: [...mods] } : cb);
