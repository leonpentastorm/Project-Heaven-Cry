// World Play 1.1 (rules revision 1.8; docs/design/world-play-1.1-spec.md section 3), part A2: gear in a fight under one
// rule, 1 AP a hand (spec section 14 items 684–690). Every row of the table, Hot-Swap, light and heavy armour, the drop
// into the pile, Disarmed, the rebuild (armour, Movement, dark sight, conditions kept, the off-hand gun's real rounds),
// the sheet's gear actions forwarded to the combat actions, and a pack entry named by id. Every rule goes through
// apply(), the path a player's click takes.
import { describe, expect, it } from 'vitest';
import {
  apply, packOf, magsOf, refOf, RuleError, WEAPON, ITEM, GEAR, gearPlan, gearCost, hotSwapLeft, packRef, HEAVY_WHY, DOWN_WHY,
  type Action, type Character, type GameState, type Unit,
} from '../src';
import { storyWith, withGame } from './helpers/perkfight';
import { beginTurn } from '../src';

const H = 'host';
const gun = (id: string, extra: any = {}): any => ({ id, name: WEAPON[id].name, qty: 1, kind: 'weapon', weapon: id, ...extra });
const piece = (id: string): any => ({ id, item: id, name: ITEM[id].name, qty: 1, kind: 'tool' });
const refused = (g: GameState, a: any): string => { try { apply(g, a as Action, H); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal: ' + a.type); };

/** Rook: a service pistol (12 in it), one spare, a revolver (4 in it) and a rifle (20 in it) in the pack, the Evoker, and
 * armour pieces. `setup` changes Rook before the fight; then a fight with one far-off raider, on Rook's turn, 6 AP. */
function fight(setup: (c: Character) => void = () => {}, perks?: Record<string, string>) {
  const s = storyWith([{ name: 'Rook', kit: 'soldier', ...(perks ? { perks } : {}) }, { name: 'Ash', kit: 'medic' }]);
  const c0 = s.g.characters[s.chars[0].id];
  c0.weapon = 'service_pistol'; c0.weaponState = {}; c0.loaded = 12; c0.offHand = null; c0.worn = {};
  c0.pack = [magsOf('service_pistol', 1), gun('drifter_revolver', { loaded: 4 }), gun('hellraiser_service_rifle', { loaded: 20 }), magsOf('hellraiser_service_rifle', 1),
    piece('evoker'), piece('padded_undershirt'), piece('runner_trousers'), piece('night_goggles'), piece('field_helmet'), piece('combat_gloves'), piece('work_gloves'), piece('smiling_mask')];
  setup(c0);
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Gear', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists', at: '' }] } } } as any);
  const api = {
    get g(): GameState { return s.g; },
    get c(): Character { return s.g.characters[s.chars[0].id]; },
    get u(): Unit { return s.g.combat!.units.find((x) => x.charId === s.chars[0].id)!; },
    get ash(): Unit { return s.g.combat!.units.find((x) => x.charId === s.chars[1].id)!; },
    act: (a: any) => s.act(a as Action, H),
    refused: (a: any) => refused(s.g, a),
    /** Rook's turn now, with full AP (beginTurn runs). */
    turn() { const cb = s.g.combat!; cb.turn = cb.order.indexOf(api.u.id); delete cb.window; withGame(s.g, () => beginTurn(cb, s.g.rng)); return api.u; },
    /** Set Rook's AP directly (to try a row without ending turns). */
    ap(n: number) { api.u.ap = n; },
    pile: () => (s.g.combat!.objects || []).find((o) => o.kind === 'pile' && o.pos === api.u.pos),
  };
  api.turn();
  return api;
}

