// Calls (rules 1.13, Skeleton 2.0): the core. A Call is a handler registered with call(); the core checks who may
// speak, to whom and how far, charges its AP (or the reaction), keeps the one-helping and one-hindering limit, and runs
// it. previewCall and useCall are one code path: a preview builds the same Call with `preview: true`, and a handler
// then describes what it would do and changes nothing.
//
// The shared ladder, by the speaker's points in the Call's skill (calls.json `rules`): 2 AP and 5 tiles + 1 a point;
// step 2 at 3 points; 1 AP from 5; step 3 at 7; as a reaction once a round from 9; the first Call of a turn free at 10.
import { type Combat, type Unit, alive, emitFx, checkOver, active, dist, sideSees } from '../combat';
import { charOfUnit, emit, bindGame } from '../effects/hooks';
import { grantPerkAp } from '../effects/ap';
import { applyCond, condOn, unitStrength, withVia } from '../magic';
import { canReact, useReaction, refundReaction } from '../tactics';
import type { Rng } from '../rng';
import { turnStamp, ownSideOnly } from '../physical/core';
import type { Call, CallArgs, CallDef, CallHandler, CallMarks, CallPadEntry, CallPreview } from './types';
import { CALL, CALLS, CALL_RULES, callBaseAp, callRangeAt, callSkillName, callStepAt } from './data';
import { whyNot, pay, refund } from '../effects/cost';

// ---------- the registry ----------
const HANDLERS: Record<string, CallHandler> = {};
/** Register a Call's handler (one per id; a second registration replaces the first: tests). */
export function call(h: CallHandler): void { HANDLERS[h.id] = h; }
export const callHandler = (id: string): CallHandler | null => HANDLERS[id] || null;

// ---------- what a unit carries ----------
/** A unit's Call marks, to write to. */
export const callMarks = (u: Unit): CallMarks => (u.call ||= {});
/** The speaker's points in a Call's skill: the character's; an enemy's tier level for the Calls on its list
 * (enemies.json `calls`, `call_level`: an enemy has no skill points); a companion has none. */
export function callLevel(u: Unit, def: CallDef): number {
  if (u.companion) return 0;
  if (u.charId) { const c = charOfUnit(u); return Math.max(0, Math.min(10, Math.floor(((c?.skills as any)?.[def.skill] as number) || 0))); }
  return (u.calls || []).includes(def.id) ? Math.max(0, Math.min(10, u.callLevel || 0)) : 0;
}
/** Calls this unit has made on this turn (its own turn only; a reaction isn't counted). */
export const callsThisTurn = (cb: Combat, u: Unit): number => (u.call?.turn && u.call.turn.t === turnStamp(cb) ? u.call.turn.n : 0);
/** What a Call costs this unit now: 2 AP, 1 from 5 points, nothing for the first Call of a turn at 10; a reaction
 * costs the reaction and no AP. 'call_cost' {u, id, ap, react, preview} lets an item change it (never state). */
export function callAp(cb: Combat, u: Unit, def: CallDef, react = false): number {
  const level = callLevel(u, def);
  let ap = react ? CALL_RULES.reaction_ap : callBaseAp(level);
  if (!react && level >= CALL_RULES.free_at && callsThisTurn(cb, u) < CALL_RULES.free_per_turn) ap = 0;
  const hk: any = emit(cb, 'call_cost', { u, id: def.id, ap, react, preview: true, cb });
  return Math.max(0, hk.ap);
}
/** The TN an enemy saves against: 12 + the speaker's strength with the Call's skill (points − 1, floor 0; an enemy
 * speaker: its tier's number). Not halved, and never the full-points check number (plan ruling 1). */
export const callTn = (u: Unit, def: CallDef, tnAdd = 0): number => CALL_RULES.save_tn + unitStrength(u, def.skill) + tnAdd;

