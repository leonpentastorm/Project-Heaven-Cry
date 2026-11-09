// What the mission board, its toasts and the end screens show (spec: OOC, missions and end states). Pure functions of
// the game state, so they are tested without a browser (missionView.test.ts); missionBoard.tsx draws them.
import { missionBoard, missionsOf, openObjectives, hereCard, markersFor, zoneMap, campaignOf, type GameState, type Entry } from '@engine';
import { classLabel, emblemOf, heldClassId } from './classView';

export const MARK = { open: '☐', done: '✓', failed: '✕' } as const;
/** The header button: "MISSIONS · 3" (open objectives and side jobs), or null without missions. */
export function missionsButton(g: GameState | null): { label: string; count: number; title: string } | null {
  if (!g) return null;
  const b = missionBoard(g); if (!b.has) return null;
  return { label: b.complete ? 'MISSIONS · DONE' : 'MISSIONS · ' + b.open, count: b.open, title: b.complete ? 'The campaign is complete' : b.open + ' open objective' + (b.open === 1 ? '' : 's') };
}

export interface BoardRow { key: string; mark: string; text: string; optional: boolean; status: 'open' | 'done' | 'failed' }
export interface BoardCard { key: string; title: string; kicker: string; goal: string; summary: string; rows: BoardRow[]; status: 'active' | 'done' | 'failed' }
export function boardView(g: GameState) {
  const b = missionBoard(g);
  const card = (m: ReturnType<typeof missionBoard>['current'][number]): BoardCard => ({
    key: m.id, title: m.title, kicker: 'ACT ' + m.act + (m.status === 'done' ? ' · COMPLETE' : m.status === 'failed' ? ' · OVER' : ' · CURRENT'), goal: m.goal, summary: m.summary, status: m.status,
    rows: m.objectives.map((o) => ({ key: o.id, mark: MARK[o.status], text: o.text, optional: o.optional, status: o.status })),
  });
  return {
    has: b.has, complete: b.complete, choosing: b.choosing,
    current: b.current.map(card), past: b.past.map(card),
    side: b.side.map((j) => ({ key: j.id, mark: MARK[j.status], text: j.title, detail: j.text, status: j.status })),
  };
}

/** A toast for a mission log line (everyone sees it), or null. */
export function toastFor(e: Entry): { kicker: string; text: string; tone: 'done' | 'failed' | 'info' } | null {
  const strip = (t: string) => t.replace(/^[✓✕▶◆◇■]\s*/, '').replace(/^(Objective failed|Objective|Side job failed|Side job|Mission|New objective|MISSION COMPLETE|MISSION OVER):\s*/, '');
  switch (e.mission) {
    case 'done': return { kicker: /^✓ Side job/.test(e.text) ? '✓ SIDE JOB' : '✓ OBJECTIVE', text: strip(e.text), tone: 'done' };
    case 'failed': return { kicker: /^✕ Side job/.test(e.text) ? '✕ SIDE JOB' : /^✕ MISSION/.test(e.text) ? '✕ MISSION OVER' : '✕ OBJECTIVE', text: strip(e.text), tone: 'failed' };
    case 'complete': return { kicker: '✓ MISSION COMPLETE', text: strip(e.text), tone: 'done' };
    case 'start': return { kicker: '▶ NEW MISSION', text: strip(e.text), tone: 'info' };
    case 'reveal': return { kicker: '◆ NEW OBJECTIVE', text: strip(e.text), tone: 'info' };
    case 'side': return { kicker: '◇ SIDE JOB', text: strip(e.text), tone: 'info' };
    default: return null;
  }
}

