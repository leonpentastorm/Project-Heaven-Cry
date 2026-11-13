import '../datatext'; // fills the texts' {=placeholders} before any data is read
import { say } from '../log';
// Active items become actions (plan 2.7). One action type per surface:
//   combat/perk {unitId, id, actionId?, targetId?, targetIds?, tile?, choice?, text?, arm?}   (combat Perks and Class tabs)
//   world/act  {act:'perk', charId, id, actionId?, targetId?, tile?, choice?}                  (the area map)
//   story/perk {charId, id, actionId?, npc?, text?, checkId?}                                  (the story panel)
// id is the item key ("perk:earthbreaker", "trait:chain_smoker", "class:marksman.killzone") or a bare item id.
//
// Every grant_action in the data gets a default action (its AP and use limit from the data) until a lane registers a
// real one: the default runs whatever of the item's own effects the generic runners can (cleanse, shield, heal,
// condition, knockback, Echo) and hands the rest to the Narrator with the item's text. A lane's ActionDef replaces the
// default for the same action id.
import type { Combat, Unit } from '../combat';
import { unitSees } from '../combat';
import type { Character } from '../character';
import type { ActionArgs, ActionDef, ActionPreview, ActionScope, Holder, ItemInfo, ToggleDef, UseScope } from './types';
import { handlerOf, holdersOf, genericOf, boundGame, ifFails, runOwnEffects, isItemOp, charOfUnit } from './hooks';
import feelingsJ from '../../../../data/feelings.json';
const FEEL_NAME: Record<string, string> = Object.fromEntries(((feelingsJ as any).items || []).map((f: any) => [f.id, f.name])); // (the data, not feelings.ts: its load order)
import { keyOf, rawItem } from './collect';
import { SKILLS } from '../data';
import { uses, scopeOf, usesLabel } from './uses';
import { note, postStory, pendRuling, actingAs } from './narrator';
import { overworld } from '../kit';
import { price, whyNot, pay, setAp, resWhyNot, resPay, resLeft, type Priced } from './cost';
import { isNumberBlock, numberOf } from './amounts';

/** Data AP strings: "soul_cast_ap" (the Soul cast AP), "sigil_ap+soul_cast_ap" (Glyph AP + Soul cast AP). */
export function apFromData(ap: any, u?: Unit | null): number {
  if (typeof ap === 'number') return ap;
  if (typeof ap !== 'string') return 0;
  return ap.split('+').reduce((t, p) => t + (p === 'soul_cast_ap' ? u?.mg?.soulAp ?? 2 : p === 'sigil_ap' || p === 'glyph_ap' ? u?.mg?.glyphAp ?? 1 : Number(p) || 0), 0);
}
const human = (s: string) => s.replace(/_/g, ' ').replace(/^./, (x) => x.toUpperCase());
const TARGETING = (e: any): ActionDef['target'] => {
  const t = String(e?.target || '');
  if (/ally|allies|squad/.test(t)) return 'ally';
  if (/enemy|target|foe|one_/.test(t)) return 'unit';
  return 'none';
};

// ---------- the one action shape (Classes 3.0 P6: door verbs) ----------
// A grant_action may carry, besides `ap` and `uses`: `res` (resources it costs, by id), `if` (the holder's predicates:
// the action is greyed while one fails), `reach` {tiles, sight, side, self, if} (who it may go at: it builds the pick
// list and the refusal), `pick` (a closed list, or 'words', 'squad', 'designs', 'gamma'), `pick_label`, `limit` {per, n}
// (its use window), `prayer` ('whisper' | 'hymn': prayed through faith.ts, its slot, wait, dice and Witnessed; `tier`
// for a Hymn's gate) and nested `effects`. A door verb's (item kind `verb`) nested item ops run as the action's own
// effects when it succeeds (on a ctx shaped as `acted`'s); another item's nested `when: "acted"` effects are lifted
// onto the item (collect.ts liftActed).
/** The words a reach's side takes (a target relation to the holder). */
export const REACH_SIDES = ['foe', 'ally', 'side', 'any'];
/** The fields of a grant_action's `reach`. */
export const REACH_FIELDS = ['tiles', 'sight', 'side', 'self', 'if', 'tied', 'tile', 'beyond'];
/** Rules 1.33: the surfaces a grant_action's `scope` may name (default: combat and the area map). */
export const GRANT_SCOPES = ['combat', 'world', 'story'];
/** The prayers a grant_action may be. */
export const PRAYER_KINDS = ['whisper', 'hymn'];
/** faith.ts registers the prayer door here as it loads (this file can't import it: its load order places its hooks). */
let PRAYER: { why(cb: Combat, u: Unit, kind: 'whisper' | 'hymn'): string | null; pray(cb: Combat, rng: { state: number }, u: Unit, kind: 'whisper' | 'hymn', name: string, tier?: number): boolean } | null = null;
/** faith.ts's prayer door for a verb that is a prayer (verbPrayerWhy, verbPray). */
export const setPrayerDoor = (p: typeof PRAYER) => { PRAYER = p; };
/** A number of an action's shape for this holder (rules 1.33: a number block's `skill:<id>` and `res:<id>` read the
 * holder: a door's ladder, as Bond's reach 6, 9 from Empathy 6). A plain number is itself; anything else is null. */
