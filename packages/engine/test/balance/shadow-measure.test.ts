// Classes 3.0 step 6 (rules 1.32; shadow-spec.md section 7): Shadow's line, measured on the engine's own rolls. The
// three-turn window with one Break (the spec's sequences) against the same character's nine plain shots, times the
// plain rifle's all-in ceiling (rules.json balance.ceilings.plain.allin): the reading the spec's estimate makes.
// The character is the simulator's plain gun, all in (Dexterity full), with the spec's all-in Ingenuity added: an
// UPPER bound for a real Shadow build, which shares its points. Off unless SHADOW_MEASURE=1 (it prints a table); the
// guard below runs always: no Break (Execution included) takes a full-HP Elite or Boss at the character's level under 1 HP.
import { describe, it, expect } from 'vitest';
import { apply, bindGame, resolveAttack, RULES, CLASS } from '../../src';
import { applyCond } from '../../src/magic';
import { startFight } from './sim';

const SH: any = (RULES as any).shadow, C: any = (RULES as any).balance.ceilings;
const MODS = ['skill:ingenuity.1#shadow.break'];
const W = <T>(g: any, f: () => T): T => { const was = bindGame(g); try { return f(); } finally { bindGame(was); } };
/** The spec's all-in Ingenuity by level (section 7's table). */
const ING: Record<number, number> = { 1: 7, 5: 8, 10: 10, 20: 10 };

function setUp(level: number, operative: boolean, tier = 'soldier', seed = 'SH') {
  const st = startFight({ pcs: [{ build: 'plain_gun', variant: 'allin', level }], foes: [{ tier }], map: 'open', seed }, false);
  const c = st.g.characters.c1; c.skills.ingenuity = ING[level]; c.attrs.perception = Math.max(c.attrs.perception || 1, ING[level]);
  if (operative) { c.classId = 'infiltrator'; c.attrs.perception = Math.max(c.attrs.perception, 8); }
  const g = apply(st.g, st.open as any, 'host'), cb = g.combat!, u = cb.units.find((q: any) => q.side === 'pc')!, t = cb.units.find((q: any) => q.side === 'foe')!;
  u.pos = '3,5'; t.pos = '7,5';
  return { g, cb, u, t };
}
/** One shot's damage (the target restored after), plain or with a Break of n points from a fresh Hidden entry. */
function shot(x: ReturnType<typeof setUp>, o: { brk?: number; marked?: boolean } = {}): number {
  const { g, cb, u, t } = x; t.hp = t.maxHp = 100000; u.ap = 6; u.heat = 0; u.shotsThisTurn = 0; u.ammo = 30; u.jammed = false;
  delete (t.conds as any)?.marked; if (o.marked) W(g, () => applyCond(cb, g.rng, u, t, 'marked', undefined, undefined, { skipSave: true }));
  if (o.brk != null) { u.hidden = true; u.hideEntry = (u.hideEntry || 0) + 1; (u.res ||= {}).shadow = o.brk; cb.mods = MODS; }
  try { W(g, () => resolveAttack(cb, g.rng, u, t, 'shot', null, { free: true })); } finally { delete cb.mods; u.hidden = false; }
  return t.maxHp - t.hp;
}
function windowPct(level: number, who: 'door' | 'operative', n: number) {
  let plain = 0, win = 0;
  for (let i = 0; i < n; i++) {
    const x = setUp(level, who === 'operative', 'soldier', 'SH' + level + who + i), cap = x.u.resMax?.shadow || 0;
    for (let k = 0; k < 9; k++) plain += shot(x);
    if (who === 'door') { win += shot(x, { brk: Math.min(cap, 3) }) + shot(x); for (let k = 0; k < 3; k++) win += shot(x); }
    else { win += shot(x, { brk: Math.min(cap, 3) }) + shot(x, { marked: true }) * 2; for (let k = 0; k < 3; k++) win += shot(x, { marked: true }); }
  }
  return Math.round((win / plain) * C.plain.allin);
}

describe('Shadow: the window (rules 1.32, item 1962)', () => {
  it.runIf(process.env.SHADOW_MEASURE === '1')('measures the door and the Operative at levels 1, 5, 10, 20', () => {
    const n = Number(process.env.SHADOW_N) || 40, rows: string[] = [];
    for (const L of [1, 5, 10, 20]) rows.push('L' + L + ': door ' + windowPct(L, 'door', n) + ', Operative ' + windowPct(L, 'operative', n));
    console.log('Shadow window (line: Operative ' + C.shadow.allin + ', door all in ' + C.shadow.door_allin + ')\n' + rows.join('\n'));
  });
  it('the guard: a Break never takes a full-HP Elite or Boss at the character\'s level under 1 HP, nor Executes it', () => {
    for (const tier of ['elite', 'boss']) for (let i = 0; i < 6; i++) {
      const x = setUp(10, true, tier, 'GD' + tier + i); x.u.attack = 80;
      W(x.g, () => applyCond(x.cb, x.g.rng, x.u, x.t, 'marked', undefined, undefined, { skipSave: true }));
      x.u.hidden = true; x.u.hideEntry = 1; (x.u.res ||= {}).shadow = 4; x.cb.mods = MODS; x.t.level = x.u.level;
      try { W(x.g, () => resolveAttack(x.cb, x.g.rng, x.u, x.t, 'shot', null, { free: true, dmgMult: 20 })); } finally { delete x.cb.mods; }
      expect(x.t.dead, tier + ' ' + i).toBeFalsy();
      expect(x.t.hp, tier + ' ' + i).toBeGreaterThanOrEqual(1);
    }
    expect((CLASS as any).infiltrator.ranks.III.moves.map((m: any) => m.ref)).toContain('assassin.execution');
    void SH;
  });
});
