// Blessing 2.0 (rules 1.6, faith.ts): belief, Devotion and its gates, the three sizes of prayer, overreach, Atheist dice
// and knowledge pieces, conversion (Open and Jealous), apostasy, Witnessed, tags, vows, interventions, rites, voice lines,
// story prayers, old saves and the Proving Ground's faith tool. Every rule goes through apply() (the reducer), the same
// path a player's click takes; interventions on an enemy's blow call the damage chokepoint with the game bound.
import { describe, expect, it } from 'vitest';
import {
  apply, previewPrayer, faithView, beliefOf, patronLine, diceHymns, FAITH_PATRONS, FAITH_PATRON, WHISPERS, VOWS, GATE,
  ATHEIST_TN, OVERREACH, FAITH_FX, tithable, d20, applyDamage, resolveAttack, previewAttack, condOn, sessionN, newGame,
  type Combat, type GameState, type Unit, type Character, type Action,
} from '../src';
import { mendFactor } from '../src/effects/mending'; // rules 1.20: prayer heals and shields grow with level
import { fightWith, storyWith, withGame, sheetOf } from './helpers/perkfight';
import { clearPrayerLimits } from '../src';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];
const storyFx = (g: GameState, k: string) => (((g.story as any).fx || []) as any[]).filter((e) => e.k === k);
const said = (g: GameState, re: RegExp) => g.story.entries.some((e) => re.test(String(e.head || '') + ' ' + String(e.text || '')));

type Opt = { patron?: string; devotion?: number; faith?: number; atheist?: boolean; foes?: { at?: string; tier?: string }[] };
/** A fight: the Priest (Faith 7 unless given) and an Ally against two soldiers, on the Priest's turn, everyone at full
 * HP, placed: Priest 2,5, Ally 2,6 (next to each other), foes 5,5 and 6,5. */
function holy(o: Opt = {}) {
  const f = fightWith([{ name: 'Priest', skills: { faith: o.faith ?? 7 } }, { name: 'Ally' }], o.foes || [{ at: 'F6' }, { at: 'G6' }]);
  const c = f.g.characters[f.pc.charId!];
  if (o.atheist) { c.belief = { kind: 'atheist' }; c.patron = null; c.devotion = 0; }
  else { const p = o.patron || 'nerukhan'; c.belief = { kind: 'faithful', patron: p }; c.patron = p; c.devotion = o.devotion ?? 3; }
  const [pr, al] = f.pcs, [f0, f1] = f.foes;
  pr.pos = '2,5'; al.pos = '2,6'; if (f0) f0.pos = '5,5'; if (f1) f1.pos = '6,5';
  for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; u.shield = 0; }
  f.turn(pr);
  const api = {
    f, get g() { return f.g; }, get cb() { return f.cb; },
    get c(): Character { return f.g.characters[c.id]; },
    get me(): Unit { return f.unit(pr.id); }, get ally(): Unit { return f.unit(al.id); },
    get foe(): Unit { return f.unit(f0.id); }, get foe2(): Unit { return f.unit(f1.id); },
    pray: (kind: 'whisper' | 'hymn' | 'miracle', id: string, x: { targetId?: string; targetId2?: string; tile?: string } = {}, by = 'host') => f.act({ type: 'faith/pray', unitId: pr.id, kind, id, ...x } as Action, by),
    act: (a: any, by = 'host') => f.act(a as Action, by),
    bound: <T>(fn: () => T) => withGame(f.g, fn),
  };
  return api;
}
type H = ReturnType<typeof holy>;

