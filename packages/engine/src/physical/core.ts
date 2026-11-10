// Physical 2.0 (rules 1.12): the technique core. A technique is a handler registered with technique(); the core checks
// who may use it, charges its AP, builds the Tech a handler is given, and runs it. Attacks go through strike(), which
// wraps previewAttack/resolveAttack and shapes them through the engine's hooks (so combat.ts is not forked).
// Momentum is the melee meter (on the user); Pressure is the ranged one (on the target): pressure.ts.
import { type Combat, type Unit, previewAttack, resolveAttack, attackApCost, isMelee, emitFx, alive, checkOver, xy, key, moveBlockers, refOf, triggerOverwatch, paths, routeTo, sideSees, active, moveUnit, moveBlock, dropToPile, asVolley, canJam, heatLimit } from '../combat';
import { WEAPON } from '../data';
import { onHook, charOfUnit, emit, boundGame, bindGame } from '../effects/hooks';
import { apDebt } from '../effects/ap';
import type { HookName } from '../effects/types';
import { applyCond, condOn, unitSave } from '../magic';
import { resOf, resGain, canReact, useReaction } from '../tactics';
import { d20, type Rng } from '../rng';
import { mod } from '../character';
import type { Character } from '../character';
import { packOf } from '../character';
import { packRef } from '../gear';
import type { Tech, TechArgs, TechDef, TechHandler, TechPreview, StrikeOpts, StrikeResult, PadGroup, PadEntry, TechLine, WatchSpec, HeldWatch } from './types';
import { TECHNIQUE, TECHNIQUES, PHYS_RULES, weaponPhys, weaponProps, weaponSystem, weaponTeaches, readyTechniques, groupsOf, groupName } from './data';
import { pressureOf, pressureState, pressureCap, addPressureTo, lowerPressureOf, isPressed, wasSuppressedAt, showPressure, hitPressure } from './pressure';

// ---------- the registry ----------
const HANDLERS: Record<string, TechHandler> = {};
/** Register a technique's handler (one per id; a second registration replaces the first: tests). */
export function technique(h: TechHandler): void {
  HANDLERS[h.id] = h;
  for (const name of Object.keys(h.react || {})) if (!DISPATCHED.has(name)) { DISPATCHED.add(name); onHook(name as HookName, (ctx, cb) => dispatch(name as HookName, ctx, cb)); }
}
const DISPATCHED = new Set<string>();
/** Held Watches and ready Answers hear the fight's hooks through their handler's `react`. A Watch's handler is called
 * for the unit holding it; an Answer's for every unit that has it usable. Never in a preview. */
function dispatch(name: HookName, ctx: any, cb: Combat): void {
  if (!ctx || ctx.preview || cb.over) return;
  const rng: Rng | undefined = ctx.rng || boundGame()?.rng; if (!rng) return;
  for (const u of [...cb.units]) {
    if (!alive(u)) continue;
    const w = (u as any).watch as HeldWatch | undefined;
    // unheld: a unit in the middle of a technique used with a grenade reacts with the weapon really in its hand. The line
    // chosen when it was held, every named ally (Cover Me's Auto names two) and the arrow it names go with it; a step no
    // held Watch hears (ctx.noWatch: Shift) wakes none.
    if (w && TECHNIQUE[w.id] && !ctx.noWatch) { const fn = HANDLERS[w.id]?.react?.[name]; if (fn) unheld(u, () => fn(ctx, buildTech(cb, u, TECHNIQUE[w.id], { hand: w.hand, tile: w.tile, allyId: w.allyId, targetId: w.targetId, ...(w.allyIds ? { allyIds: w.allyIds } : {}), ...(w.line ? { line: w.line } : {}), ...(w.ammo ? { ammo: w.ammo } : {}) }, rng, false))); }
    for (const h of Object.values(HANDLERS)) {
      const def = TECHNIQUE[h.id], fn = h.react?.[name]; if (!fn || def?.group !== 'answer' || !alive(u)) continue;
      const hand = hasUsable(u, 'main', h.id) ? 'main' : hasUsable(u, 'off', h.id) ? 'off' : null; if (!hand) continue;
      unheld(u, () => fn(ctx, buildTech(cb, u, def, { hand }, rng, false)));
    }
  }
}
export const handlerOf = (id: string): TechHandler | null => HANDLERS[id] || null;
export const NOT_BUILT = 'Not built yet.';

// ---------- this turn ----------
/** A stamp for "this turn of this unit": the round and the turn index. */
export const turnStamp = (cb: Combat) => cb.round + '.' + cb.turn;
/** The user's melee chain this turn: how many melee techniques, the last one, and whether a Finisher ended it. */
export function chainOf(cb: Combat, u: Unit): { t: string; n: number; last: string | null; ended: boolean } {
  const c = u.chain; return c && c.t === turnStamp(cb) ? c : { t: turnStamp(cb), n: 0, last: null, ended: false }; // reading writes nothing
}
/** The chain to write to (kept on the unit). */
function chainFor(cb: Combat, u: Unit) { const c = chainOf(cb, u); u.chain = c; return c; }
/** Per-technique state on a unit (plain JSON, saved with the fight). */
export const techState = (u: Unit, id: string): Record<string, any> => ((u.tech ||= {})[id] ||= {});
/** The same, for reading: nothing is created. */
export const techStateOf = (u: Unit, id: string): Record<string, any> => u.tech?.[id] || {};

// ---------- Momentum (the melee meter) ----------
const holdsMelee = (u: Unit) => weaponSystem(u.weapon) === 'melee' || (!!u.offWeapon && weaponSystem(u.offWeapon) === 'melee');
/** Every unit with a melee weapon in a hand has Momentum (cap 3; a class that lists Momentum keeps its own cap). */
export function ensureMomentum(u: Unit): void {
  if (!holdsMelee(u)) return;
  const rm = (u.resMax ||= {}), r = (u.res ||= {});
  if (rm.momentum == null) { rm.momentum = PHYS_RULES.momentum.max; r.momentum ??= 0; }
}
export const momentumOf = (u: Unit) => resOf(u, 'momentum');
function momentumFx(cb: Combat, u: Unit, was: number) { const now = momentumOf(u); if (now !== was) emitFx(cb, 'momentum', { unit: u.id, now, was }); }
/** Finishers: spend all Momentum; returns what was spent. In a preview it only reports. */
export function spendMomentum(t: Tech): number {
  const n = momentumOf(t.u); if (t.preview) { t.pv.momentum = { now: n, after: 0 }; return n; }
  if (t.u.res) t.u.res.momentum = 0; momentumFx(t.cb, t.u, n); return n;
}
/** A technique that worked without a damaging strike (Feint, a Link), or extra Momentum: +n, and the variety bonus once
 * per technique when it differs from the last one used this turn. */
export function landed(t: Tech, n = 1): number {
  if (t.def.system !== 'melee') return 0;
  const was = momentumOf(t.u), bonus = varietyBonus(t);
  if (t.preview) { const max = t.u.resMax?.momentum ?? PHYS_RULES.momentum.max; t.pv.momentum = { now: t.pv.momentum?.now ?? was, after: Math.min(max, (t.pv.momentum?.after ?? was) + n + bonus) }; return n + bonus; }
  ensureMomentum(t.u); const got = resGain(t.u, 'momentum', n + bonus); momentumFx(t.cb, t.u, was); return got;
}
/** +1 the first time this technique earns Momentum, if it isn't the technique the user used last this turn. The first
 * melee technique of a turn earns none (there is no last one). */
function varietyBonus(t: Tech): number {
  const st = scratch(t); if (st.variety) return 0; st.variety = true;
  const ch = chainOf(t.cb, t.u); return ch.last && ch.last !== t.def.id ? PHYS_RULES.momentum.variety_bonus : 0;
}
/** Guard: Momentum doesn't drop at the end of this turn. */
export function holdMomentum(t: Tech): void { if (!t.preview) t.u.attackedTurn = true; }

/** Scratch notes for one use of a technique (never saved). */
const scratch = (t: Tech): Record<string, any> => (t as any)._s || ((t as any)._s = {});