export function holderNumber(h: Holder, x: unknown): number | null {
  if (typeof x === 'number') return x;
  if (!isNumberBlock(x)) return null;
  const c = h.c || charOfUnit(h.u);
  return numberOf(x, (of) => { const i = of.indexOf(':'), ns = of.slice(0, i), f = of.slice(i + 1); return ns === 'skill' ? Number((c as any)?.skills?.[f] || 0) : ns === 'res' && h.u ? resLeft(h.u, f, c) : 0; });
}
/** Why this holder can't aim its action at this unit by its `reach` (null: it can). */
export function reachWhy(h: Holder, reach: any, t: Unit | null | undefined): string | null {
  const u = h.u, cb = h.cb; if (!reach || !u || !cb) return null;
  if (!t || t.dead) return 'Pick a living target.';
  if (t === u) return reach.self ? null : 'Not on yourself.';
  const side = reach.side || 'any';
  if (side === 'foe' && t.side === u.side) return 'Pick an enemy.';
  if ((side === 'ally' || side === 'side') && t.side !== u.side) return 'Pick an ally.';
  // rules 1.33: reach.beyond (a tie kind): a unit tied to the holder by it is in reach at any range the holder itself sees
  const far = !!reach.beyond && !ifFails(h, { target_tied: reach.beyond }, t);
  if (far && !unitSees(cb, u, t.pos)) return 'Not in sight: a Bond carries it only where you can see.';
  const tiles = holderNumber(h, reach.tiles);
  if (!far && tiles != null && distK(u.pos, t.pos) > tiles) return 'Out of range (' + tiles + (tiles === 1 ? ' tile).' : ' tiles).');
  if (reach.sight && t.side !== u.side && ifFails(h, { target_sight: ['seen'] }, t)) return 'You can\'t see them.'; // the holder's side sees it (P7)
  if (reach.tied && ifFails(h, { target_tied: reach.tied }, t)) return t.name + ' isn\'t tied to you.'; // P8
  if (reach.if) { const k = ifFails(h, reach.if, t); if (k) return 'Not on ' + t.name + ' (' + human(k) + ').'; }
  return null;
}
/** Why this holder can't aim its action at this tile by a reach with `tile: true` (Classes 3.0 step 5, rules 1.31:
 * Sanctuary): within `tiles` of the holder, and (sight) a tile its eyes reach. null: it can. */
export function tileReachWhy(h: Holder, reach: any, tile: string | null | undefined): string | null {
  const u = h.u, cb = h.cb; if (!reach || !u || !cb) return null;
  if (!tile) return 'Pick a tile.';
  if (typeof reach.tiles === 'number' && distK(u.pos, tile) > reach.tiles) return 'Out of range (' + reach.tiles + (reach.tiles === 1 ? ' tile).' : ' tiles).');
  if (reach.sight && !unitSees(cb, u, tile)) return 'You can\'t see that tile.';
  return null;
}
const TARGET_OF_SIDE: Record<string, ActionDef['target']> = { foe: 'enemy', ally: 'ally', side: 'ally', any: 'unit' };

