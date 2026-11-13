// Rules 1.37 (Classes 3.0 step 9): an enemy acts only on what its side perceives. It used to know where every
// character that was not Hidden stood, seen or not (BUGLIST-0.22, the limit written into 0.25.0's notes).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { ARCHETYPES, MAPS, newCharacter, startCombat, refOf, enemyTurn, enemyIntent, dist, moveUnit, noteSeenAt, sideSees, resolveAttack, knownTile, spotHidden, hide, type Sheet, type MapDef } from '../src';

const a0 = ARCHETYPES[0];
const sheet: Sheet = { name: 'P', portrait: '', origin: 'Central City', kit: 'medic', traits: [], skills: { ...a0.preset }, attrs: { ...a0.attributes }, cores: { ...a0.cores }, identity: {} } as any;
const open = (solid: string[] = []): MapDef => ({ ...MAPS.yard16, w: 26, h: 12, cover: [], full: [], solid, difficult: [], pcStart: ['2,5'], foeStart: ['20,5'] });
// a wall down column 10 from row 0 to row 8 (a way round at the bottom)
const WALL = Array.from({ length: 9 }, (_, y) => '10,' + y);
function setup(pcAt: string, foeAt: string, map = open(), weapon = 'combat_knife') {
  const cb = startCombat('t', map, [{ c: newCharacter('c0', 'p1', sheet), pos: pcAt }], [{ name: 'Foe', at: refOf(foeAt), tier: 'soldier', weapon } as any], 'easy', { state: 5 }, []);
  cb.objects = [];
  const p = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
  p.hp = p.maxHp = 9999; e.vision = 20; cb.turn = cb.order.indexOf(e.id); e.ap = 6;
  return { cb, p, e };
}

describe('rules 1.37: an enemy acts on what its side perceives', () => {
  it('the opening: before the fight\'s first note its side knows where every character not Hidden stands; the first note keeps it', () => {
    const { cb, p } = setup('4,3', '16,3', open(WALL));
    expect(sideSees(cb, 'foe', p)).toBe(false); // behind the wall
    expect(knownTile(cb, 'foe', p)).toBe(p.pos); // no note yet: the opening
    noteSeenAt(cb); expect(cb.seenAt?.foe?.[p.id]).toBe('4,3');
    p.pos = '2,1'; // it moves on, unseen
    expect(knownTile(cb, 'foe', p)).toBe('4,3');
  });
  it('a character it can\'t see is no target: it walks to where its side last saw it, not to where it went', () => {
    const { cb, p, e } = setup('12,10', '17,3', open(WALL), 'pistol');
    noteSeenAt(cb); expect(sideSees(cb, 'foe', p)).toBe(true); expect(cb.seenAt?.foe?.[p.id]).toBe('12,10');
    p.ap = 9; expect(moveUnit(cb, p, '8,6', { state: 9 })).toBeNull(); // round the wall's foot and up behind it
    noteSeenAt(cb); expect(sideSees(cb, 'foe', p)).toBe(false); expect(p.hidden).toBeFalsy();
    const last = cb.seenAt!.foe[p.id]; expect(last).not.toBe('8,6');
    const it0 = enemyIntent(cb, e); expect(it0.kind).toBe('move'); expect(it0.targetId).toBeUndefined();
    const was = e.pos, l0 = cb.log.length; enemyTurn(cb, { state: 3 });
    expect(cb.log.slice(l0).join(' ')).not.toMatch(/fires|shoots|hits|misses/i);
    expect(dist(e.pos, last)).toBeLessThan(dist(was, last));
  });
  it('standing on the last-seen tile with nobody in sight: it has searched there and holds', () => {
    const { cb, p, e } = setup('17,4', '17,3', open(WALL));
    noteSeenAt(cb); p.pos = '2,1'; e.pos = '17,4'; // it slipped away behind the wall; the enemy stands where it was
    expect(sideSees(cb, 'foe', p)).toBe(false);
    const was = e.pos; enemyTurn(cb, { state: 3 }); expect(e.pos).toBe(was);
  });
  it('hit by an attacker its side can\'t see: its side learns the tile the attack came from and searches toward it', () => {
    const { cb, p, e } = setup('4,3', '16,3', open(WALL), 'pistol');
    noteSeenAt(cb); p.pos = '9,10'; // round the wall's foot, out of the enemy's sight
    e.vision = 4; expect(sideSees(cb, 'foe', p)).toBe(false);
    p.vision = 30; cb.turn = cb.order.indexOf(p.id); p.ap = 6;
    let hit = false; for (let i = 0; i < 20 && !hit; i++) { const r = resolveAttack(cb, { state: 40 + i }, p, e, 'shot', null) as any; hit = !!r?.hit || cb.log.some((l) => /hits Foe/i.test(l)); p.ap = 6; e.hp = e.maxHp; }
    expect(hit).toBe(true);
    expect(cb.seenAt?.foe?.[p.id]).toBe('9,10');
    cb.turn = cb.order.indexOf(e.id); e.ap = 6; const was = e.pos; enemyTurn(cb, { state: 3 });
    expect(dist(e.pos, '9,10')).toBeLessThan(dist(was, '9,10'));
  });
  it('the spot-back: once its side spots a Hidden character it is a target at once (shared sight is the call-out)', () => {
    const { cb, p, e } = setup('14,5', '17,5', open(), 'pistol');
    noteSeenAt(cb); hide(cb, p); expect(p.hidden).toBe(true);
    expect(enemyIntent(cb, e).kind).not.toBe('attack');
    let found = false; for (let i = 0; i < 30 && !found; i++) { spotHidden(cb, { state: 100 + i }, e, p); found = !p.hidden; }
    expect(found).toBe(true);
    expect(enemyIntent(cb, e)).toMatchObject({ kind: 'attack', targetId: p.id });
  });
});