// ---------- the Tech a handler gets ----------
const lineMatches = (props: string[], l: TechLine) => (l.match === 'all' ? l.props.every((p) => props.includes(p)) : l.props.some((p) => props.includes(p)));
/** Off its home: a particular technique with a weapon that has none of its home properties. */
export const offHome = (def: TechDef, weaponId: string) => def.particular && !def.home.some((p) => weaponProps(weaponId).includes(p));
/** The lines that apply with this weapon: the chosen (or first) bonus line, and every stacking line. */
export function linesFor(def: TechDef, weaponId: string, choice?: string, u?: Unit | null): { main: TechLine | null; stack: TechLine[]; choices: TechLine[] } {
  if (offHome(def, weaponId)) return { main: null, stack: [], choices: [] };
  // a line marked when: 'braced' applies only to a user who is Braced, Prone or Emplaced (asked with a unit)
  const met = (l: TechLine) => !u || l.when !== 'braced' || !!u.braced || !!u.prone || condOn(u, 'emplaced');
  const props = weaponProps(weaponId), all = def.lines.filter((l) => lineMatches(props, l) && met(l));
  const bonus = all.filter((l) => !l.stack), stack = all.filter((l) => l.stack);
  const main = bonus.find((l) => choice && l.props.includes(choice)) || bonus[0] || null;
  return { main, stack, choices: bonus };
}
function newPreview(def: TechDef): TechPreview { return { ok: true, why: null, id: def.id, ap: 0, rounds: 0, attacks: [], notes: [] }; }
function buildTech(cb: Combat, u: Unit, def: TechDef, args: TechArgs, rng: Rng, preview: boolean): Tech {
  const hand: 'main' | 'off' = args.hand === 'off' && u.offWeapon ? 'off' : 'main';
  const weaponId = hand === 'off' ? u.offWeapon! : u.weapon, w = WEAPON[weaponId] || WEAPON.fists, props = weaponProps(weaponId), off = offHome(def, weaponId);
  const lf = linesFor(def, weaponId, args.line, u), applying = [lf.main, ...lf.stack].filter(Boolean) as TechLine[];
  const tgt = args.targetId ? cb.units.find((x) => x.id === args.targetId) || null : null;
  const pv = newPreview(def);
  const t: Tech = {
    cb, u, c: u.companion ? null : charOfUnit(u), def, w, weaponId, hand, args, tgt, rng, preview, pv,
    wield: (args as any)._w === 'throwable' ? 'throwable' : (args as any)._w === 'stowed' ? 'drawn' : hand,
    has: (p) => !off && props.includes(p) && applying.some((l) => l.props.includes(p)),
    holds: (p) => props.includes(p),
    line: (...ps) => (off ? null : ps.find((p) => applying.some((l) => l.props.includes(p)) && props.includes(p)) || null),
    num: (k, fb = 0) => (typeof def.numbers?.[k] === 'number' ? def.numbers[k] : fb),
    note: (text) => { pv.notes.push(text); },
    state: () => (preview ? { ...techStateOf(u, def.id) } : techState(u, def.id)), // a preview gets a copy: nothing it writes is kept
  };
  return t;
}

// ---------- cost and who may use what ----------
/** A technique's AP with this weapon and line. */
export function techniqueAp(def: TechDef, weaponId: string, choice?: string, u?: Unit | null): number {
  const w = WEAPON[weaponId] || WEAPON.fists;
  const fx: any = (w as any).grants?.effect || {};
  const base = def.ap.base === 'reaction' ? 0 : def.id === 'aimed_shot' && fx.op === 'aimed_ap' ? fx.value // the crossbow's Bolt Rest
    : def.ap.base === 'flat' ? def.ap.value || 0 : attackApCost(w, isMelee(w) ? 'melee' : 'shot') + (def.ap.add || 0);
  const lf = linesFor(def, weaponId, choice, u);
  return Math.max(0, base + [lf.main, ...lf.stack].reduce((n, l) => n + (l?.ap || 0), 0));
}
/** A technique's AP for this unit now: its own cost, then what the unit's items do to an attack's AP (Southern Fist's
 * +1 with a weapon, Fire Discipline's first burst), asked the way the engine's own attacks ask ('attack_preview' with
 * the cost and a mode). Weapon-priced techniques ask as a melee strike or a shot; a flat one asks only when the data
 * names a mode (`ap.mode`: aimed, burst, auto). The main hand only: the items read the weapon in it. */
export function apFor(cb: Combat, u: Unit, def: TechDef, hand: 'main' | 'off', choice?: string, tgt?: Unit | null): number {
  const weaponId = hand === 'off' && u.offWeapon ? u.offWeapon : u.weapon, own = techniqueAp(def, weaponId, choice, u);
  const mode = (def.ap as any).mode || (def.ap.base === 'weapon' ? (def.system === 'melee' ? 'melee' : 'shot') : null);
  if (!mode || hand === 'off' || def.ap.base === 'reaction') return own;
  const hk: any = { att: u, tgt: tgt || u, mode, melee: mode === 'melee', ap: own, reach: 1, ignoreCover: false, terms: [], fail: null, free: false, preview: true, volleyCost: true, cb, mods: cb.mods || [] };
  emit(cb, 'attack_preview', hk); return Math.max(0, hk.ap);
}
/** The techniques a unit may use with the weapon in this hand, and how it has each: free, lent by the weapon, coming
 * with a property, or ready. A unit with no character (an enemy, a companion) has the free ones, what its weapon lends
 * and gives, and its stat block's list (u.techs). */
export function usable(cb: Combat | null, u: Unit, hand: 'main' | 'off', wield?: 'stowed' | 'throwable'): { id: string; how: 'free' | 'lent' | 'comes' | 'ready' }[] {
  const weaponId = hand === 'off' ? u.offWeapon : u.weapon; if (!weaponId) return [];
  const sys = weaponSystem(weaponId), props = weaponProps(weaponId), c = u.companion ? null : charOfUnit(u);
  // A companion, a puppet or a unit with a fixed action list (the drone) has the free techniques its list allows, and
  // nothing else: the reducer refuses the rest (game.ts).
  const plainOnly = !!u.companion || !!u.allowedActions || condOn(u, 'puppeted');
  const ready = new Set(plainOnly ? [] : c ? readyTechniques(c, sys) : ((u as any).techs as string[]) || []), lent = plainOnly ? null : weaponTeaches(weaponId);
  const OLD: Record<string, string> = { shot: 'shot', aimed_shot: 'aimed', cut: 'melee', overwatch: 'overwatch' };
  const out: { id: string; how: 'free' | 'lent' | 'comes' | 'ready' }[] = [];
  for (const d of TECHNIQUES) {
    if (d.system !== sys) continue;
    // A technique that draws its weapon is used with a stowed one, never with the one in the hand; with a carried
    // throwable as the weapon, only what the throwable lends and what has a line for one of its properties, and never
    // a Watch (a held shot is held with the weapon in the hand).
    if (!!d.needs.stowed !== (wield === 'stowed')) continue;
    if (wield === 'throwable' && (d.free || d.group === 'watch' || !(lent === d.id || d.home.some((p) => props.includes(p)) || d.lines.some((l) => l.props.some((p) => props.includes(p)))))) continue;
    if (d.free) { if (!u.allowedActions || u.allowedActions.includes(OLD[d.id])) out.push({ id: d.id, how: 'free' }); }
    else if (ready.has(d.id)) out.push({ id: d.id, how: 'ready' });
    else if (lent === d.id) out.push({ id: d.id, how: 'lent' });
    else if (!plainOnly && d.comes_with.some((p) => props.includes(p))) out.push({ id: d.id, how: 'comes' });
  }
  return out;
}
const hasUsable = (u: Unit, hand: 'main' | 'off', id: string, wield?: 'stowed' | 'throwable') => usable(null, u, hand, wield).some((x) => x.id === id);
/** Why this unit can't start this technique now, before any target is looked at (null: it can). */
function gate(cb: Combat, u: Unit, def: TechDef, args: TechArgs): string | null {
  const hand: 'main' | 'off' = args.hand === 'off' && u.offWeapon ? 'off' : 'main', weaponId = hand === 'off' ? u.offWeapon! : u.weapon;
  const props = weaponProps(weaponId);
  const wield = (args as any)._w as 'stowed' | 'throwable' | undefined;
  if (weaponSystem(weaponId) !== def.system) return wield === 'stowed' ? 'That isn\'t a ' + def.system + ' weapon.' : def.system === 'melee' ? 'Needs a melee weapon in that hand.' : 'Needs a ranged weapon in that hand.'; // a weapon from the pack isn't in a hand yet
  if (def.needs.stowed && wield !== 'stowed') return 'Pick the weapon to draw.';
  if (!hasUsable(u, hand, def.id, wield)) return wield === 'throwable' ? def.name + ' can\'t be used with that.' : 'You don\'t have ' + def.name + ' ready.';
  const bad = (def.not_with || []).find((p) => props.includes(p)); if (bad) return 'Not available with ' + (/^[aeiou]/.test(bad) ? 'an ' : 'a ') + bad + ' weapon.';
  if (def.group === 'answer') return def.name + ' is a reaction: it fires on its trigger.';
  if (def.system === 'melee') {
    const ch = chainOf(cb, u);
    if (ch.ended) return 'Your chain has ended: a Finisher is the last melee technique of a turn.';
    if (def.group === 'opener' && ch.n > 0) return 'An Opener is only the first melee technique of your turn.';
    if (def.group === 'finisher' && momentumOf(u) < (def.needs.momentum || 2)) return 'Needs Momentum ' + (def.needs.momentum || 2) + '.';
  }
  if (def.group === 'watch' && isPressed(u)) return 'You are Pressed: you can\'t hold a shot.';
  if (def.group === 'watch' && (u as any).noWatch === cb.round) return 'Head down: no held shot this round.';
  if (def.group === 'take' && techStateOf(u, '_take').t === turnStamp(cb)) return 'One Take a turn.';
  if (def.needs.hidden && !u.hidden) return 'Only from Hidden.';
  const ap = apFor(cb, u, def, hand, args.line, args.targetId ? cb.units.find((x) => x.id === args.targetId) : null); if (u.ap < ap) return 'Needs ' + ap + ' AP.';
  const w = WEAPON[weaponId];
  if (wield === 'throwable') { const need = def.rounds === 'all' ? 1 : Math.max(1, def.rounds); if (u.ammo < need) return 'Needs ' + need + ', you carry ' + u.ammo + '.'; }
  if (def.system === 'ranged' && w?.magazine != null && !u.infiniteAmmo) {
    const have = hand === 'off' ? u.offAmmo ?? 0 : u.ammo, need = def.rounds === 'all' ? 1 : def.rounds;
    if (need > 0 && have < need) return have ? 'Needs ' + need + ' rounds, ' + have + ' loaded.' : props.includes('drawn') ? 'The quiver is empty.' : 'Empty: reload first.'; // a quiver can't be refilled in a fight
    if (def.needs.last_round && have !== 1) return props.includes('drawn') ? 'Only with the last arrow in the quiver.' : 'Only with the last round in the weapon.'; // a Drawn weapon's u.ammo is its quiver's total (ranged/quiver.ts)
    if (need > 0 && u.jammed && hand === 'main') return 'Jammed: clear it first.';
  }
  return null;
}
/** Target rules the core owns: a Take needs a Pressed target. */
function targetGate(t: Tech): string | null {
  if (t.def.group === 'take') { if (!t.tgt) return 'Pick a target.'; if (!isPressed(t.tgt)) return t.tgt.name + ' isn\'t Pressed.'; }
  if ((t.def.aim === 'enemy' || t.def.aim.startsWith('enemy')) && t.args.targetId && !t.tgt) return 'Pick a target.';
  return null;
}

