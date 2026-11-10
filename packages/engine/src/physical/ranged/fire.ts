// Physical 2.0, ranged Fire: damage. Shot and Aimed Shot are the lead's references; the ranged lane builds Snap Shot,
// Burst, Called Shot, Walking Fire and Punch Through here (Lob lives in thrown.ts: its Blast line is the grenade code).
import { technique, strike, addPressure, spendRounds, save, cond, stop, stepsWithin, standingAt, stepUser, swapIn, onHook, type Tech } from './shared';
import { alive, dist, xy, key, emitFx, coverTileFor, objectsAt, damageObject, weaponDamage, moveUnit, moveBlock, paths, effectiveRange, attackDamage, hurtUnit, sightBlockers, refOf, type Unit } from '../../combat';
import { emit } from '../../effects/hooks';
import { physicalMult } from '../../character';

// 0. Shot: one shot. Everyone knows it. Precise: +1 if you haven't moved this turn. Loud: a miss gives +1 Pressure.
technique({
  id: 'shot',
  run(t) {
    const p = t.line('precise', 'loud');
    const r = strike(t, { extra: p === 'precise' && !t.u.moved ? t.num('precise_still_hit', 1) : 0 });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (p === 'loud') { if (t.preview) t.note('A miss still gives +' + t.num('loud_miss_pressure', 1) + ' Pressure.'); else if (!r.hit && r.target) addPressure(t, r.target, t.num('loud_miss_pressure', 1), 'a loud miss'); }
    return null;
  },
  ai: () => 5,
});

// 3. Aimed Shot: +2 to hit (the engine's aimed shot: criticals on 19–20). Precise: +3, and a critical on 18–20 if you
//    haven't moved. Drawn: full draw, +25% damage.
technique({
  id: 'aimed_shot',
  run(t) {
    const p = t.line('precise', 'drawn'), still = !t.u.moved;
    const r = strike(t, {
      mode: 'aimed', // carries the +2 and everything written for an aimed shot (the scope, the perks)
      extra: p === 'precise' ? t.num('precise_hit', 3) - t.num('hit', 2) : 0,
      critMin: p === 'precise' && still ? t.num('precise_crit_min', 18) : undefined,
      mult: p === 'drawn' ? 1 + t.num('drawn_damage_pct', 25) / 100 : 1, label: p === 'drawn' ? 'full draw' : 'Aimed Shot',
    });
    return r.ok ? null : r.why || 'Can\'t attack that.';
  },
  ai: () => 4, // an enemy keeps to plain shots unless its list gives it better
});

// ---------- what this file's volleys share ----------
/** A roll inside one of this file's volleys: a volley's own penalties replace Recoil after its first roll (today's
 * burst). Read by the attack_preview listener below; only the shooter's own attack is touched. */
let RIDE: { u: Unit; noRecoil?: boolean } | null = null;
function riding<T>(r: typeof RIDE, fn: () => T): T { const was = RIDE; RIDE = r; try { return fn(); } finally { RIDE = was; } }
onHook('attack_preview', (ctx: any) => { if (RIDE && ctx.att === RIDE.u && RIDE.noRecoil) ctx.noRecoil = true; });
const loaded = (t: Tech) => (t.hand === 'off' ? t.u.offAmmo ?? 0 : t.u.ammo);
const usesRounds = (t: Tech) => t.w.magazine != null && !t.u.infiniteAmmo;
/** A preview of a later roll sees the rounds and Heat the earlier rolls will have spent (put back after). */
function asIfFired<T>(t: Tech, n: number, fn: () => T): T {
  if (!t.preview || n <= 0) return fn();
  const u = t.u, h0 = u.heat, a0 = u.ammo, o0 = u.offAmmo;
  if (t.w.heat_limit && !u.infiniteAmmo) u.heat = h0 + n;
  if (usesRounds(t)) { if (t.hand === 'off') u.offAmmo = (o0 ?? 0) - n; else u.ammo = a0 - n; }
  try { return fn(); } finally { u.heat = h0; u.ammo = a0; if (o0 === undefined) delete u.offAmmo; else u.offAmmo = o0; }
}
interface Roll { target: Unit; extra: number }
/** A burst: the rolls in order, then the rounds it burns beyond them, then the barrel cooling (today's burst cools 1).
 * The volley stops at a jam or an empty magazine, and skips a roll whose target is down; rounds it didn't fire stay
 * loaded. The action raises the same 'volley' event and 'volley_end' hook today's fireBurst does (Spray and Pray). */
