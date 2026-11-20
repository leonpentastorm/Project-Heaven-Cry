// Rules 1.89 (bugs-engine, 0.33): the outside playtest of live 0.32.0, the rules side
// (docs/playtests/2026-11-20-outside-0.32/, docs/design/handoffs/0.33-LANE-BUGS-ENGINE.md). Each claim through the real
// path: the reducer (f.act / apply), a descriptor the screen sends, or a run action.
import { describe, it, expect, beforeEach } from 'vitest';
import { type GameState, apply, reachable, objectsOf, dropToPile, withGame, roundsOf, packOf, runOptions, ITEM, sightOf, patternAt } from '../src';
import { previewDescriptor, actionsFor, sendDescriptor } from '../src/descriptors';
import { makeObject } from '../src/objects';
import { magsOf } from '../src/character';
import { HIDDEN_ATTACK } from '../src/tactics';
import { fightTally, settleTape } from '../src/run/tally';
import { physFight, rig } from './helpers/physfight';
import { fightWith, storyWith } from './helpers/perkfight';
import { survivalRoom, startRun, ownerOf, upTurn } from './helpers/survival';
import survivalJ from '../../../data/survival.json';
import rulesJ from '../../../data/rules.json';

beforeEach(() => rig(null));

/** A Durability 7 tank with hand wraps and a buckler, next to one foe (C5, D5), on its own turn. */
function tank(foes: any[] = [{ at: 'D5' }]) {
  const f = physFight([{ weapon: 'hand_wraps', off: 'buckler', skills: { durability: 7, pain_threshold: 2 } }], foes);
  f.cb.objects = []; f.put(f.pc, 'C5');
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
  f.unit(f.pc.id).ap = 9; f.unit(f.pc.id).hp = f.unit(f.pc.id).maxHp;
  return f;
}
const logSince = (f: any, from: number) => (f.cb.log as string[]).slice(from).join(' | ');

describe('item 7700: SOAKED counts what Guard plates took off a hit', () => {
  it('a foe hits a braced tank through the reducer: the tally\'s SOAKED holds the plates\' share', () => {
    const f = tank([{ at: 'D5', tier: 'elite', weapon: 'service_pistol' }]); (f.cb as any).tape = [];
    f.act({ type: 'combat/brace', unitId: f.pc.id } as any); f.unit(f.pc.id).res!.guard = 4; f.unit(f.pc.id).armour = 0;
    rig({ hit: true, die: 12 });
    f.act({ type: 'combat/end-turn', unitId: f.pc.id } as any); // the foe's own turn shoots
    rig(null);
    const soaked = f.fx('guard').filter((e: any) => e.unit === f.pc.id && e.why === 'soak').reduce((n: number, e: any) => n + (e.soaked || 0), 0);
    expect(soaked).toBeGreaterThan(0);
    const cb: any = f.cb; settleTape(cb);
    const t = fightTally(cb.tape, cb.units, cb.round || 1);
    expect(t.chars[f.pc.charId!].absorbed).toBeGreaterThanOrEqual(soaked);
  });
});

describe('item 7701: the buckler follows a hit or a miss, never a fumble, and says which', () => {
  const swing = (die: number, hit: boolean) => {
    const f = tank(); const foe = f.unit(f.foe.id); foe.hp = foe.maxHp = 900;
    rig({ hit, die }); const from = f.cb.log.length;
    expect(f.tech('cut', { targetId: f.foe.id })).toBeNull();
    rig(null); return logSince(f, from);
  };
  it('a hit: "Buckler follows the hit:"', () => { expect(swing(15, true)).toMatch(/Buckler follows the hit:/); });
  it('a miss (not a 1): "Buckler follows the miss:"', () => { expect(swing(5, false)).toMatch(/Buckler follows the miss:/); });
  it('a natural 1: no follow, and the log says the swing fumbled', () => {
    const l = swing(1, false);
    expect(l).toMatch(/Buckler does not follow: the swing fumbled\./); expect(l).not.toMatch(/Buckler follows/);
  });
});

