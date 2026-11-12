// The perk card in a fight (rules 1.14), as the engine tells it (engine review 4, finding 9). For every perk, trait and
// skill perk a unit holds that can matter in a fight, the engine says which shelf it sits on, what it waits for and
// where it stands now. The client words it and draws it; it never looks into the registry and never reads a card's
// prose for a trigger.
//
//   USE NOW          an item with a fight action this unit can see now: the buttons (effects/actions.ts perkActionsFor)
//   RIDES AN ACTION  no button of its own, only a switch on another action (an attack, a move, a Pump…)
//   ALWAYS ON        a passive: ready, used, waiting for its trigger, what it last did, or simply on
//
// Where each fact comes from:
//   the shelf    the item's runtime definition (its handler's actions, switches and hooks; the generic ops its effects
//                run on), the way the audit reads it (test/perk-audit.test.ts). An item the core rules look for by id,
//                with no handler of its own, is declared in data/perk_cards.json `core_wired`.
//   the trigger  data/perk_cards.json, by item and tier. Never from the card's text.
//   the state    the use counters the engine keeps (effects/uses.ts), the item's own fight state, the fight's log.
//
// Items that only matter in the story are left off (null shelf). Class moves have their own tab and are not listed.
import './datatext'; // fills the texts' {=placeholders} before any data is read
import { triggerHook } from './effects/triggers';
import cardsJ from '../../../data/perk_cards.json';
import type { Character } from './character';
import type { Combat, Unit } from './combat';
import { PERK } from './data';
import { TECHNIQUES } from './physical/data';
import { holdersOf, handlerOf, genericOf, ownerOf } from './effects/hooks';
import { actionDefs, defaultActions, perkActionsFor } from './effects/actions';
import { uses, usesLabel, scopeOf, stampOf } from './effects/uses';
import type { Holder, UseScope } from './effects/types';

export type ShelfId = 'use' | 'rides' | 'always';
export type CardState = 'ready' | 'used' | 'waiting' | 'last' | 'active';
export interface PerkCard {
  /** The item key ("perk:running_reload", "trait:gambler", "skill:will_power.5"). */
  key: string; itemId: string; kind: string; tier: string; name: string;
  /** The item's own card text at the tier held. */
  text: string;
  shelf: 'rides' | 'always';
  /** RIDES AN ACTION: its switches at the tier held, each with the actions it rides on ('combat/attack', 'combat/pump'…). */
  switches: { label: string; on: string[] }[];
  /** RIDES AN ACTION: its use counter, when the data counts its uses ("1/1 turn"). */
  uses: { per: UseScope; n: number; left: number; label: string } | null;
  /** ALWAYS ON: the moment it works, in the card's words (data/perk_cards.json), or ''. */
  trigger: string;
  /** The trigger is a standing state or the fight's own start: there is nothing to wait for. */
  standing: boolean;
  /** ALWAYS ON: where it stands now. */
  state: CardState;
  /** state 'used': the window its use is spent for (the longest one). */
  spent: UseScope | null;
  /** The window the data limits it to ('at_will' when it isn't limited). */
  per: UseScope;
  /** A limited passive that keeps its count where the card can't read it: it shows its limit, never "Ready". */
  privateCount: boolean;
  /** It has a fight button that is hidden now and appears at its moment. */
  button: boolean;
  /** The last line of the fight's log that names it (since `since`), or ''. */
  last: string;
}

interface CardRow { id: string; tier?: string; trigger: string; standing?: boolean }
/** data/perk_cards.json. */
export const PERK_CARDS: { items: CardRow[]; core_wired: string[]; private_count: string[] } = cardsJ as any;
const TRIGGERS = new Map<string, CardRow>(PERK_CARDS.items.map((r) => [r.id + '@' + (r.tier || ''), r]));
/** The moment an item works, as its card declares it (data/perk_cards.json): by item key and tier held. */
export function cardTrigger(key: string, tier?: string | null): { trigger: string; standing: boolean } {
  const r = TRIGGERS.get(key + '@' + (tier || '')) || TRIGGERS.get(key + '@');
  return { trigger: r ? r.trigger : '', standing: !!(r && r.standing) };
}