describe('gear in a fight: 1 AP a hand (items 684, 688)', () => {
  it('the data: draw 1, two-handed 2, swap 1, put away 1 a hand, drop 0, light armour 1 at 1 kg or less', () => {
    expect(GEAR).toMatchObject({ hand_ap: 1, two_handed_draw_ap: 2, swap_hands_ap: 1, put_away_ap_per_hand: 1, drop_ap: 0, light_armour_ap: 1, light_armour_max_kg: 1 });
  });
  it('draw a one-handed gun into the off hand (1 AP, its own rounds), swap hands (1), put the off hand away (1)', () => {
    const f = fight(); expect(f.u.ap).toBe(6);
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'drifter_revolver', to: 'off' }); // named by id, not by index
    expect(f.u.ap).toBe(5); expect(f.u.offWeapon).toBe('drifter_revolver'); expect(f.u.offAmmo).toBe(4); // not a free full cylinder
    expect(f.g.combat!.log.some((l) => /Rook takes the Drifter revolver in the off hand \(1 AP\)/i.test(l))).toBe(true);
    f.act({ type: 'combat/swap', unitId: f.u.id, from: 'off' });
    expect(f.u.ap).toBe(4); expect(f.u.weapon).toBe('drifter_revolver'); expect(f.u.ammo).toBe(4); expect(f.u.offWeapon).toBe('service_pistol'); expect(f.u.offAmmo).toBe(12);
    f.act({ type: 'combat/stow', unitId: f.u.id, slot: 'off' });
    expect(f.u.ap).toBe(3); expect(f.u.offWeapon ?? null).toBeNull(); expect(f.c.offHand ?? null).toBeNull();
    expect(packOf(f.c).find((x) => x.weapon === 'service_pistol' && x.kind === 'weapon')?.loaded).toBe(12); // a stowed gun keeps its rounds
  });
  it('draw a two-handed weapon: 2 AP, the off hand goes to the pack; put it away: 2 AP, then fists; short of AP: refused', () => {
    const f = fight((c) => { c.offHand = { id: 'drifter_revolver', loaded: 3 }; c.pack = c.pack!.filter((x) => x.weapon !== 'drifter_revolver'); });
    expect(f.u.offAmmo).toBe(3);
    const idx = packOf(f.c).findIndex((x) => x.weapon === 'hellraiser_service_rifle' && x.kind === 'weapon');
    f.act({ type: 'combat/equip', unitId: f.u.id, item: idx, to: 'main' });
    expect(f.u.ap).toBe(4); expect(f.u.weapon).toBe('hellraiser_service_rifle'); expect(f.u.ammo).toBe(20); expect(f.u.mags).toEqual([24]);
    expect(f.c.offHand ?? null).toBeNull(); expect(packOf(f.c).find((x) => x.weapon === 'drifter_revolver' && x.kind === 'weapon')?.loaded).toBe(3);
    expect(packOf(f.c).find((x) => x.weapon === 'service_pistol' && x.kind === 'weapon')?.loaded).toBe(12);
    f.ap(1); expect(f.refused({ type: 'combat/stow', unitId: f.u.id, slot: 'main' })).toBe('Needs 2 AP.');
    f.ap(6); f.act({ type: 'combat/stow', unitId: f.u.id, slot: 'main' });
    expect(f.u.ap).toBe(4); expect(f.u.weapon).toBe('fists'); expect(f.c.weapon).toBe('fists');
    expect(packOf(f.c).find((x) => x.weapon === 'hellraiser_service_rifle' && x.kind === 'weapon')?.loaded).toBe(20);
    expect(packOf(f.c).some((x) => x.weapon === 'fists')).toBe(false);
    expect(f.refused({ type: 'combat/stow', unitId: f.u.id, slot: 'main' })).toBe('Your hands are already empty.');
    // a one-handed gun into the main hand while a two-handed one is held is 1 AP
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'hellraiser_service_rifle', to: 'main' }); expect(f.u.ap).toBe(2);
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'service_pistol', to: 'main' }); expect(f.u.ap).toBe(1); expect(f.u.weapon).toBe('service_pistol'); expect(f.u.ammo).toBe(12);
  });
  it('drop what a hand holds: 0 AP, into the pile on your tile with its rounds; the off hand too', () => {
    const f = fight((c) => { c.offHand = { id: 'evoker' }; c.weaponState = { rarity: 'fine', dur: 30 }; });
    f.act({ type: 'combat/drop', unitId: f.u.id, slot: 'main' });
    expect(f.u.ap).toBe(6); expect(f.u.weapon).toBe('fists');
    const e = f.pile()!.items!.find((x) => x.pack?.weapon === 'service_pistol')!.pack!;
    expect(e.loaded).toBe(12); expect(e.rarity).toBe('fine'); expect(e.dur).toBe(30);
    expect(f.g.combat!.log.some((l) => /Rook drops the Service pistol.* \(0 AP\): it lands in the pile at/.test(l))).toBe(true);
    f.act({ type: 'combat/drop', unitId: f.u.id, slot: 'off' });
    expect(f.u.ap).toBe(6); expect(f.c.offHand ?? null).toBeNull(); expect(f.u.mg?.evoker ?? false).toBe(false);
    expect(f.pile()!.items!.some((x) => (x.pack?.item || x.pack?.id) === 'evoker')).toBe(true);
    expect(f.refused({ type: 'combat/drop', unitId: f.u.id, slot: 'off' })).toBe('Your off hand is empty.');
    expect(f.refused({ type: 'combat/drop', unitId: f.u.id, slot: 'head' })).toMatch(/Only what a hand holds/);
    // picked up again (1 AP), the gun comes back with its rounds
    f.act({ type: 'combat/pickup', unitId: f.u.id, tile: refOf(f.u.pos) }); expect(f.u.ap).toBe(5);
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'service_pistol', to: 'main' }); expect(f.u.ap).toBe(4); expect(f.u.ammo).toBe(12);
  });
});