// ---------- strike: one attack through the engine's attack pipeline ----------
interface Active { t: Tech; o: StrikeOpts; tgt: Unit; real: Unit | null }
const ACTIVE: Active[] = [];
const cur = (att?: Unit) => { const a = ACTIVE[ACTIVE.length - 1]; return a && (!att || a.t.u === att) ? a : null; };
/** Run fn with the technique's hand as the unit's weapon (the off hand is swapped in, as a paired attack does). */
function inHand<T>(t: Tech, fn: () => T): T {
  const u = t.u; if (t.hand !== 'off' || !u.offWeapon) return fn();
  const ow = WEAPON[u.offWeapon], keep = { weapon: u.weapon, ammo: u.ammo, attack: u.attack, dur: u.dur, maxDur: u.maxDur, mods: u.mods, ammoType: u.ammoType, jammed: u.jammed, heat: u.heat };
  const pts = (t.c?.skills as any)?.[weaponPhys(ow.id).hits_with];
  u.weapon = ow.id; u.ammo = u.offAmmo ?? (ow.magazine ?? 0); u.maxDur = 0; u.mods = []; u.ammoType = (u as any).offAmmoType ?? null; u.jammed = false;
  if (typeof pts === 'number') u.attack = mod(pts);
  try { return fn(); } finally { if (!t.preview) u.offAmmo = u.ammo; const heat = u.heat; Object.assign(u, keep); if (!t.preview) u.heat = heat; }
}
/** The rounds a technique uses (the ranged lane: Load Special's chambered round, sets.ts; the quiver's arrows, quiver.ts).
 * pick: the ammo type this strike fires (null type: standard), or null to leave it alone. It runs in previews too,
 * where it changes no game state. The first registration that picks a round wins. fromMag false: the round doesn't come out of
 * the magazine (the strike's round is given back; a preview doesn't count it). fired: a real attack used the round.
 * done: after every strike it picked for, preview or refusal included, once u.ammoType is put back. spent: after
 * spendRounds takes n rounds out of the weapon (never in a preview), for every registration. */
export interface StrikeRound {
  pick?(t: Tech, tgt: Unit): { type: string | null; fromMag?: boolean } | null;
  fired?(t: Tech, tgt: Unit, type: string | null): void;
  done?(t: Tech, tgt: Unit): void;
  spent?(t: Tech, n: number): void;
}
const ROUNDS: StrikeRound[] = [];
export const strikeRound = (r: StrikeRound) => { ROUNDS.push(r); };
function roundFor(t: Tech, tgt: Unit): { type: string | null; fromMag?: boolean; by: StrikeRound } | null {
  for (const r of ROUNDS) { const p = r.pick?.(t, tgt); if (p) return { ...p, by: r }; }
  return null;
}
/** One attack. Melee hits add Momentum (and the variety bonus) and ranged hits add Pressure by the rules: handlers
 * don't. In a preview it records the roll's chance and damage and returns hit: false. */
export function strike(t: Tech, o: StrikeOpts = {}): StrikeResult {
  const tgt = o.target || t.tgt; if (!tgt) return { ok: false, why: 'Pick a target.', hit: false, crit: false, dmg: 0, killed: false, pct: 0, target: null };
  const mode: 'melee' | 'shot' | 'aimed' | 'thrown' = o.thrown ? 'thrown' : o.mode || (t.def.system === 'melee' ? 'melee' : 'shot'), u = t.u, st = scratch(t);
  if (t.def.group === 'take') o = { ...o, noPressure: true }; // a Take spends Pressure; its hit adds none
  if (o.noMomentum) st.noMomentum = true; if (o.noPressure) st.noPressure = true;
  if (!alive(u)) return { ok: false, why: 'Out of the fight.', hit: false, crit: false, dmg: 0, killed: false, pct: 0, target: tgt };
  const act: Active = { t, o, tgt, real: null };
  ACTIVE.push(act);
  try {
    return inHand(t, () => {
      const offTurn = active(t.cb) !== u; // a reaction: no Recoil from the shots of the user's own turn
      const noRecoil = offTurn || !!o.volley || !!o.noRecoil, fires = mode !== 'melee' && mode !== 'thrown';
      // the round this strike fires (Load Special, the quiver): on the gun for the roll, put back after
      const rd = fires ? roundFor(t, tgt) : null, type0 = u.ammoType; if (rd) u.ammoType = rd.type;
      try {
        // A thrown weapon is aimed with Dexterity, whatever the weapon hits with (a unit with no sheet uses its own bonus).
        const atk0 = u.attack; if (o.thrown && t.c) u.attack = mod((t.c.skills as any).dexterity || 0);
        // In a preview nothing has been spent yet: the rolls this technique has already shown count as fired (rounds,
        // Heat, and Recoil unless the technique is one volley), so each later roll's card is the roll it will be.
        const n = t.preview && fires ? st.rolls || 0 : 0, keep = { ammo: u.ammo, heat: u.heat, shots: u.shotsThisTurn, jammed: u.jammed };
        if (n) {
          if (t.w.magazine != null && !u.infiniteAmmo) u.ammo = Math.max(0, u.ammo - n); if (t.w.heat_limit && !u.infiniteAmmo) u.heat += n; u.shotsThisTurn += n;
          // the earlier rolls reach the Heat limit: the gun jams and the later ones are never fired (the main hand: an off-hand gun's jam isn't kept)
          if (t.hand !== 'off' && t.w.heat_limit && !u.infiniteAmmo && canJam(t.w) && u.heat >= heatLimit(u, t.w)) u.jammed = true;
        }
        let pv: ReturnType<typeof previewAttack>;
        try { pv = previewAttack(t.cb, u, tgt, mode, { free: true, noRecoil }); } finally { if (n) { u.ammo = keep.ammo; u.heat = keep.heat; u.shotsThisTurn = keep.shots; u.jammed = keep.jammed; } if (t.preview) u.attack = atk0; }
        if (pv.ok && fires) st.rolls = (st.rolls || 0) + 1;
        if (t.preview && pv.ok && mode !== 'melee') (st.far ||= []).push(tgt.id); // a ranged or thrown roll: its hit gives Pressure (the card shows it)
        if (t.preview || !pv.ok) { u.attack = atk0; if (t.preview) { t.pv.attacks.push({ target: tgt.id, pv }); if (pv.ok && fires && t.w.magazine != null && !u.infiniteAmmo && rd?.fromMag !== false) t.pv.rounds += 1; } return { ok: pv.ok, why: pv.why, hit: false, crit: false, dmg: 0, killed: false, pct: pv.ok ? pv.pct : 0, target: tgt }; }
        const m0 = momentumOf(u), su = (u as any).setUp;
        if (su && su.t === turnStamp(t.cb) && su.target === tgt.id) st.usedSetUp = true;
        st.struck = (st.struck || 0) + 1;
        let r: ReturnType<typeof resolveAttack>;
        // a volley's rounds are numbered and named, as the engine's own burst and full auto are (Fire Discipline, Spray and Pray)
        // (o.vi: a handler that runs its own volley numbers it; quiet: a Hidden user stays Hidden; noWear: a later roll of one attack action)
        const vi = o.volley ? (st.vol = (st.vol ?? -1) + 1) : o.vi ?? 0, ro: any = { ...(noRecoil ? { noAp: true } : { free: true }), vi, ...(o.quiet ? { quiet: true } : {}), ...(o.noWear ? { noWear: true } : {}) };
        const roll = () => resolveAttack(t.cb, t.rng, u, tgt, mode, t.c, ro);
        try { r = o.volley ? asVolley(typeof o.volley === 'string' ? o.volley : 'technique', roll) : roll(); } finally { u.attack = atk0; }
        if (r.refused) return { ok: false, why: r.refused, hit: false, crit: false, dmg: 0, killed: false, pct: 0, target: tgt };
        if (r.cancelled) { st.cancelled = true; return { ok: true, hit: false, crit: false, dmg: 0, killed: false, pct: pv.pct, target: tgt, cancelled: true }; } // a reaction ended it before the roll: not a miss, no riders
        if (rd) { if (rd.fromMag === false && t.w.magazine != null && !u.infiniteAmmo) u.ammo += 1; rd.by.fired?.(t, tgt, rd.type); } // a round not from the magazine: the magazine stays as it was
        if (t.def.system === 'melee') {
          if (o.noMomentum) { if (u.res) u.res.momentum = m0; }
          else if (r.hit) { ensureMomentum(u); if (o.thrown) resGain(u, 'momentum', 1); const b = varietyBonus(t); if (b) resGain(u, 'momentum', b); } // the engine adds the +1 for a melee hit; a thrown weapon's is added here
          momentumFx(t.cb, u, m0);
        }
        // the unit the attack was really made against (Confused, a captive held as a shield, Duck and Roll): riders follow it
        return { ok: true, hit: r.hit, crit: r.crit, dmg: r.damage, killed: r.killed, pct: pv.pct, target: act.real || tgt };
      } finally { if (rd) { u.ammoType = type0; rd.by.done?.(t, tgt); } }
    });
  } finally { ACTIVE.pop(); }
}
// The hooks strike shapes the attack through. They read ACTIVE and never run for anyone else's attack.
onHook('attack_preview', (ctx: any) => {
  const a = cur(ctx.att);
  if (a) {
    if (a.o.extra) ctx.terms.push({ v: a.o.extra, label: a.o.label || a.t.def.name });
    if (a.o.ignoreCover) ctx.ignoreCover = true;
    if (a.o.reach) ctx.reach = Math.max(ctx.reach || 0, a.o.reach);
    if (offHome(a.t.def, a.t.weaponId)) ctx.terms.push({ v: -PHYS_RULES.off_home_penalty, label: a.t.def.name + ' off its home weapon' });
  }
  // A set-up mark (Feint, Sidestep): the user's next technique against that target this turn.
  const su = (ctx.att as any).setUp; if (su && su.t === turnStamp(ctx.cb) && su.target === ctx.tgt.id && su.hit && (!a || !su.only || su.only.includes(a.t.def.id))) ctx.terms.push({ v: su.hit, label: su.label || 'set up' });
  // Pressed (rules 1.12): −1 to hit with ranged attacks. Melee swings are not affected.
  if (!ctx.melee && isPressed(ctx.att)) ctx.terms.push({ v: PHYS_RULES.pressure.pressed_ranged_hit, label: 'Pressed' });
});
onHook('attack_roll', (ctx: any) => {
  const a = cur(ctx.att); if (!a) return;
  if (!a.real) a.real = ctx.tgt; // after any redirect; the first roll of this strike (a cone's other rolls come later)
  if (a.o.critMin) ctx.critMin = Math.min(ctx.critMin, a.o.critMin);
  // "a hit is a critical": only a roll that would hit anyway is raised
  if (a.o.critOnHit && ctx.die !== 1 && ctx.die + ctx.toHit >= ctx.need) ctx.critMin = Math.min(ctx.critMin, ctx.die);
});
onHook('damage_out', (ctx: any) => {
  const a = cur(ctx.att); if (!a) return;
  if (a.o.mult != null && a.o.mult !== 1) ctx.mults.push({ v: a.o.mult, label: a.o.label || a.t.def.name });
  // armour this strike ignores, against the unit really struck (nobody's armour is changed)
  if (a.o.ignoreArmour === true) ctx.ignoreArmour = true; else if (a.o.ignoreArmour) ctx.pierce = (ctx.pierce || 0) + a.o.ignoreArmour;
});
/** Could the user make this attack now (range, sight, ammunition)? Nothing is rolled or recorded. */
export function canStrike(t: Tech, target: Unit, mode?: 'melee' | 'shot' | 'aimed'): boolean {
  ACTIVE.push({ t, o: {}, tgt: target, real: null });
  try { return inHand(t, () => previewAttack(t.cb, t.u, target, mode || (t.def.system === 'melee' ? 'melee' : 'shot'), { free: true }).ok); } finally { ACTIVE.pop(); }
}
/** True while a strike of this unit asked for no Pressure (pressure.ts reads it in its on_hit). */
export const strikeNoPressure = (att: Unit) => !!cur(att)?.o.noPressure;
/** The technique a unit is striking with right now, if any (pressure.ts, drill.ts). */
export const strikingWith = (att: Unit): Tech | null => cur(att)?.t || null;

