// Blessing 2.0 (rules 1.6): what the screens show about faith, as plain models. One source for the sheet's Faith panel,
// the combat FAITH tab, the story's prayer buttons, the resource rows under the HP bar and the turn card. Everything
// comes from the engine's faithView() and previewPrayer() (packages/engine/src/faith.ts): this file computes no rule,
// only words, odds, icons and the reason a button is disabled.
import { faithView, previewPrayer, FAITH_PATRON, FAITH_PATRONS, DEVOTION_XP, GATE, MIRACLE_FAITH, FAITH_MIN, type FaithView, type PrayerPreview } from '@engine';
import { FAITH_INK, FAITH_GOLD, accentOf, patronMarkUri, prayerIconUri, vowIconUri, witnessedUri } from './faithArt';

export type PrayerKindUI = 'whisper' | 'hymn' | 'miracle';
const ROMAN = ['', 'I', 'II', 'III'];
/** The Devotion meter's words: "DEVOTION 4 · 12/32 XP" (the level, then the XP into it out of the step to the next);
 *  at the top, "DEVOTION 10 · 450 XP · FULL". */
export function devotionLabel(x: FaithView['devotionXp'] | null | undefined, level?: number): string {
  if (!x) return 'DEVOTION ' + (level ?? 0);
  return 'DEVOTION ' + x.level + (x.step != null ? ' · ' + x.into + '/' + x.step + ' XP' : ' · ' + x.total + ' XP · FULL');
}
/** The pact cooldown after leaving one (item 710), in the patrons' silence: "Nobody answers yet: 88 days". */
export const cooldownText = (days: number) => 'Nobody answers yet: ' + days + (days === 1 ? ' day' : ' days');
/** A grudge (item 713) in words: who, what it does, and how long. */
export function grudgeText(gr: NonNullable<FaithView['grudge']>): { head: string; what: string; left: string } {
  const pct = Math.round((1 - gr.xpMult) * 100);
  return { head: 'GRUDGE · ' + gr.patronName.toUpperCase(),
    what: gr.conditionName + (gr.rounds > 0 ? ' for ' + gr.rounds + (gr.rounds === 1 ? ' round' : ' rounds') : '') + ' at the start of every fight' + (pct > 0 ? '; your Devotion XP gains are cut by ' + pct + '%' : '') + '.',
    left: gr.sessionsLeft > 0 ? 'Ends after ' + gr.sessionsLeft + (gr.sessionsLeft === 1 ? ' more session' : ' more sessions') + '.' : 'Ends with this session.' };
}
/** The chance a d20 + mod meets the TN (a 1 always misses, a 20 always hits), as a whole percent. */
export function oddsOf(tn: number, mod: number): number {
  const need = tn - mod; // the die must show at least this
  const hits = Math.max(1, Math.min(19, 21 - Math.max(2, need)));
  return Math.round((hits / 20) * 100);
}
/** How a prayer goes, in a few words: "SURE" by standing, "45% · TN 14" by dice, "OVERREACH · TN 16 · 30%". */
export function oddsText(p: PrayerPreview): string {
  if (p.mode === 'standing' || !p.roll) return 'SURE';
  const pct = oddsOf(p.roll.tn, p.roll.mod) + '%';
  return p.mode === 'overreach' ? 'OVERREACH · TN ' + p.roll.tn + ' · ' + pct : 'TN ' + p.roll.tn + ' · ' + pct;
}

