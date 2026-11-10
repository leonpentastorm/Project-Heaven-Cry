// Physical 2.0, ranged Sets: 1 AP, never fire, no Heat (the core charges the AP). Bead, Spot, Brace, Load Special,
// Shift, Vent and Head Down. The marks they leave stand outside one use, as hooks on the fight:
//   Bead: techState(holder, 'bead') = { targetId, line, weaponId, moved, free }. The holder's shots at the target ignore
//         one range band (Precise: +1); its Pressure doesn't fall while the holder sees it (a pressureDecay rule). Ends
//         when the holder moves (Heavy: after 1 tile) or names another; a smoke or flashbang landing on the holder ends
//         it too (thrown.ts sets targetId to null itself).
//   Spot: techState(target, 'spotted') = { by, until, used, precise, hidden }. Until the spotter's next turn its allies
//         have +1 to hit the target (Precise: and ignore one range band); the first ally hit adds +1 Pressure more.
//   Brace: u.braced (today's stance: Recoil halved, the heavy weapons' penalties gone), and techState(u, 'brace').auto
//         for the Auto line (Suppress gives +1 more while Braced there).
//   Load Special: techState(u, 'load_special') = { type, weaponId, hand }: the next Fire's first shot fires that round,
//         and the magazine keeps its count (a strikeRound in core).
//   Head Down: u.noWatch = the round: the core's gate refuses every Watch technique; the old Overwatch action is
//         refused here.
import { technique, stepUser, stepsWithin, endWatch, lowerPressure, techState, techStateOf, turnStamp, strikingWith, strikeRound, addPressureTo, pressureOf, pressureState, pressureDecay, atCover, onHook, type Tech } from './shared';
import { type Combat, type Unit, alive, unitSees, coverOf, xy, key, emitFx, effectiveRange, dist, weaponActions, heatLimit, moveUnit, moveBlock, paths } from '../../combat';
import { condSource } from '../../magic';
import { WEAPON } from '../../data';
import { packOf } from '../../character';
import { AMMO_TYPES, ammoId } from '../../tactics';
import { TECHNIQUE, weaponProps } from '../data';

/** A technique's number outside a Tech (the hooks): the same key its handler's t.num reads. */
function num(id: string, k: string, fb: number): number { const v = TECHNIQUE[id]?.numbers?.[k]; return typeof v === 'number' ? v : fb; }
const foesOf = (cb: Combat, u: Unit) => cb.units.filter((v) => v.side !== u.side && alive(v));
const alliesOf = (cb: Combat, u: Unit) => cb.units.filter((v) => v !== u && v.side === u.side && alive(v));
/** A standing cover tile of this kind next to a tile. */
function coverNext(cb: Combat, at: string, kind: 'half' | 'full'): boolean {
  const cov = coverOf(cb), [x, y] = xy(at);
  for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) if ((dx || dy) && cov[key(x + dx, y + dy)]?.kind === kind) return true;
  return false;
}
const roundName = (type: string) => type.replace(/_/g, '-').replace('armor', 'armour');

