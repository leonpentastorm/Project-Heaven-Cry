// @ts-nocheck (a measuring tool, like the rest of test/balance)
// THE DOORS' POLICIES (0.30 party fit, docs/design/proposals/2026-11-party-fit.md section 2). How a sensible player of
// each door plays its turn in a Survival fight. Like every policy (policies.ts header) each answers ONE action for the
// real reducer, decided from the engine's own previews (previewPerkAction, previewAttack, techniquePad, hideBlock),
// never a die. What each does, and what it never does:
//
//   bulwark     the tank policy (attack, the last AP kept for the Guard technique or Brace) and its door's verbs: with an
//               ally, it first walks beside the ally it can reach that is lowest on HP (Close Guard then answers for
//               that ally by itself), once a turn; Challenge (1 Guard) once a turn when it has an ally and a foe it sees
//               is in reach; Slam (2 Guard) once a turn when a foe that is not a Boss stands next to it and a plate is
//               left after. Never Draw Fire, Interpose by choice, or Retort by choice (Answers fire by themselves).
//   breaker     the optimised policy (best expected damage for its AP among the plain blow and the ready techniques),
//               with the Finisher held until Momentum is 3 or more (or full), so the chain is built first. Never Launch,
//               Shove or Lunge's class form by choice.
//   skirmisher  the gunner policy (Brace, Bead, the best shot or technique per AP, Vent); Pressure goes on by its hits
//               by itself; with an AP left and a foe that sees it, Slide (to cover, sheds its own Pressure), once a
//               turn. Never Overwatch, Suppress by choice, Flush or Fire Discipline.
//   operative   Shadow: seen, it looks for a tile within its AP where no foe sees it (the engine's hideBlock on that
//               tile) and walks there, then Hides; Hidden with Shadow, it Tags the target first when it can still pay
//               the shot after, then shoots with Break (all its Shadow on one shot); Hidden with no Shadow and AP for
//               one shot only, it waits Hidden (+1 Shadow at the turn's end); else the gunner. Ghost Kill fires by
//               itself. Never Lift, Fade, the Work and Slip verbs, Vanish or Mark.
//   sigilist    the run's Sigil policy (sigilRun, run-policies.ts).
//   rigger      the run's Figments policy (rigger, run-policies.ts): Picture a Beast and a Wall, orders to strike or
//               close, the core swapped; and Cash in a Figment the fight no longer needs (no foe left within its
//               reach of 3 tiles of it while the owner is hurt under half). Never Redraw or Glimmer.
//   mender      Bonds and Tending: Bond every ally it sees (allies first), then the nearest foe that is not a machine
//               while Bonds are free; Mend an ally (or itself: Mend Self) under 60% of max HP, the lowest first; Tug a
//               Bonded ally that is Downed or under 30% toward itself; Snap a Bonded foe (once a turn: Soul damage and
//               Dazed); else the gun. Never Touch, Settle, Soothe, Shield, Raise or Guide, never Snaps an ally.
//   (every one: reloads tactical, run-policies.ts tactical)
//   channeler   the run's Outburst policy (outburstRun: Begin, Pump with the best feeling, Release at the stage that
//               drops a foe).
//   chaplain    prayer-led (policies.ts prayer): the Canticle first each turn (once it is a Chaplain), the highest Hymn
//               within standing that deals damage, Rebuke, then the weapon. Never the Miracle (stage 1 has none),
//               never Ward or Smite, never asks above its Devotion.
//   monk        the optimised policy with the Open Hand: once a turn its opening blow carries Sweep (Prone) on a foe
//               that is not Prone and not a Boss, when the AP still pays two plain blows after; Breath (1 AP) once a
//               turn with an AP left that buys no blow. Never Jab, Palm or Snatch, never a Flurry with a form (the
//               rules forbid it). (A first version put a form on every blow: 3% clears against 68% plain; a strawman.)
import { previewPerkAction, previewAttack, techniquePad, TECHNIQUE, WEAPON, isMelee, dist, bindGame, paths, apForTiles, hideBlock, figmentsOf } from '../../src';
import { POLICIES, optimised, tank, gunner, prayer, plainCands, techCands, best, fixOrMove, type Policy, type Ctx, type Step } from './policies';
import { sigilRun, outburstRun, rigger, tactical } from './run-policies';

