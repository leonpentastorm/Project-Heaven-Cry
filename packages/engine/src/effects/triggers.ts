// ITEM OPS (engine foundations 3; engine review 1, finding F5; docs/design/handoffs/engine-foundations-3-item-ops.md).
// An item whose behaviour is "when X happens, if Y, do Z, at most N per scope" is written in data only, and run here:
//
//   { "op": "<one of OPS>", "when": "<one of TRIGGERS>", "if": { <PREDICATES> }, "limit": { "per": "per_turn", "n": 1 },
//     ...the op's own fields (value, condition, rounds, amount…), "say": "{self} doesn't move an inch (Siege Engine).",
//     "and": [ more ops run under the same trigger, test and limit ] }
//
// The three lists are CLOSED: an unknown trigger, predicate or op is an error in tools/validate.py (which reads them from
// data/effect_ops.json `item_ops`; test/item-ops.test.ts holds this file and that block equal). A `when` written as
// prose (with spaces) is the old free-text scope: the item's own handler runs it or the Narrator reads it.
//
// The runner is generic: hooks.ts's ownerOf() makes such an effect 'generic', buildIndex() puts it on its trigger's hook,
// and runTriggered() below reads the event, tests `if`, takes the `limit` through effects/uses.ts (the item's key, so the
// counter is the one a handler kept with uses(h)), runs the op and writes `say`. A preview (ctx.preview) changes no
// state: the amount ops still speak (a preview shows the number), the limit is read and not taken, nothing is logged.
import '../datatext'; // fills the texts' {=placeholders} before any data is read
import type { Combat, Unit } from '../combat';
import type { Holder, HookName } from './types';
import { uses } from './uses';
import { setTriggerRunner, setAllItems, onHook } from './hooks';
import { allItems, rawItem as rawItemT, itemInfo as itemInfoT } from './collect';
import { overworld, rngOf, unitsIn, tilesAround, tie, untie, tiedTo, tieKinds, tieCap, canStand, tiesOf as tiesOfK, type Area } from '../kit';
import { holds, FOCUS_DOORS, handProps, gearAt, kindOfDoor, FOCUS_IDS } from '../character';
import { applyDamage } from './damage';
import { spawnOwned, unmakeOwned, ownerOf } from '../owned';
import { say, dist, displace, emitFx, unitSees, sideSees, attackEvent, lineOfSight, enemyIntent, dropToPile } from '../combat';
import { WEAPON } from '../data';
import { magsOf, type PackItem } from '../character';
import { applyCond, endCond, condOn, condId, debuffsOf, withVia, makeZone, zonesAt, endZones, DATA_ZONE_KINDS, saveAgainst, condHas } from '../magic';
import { nextToCover, objectsAt, objectsOf, damageObject, refOf } from '../combat';
import { objectIs, makeObject } from '../objects';
import { CONDITION_ROWS, condRowsVersion, COND_TABLE_STATS } from '../condtable';
import { isStatId } from './stats';
import type { ItemInfo } from './types';
import { charOfUnit } from './hooks';
import patronsJ from '../../../../data/patrons.json';
import techniquesJ from '../../../../data/techniques.json';
import { RESOURCES, resGive } from './cost';
import { grantPerkAp, bankAp } from './ap';
import { loseAp } from './cost';
import { resGain, react, canReact, REACT_KINDS, sightOf, SIGHT_WORDS } from '../tactics';
import { gainEcho } from './echo';
import { deal, mend, amountOf, type AmountSpec } from './output';
import { amountBlock, numberOf, isNumberBlock, type AmountBlock } from './amounts';
import { resOf } from '../tactics';
import { patronIdOf } from '../belief'; // (no global hooks: faith.ts's load order stays as it was)
import { resLeft } from './cost';

// ============================================================================================== the triggers
/** A trigger: the hook it listens on (and the hook's phase), who the event's ACTOR and TARGET are, and whose event it
 * is by default (`self`): unless `if` names that role (`if.target` for a trigger whose `self` is 'target'), the holder
 * must be it. So `taking` with `if: { actor: 'foe' }` is still damage the HOLDER takes, from an enemy. */
export interface Trigger { hook: HookName; phase?: string; actor?: (ctx: any) => Unit | null | undefined; target?: (ctx: any) => Unit | null | undefined; self: 'actor' | 'target' | null; about: string }
const att = (c: any) => c.att, tgt = (c: any) => c.tgt, u_ = (c: any) => c.u, by = (c: any) => c.by, t_ = (c: any) => c.t, srcBy = (c: any) => c.src?.by, victim = (c: any) => c.victim;
/** The closed list. Derived from the hooks the 310 lane handlers use, by count (the hand-off has the table). */
export const TRIGGERS: Record<string, Trigger> = {
  combat_start: { hook: 'combat_start', self: null, about: 'the fight begins' },
  combat_end: { hook: 'combat_end', self: null, about: 'the fight ends' },
  round_start: { hook: 'round_start', self: null, about: 'a new round begins' },
  turn_ap: { hook: 'turn_start_pre', actor: u_, self: 'actor', about: 'a unit\'s turn is about to begin: its AP are being counted (grant_ap adds to or takes from this turn)' },
  turn_start: { hook: 'turn_start', actor: u_, self: 'actor', about: 'a unit\'s turn has begun' },
  turn_end: { hook: 'turn_end', actor: u_, self: 'actor', about: 'a unit\'s turn ends' },
  attack: { hook: 'attack_preview', actor: att, target: tgt, self: 'actor', about: 'an attack is being sized up (to-hit terms, its AP, a refusal); also every preview' },
  attack_roll: { hook: 'attack_roll', actor: att, target: tgt, self: 'actor', about: 'an attack\'s d20 is rolled' },
  hit: { hook: 'on_hit', actor: att, target: tgt, self: 'actor', about: 'an attack hit' },
  miss: { hook: 'on_miss', actor: att, target: tgt, self: 'actor', about: 'an attack missed' },
  dealing: { hook: 'damage_out', actor: att, target: tgt, self: 'actor', about: 'an amount of damage is being made (before armour)' },
  taking: { hook: 'damage_in', phase: 'reduce', actor: srcBy, target: t_, self: 'target', about: 'damage is about to land (after armour, before the shield)' },
  would_drop: { hook: 'damage_in', phase: 'would_drop_to_0', actor: srcBy, target: t_, self: 'target', about: 'a blow would drop a unit to 0 HP' },
  damaged: { hook: 'on_damaged', actor: srcBy, target: t_, self: 'target', about: 'a unit lost HP' },
  downed: { hook: 'on_downed', actor: by, target: victim, self: 'target', about: 'a unit went down (Downed or dead)' },
  kill: { hook: 'on_kill', actor: by, target: victim, self: 'actor', about: 'a unit was dropped by an enemy' },
  cond_incoming: { hook: 'cond_apply', actor: by, target: t_, self: 'target', about: 'a condition is about to be put on a unit (its save, its rounds, a refusal)' },
  cond_landed: { hook: 'cond_landed', actor: by, target: t_, self: 'target', about: 'a condition landed' },
  cond_ended: { hook: 'cond_end', target: u_, self: 'target', about: 'a condition ended' },
  save: { hook: 'save', actor: by, target: t_, self: 'target', about: 'a save is rolled' },
  moved: { hook: 'moved', actor: u_, self: 'actor', about: 'a unit finished a move of its own' },
  forced_move: { hook: 'forced_move', actor: by, target: u_, self: 'target', about: 'a unit is about to be pushed, pulled, thrown or teleported' },
  heal: { hook: 'heal_in', actor: by, target: t_, self: 'target', about: 'a unit is about to be healed' },
  heal_given: { hook: 'heal_given', actor: by, target: t_, self: 'actor', about: 'a heal landed' },
  shield: { hook: 'shield_grant', actor: by, target: t_, self: 'target', about: 'a shield is about to be given' },
  cost: { hook: 'cost', actor: u_, self: 'actor', about: 'an action is priced (every priced action)' },
  reload: { hook: 'reload', actor: u_, self: 'actor', about: 'a reload is made' },
  swap: { hook: 'swap', actor: u_, self: 'actor', about: 'a weapon swap is priced' },
  injury: { hook: 'injury', actor: by, target: t_, self: 'target', about: 'an injury is about to be rolled on a unit' },
  glyph_cost: { hook: 'glyph_cost', actor: u_, self: 'actor', about: 'a Sigil glyph is priced (its AP, charge and Flux; also every preview)' },
  // Classes 3.0 step 1 (docs/design/rev4-primitives.md P2 and the batch rows)
  acted: { hook: 'acted', actor: u_, target: t_, self: 'actor', about: 'a unit\'s own action succeeded (once, after it; ctx.action is its id or cost site, test it with `action`); a grant_action\'s nested `when: acted` effects need no `if.action`' },
  reaction: { hook: 'reaction', actor: u_, self: 'actor', about: 'the holder makes a reaction (tactics.ts react(); its kind for `how`: attack, move, protect), before it resolves' },
  to_hit: { hook: 'to_hit', actor: att, target: tgt, self: 'actor', about: 'a roll to hit a target is sized up: a weapon attack, a Sigil or an Outburst (one hook, rolls.ts toHitTerms; `damage` reads its type: weapon, sigil, soul); roll_mod adds a term' },
  spot: { hook: 'spot', actor: by, target: u_, self: 'target', about: 'a unit rolls to spot a Hidden one (the holder is the Hidden one; roll_mod changes the roll or, with roll: "tn", its TN; cancel)' },
};

// ============================================================================================== the event
export interface Ev { ctx: any; trig: Trigger; h: Holder; self: Unit; cb: Combat; actor: Unit | null; target: Unit | null; preview: boolean }
type Who = 'self' | 'actor' | 'target';
const unitOf = (ev: Ev, who: Who): Unit | null => (who === 'self' ? ev.self : who === 'actor' ? ev.actor : ev.target);
/** How a unit stands to the holder: 'self', 'ally' (same side, not the holder), 'side' (same side, the holder too),
 * 'foe', 'other' (anyone but the holder), 'none' (no unit), 'any'. */
