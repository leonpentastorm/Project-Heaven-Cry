// Rules 1.92 (Items 2.0 step B0): the seams the new rows need, each built from a piece that exists. Everything through the
// real paths: the reducer (gear/equip, combat/technique, combat/reload), a fight's own attack (resolveAttack) and the sheet
// reader (movement, visionOf). The rows used are the typing sheet's own (docs/design/proposals/2026-11-20-items-2.0-rows.json):
// while lane B1 / B2 has not typed one yet, the test puts the sheet's row in place for itself and takes it out after
// (a row already in data is used as it is).
import { describe, it, expect, afterEach } from 'vitest';
import { d20, WEAPON, ITEM, RULES, gearBonus, visionOf, gearEntry, packOf, resolveAttack, reloadAp, itemTags, apply, bindGame, type GameState } from '../src';
import { addItems } from '../src/effects/hooks';
import sheetJ from '../../../docs/design/proposals/2026-11-20-items-2.0-rows.json';
import { storyWith } from './helpers/perkfight';
import { physFight, rig } from './helpers/physfight';

const SHEET: any = sheetJ;
const clean = (r: any) => Object.fromEntries(Object.entries(r).filter(([k]) => !k.startsWith('_')));
const placed: { table: any; id: string }[] = [];
/** The sheet's row for `id` (weapons or items), put in data for this test when lane B has not typed it yet. */
function row(id: string): any {
  const w = SHEET.weapons.find((r: any) => r.id === id), i = SHEET.items.find((r: any) => r.id === id), table: any = w ? WEAPON : ITEM;
  if (!table[id]) { table[id] = clean(w || i); placed.push({ table, id }); addItems('relic', []); }
  return table[id];
}
afterEach(() => { while (placed.length) { const p = placed.pop()!; delete p.table[p.id]; } addItems('relic', []); });
const W = <T,>(g: GameState, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
const HEAVY: any = (RULES as any).weapons_rules.heavy;

describe('rules 1.92 item 8010: the Heavy word', () => {
  it('the data: tag heavy, -0.5 Movement, provisional; the sheet\'s Heavy rows carry the role tag, the riot shield does not', () => {
    expect(HEAVY).toMatchObject({ tag: 'heavy', movement: -0.5, provisional: true });
    expect(itemTags(row('ram_plate').id)).toContain('role:heavy');
    expect(itemTags('riot_shield')).not.toContain('role:heavy');
    expect(SHEET.edits.find((e: any) => e.id === 'pavise').row.tags).toEqual(['heavy']);
  });
  it('a Heavy shield in a hand takes 0.5 Movement; two stack; in the pack, nothing (equipped through the reducer)', () => {
    row('ram_plate'); row('barrier_wall');
    const s = storyWith([{ kit: 'soldier', skills: { athletics: 2 } }]);
    let g = s.g; const id = Object.keys(g.characters)[0], c0 = g.characters[id];
    g = { ...g, characters: { ...g.characters, [id]: { ...c0, offHand: null, pack: [...packOf(c0), gearEntry('ram_plate')!, gearEntry('barrier_wall')!] as any } } };
    // what the one Movement reader adds from gear (character.ts movement reads gearBonus movement_bonus)
    const moveGear = () => W(g, () => gearBonus(g.characters[id], 'movement_bonus'));
    const idx = (w: string) => packOf(g.characters[id]).findIndex((x: any) => x.weapon === w);
    expect(moveGear()).toBe(0); // carried in the pack: nothing
    g = apply(g, { type: 'gear/equip', charId: id, idx: idx('barrier_wall'), to: 'main' } as any, 'host');
    expect(g.characters[id].weapon).toBe('barrier_wall');
    expect(moveGear()).toBe(HEAVY.movement);
    g = apply(g, { type: 'gear/equip', charId: id, idx: idx('ram_plate'), to: 'off' } as any, 'host');
    expect(g.characters[id].offHand?.id).toBe('ram_plate');
    expect(moveGear()).toBe(2 * HEAVY.movement);
  });
  it('the riot shield (not Heavy) keeps its own -0.5 and nothing more', () => {
    const s = storyWith([{ kit: 'soldier' }]); let g = s.g; const id = Object.keys(g.characters)[0], c0 = g.characters[id];
    g = { ...g, characters: { ...g.characters, [id]: { ...c0, pack: [...packOf(c0), gearEntry('riot_shield')!] as any } } };
    g = apply(g, { type: 'gear/equip', charId: id, idx: packOf(g.characters[id]).length - 1, to: 'main' } as any, 'host');
    expect(W(g, () => gearBonus(g.characters[id], 'movement_bonus'))).toBe((WEAPON as any).riot_shield.effects[1].value);
  });
});

describe('rules 1.92 item 8012: the Strike and Ward families, through modifier rows', () => {
  /** A PC with a gladius, its off hand the shield given (drawn through the fight's own gear change), a foe next to it. */
  function fight(off: string) {
    const f = physFight([{ weapon: 'legion_gladius', known: [], skills: { athletics: 4, raw_power: 6, dexterity: 8, durability: 3 } }], [{ tier: 'soldier', weapon: 'service_pistol' } as any]);
    f.cb.objects = []; f.put(f.pc, 'C5');
    const c = f.char(f.pc); c.offHand = null; c.pack = [...(c.pack || []), { ...gearEntry(off)! } as any];
    const foe = f.put(f.foe, 'D5'); foe.hp = foe.maxHp = 900;
    f.cb.order = [f.pc.id, ...f.cb.order.filter((x) => x !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
    const ap = f.unit(f.pc.id).ap; f.unit(f.pc.id).ap = 9; f.act({ type: 'combat/equip', unitId: f.pc.id, item: off, to: 'off' } as any); f.unit(f.pc.id).ap = ap;
    for (const u of f.cb.units) if (u.side === 'pc') u.hp = u.maxHp;
    if (f.pc.resMax?.guard != null) f.pc.res!.guard = 0;
    f.cb.fx = [];
    for (let st = 1; ; st++) { const r = { state: st }; if (Array.from({ length: 12 }, () => d20(r)).every((n) => n !== 1 && n !== 20)) { f.g.rng.state = st; break; } } // no natural 1 or 20 next
    return f;
  }
  const followMults = (f: ReturnType<typeof fight>) => { const pv = f.pv('cut', { targetId: f.foe.id }); const a = pv.attacks.find((x: any) => x.follow)!; return (a.pv as any).dmg.mults.map((m: any) => m.v); };
  it('Strike (spiked buckler): its follow is x0.6 of its blow (the Guard family\'s x0.4 is not there) and a hit gives no Guard', () => {
    row('spiked_buckler');
    expect(row('spiked_buckler').variant_mods).toEqual(['mod_follow_strike']);
    const f = fight('spiked_buckler');
    const m = followMults(f); expect(m).toContain((ITEM as any).mod_follow_strike.effects[0].value); expect(m).not.toContain((ITEM as any).mod_follow_guard.effects[1].value);
    rig({ hit: true }); const g0 = f.unit(f.pc.id).res?.guard ?? 0;
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect((f.fx('melee') as any[]).filter((e) => e.follow)).toHaveLength(1);
    expect(f.unit(f.pc.id).res?.guard ?? 0).toBe(g0); // the main blow and the follow both landed; a Strike follow gives none
    rig(null);
  });
  it('the Guard family\'s buckler, the same blow: its follow gives Guard (the Strike test\'s other half)', () => {
    const f = fight('buckler'); rig({ hit: true }); const g0 = f.unit(f.pc.id).res?.guard ?? 0;
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    expect(f.unit(f.pc.id).res?.guard ?? 0).toBeGreaterThan(g0);
    rig(null);
  });
  it('Ward (deflector): a shot at its holder lands 3 less than at a buckler\'s; a melee blow, the same', () => {
    row('deflector');
    expect(row('deflector').variant_mods).toEqual(['mod_follow_guard', 'mod_ward_light']);
    const soak = -(ITEM as any).mod_ward_light.effects[0].value;
    const taken = (off: string, mode: 'shot' | 'melee') => {
      const f = fight(off); f.turn(f.foe); rig({ hit: true });
      const pc = f.unit(f.pc.id); pc.armour = 0; const hp0 = pc.hp; // no body armour: the soak is seen whole
      f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), pc, mode, null, { noAp: true }));
      rig(null); return hp0 - f.unit(f.pc.id).hp;
    };
    const shotB = taken('buckler', 'shot'), shotW = taken('deflector', 'shot');
    expect(shotB).toBeGreaterThan(soak); expect(shotB - shotW).toBe(soak);
    expect(taken('deflector', 'melee')).toBe(taken('buckler', 'melee'));
  });
});

