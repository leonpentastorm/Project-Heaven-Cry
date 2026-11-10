// Physical 2.0, melee Finishers: they need Momentum 2, spend all of it and end the chain. Coup is the lead's reference;
// the melee lane builds Cleave, Break, Run Through and Throw Down here.
//
// Readings (the result note lists them):
//   Cleave: the extra targets are enemies adjacent to you (Heavy: within 2 tiles of you); the player names them
//     (targetIds, in order), else the nearest to the first target. Enemies only: the text says "enemy".
//   Break: the Blunt and Hook riders come with the failed save ("also", "as well"), not with every hit. Blunt's armour
//     0 lasts until the start of the breaker's next turn (break.armour_rounds rounds).
//   Run Through: the Pin is the core's nail (stop 'pinned' with untilAp): it holds until the unit, or an ally next to
//     it, spends 2 AP (combat/pull-free; the enemy AI frees itself). Reach, opt 'leave': the weapon stays in the target
//     (loseWeapon(t, null), recorded on the nail) and drops into the pile on its tile when it is pulled free.
//   Throw Down: the tile is next to you (Heavy: within 2 tiles of you); no tile is the target's own. An occupied tile:
//     the target is slammed into whoever stands there and stays where it was. Bare: the slam always hits (no roll).
import { technique, strike, spendMomentum, momentumOf, save, cond, stop, forceMove, techState, onHook } from './shared';
import type { Tech, StrikeResult } from './shared';
import type { StrikeOpts } from '../types';
import { strikingWith, loseWeapon } from '../core';
import { weaponPhys, TECHNIQUE } from '../data';
import { type Combat, type Unit, alive, dist, xy, key, keyOf, refOf, moveBlockers, dropToPile } from '../../combat';
import { condOn, condSource, endCond } from '../../magic';
import { handEntry, emptyHand, mod, type PackItem } from '../../character';

// ---------- shared bits ----------
/** args.tile as a tile key ("x,y"); the reducer turns a map reference into one, a direct call may not. */
const tileArg = (t: Tech): string | null => (!t.args.tile ? null : /^\d+,\d+$/.test(t.args.tile) ? t.args.tile : keyOf(t.args.tile, t.cb.map));
const unitAt = (cb: Combat, k: string, not?: Unit): Unit | null => cb.units.find((v) => v !== not && !v.dead && v.pos === k) || null;
const isFoe = (t: Tech, v: Unit) => v.side !== t.u.side && alive(v);
/** A strike at a second target: in a preview a strike that can't be made is left off the card (it isn't a refusal). */
function also(t: Tech, o: StrikeOpts): StrikeResult {
  const n = t.pv.attacks.length, r = strike(t, o);
  if (t.preview && !r.ok && t.pv.attacks.length > n) t.pv.attacks.splice(n);
  return r;
}

// 20. Coup: one strike at +25% damage per Momentum spent. Edge: +50% more against a target that is Bleeding, Dazed,
//     Prone or Downed. Point: a hit is a critical if the target is at a quarter HP or less.
technique({
  id: 'coup',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('edge', 'point'), m = momentumOf(t.u);
    const soft = !!tgt.bleed || !!tgt.dazedNext || !!tgt.prone || tgt.downed;
    const mult = 1 + (m * t.num('per_momentum_pct', 25) + (p === 'edge' && soft ? t.num('edge_bonus_pct', 50) : 0)) / 100;
    const r = strike(t, { mult, noMomentum: true, critOnHit: p === 'point' && tgt.hp <= tgt.maxHp * t.num('point_crit_hp_pct', 25) / 100, label: 'Coup, Momentum ' + m });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    spendMomentum(t);
    return null;
  },
  ai: (t) => 5 + 2 * momentumOf(t.u),
});

