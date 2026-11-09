// Gear in a fight (rules revision 1.8, World Play 1.1; docs/design/world-play-1.1-spec.md section 3; spec section 14
// items 684–690). One rule: changing what a hand holds costs 1 AP a hand. Draw into one hand 1, a two-handed weapon 2,
// swap main and off hand 1, put away 1 a hand (2 for a two-handed weapon), drop 0 (into the pile on your tile); a light
// armour piece (1.2 kg or less; provisional) on or off 1 AP each; heavier armour isn't changed in a fight. This module only plans: it
// says what a change costs and why it can't be made, without changing anything (the reducer in game.ts runs it through
// the fight's checks, Hot-Swap, the write-back and the rebuild). The numbers are `data/world_play.json` `gear`.
import wpJ from '../../../data/world_play.json';
import { WEAPON, ITEM } from './data';
import { type Character, packOf, twoHands, isPlotItem, isAmmoEntry, AMMO_WHY } from './character';
import type { Combat, Unit } from './combat';
import { holderOf, uses } from './effects';

/** The gear costs (PROVISIONAL, items 684, 685). */
export const GEAR: { hand_ap: number; two_handed_draw_ap: number; swap_hands_ap: number; put_away_ap_per_hand: number; drop_ap: number; light_armour_ap: number; light_armour_max_kg: number } = (wpJ as any).gear;

/** One gear change in a fight. `item` names a pack entry by its index or its id (item 684). */
export type GearOp =
  | { op: 'draw'; item: number | string; to: 'main' | 'off' }
  | { op: 'wear'; item: number | string }
  | { op: 'mod'; item: number | string }
  | { op: 'swap' }
  | { op: 'stow'; slot: string }
  | { op: 'drop'; slot: string };

/** A pack entry by its index (a number or a numeric string), or by its id: the first weapon, item or entry with that id
 * that isn't a magazine stack and still has something in it. -1: nothing there. */
export function packRef(c: Character, ref: number | string | null | undefined): number {
  const pack = packOf(c);
  if (typeof ref === 'number' || /^\d+$/.test(String(ref ?? ''))) { const i = Number(ref); return pack[i] ? i : -1; }
  const id = String(ref ?? ''); if (!id) return -1;
  return pack.findIndex((x) => x.qty > 0 && !x.mags && (x.weapon === id || x.item === id || x.id === id));
}

const nameOf = (id: string) => WEAPON[id]?.name || ITEM[id]?.name || id;
/** A slot armour piece's weight. */
export const armourKg = (id: string) => Number((ITEM[id] as any)?.weight_kg ?? 0);
/** Light armour: 1.2 kg or less (item 685, provisional), so the field helmet and field boots change in a fight. */
export const isLightArmour = (id: string) => armourKg(id) <= GEAR.light_armour_max_kg;
export const HEAVY_WHY = 'Heavy armour (over ' + GEAR.light_armour_max_kg + ' kg) isn\'t changed in a fight.';
/** Disarmed (item 687): the weapon is on the ground. */
export const DOWN_WHY = 'Your weapon is on the ground: recover it (2 AP) or draw another.';

export interface GearPlan {
  /** AP before Hot-Swap. */
  ap: number;
  /** Why it can't be done (null: it can). The engine's own checks (a trait's ban, a skill requirement) still apply. */
  why: string | null;
  /** A hand row: Hot-Swap covers it (item 686); armour isn't. */
  hand: boolean;
  /** The pack entry it takes, for a draw, a wear or a mod. */
  idx?: number;
  /** What it does, for the log (after the name: "draws the Service pistol", "puts on the Gas mask"). */
  label: string;
}

