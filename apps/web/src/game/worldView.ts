// World Play 1.7 on screen (rules revision 1.7; docs/design/world-play-spec.md; part A's view helpers in
// packages/engine/src/world.ts). Pure: everything here reads a player's view of the game and turns the engine's view
// helpers (npcView, approachOptions, hazardTilesFor, markersFor, hereCard, carriedOf, cacheView) into what the area
// map, the combat grid and the panels draw. No rule is computed here: odds, costs, reasons and effects come from the
// engine; this file only says them in plain words and picks the looks.
// Colour = meaning (docs/design/colour-system.md): danger red for mines and damage, each hazard kind its own tint with
// its word and glyph, success green for a safe path, white for markers (still to do), neutrals for kind badges.
import { type GameState, type Character, type TalkOption, type Marker, type HazardTile, type MapObject, type Npc,
  FAIL_HURT, HAZARD, SKILL, WORLD_AP, TALK_RANGE, condName, refOf, dist, positionsOf, npcsOf, isCache, carriedOf, carryable, carriedKg, carryLimit,
  hazardTilesFor, markersFor, hereCard, npcView, approachOptions, hazardsFor, avatarOf, kindKg, zoneMap, apLeft, storyObjects, blocksMove, standable } from '@engine';

// ---------- kinds: a robot looks like a robot ----------
export const KIND_WORD: Record<string, string> = { human: 'HUMAN', robot: 'ROBOT', drone: 'DRONE', crawler: 'CRAWLER', beast: 'BEAST', machine: 'MACHINE' };
/** The badge letters on a token (humans, the default, carry none: the face says it). */
export const KIND_BADGE: Record<string, string> = { robot: 'BOT', drone: 'DRN', crawler: 'CRW', beast: 'BST', machine: 'MCH' };
/** Kinds that aren't people: their art is never recast from the player-card pool. */
export const NOT_PERSON = new Set(['robot', 'drone', 'beast', 'machine']);
/** A small kind badge for a token (bottom right): neutral ink with its word, never a hue (kinds carry no meaning colour). */
export function kindBadge(kind: string | undefined, big = true): { has: boolean; text: string; title: string; style: string } {
  const k = kind || 'human', text = KIND_BADGE[k] || '';
  return { has: !!text, text, title: KIND_WORD[k] || k.toUpperCase(),
    style: 'position: absolute; z-index: 4; right: -2px; bottom: -2px; padding: 0 ' + (big ? 3 : 1) + 'px; border-radius: 3px; font-size: ' + (big ? 8 : 5) + 'px; font-weight: 700; line-height: ' + (big ? 12 : 7) + 'px; letter-spacing: 0.04em; pointer-events: none; background: #1C2536; color: #E7EBF3; border: 1px solid #3B475D' };
}
/** The art id a person on the map shows (its own avatar, else the engine's pick by kind; '' for beasts: badge only). */
export const faceOf = (g: GameState, n: { id: string; name: string; kind?: string; avatar?: string; portrait?: string }) => avatarOf(g, n);

