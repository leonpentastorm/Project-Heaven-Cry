// The lobby's mode picker (rules 1.39; docs/design/survival-spec.md section 8.1, Leon's sketch): three large cards,
// SURVIVAL, ROGUELIKE, CAMPAIGN, from data/modes.json through the engine (MODES). The host picks an open one with the
// `settings` action ({play}); the engine refuses a locked one in its data's words, and the card says the same before
// anyone clicks. A guest sees the host's pick live (the room's state, relayed as every lobby setting is).
//
// THE TEST HOOK. The browser suites that play a story (most of them) run in a Campaign room although Campaign is locked:
// a page with localStorage `phc.testPlay` = "campaign", or with campaigns listed for it (`phc.showCampaigns`, the hook
// of game/starts.ts), shows the Campaign card open and opens a NEW room on Campaign (store.ts hostRoom). The engine is
// not told: it only ever refuses a pick, and a room's own mode is never a pick (an old save keeps its campaign too).
import { MODES, DEFAULT_PLAY, playOf, type GameState, type ModeDef, type PlayMode } from '@engine';

const read = (k: string): string | null => { try { return typeof localStorage === 'undefined' ? null : localStorage.getItem(k); } catch { return null; } };
/** The mode a browser suite's page opens new rooms on (the test hook above), or null on a player's page. */
export function testPlay(): PlayMode | null {
  const v = read('phc.testPlay'); if (v === 'campaign' || v === 'roguelike') return v;
  try { const l = JSON.parse(read('phc.showCampaigns') || '[]'); if (Array.isArray(l) && l.length) return 'campaign'; } catch { /* not a list */ }
  return null;
}
/** A browser suite's TEST ROOM (localStorage `phc.testRoom` = "1"; rules 1.41): a new room is opened with
 * `settings.test`, the only thing that lets the engine take `run/skip` (a fight won at once, to reach the Boss). */
export const testRoom = (): boolean => read('phc.testRoom') === '1';
/** A browser suite's fixed run seed (localStorage `phc.testSeed`): Start sends it with run/start. Null on a player's page. */
export const testSeed = (): string | null => read('phc.testSeed') || null;
/** The mode a new room opens on: the data's default, or the test hook's. */
export const newRoomPlay = (): PlayMode => testPlay() || DEFAULT_PLAY;

/** One card of the picker, everything the template draws (no number, no rule: the words are the data's). */
export interface ModeCard {
  key: PlayMode; name: string; line: string;
  /** The painting's asset id ('' until it lands: the card draws a plain panel with the AHOC seal). */
  art: string;
  selected: boolean; locked: boolean;
  /** "true" / "false" for aria-checked. */
  checked: string;
  /** The word under the name: "Coming" on a locked card, "Selected" on the room's mode, else ''. */
  status: string;
  /** What the one hover card says (the lock's reason, or why a guest can't pick); '' when nothing needs saying. */
  tip: string;
  /** Read by assistive tech: the name, and "locked, coming" on a locked card. */
  aria: string;
  /** Clicking it sends the pick (null: it can't be picked by this player now, and the card says why). */
  pick: (() => void) | null;
}
/** Is this mode open on this page (its data's `available`, or the test hook's)? */
export const isOpen = (m: ModeDef): boolean => m.available || testPlay() === m.id;
/** The three cards for a room, as this player sees them. `send` dispatches the settings action (the host's only). */
export function modeCards(g: GameState, isHost: boolean, send: (play: PlayMode) => void): ModeCard[] {
  const play = playOf(g), lobby = g.phase === 'lobby';
  return MODES.map((m) => {
    const selected = m.id === play, locked = !isOpen(m);
    const why = locked ? m.coming || 'Not open yet.' : !isHost ? 'Only the host picks the mode.' : !lobby ? 'The mode is picked in the lobby.' : '';
    return {
      key: m.id, name: m.name.toUpperCase(), line: m.line, art: m.art_pending ? '' : m.art || '',
      selected, locked, checked: selected ? 'true' : 'false',
      status: selected ? (locked ? 'Selected · Coming' : 'Selected') : locked ? 'Coming' : '',
      tip: why, aria: m.name + (locked ? ', locked, coming' : ''),
      pick: !why && !selected ? () => send(m.id) : null,
    };
  });
}
/** Arrow keys move between the cards (a radio group); Space or Enter picks. Returns the index to focus, or null. */
export function radioKey(key: string, i: number, n: number): number | null {
  if (key === 'ArrowRight' || key === 'ArrowDown') return (i + 1) % n;
  if (key === 'ArrowLeft' || key === 'ArrowUp') return (i + n - 1) % n;
  if (key === 'Home') return 0;
  if (key === 'End') return n - 1;
  return null;
}
/** Does this room's mode want a Narrator (Campaign), or is one optional flavour (Survival: the panel starts collapsed)? */
export const narratorOptional = (g: GameState): boolean => (MODES.find((m) => m.id === playOf(g))?.narrator ?? 'required') === 'optional';
/** Does Start begin a run (run/start) rather than a story (session/start)? */
export const startsRun = (g: GameState): boolean => MODES.find((m) => m.id === playOf(g))?.start === 'run';
