// Rules revision 1.22 (Faith, round 2; 12 Nov 2026; spec: "Rules revision 1.22", section 14 items 1280 on;
// docs/design/handoffs/faith-round-2.md). What this file pins, each from a sentence of the spec:
//   the cooldown     9 − 0.75 × Faith − 0.25 × Virtue rounds, rounded up, never under 3; Faith is what lowers it
//   the wait         a vow fulfilled in the fight takes 1 round off, once for each Hymn, never under 2 rounds; with no
//                    Hymn waiting the fulfilment is kept for the next one; True Believer's round shares the same floor
//   the six moments  Stand, Shield, Mercy, Bare Hands, No Magic but Theirs, Nobody Left Behind: each engine-detected,
//                    at most one a round, with a log line and an fx event; the vow stays sworn
//   Hold the Gate    a wait of its own (6 rounds); the other Hymns wait as usual
//   Witnessed        the +2 of a patron that likes kills is earned by a kill and spent by the next attack roll
//   the numbers      Rebuke 20; Lightning Rod 56 and 23; Judgement 56; Warm Hands 13, Saint's Shield 16, Absolution 9
// The measurements behind the numbers are test/balance/faith-measure.test.ts (the cheap targets run in `npm run check`).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { previewPrayer, previewAttack, resolveAttack, applyDamage, faithView, fulfilVow, hymnWait, prayerCooldown, prayerDamage, blessingPower, mendFactor, surrender, condOn, d20,
  HYMN_COOLDOWN, FAITH_PATRON, FAITH_RULES, WHISPER, VOWS, FAITH_FX, type Combat, type Unit, type Character, type Action } from '../src';
import { emit } from '../src/effects/hooks';
import { fightWith, withGame } from './helpers/perkfight';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const logCount = (cb: Combat, re: RegExp) => cb.log.filter((l) => re.test(l)).length;
const hymn = (patron: string, id: string) => FAITH_PATRON[patron].hymns.find((h: any) => h.id === id);
const eff = (e: any, op: string) => e.effects.find((f: any) => f.op === op);
const fxOf = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k);

type Opt = { patron?: string; devotion?: number; faith?: number; virtue?: number; traits?: string[] };
/** A fight: the Priest (Faith 7 and Virtue 7 unless given) and an Ally against two soldiers, on the Priest's turn in
 * round 1, nothing done yet. Priest 2,5, Ally 2,6, foes 5,5 and 6,5; every unit 2,000 HP so that nothing dies by accident. */
