// World Play (rules revision 1.7; docs/design/world-play-spec.md): the map tells the story. Faces on every token,
// carrying people and things, caches, approaches with real consequences, hazards, triggers, talking without typing, a
// clear aim in every area (the HERE card and markers), and typed attempts rolled like buttons. The Narrator places
// things and writes their choices; the engine runs every roll, cost and effect here, deterministically (g.rng).
// The reducer (game.ts) calls in; game.ts's private helpers come through its `_world` object at call time.
import { SKILL, TN_LADDER, WEAPON } from './data';
import { type Character, mod, packOf, carriedKg, carryLimit, overweightKg } from './character';
import { type Combat, type Unit, dist, refOf, keyOf, standable, paths, hurtUnit, emitFx, moveUnit, objectsOf, pickUp, unitSees, visionOf } from './combat';
import { isCache, isPile, pileAt, dropOnTile, lootToPack, PILE } from './containers';
import { gearBonus, gearHas } from './character';
import { type MapObject, type Approach, type CacheItem, kindOf, blocksMove, makeObject, triedBy } from './objects';
import { type Hazard, type HazardKind, WORLD_PLAY, HAZARD, HAZARD_KINDS, HAZARD_LIMITS, hazardApproaches, hazardHit, hazardTn, hazardLiveAt } from './hazards';
import { applyCond, isCondition } from './magic';
import { songMod } from './music';
import { skillRollMod } from './effects/core';
import { bindGame } from './effects';
import { type Where, missionsOf, markObjective, objectiveOf, objectiveStatus, openObjectives } from './missions';
import { KINDS } from './tactics';
import { canon } from './memory';
import { type GameState, type Npc, type Check, type NarratorTurn, RuleError, _world, storyCb, positionsOf, npcsOf, storyObjects, zoneMap, apLeft, campaignOf, portraitFor, setStoryCond } from './game';

const WP: any = WORLD_PLAY;
const fail = (m: string): never => { throw new RuleError(m); };
const W = () => _world;

// ---------- types ----------
/** A trigger (rules 1.7): fires once, without a Narrator call, when its condition happens on the area map. */
export interface Trigger {
  id: string; zone: string; when: 'enter' | 'examine' | 'objective';
  /** enter: the tiles (keys); examine: the object id; objective: the objective key ("mission/objective"). */
  tiles?: string[]; objId?: string; objective?: string;
  then: 'spawn' | 'fight' | 'reveal';
  /** spawn and fight: people in the npcs[] place shape. */
  spawn?: NpcPlace[];
  /** fight: its difficulty and name. */
  difficulty?: string; name?: string;
  /** reveal: the ids it reveals (people, objects, hazards); none: everything hidden on and next to its tiles. */
  reveal?: string[];
  /** An in-world line shown to everyone when it fires (optional). */
  text?: string;
  fired?: boolean; firedBy?: string; firedSeq?: number;
}
export type NpcPlace = NonNullable<NarratorTurn['npcs']>[number];
/** What the engine ran since the Narrator's last turn, for its next prompt (rules 1.7: triggers fired, hazards hit,
 * approaches tried, carrying, searches, talk). Host only: views never carry it. */
export interface WorldEvent { seq: number; kind: 'trigger' | 'hazard' | 'approach' | 'carry' | 'search' | 'pickup' | 'talk' | 'alarm'; text: string }

// ---------- data ----------
export const KIND_DEFS: { id: string; name: string; weight_kg: number; avatar_pool: string | null }[] = WP.items;
export const WORLD_KINDS = KIND_DEFS.map((k) => k.id);
export const AVATAR_POOLS: Record<string, string[]> = WP.avatar_pools;
export const TALK_RANGE: number = WP.talk_range;
export const WORLD_AP: { carry: number; put_down: number; search: number; ask: number; attempt: number } = WP.ap;
/** Failed approach "hurt": damage by the approach's TN (PROVISIONAL, spec 14). */
export const FAIL_HURT: Record<number, number> = Object.fromEntries(Object.entries(WP.fail_hurt).map(([k, v]) => [Number(k), Number(v)]));
const SUCCESS = new Set<string>(WP.success), FAILS = new Set<string>(WP.fail);
/** Hazard kinds that may be hidden until spotted (PROVISIONAL, spec 14). */
export const HIDEABLE: HazardKind[] = ['minefield', 'radiation', 'gas'];
export const kindKg = (kind?: string) => KIND_DEFS.find((k) => k.id === (kind || 'human'))?.weight_kg ?? WP.other_kind_kg;
const ALL_AVATARS = new Set(Object.values(AVATAR_POOLS).flat());
const hash = (s: string) => { let h = 2166136261; for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 16777619); return h >>> 0; };

// ---------- faces ----------
/** Is this an art id a token may wear? A pool member, or a campaign portrait. */
export function validAvatar(g: GameState, id: unknown): boolean {
  if (typeof id !== 'string' || !id) return false;
  if (ALL_AVATARS.has(id)) return true;
  return Object.values(campaignOf(g)?.portraits || {}).some((v) => (Array.isArray(v) ? v.includes(id) : v === id));
}
/** The face a token wears (rules 1.7): its own avatar, else its portrait, else the campaign's portrait for its name,
 * else one from its kind's pool (fixed by its id, so every screen shows the same face); '' for a kind with no art. */
export function avatarOf(g: GameState, n: { id: string; name: string; kind?: string; avatar?: string; portrait?: string }): string {
  if (n.avatar) return n.avatar;
  if (n.portrait) return n.portrait;
  const p = portraitFor(g, n.name); if (p) return p;
  const pool = AVATAR_POOLS[KIND_DEFS.find((k) => k.id === (n.kind || 'human'))?.avatar_pool || (KIND_DEFS.some((k) => k.id === n.kind) ? '' : 'world')] || [];
  return pool.length ? pool[hash(n.id + '|' + n.name) % pool.length] : '';
}

// ---------- events for the Narrator ----------
export function worldEvent(g: GameState, kind: WorldEvent['kind'], text: string) {
  const list = (g.story.events ||= []); list.push({ seq: g.seq, kind, text: text.slice(0, 240) });
  if (list.length > HAZARD_LIMITS.events) list.splice(0, list.length - HAZARD_LIMITS.events);
}
/** The Narrator's turn consumed the events its call saw (later ones wait for the next turn). */
export function eventsSeen(g: GameState, began: number | undefined) {
  if (!g.story.events?.length) return;
  g.story.events = began == null ? [] : g.story.events.filter((e) => e.seq > began);
  if (!g.story.events.length) delete g.story.events;
}
function worldFx(g: GameState, k: string, data: Record<string, any>) {
  const list = (g.story.fx ||= []); list.push({ n: (g.story.fxSeq = (g.story.fxSeq || 0) + 1), k, ...data });
  if (list.length > 40) list.splice(0, list.length - 40);
}

// ---------- the area map's throwaway fight, for one effect on one character ----------
/** Run fn on the area map's fight (storyCb) for character c, then write everything back as an area-map action does:
 * HP and state, conditions, objects, hazards, fx and the log. */
export function onWorld(g: GameState, c: Character, fn: (cb: Combat, u: Unit) => void) {
  const cb = storyCb(g), u = cb.units.find((x) => x.charId === c.id); if (!u) return;
  const was = bindGame(g); try { fn(cb, u); } finally { bindGame(was); }
  writeBack(g, cb, c);
}
function writeBack(g: GameState, cb: Combat, c?: Character) {
  const I = W();
  for (const x of cb.units) if (x.charId) I.unitToCharacter(g, x, false, true);
  I.magicOut(g, cb, false);
  g.story.objects = cb.objects;
  I.storyFx(g, cb);
  for (const l of cb.log) I.push(g, { kind: 'system', text: l, act: true, ...(c ? { charId: c.id } : {}) });
  hazardEvents(g, cb);
}
/** Hazard hits of an action, as events for the Narrator. */
export function hazardEvents(g: GameState, cb: Combat) {
  for (const h of cb.hazardHits || []) worldEvent(g, 'hazard', h.name + (h.attempt ? ' failed against ' : ' set off ') + 'a ' + h.kind + ' at ' + refOf(h.at) + (h.dmg ? ' (' + h.dmg + ' damage)' : '') + (h.cond ? ', ' + h.cond : '') + '.');
  delete cb.hazardHits;
}

// ---------- tiles ----------
/** A free tile on the area map at or near `from` (nobody standing there, nothing blocking), or null. */
export function freeNear(g: GameState, from: string, exclude: Set<string> = new Set(), maxR = 6): string | null {
  const map = zoneMap(g), pos = positionsOf(g), taken = new Set([...Object.values(pos), ...npcsOf(g).map((n) => n.pos), ...exclude]);
  const blocked = new Set(storyObjects(g).filter(blocksMove).map((o) => o.pos));
  const ok = (k: string) => standable(map, k) && !taken.has(k) && !blocked.has(k);
  const [x0, y0] = from.split(',').map(Number);
  for (let r = 0; r <= maxR; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue; const k = (x0 + dx) + ',' + (y0 + dy); if (ok(k)) return k; }
  return null;
}
/** Grid references or tile keys, or a rectangle from–to, as tile keys on this map (solid tiles dropped). */
export function areaTiles(g: GameState, a: { tiles?: string[]; rect?: { from: string; to: string } | null }, max = HAZARD_LIMITS.hazard_tiles): string[] {
  const map = zoneMap(g), out = new Set<string>(), key = (t: string) => (/^\d+,\d+$/.test(t) ? t : keyOf(t, map));
  for (const t of (Array.isArray(a.tiles) ? a.tiles : []).slice(0, max)) { const k = key(String(t || '')); if (k && !map.solid.includes(k)) out.add(k); }
  if (a.rect && a.rect.from && a.rect.to) {
    const p = key(String(a.rect.from)), q = key(String(a.rect.to));
    if (p && q) { const [x1, y1] = p.split(',').map(Number), [x2, y2] = q.split(',').map(Number);
      for (let y = Math.min(y1, y2); y <= Math.max(y1, y2); y++) for (let x = Math.min(x1, x2); x <= Math.max(x1, x2); x++) { const k = x + ',' + y; if (x < map.w && y < map.h && !map.solid.includes(k)) out.add(k); if (out.size >= max) break; } }
  }
  return [...out].slice(0, max);
}

