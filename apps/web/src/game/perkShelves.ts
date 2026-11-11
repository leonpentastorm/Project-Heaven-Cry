// The perk card in a fight (rules 1.14): the Perks tab shows three shelves and nothing that can't be used.
//   USE NOW          an item with a fight action this unit can see now (ready, or greyed with its reason): the buttons
//   RIDES AN ACTION  an item with no button of its own, only a switch on another action (an attack, a move, a Pump…)
//   ALWAYS ON        a passive, with a live line: ready, used, waiting for its trigger, what it last did, or (for one
//                    with no moment to wait for) that it is on
// Items that only matter in the story are left off the fight's card. Class moves stay on their own CLASS tab.
//
// The shelf is read from the registry at run time, the way the audit does it (packages/engine/test/perk-audit.test.ts,
// docs/design/handoffs/perk-audit.md), so a new perk lands on its shelf with no table to maintain. An item whose
// button only shows at its moment (Catch after a catch, Clean Draw with a glyph down…) sits on ALWAYS ON with "its
// button appears…" and moves to USE NOW while the button is up (the audit's finding 8).
//
// Nothing here changes the game and nothing invents state: the live line is the use counters the engine keeps, the
// fight's own log, or the item's own text.
import { holdersOf, handlerOf, actionDefs, defaultActions, perkActionsFor, uses, usesLabel, genericOf, ownerOf, scopeOf, stampOf, bindGame, PERK, TECHNIQUES,
  type Holder, type PerkActionEntry, type UseScope } from '@engine';

export type ShelfId = 'use' | 'rides' | 'always';
export const SHELF_ORDER: ShelfId[] = ['use', 'rides', 'always'];
export const SHELF_LABEL: Record<ShelfId, string> = { use: 'USE NOW', rides: 'RIDES AN ACTION', always: 'ALWAYS ON' };
/** What each shelf is, for its heading's hover and for screen readers. */
export const SHELF_HELP: Record<ShelfId, string> = {
  use: 'Actions you can take this turn. Pick one, then Confirm.',
  rides: 'These have no button here. Each is a switch on another action, shown when you pick that action.',
  always: 'These work by themselves. Each line says where it stands now.',
};

/** A read-only row on RIDES AN ACTION or ALWAYS ON. */
export interface ShelfRow {
  /** The item key ("perk:running_reload", "trait:gambler", "skill:will_power.5"). */
  key: string; itemId: string; kind: string; tier: string; name: string; shelf: 'rides' | 'always';
  /** The short line on the row: where the switch is, or the live state. */
  line: string;
  /** Which kind of live line an ALWAYS ON row shows. */
  state?: 'ready' | 'used' | 'waiting' | 'last' | 'active';
  /** ALWAYS ON: the item has a button that is hidden now and appears at its moment. */
  button?: boolean;
  /** The item's own card text. */
  text: string;
  /** The whole card for the selection box: the line in full, then the text. */
  detail: string;
}
export interface PerkShelves { use: PerkActionEntry[]; rides: ShelfRow[]; always: ShelfRow[] }

// ---------------------------------------------------------------------------------------------- the registry's view
/** Hooks that only fire in the story or on the map (the audit's list): an item with nothing else never acts in a fight. */
const STORY_HOOKS = new Set(['check_build', 'check_mod', 'check_post', 'check_result', 'passive', 'voice_cap', 'ask_limit', 'overreach_cost', 'echo_gain',
  'scene_change', 'session_start', 'rest', 'xp_grant', 'notice', 'stay_hidden', 'world_move_cost', 'karma_award', 'session_heal', 'story_blessing', 'npc_moved',
  'npc_sense', 'zone_enter', 'story_harm', 'stay_hidden_result', 'ruling_answered', 'world_round_start', 'story_cond_apply', 'gift', 'parley']);
/** Where a switch sits, by the action it rides. */
const RIDES_ON: Record<string, string> = { 'combat/attack': 'on your attacks', 'combat/move': 'on a move', 'combat/pump': 'on a Pump', 'combat/outburst': 'on Begin', 'combat/release': 'on Release',
  'combat/pray': 'on a prayer', 'combat/evoke': 'on Evoke', 'combat/reload': 'on a reload', 'combat/technique': 'on a Technique', 'combat/perk': 'on a perk action', 'combat/call': 'on a Call' };