// ---------- hazards ----------
export interface HazardLook { ink: string; glyph: string; word: string }
// Text-presentation selectors keep ☢ and ♨ from turning into emoji.
export const HAZARD_LOOK: Record<string, HazardLook> = {
  minefield: { ink: '#F65157', glyph: '✱', word: 'MINEFIELD' },
  fire: { ink: '#F68A38', glyph: '♨︎', word: 'FIRE' },
  radiation: { ink: '#E3BF51', glyph: '☢︎', word: 'RADIATION' },
  gas: { ink: '#40BAA0', glyph: '≋', word: 'GAS' },
  collapse: { ink: '#A3AEC2', glyph: '▼', word: 'COLLAPSE' },
};
export const SAFE_INK = '#6FEA77';
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + ((n >> 16) & 255) + ', ' + ((n >> 8) & 255) + ', ' + (n & 255) + ', ' + a + ')'; };
export const hazardLook = (kind: string): HazardLook => HAZARD_LOOK[kind] || { ink: '#F65157', glyph: '!', word: String(kind || 'HAZARD').toUpperCase() };
/** What one hazard tile draws: a tinted, hatched layer in the kind's ink (heavier for heavy), the glyph, and words. */
export interface HazardCell { id: string; kind: string; layer: string; glyph: string; glyphStyle: string; title: string; safe: boolean; spent: boolean }
export function hazardCells(tiles: HazardTile[], big = true): Map<string, HazardCell> {
  const out = new Map<string, HazardCell>();
  for (const t of tiles) {
    if (out.has(t.tile)) continue;
    const L = hazardLook(t.kind), heavy = t.severity === 'heavy';
    const a = heavy ? 0.3 : 0.18, hatch = 'repeating-linear-gradient(45deg, ' + rgba(L.ink, a + 0.12) + ' 0 3px, ' + rgba(L.ink, a * 0.4) + ' 3px 8px)';
    const layer = t.safe ? 'position: absolute; inset: 1px; z-index: 1; pointer-events: none; box-sizing: border-box; border-radius: 2px; background: ' + rgba(SAFE_INK, 0.14) + '; border: 2px dashed ' + SAFE_INK
      : 'position: absolute; inset: 0; z-index: 1; pointer-events: none; box-sizing: border-box; border-radius: 2px; background: ' + hatch + '; box-shadow: inset 0 0 0 1px ' + rgba(L.ink, heavy ? 0.85 : 0.55);
    const glyph = t.safe ? '✓' : t.spent ? '◌' : L.glyph;
    out.set(t.tile, { id: t.id, kind: t.kind, layer, glyph, safe: t.safe, spent: t.spent,
      glyphStyle: 'position: absolute; left: 2px; top: 1px; z-index: 2; font-size: ' + (big ? 11 : 6) + 'px; font-weight: 700; line-height: 1; pointer-events: none; color: ' + (t.safe ? SAFE_INK : t.spent ? '#A3AEC2' : L.ink) + '; text-shadow: 0 0 2px #05070B',
      title: (t.name || L.word) + ' (' + t.severity + ')' + (t.safe ? ' · safe path: the squad walks it unharmed' : t.spent ? ' · this mine is spent' : ' · ' + hazardHit(t.kind, t.severity)) });
  }
  return out;
}
/** What a hazard does to whoever walks into it, in plain words (the numbers are data/world_play.json's). */
export function hazardHit(kind: string, severity: string): string {
  const d: any = HAZARD[kind]; if (!d) return 'it hurts';
  const dmg = severity === 'heavy' ? d.damage?.heavy : d.damage?.light, cond = d.condition ? (severity === 'heavy' ? d.condition.heavy : d.condition.light) || d.condition.light : '';
  const parts = [dmg ? dmg + ' damage' + (d.save_halves ? ' (a save halves it)' : '') : '', cond ? (dmg ? '' : (d.save ? 'a save or ' : '')) + condName(cond) : ''].filter(Boolean);
  return 'entering a tile: ' + (parts.join(' and ') || 'it hurts') + (d.stops ? '; it stops your move' : '');
}
/** The legend under the map: one entry per hazard kind on it (word + swatch + glyph), and the safe path if any. */
export function hazardLegend(tiles: HazardTile[]): { key: string; text: string; glyph: string; swatch: string; glyphStyle: string }[] {
  const kinds = [...new Set(tiles.filter((t) => !t.safe).map((t) => t.kind))], out = kinds.map((k) => { const L = hazardLook(k);
    return { key: 'hz-' + k, text: L.word.charAt(0) + L.word.slice(1).toLowerCase() + ' (hazard)', glyph: L.glyph, glyphStyle: 'font-size: 12px; font-weight: 700; color: ' + L.ink,
      swatch: 'width: 12px; height: 12px; border-radius: 2px; background: repeating-linear-gradient(45deg, ' + rgba(L.ink, 0.45) + ' 0 3px, ' + rgba(L.ink, 0.1) + ' 3px 6px); border: 1px solid ' + L.ink }; });
  if (tiles.some((t) => t.safe)) out.push({ key: 'hz-safe', text: 'Safe path (squad)', glyph: '✓', glyphStyle: 'font-size: 12px; font-weight: 700; color: ' + SAFE_INK, swatch: 'width: 12px; height: 12px; border-radius: 2px; border: 2px dashed ' + SAFE_INK });
  if (tiles.some((t) => t.spent)) out.push({ key: 'hz-spent', text: 'Spent mine', glyph: '◌', glyphStyle: 'font-size: 12px; color: #A3AEC2', swatch: '' });
  return out;
}