function holy(o: Opt = {}) {
  const f = fightWith([{ name: 'Priest', skills: { faith: o.faith ?? 7 }, ...(o.traits ? { traits: o.traits } : {}) } as any, { name: 'Ally' }], [{ at: 'F6' }, { at: 'G6' }]);
  const c = f.g.characters[f.pc.charId!];
  const p = o.patron || 'nerukhan'; c.belief = { kind: 'faithful', patron: p }; c.patron = p; c.devotion = o.devotion ?? 10;
  c.skills = { ...c.skills, faith: o.faith ?? 7 }; c.attrs = { ...c.attrs, virtue: o.virtue ?? Math.max(o.faith ?? 7, 7) };
  const [pr, al] = f.pcs, [f0, f1] = f.foes;
  pr.pos = '2,5'; al.pos = '2,6'; f0.pos = '5,5'; f1.pos = '6,5';
  for (const u of f.cb.units) { u.hp = u.maxHp = 2000; u.conds = {}; u.shield = 0; }
  f.turn(pr);
  const api = {
    f, get g() { return f.g; }, get cb() { return f.cb; },
    get c(): Character { return f.g.characters[c.id]; },
    get me(): Unit { return f.unit(pr.id); }, get ally(): Unit { return f.unit(al.id); },
    get foe(): Unit { return f.unit(f0.id); }, get foe2(): Unit { return f.unit(f1.id); },
    act: (a: Action) => f.act(a),
    pray: (kind: 'whisper' | 'hymn' | 'miracle', id: string, x: { targetId?: string; targetId2?: string; tile?: string } = {}) => f.act({ type: 'faith/pray', unitId: pr.id, kind, id, ...x } as Action),
    vow: (id: string, allyId?: string) => f.act({ type: 'faith/vow', unitId: pr.id, id, ...(allyId ? { allyId } : {}) } as Action),
    bound: <T>(fn: () => T) => withGame(f.g, fn),
    /** The Priest's turn in a later round. */
    round(n: number) { f.cb.round = n; f.turn(pr); },
    /** An enemy's attack roll at someone (the die given), outside the turn order. */
    shotAt(t: Unit, die = 10, by?: Unit) { f.g.rng.state = rngFor(die); withGame(f.g, () => resolveAttack(f.cb, f.g.rng, by || api.foe, t, 'shot', null, { free: true, noAp: true })); },
    /** A unit's turn ends (the hook the vows listen to), without running anyone's turn. */
    turnEnds(u: Unit) { withGame(f.g, () => emit(f.cb, 'turn_end', { u, cb: f.cb, rng: f.g.rng })); },
    canHymn: (id: string, x: any = {}) => withGame(f.g, () => previewPrayer(f.g, pr.id, 'hymn', id, x)),
    view: () => withGame(f.g, () => faithView(f.g, c.id)!),
    fulfilled: () => fxOf(f.cb, FAITH_FX.vow).filter((e: any) => e.state === 'fulfilled'),
  };
  return api;
}
const sheet = (faith: number, virtue: number): Character => ({ skills: { faith }, attrs: { virtue } } as any);

describe('the data (rules 1.22): the numbers the spec gives', () => {
  it('Rebuke 20; Lightning Rod 56 and 23; Judgement 56 and ×1.3; Thunderclap 20; Warm Hands 13, Saint\'s Shield 16, Absolution 9', () => {
    expect(prayerDamage(WHISPER.rebuke)).toBe(20); expect(WHISPER.rebuke.text).toMatch(/20 Soul damage/);
    const l = hymn('old_overcast', 'lightning_rod'); expect(prayerDamage(l)).toBe(56); expect(eff(l, 'chain_damage').value).toBe(23); expect(l.text).toMatch(/56 lightning damage.*for 23 ×/);
    const j = hymn('nerukhan', 'judgement'); expect(prayerDamage(j)).toBe(56); expect(eff(j, 'vs_status_damage').mult).toBe(1.3); expect(j.text).toMatch(/56 Soul damage.*30% more/);
    expect(prayerDamage(hymn('old_overcast', 'thunderclap'))).toBe(20);
    expect(eff(hymn('mother_ember', 'warm_hands'), 'heal').value).toBe(13); expect(hymn('mother_ember', 'warm_hands').text).toMatch(/heals 13 ×/);
    expect(eff(hymn('nerukhan', 'saints_shield'), 'shield').value).toBe(16); expect(hymn('nerukhan', 'saints_shield').text).toMatch(/shield of 16 ×/);
    expect(eff(hymn('nerukhan', 'absolution'), 'heal').value).toBe(9); expect(hymn('nerukhan', 'absolution').text).toMatch(/heals 9 ×/);
    expect(eff(WHISPER.health, 'heal').value).toBe(5); expect(eff(WHISPER.protection, 'shield').value).toBe(6); // the Whispers of rules 1.20 stand
  });
  it('the cooldown\'s numbers, Hold the Gate\'s own wait, and a moment written on every vow', () => {
    expect(FAITH_RULES.prayer.hymn.cooldown_rule).toMatchObject({ base: 9, per_faith: 0.75, per_virtue: 0.25, floor: 3, min_wait: 2, vow_cut: 1, vow_cuts_per_hymn: 1 });
    expect(HYMN_COOLDOWN).toEqual({ base: 9, perFaith: 0.75, perVirtue: 0.25, floor: 3, minWait: 2, vowCut: 1 });
    const g = hymn('toll_keeper', 'hold_the_gate'); expect(g.own_cooldown).toBe(6); expect(g.text).toMatch(/again for 6 rounds/);
    expect(VOWS.length).toBe(6); for (const v of VOWS) expect(String(v.fulfilled_when || '').length, v.id).toBeGreaterThan(10);
  });
});