function volley(t: Tech, rolls: Roll[], o: { burn: number; cool: number }): string | null {
  const u = t.u, cb = t.cb;
  if (t.preview) {
    for (let i = 0; i < rolls.length; i++) {
      const r = asIfFired(t, i, () => riding(i ? { u, noRecoil: true } : null, () => strike(t, { target: rolls[i].target, extra: rolls[i].extra, label: t.def.name })));
      if (!r.ok) return rolls[i].target.name + ': ' + (r.why || 'can\'t attack that.');
    }
    if (o.burn > 0) spendRounds(t, o.burn);
    if (o.cool > 0 && t.w.heat_limit) t.note('The barrel cools ' + o.cool + ' Heat after the burst.');
    return null;
  }
  const first = rolls[0].target, rounds = rolls.length + Math.max(0, o.burn);
  emitFx(cb, 'volley', { unit: u.id, target: first.id, from: u.pos, to: first.pos, weapon: t.weaponId, cat: t.w.category, mode: 'burst', shots: rounds });
  const aimed: Unit[] = []; let made = 0;
  for (let i = 0; i < rolls.length; i++) {
    const tg = rolls[i].target;
    if ((t.hand === 'main' && u.jammed) || (usesRounds(t) && loaded(t) <= 0) || !alive(u)) break;
    if (!alive(tg)) continue;
    const r = riding(made ? { u, noRecoil: true } : null, () => strike(t, { target: tg, extra: rolls[i].extra, label: t.def.name }));
    if (!r.ok) break; // the preview refuses it now (pushed out of sight, the gun broke): the burst ends
    made++; if (!aimed.includes(tg)) aimed.push(tg);
  }
  if (made === rolls.length && o.burn > 0) spendRounds(t, usesRounds(t) ? Math.min(o.burn, loaded(t)) : o.burn);
  if (o.cool > 0) u.heat = Math.max(0, u.heat - o.cool);
  emit(cb, 'volley_end', { u, mode: 'burst', target: first, hits: aimed, cb, rng: t.rng });
  return null;
}
const unitById = (t: Tech, id: string) => t.cb.units.find((x) => x.id === id) || null;

// 1. Snap Shot: draw or swap to this weapon and fire, at −2. Quick: no penalty. Heavy: not available (data: not_with).
//    Used with the off-hand weapon, it comes to the main hand first (today's swap, its AP waived); an enemy or a
//    companion has no pack to rebuild from and fires it from the off hand. In the main hand already it is the shot alone.
technique({
  id: 'snap_shot',
  check(t) { return t.hand === 'off' && t.c ? swapIn(t.cb, t.u, { from: 'off' }, { dry: true }) : null; },
  run(t) {
    const extra = t.line('quick') ? 0 : -t.num('penalty', 2), swap = t.hand === 'off' && !!t.c;
    if (t.preview) {
      t.note(swap ? 'The ' + t.w.name + ' comes to your main hand first (no AP for the swap).' : t.hand === 'off' ? 'Fired from the off hand.' : 'Already in your main hand: the shot alone.');
      const r = strike(t, { extra }); return r.ok ? null : r.why || 'Can\'t attack that.';
    }
    if (swap) { const err = swapIn(t.cb, t.u, { from: 'off' }, { free: true }); if (err) return err; t.hand = 'main'; }
    const r = strike(t, { extra });
    if (!r.ok && !swap) return r.why || 'Can\'t attack that.';
    return null; // swapped: the swap stands even if the shot couldn't follow (the log says why)
  },
  ai: (t) => (t.tgt && t.hand === 'off' ? 5 : 0),
});

