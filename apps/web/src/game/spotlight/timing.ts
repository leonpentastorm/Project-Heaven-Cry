// How long a spotlight cut-in lasts (docs/design/cutin-spec.md 6.1). Pure (tests).
/** The safety cap: the effects gate always opens by then, whatever happens (an overlay that failed, a hidden tab). */
export const CUTIN_MAX_MS = 1700;
/** The slowed action's tempo after a cut-in in a fight: 15% slower. */
export const CUTIN_TEMPO = 0.85;
/** A skip goes straight to the way out, this long. */
export const CUTIN_SKIP_MS = 150;
/** Clicks and keys skip only after this (the click that made the action never skips its own cut-in). */
export const CUTIN_ARM_MS = 150;
/** The total length: 1400 ms for one strip, +70 ms a strip after the first, +100 for a god, capped at 1600; reduced
 *  motion 1000. */
export function CUTIN_MS(n: number, god = false, rm = false): number {
  if (rm) return 1000;
  return Math.min(1600, 1400 + 70 * Math.max(0, Math.min(4, n) - 1) + (god ? 100 : 0));
}
/** When the strips hold until (the way out starts): the total less the 250 ms out and the blur's last 100. */
export const holdUntil = (n: number, god = false, rm = false) => (rm ? 800 : CUTIN_MS(n, god, rm) - 350);
