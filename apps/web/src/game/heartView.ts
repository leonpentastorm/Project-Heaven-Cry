// Outburst 2.0 (rules 1.5): the heart on screen. One module for the combat Outbursts tab (design cards, the HEART
// panel), the grid previews (the reach ring, the tinted area by shape, everyone affected with their numbers), the area
// map (the same overlays for world/act), the MAGIC tab workshop, character creation and the Proving Ground.
//
// Nothing here works a rule out: every cost, refusal, number and tile comes from the engine (previewOutburstPlan,
// previewPump, outburstArea through the plan, designCost, designRange, heartReach, formSize, the cycle's own actions run
// on a throwaway copy). The held heart and Strain are read through resources.ts heldOutburstOf(), the panel's adapter.
import { SCHOOL, MODULE, TONE, TONES, STAGE_MULT, MAX_STAGE, SOUL_AP, SECOND_SCHOOL, designCost, designRange, heartReach, formSize, formOf, toneOf, toneRiders,
  previewOutburst, previewOutburstPlan, previewPump, steadyHeart, letGo, feedOutburst, setHeartWatch, outburstDamage, migrateDesign, manaBand, MANA_START,
  type OutburstPlan, type OutburstAffected } from '@engine';
import { heldOutburstOf } from './resources';
import { OPT_LABEL, optValue } from './actionPickers';

export const SOUL_INK = '#AE9BFF';
const WHITE = '#FFFFFF', RED = '#F65157', GREEN = '#6FEA77', MUTED = '#A3AEC2';
export type Form = 'bolt' | 'wave' | 'burst' | 'aura' | 'lance';
export const FORMS: Form[] = ['bolt', 'wave', 'burst', 'aura', 'lance'];
export const FORM_NAME: Record<Form, string> = { bolt: 'Bolt', wave: 'Wave', burst: 'Burst', aura: 'Aura', lance: 'Lance' };
/** Each tone's ink: Raw is Soul violet; an element blooms into its own colour (the same inks as the element effects). */
export const TONE_INK: Record<string, string> = { raw: SOUL_INK, fire: '#FF9A4A', storm: '#CFE3FF', frost: '#BDF3FF', stone: '#C9B79C', gale: '#DDF6FF', acid: '#B6E35A' };
export const toneInk = (t?: string | null) => TONE_INK[t || 'raw'] || SOUL_INK;
export const toneName = (t?: string | null) => (TONE as any)[t || 'raw']?.name || 'Raw';
const rgba = (hex: string, a: number) => { const n = parseInt(hex.slice(1), 16); return 'rgba(' + (n >> 16 & 255) + ', ' + (n >> 8 & 255) + ', ' + (n & 255) + ', ' + a + ')'; };
const r2 = (n: number) => Math.round(n * 100) / 100;

// ---------- the shape icons (our own, small, one per form) ----------
/** A 24×24 shape icon: Bolt (a dart at one target), Wave (a cone opening from you), Burst (rings round a point), Aura
 * (a ring round you), Lance (a line that pierces). The caster is the filled dot. */
export function formIconSvg(form: string, ink = SOUL_INK, size = 24): string {
  const s = 'fill="none" stroke="' + ink + '" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"', dot = (x: number, y: number, r = 2.2) => '<circle cx="' + x + '" cy="' + y + '" r="' + r + '" fill="' + ink + '"/>';
  const body: Record<string, string> = {
    bolt: dot(4, 20) + '<path ' + s + ' d="M6 18 L16 8"/><path ' + s + ' d="M11 7.5 L16.5 7.5 L16.5 13"/><circle ' + s + ' cx="19" cy="5" r="2.6"/>',
    wave: dot(4, 12) + '<path ' + s + ' d="M6 11 L19 4 M6 13 L19 20"/><path ' + s + ' d="M14 6.8 Q16.5 12 14 17.2 M19 4 Q22.6 12 19 20" opacity="0.9"/>',
    burst: '<path ' + s + ' d="M3 21 L8.5 15.5" opacity="0.6"/>' + dot(14, 10, 2) + '<circle ' + s + ' cx="14" cy="10" r="5"/><circle ' + s + ' cx="14" cy="10" r="8.5" stroke-dasharray="2.4 2.2" opacity="0.8"/>',
    aura: dot(12, 12, 3) + '<circle ' + s + ' cx="12" cy="12" r="7"/><circle ' + s + ' cx="12" cy="12" r="10" stroke-dasharray="1.6 2.6" opacity="0.7"/>',
    lance: dot(3, 12) + '<path fill="none" stroke="' + ink + '" stroke-width="2.6" stroke-linecap="round" d="M5.5 12 L21 12"/><path ' + s + ' d="M17.5 8.5 L21.5 12 L17.5 15.5"/><circle ' + s + ' cx="10" cy="12" r="3" opacity="0.75"/><circle ' + s + ' cx="15" cy="12" r="3" opacity="0.75"/>',
  };
  return '<svg xmlns="http://www.w3.org/2000/svg" width="' + size + '" height="' + size + '" viewBox="0 0 24 24">' + (body[form] || body.bolt) + '</svg>';
}
export const formIconUri = (form: string, ink = SOUL_INK) => 'data:image/svg+xml,' + encodeURIComponent(formIconSvg(form, ink));

