// The backpack in a fight (rules 1.9, World Play: Gear in a fight; docs/design/world-play-1.1-spec.md section 3): what the
// hands hold, the light armour worn, the pack, and the ammo and throwables the fighter carries, each row with its action
// and cost as the engine prices it (engine gear.ts gearCost: 1 AP a hand, 2 for a two-handed draw, a drop 0, light
// armour 1 a piece, heavy armour never, Hot-Swap on the hand rows). The UI computes no rule: a row is greyed with the
// engine's reason (not your turn, AP short, the gear plan's refusal).
//
// In a fight the ammo lives on the unit (u.mags, u.loose, u.offMags, u.extra, u.throwables, u.parts): c.pack is only
// written back at the end of the fight or on a gear change, so those numbers are read from the unit.
import { WEAPON, ITEM, packOf, twoHands, isPlotItem, gearCost, isLightArmour, GEAR, calName, type GearOp, FOCUS_IDS, bindGame } from '@engine';

export interface BpAct { key: string; label: string; cost: string; off: boolean; why: string; action: any }
export interface BpRow { key: string; tag: string; name: string; sub: string; acts: BpAct[]; note: string }
export interface BpSection { key: string; title: string; rows: BpRow[]; empty: string }
export interface Backpack { who: string; ap: number; sections: BpSection[]; reason: string }

const nameOf = (id: string) => (WEAPON as any)[id]?.name || (ITEM as any)[id]?.name || id;
const focusOf = (id: string) => (FOCUS_IDS.evoker.includes(id) ? 'Evoker' : FOCUS_IDS.emanator.includes(id) ? 'Emanator' : null);
export const FOCUS_NOTE = 'In the pack: counts only in a hand.';
export const HEAVY_ROW = 'Heavy armour: not in a fight';
const TYPE: Record<string, string> = { armor_piercing: 'AP', hollow_point: 'HP', incendiary: 'incendiary', enhanced: 'Enhanced' };
const typed = (n: number, cap: number, t?: string | null) => n + '/' + cap + (t ? ' ' + (TYPE[t] || t.replace(/_/g, ' ')) : '');

/** The backpack panel for a fighter: `mine` (it is this player's unit's turn) decides whether anything can be pressed;
 * `hold` is why a turn that is yours can't act yet (the other turns still playing out on screen), shown as the reason. */
export function backpackView(g: any, cb: any, u: any, mine: boolean, hold = ''): Backpack | null {
  if (!g || !cb || !u || !u.charId || u.companion) return null;
  const c = g.characters?.[u.charId]; if (!c) return null;
  const was = bindGame(g);
  try { return build(g, cb, u, c, mine, hold); } finally { bindGame(was); }
}

