// The RESOURCES block: everything a character spends in a fight, in words, below the HP bar (Outburst 2.0 proposal,
// section 10; Leon: "What do you mean I need to reload my sigil core, where does it say that, OH it's that 10 px line").
// One model for the combat You card (screens/combat.js), the area-map HUD (screens/main.js) and the turn cut-in
// (game/turnIntro.tsx). It reads the engine's unit and character state only; it computes no rule.
//
//  resourcesOf(unit | null, character | null, game) → rows, each with a label in words, a value, a bar / pips / text,
//  its colour (CLAUDE.md colour rules), a warning word when it needs doing (RELOAD, EMPTY, OVERLOAD SOON, OVER THE
//  LIMIT…) and a one-line hint (what it is, and what to do). HP is above the block and never in the list.
//
// The held Outburst and Strain are read ONLY through heldOutburstOf() below: the Soul engine is changing shape
// (Outburst 2.0: a held heart with design, stage 0–4, tone, form, free pumps left), so that is the one place to update.
import * as E from '@engine';
import { WEAPON, FLUX_MAX, CORE_CHARGE, CLASS, ADVANCED, ammoId, heatLimit, classResources, loadedOf, packOf, spareMags, magazineSize, hasEvoker, hasEmanator, carriesEvoker, carriesEmanator, NEEDS_EVOKER, NEEDS_EMANATOR,
  coresCarried, evoChargeNow, mpNow, maxMp, strainLimit, COMPANION_KINDS, MODULE, isMelee, canJam } from '@engine';

export type ResKind = 'bar' | 'pips' | 'text';
export type ResWarn = 'EMPTY' | 'RELOAD' | 'LOW' | 'JAMMED' | 'JAM SOON' | 'RELOAD CORE' | 'LOCKED' | 'OVERLOAD SOON' | 'OVERLOAD NEXT' | 'NEAR THE LIMIT' | 'AT THE LIMIT' | 'OVER THE LIMIT' | 'MANA SHORT NEXT' | 'BROKEN' | 'WORN' | 'DOWN' | 'FULL' | 'READY' | 'STOWED';
export interface ResRow {
  key: string; label: string; value: string; now?: number; max?: number; kind: ResKind; colour: string;
  warn?: ResWarn; /** alert: act now (red chip); caution: soon (white chip); ready: something good to spend (green). */ level?: 'alert' | 'caution' | 'ready';
  hint: string; /** A short second line (the ammo type, the source move, the held design's tone). */ sub?: string;
  /** The value in the compact rows (the mini-bar, the urgent rows), when 'now / max' alone would lose its meaning. */ short?: string;
}

// ---------- colours (CLAUDE.md; docs/design/colour-system.md) ----------
export const RES_INK = { body: '#F2A54A', mind: '#4FC8DF', soul: '#AE9BFF', mp: '#5C9EFF', hp: '#F65157', alert: '#F65157', white: '#FFFFFF', ok: '#6FEA77', muted: '#A3AEC2', faith: '#D36A90' };

// ---------- the held Outburst: the ONE adapter over the Soul engine's held-heart fields ----------
export interface HeldHeart {
  /** Strain now and its limit (Mana Short at 3 over, Outburst 2.0). */ strain: number; limit: number;
  held: null | { designId: string; name: string; stage: number; maxStage: number; tone: string; toneName: string; form: string; freePumps: number | null; /** Steadied: no swell at the next turn start. */ steady: boolean };
  /** What the next steps do to Strain, as the engine prices them (so the warnings never assume +1):
   *  beginStrain: the Strain one Begin adds now (+1, +2 Flooded, +2 more from the air without an Emanator, plus any
   *  Strain owed); turnCalm: the −1 every turn start, always; swell: what a held Outburst adds at the turn start after
   *  that −1 (0 when steadied); holdNet: the net of one idle held turn (turn start −1, then the swell); onTurn: it is
   *  this caster's turn now (the next turn start's −1 has not come yet when false); flooded; emanator. */
  beginStrain: number; turnCalm: number; swell: number; holdNet: number; onTurn: boolean; flooded: boolean; emanator: boolean;
}
const SOUL: any = () => (E as any).SOUL_RULES || {};
const toneName = (id: string) => (E as any).TONE?.[id]?.name || (id ? id[0].toUpperCase() + id.slice(1) : 'Raw');
/** A design's form: its form module (wave, burst, aura, lance), else the default form (a Bolt). */
function formOf(d: any): string {
  const m = (d?.modules || []).find((x: string) => (MODULE as any)[x]?.form);
  return m ? ((MODULE as any)[m]?.name || m) : SOUL().default_form?.name || 'Bolt';
}
/** Where the heart is: the fight (its mana band, whose turn) and the unit, when there is one. */
export interface HeartCtx { cb?: any; u?: any; mana?: number }
/** Read a held Outburst and Strain from whatever carries them: a combat unit's magic (u.mg), or the story's magic for a
 *  character (g.story.magic[charId]) with its designs and limit from the character. Both the rules-1.2 shape
 *  ({design, stage, cost}) and the Outburst 2.0 heart (design, stage 0–4, tone, form, free pumps left) are read.
 *  With ctx (the fight and the unit) the Begin's Strain comes from the engine's own preview. */
