// The Narrator's long-term memory (spec: The Narrator's memory). A campaign of 50 hours and four players is far more
// story than any prompt should carry, so the engine keeps it as data and hands the Narrator only what the moment needs:
//  - a ledger of people, threads (quests, promises, mysteries), facts and factions, written by the Narrator and, for
//    what the engine knows for certain (deaths, fights, travel, deeds), by the engine itself as canon;
//  - recursive summaries: scene summaries roll up into chapters, chapters into the saga (the story so far);
//  - per-turn selection by relevance (names mentioned now, who is here), recency and importance, inside a budget;
//  - recall: a keyword search (BM25) over everything, for the Narrator to page old memory back in.
// Everything here is deterministic and bounded, so it saves and syncs like the rest of the state.
import type { GameState } from './game';

export type Attitude = -3 | -2 | -1 | 0 | 1 | 2 | 3;
export interface Person { id: string; name: string; aliases: string[]; role: string; where: string; attitude: Attitude; status: 'alive' | 'dead' | 'missing' | 'unknown'; notes: string; first: number; last: number; importance: number;
  /** Their own memory: the last few things that happened between them and the party. */
  log?: string[] }
export interface Thread { id: string; title: string; kind: 'quest' | 'promise' | 'mystery' | 'debt' | 'rumour' | 'goal'; status: 'open' | 'done' | 'failed' | 'dropped'; who: string[]; text: string; log: string[]; first: number; last: number; importance: number }
export interface Fact { id: string; text: string; about: string[]; scene: number; importance: number; canon: boolean; secret: boolean }
export interface Faction { id: string; name: string; standing: number; notes: string; last: number }
export interface SceneSum { n: number; title: string; zone: string; summary: string }
export interface Chapter { n: number; title: string; summary: string; scenes: [number, number] }
export interface Memory {
  seq: number; people: Person[]; threads: Thread[]; facts: Fact[]; factions: Faction[];
  /** Closed scenes not yet rolled into a chapter (most recent last). */
  scenes: SceneSum[]; chapters: Chapter[];
  /** The story so far, rewritten at every chapter. */
  saga: string;
  /** Plot essentials: always in the Narrator's context (the campaign's and the Narrator's pins). */
  pins: string[];
}

/** Hard caps: the memory stays bounded however long the campaign runs (spec: The Narrator's memory). */
export const MEM_CAPS = { people: 300, threads: 200, facts: 1500, factions: 40, pins: 12, sceneLen: 700, chapterLen: 1400, sagaLen: 4000, notes: 400, fact: 280, log: 6 };
/** Scenes that roll up into one chapter. */
export const SCENES_PER_CHAPTER = 6;

export function memoryOf(g: GameState): Memory {
  return (g.memory ||= { seq: 0, people: [], threads: [], facts: [], factions: [], scenes: [], chapters: [], saga: '', pins: [] });
}
const clip = (s: unknown, n: number) => String(s ?? '').replace(/\s+/g, ' ').trim().slice(0, n);
const imp = (x: unknown, d = 3) => Math.max(1, Math.min(5, Math.round(Number(x) || d)));
const sceneNo = (g: GameState) => g.story.scene.n;
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s'-]/g, ' ').replace(/\s+/g, ' ').trim();

// ---------- writing ----------
/** One memory op from the Narrator. Upserts: a person or faction by name, a thread by title, unless an id is given. */
export type MemOp =
  | { op: 'person'; id?: string; name?: string; aliases?: string[]; role?: string; where?: string; attitude?: number; status?: Person['status']; notes?: string; update?: string; importance?: number }
  | { op: 'thread'; id?: string; title?: string; kind?: Thread['kind']; status?: Thread['status']; who?: string[]; text?: string; update?: string; importance?: number }
  | { op: 'fact'; id?: string; retire?: boolean; text?: string; about?: string[]; importance?: number; secret?: boolean }
  | { op: 'faction'; id?: string; name?: string; standing?: number; change?: number; notes?: string }
  | { op: 'pin'; text: string } | { op: 'unpin'; text: string };

