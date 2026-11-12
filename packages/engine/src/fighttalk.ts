// Speaking and attempting in a fight (rules 1.14, items 1008 and 1009). Speech is free and goes to the Narrator. An
// attempt (words that want something to happen) costs 1 AP, once a turn, and opens ONE pending fight ruling: the fight
// waits until the Narrator answers it (narrator/fight-ruling) or the host skips it (narrator/fight-skip, a refund).
// A perk that asks for words raises the same ruling with its own AP and use. This file is the state and its gates;
// game.ts owns the actions and validates and applies the Narrator's answer (the engine keeps every number).
import type { Combat, Unit } from './combat';
import type { Holder } from './effects';
import { costOf, whyNot } from './effects/cost';
import { condDef } from './condtable';

/** PROVISIONAL (item 1008): an attempt's AP. */
export const ATTEMPT_AP: number = costOf('attempt');
/** PROVISIONAL (item 1009): the only conditions the Narrator may put on a unit in a fight, for one round each. */
export const FIGHT_CONDS = ['shaken', 'taunted', 'lowered', 'hesitates'] as const;
export type FightCond = (typeof FIGHT_CONDS)[number];
/** Their names: the condition table's (data/conditions.json); Hesitates is not a condition (it is Staggered: 1 AP off the next turn). */
export const FIGHT_COND_NAME = Object.fromEntries(FIGHT_CONDS.map((c) => [c, c === 'hesitates' ? 'Hesitates' : condDef(c)!.title])) as Record<FightCond, string>;
/** PROVISIONAL (item 1009): how long such a condition lasts. */
export const FIGHT_COND_ROUNDS = 1;

/** What the Narrator may ask the engine for after its lines: exactly one of these, and nothing else. */
export type FightOutcome = { condition: { target: string; id: FightCond } } | { surrender: { target: string } };
export type FightEffect = { check: { skill: string; tn: number; onSuccess?: FightOutcome } } | FightOutcome | { perk: { accepted: boolean } };
export interface FightAnswer { id: string; lines: string[]; effect?: FightEffect }
/** The one attempt the fight is waiting on. */
export interface FightRuling {
  id: string; /** The speaker's unit and character. */ unit: string; charId: string; text: string; round: number;
  /** AP the attempt cost (given back on a refund). */ ap: number;
  /** A perk that asked for words: its key, name and card text; `ask` is the Narrator's side of it (never sent to
   *  players); `use` is the use it spent; `private` keeps the words from the other players (Their Own Idea). */
  perk?: { key: string; name: string; card: string; ask?: string; target?: string; private?: boolean; use?: { per: string; key: string } };
}
/** The fight-talk fields a Combat carries (kept here so combat.ts needs no change). */
export interface FightTalk {
  /** The pending fight ruling: while it is set, nobody acts and the turn can't end. */ ruling?: FightRuling;
  /** Who has attempted, by unit id, and in which round (once a turn each). */ attempted?: Record<string, number>;
  /** The last things said in this fight, for the Narrator's next answer. */ said?: { who: string; text: string; round: number }[];
}
export const talkOf = (cb: Combat): Combat & FightTalk => cb as Combat & FightTalk;
export const fightRulingOf = (cb: Combat | null | undefined): FightRuling | null => (cb ? talkOf(cb).ruling || null : null);
const current = (cb: Combat) => cb.units.find((u) => u.id === cb.order[cb.turn]);

/** Why no Narrator can answer in this game now, or null. A human Narrator is the host, at the table. An AI Narrator is
 *  connected while the host's browser says its key is set up (narrator/ready). */
export function narratorOff(g: any): string | null {
  if (!g) return 'No Narrator is connected.';
  if (g.sandbox) return 'There is no Narrator in the Proving Ground.';
  if (g.settings?.mode === 'human') return g.players?.find((p: any) => p.id === g.hostId)?.online === false ? 'The Narrator is away.' : null;
  if (g.narrator?.offline) return 'No Narrator is connected.';
  return null;
}
/** Why this unit can't make an attempt now, or null (rules 1.14: your own turn, once a turn, a Narrator connected).
 *  ap: what it costs (1 for a plain attempt; a perk pays its own cost before this is asked, so it passes 0). */
export function attemptWhy(g: any, cb: Combat | null | undefined, u: Unit | null | undefined, ap = ATTEMPT_AP): string | null {
  if (!cb || !u || cb.over) return 'No fight is on.';
  const t = talkOf(cb);
  if (t.ruling) return 'The Narrator is deciding.';
  if (cb.window || current(cb)?.id !== u.id) return 'Only on your own turn.';
  if (!u.charId || u.companion) return 'Only a character can attempt something.';
  if (t.attempted?.[u.id] === cb.round) return 'You already made an attempt this turn.';
  const off = narratorOff(g); if (off) return off;
  { const no = whyNot(cb, u, ap); if (no) return no; }
  return null;
}
/** Open the pending fight ruling (the caller has checked attemptWhy and paid the AP). */
export function openRuling(g: any, cb: Combat, u: Unit, text: string, ap: number, perk?: FightRuling['perk']): FightRuling {
  const t = talkOf(cb);
  const r: FightRuling = { id: 'f' + (++g.seq), unit: u.id, charId: u.charId!, text: String(text || '').trim().slice(0, 300), round: cb.round, ap, ...(perk ? { perk } : {}) };
  t.ruling = r; (t.attempted ||= {})[u.id] = cb.round;
  return r;
}

// ---------- perks that ask for words ----------
/** A perk action's preview in a fight: refused with the reason when it can't raise an attempt now. */
export function wordsGate(h: Holder): { ok?: boolean; why?: string } {
  const why = attemptWhy(h.g, h.cb, h.u, 0);
  return why ? { ok: false, why } : {};
}
/** A perk's fight action that is "write words and wait for the Narrator": it raises the turn's attempt with the perk's
 *  key, card text and use (game.ts fills in the AP the action cost). per / actionId: the use to give back on a no. */
export function raiseWords(h: Holder, o: { text: string; ask?: string; targetId?: string; private?: boolean; per: string; actionId: string }): string | null {
  const cb = h.cb, u = h.u, g = h.g;
  const why = attemptWhy(g, cb, u, 0); if (why || !cb || !u || !g) return why || 'No fight is on.';
  const tgt = o.targetId ? cb.units.find((x) => x.id === o.targetId) : null;
  openRuling(g, cb, u, o.text, 0, { key: h.key, name: h.info.name, card: String(h.info.text || '').slice(0, 400), ...(o.ask ? { ask: o.ask.slice(0, 400) } : {}), ...(tgt ? { target: tgt.id } : {}), ...(o.private ? { private: true } : {}), use: { per: o.per, key: h.key + '#' + o.actionId } });
  return null;
}