export function heldOutburstOf(m: any, designs?: any[], limit?: number, ctx: HeartCtx = {}): HeldHeart {
  const strain = Math.max(0, Number(m?.strain ?? m?.heart?.strain ?? 0) || 0);
  const lim = Number(m?.strainLimit ?? m?.heart?.limit ?? limit ?? 3) || 3;
  const cyc = SOUL().cycle || {}, cb = ctx.cb || null, u = ctx.u || null;
  const mana = cb ? cb.mana ?? (E as any).MANA_START : ctx.mana;
  let flooded = false; try { flooded = mana != null && (E as any).manaBand?.(mana)?.id === 'flooded'; } catch { /* no band */ }
  const emanator = m?.emanator ?? m?.heart?.emanator ?? true;
  const debt = Number(m?.debt ?? m?.heart?.debt ?? 0) || 0;
  let begin = (flooded ? cyc.flooded_strain ?? 2 : cyc.begin_strain ?? 1) + (emanator ? 0 : cyc.no_emanator_strain ?? 2);
  // The engine's own price for a Begin (items can change it): only when nothing is held, and only when the preview got
  // as far as pricing (its AP is set past the 'outburst_cost' hook).
  const ds0 = designs || m?.designs || [];
  if (cb && u && u.mg && !(m?.held || m?.heart?.held) && ds0.length && typeof (E as any).previewOutburst === 'function') {
    try { let best = -1; for (const d of ds0) { const pv = (E as any).previewOutburst(cb, u, d.id, undefined, false); if (pv && pv.ap > 0) best = Math.max(best, Number(pv.strain) || 0); } if (best >= 0) begin = best; } catch { /* fall back to the data */ }
  }
  begin += debt;
  const onTurn = !cb || !u ? true : !!cb.overworld || cb.order?.[cb.turn] === u.id || cb.window?.queue?.[0]?.unitId === u.id;
  const turnCalm = 1;
  const h = m?.held || m?.heart?.held || null;
  const swellBase = flooded ? cyc.flooded_strain ?? 2 : cyc.swell_strain ?? 1;
  const swell = h?.steady ? 0 : swellBase;
  const base = { strain, limit: lim, beginStrain: begin, turnCalm, swell, holdNet: (strain > 0 ? -turnCalm : 0) + swell, onTurn, flooded, emanator: !!emanator };
  if (!h) return { ...base, swell: swellBase, holdNet: (strain > 0 ? -turnCalm : 0) + swellBase, held: null };
  const id = h.design ?? h.designId ?? '', ds = ds0;
  const d = ds.find((x: any) => x.id === id) || h.designDef || null;
  const tone = h.tone || d?.tone || 'raw';
  const free = m?.freePumpsMax === 0 ? null : h.freePumps ?? m?.freePumps ?? null;
  return { ...base, held: { designId: id, name: h.name || d?.name || 'an Outburst', stage: Number(h.stage) || 0, maxStage: Number(cyc.max_stage) || 4,
    tone, toneName: toneName(tone), form: h.form ? String(h.form)[0].toUpperCase() + String(h.form).slice(1) : formOf(d), freePumps: free == null ? null : Number(free), steady: !!h.steady } };
}

// ---------- class resources, named from the data ----------
const RES_WORD: Record<string, string> = { momentum: 'Momentum', guard: 'Guard', marks: 'Marks', supplies: 'Supplies', toxins: 'Toxin doses', charges: 'Charges', heat: 'Heat' };
const RES_ALIAS: Record<string, string> = { storm_charge: 'charges', toxin: 'toxins', toxins: 'toxins' };
const RES_CORE: Record<string, keyof typeof RES_INK> = { charges: 'soul' };
const words = (id: string) => RES_WORD[id] || id.replace(/_/g, ' ').replace(/\b\w/g, (x) => x.toUpperCase());
/** Every move of a base or advanced class (data/classes.json). */
function movesOf(id: string): { cls: string; core: string; resource?: any; moves: any[] } | null {
  const b: any = (CLASS as any)[id];
  if (b) return { cls: b.name, core: b.core, resource: b.resource, moves: Object.values(b.ranks || {}).flatMap((r: any) => r.moves || []) };
  const a: any = (ADVANCED as any)[id];
  if (a) { const p: any = (CLASS as any)[a.parents?.[0]]; return { cls: a.name, core: p?.core || 'body', resource: a.resource, moves: a.moves || [] }; }
  return null;
}
/** Where a class resource comes from, in the data's own words: the move that gives it, the moves that spend it, the rule. */
export function classResInfo(c: any, resId: string): { label: string; source: string; spend: string[]; rule: string; core: string } {
  let gain = '', gainText = '', owner = '', rule = '', core: string = RES_CORE[resId] || '';
  const spend: string[] = [];
  for (const id of [c?.classId, c?.advancedClass].filter(Boolean)) {
    const m = movesOf(id); if (!m) continue;
    if (m.resource && (RES_ALIAS[m.resource.id] || m.resource.id) === resId && !rule) { rule = String(m.resource.rule || ''); core ||= m.core; owner ||= m.cls; }
    for (const mv of m.moves) for (const ef of mv.effects || []) {
      if (ef.op !== 'resource' || (RES_ALIAS[ef.resource] || ef.resource) !== resId) continue;
      owner ||= m.cls; core ||= m.core;
      if (Number(ef.value) > 0) { if (!gain) { gain = mv.name; gainText = String(mv.text || ''); } } else if (!spend.includes(mv.name)) spend.push(mv.name);
    }
  }
  const source = gain || owner || '';
  return { label: words(resId), source, spend, rule: rule || gainText, core: core || 'body' };
}

// ---------- the model ----------
const AMMO_NAME: Record<string, string> = { armor_piercing: 'Armour-piercing', hollow_point: 'Hollow-point', incendiary: 'Incendiary', enhanced: 'Enhanced' };
const ammoName = (t?: string | null) => { const id = ammoId(t || null); return !id || id === 'standard' ? '' : AMMO_NAME[id] || words(id); };
/** What a spare is called, short: mag (magazine), drum, cell… */
const magWord = (w: any) => String(w.reload_unit || 'mag').replace(/^magazine$/, 'mag');
const plural = (n: number, one: string, many = one + 's') => n + ' ' + (n === 1 ? one : many);
/** Reload AP as the engine charges it: reloadAp(u) (1 with a quick-release magazine, then items); out of a fight the
 *  character's weapon and mods stand in for the unit. */
