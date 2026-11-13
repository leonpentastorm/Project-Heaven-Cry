// @ts-nocheck (reads a fixture through node's fs)
// Classes 3.0 step 1b: one row of each of the six system specs' "Built from" tables written in data on the primitives
// (bonds, figments, chaplain, shadow, reactions, heal-shield-percent). Each is well formed, run by the generic runners
// (no handler), and does what its row says. Fixture: test/fixtures/classes-3.0-specs-1b.json.
import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { addItems, clearAddedItems, ownerOf as ownerOfItem } from '../src/effects/hooks';
import { itemInfo } from '../src/effects/collect';
import { triggerProblem, isTriggered } from '../src/effects/triggers';
import { tie, addTieKinds, clearTieKinds } from '../src/kit';
import { ownedBy } from '../src/owned';
import { healUnit, applyDamage } from '../src/effects/damage';
import { previewAttack } from '../src/combat';
import { A, W, pcs, foes, turn, dice } from './golden/harness';
import { opsFight } from './golden/itemops';
import { physFight } from './helpers/physfight';

const FIX = JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/classes-3.0-specs-1b.json', import.meta.url)), 'utf8'));

describe('a row of each system spec, in data', () => {
  beforeAll(() => { addTieKinds(FIX.tie_kinds); addItems('relic', FIX.relics); addItems('verb', FIX.verbs); });
  afterAll(() => { clearTieKinds(); clearAddedItems(); });
  it('every row is well formed and run by the runners (no handler)', () => {
    for (const x of [...FIX.relics.map((r: any) => 'relic:' + r.id), ...FIX.verbs.map((v: any) => 'verb:' + v.id)]) {
      const info = itemInfo(x)!; expect(info, x).toBeTruthy();
      info.effects.forEach((e: any, i: number) => { if (isTriggered(e)) { expect(triggerProblem(e), x + ' #' + i).toBeNull(); expect(ownerOfItem(info, i), x + ' #' + i).toBe('generic'); } });
    }
  });
  it('bonds: a heal echoes onto the Bonded enemy at its next turn', () => {
    const g = opsFight({ relics: ['spec_bonds_echo'] }), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    W(g, () => { tie(cb, u, f, 'spec_bond'); al.hp = 1; healUnit(cb, al, 20, u, 'heal'); expect(cb.delayed?.length).toBe(1); const hp = f.hp; turn(g, f, 6); expect(f.hp).toBeLessThan(hp); });
  });
  it('figments: Volatile bursts on its neighbours as it falls', () => {
    const g = opsFight({}), cb = g.combat, [u, al] = pcs(g), f = foes(g)[0];
    al.held = { perks: [], traits: [], relics: ['spec_figments_volatile'] }; al.pos = '3,7';
    W(g, () => { const hp = u.hp; applyDamage(cb, al, al.hp + 99, { by: f, type: 'true', shield: false, credit: 'all' }); expect(u.hp).toBeLessThan(hp); });
  });
  it('figments: Picture makes an owned unit through its verb', () => {
    const f = physFight([{ skills: { visualization: 1 } }], [{}]); f.put(f.pc, '2,2'); f.cb.order = [f.pc.id, f.foes[0].id]; f.turn(f.pc);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'verb:spec_figments_picture' });
    expect(ownedBy(f.cb, f.unit(f.pc.id)).map((x: any) => x.companion)).toEqual(['drone']);
  });
  it('chaplain: Ward is a Whisper with a reach, a shield on its own layer', () => {
    const f = physFight([{ skills: { faith: 3 } }, {}], [{}]); f.put(f.pc, '2,2'); f.put(f.pcs[1], '3,2'); f.cb.order = [f.pc.id, f.pcs[1].id, f.foes[0].id]; f.turn(f.pc);
    f.act({ type: 'combat/perk', unitId: f.pc.id, id: 'verb:spec_chaplain_ward', targetId: f.pcs[1].id });
    expect(f.unit(f.pcs[1].id).shields?.[0]).toMatchObject({ layer: 'ward', by: f.pc.id });
  });
  it('shadow: the Break toggle multiplies a Hidden attack', () => {
    const g = opsFight({ relics: ['spec_shadow_break'] }), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    const mults = (mods: string[]) => W(g, () => { cb.mods = mods; u.hidden = true; try { return previewAttack(cb, u, f, 'shot').dmg.mults.length; } finally { delete cb.mods; u.hidden = false; } });
    expect(mults(['relic:spec_shadow_break#break'])).toBe(mults([]) + 1);
  });
  it('reactions: Run and Gun adds a point of Pressure on a shot\'s hit', () => {
    const g = opsFight({ relics: ['spec_reactions_run_and_gun'] }), cb = g.combat, u = pcs(g)[0], f = foes(g)[0];
    W(g, () => { const p = A.pressureOf(f); dice({ die: 10, hit: true }, () => A.resolveAttack(cb, g.rng, u, f, 'shot', null, { noAp: true })); expect(A.pressureOf(f)).toBeGreaterThan(p); });
  });
  it('heal and shield in percent: the gate lifts a small heal to a fifth of the bar', () => {
    const g = opsFight({ relics: ['spec_percent_gate'] }), cb = g.combat, u = pcs(g)[0];
    W(g, () => { u.healRecv = 1; u.hp = 1; turn(g, u, 6); expect(u.hp - 1).toBeGreaterThanOrEqual(Math.ceil(0.2 * Math.min(u.maxHp, 145))); });
  });
});