// ---------- hazards on the story map ----------
export const zoneHazards = (g: GameState, zone = zoneMap(g).id): Hazard[] => (g.story.hazards || []).filter((h) => h.zone === zone);
/** The hazards of the map a fight or the area map is on (a fight's own copy while it lasts). */
export const liveHazards = (g: GameState): Hazard[] => (g.phase === 'combat' && g.combat ? g.combat.hazards || [] : zoneHazards(g));
/** Write a map's hazards back into the story (the fight's copy after a fight; the area map's own after an action). */
export function setZoneHazards(g: GameState, zone: string, list: Hazard[]) {
  if (!g.story.hazards && !list.length) return;
  g.story.hazards = [...(g.story.hazards || []).filter((h) => h.zone !== zone), ...list];
}
/** The Narrator's (and the Proving Ground's) hazards[] entry: place, update or remove. Invalid entries do nothing. */
export function applyHazardOp(g: GameState, op: NonNullable<NarratorTurn['hazards']>[number]): Hazard | null {
  if (!op || typeof op !== 'object') return null;
  const zone = zoneMap(g).id, list = (g.story.hazards ||= []);
  const h = op.id ? list.find((x) => x.id === op.id) : undefined;
  if (op.action === 'remove') { if (h) { g.story.hazards = list.filter((x) => x !== h); if (!h.hidden) worldFx(g, 'hazard_gone', { id: h.id, tiles: h.tiles, why: 'removed' }); } return null; }
  if (op.action === 'update') {
    if (!h) return null;
    if (op.hidden === false) h.hidden = false; if (op.name) h.name = String(op.name).slice(0, 60); if (op.text) h.text = String(op.text).slice(0, 300);
    if (op.severity === 'light' || op.severity === 'heavy') { h.severity = op.severity; h.approaches = hazardApproaches(h.kind, h.severity).map((a, i) => ({ ...a, tries: h.approaches[i]?.tries || [] })); }
    return h;
  }
  const kind = String(op.kind || '') as HazardKind; if (!HAZARD_KINDS.includes(kind)) return null;
  if (zoneHazards(g, zone).length >= HAZARD_LIMITS.hazards_per_zone) return null;
  const severity = op.severity === 'heavy' ? 'heavy' : 'light', tiles = areaTiles(g, op);
  if (!tiles.length) return null;
  const hz: Hazard = { id: 'hz' + (++g.seq), kind, severity, zone, tiles, ...(op.name ? { name: String(op.name).slice(0, 60) } : {}), ...(op.text ? { text: String(op.text).slice(0, 300) } : {}),
    ...(op.hidden && HIDEABLE.includes(kind) ? { hidden: true } : {}), approaches: hazardApproaches(kind, severity) };
  list.push(hz);
  if (!hz.hidden) { W().push(g, { kind: 'system', text: (hz.name || HAZARD[kind].name) + ' (' + severity + ') at ' + refOf(tiles[0]) + (tiles.length > 1 ? ' +' + (tiles.length - 1) + ' tiles' : '') + '.' }); worldFx(g, 'hazard_placed', { id: hz.id, kind, severity, tiles }); }
  return hz;
}

// ---------- triggers ----------
export const zoneTriggers = (g: GameState, zone = zoneMap(g).id): Trigger[] => (g.story.triggers || []).filter((t) => t.zone === zone);
const cleanPlace = (p: any): NpcPlace | null => (p && typeof p === 'object' && p.name ? { ...p, action: 'place' } : null);
export function applyTriggerOp(g: GameState, op: NonNullable<NarratorTurn['triggers']>[number]): Trigger | null {
  if (!op || typeof op !== 'object') return null;
  const list = (g.story.triggers ||= []);
  if (op.action === 'remove') { g.story.triggers = list.filter((t) => t.id !== op.id); return null; }
  const when = op.when, then = op.then;
  if (!['enter', 'examine', 'objective'].includes(when as string) || !['spawn', 'fight', 'reveal'].includes(then as string)) return null;
  const zone = zoneMap(g).id; if (zoneTriggers(g, zone).filter((t) => !t.fired).length >= HAZARD_LIMITS.triggers_per_zone) return null;
  const t: Trigger = { id: 'tg' + (++g.seq), zone, when: when as Trigger['when'], then: then as Trigger['then'] };
  if (when === 'enter') { t.tiles = areaTiles(g, op, 64); if (!t.tiles.length) return null; }
  if (when === 'examine') { const o = storyObjects(g).find((x) => x.id === op.objId); if (!o) return null; t.objId = o.id; }
  if (when === 'objective') { const o = objectiveOf(g, String(op.objective || '')); if (!o) return null; t.objective = o.key; }
  if (then === 'spawn' || then === 'fight') { t.spawn = (Array.isArray(op.spawn) ? op.spawn : []).map(cleanPlace).filter(Boolean).slice(0, HAZARD_LIMITS.spawn) as NpcPlace[]; if (then === 'spawn' && !t.spawn.length) return null; }
  if (then === 'fight') { t.difficulty = ['easy', 'standard', 'hard', 'boss'].includes(String(op.difficulty)) ? String(op.difficulty) : 'standard'; if (op.name) t.name = String(op.name).slice(0, 60); }
  if (then === 'reveal' && Array.isArray(op.reveal)) t.reveal = op.reveal.filter((x: any) => typeof x === 'string').slice(0, 12);
  if (op.text) t.text = String(op.text).slice(0, 300);
  list.push(t); return t;
}
/** Fire one trigger (once). Spawns, starts the fight, or reveals; the Narrator narrates it next turn. */
export function fireTrigger(g: GameState, t: Trigger, by?: Character) {
  if (t.fired) return;
  t.fired = true; t.firedSeq = g.seq; if (by) t.firedBy = by.id;
  const I = W(), at = t.tiles?.[0] || (t.objId ? storyObjects(g).find((o) => o.id === t.objId)?.pos : undefined);
  if (t.text) I.push(g, { kind: 'system', text: t.text });
  const placed: string[] = [];
  if (t.then === 'spawn' || t.then === 'fight') for (const p of t.spawn || []) {
    const before = npcsOf(g).length; I.applyNpcOp(g, { ...p, action: 'place', ...(t.then === 'fight' ? { side: 'hostile' } : {}), ...(p.at ? {} : { at: at ? refOf(freeNear(g, at) || at) : '' }) });
    if (npcsOf(g).length > before) placed.push(npcsOf(g)[npcsOf(g).length - 1].id);
  }
  if (t.then === 'reveal') { if (t.reveal?.length) revealIds(g, t.reveal, 'a trigger'); else for (const k of t.tiles || (at ? [at] : [])) revealNear(g, k, 1, 'a trigger'); }
  worldFx(g, 'trigger', { id: t.id, then: t.then, at: at || null, spawned: placed });
  worldEvent(g, 'trigger', 'Trigger ' + t.id + ' (' + t.when + (by ? ', by ' + by.name : '') + ') fired: ' + (t.then === 'reveal' ? 'revealed what was hidden' : t.then + (placed.length ? ' ' + placed.map((id) => npcsOf(g).find((n) => n.id === id)?.name + ' (' + id + ')').join(', ') : '')) + (t.text ? '. Shown: "' + t.text + '"' : '') + '.');
  g.story.needs = true;
  if (t.then === 'fight' && g.phase === 'story') I.startStoryFight(g, { name: t.name || 'Ambush', difficulty: t.difficulty || 'standard', enemies: [] });
}
/** A party member walked these tiles: enter triggers there fire (in order; a fight stops the rest). */
export function enterTriggers(g: GameState, c: Character, tiles: string[]) {
  if (!g.story.triggers?.length || g.phase !== 'story') return;
  for (const t of zoneTriggers(g)) { if (g.phase !== 'story') return; if (!t.fired && t.when === 'enter' && t.tiles?.some((k) => tiles.includes(k))) fireTrigger(g, t, c); }
}
/** Someone dealt with an object (examine, search, an attempt): its examine triggers fire. */
export function examineTriggers(g: GameState, c: Character, objId: string) {
  if (!g.story.triggers?.length || g.phase !== 'story') return;
  for (const t of zoneTriggers(g)) { if (g.phase !== 'story') return; if (!t.fired && t.when === 'examine' && t.objId === objId) fireTrigger(g, t, c); }
}
/** Objectives done: their triggers fire (after every action; only on the area map). */
export function objectiveTriggers(g: GameState) {
  if (!g.story.triggers?.length || g.phase !== 'story') return;
  for (const t of zoneTriggers(g)) { if (g.phase !== 'story') return; if (!t.fired && t.when === 'objective' && t.objective && objectiveStatus(g, t.objective) === 'done') fireTrigger(g, t); }
}

