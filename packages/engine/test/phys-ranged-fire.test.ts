// Physical 2.0 (rules 1.12), ranged Fire: Snap Shot, Burst, Called Shot, Walking Fire and Punch Through (fire.ts).
import { describe, it, expect, beforeEach } from 'vitest';
import { phys, WEAPON, coverOf, objectsAt, d20, condOn } from '../src';
import { physFight, rig } from './helpers/physfight';

// ---------- helpers (an integrator may move these to helpers/physfight-ranged.ts) ----------
type F = ReturnType<typeof physFight>;
/** One gunner at C5 against foes (default: a soldier at H5), on the gunner's turn. */
function gunner(weapon: string, known: string[] = [], foes: any[] = [{ at: 'H5', tier: 'soldier' }], pc: any = {}): F {
  const f = physFight([{ weapon, known, skills: { dexterity: 6 }, ...pc }], foes);
  f.put(f.pc, 'C5'); foes.forEach((x, i) => { if (x.at) f.put(f.foes[i], x.at); }); f.turn(f.pc);
  return f;
}
/** Put a weapon in the off hand of the first PC, on the character and the unit alike (the reducer's swap reads both). */
function offHand(f: F, weaponId: string) {
  const c: any = f.char(f.pc), u = f.unit(f.pc.id), n = WEAPON[weaponId].magazine ?? 0;
  c.offHand = { id: weaponId, loaded: n }; u.offWeapon = weaponId; u.offAmmo = n;
}
/** The to-hit totals of the attack lines written to the log since `from` (d20 + total = sum vs Defense). */
function rolls(f: F, from: number): number[] {
  return f.cb.log.slice(from).map((l) => /: d20 (\d+) ([+−])(\d+)/.exec(l)).filter(Boolean).map((m) => (m![2] === '−' ? -1 : 1) * Number(m![3]));
}
/** Seed the game's dice so that the d20 after `skip` rolls (an attack's own die is one, even when rigged) is in [lo, hi]. */
function nextDie(f: F, lo: number, hi: number, skip = 1) {
  for (let st = 1; st < 100000; st++) { const r = { state: st }; for (let i = 0; i < skip; i++) d20(r); const v = d20(r); if (v >= lo && v <= hi) { f.g.rng.state = st; return; } }
}
/** The target fails its next save (a low die and a hopeless bonus). */
const failsSave = (f: F, u: { id: string }) => { (f.unit(u.id) as any).sv = { body: -50, brain: -50, heart: -50 }; nextDie(f, 2, 10); };
const term = (pv: phys.TechPreview, i: number, label: string) => pv.attacks[i].pv.terms!.find((t) => t.label === label)?.v;
const same = (f: F, fn: () => void) => { const before = JSON.stringify(f.g); fn(); expect(JSON.stringify(f.g)).toBe(before); };

beforeEach(() => rig(null));

