// Outburst 4.0 (rules 1.8): feelings on screen. The feeling buttons under the HEART panel (one per known feeling, with
// its step and effect; collapsed into "Feelings ▸" with a search past six), the colour and glyph of each feeling, the
// residue tiles' tint, the unlock card, and the practice bar. The engine is the one source of numbers (previewPump,
// previewOutburstPlan, practiceOf); this file only words and styles them.
import { FEELINGS, FEELING, previewPump, revertPump, practiceOf, picksAt, nextPickAt, soulPicksLeft, gatedBy, moduleGateError, moduleClass, MODULE, SKILL } from '@engine';
import { feelingIcon, moduleIcon, heartMark } from './heartIcons';

/** Each feeling's light (a proposal for Leon; docs/design/handoffs/outburst-4.0-HANDOFF.md). Light and particles only,
 *  never body text, and always beside the feeling's word: 25 hues can't carry meaning alone (colour-system.md). Kept
 *  clear of the state colours (success green, HP red, MP blue, Echo white) by family: warm, cold, sharp, low, bright,
 *  hollow, wild, holy. */
export const FEELING_INK: Record<string, string> = {
  love: '#FF8FB1', belonging: '#FFB36B', relief: '#9FE6C8', // warm
  grief: '#7FA7FF', longing: '#A9B8FF', loneliness: '#8FC9E8', // cold
  spite: '#FF5E7A', contempt: '#C8A2FF', jealousy: '#B8E04A', // sharp
  fear: '#8E7CC3', dread: '#6B6FA8', cruelty: '#D2384F', // low
  joy: '#FFE066', hope: '#FFD9A0', wonder: '#7FF0FF', // bright
  despair: '#8A90A1', shame: '#C77D9A', guilt: '#B08E6E', // hollow
  rage: '#FF6A3D', abandon: '#FF4FD8', defiance: '#FFB000', // wild
  calm: '#A8E6FF', mercy: '#F2E6C9', awe: '#FFF1A8', pride: '#E8C547', // holy
};
export const feelingInk = (id?: string | null) => FEELING_INK[id || ''] || '#AE9BFF';
export const feelingName = (id?: string | null) => (FEELING as any)[id || '']?.name || id || '';
/** The particle motif each feeling's effects use (fx/soul.ts): a sprite or a code-drawn mark. */
export const FEELING_MOTIF: Record<string, string> = {
  rage: 'embers', abandon: 'sparks', defiance: 'sparks', grief: 'rain', longing: 'rain', loneliness: 'frost', love: 'petals', belonging: 'petals', relief: 'breath',
  spite: 'shards', contempt: 'shards', jealousy: 'shards', fear: 'smoke', dread: 'smoke', cruelty: 'thorns', joy: 'light', hope: 'light', wonder: 'light',
  despair: 'ash', shame: 'ash', guilt: 'ash', calm: 'ripples', mercy: 'ripples', awe: 'rays', pride: 'rays',
};

const r2 = (n: number) => Math.round(n * 100) / 100;
const rgba = (hex: string, a: number) => { const h = hex.replace('#', ''), n = parseInt(h.length === 3 ? h.split('').map((x) => x + x).join('') : h, 16); return 'rgba(' + (n >> 16 & 255) + ', ' + (n >> 8 & 255) + ', ' + (n & 255) + ', ' + a + ')'; };
/** An icon's markup as an <img> source: painted art's URL, or the SVG drawing tinted with the ink. */
export function iconSrc(markup: string, ink: string): string {
  const m = /<img[^>]*src="([^"]+)"/.exec(markup); if (m) return m[1];
  return 'data:image/svg+xml,' + encodeURIComponent(markup.replace(/currentColor/g, ink).replace('<svg', markup.includes('xmlns=') ? '<svg' : '<svg xmlns="http://www.w3.org/2000/svg"'));
}
export const feelingIconSrc = (id: string, ink = feelingInk(id), size = 24) => iconSrc(feelingIcon(id, size), ink);
export const moduleIconSrc = (id: string, ink = '#E7EBF3', size = 24) => iconSrc(moduleIcon(id, size), ink);
export const markIconSrc = (id: 'revert' | 'practice' | 'felt', ink = '#E7EBF3', size = 24) => iconSrc(heartMark(id, size), ink);

