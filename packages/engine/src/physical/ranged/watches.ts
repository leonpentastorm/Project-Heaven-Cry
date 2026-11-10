// Physical 2.0, ranged Watches: paid for on your turn with holdWatch(); the core calls `react` on the hook for the unit
// holding it; the handler checks the trigger and calls fireWatch(), which spends the reaction (never while Pressed).
// Overwatch and Deny are the lead's references; the ranged lane builds Cover Me and Dead to Rights here.
import { technique, strike, canStrike, holdWatch, fireWatch, stop } from './shared';
import { alive, dist, lineOfSight, unitSees, effectiveRange, xy, key } from '../../combat';

// 27. Overwatch: the first enemy to move in your sight: the held shot. Precise: +2. Auto: it is a Burst (3 rounds, each
//     later one −1). Spread: anyone coming within 4 tiles (instead of anyone moving in sight).
technique({
  id: 'overwatch',
  run(t) { holdWatch(t, { trigger: 'moves' }); return null; },
  react: {
    move_step(ctx, t) {
      const m = ctx.u; if (!m || m.side === t.u.side || !alive(m) || m.hidden || ctx.skipOW || !unitSees(t.cb, t.u, m.pos)) return;
      const p = t.line('precise', 'auto', 'spread');
      if (p === 'spread' && dist(t.u.pos, m.pos) > t.num('spread_range', 4)) return;
      if (!canStrike(t, m)) return;
      fireWatch(t, ctx, m, () => {
        const shots = p === 'auto' ? 3 : Math.max(1, t.u.owShots || 1); t.u.owShots = 0;
        for (let i = 0; i < shots && alive(m); i++) if (!strike(t, { target: m, extra: (p === 'precise' ? t.num('precise_hit', 2) : 0) - (p === 'auto' ? i : 0) }).ok) break;
      }, 'overwatch');
    },
  },
  ai: () => 2,
});

// 28. Deny: the first enemy to enter a tile you name: the shot; on a hit it stops there. Heavy, Braced: any tile in a
//     straight line of 3 (across your line of fire, the named tile in the middle). Blast: the tile takes the blast
//     (the weapon's own blast on a hit).
technique({
  id: 'deny',
  check(t) {
    const k = t.args.tile; if (!k) return 'Name a tile.';
    if (!lineOfSight(t.cb, t.u.pos, k)) return 'You can\'t see that tile.';
    if (dist(t.u.pos, k) > effectiveRange(t.w) * 3) return 'Out of range.';
    return null;
  },
  run(t) {
    const k = t.args.tile!, [x, y] = xy(k), [ux, uy] = xy(t.u.pos);
    const across = Math.abs(x - ux) >= Math.abs(y - uy) ? [0, 1] : [1, 0], n = t.line('heavy') ? t.num('heavy_line', 3) : 1, half = Math.floor(n / 2);
    const tiles: string[] = []; for (let i = -half; i <= half; i++) { const tx = x + across[0] * i, ty = y + across[1] * i; if (tx >= 0 && ty >= 0 && tx < t.cb.map.w && ty < t.cb.map.h) tiles.push(key(tx, ty)); }
    holdWatch(t, { trigger: 'enters_tile', tile: k, tiles });
    return null;
  },
  react: {
    move_step(ctx, t) {
      const m = ctx.u, w = (t.u as any).watch; if (!m || m.side === t.u.side || !alive(m) || !(w.tiles || [w.tile]).includes(ctx.at) || !canStrike(t, m)) return;
      fireWatch(t, ctx, m, () => { const r = strike(t, { target: m }); if (r.hit && alive(m) && stop(t, m, 'halt', { save: false })) ctx.stop = 'denied'; });
    },
  },
  ai: () => 0,
});
