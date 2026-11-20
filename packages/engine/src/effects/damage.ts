import { say } from '../log';
// The one damage chokepoint (plan 2.8 item 1, the part the hooks need now): every HP loss in a fight goes through
// applyDamage, in phases, so perks and traits can reduce it, shield it, stop a drop to 0, and hear about wounds,
// Downs and kills. Sites still work out their own armour (it differs: attacks, hazards, Sigil, Elemental, Soul, true)
// and their own presentation events; this does the rest.
//
// Phases, each a 'damage_in' emit with ctx.phase set (ctx is mutable: change ctx.dmg):
//   'reduce'          before the shield (flat and percentage reductions, immunities set ctx.dmg = 0)
//   'shield'          just before the shield takes its share (a handler may add ctx.t.shield)
//   'would_drop_to_0' the hit would take the last HP: set ctx.dmg lower, or ctx.floor = 1 (Last Wall, Angel, Bite the Bullet;
//                     order them with priority)
//   'after'           HP has been taken (ctx.dealt, ctx.killed)
// then 'on_damaged' {t, src, dmg, prevHp} when HP was lost, 'on_downed' {victim, by, src, ownTurn} on a Down or a death,
// and 'on_kill' {victim, by, src} when kill credit is given.
import type { Combat, Unit } from '../combat';
import { emit, harmHeld } from './hooks';
import { noteTended } from './mending';
import { rawHidden, setDowned } from '../unitstate';
import { canYield, YIELD } from '../yielding';
import { ELEMENTAL_CAP } from '../data';

/** Tending others (rules 1.5, calming the heart): magic.ts sets f; a heal, stim, shield or cleanse given calls it. */
export const tendHook: { f: ((cb: Combat | null, by: Unit | null, t: Unit) => void) | null } = { f: null };
/** Where a blow comes from: who, its type and damage type, whether it meets shields, who gets the kill credit. */
export interface DamageSrc {
  /** Who did it (null: a hazard, a trap, bleeding, burning). */
  by?: Unit | null;
  /** Classes 3.0: a share moved by the item op `redirect` (it is not moved again). */ redirected?: boolean;
  /** 'weapon' (an attack), 'hazard', 'trap', 'explosion', 'bleed', 'burn', 'sigil', 'elemental', 'soul', 'true', 'short', … */
  type: string;
  melee?: boolean; ranged?: boolean; crit?: boolean; explosive?: boolean; ambush?: boolean; shared?: boolean;
  /** The shield takes damage first (attacks and magic: yes; hazards, traps and bleeding: no, as before). */
  shield?: boolean;
  /** A hit on a Downed unit: failures it adds (default 1; a critical attack 2). */
  downedFails?: number;
  /** Kill credit: 'hp' (only for taking the last HP; magic), 'all' (also a Downed unit finished off; attacks). */
  credit?: 'hp' | 'all' | 'none';
  /** The attack or spell's own context, for handlers. */
  mode?: string; weapon?: string;
  /** The damage type (physical, elemental, lightning, emp, fire, sigil, soul, true…; weapons.json damage_type). */
  dmgType?: string;
  /** A non-lethal blow: taking a foe's last HP subdues it instead of killing it (rules 1.3). */
  nonlethal?: boolean;
  /** The special ammo the shot carried (armor_piercing, hollow_point, incendiary, enhanced), if any. */
  ammo?: string | null;
}
/** Damage types that count as Elemental for 'Elemental damage taken' (spec: Derived stats). */
export const ELEMENTAL_TYPES = new Set(['elemental', 'fire', 'lightning', 'frost', 'cold']);
/** What applyDamage did: HP dealt, the shield's share, a kill, a Down, prevented, the amount the log reports. */
export interface DamageResult { dealt: number; shielded: number; killed: boolean; downedHit: boolean; prevented: boolean;
  /** The damage after reductions and the shield (it may be more than the HP it took): what the log reports. */
  amount: number }

