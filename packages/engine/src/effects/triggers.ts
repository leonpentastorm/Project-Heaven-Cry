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
import { setTriggerRunner, setAllItems } from './hooks';
import { allItems } from './collect';
import { overworld, rngOf, unitsIn, type Area } from '../kit';
import { say, dist, displace, emitFx, unitSees, sideSees, attackEvent } from '../combat';
import { applyCond, endCond, condOn, condId, debuffsOf, withVia } from '../magic';
import { nextToCover } from '../combat';
import { CONDITION_ROWS, condRowsVersion } from '../condtable';
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
import { deal, mend, type AmountSpec } from './output';
import { amountBlock, numberOf, isNumberBlock, type AmountBlock } from './amounts';
import { resOf } from '../tactics';
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
/** A character's patron id (faith.ts beliefOf, read here without importing faith.ts: its load order places its global
 * hooks): Faithful to a patron of patrons.json, else none. */
const patronIdOf = (c: any): string | null => { if (!c) return null; const b = c.belief; if (b?.kind === 'faithful') return PATRON_IDS.includes(b.patron) ? b.patron : null; if (b?.kind === 'atheist') return null; return PATRON_IDS.includes(c.patron) ? c.patron : null; };
const flags = (ev: Ev): Record<string, any> => (ev.self.ps?.[ev.h.key] as any)?.flags || {};

// ============================================================================================== the predicates
/** The closed list of `if` keys. Each reads the event; all of an effect's keys must hold. `<who>` is self, actor or
 * target. Numbers are shares of max HP (0.5: half) or tiles. */