describe('light and heavy armour in a fight (item 685)', () => {
  it('a light piece on or off is 1 AP and the fighter follows it: armour, Movement, dark sight', () => {
    const f = fight(); const arm = f.u.armour, mv = f.u.movement;
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'padded_undershirt', to: 'worn' });
    expect(f.u.ap).toBe(5); expect(f.c.worn?.inner_torso).toBe('padded_undershirt'); expect(f.u.armour).toBe(arm + 1);
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'runner_trousers', to: 'worn' }); expect(f.u.ap).toBe(4); expect(f.u.movement).toBe(mv + 0.5);
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'night_goggles', to: 'worn' }); expect(f.u.ap).toBe(3); expect(f.u.darkSight).toBe(true);
    f.act({ type: 'combat/stow', unitId: f.u.id, slot: 'inner_torso' }); expect(f.u.ap).toBe(2); expect(f.u.armour).toBe(arm);
    expect(packOf(f.c).some((x) => x.id === 'padded_undershirt')).toBe(true);
  });
  it('a light piece over another light one is 2 AP (one off, one on)', () => {
    const f = fight();
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'combat_gloves', to: 'worn' }); expect(f.u.ap).toBe(5);
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'work_gloves', to: 'worn' }); expect(f.u.ap).toBe(3);
    expect(f.c.worn?.hands).toBe('work_gloves'); expect(packOf(f.c).some((x) => x.id === 'combat_gloves')).toBe(true);
  });
  it('heavy armour (over 1 kg) is never changed in a fight: on, off, or a light piece over it', () => {
    const f = fight((c) => { c.worn = { head: 'ballistic_helmet' }; });
    expect(f.refused({ type: 'combat/equip', unitId: f.u.id, item: 'field_helmet', to: 'worn' })).toBe(HEAVY_WHY);
    expect(f.refused({ type: 'combat/stow', unitId: f.u.id, slot: 'head' })).toBe(HEAVY_WHY);
    expect(f.refused({ type: 'combat/equip', unitId: f.u.id, item: 'smiling_mask', to: 'worn' })).toMatch(/Ballistic helmet in that slot is heavy armour/i);
    expect(HEAVY_WHY).toBe('Heavy armour (over 1 kg) isn\'t changed in a fight.');
    // out of a fight it is free and allowed (the sheet's own gear actions)
    const c = f.c; expect(gearPlan(c, { op: 'wear', item: 'field_helmet' }).why).toBe(HEAVY_WHY);
  });
});

describe('gearCost: the price the backpack shows is the price the reducer charges (rules 1.8)', () => {
  it('every row, Hot-Swap included, matches what the action then costs', () => {
    const f = fight(() => {}, { hot_swap: 'I' }), cb = () => f.g.combat!;
    const price = (op: any) => withGame(f.g, () => gearCost(cb(), f.u, f.c, op));
    expect(withGame(f.g, () => hotSwapLeft(cb(), f.u))).toBe(1);
    expect(price({ op: 'draw', item: 'hellraiser_service_rifle', to: 'main' })).toMatchObject({ ap: 0, free: true, why: null });
    expect(price({ op: 'wear', item: 'night_goggles' })).toMatchObject({ ap: 1, free: false }); // armour: never Hot-Swap
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'hellraiser_service_rifle', to: 'main' }); expect(f.u.ap).toBe(6);
    expect(withGame(f.g, () => hotSwapLeft(cb(), f.u))).toBe(0);
    expect(price({ op: 'stow', slot: 'main' })).toMatchObject({ ap: 2, free: false, why: null });
    f.ap(1); expect(price({ op: 'stow', slot: 'main' }).why).toBe('Needs 2 AP.');
    expect(price({ op: 'drop', slot: 'main' })).toMatchObject({ ap: 0, why: null });
    expect(price({ op: 'wear', item: 'field_helmet' }).why).toBe(HEAVY_WHY);
    expect(gearCost(cb(), { ...f.u, companion: true } as any, f.c, { op: 'swap' }).why).toBe('A companion has no pack.');
  });
});

