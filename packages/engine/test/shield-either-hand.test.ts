// Rules 1.56, a shield in either hand (Leon, 16 Nov 2026: "let the shield be mainhand. So crazy ass double shield mofo
// is a thing"), and rules 1.57 (A1, the lead's ruling of 16 Nov 2026): a shield is a weapons.json row with the Shield
// property, one-handed melee, its own strike line. In the main hand it is simply a weapon; in the off hand it is not a
// second weapon (no +2, no Both block, no paired attack). Each shield's own effects apply as carried; Brace and the
// Guard technique give 1 more Guard per shield held (the pool's cap holds); the Parry bonus and the shield's techniques
// come once, from whichever hand holds a shield. Every change goes through the reducer (gear/equip out of a fight,
// combat/equip in one, combat/brace, combat/technique, combat/perk, combat/draw and combat/evoke, combat/attack).
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, resolveAttack, WEAPON, RARITY, packOf, holds, gearEntry, migrateLoaded, actionsFor, RuleError, beginTurn, type Character, type Action } from '../src';
import { physFight, rig } from './helpers/physfight';
import { storyWith, withGame } from './helpers/perkfight';

beforeEach(() => rig(null));
/** A pack line as the engine makes it (gearEntry: a shield is a weapon line, a focus a focus line). */
const piece = (id: string): any => ({ ...gearEntry(id)! });
const refused = (fn: () => void): string => { try { fn(); } catch (e) { expect(e).toBeInstanceOf(RuleError); return (e as Error).message; } throw new Error('expected a refusal'); };

/** A PC on C5 with nothing in its hands and `pack` in the pack, a foe on D5, the PC's turn with AP to spare. */
function fight(pack: string[], o: { dur?: number; skills?: Record<string, number>; archetype?: string; kit?: string } = {}) {
  const f = physFight([{ weapon: 'fists', archetype: o.archetype, kit: o.kit, skills: { athletics: 4, raw_power: 6, dexterity: 6, durability: o.dur ?? 5, ...(o.skills || {}) } }], [{ tier: 'elite', weapon: 'maul' }]);
  f.cb.objects = [];
  const c = f.char(f.pc); c.offHand = null; c.pack = pack.map(piece); c.armourClass = 0;
  f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'D5'); foe.hp = foe.maxHp = 900;
  f.cb.order = [f.pc.id, ...f.cb.order.filter((id) => id !== f.pc.id)]; f.cb.round = 1; f.turn(f.pc);
  (c as any).phys.answers = phys.TECHNIQUES.filter((t: any) => t.group === 'answer').map((t: any) => t.id);
  return f;
}
type F = ReturnType<typeof fight>;
const u = (f: F) => f.unit(f.pc.id);
/** Take a pack line into a hand with the fight's own gear change (1 AP a hand). */
const hold = (f: F, id: string, to: 'main' | 'off') => { u(f).ap = 9; f.act({ type: 'combat/equip', unitId: f.pc.id, item: id, to } as any); };
const guard = (f: F, n?: number) => { const x = u(f); if (n != null) x.res!.guard = n; return x.res?.guard ?? 0; };

