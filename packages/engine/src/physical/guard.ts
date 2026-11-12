// Rules 1.13, Durability's door (docs/design/proposals/2026-11-nine-doors.md, section 19; numbers provisional, in
// techniques.json rules.guard). Guard is a pool for anyone with Durability (character.ts classResources: its size is
// the Durability points, 5 at most; the Defender keeps its own, the larger of the two).
//   gained   by the Guard technique (melee/links.ts): 1, +1 for each Durability point above 1, +1 with a shield in the
//            off hand; and by Brace (combat.ts brace, through braceHook): a flat 2, 3 with a shield (core.ts guardGain)
//   soaks    each point takes 10 off a damaging hit, as many points as the hit needs but the last one (kept for a
//            reaction, unless the hit would take the unit down), on the damage that would reach HP: after armour,
//            after every other reduction, and after the unit's shield (the listener below)
//   Pressure comes off Guard first, 1 Guard a point (the pressureFilter in melee/links.ts)
//   Interpose (Durability 3): an Answer everyone with the points has (below)
//   Momentum a hit on a unit holding Guard points costs none (rules.ts reads ctx.guard0)
// The Defender's class moves are untouched: a unit that holds the Defender's Reactive Plate spends its Guard through
// the plate and its policy (this soak stands aside), and one that holds the Defender's Brace Interposes by the class
// move and its policy (the general Interpose stands aside).
import { type Combat, type Unit, alive, dist, emitFx, fxFell, attackDamage, rollInjury, braceHook } from '../combat';
import { onHook, charOfUnit, statQuery } from '../effects/hooks';
import { applyDamage } from '../effects/damage';
import { landed } from '../effects/output';
import { PHYS_RULES } from './data';
import { technique, answer, guardOf, guardMax, guardGain, addGuard, spendGuard, holds } from './core';
import { NOT_A_HIT } from './rules';

const G = () => PHYS_RULES.guard || {};
const DEF_PLATE = 'class:defender.reactive_plate', DEF_BRACE = 'class:defender.brace';

// ---------- gained by Brace ----------
braceHook.f = (cb: Combat, u: Unit) => {
  const got = addGuard(cb, u, guardGain(u, 'brace'));
  if (got) cb.log.push('  +' + got + ' Guard (' + guardOf(u) + '/' + guardMax(u) + ').');
};

// ---------- the soak ----------
// A hit: anything that takes HP but a condition's own tick and the harm a unit does itself (the same line the Momentum
// rule draws). The 'shield' phase is the last one before the shield takes its share, so what is left over after the
// shield is what would reach HP; a source the shield doesn't answer (a hazard, a trap) is soaked in 'reduce'. Global
// listeners run after every item, so a Parry, a perk's cut and the Defender's plate have all had their say.
onHook('damage_in', (ctx: any, cb) => {
  const u: Unit = ctx.t; if (!u || !(ctx.dmg > 0) || u.dead || u.downed) return;
  const shielded = ctx.src?.shield !== false;
  if (ctx.phase !== (shielded ? 'shield' : 'reduce')) return;
  if (u.resMax?.guard == null || guardOf(u) < 1) return;
  if (ctx.self || NOT_A_HIT.has(ctx.src?.type)) return;
  if (holds(u, DEF_PLATE)) return; // the Defender's plate spends this unit's Guard, by its own policy
  const reach = Math.floor(ctx.dmg) - (shielded ? Math.max(0, u.shield || 0) : 0); if (reach <= 0) return;
  // 1 point is kept back for a reaction (Interpose, Shield Wall, Shrug It Off), unless what gets through would take
  // the unit down: then every point the hit needs is spent (the lead's tuning, 10 Nov 2026; provisional, keep_back).
  const per = G().soak ?? 10, have = guardOf(u), needs = Math.ceil(reach / per);
  let k = Math.min(Math.max(0, have - (G().keep_back ?? 1)), needs);
  if (reach - k * per >= u.hp) k = Math.min(have, needs);
  if (k < 1) return;
  const cut = Math.min(reach, k * per);
  spendGuard(cb, u, k); ctx.dmg = Math.floor(ctx.dmg) - cut; ctx.guardSoaked = (ctx.guardSoaked || 0) + cut;
  cb.log.push(u.name + '\'s Guard takes ' + cut + ' of it (' + k + ' Guard, ' + guardOf(u) + ' left).');
});

// ---------- Interpose ----------
// An ally next to you is hit by an attack: spend 1 Guard and your reaction and take the hit instead. The damage is
// worked out again against you (your armour applies), then your own shield and what Guard you have left soak it. The
// attack's critical injury follows the hit to you. A hit is a weapon attack by an enemy, as the Defender's Interpose
// reads it. Switched off like any Answer (the character's Answer list).
let interposing = false;
/** The ally an Interpose just covered: the same attack's injury follows the hit. */
let covered: { t: string; me: string } | null = null;
technique({
  id: 'interpose',
  run: () => 'Interpose is a reaction: it fires when an ally next to you is hit.',
  react: {
    damage_in(ctx, t) {
      const me = t.u, cb = t.cb, v: Unit = ctx.t, src = ctx.src, cost = t.num('guard_cost', G().interpose_cost ?? 1);
      if (ctx.phase !== 'reduce' || interposing || !(ctx.dmg > 0) || !v || v === me || v.side !== me.side || v.dead || v.downed) return;
      if (src?.type !== 'weapon' || !src.by || src.by.side === v.side) return;
      if (!alive(me) || dist(me.pos, v.pos) > t.num('reach', 1) || guardOf(me) < cost) return;
      if (holds(me, DEF_BRACE)) return; // the Defender Interposes by its class move, with that move's policy
      if (statQuery({ u: v }, 'prey_lock', { by: src.by }).add > 0) return; // a blow that stays on its prey (Rabbit's Foot)
      answer(t, src.by, () => {
        spendGuard(cb, me, cost);
        const d = attackDamage(cb, src.by, me, src.mode || 'shot', charOfUnit(src.by), { crit: !!src.crit, preview: true, ambush: !!src.ambush });
        const dmg = landed(d.total, d.armour);
        ctx.dmg = 0;
        interposing = true; let r; try { r = applyDamage(cb, me, dmg, { ...src, shield: true, interposed: true } as any); } finally { interposing = false; }
        emitFx(cb, 'shove', { unit: me.id, target: v.id, from: me.pos, to: me.pos, ok: true, interpose: true });
        cb.log.push(me.name + ' interposes for ' + v.name + ' (' + cost + ' Guard) and takes ' + r.amount + ' damage' + (me.hp === 0 ? ' · Downed' : '') + '.');
        if (me.hp === 0) fxFell(cb, me);
        covered = { t: v.id, me: me.id };
      });
    },
  },
  ai: () => 0,
});
onHook('injury', (ctx: any, cb) => {
  const ip = covered; if (!ip || ctx.t?.id !== ip.t || ctx.cancel) return; covered = null;
  const me = cb.units.find((x) => x.id === ip.me); if (!me) return;
  ctx.cancel = true;
  if (!me.dead && !me.downed) cb.log.push('The blow\'s injury lands on ' + me.name + ' (Interpose)' + rollInjury(ctx.rng, me, cb, ctx.by || null) + '.');
});
onHook('on_hit', () => { covered = null; });
onHook('on_miss', () => { covered = null; });