export function applyMemOp(g: GameState, o: MemOp, canon = false): string | null {
  const m = memoryOf(g), n = sceneNo(g);
  if (!o || typeof o !== 'object') return null;
  if (o.op === 'person') {
    const name = clip(o.name, 60);
    let p = (o.id && m.people.find((x) => x.id === o.id)) || (name ? findPerson(m, name) : null);
    if (!p) {
      if (!name) return null;
      p = { id: 'p' + (++m.seq), name, aliases: [], role: '', where: '', attitude: 0, status: 'alive', notes: '', first: n, last: n, importance: 3 };
      m.people.push(p);
    }
    if (name && !canon) p.name = name;
    if (Array.isArray(o.aliases)) p.aliases = [...new Set([...p.aliases, ...o.aliases.map((a) => clip(a, 40)).filter(Boolean)])].slice(0, 6);
    if (o.role) p.role = clip(o.role, 80);
    if (o.where) p.where = clip(o.where, 40);
    if (o.attitude != null) p.attitude = Math.max(-3, Math.min(3, Math.round(Number(o.attitude) || 0))) as Attitude;
    if (o.status && ['alive', 'dead', 'missing', 'unknown'].includes(o.status)) p.status = o.status;
    if (o.notes) p.notes = clip(o.notes, MEM_CAPS.notes);
    if (o.update) p.log = [...(p.log || []), 'S' + n + ': ' + clip(o.update, 160)].slice(-MEM_CAPS.log);
    if (o.importance != null) p.importance = imp(o.importance);
    p.last = n;
    prune(m);
    return p.id;
  }
  if (o.op === 'thread') {
    const title = clip(o.title, 80);
    let t = (o.id && m.threads.find((x) => x.id === o.id)) || (title ? m.threads.find((x) => norm(x.title) === norm(title)) : null);
    if (!t) {
      if (!title) return null;
      t = { id: 't' + (++m.seq), title, kind: 'quest', status: 'open', who: [], text: '', log: [], first: n, last: n, importance: 3 };
      m.threads.push(t);
    }
    if (o.kind && ['quest', 'promise', 'mystery', 'debt', 'rumour', 'goal'].includes(o.kind)) t.kind = o.kind;
    if (o.status && ['open', 'done', 'failed', 'dropped'].includes(o.status)) t.status = o.status;
    if (Array.isArray(o.who)) t.who = [...new Set([...t.who, ...o.who.map((x) => clip(x, 60)).filter(Boolean)])].slice(0, 8);
    if (o.text) t.text = clip(o.text, MEM_CAPS.notes);
    if (o.update) { t.log.push('S' + n + ': ' + clip(o.update, 160)); t.log = t.log.slice(-MEM_CAPS.log); }
    if (o.importance != null) t.importance = imp(o.importance);
    t.last = n;
    prune(m);
    return t.id;
  }
  if (o.op === 'fact') {
    // A fact that stopped being true is retired (canon facts stay: the engine made them).
    if (o.retire && o.id) { m.facts = m.facts.filter((f) => f.id !== o.id || f.canon); if (!o.text) return null; }
    const text = clip(o.text, MEM_CAPS.fact); if (!text) return null;
    const dup = m.facts.find((f) => norm(f.text) === norm(text)); if (dup) { dup.scene = n; dup.importance = Math.max(dup.importance, imp(o.importance)); return dup.id; }
    const f: Fact = { id: 'f' + (++m.seq), text, about: (Array.isArray(o.about) ? o.about : []).map((a) => clip(a, 60)).filter(Boolean).slice(0, 6), scene: n, importance: imp(o.importance), canon, secret: !!o.secret };
    m.facts.push(f); prune(m);
    return f.id;
  }
  if (o.op === 'faction') {
    const name = clip(o.name, 60);
    let f = (o.id && m.factions.find((x) => x.id === o.id)) || (name ? m.factions.find((x) => norm(x.name) === norm(name)) : null);
    if (!f) { if (!name) return null; f = { id: 'x' + (++m.seq), name, standing: 0, notes: '', last: n }; m.factions.push(f); }
    if (o.standing != null) f.standing = Math.max(-100, Math.min(100, Math.round(Number(o.standing) || 0)));
    if (o.change != null) f.standing = Math.max(-100, Math.min(100, f.standing + Math.max(-30, Math.min(30, Math.round(Number(o.change) || 0)))));
    if (o.notes) f.notes = clip(o.notes, 200);
    f.last = n; m.factions = m.factions.slice(-MEM_CAPS.factions);
    return f.id;
  }
  if (o.op === 'pin') { const t = clip(o.text, 200); if (t && !m.pins.includes(t)) m.pins = [...m.pins, t].slice(-MEM_CAPS.pins); return null; }
  if (o.op === 'unpin') { m.pins = m.pins.filter((x) => norm(x) !== norm(String(o.text || ''))); return null; }
  return null;
}
export function findPerson(m: Memory, name: string): Person | null {
  const n = norm(name); if (!n) return null;
  return m.people.find((p) => norm(p.name) === n || p.aliases.some((a) => norm(a) === n)) || null;
}
/** What the engine knows for certain becomes canon (a fight's dead, travel, deeds): the Narrator may not contradict it. */
export function canon(g: GameState, text: string, about: string[] = [], importance = 3) { applyMemOp(g, { op: 'fact', text, about, importance }, true); const f = memoryOf(g).facts.at(-1); if (f && f.text === clip(text, MEM_CAPS.fact)) f.canon = true; }

