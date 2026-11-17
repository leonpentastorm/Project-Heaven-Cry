// Rules 1.66 (0.31.6): the outside reviewer's 90-minute report, each lead through the real path (the reducer).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { d20, type Unit } from '../src';
import { fightWith, withGame, storyWith } from './helpers/perkfight';
import { canYield } from '../src/yielding';
import { togglesFor } from '../src/effects/actions';
import { previewDescriptor, actionsFor } from '../src/descriptors';
import { physFight, rig } from './helpers/physfight';
import { calm } from './helpers/physfight-ranged';
import { TECHNIQUE, gearPreview, WEAPONS, RARITY, GEAR, packOf, resolveAttack } from '../src';
import { fightTally, settleTape } from '../src/run/tally';

type F = ReturnType<typeof fightWith>;
const open = (cb: any) => { cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] }; cb.objects = []; };
const sure = (u: Unit) => { u.attack = 60; };
function fight(specs: any[], foes: any[] = [{}]) {
  const f = fightWith(specs, foes.map((x, i) => ({ at: 'E6', ...x, name: x.name || 'Foe ' + (i + 1) })));
  open(f.cb); f.pcs.forEach((u, i) => { if (!u.companion) u.pos = '2,' + (5 + i); });
  f.foes.forEach((u, i) => { u.pos = (4 + i) + ',5'; });
  f.turn(f.pc); f.pc.ap = 9;
  return f;
}
const faithful = (f: F) => { const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'nerukhan' } as any; c.patron = 'nerukhan'; c.devotion = 5; return c; };

describe('A2: can this enemy yield (item 5200, 5201)', () => {
  it('one answer: a drone, a machine, a boss and a no_surrender foe cannot; a soldier can', () => {
    const f = fight([{}], [{}, {}, {}, {}, {}]);
    const [s, d, m, b, n] = f.foes; d.kind = 'drone'; m.kind = 'machine'; b.tier = 'boss'; n.tags = ['no_surrender'];
    expect([s, d, m, b, n].map(canYield)).toEqual([true, false, false, false, false]);
  });
  it('a Spare blow disables a drone: it goes down, no Clean Hands shield, no Mercy vow kept, the log says so', () => {
    const f = fight([{ perks: { clean_hands: 'I' }, skills: { faith: 5 } }], [{}, {}]); sure(f.pc); faithful(f);
    f.act({ type: 'faith/vow', unitId: f.pc.id, id: 'mercy' } as any);
    const drone = f.foe; drone.kind = 'drone'; drone.hp = 1; f.pc.shield = 0;
    f.act({ unitId: f.pc.id, type: 'combat/attack', targetId: drone.id, mode: 'shot', mods: ['spare'] } as any);
    const d = f.unit(drone.id); expect(d.dead).toBe(true); expect(d.surrendered).toBeFalsy();
    expect(f.unit(f.pc.id).shield || 0).toBe(0);
    expect(f.unit(f.pc.id).vow?.state).not.toBe('kept');
    expect(f.cb.log.some((l) => /cannot yield: disabled, no mercy shown/.test(l))).toBe(true);
  });
  it('the Spare toggle\'s preview says a drone cannot yield; a soldier\'s says it is subdued', () => {
    const f = fight([{ perks: { clean_hands: 'I' } }], [{}, {}]); f.foes[1].kind = 'drone';
    const pv = (t: Unit) => withGame(f.g, () => togglesFor({ u: f.pc, c: f.g.characters[f.pc.charId!], cb: f.cb, g: f.g }, 'combat/attack', { action: 'shot', target: t }, [])).find((x) => /spare/.test(x.id))!.preview!;
    expect(pv(f.foes[1])).toMatch(/cannot yield/); expect(pv(f.foes[0])).toMatch(/subdued/);
  });
});
void d20;

