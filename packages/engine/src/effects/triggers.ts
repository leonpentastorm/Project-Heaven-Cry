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
import { overworld, rngOf } from '../kit';
import { say, dist, displace, emitFx, unitSees } from '../combat';
import { applyCond, endCond, condOn, condId, debuffsOf, withVia } from '../magic';
import { nextToCover } from '../combat';
import { charOfUnit } from './hooks';
import patronsJ from '../../../../data/patrons.json';
import { RESOURCES, resGive } from './cost';
import { grantPerkAp, bankAp } from './ap';
import { loseAp } from './cost';
import { resGain } from '../tactics';
import { gainEcho } from './echo';
import { deal, mend, type AmountSpec } from './output';
import { amountBlock, type AmountBlock } from './amounts';

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
const P = (name: string, arg: 'rel' | 'number' | 'bool' | 'ids' | 'words' | 'string', about: string, test: (ev: Ev, v: any) => boolean, values?: string[]) => { PREDICATES[name] = { about, arg, test, ...(values ? { values } : {}) }; };
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
  if (who !== 'self') P(who + '_sees_self', 'bool', who + ' can (or cannot) see the holder', (ev, v) => { const u = unitOf(ev, who); return !!u && unitSees(ev.cb, u, ev.self.pos) === v; });
}
P('melee', 'bool', 'the attack or damage is (true) or is not (false) melee', (ev, v) => !!(ev.ctx.melee ?? ev.ctx.src?.melee) === v);
P('crit', 'bool', 'the attack is (or is not) a critical', (ev, v) => !!(ev.ctx.crit ?? ev.ctx.src?.crit) === v);
P('mode', 'words', 'the attack\'s mode is one of these (shot, aimed, burst, auto, melee, thrown, paired)', (ev, v) => list(v).includes(ev.ctx.mode));
P('damage', 'words', 'the damage is of one of these kinds (' + DMG_WORDS.join(', ') + ')', (ev, v) => list(v).some((w) => dmgIs(ev.ctx.src || ev.ctx, w)));
P('by_hit', 'bool', 'the damage came (or did not come) from someone\'s blow, not a hazard, trap, Bleeding or Burning', (ev, v) => byHit(ev.ctx.src) === v);
P('self_harm', 'bool', 'the damage is (or is not) the unit\'s own doing (a Mana Short, an overload, Strain, Flux)', (ev, v) => selfHarm(ev.ctx) === v);
P('hostile', 'bool', 'the actor and the target are (or are not) on different sides', (ev, v) => (!!ev.actor && !!ev.target && ev.actor.side !== ev.target.side) === v);
P('cond', 'ids', 'the condition is one of these', (ev, v) => list(v).map(condId).includes(condId(ev.ctx.id)));
P('cond_family', 'words', 'the condition\'s family is one of these (body, brain, heart)', (ev, v) => list(v).includes(ev.ctx.fam));
P('action', 'words', 'the priced action (its cost site) is one of these', (ev, v) => list(v).includes(ev.ctx.action));
P('word', 'words', 'the Sigil word being drawn is one of these', (ev, v) => list(v).includes(ev.ctx.word));
P('hand', 'words', 'the hand is one of these (main, off, both)', (ev, v) => list(v).includes(ev.ctx.hand || (ev.ctx.both ? 'both' : 'main')));
P('how', 'words', 'the move is of one of these kinds (move, sprint, disengage; push, pull, throw, teleport)', (ev, v) => list(v).includes(ev.ctx.kind ?? ev.ctx.how));
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
P('patron', 'words', 'the holder is Faithful to one of these patrons (patrons.json ids)', (ev, v) => { const id = patronIdOf(ev.h.c || charOfUnit(ev.self)); return !!id && list(v).includes(id); }, PATRON_IDS);

/** A `say` line's words: {self} {actor} {target} (names), {gain} (what the last resource op really gave), {res:<id>}
 * and {resmax:<id>} (the holder's resource now, and its most). Numbers from the data go in as {=.field} placeholders. */
function fill(s: string, ev: Ev): string {
  return s.replace(/\{(self|actor|target)\}/g, (_m, w) => unitOf(ev, w as Who)?.name || '')
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
O('resource', ANY, true, ['resource', 'value'], 'give (or take) a class resource (guard, momentum…), Echo, or any resource of data/actions.json `resources` (MP, Pressure…: through effects/cost.ts resGive)', (ev, e, label) => {
  const u = pick(ev, e); if (!u) return;
  if (e.resource === 'echo') { if (ev.h.c) gainEcho(ev.h.c, e.value, label); return; }
  (ev as any).gain = u.resMax?.[e.resource] != null || !RESOURCES[e.resource] ? resGain(u, e.resource, e.value) : resGive(ev.cb, u, e.resource, e.value, { by: ev.self, c: ev.h.c, why: label });
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
  const go = () => { deal(ev.cb, ev.self, t, { ...specOf(b), kind: 'damage', round: 'floor', ...(b.armour ? { armour: b.armour } : {}), hook: true }, { who: ev.h.c || null, src, hookCtx: { mode: 'item', src } }); };
  if (typeof e.via === 'string') withVia(ev.self, e.via, go); else go();
});
O('mend', ANY, true, ['amount'], 'heal or shield by an amount block (its heal_kind is the heal\'s kind for heal_in: tending, prayer…; default perk)', (ev, e) => {
  const t = pick(ev, e), b = blockOf(ev.h, e); if (!t || !b || b.kind === 'damage') return;
  mend(ev.cb, ev.self, t, { ...specOf(b), kind: b.kind }, { who: ev.h.c || null, healKind: b.heal_kind || 'perk' });
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
const specOf = (b: AmountBlock): AmountSpec => ({ kind: b.kind, base: b.base, ...(b.per ? { per: b.per } : {}), ...(b.profile ? { profile: b.profile } : {}), round: 'none' });

// ============================================================================================== the limit
/** `limit`: { per: a scope of effects/uses.ts (per_turn, per_round, per_combat, per_scene, per_session, per_rest), n,
 * key? (a second counter on the same item: "<item key>#<key>"), each?: "target" | "actor" (a counter per unit) } or
 * { cooldown: rounds }. */
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
  if (e.limit != null) { const l = e.limit; if (typeof l !== 'object' || (typeof l.cooldown !== 'number' && !LIMIT_SCOPES.includes(l.per))) return 'limit must be { per, n } or { cooldown }'; }
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
  if (!limitOk(ev, e.limit, !ev.preview)) return;
  const label = e.label || h.info.name, parts: string[] = [];
  for (const x of all) { const r = OPS[x.op].run(ev, x, x.label || label); if (typeof r === 'string' && r) parts.push(r); }
  if (ev.preview) return;
  if (e.fx && typeof e.fx === 'object') { const { k, ...rest } = e.fx; emitFx(cb, k, { target: self.id, at: self.pos, ...rest }); }
  if (e.say) say(cb, fill(e.say, ev).replace('{then}', parts.join('')));
}
/** The hooks any data effect listens on (hooks.ts hookUsed asks, so a hook that is skipped when nobody listens, the
 * `cost` hook, still fires for a data item). */
export const triggerHook = (e: any): HookName | null => (isTriggered(e) ? TRIGGERS[e.when].hook : null);

setTriggerRunner({ isTriggered, problem: triggerProblem, hookOf: triggerHook, run: runTriggered });
setAllItems(allItems);