// ---------- reveal and alarm ----------
function revealNpc(g: GameState, n: Npc, why: string) { if (!n.hidden) return; delete n.hidden; W().push(g, { kind: 'system', text: 'Revealed (' + why + '): ' + n.name + ' at ' + refOf(n.pos) + '.' }); }
export function revealIds(g: GameState, ids: string[], why: string) {
  for (const id of ids) {
    const n = npcsOf(g).find((x) => x.id === id); if (n) revealNpc(g, n, why);
    const o = storyObjects(g).find((x) => x.id === id); if (o?.hidden) { o.hidden = false; W().push(g, { kind: 'system', text: 'Revealed (' + why + '): ' + o.name + ' at ' + refOf(o.pos) + '.' }); }
    const h = (g.story.hazards || []).find((x) => x.id === id); if (h?.hidden) { h.hidden = false; worldFx(g, 'hazard_spotted', { id: h.id, kind: h.kind, at: h.tiles[0], tiles: [...h.tiles], how: 'reveal' }); W().push(g, { kind: 'system', text: 'Revealed (' + why + '): ' + (h.name || HAZARD[h.kind].name) + ' at ' + refOf(h.tiles[0]) + '.' }); }
  }
}
/** Reveal every hidden token, object and hazard within r tiles of k. */
export function revealNear(g: GameState, k: string, r: number, why: string) {
  const ids = [...npcsOf(g).filter((n) => n.hidden && dist(n.pos, k) <= r).map((n) => n.id), ...storyObjects(g).filter((o) => o.hidden && dist(o.pos, k) <= r).map((o) => o.id),
    ...zoneHazards(g).filter((h) => h.hidden && h.tiles.some((t) => dist(t, k) <= r)).map((h) => h.id)];
  revealIds(g, ids, why);
}
/** An alarm (a failed approach): every hidden hostile in the zone is revealed and alerted (no longer unaware). */
export function raiseAlarm(g: GameState, at: string, c: Character) {
  const woke = npcsOf(g).filter((n) => n.side === 'hostile' && (n.hidden || (n.tags || []).includes('unaware')));
  for (const n of woke) { delete n.hidden; n.tags = (n.tags || []).filter((t) => t !== 'unaware'); n.alerted = true; }
  W().push(g, { kind: 'system', text: '⚠ An alarm goes up at ' + refOf(at) + (woke.length ? ': ' + woke.map((n) => n.name + ' at ' + refOf(n.pos)).join(', ') + '.' : '.') });
  worldFx(g, 'alarm', { at, by: 'pc-' + c.id, revealed: woke.map((n) => n.id) });
  worldEvent(g, 'alarm', c.name + ' raised the alarm at ' + refOf(at) + (woke.length ? '; alerted: ' + woke.map((n) => n.name + ' (' + n.id + ')').join(', ') : '') + '. You may start the fight now.');
  g.story.needs = true;
}

// ---------- carrying ----------
/** May this token be picked up? Not hostile, or a prisoner, or at 0 HP; and seen. */
export const carryable = (n: Npc) => !n.hidden && (n.side !== 'hostile' || !!n.prisoner || (n.hp != null && n.hp <= 0));
/** A character's carried creatures, for the inventory. */
export function carriedOf(c: Character): { id: string; name: string; kind: string; avatar: string; kg: number; side: string; tier: string }[] {
  return (c.carried || []).map((x) => ({ id: x.npc.id, name: x.npc.name, kind: x.npc.kind || 'human', avatar: x.npc.avatar || x.npc.portrait || '', kg: x.kg, side: x.npc.ally ? 'ally' : x.npc.side, tier: x.npc.tier }));
}
/** Pick a token up (free: the Narrator's carry, no AP and no adjacency). */
export function carry(g: GameState, c: Character, npcId: string, free = false) {
  const n = npcsOf(g).find((x) => x.id === npcId || (!!npcId && x.name.toLowerCase() === String(npcId).toLowerCase()));
  if (!n || (n.hidden && !free)) fail('Nobody like that here.');
  if (c.dead || c.hp <= 0) fail(c.name + ' can\'t carry anyone now.');
  if (!free) {
    if (!carryable(n!)) fail(n!.name + ' won\'t let you: only someone willing, a prisoner or someone down can be carried.');
    const at = positionsOf(g)[c.id]; if (!at || dist(at, n!.pos) > 1) fail('Step next to ' + n!.name + ' first.');
    if (apLeft(g, c) < WORLD_AP.carry) fail('Needs ' + WORLD_AP.carry + ' AP.');
    W().spendAp(g, c, WORLD_AP.carry);
  }
  const avatar = avatarOf(g, n!), kg = kindKg(n!.kind), from = n!.pos;
  g.story.npcs = npcsOf(g).filter((x) => x !== n);
  const tok: any = { ...n!, avatar }; delete tok.pos;
  (c.carried ||= []).push({ npc: tok, kg });
  W().push(g, { kind: 'system', text: c.name + ' picks up ' + n!.name + ' (' + kg + ' kg)' + (overweightKg(c) > 0 ? ': overburdened, ' + Math.round(carriedKg(c).total) + ' of ' + carryLimit(c) + ' kg' : '') + '.', act: true, charId: c.id });
  worldFx(g, 'carry', { unit: 'pc-' + c.id, target: n!.id, from, name: n!.name, kind: n!.kind || 'human', avatar, kg });
  worldEvent(g, 'carry', c.name + ' picked up ' + n!.name + ' (' + n!.id + ').');
}
/** Put a carried creature down on `to` (a grid reference or key; empty: the nearest free tile). */
export function putDown(g: GameState, c: Character, id: string, to?: string, free = false): string {
  const list = c.carried || [], i = list.findIndex((x) => x.npc.id === id || (!!id && x.npc.name.toLowerCase() === String(id).toLowerCase()));
  if (i < 0) fail(c.name + ' isn\'t carrying that.');
  const at = positionsOf(g)[c.id], map = zoneMap(g); if (!at) fail(c.name + ' isn\'t on the map.');
  let k: string | null = null;
  if (to) {
    k = /^\d+,\d+$/.test(to) ? to : keyOf(to, map);
    if (!k) fail('No such tile.');
    if (!free && dist(at!, k!) > 1) fail('Put them down next to you.');
    if (freeNear(g, k!, new Set(), 0) !== k) { if (!free) fail('That tile isn\'t free.'); k = null; }
  }
  k ||= freeNear(g, at!, new Set([at!])); if (!k) fail('No free tile near ' + c.name + '.');
  if (!free) { if (apLeft(g, c) < WORLD_AP.put_down) fail('Needs ' + WORLD_AP.put_down + ' AP.'); W().spendAp(g, c, WORLD_AP.put_down); }
  const [x] = list.splice(i, 1); if (!list.length) delete c.carried;
  npcsOf(g).push({ ...x.npc, pos: k! });
  W().push(g, { kind: 'system', text: c.name + ' puts ' + x.npc.name + ' down at ' + refOf(k!) + '.', act: true, charId: c.id });
  worldFx(g, 'put_down', { unit: 'pc-' + c.id, target: x.npc.id, at: k, name: x.npc.name, kind: x.npc.kind || 'human', avatar: x.npc.avatar || '' });
  worldEvent(g, 'carry', c.name + ' put ' + x.npc.name + ' (' + x.npc.id + ') down at ' + refOf(k!) + '.');
  return k!;
}
/** Downed carriers drop what they carry: on the area map as tokens at once; in a fight onto the floor (cb.dropped),
 * tokens again when it ends. Runs after every action. */
export function dropFromDowned(g: GameState) {
  if (g.phase === 'story') {
    for (const c of Object.values(g.characters)) {
      if (!c.carried?.length || (c.hp > 0 && !c.dead)) continue;
      const at = positionsOf(g)[c.id] || zoneMap(g).pcStart[0];
      for (const x of [...c.carried]) { const k = freeNear(g, at, new Set([at])) || at; npcsOf(g).push({ ...x.npc, pos: k }); W().push(g, { kind: 'system', text: c.name + ' goes down and drops ' + x.npc.name + ' at ' + refOf(k) + '.', charId: c.id }); worldFx(g, 'drop', { unit: 'pc-' + c.id, target: x.npc.id, at: k, name: x.npc.name }); worldEvent(g, 'carry', c.name + ' was Downed and dropped ' + x.npc.name + '.'); }
      delete c.carried;
    }
    return;
  }
  const cb = g.combat; if (!cb || g.phase !== 'combat') return;
  for (const u of cb.units) {
    const c = u.charId ? g.characters[u.charId] : null; if (!c?.carried?.length || !(u.downed || u.dead)) continue;
    const taken = new Set([...cb.units.filter((x) => !x.dead).map((x) => x.pos), ...(cb.dropped || []).map((d) => d.at)]), blocked = new Set(objectsOf(cb).filter(blocksMove).map((o) => o.pos));
    const near = () => { const [x0, y0] = u.pos.split(',').map(Number); for (let r = 1; r < 6; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) { const k = (x0 + dx) + ',' + (y0 + dy); if (standable(cb.map, k) && !taken.has(k) && !blocked.has(k)) return k; } return u.pos; };
    for (const x of [...c.carried]) { const k = near(); taken.add(k); (cb.dropped ||= []).push({ npc: x.npc, at: k, by: c.id }); emitFx(cb, 'drop', { unit: u.id, target: x.npc.id, at: k, name: x.npc.name }); cb.log.push(c.name + ' goes down and drops ' + x.npc.name + ' at ' + refOf(k) + '.'); }
    delete c.carried;
  }
}
/** A fight ends: what Downed carriers dropped is back on the map as tokens, where it fell (or the nearest free tile). */
export function landDropped(g: GameState, cb: Combat) {
  for (const d of cb.dropped || []) { const k = freeNear(g, d.at) || d.at; npcsOf(g).push({ ...d.npc, pos: k }); }
  delete cb.dropped;
}