// ---------------------------------------------------------------------------------------------------------------------
describe('belief (creation, old saves)', () => {
  it('a sheet can be Faithful (patron, Devotion 3) or an Atheist; an unknown patron is refused', () => {
    let g = newGame('BEL1', { id: 'host', name: 'Host' });
    const sheet = (name: string, belief: any) => ({ ...sheetOf({ name }), belief });
    g = apply(g, { type: 'char/add', sheet: sheet('Saint', { kind: 'faithful', patron: 'mother_ember' }) } as any, 'host');
    g = apply(g, { type: 'char/add', sheet: sheet('Doubter', { kind: 'atheist' }) } as any, 'host');
    const [a, b] = Object.values(g.characters);
    expect(a.belief).toEqual({ kind: 'faithful', patron: 'mother_ember' }); expect(a.patron).toBe('mother_ember'); expect(a.devotion).toBe(3);
    expect(beliefOf(b).kind).toBe('atheist'); expect(b.patron ?? null).toBeNull();
    expect(() => apply(g, { type: 'char/add', sheet: sheet('X', { kind: 'faithful', patron: 'zeus' }) } as any, 'host')).toThrow(/Pick a patron/);
  });
  it('old saves: a pact reads as Faithful to that patron with its Devotion; no pact reads as Atheist', () => {
    const s = storyWith([{}, {}]); const [a, b] = s.chars.map((c) => s.g.characters[c.id]);
    delete a.belief; a.patron = 'old_overcast'; a.devotion = 6; delete b.belief; b.patron = null;
    expect(beliefOf(a)).toEqual({ kind: 'faithful', patron: 'old_overcast' }); expect(beliefOf(b).kind).toBe('atheist');
    const v = faithView(s.g, a.id)!; expect(v.patron!.name).toMatch(/Overcast/); expect(v.devotion).toBe(6); expect(v.gates.hymn2).toBe(true); expect(v.gates.hymn3).toBe(false);
    expect(faithView(s.g, b.id)!.patron).toBeNull();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('previewPrayer: the gate, the mode and every refusal', () => {
  it('within standing no roll; above it an overreach (12 + 2 × shortfall); an Atheist rolls 12 / 14 / 16 / 18', () => {
    const h = holy({ devotion: 3 });
    const p1 = previewPrayer(h.g, h.me.id, 'hymn', 'saints_shield'); expect(p1.ok).toBe(true); expect(p1.mode).toBe('standing'); expect(p1.roll).toBeUndefined(); expect(p1.ap).toBe(3); expect(p1.gate).toBe(GATE[1]);
    const p2 = previewPrayer(h.g, h.me.id, 'hymn', 'judgement'); expect(p2.mode).toBe('overreach'); expect(p2.overreach!.tn).toBe(OVERREACH.base + OVERREACH.step * (GATE[2] - 3));
    const p3 = previewPrayer(h.g, h.me.id, 'hymn', 'nerukhan.absolution'); expect(p3.overreach!.tn).toBe(12 + 2 * 4);
    const w = previewPrayer(h.g, h.me.id, 'whisper', 'luck'); expect(w.ok).toBe(true); expect(w.mode).toBe('standing'); expect(w.ap).toBe(1);
    const a = holy({ atheist: true });
    const aw = previewPrayer(a.g, a.me.id, 'whisper', 'health'); expect(aw.mode).toBe('dice'); expect(aw.roll!.tn).toBe(ATHEIST_TN.whisper);
    a.c.faithPieces = { mother_ember: 2 };
    expect(previewPrayer(a.g, a.me.id, 'hymn', 'mother_ember.hearthlight').roll!.tn).toBe(16);
    expect(previewPrayer(a.g, a.me.id, 'hymn', 'mother_ember.feed_the_fire').why).toMatch(/haven't learned/);
  });
  it('refuses: Faith 3, an Atheist\'s Miracle, Faith 7, Devotion 10 (rules 1.6.2), Silenced, not your turn, AP', () => {
    const h = holy({ faith: 2 }); expect(previewPrayer(h.g, h.me.id, 'whisper', 'luck').why).toMatch(/Faith 3/);
    const a = holy({ atheist: true }); expect(previewPrayer(a.g, a.me.id, 'miracle', '').why).toMatch(/Atheist never gets a Miracle/);
    const lo = holy({ faith: 6, devotion: 9 }); expect(previewPrayer(lo.g, lo.me.id, 'miracle', 'saints_verdict').why).toMatch(/Faith 7/);
    const dv = holy({ faith: 7, devotion: 9 }); expect(previewPrayer(dv.g, dv.me.id, 'miracle', 'saints_verdict').why).toMatch(/Devotion 10 \(you have 9\)/);
    expect(GATE.miracle).toBe(10); expect(GATE[3]).toBe(7);
    const s = holy(); s.me.conds = { silenced: 2 } as any; expect(previewPrayer(s.g, s.me.id, 'whisper', 'luck').why).toMatch(/Silenced/);
    const t = holy(); expect(previewPrayer(t.g, t.ally.id, 'whisper', 'luck').ok).toBe(false);
    const ap = holy(); ap.me.ap = 2; expect(previewPrayer(ap.g, ap.me.id, 'hymn', 'saints_shield').why).toMatch(/Needs 3 AP/);
    expect(() => ap.pray('hymn', 'saints_shield', { targetId: ap.ally.id })).toThrow(/Needs 3 AP/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('prayer in a fight (faith/pray through combat/pray)', () => {
  it('a Whisper by standing: 1 AP, the mana meter −5, once a turn', () => {
    const h = holy({ patron: 'mother_ember' }); h.ally.hp = 50; const mana = h.cb.mana!, ap = h.me.ap;
    h.pray('whisper', 'health', { targetId: h.ally.id });
    expect(h.ally.hp).toBe(50 + Math.round(5 * h.me.blessPower! * mendFactor(h.me.level))); expect(h.me.ap).toBe(ap - 1); expect(h.cb.mana).toBe(Math.max(0, mana - 5));
    expect(fx(h.cb, FAITH_FX.prayer).length).toBe(1);
    expect(() => h.pray('whisper', 'luck')).toThrow(/One Whisper a turn/);
  });
  it('a Hymn by standing lands; Witnessed at Faith 5; the patron speaks; then the cooldown', () => {
    const h = holy({ devotion: 3, faith: 5 });
    h.pray('hymn', 'saints_shield', { targetId: h.ally.id });
    expect(h.ally.shield).toBe(Math.round(16 * h.me.blessPower! * mendFactor(h.me.level))); expect(h.me.ap).toBe(3); // 16: rules 1.22 (12 in rules 1.20)
    expect(condOn(h.me, 'witnessed')).toBe(true); expect(fx(h.cb, FAITH_FX.witnessed).length).toBe(1);
    expect(fx(h.cb, FAITH_FX.patron_line).some((e) => e.event === 'answered')).toBe(true);
    expect(() => h.pray('hymn', 'saints_shield', { targetId: h.ally.id })).toThrow(/wait/);
  });
  it('Faith 4: no Witnessed; a Whisper never makes you Witnessed', () => {
    const h = holy({ faith: 4 }); h.pray('hymn', 'saints_shield', { targetId: h.ally.id }); expect(condOn(h.me, 'witnessed')).toBe(false);
    const w = holy({ faith: 9 }); w.pray('whisper', 'luck'); expect(condOn(w.me, 'witnessed')).toBe(false);
  });
  it('an overreach that lands (a natural 20)', () => {
    const h = holy({ devotion: 3 }); const hp = h.foe.hp;
    h.g.rng.state = rngFor(20); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    expect(h.foe.hp).toBeLessThan(hp); expect(logHas(h.cb, /overreach/)).toBe(true); expect(h.c.devotion).toBe(3);
  });
  it('an overreach that misses: nothing happens, the AP is spent, −3 Devotion XP (45 → 42: Devotion 2), the patron refuses', () => {
    const h = holy({ devotion: 3 }); const hp = h.foe.hp;
    h.g.rng.state = rngFor(1); h.pray('hymn', 'judgement', { targetId: h.foe.id });
    expect(h.foe.hp).toBe(hp); expect(h.me.ap).toBe(3); expect(h.c.devotion).toBe(2); expect(h.c.devotionXp).toBe(42);
    expect(fx(h.cb, FAITH_FX.prayer_fail)[0].why).toBe('overreach'); expect(fx(h.cb, FAITH_FX.devotion)[0]).toMatchObject({ delta: -3, xp: 42, now: 2, was: 3, level: 2 });
    expect(fx(h.cb, FAITH_FX.patron_line).some((e) => e.event === 'refused')).toBe(true);
  });
  it('an Atheist prays by dice: a miss costs only the AP (no Devotion); a hit lands', () => {
    const miss = holy({ atheist: true }); miss.ally.hp = 50;
    miss.g.rng.state = rngFor(1); miss.pray('whisper', 'health', { targetId: miss.ally.id });
    expect(miss.ally.hp).toBe(50); expect(fx(miss.cb, FAITH_FX.prayer_fail)[0].why).toBe('dice'); expect(fx(miss.cb, FAITH_FX.devotion).length).toBe(0);
    const hit = holy({ atheist: true }); hit.ally.hp = 50;
    hit.g.rng.state = rngFor(20); hit.pray('whisper', 'health', { targetId: hit.ally.id });
    expect(hit.ally.hp).toBeGreaterThan(50);
  });
  it('the Miracle: Faith 7, Devotion 10, no roll, lowers Devotion by 5 levels, once a session (rules 1.6.2)', () => {
    const h = holy({ patron: 'mother_ember', devotion: 10 }); h.ally.hp = 10;
    h.pray('miracle', 'everyone_home');
    expect(h.ally.hp).toBe(h.ally.maxHp); expect(h.c.devotion).toBe(5); expect(h.c.devotionXp).toBe(102); expect(h.c.miracleSession).toBe(sessionN(h.g));
    expect(fx(h.cb, FAITH_FX.miracle).length).toBe(1);
    expect(fx(h.cb, FAITH_FX.devotion).pop()).toMatchObject({ delta: -348, xp: 102, now: 5, was: 10, level: 5, reason: 'the Miracle: Devotion −5 levels' });
    h.c.devotion = 10; h.c.devotionXp = 450; h.f.turn(h.me);
    expect(() => h.pray('miracle', 'everyone_home')).toThrow(/One Miracle a session/);
  });
  it('the old shape (combat/pray {choice}) still prays a Hymn of your patron', () => {
    const h = holy({ devotion: 3 });
    h.act({ type: 'combat/pray', unitId: h.me.id, choice: 'saints_shield', targetId: h.ally.id });
    expect(h.ally.shield).toBeGreaterThan(0); expect(logHas(h.cb, /prays to Holy Father Nerukhan/)).toBe(true);
  });
  it('another player can\'t pray for your character', () => {
    const h = holy(); h.act({ type: 'player/join', id: 'p2', name: 'P2' });
    expect(() => h.pray('whisper', 'luck', {}, 'p2')).toThrow(/Not your unit/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the Whispers (six, and Rebuke since rules 1.21)', () => {
  it('Luck: +2 on the next attack roll, then gone', () => {
    const h = holy(); h.pray('whisper', 'luck', { targetId: h.me.id });
    const pv = h.bound(() => previewAttack(h.cb, h.me, h.foe, 'shot')); expect((pv.terms || []).some((t: any) => /Luck/.test(t.label))).toBe(true);
    h.act({ type: 'combat/attack', unitId: h.me.id, targetId: h.foe.id, mode: 'shot' }); expect(h.me.faith?.luck).toBeUndefined();
  });
  it('Protection: a 6 × power shield (rules 1.20)', () => { const h = holy(); h.pray('whisper', 'protection', { targetId: h.ally.id }); expect(h.ally.shield).toBe(Math.floor(6 * h.me.blessPower! * mendFactor(h.me.level))); });
  it('Courage: ends Fear and Shaken', () => { const h = holy(); h.ally.conds = { shaken: 2, fear: 2 } as any; h.pray('whisper', 'courage', { targetId: h.ally.id }); expect(condOn(h.ally, 'shaken') || condOn(h.ally, 'fear')).toBe(false); });
  it('Guidance: reveals Hidden enemies within 6 and gives +2 on the next spotting roll', () => {
    const h = holy(); h.foe.hidden = true; h.pray('whisper', 'guidance'); expect(h.foe.hidden).toBe(false); expect(h.me.faith?.guidance).toBe(true);
  });
  it('Safe Passage: the next move this turn draws no opportunity attacks', () => {
    const h = holy(); h.pray('whisper', 'safe_passage'); expect(h.me.faith?.safePassage).toBe(h.cb.round + ':' + h.cb.turn);
  });
  it('every Whisper is in the data with a target', () => { expect(WHISPERS.map((w) => w.id).sort()).toEqual(['courage', 'guidance', 'health', 'luck', 'protection', 'rebuke', 'safe_passage']); });
});

// ---------------------------------------------------------------------------------------------------------------------
// Every patron's three Hymns and Miracle (Devotion 10, Faith 9: all by standing).
type Case = { id: string; kind?: 'hymn' | 'miracle'; setup?: (h: H) => void; args: (h: H) => any; check: (h: H, before: any) => void; seed?: number[] };
const ALLY = (h: H) => ({ targetId: h.ally.id }), FOE = (h: H) => ({ targetId: h.foe.id });
const CASES: Record<string, Case[]> = {
  nerukhan: [
    { id: 'saints_shield', args: ALLY, check: (h) => expect(h.ally.shield).toBe(Math.round(16 * h.me.blessPower! * mendFactor(h.me.level))) }, // rules 1.22
    { id: 'judgement', setup: (h) => { h.foe.faith = { harmedHelpless: true }; }, args: FOE, check: (h, b) => { expect(h.foe.hp).toBeLessThan(b.foeHp); expect(logHas(h.cb, /×1\.3: it harmed the helpless/)).toBe(true); } }, // rules 1.21, item 1263: 30% more (it was double)
    { id: 'absolution', setup: (h) => { h.ally.hp = 40; h.ally.conds = { shaken: 2 } as any; }, args: ALLY, check: (h) => { expect(condOn(h.ally, 'shaken')).toBe(false); expect(h.ally.hp).toBeGreaterThan(40); } },
    { id: 'saints_verdict', kind: 'miracle', setup: (h) => { h.foe.faith = { harmedHelpless: true }; }, args: () => ({}), check: (h, b) => { expect(h.foe.hp).toBeLessThan(b.foeHp); expect(h.foe2.hp).toBeLessThan(b.foe2Hp); expect(logHas(h.cb, /×2: it harmed the helpless/)).toBe(true); } },
  ],
  the_quartermaster: [
    { id: 'resupply', setup: (h) => { h.ally.ammo = 0; }, args: ALLY, check: (h) => expect(h.ally.ammo).toBeGreaterThan(0) },
    { id: 'dig_in', args: ALLY, check: (h) => { expect(h.ally.faith?.dugIn).toBe(h.ally.pos); expect(h.ally.braced).toBe(true); h.f.turn(h.foe); const pv = h.bound(() => previewAttack(h.cb, h.foe, h.ally, 'shot')); expect((pv.terms || []).some((t: any) => /Dug in/.test(t.label))).toBe(true); } },
    { id: 'covering_fire', seed: [1], args: (h) => ({ tile: h.foe.pos }), check: (h) => expect(condOn(h.foe, 'pinned')).toBe(true) },
    { id: 'requisition_approved', kind: 'miracle', setup: (h) => { h.ally.ammo = 0; h.ally.jammed = true; h.ally.heat = 4; }, args: () => ({}), check: (h) => { expect(h.ally.ammo).toBeGreaterThan(0); expect(h.ally.jammed).toBe(false); expect(h.ally.heat).toBe(0); expect(h.ally.apNext).toBe(3); expect(h.me.apNext).toBe(3); expect((h.g.characters[h.ally.charId!].pack || []).some((x: any) => x.item === 'standard_core' && x.qty >= 2) || (h.ally.mg?.cores ?? 0) >= 2).toBe(true); } },
  ],
  the_laughing_mask: [
    { id: 'lucky_break', args: ALLY, check: (h) => expect(h.ally.faith?.luckyBreak).toBe(2) }, // rules 1.21, item 1265: two rerolls
    { id: 'switcheroo', seed: [1], args: (h) => ({ targetId: h.ally.id, targetId2: h.foe.id }), check: (h, b) => { expect(h.ally.pos).toBe(b.foePos); expect(h.foe.pos).toBe(b.allyPos); } },
    { id: 'pratfall', seed: [1], args: FOE, check: (h) => { expect(condOn(h.foe, 'prone') || !!h.foe.prone).toBe(true); expect(condOn(h.foe, 'disarmed')).toBe(true); } },
    { id: 'encore', kind: 'miracle', setup: (h) => { h.ally.faith = { lastRound: h.cb.round, lastSpent: 2, lastKey: 'combat/move:move' }; }, args: () => ({}), check: (h) => { expect(h.ally.faith?.encore).toMatchObject({ key: 'combat/move:move', ap: 2, started: false }); expect(condOn(h.foe, 'confused') && condOn(h.foe2, 'confused')).toBe(true); } },
  ],
  toll_keeper: [
    { id: 'coin_for_the_ferry', setup: (h) => { Object.assign(h.ally, { hp: 0, downed: true, saves: { ok: 0, fail: 0 } }); }, args: ALLY, check: (h) => { expect(h.ally.downed).toBe(false); expect(h.ally.hp).toBe(Math.round(5 * h.me.blessPower! * mendFactor(h.me.level))); } },
    { id: 'hold_the_gate', args: () => ({}), check: (h) => { h.bound(() => applyDamage(h.cb, h.ally, 9999, { by: h.foe, type: 'physical' } as any)); expect(h.ally.hp).toBe(1); } },
    { id: 'last_crossing', seed: [1], setup: (h) => { h.foe.hp = 10; }, args: FOE, check: (h) => expect(h.foe.dead).toBe(true) },
    { id: 'turned_back', kind: 'miracle', setup: (h) => { Object.assign(h.ally, { hp: 0, dead: true, downed: false }); }, args: () => ({}), check: (h) => { expect(h.ally.dead).toBe(false); expect(h.ally.hp).toBe(Math.ceil(h.ally.maxHp / 2)); } },
  ],
  mother_ember: [
    { id: 'warm_hands', setup: (h) => { h.ally.hp = 30; }, args: ALLY, check: (h) => expect(h.ally.hp).toBe(Math.min(h.ally.maxHp, 30 + Math.round(13 * h.me.blessPower! * mendFactor(h.me.level)))) },
    { id: 'hearthlight', setup: (h) => { h.ally.hp = 30; }, args: (h) => ({ tile: h.ally.pos }), check: (h) => { expect(((h.cb as any).faithZones || []).length).toBe(1); h.f.turn(h.ally); expect(h.ally.hp).toBeGreaterThan(30); } },
    { id: 'feed_the_fire', setup: (h) => { h.ally.ap = 0; h.ally.conds = { weakened: 2 } as any; }, args: ALLY, check: (h) => { expect(h.ally.ap).toBe(2); expect(condOn(h.ally, 'weakened')).toBe(false); } }, // rules 1.21, item 1267: +2 AP
    { id: 'everyone_home', kind: 'miracle', setup: (h) => { h.ally.hp = 5; h.me.hp = 20; h.ally.conds = { shaken: 2 } as any; }, args: () => ({}), check: (h) => { expect(h.ally.hp).toBe(h.ally.maxHp); expect(h.me.hp).toBe(h.me.maxHp); expect(condOn(h.ally, 'shaken')).toBe(false); expect(h.ally.shield).toBe(Math.floor(17 * h.me.blessPower! * mendFactor(h.me.level))); } },
  ],
  old_overcast: [
    { id: 'thunderclap', seed: [1, 1], args: () => ({ tile: '4,5' }), check: (h) => expect(condOn(h.foe, 'shaken') || condOn(h.foe2, 'shaken')).toBe(true) },
    { id: 'lightning_rod', args: FOE, check: (h, b) => { expect(h.foe.hp).toBeLessThan(b.foeHp); expect(h.foe2.hp).toBeLessThan(b.foe2Hp); } },
    { id: 'gather_the_clouds', args: () => ({}), check: (h) => expect(((h.cb as any).faithClouds || []).length).toBe(1) },
    { id: 'the_sky_answers', kind: 'miracle', args: (h) => ({ tile: h.foe.pos }), check: (h, b) => { expect(h.foe.hp).toBeLessThan(b.foeHp); expect(h.foe2.hp).toBeLessThan(b.foe2Hp); } },
  ],
  the_matchmaker: [
    { id: 'red_thread', args: (h) => ({ targetId: h.me.id, targetId2: h.ally.id }), check: (h, b) => { h.bound(() => applyDamage(h.cb, h.ally, 20, { by: h.foe, type: 'physical' } as any)); expect(h.me.hp).toBe(b.meHp - 10); } },
    { id: 'sweet_nothings', seed: [1], args: FOE, check: (h) => { expect(condOn(h.foe, 'smitten')).toBe(true); expect(h.bound(() => previewAttack(h.cb, h.foe, h.me, 'shot')).why).toMatch(/Smitten/); } },
    { id: 'together', args: (h) => ({ targetId: h.me.id, targetId2: h.ally.id }), check: (h) => { for (const u of [h.me, h.ally]) { expect(condOn(u, 'inspired')).toBe(true); expect(condOn(u, 'guarded')).toBe(true); } } },
    { id: 'love_conquers', kind: 'miracle', seed: [20, 20], args: () => ({}), check: (h) => expect(h.foe.surrendered && h.foe2.surrendered).toBe(true) },
  ],
  counting_weaver: [
    { id: 'foreknowing', args: ALLY, check: (h) => expect(h.ally.faith?.foreknown).toBe(2) }, // rules 1.21, item 1266: two attacks
    { id: 'unravel', setup: (h) => { h.foe.shield = 30; h.foe.braced = true; h.foe.conds = { inspired: 2 } as any; }, args: FOE, check: (h) => { expect(h.foe.shield).toBe(0); expect(h.foe.braced).toBe(false); expect(condOn(h.foe, 'inspired')).toBe(false); } },
    { id: 'cut_short', seed: [1], args: FOE, check: (h) => expect(condOn(h.foe, 'stunned')).toBe(true) },
    { id: 'rewoven', kind: 'miracle', args: () => ({}), check: (h, b) => expect(h.cb.order.length).toBe(b.order + 2) },
  ],
};
describe('every patron\'s Hymns and Miracle', () => {
  it('the eight launch patrons each have 3 Hymns (tiers 1-3) and a Miracle, and every one is tested here', () => {
    expect(FAITH_PATRONS.length).toBe(8);
    for (const p of FAITH_PATRONS) {
      expect(p.hymns.map((x: any) => x.tier)).toEqual([1, 2, 3]);
      expect(CASES[p.id].map((x) => x.id)).toEqual([...p.hymns.map((x: any) => x.id), p.miracle.id]);
    }
  });
  for (const p of FAITH_PATRONS) for (const k of CASES[p.id] || []) {
    it(p.name + ': ' + k.id, () => {
      const h = holy({ patron: p.id, devotion: 10, faith: 9 });
      k.setup?.(h);
      const before = { foeHp: h.foe.hp, foe2Hp: h.foe2.hp, meHp: h.me.hp, foePos: h.foe.pos, allyPos: h.ally.pos, order: h.cb.order.length };
      if (k.seed) h.g.rng.state = rngFor(...k.seed);
      h.pray(k.kind || 'hymn', k.id, k.args(h));
      expect(fx(h.cb, FAITH_FX.prayer).length).toBe(1);
      k.check(h, before);
    });
  }
});

// ---------------------------------------------------------------------------------------------------------------------
describe('interventions (while Witnessed; rules 1.6.3: each ends Witnessed, the numbers scale with Devotion)', () => {
  const witnessed = (h: H) => { h.me.conds = { ...(h.me.conds || {}), witnessed: 2 } as any; };
  it('Nerukhan: an enemy damages a Downed ally, it takes 20 + 4 × Devotion Soul; not twice; not without Witnessed', () => {
    const h = holy({ patron: 'nerukhan' }); witnessed(h); Object.assign(h.ally, { hp: 0, downed: true, saves: { ok: 0, fail: 0 } });
    const hp = h.foe.hp; h.bound(() => applyDamage(h.cb, h.ally, 5, { by: h.foe, type: 'physical' } as any));
    expect(h.foe.hp).toBeLessThan(hp); expect(fx(h.cb, FAITH_FX.intervention)[0].trigger).toBe('enemy_harms_helpless');
    const hp2 = h.foe.hp; h.bound(() => applyDamage(h.cb, h.ally, 5, { by: h.foe, type: 'physical' } as any)); expect(h.foe.hp).toBe(hp2);
    const n = holy({ patron: 'nerukhan' }); Object.assign(n.ally, { hp: 0, downed: true, saves: { ok: 0, fail: 0 } }); const hp3 = n.foe.hp;
    n.bound(() => applyDamage(n.cb, n.ally, 5, { by: n.foe, type: 'physical' } as any)); expect(n.foe.hp).toBe(hp3);
  });
  it('The Quartermaster (rules 1.6.3): you reload, the reload is free (its AP comes back)', () => {
    const h = holy({ patron: 'the_quartermaster' }); witnessed(h); h.me.ammo = 1; const ap = h.me.ap;
    h.act({ type: 'combat/reload', unitId: h.me.id });
    expect(h.me.ammo).toBeGreaterThan(1); expect(h.me.ap).toBe(ap);
    expect(fx(h.cb, FAITH_FX.intervention)[0]).toMatchObject({ trigger: 'you_reload', unit: h.me.id, patron: 'the_quartermaster', amount: 2 });
  });
  it('The Laughing Mask (rules 1.6.3): an enemy misses you (no natural 1 needed), it falls Prone', () => {
    const h = holy({ patron: 'the_laughing_mask' }); witnessed(h); h.me.def = 99;
    h.g.rng.state = rngFor(10); h.bound(() => resolveAttack(h.cb, h.g.rng, h.foe, h.me, 'shot', null, { free: true, noAp: true }));
    expect(condOn(h.foe, 'prone') || !!h.foe.prone).toBe(true); expect(fx(h.cb, FAITH_FX.intervention)[0].trigger).toBe('enemy_misses_you');
  });
  it('The Toll-Keeper: an ally would drop to 0 HP, they stay at 1', () => {
    const h = holy({ patron: 'toll_keeper' }); witnessed(h);
    h.bound(() => applyDamage(h.cb, h.ally, 9999, { by: h.foe, type: 'physical' } as any)); expect(h.ally.hp).toBe(1);
    h.bound(() => applyDamage(h.cb, h.ally, 9999, { by: h.foe, type: 'physical' } as any)); expect(h.ally.hp).toBe(0);
  });
  it('Mother Ember: an ally drops below a quarter HP, they heal 10 + 3 × Devotion (19 at Devotion 3; rules 1.20)', () => {
    const h = holy({ patron: 'mother_ember' }); witnessed(h); const m = h.ally.maxHp;
    h.bound(() => applyDamage(h.cb, h.ally, m - 10, { by: h.foe, type: 'physical' } as any));
    expect(h.ally.hp).toBe(10 + Math.round(19 * h.me.blessPower!));
  });
  it('Old Overcast: you kill an enemy, 20 + 4 × Devotion Storm goes to the nearest other enemy', () => {
    const h = holy({ patron: 'old_overcast' }); witnessed(h); const hp2 = h.foe2.hp;
    h.bound(() => applyDamage(h.cb, h.foe, 9999, { by: h.me, type: 'physical', credit: 'hp' } as any));
    expect(h.foe2.hp).toBeLessThan(hp2); expect(fx(h.cb, FAITH_FX.intervention)[0].trigger).toBe('you_kill');
  });
  it('The Matchmaker: an ally next to you is hit, half the damage moves to you', () => {
    const h = holy({ patron: 'the_matchmaker' }); witnessed(h); const me = h.me.hp, al = h.ally.hp;
    h.bound(() => applyDamage(h.cb, h.ally, 20, { by: h.foe, type: 'physical' } as any));
    expect(h.me.hp).toBe(me - 10); expect(h.ally.hp).toBe(al - 10);
  });
  it('The Counting Weaver: an enemy crits you, it becomes a normal hit', () => {
    const h = holy({ patron: 'counting_weaver' }); witnessed(h);
    h.g.rng.state = rngFor(20); h.bound(() => resolveAttack(h.cb, h.g.rng, h.foe, h.me, 'shot', null, { free: true, noAp: true }));
    expect(fx(h.cb, FAITH_FX.intervention)[0].trigger).toBe('enemy_crits_you'); expect(logHas(h.cb, /critical becomes a normal hit/)).toBe(true);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('tags: what your patron sees', () => {
  it('a liked tag: +1 Devotion XP, and each liked tag once a fight (rules 1.6.1)', () => {
    const h = holy({ patron: 'mother_ember', devotion: 3 });
    for (let i = 0; i < 3; i++) { h.cb.round = 1 + i; h.f.turn(h.me); h.ally.hp = 50; h.pray('whisper', 'health', { targetId: h.ally.id }); }
    expect(h.c.devotion).toBe(3); expect(h.c.devotionXp).toBe(46); expect(faithView(h.g, h.c.id)!.likedThisFight).toBe(1);
    expect(fx(h.cb, FAITH_FX.devotion).filter((e) => e.tag === 'heal').length).toBe(1);
  });
  it('a taboo: −3 XP, −6 while Witnessed (betray: Nerukhan)', () => {
    const h = holy({ patron: 'nerukhan', devotion: 5 });
    h.bound(() => applyDamage(h.cb, h.ally, 5, { by: h.me, type: 'physical' } as any)); expect(h.c.devotionXp).toBe(99); expect(h.c.devotion).toBe(4);
    h.act({ type: 'combat/end-turn', unitId: h.me.id }); h.f.turn(h.me); h.me.conds = { witnessed: 2 } as any;
    h.bound(() => applyDamage(h.cb, h.ally, 5, { by: h.me, type: 'physical' } as any)); expect(h.c.devotionXp).toBe(93); expect(h.c.devotion).toBe(4);
    expect(fx(h.cb, FAITH_FX.patron_line).some((e) => e.event === 'taboo')).toBe(true);
  });
  it('kill as a taboo is only of the helpless (the Toll-Keeper)', () => {
    const h = holy({ patron: 'toll_keeper', devotion: 5 });
    h.bound(() => applyDamage(h.cb, h.foe, 9999, { by: h.me, type: 'physical', credit: 'hp' } as any)); expect(h.c.devotion).toBe(5);
    h.cb.round += 1; h.f.turn(h.me); h.foe2.surrendered = true;
    h.bound(() => applyDamage(h.cb, h.foe2, 9999, { by: h.me, type: 'physical', credit: 'hp' } as any)); expect(h.c.devotion).toBe(4);
  });
  it('Witnessed: +2 on an attack roll that would carry a liked tag; a liked kill is not every attack (rules 1.22: that +2 is earned by a kill)', () => {
    const h = holy({ patron: 'old_overcast' }); h.me.conds = { witnessed: 2 } as any;
    const pv = h.bound(() => previewAttack(h.cb, h.me, h.foe, 'shot')); expect((pv.terms || []).some((t: any) => /^Witnessed/.test(t.label))).toBe(false);
    const j = holy({ patron: 'nerukhan' }); j.me.conds = { witnessed: 2 } as any; j.foe.faith = { harmedHelpless: true }; // Nerukhan likes judge: an attack on one that harmed the helpless
    expect((j.bound(() => previewAttack(j.cb, j.me, j.foe, 'shot')).terms || []).some((t: any) => t.label === 'Witnessed' && t.v === 2)).toBe(true);
    const n = holy({ patron: 'mother_ember' }); n.me.conds = { witnessed: 2 } as any;
    expect((n.bound(() => previewAttack(n.cb, n.me, n.foe, 'shot')).terms || []).some((t: any) => t.label === 'Witnessed')).toBe(false);
  });
  it('an Atheist has no Devotion to move', () => {
    const h = holy({ atheist: true }); h.ally.hp = 50; h.g.rng.state = rngFor(20); h.pray('whisper', 'health', { targetId: h.ally.id });
    expect(fx(h.cb, FAITH_FX.devotion).length).toBe(0); expect(h.c.devotion).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('vows', () => {
  it('swearing: the Faithful, round 1, before acting, one a fight; Shield names an ally', () => {
    const a = holy({ atheist: true }); expect(() => a.act({ type: 'faith/vow', unitId: a.me.id, id: 'mercy' })).toThrow(/Only the Faithful/);
    const h = holy();
    expect(() => h.act({ type: 'faith/vow', unitId: h.me.id, id: 'shield' })).toThrow(/Name the ally/);
    expect(() => h.act({ type: 'faith/vow', unitId: h.me.id, id: 'nope' })).toThrow(/No such vow/);
    h.act({ type: 'faith/vow', unitId: h.me.id, id: 'shield', allyId: h.ally.id });
    expect(h.me.vow).toEqual({ id: 'shield', allyId: h.ally.id, state: 'sworn' }); expect(h.c.vow?.state).toBe('sworn');
    expect(fx(h.cb, FAITH_FX.vow)[0].state).toBe('sworn');
    expect(() => h.act({ type: 'faith/vow', unitId: h.me.id, id: 'mercy' })).toThrow(/One vow a fight/);
    const late = holy(); late.pray('whisper', 'luck'); expect(() => late.act({ type: 'faith/vow', unitId: late.me.id, id: 'mercy' })).toThrow(/before you act/);
    expect(VOWS.length).toBe(6);
  });
  it('Mercy breaks when you damage a Downed enemy: −5 XP and the patron speaks', () => {
    const h = holy({ devotion: 5 }); h.act({ type: 'faith/vow', unitId: h.me.id, id: 'mercy' });
    Object.assign(h.foe, { hp: 0, downed: true }); h.foe.dead = false;
    h.bound(() => applyDamage(h.cb, h.foe, 5, { by: h.me, type: 'physical' } as any));
    expect(h.me.vow!.state).toBe('broken'); expect(h.c.devotionXp).toBe(97); expect(h.c.devotion).toBe(4);
    expect(fx(h.cb, FAITH_FX.patron_line).some((e) => e.event === 'vow_broken')).toBe(true);
  });
  it('Shield breaks when the named ally is Downed', () => {
    const h = holy({ devotion: 5 }); h.act({ type: 'faith/vow', unitId: h.me.id, id: 'shield', allyId: h.ally.id });
    h.bound(() => applyDamage(h.cb, h.ally, 9999, { by: h.foe, type: 'physical' } as any)); expect(h.me.vow!.state).toBe('broken');
  });
  it('Bare Hands breaks on a gun attack', () => {
    const h = holy({ devotion: 5 }); h.act({ type: 'faith/vow', unitId: h.me.id, id: 'bare' });
    h.act({ type: 'combat/attack', unitId: h.me.id, targetId: h.foe.id, mode: 'shot' }); expect(h.me.vow!.state).toBe('broken');
  });
  it('a vow kept to the end of the fight: +3 XP and the line; Nobody Left Behind breaks (−5) if an ally is still Downed', () => {
    const h = holy({ devotion: 5 }); h.act({ type: 'faith/vow', unitId: h.me.id, id: 'mercy' });
    for (const u of h.f.foes) Object.assign(u, { hp: 0, dead: true });
    h.act({ type: 'combat/end-turn', unitId: h.me.id });
    expect(h.g.phase).toBe('story'); expect(h.c.devotionXp).toBe(105); expect(h.c.devotion).toBe(5); expect(h.c.vow ?? null).toBeNull();
    expect(fx(h.g.combat!, FAITH_FX.vow).some((e) => e.state === 'kept')).toBe(true);
    const n = holy({ devotion: 5 }); n.act({ type: 'faith/vow', unitId: n.me.id, id: 'no_one_behind' });
    Object.assign(n.ally, { hp: 0, downed: true, saves: { ok: 0, fail: 0 } }); for (const u of n.f.foes) Object.assign(u, { hp: 0, dead: true });
    n.act({ type: 'combat/end-turn', unitId: n.me.id }); expect(n.c.devotionXp).toBe(97); expect(n.c.devotion).toBe(4);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('knowledge pieces, conversion, apostasy, the Narrator\'s Devotion (Narrator-only)', () => {
  const story = () => { const s = storyWith([{ skills: { faith: 6 } }]); s.act({ type: 'player/join', id: 'p2', name: 'P2' }); return s; };
  it('a piece unlocks the next Hymn in order, by dice; only the Narrator grants it', () => {
    const s = story(); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'atheist' }; c.patron = null;
    expect(() => s.act({ type: 'faith/piece', charId: c.id, patron: 'mother_ember' }, 'p2')).toThrow(/Only the Narrator/);
    s.act({ type: 'faith/piece', charId: c.id, patron: 'mother_ember', from: 'Sister Coal' });
    const c1 = s.g.characters[c.id]; expect(c1.faithPieces).toEqual({ mother_ember: 1 }); expect(c1.hymns).toEqual(['mother_ember.warm_hands']);
    s.act({ type: 'faith/piece', charId: c.id, patron: 'mother_ember' }); s.act({ type: 'faith/piece', charId: c.id, patron: 'the_quartermaster' });
    expect(diceHymns(s.g.characters[c.id]).sort()).toEqual(['mother_ember.hearthlight', 'mother_ember.warm_hands', 'the_quartermaster.resupply']);
    s.act({ type: 'faith/piece', charId: c.id, patron: 'mother_ember' });
    expect(() => s.act({ type: 'faith/piece', charId: c.id, patron: 'mother_ember' })).toThrow(/all three/);
    expect(said(s.g, /piece 1 of 3/)).toBe(true);
  });
  it('a Jealous patron\'s Faithful can\'t learn from other patrons; an Open one\'s can (by dice)', () => {
    const s = story(); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron: 'old_overcast' }; c.patron = 'old_overcast';
    expect(() => s.act({ type: 'faith/piece', charId: c.id, patron: 'mother_ember' })).toThrow(/Jealous/);
    const o = story(); const d = o.g.characters[o.chars[0].id]; d.belief = { kind: 'faithful', patron: 'the_matchmaker' }; d.patron = 'the_matchmaker';
    o.act({ type: 'faith/piece', charId: d.id, patron: 'mother_ember' });
    expect(previewPrayer(o.g, d.id, 'hymn', 'mother_ember.warm_hands').mode).toBe('dice');
    expect(() => o.act({ type: 'faith/piece', charId: d.id, patron: 'the_matchmaker' })).toThrow(/standing/);
  });
  it('conversion: the new patron\'s pieces become Devotion (+1 each on 3); Jealous wipes the rest, Open keeps it', () => {
    const s = story(); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'atheist' }; c.patron = null; c.faithPieces = { mother_ember: 2, the_quartermaster: 1 };
    s.act({ type: 'faith/pact', charId: c.id, patron: 'mother_ember' });
    let x = s.g.characters[c.id]; expect(x.patron).toBe('mother_ember'); expect(x.devotion).toBe(5); expect(x.devotionXp).toBe(102); expect(x.faithPieces).toEqual({ the_quartermaster: 1 });
    expect(said(s.g, /makes a pact with Mother Ember/)).toBe(true); expect(storyFx(s.g, FAITH_FX.patron_line).some((e) => e.event === 'conversion')).toBe(true);
    const j = story(); const d = j.g.characters[j.chars[0].id]; d.belief = { kind: 'atheist' }; d.patron = null; d.faithPieces = { the_quartermaster: 2 }; d.hymns = ['the_quartermaster.resupply'];
    j.act({ type: 'faith/pact', charId: d.id, patron: 'nerukhan' });
    x = j.g.characters[d.id]; expect(x.devotion).toBe(3); expect(x.faithPieces).toEqual({}); expect(x.hymns).toEqual([]);
    expect(() => j.act({ type: 'faith/pact', charId: d.id, patron: 'nerukhan' })).toThrow(/already sworn/);
    expect(() => j.act({ type: 'faith/pact', charId: d.id, patron: 'mother_ember' }, 'p2')).toThrow(/Only the Narrator/);
  });
  it('apostasy: Devotion XP 0, an Atheist; one piece per gate reached (at least 1); the farewell; a 90-day cooldown', () => {
    const s = story(); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 6;
    s.act({ type: 'faith/apostasy', charId: c.id });
    const x = s.g.characters[c.id]; expect(beliefOf(x).kind).toBe('atheist'); expect(x.devotion).toBe(0); expect(x.devotionXp).toBe(0); expect(x.faithPieces).toEqual({ nerukhan: 2 });
    expect(x.faithLeft).toEqual({ patron: 'nerukhan', day: 1 }); expect(said(s.g, /APOSTASY.*90 days \(until day 91\)/)).toBe(true);
    expect(storyFx(s.g, FAITH_FX.patron_line).some((e) => e.event === 'farewell' && FAITH_PATRON.nerukhan.lines.farewell.includes(e.text))).toBe(true);
    expect(diceHymns(x).sort()).toEqual(['nerukhan.judgement', 'nerukhan.saints_shield']);
    expect(() => s.act({ type: 'faith/apostasy', charId: c.id })).toThrow(/no pact/);
    const t = story(); const d = t.g.characters[t.chars[0].id]; d.belief = { kind: 'faithful', patron: 'nerukhan' }; d.patron = 'nerukhan'; d.devotion = 1;
    t.act({ type: 'faith/apostasy', charId: d.id }); expect(t.g.characters[d.id].faithPieces).toEqual({ nerukhan: 1 });
  });
  it('changing patrons is not apostasy (rules 1.6.1): no cooldown, an Open patron keeps the old Hymns as pieces', () => {
    const s = story(); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 7;
    s.act({ type: 'faith/pact', charId: c.id, patron: 'counting_weaver' });
    const x = s.g.characters[c.id]; expect(x.patron).toBe('counting_weaver'); expect(x.devotion).toBe(3); expect(x.devotionXp).toBe(45); expect(x.faithPieces).toEqual({ nerukhan: 3 });
    expect(x.faithLeft ?? null).toBeNull(); expect(said(s.g, /APOSTASY/)).toBe(false); expect(said(s.g, /LEAVING · HOLY FATHER NERUKHAN/)).toBe(true);
  });
  it('the Narrator moves Devotion XP −6 to +5 a call, with a reason; never an Atheist\'s', () => {
    const s = story(); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 3;
    expect(() => s.act({ type: 'faith/devotion', charId: c.id, delta: 6, reason: 'x' })).toThrow(/from -6 to \+5/);
    expect(() => s.act({ type: 'faith/devotion', charId: c.id, delta: -7, reason: 'x' })).toThrow(/from -6 to \+5/);
    expect(() => s.act({ type: 'faith/devotion', charId: c.id, delta: 1, reason: '' })).toThrow(/reason/);
    expect(() => s.act({ type: 'faith/devotion', charId: c.id, delta: 1, reason: 'kind' }, 'p2')).toThrow(/Only the Narrator/);
    s.act({ type: 'faith/devotion', charId: c.id, delta: -6, reason: 'broke character before the altar' }); expect(s.g.characters[c.id].devotionXp).toBe(39); expect(s.g.characters[c.id].devotion).toBe(2);
    const a = story(); const d = a.g.characters[a.chars[0].id]; d.belief = { kind: 'atheist' }; d.patron = null;
    expect(() => a.act({ type: 'faith/devotion', charId: d.id, delta: 1, reason: 'x' })).toThrow(/Atheist/);
  });
  it('the Narrator\'s turn: patrons (a pact, Devotion XP clamped to +5) and faith ops; the patron\'s mood is not applied', () => {
    const s = story(); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'atheist' }; c.patron = null;
    s.act({ type: 'narrator/turn', turn: { narration: 'A voice answers.', patrons: [{ charId: c.id, patron: 'mother_ember', devotion: 9 }], patronMood: [{ patron: 'mother_ember', tn: 18 }], faith: [{ charId: c.id, op: 'piece', patron: 'the_matchmaker' }] } } as any);
    const x = s.g.characters[c.id]; expect(x.patron).toBe('mother_ember'); expect(x.devotionXp).toBe(50); expect(x.devotion).toBe(3); expect(x.faithPieces).toEqual({ the_matchmaker: 1 });
    expect(s.g.story.patronMood?.mother_ember).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('rites', () => {
  it('an engine rite (story): +4 XP, once a session; the Narrator can\'t press it', () => {
    const s = storyWith([{ skills: { faith: 4 } }]); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan'; c.devotion = 3;
    s.act({ type: 'faith/rite', charId: c.id, id: 'confession' });
    expect(s.g.characters[c.id].devotionXp).toBe(49); expect(s.g.characters[c.id].ritesKept?.['nerukhan.confession']).toBe(sessionN(s.g));
    expect(() => s.act({ type: 'faith/rite', charId: c.id, id: 'confession' })).toThrow(/Kept this session/);
    expect(() => s.act({ type: 'faith/rite_kept', charId: c.id, rite: 'confession' })).toThrow(/rite button/);
    s.act({ type: 'faith/rite_kept', charId: c.id, rite: 'shrine_tithe' }); expect(s.g.characters[c.id].devotionXp).toBe(53);
    expect(() => s.act({ type: 'faith/rite_kept', charId: c.id, rite: 'shrine_tithe' })).toThrow(/Already kept/);
  });
  it('an after-rest rite waits for a rest; a tithe rite takes the item', () => {
    const s = storyWith([{ skills: { faith: 4 } }]); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron: 'the_quartermaster' }; c.patron = 'the_quartermaster';
    expect(() => s.act({ type: 'faith/rite', charId: c.id, id: 'inventory' })).toThrow(/After a rest/);
    (s.g as any).restN = 1; s.act({ type: 'faith/rite', charId: c.id, id: 'inventory' }); expect(s.g.characters[c.id].devotionXp).toBe(49);
    const t = storyWith([{ skills: { faith: 4 } }]); const d = t.g.characters[t.chars[0].id]; d.belief = { kind: 'faithful', patron: 'mother_ember' }; d.patron = 'mother_ember';
    const r = FAITH_PATRON.mother_ember.rites.find((x: any) => x.engine);
    d.pack = (d.pack || []).filter((x: any) => !tithable(x, r.check));
    expect(() => t.act({ type: 'faith/rite', charId: d.id, id: r.id })).toThrow(/nothing to give/);
    t.g.characters[d.id].pack = [...(t.g.characters[d.id].pack || []), { id: 'ration', item: 'ration', name: 'Ration', qty: 2, kind: r.check.category } as any];
    t.act({ type: 'faith/rite', charId: d.id, id: r.id });
    expect((t.g.characters[d.id].pack || []).find((x: any) => x.item === 'ration')!.qty).toBe(1);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('prayer in the story', () => {
  const faithful = (patron = 'mother_ember', devotion = 3) => { const s = storyWith([{ skills: { faith: 5 } }, {}]); const c = s.g.characters[s.chars[0].id]; c.belief = { kind: 'faithful', patron }; c.patron = patron; c.devotion = devotion; return { s, c: () => s.g.characters[c.id], ally: () => s.g.characters[s.chars[1].id] }; };
  it('a Whisper heals a squad member, costs story AP and the mana meter, once a round', () => {
    const { s, c, ally } = faithful(); ally().hp = 40; const mana = s.g.story.mana ?? 15;
    s.act({ type: 'faith/pray', charId: c().id, kind: 'whisper', id: 'health', targetId: ally().id });
    expect(ally().hp).toBe(40 + Math.round(5 * (1 + 0.5) * mendFactor(c().level))); expect(s.g.story.ap?.[c().id]).toBe(5); expect(s.g.story.mana).toBe(Math.max(0, mana - 5));
    expect(said(s.g, /BY STANDING · ✓ ANSWERED/)).toBe(true);
    expect(() => s.act({ type: 'faith/pray', charId: c().id, kind: 'whisper', id: 'luck' })).toThrow(/One Whisper a round/);
  });
  it('a Hymn the engine can\'t apply out of a fight goes to the Narrator as a pending ruling', () => {
    const { s, c } = faithful('old_overcast', 3);
    s.act({ type: 'faith/pray', charId: c().id, kind: 'hymn', id: 'thunderclap', text: 'Scatter them.' });
    expect((s.g.story.rulings || []).some((r) => /Thunderclap/.test(r.text) && /Scatter them/.test(r.text))).toBe(true);
    expect(storyFx(s.g, FAITH_FX.patron_line).some((e) => e.event === 'answered')).toBe(true);
  });
  it('Luck: +2 on the next check, then gone', () => {
    const { s, c } = faithful(); s.act({ type: 'faith/pray', charId: c().id, kind: 'whisper', id: 'luck' });
    expect((c().state as any).faith.luck).toBe(2);
    s.act({ type: 'narrator/turn', turn: { narration: 'Roll.', checks: [{ charId: c().id, skills: ['dexterity'], tn: 12, stakes: 'the lock' }] } } as any);
    const ck = s.g.checks.find((k) => !k.done);
    expect(ck).toBeTruthy(); s.act({ type: 'check/roll', checkId: ck!.id } as any);
    expect(s.g.checks.find((k) => k.id === ck!.id)!.mods?.some((m: any) => /Luck/.test(m.label))).toBe(true); expect((c().state as any).faith.luck).toBeUndefined();
  });
  it('the old story/pray is a Hymn through faith/pray; an Atheist has no patron to ask', () => {
    const { s, c, ally } = faithful('mother_ember', 3); ally().hp = 30;
    s.act({ type: 'story/pray', charId: c().id, text: 'Warm them.' } as any);
    expect(said(s.g, /WARM HANDS/)).toBe(true);
    const a = storyWith([{ skills: { faith: 5 } }]); const d = a.g.characters[a.chars[0].id]; d.belief = { kind: 'atheist' }; d.patron = null;
    expect(() => a.act({ type: 'story/pray', charId: d.id } as any)).toThrow(/no patron/);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('determinism and voice lines', () => {
  it('the same seed and actions give the same rolls, lines and fx', () => {
    const run = () => { const h = holy({ devotion: 3, faith: 6 }); h.pray('hymn', 'judgement', { targetId: h.foe.id }); return JSON.stringify([h.cb.log.slice(-4), fx(h.cb, FAITH_FX.patron_line), h.c.devotion]); };
    expect(run()).toBe(run());
  });
  it('patronLine picks one of the bank\'s three with the given dice; every patron has 11 banks of 3 (farewell: rules 1.6.1; grant: 1.6.3)', () => {
    for (const p of FAITH_PATRONS) { expect(Object.keys(p.lines).length).toBe(11); expect(p.lines.grant.length).toBe(3); expect(p.lines.farewell.length).toBe(3); for (const b of Object.keys(p.lines)) expect(p.lines[b].length).toBe(3); }
    const a = patronLine({ state: 42 }, FAITH_PATRON.nerukhan, 'answered'), b = patronLine({ state: 42 }, FAITH_PATRON.nerukhan, 'answered');
    expect(a).toBe(b); expect(FAITH_PATRON.nerukhan.lines.answered).toContain(a);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('compatibility', () => {
  it('Rite in the Field cuts a Hymn\'s AP (actionAp \'pray\')', () => {
    const f = fightWith([{ skills: { faith: 5 }, perks: ['rite_in_the_field'] }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan';
    f.turn(f.pc); const pv = previewPrayer(f.g, f.pc.id, 'hymn', 'saints_shield'); expect(pv.ap).toBeLessThanOrEqual(3);
  });
  it('a Hymn lands through blessing_in (Excommunicated may turn it away; Blessed Shells may load it)', () => {
    const f = fightWith([{ skills: { faith: 5 } }, { name: 'Heretic', traits: ['heretic'] }], [{ at: 'F6' }]);
    const c = f.g.characters[f.pc.charId!]; c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan';
    const al = f.pcs[1]; let slid = 0;
    for (let i = 0; i < 12; i++) { f.turn(f.pc); clearPrayerLimits(f.unit(f.pc.id)); f.act({ type: 'faith/pray', unitId: f.pc.id, kind: 'hymn', id: 'saints_shield', targetId: al.id } as any); }
    slid = f.cb.log.filter((l) => /slides off/.test(l)).length; expect(slid).toBeGreaterThan(0); expect(slid).toBeLessThan(12); expect(logHas(f.cb, /Saint's Shield/)).toBe(true);
  });
  it('Heretic\'s Stolen Fire prays any patron\'s Hymn by dice on Will Power, with its tile (Thunderclap)', () => {
    const f = fightWith([{ traits: ['heretic'], skills: { will_power: 7, faith: 0 } }], [{ at: 'F6' }]);
    const me = f.turn(f.pc), foe = f.foe; foe.pos = '6,5'; me.pos = '2,5';
    f.g.rng.state = rngFor(20, 1);
    f.act({ type: 'combat/perk', unitId: me.id, id: 'heretic', actionId: 'stolen_fire', choice: 'old_overcast:thunderclap', tile: '5,5' } as any);
    expect(logHas(f.cb, /prays to Old Overcast: Thunderclap/)).toBe(true); expect(logHas(f.cb, /vs 14/)).toBe(true);
    const c = f.g.characters[me.charId!]; expect(c.patron ?? null).toBeNull(); expect(c.skills.faith || 0).toBe(0); expect(c.belief).toBeUndefined();
  });
  it('the Proving Ground: sandbox/faith sets belief, patron, Devotion, pieces and a vow', () => {
    let g = newGame('PGF', { id: 'host', name: 'Host' });
    g = apply(g, { type: 'sandbox/start', archetype: 'sharpshooter' } as any, 'host');
    const id = Object.keys(g.characters)[0];
    g = apply(g, { type: 'sandbox/faith', charId: id, patron: 'old_overcast', devotion: 8, faith: 7 } as any, 'host');
    expect(beliefOf(g.characters[id])).toEqual({ kind: 'faithful', patron: 'old_overcast' }); expect(g.characters[id].devotion).toBe(8); expect(g.characters[id].skills.faith).toBe(7);
    g = apply(g, { type: 'sandbox/faith', charId: id, belief: 'atheist', pieces: { mother_ember: 2, nope: 1 } } as any, 'host');
    expect(beliefOf(g.characters[id]).kind).toBe('atheist'); expect(g.characters[id].faithPieces).toEqual({ mother_ember: 2 });
    expect(() => apply(g, { type: 'sandbox/faith', charId: id, patron: 'zeus' } as any, 'host')).toThrow(/No such patron/);
  });
});
