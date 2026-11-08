// What the mission board, its toasts and the end screens show (spec: OOC, missions and end states). Pure functions of
// the game state, so they are tested without a browser (missionView.test.ts); missionBoard.tsx draws them.
import { missionBoard, missionsOf, type GameState, type Entry } from '@engine';
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
