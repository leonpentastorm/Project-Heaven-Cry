// Action descriptors (engine review 4, finding 3): ONE description of every action a unit can take now, and one way to
// preview and send it. A screen renders tabs and buttons from actionsFor(), walks each descriptor's `picks` (click a unit
// or a tile, choose an option), shows previewDescriptor()'s lines and grid marks, and on Confirm dispatches
// sendDescriptor()'s action. It never builds an action, a cost, a legality check or a target list itself.
//
//   actionsFor(g, unitId, viewer)                     every action the unit could take now, in list order, by group
//   previewDescriptor(g, unitId, id, picks, viewer)   the engine's verdict on the picks so far: the next pick and its
//                                                     choices, the cost, lines in words, units and tiles to mark (fogged)
//   sendDescriptor(g, unitId, id, picks)              the reducer action Confirm dispatches (null: a pick is missing)
//   registerActions(system)                           a new system's actions: they appear on every screen with no client
//                                                     change (docs/design/handoffs/client-boundary-3-actions.md)
//
// (previewAction(g, action, by) in preview.ts is the reducer's dry run of a finished action; previewDescriptor wraps it.)
//
// Everything here WRAPS what each system already exposes (basicActions, weaponActions, techniquePad, callPad, faithView,
// perkActionsFor, previewDraw, previewOutburst…): no rule is worked out again. The ids are the ones the screens and the
// turn card always used ('shove', 'tq:main:cut', 'cl:call.order', 'pr:hymn:x.y', 'pk:<item>#<action>', 'draw'…), so a
// player's saved turn-card picks and the two-key hotkeys keep working.
import type { Combat, Unit, AttackMode } from './combat';
import { WEAPON } from './data';
import { isMelee, attackApCost, weaponActions, previewAttack, objectsOf, dist, ROUNDS_PER_AP, heatLimit, refOf, visibility, twoJammingGuns } from './combat';
import { kindOf } from './objects';
import { apFor } from './effects/cost';
import { basicActions, reloadOffRows, offHandRows, loadPlan, moveOptions, pullFreeTargets, reachTiles, type BasicAction } from './actions';
import { previewAction, fightSeenBy, previewSeenBy, withGame, dryRun } from './preview';
import type { Action, GameState } from './game';
import { techniquePad, packPad, pairedPad, previewTechnique, shieldOf, physView } from './physical/core';
import { TECHNIQUE, weaponSystem, propText } from './physical/data';
import { callPad, previewCall } from './calls/core';
import { faithView, previewPrayer, beliefOf, FAITH_MIN, DEVOTION_XP, MIRACLE_COST_LEVELS, GATE, MIRACLE_FAITH } from './faith';
import { perkActionsFor, previewPerkAction, togglesFor, type ToggleEntry } from './effects/actions';
import type { PerkActionEntry } from './effects/actions';
import { glyphApOf, SPELL_AP, ventAp, coreAp, CORE_CHARGE, FLUX_MAX, designAp, stageMult, manaBand, MANA_START, previewOutburst, previewOutburstPlan, previewPump,
  steadyHeart, letGo, feedOutburst, setHeartWatch, previewDraw, STAGE_MULT, MAX_STAGE } from './magic';
import { focusHand, NEEDS_EVOKER, NEEDS_EMANATOR } from './character';
import { PILE, isPile } from './containers';
import { orderable, ownedVerbs, ownedWhy } from './owned';

// ---------- the types ----------
/** The tab an action sits on. */
export type DescGroup = 'move' | 'attack' | 'utility' | 'perks' | 'class' | 'shadow' | 'sigils' | 'outbursts' | 'faith' | 'calls';
/** The order of the action groups on the fight screen's tabs. */
export const GROUP_ORDER: DescGroup[] = ['move', 'attack', 'utility', 'perks', 'class', 'shadow', 'sigils', 'outbursts', 'faith', 'calls'];
/** What a pick step asks for. enemy/ally/unit: a unit clicked on the grid; tile: a tile; option: one (or up to `max`)
 * of `options`; custom: a bespoke panel the screen registers under `renderer` fills `key` (the glyph keyboard, the
 * HEART panel, a perk's form, the pile checklist, the Evoke planner). */
export type PickKind = 'enemy' | 'ally' | 'unit' | 'tile' | 'option' | 'custom';
/** One choice of an option pick: its id, label, help text, and why it is greyed out. */
export interface PickOption { id: string; label: string; text?: string; why?: string | null }
/** One pick an action asks for (a target, a tile, an option, a custom panel), with what may be picked. */
export interface PickStep {
  /** The field of `picks` this step fills (targetId, tile, opt, word…). */
  key: string;
  kind: PickKind;
  /** What to ask the player, in words. */
  prompt: string;
  /** Not needed to Confirm (it has a default). */
  optional?: boolean;
  /** The legal unit ids or tiles now, already fogged for the viewer. Absent: any (the engine's verdict rules), or
   * worked out by previewDescriptor when this step comes up (a move's tiles: costly, asked once). */
  choices?: string[];
  /** For an option step: the choices, each with the engine's reason when it can't be taken. */
  options?: PickOption[];
  /** An option step that takes several (Order's things). */
  max?: number;
  /** A custom step's panel id. */
  renderer?: string;
  /** Send as soon as this pick is made (a Move's tile, a glyph drawn on your tile). */
  auto?: boolean;
  /** The step applies only when another pick has this value (Order's tile: when `opt` holds 'move'). */
  when?: { key: string; is?: string; has?: string; not?: string };
}
/** An action's price as the engine priced it: AP, the words shown, resources. */
export interface DescCost { ap: number; text: string; res?: Record<string, number> }
/** One action a unit may take, as the client renders it: id, group, name, cost, availability, picks. */
export interface ActionDescriptor {
  /** The id a screen keeps for the picked action (and the turn card saves). */
  id: string;
  group: DescGroup;
  /** A child of another row (a technique inside its weapon's pad, a Watch inside Hold a shot). */
  parent?: string;
  name: string;
  text: string;
  cost: DescCost;
  available: boolean;
  /** The engine's refusal now (null: it can be used). */
  why: string | null;
  picks: PickStep[];
  /** The reducer action type whose switches (Ricochet, Heart Surge…) ride this action; previewDescriptor lists them. */
  toggleOn: string | null;
  /** Which preview runs: basic (the reducer's dry run), attack, technique, call, prayer, perk, sigil, outburst; none:
   * a row with nothing to send (a pad, a perk to read). */
  preview: 'basic' | 'attack' | 'technique' | 'call' | 'prayer' | 'perk' | 'sigil' | 'outburst' | 'none' | string;
  /** Not a button in the list (reached through a pad, or the turn card's legacy pick). */
  hidden?: boolean;
  /** Hold a shot / a weapon's Techniques row: it opens a pad of its children. */
  pad?: boolean;
  /** Who adjudicates it: the engine runs it all, or part goes to the Narrator. */
  engine?: boolean;
  /** The weapon hand this action belongs to (the Attack tab's areas: a weapon's shots and techniques, its reload, its
   * unjam, attacking an object with it): 'main', 'off', or 'both' for what uses both hands (the paired attack, Reload
   * both). Absent: no one weapon (Shove, Brace, Hold a shot). */
  hand?: 'main' | 'off' | 'both';
  /** A technique's text in parts (techParts), for a hover card that lays it out a line each. */
  parts?: TechParts;
}
export type Picks = Record<string, any>;
/** One line of a descriptor preview (odds, a note, a meter, a save, the cost, an ask). */
export interface PreviewLine { k: 'odds' | 'note' | 'meter' | 'save' | 'cost' | 'ask'; text: string }
/** What a preview paints on the grid (tiles, targets, an area, a path). */
export interface GridMarks {
  /** Units the action would touch (fogged: only units the viewer sees). tone: harm, help, spared, or the picked target. */
  units: { id: string; tag: string; tone: 'harm' | 'help' | 'spared' | 'target' }[];
  /** Tiles: the area it covers, the picked tile, the tiles that may be picked next. */
  tiles: { tile: string; kind: 'area' | 'pick' | 'choice' | 'reach'; /** a reach's range band (0: no penalty) */ band?: number }[];
}
/** What an action would do with these picks: ok or why not, its AP, its lines and grid marks. */
export interface DescriptorPreview {
  id: string;
  /** Whether it would go through as picked (false while a pick is missing: `ask` says which). */
  ok: boolean;
  why: string | null;
  /** The next pick in words (null: ready to Confirm). */
  ask: string | null;
  next: PickStep | null;
  ap: number;
  cost: string;
  lines: PreviewLine[];
  marks: GridMarks;
  toggles: ToggleEntry[];
  /** Each roll's own to-hit preview, by the unit it is against (the target card prints its terms). */
  rolls?: { unit: string; pv: any }[];
  /** The action Confirm sends (null: not ready). */
  action: Action | null;
}

// ---------- the context every system reads ----------
export interface DescCtx {
  g: GameState; cb: Combat; u: Unit; c: any; side: 'pc' | 'foe';
  /** The fight as the viewer's side sees it (choices and marks come from here). */
  seen: Combat;
  /** The player asking (the reducer's `by`). */
  by: string;
}
/** A system of actions: what it lists for a unit and the action each sends. preview: extra lines and marks beyond the
 * reducer's verdict. */
export interface ActionSystem {
  id: string;
  list: (x: DescCtx) => ActionDescriptor[];
  send: (x: DescCtx, d: ActionDescriptor, p: Picks) => Action | null;
  preview?: (x: DescCtx, d: ActionDescriptor, p: Picks, action: Action | null) => { lines?: PreviewLine[]; marks?: Partial<GridMarks>; ap?: number; ok?: boolean; why?: string | null; rolls?: { unit: string; pv: any }[] } | null;
  /** Whether an id is this system's (so a preview asks only the system that owns it). Absent: it is asked. */
  owns?: (id: string) => boolean;
  /** The choices of a step worked out only when it comes up (a move's tiles). */
  choices?: (x: DescCtx, d: ActionDescriptor, step: PickStep, p: Picks) => string[] | undefined;
}
const SYSTEMS: ActionSystem[] = [];
/** Add a system of actions. Its descriptors are listed in their group, after the built-in ones; previewDescriptor and
 * sendDescriptor route to it by the descriptor's id. Returns a function that removes it (for tests). */
export function registerActions(s: ActionSystem): () => void {
  const i = SYSTEMS.findIndex((x) => x.id === s.id); if (i >= 0) SYSTEMS.splice(i, 1);
  SYSTEMS.push(s);
  return () => { const j = SYSTEMS.indexOf(s); if (j >= 0) SYSTEMS.splice(j, 1); };
}

function ctxOf(g: GameState, unitId: string, viewer?: string | null): DescCtx | null {
  const cb = g?.combat as Combat | undefined; if (!cb) return null;
  const u = cb.units.find((x) => x.id === unitId); if (!u) return null;
  const c = u.charId && !u.companion ? (g.characters as any)?.[u.charId] || null : null;
  const side = (u.side === 'foe' ? 'foe' : 'pc') as 'pc' | 'foe';
  let seen = cb; try { seen = fightSeenBy(cb, side); } catch { /* a bare test fight: the whole of it */ }
  const by = viewer || (c && c.owner) || (g as any).hostId || 'host';
  return { g, cb, u, c, side, seen, by };
}

