// Physical 2.0 (rules 1.12): the standing rules of Momentum and Pressure, as listeners on the fight's hooks (they run
// for every unit, after the items). Nothing in combat.ts calls into this file.
//   Momentum (the rework, Leon, 10 Nov 2026): a fight starts with 1; −1 a tile walked (a walk, a Sprint, a Disengage:
//   never a forced move, a Link's or a technique's own step, a free step); −1 a damaging hit taken, unless guarding
//   (the Guard technique up, the hit Parried, Guard points held); it carries from turn to turn
//   a ranged hit: +1 Pressure, the first on each target each turn (+1 more past cover it is using; +2 unseen and Silent)
//   a melee hit: the attacker sheds 1 Pressure
//   a kill by a ranged attack: +1 to every other enemy within 3 tiles that saw it; drill for everyone who hit the victim
//   a turn's start: the held Watch ends; an enemy Suppressed loses 1 AP, Broken 2
//   a turn's end: Pressure falls by 1 (2 in cover and unseen, or closer to the nearest enemy than the turn began)
//   reactions: Pressed holds no Watch; Suppressed takes no opportunity attack either
import { say, type Combat, type Unit, alive, dist, unitSees, emitFx, strikeWeapon } from '../combat';
import { onHook, charOfUnit } from '../effects/hooks';
import { condOn } from '../magic';
import { WEAPON } from '../data';
import { PHYS_RULES, TECHNIQUE, addDrill, drillMult } from './data';
import { pressureOf, pressureState, addPressureTo, lowerPressureOf, isPressed, isSuppressed, onPressureState, hitPressure, coveredUnseen } from './pressure';
import { ensureMomentum, momentumOf, loseMomentum, guardUp, strikeNoPressure, turnStamp, endWatch } from './core';
import { foesOf } from '../kit';

const P = () => PHYS_RULES.pressure;
const nearestFoe = (cb: Combat, u: Unit): number => foesOf(cb, u).reduce((m, v) => Math.min(m, dist(u.pos, v.pos)), 99);
/** Every weapon an attacker has damaged a unit with this fight (drill is paid for each on the kill). */
function hitWith(tgt: Unit, attId: string, weaponId: string) { const l = ((tgt.hitWith ||= {})[attId] ||= []); if (!l.includes(weaponId)) l.push(weaponId); }
/** What may change the fall of Pressure at a turn's end (a Bead holds it; smoke drops 2): given the fall, returns the fall. */
type DecayRule = (cb: Combat, u: Unit, fall: number) => number;
const DECAY: DecayRule[] = [];
export const pressureDecay = (f: DecayRule) => { DECAY.push(f); };

onHook('on_hit', (ctx: any, cb) => {
  const att: Unit = ctx.att, tgt: Unit = ctx.tgt; if (!att || !tgt || att.side === tgt.side) return;
  // who hit whom this round and with what (Crossfire; drill credit on the kill)
  (tgt.hitRound ||= {})[att.id] = cb.round;
  if (ctx.dmg > 0) hitWith(tgt, att.id, ctx.mode === 'melee' && WEAPON[att.weapon] ? strikeWeapon(att, 'melee').id : att.weapon);
  if (ctx.melee) { if (pressureOf(att)) lowerPressureOf(cb, att, P().melee_hit_sheds, 'fighting it out'); return; }
  // the first ranged hit on this target this turn (a technique that gives its own Pressure for the hit still uses it up)
  const stamp = turnStamp(cb), pt = att.pressedThis?.t === stamp ? att.pressedThis : (att.pressedThis = { t: stamp, ids: [] as string[] });
  if (pt.ids.includes(tgt.id)) return; pt.ids.push(tgt.id);
  if (strikeNoPressure(att) || !alive(tgt)) return;
  const hp = hitPressure(cb, att, tgt);
  addPressureTo(cb, tgt, hp.n, att, hp.why, { hidden: hp.hidden });
});

// ---------- Momentum: what starts it and what wears it off ----------
const M = () => PHYS_RULES.momentum;
// A fight starts with 1 Momentum for every unit that has the meter.
onHook('combat_start', (_ctx: any, cb) => {
  for (const u of cb.units) { ensureMomentum(u); delete u.openerUsed; if (u.resMax?.momentum != null && u.res) u.res.momentum = Math.max(u.res.momentum || 0, Math.min(u.resMax.momentum, M().start ?? 1)); }
});
// Walking: −1 for each tile of a walk, a Sprint or a Disengage. A step that is part of something else (ctx.part: a
// technique's own step or run, a Link's move, a class move's or a perk's free step) costs none; forced moves never
// come here (they are 'forced_move').
onHook('moved', (ctx: any, cb) => {
  const u: Unit = ctx.u; if (!u || ctx.forced || ctx.part || !['move', 'sprint', 'disengage'].includes(ctx.how) || !(ctx.tiles > 0) || !momentumOf(u)) return;
  loseMomentum(cb, u, ctx.tiles * (M().step_loss ?? 1));
});
// Being hit: −1 for each damaging hit taken, from any source. Not while guarding: the Guard technique is up, the hit
// was Parried, or the unit held Guard points as it arrived. A condition's own tick (Bleeding, Burning) and the harm a
// unit does itself (Strain, a Mana Short) are not hits.
export const NOT_A_HIT = new Set(['bleed', 'bleeding', 'burn', 'burning', 'poison', 'strain', 'overload', 'short', 'heart', 'shame', 'shared']);
onHook('damage_in', (ctx: any, cb) => {
  const u: Unit = ctx.t; if (ctx.phase !== 'after' || !u || !(ctx.dealt > 0) || !momentumOf(u)) return;
  if (ctx.self || NOT_A_HIT.has(ctx.src?.type)) return;
  if (guardUp(u) || ctx.parryWon || (ctx.guardSoaked || 0) > 0) return; // Guard points keep Momentum only on a hit they soaked part of (Leon, 10 Nov 2026: a kept point must not protect it for ever)
  loseMomentum(cb, u, M().hit_loss ?? 1);
});