describe('the Hymn cooldown (items 1280, 1282): Faith lowers it, and it stops at 3 without items', () => {
  it('9 − 0.75 × Faith − 0.25 × Virtue, rounded up, never under 3', () => {
    const table: [number, number, number][] = [[3, 3, 6], [3, 4, 6], [3, 7, 5], [3, 10, 5], [4, 4, 5], [4, 8, 4], [5, 5, 4], [5, 9, 3], [6, 6, 3], [7, 7, 3], [8, 8, 3], [10, 10, 3]];
    for (const [f, v, cd] of table) expect(prayerCooldown(sheet(f, v)), 'Faith ' + f + ', Virtue ' + v).toBe(cd);
  });
  it('a point of Faith is worth three points of Virtue, and nothing on the sheet takes it under 3', () => {
    expect(prayerCooldown(sheet(4, 4))).toBe(prayerCooldown(sheet(3, 7)));
    for (let f = 3; f <= 10; f++) for (let v = f; v <= 10; v++) { expect(prayerCooldown(sheet(f, v))).toBeGreaterThanOrEqual(3); if (f < 10) expect(prayerCooldown(sheet(f + 1, Math.max(v, f + 1)))).toBeLessThanOrEqual(prayerCooldown(sheet(f, v))); }
  });
  it('in a fight: a Hymn in round 1 at Faith 7 comes back in round 4; the Whisper is there every turn', () => {
    const h = holy(); h.pray('hymn', 'judgement', { targetId: h.foe.id }); h.pray('whisper', 'rebuke', { targetId: h.foe.id });
    expect(h.view().cooldowns).toMatchObject({ hymnRoundsLeft: 3, hymnWait: 3, hymnCooldown: 3, vowCut: false });
    for (const r of [2, 3]) { h.round(r); const pv = h.canHymn('judgement', { targetId: h.foe.id }); expect(pv.ok).toBe(false); expect(pv.why).toMatch(/wait 3/); h.pray('whisper', 'rebuke', { targetId: h.foe.id }); }
    h.round(4); expect(h.canHymn('judgement', { targetId: h.foe.id }).ok).toBe(true);
  });
  it('the dabbler (Faith 3, Virtue 3) waits 6 rounds', () => {
    const h = holy({ faith: 3, virtue: 3, devotion: 5 }); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    h.round(6); expect(h.canHymn('judgement', { targetId: h.foe.id }).why).toMatch(/wait 6/);
    h.round(7); expect(h.canHymn('judgement', { targetId: h.foe.id }).ok).toBe(true);
  });
});