// ---------- small helpers ----------
const apT = (n: number) => n + ' AP';
/** The AP an entry of a system's own list says (a pad entry, a perk entry, a Call): its price, worked out by the engine. */
const priceOf = (entry: { ap: number }) => entry.ap;
const alive = (v: Unit) => !v.dead;
const others = (x: DescCtx) => x.seen.units.filter((v) => alive(v) && v.id !== x.u.id).map((v) => v.id);
const allyIds = (x: DescCtx, self = false) => x.seen.units.filter((v) => alive(v) && v.side === x.u.side && (self || v.id !== x.u.id)).map((v) => v.id);
/** The engine's own pick list (a door verb's reach), kept to what this side sees (the fog). */
const seenOf = (x: DescCtx, ids: string[]) => { const seen = new Set(x.seen.units.map((v) => v.id)); return ids.filter((id) => seen.has(id)); };
const foeIds = (x: DescCtx) => x.seen.units.filter((v) => alive(v) && v.side !== x.u.side).map((v) => v.id);
const mx = (p: Picks) => (Array.isArray(p.mods) && p.mods.length ? { mods: p.mods as string[] } : {});
const safe = <T>(f: () => T, d: T): T => { try { return f(); } catch { return d; } };
/** A descriptor with defaults filled. */
function D(id: string, group: DescGroup, name: string, ap: number, costText: string, text: string, why: string | null, o: Partial<ActionDescriptor> = {}): ActionDescriptor {
  return { id, group, name, text, cost: { ap, text: costText }, available: !why, why: why || null, picks: [], toggleOn: null, preview: 'basic', ...o };
}
/** A unit that can't use techniques (a companion, a puppet, a unit with a fixed action list): the old attack rows. */
export const isLegacyUnit = (u: any) => !!u && (!!u.companion || Array.isArray(u.allowedActions) || u.side !== 'pc');

// ---------- techniques (rules 1.12): ids and option lists ----------
export const TQ = 'tq:', TPAD = 'tpad:', TWATCH = 'twatch';
export const techId = (hand: string, id: string, item?: string | number | null) => TQ + hand + ':' + id + (item != null && item !== '' ? '@' + item : '');
export function parseTechId(a: string | null | undefined): { hand: 'main' | 'off' | 'both'; id: string; item?: string | number } | null {
  if (!a || !a.startsWith(TQ)) return null;
  const [hand, rest] = [a.slice(TQ.length).split(':')[0], a.slice(TQ.length).split(':').slice(1).join(':')];
  if (!['main', 'off', 'both'].includes(hand) || !rest) return null;
  const at = rest.indexOf('@'), id = at >= 0 ? rest.slice(0, at) : rest, itemS = at >= 0 ? rest.slice(at + 1) : null;
  return { hand: hand as any, id, ...(itemS != null ? { item: /^\d+$/.test(itemS) ? Number(itemS) : itemS } : {}) };
}
/** What a technique's text lets you choose beyond its property line (args.opt). The first with '' is sent when nothing
 * is picked. */
export const TECH_OPTIONS: Record<string, [string, string, string][]> = {
  called_shot: [['leg', 'LEG', 'Slowed on a hit.'], ['arm', 'ARM', 'Its weapon is lowered on a hit.'], ['head', 'HEAD', 'Dazed on a hit.']],
  run_through: [['', 'KEEP IT', 'Pull the weapon back after the thrust.'], ['leave', 'LEAVE IT IN', 'Only with a Reach weapon: you leave the weapon in the target and are unarmed. The target stays Pinned until the weapon is pulled out.']],
  bash: [['', 'DAZE', 'The target is Dazed.'], ['push', 'PUSH', 'With a Heavy weapon: the target is pushed 2 tiles instead.']],
  trip: [['', 'TRIP', 'The target goes Prone.'], ['grapple', 'GO DOWN WITH IT', 'With bare hands, on a target next to you: you go Prone with it, and it is Grappled as well.']],
  raise_shield: [['1', 'TURN 1', '1 Momentum becomes 1 Guard.'], ['2', 'TURN 2', '2 Momentum become 2 Guard.'], ['', 'ALL', 'All your Momentum becomes Guard, as much as the pool holds.']],
  drag: [['', 'AUTO', 'Pull it to you, or swap places when it is next to you.'], ['pull', 'PULL', 'Pull it toward you.'], ['swap', 'SWAP', 'Change places with it.']],
};
/** The opt sent for a technique (the '' choice, else the first, when nothing was picked). */
export const techOpt = (id: string, picked: string | null | undefined): string | null => { const o = TECH_OPTIONS[id]; if (!o) return null; const v = picked != null && o.some((x) => x[0] === picked) ? picked : (o.find((x) => x[0] === '') || o[0])[0]; return v || null; };
const aimOf = (id: string): string => (TECHNIQUE as any)[id]?.aim || 'enemy';
/** A technique's requirement as a sentence ("Needs a Pressed target. "), or ''. */
function needsText(id: string): string {
  const d: any = (TECHNIQUE as any)[id]; if (!d) return '';
  const n = d.needs || {}, out: string[] = [];
  const spends = d.system === 'melee' && !d.free && d.numbers?.momentum_cost !== 0;
  if (d.group === 'opener') out.push('An Opener can only be your first melee technique of the turn.' + (spends ? ' It costs 1 Momentum, but your first Opener of a fight is free.' : ''));
  if (d.group === 'strike' && spends) out.push('A Strike costs 1 Momentum.');
  if (n.momentum) out.push('Needs ' + n.momentum + ' Momentum or more, and spends all of it. It ends your chain for the turn.');
  if (n.held && !/^Only on a target/.test(d.text || '')) out.push('Needs a target you have Grappled or Bound.');
  if (n.pressed) out.push('Needs a Pressed target (Pressure 2 or more), and lowers that Pressure by 2. You can make one Take a turn.');
  if (n.hidden) out.push('Only while you are Hidden.');
  if (n.last_round && !/^Only with the last/.test(d.text || '')) out.push('Only with the last round in the weapon.');
  if (n.stowed) out.push('Used with a weapon in your pack, not the one in your hand.');
  return out.length ? out.join(' ') + ' ' : '';
}
/** A pad entry's card text in parts (the hover card lays them out a line each; Leon, live 0.23.0): what it needs, what it
 * does, its line with this weapon, and the weapon's properties behind that line (each with the glossary's words). */
export interface TechParts { needs: string; text: string; line: string; traits: { label: string; text: string }[] }
export function techParts(e: { id: string; text: string; line?: string | null }): TechParts {
  const full = (t: string) => (/[.!?:)]$/.test(t.trim()) ? t.trim() : t.trim() + '.');
  const ln = e.line ? (((TECHNIQUE as any)[e.id]?.lines) || []).find((l: any) => l.text === e.line) : null;
  const traits = ln ? ln.props.filter((p: string) => !!propText(p)).map((p: string) => ({ label: p.charAt(0).toUpperCase() + p.slice(1), text: propText(p) })) : [];
  return { needs: needsText(e.id).trim(), text: full(e.text), line: e.line ? full(e.line) : '', traits };
}
/** A pad entry's card text, as the pad shows it: what it needs, its text, its line with this weapon, the property. */
export function techHelp(e: { id: string; text: string; line?: string | null }): string {
  const t = techParts(e), why1 = t.traits.map((x) => x.label + ': ' + x.text).join(' ');
  return (t.needs ? t.needs + ' ' : '') + t.text + (t.line ? ' With this weapon: ' + t.line : '') + (why1 ? ' (' + why1 + ')' : '');
}
/** A technique's pick steps by what it aims at, then its line and its options. */
function techPicks(x: DescCtx, e: { id: string; choices?: { prop: string; text: string }[] }): PickStep[] {
  const aim = aimOf(e.id), out: PickStep[] = [];
  if (aim === 'enemy' || aim.startsWith('enemy')) out.push({ key: 'targetId', kind: 'enemy', prompt: 'Click an enemy on the map.', choices: others(x) });
  if (aim === 'ally') out.push({ key: 'allyId', kind: 'ally', prompt: 'Click an ally on the map.', choices: allyIds(x) });
  if (aim === 'tile' || aim.endsWith('+tile')) out.push({ key: 'tile', kind: 'tile', prompt: aim === 'enemy+tile' ? 'Now click the tile.' : 'Click a tile on the map.' });
  if (e.choices && e.choices.length > 1) out.push({ key: 'line', kind: 'option', prompt: 'Which line applies.', optional: true, options: e.choices.map((c) => ({ id: c.prop, label: c.prop.toUpperCase(), text: c.text })) });
  const o = TECH_OPTIONS[e.id]; if (o) out.push({ key: 'opt', kind: 'option', prompt: 'Choose how.', optional: true, options: o.map(([id, label, text]) => ({ id, label, text })) });
  return out;
}

// ---------- calls: Order's things ----------
/** What an Order can tell an ally to do: [id, label, what it means, the step it opens at]. */
export const ORDER_THINGS: [string, string, string, number][] = [
  ['reload', 'RELOAD', 'They reload now, for none of their AP.', 1], ['stand', 'STAND UP', 'They stand up now, for none of their AP.', 1],
  ['pickup', 'PICK UP', 'They pick up the pile under or next to them, for none of their AP.', 1], ['move', 'MOVE', 'They move to the tile you name, as far as 1 AP walks them.', 2],
];
export const orderMax = (step: number) => (step >= 3 ? 2 : 1);
const SAVE_NAME: Record<string, string> = { body: 'Body', brain: 'Brain', heart: 'Heart' };

// ---------- prayers ----------
export const PR = 'pr:';
export const prayId = (kind: string, id: string) => PR + kind + ':' + id;
export function parsePrayId(a: string | null | undefined): { kind: 'whisper' | 'hymn' | 'miracle'; id: string } | null {
  if (!a || !a.startsWith(PR)) return null; const i = a.indexOf(':', PR.length); return { kind: a.slice(PR.length, i) as any, id: a.slice(i + 1) };
}
/** The chance a d20 + mod meets the TN, in percent (a 1 always misses, a 20 always hits). */
export function oddsPct(tn: number, mod: number): number { const need = tn - mod, hits = Math.max(1, Math.min(19, 21 - Math.max(2, need))); return Math.round((hits / 20) * 100); }
export function prayOdds(p: { mode: string; roll?: { tn: number; mod: number } }): string {
  if (p.mode === 'standing' || !p.roll) return 'SURE';
  const pct = oddsPct(p.roll.tn, p.roll.mod) + '%';
  return p.mode === 'overreach' ? 'OVERREACH · TN ' + p.roll.tn + ' · ' + pct : 'TN ' + p.roll.tn + ' · ' + pct;
}
/** A prayer's target as pick steps. */
function prayPicks(target: string, valid: string[], seenTiles?: string[]): PickStep[] {
  const unit = (key: string, kind: PickKind, prompt: string, optional = false): PickStep => ({ key, kind, prompt, choices: valid, ...(optional ? { optional } : {}) });
  switch (target) {
    case 'self': case 'none': return [];
    case 'self_or_ally': return [unit('targetId', 'ally', 'Click yourself or an ally.')];
    case 'ally': return [unit('targetId', 'ally', 'Click an ally.')];
    case 'downed_ally': return [unit('targetId', 'ally', 'Click a Downed ally.')];
    case 'dead_ally': return [unit('targetId', 'ally', 'Click a fallen ally.')];
    case 'enemy': return [unit('targetId', 'enemy', 'Click an enemy.')];
    case 'tile': return [{ key: 'tile', kind: 'tile', prompt: 'Click a tile in sight.', ...(seenTiles ? { choices: seenTiles } : {}) }];
    case 'two_units': return [unit('targetId', 'unit', 'Click two on the grid.'), unit('targetId2', 'unit', 'Click a second one.')];
    case 'two_allies': return [unit('targetId', 'ally', 'Click two on the grid.'), unit('targetId2', 'ally', 'Click a second one.')];
    default: return [unit('targetId', 'unit', 'Click a target.')];
  }
}