describe('equip: a shield goes in either hand, one to a hand', () => {
  it('out of a fight (the sheet\'s gear/equip): shield main + Evoker off, shield + shield; a focus still refuses the main hand', () => {
    const s = storyWith([{ name: 'Wall' }]);
    const c0 = s.g.characters[s.chars[0].id]; c0.weapon = 'fists'; c0.weaponState = {}; c0.offHand = null; c0.pack = ['buckler', 'riot_shield', 'evoker'].map(piece);
    const at = (id: string) => packOf(s.g.characters[c0.id]).findIndex((x) => (x.item || x.id) === id);
    s.act({ type: 'gear/equip', charId: c0.id, idx: at('buckler'), to: 'main' } as Action);
    s.act({ type: 'gear/equip', charId: c0.id, idx: at('evoker'), to: 'off' } as Action);
    let c: Character = s.g.characters[c0.id];
    expect(c.weapon).toBe('buckler'); expect(c.offHand?.id).toBe('evoker');
    expect(refused(() => s.act({ type: 'gear/equip', charId: c0.id, idx: at('riot_shield'), to: 'worn' } as Action))).toBe('That isn\'t slot armour.');
    s.act({ type: 'gear/equip', charId: c0.id, idx: at('riot_shield'), to: 'off' } as Action); // the Evoker goes back to the pack
    c = s.g.characters[c0.id];
    expect([c.weapon, c.offHand?.id]).toEqual(['buckler', 'riot_shield']); expect(packOf(c).some((x) => (x.item || x.id) === 'evoker')).toBe(true);
    expect(refused(() => s.act({ type: 'gear/equip', charId: c0.id, idx: at('evoker'), to: 'main' } as Action))).toBe('Only weapons go in the main hand.');
    s.act({ type: 'gear/unequip', charId: c0.id, slot: 'main' } as Action); // the main hand puts the shield away: bare fists
    c = s.g.characters[c0.id]; expect(c.weapon).toBe('fists'); expect(packOf(c).some((x) => (x.item || x.id) === 'buckler')).toBe(true);
  });
  it('an old save with the shield in the off hand loads and fights unchanged: the off-hand shield is not a second weapon', () => {
    const f = physFight([{ weapon: 'sabre', offHand: 'riot_shield', skills: { durability: 3 } }], [{}]);
    expect(f.char(f.pc).offHand?.id).toBe('riot_shield'); expect(f.pc.offItem).toBe('riot_shield'); expect(f.pc.offWeapon ?? null).toBeNull(); expect(f.pc.weapon).toBe('sabre');
  });
  it('rules 1.57 (A1): an old save\'s shield pack line (an item line) loads as the weapon line it is now, its grade and wear kept, and equips', () => {
    const s = storyWith([{ name: 'Wall' }]);
    const c0 = s.g.characters[s.chars[0].id]; c0.weapon = 'fists'; c0.weaponState = {}; c0.offHand = null;
    c0.pack = [{ id: 'buckler', item: 'buckler', name: 'Buckler', qty: 1, kind: 'tool', rarity: 'fine', dur: 90 } as any, { id: 'riot_shield', item: 'riot_shield', name: 'Legion riot shield', qty: 1, kind: 'tool' } as any];
    const pile = { id: 'pile-1', kind: 'pile', pos: '3,3', name: 'Pile', text: '', approaches: [], items: [{ item: 'buckler', qty: 1, key: 'k1', pack: { id: 'buckler', item: 'buckler', name: 'Buckler', qty: 1, kind: 'tool' } }] };
    (s.g.story as any).objects = [...((s.g.story as any).objects || []), pile];
    const g = migrateLoaded(JSON.parse(JSON.stringify(s.g)));
    const pk = packOf(g.characters[c0.id]);
    expect(pk[0]).toMatchObject({ id: 'buckler', kind: 'weapon', weapon: 'buckler', rarity: 'fine', dur: 90 }); expect((pk[0] as any).item).toBeUndefined();
    expect(pk[1]).toMatchObject({ id: 'riot_shield', kind: 'weapon', weapon: 'riot_shield' });
    expect(((g.story as any).objects.find((o: any) => o.id === 'pile-1').items[0].pack)).toMatchObject({ kind: 'weapon', weapon: 'buckler' });
    // a save from 0.29 on (weapon lines already) loads as it was
    expect(JSON.stringify(migrateLoaded(JSON.parse(JSON.stringify(g))))).toBe(JSON.stringify(g));
    // and the migrated line equips through the reducer
    s.g = g as any; s.act({ type: 'gear/equip', charId: c0.id, idx: 0, to: 'off' } as Action);
    expect(s.g.characters[c0.id].offHand).toMatchObject({ id: 'buckler', rarity: 'fine', dur: 90 });
  });
  it('in a fight: 1 AP a hand, shield into the main hand (the unit\'s weapon); put away works on it', () => {
    const f = fight(['buckler', 'riot_shield']);
    u(f).ap = 6; f.act({ type: 'combat/equip', unitId: f.pc.id, item: 'buckler', to: 'main' } as any);
    expect(u(f).ap).toBe(5); expect(u(f).weapon).toBe('buckler');
    expect(f.cb.log.some((l) => /draws the Buckler \(1 AP\)/.test(l))).toBe(true);
    f.act({ type: 'combat/stow', unitId: f.pc.id, slot: 'main' } as any);
    expect(u(f).weapon).toBe('fists'); expect(f.char(f.pc).weapon).toBe('fists');
  });
});

