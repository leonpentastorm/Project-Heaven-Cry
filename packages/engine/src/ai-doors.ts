// Rules 1.83 items 7100 to 7105 (0.33, enemy doors): the enemy AI's door step. An enemy row's `doors` block (enemies.json:
// a tier's, a caster archetype's, or a tag's, `ai.tag_doors`; combat.ts armDoors reads it) gives the unit items it holds
// (Held.items: a skill's door item, a door verb, a class move) and `wants`: the item actions and prayers it weighs. Where
// it would make a plain attack (5) this step weighs each want against it, and against the technique and the Call it would
// otherwise use, and does the best one through the player's own path: an item action through runPerkAction (its price,
// its gate, its reach, its effects: the reducer's own `combat/perk`), a Whisper through combatPray (faith.ts; the unit's
// prayer sheet, Unit.sheet, stands in for a character). Nothing here decides a rule: what the action does, costs and may
// go at is the item's data, read by the doors' own code. Planning is pure (previews and the item's own target sets, never a
// roll), so the intent a player reads is what the enemy then does.
import { type Combat, type Unit, type DoorWant, alive, enemyStep, sideSees, enemyPreference, noteEnemyAim, dist } from './combat';
import { ENEMY_AI } from './data';
import { uses } from './effects/uses';
import { canPay } from './effects/cost';
import { boundGame, holderOf, ifFails } from './effects/hooks';
import { perkActionsFor, previewPerkAction, runPerkAction } from './effects/actions';
import { selectUnits, TRIGGERS, type Ev } from './effects/triggers';
import { foesOf, alliesOf } from './kit';
import { condOn } from './magic';
import { isGhost, perceivedFoes } from './illusion';
import { previewPrayer, combatPray, WHISPER } from './faith';
import { aiTechnique, PLAIN_ATTACK_SCORE } from './physical/ai';
import { aiCall } from './calls/ai';
import type { Holder } from './effects/types';

/** What the step would do: the want (by its place in Unit.wants), the target, its worth. */
interface DoorPick { i: number; w: DoorWant; score: number; target: Unit | null; label: string }
const aiUses = (cb: Combat, u: Unit) => uses({ key: 'ai', u, c: null, cb, g: undefined } as any);
const turnKey = (i: number) => 'ai:want:' + i;
/** The nested effects of a held item's action (its grant_action's own `effects`), or []. */
function actionEffects(h: Holder, action: string): any[] {
  const g = (h.info.effects || []).find((e: any) => e?.op === 'grant_action' && e.action === action);
  return Array.isArray(g?.effects) ? g.effects : [];
}
/** Would this effect change this unit (a condition it does not bear yet; anything else counts)? */
const fresh = (e: any, v: Unit): boolean => (e?.op === 'condition' && typeof e.condition === 'string' ? !condOn(v, e.condition) : true);
/** How many of the other side the action's own effects would reach, aimed at t (null: none of its effects names a set,
 * so the count is not what it is worth): each effect whose `if` holds, its `targets` read by the item ops' own selector
 * (triggers.ts selectUnits) as a preview, counting the units of the other side it would change; the widest effect counts. */
function reached(cb: Combat, h: Holder, u: Unit, effects: any[], t: Unit | null): number | null {
  let n: number | null = null;
  const ev: Ev = { ctx: { u, t }, trig: TRIGGERS.acted, h, self: u, cb, actor: u, target: t, preview: true };
  for (const e of effects) {
    if (!e?.targets || ifFails(h, e.if, t)) continue;
    const m = selectUnits(ev, e.targets).filter((v) => v.side !== u.side && fresh(e, v)).length;
    n = Math.max(n ?? 0, m);
  }
  return n;
}
/** An aimed action is worth nothing on a target every one of whose aimed effects (target: target) it would not change. */
const aimedFresh = (h: Holder, effects: any[], t: Unit): boolean => {
  const aimed = effects.filter((e) => e?.target === 'target' && !ifFails(h, e.if, t));
  return !aimed.length || aimed.some((e) => fresh(e, t));
};
/** The units an enemy would aim a want at, best first: the other side by its own preference (combat.ts enemyPreference:
 * its doctrine, its Taunter, the healer), its own side the most hurt first. */