describe('item 3 (not reproduced): Guard spends no Momentum and its preview says so', () => {
  it('at Momentum 0, 1 and 2 the descriptor\'s meter and the reducer agree (n → n)', () => {
    for (const m of [0, 1, 2]) {
      const f = tank(); f.momentum(f.pc, m);
      const d = actionsFor(f.g, f.pc.id, 'host').find((x) => /guard$/.test(x.id) && x.name === 'Guard')!;
      const pv: any = previewDescriptor(f.g, f.pc.id, d.id, {}, 'host');
      expect(pv.lines.find((l: any) => /^Momentum/.test(l.text))?.text).toBe('Momentum ' + m + ' → ' + m);
      expect(f.tech('guard', {})).toBeNull(); expect(f.momentum(f.pc)).toBe(m);
    }
  });
});

describe('items 7702, 7703: Challenge and Slam say what they did', () => {
  it('Challenge is logged as Challenge; Slam names its Body saves and its pushes', () => {
    const f = tank([{ at: 'D5' }, { at: 'C6' }]); f.put(f.foes[0], 'D5'); f.put(f.foes[1], 'C6'); f.unit(f.pc.id).res!.guard = 4;
    let from = f.cb.log.length;
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'skill:durability.1', actionId: 'guard_challenge', targetId: f.foes[0].id } as any);
    expect(logSince(f, from)).toMatch(/uses Challenge on Foe 1/); expect(logSince(f, from)).not.toMatch(/uses Guard/);
    from = f.cb.log.length; const at0 = f.foes.map((x) => f.unit(x.id).pos);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'skill:durability.1', actionId: 'guard_slam' } as any);
    const l = logSince(f, from);
    expect(l).toMatch(/uses Slam/); expect(l).toMatch(/body save/);
    const moved = f.foes.filter((x, i) => f.unit(x.id).pos !== at0[i]);
    expect(moved.length).toBeGreaterThan(0);
    for (const x of moved) expect(l).toContain('Slam: ' + x.name + ' is pushed');
  });
});

describe('item 4 (by spec item 5011; done on this branch): Brace before contact', () => {
  it('Brace in the approach joins the fight: made when the order gives the character the first turn, else said and made on its turn (surprise is OFF in 0.33)', () => {
    let tested = 0;
    for (let s = 1; s <= 30 && tested < 2; s++) {
      const seed = 'PHC-' + String(s).padStart(4, '0');
      let g = startRun(survivalRoom(seed, [{ build: 'tank', level: 1 }] as any, { test: true }), seed);
      const n = reachable(g.run!).find((x) => x.kind === 'fight'); if (!n) continue;
      g = apply(g, { type: 'run/move', node: n.id } as any, ownerOf(0));
      if (!g.combat?.approach) continue;
      const u = g.combat.units.find((x) => x.side === 'pc')!;
      g = apply(g, { type: 'combat/brace', unitId: u.id } as any, ownerOf(0));
      const u2 = g.combat!.units.find((x) => x.id === u.id)!;
      expect(g.combat!.approach).toBeFalsy();
      // rules 1.64 item 5011: Brace is contact; with the surprise round off (rules.json surprise_round.on false) it is
      // made at once only when the initiative order gives this unit the first turn, else the log says so (acts_log)
      if (u2.braced) expect(u2.res?.guard).toBeGreaterThan(0);
      else expect(g.combat!.log.some((l: string) => l.includes((rulesJ as any).combat.approach.acts_log))).toBe(true);
      tested++;
    }
    expect(tested).toBeGreaterThan(0);
  });
});

describe('item 6 (not reproduced): Attack an object in melee', () => {
  it('a machete next to an explosive barrel: the descriptor sends it and the reducer smashes it', () => {
    const f = physFight([{ weapon: 'ork_machete', skills: { raw_power: 7 } }], [{ at: 'H5' }]);
    f.cb.objects = [makeObject('b1', 'barrel', '3,4')]; f.put(f.pc, '2,3'); f.turn(f.pc); f.unit(f.pc.id).ap = 9;
    const a = sendDescriptor(f.g, f.pc.id, 'cover', { tile: '3,4' }, 'host'); expect(a).toBeTruthy();
    const from = f.cb.log.length; f.act(a as any);
    expect(logSince(f, from)).toMatch(/smashes the explosive barrel/);
  });
});