/** The default actions of an item, from its data. */
export function defaultActions(info: ItemInfo): ActionDef[] {
  const grants = info.effects.filter((e) => e?.op === 'grant_action');
  const own = info.bound ? info.effects.filter((e) => e?.op !== 'grant_action' && e?.when !== 'acted') : [];
  const verb = info.kind === 'verb';
  const mk = (id: string, label: string, apRaw: any, usesRaw: string, effs: any[], g: any = {}): ActionDef => {
    const reach = g.reach, per = g.limit?.per || scopeOf(usesRaw), n = g.limit?.n ?? 1;
    const target = reach?.tile ? 'tile' : reach ? TARGET_OF_SIDE[reach.side || 'any'] || 'unit' : effs.map(TARGETING).find((t) => t !== 'none') || 'none';
    // a door verb's nested item ops are its own effects, run once it succeeds; the rest run by the generic runners.
    // A prayer (any item's, rules 1.31: the Chaplain's Ward and Sanctuary) is the same: its item ops run only when the
    // patron answers, and the item's triggered effects (its `when`) stay with their triggers.
    const ops = verb || !!g.prayer;
    const mine = ops ? effs.filter((e) => isItemOp(e) && !(g.prayer && !verb && e.when)) : [], rest = ops ? effs.filter((e) => !isItemOp(e)) : effs;
    const acts = !verb && (g.effects || []).some((e: any) => e?.when === 'acted'); // its ops are lifted onto the item (collect.ts liftActed) and run on the trigger acted
    const d: ActionDef = {
      id, label, scope: Array.isArray(g.scope) ? g.scope.filter((x: string) => GRANT_SCOPES.includes(x)) : per === 'out_of_combat' ? ['world', 'story'] : ['combat', 'world'], ap: (h) => apFromData(apRaw, h.u), uses: { per, n }, target,
      run: (h, args, rng) => {
        if (g.prayer && h.cb && h.u && PRAYER && !PRAYER.pray(h.cb, rng, h.u, g.prayer, info.name, g.tier)) return null; // no answer: the AP and the slot are spent
        const t = args.targetId && h.cb ? h.cb.units.find((x) => x.id === args.targetId) || null : null;
        if (rest.length || (!mine.length && !acts)) defaultRun(h, rest, args, rng); // rules 1.33: a grant whose effects are all `when: acted` (lifted onto the item) is the engine's: no Narrator note
        if (mine.length && h.cb && h.u) runOwnEffects(h, mine, { u: h.u, t, action: id, tile: args.tile || null, toggles: [], mode: null, ...(args.choice != null ? { choice: args.choice } : {}) });
        return null;
      },
    };
    if (g.res) d.res = Object.values(g.res).some(isNumberBlock) ? (h) => Object.fromEntries(Object.entries(g.res).map(([k, v]) => [k, holderNumber(h, v as any) ?? 0])) : { ...g.res }; // rules 1.33: a number block (a ladder: Mend 2 MP cheaper from Empathy 9)
    if (typeof reach?.tiles === 'number' && !reach.beyond) d.range = reach.tiles; // (reach.beyond: the reach decides, not a plain range)
    if (g.pick) { d.pick = g.pick; if (g.pick_label) d.pickLabel = g.pick_label; }
    if (typeof g.site === 'string') d.site = g.site;
    if (g.if || g.prayer) d.available = (h) => {
      if (g.if && h.u && h.cb) { const k = ifFails(h, g.if); if (k) return 'Not now (' + human(k) + ').'; }
      if (g.prayer && h.u && h.cb && PRAYER) return PRAYER.why(h.cb, h.u, g.prayer) || true;
      return true;
    };
    if (reach?.tile) d.preview = (h, args) => { const why = tileReachWhy(h, reach, args.tile); return why ? { ok: false, why } : {}; }; // a tile: in range and in sight
    else if (reach) { d.reach = (h, t) => reachWhy(h, reach, t); d.choices = (h) => (h.cb ? h.cb.units.filter((t) => !reachWhy(h, reach, t)).map((t) => t.id) : []); }
    return d;
  };
  // a nested `when: "acted"` effect is the item's own triggered effect (collect.ts liftActed): the trigger runs it, not the action
  const nested = (g: any) => (g.effects || []).filter((e: any) => e?.when !== 'acted');
  // (a grant's own `label`, else the item's name: with two grants, the name and the action's)
  if (grants.length) return grants.map((g, i) => mk(g.action || 'use' + i, typeof g.label === 'string' ? g.label : grants.length > 1 ? info.name + ' · ' + human(g.action || 'use') : info.name, g.ap ?? info.ap, g.uses || info.uses, [...(verb ? g.effects || [] : nested(g)), ...own], g));
  if (info.bound) return [mk('use', info.name, info.ap, info.uses, own)];
  return [];
}

/** Run what the generic runners can, and give the Narrator the rest. Returns null (never refuses). */
function defaultRun(h: Holder, effs: any[], args: ActionArgs, rng: { state: number }): null {
  let line = '', rest = false;
  for (const e of effs) {
    const g = genericOf(e?.op);
    if (g?.run && g.runs && g.runs(e, h.info)) line += g.run(h, e, args, rng) || '';
    else rest = true;
  }
  const who = h.u?.name || h.c?.name || 'Someone', tgt = args.targetId && h.cb ? h.cb.units.find((x) => x.id === args.targetId) : null;
  const what = who + ' uses ' + h.info.name + (tgt ? ' on ' + tgt.name : '') + (args.text ? ': "' + args.text.slice(0, 200) + '"' : '') + line + '.';
  if (h.cb) say(h.cb, what);
  const ask = (tgt ? 'on ' + tgt.name + '. ' : '') + (args.npc ? 'with ' + args.npc + '. ' : '') + (args.text ? '"' + args.text.slice(0, 160) + '" ' : '') + h.info.text;
  if (!h.cb) { const eid = postStory(h, (args.npc ? args.npc + ': ' : '') + (args.text || 'uses ' + h.info.name + '.')); const g = h.g ?? boundGame(); if (g && h.c) pendRuling(g, h.c, h.key, ask, eid || undefined); }
  else if (rest || !effs.length) note(h, ask);
  return null;
}