// ---------- a design in words ----------
const DEFAULT_OPT: Record<string, string> = { buff: 'heal', control: 'push', status: 'shaken' };
/** A school's option in words ('Heal 30', 'Push 3 tiles'); the engine's default when none is set. */
export function optionName(school: string, v?: string): string {
  const o0 = v || DEFAULT_OPT[school] || ''; if (!o0) return '';
  const o = ((SCHOOL as any)[school]?.options || []).find((x: string) => optValue(x) === o0 || x === o0);
  return o ? OPT_LABEL[o] || o : o0.replace(/_/g, ' ');
}
/** The shape and its size in words: 'one target', 'cone 3', 'radius 1', 'radius 1 around you', 'line 4, pierces'. */
export function shapeText(d: any): string {
  const f = formOf(d) as Form, n = formSize(d);
  return f === 'bolt' ? 'one target' : f === 'wave' ? 'cone ' + n : f === 'burst' ? 'radius ' + n : f === 'aura' ? 'radius ' + n + ' around you' : 'line ' + n + ', pierces';
}
export interface DesignInfo { id: string; name: string; form: Form; formName: string; icon: string; tone: string; toneName: string; ink: string; reach: number; mp: number; line: string; schools: string; title: string; isArea: boolean }
/** A design card's facts, all from the engine: "WAVE · cone 3 · reach 3 · Fire · 30 MP". m: the caster's magic (a
 * unit's u.mg, or magicOf(c)); mana: the air (Normal when unknown). */
export function designInfo(m: any, d0: any, mana?: number): DesignInfo {
  const d = migrateDesign(d0), form = formOf(d) as Form, tone = toneOf(d), ink = toneInk(tone);
  const mm = m || { costSave: 0, soulRange: 0 };
  const reach = form === 'aura' ? 0 : form === 'bolt' || form === 'burst' ? designRange(mm, d) : heartReach(mm, d);
  const mp = designCost(mm, d, mana ?? MANA_START);
  const schools = (SCHOOL as any)[d.school]?.name + (d.option || DEFAULT_OPT[d.school] ? ' (' + optionName(d.school, d.option) + ')' : '') + (d.school2 ? ' + ' + (SCHOOL as any)[d.school2]?.name + ' (' + optionName(d.school2, d.option2) + ') at half' : '');
  const line = FORM_NAME[form].toUpperCase() + ' · ' + shapeText(d) + (reach ? ' · reach ' + reach : '') + ' · ' + toneName(tone) + ' · ' + mp + ' MP';
  return { id: d.id, name: d.name, form, formName: FORM_NAME[form], icon: formIconUri(form, ink), tone, toneName: toneName(tone), ink, reach, mp, line, schools,
    title: d.name + ': ' + line + '. ' + schools + '.' + (d.modules.length ? ' Modules: ' + d.modules.map((x: string) => (MODULE as any)[x]?.name || x).join(', ') + '.' : ''), isArea: form !== 'bolt' };
}

