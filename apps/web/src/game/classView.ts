// What the level-up screen, the sheet and the cut-ins show about a character's class (spec: Classes; Class Roster
// Revision 3): the emblem, the class's attribute and the progress to the next rank (II at 5, III at 8), every move by
// rank (earned or locked, with who runs it), the classes on offer before one is earned (the highest attribute, ties
// included), the picker's cards, and the uses left on any item. Advanced classes are shelved: a held one is never shown
// as active. Pure functions of the character (and the game, for the use counters), so they are testable.
import { CLASS, ADVANCED, ATTR, CLASS_MIGRATION, RANK_LEVEL, classTotals, classRank, eligibleClasses, advancedClassError, advancedActive, verdictFor, itemInfo, actionDefs, uses, scopeOf, usesLabel, SKILL } from '@engine';
import { classIconUri, classCore, CORE_INK } from './classIcons';

/** Class Roster Revision 3: rank II at the class's attribute 5, rank III at 8; rules 1.11: and at level 6 and 12 (provisional). */
export const RANK_AT = { I: 0, II: 5, III: 8 } as const;
const RANKS = ['I', 'II', 'III'] as const;
export const ROMAN_RANK = ['', 'I', 'II', 'III'];
/** Attribute inks (the contrast-safe UI ink; CLAUDE.md, docs/design/colour-system.md). */
export const ATTR_INK: Record<string, string> = { endurance: '#F65157', strength: '#F68A38', agility: '#E3BF51', perception: '#40BAA0', intelligence: '#8BDEEE', expression: '#5394AC', insight: '#EB95B7', determination: '#9D7ADC', virtue: '#D36A90' };
const attrName = (a: string) => (ATTR as any)[a]?.name || a;

/** The class a character shows: an active advanced class, else the base class (a held shelved advanced class shows
 * nothing of its own). */
export function heldClassId(c: any): string | null {
  if (!c) return null;
  return c.advancedClass && advancedActive(c.advancedClass) ? c.advancedClass : c.classId || null;
}
/** A move origin (a Revision 2 class id such as medic) as the Revision 3 class that holds it now (bard). */
export const currentClassId = (id: string | null | undefined) => (id ? ((CLASS as any)[id] ? id : CLASS_MIGRATION[id] || id) : null);

/** A class's ink (its core's family colour; advanced: the first parent's core) and emblem. */
export function emblemOf(id: string | null | undefined): { ink: string; icon: string } {
  if (!id) return { ink: '#A3AEC2', icon: '' };
  const core = classCore(id), ink = core ? CORE_INK[core] : '#E7EBF3';
  return { ink, icon: classIconUri(id, ink) };
}
/** The class name, by id (base or advanced). */
export const className = (id: string) => (CLASS as any)[id]?.name || ADVANCED[id]?.name || id;
/** "Marksman II", "Gunslinger (Marksman II)"; empty with no class. */
export function classLabel(c: any): string {
  if (!c?.classId) return '';
  const base = className(c.classId) + ' ' + ROMAN_RANK[classRank(c)];
  // Advanced classes are shelved (Class Roster Revision 3): a held one isn't shown as active.
  return c.advancedClass && ADVANCED[c.advancedClass] && advancedActive(c.advancedClass) ? ADVANCED[c.advancedClass].name + ' (' + base + ')' : base;
}

/** Uses left on an item (its actions' counters, else the item's own use limit), "1/1 combat left · 0/1 scene left". */
export function usesLine(g: any, c: any, key: string, tier?: string): string {
  const info = itemInfo(key, tier as any); if (!info || !c) return '';
  const cb = g?.combat && !g.combat.over ? g.combat : null, u = cb ? (cb.units || []).find((x: any) => x.charId === c.id) || null : null;
  const h: any = { key: info.key, c, u, cb, g };
  const parts: string[] = [];
  for (const d of actionDefs(info)) {
    const per = d.uses?.per || 'at_will', n = d.uses?.n ?? 1;
    if (per === 'at_will') continue;
    if (per === 'out_of_combat') { parts.push('out of combat'); continue; }
    parts.push(usesLabel(per, n, Math.min(n, uses(h).left(per, n, info.key + '#' + d.id))) + ' left');
  }
  if (!parts.length) {
    const per = scopeOf(info.uses);
    if (per === 'out_of_combat') parts.push('out of combat');
    else if (per !== 'at_will') parts.push(usesLabel(per, 1, Math.min(1, uses(h).left(per, 1))) + ' left');
  }
  return [...new Set(parts)].join(' · ');
}