function reloadApOf(u: any, c: any, w: any): number {
  try { if (u) return E.reloadAp(u); if (c) return E.reloadAp({ weapon: w.id, mods: c.weaponState?.mods || [], charId: c.id } as any); } catch { /* the weapon's own number */ }
  return w.reload_ap ?? 2;
}

/** Strain and the held Outburst, from the adapter only. The warnings use the engine's real prices: a Begin adds
 *  hh.beginStrain (1, 2 Flooded, +2 without an Emanator); every turn start eases hh.turnCalm (1) before a held
 *  Outburst's swell; every calming way eases more on top of that −1. Over the limit each point burns 8 at the turn's
 *  end; shortAt over is an instant Mana Short. */
export function strainRows(hh: HeldHeart): ResRow[] {
  const out: ResRow[] = [];
  const s = hh.strain, L = hh.limit, shortAt = Number(SOUL().strain?.short_at_over) || 3, burn = Number(SOUL().strain?.burn_per_point) || 8;
  const held = !!hh.held, steady = !!hh.held?.steady, b = hh.beginStrain;
  const calm = 'Falls by 1 at the start of each of your turns, and more by calming the heart on top of that −1: a still turn with nothing held, your first weapon attack of the turn, tending an ally, letting go (by its stage, at most what its swells cost) or Steady (1 AP).';
  const sgn = (n: number) => (n > 0 ? '+' + n : n < 0 ? '−' + -n : '±0');
  const why = (hh.flooded ? ' (Flooded)' : '') + (hh.emanator ? '' : ' (+' + (Number(SOUL().cycle?.no_emanator_strain) || 2) + ' from the air: no Emanator)');
  // Where Strain stands when your next turn starts (its −1 first; then a held Outburst swells), and the next step:
  // holding → that turn start; not holding → your next Begin.
  const atTurn = hh.onTurn ? s : Math.max(0, s - hh.turnCalm);
  const peak = held ? (hh.onTurn ? s + hh.holdNet : Math.max(0, s - hh.turnCalm) + hh.swell) : atTurn + b;
  const burnOver = held ? (hh.onTurn ? s : Math.max(0, s - hh.turnCalm) + hh.swell) - L : atTurn - L;
  const holdTxt = steady ? 'Steadied: your next turn start only eases 1 (no swell)' : 'Holding into your next turn: its start eases 1, then the swell adds ' + hh.swell + ' (net ' + sgn(hh.swell - (s > 0 ? 1 : 0)) + ')';
  const nextTxt = held ? holdTxt : 'Your next Begin adds ' + b + ' Strain' + why;
  const peakTxt = ' → ' + peak + ' / ' + L + (peak > L ? ', ' + (peak - L) + ' over' : '');
  const row: ResRow = { key: 'strain', label: 'Strain', value: s + ' / ' + L, now: s, max: L, kind: 'pips', colour: RES_INK.soul,
    hint: 'A Begin adds ' + b + ' Strain' + why + '. A held Outburst swells at your turn start (+' + hh.swell + ' after the turn start\'s −1, so an idle held turn nets ' + sgn(hh.swell - 1) + '). Over ' + L + ', every point burns ' + burn + ' at your turn end; ' + shortAt + ' over is a Mana Short. ' + calm };
  if (peak - L >= shortAt) Object.assign(row, { warn: 'MANA SHORT NEXT', level: 'alert', hint: nextTxt + peakTxt + ': your heart shorts out (Stunned; a held Outburst goes off wild). ' + (held ? 'Release it, Steady (1 AP) or let it go this turn.' : 'Don\'t Begin until the heart calms.') + ' ' + calm });
  else if (s > L) {
    const dmg = burn * Math.max(0, burnOver);
    Object.assign(row, { warn: 'OVER THE LIMIT', level: 'alert', hint: (s - L) + ' over the limit: ' + (dmg > 0 ? dmg + ' damage to you at your ' + (hh.onTurn ? '' : 'next ') + 'turn end' + (!hh.onTurn && burnOver < s - L ? ' (after the turn start\'s −1)' : '') : 'your turn start\'s −1 brings it back to the limit, so no burn unless you add more') + '. ' + nextTxt + peakTxt + '. ' + calm });
  } else if (peak > L) Object.assign(row, { warn: s === L ? 'AT THE LIMIT' : 'NEAR THE LIMIT', level: 'caution', hint: (s === L ? 'At your limit. ' : 'Close to your limit. ') + nextTxt + peakTxt + ' (' + burn + ' damage a point at your turn end). ' + calm });
  else if (s === L && s > 0) Object.assign(row, { warn: 'AT THE LIMIT', level: 'caution', hint: 'At your limit. ' + nextTxt + peakTxt + ': no burn. ' + calm });
  else if (s === L - 1 && s > 0) Object.assign(row, { warn: 'NEAR THE LIMIT', level: 'caution', hint: 'One below your limit. ' + nextTxt + peakTxt + '. ' + calm });
  out.push(row);
  if (hh.held) {
    const h = hh.held, mult = (SOUL().cycle?.stage_mult || [])[h.stage];
    // The form only when the design's name doesn't already say it ('Soul Bolt' is a Bolt).
    const form = h.form && !h.name.toLowerCase().includes(h.form.toLowerCase()) ? ' · ' + h.form : '';
    out.push({ key: 'held', label: 'Holding', value: h.name + ' · stage ' + h.stage + ' / ' + h.maxStage, short: h.name + ' · ' + h.stage + ' / ' + h.maxStage, now: h.stage, max: h.maxStage, kind: 'pips', colour: RES_INK.soul,
      sub: h.toneName + form + (mult ? ' · ×' + mult : '') + (h.freePumps != null ? ' · ' + plural(h.freePumps, 'free pump') + ' left' : '') + (h.steady ? ' · steadied' : ''),
      ...(h.stage >= h.maxStage ? { warn: 'FULL' as ResWarn, level: 'ready' as const } : {}),
      hint: 'A held Outburst: Pump (1 AP) +1 stage, Release (1 AP) fires it. Held past your turn it swells +1 stage at your turn start (+' + hh.swell + ' Strain after that turn start\'s −1); Steady (1 AP) stops the swell.' });
  }
  return out;
}

