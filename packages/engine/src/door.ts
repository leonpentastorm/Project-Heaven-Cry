// THE DOOR LADDER AND THE CASH-OUT SUM (rules 1.96 items 8324 and 8326; docs/design/growth/08-primitives.md S2 and S3).
//
//   doorLadderOf(skill)          the alpha skill's door ladder (data/skills.json door_ladder), or null
//   doorOfResource(res)          the ladder whose door's counter is this resource (momentum, guard, pressure...), or null
//   reachAt(skills, ladder)      the Reach held at these skill points: the highest row whose points are met AND whose
//                                needs (the family gates of ruling 13) are met; 0 below the first row
//   biteOf(ladder)               the door's one Bite (ruling 63: one row carries it, held at every point)
//   cashSum(n, step)             S(n) = (g^n - 1) / (g - 1), n when g is 1 (the law's sum; scale.cash_out.sum_formula)
//   cashFactor(skills, res, n)   the cash-out factor of n units: 1 + Bite x S(n) at the door's own step
//
// Pure data readers: no unit, no fight. Every number is the data's (skills.json door_ladder, rules.json
// output.cash_out). A door's systems read these where they set a counter's top and pay a cash-out; the number sources
// cash:<res> and cash_share:<res> (effects/triggers.ts) read cashSum of the units the action spent.
import { SKILLS, RULES } from './data';

/** One row of a door ladder: from these points, this Reach (and the door's Bite on the row that carries it), held only
 *  when every need (skill: points) is met. */
export interface DoorRow { points: number; reach?: number; bite?: number; needs?: Record<string, number> }
export interface DoorLadder { skill: string; door: string; resource: string; cash_step: number; rows: DoorRow[] }

const CASH: any = (RULES as any).output?.cash_out;
if (!CASH || typeof CASH.step !== 'number' || CASH.step < 1) throw new Error('data/rules.json output.cash_out.step needs a number of at least 1');
/** The law's step (rules.json output.cash_out.step): the step of a cash-out no door owns. */
export const CASH_STEP: number = CASH.step;

const LADDERS: DoorLadder[] = (SKILLS as any[]).filter((s) => s.door_ladder).map((s) => {
  const d = s.door_ladder;
  if (typeof d.door !== 'string' || typeof d.resource !== 'string' || !(typeof d.cash_step === 'number' && d.cash_step >= 1) || !Array.isArray(d.rows) || !d.rows.length) throw new Error('data/skills.json ' + s.id + ' door_ladder needs door, resource, cash_step (at least 1) and rows');
  if (d.rows.filter((r: any) => typeof r.bite === 'number').length !== 1) throw new Error('data/skills.json ' + s.id + ' door_ladder: one row carries the Bite (ruling 63)');
  return { skill: s.id, door: d.door, resource: d.resource, cash_step: d.cash_step, rows: [...d.rows].sort((a: any, b: any) => a.points - b.points) };
});
const BY_SKILL: Record<string, DoorLadder> = Object.fromEntries(LADDERS.map((l) => [l.skill, l]));
const BY_RES: Record<string, DoorLadder> = Object.fromEntries(LADDERS.map((l) => [l.resource, l]));
const BY_DOOR: Record<string, DoorLadder> = Object.fromEntries(LADDERS.map((l) => [l.door, l]));

/** Every door ladder, in the data's order. */
export const DOOR_LADDERS: readonly DoorLadder[] = LADDERS;
export const doorLadderOf = (skill: string): DoorLadder | null => BY_SKILL[skill] || null;
export const doorOfResource = (res: string): DoorLadder | null => BY_RES[res] || null;
export const doorById = (door: string): DoorLadder | null => BY_DOOR[door] || null;

/** The Reach held at these skill points (ruling 13: a step whose needs are not met is not held; the step below stands). */
export function reachAt(skills: Record<string, number> | null | undefined, l: DoorLadder): number {
  const pts = (id: string) => Number(skills?.[id] || 0);
  let reach = 0;
  for (const r of l.rows) {
    if (pts(l.skill) < r.points || typeof r.reach !== 'number') continue;
    if (Object.entries(r.needs || {}).some(([id, n]) => pts(id) < n)) continue;
    reach = r.reach;
  }
  return reach;
}
/** The door's one Bite (ruling 63), held from the row that carries it. 0 below that row's points. */
export function biteAt(skills: Record<string, number> | null | undefined, l: DoorLadder): number {
  const r = l.rows.find((x) => typeof x.bite === 'number')!;
  return Number(skills?.[l.skill] || 0) >= r.points ? r.bite! : 0;
}
/** S(n): the sum of n units each worth `step` times the one before (n when the step is 1). */
export const cashSum = (n: number, step: number): number => (n <= 0 ? 0 : step === 1 ? n : (step ** n - 1) / (step - 1));
/** S(n) for the door whose counter is this resource (its own step; the law's for a resource no door owns). */
export const cashSumOf = (res: string, n: number): number => cashSum(n, doorOfResource(res)?.cash_step ?? CASH_STEP);
/** The cash-out factor of n units of this resource for these skill points: 1 + Bite x S(n). */
export const cashFactor = (skills: Record<string, number> | null | undefined, res: string, n: number): number => {
  const l = doorOfResource(res); return l ? 1 + biteAt(skills, l) * cashSum(n, l.cash_step) : 1;
};
