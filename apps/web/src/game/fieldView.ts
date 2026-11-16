// Rules 1.55: a won Survival fight's field, for the fight screen. Since 0.28.3 the field is the fight itself, still
// running with no enemies left (rules 1.55 item 61: g.combat with `field`): the screen draws it as any fight, and this
// is only its header: what lies on the ground, the pile my character's unit can reach (Take all is the fight's own
// pickup), and the Leave vote (run/leave). Display only: the engine judges every action.
import type { GameState, Action } from '@phc/engine';
import { sendDescriptor, active, survivalRun } from '@engine';

const isPile = (o: any) => o && o.kind === 'pile' && Array.isArray(o.items) && o.items.length > 0 && !o.hidden;

export interface FieldV { piles: number; items: number; ready: number; of: number; mine: boolean; solo: boolean; unitId: string | null; takeTile: string | null; /** Take all: the fight's pickup as its descriptor sends it (descriptors.ts), or null */ take: Action | null; isHost: boolean; waiting: string[];
  /** Rules 1.62 item 4746: "Round 1 of 3" (data/survival.json run.after_fight.field.round), '' for a field saved by 0.28.2 */ roundText: string }
/** The field's header: what still lies on the ground, the Leave vote, and the pile my character's unit can reach (its
 * tile or one next to it), for Take all. Null when the run is not on its field. A field saved by 0.28.2 (rules 1.55
 * item 66: no running fight) shows the vote alone: it is only left. */
export function fieldView(g: GameState | null | undefined, me: string): FieldV | null {
  const r = g?.run, cb: any = g?.combat; if (!g || !r || r.state !== 'field' || !cb) return null;
  const old = !cb.field, piles = old ? [] : (cb.objects || []).filter(isPile), items = piles.reduce((t: number, o: any) => t + o.items.length, 0);
  const on = g.players.filter((p) => p.online), ready = on.filter((p) => r.ready[p.id]).length;
  // rules 1.62 item 4746: the field is turns: Take all is for my unit whose turn it is
  const u0: any = old || cb.over ? null : active(cb), u = u0 && !u0.downed && u0.charId && g.characters[u0.charId]?.owner === me ? u0 : null, at: string | null = u ? u.pos : null;
  const near = (k: string) => { if (!at) return false; const [a, b] = at.split(',').map(Number), [x, y] = k.split(',').map(Number); return Math.max(Math.abs(a - x), Math.abs(b - y)) <= 1; };
  const take = piles.find((o: any) => o.pos === at) || piles.find((o: any) => near(o.pos)) || null;
  return { piles: piles.length, items, ready, of: on.length, mine: !!r.ready[me], solo: g.players.length <= 1, unitId: u ? u.id : null, takeTile: take ? take.pos : null, take: u && take ? sendDescriptor(g as any, u.id, 'pickup', { tile: take.pos }, me) : null,
    isHost: me === g.hostId, waiting: on.filter((p) => !r.ready[p.id]).map((p) => p.name), roundText: roundLabel(cb.field) };
}
/** "Round 1 of 3": the field's round now (Combat.field, the engine's count) in the data's words (survival.json
 * run.after_fight.field.round); '' without one. */
export const roundLabel = (f: any): string => (f && typeof f === 'object' ? survivalRun.after_fight.field.round.replace('{round}', String(f.round)).replace('{rounds}', String(f.of)) : '');