// ---------- markers (objectives and hints) ----------
/** A marker on a tile: white (still to do) with its word; objectives a filled diamond, hints a hollow one. */
export function markerCells(marks: Marker[], big = true): Map<string, { text: string; title: string; style: string; chip: string; chipStyle: string }> {
  const out = new Map<string, { text: string; title: string; style: string; chip: string; chipStyle: string }>();
  for (const m of marks) {
    const had = out.get(m.tile), obj = m.kind === 'objective' || (had && had.chip === 'OBJ');
    out.set(m.tile, { text: obj ? '◆' : '◇', chip: obj ? 'OBJ' : 'HINT', title: (had ? had.title + '\n' : '') + (m.kind === 'objective' ? 'Objective: ' : 'Hint: ') + m.text + ' (' + m.ref + ')',
      style: 'position: absolute; right: 1px; top: 0; z-index: 5; font-size: ' + (big ? 13 : 7) + 'px; line-height: 1; font-weight: 700; color: #FFFFFF; pointer-events: none; text-shadow: 0 0 3px #05070B, 0 0 6px rgba(255, 255, 255, 0.6)',
      chipStyle: 'position: absolute; left: 50%; top: -7px; transform: translateX(-50%); z-index: 6; padding: 0 3px; border-radius: 3px; font-size: 8px; font-weight: 700; letter-spacing: 0.06em; line-height: 11px; pointer-events: none; background: #FFFFFF; color: #0A0D13' });
  }
  return out;
}
export const markerLegend = (marks: Marker[]) => [
  ...(marks.some((m) => m.kind === 'objective') ? [{ key: 'mk-obj', text: 'Objective marker', glyph: '◆', glyphStyle: 'font-size: 12px; color: #FFFFFF', swatch: '' }] : []),
  ...(marks.some((m) => m.kind === 'hint') ? [{ key: 'mk-hint', text: 'Hint someone gave', glyph: '◇', glyphStyle: 'font-size: 12px; color: #FFFFFF', swatch: '' }] : []),
];

// ---------- caches ----------
/** A cache in a player's view (the view keeps the count, not the items). */
export const isCacheV = (o: MapObject & { itemCount?: number }) => isCache(o) || o.itemCount != null;
/** A cache's look on the map: a crate glyph in white (unsearched: something to do) with how many things it holds. */
export function cacheLook(o: MapObject & { itemCount?: number }, big = true): { glyph: string; chip: string; title: string; style: string; chipStyle: string } {
  const n = o.itemCount ?? (o.items || []).length, empty = !!o.searched || n === 0;
  return { glyph: '▣', chip: empty ? 'EMPTY' : o.locked ? 'LOCKED' : '×' + n,
    title: o.name + (empty ? ' · searched, empty' : ' · holds ' + n + (n === 1 ? ' thing' : ' things') + (o.locked ? ' · locked' : '')),
    style: 'position: absolute; inset: 0; z-index: 2; display: grid; place-items: center; font-size: ' + (big ? 20 : 9) + 'px; line-height: 1; pointer-events: none; color: ' + (empty ? '#7F8BA1' : '#FFFFFF') + (empty ? '' : '; text-shadow: 0 0 6px rgba(255, 255, 255, 0.45)'),
    chipStyle: 'position: absolute; right: 0; bottom: 0; z-index: 3; padding: 0 2px; border-radius: 3px; font-size: ' + (big ? 9 : 5) + 'px; font-weight: 700; line-height: ' + (big ? 12 : 7) + 'px; pointer-events: none; background: ' + (empty ? '#1C2536' : '#FFFFFF') + '; color: ' + (empty ? '#A3AEC2' : '#0A0D13') };
}
export const holdsText = (n: number, searched?: boolean) => (searched || !n ? 'Searched: nothing left.' : 'Holds ' + n + (n === 1 ? ' thing' : ' things') + '. Search to take them all into your pack.');