// ---------- perks, traits and class moves ----------
export const PK = 'pk:';
export const perkId = (e: { id: string; actionId: string }) => PK + e.id + '#' + e.actionId;
export function parsePerkId(id: string | null | undefined): { id: string; actionId: string } | null { if (!id || !id.startsWith(PK)) return null; const [k, a] = id.slice(PK.length).split('#'); return { id: k, actionId: a }; }
export const perkCost = (e: PerkActionEntry) => (e.arm ? (e.armed ? 'ARMED' : 'arm') : priceOf(e) + ' AP') + (e.uses.label ? ' · ' + e.uses.label : '');
/** An on/off policy pair names the one in force; Eye of the Storm reads ARMED once armed. */
export function perkState(e: PerkActionEntry): { tag: string; why: string | null } {
  const pol = /^(.*)_(on|off)$/.exec(e.actionId);
  if (pol && e.why === 'Already set.') return { tag: ' ✓', why: 'In force now. ' + (pol[2] === 'on' ? 'On is the default.' : 'It stays off for this fight.') };
  if (e.why === 'Already armed.') return { tag: ' · ARMED', why: 'Armed. Your next Release this turn uses it.' };
  return { tag: '', why: e.why };
}
export const perkText = (e: PerkActionEntry) => e.text + (e.engine ? '' : ' The Narrator decides the rest.');
function perkEntriesOf(x: DescCtx): PerkActionEntry[] { return safe(() => withGame(x.g, () => perkActionsFor({ u: x.u, c: x.c, cb: x.cb, g: x.g }, 'combat')), []); }

// ---------- the built-in systems ----------
const BASIC_SEND: Record<string, (x: DescCtx, p: Picks) => any> = {
  move: (x, p) => p.tile && { type: 'combat/move', unitId: x.u.id, to: p.tile, how: 'move', ...mx(p) },
  sprint: (x, p) => p.tile && { type: 'combat/move', unitId: x.u.id, to: p.tile, how: 'sprint', ...mx(p) },
  disengage: (x, p) => p.tile && { type: 'combat/move', unitId: x.u.id, to: p.tile, how: 'disengage', ...mx(p) },
  prone: (x) => ({ type: 'combat/prone', unitId: x.u.id }),
  shove: (x, p) => p.targetId && { type: 'combat/shove', unitId: x.u.id, targetId: p.targetId },
  cover: (x, p) => p.tile && { type: 'combat/shoot-cover', unitId: x.u.id, tile: p.tile },
  door: (x, p) => p.tile && { type: 'combat/door', unitId: x.u.id, tile: p.tile },
  pickup: (x, p) => { const t = p.tile || pileTiles(x, true)[0]; return t && { type: 'combat/pickup', unitId: x.u.id, tile: t, ...(p.take ? { take: p.take } : {}) }; },
  stim: (x, p) => p.targetId && { type: 'combat/stim', unitId: x.u.id, targetId: p.targetId },
  song: (x) => ({ type: 'combat/song', unitId: x.u.id }),
  extinguish: (x) => ({ type: 'combat/extinguish', unitId: x.u.id }),
  escape: (x) => ({ type: 'combat/escape', unitId: x.u.id }),
  recover: (x) => ({ type: 'combat/recover', unitId: x.u.id }),
  pullfree: (x, p) => { const ts = pullFreeTargets(x.cb, x.u), t = ts.find((v) => v.id === p.targetId) || ts[0]; return t && { type: 'combat/pull-free', unitId: x.u.id, targetId: t.id }; },
  hide: (x) => ({ type: 'combat/hide', unitId: x.u.id }),
  analyze: (x, p) => (p.readTile ? { type: 'combat/read', unitId: x.u.id, tile: p.readTile } : p.targetId && { type: 'combat/analyze', unitId: x.u.id, targetId: p.targetId }),
  reload: (x) => ({ type: 'combat/reload', unitId: x.u.id }),
  'reload-tac': (x) => ({ type: 'combat/reload', unitId: x.u.id, tactical: true }),
  reload2: (x) => ({ type: 'combat/reload', unitId: x.u.id, hand: 'both' }),
  'reload2-tac': (x) => ({ type: 'combat/reload', unitId: x.u.id, hand: 'both', tactical: true }),
  'reload-off': (x) => ({ type: 'combat/reload', unitId: x.u.id, hand: 'off' }),
  'reload-off-tac': (x) => ({ type: 'combat/reload', unitId: x.u.id, hand: 'off', tactical: true }),
  clear: (x) => ({ type: 'combat/clear', unitId: x.u.id }),
  'clear-off': (x) => ({ type: 'combat/clear', unitId: x.u.id, hand: 'off' }),
  'cover-off': (x, p) => p.tile && { type: 'combat/shoot-cover', unitId: x.u.id, tile: p.tile, hand: 'off' },
  brace: (x) => ({ type: 'combat/brace', unitId: x.u.id }),
  repair: (x) => ({ type: 'combat/repair', unitId: x.u.id }),
  load: (x) => ({ type: 'combat/load', unitId: x.u.id }),
  overwatch: (x) => { const w: any = WEAPON[x.u.weapon]; return { type: 'combat/overwatch', unitId: x.u.id, mode: w && isMelee(w) ? 'melee' : 'shot' }; },
  paired: (x, p) => p.targetId && { type: 'combat/paired', unitId: x.u.id, targetId: p.targetId },
  skill: (x, p) => ({ type: 'combat/skill', unitId: x.u.id, ...(p.targetId ? { targetId: p.targetId } : {}) }),
  shot: (x, p) => p.targetId && { type: 'combat/attack', unitId: x.u.id, targetId: p.targetId, mode: 'shot', ...mx(p) },
  aimed: (x, p) => p.targetId && { type: 'combat/attack', unitId: x.u.id, targetId: p.targetId, mode: 'aimed', ...mx(p) },
  melee: (x, p) => p.targetId && { type: 'combat/attack', unitId: x.u.id, targetId: p.targetId, mode: 'melee', ...mx(p) },
  burst: (x, p) => p.targetId && { type: 'combat/attack', unitId: x.u.id, targetId: p.targetId, mode: 'burst', ...mx(p) },
  auto: (x, p) => p.targetId && { type: 'combat/attack', unitId: x.u.id, targetId: p.targetId, mode: 'auto', ...mx(p) },
};
const ATTACK_IDS = ['shot', 'aimed', 'melee', 'burst', 'auto'];
/** Piles the viewer sees; inReach: on the unit's tile or next to it, nearest first. */
function pileTiles(x: DescCtx, inReach = false): string[] {
  const ps = objectsOf(x.seen).filter((o: any) => isPile(o) && !o.hidden && (o.items || []).length && (!inReach || dist(x.u.pos, o.pos) <= 1));
  return ps.sort((a: any, b: any) => dist(x.u.pos, a.pos) - dist(x.u.pos, b.pos)).map((o: any) => o.pos);
}
/** The pick steps of a basic action (the list in data/actions.json `pick` says the kind; the choices are the engine's). */
function basicPicks(x: DescCtx, id: string): PickStep[] {
  switch (id) {
    case 'move': case 'sprint': case 'disengage': return [{ key: 'tile', kind: 'tile', prompt: 'Hover a highlighted tile to see the path and its AP cost; click to move.', auto: true }];
    case 'shove': return [{ key: 'targetId', kind: 'unit', prompt: 'Click an adjacent enemy.', choices: others(x) }];
    case 'cover': case 'cover-off': return [{ key: 'tile', kind: 'tile', prompt: 'Click an object with HP.', choices: objectsOf(x.seen).filter((o: any) => o.hp != null && o.hp > 0 && !(o.rig && o.side && o.side !== x.side)).map((o: any) => o.pos) }];
    case 'door': return [{ key: 'tile', kind: 'tile', prompt: 'Click an adjacent door.', choices: objectsOf(x.seen).filter((o: any) => kindOf(o).door && dist(x.u.pos, o.pos) <= 1).map((o: any) => o.pos) }];
    case 'pickup': return [{ key: 'tile', kind: 'tile', prompt: 'Click a pile next to you.', optional: true, choices: pileTiles(x) }, { key: 'take', kind: 'custom', renderer: 'pile', prompt: 'Untick what to leave on the ground.', optional: true }];
    case 'stim': return [{ key: 'targetId', kind: 'ally', prompt: 'Click an adjacent ally.', choices: allyIds(x, true) }];
    case 'pullfree': return [{ key: 'targetId', kind: 'unit', prompt: 'Click whom to pull free.', optional: true, choices: pullFreeTargets(x.cb, x.u).map((v) => v.id) }];
    case 'analyze': return [{ key: 'targetId', kind: 'enemy', prompt: 'Click a hostile, or a glyph or trace to read (dashed).', choices: foeIds(x) }];
    case 'paired': case 'shot': case 'aimed': case 'melee': case 'burst': case 'auto': return [{ key: 'targetId', kind: 'enemy', prompt: 'Click a hostile to target it.', choices: others(x) }];
    case 'skill': return [{ key: 'targetId', kind: 'enemy', prompt: 'Click a hostile.', optional: true, choices: foeIds(x) }];
    default: return [];
  }
}
const TOGGLE_ON: Record<string, string> = { shot: 'combat/attack', aimed: 'combat/attack', melee: 'combat/attack', burst: 'combat/attack', auto: 'combat/attack', move: 'combat/move', sprint: 'combat/move', disengage: 'combat/move', outburst: 'combat/outburst', release: 'combat/release', pump: 'combat/pump', evoke: 'combat/evoke' };

