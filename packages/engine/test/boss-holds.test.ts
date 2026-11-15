// The 0.29 consolidation (SF1, the lead's ruling of 16 Nov 2026): a Boss is never moved by a forced move from an
// opponent's item (data/rules.json forced_movement.boss_holds; combat.ts forcedRefusal, the one gate every push, pull,
// throw, teleport and swap passes), but for the items the data names (Tug: its own row moves a Boss 1 tile). Every
// source goes through the reducer with a real action: Slam (Durability's door), Palm (the Open Hand), Shove; Press (the
// Wall's order) is in figments-2.test.ts, Launch in momentum-2.test.ts and Tug in bonds-slice1.test.ts. Each still moves a Soldier.
import { describe, it, expect, afterEach } from 'vitest';
import './helpers/yard16';
import { previewDescriptor, sendDescriptor, type Unit } from '../src';
import { physFight } from './helpers/physfight';
import { fightWith } from './helpers/perkfight';
import { dice } from './golden/harness';
import { onHook } from '../src/effects/hooks';

let FAIL_SAVES = false;
onHook('save', (ctx: any) => { if (FAIL_SAVES) ctx.fail = true; });
afterEach(() => { FAIL_SAVES = false; });
const TIERS = ['boss', 'soldier'] as const;
const moved = (tier: string, was: string, now: string) => (tier === 'boss' ? expect(now).toBe(was) : expect(now).not.toBe(was));

describe('a Boss holds against every forced move of a player\'s item; a Soldier does not', () => {
  for (const tier of TIERS) it('Slam (' + tier + ')', () => {
    const f = physFight([{ weapon: 'hellraiser_service_rifle', known: [], skills: { durability: 5, dexterity: 0, athletics: 0, raw_power: 0 } }], [{ tier, weapon: 'maul' }]);
    f.cb.objects = []; f.put(f.pcs[0], 'C5'); const foe = f.cb.units.find((u) => u.side === 'foe')!; f.put(foe, 'D5'); foe.hp = foe.maxHp = 900;
    f.cb.order = [f.pcs[0].id, foe.id]; f.cb.round = 1; f.turn(f.pcs[0]); f.unit(f.pcs[0].id).res!.guard = 3;
    FAIL_SAVES = true; const was = f.unit(foe.id).pos;
    f.act({ type: 'combat/perk', unitId: f.pcs[0].id, id: 'skill:durability.1', actionId: 'guard_slam' } as any);
    moved(tier, was, f.unit(foe.id).pos);
  });

  for (const tier of TIERS) it('Palm (' + tier + ')', () => {
    const f = fightWith([{ archetype: 'monk', weapon: 'hand_wraps' }], [{ at: 'F6', tier }]);
    const [x, y] = f.foe.pos.split(',').map(Number);
    f.g.combat!.units.find((u) => u.side === 'pc')!.pos = (x - 1) + ',' + y;
    const u = f.turn(f.pc), was = f.foe.pos, mods = ['relic:open_hand#palm'];
    expect(previewDescriptor(f.g, u.id, 'tq:main:cut', { targetId: f.foe.id, mods }, 'host')).toBeTruthy();
    FAIL_SAVES = true;
    dice({ die: 10, hit: true }, () => f.act(sendDescriptor(f.g, u.id, 'tq:main:cut', { targetId: f.foe.id, mods }, 'host')!));
    expect(f.unit(f.foe.id).conds?.off_balance, f.g.combat!.log.slice(-3).join(' | ')).toBeTruthy();
    moved(tier, was, f.unit(f.foe.id).pos);
  });

  for (const tier of TIERS) it('Shove (' + tier + ')', () => {
    const f = fightWith([{}], [{ at: 'F6', tier }]);
    const [x, y] = f.foe.pos.split(',').map(Number);
    const me = f.g.combat!.units.find((u) => u.side === 'pc')!; me.pos = (x - 1) + ',' + y;
    const u: Unit = f.turn(f.pc); f.unit(u.id).strength = 99; const was = f.foe.pos;
    f.act({ type: 'combat/shove', unitId: u.id, targetId: f.foe.id } as any);
    moved(tier, was, f.unit(f.foe.id).pos);
    if (tier === 'boss') expect(f.g.combat!.log.slice(-1)[0]).toMatch(/holds firm/);
  });

});
