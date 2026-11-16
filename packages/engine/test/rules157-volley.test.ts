// Rules 1.57 (0.30), the opening volley (16 Nov 2026; docs/design/proposals/2026-11-party-fit.md section 12 and 13).
// What this file pins, each from a sentence of the spec's "Rules 1.57 (0.30), the opening volley":
//   sight both ways     a line of sight is clear only when the straight walk is clear both ways: the foe the fog
//                       hides cannot shoot (the reproduced case: a pillar two tiles up-left of the character)
//   a technique spreads a tier's `technique_spread` lowers a technique's want for a target its side has already
//                       attacked this round, by that share for each other attacker; never against a Taunt
//   the enemy's Burst   two rolls, the second at −4, as a character's (techniques.json burst.numbers.enemy_same 1;
//                       rules118-guns.test.ts and rules123-defence.test.ts hold the rolls)
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { ENEMY, enemyIntent, enemyTurn, noteEnemyAim, lineOfSight, applyCond, type Unit } from '../src';
import { onHook } from '../src/effects/hooks';
import { fightWith, withGame, type FoeSpec } from './helpers/perkfight';

const RIFLE = 'hellraiser_service_rifle';
/** Ada and Bo on bare ground, everyone at 200 HP and no armour; the enemies in a column at x = 11. */
function rig(foes: FoeSpec[], o: { plain?: boolean } = {}) {
  const f = fightWith([{ name: 'Ada' }, { name: 'Bo' }], foes.map((q) => ({ weapon: RIFLE, ...q })));
  const cb = f.cb; cb.map = { ...cb.map, cover: [], full: [], solid: [], difficult: [] } as any; cb.objects = [];
  const at = ['5,4', '5,6']; f.pcs.forEach((p, i) => { p.pos = at[i]; });
  const col = ['11,5', '11,4', '11,6', '11,3']; f.foes.forEach((e, i) => { e.pos = col[i]; });
  for (const x of cb.units) { x.hp = x.maxHp = 200; x.armour = 0; x.shield = 0; x.hidden = false; }
  delete cb.fire; delete cb.doctrineSaid;
  if (o.plain) for (const e of f.foes) { e.techs = []; e.calls = []; }
  return f;
}
type F = ReturnType<typeof rig>;
const G = <T>(f: F, fn: () => T) => withGame(f.g, fn);
const pc = (f: F, name: string) => f.pcs.find((p) => p.name === name)!;
const aim = (f: F, e: Unit) => G(f, () => { const it = enemyIntent(f.cb, e); return { who: it.targetId ? f.unit(it.targetId).name : null, text: it.text }; });

describe('rules 1.57: a line of sight is the same both ways', () => {
  it('on open ground with one wall, every pair of tiles sees each other both ways or neither', () => {
    const f = rig([{ tier: 'soldier' }]); f.cb.map.solid = ['7,7'];
    let pairs = 0, blocked = 0;
    G(f, () => {
      for (let a = 0; a < 15 * 15; a++) for (let b = a + 1; b < 15 * 15; b++) {
        const A = (a % 15) + ',' + Math.floor(a / 15), B = (b % 15) + ',' + Math.floor(b / 15); if (A === '7,7' || B === '7,7') continue;
        const ab = lineOfSight(f.cb, A, B), ba = lineOfSight(f.cb, B, A); expect(ab, A + ' to ' + B).toBe(ba); pairs++; if (!ab) blocked++;
      }
    });
    expect(pairs).toBeGreaterThan(20000); expect(blocked).toBeGreaterThan(0);
  });
  it('the reproduced case: a wall at 8,10, the character at 10,12, the foe at 6,9: neither sees the other, and the foe does not fire', () => {
    const f = rig([{ tier: 'soldier' }], { plain: true }); f.cb.map.solid = ['8,10'];
    const a = pc(f, 'Ada'), b = pc(f, 'Bo'); a.pos = '10,12'; b.pos = '0,0'; f.foe.pos = '6,9';
    G(f, () => { expect(lineOfSight(f.cb, '6,9', '10,12')).toBe(false); expect(lineOfSight(f.cb, '10,12', '6,9')).toBe(false); });
    let rolls = 0, on = true; onHook('attack_roll', (ctx: any) => { if (on && ctx.tgt?.id === a.id) rolls++; });
    try { f.cb.turn = f.cb.order.indexOf(f.foe.id); f.foe.ap = 6; G(f, () => enemyTurn(f.cb, { state: 7 })); } finally { on = false; }
    expect(rolls, 'no shot from a tile the character cannot see').toBe(0);
  });
});

describe('rules 1.57: a technique spreads as a plain attack does', () => {
  // Ada 3 tiles from the Soldiers, Bo 8: Suppress wants the near one, and without the term both Soldiers put it on her.
  const near = (f: F) => { pc(f, 'Ada').pos = '8,4'; pc(f, 'Bo').pos = '3,6'; };
  it('the second Soldier takes its technique to the one nobody has attacked, even when the first is the better shot', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }]), [s1, s2] = f.foes; near(f);
    expect(aim(f, s1).who).toBe('Ada'); expect(aim(f, s2).who, 'before anyone fires, both want the near one').toBe('Ada');
    G(f, () => noteEnemyAim(f.cb, s1, pc(f, 'Ada')));
    expect(aim(f, s2).who).toBe('Bo');
    // (rules 1.57 focus memory, item 4564: the default focus_memory spreads it too, so both are set to 0 for the old guard)
    const was = (ENEMY.soldier as any).technique_spread, wasM = (ENEMY.soldier as any).focus_memory; (ENEMY.soldier as any).technique_spread = 0; (ENEMY.soldier as any).focus_memory = 0;
    try { expect(aim(f, s2).who, 'with technique_spread 0 and focus_memory 0 the technique doubles up').toBe('Ada'); } finally { (ENEMY.soldier as any).technique_spread = was; if (wasM === undefined) delete (ENEMY.soldier as any).focus_memory; else (ENEMY.soldier as any).focus_memory = wasM; }
  });
  it('never against a Taunt: a Soldier taunted by the one already under fire stays on it', () => {
    const f = rig([{ tier: 'soldier' }, { tier: 'soldier' }]), [s1, s2] = f.foes; near(f);
    G(f, () => { noteEnemyAim(f.cb, s1, pc(f, 'Ada')); applyCond(f.cb, { state: 3 } as any, pc(f, 'Ada'), s2, 'taunted', 1, undefined, { skipSave: true }); });
    expect(aim(f, s2).who).toBe('Ada');
  });
  it('Elites and Bosses gang up: technique_spread 0', () => {
    expect([(ENEMY.vermin as any).technique_spread, (ENEMY.minion as any).technique_spread, (ENEMY.soldier as any).technique_spread, (ENEMY.elite as any).technique_spread, (ENEMY.boss as any).technique_spread]).toEqual([0, 0, 0.5, 0, 0]);
  });
});
