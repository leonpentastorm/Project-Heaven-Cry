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
import { emit } from './hooks';
import { noteTended } from './mending';
import { rawHidden, setDowned } from '../unitstate';

/** Tending others (rules 1.5, calming the heart): magic.ts sets f; a heal, stim, shield or cleanse given calls it. */
export const tendHook: { f: ((cb: Combat | null, by: Unit | null, t: Unit) => void) | null } = { f: null };
/** Where a blow comes from: who, its type and damage type, whether it meets shields, who gets the kill credit. */
export interface DamageSrc {
  /** Who did it (null: a hazard, a trap, bleeding, burning). */
  by?: Unit | null;
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

/** Read Them: the share of its damage an analysed enemy loses against the other side. */
export const READ_THEM = 0.15;
/** Is the damage from someone on the other side of the unit it hits? */
export const hostileSrc = (t: Unit, src: DamageSrc) => !!src.by && src.by.side !== t.side;

/** The damage a shield does not stop (the spec's Shields paragraph; Leon, 12 Nov 2026): damage over time (Bleeding,
 * Burning, Corroded, a heart's Strain burn) and true damage. Everything else meets the shield first: a bullet, a
 * blade, a spell, an Outburst, a prayer, a blast, a trap, a hazard. One rule, read here for every source. */
export const PAST_SHIELDS = new Set(['true', 'bleed', 'burn', 'burning', 'corrode', 'corroded', 'poison', 'strain', 'dot']);
/** Does this source go past shields (pastShields: true damage and damage over time)? */
export const pastShields = (src: { type?: string; dmgType?: string }): boolean => PAST_SHIELDS.has(src.type || '') || src.dmgType === 'true';
/** Take damage (already past armour) off a unit's HP. */
export function applyDamage(cb: Combat | null, t: Unit, dmg: number, src: DamageSrc): DamageResult {
  const res: DamageResult = { dealt: 0, shielded: 0, killed: false, downedHit: false, prevented: false, amount: 0 };
  if (t.dead) return res;
  if (src.shield !== false && pastShields(src)) src = { ...src, shield: false };
  const ctx: any = { t, src, dmg: Math.max(0, Math.floor(dmg)), phase: 'reduce', hostile: hostileSrc(t, src), self: src.by === t, cb,
    /** the Guard points the unit had as the hit arrived, before any soak spends them (physical/rules.ts: a guard keeps Momentum) */ guard0: t.res?.guard || 0 };
  // Derived reductions (spec: Derived stats): Elemental damage taken (−10% × Pain Threshold) and Ambush damage taken
  // (−10% × Reaction Speed), each capped at 60%, before items.
  if (ELEMENTAL_TYPES.has(src.dmgType || '') && t.elemTaken) ctx.dmg = ctx.dmg * (1 - Math.min(0.6, t.elemTaken));
  if (src.ambush && t.ambushTaken) ctx.dmg = ctx.dmg * (1 - Math.min(0.6, t.ambushTaken));
  // Read Them (Acuity 5, rules 1.13; was Weak Point): an enemy the squad has analysed deals 15% less damage to it. The
  // mark is Unit.weakPoint (Analyze at 5 points, Case Closed, Detective's Eye), whichever side holds it.
  if (src.by && src.by.weakPoint && src.by.side !== t.side) ctx.dmg = ctx.dmg * (1 - READ_THEM);
  if (cb) { emit(cb, 'damage_in', ctx); }
  ctx.dmg = Math.max(0, Math.floor(ctx.dmg));
  if (ctx.dmg <= 0 && dmg > 0) { res.prevented = true; return res; }
  if (src.shield !== false && !t.downed) {
    ctx.phase = 'shield'; if (cb) emit(cb, 'damage_in', ctx);
    // Classes 3.0 P11: the layers first, the newest first, then the base shield
    if (t.shields?.length) { for (let i = t.shields.length - 1; i >= 0 && ctx.dmg > 0; i--) { const l = t.shields[i], s = Math.min(l.n, ctx.dmg); l.n -= s; ctx.dmg -= s; res.shielded += s; } t.shields = t.shields.filter((l) => l.n > 0); if (!t.shields.length) delete t.shields; }
    if (t.shield && t.shield > 0) { const s = Math.min(t.shield, ctx.dmg); t.shield -= s; ctx.dmg -= s; res.shielded += s; }
  }
  res.amount = ctx.dmg;
  if (t.downed) {
    t.saves.fail += src.downedFails ?? 1; res.downedHit = true;
    if (t.saves.fail >= 3) { t.dead = true; res.killed = true; dropped(cb, t, src, res, src.credit === 'all'); }
    return res;
  }
  if (ctx.dmg <= 0) return res;
  if (t.hp - ctx.dmg <= 0 && cb && !t.undying) {
    ctx.phase = 'would_drop_to_0'; ctx.floor = null; emit(cb, 'damage_in', ctx);
    if (ctx.floor != null) ctx.dmg = Math.max(0, t.hp - ctx.floor);
    ctx.dmg = Math.max(0, Math.floor(ctx.dmg));
    if (ctx.dmg <= 0) { res.prevented = true; return res; }
  }
  // The Effect testing room (Proving Ground): nobody there can be brought to 0; a unit that would be is topped up first.
  if (t.undying && t.hp - ctx.dmg < 1) t.hp = Math.max(t.maxHp, ctx.dmg + 1);
  const prevHp = t.hp; res.amount = ctx.dmg;
  t.hp = Math.max(0, t.hp - ctx.dmg); res.dealt = prevHp - t.hp;
  if (src.by) { t.lastHitBy = src.by.id; const d = (t.damagedBy ||= []); if (!d.includes(src.by.id)) d.push(src.by.id); }
  if (t.hidden && res.dealt > 0) { rawHidden(cb, t, false); if (cb) (cb.sightWhy ||= {})[t.id] = 'reveal'; } // damage reveals a Hidden unit (rules 1.3; presentation: a reveal, not a plain entry)
  if (t.hp === 0) {
    if (src.nonlethal && t.side === 'foe' && !t.companion) { t.surrendered = true; t.subdued = true; res.killed = false; if (cb) { emit(cb, 'on_surrender', { t, by: src.by || null, why: 'subdued', cb }); say(cb, t.name + ' is subdued, not killed.'); } }
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

/** Healing a unit through the hooks: 'heal_in' {t, by, n, kind} may change n, then HP; 'heal_given' after. Returns HP
 * actually restored (a Downed unit is brought back up at max(1, n)). */
export function healUnit(cb: Combat | null, t: Unit, n: number, by: Unit | null, kind: string, _o: { /** (rules 1.20's round limit is withdrawn, rules 1.23: nothing reads this) */ noLimit?: boolean } = {}): { restored: number; revived: boolean; /** always false since rules 1.23 (there is no round limit) */ limited?: boolean } {
  if (t.dead) return { restored: 0, revived: false };
  // Healing received: +10% × Camaraderie (rules 1.13).
  const ctx: any = { t, by, n: Math.floor(n * (t.healRecv || 1)), kind, cb };
  if (cb) { emit(cb, 'heal_in', ctx); ctx.n = Math.max(0, Math.floor(ctx.n)); }
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
export interface ShieldOpts { layer?: string; holders?: number; stack?: boolean }
/** A unit's shield in all: the base and every layer. */
export const shieldTotal = (t: Unit): number => (t.shield || 0) + (t.shields || []).reduce((a, l) => a + l.n, 0);
/** Give a shield through the hooks ('shield_grant' {by, t, n, layer} may change n). Shields don't stack: the larger
 * stands (the base shield; on a layer, the larger of one giver's layer on a unit). A layer is spent before the base,
 * the newest first (Classes 3.0 P11). `o`: a boolean is the old `stack`. */
export function grantShield(cb: Combat | null, t: Unit, n: number, by: Unit | null, o: boolean | ShieldOpts = false): number {
  const so: ShieldOpts = typeof o === 'boolean' ? { stack: o } : o, stack = !!so.stack;
  const ctx: any = { t, by, n: Math.floor(n * (t.shieldRecv || 1)), cb, ...(so.layer ? { layer: so.layer } : {}) }; if (cb) emit(cb, 'shield_grant', ctx); // shields received: +10% × Conscience (rules 1.13)
  if (so.layer) return layerShield(cb, t, Math.max(0, Math.floor(ctx.n)), by, so);
  const had = t.shield || 0, v = Math.max(0, Math.floor(ctx.n)); t.shield = stack ? had + v : Math.max(had, v);
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