/** Is the damage from someone on the other side of the unit it hits? */
export const hostileSrc = (t: Unit, src: DamageSrc) => !!src.by && src.by.side !== t.side;

/** The damage a shield does not stop (the spec's Shields paragraph; Leon, 12 Nov 2026): damage over time (Bleeding,
 * Burning, Corroded, a heart's Strain burn) and true damage. Everything else meets the shield first: a bullet, a
 * blade, a spell, an Outburst, a prayer, a blast, a trap, a hazard. One rule, read here for every source. */
export const PAST_SHIELDS = new Set(['true', 'bleed', 'burn', 'burning', 'corrode', 'corroded', 'poison', 'strain', 'dot']);
/** Does this source go past shields (pastShields: true damage and damage over time)? */
export const pastShields = (src: { type?: string; dmgType?: string }): boolean => PAST_SHIELDS.has(src.type || '') || src.dmgType === 'true';
/** The damage nothing changes (rules 1.56, the Mana Shock; spec item 4505): the heart's own harm, source type 'strain'
 * (magic.ts heartHarm: the burn a point over the limit and the Mana Shock's share). It meets no derived reduction and no
 * 'reduce', 'shield' or 'would_drop_to_0' listener, so no item, perk, trait, condition, boon, prayer, intervention, ward
 * or Guard reduces, raises (Pain Eater's +50% taken: Leon, 16 Nov 2026, "do all 4"), redirects, shares or floors it;
 * 'after', on_damaged and on_downed still speak (Hollow Heart, the Down that ends the Shock). One gate here, for every
 * listener there is and every one to come, lowering or raising. */