describe('Snap Shot', () => {
  const fight = (main = 'sabre', off = 'service_pistol') => { const f = gunner(main, ['snap_shot']); offHand(f, off); return f; };
  it('swaps the off-hand gun to the main hand with no AP for the swap, then fires (2 AP in all)', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    const pv = f.pv('snap_shot', { targetId: f.foe.id, hand: 'off' });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(2); expect(pv.rounds).toBe(1);
    expect(f.tech('snap_shot', { targetId: f.foe.id, hand: 'off' })).toBeNull();
    expect(f.pc.weapon).toBe('service_pistol'); expect(f.pc.offWeapon).toBe('sabre'); expect(f.char(f.pc).weapon).toBe('service_pistol');
    expect(f.pc.ap).toBe(4); expect(f.pc.ammo).toBe(11); expect(f.pressure(f.foe)).toBe(1);
  });
  it('Quick: no penalty; without Quick: −2', () => {
    const f = fight(); const pv = f.pv('snap_shot', { targetId: f.foe.id, hand: 'off' });
    expect(term(pv, 0, 'Snap Shot')).toBeUndefined();
    const g = fight('sabre', 'frontier_hand_cannon'); const gv = g.pv('snap_shot', { targetId: g.foe.id, hand: 'off' });
    expect(gv.ok).toBe(true); expect(term(gv, 0, 'Snap Shot')).toBe(-2);
  });
  it('Heavy: not available', () => {
    const f = gunner('hellraiser_lmg', ['snap_shot']);
    expect(f.tech('snap_shot', { targetId: f.foe.id })).toMatch(/Not available with a heavy weapon/);
    expect(f.pc.ap).toBe(6);
  });
  it('a swap the gear rules refuse is refused, and nothing is spent', () => {
    const f = gunner('hellraiser_service_rifle', ['snap_shot']); offHand(f, 'service_pistol'); // a two-handed rifle in the main hand
    expect(f.tech('snap_shot', { targetId: f.foe.id, hand: 'off' })).toMatch(/needs both hands/);
    expect(f.pc.ap).toBe(6); expect(f.pc.weapon).toBe('hellraiser_service_rifle');
  });
  it('in the main hand already it is the shot alone, at −2 without Quick', () => {
    const f = gunner('ccec_marksman_rifle', ['snap_shot']); rig({ hit: false, die: 5 });
    const pv = f.pv('snap_shot', { targetId: f.foe.id }); expect(pv.ok).toBe(true); expect(term(pv, 0, 'Snap Shot')).toBe(-2);
    expect(f.tech('snap_shot', { targetId: f.foe.id })).toBeNull(); expect(f.pc.ap).toBe(4); expect(f.pressure(f.foe)).toBe(0); // a miss: no Pressure
  });
  it('an enemy fires its off-hand gun with no swap', () => {
    const f = gunner('sabre', [], [{ at: 'H5', tier: 'elite', weapon: 'sabre' }]); const foe = f.unit(f.foe.id);
    foe.offWeapon = 'service_pistol'; foe.offAmmo = 12; (foe as any).techs = ['snap_shot']; f.turn(f.foe); rig({ hit: true, die: 12 });
    expect(f.use(f.foe, 'snap_shot', { targetId: f.pc.id, hand: 'off' })).toBeNull();
    expect(f.foe.weapon).toBe('sabre'); expect(f.foe.offAmmo).toBe(11); expect(f.pressure(f.pc)).toBe(1);
  });
  it('the preview matches the action and changes nothing', () => {
    const f = fight(); rig({ die: 12 }); let pv!: phys.TechPreview;
    same(f, () => { pv = f.pv('snap_shot', { targetId: f.foe.id, hand: 'off' }); });
    const at = f.cb.log.length; f.tech('snap_shot', { targetId: f.foe.id, hand: 'off' });
    expect(rolls(f, at)).toEqual([pv.attacks[0].pv.toHit]);
  });
});

