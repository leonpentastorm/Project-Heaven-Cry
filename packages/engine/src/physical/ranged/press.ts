// Physical 2.0, ranged Press: Pressure with little or no damage (+1 Heat on top of what it fires: the core adds it).
// Suppress is the lead's reference; the ranged lane builds Rake, Warning Shot, Flush, Mag Dump and Crossfire here.
import { technique, strike, canStrike, spendRounds, addPressure, addPressureTo, onHook, save, hitByAlly, ownSideOnly, stepsWithin, stepUser, standingAt, turnStamp, atCover, flanksCover, hitPressure, pressureOf, isPressed, type Tech, type StrikeResult } from './shared';
import { alive, dist, xy, emitFx, fxFell, chained, type FxEvent, coverTileFor, coverOf, objectsAt, damageObject, weaponDamage, attackDamage, heatLimit, canJam, neverJams, attackApCost, refOf, type Combat, type Unit } from '../../combat';
import { emit } from '../../effects/hooks';
import { applyDamage } from '../../effects/damage';
import { landed } from '../../effects/output';
import { reveal } from '../../tactics';
import { physicalMult } from '../../character';
import { PHYS_RULES } from '../data';
import { pressureCap } from '../pressure';
import { bracedSuppress } from './sets';
import { canPay } from '../../effects/cost';

// 8. Suppress: 3 rounds, one roll at +2. A hit is half damage and 2 Pressure in all; a miss is 1.
//    Auto: enemies within 1 tile of the target also gain 1. Heavy, Braced: it holds until your next turn, and any enemy
//    that moves or fires inside 3 tiles of the target gains 1. Silent: hits only.
technique({
  id: 'suppress',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('auto', 'heavy', 'silent'), brace = bracedSuppress(t.u);
    // Brace's Auto line (sets.ts): +1 more while Braced there, on the target it rolled at, hit or miss (when it gives any)
    const onHit = t.num('pressure_hit', 2) + brace, onMiss = p === 'silent' ? 0 : t.num('pressure_miss', 1) + brace;
    // the roll spends 1 round and the technique burns the rest; its Pressure replaces the ordinary +1 for a hit
    // (the volley event and the chained roll are the screen's: one burst of 3 rounds; no hook reads the chain)
    const vev = !t.preview && canStrike(t, tgt) ? volleyFx(t, tgt, 'suppress', t.def.rounds as number) : null;
    const r = chained(() => strike(t, { extra: t.num('hit', 2), mult: t.num('damage_mult', 0.5), noPressure: true }));
    if (!r.ok) { dropFx(t.cb, vev); return r.why || 'Can\'t attack that.'; }
    if (r.cancelled) return null; // answered before it was fired: no rounds burned, no Pressure
    spendRounds(t, Math.max(0, (t.def.rounds as number) - 1));
    const struck = r.target || tgt; // the unit the shot was really made at (a redirect: a captive held as a shield)
    const near = p === 'auto' ? t.cb.units.filter((v) => v !== struck && v.side !== t.u.side && alive(v) && dist(v.pos, struck.pos) <= t.num('auto_spill_range', 1)) : [];
    if (t.preview) {
      addPressure(t, tgt, onHit, 'Suppress'); t.note('A hit: half damage and ' + onHit + ' Pressure.' + (onMiss ? ' A miss: ' + onMiss + '.' : ' A miss gives none (Silent).') + (brace ? ' (Braced: +' + brace + '.)' : ''));
      for (const v of near) addPressure(t, v, t.num('auto_spill', 1), 'Suppress');
      if (p === 'heavy') t.note('Holds until your next turn: any enemy that moves or fires within ' + t.num('heavy_lane', 3) + ' tiles of the target gains ' + t.num('heavy_lane_pressure', 1) + '.');
      return null;
    }
    if (alive(struck)) addPressure(t, struck, r.hit ? onHit : onMiss, 'Suppress');
    for (const v of near) addPressure(t, v, t.num('auto_spill', 1), 'Suppress');
    if (p === 'heavy') {
      Object.assign(t.state(), { lane: struck.pos, r: t.num('heavy_lane', 3), n: t.num('heavy_lane_pressure', 1), got: {} });
      emitFx(t.cb, 'lane', { unit: t.u.id, at: struck.pos, r: t.num('heavy_lane', 3), ...ownSideOnly(t.cb, t.u) });
    }
    return null;
  },
  ai: (t) => (t.tgt && !t.tgt.pressure ? 7 : 3),
});
// The held lane (Heavy, Braced): each enemy that moves or fires inside it gains the Pressure once a round. It ends at the
// start of the holder's next turn, or when the holder falls.
function lane(cb: Combat, who: Unit, at: string) {
  for (const h of cb.units) {
    const s = h.tech?.suppress; if (!s?.lane || h.side === who.side || !alive(h) || dist(at, s.lane) > s.r || s.got[who.id] === cb.round) continue;
    s.got[who.id] = cb.round; addPressureTo(cb, who, s.n, h, 'the held lane');
  }
}
onHook('move_step', (ctx: any, cb) => { if (ctx.u && alive(ctx.u)) lane(cb, ctx.u, ctx.at); });
onHook('attack_roll', (ctx: any, cb) => { if (ctx.att && !ctx.melee && ctx.mode !== 'melee') lane(cb, ctx.att, ctx.att.pos); });
onHook('turn_start_pre', (ctx: any, cb) => { const s = ctx.u && (ctx.u as any).tech?.suppress; if (s?.lane) { delete s.lane; emitFx(cb, 'lane_end', { unit: ctx.u.id, why: 'turn', ...ownSideOnly(cb, ctx.u) }); } });
// the holder falls: the lane is gone (lane() already skips a fallen holder; this takes it down for the screen)
onHook('on_downed', (ctx: any, cb) => { const v = ctx.victim, s = v && (v as any).tech?.suppress; if (s?.lane) { delete s.lane; emitFx(cb, 'lane_end', { unit: v.id, why: 'down' }); } });

