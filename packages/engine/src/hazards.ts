// Hazards (rules revision 1.7, World Play; data/world_play.json). A hazard is an area of tiles (a minefield, a fire,
// radiation, gas, a collapse) the Narrator places. The engine runs it on every tile a unit enters, in a fight or on
// the area map, at any speed: movement walks its path tile by tile (combat.ts moveUnit), so a sprint through a
// minefield still sets a mine off. Hidden hazards are found by passive Vigilant, by stepping in, or by a reveal.
// Every hazard carries two approaches the engine writes itself: find a safe path (a lane that doesn't trigger for the
// squad) and disarm (removes it; failing gives the actor one tile of the hazard). Deterministic: dice from the rng.
import wpJ from '../../../data/world_play.json';
import { type Combat, type Unit, hurtUnit, emitFx, dist, refOf } from './combat';
import { applyCond, unitSave } from './magic';
import { passiveVigilance } from './character';
import { SKILL } from './data';
import { type Rng, d20 } from './rng';
import type { Approach } from './objects';

export type HazardKind = 'minefield' | 'fire' | 'radiation' | 'gas' | 'collapse';
export interface HazardDef { id: HazardKind; name: string; damage: { light: number; heavy: number }; armour: boolean; save?: 'body' | 'brain' | 'heart'; save_halves?: boolean;
  spent?: boolean; stops?: boolean; stops_on?: string[]; after_tiles?: number; condition?: { light?: string; heavy?: string }; disarm: string; text: string }
/** A hazard on a zone's map (story and fights alike). tiles are tile keys ("x,y"). */
export interface Hazard {
  id: string; kind: HazardKind; severity: 'light' | 'heavy'; zone: string; tiles: string[];
  name?: string; text?: string;
  /** Unseen by the players until spotted, stepped in or revealed. */
  hidden?: boolean;
  /** Minefield tiles whose mine is spent. */
  spent?: string[];
  /** Tiles that don't trigger for the squad (side 'pc'): a safe path someone found. */
  safe?: string[];
  /** Tiles each creature has entered in it (radiation's "after 3 tiles"), by character id or unit id. */
  exposure?: Record<string, number>;
  /** The two engine-written approaches, with their tries (objects.ts Approach shape). */
  approaches: Approach[];
}

const WP: any = wpJ;
export const WORLD_PLAY = WP;
export const HAZARDS: HazardDef[] = WP.hazards;
export const HAZARD: Record<string, HazardDef> = Object.fromEntries(HAZARDS.map((h) => [h.id, h]));
export const HAZARD_KINDS = HAZARDS.map((h) => h.id);
/** The TN of a hazard's approaches and saves: light 12, heavy 16 (PROVISIONAL, spec 14). */
export const hazardTn = (h: { severity: string }) => (h.severity === 'heavy' ? WP.hazard_tn.heavy : WP.hazard_tn.light) as number;
export const HAZARD_LIMITS = WP.limits as { hazard_tiles: number; hazards_per_zone: number; triggers_per_zone: number; spawn: number; cache_items: number; talk: number; here: number; events: number };

/** The approaches every hazard gets (safe path, disarm), labelled for its kind. */
export function hazardApproaches(kind: HazardKind, severity: 'light' | 'heavy'): Approach[] {
  const tn = hazardTn({ severity }), d = HAZARD[kind];
  return (WP.hazard_approaches as any[]).map((a) => ({ label: a.id === 'disarm' ? d?.disarm || a.label : a.label, skills: [...a.skills], tn, stakes: a.id === 'disarm' ? 'Fail and it gets you.' : 'Fail and you find no way through.',
    success: a.success, fail: a.fail, pick: 'best' as const, tries: [] })) as Approach[];
}

/** Is this tile live for this unit? A spent mine, or the squad on its safe path, sets nothing off. */
export function hazardLiveAt(h: Hazard, k: string, side: 'pc' | 'foe'): boolean {
  if (!h.tiles.includes(k)) return false;
  if (h.kind === 'minefield' && (h.spent || []).includes(k)) return false;
  if (side === 'pc' && (h.safe || []).includes(k)) return false;
  return true;
}
const unitKey = (u: Unit) => u.charId || u.npcId || u.id;
const fam = (s?: string): 'body' | 'brain' | 'heart' => (s === 'heart' ? 'heart' : s === 'brain' ? 'brain' : 'body');
/** A unit's gear may make it immune (hazard_immune: fire, toxic for gas and radiation). */
function immuneTo(u: Unit, kind: string): boolean { const im = u.hazardImmune || []; return im.includes(kind) || ((kind === 'gas' || kind === 'radiation') && im.includes('toxic')); }

/**
 * One tile of a hazard on a unit (a step in, or a failed disarm when `attempt` is set). Applies the kind's damage,
 * save and condition, logs it and emits a 'hazard' fx. Returns why the walk stops ('' when it goes on).
 */