const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const ok = (x: Ctx, s: Step | null) => (s && !x.banned.has(JSON.stringify(s.action)) ? s : null);
/** A door verb (combat/perk), when the engine's own preview accepts it for these arguments and the AP is there. */
export function verb(x: Ctx, id: string, actionId: string | undefined, args: any = {}, label = actionId || id): Step | null {
  let pv: any; try { pv = W(x.g, () => previewPerkAction({ u: x.u, c: x.c, cb: x.cb, g: x.g }, id, { ...(actionId ? { actionId } : {}), ...args }, 'combat')); } catch { return null; }
  if (!pv?.ok || (pv.ap ?? 0) > x.u.ap) return null;
  return ok(x, { action: { type: 'combat/perk', id, ...(actionId ? { actionId } : {}), ...args }, kind: 'other', label });
}
const once = (x: Ctx, k: string) => { const s = x.cb.round + ':' + k; if (x.memo['once:' + k] === s) return false; x.memo['once:' + k] = s; return true; };
const res = (u: any, r: string) => u.res?.[r] ?? 0;

// ---------------------------------------------------------------------------------------------- Bulwark
export const bulwark: Policy = (x) => {
  const u = x.u;
  if (x.allies.length && x.memo.bodyBlock !== x.cb.round) {
    x.memo.bodyBlock = x.cb.round;
    const near = x.allies.some((a) => dist(a.pos, u.pos) <= 1);
    if (!near && u.ap >= 3) {
      const ally = [...x.allies].sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp)[0];
      const P = W(x.g, () => paths(x.cb, u.pos, u.id)), taken = new Set(x.cb.units.filter((v: any) => !v.dead && v.id !== u.id).map((v: any) => v.pos));
      const t = Object.entries(P.dist as Record<string, number>).filter(([k, n]) => n > 0 && !taken.has(k) && dist(k, ally.pos) <= 1).map(([k, n]) => ({ k, ap: apForTiles(n, u.bank || 0, u.movement) })).filter((q) => q.ap <= u.ap - 1).sort((a, b) => a.ap - b.ap)[0];
      if (t) { const s = ok(x, { action: { type: 'combat/move', to: t.k }, kind: 'move', label: 'beside the ally (Close Guard)' }); if (s) return s; }
    }
  }
  const g = res(u, 'guard');
  if (x.allies.length && g >= 2 && x.foes.length && once(x, 'challenge')) { const s = verb(x, 'skill:durability.1', 'guard_challenge'); if (s) return s; }
  if (g >= 3 && x.foes.some((f) => dist(f.pos, u.pos) <= 1 && f.tier !== 'boss') && u.ap >= 3 && once(x, 'slam')) { const s = verb(x, 'skill:durability.1', 'guard_slam'); if (s) return s; }
  return tank(x);
};

// ---------------------------------------------------------------------------------------------- Breaker
export const breaker: Policy = (x) => {
  const mom = res(x.u, 'momentum'), max = x.u.resMax?.momentum ?? 0;
  if (!max || mom >= Math.min(3, max)) return optimised(x);
  // the chain first: the Finishers are left out until Momentum is 3 (or full)
  const p = plainCands(x), cands = [...p.cands, ...techCands(x).filter((c) => TECHNIQUE[c.step.action.id]?.group !== 'finisher')];
  const b = best(x, cands, (c) => c.value / Math.max(0.5, c.ap));
  if (b) return b.step;
  if (cands.some((c) => !x.banned.has(JSON.stringify(c.step.action)))) return null;
  return fixOrMove(x, p.whys);
};

// ---------------------------------------------------------------------------------------------- Skirmisher
export const skirmisher: Policy = (x) => {
  const s = gunner(x);
  if (s && s.kind !== 'move') return s;
  const seen = x.foes.some((f) => W(x.g, () => previewAttack(x.cb, f, x.u, isMelee(WEAPON[f.weapon]) ? 'melee' : 'shot')).ok);
  if (x.u.ap >= 1 && seen && once(x, 'slide')) { const v = verb(x, 'verb:pressure.slide', 'slide'); if (v) return v; }
  return s;
};

