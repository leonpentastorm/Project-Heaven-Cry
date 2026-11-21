// Calls (rules 1.13, Skeleton 2.0): the core. A Call is a handler registered with call(); the core checks who may
// speak, to whom and how far, charges its AP (or the reaction), keeps the one-helping and one-hindering limit, and runs
// it. previewCall and useCall are one code path: a preview builds the same Call with `preview: true`, and a handler
// then describes what it would do and changes nothing.
//
// The shared ladder, by the speaker's points in the Call's skill (calls.json `rules`; rules 1.70 items 5535, 5536): the one
// price table (`price`: 3 AP, 2 from 5, 1 from 9; each Call once a turn, twice at 10; from 10 the reaction may pay, on
// your own turn for any Call, off it for a helping Call once a round); its reach 4 tiles + 1 a point; steps at 1, 4, 8.
import { tilesN } from '../log';
import { say, unsay, type Combat, type Unit, alive, emitFx, checkOver, active, dist, sideSees } from '../combat';
import { charOfUnit, emit, bindGame } from '../effects/hooks';
import { grantPerkAp } from '../effects/ap';
import { applyCond, condOn, unitStrength, withVia } from '../magic';
import { canReact, react, refundReaction, resGain } from '../tactics';
import type { Rng } from '../rng';
import { turnStamp, ownSideOnly } from '../physical/core';
import type { Call, CallArgs, CallDef, CallHandler, CallMarks, CallPadEntry, CallPreview } from './types';
import { CALL, CALLS, CALL_RULES, CALL_REACT_AT, callBaseAp, callsPerTurn, callRangeAt, callSkillName, callStepAt } from './data';
import { priced, whyNot, pay, refund, resGive, RESOURCES } from '../effects/cost';
import { uses } from '../effects/uses';

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
/** Calls this unit has made on this turn (its own turn only; a Call made off its turn as a reaction isn't counted). */
export const callsThisTurn = (cb: Combat, u: Unit): number => spoken(cb, u).used('per_turn', TURN_KEY);
// The speaker's own counters are cells of effects/uses.ts (review 1, F8): its Calls this turn, each Call's own this turn
// (rules 1.70 item 5535: once a turn, twice at 10), its one Call as a reaction a round off its turn.
const TURN_KEY = 'calls#turn', REACT_KEY = 'calls#react', idKey = (id: string) => 'calls#turn:' + id;
/** Is this Call made on the speaker's own turn (the reaction then pays in place of the AP, rules 1.70 item 5535)? */
const ownTurn = (cb: Combat, u: Unit): boolean => active(cb) === u && !cb.window;
const spoken = (cb: Combat, u: Unit) => uses({ key: 'calls', u, cb });
/** What a Call costs this unit now: the price table's AP at its points (calls.json rules.price); paid with the reaction
 * (from the table's reaction row: on its own turn, or off it as a helping Call), the reaction and no AP. 'call_cost'
 * {u, id, ap, react, preview} lets an item change it (never state); then the one cost site. */
export function callAp(cb: Combat, u: Unit, def: CallDef, react = false): number {
  const level = callLevel(u, def);
  const ap = react ? CALL_RULES.reaction_ap : callBaseAp(level);
  const hk: any = emit(cb, 'call_cost', { u, id: def.id, ap, react, preview: true, cb });
  return priced({ cb, u }, 'call', Math.max(0, hk.ap), undefined, { id: def.id, react }).ap;
}
/** The TN an enemy saves against: 12 + the speaker's strength with the Call's skill (points − 1, floor 0; an enemy
 * speaker: its tier's number). Not halved, and never the full-points check number (plan ruling 1). */
export const callTn = (u: Unit, def: CallDef, tnAdd = 0): number => CALL_RULES.save_tn + unitStrength(u, def.skill) + tnAdd;

// ---------- who may Call, and to whom ----------
/** Why this unit can't make this Call now, before any target is looked at (null: it can). */
/** A Call made as a reaction is of kind `protect`: only a helping Call can be one (it moves or hurts nobody); a Call
 * that harms or hinders an enemy is never a reaction (the lead's rulings on rules 1.28, 13 Nov 2026; item 1764). */