export const PREDICATES: Record<string, { about: string; arg: 'rel' | 'number' | 'bool' | 'ids' | 'words' | 'string'; test: (ev: Ev, v: any) => boolean; values?: string[] }> = {};
/** Add a predicate; `values`: the closed list its words come from (the validator refuses any other word). */
const P = (name: string, arg: 'rel' | 'number' | 'bool' | 'ids' | 'words' | 'string', about: string, test: (ev: Ev, v: any) => boolean, values?: string[] | (() => string[])) => {
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
  P(who + '_has', 'ids', who + ' has one of these conditions', (ev, v) => { const u = unitOf(ev, who); return !!u && list(v).some((id) => condOn(u, id)); });
  P(who + '_lacks', 'ids', who + ' has none of these conditions', (ev, v) => { const u = unitOf(ev, who); return !!u && !list(v).some((id) => condOn(u, id)); });
  P(who + '_tier', 'words', who + '\'s tier is one of these (vermin, minion, soldier, elite, boss)', (ev, v) => { const u = unitOf(ev, who); return !!u && list(v).includes((u as any).tier); });
  P(who + '_not_tier', 'words', who + '\'s tier is none of these', (ev, v) => { const u = unitOf(ev, who); return !!u && !list(v).includes((u as any).tier); });
  P(who + '_kind', 'words', who + '\'s kind is one of these (human, robot, crawler, ork…)', (ev, v) => { const u = unitOf(ev, who); return !!u && list(v).includes((u as any).kind || 'human'); });
  P(who + '_not_kind', 'words', who + '\'s kind is none of these', (ev, v) => { const u = unitOf(ev, who); return !!u && !list(v).includes((u as any).kind || 'human'); });
  if (who !== 'self') P(who + '_within', 'number', who + ' stands within this many tiles of the holder', (ev, v) => { const u = unitOf(ev, who); return !!u && !!u.pos && dist(u.pos, ev.self.pos) <= v; });
  P(who + '_sight', 'words', who + '\'s sight to the other side: seen, unseen, in_view, out_of_view (tactics.ts sightOf; any of the words named)', (ev, v) => { const u = unitOf(ev, who); if (!u) return false; const s = sightOf(ev.cb, u); return list(v).some((w) => s.includes(w)); }, () => SIGHT_WORDS);
  if (who !== 'self') P(who + '_sees_self', 'bool', who + ' can (or cannot) see the holder', (ev, v) => { const u = unitOf(ev, who); return !!u && unitSees(ev.cb, u, ev.self.pos) === v; });
}
P('melee', 'bool', 'the attack or damage is (true) or is not (false) melee', (ev, v) => !!(ev.ctx.melee ?? ev.ctx.src?.melee) === v);
P('crit', 'bool', 'the attack is (or is not) a critical', (ev, v) => !!(ev.ctx.crit ?? ev.ctx.src?.crit) === v);
P('mode', 'words', 'the attack\'s mode is one of these (shot, aimed, burst, auto, melee, thrown, paired), or the technique it is made with (riposte…: ctx.tech)', (ev, v) => list(v).includes(ev.ctx.mode) || (!!ev.ctx.tech && list(v).includes(ev.ctx.tech)));
P('damage', 'words', 'the damage is of one of these kinds (' + DMG_WORDS.join(', ') + ')', (ev, v) => list(v).some((w) => dmgIs(ev.ctx.src || ev.ctx, w)));
P('by_hit', 'bool', 'the damage came (or did not come) from someone\'s blow, not a hazard, trap, Bleeding or Burning', (ev, v) => byHit(ev.ctx.src) === v);
P('self_harm', 'bool', 'the damage is (or is not) the unit\'s own doing (a Mana Short, an overload, Strain, Flux)', (ev, v) => selfHarm(ev.ctx) === v);
P('hostile', 'bool', 'the actor and the target are (or are not) on different sides', (ev, v) => (!!ev.actor && !!ev.target && ev.actor.side !== ev.target.side) === v);
P('cond', 'ids', 'the condition is one of these', (ev, v) => list(v).map(condId).includes(condId(ev.ctx.id)));
P('cond_family', 'words', 'the condition\'s family is one of these (body, brain, heart)', (ev, v) => list(v).includes(ev.ctx.fam));
P('action', 'words', 'the priced action (its cost site) is one of these', (ev, v) => list(v).includes(ev.ctx.action));
P('word', 'words', 'the Sigil word being drawn is one of these', (ev, v) => list(v).includes(ev.ctx.word));
P('hand', 'words', 'the hand is one of these (main, off, both)', (ev, v) => list(v).includes(ev.ctx.hand || (ev.ctx.both ? 'both' : 'main')));
P('how', 'words', 'the move is of one of these kinds (move, sprint, disengage; push, pull, throw, teleport); a reaction: its kind (attack, move, protect)', (ev, v) => list(v).includes(ev.ctx.kind ?? ev.ctx.how));
P('ap_above', 'number', 'the event\'s AP (a price, a swap) is over this', (ev, v) => (ev.ctx.ap ?? 0) > v);
P('own_turn', 'bool', 'it is (or is not) the holder\'s own turn', (ev, v) => (ev.cb.order[ev.cb.turn] === ev.self.id && !ev.cb.window) === v);
P('flag', 'string', 'the item\'s flag is set (the mark op sets it)', (ev, v) => !!flags(ev)[v]);
P('no_flag', 'string', 'the item\'s flag is not set', (ev, v) => !flags(ev)[v]);
P('self_alive', 'bool', 'the holder is (or is not) up: not Downed, dead or surrendered', (ev, v) => (!ev.self.dead && !ev.self.downed && !ev.self.surrendered) === v);
P('open', 'bool', 'nothing has stopped it yet: not cancelled, and (would_drop) not floored', (ev, v) => (!ev.ctx.cancel && ev.ctx.floor == null) === v);
P('amount_above', 'number', 'the event\'s amount (damage, a heal) is over this', (ev, v) => (ev.ctx.dmg ?? ev.ctx.n ?? 0) > v);
P('amount_share_below', 'number', 'the event\'s amount is under this share of the holder\'s max HP', (ev, v) => (ev.ctx.dmg ?? ev.ctx.n ?? 0) / ev.self.maxHp < v);
// Classes 3.0 step 1 (the batch rows of docs/design/rev4-primitives.md)
P('by_cover', 'words', 'the move started (from) and / or ended (to) next to standing cover: every end named must be', (ev, v) => list(v).every((w) => { const k = w === 'from' ? ev.ctx.from : w === 'to' ? ev.ctx.to : null; return !!k && nextToCover(ev.cb, k); }), ['from', 'to']);
// Classes 3.0 step 3 (rules 1.30): Run and Gun's 2-tile cap (reactions-spec.md 10), the Breaker's Momentum-priced rider
/** The free techniques (techniques.json `free`: everyone's, whatever they have readied: Shot, Aimed Shot, Cut,
 * Overwatch, Pull Out): rules 1.30, Fire Discipline's dear technique is any other. */
