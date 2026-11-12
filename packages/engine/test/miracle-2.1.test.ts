// Miracle 2.1 (rules 1.6.2, spec section 14 items 724-736; Leon's ruling of 9 Nov 2026: "Buff all miracles to deserve
// the title, miracle only at 10 and it reduces your devotion by 5"): the gate at Devotion 10, the price of 5 levels after
// the effect, and each of the eight stronger Miracles as the engine runs it, in a fight and (what applies) in the story.
// Every prayer goes through apply() (the reducer), the path a player's click takes.
import { describe, expect, it } from 'vitest';
import {
  apply, previewPrayer, previewAttack, encoreCredit, d20, condOn, setDevotionXp, devotionThreshold, miracleCost, encoreKey, FAITH_FX, FAITH_PATRON, GATE,
  MIRACLE_COST_LEVELS, MIRACLE_FAITH, AP_MAX, PERK_AP_CAP,
  type Combat, type GameState, type Unit, type Character, type Action,
} from '../src';
import { emit } from '../src/effects/hooks';
import { mendFactor } from '../src/effects/mending'; // rules 1.20: prayer heals and shields grow with level
import { fightWith, storyWith, withGame } from './helpers/perkfight';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const logHas = (cb: Combat, re: RegExp) => cb.log.some((l) => re.test(l));
const fx = (cb: Combat, k: string) => (cb.fx || []).filter((e: any) => e.k === k) as any[];

type Opt = { patron: string; devotion?: number; faith?: number; allies?: number; foes?: { tier?: string }[] };
/** A fight: the Priest (Faith 7, Devotion 10) and allies against foes, on the Priest's turn, every unit at full HP with
 * no conditions; Priest 2,5, allies 2,6 / 2,4 / 1,5, foes 5,5 / 6,5 / 7,5. */
function miracle(o: Opt) {
  const specs = [{ name: 'Priest', skills: { faith: o.faith ?? 7 } }, ...Array.from({ length: o.allies ?? 1 }, (_, i) => ({ name: 'Ally ' + (i + 1) }))];
  const f = fightWith(specs, (o.foes || [{}, {}]).map((x, i) => ({ tier: x.tier || 'soldier', at: ['F6', 'G6', 'H6'][i] })));
  const c = f.g.characters[f.pc.charId!];
  c.belief = { kind: 'faithful', patron: o.patron }; c.patron = o.patron; setDevotionXp(c, devotionThreshold(o.devotion ?? 10));
  const pcs = f.pcs, foes = f.foes;
  ['2,5', '2,6', '2,4', '1,5'].forEach((p, i) => { if (pcs[i]) pcs[i].pos = p; });
  ['5,5', '6,5', '7,5'].forEach((p, i) => { if (foes[i]) foes[i].pos = p; });
  for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; u.shield = 0; }
  f.turn(pcs[0]);
  const ids = { me: pcs[0].id, allies: pcs.slice(1).map((u) => u.id), foes: foes.map((u) => u.id) };
  return {
    f, get g() { return f.g; }, get cb() { return f.cb; }, get c(): Character { return f.g.characters[c.id]; },
    get me(): Unit { return f.unit(ids.me); }, ally: (i = 0): Unit => f.unit(ids.allies[i]), foe: (i = 0): Unit => f.unit(ids.foes[i]),
    pray: (id: string, x: Record<string, any> = {}) => f.act({ type: 'faith/pray', unitId: ids.me, kind: 'miracle', id, ...x } as Action, 'host'),
    act: (a: any) => f.act(a as Action, 'host'),
    bound: <T>(fn: () => T) => withGame(f.g, fn),
  };
}
const big = (u: Unit, hp = 2000) => { u.maxHp = hp; u.hp = hp; };