// ---------- helpers the Presses below share ----------
/** Rounds in the hand the technique uses (Infinity for a weapon with no magazine or a unit with endless ammunition). */
const loaded = (t: Tech): number => (t.u.infiniteAmmo || t.w.magazine == null ? Infinity : t.hand === 'off' ? t.u.offAmmo ?? 0 : t.u.ammo);
/** Does firing this weapon add Heat (the same test the core uses for a Press's +1)? */
const heatsUp = (t: Tech): boolean => !!t.w.heat_limit && !t.u.infiniteAmmo;
/** A roll after the first of one volley (rules 1.12, Recoil: "shots inside one burst, full auto or weapon skill use the
 * burst's own penalty instead"; spec item 88: none in a volley): no Recoil, and no wear (an attack action wears 1).
 * Recoil from shots fired earlier in the turn still reaches the volley's first roll. */
const later = (n: number) => (n > 0 ? { noRecoil: true, noWear: true } : {});
/** In a preview, the Pressure entry just added comes only with a hit. */
const onHitOnly = (t: Tech) => { if (t.preview) { const e = t.pv.pressure?.[t.pv.pressure.length - 1]; if (e) e.onHit = true; } };
/** A shot that refused before anything was spent: the reason in plain words. */
const refused = (r: StrikeResult) => r.why || 'Can\'t attack that.';
const noShot = (target: Unit) => 'You can\'t get a shot at ' + target.name + ' from here.';
const enemyOf = (t: Tech, target: Unit) => target.side !== t.u.side;
/** A Press's volley for the screen (Suppress's 3 rounds, the 3-target Rake, Mag Dump): the event the engine's burst
 * and full auto send, with its own mode ('suppress' | 'rake' | 'dump': no item reads those as a burst or full auto). */