// 2. Burst: two rolls at one target, the second at −2 (3 rounds). Auto: three rolls (today's burst: each later one −1
//    more, the barrel cools 1 after), and it may split between two adjacent targets. Quick: no −2.
//    A split names the target of each roll in targetIds (repeats allowed); rolls past the list go at its last one.
technique({
  id: 'burst',
  run(t) {
    const p = t.line('auto', 'quick'), auto = p === 'auto';
    const ids = t.args.targetIds?.length ? t.args.targetIds : t.args.targetId ? [t.args.targetId] : [];
    if (!ids.length) return 'Pick a target.';
    const list = ids.map((id) => unitById(t, id));
    if (list.some((x) => !x)) return 'Pick a target.';
    if (list.some((x) => x === t.u)) return 'Pick someone else.';
    const n = auto ? t.num('auto_rolls', 3) : t.num('rolls', 2), targets = [...new Set(list as Unit[])];
    if (list.length > n) return 'A burst is ' + n + ' rolls.';
    if (targets.length > 1) {
      if (!auto) return 'Only an automatic weapon splits a burst.';
      if (targets.length > t.num('auto_split_targets', 2)) return 'A burst splits between two targets at most.';
      if (dist(targets[0].pos, targets[1].pos) > t.num('auto_split_range', 1)) return 'The two targets must stand next to each other.';
    }
    const rolls: Roll[] = [];
    for (let i = 0; i < n; i++) rolls.push({ target: list[Math.min(i, list.length - 1)]!, extra: auto ? -t.num('auto_step', 1) * i : i && p !== 'quick' ? -t.num('later_penalty', 2) : 0 });
    return volley(t, rolls, { burn: Math.max(0, (t.def.rounds as number) - n), cool: auto ? t.num('auto_heat_cool', 1) : 0 });
  },
  ai: (t) => (!t.tgt ? 0 : t.line('auto') ? 6 : 4),
});

// 4. Called Shot: −2 to hit. Choose leg (Slowed), arm (weapon lowered) or head (Dazed) in args.opt; on a hit the target
//    makes a Body save. Precise: no penalty. Loud or Heavy: leg is Prone instead (a stop: Stopped once applies).
//    Spread: only within 4 tiles (a limit, so it reads the raw property).
const PARTS = ['leg', 'arm', 'head'];
technique({
  id: 'called_shot',
  check(t) {
    if (!PARTS.includes(t.args.opt || '')) return 'Call the shot: leg, arm or head.';
    if (t.holds('spread') && t.tgt && dist(t.u.pos, t.tgt.pos) > t.num('spread_range', 4)) return 'A spread weapon calls its shot only within ' + t.num('spread_range', 4) + ' tiles.';
    return null;
  },
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('precise', 'loud', 'heavy'), part = t.args.opt as 'leg' | 'arm' | 'head', prone = part === 'leg' && (p === 'loud' || p === 'heavy');
    const r = strike(t, { extra: p === 'precise' ? 0 : -t.num('penalty', 2) });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (t.preview) t.note('On a hit: a Body save or ' + (prone ? 'Prone' : part === 'leg' ? 'Slowed' : part === 'arm' ? 'its weapon lowered' : 'Dazed') + '.');
    if (!t.preview && (!r.hit || r.killed || !alive(tgt))) return null;
    if (prone) { stop(t, tgt, 'prone', { save: ['body'] }); return null; }
    if (!save(t, tgt, 'body')) cond(t, tgt, part === 'leg' ? 'slowed' : part === 'arm' ? 'lowered' : 'dazed');
    return null;
  },
  ai: (t) => (t.tgt ? { score: 4, args: { opt: t.line('loud', 'heavy') ? 'leg' : 'head' } } : 0),
});

