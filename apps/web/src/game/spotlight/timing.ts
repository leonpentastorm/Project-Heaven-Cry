// How long a spotlight cut-in lasts (docs/design/cutin-spec.md 6.1). Pure (tests).
/** The safety cap: the effects gate always opens by then, whatever happens (an overlay that failed, a hidden tab). At
 *  Fast; in a fight it is × the combat speed's multiplier (game/combatSpeed.ts), like every length here. Per cut-in:
 *  cutInCap (1700 as before, 2400 for a crit's short one, which holds its words CRIT_READ_MS); this is the largest. */
export const CUTIN_MAX_MS = 2400;
/** The slowed action's tempo after a cut-in in a fight: 15% slower. */
export const CUTIN_TEMPO = 0.85;
/** A skip goes straight to the way out, this long. */
export const CUTIN_SKIP_MS = 150;
/** Clicks and keys skip only after this (the click that made the action never skips its own cut-in). */
export const CUTIN_ARM_MS = 150;
/** A crit's words (label, name, caption) are fully on screen this long before the way out starts, at Fast (Leon, 9 Nov
 *  2026: "the cut in popup for crit barely shows long enough for me to even read the text"; it was 260 ms). 1.6 s reads
 *  the label, the name and a short caption ("Critical hit on Rook") at an ordinary pace; at Normal it is ≈ 1.88 s. A
 *  click or a key still skips it. Provisional: Leon to confirm after a playtest. */
export const CRIT_READ_MS = 1600;
/** When a crit's words are fully in (ms from its start): their fade-in ends (CutInLayer: .14 s delay + .2 s), or with
 *  reduced motion the strip's 120 ms fade. */
export const CRIT_TEXT_IN = (rm = false) => (rm ? 120 : 340);
/** The total length (at Fast): 1400 ms for one strip, +70 ms a strip after the first, +100 for a god, capped at 1600;
 *  reduced motion 1000. short (a crit in a fight, decision 113: one strip): its words held CRIT_READ_MS, then a 200 ms
 *  way out and the blur's last 100 (2240 ms; reduced motion 2020). */
export function CUTIN_MS(n: number, god = false, rm = false, short = false): number {
  if (short) return CRIT_TEXT_IN(rm) + CRIT_READ_MS + 300;
  if (rm) return 1000;
  return Math.min(1600, 1400 + 70 * Math.max(0, Math.min(4, n) - 1) + (god ? 100 : 0));
}
/** When the strips hold until (the way out starts): the total less the 250 ms out and the blur's last 100 (a short one:
 *  its words' fade-in and the reading time). At Fast. */
export const holdUntil = (n: number, god = false, rm = false, short = false) => (short ? CRIT_TEXT_IN(rm) + CRIT_READ_MS : rm ? 800 : CUTIN_MS(n, god, rm) - 350);
/** The safety cap for one cut-in (at Fast): 1700 ms as it always was, or for a crit's short one (which holds its words
 *  to be read) its own length + 160 (2400 ms). A stall at Fast is no longer than before for every other cut-in. */
export const cutInCap = (short = false) => (short ? CUTIN_MS(1, false, false, true) + 160 : 1700);
