// Outburst 2.0 (rules 1.5): the heart on screen. One module for the combat Outbursts tab (design cards, the HEART
// panel), the grid previews (the reach ring, the tinted area by shape, everyone affected with their numbers), the area
// map (the same overlays for world/act), the MAGIC tab workshop, character creation and the Proving Ground.
//
// Nothing here works a rule out: every cost, refusal, number and tile comes from the engine (previewOutburstPlan,
// previewPump, outburstArea through the plan, designCost, designRange, heartReach, formSize, the cycle's own actions run
// on a throwaway copy). The held heart and Strain are read through resources.ts heldOutburstOf(), the panel's adapter.
import { inverseShield, outburstHeal, SCHOOL, MODULE, TONE, TONES, STAGE_MULT, MAX_STAGE, SOUL_AP, SECOND_SCHOOL, SOUL_RULES, damageModeMult, designCost, designRange, heartReach, formSize, formOf, toneOf, toneRiders,
  previewOutburst, previewOutburstPlan, previewPump, pumpsMp, togglesFor, steadyHeart, letGo, feedOutburst, setHeartWatch, outburstDamage, migrateDesign, manaBand, MANA_START, SOUL_DAMAGE,
  type OutburstPlan, type OutburstAffected } from '@engine';
import { feelingButtons, feelingRows, revertBtn, feelingInk, feelingName, feelingIconSrc, type FeelingBtn } from './feelingsView';
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
/** A school's option in words ('Heal', 'Push 3 tiles'); the engine's default when none is set. */
export function optionName(school: string, v?: string): string {
  const o0 = v || DEFAULT_OPT[school] || ''; if (!o0) return '';
  const o = ((SCHOOL as any)[school]?.options || []).find((x: string) => optValue(x) === o0 || x === o0);
  return o ? OPT_LABEL[o] || o : o0.replace(/_/g, ' ');
}
/** The shape and its size in words: 'one target', 'cone 3 from you', 'radius 1', 'radius 1 around you', 'line 4 from
 * you, pierces'. A Wave and a Lance start at you: their size is their reach (the engine's rule), so the card names no
 * separate reach for them. */
export function shapeText(d: any): string {
  const f = formOf(d) as Form, n = formSize(d);
  return f === 'bolt' ? 'one target' : f === 'wave' ? 'cone ' + n + ' from you' : f === 'burst' ? 'radius ' + n : f === 'aura' ? 'radius ' + n + ' around you' : 'line ' + n + ' from you, pierces';
}
/** Where a design reaches, in words: a Bolt and a Burst are aimed ('reach 4 tiles'); a Wave and a Lance start at you
 * ('cone 3 from you', 'line 4 from you'); an Aura sits on you ('around you'). m: the caster's magic, or {soulRange}. */
export function reachWords(m: any, d0: any): string {
  const d = migrateDesign(d0), f = formOf(d) as Form, mm = m || { costSave: 0, soulRange: 0 }, n = formSize(d);
  return f === 'bolt' || f === 'burst' ? 'reach ' + designRange(mm, d) + ' tiles' : f === 'wave' ? 'cone ' + n + ' from you' : f === 'lance' ? 'line ' + n + ' from you' : 'radius ' + n + ' around you';
}
export interface DesignInfo { id: string; name: string; form: Form; formName: string; icon: string; tone: string; toneName: string; ink: string; reach: number; mp: number; line: string; schools: string; title: string; isArea: boolean }
/** A design card's facts, all from the engine: "WAVE · cone 3 from you · Fire · 30 MP", "BOLT · one target · reach 4 ·
 * Raw · 20 MP" (a reach only where you aim it away from you: a Bolt and a Burst). m: the caster's magic (a
 * unit's u.mg, or magicOf(c)); mana: the air (Normal when unknown). */
export function designInfo(m: any, d0: any, mana?: number): DesignInfo {
  const d = migrateDesign(d0), form = formOf(d) as Form, tone = toneOf(d), ink = toneInk(tone);
  const mm = m || { costSave: 0, soulRange: 0 };
  const reach = form === 'aura' ? 0 : form === 'bolt' || form === 'burst' ? designRange(mm, d) : heartReach(mm, d);
  const aimed = form === 'bolt' || form === 'burst';
  const mp = designCost(mm, d, mana ?? MANA_START);
  const schools = (SCHOOL as any)[d.school]?.name + (d.option || DEFAULT_OPT[d.school] ? ' (' + optionName(d.school, d.option) + ')' : '') + (d.school2 ? ' + ' + (SCHOOL as any)[d.school2]?.name + ' (' + optionName(d.school2, d.option2) + ') at half' : '');
  const line = FORM_NAME[form].toUpperCase() + ' · ' + shapeText(d) + (aimed && reach ? ' · reach ' + reach : '') + ' · ' + toneName(tone) + ' · ' + mp + ' MP';
  return { id: d.id, name: d.name, form, formName: FORM_NAME[form], icon: formIconUri(form, ink), tone, toneName: toneName(tone), ink, reach, mp, line, schools,
    title: d.name + ': ' + line + '. ' + schools + '.' + (d.modules.length ? ' Modules: ' + d.modules.map((x: string) => (MODULE as any)[x]?.name || x).join(', ') + '.' : ''), isArea: form !== 'bolt' };
}