// 5. Walking Fire: move 2 tiles (args.tile, where the move ends) and fire one shot at any point of the move. Quick: 3
//    tiles, and no opportunity attacks. Auto: the shot is a Burst for 3 rounds. Heavy: not available (data: not_with).
//    The move is the engine's own walk with its AP waived (traps, opportunity attacks and held shots all apply).
//    args.opt is the point to fire from: 0 before the first step, 1 after it, and so on; without it, the point with the
//    best chance (the earliest on a tie).
let WALK: { u: Unit; quick: boolean } | null = null;
onHook('move_cost', (ctx: any) => { if (WALK && ctx.u === WALK.u) { ctx.ap = 0; ctx.free = true; if (WALK.quick) ctx.skipOA = true; } });
function walk(t: Tech, to: string, quick: boolean): string | null {
  const was = WALK; WALK = { u: t.u, quick };
  try { return moveUnit(t.cb, t.u, to, t.rng, 'move', { via: paths(t.cb, t.u.pos, t.u.id) }); } finally { WALK = was; }
}
/** The hit chance of one plain roll from a tile, changing nothing (a preview of the strike on a copy of the Tech). */
function chanceFrom(t: Tech, tile: string, target: Unit): number {
  const probe: Tech = { ...t, preview: true, pv: { ...t.pv, attacks: [], notes: [], rounds: 0 } };
  return standingAt(t, tile, () => { const r = strike(probe, { target }); return r.ok ? r.pct : -1; });
}
technique({
  id: 'walking_fire',
  run(t) {
    const tgt = t.tgt, u = t.u; if (!tgt) return 'Pick a target.';
    const p = t.line('quick', 'auto'), quick = p === 'quick', auto = p === 'auto', n = quick ? t.num('quick_tiles', 3) : t.num('tiles', 2);
    const blk = moveBlock(u); if (blk) return blk;
    const dest = t.args.tile; if (!dest) return 'Pick the tile the move ends on.';
    let route: string[] = [];
    if (dest !== u.pos) { const s = stepsWithin(t, n).find((x) => x.to === dest); if (!s) return 'Too far: Walking Fire moves ' + n + ' tiles.'; route = s.route; }
    const need = auto ? t.num('auto_rounds', 3) : 1;
    if (auto && usesRounds(t) && loaded(t) < need) return 'Needs ' + need + ' rounds, ' + loaded(t) + ' loaded.';
    const points = [u.pos, ...route];
    let at = -1;
    if (t.args.opt != null && t.args.opt !== '') {
      at = Number(t.args.opt);
      if (!Number.isInteger(at) || at < 0 || at >= points.length) return 'Fire from a point of the move: 0 to ' + (points.length - 1) + '.';
    } else {
      let best = -1; points.forEach((k, i) => { const pc = chanceFrom(t, k, tgt); if (pc > best) { best = pc; at = i; } });
      if (best < 0) return 'No point of that move gives you the shot.';
    }
    const shoot = (): string | null => {
      if (!auto) { const r = strike(t); return r.ok ? null : r.why || 'Can\'t attack that.'; }
      const rolls: Roll[] = []; for (let i = 0; i < t.num('auto_rolls', 3); i++) rolls.push({ target: tgt, extra: -t.num('auto_step', 1) * i });
      return volley(t, rolls, { burn: Math.max(0, need - rolls.length), cool: t.num('auto_heat_cool', 1) });
    };
    if (t.preview) {
      if (route.length) stepUser(t, route);
      t.note('Fires from ' + (at === 0 ? 'where you stand' : refOf(points[at])) + (route.length ? ', moving to ' + refOf(dest) : '') + (quick ? '; no opportunity attacks on the move.' : '.'));
      return standingAt(t, points[at], shoot);
    }
    if (at > 0) { const err = walk(t, points[at], quick); if (err) return err; } // the first change: a refusal here costs nothing
    if (alive(u) && !u.downed) { const e = shoot(); if (e) t.cb.log.push('  ' + u.name + ' has no shot: ' + e); } // a walk cut short still fires, from where it stopped
    if (at < points.length - 1 && alive(u) && !u.downed && u.pos === points[at] && !moveBlock(u)) {
      const left = n - (paths(t.cb, points[0], u.id).dist[u.pos] ?? 0), P = paths(t.cb, u.pos, u.id);
      if ((P.dist[dest] ?? 99) <= left) { const err = walk(t, dest, quick); if (err) t.cb.log.push('  ' + u.name + ' can\'t move on: ' + err); }
      else t.cb.log.push('  ' + u.name + ' can\'t move on to ' + refOf(dest) + ': the way is blocked.');
    }
    return null;
  },
  ai: () => 0, // an enemy moves and shoots with its own steps
});

