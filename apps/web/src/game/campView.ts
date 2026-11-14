// The camp, as data (survival-spec 13.8; rules 1.51): before node 1 every character picks one starting boon of three
// (three large cards: the line glyph, the name, the one sentence with its number from data, the line's word in its
// attribute's ink, the worth against the cap), and the camp's issue (the armour class now and the free fitting). Every
// word and number is read from the engine: the offers (g.run.boons), the boons' rows (relicRow, worthOf), the lines
// (lineOf, START_BOON), why a pick is refused (startBoonProblem), the issue (fitOf, free at the camp). CampScreen.tsx draws it.
import { type GameState, relicRow, worthOf, runWorth, BOON_CAP, startBoonProblem, START_BOON, lineOf, fitOf, armourGateWhy, CAMP, SKILLS, FACES } from '@engine';
import { ATTR_INK } from './classView';
import ASSETS from './assets.json';

const A = ASSETS as Record<string, string>;
/** A line's words and its attribute's ink (the alpha skill's attribute), from the data's line map. */
export function lineWord(line: string): { word: string; attr: string; ink: string } {
  const skill = Object.entries(START_BOON.lines).find(([, l]) => l === line)?.[0] || '', s = SKILLS.find((k) => k.id === skill);
  const attr = s?.attribute || '', name = s?.name || skill;
  return { word: (START_BOON.names[line] || line) + ' · ' + name, attr, ink: ATTR_INK[attr] || '#E7EBF3' };
}
export interface CampCardV { i: number; id: string; name: string; text: string; worth: number; worthLine: string; line: string; lineWord: string; ink: string; why: string | null }
export interface CampFitV { now: number; to: number | null; label: string; why: string | null; action: any | null }
export interface CampCharV { charId: string; name: string; mine: boolean; canPick: boolean; picked: string | null; main: string; second: string; cards: CampCardV[]; fit: CampFitV; worth: string }
export interface CampViewV { isHost: boolean; solo: boolean; chars: CampCharV[]; party: { id: string; name: string; initials: string; color: string; chosen: boolean; online: boolean }[]; waiting: string | null; canGo: boolean; backdrop: string; seed: string }

/** The camp's view for one player (null when the run is not at its camp). */
export function campView(g: GameState, me: string): CampViewV | null {
  const r = g.run; if (!r || r.state !== 'camp') return null;
  const isHost = me === g.hostId, online = g.players.filter((p) => p.online), solo = online.length <= 1;
  const chars: CampCharV[] = Object.values(g.characters).map((c) => {
    const offer = r.boons?.[c.id] || [], l = lineOf(c), held = (c.relics || []).find((id) => !!(relicRow(id) as any)?.lines) || null;
    const cards = offer.map((id, i) => { const row: any = relicRow(id), w = worthOf(id), line = (row?.lines || []).includes(l.main) ? l.main : (row?.lines || [])[0] || l.main, lw = lineWord(line);
      return { i, id, name: row?.name || id, text: row?.text || '', worth: w, worthLine: w + ' of your ' + BOON_CAP, line, lineWord: lw.word, ink: lw.ink, why: startBoonProblem(c, offer, id) }; });
    const f = fitOf(g, c), cls = c.armourClass || 0;
    const fit: CampFitV = f ? { now: cls, to: f.cls, label: 'Fit class ' + f.cls + ': free', why: f.why, action: { type: 'run/fit', charId: c.id } }
      : { now: cls, to: null, label: cls >= CAMP.issue_armour ? 'Class ' + cls + ': the camp issues up to class ' + CAMP.issue_armour : (armourGateWhy(c, cls + 1) || 'No heavier class can be fitted'), why: null, action: null };
    return { charId: c.id, name: c.name, mine: c.owner === me, canPick: (c.owner === me || isHost) && offer.length > 0, picked: held, main: l.main, second: l.second, cards, fit, worth: runWorth(c) + ' of ' + BOON_CAP };
  }).sort((a, b) => Number(b.mine) - Number(a.mine));
  const party = g.players.map((p) => { const c = Object.values(g.characters).find((x) => x.owner === p.id); return { id: p.id, name: p.name, initials: p.initials || '?', color: p.color || '#A3AEC2', online: !!p.online, chosen: !!c && !r.boons?.[c.id] }; });
  const left = chars.filter((x) => !x.picked && x.cards.length).length;
  const face = FACES.find((f) => f.id === 'medic');
  return { isHost, solo, chars, party, waiting: !solo && left ? 'Waiting for ' + left + (left === 1 ? ' pick' : ' picks') : null, canGo: isHost && !solo && left > 0 && chars.some((x) => x.picked),
    backdrop: (face?.backdrop && A[face.backdrop]) || '', seed: r.seed };
}
