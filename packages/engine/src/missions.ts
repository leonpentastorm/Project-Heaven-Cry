// OOC, missions and end states (spec: OOC, missions and end states).
// - OOC: a player line marked out of character (or starting with a marker such as "[OOC]") is a question to the
//   Narrator, not a move in the story. It never uses the player's Say and never counts as their turn. The Narrator
//   answers it in its own field (ooc) on its next turn; the question makes the round's close call the Narrator, but it
//   never triggers a call by itself.
// - Missions: a campaign may list missions with objectives. The engine keeps their state; the Narrator marks
//   objectives done, failed or revealed with its turn. A mission closes when every required objective is resolved, then
//   its end state fires (act or campaign) and the next mission activates.
// - End states: an act end shows everyone a MISSION COMPLETE card built from what the engine already knows (no extra
//   call); a campaign end gives the Narrator one last turn, the epilogue, and marks the save complete.
// Everything here is deterministic and runs inside the reducer, like the rest of the engine.
import type { GameState, NarratorTurn, Entry, NarratorWork } from './game';
import { memoryOf } from './memory';

export interface MissionObjective {
  id: string; text: string;
  /** Optional objectives never hold a mission open. */
  optional?: boolean;
  /** Hidden until the Narrator reveals it (a spoiler). */
  hidden?: boolean;
  /** When it counts as done: guidance for the Narrator, not code. */
  done_when: string;
}
export interface MissionEnd { kind: 'act' | 'campaign'; title: string; epilogue_guidance?: string }
export interface Mission {
  id: string; title: string; act: number;
  /** Player-facing. */
  summary: string; goal: string;
  /** Hidden from the board until revealed. */
  hidden?: boolean;
  objectives: MissionObjective[];
  /** The mission that follows, or a list of branches (the Narrator picks with missionNext). */
  next?: string | string[];
  /** Narrator only. */
  narrator_notes?: string;
  end?: MissionEnd;
}
/** An NPC who offers side jobs in character (open campaigns; M813 is linear and has none). */
export interface BoardNpc { name: string; zone: string; at: string; portrait?: string; text?: string }

export type ObjStatus = 'open' | 'done' | 'failed';
export interface SideJob { id: string; title: string; text: string; status: ObjStatus }
export interface Ending {
  kind: 'act' | 'campaign'; mission: string; title: string;
  /** What happened: the act's scene summaries (and chapters), oldest first. */
  recap: string[];
  /** Objectives done in the act, in order. */
  done: string[];
  /** XP each character gained in the act, from the engine's records. */
  xp: { charId: string; name: string; xp: number }[];
  /** Key choices: memory facts of importance 4 or more from the act. */
  choices: string[];
  /** The next mission's title and goal (null at a campaign end, or while the Narrator still picks a branch). */
  next: { title: string; goal: string } | null;
  /** Campaign end: the Narrator's epilogue (filled by its last turn). */
  epilogue?: string;
  /** g.seq when it fired: the UI shows each ending once. */
  seq: number;
}
export interface MissionState {
  active: string[]; done: string[]; failed: string[];
  objectives: Record<string, Record<string, ObjStatus>>;
  /** Hidden missions and objectives the Narrator has revealed ("mission" or "mission/objective"). */
  revealed: string[];
  side: SideJob[];
  /** A closed mission with several branches, waiting for the Narrator's missionNext. */
  choose: { from: string; options: string[] } | null;
  /** The latest end state (act or campaign); stays for the UI, replaced by the next one. */
  ending: Ending | null;
  /** The mission the Narrator's next turn must open after an act end ("ACT ENDED"). */
  opening: string | null;
  /** A campaign end waiting for the fight to end before the epilogue turn. */
  epilogueDue?: boolean;
  /** Where the current act began: the scene number and each character's XP. */
  act: { scene: number; xp: Record<string, number> };
}

/** Limits (spec: OOC, missions and end states; provisional). */
export const OOC_MAX = 600, OOC_QUEUE = 8, SIDE_MAX = 12, MISSION_UPDATES_MAX = 12;

