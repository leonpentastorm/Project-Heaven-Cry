// Physical 2.0, ranged Takes: the target must be Pressed; one a turn; the target loses 2 Pressure after the effect (the
// core does all three). wasSuppressed(t) says whether the stronger line applies. Dead Centre is the lead's reference; the
// ranged lane builds Pin Down, Rout, Stopping Shot, Storm and Last Round here.
import { technique, strike, canStrike, save, stop, ownSideOnly, forceMove, spendRounds, lowerPressure, wasSuppressed, isPressed, isSuppressed, pressureOf, pressureState, onHook, TECHNIQUE, type Tech } from './shared';
import { looseRound } from './press';
import { alive, dist, xy, paths, moveUnit, moveBlock, emitFx, type Combat, type Unit } from '../../combat';
import { radiusOf } from '../../tactics';
import { AP_BASE } from '../../effects/ap';
import { PHYS_RULES } from '../data';

// 21. Dead Centre: one shot at +50% damage. Suppressed: its cover doesn't count. Precise: +2 to hit. Drawn: ignores 5 armour.
technique({
  id: 'dead_centre',
  run(t) {
    const p = t.line('precise', 'drawn'), sup = wasSuppressed(t);
    const r = strike(t, { mult: 1 + t.num('damage_pct', 50) / 100, ignoreCover: sup, extra: p === 'precise' ? t.num('precise_hit', 2) : 0, ignoreArmour: p === 'drawn' ? t.num('drawn_pierce', 5) : undefined });
    if (t.preview && sup) t.note('Suppressed: its cover doesn\'t count.');
    return r.ok ? null : r.why || 'Can\'t attack that.';
  },
  ai: (t) => (t.tgt ? 8 : 0),
});

// ---------- moving someone with the engine's own walk ----------
/** Walk a unit to a tile with the engine's own move (traps, hazards, opportunity attacks and every held shot see each
 * tile), as part of a technique: it costs the walker nothing (its AP and movement bank are put back after, and for a
 * unit made to run on someone else's turn, its "moved this turn" too). Returns moveUnit's refusal, or null. */
function walkFree(u: Unit, to: string, t: Tech, keepMoved: boolean): string | null {
  const keep = { ap: u.ap, bank: u.bank, moved: u.moved };
  u.ap = 99; u.bank = 999; // the walk is priced at 0 AP, and nothing an item adds to it can refuse it
  try { return moveUnit(t.cb, u, to, t.rng, 'move', { via: paths(t.cb, u.pos, u.id) }); } finally { u.ap = keep.ap; u.bank = keep.bank; if (!keepMoved) u.moved = keep.moved; }
}
const occupied = (cb: Combat, u: Unit, k: string) => cb.units.some((x) => x !== u && !x.dead && x.pos === k);

