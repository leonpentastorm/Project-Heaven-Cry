// The vow pop-up (Leon, 16 Nov 2026, to-do section F): entering a game mode opens a pop-up that makes a Faithful
// character swear a vow (or fight unsworn: the lead's pick); in a fight the panel shows only the vow held; a rest is
// where it is changed. Atheists get no pop-up.
//
// The engine's rule is still the fight's own (faith.ts swearVow: a vow is sworn at the start of a fight, before you act,
// one a fight), so the choice made here is the player's STANDING vow: kept on this device per character and per run,
// and sworn for them through the real action (faith/vow) at the start of each fight (screens/faithCombat.js). Where the
// engine refuses it there (Mercy with no foe that can yield), the fight's own prompt shows as before. Carrying the vow
// on the character between fights is an engine change, listed for the lead (0.32 effects hand-off).
import { beliefOf, faithView, FAITH_MIN, type GameState } from '@engine';

export type StandingVow = { id: string; allyCharId?: string } | { unsworn: true };
const KEY = 'phc:vow:';
const mem = new Map<string, StandingVow>();
const store = (): Storage | null => { try { return typeof localStorage !== 'undefined' ? localStorage : null; } catch { return null; } };
/** The run (or room) a standing vow belongs to: a new run asks again. */
export const vowScope = (g: GameState | null | undefined): string => String((g as any)?.run?.seed || (g as any)?.run?.id || (g as any)?.code || '');
const keyOf = (g: GameState, charId: string) => KEY + vowScope(g) + ':' + charId;

export function standingVow(g: GameState, charId: string): StandingVow | null {
  const k = keyOf(g, charId); if (mem.has(k)) return mem.get(k)!;
  try { const s = store()?.getItem(k); if (s) { const v = JSON.parse(s); mem.set(k, v); return v; } } catch { /* */ }
  return null;
}
export function setStandingVow(g: GameState, charId: string, v: StandingVow) {
  const k = keyOf(g, charId); mem.set(k, v);
  try { store()?.setItem(k, JSON.stringify(v)); } catch { /* */ }
}
/** For the tests: forget every standing vow on this device. */
export function clearStandingVows() { mem.clear(); try { const s = store(); if (s) for (const k of Object.keys(s)) if (k.startsWith(KEY)) s.removeItem(k); } catch { /* */ } }

/** A character who swears vows: Faithful, with the Faith a prayer needs. */
export function swearsVows(g: GameState, charId: string): boolean {
  const c: any = g.characters[charId]; return !!c && beliefOf(c).kind === 'faithful' && (c.skills?.faith || 0) >= FAITH_MIN;
}
export interface VowPopupChar {
  charId: string; name: string; patron: string; current: StandingVow | null;
  vows: { id: string; name: string; words: string; needsAlly: boolean; brokenWhen: string; fulfilledWhen: string }[];
  allies: { charId: string; name: string }[];
}
/** The viewer's characters the pop-up asks (only the Faithful). due: those with no standing choice yet in this run. */
export function vowPopupView(g: GameState | null | undefined, me: string): { chars: VowPopupChar[]; due: boolean } {
  const chars: VowPopupChar[] = [];
  if (!g) return { chars, due: false };
  for (const c of Object.values(g.characters || {}) as any[]) {
    if (!c || c.owner !== me || !swearsVows(g, c.id)) continue;
    const v = faithView(g, c.id); if (!v) continue;
    chars.push({ charId: c.id, name: c.name, patron: v.patron ? v.patron.name : 'your patron', current: standingVow(g, c.id),
      vows: v.vows.map((x) => ({ id: x.id, name: x.name, words: x.words, needsAlly: x.needsAlly, brokenWhen: x.brokenWhen, fulfilledWhen: x.fulfilledWhen })),
      allies: (Object.values(g.characters) as any[]).filter((o) => o && o.id !== c.id).map((o) => ({ charId: o.id, name: o.name })) });
  }
  return { chars, due: chars.some((c) => !c.current) };
}
/** The standing vow in words (the pop-up's current line, the rest's button). */
export function vowWords(c: VowPopupChar): string {
  const s = c.current; if (!s) return 'No vow chosen';
  if ('unsworn' in s) return 'Fighting unsworn';
  const v = c.vows.find((x) => x.id === s.id); if (!v) return 'No vow chosen';
  const al = s.allyCharId ? c.allies.find((a) => a.charId === s.allyCharId)?.name : null;
  return 'Vow: ' + v.name + (al ? ' (' + al + ')' : '');
}
/** What the fight sends for a character at its start: the faith/vow action of its standing vow (an ally named by its
 *  unit in this fight), or null (unsworn, none chosen, the ally not here). Pure (tests). */
export function vowActionFor(g: GameState, cb: any, unit: any): { type: 'faith/vow'; unitId: string; id: string; allyId?: string } | null {
  if (!unit?.charId) return null;
  const s = standingVow(g, unit.charId); if (!s || 'unsworn' in s) return null;
  if (s.allyCharId) {
    const al = (cb?.units || []).find((x: any) => x.charId === s.allyCharId && !x.dead); if (!al) return null;
    return { type: 'faith/vow', unitId: unit.id, id: s.id, allyId: al.id };
  }
  return { type: 'faith/vow', unitId: unit.id, id: s.id };
}