function rel(self: Unit, u: Unit | null, want: string): boolean {
  if (want === 'any') return true;
  if (want === 'none') return !u;
  if (!u) return false;
  switch (want) {
    case 'self': return u === self;
    case 'ally': return u !== self && u.side === self.side;
    case 'side': return u.side === self.side;
    case 'foe': return u.side !== self.side;
    case 'other': return u !== self;
    default: return false;
  }
}
const list = (x: any): any[] => (Array.isArray(x) ? x : [x]);
const share = (u: Unit) => u.hp / u.maxHp;
const DMG_WORDS = ['melee', 'ranged', 'explosive', 'outburst', 'weapon', 'physical', 'sigil', 'soul', 'elemental', 'fire', 'lightning', 'emp', 'true'];
function dmgIs(src: any, w: string): boolean {
  if (!src) return false;
  return w === 'melee' ? !!src.melee : w === 'ranged' ? !!src.ranged : w === 'explosive' ? !!src.explosive : w === 'outburst' ? src.type === 'soul'
    : w === 'weapon' ? src.type === 'weapon' : w === 'physical' ? src.type === 'weapon' && src.dmgType !== 'elemental' : src.type === w || src.dmgType === w;
}
/** A hit by someone: not a hazard, a trap's tick, Bleeding or Burning. */
const byHit = (src: any) => !!src?.by && !['bleed', 'burn', 'hazard', 'trap'].includes(src.type);
/** Damage a unit does to itself (a Mana Short, an overload, Strain, Flux). */
const selfHarm = (ctx: any) => !!ctx.self || ['short', 'overload', 'strain', 'flux'].includes(ctx.src?.type);
/** The patron ids (data/patrons.json): the words predicate `patron` takes. */
const PATRON_IDS: string[] = ((patronsJ as any).items || []).map((p: any) => p.id);
const PATRON_NAME: Record<string, string> = Object.fromEntries(((patronsJ as any).items || []).map((p: any) => [p.id, p.name]));
const flags = (ev: Ev): Record<string, any> => (ev.self.ps?.[ev.h.key] as any)?.flags || {};

// ============================================================================================== the predicates
/** The closed list of `if` keys. Each reads the event; all of an effect's keys must hold. `<who>` is self, actor or
 * target. Numbers are shares of max HP (0.5: half) or tiles. */
export const PREDICATES: Record<string, { about: string; arg: 'rel' | 'number' | 'bool' | 'ids' | 'words' | 'string' | 'zone' | 'tie' | 'hold' | 'skill' | 'limit'; test: (ev: Ev, v: any) => boolean; values?: string[] }> = {};
/** faith.ts lends the predicate `answered` its prayer door as it loads (this file can't import it: load order). */
let ANSWERED: ((cb: Combat, rng: { state: number } | null, u: Unit, preview: boolean) => boolean) | null = null;
/** faith.ts sets the door the predicate `answered` asks (prayerAnswered: Classes 3.0 step 5, the Chaplain). */
export const setAnsweredDoor = (f: typeof ANSWERED) => { ANSWERED = f; };
/** Add a predicate; `values`: the closed list its words come from (the validator refuses any other word). */
const P = (name: string, arg: 'rel' | 'number' | 'bool' | 'ids' | 'words' | 'string' | 'zone' | 'tie' | 'hold' | 'skill' | 'limit', about: string, test: (ev: Ev, v: any) => boolean, values?: string[] | (() => string[])) => {
  PREDICATES[name] = { about, arg, test };
  // (a function: read when asked, for a list defined in a module this one is loaded inside of: tactics.ts SIGHT_WORDS)
  if (values) Object.defineProperty(PREDICATES[name], 'values', { enumerable: true, get: typeof values === 'function' ? values : () => values });
};
P('actor', 'rel', 'the event\'s actor is (self | ally | side | foe | other | none | any; a list: any of them)', (ev, v) => list(v).some((w) => rel(ev.self, ev.actor, w)));
P('target', 'rel', 'the event\'s target is (as actor)', (ev, v) => list(v).some((w) => rel(ev.self, ev.target, w)));
for (const who of ['self', 'actor', 'target'] as Who[]) {
  P(who + '_hp_below', 'number', who + '\'s HP is under this share of its max', (ev, v) => { const u = unitOf(ev, who); return !!u && share(u) < v; });
  P(who + '_hp_above', 'number', who + '\'s HP is over this share of its max', (ev, v) => { const u = unitOf(ev, who); return !!u && share(u) > v; });
  P(who + '_hp_at_most', 'number', who + '\'s HP is at most this share of its max', (ev, v) => { const u = unitOf(ev, who); return !!u && share(u) <= v; });
  P(who + '_has', 'ids', who + ' has one of these conditions', (ev, v) => { const u = unitOf(ev, who); return !!u && list(v).some((id) => condHas(u, id)); });
  P(who + '_lacks', 'ids', who + ' has none of these conditions', (ev, v) => { const u = unitOf(ev, who); return !!u && !list(v).some((id) => condHas(u, id)); });
  P(who + '_tier', 'words', who + '\'s tier is one of these (vermin, minion, soldier, elite, boss)', (ev, v) => { const u = unitOf(ev, who); return !!u && list(v).includes((u as any).tier); });
  P(who + '_not_tier', 'words', who + '\'s tier is none of these', (ev, v) => { const u = unitOf(ev, who); return !!u && !list(v).includes((u as any).tier); });
  P(who + '_kind', 'words', who + '\'s kind is one of these (human, robot, crawler, ork…)', (ev, v) => { const u = unitOf(ev, who); return !!u && list(v).includes((u as any).kind || 'human'); });
  P(who + '_not_kind', 'words', who + '\'s kind is none of these', (ev, v) => { const u = unitOf(ev, who); return !!u && !list(v).includes((u as any).kind || 'human'); });
  if (who !== 'self') P(who + '_within', 'number', who + ' stands within this many tiles of the holder', (ev, v) => { const u = unitOf(ev, who); return !!u && !!u.pos && dist(u.pos, ev.self.pos) <= v; });
  P(who + '_sight', 'words', who + '\'s sight to the other side: seen, unseen, in_view, out_of_view (tactics.ts sightOf; any of the words named)', (ev, v) => { const u = unitOf(ev, who); if (!u) return false; const s = sightOf(ev.cb, u); return list(v).some((w) => s.includes(w)); }, () => SIGHT_WORDS);
  if (who !== 'self') P(who + '_sees_self', 'bool', who + ' can (or cannot) see the holder: its eyes reach the holder\'s tile and the holder is not Hidden (shadow-spec 2.1)', (ev, v) => { const u = unitOf(ev, who); return !!u && (unitSees(ev.cb, u, ev.self.pos) && !ev.self.hidden) === v; });
}
P('melee', 'bool', 'the attack or damage is (true) or is not (false) melee', (ev, v) => !!(ev.ctx.melee ?? ev.ctx.src?.melee) === v);
P('crit', 'bool', 'the attack is (or is not) a critical', (ev, v) => !!(ev.ctx.crit ?? ev.ctx.src?.crit) === v);
P('mode', 'words', 'the attack\'s mode is one of these (shot, aimed, burst, auto, melee, thrown, paired), or the technique it is made with (riposte…: ctx.tech)', (ev, v) => list(v).includes(ev.ctx.mode) || (!!ev.ctx.tech && list(v).includes(ev.ctx.tech)));
P('damage', 'words', 'the damage is of one of these kinds (' + DMG_WORDS.join(', ') + ')', (ev, v) => list(v).some((w) => dmgIs(ev.ctx.src || ev.ctx, w)));
P('not_damage', 'words', 'the damage is of none of these kinds (as damage; also a source type: strain, short)', (ev, v) => !list(v).some((w) => dmgIs(ev.ctx.src || ev.ctx, w)));
P('by_hit', 'bool', 'the damage came (or did not come) from someone\'s blow, not a hazard, trap, Bleeding or Burning', (ev, v) => byHit(ev.ctx.src) === v);
P('self_harm', 'bool', 'the damage is (or is not) the unit\'s own doing (a Mana Short, an overload, Strain, Flux)', (ev, v) => selfHarm(ev.ctx) === v);
P('hostile', 'bool', 'the actor and the target are (or are not) on different sides', (ev, v) => (!!ev.actor && !!ev.target && ev.actor.side !== ev.target.side) === v);
P('cond', 'ids', 'the condition is one of these', (ev, v) => list(v).map(condId).includes(condId(ev.ctx.id)));
P('cond_family', 'words', 'the condition\'s family is one of these (body, brain, heart)', (ev, v) => list(v).includes(ev.ctx.fam));
P('action', 'words', 'the priced action (its cost site) is one of these', (ev, v) => list(v).includes(ev.ctx.action));
P('word', 'words', 'the Sigil word being drawn is one of these', (ev, v) => list(v).includes(ev.ctx.word));
P('hand', 'words', 'the hand is one of these (main, off, both)', (ev, v) => list(v).includes(ev.ctx.hand || (ev.ctx.both ? 'both' : 'main')));
P('how', 'words', 'the move is of one of these kinds (move, sprint, disengage; push, pull, throw, teleport); a reaction: its kind (attack, move, protect); a heal or shield: its kind (tending, prayer, perk, stim…)', (ev, v) => list(v).includes(ev.ctx.kind ?? ev.ctx.how));
P('ap_above', 'number', 'the event\'s AP (a price, a swap) is over this', (ev, v) => (ev.ctx.ap ?? 0) > v);
P('own_turn', 'bool', 'it is (or is not) the holder\'s own turn', (ev, v) => (ev.cb.order[ev.cb.turn] === ev.self.id && !ev.cb.window) === v);
P('flag', 'string', 'the item\'s flag is set (the mark op sets it)', (ev, v) => !!flags(ev)[v]);
P('no_flag', 'string', 'the item\'s flag is not set', (ev, v) => !flags(ev)[v]);
P('self_alive', 'bool', 'the holder is (or is not) up: not Downed, dead or surrendered', (ev, v) => (!ev.self.dead && !ev.self.downed && !ev.self.surrendered) === v);
// P6's two (rev4-primitives.md: a door verb's reach and its effects): the actor or the target is (or is not) up
for (const who of ['actor', 'target'] as Who[]) P(who + '_alive', 'bool', 'the ' + who + ' is (or is not) up: not Downed, dead or surrendered', (ev, v) => { const u = unitOf(ev, who); return !!u && (!u.dead && !u.downed && !u.surrendered) === v; });
P('open', 'bool', 'nothing has stopped it yet: not cancelled, and (would_drop) not floored', (ev, v) => (!ev.ctx.cancel && ev.ctx.floor == null) === v);
P('amount_above', 'number', 'the event\'s amount (damage, a heal) is over this', (ev, v) => (ev.ctx.dmg ?? ev.ctx.n ?? 0) > v);
P('amount_share_below', 'number', 'the event\'s amount is under this share of the holder\'s max HP', (ev, v) => (ev.ctx.dmg ?? ev.ctx.n ?? 0) / ev.self.maxHp < v);
// Classes 3.0 step 1 (the batch rows of docs/design/rev4-primitives.md)
P('by_cover', 'words', 'the move started (from) and / or ended (to) next to standing cover, or (here) the holder stands next to it now: every word named must hold', (ev, v) => list(v).every((w) => { const k = w === 'from' ? ev.ctx.from : w === 'to' ? ev.ctx.to : w === 'here' ? ev.self.pos : null; return !!k && nextToCover(ev.cb, k); }), ['from', 'to', 'here']);
// Classes 3.0 P10: zones from data. {kind, owner: self (the holder's own), side (its side's) or any}
const zoneArg = (v: any) => (typeof v === 'string' ? { kind: v, owner: 'any' } : { kind: v?.kind, owner: v?.owner || 'any' });
for (const who of ['self', 'target'] as Who[]) P(who + '_in_zone', 'zone', who + ' stands in a zone of this kind (a kind, or {kind, owner: self, side or any})', (ev, v) => { const u = unitOf(ev, who), a = zoneArg(v); return !!u && zonesAt(ev.cb, u.pos, a.kind, a.owner, ev.self).length > 0; }, () => [...DATA_ZONE_KINDS]);
// Classes 3.0 P8: ties. `<who>_tied: "<kind>"` (tied to the holder either way) or {kind, as: from or to} (the unit is
// the tie's from end, the holder its to end: an owned unit's owner is `actor_tied: {kind: "owned", as: "from"}`)
const tieArg = (v: any): { kind: string; as: 'from' | 'to' | 'any' } => (typeof v === 'string' ? { kind: v, as: 'any' } : { kind: v?.kind, as: v?.as || 'any' });
for (const who of ['actor', 'target'] as Who[]) P(who + '_tied', 'tie', who + ' is tied to the holder by this kind (a kind, or {kind, as: from or to}: the unit\'s end of it)', (ev, v) => { const u = unitOf(ev, who), a = tieArg(v); return !!u && tiedTo(ev.cb, ev.self, u, a.kind, a.as); }, () => tieKinds().map((k) => k.id));
// Classes 3.0 section 6: what the holder holds. {slot: hand | person, door: evoker | emanator} or {slot, item: <id>}
// (character.ts holds: the one "focus in hand" test, which hasEvoker and hasEmanator are)
const holdsOf = (ev: Ev, v: any): boolean => { const c = ev.h.c || charOfUnit(ev.self); return !!c && holds(c, v || {}); };
P('self_holds', 'hold', 'the holder has it: {slot: hand or person, door: a focus kind (evoker, emanator, attuner, visualizer) or the skill it opens (brain_power, will_power, empathy, visualization)} (a focus) or {slot, item: an item id}', (ev, v) => holdsOf(ev, v), () => FOCUS_DOORS);
P('self_lacks_gear', 'hold', 'the holder does not have it (as self_holds)', (ev, v) => !holdsOf(ev, v), () => FOCUS_DOORS);
// Rules 1.43 (survival-spec 4.2 item 11): a named property on a gear instance (GearState.prop) works only while that
// instance is in a hand and only for what is made with it. The event's means: a door's (a Sigil's or an Outburst's roll
// or damage, a save forced through a door skill, a heal or shield of a door's kind) is the hand's focus of that door; a
// weapon's (an attack, its roll, hit or damage, a reload) is the hand that made it (the off hand while it strikes), with
// that hand's weapon (not fists, not a thrown thing); anything else (a swap, a price) needs only the instance in a hand.
const DOOR_OF_TYPE: Record<string, string> = { sigil: 'brain_power', soul: 'will_power' };
const HEAL_DOOR: Record<string, string> = { tending: 'empathy', bond: 'empathy', sigil: 'brain_power', soul: 'will_power' };
const WEAPON_HOOKS = new Set(['attack_preview', 'attack_roll', 'on_hit', 'on_miss', 'reload']);
function madeWith(ev: Ev): boolean {
  const c = ev.h.c || charOfUnit(ev.self); if (!c) return false;
  const hands = handProps(c).filter((p) => p.prop === ev.h.itemId).map((p) => p.hand); if (!hands.length) return false;
  const ctx = ev.ctx || {}, src = ctx.src, hook = ev.trig.hook;
  const type = ctx.type ?? src?.type, heal = hook === 'heal_in' || hook === 'shield_grant';
  const door = ctx.via && kindOfDoor(String(ctx.via)) ? String(ctx.via) : DOOR_OF_TYPE[type] || (heal ? HEAL_DOOR[ctx.kind] : null);
  if (door) { const k = kindOfDoor(door)!; return hands.some((h) => { const g = gearAt(c, h); return !!g && FOCUS_IDS[k].includes(g.id); }); }
  if (heal) return false;
  if (type === 'weapon' || WEAPON_HOOKS.has(hook) || ctx.mode) {
    if ((ctx.mode ?? src?.mode) === 'thrown') return false;
    const hand = ctx.hand === 'off' || ev.self.swapMain ? 'off' : 'main', g = gearAt(c, hand);
    return hands.includes(hand) && !!g && (src?.weapon ?? g.id) === g.id;
  }
  return true;
}
P('with_this', 'bool', 'the event is (or is not) made with the gear instance that carries this item as its named property (rules 1.43: a Relic\'s property): the instance in a hand, and a weapon\'s event made with that hand\'s weapon, a door\'s event (Sigil, Outburst, a save forced through a door skill, a heal or shield of its kind) with that door\'s focus', (ev, v) => madeWith(ev) === v);
// Rules 1.33 (Tending, Bonds and the Mender): a door's ladder, the holder's ties, the action's pick
/** The holder's points in a skill (a character's sheet; a unit with none has 0). */
const skillPts = (ev: Ev, sk: string): number => Number(((ev.h.c || charOfUnit(ev.self)) as any)?.skills?.[sk] || 0);
P('self_skill', 'skill', 'the holder has at least these points in each skill named ({empathy: 7}: a door\'s ladder)', (ev, v) => Object.entries(v || {}).every(([k, n]) => skillPts(ev, k) >= Number(n)));
P('self_skill_below', 'skill', 'the holder has fewer than these points in each skill named (as self_skill)', (ev, v) => Object.entries(v || {}).every(([k, n]) => skillPts(ev, k) < Number(n)));
P('self_tied', 'tie', 'the holder holds a tie of this kind (a kind, or {kind, side: foe, ally or any}: its far end of that side to the holder)', (ev, v) => {
  const a = typeof v === 'string' ? { kind: v, side: 'any' } : { kind: v?.kind, side: v?.side || 'any' };
  return tiesOfK(ev.cb, ev.self, a.kind, 'from').some((t) => { const o = ev.cb.units.find((x) => x.id === t.to); return !!o && (a.side === 'any' || rel(ev.self, o, a.side)); });
}, () => tieKinds().map((k) => k.id));
P('choice', 'words', 'the action\'s pick (its `pick` list: a felt feeling, a word…) is one of these', (ev, v) => ev.ctx.choice != null && list(v).includes(String(ev.ctx.choice)));
P('self_tie_room', 'tie', 'the holder may hold one more tie of this kind (under its cap: kit.ts tieCap)', (ev, v) => { const k = typeof v === 'string' ? v : v?.kind; return tiesOfK(ev.cb, ev.self, k, 'from').length < tieCap(ev.cb, ev.self, k); }, () => tieKinds().map((k) => k.id));
for (const who of ['actor', 'target'] as Who[]) P(who + '_not_tied', 'tie', who + ' is not tied to the holder by this kind (as ' + who + '_tied)', (ev, v) => { const u = unitOf(ev, who), a = tieArg(v); return !!u && !tiedTo(ev.cb, ev.self, u, a.kind, a.as); }, () => tieKinds().map((k) => k.id));
P('uses_left', 'limit', 'the holder\'s item has a use left in this limit ({per, n?, key?, each?: target}; read, never taken: the action is refused before it is paid, as "once an ally a turn")', (ev, v) => limitOk(ev, v, false));
// Classes 3.0 P12: a data toggle is on for the action being resolved (cb.mods; acted's ctx.toggles): `toggle: [ids]`
P('toggle', 'words', 'one of the holder\'s item\'s data toggles (its ids) is on for the action being resolved', (ev, v) => {
  const mods: string[] = ev.ctx.toggles?.length ? ev.ctx.toggles : (ev.cb as any).mods || [], defs = (rawItemT(ev.h.key)?.toggles || []) as any[];
  return list(v).some((id) => { const t = defs.find((x) => x.id === id); const k = ev.h.key + '#' + id; return mods.includes(k) || mods.includes(id) || (!!t?.default_on && !mods.includes('!' + k) && !mods.includes('!' + id)); });
});
// Classes 3.0 step 3 (rules 1.30): Run and Gun's 2-tile cap (reactions-spec.md 10), the Breaker's Momentum-priced rider
/** The free techniques (techniques.json `free`: everyone's, whatever they have readied: Shot, Aimed Shot, Cut,
 * Overwatch, Pull Out): rules 1.30, Fire Discipline's dear technique is any other. */
