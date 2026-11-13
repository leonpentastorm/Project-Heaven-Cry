// UNIT STATES AND CONDITION FLAGS: the only file that writes them (engine foundations 2, review finding F4).
//
// A condition is put on with applyCond and ended with endCond (magic.ts). A few are kept as fields of the unit rather
// than in u.conds, and a few statuses are not conditions at all but states with their own rule. This file holds the
// ONE place each of those fields is written, so that a rule about it (Prone ends Braced; coming back up clears the
// death saves) cannot be forgotten by a caller. test/lint-conditions.test.ts fails on a write anywhere else.
//
//   UNIT STATES (data/conditions.json `engine: "state"`, and Staggered and Nailed): call these from anywhere.
//     setBraced(u, on, guard?)   Braced. `guard: true`: the bearer set only themself (no weapon is set)
//     stagger(u, n)              Staggered: n AP off its next turn (a fumble, a weapon's on-hit). clearStagger(u)
//     setDowned(u, on)           Downed. Coming back up clears the death saves
//     setNailed(u, nail | null)  a weapon left in the unit holds it in place (Stop: Nail)
//
//   CONDITION FLAGS (`engine: "flag"`): RAW writes. Only applyCond / endCond / the turn clock call these; everything
//   else calls applyCond(cb, rng, by, target, 'bleeding' | 'dazed' | 'prone' | 'hidden') and endCond(target, id, cb).
//     rawBleed(u, rounds)  rawDazed(u, n)  rawProne(u, on, endBrace?)  rawHidden(cb, u, on)
import type { Combat, Unit } from './combat';

// ---------- unit states ----------
/** Braced: on (a Brace, a class move's stance) or off (it moved, was pushed, went Prone, changed weapon). */
export function setBraced(u: Unit, on: boolean, guard?: boolean): void {
  if (on) { u.braced = true; if (guard) u.guardBrace = true; else delete u.guardBrace; }
  else u.braced = false;
}
/** Put Braced back exactly as it was read (something changed it for a moment to ask a question; nothing is ended). */
export function bracedAs(u: Unit, was: boolean | undefined): void { if (was === undefined) delete u.braced; else u.braced = was; }
/** Staggered: this unit loses AP at its next turn (the turn's AP reads it and clears it). The larger of two stands. */
export function stagger(u: Unit, n = 1): void { u.stunnedNext = Math.max(u.stunnedNext || 0, n); }
/** Take a pending stagger off a unit. */
export function clearStagger(u: Unit): void { u.stunnedNext = 0; }
/** Downed on or off. Up again: the death saves start over. */
export function setDowned(u: Unit, on: boolean): void {
  if (on) u.downed = true;
  else { u.downed = false; u.saves = { ok: 0, fail: 0 }; }
}
/** A weapon left in the unit (it can't move or be moved until it is pulled free), or none. */
export function setNailed(u: Unit, nail: Unit['nailed'] | null): void { if (nail) u.nailed = nail; else delete u.nailed; }

/** A unit that comes into a fight already Hidden (it was Hidden in the story, or the Narrator placed it so): nobody is
 * asked. `entry: false`: it gets no ambush from it. */
export function startHidden(u: Unit, entry = true): void { u.hidden = true; if (entry) u.hideEntry = 1; }
/** Read something as if the unit were standing (a preview of "stand up, then …"); nothing is changed. */
export function asStanding<T>(u: Unit, f: () => T): T { const was = u.prone; u.prone = false; try { return f(); } finally { u.prone = was; } }

// ---------- condition flags: raw writes (applyCond, endCond and the turn clock only) ----------
/** Bleeding's rounds left (0: not bleeding). */
export function rawBleed(u: Unit, rounds: number): void { u.bleed = Math.max(0, rounds); }
/** Dazed: AP off the next turn (0: not Dazed). */
export function rawDazed(u: Unit, n: number): void { u.dazedNext = n; }
/** Prone on or off. Knocked Prone ends Braced; `endBrace: false` (the unit drops Prone by its own choice, rules 'Brace':
 * "while braced (or prone)") keeps a weapon set. */
export function rawProne(u: Unit, on: boolean, endBrace = true): void { u.prone = on; if (on && endBrace) u.braced = false; }
/** Hidden on or off, with its book-keeping: an entry gives one ambush (`entry: false`: the same entry, kept), and
 * each other side remembers where it last saw the unit until it is seen again. */
export function rawHidden(cb: Combat | null | undefined, u: Unit, on: boolean, o: { entry?: boolean } = {}): void {
  if (on) {
    if (o.entry !== false) u.hideEntry = (u.hideEntry || 0) + 1;
    u.hidden = true;
    if (cb) for (const side of ['pc', 'foe']) if (side !== u.side) ((cb.lastSeen ||= {})[side] ||= {})[u.id] = u.pos;
  } else {
    u.hidden = false;
    if (cb) for (const side of Object.keys(cb.lastSeen || {})) delete cb.lastSeen![side][u.id];
  }
}