function volleyFx(t: Tech, tgt: Unit, mode: 'suppress' | 'rake' | 'dump', shots: number, more: Record<string, any> = {}): FxEvent {
  const u = t.u; return emitFx(t.cb, 'volley', { unit: u.id, target: tgt.id, from: u.pos, to: tgt.pos, weapon: t.weaponId, cat: t.w.category, mode, shots, tech: t.def.id, ...more });
}
/** Take back a volley event whose first roll was refused (nothing was fired). */
function dropFx(cb: Combat, ev: FxEvent | null): void { if (!ev || !cb.fx) return; const i = cb.fx.indexOf(ev); if (i >= 0) cb.fx.splice(i, 1); }
/** The weapon in the technique's hand, for engine code that reads u.weapon (the off hand is swapped in, then back). */
function inWeapon<T>(t: Tech, fn: () => T): T {
  const u = t.u; if (t.hand !== 'off') return fn();
  const w0 = u.weapon, a0 = u.ammoType; u.weapon = t.weaponId; u.ammoType = (u as any).offAmmoType ?? null;
  try { return fn(); } finally { u.weapon = w0; u.ammoType = a0; }
}
/** A round that goes out with no attack roll (Warning Shot, Flush; Rout, takes.ts; Cover Me's covering round,
 * watches.ts). spendRounds paid the round; this is the rest of
 * what a shot does by today's rules: Heat and the jam at the limit, Recoil for later shots, wear, the report that
 * reveals a Hidden shooter, and the shot's event for the screen. Nothing in a preview. */
export function looseRound(t: Tech, to: string, fx: Record<string, any> = {}): void {
  if (t.preview) return;
  const u = t.u, w = t.w;
  if (heatsUp(t)) { u.heat += 1; if (t.hand === 'main' && canJam(w) && !neverJams(t.cb, u) && u.heat >= heatLimit(u, w)) { u.jammed = true; t.cb.log.push(u.name + '\'s weapon jams (Heat).'); } }
  u.shotsThisTurn = (u.shotsThisTurn || 0) + 1; u.firstShotDone = true; u.firstShotTurn = true; u.attackedTurn = true;
  if (t.hand === 'main' && u.maxDur) u.dur = Math.max(0, (u.dur ?? u.maxDur) - 1);
  emitFx(t.cb, 'shot', { unit: u.id, target: null, from: u.pos, to, weapon: w.id, cat: w.category, mode: 'shot', hit: false, crit: false, fumble: false, dmg: 0, killed: false, ...(u.jammed && t.hand === 'main' ? { jam: true } : {}), tech: t.def.id, vi: 0, ...fx });
  if (u.hidden && !t.holds('silent') && !(u.mods || []).includes('mod_suppressor')) reveal(t.cb, u, 'fired');
}
/** Damage with no roll (Flush's Arc line): the weapon's damage as a hit would do it, times mult, less armour, credited
 * as a ranged attack (kill credit, drill, the kill's spill). It raises no on_hit, so it gives no ordinary Pressure.
 * Returns the damage (what it would be, in a preview). */
function noRollHit(t: Tech, target: Unit, mult: number, label: string): number {
  const d = inWeapon(t, () => attackDamage(t.cb, t.u, target, 'shot', t.c, { preview: t.preview }));
  const dmg = landed(d.total * mult, d.armour);
  if (t.preview) { t.note(target.name + ' takes ' + dmg + ' (' + label + ', no roll).'); return dmg; }
  const r = applyDamage(t.cb, target, dmg, { ...d.src, shield: true, credit: 'all' } as any);
  emitFx(t.cb, 'hurt', { target: target.id, at: target.pos, dmg: r.amount, why: 'weapon', killed: r.killed, by: t.u.id });
  if (r.killed) fxFell(t.cb, target);
  t.cb.log.push(target.name + ' takes ' + r.amount + ' (' + t.def.name + ', ' + label + ')' + (r.killed ? (target.side === 'foe' ? ' · down for good' : ' · Downed') : '') + '.');
  return r.amount;
}
/** What the ordinary Pressure of a ranged hit would give this target now (rules.ts's on_hit, read without changing
 * anything): the first hit each turn, 2 unseen with a Silent weapon, +1 past its cover. For a preview. */