// 21. Cleave: one strike; then the same strike at one more adjacent enemy per Momentum spent, each at full damage.
//     Heavy: the extra targets may be 2 tiles apart. Edge: every target hit bleeds.
/** The extra targets, in order: the ones the player named (args.targetIds), else the nearest to the first target. */
function cleaveExtras(t: Tech, first: Unit, n: number, within: number): Unit[] {
  const ok = (v: Unit) => v !== first && isFoe(t, v) && dist(t.u.pos, v.pos) <= within;
  const named = (t.args.targetIds || []).map((id) => t.cb.units.find((x) => x.id === id)).filter((v): v is Unit => !!v && ok(v));
  const pool = named.length ? [...new Set(named)] : t.cb.units.filter(ok).sort((a, b) => dist(first.pos, a.pos) - dist(first.pos, b.pos) || dist(t.u.pos, a.pos) - dist(t.u.pos, b.pos) || (a.pos < b.pos ? -1 : 1));
  return pool.slice(0, n);
}
technique({
  id: 'cleave',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    if (tgt.side === t.u.side) return 'Cleave starts on an enemy.';
    const p = t.line('heavy', 'edge'), m = momentumOf(t.u);
    const within = p === 'heavy' ? t.num('heavy_apart', 2) : t.num('adjacent', 1);
    const bleed = (r: StrikeResult) => { if (p === 'edge' && r.target && (t.preview || (r.hit && !r.killed && alive(r.target)))) cond(t, r.target, 'bleeding'); };
    const r = strike(t, { noMomentum: true, label: 'Cleave' });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    bleed(r);
    const extras = cleaveExtras(t, tgt, m, within);
    if (t.preview) t.note(extras.length ? 'Then ' + extras.map((v) => v.name).join(', ') + ', each at full damage.' : 'No other enemy close enough to cleave into.');
    for (const v of extras) { const x = also(t, { target: v, noMomentum: true, label: 'Cleave', ...(within > 1 ? { reach: within } : {}) }); if (x.ok) bleed(x); }
    spendMomentum(t);
    return null;
  },
  ai: (t) => (t.tgt ? 5 + 2 * momentumOf(t.u) : 0),
});

// 22. Break: one strike. The target makes a Body save at −1 per Momentum spent or is Stunned (bosses: Dazed).
//     Blunt: its armour is also 0 for a round. Hook: it is Disarmed as well.
technique({
  id: 'break',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('blunt', 'hook'), m = momentumOf(t.u), boss = tgt.tier === 'boss';
    const r = strike(t, { noMomentum: true, label: 'Break, Momentum ' + m });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (t.preview) t.note('On a hit, ' + tgt.name + ' saves (Body, −' + m * t.num('save_per_momentum', 1) + ') or:');
    if (t.preview || (r.hit && !r.killed && alive(tgt))) {
      if (!save(t, tgt, 'body', m * t.num('save_per_momentum', 1))) {
        cond(t, tgt, boss ? 'dazed' : 'stunned', boss ? undefined : t.num('stun_rounds', 1));
        if (p === 'blunt') breakArmour(t, tgt);
        if (p === 'hook') cond(t, tgt, 'disarmed');
      }
    }
    spendMomentum(t);
    return null;
  },
  ai: (t) => (t.tgt ? 5 + momentumOf(t.u) + (t.tgt.tier === 'boss' ? 0 : 1) : 0),
});
/** Blunt: the target's armour is 0 until the breaker's next turn starts (break.armour_rounds rounds). */
function breakArmour(t: Tech, tgt: Unit): void {
  if (t.preview) { t.note(tgt.name + ': armour 0 until your next turn.'); return; }
  const s = techState(tgt, 'break');
  s.cut = (s.cut || 0) + Math.max(0, tgt.armour); tgt.armour = 0;
  s.by = t.u.id; s.until = t.cb.round + t.num('armour_rounds', 1);
  t.cb.log.push(tgt.name + '\'s armour is broken: 0 until ' + t.u.name + '\'s next turn (Break).');
}
function mendArmour(cb: Combat, v: Unit): void {
  const s = v.tech?.break; if (!s || s.cut == null) return;
  v.armour += s.cut; delete v.tech!.break;
  cb.log.push(v.name + '\'s armour holds again.');
}
onHook('turn_start', (ctx: any, cb: Combat) => {
  for (const v of cb.units) {
    const s = v.tech?.break; if (!s || s.cut == null) continue;
    const by = cb.units.find((x) => x.id === s.by);
    if (cb.round >= s.until && (!by || !alive(by) || by === ctx.u)) mendArmour(cb, v);
  }
});

