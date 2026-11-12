// LIMITS AND COUNTERS (plan 2.5; engine review 1, finding F8; docs/design/handoffs/engine-foundations-2-costs.md).
// Every "once a turn / round / fight / scene / session / rest", every "the first X of the fight" and every cooldown in
// rounds is ONE cell here: uses(h).take(scope, n, key). A cell is lazily stamped: take() compares the stored stamp with
// the current one, so NOTHING EVER NEEDS RESETTING and there is no reset code to forget. The table SCOPES below is the
// whole list of reset points: when a scope is fresh again, and where its cells live.
//
//   uses(h).take('per_turn')                 once a turn for this item (false: already used; nothing spent)
//   uses(h).take('per_combat', 2, key)       twice a fight, counted under `key` (default: the item)
//   uses(h).left('per_round', 1, key)        a READ: it never writes (it does not even create the unit's empty bag)
//   uses(h).first('kill', 'per_combat')      "the first kill of the fight": true once, then false
//   uses(h).on(target).take('per_round')     a limit PER TARGET ("each enemy once a round")
//   uses(h).cool(turns, key, at?)            a cooldown in rounds: false while it runs; stamps the round `at` (default now)
//   uses(h).coolLeft(turns, key, at?)        rounds still to wait (0: ready); uses(h).ready(turns, key, at?)
//   uses(h).refund(scope, key)               give one back (a ruling that went the player's way)
//
// Never keep a round number in an item's own state and compare it with cb.round by hand: the lint
// (test/lint-costs.test.ts, F8) counts those and fails on a new one.
import type { Character } from '../character';
import type { Combat, Unit } from '../combat';
import type { Holder, UseScope } from './types';
import { boundGame } from './hooks';
import { overworld } from '../kit';

export interface UseCell { s: string; n: number }
type Home = 'unit' | 'story' | 'character';
/** THE RESET POINTS, one row a scope: when it is fresh again (the stamp it carries changes), and where its cells live.
 * In a fight: on the unit (u.uses; a unit lasts one fight, so a fight's cells die with it). On the area map units are
 * rebuilt on every action, so a turn's and a round's cells live in g.story.ps[charId].uses, and a "fight" there is no
 * window at all. Scene, session, rest and campaign cells live on the character (c.uses) and are saved with it. */
export const SCOPES: Record<UseScope, { fresh: string; fight: Home; map: Home; label: string }> = {
  at_will: { fresh: 'always', fight: 'unit', map: 'story', label: '' },
  out_of_combat: { fresh: 'always (refused in a fight)', fight: 'unit', map: 'story', label: 'out of combat' },
  per_turn: { fresh: 'the fight\'s turn pointer moves (round.turn); on the area map, a new round', fight: 'unit', map: 'story', label: 'turn' },
  per_round: { fresh: 'a new round (the fight\'s; on the area map, the story\'s)', fight: 'unit', map: 'story', label: 'round' },
  reaction: { fresh: 'a new round', fight: 'unit', map: 'story', label: 'round' },
  cooldown: { fresh: 'N rounds after the round it was stamped with (N is given by the asker)', fight: 'unit', map: 'story', label: 'cooldown' },
  per_combat: { fresh: 'a new fight (the unit is rebuilt)', fight: 'unit', map: 'story', label: 'combat' },
  per_scene: { fresh: 'the Narrator opens a new scene (g.story.scene.n)', fight: 'character', map: 'character', label: 'scene' },
  per_session: { fresh: 'a new session (g.sessionN)', fight: 'character', map: 'character', label: 'session' },
  per_rest: { fresh: 'a long rest (g.restN) or a new session', fight: 'character', map: 'character', label: 'rest' },
  per_campaign: { fresh: 'never', fight: 'character', map: 'character', label: 'campaign' },
};
const SCOPE_IDS = Object.keys(SCOPES) as UseScope[];
/** Read a data `uses` string ("per_combat", "once_per_turn", "out_of_combat"…) as a scope. */
export function scopeOf(uses: string | null | undefined): UseScope {
  const s = String(uses || 'at_will').replace(/^once_/, '').replace(/^1_/, '');
  return (s !== 'cooldown' && SCOPE_IDS.includes(s as UseScope) ? s : s === 'per_fight' ? 'per_combat' : s === 'per_day' ? 'per_rest' : 'at_will') as UseScope;
}

