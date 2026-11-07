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
import type { Character } from '../character';
import type { ActionArgs, ActionDef, ActionPreview, ActionScope, Holder, ItemInfo, ToggleDef, UseScope } from './types';
import { handlerOf, holdersOf, genericOf, boundGame } from './hooks';
import { keyOf } from './collect';
import { SKILLS } from '../data';
import { uses, scopeOf, usesLabel } from './uses';
import { note, postStory, pendRuling, actingAs } from './narrator';

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

/** The default actions of an item, from its data. */
export function defaultActions(info: ItemInfo): ActionDef[] {
  const grants = info.effects.filter((e) => e?.op === 'grant_action');
  const own = info.bound ? info.effects.filter((e) => e?.op !== 'grant_action') : [];
  const mk = (id: string, label: string, apRaw: any, usesRaw: string, effs: any[]): ActionDef => {
    const target = effs.map(TARGETING).find((t) => t !== 'none') || 'none', per = scopeOf(usesRaw);
    return {
      id, label, scope: per === 'out_of_combat' ? ['world', 'story'] : ['combat', 'world'], ap: (h) => apFromData(apRaw, h.u), uses: { per, n: 1 }, target,
      run: (h, args, rng) => defaultRun(h, effs, args, rng),
    };
  };
  if (grants.length) return grants.map((g, i) => mk(g.action || 'use' + i, grants.length > 1 ? info.name + ' · ' + human(g.action || 'use') : info.name, g.ap ?? info.ap, g.uses || info.uses, [...(g.effects || []), ...own]));
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
  if (h.cb) h.cb.log.push(what);
  const ask = (tgt ? 'on ' + tgt.name + '. ' : '') + (args.npc ? 'with ' + args.npc + '. ' : '') + (args.text ? '"' + args.text.slice(0, 160) + '" ' : '') + h.info.text;
  if (!h.cb) { const eid = postStory(h, (args.npc ? args.npc + ': ' : '') + (args.text || 'uses ' + h.info.name + '.')); const g = h.g ?? boundGame(); if (g && h.c) pendRuling(g, h.c, h.key, ask, eid || undefined); }
  else if (rest || !effs.length) note(h, ask);
  return null;
}

/** An item's actions: a lane's, when it registered any (they replace the data defaults), else the defaults. */
export function actionDefs(info: ItemInfo): ActionDef[] {
  const hd = handlerOf(info.key), lane = hd?.actions || [];
  return lane.length ? lane : hd?.noDefaultActions ? [] : defaultActions(info);
}

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
  tab: 'perks' | 'class'; cls?: string; arm?: boolean; armed?: any;
  tier: string;
  /** What the action's choice takes (chips in the client), how many at once, and the prompt for a pick or typed detail. */
  options?: { id: string; label: string }[]; pickMulti?: number; pickLabel?: string;
}
type Who = { u?: Unit | null; c?: Character | null; cb?: Combat | null; g?: any };
const overworld = (cb: Combat | null | undefined) => !!cb && (cb.overworld || cb.name === 'overworld');