// ---------- helpers a handler calls ----------
/** A set-up mark on the user's next technique against a target this turn (strike applies it; spent on use). */
export function setUp(t: Tech, target: Unit, mark: { hit?: number; noAnswer?: boolean; label?: string; only?: string[] }): void {
  if (t.preview) { t.note('Sets up your next technique against ' + target.name + (mark.hit ? ': +' + mark.hit + ' to hit' : '') + (mark.noAnswer ? ', and it can\'t Answer' : '') + '.'); return; }
  (t.u as any).setUp = { t: turnStamp(t.cb), target: target.id, ...mark }; scratch(t).madeSetUp = true;
}
/** May this unit use this Answer now? Protective reactions (Parry) work while Suppressed; the rest don't. */
export function canAnswer(cb: Combat, u: Unit, id: string, against?: Unit): boolean {
  if (!alive(u) || condOn(u, 'stunned')) return false;
  if (against && (against as any).setUp?.noAnswer && (against as any).setUp.target === u.id && (against as any).setUp.t === turnStamp(cb)) return false;
  const protective = id === 'parry';
  if (!protective && pressureOf(u) >= PHYS_RULES.pressure.suppressed) return false;
  if (!hasUsable(u, 'main', id) && !hasUsable(u, 'off', id)) return false;
  const order = (charOfUnit(u) as any)?.phys?.answers as string[] | undefined; if (order && !order.includes(id)) return false;
  return true;
}
/** A save by the target with the better of some skills (or a family: 'body' | 'brain' | 'heart'). True: it saved. In a
 * preview nothing is rolled: the save is listed and the target is taken to fail. tnAdd: positive is harder. */
export function save(t: Tech, target: Unit, skillsOrFam: string[] | 'body' | 'brain' | 'heart', tnAdd = 0): boolean {
  const tn = (PHYS_RULES.stop_tn || 12) + tnAdd, skills = Array.isArray(skillsOrFam) ? skillsOrFam : [skillsOrFam];
  if (t.preview) { (t.pv.saves ||= []).push({ unit: target.id, skills, tn }); return false; }
  const c = target.companion ? null : charOfUnit(target);
  const FAM: Record<string, 'body' | 'brain' | 'heart'> = { guts: 'body', charisma: 'brain', composure: 'heart', body: 'body', brain: 'brain', heart: 'heart' };
  const bonus = Math.max(...skills.map((s) => (FAM[s] && (s === FAM[s] || !c) ? unitSave(target, FAM[s]) : c ? mod((c.skills as any)[s] || 0) : target.attack ?? 0)));
  const r = d20(t.rng), ok = r === 20 || (r !== 1 && r + bonus >= tn);
  t.cb.log.push(target.name + (ok ? ' saves' : ' fails the save') + ' against ' + t.def.name + ' (' + skills.join(' or ') + ' ' + (r + bonus) + ' vs ' + tn + ').');
  return ok;
}
/** Put a condition on a target with the technique as its source. No save unless opts.save. True: it took. */
export function cond(t: Tech, target: Unit, id: string, rounds?: number, opts: { save?: boolean; tnAdd?: number; arg?: any } = {}): boolean {
  if (t.preview) { t.note(target.name + ': ' + id.replace(/_/g, ' ') + (rounds ? ' ' + rounds + (rounds === 1 ? ' round' : ' rounds') : '') + (opts.save ? ' (save)' : '') + '.'); return true; }
  const s = applyCond(t.cb, t.rng, t.u, target, id, rounds, undefined, { skipSave: !opts.save, tnAdd: opts.tnAdd, arg: opts.arg } as any);
  if (s) t.cb.log.push(target.name + s.replace(/^ · /, ': ') + '.');
  return !/resists|untouched|shrugs/.test(s);
}
const stoppedNow = (u: Unit) => ((u as any).stopped || 0) > 0;
/** Pinned, pushed, knocked Prone or halted. One call is one save and one Stopped once, whatever the list holds.
 * Stopped once (Leon): set and checked only by ranged techniques. opts.save: false (none; the caller rolled, or the
 * text says no save), 'default' (Guts or Athletics, the better), or a skill list. Returns true if it took. */
export function stop(t: Tech, target: Unit, how: StopHow | StopHow[], opts: { tiles?: number; rounds?: number; save?: false | 'default' | string[]; tnAdd?: number; apLoss?: number; from?: string;
  /** 'pinned' holds until AP is spent to pull free (pullFree: the unit, or an ally next to it), not for rounds */ untilAp?: number; /** a weapon left in the target, dropped when it is freed */ weapon?: string } = {}): boolean {
  const list = Array.isArray(how) ? how : [how], ranged = t.def.system === 'ranged';
  if (ranged && stoppedNow(target)) { t.note(target.name + ' can\'t be stopped again this round.'); return false; }
  const sv = opts.save === undefined ? 'default' : opts.save;
  if (sv !== false && save(t, target, sv === 'default' ? PHYS_RULES.stop_save : sv, opts.tnAdd || 0)) return false;
  if (t.preview) { t.note(target.name + ': ' + list.map((h) => (h === 'push' ? 'pushed ' + (opts.tiles || 1) : h === 'halt' ? 'stopped' : h)).join(', ') + (opts.apLoss ? ', −' + opts.apLoss + ' AP next turn' : '') + '.'); return true; }
  for (const h of list) {
    if (h === 'pinned' && opts.untilAp) target.nailed = { by: t.u.id, id: t.def.id, ap: opts.untilAp, ...(opts.weapon ? { weapon: opts.weapon } : {}) };
    else if (h === 'pinned') applyCond(t.cb, t.rng, t.u, target, 'pinned', opts.rounds || 1, 'body', { skipSave: true } as any);
    else if (h === 'prone') { if (!target.prone) { target.prone = true; target.braced = false; emitFx(t.cb, 'stance', { unit: target.id, at: target.pos, what: 'prone' }); } }
    else if (h === 'push') forceMove(t, target, 'away', opts.tiles || 1, { from: opts.from });
  }
  if (opts.apLoss) apDebt(target, opts.apLoss);
  // Stopped once: until the end of the target's next turn (rules.ts ticks it down at each of its turn ends; stopped on
  // its own turn by a Watch, this turn's end is the first tick).
  if (ranged) (target as any).stopped = active(t.cb) === target ? 2 : 1;
  emitFx(t.cb, 'stopped', { unit: target.id, how: list.join('+'), by: t.u.id });
  t.cb.log.push(target.name + ' is ' + list.map((h) => (h === 'push' ? 'pushed' : h === 'halt' ? 'stopped' : h)).join(' and ') + ' (' + t.def.name + ').');
  return true;
}
export type StopHow = 'pinned' | 'push' | 'prone' | 'halt';
/** Move a unit against its will, tile by tile, so held Watches and Overwatch fire. dir: 'away' from or 'toward' the user
 * (or opts.from), or a tile to move onto. Returns the tiles moved (0: blocked or it held firm). */