function ordinaryPressure(t: Tech, target: Unit): number {
  const u = t.u, pt = u.pressedThis;
  if (!enemyOf(t, target) || (pt && pt.t === turnStamp(t.cb) && pt.ids.includes(target.id))) return 0;
  return inWeapon(t, () => hitPressure(t.cb, u, target)).n; // the base's rule (a suppressor counts as Silent), with the technique's weapon in hand
}
/** Burn what a volley didn't fire, up to what is left (the preview counts its rolls; the action reads the magazine). */
function burnRest(t: Tech, total: number, fired: number, ammo0: number): void {
  const used = t.preview ? fired : ammo0 - loaded(t), left = t.preview ? ammo0 - fired : loaded(t);
  const n = Math.min(Math.max(0, total - used), left);
  if (Number.isFinite(n) && n > 0) spendRounds(t, n);
}

// 9. Rake (particular: Auto). Up to 3 targets within 2 tiles of each other, each at −3; +1 Pressure on a hit (in place
//    of the ordinary +1). 6 rounds. Auto: today's full-auto cone (fireAuto) for 10 rounds: everyone near the line to the
//    target, one roll each at −2, +1 Pressure hit or miss. Spread: the spread is 1 wider (with Auto as well, the player
//    picks the line: the Spread line is the 3-target Rake with its targets within 3 tiles of each other).
/** Auto: the enemies today's full-auto line catches (ahead of the user and within 1.5 tiles of the line to the target;
 * the drum-gun's Wide Spray widens it), in the fight's order, that can be shot. */
function coneTargets(t: Tech, tgt: Unit): Unit[] {
  const u = t.u, [ax, ay] = xy(u.pos), [tx, ty] = xy(tgt.pos), len = Math.hypot(tx - ax, ty - ay) || 1;
  const fx: any = (t.w as any).grants?.effect || {}, width = fx.op === 'auto_width' ? fx.value + 0.5 : t.num('auto_cone_width', 1.5);
  const near = (v: Unit) => { const [vx, vy] = xy(v.pos), along = ((vx - ax) * (tx - ax) + (vy - ay) * (ty - ay)) / len; return along > 0 && Math.abs((vx - ax) * (ty - ay) - (vy - ay) * (tx - ax)) / len <= width; };
  return t.cb.units.filter((v) => enemyOf(t, v) && alive(v) && near(v) && canStrike(t, v));
}
/** The 3-target Rake's targets: the ones the player named (args.targetIds; the main target first), or else the main
 * target and the enemies nearest it that can be shot, every pair within the spread. A refusal is a string. */