// ---------- caches ----------
/** Clean a cache's items (the loot shape). */
export function cleanItems(list: any): CacheItem[] {
  return (Array.isArray(list) ? list : []).filter((x) => x && typeof x === 'object' && (x.item || x.name)).slice(0, HAZARD_LIMITS.cache_items).map((x) => ({
    item: String(x.item || '').slice(0, 60), qty: Math.max(1, Math.min(20, Math.round(Number(x.qty) || 1))),
    ...(x.rarity ? { rarity: String(x.rarity) } : {}), ...(x.name ? { name: String(x.name).slice(0, 60) } : {}), ...(x.text ? { text: String(x.text).slice(0, 200) } : {}), ...(x.note ? { note: String(x.note).slice(0, 40) } : {}) }));
}
const jammed = (g: GameState, o: MapObject) => o.jam != null && o.jam === g.story.scene.n;
/** Everything in a cache goes to c's pack (a search, or a loot success). Returns how many entries were given. */
function takeItems(g: GameState, c: Character, o: MapObject): number {
  const items = o.items || []; for (const it of items) W().giveLoot(g, { charId: c.id, item: it.item, qty: it.qty, rarity: it.rarity as any, name: it.name, text: it.text, note: it.note });
  o.items = []; o.searched = true; return items.length;
}
/** Search a cache (1 AP, adjacent): its items into the pack. In a fight, the unit's AP pays (cb set). */
export function search(g: GameState, c: Character, objId: string, cb?: Combat, u?: Unit) {
  const objs = cb ? objectsOf(cb) : storyObjects(g), o = objs.find((x) => x.id === objId);
  // Rules 1.9: searching a pile (a body's drops) is picking up everything (1 AP, item 674).
  if (o && isPile(o) && !o.hidden) { if (cb && u) { const e = pickUp(cb, u, o.pos, null, c); if (e) fail(e); return; } pickupWorld(g, c, o.pos); return; }
  if (!o || o.hidden || !isCache(o) && o.kind !== 'cache') fail('Nothing to search there.');
  const at = u ? u.pos : positionsOf(g)[c.id]; if (!at || dist(at, o!.pos) > 1) fail('Walk up to it first.');
  if (o!.locked || jammed(g, o!)) fail(o!.name + ' is locked: try its approaches first.');
  if (!o!.items?.length) fail(o!.name + ' is empty.');
  if (cb && u) { if (u.ap < WORLD_AP.search) fail('Needs ' + WORLD_AP.search + ' AP.'); u.ap -= WORLD_AP.search; }
  else { if (apLeft(g, c) < WORLD_AP.search) fail('Needs ' + WORLD_AP.search + ' AP.'); W().spendAp(g, c, WORLD_AP.search); }
  const names = o!.items!.map((x) => (x.qty > 1 ? x.qty + ' × ' : '') + (x.name || (WEAPON[x.item]?.name) || x.item.replace(/_/g, ' '))).join(', ');
  const n = takeItems(g, c, o!);
  const line = c.name + ' searches the ' + o!.name.toLowerCase() + ' at ' + refOf(o!.pos) + '.';
  if (cb) { cb.log.push(line); emitFx(cb, 'search', { unit: u!.id, at: o!.pos, obj: o!.id, items: n }); }
  else { W().push(g, { kind: 'system', text: line, act: true, charId: c.id }); worldFx(g, 'search', { unit: 'pc-' + c.id, at: o!.pos, obj: o!.id, items: n }); }
  worldEvent(g, 'search', c.name + ' searched ' + o!.name + ' (' + o!.id + '): ' + names + '.');
  if (!cb) examineTriggers(g, c, o!.id);
}
/** What a player sees of a cache: its name and place, how many things it holds (not what), locked, searched. */
export function cacheView(g: GameState, objId: string) {
  const o = (g.phase === 'combat' && g.combat ? objectsOf(g.combat) : storyObjects(g)).find((x) => x.id === objId); if (!o || o.hidden) return null;
  const count = (o as any).itemCount ?? (o.items || []).length;
  return { id: o.id, name: o.name, kind: o.kind, pos: o.pos, ref: refOf(o.pos), count, empty: !count, locked: !!o.locked || jammed(g, o), searched: !!o.searched, approaches: o.approaches.length };
}

// ---------- piles (rules 1.9, World Play 1.1; containers.ts) ----------
/** Pick up on the area map (1 AP; item 674): the same pick-up as a fight's, run on the area map's fight and written
 * back after it, as every area-map action is. take: entry keys or indices; none: everything. */
export function pickupWorld(g: GameState, c: Character, tile: string, take?: (string | number)[] | null) {
  const cb = storyCb(g), u = cb.units.find((x) => x.charId === c.id); if (!u) fail(c.name + ' isn\'t on the map.');
  const before = u!.ap, was = bindGame(g); let err: string | null;
  try { err = pickUp(cb, u!, tile, take, c); } finally { bindGame(was); }
  if (err) fail(err);
  W().spendAp(g, c, before - u!.ap);
  const line = cb.log[cb.log.length - 1] || '';
  writeBack(g, cb, c);
  worldEvent(g, 'pickup', line);
}
/** The Narrator's ground[] entry (item 681): items in the loot shape (and mag:/rounds: ids) into the pile on that tile,
 * at most PILE.narrator_items_per_pile; hidden only hides a new pile, hidden false reveals one. Bad entries do nothing. */
export function applyGroundOp(g: GameState, op: NonNullable<NarratorTurn['ground']>[number]) {
  if (!op || typeof op !== 'object') return null;
  const map = zoneMap(g), at = String(op.at || ''), k = /^\d+,\d+$/.test(at) ? at : keyOf(at, map);
  if (!k) return null; const [x, y] = k.split(',').map(Number);
  if (x < 0 || y < 0 || x >= map.w || y >= map.h || map.solid.includes(k)) return null;
  const items = (Array.isArray(op.items) ? op.items : []).filter((it) => it && typeof it === 'object').slice(0, PILE.narrator_items_per_pile).flatMap((it) => lootToPack(it as any));
  if (!items.length) return null;
  const objs = storyObjects(g), had = pileAt(objs, k);
  const r = dropOnTile(objs, k, items, { hidden: !had && !!op.hidden, keepHidden: op.hidden !== false });
  if (op.hidden === false) r.pile.hidden = false;
  if (r.lost.length) W().push(g, { kind: 'system', text: 'The pile at ' + refOf(k) + ' is full: ' + r.lost.join(', ') + ' ' + (r.lost.length === 1 ? 'is' : 'are') + ' lost.' });
  return r.pile;
}
/** The party's shared sight on the area map (item 676): each standing character where it stands, with its Vision,
 * light and dark sight; the map's objects and the story's Sigil zones (smoke, light) as a fight would see them. */
function storySight(g: GameState): Combat {
  const pos = positionsOf(g), map = zoneMap(g);
  const units = Object.values(g.characters).filter((c) => pos[c.id]).map((c) => ({ id: 'pc-' + c.id, side: 'pc', pos: pos[c.id], vision: visionOf(c), light: gearBonus(c, 'light'), darkSight: gearHas(c, 'dark_sight'), dead: !!c.dead, downed: c.hp <= 0 })) as unknown as Unit[];
  const zones = !g.story.glyphMap || g.story.glyphMap === map.id ? g.story.zones || [] : [];
  return { map, units, objects: g.story.objects || [], zones } as unknown as Combat;
}
const partySees = (cb: Combat, side: 'pc' | 'foe', k: string) => cb.units.some((u) => u.side === side && !u.dead && !u.downed && unitSees(cb, u, k));
/** A player's view keeps a pile only on a tile its party can see right now (item 676); piles in other zones go. */
export function pileFog(g: GameState, v: GameState, side: 'pc' | 'foe') {
  const any = (l?: MapObject[]) => !!l && l.some(isPile);
  if (v.combat && g.combat && any(v.combat.objects)) { const cb = g.combat; v.combat = { ...v.combat, objects: v.combat.objects!.filter((o) => !isPile(o) || partySees(cb, side, o.pos)) }; }
  if (any(v.story.objects)) { const cb = storySight(g); v.story = { ...v.story, objects: v.story.objects!.filter((o) => !isPile(o) || partySees(cb, 'pc', o.pos)) }; }
  // A pile's fx (a drop, a death's drops, a pick-up's change) goes only to eyes that see its tile now, as the pile does
  // (review fix: an unseen enemy's reload gave its tile away).
  if (v.combat && g.combat && v.combat.fx?.some((e) => e.k === 'pile')) { const cb = g.combat; v.combat = { ...v.combat, fx: v.combat.fx.filter((e) => e.k !== 'pile' || partySees(cb, side, e.at)) }; }
  if (v.combat && g.combat?.dropLines?.length) { const cb = g.combat, hide = new Map(g.combat.dropLines.filter((d) => !partySees(cb, side, d.at)).map((d) => [d.line, d.name + ' falls; whatever it carried lies where it fell.']));
    v.combat = { ...v.combat, ...(hide.size ? { log: v.combat.log.map((l) => hide.get(l) ?? l) } : {}) }; delete (v.combat as any).dropLines; }
  if (v.story.fx?.some((e: any) => e.k === 'pile')) { const cb = storySight(g); v.story = { ...v.story, fx: v.story.fx!.filter((e: any) => e.k !== 'pile' || partySees(cb, 'pc', e.at)) }; }
  if (v.story.zoneObjects && Object.values(v.story.zoneObjects).some((l) => any(l))) v.story = { ...v.story, zoneObjects: Object.fromEntries(Object.entries(v.story.zoneObjects).map(([z, l]) => [z, l.filter((o) => !isPile(o))])) };
}

