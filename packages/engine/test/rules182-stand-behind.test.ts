// Rules 1.82 item 7006 (call made for Leon: Waiting on Leon 23, the lead's pick): Stand Behind Me, the Bulwark's rank III
// ceiling move. A ranged attack on the ally directly behind you (the predicate target_behind) lands on you: the op
// redirect, share 1, so your plates take it as any hit. Through the enemy's own attack (resolveAttack) and the reducer's.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { resolveAttack, CLASS } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

const SBM: any = (CLASS.defender as any).ranks.III.moves.find((m: any) => m.id === 'stand_behind_me');
function rig(rank3: boolean, allyAt: string, mode: 'shot' | 'melee' = 'shot', foeAt = '9,5') {
  for (let i = 0; i < 40; i++) {
    const f = fightWith([{ name: 'Wall', classId: 'defender', attrs: { endurance: rank3 ? 8 : 4 }, skills: { durability: 3 }, level: rank3 ? 12 : 3 }, { name: 'Kid' }], [{ at: 'J6' }], { seed: 'SBM' + i });
    const [wall, kid] = f.pcs; wall.pos = '5,5'; kid.pos = allyAt; f.foe.pos = foeAt; f.foe.ap = 6;
    for (const u of f.cb.units) { u.hp = u.maxHp = 500; u.shield = 0; u.armour = 0; }
    if (wall.res) wall.res = { ...wall.res, guard: 0 }; // no plates to Interpose with: the move alone
    const w0 = wall.hp, k0 = kid.hp;
    withGame(f.g, () => resolveAttack(f.cb, f.g.rng, f.unit(f.foe.id), f.unit(kid.id), mode, null));
    const lost = { wall: w0 - f.unit(wall.id).hp, kid: k0 - f.unit(kid.id).hp, log: f.cb.log.join(' | ') };
    if (lost.wall > 0 || lost.kid > 0) { if (process.env.SBM_LOG) console.log(lost.log.slice(-600)); return lost; }
  }
  throw new Error('no hit');
}
describe('rules 1.82 item 7006: Stand Behind Me', () => {
  it('is the Bulwark\'s rank III ceiling move (beside the rank\'s two)', () => { expect(SBM).toBeTruthy(); expect(SBM.ceiling).toBe(true); expect((CLASS.defender as any).ranks.III.moves.filter((m: any) => !m.ceiling).length).toBe(2); });
  it('a shot at the ally directly behind the Bulwark lands on the Bulwark; the ally takes nothing', () => {
    const r = rig(true, '4,5'); expect(r.kid).toBe(0); expect(r.wall).toBeGreaterThan(0); expect(r.log).toContain('Wall takes the shot meant for Kid (Stand Behind Me).');
  });
  it('beside the Bulwark but not behind it from the shooter: the ally takes the shot', () => {
    const r = rig(true, '5,4'); expect(r.kid).toBeGreaterThan(0);
  });
  it('below rank III, nothing moves', () => { const r = rig(false, '4,5'); expect(r.kid).toBeGreaterThan(0); });
});
