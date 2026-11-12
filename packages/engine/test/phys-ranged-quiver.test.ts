// Physical 2.0, ranged: the quiver (rules 1.12, Weapons point 10; Leon, 10 Nov 2026). A Drawn weapon's quiver is filled
// out of a fight from the arrows carried (loadQuiver, the phys/quiver action), each shot names its arrow type (args.ammo,
// default the type with the most left) and that type's rider applies, and a bow can't be reloaded in a fight.
import { describe, it, expect, beforeEach } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { phys, enemyTurn, reload, reloadHands, weaponActions, type Unit, type Character, type PackItem } from '../src';
import { physFight, rig } from './helpers/physfight';
import { calm } from './helpers/physfight-ranged';
import { storyWith } from './helpers/perkfight';
import { condOn } from '../src/magic';
import { loadQuiver, quiverView, ensureQuiver, defaultArrow, arrowId, isDrawn } from '../src/physical/ranged/quiver';

// ---------- helpers (an integrator may move these to helpers/physfight-ranged.ts) ----------
const arrows = (n: number, type?: string): PackItem => ({ id: 'rounds:arrow', name: 'Arrow', qty: n, kind: 'ammo', calibre: 'arrow', ...(type ? { ammoType: type } : {}) });
/** Arrows of a type in a character's pack (standard: no ammoType). */
const carried = (c: Character, type = 'standard') => (c.pack || []).filter((x) => x.calibre === 'arrow' && !x.mags && (x.ammoType || 'standard') === type).reduce((t, x) => t + x.qty, 0);
/** An archer (recurve bow, Dexterity 6) against a soldier; the quiver at fight start is `q` (default: 20 standard). */
function bowFight(q?: Record<string, number>, o: { weapon?: string; known?: string[]; foe?: { tier?: string; weapon?: string } } = {}) {
  const f = physFight([{ weapon: o.weapon || 'recurve_bow', skills: { dexterity: 6 }, known: o.known }], [{ at: 'F5', tier: o.foe?.tier || 'soldier', weapon: o.foe?.weapon }]);
  f.put(f.pc, 'C5'); f.put(f.foe, 'F5'); calm(f);
  if (q) { // as if the fight had started with this load (the count is what the bow holds)
    const u = f.unit(f.pc.id), c = f.char(u); phys.ensurePhys(c).quiver[u.weapon] = { ...q };
    delete u.quiver; delete (u.tech || {})._quiver; u.ammo = Object.values(q).reduce((t, n) => t + n, 0);
    f.bound(() => ensureQuiver(u)); u.ammoType = defaultArrow(u.quiver) === 'standard' ? null : defaultArrow(u.quiver);
  }
  f.turn(f.pc);
  return f;
}
const total = (u: Unit) => Object.values(u.quiver || {}).reduce((t, n) => t + n, 0);
beforeEach(() => rig(null));