/** Items the core rules look for by id, with nothing in the registry for a fight (Many Hands in the hand-off and the
 *  cover reaction, Breaching Strike in the doors' rules): passives all the same. The registry can't see these, so they
 *  are named here; perkShelves.test.ts reads the engine's source and fails when this list falls behind it. */
export const CORE_WIRED: string[] = ['breaching_strike', 'many_hands'];
const TECH_PERKS: Set<string> = new Set(((TECHNIQUES as any[]) || []).map((t) => t && t.perk).filter(Boolean));

interface Reg { combatDefs: number; /** ids of its fight actions */ combatIds: string[]; /** it has actions, and none of them is a fight action: its use counter belongs to the story */ storyCount: boolean; rides: { label: string; on: string[]; available?: (h: Holder, actx: any) => boolean | string }[]; combatHooks: string[]; tech: boolean }
/** What the registry holds for this item at its held tier (the audit's registryOf, the parts a fight uses). */
function registryOf(h: Holder): Reg {
  const hd: any = handlerOf(h.key), info = h.info;
  let defs: any[] = []; try { defs = actionDefs(info); } catch { defs = []; }
  const own = [...Object.keys(hd?.on || {}), ...(hd?.stat ? ['stat'] : []), ...(hd?.checkMod ? ['checkMod'] : [])];
  const generic = (info.effects || []).flatMap((e: any, i: number) => {
    let who = ''; try { who = ownerOf(info, i); } catch { who = ''; }
    if (who !== 'generic') return []; const g: any = genericOf(e?.op);
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
/** The shelf an item sits on right now, or null when nothing it does can matter in a fight. hasButton: one of its
 *  fight actions is in the engine's list for this unit now (ready or greyed). */
export function shelfOf(h: Holder, hasButton: boolean): ShelfId | null {
  if (hasButton) return 'use';
  const R = registryOf(h);
  if (R.combatDefs && buttonComes(h)) return 'always';
  if (R.rides.some((t) => !tierSwitch(h, t))) return 'rides';
  if (R.combatHooks.length || R.tech || CORE_WIRED.includes(h.itemId)) return 'always';
  return null;
}

// ---------------------------------------------------------------------------------------------- the card's words
/** The item's card at the tier held: a perk's tier text, else its full text. */
export function cardText(h: Holder): string {
  const p: any = h.kind === 'perk' ? (PERK as any)[h.itemId] : null;
  return String((p && p.tiers && p.tiers[h.tier] && p.tiers[h.tier].text) || h.info.text || '').replace(/\s+/g, ' ').trim();
}
const TRIGGER = /\b(when(?:ever)?|the first time|each time|every time|after|while|as long as|at the start of|at the end of)\b[^.;:,(]*/i;
/** The trigger the card's own text names in its first sentence ("when combat starts", "the first time each round an
 *  ally…"), or ''. Later sentences are the fine print (what ends it, what it costs), never the trigger. */
export function triggerOf(text: string): string {
  const first = String(text || '').replace(/^\s*(\*\*)?(I|II)(\*\*)?:\s*/, '').split(/\.(\s|$)/)[0];
  const m = TRIGGER.exec(first); if (!m) return '';
  // "when it pushes a target and a wall, a solid object or another enemy stops it, the target…": a comma inside a list
  // is not the end of the trigger. The list's last part has "or"/"and", is followed by another comma, and doesn't
  // open the main clause ("you…", "your…", "the…").
  let end = m.index + m[0].length; const more = /^, ((?!(?:you|your|the|every|each|it|its|they|their|move|up|one|demand|choose|rewind|spend|evoke|and)\b)[^.;:,(]* (?:or|and) [^.;:,(]*)(?=,)/i.exec(first.slice(end));
  if (more) end += more[0].length;
  const t = first.slice(m.index, end).replace(/\s+/g, ' ').trim();
  return t.split(' ').length < 3 ? '' : t.charAt(0).toLowerCase() + t.slice(1);
}
const USED: Partial<Record<UseScope, string>> = { per_turn: 'Used this turn', per_round: 'Used this round', reaction: 'Used this round', per_combat: 'Used this fight', per_scene: 'Used this scene',
  per_session: 'Used this session', per_rest: 'Used until the next rest', per_campaign: 'Used for this campaign' };
const LONGEST: UseScope[] = ['per_campaign', 'per_session', 'per_rest', 'per_scene', 'per_combat', 'per_round', 'reaction', 'per_turn'];
/** Passives the data limits ("once a fight") that keep their count where this card can't read it. They never say
 *  "Ready" or "Used": the row says the limit, and the log line when there is one. perkShelves.test.ts reads the
 *  engine's source and fails when a limited passive is neither counted in the open nor named here. */
export const PRIVATE_COUNT: string[] = ['skill:composure.5'];
const ONCE: Partial<Record<UseScope, string>> = { per_turn: 'Once a turn', per_round: 'Once a round', reaction: 'Once a round', per_combat: 'Once a fight', per_scene: 'Once a scene',
  per_session: 'Once a session', per_rest: 'Once between rests', per_campaign: 'Once a campaign' };
const IN_FIGHT: UseScope[] = ['per_turn', 'per_round', 'reaction', 'per_combat'];
/** The longest-lived use counter of this item that is spent in its current window, read from what the engine keeps
 *  (the unit's cells for a fight, the character's for a scene and longer), or null when nothing is spent.
 *  Which counters speak for the item: its own (the item's key alone) and those of its fight actions, in any window
 *  the data gives it; one of its parts ("#shield", "#ap") only inside a fight (a turn, a round, the fight). A counter
 *  kept for each target, a story action's counter, and a story part's (once a session, once a campaign) say nothing
 *  about the fight, so they are not read. Last Wall and Into the Dark keep "used" on the unit's own fight state. */
function spentScope(h: Holder, R: Reg, g: any): UseScope | null {
  const found = new Set<string>(), whole = scopeOf(h.info.uses);
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
const short = (s: string, n = 96) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[ ,;:]+\S*$/, '') + '…' : s; };
const stop = (s: string) => (/[.!?…”"]$/.test(s) ? s : s + '.');

function ridesRow(h: Holder, R: Reg, g: any): ShelfRow {
  // Its uses, when the data counts them ("1/1 turn"): the engine's own counter for the item.
  let d: any = null; try { d = defaultActions(h.info).find((x) => x.scope.includes('combat')) || null; } catch { d = null; }
  const per: UseScope = d?.uses?.per || 'at_will', n: number = d?.uses?.n ?? 1, count = d ? usesLabel(per, n, Math.min(n, uses({ ...h, g }).left(per, n))) : '';
  // The switches by name and where they are, leaving out another tier's.
  const mine = R.rides.filter((t) => !tierSwitch(h, t));
  const where = [...new Set(mine.flatMap((t) => t.on.map((o) => RIDES_ON[o] || 'on another action')))].join(' and ');
  const text = cardText(h), names = [...new Set(mine.map((t) => '“' + t.label + '”'))];
  return { key: h.key, itemId: h.itemId, kind: h.kind, tier: h.tier, name: h.info.name, shelf: 'rides', line: where + (count ? ' · ' + count : ''), text,
    detail: 'No button here. Its ' + (names.length > 1 ? 'switches ' + names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' are ' : 'switch ' + names[0] + ' is ') + where + ': pick that action and ' + (names.length > 1 ? 'they show' : 'the switch shows') + ' under it. ' + text };
}
/** A trigger that is a standing state ("while your song plays") or the fight's own start reads as when the item
 *  works, not as something still to come: the fight has started already. */
const STANDING_TRIGGER = /^(while|as long as)\b|\b(fight|combat) (starts|begins)\b/i;
function alwaysRow(h: Holder, R: Reg, cb: any, g: any, since: number): ShelfRow {
  const text = cardText(h), trig = triggerOf(text) || triggerOf(h.info.text), button = R.combatDefs > 0 && buttonComes(h);
  const per = scopeOf(h.info.uses), counted = per !== 'at_will' && per !== 'out_of_combat' && !R.storyCount, spent = spentScope(h, R, g), last = lastLine(h, cb, since, g);
  const comes = button ? 'Its button appears ' + (/^when/.test(trig) ? trig : 'when it can be used') + '.' : '';
  let state: ShelfRow['state'], base: string;
  if (spent) { state = 'used'; base = USED[spent] || 'Used'; }
  else if (last) { state = 'last'; base = 'Last: ' + last.replace(/\.$/, ''); }
  else if (counted && PRIVATE_COUNT.includes(h.key)) { state = 'active'; base = ONCE[per] || 'Active all fight'; }
  else if (counted) { state = 'ready'; base = 'Ready'; }
  else if (button) { state = 'waiting'; base = comes.replace(/\.$/, ''); }
  else if (trig && STANDING_TRIGGER.test(trig)) { state = 'active'; base = 'Works ' + trig; }
  else if (trig) { state = 'waiting'; base = 'Waiting: ' + trig; }
  else { state = 'active'; base = 'Active all fight'; }
  const full = [stop(base), ...(spent && last ? [stop('Last: ' + last.replace(/\.$/, ''))] : []), ...(button && state !== 'waiting' ? [comes] : button ? [] : ['It works by itself.'])];
  return { key: h.key, itemId: h.itemId, kind: h.kind, tier: h.tier, name: h.info.name, shelf: 'always', line: short(base), state, button, text, detail: full.join(' ') + ' ' + text };
}

/** How far back "since your last turn" reaches when the screen has not seen that turn start (a fight joined or
 *  reloaded part-way): the last 30 lines of the log. PROVISIONAL: the spec gives no number here (rules 1.14, the perk card in a fight); to be listed in its section 14. */
export const LOG_LOOKBACK = 30;

/** The three shelves of the unit whose turn it is. since: the index in cb.log where the unit's last turn began
 *  (turnMark keeps it); without it, the last LOG_LOOKBACK lines are read. It changes nothing (the game is bound while it reads). */
export function perkShelves(g: any, cb: any, u: any, ch: any, opts: { since?: number; /** The unit's Perks-tab actions, when the caller has them already. */ entries?: PerkActionEntry[] } = {}): PerkShelves {
  const out: PerkShelves = { use: [], rides: [], always: [] }; if (!u) return out;
  const c = ch || (g && u.charId ? g.characters?.[u.charId] : null), since = opts.since ?? Math.max(0, ((cb && cb.log) || []).length - LOG_LOOKBACK);
  const was = bindGame(g || null);
  try {
    let entries: PerkActionEntry[] = opts.entries || []; if (!opts.entries) try { entries = perkActionsFor({ u, c, cb, g }, 'combat').filter((e) => e.tab === 'perks'); } catch { entries = []; }
    out.use = entries;
    // An enemy's passives and their state are not the squad's to read (Analyze is how the squad learns about an enemy).
    if (u.side !== 'pc') return out;
    const up = new Set(entries.map((e) => e.id));
    for (const h of holdersOf({ u, c, cb })) {
      if (h.kind === 'class' || up.has(h.key)) continue; // class moves: their own tab; a button up: USE NOW
      h.g = g ?? null;
      try {
        const sh = shelfOf(h, false); if (!sh) continue; const R = registryOf(h);
        if (sh === 'rides') out.rides.push(ridesRow(h, R, g)); else out.always.push(alwaysRow(h, R, cb, g, since));
      } catch { /* an item that can't be read is left off the card, never a crash */ }
    }
  } finally { bindGame(was); }
  return out;
}

// ---------------------------------------------------------------------------------------------- "since your last turn"
// The fight's log carries no turn marks, so the screen remembers where in the log each unit's turns began as it sees
// them come up. One fight at a time: a shorter log is a new fight.
const MARKS = new Map<string, { stamp: string; start: number; prev: number }>();
let seenLen = 0;
/** Where in cb.log this unit's last turn began: its turn before this one while it is acting, so the line covers what
 *  happened to it since. Call it on each render of the unit's turn. */
export function turnMark(cb: any, u: any): number {
  const len = ((cb && cb.log) || []).length; if (!cb || !u) return 0;
  if (len < seenLen) MARKS.clear();
  seenLen = len;
  const stamp = cb.round + '.' + cb.turn, m = MARKS.get(u.id);
  if (!m) { const at = cb.round <= 1 ? 0 : Math.max(0, len - LOG_LOOKBACK); MARKS.set(u.id, { stamp, start: len, prev: at }); return at; }
  if (m.stamp !== stamp) { m.prev = m.start; m.start = len; m.stamp = stamp; }
  return m.prev;
}
/** Forget every mark (tests, and leaving a fight). */
export const _resetTurnMarks = () => { MARKS.clear(); seenLen = 0; };
