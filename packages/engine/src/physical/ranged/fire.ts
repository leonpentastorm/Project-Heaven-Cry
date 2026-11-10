// Physical 2.0, ranged Fire: damage. Shot and Aimed Shot are the lead's references; the ranged lane builds Snap Shot,
// Burst, Called Shot, Walking Fire, Punch Through and Lob here.
import { technique, strike, addPressure } from './shared';

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
  ai: (t) => (t.u.ap >= 5 ? 6 : 4),
});
