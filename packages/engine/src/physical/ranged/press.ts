// Physical 2.0, ranged Press: Pressure with little or no damage (+1 Heat on top of what it fires: the core adds it).
// Suppress is the lead's reference; the ranged lane builds Rake, Warning Shot, Flush, Mag Dump and Crossfire here.
import { technique, strike, spendRounds, addPressure, addPressureTo, onHook } from './shared';
import { alive, dist, type Combat, type Unit } from '../../combat';

// 8. Suppress: 3 rounds, one roll at +2. A hit is half damage and 2 Pressure in all; a miss is 1.
//    Auto: enemies within 1 tile of the target also gain 1. Heavy, Braced: it holds until your next turn, and any enemy
//    that moves or fires inside 3 tiles of the target gains 1. Silent: hits only.
technique({
  id: 'suppress',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('auto', 'heavy', 'silent'), onHit = t.num('pressure_hit', 2), onMiss = p === 'silent' ? 0 : t.num('pressure_miss', 1);
    // the roll spends 1 round and the technique burns the rest; its Pressure replaces the ordinary +1 for a hit
    const r = strike(t, { extra: t.num('hit', 2), mult: t.num('damage_mult', 0.5), noPressure: true });
    if (!r.ok) return r.why || 'Can\'t attack that.';
    spendRounds(t, Math.max(0, (t.def.rounds as number) - 1));
    const near = p === 'auto' ? t.cb.units.filter((v) => v !== tgt && v.side !== t.u.side && alive(v) && dist(v.pos, tgt.pos) <= t.num('auto_spill_range', 1)) : [];
    if (t.preview) {
      addPressure(t, tgt, onHit, 'Suppress'); t.note('A hit: half damage and ' + onHit + ' Pressure.' + (onMiss ? ' A miss: ' + onMiss + '.' : ' A miss gives none (Silent).'));
      for (const v of near) addPressure(t, v, t.num('auto_spill', 1), 'Suppress');
      if (p === 'heavy') t.note('Holds until your next turn: any enemy that moves or fires within ' + t.num('heavy_lane', 3) + ' tiles of the target gains ' + t.num('heavy_lane_pressure', 1) + '.');
      return null;
    }
    if (alive(tgt)) addPressure(t, tgt, r.hit ? onHit : onMiss, 'Suppress');
    for (const v of near) addPressure(t, v, t.num('auto_spill', 1), 'Suppress');
    if (p === 'heavy') Object.assign(t.state(), { lane: tgt.pos, r: t.num('heavy_lane', 3), n: t.num('heavy_lane_pressure', 1), got: {} });
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
onHook('turn_start_pre', (ctx: any) => { const s = ctx.u && (ctx.u as any).tech?.suppress; if (s?.lane) delete s.lane; });
