// Physical 2.0 (rules 1.12): the standing rules of Momentum and Pressure, as listeners on the fight's hooks (they run
// for every unit, after the items). Nothing in combat.ts calls into this file.
//   a ranged hit: +1 Pressure, the first on each target each turn (+1 more past cover it is using; +2 unseen and Silent)
//   a melee hit: the attacker sheds 1 Pressure
//   a kill by a ranged attack: +1 to every other enemy within 3 tiles that saw it; drill for everyone who hit the victim
//   a turn's start: the held Watch ends; an enemy Suppressed loses 1 AP, Broken 2
//   a turn's end: Pressure falls by 1 (2 in cover and unseen, or closer to the nearest enemy than the turn began)
//   reactions: Pressed holds no Watch; Suppressed takes no opportunity attack either
import { type Combat, type Unit, alive, dist, coverOf, coverTileFor, unitSees, emitFx, xy, key } from '../combat';
import { onHook, charOfUnit } from '../effects/hooks';
import { condOn } from '../magic';
import { WEAPON } from '../data';
import { PHYS_RULES, TECHNIQUE, weaponProps, addDrill, drillMult } from './data';
import { pressureOf, pressureState, addPressureTo, lowerPressureOf, isPressed, isSuppressed, onPressureState } from './pressure';
import { ensureMomentum, strikeNoPressure, turnStamp, endWatch } from './core';

const P = () => PHYS_RULES.pressure;
const foesOf = (cb: Combat, u: Unit) => cb.units.filter((v) => v.side !== u.side && alive(v));
const nearestFoe = (cb: Combat, u: Unit): number => foesOf(cb, u).reduce((m, v) => Math.min(m, dist(u.pos, v.pos)), 99);
/** Is this unit standing against cover (a cover tile within 1)? */
export function atCover(cb: Combat, u: Unit): boolean {
  const cov = coverOf(cb), [x, y] = xy(u.pos);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && (cov[key(x + dx, y + dy)] || cb.map.cover.includes(key(x + dx, y + dy)))) return true;
  return false;
}
/** A shot that goes past the cover its target is using (the target stands against cover, and it doesn't face this shot). */
export const flanksCover = (cb: Combat, att: Unit, tgt: Unit): boolean => atCover(cb, tgt) && !coverTileFor(cb, att.pos, tgt.pos);
/** In cover and out of every enemy's sight. */
export const coveredUnseen = (cb: Combat, u: Unit): boolean => atCover(cb, u) && !foesOf(cb, u).some((v) => unitSees(cb, v, u.pos));

/** What may change the fall of Pressure at a turn's end (a Bead holds it; smoke drops 2): given the fall, returns the fall. */
type DecayRule = (cb: Combat, u: Unit, fall: number) => number;
const DECAY: DecayRule[] = [];
export const pressureDecay = (f: DecayRule) => { DECAY.push(f); };

onHook('on_hit', (ctx: any, cb) => {
  const att: Unit = ctx.att, tgt: Unit = ctx.tgt; if (!att || !tgt || att.side === tgt.side) return;
  // who hit whom this round and with what (Crossfire; drill credit on the kill)
  ((tgt as any).hitRound ||= {})[att.id] = cb.round; ((tgt as any).hitWith ||= {})[att.id] = ctx.mode === 'melee' && !/melee|unarmed/.test(WEAPON[att.weapon]?.category || '') ? 'fists' : att.weapon;
  if (ctx.melee) { if (pressureOf(att)) lowerPressureOf(cb, att, P().melee_hit_sheds, 'fighting it out'); return; }
  if (strikeNoPressure(att) || !alive(tgt)) return;
  const stamp = turnStamp(cb), pt = (att as any).pressedThis?.t === stamp ? (att as any).pressedThis : ((att as any).pressedThis = { t: stamp, ids: [] as string[] });
  if (pt.ids.includes(tgt.id)) return; pt.ids.push(tgt.id);
  const unseen = !!att.hidden && weaponProps(att.weapon).includes('silent');
  let n = unseen ? P().unseen_silent_hit : 1, why = unseen ? 'an unseen hit' : 'a hit';
  if (flanksCover(cb, att, tgt)) { n += P().flank_bonus; why += ' past its cover'; }
  addPressureTo(cb, tgt, n, att, why, { hidden: unseen });
});

onHook('on_kill', (ctx: any, cb) => {
  const victim: Unit = ctx.victim, by: Unit = ctx.by, src = ctx.src || {}; if (!victim || !by) return;
  if (src.type === 'weapon') ((victim as any).hitWith ||= {})[by.id] = src.weapon || by.weapon;
  if (src.type === 'weapon' && !src.melee) for (const v of cb.units) {
    if (v === victim || v.side !== victim.side || !alive(v) || dist(v.pos, victim.pos) > P().kill_spill_range || !unitSees(cb, v, victim.pos)) continue;
    addPressureTo(cb, v, P().kill_spill, by, 'saw ' + victim.name + ' fall');
  }
  // Drill (Leon): a kill gives it to everyone who hit the victim, for the weapon they hit with; a hit alone gives none.
  if (victim.side !== 'foe' || victim.companion) return;
  const base = PHYS_RULES.drill.per_kill[victim.tier || 'minion'] ?? PHYS_RULES.drill.per_kill.minion;
  for (const [id, weaponId] of Object.entries(((victim as any).hitWith || {}) as Record<string, string>)) {
    const u = cb.units.find((x) => x.id === id), c = u && !u.companion && u.side === 'pc' ? charOfUnit(u) : null; if (!u || !c || !WEAPON[weaponId]) continue;
    const r = addDrill(c, weaponId, base * drillMult(c));
    emitFx(cb, 'drill', { unit: u.id, at: u.pos, weapon: weaponId, add: r.add, total: r.total, mark: r.mark, learned: r.learned });
    if (r.mark) cb.log.push(u.name + ' reaches drill mark ' + 'I'.repeat(r.mark) + ' with the ' + WEAPON[weaponId].name + (r.learned ? ': ' + (TECHNIQUE[r.learned]?.name || r.learned) + ' learned' : ': a technique to pick') + '.');
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
  if ((ctx.kind === 'overwatch' || ctx.kind === 'watch') && isPressed(r)) ctx.cancel = true;
  else if (ctx.kind === 'opportunity' && isSuppressed(r)) ctx.cancel = true;
});
// Becoming Pressed drops the shot a unit is holding (the lead's reading: it is how a held lane is taken back).
onPressureState((cb, u, was, now) => {
  if (was || !now) return;
  endWatch(cb, u, 'Pressed');
  if (u.overwatch) { u.overwatch = null; u.owShots = 0; cb.log.push(u.name + ' loses the held shot (Pressed).'); emitFx(cb, 'watch_end', { unit: u.id, at: u.pos, id: 'overwatch', why: 'Pressed' }); }
});
