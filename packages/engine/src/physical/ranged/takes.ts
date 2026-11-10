// Physical 2.0, ranged Takes: the target must be Pressed; one a turn; the target loses 2 Pressure after the effect (the
// core does all three). wasSuppressed(t) says whether the stronger line applies. Dead Centre is the lead's reference; the
// ranged lane builds Pin Down, Rout, Stopping Shot, Storm and Last Round here.
import { technique, strike, wasSuppressed } from './shared';

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