function groupTargets(t: Tech, tgt: Unit, span: number): Unit[] | string {
  const max = t.num('targets', 3), fits = (list: Unit[], v: Unit) => list.every((x) => dist(x.pos, v.pos) <= span);
  const named = t.args.targetIds?.length ? t.args.targetIds : null;
  if (named) {
    const ids = [tgt.id, ...named.filter((id) => id !== tgt.id)];
    if (ids.length > max) return 'Rake takes up to ' + max + ' targets.';
    const list = ids.map((id) => t.cb.units.find((x) => x.id === id) || null);
    if (list.some((v) => !v || !alive(v) || !enemyOf(t, v))) return 'Rake\'s targets must be enemies still standing.';
    for (const v of list as Unit[]) if (!fits(list as Unit[], v)) return 'Rake\'s targets must be within ' + span + ' tiles of each other.';
    return list as Unit[];
  }
  const out = [tgt];
  const rest = t.cb.units.filter((v) => v !== tgt && enemyOf(t, v) && alive(v) && dist(v.pos, tgt.pos) <= span && canStrike(t, v))
    .sort((a, b) => dist(a.pos, tgt.pos) - dist(b.pos, tgt.pos) || t.cb.units.indexOf(a) - t.cb.units.indexOf(b));
  for (const v of rest) if (out.length < max && fits(out, v)) out.push(v);
  return out;
}
const rakeSpan = (t: Tech, p: string | null) => t.num('group_span', 2) + (p === 'spread' ? t.num('spread_wider', 1) : 0);
technique({
  id: 'rake',
  check(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    if (!enemyOf(t, tgt)) return 'Pick an enemy.';
    if (t.line('auto', 'spread') === 'auto') { const need = t.num('auto_rounds', 10), have = loaded(t); if (have < need) return 'Needs ' + need + ' rounds, ' + have + ' loaded.'; }
    return null;
  },
  run(t) {
    const tgt = t.tgt!, p = t.line('auto', 'spread'), u = t.u, cb = t.cb, ammo0 = loaded(t);
    if (!canStrike(t, tgt)) return refused(strike(t, { target: tgt })); // the shot can't be made: nothing is spent
    if (p === 'auto') {
      const list = coneTargets(t, tgt), total = t.num('auto_rounds', 10), dur0 = u.dur, w = t.w;
      if (!t.preview) { cb.log.push(u.name + ' opens up on full auto.'); emitFx(cb, 'volley', { unit: u.id, target: tgt.id, from: u.pos, to: tgt.pos, weapon: w.id, cat: w.category, mode: 'auto', shots: total }); }
      let fired = 0;
      // one full-auto volley, as fireAuto makes it (Spray and Pray and the items read the volley), one roll a target
      chained(() => {
        for (const v of list) {
          const r = strike(t, { target: v, extra: t.num('auto_hit', -2), noPressure: true, label: 'full auto', vi: fired, ...later(fired) });
          if (r.cancelled) break; // answered before it was fired: the volley ends
          if (!r.ok) continue;
          fired++; addPressure(t, v, t.num('pressure', 1), 'raked');
        }
      }, 'auto');
      burnRest(t, total, fired, ammo0);
      if (t.preview) { t.note('Full auto: ' + list.length + (list.length === 1 ? ' target' : ' targets') + ' in the line, ' + total + ' rounds; +' + t.num('pressure', 1) + ' Pressure on each, hit or miss.'); return null; }
      // today's Heat for full auto: 4 in all, less 1 for each target in the line (each shot already added its 1)
      if (heatsUp(t)) u.heat = Math.max(0, u.heat + t.num('auto_heat', 4) - list.length);
      if (t.hand === 'main' && u.maxDur) u.dur = Math.max(0, (dur0 ?? u.maxDur) - t.num('auto_wear', 2));
      emit(cb, 'volley_end', { u, mode: 'auto', target: tgt, hits: list, cb, rng: t.rng });
      return null;
    }
    const list = groupTargets(t, tgt, rakeSpan(t, p));
    if (typeof list === 'string') return list;
    let fired = 0;
    if (!t.preview) volleyFx(t, tgt, 'rake', t.def.rounds as number, { targets: list.map((v) => v.id) });
    chained(() => { // the rolls chained for the screen only (no volley name: no item reads it as a burst or full auto)
      for (const v of list) {
        const r = strike(t, { target: v, extra: t.num('hit', -3), noPressure: true, ...later(fired) });
        if (r.cancelled) break; // answered before it was fired: the volley ends
        if (!r.ok) continue;
        fired++;
        if (t.preview) { addPressure(t, v, t.num('pressure', 1), 'raked'); onHitOnly(t); }
        else if (r.hit) addPressure(t, v, t.num('pressure', 1), 'raked');
      }
    });
    burnRest(t, t.def.rounds as number, fired, ammo0);
    if (t.preview) t.note(list.length + (list.length === 1 ? ' target' : ' targets') + ', each at ' + t.num('hit', -3) + '; +' + t.num('pressure', 1) + ' Pressure on each hit.');
    return null;
  },
  ai(t) {
    const tgt = t.tgt; if (!tgt || !enemyOf(t, tgt) || !canStrike(t, tgt)) return 0;
    const p = t.line('auto', 'spread'), g = p === 'auto' ? coneTargets(t, tgt) : groupTargets(t, tgt, rakeSpan(t, p)), n = typeof g === 'string' ? 0 : g.length;
    return n >= 2 ? 5 + n : 2; // worth it on a crowd; one target is a waste of rounds
  },
});

