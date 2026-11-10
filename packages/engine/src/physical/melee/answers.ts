// Physical 2.0, melee Answers: reactions. The core calls `react` on the hook for every unit that has the Answer usable;
// the handler checks the trigger and calls answer(), which spends the reaction. Riposte is the lead's reference; the
// melee lane builds Parry and Keep Back here.
import { technique, strike, answer } from './shared';

// 26. Riposte: a melee attack misses you: strike back for 0 AP. Edge or Point: +2 to hit.
technique({
  id: 'riposte',
  run: () => 'Riposte is a reaction: it fires when a melee attack misses you.',
  react: {
    on_miss(ctx, t) {
      if (ctx.tgt !== t.u || !ctx.melee || !ctx.att || ctx.att.side === t.u.side || ctx.att.dead || ctx.att.downed) return;
      answer(t, ctx.att, () => { strike(t, { target: ctx.att, extra: t.line('edge', 'point') ? t.num('edge_point_hit', 2) : 0 }); });
    },
  },
});
