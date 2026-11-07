// Echo in one place (spec: Echo): every gain or spend goes through gainEcho, which keeps it within 0..3 and lets items
// change a gain ('echo_gain' {c, n, why}: mutable n; set ctx.cap to change the maximum, e.g. a trait that zeroes it).
import type { Character } from '../character';
import { emitStory, boundGame } from './hooks';

export const ECHO_MAX = 3;
/** Add (or with a negative n, spend) Echo. Returns the change actually made. */
export function gainEcho(c: Character, n: number, why: string, g: any = boundGame()): number {
  const ctx: any = { c, n, why, cap: ECHO_MAX };
  if (n > 0) emitStory(g, 'echo_gain', ctx);
  const was = c.echo || 0; c.echo = Math.max(0, Math.min(ctx.cap, was + Math.round(ctx.n)));
  return c.echo - was;
}