const UNSOFTENED = new Set(['strain', /* borrowed time running out (effects/triggers.ts last_turn): the blow put off lands as it was */ 'last_turn', /* rules 1.90 item 7808: a solo fumbled ambush (game.ts runFight; its floor is the caller's) */ 'fumble']);
/** Take damage (already past armour) off a unit's HP. */
export function applyDamage(cb: Combat | null, t: Unit, dmg: number, src: DamageSrc): DamageResult {
  const res: DamageResult = { dealt: 0, shielded: 0, killed: false, downedHit: false, prevented: false, amount: 0 };
  if (t.dead) return res;
  if (dmg > 0 && harmHeld(cb, src.by, t)) { res.prevented = true; return res; } // rules 1.55 item 38: no harm to a friend on the field
  if (src.shield !== false && pastShields(src)) src = { ...src, shield: false };
  const ctx: any = { t, src, dmg: Math.max(0, Math.floor(dmg)), phase: 'reduce', hostile: hostileSrc(t, src), self: src.by === t, cb,
    /** the Guard points the unit had as the hit arrived, before any soak spends them (physical/rules.ts: a guard keeps Momentum) */ guard0: t.res?.guard || 0 };
  const soft = !UNSOFTENED.has(src.type); // the one gate (UNSOFTENED): below it, nothing lowers or raises the heart's own harm
  if (soft) {
    // Derived reductions (spec: Derived stats), before items: Elemental damage taken (the sheet's elementalTakenPct, at most
    // rules.json combat.elemental_taken_cap: ELEMENTAL_CAP) and Ambush damage taken (the sheet's ambushTakenPct, at most 60%).
    if (ELEMENTAL_TYPES.has(src.dmgType || '') && t.elemTaken) ctx.dmg = ctx.dmg * (1 - Math.min(ELEMENTAL_CAP, t.elemTaken)); // rules 1.70 item 5540: the one cap
    if (src.ambush && t.ambushTaken) ctx.dmg = ctx.dmg * (1 - Math.min(0.6, t.ambushTaken));
    if (cb) emit(cb, 'damage_in', ctx);
  }
  ctx.dmg = Math.max(0, Math.floor(ctx.dmg));
  if (ctx.dmg <= 0 && dmg > 0) { res.prevented = true; return res; }
  if (src.shield !== false && !t.downed) {
    ctx.phase = 'shield'; if (cb) emit(cb, 'damage_in', ctx);
    // Classes 3.0 P11: the layers first, the newest first, then the base shield (shieldOrder: the one copy of the order)
    for (const e of shieldOrder(t)) { if (ctx.dmg <= 0) break; const s = Math.min(e.n, ctx.dmg); if (e.layer) e.layer.n -= s; else t.shield = (t.shield || 0) - s; ctx.dmg -= s; res.shielded += s; }
    if (t.shields) { t.shields = t.shields.filter((l) => l.n > 0); if (!t.shields.length) delete t.shields; }
  }
  res.amount = ctx.dmg;
  if (t.downed) {
    t.saves.fail += src.downedFails ?? 1; res.downedHit = true;
    if (t.saves.fail >= 3) { t.dead = true; res.killed = true; dropped(cb, t, src, res, src.credit === 'all'); }
    return res;
  }
  if (ctx.dmg <= 0) return res;
  if (t.hp - ctx.dmg <= 0 && cb && !t.undying && soft) {
    ctx.phase = 'would_drop_to_0'; ctx.floor = null; emit(cb, 'damage_in', ctx);
    if (ctx.floor != null) ctx.dmg = Math.max(0, t.hp - ctx.floor);
    ctx.dmg = Math.max(0, Math.floor(ctx.dmg));
    // held at its floor already: nothing lands, so nothing is reported (a held hit once said "63834 damage · no damage")
    if (ctx.dmg <= 0) { res.prevented = true; res.amount = 0; return res; }
  }
  // The Effect testing room (Proving Ground): nobody there can be brought to 0; a unit that would be is topped up first.
  if (t.undying && t.hp - ctx.dmg < 1) t.hp = Math.max(t.maxHp, ctx.dmg + 1);
  const prevHp = t.hp; res.amount = ctx.dmg;
  t.hp = Math.max(0, t.hp - ctx.dmg); res.dealt = prevHp - t.hp;
  if (src.by) { t.lastHitBy = src.by.id; const d = (t.damagedBy ||= []); if (!d.includes(src.by.id)) d.push(src.by.id); }
  if (t.hidden && res.dealt > 0) { rawHidden(cb, t, false); ctx.revealed = true; if (cb) (cb.sightWhy ||= {})[t.id] = 'reveal'; } // damage reveals a Hidden unit (rules 1.3; presentation: a reveal, not a plain entry)
  if (t.hp === 0) {
    // rules 1.66 item 5201: a unit that cannot yield is disabled by a non-lethal blow (out of the fight as any fallen
    // foe), and no mercy is shown: no surrender, so no Clean Hands shield, no Mercy Devotion
    const cannot = src.nonlethal && t.side === 'foe' && !t.companion && !canYield(t);
    if (cannot && cb) say(cb, t.name + ' ' + (YIELD.disabled_text || 'cannot yield') + '.');
    if (src.nonlethal && t.side === 'foe' && !t.companion && !cannot) { t.surrendered = true; t.subdued = true; res.killed = false; if (cb) { emit(cb, 'on_surrender', { t, by: src.by || null, why: 'subdued', cb }); say(cb, t.name + ' is subdued, not killed.'); } }
    else { if (t.side === 'foe' || t.companion) t.dead = true; else setDowned(t, true); res.killed = true; dropped(cb, t, src, res, src.credit !== 'none'); }
  }
  if (cb) {
    ctx.phase = 'after'; ctx.dealt = res.dealt; ctx.killed = res.killed; emit(cb, 'damage_in', ctx);
    if (res.dealt > 0) emit(cb, 'on_damaged', { t, src, dmg: res.dealt, prevHp, cb });
  }
  return res;
}
function dropped(cb: Combat | null, t: Unit, src: DamageSrc, res: DamageResult, credit: boolean) {
  const by = src.by || null, ownTurn = !!cb && !!by && cb.order[cb.turn] === by.id;
  if (credit && by && by.side !== t.side) by.kills += t.tier === 'boss' ? 3 : 1; // friendly fire earns no kills
  if (!cb) return;
  emit(cb, 'on_downed', { victim: t, by, src, ownTurn, dead: !!t.dead, cb });
  if (credit && by && by.side !== t.side) emit(cb, 'on_kill', { victim: t, by, src, ownTurn, cb });
  void res;
}