const FREE_TECH: string[] = ((techniquesJ as any).items || []).filter((t: any) => t.free).map((t: any) => t.id);
P('free_tech', 'bool', 'the attack is (true) or is not (false) made with a free technique, everyone\'s (techniques.json free: Shot, Aimed Shot, Cut, Overwatch), or with no technique a shot, an aimed shot, a blow or a throw', (ev, v) => (ev.ctx.tech ? FREE_TECH.includes(ev.ctx.tech) : ['shot', 'aimed', 'melee', 'thrown'].includes(ev.ctx.mode)) === v);
P('tech_ap_at_least', 'number', 'the attack\'s own price is at least this many AP: its technique\'s cost with the weapon before any item (ctx.techAp), or with no technique the attack\'s base AP', (ev, v) => typeof ev.ctx.techAp === 'number' && ev.ctx.techAp >= v);
P('path_tiles_at_most', 'number', 'the move (its priced walk: ctx.tiles) is at most this many tiles', (ev, v) => typeof ev.ctx.tiles === 'number' && ev.ctx.tiles <= v);
P('self_has_res', 'words', 'the holder has at least 1 of each of these resources (data/actions.json resources: momentum, guard, MP…)', (ev, v) => list(v).every((id) => resNow(ev, id) >= 1), () => Object.keys(RESOURCES));
P('self_lacks_res', 'words', 'the holder has none of one of these resources (as self_has_res)', (ev, v) => list(v).some((id) => resNow(ev, id) < 1), () => Object.keys(RESOURCES));
P('patron', 'words', 'the holder is Faithful to one of these patrons (patrons.json ids)', (ev, v) => { const id = patronIdOf(ev.h.c || charOfUnit(ev.self)); return !!id && list(v).includes(id); }, PATRON_IDS);

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
 * event:<field> (amount: the damage or heal; any other field of the payload, else of its damage source ctx.src: ambush, crit; true as 1), self:/actor:/target:<field>.
 * A plain name is 0 here (a handler counts its own). */
export function sourceOf(ev: Ev, of: string): number {
  const i = of.indexOf(':'); if (i < 0) return 0;
  const ns = of.slice(0, i), f = of.slice(i + 1);
  if (ns === 'res') return resNow(ev, f);
  if (ns === 'event') { const v = f === 'amount' ? (ev.ctx.dmg ?? ev.ctx.n ?? ev.ctx.amount) : ev.ctx[f] ?? ev.ctx[camel(f)] ?? ev.ctx.src?.[f] ?? ev.ctx.src?.[camel(f)]; return typeof v === 'number' ? v : v ? 1 : 0; }
  if (ns === 'self' || ns === 'actor' || ns === 'target') return unitField(unitOf(ev, ns as Who), f);
  return 0;
}
/** The namespaces a number block's `of` may name in an item op. */
export const SOURCE_SPACES = ['res', 'event', 'self', 'actor', 'target'];
/** The numeric fields of an item op that may be number blocks. */
const NUM_FIELDS = ['value', 'value_pct', 'max', 'add', 'set', 'min', 'at_least', 'tiles', 'rounds'];
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
  .replace(/\{gain\}/g, () => String((ev as any).gain ?? 0)).replace(/\{res:([a-z_]+)\}/g, (_m, id) => String(ev.self.res?.[id] ?? 0)).replace(/\{resmax:([a-z_]+)\}/g, (_m, id) => String(ev.self.resMax?.[id] ?? 0));
}

