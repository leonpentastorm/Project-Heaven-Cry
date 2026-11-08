// The Narrator's craft checks (docs/design/handoffs/narrator-craft-HANDOFF.md). No model calls: after each turn the
// engine reads the narration against the map and the turn, and the next turn's prompt says what didn't match:
// - RECENT NARRATION: the last two narrations, marked already said, with the phrases repeated across the last three;
// - LAST TURN: people named in the prose who aren't on the map, and prose movement with no matching map move.
import { npcsOf, storyObjects, campaignOf, memoryOf, type GameState, type NarratorTurn } from '@engine';

/** What a provider saw just before a turn, and what the turn did to the map: the movement check needs both. */
interface TurnNote { narration: string; tokens: { id: string; name: string }[]; npcs: NonNullable<NarratorTurn['npcs']>; moves: NonNullable<NarratorTurn['moves']>; actions: NonNullable<NarratorTurn['actions']> }
const NOTES = new Map<string, TurnNote>();
/** Providers call this with the state the turn was asked on and the turn they got back. */
export function rememberTurn(g: GameState, t: NarratorTurn) {
  if (!t || typeof t.narration !== 'string') return;
  NOTES.set(g.code, { narration: t.narration.trim(), tokens: npcsOf({ ...g, story: { ...g.story } }).map((n) => ({ id: n.id, name: n.name })),
    npcs: Array.isArray(t.npcs) ? t.npcs : [], moves: Array.isArray(t.moves) ? t.moves : [], actions: Array.isArray(t.actions) ? t.actions : [] });
}
/** Tests: forget the remembered turns. */
export const forgetTurns = () => NOTES.clear();