// 22. Pin Down: a shot at ×0.7. On a hit the target saves (Guts or Athletics, the better) or is Pinned for 1 round.
//     Suppressed: the save is at −2. Auto: full damage. Drawn or Silent: nailed in place until it spends 2 AP.
//     The nail is the base's (stop with untilAp): it holds until the unit, or an ally next to it, spends the AP to pull
//     free (combat/pull-free; an enemy does it on its turn).
technique({
  id: 'pin_down',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('auto', 'drawn', 'silent'), sup = wasSuppressed(t), nailed = p === 'drawn' || p === 'silent', ap = t.num('nailed_ap', 2);
    const r = strike(t, { mult: p === 'auto' ? 1 : t.num('damage_mult', 0.7), label: 'Pin Down' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (r.cancelled) return null;
    if (t.preview) t.note('On a hit: a save (Guts or Athletics' + (sup ? ', at −' + t.num('suppressed_save', 2) : '') + ') or ' + (nailed ? 'nailed in place until it spends ' + ap + ' AP to pull free' : 'Pinned for ' + t.num('pinned_rounds', 1) + ' round') + '.');
    const v = r.target || tgt;
    if (t.preview || (r.hit && alive(v))) stop(t, v, 'pinned', { tnAdd: sup ? t.num('suppressed_save', 2) : 0, ...(nailed ? { untilAp: ap } : { rounds: t.num('pinned_rounds', 1) }) });
    return null;
  },
  ai: (t) => (t.tgt ? 7 : 0),
});
const num = (id: string, k: string, fb: number) => { const v = TECHNIQUE[id]?.numbers?.[k]; return typeof v === 'number' ? v : fb; };

// 23. Rout: no damage. The target makes a Heart save or runs its full move away from you, drawing opportunity attacks and
//     Watches. Suppressed: the save is at −3. Loud: −2 more. Blast: everyone Pressed in the radius.
/** Where a routed unit runs: the tile within its full move (a fresh turn's AP of movement) farthest from the user, then
 * the shortest run, then the first by key. null: no tile takes it farther away. Pure. */
function runTo(cb: Combat, v: Unit, from: Unit, tiles: number): string | null {
  const P = paths(cb, v.pos, v.id);
  let best: string | null = null, bestAway = dist(v.pos, from.pos), bestD = 0;
  for (const [k, d] of Object.entries(P.dist)) {
    if (k === v.pos || d > tiles || occupied(cb, v, k)) continue;
    const away = dist(k, from.pos);
    if (away > bestAway || (best && away === bestAway && (d < bestD || (d === bestD && k < best)))) { best = k; bestAway = away; bestD = d; }
  }
  return best;
}
technique({
  id: 'rout',
  check(t) { return t.tgt && !canStrike(t, t.tgt) ? 'You can\'t get a shot near ' + t.tgt.name + '.' : null; },
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('loud', 'blast'), cb = t.cb, rad = p === 'blast' ? radiusOf(t.w) : 0, cost = PHYS_RULES.pressure.take_cost;
    // everyone it reaches, each with whether it was Suppressed when the Take began
    const who: { v: Unit; sup: boolean }[] = [{ v: tgt, sup: wasSuppressed(t) }];
    if (rad) for (const v of cb.units) if (v !== tgt && v.side !== t.u.side && alive(v) && isPressed(v) && dist(v.pos, tgt.pos) <= rad) who.push({ v, sup: isSuppressed(v) });
    const tn = (sup: boolean) => (sup ? t.num('suppressed_save', 3) : 0) + (p === 'loud' ? t.num('loud_save', 2) : 0);
    const tiles = (v: Unit) => Math.floor(t.num('run_ap', AP_BASE) * v.movement);
    // no roll: the round is fired over its head (the core checked the magazine). It is still a shot by today's rules
    // (Heat, Recoil for later shots, wear, the report that reveals a Hidden shooter), as Warning Shot's is (review fix)
    spendRounds(t, typeof t.def.rounds === 'number' ? t.def.rounds : 1); looseRound(t, tgt.pos, { rout: true });
    if (t.preview) {
      t.note('No damage. A Heart save' + (tn(who[0].sup) ? ' at −' + tn(who[0].sup) : '') + ', or it runs its full move away from you (opportunity attacks and held shots fire).' + (rad ? ' Blast: everyone Pressed within ' + rad + ' tiles of it too.' : ''));
      for (const { v, sup } of who) {
        save(t, v, 'heart', tn(sup));
        const to = moveBlock(v) ? null : runTo(cb, v, t.u, tiles(v));
        if (to) (t.pv.moves ||= []).push({ unit: v.id, to }); else t.note(v.name + ' has nowhere to run.');
        if (v !== tgt) { const now = pressureOf(v), after = Math.max(0, now - cost); (t.pv.pressure ||= []).push({ unit: v.id, add: after - now, after, state: pressureState({ pressure: after } as any) }); }
      }
      return null;
    }
    for (const { v, sup } of who) {
      if (!alive(v) || !alive(t.u)) continue;
      if (save(t, v, 'heart', tn(sup))) continue;
      const blk = moveBlock(v); if (blk) { t.note(v.name + ' can\'t run: ' + blk); continue; }
      const to = runTo(cb, v, t.u, tiles(v)); if (!to) { t.note(v.name + ' has nowhere to run.'); continue; }
      cb.log.push(v.name + ' breaks and runs (Rout).');
      emitFx(cb, 'routed', { unit: v.id, from: v.pos, to, by: t.u.id });
      const err = walkFree(v, to, t, false); if (err) t.note(v.name + ' can\'t run: ' + err);
    }
    // Blast: it is a Take on each of them, so each pays the Take's cost (the core lowers the target itself)
    for (const { v } of who) if (v !== tgt) lowerPressure(t, v, cost);
    return null;
  },
  ai: (t) => (t.tgt ? 5 : 0),
});