describe('Hot-Swap and gear (item 686)', () => {
  it('I: one hand row free a turn, a two-handed draw included; armour is not covered and leaves it unused', () => {
    const f = fight(() => {}, { hot_swap: 'I' });
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'night_goggles', to: 'worn' }); expect(f.u.ap).toBe(5); // armour: full price
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'hellraiser_service_rifle', to: 'main' }); expect(f.u.ap).toBe(5); // free (2 AP saved)
    expect(f.g.combat!.log.some((l) => /Hot-Swap: 0 AP/.test(l))).toBe(true);
    f.act({ type: 'combat/stow', unitId: f.u.id, slot: 'main' }); expect(f.u.ap).toBe(3); // the second hand row pays
  });
  it('II: twice a turn (draw, put away), the third pays; a drop never uses it', () => {
    const f = fight(() => {}, { hot_swap: 'II' });
    f.act({ type: 'combat/drop', unitId: f.u.id, slot: 'main' }); expect(f.u.ap).toBe(6);
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'drifter_revolver', to: 'main' }); expect(f.u.ap).toBe(6);
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'evoker', to: 'off' }); expect(f.u.ap).toBe(6);
    f.act({ type: 'combat/stow', unitId: f.u.id, slot: 'off' }); expect(f.u.ap).toBe(5);
  });
});

describe('Disarmed and gear (item 687)', () => {
  const disarm = (f: ReturnType<typeof fight>) => { f.u.conds = { ...(f.u.conds || {}), disarmed: 99 }; };
  it('drawing another weapon leaves the downed one in the pile and ends Disarmed; putting it away or dropping it is refused', () => {
    const f = fight(); disarm(f);
    expect(f.refused({ type: 'combat/stow', unitId: f.u.id, slot: 'main' })).toBe(DOWN_WHY);
    expect(f.refused({ type: 'combat/drop', unitId: f.u.id, slot: 'main' })).toBe('Your weapon is already on the ground.');
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'drifter_revolver', to: 'main' });
    expect(f.u.ap).toBe(5); expect(f.u.weapon).toBe('drifter_revolver'); expect(f.u.conds?.disarmed ?? 0).toBe(0);
    expect(f.pile()!.items!.find((x) => x.pack?.weapon === 'service_pistol')!.pack!.loaded).toBe(12);
    expect(packOf(f.c).some((x) => x.weapon === 'service_pistol' && x.kind === 'weapon')).toBe(false); // it stays on the ground
  });
  it('swapping the off-hand gun to the main hand does the same; drawing into the off hand leaves Disarmed as it is', () => {
    const f = fight((c) => { c.offHand = { id: 'drifter_revolver', loaded: 5 }; c.pack = c.pack!.filter((x) => x.weapon !== 'drifter_revolver'); }); disarm(f);
    f.act({ type: 'combat/swap', unitId: f.u.id, from: 'off' });
    expect(f.u.weapon).toBe('drifter_revolver'); expect(f.u.ammo).toBe(5); expect(f.c.offHand ?? null).toBeNull(); expect(f.u.conds?.disarmed ?? 0).toBe(0);
    expect(f.pile()!.items!.some((x) => x.pack?.weapon === 'service_pistol')).toBe(true);
    const g = fight(); disarm(g);
    g.act({ type: 'combat/equip', unitId: g.u.id, item: 'evoker', to: 'off' }); expect(g.u.conds?.disarmed).toBeGreaterThan(0);
  });
});