describe('two shields: each shield\'s own effects add; Guard: +1 with one shield, every gain x two_shield_mult with two (rules 1.59 T4), under the pool', () => {
  const stack = (pair: string[]) => {
    const f = fight(pair, { dur: 5 }), base = { def: u(f).def, move: u(f).movement };
    hold(f, pair[0], 'main'); if (pair[1]) hold(f, pair[1], 'off');
    const gain = { brace: f.bound(() => phys.guardGain(u(f), 'brace')), guard: f.bound(() => phys.guardGain(u(f))) };
    guard(f, 0); f.act({ type: 'combat/brace', unitId: f.pc.id } as any);
    return { def: u(f).def - base.def, move: u(f).movement - base.move, brace: gain.brace, braced: guard(f), tech: gain.guard, pool: u(f).resMax!.guard };
  };
  it('the stacks (Durability 5: the pool is rules.guard.max)', () => {
    const G = phys.PHYS_RULES.guard, D = (id: string) => (WEAPON as any)[id].effects.find((e: any) => e.op === 'defense_bonus').value;
    const M = (id: string) => (WEAPON as any)[id].effects.find((e: any) => e.op === 'movement_bonus')?.value ?? 0;
    const one = stack(['buckler']);
    expect(one).toMatchObject({ def: D('buckler'), brace: G.brace_gain + G.brace_shield_gain });
    for (const pair of [['buckler', 'buckler'], ['buckler', 'riot_shield'], ['riot_shield', 'riot_shield']]) {
      const r = stack(pair);
      expect(r.def, pair.join('+')).toBe(D(pair[0]) + D(pair[1]));
      expect(r.move, pair.join('+')).toBeCloseTo(M(pair[0]) + M(pair[1]), 6);
      expect(r.brace).toBe(G.brace_gain * G.two_shield_mult); expect(r.tech).toBe((G.gain_base + 4 * G.gain_per_point) * G.two_shield_mult);
      expect(r.braced).toBe(Math.min(r.pool, r.brace)); expect(r.pool).toBe(G.max);
    }
  });
  it('the pool\'s cap holds: Durability 3 with two shields braces to 3', () => {
    const f = fight(['buckler', 'buckler'], { dur: 3 }); hold(f, 'buckler', 'main'); hold(f, 'buckler', 'off');
    guard(f, 0); f.act({ type: 'combat/brace', unitId: f.pc.id } as any); expect(guard(f)).toBe(3);
  });
  it('the shield\'s techniques come once (one grant), and the Parry bonus once', () => {
    const f = fight(['buckler', 'riot_shield']); hold(f, 'buckler', 'main'); hold(f, 'riot_shield', 'off');
    const ids = f.pad(f.pc, 'off').flatMap((g) => g.entries.map((e) => e.id));
    for (const id of ['shield_bash', 'raise_shield', 'shield_wall']) expect(ids.filter((x) => x === id), id).toEqual([id]);
    expect(f.pad(f.pc, 'main').flatMap((g) => g.entries.map((e) => e.id))).not.toContain('shield_bash');
  });
});

describe('rules 1.57 (A1): the main hand holding a shield strikes with the shield\'s own line; the Open Hand stays off', () => {
  it('a plain attack is the shield\'s blow: its row, hitting with the skill it hits with (Durability), and it wears', () => {
    const lo = fight(['buckler', 'evoker'], { dur: 5 }); hold(lo, 'buckler', 'main');
    const hi = fight(['buckler', 'evoker'], { dur: 9 }); hold(hi, 'buckler', 'main');
    expect(u(lo).weapon).toBe('buckler'); expect((WEAPON as any).buckler.phys.hits_with).toBe('durability');
    expect(u(hi).attack - u(lo).attack).toBe(4); // Durability 5 to 9: its modifier 4 to 8
    const f = lo; hold(f, 'evoker', 'off');
    rig({ hit: true, die: 12 }); const hp = f.unit(f.foe.id).hp, d0 = u(f).dur!;
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'melee' } as any);
    expect(f.unit(f.foe.id).hp).toBeLessThan(hp); expect(u(f).dur!).toBeLessThan(d0);
  });
  it('the Open Hand\'s hands rule (only the family\'s gloves, or none) fails with a shield in either hand', () => {
    const only = { hands: { props: ['open_hand'], only: true } };
    const f = fight(['buckler', 'riot_shield']); expect(holds(f.char(f.pc), only)).toBe(true); // empty hands: on
    hold(f, 'buckler', 'main'); expect(holds(f.char(f.pc), only)).toBe(false);
    f.act({ type: 'combat/stow', unitId: f.pc.id, slot: 'main' } as any); hold(f, 'riot_shield', 'off'); expect(holds(f.char(f.pc), only)).toBe(false);
  });
});

