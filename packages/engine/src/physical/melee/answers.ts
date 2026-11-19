// Physical 2.0, melee Answers: reactions. The core calls `react` on the hook for every unit that has the Answer usable;
// the handler checks the trigger and calls answer(), which spends the reaction. Riposte is the lead's reference; the
// melee lane builds Parry and Keep Back here.
import { technique, strike, canStrike, answer, canAnswer, landed, stop, onHook, meleeFx, fallFx } from './shared';
import type { Tech } from './shared';
import type { StrikeOpts } from '../types';
import { say, alive, active, dist, rollWithPick, weaponVia, type Unit } from '../../combat';
import { emit } from '../../effects/hooks';
import { canReact } from '../../tactics';
import { answerKind } from '../core';
import { mod, holdsShield } from '../../character';
import { rollVs } from '../../rolls';
import { weaponPhys } from '../data';

// 26. Riposte: a melee attack misses you: strike back for 0 AP. Edge or Point: +2 to hit.
technique({
  id: 'riposte',
  run: () => 'Riposte is a reaction: it fires when a melee attack misses you.',
  react: {
    on_miss(ctx, t) {
      if (ctx.tgt !== t.u || !ctx.melee || !ctx.att || ctx.att.side === t.u.side || ctx.att.dead || ctx.att.downed) return;
      if (!canStrike(t, ctx.att)) return; // out of reach (a polearm's miss): the reaction is kept
      answer(t, ctx.att, () => { strike(t, { target: ctx.att, extra: t.line('edge', 'point') ? t.num('edge_point_hit', 2) : 0 }); });
    },
  },
});

// ---------- Parry ----------
// The attacker's roll, kept for the damage that follows it in the same resolveAttack call (the hit's damage_in carries
// no roll). Transient: read and dropped within one attack, never saved (the same shape as the core's ACTIVE stack).
const ROLLS = new WeakMap<Unit, any>();
onHook('attack_roll', (ctx: any) => { if (ctx?.att && ctx.tgt) ROLLS.set(ctx.att, ctx); });
/** The attacker's total for the attack whose damage is landing on `tgt` (null: none recorded). Reading changes nothing. */
function attackTotal(att: Unit, tgt: Unit): number | null {
  const rc = ROLLS.get(att); return rc && rc.tgt === tgt ? (rc.die || 0) + (rc.toHit || 0) : null;
}
/** Could this strike be made now (reach, sight)? The strike's own preview on a copy of the Tech: nothing is rolled or kept. */
const couldStrike = (t: Tech, o: StrikeOpts) => strike({ ...t, preview: true, pv: { ...t.pv, attacks: [], notes: [] } } as Tech, o).ok;
/** The user's attack skill with the hand that parries: the unit's attack with the main hand; the off hand's hits_with
 * skill. A parry is a melee roll, so an item's roll_with (the Guard door: Durability while holding Guard) puts its
 * skill in place of the weapon's when it would, through THE choice (combat.ts rollWithPick), asked the way the engine's
 * other previews ask ('attack_preview' with a melee preview: physical/core.ts apFor; outside playtest 0.31.10 row 5). */
function attackSkill(t: Tech, att: Unit): number {
  const off = t.hand === 'off' && !!t.c, sk = off ? weaponPhys(t.weaponId).hits_with : weaponVia(t.u, 'melee');
  const base = off ? mod((t.c!.skills as any)[sk] || 0) : t.u.attack ?? 0;
  const hk: any = emit(t.cb, 'attack_preview', { att: t.u, tgt: att, mode: 'melee', melee: true, ap: 0, techAp: 0, reach: 1, ignoreCover: false, terms: [], fail: null, free: true, preview: true, cb: t.cb, mods: t.cb.mods || [] });
  const rw = rollWithPick(t.c, sk, hk?.rollWith);
  return base + (rw ? rw.delta : 0);
}
/** A shield in the user's off hand (a character's off-hand item of the shield category). */
/** A shield in a hand, either hand (rules 1.56; the one prop test, rules 1.57 A1): the Parry bonus comes once, however many. */
const shieldInOffHand = (t: Tech) => !!t.c && holdsShield(t.c);