export interface MoveView { key: string; id: string; name: string; text: string; rank: string; earned: boolean; unlock: string; badge: string; verdict: string; uses: string; ap: string }
/** Every move of a class, by rank: earned (the rank has it) or locked with the attribute value it needs. */
export function classMoves(g: any, c: any, clsId: string): MoveView[] {
  const k: any = (CLASS as any)[clsId]; if (!k) return [];
  const rank = c?.classId === clsId ? classRank(c) : 0;
  return RANKS.flatMap((r, i) => ((k.ranks || {})[r]?.moves || []).map((m: any) => {
    // A move keeps the key its handler runs under (Bard's Triage is class:medic.triage).
    const key = m.key || 'class:' + clsId + '.' + m.id, v = verdictFor(key, r), earned = rank > i;
    return { key, id: m.id, name: m.name, text: m.text || '', rank: 'RANK ' + r, earned, unlock: earned ? '' : i === 0 ? 'unlocks with the class' : 'unlocks at ' + attrName(k.attribute) + ' ' + RANK_AT[r] + ' and level ' + RANK_LEVEL[r as 'II' | 'III'],
      badge: v.label, verdict: v.verdict, uses: earned ? usesLine(g, c, key, r) : '', ap: m.ap_cost ? m.ap_cost + ' AP' : '' };
  }));
}
export interface RankView { rank: string; head: string; unlocked: boolean; state: string; moves: MoveView[] }
/** The three ranks, each with its two moves: "RANK II · AGILITY 5", unlocked or locked. */
export function classRanks(g: any, c: any, clsId: string): RankView[] {
  const k: any = (CLASS as any)[clsId]; if (!k) return [];
  const all = classMoves(g, c, clsId), rank = c?.classId === clsId ? classRank(c) : 0;
  return RANKS.map((r, i) => ({ rank: r, head: 'RANK ' + r + ' · ' + (i === 0 ? 'WITH THE CLASS' : attrName(k.attribute).toUpperCase() + ' ' + RANK_AT[r] + ' · LEVEL ' + RANK_LEVEL[r as 'II' | 'III']),
    unlocked: rank > i, state: rank > i ? 'UNLOCKED' : 'LOCKED', moves: all.filter((m) => m.rank === 'RANK ' + r) }));
}
/** An advanced class's moves (all earned once learned). */
export function advancedMoves(g: any, c: any, advId: string): MoveView[] {
  const a = ADVANCED[advId]; if (!a || !advancedActive(advId)) return [];
  return (a.moves || []).map((m: any) => { const key = 'class:' + advId + '.' + m.id, v = verdictFor(key, 'adv');
    return { key, id: m.id, name: m.name, text: m.text || '', rank: 'ADVANCED', earned: true, unlock: '', badge: v.label, verdict: v.verdict, uses: usesLine(g, c, key, 'adv'), ap: m.ap_cost ? m.ap_cost + ' AP' : '' }; });
}

/** A class's attribute and its three skills with the character's points, and the progress to the next rank (Class
 * Roster Revision 3: the rank reads the class's attribute, II at 5, III at 8; rules 1.11: and the level, 6 and 12).
 * `total` is the attribute's value. */
export function attributeProgress(c: any, clsId: string) {
  const k: any = (CLASS as any)[clsId]; if (!k) return null;
  const skills = (k.skills || []).map((s: string) => ({ id: s, name: (SKILL as any)[s]?.name || s, pts: c.skills?.[s] || 0 }));
  const total = c.attrs?.[k.attribute] || 1, lv = typeof c.level === 'number' ? c.level : 20;
  const rank = total >= RANK_AT.III && lv >= RANK_LEVEL.III ? 3 : total >= RANK_AT.II && lv >= RANK_LEVEL.II ? 2 : 1;
  const nextLevel = rank === 1 ? RANK_LEVEL.II : rank === 2 ? RANK_LEVEL.III : 0;
  const next = rank === 1 ? RANK_AT.II : rank === 2 ? RANK_AT.III : null, prev = rank === 1 ? 1 : rank === 2 ? RANK_AT.II : RANK_AT.III;
  const an = attrName(k.attribute);
  return { skills, total, rank, next, attribute: k.attribute, attributeName: an, ink: ATTR_INK[k.attribute] || '#E7EBF3', label: an.toUpperCase() + ' ' + total,
    pct: next ? Math.max(0, Math.min(100, Math.round((total - prev) / (next - prev) * 100))) : 100,
    nextLine: next ? 'Rank ' + ROMAN_RANK[rank + 1] + ' at ' + an + ' ' + next + (total < next ? ' · ' + (next - total) + ' to go' : ' ✓') + ' and level ' + nextLevel + (lv < nextLevel ? ' · ' + (nextLevel - lv) + ' to go' : ' ✓') : 'Top rank' };
}