// ---------------------------------------------------------------------------------------------- Operative
const BREAK = ['skill:ingenuity.1#shadow.break'];
export const operative: Policy = (x) => {
  const u = x.u; if (!x.foes.length) return null;
  const shotAp = (t: any) => W(x.g, () => previewAttack(x.cb, u, t, 'shot'));
  if (u.hidden) {
    const sh = res(u, 'shadow'), tgts = x.foes.map((t) => ({ t, pv: shotAp(t) })).filter((q) => q.pv.ok).sort((a, b) => a.t.hp - b.t.hp);
    if (sh > 0 && tgts.length) {
      const { t, pv } = tgts[0];
      if (!t.conds?.marked && u.ap >= 1 + pv.ap && once(x, 'tag')) { const s = verb(x, 'verb:shadow.tag', 'tag', { targetId: t.id }); if (s) return s; }
      const s = ok(x, { action: { type: 'combat/attack', targetId: t.id, mode: 'shot', mods: BREAK }, kind: 'attack', label: 'Break' }); if (s) return s;
    }
    if (sh === 0 && tgts.length && u.ap < 2 * (tgts[0]?.pv.ap || 2)) return null; // wait Hidden: Shadow at the turn's end
    return gunner(x);
  }
  // seen or in the open: Hide here, or walk to a tile no foe sees and Hide there
  if (!W(x.g, () => hideBlock(x.cb, u))) { const s = ok(x, { action: { type: 'combat/hide' }, kind: 'setup', label: 'Hide' }); if (s) return s; }
  if (x.memo.hideWalk !== x.cb.round && u.ap >= 2) {
    x.memo.hideWalk = x.cb.round;
    const P = W(x.g, () => paths(x.cb, u.pos, u.id)), taken = new Set(x.cb.units.filter((v: any) => !v.dead && v.id !== u.id).map((v: any) => v.pos)), p0 = u.pos;
    const tiles = Object.entries(P.dist as Record<string, number>).filter(([k, n]) => n > 0 && !taken.has(k)).map(([k, n]) => ({ k, ap: apForTiles(n, u.bank || 0, u.movement) })).filter((q) => q.ap <= u.ap - 1).sort((a, b) => a.ap - b.ap);
    let hit: string | null = null;
    for (const t of tiles.slice(0, 80)) { u.pos = t.k; try { if (!W(x.g, () => hideBlock(x.cb, u))) { hit = t.k; break; } } finally { u.pos = p0; } }
    if (hit) { const s = ok(x, { action: { type: 'combat/move', to: hit }, kind: 'move', label: 'to a tile out of sight' }); if (s) return s; }
  }
  return gunner(x);
};

// ---------------------------------------------------------------------------------------------- Rigger
export const riggerRun: Policy = (x) => {
  const u = x.u;
  if (u.hp < u.maxHp / 2 && x.memo.cashed !== x.cb.round) {
    const idle = W(x.g, () => figmentsOf(x.cb, u)).find((f: any) => !x.foes.some((t) => dist(t.pos, f.pos) <= 3));
    if (idle) { x.memo.cashed = x.cb.round; const s = ok(x, { action: { type: 'combat/owned', owned: idle.id, verb: 'figment_cash_in' }, kind: 'other', label: 'Cash in' }); if (s) return s; }
  }
  return rigger(x);
};

