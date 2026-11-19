// The completeness pass, batch 1 (rules 1.3): the branches the first pass left untested, each through the reducer
// (apply) where a player's click or an enemy's turn reaches it: Stonewall against spells, blasts and a second Stonewall,
// and in the attack preview; Eyes in the Back's cover tile taking a shot an enemy missed by its margin; Iron Stomach
// and Nothing Left to Fear in a fight; the area-map Breaching Strike at Tier II; Talks Broke Down II; Soulmate II.
import { describe, expect, it } from 'vitest';
import './helpers/yard16'; // the 16 × 11 practice square these tests name tiles on
import { apply, makeObject, harm, applyDamage, previewAttack, npcsOf, positionsOf, standable, zoneMap, storyObjects, refOf, d20, condOn, type GameState, type Combat, type Unit } from '../src';
import { fightWith, storyWith, withGame } from './helpers/perkfight';

type F = ReturnType<typeof fightWith>;
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const clone = <T>(x: T): T => JSON.parse(JSON.stringify(x));
function rngFor(n: number): { state: number } { for (let s = 1; s < 100000; s++) { const r = { state: s }; if (d20(r) === n) return { state: s }; } throw new Error('no seed'); }
function freeNear(g: GameState, from: string, d: number): string {
  const [x, y] = from.split(',').map(Number), map = zoneMap(g), taken = new Set([...Object.values(positionsOf(g)), ...npcsOf(g).map((n) => n.pos), ...storyObjects(g).map((o) => o.pos)]);
  for (let i = -d; i <= d; i++) for (let j = -d; j <= d; j++) { if (Math.max(Math.abs(i), Math.abs(j)) !== d) continue; const k = (x + i) + ',' + (y + j); if (standable(map, k) && !taken.has(k)) return k; }
  throw new Error('no free tile');
}
/** It is this PC's turn; ending it through the reducer runs the foe's turn next (the order is set so). */
function readyEnemyTurn(f: F, pc: Unit, foe: Unit) {
  const cb = f.cb; cb.order = [pc.id, foe.id, ...cb.order.filter((id) => id !== pc.id && id !== foe.id)];
  f.turn(pc);
}
const clearAround = (cb: Combat) => { cb.objects = []; (cb.map as any).solid = []; };

// (rules 1.56, Balance 2.0: removed with the old effect; docs/design/move-pool.md) describe('Stonewall: spells, blasts

describe('Eyes in the Back: an enemy\'s shot missed by the cover\'s margin hits the cover tile (through the reducer)', () => {
  it('the crate behind you takes the shot', () => {
    const f = fightWith([{ perks: { eyes_in_the_back: 'I' } }, {}], [{ at: 'O10', weapon: 'hellraiser_service_rifle' }]);
    const me = f.pcs[0], other = f.pcs[1], foe = f.foe; clearAround(f.cb);
    me.pos = '5,5'; other.pos = '1,12'; other.hidden = true; foe.pos = '10,5';
    f.cb.objects = [makeObject('cv1', 'crate', '4,5')];
    readyEnemyTurn(f, me, foe);
    const crateHp = f.cb.objects!.find((o) => o.id === 'cv1')!.hp!;
    let stopped = false;
    for (let seed = 1; seed < 400 && !stopped; seed++) {
      const g = clone(f.g); g.rng.state = seed; const after = apply(g, { type: 'combat/end-turn', unitId: me.id } as any, 'host');
      const cb = after.combat!;
      if (cb.log.some((l) => /fires at Tester 1.*stopped by cover/.test(l))) {
        stopped = true;
        const crate = (cb.objects || []).find((o) => o.id === 'cv1');
        expect(!crate || crate.hp! < crateHp).toBe(true);
      }
    }
    expect(stopped).toBe(true);
  });
});