/** The weapon rows, the basic actions and the technique pads: the Move, Attack and Utility tabs. */
const PHYSICAL: ActionSystem = {
  id: 'physical',
  owns: (id) => !/^(pk|cl|pr|ow):/.test(id) && !(id in MAGIC_SEND),
  list(x) {
    const { cb, u, c, g } = x, w: any = WEAPON[u.weapon], melee = w ? isMelee(w) : false, modes = (w && w.modes) || [];
    const wa = safe(() => weaponActions(u, cb), [] as any[]), W = (id: string) => wa.find((a: any) => a.id === id);
    const offW: any = u.offWeapon ? WEAPON[u.offWeapon] : null, legacy = isLegacyUnit(u);
    const basic: BasicAction[] = safe(() => withGame(g, () => basicActions(cb, u, { c, g })), []);
    const B = (...ids: string[]) => ids.flatMap((id) => basic.filter((r) => r.id === id).map((r) => D(r.id, r.tab, r.label, r.ap, r.cost, r.text, r.why, { picks: basicPicks(x, r.id), toggleOn: TOGGLE_ON[r.id] || null })));
    const pads = legacy ? [] : techRows(x);
    const dual = pads.some((d) => d.id === TPAD + 'both' || d.id === 'paired');
    const gunTab = (!!w && !melee && w.id !== 'fists') || (!!offW && !isMelee(offW));
    const wRow = (id: string, group: DescGroup, o: Partial<ActionDescriptor> & { label?: string; cost?: string; text?: string } = {}) => { const a: any = W(id); return a ? [D(id, group, o.label || a.label, a.ap, o.cost || apT(a.ap), o.text || a.text, a.why, { picks: basicPicks(x, id), ...o })] : []; };
    // two guns that can jam: ONE Clear jam, in the Both area (Leon's ruling, 13 Nov 2026; Hands 5d); one gun: its own area
    const clear = (group: DescGroup) => wRow('clear', group, { hand: twoJammingGuns(u) ? 'both' : 'main' });
    const reloads = (group: DescGroup): ActionDescriptor[] => {
      const R: any = W('reload'); if (!R) return [];
      const unit = (w && w.reload_unit) || 'magazine', now = w && w.magazine != null ? ' ' + u.ammo + ' / ' + w.magazine + ' loaded now.' : '';
      if (!R.tactical) return [D('reload', group, R.label, R.ap, apT(R.ap), R.text + now, R.why, { hand: 'main' })];
      const nm = /^(Swap magazine|Reload)$/.test(R.label) ? 'Reload' : R.label;
      return [D('reload', group, nm + ' (speed)', R.ap, R.ap + ' AP · the ' + unit + ' drops', 'Swap in your fullest spare ' + unit + ' (' + (u.mags || []).length + ' left). The one in the gun drops onto your tile with its rounds still in it. You can pick it up later and refill it with Load.' + now, R.why, { hand: 'main' }),
        D('reload-tac', group, nm + ' (tactical)', R.tactical.ap, R.tactical.ap + ' AP · the ' + unit + ' goes in your pack', 'Swap in your fullest spare ' + unit + ' for ' + PILE.tactical_reload_extra_ap + ' AP more. The one in the gun goes back in your pack with its rounds still in it.' + now, R.tactical.why, { hand: 'main' })];
    };
    const bothRows = B('reload2', 'reload2-tac').map((d) => ({ ...d, hand: 'both' as const }));
    // the off-hand gun's own reload (its own AP): reloading one gun never blocks the other
    const offRows = (group: DescGroup): ActionDescriptor[] => safe(() => withGame(g, () => reloadOffRows(cb, u, { c, g })), [] as any[]).map((r: any) => D(r.id, group, r.label, r.ap, r.cost, r.text, r.why, { hand: 'off' }));
    // the off-hand weapon's own Attack an object (and Clear jam, for a single off-hand gun) (its jam, rounds, range and damage)
    const offHand = (id: string): ActionDescriptor[] => safe(() => withGame(g, () => offHandRows(cb, u, { c, g })), [] as any[]).filter((r: any) => r.id === id).map((r: any) => D(r.id, 'attack', r.label, r.ap, r.cost, r.text, r.why, { hand: 'off', picks: basicPicks(x, r.id) }));
    const out: ActionDescriptor[] = [...B('move', 'sprint', 'disengage', 'prone')];
    // ----- attack -----
    const atk: ActionDescriptor[] = [];
    if (legacy) {
      const dummy = (id: string, name: string, ap: number, text: string) => D(id, 'attack', name, ap, apT(ap), text, null, { picks: basicPicks(x, id), toggleOn: 'combat/attack', preview: 'attack' });
      if (melee) atk.push(dummy('melee', 'Strike', attackApCost(w, 'melee'), 'd20 + ' + String(w.skill).replace('_', ' ') + ' vs Defense. ' + w.damage + ' damage.'));
      else {
        atk.push(dummy('shot', 'Shot', w ? attackApCost(w, 'shot') : 2, 'd20 + Dexterity against Defense, at −5 if the target is behind half cover. ' + (w && typeof w.damage === 'number' ? w.damage + ' damage. ' : '') + 'Heat +1.'));
        atk.push(dummy('aimed', 'Aimed shot', attackApCost(w || WEAPON.fists, 'aimed'), '+2 to hit, and a critical hit on 19–20.'));
        if (modes.includes('burst') && W('burst')) atk.push(dummy('burst', 'Burst', W('burst').ap, 'Fire 3 rounds at one target, with two rolls. The second roll is at −4 to hit (−3 with a Quick weapon, −1 with a Heavy weapon that is braced).'));
        if (modes.includes('auto') && W('auto')) atk.push(dummy('auto', 'Full auto', W('auto').ap, 'Fire 10 rounds. Every enemy near the line to your target is attacked with one roll at −2 to hit.'));
      }
      atk.push(...wRow('overwatch', 'attack', { why: null, available: true }));
      // a legacy unit's weapon skill (the turn card may pick it): a hidden row
      const sk = w && w.grants, fx = (sk && sk.effect) || {};
      if (['multi_shot', 'sweep'].includes(fx.op)) { const a: any = W('skill'); atk.push(D('skill', 'attack', sk.name, fx.ap || 0, apT(fx.ap || 0), sk.text || sk.name, a ? a.why : null, { picks: basicPicks(x, 'skill'), hidden: true })); }
    } else {
      // the both-hands block gets Reload both after its first row
      const both = dual ? bothRows.map((d) => ({ ...d, group: 'attack' as DescGroup })) : [];
      let at = pads.findIndex((d) => d.id === TPAD + 'both'); if (at < 0) at = pads.findIndex((d) => d.id === 'paired');
      atk.push(...(at < 0 || !both.length ? pads : [...pads.slice(0, at + 1), ...both, ...pads.slice(at + 1)]));
      if (w && !melee) atk.push(D('melee', 'attack', 'Strike (weapon\'s butt)', attackApCost(WEAPON.fists, 'melee'), apT(attackApCost(WEAPON.fists, 'melee')), 'Hit an enemy next to you with the gun itself: d20 + Raw Power against Defense, for the damage of a bare-hand strike. It uses no round and adds no Heat.', null, { picks: basicPicks(x, 'melee'), toggleOn: 'combat/attack', preview: 'attack', hand: 'main' }));
    }
    if (offW && !dual) atk.push(D('paired', 'attack', 'Both hands (' + offW.name + ')', 0, 'AP +1', 'Attack with both weapons in one action. It costs the higher of the two AP costs, plus 1. The main hand is at −1 to hit and the off hand at −3, improved by 1 for every 3 points of Dexterity, up to −1.', null, { picks: basicPicks(x, 'paired'), preview: 'attack', hand: 'both' }));
    if (gunTab) atk.push(...reloads('attack'), ...offRows('attack'), ...clear('attack'), ...offHand('clear-off'));
    atk.push(...B('shove'), ...wRow('brace', 'attack'), ...B('cover').map((d) => (w ? { ...d, hand: 'main' as const } : d)), ...offHand('cover-off'));
    out.push(...atk);
    // ----- utility -----
    const L: any = W('load'), li = L && !L.why ? safe(() => loadPlan(g, cb, u), null) : null;
    out.push(...B('pullfree'), ...(gunTab ? [] : [...reloads('utility'), ...offRows('utility')]),
      ...(L ? [D('load', 'utility', L.label, li ? li.ap : L.ap, li ? li.ap + ' AP' : '1 AP / ' + ROUNDS_PER_AP + ' rds', li ? 'Load ' + li.rounds + ' loose rounds into your fullest part-empty ' + (w.reload_unit || 'magazine') + '.' : L.text, L.why)] : []),
      ...(gunTab ? [] : clear('utility')),
      ...wRow('repair', 'utility', { label: 'Field Repair', text: 'Needs Improvisation 3 and one spare-parts charge (' + (u.parts || 0) + ' left). Your weapon regains 10% durability, plus 5% for each Improvisation point above 3. Weapon durability: ' + (u.maxDur ? (u.dur ?? u.maxDur) + '/' + u.maxDur : 'n/a') + '.' }),
      ...B('pickup', 'door', 'stim', 'song', 'extinguish', 'escape', 'recover'), ...(dual ? [] : bothRows), ...B('hide', 'analyze'));
    return out;
  },
  send(x, d, p) {
    const t = parseTechId(d.id);
    if (t) return { type: 'combat/technique', unitId: x.u.id, id: t.id, hand: t.hand, ...(t.item != null ? { item: t.item } : {}), ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.allyId ? { allyId: p.allyId } : {}), ...(p.tile ? { tile: p.tile } : {}), ...(p.line ? { line: p.line } : {}), ...((() => { const o = techOpt(t.id, p.opt); return o ? { opt: o } : {}; })()), ...mx(p) } as any;
    const f = BASIC_SEND[d.id]; return f ? f(x, p) || null : null;
  },
  choices(x, d, step, p) {
    if (step.key === 'tile' && ['move', 'sprint', 'disengage'].includes(d.id)) return Object.keys(safe(() => moveOptions(x.g, x.cb, x.u.id, d.id as any, { mods: p.mods || null }), { tiles: {} } as any).tiles);
    return undefined;
  },
  preview(x, d, p, action) {
    const t = parseTechId(d.id);
    if (t) return techPreviewOf(x, t, p);
    if (d.preview === 'attack' && p.targetId) {
      const tg = x.cb.units.find((v) => v.id === p.targetId); if (!tg || d.id === 'paired') return null;
      const pv: any = safe(() => withGame(x.g, () => previewAttack(x.cb, x.u, tg, (d.id === 'skill' ? 'shot' : d.id) as AttackMode)), null);
      if (!pv) return null;
      const say = basicSay(x, d, p);
      return { lines: pv.ok ? [{ k: 'odds', text: tg.name + ': ' + pv.pct + '% to hit' }, ...(say ? [{ k: 'note' as const, text: say }] : [])] : [], ...(pv.ok ? { ap: pv.ap } : {}), ...(pv.ok ? {} : { ok: false, why: pv.why }), marks: { units: [{ id: tg.id, tag: pv.ok ? pv.pct + '%' : '', tone: 'target' }] } };
    }
    { const say = basicSay(x, d, p); if (say) return { lines: [{ k: 'note', text: say }], marks: p.targetId ? { units: [{ id: p.targetId, tag: '', tone: 'target' }] } : {} }; }
    if (['move', 'sprint', 'disengage'].includes(d.id) && p.tile) { const mo: any = safe(() => moveOptions(x.g, x.cb, x.u.id, d.id as any, { mods: p.mods || null }), null); const tl = mo && mo.tiles[p.tile]; return tl ? { ap: tl.ap, lines: [{ k: 'cost', text: tl.ap + ' AP for ' + tl.tiles + (tl.tiles === 1 ? ' tile' : ' tiles') }] } : null; }
    void action; return null;
  },
};
/** What Confirm will do, in words, for a basic action with these picks (the panel's line under the name). */
function basicSay(x: DescCtx, d: ActionDescriptor, p: Picks): string | null {
  const u = x.u, w: any = WEAPON[u.weapon], unitW = (w && w.reload_unit) || 'magazine', rounds = u.ammo + (u.ammo === 1 ? ' round' : ' rounds');
  const t = p.targetId ? x.cb.units.find((v) => v.id === p.targetId) : null, obj = p.tile ? objectsOf(x.seen).find((o: any) => o.pos === p.tile) as any : null;
  switch (d.id) {
    case 'reload': return d.name.endsWith('(speed)') ? 'Confirm: a speed reload, ' + d.cost.ap + ' AP. The ' + unitW + ' in the gun (' + rounds + ') drops into the pile on your tile, ' + refOf(u.pos) + '.' : 'Confirm to reload.';
    case 'reload-tac': return 'Confirm: a tactical reload, ' + d.cost.ap + ' AP. The ' + unitW + ' in the gun (' + rounds + ') goes back in your pack.';
    case 'reload2': return 'Confirm to reload both guns: the old magazines drop into the pile on your tile.';
    case 'reload2-tac': return 'Confirm to reload both guns: the old magazines go back in your pack.';
    case 'reload-off': return 'Confirm to reload the off-hand gun' + (d.cost.text.includes('drops') ? ': the old ' + ((WEAPON as any)[u.offWeapon as string]?.reload_unit || 'magazine') + ' drops into the pile on your tile.' : '.');
    case 'reload-off-tac': return 'Confirm: a tactical reload of the off-hand gun, ' + d.cost.ap + ' AP. The old ' + ((WEAPON as any)[u.offWeapon as string]?.reload_unit || 'magazine') + ' goes back in your pack.';
    case 'hide': return 'Confirm to go to ground.'; case 'extinguish': return 'Confirm to put out the fire.'; case 'escape': return 'Confirm to strain against the hold.'; case 'recover': return 'Confirm to get your weapon back up.';
    case 'clear': return 'Confirm to clear the jam.'; case 'clear-off': return 'Confirm to clear the off-hand gun\'s jam.'; case 'repair': return 'Confirm to repair your weapon.'; case 'song': return 'Confirm to play your song for the room.';
    case 'prone': return 'Confirm to ' + (u.prone ? 'stand up' : 'drop prone') + '.'; case 'brace': return 'Confirm to brace your weapon.'; case 'overwatch': return 'Confirm to hold a shot on overwatch.';
    case 'stim': return t ? 'Target: ' + t.name + '. Confirm to use a stim.' : null;
    case 'shove': return t ? 'Shove ' + t.name + '. Confirm.' : null;
    case 'paired': return t ? 'Both hands at ' + t.name + '. Confirm.' : null;
    case 'pullfree': return t ? 'Pull ' + (t.id === u.id ? 'yourself' : t.name) + ' free. Confirm.' : null;
    case 'cover': case 'cover-off': return obj && obj.hp > 0 ? 'Target: ' + obj.name + ', HP ' + obj.hp + '. Confirm to attack it' + (d.id === 'cover-off' ? ' with the off-hand weapon' : '') + '.' : null;
    case 'door': return obj && kindOf(obj).door ? (obj.open ? 'Close' : 'Open') + ' the door at ' + refOf(obj.pos) + '. Confirm.' : null;
    case 'load': { const li = safe(() => loadPlan(x.g, x.cb, u), null); return li ? 'Confirm to load ' + li.rounds + ' rounds for ' + li.ap + ' AP.' : 'Nothing to load: you need loose rounds and a part-empty magazine.'; }
    case 'analyze': return t ? ((t as any).analyzedBy ? t.name + ' is already analyzed.' : 'Target: ' + t.name + '. Click a hostile to change. Confirm to analyze.') : null;
    case 'shot': case 'aimed': case 'melee': case 'burst': case 'auto': case 'skill': return t ? (t.side === u.side ? 'FRIENDLY FIRE: you are attacking ' + t.name + '. Confirm if you mean it.' : 'Click a hostile to change target. Confirm to attack.') : null;
  }
  return null;
}
/** The technique rows: each held weapon's plain attack (Cut, Shot), its Techniques pad and its chips, the both-hands
 * block, and Hold a shot with its Watches. Ids as techView always had them. */