// ---------- who may Call, and to whom ----------
/** Why this unit can't make this Call now, before any target is looked at (null: it can). */
function gate(cb: Combat, u: Unit, def: CallDef, args: CallArgs): string | null {
  if (!alive(u)) return 'Out of the fight.';
  const level = callLevel(u, def);
  if (level < 1) return 'Needs a point of ' + callSkillName(def) + '.';
  if (condOn(u, 'silenced')) return 'You are Silenced and can\'t Call.';
  if (args.react) {
    if (level < CALL_RULES.reaction_at) return 'A Call as a reaction needs ' + CALL_RULES.reaction_at + ' points of ' + callSkillName(def) + '.';
    if (active(cb) === u) return 'It is your turn. Make the Call as an action.';
    if (u.call?.react === cb.round) return 'One Call as a reaction a round.';
    if (!canReact(cb, u)) return 'No reaction left this round.';
  }
  const ap = callAp(cb, u, def, !!args.react);
  { const no = whyNot(cb, u, ap, { as: { type: 'combat/call', id: def.id } }); if (no) return no; }
  return null;
}
const NO_ENEMY = 'Pick an enemy who can hear you.';
function targetGate(t: Call, h: CallHandler): string | null {
  const { cb, u, def, tgt } = t, helping = def.kind === 'helping';
  if (def.aim === 'enemy') {
    if (tgt.side === u.side || !alive(tgt)) return NO_ENEMY;
    // a Hidden enemy the speaker's side doesn't see is not there, as far as the speaker knows (the same words as no one)
    if (tgt.hidden && !sideSees(cb, u.side, tgt) && !h.seesHidden?.(t)) return NO_ENEMY;
  } else {
    if (tgt.side !== u.side) return 'Call to an ally.';
    if (tgt === u && def.aim !== 'self-or-ally') return def.name + ' is for someone else.';
    if (!alive(tgt)) return tgt.name + ' can\'t hear you.';
  }
  if (tgt !== u && dist(u.pos, tgt.pos) > t.pv.range) return 'Too far to be heard (' + t.pv.range + ' tiles).';
  const m = tgt.call?.[helping ? 'helped' : 'hindered'];
  if (m && m.r === cb.round) return tgt.name + ' has already been ' + (helping ? 'helped' : 'hindered') + ' by a Call this round.';
  return null;
}
function newPreview(cb: Combat, u: Unit, def: CallDef, args: CallArgs): CallPreview {
  const level = callLevel(u, def);
  return { ok: true, why: null, id: def.id, ap: callAp(cb, u, def, !!args.react), range: callRangeAt(level), level, step: callStepAt(def, level), kind: def.kind, aim: def.aim, target: null, react: !!args.react, notes: [] };
}
function buildCall(cb: Combat, u: Unit, def: CallDef, args: CallArgs, tgt: Unit, rng: Rng, preview: boolean): Call {
  const pv = newPreview(cb, u, def, args); pv.target = tgt.id;
  const st = def.steps[Math.max(0, pv.step - 1)];
  return { cb, u, c: charOfUnit(u), def, args, tgt, rng, preview, pv, level: pv.level, step: pv.step, react: !!args.react, tnAdd: 0,
    num: (k, fb = 0) => (typeof st?.numbers?.[k] === 'number' ? st.numbers[k] : fb), note: (text) => { pv.notes.push(text); } };
}
function prepare(cb: Combat, u: Unit, id: string, args: CallArgs, rng: Rng, preview: boolean): { t: Call | null; why: string | null; h: CallHandler | null; pv: CallPreview | null } {
  const def = CALL[id]; if (!def) return { t: null, why: 'No such Call.', h: null, pv: null };
  const g = gate(cb, u, def, args); if (g) return { t: null, why: g, h: null, pv: newPreview(cb, u, def, args) };
  const h = callHandler(id); if (!h) return { t: null, why: 'This Call isn\'t in the game yet.', h: null, pv: newPreview(cb, u, def, args) };
  const tgt = args.targetId ? cb.units.find((x) => x.id === args.targetId) || null : def.aim === 'self-or-ally' ? u : null;
  if (!tgt) return { t: null, why: def.aim === 'enemy' ? NO_ENEMY : 'Pick an ally who can hear you.', h, pv: newPreview(cb, u, def, args) };
  const t = buildCall(cb, u, def, args, tgt, rng, preview);
  return { t, why: targetGate(t, h) || h.check?.(t) || null, h, pv: t.pv };
}
/** Run fn with a game bound, when one is given (the screen passes its view of the room: the character behind a unit is
 * found through the bound game). */
function withG<T>(g: any, fn: () => T): T { if (!g) return fn(); const was = bindGame(g); try { return fn(); } finally { bindGame(was); } }