export function forceMove(t: Tech, target: Unit, dir: 'away' | 'toward' | string, tiles: number, opts: { from?: string; how?: string } = {}): number {
  const cb = t.cb, origin = opts.from || t.u.pos;
  const stepTo = (from: string): string | null => {
    const [x, y] = xy(from);
    if (dir !== 'away' && dir !== 'toward') { const [dx, dy] = xy(dir); return x === dx && y === dy ? null : key(x + Math.sign(dx - x), y + Math.sign(dy - y)); }
    const [ox, oy] = xy(origin), s = dir === 'away' ? 1 : -1, nx = x + s * Math.sign(x - ox), ny = y + s * Math.sign(y - oy);
    return nx === x && ny === y ? null : key(nx, ny);
  };
  if (t.preview) { let at = target.pos, n = 0; const blocked = moveBlockers(cb); for (; n < tiles; n++) { const to = stepTo(at); if (!to || bad(cb, to, blocked, target)) break; at = to; } if (n) (t.pv.moves ||= []).push({ unit: target.id, to: at }); return n; }
  let moved = 0; const blocked = moveBlockers(cb);
  for (let i = 0; i < tiles && alive(target); i++) {
    const to = stepTo(target.pos); if (!to || bad(cb, to, blocked, target)) break;
    const fm: any = emit(cb, 'forced_move', { u: target, by: t.u, tiles: 1, to, how: opts.how || t.def.id, cancel: false, cb, rng: t.rng }); if (fm.cancel) break;
    const stopNow = unheld(t.u, () => {
    const was = target.pos; target.pos = to; target.braced = false; moved++;
    emitFx(cb, 'shove', { unit: t.u.id, target: target.id, from: was, to, ok: true });
    // The walk a held shot is waiting for: the new Watches listen on move_step, the old Overwatch on its own call.
    const ms: any = emit(cb, 'move_step', { u: target, from: was, at: to, i, route: [was, to], how: 'forced', stop: false, cb, rng: t.rng, forced: true });
    if (alive(target)) triggerOverwatch(cb, t.rng, target);
    return !!ms.stop;
    });
    if (stopNow) break;
  }
  if (moved) cb.log.push(target.name + ' is moved to ' + refOf(target.pos) + ' (' + t.def.name + ').');
  return moved;
}
const bad = (cb: Combat, to: string, blocked: Set<string>, mover: Unit) => { const [x, y] = xy(to); return x < 0 || y < 0 || x >= cb.map.w || y >= cb.map.h || blocked.has(to) || cb.units.some((v) => v !== mover && !v.dead && v.pos === to); };
/** Rounds a technique burns beyond its rolls. False (with a note) if the weapon can't pay. */
export function spendRounds(t: Tech, n: number): boolean {
  if (t.wield === 'throwable' && n > 0) { // a grenade is the ammunition: one from what the user carries
    const have = t.u.throwables?.[t.weaponId] ?? 0; if (have < n) { t.note('Needs ' + n + ', you carry ' + have + '.'); return false; }
    if (t.preview) { t.pv.rounds += n; return true; }
    t.u.throwables![t.weaponId] = have - n; t.u.ammo = have - n; return true;
  }
  if (t.u.infiniteAmmo || t.w.magazine == null || n <= 0) return true;
  const have = t.hand === 'off' ? t.u.offAmmo ?? 0 : t.u.ammo; if (have < n) { t.note('Needs ' + n + ' rounds, ' + have + ' loaded.'); return false; }
  if (t.preview) { t.pv.rounds += n; return true; }
  if (t.hand === 'off') t.u.offAmmo = have - n; else t.u.ammo = have - n;
  for (const r of ROUNDS) r.spent?.(t, n);
  return true;
}
/** Extra Pressure from a technique (the ordinary +1 for a ranged hit is automatic). Returns what landed. */
export function addPressure(t: Tech, target: Unit, n: number, why: string, opts: { hidden?: boolean } = {}): number {
  const hidden = opts.hidden ?? (t.holds('silent') && !!t.u.hidden);
  if (t.preview) { const prior = (t.pv.pressure || []).filter((x) => x.unit === target.id).reduce((m, x) => Math.max(m, x.after), pressureOf(target)), now = prior, cap = pressureCap(target), after = target.side === t.u.side ? now : Math.min(cap, now + n); (t.pv.pressure ||= []).push({ unit: target.id, add: after - now, after, state: pressureState({ ...target, pressure: after } as any) }); return after - now; }
  return addPressureTo(t.cb, target, n, t.u, why, { hidden });
}
export function lowerPressure(t: Tech, target: Unit, n: number): void { if (!t.preview) lowerPressureOf(t.cb, target, n, t.def.name); }
/** Takes: was the target Suppressed when the Take began. */
export const wasSuppressed = (t: Tech): boolean => !!t.tgt && wasSuppressedAt(t.tgt, (t as any)._p0);
/** Has an ally of the user hit this target this round (Crossfire). */
export const hitByAlly = (t: Tech, target: Unit): boolean => Object.entries(((target as any).hitRound || {}) as Record<string, number>).some(([id, r]) => r === t.cb.round && id !== t.u.id && t.cb.units.find((x) => x.id === id)?.side === t.u.side);

// ---------- a weapon that isn't in the hand ----------
// Two kinds of technique are used with something the unit doesn't hold: one that draws its weapon (needs.stowed: Draw
// Cut, Snap Shot; args.item names the pack entry) and one used with a carried throwable as the weapon (a grenade through
// Lob or Rout; args.item is the throwable's id). For both, the unit is shown holding that weapon while the technique
// is checked, previewed and run, so every helper reads the right properties, AP and numbers. A real draw goes through
// the gear service the reducer registers (the same change a player's draw makes, free of AP).
export interface Wield { kind: 'stowed' | 'throwable'; item: string | number; weaponId: string; ammo: number; entry?: any; /** a stowed weapon: the unit's weapon fields as the draw would leave them */ as?: Record<string, any> }
export interface GearService {
  draw(cb: Combat, u: Unit, item: string | number): string | null;
  /** returns the entry that left the hand (its rarity, wear, mods and name), or null */ lose(cb: Combat, u: Unit, hand: 'main' | 'off', at: string | null): any;
  /** the unit's weapon fields as a draw of this pack entry would leave them, or the draw's refusal; changes nothing */ asDrawn(cb: Combat, u: Unit, item: string | number): Record<string, any> | string;
}
let GEAR: GearService | null = null;
/** game.ts gives the core its gear changes (drawing from the pack, a weapon leaving the hand for a pile). */
export const setGearService = (s: GearService) => { GEAR = s; };
/** The weapons a unit has stowed (pack entries; not throwables), for techniques that draw. */
export function stowedOf(u: Unit): { item: number; weaponId: string; name: string }[] {
  const c = u.companion ? null : charOfUnit(u); if (!c) return [];
  return packOf(c).map((x, i) => ({ x, i })).filter(({ x }) => x.qty > 0 && !x.mags && !!x.weapon && !!WEAPON[x.weapon] && WEAPON[x.weapon].category !== 'thrown').map(({ x, i }) => ({ item: i, weaponId: x.weapon!, name: x.name || WEAPON[x.weapon!].name }));
}
/** A stowed weapon as the thing a technique is used with: the draw's own refusal (a skill it needs, an item that bans
 * it, a hand that can't take it), or the fields the draw would leave. */