/** Keep the ledger inside its caps: drop the least important, least recent entries first (closed threads before open ones). */
function prune(m: Memory) {
  const keep = <T>(list: T[], cap: number, score: (x: T) => number) => (list.length <= cap ? list : [...list].sort((a, b) => score(b) - score(a)).slice(0, cap));
  m.people = keep(m.people, MEM_CAPS.people, (p) => p.importance * 100 + p.last);
  m.threads = keep(m.threads, MEM_CAPS.threads, (t) => (t.status === 'open' ? 10000 : 0) + t.importance * 100 + t.last);
  m.facts = keep(m.facts, MEM_CAPS.facts, (f) => (f.canon ? 500 : 0) + f.importance * 100 + f.scene);
}

// ---------- summaries (recursive summarization) ----------
/** A scene closed: its summary joins the unrolled scenes. */
export function noteScene(g: GameState, title: string, summary: string) {
  const m = memoryOf(g);
  m.scenes.push({ n: sceneNo(g), title: clip(title, 80), zone: g.story.zone || '', summary: clip(summary, MEM_CAPS.sceneLen) });
}
/** Is it time to roll the oldest scenes into a chapter? The Narrator is asked to write it with its next turn. */
export const chapterDue = (g: GameState) => memoryOf(g).scenes.length >= SCENES_PER_CHAPTER + 2;
/** Roll the oldest scenes into a chapter and replace the saga (the Narrator wrote both). Without them (no Narrator),
 * the engine folds the scene summaries in as they are, so nothing is ever lost, only less polished. */
export function rollChapter(g: GameState, ch?: { title?: string; summary?: string; saga?: string }) {
  const m = memoryOf(g); if (m.scenes.length < SCENES_PER_CHAPTER) return;
  const take = m.scenes.splice(0, SCENES_PER_CHAPTER);
  const summary = clip(ch?.summary || take.map((s) => s.title + ': ' + s.summary).join(' '), MEM_CAPS.chapterLen);
  m.chapters.push({ n: m.chapters.length + 1, title: clip(ch?.title || take[0].title + ' to ' + take.at(-1)!.title, 80), summary, scenes: [take[0].n, take.at(-1)!.n] });
  m.saga = clip(ch?.saga || (m.saga ? m.saga + ' ' : '') + summary, MEM_CAPS.sagaLen);
}

// ---------- selection (what the Narrator sees this turn) ----------
const words = (s: string) => new Set(norm(s).split(' ').filter((w) => w.length > 2));
/** Does this text mention the name (all of its words, or the whole name)? */
const mentions = (hay: string, name: string) => { const n = norm(name); if (!n) return false; if (hay.includes(n)) return true; const ws = n.split(' ').filter((w) => w.length > 3); return ws.length > 0 && ws.every((w) => new RegExp('\\b' + w + '\\b').test(hay)); };

export interface Selection { people: Person[]; threads: Thread[]; facts: Fact[]; factions: Faction[] }
/**
 * Pick the memory this turn needs, within a character budget. Relevance comes first (mentioned in the recent
 * transcript or standing here), then importance and recency (a forgetting curve: older scenes weigh less unless the
 * entry is important). Open important threads and present people are always in; canon facts about them too.
 */
