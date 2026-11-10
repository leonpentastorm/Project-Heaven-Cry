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