const RES_WORD: Record<string, string> = { guard: 'Guard', momentum: 'Momentum', heat: 'Heat', marks: 'Marks', toxins: 'Toxin doses', shadow: 'Shadow', flux: 'Flux', supplies: 'Supplies', mp: 'MP', strain: 'Strain', devotion: 'Devotion', ledger: 'the Ledger' }; // (rules 1.33: the Mender's)
/** A class's resources in words: "Marks (max 3) · Toxin doses". */
export function resourceLine(clsId: string): string {
  const k: any = (CLASS as any)[clsId]; if (!k) return '';
  const ids: string[] = k.resources?.length ? k.resources : k.resource ? [k.resource.id] : [];
  return ids.map((id) => (RES_WORD[id] || id.replace(/_/g, ' ')) + (k.resource?.id === id && typeof k.resource.max === 'number' ? ' (max ' + k.resource.max + ')' : '')).join(' · ');
}
/** One class as the level-3 picker shows it: emblem, name, attribute (with its ink), the fantasy line, resources and
 * both rank I moves. */
export function classCard(c: any, clsId: string) {
  const k: any = (CLASS as any)[clsId]; if (!k) return null;
  const an = attrName(k.attribute);
  return { id: k.id, name: k.name, core: k.core, attribute: k.attribute, attributeName: an, attrInk: ATTR_INK[k.attribute] || '#E7EBF3', value: c?.attrs?.[k.attribute] || 1,
    tagline: k.tagline || '', resource: resourceLine(clsId), skills: (k.skills || []).map((s: string) => (SKILL as any)[s]?.name || s),
    rankLine: 'Rank II at ' + an + ' ' + RANK_AT.II + ' and level ' + RANK_LEVEL.II + ' · rank III at ' + an + ' ' + RANK_AT.III + ' and level ' + RANK_LEVEL.III,
    moves: ((k.ranks?.I?.moves) || []).map((m: any) => ({ key: m.key || 'class:' + clsId + '.' + m.id, name: m.name, text: m.text || '', ap: m.ap_cost ? m.ap_cost + ' AP' : '' })), ...emblemOf(k.id) };
}

/** Base classes by their attribute, highest first; `offered` marks the level-3 options (the highest attribute, ties included). */
export function closestClasses(c: any, n = 4) {
  const offered = new Set(eligibleClasses(c).map((x: any) => x.id));
  return classTotals(c).sort((a: any, b: any) => b.total - a.total).slice(0, Math.max(n, offered.size))
    .map((t: any) => { const k: any = (CLASS as any)[t.id];
      return { id: t.id, name: t.name, total: t.total, offered: offered.has(t.id), sig: attrName(k.attribute) + ' ' + t.total, attrInk: ATTR_INK[k.attribute] || '#E7EBF3',
        move: (k.ranks?.I?.moves || []).map((m: any) => m.name).join(' · '), ...emblemOf(t.id) }; });
}

/** Advanced classes (shelved in Class Roster Revision 3: each says why it can't be learned). The level-up screen shows
 * only a quiet "being rebuilt" line while none is active; kept for when a batch comes back. */
export function advancedInReach(c: any, n = 3) {
  return Object.values(ADVANCED).map((a: any) => {
    const why = advancedClassError(c, a.id, a);
    return { id: a.id, name: a.name, summary: a.summary || '', gap: why ? 1 : 0, parents: (a.pair || []).map((x: string) => attrName(x)).join(' + '),
      missing: why ? [why] : [], ready: !why, why: why || '', ...emblemOf(a.id) };
  }).sort((x, y) => x.gap - y.gap || x.name.localeCompare(y.name)).slice(0, n);
}
/** Is any advanced class learnable now? (None while they are shelved.) */
export const advancedLive = () => Object.keys(ADVANCED).some((id) => advancedActive(id));