// ---------- approaches in plain words ----------
export const SUCCESS_WORDS: Record<string, string> = {
  remove: 'clears it out of the way', open: 'opens it', reveal: 'shows what is hidden nearby', disarm: 'makes it safe (removes it)', loot: 'you take what it holds',
  advance: 'the objective is done', ally: 'they come over to your side', inform: 'they tell you what they know (a marker on the map)', safe: 'marks a safe path for the squad', '': 'the Narrator says what happens',
};
/** The raw approach behind an option (for failCondition, failItem, objective and stakes the option doesn't carry). */
export function rawApproach(g: GameState, targetId: string, idx: number): any {
  const n = npcsOf(g).find((x) => x.id === targetId); if (n) return (n.talk || [])[idx] || null;
  const o = storyObjects(g).find((x) => x.id === targetId); if (o) return o.approaches[idx] || null;
  const hs = g.phase === 'combat' && g.combat ? g.combat.hazards || [] : g.story.hazards || [];
  const h = hs.find((x) => x.id === targetId); return h ? h.approaches[idx] || null : null;
}
/** What failure does, in plain words ("Fail: 20 damage", "Fail: raises the alarm"). */
export function failWords(fail: string | undefined, tn: number | undefined, raw?: any, hazard?: { kind: string; severity: string } | null): string {
  switch (fail || '') {
    case 'hurt': return (FAIL_HURT[tn || 12] ?? FAIL_HURT[12]) + ' damage (armour helps)';
    case 'alarm': return 'raises the alarm: hidden hostiles nearby wake';
    case 'condition': return raw?.failCondition ? condName(raw.failCondition) + ' for the scene' : 'a condition';
    case 'jam': return 'it jams: locked for the scene';
    case 'lose': return raw?.failItem ? 'you lose ' + raw.failItem : 'you lose something you carry';
    case 'hostile': return 'they turn hostile';
    case 'hazard': return hazard ? 'it gets you: ' + hazardHit(hazard.kind, hazard.severity).replace(/^entering a tile: /, '') : 'it gets you';
    default: return 'nothing worse than failing';
  }
}
export const pct = (odds: number | undefined) => (odds == null ? '' : Math.round(Math.max(0, Math.min(1, odds)) * 100) + '%');
const tnWord = (tn?: number) => ({ 8: 'EASY', 12: 'STANDARD', 16: 'HARD', 20: 'HEROIC' } as Record<number, string>)[tn || 0] || 'TN';
export interface ApproachRow {
  key: string; kind: 'ask' | 'approach'; label: string; skills: { key: string; name: string; style: string }[]; hasSkills: boolean; tn: string; odds: string; hasOdds: boolean;
  success: string; fail: string; hasEffects: boolean; stakes: string; hasStakes: boolean; cost: string; tried: boolean; off: boolean; why: string; hasWhy: boolean; button: string; title: string; style: string; oddsStyle: string;
  what?: 'wants' | 'objective'; idx?: number;
}
/** One button row per option: skills (in their attribute ink, from inkOf), TN, odds, success and failure in plain words, the
 *  cost, tried-once and the engine's reason when it's off. busy: a reason that overrides (not your turn, a fight on). */