describe('A1: Clean Hands (item 5202)', () => {
  it('at most per_fight (2) shields a fight, across turns; the shield is the base shield (the larger stands, no stacking)', () => {
    const f = fight([{ perks: { clean_hands: 'I' } }], [{}, {}, {}, {}]); sure(f.pc);
    const one = Math.floor(Math.floor(f.pc.maxHp * 15 / 100) * (f.pc.shieldRecv || 1));
    for (let i = 0; i < 3; i++) {
      const t = f.foes[i]; f.unit(t.id).hp = 1; f.turn(f.unit(f.pc.id)); f.unit(f.pc.id).ap = 9;
      f.act({ unitId: f.pc.id, type: 'combat/attack', targetId: t.id, mode: 'shot', mods: ['spare'] } as any);
      expect(f.unit(t.id).subdued).toBe(true);
      expect(f.unit(f.pc.id).shield).toBe(one); // the second does not add to the first
    }
    expect(f.cb.log.filter((l) => /keeps clean hands/.test(l)).length).toBe(2);
  });
});

describe('D: the preview price (item 5203)', () => {
  it('a Shot that would kill with Grim Reaper shows its price (2 AP), not the AP the trial run lost (0), and the reducer charges that price', () => {
    const f = fight([{ weapon: 'service_pistol', perks: { grim_reaper: 'I' } }], [{}, {}]); sure(f.pc); f.unit(f.foe.id).hp = 1;
    const none = previewDescriptor(f.g, f.pc.id, 'tq:main:shot', {})!; expect(none.ap).toBe(2); expect(none.cost).toBe('2 AP');
    const pv = previewDescriptor(f.g, f.pc.id, 'tq:main:shot', { targetId: f.foe.id })!;
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(2); expect(pv.cost).toBe('2 AP');
    const before = f.unit(f.pc.id).ap; f.act({ unitId: f.pc.id, ...pv.action } as any);
    expect(f.unit(f.foe.id).dead).toBe(true); expect(f.unit(f.pc.id).ap).toBe(before - 2 + 2); // charged 2, then the kill's +2
  });
});

describe('B: Mag Dump (item 5204)', () => {
  const dump = (weapon: string, hp: number) => {
    const f = physFight([{ weapon, known: ['mag_dump'], skills: { dexterity: 6 } }], [{ at: 'H5', tier: 'soldier' }]);
    f.put(f.pc, 'C5'); f.put(f.foes[0], 'G5'); calm(f); f.turn(f.pc); f.pc.heat = 0;
    f.unit(f.foe.id).hp = hp; f.unit(f.foe.id).maxHp = Math.max(hp, f.unit(f.foe.id).maxHp); rig({ hit: true });
    const a0 = f.unit(f.pc.id).ammo!, n0 = f.cb.log.length;
    try { expect(f.tech('mag_dump', { targetId: f.foe.id })).toBeNull(); } finally { rig(null); }
    const rolls = f.g.combat!.log.slice(n0).filter((l) => /fires at .*d20/.test(l)).length;
    return { f, rolls, spent: a0 - f.unit(f.pc.id).ammo!, heat: f.unit(f.pc.id).heat };
  };
  const N = TECHNIQUE.mag_dump.numbers as any;
  it('a full magazine: max_rolls rolls, each logged with its own to-hit, rounds_per_roll rounds each', () => {
    const r = dump('decrkm_smg', 999); expect(r.rolls).toBe(N.max_rolls); expect(r.spent).toBe(N.max_rolls * N.rounds_per_roll);
  });
  it('the target falls to the first roll: one roll, rounds_per_roll rounds spent, the rest stay in the gun, no Heat to the limit', () => {
    const r = dump('decrkm_smg', 10); expect(r.rolls).toBe(1); expect(r.spent).toBe(N.rounds_per_roll); expect(r.heat).toBeLessThan(5);
  });
});

describe('C: a thrown item from the pack (item 5205)', () => {
  it('a flashbang in the pack is a Throw row on the Attack tab; its preview shows the reach and the blast area; the reducer throws it', () => {
    const f = fight([{}], [{}, {}]); f.unit(f.pc.id).throwables = { flashbang: 1 };
    const row = actionsFor(f.g, f.pc.id).find((d) => d.id === 'throw:flashbang')!;
    expect(row).toBeTruthy(); expect(row.group).toBe('attack'); expect(row.available).toBe(true); expect(row.cost.ap).toBe(2);
    const none = previewDescriptor(f.g, f.pc.id, row.id, {})!;
    expect(none.marks.tiles.some((t) => t.kind === 'reach')).toBe(true); expect(none.ask).toMatch(/Click a tile/);
    const at = f.unit(f.foe.id).pos;
    const pv = previewDescriptor(f.g, f.pc.id, row.id, { tile: at })!;
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(2);
    expect(pv.marks.tiles.filter((t) => t.kind === 'area').length).toBeGreaterThan(1);
    expect(pv.marks.units.some((m) => m.id === f.foe.id && m.tone === 'harm')).toBe(true);
    const ap = f.unit(f.pc.id).ap; f.act(pv.action as any);
    expect(f.unit(f.pc.id).ap).toBe(ap - 2); expect(f.unit(f.pc.id).throwables!.flashbang).toBe(0);
    expect(f.cb.log.some((l) => /throws a flashbang/.test(l))).toBe(true);
    expect(actionsFor(f.g, f.pc.id).some((d) => d.id === 'throw:flashbang')).toBe(false);
  });
});

