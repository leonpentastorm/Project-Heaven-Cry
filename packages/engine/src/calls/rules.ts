// Calls (rules 1.13): the standing rules. What a Call left on a unit (Spot, Warn, Taunt's dearer attack, Threaten's AP
// loss, a Brief, a Cue) is read here on the fight's hooks. A preview only reads: marks are used up by a real attack
// ('attack_target', which only a resolved attack fires), a real turn start or a real action, never in 'attack_preview'.
import { type Combat, type Unit, alive, previewAttack, moveBlock, moveUnit, paths, unitSees } from '../combat';
import { onHook } from '../effects/hooks';
import { briefCredit } from '../effects/ap';
import { condSource } from '../magic';
import { CALL_RULES } from './data';

/** A mark made in round r still stands: through that round and the next, until its speaker's next turn starts
 * (cleared there); the round bound is for a speaker who never gets that turn. */
const stands = (cb: Combat, m: { r: number } | undefined | null): boolean => !!m && cb.round <= m.r + CALL_RULES.mark_rounds;
/** May this attacker use the Spot on its target now (a preview's question: nothing is used up)? */
function spotFor(cb: Combat, att: Unit, tgt: Unit) {
  const m = tgt.call?.spot; if (!m || !stands(cb, m) || att.side !== m.side || att.id === m.by) return null;
  return m.live === att.id || (m.left > 0 && !m.users.includes(att.id)) ? m : null;
}

onHook('attack_preview', (ctx: any, cb) => {
  const att: Unit = ctx.att, tgt: Unit = ctx.tgt; if (!att || !tgt || att === tgt) return;
  // Spot: the next ally (two at step 3) to attack it ignores its cover, at +1 from step 3
  const sp = spotFor(cb, att, tgt);
  if (sp) { ctx.ignoreCover = true; if (sp.hit) ctx.terms.push({ v: sp.hit, label: 'Spotted' }); }
  // Warn at step 3: the next attack on them is at −2
  const wn = tgt.call?.warn;
  if (wn && wn.hit && stands(cb, wn) && att.side !== tgt.side && (!wn.used || wn.live === att.id)) ctx.terms.push({ v: wn.hit, label: 'Warned' });
  // Taunt at steps 2 and 3: the attack on the taunter costs more
  const ta = att.call?.tauntAp;
  if (ta && ta.by === tgt.id && condSource(att, 'taunted') === tgt.id && !ctx.free) ctx.ap += ta.n;
});

/** Where a warned unit steps: the tile named when the Call was made, if it is still within reach; else the nearest
 * tile that takes it out of this attack (none: it stays). Deterministic: fewest steps, then the tile key. */
function warnStep(cb: Combat, att: Unit, tgt: Unit, mode: any, tiles: number, named?: string): string | null {
  const P = paths(cb, tgt.pos, tgt.id), ok = (k: string) => { const d = P.dist[k]; return d !== undefined && d >= 1 && d <= tiles; };
  if (named && ok(named)) return named;
  const was = tgt.pos;
  const cands = Object.keys(P.dist).filter(ok).sort((a, b) => P.dist[a] - P.dist[b] || (a < b ? -1 : a > b ? 1 : 0));
  try { for (const k of cands) { tgt.pos = k; if (!previewAttack(cb, att, tgt, mode, { free: true }).ok) return k; } } finally { tgt.pos = was; }
  return null;
}
onHook('attack_target', (ctx: any, cb) => {
  const att: Unit = ctx.att, tgt: Unit = ctx.locked || ctx.tgt; if (!att || !tgt) return;
  const first = !ctx.vi; // the first roll of an attack action (a volley's later rolls belong to the same attack)
  // Spot: this real attack uses it
  const sp = tgt.call?.spot;
  if (sp) {
    if (first) sp.live = null;
    if (first && stands(cb, sp) && att.side === sp.side && att.id !== sp.by && sp.left > 0 && !sp.users.includes(att.id)) { sp.left--; sp.users.push(att.id); sp.live = att.id; cb.log.push('(' + att.name + ' attacks the one that was Spotted: its cover doesn\'t count.)'); }
    if (!sp.left && !sp.live) delete tgt.call!.spot;
  }
  // Warn: the unit steps before this real attack on it
  const wn = tgt.call?.warn;
  if (wn && first && att.side !== tgt.side) {
    if (wn.used || !stands(cb, wn)) { delete tgt.call!.warn; return; }
    wn.used = true; wn.live = att.id;
    if (!alive(tgt) || moveBlock(tgt)) return;
    const paid = previewAttack(cb, att, tgt, ctx.mode);
    const to = warnStep(cb, att, tgt, ctx.mode, wn.tiles, wn.to); if (!to) return;
    const from = tgt.pos;
    if (moveUnit(cb, tgt, to, ctx.rng, 'move', { free: true, shortest: true, part: true }) || tgt.pos === from) return;
    cb.log.push('(' + tgt.name + ' was warned and steps clear.)');
    if (alive(tgt) && !previewAttack(cb, att, tgt, ctx.mode, { free: true }).ok) {
      ctx.cancel = true; ctx.why = tgt.name + ' was warned and is no longer there';
      if (!ctx.free && paid.ok && alive(att)) att.ap = Math.max(0, att.ap - paid.ap); // the attack was made at where they stood: its AP is spent
    }
  }
});