/** The rows for a character, from its fight unit when it has one (combat, or the area map during a fight), else from
 *  the character and the story's magic. Only rows that apply: a gunner sees ammo and Heat, a Sigil caster charge,
 *  cores and Flux, a Soul caster MP, Strain and the held Outburst. */
export function resourcesOf(u: any | null, c: any | null, g: any): ResRow[] {
  if (!u && !c) return [];
  const rows: ResRow[] = [];
  const cb = g?.combat && g.phase === 'combat' ? g.combat : null;
  // ---- the gun: rounds, spares, ammo type; its Heat; its condition ----
  const wid = u ? u.weapon : c?.weapon, w: any = wid ? (WEAPON as any)[wid] : null;
  const infinite = !!u?.infiniteAmmo;
  if (w && w.magazine != null && !infinite) {
    const cap = u ? magazineSize(w.id, u.mods) ?? w.magazine : magazineSize(w.id, c?.weaponState?.mods) ?? w.magazine;
    const now = u ? u.ammo : loadedOf(c);
    const loose = w.reload === 'loose';
    let spare = 0, spareTxt = '';
    if (u) {
      if (loose) { spare = u.loose ?? 0; spareTxt = plural(spare, 'loose round'); }
      else if (u.mags) { spare = u.mags.filter((n: number) => n > 0).length; spareTxt = plural(spare, 'spare ' + magWord(w)); }
      else { spare = 1; spareTxt = 'spares: plenty'; }
    } else if (c) {
      if (loose) { spare = packOf(c).filter((x: any) => x.calibre && x.calibre === w.ammo).reduce((t: number, x: any) => t + x.qty, 0); spareTxt = plural(spare, 'loose round'); } else { spare = spareMags(c).filter((n: number) => n > 0).length; spareTxt = plural(spare, 'spare ' + magWord(w)); }
    }
    const rAp = reloadApOf(u, c, w), type = ammoName(u ? u.ammoType : c?.loadedType);
    const low = now > 0 && now < cap && now <= Math.max(1, Math.ceil(cap * 0.25));
    const row: ResRow = { key: 'ammo', label: 'Ammo', value: now + ' / ' + cap + ' loaded' + (spareTxt ? ' · ' + spareTxt : ''), now, max: cap, kind: cap <= 12 ? 'pips' : 'bar', colour: RES_INK.body,
      sub: (w.name || wid) + (type ? ' · ' + type + ' rounds' : ''),
      hint: 'Rounds in the ' + (w.name || 'gun').toLowerCase() + '. ' + (spare > 0 ? 'Reload: ' + rAp + ' AP' + (loose ? ' (round by round from loose rounds).' : ' (a fresh ' + (w.reload_unit || 'magazine') + ').') : 'No spares left: pick some up, or switch weapons.') };
    if (u?.jammed && !w.heat_limit) Object.assign(row, { warn: 'JAMMED', level: 'alert', hint: 'The gun is jammed: Clear it (2 AP) before it fires again.' });
    else if (now <= 0) Object.assign(row, spare > 0 ? { warn: 'RELOAD', level: 'alert', hint: 'Empty: Reload (' + rAp + ' AP) before you can shoot.' } : { warn: 'EMPTY', level: 'alert', hint: 'Empty and no spares: pick some up, swap weapons, or fight hand to hand.' });
    else if (low) Object.assign(row, spare > 0 ? { warn: 'RELOAD', level: 'caution', hint: 'Only ' + plural(now, 'round') + ' left: Reload (' + rAp + ' AP) before you run dry.' } : { warn: 'LOW', level: 'caution', hint: 'Only ' + plural(now, 'round') + ' left and no spares.' });
    rows.push(row);
  }
  // The off-hand gun (rules 1.3), when it is a second gun.
  if (u?.offWeapon && (WEAPON as any)[u.offWeapon]?.magazine != null) {
    const ow: any = (WEAPON as any)[u.offWeapon], n = u.offAmmo ?? 0, cap = ow.magazine;
    rows.push({ key: 'off', label: 'Off-hand', value: n + ' / ' + cap + ' loaded' + (u.offMags ? ' · ' + plural(u.offMags.filter((x: number) => x > 0).length, 'spare') : ''), now: n, max: cap, kind: cap <= 12 ? 'pips' : 'bar', colour: RES_INK.body, sub: ow.name,
      ...(n <= 0 ? { warn: 'RELOAD' as ResWarn, level: 'alert' as const } : {}), hint: 'Rounds in the off-hand ' + (ow.name || 'gun').toLowerCase() + '. Reload both: one action.' });
  }
  if (u && w && w.heat_limit && !infinite) {
    const lim = heatLimit(u, w), h = u.heat || 0;
    const row: ResRow = { key: 'heat', label: 'Heat', value: h + ' / ' + lim, now: h, max: lim, kind: 'bar', colour: RES_INK.body,
      hint: 'Each shot heats the gun (single +1, burst +2, auto +4): −1 to hit per 2 Heat; it cools 2 at your turn start. At ' + lim + ' it jams.' };
    if (u.jammed) Object.assign(row, { warn: 'JAMMED', level: 'alert', hint: 'Jammed: Clear it (2 AP) before it fires again.' });
    else if (h >= lim - 2 && h > 0) Object.assign(row, { warn: 'JAM SOON', level: h >= lim - 1 ? 'alert' : 'caution', hint: 'Heat ' + h + ' of ' + lim + ': one more burst can jam it. Single shots, or let it cool a turn.' });
    if (h > 0 || u.jammed) rows.push(row);
    else rows.push({ ...row, value: '0 / ' + lim + ' · cool' });
  }
  if (u?.maxDur) {
    // Condition: a broken gun won't fire, but a broken melee weapon still swings (×0.5 damage; worn ×0.9). Only guns
    // that can jam jam more when worn (combat.ts: attack, canJam).
    const d = u.dur ?? u.maxDur, melee = !!w && isMelee(w), jams = !!w && canJam(w);
    if (d <= 0) rows.push({ key: 'dur', label: 'Weapon condition', value: 'BROKEN', now: 0, max: u.maxDur, kind: 'bar', colour: RES_INK.body, warn: 'BROKEN', level: 'alert',
      hint: melee ? 'Broken: it still swings, but for half damage until repaired (Field Repair, or a workshop).' : 'Broken: it won\'t fire until repaired (Field Repair, or a workshop).' });
    else if (d <= u.maxDur * 0.25) rows.push({ key: 'dur', label: 'Weapon condition', value: d + ' / ' + u.maxDur, now: d, max: u.maxDur, kind: 'bar', colour: RES_INK.body, warn: 'WORN', level: 'caution',
      hint: (melee ? 'Worn: it hits for 90% damage.' : jams ? 'Worn: low condition makes jams likelier.' : 'Worn: at 0 it breaks and won\'t fire.') + ' Field Repair (2 AP) with spare parts.' });
  }
  // ---- throwables carried ----
  if (u?.throwables && Object.keys(u.throwables).length) {
    const t = Object.entries(u.throwables).filter(([, n]) => (n as number) > 0);
    if (t.length) rows.push({ key: 'thr', label: 'Throwables', value: t.map(([id, n]) => ((WEAPON as any)[id]?.name || words(id)) + ' ×' + n).join(' · '), kind: 'text', colour: RES_INK.body, hint: 'Grenades and charges you carry: Throw from the Attack tab.' });
  }
  // ---- Sigil magic: the Evoker's charge, spare cores, Flux (Mind cyan) ----
  const mg = u?.mg, sm = c ? (g?.story?.magic || {})[c.id] || {} : {};
  // A focus counts only in a hand (spec: Hands 2, item 630); carried, it keeps its store, so the row stays, marked STOWED.
  const evoHeld = mg ? !!mg.evoker : !!c && hasEvoker(c), evoker = evoHeld || (!!c && carriesEvoker(c));
  if (evoker) {
    // Spare cores are the ones Swap core can load (mg.cores); cores crystallised this fight (coresMade) join them only after it.
    const charge = mg ? mg.charge : evoChargeNow(c), cores = mg ? mg.cores || 0 : coresCarried(c), made = mg ? mg.coresMade || 0 : 0;
    const locked = !!(mg && cb && mg.lockRound === cb.round);
    const madeTxt = made ? ' ' + plural(made, 'core') + ' crystallised this fight ' + (made === 1 ? 'joins' : 'join') + ' your spares after it, not before.' : '';
    const row: ResRow = { key: 'charge', label: 'Evoker charge', value: charge + ' / ' + CORE_CHARGE + ' · ' + plural(cores, 'spare core') + (made ? ' · ' + made + ' crystallised' : ''), now: charge, max: CORE_CHARGE, kind: 'bar', colour: RES_INK.mind,
      hint: 'The core in your Evoker: each glyph spends its charge. ' + (cores > 0 ? 'Swap core (2 AP) loads a fresh one (' + CORE_CHARGE + ').' : 'No spare cores: crystallise one, or find some.') + madeTxt };
    if (!evoHeld) Object.assign(row, { warn: 'STOWED', level: 'caution', hint: NEEDS_EVOKER + ' Your Evoker is in the pack: it keeps its charge, but no Sigils until you hold it (the off hand; a two-handed weapon fills both hands).' });
    else if (locked) Object.assign(row, { warn: 'LOCKED', level: 'alert', hint: 'Overloaded: the Evoker is locked until next round.' });
    else if (charge <= 0) Object.assign(row, cores > 0 ? { warn: 'RELOAD CORE', level: 'alert', hint: 'The core is spent: Swap core (2 AP) before you draw again.' } : { warn: 'EMPTY', level: 'alert', hint: 'The core is spent and you have no spares to swap in: fight another way.' + madeTxt });
    else if (charge <= 3) Object.assign(row, cores > 0 ? { warn: 'LOW', level: 'caution', hint: 'Only ' + charge + ' charge left: swap core (2 AP) when it runs out (most words cost 1–3).' } : { warn: 'LOW', level: 'caution', hint: 'Only ' + charge + ' charge left and no spare cores.' });
    rows.push(row);
    const flux = mg ? mg.flux : sm.flux || 0;
    const fr: ResRow = { key: 'flux', label: 'Flux', value: flux + ' / ' + FLUX_MAX, now: flux, max: FLUX_MAX, kind: 'pips', colour: RES_INK.mind,
      hint: 'Each glyph adds 1 Flux. Past ' + FLUX_MAX + ' the Evoker overloads (10 damage per Flux over, locked a round). Vent (1 AP) clears it.' };
    if (flux >= FLUX_MAX) Object.assign(fr, { warn: 'OVERLOAD NEXT', level: 'alert', hint: 'At ' + FLUX_MAX + ': the next glyph overloads the Evoker. Vent (1 AP) first.' });
    else if (flux >= FLUX_MAX - 1) Object.assign(fr, { warn: 'OVERLOAD SOON', level: 'caution', hint: 'Flux ' + flux + ' of ' + FLUX_MAX + ': two more glyphs overload the Evoker. Vent (1 AP) dumps it into the air.' });
    rows.push(fr);
  }
  // ---- Soul magic: MP (MP blue), Strain and the held Outburst (Soul violet) ----
  const emaHeld = mg ? !!mg.emanator : !!c && hasEmanator(c), emanator = emaHeld || (!!c && carriesEmanator(c));
  if (emanator) {
    const mp = Math.round(mg ? mg.mp : mpNow(c)), mpMax = mg ? mg.mpMax : maxMp(c);
    const row: ResRow = { key: 'mp', label: 'MP', value: mp + ' / ' + mpMax, now: mp, max: mpMax, kind: 'bar', colour: RES_INK.mp, hint: 'Your Emanator\'s mana: Outbursts spend it. Syphon (1 AP) draws more from the air.' };
    if (!emaHeld) Object.assign(row, { warn: 'STOWED', level: 'caution', hint: NEEDS_EMANATOR + ' Your Emanator is in the pack: it keeps its MP, but Outbursts draw on the air (+2 Strain) and Syphon waits until you hold it.' });
    else if (mp <= 0) Object.assign(row, { warn: 'EMPTY', level: 'alert', hint: 'No MP: Syphon (1 AP) from the air, or your Outbursts draw on your heart.' });
    else if (mp < mpMax * 0.25) Object.assign(row, { warn: 'LOW', level: 'caution', hint: 'Low MP: Syphon (1 AP) draws mana from the air.' });
    rows.push(row);
  }
  const soul = emanator || (mg ? (mg.designs || []).length > 0 : !!c && (c.outbursts || []).length > 0);
  if (soul) {
    const hh = mg ? heldOutburstOf(mg, undefined, undefined, { cb, u }) : heldOutburstOf({ ...sm, emanator: !!c && hasEmanator(c) }, c?.outbursts || [], strainLimit(c), { mana: g?.story?.mana });
    rows.push(...strainRows(hh));
  }
  // ---- class resources the runtime tracks (Momentum, Guard, Marks, Charges, Supplies…) ----
  const resMax: Record<string, number> = u?.resMax || (c ? Object.fromEntries(classResources(c).filter((r: any) => r.persist).map((r: any) => [r.id, r.max])) : {});
  const resNow: Record<string, number> = u?.res || (c?.res ? c.res : {});
  for (const id of Object.keys(resMax)) {
    const info = classResInfo(c, id), n = resNow[id] ?? (u ? 0 : resMax[id]), max = resMax[id];
    const ink = (RES_INK as any)[info.core] || RES_INK.body;
    const rule = info.rule;
    const spend = info.spend.length ? ' Spent by ' + info.spend.join(', ') + '.' : '';
    rows.push({ key: 'res-' + id, label: info.label, value: n + ' / ' + max, now: n, max, kind: max <= 10 ? 'pips' : 'bar', colour: ink, sub: info.source,
      ...(n >= max && max > 0 ? { warn: 'FULL' as ResWarn, level: 'ready' as const } : n <= 0 && id === 'supplies' ? { warn: 'EMPTY' as ResWarn, level: 'caution' as const } : {}),
      hint: (rule || info.label + ' (' + info.source + ').') + spend });
  }
  // ---- faith (Blessing 2.0, rules 1.6): Devotion with its gates, Witnessed, the vow; an Atheist's pieces ----
  rows.push(...faithRows(u, c));
  // ---- companions (drone, beast, twin) ----
  const comps: { key: string; name: string; hp: number; max: number; kind: string }[] = [];
  if (u && cb) for (const x of cb.units) { if (x.ctrl && x.ctrl === u.charId) comps.push({ key: x.id, name: x.name, hp: x.dead ? 0 : x.hp, max: x.maxHp, kind: x.companion || '' }); }
  else if (c?.companions) for (const k of c.companions) { const kd: any = (COMPANION_KINDS as any)[k.kind] || {}; const max = k.maxHp ?? kd.hp ?? 0; if (max) comps.push({ key: k.id, name: k.name || kd.name || words(k.kind), hp: k.hp ?? max, max, kind: k.kind }); }
  for (const x of comps) rows.push({ key: 'cp-' + x.key, label: x.name[0].toUpperCase() + x.name.slice(1), value: x.hp <= 0 ? 'DOWN' : x.hp + ' / ' + x.max + ' HP', now: Math.max(0, x.hp), max: x.max, kind: 'bar', colour: RES_INK.hp,
    ...(x.hp <= 0 ? { warn: 'DOWN' as ResWarn, level: 'alert' as const } : x.hp < x.max * 0.3 ? { warn: 'LOW' as ResWarn, level: 'caution' as const } : {}),
    sub: 'Companion' + (x.kind ? ' · ' + words(x.kind) : ''), hint: 'Your ' + (x.kind ? words(x.kind).toLowerCase() : 'companion') + '\'s HP. It acts on its own turn under your orders.' });
  return rows;
}

