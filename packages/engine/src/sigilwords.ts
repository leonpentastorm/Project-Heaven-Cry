// Sigil words and grammar, rules revision 1.4 (spec: Mana, Sigils 1-2; data/sigils.json). Pure: data only, so the
// character sheet, the validator side and the resolver all share it without import cycles.
import sigilsJ from '../../../data/sigils.json';
import { SIGIL, type SigilDef } from './data';

export type SigilFam = 'body' | 'brain' | 'heart';
export type Dir = [number, number];
export const G: any = (sigilsJ as any).grammar || {};
export const ENEMY_AI: any = (sigilsJ as any).enemy_ai || {};
export const SIGIL_GRAMMAR = G;
export const SIGIL_ELEMENTS: Record<string, { rider: string; look: string; sound: string; motion: string }> = (sigilsJ as any).elements || {};
/** The save revision stamped on 1.4 glyphs and fights (old 1.2 glyphs have none and are dropped on load: item 441). */
export const SIGIL_REV = 14;
export const MAX_GLYPHS: number = G.max_glyphs ?? 4;
export const MIN_GLYPHS: number = G.min_glyphs ?? 2;
export const REPEAT_MULT: number = G.repeats?.mult_per_repeated_glyph ?? 0.9;
export const LIM = { traps: G.limits?.traps_per_caster ?? 2, turrets: G.limits?.turrets_per_caster ?? 1 };
/** Old constants (rules 1.2), kept only so class handlers that still read them compile. TODO(sigil-1.4): the class and
 * perk lanes move to spellRange / planEvoke and these go. */
export const LINE_RANGE: Record<number, number> = { 2: 4, 3: 8, 4: 12 };
export const PUSH_RANGE = 8;

// ---------- words ----------
export const W = (id: string): SigilDef | undefined => SIGIL[id];
export const groupOf = (w: string): string => W(w)?.group || '';
export const classOf = (w: string): string => W(w)?.class || '';
export const isSubject = (w: string) => groupOf(w) === 'subject';
export const isReach = (w: string) => groupOf(w) === 'reach';
export const isElement = (w: string) => classOf(w) === 'subject_element';
export const isAffliction = (w: string) => classOf(w) === 'subject_affliction';
export const isBoonWord = (w: string) => classOf(w) === 'subject_boon';
export const isWorking = (w: string) => classOf(w) === 'subject_working';
export const count = (words: string[]) => { const c: Record<string, number> = {}; for (const w of words) c[w] = (c[w] || 0) + 1; return c; };
/** A word's number after n copies: the base plus per_copy for each copy past the first. */
export const perCopy = (w: string, field: string, n: number, base?: number) => { const d = W(w) as any; const b = base ?? d?.[field] ?? 0; return n <= 0 ? 0 : b + (d?.per_copy?.[field] || 0) * (n - 1); };