// ---------- approaches: objects, hazards and people ----------
type Target = { kind: 'obj'; o: MapObject } | { kind: 'hazard'; h: Hazard } | { kind: 'npc'; n: Npc };
function targetOf(g: GameState, id: string): Target | null {
  const o = storyObjects(g).find((x) => x.id === id); if (o) return { kind: 'obj', o };
  const h = zoneHazards(g).find((x) => x.id === id); if (h) return { kind: 'hazard', h };
  const n = npcsOf(g).find((x) => x.id === id || (!!id && x.name.toLowerCase() === String(id).toLowerCase())); if (n) return { kind: 'npc', n };
  return null;
}
const approachesOf = (t: Target): Approach[] => (t.kind === 'obj' ? t.o.approaches : t.kind === 'hazard' ? t.h.approaches : t.n.talk || []);
const nameOf = (t: Target) => (t.kind === 'obj' ? t.o.name : t.kind === 'hazard' ? t.h.name || HAZARD[t.h.kind].name : t.n.name);
const idOf = (t: Target) => (t.kind === 'obj' ? t.o.id : t.kind === 'hazard' ? t.h.id : t.n.id);
/** Where a target is, as seen from tile `from`: an object's or a person's tile; a hazard's nearest tile. */
function posOf(t: Target, from?: string): string { if (t.kind === 'obj') return t.o.pos; if (t.kind === 'npc') return t.n.pos; return from ? [...t.h.tiles].sort((a, b) => dist(a, from) - dist(b, from))[0] : t.h.tiles[0]; }
const hiddenT = (t: Target) => (t.kind === 'obj' ? !!t.o.hidden : t.kind === 'hazard' ? !!t.h.hidden : !!t.n.hidden);
const rangeOf = (t: Target) => (t.kind === 'npc' ? TALK_RANGE : 1);

/** The skill a 'best' approach rolls for this character: the highest modifier among its skills. */
function bestSkill(g: GameState, c: Character, skills: string[]): string {
  return [...skills].sort((a, b) => skillMod(g, c, b) - skillMod(g, c, a))[0];
}
const skillMod = (g: GameState, c: Character, s: string) => mod(c.skills[s] || 0) + songMod(g, c, s) + skillRollMod({ c }, s, { roll: 'check' }).add;
/** The odds a character passes a check (d20 + modifier vs TN; a natural 20 passes, a natural 1 fails): a preview,
 * without the per-check items the roll itself may add. */
export function previewOdds(g: GameState, c: Character, skills: string[], tn: number, pick?: 'best'): { skills: string[]; mod: number; chance: number } {
  const ss = (pick === 'best' ? [bestSkill(g, c, skills)] : skills).filter((s) => SKILL[s]); if (!ss.length) return { skills: [], mod: -2, chance: 0 };
  const ms = ss.map((s) => skillMod(g, c, s)), low = Math.min(...ms), li = ms.indexOf(low);
  const m = low + 2 * ss.filter((s, i) => i !== li && (c.skills[s] || 0) > 0).length;
  let ok = 0; for (let f = 1; f <= 20; f++) if (f === 20 || (f !== 1 && f + m >= tn)) ok++;
  return { skills: ss, mod: m, chance: ok / 20 };
}

/** The common checks for a player's area-map choice (round open, their character up, nothing else to roll first). */
function readyToAct(g: GameState, c: Character | undefined, by: string, ap: number) {
  if (!c || (c.owner !== by)) fail('Not your character.');
  if (g.phase !== 'story') fail(g.phase === 'combat' ? 'Deal with it after the fight.' : 'The session hasn\'t started.');
  if (g.story.await !== 'players') fail('Wait for the round to open.');
  if (g.story.ended?.[c!.id]) fail(c!.name + ' has ended the turn.');
  if (c!.dead) fail('The dead stay where they fell.');
  if (c!.hp <= 0) fail(c!.name + ' is Downed: an ally\'s stim, or the Narrator, gets them up.');
  if (g.checks.some((k) => !k.done && k.poi && g.characters[k.charId]?.owner === by)) fail('Roll your attempt first.');
  if (apLeft(g, c!) < ap) fail('Needs ' + ap + ' AP (' + apLeft(g, c!) + ' left).');
}
/** A player tries an approach on an object, a hazard or a person (2 AP): the engine rolls it like the Narrator's check
 * (in the Proving Ground at once). idx is 0-based. */