// 6. Punch Through: half cover counts −2, not −5, and the cover takes the damage as well (every shot fired through it,
//    hit or miss: today's cover damage). Heavy: on a hit the round carries on to the next enemy in line at half (no
//    second roll or round). Blast or Spread: half cover is destroyed.
/** The half cover a target uses against this shot (none when the weapon ignores half cover). */
const facingCover = (t: Tech, tgt: Unit): string | null => ((t.w.properties || []).includes('ignores_half_cover') ? null : coverTileFor(t.cb, t.u.pos, tgt.pos));
/** The first enemy beyond the target on the line from the user through it, within the weapon's reach; a wall stops it. */
function nextInLine(t: Tech, past: Unit): Unit | null {
  const [fx, fy] = xy(t.u.pos), [tx, ty] = xy(past.pos), dx = tx - fx, dy = ty - fy, n = Math.max(Math.abs(dx), Math.abs(dy)); if (!n) return null;
  const reach = effectiveRange(t.w) * 3, walls = sightBlockers(t.cb);
  for (let k = n + 1; ; k++) {
    const x = Math.round(fx + (dx * k) / n), y = Math.round(fy + (dy * k) / n), at = key(x, y);
    if (x < 0 || y < 0 || x >= t.cb.map.w || y >= t.cb.map.h || dist(t.u.pos, at) > reach || walls.has(at)) return null;
    const v = t.cb.units.find((w) => w !== past && w !== t.u && alive(w) && w.pos === at && w.side !== t.u.side); if (v) return v;
  }
}
/** The carried round's damage before the next target's armour: half the shot's, with this hand's weapon. */
function carryDamage(t: Tech, next: Unit, crit: boolean): number {
  const u = t.u, w0 = u.weapon, a0 = u.ammoType;
  if (t.hand === 'off') { u.weapon = t.weaponId; u.ammoType = (u as any).offAmmoType ?? null; }
  try { return attackDamage(t.cb, u, next, 'shot', t.c, { crit, preview: true }).total * t.num('heavy_carry_mult', 0.5); } finally { u.weapon = w0; u.ammoType = a0; }
}
technique({
  id: 'punch_through',
  run(t) {
    const tgt = t.tgt, u = t.u, cb = t.cb; if (!tgt) return 'Pick a target.';
    const p = t.line('heavy', 'blast', 'spread'), ct = facingCover(t, tgt), wreck = p === 'blast' || p === 'spread';
    const r = strike(t, ct ? { ignoreCover: true, extra: -t.num('half_cover', 2), label: 'half cover (Punch Through)' } : {});
    if (!r.ok) return r.why || 'Can\'t attack that.';
    const fx: any = (t.w as any).grants?.effect || {};
    const coverDmg = weaponDamage(t.w, dist(u.pos, tgt.pos), t.c?.skills.raw_power || 0) * (t.c ? physicalMult(t.c) : 1) * (fx.op === 'cover_damage_mult' ? fx.value : 1);
    const next = p === 'heavy' ? nextInLine(t, tgt) : null;
    if (t.preview) {
      if (ct) t.note(wreck ? 'The half cover at ' + refOf(ct) + ' is destroyed.' : 'The half cover at ' + refOf(ct) + ' takes ' + Math.floor(coverDmg) + '.');
      if (next) t.note('On a hit the round carries on to ' + next.name + ' at half (' + Math.floor(carryDamage(t, next, false)) + ' before armour).');
      return null;
    }
    const obj = ct ? objectsAt(cb, ct).find((o) => o.hp != null && o.hp > 0) : null;
    if (ct && obj) cb.log.push('  The round punches through the ' + obj.name.toLowerCase() + damageObject(cb, ct, wreck ? obj.hp! : coverDmg, 0, u) + '.');
    if (next && r.hit && alive(next)) {
      cb.log.push('  The round carries on into ' + next.name + hurtUnit(next, carryDamage(t, next, r.crit), false, cb, 'weapon', u) + '.');
      if (alive(next)) addPressure(t, next, t.num('heavy_carry_pressure', 1), 'a round through ' + tgt.name);
    }
    return null;
  },
  ai: (t) => (!t.tgt ? 0 : facingCover(t, t.tgt) ? 7 : 3),
});