/** The act-end card or the campaign-end screen, if one is due and this viewer hasn't closed it. */
export function endingView(g: GameState | null, seen: number[]) {
  const ms = g ? missionsOf(g) : null, e = ms?.ending; if (!g || !e) return null;
  if (e.kind === 'act') {
    if (seen.includes(e.seq)) return null;
    return { kind: 'act' as const, seq: e.seq, title: e.title, recap: e.recap, done: e.done, choices: e.choices,
      xp: e.xp.filter((x) => x.xp > 0).map((x) => ({ key: x.charId, text: x.name + ' +' + x.xp + ' XP' })),
      next: e.next ? { title: e.next.title, goal: e.next.goal } : g.story.missions?.choose ? { title: 'What comes next is still open', goal: 'The story decides.' } : null };
  }
  if (!g.story.complete || seen.includes(e.seq)) return null;
  const credits: string[] = Array.isArray((g.campaign as any)?.credits) ? (g.campaign as any).credits.filter((x: any) => typeof x === 'string') : [];
  return { kind: 'campaign' as const, seq: e.seq, title: e.title, epilogue: (e.epilogue || '').split(/\n\s*\n/).map((t) => t.trim()).filter(Boolean),
    cards: Object.values(g.characters).map((c) => ({ key: c.id, name: c.name, img: c.portrait || '', cls: c.classId ? classLabel(c) : 'No class', clsIcon: emblemOf(heldClassId(c)).icon, level: c.level, dead: !!c.dead, deeds: (c.deeds || []).slice(-4) })),
    credits };
}

// ---------- the quest board (UI pass, docs/design/ui-pass-shell.md 3.3): always open in the story's right column ----------
export type QuestGroupBy = 'area' | 'quest';
export interface QuestRow {
  key: string; mark: string; status: 'open' | 'done' | 'failed'; text: string; optional: boolean; side: boolean;
  /** The mission's title, shown when a group mixes missions (by Area). */
  mission: string;
  /** In this zone (by Quest it is tagged HERE). */
  here: boolean;
  /** "In The rear pad", or the markers' refs. */
  where: string; markers: { ref: string; tile: string }[]; steps: string[]; detail: string;
}
export interface QuestGroup { key: string; title: string; sub: string; count: number; rows: QuestRow[]; folded: boolean }
export interface QuestBoard { has: boolean; open: number; complete: boolean; choosing: boolean; zone: string; groups: QuestGroup[] }

/** The quest board's groups. by 'area' (the default, the town case): HERE · <zone>, one group per other zone, SOMEWHERE
 *  (no zone known), SIDE JOBS, then DONE and FAILED. by 'quest': one group per current mission (open objectives first),
 *  SIDE JOBS, then PAST (finished missions). Done, failed and past groups start folded. Pure: missionBoard for the
 *  missions, openObjectives for where each lies, hereCard for the steps and markersFor for the tiles. */
