// Taps on the effects stream (rules 1.8): engine systems that watch fx events as they are emitted (feelings.ts: a Miracle
// seen, a trap sprung). Kept in its own module with no imports so any file can register at load without an import cycle.
/** A tap is given the fight and the event just emitted; it must not re-emit that event. */
export const fxTaps: ((cb: any, ev: { n: number; k: string; [x: string]: any }) => void)[] = [];
