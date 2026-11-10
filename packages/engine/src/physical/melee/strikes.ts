// Physical 2.0, melee Strikes: the body of a chain. Cut is the lead's reference; the melee lane builds Sweep, Bash,
// Sunder, Flurry, Hamstring, Bind, Half-Sword and Throw here.
import { technique, strike, cond } from './shared';

// 6. Cut: one strike. Everyone knows it. Edge: a critical leaves Bleeding. Point: +1 to hit. Blunt: a critical leaves Dazed.
technique({
  id: 'cut',
  run(t) {
    const p = t.line('edge', 'point', 'blunt');
    const r = strike(t, { extra: p === 'point' ? t.num('point_hit', 1) : 0 });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (r.hit && r.crit && !r.killed && r.target && (p === 'edge' || p === 'blunt')) cond(t, r.target, p === 'edge' ? 'bleeding' : 'dazed');
    return null;
  },
  ai: () => 5,
});

// ---------- Sweep, Bash, Sunder, Flurry ----------
import { type Combat, type Unit, alive, xy, key, keyOf, refOf, dist, lineOfSight, dropToPile } from '../../combat';
import { throwRangeOf } from '../../tactics';
import { PHYS_RULES, weaponPhys } from '../data';
import { save, stop, forceMove, setUp, momentumOf, chainOf, canStrike, loseWeapon } from '../core';
import { meleeFx, fxMark, movedSince, refuseFx, upto } from './shared';
import type { Tech } from './shared';

/** args.tile as a tile key ("x,y"); the reducer already turns a map reference into one, a direct call may not. */
const tileArg = (t: Tech): string | null => (!t.args.tile ? null : /^\d+,\d+$/.test(t.args.tile) ? t.args.tile : keyOf(t.args.tile, t.cb.map));
/** The eight directions in turning order (neighbours in the list are 45° apart). */
const DIRS: [number, number][] = [[1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1]];
const unitAt = (cb: Combat, k: string): Unit | null => cb.units.find((v) => alive(v) && v.pos === k) || null;
/** A line that says "costs n AP less" but has no `ap` in the data: the handler gives the AP back itself (the core
 * charged the full cost). Once the data carries the line's `ap`, the core charges it and this does nothing. */
function lineDiscount(t: Tech, prop: string, n: number): void {
  const l = t.def.lines.find((x) => x.props.includes(prop)); if (!l || l.ap != null || n <= 0) return;
  const back = Math.min(n, t.pv.ap); if (!back) return;
  t.pv.ap -= back; if (!t.preview) t.u.ap += back;
}
// 7. Sweep: strike up to 3 enemies in an arc in front of you, each at ×0.7, one roll each. Reach: the arc is 2 tiles
//    out. Heavy: all adjacent enemies, not just the arc. Edge: each one hit bleeds on a critical. Friendly fire applies:
//    everyone standing on the swept tiles is struck, allies too. The arc faces the tile picked (or the target).
function sweepTiles(t: Tech, dir: [number, number] | null, p: string | null): string[] {
  const [x, y] = xy(t.u.pos), out: string[] = [];
  const add = (dx: number, dy: number, k: number) => { const nx = x + dx * k, ny = y + dy * k; if (nx >= 0 && ny >= 0 && nx < t.cb.map.w && ny < t.cb.map.h) out.push(key(nx, ny)); };
  if (p === 'heavy') { for (const [dx, dy] of DIRS) add(dx, dy, 1); return out; }
  if (!dir) return out;
  // the three tiles in front (the facing and 45° to each side); Reach moves the whole arc out along the facing
  const i = DIRS.findIndex(([dx, dy]) => dx === dir[0] && dy === dir[1]), out1 = (p === 'reach' ? t.num('reach_out', 2) : 1) - 1;
  for (const j of [i, (i + 1) % 8, (i + 7) % 8]) add(DIRS[j][0] + dir[0] * out1, DIRS[j][1] + dir[1] * out1, 1);
  return out;
}
function sweepDir(t: Tech, toward: string | null): [number, number] | null {
  if (!toward || toward === t.u.pos) return null;
  const [x, y] = xy(t.u.pos), [tx, ty] = xy(toward); return [Math.sign(tx - x), Math.sign(ty - y)];
}
technique({
  id: 'sweep',
  run(t) {
    const p = t.line('reach', 'heavy', 'edge');
    const dir = sweepDir(t, tileArg(t) || t.tgt?.pos || null);
    if (!dir && p !== 'heavy') return 'Pick a direction to sweep.';
    const tiles = sweepTiles(t, dir, p);
    const struck = tiles.map((k) => unitAt(t.cb, k)).filter((v): v is Unit => !!v && v !== t.u && canStrike(t, v));
    if (!struck.length) return 'No one to strike in the arc.';
    if (!struck.some((v) => v.side !== t.u.side)) return 'Only allies in the arc.';
    if (t.preview) {
      t.pv.area = tiles;
      if (p === 'edge') t.note('A critical leaves each one hit Bleeding.');
      if (struck.some((v) => v.side === t.u.side)) t.note('Allies in the arc are struck too.');
    }
    const mult = t.num('mult', 0.7);
    const fx = meleeFx(t, 'arc', { tiles, struck: struck.map((v) => v.id), dir: dir || null, heavy: p === 'heavy' });
    let made = 0;
    for (const v of struck) {
      if (!alive(t.u)) break;
      if (!alive(v)) continue;
      const r = strike(t, { target: v, mult, label: 'Sweep', chain: made++ > 0 }); // the later strikes play at the chained beat
      if (r.hit && r.crit && !r.killed && p === 'edge') cond(t, r.target || v, 'bleeding'); // the unit really struck
    }
    upto(t, fx);
    return null;
  },
  ai(t) {
    // the best direction: the most enemies and no allies; a sweep that finds one is worse than a plain attack
    const p = t.line('reach', 'heavy', 'edge'), [x, y] = xy(t.u.pos);
    let best = { score: 0, tile: '' };
    for (const d of p === 'heavy' ? [DIRS[0]] : DIRS) {
      const units = sweepTiles(t, d, p).map((k) => unitAt(t.cb, k)).filter((v): v is Unit => !!v && v !== t.u);
      const foes = units.filter((v) => v.side !== t.u.side).length, allies = units.length - foes;
      const score = foes < 2 ? (foes ? 3 : 0) : 5 + 2 * (foes - 1) - 5 * allies;
      if (score > best.score) best = { score, tile: key(x + d[0], y + d[1]) };
    }
    return best.score > 0 ? { score: best.score, args: { tile: best.tile } } : 0;
  },
});