function techRows(x: DescCtx): ActionDescriptor[] {
  const { cb, u, g } = x, out: ActionDescriptor[] = [];
  const shield = !u.offWeapon ? safe(() => shieldOf(u), null) : null;
  const hands: ('main' | 'off')[] = ['main', ...((u.offWeapon && WEAPON[u.offWeapon]) || shield ? ['off' as const] : [])];
  const watch: ActionDescriptor[] = [], seenW = new Set<string>();
  const chip = (hand: string, e: any, parent: string | undefined, item?: string | number) => D(techId(hand, e.id, item), 'attack', e.name, priceOf(e), apT(priceOf(e)), techHelp(e), e.ok ? null : (e.why || 'Not now.').replace(/\.+$/, '') + '.', { parent, picks: techPicks(x, e), toggleOn: 'combat/attack', preview: 'technique', hidden: !!parent, hand: hand as any, parts: techParts(e) });
  const sys: Record<string, string> = {};
  for (const hand of hands) {
    let pad: any[] = safe(() => techniquePad(cb, u, hand, g), []);
    if (hand === 'off' && shield) {
      const have = new Set(pad.flatMap((gr: any) => gr.entries.map((e: any) => e.id)));
      const more = (safe(() => techniquePad(cb, u, 'main', g), [] as any[]).find((gr: any) => gr.group === 'answer')?.entries || []).filter((e: any) => !have.has(e.id) && ((TECHNIQUE as any)[e.id]?.numbers as any)?.guard_cost);
      if (more.length) pad = [...pad, { group: 'answer', label: 'Answers', entries: more }];
      const chips = pad.filter((gr: any) => gr.group !== 'watch' && gr.group !== 'answer').flatMap((gr: any) => gr.entries.filter((e: any) => !e.plain));
      const usable = chips.filter((e: any) => e.ok).length, name = 'Shield';
      out.push(D(TPAD + hand, 'attack', 'Shield techniques · ' + usable, 0, chips.length ? usable + ' of ' + chips.length + ' now' : '', 'What you can do with the ' + name + '. Pick Shield Bash or Raise Shield in the pad. Its reactions happen by themselves.', chips.length ? null : 'No shield techniques.', { pad: true, preview: 'none', hand }));
      for (const e of chips) out.push(chip(hand, e, TPAD + hand));
      sys[hand] = 'melee'; continue;
    }
    const wid = hand === 'off' ? u.offWeapon : u.weapon; const w: any = WEAPON[wid as string]; if (!w) continue;
    sys[hand] = weaponSystem(wid as string);
    const all = pad.flatMap((gr: any) => gr.entries), plain = all.find((e: any) => e.plain);
    if (plain) out.push({ ...chip(hand, plain, undefined), hidden: false });
    const chips = pad.filter((gr: any) => gr.group !== 'watch' && gr.group !== 'answer').flatMap((gr: any) => gr.entries.filter((e: any) => !e.plain).map((e: any) => [e, undefined] as [any, any]));
    if (hand === 'main') for (const pk of safe(() => packPad(cb, u, g), [] as any[])) for (const e of pk.entries) chips.push([e, pk.item]);
    const usable = chips.filter(([e]) => e.ok).length;
    out.push(D(TPAD + hand, 'attack', 'Techniques · ' + usable, 0, chips.length ? usable + ' of ' + chips.length + ' now' : '', 'What you can do with the ' + ((hand === 'main' ? (u as any).weaponName : null) || w.name) + '. Pick one in the pad, then its target.', chips.length ? null : 'No techniques ready for this weapon.', { pad: true, preview: 'none', hand }));
    for (const [e, item] of chips) out.push(chip(hand, e, TPAD + hand, item));
    for (const e of pad.find((gr: any) => gr.group === 'watch')?.entries || []) if (!seenW.has(e.id)) { seenW.add(e.id); watch.push(chip(hand, e, TWATCH)); }
  }
  // two weapons of one kind: the both-hands block (the paired attack, then the techniques made with each in turn)
  if (hands.length === 2 && !shield && sys.main && sys.main === sys.off) {
    const pe: any[] = safe(() => pairedPad(cb, u, g), []);
    out.push(D('paired', 'attack', sys.main === 'melee' ? 'Strike with both' : 'Fire both', 0, 'AP +1', 'Make one attack with each weapon at the same target. It costs the higher of the two AP costs, plus 1. The main hand is at −1 to hit and the off hand at −3, improved by 1 for every 3 points of Dexterity, up to −1.', null, { picks: basicPicks(x, 'paired'), preview: 'attack', hand: 'both' }));
    if (pe.length) {
      const usable = pe.filter((e) => e.ok).length;
      out.push(D(TPAD + 'both', 'attack', 'Techniques · ' + usable, 0, usable + ' of ' + pe.length + ' now', 'Use one technique with each weapon in turn, the main hand at −1 to hit and the off hand at −3, for 1 AP more. Pick one in the pad, then its target.', null, { pad: true, preview: 'none', hand: 'both' }));
      for (const e of pe) out.push(chip('both', e, TPAD + 'both'));
    }
  }
  if (watch.length) {
    const aps = watch.map((d) => d.cost.ap), lo = Math.min(...aps), hi = Math.max(...aps);
    out.push(D(TWATCH, 'attack', 'Hold a shot', lo, lo === hi ? lo + ' AP' : lo + '–' + hi + ' AP', 'Hold a shot until its trigger happens: Overwatch, Deny, Cover Me or Dead to Rights. It fires on the enemy\'s turn, as your reaction.', watch.some((d) => d.available) ? null : watch[0].why, { pad: true, preview: 'none' }), ...watch);
  }
  void heatLimit; void physView;
  return out;
}
const PRESS_STATE: Record<string, string> = { pressed: 'Pressed', suppressed: 'Suppressed', broken: 'Broken', under_fire: 'Under fire', '': '' };
/** A technique's preview: the verdict from the whole fight, the units it names and marks from what the side sees. */
function techPreviewOf(x: DescCtx, t: { hand: string; id: string; item?: string | number }, p: Picks) {
  const args: any = { hand: t.hand, ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.tile ? { tile: p.tile } : {}), ...(p.allyId ? { allyId: p.allyId } : {}), ...(p.line ? { line: p.line } : {}), ...(t.item != null ? { item: t.item } : {}) };
  const o = techOpt(t.id, p.opt); if (o) args.opt = o;
  const run = (c: Combat) => safe(() => previewTechnique(c, x.u, t.id, args, x.g), { ok: false, why: 'Not now.', ap: 0, attacks: [], notes: [] } as any);
  const whole = run(x.cb), pv: any = safe(() => previewSeenBy(x.cb, x.side, run, ['attacks', 'pressure', 'saves', 'moves', 'notes', 'area'] as any, whole), whole);
  const name = (id: string) => x.seen.units.find((v) => v.id === id)?.name || id;
  const lines: PreviewLine[] = [];
  for (const a of pv.attacks || []) { const q: any = a.pv; if (q) lines.push({ k: 'odds', text: name(a.target) + ': ' + (q.ok ? 'hit ' + q.pct + '% · need ' + q.need + (q.dmg && q.dmg.total != null ? ' · ' + q.dmg.total + ' damage' : '') : q.why || 'can\'t attack') }); }
  for (const n of pv.notes || []) lines.push({ k: 'note', text: n });
  if (pv.momentum) lines.push({ k: 'meter', text: 'Momentum ' + pv.momentum.now + ' → ' + pv.momentum.after + (pv.ends ? ' · ends your chain' : '') });
  if (pv.guard) lines.push({ k: 'meter', text: 'Guard ' + pv.guard.now + ' → ' + pv.guard.after });
  for (const q of pv.pressure || []) lines.push({ k: 'meter', text: name(q.unit) + ': Pressure ' + (q.add >= 0 ? '+' : '') + q.add + ' → ' + q.after + (q.state ? ' (' + (PRESS_STATE[q.state] ?? q.state) + ')' : '') + (q.onHit ? ' on a hit' : '') });
  for (const s of pv.saves || []) lines.push({ k: 'save', text: name(s.unit) + ' saves with ' + (s.skills || []).map((k: string) => k.replace(/_/g, ' ')).join(' or ') + ' vs TN ' + s.tn });
  const pct = (id: string) => { const a = (pv.attacks || []).find((y: any) => y.target === id); return a && a.pv && a.pv.ok ? a.pv.pct + '%' : ''; };
  const units = [...new Set([...(pv.attacks || []).map((a: any) => a.target), ...(pv.pressure || []).map((q: any) => q.unit)])].map((id) => ({ id: id as string, tag: pct(id as string), tone: 'harm' as const }));
  const tiles: GridMarks['tiles'] = [...(pv.area || []), ...(pv.moves || []).map((m: any) => m.to)].map((k: string) => ({ tile: k, kind: 'area' as const }));
  for (const [k, band] of techReach(x, t)) tiles.push({ tile: k, kind: 'reach', band });
  return { lines, ap: whole.ap || undefined, ok: !!whole.ok, why: whole.ok ? null : whole.why || 'Not now.', rolls: (pv.attacks || []).filter((a: any) => a.pv).map((a: any) => ({ unit: a.target, pv: a.pv })), marks: { units, tiles } };
}
/** Where a technique aimed at an enemy can strike from here (the red area): its weapon's reach, a shield's Bash next to
 * you, and a melee technique that moves first further (Lunge's step, Charge's run on the AP left after the strike). */