export function approachRows(g: GameState, targetId: string, opts: TalkOption[], inkOf: (skill: string) => string, busy = '', hazard?: { kind: string; severity: string } | null): ApproachRow[] {
  return opts.map((o, i) => {
    const raw = o.kind === 'approach' && o.idx != null ? rawApproach(g, targetId, o.idx) : null, why = busy || (o.available ? '' : o.why || 'Not now.');
    const skills = (o.skills || []).map((s) => ({ key: s, name: SKILL[s]?.name || s, style: 'padding: 1px 8px; border-radius: 999px; font-size: 11px; font-weight: 700; border: 1px solid ' + inkOf(s) + '; color: ' + inkOf(s) }));
    const either = raw?.pick === 'best' && skills.length > 1;
    if (either) skills.splice(0, skills.length, { key: 'or', name: skills.map((x) => x.name).join(' or '), style: skills[0].style });
    const succ = o.kind === 'ask' ? (o.what === 'wants' ? 'they say what they want' : 'they point you at the objective (a marker on the map)') : SUCCESS_WORDS[o.success || ''] ?? SUCCESS_WORDS[''];
    const fail = o.kind === 'ask' ? '' : failWords(o.fail, o.tn, raw, hazard);
    const off = !!why;
    return { key: (o.kind === 'ask' ? 'ask-' + o.what : 'ap-' + o.idx) + '-' + i, kind: o.kind, what: o.what, idx: o.idx, label: o.label + (either ? '' : ''), skills, hasSkills: skills.length > 0,
      tn: o.kind === 'ask' ? 'NO ROLL' : tnWord(o.tn) + ' ' + o.tn + (o.mod != null ? ' · YOU ROLL d20 ' + (o.mod >= 0 ? '+' : '−') + Math.abs(o.mod) : ''),
      odds: o.kind === 'ask' ? '' : pct(o.odds), hasOdds: o.kind !== 'ask' && o.odds != null,
      success: 'Success: ' + succ, fail: fail ? 'Fail: ' + fail : '', hasEffects: true, stakes: raw?.stakes || '', hasStakes: !!raw?.stakes,
      cost: o.ap + ' AP', tried: !!o.tried, off, why, hasWhy: off, button: o.tried ? 'Tried' : (o.kind === 'ask' ? o.label : 'Try it') + ' · ' + o.ap + ' AP',
      title: off ? why : o.label + ' (' + o.ap + ' AP)',
      oddsStyle: 'font-size: 15px; font-weight: 700; color: ' + (o.odds == null ? '#A3AEC2' : '#FFFFFF'),
      style: 'display: flex; flex-direction: column; gap: 6px; padding: 10px 12px; border-radius: 10px; background: #0D1119; border: 1px solid #232D3F; border-left: 3px solid ' + (skills[0] ? inkOf((o.skills || [])[0]) : '#FFFFFF') + (o.tried ? '; opacity: 0.6' : '') };
  });
}

// ---------- the Talk panel and the hazard panel ----------
export interface TalkVals { has: boolean; id: string; name: string; kind: string; kicker: string; img: string; hasImg: boolean; badge: string; side: string; sideStyle: string;
  wants: string; hasWants: boolean; hint: string; hasHint: boolean; rows: ApproachRow[]; hasRows: boolean; none: boolean; canCarry: boolean; carryWhy: string; dist: number }
