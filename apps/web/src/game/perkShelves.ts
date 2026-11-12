// The perk card in a fight (rules 1.14): the Perks tab shows three shelves and nothing that can't be used.
//   USE NOW          an item with a fight action this unit can see now (ready, or greyed with its reason): the buttons
//   RIDES AN ACTION  an item with no button of its own, only a switch on another action (an attack, a move, a Pump…)
//   ALWAYS ON        a passive, with a live line: ready, used, waiting for its trigger, what it last did, or (for one
//                    with no moment to wait for) that it is on
// Items that only matter in the story are left off the fight's card. Class moves stay on their own CLASS tab.
//
// Which shelf an item sits on, what it waits for and where it stands now are the ENGINE's facts (packages/engine/src/
// perkcard.ts perkCards: the shelf from the item's runtime definition, the trigger from data/perk_cards.json, the state
// from the counters the engine keeps and the fight's log). This module only puts them into words for the row and the
// selection box. It never looks into the registry and never reads a card's prose (engine review 4, finding 9).
//
// Nothing here changes the game and nothing invents state.
import { perkActionsFor, perkCards, withGame, LOG_LOOKBACK, type PerkCard, type PerkActionEntry, type UseScope } from '@engine';
export { shelfOf, LOG_LOOKBACK } from '@engine';

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

// ---------------------------------------------------------------------------------------------- the card's words
/** Where a switch sits, in words, by the action the engine says it rides. */
const RIDES_ON: Record<string, string> = { 'combat/attack': 'on your attacks', 'combat/move': 'on a move', 'combat/pump': 'on a Pump', 'combat/outburst': 'on Begin', 'combat/release': 'on Release',
  'combat/pray': 'on a prayer', 'combat/evoke': 'on Evoke', 'combat/reload': 'on a reload', 'combat/technique': 'on a Technique', 'combat/perk': 'on a perk action', 'combat/call': 'on a Call' };
const USED: Partial<Record<UseScope, string>> = { per_turn: 'Used this turn', per_round: 'Used this round', reaction: 'Used this round', per_combat: 'Used this fight', per_scene: 'Used this scene',
  per_session: 'Used this session', per_rest: 'Used until the next rest', per_campaign: 'Used for this campaign' };
const ONCE: Partial<Record<UseScope, string>> = { per_turn: 'Once a turn', per_round: 'Once a round', reaction: 'Once a round', per_combat: 'Once a fight', per_scene: 'Once a scene',
  per_session: 'Once a session', per_rest: 'Once between rests', per_campaign: 'Once a campaign' };
const short = (s: string, n = 96) => { s = s.replace(/\s+/g, ' ').trim(); return s.length > n ? s.slice(0, n - 1).replace(/[ ,;:]+\S*$/, '') + '…' : s; };
const stop = (s: string) => (/[.!?…”"]$/.test(s) ? s : s + '.');

const head = (k: PerkCard) => ({ key: k.key, itemId: k.itemId, kind: k.kind, tier: k.tier, name: k.name, text: k.text });
function ridesRow(k: PerkCard): ShelfRow {
  // The switches by name and where they are (the engine lists only the ones the tier held has).
  const where = [...new Set(k.switches.flatMap((t) => t.on.map((o) => RIDES_ON[o] || 'on another action')))].join(' and ');
  const names = [...new Set(k.switches.map((t) => '“' + t.label + '”'))], count = k.uses ? k.uses.label : '';
  return { ...head(k), shelf: 'rides', line: where + (count ? ' · ' + count : ''),
    detail: 'No button here. Its ' + (names.length > 1 ? 'switches ' + names.slice(0, -1).join(', ') + ' and ' + names[names.length - 1] + ' are ' : 'switch ' + names[0] + ' is ') + where + ': pick that action and ' + (names.length > 1 ? 'they show' : 'the switch shows') + ' under it. ' + k.text };
}
/** An ALWAYS ON row from the engine's state: used, what it last did, its limit, ready, waiting for its trigger, or on. */
function alwaysRow(k: PerkCard): ShelfRow {
  const comes = k.button ? 'Its button appears ' + (/^when/.test(k.trigger) ? k.trigger : 'when it can be used') + '.' : '';
  const base = k.state === 'used' ? USED[k.spent!] || 'Used'
    : k.state === 'last' ? 'Last: ' + k.last.replace(/\.$/, '')
    : k.state === 'ready' ? 'Ready'
    : k.state === 'waiting' ? (k.button ? comes.replace(/\.$/, '') : 'Waiting: ' + k.trigger)
    : k.privateCount ? ONCE[k.per] || 'Active all fight'
    : k.trigger && k.standing ? 'Works ' + k.trigger : 'Active all fight';
  const full = [stop(base), ...(k.state === 'used' && k.last ? [stop('Last: ' + k.last.replace(/\.$/, ''))] : []), ...(k.button && !(k.state === 'waiting') ? [comes] : k.button ? [] : ['It works by itself.'])];
  return { ...head(k), shelf: 'always', line: short(base), state: k.state, button: k.button, detail: full.join(' ') + ' ' + k.text };
}

/** The three shelves of the unit whose turn it is. since: the index in cb.log where the unit's last turn began
 *  (turnMark keeps it); without it, the last LOG_LOOKBACK lines are read. It changes nothing (the game is bound while it reads). */
export function perkShelves(g: any, cb: any, u: any, ch: any, opts: { since?: number; /** The unit's Perks-tab actions, when the caller has them already. */ entries?: PerkActionEntry[] } = {}): PerkShelves {
  const out: PerkShelves = { use: [], rides: [], always: [] }; if (!u) return out;
  const c = ch || (g && u.charId ? g.characters?.[u.charId] : null);
  try {
    withGame(g || null, () => {
      let entries: PerkActionEntry[] = opts.entries || []; if (!opts.entries) try { entries = perkActionsFor({ u, c, cb, g }, 'combat').filter((e) => e.tab === 'perks'); } catch { entries = []; }
      out.use = entries;
      for (const k of perkCards({ u, c, cb, g }, { since: opts.since, up: entries.map((e) => e.id) })) { if (k.shelf === 'rides') out.rides.push(ridesRow(k)); else out.always.push(alwaysRow(k)); }
    });
  } catch { /* a card that can't be read shows what it has, never a crash */ }
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