export function selectMemory(g: GameState, context: string, budget: number): Selection {
  const m = memoryOf(g), now = sceneNo(g), hay = norm(context), zone = g.story.zone || '';
  const recency = (last: number) => Math.exp(-Math.max(0, now - last) / 10);
  const pScore = (p: Person) => (mentions(hay, p.name) || p.aliases.some((a) => mentions(hay, a)) ? 10 : 0) + (p.where && p.where === zone ? 4 : 0) + p.importance + 3 * recency(p.last) - (p.status === 'dead' ? 2 : 0);
  const tScore = (t: Thread) => (mentions(hay, t.title) || t.who.some((w) => mentions(hay, w)) ? 8 : 0) + (t.status === 'open' ? 5 : -3) + t.importance + 3 * recency(t.last);
  const people = [...m.people].sort((a, b) => pScore(b) - pScore(a));
  const threads = [...m.threads].sort((a, b) => tScore(b) - tScore(a));
  const named = new Set([...people.slice(0, 12).filter((p) => pScore(p) >= 10).map((p) => norm(p.name)), ...threads.slice(0, 8).filter((t) => tScore(t) >= 13).flatMap((t) => t.who.map(norm))]);
  const fScore = (f: Fact) => (f.about.some((a) => named.has(norm(a)) || mentions(hay, a)) ? 6 : 0) + ([...words(f.text)].filter((w) => w.length > 4 && hay.includes(w)).length > 2 ? 3 : 0) + f.importance * 1.2 + 3 * recency(f.scene) + (f.canon ? 1 : 0);
  const facts = [...m.facts].sort((a, b) => fScore(b) - fScore(a));
  const out: Selection = { people: [], threads: [], facts: [], factions: [] };
  let left = budget;
  const take = <T>(list: T[], into: T[], size: (x: T) => number, max: number, must: (x: T) => boolean) => {
    for (const x of list) { if (into.length >= max) break; const s = size(x); if (s > left && !must(x)) continue; left -= s; into.push(x); }
  };
  take(threads, out.threads, (t) => 60 + t.title.length + t.text.length + t.log.slice(-2).join('').length, 14, (t) => t.status === 'open' && t.importance >= 4);
  take(people, out.people, (p) => 60 + p.name.length + p.role.length + p.notes.length + (pScore(p) >= 10 ? (p.log || []).join('').length : 0), 16, (p) => pScore(p) >= 10);
  take(m.factions.filter((f) => mentions(hay, f.name) || Math.abs(f.standing) >= 20).sort((a, b) => b.last - a.last), out.factions, (f) => 40 + f.name.length + f.notes.length, 6, () => false);
  take(facts, out.facts, (f) => 20 + f.text.length, 40, () => false);
  return out;
}

// ---------- recall (BM25 over everything) ----------
export interface RecallHit { id: string; kind: string; text: string; score: number }
/** Keyword search over the whole memory (people, threads, facts, factions, scenes, chapters): the Narrator's way to
 * page old memory back in (MemGPT-style). BM25, deterministic, no network. */
export function recall(g: GameState, query: string, k = 8): RecallHit[] {
  const m = memoryOf(g);
  const docs: { id: string; kind: string; text: string }[] = [
    ...m.people.map((p) => ({ id: p.id, kind: 'person', text: `${p.name}${p.aliases.length ? ' (' + p.aliases.join(', ') + ')' : ''}: ${p.role}. ${p.status}, attitude ${p.attitude}, at ${p.where || '?'}. ${p.notes} ${(p.log || []).join(' ')}` })),
    ...m.threads.map((t) => ({ id: t.id, kind: t.kind, text: `${t.title} [${t.status}] (${t.who.join(', ')}): ${t.text} ${t.log.join(' ')}` })),
    ...m.facts.map((f) => ({ id: f.id, kind: 'fact', text: `S${f.scene}: ${f.text}${f.about.length ? ' (about ' + f.about.join(', ') + ')' : ''}${f.secret ? ' [secret]' : ''}` })),
    ...m.factions.map((f) => ({ id: f.id, kind: 'faction', text: `${f.name}: standing ${f.standing}. ${f.notes}` })),
    ...m.scenes.map((s) => ({ id: 'S' + s.n, kind: 'scene', text: `Scene ${s.n}, ${s.title} (${s.zone}): ${s.summary}` })),
    ...m.chapters.map((c) => ({ id: 'C' + c.n, kind: 'chapter', text: `Chapter ${c.n}, ${c.title} (scenes ${c.scenes[0]}–${c.scenes[1]}): ${c.summary}` })),
    // The whole transcript, archived lines included: what was actually said, word for word.
    ...[...(g.archive || []), ...g.story.entries].filter((e) => !e.to && !e.ooc && (e.kind === 'narration' || e.kind === 'player' || e.kind === 'check')).map((e) => ({ id: e.id, kind: 'log', text: (e.head ? '[' + e.head + (e.ref ? ' · ' + e.ref : '') + '] ' : '') + e.text.slice(0, 600) })),
  ];
  const tok = (s: string) => norm(s).split(' ').filter((w) => w.length > 1);
  const q = [...new Set(tok(query))]; if (!q.length || !docs.length) return [];
  const toks = docs.map((d) => tok(d.text)), avg = toks.reduce((t, x) => t + x.length, 0) / toks.length || 1;
  const df: Record<string, number> = {}; for (const w of q) df[w] = toks.filter((t) => t.includes(w)).length;
  const k1 = 1.4, b = 0.75, N = docs.length;
  return docs.map((d, i) => {
    const t = toks[i]; let s = 0;
    for (const w of q) { const f = t.filter((x) => x === w).length; if (!f) continue; const idf = Math.log(1 + (N - df[w] + 0.5) / (df[w] + 0.5)); s += idf * (f * (k1 + 1)) / (f + k1 * (1 - b + b * t.length / avg)); }
    return { ...d, score: s };
  }).filter((h) => h.score > 0).sort((a, b) => b.score - a.score).slice(0, k);
}