// ---------- 14. Bead ----------
/** The units beading this target now (alive, the mark on it). */
export function beadOn(cb: Combat, target: Unit): Unit[] {
  return cb.units.filter((h) => h !== target && alive(h) && techStateOf(h, 'bead').targetId === target.id);
}
/** End a unit's bead (it moved, named another; smoke, a flashbang or the scrambler landed on it: thrown.ts). */
export function endBead(cb: Combat, u: Unit, why: string): void {
  const st = techStateOf(u, 'bead'); if (!st.targetId) return;
  const was = st.targetId; techState(u, 'bead').targetId = null;
  emitFx(cb, 'bead_end', { unit: u.id, at: u.pos, target: was, why });
  if (why !== 'replaced') cb.log.push(u.name + ' loses the bead (' + why + ').');
}
technique({
  id: 'bead',
  check(t) {
    const v = t.tgt; if (!v) return 'Pick a target.';
    if (v.side === t.u.side) return 'Bead an enemy.';
    if (!alive(v)) return v.name + ' is out of the fight.';
    if (!unitSees(t.cb, t.u, v.pos)) return 'You can\'t see ' + v.name + '.';
    if (techStateOf(t.u, 'bead').targetId === v.id) return 'You already have a bead on ' + v.name + '.';
    return null;
  },
  run(t) {
    const v = t.tgt!, p = t.line('precise', 'heavy'), free = p === 'heavy' ? t.num('heavy_move_tiles', 1) : 0, bands = t.num('range_bands', 1);
    if (t.preview) {
      t.note('Until you move or name another: your shots at ' + v.name + ' ignore ' + bands + ' range band' + (bands === 1 ? '' : 's') + (p === 'precise' ? ', at +' + t.num('precise_hit', 1) + ' to hit' : '') + ', and its Pressure doesn\'t fall while you see it.');
      if (free) t.note('Heavy: you may move ' + free + (free === 1 ? ' tile' : ' tiles') + ' without losing it.');
      return null;
    }
    endBead(t.cb, t.u, 'replaced');
    Object.assign(techState(t.u, 'bead'), { targetId: v.id, line: p, weaponId: t.weaponId, moved: 0, free, t: turnStamp(t.cb) });
    emitFx(t.cb, 'bead', { unit: t.u.id, at: t.u.pos, target: v.id, to: v.pos });
    return null;
  },
  // a target it hasn't beaded yet: more when the band it ignores is a real one, or the target is under fire
  ai(t) {
    const v = t.tgt; if (!v || techStateOf(t.u, 'bead').targetId === v.id || !unitSees(t.cb, t.u, v.pos)) return 0;
    return dist(t.u.pos, v.pos) > effectiveRange(t.w) || pressureOf(v) ? 6 : 3;
  },
});
// The holder's shots at the target (any ranged attack: a technique, a held shot, today's attack): one range band less,
// Precise +1. Spot: the spotter's allies (not the spotter) have +1 to hit it, melee too; Precise, one band less.
// The bands don't stack: Bead and Spot together still ignore one.
onHook('attack_preview', (ctx: any) => {
  const att: Unit = ctx.att, tgt: Unit = ctx.tgt; if (!att || !tgt) return;
  const st = techStateOf(att, 'bead');
  if (!ctx.melee && st.targetId && st.targetId === tgt.id) {
    ctx.bandsLess = Math.max(ctx.bandsLess || 0, num('bead', 'range_bands', 1));
    if (st.line === 'precise' && att.weapon === st.weaponId) ctx.terms.push({ v: num('bead', 'precise_hit', 1), label: 'Bead' });
  }
  const sp = techStateOf(tgt, 'spotted'), by = sp.by ? (ctx.cb as Combat)?.units.find((x) => x.id === sp.by) : null;
  if (by && alive(by) && att !== by && att.side === by.side) {
    ctx.terms.push({ v: num('spot', 'hit', 1), label: 'Spotted' });
    if (sp.precise && !ctx.melee) ctx.bandsLess = Math.max(ctx.bandsLess || 0, num('spot', 'precise_range_bands', 1));
  }
});
// Moving ends it (Heavy: the first tile doesn't). Any step of the holder counts: a walk, a technique's step, a push.
onHook('move_step', (ctx: any, cb) => {
  const u: Unit = ctx.u; if (!u) return;
  const st = techStateOf(u, 'bead'); if (!st.targetId) return;
  st.moved = (st.moved || 0) + 1;
  if (st.moved > (st.free || 0)) endBead(cb, u, 'moved');
});
// Its Pressure doesn't fall while a holder sees it.
pressureDecay((cb, u, fall) => (beadOn(cb, u).some((h) => unitSees(cb, h, u.pos)) ? 0 : fall));