// 8. Bash: strike at ×0.5 with the pommel, haft or fist. The target makes a Body save or is Dazed. Blunt: full damage.
//    Heavy: on a failed save it is pushed 2 tiles instead of Dazed, your choice (opt 'push'). Bare: costs 1 AP less.
technique({
  id: 'bash',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('blunt', 'heavy', 'bare');
    const r = strike(t, { mult: p === 'blunt' ? 1 : t.num('mult', 0.5), label: 'Bash' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (p === 'bare') lineDiscount(t, 'bare', t.num('bare_ap_less', 1));
    const push = p === 'heavy' && t.args.opt === 'push', v = r.target || tgt; // riders on the unit really struck
    if (t.preview && p === 'heavy' && !push) t.note('Heavy: on a failed save you may push it ' + t.num('heavy_push', 2) + ' tiles instead of Dazed (choose push).');
    if (t.preview || (r.hit && !r.killed && alive(v))) {
      if (!save(t, v, 'body')) {
        if (push) {
          const mk = fxMark(t);
          stop(t, v, 'push', { tiles: t.num('heavy_push', 2), save: false });
          const path = movedSince(t, v.id, mk); if (path.length > 1) meleeFx(t, 'force', { target: v.id, path, how: 'push' });
        }
        else cond(t, v, 'dazed');
      }
    }
    return null;
  },
  ai: (t) => (t.tgt ? (t.tgt.dazedNext ? 4 : 6) : 0),
});

// 9. Sunder: strike at ×0.7. On a hit the target's armour is 5 lower for the rest of the fight (once per target per
//    attacker). Blunt or Hook: 10 lower. Edge: if the target has no armour left, Bleeding instead.
//    Reading: while a Break (Blunt) holds the armour at 0, Sunder works on the armour the target will have back (the
//    break's saved cut), so the mend restores the sundered value; "no armour left" reads that armour too.
technique({
  id: 'sunder',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('blunt', 'hook', 'edge');
    const r = strike(t, { mult: t.num('mult', 0.7), label: 'Sunder' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    const v = r.target || tgt; // the unit really struck (a redirect): the armour cut follows it
    if (!t.preview && (!r.hit || r.killed || !alive(v))) return null;
    const br = v.tech?.break, broken = !!br && br.cut != null, base = broken ? br!.cut : v.armour; // Break holds it at 0 for now
    if (p === 'edge' && base <= 0) { cond(t, v, 'bleeding'); return null; }
    const st = t.state();
    if ((st.done || {})[v.id]) { t.note(v.name + '\'s armour is already sundered by you.'); return null; }
    const now = Math.max(0, base - (p === 'blunt' || p === 'hook' ? t.num('blunt_hook_lower', 10) : t.num('lower', 5)));
    if (t.preview) { t.note('On a hit: ' + v.name + '\'s armour ' + base + ' → ' + now + ' for the rest of the fight' + (broken ? ' (after the Break)' : '') + '.'); return null; }
    st.done = { ...(st.done || {}), [v.id]: true };
    if (broken) br!.cut = now; else v.armour = now;
    meleeFx(t, 'sunder', { target: v.id, to: v.pos, was: base, now, broken });
    t.cb.log.push(v.name + '\'s armour is sundered to ' + now + (broken ? ' once the Break ends' : '') + ' (Sunder).');
    return null;
  },
  ai: (t) => (!t.tgt ? 0 : t.tgt.armour > 0 && !(t.u.tech?.sunder?.done || {})[t.tgt.id] ? 6 : 3),
});

// 10. Flurry: two strikes at ×0.6 at one target, the second at −1 to hit. Its hits give no Momentum (a Strike
//     spends 1). Light: three strikes (each after the first at −1). Bare: each hit after the first adds +1 to the
//     next Bind or Throw Down this turn. Thrown: the strikes may go to two targets in throwing range (targetIds); the
//     weapon lands in the pile on the tile of the last target thrown at.
technique({
  id: 'flurry',
  run(t) {
    const p = t.line('light', 'bare', 'thrown'), thrown = p === 'thrown';
    const n = p === 'light' ? t.num('light_strikes', 3) : t.num('strikes', 2);
    const mult = t.num('mult', 0.6), later = t.num('later_hit', -1);
    const ids = thrown ? [...new Set([...(t.args.targetIds || []), ...(t.args.targetId ? [t.args.targetId] : [])])].slice(0, t.num('thrown_targets', 2)) : t.tgt ? [t.tgt.id] : [];
    const targets = ids.map((id) => t.cb.units.find((x) => x.id === id)).filter((v): v is Unit => !!v);
    if (!targets.length || targets.length !== ids.length) return 'Pick a target.';
    const range: number = thrown ? throwRangeOf(t.u) : 0; // the core's thrown strike checks the same range
    if (thrown) for (const v of targets) {
      if (dist(t.u.pos, v.pos) > range) return v.name + ' is out of throwing range (' + range + ' tiles).';
      if (!lineOfSight(t.cb, t.u.pos, v.pos)) return 'No line of sight to ' + v.name + '.';
    }
    if (t.preview) { if (p === 'bare') t.note('Each hit after the first: +' + t.num('bare_bonus', 1) + ' to the save your next Bind or Throw Down against it this turn forces.'); }
    let hits = 0, last: Unit | null = null, lastHit: Unit | null = null;
    const fx = meleeFx(t, 'flurry', { targets: targets.map((v) => v.id), tiles: targets.map((v) => v.pos), strikes: n, thrown, weapon: t.weaponId });
    for (let i = 0; i < n; i++) {
      let v = targets[i % targets.length];
      if (!t.preview) { if (!alive(t.u)) break; if (!alive(v)) { const o = targets.find((x) => alive(x)); if (!o) break; v = o; } }
      const r = strike(t, { target: v, mult, extra: i ? later : 0, label: 'Flurry', chain: i > 0, ...(thrown ? { thrown: true } : {}) });
      if (!r.ok) { if (i === 0) { refuseFx(fx); return r.why || 'Can\'t attack that.'; } continue; }
      last = v; if (r.hit) { hits++; lastHit = r.target || v; }
    }
    upto(t, fx); if (fx && thrown && last) (fx as any).land = last.pos; // the client flies the weapon on each thrown shot and drops it here
    // the mark goes on the unit really struck (a redirect); Bind and Throw Down read it (melee/shared setUpBonus)
    if (p === 'bare' && hits > 1 && lastHit) setUp(t, lastHit, { hit: (hits - 1) * t.num('bare_bonus', 1), label: 'Flurry', only: ['bind', 'throw_down'] });
    if (thrown && last) loseWeapon(t, last.pos); // one weapon held: it lands by the last target thrown at
    return null;
  },
  ai: (t) => (t.tgt ? 6 : 0),
});