const SIDE_INK: Record<string, string> = { hostile: '#F65157', neutral: '#A3AEC2', ally: '#6FEA77' };
export function talkVals(g: GameState, tokenId: string, charId: string | undefined, art: (id: string) => string, inkOf: (s: string) => string, busy = ''): TalkVals | null {
  const v = npcView(g, tokenId, charId); if (!v) return null;
  const c = charId ? g.characters[charId] : undefined, at = c ? positionsOf(g)[c.id] : undefined, d = at ? dist(at, v.pos) : 99;
  const rows = approachRows(g, tokenId, v.talk, inkOf, busy);
  const carryWhy = !c ? 'No character.' : g.phase !== 'story' ? 'Deal with it after the fight.' : !v.carryable ? 'They won\'t let you (only the willing, Downed, prisoners, robots and drones).' : d > 1 ? 'Stand next to them to carry them.' : busy || (apLeft(g, c) < WORLD_AP.carry ? 'Needs ' + WORLD_AP.carry + ' AP.' : '');
  const img = art(v.avatar) || '';
  return { has: true, id: v.id, name: v.name, kind: v.kind, img, hasImg: !!img, badge: KIND_WORD[v.kind] || v.kind.toUpperCase(),
    kicker: (KIND_WORD[v.kind] || v.kind.toUpperCase()) + ' · ' + v.side.toUpperCase() + (v.prisoner ? ' · PRISONER' : '') + ' · ' + v.ref + (d < 99 ? ' · ' + d + (d === 1 ? ' TILE' : ' TILES') + ' AWAY' : ''),
    side: v.side.toUpperCase(), sideStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: ' + (SIDE_INK[v.side] || '#A3AEC2'),
    wants: v.wants ? 'Wants: ' + v.wants : '', hasWants: !!v.wants, hint: v.knows ? 'Told you: ' + v.knows.hint : '', hasHint: !!v.knows,
    rows, hasRows: rows.length > 0, none: rows.length === 0, canCarry: v.carryable && !carryWhy, carryWhy: v.carryable ? carryWhy : '', dist: d };
}
export interface HazardVals { has: boolean; id: string; name: string; kicker: string; text: string; hit: string; glyph: string; glyphStyle: string; rows: ApproachRow[]; hasRows: boolean; tiles: number }
export function hazardVals(g: GameState, id: string, charId: string | undefined, inkOf: (s: string) => string, busy = ''): HazardVals | null {
  const h = hazardsFor(g, 'pc', charId).find((x) => x.id === id); if (!h) return null;
  const L = hazardLook(h.kind);
  return { has: true, id: h.id, name: h.name, kicker: L.word + ' · ' + h.severity.toUpperCase() + ' · TN ' + h.tn + ' · ' + h.tiles.length + ' TILES' + (h.safe.length ? ' · SAFE PATH FOUND' : ''),
    text: h.text, hit: 'Walking in: ' + hazardHit(h.kind, h.severity).replace(/^entering a tile: /, '') + '.', glyph: L.glyph, glyphStyle: 'font-size: 34px; font-weight: 700; line-height: 1; color: ' + L.ink,
    rows: approachRows(g, h.id, h.approaches, inkOf, busy, { kind: h.kind, severity: h.severity }), hasRows: h.approaches.length > 0, tiles: h.tiles.length };
}
/** The object panel's approaches, with odds and effects (objects and caches). */
export const objectRows = (g: GameState, objId: string, charId: string | undefined, inkOf: (s: string) => string, busy = '') => approachRows(g, objId, approachOptions(g, objId, charId), inkOf, busy);

// ---------- the HERE card ----------
export interface HereVals { has: boolean; zone: string; rows: { key: string; text: string; tag: string; tagStyle: string; steps: { key: string; text: string }[]; hasSteps: boolean; where: string; hasWhere: boolean }[] }
export function hereVals(g: GameState): HereVals {
  let card: ReturnType<typeof hereCard>; try { card = hereCard(g, 'pc'); } catch { return { has: false, zone: '', rows: [] }; }
  const rows = card.objectives.map((o) => ({ key: o.key, text: o.text, tag: o.here ? (o.optional ? 'OPTIONAL · HERE' : 'HERE') : 'ELSEWHERE',
    tagStyle: 'font-size: 10px; font-weight: 700; letter-spacing: 0.14em; color: ' + (o.here ? '#FFFFFF' : '#A3AEC2'),
    steps: o.steps.map((s, i) => ({ key: o.key + i, text: s })), hasSteps: o.steps.length > 0,
    where: !o.here && o.zoneName ? 'In ' + o.zoneName : o.markers.length ? '◆ ' + o.markers.map((m) => m.ref).join(', ') : '', hasWhere: (!o.here && !!o.zoneName) || o.markers.length > 0 }));
  return { has: rows.length > 0, zone: 'HERE · ' + String(card.zoneName || card.zone || '').toUpperCase(), rows };
}