const FREE_TECH: string[] = ((techniquesJ as any).items || []).filter((t: any) => t.free).map((t: any) => t.id);
P('free_tech', 'bool', 'the attack is (true) or is not (false) made with a free technique, everyone\'s (techniques.json free: Shot, Aimed Shot, Cut, Overwatch), or with no technique a lone shot, aimed shot, blow or throw (a roll of a volley is not: a Burst, full auto, a weapon skill, both hands)', (ev, v) => (ev.ctx.tech ? FREE_TECH.includes(ev.ctx.tech) : !ev.ctx.volley && ['shot', 'aimed', 'melee', 'thrown'].includes(ev.ctx.mode)) === v);
P('tech_ap_at_least', 'number', 'the attack\'s own price is at least this many AP: its technique\'s cost with the weapon before any item (ctx.techAp), or with no technique the attack\'s base AP', (ev, v) => typeof ev.ctx.techAp === 'number' && ev.ctx.techAp >= v);
P('path_tiles_at_most', 'number', 'the move (its priced walk: ctx.tiles) is at most this many tiles', (ev, v) => typeof ev.ctx.tiles === 'number' && ev.ctx.tiles <= v);
P('self_has_res', 'words', 'the holder has at least 1 of each of these resources (data/actions.json resources: momentum, guard, MP…)', (ev, v) => list(v).every((id) => resNow(ev, id) >= 1), () => Object.keys(RESOURCES));
P('self_lacks_res', 'words', 'the holder has none of one of these resources (as self_has_res)', (ev, v) => list(v).some((id) => resNow(ev, id) < 1), () => Object.keys(RESOURCES));
P('patron', 'words', 'the holder is Faithful to one of these patrons (patrons.json ids)', (ev, v) => { const id = patronIdOf(ev.h.c || charOfUnit(ev.self)); return !!id && list(v).includes(id); }, PATRON_IDS);
// Classes 3.0 step 5, the Chaplain (rules 1.31): the patron rows' other half, and a prayer that rides an event (Smite)
P('not_patron', 'words', 'the holder is not Faithful to any of these patrons (an Atheist is none of them)', (ev, v) => { const id = patronIdOf(ev.h.c || charOfUnit(ev.self)); return !id || !list(v).includes(id); }, PATRON_IDS);
P('answered', 'bool', 'a prayer of the holder\'s is (or is not) answered now (faith.ts prayerAnswered: the prayer door open, Faith and not Silenced; the Faithful always, an Atheist rolls the Whisper\'s TN; a preview rolls nothing). Put it last in `if`: it rolls', (ev, v) => (ANSWERED ? ANSWERED(ev.cb, ev.preview ? null : rngOf(ev.h, ev.ctx), ev.self, ev.preview) : false) === v);