// ---------- 15. Spot ----------
technique({
  id: 'spot',
  check(t) {
    const v = t.tgt; if (!v) return 'Pick a target.';
    if (v.side === t.u.side) return 'Spot an enemy.';
    if (!alive(v)) return v.name + ' is out of the fight.';
    if (!unitSees(t.cb, t.u, v.pos)) return 'You can\'t see ' + v.name + '.';
    if (!alliesOf(t.cb, t.u).length) return 'No one to spot for.';
    return null;
  },
  run(t) {
    const v = t.tgt!, p = t.line('precise', 'silent');
    if (t.preview) {
      t.note('Until your next turn your allies have +' + t.num('hit', 1) + ' to hit ' + v.name + (p === 'precise' ? ' and ignore ' + t.num('precise_range_bands', 1) + ' range band' : '') + '; the first ally to hit it adds +' + t.num('first_hit_pressure', 1) + ' Pressure more.');
      if (p === 'silent') t.note(v.name + ' isn\'t told.');
      return null;
    }
    const sp = techState(v, 'spotted'); for (const k of Object.keys(sp)) delete sp[k]; // a new Spot replaces the old one
    Object.assign(sp, { by: t.u.id, until: turnStamp(t.cb), used: false, precise: p === 'precise', hidden: p === 'silent' });
    emitFx(t.cb, 'spot', { unit: t.u.id, at: t.u.pos, target: v.id, to: v.pos, ...(p === 'silent' ? { only: t.u.side, hidden: true } : {}) });
    return null;
  },
  // worth it when others on the side have a gun on the target
  ai(t) {
    const v = t.tgt; if (!v || techStateOf(v, 'spotted').by === t.u.id || !unitSees(t.cb, t.u, v.pos)) return 0;
    const shooters = alliesOf(t.cb, t.u).filter((a) => WEAPON[a.weapon]?.magazine != null && unitSees(t.cb, a, v.pos)).length;
    return shooters >= 2 ? 6 : shooters ? 4 : 0;
  },
});
// The first ally to hit it adds +1 Pressure more (after the hit's own). A Take's hit adds none and leaves the mark.
onHook('on_hit', (ctx: any, cb) => {
  const att: Unit = ctx.att, tgt: Unit = ctx.tgt; if (!att || !tgt || !alive(tgt)) return;
  const sp = techStateOf(tgt, 'spotted'); if (!sp.by || sp.used || att.id === sp.by) return;
  const by = cb.units.find((x) => x.id === sp.by); if (!by || !alive(by) || att.side !== by.side) return;
  if (strikingWith(att)?.def.group === 'take') return;
  sp.used = true;
  addPressureTo(cb, tgt, num('spot', 'first_hit_pressure', 1), att, 'spotted', { hidden: !!sp.hidden });
});
// It lasts until the spotter's next turn.
onHook('turn_start_pre', (ctx: any, cb) => {
  const u: Unit = ctx.u; if (!u) return;
  for (const v of cb.units) if (v.tech?.spotted?.by === u.id) delete v.tech.spotted;
});

// ---------- 16. Brace ----------
/** Today's Brace weapons (the ones with today's Brace action) brace anywhere; any other weapon, Heavy or not, resting
 * on half cover ("Today's Brace, opened to any weapon resting on half cover": the Heavy line changes what Brace does,
 * not where; review fix: the thumper, the breacher tube and the flamer have no Brace today). */
function braceWhy(t: Tech): string | null {
  if (t.u.braced) return 'Already braced.';
  const anywhere = weaponActions(t.u).some((x) => x.id === 'brace');
  if (!anywhere && !coverNext(t.cb, t.u.pos, 'half')) return 'Rest the weapon on half cover to brace it.';
  return null;
}
technique({
  id: 'brace',
  check: braceWhy,
  run(t) {
    const p = t.line('heavy', 'auto');
    if (t.preview) {
      t.note('Braced until you move: Recoil halved.' + (p === 'heavy' ? ' Its penalties are gone (no −2 unbraced; a weapon that needs bracing can fire).' : '') + (p === 'auto' ? ' Suppress gives +' + t.num('auto_suppress_pressure', 1) + ' Pressure more.' : ''));
      return null;
    }
    t.u.braced = true;
    Object.assign(techState(t.u, 'brace'), { auto: p === 'auto', at: t.u.pos });
    emitFx(t.cb, 'stance', { unit: t.u.id, at: t.u.pos, what: 'brace' });
    return null;
  },
  // a weapon with a penalty unbraced wants it badly; the others don't spend the AP
  ai(t) {
    if (braceWhy(t)) return 0;
    const props = (WEAPON[t.u.weapon]?.properties || []) as string[];
    return props.includes('requires_braced_or_prone') || props.includes('minus2_to_hit_unless_emplaced') ? 8 : 0;
  },
});
const bracedAuto = (u: Unit) => { const b = techStateOf(u, 'brace'); return !!u.braced && !!b.auto && b.at === u.pos && weaponProps(u.weapon).includes('auto'); };
/** Auto, Braced: Suppress gives this much more, on the target it rolled at (hit or miss; not the Auto spill around it).
 * Suppress (press.ts) adds it itself, in its preview and its action alike (review fix: a filter on the action alone
 * left the card 1 short). 0 when the user isn't Braced on an Auto weapon with Brace's Auto line. */
export const bracedSuppress = (u: Unit): number => (bracedAuto(u) ? num('brace', 'auto_suppress_pressure', 1) : 0);

