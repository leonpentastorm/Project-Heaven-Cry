// Calls (rules 1.13): the data. Nine Calls, one per gamma skill, and the shared ladder (data/calls.json `rules`).
import '../datatext'; // fills the texts' {=placeholders} before any data is read
import callsJ from '../../../../data/calls.json';
import { SKILL } from '../data';
import type { CallDef } from './types';

/** One row of the Call's price (rules 1.70 item 5535): from these points of the Call's skill, its AP, how many times a
 * turn each Call may be made, and whether the reaction may pay (own turn: any Call; off turn: a helping Call). */
export interface CallPriceRow { from: number; ap: number; per_turn: number; reaction?: boolean }
export interface CallRules {
  price: CallPriceRow[];
  range_base: number; range_per_point: number; steps_at: number[];
  reactions_per_round: number; reaction_ap: number;
  save_tn: number; helping_per_round: number; hindering_per_round: number; mark_rounds: number;
  enemy: { per_turn: number; beats: number }; text: string;
}
export const CALL_RULES: CallRules = (callsJ as any).rules;
export const CALLS: CallDef[] = (callsJ as any).items;
export const CALL: Record<string, CallDef> = Object.fromEntries(CALLS.map((c) => [c.id, c]));
/** The Call a gamma skill has (null: the skill has none). */
export const callOfSkill = (skill: string): CallDef | null => CALLS.find((c) => c.skill === skill) || null;
/** The skill's name as the data has it (Vigilance, Senses, Insinuation: ids don't change, names do). */
export const callSkillName = (def: CallDef): string => SKILL[def.skill]?.name || def.skill;
/** The ladder, by the points of the Call's skill. */
export const callRangeAt = (level: number): number => CALL_RULES.range_base + CALL_RULES.range_per_point * level;
export const callStepAt = (def: CallDef, level: number): number => def.steps.filter((s) => level >= s.at).length;
/** The price row at these points (calls.json rules.price: the last row whose `from` they reach; the first under it). */
export const callPriceAt = (level: number): CallPriceRow => [...CALL_RULES.price].reverse().find((r) => level >= r.from) || CALL_RULES.price[0];
/** The Call's AP at these points (the one price table). */
export const callBaseAp = (level: number): number => callPriceAt(level).ap;
/** How many times a turn each Call may be made at these points. */
export const callsPerTurn = (level: number): number => callPriceAt(level).per_turn;
/** The points from which the reaction may pay for a Call (the first price row that says so; never: Infinity). */
export const CALL_REACT_AT: number = CALL_RULES.price.find((r) => r.reaction)?.from ?? Infinity;