/** The most urgent rows first (alert, caution, then the rest in order), for the narrow and collapsed bars. */
export function urgentRows(rows: ResRow[], n = 3): ResRow[] {
  const rank = (r: ResRow) => (r.level === 'alert' ? 0 : r.level === 'caution' ? 1 : r.level === 'ready' ? 2 : 3);
  return rows.map((r, i) => [r, i] as const).sort((a, b) => rank(a[0]) - rank(b[0]) || a[1] - b[1]).slice(0, n).map((x) => x[0]);
}

// ---------- the view for the prototype templates (combat.template.html, main.template.html) ----------
/** CSS for the block: large readable rows, the hint on hover or focus (a tap on touch screens focuses the row). */
export const RES_CSS = [
  // Two columns where the card is wide enough (the combat You card), one in the narrow HUD; long rows take the full width.
  '.phc-res{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:6px 14px;padding-top:8px;border-top:1px solid #232D3F}',
  '.phc-res>.phc-res-row[data-wide=true]{grid-column:1/-1}',
  '.phc-res-row{position:relative;display:flex;flex-direction:column;gap:3px;outline:none;border-radius:6px;padding:2px 4px;margin:0 -4px;cursor:help}',
  '.phc-res-row:hover,.phc-res-row:focus-visible{background:#151C29}.phc-res-row:focus-visible{box-shadow:0 0 0 2px #FFFFFF}',
  '.phc-res-hint{display:none;font-size:12px;line-height:1.4;color:#C9D3E3;font-weight:500;letter-spacing:0}',
  '.phc-res-row:hover .phc-res-hint,.phc-res-row:focus .phc-res-hint{display:block}',
  '.phc-res-row[data-level=alert] .phc-res-chip{animation:phcResPulse 1.4s ease-in-out infinite}',
  '@keyframes phcResPulse{0%,100%{box-shadow:0 0 0 0 rgba(246,81,87,.0)}50%{box-shadow:0 0 0 4px rgba(246,81,87,.35)}}',
  '.phc-rm .phc-res-row .phc-res-chip{animation:none!important}',
  '@media (prefers-reduced-motion: reduce){.phc-res-row .phc-res-chip{animation:none!important}}',
  // The compact rows (the mini-bar's urgent rows): one grid for all of them, so every label, bar, value and chip
  // lines up (a fixed label column like the HP row's, the bar, the value, the chip).
  '.phc-res-urgent{display:grid;grid-template-columns:minmax(64px,max-content) minmax(40px,1fr) max-content max-content;gap:5px 8px;align-items:center}',
  '.phc-res-urgent>.phc-res-row.phc-res-mini{display:grid;grid-template-columns:subgrid;grid-column:1/-1;min-width:0;margin:0;padding:2px 0}',
  '.phc-res-mini>.phc-res-line{display:grid;grid-template-columns:subgrid;grid-column:1/-1;align-items:center;min-width:0}',
].join('\n');