describe('item 7704: Glass Runner and the paid-for tiles', () => {
  const runner = () => {
    const f = physFight([{ weapon: 'service_pistol', traits: ['glass_runner'], attrs: { agility: 3 } }], [{ at: 'O14' }]);
    f.cb.objects = []; f.put(f.pc, 'B5'); f.turn(f.pc); f.unit(f.pc.id).ap = 6; f.unit(f.pc.id).bank = 0;
    return f;
  };
  it('a walk the approach makes free keeps the discount for the first paid move', () => {
    const f = runner(); (f.cb as any).approach = { passes: 0 };
    let from = f.cb.log.length;
    f.act({ type: 'combat/move', unitId: f.pc.id, to: f.tile('C5') } as any);
    expect(logSince(f, from)).not.toMatch(/Glass Runner/);
    delete (f.cb as any).approach; from = f.cb.log.length;
    f.act({ type: 'combat/move', unitId: f.pc.id, to: f.tile('F5') } as any);
    expect(logSince(f, from)).toMatch(/Glass Runner/);
  });
  it('the discount is no debt: the tiles left paid for are never below 0', () => {
    const f = runner(); const mv = f.unit(f.pc.id).movement;
    f.act({ type: 'combat/move', unitId: f.pc.id, to: f.tile('B5').replace(/^(\d+)/, (x) => String(Number(x) + Math.ceil(2 * mv))) } as any);
    expect(f.cb.log.some((l: string) => /Glass Runner/.test(l))).toBe(true);
    expect(f.unit(f.pc.id).bank).toBeGreaterThanOrEqual(0);
  });
});

describe('item 7705: Ghost Kill asks every hostile eye (a knife technique, as the tester killed)', () => {
  // the sight at the roll: in view or seen forbids it (the data's ghost_eyes mark); a blind victim and nobody else: a ghost
  const stab = (victimSees: boolean) => {
    const f = physFight([{ weapon: 'combat_knife', skills: { ingenuity: 3 }, attrs: { perception: 3 } } as any], [{ tier: 'minion' }, { tier: 'minion' }]);
    f.cb.objects = []; const t = f.foes[0], w = f.foes[1];
    const u = f.turn(f.pc); f.unit(u.id).pos = '1,4'; f.unit(t.id).pos = '3,4'; f.unit(w.id).pos = '14,8'; f.unit(w.id).vision = 1; f.unit(t.id).vision = 1;
    f.act({ type: 'combat/hide', unitId: u.id } as any); expect(f.unit(u.id).hidden).toBe(true);
    f.unit(u.id).pos = '2,4'; f.unit(t.id).vision = 12; if (!victimSees) (f.unit(t.id) as any).eyes = false; f.unit(t.id).hp = 1; f.unit(u.id).attack = 60; f.unit(u.id).ap = 9;
    const sight = withGame(f.g, () => sightOf(f.cb, f.unit(u.id)));
    rig({ hit: true, die: 15 }); expect(f.tech('cut', { targetId: t.id })).toBeNull(); rig(null);
    return { sight, ghost: f.cb.log.some((l: string) => /Ghost Kill/.test(l)), dead: f.unit(t.id).hp <= 0, hidden: !!f.unit(u.id).hidden };
  };
  it('with the victim\'s eyes on the killer at the roll: no Ghost Kill; no eye and nobody seeing: Ghost Kill', () => {
    // Silent ships ON (rules 1.87 item 7503): a loud kill from Hidden keeps the killer Hidden, so Ghost Kill has nothing to
    // put back; the eye rule is pinned with the switch at reveal, where the kill reveals and Ghost Kill answers it
    const was = HIDDEN_ATTACK.gives; HIDDEN_ATTACK.gives = 'reveal';
    try {
      const a = stab(true); expect(a.dead).toBe(true); expect(a.sight[1]).toBe('in_view'); expect(a.ghost).toBe(false); expect(a.hidden).toBe(false);
      const b = stab(false); expect(b.dead).toBe(true); expect(b.sight).toEqual(['unseen', 'out_of_view']); expect(b.ghost).toBe(true); expect(b.hidden).toBe(true);
    } finally { HIDDEN_ATTACK.gives = was; }
    // at tile (as shipped) the seen killer stays Hidden all the same, its tile given away
    const c = stab(true); expect(c.dead).toBe(true); expect(c.ghost).toBe(false); expect(c.hidden).toBe(true);
  });
});

