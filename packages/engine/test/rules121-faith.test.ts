// Rules revision 1.21 (the Faith fit; 12 Nov 2026; spec: "Rules revision 1.21", section 14 items 1260 on). What this
// file pins, each from a sentence of the spec:
//   Rebuke            the seventh Whisper: 1 AP, an enemy in sight takes 15 Soul × Blessing power, no roll, armour does
//                     not lower it, one Whisper a turn; an Atheist prays it by dice; it never makes you Witnessed
//   the damage Hymns  Judgement 50 (it was 40), 30% more against one that harmed the helpless (it was double); Lightning
//                     Rod 50 and 20 to one more (the chain was 25); Thunderclap hurts: 20 lightning to each enemy within 2
//   the Miracle       The Saints' Verdict 130 (100); the double for the cruel stays
//   the others        Lucky Break rerolls two failed attack rolls, Foreknowing turns two attacks, Feed the Fire gives
//                     +2 AP, Cut Short can't cost the same enemy two turns running
//   the data          every one of these numbers is read from data/patrons.json (no prayer damage number in the code)
// RULES 1.22 (Faith, round 2) refitted three of these numbers to a Hymn that waits on a cooldown: Rebuke 20 (15),
// Judgement 42 (50), Lightning Rod 42 and 17 (50 and 20). The rules they follow are unchanged and are still pinned here,
// with the numbers of rules 1.22; test/rules122-faith.test.ts pins the new revision.
// The measurements behind the numbers are test/balance/faith-measure.test.ts (the cheap targets run in `npm run check`).
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { previewPrayer, FAITH_PATRON, WHISPER, WHISPERS, FAITH_FX, ATHEIST_TN, prayerDamage, d20, resolveAttack, condOn, type Combat, type Unit, type Character, type Action } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const logCount = (cb: Combat, re: RegExp) => cb.log.filter((l) => re.test(l)).length;
const hymn = (patron: string, id: string) => FAITH_PATRON[patron].hymns.find((h: any) => h.id === id);
const eff = (e: any, op: string, ok: (f: any) => boolean = () => true) => e.effects.find((f: any) => f.op === op && ok(f));

type Opt = { patron?: string; devotion?: number; faith?: number; atheist?: boolean; foes?: { at?: string; tier?: string }[] };
/** A fight: the Priest (Faith 7 unless given) and an Ally against two soldiers, on the Priest's turn. Priest 2,5, Ally
 * 2,6, foes 5,5 and 6,5; every unit 2,000 HP so that nothing dies; foes' armour 12 (so a blow that armour lowers shows). */
function holy(o: Opt = {}) {
  const f = fightWith([{ name: 'Priest', skills: { faith: o.faith ?? 7 } }, { name: 'Ally' }], o.foes || [{ at: 'F6' }, { at: 'G6' }]);
  const c = f.g.characters[f.pc.charId!];
  if (o.atheist) { c.belief = { kind: 'atheist' }; c.patron = null; c.devotion = 0; }
  else { const p = o.patron || 'nerukhan'; c.belief = { kind: 'faithful', patron: p }; c.patron = p; c.devotion = o.devotion ?? 10; }
  const [pr, al] = f.pcs, [f0, f1] = f.foes;
  pr.pos = '2,5'; al.pos = '2,6'; if (f0) f0.pos = '5,5'; if (f1) f1.pos = '6,5';
  for (const u of f.cb.units) { u.hp = u.maxHp = 2000; u.conds = {}; u.shield = 0; if (u.side === 'foe') u.armour = 12; }
  f.turn(pr);
  return {
    f, get g() { return f.g; }, get cb() { return f.cb; },
    get c(): Character { return f.g.characters[c.id]; },
    get me(): Unit { return f.unit(pr.id); }, get ally(): Unit { return f.unit(al.id); },
    get foe(): Unit { return f.unit(f0.id); }, get foe2(): Unit { return f.unit(f1.id); },
    pray: (kind: 'whisper' | 'hymn' | 'miracle', id: string, x: { targetId?: string; targetId2?: string; tile?: string } = {}) => f.act({ type: 'faith/pray', unitId: pr.id, kind, id, ...x } as Action),
    bound: <T>(fn: () => T) => withGame(f.g, fn),
  };
}