describe('loadQuiver (out of a fight)', () => {
  const archer = (pack: PackItem[] = [arrows(10), arrows(5, 'armor_piercing'), arrows(3, 'incendiary')]) => {
    const s = storyWith([{ weapon: 'recurve_bow', skills: { dexterity: 6 } }]); const c = s.g.characters[Object.keys(s.g.characters)[0]];
    c.pack = [...(c.pack || []).filter((x) => x.calibre !== 'arrow'), ...pack.map((x) => ({ ...x }))]; return { s, c };
  };
  it('loads a mix of types from the pack; the bow\'s old arrows go back first', () => {
    const { c } = archer(); // the bow holds 20 standard arrows before any load (today's loaded rounds)
    expect(loadQuiver(c, 'recurve_bow', { standard: 12, armor_piercing: 4 })).toBeNull();
    expect(phys.physOf(c).quiver.recurve_bow).toEqual({ standard: 12, armor_piercing: 4 });
    expect(c.loaded).toBe(16); expect(c.loadedType).toBeNull();
    expect(carried(c)).toBe(10 + 20 - 12); expect(carried(c, 'armor_piercing')).toBe(1); expect(carried(c, 'incendiary')).toBe(3);
  });
  it('a second load returns the first to the pack; unload is the empty load', () => {
    const { c } = archer();
    loadQuiver(c, 'recurve_bow', { standard: 12, armor_piercing: 4 });
    expect(loadQuiver(c, 'recurve_bow', { incendiary: 3, armor_piercing: 5 })).toBeNull();
    expect(carried(c)).toBe(30); expect(carried(c, 'armor_piercing')).toBe(0); expect(carried(c, 'incendiary')).toBe(0);
    expect(loadQuiver(c, 'recurve_bow', {})).toBeNull();
    expect(phys.physOf(c).quiver.recurve_bow).toEqual({}); expect(c.loaded).toBe(0);
    expect(carried(c)).toBe(30); expect(carried(c, 'armor_piercing')).toBe(5); expect(carried(c, 'incendiary')).toBe(3);
  });
  it('accepts the short names of a type (ap, armour_piercing)', () => {
    const { c } = archer();
    expect(loadQuiver(c, 'recurve_bow', { ap: 2, armour_piercing: 1 })).toBeNull();
    expect(phys.physOf(c).quiver.recurve_bow).toEqual({ armor_piercing: 3 });
  });
  it('refuses in plain words, and a refusal changes nothing', () => {
    const { c } = archer(), before = JSON.stringify(c);
    expect(loadQuiver(c, 'crossbow', { standard: 1 })).toBe('The crossbow has no quiver: it loads as it always has.');
    expect(loadQuiver(c, 'longbow', { standard: 1 })).toBe('You don\'t carry a longbow.');
    expect(loadQuiver(c, 'nope', { standard: 1 })).toBe('No such weapon.');
    expect(loadQuiver(c, 'recurve_bow', { glass: 1 })).toBe('No such arrow: glass.');
    expect(loadQuiver(c, 'recurve_bow', { standard: 1.5 })).toBe('Count arrows in whole numbers.');
    expect(loadQuiver(c, 'recurve_bow', { standard: -1 })).toBe('Count arrows in whole numbers.');
    expect(loadQuiver(c, 'recurve_bow', { standard: 20, armor_piercing: 1 })).toBe('The recurve bow\'s quiver holds 20 arrows.');
    expect(loadQuiver(c, 'recurve_bow', { armor_piercing: 6 })).toBe('You carry only 5 armour-piercing arrows.');
    expect(loadQuiver(c, 'recurve_bow', { hollow_point: 1 })).toBe('You carry only 0 hollow-point arrows.');
    expect(JSON.stringify(c)).toBe(before);
  });
  it('a stowed bow loads too: its pack entry holds the count', () => {
    const { c } = archer([arrows(10), arrows(2, 'hollow_point'), { id: 'longbow', name: 'Longbow', qty: 1, kind: 'weapon', weapon: 'longbow' }]);
    expect(loadQuiver(c, 'longbow', { standard: 6, hollow_point: 2 })).toBeNull();
    const e = c.pack!.find((x) => x.weapon === 'longbow')!; expect(e.loaded).toBe(8);
    expect(phys.physOf(c).quiver.longbow).toEqual({ standard: 6, hollow_point: 2 });
    expect(c.loaded).toBeUndefined(); // the bow in hand is untouched
  });
  it('out of a fight the plain reload is refused: the quiver menu fills it, so its types aren\'t lost (review fix)', () => {
    const { s, c } = archer([arrows(10), arrows(5, 'incendiary')]);
    expect(loadQuiver(c, 'recurve_bow', { standard: 5 })).toBeNull();
    expect(() => s.act({ type: 'world/act', charId: c.id, act: 'reload' } as any)).toThrow('Fill the quiver from the quiver menu.');
    const x = s.g.characters[c.id]; expect(x.loaded).toBe(5); expect(phys.physOf(x).quiver.recurve_bow).toEqual({ standard: 5 }); expect(carried(x, 'incendiary')).toBe(5);
  });
  it('through the action: out of a fight it loads; in a fight it is refused', () => {
    const { s, c } = archer();
    s.act({ type: 'phys/quiver', charId: c.id, weaponId: 'recurve_bow', load: { armor_piercing: 5, standard: 15 } } as any);
    expect(phys.physOf(s.g.characters[c.id]).quiver.recurve_bow).toEqual({ armor_piercing: 5, standard: 15 });
    // the fight starts with that load on the unit
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'T', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: '' }] } } } as any);
    const u = s.g.combat!.units.find((x) => x.charId === c.id)!;
    expect(u.quiver).toEqual({ armor_piercing: 5, standard: 15 }); expect(u.ammo).toBe(20); expect(u.ammoType).toBeNull(); // standard has the most
    expect(() => s.act({ type: 'phys/quiver', charId: c.id, weaponId: 'recurve_bow', load: {} } as any)).toThrow('A quiver is filled before the fight.');
  });
});