/** An item's actions: a lane's, when it registered any (they replace the data defaults), else the defaults. */
export function actionDefs(info: ItemInfo): ActionDef[] {
  const hd = handlerOf(info.key), lane = hd?.actions || [];
  if (lane.length && hd?.dataActions) return [...lane, ...defaultActions(info).filter((d) => !lane.some((l) => l.id === d.id))]; // rules 1.33: a lane that keeps only a story half beside the data's actions
  return lane.length ? lane : hd?.noDefaultActions ? [] : defaultActions(info);
}

/** The grant_action of an item's data that names this action id, or null. */
const dataGrant = (info: ItemInfo, actionId: string): any => info.effects.filter((e) => e?.op === 'grant_action').find((x, i) => (x.action || 'use' + i) === actionId) || null;
/** The data's AP for an item's action: the `ap` of the grant_action that names it, else the item's own (ap_cost). An
 * ActionDef that says `ap: 'data'` for an item whose data has no number is a missing line of data: it throws. */
export function dataAp(info: ItemInfo, actionId: string): number | string {
  const grants = info.effects.filter((e) => e?.op === 'grant_action'), g = grants.find((x, i) => (x.action || 'use' + i) === actionId);
  const ap = g?.ap ?? info.ap;
  if (ap == null) throw new Error(info.key + '#' + actionId + " says ap: 'data', but its data gives no AP (ap_cost).");
  return ap;
}
/** What an item's action costs this holder: its `ap` and `res` (numbers or functions of the arguments), through the
 * one price (effects/cost.ts: the `cost` hook sees it as '<item key>#<action id>'). */
function costOf(h: Holder, d: ActionDef, args: ActionArgs): Priced {
  const ap = typeof d.ap === 'function' ? d.ap(h, args) : d.ap === 'data' ? apFromData(dataAp(h.info, d.id), h.u) : d.ap, res = typeof d.res === 'function' ? d.res(h, args) : d.res;
  const site = d.site ?? h.key + '#' + d.id; // rules 1.33: a data action may name its cost site (Triage's 'triage': what items answer as ap_cost:triage)
  return price({ cb: h.cb, u: h.u, c: h.c }, site, { ap, res: res || undefined }, { item: h.key });
}
/** The tab an item's actions go on: class moves on the class's, a door verb on its system's tab (its data file's `tab`:
 * Shadow's verbs on 'shadow', rules 1.32), the rest on the perks'. */
export type ItemTab = 'perks' | 'class' | 'shadow';
const tabOf = (h: Holder): ItemTab => (h.kind === 'class' ? 'class' : h.kind === 'verb' && rawItem(h.key)?.tab === 'shadow' ? 'shadow' : 'perks');
/** One action as the UI shows it. */
export interface PerkActionEntry {
  /** What combat/perk, world/act perk and story/perk take as id (item key), plus actionId when an item has several. */
  id: string; actionId: string; itemId: string; kind: string; label: string; text: string;
  ap: number; uses: { per: UseScope; n: number; left: number; label: string };
  target: ActionDef['target']; range?: number; scope: ActionScope[];
  /** null: can be used now; otherwise why not. */
  why: string | null;
  /** The engine runs it all (else part or all goes to the Narrator). */
  engine: boolean;
  /** Which tab: perks (perks and traits) or class (class moves). cls: the class id, for its emblem. */
  tab: ItemTab; cls?: string; arm?: boolean; armed?: any;
  tier: string;
  /** What the action's choice takes (chips in the client), how many at once, and the prompt for a pick or typed detail. */
  options?: { id: string; label: string }[]; pickMulti?: number; pickLabel?: string;
  /** The units it may go at, worked out by the engine (a door verb's reach): the pick list. */
  choices?: string[];
}
type Who = { u?: Unit | null; c?: Character | null; cb?: Combat | null; g?: any };

/** Every action a holder's items give on this surface, available or greyed (hidden ones left out). */
export function perkActionsFor(x: Who, scope: ActionScope): PerkActionEntry[] {
  const out: PerkActionEntry[] = [];
  for (const h of holdersOf(x)) { h.g = x.g ?? boundGame(); for (const d of actionDefs(h.info)) { const e = entryOf(h, d, scope); if (e) out.push(e); } }
  return out;
}
/** An item the data makes an action, but which is used another way: from another action (a chip on Pump, Begin, an
 *  attack: its toggles) or by itself (a hook). The Perks tab lists these to read, with no button of their own (Leon,
 *  9 Nov 2026: "keep these in the perk tab so you can read that you have the skill and what it does, but remove the
 *  confirm button if the skill already has a use button in its perspective action"). via: where it is used. */