onHook('on_kill', (ctx: any, cb) => {
  const victim: Unit = ctx.victim, by: Unit = ctx.by, src = ctx.src || {}; if (!victim || !by) return;
  if (src.type === 'weapon') hitWith(victim, by.id, src.weapon || by.weapon); // the killing blow's on_hit comes after this
  if (src.type === 'weapon' && !src.melee && victim.kind !== 'figment') for (const v of cb.units) { // (rules 1.34: a Figment's fall is no one's death)
    if (v === victim || v.side !== victim.side || !alive(v) || dist(v.pos, victim.pos) > P().kill_spill_range || !unitSees(cb, v, victim.pos)) continue;
    addPressureTo(cb, v, P().kill_spill, by, 'saw ' + victim.name + ' fall');
  }
  // Drill (Leon): a kill gives it to everyone who hit the victim, for the weapon they hit with; a hit alone gives none.
  if (victim.side !== 'foe' || victim.companion) return;
  const base = PHYS_RULES.drill.per_kill[victim.tier || 'minion'] ?? PHYS_RULES.drill.per_kill.minion;
  for (const [id, list] of Object.entries(victim.hitWith || {})) for (const weaponId of list) {
    const u = cb.units.find((x) => x.id === id), c = u && !u.companion && u.side === 'pc' ? charOfUnit(u) : null; if (!u || !c || !WEAPON[weaponId]) continue;
    const r = addDrill(c, weaponId, base * drillMult(c));
    emitFx(cb, 'drill', { unit: u.id, at: u.pos, weapon: weaponId, add: r.add, total: r.total, mark: r.mark, learned: r.learned });
    if (r.mark) say(cb, u.name + ' reaches drill mark ' + 'I'.repeat(r.mark) + ' with the ' + WEAPON[weaponId].name + (r.learned ? ': ' + (TECHNIQUE[r.learned]?.name || r.learned) + ' learned' : ': a technique to pick') + '.');
  }
});

onHook('turn_start_pre', (ctx: any, cb) => {
  const u: Unit = ctx.u; if (!u) return;
  ensureMomentum(u);
  endWatch(cb, u, 'turn'); delete (u as any).setUp;
  // Suppressed and Broken cost an enemy AP; a player never loses AP to Pressure. (The old Suppressed condition already
  // costs 1: the two don't add.)
  if (u.side === 'foe') {
    const s = pressureState(u);
    if (s === 'broken') ctx.penalties.push({ n: P().broken_ap - (condOn(u, 'suppressed') ? 1 : 0), why: 'Broken' });
    else if (s === 'suppressed' && !condOn(u, 'suppressed')) ctx.penalties.push({ n: P().suppressed_ap, why: 'Suppressed' });
  }
  (u as any).nearFoe0 = nearestFoe(cb, u);
});

onHook('turn_end', (ctx: any, cb) => {
  const u: Unit = ctx.u; if (!u) return;
  if ((u as any).stopped) { (u as any).stopped -= 1; if (!(u as any).stopped) delete (u as any).stopped; }
  if (!pressureOf(u) || !alive(u)) return;
  let fall = P().decay, why = 'the turn ends';
  if (coveredUnseen(cb, u)) { fall = P().decay_hidden; why = 'in cover and out of sight'; }
  else if (nearestFoe(cb, u) < ((u as any).nearFoe0 ?? 0)) { fall = P().decay_closing; why = 'closing in'; }
  for (const f of DECAY) fall = f(cb, u, fall);
  if (fall > 0) lowerPressureOf(cb, u, fall, why);
});

// Reactions: a Pressed unit fires no held shot; a Suppressed one takes no opportunity attack either. Answers are checked
// by canAnswer (the protective ones always work), and the reactions of perks and class moves that protect are untouched.
onHook('reaction_window', (ctx: any) => {
  const r: Unit = ctx.reactor; if (!r || ctx.cancel) return;
  // (a held melee strike, the old "Hold a strike", is not a held shot: Pressed is a ranged penalty)
  if ((ctx.kind === 'overwatch' || ctx.kind === 'watch') && isPressed(r) && (r.overwatch !== 'melee' || isSuppressed(r))) ctx.cancel = true;
  else if (ctx.kind === 'opportunity' && isSuppressed(r)) ctx.cancel = true;
});
// Becoming Pressed drops the shot a unit is holding (the lead's reading: it is how a held lane is taken back).
onPressureState((cb, u, was, now) => {
  if (was || !now) return;
  endWatch(cb, u, 'Pressed');
  if (u.overwatch && u.overwatch !== 'melee') { u.overwatch = null; u.owShots = 0; say(cb, u.name + ' loses the held shot (Pressed).'); emitFx(cb, 'watch_end', { unit: u.id, at: u.pos, id: 'overwatch', why: 'Pressed' }); }
});