// ---------------------------------------------------------------------------------------------- Mender
const MACHINE = (t: any) => /bot|drone|machine|turret/i.test(String(t.kind || '') + ' ' + String(t.name || ''));
export const mender: Policy = (x) => {
  const u = x.u;
  // heal first: the lowest ally under 60% (itself through Mend Self)
  const hurt = [u, ...x.allies].filter((a) => a.downed || a.hp < a.maxHp * 0.6).sort((a, b) => a.hp / a.maxHp - b.hp / b.maxHp);
  for (const a of hurt) {
    if (a.id === u.id) { const s = verb(x, 'verb:tend.mend_self', 'tend_mend_self'); if (s) return s; continue; }
    if ((a.downed || a.hp < a.maxHp * 0.3) && dist(a.pos, u.pos) > 1 && once(x, 'tug:' + a.id)) { const s = verb(x, 'verb:tend.tug', 'tend_tug', { targetId: a.id }); if (s) return s; }
    const s = verb(x, 'verb:tend.mend', 'tend_mend', { targetId: a.id }); if (s) return s;
  }
  // Bonds: every ally, then the nearest foe that is not a machine
  for (const a of x.allies) if (once(x, 'bond:' + a.id) && x.memo['bonded:' + a.id] !== true) { const s = verb(x, 'verb:tend.bond', 'tend_bond', { targetId: a.id }); if (s) { x.memo['bonded:' + a.id] = true; return s; } }
  const foes = [...x.foes].filter((t) => !MACHINE(t)).sort((a, b) => dist(u.pos, a.pos) - dist(u.pos, b.pos));
  // Snap a foe it holds (once a turn), else Bond one
  if (x.memo.snapped !== x.cb.round) for (const t of foes) { if (!x.memo['bondFoe:' + t.id]) continue; const s = verb(x, 'verb:tend.snap', 'tend_snap', { targetId: t.id }); if (s) { x.memo.snapped = x.cb.round; x.memo['bondFoe:' + t.id] = false; return s; } }
  for (const t of foes) { if (x.memo['bondFoe:' + t.id]) continue; if (!once(x, 'bondfoe:' + t.id)) continue; const s = verb(x, 'verb:tend.bond', 'tend_bond', { targetId: t.id }); if (s) { x.memo['bondFoe:' + t.id] = true; return s; } }
  return gunner(x);
};

// ---------------------------------------------------------------------------------------------- Chaplain
export const chaplain: Policy = (x) => {
  if (x.c?.classId && once(x, 'canticle')) { const s = verb(x, 'class:guardian.canticle', 'canticle'); if (s) return s; }
  return prayer({ ...x, opts: { ...(x.opts || {}), hymn: 'damage', whisper: 'rebuke' } });
};

// ---------------------------------------------------------------------------------------------- the monk
const OH = (f: string) => 'relic:open_hand#' + f;
export const monk: Policy = (x) => {
  const s = optimised(x);
  // a form is a control trade (Sweep: +1 AP, x0.4, Prone): once a turn, as the turn's opening blow, on a foe that is not
  // a Boss and not already Prone, when the AP still pays two plain blows after it; every other blow plain
  if (s && s.action.type === 'combat/attack' && s.action.mode === 'melee' && !s.action.mods && x.memo.formRound !== x.cb.round) {
    const t = x.foes.find((q) => q.id === s.action.targetId), pv0 = t && W(x.g, () => previewAttack(x.cb, x.u, t, 'melee'));
    if (t && t.tier !== 'boss' && !t.conds?.prone && pv0?.ok && x.u.ap >= (pv0.ap + 1) + 2 * pv0.ap) {
      const a = { ...s.action, mods: [OH('sweep')] };
      if (!x.banned.has(JSON.stringify(a))) { x.memo.formRound = x.cb.round; return { ...s, action: a, label: 'blow (sweep)' }; }
    }
    return s;
  }
  if (!s && x.u.ap >= 1 && once(x, 'breath')) { const b = verb(x, 'relic:open_hand', 'open_breath'); if (b) return b; }
  return s;
};

// Every door's policy reloads tactically (rules 1.9: +1 AP, the magazine or speedloader kept in the pack), as a player
// with a six-round revolver and few speedloaders does; refused (AP short), the speed reload.
const T: Record<string, Policy> = { bulwark, breaker, skirmisher, operative, riggerRun, mender, chaplain, monk, sigilRunT: sigilRun, outburstRunT: outburstRun };
for (const [k, p] of Object.entries(T)) { const t = tactical(p); (t as any).after = (p as any).after; (POLICIES as any)[k] = t; }