describe('Durability\'s door works with shield main + focus off and with two shields', () => {
  for (const pair of [['buckler', 'evoker'], ['buckler', 'riot_shield']]) it(pair.join(' + ') + ': Brace, a blow soaked by Guard, Slam, Shield Bash', () => {
    const f = fight(pair, { dur: 5 }); hold(f, pair[0], 'main'); hold(f, pair[1], 'off');
    guard(f, 0); f.act({ type: 'combat/brace', unitId: f.pc.id } as any); const g0 = guard(f); expect(g0).toBeGreaterThan(0);
    // the foe's blow, as its turn makes it: Guard soaks some of it
    f.turn(f.foe); rig({ hit: true, die: 12 });
    f.bound(() => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), u(f), 'melee', null, { noAp: true })); rig(null);
    expect(guard(f)).toBeLessThan(g0);
    f.turn(f.pc); guard(f, 4); u(f).ap = 9;
    rig({ hit: true, die: 12 }); expect(f.tech('shield_bash', { targetId: f.foe.id })).toBeNull(); rig(null); // bare fists behind the shield
    expect(guard(f)).toBe(3); // 1 Guard in place of the Momentum
    f.put(f.foe, 'D5'); guard(f, 4);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'skill:durability.1', actionId: 'guard_slam' } as any);
    expect(guard(f)).toBe(2); // Slam's 2 Guard
    f.put(f.foe, 'D5'); f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'skill:durability.1', actionId: 'guard_challenge' } as any);
    expect(guard(f)).toBe(1); // Challenge's 1 Guard
  });
});

describe('a Sigil drawn and Evoked with the Evoker in the off hand and a shield in the main hand', () => {
  it('the Evoker counts in the off hand; draw, draw, Evoke', () => {
    const s = storyWith([{ name: 'Glyph', archetype: 'sigilist', kit: 'sigil' }]);
    const c0 = s.g.characters[s.chars[0].id]; c0.pack = [...packOf(c0), piece('buckler')];
    s.act({ type: 'gear/equip', charId: c0.id, idx: packOf(c0).findIndex((x) => (x.item || x.id) === 'buckler'), to: 'main' } as Action);
    expect([s.g.characters[c0.id].weapon, s.g.characters[c0.id].offHand?.id]).toEqual(['buckler', 'evoker']);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'Sigil', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Target', tier: 'soldier', weapon: 'service_pistol', at: '' }] } } } as any);
    const cb = () => s.g.combat!, me = () => cb().units.find((x) => x.side === 'pc')!, foe = () => cb().units.find((x) => x.side === 'foe')!;
    cb().map = { ...cb().map, cover: [], full: [], solid: [], difficult: [] }; cb().objects = [];
    me().pos = '2,5'; foe().pos = '8,5'; foe().hp = foe().maxHp = 5000; foe().def = 1;
    cb().turn = cb().order.indexOf(me().id); delete cb().window;
    withGame(s.g, () => beginTurn(cb(), s.g.rng));
    const m = me().mg!; expect(m.evoker).toBe(true); expect(me().weapon).toBe('buckler');
    me().ap = 9; m.words = ['spark', 'seek']; m.charge = 30; m.flux = 0;
    me().pos = '3,5'; s.act({ type: 'combat/draw', unitId: me().id, word: 'spark', tile: '3,5' } as any);
    me().pos = '2,5'; s.act({ type: 'combat/draw', unitId: me().id, word: 'seek', tile: '2,5' } as any);
    const hp = foe().hp; s.act({ type: 'combat/evoke', unitId: me().id, tile: '2,5', aim: '8,5' } as any);
    expect(cb().log.join(' ')).toMatch(/Evoke|evoke/);
    expect(foe().hp <= hp).toBe(true);
  });
});