function stowedWield(cb: Combat, u: Unit, idx: number, it: any): Wield | string {
  const as = GEAR ? GEAR.asDrawn(cb, u, idx) : 'Nothing to draw it with here.'; if (typeof as === 'string') return as;
  return { kind: 'stowed', item: idx, weaponId: it.weapon, ammo: as.ammo ?? it.loaded ?? 0, entry: it, as };
}
function wieldOf(cb: Combat, u: Unit, def: TechDef, args: TechArgs): Wield | null | string {
  if ((args as any)._w) return null; // already holding it (inside the swap, or after the draw)
  const c = u.companion ? null : charOfUnit(u);
  if (def.needs.stowed) {
    if (args.item == null) return 'Pick the weapon to draw.';
    if (!c) return 'Nothing stowed to draw.';
    const idx = packRef(c, args.item), it = packOf(c)[idx];
    if (!it || !it.weapon || !WEAPON[it.weapon] || WEAPON[it.weapon].category === 'thrown' || it.mags) return 'That isn\'t a stowed weapon.';
    return stowedWield(cb, u, idx, it);
  }
  if (args.item == null) return null;
  const id = String(args.item), w = WEAPON[id];
  if (!w || w.category !== 'thrown') return 'That can\'t be used with a technique.';
  const n = u.throwables?.[id] ?? 0; if (n < 1) return 'You carry no ' + w.name.toLowerCase() + '.';
  return { kind: 'throwable', item: id, weaponId: id, ammo: n };
}
const HELD_FIELDS = ['weapon', 'ammo', 'attack', 'dur', 'maxDur', 'mods', 'ammoType', 'jammed', 'dmgMult'] as const;
const putFields = (u: Unit, v: Record<string, any>) => { for (const k of Object.keys(v)) { if (v[k] === undefined) delete (u as any)[k]; else (u as any)[k] = v[k]; } };
const HOLDS: { u: Unit; keep: Record<string, any>; out: boolean }[] = [];
/** Run fn with the unit holding the wielded weapon in its main hand; everything is put back after. A stowed weapon is
 * shown as the real draw would leave it (wi.as, from the gear service): its own to-hit, rarity and wear, no brace on a
 * different weapon, and not Disarmed (a draw ends that). */
function holding<T>(u: Unit, wi: Wield, fn: () => T): T {
  const c = u.companion ? null : charOfUnit(u), w = WEAPON[wi.weaponId];
  const keep: Record<string, any> = {}; for (const k of HELD_FIELDS) keep[k] = (u as any)[k];
  let braced: boolean | undefined, disarmed: number | undefined, drew = false;
  if (wi.kind === 'stowed' && wi.as) {
    drew = true; braced = u.braced; disarmed = u.conds?.disarmed;
    putFields(u, wi.as); if (wi.as.weapon !== keep.weapon) u.braced = false;
    if (disarmed != null) delete u.conds!.disarmed;
  } else {
    const pts = (c?.skills as any)?.[w.skill];
    putFields(u, { weapon: w.id, ammo: wi.ammo, maxDur: 0, dur: undefined, mods: wi.entry?.mods || [], ammoType: wi.entry?.ammoType ?? null, jammed: false, dmgMult: 1 });
    if (typeof pts === 'number') u.attack = mod(pts);
  }
  const hold = { u, keep, out: false }; HOLDS.push(hold);
  try { return fn(); } finally {
    HOLDS.splice(HOLDS.indexOf(hold), 1); putFields(u, keep);
    if (drew) { if (braced === undefined) delete u.braced; else u.braced = braced; if (disarmed != null) (u.conds ||= {}).disarmed = disarmed; }
  }
}
/** Run fn with a unit's real weapon back in its hand, if it is in the middle of a technique used with something else
 * (its own held shot fires, an opportunity attack is taken). What fn does to the real weapon (a round fired, a jam) is
 * kept. Any other unit: just fn. */
export function unheld<T>(u: Unit, fn: () => T): T {
  const h = [...HOLDS].reverse().find((x) => x.u === u); if (!h || h.out) return fn();
  const held: Record<string, any> = {}; for (const k of Object.keys(h.keep)) held[k] = (u as any)[k];
  putFields(u, h.keep); h.out = true;
  try { return fn(); } finally { for (const k of Object.keys(h.keep)) h.keep[k] = (u as any)[k]; putFields(u, held); h.out = false; }
}
/** The weapon leaves the user's hand as part of the technique (thrown, or left in a target): into the pile on a tile, or
 * nowhere (at: null; whoever holds it now keeps track of it). The user is then unarmed in that hand. */
export function loseWeapon(t: Tech, at: string | null): void {
  if (t.wield === 'throwable') return; // a throwable is spent with spendRounds
  if (t.preview) { t.note(at ? 'The weapon lands at ' + refOf(at) + ': you are unarmed until you pick it up.' : 'The weapon stays there: you are unarmed.'); return; }
  const u = t.u, id = t.hand === 'off' ? u.offWeapon : u.weapon; if (!id || id === 'fists') return;
  if (t.c && GEAR) {
    const e = GEAR.lose(t.cb, u, t.hand, at);
    // left in a target this technique nailed: the weapon's own entry stays with it, and comes back as it was
    if (at === null && e) { const held = t.cb.units.find((v) => v.nailed && v.nailed.by === u.id && v.nailed.weapon === id && !v.nailed.item); if (held) held.nailed!.item = e; }
    return;
  }
  if (at) dropToPile(t.cb, at, [{ id, name: WEAPON[id]?.name || id, qty: 1, kind: 'weapon', weapon: id } as any], 'drop');
  if (t.hand === 'off') delete u.offWeapon; else { u.weapon = 'fists'; u.ammo = 0; u.jammed = false; }
}

// ---------- moving the user ----------
/** Tiles the user could step to within n tiles of movement, nearest first, each with its route. */
export function stepsWithin(t: Tech, n: number): { to: string; route: string[]; d: number }[] {
  const P = paths(t.cb, t.u.pos, t.u.id);
  return Object.keys(P.dist).filter((k) => k !== t.u.pos && P.dist[k] <= n && !t.cb.units.some((v) => v !== t.u && !v.dead && v.pos === k))
    .map((k) => ({ to: k, route: routeTo(P, t.u.pos, k), d: P.dist[k] })).filter((x) => x.route.length).sort((a, b) => a.d - b.d || (a.to < b.to ? -1 : 1));
}
/** Run fn as if the user stood on a tile (a preview of "step, then strike"). Nothing is left changed. */
export function standingAt<T>(t: Tech, tile: string, fn: () => T): T { const was = t.u.pos; t.u.pos = tile; try { return fn(); } finally { t.u.pos = was; } }
/** The step that brings a target into this weapon's reach: args.tile if the player named one (and it works), else the
 * nearest tile within `max` tiles from which the attack can be made. null: no step is needed; false: none works. */
export function approach(t: Tech, target: Unit, max: number, mode: 'melee' | 'shot' = 'melee'): { to: string; route: string[]; d: number } | null | false {
  const can = (tile: string) => standingAt(t, tile, () => inHand(t, () => previewAttack(t.cb, t.u, target, mode, { free: true }).ok));
  const steps = moveBlock(t.u) ? [] : stepsWithin(t, max); // a user who can't move may still strike what is in reach
  if (t.args.tile && t.args.tile !== t.u.pos) { const s = steps.find((x) => x.to === t.args.tile); return s && can(s.to) ? s : false; }
  if (can(t.u.pos)) return null;
  // the fewest tiles; among those, the tile nearest the target in a straight line (a lunge goes straight in)
  const [tx, ty] = xy(target.pos), far = (k: string) => { const [x, y] = xy(k); return Math.hypot(x - tx, y - ty); };
  return [...steps].sort((a, b) => a.d - b.d || far(a.to) - far(b.to) || (a.to < b.to ? -1 : 1)).find((x) => can(x.to)) || false;
}
/** Why the user can't take a step now (Pinned, Grappled, Prone…), or null. */
export const stepBlock = (t: Tech): string | null => moveBlock(t.u);
/** Move the user along a route as part of a technique: no AP and no opportunity attacks (the technique's text says when
 * a step is free of them), but otherwise the engine's own move: a Pinned, Grappled or Prone user doesn't step, traps,
 * hazards and Sigil fields on the way go off, and held shots see each tile. Returns the tiles walked. In a preview it
 * only records where the user would end. */
export function stepUser(t: Tech, route: string[], opts: { /** move this unit, not the user: it runs as its own movement (Rout) */ unit?: Unit; /** the walk draws opportunity attacks */ oa?: boolean } = {}): number {
  const u = opts.unit || t.u, cb = t.cb; if (!route.length) return 0;
  if (t.preview) { if (moveBlock(u)) return 0; (t.pv.moves ||= []).push({ unit: u.id, to: route[route.length - 1] }); return route.length; }
  let n = 0;
  for (const k of route) {
    if (!alive(u) || moveBlock(u)) break;
    const was = u.pos;
    if (unheld(t.u, () => moveUnit(cb, u, k, t.rng, 'move', { shortest: true, free: true, oa: !!opts.oa }))) break; // free: the items are told before they price it; unheld: reactions on the way see the user's real weapon
    if (u.pos === was) break; n++;
    if (u.pos !== k) break; // stopped short (a trap, a held shot)
  }
  return n;
}