/** A finite number, else 0 (a repair's amount: healUnit). */
const n0 = (x: number) => (Number.isFinite(x) ? x : 0);
/** Healing a unit through the hooks: 'heal_in' {t, by, n, kind} may change n, then HP; 'heal_given' after. Returns HP
 * actually restored (a Downed unit is brought back up at max(1, n)). */
export function healUnit(cb: Combat | null, t: Unit, n: number, by: Unit | null, kind: string, _o: { /** (rules 1.20's round limit is withdrawn, rules 1.23: nothing reads this) */ noLimit?: boolean; /** the most one heal restores (effects/output.ts mend: the percent cap), after the received bonuses */ cap?: number; /** the share is already the whole heal: the healing-received bonus (healRecv) is not applied (Camaraderie's heal back, rules 1.60 item 4610: the share it shows is the share it heals) */ plain?: boolean; /** rules 1.86 item 7403: a repair (a profile that is not a heal: output.ts mend), not a heal (rules 1.34): HP restored with no healing-received bonus, no hooks ('heal_in', 'heal_given', the tend hook) and no healer noted */ repair?: boolean } = {}): { restored: number; revived: boolean; /** always false since rules 1.23 (there is no round limit) */ limited?: boolean } {
  if (t.dead) return { restored: 0, revived: false };
  if (_o.repair) { const m = Math.max(0, Math.floor(n0(n))); if (t.downed) { setDowned(t, false); t.hp = Math.min(t.maxHp, Math.max(1, m)); return { restored: t.hp, revived: true }; } const was = t.hp; t.hp = Math.min(t.maxHp, t.hp + m); return { restored: t.hp - was, revived: false }; }
  // Healing received: +10% × Camaraderie (rules 1.13).
  const ctx: any = { t, by, n: Math.floor(n * (_o.plain ? 1 : t.healRecv || 1)), kind, cb };
  if (cb) { emit(cb, 'heal_in', ctx); ctx.n = Math.max(0, Math.floor(ctx.n)); }
  if (_o.cap != null) ctx.n = Math.min(ctx.n, _o.cap);
  // (Rules 1.20 held spells and prayers to half of a creature's max HP a round here. Withdrawn by rules 1.23: healing
  // is priced in AP, and the enemies go for whoever mends the most: noteTended below is what they read.)
  let restored = 0, revived = false;
  if (t.downed) { setDowned(t, false); t.hp = Math.min(t.maxHp, Math.max(1, ctx.n)); restored = t.hp; revived = true; }
  else { const was = t.hp; t.hp = Math.min(t.maxHp, t.hp + ctx.n); restored = t.hp - was; }
  noteTended(cb, by, t, restored);
  if (cb) emit(cb, 'heal_given', { t, by, n: restored, over: Math.max(0, ctx.n - restored), kind, revived, cb }); // over: the heal that didn't fit (P3 event:over)
  if (cb && by && (restored > 0 || revived)) tendHook.f?.(cb, by, t);
  return { restored, revived, limited: false };
}
/** A shield layer (Classes 3.0 P11): its kind, what is left of it, its giver, its serial (the oldest of a giver's ends first). */
export interface ShieldLayer { layer: string; n: number; by: string; s: number }
/** How a shield is given: on a layer above the base (layer), at most `holders` units carrying one giver's layer at once
 * (a new one ends the oldest), or added to what stands (stack). */
export interface ShieldOpts { layer?: string; holders?: number; stack?: boolean; /** the shield's kind for 'shield_grant' (tending, blessing, perk…: the `how` predicate) */ kind?: string }
/** The order a blow spends a unit's shields in (Classes 3.0 P11): every layer, the newest first, then the base shield
 * (`layer` null). The one copy of the order: applyDamage spends by it and screenViews.ts shieldsView lists by it. */