export function tryApproach(g: GameState, c: Character, by: string, targetId: string, idx: number) {
  readyToAct(g, c, by, WORLD_AP.attempt);
  const t = targetOf(g, targetId); if (!t || hiddenT(t)) fail('Nothing like that here.');
  const at = positionsOf(g)[c.id], p = posOf(t!, at);
  if (dist(at, p) > rangeOf(t!)) fail(t!.kind === 'npc' ? 'Get within ' + TALK_RANGE + ' tiles of ' + t!.n.name + ' first.' : 'Walk up to it first (stand on it or next to it).');
  const list = approachesOf(t!), ap = list[idx]; if (!ap || ap.gone) fail('No such approach.');
  if (t!.kind === 'obj' && t!.o.resolved) fail('That\'s already dealt with.');
  if (t!.kind === 'obj' && jammed(g, t!.o)) fail(t!.o.name + ' is jammed for now.');
  if (triedBy(ap!, c.id)) fail(c.name + ' already tried that.');
  const skills = (ap!.pick === 'best' ? [bestSkill(g, c, ap!.skills)] : ap!.skills).filter((s) => SKILL[s]); if (!skills.length) fail('That approach has no skill to roll.');
  const I = W();
  I.push(g, { kind: 'player', who: by, text: c.name + (t!.kind === 'npc' ? ' tries with ' + t!.n.name + ': ' : ' tries: ') + ap!.label + ' (' + nameOf(t!) + ', ' + refOf(p) + ').', head: c.name });
  I.spendAp(g, c, WORLD_AP.attempt);
  const ck: Check = { id: I.id(g, 'k'), charId: c.id, skills, tn: ap!.tn, stakes: ap!.stakes || ap!.label, done: false, poi: { objId: idOf(t!), idx, kind: t!.kind }, ...(t!.kind === 'npc' ? { target: t!.n.id, tags: ['dialogue'] } : {}) };
  g.checks.push(ck);
  if (t!.kind === 'obj') examineTriggers(g, c, t!.o.id);
  if (g.sandbox && g.phase === 'story') { I.rollCheck(g, ck, c, false); ck.done = true; approachResult(g, ck); g.checks = g.checks.filter((x) => x !== ck); }
}
/** A rolled attempt: record it, then apply the approach's success or failure effect (rules 1.7). */
export function approachResult(g: GameState, ck: Check) {
  const c = g.characters[ck.charId], t = ck.poi ? targetOf(g, ck.poi.objId) : null, ap = t ? approachesOf(t)[ck.poi!.idx] : null, I = W();
  g.story.needs = true; // the Narrator narrates the attempt
  if (!t || !ap || !c) { I.closeRoundIfDone(g); return; }
  const ok = !!ck.roll?.ok, nm = nameOf(t), at = positionsOf(g)[c.id] || posOf(t), p = posOf(t, at);
  ap.tries.push({ charId: c.id, name: c.name, ok, total: ck.roll?.total || 0, scene: g.story.scene.n });
  canon(g, c.name + (ok ? ' succeeded at' : ' failed at') + ' "' + ap.label + '" on ' + nm + ' (scene ' + g.story.scene.n + ').', [c.name, nm], 2);
  let effect = '';
  if (ok) effect = success(g, c, t, ap, p);
  else effect = failure(g, c, t, ap, p);
  worldFx(g, 'approach', { unit: 'pc-' + c.id, target: idOf(t), kind: t.kind, at: p, label: ap.label, ok, effect: effect || null });
  worldEvent(g, 'approach', c.name + ' ' + (ok ? 'succeeded' : 'failed') + ' at "' + ap.label + '" on ' + nm + ' (' + idOf(t) + ')' + (effect ? ': ' + effect : '') + '.');
  I.closeRoundIfDone(g);
}
function success(g: GameState, c: Character, t: Target, ap: Approach, p: string): string {
  const I = W(), say = (x: string) => I.push(g, { kind: 'system', text: x });
  const s = ap.success;
  if (s === 'advance') { const key = ap.objective || ''; const done = markObjective(g, key, 'done', (e) => I.push(g, e)); return done ? 'objective ' + key + ' done' : ''; }
  if (t.kind === 'hazard') {
    const h = t.h;
    if (s === 'disarm') { g.story.hazards = (g.story.hazards || []).filter((x) => x !== h); worldFx(g, 'hazard_gone', { id: h.id, tiles: h.tiles, why: 'disarmed', by: 'pc-' + c.id }); say((h.name || HAZARD[h.kind].name) + ' at ' + refOf(h.tiles[0]) + ': dealt with.'); return 'removed'; }
    if (s === 'safe') { const lane = safeLane(g, positionsOf(g)[c.id], h); h.safe = [...new Set([...(h.safe || []), ...lane])]; worldFx(g, 'safe_path', { id: h.id, tiles: lane, by: 'pc-' + c.id }); say(c.name + ' finds a safe path through the ' + (h.name || HAZARD[h.kind].name).toLowerCase() + ' (' + lane.map(refOf).join(', ') + ').'); return 'safe path ' + lane.map(refOf).join(' '); }
    return '';
  }
  if (t.kind === 'npc') {
    const n = t.n;
    if (s === 'ally') { if (n.side === 'hostile') { n.side = 'neutral'; say(n.name + ' stands down.'); return 'now neutral'; } n.ally = true; say(n.name + ' is with you.'); return 'now an ally'; }
    if (s === 'inform') { informed(g, c, n); return 'told the hint'; }
    if (s === 'reveal') { revealNear(g, n.pos, WP.reveal_radius, n.name); return 'revealed what was near'; }
    if (s === 'remove') { g.story.npcs = npcsOf(g).filter((x) => x !== n); say(n.name + ' leaves.'); return 'left'; }
    return '';
  }
  const o = t.o;
  if (s === 'loot') { const n = takeItems(g, c, o); return n ? 'took ' + n + ' things' : 'nothing inside'; }
  if (s === 'remove' || s === 'disarm') {
    g.story.objects = storyObjects(g).filter((x) => x !== o);
    if (s === 'remove' && (kindOf(o).cover || o.kind === 'barricade')) g.story.objects.push(makeObject('r_' + o.id, 'rubble', o.pos));
    if (s === 'disarm') for (const h of zoneHazards(g).filter((x) => x.tiles.includes(o.pos))) { g.story.hazards = (g.story.hazards || []).filter((x) => x !== h); worldFx(g, 'hazard_gone', { id: h.id, tiles: h.tiles, why: 'disarmed', by: 'pc-' + c.id }); }
  } else if (s === 'open') { o.open = true; o.locked = false; delete o.jam; }
  else if (s === 'reveal') { o.hidden = false; revealNear(g, o.pos, WP.reveal_radius, o.name); }
  if (s) { o.resolved = s !== 'reveal' && s !== 'open' ? true : o.resolved; if (s === 'open' && !isCache(o)) o.resolved = true;
    say(o.name + ' at ' + refOf(o.pos) + ': ' + (s === 'remove' ? 'cleared' : s === 'disarm' ? 'disarmed' : s === 'open' ? 'opened' : 'revealed') + '.'); }
  return s;
}
function failure(g: GameState, c: Character, t: Target, ap: Approach, p: string): string {
  const I = W(), f = ap.fail || '';
  if (f === 'hurt') { const dmg = FAIL_HURT[ap.tn] ?? 20; onWorld(g, c, (cb, u) => { cb.log.push(c.name + ' pays for it (' + ap.label + ')' + hurtUnit(u, dmg, false, cb, 'hazard') + '.'); }); return 'hurt ' + dmg; }
  if (f === 'alarm') { raiseAlarm(g, p, c); return 'alarm'; }
  if (f === 'condition' && ap.failCondition && isCondition(ap.failCondition)) { worldCond(g, c, ap.failCondition); return ap.failCondition; }
  if (f === 'jam') { ap.gone = true; if (t.kind === 'obj') { t.o.jam = g.story.scene.n; I.push(g, { kind: 'system', text: t.o.name + ' at ' + refOf(t.o.pos) + ' jams: no way in this scene.' }); } return 'jammed'; }
  if (f === 'lose' && ap.failItem) { const lost = loseItem(c, ap.failItem); if (lost) { I.push(g, { kind: 'system', text: c.name + ' loses ' + lost + '.', charId: c.id }); return 'lost ' + lost; } return ''; }
  if (f === 'hostile' && t.kind === 'npc') { t.n.side = 'hostile'; delete t.n.ally; I.push(g, { kind: 'system', text: t.n.name + ' turns hostile.' }); return 'turned hostile'; }
  if (f === 'hazard' && t.kind === 'hazard') { const h = t.h; onWorld(g, c, (cb, u) => { const hz = cb.hazards?.find((x) => x.id === h.id) || h; hazardHit(cb, cb.worldRng || g.rng, u, hz, posOf(t, u.pos), true); }); return 'the hazard bit'; }
  return '';
}
/** A failed approach's condition: the ones a story carries (Bleeding, Shaken…) for the scene; the rest on the area map. */
const CARRY = new Set(['shaken', 'fear', 'weakened', 'nausea', 'injured', 'bleeding', 'ldebuff', 'rdebuff', 'left_brain_debuff', 'right_brain_debuff']);
export function worldCond(g: GameState, c: Character, id: string) {
  if (CARRY.has(id)) { setStoryCond(g, c, id === 'left_brain_debuff' ? 'ldebuff' : id === 'right_brain_debuff' ? 'rdebuff' : id, 'scene'); W().push(g, { kind: 'system', text: c.name + ' is ' + id.replace(/_/g, ' ') + ' for the scene.', charId: c.id }); return; }
  onWorld(g, c, (cb, u) => { const r = applyCond(cb, cb.worldRng || g.rng, null, u, id, undefined, undefined, { skipSave: true }); if (r) cb.log.push(c.name + r.replace(/^ · [^ ]+/, '').replace(/^ · /, ' ') + '.'); });
}
function loseItem(c: Character, what: string): string {
  const pack = packOf(c).map((x) => ({ ...x })), w = what.toLowerCase();
  const i = pack.findIndex((x) => (x.item || x.id) === what || x.id === what || x.name.toLowerCase() === w || (x.kind === 'plot' && x.id === 'plot:' + w.replace(/\s+/g, '_')));
  if (i < 0) return '';
  const it = pack[i]; it.qty -= 1; if (it.qty <= 0 && !it.mags) pack.splice(i, 1); c.pack = pack; return it.name;
}
/** A one-tile lane through a hazard: the shortest walk from the actor to the hazard's farthest tile; its hazard tiles. */
function safeLane(g: GameState, from: string | undefined, h: Hazard): string[] {
  if (!from) return [...h.tiles];
  const map = zoneMap(g), blocked = new Set(storyObjects(g).filter(blocksMove).map((o) => o.pos));
  const far = [...h.tiles].sort((a, b) => dist(b, from) - dist(a, from) || (a < b ? -1 : 1))[0];
  const prev: Record<string, string> = {}, seen = new Set([from]), q = [from];
  while (q.length) { const k = q.shift()!; if (k === far) break; const [x, y] = k.split(',').map(Number);
    for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]) { const n = (x + dx) + ',' + (y + dy); if (seen.has(n) || !standable(map, n) || blocked.has(n)) continue; seen.add(n); prev[n] = k; q.push(n); } }
  if (!seen.has(far)) return [...h.tiles];
  const route: string[] = []; for (let k = far; k && k !== from; k = prev[k]) route.unshift(k);
  return route.filter((k) => h.tiles.includes(k));
}

// ---------- talk ----------
function informed(g: GameState, c: Character, n: Npc) {
  if (!n.knows) return;
  n.informed = true;
  const I = W(); I.push(g, { kind: 'system', text: n.name + ': "' + n.knows.hint + '"' });
  worldFx(g, 'marker', { from: n.id, objective: n.knows.objective, tiles: markersFor(g, 'pc').filter((m) => m.from === n.id).map((m) => m.tile) });
  worldEvent(g, 'talk', n.name + ' told ' + c.name + ' the hint for ' + n.knows.objective + '.');
}
/** Ask what they want, or about the objective (1 AP each; within 3 tiles). The line goes into the round too. */
export function talkAsk(g: GameState, c: Character, by: string, npcId: string, what: 'wants' | 'objective') {
  readyToAct(g, c, by, WORLD_AP.ask);
  const n = npcsOf(g).find((x) => x.id === npcId); if (!n || n.hidden) fail('Nobody like that here.');
  if (dist(positionsOf(g)[c.id], n!.pos) > TALK_RANGE) fail('Get within ' + TALK_RANGE + ' tiles of ' + n!.name + ' first.');
  if (what === 'wants' && !n!.wants && !n!.wantsHidden) fail(n!.name + ' has nothing to say about that.');
  if (what === 'objective' && !n!.knows) fail(n!.name + ' doesn\'t know anything about it.');
  const I = W();
  I.spendAp(g, c, WORLD_AP.ask); g.story.needs = true;
  I.push(g, { kind: 'player', who: by, text: c.name + (what === 'wants' ? ' asks ' + n!.name + ' what they want.' : ' asks ' + n!.name + ' about the objective.'), head: c.name });
  if (what === 'wants') { n!.wantsShown = true; I.push(g, { kind: 'system', text: n!.name + ' wants: ' + n!.wants }); worldEvent(g, 'talk', c.name + ' asked ' + n!.name + ' what they want.'); }
  else informed(g, c, n!);
  worldFx(g, 'talk', { unit: 'pc-' + c.id, target: n!.id, what });
  I.closeRoundIfDone(g);
}
export interface TalkOption { kind: 'ask' | 'approach'; what?: 'wants' | 'objective'; idx?: number; label: string; ap: number; skills?: string[]; tn?: number; success?: string; fail?: string;
  odds?: number; mod?: number; tried?: boolean; available: boolean; why?: string }