// ---------- the reducer's and the screen's entry points ----------
/** What the Call would do, changing nothing (the card, the AI). Pass the game (`g`) when none is bound. */
export function previewCall(cb: Combat, u: Unit, id: string, args: CallArgs = {}, g?: any): CallPreview {
  if (g) return withG(g, () => previewCall(cb, u, id, args));
  const p = prepare(cb, u, id, args, { state: 1 }, true);
  if (!p.t) return { ...(p.pv || { id, ap: 0, range: 0, level: 0, step: 0, kind: 'helping', aim: 'ally', target: null, react: !!args.react, notes: [] }), ok: false, why: p.why || 'Not now.' } as CallPreview;
  const t = p.t; if (p.why) { t.pv.ok = false; t.pv.why = p.why; return t.pv; }
  const err = withVia(u, t.def.skill, () => p.h!.run(t));
  if (err) { t.pv.ok = false; t.pv.why = err; }
  return t.pv;
}
/** Make a Call. Returns a refusal in plain words, or null. Nothing is spent on a refusal. */
export function useCall(cb: Combat, u: Unit, id: string, args: CallArgs, rng: Rng): string | null {
  const def = CALL[id]; if (!def) return 'No such Call.';
  const pv = previewCall(cb, u, id, args); if (!pv.ok) return pv.why || 'Not now.';
  const p = prepare(cb, u, id, args, rng, false); if (!p.t || p.why) return p.why || 'Not now.';
  const t = p.t, tgt = t.tgt, ap = t.pv.ap, marks = callMarks(u);
  // 'call' {u, t, id, kind, step, react, tnAdd, cancel}: before anything is paid; an item may refuse it (cancel: the
  // words to show) or make its save harder or easier (tnAdd).
  const hk: any = emit(cb, 'call', { u, t: tgt, id, kind: def.kind, step: t.step, react: t.react, tnAdd: 0, cancel: null as string | null, cb, rng });
  if (hk.cancel) return String(hk.cancel);
  t.tnAdd = hk.tnAdd || 0;
  if (t.react) {
    const rw: any = emit(cb, 'reaction_window', { reactor: u, mover: tgt, kind: 'call', id, cancel: false, at: u.pos, cb, rng }); if (rw.cancel) return 'Not now.';
    if (!useReaction(cb, u)) return 'No reaction left this round.';
  }
  const react0 = marks.react, turn0 = marks.turn, key = def.kind === 'helping' ? 'helped' : 'hindered', limit0 = tgt.call?.[key];
  pay(cb, u, ap);
  if (t.react) marks.react = cb.round; else marks.turn = { t: turnStamp(cb), n: callsThisTurn(cb, u) + 1 };
  callMarks(tgt)[key] = { r: cb.round, id, side: u.side };
  const ev = emitFx(cb, 'call', { unit: u.id, id, target: tgt.id, at: u.pos, step: t.step, kind: def.kind, ...(t.react ? { reaction: true } : {}), ...ownSideOnly(cb, u) });
  const said = args.text ? ' "' + String(args.text).slice(0, 200) + '"' : '';
  const logAt = cb.log.length; cb.log.push(u.name + ' calls ' + def.name + (tgt === u ? '' : (def.aim === 'enemy' ? ' at ' : ' to ') + tgt.name) + (t.react ? ' (a reaction)' : '') + said + '.');
  const err = withVia(u, def.skill, () => p.h!.run(t));
  if (err) { // a handler must refuse before it changes anything: the cost and the marks come back
    refund(cb, u, ap); cb.log.splice(logAt, 1); (ev as any).refused = true;
    if (t.react) { refundReaction(cb, u); if (react0 == null) delete marks.react; else marks.react = react0; }
    else if (turn0) marks.turn = turn0; else delete marks.turn;
    if (limit0) callMarks(tgt)[key] = limit0; else delete callMarks(tgt)[key];
    return err;
  }
  for (const n of t.pv.notes) cb.log.push('  ' + n);
  if (args.text) (cb.notes ||= []).push(u.name + ' (round ' + cb.round + ', ' + def.name + (tgt === u ? '' : ' at ' + tgt.name) + '):' + said);
  checkOver(cb);
  return null;
}
/** A handler's own score for the enemy AI (a plain attack is 5; 0: never), and the arguments it would use. Pure. */
export function aiCallScore(cb: Combat, u: Unit, id: string, args: CallArgs): { score: number; args: CallArgs } {
  const def = CALL[id], h = callHandler(id), tgt = args.targetId ? cb.units.find((x) => x.id === args.targetId) : def?.aim === 'self-or-ally' ? u : null;
  if (!def || !h?.ai || !tgt) return { score: 0, args };
  const r = h.ai(buildCall(cb, u, def, args, tgt, { state: 1 }, true));
  return typeof r === 'number' ? { score: r, args } : { score: r.score, args: { ...args, ...r.args } };
}
/** What the Calls pad draws: every Call the unit has at least 1 point for, with its cost, reach, step and the text of
 * the step it has. The screen never works a number out itself. Pass the game (`g`) when none is bound. */
