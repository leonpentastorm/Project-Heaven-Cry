// THE SAFE NODES' FULL-SCREEN VIEW (rules 1.46; survival-spec 8.3 "The Forge uses this frame", rule 47). Every safe node
// that is not the shop (the Forge, a training ground, a shrine, a crossroads, a rest) opens in the shop's full-screen
// frame: its face (the armourer, the drill sergeant, the shrine's rolled patron, the crossroads broker, the medic) with
// a greet line from data, the node's tabs, large choice cards (each `runOptions` row of rules 1.43: what you gain, what
// it costs, the engine's reason when it can't be taken), the Give tab (give.ts), your character, and the visit's log.
// Nothing here decides anything: the options, prices and reasons are progress.ts's, the gives give.ts's.
import { type Character, type Rarity, gearAt } from '../character';
import { WEAPON, ITEM } from '../data';
import { FAITH_PATRON } from '../belief';
import { rngFor, die } from '../rng';
import { gearPreview } from '../gearpreview';
import { type RunOption, runOptions, nextGrade } from './progress';
import { runNode, runSetting, type RunState } from './state';
import { SETTING } from './encounter';
import { MAP_DATA } from './map';
import { faceFor } from './shop';
import { type MeV, meBlock } from './shopview';
import { relicRow, worthOf, capRoom, runWorth, BOON_CAP } from './power';
import type { GameState } from '../game';

/** A place's tab: its id, its word, and the option groups it holds (the Give tab holds none: it draws `giveView`). */
export interface PlaceTabV { id: string; label: string; groups: RunOption['group'][] }
/** One large choice card: the engine's option, and for a grade step the numbers before and after (the gear preview),
 * for a Relic property its worth against the character's cap. */
export interface PlaceCardV { o: RunOption; id: string | null; rarity: Rarity | null; lines: { label: string; before: string; after: string }[]; worth: string | null }
/** The full-screen place for one player (rules 1.46). */
export interface PlaceViewV {
  node: string; kind: string; word: string; setting: string;
  face: { id: string; name: string; role: string; portrait: string; portraitPending: boolean; fallback: string | null; patron: string | null; backdrop: string; backdropPending: boolean; backdropFallback: string | null; line: string };
  tabs: PlaceTabV[]; cards: PlaceCardV[]; me: MeV | null; canAct: boolean;
  party: { id: string; name: string; initials: string; color: string; online: boolean; mine: boolean; marked: boolean }[];
  log: string[]; worth: string;
}
/** The tabs each place shows (the Give tab last on every one). */
const TABS: Record<string, PlaceTabV[]> = {
  forge: [{ id: 'upgrade', label: 'Upgrade', groups: ['grade', 'relic'] }, { id: 'stock', label: 'Mods and pieces', groups: ['forge'] }, { id: 'fit', label: 'Armour fitting', groups: ['fit'] }],
  training: [{ id: 'train', label: 'Training', groups: ['train'] }],
  rest: [{ id: 'train', label: 'Small training', groups: ['train'] }],
  shrine: [{ id: 'shrine', label: 'The shrine', groups: ['shrine'] }],
  event: [{ id: 'trade', label: 'Trades', groups: ['trade'] }],
};
/** The node kinds that open as a full-screen place (the shop has its own view, shopview.ts). */
export const PLACE_KINDS = Object.keys(TABS);
/** Is the party standing at a place that opens full screen (its visit open, on the map, not a pick waiting)? */
export const placeOpen = (g: { run?: RunState | null }): boolean => { const r = g.run; if (!r || r.state !== 'map' || !r.visit || r.visit.node !== r.at) return false; return PLACE_KINDS.includes(r.visit.kind); };
const nameOf = (id: string): string => (WEAPON[id] as any)?.name || (ITEM[id] as any)?.name || id;

/** The full-screen place's view for player `me` (their own character, or `charId`); null when no place is open. */
export function placeView(g: GameState, me: string, charId?: string | null): PlaceViewV | null {
  if (!placeOpen(g)) return null;
  const r = g.run!, v = r.visit!, n = runNode(r, v.node)!, setting = runSetting(r), f = faceFor(v.kind, setting);
  const c: Character | null = (charId && g.characters[charId]) || Object.values(g.characters).find((x) => x.owner === me) || null;
  const lines = f?.lines?.greet || [], line = lines.length ? lines[die(rngFor(r.seed, v.node + '#line#0'), lines.length) - 1] : '';
  const patron = v.kind === 'shrine' && v.patron ? FAITH_PATRON[v.patron] : null;
  const cards: PlaceCardV[] = c ? runOptions(g, c.id).map((o) => {
    const a: any = o.action, it = (o.group === 'grade' || o.group === 'relic') && a.where != null ? gearAt(c, a.where) : null, to = it ? nextGrade(it.rarity) : null;
    const before = it ? gearPreview(c, { id: it.id, rarity: it.rarity }) : null, after = it && to ? gearPreview(c, { id: it.id, rarity: to }) : null;
    const diff = before && after ? after.lines.filter((l) => l.num != null).map((l) => ({ label: l.label, before: before.lines.find((x) => x.key === l.key)?.value ?? '—', after: l.value })).filter((l) => l.before !== l.after) : [];
    const prop = o.group === 'relic' && a.prop ? a.prop as string : null;
    const id = it ? it.id : o.group === 'forge' ? (v.stock?.[a.slot]?.id || null) : o.group === 'train' && a.weapon ? a.weapon : null;
    return { o, id, rarity: it ? it.rarity : null, lines: diff, worth: prop ? worthOf(prop) + ' of your ' + BOON_CAP + '; ' + capRoom(c) + ' left' : null };
  }) : [];
  const party = g.players.map((p) => ({ id: p.id, name: Object.values(g.characters).find((x) => x.owner === p.id)?.name || p.name, initials: p.initials || '?', color: p.color || '#A3AEC2', online: p.online, mine: p.id === me, marked: !!r.leans[p.id] }));
  return {
    node: v.node, kind: v.kind, word: (n.gate ? 'Gate' : (MAP_DATA.words as Record<string, string>)[v.kind] || v.kind), setting: SETTING[setting]?.name || setting,
    face: { id: f?.id || '', name: patron ? patron.name : f?.name || '', role: patron ? 'Patron · the shrine' : f?.role || '', portrait: f?.portrait || '', portraitPending: !!f?.portrait_pending, fallback: f?.fallback ?? null,
      patron: patron ? v.patron! : null, backdrop: f?.backdrop || '', backdropPending: !!f?.backdrop_pending, backdropFallback: f?.backdrop_fallback ?? null, line },
    tabs: [...(TABS[v.kind] || []), { id: 'give', label: 'Give', groups: [] }], cards, me: c ? meBlock(c) : null, canAct: !!c && (c.owner === me),
    party, log: v.log || [], worth: c ? runWorth(c) + ' of ' + BOON_CAP : '',
  };
}
/** The name of the thing a card is about, for its heading (a weapon's, a piece's), or null. */
export const placeCardName = (x: PlaceCardV): string | null => (x.id ? nameOf(x.id) : null);
/** A Relic property's name and text, for its large card (rules 1.43 rule 38). */
export const propCard = (id: string) => { const row = relicRow(id); return row ? { name: row.name, text: String((row as any).text || ''), worth: worthOf(id) } : null; };