export function shieldOrder(t: Unit): { layer: ShieldLayer | null; n: number }[] {
  const out: { layer: ShieldLayer | null; n: number }[] = [];
  const ls = t.shields || []; for (let i = ls.length - 1; i >= 0; i--) if (ls[i].n > 0) out.push({ layer: ls[i], n: ls[i].n });
  if ((t.shield || 0) > 0) out.push({ layer: null, n: t.shield! });
  return out;
}
/** A unit's shield in all: the base and every layer. */
export const shieldTotal = (t: Unit): number => (t.shield || 0) + (t.shields || []).reduce((a, l) => a + l.n, 0);
/** Give a shield through the hooks ('shield_grant' {by, t, n, layer, kind} may change n). Shields don't stack: the larger
 * stands (the base shield; on a layer, the larger of one giver's layer on a unit). A layer is spent before the base,
 * the newest first (Classes 3.0 P11). `o`: a boolean is the old `stack`. */
export function grantShield(cb: Combat | null, t: Unit, n: number, by: Unit | null, o: boolean | ShieldOpts = false): number {
  const so: ShieldOpts = typeof o === 'boolean' ? { stack: o } : o, stack = !!so.stack;
  const ctx: any = { t, by, n: Math.floor(n * (t.shieldRecv || 1)), cb, ...(so.layer ? { layer: so.layer } : {}), ...(so.kind ? { kind: so.kind } : {}) }; if (cb) emit(cb, 'shield_grant', ctx); // shields received: +10% × Conscience (rules 1.13)
  if (so.layer) return layerShield(cb, t, Math.max(0, Math.floor(ctx.n)), by, so);
  const had = t.shield || 0, v = Math.max(0, Math.floor(ctx.n)); t.shield = stack ? had + v : Math.max(had, v);
  // rules 1.60 item 4613 (the lead's approval, 16 Nov 2026): the base shield records who gave the one that stands (the shield
  // display names the giver and inks the segment in the giver's door); an equal or smaller gift leaves it as it was
  if ((t.shield || 0) > had) { if (by) t.shieldBy = by.id; else delete t.shieldBy; }
  noteTended(cb, by, t, (t.shield || 0) - had); // rules 1.23: only what the shield really added (a smaller one over a bigger adds nothing)
  if (cb && by && v > 0) tendHook.f?.(cb, by, t);
  return v;
}
/** A shield on a layer: one giver's layer on a unit is one entry (the larger stands, or it adds with stack); with
 * `holders`, a giver's layer of this kind stands on at most that many units (a new one ends the oldest). */
function layerShield(cb: Combat | null, t: Unit, v: number, by: Unit | null, so: ShieldOpts): number {
  const ls = (t.shields ||= []), byId = by?.id || '', i = ls.findIndex((l) => l.layer === so.layer && l.by === byId), was = i >= 0 ? ls[i].n : 0;
  const s = cb ? ((cb as any).shieldSeq = ((cb as any).shieldSeq || 0) + 1) : ls.length + 1;
  const n = so.stack ? was + v : Math.max(was, v);
  if (i >= 0) ls.splice(i, 1);
  ls.push({ layer: so.layer!, n, by: byId, s });
  if (cb && so.holders != null && byId) {
    const carriers = cb.units.filter((u) => (u.shields || []).some((l) => l.layer === so.layer && l.by === byId));
    while (carriers.length > so.holders) {
      const old = carriers.reduce((a, u) => (lay(u, so.layer!, byId)!.s < lay(a, so.layer!, byId)!.s ? u : a));
      old.shields = old.shields!.filter((l) => !(l.layer === so.layer && l.by === byId)); if (!old.shields.length) delete old.shields;
      carriers.splice(carriers.indexOf(old), 1);
    }
  }
  noteTended(cb, by, t, n - was);
  if (cb && by && v > 0) tendHook.f?.(cb, by, t);
  return v;
}
const lay = (u: Unit, layer: string, by: string) => (u.shields || []).find((l) => l.layer === layer && l.by === by);