// ---------- carrying ----------
export interface CarriedRow { key: string; id: string; name: string; kind: string; kindWord: string; img: string; hasImg: boolean; badge: string; kg: string; line: string }
export function carriedRows(c: Character | null | undefined, art: (id: string) => string): CarriedRow[] {
  if (!c) return [];
  return carriedOf(c).map((x) => { const img = art(x.avatar) || ''; return { key: x.id, id: x.id, name: x.name, kind: x.kind, kindWord: KIND_WORD[x.kind] || x.kind.toUpperCase(), img, hasImg: !!img, badge: KIND_BADGE[x.kind] || x.name.slice(0, 2).toUpperCase(), kg: x.kg + ' kg',
    line: (KIND_WORD[x.kind] || x.kind.toUpperCase()) + ' · ' + x.kg + ' kg · ' + x.side }; });
}
/** The load line with what's carried: total / limit and the overweight state, in words. */
export function loadLine(c: Character | null | undefined): { text: string; over: boolean; kg: number } {
  if (!c) return { text: '', over: false, kg: 0 };
  const KG = carriedKg(c), lim = carryLimit(c), people = carriedOf(c).reduce((t, x) => t + x.kg, 0), over = KG.total > lim;
  return { over, kg: people, text: 'Carrying ' + people + ' kg of people and machines · load ' + Math.round(KG.total) + ' / ' + lim + ' kg' + (over ? ' · OVERWEIGHT: ' + Math.round(KG.total - lim) + ' kg over (slower, no Sprint)' : '') };
}
/** The tokens a character could pick up now (adjacent, seen, carryable). */
export function carryTargets(g: GameState, charId: string): Npc[] {
  const at = positionsOf(g)[charId]; if (!at || g.phase !== 'story') return [];
  return npcsOf(g).filter((n) => !n.hidden && carryable(n) && dist(at, n.pos) <= 1);
}
/** The free tiles next to a character where a carried creature can be put down. */
export function putDownTiles(g: GameState, charId: string): string[] {
  const at = positionsOf(g)[charId]; if (!at) return [];
  const map = zoneMap(g), taken = new Set<string>([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos)]), objs = storyObjects(g), [x0, y0] = at.split(',').map(Number), out: string[] = [];
  for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) { if (!dx && !dy) continue; const x = x0 + dx, y = y0 + dy; if (x < 0 || y < 0 || x >= map.w || y >= map.h) continue; const k = x + ',' + y;
    if (map.solid.includes(k) || taken.has(k) || objs.some((o) => o.pos === k && blocksMove(o))) continue; if (!standable(map, k)) continue; out.push(k); }
  return out;
}

// ---------- near you: the button list ----------
export interface NearItem { key: string; kind: 'npc' | 'carry' | 'cache' | 'hazard'; id: string; label: string; sub: string; off: boolean; why: string; style: string }
/** Everything a character can act on from where they stand, as buttons: people to talk to (within talk range), people to
 *  carry (adjacent), caches to search (adjacent), hazards in sight (their ways through). */