/** How many feeling buttons show before they collapse into "Feelings ▸" (the design's open item 3: 6 proposed). */
export const FEELINGS_OPEN_MAX = 6;
export interface FeelingBtn { id: string; name: string; ink: string; icon: string; ok: boolean; why: string; step: number; mult: number; stepText: string; effect: string; cost: string; free: boolean; does: string }
/** One button per feeling the unit knows: its step and multiplier after, its effect, and why it can't be poured now. */
export function feelingButtons(cb: any, u: any): FeelingBtn[] {
  const m = u?.mg; if (!m || !m.held) return [];
  const known: string[] = (m.feelings || []).filter((f: string) => (FEELING as any)[f]);
  return FEELINGS.filter((f: any) => known.includes(f.id)).map((f: any) => {
    const p = previewPump(cb, u, f.id), ink = feelingInk(f.id);
    const step = p.step ?? (f.step?.base ?? 0.4);
    return { id: f.id, name: f.name, ink, icon: feelingIconSrc(f.id, ink), ok: !!p.ok, why: p.ok ? '' : p.why || '', step: r2(step), mult: r2(p.mult), stepText: (step >= 0 ? '+' : '') + r2(step).toFixed(1),
      effect: f.pour?.text || '', cost: p.ok ? (p.free ? 'FREE' : p.ap + ' AP') : '', free: !!(p.ok && p.free), does: '' };
  });
}
/** Template rows for the feeling buttons: collapsed past FEELINGS_OPEN_MAX unless opened, filtered by the search. */
export function feelingRows(btns: FeelingBtn[], open: boolean, query: string, run: (id: string) => void) {
  const q = (query || '').trim().toLowerCase();
  const many = btns.length > FEELINGS_OPEN_MAX, show = !many || open;
  const list = show ? btns.filter((b) => !q || b.name.toLowerCase().includes(q) || b.effect.toLowerCase().includes(q)) : [];
  return {
    has: btns.length > 0, many, open: show, count: btns.length, canSearch: many && show,
    toggleLabel: (show ? 'Feelings ▾' : 'Feelings ▸') + ' (' + btns.length + ')',
    rows: list.map((b) => ({ key: b.id, name: b.name, icon: b.icon, ink: b.ink, off: !b.ok, cost: b.ok ? b.cost : '✕ ' + b.why.replace(/\.$/, ''), step: b.stepText, effect: b.effect,
      title: b.name + ' (step ' + b.stepText + ', ×' + b.mult + ' after): ' + b.effect + (b.why ? ' · ' + b.why : ''), pick: () => { if (b.ok) run('pump:' + b.id); },
      style: 'display: grid; grid-template-columns: 20px minmax(0, 1fr) auto; grid-template-rows: auto auto; gap: 0 6px; align-items: center; min-height: 34px; padding: 3px 7px; border-radius: 8px; text-align: left; font-family: inherit; color: #E7EBF3; cursor: ' + (b.ok ? 'pointer' : 'default') + '; border: 1px solid ' + rgba(b.ink, b.ok ? 0.75 : 0.3) + '; background: ' + rgba(b.ink, b.ok ? 0.12 : 0.04) + (b.ok ? '' : '; opacity: 0.55'),
      nameStyle: 'font-size: 12px; font-weight: 700; white-space: nowrap; overflow: hidden; text-overflow: ellipsis',
      stepStyle: 'font-size: 11px; font-weight: 700; color: ' + b.ink,
      costStyle: 'grid-column: 2 / 4; font-size: 10px; font-weight: 600; line-height: 1.25; color: #A3AEC2; white-space: nowrap; overflow: hidden; text-overflow: ellipsis' })),
    gridStyle: 'display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 4px',
    toggleStyle: 'align-self: flex-start; min-height: 26px; padding: 0 10px; border-radius: 99px; border: 1px solid #3A2E5C; background: #120E1E; color: #E7EBF3; font-family: inherit; font-size: 11px; font-weight: 700; letter-spacing: 0.06em; cursor: pointer',
  };
}
/** Revert Pump's button: free, on your turn, while a pump of this turn can be taken back. */
export function revertBtn(cb: any, u: any): { ok: boolean; why: string } {
  const m = u?.mg; if (!m || !m.held) return { ok: false, why: 'Nothing held.' };
  const units = cb.units.map((x: any) => (x.id === u.id ? { ...x, mg: { ...x.mg, held: { ...x.mg.held, felt: [...(x.mg.held.felt || [])], feltAt: [...(x.mg.held.feltAt || [])] }, pumps: [...(x.mg.pumps || [])] } } : x));
  const c = { ...cb, units, log: [], fx: [] }, uu = units.find((x: any) => x.id === u.id);
  let why: string | null = null; try { why = revertPump(c as any, uu); } catch (e: any) { why = String(e?.message || e); }
  return { ok: !why, why: why || '' };
}