// 25. Parry: a melee attack hits you: roll your attack skill against the attacker's total. If you win, the hit is halved.
//     A shield in the off hand adds +2 (with any weapon). Light: and you gain 1 Momentum. Heavy: you may parry for an
//     adjacent ally.
//     The Light line's Momentum is the one a technique still gives by its text (the rework, Leon, 10 Nov 2026).
//     The hook is damage_in, phase 'reduce' (the hit has landed, its damage not yet taken): the halving is on the damage
//     after the attacker's multipliers and armour, before the shield. A protective reaction: it works while Suppressed
//     (the core's canAnswer). "Win" is a higher total; a tie goes to the attacker.
technique({
  id: 'parry',
  run: () => 'Parry is a reaction: it fires when a melee attack hits you.',
  react: {
    damage_in(ctx, t) {
      if (ctx.phase !== 'reduce' || ctx.parried || !(ctx.dmg > 0)) return;
      const src = ctx.src, att: Unit | null = src?.by || null, v: Unit = ctx.t;
      if (!att || src.type !== 'weapon' || !src.melee || att.side === t.u.side || !alive(att) || !v || v.side !== t.u.side) return;
      if (active(t.cb) === t.u) return; // an Answer is never on your own turn
      const forAlly = v !== t.u, heavy = !!t.line('heavy');
      if (forAlly) {
        // Heavy: an adjacent ally; the ally parries for itself first when it can
        if (!heavy || !alive(v) || dist(v.pos, t.u.pos) > t.num('ally_reach', 1)) return;
        if (canAnswer(t.cb, v, 'parry', att) && canReact(t.cb, v, 'protect')) return;
      }
      const vs = attackTotal(att, v); if (vs == null) return;
      // Item 5530 (the lead's ruling on row 5): the reaction is spent only when the Parry stops the blow. The roll comes
      // first, under the same gate an Answer has (answer(): canAnswer, canReact); a failed Parry is said and spends
      // nothing, so the blow stays unanswered and Retort may still answer it.
      if (t.preview || !canAnswer(t.cb, t.u, 'parry', att) || !canReact(t.cb, t.u, answerKind('parry'))) return;
      ctx.parried = true;
      const shield = shieldInOffHand(t) ? t.num('shield_bonus', 2) : 0, // with any weapon (Leon's ruling, 10 Nov 2026)
         bonus = attackSkill(t, att) + shield;
      const rv = rollVs(t.cb, t.rng, { by: t.u, mod: bonus, tn: vs, nat: false, over: true, why: 'parry' }), won = rv.ok; // it must BEAT the attack's total
      const tell = () => { say(t.cb, t.u.name + ' parries' + (forAlly ? ' for ' + v.name : '') + ': ' + rv.text + (shield ? ' (incl. +' + shield + ' shield)' : '') + (won ? ' · the hit is halved' : ' · it gets through') + '.');
        meleeFx(t, 'parry', { from: att.pos, to: v.pos, attacker: att.id, ally: forAlly ? v.id : null, won }); };
      if (!won) { ROLLS.delete(att); tell(); return; }
      answer(t, att, () => {
        ROLLS.delete(att); tell();
        ctx.parryWon = true; // a Parried hit costs the one it lands on no Momentum (physical/rules.ts)
        ctx.dmg = ctx.dmg * t.num('halve', 0.5);
        if (t.line('light')) landed(t, t.num('light_momentum', 1));
      });
    },
  },
  ai: () => 0,
});

// 27. Keep Back: an enemy steps into your reach: strike it first. If you hit, it makes a Body save or stops where it is.
//     Reach: your reach is 2 tiles, so most enemies never arrive. Hook: on a failed save it is also Prone.
//     The hook is move_step (ctx.u the mover, ctx.from / ctx.at the tiles, ctx.stop halts the walk), as Deny's is.
//     A step is the mover's own: a forced move (a push) and a walk nobody may react to (Hidden; ctx.skipOW) set it
//     off no more than they set off an Overwatch.
technique({
  id: 'keep_back',
  run: () => 'Keep Back is a reaction: it fires when an enemy steps into your reach.',
  react: {
    move_step(ctx, t) {
      const m: Unit | undefined = ctx.u;
      if (!m || m === t.u || m.side === t.u.side || !alive(m) || ctx.forced || (ctx.skipOW && !ctx.noWatch) || !ctx.from /* a Shift (noWatch) silences held shots only: Keep Back still answers it */ || !ctx.at) return;
      if (active(t.cb) === t.u) return; // an Answer is never on your own turn
      const reach = t.line('reach') ? t.num('reach_tiles', 2) : t.num('reach_base', 1);
      if (dist(t.u.pos, ctx.at) > reach || dist(t.u.pos, ctx.from) <= reach) return; // only the step that enters it
      if (!couldStrike(t, { target: m, reach })) return; // out of sight: the reaction isn't spent
      answer(t, m, () => {
        ctx.flush?.(); // the walk so far plays before the strike
        const r = strike(t, { target: m, reach });
        const v = r.target || m; // the unit really struck (a redirect): only the mover itself can be stopped on its walk
        if (!r.hit || !alive(v)) return;
        const wasProne = !!v.prone, held = stop(t, v, t.line('hook') ? ['halt', 'prone'] : 'halt', { save: ['body'] });
        if (held) { meleeFx(t, 'halt', { target: v.id, to: v.pos, reach }); fallFx(t, v, wasProne); }
        if (held && v === m) ctx.stop = 'kept back';
      });
    },
  },
  ai: () => 0,
});