// ---------- the prayer buttons ----------
export interface PrayerButton {
  key: string; kind: PrayerKindUI; id: string; name: string; text: string; icon: string;
  /** "1 AP", "3 AP". */ ap: string;
  /** The gate or the dice: "ANYONE", "HYMN I · DEVOTION 3", "BY DICE · TN 14", "FAITH 7 · DEVOTION 7". */ gate: string;
  odds: string; /** An overreach: its TN, and what a miss costs in Devotion XP. */ warn?: string;
  ok: boolean; why?: string; /** What the player must pick: none, a unit (ally, enemy…), a tile, or two units. */ target: string;
  patron: string | null; tier: number; source?: 'patron' | 'kept' | 'learned';
}
function button(kind: PrayerKindUI, id: string, name: string, text: string, p: PrayerPreview, tier: number, source?: PrayerButton['source']): PrayerButton {
  const gate = kind === 'whisper' ? (p.mode === 'dice' ? 'BY DICE · TN ' + (p.roll?.tn ?? 12) : 'ANYONE')
    : kind === 'miracle' ? 'FAITH ' + MIRACLE_FAITH + ' · DEVOTION ' + (p.gate ?? GATE.miracle)
    : p.mode === 'dice' ? 'BY DICE · TN ' + (p.roll?.tn ?? '?') : 'HYMN ' + ROMAN[tier] + ' · DEVOTION ' + (p.gate ?? '?');
  return {
    key: kind + ':' + id, kind, id, name, text, icon: prayerIconUri(kind, kind === 'hymn' ? id : id, p.patron, tier), ap: p.ap + ' AP', gate,
    odds: oddsText(p), warn: p.mode === 'overreach' && p.overreach ? 'Overreach: TN ' + p.overreach.tn + ' · a miss costs ' + DEVOTION_XP.overreachMiss + ' Devotion XP' : undefined,
    ok: !!p.ok, why: p.ok ? undefined : p.why || 'Not now.', target: p.target || 'none', patron: p.patron, tier, source,
  };
}
/** Every prayer this character could make, as buttons (disabled ones keep their reason). */
export function prayerButtons(v: FaithView | null): { whispers: PrayerButton[]; hymns: PrayerButton[]; miracle: PrayerButton | null } {
  if (!v) return { whispers: [], hymns: [], miracle: null };
  return {
    whispers: v.whispers.map((w) => button('whisper', w.id, w.name, w.text, w.preview, 0)),
    hymns: v.hymns.map((h) => button('hymn', h.key, h.name, h.text, h.preview, h.tier, h.source)),
    miracle: v.miracle ? button('miracle', v.miracle.id, v.miracle.name, v.miracle.text, v.miracle.preview, 4) : null,
  };
}
/** The payload a prayer button sends, once its target is picked (faith/pray, the contract). */
export function prayAction(who: { unitId?: string; charId?: string }, b: Pick<PrayerButton, 'kind' | 'id'>, pick: { targetId?: string; targetId2?: string; tile?: string } = {}) {
  return { type: 'faith/pray' as const, ...(who.unitId ? { unitId: who.unitId } : { charId: who.charId }), kind: b.kind, id: b.id, ...pick };
}
/** Which picker a prayer's target needs (game/actionPickers.ts kinds): a unit (with a side filter), a tile, or two units. */
export function pickerFor(target: string): { kind: 'none' | 'unit' | 'tile' | 'two'; side?: 'ally' | 'enemy' | 'any'; self?: boolean; downed?: boolean; dead?: boolean } {
  switch (target) {
    case 'self': case 'none': return { kind: 'none' };
    case 'self_or_ally': return { kind: 'unit', side: 'ally', self: true };
    case 'ally': return { kind: 'unit', side: 'ally' };
    case 'downed_ally': return { kind: 'unit', side: 'ally', downed: true };
    case 'dead_ally': return { kind: 'unit', side: 'ally', dead: true };
    case 'enemy': return { kind: 'unit', side: 'enemy' };
    case 'tile': return { kind: 'tile' };
    case 'two_units': return { kind: 'two', side: 'any' };
    case 'two_allies': return { kind: 'two', side: 'ally' };
    default: return { kind: 'unit', side: 'any' };
  }
}

