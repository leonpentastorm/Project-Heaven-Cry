// The Proving Ground's WORLD tools (rules 1.7; part A's sandbox/cache, sandbox/hazard, sandbox/trigger, sandbox/npc and
// sandbox/objective; rules 1.8's sandbox/pile). Pure: each form becomes one engine action; the engine checks and places it. The panel lives in
// sandbox.tsx (WorldTab); the forms' defaults are a robot that wants something, a cache with a stim and rations, a light
// minefield, an ambush on entering tiles, and a drill objective.
import { AVATAR_POOLS, HAZARD_KINDS, KIND_DEFS, SKILLS, ITEM, WEAPON, WEAPONS, TN_LADDER, calName, type Action } from '@engine';

export const WORLD_KIND_IDS: string[] = KIND_DEFS.map((k) => k.id);
/** The avatars a kind can wear in the picker (its pool; beasts have none: badge only). */
export function avatarChoices(kind: string): string[] {
  const pool = KIND_DEFS.find((k) => k.id === kind)?.avatar_pool;
  return pool ? AVATAR_POOLS[pool] || [] : [];
}
export const SUCCESSES = ['', 'remove', 'open', 'reveal', 'disarm', 'loot', 'advance', 'ally', 'inform'] as const;
export const FAILS = ['', 'hurt', 'alarm', 'condition', 'jam', 'lose', 'hostile'] as const;
export interface ApproachForm { label: string; skill: string; skill2: string; tn: number; success: string; fail: string; objective: string; failCondition: string; failItem: string; stakes: string }
export const blankApproach = (o: Partial<ApproachForm> = {}): ApproachForm => ({ label: 'Talk them round', skill: 'eloquence', skill2: '', tn: 12, success: 'inform', fail: 'hostile', objective: '', failCondition: '', failItem: '', stakes: '', ...o });
export function approachOf(a: ApproachForm) {
  const skills = [a.skill, a.skill2].filter((s, i, l) => s && SKILLS.some((x) => x.id === s) && l.indexOf(s) === i);
  return { label: a.label.trim() || 'Try it', skills, tn: TN_LADDER.includes(a.tn) ? a.tn : 12, stakes: a.stakes.trim(), success: a.success,
    ...(a.fail ? { fail: a.fail } : {}), ...(a.success === 'advance' && a.objective ? { objective: a.objective } : {}),
    ...(a.fail === 'condition' && a.failCondition ? { failCondition: a.failCondition } : {}), ...(a.fail === 'lose' && a.failItem ? { failItem: a.failItem } : {}) } as any;
}

export interface NpcForm { name: string; kind: string; avatar: string; side: 'neutral' | 'hostile'; prisoner: boolean; hidden: boolean; wants: string; objective: string; hint: string; hintAt: string; talk: ApproachForm[]; tier: string; weapon: string }
export const blankNpc = (): NpcForm => ({ name: 'Hum', kind: 'robot', avatar: '', side: 'neutral', prisoner: false, hidden: false, wants: 'To be carried back to the workshop.', objective: '', hint: '', hintAt: '', talk: [blankApproach()], tier: 'minion', weapon: '' });
export function npcAction(f: NpcForm, at: string): Action {
  return { type: 'sandbox/npc', name: f.name.trim() || 'Someone', at, side: f.side, kind: f.kind, ...(f.avatar ? { avatar: f.avatar } : {}), ...(f.side === 'hostile' ? { tier: f.tier, ...(f.weapon && WEAPON[f.weapon] ? { weapon: f.weapon } : {}) } : {}),
    ...(f.hidden ? { hidden: true } : {}), ...(f.prisoner ? { prisoner: true } : {}), ...(f.wants.trim() ? { wants: f.wants.trim() } : {}),
    ...(f.hint.trim() && f.objective.trim() ? { knows: { objective: f.objective.trim(), hint: f.hint.trim(), ...(f.hintAt.trim() ? { at: f.hintAt.trim().toUpperCase() } : {}) } } : {}),
    ...(f.talk.length ? { talk: f.talk.slice(0, 4).map(approachOf) } : {}) } as Action;
}

export interface CacheForm { name: string; items: { item: string; qty: number }[]; locked: boolean; way: ApproachForm }
export const blankCache = (): CacheForm => ({ name: 'Supply crate', items: [{ item: 'stim_injector', qty: 2 }, { item: 'ration_pack', qty: 1 }], locked: false,
  way: blankApproach({ label: 'Force the lid', skill: 'raw_power', tn: 12, success: 'open', fail: 'hurt' }) });
export function cacheAction(f: CacheForm, at: string): Action {
  return { type: 'sandbox/cache', at, name: f.name.trim() || 'Supply crate', items: f.items.filter((x) => x.item && (ITEM[x.item] || WEAPON[x.item])).slice(0, 12).map((x) => ({ item: x.item, qty: Math.max(1, Math.round(x.qty) || 1) })),
    ...(f.locked ? { locked: true, approaches: [approachOf(f.way)] } : {}) } as Action;
}

