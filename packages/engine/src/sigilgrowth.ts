// Sigil 1.5, rules revision 1.9 (spec: The Magic panel and learning; docs/design/sigil-1.5-spec.md sections 2 and 3):
// study, copying, Mastery study, picks and the Mastered free word; word use counts, Practised and Mastered words, and
// the inflections a Mastered word turns on. Pure functions on a Character (no dice): the resolver (sigil.ts) calls
// noteEvoke and copyWord through the bound game, the reducer (game.ts) calls learnStudied, masterySync and the view.
// Every number comes from sigils.json grammar.study and grammar.word_mastery (provisional, spec 14 items 676-686).
import { SIGIL, SIGILS } from './data';
import { G } from './sigilwords';
import { type Character, wordsKnownCap } from './character';

const S: any = G.study || {}, WM: any = G.word_mastery || {};
export const STUDY = {
  perEvoke: S.per_evoke ?? 1, perGlyph: S.per_glyph_past_2 ?? 1, hit: S.hit_enemy ?? 1, first: S.first ?? 6, step: S.step ?? 8,
  copy: S.copy ?? 2, traceRounds: S.trace_rounds ?? 2, skills: (S.mastery_skills || ['brain_power', 'rumination', 'eloquence']) as string[],
  levels: (S.mastery_levels || [3, 5, 7, 9]) as number[], mastery: S.mastery_study ?? 5, freeWords: S.mastered_free_words ?? 1,
};
export const WORD_MASTERY = { practised: WM.practised ?? 10, mastered: WM.mastered ?? 30 };

/** A character's Sigil growth (saved with the character): study so far, the picks taken, the free (over-the-cap) words
 * waiting, the Mastery rewards already paid ("brain_power:3", "rumination:10"), the copied words not yet learned, and
 * each known word's use count. */
export interface SigilGrowth { study: number; picksUsed: number; free: number; paid: string[]; toStudy: string[]; uses: Record<string, number> }
export const growthOf = (c: Character): SigilGrowth => {
  const s = ((c as any).sigilGrowth ||= { study: 0, picksUsed: 0, free: 0, paid: [], toStudy: [], uses: {} }) as SigilGrowth;
  s.paid ||= []; s.toStudy ||= []; s.uses ||= {}; s.study ||= 0; s.picksUsed ||= 0; s.free ||= 0;
  return s;
};
const peek = (c: Character): SigilGrowth | null => ((c as any).sigilGrowth as SigilGrowth) || null;

// ---------- study ----------
/** The study the nth pick needs (1st: 6, then +8 each: 6, 14, 22…). */
export const thresholdN = (n: number) => (n < 1 ? 0 : STUDY.first + STUDY.step * (n - 1));
/** How many picks this much study has earned. */
export const picksEarned = (study: number) => (study < STUDY.first ? 0 : 1 + Math.floor((study - STUDY.first) / STUDY.step));
/** The study one Evoke earns: 1, +1 per glyph past 2, +1 if it struck an enemy. */
export const evokeStudy = (glyphs: number, hitEnemy: boolean) => STUDY.perEvoke + STUDY.perGlyph * Math.max(0, glyphs - 2) + (hitEnemy ? STUDY.hit : 0);
export const pendingPicks = (c: Character) => { const s = peek(c); return s ? Math.max(0, picksEarned(s.study) - s.picksUsed) : 0; };
export const knowsWord = (c: Character, w: string) => (c.sigils || []).includes(w);

/** Add study; returns the lines to log (a threshold crossed). */
export function addStudy(c: Character, n: number, why: string): string[] {
  if (!(n > 0)) return [];
  const s = growthOf(c), before = picksEarned(s.study); s.study += n;
  const got = picksEarned(s.study) - before;
  return got > 0 ? [c.name + ' studies the Sigil words (+' + n + ', ' + why + '): ' + (got === 1 ? 'a new word can be learned' : got + ' new words can be learned') + ' (study ' + s.study + ').'] : [];
}

