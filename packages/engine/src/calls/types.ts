// Calls (rules 1.13, Skeleton 2.0): the nine gamma skills' speech actions in a fight. The types the core, the nine
// handlers, the enemy AI and the screen share. The data is data/calls.json.
import type { Combat, Unit } from '../combat';
import type { Character } from '../character';
import type { Rng } from '../rng';

export type CallKind = 'helping' | 'hindering';
export type CallAim = 'ally' | 'enemy' | 'self-or-ally';
export type CallSave = 'body' | 'brain' | 'heart';
export interface CallStep { /** the points of the skill it opens at */ at: number; text: string; numbers: Record<string, number> }
export interface CallDef {
  id: string; name: string; skill: string; kind: CallKind; aim: CallAim;
  /** the save family a hindering Call is resisted with (none: it just works) */ save?: CallSave;
  text: string; steps: CallStep[]; adjudication: string; provisional?: boolean;
}
/** What the speaker (or the enemy AI) chose. `opt`: Order's things, joined by '+' ('reload', 'stand', 'pickup',
 * 'move'). `tile`: Order's move, Cue's step, Warn's named tile. `react`: made off the speaker's turn, on its reaction
 * (from 9 points). `text`: the words, for the Narrator. */
export interface CallArgs { targetId?: string; tile?: string; opt?: string; text?: string; react?: boolean }
export interface CallPreview {
  ok: boolean; why: string | null; id: string; ap: number; range: number; level: number; step: number; kind: CallKind; aim: CallAim;
  target: string | null; react: boolean; notes: string[];
  /** a hindering Call's save: who rolls, with what, against what */ save?: { unit: string; family: CallSave; tn: number };
  /** where it puts someone */ moves?: { unit: string; to: string }[];
  /** AP it gives, and when it lands */ gives?: { unit: string; ap: number; when: 'now' | 'this turn' | 'next turn' };
}
/** What a handler is given. */
export interface Call {
  cb: Combat; u: Unit; c: Character | null; def: CallDef; args: CallArgs; tgt: Unit; rng: Rng;
  /** true: change nothing, roll nothing (the card and the AI ask this way) */ preview: boolean;
  pv: CallPreview; level: number; step: number; react: boolean;
  /** added to a save's TN by an item ('call' hook) */ tnAdd: number;
  /** the number of the step the speaker has, else the fallback */ num(key: string, fallback?: number): number;
  /** a line for the card and, when it happens, the log */ note(text: string): void;
}
export interface CallHandler {
  id: string;
  /** a refusal in plain words, or null */ check?(t: Call): string | null;
  /** do it; when t.preview is true, describe it and change nothing. Return a refusal or null. */
  run(t: Call): string | null;
  /** may this Call be aimed at a Hidden enemy the speaker's side doesn't see (Spot from 3 points)? */
  seesHidden?(t: Call): boolean;
  /** enemy AI: how much it wants this Call at t.tgt now (0: never; a plain attack scores 5). Pure: no dice, no state. */
  ai?(t: Call): number | { score: number; args: CallArgs };
}
export interface CallPadEntry {
  id: string; name: string; skill: string; skillName: string; kind: CallKind; aim: CallAim;
  ap: number; range: number; level: number; step: number; ok: boolean; why: string | null;
  /** the text of the step the unit has, and the Call's own line */ text: string; summary: string;
  /** every step, with the points it opens at and whether the unit has it */ steps: { at: number; text: string; has: boolean }[];
  /** the save an enemy makes, and its TN from this speaker */ save?: { family: CallSave; tn: number };
  /** it can be made as a reaction this round */ reaction: boolean;
  /** this one costs nothing (the first Call of the turn at 10 points) */ free: boolean;
}
/** What Calls leave on a unit (plain JSON, saved with the fight; u.call). Every mark carries the side that made it:
 * a view shows a mark only to that side (callView). */
export interface CallMarks {
  /** the speaker's own count this turn (the free first Call at 10 points; an enemy's one Call a turn) */ turn?: { t: string; n: number };
  /** the round the speaker Called as a reaction */ react?: number;
  /** the one helping and one hindering Call a round */ helped?: { r: number; id: string; side: string }; hindered?: { r: number; id: string; side: string };
  /** Brief: AP off the next actions, first first */ brief?: { by: string; side: string; cuts: number[] };
  /** Name It: + on every save until the speaker's next turn */ saves?: { by: string; side: string; n: number };
  /** (the first Name It; unused since Leon's ruling of 10 Nov 2026) AP of loss cancelled at the next turn start (99: all of it) */ cancel?: { by: string; side: string; n: number };
  /** Cue: one more reaction */ cue?: { by: string; side: string; r: number };
  /** Spot: allies still to use it, who has, and who is using it now */ spot?: { by: string; side: string; r: number; left: number; users: string[]; live: string | null; hit: number; unhide: boolean };
  /** Warn: the step before the next attack */ warn?: { by: string; side: string; r: number; tiles: number; hit: number; to?: string; used?: boolean; live?: string | null };
  /** Threaten: AP lost at the next turn start; and no moving toward the speaker that turn */ apLoss?: { by: string; side: string; n: number }; cowed?: { by: string; side: string; fresh?: boolean };
  /** Taunt: the attack on the taunter costs more */ tauntAp?: { by: string; side: string; n: number };
}
