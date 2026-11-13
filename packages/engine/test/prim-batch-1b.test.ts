// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b, the integration: the four closed-list batch rows the builder left (rev4-primitives.md section
// 1, the batch): the op mend_mult (the damage_mult of mending, on `heal` and `shield`; the kind read with `how`), op
// condition's value "incoming" (the condition being put on: Take the Weight), the stat intervention_keeps_witnessed
// (faith.ts intervene: the Chaplain's rule 11) and the condition row `read` (its source's side sees the bearer's
// intent until the bearer's turn ends). Fixtures: test/fixtures/classes-3.0-batch-1b.json.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems } from '../src/effects/hooks';
import { healUnit, grantShield, applyDamage } from '../src/effects/damage';
import { OPS, triggerProblem } from '../src/effects/triggers';
import { STATS } from '../src/effects/stats';
import { condDef } from '../src/condtable';
import { condOn, applyCond } from '../src/magic';
import { fogFight } from '../src/fog';
import { A, W, pcs, foes, turn, dice } from './golden/harness';
import { opsFight } from './golden/itemops';
import { fightWith, withGame } from './helpers/perkfight';
import { setDevotionXp, devotionThreshold } from '../src/character';
import { FAITH_FX } from '../src/faith';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-batch-1b.json', import.meta.url)), 'utf8'));
const fxOf = (cb: any, kind: string) => (cb.fx || []).filter((e: any) => e.k === kind);

describe('the four batch rows (rev4-primitives.md section 1)', () => {
  beforeAll(() => addItems('relic', FIX.relics));
  afterAll(() => clearAddedItems());

  it('the closed lists: mend_mult on heal and shield; the stat; the row; every fixture effect is well formed', () => {
    expect(OPS.mend_mult.on).toEqual(['heal', 'shield']); expect(STATS.intervention_keeps_witnessed).toBeTruthy();
    expect(condDef('read')?.mods.intent).toBe(true); expect(condDef('read')?.rounds).toBe(1);
    for (const r of FIX.relics) for (const e of r.effects) if (e.when) expect(triggerProblem(e)).toBeNull();
  });

  it('mend_mult: the holder\'s tending heal and shield on an ally are ×1.2; another kind, another giver, or itself: not', () => {
    const g = opsFight({ relics: ['test_through'] }), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    W(g, () => {
      al.hp = 1; expect(healUnit(cb, al, 50, u, 'tending').restored).toBe(Math.floor(Math.floor(50 * (al.healRecv || 1)) * 1.2));
      al.hp = 1; expect(healUnit(cb, al, 50, u, 'perk').restored).toBe(Math.floor(50 * (al.healRecv || 1)));
      al.hp = 1; expect(healUnit(cb, al, 50, f, 'tending').restored).toBe(Math.floor(50 * (al.healRecv || 1)));
      u.hp = 1; expect(healUnit(cb, u, 50, u, 'tending').restored).toBe(Math.floor(50 * (u.healRecv || 1)));
      al.shield = 0; grantShield(cb, al, 50, u, { kind: 'tending' }); expect(al.shield).toBe(Math.floor(Math.floor(50 * (al.shieldRecv || 1)) * 1.2));
      al.shield = 0; grantShield(cb, al, 50, u, { kind: 'perk' }); expect(al.shield).toBe(Math.floor(50 * (al.shieldRecv || 1)));
    });
  });

  it('condition "incoming": an ally would be Stunned: it is not, and the holder is (the same rounds); another condition passes', () => {
    const g = opsFight({ relics: ['test_take_weight'] }), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    W(g, () => {
      const said = applyCond(cb, g.rng, f, al, 'stunned', 2, undefined, { skipSave: true });
      expect(condOn(al, 'stunned')).toBe(false); expect(said).toMatch(/taken by a friend/);
      expect(condOn(u, 'stunned')).toBe(true); expect(u.conds.stunned).toBe(2);
      applyCond(cb, g.rng, f, al, 'marked', undefined, undefined, { skipSave: true }); expect(condOn(al, 'marked')).toBe(true); expect(condOn(u, 'marked')).toBe(false);
      applyCond(cb, g.rng, f, u, 'shaken', 2, undefined, { skipSave: true }); expect(condOn(u, 'shaken')).toBe(true); // its own: not an ally
    });
  });

  it('intervention_keeps_witnessed: the same intervention ends Witnessed without it and keeps it with it', () => {
    const run = (relics: string[]) => {
      const f = fightWith([{ name: 'Priest', skills: { faith: 7 }, relics }, { name: 'Ally' }], [{ at: 'F6' }, { at: 'G6' }]);
      const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'the_matchmaker' }; c.patron = 'the_matchmaker'; setDevotionXp(c, devotionThreshold(3)); c.devotion = 3;
      const [pr, al] = f.pcs, [f0, f1] = f.foes; pr.pos = '2,5'; al.pos = '2,6'; f0.pos = '5,5'; f1.pos = '6,5';
      for (const x of f.cb.units) { x.hp = x.maxHp; x.conds = {}; x.shield = 0; }
      f.turn(pr); const me = f.unit(pr.id); me.conds = { witnessed: 99 };
      withGame(f.g, () => applyDamage(f.cb, f.unit(al.id), 20, { by: f.unit(f0.id), type: 'physical' }));
      return { f, me: f.unit(pr.id) };
    };
    const plain = run([]); expect(fxOf(plain.f.cb, FAITH_FX.intervention).length).toBe(1); expect(condOn(plain.me, 'witnessed')).toBe(false);
    const kept = run(['test_keep_witnessed']); expect(fxOf(kept.f.cb, FAITH_FX.intervention).length).toBe(1); expect(condOn(kept.me, 'witnessed')).toBe(true);
    expect(kept.f.cb.log.some((l: string) => /no longer Witnessed/.test(l))).toBe(false);
  });

  it('read: a hit Reads the enemy: its intent kept for the reader\'s side (fx, log, view), never sent to the other side, gone at its turn\'s end', () => {
    const g = opsFight({ relics: ['test_read_on_hit'] }), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    W(g, () => {
      dice({ die: 10, hit: true }, () => A.resolveAttack(cb, g.rng, u, f, 'shot', null, { noAp: true }));
      expect(condOn(f, 'read')).toBe(true); expect(f.readIntent?.by).toBe(u.id); expect(f.readIntent?.cond).toBe('read');
      expect(fxOf(cb, 'intent').some((e: any) => e.target === f.id)).toBe(true); expect(cb.log.some((l: string) => l.startsWith('Read: ' + f.name))).toBe(true);
      expect(fogFight(g, cb, cb, 'pc').units.find((x: any) => x.id === f.id).readIntent).toBeTruthy();
      // a read the other side made of one of its own (its owned record too) never reaches this side's view
      const f2 = foes(g)[1]; f2.readIntent = { ...f.readIntent, by: f.id }; f2.owned = { turn: 'owner', lure: true };
      const pv = fogFight(g, cb, cb, 'pc').units.find((x: any) => x.id === f2.id);
      if (pv) { expect(pv.readIntent).toBeUndefined(); expect(pv.owned).toBeUndefined(); }
      expect(fogFight(g, cb, cb, 'foe').units.find((x: any) => x.id === f2.id).owned).toEqual({ turn: 'owner', lure: true });
      delete f2.readIntent; delete f2.owned;
      turn(g, f, 6); A.endTurn(cb, g.rng);
      expect(condOn(f, 'read')).toBe(false); expect(f.readIntent).toBeUndefined();
    });
  });
});