describe('Burst', () => {
  it('base: two rolls at one target, the second at −2, three rounds, no Recoil inside the burst', () => {
    const f = gunner('ccec_marksman_rifle', ['burst'], undefined, { skills: { dexterity: 0 } }); rig({ hit: false, die: 5 });
    const pv = f.pv('burst', { targetId: f.foe.id });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(3); expect(pv.attacks.length).toBe(2);
    expect(term(pv, 1, 'Burst')).toBe(-2); expect(term(pv, 1, 'recoil')).toBeUndefined();
    const a0 = f.pc.ammo, h0 = f.pc.heat, at = f.cb.log.length;
    expect(f.tech('burst', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ap).toBe(3); expect(f.pc.ammo).toBe(a0 - 3); expect(f.pc.heat).toBe(h0 + 2); // two rolls' Heat, no cooling without Auto
    expect(rolls(f, at)).toEqual(pv.attacks.map((a) => a.pv.toHit));
    expect(f.pressure(f.foe)).toBe(0); // a miss gives none
  });
  it('Recoil from earlier shots still applies to the first roll', () => {
    const f = gunner('ccec_marksman_rifle', ['burst'], undefined, { skills: { dexterity: 0 } }); rig({ hit: false, die: 5 });
    f.tech('shot', { targetId: f.foe.id });
    const pv = f.pv('burst', { targetId: f.foe.id }); expect(term(pv, 0, 'recoil')).toBe(-1); expect(term(pv, 1, 'recoil')).toBeUndefined();
  });
  it('Quick: no −2', () => {
    const f = gunner('service_pistol', ['burst']); const pv = f.pv('burst', { targetId: f.foe.id });
    expect(pv.attacks.length).toBe(2); expect(term(pv, 1, 'Burst')).toBeUndefined();
  });
  it('Auto: today\'s burst (three rolls, each later one −1; the barrel cools 1), offered without knowing it', () => {
    const f = gunner('hellraiser_service_rifle'); rig({ hit: true, die: 12 });
    const pv = f.pv('burst', { targetId: f.foe.id });
    expect(pv.ok).toBe(true); expect(pv.attacks.length).toBe(3); expect(pv.rounds).toBe(3);
    expect([term(pv, 0, 'Burst'), term(pv, 1, 'Burst'), term(pv, 2, 'Burst')]).toEqual([undefined, -1, -2]);
    const a0 = f.pc.ammo, h0 = f.pc.heat, fx0 = f.fx('volley').length;
    f.foe.hp = f.unit(f.foe.id).maxHp = 999;
    expect(f.tech('burst', { targetId: f.foe.id })).toBeNull();
    expect(f.pc.ammo).toBe(a0 - 3); expect(f.pc.heat).toBe(h0 + 2); expect(f.pc.ap).toBe(3);
    expect(f.fx('volley').length).toBe(fx0 + 1); expect(f.fx('volley').at(-1)).toMatchObject({ mode: 'burst', shots: 3, unit: f.pc.id });
    expect(f.pressure(f.foe)).toBe(1); // the first hit on it this turn; the later ones give none
  });
  it('Auto: splits between two adjacent targets; not two apart, and not without Auto', () => {
    const f = gunner('hellraiser_service_rifle', [], [{ at: 'H5' }, { at: 'H6' }, { at: 'H8' }]); rig({ hit: true, die: 12 });
    const [a, b, c] = f.foes.map((x) => x.id);
    expect(f.pv('burst', { targetIds: [a, c] }).why).toMatch(/next to each other/);
    const pv = f.pv('burst', { targetIds: [a, b] }); expect(pv.attacks.map((x) => x.target)).toEqual([a, b, b]);
    expect(f.tech('burst', { targetIds: [a, b] })).toBeNull(); expect(f.pressure(f.foes[0])).toBe(1); expect(f.pressure(f.foes[1])).toBe(1);
    const g = gunner('ccec_marksman_rifle', ['burst'], [{ at: 'H5' }, { at: 'H6' }]);
    expect(g.tech('burst', { targetIds: g.foes.map((x) => x.id) })).toMatch(/Only an automatic weapon/);
  });
  it('is refused with the count when the magazine can\'t pay, and the burst stops at a kill', () => {
    const f = gunner('hellraiser_service_rifle'); f.unit(f.pc.id).ammo = 2;
    expect(f.tech('burst', { targetId: f.foe.id })).toBe('Needs 3 rounds, 2 loaded.'); expect(f.pc.ap).toBe(6);
    const g = gunner('hellraiser_service_rifle'); rig({ hit: true, die: 20 }); g.unit(g.foe.id).hp = 1; const a0 = g.pc.ammo;
    expect(g.tech('burst', { targetId: g.foe.id })).toBeNull(); expect(g.foe.dead).toBe(true); expect(g.pc.ammo).toBe(a0 - 1); // the rest stay loaded
  });
  it('raises volley_end for Spray and Pray, with the targets', async () => {
    const { onHook } = await import('../src/effects/hooks'); const seen: any[] = [];
    onHook('volley_end', (ctx: any) => seen.push({ mode: ctx.mode, hits: (ctx.hits || []).map((u: any) => u.id) }));
    const f = gunner('hellraiser_service_rifle'); rig({ hit: false, die: 5 }); f.tech('burst', { targetId: f.foe.id });
    expect(seen.at(-1)).toEqual({ mode: 'burst', hits: [f.foe.id] });
  });
  it('the caps hold: an elite stops at 3, a boss at 2, a player at 3', () => {
    for (const [tier, cap] of [['elite', 3], ['boss', 2]] as const) {
      const f = gunner('hellraiser_service_rifle', [], [{ at: 'H5', tier }]); rig({ hit: true, die: 12 }); f.unit(f.foe.id).hp = 999; f.press(f.foe, cap, f.pc);
      f.tech('burst', { targetId: f.foe.id }); expect(f.pressure(f.foe)).toBe(cap);
    }
    const g = gunner('sabre', [], [{ at: 'H5', tier: 'elite', weapon: 'hellraiser_service_rifle' }]); g.press(g.pc, 3, g.foe); g.unit(g.pc.id).hp = 999; g.turn(g.foe); rig({ hit: true, die: 12 });
    expect(g.use(g.foe, 'burst', { targetId: g.pc.id })).toBeNull(); expect(g.pressure(g.pc)).toBe(3);
  });
  it('the preview matches the action and changes nothing', () => {
    const f = gunner('hellraiser_service_rifle', [], [{ at: 'H5', tier: 'boss' }]); rig({ hit: false, die: 9 }); f.unit(f.pc.id).heat = 1; let pv!: phys.TechPreview;
    same(f, () => { pv = f.pv('burst', { targetId: f.foe.id }); });
    const at = f.cb.log.length; f.tech('burst', { targetId: f.foe.id });
    expect(rolls(f, at)).toEqual(pv.attacks.map((a) => a.pv.toHit)); // the later rolls see the Heat the earlier ones add
  });
});

describe('Called Shot', () => {
  const fight = (weapon = 'service_pistol', foe: any = {}) => { const f = gunner(weapon, ['called_shot'], [{ at: 'H5', tier: 'soldier', ...foe }]); f.unit(f.foe.id).hp = 999; return f; };
  it('needs a part named; −2 to hit; 3 AP and a round', () => {
    const f = fight(); expect(f.tech('called_shot', { targetId: f.foe.id })).toMatch(/leg, arm or head/); expect(f.pc.ap).toBe(6);
    const pv = f.pv('called_shot', { targetId: f.foe.id, opt: 'head' }); expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1);
    expect(term(pv, 0, 'Called Shot')).toBe(-2); expect(pv.saves?.[0]).toMatchObject({ unit: f.foe.id, skills: ['body'], tn: 12 });
  });
  it('a hit: leg Slowed, arm weapon lowered, head Dazed, unless the Body save holds', () => {
    for (const [part, id] of [['leg', 'slowed'], ['arm', 'lowered'], ['head', 'dazed']] as const) {
      const f = fight(); failsSave(f, f.foe); rig({ hit: true, die: 12 });
      expect(f.tech('called_shot', { targetId: f.foe.id, opt: part })).toBeNull(); expect(id === 'dazed' ? f.foe.dazedNext : condOn(f.foe, id), part).toBeTruthy(); // Dazed is a flag: −2 AP next turn
      expect(f.pc.ap).toBe(3); expect(f.pressure(f.foe)).toBe(1);
    }
    const g = fight(); g.unit(g.foe.id).sv = { body: 50 } as any; rig({ hit: true, die: 12 });
    g.tech('called_shot', { targetId: g.foe.id, opt: 'head' }); expect(g.foe.dazedNext).toBeFalsy();
  });
  it('a miss does nothing but spend', () => {
    const f = fight(); rig({ hit: false, die: 5 }); f.tech('called_shot', { targetId: f.foe.id, opt: 'leg' });
    expect(f.foe.conds?.slowed).toBeFalsy(); expect(f.pressure(f.foe)).toBe(0); expect(f.pc.ammo).toBe(11);
  });
  it('Precise: no penalty', () => {
    const f = fight('ccec_marksman_rifle'); expect(term(f.pv('called_shot', { targetId: f.foe.id, opt: 'arm' }), 0, 'Called Shot')).toBeUndefined();
  });
  it('Loud or Heavy: leg is Prone instead (a stop: Stopped once blocks a second)', () => {
    const f = fight('magistrate_pistol'); failsSave(f, f.foe); rig({ hit: true, die: 12 });
    expect(f.tech('called_shot', { targetId: f.foe.id, opt: 'leg' })).toBeNull();
    expect(f.foe.prone).toBe(true); expect(f.foe.conds?.slowed).toBeFalsy(); expect(f.foe.stopped).toBe(1);
    f.unit(f.foe.id).prone = false; failsSave(f, f.foe); f.tech('called_shot', { targetId: f.foe.id, opt: 'leg' }); expect(f.foe.prone).toBe(false);
    const h = fight('hellraiser_lmg'); h.unit(h.pc.id).braced = true; failsSave(h, h.foe); rig({ hit: true, die: 12 });
    h.tech('called_shot', { targetId: h.foe.id, opt: 'leg' }); expect(h.foe.prone).toBe(true);
    const p = fight(); failsSave(p, p.foe); rig({ hit: true, die: 12 }); // a quiet pistol: Slowed
    p.tech('called_shot', { targetId: p.foe.id, opt: 'leg' }); expect(p.foe.prone).toBeFalsy(); expect(p.foe.conds?.slowed).toBeTruthy();
  });
  it('Spread: only within 4 tiles', () => {
    const f = fight('sawn_off'); expect(f.tech('called_shot', { targetId: f.foe.id, opt: 'arm' })).toMatch(/within 4 tiles/);
    f.put(f.foe, 'G5'); expect(f.pv('called_shot', { targetId: f.foe.id, opt: 'arm' }).ok).toBe(true);
    const g = fight(); expect(g.pv('called_shot', { targetId: g.foe.id, opt: 'arm' }).ok).toBe(true); // no Spread: no limit
  });
  it('the preview matches the action and changes nothing', () => {
    const f = fight(); rig({ die: 11 }); let pv!: phys.TechPreview;
    same(f, () => { pv = f.pv('called_shot', { targetId: f.foe.id, opt: 'head' }); });
    const at = f.cb.log.length; f.tech('called_shot', { targetId: f.foe.id, opt: 'head' }); expect(rolls(f, at)).toEqual([pv.attacks[0].pv.toHit]);
  });
});