/** The game's session and rest counters (old saves: session 1, rest 0). */
export const sessionN = (g: any) => (g?.sessionN ?? 1);
/** The day counter (rules 1.6.1, item 709): g.day, from 1; a long rest is a day, the Narrator's turn field days adds more. Old saves: day 1. */
export const dayOf = (g: any): number => (Number.isFinite(g?.day) ? g.day : 1);
export const restN = (g: any) => (g?.restN ?? 0);
/** The round a limit counts in: the fight's, or on the area map (and in the story) the story's. */
export const roundNow = (x: { cb?: Combat | null; g?: any }): number => { const cb = x.cb; return cb && !overworld(cb) ? cb.round : (x.g ?? boundGame())?.story?.round ?? 0; };

/** The stamp a counter of this scope carries now. */
export function stampOf(scope: UseScope, x: { cb?: Combat | null; g?: any }): string {
  const g = x.g ?? boundGame(), cb = x.cb;
  switch (scope) {
    case 'per_turn': return cb && !overworld(cb) ? 't' + cb.round + '.' + cb.turn : 'w' + (g?.story?.round ?? 0);
    case 'per_round': case 'reaction': return cb && !overworld(cb) ? 'r' + cb.round : 'w' + (g?.story?.round ?? 0);
    case 'per_combat': return cb && !overworld(cb) ? 'c' : 'none';
    case 'cooldown': return 'cd'; // its cell's n is the ROUND it was stamped with (uses(h).cool)
    case 'per_scene': return 's' + (g?.story?.scene?.n ?? 0);
    case 'per_session': return 'S' + sessionN(g);
    case 'per_rest': return 'R' + sessionN(g) + '.' + restN(g);
    case 'per_campaign': return 'k';
    default: return '';
  }
}
/** Where a counter lives (the SCOPES table). create: false for a READ: nothing is made, a missing bag reads as empty. */
function cellsOf(scope: UseScope, u: Unit | null | undefined, c: Character | null | undefined, cb: Combat | null | undefined, g: any, create: boolean): Record<string, UseCell> | null {
  const bag = (o: any): Record<string, UseCell> | null => (!o ? null : create ? (o.uses ||= {}) : o.uses || null);
  const onMap = overworld(cb) || (!cb && !!g);
  if ((onMap ? SCOPES[scope].map : SCOPES[scope].fight) === 'character') return c ? bag(c) : bag(u);
  if (onMap) {
    const id = c?.id || u?.charId; if (!id || !g?.story) return bag(u);
    if (!create) return g.story.ps?.[id]?.uses || null;
    const ps = ((g.story.ps ||= {})[id] ||= {}); return (ps.uses ||= {});
  }
  return u ? bag(u) : bag(c);
}

/** Counters for one holder: left / used / take / give back, by scope and an optional key (default: the item). Reads
 * (used, left, had, coolLeft, ready, cooledAt) never write. */