// 23. Run Through: one strike at +20% per Momentum spent. On a hit the target is Pinned where it stands until it spends
//     2 AP to pull free. Point: ignores armour, and if a second enemy stands directly behind the first it is struck at
//     half. Reach: you may leave the weapon in (you are unarmed; the target stays Pinned until someone pulls it out for
//     2 AP). Without Point: −2 to hit.
/** The enemy standing directly behind the target, on the line from the user through it. */
function behindOf(t: Tech, tgt: Unit): Unit | null {
  const [ux, uy] = xy(t.u.pos), [x, y] = xy(tgt.pos), k = key(x + Math.sign(x - ux), y + Math.sign(y - uy));
  const v = unitAt(t.cb, k, tgt); return v && isFoe(t, v) ? v : null;
}
technique({
  id: 'run_through',
  check(t) { return t.args.opt === 'leave' && t.line('point', 'reach') !== 'reach' ? 'Only a Reach weapon can be left in (pick its Reach line).' : null; },
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('point', 'reach'), m = momentumOf(t.u), leave = p === 'reach' && t.args.opt === 'leave';
    const mult = 1 + m * t.num('per_momentum_pct', 20) / 100;
    const extra = p === 'reach' && !t.holds('point') ? -t.num('reach_no_point_hit', 2) : 0;
    const pierce = p === 'point' ? { ignoreArmour: true as const } : {};
    const r = strike(t, { mult, extra, noMomentum: true, ...pierce, label: 'Run Through, Momentum ' + m });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    const pinned = t.preview || (r.hit && !r.killed && alive(tgt));
    if (p === 'point' && (t.preview || r.hit)) {
      const b = behindOf(t, tgt);
      if (b) also(t, { target: b, mult: mult * t.num('point_behind_pct', 50) / 100, noMomentum: true, ...pierce, reach: dist(t.u.pos, b.pos), label: 'Run Through, behind' });
    }
    if (pinned) {
      stop(t, tgt, 'pinned', { save: false, untilAp: t.num('pull_free_ap', 2), ...(leave ? { weapon: t.weaponId } : {}) });
      if (t.preview) t.note(tgt.name + ' stays Pinned until ' + t.num('pull_free_ap', 2) + ' AP is spent to pull free.');
      if (leave) { if (!t.preview) t.cb.log.push(t.u.name + ' leaves the ' + t.w.name + ' in ' + tgt.name + '.'); loseWeapon(t, null); }
    }
    spendMomentum(t);
    return null;
  },
  ai: (t) => (t.tgt ? 5 + 2 * momentumOf(t.u) : 0),
});
// 24. Throw Down: only on a target you have Grappled or Bound: slam it into a tile next to you. Damage ×1 + 25% per
//     Momentum, Prone, and the grapple ends. Anyone on that tile is struck at half and must save or fall Prone.
//     Bare: no roll needed. Heavy: you may throw it 2 tiles.
/** Is `tgt` held by `u`: Grappled by it (today's grapple), or Bound by it (Bind: u.tech.bind.target). */
export const heldBy = (u: Unit, tgt: Unit): boolean => condSource(tgt, 'grappled') === u.id || u.tech?.bind?.target === tgt.id;
/** The slam's tile: args.tile, else the target's own; with the reason it can't be used. */
function slamTile(t: Tech): { at: string; why: string | null } {
  const tgt = t.tgt!, at = tileArg(t) || tgt.pos, max = t.line('bare', 'heavy') === 'heavy' ? t.num('heavy_tiles', 2) : t.num('tiles', 1);
  const [x, y] = xy(at);
  if (x < 0 || y < 0 || x >= t.cb.map.w || y >= t.cb.map.h) return { at, why: 'That tile is off the map.' };
  if (at === t.u.pos) return { at, why: 'Not onto your own tile.' };
  if (dist(t.u.pos, at) > max) return { at, why: max > 1 ? 'Too far: within ' + max + ' tiles of you.' : 'Too far: slam it into a tile next to you.' };
  if (at !== tgt.pos && moveBlockers(t.cb).has(at)) return { at, why: 'That tile is blocked.' };
  return { at, why: null };
}
/** The way to the tile for a thrown body (8 directions, around anyone standing; at most 4 tiles), or null. */
function throwRoute(t: Tech, from: string, to: string): string[] | null {
  const blocked = moveBlockers(t.cb), seen = new Map<string, string>([[from, '']]); let edge = [from];
  for (let d = 0; d < 4 && edge.length; d++) {
    const next: string[] = [];
    for (const k of edge) {
      const [x, y] = xy(k);
      for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
        const n = key(x + dx, y + dy), [nx, ny] = xy(n);
        if ((!dx && !dy) || seen.has(n) || nx < 0 || ny < 0 || nx >= t.cb.map.w || ny >= t.cb.map.h || blocked.has(n) || unitAt(t.cb, n, t.tgt!)) continue;
        seen.set(n, k);
        if (n === to) { const route = [n]; let p = k; while (p !== from) { route.unshift(p); p = seen.get(p)!; } return route; }
        next.push(n);
      }
    }
    edge = next;
  }
  return null;
}
/** Carry the target to the tile, tile by tile (held shots see each step); a Watch that stops it ends the throw there. */
function throwTo(t: Tech, tgt: Unit, at: string): void {
  const route = throwRoute(t, tgt.pos, at);
  if (!route) { t.note('No way to throw ' + tgt.name + ' there: it is slammed down where it stands.'); return; }
  if (t.preview) { (t.pv.moves ||= []).push({ unit: tgt.id, to: at }); return; }
  for (const k of route) {
    const was = (tgt as any).stopped;
    if (!alive(tgt) || forceMove(t, tgt, k, 1) === 0 || tgt.pos !== k || (tgt as any).stopped !== was) break;
  }
}
technique({
  id: 'throw_down',
  check(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    if (!heldBy(t.u, tgt)) return 'Needs a target you have Bound or Grappled.';
    return slamTile(t).why;
  },
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('bare', 'heavy'), m = momentumOf(t.u), { at, why } = slamTile(t); if (why) return why;
    const sure = p === 'bare';
    (t as any)._sure = sure; // read by this file's attack_roll listener for this use only (never saved)
    const r = strike(t, { mult: 1 + m * t.num('per_momentum_pct', 25) / 100, noMomentum: true, label: 'Throw Down, Momentum ' + m });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    if (t.preview && sure) { for (const a of t.pv.attacks) a.pv.pct = 100; t.note('No roll needed.'); }
    if (t.preview || r.hit) {
      const occ = unitAt(t.cb, at, tgt);
      // the grapple (or the bind) ends: the body leaves your hands
      if (t.preview) t.note('The hold on ' + tgt.name + ' ends.');
      else { if (condSource(tgt, 'grappled') === t.u.id) endCond(tgt, 'grappled', t.cb); if (t.u.tech?.bind?.target === tgt.id) t.u.tech.bind = {}; }
      if (!occ && at !== tgt.pos && (t.preview || alive(tgt))) throwTo(t, tgt, at);
      if (t.preview || alive(tgt)) stop(t, tgt, 'prone', { save: false });
      if (occ) {
        also(t, { target: occ, mult: t.num('occupant_pct', 50) / 100, noMomentum: true, reach: Math.max(1, dist(t.u.pos, occ.pos)), label: 'Throw Down, slammed into' });
        if (t.preview || alive(occ)) stop(t, occ, 'prone');
      }
    }
    spendMomentum(t);
    return null;
  },
  ai: (t) => (t.tgt && heldBy(t.u, t.tgt) ? 6 + 2 * momentumOf(t.u) : 0),
});
// Bare: "no roll needed". The slam always hits; no fumble.
onHook('attack_roll', (ctx: any) => {
  const tc = strikingWith(ctx.att); if (!tc || tc.def.id !== 'throw_down' || !(tc as any)._sure) return;
  ctx.hit = true; ctx.noFumble = true;
});