/** A spell compiled from its words: every number the resolver needs (sigils.json; spec: Mana, Sigils 1–2). */
export interface Spell {
  words: string[]; counts: Record<string, number>; subjects: string[]; uniqueSubjects: string[];
  reach: string | null; missile: 'touch' | 'bolt' | 'lob' | 'appear' | 'relay'; range: number; reachMult: number; relayHops: number; blocked: boolean; needsSight: boolean;
  missiles: number; pull: number; chain: number; chainRadius: number; chainMult: number; leech: number;
  stay: boolean; wait: boolean; watch: boolean; fieldRounds: number; trapRounds: number; triggers: number; turretRounds: number; turretHp: number; turretDef: number; placedMult: number;
  condense: number; spread: number; push: number; coreMult: number; radius: number; radiusMult: number; coneLen: number; coneMult: number; burst: boolean;
  kin: boolean; repeats: number; repMult: number;
  damaging: boolean; harmful: boolean; element: string | null; workings: string[];
}
export function compileSpell(words: string[]): Spell {
  const c = count(words), subjects = words.filter(isSubject), reach = words.find(isReach) || null, rn = reach ? c[reach] : 0;
  const R: any = reach ? W(reach) : null, missile = (R?.missile || 'touch') as Spell['missile'];
  const repeats = Object.values(c).reduce((t, n) => t + Math.max(0, n - 1), 0);
  const cond = c.condense || 0, spr = c.spread || 0, psh = c.push || 0;
  const stayW: any = W('stay') || {}, waitW: any = W('wait') || {}, watchW: any = W('watch') || {}, chainW: any = W('chain') || {};
  return {
    words: [...words], counts: c, subjects, uniqueSubjects: [...new Set(subjects)],
    reach, missile, range: reach ? (missile === 'relay' ? R.range || 8 : perCopy(reach, 'range', rn)) : 1, reachMult: R?.mult ?? 1, relayHops: missile === 'relay' ? 1 + ((R.per_copy?.allies || 1) * (rn - 1)) : 0,
    blocked: !!R?.blocked, needsSight: !!R?.needs_sight,
    missiles: c.twice ? perCopy('twice', 'missiles', c.twice) : 1, pull: perCopy('pull', 'pull_tiles', c.pull || 0), chain: perCopy('chain', 'jumps', c.chain || 0),
    chainRadius: chainW.jump_radius ?? 3, chainMult: chainW.jump_mult ?? 0.75, leech: perCopy('leech', 'leech', c.leech || 0),
    stay: !!c.stay, wait: !!c.wait, watch: !!c.watch,
    fieldRounds: c.stay ? (stayW.lasts_rounds ?? 2) + (stayW.per_copy?.rounds || 0) * (c.stay - 1) : 0,
    trapRounds: waitW.lasts_rounds ?? 3, triggers: c.wait ? perCopy('wait', 'triggers', c.wait) : 0,
    turretRounds: c.watch ? (watchW.lasts_rounds ?? 2) + (watchW.per_copy?.rounds || 0) * (c.watch - 1) : 0, turretHp: watchW.hp ?? 10, turretDef: watchW.defense ?? 10,
    placedMult: c.watch ? watchW.mult ?? 0.5 : c.stay ? stayW.mult ?? 0.5 : 1,
    condense: cond, spread: spr, push: psh, coreMult: cond ? perCopy('condense', 'mult', cond) : 1,
    radius: spr ? perCopy('spread', 'radius', spr) : 0, radiusMult: spr ? Math.round(perCopy('spread', 'mult', spr) * 100) / 100 : 1,
    coneLen: psh ? perCopy('push', 'cone_length', psh) : 0, coneMult: psh ? Math.round(perCopy('push', 'mult', psh) * 100) / 100 : 1, burst: !!(cond || spr || psh),
    kin: !!c.kin, repeats, repMult: Math.pow(REPEAT_MULT, repeats),
    damaging: subjects.some(isElement), harmful: subjects.some((w) => isElement(w) || isAffliction(w)), element: subjects.find(isElement) || null,
    workings: [...new Set(subjects.filter(isWorking))],
  };
}
/** Why these words make no spell (spec: Grammar and cost), or null. maxWords is the Evoker's Max Sigil words. */
export function grammarError(words: string[], maxWords: number = MAX_GLYPHS): string | null {
  if (words.some((w) => !W(w))) return 'Unknown word: ' + words.find((w) => !W(w)) + '.';
  if (words.length > MAX_GLYPHS) return 'A spell holds at most ' + MAX_GLYPHS + ' glyphs.';
  if (words.length > maxWords) return 'Too many words for you: ' + words.length + ' of at most ' + maxWords + ' (Max Sigil words).';
  const c = count(words), reaches = Object.keys(c).filter(isReach);
  if (reaches.length > 1) return 'A second Reach word is refused: one Reach word per spell.';
  if ((c.kin || 0) > 1) return 'KIN takes one copy.';
  if (c.watch && c.stay) return 'WATCH and STAY are refused together: a turret already lasts.';
  if (!words.some(isSubject)) return 'Needs a Subject: an element or an effect.';
  if (!words.some((w) => !isSubject(w))) return 'Needs another word: a Reach, Delivery, Burst or Filter word.';
  return null;
}
/** The words a 2-word starting set may be (spec: The Magic panel): a valid spell with one Reach word. */
export function startingWordsError(words: string[]): string | null {
  if (words.length !== (G.starting?.words ?? 2) || new Set(words).size !== words.length) return 'Pick exactly 2 different Sigil words.';
  if (words.some((w) => !W(w))) return 'Unknown Sigil word.';
  const ge = grammarError(words, 4); if (ge) return 'Your 2 Sigil words must make a spell: ' + ge.charAt(0).toLowerCase() + ge.slice(1);
  if (!words.some(isReach)) return 'One of your 2 Sigil words must be a Reach word (SEEK, ARC, SENSE or RELAY), so you can hit something past one tile.';
  return null;
}
export const STARTING_DEFAULT: string[] = G.starting?.default || ['spark', 'seek'];
/** Old characters' words (item 441, 438): RETURN and unknown words go (one free word each at the next rest); two
 * starting words with no Reach word swap the non-Subject one for SEEK. Returns the notes, or [] when nothing changed. */
export function migrateWords(words: string[] | undefined): { words: string[]; free: number; notes: string[] } {
  const list = [...new Set(words || [])], notes: string[] = []; let free = 0;
  // Two starting words with no Reach word (a 1.2 Stack: SPARK · CONDENSE, FIRE · RETURN): the non-Subject one becomes SEEK.
  if (list.length === 2 && !list.some((w) => W(w) && isReach(w)) && !list.includes('seek')) {
    const i = list.findIndex((w) => !W(w) || !isSubject(w)), at = i >= 0 ? i : 1, was = list[at];
    list[at] = 'seek'; notes.push((was || '?').toUpperCase() + ' becomes SEEK: a caster starts with a Reach word (rules 1.4).');
  }
  const kept = list.filter((w) => { if (W(w)) return true; free++; notes.push((w || '?').toUpperCase() + ' is gone from the Sigil words (rules 1.4)' + (w === 'return' ? ': targeting yourself is Touch\'s exception now' : '') + '; one free word at the next rest.'); return false; });
  return { words: kept, free, notes };
}