function techReach(x: DescCtx, t: { hand: string; id: string }): Map<string, number> {
  const aim = aimOf(t.id); if (!(aim === 'enemy' || aim.startsWith('enemy'))) return new Map();
  const u = x.u, w: any = WEAPON[u.weapon], shield = t.hand === 'off' && !u.offWeapon && !!safe(() => shieldOf(u), null);
  const wid = t.hand === 'off' ? u.offWeapon : u.weapon, melee = shield || (wid ? weaponSystem(wid) === 'melee' : true);
  const mode: any = melee ? 'melee' : t.id === 'aimed' ? 'aimed' : 'shot';
  const props: string[] = ((((mode === 'melee' && !(w && isMelee(w))) || shield ? WEAPON.fists : w) as any)?.phys?.props) || [];
  const ap0 = safe(() => techniquePad(x.cb, u, (t.hand === 'off' ? 'off' : 'main'), x.g).flatMap((gr: any) => gr.entries).find((e: any) => e.id === t.id)?.ap, 2) ?? 2;
  const step = !melee ? 0 : t.id === 'lunge' ? (props.includes('reach') ? 2 : 1) : t.id === 'charge' ? Math.floor(Math.max(0, apFor(x.cb, u) - ap0) * (u.movement || 1) + (u.bank || 0)) : 0;
  return safe(() => reachTiles(x.cb, u, mode, { step, fists: shield }), new Map());
}

const PERKS: ActionSystem = {
  id: 'perks',
  owns: (id) => id.startsWith(PK),
  list(x) {
    return perkEntriesOf(x).map((e) => {
      const st = perkState(e), picks: PickStep[] = [];
      // a door verb's reach (Classes 3.0 P6): the engine's own list of who it may go at
      if (e.target === 'ally') picks.push({ key: 'targetId', kind: 'ally', prompt: 'Click an ally.', choices: e.choices ? seenOf(x, e.choices) : allyIds(x, true) });
      else if (['unit', 'enemy', 'npc'].includes(e.target as string)) picks.push({ key: 'targetId', kind: e.target === 'enemy' ? 'enemy' : 'unit', prompt: 'Click a target.', choices: e.choices ? seenOf(x, e.choices) : others(x) });
      else if (e.target === 'tile') picks.push({ key: 'tile', kind: 'tile', prompt: 'Click a tile.' });
      if ((e.options && e.options.length) || e.pickLabel || e.target === 'text') picks.push({ key: 'form', kind: 'custom', renderer: 'perk-form', prompt: e.pickLabel || 'Choose.', ...(e.options ? { options: e.options.map((o) => ({ id: o.id, label: o.label })) } : {}), ...(e.pickMulti ? { max: e.pickMulti } : {}) });
      // an armed move (Eye of the Storm) can be confirmed again to stand it down: its state is said, the reducer rules
      return D(perkId(e), e.tab, e.label + st.tag, priceOf(e), perkCost(e), perkText(e), st.why, { picks, preview: 'perk', engine: e.engine, ...(e.arm ? { available: true } : {}) });
    });
  },
  send(x, d, p) {
    const k = parsePerkId(d.id); if (!k) return null;
    const e = perkEntriesOf(x).find((y) => y.id === k.id && y.actionId === k.actionId);
    return { type: 'combat/perk', unitId: x.u.id, id: k.id, actionId: k.actionId, ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.tile && e?.target === 'tile' ? { tile: p.tile } : {}), ...(p.form && typeof p.form === 'object' ? p.form : {}), ...(e?.arm ? { arm: true } : {}) } as any;
  },
  preview(x, d, p) {
    const k = parsePerkId(d.id)!, args: any = { actionId: k.actionId, ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.tile ? { tile: p.tile } : {}), ...(p.form && typeof p.form === 'object' ? p.form : {}) };
    const pv: any = safe(() => withGame(x.g, () => previewPerkAction({ u: x.u, c: x.c, cb: x.cb, g: x.g }, k.id, args, 'combat')), null);
    if (!pv) return null;
    const seen = new Set(x.seen.units.map((v) => v.id));
    return { ok: pv.ok, why: pv.ok ? null : pv.why || 'Not now.', ap: pv.ap, lines: (pv.lines || []).map((t: string) => ({ k: 'note' as const, text: t })),
      marks: { units: (pv.targets || []).filter((id: string) => seen.has(id)).map((id: string) => ({ id, tag: '', tone: 'target' as const })), tiles: [...(pv.area || []), ...(pv.tiles || [])].map((k2: string) => ({ tile: k2, kind: 'area' as const })) } };
  },
};

const CALLS: ActionSystem = {
  id: 'calls',
  owns: (id) => id.startsWith('cl:'),
  list(x) {
    if (x.u.side !== 'pc' || x.u.companion) return [];
    return safe(() => callPad(x.cb, x.u, x.g), [] as any[]).map((e: any) => {
      const why = e.ok ? null : (e.why || 'Not now.').replace(/\.+$/, '') + '.';
      const save = e.save ? SAVE_NAME[e.save.family] + ' save, TN ' + e.save.tn : '', reach = e.range + (e.range === 1 ? ' tile' : ' tiles');
      const picks: PickStep[] = [];
      if (e.id === 'call.order') picks.push({ key: 'opt', kind: 'option', prompt: 'Pick what to order below.', max: orderMax(e.step), options: ORDER_THINGS.map(([id, label, text, at]) => ({ id, label, text, why: e.step < at ? 'From 3 points of ' + e.skillName + '.' : null })) });
      const aimW = e.aim === 'enemy' ? 'an enemy' : 'an ally';
      picks.push({ key: 'targetId', kind: e.aim === 'enemy' ? 'enemy' : 'ally', prompt: 'Click ' + aimW + ' within ' + reach + '.', optional: e.aim === 'self-or-ally',
        choices: e.aim === 'enemy' ? foeIds(x) : allyIds(x, e.aim === 'self-or-ally') });
      if (e.id === 'call.order') picks.push({ key: 'tile', kind: 'tile', prompt: 'Now click the tile they move to.', when: { key: 'opt', has: 'move' } });
      else if (e.id === 'call.warn' || (e.id === 'call.cue' && e.step >= 2)) picks.push({ key: 'tile', kind: 'tile', prompt: e.id === 'call.cue' ? 'You may also click a free tile next to them: they step there.' : 'You may also click the tile they step to.', optional: true });
      const apText = e.free ? 'free' : priceOf(e) + ' AP';
      return D('cl:' + e.id, 'calls', e.name, priceOf(e), apText + ' · ' + reach, e.text + (save ? ' ' + save + '.' : ''), why, { picks, preview: 'call' });
    });
  },
  send(x, d, p) {
    const id = d.id.slice(3), tgt = p.targetId || (d.picks.find((s) => s.key === 'targetId')?.optional ? x.u.id : null);
    if (!tgt) return null;
    const opt = Array.isArray(p.opt) ? p.opt.join('+') : p.opt || '';
    return { type: 'combat/call', unitId: x.u.id, id, targetId: tgt, ...(p.tile ? { tile: p.tile } : {}), ...(opt ? { opt } : {}) } as any;
  },
  preview(x, d, p) {
    const id = d.id.slice(3), opt = Array.isArray(p.opt) ? p.opt.join('+') : p.opt || '', tgt = p.targetId || x.u.id;
    const pv: any = safe(() => previewCall(x.cb, x.u, id, { targetId: tgt, ...(p.tile ? { tile: p.tile } : {}), ...(opt ? { opt } : {}) }, x.g), null);
    if (!pv) return null;
    const name = (uid: string) => x.cb.units.find((v) => v.id === uid)?.name || uid;
    const lines: PreviewLine[] = (pv.notes || []).map((t: string) => ({ k: 'note' as const, text: t }));
    if (pv.save) lines.push({ k: 'save', text: name(pv.save.unit) + ' rolls a ' + SAVE_NAME[pv.save.family] + ' save against TN ' + pv.save.tn });
    if (pv.gives) lines.push({ k: 'meter', text: name(pv.gives.unit) + ' gets ' + pv.gives.ap + ' AP ' + pv.gives.when });
    const e: any = safe(() => callPad(x.cb, x.u, x.g).find((c: any) => c.id === id), null);
    const may = d.picks.find((st) => st.key === 'tile' && st.optional);
    if (may && !p.tile) lines.push({ k: 'cost', text: may.prompt });
    if (e) lines.push({ k: 'cost', text: e.skillName + ' · step ' + e.step + ' of 3' });
    // the tiles it reaches from the speaker (its own tile too: a Call to yourself)
    const reach: GridMarks['tiles'] = [];
    if (e) for (let y = 0; y < x.cb.map.h; y++) for (let xx = 0; xx < x.cb.map.w; xx++) { const k = xx + ',' + y; if (dist(x.u.pos, k) <= e.range) reach.push({ tile: k, kind: 'reach' }); }
    return { ok: pv.ok, why: pv.ok ? null : pv.why || 'Not now.', ap: pv.ap || undefined, lines, marks: { units: [{ id: tgt, tag: '', tone: 'target' }], tiles: reach } };
  },
};

const FAITH: ActionSystem = {
  id: 'faith',
  owns: (id) => id.startsWith(PR),
  list(x) {
    const { g, u, c } = x;
    if (!c || u.side !== 'pc' || u.companion) return [];
    if (beliefOf(c).kind !== 'faithful' && (c.skills?.faith || 0) < FAITH_MIN) return [];
    const v: any = safe(() => faithView(g, c.id), null); if (!v) return [];
    // a place is aimed at a tile this side sees (the view's own sight when it is a player's view, else worked out)
    const seenTiles = () => safe(() => [...(((x.cb as any).fog && (x.cb as any).fog.tiles) || visibility(x.cb, x.side).tiles)] as string[], undefined as any);
    const row = (kind: string, id: string, name: string, text: string, p: any, tier: number) => {
      const gate = kind === 'whisper' ? (p.mode === 'dice' ? 'BY DICE · TN ' + (p.roll?.tn ?? 12) : 'ANYONE') : kind === 'miracle' ? 'FAITH ' + MIRACLE_FAITH + ' · DEVOTION ' + (p.gate ?? GATE.miracle)
        : p.mode === 'dice' ? 'BY DICE · TN ' + (p.roll?.tn ?? '?') : 'HYMN ' + ['', 'I', 'II', 'III', 'IV'][tier] + ' · DEVOTION ' + (p.gate ?? '?');
      const odds = prayOdds(p), warn = p.mode === 'overreach' && p.overreach ? 'Overreach: TN ' + p.overreach.tn + ' · a miss costs ' + DEVOTION_XP.overreachMiss + ' Devotion XP'
        : kind === 'miracle' ? 'Lowers your Devotion by ' + MIRACLE_COST_LEVELS + ' levels (' + GATE.miracle + ' → ' + (GATE.miracle - MIRACLE_COST_LEVELS) + '), after it lands' : '';
      const label = (kind === 'miracle' ? '✦ ' : '') + name + (kind === 'whisper' ? '' : ' · ' + (kind === 'miracle' ? 'MIRACLE' : gate.replace(/ · DEVOTION \d+$/, '')));
      return D(prayId(kind, id), 'faith', label, p.ap, p.ap + ' AP · ' + odds, gate + ' · ' + odds + '. ' + text + (warn ? ' ' + warn + '.' : ''), p.ok ? null : p.why || 'Not now.', { picks: prayPicks(p.target || 'none', p.targets || [], p.target === 'tile' ? seenTiles() : undefined), preview: 'prayer' });
    };
    return [...v.whispers.map((w: any) => row('whisper', w.id, w.name, w.text, w.preview, 0)), ...v.hymns.map((h: any) => row('hymn', h.key, h.name, h.text, h.preview, h.tier)), ...(v.miracle ? [row('miracle', v.miracle.id, v.miracle.name, v.miracle.text, v.miracle.preview, 4)] : [])];
  },
  send(x, d, p) {
    const s = parsePrayId(d.id)!;
    return { type: 'faith/pray', unitId: x.u.id, kind: s.kind, id: s.id, ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.targetId2 ? { targetId2: p.targetId2 } : {}), ...(p.tile ? { tile: p.tile } : {}) } as any;
  },
  preview(x, d, p) {
    const s = parsePrayId(d.id)!, args = { ...(p.targetId ? { targetId: p.targetId } : {}), ...(p.targetId2 ? { targetId2: p.targetId2 } : {}), ...(p.tile ? { tile: p.tile } : {}) };
    const pv: any = safe(() => previewPrayer(x.g, x.u.id, s.kind, s.id, args), null); if (!pv) return null;
    const lines: PreviewLine[] = [{ k: 'cost', text: prayOdds(pv) }]; // (the odds are in its name too: SURE, TN 12 · 55%)
    if (pv.effectText) lines.push({ k: 'note', text: pv.effectText });
    if (pv.mode === 'overreach' && pv.overreach) lines.push({ k: 'save', text: 'Overreach: you ask above your standing. TN ' + pv.overreach.tn + '; a miss costs ' + DEVOTION_XP.overreachMiss + ' Devotion XP.' });
    else if (pv.mode === 'dice' && pv.roll) lines.push({ k: 'save', text: 'By dice: d20 ' + (pv.roll.mod >= 0 ? '+ ' : '− ') + Math.abs(pv.roll.mod) + ' against TN ' + pv.roll.tn + '.' });
    else lines.push({ k: 'save', text: s.kind === 'miracle' ? 'By standing: no roll. After it lands, your Devotion falls ' + MIRACLE_COST_LEVELS + ' levels.' : 'By standing: no roll.' });
    return { ok: pv.ok, why: pv.ok ? null : pv.why || 'Not now.', ap: pv.ap, lines, marks: { units: [p.targetId, p.targetId2].filter(Boolean).map((id: string) => ({ id, tag: '', tone: 'target' as const })), tiles: p.tile ? [{ tile: p.tile, kind: 'pick' }] : [] } };
  },
};