/** An Evoke by this character (rules 1.9): study, and a use for each known word in it (repeats once). Returns log lines. */
export function noteEvoke(c: Character, words: string[], glyphs: number, hitEnemy: boolean): string[] {
  const s = growthOf(c), out: string[] = [];
  for (const w of new Set(words)) {
    if (!knowsWord(c, w)) continue;
    const was = s.uses[w] || 0, now = was + 1; s.uses[w] = now;
    if (was < WORD_MASTERY.practised && now >= WORD_MASTERY.practised) out.push(c.name + '\'s ' + w.toUpperCase() + ' is Practised (' + now + ' uses).');
    if (was < WORD_MASTERY.mastered && now >= WORD_MASTERY.mastered) out.push(c.name + ' masters ' + w.toUpperCase() + ' (' + now + ' uses). Its inflection is always on: ' + (inflectionOf(w)?.text || 'see the word') + '');
  }
  return [...out, ...addStudy(c, evokeStudy(glyphs, hitEnemy), 'an Evoke')];
}

/** Copying a word from the world (a glyph read in a fight, its trace, a mark): study, and the word on the known-to-study
 * list. Returns log lines; '' study for a word already known. */
export function copyWord(c: Character, word: string, n = STUDY.copy, why = 'a copied glyph'): string[] {
  if (!SIGIL[word] || knowsWord(c, word)) return [];
  const s = growthOf(c); if (!s.toStudy.includes(word)) s.toStudy.push(word);
  return [c.name + ' copies ' + word.toUpperCase() + ' (+' + n + ' study; on the known-to-study list).', ...addStudy(c, n, why)];
}

/** The Mastery rewards (rules 1.9): each Mastery level (3/5/7/9) of Brain Power, Rumination or Eloquence gives +5 study
 * once; Mastered (10) gives one free word over the cap, once per skill. Idempotent: what is paid is recorded. */
export function masterySync(c: Character): string[] {
  const out: string[] = [];
  for (const sk of STUDY.skills) {
    const p = c.skills?.[sk] || 0; if (p < (STUDY.levels[0] ?? 3)) continue;
    const s = growthOf(c);
    for (const lv of STUDY.levels) if (p >= lv && !s.paid.includes(sk + ':' + lv)) { s.paid.push(sk + ':' + lv); out.push(...addStudy(c, STUDY.mastery, 'Mastery in ' + skillName(sk))); }
    if (p >= 10 && !s.paid.includes(sk + ':10')) { s.paid.push(sk + ':10'); s.free += STUDY.freeWords; out.push(c.name + ' has Mastered ' + skillName(sk) + ': one free Sigil word, over the cap.'); }
  }
  return out;
}
const skillName = (id: string) => ({ brain_power: 'Brain Power', rumination: 'Rumination', eloquence: 'Eloquence' } as Record<string, string>)[id] || id;

/** The words a pick may learn: every word not known (rule 1.9.2; item 678), the copied ones first. */
export function learnable(c: Character): string[] {
  const s = peek(c), copied = (s?.toStudy || []).filter((w) => SIGIL[w] && !knowsWord(c, w));
  return [...copied, ...SIGILS.map((w) => w.id).filter((w) => !knowsWord(c, w) && !copied.includes(w))];
}
/** Learn a word with a study pick (or the Mastered free word, over the cap). Returns an error, or '' and the word is
 * known. free: true takes a free word; unset takes a pick when one is waiting and a slot is open, else a free word. */