describe('a vow fulfilled takes 1 round off the Hymn\'s wait (items 1283, 1284)', () => {
  it('Stand: attacked since your last turn and no ground given: the Hymn comes a round sooner, with a line, an fx event and the patron\'s voice', () => {
    const h = holy(); h.vow('stand'); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    h.turnEnds(h.me); expect(h.fulfilled().length).toBe(0); // nobody attacked: no moment
    h.shotAt(h.me); h.round(2); h.turnEnds(h.me);
    const ev = h.fulfilled(); expect(ev.length).toBe(1); expect(ev[0]).toMatchObject({ unit: h.me.id, id: 'stand', cut: 1, left: 1 });
    expect(logCount(h.cb, /fulfils the vow "I don't give ground\." \(held their ground under attack\): the next Hymn comes 1 round sooner \(in 1 round\)/)).toBe(1);
    expect(fxOf(h.cb, FAITH_FX.patron_line).some((e: any) => e.event === 'vow_kept')).toBe(true);
    expect(h.me.vow!.state).toBe('sworn'); // still to be kept or broken at the fight's end
    expect(h.view().cooldowns).toMatchObject({ hymnWait: 2, hymnCooldown: 3, vowCut: true, hymnRoundsLeft: 1 });
    h.round(3); expect(h.canHymn('judgement', { targetId: h.foe.id }).ok).toBe(true);
  });
  it('each Hymn\'s wait is shortened once, and at most one moment counts a round', () => {
    const h = holy(); h.vow('stand'); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    h.shotAt(h.me); h.turnEnds(h.me); expect(h.fulfilled().length).toBe(1);
    h.shotAt(h.me); h.turnEnds(h.me); expect(h.fulfilled().length).toBe(1); // the same round
    h.round(2); h.shotAt(h.me); h.turnEnds(h.me); expect(h.fulfilled().length).toBe(1); // this wait is already shortened: nothing is spent or said
    expect(h.bound(() => hymnWait(h.c, h.me))).toBe(2);
    h.round(3); h.pray('hymn', 'judgement', { targetId: h.foe.id }); expect(h.view().cooldowns).toMatchObject({ hymnWait: 3, vowCut: false }); // a new Hymn, a new wait
  });
  it('with no Hymn waiting the moment is kept for the next Hymn (one at most)', () => {
    const h = holy(); h.vow('stand');
    h.shotAt(h.me); h.turnEnds(h.me); expect(h.fulfilled()[0]).toMatchObject({ banked: true, left: 0 }); expect(h.view().cooldowns.vowBanked).toBe(true);
    h.round(2); h.shotAt(h.me); h.turnEnds(h.me); expect(h.fulfilled().length).toBe(1);
    h.round(3); h.pray('hymn', 'judgement', { targetId: h.foe.id }); expect(h.view().cooldowns).toMatchObject({ hymnWait: 2, vowCut: true, vowBanked: false });
    h.round(4); expect(h.canHymn('judgement', { targetId: h.foe.id }).why).toMatch(/wait 2/); h.round(5); expect(h.canHymn('judgement', { targetId: h.foe.id }).ok).toBe(true);
  });
  it('never under 2 rounds: True Believer\'s round and the vow\'s together still wait 2', () => {
    const h = holy({ traits: ['true_believer'] });
    expect(h.bound(() => hymnWait(h.c, h.me))).toBe(2);
    h.vow('stand'); h.pray('hymn', 'judgement', { targetId: h.foe.id }); h.shotAt(h.me); h.turnEnds(h.me);
    expect(h.fulfilled().length).toBe(0); expect(h.bound(() => hymnWait(h.c, h.me))).toBe(2);
    h.round(2); expect(h.canHymn('judgement', { targetId: h.foe.id }).ok).toBe(false);
  });
  it('a broken vow fulfils nothing; giving ground breaks Stand as before', () => {
    const h = holy(); h.vow('bare'); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    h.act({ type: 'combat/attack', unitId: h.me.id, targetId: h.foe.id, mode: 'shot' } as Action); expect(h.me.vow!.state).toBe('broken');
    expect(h.bound(() => fulfilVow(h.cb, h.me, 'a test'))).toBe(false);
  });
});