/** The Narrator's own narrations, newest last (rerolled ones never happened). */
export const narrations = (g: GameState) => g.story.entries.filter((e) => e.kind === 'narration' && !(e as any).rerolled);
/** How many narrations the turn carries as RECENT NARRATION, and how much of each. */
export const RECENT_N = 2, RECENT_CHARS = 1100;
const trim = (s: string, n: number) => (s.length > n ? s.slice(0, n).replace(/\s+\S*$/, '') + ' …' : s);
const unquote = (s: string) => s.replace(/"[^"]*"|“[^”]*”/g, ' ');
const sentences = (s: string) => s.split(/(?<=[.!?…])["”]?\s+|\n+/).map((x) => x.trim()).filter(Boolean);
const words = (s: string) => s.toLowerCase().replace(/[“”"]/g, '').match(/[a-z0-9][a-z0-9'’-]*/g) || [];

/** Phrases of 4+ words that appear in two or more of these texts (the shortest form of each, at most 8). */
export function repeatedPhrases(texts: string[], n = 4): string[] {
  const seen = new Map<string, Set<number>>();
  texts.forEach((t, i) => { const w = words(t); for (let k = 0; k + n <= w.length; k++) { const p = w.slice(k, k + n).join(' '); (seen.get(p) || seen.set(p, new Set()).get(p)!).add(i); } });
  const STOP = /^(?:(?:the|a|an|of|to|and|in|on|at|it|is|you|your|his|her|its|their|with|for|that|this|as|from|one|two)\s?)+$/;
  const out: string[] = [];
  for (const [p, s] of seen) if (s.size > 1 && !STOP.test(p) && !out.some((o) => o.includes(p) || p.includes(o))) out.push(p);
  return out.slice(0, 8);
}
/** The first two words of each sentence, where two or more sentences across these texts start the same way. */
export function repeatedOpeners(texts: string[]): string[] {
  const count = new Map<string, number>();
  for (const t of texts) for (const s of sentences(unquote(t))) { const w = words(s).slice(0, 2).join(' '); if (w.split(' ').length === 2) count.set(w, (count.get(w) || 0) + 1); }
  return [...count].filter(([, n]) => n > 1).sort((a, b) => b[1] - a[1]).map(([w]) => w).slice(0, 6);
}

/** RECENT NARRATION: the last two narrations (already said), and what the last three repeated. '' before the first. */
export function recentNarrationBlock(g: GameState): string {
  const all = narrations(g), last = all.slice(-RECENT_N), three = all.slice(-3).map((e) => e.text);
  if (!last.length) return '';
  const rep = repeatedPhrases(three), open = repeatedOpeners(three);
  return 'RECENT NARRATION (already said, don\'t repeat: no image, simile, refrain or sentence opening from these again; start from what is new):\n'
    + last.map((e, i) => `[${i + 1} of ${last.length}${i === last.length - 1 ? ', your last turn' : ''}] ${trim(e.text.replace(/\s*\n+\s*/g, ' / '), RECENT_CHARS)}`).join('\n')
    + (rep.length ? '\nREPEATED ACROSS YOUR LAST TURNS (retire these): ' + rep.map((p) => '"' + p + '"').join(', ') : '')
    + (open.length ? '\nOPENINGS YOU KEEP USING (start differently): ' + open.map((p) => '"' + p + '…"').join(', ') : '');
}
/** The ids of the narrations RECENT NARRATION carries: the transcript points to them instead of repeating them. */
export const recentIds = (g: GameState) => new Set(narrations(g).slice(-RECENT_N).map((e) => e.id));

// ---------- who is named, who moves ----------

const TITLES = ['Chief Engineer', 'Junior engineer', 'Junior Engineer', 'Sergeant', 'Sgt', 'Captain', 'Chief', 'Engineer', 'Lieutenant', 'Corporal', 'Private', 'Major', 'Colonel', 'Commander', 'Doctor', 'Dr', 'Officer', 'Technician', 'Pilot', 'Medic', 'Agent', 'Director', 'Admiral', 'General', 'Warden', 'Marshal', 'Foreman', 'Father', 'Mother', 'Sister', 'Brother', 'Elder', 'Inspector', 'Detective', 'Professor', 'Lord', 'Lady', 'Mr', 'Mrs', 'Ms', 'Miss'];
const NAME = "[A-Z][A-Za-z'’]*(?:-[A-Z0-9][A-Za-z0-9'’]*)*";
const SAYS = 'says|asks|calls|answers|replies|mutters|snaps|crackles|whispers|growls|shouts|adds|tells|grunts|laughs|repeats|insists|counters|murmurs|barks|rasps|hisses';
const MOVES3 = 'walks|steps|strides|leaves|follows|heads|crosses|climbs|moves|runs|approaches|retreats|backs away|enters|exits|joins|hurries|jogs|limps|marches|wanders|edges|circles|sprints|ducks|crawls|drags itself|drags himself|drags herself|stalks|paces|wheels|rolls forward|comes over|goes';
const MOVES2 = 'walk|step|stride|head|cross|climb|move|run|approach|retreat|back away|enter|follow|hurry|jog|limp|march|edge|circle|sprint|duck|crawl|go';
/** Words that look like names at the start of a sentence but aren't people. */
const NOT_NAMES = new Set(['The', 'A', 'An', 'You', 'Your', 'He', 'She', 'It', 'They', 'We', 'I', 'His', 'Her', 'Its', 'Their', 'Then', 'Now', 'East', 'West', 'North', 'South', 'Behind', 'Beside', 'Out', 'Over', 'Down', 'Up', 'Somebody', 'Someone', 'Nobody', 'Everyone', 'Something', 'Nothing', 'Before', 'After', 'When', 'Every', 'One', 'Two', 'Three', 'Four', 'Five', 'Here', 'There', 'This', 'That', 'Good', 'Medics', 'Medic', 'Static', 'Silence']);
const esc = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
/** The words of a name that identify a person ("Chief Engineer Keel" → ["keel"]). */
const keyWords = (name: string) => { let n = name.trim(); for (const t of TITLES) if (n.startsWith(t + ' ')) { n = n.slice(t.length + 1); break; } return n.split(/\s+/).filter((w) => w.length > 1 && /^[A-Z0-9]/.test(w) && !NOT_NAMES.has(w)).map((w) => w.toLowerCase().replace(/['’]s$/, '')); };
const hasWord = (hay: string, w: string) => new RegExp('(^|[^a-z0-9-])' + esc(w) + '($|[^a-z0-9-])').test(hay.toLowerCase());

/** People the narration names as present: titled names, quoted speakers, and the campaign's cast and remembered people
 * mentioned outside dialogue. The characters are left out (they are always on the map). */
export function namedPeople(g: GameState, text: string): string[] {
  const out = new Map<string, string>(), add = (n: string) => { const k = keyWords(n); if (!k.length || NOT_NAMES.has(n)) return; if (![...out.values()].some((x) => keyWords(x).some((w) => k.includes(w)))) out.set(n, n); };
  const plain = unquote(text);
  for (const m of plain.matchAll(new RegExp('\\b(?:' + TITLES.map(esc).join('|') + ')\\s+' + NAME + '(?:\\s+' + NAME + ')?', 'g'))) add(m[0].replace(/['’]s$/, ''));
  for (const m of text.matchAll(new RegExp('["”][,.!?…]?\\s*(?:' + SAYS + ')\\s+(' + NAME + '(?:\\s+' + NAME + ')?)', 'g'))) add(m[1]);
  for (const m of text.matchAll(new RegExp('["”]\\s*(' + NAME + '(?:\\s+' + NAME + ')?)\\s+(?:' + SAYS + ')\\b', 'g'))) add(m[1]);
  for (const m of text.matchAll(new RegExp('(?:^|[.!?]\\s+|\\n)(' + NAME + '(?:\\s+' + NAME + ')?)\\s+(?:' + SAYS + ')[,:]?\\s*["“]', 'g'))) add(m[1]);
  const c = campaignOf(g), known = [...(c?.cast || []).flatMap((x: any) => String(x.name).split(/,\s*/)), ...memoryOf({ ...g }).people.filter((p) => p.status !== 'dead').map((p) => p.name)];
  for (const n of known) { const k = keyWords(n); if (k.length && k.some((w) => new RegExp('(^|[^A-Za-z0-9-])' + esc(n.split(/\s+/).find((x) => x.toLowerCase().replace(/['’]s$/, '') === w) || w) + '($|[^A-Za-z0-9-])').test(plain))) add(n); }
  const chars = Object.values(g.characters).flatMap((x) => keyWords(x.name));
  return [...out.values()].filter((n) => !keyWords(n).some((w) => chars.includes(w)) && !NOT_NAMES.has(n));
}
/** Is someone with this name on the map: a token, a character, or an object standing for them (a POI named for them)? */
function onMap(g: GameState, name: string, also: string[] = []): boolean {
  const k = keyWords(name), here = [...npcsOf({ ...g, story: { ...g.story } }).map((n) => n.name), ...Object.values(g.characters).map((c) => c.name), ...storyObjects({ ...g, story: { ...g.story, objects: g.story.objects ? [...g.story.objects] : undefined } }).map((o) => o.name), ...also];
  return here.some((h) => k.some((w) => hasWord(h, w)));
}
/** People and characters the narration moves ("Keel walks to the ramp", "MPAT, you step over"): name and the words. */
export function movedInProse(g: GameState, text: string, people: string[]): { name: string; phrase: string; charId?: string }[] {
  const plain = unquote(text), out: { name: string; phrase: string; charId?: string }[] = [];
  for (const c of Object.values(g.characters)) {
    const m = plain.match(new RegExp('\\b' + esc(c.name) + '(?![\'’]s),?\\s+(?:you\\s+)?(?:[a-z]+(?:ly)?\\s+){0,2}?(?:' + MOVES3 + '|' + MOVES2 + ')\\b', 'i'));
    if (m && new RegExp('(?:' + MOVES3 + ')\\b|you\\s+(?:[a-z]+\\s+){0,2}?(?:' + MOVES2 + ')\\b', 'i').test(m[0])) out.push({ name: c.name, phrase: m[0], charId: c.id });
  }
  for (const p of people) {
    const forms = [p, ...keyWords(p).map((w) => p.split(/\s+/).find((x) => x.toLowerCase() === w) || w)];
    for (const f of forms) {
      const m = plain.match(new RegExp('\\b' + esc(f) + '(?![\'’]s)(?:,[^,.]{1,40},)?\\s+(?:[a-z]+ly\\s+|and\\s+[a-z]+s\\s+(?:and\\s+)?){0,2}(?:' + MOVES3 + ')\\b'));
      if (m) { out.push({ name: p, phrase: m[0] }); break; }
    }
  }
  return out;
}

/** LAST TURN: what the last narration said that the map doesn't show. '' when everything matched. */
export function lastTurnAudit(g: GameState): string {
  const last = narrations(g).at(-1); if (!last) return '';
  const note = NOTES.get(g.code), turn = note && note.narration === last.text.trim() ? note : null;
  const removed = (turn?.npcs || []).filter((o) => o.action === 'remove').map((o) => o.name || turn!.tokens.find((t) => t.id === o.id)?.name || '').filter(Boolean);
  const tokens = npcsOf({ ...g, story: { ...g.story } });
  const people = [...new Set([...namedPeople(g, last.text), ...tokens.map((t) => t.name).filter((n) => keyWords(n).some((w) => hasWord(unquote(last.text), w)))])];
  const lines: string[] = [];
  for (const p of people) if (!onMap(g, p, removed)) lines.push(`you named ${p} but didn't place them; place them now with npcs[] (place: name, at, side, tier, weapon) or say they aren't here.`);
  // Characters their players moved since your previous turn: the prose describes a move the map already shows.
  const all = g.story.entries, at = all.lastIndexOf(last), prev = all.slice(0, at).map((e) => e.kind === 'narration' && !(e as any).rerolled).lastIndexOf(true);
  const walked = all.slice(prev + 1, at).filter((e) => e.kind === 'system').map((e) => e.text);
  if (turn) for (const mv of movedInProse(g, last.text, people)) {
    if (mv.charId && walked.some((x) => x.startsWith(mv.name + ' moves to ') || x.startsWith(mv.name + ' sprints to ') || x.startsWith(mv.name + ' sneaks to '))) continue;
    if (mv.charId) { if (turn.moves.some((m) => m.charId === mv.charId) || turn.actions.some((a) => a.charId === mv.charId && a.act === 'move')) continue; }
    else {
      const k = keyWords(mv.name), ids = new Set([...turn.tokens, ...tokens].filter((t) => k.some((w) => hasWord(t.name, w))).map((t) => t.id));
      if (turn.npcs.some((o) => ['move', 'remove', 'place'].includes(o.action) && ((o.id && ids.has(o.id)) || (o.name && k.some((w) => hasWord(o.name!, w)))))) continue;
      if (!onMap(g, mv.name, removed)) continue; // already asked to place them
    }
    lines.push(`your prose moved ${mv.name} ("${trim(mv.phrase, 60)}") but the map didn't; ${mv.charId ? 'move them with moves[]' : 'move them with npcs[] move (id, at), or remove them if they left'}, or keep them where the map has them.`);
  }
  return lines.length ? 'LAST TURN (the map is the truth; fix it in this turn):\n' + lines.map((l) => '- ' + l).join('\n') : '';
}