/** Hooks that only fire in the story or on the map (the audit's list): an item with nothing else never acts in a fight. */
const STORY_HOOKS = new Set(['check_build', 'check_mod', 'check_post', 'check_result', 'passive', 'voice_cap', 'ask_limit', 'overreach_cost', 'echo_gain',
  'scene_change', 'session_start', 'rest', 'xp_grant', 'notice', 'stay_hidden', 'world_move_cost', 'karma_award', 'session_heal', 'story_blessing', 'npc_moved',
  'npc_sense', 'zone_enter', 'story_harm', 'stay_hidden_result', 'ruling_answered', 'world_round_start', 'story_cond_apply', 'gift', 'parley']);
const TECH_PERKS: Set<string> = new Set(((TECHNIQUES as any[]) || []).map((t: any) => t && t.perk).filter(Boolean));

interface Reg { combatDefs: number; /** ids of its fight actions */ combatIds: string[]; /** it has actions, and none of them is a fight action: its use counter belongs to the story */ storyCount: boolean; rides: { label: string; on: string[]; available?: (h: Holder, actx: any) => boolean | string }[]; combatHooks: string[]; tech: boolean }
/** What the registry holds for this item at its held tier (the audit's registryOf, the parts a fight uses). */
function registryOf(h: Holder): Reg {
  const hd: any = handlerOf(h.key), info = h.info;
  let defs: any[] = []; try { defs = actionDefs(info); } catch { defs = []; }
  const own = [...Object.keys(hd?.on || {}), ...(hd?.stat ? ['stat'] : []), ...(hd?.checkMod ? ['checkMod'] : [])];
  const generic = (info.effects || []).flatMap((e: any, i: number) => {
    let who = ''; try { who = ownerOf(info, i); } catch { who = ''; }
    if (who !== 'generic') return []; const t = triggerHook(e); if (t) return [t]; // an item op (engine foundations 3): its trigger's hook
    const g: any = genericOf(e?.op);
    return [...Object.keys(g?.on || {}), ...(g?.stat ? ['stat'] : []), ...(g?.checkMod ? ['checkMod'] : [])];
  });
  return {
    combatDefs: defs.filter((d) => d.scope.includes('combat')).length, combatIds: defs.filter((d) => d.scope.includes('combat')).map((d) => d.id), storyCount: defs.length > 0 && !defs.some((d) => d.scope.includes('combat')),
    rides: ((hd?.toggles || []) as any[]).filter((t) => t.on.some((o: string) => o.startsWith('combat/'))).map((t) => ({ label: t.label, on: t.on.filter((o: string) => o.startsWith('combat/')), available: t.available })),
    combatHooks: [...new Set([...own, ...generic])].filter((k) => !STORY_HOOKS.has(k)),
    tech: TECH_PERKS.has(h.itemId),
  };
}
/** Is one of the item's hidden fight buttons waiting for its moment (and not for a tier the holder doesn't have)? A
 *  Tier I holder's button that shows at Tier II is a tier's button, not a moment's: it is never promised. */
function buttonComes(h: Holder): boolean {
  let defs: any[] = []; try { defs = actionDefs(h.info); } catch { return false; }
  for (const d of defs) {
    if (!d.scope.includes('combat') || !d.available) continue;
    let now: any = true; try { now = d.available(h); } catch { now = true; }
    if (now !== false) continue; // it is up (the caller found no entry for another reason: it is not promised)
    if (h.tier !== 'I') return true;
    let atII: any = false; try { atII = d.available({ ...h, tier: 'II' }); } catch { atII = false; }
    if (atII === false) return true;
  }
  return false;
}
/** Is this switch one the holder's tier doesn't have (off at the tier held, there at Tier II)? Such a switch is never
 *  listed: a Tier I holder is not sent looking for it. A switch that is off for the moment only (no target yet) stays. */