describe('rules 1.56 item 7: fixes before release (items 4314 to 4317)', () => {
  it('Swap hands with a shield in the main hand carries the shield to the off hand (it was lost)', () => {
    const f = fight(['buckler']); f.char(f.pc).pack!.push({ id: 'service_pistol', weapon: 'service_pistol', name: 'Service Pistol', qty: 1, kind: 'weapon' } as any); hold(f, 'buckler', 'main'); hold(f, 'service_pistol', 'off');
    expect([f.char(f.pc).weapon, f.char(f.pc).offHand?.id]).toEqual(['buckler', 'service_pistol']);
    u(f).ap = 9; f.act({ type: 'combat/swap', unitId: f.pc.id, from: 'off' } as any);
    const c = f.char(f.pc);
    expect([c.weapon, c.offHand?.id]).toEqual(['service_pistol', 'buckler']);
    expect(u(f).weapon).toBe('service_pistol'); expect(u(f).offItem).toBe('buckler');
  });
  it('rules 1.57 (A1, replaces item 4315): a main-hand shield is a graded weapon: its grade gives its accuracy and damage, and its own wear is written back', () => {
    const at = (rarity?: string) => { const f = fight([]); f.char(f.pc).pack = [{ ...piece('buckler'), ...(rarity ? { rarity } : {}) }]; hold(f, 'buckler', 'main'); return f; };
    const std = at(), mw = at('masterwork');
    expect(u(mw).attack - u(std).attack).toBe(RARITY.masterwork.acc - RARITY.standard.acc); expect(u(mw).dmgMult).toBe(RARITY.masterwork.dmg);
    rig({ hit: true, die: 12 }); mw.act({ type: 'combat/attack', unitId: mw.pc.id, targetId: mw.foe.id, mode: 'melee' } as any); rig(null);
    const worn = u(mw).dur!; expect(worn).toBeLessThan(u(mw).maxDur!);
    mw.act({ type: 'combat/stow', unitId: mw.pc.id, slot: 'main' } as any);
    const line = packOf(mw.char(mw.pc)).find((x) => (x.weapon || x.id) === 'buckler')!;
    expect(line.rarity).toBe('masterwork'); expect(line.dur).toBe(worn);
  });
  it('Pull Out asks a free hand: a shield in the main hand and a focus in the off hand refuse it before the AP is paid', () => {
    const f = physFight([{ weapon: 'combat_knife', known: ['throw'], skills: { athletics: 6, raw_power: 4, dexterity: 6 } }], [{ tier: 'soldier' }], { seed: 'T1' });
    f.cb.objects = []; f.put(f.pc, 'C5'); const foe = f.put(f.foe, 'F5'); foe.hp = foe.maxHp = 900;
    f.turn(f.pc); rig({ hit: true, die: 12 }); expect(f.tech('throw', { targetId: f.foe.id })).toBeNull(); rig(null);
    expect((f.unit(f.foe.id).stuck || []).length).toBe(1);
    const c = f.char(f.pc); c.offHand = null; c.pack = [...packOf(c), piece('buckler'), piece('evoker')];
    f.unit(f.pc.id).ap = 9; f.act({ type: 'combat/equip', unitId: f.pc.id, item: 'buckler', to: 'main' } as any);
    f.act({ type: 'combat/equip', unitId: f.pc.id, item: 'evoker', to: 'off' } as any);
    f.put(f.pc, 'E5'); const ap0 = f.unit(f.pc.id).ap;
    expect(f.tech('pull_out', { targetId: f.foe.id })).toMatch(/Free a hand first/);
    expect(f.unit(f.pc.id).ap).toBe(ap0); expect((f.unit(f.foe.id).stuck || []).length).toBe(1);
  });
  it('rules 1.57 (A1, the lead\'s ruling; replaces item 4317): the pavise is a shield row too: carried it is a shield (Parry, the techniques), with no Defense of its own', () => {
    const f = fight(['pavise', 'buckler']); const d0 = u(f).def; hold(f, 'pavise', 'off');
    expect(holds(f.char(f.pc), { hands: { props: ['shield'] } })).toBe(true); expect(u(f).def).toBe(d0); expect(u(f).offItem).toBe('pavise');
    expect(f.pad(f.pc, 'off').flatMap((g) => g.entries.map((e) => e.id))).toContain('shield_bash');
  });
});