// ---------- residue on the map ----------
/** The residue tiles a fight shows: tile → { feeling, ink, kind, left } (the newest residue wins, as in the engine). */
export function residueTiles(cb: any): Map<string, { feeling: string; ink: string; kind: string; left: number; name: string }> {
  const out = new Map<string, any>();
  for (const z of cb?.zones || []) if (z.kind === 'residue' && z.left > 0) for (const k of z.tiles) out.set(k, { feeling: z.feeling, ink: feelingInk(z.feeling), kind: z.residueKind || (FEELING as any)[z.feeling]?.residue?.kind || 'none', left: z.left, name: feelingName(z.feeling) });
  return out;
}
/** A residue tile's tint (under the units, over the floor) and its glyph; hidden under fog by the caller. */
export function residueTileStyle(r: { ink: string; kind: string }): string {
  return 'position: absolute; inset: 0; pointer-events: none; z-index: 1; background: ' + rgba(r.ink, r.kind === 'harms' ? 0.22 : 0.16) + '; box-shadow: inset 0 0 0 1px ' + rgba(r.ink, 0.55) + (r.kind === 'harms' ? '; background-image: repeating-linear-gradient(135deg, ' + rgba(r.ink, 0.18) + ' 0 3px, transparent 3px 8px)' : '');
}
export const residueTitle = (r: { name: string; kind: string; left: number; feeling: string }) => r.name + ' residue (' + (r.kind === 'harms' ? 'harms anyone here' : 'helps your side') + ', ' + r.left + ' round' + (r.left === 1 ? '' : 's') + '): ' + ((FEELING as any)[r.feeling]?.residue?.text || '');

// ---------- the unlock card ----------
export const feltCardText = (id: string) => 'You have felt ' + feelingName(id) + '. You can pour it in now.';

// ---------- practice and picks (the Magic tab) ----------
export interface PracticeView { practice: number; next: number; picks: number; mastered: string[]; pct: number; text: string; hint: string; modules: { id: string; name: string; gate: string; ok: boolean; why: string; locked: boolean; cls: string | null }[] }
/** The practice bar and the modules a pick can take now (practice picks, and each Mastered skill's free pick). */
export function practiceView(c: any): PracticeView | null {
  if (!c || !((c.outbursts || []).length || (c.soulKnown?.schools || []).length)) return null;
  const p = practiceOf(c), nx = nextPickAt(p), left = soulPicksLeft(c), prev = [0, 5, 15].filter((x) => x <= p).pop() ?? 0;
  const lo = picksAt(p) >= 2 ? nx - 15 : prev;
  const known: string[] = c.soulKnown?.modules || [];
  const modules = (Object.values(MODULE) as any[]).filter((m) => !known.includes(m.id)).map((m) => {
    const why = moduleGateError(c, m.id), g = m.gate;
    return { id: m.id, name: m.name, gate: g ? ((SKILL as any)[g.skill]?.name || g.skill) + ' ' + g.points : 'no gate', ok: !why, why: why || '', locked: !!m.locked, cls: moduleClass(m.id) };
  });
  return { practice: p, next: nx, picks: left.practice, mastered: left.mastered, pct: Math.max(0, Math.min(100, ((p - lo) / Math.max(1, nx - lo)) * 100)),
    text: 'PRACTICE ' + p + ' · next pick at ' + nx, hint: left.practice ? left.practice + ' module pick' + (left.practice === 1 ? '' : 's') + ' to take' : 'Release Outbursts to practise: 1, +1 a stage past 1, +1 a feeling.', modules };
}
export { gatedBy };