export interface PerkInfoEntry { id: string; itemId: string; kind: string; label: string; text: string; tab: ItemTab; tier: string; via: string; uses: { per: UseScope; n: number; left: number; label: string } }
const VIA: Record<string, string> = { 'combat/pump': 'Pump', 'combat/outburst': 'Begin', 'combat/release': 'Release', 'combat/attack': 'an attack', 'combat/move': 'a move', 'combat/evoke': 'Evoke', 'combat/pray': 'a prayer', 'combat/perk': 'a perk action', 'check/roll': 'a check', 'story/speak': 'speaking' };
/** The read-only Perks-tab entries of a holder's items on this surface (see PerkInfoEntry). Listed: an item with no
 *  button here (none of its actions has this scope) that the data makes an action here, or whose toggles ride an
 *  action here (Running Reload's "Reload on the move" on Move, Gambler's "Double or Nothing" on an attack). Pure. */
export function perkInfoFor(x: Who, scope: ActionScope): PerkInfoEntry[] {
  const out: PerkInfoEntry[] = [], here = scope + '/';
  for (const h of holdersOf(x)) {
    const hd = handlerOf(h.key); if (!hd) continue; // no lane: the data's default action is its button
    if (actionDefs(h.info).some((d) => d.scope.includes(scope))) continue; // it has a button of its own here
    const ts = (hd.toggles || []).filter((t) => t.on.some((o) => o.startsWith(here)));
    const defs = defaultActions(h.info).filter((d) => d.scope.includes(scope)); if (!defs.length && !ts.length) continue; // never used here
    const on = [...new Set((hd.toggles || []).flatMap((t) => t.on))], d = defs[0];
    // Uses: the data action's, when it has one; a toggle-only item counts its own (at will unless a lane says so).
    const per: UseScope = d?.uses?.per || 'at_will', n = d?.uses?.n ?? 1;
    const left = d ? uses({ ...h, g: x.g ?? boundGame() }).left(per, n) : n;
    out.push({ id: h.key, itemId: h.itemId, kind: h.kind, label: h.info.name, text: h.info.text, tab: tabOf(h), tier: h.tier,
      via: on.length ? 'Used from ' + [...new Set(on.map((o) => VIA[o] || o))].join(' or ') : 'Automatic',
      uses: { per, n, left, label: d ? usesLabel(per, n, Math.min(n, left)) : '' } });
  }
  return out;
}
/** Why a spent action can't be used, by its use window. */
const USED_WHY: Partial<Record<UseScope, string>> = { per_rest: 'Used until the next rest.', per_scene: 'Used until the next scene.', per_session: 'Used until the next session.', per_combat: 'Used this fight.', per_turn: 'Used this turn.', per_round: 'Used this round.', reaction: 'Used this round.', per_campaign: 'Used for this campaign.' };
function entryOf(h: Holder, d: ActionDef, scope: ActionScope): PerkActionEntry | null {
  if (!d.scope.includes(scope)) return null;
  const av = d.available ? d.available(h) : true; if (av === false) return null;
  const cost = costOf(h, d, {}), ap = cost.ap, per = d.uses?.per || 'at_will', n = d.uses?.n ?? 1;
  const left = uses(h).left(per, n, h.key + '#' + d.id);
  let why: string | null = typeof av === 'string' ? av : null;
  // P6: a lane's action keeps its own words, and its data `if` (Vanish's) is the backstop: the data is read, never dead
  if (!why && h.u && h.cb && handlerOf(h.key)?.actions?.some((a) => a.id === d.id)) { const g = dataGrant(h.info, d.id); if (g?.if) { const k = ifFails(h, g.if); if (k) why = 'Not now (' + human(k) + ').'; } }
  if (!why && left <= 0) why = USED_WHY[per] || 'Used (' + usesLabel(per, n, 0) + ').';
  if (!why && per === 'out_of_combat' && h.cb && !overworld(h.cb)) why = 'Out of combat only.';
  if (!why && h.u && (h.u.downed || h.u.dead)) why = 'Downed.';
  // The AP and every resource the action declares, with the credit a repeat carries (Encore, items 729 and 737; a Brief).
  if (!why && scope !== 'story' && h.u) why = whyNot(h.cb, h.u, cost, { as: { type: 'combat/perk', id: h.key }, c: h.c });
  else if (!why) why = resWhyNot(cost.res, null, h.c); // no unit pays here (a story action): what the character holds (stims, Echo) is still asked for
  const lane = handlerOf(h.key)?.actions?.some((a) => a.id === d.id);
  return { id: h.key, actionId: d.id, itemId: h.itemId, kind: h.kind, label: d.label, text: d.text || h.info.text, ap, uses: { per, n, left, label: usesLabel(per, n, Math.min(n, left)) },
    target: d.target, range: d.range, scope: d.scope, why, engine: !!lane || defaultEngine(h.info, d), tab: tabOf(h), cls: h.info.classId,
    arm: !!d.arm, armed: h.u?.armed?.[h.key], tier: h.tier,
    ...(d.pick ? { options: pickOptions(h, d), pickMulti: d.pickMulti || 1 } : {}), ...(d.pickLabel ? { pickLabel: d.pickLabel } : {}), ...(d.choices ? { choices: d.choices(h) } : {}) };
}
/** The choices an action's pick offers this holder (ids are what args.choice takes). */
function pickOptions(h: Holder, d: ActionDef): { id: string; label: string }[] {
  const p = d.pick, c = h.c;
  if (Array.isArray(p)) return p.map((x) => ({ id: x, label: human(x) }));
  if (p === 'words') { const w = h.u?.mg?.words || [...new Set([...(c?.sigils || [])])]; return w.map((x: string) => ({ id: x, label: x.toUpperCase() })); }
  if (p === 'designs') return (c?.outbursts || []).map((x) => ({ id: x.id, label: x.name }));
  if (p === 'gamma') return SKILLS.filter((s: any) => s.slot === 'gamma').map((s) => ({ id: s.id, label: s.name }));
  if (p === 'felt') return ((c || charOfUnit(h.u))?.feelings || []).filter((x: string) => FEEL_NAME[x]).map((x: string) => ({ id: x, label: FEEL_NAME[x] })); // rules 1.33: Inspire's felt feelings
  if (p === 'squad') { const g = h.g ?? boundGame(); return (Object.values(g?.characters || {}) as Character[]).filter((x) => x.id !== c?.id && !x.dead).map((x) => ({ id: x.id, label: x.name })); }
  return [];
}
function defaultEngine(info: ItemInfo, d: ActionDef): boolean {
  void d; const own = info.bound ? info.effects.filter((e) => e?.op !== 'grant_action' && e?.when !== 'acted') : [];
  const nested = info.effects.filter((e) => e?.op === 'grant_action').flatMap((e) => (e.effects || []).filter((x: any) => x?.when !== 'acted'));
  const all = [...own, ...nested]; if (!all.length) return info.effects.some((e) => e?.op === 'grant_action' && (e.effects || []).some((x: any) => x?.when === 'acted')); // rules 1.33: all lifted to acted: the engine's
  return all.every((e) => { const g = genericOf(e?.op); return !!(g?.runs && g.runs(e, info)); });
}