// 10. Warning Shot: 1 AP, 1 round. No attack: the target makes a Heart save or gains +1 Pressure. Loud: the save is
//     at −2 (its TN 2 higher). Silent: not available (the core refuses it: not_with).
technique({
  id: 'warning_shot',
  check(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    if (!enemyOf(t, tgt)) return 'Pick an enemy.';
    if (!canStrike(t, tgt)) return noShot(tgt);
    return null;
  },
  run(t) {
    const tgt = t.tgt!, loud = t.line('loud') === 'loud', tn = loud ? t.num('loud_save_tn', 2) : 0;
    if (!spendRounds(t, t.def.rounds as number)) return 'Needs ' + t.def.rounds + ' round.';
    looseRound(t, tgt.pos, { warning: true });
    if (!t.preview) t.cb.log.push(t.u.name + ' fires a warning shot past ' + tgt.name + '.');
    if (!save(t, tgt, 'heart', tn)) addPressure(t, tgt, t.num('pressure', 1), 'a warning shot');
    if (t.preview) t.note('No attack: ' + tgt.name + ' makes a Heart save' + (tn ? ' at −' + tn : '') + ' or gains +' + t.num('pressure', 1) + ' Pressure.');
    return null;
  },
  // cheap: when the enemy can't afford a shot, a warning shot still leans on its target
  ai: (t) => (t.tgt && enemyOf(t, t.tgt) && !canPay(t.cb, t.u, attackApCost(t.w, 'shot')) && pressureOf(t.tgt) < pressureCap(t.tgt) && canStrike(t, t.tgt) ? 6 : 1),
});

// 11. Flush: 3 AP, 1 round. Hit the target's cover (no roll; the cover takes the weapon's damage, as shooting cover does
//     today). The target gains +2 Pressure; nobody is asked anything (it moves on its own turn, if it wants to). Spread
//     or Blast: double damage to the cover. Arc: the cover is ignored (it takes nothing) and the target takes half damage.
technique({
  id: 'flush',
  check(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    if (!enemyOf(t, tgt)) return 'Pick an enemy.';
    if (!canStrike(t, tgt)) return noShot(tgt);
    if (t.line('spread', 'blast', 'arc') === 'arc') { if (!atCover(t.cb, tgt)) return tgt.name + ' isn\'t in cover.'; }
    else if (!coverTileFor(t.cb, t.u.pos, tgt.pos)) return tgt.name + ' has no cover between you to flush.';
    return null;
  },
  run(t) {
    const tgt = t.tgt!, p = t.line('spread', 'blast', 'arc'), u = t.u, cb = t.cb;
    if (!spendRounds(t, t.def.rounds as number)) return 'Needs ' + t.def.rounds + ' round.';
    if (p === 'arc') {
      looseRound(t, tgt.pos, { flush: true });
      if (!t.preview) cb.log.push(u.name + ' drops a round over ' + tgt.name + '\'s cover.');
      noRollHit(t, tgt, t.num('arc_damage_mult', 0.5), 'half damage over the cover');
    } else {
      const tile = coverTileFor(cb, u.pos, tgt.pos)!, c = coverOf(cb)[tile], name = (c?.name || 'cover').toLowerCase();
      // the weapon's damage at the cover, as shooting cover works it out today (shootCover), doubled by Spread or Blast
      const raw = inWeapon(t, () => weaponDamage(t.w, dist(u.pos, tile), t.c?.skills.raw_power || 0) * (t.c ? physicalMult(t.c) : 1));
      const dmg = raw * (p === 'spread' || p === 'blast' ? t.num('cover_mult', 2) : 1);
      t.pv.area = [tile];
      if (t.preview) t.note('The ' + name + ' at ' + refOf(tile) + ' takes ' + Math.max(1, Math.floor(dmg)) + (c ? ' (' + c.hp + ' HP left)' : '') + '.');
      else { looseRound(t, tile, { object: true, flush: true }); cb.log.push(u.name + ' flushes ' + tgt.name + ': the ' + name + ' at ' + refOf(tile) + damageObject(cb, tile, dmg, 0, u) + '.'); }
    }
    addPressure(t, tgt, t.num('pressure', 2), 'flushed');
    return null;
  },
  ai: (t) => (t.tgt && enemyOf(t, t.tgt) && !isPressed(t.tgt) && coverTileFor(t.cb, t.u.pos, t.tgt.pos) && canStrike(t, t.tgt) ? 6 : 0),
});