// 24. Stopping Shot: a shot. On a hit the target saves (Guts or Athletics, the better) or loses 1 AP next turn and is
//     pushed 1 tile. Suppressed: it also falls Prone on a failed save. Loud or Heavy: pushed 2. Spread (within 4 tiles):
//     pushed 2 and Prone either way (read: Suppressed or not; still on a failed save).
technique({
  id: 'stopping_shot',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    let p = t.line('loud', 'heavy', 'spread'); const sup = wasSuppressed(t);
    if (p === 'spread' && dist(t.u.pos, tgt.pos) > t.num('spread_range', 4)) p = null; // the Spread line works within 4 tiles only
    const r = strike(t, { label: 'Stopping Shot' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    const tiles = p ? t.num('push_more', 2) : t.num('push', 1), prone = sup || p === 'spread';
    if (t.preview) {
      t.note('On a hit: a save (Guts or Athletics) or −' + t.num('ap_loss', 1) + ' AP next turn and pushed ' + tiles + (prone ? ', and Prone' : '') + '.');
      // (stop() records where the push would put it)
    }
    const v = r.target || tgt; // riders follow the unit really struck (a redirect)
    if (t.preview || (r.hit && alive(v))) stop(t, v, prone ? ['push', 'prone'] : 'push', { tiles, apLoss: t.num('ap_loss', 1) });
    return null;
  },
  ai: (t) => (t.tgt ? 7 : 0),
});

// 25. Storm: move up to 3 tiles toward the target without its reaction, then shoot. Suppressed: the shot is a critical
//     on 18–20. Quick: +2 to hit. Spread: Body save or Prone (on a hit).
/** Run fn as if the user stood on a tile having moved there (a preview of "move, then shoot"). Nothing stays changed. */
function asIfAt<T>(u: Unit, tile: string, fn: () => T): T {
  if (tile === u.pos) return fn();
  const keep = { pos: u.pos, moved: u.moved, braced: u.braced };
  u.pos = tile; u.moved = true; u.braced = false;
  try { return fn(); } finally { Object.assign(u, keep); }
}
/** Where Storm takes the user: args.tile if it is within reach, nearer the target and has the shot; else the tile within
 * reach nearest the target that has the shot (then the straightest line in, the shortest move, the first by key); else
 * where it stands.
 * A string is a refusal. Pure. */
function stormTo(t: Tech, tgt: Unit): { to: string } | string {
  const u = t.u, n = t.num('move', 3), d0 = dist(u.pos, tgt.pos), named = t.args.tile;
  const shotFrom = (k: string) => asIfAt(u, k, () => canStrike(t, tgt));
  const [tx, ty] = xy(tgt.pos), line = (k: string) => { const [x, y] = xy(k); return Math.hypot(x - tx, y - ty); }; // the straightest way in
  if (named && named !== u.pos) {
    const blk = moveBlock(u); if (blk) return blk;
    const d = paths(t.cb, u.pos, u.id).dist[named];
    if (d === undefined || d > n || occupied(t.cb, u, named)) return 'Storm moves up to ' + n + ' tiles.';
    if (dist(named, tgt.pos) >= d0) return 'Storm moves toward the target.';
    return shotFrom(named) ? { to: named } : 'No shot at ' + tgt.name + ' from there.';
  }
  if (!moveBlock(u)) {
    const P = paths(t.cb, u.pos, u.id);
    const ks = Object.keys(P.dist).filter((k) => k !== u.pos && P.dist[k] <= n && !occupied(t.cb, u, k) && dist(k, tgt.pos) < d0)
      .sort((a, b) => dist(a, tgt.pos) - dist(b, tgt.pos) || line(a) - line(b) || P.dist[a] - P.dist[b] || (a < b ? -1 : 1));
    const k = ks.find(shotFrom); if (k) return { to: k };
  }
  return shotFrom(u.pos) ? { to: u.pos } : 'No shot at ' + tgt.name + ' within ' + n + ' tiles.';
}
// While a Storm's walk runs, its target can't react to it (no opportunity attack, no held shot); everyone else can.
let STORMING: { by: string; target: string } | null = null;
onHook('reaction_window', (ctx: any) => { if (STORMING && !ctx.cancel && ctx.reactor?.id === STORMING.target && ctx.mover?.id === STORMING.by) ctx.cancel = true; });
technique({
  id: 'storm',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const plan = stormTo(t, tgt); if (typeof plan === 'string') return plan;
    const p = t.line('quick', 'spread'), sup = wasSuppressed(t);
    const o = { extra: p === 'quick' ? t.num('quick_hit', 2) : 0, critMin: sup ? t.num('suppressed_crit_min', 18) : undefined, label: 'Storm' };
    if (t.preview) {
      if (plan.to !== t.u.pos) { (t.pv.moves ||= []).push({ unit: t.u.id, to: plan.to }); t.note(tgt.name + ' can\'t react to the move.'); }
      const r = asIfAt(t.u, plan.to, () => strike(t, o));
      if (!r.ok) return r.why || 'Can\'t attack that.';
      if (sup) t.note('Suppressed: a critical on ' + o.critMin + '–20.');
      if (p === 'spread') { t.note('On a hit: a Body save or Prone.'); stop(t, tgt, 'prone', { save: ['body'] }); }
      return null;
    }
    if (plan.to !== t.u.pos) {
      STORMING = { by: t.u.id, target: tgt.id };
      try { const err = walkFree(t.u, plan.to, t, true); if (err) t.note('The move is cut short: ' + err); } finally { STORMING = null; }
    }
    if (!alive(t.u) || !alive(tgt)) return null; // the walk was answered by someone else: the AP stays spent
    if (!canStrike(t, tgt)) { t.note('No shot at ' + tgt.name + ' from here.'); return null; }
    const r = strike(t, o);
    if (r.ok && r.hit && p === 'spread' && alive(r.target || tgt)) stop(t, r.target || tgt, 'prone', { save: ['body'] }); // the unit really struck
    return null;
  },
  ai: (t) => (t.tgt ? 6 : 0),
});