describe('Walking Fire', () => {
  const fight = (weapon = 'ccec_marksman_rifle', foes: any[] = [{ at: 'H5', tier: 'soldier' }]) => { const f = gunner(weapon, ['walking_fire'], foes); f.foes.forEach((x) => { f.unit(x.id).hp = 999; }); return f; };
  it('moves 2 tiles and fires once, for 3 AP and a round; the move costs nothing more', () => {
    const f = fight(); rig({ hit: true, die: 12 });
    const pv = f.pv('walking_fire', { targetId: f.foe.id, tile: f.tile('C7') });
    expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1); expect(pv.moves?.[0]).toEqual({ unit: f.pc.id, to: f.tile('C7') });
    expect(f.tech('walking_fire', { targetId: f.foe.id, tile: f.tile('C7') })).toBeNull();
    expect(f.pc.pos).toBe(f.tile('C7')); expect(f.pc.ap).toBe(3); expect(f.pc.ammo).toBe(9); expect(f.pressure(f.foe)).toBe(1);
  });
  it('is refused past 2 tiles, without a tile, and while Pinned; nothing is spent', () => {
    const f = fight();
    expect(f.tech('walking_fire', { targetId: f.foe.id, tile: f.tile('C8') })).toMatch(/moves 2 tiles/);
    expect(f.tech('walking_fire', { targetId: f.foe.id })).toMatch(/tile the move ends/);
    f.unit(f.pc.id).conds = { pinned: 1 } as any; expect(f.tech('walking_fire', { targetId: f.foe.id, tile: f.tile('C6') })).toBeTruthy();
    expect(f.pc.ap).toBe(6); expect(f.pc.pos).toBe(f.tile('C5'));
  });
  it('fires from the point named in opt (0: before the first step), and from the best point by default', () => {
    const f = fight(); rig({ hit: false, die: 5 });
    // stepping out from behind the wall at F5 toward a target behind it: the shot from C5 has no cover in the way either way;
    // name the point and the shot comes from there (the log line follows the first leg of the move)
    expect(f.tech('walking_fire', { targetId: f.foe.id, tile: f.tile('C7'), opt: '1' })).toBeNull();
    const i = f.cb.log.findIndex((l) => / fires at /.test(l)), moves = f.cb.log.map((l, k) => (/ moves to /.test(l) ? k : -1)).filter((k) => k >= 0);
    expect(moves.length).toBe(2); expect(moves[0]).toBeLessThan(i); expect(moves[1]).toBeGreaterThan(i);
    f.turn(f.pc); expect(f.tech('walking_fire', { targetId: f.foe.id, tile: f.pc.pos, opt: '3' })).toMatch(/0 to 0/);
    // the default: the point with the best chance, the earliest on a tie (from C5 the pistol is a range band short; D5
    // and E5 are both in its first band)
    const g = fight('service_pistol', [{ at: 'L5' }]); const pv = g.pv('walking_fire', { targetId: g.foe.id, tile: g.tile('E5') });
    expect(pv.ok).toBe(true); expect(pv.notes.some((n) => /Fires from D5, moving to E5/.test(n))).toBe(true); expect(pv.attacks[0].pv.rangePenalty + 0).toBe(0);
  });
  it('Quick: 3 tiles and no opportunity attacks; without Quick the move draws them', () => {
    const f = fight('lever_carbine', [{ at: 'C6', tier: 'soldier', weapon: 'sabre' }, { at: 'J5' }]); rig({ hit: false, die: 5 });
    expect(f.pv('walking_fire', { targetId: f.foes[1].id, tile: f.tile('C2') }).ok).toBe(true); // 3 tiles
    f.tech('walking_fire', { targetId: f.foes[1].id, tile: f.tile('C2') });
    expect(f.cb.log.some((l) => /opportunity attack/.test(l))).toBe(false); expect(f.pc.pos).toBe(f.tile('C2'));
    const g = fight('ccec_marksman_rifle', [{ at: 'C6', tier: 'soldier', weapon: 'sabre' }, { at: 'J5' }]); rig({ hit: false, die: 5 });
    expect(g.tech('walking_fire', { targetId: g.foes[1].id, tile: g.tile('C3') })).toBeNull();
    expect(g.cb.log.some((l) => /takes an opportunity attack/.test(l))).toBe(true);
  });
  it('Auto: the shot is a Burst for 3 rounds (refused with fewer loaded)', () => {
    const f = fight('hellraiser_service_rifle'); rig({ hit: true, die: 12 }); const a0 = f.pc.ammo, h0 = f.pc.heat;
    const pv = f.pv('walking_fire', { targetId: f.foe.id, tile: f.tile('C6') }); expect(pv.attacks.length).toBe(3); expect(pv.rounds).toBe(3);
    expect(f.tech('walking_fire', { targetId: f.foe.id, tile: f.tile('C6') })).toBeNull();
    expect(f.pc.ammo).toBe(a0 - 3); expect(f.pc.heat).toBe(h0 + 2); expect(f.pc.ap).toBe(3);
    const g = fight('hellraiser_service_rifle'); g.unit(g.pc.id).ammo = 2;
    expect(g.tech('walking_fire', { targetId: g.foe.id, tile: g.tile('C6') })).toBe('Needs 3 rounds, 2 loaded.'); expect(g.pc.pos).toBe(g.tile('C5'));
  });
  it('Heavy: not available', () => {
    const f = fight('hellraiser_lmg'); expect(f.tech('walking_fire', { targetId: f.foe.id, tile: f.tile('C6') })).toMatch(/heavy/);
  });
  it('a held shot fires on the move', () => {
    const f = fight('ccec_marksman_rifle', [{ at: 'J5', tier: 'soldier', weapon: 'ccec_marksman_rifle' }]); rig({ hit: false, die: 5 });
    f.turn(f.foe); expect(f.use(f.foe, 'overwatch', {})).toBeNull(); f.turn(f.pc);
    f.tech('walking_fire', { targetId: f.foe.id, tile: f.tile('C7') }); expect(f.foe.watch).toBeUndefined(); expect(f.foe.reactUsed?.n).toBe(1);
  });
  it('the preview matches the action and changes nothing', () => {
    const f = fight(); rig({ die: 11 }); let pv!: phys.TechPreview;
    same(f, () => { pv = f.pv('walking_fire', { targetId: f.foe.id, tile: f.tile('D7') }); });
    const at = f.cb.log.length; f.tech('walking_fire', { targetId: f.foe.id, tile: f.tile('D7') }); expect(rolls(f, at)).toEqual([pv.attacks[0].pv.toHit]);
  });
});