describe('the six moments (item 1284)', () => {
  it('Shield: an enemy attacks the ally you named and, when its turn ends, the ally still stands', () => {
    const h = holy(); h.vow('shield', h.ally.id); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    h.shotAt(h.ally); expect(h.fulfilled().length).toBe(0); // not until the attacker's turn is over
    h.turnEnds(h.foe2); expect(h.fulfilled().length).toBe(0); // somebody else's turn
    h.turnEnds(h.foe); expect(h.fulfilled()[0]).toMatchObject({ id: 'shield', allyId: h.ally.id, cut: 1 });
  });
  it('Shield: an attack on somebody else is no moment, and an ally who drops breaks the vow', () => {
    const h = holy(); h.vow('shield', h.ally.id); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    h.shotAt(h.me); h.turnEnds(h.foe); expect(h.fulfilled().length).toBe(0);
    h.shotAt(h.ally); h.bound(() => applyDamage(h.cb, h.ally, 9999, { by: h.foe, type: 'physical' } as any)); h.turnEnds(h.foe);
    expect(h.me.vow!.state).toBe('broken'); expect(h.fulfilled().length).toBe(0);
  });
  it('Mercy: an enemy yields to you', () => {
    const h = holy(); h.vow('mercy'); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    h.bound(() => surrender(h.cb, h.foe2, h.ally, 'a test')); expect(h.fulfilled().length).toBe(0); // it yielded to someone else
    h.bound(() => surrender(h.cb, h.foe, h.me, 'a test')); expect(h.fulfilled()[0]).toMatchObject({ id: 'mercy' });
  });
  it('Bare Hands: an enemy falls to your melee attack (not to anything else of yours)', () => {
    const h = holy(); h.vow('bare'); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    h.bound(() => applyDamage(h.cb, h.foe2, 9999, { by: h.me, type: 'true', credit: 'hp' } as any)); expect(h.fulfilled().length).toBe(0);
    h.bound(() => applyDamage(h.cb, h.foe, 9999, { by: h.me, type: 'weapon', melee: true, credit: 'all' } as any)); expect(h.fulfilled()[0]).toMatchObject({ id: 'bare' });
  });
  it('No Magic but Theirs: an enemy falls to your prayer', () => {
    const h = holy(); h.vow('unarmed_faith'); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    h.bound(() => applyDamage(h.cb, h.foe2, 9999, { by: h.me, type: 'weapon', credit: 'all' } as any)); expect(h.fulfilled().length).toBe(0); // a weapon's kill
    h.foe.hp = 5; h.pray('whisper', 'rebuke', { targetId: h.foe.id }); expect(h.foe.dead).toBe(true);
    expect(h.fulfilled()[0]).toMatchObject({ id: 'unarmed_faith' });
  });
  it('Nobody Left Behind: a Downed ally stands up again because of you', () => {
    const h = holy({ patron: 'mother_ember' }); h.vow('no_one_behind'); h.pray('hymn', 'feed_the_fire', { targetId: h.me.id });
    h.bound(() => applyDamage(h.cb, h.ally, 9999, { by: h.foe, type: 'physical' } as any)); expect(h.ally.downed).toBe(true);
    h.pray('whisper', 'health', { targetId: h.ally.id }); expect(h.ally.downed).toBe(false);
    expect(h.fulfilled()[0]).toMatchObject({ id: 'no_one_behind', cut: 1 });
  });
});

describe('Hold the Gate has a wait of its own (item 1287)', () => {
  it('6 rounds before it can be prayed again; the devoted\'s other Hymns wait as usual', () => {
    const h = holy({ patron: 'toll_keeper' }); h.pray('hymn', 'hold_the_gate');
    h.round(4); const pv = h.canHymn('hold_the_gate'); expect(pv.ok).toBe(false); expect(pv.why).toMatch(/Hold the Gate was prayed in round 1: not again until round 7/);
    h.bound(() => applyDamage(h.cb, h.ally, 9999, { by: h.foe, type: 'physical' } as any));
    expect(h.canHymn('coin_for_the_ferry', { targetId: h.ally.id }).ok).toBe(true);
    h.round(7); expect(h.canHymn('hold_the_gate').ok).toBe(true);
  });
  it('a vow fulfilled does not shorten it', () => {
    const h = holy({ patron: 'toll_keeper' }); h.vow('stand'); h.pray('hymn', 'hold_the_gate'); h.shotAt(h.me); h.turnEnds(h.me); expect(h.fulfilled().length).toBe(1);
    h.round(3); expect(h.canHymn('hold_the_gate').why).toMatch(/not again until round 7/);
  });
});