// ---------- OOC ----------
const OOC_MARK = /^\s*(?:\[\s*ooc\s*\]|\(\s*ooc\b[\s:,.-]*|ooc\s*:|\/\/|\[\s*to the narr?ator\s*\])\s*/i;
/** Is this line out of character? Returns the line without its marker (and a closing bracket the marker opened). */
export function oocOf(text: string): { ooc: boolean; text: string } {
  const raw = String(text || ''), m = raw.match(OOC_MARK);
  if (!m) return { ooc: false, text: raw.trim() };
  let rest = raw.slice(m[0].length).trim();
  if (/^\s*\(/.test(m[0]) && rest.endsWith(')')) rest = rest.slice(0, -1).trim();
  return { ooc: true, text: rest };
}
/** A player's OOC question: shown to everyone in a muted box, queued for the Narrator's next turn. */
export function askOoc(g: GameState, by: string, text: string, post: (e: Omit<Entry, 'id'>) => void) {
  const t = String(text || '').trim().slice(0, OOC_MAX); if (!t) return;
  const p = g.players.find((x) => x.id === by);
  post({ kind: 'ooc', who: by, head: 'OOC · ' + (p?.name || 'A player'), text: t, ooc: true });
  if (g.sandbox) return; // the Proving Ground has no Narrator: OOC there is just table talk
  const q = (g.story.oocAsk ||= []);
  q.push({ seq: g.seq, who: by, name: p?.name || 'A player', text: t });
  if (q.length > OOC_QUEUE) q.splice(0, q.length - OOC_QUEUE);
  // The round's close calls the Narrator even if nobody said anything in character (no extra call of its own).
  if (g.phase === 'story') g.story.needs = true;
}

// ---------- missions ----------
const listOf = (n: Mission['next']) => (n == null ? [] : Array.isArray(n) ? n : [n]).filter((x) => typeof x === 'string' && x);
export const missionsData = (g: GameState): Mission[] => (Array.isArray((g.campaign as any)?.missions) ? (g.campaign as any).missions : []);
export const missionById = (g: GameState, id: string) => missionsData(g).find((m) => m.id === id) || null;
/** The mission state, or null for a campaign without missions (and old saves). */
export const missionsOf = (g: GameState): MissionState | null => g.story.missions || null;
const required = (m: Mission) => m.objectives.filter((o) => !o.optional);
const visible = (ms: MissionState, m: Mission) => !m.hidden || ms.revealed.includes(m.id);
const objVisible = (ms: MissionState, m: Mission, o: MissionObjective) => !o.hidden || ms.revealed.includes(m.id + '/' + o.id) || ms.objectives[m.id]?.[o.id] !== 'open';

function xpNow(g: GameState) { return Object.fromEntries(Object.values(g.characters).map((c) => [c.id, c.xp || 0])); }

/** Session start: the campaign's first missions (those no other mission leads to) become active. */
export function startMissions(g: GameState, post: (e: Omit<Entry, 'id'>) => void) {
  const all = missionsData(g); if (!all.length || g.story.missions) return;
  const ms: MissionState = g.story.missions = { active: [], done: [], failed: [], objectives: {}, revealed: [], side: [], choose: null, ending: null, opening: null, act: { scene: g.story.scene.n, xp: xpNow(g) } };
  const led = new Set(all.flatMap((m) => listOf(m.next)));
  for (const m of all.filter((x) => !led.has(x.id))) activate(g, ms, m, post);
}
function activate(g: GameState, ms: MissionState, m: Mission, post: (e: Omit<Entry, 'id'>) => void) {
  if (ms.active.includes(m.id) || ms.done.includes(m.id) || ms.failed.includes(m.id)) return;
  ms.active.push(m.id);
  ms.objectives[m.id] = Object.fromEntries(m.objectives.map((o) => [o.id, 'open' as ObjStatus]));
  if (visible(ms, m)) post({ kind: 'system', mission: 'start', text: '▶ Mission: ' + m.title + ' · ' + m.goal });
}

/** The Narrator's mission fields, after its turn (and the epilogue, when the turn was the campaign's last). */
export function missionTurn(g: GameState, t: NarratorTurn, work: NarratorWork, began: number | undefined, post: (e: Omit<Entry, 'id'>) => void) {
  // OOC: questions the call saw are answered (or let go); ones asked while it was in flight wait for the next turn.
  if (t.ooc && String(t.ooc).trim()) post({ kind: 'ooc', head: 'NARRATOR · OOC', text: String(t.ooc).trim().slice(0, OOC_MAX), ooc: true });
  if (g.story.oocAsk?.length) { g.story.oocAsk = began == null ? [] : g.story.oocAsk.filter((q) => q.seq > began); if (!g.story.oocAsk.length) delete g.story.oocAsk; else g.story.needs = true; }
  const ms = missionsOf(g); if (!ms) return;
  if (work?.kind === 'epilogue') {
    if (ms.ending && ms.ending.kind === 'campaign') ms.ending = { ...ms.ending, epilogue: String(t.narration || '').trim(), seq: g.seq };
    g.story.complete = true; g.story.await = 'none'; g.story.work = null; g.checks = []; g.overreach = [];
    post({ kind: 'system', mission: 'end', text: '■ The campaign is complete.' });
    return;
  }
  if (ms.opening && work && work.kind !== 'combat_end') ms.opening = null; // the Narrator opened the next mission
  for (const u of (t.missions || []).slice(0, MISSION_UPDATES_MAX)) update(g, ms, u, post);
  for (const s of (t.side || []).slice(0, SIDE_MAX)) sideJob(ms, s, post);
  if (t.missionNext && ms.choose && ms.choose.options.includes(t.missionNext)) { const from = ms.choose.from; ms.choose = null; const m = missionById(g, t.missionNext); if (m) { activate(g, ms, m, post); if (ms.ending && ms.ending.mission === from) ms.ending.next = { title: m.title, goal: m.goal }; if (ms.opening === from) ms.opening = m.id; } }
  if (ms.epilogueDue && g.phase === 'story' && !g.combat) beginEpilogue(g, ms);
}

function update(g: GameState, ms: MissionState, u: NonNullable<NarratorTurn['missions']>[number], post: (e: Omit<Entry, 'id'>) => void) {
  if (!u || typeof u !== 'object') return;
  const m = missionById(g, String(u.mission || '')); if (!m) return; // unknown ids are ignored
  const status = u.status, objId = u.objective ? String(u.objective) : '';
  if (status === 'revealed') {
    const key = objId ? m.id + '/' + objId : m.id;
    if (objId && !m.objectives.some((o) => o.id === objId)) return;
    if (!ms.revealed.includes(key)) { ms.revealed.push(key); const o = m.objectives.find((x) => x.id === objId);
      if (ms.active.includes(m.id)) post({ kind: 'system', mission: 'reveal', text: o ? '◆ New objective: ' + o.text : '▶ Mission: ' + m.title + ' · ' + m.goal }); }
    return;
  }
  if (status !== 'done' && status !== 'failed') return;
  if (!ms.active.includes(m.id)) return; // only active missions change
  const st = ms.objectives[m.id];
  const targets = objId ? m.objectives.filter((o) => o.id === objId) : required(m).filter((o) => st[o.id] === 'open');
  for (const o of targets) {
    if (st[o.id] !== 'open') continue;
    st[o.id] = status;
    post({ kind: 'system', mission: status, text: (status === 'done' ? '✓ Objective: ' : '✕ Objective failed: ') + o.text + (o.optional ? ' (optional)' : '') + (u.note ? ' · ' + String(u.note).slice(0, 160) : '') });
  }
  if (required(m).every((o) => st[o.id] !== 'open')) close(g, ms, m, post);
}

function sideJob(ms: MissionState, s: NonNullable<NarratorTurn['side']>[number], post: (e: Omit<Entry, 'id'>) => void) {
  if (!s || typeof s !== 'object' || !s.id) return;
  const id = String(s.id).slice(0, 40), j = ms.side.find((x) => x.id === id);
  const status: ObjStatus = s.status === 'done' || s.status === 'failed' ? s.status : 'open';
  if (!j) {
    if (!s.title || ms.side.length >= SIDE_MAX * 2) return;
    ms.side.push({ id, title: String(s.title).slice(0, 80), text: String(s.text || '').slice(0, 300), status });
    post({ kind: 'system', mission: 'side', text: '◇ Side job: ' + String(s.title).slice(0, 80) });
    return;
  }
  if (s.title) j.title = String(s.title).slice(0, 80);
  if (s.text) j.text = String(s.text).slice(0, 300);
  if (status !== 'open' && j.status === 'open') { j.status = status; post({ kind: 'system', mission: status, text: (status === 'done' ? '✓ Side job: ' : '✕ Side job failed: ') + j.title }); }
}

/** A mission closes: done when every required objective is done, failed when any failed. Its end fires, then next. */
function close(g: GameState, ms: MissionState, m: Mission, post: (e: Omit<Entry, 'id'>) => void) {
  const st = ms.objectives[m.id], ok = required(m).every((o) => st[o.id] === 'done');
  ms.active = ms.active.filter((x) => x !== m.id);
  (ok ? ms.done : ms.failed).push(m.id);
  post({ kind: 'system', mission: ok ? 'complete' : 'failed', text: (ok ? '✓ MISSION COMPLETE: ' : '✕ MISSION OVER: ') + m.title });
  const opts = listOf(m.next).filter((id) => missionById(g, id));
  let next: Mission | null = null;
  if (opts.length === 1) next = missionById(g, opts[0]);
  else if (opts.length > 1) ms.choose = { from: m.id, options: opts };
  if (m.end) {
    ms.ending = endingOf(g, ms, m, next);
    if (m.end.kind === 'campaign') { ms.epilogueDue = true; if (g.phase === 'story' && !g.combat) beginEpilogue(g, ms); }
    else { ms.act = { scene: g.story.scene.n + 1, xp: xpNow(g) }; ms.opening = next ? next.id : m.id; }
  }
  if (next) activate(g, ms, next, post);
}

function beginEpilogue(g: GameState, ms: MissionState) {
  ms.epilogueDue = false;
  // The campaign is over: open checks and pushes are dropped; the Narrator's last turn is the epilogue.
  g.checks = []; g.overreach = []; g.story.await = 'narrator'; g.story.work = { kind: 'epilogue' };
}

function endingOf(g: GameState, ms: MissionState, m: Mission, next: Mission | null): Ending {
  const M = memoryOf(g), from = ms.act.scene;
  const recap = [
    ...M.chapters.filter((c) => c.scenes[1] >= from).map((c) => c.title + ': ' + c.summary),
    ...M.scenes.filter((s) => s.n >= from).map((s) => s.summary),
  ].filter(Boolean);
  if (!recap.length) recap.push(...g.story.journal.slice(-4));
  const done = missionsData(g).filter((x) => ms.done.includes(x.id) || ms.failed.includes(x.id) || x.id === m.id)
    .flatMap((x) => x.objectives.filter((o) => ms.objectives[x.id]?.[o.id] === 'done').map((o) => o.text));
  const xp = Object.values(g.characters).map((c) => ({ charId: c.id, name: c.name, xp: Math.max(0, (c.xp || 0) - (ms.act.xp[c.id] || 0)) }));
  const choices = M.facts.filter((f) => f.importance >= 4 && !f.secret && f.scene >= from).map((f) => f.text).slice(-6);
  return { kind: m.end!.kind, mission: m.id, title: m.end!.title, recap: recap.slice(-8), done: done.slice(-12), xp, choices, next: next ? { title: next.title, goal: next.goal } : null, seq: g.seq };
}

/** The campaign's job-board NPC stands in its zone as a neutral token (added to the zone's people at session start). */
export function placeBoardNpc(g: GameState) {
  const c: any = g.campaign, b: BoardNpc | undefined = c?.board_npc; if (!b) return;
  const z = (c.zones || []).find((x: any) => x.id === b.zone); if (!z) return;
  z.npcs = z.npcs || [];
  if (!z.npcs.some((n: any) => n.name === b.name)) z.npcs.push({ name: b.name, side: 'neutral', tier: 'soldier', weapon: 'service_pistol', at: b.at, ...(b.portrait ? { portrait: b.portrait } : {}), tags: ['job_board'] });
}

// ---------- the Narrator's view (the per-turn MISSION block) ----------
/** A compact block for the turn prompt: the active missions, their goals and open objectives (hidden ones on a
 * Narrator-only line), side jobs, a branch to choose, and an act just ended. Empty without missions. */
export function missionBrief(g: GameState): string {
  const ms = missionsOf(g); if (!ms) return '';
  const out: string[] = [];
  for (const id of ms.active) {
    const m = missionById(g, id); if (!m) continue;
    const st = ms.objectives[id] || {}, open = m.objectives.filter((o) => st[o.id] === 'open');
    const shown = open.filter((o) => objVisible(ms, m, o)), secret = open.filter((o) => !objVisible(ms, m, o));
    out.push(`${m.id}${m.hidden && !ms.revealed.includes(m.id) ? ' (hidden from players)' : ''}: ${m.goal}`);
    if (shown.length) out.push('  open: ' + shown.map((o) => o.id + ' ' + o.text + (o.optional ? ' (optional)' : '')).join('; '));
    if (secret.length) out.push('  hidden (Narrator only; reveal when found): ' + secret.map((o) => o.id + ' ' + o.text).join('; '));
  }
  const side = ms.side.filter((j) => j.status === 'open');
  if (side.length) out.push('side jobs: ' + side.map((j) => j.id + ' ' + j.title).join('; '));
  const b: BoardNpc | undefined = (g.campaign as any)?.board_npc;
  if (b) out.push(`job board: ${b.name} (${b.zone} ${b.at}) offers side jobs in character; add them with side[]`);
  if (ms.choose) out.push('CHOOSE NEXT (missionNext, when the story decides): ' + ms.choose.options.map((id) => id + ' ' + (missionById(g, id)?.title || '')).join(' | '));
  if (!out.length) return '';
  return 'MISSION (active; mark objectives in missions[] when achieved):\n' + out.join('\n');
}
/** Every mission for the campaign block (Narrator only): static per campaign, so it sits in the cached prefix and
 * costs nothing per turn. The per-turn MISSION block carries only the live state. */
export function missionsCampaign(c: { missions?: Mission[]; board_npc?: BoardNpc } | null | undefined): string {
  const list = Array.isArray(c?.missions) ? c!.missions! : []; if (!list.length) return '';
  return 'MISSIONS (the players see titles, goals and objectives on their mission board; hidden ones only once you reveal them):\n' + list.map((m) => [
    `- ${m.id} (act ${m.act}): ${m.title}. Goal: ${m.goal}${m.hidden ? ' [hidden mission]' : ''}`,
    ...m.objectives.map((o) => `    ${o.id}${o.optional ? ' (optional)' : ''}${o.hidden ? ' [hidden]' : ''}: ${o.text}. Done when: ${o.done_when}`),
    listOf(m.next).length ? '    next: ' + listOf(m.next).join(' or ') : '',
    m.end ? `    ends the ${m.end.kind}: ${m.end.title}` : '',
    m.narrator_notes ? '    notes: ' + m.narrator_notes : '',
  ].filter(Boolean).join('\n')).join('\n');
}
/** The ACT ENDED line for the Narrator's next turn, if an act just ended. */
export function actOpening(g: GameState): string {
  const ms = missionsOf(g); if (!ms?.opening) return '';
  const m = missionById(g, ms.opening);
  if (ms.choose) return 'ACT ENDED: the next mission is not chosen yet. Let the story decide between ' + ms.choose.options.map((id) => missionById(g, id)?.title || id).join(' and ') + ', then set missionNext.';
  return m && ms.active.includes(m.id) ? `ACT ENDED: open the next mission ${m.title} with a clear scene and a clear first goal (${m.goal}).` : '';
}
/** The epilogue job, for the Narrator's last turn. */
export function epilogueJob(g: GameState): string {
  const ms = missionsOf(g), m = ms?.ending ? missionById(g, ms.ending.mission) : null;
  return 'THE CAMPAIGN HAS ENDED. Write the epilogue in narration: what became of each character and the people they touched, in 150 to 300 words, honouring every choice the players made. ' + (m?.end?.epilogue_guidance ? 'Guidance: ' + m.end.epilogue_guidance + ' ' : '') + 'No checks, no fights, no hooks, no new scene; this is the last word.';
}

// ---------- the board (what a player sees) ----------
export interface BoardObjective { id: string; text: string; optional: boolean; status: ObjStatus }
export interface BoardMission { id: string; title: string; act: number; summary: string; goal: string; objectives: BoardObjective[]; status: 'active' | 'done' | 'failed' }
export interface Board { has: boolean; open: number; current: BoardMission[]; side: SideJob[]; past: BoardMission[]; choosing: boolean; complete: boolean }
/** The mission board for players: no hidden missions or objectives, no Narrator notes, no done_when. */
export function missionBoard(g: GameState): Board {
  const ms = missionsOf(g);
  if (!ms) return { has: false, open: 0, current: [], side: [], past: [], choosing: false, complete: !!g.story.complete };
  const view = (id: string, status: BoardMission['status']): BoardMission | null => {
    const m = missionById(g, id); if (!m || !visible(ms, m)) return null;
    const st = ms.objectives[id] || {};
    return { id, title: m.title, act: m.act, summary: m.summary, goal: m.goal, status,
      objectives: m.objectives.filter((o) => objVisible(ms, m, o)).map((o) => ({ id: o.id, text: o.text, optional: !!o.optional, status: st[o.id] || 'open' })) };
  };
  const current = ms.active.map((id) => view(id, 'active')).filter(Boolean) as BoardMission[];
  const past = [...ms.done.map((id) => view(id, 'done')), ...ms.failed.map((id) => view(id, 'failed'))].filter(Boolean) as BoardMission[];
  const open = current.reduce((n, m) => n + m.objectives.filter((o) => o.status === 'open').length, 0) + ms.side.filter((j) => j.status === 'open').length;
  return { has: true, open, current, side: ms.side, past, choosing: !!ms.choose, complete: !!g.story.complete };
}

// ---------- campaign data ----------
/** Everything wrong with a campaign's missions and board NPC, in plain words. */
export function validateMissions(c: any): string[] {
  const errs: string[] = [], need = (cond: any, msg: string) => { if (!cond) errs.push(msg); };
  if (c?.missions != null) {
    if (!Array.isArray(c.missions)) return ['missions must be a list.'];
    const ids = new Set<string>();
    for (const m of c.missions) {
      need(m && typeof m.id === 'string' && /^[a-z0-9_]+$/.test(m.id), 'Every mission needs an id (lowercase letters, digits, underscores).');
      if (!m || typeof m !== 'object') continue;
      need(!ids.has(m.id), 'Mission "' + m.id + '" appears twice.'); ids.add(m.id);
      for (const f of ['title', 'summary', 'goal']) need(typeof m[f] === 'string' && m[f], 'Mission "' + m.id + '" needs ' + f + '.');
      need(Number.isInteger(m.act) && m.act >= 1, 'Mission "' + m.id + '" needs an act number (1 or more).');
      need(Array.isArray(m.objectives) && m.objectives.length, 'Mission "' + m.id + '" needs objectives.');
      const oids = new Set<string>();
      for (const o of m.objectives || []) {
        need(o && typeof o.id === 'string' && o.id && typeof o.text === 'string' && o.text && typeof o.done_when === 'string' && o.done_when, 'Mission "' + m.id + '": every objective needs id, text and done_when.');
        need(!oids.has(o?.id), 'Mission "' + m.id + '": objective "' + o?.id + '" appears twice.'); oids.add(o?.id);
      }
      need((m.objectives || []).some((o: any) => !o?.optional), 'Mission "' + m.id + '" needs at least one required objective.');
      if (m.end != null) need(m.end && ['act', 'campaign'].includes(m.end.kind) && typeof m.end.title === 'string' && m.end.title, 'Mission "' + m.id + '": end needs kind (act or campaign) and title.');
    }
    for (const m of c.missions) for (const n of listOf(m?.next)) need(ids.has(n), 'Mission "' + m.id + '" leads to unknown mission "' + n + '".');
    for (const m of c.missions) need(m?.next == null || typeof m.next === 'string' || (Array.isArray(m.next) && m.next.every((x: any) => typeof x === 'string')), 'Mission "' + m?.id + '": next is a mission id or a list of them.');
    const led = new Set(c.missions.flatMap((m: any) => listOf(m?.next)));
    need(!c.missions.length || c.missions.some((m: any) => !led.has(m?.id)), 'No mission starts the campaign (every mission is led to by another).');
  }
  if (c?.board_npc != null) {
    const b = c.board_npc, zone = (c.zones || []).find((z: any) => z.id === b?.zone);
    need(b && typeof b.name === 'string' && b.name && typeof b.at === 'string' && b.at, 'board_npc needs name, zone and at.');
    need(zone, 'board_npc is in unknown zone "' + b?.zone + '".');
  }
  return errs;
}
