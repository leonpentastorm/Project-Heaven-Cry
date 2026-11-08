// What the level-up screen, the sheet and the cut-ins show about a character's class (spec: Classes): the emblem, the
// signature totals and the progress to the next rank, every move by rank (earned or locked, with who runs it), the
// closest base classes before one is earned, the advanced classes in reach with what is missing, and the uses left
// on any item. Pure functions of the character (and the game, for the use counters), so they are testable.
import { CLASS, ADVANCED, ATTR, classTotals, classRank, eligibleClasses, advancedClassError, advancedActive, verdictFor, itemInfo, actionDefs, uses, scopeOf, usesLabel, SKILL } from '@engine';
import { classIconUri, classCore, CORE_INK } from './classIcons';

/** Class Roster Revision 3: rank II at the class's attribute 5, rank III at 8 (provisional). */
export const RANK_AT = { I: 0, II: 5, III: 8 } as const;
const RANKS = ['I', 'II', 'III'] as const;
export const ROMAN_RANK = ['', 'I', 'II', 'III'];

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
/** Every move of a class, by rank: earned (the rank has it) or locked with the signature total it needs. */
export function classMoves(g: any, c: any, clsId: string): MoveView[] {
  const k: any = (CLASS as any)[clsId]; if (!k) return [];
  const rank = c.classId === clsId ? classRank(c) : 0;
  return RANKS.flatMap((r, i) => ((k.ranks || {})[r]?.moves || []).map((m: any) => {
    // A move keeps the key its handler runs under (Bard's Triage is class:medic.triage).
    const key = m.key || 'class:' + clsId + '.' + m.id, v = verdictFor(key, r), earned = rank > i;
    return { key, id: m.id, name: m.name, text: m.text || '', rank: 'RANK ' + r, earned, unlock: earned ? '' : i === 0 ? 'unlocks with the class' : 'unlocks at ' + ((ATTR as any)[k.attribute]?.name || k.attribute) + ' ' + RANK_AT[r],
      badge: v.label, verdict: v.verdict, uses: earned ? usesLine(g, c, key, r) : '', ap: m.ap_cost ? m.ap_cost + ' AP' : '' };
  }));
}
/** An advanced class's moves (all earned once learned). */
export function advancedMoves(g: any, c: any, advId: string): MoveView[] {
  const a = ADVANCED[advId]; if (!a) return [];
  return (a.moves || []).map((m: any) => { const key = 'class:' + advId + '.' + m.id, v = verdictFor(key, 'adv');
    return { key, id: m.id, name: m.name, text: m.text || '', rank: 'ADVANCED', earned: true, unlock: '', badge: v.label, verdict: v.verdict, uses: usesLine(g, c, key, 'adv'), ap: m.ap_cost ? m.ap_cost + ' AP' : '' }; });
}

/** A class's attribute and its three skills with the character's points, and the progress to the next rank (Class
 * Roster Revision 3: the rank reads the class's attribute, II at 5, III at 8). `total` is the attribute's value. */
export function signatureOf(c: any, clsId: string) {
  const k: any = (CLASS as any)[clsId]; if (!k) return null;
  const skills = (k.skills || []).map((s: string) => ({ id: s, name: (SKILL as any)[s]?.name || s, pts: c.skills?.[s] || 0 }));
  const total = c.attrs?.[k.attribute] || 1, rank = total >= RANK_AT.III ? 3 : total >= RANK_AT.II ? 2 : 1;
  const next = rank === 1 ? RANK_AT.II : rank === 2 ? RANK_AT.III : null, prev = rank === 1 ? 1 : rank === 2 ? RANK_AT.II : RANK_AT.III;
  const an = (ATTR as any)[k.attribute]?.name || k.attribute;
  return { skills, total, rank, next, attribute: k.attribute, attributeName: an, pct: next ? Math.round((total - prev) / (next - prev) * 100) : 100,
    nextLine: next ? 'Rank ' + ROMAN_RANK[rank + 1] + ' at ' + an + ' ' + next + ' · ' + (next - total) + ' to go' : 'Top rank' };
}

/** Base classes by their attribute, highest first; `offered` marks the level-3 options (the highest attribute, ties included). */
export function closestClasses(c: any, n = 4) {
  const offered = new Set(eligibleClasses(c).map((x: any) => x.id));
  return classTotals(c).sort((a: any, b: any) => b.total - a.total).slice(0, Math.max(n, offered.size))
    .map((t: any) => { const k: any = (CLASS as any)[t.id];
      return { id: t.id, name: t.name, total: t.total, offered: offered.has(t.id), sig: ((ATTR as any)[k.attribute]?.name || k.attribute) + ' ' + t.total,
        move: k.ranks?.I?.moves?.[0]?.name || '', ...emblemOf(t.id) }; });
}

/** Advanced classes (shelved in Class Roster Revision 3: each says why it can't be learned; an empty list once none is
 * listed). Kept for the level-up panel; the UI pass decides how (or whether) to show them. */
export function advancedInReach(c: any, n = 3) {
  return Object.values(ADVANCED).map((a: any) => {
    const why = advancedClassError(c, a.id, a);
    return { id: a.id, name: a.name, summary: a.summary || '', gap: why ? 1 : 0, parents: (a.pair || []).map((x: string) => (ATTR as any)[x]?.name || x).join(' + '),
      tutor: '', tutorMet: true, missing: why ? [why] : [], ready: !why, why: why || '', ...emblemOf(a.id) };
  }).sort((x, y) => x.gap - y.gap || x.name.localeCompare(y.name)).slice(0, n);
}