// 12. Mag Dump (particular: Auto, Quick, Spread). 4 AP, every round. Empty the weapon at one target: one roll per 3
//     rounds left (at least one, at most 3), each at −4 more than the last (rules 1.18); +1 Pressure per hit (in place of the
//     ordinary +1). Heat goes to one under the limit. Auto: +1 Pressure per roll, hit or miss. Quick and Precise: no
//     growing penalty. Spread: both barrels, one roll, at double damage within 4 tiles. Drawn: not available (the core).
const dumpRolls = (t: Tech): number => {
  const have = loaded(t), n = Number.isFinite(have) ? have : t.w.magazine ?? t.num('per_roll', 3);
  return Math.min(t.num('max_rolls', 3), Math.max(1, Math.floor(n / t.num('per_roll', 3))));
};
technique({
  id: 'mag_dump',
  check(t) { return t.tgt ? null : 'Pick a target.'; },
  run(t) {
    const tgt = t.tgt!, p = t.line('auto', 'quick', 'spread'), u = t.u, ammo0 = loaded(t), press = t.num('pressure', 1), heat0 = u.heat;
    let fired = 0;
    if (p === 'spread') {
      const close = dist(u.pos, tgt.pos) <= t.num('spread_range', 4);
      const r = strike(t, { mult: close ? t.num('spread_mult', 2) : 1, noPressure: true, label: 'both barrels' });
      if (!r.ok) return refused(r);
      if (r.cancelled) return null; // answered before it was fired: nothing more goes
      fired = 1;
      if (t.preview) { addPressure(t, tgt, press, 'a mag dump'); onHitOnly(t); if (!close) t.note('Double damage only within ' + t.num('spread_range', 4) + ' tiles.'); }
      else if (r.hit) addPressure(t, tgt, press, 'a mag dump');
    } else {
      const rolls = dumpRolls(t), step = p === 'quick' ? 0 : t.num('step', 4);
      const vev = t.preview ? null : volleyFx(t, tgt, 'dump', Number.isFinite(ammo0) ? ammo0 : rolls, { rolls });
      // the rolls chained for the screen only (no volley name: no item reads it as a burst or full auto)
      const out = chained((): string | null | undefined => {
        for (let i = 0; i < rolls; i++) {
          if (!t.preview && !alive(tgt)) break;
          const r = strike(t, { extra: -i * step, noPressure: true, label: 'Mag Dump', ...later(i) });
          if (!r.ok) { if (i === 0) { dropFx(t.cb, vev); return refused(r); } break; }
          if (r.cancelled) return null; // answered before it was fired: the dump ends there, nothing more burned
          fired++;
          if (t.preview) { addPressure(t, tgt, press, 'a mag dump'); if (p !== 'auto') onHitOnly(t); }
          else if (p === 'auto' || r.hit) addPressure(t, tgt, press, 'a mag dump');
        }
        return undefined;
      });
      if (out !== undefined) return out;
      if (t.preview) t.note(rolls + (rolls === 1 ? ' roll' : ' rolls') + (step && rolls > 1 ? ', each at −' + step + ' more than the last' : '') + '; +' + press + ' Pressure per ' + (p === 'auto' ? 'roll, hit or miss' : 'hit') + '.');
    }
    burnRest(t, Number.isFinite(ammo0) ? ammo0 : 0, fired, ammo0); // the rest of the magazine goes too
    // Heat goes to one under the limit (a jam the shots caused stays). The core adds a Press's +1 Heat after the run (the
    // base: so the rolls match the card), so the run leaves it one lower.
    if (heatsUp(t)) {
      const to = heatLimit(u, t.w) - t.num('heat_under', 1);
      if (t.preview) t.note('Heat goes to ' + to + '.');
      else {
        u.heat = Math.max(u.heat, to - 1);
        // for the screen: the Heat as it stands once the core adds the Press's +1
        emitFx(t.cb, 'heat', { unit: u.id, at: u.pos, now: u.heat + 1, was: heat0, why: 'dump', limit: heatLimit(u, t.w), ...ownSideOnly(t.cb, u) });
      }
    }
    if (t.preview) t.note('Empties the weapon.');
    return null;
  },
  ai: () => 3, // an enemy that empties its gun reloads it badly: never better than a plain shot
});

