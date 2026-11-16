// Rules 1.56, a shield in either hand (Leon, 16 Nov 2026: "let the shield be mainhand. So crazy ass double shield mofo
// is a thing"). A shield row's `either_hand` lets it sit in the main hand as a weapon does, one to a hand: shield + focus,
// shield + shield, weapon + shield as before. Each shield's own effects apply as carried; Brace and the Guard technique
// give 1 more Guard per shield held (the pool's cap holds); the Parry bonus and the shield's techniques come once. The
// main hand holding a shield strikes with bare fists. Every change goes through the reducer (gear/equip out of a fight,
// combat/equip in one, combat/brace, combat/technique, combat/perk, combat/draw and combat/evoke, combat/attack).
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, resolveAttack, ITEM, packOf, holds, RuleError, beginTurn, type Character, type Action } from '../src';
import { physFight, rig } from './helpers/physfight';
import { storyWith, withGame } from './helpers/perkfight';

beforeEach(() => rig(null));
const piece = (id: string): any => ({ id, item: id, name: (ITEM as any)[id].name, qty: 1, kind: 'tool' });
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
    expect(refused(() => s.act({ type: 'gear/equip', charId: c0.id, idx: at('evoker'), to: 'main' } as Action))).toBe('Only weapons and shields go in the main hand.');
    s.act({ type: 'gear/unequip', charId: c0.id, slot: 'main' } as Action); // the main hand puts the shield away: bare fists
    c = s.g.characters[c0.id]; expect(c.weapon).toBe('fists'); expect(packOf(c).some((x) => (x.item || x.id) === 'buckler')).toBe(true);
  });
  it('an old save with the shield in the off hand loads and fights unchanged', () => {
    const f = physFight([{ weapon: 'sabre', offHand: 'riot_shield', skills: { durability: 3 } }], [{}]);
    expect(f.char(f.pc).offHand?.id).toBe('riot_shield'); expect(f.pc.offItem).toBe('riot_shield'); expect(f.pc.mainItem).toBeUndefined(); expect(f.pc.weapon).toBe('sabre');
  });
  it('in a fight: 1 AP a hand, shield into the main hand; put away and drop work on it', () => {
    const f = fight(['buckler', 'riot_shield']);
    u(f).ap = 6; f.act({ type: 'combat/equip', unitId: f.pc.id, item: 'buckler', to: 'main' } as any);
    expect(u(f).ap).toBe(5); expect(u(f).mainItem).toBe('buckler'); expect(u(f).weapon).toBe('fists');
    expect(f.cb.log.some((l) => /takes the Buckler in the main hand \(1 AP\)/.test(l))).toBe(true);
    f.act({ type: 'combat/stow', unitId: f.pc.id, slot: 'main' } as any);
    expect(u(f).mainItem ?? null).toBeNull(); expect(f.char(f.pc).weapon).toBe('fists');
  });
});

describe('two shields: each shield\'s own effects add; Guard per Brace +1 a shield, under the pool', () => {
  const stack = (pair: string[]) => {
    const f = fight(pair, { dur: 5 }), base = { def: u(f).def, move: u(f).movement };
    hold(f, pair[0], 'main'); if (pair[1]) hold(f, pair[1], 'off');
    const gain = { brace: f.bound(() => phys.guardGain(u(f), 'brace')), guard: f.bound(() => phys.guardGain(u(f))) };
    guard(f, 0); f.act({ type: 'combat/brace', unitId: f.pc.id } as any);
    return { def: u(f).def - base.def, move: u(f).movement - base.move, brace: gain.brace, braced: guard(f), tech: gain.guard, pool: u(f).resMax!.guard };
  };
  it('the stacks (Durability 5: the pool is rules.guard.max)', () => {
    const G = phys.PHYS_RULES.guard, D = (id: string) => (ITEM as any)[id].effects.find((e: any) => e.op === 'defense_bonus').value;
    const M = (id: string) => (ITEM as any)[id].effects.find((e: any) => e.op === 'movement_bonus')?.value ?? 0;
    const one = stack(['buckler']);
    expect(one).toMatchObject({ def: D('buckler'), brace: G.brace_gain + G.brace_shield_gain });
    for (const pair of [['buckler', 'buckler'], ['buckler', 'riot_shield'], ['riot_shield', 'riot_shield']]) {
      const r = stack(pair);
      expect(r.def, pair.join('+')).toBe(D(pair[0]) + D(pair[1]));
      expect(r.move, pair.join('+')).toBeCloseTo(M(pair[0]) + M(pair[1]), 6);
      expect(r.brace).toBe(G.brace_gain + 2 * G.brace_shield_gain); expect(r.tech).toBe(G.gain_base + 4 * G.gain_per_point + 2 * G.shield_gain);
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

describe('the main hand holding a shield strikes with bare fists; the Open Hand stays off', () => {
  it('a plain attack is the bare-fists fallback (no shield strike is made up)', () => {
    const f = fight(['buckler', 'evoker']); hold(f, 'buckler', 'main'); hold(f, 'evoker', 'off');
    expect(u(f).weapon).toBe('fists');
    rig({ hit: true, die: 12 }); const hp = f.unit(f.foe.id).hp;
    f.act({ type: 'combat/attack', unitId: f.pc.id, targetId: f.foe.id, mode: 'melee' } as any);
    expect(f.unit(f.foe.id).hp).toBeLessThan(hp);
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
    const m = me().mg!; expect(m.evoker).toBe(true); expect(me().mainItem).toBe('buckler');
    me().ap = 9; m.words = ['spark', 'seek']; m.charge = 30; m.flux = 0;
    me().pos = '3,5'; s.act({ type: 'combat/draw', unitId: me().id, word: 'spark', tile: '3,5' } as any);
    me().pos = '2,5'; s.act({ type: 'combat/draw', unitId: me().id, word: 'seek', tile: '2,5' } as any);
    const hp = foe().hp; s.act({ type: 'combat/evoke', unitId: me().id, tile: '2,5', aim: '8,5' } as any);
    expect(cb().log.join(' ')).toMatch(/Evoke|evoke/);
    expect(foe().hp <= hp).toBe(true);
  });
});
