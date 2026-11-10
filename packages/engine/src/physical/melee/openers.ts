// Physical 2.0, melee Openers: the first melee technique of a turn. Lunge is the lead's reference; the melee lane builds
// Charge, Feint, Draw Cut and Ambush here.
import { technique, strike, approach, stepUser, stepBlock, standingAt, stop } from './shared';

// 1. Lunge: step 1 tile toward the target, then strike; the step draws no opportunity attack.
//    Point: +2 to hit. Reach: the step may be 2 tiles. Heavy: on a hit the target is pushed 1 tile.
technique({
  id: 'lunge',
  run(t) {
    const tgt = t.tgt; if (!tgt) return 'Pick a target.';
    const p = t.line('point', 'reach', 'heavy');
    const step = approach(t, tgt, p === 'reach' ? t.num('reach_step', 2) : t.num('step', 1));
    if (step === false) return stepBlock(t) || 'Too far to lunge.';
    const hit = () => strike(t, { extra: p === 'point' ? t.num('point_hit', 2) : 0 });
    if (t.preview) { const r = step ? (stepUser(t, step.route), standingAt(t, step.to, hit)) : hit(); if (p === 'heavy' && r.ok) t.note('On a hit: pushed ' + t.num('heavy_push', 1) + '.'); return r.ok ? null : r.why || 'Can\'t attack that.'; }
    if (step) stepUser(t, step.route);
    const r = hit(); if (!r.ok) return null; // the step was taken; the strike couldn't follow (the log says why)
    if (r.hit && !r.killed && r.target && p === 'heavy') stop(t, r.target, 'push', { tiles: t.num('heavy_push', 1), save: false }); // r.target: the unit really struck
    return null;
  },
  ai: (t) => (t.tgt ? 6 : 0),
});