// 26. Last Round: only with the last round in the weapon (the core checks the magazine): +3 to hit. If it takes the target
//     out, your next speed reload is free (u.freeReload; the reload reads it). Suppressed: it can't be reduced by cover.
//     Quick and Precise (a revolver): +50% damage. Drawn: the last arrow in the quiver counts (u.ammo is the quiver's
//     total, ranged/quiver.ts, so the core's gate counts arrows); a bow has no reload in a fight, so no free one.
technique({
  id: 'last_round',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('quick', 'precise', 'drawn'), sup = wasSuppressed(t), reloads = !t.holds('drawn');
    const r = strike(t, { extra: t.num('hit', 3), ignoreCover: sup, mult: p === 'quick' || p === 'precise' ? 1 + t.num('damage_pct', 50) / 100 : 1, label: 'Last Round' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (t.preview) { if (sup) t.note('Suppressed: its cover doesn\'t count.'); if (reloads) t.note('If it takes ' + tgt.name + ' out, your next speed reload is free.'); return null; }
    if (reloads && !r.cancelled && (r.killed || !alive(tgt))) { t.u.freeReload = true; t.note('The next speed reload is free.'); emitFx(t.cb, 'free_reload', { unit: t.u.id, at: t.u.pos, tech: t.def.id, ...ownSideOnly(t.cb, t.u) }); }
    return null;
  },
  ai: (t) => (t.tgt ? 9 : 0),
});
// The free speed reload goes on the next speed reload of the main hand (a tactical one keeps it): reload() spends it
// (the base), and a reload whose AP something else waives (Resupply, Running Reload) leaves it owed.