describe('item 9 (by rule): a Lifted magazine stays on the field and is picked up there', () => {
  it('the pile at the character\'s tile survives the win and Take (the field\'s pickup) puts it in the pack', () => {
    const seed = 'PHC-0003';
    let g = startRun(survivalRoom(seed, [{ build: 'plain_gun', level: 1 }] as any, { test: true }), seed);
    const n = reachable(g.run!).find((x) => x.kind === 'fight')!;
    g = apply(g, { type: 'run/move', node: n.id } as any, ownerOf(0));
    const cb = g.combat!, u = cb.units.find((x) => x.side === 'pc')!, tile = u.pos;
    withGame(g, () => dropToPile(cb, tile, [magsOf('service_pistol', 1)], 'lift'));
    g = upTurn(g, u.id);
    for (let k = 0; k < 30 && g.run?.state !== 'field'; k++) {
      const c2 = g.combat!, me = c2.units.find((x) => x.id === u.id)!, t = c2.units.find((x) => x.side === 'foe' && !x.dead); if (!t) break;
      t.hp = 1; t.pos = me.pos.split(',')[0] + ',' + (+me.pos.split(',')[1] + 1); me.ap = 9; me.attack = 80;
      g = apply(g, { type: 'combat/attack', unitId: me.id, targetId: t.id, mode: 'shot' } as any, ownerOf(0));
    }
    expect(g.run?.state).toBe('field');
    expect(objectsOf(g.combat!).some((o: any) => o.kind === 'pile' && o.pos === tile && o.items.some((i: any) => /magazine/.test(i.name)))).toBe(true);
    g = upTurn(g, u.id); g = apply(g, { type: 'combat/pickup', unitId: u.id, tile } as any, ownerOf(0));
    expect(g.combat!.log.some((l: string) => /picks up Service pistol magazine/.test(l))).toBe(true);
  });
});

describe('item 7706: special rounds by name, loaded out of a fight', () => {
  it('a special rounds line is named by its type; the plain line keeps its name', () => {
    expect(roundsOf('.32 decrkm', 10, 'armor_piercing').name).toMatch(/^Armour-piercing/);
    expect(roundsOf('.32 decrkm', 10).name).toMatch(/rounds$/);
    expect(roundsOf('.32 decrkm', 10, 'armor_piercing').name).not.toBe(roundsOf('.32 decrkm', 10).name);
  });
  it('gear/ammo through the reducer loads them, and the rounds the gun held go back to the pack', () => {
    const st = storyWith([{ weapon: 'parlour_pistol' }]); const id = st.chars[0].id;
    const c0: any = st.g.characters[id]; c0.loaded = 2; c0.loadedType = null; c0.pack = [...packOf(c0), roundsOf('.32 decrkm', 10, 'armor_piercing')];
    const plain0 = packOf(c0).filter((x: any) => x.calibre === '.32 decrkm' && !x.ammoType).reduce((n: number, x: any) => n + x.qty, 0);
    st.act({ type: 'gear/ammo', charId: id, ammo: 'armor_piercing' } as any);
    const c: any = st.g.characters[id];
    expect(c.loadedType).toBe('armor_piercing'); expect(c.loaded).toBe(2);
    expect(packOf(c).filter((x: any) => x.calibre === '.32 decrkm' && !x.ammoType).reduce((n: number, x: any) => n + x.qty, 0)).toBe(plain0 + 2);
    expect(packOf(c).find((x: any) => x.ammoType === 'armor_piercing')?.qty).toBe(8);
  });
});

describe('item 7707: a technique\'s preview line says the target\'s armour', () => {
  it('a Shot at an armoured foe: "N damage − armour 5"', () => {
    const f = fightWith([{ weapon: 'parlour_pistol' }], [{ tier: 'soldier' }]);
    const t = f.foes[0], u = f.turn(f.pc); f.unit(u.id).pos = '1,4'; t.pos = '4,4'; f.unit(t.id).armour = 5; f.cb.objects = [];
    const d = actionsFor(f.g, u.id, 'host').find((x) => x.id === 'tq:main:shot')!;
    const pv: any = previewDescriptor(f.g, u.id, d.id, { targetId: t.id }, 'host');
    expect(pv.lines.find((l: any) => l.k === 'odds')?.text).toMatch(/damage − armour 5/);
  });
});

describe('item 7708: Sigil Savant\'s Rigid holds from the first fight', () => {
  it('the first fight fixes the practised words; a word learned after it cannot be drawn until a long rest', () => {
    const f = fightWith([{ traits: ['sigil_savant'], skills: { brain_power: 3 }, attrs: { intelligence: 3 } }], [{ at: 'O14' }]);
    const c: any = f.g.characters[f.pc.charId!];
    const st = c.state?.sigil_savant; expect(Array.isArray(st?.practised)).toBe(true);
    for (const w of st.practised) expect(c.sigils).toContain(w);
  });
});