describe('rules 1.57 (A1): the hand pairs (the lead\'s rulings of 16 Nov 2026)', () => {
  const attackIds = (f: F) => withGame(f.g, () => actionsFor(f.g, f.pc.id)).filter((d: any) => d.group === 'attack').map((d: any) => d.id);
  it('main shield + an ordinary one-handed weapon in the off hand: ordinary dual wielding (the off weapon asks the +2), and the shield techniques from the main hand (item 4313 closed)', () => {
    const f = fight(['buckler', 'sabre'], { skills: { dexterity: 1 } });
    hold(f, 'buckler', 'main');
    // the sabre beside a main-hand shield is a second weapon: Dexterity 1 cannot hold it there (its requirement + 2)
    expect(() => hold(f, 'sabre', 'off')).toThrow(/A second weapon asks more/);
    f.char(f.pc).skills.dexterity = 6; hold(f, 'sabre', 'off');
    expect([u(f).weapon, u(f).offWeapon]).toEqual(['buckler', 'sabre']);
    const main = f.pad(f.pc, 'main').flatMap((g) => g.entries.map((e) => e.id));
    for (const id of ['shield_bash', 'raise_shield']) expect(main, id).toContain(id);
    expect(f.pad(f.pc, 'off').flatMap((g) => g.entries.map((e) => e.id))).not.toContain('shield_bash');
    expect(attackIds(f)).toContain('paired'); // the Both block
    guard(f, 4); u(f).ap = 9; rig({ hit: true, die: 12 }); expect(f.tech('shield_bash', { targetId: f.foe.id })).toBeNull(); rig(null); // from the main hand
    expect(guard(f)).toBe(3);
  });
  it('an off-hand shield is not a second weapon: no +2 asked, no Both block, no paired attack', () => {
    const f = fight(['sabre', 'buckler'], { dur: 0 });
    hold(f, 'sabre', 'main'); hold(f, 'buckler', 'off'); // Durability 0: no +2 asked of a shield
    expect([u(f).weapon, u(f).offWeapon ?? null, u(f).offItem]).toEqual(['sabre', null, 'buckler']);
    expect(attackIds(f)).not.toContain('paired');
    expect(() => f.act({ type: 'combat/paired', unitId: f.pc.id, targetId: f.foe.id } as any)).toThrow(/Nothing in your off hand to attack with/);
  });
  it('Shield Bash strikes with the off-hand shield\'s own row (its line, Durability), not the bare hand', () => {
    const run = (dur: number) => { const f = fight(['sabre', 'riot_shield'], { dur }); hold(f, 'sabre', 'main'); hold(f, 'riot_shield', 'off'); guard(f, 4); u(f).ap = 9; return f; };
    const lo = run(3), hi = run(9);
    const pct = (f: F) => (f.pv('shield_bash', { targetId: f.foe.id, hand: 'off' } as any).attacks[0] as any).pv.pct;
    expect(pct(hi)).toBeGreaterThan(pct(lo)); // Durability, the skill the shield hits with
    rig({ hit: true, die: 12 }); expect(lo.tech('shield_bash', { targetId: lo.foe.id, hand: 'off' } as any)).toBeNull(); rig(null);
    expect(guard(lo)).toBe(3);
  });
});

describe('rules 1.57 (A1): the Proving Ground gives a shield into the off hand, as before it was a weapon row', () => {
  it('sandbox/give a sabre then a buckler, equip: the sabre in the main hand, the buckler in the off hand', async () => {
    const { newGame, apply } = await import('../src');
    let g = newGame('SHIELDPG', { id: 'host', name: 'Host' }, 'seed-shield');
    g = apply(g, { type: 'sandbox/start' } as any, 'host');
    const c = Object.values(g.characters).find((x) => x.owner === 'host')!;
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'sabre', equip: true } as any, 'host');
    g = apply(g, { type: 'sandbox/give', charId: c.id, item: 'buckler', equip: true } as any, 'host');
    expect([g.characters[c.id].weapon, g.characters[c.id].offHand?.id]).toEqual(['sabre', 'buckler']);
  });
});