function resolve(x: Who, id: string, actionId?: string): { h: Holder; d: ActionDef } | string {
  const key = keyOf(id), h = holdersOf(x).find((y) => y.key === key);
  if (!h) return 'You don\'t have that.';
  h.g = x.g ?? boundGame();
  const defs = actionDefs(h.info), d = actionId ? defs.find((a) => a.id === actionId) : defs[0];
  if (!d) return h.info.name + ' isn\'t an action.';
  return { h, d };
}
/** The id of the action an item's `combat/perk` names (its actionId, else the item's first action): what the trigger
 * `acted` carries as `action` (Classes 3.0 P2). null: the holder has no such item or action. */
export function perkActionId(x: Who, id: string, actionId?: string): string | null { const r = resolve(x, id, actionId); return typeof r === 'string' ? null : r.d.id; }
/** What the action would do (the UI and the reducer use the same truth). */
export function previewPerkAction(x: Who, id: string, args: ActionArgs & { actionId?: string } = {}, scope: ActionScope = x.cb && !overworld(x.cb) ? 'combat' : x.cb ? 'world' : 'story'): ActionPreview {
  const r = resolve(x, id, args.actionId); if (typeof r === 'string') return { ok: false, why: r, ap: 0, lines: [] };
  const { h, d } = r, e = entryOf(h, d, scope);
  if (!e) return { ok: false, why: d.scope.includes(scope) ? 'Not now.' : 'Not here.', ap: 0, lines: [] };
  const base: ActionPreview = { ok: !e.why, why: e.why || undefined, ap: e.ap, lines: [] };
  if (base.ok && (d.target === 'unit' || d.target === 'enemy' || d.target === 'ally') && !args.targetId && !d.arm) { base.ok = false; base.why = 'Pick a target.'; }
  if (base.ok && args.targetId && h.cb) {
    const t = h.cb.units.find((u) => u.id === args.targetId);
    if (!t || t.dead) { base.ok = false; base.why = 'Pick a living target.'; }
    else if (d.target === 'ally' && t.side !== h.u?.side) { base.ok = false; base.why = 'Pick an ally.'; }
    else if (d.target === 'enemy' && t.side === h.u?.side) { base.ok = false; base.why = 'Pick an enemy.'; }
    else if (d.range != null && h.u && distK(h.u.pos, t.pos) > d.range) { base.ok = false; base.why = 'Out of range (' + d.range + ' tiles).'; }
    else if (d.reach) { const why = d.reach(h, t); if (why) { base.ok = false; base.why = why; } } // P6: a door verb's reach (side, sight, its `if`)
  }
  if (base.ok && d.target === 'tile' && !args.tile) { base.ok = false; base.why = 'Pick a tile.'; }
  if (base.ok && d.target === 'text' && !String(args.text || '').trim()) { base.ok = false; base.why = 'Say what you do.'; }
  const p = d.preview ? d.preview(h, args) || {} : {};
  const out: ActionPreview = { ...base, ...p, lines: [...(p.lines || [])] };
  if (p.ap != null) out.ap = p.ap; if (p.ok === false) out.ok = false;
  if (!out.lines.length) out.lines.push(e.engine ? h.info.text : h.info.text + ' (the Narrator rules what the engine doesn\'t)');
  return out;
}
const distK = (a: string, b: string) => { const [ax, ay] = a.split(',').map(Number), [bx, by] = b.split(',').map(Number); return Math.max(Math.abs(ax - bx), Math.abs(ay - by)); };