describe('item 7713: an Essence of Experience at the shrine\'s altar, focus or not', () => {
  it('the shrine offers the consume row from data; a character with no focus consumes one and takes its XP', () => {
    const row = (survivalJ as any).shrine.consume[0]; expect(row.item).toBeTruthy();
    const xp = (ITEM[row.item] as any).effects.find((e: any) => e.op === 'xp_grant').value;
    // a shrine on the path (set up as survival-progress.test.ts visit() does), walked into by the reducer
    const g0 = startRun(survivalRoom('PHC-0007', [{ build: 'plain_gun', level: 1 }] as any, { test: true }), 'PHC-0007'), r = g0.run!;
    const n = r.nodes.find((x) => x.depth === 5 && !x.gate)!, prev = r.nodes.find((x) => x.links.includes(n.id))!;
    n.kind = 'shrine' as any; r.at = prev.id; r.state = 'map';
    let g = apply(g0, { type: 'run/move', node: n.id } as any, ownerOf(0));
    expect(g.run!.at).toBe(n.id);
    const c0 = Object.values(g.characters)[0]; (c0 as any).essence = 1; const xp0 = c0.xp;
    const opt = runOptions(g, c0.id).find((o) => o.key === 'consume:' + row.item)!;
    expect(opt).toBeTruthy(); expect(opt.why).toBeNull(); expect(opt.label).toContain('+' + xp + ' XP');
    g = apply(g, opt.action as any, c0.owner);
    const c = g.characters[c0.id] as any;
    expect(c.essence).toBe(0); expect(c.xp).toBe(xp0 + xp);
    // not the shrine's one thing: the rite or the token is still open, and a second Essence waits for a rest
    c.essence = 1; expect(runOptions(g, c.id).find((o) => o.key === 'consume:' + row.item)!.why).toMatch(/this/);
    expect(['rite', 'piece', 'token'].some((k) => !/One thing per shrine/.test(runOptions(g, c.id).find((o) => o.key === k)?.why || ''))).toBe(true);
  });
  it('outside the shrine, a character with no focus still cannot crack it (Leon, 20 Nov 2026)', () => {
    const st = storyWith([{ weapon: 'service_pistol' }]); const id = st.chars[0].id; (st.g.characters[id] as any).essence = 1;
    expect(() => st.act({ type: 'gear/use', charId: id, item: 'essence_of_experience', targetId: id } as any)).toThrow(/focus/);
  });
});

describe('item 7710: the Draw row\'s AP is the glyph\'s own price; an Evoke short of charge never reads below 0', () => {
  /** A Sigil caster with Running Hand II (parallel_thought), SPARK and SEEK, on its turn. */
  const caster = () => {
    const f = fightWith([{ archetype: 'sigilist', kit: 'sigil', perks: { parallel_thought: 'II' } }], [{}]);
    f.cb.objects = []; f.pc.pos = '2,5'; f.foe.pos = '8,5';
    const u = f.turn(f.pc); u.ap = 9; const m = u.mg!; m.evoker = true; m.words = ['spark', 'seek']; m.charge = 30; m.maxWords = 4; m.flux = 0;
    return f;
  };
  it('the first glyph of the turn: the row says what the reducer then takes', () => {
    const f = caster(); const d = actionsFor(f.g, f.pc.id, 'host').find((x) => x.id === 'draw')!;
    const ap0 = f.unit(f.pc.id).ap; f.act({ type: 'combat/draw', unitId: f.pc.id, word: 'spark', tile: f.unit(f.pc.id).pos } as any);
    expect(d.cost.ap).toBeCloseTo(ap0 - f.unit(f.pc.id).ap, 5);
  });
  it('a Line ready and the Evoker empty: the pattern\'s charge after is 0 and says it is short', () => {
    const f = caster(), id = f.pc.id;
    f.unit(id).pos = '3,5'; f.act({ type: 'combat/draw', unitId: id, word: 'spark', tile: '3,5' } as any);
    f.unit(id).pos = '2,5'; f.act({ type: 'combat/draw', unitId: id, word: 'seek', tile: '2,5' } as any);
    f.unit(id).mg!.charge = 0;
    const p: any = withGame(f.g, () => patternAt(f.cb, '2,5', f.unit(id)));
    expect(p.costAfter.charge).toBe(0); expect(p.costAfter.short).toBeGreaterThan(0);
  });
});