export interface Uses {
  used(scope: UseScope, key?: string): number; left(scope: UseScope, n?: number, key?: string): number;
  take(scope: UseScope, n?: number, key?: string, k?: number): boolean; refund(scope: UseScope, key?: string): void;
  first(what: string, scope?: UseScope): boolean; had(what: string, scope?: UseScope): boolean; on(target: { id: string } | string): Uses;
  coolLeft(turns: number, key?: string, atRound?: number): number; ready(turns: number, key?: string, atRound?: number): boolean;
  cooledAt(key?: string): number | null; cool(turns: number, key?: string, atRound?: number): boolean; uncool(key?: string): void;
}
export function uses(h: Pick<Holder, 'key' | 'u' | 'c' | 'cb' | 'g'>): Uses {
  const g = h.g ?? boundGame();
  const at = (scope: UseScope, key: string | undefined, create: boolean) => {
    const cells = cellsOf(scope, h.u, h.c, h.cb, g, create), k = (key || h.key) + '|' + scope, s = stampOf(scope, { cb: h.cb, g });
    const hit = !!(cells && cells[k] && cells[k].s === s);
    return { cells, k, s, n: hit ? cells![k].n : 0, has: hit };
  };
  const api: Uses = {
    /** Times used in the current window of this scope. A read. */
    used: (scope: UseScope, key?: string) => at(scope, key, false).n,
    /** Uses left of n (Infinity at will). A read. */
    left: (scope: UseScope, n = 1, key?: string) => (scope === 'at_will' || scope === 'out_of_combat' ? Infinity : Math.max(0, n - at(scope, key, false).n)),
    /** Spend one (or k) use; false (nothing spent) when none is left. */
    take: (scope: UseScope, n = 1, key?: string, k = 1): boolean => {
      if (scope === 'at_will' || scope === 'out_of_combat') return true;
      const x = at(scope, key, true); if (!x.cells || x.n + k > n) return false;
      x.cells[x.k] = { s: x.s, n: x.n + k }; return true;
    },
    /** Give a use back (a refused story use, a ruling that went the player's way). */
    refund: (scope: UseScope, key?: string) => { const x = at(scope, key, false); if (x.cells && x.n > 0) x.cells[x.k] = { s: x.s, n: x.n - 1 }; },
    /** "The first <what> of the <scope>": true the first time, false after (it is taken). */
    first: (what: string, scope: UseScope = 'per_combat'): boolean => api.take(scope, 1, h.key + '#first:' + what),
    /** Has "the first <what>" already happened? A read. */
    had: (what: string, scope: UseScope = 'per_combat'): boolean => at(scope, h.key + '#first:' + what, false).n > 0,
    /** The same counters kept per target ("each enemy once a round"): uses(h).on(t).take('per_round'). */
    on: (target: { id: string } | string): Uses => uses({ ...h, key: h.key + '>' + (typeof target === 'string' ? target : target.id) }),
    // ---- cooldowns: "at most once every `turns` rounds". The cell holds the round it was last stamped with.
    /** Rounds still to wait before a cooldown of `turns` rounds is over, for something that lands in round `atRound`
     * (default: now). 0: ready. A read. */
    coolLeft: (turns: number, key?: string, atRound?: number): number => {
      const x = at('cooldown', key, false); return x.has ? Math.max(0, x.n + turns - (atRound ?? roundNow({ cb: h.cb, g }))) : 0;
    },
    ready: (turns: number, key?: string, atRound?: number): boolean => api.coolLeft(turns, key, atRound) <= 0,
    /** The round a cooldown was last started in (null: never). A read. */
    cooledAt: (key?: string): number | null => { const x = at('cooldown', key, false); return x.has ? x.n : null; },
    /** Start the cooldown (stamped with round `atRound`, default now): false, and nothing stamped, while it is running. */
    cool: (turns: number, key?: string, atRound?: number): boolean => {
      if (api.coolLeft(turns, key, atRound) > 0) return false;
      const x = at('cooldown', key, true); if (!x.cells) return true;
      x.cells[x.k] = { s: x.s, n: atRound ?? roundNow({ cb: h.cb, g }) }; return true;
    },
    /** End a cooldown now (a reset of the limits, a ruling). */
    uncool: (key?: string) => { const x = at('cooldown', key, false); if (x.cells) delete x.cells[x.k]; },
  };
  return api;
}
/** "1/combat", "2/scene"… for a card; empty at will. */
export function usesLabel(scope: UseScope, n: number, left: number): string {
  if (scope === 'at_will') return '';
  return scope === 'out_of_combat' ? 'out of combat' : left + '/' + n + ' ' + (SCOPES[scope]?.label || scope);
}