/** Do it: checks the preview, spends AP and the use, runs the action. Returns an error (nothing changed), or null. */
export function runPerkAction(x: Who, id: string, args: ActionArgs & { actionId?: string }, rng: { state: number }, scope?: ActionScope): string | null {
  const sc: ActionScope = scope || (x.cb && !overworld(x.cb) ? 'combat' : x.cb ? 'world' : 'story');
  const r = resolve(x, id, args.actionId); if (typeof r === 'string') return r;
  const { h, d } = r;
  if (d.arm || args.arm) {
    if (!h.u) return 'Arm it in a fight.';
    const armed = (h.u.armed ||= {});
    if (armed[h.key] && (args.choice == null || armed[h.key].choice === args.choice)) { delete armed[h.key]; if (h.cb) say(h.cb, h.u.name + ' stands down ' + h.info.name + '.'); return null; }
    const e0 = entryOf(h, d, sc); if (!e0) return 'Not here.'; if (e0.why && !/^Needs \d/.test(e0.why)) return e0.why;
    armed[h.key] = { choice: args.choice ?? true, round: h.cb?.round ?? 0, targetId: args.targetId };
    if (h.cb) say(h.cb, h.u.name + ' readies ' + h.info.name + (args.choice ? ' (' + args.choice + ')' : '') + '.');
    return null;
  }
  const pv = previewPerkAction(x, id, args, sc); if (!pv.ok) return pv.why || 'Not now.';
  const per = d.uses?.per || 'at_will', n = d.uses?.n ?? 1;
  // THE payment: the previewed AP, and what the action declares of charge, MP, Supplies… for these arguments.
  const cost = { ...costOf(h, d, args), ap: pv.ap };
  if (h.u && sc !== 'story') { const no = whyNot(h.cb, h.u, { ...cost, ap: 0 }, { c: h.c }); if (no) return no; pay(h.cb, h.u, cost, { c: h.c }); }
  else { const no = resWhyNot(cost.res, null, h.c); if (no) return no; resPay(cost.res, null, h.c); } // a story action: no AP and no unit, but its declared resources are refused and taken all the same
  if (!uses(h).take(per, n, h.key + '#' + d.id)) return 'Used.';
  const g = h.g ?? boundGame(), had = g?.story?.rulings?.length || 0;
  const wasActing = actingAs(d.label); let err: string | null | void;
  try { err = d.run(h, args, rng); } finally { actingAs(wasActing); }
  // Rulings this use opened carry it, so a refusal gives it back.
  for (const r of (g?.story?.rulings || []).slice(had)) if (!r.use && r.charId === (h.c?.id || h.u?.charId)) r.use = { per, key: h.key + '#' + d.id };
  return err || null;
}

