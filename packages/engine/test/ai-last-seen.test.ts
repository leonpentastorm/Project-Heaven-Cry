// Bug, 13 Nov 2026 (docs/design/rev4-primitives.md section 4): an enemy that perceives nobody stood still. It now walks
// toward where its side last saw a hostile (cb.lastSeen: the tile it was on when this side saw it hide), never to where
// that hostile really is; with nothing known (an old save, a hide nobody saw) it holds as before.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { ARCHETYPES, MAPS, newCharacter, startCombat, refOf, enemyTurn, enemyIntent, dist, hide, moveUnit, noteSeenAt, sideSees, type Sheet, type MapDef } from '../src';

const a0 = ARCHETYPES[0];
const sheet: Sheet = { name: 'P', portrait: '', origin: 'Central City', kit: 'medic', traits: [], skills: { ...a0.preset }, attrs: { ...a0.attributes }, cores: { ...a0.cores }, identity: {} } as any;
const open = (): MapDef => ({ ...MAPS.yard16, w: 26, h: 12, cover: [], full: [], solid: [], difficult: [], pcStart: ['2,5'], foeStart: ['20,5'] });
function setup(pcAt: string, foeAt: string, map = open()) {
  const cb = startCombat('t', map, [{ c: newCharacter('c0', 'p1', sheet), pos: pcAt }], [{ name: 'Foe', at: refOf(foeAt), tier: 'soldier', weapon: 'combat_knife' } as any], 'easy', { state: 5 }, []);
  cb.objects = [];
  const p = cb.units.find((x) => x.side === 'pc')!, e = cb.units.find((x) => x.side === 'foe')!;
  p.hp = p.maxHp = 9999; e.vision = 20; cb.turn = cb.order.indexOf(e.id); e.ap = 6;
  return { cb, p, e };
}

describe('an enemy that perceives nobody', () => {
  it('walks to the tile where its side saw the character hide, not to where the character went', () => {
    const { cb, p, e } = setup('8,5', '14,5');
    hide(cb, p); expect(p.hidden).toBe(true); expect(cb.lastSeen?.foe?.[p.id]).toBe('8,5');
    p.pos = '22,5'; // it slips away unseen, behind the enemy
    const was = e.pos;
    expect(enemyIntent(cb, e)).toMatchObject({ kind: 'move' });
    enemyTurn(cb, { state: 3 });
    expect(e.pos).not.toBe(was);
    expect(dist(e.pos, '8,5')).toBeLessThan(dist(was, '8,5'));
    expect(dist(e.pos, p.pos)).toBeGreaterThan(dist(was, p.pos)); // away from the truth
    for (let i = 0; i < 4 && dist(e.pos, '8,5') > 0; i++) { e.ap = 6; e.bank = 0; enemyTurn(cb, { state: 3 + i }); }
    expect(e.pos).toBe('8,5');
  });
  it('a character walks out of sight behind a wall and hides there: the enemy searches the last tile it saw it on, not where it is', () => {
    const wall = { ...open(), solid: ['10,1', '10,2', '10,3', '10,4', '10,5'] };
    const { cb, p, e } = setup('12,7', '17,3', wall);
    noteSeenAt(cb); expect(cb.seenAt?.foe?.[p.id]).toBe('12,7');
    p.ap = 6; expect(moveUnit(cb, p, '8,3', { state: 9 })).toBeNull(); expect(p.pos).toBe('8,3');
    expect(sideSees(cb, 'foe', p)).toBe(false); // behind the wall now
    const last = cb.seenAt!.foe[p.id]; expect(last).not.toBe('12,7'); expect(last).not.toBe('8,3'); // the walk noted the last step it was seen on
    hide(cb, p); expect(cb.lastSeen?.foe?.[p.id]).toBe(last);
    const was = e.pos; enemyTurn(cb, { state: 3 });
    expect(dist(e.pos, last)).toBeLessThan(dist(was, last));
  });
  it('a hide its side did not see tells it nothing: it holds', () => {
    const wall = { ...open(), solid: Array.from({ length: 11 }, (_, y) => '11,' + (y + 1)) }; // a wall with a gap at the top row
    const { cb, p, e } = setup('8,5', '14,5', wall);
    hide(cb, p); expect(cb.lastSeen?.foe?.[p.id]).toBeUndefined();
    const was = e.pos; enemyTurn(cb, { state: 3 }); expect(e.pos).toBe(was);
  });
  it('an old save with no last-seen record: it holds where it is, as before', () => {
    const { cb, p, e } = setup('8,5', '14,5');
    hide(cb, p); delete cb.lastSeen;
    const was = e.pos; expect(enemyIntent(cb, e).kind).toBe('wait');
    enemyTurn(cb, { state: 3 }); expect(e.pos).toBe(was);
  });
});