// ---------- editing by hand (the host's Memory menu; later the human Narrator's memory aid) ----------
export type MemEdit =
  | { kind: 'person' | 'thread' | 'fact' | 'faction'; id?: string; patch?: Record<string, any>; remove?: boolean }
  | { kind: 'saga'; text: string }
  | { kind: 'chapter'; n: number; title?: string; summary?: string; remove?: boolean }
  | { kind: 'scene'; n: number; title?: string; summary?: string; remove?: boolean }
  | { kind: 'pin'; text: string; remove?: boolean };
/** A hand edit: anything in memory can be read, corrected, added or removed (canon included: the host is the judge). */
export function editMemory(g: GameState, e: MemEdit): string | null {
  const m = memoryOf(g);
  if (e.kind === 'saga') { m.saga = clip(e.text, MEM_CAPS.sagaLen); return null; }
  if (e.kind === 'pin') { if (e.remove) m.pins = m.pins.filter((x) => x !== e.text); else applyMemOp(g, { op: 'pin', text: e.text }); return null; }
  if (e.kind === 'chapter' || e.kind === 'scene') {
    const list: any[] = e.kind === 'chapter' ? m.chapters : m.scenes, x = list.find((y) => y.n === e.n);
    if (!x) return 'No such ' + e.kind + '.';
    if (e.remove) { list.splice(list.indexOf(x), 1); return null; }
    if (e.title != null) x.title = clip(e.title, 80);
    if (e.summary != null) x.summary = clip(e.summary, e.kind === 'chapter' ? MEM_CAPS.chapterLen : MEM_CAPS.sceneLen);
    return null;
  }
  const list: any[] = e.kind === 'person' ? m.people : e.kind === 'thread' ? m.threads : e.kind === 'fact' ? m.facts : m.factions;
  if (e.remove) { const i = list.findIndex((x) => x.id === e.id); if (i < 0) return 'Nothing to remove.'; list.splice(i, 1); return null; }
  const p = e.patch || {};
  if (e.kind === 'fact') {
    const f = e.id ? m.facts.find((x) => x.id === e.id) : null;
    if (!f) return applyMemOp(g, { op: 'fact', text: p.text, about: p.about, importance: p.importance, secret: p.secret }) ? null : 'A fact needs text.';
    if (p.text != null) f.text = clip(p.text, MEM_CAPS.fact);
    if (p.importance != null) f.importance = imp(p.importance);
    if (p.secret != null) f.secret = !!p.secret;
    if (p.canon != null) f.canon = !!p.canon;
    if (Array.isArray(p.about)) f.about = p.about.map((a: any) => clip(a, 60)).filter(Boolean).slice(0, 6);
    return null;
  }
  if (e.kind === 'person' && e.id && p.name != null) { const x = m.people.find((y) => y.id === e.id); if (x) x.name = clip(p.name, 60); }
  if (e.kind === 'thread' && e.id && p.title != null) { const x = m.threads.find((y) => y.id === e.id); if (x) x.title = clip(p.title, 80); }
  if (e.kind === 'faction' && e.id && p.name != null) { const x = m.factions.find((y) => y.id === e.id); if (x) x.name = clip(p.name, 60); }
  const id = applyMemOp(g, { ...p, op: e.kind, id: e.id } as MemOp);
  return id || e.id ? null : 'That needs a name (or a title).';
}
