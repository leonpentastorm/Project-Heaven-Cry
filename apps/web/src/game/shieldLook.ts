// 0.30.0, the shield display (Leon, 16 Nov 2026: "the shield display on your token in battle is a tiny bar above your
// hp, this might fool player into thinking all source of shield stacks into that bar"). The engine's shieldsView
// (screenViews.ts) says what a unit holds, in the order a blow meets it, what the viewer may know, and every word
// (rules.json combat.shield_look); this file only draws it:
//   shieldStrip   the token's strip over the HP bar: one segment a shield, in its source's attribute ink, a 1 px dark
//                 gap between them, each as wide as its share of max HP (at least MIN_SEG), capped at the bar with a "+".
//                 It stands clear of the HP bar (a dark gap and an outline), and the kinds differ by more than colour:
//                 a layer is solid, the base shield is hatched (so it never reads as the HP bar's white damage chip)
//   shieldBlock   the SHIELDS lines of a card (the hover card, the target card, your own panel): a pip, the name, the
//                 amount (a size word for a foe), how long it lasts; Guard on a line of its own, before the shields when
//                 it soaks first; what an ordinary blow meets before HP; the engine's one-line rule where asked
// No shield, item or class id is named here, and no word is typed here: they are the view's.
import { ATTR_INK } from './classView';
import { fmtNum } from './numbers';

/** A shield with no one attribute (the base shield: many givers) draws in the text ink. */
export const NEUTRAL_INK = '#E7EBF3';
/** The least share of the strip a shield takes, so a small one still shows (percent of the HP bar's width). */
export const MIN_SEG = 10;
/** Glyphs that pair with the colour: a layer, the base shield, the Guard pool. */
export const GLYPH = { layer: '◆', base: '■', guard: '⛉' } as const;
/** The token strip's dark ground (the gap between segments and round the strip). */
const GROUND = 'rgba(5, 7, 11, 0.9)';

export interface ShieldEntryV { key: string; kind: 'layer' | 'base'; name: string; attribute: string | null; by: string | null; from?: string; amount: number | null; size: string | null; bar: number; lasts: string; combines: string; how: string; order: number }
export interface ShieldGuardV { name: string; plates: number; max: number; soak: number; keep?: number; first?: boolean; line?: string; how: string }
export interface ShieldsViewV { known: boolean; maxHp: number; head?: string; entries: ShieldEntryV[]; guard: ShieldGuardV | null; blow: number | null; all: number | null; allWord: string; absorb?: string; absorbDrop?: string; chip?: string; total?: number | null; vs?: string; words?: string; rule: string }

export const inkOf = (e: Pick<ShieldEntryV, 'attribute'>): string => (e.attribute && ATTR_INK[e.attribute]) || NEUTRAL_INK;
/** A segment's fill: a layer solid in its ink, the base shield hatched (its kind reads without the colour). */
const fillOf = (e: Pick<ShieldEntryV, 'kind' | 'attribute'>): string => e.kind === 'base'
  ? 'repeating-linear-gradient(135deg, ' + inkOf(e) + ' 0 2px, ' + GROUND + ' 2px 3px)' : inkOf(e);

/** The token's strip. Every entry the engine lists is a shield a blow meets (none of them is set aside). */
export function shieldStrip(sv: ShieldsViewV | null) {
  const es = sv ? sv.entries : [];
  let used = 0, over = false;
  const segs = es.map((e, i) => {
    const want = Math.max(MIN_SEG, Math.min(100, e.bar * 100)), w = Math.max(0, Math.min(want, 100 - used));
    if (want > w) over = true; used += w;
    return { key: e.key, kind: e.kind, name: e.name, ink: inkOf(e), width: w,
      // the strip's 1 px gap (its dark ground) parts each shield from the next
      style: 'flex: 0 0 calc(' + w.toFixed(2) + '% - ' + (i ? 1 : 0) + 'px); height: 100%; background: ' + fillOf(e) };
  }).filter((s) => s.width > 0);
  return { has: segs.length > 0, segs, over,
    // 2 px of dark ground under it and an outline round it: the strip is never read as the HP bar's top edge
    boxStyle: 'position: absolute; left: 5px; right: 5px; bottom: 7px; height: 4px; z-index: 3; display: flex; gap: 1px; border-radius: 2px; overflow: hidden; pointer-events: none; background: ' + GROUND + '; box-shadow: 0 0 0 1px ' + GROUND,
    plusStyle: 'position: absolute; right: 1px; bottom: 10px; z-index: 4; font-size: 9px; font-weight: 700; line-height: 1; color: #FFFFFF; text-shadow: 0 0 2px #05070B, 0 0 2px #05070B; pointer-events: none',
    /** the shields in words (a tip) */
    title: sv && sv.words ? sv.words : es.map((e) => e.name + ' ' + (e.amount != null ? fmtNum(e.amount) : e.size)).join(' · ') };
}

/** The SHIELDS block of a card. `o.guard`: show the Guard line (your own panel has its Guard row: said once); `o.rule`:
 *  show the one-line rule (the target card and your own panel; never every hover card). */
export function shieldBlock(sv: ShieldsViewV | null, o: { guard?: boolean; rule?: boolean } = {}) {
  const es = sv ? sv.entries : [], g = sv && o.guard !== false ? sv.guard : null;
  const amountOf = (e: ShieldEntryV) => (e.amount != null ? fmtNum(e.amount) : (e.size || '').toUpperCase());
  const lines = es.map((e) => ({ key: e.key, kind: e.kind, glyph: GLYPH[e.kind], name: e.name, ink: inkOf(e),
    amount: amountOf(e),
    lasts: e.lasts + (e.from ? ' · ' + e.from : ''),
    pipStyle: 'flex: none; width: 10px; text-align: center; font-size: 11px; color: ' + inkOf(e),
    nameStyle: 'font-weight: 700; color: ' + inkOf(e),
    text: GLYPH[e.kind] + ' ' + e.name + ' ' + amountOf(e) + ' · ' + e.lasts + (e.from ? ' · ' + e.from : '') }));
  const guardLine = g ? g.line || '' : '', first = !!(g && g.first);
  const has = es.length > 0 || !!(sv && sv.guard);
  const absorb = has && sv ? sv.absorb || '' : '', absorbDrop = has && sv ? sv.absorbDrop || '' : '';
  return { has, head: sv ? sv.head || '' : '', lines,
    hasGuard: !!g, hasGuardFirst: !!g && first, hasGuardLast: !!g && !first, guardGlyph: GLYPH.guard, guardName: g ? g.name : '', guardLine, guardTitle: g ? g.how : '',
    absorb, hasAbsorbDrop: !!absorbDrop, absorbDrop, hasRule: !!o.rule && !!sv && !!sv.rule, rule: o.rule && sv ? sv.rule : '',
    headStyle: 'font-size: 11px; font-weight: 700; letter-spacing: 0.14em; color: #A3AEC2',
    lineStyle: 'display: flex; gap: 5px; align-items: baseline; font-size: 13px; color: #E7EBF3; line-height: 1.3',
    subStyle: 'font-size: 12px; color: #A3AEC2; line-height: 1.3',
    /** the block as one line of words (an aria-label, a tile's label) */
    words: [...(first ? [guardLine] : []), ...lines.map((l) => l.text), ...(first ? [] : [guardLine]), absorb, absorbDrop].filter(Boolean).join(' · ') };
}