export function chipStyle(level?: string): string {
  const base = 'flex: none; padding: 1px 8px; border-radius: 4px; font-size: 12px; font-weight: 700; letter-spacing: 0.08em; line-height: 18px; white-space: nowrap; ';
  return base + (level === 'alert' ? 'background: #F65157; color: #0A0D13; border: 1px solid #F65157' : level === 'ready' ? 'background: transparent; color: #6FEA77; border: 1px solid #6FEA77' : 'background: #0A0D13; color: #FFFFFF; border: 1px solid #FFFFFF');
}
const pct = (r: ResRow) => (r.max ? Math.max(0, Math.min(100, ((r.now ?? 0) / r.max) * 100)) : 0);
/** The fill colour: the resource's own, red when it is the danger (Heat, Flux, Strain filling up; ammo running dry). */
function fillInk(r: ResRow): string {
  if (r.level === 'alert' && ['heat', 'flux', 'strain'].includes(r.key)) return RES_INK.alert;
  return r.colour;
}
/** The pips of a row: filled, empty, and past the max (Strain over its limit) a white divider at the limit, then
 *  hatched red pips outlined in red, so 'at the limit' and '1 over' never look the same. */
export function pipsOf(r: ResRow, compact = false): { key: number; style: string; over: boolean; divider: boolean }[] {
  if (r.kind !== 'pips') return [];
  const ink = fillInk(r), n = Math.max(0, Math.round(r.max || 0)), on = Math.max(0, Math.round(r.now ?? 0));
  const pipsN = Math.min(n, 12), over = r.max && (r.now ?? 0) > r.max ? Math.min(6, on - n) : 0, hgt = compact ? 8 : 10;
  const pip = (i: number) => ({ key: i, over: false, divider: false,
    style: 'flex: 1 1 0; min-width: 6px; height: ' + hgt + 'px; border-radius: 2px; ' + (i < on ? 'background: ' + ink : 'background: #1C2536; box-shadow: inset 0 0 0 1px #2E3A50') });
  const out = Array.from({ length: pipsN }, (_, i) => pip(i));
  if (over > 0) {
    out.push({ key: 1000, over: false, divider: true, style: 'flex: none; width: 2px; height: ' + (hgt + 6) + 'px; margin: -3px 2px; border-radius: 1px; background: #FFFFFF' });
    for (let i = 0; i < over; i++) out.push({ key: pipsN + i, over: true, divider: false,
      style: 'flex: 1 1 0; min-width: 6px; height: ' + hgt + 'px; border-radius: 2px; box-sizing: border-box; border: 1px solid #F65157; background: repeating-linear-gradient(135deg, #F65157 0 2px, #0A0D13 2px 4px)' });
  }
  return out;
}
/** One row as the templates draw it. */
export function resRowView(r: ResRow, compact = false) {
  const ink = fillInk(r);
  const value = compact && r.short ? r.short : compact && r.max != null && r.kind !== 'text' && r.value !== 'DOWN' && r.value !== 'BROKEN' ? Math.round(r.now ?? 0) + ' / ' + r.max : r.value;
  return {
    key: r.key, wide: ['ammo', 'held', 'thr', 'off', 'charge'].includes(r.key) || r.value.length > 22 ? 'true' : 'false', label: r.label.toUpperCase(), value, hint: r.hint, sub: r.sub || '', hasSub: !!r.sub && !compact, warn: r.warn || '', hasWarn: !!r.warn, level: r.level || 'none',
    aria: r.label + ': ' + r.value + (r.sub ? ' (' + r.sub + ')' : '') + (r.warn ? '. ' + r.warn : '') + '. ' + r.hint,
    isBar: r.kind === 'bar', isPips: r.kind === 'pips', isText: r.kind === 'text',
    labelStyle: 'flex: none; font-size: 13px; font-weight: 700; letter-spacing: 0.1em; color: ' + r.colour + (compact ? '; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0' : ''),
    // The full block wraps (the narrow area-map HUD must still show the spares); only the compact rows cut with an ellipsis.
    valueStyle: 'flex: 1 1 auto; min-width: 0; font-size: ' + (compact ? 14 : 15) + 'px; font-weight: 700; color: #E7EBF3; font-variant-numeric: tabular-nums; ' + (compact ? 'white-space: nowrap; overflow: hidden; text-overflow: ellipsis' : 'white-space: normal; overflow-wrap: anywhere; line-height: 1.25'),
    miniValueStyle: 'flex: none; font-size: 15px; font-weight: 700; color: #E7EBF3; white-space: nowrap; font-variant-numeric: tabular-nums; text-align: right',
    warnStyle: chipStyle(r.level),
    subStyle: 'display: block; font-size: 12px; font-weight: 500; line-height: 1.3; color: #A3AEC2; overflow-wrap: anywhere',
    trackStyle: 'position: relative; display: block; height: ' + (compact ? 8 : 10) + 'px; border-radius: 3px; background: #1C2536; overflow: hidden',
    fillStyle: 'display: block; height: 100%; width: ' + pct(r) + '%; background: ' + ink,
    pips: pipsOf(r, compact),
    pipsStyle: 'display: flex; align-items: center; gap: 3px',
  };
}
/** The block's values for a template: every row, and the 2–3 most urgent for the narrow bars. */
export function resView(rows: ResRow[], urgent = 3) {
  return { has: rows.length > 0, rows: rows.map((r) => resRowView(r)), urgent: urgentRows(rows, urgent).map((r) => resRowView(r, true)), hasUrgent: rows.length > 0 };
}