/** One school's effect at a stage multiplier, in words with its numbers (f: 1 primary, the second school's strength). */
function schoolEffect(m: any, d: any, school: string, opt: string | undefined, sm: number, f: number): string {
  const S: any = (SCHOOL as any)[school] || {}, o = opt || DEFAULT_OPT[school] || '';
  // Inverse (rules 1.20): the shield has its own base (the engine's number, inverseShield).
  if (school === 'damage') {
    const inv = d.modules.includes('inverse'), raw = outburstDamage(m, d, sm) * f;
    if (inv) return 'a shield of ' + Math.floor(inverseShield(m, d, sm) * f) + ' on ' + (formOf(d) === 'bolt' ? 'an ally' : 'each ally');
    // Rules 1.19: the way it strikes, with the engine's own numbers (soul_modules.json damage.modes).
    const md: any = (SOUL_RULES as any).damage?.modes?.[o] || null, n = Math.floor(raw * damageModeMult(o));
    return n + ' damage' + (!md ? '' : md.mult_low != null ? ' (Finish: ' + Math.floor(raw * md.mult_low) + ' against a target at half its HP or less)' : md.condition ? ', and the target is Marked for your side (Brand)' : md.heal_of_damage ? ', and you heal for a quarter of the HP it takes (Drain)' : '');
  }
  if (school === 'buff') return o === 'heal' ? 'heals ' + Math.floor(outburstHeal(m, d, sm) * f) + (formOf(d) === 'bolt' ? '' : ' each') : optionName(school, o) + (f < 1 ? ' (half)' : '');
  // Rules 1.19: these read the stage too (a harder save every 2 stages, longer from stage 3).
  if (school === 'control') return optionName(school, o) + (f < 1 ? ' (half)' : '') + (o === 'swap' ? ' (Body save; an ally doesn\'t resist)' : ' (Body save; harder to resist as the stage rises)');
  if (school === 'status') return optionName(school, o) + (f < 1 ? ' (half)' : '') + ' (a save; harder to resist as the stage rises)';
  return S.name || school;
}
/** The workshop's verdict: both effects with numbers at stage 1, the snap and full heart, the tone's rider, the cost. */
export function designVerdict(m: any, d0: any, mana?: number): { effects: string; rider: string; line: string } {
  // soulBase: the workshop is a character's (rules 1.17: the Damage base a character's heart carries); the stage 1 multiplier is the table's.
  const d = migrateDesign(d0), mm = { soulMult: 1, healMult: 1, costSave: 0, soulRange: 0, soulBase: SOUL_DAMAGE, debuff: { body: 0, brain: 0, heart: 0 }, ...(m || {}) }, s1 = STAGE_MULT[1];
  if (mm.soulBase == null) mm.soulBase = SOUL_DAMAGE;
  const one = schoolEffect(mm, d, d.school, d.option, s1, 1), two = d.school2 && d.school2 !== d.school ? schoolEffect(mm, d, d.school2, d.option2, s1, SECOND_SCHOOL.strength) : '';
  const dmgRange = d.school === 'damage' && !d.modules.includes('inverse') ? ' (snap ×' + STAGE_MULT[0] + ' ' + Math.floor(outburstDamage(mm, d, STAGE_MULT[0])) + ', stage 4 ×' + STAGE_MULT[MAX_STAGE] + ' ' + Math.floor(outburstDamage(mm, d, STAGE_MULT[MAX_STAGE])) + ')' : '';
  const tone = toneOf(d), rider = tone === 'raw' ? 'Raw: Soul damage that ignores armour. No rider.' : toneName(tone) + ': armour counts half; stage 2–3 ' + toneRiders(tone, 2).text + ' Stage 4: ' + toneRiders(tone, MAX_STAGE).text;
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
export interface DesignCard extends DesignInfo { beginAp: number; snapAp: number; beginWhy: string; snapWhy: string; canBegin: boolean; costText: string;
  /** Rules 1.24: the MP of the Begin and four Pumps (a full heart); the Begin's alone when Pumps take none. */ fullMp: number;
  /** Heart Overload (rules 1.14): right after a Release at stage 2 or higher, this design may Begin again for 0 AP.
   * `again` is the card's line for it ('' when it isn't offered here); `bloodHp` the HP the Begin costs when the mana is short. */
  again: string; bloodHp: number }
/** A preview with these switches set on the action (as the click would carry them), read on the live fight. */
function withMods<T>(cb: any, mods: string[], fn: () => T): T {
  const had = 'mods' in cb, was = cb.mods; cb.mods = mods;
  try { return fn(); } finally { if (had) cb.mods = was; else delete cb.mods; }
}
/** The switches items put on an action of this unit's ('combat/outburst', 'combat/pump'), or none. */
function switches(cb: any, u: any, on: string): { id: string; itemKey: string; why: string | null; on: boolean; preview: string | null }[] {
  try { return togglesFor({ u, cb } as any, on, {}, cb?.mods || []); } catch { return []; }
}
const HO_AGAIN = 'perk:heart_overload#again', OVERDRAW = 'skill:will_power.3#overdraw';
export function designCards(cb: any, u: any): DesignCard[] {
  const mg = u?.mg; if (!mg) return [];
  const mana = cb?.mana ?? MANA_START;
  // Heart Overload's free Begin is on by default while it is offered: the card shows it, and the price without it tells
  // which design it is for.
  const offered = switches(cb, u, 'combat/outburst').some((t) => t.id === HO_AGAIN && !t.why);
  return (mg.designs || []).map((d: any) => {
    const info = designInfo(mg, d, mana), b = previewOutburst(cb, u, d.id, undefined, false), sn = previewOutburstPlan(cb, u, d.id, undefined);
    const snapWhy = sn.ok || /Pick a|direction/.test(sn.why || '') ? '' : sn.why || '';
    const plainAp = d.modules.includes('swift') ? SOUL_AP.swiftBegin : SOUL_AP.begin;
    const free = offered && b.ap === 0 && withMods(cb, ['!' + HO_AGAIN], () => previewOutburst(cb, u, d.id, undefined, false)).ap > 0;
    const beginAp = free ? 0 : b.ap || plainAp, snapAp = sn.ap || plainAp + SOUL_AP.release, bloodHp = free ? b.hp || 0 : 0;
    const fullMp = bloodHp ? 0 : (b.cost || 0) + pumpsMp(u, MAX_STAGE, 0, b.cost || 0);
    const again = free ? 'Heart Overload: Begin ' + info.name + ' again for 0 AP' + (bloodHp ? '. You don\'t have the mana: it costs ' + bloodHp + ' HP, and it can\'t heal or shield' : '') + '.' : '';
    return { ...info, mp: bloodHp ? 0 : b.cost || info.mp, beginAp, snapAp, beginWhy: b.ok ? '' : b.why || 'Not now.', snapWhy, canBegin: !!b.ok, again, bloodHp,
      costText: (free ? 'Heart Overload: Begin again 0 AP' + (bloodHp ? ' · ' + bloodHp + ' HP for the mana' : '') : 'Begin ' + beginAp + ' AP' + (d.modules.includes('swift') ? ' (Swift)' : ''))
        + ' · Snap ' + snapAp + ' AP ×' + STAGE_MULT[0] + ' · +' + (b.strain ?? 1) + ' Strain'
        // rules 1.24: what a full heart of it comes to (the Begin and its four Pumps), when Pumps take MP
        + (fullMp > (b.cost || 0) ? ' · full heart ' + fullMp + ' MP' : ''), fullMp };
  });
}

// ---------- the HEART panel (holding) ----------
export interface HeartBtn { id: string; label: string; cost: string; ok: boolean; why: string; title: string; free?: boolean }
export interface HeartPanel {
  name: string; designId: string; tone: string; toneName: string; ink: string; form: Form; formName: string; icon: string; shape: string;
  stage: number; maxStage: number; mult: number; resonance: number;
  /** What items add to the Release's multiplier, already inside `mult` ("Resonance +10%": the perk, rules 1.14). */
  multNotes: string[];
  /** Overdraw (rules 1.14): '' when the character doesn't have it, else its line now (ready, or why not this Pump). */
  overdraw: string;
  stages: { n: number; mult: number; on: boolean; now: boolean; next: boolean; feeling: string | null }[];
  /** Rules 1.8: the feelings poured in, what they change ("now HEALS"), the feeling buttons and Revert Pump. */
  felt: string[]; does: string[]; feelings: FeelingBtn[]; revert: HeartBtn;
  freePumps: number | null; strain: number; limit: number; warn: string; warnLevel: '' | 'caution' | 'alert'; swell: string;
  watch: boolean; steady: boolean; rider: string; feedShow: boolean;
  pump: HeartBtn & { ap: number; /** rules 1.24: the MP this Pump takes */ mp: number }; release: HeartBtn; steadyBtn: HeartBtn; letgo: HeartBtn & { strainOff: number }; feed: HeartBtn; watchBtn: HeartBtn;
}
/** A Pump's price as its button shows it (rules 1.24): "1 AP · 4 MP"; a free Pump with MP owed "0 AP · 4 MP"; "FREE"
 * only when it takes neither (a heart that draws on the air, or one begun for no MP). */
export const pumpCost = (pp: { ap: number; mp?: number; free?: boolean }): string => (pp.mp ? (pp.free ? '0 AP' : pp.ap + ' AP') + ' · ' + pp.mp + ' MP' : pp.free ? 'FREE' : pp.ap + ' AP');
/** mods: the toggles on the release being planned (Heart Surge…), as the action would carry them. */
export function heartPanel(cb: any, u: any, mods?: string[]): HeartPanel | null {
  const m = u?.mg; if (!m || !m.held) return null;
  const H = heldOutburstOf(m, m.designs, undefined, { cb, u }), h = H.held!;
  const d = (m.designs || []).find((x: any) => x.id === m.held.design);
  const info = d ? designInfo(m, d, cb?.mana) : null;
  const plan = previewOutburstPlan(cb, u, 'held', undefined, mods ? { mods } : {});
  // The Pump as it would go with the switches set on it (Overdraw: 2 stages), and Overdraw's own state this turn.
  const pp = mods ? withMods(cb, mods, () => previewPump(cb, u)) : previewPump(cb, u);
  const od = switches(cb, u, 'combat/pump').find((t) => t.id === OVERDRAW);
  const overdraw = !od ? '' : od.why ? 'Overdraw: ' + od.why : 'Overdraw is ready this turn. ' + (od.preview || '');
  const notes: string[] = plan.multNotes || [];
  const felt: string[] = m.held.felt || [], feltAt: number[] = m.held.feltAt || [], fAt = (n: number) => { const i = feltAt.lastIndexOf(n); return i >= 0 ? felt[i] : null; };
  const rv = revertBtn(cb, u);
  const stage = h.stage, maxStage = h.maxStage || MAX_STAGE;
  const dry = (fn: (c: any, x: any) => string | null) => dryHeart(cb, u.id, fn);
  const st = dry((c, x) => steadyHeart(c, x)), lg = dry((c, x) => letGo(c, x)), fd = dry((c, x) => feedOutburst(c, x)), wt = dry((c, x) => setHeartWatch(c, x, !m.held.watch));
  const off = lg.err ? 0 : Math.max(0, m.strain - (lg.u?.mg?.strain ?? m.strain));
  const glyphHere = (cb.glyphs || []).some((g: any) => g.pos === u.pos && !g.keystone);
  const over = H.strain - H.limit;
  const warn = plan.shortWarning ? 'MANA SHORT: ' + over + ' over the limit. You are Stunned and the held Outburst goes off wild.' : plan.burnWarning > 0 ? 'OVER THE LIMIT: the heart burns you for ' + plan.burnWarning + ' true damage at the end of your turn.' : over === 0 ? 'AT THE LIMIT: one more Strain and the heart starts to burn you.' : '';
  const swell = h.steady ? 'Steadied: no swell next turn.' : stage >= maxStage ? 'At full stage: next turn only your Strain grows (+' + H.swell + ').' : 'Next turn it swells: +1 stage (×' + STAGE_MULT[Math.min(maxStage, stage + 1)] + ') and +' + H.swell + ' Strain.';
  const relWhy = plan.ok || /Pick a|direction/.test(plan.why || '') ? '' : plan.why || '';
  const freeLeft = H.held?.freePumps ?? null;
  return {
    name: h.name, designId: h.designId, tone: h.tone, toneName: h.toneName, ink: toneInk(h.tone), form: (info?.form || 'bolt') as Form, formName: info?.formName || h.form, icon: info?.icon || formIconUri('bolt', toneInk(h.tone)), shape: info ? info.line : '',
    stage, maxStage, mult: plan.mult || STAGE_MULT[stage], resonance: plan.resonanceBonus || 0, multNotes: notes, overdraw,
    stages: STAGE_MULT.slice(0, maxStage + 1).map((x, n) => ({ n, mult: x, on: n <= stage, now: n === stage, next: pp.ok && n === pp.stage, feeling: n <= stage ? fAt(n) : null })),
    felt, does: plan.does || [], feelings: feelingButtons(cb, u),
    revert: { id: 'revert', label: '↶ Revert', cost: 'FREE', ok: rv.ok, why: rv.ok ? '' : rv.why, title: 'Take back your last Pump this turn: its stage, its feeling, and the AP, MP and Strain it cost.' },
    freePumps: freeLeft, strain: H.strain, limit: H.limit, warn, warnLevel: plan.shortWarning || plan.burnWarning > 0 ? 'alert' : warn ? 'caution' : '', swell,
    watch: !!m.held.watch, steady: !!m.held.steady, rider: plan.riderText, feedShow: glyphHere,
    // Rules 1.24: a Pump takes MP too (the engine's number). A free Pump is free of AP only, so with MP owed it reads "0 AP · 4 MP".
    pump: { id: 'pump', label: 'Pump', ap: pp.ap, mp: pp.mp || 0, cost: pp.ok ? pumpCost(pp) : (pp.ap ? pp.ap + ' AP' : '—'), ok: pp.ok, why: pp.ok ? '' : pp.why || '', free: pp.ok && pp.free,
      title: pp.ok ? (pp.note ? 'An Overdraw Pump' : 'A plain Pump') + ': stage ' + stage + ' → ' + pp.stage + ' (×' + pp.mult + ')' + (pp.freeKind === 'first' ? '. This is your free first Pump of the fight' : pp.free ? '. This is your free Pump for this turn' : '')
        + (pp.mp ? (pp.free ? ': it costs no AP, and ' : '. It takes ') + pp.mp + ' MP (you have ' + Math.floor(m.mp) + ').' : '.')
        + (pp.note ? ' ' + pp.note : overdraw && !od?.why ? ' ' + overdraw : '') : pp.why || '' },
    release: { id: 'release', label: 'Release', cost: (plan.ap || SOUL_AP.release) + ' AP', ok: !relWhy, why: relWhy, title: 'Fire it at stage ' + (plan.stage ?? stage) + ' (×' + (plan.mult || STAGE_MULT[stage]) + ')' + ((plan.stage ?? stage) !== stage ? ' (surged from stage ' + stage + ')' : '') + (notes.length ? '. ' + notes.join(', ') + ' is in that number, built by the Releases before this one' : '') + (info?.form === 'aura' ? '. It goes off all around you, with no aim.' : '. Pick the aim on the grid.') },
    steadyBtn: { id: 'steady', label: 'Steady', cost: SOUL_AP.steady + ' AP', ok: !st.err, why: st.err || '', title: 'Lose 1 Strain, and the Outburst doesn\'t swell at the start of your next turn.' },
    letgo: { id: 'letgo', label: 'Let go', cost: 'FREE', ok: !lg.err, why: lg.err || '', strainOff: off, title: 'Drop the Outburst without releasing it. The power you built is lost, and you lose ' + off + ' Strain.' },
    feed: { id: 'feed', label: 'Feed', cost: SOUL_AP.feed + ' AP', ok: !fd.err, why: fd.err || '', title: 'Absorb the glyph on your tile: +1 stage, and the glyph is gone.' },
    watchBtn: { id: 'heartwatch', label: m.held.watch ? '◉ Watching' : '◉ Overwatch', cost: m.held.watch ? 'ARMED' : 'FREE', ok: !wt.err, why: wt.err || '', title: m.held.watch ? 'On: you Release at the first enemy that comes into your reach, as your reaction. Click to turn it off.' : 'Hold the Outburst and Release it as your reaction when an enemy comes into your reach.' },
  };
}

// ---------- the grid preview ----------
export interface UnitMark { tag: string; text: string; ink: string; title: string; harm: boolean }
export interface HeartOverlay {
  on: boolean; mode: 'aim' | 'idle'; form: Form; isArea: boolean; ink: string;
  reach: Set<string>; area: Set<string>; aim: string | null; aura: Set<string>;
  marks: Map<string, UnitMark>; ok: boolean; why: string;
  /** Rules 1.8: the residue the release would leave (its tiles, its feeling's colour). */
  residue?: { tiles: Set<string>; ink: string } | null;
  /** The chip over the aimed tile: "BURST r1 · 2 ENEMIES · 1 ALLY" or "BOLT · ONE TARGET". */
  chip: string; summary: string[]; plan: OutburstPlan | null;
}
const EMPTY: HeartOverlay = { on: false, mode: 'idle', form: 'bolt', isArea: false, ink: SOUL_INK, reach: new Set(), area: new Set(), aim: null, aura: new Set(), marks: new Map(), ok: false, why: '', chip: '', summary: [], plan: null };
export const noOverlay = (): HeartOverlay => ({ ...EMPTY, reach: new Set(), area: new Set(), aura: new Set(), marks: new Map(), summary: [] });
const FAM_WORD: Record<string, string> = { body: 'Body', brain: 'Brain', heart: 'Heart' };
const VIA_WORD: Record<string, string> = { chain: 'CHAIN', spread: 'SPREAD', push: 'PUSHED', arc: 'ARC' };
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
  // Past the area (rules 1.5 section 7: everyone affected): how it reaches them, in words on the chip.
  const via = a.via && a.via !== 'area' ? VIA_WORD[a.via] || '' : '', harm2 = harm || a.via === 'push' || a.via === 'spread';
  const num = a.dmg ? '−' + a.dmgAfterArmour + (a.roll ? ' · ' + a.roll.pct + '%' : '') : a.heal ? '+' + a.heal : a.shield ? '+' + a.shield + ' SH' : a.saves.length ? 'SAVE ' + a.saves[0].tn : '';
  const short = [via, num].filter(Boolean).join(' ');
  const tag = a.self ? 'YOU' : a.enemy ? 'ENEMY' : harm2 ? 'ALLY!' : 'ALLY', ink = a.self ? WHITE : a.enemy ? RED : harm2 ? RED : GREEN;
  return { tag, text: short, ink, harm: harm2, title: a.name + ' (' + tag.toLowerCase().replace('!', ', friendly fire') + (via ? ', ' + via.toLowerCase() : '') + '): ' + (bits.join(' · ') || 'touched') + '.' };
}
/** The overlay for an aimed release (a snap cast of a design, or the held one) at `aim` (aura: no aim). */
export function aimOverlay(cb: any, u: any, src: string | 'held', aim?: string | null, mods?: string[]): HeartOverlay {
  const plan = previewOutburstPlan(cb, u, src, aim || undefined, mods ? { mods } : {});
  const form = plan.form as Form, ink = toneInk(plan.tone), isArea = form !== 'bolt';
  const area = new Set<string>(plan.area || []), marks = new Map<string, UnitMark>();
  for (const a of plan.affected || []) marks.set(a.unit, affectedMark(a));
  const en = (plan.affected || []).filter((a) => a.enemy).length, al = (plan.affected || []).filter((a) => a.ally).length, me = (plan.affected || []).some((a) => a.self);
  const sz = (plan.design && (u.mg?.designs || []).find((x: any) => x.id === plan.design)) ? formSize(migrateDesign(u.mg.designs.find((x: any) => x.id === plan.design))) : 0;
  const shapeW = form === 'bolt' ? 'BOLT · ONE TARGET' : form === 'wave' ? 'WAVE CONE ' + sz : form === 'burst' ? 'BURST R' + sz : form === 'aura' ? 'AURA R' + sz : 'LANCE ' + sz;
  const who = [en ? en + (en === 1 ? ' ENEMY' : ' ENEMIES') : '', al ? al + (al === 1 ? ' ALLY' : ' ALLIES') : '', me ? 'YOU' : ''].filter(Boolean).join(' · ');
  const chip = !plan.ok && plan.why && !/Pick a|direction/.test(plan.why) ? String(plan.why).split(/[:.(]/)[0].toUpperCase() : shapeW + (isArea || who ? ' · ' + (who || 'NO ONE') : '');
  const summary = (plan.affected || []).map((a) => { const k = affectedMark(a); return k.title; });
  if (plan.resonance) summary.unshift('Resonance: +' + plan.resonanceBonus + ' to the multiplier, because an ally Released this round.');
  // The perk (rules 1.14): what the Releases before this one add to it (your own; an ally's you saw, at tier II), already in the numbers shown.
  for (const n of plan.multNotes || []) summary.unshift(n + ' to this Release, built by the Releases before it.');
  // Rules 1.8: what the feelings change, and the residue the release would leave (its tiles get a dashed edge in its colour).
  if (plan.does?.length) summary.unshift('Feelings: ' + plan.does.join(' · ') + '.');
  if (plan.residue) summary.push(feelingName(plan.residue.feeling) + ' residue on ' + plan.residue.tiles.length + ' tile' + (plan.residue.tiles.length === 1 ? '' : 's') + ' for 2 rounds: ' + plan.residue.text);
  return { on: true, mode: 'aim', form, isArea, ink, reach: new Set(plan.reachTiles || []), area, aim: form === 'aura' ? u.pos : aim || null, aura: new Set(), marks, ok: plan.ok, why: plan.why || '', chip, summary, plan,
    residue: plan.residue ? { tiles: new Set(plan.residue.tiles), ink: feelingInk(plan.residue.feeling) } : null };
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
    return base + 'border: 2px solid ' + o.ink + '; background: repeating-linear-gradient(45deg, ' + rgba(o.ink, 0.42) + ' 0 5px, ' + rgba(o.ink, 0.16) + ' 5px 10px); box-shadow: inset 0 0 10px ' + rgba(o.ink, 0.5) + (o.residue?.tiles.has(k) ? ', inset 0 0 0 4px ' + rgba(o.residue.ink, 0.55) : '');
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
  const seg = (s: HeartPanel['stages'][number]) => 'flex: 1; display: flex; flex-direction: row; justify-content: center; align-items: center; gap: 4px; padding: 2px 0; line-height: 1.2; border-radius: 4px; font-size: 10px; font-weight: 700; '
    + (s.feeling ? 'background: ' + rgba(feelingInk(s.feeling), s.now ? 0.85 : 0.45) + '; color: ' + (s.now ? '#0A0D13' : '#E7EBF3') + '; box-shadow: ' + (s.now ? '0 0 12px ' + rgba(feelingInk(s.feeling), 0.8) : 'inset 0 0 0 1px ' + feelingInk(s.feeling))
    : s.now ? 'background: ' + p.ink + '; color: #0A0D13; box-shadow: 0 0 12px ' + rgba(p.ink, 0.7) : s.on ? 'background: ' + rgba(p.ink, 0.35) + '; color: #E7EBF3' : s.next ? 'background: transparent; color: #E7EBF3; border: 1px dashed ' + p.ink : 'background: #1C2536; color: ' + MUTED);
  // Compact: one line per button (the label left, its cost or its refusal right), so the panel's buttons sit in two rows.
  const btn = (b: HeartBtn, primary?: boolean) => 'display: flex; flex-direction: row; align-items: center; justify-content: space-between; gap: 4px; min-width: 0; min-height: 30px; padding: 2px 7px; border-radius: 8px; font-family: inherit; text-align: left; overflow: hidden; cursor: ' + (b.ok ? 'pointer' : 'default') + '; '
    + (primary ? 'border: 1px solid ' + p.ink + '; background: ' + rgba(p.ink, 0.18) + '; color: #E7EBF3' : 'border: 1px solid #3A2E5C; background: #120E1E; color: #E7EBF3') + (b.ok ? '' : '; opacity: 0.5');
  const pct = Math.max(0, Math.min(100, p.strain / Math.max(1, p.limit + 3) * 100)), lim = p.limit / Math.max(1, p.limit + 3) * 100;
  return { seg, btn,
    strainTrack: 'position: relative; flex: 1; height: 8px; border-radius: 99px; background: #1C2536; overflow: hidden',
    strainFill: 'position: absolute; left: 0; top: 0; bottom: 0; width: ' + pct + '%; background: ' + (p.strain > p.limit ? RED : p.strain === p.limit ? WHITE : SOUL_INK),
    strainMark: 'position: absolute; top: 0; bottom: 0; left: calc(' + lim + '% - 1px); width: 2px; background: ' + WHITE,
    warnStyle: 'font-size: 12px; font-weight: 700; line-height: 1.35; color: ' + (p.warnLevel === 'alert' ? RED : WHITE) };
}
/** Template-ready rows for the HEART panel (both screens use this, so the two read alike). */
export function heartVals(p: HeartPanel | null, run: (id: string) => void, fo: { open?: boolean; query?: string; toggle?: () => void; search?: (e: any) => void } = {}) {
  if (!p) return { show: false };
  // A refused button shows its reason in place of its cost (✕ Needs 1 AP), the whole reason in its title: one line each.
  const b = (x: HeartBtn, primary?: boolean, cost = x.cost) => ({ key: x.id, label: x.label, cost: x.why ? '✕ ' + x.why.replace(/\.$/, '') : cost, title: x.why ? x.label + ': ' + x.why : x.title, off: !x.ok, why: x.why, hasWhy: false, style: S.btn(x, primary), pick: () => { if (x.ok) run(x.id); },
    costStyle: 'min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-size: 10.5px; font-weight: 700; color: ' + (x.why ? MUTED : cost === 'FREE' || /^FREE/.test(cost) || /^0 AP/.test(cost) || cost === 'ARMED' ? GREEN : '#C9D3E3') });
  const S = heartStyles(p);
  const btns = [b(p.pump, true), b(p.release, true), b(p.steadyBtn), b(p.letgo, false, 'FREE' + (p.letgo.strainOff ? ' · −' + p.letgo.strainOff + ' STRAIN' : '')), ...(p.feedShow ? [b(p.feed)] : []), b(p.watchBtn), ...(p.revert.ok ? [b(p.revert)] : [])];
  const fr = feelingRows(p.feelings, !!fo.open, fo.query || '', run);
  const doesInk = p.felt.length ? feelingInk(p.felt[p.felt.length - 1]) : p.ink;
  // Two rows: three across, four when Feed shows (seven buttons).
  const cols = btns.length > 6 ? 4 : 3;
  return { show: true, name: p.name, icon: p.icon, kicker: 'HEART · ' + p.formName.toUpperCase() + ' · ' + p.toneName.toUpperCase(), shape: p.shape,
    stageText: 'STAGE ' + p.stage + ' / ' + p.maxStage, multText: '×' + r2(p.mult),
    // What the feelings change ("now HEALS · now CHAINS") on its own wrapping line under the header, so the counter
    // stays short at any stage and the words never run off the panel.
    doesText: [...p.does, ...(p.multNotes || []), ...(p.resonance ? [(p.multNotes || []).length ? 'allies +' + p.resonance : 'Resonance +' + p.resonance] : [])].join(' · '), hasDoes: p.does.length > 0 || !!p.resonance || (p.multNotes || []).length > 0,
    doesStyle: 'min-width: 0; white-space: normal; overflow-wrap: anywhere; font-size: 11.5px; line-height: 1.25; font-weight: 700; letter-spacing: 0.06em; color: ' + (p.does.length ? doesInk : p.ink),
    multKey: 'm' + r2(p.mult) + '-' + p.felt.length, multCls: 'phc-mult-shake phc-mult-s' + Math.min(4, p.stage),
    stages: p.stages.map((s) => ({ key: 's' + s.n, n: String(s.n), mult: '×' + s.mult, style: S.seg(s), feeling: s.feeling, glyph: s.feeling ? feelingIconSrc(s.feeling, s.now ? '#0A0D13' : '#E7EBF3') : '', label: 'Stage ' + s.n + ' ×' + s.mult + (s.feeling ? ' (' + feelingName(s.feeling) + ')' : '') + (s.now ? ', now' : s.next ? ', next Pump' : '') })),
    feel: { ...fr, toggle: fo.toggle || (() => {}), onSearch: fo.search || (() => {}), query: fo.query || '', openStr: fr.open ? 'true' : 'false',
      searchStyle: 'min-height: 26px; padding: 0 8px; border-radius: 8px; border: 1px solid #2E3A50; background: #10151F; color: #E7EBF3; font-family: inherit; font-size: 11px' },
    freeShort: p.freePumps == null ? '' : p.freePumps + ' FREE PUMP' + (p.freePumps === 1 ? '' : 'S'),
    free: p.freePumps == null ? 'No free Pumps. Empathy 3 gives one each round.' : p.freePumps + ' free Pump' + (p.freePumps === 1 ? '' : 's') + ' left this round (one a turn at most)',
    strainText: 'STRAIN ' + p.strain + ' / ' + p.limit, strainTrack: S.strainTrack, strainFill: S.strainFill, strainMark: S.strainMark,
    warn: p.warn, hasWarn: !!p.warn, warnStyle: S.warnStyle, swell: p.swell, rider: p.rider,
    btns, cols, gridStyle: 'display: grid; grid-template-columns: repeat(' + cols + ', minmax(0, 1fr)); gap: 4px', kickerStyle: 'font-size: 10px; font-weight: 700; letter-spacing: 0.16em; color: ' + p.ink,
    boxStyle: 'flex: none; position: sticky; top: 0; z-index: 3; display: flex; flex-direction: column; gap: 5px; padding: 6px 10px; border-radius: 12px; background: #120E1E; border: 1px solid ' + p.ink + '; box-shadow: 0 0 14px ' + rgba(p.ink, 0.25),
    multStyle: 'flex: none; display: inline-block; font-size: ' + (17 + Math.min(4, p.stage) * 2) + 'px; line-height: 1; font-weight: 700; white-space: nowrap; color: ' + (p.does.length ? doesInk : p.ink) + (p.does.length ? '; text-shadow: 0 0 10px ' + rgba(doesInk, 0.7) : '') };
}

// ---------- tones a character can choose (workshop, creation) ----------
export interface ToneChip { id: string; name: string; ink: string; known: boolean; free: boolean; text: string }
/** Raw, and every element tone: known ones, plus (at Lore Master 1 with none learned yet: rules 1.8) the first one free. */
export function toneChips(knownTones: string[] = [], loreMaster = 0): ToneChip[] {
  const firstFree = loreMaster >= 1 && !knownTones.length;
  return [{ id: 'raw', name: 'Raw', ink: SOUL_INK, known: true, free: false, text: (TONE as any).raw?.text || 'Soul damage that ignores armour. No rider.' },
    ...TONES.filter((t: any) => t.id !== 'raw').map((t: any) => ({ id: t.id, name: t.name, ink: toneInk(t.id), known: knownTones.includes(t.id), free: firstFree && !knownTones.includes(t.id), text: t.text || '' }))];
}
/** The shape modules (the form module a design takes, one at most). */
export const SHAPE_MODULES = FORMS.filter((f) => f !== 'bolt' && (MODULE as any)[f]);
export const isShape = (id: string) => !!(MODULE as any)[id]?.form;
export const bandOf = (mana?: number) => manaBand(mana ?? MANA_START);