// ---------- 17. Load Special ----------
/** The special rounds a character carries, by type (an enemy or a companion carries none). */
function carried(t: Tech): Record<string, number> {
  const out: Record<string, number> = {}; if (!t.c) return out;
  for (const it of packOf(t.c)) { const m = /^ammo_(.+)$/.exec(it.item || it.id); if (m && m[1] !== 'standard' && AMMO_TYPES[m[1]] && it.qty > 0) out[m[1]] = (out[m[1]] || 0) + it.qty; }
  return out;
}
/** The round the player named (args.ammo), else the one they carry most of. */
function chosen(t: Tech): string | null {
  if (t.args.ammo) return ammoId(t.args.ammo);
  const have = carried(t);
  return Object.keys(have).sort((a, b) => have[b] - have[a] || (a < b ? -1 : 1))[0] || null;
}
technique({
  id: 'load_special',
  check(t) {
    if (t.w.magazine == null || !t.w.ammo) return 'Your weapon takes no rounds.';
    const st = techStateOf(t.u, 'load_special'); if (st.type) return 'A ' + roundName(st.type) + ' round is already chambered.';
    const type = chosen(t);
    if (!type) return 'You carry no special rounds.';
    if (type === 'standard' || !AMMO_TYPES[type]) return 'Pick a special round: armour-piercing, hollow-point, incendiary or enhanced.';
    if (!carried(t)[type]) return 'You carry no ' + roundName(type) + ' rounds.';
    return null;
  },
  run(t) {
    const type = chosen(t)!, spread = t.line('spread') === 'spread';
    t.note('Chambers 1 ' + roundName(type) + ' round for your next Fire' + (spread ? ': every target of it gets the round' : '') + '. The magazine stays as it is.');
    if (t.preview) return null;
    let left = 1; // the round comes out of the pack now
    t.c!.pack = packOf(t.c!).map((x) => { if (!left || (x.item || x.id) !== 'ammo_' + type || x.qty <= 0) return x; left -= 1; return { ...x, qty: x.qty - 1 }; }).filter((x) => x.qty > 0 || (x as any).mags);
    Object.assign(techState(t.u, 'load_special'), { type, weaponId: t.weaponId, hand: t.hand });
    emitFx(t.cb, 'load', { unit: t.u.id, at: t.u.pos, rounds: 1, special: type, dur: 400 });
    return null;
  },
  ai: () => 0, // enemies carry no special rounds
});
// The next Fire technique's first shot fires the chambered round (Spread: every shot of that technique gets its rider,
// and the cone of a cone weapon). The chambered round is extra: that one shot doesn't come out of the magazine. The
// later shots of a Spread weapon's Fire carry the rider but are the magazine's own rounds (review fix: one chambered
// round made a whole Burst free).
const LIVE = new WeakMap<Tech, string>();
strikeRound({
  pick(t) {
    const prev = LIVE.get(t); if (prev) return weaponProps(t.weaponId).includes('spread') ? { type: prev } : null;
    if (t.def.group !== 'fire') return null;
    const st = techStateOf(t.u, 'load_special'); if (!st.type || st.weaponId !== t.weaponId || (st.hand || 'main') !== t.hand) return null;
    LIVE.set(t, st.type); return { type: st.type, fromMag: false };
  },
  fired(t, _tgt, type) {
    if (!type || techStateOf(t.u, 'load_special').type !== type) return; // spent by this technique's first shot already
    delete t.u.tech!.load_special;
    t.cb.log.push('  ' + t.u.name + ' fires the chambered ' + roundName(type) + ' round.');
  },
});