/** The faith rows (Blessing 2.0): a Faithful's Devotion (0–10, the next gate in words), Witnessed and the vow; an
 *  Atheist's knowledge pieces per patron. Read from the engine (beliefOf, devotionNow, the unit's conditions and vow). */
export function faithRows(u: any | null, c: any | null): ResRow[] {
  if (!c) return [];
  const rows: ResRow[] = [], b = (E as any).beliefOf ? (E as any).beliefOf(c) : null; if (!b) return rows;
  const P: Record<string, any> = (E as any).FAITH_PATRON || {}, G: any = (E as any).GATE || { 1: 3, 2: 5, 3: 7, miracle: 10 };
  if (b.kind === 'faithful') {
    const p = P[b.patron], dv = (E as any).devotionNow ? (E as any).devotionNow(c) : c.devotion ?? 3;
    // Rules 1.6.2: Hymn III at 7, the Miracle at 10 (with Faith 7).
    const next = dv < G[1] ? 'Hymn I at ' + G[1] : dv < G[2] ? 'Hymn II at ' + G[2] : dv < G[3] ? 'Hymn III at ' + G[3] : dv < G.miracle ? 'the Miracle at ' + G.miracle : 'the Miracle open';
    // Rules 1.6.1: Devotion is a level made of XP; the row shows the level and the XP toward the next ("4 · 12/32 XP").
    const X: any = E as any, total = X.devotionXpOf ? X.devotionXpOf(c) : 0, lv = X.devotionLevelOf ? X.devotionLevelOf(total) : dv;
    const at = X.devotionThreshold ? X.devotionThreshold(lv) : 0, nx = lv < (X.DEVOTION_MAX_LEVEL ?? 10) && X.devotionThreshold ? X.devotionThreshold(lv + 1) : null;
    rows.push({ key: 'devotion', label: 'Devotion', value: dv + (nx != null ? ' · ' + (total - at) + '/' + (nx - at) + ' XP' : ' · ' + total + ' XP'), now: dv, max: 10, kind: 'pips', colour: RES_INK.faith, sub: (p?.name || b.patron) + ' · ' + next,
      ...(dv >= G.miracle ? { warn: 'FULL' as ResWarn, level: 'ready' as const } : {}),
      hint: 'Your standing with ' + (p?.name || 'your patron') + ': Hymn I at ' + G[1] + ', II at ' + G[2] + ', III at ' + G[3] + '; the Miracle needs Faith ' + ((E as any).MIRACLE_FAITH ?? 7) + ' and Devotion ' + G.miracle + ', and lowers Devotion by ' + ((E as any).MIRACLE_COST_LEVELS ?? 5) + ' levels. Each level takes Devotion XP: what they like gives some (capped each fight, scene and session), vows and rites more; their taboos take it away.' });
    const wit = !!u && !!(u.conds && u.conds.witnessed);
    if (wit) rows.push({ key: 'witnessed', label: 'Witnessed', value: 'WATCHED', kind: 'text', colour: RES_INK.faith, level: 'ready', sub: p?.name, hint: (p?.name || 'Your patron') + ' is watching until the fight ends or ' + (p?.name || 'your patron') + ' intervenes: what they like gets +2, taboos cost double.' });
    const vow = (u && u.vow) || c.vow;
    if (vow) { const vd = ((E as any).VOW || {})[vow.id]; rows.push({ key: 'vow', label: 'Vow', value: vow.state.toUpperCase(), kind: 'text', colour: vow.state === 'broken' ? RES_INK.muted : RES_INK.faith, sub: vd?.words || vow.id,
      ...(vow.state === 'broken' ? { warn: 'BROKEN' as ResWarn, level: 'alert' as const } : {}), hint: (vd?.words || 'Your vow') + ' Kept at the end of the fight: +' + ((E as any).DEVOTION_XP?.vowKept ?? 3) + ' Devotion XP. Broken: −' + ((E as any).DEVOTION_XP?.vowBroken ?? 5) + '.' }); }
  } else {
    for (const [id, n] of Object.entries(c.faithPieces || {}) as [string, number][]) if (n > 0) rows.push({ key: 'piece-' + id, label: P[id]?.name || id, value: Math.min(3, n) + ' / 3', now: Math.min(3, n), max: 3, kind: 'pips', colour: RES_INK.faith, sub: 'Pieces (Atheist)',
      hint: 'Knowledge pieces of ' + (P[id]?.name || id) + ': each unlocks their next Hymn, prayed by dice (TN 14 / 16 / 18).' });
  }
  return rows;
}
