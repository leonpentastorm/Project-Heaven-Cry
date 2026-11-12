// The rolls (src/rolls.ts, engine foundations 1, F1): one die, one result, one sentence, one effect event; and the
// ruling "a save is a save" (an item that changes saves changes every save, whatever asked for it).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import {
  rollD20, judge, rollVs, rollSave, contest, rerollAttack, attackHits, passFaces, rollText, SAVE_TN, TN, CONTEST_BASE, DEATH_SAVE_TN, tierSave, tierStrength,
  saveAgainst, saveTn, applyCond, trySurrender, hazardHit, unitSave, d20, RULES, type Unit,
} from '../src';
import { onHook } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

/** An rng state whose next d20s are these. */
function seedFor(...ns: number[]): number { for (let s = 1; s < 3_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const fx = (cb: any, k: string) => (cb.fx || []).filter((e: any) => e.k === k);
/** A stand-in for an item on the two save hooks (test only): set for one test, cleared after. */
const ITEM: { cond?: ((ctx: any) => void) | null; save?: ((ctx: any) => void) | null } = {};
onHook('cond_apply', (ctx: any) => { ITEM.cond?.(ctx); });
onHook('save', (ctx: any) => { ITEM.save?.(ctx); });
const clear = () => { ITEM.cond = null; ITEM.save = null; };

describe('rolls: the numbers come from data/rules.json', () => {
  it('the save base TN, the check ladder, the contest base, the death save and the tier tables', () => {
    const R: any = RULES;
    expect(SAVE_TN).toBe(R.conditions_rules.save_base_tn); expect(SAVE_TN).toBe(12);
    expect(TN).toEqual(R.resolution.tn_ladder); expect(TN).toEqual({ easy: 8, standard: 12, hard: 16, heroic: 20 });
    expect(CONTEST_BASE).toBe(R.rolls.contest_base); expect(DEATH_SAVE_TN).toBe(R.rolls.death_save_tn);
    for (const [tier, n] of Object.entries(R.rolls.npc_save_by_tier)) expect(tierSave(tier)).toBe(n);
    for (const [tier, n] of Object.entries(R.rolls.npc_strength_by_tier)) expect(tierStrength(tier)).toBe(n);
    expect(tierSave(undefined)).toBe(0); expect(tierSave('boss')).toBe(3); expect(tierStrength('boss')).toBe(2);
  });
});

describe('rolls: judge, rollD20, rollVs, contest', () => {
  it('a natural 20 passes and a natural 1 fails whatever the total; nat: false reads the total only; over: must beat it', () => {
    expect(judge('roll', { die: 20 }, -9, 40).ok).toBe(true); expect(judge('roll', { die: 20 }, -9, 40).nat).toBe(20);
    expect(judge('roll', { die: 1 }, 30, 5).ok).toBe(false); expect(judge('roll', { die: 1 }, 30, 5).nat).toBe(1);
    expect(judge('roll', { die: 20 }, -9, 40, { nat: false }).ok).toBe(false); expect(judge('roll', { die: 1 }, 30, 5, { nat: false })).toMatchObject({ ok: true, nat: null });
    expect(judge('roll', { die: 10 }, 2, 12).ok).toBe(true); expect(judge('roll', { die: 10 }, 2, 12, { over: true }).ok).toBe(false);
    expect(judge('roll', { die: 9 }, [{ add: 2, label: 'a' }, { add: -1, label: 'b' }], 10)).toMatchObject({ die: 9, mod: 1, total: 10, tn: 10, ok: true });
  });
  it('the one sentence: "d20 12 +2 = 14 vs 15", a family save names the family, a natural die is said', () => {
    expect(judge('roll', { die: 12 }, 2, 15).text).toBe('d20 12 +2 = 14 vs 15');
    expect(judge('roll', { die: 7 }, -1, 12).text).toBe('d20 7 −1 = 6 vs 12');
    expect(judge('save', { die: 1 }, 3, 12, { fam: 'heart' }).text).toBe('heart save d20 1 +3 = 4 vs 12, natural 1');
    expect(judge('roll', { die: 20 }, 0, 30).text).toBe('d20 20 +0 = 20 vs 30, natural 20');
    expect(judge('roll', { die: 15, dice: [4, 15] }, 0, 10).text).toBe('d20 4/15 → 15 +0 = 15 vs 10');
    expect(rollText({ die: 3, mod: 1, total: 4, tn: 8 }, 'Empathy')).toBe('Empathy d20 3 +1 = 4 vs 8');
  });
  it('rollD20 draws one die, two with advantage (the higher is kept, both are drawn in order)', () => {
    const s = seedFor(4, 15), r1 = { state: s }, r2 = { state: s };
    expect(rollD20(r1)).toEqual({ die: 4, dice: [4] }); expect(rollD20(r2, { adv: true })).toEqual({ die: 15, dice: [4, 15] });
    expect(d20(r1)).toBe(15); // one die was drawn without advantage, two with it
  });
  it('rollVs emits the roll event for a unit on the grid; contest: the higher total wins, the defender keeps a tie', () => {
    const f = fightWith([{}], [{}]); const cb = f.cb, u = f.pc;
    const r = rollVs(cb, { state: seedFor(11) }, { by: u, mod: 2, tn: 13, why: 'test' });
    expect(r).toMatchObject({ die: 11, mod: 2, total: 13, ok: true });
    expect(fx(cb, 'roll').pop()).toMatchObject({ roll: 'roll', unit: u.id, why: 'test', die: 11, mod: 2, total: 13, tn: 13, ok: true });
    const tie = contest(cb, { state: seedFor(10, 12) }, { by: u, mod: 2 }, { by: f.foe, mod: 0 }, 'grapple');
    expect(tie.won).toBe(false); expect(tie.text).toBe('d20 10 +2 = 12 vs d20 12 +0 = 12');
    expect(contest(null, { state: seedFor(10, 12) }, { mod: 3 }, { mod: 0 }).won).toBe(true);
  });
  it('passFaces, attackHits and rerollAttack', () => {
    expect(passFaces(0, 12)).toBe(9); expect(passFaces(50, 12)).toBe(19); expect(passFaces(-50, 12)).toBe(1);
    expect(attackHits({ die: 1, critMin: 20, toHit: 99, need: 5 })).toBe(false); expect(attackHits({ die: 19, critMin: 19, toHit: 0, need: 99 })).toBe(true); expect(attackHits({ die: 10, critMin: 20, toHit: 3, need: 13 })).toBe(true);
    const rc: any = { die: 2, hit: false, critMin: 20, toHit: 0, need: 14 };
    expect(rerollAttack(rc, { state: seedFor(10) }, 5)).toBe(10); expect(rc).toMatchObject({ die: 10, hit: true }); // 10 + 0 + 5 >= 14
    rerollAttack(rc, { state: seedFor(10) }); expect('hit' in rc).toBe(false);
  });
});

describe('rolls: rollSave and "a save is a save"', () => {
  it('a save: d20 + the family save against 12 + the strength; the roll event and the sentence come from the result', () => {
    const f = fightWith([{}], [{ tier: 'soldier', classic: true }]); const cb = f.cb, t = f.foe, by = f.pc;
    const sv = withGame(f.g, () => saveAgainst(cb, { state: seedFor(9) }, by, t, 'body', 'pinned', { via: 'raw_power' }));
    expect(sv.kind).toBe('save'); expect(sv.die).toBe(9); expect(sv.mod).toBe(unitSave(t, 'body')); expect(sv.tn).toBe(saveTn(by, 'raw_power'));
    expect(sv.text).toBe('body save d20 9 ' + (sv.mod >= 0 ? '+' : '−') + Math.abs(sv.mod) + ' = ' + sv.total + ' vs ' + sv.tn);
    expect(fx(cb, 'roll').pop()).toMatchObject({ roll: 'save', unit: t.id, by: by.id, fam: 'body', why: 'pinned', die: 9, total: sv.total, tn: sv.tn, ok: sv.ok });
  });
  it('an item that changes saves through cond_apply changes EVERY save: a condition, a talk-down, a hazard, a bare rollSave', () => {
    const f = fightWith([{}], [{ tier: 'soldier', classic: true }]); const cb = f.cb, t: Unit = f.foe, by = f.pc;
    const seen: string[] = [];
    ITEM.cond = (ctx: any) => { if (ctx.t === t && !ctx.skipSave) { ctx.saveAdd += 4; ctx.tnAdd += 1; seen.push(ctx.id); } };
    try {
      withGame(f.g, () => {
        const base = unitSave(t, 'heart');
        const a = saveAgainst(cb, { state: seedFor(5) }, by, t, 'heart', 'surrender', { via: 'charisma' });
        expect(a.mod).toBe(base + 4); expect(a.tn).toBe(saveTn(by, 'charisma') + 1);
        const line = applyCond(cb, { state: seedFor(5) }, by, t, 'shaken', 2, 'heart', { via: 'intimidation' });
        expect(line).toMatch(new RegExp('heart save d20 5 \\+' + (base + 4) + ' = ' + (5 + base + 4) + ' vs ' + (saveTn(by, 'intimidation') + 1)));
        t.hp = 1; const now = unitSave(t, 'heart') + 4; /* Shaken or not, the item's +4 is on it */ expect(trySurrender(cb, { state: seedFor(5) }, by, t)).toContain('heart save d20 5 ' + (now >= 0 ? '+' : '−') + Math.abs(now) + ' = ');
        hazardHit(cb, { state: seedFor(5) }, t, { id: 'h', kind: 'gas', severity: 'light', zone: 'z', tiles: [t.pos], approaches: [] } as any, t.pos);
      });
      expect(seen).toEqual(expect.arrayContaining(['surrender', 'shaken', 'hazard']));
    } finally { clear(); }
  });
  it('an immunity cancels any save (it resists, nothing is rolled); "no save" fails it with no die; the save hook can pass it', () => {
    const f = fightWith([{}], [{ tier: 'soldier', classic: true }]); const cb = f.cb, t: Unit = f.foe, by = f.pc;
    let mode = 'cancel';
    ITEM.cond = (ctx: any) => { if (ctx.t !== t) return; if (mode === 'cancel') { ctx.cancel = true; ctx.why = 'Test Ward'; } if (mode === 'skip') ctx.skipSave = true; };
    ITEM.save = (ctx: any) => { if (ctx.t === t && mode === 'pass') { ctx.pass = true; ctx.why = 'Test Luck'; } };
    try {
      withGame(f.g, () => {
        const rng = { state: 77 };
        const a = saveAgainst(cb, rng, by, t, 'body', 'stop'); expect(a).toMatchObject({ ok: true, skipped: 'immune', why: 'Test Ward', die: 0 }); expect(rng.state).toBe(77);
        mode = 'skip'; const b = saveAgainst(cb, rng, by, t, 'body', 'stop'); expect(b).toMatchObject({ ok: false, skipped: 'no_save' }); expect(rng.state).toBe(77);
        mode = 'pass'; const c = saveAgainst(cb, rng, by, t, 'body', 'stop'); expect(c).toMatchObject({ ok: true, skipped: 'auto', why: 'Test Luck' }); expect(rng.state).toBe(77);
        mode = 'none'; const d = saveAgainst(cb, rng, by, t, 'body', 'stop'); expect(d.skipped).toBeUndefined(); expect(rng.state).not.toBe(77);
      });
    } finally { clear(); }
  });
  it('rollSave with the context applyCond already fired does not fire cond_apply twice', () => {
    const f = fightWith([{}], [{ tier: 'soldier', classic: true }]); const cb = f.cb, t: Unit = f.foe;
    let n = 0; ITEM.cond = (ctx: any) => { if (ctx.t === t) n++; };
    try { withGame(f.g, () => { applyCond(cb, { state: 5 }, f.pc, t, 'shaken', 2, 'heart', { via: 'intimidation' }); }); expect(n).toBe(1); } finally { clear(); }
  });
  it('advantage on a save rolls two dice and keeps the higher', () => {
    const f = fightWith([{}], [{ tier: 'boss', classic: true }]); const cb = f.cb;
    const sv = withGame(f.g, () => rollSave(cb, { state: seedFor(3, 17) }, { by: f.pc, target: f.foe, fam: 'heart', id: 'puppeted', tn: 15, mod: 0, adv: true }));
    expect(sv.dice).toEqual([3, 17]); expect(sv.die).toBe(17); expect(sv.ok).toBe(true); expect(sv.text).toBe('heart save d20 3/17 → 17 +0 = 17 vs 15');
  });
});
