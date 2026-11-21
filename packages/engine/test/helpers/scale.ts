// Rules 1.95 (the scale, 0.34 step 1): the bible's factor and its rounding rules, read from the bible's export
// (tools/balance/check.py --export-scale writes test/golden/bible-scale.json from tools/balance/bible/scale.json).
// Ruling 68: a test of a number the factor moved computes its expectation as the old number x the factor through the
// bible's own rounding (scale.factor.rounding), never a new typed number.
import bible from '../golden/bible-scale.json';

/** The factor (scale.factor.value). */
export const F: number = bible.factor;
/** scale.factor.rounding.other: a whole number when the new value is 10 or more, else two places. */
export const scaled = (old: number): number => { const v = old * F; return v >= 10 ? Math.round(v) : Math.round(v * 100) / 100; };
/** scale.factor.rounding.amount_base: two places (the output formula floors at the end). */
export const scaledBase = (old: number): number => Math.round(old * F * 100) / 100;