describe('the quiver in a fight', () => {
  it('a fight starts with the load; with none set, with what the bow holds (20 standard)', () => {
    const f = bowFight(); expect(f.pc.quiver).toEqual({ standard: 20 }); expect(f.pc.ammo).toBe(20);
    const g = bowFight({ standard: 3, incendiary: 7 }); expect(g.pc.quiver).toEqual({ standard: 3, incendiary: 7 }); expect(g.pc.ammoType).toBe('incendiary');
  });
  it('an enemy archer\'s quiver is standard arrows at capacity, and it fires without a character', () => {
    const f = bowFight(undefined, { foe: { weapon: 'longbow' } });
    expect(f.foe.quiver).toEqual({ standard: 20 }); expect(f.foe.ammo).toBe(20);
    expect(isDrawn('crossbow')).toBe(false); const g = bowFight(undefined, { foe: { weapon: 'crossbow' } }); expect(g.foe.quiver).toBeUndefined();
  });
  it('a shot names its arrow: that count falls by one, and its rider applies (armour-piercing ignores armour, ×0.8)', () => {
    const f = bowFight({ standard: 10, armor_piercing: 2 }); rig({ hit: true, die: 12 });
    const plain = f.pv('shot', { targetId: f.foe.id }).attacks[0].pv.dmg!, ap = f.pv('shot', { targetId: f.foe.id, ammo: 'armor_piercing' }).attacks[0].pv.dmg!;
    expect(plain.armour).toBe(5); expect(ap.armour).toBe(0);
    expect(ap.total).toBeCloseTo(plain.total * 0.8, 5);
    const hp = f.foe.hp, a0 = f.pc.ap;
    expect(f.tech('shot', { targetId: f.foe.id, ammo: 'armor_piercing' })).toBeNull();
    expect(f.pc.quiver).toEqual({ standard: 10, armor_piercing: 1 }); expect(f.pc.ammo).toBe(11); expect(f.pc.ap).toBe(a0 - 2);
    expect(hp - f.foe.hp).toBe(Math.max(1, Math.floor(ap.total) - ap.armour));
    expect(f.pc.ammoType).toBeNull(); // the default is back on the string
  });
  it('with none named, the type with the most left goes (and its rider)', () => {
    const f = bowFight({ standard: 2, incendiary: 5 }); rig({ hit: true, die: 12 });
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.quiver).toEqual({ standard: 2, incendiary: 4 });
    expect(phys.pressureOf(f.foe)).toBeGreaterThan(0); // an ordinary hit
    expect(condOn(f.foe, 'burning')).toBeTruthy();
  });
  it('a type with none left is refused, and nothing is spent; an unknown type too', () => {
    const f = bowFight({ standard: 5 }); const a0 = f.pc.ap, before = JSON.stringify(f.cb);
    expect(f.tech('shot', { targetId: f.foe.id, ammo: 'hollow_point' })).toBe('No hollow-point arrows left in the quiver.');
    expect(f.tech('shot', { targetId: f.foe.id, ammo: 'glass' })).toBe('No such arrow.');
    expect(f.pv('shot', { targetId: f.foe.id, ammo: 'hollow_point' }).why).toBe('No hollow-point arrows left in the quiver.');
    expect(f.pc.ap).toBe(a0); expect(JSON.stringify(f.cb)).toBe(before);
  });
  it('an empty quiver can\'t fire: a technique and a plain attack are refused', () => {
    const f = bowFight({ standard: 1 }); rig({ hit: false, die: 5 });
    expect(f.tech('shot', { targetId: f.foe.id })).toBeNull(); expect(f.pc.ammo).toBe(0); expect(f.pc.quiver).toEqual({});
    expect(f.tech('shot', { targetId: f.foe.id })).toBe('The quiver is empty.');
    expect(f.tech('aimed_shot', { targetId: f.foe.id })).toBe('The quiver is empty.');
    expect(() => f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any)).toThrow('The quiver is empty.');
  });
  it('a plain attack (the old Attack button) looses the arrow on the string', () => {
    const f = bowFight({ standard: 1, hollow_point: 3 }); rig({ hit: false, die: 5 });
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
    expect(f.pc.quiver).toEqual({ standard: 1, hollow_point: 2 }); expect(f.pc.ammo).toBe(3);
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'shot' } as any);
    expect(f.pc.quiver).toEqual({ standard: 1, hollow_point: 1 }); expect(f.pc.ammoType).toBeNull(); // a tie: standard first
  });
  it('the preview shows the arrow, equals the action with the same seed, and changes nothing', () => {
    const f = bowFight({ standard: 4, hollow_point: 4 }); rig({ hit: true, die: 13 });
    const before = JSON.stringify(f.cb), pv = f.pv('aimed_shot', { targetId: f.foe.id, ammo: 'hollow_point' });
    expect(JSON.stringify(f.cb)).toBe(before);
    expect(pv.ok).toBe(true); expect(pv.rounds).toBe(1); expect(pv.notes).toContain('Arrow: hollow-point (4 in the quiver).');
    const d = pv.attacks[0].pv.dmg!; expect(d.armour).toBe(10); // hollow-point: armour counts double
    const hp = f.foe.hp;
    expect(f.tech('aimed_shot', { targetId: f.foe.id, ammo: 'hollow_point' })).toBeNull();
    expect(hp - f.foe.hp).toBe(Math.max(1, Math.floor(d.total) - d.armour)); expect(f.pc.quiver).toEqual({ standard: 4, hollow_point: 3 });
  });
  it('a technique that burns more rounds than it rolls (Suppress, 3) takes the named type first, then the most left', () => {
    const f = bowFight({ standard: 6, armor_piercing: 2 }, { known: ['suppress'] }); rig({ hit: false, die: 5 });
    const p0 = phys.pressureOf(f.foe);
    expect(f.tech('suppress', { targetId: f.foe.id, ammo: 'armor_piercing' })).toBeNull();
    expect(f.pc.quiver).toEqual({ standard: 5 }); expect(f.pc.ammo).toBe(5); expect(total(f.pc)).toBe(f.pc.ammo);
    expect(phys.pressureOf(f.foe)).toBe(p0); // Silent: a miss gives none
  });
  it('Suppress can\'t be paid for with 2 arrows: refused with the count', () => {
    const f = bowFight({ standard: 2 }, { known: ['suppress'] });
    expect(f.tech('suppress', { targetId: f.foe.id })).toBe('Needs 3 rounds, 2 loaded.');
  });
  it('no reload in a fight for a Drawn weapon; a crossbow keeps its reload', () => {
    const f = bowFight({ standard: 3 }); const a0 = f.pc.ap;
    expect(() => f.act({ type: 'combat/reload', unitId: f.pc.id } as any)).toThrow('A quiver is filled before the fight.');
    expect(() => f.act({ type: 'combat/reload', unitId: f.pc.id, hand: 'both' } as any)).toThrow('A quiver is filled before the fight.');
    expect(f.pc.ap).toBe(a0); expect(f.pc.quiver).toEqual({ standard: 3 });
    const g = bowFight(undefined, { weapon: 'crossbow' }); expect(g.pc.quiver).toBeUndefined();
    let msg = ''; try { g.act({ type: 'combat/reload', unitId: g.pc.id } as any); } catch (e: any) { msg = String(e.message); }
    expect(msg).not.toMatch(/quiver/);
  });
  it('no path refills it in a fight: Running Reload, Between Heartbeats and Resupply (the engine\'s reload refuses), and the panel says so (review fix)', () => {
    const f = bowFight({ incendiary: 2 }); const u = f.unit(f.pc.id); u.loose = 30;
    expect(f.bound(() => reload(f.cb, u, { free: true }))).toBe('A quiver is filled before the fight.'); // the free reloads (Between Heartbeats, Resupply)
    expect(f.bound(() => reload(f.cb, u))).toBe('A quiver is filled before the fight.');
    expect(f.bound(() => reloadHands(f.cb, u, 'both'))).toBe('A quiver is filled before the fight.');
    expect(weaponActions(u).find((x) => x.id === 'reload')?.why).toMatch(/quiver/);
    expect(u.ammo).toBe(2); expect(u.quiver).toEqual({ incendiary: 2 }); expect(u.ap).toBe(6);
    // Running Reload's toggle: the reload is refused, the move goes, the quiver is untouched
    const g = physFight([{ weapon: 'recurve_bow', skills: { dexterity: 6 }, perks: { running_reload: 'I' } }], [{ at: 'F5' }]); g.put(g.pc, 'C5'); g.put(g.foe, 'F5'); calm(g); g.turn(g.pc);
    const gu = g.unit(g.pc.id); gu.ammo = 2; gu.quiver = { incendiary: 2 }; gu.loose = 30;
    try { g.act({ type: 'combat/move', unitId: gu.id, to: g.tile('C6'), mods: ['perk:running_reload#reload'] } as any); } catch { /* the toggle may be refused outright */ }
    expect(g.unit(gu.id).ammo).toBe(2); expect(g.unit(gu.id).quiver).toEqual({ incendiary: 2 });
    expect(g.cb.log.some((l) => /loads \d+ rounds/.test(l))).toBe(false);
  });
  it('the quiver is written back to the character after the fight', () => {
    const f = bowFight({ standard: 5, incendiary: 2 }); rig({ hit: true, die: 12 });
    f.unit(f.foe.id).hp = 1;
    const cid = f.pc.charId!;
    expect(f.tech('shot', { targetId: f.foe.id, ammo: 'incendiary' })).toBeNull();
    expect(f.g.phase).not.toBe('combat'); // the last foe fell: the fight is over and written back
    const c = f.g.characters[cid];
    expect(phys.physOf(c).quiver.recurve_bow).toEqual({ standard: 5, incendiary: 1 }); expect(c.loaded).toBe(6); expect(c.loadedType).toBeNull();
  });
  it('a bow put away keeps its arrows; drawn again, they come back', () => {
    const f = bowFight({ standard: 4, armor_piercing: 3 }); const u = f.unit(f.pc.id);
    u.weapon = 'longbow'; u.ammo = 5; f.bound(() => ensureQuiver(u));
    expect(u.quiver).toEqual({ standard: 5 }); expect(u.tech!._quiver.by.recurve_bow).toEqual({ standard: 4, armor_piercing: 3 });
    u.weapon = 'recurve_bow'; u.ammo = 7; f.bound(() => ensureQuiver(u));
    expect(u.quiver).toEqual({ standard: 4, armor_piercing: 3 }); expect(u.tech!._quiver.by.longbow).toEqual({ standard: 5 });
    expect(f.bound(() => quiverView(u))).toEqual({ standard: 4, armor_piercing: 3 });
  });
  it('an enemy archer that runs dry punches instead: no reload, no crash', () => {
    const f = bowFight(undefined, { foe: { weapon: 'recurve_bow' } }); const e = f.unit(f.foe.id);
    e.ammo = 0; e.quiver = {}; f.turn(e);
    expect(() => f.bound(() => enemyTurn(f.cb, f.g.rng))).not.toThrow();
    expect(f.cb.log.some((l) => /reloads|loads \d/.test(l) && l.startsWith(e.name))).toBe(false);
    expect(f.unit(e.id).quiver).toEqual({});
  });
  it('an enemy archer\'s shots come out of its quiver', () => {
    const f = bowFight(undefined, { foe: { weapon: 'recurve_bow' } }); const e = f.unit(f.foe.id); f.turn(e); rig({ hit: false, die: 5 });
    f.bound(() => enemyTurn(f.cb, f.g.rng));
    const x = f.unit(e.id); expect(x.ammo).toBeLessThan(20); expect(total(x)).toBe(x.ammo); expect(Object.keys(x.quiver!)).toEqual(['standard']);
  });
  it('a held shot (Overwatch) fires on the enemy\'s turn with the arrow on the string', () => {
    const f = bowFight({ standard: 1, incendiary: 4 }); rig({ hit: false, die: 5 });
    expect(f.tech('overwatch', {})).toBeNull();
    f.turn(f.foe); f.walk(f.foe, 'F6');
    expect(f.pc.quiver).toEqual({ standard: 1, incendiary: 3 }); expect(f.pc.ammo).toBe(4);
  });
  it('a held shot remembers the arrow it named when it was held', () => {
    const f = bowFight({ standard: 3, incendiary: 2 }); rig({ hit: false, die: 5 });
    expect(f.tech('overwatch', { ammo: 'incendiary' })).toBeNull(); expect(f.pc.watch?.ammo).toBe('incendiary');
    f.turn(f.foe); f.walk(f.foe, 'F6');
    expect(f.pc.quiver).toEqual({ standard: 3, incendiary: 1 }); expect(f.pc.ammo).toBe(4);
  });
  it('helpers: arrow ids and the default', () => {
    expect(arrowId('ap')).toBe('armor_piercing'); expect(arrowId('standard')).toBe('standard'); expect(arrowId('glass')).toBeNull();
    expect(defaultArrow({})).toBe('standard'); expect(defaultArrow({ incendiary: 2, hollow_point: 2 })).toBe('hollow_point');
  });
});
