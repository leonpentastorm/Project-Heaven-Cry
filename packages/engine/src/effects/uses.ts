// Usage counters (plan 2.5). Every counter is lazily stamped: take() compares the stored stamp with the current one,
// so nothing ever needs resetting. Fight-long and shorter counters live on the Unit (u.uses; units are rebuilt each
// fight). On the overworld, units are rebuilt on every action, so per-turn and per-round counts live in
// g.story.ps[charId] instead. Scene, session, rest and campaign counts live on the Character (c.uses).
import type { Character } from '../character';
import type { Combat, Unit } from '../combat';
import type { Holder, UseScope } from './types';
import { boundGame } from './hooks';
import { overworld } from '../kit';

export interface UseCell { s: string; n: number }
const SCOPES: UseScope[] = ['at_will', 'per_turn', 'per_round', 'per_combat', 'per_scene', 'per_session', 'per_rest', 'per_campaign', 'reaction', 'out_of_combat'];
/** Read a data `uses` string ("per_combat", "once_per_turn", "out_of_combat"…) as a scope. */
export function scopeOf(uses: string | null | undefined): UseScope {
  const s = String(uses || 'at_will').replace(/^once_/, '').replace(/^1_/, '');
  return (SCOPES.includes(s as UseScope) ? s : s === 'per_fight' ? 'per_combat' : s === 'per_day' ? 'per_rest' : 'at_will') as UseScope;
}

/** The game's session and rest counters (old saves: session 1, rest 0). */
export const sessionN = (g: any) => (g?.sessionN ?? 1);
/** The day counter (rules 1.6.1, item 709): g.day, from 1; a long rest is a day, the Narrator's turn field days adds more. Old saves: day 1. */
export const dayOf = (g: any): number => (Number.isFinite(g?.day) ? g.day : 1);
export const restN = (g: any) => (g?.restN ?? 0);

/** The stamp a counter of this scope carries now. */
export function stampOf(scope: UseScope, x: { cb?: Combat | null; g?: any }): string {
  const g = x.g ?? boundGame(), cb = x.cb;
  switch (scope) {
    case 'per_turn': return cb && !overworld(cb) ? 't' + cb.round + '.' + cb.turn : 'w' + (g?.story?.round ?? 0);
    case 'per_round': case 'reaction': return cb && !overworld(cb) ? 'r' + cb.round : 'w' + (g?.story?.round ?? 0);
    case 'per_combat': return cb && !overworld(cb) ? 'c' : 'none';
    case 'per_scene': return 's' + (g?.story?.scene?.n ?? 0);
    case 'per_session': return 'S' + sessionN(g);
    case 'per_rest': return 'R' + sessionN(g) + '.' + restN(g);
    case 'per_campaign': return 'k';
    default: return '';
  }
}
/** Where a counter lives. */
function cellsOf(scope: UseScope, u: Unit | null | undefined, c: Character | null | undefined, cb: Combat | null | undefined, g: any): Record<string, UseCell> | null {
  if (scope === 'per_scene' || scope === 'per_session' || scope === 'per_rest' || scope === 'per_campaign') return c ? (c.uses ||= {}) : u ? (u.uses ||= {}) : null;
  if (overworld(cb) || (!cb && g)) { const id = c?.id || u?.charId; if (!id || !g?.story) return u ? (u.uses ||= {}) : null; const ps = ((g.story.ps ||= {})[id] ||= {}); return (ps.uses ||= {}); }
  return u ? (u.uses ||= {}) : c ? (c.uses ||= {}) : null;
}

/** Counters for one holder: left/used/take/give back, by scope and an optional key (default: the item). */
export function uses(h: Pick<Holder, 'key' | 'u' | 'c' | 'cb' | 'g'>) {
  const g = h.g ?? boundGame();
  const at = (scope: UseScope, key?: string) => {
    const cells = cellsOf(scope, h.u, h.c, h.cb, g), k = (key || h.key) + '|' + scope, s = stampOf(scope, { cb: h.cb, g });
    return { cells, k, s, n: cells && cells[k] && cells[k].s === s ? cells[k].n : 0 };
  };
  return {
    /** Times used in the current window of this scope. */
    used: (scope: UseScope, key?: string) => at(scope, key).n,
    /** Uses left of n (Infinity at will). */
    left: (scope: UseScope, n = 1, key?: string) => (scope === 'at_will' || scope === 'out_of_combat' ? Infinity : Math.max(0, n - at(scope, key).n)),
    /** Spend one (or k) use; false (nothing spent) when none is left. */
    take: (scope: UseScope, n = 1, key?: string, k = 1): boolean => {
      if (scope === 'at_will' || scope === 'out_of_combat') return true;
      const x = at(scope, key); if (!x.cells || x.n + k > n) return false;
      x.cells[x.k] = { s: x.s, n: x.n + k }; return true;
    },
    /** Give a use back (a refused story use, a ruling that went the player's way). */
    refund: (scope: UseScope, key?: string) => { const x = at(scope, key); if (x.cells && x.n > 0) x.cells[x.k] = { s: x.s, n: x.n - 1 }; },
  };
}
/** "1/combat", "2/scene"… for a card; empty at will. */
export function usesLabel(scope: UseScope, n: number, left: number): string {
  if (scope === 'at_will') return '';
  const w = { per_turn: 'turn', per_round: 'round', reaction: 'round', per_combat: 'combat', per_scene: 'scene', per_session: 'session', per_rest: 'rest', per_campaign: 'campaign', out_of_combat: 'out of combat' }[scope] || scope;
  return scope === 'out_of_combat' ? 'out of combat' : left + '/' + n + ' ' + w;
}
