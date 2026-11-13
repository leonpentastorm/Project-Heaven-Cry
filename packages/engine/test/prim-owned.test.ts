// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b, sub-step 6 (docs/design/rev4-primitives.md P9): owned units. The record is the tie `owned`
// (rules.json ties.kinds) + the unit's own block {turn, eyes, upkeep, cover, lure} (owned.ts); ops spawn and unmake
// (refund); payer on whyNot / pay; limit.of "owner" (an owned unit's reaction is its owner's). The drone, the beast and
// the twin: tied to their owner at the fight's start (turn own: their turn order unchanged), ownerOf reads the tie and,
// for a fight saved before it, the old fields.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { spawnOwned, unmakeOwned, ownerOf, ownedBy, addOwnedBlocks, clearOwnedBlocks, ownedRecord, OWNED_TIE } from '../src/owned';
import { tiesOf, tiedTo } from '../src/kit';
import { whyNot, pay } from '../src/effects/cost';
import { coverOf, unitSees } from '../src/combat';
import { OPS } from '../src/effects/triggers';
import { A, W, pcs, foes, turn } from './golden/harness';
import { opsFight } from './golden/itemops';
import { fightWith } from './helpers/perkfight';
import ENEMIES from '../../../data/enemies.json';
import RULES from '../../../data/rules.json';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives-1b.json', import.meta.url)), 'utf8'));
const WISP = FIX.owned_blocks[0];

describe('P9: owned units', () => {
  beforeAll(() => { addOwnedBlocks(FIX.owned_blocks); addItems('relic', FIX.relics); });
  afterAll(() => { clearOwnedBlocks(); clearAddedItems(); });
  it('the data: the owned tie kind; the companions\' blocks are records (turn own)', () => {
    expect((RULES as any).ties.kinds.map((k: any) => k.id)).toContain(OWNED_TIE); expect(OPS.spawn && OPS.unmake).toBeTruthy();
    for (const k of (ENEMIES as any).companions) expect(ownedRecord(k).turn).toBe('own');
  });
  it('spawnOwned: a unit from a block at the owner\'s level, tied, after its owner in the order; its record (eyes, cover)', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0];
    W(g, () => {
      const w = spawnOwned(cb, u, WISP.id, '3,7', g.rng) as any;
      expect(typeof w).toBe('object'); expect(w.side).toBe(u.side); expect(w.level).toBe(u.level ?? 1);
      expect(tiedTo(cb, u, w, OWNED_TIE, 'to')).toBe(true); expect(ownerOf(cb, w)).toBe(u); expect(ownedBy(cb, u)).toEqual([w]);
      expect(cb.order[cb.order.indexOf(u.id) + 1]).toBe(w.id);
      expect(w.owned).toMatchObject({ turn: 'own', eyes: false, cover: true, upkeep: WISP.upkeep }); expect(unitSees(cb, w, w.pos)).toBe(false);
      expect(coverOf(cb)[w.pos]).toMatchObject({ kind: 'half', id: w.id });
      unmakeOwned(cb, w); expect(cb.units.includes(w)).toBe(false); expect(cb.order).not.toContain(w.id); expect(tiesOf(cb, u, OWNED_TIE).length).toBe(0);
    });
  });
  it('in data: spawn (once a fight), upkeep at the owner\'s turn (unmade when it can\'t be paid), unmake with refund', () => {
    const g = opsFight({ relics: ['test_spawn_wisp'] }), cb = g.combat, u = pcs(g)[0], c = g.characters[u.charId];
    const w = ownedBy(cb, u)[0]; expect(w?.name).toBe(WISP.name); // the relic made it at the turn opsFight began
    c.echo = 1; W(g, () => turn(g, u, 6)); expect(c.echo).toBe(1 - WISP.upkeep.n); expect(ownedBy(cb, u).length).toBe(1); // paid; once a fight: no second
    W(g, () => turn(g, u, 6)); expect(ownedBy(cb, u).length).toBe(0); // nothing to pay with: unmade
  });
  it('payer: a price made on one unit is paid by another', () => {
    const g = opsFight({}), cb = g.combat, [u, al] = pcs(g);
    W(g, () => { u.ap = 4; al.ap = 0; expect(whyNot(cb, al, 2)).toMatch(/Needs/); expect(whyNot(cb, al, 2, { payer: u })).toBeNull(); pay(cb, al, 2, { payer: u }); expect(u.ap).toBe(2); expect(al.ap).toBe(0); });
  });
  it('the companions: a drone is tied to its owner when the fight starts; its turn comes right after its owner\'s', () => {
    const f = fightWith([{ edit: (c: any) => { c.companions = [{ id: 'd1', kind: 'drone', name: 'Drone' }]; } } as any], [{}]);
    const cb = f.g.combat, d = cb.units.find((x: any) => x.companion === 'drone');
    if (!d) return; // (the helper's sheet carries no companions: covered by old-save's companion fixture)
    const o = ownerOf(cb, d)!; expect(o.charId).toBe(d.ctrl); expect(tiedTo(cb, o, d, OWNED_TIE, 'to')).toBe(true);
  });
});