describe('G3: the gear card numbers (item 5207)', () => {
  it('every weapon at every grade: no number on its card has more than one decimal', () => {
    const f = fight([{ level: 5 }]); const c = f.g.characters[f.pc.charId!]; const bad: string[] = [];
    for (const w of WEAPONS as any[]) for (const r of Object.keys(RARITY)) {
      let p: any; try { p = gearPreview(c, { id: w.id, rarity: r as any }); } catch { continue; }
      for (const l of p.lines || []) if (/\d\.\d\d/.test(String(l.value))) bad.push(w.id + '/' + r + ' ' + l.label + ' ' + l.value);
    }
    expect(bad).toEqual([]);
  });
});

describe('F1: stow the two-hander, hold the focus (item 5208)', () => {
  it('out of a fight: the off hand refuses a focus while a two-hander is held; Stow (gear/unequip main) then Hold (gear/equip off) puts the Emanator in hand', () => {
    const st = storyWith([{ weapon: 'hellraiser_service_rifle' }]); const id = st.chars[0].id;
    let c = st.g.characters[id]; c.pack = [...packOf(c), { id: 'emanator', item: 'emanator', name: 'Emanator', qty: 1, kind: 'gear' } as any];
    const i = packOf(c).findIndex((x: any) => (x.item || x.id) === 'emanator');
    expect(() => st.act({ type: 'gear/equip', charId: id, idx: i, to: 'off' } as any)).toThrow(/both hands/);
    st.act({ type: 'gear/unequip', charId: id, slot: 'main' } as any);
    st.act({ type: 'gear/equip', charId: id, idx: i, to: 'off' } as any);
    c = st.g.characters[id];
    expect(c.offHand?.id).toBe('emanator'); expect(c.weapon === 'fists' || !c.weapon).toBe(true);
    expect(packOf(c).some((x: any) => (x.weapon || x.item || x.id) === 'hellraiser_service_rifle')).toBe(true);
    expect(GEAR.words.stow_first).toMatch(/\{weapon\}.*\{item\}/);
  });
});

describe('G4: the run tally counts what armour and shields soaked and what stims healed (item 5210)', () => {
  it('a foe hit on armour and a shield, then a stim on a hurt ally through the reducer: SOAKED and HEALED are not 0', () => {
    const f = fight([{ name: 'Medic' }, { name: 'Tank' }], [{}]); const cb = f.cb as any; cb.tape = [];
    const tank = f.unit(f.pcs[1].id); tank.armour = 5; tank.shield = 4; tank.pos = '3,5';
    const foe = f.unit(f.foe.id); foe.attack = 60; foe.ap = 9;
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, foe, tank, 'shot', null));
    f.unit(tank.id).hp = Math.max(1, f.unit(tank.id).hp - 30); f.unit(f.pc.id).ap = 9;
    const c = f.g.characters[f.pc.charId!]; c.stims = Math.max(1, c.stims || 0);
    f.act({ type: 'combat/stim', unitId: f.pc.id, targetId: tank.id } as any);
    const cb2: any = f.g.combat!; settleTape(cb2);
    const t = fightTally(cb2.tape, cb2.units, cb2.round || 1);
    expect(t.chars[f.pcs[1].charId!].absorbed, JSON.stringify(cb2.tape) + cb2.log.slice(-4).join('|')).toBeGreaterThanOrEqual(5);
    expect(t.chars[f.pc.charId!].healed).toBeGreaterThan(0);
  });
});
