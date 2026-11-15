// The amount control's arithmetic (rules 1.55 item 54): one typed number kept inside what you hold, the steps that
// can apply, and the words. Pure, so the one control (AmountField.tsx) and its tests share it. It decides no rule: the
// engine judges the amount that is sent (give.ts giveProblem, run/shop.ts sellProblem) and its refusal is shown.

/** The step buttons, in order (−100 … +100). */
export const STEPS = [-100, -10, -1, 1, 10, 100] as const;

/** Keep `n` a whole number between `min` and `max` (a non-number is `min`). */
export function clampAmount(n: number, max: number, min = 0): number {
  const hi = Math.max(min, Math.floor(Number(max) || 0));
  if (!Number.isFinite(n)) return n === Infinity ? hi : min;
  return Math.max(min, Math.min(hi, Math.floor(n)));
}

/** What a typed text means: a whole number kept between `min` and `max`, '' for an emptied field (the field shows it
 * empty, the amount is `min`), or null when it is not a number (the keystroke is ignored). Grouping commas, spaces and
 * a leading plus are read; a minus, a point, letters or an exponent are not a number here. */
export function parseAmount(text: string, max: number, min = 0): number | '' | null {
  const t = String(text).replace(/[,\s_]/g, '').replace(/^\+/, '');
  if (t === '') return '';
  if (!/^\d+$/.test(t)) return null;
  return clampAmount(Number(t), max, min);
}

/** Can step `k` apply in full from `value` (the result stays between `min` and `max`)? A step that cannot is greyed. */
export const stepOk = (value: number, k: number, max: number, min = 0): boolean => value + k >= min && value + k <= Math.floor(max);
/** The value after step `k`, kept inside the range. */
export const stepTo = (value: number, k: number, max: number, min = 0): number => clampAmount(value + k, max, min);
/** A step's words: "+10", "−100" (a true minus sign). */
export const stepLabel = (k: number): string => (k > 0 ? '+' + k : '−' + Math.abs(k));
/** "of 1,240": the total held, grouped. */
export const ofHeld = (max: number): string => 'of ' + Math.max(0, Math.floor(max)).toLocaleString('en');

/** A key in the field: arrows ±1 (with Shift ±10), Page Up and Down ±100, Home the least, End the most; null for any other key. */
export function keyStep(key: string, shift: boolean, value: number, max: number, min = 0): number | null {
  if (key === 'ArrowUp') return stepTo(value, shift ? 10 : 1, max, min);
  if (key === 'ArrowDown') return stepTo(value, shift ? -10 : -1, max, min);
  if (key === 'PageUp') return stepTo(value, 100, max, min);
  if (key === 'PageDown') return stepTo(value, -100, max, min);
  if (key === 'Home') return clampAmount(min, max, min);
  if (key === 'End') return clampAmount(max, max, min);
  return null;
}