export function nearItems(g: GameState, charId: string | undefined, busy = ''): NearItem[] {
  if (!charId || g.phase !== 'story') return [];
  const c = g.characters[charId], at = positionsOf(g)[charId]; if (!c || !at) return [];
  const out: NearItem[] = [], apL = apLeft(g, c), btn = (ink: string) => 'display: flex; flex-direction: column; align-items: flex-start; gap: 1px; width: 100%; min-height: 38px; padding: 6px 10px; border-radius: 8px; border: 1px solid ' + ink + '; background: transparent; color: #E7EBF3; font-family: inherit; font-size: 13px; text-align: left; cursor: pointer';
  for (const n of npcsOf(g)) { if (n.hidden) continue; const d = dist(at, n.pos); if (d > TALK_RANGE) continue;
    const kw = KIND_WORD[n.kind || 'human'] || 'PERSON';
    out.push({ key: 'n' + n.id, kind: 'npc', id: n.id, label: 'Talk to ' + n.name, sub: kw + ' · ' + refOf(n.pos) + ' · ' + d + (d === 1 ? ' tile' : ' tiles') + (n.wants || (n as any).wantsHidden || n.knows || (n.talk || []).length ? '' : ' · nothing to say'), off: false, why: '', style: btn('#FFFFFF') });
    if (d <= 1 && carryable(n)) { const why = busy || (apL < WORLD_AP.carry ? 'Needs ' + WORLD_AP.carry + ' AP.' : '');
      out.push({ key: 'c' + n.id, kind: 'carry', id: n.id, label: 'Carry ' + n.name + ' · ' + WORLD_AP.carry + ' AP', sub: kw + ' · ' + kindKg(n.kind) + ' kg' + (why ? ' · ' + why : ''), off: !!why, why, style: btn('#E7EBF3') }); } }
  for (const o of storyObjects(g)) { if (o.hidden || !isCacheV(o) || dist(at, o.pos) > 1) continue; const n = (o as any).itemCount ?? (o.items || []).length;
    const why = o.searched || !n ? 'Nothing left.' : o.locked ? 'Locked: open it first.' : busy || (apL < WORLD_AP.search ? 'Needs ' + WORLD_AP.search + ' AP.' : '');
    out.push({ key: 's' + o.id, kind: 'cache', id: o.id, label: 'Search ' + o.name + ' · ' + WORLD_AP.search + ' AP', sub: (o.searched || !n ? 'searched, empty' : 'holds ' + n + (n === 1 ? ' thing' : ' things')) + (why && why !== 'Nothing left.' ? ' · ' + why : ''), off: !!why, why, style: btn('#FFFFFF') }); }
  let tiles: HazardTile[] = []; try { tiles = hazardTilesFor(g, 'pc'); } catch { /* */ }
  const hz = new Map<string, { d: number; t: HazardTile }>(); for (const t of tiles) { const d = dist(at, t.tile); const was = hz.get(t.id); if (!was || d < was.d) hz.set(t.id, { d, t }); }
  for (const [id, { d, t }] of hz) { const L = hazardLook(t.kind);
    out.push({ key: 'h' + id, kind: 'hazard', id, label: L.glyph + ' ' + (t.name || L.word) + ' · ways through', sub: L.word + ' · ' + t.severity + ' · ' + (d === 0 ? 'you stand in it' : d + (d === 1 ? ' tile' : ' tiles') + ' away'), off: false, why: '', style: btn(L.ink) }); }
  return out;
}

// ---------- the map's cells: everything World Play draws on one tile ----------
export interface WorldCell { hz?: HazardCell; mark?: ReturnType<typeof markerCells> extends Map<string, infer V> ? V : never; cache?: ReturnType<typeof cacheLook> }
export function worldLayer(g: GameState, big = true): { cells: Map<string, WorldCell>; legend: ReturnType<typeof hazardLegend>; tiles: HazardTile[]; marks: Marker[] } {
  let tiles: HazardTile[] = [], marks: Marker[] = [];
  try { tiles = hazardTilesFor(g, 'pc'); } catch { /* */ }
  try { marks = markersFor(g, 'pc'); } catch { /* */ }
  const cells = new Map<string, WorldCell>(), get = (k: string) => { let c = cells.get(k); if (!c) { c = {}; cells.set(k, c); } return c; };
  for (const [k, v] of hazardCells(tiles, big)) get(k).hz = v;
  for (const [k, v] of markerCells(marks, big)) get(k).mark = v;
  const objs: MapObject[] = g.phase === 'combat' && g.combat ? g.combat.objects || [] : storyObjects(g);
  for (const o of objs) if (!o.hidden && isCacheV(o)) get(o.pos).cache = cacheLook(o, big);
  return { cells, legend: [...hazardLegend(tiles), ...markerLegend(marks)], tiles, marks };
}
export { refOf };