// ---------- held shots and Answers ----------
/** Hold a Watch: paid for now, kept until it fires or the user's next turn. One at a time (a new one replaces it). */
export function holdWatch(t: Tech, spec: WatchSpec): void {
  if (t.preview) { t.note('Held until your next turn. Fires as your reaction when ' + (t.def.trigger || 'its trigger happens') + '.'); if (spec.tiles || spec.tile) t.pv.area = spec.tiles || [spec.tile!]; return; }
  endWatch(t.cb, t.u, 'replaced'); t.u.overwatch = null;
  const w: HeldWatch = { id: t.def.id, hand: t.hand, ap: t.pv.ap, r: t.cb.round, ...(t.args.line ? { line: t.args.line } : {}), ...(t.args.ammo ? { ammo: t.args.ammo } : {}), ...spec };
  (t.u as any).watch = w;
  // a held shot the other side can't see being set is its holder's side's to know (viewFor drops an event marked `only`)
  emitFx(t.cb, 'watch_set', { unit: t.u.id, at: t.u.pos, id: w.id, trigger: w.trigger, tile: w.tile || null, tiles: w.tiles || (w.tile ? [w.tile] : []), allyId: w.allyId || null, targetId: w.targetId || null,
    ...(sideSees(t.cb, t.u.side === 'pc' ? 'foe' : 'pc', t.u) ? {} : { only: t.u.side }) });
}
/** Drop a held Watch (the user's next turn, Pressed, smoke, a flashbang). */
export function endWatch(cb: Combat, u: Unit, why: string): void {
  const w = (u as any).watch as HeldWatch | undefined; if (!w) return;
  delete (u as any).watch; emitFx(cb, 'watch_end', { unit: u.id, at: u.pos, id: w.id, why });
  if (why !== 'replaced' && why !== 'fired' && why !== 'turn') cb.log.push(u.name + ' loses the held shot (' + why + ').');
}
/** A held Watch's trigger has happened: spend the reaction and run fn (the strikes). False when the user can't react
 * now (Pressed, no reaction left, an item cancels it): the Watch stays held. kind 'overwatch' keeps the old Overwatch's
 * reaction window and event, so every perk written for it still applies. */
export function fireWatch(t: Tech, ctx: any, target: Unit, fn: () => void, kind: 'watch' | 'overwatch' = 'watch'): boolean {
  const u = t.u, cb = t.cb, w = (u as any).watch as HeldWatch | undefined;
  if (t.preview || !w || w.id !== t.def.id || !alive(u) || isPressed(u) || !canReact(cb, u)) return false;
  const rw: any = emit(cb, 'reaction_window', { reactor: u, mover: target, kind, id: w.id, cancel: false, at: target.pos, cb, rng: t.rng }); if (rw.cancel) return false;
  ctx?.flush?.(); // the mover's walk so far plays before the shot
  useReaction(cb, u); delete (u as any).watch;
  emitFx(cb, kind === 'overwatch' ? 'overwatch' : 'watch_fire', { unit: u.id, target: target.id, from: u.pos, at: target.pos, id: w.id, mode: 'shot' });
  cb.log.push(u.name + (kind === 'overwatch' ? ' fires from overwatch.' : ' fires the held shot (' + t.def.name + ').'));
  fn(); checkOver(cb);
  return true;
}
/** An Answer's trigger has happened: spend the reaction and run fn. False when this unit can't answer now. */
export function answer(t: Tech, against: Unit | null, fn: () => void): boolean {
  const u = t.u, cb = t.cb;
  if (t.preview || !canAnswer(cb, u, t.def.id, against || undefined) || !canReact(cb, u)) return false;
  const rw: any = emit(cb, 'reaction_window', { reactor: u, mover: against, kind: 'answer', id: t.def.id, cancel: false, at: u.pos, cb, rng: t.rng }); if (rw.cancel) return false;
  useReaction(cb, u);
  emitFx(cb, 'technique', { unit: u.id, id: t.def.id, group: 'answer', system: t.def.system, target: against?.id || null, hand: t.hand, at: u.pos, reaction: true });
  cb.log.push(u.name + ' answers with ' + t.def.name + '.');
  fn(); checkOver(cb);
  return true;
}

// ---------- the reducer's and the screen's entry points ----------
function prepare(cb: Combat, u: Unit, id: string, args: TechArgs, rng: Rng, preview: boolean): { t: Tech | null; why: string | null; h: TechHandler | null } {
  const def = TECHNIQUE[id]; if (!def) return { t: null, why: 'No such technique.', h: null };
  const g = gate(cb, u, def, args); if (g) return { t: null, why: g, h: null };
  const h = handlerOf(id); if (!h) return { t: null, why: NOT_BUILT, h: null };
  const t = buildTech(cb, u, def, args, rng, preview); (t as any)._p0 = t.tgt ? pressureOf(t.tgt) : 0;
  t.pv.ap = apFor(cb, u, def, t.hand, args.line, t.tgt);
  return { t, why: targetGate(t) || h.check?.(t) || null, h };
}
/** A handler's own score for the enemy AI: how much this unit wants the technique now (a plain attack is 5; 0: never),
 * and the arguments it would use if it chose them itself. Pure: the Tech is a preview. */
export function aiScore(cb: Combat, u: Unit, id: string, args: TechArgs): { score: number; args: TechArgs } {
  const def = TECHNIQUE[id], h = handlerOf(id); if (!def || !h?.ai) return { score: 0, args };
  const r = h.ai(buildTech(cb, u, def, args, { state: 1 }, true));
  return typeof r === 'number' ? { score: r, args } : { score: r.score, args: { ...args, ...r.args } };
}
/** Run fn with a game bound, when one is given (the client calls the screen's functions with its view of the room: the
 * character behind a unit is found through the bound game). */
function withG<T>(g: any, fn: () => T): T { if (!g) return fn(); const was = bindGame(g); try { return fn(); } finally { bindGame(was); } }
/** What the technique would do, changing nothing (the card, the AI). Pass the game (`g`) when none is bound: the screen does. */
export function previewTechnique(cb: Combat, u: Unit, id: string, args: TechArgs = {}, g?: any): TechPreview {
  if (g) return withG(g, () => previewTechnique(cb, u, id, args));
  { // a weapon that isn't in the hand: the card is worked out as if it were
    const def0 = TECHNIQUE[id], wi = def0 ? wieldOf(cb, u, def0, args) : null;
    if (typeof wi === 'string') return { ok: false, why: wi, id, ap: 0, rounds: 0, attacks: [], notes: [] };
    if (wi) return holding(u, wi, () => previewTechnique(cb, u, id, { ...args, hand: 'main', _w: wi.kind } as TechArgs));
  }
  const def = TECHNIQUE[id], blank = (why: string): TechPreview => ({ ok: false, why, id, ap: def ? apFor(cb, u, def, args.hand === 'off' && u.offWeapon ? 'off' : 'main', args.line) : 0, rounds: 0, attacks: [], notes: [] });
  const p = prepare(cb, u, id, args, { state: 1 }, true); if (!p.t) return blank(p.why || 'Not now.');
  const t = p.t; if (p.why) { t.pv.ok = false; t.pv.why = p.why; return t.pv; }
  const m0 = momentumOf(u);
  const err = p.h!.run(t);
  if (err) { t.pv.ok = false; t.pv.why = err; return t.pv; }
  // one attack and it can't be made: the technique can't be used (a volley with some refused targets still can)
  if (t.pv.attacks.length === 1 && !t.pv.attacks[0].pv.ok) { t.pv.ok = false; t.pv.why = t.pv.attacks[0].pv.why || 'Can\'t attack that.'; }
  if (def.system === 'melee') {
    // Momentum as the card shows it: what a hit would leave (a Finisher shows what it spends)
    if (!t.pv.momentum) t.pv.momentum = { now: m0, after: m0 };
    if (def.group !== 'finisher' && t.pv.attacks.some((a) => a.pv.ok) && t.pv.momentum.after === m0 && !scratch(t).noMomentum) {
      const max = u.resMax?.momentum ?? PHYS_RULES.momentum.max, ch = chainOf(cb, u);
      t.pv.momentum.after = Math.min(max, m0 + 1 + (ch.last && ch.last !== id ? PHYS_RULES.momentum.variety_bonus : 0));
    }
    if (def.group === 'finisher') t.pv.ends = true;
  }
  // a ranged or thrown hit's ordinary Pressure, as the card shows it: the first hit on each target this turn, with what
  // the rules add (past cover the target is using; unseen with a Silent weapon)
  if (def.group !== 'take') for (const a of t.pv.attacks) {
    const v = cb.units.find((x) => x.id === a.target); if (!v || !a.pv.ok || v.side === u.side || !(scratch(t).far || []).includes(v.id) || (t.pv.pressure || []).some((x) => x.unit === v.id) || scratch(t).noPressure) continue;
    if (u.pressedThis?.t === turnStamp(cb) && u.pressedThis.ids.includes(v.id)) continue;
    const now = pressureOf(v), after = Math.min(pressureCap(v), now + inHand(t, () => hitPressure(cb, u, v)).n); (t.pv.pressure ||= []).push({ unit: v.id, add: after - now, after, state: pressureState({ pressure: after } as any), onHit: true });
  }
  if (def.group === 'take' && t.tgt) { const now = pressureOf(t.tgt), after = Math.max(0, now - PHYS_RULES.pressure.take_cost); (t.pv.pressure ||= []).push({ unit: t.tgt.id, add: after - now, after, state: pressureState({ pressure: after } as any) }); }
  return t.pv;
}
/** Use a technique. Returns a refusal in plain words, or null. Nothing is spent on a refusal. */
export function useTechnique(cb: Combat, u: Unit, id: string, args: TechArgs, rng: Rng): string | null {
  const def = TECHNIQUE[id]; if (!def) return 'No such technique.';
  const wi = wieldOf(cb, u, def, args); if (typeof wi === 'string') return wi;
  if (wi?.kind === 'stowed') { // check it as if drawn, then draw it for real (free: the technique's AP pays), then use it
    const pv0 = previewTechnique(cb, u, id, args); if (!pv0.ok) return pv0.why || 'Not now.';
    const e = GEAR ? GEAR.draw(cb, u, wi.item) : 'Nothing to draw it with here.'; if (e) return e;
    return useTechnique(cb, u, id, { ...args, item: undefined, hand: 'main', _w: 'stowed' } as TechArgs, rng);
  }
  if (wi?.kind === 'throwable') return holding(u, wi, () => useTechnique(cb, u, id, { ...args, hand: 'main', _w: 'throwable' } as TechArgs, rng));
  const pv = previewTechnique(cb, u, id, args); if (!pv.ok) return pv.why || 'Not now.';
  const p = prepare(cb, u, id, args, rng, false); if (!p.t || p.why) return p.why || 'Not now.';
  const t = p.t, ap = t.pv.ap, heat0 = u.heat;
  ensureMomentum(u);
  u.ap -= ap;
  if (def.group === 'take' && t.tgt) showPressure(cb, t.tgt);
  const ev = emitFx(cb, 'technique', { unit: u.id, id, group: def.group, system: def.system, target: t.tgt?.id || null, tile: args.tile || null, hand: t.hand, at: u.pos });
  const logAt = cb.log.length; cb.log.push(u.name + ' uses ' + def.name + (t.tgt ? ' on ' + t.tgt.name : '') + '.');
  const err = p.h!.run(t);
  if (err) { // a handler must refuse before it changes anything: the cost comes back
    u.ap += ap; u.heat = heat0; cb.log.splice(logAt, 1); (ev as any).refused = true; return err;
  }
  if (def.group === 'press' && t.w.heat_limit && !u.infiniteAmmo && !scratch(t).cancelled) u.heat += 1; // a Press costs +1 Heat on top of what it fires (after the roll: the card's to-hit is the roll's)
  for (const n of t.pv.notes) cb.log.push('  ' + n);
  const st = scratch(t);
  if (st.usedSetUp && !st.madeSetUp) delete (u as any).setUp; // a set-up is for one technique
  if (def.system === 'melee') { const ch = chainFor(cb, u); ch.n++; ch.last = id; if (def.group === 'finisher') ch.ended = true; }
  if (def.group === 'take' && t.tgt) { techState(u, '_take').t = turnStamp(cb); lowerPressureOf(cb, t.tgt, PHYS_RULES.pressure.take_cost, def.name, u); }
  u.attackedTurn = u.attackedTurn || def.system === 'melee'; // a melee technique that isn't a strike (Feint, Guard) still keeps the chain's Momentum this turn
  checkOver(cb);
  return null;
}
/** What the Attack tab's pad draws for the weapon in a hand: every usable technique by group, with its cost and the
 * line that applies. The screen never works a number out itself. */