export function learnStudied(c: Character, word: string, free?: boolean): string {
  const w = String(word || '').trim().toLowerCase();
  if (!SIGIL[w]) return 'No such word.';
  if (knowsWord(c, w)) return c.name + ' already knows ' + SIGIL[w].word + '.';
  const s = growthOf(c), pick = pendingPicks(c) > 0, room = (c.sigils || []).length < wordsKnownCap(c);
  const useFree = free === true || (free === undefined && !(pick && room) && s.free > 0);
  if (useFree) { if (s.free < 1) return 'No free word waiting (Mastered Brain Power, Rumination or Eloquence gives one).'; s.free--; }
  else {
    if (!pick) return 'No word to learn yet: the next comes at ' + thresholdN(s.picksUsed + 1) + ' study (' + s.study + ' now).';
    if (!room) return c.name + ' knows ' + (c.sigils || []).length + ' words, the most Brain Power allows (' + wordsKnownCap(c) + '): the pick is banked until a slot frees up.';
    s.picksUsed++;
  }
  (c.sigils ||= []).push(w); s.toStudy = s.toStudy.filter((x) => x !== w);
  return '';
}
/** A word put on the known-to-study list without study (a Narrator grant that couldn't land). */
export function noteToStudy(c: Character, word: string) { if (SIGIL[word] && !knowsWord(c, word)) { const s = growthOf(c); if (!s.toStudy.includes(word)) s.toStudy.push(word); } }
/** A word learned another way (a plate, an ally, the Narrator) leaves the known-to-study list. */
export function learnedElsewhere(c: Character, word: string) { const s = peek(c); if (s) s.toStudy = s.toStudy.filter((x) => x !== word); }

// ---------- word mastery and inflections ----------
export type WordTier = 'new' | 'practised' | 'mastered';
export const wordUses = (c: Character, w: string) => peek(c)?.uses?.[w] || 0;
export const wordTierOf = (n: number): WordTier => (n >= WORD_MASTERY.mastered ? 'mastered' : n >= WORD_MASTERY.practised ? 'practised' : 'new');
/** The words whose inflection is on for this character: known words at 30 uses. */
export const masteredWords = (c: Character): string[] => (c.sigils || []).filter((w) => wordUses(c, w) >= WORD_MASTERY.mastered);
export interface Inflection { text: string; effects: { op: string; stat?: string; value?: number }[]; provisional?: boolean }
export const inflectionOf = (w: string): Inflection | null => ((SIGIL[w] as any)?.inflection as Inflection) || null;
/** The stats the engine runs (sigil.ts applyInflections and the spots that read a word's numbers); any other goes to the
 * Narrator with the inflection's text. */
export const INFLECTION_STATS = new Set(['cond_rounds', 'save_tn', 'to_hit', 'damage_pct', 'push_tiles', 'shield_pct', 'heal_pct', 'charge', 'flux', 'lasts_rounds', 'radius',
  'teleport_tiles', 'barrier_hp_pct', 'move_tiles', 'range', 'turret_def', 'pull_tiles', 'jump_radius', 'leech', 'mult', 'radius_at_4', 'cone_length', 'spare_downed']);
/** A Mastered word's inflection value for a stat (0 if none). */
export function inflectionValue(w: string, stat: string): number {
  const inf = inflectionOf(w); if (!inf) return 0;
  return inf.effects.filter((e) => e.op === 'inflection' && e.stat === stat).reduce((t, e) => t + (e.value || 0), 0);
}

// ---------- the view (the Magic tab) ----------
export interface SigilGrowthView {
  study: number; next: number; prev: number; pending: number; free: number; cap: number; known: number;
  toStudy: string[]; learnable: string[];
  words: { word: string; uses: number; tier: WordTier; practisedAt: number; masteredAt: number; inflection: { text: string; unlocked: boolean } | null }[];
}
/** What the Magic tab shows (rules 1.9): the study bar, the picks waiting, the copied words, and each known word's use
 * count, tier and inflection. */
export function sigilGrowthView(c: Character): SigilGrowthView {
  const s = peek(c), study = s?.study || 0, used = s?.picksUsed || 0, earned = picksEarned(study);
  return {
    study, next: thresholdN(earned + 1), prev: thresholdN(earned), pending: Math.max(0, earned - used), free: s?.free || 0,
    cap: wordsKnownCap(c), known: (c.sigils || []).length, toStudy: (s?.toStudy || []).filter((w) => !knowsWord(c, w)), learnable: learnable(c),
    words: (c.sigils || []).map((w) => { const n = wordUses(c, w), inf = inflectionOf(w); return { word: w, uses: n, tier: wordTierOf(n), practisedAt: WORD_MASTERY.practised, masteredAt: WORD_MASTERY.mastered, inflection: inf ? { text: inf.text, unlocked: n >= WORD_MASTERY.mastered } : null }; }),
  };
}