/** One school's effect at a stage multiplier, in words with its numbers (f: 1 primary, the second school's strength). */
function schoolEffect(m: any, d: any, school: string, opt: string | undefined, sm: number, f: number): string {
  const S: any = (SCHOOL as any)[school] || {}, o = opt || DEFAULT_OPT[school] || '';
  if (school === 'damage') return (d.modules.includes('inverse') ? 'a shield of ' : '') + Math.round(outburstDamage(m, d, sm) * f) + (d.modules.includes('inverse') ? ' on an ally' : ' damage');
  if (school === 'buff') return o === 'heal' ? 'heals ' + Math.round((S.heal ?? 30) * (m.healMult ?? 1) * sm * f) : optionName(school, o) + (f < 1 ? ' (half)' : '');
  if (school === 'control') return optionName(school, o) + (f < 1 ? ' (half)' : '') + ' (Body save)';
  if (school === 'status') return optionName(school, o) + (f < 1 ? ' (half)' : '') + ' (a save)';
  return S.name || school;
}
/** The workshop's verdict: both effects with numbers at stage 1, the snap and full heart, the tone's rider, the cost. */
export function designVerdict(m: any, d0: any, mana?: number): { effects: string; rider: string; line: string } {
  const d = migrateDesign(d0), mm = { soulMult: 1, healMult: 1, costSave: 0, soulRange: 0, debuff: { body: 0, brain: 0, heart: 0 }, ...(m || {}) };
  const one = schoolEffect(mm, d, d.school, d.option, 1, 1), two = d.school2 && d.school2 !== d.school ? schoolEffect(mm, d, d.school2, d.option2, 1, SECOND_SCHOOL.strength) : '';
  const dmgRange = d.school === 'damage' && !d.modules.includes('inverse') ? ' (snap ×' + STAGE_MULT[0] + ' ' + Math.round(outburstDamage(mm, d, STAGE_MULT[0])) + ', stage 4 ×' + STAGE_MULT[MAX_STAGE] + ' ' + Math.round(outburstDamage(mm, d, STAGE_MULT[MAX_STAGE])) + ')' : '';
  const tone = toneOf(d), rider = tone === 'raw' ? 'Raw: Soul damage, armour ignored; no rider.' : toneName(tone) + ': armour counts half; stage 2–3 ' + toneRiders(tone, 2).text + ' Stage 4: ' + toneRiders(tone, MAX_STAGE).text;
  return { effects: 'At stage 1: ' + one + dmgRange + (two ? '; then ' + two : '') + '.', rider, line: designInfo(mm, d, mana).line };
}

// ---------- a dry run of a cycle action (its refusal, and what it does to Strain) ----------
export function dryHeart(cb: any, uid: string, fn: (c: any, u: any) => string | null): { err: string | null; u: any } {
  const units = cb.units.map((x: any) => ({ ...x, conds: x.conds ? { ...x.conds } : x.conds, mg: x.mg ? { ...x.mg, held: x.mg.held ? { ...x.mg.held } : null } : x.mg }));
  const c = { ...cb, units, log: [], notes: [], fx: [], glyphs: [...(cb.glyphs || [])], zones: (cb.zones || []).map((z: any) => ({ ...z, hit: { ...(z.hit || {}) } })), mana: cb.mana ?? MANA_START };
  const u = units.find((x: any) => x.id === uid);
  let err: string | null = null;
  try { err = u ? fn(c, u) : 'No unit.'; } catch (e: any) { err = String(e?.message || e); }
  return { err, u };
}

// ---------- the combat Outbursts tab, not holding: design cards with Begin and Snap ----------
export interface DesignCard extends DesignInfo { beginAp: number; snapAp: number; beginWhy: string; snapWhy: string; canBegin: boolean; costText: string }
export function designCards(cb: any, u: any): DesignCard[] {
  const mg = u?.mg; if (!mg) return [];
  const mana = cb?.mana ?? MANA_START;
  return (mg.designs || []).map((d: any) => {
    const info = designInfo(mg, d, mana), b = previewOutburst(cb, u, d.id, undefined, false), sn = previewOutburstPlan(cb, u, d.id, undefined);
    const snapWhy = sn.ok || /Pick a|direction/.test(sn.why || '') ? '' : sn.why || '';
    const beginAp = b.ap || (d.modules.includes('swift') ? SOUL_AP.swiftBegin : SOUL_AP.begin), snapAp = sn.ap || beginAp + SOUL_AP.release;
    return { ...info, mp: b.cost || info.mp, beginAp, snapAp, beginWhy: b.ok ? '' : b.why || 'Not now.', snapWhy, canBegin: !!b.ok,
      costText: 'Begin ' + beginAp + ' AP' + (d.modules.includes('swift') ? ' (Swift)' : '') + ' · Snap ' + snapAp + ' AP ×' + STAGE_MULT[0] + ' · +' + (b.strain ?? 1) + ' Strain' };
  });
}