export function techniquePad(cb: Combat, u: Unit, hand: 'main' | 'off', g?: any): PadGroup[] {
  if (g) return withG(g, () => techniquePad(cb, u, hand));
  const weaponId = hand === 'off' ? u.offWeapon : u.weapon; if (!weaponId) return [];
  const sys = weaponSystem(weaponId), have = usable(cb, u, hand), c = u.companion ? null : charOfUnit(u), knownSig = new Set(((c as any)?.phys?.known as string[]) || []);
  const taught = new Set(Object.values(WEAPON).map((w) => weaponTeaches(w.id)).filter(Boolean) as string[]);
  return groupsOf(sys).map((group) => ({
    group, label: groupName(group),
    entries: have.filter((x) => TECHNIQUE[x.id].group === group).map((x): PadEntry => {
      const def = TECHNIQUE[x.id], lf = linesFor(def, weaponId);
      const why = def.group === 'answer' ? null : gate(cb, u, def, { hand }) || (handlerOf(def.id) ? null : NOT_BUILT);
      return { id: def.id, name: def.name, group, ap: apFor(cb, u, def, hand), rounds: def.rounds, ok: !why, why, text: def.text, aim: def.aim,
        line: lf.main ? lf.main.text : null, ...(lf.choices.length > 1 ? { choices: lf.choices.map((l) => ({ prop: l.props.find((p) => weaponProps(weaponId).includes(p)) || l.props[0], text: l.text })) } : {}),
        lent: x.how === 'lent', signature: x.how === 'ready' && taught.has(def.id) && knownSig.has(def.id), plain: def.id === 'cut' || def.id === 'shot', built: !!handlerOf(def.id) };
    }),
  })).filter((g) => g.entries.length);
}
/** The pad for what the unit doesn't hold: one block per stowed weapon that a ready technique can draw, and one per kind
 * of throwable carried that a technique can be used with. The screen sends the entry's technique with the block's
 * `item` (combat/technique { id, item }). */
export interface PackPad { item: string | number; kind: 'stowed' | 'throwable'; weapon: string; name: string; count?: number; entries: PadEntry[] }
export function packPad(cb: Combat, u: Unit, g?: any): PackPad[] {
  if (g) return withG(g, () => packPad(cb, u));
  const out: PackPad[] = [];
  const block = (wi: Wield, name: string, count?: number, refused?: string) => holding(u, wi, () => {
    const entries = usable(cb, u, 'main', wi.kind).map((x): PadEntry => {
      const def = TECHNIQUE[x.id], lf = linesFor(def, wi.weaponId, undefined, u), why = refused || gate(cb, u, def, { hand: 'main', _w: wi.kind } as TechArgs) || (handlerOf(def.id) ? null : NOT_BUILT);
      return { id: def.id, name: def.name, group: def.group, ap: apFor(cb, u, def, 'main'), rounds: def.rounds, ok: !why, why, text: def.text, aim: def.aim, line: lf.main ? lf.main.text : null,
        ...(lf.choices.length > 1 ? { choices: lf.choices.map((l) => ({ prop: l.props.find((p) => weaponProps(wi.weaponId).includes(p)) || l.props[0], text: l.text })) } : {}),
        lent: x.how === 'lent', signature: false, plain: false, built: !!handlerOf(def.id) };
    });
    if (entries.length) out.push({ item: wi.item, kind: wi.kind, weapon: wi.weaponId, name, ...(count != null ? { count } : {}), entries });
  });
  const c = u.companion ? null : charOfUnit(u);
  if (c) for (const s of stowedOf(u)) {
    const it = packOf(c)[s.item], wi = stowedWield(cb, u, s.item, it);
    // a weapon the draw itself refuses (a skill it needs, a ban) is listed, greyed, with the draw's own words
    if (typeof wi === 'string') block({ kind: 'stowed', item: s.item, weaponId: s.weaponId, ammo: it.loaded ?? 0, entry: it }, s.name, undefined, wi); else block(wi, s.name);
  }
  for (const [id, n] of Object.entries(u.throwables || {})) if (n > 0 && WEAPON[id]?.category === 'thrown') block({ kind: 'throwable', item: id, weaponId: id, ammo: n }, WEAPON[id].name, n);
  return out;
}
/** A unit's meters as one side may see them (the screen draws this; it compares nothing itself). Pips a Silent weapon
 * put on a unit are hidden from that unit's own side. */
export function physView(cb: Combat, u: Unit, viewerSide: 'pc' | 'foe', g?: any): ReturnType<typeof physViewOf> { return g ? withG(g, () => physViewOf(cb, u, viewerSide)) : physViewOf(cb, u, viewerSide); }
function physViewOf(cb: Combat, u: Unit, viewerSide: 'pc' | 'foe') {
  const max = u.resMax?.momentum, ch = chainOf(cb, u);
  const hid = viewerSide === u.side ? Math.min(pressureOf(u), (u as any).pressHidden || 0) : 0, now = pressureOf(u) - hid;
  const state = pressureState({ pressure: now } as any);
  const by = viewerSide === u.side && hid >= pressureOf(u) ? [] : Object.keys(((u as any).pressBy || {}) as Record<string, string>).map((id) => cb.units.find((x) => x.id === id)).filter((x): x is Unit => !!x && alive(x)).map((x) => ({ unit: x.id, name: x.name }));
  const w = (u as any).watch as HeldWatch | undefined;
  return {
    momentum: max != null && holdsMelee(u) ? { now: momentumOf(u), max, hint: ch.last ? '+1 more if your next technique isn\'t ' + (TECHNIQUE[ch.last]?.name || ch.last) : '' } : null,
    pressure: { now, max: pressureCap(u), state, word: state ? state[0].toUpperCase() + state.slice(1) : now ? 'Under fire' : '',
      cost: state === 'pressed' ? '−1 to hit with ranged attacks; no held shots' : state === 'suppressed' ? (u.side === 'pc' ? 'No reactions that attack or move you' : '−1 AP; no reactions that attack or move it') : state === 'broken' ? '−2 AP; it must reach cover or drop Prone first' : '', by },
    stopped: stoppedNow(u) ? { on: true, text: 'Can\'t be stopped again until the end of its next turn' } : null,
    nailed: u.nailed ? { ap: u.nailed.ap, by: cb.units.find((x) => x.id === u.nailed!.by)?.name || '', text: 'Nailed in place until ' + u.nailed.ap + ' AP is spent to pull free' } : null,
    watch: w && (viewerSide === u.side || sideSees(cb, viewerSide, u)) ? { id: w.id, name: TECHNIQUE[w.id]?.name || w.id, trigger: w.trigger, tile: w.tile || null, tiles: w.tiles || (w.tile ? [w.tile] : []), mine: viewerSide === u.side } : null,
  };
}
export type { Tech, TechArgs, TechDef, TechHandler, TechPreview, StrikeOpts, StrikeResult, Character };