// ============================================================================================== the ops
/** The closed list of ops a triggered effect may run, with the triggers each one understands. */
export interface TriggerOp { on: string[]; state: boolean; about: string; fields: string[]; run: (ev: Ev, e: any, label: string) => string | void }
/** THE OPS: filled by O(...) below, one line each (data/effect_ops.json item_ops.ops is written from it). */
export const OPS: Record<string, TriggerOp> = {};
const O = (name: string, on: string[], state: boolean, fields: string[], about: string, run: TriggerOp['run']) => { OPS[name] = { on, state, fields, about, run }; };
const ANY = Object.keys(TRIGGERS);
const pick = (ev: Ev, e: any): Unit | null => (e.target === 'actor' ? ev.actor : e.target === 'target' ? ev.target : ev.self);

O('damage_mult', ['dealing', 'taking'], false, ['value'], 'multiply the amount being dealt or taken', (ev, e, label) => {
  if (ev.trig.hook === 'damage_out') ev.ctx.mults.push({ v: e.value, label }); else ev.ctx.dmg = ev.ctx.dmg * e.value;
});
O('damage_mod', ['dealing', 'taking'], false, ['value', 'value_pct'], 'add to the amount (value), or change it by a percentage (value_pct)', (ev, e, label) => {
  if (ev.trig.hook === 'damage_out') { if (typeof e.value_pct === 'number') ev.ctx.mults.push({ v: 1 + e.value_pct / 100, label }); else ev.ctx.add += e.value; }
  else if (typeof e.value_pct === 'number') ev.ctx.dmg = ev.ctx.dmg * (1 + e.value_pct / 100); else ev.ctx.dmg += e.value;
});
O('damage_vs', ['dealing'], false, ['value'], 'a bonus against this target (added with the other target bonuses)', (ev, e, label) => { ev.ctx.vs.push({ v: e.value, label }); });
O('roll_mod', ['attack', 'cond_incoming', 'save', 'spot'], false, ['value', 'roll'], 'a to-hit term on an attack; on a condition or save, the save (roll: "save", the default there) or its TN (roll: "tn"); on a spot roll, its modifier or (roll: "tn") its TN', (ev, e, label) => {
  if (ev.trig.hook === 'attack_preview') ev.ctx.terms.push({ v: e.value, label });
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
O('condition', ANY, true, ['condition', 'rounds', 'skip_save'], 'put a condition on the self, the actor or the target (target:), with its save unless skip_save', (ev, e) => {
  const u = pick(ev, e); if (!u) return;
  return applyCond(ev.cb, rngOf(ev.h, ev.ctx), ev.self, u, e.condition, typeof e.rounds === 'number' ? e.rounds : undefined, undefined, e.skip_save ? { skipSave: true } : {});
});
O('cleanse', ANY, true, ['condition', 'family', 'count'], 'end conditions: the ones named, or a family\'s debuffs, or any debuff (count: how many)', (ev, e) => {
  const u = pick(ev, e); if (!u) return;
  const ids = e.condition ? list(e.condition).map(condId).filter((id) => condOn(u, id)) : debuffsOf(u, e.family || undefined);
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
O('floor', ['would_drop'], false, ['value'], 'the blow leaves the unit at this many HP', (ev, e) => { ev.ctx.floor = e.value; });
O('deal', ANY, true, ['amount', 'via', 'nonlethal'], 'deal an amount block (amounts) to the self, actor or target; via: the source skill it counts as (a prayer: "faith"), nonlethal: a blow that takes the last HP subdues', (ev, e) => {
  const t = pick(ev, e), b = blockOf(ev.h, e); if (!t || !b || b.kind !== 'damage') return;
  const type = b.type || 'true', src: any = { by: ev.self, type, dmgType: type, shield: type !== 'true', credit: 'hp', item: ev.h.key, ...(e.nonlethal ? { nonlethal: true } : {}) };
  const go = () => { deal(ev.cb, ev.self, t, { ...specOf(b), kind: 'damage', round: 'floor', ...(b.armour ? { armour: b.armour } : {}), hook: true }, { who: ev.h.c || null, src, hookCtx: { mode: 'item', src }, counts: countsOf(ev, b) }); };
  if (typeof e.via === 'string') withVia(ev.self, e.via, go); else go();
});
O('mend', ANY, true, ['amount'], 'heal or shield by an amount block (its heal_kind is the heal\'s kind for heal_in: tending, prayer…; default perk)', (ev, e) => {
  const t = pick(ev, e), b = blockOf(ev.h, e); if (!t || !b || b.kind === 'damage') return;
  mend(ev.cb, ev.self, t, { ...specOf(b), kind: b.kind }, { who: ev.h.c || null, healKind: b.heal_kind || 'perk', counts: countsOf(ev, b) });
});
O('displace', ANY, true, ['tiles', 'how'], 'push the target away from the holder (how: push) or pull it closer (pull)', (ev, e) => {
  const t = pick(ev, e); if (!t || t === ev.self) return;
  const how = e.how === 'pull' ? 'pull' : 'push', to = how === 'pull' ? { toward: ev.self.pos, tiles: e.tiles } : { away: ev.self.pos, tiles: e.tiles };
  return displace(ev.cb, rngOf(ev.h, ev.ctx), t, to, { by: ev.self, how, source: ev.h.key }).text || '';
});
O('use', ANY, true, [], 'nothing but its limit: spends one use (for a limit another effect reads with peek)', () => undefined);
O('mark', ANY, true, ['flag', 'clear'], 'set (or with clear: true, clear) one of the item\'s own flags, for a later trigger\'s flag / no_flag', (ev, e) => {
  const st: any = ((ev.self.ps ||= {}) as any)[ev.h.key] ||= {}; const f = (st.flags ||= {});
  if (e.clear) delete f[e.flag]; else f[e.flag] = true;
});

const blockOf = (h: Holder, e: any): AmountBlock | null => {
  if (e.amount && typeof e.amount === 'object' && typeof e.amount.base === 'number') return e.amount as AmountBlock;
  if (typeof e.amount === 'string') { try { return amountBlock(h.key, e.amount); } catch { return null; } }
  return null;
};
/** P3: an amount block's per-point parts that name a source (res:, event:, self:, target:) are counted from the event. */
const countsOf = (ev: Ev, b: AmountBlock): Record<string, number> => Object.fromEntries((b.per || []).filter((p) => p.of.includes(':')).map((p) => [p.of, sourceOf(ev, p.of)]));
const specOf = (b: AmountBlock): AmountSpec => ({ kind: b.kind, base: b.base, ...(b.per ? { per: b.per } : {}), ...(b.profile ? { profile: b.profile } : {}), round: 'none' });

// ============================================================================================== the unit set (P5)
/** `targets` on any op (Classes 3.0 P5): the op runs once for each unit of the set, as its target, in the fight's order
 * (kit.ts unitsIn). The set: of (the centre: self, actor, target, or tile: the event's tile), side (foe, ally, side,
 * any; to the holder), within (tiles from the centre), shape (burst: the centre's tile too; aura: not it; cone and
 * line: from the centre toward the event's target, or its actor, `within` long), seen (seen, or not, by the holder's
 * side), alive (default true: still in the fight; false: Downed only), downed (true: the Downed too), max (the first n).
 * With no within and no shape, the whole field. `tied` and `aims_at` come with ties (P8) and the enemy's aim (a batch row). */
export interface TargetSet { of?: 'self' | 'actor' | 'target' | 'tile'; side?: 'foe' | 'ally' | 'side' | 'any'; within?: number; shape?: 'burst' | 'aura' | 'cone' | 'line'; seen?: boolean; alive?: boolean; downed?: boolean; max?: number }
/** The fields of `targets` and the words each takes (data/effect_ops.json item_ops.targets is written from it). */
export const TARGET_FIELDS: Record<string, string[] | 'number' | 'bool'> = { of: ['self', 'actor', 'target', 'tile'], side: ['foe', 'ally', 'side', 'any'], within: 'number', shape: ['burst', 'aura', 'cone', 'line'], seen: 'bool', alive: 'bool', downed: 'bool', max: 'number' };
/** Why a `targets` block is malformed (null: it is fine). */
export function targetsProblem(t: any): string | null {
  if (!t || typeof t !== 'object' || Array.isArray(t)) return '`targets` is an object';
  for (const [k, v] of Object.entries(t)) {
    const f = TARGET_FIELDS[k]; if (!f) return 'unknown targets field ' + k;
    if (f === 'number' ? typeof v !== 'number' : f === 'bool' ? typeof v !== 'boolean' : !f.includes(v as string)) return 'targets.' + k + ' takes ' + (Array.isArray(f) ? f.join(', ') : 'a ' + f);
  }
  if ((t.shape === 'cone' || t.shape === 'line') && typeof t.within !== 'number') return 'a cone or a line needs `within` (its length)';
  if ((t.shape === 'burst' || t.shape === 'aura') && typeof t.within !== 'number') return 'a burst or an aura needs `within` (its radius)';
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
  const downed = t.downed || t.alive === false, all = area ? unitsIn(cb, area, { downed }) : unitsIn(cb, { shape: 'burst', at, r: Math.max(cb.map.w, cb.map.h) }, { downed });
  const out = all.filter((v) => (t.alive === false ? !!v.downed : true) && (!t.side || rel(ev.self, v, t.side)) && (t.seen == null || sideSees(cb, ev.self.side as 'pc' | 'foe', v) === t.seen));
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
  const h = { ...ev.h, u: ev.self, cb: ev.cb }, key = lim.key ? ev.h.key + '#' + lim.key : undefined;
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
  if (asReaction ? !canReact(cb, self, lim.kind, lim.reaction) : !limitOk(ev, lim, !ev.preview)) return;
  const label = e.label || h.info.name, parts: string[] = [];
  let ran = 0;
  const one = (ev1: Ev, x0: any) => { const x = withNumbers(ev1, x0), r = OPS[x.op].run(ev1, x, x.label || label); ran++; if (typeof r === 'string' && r) parts.push(r); };
  // P5: an op with `targets` runs once for each unit of its set, that unit as its target
  const go = () => { for (const x0 of all) { if (x0.targets) { for (const t of selectUnits(ev, x0.targets)) one({ ...ev, target: t }, { ...x0, target: 'target' }); } else one(ev, x0); } };
  if (asReaction && !ev.preview) { if (!react(cb, self, { kind: lim.kind, spend: lim.reaction, event: attackEvent() }, go)) return; } else go();
  if (ev.preview || !ran) return; // a set with nobody in it: nothing happened, nothing is said
  if (e.fx && typeof e.fx === 'object') { const { k, ...rest } = e.fx; emitFx(cb, k, { target: self.id, at: self.pos, ...rest }); }
  if (e.say) say(cb, fill(e.say, ev).replace('{then}', parts.join('')));
}
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
/** The stats condtable.ts reads from a row itself (they are not answered through statQuery). */
export const COND_TABLE_STATS = new Set(['defense', 'move_mult', 'vision', 'ap', 'damage_dealt_pct', 'sigil_ap', 'soul_cost_pct', 'save_body', 'save_brain', 'save_heart']);
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

setTriggerRunner({ isTriggered, problem: triggerProblem, hookOf: triggerHook, run: runTriggered, conds: condsOn, condHooks: () => Object.keys(condIndex().on), condStat });
setAllItems(allItems);
