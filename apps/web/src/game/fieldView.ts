// Rules 1.55: a won Survival fight's field, for the fight screen. The engine keeps the field on the area map (the
// squad's positions and the piles in g.story, the run at state 'field'); the fight screen draws the fight's grid, so
// here the finished fight is shown with the squad and the piles where the field has them now. Display only: every
// move and pickup is a world/act the engine judges; the vote is run/leave.
import type { GameState } from '@phc/engine';
import { fieldCombat } from '@engine';

const isPile = (o: any) => o && o.kind === 'pile' && Array.isArray(o.items) && o.items.length > 0;

/** The finished fight as the field stands now (the same fight when the run is not on its field). `open`: the field is
 * walked into (rules 1.55 item 39): the engine's field as a fight state (fieldCombat: the squad where it stands, AP
 * full, no turns, what its actions run on), with the fallen enemies still lying where they fell. */
export function fieldFight<T extends { units: any[]; objects?: any[] }>(g: GameState | null | undefined, cb: T | null | undefined, open = false): T | null | undefined {
  if (!cb || !g || g.run?.state !== 'field') return cb;
  if (open) { const f: any = fieldCombat(g as any); if (f) return { ...f, units: [...f.units, ...cb.units.filter((u) => !u.charId && u.dead)] } as T; }
  const pos = g.story.positions || {};
  const units = cb.units.map((u) => (u.charId && pos[u.charId] ? { ...u, pos: pos[u.charId], dead: false } : u));
  return { ...cb, units, objects: g.story.objects || cb.objects || [] };
}

export interface FieldV { piles: number; items: number; ready: number; of: number; mine: boolean; solo: boolean; charId: string | null; takeId: string | null; isHost: boolean; waiting: string[] }
/** The field's header: what still lies on the ground, the Leave vote, and the pile my character can reach (its tile or
 * one next to it), for Take all. Null when the run is not on its field. */
export function fieldView(g: GameState | null | undefined, me: string): FieldV | null {
  const r = g?.run; if (!g || !r || r.state !== 'field') return null;
  const piles = (g.story.objects || []).filter(isPile), items = piles.reduce((t: number, o: any) => t + o.items.length, 0);
  const on = g.players.filter((p) => p.online), ready = on.filter((p) => r.ready[p.id]).length;
  const c = Object.values(g.characters).find((x) => x.owner === me && !x.dead) || null, at = c ? (g.story.positions || {})[c.id] : null;
  const near = (k: string) => { if (!at) return false; const [a, b] = at.split(',').map(Number), [x, y] = k.split(',').map(Number); return Math.max(Math.abs(a - x), Math.abs(b - y)) <= 1; };
  const take = piles.find((o: any) => o.pos === at) || piles.find((o: any) => near(o.pos)) || null;
  return { piles: piles.length, items, ready, of: on.length, mine: !!r.ready[me], solo: g.players.length <= 1, charId: c ? c.id : null, takeId: take ? (take as any).id : null,
    isHost: me === g.hostId, waiting: on.filter((p) => !r.ready[p.id]).map((p) => p.name) };
}