function tierSwitch(h: Holder, t: Reg['rides'][number]): boolean {
  if (!t.available || h.tier !== 'I') return false;
  try { return t.available(h, {}) === false && t.available({ ...h, tier: 'II' } as Holder, {}) !== false; } catch { return false; }
}
/** Core-wired items (data/perk_cards.json): looked for by id in the core rules, nothing in the registry for a fight. */
export const coreWired = (itemId: string) => PERK_CARDS.core_wired.includes(itemId);
/** The shelf an item sits on right now, or null when nothing it does can matter in a fight. hasButton: one of its
 *  fight actions is in the engine's list for this unit now (ready or greyed). */
export function shelfOf(h: Holder, hasButton: boolean): ShelfId | null {
  if (hasButton) return 'use';
  const R = registryOf(h);
  if (R.combatDefs && buttonComes(h)) return 'always';
  if (R.rides.some((t) => !tierSwitch(h, t))) return 'rides';
  if (R.combatHooks.length || R.tech || coreWired(h.itemId)) return 'always';
  return null;
}
/** The item's card at the tier held: a perk's tier text, else its full text. */
export function cardText(h: Pick<Holder, 'kind' | 'itemId' | 'tier' | 'info'>): string {
  const p: any = h.kind === 'perk' ? (PERK as any)[h.itemId] : null;
  return String((p && p.tiers && p.tiers[h.tier] && p.tiers[h.tier].text) || h.info.text || '').replace(/\s+/g, ' ').trim();
}

const LONGEST: UseScope[] = ['per_campaign', 'per_session', 'per_rest', 'per_scene', 'per_combat', 'per_round', 'reaction', 'per_turn'];
const IN_FIGHT: UseScope[] = ['per_turn', 'per_round', 'reaction', 'per_combat'];
/** The longest-lived use counter of this item that is spent in its current window, read from what the engine keeps
 *  (the unit's cells for a fight, the character's for a scene and longer), or null when nothing is spent.
 *  Which counters speak for the item: its own (the item's key alone) and those of its fight actions, in any window
 *  the data gives it; one of its parts ("#shield", "#ap") only inside a fight (a turn, a round, the fight). A counter
 *  kept for each target, a story action's counter, and a story part's (once a session, once a campaign) say nothing
 *  about the fight, so they are not read. Last Wall and Into the Dark keep "used" on the unit's own fight state. */
function spentScope(h: Holder, R: Reg, g: any): UseScope | null {
  const found = new Set<string>(), whole = scopeOf((h.info as any).uses);
  for (const cells of [(h.u as any)?.uses, (h.c as any)?.uses]) for (const [k, cell] of Object.entries((cells || {}) as Record<string, any>)) {
    if (!k.startsWith(h.key)) continue; const cut = k.lastIndexOf('|'), sub = k.slice(h.key.length, cut), scope = k.slice(cut + 1) as UseScope;
    if (sub !== '' && sub.charAt(0) !== '#') continue; // another item's ("perk:catch_up"), or one kept for each target
    const action = sub !== '' && R.combatIds.includes(sub.slice(1));
    if (!IN_FIGHT.includes(scope) && !action && !(sub === '' && scope === whole && !R.storyCount)) continue;
    if (cell && cell.n > 0 && cell.s === stampOf(scope, { cb: h.cb, g })) found.add(scope);
  }
  if ((h.u as any)?.ps?.[h.key]?.used === true) found.add('per_combat');
  return LONGEST.find((s) => found.has(s)) || null;
}
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The last line of the fight's log, from `since` on, that names this item (and this unit, or nobody else who holds
 *  it), or ''. */
function lastLine(h: Holder, cb: any, since: number, g: any): string {
  const log: string[] = (cb && cb.log) || [], name = h.info.name, re = new RegExp('(^|[^A-Za-z])' + esc(name) + '($|[^A-Za-z])');
  let others: string[] | null = null;
  for (let i = log.length - 1; i >= Math.max(0, since); i--) {
    const l = String(log[i] || ''); if (!re.test(l)) continue;
    if (h.u && l.includes(h.u.name)) return l;
    if (!others) others = ((cb.units || []) as any[]).filter((v) => v !== h.u && v.id !== h.u?.id).filter((v) => { try { return holdersOf({ u: v, c: v.charId ? g?.characters?.[v.charId] : null, cb }).some((y) => y.key === h.key); } catch { return false; } }).map((v) => v.name);
    if (!others.some((n) => l.includes(n))) return l;
  }
  return '';
}