describe('Witnessed and a patron that likes kills (item 1288)', () => {
  const witTerm = (h: ReturnType<typeof holy>, t: Unit) => (h.bound(() => previewAttack(h.cb, h.me, t, 'shot')).terms || []).find((x: any) => /^Witnessed/.test(x.label));
  it('being Witnessed no longer gives Old Overcast\'s devoted +2 on every attack', () => {
    const h = holy({ patron: 'old_overcast' }); h.me.conds = { witnessed: 2 } as any;
    expect(witTerm(h, h.foe)).toBeUndefined();
  });
  it('a kill while Witnessed earns +2 on the next attack roll, kept though the kill\'s intervention ends Witnessed, and spent by that roll', () => {
    const h = holy({ patron: 'old_overcast' }); h.me.conds = { witnessed: 2 } as any;
    h.bound(() => applyDamage(h.cb, h.foe, 9999, { by: h.me, type: 'weapon', credit: 'all' } as any));
    expect(condOn(h.me, 'witnessed')).toBe(false); // Old Overcast answered the kill
    expect(witTerm(h, h.foe2)).toMatchObject({ v: 2, label: 'Witnessed (your kill)' });
    h.g.rng.state = rngFor(2); h.bound(() => resolveAttack(h.cb, h.g.rng, h.me, h.foe2, 'shot', null, { free: true, noAp: true }));
    expect(witTerm(h, h.foe2)).toBeUndefined();
  });
  it('not for a kill made unwatched, not for finishing the helpless, and not for a patron that does not like kills', () => {
    const a = holy({ patron: 'old_overcast' }); a.bound(() => applyDamage(a.cb, a.foe, 9999, { by: a.me, type: 'weapon', credit: 'all' } as any)); expect(witTerm(a, a.foe2)).toBeUndefined();
    const b = holy({ patron: 'old_overcast' }); b.me.conds = { witnessed: 2 } as any; b.foe.surrendered = true;
    b.bound(() => applyDamage(b.cb, b.foe, 9999, { by: b.me, type: 'weapon', credit: 'all' } as any)); expect(witTerm(b, b.foe2)).toBeUndefined();
    const c = holy({ patron: 'mother_ember' }); c.me.conds = { witnessed: 2 } as any;
    c.bound(() => applyDamage(c.cb, c.foe, 9999, { by: c.me, type: 'weapon', credit: 'all' } as any)); expect(witTerm(c, c.foe2)).toBeUndefined();
  });
});

describe('the refitted prayers land their numbers (items 1281, 1285, 1286)', () => {
  it('Rebuke 20 × Blessing power; Judgement 56 ×; Lightning Rod 56 and 23 to one more', () => {
    const h = holy(); const bp = h.bound(() => blessingPower(h.c)); let was = h.foe.hp;
    h.pray('whisper', 'rebuke', { targetId: h.foe.id }); expect(was - h.foe.hp).toBe(Math.round(20 * bp)); was = h.foe.hp;
    h.pray('hymn', 'judgement', { targetId: h.foe.id }); expect(was - h.foe.hp).toBe(Math.round(56 * bp));
    const o = holy({ patron: 'old_overcast' }); for (const u of [o.foe, o.foe2]) u.armour = 0; const w1 = o.foe.hp, w2 = o.foe2.hp;
    o.pray('hymn', 'lightning_rod', { targetId: o.foe.id }); expect(w1 - o.foe.hp).toBe(Math.round(56 * bp)); expect(w2 - o.foe2.hp).toBe(Math.round(23 * bp));
  });
  it('Warm Hands heals 13 × Blessing power × the level factor; Saint\'s Shield is 16 ×', () => {
    const h = holy({ patron: 'mother_ember' }); const bp = h.bound(() => blessingPower(h.c)), m = mendFactor(h.c.level);
    h.ally.hp = 1000; h.pray('hymn', 'warm_hands', { targetId: h.ally.id }); expect(h.ally.hp - 1000).toBe(Math.round(13 * bp * m));
    const n = holy(); n.pray('hymn', 'saints_shield', { targetId: n.ally.id }); expect(n.ally.shield).toBe(Math.round(16 * bp * m));
  });
});
