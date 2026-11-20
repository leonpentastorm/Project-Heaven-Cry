// The vow pop-up (Leon, 16 Nov 2026, to-do section F): entering a game mode opens a pop-up that makes a Faithful
// character swear a vow (or fight unsworn: the lead's pick); in a fight the panel shows only the vow held; a rest is
// where it is changed. Atheists get no pop-up.
//
// Rules 1.72 item 5705: the choice is the character's STANDING vow, carried by the engine (Character.vowStanding): set
// through the real action (faith/vow out of a fight) and sworn for the character as each fight starts (faith.ts). The
// engine also says where it may be chosen or changed (faithView vowChange: the first choice anywhere, a change at a
// rest). This file only words the engine's view for the pop-up; nothing is kept on the device.
import { beliefOf, faithView, FAITH_MIN, type GameState } from '@engine';

export type StandingVow = { id: string; allyCharId?: string } | { unsworn: true };

/** A character who swears vows: Faithful, with the Faith a prayer needs. */
export function swearsVows(g: GameState, charId: string): boolean {
  const c: any = g.characters[charId]; return !!c && beliefOf(c).kind === 'faithful' && (c.skills?.faith || 0) >= FAITH_MIN;
}
/** The engine's standing vow in the pop-up's words (null: no choice yet). */
function standingOf(s: { id: string | null; allyCharId?: string } | null | undefined): StandingVow | null {
  if (!s) return null;
  return s.id ? { id: s.id, ...(s.allyCharId ? { allyCharId: s.allyCharId } : {}) } : { unsworn: true };
}
export interface VowPopupChar {
  charId: string; name: string; patron: string; current: StandingVow | null;
  /** May the vow be chosen or changed here and now (the engine's word: faithView vowChange)? */
  canChange: boolean;
  vows: { id: string; name: string; words: string; needsAlly: boolean; brokenWhen: string; fulfilledWhen: string }[];
  allies: { charId: string; name: string }[];
}
/** The viewer's characters the pop-up asks (only the Faithful). due: those with no standing choice yet. */
export function vowPopupView(g: GameState | null | undefined, me: string): { chars: VowPopupChar[]; due: boolean } {
  const chars: VowPopupChar[] = [];
  if (!g) return { chars, due: false };
  for (const c of Object.values(g.characters || {}) as any[]) {
    if (!c || c.owner !== me || !swearsVows(g, c.id)) continue;
    const v = faithView(g, c.id); if (!v) continue;
    chars.push({ charId: c.id, name: c.name, patron: v.patron ? v.patron.name : 'your patron', current: standingOf(v.standing), canChange: v.vowChange,
      vows: v.vows.map((x) => ({ id: x.id, name: x.name, words: x.words, needsAlly: x.needsAlly, brokenWhen: x.brokenWhen, fulfilledWhen: x.fulfilledWhen })),
      allies: (Object.values(g.characters) as any[]).filter((o) => o && o.id !== c.id && !o.dead).map((o) => ({ charId: o.id, name: o.name })) });
  }
  return { chars, due: chars.some((c) => !c.current) };
}
/** The action that sets a standing vow (faith/vow out of a fight: unitId the character; id '' to fight unsworn). */
export function standingVowAction(charId: string, v: StandingVow): { type: 'faith/vow'; unitId: string; id: string; allyId?: string } {
  return 'unsworn' in v ? { type: 'faith/vow', unitId: charId, id: '' } : { type: 'faith/vow', unitId: charId, id: v.id, ...(v.allyCharId ? { allyId: v.allyCharId } : {}) };
}
/** The standing vow in words (the pop-up's current line, the rest's button). */
export function vowWords(c: VowPopupChar): string {
  const s = c.current; if (!s) return 'No vow chosen';
  if ('unsworn' in s) return 'Fighting unsworn';
  const v = c.vows.find((x) => x.id === s.id); if (!v) return 'No vow chosen';
  const al = s.allyCharId ? c.allies.find((a) => a.charId === s.allyCharId)?.name : null;
  return 'Vow: ' + v.name + (al ? ' (' + al + ')' : '');
}
/** The run (or room) the pop-up opens by itself once for. */
export const vowScope = (g: GameState | null | undefined): string => String((g as any)?.run?.seed || (g as any)?.run?.id || (g as any)?.code || '');
