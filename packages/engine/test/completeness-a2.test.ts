// The completeness pass, batch 1 (rules 1.3): the branches the first pass left untested, each through the reducer
// (apply) where a player's click or an enemy's turn reaches it: Bulwark against spells, blasts and a second Bulwark,
// and in the attack preview; Eyes in the Back's cover tile taking a shot an enemy missed by its margin; Iron Stomach
// and Nothing Left to Fear in a fight; the area-map Breaching Strike at Tier II; Talks Broke Down II; Soulmate II.
import { describe, expect, it } from 'vitest';
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

describe('Bulwark: spells, blasts, two guards, the preview (batch 1)', () => {
  it('an enemy\'s shot on its turn (through the reducer) at the ally behind the guard is cut', () => {
    const f = fightWith([{ perks: { bulwark: 'II' } }, {}], [{ at: 'O10', weapon: 'hellraiser_service_rifle' }]);
    const [guard, ally] = f.pcs, foe = f.foe; clearAround(f.cb);
    foe.pos = '2,5'; guard.pos = '5,5'; ally.pos = '7,5'; ally.hp = 40; guard.hp = guard.maxHp; // the foe shoots the lowest HP
    readyEnemyTurn(f, guard, foe);
    let hitSeen = false;
    for (let seed = 1; seed < 60 && !hitSeen; seed++) {
      const g = clone(f.g); g.rng.state = seed; const after = apply(g, { type: 'combat/end-turn', unitId: guard.id } as any, 'host');
      const cb = after.combat!; if (cb.log.some((l) => /fires at Tester 2.*hit/.test(l))) { hitSeen = true; expect(logHas(cb, /Bulwark\): Tester 2 takes 50% less/)).toBe(true); }
    }
    expect(hitSeen).toBe(true);
  });
  it('Sigil, Soul and Elemental damage from a caster at range is cut; from an adjacent caster it isn\'t', () => {
    for (const type of ['sigil', 'soul', 'elemental'] as const) {
      const f = fightWith([{ perks: { bulwark: 'I' } }, {}], [{ at: 'O10' }]);
      const [guard, ally] = f.pcs, foe = f.foe; clearAround(f.cb);
      foe.pos = '2,5'; guard.pos = '5,5'; ally.pos = '6,5'; ally.armour = 0;
      const hit = () => withGame(f.g, () => { const hp = ally.hp; harm(f.cb, f.g.rng, foe, ally, 40, type); const d = hp - ally.hp; ally.hp = ally.maxHp; return d; });
      expect(hit()).toBe(30); expect(logHas(f.cb, /Bulwark/)).toBe(true);
      foe.pos = '7,5'; guard.pos = '5,5'; // adjacent caster (behind the ally): not ranged, and off the line
      expect(hit()).toBe(40);
    }
  });
  it('a blast is not cut, and two Bulwarks don\'t stack (the best counts)', () => {
    const f = fightWith([{ perks: { bulwark: 'I' } }, {}], [{ at: 'O10' }]);
    const [guard, ally] = f.pcs, foe = f.foe; clearAround(f.cb);
    foe.pos = '2,5'; guard.pos = '5,5'; ally.pos = '6,5';
    const blast = withGame(f.g, () => { const hp = ally.hp; applyDamage(f.cb, ally, 40, { by: foe, type: 'weapon', ranged: true, explosive: true }); return hp - ally.hp; });
    expect(blast).toBe(40);
    const e = withGame(f.g, () => { const hp = ally.hp; applyDamage(f.cb, ally, 40, { by: foe, type: 'explosion' }); return hp - ally.hp; });
    expect(e).toBe(40);
    // Two guards on the line: I (1 tile) and II (2 tiles). 50% only, not 25% then 50%.
    const t = fightWith([{ perks: { bulwark: 'I' } }, { perks: { bulwark: 'II' } }, {}], [{ at: 'O10' }]);
    const [g1, g2, a] = t.pcs; clearAround(t.cb); t.foe.pos = '2,5'; g2.pos = '4,5'; g1.pos = '5,5'; a.pos = '6,5';
    const d = withGame(t.g, () => { const hp = a.hp; harm(t.cb, t.g.rng, t.foe, a, 40, 'soul'); return hp - a.hp; });
    expect(d).toBe(20);
  });
  it('the attack preview names Bulwark in the damage chain for the covered ally (and only the best one)', () => {
    const t = fightWith([{ perks: { bulwark: 'I' } }, { perks: { bulwark: 'II' } }, {}], [{ at: 'O10' }]);
    const [g1, g2, a] = t.pcs, foe = t.foe; clearAround(t.cb); foe.pos = '2,5'; g2.pos = '4,5'; g1.pos = '5,5'; a.pos = '6,5'; foe.ap = 6;
    const pv = withGame(t.g, () => previewAttack(t.cb, foe, a, 'shot'));
    const b = pv.dmg!.mults.filter((m) => /^Bulwark/.test(m.label));
    expect(b).toEqual([{ v: 0.5, label: 'Bulwark (' + g2.name + ')' }]);
    // The guard itself, and a shot from the side: nothing.
    expect(withGame(t.g, () => previewAttack(t.cb, foe, g2, 'shot')).dmg!.mults.some((m) => /^Bulwark/.test(m.label))).toBe(false);
    foe.pos = '6,1';
    expect(withGame(t.g, () => previewAttack(t.cb, foe, a, 'shot')).dmg!.mults.some((m) => /^Bulwark/.test(m.label))).toBe(false);
  });
});

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

describe('Iron Stomach and Nothing Left to Fear in a fight (through the reducer)', () => {
  const fearThenFight = (specs: any[]) => {
    const s = storyWith(specs); const ids = s.chars.map((c) => c.id);
    for (const id of ids) s.act({ type: 'narrator/turn', turn: { narration: 'Dread.', conditions: [{ target: id, id: 'fear' }] } } as any);
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
    return s;
  };
  it('Iron Stomach I: a Fear carried into the fight lasts 1 round; without it, its full length', () => {
    const s = fearThenFight([{ perks: { iron_stomach: 'I' } }, {}]); const cb = s.g.combat!;
    const [me, mate] = cb.units.filter((u) => u.side === 'pc');
    expect(condOn(me, 'fear')).toBe(true); expect((me.conds as any).fear).toBe(1);
    expect((mate.conds as any).fear).toBeGreaterThan(1);
  });
  it('Iron Stomach II: no Fear lands in the story or the fight', () => {
    const s = fearThenFight([{ perks: { iron_stomach: 'II' } }]); const me = s.g.combat!.units.find((u) => u.side === 'pc')!;
    expect(condOn(me, 'fear')).toBe(false);
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
    s.act({ type: 'narrator/turn', turn: { narration: 'Fight!', combat: { name: 'F', map: 'yard', difficulty: 'standard', fromTalk: true, enemies: [{ name: 'Foe', tier: 'soldier', weapon: 'service_pistol', at: 'O10' }] } } } as any);
    const cb = s.g.combat!;
    expect(logHas(cb, /Talks broke down .*lost/)).toBe(true); expect(logHas(cb, /hesitates \(Talks Broke Down\)/)).toBe(true);
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