/** An attack action is over: a Spot nobody is using any more and a Warn that was used are gone (so a card drawn after it
 * shows what the next attack will really get). */
function settle(cb: Combat) {
  for (const v of cb.units) {
    const c = v.call; if (!c) continue;
    if (c.spot) { c.spot.live = null; if (!c.spot.left) delete c.spot; }
    if (c.warn?.used) delete c.warn;
  }
}
onHook('action_done', (_ctx: any, cb) => settle(cb));
onHook('enemy_action_start', (_ctx: any, cb) => settle(cb));

// Spot from step 2: the unit isn't Hidden to the allies who may still use the mark (and it shows to that side while
// the mark stands). combat.ts asks 'sees' when someone holds such a mark.
onHook('sees', (ctx: any, cb) => {
  const t: Unit = ctx.t; if (ctx.seen || !t?.hidden) return;
  const m = t.call?.spot; if (!m || !m.unhide || m.side !== ctx.side || !stands(cb, m)) return;
  const by: Unit | null = ctx.by || null;
  if (by ? !spotFor(cb, by, t) : !(m.left > 0 || m.live)) return;
  if (cb.units.some((u) => u.side === ctx.side && unitSees(cb, u, t.pos))) ctx.seen = true;
});

onHook('turn_start_pre', (ctx: any, cb) => {
  const u: Unit = ctx.u; if (!u) return;
  // the speaker's turn has come round: its Spot, Warn and Cue end
  for (const v of cb.units) { const c = v.call; if (!c) continue; if (c.spot?.by === u.id) delete c.spot; if (c.warn?.by === u.id) delete c.warn; if (c.cue?.by === u.id) delete c.cue; }
  for (const v of cb.units) { const c = v.call; if (!c) continue; if (c.spot && !stands(cb, c.spot)) delete c.spot; if (c.warn && !stands(cb, c.warn)) delete c.warn; if (c.cue && !stands(cb, c.cue)) delete c.cue; }
  // Threaten: the AP it loses this turn (a penalty before the floor of 2; Name It can cancel it)
  const loss = u.call?.apLoss; if (loss) { ctx.penalties.push({ n: loss.n, why: 'Threatened' }); delete u.call!.apLoss; }
});
onHook('turn_end', (ctx: any, cb) => {
  settle(cb);
  const u: Unit = ctx.u, c = u?.call; if (!c) return;
  delete c.brief; // a Brief holds until the end of the ally's next turn
  if (c.cowed) { if (c.cowed.fresh) delete c.cowed.fresh; else delete c.cowed; } // "on its next turn": that turn is over
  if (c.tauntAp && condSource(u, 'taunted') !== c.tauntAp.by) delete c.tauntAp;
});
// Cue's step 3 moved an ally up the order for one round.
onHook('round_start', (_ctx: any, cb) => {
  const keep = (cb as any).callOrder as string[] | undefined; if (!keep) return;
  delete (cb as any).callOrder;
  const now = new Set(cb.order); cb.order = [...keep.filter((id) => now.has(id)), ...cb.order.filter((id) => !keep.includes(id))];
});

// ---------- Brief: the reducer lends the discount before the action and settles it after (as Encore does) ----------
/** Before a briefed unit's action: lend the AP its Brief takes off (inside the +3 cap and the turn's 9). */
export function briefBefore(cb: Combat, u: Unit, a: { type: string }): { credit: number; before: number } | null {
  if (cb.window || a.type === 'combat/end-turn' || a.type === 'combat/decline') return null;
  const credit = briefCredit(u, cb); if (!credit) return null;
  const before = u.ap; u.ap += credit; return { credit, before };
}
/** After it: the action cost up to `credit` less; an action that cost nothing leaves the Brief for the next one. */
export function briefAfter(cb: Combat, u: Unit, x: { credit: number; before: number } | null) {
  if (!x) return;
  const spent = Math.round((x.before + x.credit - u.ap) * 10) / 10, used = Math.min(x.credit, Math.max(0, spent));
  u.ap -= x.credit - used; // what wasn't used goes back
  if (used <= 0) return;
  u.apGained = (u.apGained || 0) + used; u.apTurnTotal = (u.apTurnTotal ?? u.ap) + used; // AP from a Call counts in the turn's +3
  const b = u.call?.brief; if (b) { b.cuts.shift(); if (!b.cuts.length) delete u.call!.brief; }
  cb.log.push('  (Briefed: that cost ' + u.name + ' ' + used + ' AP less.)');
}
