// Calls (rules 1.13): the data. Nine Calls, one per gamma skill, and the shared ladder (data/calls.json `rules`).
import callsJ from '../../../../data/calls.json';
import { SKILL } from '../data';
import type { CallDef } from './types';

export interface CallRules {
  ap: number; cheap_at: number; cheap_ap: number; free_at: number; free_per_turn: number;
  range_base: number; range_per_point: number; steps_at: number[];
  reaction_at: number; reactions_per_round: number; reaction_ap: number;
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
export const callBaseAp = (level: number): number => (level >= CALL_RULES.cheap_at ? CALL_RULES.cheap_ap : CALL_RULES.ap);