export const callReactKind = (def: CallDef): 'attack' | 'protect' => (def.kind === 'helping' ? 'protect' : 'attack');
/** Why this Call can't be a reaction at all (null: it can): a hindering Call is made on your own turn only. */
export const callReactWhy = (def: CallDef): string | null => (def.kind === 'helping' ? null : 'A Call that hinders an enemy is made on your own turn, never as a reaction.');
function gate(cb: Combat, u: Unit, def: CallDef, args: CallArgs): string | null {
  if (!alive(u)) return 'Out of the fight.';
  const level = callLevel(u, def);
  if (level < 1) return 'Needs a point of ' + callSkillName(def) + '.';
  if (condOn(u, 'silenced')) return 'You are Silenced and can\'t Call.';
  const own = ownTurn(cb, u);
  // rules 1.70 item 5535: each Call once a turn (twice at the table's top row), for every Call paid in AP (on the speaker's
  // own turn, and in an ally's window: On My Mark, Supreme Command; the review of the 0.32 shared step, m1); a Call paid
  // with the reaction off the speaker's turn has its own once-a-round count below
  if ((own || !args.react) && spoken(cb, u).left('per_turn', callsPerTurn(level), idKey(def.id)) <= 0) return def.name + (callsPerTurn(level) > 1 ? ' is made at most ' + callsPerTurn(level) + ' times a turn.' : ' is made once a turn.');
  if (args.react) {
    if (level < CALL_REACT_AT) return 'Paying for a Call with your reaction needs ' + CALL_REACT_AT + ' points of ' + callSkillName(def) + '.';
    if (!own) { // off your turn: a helping Call only, once a round, where it works today
      { const no = callReactWhy(def); if (no) return no; }
      if (spoken(cb, u).left('reaction', 1, REACT_KEY) <= 0) return 'One Call as a reaction a round.';
    }
    if (!canReact(cb, u, callReactKind(def))) return 'No reaction left this round.'; // a helping Call protects (Suppressed does not stop it)
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
  if (tgt !== u && dist(u.pos, tgt.pos) > t.pv.range) return 'Too far to be heard (' + tilesN(t.pv.range) + ').';
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
  if (tgt === u && def.self_step_less) pv.step = Math.max(1, pv.step - def.self_step_less); // rules 1.98 item 8352: on yourself, the step below
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
  const t = p.t, tgt = t.tgt, ap = t.pv.ap;
  // 'call' {u, t, id, kind, step, react, tnAdd, cancel}: before anything is paid; an item may refuse it (cancel: the
  // words to show) or make its save harder or easier (tnAdd).
  const hk: any = emit(cb, 'call', { u, t: tgt, id, kind: def.kind, step: t.step, react: t.react, tnAdd: 0, cancel: null as string | null, cb, rng });
  if (hk.cancel) return String(hk.cancel);
  t.tnAdd = hk.tnAdd || 0;
  // A Call as a reaction (rules 1.13) goes through react() (rules 1.28): its window, its reaction, and while it resolves
  // no reaction answers anything it does.
  if (t.react) {
    if (!canReact(cb, u, callReactKind(def))) return 'No reaction left this round.';
    let out: string | null = 'Not now.';
    react(cb, u, { kind: callReactKind(def), window: { kind: 'call', mover: tgt, id, at: u.pos, rng } }, () => { out = speak(cb, u, def, args, p, t, tgt, ap); });
    return out;
  }
  return speak(cb, u, def, args, p, t, tgt, ap);
}
/** The Call itself, once its reaction (if any) is spent: pay, mark, run the handler (a refusal gives everything back). */
function speak(cb: Combat, u: Unit, def: CallDef, args: CallArgs, p: any, t: any, tgt: Unit, ap: number): string | null {
  const id = def.id;
  const key = def.kind === 'helping' ? 'helped' : 'hindered', limit0 = tgt.call?.[key];
  pay(cb, u, ap);
  const own = ownTurn(cb, u);
  if (t.react && !own) spoken(cb, u).take('reaction', 1, REACT_KEY); else { spoken(cb, u).take('per_turn', Infinity, TURN_KEY); spoken(cb, u).take('per_turn', Infinity, idKey(id)); }
  callMarks(tgt)[key] = { r: cb.round, id, side: u.side };
  const ev = emitFx(cb, 'call', { unit: u.id, id, target: tgt.id, at: u.pos, step: t.step, kind: def.kind, ...(t.react ? { reaction: true } : {}), ...ownSideOnly(cb, u) });
  const said = args.text ? ' "' + String(args.text).slice(0, 200) + '"' : '';
  const logAt = cb.log.length; say(cb, u.name + ' calls ' + def.name + (tgt === u ? '' : (def.aim === 'enemy' ? ' at ' : ' to ') + tgt.name) + (t.react ? ' (a reaction)' : '') + said + '.');
  const err = withVia(u, def.skill, () => p.h!.run(t));
  if (err) { // a handler must refuse before it changes anything: the cost and the marks come back
    refund(cb, u, ap); unsay(cb, logAt); (ev as any).refused = true;
    if (t.react) refundReaction(cb, u);
    if (t.react && !own) spoken(cb, u).refund('reaction', REACT_KEY); else { spoken(cb, u).refund('per_turn', TURN_KEY); spoken(cb, u).refund('per_turn', idKey(id)); }
    if (limit0) callMarks(tgt)[key] = limit0; else delete callMarks(tgt)[key];
    return err;
  }
  for (const n of t.pv.notes) say(cb, '  ' + n);
  if (def.feeds?.when === 'given') callFeed(cb, u, def); // rules 1.100 item 8376: a Call that feeds as it is given (Brief vents Flux)
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
      reaction: level >= CALL_REACT_AT && !callReactWhy(def) && alive(u) && !condOn(u, 'silenced') && spoken(cb, u).left('reaction', 1, REACT_KEY) > 0 && canReact(cb, u),
      // rules 1.70 item 5535: on its own turn, from the table's reaction row, the reaction may pay for this Call
      payReaction: level >= CALL_REACT_AT && ownTurn(cb, u) && !why && canReact(cb, u, callReactKind(def)),
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
  if (out) say(t.cb, ' ' + out);
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

/** Rules 1.98 item 8352: what a Call that landed feeds its speaker (calls.json `feeds`: Warn's plates), by the speaker's
 *  points in the Call's skill, up to the pool's top. The gain, 0 when it feeds nothing. */
export function callFeed(cb: Combat, u: Unit, def: CallDef | undefined): number {
  const f = def?.feeds; if (!f || !alive(u)) return 0;
  const pts = callLevel(u, def!), row = [...f.steps].reverse().find((x) => pts >= x.from); if (!row) return 0;
  // rules 1.100 item 8376: a resource with its own setter (Flux: magic.ts) goes through it (resGive); a unit meter tops at its pool
  const got = RESOURCES[f.resource]?.setter ? resGive(cb, u, f.resource, row.value, { why: def!.name }) : resGain(u, f.resource, row.value);
  if (got) say(cb, '  ' + (f.line ? f.line.replace(/\{who\}/g, u.name).replace(/\{n\}/g, String(Math.abs(got))).replace(/\{call\}/g, def!.name) : u.name + ' reads the blow: +' + got + ' ' + f.resource + ' (' + def!.name + ').'));
  return got;
}