// Classes 3.0 steps 6 and 7 merged (the lead's ruling on rules 1.33: Share a Hit is an Answer with a switch like every other)
P('answer_on', 'string', 'the holder keeps this item Answer switched on: the character\'s Answer list (phys.answers, set by phys/answers) names it, or it keeps none (every Answer on). Share a Hit (rules 1.33)', (ev, v) => { const o = (charOfUnit(ev.self) as any)?.phys?.answers; return !Array.isArray(o) || o.includes(v); });
// ============================================================================================== amount sources (P3)
const camel = (f: string) => f.replace(/_([a-z])/g, (_m, c) => c.toUpperCase());
/** A unit's field as a number (P3 `self:` / `actor:` / `target:`): max_hp, hp, ap, armour, level… (snake case of the
 * unit's own field), true / false as 1 / 0; a condition id: 1 while it has it. 0 for no unit. */
function unitField(u: Unit | null, f: string): number {
  if (!u) return 0;
  const v = (u as any)[camel(f)] ?? (u as any)[f];
  if (typeof v === 'number') return v; if (typeof v === 'boolean') return v ? 1 : 0;
  return condOn(u, f) ? 1 : 0;
}
/** What a holder has of a resource now: a class resource (guard, momentum…), else a data/actions.json row (MP, Pressure…). */
const resNow = (ev: Ev, id: string): number => (ev.self.resMax?.[id] != null || !RESOURCES[id] ? resOf(ev.self, id) : resLeft(ev.self, id, ev.h.c));
/** THE source reader of a number block's `of` (and an amount block's per-point parts) in an item op: res:<id>,
 * event:<field> (amount: the damage or heal, on `dealing` its base before the multipliers; over: a heal's part that didn't fit; any other field of the payload, else of its damage source ctx.src: ambush, crit; true as 1), self:/actor:/target:<field>.
 * A plain name is 0 here (a handler counts its own). */
export function sourceOf(ev: Ev, of: string): number {
  const i = of.indexOf(':'); if (i < 0) return 0;
  const ns = of.slice(0, i), f = of.slice(i + 1);
  if (ns === 'res') return resNow(ev, f);
  if (ns === 'event') { const v = f === 'amount' ? (ev.ctx.dmg ?? ev.ctx.n ?? ev.ctx.amount ?? ev.ctx.base) : ev.ctx[f] ?? ev.ctx[camel(f)] ?? ev.ctx.src?.[f] ?? ev.ctx.src?.[camel(f)]; return typeof v === 'number' ? v : v ? 1 : 0; }
  if (ns === 'self' || ns === 'actor' || ns === 'target') return unitField(unitOf(ev, ns as Who), f);
  if (ns === 'ties') return tiesOfK(ev.cb, ev.self, f).length; // section 6: how many ties of a kind the holder has
  if (ns === 'skill') return skillPts(ev, f); // rules 1.33: the holder's points in a skill (Share a Hit's 5% a point of Camaraderie)
  return 0;
}
/** The namespaces a number block's `of` may name in an item op. */
export const SOURCE_SPACES = ['res', 'event', 'self', 'actor', 'target', 'ties', 'skill'];
/** The numeric fields of an item op that may be number blocks. */
const NUM_FIELDS = ['value', 'value_pct', 'max', 'add', 'set', 'min', 'at_least', 'tiles', 'rounds', 'pool', 'within', 'holders', 'share', 'count'];
/** Rules 1.33: `{choice}` in a word field (a condition's id, a limit's key) is the action's pick (a felt feeling). */
const withChoice = (s: string, ev: Ev): string => (s.includes('{choice}') ? s.replace(/\{choice\}/g, String(ev.ctx.choice ?? '')) : s);
/** An op with its number blocks read for this event (a plain op is itself). */
function withNumbers(ev: Ev, x: any): any {
  let out = x;
  for (const f of NUM_FIELDS) if (isNumberBlock(x[f])) { if (out === x) out = { ...x }; out[f] = numberOf(x[f], (of) => sourceOf(ev, of)); }
  return out;
}

/** A `say` line's words: {self} {actor} {target} (names), {source} (who gave a condition: P4), {gain} (what the last resource op really gave), {res:<id>}
 * and {resmax:<id>} (the holder's resource now, and its most). Numbers from the data go in as {=.field} placeholders. */
function fill(s: string, ev: Ev): string {
  return s.replace(/\{(self|actor|target)\}/g, (_m, w) => unitOf(ev, w as Who)?.name || '').replace(/\{source\}/g, () => ev.h.source?.name || '')
  .replace(/\{patron\}/g, () => PATRON_NAME[patronIdOf(ev.h.c || charOfUnit(ev.self)) || ''] || 'the patron') // rules 1.31: the holder's patron (Smite's line)
  .replace(/\{gain\}/g, () => String((ev as any).gain ?? 0)).replace(/\{res:([a-z_]+)\}/g, (_m, id) => String(ev.self.res?.[id] ?? 0)).replace(/\{resmax:([a-z_]+)\}/g, (_m, id) => String(ev.self.resMax?.[id] ?? 0));
}

// ============================================================================================== the ops
/** The closed list of ops a triggered effect may run, with the triggers each one understands. */
export interface TriggerOp { on: string[]; state: boolean; about: string; fields: string[]; run: (ev: Ev, e: any, label: string) => string | void | false }
/** THE OPS: filled by O(...) below, one line each (data/effect_ops.json item_ops.ops is written from it). */
export const OPS: Record<string, TriggerOp> = {};
const O = (name: string, on: string[], state: boolean, fields: string[], about: string, run: TriggerOp['run']) => { OPS[name] = { on, state, fields, about, run }; };
const ANY = Object.keys(TRIGGERS);
const pick = (ev: Ev, e: any): Unit | null => (e.target === 'actor' ? ev.actor : e.target === 'target' ? ev.target : ev.self);
/** Who an op acts as: the holder, or (rules 1.33, `by: "source"` on a condition row's op) whoever gave the row. */
const giverOfOp = (ev: Ev, e: any): Unit => (e.by === 'source' && ev.h.source && !ev.h.source.dead ? ev.h.source : ev.self);

O('damage_mult', ['dealing', 'taking'], false, ['value', 'round', 'pool', 'replaces'], 'multiply the amount being dealt or taken (taking: round "up" rounds it up; pool: the holder\'s zone of that kind the target stands in gives what is prevented, and ends when spent; replaces: on dealing, the named term of the attack (its label: ambush) is taken out and this one stands in its place, so the two never multiply: Shadow\'s Break, rules 1.32)', (ev, e, label) => {
  if (ev.trig.hook === 'damage_out') { if (typeof e.replaces === 'string') for (let i = ev.ctx.mults.length - 1; i >= 0; i--) if (ev.ctx.mults[i].label === e.replaces) ev.ctx.mults.splice(i, 1); ev.ctx.mults.push({ v: e.value, label }); return; }
  const was = ev.ctx.dmg; let now = e.round === 'up' ? Math.ceil(was * e.value) : was * e.value;
  if (typeof e.pool === 'string' && ev.target) { // P10: a zone's pool caps what it prevents
    const z = zonesAt(ev.cb, ev.target.pos, e.pool, 'self', ev.self).find((x) => x.pool != null);
    if (z) { const cut = Math.min(Math.max(0, was - now), z.pool!); now = was - cut; z.pool = z.pool! - cut; if (z.pool <= 0) endZones(ev.cb, (x) => x === z); }
  }
  ev.ctx.dmg = now;
});
O('damage_mod', ['dealing', 'taking'], false, ['value', 'value_pct'], 'add to the amount (value), or change it by a percentage (value_pct)', (ev, e, label) => {
  if (ev.trig.hook === 'damage_out') { if (typeof e.value_pct === 'number') ev.ctx.mults.push({ v: 1 + e.value_pct / 100, label }); else ev.ctx.add += e.value; }
  else if (typeof e.value_pct === 'number') ev.ctx.dmg = ev.ctx.dmg * (1 + e.value_pct / 100); else ev.ctx.dmg += e.value;
});
O('damage_vs', ['dealing'], false, ['value'], 'a bonus against this target (added with the other target bonuses)', (ev, e, label) => { ev.ctx.vs.push({ v: e.value, label }); });
O('roll_mod', ['attack', 'to_hit', 'cond_incoming', 'save', 'spot'], false, ['value', 'roll'], 'a to-hit term on an attack (to_hit: on any roll to hit, weapon, Sigil or Outburst); on a condition or save, the save (roll: "save", the default there) or its TN (roll: "tn"); on a spot roll, its modifier or (roll: "tn") its TN', (ev, e, label) => {
  if (ev.trig.hook === 'attack_preview' || ev.trig.hook === 'to_hit') ev.ctx.terms.push({ v: e.value, label });
  else if (ev.trig.hook === 'spot') { if (e.roll === 'tn') ev.ctx.tn += e.value; else ev.ctx.mod += e.value; }
  else if (e.roll === 'tn') ev.ctx.tnAdd = (ev.ctx.tnAdd || 0) + e.value; else ev.ctx.saveAdd = (ev.ctx.saveAdd || 0) + e.value;
});
O('cost_mod', ['cost', 'swap', 'reload', 'attack', 'glyph_cost'], false, ['value', 'set', 'min', 'at_least', 'res'], 'change the AP (or with res, a resource: charge, flux…) of the action: add value, or set it; min is the floor a cut stops at; at_least raises it to that', (ev, e) => {
  const c = ev.ctx, r = e.res, box = r && ev.trig.hook === 'cost' ? (c.res ||= {}) : c, f = r || 'ap', cur = box[f] ?? 0;
  let n = typeof e.set === 'number' ? e.set : cur + (e.value || 0);
  if (typeof e.min === 'number' && n < cur) n = Math.max(Math.min(cur, e.min), n);
  if (typeof e.at_least === 'number') n = Math.max(e.at_least, n);
  box[f] = Math.max(0, n);
});
O('grant_ap', ['turn_ap', ...ANY.filter((t) => t !== 'turn_ap')], true, ['value', 'bank'], 'AP: at turn_ap, to this turn (a negative value takes); elsewhere perk AP now (bank: true, next turn)', (ev, e, label) => {
  const u = pick(ev, e)!; if (!u) return;
  if (ev.trig.hook === 'turn_start_pre') { (e.value >= 0 ? ev.ctx.grants : ev.ctx.penalties).push({ n: e.value, why: label }); return; }
  if (e.value < 0) { loseAp(u, -e.value); return; }
  if (e.bank) bankAp(u, e.value, label, ev.cb); else grantPerkAp(ev.cb, u, e.value, label);
});
O('resource', ANY, true, ['resource', 'value'], 'give (or take) a class resource (guard, momentum…), Echo, or any resource of data/actions.json `resources` (MP, Pressure…: through effects/cost.ts resGive); value "all" spends and "zero" loses all of it', (ev, e, label) => {
  const u = pick(ev, e); if (!u) return;
  if (e.resource === 'echo') { if (ev.h.c) gainEcho(ev.h.c, e.value, label); return; }
  const own = u.resMax?.[e.resource] != null || !RESOURCES[e.resource];
  // P3: "all" (spend all of it) and "zero" (lose all of it): take what the unit has now
  const n = e.value === 'all' || e.value === 'zero' ? -(own ? resOf(u, e.resource) : resLeft(u, e.resource, ev.h.c)) : e.value;
  (ev as any).gain = own ? resGain(u, e.resource, n) : resGive(ev.cb, u, e.resource, n, { by: ev.self, c: ev.h.c, why: label });
});
/** The value of op `condition` that names the condition being put on (on cond_incoming: Take the Weight's "you take it
 * instead"; rev4-primitives.md batch row `condition: "incoming"`). */