function build(g: any, cb: any, u: any, c: any, mine: boolean, hold: string): Backpack {
  const reason = cb.over ? 'The fight is over.' : !mine ? 'Not your turn.' : hold ? hold : u.downed ? 'Downed.' : '';
  // A row's own refusal is written on it, not only in the tooltip (a tooltip never shows on touch): the plan's reason
  // in place of the cost, or the cost and "Needs N AP." when AP is short. The panel-wide reason sits above the rows.
  const act = (key: string, verb: string, op: GearOp, action: any, extra = ''): BpAct => {
    const p = gearCost(cb, u, c, op), why = reason || p.why || '', short = !!p.why && /^Needs \d+ AP\.$/.test(p.why);
    const price = p.ap + ' AP' + (p.free ? ' · Hot-Swap' : '') + extra;
    const cost = !p.why || reason ? price : short ? price + ' · ' + p.why : p.why;
    return { key, label: verb, cost, off: !!why, why, action };
  };
  const uid = u.id, w: any = (WEAPON as any)[u.weapon] || (WEAPON as any)[c.weapon], two = twoHands(c, c.weapon);
  const disarmed = (u.conds?.disarmed ?? 0) > 0;
  // ---------- hands ----------
  const mainEmpty = c.weapon === 'fists' || !(WEAPON as any)[c.weapon];
  const mainSub = mainEmpty ? 'Your fists.' : [
    disarmed ? 'On the ground (Disarmed): Recover it, or draw another' : '',
    w && w.magazine != null ? (u.ammo ?? 0) + '/' + w.magazine + ' loaded' : '',
    two ? 'both hands' : '', focusOf(c.weapon) ? 'counts as your ' + focusOf(c.weapon) : ''].filter(Boolean).join(' · ');
  const main: BpRow = { key: 'main', tag: two ? 'BOTH HANDS' : 'MAIN HAND', name: mainEmpty ? 'Empty' : (c.weaponState?.name || nameOf(c.weapon)), sub: mainSub, note: '',
    acts: mainEmpty ? [] : [act('stow-main', 'Put away', { op: 'stow', slot: 'main' }, { type: 'combat/stow', unitId: uid, slot: 'main' }),
      act('drop-main', 'Drop', { op: 'drop', slot: 'main' }, { type: 'combat/drop', unitId: uid, slot: 'main' })] };
  const offId = !two && c.offHand ? c.offHand.id : null, ow: any = offId ? (WEAPON as any)[offId] : null;
  const off: BpRow = { key: 'off', tag: 'OFF HAND', name: two ? 'Both hands: ' + nameOf(c.weapon) : offId ? (c.offHand.name || nameOf(offId)) : 'Empty', note: '',
    sub: two ? '' : offId ? [ow && ow.magazine != null ? (u.offAmmo ?? c.offHand.loaded ?? 0) + '/' + ow.magazine + ' loaded' : '', focusOf(offId) ? 'counts as your ' + focusOf(offId) : ''].filter(Boolean).join(' · ') : 'A one-handed weapon, a shield, a torch or a focus.',
    acts: offId ? [...(ow && ow.hands === '1H' ? [act('swap', 'Swap hands', { op: 'swap' }, { type: 'combat/swap', unitId: uid, from: 'off' })] : []),
      act('stow-off', 'Put away', { op: 'stow', slot: 'off' }, { type: 'combat/stow', unitId: uid, slot: 'off' }),
      act('drop-off', 'Drop', { op: 'drop', slot: 'off' }, { type: 'combat/drop', unitId: uid, slot: 'off' })] : [] };
  // ---------- armour ----------
  const armour: BpRow[] = Object.entries(c.worn || {}).filter(([, id]) => !!id).map(([slot, id]: [string, any]) => ({
    key: 'worn-' + slot, tag: slot.replace(/_/g, ' ').toUpperCase(), name: nameOf(id), sub: ((ITEM as any)[id]?.weight_kg ?? 0) + ' kg', note: '',
    acts: isLightArmour(id) ? [act('off-' + slot, 'Take off', { op: 'stow', slot }, { type: 'combat/stow', unitId: uid, slot })] : [{ key: 'heavy', label: HEAVY_ROW, cost: '', off: true, why: HEAVY_ROW + '.', action: null }] }));
  if (c.armourClass) armour.unshift({ key: 'body', tag: 'BODY ARMOUR', name: 'Armour Class ' + c.armourClass, sub: 'From your kit.', note: '', acts: [{ key: 'heavy', label: HEAVY_ROW, cost: '', off: true, why: HEAVY_ROW + '.', action: null }] });
  // ---------- the pack (weapons, focuses, shields, armour, mods, the rest) ----------
  const rows: BpRow[] = [];
  packOf(c).forEach((it: any, i: number) => {
    if (!(it.qty > 0) || it.mags || it.calibre) return; // ammo: from the unit, below
    const wid = it.weapon && (WEAPON as any)[it.weapon] ? it.weapon : null, wd: any = wid ? (WEAPON as any)[wid] : null, def: any = (ITEM as any)[it.item || it.id] || {};
    if (wd && wd.category === 'thrown') return; // throwables: from the unit, below
    // What the unit counts in a fight shows from the unit, below (stims, cores, spare parts): the pack's number is stale.
    if (['stim', 'stim_injector', 'standard_core', 'spare_parts'].includes(it.item || it.id)) return;
    const fk = focusOf(wid || it.item || it.id), acts: BpAct[] = [];
    const tag = isPlotItem(it) ? 'STORY' : wd ? 'WEAPON' : def.category === 'armour' ? 'ARMOUR' : def.category === 'mod' ? 'MOD' : def.slot === 'off_hand' ? (fk ? 'FOCUS' : 'OFF HAND') : 'ITEM';
    if (!isPlotItem(it)) {
      if (wd) {
        const two2 = twoHands(c, wid);
        acts.push(act('draw-' + i, 'Draw', { op: 'draw', item: i, to: 'main' }, { type: 'combat/equip', unitId: uid, item: i, to: 'main' }, two2 ? ' · both hands' : ''));
        if (wd.hands === '1H') acts.push(act('off-' + i, 'Off hand', { op: 'draw', item: i, to: 'off' }, { type: 'combat/equip', unitId: uid, item: i, to: 'off' }));
      } else if (def.slot === 'off_hand') acts.push(act('off-' + i, 'Draw', { op: 'draw', item: i, to: 'off' }, { type: 'combat/equip', unitId: uid, item: i, to: 'off' }, ' · off hand'));
      else if (def.category === 'armour' && def.slot) acts.push(isLightArmour(def.id) ? act('wear-' + i, 'Put on', { op: 'wear', item: i }, { type: 'combat/equip', unitId: uid, item: i, to: 'worn' })
        : { key: 'heavy', label: HEAVY_ROW, cost: '', off: true, why: HEAVY_ROW + '.', action: null });
      else if (def.category === 'mod') acts.push(act('mod-' + i, 'Fit', { op: 'mod', item: i }, { type: 'combat/swap', unitId: uid, mod: i }));
    }
    rows.push({ key: 'pack-' + i, tag, name: (it.qty > 1 ? it.qty + ' × ' : '') + (it.name || nameOf(wid || it.item || it.id)) + (it.rarity && it.rarity !== 'standard' ? ' · ' + it.rarity.toUpperCase() : ''),
      sub: wd ? [typeof wd.damage === 'number' ? wd.damage + ' dmg' : '', wd.hands, wd.magazine != null && it.loaded != null ? it.loaded + '/' + wd.magazine + ' loaded' : ''].filter(Boolean).join(' · ') : isPlotItem(it) ? (it.text || 'From the story.') : (it.note || def.text || '').slice(0, 90),
      note: fk ? FOCUS_NOTE : '', acts });
  });
  // ---------- ammo and throwables, from the unit ----------
  const ammo: BpRow[] = [];
  const cap = w && w.magazine != null ? w.magazine : 0;
  const unit = (w && w.reload_unit) || 'magazine';
  if (w && w.magazine != null && w.reload !== 'loose' && Array.isArray(u.mags)) ammo.push({ key: 'mags', tag: (unit + 's').toUpperCase(), name: u.mags.length + ' spare ' + unit + (u.mags.length === 1 ? '' : 's') + ' · ' + w.name, sub: u.mags.length ? u.mags.map((n: number, k: number) => typed(n, cap, u.magTypes?.[k])).join(' · ') : 'None left.', note: '', acts: [] });
  if ((u.loose ?? 0) > 0 || (w && w.reload === 'loose')) ammo.push({ key: 'loose', tag: 'ROUNDS', name: (u.loose ?? 0) + ' loose rounds', sub: w && w.reload === 'loose' ? 'Loaded round by round.' : 'Load them into a ' + unit + ' (Utility).', note: '', acts: [] });
  if (ow && ow.magazine != null && Array.isArray(u.offMags)) ammo.push({ key: 'offmags', tag: 'OFF-HAND MAGAZINES', name: u.offMags.length + ' · ' + ow.name, sub: u.offMags.map((n: number, k: number) => typed(n, ow.magazine, u.offMagTypes?.[k])).join(' · ') || 'None left.', note: '', acts: [] });
  for (const [k, x] of (u.extra || []).entries()) { const xw: any = (WEAPON as any)[x.weapon]; ammo.push({ key: 'extra-' + k, tag: 'MAGAZINE', name: (xw ? xw.name : x.weapon) + ' magazine', sub: typed(x.rounds, xw?.magazine || 0, x.type) + ' · goes to the pack after the fight', note: '', acts: [] }); }
  // Ammo for guns not in hand (or in hand but tracked elsewhere) is in the pack: read-only, by gun or calibre (review fix:
  // a stowed rifle's magazines vanished from the panel).
  const offCal = u.offLoose != null && ow ? ow.ammo : null;
  packOf(c).forEach((it: any, i: number) => {
    if (it.mags && it.weapon && it.weapon !== u.weapon && it.weapon !== u.offWeapon && it.mags.length) { const xw: any = (WEAPON as any)[it.weapon];
      ammo.push({ key: 'pmags-' + i, tag: ((xw?.reload_unit || 'magazine') + 's').toUpperCase(), name: it.mags.length + ' × ' + (xw ? xw.name : it.weapon), sub: it.mags.map((n: number, k: number) => typed(n, xw?.magazine || 0, it.magTypes?.[k])).join(' · ') + ' · in the pack', note: '', acts: [] }); }
    else if (it.calibre && !it.mags && it.qty > 0 && it.calibre !== (w && w.ammo) && it.calibre !== offCal)
      ammo.push({ key: 'prounds-' + i, tag: 'ROUNDS', name: it.qty + ' × ' + calName(it.calibre) + (it.ammoType ? ' ' + (TYPE[it.ammoType] || it.ammoType) : ''), sub: 'In the pack.', note: '', acts: [] });
  });
  if (offCal) ammo.push({ key: 'offloose', tag: 'OFF-HAND ROUNDS', name: (u.offLoose ?? 0) + ' × ' + calName(offCal), sub: 'Loaded round by round into the off-hand gun.', note: '', acts: [] });
  for (const [id, n] of Object.entries(u.throwables || {})) if ((n as number) > 0) ammo.push({ key: 'thr-' + id, tag: 'THROWABLE', name: n + ' × ' + nameOf(id), sub: 'Throw it from the Attack tab.', note: '', acts: [] });
  if ((u.parts ?? 0) > 0) ammo.push({ key: 'parts', tag: 'PARTS', name: u.parts + ' spare parts', sub: 'Field Repair uses one.', note: '', acts: [] });
  if (u.mg && (u.mg.cores ?? 0) > 0) ammo.push({ key: 'cores', tag: 'CORES', name: u.mg.cores + ' mana ' + (u.mg.cores === 1 ? 'core' : 'cores'), sub: 'Swap a core from the Sigils tab.', note: '', acts: [] });
  if ((c.stims ?? 0) > 0) ammo.push({ key: 'stims', tag: 'STIMS', name: c.stims + ' stim ' + (c.stims === 1 ? 'injector' : 'injectors'), sub: 'Stim an ally from the Utility tab.', note: '', acts: [] });
  return { who: c.name, ap: u.ap ?? 0, reason, sections: [
    { key: 'hands', title: 'HANDS', rows: [main, off], empty: '' },
    { key: 'armour', title: 'ARMOUR', rows: armour, empty: 'Nothing worn. A light piece (' + GEAR.light_armour_max_kg + ' kg or less) goes on for 1 AP.' },
    { key: 'pack', title: 'BACKPACK', rows, empty: 'Nothing else in the pack.' },
    { key: 'ammo', title: 'AMMO AND THROWABLES', rows: ammo, empty: 'No spare ammo.' }] };
}