export function callPad(cb: Combat, u: Unit, g?: any): CallPadEntry[] {
  if (g) return withG(g, () => callPad(cb, u));
  const out: CallPadEntry[] = [];
  for (const def of CALLS) {
    const level = callLevel(u, def); if (level < 1) continue;
    const step = callStepAt(def, level), ap = callAp(cb, u, def), why = gate(cb, u, def, {}) || (callHandler(def.id) ? null : 'This Call isn\'t in the game yet.');
    out.push({
      id: def.id, name: def.name, skill: def.skill, skillName: callSkillName(def), kind: def.kind, aim: def.aim, ap, range: callRangeAt(level), level, step, ok: !why, why,
      text: def.steps[step - 1]?.text || def.text, summary: def.text, steps: def.steps.map((s) => ({ at: s.at, text: s.text, has: level >= s.at })),
      ...(def.save ? { save: { family: def.save, tn: callTn(u, def) } } : {}),
      reaction: level >= CALL_RULES.reaction_at && alive(u) && !condOn(u, 'silenced') && u.call?.react !== cb.round && canReact(cb, u),
      free: ap === 0,
    });
  }
  return out;
}

// ---------- helpers a handler calls ----------
/** When AP given to this unit now would land: at once on its own turn; at the start of its turn later this round;
 * or on its next turn, when it has already acted this round (plan ruling 6). */
export function apLands(cb: Combat, t: Unit): 'now' | 'this turn' | 'next turn' {
  if (!cb.window && cb.order[cb.turn] === t.id) return 'now';
  return cb.order.indexOf(t.id, cb.turn + 1) >= 0 ? 'this turn' : 'next turn';
}
/** AP a Call gives: through grantPerkAp and its +3 cap, up to the turn's 9 (never past them). Returns what was given
 * at once (0 when it was banked for the unit's turn). */
export function giveAp(t: Call, n: number): number {
  const when = apLands(t.cb, t.tgt);
  if (t.preview) { t.pv.gives = { unit: t.tgt.id, ap: n, when }; t.note(t.tgt.name + ' gains ' + n + ' AP ' + (when === 'now' ? 'now' : when === 'this turn' ? 'at the start of their turn this round' : 'on their next turn') + '. Bonus AP can\'t go past +3 a turn.'); return n; }
  return grantPerkAp(t.cb, t.tgt, n, t.def.name, t.u);
}
/** A hindering Call's condition, saved against 12 + the speaker's strength with the Call's skill. True: it took. In a
 * preview nothing is rolled: the save is listed and the target is taken to fail. */
export function hinder(t: Call, condId: string): boolean {
  if (t.preview) { if (t.def.save) t.pv.save = { unit: t.tgt.id, family: t.def.save, tn: callTn(t.u, t.def, t.tnAdd) }; return true; }
  const at0 = t.tgt.condAt?.[condId];
  const out = applyCond(t.cb, t.rng, t.u, t.tgt, condId, undefined, t.def.save, { tnAdd: t.tnAdd, via: t.def.skill });
  if (out) t.cb.log.push(' ' + out);
  return condOn(t.tgt, condId) && t.tgt.condAt?.[condId] !== at0;
}
/** A unit's Call marks as one side may see them (viewFor): a mark shows to the side that made it; the speaker's own
 * counters to its own side; and what a failed save put on your own unit (AP lost, no approach, the dearer attack) to
 * you. The unit is copied only when something is taken out. */
const OWN_KNOWN = new Set(['apLoss', 'cowed', 'tauntAp']);
export function callView(u: Unit, me: 'pc' | 'foe'): Unit {
  const c = u.call as Record<string, any> | undefined; if (!c) return u;
  const own = u.side === me, out: Record<string, any> = {}; let cut = false;
  for (const [k, v] of Object.entries(c)) {
    const show = k === 'turn' || k === 'react' ? own : (v && v.side === me) || (own && OWN_KNOWN.has(k));
    if (show) out[k] = v; else cut = true;
  }
  if (!cut) return u;
  const x = { ...u }; if (Object.keys(out).length) x.call = out as CallMarks; else delete x.call;
  return x;
}