describe('Punch Through', () => {
  // the target at G5 stands behind the low wall at F5 (half cover)
  const fight = (weapon = 'ccec_marksman_rifle', foes: any[] = [{ at: 'G5', tier: 'soldier' }]) => { const f = gunner(weapon, ['punch_through'], foes); f.foes.forEach((x) => { f.unit(x.id).hp = 999; }); return f; };
  /** The wall the target uses, made sturdy enough to take a few rounds. */
  const wall = (f: F, hp = 500) => { const t = f.pv('shot', { targetId: f.foe.id }).attacks[0].pv.coverTile!; const o = objectsAt(f.cb, t).find((x) => x.hp != null)!; o.hp = o.max = hp; return { tile: t, hp: () => coverOf(f.cb)[t]?.hp ?? 0 }; };
  it('half cover counts −2, not −5; 3 AP and a round', () => {
    const f = fight(); const shot = f.pv('shot', { targetId: f.foe.id }).attacks[0].pv, pv = f.pv('punch_through', { targetId: f.foe.id });
    expect(shot.cover).toBe(5); expect(pv.ok).toBe(true); expect(pv.ap).toBe(3); expect(pv.rounds).toBe(1);
    expect(term(pv, 0, 'half cover (Punch Through)')).toBe(-2); expect(term(pv, 0, 'half cover')).toBeUndefined();
    expect(pv.attacks[0].pv.toHit).toBe(shot.toHit - (shot.terms!.find((t) => t.label === 'Shot')?.v || 0) + 3);
  });
  it('the cover takes the damage on a hit and on a miss; Pressure only on a hit', () => {
    const f = fight(); const w = wall(f), hp0 = w.hp(); rig({ hit: false, die: 5 });
    expect(f.tech('punch_through', { targetId: f.foe.id })).toBeNull(); expect(w.hp()).toBeLessThan(hp0); expect(f.pressure(f.foe)).toBe(0);
    const hp1 = w.hp(); f.turn(f.pc); rig({ hit: true, die: 12 }); const fhp = f.foe.hp;
    f.tech('punch_through', { targetId: f.foe.id }); expect(f.foe.hp).toBeLessThan(fhp); expect(w.hp()).toBeLessThan(hp1); expect(f.pressure(f.foe)).toBe(1);
  });
  it('with no half cover in the way it is a plain shot', () => {
    const f = fight('ccec_marksman_rifle', [{ at: 'H8' }]); const pv = f.pv('punch_through', { targetId: f.foe.id });
    expect(pv.ok).toBe(true); expect(term(pv, 0, 'half cover (Punch Through)')).toBeUndefined(); expect(pv.notes.length).toBe(0);
  });
  it('Blast or Spread: the half cover is destroyed', () => {
    const f = fight('lumeri_scattergun'); const w = wall(f); f.put(f.pc, 'D5'); rig({ hit: false, die: 5 });
    expect(f.pv('punch_through', { targetId: f.foe.id }).notes.some((n) => /destroyed/.test(n))).toBe(true);
    f.tech('punch_through', { targetId: f.foe.id }); expect(coverOf(f.cb)[w.tile]).toBeUndefined();
    expect(objectsAt(f.cb, w.tile).some((o) => o.kind === 'rubble')).toBe(true);
    const g = fight(); const v = wall(g), hp0 = v.hp(); rig({ hit: false, die: 5 }); g.tech('punch_through', { targetId: g.foe.id });
    expect(v.hp()).toBeGreaterThan(0); expect(v.hp()).toBeLessThan(hp0); // without them the wall stands
  });
  it('a weapon with Heavy and Blast uses the line the player picks', () => {
    const f = fight('smetanita_thumper', [{ at: 'G5' }, { at: 'J5' }]); const w = wall(f); f.put(f.pc, 'B5'); rig({ hit: false, die: 5 });
    expect(f.pv('punch_through', { targetId: f.foes[0].id }).notes.some((n) => /destroyed/.test(n))).toBe(false); // Heavy by default
    expect(f.pv('punch_through', { targetId: f.foes[0].id, line: 'blast' }).notes.some((n) => /destroyed/.test(n))).toBe(true);
    expect(f.tech('punch_through', { targetId: f.foes[0].id, line: 'blast' })).toBeNull(); expect(coverOf(f.cb)[w.tile]).toBeUndefined();
  });
  it('Heavy: on a hit the round carries on to the next enemy in line at half; not on a miss', () => {
    const f = fight('hellraiser_lmg', [{ at: 'G5' }, { at: 'J5' }]); f.unit(f.pc.id).braced = true; rig({ hit: true, die: 12 });
    const [a, b] = f.foes; const pv = f.pv('punch_through', { targetId: a.id });
    expect(pv.attacks.length).toBe(1); expect(pv.rounds).toBe(1); expect(pv.notes.some((n) => n.includes(b.name))).toBe(true);
    const hb = f.unit(b.id).hp, a0 = f.pc.ammo;
    expect(f.tech('punch_through', { targetId: a.id })).toBeNull();
    expect(f.unit(b.id).hp).toBeLessThan(hb); expect(f.pc.ammo).toBe(a0 - 1); expect(f.pressure(b)).toBe(1);
    const g = fight('hellraiser_lmg', [{ at: 'G5' }, { at: 'J5' }]); g.unit(g.pc.id).braced = true; rig({ hit: false, die: 5 });
    const hb2 = g.unit(g.foes[1].id).hp; g.tech('punch_through', { targetId: g.foes[0].id }); expect(g.unit(g.foes[1].id).hp).toBe(hb2);
    const p = fight('ccec_marksman_rifle', [{ at: 'G5' }, { at: 'J5' }]); rig({ hit: true, die: 12 }); // no Heavy: it stops in the first
    const hb3 = p.unit(p.foes[1].id).hp; p.tech('punch_through', { targetId: p.foes[0].id }); expect(p.unit(p.foes[1].id).hp).toBe(hb3);
  });
  it('the preview matches the action and changes nothing', () => {
    const f = fight(); rig({ die: 11 }); let pv!: phys.TechPreview;
    same(f, () => { pv = f.pv('punch_through', { targetId: f.foe.id }); });
    const at = f.cb.log.length; f.tech('punch_through', { targetId: f.foe.id }); expect(rolls(f, at)).toEqual([pv.attacks[0].pv.toHit]);
  });
});

describe('the pad and the AI', () => {
  it('none of them say "not built yet"', () => {
    const f = gunner('hellraiser_service_rifle', ['snap_shot', 'called_shot', 'walking_fire', 'punch_through']);
    const e = f.pad().flatMap((g) => g.entries).filter((x) => ['snap_shot', 'burst', 'called_shot', 'walking_fire', 'punch_through'].includes(x.id));
    expect(e.length).toBe(5); for (const x of e) expect(x.built, x.id).toBe(true);
  });
  it('the AI scores are pure and pick a part for Called Shot', () => {
    const f = gunner('magistrate_pistol', ['called_shot', 'punch_through']); const before = JSON.stringify(f.g);
    const s = f.bound(() => phys.aiScore(f.cb, f.pc, 'called_shot', { targetId: f.foe.id })); expect(s.score).toBe(4); expect(s.args.opt).toBe('leg');
    f.bound(() => phys.aiScore(f.cb, f.pc, 'punch_through', { targetId: f.foe.id }));
    expect(JSON.stringify(f.g)).toBe(before);
  });
});
