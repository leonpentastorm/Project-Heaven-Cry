// Physical 2.0, melee Finishers: they need Momentum 2, spend all of it and end the chain. Coup is the lead's reference;
// the melee lane builds Cleave, Break, Run Through and Throw Down here.
import { technique, strike, spendMomentum, momentumOf } from './shared';

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