export const INCOMING = 'incoming';
O('condition', ANY, true, ['condition', 'rounds', 'skip_save', 'via', 'by', 'same_entry'], 'put a condition on the self, the actor or the target (target:), with its save unless skip_save; by: "source" (a condition row) puts it on as from whoever gave the row (Afraid of the giver); via: the skill whose strength the save is against (as deal\'s via; default the ambient source); condition "incoming" (on cond_incoming): the condition being put on, with its rounds unless rounds is given; same_entry (hidden only): the same Hidden entry as before, no new ambush (Shadow, rules 1.32)', (ev, e) => {
  const u = pick(ev, e); if (!u) return;
  const inc = e.condition === INCOMING; if (inc && (ev.trig.hook !== 'cond_apply' || !ev.ctx.id)) return false;
  // rules 1.33: `{choice}` in the id is the action's pick ("given_{choice}": Inspire's felt feeling); an id that names no row does nothing
  const tmpl = !inc && typeof e.condition === 'string' && e.condition.includes('{choice}'), id = inc ? ev.ctx.id : tmpl ? withChoice(e.condition, ev) : e.condition, rounds = typeof e.rounds === 'number' ? e.rounds : inc && typeof ev.ctx.rounds === 'number' ? ev.ctx.rounds : undefined;
  if (tmpl && !CONDITION_ROWS.some((r: any) => r.id === id)) return false;
  return applyCond(ev.cb, rngOf(ev.h, ev.ctx), giverOfOp(ev, e), u, id, rounds, undefined, { ...(e.skip_save ? { skipSave: true } : {}), ...(typeof e.via === 'string' ? { via: e.via } : {}), ...(e.same_entry ? { sameEntry: true } : {}) });
});
O('cleanse', ANY, true, ['condition', 'family', 'count', 'newest'], 'end conditions: the ones named, or a family\'s debuffs, or any debuff (count: how many; newest: true, the newest first, else in the order named)', (ev, e) => {
  const u = pick(ev, e); if (!u) return;
  let ids = e.condition ? list(e.condition).map(condId).filter((id) => condHas(u, id)) : debuffsOf(u, e.family || undefined);
  if (e.newest) ids = [...ids].sort((a, b) => (u.condAt?.[b] || 0) - (u.condAt?.[a] || 0)); // rules 1.33 (Soothe): the newest first (condAt: the order they landed in)
  for (const id of ids.slice(0, e.count || ids.length)) endCond(u, id, ev.cb);
});
O('cond_rounds', ['cond_incoming'], false, ['max', 'add'], 'change the rounds of the condition being put on: at most max, or add', (ev, e) => {
  if (typeof e.max === 'number') ev.ctx.rounds = Math.min(ev.ctx.rounds || 1, e.max);
  if (typeof e.add === 'number') ev.ctx.rounds = (ev.ctx.rounds || 1) + e.add;
});
O('skip_save', ['cond_incoming'], false, [], 'the condition being put on gets no save', (ev) => { ev.ctx.skipSave = true; });
O('cancel', ['cond_incoming', 'forced_move', 'injury', 'attack', 'spot'], false, ['why'], 'stop it: the condition, the forced move or the injury does not happen; an attack is refused (why: the reason shown)', (ev, e, label) => {
  if (ev.trig.hook === 'attack_preview') { if (!ev.ctx.fail) ev.ctx.fail = e.why ? fill(e.why, ev) : label; return; }
  ev.ctx.cancel = true; ev.ctx.why = e.why ? fill(e.why, ev) : label;
});
// rev4-primitives.md batch row: the damage_mult of mending. On `heal` (heal_in) and `shield` (shield_grant), before the
// heal or shield is floored and capped; the kind of a heal or shield (tending, prayer, perk…) is read with `how`.
// (Not on heal_given: by then the heal has landed and there is nothing left to multiply.)
O('mend_mult', ['heal', 'shield'], false, ['value'], 'multiply the heal or shield being given (before it is rounded down and capped); its kind is `how` (tending, prayer, perk…)', (ev, e) => {
  const v = typeof e.value === 'number' ? e.value : 1; if (typeof ev.ctx.n === 'number') ev.ctx.n = ev.ctx.n * v;
});
O('floor', ['would_drop'], false, ['value'], 'the blow leaves the unit at this many HP', (ev, e) => { ev.ctx.floor = e.value; });
O('deal', ANY, true, ['amount', 'via', 'nonlethal', 'by'], 'deal an amount block (amounts) to the self, actor or target (by: "source", a condition row: dealt as by whoever gave it); via: the source skill it counts as (a prayer: "faith"), nonlethal: a blow that takes the last HP subdues', (ev, e) => {
  const t = pick(ev, e), b = e.fixed ? fixedBlock(e) : blockOf(ev.h, e); if (!t || !b || b.kind !== 'damage') return;
  const type = b.type || 'true', src: any = { by: giverOfOp(ev, e), type, dmgType: b.element || type, shield: type !== 'true', credit: 'hp', item: ev.h.key, ...(e.nonlethal ? { nonlethal: true } : {}) };
  let sent = 0;
  const from = giverOfOp(ev, e), go = () => { sent = deal(ev.cb, from, t, { ...specOf(b), kind: 'damage', round: 'floor', ...(b.armour ? { armour: b.armour } : {}), hook: !e.fixed && e.by !== 'source' }, { who: from === ev.self ? ev.h.c || null : charOfUnit(from), src, hookCtx: { mode: 'item', src }, counts: countsOf(ev, b) }).sent; };
  if (typeof e.via === 'string') withVia(ev.self, e.via, go); else go();
  return ': ' + sent; // what reached the target, for a `say` with {then}
});
O('mend', ANY, true, ['amount', 'layer', 'holders'], 'heal or shield by an amount block (its heal_kind is the heal\'s kind for heal_in: tending, prayer…; default perk); a shield on a layer (P11: layer, holders: at most that many units carry the holder\'s layer)', (ev, e) => {
  const t = pick(ev, e), b = e.fixed ? fixedBlock(e) : blockOf(ev.h, e); if (!t || !b || b.kind === 'damage') return;
  mend(ev.cb, ev.self, t, { ...specOf(b), kind: b.kind }, { who: ev.h.c || null, healKind: b.heal_kind || 'perk', counts: countsOf(ev, b), ...(typeof e.layer === 'string' ? { layer: e.layer, ...(typeof e.holders === 'number' ? { holders: e.holders } : {}) } : {}) });
});
O('displace', ANY, true, ['tiles', 'how', 'to'], 'push the target away from the holder (how: push) or pull it closer (pull); to: "cover", the unit (the self unless target: is named) steps of its own will onto the nearest free tile next to standing cover within tiles (default its Movement), one out of every enemy\'s view first (Shadow\'s Fade, rules 1.32): no tile, nothing happens; to: "tile" (rules 1.33, Guide) moves it, willing, to the event\'s tile when that is at most `tiles` from it (how: guide); with no target named it is the holder that steps there (Shadow\'s Vault, rules 1.32)', (ev, e) => {
  if (e.to === 'cover') return toCover(ev, pick(ev, e), e);
  const t = pick(ev, e); if (!t) return;
  // to: "tile" moves the target (Guide, rules 1.33) or the holder itself (Shadow's Vault, rules 1.32: the one primitive for both)
  if (e.to === 'tile') { const at: string | null = ev.ctx.tile ?? null; if (!at || at === t.pos || dist(t.pos, at) > (e.tiles ?? 1)) return false; return displace(ev.cb, rngOf(ev.h, ev.ctx), t, { tile: at }, { by: ev.self, how: 'guide', source: ev.h.key, willing: true }).text || ''; }
  if (t === ev.self) return;
  const how = e.how === 'pull' ? 'pull' : 'push', to = how === 'pull' ? { toward: ev.self.pos, tiles: e.tiles } : { away: ev.self.pos, tiles: e.tiles };
  return displace(ev.cb, rngOf(ev.h, ev.ctx), t, to, { by: ev.self, how, source: ev.h.key }).text || '';
});
O('zone', ANY, true, ['kind', 'at', 'within', 'rounds', 'pool', 'clear'], 'lay a zone the holder owns (P10): kind (a data zone kind: magic.ts DATA_ZONE_KINDS), at (self, target or tile: the event\'s), within (its radius: a square), rounds, pool (what it has to give); clear: true ends the holder\'s zones of that kind (nothing said when it had none)', (ev, e) => {
  if (e.clear) return endZones(ev.cb, (z) => z.kind === e.kind && z.by === ev.self.id) > 0 ? undefined : false;
  const at: string | null = e.at === 'tile' ? ev.ctx.tile ?? ev.ctx.at ?? null : (e.at === 'target' ? ev.target : ev.self)?.pos ?? null; if (!at) return false;
  // pool: a number, or (Classes 3.0 step 5, rules 1.31: Sanctuary's cap) the name of the item's amount block, worked out now
  const pb = typeof e.pool === 'string' ? blockOf(ev.h, { amount: e.pool }) : null;
  const pool = typeof e.pool === 'number' ? e.pool : pb ? amountOf({ ...specOf(pb), round: 'round' }, ev.self, { who: ev.h.c || null, counts: countsOf(ev, pb) }).amount : null;
  makeZone(ev.cb, ev.self, { kind: e.kind, tiles: tilesAround(at, e.within ?? 0), rounds: typeof e.rounds === 'number' ? e.rounds : 1, ...(pool != null ? { pool } : {}) });
});
O('tie', ANY, true, ['kind', 'clear'], 'tie the holder to the target by a kind (P8: kit.ts tie; refused at the holder\'s cap: nothing said); clear: "target" ends the holder\'s ties of that kind to the target, "all" every one of that kind it holds', (ev, e) => {
  const t = pick(ev, e);
  if (e.clear === 'all') return untie(ev.cb, (x) => x.kind === e.kind && x.from === ev.self.id) > 0 ? undefined : false;
  if (e.clear === 'target') return t && untie(ev.cb, (x) => x.kind === e.kind && x.from === ev.self.id && x.to === t.id) > 0 ? undefined : false;
  return t && tie(ev.cb, ev.self, t, e.kind) ? undefined : false;
});
O('spawn', ANY, true, ['block', 'at'], 'make an owned unit (P9: owned.ts spawnOwned) from a data block (enemies.json companions, a system\'s forms) at the holder\'s level, on the free tile nearest the holder (at: self), the target or the event\'s tile; tied to the holder (owned); refused at its cap (ties_max:owned): nothing said', (ev, e) => {
  const anchor: string | null = e.at === 'tile' ? ev.ctx.tile ?? ev.ctx.at ?? null : (e.at === 'target' ? ev.target : ev.self)?.pos ?? null; if (!anchor) return false;
  const free = [anchor, ...[1, 2, 3].flatMap((r) => tilesAround(anchor, r, ev.cb))].find((k) => canStand(ev.cb, k)); if (!free) return false;
  const u = spawnOwned(ev.cb, ev.self, e.block, free, rngOf(ev.h, ev.ctx) as any);
  return typeof u === 'string' ? false : ' · ' + u.name + ' appears';
});
O('unmake', ANY, true, ['refund'], 'unmake an owned unit (P9: owned.ts unmakeOwned; the target, else the holder): it leaves the fight; refund: what its making took goes back to its owner', (ev, e) => {
  const u = e.target === 'target' ? ev.target : e.target === 'actor' ? ev.actor : ev.self; if (!u || !ownerOf(ev.cb, u)) return false;
  unmakeOwned(ev.cb, u, { refund: !!e.refund });
});
O('redirect', ['taking'], true, ['share', 'split', 'type'], 'move a share of the damage being taken to the holder (a protector: Share a Hit), or with `targets` and split: true divide it among the units of that set; what is moved lands as the same blow (it is not redirected again), or with type as damage of that type (a Bond\'s share: soul)', (ev, e) => {
  const c = ev.ctx; if (c.src?.redirected || !(c.dmg > 0)) return false;
  const share = Math.max(0, Math.min(1, typeof e.share === 'number' ? e.share : 0.5)), moved = Math.floor(c.dmg * share); if (moved <= 0) return false;
  const to: Unit[] = e.split && e.targets ? selectUnits(ev, e.targets).filter((u) => u !== c.t) : [ev.self].filter((u) => u !== c.t); if (!to.length) return false;
  c.dmg -= moved; const each = Math.floor(moved / to.length);
  if (ev.preview) return;
  const src = typeof e.type === 'string' ? { ...c.src, type: e.type, dmgType: e.type, melee: false, ranged: false, crit: false } : c.src;
  to.forEach((u, i) => { const n = i === 0 ? moved - each * (to.length - 1) : each; if (n > 0) applyDamage(ev.cb, u, n, { ...src, redirected: true }); });
});
O('use', ANY, true, [], 'nothing but its limit: spends one use (for a limit another effect reads with peek)', () => undefined);
O('mark', ANY, true, ['flag', 'clear'], 'set (or with clear: true, clear) one of the item\'s own flags, for a later trigger\'s flag / no_flag', (ev, e) => {
  const st: any = ((ev.self.ps ||= {}) as any)[ev.h.key] ||= {}; const f = (st.flags ||= {});
  if (e.clear) delete f[e.flag]; else f[e.flag] = true;
});
// Classes 3.0 step 6 (Shadow, rules 1.32): Lift's taking, and Fade's step to cover
O('take', ANY, true, ['save', 'via'], 'take one thing the target carries into the pile on the holder\'s tile: a throwable, else a spare magazine (Shadow\'s Lift); save: the target\'s save family (body, brain, heart) rolled against the holder\'s strength (via: by that skill), and a success keeps it', (ev, e) => {
  const t = pick(ev, e); if (!t || t === ev.self || t.dead) return false;
  if (typeof e.save === 'string') { const sv = saveAgainst(ev.cb, rngOf(ev.h, ev.ctx), ev.self, t, e.save, 'lift', { ...(typeof e.via === 'string' ? { via: e.via } : {}) }); if (sv.ok) return ' · ' + t.name + ' ' + sv.text + ', and keeps hold of it'; }
  const thr = Object.entries(t.throwables || {}).find(([, n]) => (n || 0) > 0);
  let item: PackItem | null = null;
  if (thr) { const [id] = thr; t.throwables![id] -= 1; if (!t.throwables![id]) delete t.throwables![id]; item = { id, name: WEAPON[id]?.name || id, qty: 1, kind: 'weapon', weapon: id }; }
  else if (t.mags?.length) { const n = t.mags.pop()!; item = { ...magsOf(t.weapon, 1), mags: [n] } as PackItem; }
  if (!item) return ' · ' + t.name + ' carries nothing to take';
  dropToPile(ev.cb, ev.self.pos, [item], 'lift');
  return ' · takes ' + (item.kind === 'ammo' ? 'a ' : 'the ') + item.name.toLowerCase() + ' from ' + t.name;
});
/** Fade's step (op displace, to: "cover"): the nearest free tile next to standing cover within reach, out of every
 * enemy's view first; the unit's own tile when it already stands by cover. */