/** How far back "since your last turn" reaches when the caller has not seen that turn start (a fight joined or reloaded
 *  part-way): the last 30 lines of the log. PROVISIONAL: the spec gives no number here (rules 1.14, the perk card in a fight). */
export const LOG_LOOKBACK = 30;

function cardOf(h: Holder, shelf: 'rides' | 'always', cb: any, g: any, since: number): PerkCard {
  const R = registryOf(h), text = cardText(h);
  const base = { key: h.key, itemId: h.itemId, kind: h.kind, tier: h.tier, name: h.info.name, text, shelf };
  const per = scopeOf((h.info as any).uses);
  if (shelf === 'rides') {
    // Its uses, when the data counts them ("1/1 turn"): the engine's own counter for the item.
    let d: any = null; try { d = defaultActions(h.info).find((x) => x.scope.includes('combat')) || null; } catch { d = null; }
    const p: UseScope = d?.uses?.per || 'at_will', n: number = d?.uses?.n ?? 1, left = d ? Math.min(n, uses({ ...h, g }).left(p, n)) : n;
    return { ...base, switches: R.rides.filter((t) => !tierSwitch(h, t)).map((t) => ({ label: t.label, on: t.on })), uses: d ? { per: p, n, left, label: usesLabel(p, n, left) } : null,
      trigger: '', standing: false, state: 'active', spent: null, per, privateCount: false, button: false, last: '' };
  }
  const t = cardTrigger(h.key, h.tier), button = R.combatDefs > 0 && buttonComes(h);
  const counted = per !== 'at_will' && per !== 'out_of_combat' && !R.storyCount, spent = spentScope(h, R, g), last = lastLine(h, cb, since, g), privateCount = counted && PERK_CARDS.private_count.includes(h.key);
  const state: CardState = spent ? 'used' : last ? 'last' : privateCount ? 'active' : counted ? 'ready' : button ? 'waiting' : t.trigger && t.standing ? 'active' : t.trigger ? 'waiting' : 'active';
  return { ...base, switches: [], uses: null, trigger: t.trigger, standing: t.standing, state, spent, per, privateCount, button, last };
}

/** The held items of the unit that have no button up now, each on its shelf with its trigger and state (rules 1.14).
 *  up: the item keys whose buttons are in the action list now (USE NOW): they are left out. since: the index in cb.log
 *  where the unit's last turn began; without it, the last LOG_LOOKBACK lines are read. An enemy's passives are not the
 *  squad's to read: nothing is listed for the other side. Call it with the game bound (preview.ts withGame). */
export function perkCards(x: { u: Unit; c?: Character | null; cb?: Combat | null; g?: any }, o: { since?: number; up?: Iterable<string> } = {}): PerkCard[] {
  const { u, cb, g } = x, out: PerkCard[] = []; if (!u || u.side !== 'pc') return out;
  const c = x.c || (g && u.charId ? g.characters?.[u.charId] : null), since = o.since ?? Math.max(0, ((cb && cb.log) || []).length - LOG_LOOKBACK);
  const up = new Set<string>(o.up || (() => { try { return perkActionsFor({ u, c, cb, g }, 'combat').filter((e) => e.tab === 'perks').map((e) => e.id); } catch { return []; } })());
  for (const h of holdersOf({ u, c, cb })) {
    if (h.kind === 'class' || up.has(h.key)) continue; // class moves: their own tab; a button up: USE NOW
    h.g = g ?? null;
    try { const sh = shelfOf(h, false); if (sh === 'rides' || sh === 'always') out.push(cardOf(h, sh, cb, g, since)); } catch { /* an item that can't be read is left off the card, never a crash */ }
  }
  return out;
}