// ---------- 18. Shift ----------
const shiftTiles = (t: Tech) => (t.line('quick', 'heavy') === 'quick' ? t.num('quick_tiles', 2) : t.num('tiles', 1));
/** Would the user be against cover on this tile (nothing is left changed). */
const coveredAt = (t: Tech, tile: string) => { const was = t.u.pos; t.u.pos = tile; try { return atCover(t.cb, t.u); } finally { t.u.pos = was; } };
// Shift is a move: the engine's own walk (a Prone, Pinned, Grappled or halted unit can't; traps, hazards and
// opportunity attacks apply, review fix), its AP waived, with no held shot hearing it: no Watch, no Overwatch, no
// Heart Overwatch ("without setting off a Watch"; the text frees it of nothing else).
let SHIFTING: Unit | null = null;
onHook('move_cost', (ctx: any) => { if (SHIFTING && ctx.u === SHIFTING) { ctx.ap = 0; ctx.free = true; ctx.skipOW = true; ctx.noWatch = true; } });
/** Why this unit can't walk now (moveBlock), or toward the tile it fears (Afraid): the engine's own refusals. */
function cantWalk(t: Tech, to: string): string | null {
  const blk = moveBlock(t.u); if (blk) return blk;
  const fs = condSource(t.u, 'fear'), f = fs ? t.cb.units.find((x) => x.id === fs) : null;
  if (f && !f.dead && dist(to, f.pos) < dist(t.u.pos, f.pos)) return 'Afraid of ' + f.name + ': you can\'t move toward them.';
  return null;
}
technique({
  id: 'shift',
  check(t) {
    const k = t.args.tile; if (!k) return 'Name a tile.';
    const blk = cantWalk(t, k); if (blk) return blk;
    if (!atCover(t.cb, t.u)) return 'You aren\'t in cover.';
    const n = shiftTiles(t);
    if (!stepsWithin(t, n).some((x) => x.to === k)) return 'Too far: Shift moves ' + n + (n === 1 ? ' tile.' : ' tiles.');
    if (!coveredAt(t, k)) return 'That tile isn\'t in cover.';
    return null;
  },
  run(t) {
    const s = stepsWithin(t, shiftTiles(t)).find((x) => x.to === t.args.tile)!, keep = t.line('quick', 'heavy') === 'heavy' && !!t.u.braced;
    if (t.preview) { stepUser(t, s.route); t.note('No held shot fires on this move (opportunity attacks still do).' + (keep ? ' You stay Braced.' : '')); return null; }
    const was = SHIFTING; SHIFTING = t.u;
    let err: string | null; try { err = moveUnit(t.cb, t.u, s.to, t.rng, 'move', { via: paths(t.cb, t.u.pos, t.u.id) }); } finally { SHIFTING = was; }
    if (err) return err; // refused before it moved: nothing is spent
    if (keep && alive(t.u) && !t.u.downed) { t.u.braced = true; if (techStateOf(t.u, 'brace').at) techState(t.u, 'brace').at = t.u.pos; }
    return null;
  },
  // under fire, slide to the covered tile the fewest enemies can see
  ai(t) {
    if (!pressureOf(t.u) || !atCover(t.cb, t.u) || moveBlock(t.u)) return 0;
    const seen = (k: string) => foesOf(t.cb, t.u).filter((v) => unitSees(t.cb, v, k)).length, now = seen(t.u.pos);
    const best = stepsWithin(t, shiftTiles(t)).filter((x) => coveredAt(t, x.to)).map((x) => ({ to: x.to, n: seen(x.to) })).sort((a, b) => a.n - b.n || (a.to < b.to ? -1 : 1))[0];
    return best && best.n < now ? { score: 6, args: { tile: best.to } } : 0;
  },
});

// ---------- 19. Vent ----------
technique({
  id: 'vent',
  check(t) {
    if (!t.w.heat_limit) return 'This weapon doesn\'t heat up.';
    if (!t.u.heat) return 'The barrel is cool: no Heat to vent.';
    return null;
  },
  run(t) {
    const heavy = t.line('heavy') === 'heavy', n = heavy ? t.num('heavy_heat', 4) : t.num('heat', 2), was = t.u.heat, after = Math.max(0, was - n);
    t.note('Heat ' + was + ' → ' + after + (heavy ? ' (a barrel swap).' : '.'));
    if (t.preview) return null;
    t.u.heat = after;
    emitFx(t.cb, 'heat', { unit: t.u.id, at: t.u.pos, now: after, was, why: 'vent' });
    return null;
  },
  // close to jamming: cool it
  ai(t) { return t.w.heat_limit && t.u.heat && t.u.heat >= heatLimit(t.u, t.w) - 2 ? 7 : 0; },
});

// ---------- 20. Head Down ----------
technique({
  id: 'head_down',
  check(t) { return pressureOf(t.u) ? null : 'You aren\'t under Pressure.'; },
  run(t) {
    const full = coverNext(t.cb, t.u.pos, 'full'), n = full ? t.num('full_cover_pressure', 2) : t.num('pressure', 1), now = pressureOf(t.u), after = Math.max(0, now - n);
    if (t.preview) {
      (t.pv.pressure ||= []).push({ unit: t.u.id, add: after - now, after, state: pressureState({ pressure: after } as any) });
      t.note('−' + n + ' Pressure' + (full ? ' behind full cover' : '') + '. You can\'t hold a shot this round.');
      return null;
    }
    lowerPressure(t, t.u, n);
    (t.u as any).noWatch = t.cb.round;
    endWatch(t.cb, t.u, 'head down');
    if (t.u.overwatch) { t.u.overwatch = null; t.u.owShots = 0; emitFx(t.cb, 'watch_end', { unit: t.u.id, at: t.u.pos, id: 'overwatch', why: 'head down' }); }
    return null;
  },
  ai(t) { return pressureOf(t.u) >= 2 ? 6 : 0; },
});
// The old Overwatch action is a held shot too: refused this round.
onHook('action_refuse', (ctx: any) => {
  const u: Unit = ctx.u; if (!u || ctx.fail || ctx.a?.type !== 'combat/overwatch') return;
  if ((u as any).noWatch === (ctx.cb as Combat)?.round) ctx.fail = 'Head down: no held shot this round.';
});