const MAGIC_SEND: Record<string, (x: DescCtx, p: Picks) => any> = {
  draw: (x, p) => p.word && { type: 'combat/draw', unitId: x.u.id, word: p.word, tile: p.tile || x.u.pos, ...(p.stroke ? { stroke: p.stroke } : {}) },
  evoke: (x, p) => p.evoke && p.evoke.tile && { type: 'combat/evoke', unitId: x.u.id, ...p.evoke },
  scuff: (x) => ({ type: 'combat/scuff', unitId: x.u.id }), vent: (x) => ({ type: 'combat/vent', unitId: x.u.id }), core: (x) => ({ type: 'combat/core', unitId: x.u.id }),
  syphon: (x) => ({ type: 'combat/syphon', unitId: x.u.id }), crystallise: (x) => ({ type: 'combat/crystallise', unitId: x.u.id }),
  outburst: (x, p) => { const d = p.design || x.u.mg?.designs?.[0]?.id; if (!d) return null; return p.mode === 'snap' ? { type: 'combat/outburst', unitId: x.u.id, design: d, aim: p.aim || x.u.pos, hold: false, ...mx(p) } : { type: 'combat/outburst', unitId: x.u.id, design: d, hold: true, ...mx(p) }; },
  release: (x, p) => ({ type: 'combat/release', unitId: x.u.id, ...(p.aim ? { aim: p.aim } : {}), ...mx(p) }),
  pump: (x, p) => ({ type: 'combat/pump', unitId: x.u.id, ...(p.feeling ? { feeling: p.feeling } : {}), ...mx(p) }),
  steady: (x) => ({ type: 'combat/steady', unitId: x.u.id }), letgo: (x) => ({ type: 'combat/letgo', unitId: x.u.id }), feed: (x) => ({ type: 'combat/feed', unitId: x.u.id }),
  revert: (x) => ({ type: 'combat/revert', unitId: x.u.id }),
  heartwatch: (x) => ({ type: 'combat/heartwatch', unitId: x.u.id, on: !(x.u.mg?.held && x.u.mg.held.watch) }),
};
const BAND_NAME: Record<string, string> = { thin: 'Thin', normal: 'Normal', rich: 'Rich', flooded: 'Flooded' };
const MAGIC: ActionSystem = {
  id: 'magic',
  owns: (id) => id in MAGIC_SEND,
  list(x) {
    const { cb, u, c } = x, mg: any = u.mg; if (!mg) return [];
    const words: string[] = mg.words || [], designs: any[] = mg.designs || [];
    if (!(words.length || designs.length || mg.evoker || mg.emanator)) return [];
    const out: ActionDescriptor[] = [], evoWhy = mg.evoker ? null : NEEDS_EVOKER, emaWhy = mg.emanator ? null : NEEDS_EMANATOR;
    const apNote = (a: 'vent' | 'core', n: number) => { const base = SPELL_AP[a]; return n < base ? (a === 'vent' ? ' Bleed the Flux' : 'Core Change') + ' lowers the cost from ' + base + ' to ' + n + ' AP. ' : ''; };
    if (words.length || mg.evoker) {
      const gAp = glyphApOf(u), vAp = safe(() => ventAp(u, cb), SPELL_AP.vent), cAp = safe(() => coreAp(u, cb), SPELL_AP.core);
      const wordOpts = words.map((w) => { const p: any = safe(() => withGame(x.g, () => previewDraw(cb, u, w, u.pos)), { ok: false, why: 'Not now.' } as any); return { id: w, label: w.toUpperCase(), why: p.ok ? null : p.why || 'Not now.' }; });
      out.push(D('draw', 'sigils', 'Draw a glyph', gAp, apT(gAp), 'Pick a word on the glyph keyboard, then click your own tile. A tile holds one glyph. Step and draw again to walk a Line of 2 to 4 glyphs in a straight row. Each glyph costs its word\'s charge from your Evoker and adds its Flux.', evoWhy,
        { picks: [{ key: 'word', kind: 'option', renderer: 'glyph-keyboard', prompt: 'Pick a word.', options: wordOpts }, { key: 'stroke', kind: 'custom', renderer: 'stroke', prompt: 'Which stroke it goes into.', optional: true }, { key: 'tile', kind: 'tile', prompt: 'Click your own tile to draw.', choices: [u.pos], auto: true }], preview: 'sigil' }));
      out.push(D('evoke', 'sigils', 'Evoke', SPELL_AP.evoke, apT(SPELL_AP.evoke), 'Fire a Line of glyphs. It needs a Subject and at least one other word. Where you stand aims it: from an end, it fires along the Line; from the side, across it. Charge ' + mg.charge + '/' + CORE_CHARGE + '.', evoWhy,
        { picks: [{ key: 'evoke', kind: 'custom', renderer: 'evoke', prompt: 'Click a glyph of a Line to Evoke it.', choices: (x.seen.glyphs || []).map((gl: any) => gl.pos) }], preview: 'sigil', toggleOn: 'combat/evoke' }));
      out.push(D('scuff', 'sigils', 'Scuff', SPELL_AP.scuff, apT(SPELL_AP.scuff), 'Wipe out the glyphs on the tile you stand on.', null, { preview: 'sigil' }));
      out.push(D('vent', 'sigils', 'Vent Flux · ' + mg.flux + '/' + FLUX_MAX, vAp, apT(vAp), 'Pour all your Flux into the air. The mana meter rises by the same amount. If your Flux goes past ' + FLUX_MAX + ', the Evoker overloads.' + apNote('vent', vAp), evoWhy, { preview: 'sigil' }));
      out.push(D('core', 'sigils', 'Swap core', cAp, apT(cAp), apNote('core', cAp) + 'Load a fresh mana core with ' + CORE_CHARGE + ' charge. ' + mg.cores + (mg.cores === 1 ? ' spare core' : ' spare cores') + ' carried.', evoWhy, { preview: 'sigil' }));
    }
    if (designs.length || mg.emanator) {
      const held = mg.held;
      if (designs.length && !held) {
        const again = safe(() => togglesFor({ u, cb } as any, 'combat/outburst', {}, cb.mods || []).some((t) => t.id === 'perk:heart_overload#again' && !t.why), false);
        const freeD = again ? designs.find((d) => safe(() => previewOutburst(cb, u, d.id, undefined, false).ap === 0, false)) : null;
        const ap0 = designAp(mg, designs[0]);
        out.push(D('outburst', 'outbursts', 'Outburst', freeD ? 0 : ap0, freeD ? 'Heart Overload: ' + freeD.name + ' again, 0 AP' : designs.length === 1 ? 'Begin ' + ap0 + ' AP' : designs.length + ' designs',
          'Begin a design and hold it at stage 0 (2 AP, or 1 AP with the Swift module). Pump it up a stage at a time, to stage 4 (1 AP each), then Release it (1 AP). Or Snap it: Begin and Release in one go for 3 AP, at ×' + stageMult(0) + '.' + (mg.emanator ? '' : ' With no Emanator in hand it draws on the air: no MP cost, but +2 Strain.'), null,
          { picks: [{ key: 'design', kind: 'option', renderer: 'design-cards', prompt: 'Pick a design.', optional: true, options: designs.map((d) => ({ id: d.id, label: d.name })) }, { key: 'mode', kind: 'option', prompt: 'Begin (hold it) or Snap (Begin and Release now).', optional: true, options: [{ id: 'begin', label: 'Begin' }, { id: 'snap', label: 'Snap' }] }, { key: 'aim', kind: 'tile', prompt: 'Snap: hover to preview, click a tile to aim.', when: { key: 'mode', is: 'snap' }, optional: true }], toggleOn: 'combat/outburst', preview: 'outburst' }));
      }
      if (held) {
        const pp: any = safe(() => previewPump(cb, u), { ok: false, why: 'Not now.', ap: SPELL_AP.pump } as any);
        const plan: any = safe(() => previewOutburstPlan(cb, u, 'held', undefined), { ok: false, why: 'Not now.', ap: SPELL_AP.release, mult: STAGE_MULT[held.stage] } as any);
        const dry = (fn: (c: Combat, v: Unit) => string | null) => safe(() => dryRun(x.g, cb, u.id, (c, v) => fn(c, v)), { err: 'Not now.', u: null } as any);
        const st = dry(steadyHeart), lg = dry(letGo), fd = dry(feedOutburst), wt = dry((c, v) => setHeartWatch(c, v, !held.watch));
        const off = lg.err ? 0 : Math.max(0, mg.strain - (lg.u?.mg?.strain ?? mg.strain));
        const relWhy = plan.ok || /Pick a|direction/.test(plan.why || '') ? null : plan.why || 'Not now.';
        const pumpCost = pp.ok ? (pp.mp ? (pp.free ? '0 AP' : pp.ap + ' AP') + ' · ' + pp.mp + ' MP' : pp.free ? 'FREE' : pp.ap + ' AP') : (pp.ap ? pp.ap + ' AP' : '—');
        out.push(D('pump', 'outbursts', 'Pump · stage ' + held.stage + (pp.ok ? ' → ' + (held.stage + 1) : ''), pp.free ? 0 : pp.ap || 0, pumpCost, 'Raise the held Outburst by 1 stage. Stages run from ×' + stageMult(0) + ' at stage 0 to ×' + stageMult(4) + ' at stage 4: a plain Pump adds +' + Math.round((stageMult(1) - stageMult(0)) * 10) / 10 + ', and a feeling adds its own step instead. One Pump a turn can cost 0 AP: your first of the fight, or one each round from Empathy 3.', pp.ok ? null : pp.why || 'Not now.',
          { picks: [{ key: 'feeling', kind: 'custom', renderer: 'heart', prompt: 'A plain Pump, or pour a feeling in.', optional: true }], toggleOn: 'combat/pump', preview: 'outburst' }));
        out.push(D('release', 'outbursts', 'Release · stage ' + held.stage + ' ×' + (plan.mult || STAGE_MULT[held.stage]), plan.ap || SPELL_AP.release, (plan.ap || SPELL_AP.release) + ' AP', 'Fire ' + ((designs.find((d) => d.id === held.design) || {}).name || 'the held Outburst') + ' at the stage reached.', relWhy,
          { picks: [{ key: 'aim', kind: 'tile', prompt: 'Hover to preview, click a tile to aim.', optional: true }], toggleOn: 'combat/release', preview: 'outburst' }));
        out.push(D('steady', 'outbursts', 'Steady the heart', SPELL_AP.steady, apT(SPELL_AP.steady), 'Lose 1 Strain, and the Outburst doesn\'t swell at the start of your next turn.', st.err || null, { preview: 'outburst' }));
        out.push(D('letgo', 'outbursts', 'Let it go' + (off ? ' · −' + off + ' Strain' : ''), 0, 'free', 'Drop the Outburst without releasing it. The power you built is lost, and you lose ' + off + ' Strain.', lg.err || null, { preview: 'outburst' }));
        if ((cb.glyphs || []).some((gl: any) => gl.pos === u.pos && !gl.keystone)) out.push(D('feed', 'outbursts', 'Feed the glyph', SPELL_AP.feed, apT(SPELL_AP.feed), 'Absorb the glyph on your tile: +1 stage, and the glyph is gone.', fd.err || null, { preview: 'outburst' }));
        out.push(D('heartwatch', 'outbursts', held.watch ? 'Heart Overwatch · armed' : 'Heart Overwatch', 0, 'free', held.watch ? 'On: you Release at the first enemy that comes into your reach, as your reaction. Click to turn it off.' : 'Hold the Outburst and Release it as your reaction when an enemy comes into your reach.', wt.err || null, { preview: 'outburst' }));
        out.push(D('revert', 'outbursts', 'Revert Pump', 0, 'free', 'Take back your last Pump this turn: its stage, its feeling, and the AP, MP and Strain it cost.', null, { preview: 'outburst', hidden: true }));
      }
      if (mg.emanator || (c && focusHand(c, 'emanator'))) {
        const band: any = manaBand(cb.mana ?? MANA_START);
        out.push(D('syphon', 'outbursts', 'Syphon', SPELL_AP.syphon, apT(SPELL_AP.syphon), 'Draw MP from the air: ' + band.syphon_mp + ' MP in ' + BAND_NAME[band.id] + ' air, times your Syphon bonus. The mana meter drops.', emaWhy, { preview: 'outburst' }));
        out.push(D('crystallise', 'outbursts', 'Crystallise', SPELL_AP.crystallise, apT(SPELL_AP.crystallise), 'Squeeze the air into one standard mana core. Needs ambient mana of 10 or more (Normal air or richer). The mana meter drops by 10.', emaWhy, { preview: 'outburst' }));
      }
    }
    void MAX_STAGE;
    return out;
  },
  send(x, d, p) { const f = MAGIC_SEND[d.id]; return f ? f(x, p) || null : null; },
};