// ---------- the HEART panel (holding) ----------
export interface HeartBtn { id: string; label: string; cost: string; ok: boolean; why: string; title: string; free?: boolean }
export interface HeartPanel {
  name: string; designId: string; tone: string; toneName: string; ink: string; form: Form; formName: string; icon: string; shape: string;
  stage: number; maxStage: number; mult: number; resonance: number;
  stages: { n: number; mult: number; on: boolean; now: boolean; next: boolean }[];
  freePumps: number | null; strain: number; limit: number; warn: string; warnLevel: '' | 'caution' | 'alert'; swell: string;
  watch: boolean; steady: boolean; rider: string; feedShow: boolean;
  pump: HeartBtn; release: HeartBtn; steadyBtn: HeartBtn; letgo: HeartBtn & { strainOff: number }; feed: HeartBtn; watchBtn: HeartBtn;
}
export function heartPanel(cb: any, u: any): HeartPanel | null {
  const m = u?.mg; if (!m || !m.held) return null;
  const H = heldOutburstOf(m, m.designs, undefined, { cb, u }), h = H.held!;
  const d = (m.designs || []).find((x: any) => x.id === m.held.design);
  const info = d ? designInfo(m, d, cb?.mana) : null;
  const plan = previewOutburstPlan(cb, u, 'held', undefined);
  const pp = previewPump(cb, u);
  const stage = h.stage, maxStage = h.maxStage || MAX_STAGE;
  const dry = (fn: (c: any, x: any) => string | null) => dryHeart(cb, u.id, fn);
  const st = dry((c, x) => steadyHeart(c, x)), lg = dry((c, x) => letGo(c, x)), fd = dry((c, x) => feedOutburst(c, x)), wt = dry((c, x) => setHeartWatch(c, x, !m.held.watch));
  const off = lg.err ? 0 : Math.max(0, m.strain - (lg.u?.mg?.strain ?? m.strain));
  const glyphHere = (cb.glyphs || []).some((g: any) => g.pos === u.pos && !g.keystone);
  const over = H.strain - H.limit;
  const warn = plan.shortWarning ? 'MANA SHORT: ' + over + ' over the limit. Stunned and the heart goes off wild.' : plan.burnWarning > 0 ? 'OVER THE LIMIT: the heart burns ' + plan.burnWarning + ' true at the end of your turn.' : over === 0 ? 'AT THE LIMIT: one more Strain and the heart burns.' : '';
  const swell = h.steady ? 'Steadied: no swell next turn.' : stage >= maxStage ? 'Full: next turn only the Strain grows (+' + H.swell + ').' : 'Next turn: the swell, +1 stage (×' + STAGE_MULT[Math.min(maxStage, stage + 1)] + ') and +' + H.swell + ' Strain.';
  const relWhy = plan.ok || /Pick a|direction/.test(plan.why || '') ? '' : plan.why || '';
  const freeLeft = H.held?.freePumps ?? null;
  return {
    name: h.name, designId: h.designId, tone: h.tone, toneName: h.toneName, ink: toneInk(h.tone), form: (info?.form || 'bolt') as Form, formName: info?.formName || h.form, icon: info?.icon || formIconUri('bolt', toneInk(h.tone)), shape: info ? info.line : '',
    stage, maxStage, mult: plan.mult || STAGE_MULT[stage], resonance: plan.resonanceBonus || 0,
    stages: STAGE_MULT.slice(0, maxStage + 1).map((x, n) => ({ n, mult: x, on: n <= stage, now: n === stage, next: pp.ok && n === stage + 1 })),
    freePumps: freeLeft, strain: H.strain, limit: H.limit, warn, warnLevel: plan.shortWarning || plan.burnWarning > 0 ? 'alert' : warn ? 'caution' : '', swell,
    watch: !!m.held.watch, steady: !!m.held.steady, rider: plan.riderText, feedShow: glyphHere,
    pump: { id: 'pump', label: 'Pump', cost: pp.ok ? (pp.free ? 'FREE' : pp.ap + ' AP') : (pp.ap ? pp.ap + ' AP' : '—'), ok: pp.ok, why: pp.ok ? '' : pp.why || '', free: pp.ok && pp.free,
      title: pp.ok ? 'Stage ' + stage + ' → ' + pp.stage + ' (×' + pp.mult + ')' + (pp.free ? ': a free Pump (Empathy), ' + freeLeft + ' left this round.' : '.') : pp.why || '' },
    release: { id: 'release', label: 'Release', cost: (plan.ap || SOUL_AP.release) + ' AP', ok: !relWhy, why: relWhy, title: 'Fire it at stage ' + stage + ' (×' + (plan.mult || STAGE_MULT[stage]) + ')' + (info?.form === 'aura' ? ': all around you, no aim.' : ': pick the aim on the grid.') },
    steadyBtn: { id: 'steady', label: 'Steady', cost: SOUL_AP.steady + ' AP', ok: !st.err, why: st.err || '', title: '−1 Strain, and no swell at the start of your next turn.' },
    letgo: { id: 'letgo', label: 'Let go', cost: 'FREE', ok: !lg.err, why: lg.err || '', strainOff: off, title: 'Drop it unreleased: the built power is lost; Strain −' + off + '.' },
    feed: { id: 'feed', label: 'Feed', cost: SOUL_AP.feed + ' AP', ok: !fd.err, why: fd.err || '', title: 'Absorb the glyph on your tile: +1 stage, the glyph is gone.' },
    watchBtn: { id: 'heartwatch', label: m.held.watch ? 'Watching' : 'Heart Overwatch', cost: m.held.watch ? 'ARMED' : 'FREE', ok: !wt.err, why: wt.err || '', title: m.held.watch ? 'Armed: the first enemy into reach draws the release as your reaction. Click to stand it down.' : 'Release as a reaction when an enemy enters your reach (uses your reaction).' },
  };
}