/** The Talk panel's choices for one person (for charId's odds and reach): the two asks, then the talk approaches. */
export function talkOptions(g: GameState, tokenId: string, charId?: string): TalkOption[] {
  const n = npcsOf(g).find((x) => x.id === tokenId); if (!n || n.hidden) return [];
  const c = charId ? g.characters[charId] : undefined, at = c ? positionsOf(g)[c.id] : undefined;
  const near = !c || (!!at && dist(at, n.pos) <= TALK_RANGE), apL = c ? apLeft(g, c) : 99, open = g.phase === 'story' && g.story.await === 'players';
  const gate = (ap: number) => (!open ? 'Wait for the round to open.' : !near ? 'Get within ' + TALK_RANGE + ' tiles.' : apL < ap ? 'Needs ' + ap + ' AP.' : '');
  const out: TalkOption[] = [];
  if (n.wants || n.wantsHidden) { const why = gate(WORLD_AP.ask); out.push({ kind: 'ask', what: 'wants', label: 'Ask what they want', ap: WORLD_AP.ask, available: !why, ...(why ? { why } : {}) }); }
  if (n.knows) { const why = gate(WORLD_AP.ask); out.push({ kind: 'ask', what: 'objective', label: 'Ask about the objective', ap: WORLD_AP.ask, available: !why, ...(why ? { why } : {}) }); }
  (n.talk || []).forEach((a, i) => { if (a.gone) return; const tried = !!c && triedBy(a, c.id), why = tried ? 'Already tried.' : gate(WORLD_AP.attempt), pv = c ? previewOdds(g, c, a.skills, a.tn, a.pick) : null;
    out.push({ kind: 'approach', idx: i, label: a.label, ap: WORLD_AP.attempt, skills: a.skills, tn: a.tn, success: a.success, ...(a.fail ? { fail: a.fail } : {}), ...(pv ? { odds: pv.chance, mod: pv.mod } : {}), tried, available: !why, ...(why ? { why } : {}) }); });
  return out;
}
/** What a player's screen shows of a person on the map (rules 1.7): face, kind, side, what they want once asked, their
 * hint once told, and the Talk panel's choices. */
export function npcView(g: GameState, tokenId: string, charId?: string) {
  const n = npcsOf(g).find((x) => x.id === tokenId); if (!n || n.hidden) return null;
  return { id: n.id, name: n.name, kind: n.kind || 'human', avatar: avatarOf(g, n), side: (n.ally ? 'ally' : n.side) as 'hostile' | 'neutral' | 'ally', tier: n.tier, pos: n.pos, ref: refOf(n.pos),
    prisoner: !!n.prisoner, carryable: carryable(n), wants: n.wantsShown ? n.wants || null : null, hasWants: !!n.wants || !!n.wantsHidden,
    knows: n.knows && n.informed ? { objective: n.knows.objective, hint: n.knows.hint } : null, hasKnows: !!n.knows, talk: talkOptions(g, tokenId, charId) };
}
/** Every approach on an object, a hazard or a person, with charId's odds (the panel's buttons). */
export function approachOptions(g: GameState, targetId: string, charId?: string): TalkOption[] {
  const t = targetOf(g, targetId); if (!t || hiddenT(t)) return [];
  const c = charId ? g.characters[charId] : undefined, at = c ? positionsOf(g)[c.id] : undefined;
  return approachesOf(t).map((a, i) => { if (a.gone) return null; const tried = !!c && triedBy(a, c.id), far = !!c && (!at || dist(at, posOf(t, at)) > rangeOf(t)), why = tried ? 'Already tried.' : far ? 'Get closer.' : '', pv = c ? previewOdds(g, c, a.skills, a.tn, a.pick) : null;
    return { kind: 'approach' as const, idx: i, label: a.label, ap: WORLD_AP.attempt, skills: a.skills, tn: a.tn, success: a.success, ...(a.fail ? { fail: a.fail } : {}), ...(pv ? { odds: pv.chance, mod: pv.mod } : {}), tried, available: !why, ...(why ? { why } : {}) }; }).filter(Boolean) as TalkOption[];
}

// ---------- the Narrator's approaches ----------
/** Clean approaches from the Narrator (objects, people): the label, 1-3 skills, a TN of the ladder, the effects. */
export function cleanApproaches(list: any, max = 5): Omit<Approach, 'tries'>[] {
  return (Array.isArray(list) ? list : []).filter((a) => a && a.label && TN_LADDER.includes(a.tn)).slice(0, max).map((a) => ({
    label: String(a.label).slice(0, 80), skills: (a.skills || []).filter((s: string) => SKILL[s]).slice(0, 3), tn: a.tn, stakes: String(a.stakes || '').slice(0, 200),
    success: (SUCCESS.has(a.success) ? a.success : '') as Approach['success'],
    ...(FAILS.has(a.fail) && a.fail ? { fail: a.fail as Approach['fail'] } : {}),
    ...(a.objective ? { objective: String(a.objective).slice(0, 80) } : {}),
    ...(a.failCondition && isCondition(String(a.failCondition)) ? { failCondition: String(a.failCondition) } : {}),
    ...(a.failItem ? { failItem: String(a.failItem).slice(0, 60) } : {}),
  })).filter((a) => a.skills.length);
}
/** A person's talk fields from an npcs[] place or update: kind, avatar, wants, knows, talk. */
export function npcTalkFields(g: GameState, n: Npc, op: any) {
  if (op.kind && (KINDS.includes(op.kind) || WORLD_KINDS.includes(op.kind))) n.kind = op.kind;
  if (op.avatar && validAvatar(g, op.avatar)) n.avatar = op.avatar;
  if (typeof op.wants === 'string' && op.wants.trim()) n.wants = op.wants.trim().slice(0, 200);
  if (op.knows && typeof op.knows === 'object' && op.knows.hint) { const o = objectiveOf(g, String(op.knows.objective || '')); n.knows = { objective: o ? o.key : String(op.knows.objective || '').slice(0, 80), hint: String(op.knows.hint).slice(0, 200), ...(op.knows.at ? { at: String(op.knows.at).slice(0, 8) } : {}) }; }
  if (Array.isArray(op.talk) && op.talk.length) { const fresh = cleanApproaches(op.talk, HAZARD_LIMITS.talk); n.talk = fresh.map((a) => ({ ...a, tries: (n.talk || []).find((x) => x.label.toLowerCase() === a.label.toLowerCase())?.tries || [] })); }
}

// ---------- the Narrator's moves walk ----------
/** The Narrator moves a character (moves[]): along the path, so hazards, traps and triggers on it fire (no AP). With no
 * path there, the move is a cutscene jump, refused when the straight line crosses a hazard. Returns false if refused. */
export function walkStory(g: GameState, c: Character, k: string): boolean {
  const cb = storyCb(g), u = cb.units.find((x) => x.charId === c.id); if (!u) return false;
  const P = paths(cb, u.pos, u.id);
  if (P.dist[k] === undefined || k === u.pos) {
    const crosses = lineTiles(u.pos, k).some((t) => zoneHazards(g).some((h) => hazardLiveAt(h, t, 'pc')));
    if (crosses) { W().push(g, { kind: 'system', text: c.name + ' can\'t get to ' + refOf(k) + ' without crossing the hazard.', ooc: true }); return false; }
    positionsOf(g)[c.id] = k; W().push(g, { kind: 'system', text: c.name + ' moves to ' + refOf(k) + '.' }); return true;
  }
  const from = u.pos, ap0 = u.ap; u.ap = 999;
  const was = bindGame(g); let err: string | null = null; try { err = moveUnit(cb, u, k, undefined, 'move', { shortest: true }); } finally { bindGame(was); }
  if (err) return false;
  u.ap = ap0;
  positionsOf(g)[c.id] = u.pos;
  const route: string[] = []; for (let x = u.pos; x && x !== from; x = P.prev[x]) route.unshift(x);
  writeBack(g, cb, c);
  enterTriggers(g, c, route);
  return true;
}
function lineTiles(a: string, b: string): string[] {
  const [x0, y0] = a.split(',').map(Number), [x1, y1] = b.split(',').map(Number), n = Math.max(Math.abs(x1 - x0), Math.abs(y1 - y0)), out: string[] = [];
  for (let i = 1; i <= n; i++) out.push(Math.round(x0 + ((x1 - x0) * i) / n) + ',' + Math.round(y0 + ((y1 - y0) * i) / n));
  return out;
}

// ---------- after every action ----------
/** The sweep apply() runs after every action: Downed carriers drop, objective triggers fire. */
export function worldAfter(g: GameState) {
  if (g.phase === 'lobby') return;
  const any = Object.values(g.characters).some((c) => c.carried?.length);
  if (any) { const was = bindGame(g); try { dropFromDowned(g); } finally { bindGame(was); } }
  if (g.story.triggers?.some((t) => !t.fired && t.when === 'objective')) objectiveTriggers(g);
}

// ---------- markers and the HERE card ----------
export interface Marker { id: string; kind: 'objective' | 'hint'; objective: string; text: string; tile: string; ref: string; target?: { type: 'token' | 'object' | 'hazard' | 'tile'; id: string }; from?: string }
/** Resolve one where reference on this map (token, object, hazard id, or a grid reference) for a viewer. */
function resolveRef(g: GameState, r: string, viewer: 'pc' | 'foe' | 'all'): Marker['target'] & { tile: string } | null {
  const n = npcsOf(g).find((x) => x.id === r); if (n) return n.hidden && viewer !== 'all' ? null : { type: 'token', id: n.id, tile: n.pos };
  const o = storyObjects(g).find((x) => x.id === r); if (o) return o.hidden && viewer !== 'all' ? null : { type: 'object', id: o.id, tile: o.pos };
  const h = zoneHazards(g).find((x) => x.id === r); if (h) return h.hidden && viewer !== 'all' ? null : { type: 'hazard', id: h.id, tile: h.tiles[0] };
  const k = /^\d+,\d+$/.test(r) ? r : keyOf(r, zoneMap(g)); if (k && !zoneMap(g).solid.includes(k)) return { type: 'tile', id: k, tile: k };
  return null;
}
const inZone = (g: GameState, w: Where | null) => !w?.zone || w.zone === zoneMap(g).id;
/** The map markers a viewer sees (rules 1.7): each open objective's where references in this zone, and the hints
 * people gave (their `knows.at`, else the objective's references). Never a hidden token, object or hazard. */