// 13. Crossfire: 2 AP, 1 round. A shot at a target an ally has already hit this round: +2 to hit, and +1 Pressure on a
//     hit on top of what the hit gives. Quick: step 1 tile first (args.tile), with no opportunity attack.
const crossStep = (t: Tech) => (t.args.tile && t.args.tile !== t.u.pos ? stepsWithin(t, t.num('quick_step', 1)).find((x) => x.to === t.args.tile) || null : null);
technique({
  id: 'crossfire',
  check(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    if (!hitByAlly(t, tgt)) return 'No ally has hit ' + tgt.name + ' this round.';
    if (t.args.tile && t.args.tile !== t.u.pos) {
      if (t.line('quick') !== 'quick') return 'Only a Quick weapon lets you step before the shot.';
      if (!crossStep(t)) return 'You can\'t step there: one tile, onto free ground.';
    }
    return null;
  },
  run(t) {
    const tgt = t.tgt!, step = crossStep(t), extra = t.num('extra_pressure', 1), o = { extra: t.num('hit', 2) };
    if (t.preview) {
      const shoot = () => { const r = strike(t, o); if (r.ok) { addPressure(t, tgt, ordinaryPressure(t, tgt) + extra, 'crossfire'); onHitOnly(t); } return r; };
      if (step) stepUser(t, step.route);
      const r = step ? standingAt(t, step.to, shoot) : shoot();
      if (!r.ok) return refused(r);
      t.note('+' + extra + ' Pressure on a hit, on top of what the hit gives.' + (step ? ' Steps to ' + refOf(step.to) + ' first, drawing no opportunity attack.' : ''));
      return null;
    }
    if (step) { stepUser(t, step.route); if (!alive(t.u) || t.u.pos !== step.to) return null; } // a held shot stopped the step: the shot is lost
    const r = strike(t, o);
    if (!r.ok) { if (step) { t.cb.log.push('  The shot can\'t be made from there.'); return null; } return refused(r); }
    if (r.hit && alive(r.target || tgt)) addPressure(t, r.target || tgt, extra, 'crossfire'); // the unit really struck
    return null;
  },
  ai: (t) => (t.tgt && enemyOf(t, t.tgt) && hitByAlly(t, t.tgt) && canStrike(t, t.tgt) ? 7 : 0),
  // the screen draws the converging line from the ally whose hit made it legal (the first such ally)
  fx(t) {
    const tgt = t.tgt; if (!tgt) return null;
    const id = Object.entries(((tgt as any).hitRound || {}) as Record<string, number>).find(([id, r]) => r === t.cb.round && id !== t.u.id && t.cb.units.find((x) => x.id === id)?.side === t.u.side)?.[0];
    return id ? { with: id } : null;
  },
});
