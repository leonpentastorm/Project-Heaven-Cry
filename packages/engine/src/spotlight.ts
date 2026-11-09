// Spotlight cut-ins (docs/design/cutin-spec.md, decision 110): a presentation event, never a rule. The music's
// spotlight moments (a natural 20 on a Hard or Heroic check, an elite or boss taken down, a revive, an Ultimate, a
// legendary deed), Play my song when it starts, and a patron breaking in (an intervention, or the god interjection
// system) each put one `spotlight` event on the fx stream. Every client plays it from the shared state: a torn eye
// strip over a blurred screen and, in a fight, the action it happened in played back 15% slower.
//
// It never touches g.rng, never changes a number and never fails: the same input gives the same event on the host and
// in a test. How often a player sees it (All / Once per scene / Off) is that player's own setting, in the browser.
import type { GameState } from './game';
import type { Combat } from './combat';
import { emitFx, FX_CAP, type FxEvent } from './combat';
import { musicOf } from './music';

export const SPOTLIGHT_FX = 'spotlight';
export type SpotlightKind = 'crit' | 'takedown' | 'revive' | 'ultimate' | 'legend' | 'song' | 'god';
export const SPOTLIGHT_KINDS: readonly SpotlightKind[] = ['crit', 'takedown', 'revive', 'ultimate', 'legend', 'song', 'god'];
/** Which kind leads when several moments share one action (the client merges them into one cut-in). */
export const SPOTLIGHT_PRIORITY: readonly SpotlightKind[] = ['god', 'takedown', 'revive', 'legend', 'ultimate', 'crit', 'song'];

export interface SpotlightFx extends FxEvent {
  k: 'spotlight';
  kind: SpotlightKind;
  /** The character the moment belongs to (the actor; for 'god', the one the patron acts for; null: the patron alone). */
  char: string | null;
  /** Their unit, in a fight. */
  unit?: string | null;
  /** The engine's words, as the music log has them ("took down Warden", "a critical success on a Heroic check"). */
  reason: string;
  /** A unit id: the boss taken down, the ally revived, the ally a god saved. */
  target?: string | null;
  /** The target's name as the squad saw it ("an unseen hostile" if it was never seen). */
  targetName?: string | null;
  /** The revived or saved ally's character id (their own strip). */
  targetChar?: string | null;
  /** 'god': the patron id (data/patrons.json). */
  patron?: string | null;
  /** 'crit': the check's TN and skill id. */
  tn?: number; skill?: string;
  /** 'crit': it came with an Echo reroll (the dice dialog is still showing the new verdict: the client waits for it). */
  echo?: boolean;
  /** 'ultimate' / 'legend': the perk id (the caption never names an Ultimate). */
  perk?: string;
  /** Spoken words (a patron's line, a deed), shown in quotes. */
  line?: string;
  /** More character ids in the moment (a group trigger); 4 strips at most are shown. */
  group?: string[];
  /** In a fight: n of the first fx event of the action this happened in (the client slows that action's playback). */
  from?: number;
  /** The scene or fight it happened in ('fight<k>' / 'scene<n>'), for the "Once per scene" setting. */
  scene: string;
  /** Whether the character's song started with it (tests read it; the client doesn't need it). */
  song: boolean;
}
export type SpotlightInput = Omit<SpotlightFx, 'n' | 'k' | 'scene' | 'from' | 'song'> & { song?: boolean };

/** The scene or fight key (the music's own: a spotlight song is once per scene or fight). */
export const spotlightScene = (g: GameState) => (g.phase === 'combat' && g.combat ? 'fight' + musicOf(g).fight : 'scene' + (g.story?.scene?.n ?? 0));

/** The fight's current action starts here: every fx event from n on belongs to it (until the next mark). Set by the
 *  reducer before each player action and each enemy turn. */
export function markAction(cb: Combat) { cb.actFrom = (cb.fxSeq || 0) + 1; }
export function clearAction(cb: Combat) { delete cb.actFrom; }

/**
 * Emit a spotlight moment. In a fight (g.phase 'combat') it goes on the fight's fx stream with `from` filled from the
 * action being resolved; out of a fight on the story's. Returns the event. Never throws on odd input: a 'god' without
 * a patron, or a moment with neither a character nor a patron, emits nothing (returns null).
 *
 * The god interjection trigger (docs/design/cutin-spec.md section 4.1): call it from the reducer, on the host:
 *   spotlight(g, { kind: 'god', patron: 'toll_keeper', char: c.id, reason: 'interjects', line: 'Not yet.' })
 */
export function spotlight(g: GameState, s: SpotlightInput): SpotlightFx | null {
  if (!g || !s || !(SPOTLIGHT_KINDS as readonly string[]).includes(s.kind)) return null;
  if (s.kind === 'god' && !s.patron) return null;
  if (!s.char && !s.patron) return null;
  const data: Record<string, any> = { kind: s.kind, char: s.char ?? null, reason: String(s.reason || ''), scene: spotlightScene(g), song: !!s.song };
  for (const f of ['unit', 'target', 'targetName', 'targetChar', 'patron', 'tn', 'skill', 'perk', 'line', 'echo'] as const) if (s[f] != null && s[f] !== '') data[f] = s[f];
  if (Array.isArray(s.group) && s.group.length) data.group = s.group.filter((x) => typeof x === 'string').slice(0, 8);
  const cb = g.phase === 'combat' ? g.combat : null;
  if (cb) {
    if (cb.actFrom) data.from = cb.actFrom;
    return emitFx(cb, SPOTLIGHT_FX, data) as SpotlightFx;
  }
  const st: any = g.story; if (!st) return null;
  const ev = { n: (st.fxSeq = (st.fxSeq || 0) + 1), k: SPOTLIGHT_FX, ...data } as SpotlightFx;
  (st.fx ||= []).push(ev);
  if (st.fx.length > FX_CAP) st.fx.splice(0, st.fx.length - FX_CAP);
  return ev;
}