function toCover(ev: Ev, u: Unit | null, e: any): string | false {
  if (!u) return false;
  const r = typeof e.tiles === 'number' ? e.tiles : Math.max(1, Math.floor(u.movement || 1)), foes = ev.cb.units.filter((v) => v.side !== u.side && !v.dead && !v.downed && !v.hidden);
  const seen = (k: string) => foes.some((v) => unitSees(ev.cb, v, k));
  const cands = [u.pos, ...tilesAround(u.pos, r, ev.cb)].filter((k) => (k === u.pos || canStand(ev.cb, k)) && nextToCover(ev.cb, k));
  if (!cands.length) return false;
  cands.sort((a, b) => (seen(a) ? 1 : 0) - (seen(b) ? 1 : 0) || dist(u.pos, a) - dist(u.pos, b));
  const k = cands[0]; if (k === u.pos) return '';
  const r1 = displace(ev.cb, rngOf(ev.h, ev.ctx), u, { tile: k }, { by: u, how: 'teleport', source: ev.h.key, willing: true, fx: { magic: true } });
  return r1.moved ? ' · steps to cover' : '';
}

// Classes 3.0 step 6, integration (rules 1.32: Shadow's Decoy, Pick, Douse, Rig, Close Quarters): three general rows.
O('last_seen', ANY, true, [], 'every other side now places the holder on the event\'s tile (cb.lastSeen: where its searchers go for a Hidden hostile; Shadow\'s Decoy)', (ev) => {
  const k = ev.ctx.tile ?? null; if (!k) return false;
  for (const side of new Set(ev.cb.units.filter((v) => v.side !== ev.self.side && !v.dead).map((v) => v.side))) ((ev.cb.lastSeen ||= {})[side] ||= {})[ev.self.id] = k;
});
O('object', ANY, true, ['do', 'has', 'kind', 'amount'], 'work the object on the event\'s tile that is `has` (a kind id, a kind field or a cover grade: objects.ts objectIs): do "pick" (a door: locked or closed, it opens; open, it closes and locks, not while someone stands in it), "break" (its HP to 0 through the object damage; one with no HP is put out and gone); or do "lay": make an object of `kind` (a trap) there, the holder\'s side\'s, its damage the item\'s amount block `amount`, one at a time (the holder\'s last one from this item goes). Nothing there: nothing happens (Shadow\'s Pick, Douse and Rig, rules 1.32)', (ev, e) => {
  const cb = ev.cb, u = ev.self, k = ev.ctx.tile ?? null; if (!k) return false;
  if (e.do === 'lay') {
    if (objectsAt(cb, k).some((o) => objectIs(o, 'trap') && !o.resolved)) return false;
    const b = typeof e.amount === 'string' ? blockOf(ev.h, { amount: e.amount }) : null;
    const dmg = b ? amountOf({ ...specOf(b), round: 'floor' }, u, { who: ev.h.c || null, counts: countsOf(ev, b) }).amount : undefined;
    cb.objects = objectsOf(cb).filter((o: any) => !(o.laidBy === ev.h.key && o.owner === u.id));
    const id = 'laid' + (cb.glyphSeq = (cb.glyphSeq || 0) + 1);
    cb.objects.push(makeObject(id, e.kind, k, { text: 'Laid by ' + u.name + '.', owner: u.id, side: u.side, laidBy: ev.h.key, hidden: false, ...(dmg != null ? { damage: dmg } : {}) } as any));
    emitFx(cb, 'rig', { unit: u.id, at: k, id, only: u.side });
    return ' · ' + refOf(k) + ' is rigged';
  }
  const o: any = objectsAt(cb, k).find((x) => objectIs(x, e.has)); if (!o) return false;
  const name = o.name.toLowerCase();
  if (e.do === 'pick') { // a locked or closed door opens; an open one closes and locks (not while someone stands in it)
    if (!o.open) { o.locked = false; o.open = true; emitFx(cb, 'door', { unit: u.id, at: k, open: true }); return ' · the ' + name + ' at ' + refOf(k) + ' opens'; }
    if (cb.units.some((x) => !x.dead && x.pos === k)) return false;
    o.open = false; o.locked = true; emitFx(cb, 'door', { unit: u.id, at: k, open: false }); return ' · the ' + name + ' at ' + refOf(k) + ' is shut and locked';
  }
  if (e.do === 'break') { if (o.hp != null) return damageObject(cb, k, o.hp, 0, u); cb.objects = objectsOf(cb).filter((x) => x !== o); emitFx(cb, 'object', { at: k, what: o.kind, broken: true }); return ' · the ' + name + ' at ' + refOf(k) + ' goes out'; }
  return false;
});
O('close_roll', ['spot'], false, ['value'], 'an enemy next to the holder rolls to spot it (value added to its modifier) instead of finding it outright (Shadow\'s Close Quarters, rules 1.32)', (ev, e) => { if (ev.ctx.close) { ev.ctx.outright = false; ev.ctx.mod += e.value || 0; } });

/** A delayed deal's or mend's amount, fixed when it was queued (section 6: `delay`). */
const fixedBlock = (e: any): AmountBlock => ({ kind: e.fixed.kind, base: e.fixed.n, ...(e.fixed.type ? { type: e.fixed.type } : {}), ...(e.fixed.armour ? { armour: e.fixed.armour } : {}), ...(e.fixed.heal_kind ? { heal_kind: e.fixed.heal_kind } : {}) } as AmountBlock);
const blockOf = (h: Holder, e: any): AmountBlock | null => {
  if (e.amount && typeof e.amount === 'object' && typeof e.amount.base === 'number') return e.amount as AmountBlock;
  if (typeof e.amount === 'string') { try { return amountBlock(h.key, e.amount); } catch { return null; } }
  return null;
};
/** P3: an amount block's per-point parts that name a source (res:, event:, self:, target:) are counted from the event. */
const countsOf = (ev: Ev, b: AmountBlock): Record<string, number> => Object.fromEntries((b.per || []).filter((p) => p.of.includes(':')).map((p) => [p.of, sourceOf(ev, p.of)]));
const specOf = (b: AmountBlock): AmountSpec => ({ kind: b.kind, base: b.base, ...(b.per ? { per: b.per } : {}), ...(b.profile ? { profile: b.profile } : {}), ...(b.min_pct != null ? { min_pct: b.min_pct } : {}), ...(b.gate_hp !== undefined ? { gate_hp: b.gate_hp } : {}), round: 'none' });

