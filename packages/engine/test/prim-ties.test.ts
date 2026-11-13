// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b, sub-step 5 (docs/design/rev4-primitives.md P8 and section 6's rows): ties. cb.ties [{kind, from,
// to}]; kit.ts tie / untie / tiesOf; op tie (clear: all or target); predicates actor_tied / target_tied; the cap
// ties_max:<kind> on a kind's max; each kind a row (rules.json ties.kinds) with ends_on (from_down, to_down, to_dead,
// unseen_round, combat_end) and on_end; targets.tied and targets.aims_at; the fog keeps a side's own ties only.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { tie, untie, tiesOf, tiedTo, tieCap, addTieKinds, clearTieKinds } from '../src/kit';
import { PREDICATES, OPS, TARGET_FIELDS } from '../src/effects/triggers';
import { applyDamage } from '../src/effects/damage';
import { fogFight } from '../src/fog';
import { A, W, pcs, foes, turn, dice } from './golden/harness';
import { opsFight } from './golden/itemops';
import RULES from '../../../data/rules.json';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-primitives-1b.json', import.meta.url)), 'utf8'));
const R = (id: string) => FIX.relics.find((r: any) => r.id === id).effects;
const BOND = FIX.tie_kinds[0];

describe('P8: ties', () => {
  beforeAll(() => { addTieKinds(FIX.tie_kinds); addItems('relic', FIX.relics); });
  afterAll(() => { clearTieKinds(); clearAddedItems(); });
  it('the closed lists: op tie, predicates actor_tied / target_tied, targets.tied and aims_at; the data\'s kinds block', () => {
    expect(OPS.tie).toBeTruthy(); expect(PREDICATES.target_tied.arg).toBe('tie'); expect(PREDICATES.actor_tied.values).toContain(BOND.id);
    expect(TARGET_FIELDS.tied).toBe('string'); expect(TARGET_FIELDS.aims_at).toBe('string'); expect(Array.isArray((RULES as any).ties.kinds)).toBe(true);
  });
  it('tie, tiesOf, tiedTo, the cap (the kind\'s max + ties_max:<kind>), untie', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0], [f, far] = foes(g);
    W(g, () => {
      expect(tie(cb, u, f, BOND.id)).toBeTruthy(); expect(tie(cb, u, f, BOND.id)).toBeNull(); // it stands
      expect(tieCap(cb, u, BOND.id)).toBe(BOND.max); expect(tie(cb, u, far, BOND.id)).toBeNull(); // at the cap
      expect(tiedTo(cb, u, f, BOND.id)).toBe(true); expect(tiedTo(cb, u, f, BOND.id, 'to')).toBe(true); expect(tiedTo(cb, u, f, BOND.id, 'from')).toBe(false);
      expect(tiesOf(cb, f, BOND.id, 'to').length).toBe(1); expect(tie(cb, u, f, 'nope')).toBeNull();
      expect(untie(cb, (t) => t.to === f.id)).toBe(1); expect(cb.ties).toBeUndefined();
    });
    const g2 = opsFight({ relics: ['test_ties_more'] }); W(g2, () => expect(tieCap(g2.combat, pcs(g2)[0], BOND.id)).toBe(BOND.max + R('test_ties_more')[0].value));
  });
  it('in data: a hit ties; a tied target takes more; at the turn\'s start each tied foe is Marked (targets.tied)', () => {
    const e = R('test_tie_on_hit'), g = opsFight({ relics: ['test_tie_on_hit'] }), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    W(g, () => {
      const before = A.previewAttack(cb, u, f, 'shot').dmg.total;
      dice({ die: 10, hit: true }, () => A.resolveAttack(cb, g.rng, u, f, 'shot', null, { noAp: true }));
      expect(tiedTo(cb, u, f, BOND.id)).toBe(true);
      expect(A.previewAttack(cb, u, f, 'shot').dmg.total).toBeGreaterThan(before); void e;
      turn(g, u, 6); expect(A.condOn(f, 'marked')).toBe(true); expect(A.condOn(foes(g)[1], 'marked')).toBe(false);
    });
  });
  it('the end rules: from_down, to_dead, to_down, unseen_round, combat_end', () => {
    const g = opsFight({}), cb = g.combat, [u, al] = pcs(g), [f, far] = foes(g);
    W(g, () => {
      tie(cb, u, f, BOND.id); applyDamage(cb, f, f.hp + 50, { by: u, type: 'true', shield: false, credit: 'all' });
      expect(tiesOf(cb, u, BOND.id).length).toBe(0); // to_dead
      tie(cb, u, far, 'test_leash'); A.applyCond; far.hp = 1; applyDamage(cb, far, 5, { by: u, type: 'true', shield: false, credit: 'all' });
      expect(tiesOf(cb, u, 'test_leash').length).toBe(far.dead || far.downed ? 0 : 1); // to_down
      tie(cb, al, foes(g)[2], BOND.id); al.vision = 0.1; // al can't see it
      cb.round++; A.emit(cb, 'round_start', { cb, round: cb.round }); expect(tiesOf(cb, al, BOND.id).length).toBe(1); // one round unseen: still tied
      cb.round++; A.emit(cb, 'round_start', { cb, round: cb.round }); expect(tiesOf(cb, al, BOND.id).length).toBe(0); // a full round: ended
      tie(cb, al, foes(g)[2], BOND.id); A.emit(cb, 'combat_end', { cb, won: true }); expect(cb.ties).toBeUndefined();
    });
  });
  it('the fog: a side keeps its own ties; the far end it can\'t see is unseen', () => {
    const g = opsFight({}), cb = g.combat, u = pcs(g)[0], [f, , el] = foes(g);
    W(g, () => { tie(cb, u, f, BOND.id); tie(cb, el, u, BOND.id); });
    const pcView = fogFight(g, cb, cb, 'pc'), foeView = fogFight(g, cb, cb, 'foe');
    expect((pcView.ties || []).map((t: any) => t.from)).toEqual([u.id]); expect((foeView.ties || []).map((t: any) => t.from)).toEqual([el.id]);
  });
});
