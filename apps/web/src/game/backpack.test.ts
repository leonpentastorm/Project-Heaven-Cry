// The backpack in a fight (rules 1.9, World Play 1.1 section 3), part A5: the panel's rows and costs come from the
// engine (gearCost: 1 AP a hand, 2 for a two-handed draw, drop 0, light armour 1, heavy armour never, Hot-Swap); a row
// is greyed with the engine's reason off-turn or AP short; ammo and throwables are read from the unit, not the stale
// pack; a focus in the pack says it counts only in a hand; and a row's action, sent through apply(), does what it says.
import { describe, expect, it } from 'vitest';
import { apply, magsOf, WEAPON, ITEM, viewFor, type Action, type Character, type GameState, type Unit } from '@engine';
import { storyWith, withGame } from '../../../../packages/engine/test/helpers/perkfight';
import { beginTurn } from '@engine';
import { backpackView, FOCUS_NOTE, HEAVY_ROW, type Backpack } from './backpack';
import { actionGroups } from './commands';

const H = 'host';
const gun = (id: string, extra: any = {}): any => ({ id, name: WEAPON[id].name, qty: 1, kind: 'weapon', weapon: id, ...extra });
const piece = (id: string): any => ({ id, item: id, name: ITEM[id].name, qty: 1, kind: 'tool' });

function fight(perks?: Record<string, string>) {
  const s = storyWith([{ name: 'Rook', kit: 'soldier', ...(perks ? { perks } : {}) }, { name: 'Ash', kit: 'medic' }]);
  const c0 = s.g.characters[s.chars[0].id];
  c0.weapon = 'service_pistol'; c0.weaponState = {}; c0.loaded = 12; c0.offHand = null; c0.worn = { head_accessory: 'night_goggles' };
  c0.pack = [magsOf('service_pistol', 2), gun('drifter_revolver', { loaded: 4 }), gun('hellraiser_service_rifle', { loaded: 20 }), piece('evoker'), piece('field_helmet'), piece('ballistic_helmet'), piece('combat_gloves'), piece('mod_red_dot')];
  s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Gear', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Raider', tier: 'minion', weapon: 'fists', at: '' }] } } } as any);
  const api = {
    get g(): GameState { return s.g; },
    get c(): Character { return s.g.characters[s.chars[0].id]; },
    get u(): Unit { return s.g.combat!.units.find((x) => x.charId === s.chars[0].id)!; },
    act: (a: any) => s.act(a as Action, H),
    turn() { const cb = s.g.combat!; cb.turn = cb.order.indexOf(api.u.id); delete cb.window; withGame(s.g, () => beginTurn(cb, s.g.rng)); return api.u; },
    view: (mine = true): Backpack => backpackView(s.g, s.g.combat, api.u, mine)!,
  };
  api.turn();
  return api;
}
const row = (b: Backpack, sec: string, re: RegExp) => b.sections.find((x) => x.key === sec)!.rows.find((r) => re.test(r.name))!;
const actOf = (r: any, re: RegExp) => r.acts.find((a: any) => re.test(a.label));
const txt = (a: any) => a.label + (a.cost ? ' · ' + a.cost : '');

