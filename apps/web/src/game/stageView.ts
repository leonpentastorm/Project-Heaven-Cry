// The stage's end, as data (survival-spec 8.2; rules 1.44, build step 5): the boon pick after the Boss (three large cards
// per character), the next tile (two or three cards: setting, line, backdrop, Boss, boon theme), and the run's summary
// (stages cleared, nodes, the score, each stage's log, each character's level, class and boons). Everything is read from
// the engine: the offers (g.run.boons, g.run.tiles), the boons' words and worth (relicRow, worthOf, runWorth), why a
// pick is refused (boonProblem), the settings' cards (settingCard), the score (g.run.end). StageScreen.tsx draws it.
import { type GameState, type RunStageLog, relicRow, worthOf, capRoom, BOON_CAP, boonProblem, settingCard, SETTING, keptDraft, runRetireProblem, CLASS } from '@engine';
import ASSETS from './assets.json';

const A = ASSETS as Record<string, string>;
export interface BoonCardV { i: number; id: string; name: string; text: string; worth: number; worthLine: string; why: string | null }
export interface BoonPickV { charId: string; name: string; mine: boolean; canPick: boolean; worth: string; cards: BoonCardV[] }
export interface TileCardV { id: string; setting: string; name: string; line: string; boss: string; theme: string; boons: string[]; art: string; awaiting: string[]; leans: { initials: string; color: string; name: string }[] }
export interface StageRowV { stage: number; setting: string; nodes: number; fights: string; kills: number; credits: number; steps: number; boons: string }
export interface MemberV { id: string; name: string; level: number; classLine: string; boons: string; mine: boolean }
export interface SummaryV { kicker: string; title: string; lines: string[]; stages: StageRowV[]; members: MemberV[]; how: 'lost' | 'retired' }
export interface StageViewV {
  stage: number; state: string; isHost: boolean; solo: boolean;
  boons: BoonPickV[]; tiles: TileCardV[]; waiting: string | null; canGo: boolean; canRetire: boolean; myTile: string | null;
  summary: SummaryV | null;
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1);
const plural = (n: number, w: string) => n + ' ' + w + (n === 1 ? '' : 's');
/** A boon pool's theme in words (the data's pool id). */
const THEME: Record<string, string> = { discipline: 'Discipline', streets: 'Streets', war: 'War', machine: 'Machine', faith: 'Faith', survival: 'Survival' };

export function stageView(g: GameState, me: string): StageViewV | null {
  const r = g.run; if (!r) return null;
  const isHost = me === g.hostId, pl = (id: string) => g.players.find((p) => p.id === id), online = g.players.filter((p) => p.online), solo = online.length <= 1;
  const boons: BoonPickV[] = Object.entries(r.boons || {}).map(([cid, offer]) => {
    const c = g.characters[cid];
    return { charId: cid, name: c?.name || cid, mine: c?.owner === me, canPick: c?.owner === me || isHost, worth: (c ? capRoom(c) : 0) + ' of ' + BOON_CAP,
      cards: offer.map((id, i) => { const row = relicRow(id)!, w = worthOf(id);
        return { i, id, name: row?.name || id, text: row?.text || '', worth: w, worthLine: w ? 'Uses ' + w + ' boon room · ' + Math.max(0, (c ? capRoom(c) : 0) - w) + ' left after' : 'Uses no boon room', why: c ? boonProblem(c, offer, id) : null }; }) };
  }).sort((a, b) => Number(b.mine) - Number(a.mine));
  const tiles: TileCardV[] = (r.tiles || []).map((t) => {
    const s = settingCard(t.setting)!, art = s?.backdrop && A[s.backdrop] ? A[s.backdrop] : '';
    return { id: t.id, setting: t.setting, name: s?.name || t.setting, line: s?.line || '', boss: s?.boss?.name || '', theme: THEME[s?.pool] || cap(s?.pool || ''), boons: t.boons.map((id) => relicRow(id)?.name || id), art, awaiting: s?.awaiting || [],
      leans: Object.entries(r.leans).filter(([, id]) => id === t.id).map(([pid]) => ({ initials: pl(pid)?.initials || '?', color: pl(pid)?.color || '#A3AEC2', name: pl(pid)?.name || '?' })) };
  });
  const leaned = online.filter((p) => r.leans[p.id]).length;
  const waiting = r.state === 'tile' && !solo && leaned > 0 && leaned < online.length ? 'Waiting for ' + plural(online.length - leaned, 'player') : r.state === 'boon' && boons.some((b) => !b.mine) && !boons.some((b) => b.mine) ? 'Waiting for the others to pick' : null;
  let summary: SummaryV | null = null;
  const e = r.end;
  if (r.state === 'over' && e) {
    const stages: StageRowV[] = (e.stages || []).map((s: RunStageLog) => ({ stage: s.stage, setting: SETTING[s.setting]?.name || s.setting, nodes: s.nodes, fights: s.won + ' of ' + s.fights + ' won', kills: s.kills, credits: s.credits, steps: s.steps,
      boons: Object.entries(s.boons).map(([cid, id]) => (g.characters[cid]?.name || cid) + ': ' + (relicRow(id)?.name || id)).join(' · ') || 'none' }));
    const members: MemberV[] = Object.values(g.characters).map((c) => ({ id: c.id, name: c.name, level: e.levels[c.id] ?? c.level, mine: c.owner === me,
      classLine: c.classId ? ((CLASS as any)[c.classId]?.name || cap(c.classId)) : 'no class yet', boons: (e.boons?.[c.id] || []).map((id) => relicRow(id)?.name || id).join(', ') || 'none' }));
    summary = { how: e.how, kicker: 'SURVIVAL · SEED ' + r.seed, title: e.how === 'retired' ? 'The squad retired' : 'The squad fell',
      lines: [plural(e.cleared, 'stage') + ' cleared', plural(e.nodes, 'stop') + ' walked', (e.how === 'lost' ? 'fell at stage ' + e.stage : 'retired after stage ' + e.stage), 'renown ' + (e.renown || 0)], stages, members };
  }
  return { stage: r.stage, state: r.state, isHost, solo, boons, tiles, waiting, canGo: isHost && !solo && leaned > 0 && r.state === 'tile', canRetire: !runRetireProblem(g, me), myTile: r.leans[me] || null, summary };
}
/** The record "keep this character as a draft" saves to the library (the engine's keptDraft). */
export const draftOf = (g: GameState, charId: string) => { const c = g.characters[charId]; return c && g.run ? keptDraft(c, g.run.seed, g.run.stage) : null; };