describe('Steady and Nothing Left to Fear in a fight (through the reducer)', () => {
  const fearThenFight = (specs: any[]) => {
    const s = storyWith(specs); const ids = s.chars.map((c) => c.id);
    for (const id of ids) s.act({ type: 'narrator/turn', turn: { narration: 'Dread.', conditions: [{ target: id, id: 'fear' }] } } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard16', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
    return s;
  };
  it('Steady II (Iron Stomach folded in, rules 1.73 item 5811): a Fear carried into the fight lasts 1 round; without it, its full length', () => {
    const s = fearThenFight([{ perks: { steady: 'II' } }, {}]); const cb = s.g.combat!;
    const [me, mate] = cb.units.filter((u) => u.side === 'pc');
    expect(condOn(me, 'fear')).toBe(true); expect((me.conds as any).fear).toBe(1);
    expect((mate.conds as any).fear).toBeGreaterThan(1);
  });
  it('Steady I has no fight half yet (its rule is for the Narrator): a Fear carried in runs its full length; no tier of it makes you immune', () => {
    const s = fearThenFight([{ perks: { steady: 'I' } }]); const me = s.g.combat!.units.find((u) => u.side === 'pc')!;
    expect(condOn(me, 'fear')).toBe(true); expect((me.conds as any).fear).toBeGreaterThan(1);
  });
  it('Nothing Left to Fear: the holder is never Afraid; an Afraid ally steadies at its turn start beside the holder', () => {
    const s = fearThenFight([{ perks: { nothing_left_to_fear: 'mastered' } }, {}]); const cb = s.g.combat!;
    const [me, mate] = cb.units.filter((u) => u.side === 'pc');
    expect(condOn(me, 'fear')).toBe(false);
    // Wherever the ally deployed, put it next to the holder (or it may already have been steadied at the start).
    const m = s.g.combat!.units.find((u) => u.id === mate.id)!, h = s.g.combat!.units.find((u) => u.id === me.id)!;
    if (!condOn(m, 'fear')) m.conds = { ...(m.conds || {}), fear: 2 } as any;
    clearAround(s.g.combat!); h.pos = '5,5'; m.pos = '6,5';
    const c2 = s.g.combat!; c2.order = [h.id, m.id, ...c2.order.filter((id) => id !== h.id && id !== m.id)]; c2.turn = 0; h.ap = 6;
    s.act({ type: 'combat/end-turn', unitId: h.id } as any);
    const after = s.g.combat!.units.find((u) => u.id === mate.id)!;
    expect(condOn(after, 'fear')).toBe(false); expect(logHas(s.g.combat!, /steadies beside .*Nothing Left to Fear/)).toBe(true);
  });
});

describe('Breaching Strike II on the area map; Talks Broke Down II; Soulmate II (batch 1)', () => {
  it('Talks Broke Down II: a lost talk costs nothing, and the first enemy hesitates', () => {
    const s = storyWith([{ perks: { talks_broke_down: 'II' } }]); const c = s.chars[0];
    s.act({ type: 'narrator/turn', turn: { narration: 'Talk.', checks: [{ charId: c.id, skills: ['charisma'], tn: 20, stakes: 'Calm them', tags: ['dialogue'] }] } } as any);
    s.g.rng.state = rngFor(2).state; const ck = s.g.checks.find((k) => !k.done)!; s.act({ type: 'check/roll', checkId: ck.id }); s.act({ type: 'check/accept', checkId: ck.id } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard16', difficulty: 'standard', fromTalk: true, enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
    const cb = s.g.combat!;
    expect(logHas(cb, /Talks broke down .*lost/)).toBe(true); expect(logHas(cb, /hesitates \(Parley\)/)).toBe(true); // rules 1.74 item 6043: renamed
  });
  it('Soulmate II: two bonds; the story harm on either is shared', () => {
    const s = storyWith([{ perks: { soulmate: 'II' }, skills: { camaraderie: 9 } }, {}, {}]); const [a, b, d] = s.chars;
    s.act({ type: 'story/perk', charId: a.id, id: 'soulmate', actionId: 'bond', choice: b.id } as any);
    s.act({ type: 'story/perk', charId: a.id, id: 'soulmate', actionId: 'bond', choice: d.id } as any);
    const hpA = s.g.characters[a.id].hp;
    s.act({ type: 'narrator/turn', turn: { narration: 'Shrapnel.', harm: [{ charId: b.id, amount: 50, why: 'a blast' }, { charId: d.id, amount: 50, why: 'a blast' }] } } as any);
    expect(hpA - s.g.characters[a.id].hp).toBe(20);
  });
});