// ============================================================================================== the unit set (P5)
/** `targets` on any op (Classes 3.0 P5): the op runs once for each unit of the set, as its target, in the fight's order
 * (kit.ts unitsIn). The set: of (the centre: self, actor, target, or tile: the event's tile), side (foe, ally, side,
 * any; to the holder), within (tiles from the centre), shape (burst: the centre's tile too; aura: not it; cone and
 * line: from the centre toward the event's target, or its actor, `within` long), seen (seen, or not, by the holder's
 * side), alive (default true: still in the fight; false: Downed only), downed (true: the Downed too), max (the first n).
 * With no within and no shape, the whole field. `tied` and `aims_at` come with ties (P8) and the enemy's aim (a batch row).
 * `beyond` (rules 1.33, a tie kind): a unit tied to the holder by that kind is in the set wherever it stands (Rally: every
 * Bonded ally, and every ally within 4). */
export interface TargetSet { of?: 'self' | 'actor' | 'target' | 'tile'; side?: 'foe' | 'ally' | 'side' | 'any'; within?: number; shape?: 'burst' | 'aura' | 'cone' | 'line'; seen?: boolean; alive?: boolean; downed?: boolean; max?: number; sees?: 'line' | 'eyes'; tied?: string; aims_at?: string; beyond?: string }
/** The fields of `targets` and the words each takes (data/effect_ops.json item_ops.targets is written from it). */
export const TARGET_FIELDS: Record<string, string[] | 'number' | 'bool' | 'string'> = { of: ['self', 'actor', 'target', 'tile'], side: ['foe', 'ally', 'side', 'any'], within: 'number', shape: ['burst', 'aura', 'cone', 'line'], seen: 'bool', alive: 'bool', downed: 'bool', max: 'number', sees: ['line', 'eyes'], tied: 'string', aims_at: 'string', beyond: 'string' };
/** Why a `targets` block is malformed (null: it is fine). */
export function targetsProblem(t: any): string | null {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return '`targets` is an object';
  for (const [k, v] of Object.entries(t)) {
    const f = TARGET_FIELDS[k]; if (!f) return 'unknown targets field ' + k;
    if (f === 'number' ? typeof v !== 'number' : f === 'bool' ? typeof v !== 'boolean' : f === 'string' ? typeof v !== 'string' : !f.includes(v as string)) return 'targets.' + k + ' takes ' + (Array.isArray(f) ? f.join(', ') : 'a ' + f);
  }
  if ((t.shape === 'cone' || t.shape === 'line') && typeof t.within !== 'number') return 'a cone or a line needs `within` (its length)';
  if ((t.shape === 'burst' || t.shape === 'aura') && typeof t.within !== 'number') return 'a burst or an aura needs `within` (its radius)';
  return null;
}
/** The batch row `aims_at` (rev4): does this unit's next action (combat.ts enemyIntent) go at the holder ("self") or at a
 * unit tied to the holder ("tied:<kind>")? */
function aimsAt(cb: Combat, holder: Unit, v: Unit, w: string): boolean {
  const id = enemyIntent(cb, v).targetId; if (!id) return false;
  if (w === 'self') return id === holder.id;
  const k = w.startsWith('tied:') ? w.slice(5) : null, t = k ? cb.units.find((x) => x.id === id) : null;
  return !!t && tiedTo(cb, holder, t, k!);
}
/** P5's standing aura (a `stat_mod` with `targets` and no `when`): the units its holder's set holds now. */
const auraSet = (cb: Combat, holder: Unit, t: TargetSet): Unit[] => selectUnits({ ctx: {}, trig: TRIGGERS.combat_start, h: { key: '', info: null as any, u: holder, cb } as any, self: holder, cb, actor: null, target: null, preview: true }, t);
/** Why a standing aura is malformed (null: fine): a well-formed set, centred on its holder, of a declared stat. */
export function auraProblem(e: any): string | null {
  const why = targetsProblem(e.targets); if (why) return why;
  if (e.targets.of && e.targets.of !== 'self') return 'a standing aura is centred on its holder (targets.of: self)';
  if (!isStatId(e.stat)) return 'unknown stat ' + e.stat;
  return null;
}
/** THE unit set of an op's `targets` for this event (see TargetSet). */
export function selectUnits(ev: Ev, t: TargetSet): Unit[] {
  const cb = ev.cb, of = t.of || 'self', cu = of === 'actor' ? ev.actor : of === 'target' ? ev.target : of === 'self' ? ev.self : null;
  const at: string | null = of === 'tile' ? ev.ctx.tile ?? ev.ctx.at ?? ev.ctx.to ?? null : cu?.pos ?? null; if (!at) return [];
  const toward = ev.target?.pos !== at ? ev.target?.pos : ev.actor?.pos;
  const shape = t.shape || (t.within != null ? 'burst' : null);
  const area: Area | null = shape === 'burst' || shape === 'aura' ? { shape, at, r: t.within! } : (shape === 'cone' || shape === 'line') && toward && toward !== at ? (shape === 'cone' ? { shape, from: at, toward, n: t.within! } : { shape, from: at, toward, n: t.within }) : null;
  if ((shape === 'cone' || shape === 'line') && !area) return [];
  const downed = t.downed || t.alive === false, near = area ? unitsIn(cb, area, { downed }) : null, wide = !near || t.beyond ? unitsIn(cb, { shape: 'burst', at, r: Math.max(cb.map.w, cb.map.h) }, { downed }) : null;
  const all = !t.beyond ? near || wide! : wide!.filter((v) => (near ? near.includes(v) : true) || tiedTo(cb, ev.self, v, t.beyond!));
  // sees (witnesses, the step 1a review): each unit of the set sees the centre's tile: `line` a line of sight to it and not
  // Blinded (a body falling in the dark is still seen); `eyes` its own eyes reach it (combat.ts unitSees: range, light)
  const out = all.filter((v) => (t.alive === false ? !!v.downed : true) && (!t.side || rel(ev.self, v, t.side)) && (t.seen == null || sideSees(cb, ev.self.side as 'pc' | 'foe', v) === t.seen)
    && (!t.sees || (t.sees === 'eyes' ? unitSees(cb, v, at) : !condOn(v, 'blinded') && lineOfSight(cb, v.pos, at)))
    && (!t.tied || tiedTo(cb, ev.self, v, t.tied)) // P8: tied to the holder by this kind
    && (!t.aims_at || aimsAt(cb, ev.self, v, t.aims_at))); // the batch row: what the unit means to do next is aimed at the holder (self) or at a unit tied to it (tied:<kind>)
  return typeof t.max === 'number' ? out.slice(0, t.max) : out;
}

// ============================================================================================== the limit
/** `limit`: { per: a scope of effects/uses.ts (per_turn, per_round, per_combat, per_scene, per_session, per_rest), n,
 * key? (a second counter on the same item: "<item key>#<key>"), each?: "target" | "actor" (a counter per unit) } or
 * { cooldown: rounds }, or (rules 1.28) { reaction: n, kind: attack | move | protect }: the effect IS a reaction, made
 * through tactics.ts react() (it spends n of the holder's reactions, and none answers what it does). */
export const LIMIT_SCOPES = ['per_turn', 'per_round', 'per_combat', 'per_scene', 'per_session', 'per_rest'];
function limitOk(ev: Ev, lim: any, take: boolean): boolean {
  if (!lim) return true;
  const h = { ...ev.h, u: ev.self, cb: ev.cb }, key = lim.key ? ev.h.key + '#' + withChoice(String(lim.key), ev) : undefined; // rules 1.33: a key may name the pick ({choice})
  const who = lim.each === 'target' ? ev.target : lim.each === 'actor' ? ev.actor : null;
  const U = who ? uses(h).on(who) : uses(h);
  if (lim.peek) take = false; // read only: another effect (op use) spends it
  if (typeof lim.cooldown === 'number') return take ? U.cool(lim.cooldown, key) : U.ready(lim.cooldown, key);
  return take ? U.take(lim.per, lim.n ?? 1, key) : U.left(lim.per, lim.n ?? 1, key) > 0;
}

// ============================================================================================== the runner
/** Is this effect a triggered one (its `when` names a trigger)? */
export const isTriggered = (e: any): boolean => !!e && typeof e.when === 'string' && !!TRIGGERS[e.when];
/** Why a triggered effect can't run (null: it can): the op is unknown or doesn't take this trigger, a predicate is
 * unknown, the limit is malformed. tools/validate.py says the same in Python. */
export function triggerProblem(e: any): string | null {
  const t = TRIGGERS[e.when]; if (!t) return 'unknown trigger ' + e.when;
  for (const x of [e, ...(Array.isArray(e.and) ? e.and : [])]) {
    const op = OPS[x.op]; if (!op) return 'op ' + x.op + ' does not run on a trigger';
    if (!op.on.includes(e.when)) return 'op ' + x.op + ' does not run on ' + e.when;
  }
  if (e.if != null) { if (typeof e.if !== 'object' || Array.isArray(e.if)) return '`if` must be an object'; for (const k of Object.keys(e.if)) if (!PREDICATES[k]) return 'unknown predicate ' + k; }
  for (const x of [e, ...(Array.isArray(e.and) ? e.and : [])]) if (x.targets != null) { const why = targetsProblem(x.targets); if (why) return why; }
  for (const x of [e, ...(Array.isArray(e.and) ? e.and : [])]) if (x.delay != null && (typeof x.delay !== 'object' || !(DELAY_UNTIL as readonly string[]).includes(x.delay.until))) return 'delay is {until: ' + DELAY_UNTIL.join(' | ') + ', n?}';
  if (e.limit != null) { const l = e.limit; if (typeof l !== 'object' || (typeof l.cooldown !== 'number' && !LIMIT_SCOPES.includes(l.per) && typeof l.reaction !== 'number')) return 'limit must be { per, n }, { cooldown } or { reaction, kind }'; if (typeof l.reaction === 'number' && !REACT_KINDS.includes(l.kind)) return 'a reaction limit names its kind (' + REACT_KINDS.join(', ') + ')'; }
  return null;
}
/** Run one triggered effect on its hook's payload, for one holder. */
export function runTriggered(ctx: any, h: Holder, e: any): void {
  const trig = TRIGGERS[e.when], cb = h.cb, self = h.u;
  if (!trig || !cb || !self || overworld(cb)) return; // combat only (the area map and the story are the handlers' still)
  if (trig.phase && ctx.phase !== trig.phase) return;
  const ev: Ev = { ctx, trig, h, self, cb, actor: trig.actor?.(ctx) || null, target: trig.target?.(ctx) || null, preview: !!ctx.preview };
  const cond = e.if || {};
  if (trig.self && cond[trig.self] == null && unitOf(ev, trig.self) !== self) return; // whose event: the trigger's own role is the holder unless `if` names it
  for (const k of Object.keys(cond)) if (!PREDICATES[k]?.test(ev, cond[k])) return;
  const all = [e, ...(Array.isArray(e.and) ? e.and : [])], changes = all.some((x) => OPS[x.op]?.state);
  if (ev.preview && changes) return; // a preview changes nothing
  const lim = e.limit, asReaction = !!lim && typeof lim.reaction === 'number';
  if (asReaction ? !canReact(cb, self, lim.kind, lim.of === 'owner' ? 0 : lim.reaction) : !limitOk(ev, lim, !ev.preview)) return;
  const label = e.label || h.info.name, parts: string[] = [];
  let ran = 0;
  const one = (ev1: Ev, x0: any) => { const x = withNumbers(ev1, x0), r = OPS[x.op].run(ev1, x, x.label || label); if (r !== false) ran++; if (typeof r === 'string' && r) parts.push(r); }; // an op that returns false did nothing (a zone cleared that wasn't there)
  // P5: an op with `targets` runs once for each unit of its set, that unit as its target
  // section 6: an op with `delay` is queued (its numbers and amount fixed now) and run then (runDelayed)
  const run1 = (ev1: Ev, x0: any) => { if (x0.delay) { queueDelayed(ev1, x0, x0.label || label); ran++; } else one(ev1, x0); };
  const go = () => { for (const x0 of all) { if (x0.targets && !(x0.op === 'redirect' && x0.split)) { for (const t of selectUnits(ev, x0.targets)) run1({ ...ev, target: t }, { ...x0, target: 'target' }); } else run1(ev, x0); } };
  // the batch row limit.of "owner": an owned unit's reaction is its owner's (P1's payer, P9's record)
  if (asReaction && !ev.preview) { const payer = lim.of === 'owner' ? ownerOf(cb, self) : null; if (lim.of === 'owner' && !payer) return; if (!react(cb, self, { kind: lim.kind, spend: lim.reaction, event: attackEvent(), ...(payer ? { payer } : {}) }, go)) return; } else go();
  if (ev.preview || !ran) return; // a set with nobody in it: nothing happened, nothing is said
  if (e.fx && typeof e.fx === 'object') { const { k, ...rest } = e.fx; emitFx(cb, k, { target: self.id, at: self.pos, ...rest }); }
  if (e.say) say(cb, fill(e.say, ev).replace('{then}', parts.join('')));
}
// ============================================================================================== delay (section 6)
/** When a delayed op runs: at the start of the target's next turn, of the holder's next turn, or after n rounds. */
export const DELAY_UNTIL = ['target_turn_start', 'holder_turn_start', 'rounds'] as const;
/** A queued op (cb.delayed; saved with the fight). Its numbers are fixed (a deal's or a mend's amount too). */
export interface Delayed { key: string; holder: string; actor: string | null; target: string | null; op: any; label: string; until: (typeof DELAY_UNTIL)[number]; n: number; round: number }
/** The item keys whose delayed ops are running now: what they do queues nothing more of the same item (an echo never
 * echoes itself: a delayed heal's own heal_given would queue the next one, turn after turn). */