export function questGroups(g: GameState | null, by: QuestGroupBy = 'area'): QuestBoard {
  const none: QuestBoard = { has: false, open: 0, complete: false, choosing: false, zone: '', groups: [] };
  if (!g) return none;
  const b = missionBoard(g); if (!b.has) return none;
  let zone = '', zoneName = '';
  try { const z = zoneMap(g); zone = z.id; zoneName = z.name; } catch { /* no map yet */ }
  const zones = campaignOf(g)?.zones || [];
  const zname = (id: string) => zones.find((z) => z.id === id)?.name || id;
  const where = new Map(openObjectives(g).map((o) => [o.key, o.where] as const));
  let card: ReturnType<typeof hereCard> | null = null; try { card = hereCard(g, 'pc'); } catch { /* */ }
  let marks: ReturnType<typeof markersFor> = []; try { marks = markersFor(g, 'pc'); } catch { /* */ }
  const titleOf = new Map([...b.current, ...b.past].map((m) => [m.id, m.title] as const));
  const row = (mission: string, o: { id: string; text: string; optional: boolean; status: 'open' | 'done' | 'failed' }): QuestRow & { zone: string | null } => {
    const key = mission + '/' + o.id, w = where.get(key) || null, hc = card?.objectives.find((x) => x.key === key);
    const mk = marks.filter((m) => m.objective === key && m.kind === 'objective').map((m) => ({ ref: m.ref, tile: m.tile }));
    const here = o.status === 'open' && (!!hc?.here || (!!w?.zone && w.zone === zone) || (!!w && !w.zone && mk.length > 0));
    const z = o.status !== 'open' ? null : w?.zone || (here ? zone : null);
    return { key, mark: MARK[o.status], status: o.status, text: o.text, optional: o.optional, side: false, mission: titleOf.get(mission) || mission, here, zone: z,
      where: !here && z ? 'In ' + zname(z) : mk.length ? '◆ ' + mk.map((m) => m.ref).join(', ') : '', markers: mk, steps: o.status === 'open' ? (hc?.steps || []) : [], detail: '' };
  };
  const sideRow = (j: (typeof b.side)[number]): QuestRow => ({ key: 'side/' + j.id, mark: MARK[j.status], status: j.status, text: j.title, optional: false, side: true, mission: 'Side job', here: false, where: '', markers: [], steps: [], detail: j.text || '' });
  const openFirst = (rs: QuestRow[]) => [...rs.filter((r) => r.status === 'open'), ...rs.filter((r) => r.status !== 'open')];
  const grp = (key: string, title: string, rows: QuestRow[], sub = '', folded = false): QuestGroup => ({ key, title, sub, count: rows.length, rows, folded });
  const groups: QuestGroup[] = [];
  const sides = b.side.map(sideRow);
  if (by === 'quest') {
    for (const m of b.current) groups.push(grp('m:' + m.id, m.title.toUpperCase(), openFirst(m.objectives.map((o) => row(m.id, o))), m.goal));
    if (sides.length) groups.push(grp('side', 'SIDE JOBS', openFirst(sides)));
    if (b.past.length) groups.push(grp('past', 'PAST', b.past.map((m) => ({ key: 'past/' + m.id, mark: MARK[m.status === 'done' ? 'done' : 'failed'], status: m.status === 'done' ? 'done' as const : 'failed' as const, text: m.title, optional: false, side: false, mission: m.title, here: false, where: '', markers: [], steps: [], detail: m.goal })), '', true));
  } else {
    const all = b.current.flatMap((m) => m.objectives.map((o) => row(m.id, o)));
    const open = all.filter((r) => r.status === 'open');
    const hereRows = open.filter((r) => r.here);
    if (hereRows.length) groups.push(grp('here', 'HERE · ' + (zoneName || zone).toUpperCase(), hereRows));
    const elsewhere = new Map<string, QuestRow[]>();
    for (const r of open.filter((x) => !x.here && x.zone)) { const k = r.zone as string; elsewhere.set(k, [...(elsewhere.get(k) || []), r]); }
    for (const [z, rs] of elsewhere) groups.push(grp('z:' + z, 'IN ' + zname(z).toUpperCase(), rs));
    const somewhere = open.filter((x) => !x.here && !x.zone);
    if (somewhere.length) groups.push(grp('somewhere', 'SOMEWHERE', somewhere));
    const openSide = sides.filter((r) => r.status === 'open');
    if (openSide.length) groups.push(grp('side', 'SIDE JOBS', openSide));
    const pastRows = b.past.flatMap((m) => m.objectives.map((o) => row(m.id, o)));
    const done: QuestRow[] = [...all, ...pastRows].filter((r) => r.status === 'done');
    done.push(...sides.filter((r) => r.status === 'done'));
    const failed: QuestRow[] = [...all, ...pastRows].filter((r) => r.status === 'failed');
    failed.push(...sides.filter((r) => r.status === 'failed'));
    if (done.length) groups.push(grp('done', 'DONE', done, '', true));
    if (failed.length) groups.push(grp('failed', 'FAILED', failed, '', true));
  }
  // A row says its mission only where the group mixes missions (by Area; by Quest the group is the mission).
  for (const gr of groups) { const ms = new Set(gr.rows.map((r) => r.mission)); if (by === 'quest' || ms.size < 2) for (const r of gr.rows) r.mission = ''; }
  return { has: true, open: b.open, complete: b.complete, choosing: b.choosing, zone: zoneName || zone, groups: groups.map((x) => ({ ...x, rows: x.rows.map(({ zone: _z, ...r }: any) => r) })) };
}