export function hazardHit(cb: Combat, rng: Rng, u: Unit, h: Hazard, k: string, attempt = false): string {
  const d = HAZARD[h.kind]; if (!d || u.dead) return '';
  if (h.hidden) { h.hidden = false; emitFx(cb, 'hazard_spotted', { id: h.id, kind: h.kind, at: k, tiles: [...h.tiles], by: u.id, how: 'stepped' }); }
  if (immuneTo(u, h.kind)) { cb.log.push(u.name + ' crosses the ' + (h.name || d.name).toLowerCase() + ' at ' + refOf(k) + ' unharmed (gear).'); emitFx(cb, 'hazard', { target: u.id, at: k, id: h.id, kind: h.kind, severity: h.severity, dmg: 0, immune: true }); return ''; }
  const tn = hazardTn(h), sev = h.severity;
  let dmg = d.damage[sev] || 0, line = '', saved: boolean | null = null, cond = '';
  if (d.save) { const r = d20(rng), m = unitSave(u, fam(d.save)), ok = r === 20 || (r !== 1 && r + m >= tn); saved = ok; line += ' (' + d.save + ' save ' + (r + m) + ' vs ' + tn + (ok ? ', saved' : '') + ')'; }
  if (d.save_halves && saved) dmg = Math.floor(dmg / 2);
  if (dmg > 0) line += hurtUnit(u, dmg, !d.armour, cb, h.kind === 'minefield' ? 'explosion' : 'hazard');
  // The condition: Burning and Prone always; radiation's Weakened from the third tile; a save (gas) stops it.
  const c0 = d.condition?.[sev];
  if (c0 && !u.dead && !(d.save && !d.save_halves && saved)) {
    let due = true;
    if (d.after_tiles && !attempt) { const ex = (h.exposure ||= {}), key = unitKey(u); ex[key] = (ex[key] || 0) + 1; due = ex[key] >= d.after_tiles; }
    if (due) { const r = applyCond(cb, rng, null, u, c0, undefined, undefined, { skipSave: true }); if (r) { line += r; cond = c0; } }
  }
  if (h.kind === 'minefield' && !attempt) { (h.spent ||= []).includes(k) || h.spent!.push(k); }
  emitFx(cb, 'hazard', { target: u.id, at: k, id: h.id, kind: h.kind, severity: sev, dmg, ...(saved != null ? { saved } : {}), ...(cond ? { cond } : {}), ...(attempt ? { attempt: true } : {}), ...(h.kind === 'minefield' && !attempt ? { spent: true } : {}) });
  cb.log.push(u.name + (attempt ? ' fails to deal with the ' : ' sets off the ') + (h.name || d.name).toLowerCase() + ' at ' + refOf(k) + line + '.');
  (cb.hazardHits ||= []).push({ id: h.id, kind: h.kind, unit: u.id, charId: u.charId, name: u.name, at: k, dmg, cond: cond || undefined, attempt: attempt || undefined });
  if (u.dead || u.downed) return 'down';
  if (attempt) return '';
  if (d.stops || (cond && (d.stops_on || []).includes(cond))) return 'hazard';
  return '';
}

/** A unit steps onto tile k: every live hazard there fires. Returns why the walk stops ('' when it goes on). */
export function hazardStep(cb: Combat, rng: Rng | undefined, u: Unit, k: string): string {
  const list = cb.hazards; if (!list?.length || !rng) return '';
  let stop = '';
  for (const h of list) { if (!hazardLiveAt(h, k, u.side)) continue; const s = hazardHit(cb, rng, u, h, k); stop ||= s; if (u.dead || u.downed) break; }
  return stop;
}

/** After a PC moves: hidden hazards within 2 tiles fall to passive Vigilance (10 + its points: a gamma) against their TN. */
export function spotHazards(cb: Combat, u: Unit) {
  if (u.side !== 'pc' || !cb.hazards?.length) return;
  const passive = passiveVigilance(u.vigilant || 0);
  for (const h of cb.hazards) {
    if (!h.hidden) continue;
    const near = h.tiles.some((t) => dist(t, u.pos) <= WP.hazard_spot_range);
    if (!near || passive < hazardTn(h)) continue;
    h.hidden = false;
    emitFx(cb, 'hazard_spotted', { id: h.id, kind: h.kind, at: h.tiles[0], tiles: [...h.tiles], by: u.id, how: 'vigilant' });
    cb.log.push(u.name + ' spots a ' + (h.name || HAZARD[h.kind]?.name || h.kind).toLowerCase() + ' at ' + refOf(h.tiles[0]) + (h.tiles.length > 1 ? ' (+' + (h.tiles.length - 1) + ' tiles)' : '') + ' (' + SKILL.vigilant.name + ' ' + passive + ' vs ' + hazardTn(h) + ').');
  }
}