/** Every action a holder's items give on this surface, available or greyed (hidden ones left out). */
export function perkActionsFor(x: Who, scope: ActionScope): PerkActionEntry[] {
  const out: PerkActionEntry[] = [];
  for (const h of holdersOf(x)) { h.g = x.g ?? boundGame(); for (const d of actionDefs(h.info)) { const e = entryOf(h, d, scope); if (e) out.push(e); } }
  return out;
}
/** Why a spent action can't be used, by its use window. */
const USED_WHY: Partial<Record<UseScope, string>> = { per_rest: 'Used until the next rest.', per_scene: 'Used until the next scene.', per_session: 'Used until the next session.', per_combat: 'Used this fight.', per_turn: 'Used this turn.', per_round: 'Used this round.', reaction: 'Used this round.', per_campaign: 'Used for this campaign.' };
function entryOf(h: Holder, d: ActionDef, scope: ActionScope): PerkActionEntry | null {
  if (!d.scope.includes(scope)) return null;
  const av = d.available ? d.available(h) : true; if (av === false) return null;
  const ap = typeof d.ap === 'function' ? d.ap(h, {}) : d.ap, per = d.uses?.per || 'at_will', n = d.uses?.n ?? 1;
  const left = uses(h).left(per, n, h.key + '#' + d.id);
  let why: string | null = typeof av === 'string' ? av : null;
  if (!why && left <= 0) why = USED_WHY[per] || 'Used (' + usesLabel(per, n, 0) + ').';
  if (!why && per === 'out_of_combat' && h.cb && !overworld(h.cb)) why = 'Out of combat only.';
  if (!why && h.u && (h.u.downed || h.u.dead)) why = 'Downed.';
  if (!why && scope !== 'story' && h.u && h.u.ap < ap) why = 'Needs ' + ap + ' AP.';
  const lane = handlerOf(h.key)?.actions?.some((a) => a.id === d.id);
  return { id: h.key, actionId: d.id, itemId: h.itemId, kind: h.kind, label: d.label, text: d.text || h.info.text, ap, uses: { per, n, left, label: usesLabel(per, n, Math.min(n, left)) },
    target: d.target, range: d.range, scope: d.scope, why, engine: !!lane || defaultEngine(h.info, d), tab: h.kind === 'class' ? 'class' : 'perks', cls: h.info.classId,
    arm: !!d.arm, armed: h.u?.armed?.[h.key], tier: h.tier,
    ...(d.pick ? { options: pickOptions(h, d), pickMulti: d.pickMulti || 1 } : {}), ...(d.pickLabel ? { pickLabel: d.pickLabel } : {}) };
}
/** The choices an action's pick offers this holder (ids are what args.choice takes). */
function pickOptions(h: Holder, d: ActionDef): { id: string; label: string }[] {
  const p = d.pick, c = h.c;
  if (Array.isArray(p)) return p.map((x) => ({ id: x, label: human(x) }));
  if (p === 'words') { const w = h.u?.mg?.words || [...new Set([...(c?.sigils || [])])]; return w.map((x: string) => ({ id: x, label: x.toUpperCase() })); }
  if (p === 'designs') return (c?.outbursts || []).map((x) => ({ id: x.id, label: x.name }));
  if (p === 'gamma') return SKILLS.filter((s: any) => s.slot === 'gamma').map((s) => ({ id: s.id, label: s.name }));
  if (p === 'squad') { const g = h.g ?? boundGame(); return (Object.values(g?.characters || {}) as Character[]).filter((x) => x.id !== c?.id && !x.dead).map((x) => ({ id: x.id, label: x.name })); }
  return [];
}
function defaultEngine(info: ItemInfo, d: ActionDef): boolean {
  void d; const own = info.bound ? info.effects.filter((e) => e?.op !== 'grant_action') : [];
  const nested = info.effects.filter((e) => e?.op === 'grant_action').flatMap((e) => e.effects || []);
  const all = [...own, ...nested]; if (!all.length) return false;
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
    if (armed[h.key] && (args.choice == null || armed[h.key].choice === args.choice)) { delete armed[h.key]; if (h.cb) h.cb.log.push(h.u.name + ' stands down ' + h.info.name + '.'); return null; }
    const e0 = entryOf(h, d, sc); if (!e0) return 'Not here.'; if (e0.why && !/^Needs \d/.test(e0.why)) return e0.why;
    armed[h.key] = { choice: args.choice ?? true, round: h.cb?.round ?? 0, targetId: args.targetId };
    if (h.cb) h.cb.log.push(h.u.name + ' readies ' + h.info.name + (args.choice ? ' (' + args.choice + ')' : '') + '.');
    return null;
  }
  const pv = previewPerkAction(x, id, args, sc); if (!pv.ok) return pv.why || 'Not now.';
  const per = d.uses?.per || 'at_will', n = d.uses?.n ?? 1;
  if (h.u && sc !== 'story') h.u.ap = Math.round((h.u.ap - pv.ap) * 10) / 10;
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
  for (const h of holdersOf(x)) for (const t of handlerOf(h.key)?.toggles || []) {
    if (!t.on.includes(actionType)) continue;
    const av = t.available ? t.available(h, actx) : true; if (av === false) continue;
    const id = h.key + '#' + t.id;
    out.push({ id, itemKey: h.key, label: t.label, why: typeof av === 'string' ? av : null, on: toggleState(t, id, mods), preview: t.preview ? t.preview(h, actx) : null, defaultOn: !!t.defaultOn });
  }
  return out;
}
const toggleState = (t: ToggleDef, id: string, mods: string[]) => mods.includes(id) || mods.includes(t.id) || (!!t.defaultOn && !mods.includes('!' + id) && !mods.includes('!' + t.id));
/** Inside a hook: is this item's toggle on for the action being resolved (cb.mods, set by the reducer)? */
export function modOn(h: Holder, toggleId: string): boolean {
  const t = (handlerOf(h.key)?.toggles || []).find((x) => x.id === toggleId); if (!t) return false;
  const mods: string[] = (h.cb as any)?.mods || (h.g?.story as any)?.mods || [];
  return toggleState(t, h.key + '#' + toggleId, mods);
}
/** Armed preset of this item on its unit (combat/perk {arm:true}), or undefined. */
export const armedOf = (h: Holder) => h.u?.armed?.[h.key];
export const disarm = (h: Holder) => { if (h.u?.armed) delete h.u.armed[h.key]; };

// ---------- off-turn windows (plan 2.7) ----------
export interface WindowEntry { unitId: string; ap?: number; limit?: number; done?: number }
/** Give units a turn out of order (On My Mark, Supreme Command): active(cb) returns the queue's head until each has
 * taken its actions (limit, default 1) or declined. Their own AP is saved and given back after; ap sets the pool. */
export function openWindow(cb: Combat, kind: string, entries: WindowEntry[], by?: string) {
  const queue = entries.filter((e) => cb.units.some((u) => u.id === e.unitId && !u.dead && !u.downed));
  if (!queue.length) return;
  const saved: Record<string, number> = {};
  for (const e of queue) { const u = cb.units.find((x) => x.id === e.unitId)!; saved[u.id] = u.ap; if (e.ap != null) u.ap = e.ap; }
  cb.window = { kind, queue, saved, by };
  cb.log.push(kind + ': ' + queue.map((e) => cb.units.find((u) => u.id === e.unitId)!.name).join(', ') + (queue.length === 1 ? ' acts now.' : ' act now.'));
}
/** After an action in a window: count it, and move on when the unit is done. */
export function windowStep(cb: Combat, declined = false) {
  const w = cb.window; if (!w) return;
  const head = w.queue[0]; if (!head) { closeWindow(cb); return; }
  head.done = (head.done || 0) + 1;
  const u = cb.units.find((x) => x.id === head.unitId);
  if (declined || !u || u.dead || u.downed || head.done >= (head.limit ?? 1) || u.ap <= 0) {
    if (u && head.ap != null) u.ap = w.saved[u.id] ?? u.ap; // a pool given for the window is not kept
    w.queue.shift();
  }
  if (!w.queue.length) closeWindow(cb);
}
export function closeWindow(cb: Combat) { delete cb.window; }
export type { ToggleDef };