/** Rules 1.8: a pile on the ground (open: what is in it shows to anyone who sees the tile). Entries are item or weapon ids,
 * plus mag:<weapon> (qty its rounds; 1 or none is a full magazine, 0 an empty one) and rounds:<calibre>; the engine merges
 * them into the pile on the tile (the Narrator's ground[] path). */
export interface PileForm { items: { item: string; qty: number }[]; hidden: boolean }
export const blankPile = (): PileForm => ({ items: [{ item: 'mag:service_pistol', qty: 7 }, { item: 'rounds:' + (WEAPON.service_pistol?.ammo || ''), qty: 20 }], hidden: false });
/** The ids a pile entry may name, for the form's picker: magazines and loose rounds first (the point of a pile). */
export function pileChoices(): { id: string; name: string }[] {
  const mags = WEAPONS.filter((w: any) => w.magazine != null && w.reload !== 'loose').map((w: any) => ({ id: 'mag:' + w.id, name: w.name + ' magazine' }));
  const cals = [...new Set(WEAPONS.map((w: any) => w.ammo).filter(Boolean))].map((c: any) => ({ id: 'rounds:' + c, name: 'Loose rounds: ' + calName(c) })); // the engine's own name (review fix: ".32 decrkm")
  return [...mags, ...cals, ...WEAPONS.map((w: any) => ({ id: w.id, name: w.name + ' (weapon)' })), ...Object.values(ITEM).map((x: any) => ({ id: x.id, name: x.name }))];
}
export const isAmmoId = (id: string) => /^(mag|rounds):/.test(id);
const pileOk = (id: string) => !!(ITEM[id] || WEAPON[id] || (id.startsWith('mag:') && WEAPON[id.slice(4)]) || id.startsWith('rounds:'));
export function pileAction(f: PileForm, at: string): Action {
  return { type: 'sandbox/pile', at, items: f.items.filter((x) => x.item && pileOk(x.item)).slice(0, 12).map((x) => ({ item: x.item, qty: Math.max(isAmmoId(x.item) ? 0 : 1, Math.round(x.qty) || 0) })),
    ...(f.hidden ? { hidden: true } : {}) } as Action;
}

export interface HazardForm { kind: string; severity: 'light' | 'heavy'; hidden: boolean; name: string }
export const blankHazard = (): HazardForm => ({ kind: 'minefield', severity: 'light', hidden: false, name: '' });
export function hazardAction(f: HazardForm, from: string, to: string): Action {
  return { type: 'sandbox/hazard', kind: HAZARD_KINDS.includes(f.kind as any) ? f.kind : 'minefield', severity: f.severity, rect: { from, to: to || from }, ...(f.hidden ? { hidden: true } : {}), ...(f.name.trim() ? { name: f.name.trim() } : {}) } as Action;
}

export interface TriggerForm { when: 'enter' | 'examine'; objId: string; then: 'spawn' | 'fight' | 'reveal'; count: number; name: string; kind: string; tier: string; weapon: string; hidden: boolean; difficulty: string; text: string }
export const blankTrigger = (): TriggerForm => ({ when: 'enter', objId: '', then: 'fight', count: 2, name: 'Raider', kind: 'human', tier: 'minion', weapon: 'service_pistol', hidden: false, difficulty: 'standard', text: 'Raiders burst out of the wreck!' });
/** The trigger action: an enter area (from–to) or an examined object; spawn, fight (spawn hostiles, then the fight) or reveal. */
export function triggerAction(f: TriggerForm, from: string, to: string): Action {
  const n = Math.max(1, Math.min(6, Math.round(f.count) || 1));
  const spawn = f.then === 'reveal' ? [] : Array.from({ length: n }, (_, i) => ({ action: 'place', name: n > 1 ? f.name + ' ' + (i + 1) : f.name, side: f.then === 'fight' ? 'hostile' : 'neutral', kind: f.kind, tier: f.tier,
    ...(WEAPON[f.weapon] ? { weapon: f.weapon } : {}), ...(f.hidden ? { hidden: true } : {}) }));
  return { type: 'sandbox/trigger', when: f.when, ...(f.when === 'enter' ? { rect: { from, to: to || from } } : { objId: f.objId }), then: f.then, ...(spawn.length ? { spawn } : {}),
    ...(f.then === 'fight' ? { difficulty: f.difficulty, name: 'Ambush' } : {}), ...(f.text.trim() ? { text: f.text.trim() } : {}) } as Action;
}

export interface ObjectiveForm { id: string; text: string; refs: string[]; status: 'open' | 'done' }
export const blankObjective = (): ObjectiveForm => ({ id: 'find_the_core', text: 'Find the power core', refs: [], status: 'open' });
export function objectiveAction(f: ObjectiveForm): Action {
  return { type: 'sandbox/objective', id: f.id.trim() || 'drill', ...(f.text.trim() ? { text: f.text.trim() } : {}), ...(f.refs.length ? { where: { refs: f.refs.slice(0, 6) } } : {}), status: f.status } as Action;
}