const DELAYED_NOW: string[] = [];
function queueDelayed(ev: Ev, x0: any, label: string): void {
  if (DELAYED_NOW.includes(ev.h.key)) return;
  // a copy: withNumbers hands back the item's own object when it has no number block, and the fields below are deleted
  const x: any = { ...withNumbers(ev, x0) }, d = x0.delay || {};
  if ((x.op === 'deal' || x.op === 'mend') && !x.fixed) { const b = blockOf(ev.h, x); if (b) { const r = amountOf({ ...specOf(b), kind: b.kind }, ev.self, { who: ev.h.c || null, counts: countsOf(ev, b) }); x.fixed = { kind: b.kind, n: r.raw, ...(b.type ? { type: b.type } : {}), ...(b.armour ? { armour: b.armour } : {}), ...(b.heal_kind ? { heal_kind: b.heal_kind } : {}) }; } }
  delete x.delay; delete x.targets; delete x.when; delete x.if; delete x.limit; delete x.and;
  const q: Delayed = { key: ev.h.key, holder: ev.self.id, actor: ev.actor?.id || null, target: ev.target?.id || null, op: x, label, until: d.until, n: typeof d.n === 'number' ? d.n : 1, round: ev.cb.round };
  ev.cb.delayed = [...(ev.cb.delayed || []), q];
}
/** Run the queued ops that are due (a turn's start, a round's): a queued op whose holder or target is dead is dropped. */
function runDelayed(cb: Combat, due: (d: Delayed) => boolean): void {
  const now = (cb.delayed || []).filter(due); if (!now.length) return;
  cb.delayed = (cb.delayed || []).filter((d) => !now.includes(d)); if (!cb.delayed.length) delete cb.delayed;
  const byId = (id: string | null) => (id ? cb.units.find((x) => x.id === id) || null : null);
  for (const d of now) {
    const self = byId(d.holder), target = byId(d.target), actor = byId(d.actor), op = OPS[d.op.op];
    if (!self || self.dead || (d.target && (!target || target.dead)) || !op) continue;
    const info = itemInfoT(d.key) || { key: d.key, kind: 'perk', id: d.key, name: d.label, tier: 'I', effects: [], effTier: [], text: '', adjudication: 'engine', active: false, bound: false, ap: null, uses: 'at_will' } as ItemInfo;
    const h: Holder = { key: d.key, itemId: info.id, kind: info.kind, tier: info.tier, info, c: charOfUnit(self), u: self, cb, g: null } as any;
    const ev: Ev = { ctx: { cb }, trig: TRIGGERS.acted, h, self, cb, actor, target, preview: false };
    DELAYED_NOW.push(d.key); let r: any;
    try { r = op.run(ev, d.op, d.label); } finally { DELAYED_NOW.splice(DELAYED_NOW.lastIndexOf(d.key), 1); }
    if (typeof r === 'string' && r) say(cb, self.name + ' (' + d.label + ')' + r + '.');
  }
}
/** Drop the queued ops whose holder or target is dead or gone (a dead unit has no turn start to run them at). */
function dropDeadDelayed(cb: Combat): void {
  if (!cb.delayed?.length) return;
  const alive = (id: string | null) => !id || cb.units.some((x) => x.id === id && !x.dead);
  cb.delayed = cb.delayed.filter((d) => alive(d.holder) && alive(d.target)); if (!cb.delayed.length) delete cb.delayed;
}
onHook('turn_start', (ctx: any, cb: Combat) => { dropDeadDelayed(cb); const u: Unit = ctx.u; if (u && cb.delayed?.length) runDelayed(cb, (d) => (d.until === 'target_turn_start' && d.target === u.id) || (d.until === 'holder_turn_start' && d.holder === u.id)); });
onHook('round_start', (_ctx: any, cb: Combat) => { if (cb.delayed?.length) runDelayed(cb, (d) => d.until === 'rounds' && cb.round >= d.round + d.n); });

// ============================================================================================== door verbs (P6)
/** The first predicate of an `if` block that fails for this holder and target (the action's), outside a trigger (a
 * door verb's `if` and its `reach.if`), or null. Unknown keys fail. */
function ifFailsImpl(h: Holder, cond: any, target?: Unit | null): string | null {
  const self = h.u!, ev: Ev = { ctx: { u: self, t: target || null }, trig: TRIGGERS.acted, h, self, cb: h.cb!, actor: self, target: target || null, preview: true };
  for (const k of Object.keys(cond || {})) if (!PREDICATES[k]?.test(ev, cond[k])) return k;
  return null;
}
/** Run item ops as an action's own effects: each as a triggered effect on `acted` (its `if`, `limit`, `targets`, `say`). */
function runOwnImpl(h: Holder, effects: any[], ctx: any): void { for (const e of effects) if (e && OPS[e.op]) runTriggered({ ...ctx, cb: h.cb }, h, { ...e, when: 'acted' }); }

/** The hooks any data effect listens on (hooks.ts hookUsed asks, so a hook that is skipped when nobody listens, the
 * `cost` hook, still fires for a data item). */
export const triggerHook = (e: any): HookName | null => (isTriggered(e) ? TRIGGERS[e.when].hook : null);

// ============================================================================================== conditions are items (P4)
// A data/conditions.json row is an item its bearer holds (Classes 3.0 P4): its effects with a trigger `when` (and an op
// of the closed list) run through runTriggered with the bearer as the holder and the giver as `source` ({source} in a
// say); its `stat_mod` of a declared stat answers statQuery. condtable.ts modsOf keeps reading the stats it always read
// (defense, move_mult, vision, ap, damage_dealt_pct, sigil_ap, soul_cost_pct, save_<family>): those are not answered
// twice. A row's effect with a trigger word and an op that is not an item op (Bleeding's turn_start stat_mod) is still
// the engine's own rule, not run here.
/** A condition row as the item it is (key condition:<id>). */
const condInfo = (row: any): ItemInfo => ({ key: 'condition:' + row.id, kind: 'condition', id: row.id, name: row.name, tier: 'I', effects: row.effects || [], effTier: (row.effects || []).map(() => 'I'), text: row.text || '', adjudication: row.adjudication || 'engine', active: false, bound: false, ap: null, uses: 'at_will' });
/** The index over the rows (rebuilt when rows are added: condtable.ts condRowsVersion): per hook, the rows with a
 * runnable item op on it and each such effect; per stat, the rows whose plain stat_mod answers it. */
let CIDX: { v: number; on: Record<string, { row: any; info: ItemInfo; e: any }[]>; stat: Record<string, { row: any; value: number }[]> } | null = null;
function condIndex() {
  if (CIDX && CIDX.v === condRowsVersion) return CIDX;
  const on: Record<string, { row: any; info: ItemInfo; e: any }[]> = {}, stat: Record<string, { row: any; value: number }[]> = {};
  for (const row of CONDITION_ROWS) {
    const info = condInfo(row);
    for (const e of (row.effects || []) as any[]) {
      if (isTriggered(e) && !triggerProblem(e)) (on[TRIGGERS[e.when].hook] ||= []).push({ row, info, e });
      else if (e?.op === 'stat_mod' && !e.when && typeof e.value === 'number' && isStatId(e.stat) && !COND_TABLE_STATS.has(e.stat)) (stat[e.stat] ||= []).push({ row, value: e.value });
    }
  }
  return (CIDX = { v: condRowsVersion, on, stat });
}
/** Does the unit bear this condition (a table condition or a flag one)? */
const bears = (u: Unit, id: string) => condOn(u, id);
/** The unit that gave a unit this condition (u.condBy), or null. */
const giverOf = (cb: Combat, u: Unit, id: string): Unit | null => { const by = (u as any).condBy?.[condId(id)]; return by ? cb.units.find((x) => x.id === by) || null : null; };
function condsOn(u: Unit, name: HookName, cb: Combat) {
  const list = condIndex().on[name]; if (!list) return null;
  const out = list.filter((x) => bears(u, x.row.id)).map((x) => ({ info: x.info, e: x.e, source: giverOf(cb, u, x.row.id) }));
  return out.length ? out : null;
}
function condStat(u: Unit, stat: string): number { const l = condIndex().stat[stat]; if (!l) return 0; let n = 0; for (const x of l) if (bears(u, x.row.id)) n += x.value; return n; }

setTriggerRunner({ isTriggered, problem: triggerProblem, hookOf: triggerHook, run: runTriggered, conds: condsOn, condHooks: () => Object.keys(condIndex().on), condStat, auraSet, auraProblem, ifFails: ifFailsImpl, runOwn: runOwnImpl, isOp: (op) => !!OPS[op], condStatRows: (s) => (condIndex().stat[s] || []).map((x) => x.row.id) });
setAllItems(allItems);