/** What a gear change in a fight costs and whether it can be made now. Changes nothing. */
export function gearPlan(c: Character, op: GearOp, o: { disarmed?: boolean } = {}): GearPlan {
  const no = (why: string, hand = true): GearPlan => ({ ap: 0, why, hand, label: '' });
  const ok = (ap: number, label: string, hand = true, idx?: number): GearPlan => ({ ap, why: null, hand, label, ...(idx != null ? { idx } : {}) });
  const twoMain = twoHands(c, c.weapon), mainEmpty = c.weapon === 'fists' || !WEAPON[c.weapon];
  const offHeld = !!c.offHand && !twoMain;
  switch (op.op) {
    case 'draw': case 'wear': case 'mod': {
      const idx = packRef(c, op.item), it = packOf(c)[idx];
      if (!it) return no('Nothing there in your pack.', op.op !== 'wear');
      if (isPlotItem(it)) return no('A plot item can\'t be equipped.', op.op !== 'wear');
      if (isAmmoEntry(it)) return no(AMMO_WHY, op.op !== 'wear'); // review fix: a magazine stack drew a fresh empty gun
      if (op.op === 'mod') return ok(GEAR.hand_ap, 'fits the ' + nameOf(it.item || it.id), true, idx);
      if (op.op === 'wear') {
        const def: any = ITEM[it.item || it.id];
        if (!def || def.category !== 'armour' || !def.slot || def.slot === 'off_hand') return no('That isn\'t slot armour.', false);
        if (!isLightArmour(def.id)) return no(HEAVY_WHY, false);
        const on = c.worn?.[def.slot];
        if (on && !isLightArmour(on)) return no('The ' + nameOf(on) + ' in that slot is heavy armour: ' + HEAVY_WHY.charAt(0).toLowerCase() + HEAVY_WHY.slice(1), false);
        // Over another light piece: one off, one on (item 685).
        return ok(GEAR.light_armour_ap * (on ? 2 : 1), 'puts on the ' + def.name + (on ? ' (the ' + nameOf(on) + ' comes off)' : ''), false, idx);
      }
      const wid = it.weapon && WEAPON[it.weapon] ? it.weapon : null;
      if (op.to === 'main') {
        if (!wid) return no('Only weapons go in the main hand.');
        const two = twoHands(c, wid);
        return ok(two ? GEAR.two_handed_draw_ap : GEAR.hand_ap, 'draws the ' + nameOf(wid) + (two ? ' (both hands)' : ''), true, idx);
      }
      if (twoMain) return no('Your main-hand weapon needs both hands.');
      if (wid ? (WEAPON[wid] as any).hands !== '1H' : (ITEM[it.item || it.id] as any)?.slot !== 'off_hand') return no('That doesn\'t go in the off hand.');
      return ok(GEAR.hand_ap, 'takes the ' + nameOf(wid || it.item || it.id) + ' in the off hand', true, idx);
    }
    case 'swap': {
      if (!c.offHand || !WEAPON[c.offHand.id] || (WEAPON[c.offHand.id] as any).hands !== '1H') return no('Your off hand holds no one-handed weapon.');
      if (twoMain) return no('Your main-hand weapon needs both hands.');
      return ok(GEAR.swap_hands_ap, o.disarmed ? 'brings the ' + nameOf(c.offHand.id) + ' to the main hand' : 'swaps hands');
    }
    case 'stow': {
      if (op.slot === 'main') {
        if (mainEmpty) return no('Your hands are already empty.');
        if (o.disarmed) return no(DOWN_WHY);
        return ok(GEAR.put_away_ap_per_hand * (twoMain ? 2 : 1), 'puts the ' + nameOf(c.weapon) + ' away');
      }
      if (op.slot === 'off') { if (!offHeld) return no('Your off hand is empty.'); return ok(GEAR.put_away_ap_per_hand, 'puts the ' + nameOf(c.offHand!.id) + ' away'); }
      const id = c.worn?.[op.slot]; if (!id) return no('Nothing worn there.', false);
      if (!isLightArmour(id)) return no(HEAVY_WHY, false);
      return ok(GEAR.light_armour_ap, 'takes off the ' + nameOf(id), false);
    }
    case 'drop': {
      if (op.slot === 'main') {
        if (mainEmpty) return no('Your hands are already empty.');
        if (o.disarmed) return no('Your weapon is already on the ground.');
        return ok(GEAR.drop_ap, 'drops the ' + nameOf(c.weapon));
      }
      if (op.slot === 'off') { if (!offHeld) return no('Your off hand is empty.'); return ok(GEAR.drop_ap, 'drops the ' + nameOf(c.offHand!.id)); }
      return no('Only what a hand holds is dropped in a fight.');
    }
  }
  return no('Unknown gear change.');
}

/** Hot-Swap's free hand changes left this turn for a fighter (item 686): 0 without the perk. Reads, never spends. */
export function hotSwapLeft(cb: Combat | null | undefined, u: Unit | null | undefined): number {
  if (!cb || !u) return 0;
  const h = holderOf({ u, cb }, 'hot_swap'); if (!h) return 0;
  return uses(h).left('per_turn', h.tier === 'II' ? 2 : 1);
}

/** A gear change's price for this fighter right now, as the reducer will charge it (the UI's backpack rows): the plan,
 * Hot-Swap on a hand row, and the AP check. `free`: Hot-Swap pays for it. Changes nothing. */
export function gearCost(cb: Combat, u: Unit, c: Character, op: GearOp): GearPlan & { free: boolean } {
  if (u.companion) return { ap: 0, why: 'A companion has no pack.', hand: true, label: '', free: false };
  const plan = gearPlan(c, op, { disarmed: (u.conds?.disarmed ?? 0) > 0 });
  if (plan.why) return { ...plan, free: false };
  const free = plan.hand && plan.ap > 0 && hotSwapLeft(cb, u) > 0, ap = free ? 0 : plan.ap;
  return { ...plan, ap, free, why: u.ap < ap ? 'Needs ' + ap + ' AP.' : null };
}