export function markersFor(g: GameState, viewer: 'pc' | 'foe' | 'all' = 'pc'): Marker[] {
  if (g.phase === 'combat') return [];
  const out: Marker[] = [], objs = openObjectives(g), seen = new Set<string>();
  for (const o of objs) if (o.where && inZone(g, o.where)) for (const r of o.where.refs || []) { const t = resolveRef(g, r, viewer); if (!t) continue; const id = 'm:' + o.key + ':' + r; if (seen.has(id)) continue; seen.add(id);
    out.push({ id, kind: 'objective', objective: o.key, text: o.text, tile: t.tile, ref: refOf(t.tile), target: { type: t.type, id: t.id } }); }
  for (const n of npcsOf(g)) {
    if (!n.knows || !n.informed || (n.hidden && viewer !== 'all')) continue;
    const ob = objs.find((x) => x.key === n.knows!.objective || x.id === n.knows!.objective); if (!ob && objs.length) continue;
    const refs = n.knows.at ? [n.knows.at] : ob?.where && inZone(g, ob.where) ? ob.where.refs || [] : [];
    for (const r of refs) { const t = resolveRef(g, r, viewer); if (!t) continue; out.push({ id: 'h:' + n.id + ':' + r, kind: 'hint', objective: ob?.key || n.knows.objective, text: n.knows.hint, tile: t.tile, ref: refOf(t.tile), target: { type: t.type, id: t.id }, from: n.id }); }
  }
  return out;
}
export interface HereObjective { key: string; mission: string; id: string; text: string; optional: boolean; here: boolean; zone: string | null; zoneName: string | null; markers: Marker[]; steps: string[] }
/** The HERE card (rules 1.7): up to 3 open objectives in this zone and what moves each forward; with none here, the
 * first open objective elsewhere and where it is. */
export function hereCard(g: GameState, viewer: 'pc' | 'foe' | 'all' = 'pc'): { zone: string; zoneName: string; objectives: HereObjective[] } {
  const zone = zoneMap(g).id, zoneName = zoneMap(g).name, objs = openObjectives(g), marks = markersFor(g, viewer);
  const zname = (z?: string) => (z ? campaignOf(g)?.zones.find((x) => x.id === z)?.name || z : null);
  const stepsFor = (key: string, oid: string): string[] => {
    const st: string[] = [], is = (k?: string) => !!k && (k === key || k === oid);
    for (const o of storyObjects(g)) { if (o.hidden) continue; for (const a of o.approaches) if (!a.gone && a.success === 'advance' && is(a.objective)) st.push('Try "' + a.label + '" on ' + o.name + ' (' + refOf(o.pos) + ')'); }
    for (const n of npcsOf(g)) { if (n.hidden && viewer !== 'all') continue;
      for (const a of n.talk || []) if (!a.gone && a.success === 'advance' && is(a.objective)) st.push('Talk to ' + n.name + ' (' + refOf(n.pos) + '): "' + a.label + '"');
      if (n.knows && is(n.knows.objective)) st.push(n.informed ? n.name + ': "' + n.knows.hint + '"' : 'Ask ' + n.name + ' (' + refOf(n.pos) + ') about it'); }
    for (const m of marks.filter((x) => x.objective === key && x.kind === 'objective')) { const t = m.target; const nm = t?.type === 'token' ? npcsOf(g).find((x) => x.id === t.id)?.name : t?.type === 'object' ? storyObjects(g).find((x) => x.id === t.id)?.name : t?.type === 'hazard' ? 'the hazard' : null; st.push('Go to ' + (nm ? nm + ' (' + m.ref + ')' : m.ref)); }
    return [...new Set(st)].slice(0, 4);
  };
  const here = objs.filter((o) => (o.where && o.where.zone === zone) || (o.where && !o.where.zone && marks.some((m) => m.objective === o.key)) || stepsFor(o.key, o.id).length);
  const pick = (here.length ? here : objs.filter((o) => !o.optional).slice(0, 1)).slice(0, HAZARD_LIMITS.here);
  return { zone, zoneName, objectives: pick.map((o) => { const isHere = here.includes(o); return { key: o.key, mission: o.mission, id: o.id, text: o.text, optional: o.optional, here: isHere,
    zone: o.where?.zone || (isHere ? zone : null), zoneName: zname(o.where?.zone || (isHere ? zone : undefined)), markers: marks.filter((m) => m.objective === o.key), steps: stepsFor(o.key, o.id) }; }) };
}

// ---------- hazards for a viewer ----------
export interface HazardTile { id: string; kind: HazardKind; severity: 'light' | 'heavy'; name: string; tile: string; safe: boolean; spent: boolean }
/** The hazard tiles a viewer sees (rules 1.7): never an unseen hazard (unless 'all'); safe-path tiles flagged for the
 * squad; spent mines flagged. In a fight, the fight's own hazards. */
export function hazardTilesFor(g: GameState, viewer: 'pc' | 'foe' | 'all' = 'pc'): HazardTile[] {
  const out: HazardTile[] = [];
  for (const h of liveHazards(g)) { if (h.hidden && viewer !== 'all') continue;
    for (const t of h.tiles) out.push({ id: h.id, kind: h.kind, severity: h.severity, name: h.name || HAZARD[h.kind]?.name || h.kind, tile: t, safe: viewer === 'pc' && (h.safe || []).includes(t), spent: (h.spent || []).includes(t) }); }
  return out;
}
/** The hazards a viewer sees, whole (with their approaches and charId's odds). */
export function hazardsFor(g: GameState, viewer: 'pc' | 'foe' | 'all' = 'pc', charId?: string) {
  return liveHazards(g).filter((h) => !h.hidden || viewer === 'all').map((h) => ({ id: h.id, kind: h.kind, severity: h.severity, name: h.name || HAZARD[h.kind]?.name || h.kind, text: h.text || HAZARD[h.kind]?.text || '', tn: hazardTn(h),
    tiles: [...h.tiles], safe: viewer === 'pc' ? [...(h.safe || [])] : [], spent: [...(h.spent || [])], approaches: g.phase === 'story' ? approachOptions(g, h.id, charId) : [] }));
}

// ---------- views: what players may not see ----------
/** Strip from a player's view what the rules 1.7 pieces keep secret: unseen hazards, every trigger, the engine's
 * events, a person's wants and hint until asked, a cache's contents (its count stays). */
export function worldView(v: GameState) {
  const s: any = v.story;
  if (s.hazards) s.hazards = s.hazards.filter((h: Hazard) => !h.hidden);
  delete s.triggers; delete s.events;
  if (s.npcs) s.npcs = s.npcs.map((n: Npc) => stripNpc(n));
  if (s.zoneNpcs) s.zoneNpcs = Object.fromEntries(Object.entries(s.zoneNpcs).map(([k, l]: any) => [k, l.map(stripNpc)]));
  const cache = (o: MapObject) => (o.items && !isPile(o) ? { ...o, items: [], itemCount: o.items.length } : o); // a pile is open (rules 1.9)
  if (s.objects) s.objects = s.objects.map(cache);
  if (s.zoneObjects) s.zoneObjects = Object.fromEntries(Object.entries(s.zoneObjects).map(([k, l]: any) => [k, l.filter((o: MapObject) => !o.hidden).map(cache)]));
  if (v.combat) { v.combat = { ...v.combat, ...(v.combat.hazards ? { hazards: v.combat.hazards.filter((h) => !h.hidden) } : {}), ...(v.combat.objects ? { objects: v.combat.objects.map(cache) } : {}) }; delete (v.combat as any).worldRng;
    // Rules 1.9: the drop tables a fight rolls on, and what each enemy will drop, are never in a player's view (item 691).
    delete v.combat.lootTables; if (v.combat.dropped?.length) v.combat.dropped = v.combat.dropped.map((d) => ({ ...d, npc: stripNpc(d.npc) })); // review fix: a carried person's drops
    if (v.combat.units.some((u) => u.drops)) v.combat.units = v.combat.units.map((u) => { if (!u.drops) return u; const x = { ...u }; delete x.drops; return x; }); }
  v.characters = Object.fromEntries(Object.entries(v.characters).map(([id, c]) => [id, c.carried ? { ...c, carried: c.carried.map((x) => ({ ...x, npc: stripNpc(x.npc) })) } : c]));
}
function stripNpc(n: Npc): Npc {
  if (n.drops) { n = { ...n }; delete n.drops; } // rules 1.9: what someone will drop is never in a player's view (item 691)
  if (!n.wants && !n.knows) return n;
  const x: any = { ...n };
  if (!n.wantsShown && n.wants) { x.wants = ''; x.wantsHidden = true; } // the button stays, the words don't
  if (n.knows && !n.informed) x.knows = { objective: '', hint: '' };
  return x;
}