// ---------------------------------------------------------------------------------------------------------------------
describe('the gate and the price (items 724-725)', () => {
  it('the data: a Miracle needs Devotion 10 (the gate and prayer.miracle agree) and costs 5 levels; Faith 7 stays', () => {
    expect(GATE.miracle).toBe(10); expect(GATE[3]).toBe(7); expect(MIRACLE_COST_LEVELS).toBe(5); expect(MIRACLE_FAITH).toBe(7);
  });
  it('Devotion 9 is refused (with the number); 10 is by standing, no roll; Faith 6 and Atheists never', () => {
    const lo = miracle({ patron: 'mother_ember', devotion: 9 });
    expect(previewPrayer(lo.g, lo.me.id, 'miracle', 'everyone_home').why).toBe('A Miracle needs Devotion 10 (you have 9).');
    expect(() => lo.pray('everyone_home')).toThrow(/Devotion 10/);
    const ok = miracle({ patron: 'mother_ember' }); const pv = previewPrayer(ok.g, ok.me.id, 'miracle', 'everyone_home');
    expect(pv.ok).toBe(true); expect(pv.gate).toBe(10); expect(pv.roll).toBeUndefined(); expect(pv.mode).toBe('standing');
    const weak = miracle({ patron: 'mother_ember', faith: 6 }); expect(previewPrayer(weak.g, weak.me.id, 'miracle', 'everyone_home').why).toMatch(/Faith 7/);
    // Devotion 7 still opens Hymn III by standing (the gate that used to open the Miracle too).
    const h3 = miracle({ patron: 'mother_ember', devotion: 7 }); expect(previewPrayer(h3.g, h3.me.id, 'hymn', 'mother_ember.feed_the_fire').mode).toBe('standing');
  });
  it('the price: 10 → 5 (450 → 102 XP) after the effect; its own liked tags give nothing back', () => {
    const h = miracle({ patron: 'old_overcast', foes: [{ tier: 'boss' }, { tier: 'boss' }] }); big(h.foe(0)); big(h.foe(1));
    h.pray('the_sky_answers', { tile: '6,5' });
    expect(h.c.devotionXp).toBe(102); expect(h.c.devotion).toBe(5);
    const dv = fx(h.cb, FAITH_FX.devotion); expect(dv[dv.length - 1]).toMatchObject({ delta: -348, xp: 102, now: 5, was: 10, level: 5 });
    expect(logHas(h.cb, /−348 Devotion XP \(the Miracle: Devotion −5 levels\): DEVOTION 5/)).toBe(true);
  });
  it('miracleCost drops whole levels from the level held (the XP into it goes too), never below 0', () => {
    const s = storyWith([{ name: 'Saint', skills: { faith: 7 } }]); const c = s.g.characters[s.chars[0].id];
    c.belief = { kind: 'faithful', patron: 'nerukhan' }; c.patron = 'nerukhan';
    setDevotionXp(c, 300); withGame(s.g, () => miracleCost(s.g, null, c)); expect(c.devotion).toBe(3); expect(c.devotionXp).toBe(devotionThreshold(3)); // level 8 (300) → 3
    setDevotionXp(c, 30); withGame(s.g, () => miracleCost(s.g, null, c)); expect(c.devotion).toBe(0); expect(c.devotionXp).toBe(0);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('the eight Miracles in a fight (items 727-734)', () => {
  it('Nerukhan, The Saints\' Verdict: every enemy in sight takes 130 Soul (rules 1.21, item 1264; it was 100) and is Stunned 1; the cruel take 260 and 2 rounds; the Hidden are spared', () => {
    const h = miracle({ patron: 'nerukhan', foes: [{}, {}, {}] }); for (let i = 0; i < 3; i++) big(h.foe(i));
    h.foe(1).faith = { harmedHelpless: true }; h.foe(2).hidden = true;
    const pw = h.me.blessPower!; h.pray('saints_verdict');
    expect(h.foe(0).hp).toBe(2000 - Math.round(130 * pw)); expect(h.foe(0).conds!.stunned).toBe(1);
    expect(h.foe(1).hp).toBe(2000 - Math.round(260 * pw)); expect(h.foe(1).conds!.stunned).toBe(2);
    expect(h.foe(2).hp).toBe(2000); expect(condOn(h.foe(2), 'stunned')).toBe(false);
    expect(logHas(h.cb, /×2: it harmed the helpless/)).toBe(true);
  });
  it('the Quartermaster, Requisition Approved: magazines, loose rounds, throwables and Supplies back, 2 cores, gear repaired, no jam or heat', () => {
    const h = miracle({ patron: 'the_quartermaster' }), a = h.ally();
    (a.faith ||= {}).stock = { weapon: a.weapon, mags: 3, loose: 12, throwables: { frag_grenade: 2 } };
    a.ammo = 0; a.mags = [0, 4]; a.loose = 0; a.throwables = { frag_grenade: 0 }; a.res = { supplies: 0 }; a.resMax = { supplies: 4 };
    a.maxDur = 100; a.dur = 7; a.jammed = true; a.heat = 5;
    const cores0 = a.mg ? a.mg.cores : 0;
    h.pray('requisition_approved');
    const b = h.ally(), size = 15; void size;
    expect(b.ammo).toBeGreaterThan(0); expect(b.mags!.length).toBe(3); expect(new Set(b.mags).size).toBe(1); expect(b.mags![0]).toBe(b.ammo);
    expect(b.loose).toBe(12); expect(b.throwables!.frag_grenade).toBe(2); expect(b.res!.supplies).toBe(4);
    expect(b.dur).toBe(100); expect(b.jammed).toBe(false); expect(b.heat).toBe(0);
    const ch = h.g.characters[b.charId!];
    expect(b.mg ? b.mg.cores - cores0 : (ch.pack || []).filter((x: any) => x.item === 'standard_core').reduce((t: number, x: any) => t + x.qty, 0)).toBe(2);
    expect(b.apNext).toBe(3); expect(h.me.apNext).toBe(3);
  });
  it('Requisition Approved\'s +3 AP is banked AP: next turn 6 + 3 = 9 (the ceiling); it fills the +3 a turn, so more AP that turn is lost', () => {
    const h = miracle({ patron: 'the_quartermaster' });
    h.pray('requisition_approved');
    let a = h.f.turn(h.ally()); expect(a.ap).toBe(AP_MAX); expect(a.apGained).toBe(PERK_AP_CAP);
    // Another +2 banked for the same turn (any perk AP) is lost to the +3 cap, and the log says so.
    const h2 = miracle({ patron: 'the_quartermaster' }); h2.pray('requisition_approved'); h2.ally().apNext = (h2.ally().apNext || 0) + 2;
    a = h2.f.turn(h2.ally()); expect(a.ap).toBe(AP_MAX); expect(logHas(h2.cb, /2 lost to the \+3 cap/)).toBe(true);
    // Stunned or Dazed still come off after it (the ceiling is a ceiling, not a floor).
    const h3 = miracle({ patron: 'the_quartermaster' }); h3.pray('requisition_approved'); h3.ally().dazedNext = 1;
    a = h3.f.turn(h3.ally()); expect(a.ap).toBe(AP_MAX - 2);
  });
  it('the Laughing Mask, Encore: an ally who already acted this round repeats that action free on its next turn; enemies in sight are Confused', () => {
    const h = miracle({ patron: 'the_laughing_mask' });
    let a = h.f.turn(h.ally()); const ap0 = a.ap;
    h.act({ type: 'combat/move', unitId: a.id, to: '3,6' }); a = h.ally(); const cost = ap0 - a.ap; expect(cost).toBeGreaterThan(0);
    expect(a.faith!.lastKey).toBe('combat/move:move');
    h.f.turn(h.me); h.pray('encore');
    expect(h.ally().faith!.encore).toMatchObject({ key: 'combat/move:move', ap: cost, started: false });
    expect(condOn(h.foe(0), 'confused') && condOn(h.foe(1), 'confused')).toBe(true);
    // Its next turn: the same kind of action (a move; a new tile is fine) costs nothing, once.
    a = h.f.turn(h.ally()); expect(a.faith!.encore.started).toBe(true); const ap1 = a.ap;
    h.act({ type: 'combat/move', unitId: a.id, to: '3,7' }); a = h.ally();
    expect(a.ap).toBe(ap1); expect(a.faith!.encore).toBeUndefined(); expect(logHas(h.cb, /Encore: Ally 1 repeats Move \(move\), free/)).toBe(true);
  });
  it('Encore for the one who prays: this turn, even with no AP left; unused, it ends with the turn; a different action isn\'t free', () => {
    const h = miracle({ patron: 'the_laughing_mask' });
    h.act({ type: 'combat/move', unitId: h.me.id, to: '2,3' }); h.pray('encore');
    expect(h.me.faith!.encore).toMatchObject({ key: 'combat/move:move', started: true });
    h.me.ap = 0; h.act({ type: 'combat/move', unitId: h.me.id, to: '2,2' }); expect(h.me.pos).toBe('2,2'); expect(h.me.ap).toBe(0);
    const k = miracle({ patron: 'the_laughing_mask' });
    k.act({ type: 'combat/move', unitId: k.me.id, to: '2,3' }); k.pray('encore');
    const apK = k.me.ap; k.act({ type: 'combat/prone', unitId: k.me.id }); expect(k.me.faith!.encore).toBeDefined(); expect(k.me.ap).toBeLessThanOrEqual(apK); // going prone isn't the move
    k.bound(() => emit(k.cb, 'turn_end', { u: k.me, cb: k.cb } as any)); expect(k.me.faith!.encore).toBeUndefined();
    expect(encoreKey({ type: 'combat/pray', kind: 'hymn' })).toBeNull(); expect(encoreKey({ type: 'combat/attack', targetId: 'x' })).toBe('combat/attack:shot');
  });
  it('the Toll-Keeper, Turned Back at the Shore: every ally who died or fell this fight stands at half HP', () => {
    const h = miracle({ patron: 'toll_keeper', allies: 2 });
    Object.assign(h.ally(0), { hp: 0, dead: true, downed: false }); h.g.characters[h.ally(0).charId!].dead = true;
    Object.assign(h.ally(1), { hp: 0, downed: true, saves: { ok: 0, fail: 2 } });
    h.pray('turned_back');
    for (const i of [0, 1]) { const a = h.ally(i); expect(a.dead).toBe(false); expect(a.downed).toBe(false); expect(a.hp).toBe(Math.ceil(a.maxHp / 2)); expect(a.saves).toEqual({ ok: 0, fail: 0 }); }
    expect(h.g.characters[h.ally(0).charId!].dead).toBe(false); expect(logHas(h.cb, /\(crossed\) is turned back at the shore/)).toBe(true);
  });
  it('Mother Ember, Everyone Home: full HP, the Downed stand, harmful conditions end (boons stay), a 17 shield each (rules 1.20)', () => {
    const h = miracle({ patron: 'mother_ember', allies: 2 }), pw = h.me.blessPower!;
    Object.assign(h.ally(0), { hp: 0, downed: true }); h.ally(1).hp = 9; h.ally(1).conds = { shaken: 2, weakened: 1, inspired: 1 } as any; h.ally(1).prone = true; h.ally(1).bleed = 2; h.me.hp = 30;
    h.pray('everyone_home');
    for (const u of [h.me, h.ally(0), h.ally(1)]) { expect(u.hp).toBe(u.maxHp); expect(u.downed).toBe(false); expect(u.shield).toBe(Math.floor(17 * pw * mendFactor(h.me.level))); }
    const b = h.ally(1); expect(condOn(b, 'shaken') || condOn(b, 'weakened') || !!b.prone || (b.bleed || 0) > 0).toBe(false); expect(condOn(b, 'inspired')).toBe(true);
  });
  it('Old Overcast, The Sky Answers: a 5×5 in sight, enemies only: 150 Storm, Stunned 1 and Shaken; outside the 5×5 nothing', () => {
    const h = miracle({ patron: 'old_overcast', foes: [{}, {}, {}] }); for (let i = 0; i < 3; i++) big(h.foe(i));
    h.foe(0).pos = '4,4'; h.foe(1).pos = '6,6'; h.foe(2).pos = '8,5'; h.ally().pos = '3,5'; // the tile 5,5: foes 0 and 1 inside (1-2 across), foe 2 three across; the ally inside
    const pw = h.me.blessPower!, allyHp = h.ally().hp;
    h.pray('the_sky_answers', { tile: '5,5' });
    for (const i of [0, 1]) { const v = h.foe(i); expect(v.hp).toBeLessThan(2000); expect(v.conds!.stunned).toBe(1); expect(condOn(v, 'shaken')).toBe(true); }
    expect(2000 - h.foe(0).hp).toBeGreaterThanOrEqual(Math.round(150 * pw) - 20); // Storm: elemental, after any resistance
    expect(h.foe(2).hp).toBe(2000); expect(h.ally().hp).toBe(allyHp); expect(condOn(h.ally(), 'stunned')).toBe(false);
    expect(fx(h.cb, FAITH_FX.miracle)[0].area.length).toBe(25);
  });
  it('the Matchmaker, Love Conquers: non-boss enemies surrender with no save; a boss saves or is Commanded to hold (no attacks)', () => {
    const h = miracle({ patron: 'the_matchmaker', foes: [{}, { tier: 'boss' }, {}] }); h.foe(2).tags = [...(h.foe(2).tags || []), 'no_surrender'];
    h.foe(0).surrenderTried = true; // a refused parley doesn't matter to a Miracle
    h.g.rng.state = rngFor(1, 1); h.pray('love_conquers');
    expect(h.foe(0).surrendered).toBe(true);
    for (const i of [1, 2]) { const v = h.foe(i); expect(v.surrendered).toBeFalsy(); expect(condOn(v, 'commanded')).toBe(true); expect(v.condArg!.commanded).toBe('hold'); }
    expect(logHas(h.cb, /lowers its weapon: Commanded to hold/)).toBe(true);
    const s = miracle({ patron: 'the_matchmaker', foes: [{ tier: 'boss' }] }); s.g.rng.state = rngFor(20); s.pray('love_conquers');
    expect(condOn(s.foe(0), 'commanded')).toBe(false); expect(logHas(s.cb, /resists \(heart save/)).toBe(true);
  });
  it('the Counting Weaver, Rewoven: HP back to the round\'s start where that was higher (the Downed stand), then a full turn each', () => {
    const h = miracle({ patron: 'counting_weaver', allies: 2 }), x: any = h.cb;
    x.faithRoundHp = { [h.me.id]: 50, [h.ally(0).id]: 80, [h.ally(1).id]: 40 };
    h.me.hp = 70; Object.assign(h.ally(0), { hp: 0, downed: true }); h.ally(1).hp = 12;
    const n0 = h.cb.order.length; h.pray('rewoven');
    expect(h.me.hp).toBe(70); expect(h.ally(0).hp).toBe(80); expect(h.ally(0).downed).toBe(false); expect(h.ally(1).hp).toBe(40);
    expect(h.cb.order.length).toBe(n0 + 3); expect(h.cb.order.slice(h.cb.turn + 1, h.cb.turn + 4).sort()).toEqual([h.me.id, h.ally(0).id, h.ally(1).id].sort());
  });
  it('the round\'s HP is kept at the fight\'s start and at every round\'s start', () => {
    const h = miracle({ patron: 'counting_weaver' }), x: any = h.cb;
    expect(x.faithRoundHp?.[h.me.id]).toBeTypeOf('number');
    h.ally().hp = 33; h.bound(() => emit(h.cb, 'round_start', { cb: h.cb, round: 2 } as any)); expect(x.faithRoundHp[h.ally().id]).toBe(33);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
// The review fixes (item 737), driven through the reducer's own turn flow (combat/end-turn), not f.turn().
describe('the review fixes, through real turns (item 737)', () => {
  /** Initiative set to `first` (in that order), then the foes; the first one's turn. */
  const orderFirst = (h: ReturnType<typeof miracle>, first: string[]) => {
    h.cb.order = [...first, ...h.cb.order.filter((id) => !first.includes(id))]; h.cb.round = 1; return h.f.turn(first[0]);
  };
  const turnsUntilNextRound = (h: ReturnType<typeof miracle>) => {
    const seen: string[] = [], r0 = h.cb.round;
    for (let i = 0; i < 30 && h.cb.round === r0 && !h.cb.over; i++) { const u = h.f.unit(h.cb.order[h.cb.turn]); if (u.side !== 'pc') break; seen.push(u.id); h.f.act({ type: 'combat/end-turn', unitId: u.id } as Action, h.g.characters[u.charId!].owner); }
    return seen;
  };
  it('Encore: an ally acts, ends its turn (combat/end-turn), and the priest\'s Encore still reaches it', () => {
    const h = miracle({ patron: 'the_laughing_mask' }); for (let i = 0; i < 2; i++) big(h.foe(i), 5000);
    orderFirst(h, [h.ally().id, h.me.id]);
    h.act({ type: 'combat/attack', unitId: h.ally().id, targetId: h.foe(0).id, mode: 'shot' });
    const spent = h.ally().faith!.lastSpent; expect(spent).toBeGreaterThan(0);
    h.act({ type: 'combat/end-turn', unitId: h.ally().id });
    expect(h.cb.order[h.cb.turn]).toBe(h.me.id); expect(h.cb.round).toBe(1);
    expect(h.ally().faith).toMatchObject({ lastKey: 'combat/attack:shot', lastSpent: spent, lastRound: 1 });
    h.pray('encore');
    expect(h.ally().faith!.encore).toMatchObject({ key: 'combat/attack:shot', ap: spent, started: false });
    expect(logHas(h.cb, /nobody has acted/)).toBe(false);
  });
  it('Rewoven: every ally gets exactly one more turn this round, and the order is back at round 2; the HP is kept at the real round\'s start', () => {
    const h = miracle({ patron: 'counting_weaver', allies: 2 }); const pcs = [h.me.id, h.ally(0).id, h.ally(1).id];
    orderFirst(h, pcs); const base = [...h.cb.order];
    h.pray('rewoven');
    const seen = turnsUntilNextRound(h); // the Priest's own turn (now), then the rest of round 1
    for (const id of pcs) expect(seen.filter((x) => x === id).length).toBe(2);
    expect(h.cb.round).toBe(2); expect(h.cb.order).toEqual(base);
    const snap = (h.cb as any).faithRoundHp; for (const id of pcs) expect(snap[id]).toBe(h.f.unit(id).hp);
  });
  it('two Rewovens in one round give each ally one more turn each (two), not a doubling', () => {
    const h = miracle({ patron: 'counting_weaver', allies: 1 }), p2 = h.ally();
    const c2 = h.g.characters[p2.charId!]; c2.belief = { kind: 'faithful', patron: 'counting_weaver' }; c2.patron = 'counting_weaver'; setDevotionXp(c2, devotionThreshold(10));
    (c2.skills as any).faith = 7; p2.sk = { ...(p2.sk || {}), faith: 6 };
    const pcs = [h.me.id, p2.id]; orderFirst(h, pcs); const base = [...h.cb.order];
    h.pray('rewoven');
    const seen: string[] = [];
    while (h.cb.order[h.cb.turn] !== p2.id) { seen.push(h.cb.order[h.cb.turn]); h.act({ type: 'combat/end-turn', unitId: h.cb.order[h.cb.turn] }); }
    seen.push(p2.id); h.act({ type: 'faith/pray', unitId: p2.id, kind: 'miracle', id: 'rewoven' });
    h.act({ type: 'combat/end-turn', unitId: p2.id });
    seen.push(...turnsUntilNextRound(h));
    for (const id of pcs) expect(seen.filter((x) => x === id).length).toBe(3); // its own turn and one from each Rewoven
    expect(h.cb.order).toEqual(base);
  });
  it('Encore in the previews: the one who prays, short of AP after the Miracle, is shown its repeat as possible (attack, move), never lent twice', () => {
    const h = miracle({ patron: 'the_laughing_mask' }); for (let i = 0; i < 2; i++) big(h.foe(i), 5000);
    const ap0 = h.me.ap; h.act({ type: 'combat/attack', unitId: h.me.id, targetId: h.foe(0).id, mode: 'shot' }); const shot = ap0 - h.me.ap;
    h.pray('encore'); const left = h.me.ap; expect(left).toBeLessThan(shot);
    expect(h.bound(() => encoreCredit(h.me, { type: 'combat/attack', mode: 'shot' }))).toBe(shot);
    expect(h.bound(() => encoreCredit(h.me, { type: 'combat/attack', mode: 'aimed' }))).toBe(0);
    expect(h.bound(() => encoreCredit(h.me, { type: 'combat/attack', mode: 'shot' }, { ...h.cb, acting: true } as any))).toBe(0); // inside the reducer: already lent
    const pv = h.bound(() => previewAttack(h.cb, h.me, h.foe(1), 'shot')); expect(pv.ok).toBe(true);
    expect(h.bound(() => previewAttack(h.cb, h.me, h.foe(1), 'aimed')).ok).toBe(false); // a different action isn't lent
    h.act({ type: 'combat/attack', unitId: h.me.id, targetId: h.foe(1).id, mode: 'shot' });
    expect(h.me.ap).toBe(left); expect(h.me.faith!.encore).toBeUndefined();
    expect(h.bound(() => previewAttack(h.cb, h.me, h.foe(1), 'shot')).ok).toBe(left >= shot); // used: no more lend
  });
  it('a Miracle that would find nobody is refused and costs nothing: Turned Back, The Saints\' Verdict, Love Conquers, Encore', () => {
    const t = miracle({ patron: 'toll_keeper' });
    expect(previewPrayer(t.g, t.me.id, 'miracle', 'turned_back').why).toBe('Nobody has fallen this fight.');
    expect(() => t.pray('turned_back')).toThrow(/Nobody has fallen/); expect(t.c.devotionXp).toBe(devotionThreshold(10)); expect(t.c.miracleSession).toBeUndefined();
    for (const [patron, id] of [['nerukhan', 'saints_verdict'], ['the_matchmaker', 'love_conquers']]) {
      const h = miracle({ patron }); h.foe(0).hidden = true; h.foe(1).hidden = true;
      expect(previewPrayer(h.g, h.me.id, 'miracle', id).why).toBe('No enemy in sight.');
    }
    const e = miracle({ patron: 'the_laughing_mask' }); e.foe(0).hidden = true; e.foe(1).hidden = true;
    expect(previewPrayer(e.g, e.me.id, 'miracle', 'encore').why).toMatch(/Nobody has acted this round/);
    e.act({ type: 'combat/move', unitId: e.me.id, to: '2,3' }); expect(previewPrayer(e.g, e.me.id, 'miracle', 'encore').ok).toBe(true);
  });
  it('Turned Back leaves a destroyed companion for the story (and with only that, it is refused)', () => {
    const h = miracle({ patron: 'toll_keeper' });
    h.cb.units.push({ ...h.foe(0), id: 'cp-x', side: h.me.side, companion: 'drone', kind: 'drone', name: 'Drone', dead: true, hp: 0, downed: false, conds: {} } as any);
    expect(previewPrayer(h.g, h.me.id, 'miracle', 'turned_back').ok).toBe(false);
    Object.assign(h.ally(), { hp: 0, downed: true }); h.pray('turned_back');
    expect(h.ally().downed).toBe(false); const d = h.cb.units.find((v) => v.id === 'cp-x')!; expect(d.dead).toBe(true); expect(d.hp).toBe(0);
  });
  it('the log reads the Miracle first, then its price', () => {
    const h = miracle({ patron: 'mother_ember' }); h.pray('everyone_home');
    const m = h.cb.log.findIndex((l) => /calls for a MIRACLE/.test(l)), p = h.cb.log.findIndex((l) => /the Miracle: Devotion −5 levels/.test(l));
    expect(m).toBeGreaterThanOrEqual(0); expect(p).toBeGreaterThan(m);
  });
  it('the Miracle\'s own liked tags (at 450 XP) use none of the fight\'s or session\'s tag caps', () => {
    const h = miracle({ patron: 'old_overcast', foes: [{}, {}] }); // soldiers: the 150 Storm kills both (kill, storm)
    h.pray('the_sky_answers', { tile: '6,5' });
    expect(h.foe(0).dead && h.foe(1).dead).toBe(true);
    const t = h.c.faithTally!; expect(t.sessionXp).toBe(0); expect(t.fight?.xp ?? 0).toBe(0); expect(h.c.devotionXp).toBe(102);
  });
});

// ---------------------------------------------------------------------------------------------------------------------
describe('Miracles in the story (item 735)', () => {
  function story(patron: string) {
    const s = storyWith([{ name: 'Saint', skills: { faith: 7 } }, { name: 'Friend' }]); const id = s.chars[0].id;
    const c = s.g.characters[id]; c.belief = { kind: 'faithful', patron }; c.patron = patron; setDevotionXp(c, devotionThreshold(10));
    return { s, c: () => s.g.characters[id], friend: () => s.g.characters[s.chars[1].id], pray: (mid: string) => s.act({ type: 'faith/pray', charId: id, kind: 'miracle', id: mid } as Action, 'host') };
  }
  it('Everyone Home: the squad heals to full and its story conditions end; the price after it', () => {
    const t = story('mother_ember'); t.friend().hp = 5; t.friend().persistentConds = [{ id: 'shaken', scope: 'scene' }];
    t.pray('everyone_home');
    expect(t.friend().hp).toBeGreaterThan(5); expect(t.friend().persistentConds || []).toEqual([]); expect(t.c().devotion).toBe(5);
  });
  it('Requisition Approved: magazines full, 2 cores, gear repaired; the throwables and the AP go to the Narrator', () => {
    const t = story('the_quartermaster'); const f = t.friend(); f.loaded = 0;
    const cores = (x: Character) => (x.pack || []).filter((i: any) => (i.item || i.id) === 'standard_core').reduce((n: number, i: any) => n + i.qty, 0);
    const c0 = cores(f); t.pray('requisition_approved');
    expect(t.friend().loaded).toBeGreaterThan(0); expect(cores(t.friend())).toBe(c0 + 2);
    expect((t.s.g.story.rulings || []).some((r: any) => /Requisition Approved/.test(r.text) && /The engine applied/.test(r.text))).toBe(true);
  });
  it('a Miracle with nothing to apply out of a fight (The Saints\' Verdict) is the Narrator\'s, and still costs its 5 levels', () => {
    const t = story('nerukhan'); t.pray('saints_verdict');
    expect((t.s.g.story.rulings || []).some((r: any) => /The Saints' Verdict/.test(r.text))).toBe(true); expect(t.c().devotionXp).toBe(102);
  });
  it('every launch patron\'s Miracle text says what the engine runs (no "Devotion 7", no "spends")', () => {
    for (const p of Object.values(FAITH_PATRON) as any[]) { expect(p.miracle.text).not.toMatch(/Devotion 7|spends/); expect(p.miracle.adjudication).toBe('engine'); }
  });
});
void apply; void ({} as GameState);