function candidates(cb: Combat, u: Unit, side: 'foe' | 'ally'): Unit[] {
  if (side === 'foe') return enemyPreference(cb, u, perceivedFoes(cb, u).filter((v) => !isGhost(v) && alive(v) && sideSees(cb, u.side, v))).order;
  return [u, ...alliesOf(cb, u)].filter((v) => alive(v) && !v.dead).sort((a, b) => a.hp / Math.max(1, a.maxHp) - b.hp / Math.max(1, b.maxHp) || dist(u.pos, a.pos) - dist(u.pos, b.pos));
}
/** One item-action want: the best target and what it is worth, or null. */
function itemPick(cb: Combat, u: Unit, w: DoorWant, i: number): DoorPick | null {
  if (!w.item || !w.action) return null;
  const h = holderOf({ u, cb }, w.item); if (!h) return null;
  const e = perkActionsFor({ u, cb }, 'combat').find((x) => x.id === h.key && x.actionId === w.action);
  if (!e || e.why) return null;
  const effects = actionEffects(h, w.action), aimed = e.target === 'enemy' || e.target === 'ally' || e.target === 'unit';
  const pool: (Unit | null)[] = aimed ? (e.choices ? (() => { const ids = new Set(e.choices); return [...candidates(cb, u, 'foe'), ...candidates(cb, u, 'ally')].filter((v) => ids.has(v.id)); })() : candidates(cb, u, e.target === 'ally' ? 'ally' : 'foe')) : [null];
  let best: DoorPick | null = null;
  for (const t of pool) {
    if (t && w.if && ifFails(h, w.if, t)) continue;
    if (t && !aimedFresh(h, effects, t)) continue;
    const n = reached(cb, h, u, effects, t);
    if (n != null && n < (w.min ?? 1)) continue;
    const score = w.want + (w.each || 0) * (n || 0);
    if (best && score <= best.score) continue;
    const pv = previewPerkAction({ u, cb }, h.key, { actionId: w.action, ...(t ? { targetId: t.id } : {}) }, 'combat');
    if (!pv.ok || !canPay(cb, u, pv.ap)) continue;
    best = { i, w, score, target: t, label: e.label };
  }
  return best;
}
/** One prayer want (a Whisper): the best target and what it is worth, or null. */
function prayerPick(cb: Combat, u: Unit, w: DoorWant, i: number): DoorPick | null {
  if (w.pray !== 'whisper' || !w.id || !u.sheet || !WHISPER[w.id]) return null;
  const g: any = boundGame(); if (!g) return null;
  const pv0 = previewPrayer(g, u.id, 'whisper', w.id); if (pv0.why && pv0.why !== 'Pick a target.' && !pv0.targets?.length && pv0.target !== 'self' && pv0.target !== 'none') return null;
  const h = { key: 'ai:pray', info: { effects: [] } as any, u, cb, c: null, g } as unknown as Holder;
  const self = pv0.target === 'self' || pv0.target === 'none';
  const ids = new Set(pv0.targets || []), pool: Unit[] = self ? [u] : [...candidates(cb, u, 'ally'), ...candidates(cb, u, 'foe')].filter((v) => ids.has(v.id));
  for (const t of pool) {
    if (w.if && ifFails(h, w.if, t)) continue;
    const pv = previewPrayer(g, u.id, 'whisper', w.id, self ? {} : { targetId: t.id }); if (!pv.ok || !canPay(cb, u, pv.ap)) continue;
    return { i, w, score: w.want, target: self ? null : t, label: pv.name || w.id };
  }
  return null;
}
/** The door want this enemy would act on now, or null: the best want whose worth beats a plain attack, the technique and
 * the Call it would use instead (their own scores), each want at most its `per_turn` a turn. */
export function aiDoor(cb: Combat, u: Unit): DoorPick | null {
  const W = u.wants; if (!W?.length || u.side !== 'foe' || u.charId || u.companion || !alive(u) || (ENEMY_AI as any).doors?.on === false) return null;
  if (condOn(u, 'commanded')) return null;
  const A = aiUses(cb, u);
  let best: DoorPick | null = null;
  W.forEach((w, i) => {
    if (w.per_turn != null && A.used('per_turn', turnKey(i)) >= w.per_turn) return;
    const p = w.pray ? prayerPick(cb, u, w, i) : itemPick(cb, u, w, i);
    if (p && p.score > PLAIN_ATTACK_SCORE && (!best || p.score > best.score)) best = p;
  });
  if (!best) return null;
  const tech = aiTechnique(cb, u), call = aiCall(cb, u);
  if ((tech && tech.score >= (best as DoorPick).score) || (call && call.score >= (best as DoorPick).score)) return null;
  return best;
}
/** Do it through the player's own path: null (refused), or what the trigger `acted` names it, as the reducer names the
 * same action of a character (game.ts actedName: an item action's own id, a Whisper's 'whisper'), and its target. */
function actDoor(cb: Combat, rng: any, u: Unit, p: DoorPick): { action: string; t: Unit | null } | null {
  const err = p.w.pray ? combatPray(cb, rng, u, { kind: 'whisper', id: p.w.id!, ...(p.target ? { targetId: p.target.id } : {}) }, boundGame() as any)
    : runPerkAction({ u, cb }, p.w.item!, { actionId: p.w.action!, ...(p.target ? { targetId: p.target.id } : {}) }, rng, 'combat');
  if (err) return null;
  aiUses(cb, u).take('per_turn', 1, turnKey(p.i));
  if (p.target && p.target.side !== u.side) noteEnemyAim(cb, u, p.target);
  return { action: p.w.pray ? 'whisper' : p.w.action!, t: p.target };
}
enemyStep({
  plan(cb, u) { const p = aiDoor(cb, u); return p ? { text: (p.w.pray ? 'pray ' + p.label : 'use ' + p.label) + (p.target ? (p.target === u ? '' : (p.target.side === u.side ? ' for ' : ' on ') + p.target.name) : ''), ...(p.target ? { targetId: p.target.id } : {}) } : null; },
  act(cb, rng, u) { const p = aiDoor(cb, u); return (p && actDoor(cb, rng, u, p)) || false; },
}, true);
void foesOf;