// ---------- the Faith panel ----------
export interface MeterCell { n: number; on: boolean; gate?: string }
export interface FaithPanel {
  faithful: boolean; title: string; sub: string; mark: string; accent: string;
  /** Devotion 0–10 with the gate marks (3 Hymn I, 5 Hymn II, 7 Hymn III and Miracle). */ meter: MeterCell[]; devotion: number;
  /** Rules 1.6.1: the level and the XP toward the next ("DEVOTION 4 · 12/32 XP"), and the fill of that step (0–1). */
  devotionText: string; xpFill: number; xp: FaithView['devotionXp']; /** The word beside the XP fill: "TO DEVOTION 5", or "FULL". */ xpNextText: string;
  /** The day counter (item 709), the cooldown after leaving a pact (item 710) and a grudge (item 713), in words. */
  day: number; dayText: string; cooldown: string | null; grudge: { head: string; what: string; left: string; text: string } | null;
  witnessed: { on: boolean; icon: string; word: string; can: boolean };
  vow: { icon: string; label: string; state: 'sworn' | 'kept' | 'broken' } | null;
  rites: { id: string; name: string; text: string; kept: boolean; engine: boolean; available: boolean; why?: string }[];
  likes: string[]; taboos: string[]; rule: string;
  /** Atheists: the pieces per patron ("Mother Ember 2/3") and the learned Hymns with their dice TN. */
  pieces: { patron: string; name: string; text: string; mark: string }[];
  learned: { name: string; patronName: string; tn: number | null }[];
  /** Faith under 3: praying is closed (the reason, in words). */ closed?: string;
}
const vowLabel = (v: FaithView['vow'], vows: FaithView['vows']) => { if (!v) return ''; const d = vows.find((x) => x.id === v.id); return (d ? d.words : v.id) + ' · ' + v.state.toUpperCase(); };
export function faithPanel(v: FaithView | null): FaithPanel | null {
  if (!v) return null;
  const faithful = v.belief.kind === 'faithful', p = v.patron;
  const meter: MeterCell[] = Array.from({ length: 11 }, (_, n) => ({ n, on: faithful && n > 0 && n <= v.devotion,
    gate: n === GATE[1] ? 'HYMN I' : n === GATE[2] ? 'HYMN II' : n === GATE[3] ? 'HYMN III · MIRACLE' : undefined }));
  const pieces = Object.entries(v.pieces || {}).filter(([, n]) => n > 0).map(([id, n]) => ({ patron: id, name: FAITH_PATRON[id]?.name || id, text: (FAITH_PATRON[id]?.name || id) + ' ' + Math.min(3, n) + '/3', mark: patronMarkUri(id) }));
  return {
    faithful, title: faithful && p ? p.name : 'ATHEIST · PILGRIM', sub: faithful && p ? p.archetype || '' : 'Prays by dice; teachers of the faiths unlock their Hymns',
    mark: p ? patronMarkUri(p.id) : witnessedUri(), accent: accentOf(p?.id, p?.accent), meter, devotion: v.devotion,
    devotionText: faithful ? devotionLabel(v.devotionXp, v.devotion) : '', xp: v.devotionXp,
    xpFill: v.devotionXp ? (v.devotionXp.step ? Math.max(0, Math.min(1, v.devotionXp.into / v.devotionXp.step)) : 1) : 0,
    xpNextText: v.devotionXp ? (v.devotionXp.step ? 'TO DEVOTION ' + (v.devotionXp.level + 1) : 'FULL') : '',
    day: v.day, dayText: 'DAY ' + v.day, cooldown: v.pactCooldown ? cooldownText(v.pactCooldown.daysLeft) : null,
    grudge: v.grudge ? { ...grudgeText(v.grudge), text: v.grudge.text } : null,
    witnessed: { on: v.witnessed, icon: witnessedUri(), word: v.witnessed ? 'WITNESSED' : 'NOT WITNESSED', can: v.canBeWitnessed },
    vow: v.vow ? { icon: vowIconUri(v.vow.id), label: vowLabel(v.vow, v.vows), state: v.vow.state } : null,
    rites: v.rites.map((r) => ({ id: r.id, name: r.name, text: r.text, kept: r.keptThisSession, engine: r.engine, available: r.available, why: r.why })),
    likes: (p?.likes || []).map((t) => t.name.toUpperCase()), taboos: (p?.taboos || []).map((t) => t.name.toUpperCase()), rule: v.rule === 'jealous' ? 'JEALOUS: no other god\'s Hymns' : v.rule === 'open' ? 'OPEN: other gods\' Hymns are kept' : '',
    pieces, learned: v.hymns.filter((h) => h.source !== 'patron').map((h) => ({ name: h.name, patronName: h.patronName, tn: h.preview.roll?.tn ?? null })),
    closed: v.faith < FAITH_MIN ? 'Praying needs Faith ' + FAITH_MIN + ' (you have ' + v.faith + ').' : undefined,
  };
}
export const panelFor = (g: any, charId: string | null | undefined) => (g && charId ? faithPanel(faithView(g, charId)) : null);

// ---------- the Belief step (creation) ----------
export interface PatronCard { id: string; name: string; archetype: string; costume: string; mark: string; portrait: string | null; accent: string;
  likes: string[]; taboos: string[]; rule: 'open' | 'jealous'; ruleText: string; hymns: string[]; miracle: string }
export function patronCards(): PatronCard[] {
  return FAITH_PATRONS.map((p: any) => ({ id: p.id, name: p.name, archetype: p.archetype || '', costume: p.costume || '', mark: patronMarkUri(p.id), portrait: null, accent: accentOf(p.id, p.accent),
    likes: (p.likes || []).map((t: string) => t.toUpperCase()), taboos: (p.taboos || []).map((t: string) => t.toUpperCase()), rule: p.rule === 'jealous' ? 'jealous' : 'open',
    ruleText: p.rule === 'jealous' ? 'JEALOUS: no other god\'s Hymns' : 'OPEN: keeps other gods\' Hymns', hymns: (p.hymns || []).map((h: any) => h.name), miracle: p.miracle?.name || '' }));
}
export const BELIEF_TEXT = {
  faithful: 'Sworn to one patron. Your standing (Devotion) grows with what you do in their sight, and opens their Hymns and, one day, a Miracle.',
  atheist: 'No patron, no leash. Pray by dice, learn Hymns from every faith you meet, and build a pilgrim\'s kit no believer can.',
  faith3: 'Praying needs Faith ' + FAITH_MIN + '. Belief is who you are; the Faith skill is what you can do with it.',
};
export { FAITH_INK, FAITH_GOLD, previewPrayer, DEVOTION_XP };