// ---------- the grid preview ----------
export interface UnitMark { tag: string; text: string; ink: string; title: string; harm: boolean }
export interface HeartOverlay {
  on: boolean; mode: 'aim' | 'idle'; form: Form; isArea: boolean; ink: string;
  reach: Set<string>; area: Set<string>; aim: string | null; aura: Set<string>;
  marks: Map<string, UnitMark>; ok: boolean; why: string;
  /** The chip over the aimed tile: "BURST r1 · 2 ENEMIES · 1 ALLY" or "BOLT · ONE TARGET". */
  chip: string; summary: string[]; plan: OutburstPlan | null;
}
const EMPTY: HeartOverlay = { on: false, mode: 'idle', form: 'bolt', isArea: false, ink: SOUL_INK, reach: new Set(), area: new Set(), aim: null, aura: new Set(), marks: new Map(), ok: false, why: '', chip: '', summary: [], plan: null };
export const noOverlay = (): HeartOverlay => ({ ...EMPTY, reach: new Set(), area: new Set(), aura: new Set(), marks: new Map(), summary: [] });
const FAM_WORD: Record<string, string> = { body: 'Body', brain: 'Brain', heart: 'Heart' };
/** One affected creature's line: "−42 (48 − armour) · 65% to hit · Body save TN 14 · Burning 2 rounds." */
export function affectedMark(a: OutburstAffected): UnitMark {
  const bits: string[] = [];
  if (a.dmg) bits.push('−' + a.dmgAfterArmour + (a.dmgAfterArmour !== a.dmg ? ' (' + a.dmg + ' − armour)' : ''));
  if (a.heal) bits.push('+' + a.heal + ' HP');
  if (a.shield) bits.push('+' + a.shield + ' shield');
  if (a.roll) bits.push(a.roll.pct + '% to hit');
  for (const s of a.saves) bits.push((s.cond ? String(s.cond).replace(/_/g, ' ') + ': ' : '') + (FAM_WORD[s.fam] || s.fam) + ' save TN ' + s.tn);
  if (a.second) bits.push(a.second);
  if (a.rider && !/^No rider/.test(a.rider)) bits.push(a.rider.replace(/\.$/, ''));
  const harm = a.dmg > 0 || a.saves.length > 0;
  const tag = a.self ? 'YOU' : a.enemy ? 'ENEMY' : harm ? 'ALLY!' : 'ALLY';
  const ink = a.self ? WHITE : a.enemy ? RED : harm ? RED : GREEN;
  const short = a.dmg ? '−' + a.dmgAfterArmour + (a.roll ? ' · ' + a.roll.pct + '%' : '') : a.heal ? '+' + a.heal : a.shield ? '+' + a.shield + ' SH' : a.saves.length ? 'SAVE ' + a.saves[0].tn : '';
  return { tag, text: short, ink, harm, title: a.name + ' (' + tag.toLowerCase().replace('!', ', friendly fire') + '): ' + (bits.join(' · ') || 'touched') + '.' };
}
/** The overlay for an aimed release (a snap cast of a design, or the held one) at `aim` (aura: no aim). */
export function aimOverlay(cb: any, u: any, src: string | 'held', aim?: string | null): HeartOverlay {
  const plan = previewOutburstPlan(cb, u, src, aim || undefined);
  const form = plan.form as Form, ink = toneInk(plan.tone), isArea = form !== 'bolt';
  const area = new Set<string>(plan.area || []), marks = new Map<string, UnitMark>();
  for (const a of plan.affected || []) marks.set(a.unit, affectedMark(a));
  const en = (plan.affected || []).filter((a) => a.enemy).length, al = (plan.affected || []).filter((a) => a.ally).length, me = (plan.affected || []).some((a) => a.self);
  const sz = (plan.design && (u.mg?.designs || []).find((x: any) => x.id === plan.design)) ? formSize(migrateDesign(u.mg.designs.find((x: any) => x.id === plan.design))) : 0;
  const shapeW = form === 'bolt' ? 'BOLT · ONE TARGET' : form === 'wave' ? 'WAVE CONE ' + sz : form === 'burst' ? 'BURST R' + sz : form === 'aura' ? 'AURA R' + sz : 'LANCE ' + sz;
  const who = [en ? en + (en === 1 ? ' ENEMY' : ' ENEMIES') : '', al ? al + (al === 1 ? ' ALLY' : ' ALLIES') : '', me ? 'YOU' : ''].filter(Boolean).join(' · ');
  const chip = !plan.ok && plan.why && !/Pick a|direction/.test(plan.why) ? String(plan.why).split(/[:.(]/)[0].toUpperCase() : shapeW + (isArea || who ? ' · ' + (who || 'NO ONE') : '');
  const summary = (plan.affected || []).map((a) => { const k = affectedMark(a); return k.title; });
  if (plan.resonance) summary.unshift('Resonance: +' + plan.resonanceBonus + ' on the multiplier (an ally released this round).');
  return { on: true, mode: 'aim', form, isArea, ink, reach: new Set(plan.reachTiles || []), area, aim: form === 'aura' ? u.pos : aim || null, aura: new Set(), marks, ok: plan.ok, why: plan.why || '', chip, summary, plan };
}
/** While holding (not aiming): your reach ring, faint, and the tiles next to you where an elemental heart leaks. */
export function idleOverlay(cb: any, u: any): HeartOverlay {
  const m = u?.mg; if (!m?.held) return noOverlay();
  const plan = previewOutburstPlan(cb, u, 'held', undefined), tone = plan.tone, aura = new Set<string>();
  if (tone && tone !== 'raw') { const [x, y] = u.pos.split(',').map(Number), solid = new Set(cb.map.solid || []);
    for (let i = -1; i <= 1; i++) for (let j = -1; j <= 1; j++) { const k = (x + i) + ',' + (y + j); if ((i || j) && x + i >= 0 && y + j >= 0 && x + i < cb.map.w && y + j < cb.map.h && !solid.has(k)) aura.add(k); } }
  return { ...noOverlay(), on: true, mode: 'idle', form: plan.form as Form, isArea: plan.form !== 'bolt', ink: toneInk(tone), reach: new Set(plan.reachTiles || []), aura, plan };
}
/** The style of a tile's preview layer (combat grid and area map). An area shape is hatched in the tone's ink with a
 * solid edge; a bolt is one crosshair tile; the reach ring is a faint dashed line; the aura leak is dotted. */
export function overlayTileStyle(o: HeartOverlay, k: string): string {
  if (!o.on) return '';
  const base = 'position: absolute; inset: 0; z-index: 1; border-radius: 4px; pointer-events: none; box-sizing: border-box; ';
  if (o.mode === 'aim' && o.area.has(k)) {
    if (!o.isArea) return base + 'border: 3px double ' + WHITE + '; background: radial-gradient(circle, ' + rgba(o.ink, 0.55) + ' 0 18%, transparent 19% 34%, ' + rgba(o.ink, 0.5) + ' 35% 40%, transparent 41%); box-shadow: 0 0 12px ' + o.ink;
    return base + 'border: 2px solid ' + o.ink + '; background: repeating-linear-gradient(45deg, ' + rgba(o.ink, 0.42) + ' 0 5px, ' + rgba(o.ink, 0.16) + ' 5px 10px); box-shadow: inset 0 0 10px ' + rgba(o.ink, 0.5);
  }
  if (o.mode === 'aim' && o.aim === k) return base + 'border: 2px solid ' + WHITE;
  if (o.aura.has(k)) return base + 'border: 2px dotted ' + rgba(o.ink, 0.85) + '; background: ' + rgba(o.ink, 0.12);
  if (o.reach.has(k)) return base + 'border: 1px dashed ' + rgba(SOUL_INK, o.mode === 'aim' ? 0.7 : 0.4) + '; background: ' + rgba(SOUL_INK, o.mode === 'aim' ? 0.07 : 0.04);
  return '';
}
/** The expected-number chip under an affected token: "ENEMY −42 · 65%". */
export function markChipStyle(mk: UnitMark): string {
  return 'position: absolute; left: 50%; bottom: -9px; transform: translateX(-50%); z-index: 5; padding: 1px 4px; border-radius: 4px; font-size: 9.5px; font-weight: 700; line-height: 13px; letter-spacing: 0.02em; white-space: nowrap; pointer-events: none; background: #0A0D13; color: ' + mk.ink + '; border: 1px solid ' + mk.ink;
}
export const markChipText = (mk: UnitMark) => mk.tag + (mk.text ? ' ' + mk.text : '');
export const overlayRingStyle = (o: HeartOverlay) => 'position: absolute; inset: -1px; z-index: 2; border-radius: 4px; pointer-events: none; border: 3px solid ' + o.ink + '; box-shadow: 0 0 10px ' + o.ink;

// ---------- the panel's styles (shared by the combat tab and the area map) ----------
export function heartStyles(p: HeartPanel) {
  const seg = (s: HeartPanel['stages'][number]) => 'flex: 1; display: flex; flex-direction: column; align-items: center; gap: 1px; padding: 5px 0 4px; border-radius: 4px; font-size: 10px; font-weight: 700; '
    + (s.now ? 'background: ' + p.ink + '; color: #0A0D13; box-shadow: 0 0 12px ' + rgba(p.ink, 0.7) : s.on ? 'background: ' + rgba(p.ink, 0.35) + '; color: #E7EBF3' : s.next ? 'background: transparent; color: #E7EBF3; border: 1px dashed ' + p.ink : 'background: #1C2536; color: ' + MUTED);
  const btn = (b: HeartBtn, primary?: boolean) => 'display: flex; flex-direction: column; align-items: flex-start; gap: 1px; min-width: 0; min-height: 42px; padding: 4px 8px; border-radius: 8px; font-family: inherit; text-align: left; cursor: ' + (b.ok ? 'pointer' : 'default') + '; '
    + (primary ? 'border: 1px solid ' + p.ink + '; background: ' + rgba(p.ink, 0.18) + '; color: #E7EBF3' : 'border: 1px solid #3A2E5C; background: #120E1E; color: #E7EBF3') + (b.ok ? '' : '; opacity: 0.5');
  const pct = Math.max(0, Math.min(100, p.strain / Math.max(1, p.limit + 3) * 100)), lim = p.limit / Math.max(1, p.limit + 3) * 100;
  return { seg, btn,
    strainTrack: 'position: relative; flex: 1; height: 8px; border-radius: 99px; background: #1C2536; overflow: hidden',
    strainFill: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + pct + '%; background: ' + (p.strain > p.limit ? RED : p.strain === p.limit ? WHITE : SOUL_INK),
    strainMark: 'position: absolute; top: 0; bottom: 0; left: calc(' + lim + '% - 1px); width: 2px; background: ' + WHITE,
    warnStyle: 'font-size: 12px; font-weight: 700; line-height: 1.35; color: ' + (p.warnLevel === 'alert' ? RED : WHITE) };
}
/** Template-ready rows for the HEART panel (both screens use this, so the two read alike). */
export function heartVals(p: HeartPanel | null, run: (id: string) => void) {
  if (!p) return { show: false };
  const S = heartStyles(p), b = (x: HeartBtn, primary?: boolean) => ({ key: x.id, label: x.label, cost: x.cost, title: x.why ? x.label + ': ' + x.why : x.title, off: !x.ok, why: x.why, hasWhy: !!x.why, style: S.btn(x, primary), pick: () => { if (x.ok) run(x.id); },
    costStyle: 'font-size: 11px; font-weight: 700; color: ' + (x.cost === 'FREE' || x.cost === 'ARMED' ? GREEN : '#C9D3E3') });
  const btns = [b(p.pump, true), b(p.release, true), b(p.steadyBtn), { ...b(p.letgo), cost: 'FREE' + (p.letgo.strainOff ? ' · −' + p.letgo.strainOff + ' Strain' : '') }, ...(p.feedShow ? [b(p.feed)] : []), b(p.watchBtn)];
  return { show: true, name: p.name, icon: p.icon, kicker: 'HEART · ' + p.formName.toUpperCase() + ' · ' + p.toneName.toUpperCase(), shape: p.shape,
    stageText: 'STAGE ' + p.stage + ' / ' + p.maxStage, multText: '×' + r2(p.mult) + (p.resonance ? ' (Resonance +' + p.resonance + ')' : ''),
    stages: p.stages.map((s) => ({ key: 's' + s.n, n: String(s.n), mult: '×' + s.mult, style: S.seg(s), label: 'Stage ' + s.n + ' ×' + s.mult + (s.now ? ', now' : s.next ? ', next Pump' : '') })),
    free: p.freePumps == null ? 'No free Pumps (Empathy 3 gives one a round)' : p.freePumps + ' free Pump' + (p.freePumps === 1 ? '' : 's') + ' left this round',
    strainText: 'STRAIN ' + p.strain + ' / ' + p.limit, strainTrack: S.strainTrack, strainFill: S.strainFill, strainMark: S.strainMark,
    warn: p.warn, hasWarn: !!p.warn, warnStyle: S.warnStyle, swell: p.swell, rider: p.rider,
    btns, kickerStyle: 'font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: ' + p.ink,
    boxStyle: 'display: flex; flex-direction: column; gap: 7px; padding: 10px; border-radius: 12px; background: #120E1E; border: 1px solid ' + p.ink + '; box-shadow: 0 0 14px ' + rgba(p.ink, 0.25),
    multStyle: 'font-size: 22px; font-weight: 700; color: ' + p.ink };
}

// ---------- tones a character can choose (workshop, creation) ----------
export interface ToneChip { id: string; name: string; ink: string; known: boolean; free: boolean; text: string }
/** Raw, and every element tone: known ones, plus (at Visualization 1 with none learned yet) the first one free. */
export function toneChips(knownTones: string[] = [], visualization = 0): ToneChip[] {
  const firstFree = visualization >= 1 && !knownTones.length;
  return [{ id: 'raw', name: 'Raw', ink: SOUL_INK, known: true, free: false, text: (TONE as any).raw?.text || 'Soul damage, armour ignored, no rider.' },
    ...TONES.filter((t: any) => t.id !== 'raw').map((t: any) => ({ id: t.id, name: t.name, ink: toneInk(t.id), known: knownTones.includes(t.id), free: firstFree && !knownTones.includes(t.id), text: t.text || '' }))];
}
/** The shape modules (the form module a design takes, one at most). */
export const SHAPE_MODULES = FORMS.filter((f) => f !== 'bolt' && (MODULE as any)[f]);
export const isShape = (id: string) => !!(MODULE as any)[id]?.form;
export const bandOf = (mana?: number) => manaBand(mana ?? MANA_START);