// ---------- toggles on existing actions ----------
export interface ToggleEntry { id: string; itemKey: string; label: string; why: string | null; on: boolean; preview: string | null; defaultOn: boolean }
/** The toggles a holder can set on an action type ('combat/attack', 'combat/move', …), with their state for these mods. */
export function togglesFor(x: Who, actionType: string, actx: any = {}, mods: string[] = []): ToggleEntry[] {
  const out: ToggleEntry[] = [];
  for (const h of holdersOf(x)) for (const t of togglesOf(h)) {
    if (!t.on.includes(actionType)) continue;
    const av = t.available ? t.available(h, actx) : true; if (av === false) continue;
    const id = h.key + '#' + t.id;
    out.push({ id, itemKey: h.key, label: t.label, why: typeof av === 'string' ? av : null, on: toggleState(t, id, mods), preview: t.preview ? t.preview(h, actx) : null, defaultOn: !!t.defaultOn });
  }
  return out;
}
// ---------- data toggles (Classes 3.0 P12) ----------
// An item's `toggles: [{id, name, on: [action types: 'combat/attack'…], if, default_on, effects}]` in its data: a flag
// on an existing action, shown by togglesFor like a lane's; its `if` (the holder's predicates) greys it; its effects are
// the item's own triggered effects with `if: {toggle: [id]}` (collect.ts liftToggles), so they run only while it is on
// for the action being resolved (cb.mods; the trigger `acted` carries them too).
/** A data toggle as the runtime's ToggleDef. */
function dataToggle(h: Holder, t: any): ToggleDef {
  return { id: t.id, label: t.name || human(t.id), on: [...(t.on || [])], defaultOn: !!t.default_on,
    ...(t.if ? { available: (hh: Holder) => { const k = ifFails({ ...hh, u: hh.u ?? h.u, cb: hh.cb ?? h.cb }, t.if); return k ? 'Not now (' + human(k) + ').' : true; } } : {}) };
}
/** Every toggle an item gives: its lane's, then its data's. */
export function togglesOf(h: Holder): ToggleDef[] {
  const lane = handlerOf(h.key)?.toggles || [], data = (rawItem(h.key)?.toggles || []) as any[];
  return data.length ? [...lane, ...data.map((t) => dataToggle(h, t))] : lane;
}
/** Is an item's toggle on for these mods (its key#id, its bare id, or its default unless turned off with '!')? */
export const toggleOnIn = (t: ToggleDef, key: string, mods: string[]) => toggleState(t, key + '#' + t.id, mods);
const toggleState = (t: ToggleDef, id: string, mods: string[]) => mods.includes(id) || mods.includes(t.id) || (!!t.defaultOn && !mods.includes('!' + id) && !mods.includes('!' + t.id));
/** Inside a hook: is this item's toggle on for the action being resolved (cb.mods, set by the reducer)? */
export function modOn(h: Holder, toggleId: string): boolean {
  const t = togglesOf(h).find((x) => x.id === toggleId); if (!t) return false;
  const mods: string[] = (h.cb as any)?.mods || (h.g?.story as any)?.mods || [];
  return toggleState(t, h.key + '#' + toggleId, mods);
}
/** Armed preset of this item on its unit (combat/perk {arm:true}), or undefined. */
export const armedOf = (h: Holder) => h.u?.armed?.[h.key];
/** Clear the holder's armed preset (an armed action fired or was cancelled). */
export const disarm = (h: Holder) => { if (h.u?.armed) delete h.u.armed[h.key]; };

// ---------- off-turn windows (plan 2.7) ----------
export interface WindowEntry { unitId: string; ap?: number; limit?: number; done?: number }
/** Give units a turn out of order (On My Mark, Supreme Command): active(cb) returns the queue's head until each has
 * taken its actions (limit, default 1) or declined. Their own AP is saved and given back after; ap sets the pool. */
export function openWindow(cb: Combat, kind: string, entries: WindowEntry[], by?: string) {
  const queue = entries.filter((e) => cb.units.some((u) => u.id === e.unitId && !u.dead && !u.downed));
  if (!queue.length) return;
  const saved: Record<string, number> = {};
  for (const e of queue) { const u = cb.units.find((x) => x.id === e.unitId)!; saved[u.id] = u.ap; if (e.ap != null) setAp(u, e.ap); }
  cb.window = { kind, queue, saved, by };
  say(cb, kind + ': ' + queue.map((e) => cb.units.find((u) => u.id === e.unitId)!.name).join(', ') + (queue.length === 1 ? ' acts now.' : ' act now.'));
}
/** After an action in a window: count it, and move on when the unit is done. */
export function windowStep(cb: Combat, declined = false) {
  const w = cb.window; if (!w) return;
  const head = w.queue[0]; if (!head) { closeWindow(cb); return; }
  head.done = (head.done || 0) + 1;
  const u = cb.units.find((x) => x.id === head.unitId);
  if (declined || !u || u.dead || u.downed || head.done >= (head.limit ?? 1) || u.ap <= 0) {
    if (u && head.ap != null) setAp(u, w.saved[u.id] ?? u.ap); // a pool given for the window is not kept
    w.queue.shift();
  }
  if (!w.queue.length) closeWindow(cb);
}
/** End the fight's open reaction or interrupt window. */
export function closeWindow(cb: Combat) { delete cb.window; }
export type { ToggleDef };