describe('the rebuild and the write-back (items 684, 688, 689)', () => {
  it('HP, conditions and a slow are kept; armour from the gear moves by its difference (an armour break stays)', () => {
    const f = fight();
    f.u.hp = 40; f.u.conds = { slowed: 2 }; f.u.baseMove = f.u.movement; f.u.movement = f.u.baseMove / 2; f.u.baseArmour = f.u.armour + 5;
    const mv = f.u.movement, arm = f.u.armour;
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'runner_trousers', to: 'worn' });
    expect(f.u.hp).toBe(40); expect(f.u.conds?.slowed).toBe(2); expect(f.u.movement).toBe(mv + 0.25); // half the trousers' +0.5 while slowed
    f.act({ type: 'combat/equip', unitId: f.u.id, item: 'combat_gloves', to: 'worn' }); expect(f.u.armour).toBe(arm + 1); expect(f.u.baseArmour).toBe(arm + 6);
  });
  it('the off-hand gun carries its rounds out of the fight; an old save with no count starts full', () => {
    const f = fight((c) => { c.offHand = { id: 'drifter_revolver' }; c.pack = c.pack!.filter((x) => x.weapon !== 'drifter_revolver'); });
    expect(f.u.offAmmo).toBe(6);
    f.u.offAmmo = 2;
    for (const u of f.g.combat!.units) if (u.side === 'foe') { u.dead = true; u.hp = 0; }
    f.act({ type: 'combat/end-turn', unitId: f.u.id });
    expect(f.g.phase).toBe('story'); expect(f.c.offHand?.loaded).toBe(2);
  });
  it('a pack entry named by index is found again after the write-back drops a used-up entry ahead of it', () => {
    const f = fight((c) => { c.pack = [{ id: 'spare_parts', item: 'spare_parts', name: 'Spare parts', qty: 1, kind: 'tool' }, ...c.pack!]; });
    const idx = packOf(f.c).findIndex((x) => x.weapon === 'drifter_revolver');
    f.u.parts = 0; // the spare parts are used up: the write-back removes them, and the revolver moves up one
    f.act({ type: 'combat/equip', unitId: f.u.id, item: idx, to: 'off' });
    expect(f.u.offWeapon).toBe('drifter_revolver'); expect(packOf(f.c).some((x) => x.id === 'spare_parts')).toBe(false);
    expect(packRef(f.c, 'hellraiser_service_rifle')).toBe(packOf(f.c).findIndex((x) => x.weapon === 'hellraiser_service_rifle' && x.kind === 'weapon'));
  });
});

describe('the sheet\'s gear actions in a fight (forwarded to the combat actions)', () => {
  it('gear/equip, gear/unequip and gear/mod cost what the combat action costs, on the unit\'s own turn', () => {
    const f = fight();
    f.act({ type: 'gear/equip', charId: f.c.id, idx: 'hellraiser_service_rifle', to: 'main' }); expect(f.u.ap).toBe(4); expect(f.u.weapon).toBe('hellraiser_service_rifle');
    f.act({ type: 'gear/unequip', charId: f.c.id, slot: 'main' }); expect(f.u.ap).toBe(2); expect(f.u.weapon).toBe('fists');
    // Ash isn't the active unit: refused with the turn's owner
    const ash = f.g.characters[f.ash.charId!];
    expect(f.refused({ type: 'gear/unequip', charId: ash.id, slot: 'off' })).toMatch(/It's Rook's turn/);
    expect(f.refused({ type: 'gear/equip', charId: f.c.id, idx: 'smiling_mask', to: 'main' })).toBe('Only weapons go in the main hand.');
    expect(f.refused({ type: 'gear/equip', charId: f.c.id, idx: 'field_helmet', to: 'worn' })).toBe(HEAVY_WHY);
  });
  it('gearPlan says what a change costs and why not, without changing anything (for the inventory panel)', () => {
    const f = fight(), before = JSON.stringify(f.c);
    const plan = gearPlan(f.c, { op: 'drop', slot: 'main' }); expect(plan.ap).toBe(0); expect(plan.why).toBeNull();
    expect(gearPlan(f.c, { op: 'draw', item: 'nothing_here', to: 'main' }).why).toBe('Nothing there in your pack.');
    expect(gearPlan(f.c, { op: 'draw', item: 'hellraiser_service_rifle', to: 'main' })).toMatchObject({ ap: 2, hand: true, why: null });
    expect(gearPlan(f.c, { op: 'wear', item: 'gas_mask' }).why).toBe('Nothing there in your pack.');
    expect(gearPlan(f.c, { op: 'wear', item: 'night_goggles' })).toMatchObject({ ap: 1, hand: false });
    expect(JSON.stringify(f.c)).toBe(before);
  });
});