describe('the data (rules 1.21): the numbers the spec gives', () => {
  it('seven Whispers; Rebuke is 20 Soul at an enemy (rules 1.22; it was 15)', () => {
    expect(WHISPERS.length).toBe(7);
    const r = WHISPER.rebuke; expect(r.target).toBe('enemy'); expect(prayerDamage(r)).toBe(20); expect(eff(r, 'stat_mod').damage_type).toBe('soul'); expect(r.scales_with).toBe('blessing_power');
  });
  it('Judgement 42 and ×1.3; Lightning Rod 42 and 17 (rules 1.22; they were 50, and 50 and 20); Thunderclap 20 within 2; The Saints\' Verdict 130 and ×2', () => {
    const j = hymn('nerukhan', 'judgement'); expect(prayerDamage(j)).toBe(42); expect(eff(j, 'vs_status_damage').mult).toBe(1.3);
    const l = hymn('old_overcast', 'lightning_rod'); expect(prayerDamage(l)).toBe(42); expect(eff(l, 'chain_damage').value).toBe(17); expect(eff(l, 'chain_damage').range).toBe(2);
    const t = hymn('old_overcast', 'thunderclap'); expect(prayerDamage(t)).toBe(20); expect(eff(t, 'stat_mod').radius).toBe(2); expect(eff(t, 'stat_mod').damage_type).toBe('lightning');
    const v = FAITH_PATRON.nerukhan.miracle; expect(prayerDamage(v)).toBe(130); expect(eff(v, 'damage_mult').value).toBe(2);
  });
  it('Lucky Break 2 rerolls, Foreknowing 2 attacks, Feed the Fire +2 AP, Cut Short every other round at most', () => {
    expect(eff(hymn('the_laughing_mask', 'lucky_break'), 'reroll').uses).toBe(2);
    expect(eff(hymn('counting_weaver', 'foreknowing'), 'state').uses).toBe(2);
    expect(eff(hymn('mother_ember', 'feed_the_fire'), 'stat_mod').value).toBe(2);
    expect(eff(hymn('counting_weaver', 'cut_short'), 'condition').again_after_rounds).toBe(2);
  });
  it('every card says its own number', () => {
    expect(WHISPER.rebuke.text).toMatch(/20 Soul damage/);
    expect(hymn('nerukhan', 'judgement').text).toMatch(/42 Soul damage.*30% more/);
    expect(hymn('old_overcast', 'lightning_rod').text).toMatch(/42 lightning damage.*for 17 ×/);
    expect(hymn('old_overcast', 'thunderclap').text).toMatch(/takes 20 lightning damage/);
    expect(FAITH_PATRON.nerukhan.miracle.text).toMatch(/130 Soul damage/);
    expect(hymn('the_laughing_mask', 'lucky_break').text).toMatch(/next 2 failed attack rolls/);
    expect(hymn('counting_weaver', 'foreknowing').text).toMatch(/next 2 attacks/);
    expect(hymn('mother_ember', 'feed_the_fire').text).toMatch(/\+2 AP/);
    expect(hymn('counting_weaver', 'cut_short').text).toMatch(/can't be Cut Short again/);
  });
});

describe('Rebuke, the seventh Whisper (item 1260)', () => {
  it('1 AP; an enemy in sight takes 20 Soul × Blessing power (rules 1.22); no roll; armour does not lower it; the mana meter −5', () => {
    const h = holy(); const pw = h.me.blessPower!, ap = h.me.ap, mana = h.cb.mana ?? 0;
    expect(pw).toBeCloseTo(1.7, 5);
    h.pray('whisper', 'rebuke', { targetId: h.foe.id });
    expect(h.foe.hp).toBe(2000 - Math.round(20 * pw)); // 34 at Faith 7, with 12 armour on the target
    expect(h.me.ap).toBe(ap - 1); expect(h.cb.mana).toBe(mana - 5);
    expect(logHas(h.cb, /whispers a prayer.*Rebuke/)).toBe(true); expect(h.cb.log.filter((l) => /Rebuke/.test(l)).some((l) => /d20/.test(l))).toBe(false);
    expect((h.cb.fx || []).filter((e: any) => e.k === FAITH_FX.prayer).length).toBe(1);
  });
  it('it grows with Faith and with nothing else: 26 at Faith 3, 40 at Faith 10', () => {
    for (const [faith, dmg] of [[3, 26], [5, 30], [10, 40]]) { const h = holy({ faith, devotion: 3 }); h.pray('whisper', 'rebuke', { targetId: h.foe.id }); expect(2000 - h.foe.hp, 'Faith ' + faith).toBe(dmg); }
    const lo = holy({ devotion: 0 }), hi = holy({ devotion: 10 }); lo.pray('whisper', 'rebuke', { targetId: lo.foe.id }); hi.pray('whisper', 'rebuke', { targetId: hi.foe.id });
    expect(lo.foe.hp).toBe(hi.foe.hp); // Devotion does not move it
  });
  it('one Whisper a turn: after Rebuke no other Whisper, and after another Whisper no Rebuke', () => {
    const h = holy(); h.pray('whisper', 'rebuke', { targetId: h.foe.id });
    expect(() => h.pray('whisper', 'rebuke', { targetId: h.foe2.id })).toThrow(/One Whisper a turn/);
    expect(() => h.pray('whisper', 'luck')).toThrow(/One Whisper a turn/);
    const k = holy(); k.pray('whisper', 'luck'); expect(() => k.pray('whisper', 'rebuke', { targetId: k.foe.id })).toThrow(/One Whisper a turn/);
  });
  it('it needs an enemy you can see: no target, an ally and yourself are refused, and nothing is spent', () => {
    const h = holy(), ap = h.me.ap;
    expect(() => h.pray('whisper', 'rebuke')).toThrow(/Pick an enemy/);
    expect(() => h.pray('whisper', 'rebuke', { targetId: h.ally.id })).toThrow(/Not a valid target/);
    expect(() => h.pray('whisper', 'rebuke', { targetId: h.me.id })).toThrow(/Not a valid target/);
    expect(h.me.ap).toBe(ap); expect(h.ally.hp).toBe(2000);
    expect(previewPrayer(h.g, h.me.id, 'whisper', 'rebuke').targets.sort()).toEqual([h.foe.id, h.foe2.id].sort());
  });
  it('a Whisper never makes you Witnessed; the Hymn after it still can be prayed the same turn', () => {
    const h = holy({ patron: 'nerukhan' }); h.pray('whisper', 'rebuke', { targetId: h.foe.id });
    expect(condOn(h.me, 'witnessed')).toBe(false);
    h.pray('hymn', 'judgement', { targetId: h.foe.id }); expect(condOn(h.me, 'witnessed')).toBe(true);
  });
  it('an Atheist prays it by dice against 12, like every Whisper: a miss spends the AP and does nothing', () => {
    const a = holy({ atheist: true }); expect(previewPrayer(a.g, a.me.id, 'whisper', 'rebuke', { targetId: a.foe.id }).roll!.tn).toBe(ATHEIST_TN.whisper);
    a.g.rng.state = rngFor(2); const ap = a.me.ap; a.pray('whisper', 'rebuke', { targetId: a.foe.id }); expect(a.foe.hp).toBe(2000); expect(a.me.ap).toBe(ap - 1);
    const b = holy({ atheist: true }); b.g.rng.state = rngFor(19); b.pray('whisper', 'rebuke', { targetId: b.foe.id }); expect(b.foe.hp).toBe(2000 - Math.round(20 * b.me.blessPower!));
  });
  it('praying needs Faith 3: below it there is no Rebuke', () => {
    const h = holy({ faith: 2 }); expect(() => h.pray('whisper', 'rebuke', { targetId: h.foe.id })).toThrow(/Faith 3/);
  });
});

describe('the damage Hymns (items 1261 to 1263)', () => {
  it('Judgement: 42 Soul × Blessing power (rules 1.22); 30% more against one that harmed the helpless', () => {
    const h = holy({ patron: 'nerukhan' }); const pw = h.me.blessPower!; h.pray('hymn', 'judgement', { targetId: h.foe.id });
    expect(h.foe.hp).toBe(2000 - Math.round(42 * pw));
    const k = holy({ patron: 'nerukhan' }); k.foe.faith = { harmedHelpless: true }; k.pray('hymn', 'judgement', { targetId: k.foe.id });
    expect(k.foe.hp).toBe(2000 - Math.round(42 * pw * 1.3)); expect(logHas(k.cb, /×1\.3: it harmed the helpless/)).toBe(true);
  });
  it('Lightning Rod: 42 lightning × Blessing power, then 17 × Blessing power to one more within 2 (rules 1.22) (armour takes half its number off lightning)', () => {
    const h = holy({ patron: 'old_overcast' }); const pw = h.me.blessPower!; h.pray('hymn', 'lightning_rod', { targetId: h.foe.id });
    expect(h.foe.hp).toBe(2000 - (Math.round(42 * pw) - 6)); expect(h.foe2.hp).toBe(2000 - (Math.round(17 * pw) - 6));
    const far = holy({ patron: 'old_overcast' }); far.foe2.pos = '9,5'; far.pray('hymn', 'lightning_rod', { targetId: far.foe.id }); expect(far.foe2.hp).toBe(2000); // 4 tiles off: no chain
  });
  it('Thunderclap: each enemy within 2 of the tile takes 20 lightning × Blessing power, then is pushed 1 and saves or is Shaken; one further off is untouched; your own side is never hit', () => {
    const h = holy({ patron: 'old_overcast', devotion: 3 }); const pw = h.me.blessPower!; h.foe2.pos = '9,5'; const was = h.foe.pos;
    h.ally.pos = '4,6'; // inside the area
    h.pray('hymn', 'thunderclap', { tile: '4,5' });
    expect(h.foe.hp).toBe(2000 - (Math.round(20 * pw) - 6)); expect(h.foe.pos).not.toBe(was);
    expect(h.foe2.hp).toBe(2000); expect(h.ally.hp).toBe(2000); expect(h.me.hp).toBe(2000);
    expect(logHas(h.cb, /Thunderclap/)).toBe(true);
  });
  it('Thunderclap hits every enemy in the area, so two together take twice what one does', () => {
    const h = holy({ patron: 'old_overcast', devotion: 3 }); const pw = h.me.blessPower!; h.pray('hymn', 'thunderclap', { tile: '5,5' });
    expect(4000 - h.foe.hp - h.foe2.hp).toBe(2 * (Math.round(20 * pw) - 6));
  });
});

describe('The Saints\' Verdict (item 1264)', () => {
  it('130 Soul × Blessing power to every enemy in sight; double for one that harmed the helpless', () => {
    const h = holy({ patron: 'nerukhan', devotion: 10 }); const pw = h.me.blessPower!; h.foe2.faith = { harmedHelpless: true };
    h.pray('miracle', 'saints_verdict');
    expect(h.foe.hp).toBe(2000 - Math.round(130 * pw)); expect(h.foe2.hp).toBe(2000 - Math.round(260 * pw));
  });
});

describe('the Hymns that are not damage (items 1265 to 1268)', () => {
  it('Lucky Break: the next two failed attack rolls are rerolled at +5, the third is not', () => {
    const h = holy({ patron: 'the_laughing_mask', devotion: 3 }); h.pray('hymn', 'lucky_break', { targetId: h.ally.id });
    expect(h.ally.faith?.luckyBreak).toBe(2); expect(logHas(h.cb, /next 2 failed attack rolls are each rerolled at \+5/)).toBe(true);
    h.foe.def = 99; // every roll but a natural 20 fails
    const shoot = () => { h.g.rng.state = rngFor(5, 6); h.bound(() => resolveAttack(h.cb, h.g.rng, h.ally, h.foe, 'shot', null, { free: true, noAp: true })); };
    shoot(); expect(h.ally.faith?.luckyBreak).toBe(1); expect(logCount(h.cb, /^Lucky Break: /)).toBe(1);
    shoot(); expect(h.ally.faith?.luckyBreak).toBeUndefined(); expect(logCount(h.cb, /^Lucky Break: /)).toBe(2);
    shoot(); expect(logCount(h.cb, /^Lucky Break: /)).toBe(2);
  });
  it('Foreknowing: the next two attacks on the ally miss, the third is rolled', () => {
    const h = holy({ patron: 'counting_weaver', devotion: 3 }); h.pray('hymn', 'foreknowing', { targetId: h.ally.id });
    expect(h.ally.faith?.foreknown).toBe(2); expect(logHas(h.cb, /the next 2 attacks on Ally will miss/)).toBe(true);
    h.ally.def = -99; // anything but a natural 1 would hit
    const shoot = () => { h.g.rng.state = rngFor(15); h.bound(() => resolveAttack(h.cb, h.g.rng, h.foe, h.ally, 'shot', null, { free: true, noAp: true })); };
    shoot(); expect(h.ally.hp).toBe(2000); expect(h.ally.faith?.foreknown).toBe(1);
    shoot(); expect(h.ally.hp).toBe(2000); expect(h.ally.faith?.foreknown).toBeUndefined();
    shoot(); expect(h.ally.hp).toBeLessThan(2000); expect(logCount(h.cb, /^Foreknowing: /)).toBe(2);
  });
  it('Feed the Fire: +2 AP now, never past 9', () => {
    const h = holy({ patron: 'mother_ember', devotion: 7 }); h.ally.ap = 0; h.pray('hymn', 'feed_the_fire', { targetId: h.ally.id }); expect(h.ally.ap).toBe(2);
    const k = holy({ patron: 'mother_ember', devotion: 7 }); k.ally.ap = 8; k.pray('hymn', 'feed_the_fire', { targetId: k.ally.id }); expect(k.ally.ap).toBe(9); expect(logHas(k.cb, /Ally \+1 AP/)).toBe(true);
  });
  it('Cut Short: an enemy it has just cost a turn can\'t be Cut Short in the same round or the next; another enemy can; two rounds on it can again', () => {
    const h = holy({ patron: 'counting_weaver', devotion: 7, faith: 10 }); h.me.ap = 20;
    h.g.rng.state = rngFor(2); h.pray('hymn', 'cut_short', { targetId: h.foe.id }); expect(condOn(h.foe, 'stunned')).toBe(true);
    const r0 = h.cb.round; expect(h.foe.faith?.cutShortRound).toBe(r0);
    h.me.prayedRound = undefined as any; // the cooldown is not what is tested here
    expect(previewPrayer(h.g, h.me.id, 'hymn', 'cut_short', { targetId: h.foe.id }).why).toMatch(/has just been Cut Short/);
    const ap = h.me.ap; expect(() => h.pray('hymn', 'cut_short', { targetId: h.foe.id })).toThrow(/has just been Cut Short/); expect(h.me.ap).toBe(ap);
    expect(previewPrayer(h.g, h.me.id, 'hymn', 'cut_short', { targetId: h.foe2.id }).ok).toBe(true); // another enemy
    h.cb.round = r0 + 1; expect(previewPrayer(h.g, h.me.id, 'hymn', 'cut_short', { targetId: h.foe.id }).ok).toBe(false);
    h.cb.round = r0 + 2; expect(previewPrayer(h.g, h.me.id, 'hymn', 'cut_short', { targetId: h.foe.id }).ok).toBe(true);
  });
  it('Cut Short that the enemy shrugs off leaves no mark: it can be tried again next round', () => {
    const h = holy({ patron: 'counting_weaver', devotion: 7, faith: 3 });
    h.g.rng.state = rngFor(20); h.pray('hymn', 'cut_short', { targetId: h.foe.id });
    expect(condOn(h.foe, 'stunned')).toBe(false); expect(h.foe.faith?.cutShortRound).toBeUndefined();
  });
});