// ---------- owned units with no turn of their own (Classes 3.0 P9; the lead's ruling at step 1b's integration) ----------
// Each verb of each of the owner's turn-less owned units is a row of the OWNER's Utility tab: 'ow:<owned id>:<verb>'.
// The reducer runs it with the owned unit as the actor and the owner paying (owned.ts runOwned); the preview is the
// reducer's dry run of that action, as for any basic row.
const OWNED_ID = 'ow:';
const VERB_NAME: Record<string, string> = { move: 'Move', shot: 'Shot', aimed: 'Aimed shot', melee: 'Strike' };
const OWNED: ActionSystem = {
  id: 'owned',
  owns: (id) => id.startsWith(OWNED_ID),
  list(x) {
    const out: ActionDescriptor[] = [];
    for (const o of orderable(x.cb, x.u)) for (const v of ownedVerbs(o)) {
      const w: any = WEAPON[o.weapon], ap = v === 'move' ? 1 : w ? attackApCost(w, v) : 2, why = ownedWhy(x.cb, x.u, o, v);
      out.push(D(OWNED_ID + o.id + ':' + v, 'utility', o.name + ': ' + VERB_NAME[v], ap, v === 'move' ? 'AP a step (yours)' : apT(ap) + ' (yours)',
        v === 'move' ? o.name + ' moves to a tile you pick. It has no turn of its own: the AP are yours.' : o.name + ' attacks an enemy you pick (' + VERB_NAME[v].toLowerCase() + '). It has no turn of its own: the AP are yours.',
        why, { picks: v === 'move' ? [{ key: 'tile', kind: 'tile', prompt: 'Click the tile ' + o.name + ' goes to.' }] : [{ key: 'targetId', kind: 'enemy', prompt: 'Click the enemy ' + o.name + ' attacks.', choices: foeIds(x) }] }));
    }
    return out;
  },
  send(x, d, p) {
    const [, owned, verb] = d.id.split(':');
    if (verb === 'move') return p.tile ? ({ type: 'combat/owned', unitId: x.u.id, owned, verb, tile: p.tile } as Action) : null;
    return p.targetId ? ({ type: 'combat/owned', unitId: x.u.id, owned, verb, targetId: p.targetId } as Action) : null;
  },
};

const BUILT_IN: ActionSystem[] = [PHYSICAL, PERKS, MAGIC, FAITH, CALLS, OWNED];
const systems = () => [...BUILT_IN, ...SYSTEMS];
const SYS_OF = new WeakMap<ActionDescriptor, ActionSystem>();

// ---------- the three functions ----------
/** Every action this unit could take now, in list order: grouped by tab (GROUP_ORDER), each system's rows in its own
 * order within a group. A unit with a fixed action list (the drone) gets only those. viewer: the player asking (its
 * side's fog rules the choices; the reducer's `by`). */
export function actionsFor(g: GameState, unitId: string, viewer?: string | null): ActionDescriptor[] {
  const x = ctxOf(g, unitId, viewer); if (!x) return [];
  const all: ActionDescriptor[] = [];
  for (const s of systems()) for (const d of safe(() => s.list(x), [] as ActionDescriptor[])) { SYS_OF.set(d, s); all.push(d); }
  const allowed: string[] | undefined = (x.u as any).allowedActions;
  const kept = allowed ? all.filter((d) => allowed.includes(d.id)) : all;
  if (x.u.downed) for (const d of kept) { d.available = false; d.why = 'Downed.'; }
  return GROUP_ORDER.flatMap((gr) => kept.filter((d) => d.group === gr)).concat(kept.filter((d) => !GROUP_ORDER.includes(d.group)));
}
/** Retired ids that still resolve (a saved turn-card pick, an old hotkey): 'clear-off' was the off-hand gun's own Clear
 * jam; with two guns there is one Clear jam now (Hands 5d, 13 Nov 2026), so the old pick is that one action. */
const DESC_ALIAS: Record<string, string> = { 'clear-off': 'clear' };
function find(x: DescCtx, id: string): { d: ActionDescriptor; s: ActionSystem } | null {
  for (const s of systems()) { if (s.owns && !s.owns(id)) continue; const d = safe(() => s.list(x), [] as ActionDescriptor[]).find((y) => y.id === id); if (d) return { d, s }; }
  return DESC_ALIAS[id] ? find(x, DESC_ALIAS[id]) : null;
}
/** Does this step apply with these picks? */
export const stepOn = (st: PickStep, p: Picks) => {
  const w = st.when; if (!w) return true;
  const v = p[w.key], list = Array.isArray(v) ? v : typeof v === 'string' ? v.split('+') : [];
  if (w.is != null && v !== w.is) return false;
  if (w.has != null && !list.includes(w.has)) return false;
  if (w.not != null && v === w.not) return false;
  return true;
};
/** The first step still to pick (optional steps included: a screen may skip them), or null. */
export function nextStep(d: ActionDescriptor, p: Picks, o: { required?: boolean } = {}): PickStep | null {
  return d.picks.find((st) => stepOn(st, p) && (p[st.key] == null || (Array.isArray(p[st.key]) && !p[st.key].length)) && (!o.required || !st.optional)) || null;
}
/** The switches items put on this action (Ricochet, Heart Surge…) with the player's choices (picks.mods: ids, and
 * '!id' for one that is on by default and turned off), and the picks with the mods the action carries. */
function withMods(x: DescCtx, d: ActionDescriptor, picks: Picks): { toggles: ToggleEntry[]; picks: Picks } {
  if (!d.toggleOn) { const { mods: _m, ...rest } = picks; void _m; return { toggles: [], picks: rest }; }
  const tg = safe(() => withGame(x.g, () => togglesFor({ u: x.u, c: x.c, cb: x.cb, g: x.g }, d.toggleOn!, { action: d.id, target: picks.targetId ? x.cb.units.find((v) => v.id === picks.targetId) : null }, picks.mods || [])), [] as ToggleEntry[]);
  const mods = tg.filter((t) => t.on && !t.why).map((t) => t.id).concat(tg.filter((t) => t.defaultOn && !t.on).map((t) => '!' + t.id));
  return { toggles: tg, picks: { ...picks, mods } };
}
/** The reducer action Confirm sends for these picks (null: a required pick is missing, or no such action). */
export function sendDescriptor(g: GameState, unitId: string, id: string, picks: Picks = {}, viewer?: string | null): Action | null {
  const x = ctxOf(g, unitId, viewer); if (!x) return null;
  const f = find(x, id); if (!f || f.d.pad) return null;
  if (nextStep(f.d, picks, { required: true })) return null;
  const P = withMods(x, f.d, picks).picks;
  return safe(() => f.s.send(x, f.d, P), null);
}
/** The engine's preview of a descriptor with the picks so far: the next pick (with its legal choices), the verdict, the
 * cost, the lines and the grid marks. Asks the reducer itself (previewAction) once every required pick is made. */
export function previewDescriptor(g: GameState, unitId: string, id: string, picks: Picks = {}, viewer?: string | null): DescriptorPreview | null {
  const x = ctxOf(g, unitId, viewer); if (!x) return null;
  const f = find(x, id); if (!f) return null;
  const { d, s } = f;
  const tm = withMods(x, d, picks), toggles = tm.toggles; picks = tm.picks;
  let next = nextStep(d, picks); const need = nextStep(d, picks, { required: true });
  if (next) { const ch = s.choices ? safe(() => s.choices!(x, d, next!, picks), undefined) : undefined; if (ch) next = { ...next, choices: ch }; }
  const out: DescriptorPreview = { id, ok: d.available, why: d.why, ask: need ? need.prompt : null, next, ap: d.cost.ap, cost: d.cost.text, lines: [], marks: { units: [], tiles: [] }, toggles, action: null };
  if (d.pad) return { ...out, ok: false, why: d.why, ask: 'Pick one in the pad.' };
  // a refused action asks for nothing: the refusal is the answer (a second Whisper says "One Whisper a turn.", not
  // "Click yourself or an ally")
  if (!d.available) return { ...out, ask: null };
  const action = need ? null : safe(() => s.send(x, d, picks), null);
  const extra = s.preview ? safe(() => s.preview!(x, d, picks, action), null) : null;
  if (extra) { if (extra.rolls) out.rolls = extra.rolls; if (extra.lines) out.lines.push(...extra.lines); if (extra.marks) out.marks = { units: extra.marks.units || [], tiles: extra.marks.tiles || [] }; if (typeof extra.ap === 'number') out.ap = extra.ap; if (extra.ok === false) { out.ok = false; out.why = extra.why || 'Not now.'; } }
  if (next && next.choices) out.marks.tiles.push(...(next.kind === 'tile' ? next.choices.map((k) => ({ tile: k, kind: 'choice' as const })) : []));
  if (picks.tile) out.marks.tiles.push({ tile: picks.tile, kind: 'pick' });
  if (action && out.ok) {
    const vd = safe(() => previewAction(g, action, x.by), { ok: false, why: 'Not now.', ap: 0, g: null } as any);
    out.ok = vd.ok; out.why = vd.ok ? null : vd.why; if (vd.ok) out.ap = vd.ap; out.action = vd.ok ? action : null;
  }
  if (!out.ok && !need && !out.why) out.why = 'Not now.';
  out.cost = out.ap === d.cost.ap ? d.cost.text : apT(out.ap);
  return out;
}
