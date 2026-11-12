// Physical 2.0, ranged Fire: damage. Shot and Aimed Shot are the lead's references; the ranged lane builds Snap Shot,
// Burst, Called Shot, Walking Fire and Punch Through here (Lob lives in thrown.ts: its Blast line is the grenade code).
import { technique, strike, addPressure, spendRounds, save, cond, stop, stepsWithin, standingAt, stepUser, turnStamp, onHook, type Tech } from './shared';
import { alive, dist, xy, key, emitFx, chained, burstRolls, burstCool, coverTileFor, objectsAt, damageObject, weaponDamage, moveUnit, moveBlock, paths, effectiveRange, attackDamage, hurtUnit, sightBlockers, refOf, type Unit } from '../../combat';
import { emit } from '../../effects/hooks';
import { landed } from '../../effects/output';
import { physicalMult } from '../../character';

// 0. Shot: one shot. Everyone knows it. Precise: +1 if you haven't moved this turn. Loud: a miss gives +1 Pressure.
technique({
  id: 'shot',
  run(t) {
    const p = t.line('precise', 'loud');
    const r = strike(t, { extra: p === 'precise' && !t.u.moved ? t.num('precise_still_hit', 1) : 0 });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (p === 'loud') { if (t.preview) t.note('A miss still gives +' + t.num('loud_miss_pressure', 1) + ' Pressure.'); else if (!r.hit && !r.cancelled && r.target) addPressure(t, r.target, t.num('loud_miss_pressure', 1), 'a loud miss'); }
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
const loaded = (t: Tech) => (t.hand === 'off' ? t.u.offAmmo ?? 0 : t.u.ammo);
const usesRounds = (t: Tech) => t.w.magazine != null && !t.u.infiniteAmmo;
interface Roll { target: Unit; extra: number }
/** A burst: the rolls in order, then the rounds it burns beyond them, then the barrel cooling (today's burst cools 1).
 * It is one attack action, as today's fireBurst makes it: the rolls run as one 'burst' volley (ctx.volley, ctx.vi:
 * Duck and Roll, Fire Discipline), the volley's own penalties replace Recoil after its first roll, and only the first
 * roll wears the weapon ("an attack action wears 1"). The volley stops at a jam or an empty magazine, and skips a roll
 * whose target is down; rounds it didn't fire stay loaded. The action raises the same 'volley' event and 'volley_end'
 * hook today's fireBurst does (Spray and Pray). */
function volley(t: Tech, rolls: Roll[], o: { burn: number; cool: number }): string | null {
  const u = t.u, cb = t.cb;
  const roll = (i: number, later: boolean) => strike(t, { target: rolls[i].target, extra: rolls[i].extra, label: t.def.name, vi: i, ...(later ? { noRecoil: true, noWear: true } : {}) });
  if (t.preview) {
    const why = chained(() => {
      for (let i = 0; i < rolls.length; i++) { const r = roll(i, i > 0); /* the core shows each later roll as it will be (the earlier ones' rounds and Heat) */ if (!r.ok) return rolls[i].target.name + ': ' + (r.why || 'can\'t attack that.'); }
      return null;
    }, 'burst');
    if (why) return why;
    if (o.burn > 0) spendRounds(t, o.burn);
    if (o.cool > 0 && t.w.heat_limit) t.note('The barrel cools ' + o.cool + ' Heat after the burst.');
    return null;
  }
  const first = rolls[0].target, rounds = rolls.length + Math.max(0, o.burn);
  emitFx(cb, 'volley', { unit: u.id, target: first.id, from: u.pos, to: first.pos, weapon: t.weaponId, cat: t.w.category, mode: 'burst', shots: rounds });
  const aimed: Unit[] = []; let made = 0;
  chained(() => {
    for (let i = 0; i < rolls.length; i++) {
      const tg = rolls[i].target;
      if ((t.hand === 'main' && u.jammed) || (usesRounds(t) && loaded(t) <= 0) || !alive(u)) break;
      if (!alive(tg)) continue;
      const r = roll(i, made > 0);
      if (!r.ok || r.cancelled) break; // the preview refuses it now (pushed out of sight, the gun broke), or it was answered before it came: the burst ends
      made++; if (!aimed.includes(tg)) aimed.push(tg);
    }
  }, 'burst');
  if (made === rolls.length && o.burn > 0) spendRounds(t, usesRounds(t) ? Math.min(o.burn, loaded(t)) : o.burn);
  if (o.cool > 0) u.heat = Math.max(0, u.heat - o.cool);
  emit(cb, 'volley_end', { u, mode: 'burst', target: first, hits: aimed, cb, rng: t.rng });
  return null;
}
const unitById = (t: Tech, id: string) => t.cb.units.find((x) => x.id === id) || null;

// 1. Snap Shot: draw or swap to this weapon and fire, at −2. Quick: no penalty. Heavy: not available (data: not_with).
//    The base's contract (needs.stowed): Snap Shot is used with a weapon in the pack (args.item names the entry; the
//    screen lists them in packPad). The core judges and previews that weapon as if held, then draws it for real
//    through the reducer's own gear change, its AP waived (what the main hand held goes into the pack), and runs this:
//    the shot alone. Under that contract the draw is the only use: a weapon already in either hand fires with Shot
//    (the spec's Pressure rules, item 12: "A weapon that isn't in the hand"). The ai score below is kept for when the
//    enemy AI offers techniques that draw: physical/ai.ts asks usable() without a stowed weapon, and an enemy has no
//    character pack (stowedOf), so today no enemy uses Snap Shot.
technique({
  id: 'snap_shot',
  run(t) {
    if (t.preview) t.note('The ' + t.w.name + ' comes out of your pack into your main hand first (no AP for the draw).');
    const r = strike(t, { extra: t.line('quick') ? 0 : -t.num('penalty', 2) });
    if (t.preview) return r.ok ? null : r.why || 'Can\'t attack that.';
    return null; // drawn: the draw stands even if the shot couldn't follow (the log says why)
  },
  ai: (t) => (t.tgt ? 5 : 0),
});

// 2. Burst (rules 1.18): three rounds, TWO rolls at one target, the second at −4. Auto: the two rolls may split between
//    two adjacent targets. Quick: the second roll is at −3. Heavy, while Braced (or Prone, or Emplaced): −1.
//    Heat is one a roll (2, as before). An enemy's Burst is the one its table was fitted with (three rolls, cools 1).
//    A split names the target of each roll in targetIds (repeats allowed); rolls past the list go at its last one.
//    The numbers are burstRolls' (combat.ts), which the plain burst action reads too.
technique({
  id: 'burst',
  run(t) {
    const auto = t.holds('auto') && !!t.line('auto');
    const ids = t.args.targetIds?.length ? t.args.targetIds : t.args.targetId ? [t.args.targetId] : [];
    if (!ids.length) return 'Pick a target.';
    const list = ids.map((id) => unitById(t, id));
    if (list.some((x) => !x)) return 'Pick a target.';
    if (list.some((x) => x === t.u)) return 'Pick someone else.';
    const steps = burstRolls(t.u, t.w), n = steps.length, targets = [...new Set(list as Unit[])];
    if (list.length > n) return 'A burst is ' + n + ' rolls.';
    if (targets.length > 1) {
      if (!auto) return 'Only an automatic weapon splits a burst.';
      if (targets.length > t.num('auto_split_targets', 2)) return 'A burst splits between two targets at most.';
      if (dist(targets[0].pos, targets[1].pos) > t.num('auto_split_range', 1)) return 'The two targets must stand next to each other.';
    }
    const rolls: Roll[] = steps.map((extra, i) => ({ target: list[Math.min(i, list.length - 1)]!, extra }));
    return volley(t, rolls, { burn: Math.max(0, (t.def.rounds as number) - n), cool: burstCool(t.u, auto) });
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
    const v = r.target || tgt; // riders follow the unit really struck (a redirect)
    if (!t.preview && (!r.hit || r.killed || !alive(v))) return null;
    if (prone) { stop(t, v, 'prone', { save: ['body'] }); return null; }
    if (!save(t, v, 'body')) cond(t, v, part === 'leg' ? 'slowed' : part === 'arm' ? 'lowered' : 'dazed');
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
      if (!Number.isInteger(at) || at < 0 || at >= points.length) return 'Pick the point of the move you fire from: 0 to ' + (points.length - 1) + '.';
    } else {
      let best = -1; points.forEach((k, i) => { const pc = chanceFrom(t, k, tgt); if (pc > best) { best = pc; at = i; } });
      if (best < 0) return 'No point of that move gives you the shot.';
    }
    const shoot = (): string | null => {
      if (!auto) { const r = strike(t); return r.ok ? null : r.why || 'Can\'t attack that.'; }
      const rolls: Roll[] = burstRolls(u, t.w).map((extra) => ({ target: tgt, extra })); // rules 1.18: the Burst's own rolls
      return volley(t, rolls, { burn: Math.max(0, need - rolls.length), cool: burstCool(u, true) });
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
/** The carried round's damage to the next target: half the shot's, with this hand's weapon, less that target's armour
 * as this round meets it (the weapon's pierce and the ammunition's armour rules still apply: it is the same round). */
function carryDamage(t: Tech, next: Unit, crit: boolean): number {
  const u = t.u, w0 = u.weapon, a0 = u.ammoType;
  if (t.hand === 'off') { u.weapon = t.weaponId; u.ammoType = (u as any).offAmmoType ?? null; }
  try { const d = attackDamage(t.cb, u, next, 'shot', t.c, { crit, preview: true }); return landed(d.total * t.num('heavy_carry_mult', 0.5), d.armour); } finally { u.weapon = w0; u.ammoType = a0; }
}
/** The carried round is a ranged hit on the next target (rules 1.12, Pressure rule 4): it marks the hit (Crossfire,
 * drill on a kill) and gives the ordinary Pressure only if it is the user's first ranged hit on that target this turn,
 * using that turn's slot up as a hit does. */
function carriedHit(t: Tech, next: Unit, dmg: number): string {
  const u = t.u, cb = t.cb, stamp = turnStamp(cb);
  (next.hitRound ||= {})[u.id] = cb.round; { const l = ((next.hitWith ||= {})[u.id] ||= []); if (!l.includes(t.weaponId)) l.push(t.weaponId); } // before the damage: a kill reads them (every weapon that damaged it, the base's drill list)
  const line = hurtUnit(next, dmg, true, cb, 'weapon', u); // armour already taken off
  const pt = u.pressedThis?.t === stamp ? u.pressedThis : (u.pressedThis = { t: stamp, ids: [] as string[] });
  if (!pt.ids.includes(next.id)) { pt.ids.push(next.id); if (alive(next)) addPressure(t, next, t.num('heavy_carry_pressure', 1), 'a round through ' + (t.tgt?.name || 'cover')); }
  return line;
}
// 31. Heavy Bolt (the crossbow's signature; Leon, 10 Nov 2026): one bolt at +50% damage that ignores 10 armour; on a
//     hit, a Body save or pushed 1 tile. Precise: +2 to hit. Quick (the repeating crossbow): 1 AP less (the data line).
technique({
  id: 'heavy_bolt',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const precise = t.line('precise', 'quick') === 'precise';
    const r = strike(t, { mult: 1 + t.num('damage_pct', 50) / 100, ignoreArmour: t.num('pierce', 10), extra: precise ? t.num('precise_hit', 2) : 0, label: 'Heavy Bolt' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    const v = r.target || tgt;
    if (t.preview) t.note('On a hit: a Body save or pushed ' + t.num('push', 1) + ' tile.');
    if (t.preview || (r.hit && alive(v))) stop(t, v, 'push', { tiles: t.num('push', 1) });
    return null;
  },
  ai(t) { return t.tgt && t.tgt.armour >= 5 ? 7 : 0; }, // worth its AP against armour; a plain shot otherwise
});
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
      if (next) t.note('On a hit the round carries on to ' + next.name + ' at half (' + carryDamage(t, next, false) + ' after armour).');
      return null;
    }
    const obj = ct ? objectsAt(cb, ct).find((o) => o.hp != null && o.hp > 0) : null;
    if (ct && obj) cb.log.push('  The round punches through the ' + obj.name.toLowerCase() + damageObject(cb, ct, wreck ? obj.hp! : coverDmg, 0, u) + '.');
    if (next && r.hit && alive(next)) {
      emitFx(cb, 'carry', { unit: u.id, from: tgt.pos, to: next.pos, target: next.id, tech: t.def.id });
      cb.log.push('  The round carries on into ' + next.name + carriedHit(t, next, carryDamage(t, next, r.crit)) + '.');
    }
    return null;
  },
  ai: (t) => (!t.tgt ? 0 : facingCover(t, t.tgt) ? 7 : 3),
});