describe('the backpack in a fight (rules 1.9)', () => {
  it('hands, armour, the pack and the ammo, each with the engine\'s action and cost', () => {
    const f = fight(), b = f.view();
    expect(b.sections.map((x) => x.title)).toEqual(['HANDS', 'ARMOUR', 'BACKPACK', 'AMMO AND THROWABLES']);
    const main = row(b, 'hands', /Service pistol/);
    expect(main.acts.map(txt)).toEqual(['Put away · 1 AP', 'Drop · 0 AP']);
    expect(main.sub).toMatch(/12\/12 loaded/);
    expect(row(b, 'pack', /Drifter revolver/).acts.map(txt)).toEqual(['Draw · 1 AP', 'Off hand · 1 AP']);
    expect(row(b, 'pack', /service rifle/i).acts.map(txt)).toEqual(['Draw · 2 AP · both hands']);
    expect(row(b, 'pack', /Combat gloves/).acts.map(txt)).toEqual(['Put on · 1 AP']);
    expect(row(b, 'pack', /Field helmet/).acts.map(txt)).toEqual(['Put on · 1 AP']); // 1.2 kg: on the 1.2 kg line (item 685)
    expect(row(b, 'pack', /Ballistic helmet/).acts.map(txt)).toEqual([HEAVY_ROW]); // 2 kg: over it
    expect(row(b, 'pack', /Ballistic helmet/).acts[0].off).toBe(true);
    expect(row(b, 'armour', /Night/).acts.map(txt)).toEqual(['Take off · 1 AP']);
    expect(row(b, 'pack', /red dot/i).acts.map(txt)).toEqual(['Fit · 1 AP']);
    // A focus in the pack says it counts only in a hand, and draws into the off hand.
    const evo = row(b, 'pack', /Evoker/); expect(evo.note).toBe(FOCUS_NOTE); expect(evo.acts.map(txt)).toEqual(['Draw · 1 AP · off hand']);
    // Ammo from the unit: the two spare magazines, not the pack's stale numbers.
    expect(row(b, 'ammo', /spare magazines/).sub).toBe('12/12 · 12/12');
  });
  it('reads the unit: a reload and a pick-up show at once (the pack is stale in a fight)', () => {
    const f = fight(); f.u.ammo = 3;
    f.act({ type: 'combat/reload', unitId: f.u.id, tactical: true });
    expect(row(f.view(), 'ammo', /spare magazines/).sub).toBe('12/12 · 3/12');
  });
  it('greys every action off-turn and when AP is short, with the reason', () => {
    const f = fight();
    const off = f.view(false); expect(off.reason).toBe('Not your turn.');
    expect(off.sections.flatMap((s) => s.rows.flatMap((r) => r.acts)).every((a) => a.off && a.why)).toBe(true);
    f.u.ap = 1;
    const rifle = actOf(row(f.view(), 'pack', /service rifle/i), /Draw/);
    expect(rifle.off).toBe(true); expect(rifle.why).toBe('Needs 2 AP.'); expect(rifle.cost).toBe('2 AP · both hands · Needs 2 AP.'); // the reason is on the row, not only in a tooltip
    expect(actOf(row(f.view(), 'hands', /Service pistol/), /Drop/).off).toBe(false); // a drop is 0 AP
  });
  it('review fixes: a refusal reads on the row; a held turn says why; ammo for guns not in hand is listed from the pack', () => {
    const f = fight();
    f.act(actOf(row(f.view(), 'pack', /service rifle/i), /Draw/).action);
    const knifeLess = row(f.view(), 'pack', /Drifter revolver/i), offH = actOf(knifeLess, /Off hand/);
    expect(offH.off).toBe(true); expect(offH.cost).toBe('Your main-hand weapon needs both hands.');
    const held = backpackView(f.g, f.g.combat, f.u, true, 'The other turns are still playing out…')!;
    expect(held.reason).toBe('The other turns are still playing out…'); expect(actOf(row(held, 'hands', /rifle/i), /Drop/).why).toBe('The other turns are still playing out…');
    // The pistol's spare magazines and a stack of rifle rounds now sit in the pack, not in a hand.
    f.c.pack = [...f.c.pack!, { id: 'rounds:.700', name: '.700 rounds', qty: 9, kind: 'ammo', calibre: '.700' } as any];
    const ammo = f.view().sections.find((x) => x.key === 'ammo')!.rows.map((r) => r.name);
    expect(ammo).toContain('2 × ' + WEAPON.service_pistol.name); expect(ammo).toContain('9 × .700 Blackpoint');
  });
  it('a row\'s action does what it says through the engine: draw the rifle (2 AP), drop it (0 AP, into the pile)', () => {
    const f = fight();
    f.act(actOf(row(f.view(), 'pack', /service rifle/i), /Draw/).action);
    expect(f.u.weapon).toBe('hellraiser_service_rifle'); expect(f.u.ap).toBe(4);
    const b = f.view(); expect(row(b, 'hands', /rifle/i).tag).toBe('BOTH HANDS'); expect(row(b, 'hands', /Both hands/).acts).toEqual([]);
    expect(actOf(row(b, 'hands', /rifle/i), /Put away/).cost).toBe('2 AP');
    f.act(actOf(row(b, 'hands', /rifle/i), /Drop/).action);
    expect(f.u.ap).toBe(4); expect(f.c.weapon).toBe('fists');
    expect((f.g.combat!.objects || []).some((o) => o.kind === 'pile' && o.pos === f.u.pos)).toBe(true);
    expect(row(f.view(), 'hands', /Empty/).acts).toEqual([]);
  });
  it('Hot-Swap: the first hand change of the turn reads 0 AP', () => {
    const f = fight({ hot_swap: 'I' });
    const d = actOf(row(f.view(), 'pack', /Drifter/), /^Draw/); expect(d.cost).toBe('0 AP · Hot-Swap');
    f.act(d.action); expect(f.u.ap).toBe(6);
    expect(actOf(row(f.view(), 'pack', /service rifle/i), /Draw/).cost).toBe('2 AP · both hands'); // used this turn
  });
  it('works on a player\'s view; companions and other players\' units get no backpack', () => {
    const f = fight(), v = viewFor(f.g, f.c.owner);
    const b = backpackView(v, v.combat, v.combat!.units.find((x) => x.charId === f.c.id), true)!;
    expect(row(b, 'pack', /Drifter/).acts.length).toBe(2);
    expect(backpackView(f.g, f.g.combat, { ...f.u, companion: true } as any, true)).toBeNull();
  });
  it('the Utility tab no longer offers Hold the Evoker: the backpack replaces it', () => {
    const f = fight();
    const ids = actionGroups(f.g.combat, f.u, f.c, { g: f.g }).flatMap((gr: any) => gr[1].map((i: any) => i[0]));
    expect(ids.some((x: string) => /^hold-/.test(x))).toBe(false);
  });
});