describe('rules 1.92 items 8022, 8035: a reload a modifier row makes cheaper (cost_mod on the cost trigger)', () => {
  function gunner(gun: string, skills: Record<string, number> = {}) {
    const f = physFight([{ weapon: gun, skills: { dexterity: 6, ...skills } }], [{ tier: 'soldier' }]);
    f.put(f.pc, 'C5'); f.put(f.foe, 'J9'); f.turn(f.pc);
    return f;
  }
  it('an Arsenal gun reloads for 1 AP less than its copy-from row (with_this: its own reload only)', () => {
    row('arsenal_piston_rifle');
    const a = gunner('arsenal_piston_rifle'), b = gunner('hellraiser_service_rifle');
    const apA = a.bound(() => reloadAp(a.unit(a.pc.id), a.cb)), apB = b.bound(() => reloadAp(b.unit(b.pc.id), b.cb));
    expect(apA).toBe(apB + (ITEM as any).mod_line_arsenal.effects[0].value);
    // through the reducer: an empty magazine reloaded costs that
    const u = a.unit(a.pc.id); u.ammo = 0; u.mags = [WEAPON.arsenal_piston_rifle.magazine!]; const ap0 = u.ap;
    a.act({ type: 'combat/reload', unitId: u.id } as any);
    expect(ap0 - a.unit(a.pc.id).ap).toBe(apA);
  });
  it('the siege tube: Raw Power 5 reloads it for 1 AP less (3 to 2); Raw Power 4 does not', () => {
    row('legion_siege_tube');
    const lo = gunner('legion_siege_tube', { raw_power: 4 }), hi = gunner('legion_siege_tube', { raw_power: 5 });
    const ap = (f: ReturnType<typeof gunner>) => f.bound(() => reloadAp(f.unit(f.pc.id), f.cb));
    expect(ap(lo)).toBe(WEAPON.legion_siege_tube.reload_ap); expect(ap(hi)).toBe(ap(lo) - 1);
  });
});

describe('rules 1.92 item 8014: optics and hoods are heard when worn (primitive N4)', () => {
  it('the spotter\'s monocle worn (gear/equip) adds its Vision', () => {
    row('spotters_monocle');
    const s = storyWith([{ kit: 'soldier' }]); let g = s.g; const id = Object.keys(g.characters)[0];
    const base = W(g, () => visionOf(g.characters[id]));
    g = { ...g, characters: { ...g.characters, [id]: { ...g.characters[id], pack: [...packOf(g.characters[id]), { id: 'spotters_monocle', item: 'spotters_monocle', name: "Spotter's monocle", qty: 1, kind: 'tool' }] as any } } };
    g = apply(g, { type: 'gear/equip', charId: id, idx: packOf(g.characters[id]).length - 1, to: 'worn' } as any, 'host');
    expect(g.characters[id].worn?.head_accessory).toBe('spotters_monocle');
    expect(W(g, () => visionOf(g.characters[id]))).toBe(base + (ITEM as any).spotters_monocle.effects[0].value);
  });
});