// ---------- the Magic tab's codex (rules 1.8 section 8: collapsible, grouped) ----------
/** The gate skills in the order the workshop groups modules (soul_modules.json gates). */
export const GATE_ORDER = ['lore_master', 'will_power', 'empathy', 'camaraderie', 'implication', 'composure'];
const GATE_BLURB: Record<string, string> = { lore_master: 'structure and the strange', will_power: 'power and Strain', empathy: 'the design itself', camaraderie: 'ally modules', implication: 'status modules', composure: 'precision' };
export interface CodexModule { id: string; name: string; icon: string; known: boolean; ok: boolean; why: string; locked: boolean; cls: string | null; text: string; cost: number; gate: string }
export interface CodexGroup { key: string; label: string; blurb: string; modules: CodexModule[] }
/** Every module, grouped by its gate skill (and the advanced classes' own), marked known, learnable now or locked. */
export function moduleGroups(c: any): CodexGroup[] {
  const known: string[] = c?.soulKnown?.modules || [];
  const mk = (m: any): CodexModule => { const why = c ? moduleGateError(c, m.id) : ''; return { id: m.id, name: m.name, icon: moduleIconSrc(m.id, known.includes(m.id) ? '#E7EBF3' : '#7F8BA1'), known: known.includes(m.id), ok: !why, why: why || '', locked: !!m.locked, cls: moduleClass(m.id), text: m.text || '', cost: m.cost || 0, gate: m.gate ? ((SKILL as any)[m.gate.skill]?.name || m.gate.skill) + ' ' + m.gate.points : '' }; };
  const all = Object.values(MODULE) as any[], used = new Set<string>(), out: CodexGroup[] = [];
  for (const sk of GATE_ORDER) { const ms = gatedBy(sk).map((id: string) => (MODULE as any)[id]).filter((m: any) => m && !m.locked); ms.forEach((m: any) => used.add(m.id)); if (ms.length) out.push({ key: sk, label: ((SKILL as any)[sk]?.name || sk), blurb: GATE_BLURB[sk] || '', modules: ms.map(mk) }); }
  const free = all.filter((m) => !used.has(m.id) && !m.locked); if (free.length) out.push({ key: 'free', label: 'No gate', blurb: 'anyone may learn these', modules: free.map(mk) });
  const adv = all.filter((m) => m.locked); if (adv.length) out.push({ key: 'advanced', label: 'Advanced classes', blurb: 'only with the class, when its batch returns', modules: adv.map(mk) });
  return out;
}
export interface CodexFeeling { id: string; name: string; icon: string; ink: string; known: boolean; step: string; effect: string; residue: string; trigger: string }
/** Every feeling: known ones with their step, effect and residue; the rest locked, with what unlocks them. */
export function feelingCodex(c: any): CodexFeeling[] {
  const known: string[] = c?.feelings || [];
  return FEELINGS.map((f: any) => { const k = known.includes(f.id), ink = feelingInk(f.id), s = f.step || {};
    const step = s.base != null ? '+' + s.base : s.per_stage != null ? '+' + s.per_stage + ' a stage' : s.per_10pct_missing != null ? '+' + s.per_10pct_missing + ' per 10% HP missing' : s.per_ally != null ? '+' + s.per_ally + ' an ally near' : '';
    return { id: f.id, name: f.name, icon: feelingIconSrc(f.id, k ? ink : '#7F8BA1'), ink, known: k, step, effect: f.pour?.text || '', residue: f.residue?.kind === 'none' ? 'No residue.' : 'Residue (' + f.residue.kind + '): ' + f.residue.text, trigger: 'Felt first when: ' + (f.trigger?.text || '') }; });
}
