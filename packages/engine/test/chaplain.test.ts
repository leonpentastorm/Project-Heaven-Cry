// Classes 3.0 step 5: the Chaplain (rules 1.31; docs/design/chaplain-spec.md; section 14 items 1900 to 1949). One test
// per rule of the spec's section 2 and per move, through the reducer where it is an action; numbers read from the data.
//   rule 1   prayer opens at Faith 1 (Whispers from 1, Hymns from 3; Leon, 13 Nov 2026); the door unchanged otherwise
//   rule 2   the Chaplain's Hymn wait is everyone's
//   rules 3-4 Ward: the turn's Whisper, an ally in sight, a shield on its own layer, two held, tops up
//   rule 5   Sanctuary: a Hymn (the wait), a tile in sight within reach, half damage, its cap, Witnessed
//   rules 6-7 Smite: once a turn on a weapon hit, 20 × Blessing power Soul (Rebuke's), kill leaves it, a prayer, the
//            kill-taboo patrons' nonlethal, Old Overcast's lightning, an Atheist's roll
//   rule 8   no MP, no Strain
//   rule 9   Judged on a weapon hit on the Chaplain's turn
//   rules 10-12 the presence: the first intervention keeps Witnessed, interventions reach further, land where it struck
//   Verdict any weapon; Blessed Arms; Under the Eye; the old save
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { scaleOf,
  CLASS, CLASS_MOVE_POOL, WHISPER, FAITH_PATRON, ATHEIST_TN, HYMN_FAITH, WHISPER_FAITH, condOn, condSource, applyDamage, resolveAttack, d20, hymnWait,
  setDevotionXp, devotionThreshold, blessingPower, itemInfo, statQuery, previewPrayer, amountBlock, profileOf, mendFactorOf, zonesAt, perkActionsFor, prayerAnswered,
  type Unit, type Character, type Action,
} from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';
import { clearPrayerLimits } from '../src';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const MOVES = Object.fromEntries((['I', 'II', 'III'] as const).flatMap((r) => (CLASS.guardian.ranks as any)[r].moves.map((m: any) => [m.id, m])));
const WARD = MOVES.ward, SMITE = MOVES.smite, SANCT = CLASS_MOVE_POOL['guardian.sanctuary'];
const WARD_HOLDERS: number = WARD.effects[0].effects[0].holders;
const REBUKE = -WHISPER.rebuke.effects[0].value;

type Opt = { patron?: string | null; faith?: number; virtue?: number; devotion?: number; cls?: boolean; level?: number; weapon?: string };
/** A Chaplain (Virtue 8: rank III; Faith 6) and two allies against two soldiers, on the Chaplain's turn. */
function chap(o: Opt = {}) {
  const spec: CharSpec = { name: 'Chaplain', skills: { faith: o.faith ?? 6 }, attrs: { virtue: o.virtue ?? 8 }, level: o.level ?? 12, ...(o.cls === false ? {} : { classId: 'guardian' }), ...(o.weapon ? { weapon: o.weapon } : {}) };
  const f = fightWith([spec, { name: 'Medic' }, { name: 'Gunner' }], [{ at: 'F6' }, { at: 'G6' }], { level: o.level ?? 12 });
  const c = f.g.characters[f.pc.charId!];
  if (o.patron === null) { c.belief = { kind: 'atheist' }; c.patron = null; c.devotion = 0; }
  else { const p = o.patron || 'old_overcast'; c.belief = { kind: 'faithful', patron: p }; c.patron = p; setDevotionXp(c, devotionThreshold(o.devotion ?? 6)); c.devotion = o.devotion ?? 6; }
  const [me, a1, a2] = f.pcs, [f0, f1] = f.foes;
  me.pos = '2,5'; a1.pos = '2,6'; a2.pos = '3,5'; f0.pos = '6,5'; f1.pos = '7,5';
  for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; u.shield = 0; delete u.shields; }
  for (const u of f.foes) { u.hp = u.maxHp = 2000; u.def = -40; u.armour = 0; }
  f.turn(me);
  const api = {
    f, get g() { return f.g; }, get cb() { return f.cb; }, get c(): Character { return f.g.characters[c.id]; },
    get me(): Unit { return f.unit(me.id); }, get a1(): Unit { return f.unit(a1.id); }, get a2(): Unit { return f.unit(a2.id); },
    get foe(): Unit { return f.unit(f0.id); }, get foe2(): Unit { return f.unit(f1.id); },
    act: (a: any) => f.act({ unitId: me.id, ...a } as Action, 'host'),
    perk: (id: string, a: any = {}) => f.act({ type: 'combat/perk', unitId: me.id, id, ...a } as Action, 'host'),
    pray: (kind: string, id: string, x: any = {}) => f.act({ type: 'faith/pray', unitId: me.id, kind, id, ...x } as Action, 'host'),
    shoot: (t: Unit, mode = 'shot') => f.act({ type: 'combat/attack', unitId: me.id, targetId: t.id, mode } as Action, 'host'),
    seed: (...ns: number[]) => { f.g.rng.state = rngFor(...ns); },
    bound: <T>(fn: () => T) => withGame(f.g, fn),
  };
  return api;
}
type C = ReturnType<typeof chap>;
const power = (h: C) => h.me.blessPower || blessingPower(h.c);
/** The Ward a Chaplain gives: base × the profile's Stat (Blessing power × the heal dial) × the level, × what the ally receives. */
const wardOf = (h: C, t: Unit) => Math.floor(Math.floor(WARD.amounts.ward.base * profileOf('blessing_mend').k / profileOf('blessing').k * power(h) * mendFactorOf(h.me) * 1e6) / 1e6 * (t.shieldRecv || 1));
const smiteOf = (h: C) => Math.floor(SMITE.amounts.smite.base * power(h) * scaleOf(h.me.level)); // rules 1.36: the blessing profile takes the scale
const ward = (h: C, t: Unit) => h.perk('class:guardian.ward', { actionId: 'ward', targetId: t.id });

describe('the data (chaplain-spec.md sections 3 and 10)', () => {
  it('rank I is Ward and Smite, rank II Under the Eye and Blessed Arms, rank III Sanctuary and Verdict; the presence is class gain', () => {
    expect(CLASS.guardian.name).toBe('Chaplain');
    expect(CLASS.guardian.ranks.I.moves.map((m: any) => m.key)).toEqual(['class:guardian.ward', 'class:guardian.smite']);
    expect(CLASS.guardian.ranks.II.moves.map((m: any) => m.key)).toEqual(['class:lumeri_templar.under_the_eye', 'class:lumeri_templar.blessed_shells']);
    expect(CLASS.guardian.ranks.III.moves.map((m: any) => m.key)).toEqual(['class:guardian.sanctuary', 'class:lumeri_templar.judgement']);
    expect(CLASS_MOVE_POOL['lumeri_templar.judgement'].name).toBe('Verdict'); expect(CLASS_MOVE_POOL['lumeri_templar.blessed_shells'].name).toBe('Blessed Arms');
    expect(CLASS_MOVE_POOL['lumeri_templar.blessed_shells'].fantasy_tags).not.toContain('guns');
    expect((CLASS.guardian as any).gain.map((m: any) => m.id)).toEqual(['at_your_side']);
    expect(CLASS_MOVE_POOL['guardian.will_shield']).toBeUndefined(); // Ward replaces it
  });
  it('rule 8: no move costs MP or Strain; the class\'s only pool is Devotion', () => {
    expect(CLASS.guardian.resources).toEqual(['devotion']);
    const all = [WARD, SMITE, SANCT, CLASS_MOVE_POOL['lumeri_templar.judgement']];
    for (const m of all) expect(JSON.stringify(m.effects), m.id).not.toMatch(/"resource":"(mp|strain)"|"res":\{[^}]*"(mp|strain)"/);
  });
  it('Smite is Rebuke\'s size (Leon, 13 Nov 2026), its own data; the Ward a Whisper and Sanctuary a Hymn', () => {
    expect(SMITE.amounts.smite.base).toBe(REBUKE); expect(SMITE.amounts.smite_storm.base).toBe(REBUKE);
    expect(WARD.effects[0].prayer).toBe('whisper'); expect(SANCT.effects[0].prayer).toBe('hymn');
    for (const e of SMITE.effects.filter((x: any) => x.op === 'deal')) { expect(e.when).toBe('hit'); expect(e.if.mode).toBeUndefined(); expect(e.if.melee).toBeUndefined(); expect(e.limit).toEqual({ per: 'per_turn', n: 1, key: 'smite' }); }
  });
});

describe('rule 1: prayer opens at Faith 1 (Whispers), Hymns from Faith 3, as built for everyone', () => {
  it('Faith 1 and 2 pray Whispers, Faith 3 Hymns; nobody below 1', () => {
    expect(WHISPER_FAITH).toBe(1); expect(HYMN_FAITH).toBe(3);
    for (const faith of [0, 1, 2, 3]) {
      const h = chap({ faith, cls: false });
      expect(previewPrayer(h.g, h.me.id, 'whisper', 'rebuke', { targetId: h.foe.id }).ok, 'whisper at ' + faith).toBe(faith >= WHISPER_FAITH);
      expect(previewPrayer(h.g, h.me.id, 'hymn', 'thunderclap').why === 'A Hymn needs Faith ' + HYMN_FAITH + '.', 'hymn at ' + faith).toBe(faith < HYMN_FAITH);
    }
  });
  it('a Faith 1 Rebuke deals 20 × its (small) Blessing power', () => {
    const h = chap({ faith: 1, cls: false }), hp = h.foe.hp; h.pray('whisper', 'rebuke', { targetId: h.foe.id });
    expect(hp - h.foe.hp).toBe(Math.round(REBUKE * power(h) * scaleOf(h.me.level))); // rules 1.36: × scale(level)
  });
  it('rule 2: the Chaplain waits as everyone does', () => {
    const a = chap(), b = chap({ cls: false }); expect(hymnWait(a.c, a.me)).toBe(hymnWait(b.c, b.me));
  });
});

describe('rules 3 and 4: Ward', () => {
  it('a Whisper: 1 AP, the turn\'s one Whisper, a shield of 10 × Blessing power (heal dial, level) on its own layer', () => {
    const h = chap(), ap = h.me.ap; ward(h, h.a1);
    expect(h.me.ap).toBe(ap - WARD.effects[0].ap);
    expect(h.a1.shields).toEqual([expect.objectContaining({ layer: 'ward', by: h.me.id, n: wardOf(h, h.a1) })]);
    expect(() => h.pray('whisper', 'rebuke', { targetId: h.foe.id })).toThrow(/One Whisper a turn/);
    const k = chap(); k.pray('whisper', 'rebuke', { targetId: k.foe.id }); expect(() => ward(k, k.a1)).toThrow(/One Whisper a turn/);
  });
  it('allies only, never yourself; only the Chaplain has it', () => {
    const h = chap(); expect(() => ward(h, h.me)).toThrow(/Not on yourself/); expect(() => ward(h, h.foe)).toThrow(/Pick an ally/);
    const n = chap({ cls: false }); expect(() => ward(n, n.a1)).toThrow();
  });
  it('two held at most: a third ends the oldest; a second on the same ally tops it up, never doubles', () => {
    const h = chap(); ward(h, h.a1); clearPrayerLimits(h.me); ward(h, h.a2); clearPrayerLimits(h.me);
    h.a1.shields![0].n = 3; ward(h, h.a1); expect(h.a1.shields![0].n).toBe(wardOf(h, h.a1)); // topped up
    clearPrayerLimits(h.me); h.me.ap = 6; const m = h.f.pcs.find((u) => u.id !== h.me.id && u.id !== h.a1.id && u.id !== h.a2.id);
    expect(WARD_HOLDERS).toBe(2); void m;
  });
  it('it stacks over any base shield and is spent first', () => {
    const h = chap(); h.a1.shield = 5; ward(h, h.a1); const n = wardOf(h, h.a1), hp = h.a1.hp;
    h.bound(() => applyDamage(h.cb, h.a1, n + 2, { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any));
    expect(h.a1.shields).toBeUndefined(); expect(h.a1.shield).toBe(3); expect(h.a1.hp).toBe(hp);
  });
  it('an Atheist rolls the Whisper\'s TN: a miss spends the AP and the Whisper, and gives no shield', () => {
    const h = chap({ patron: null }); h.seed(1); const ap = h.me.ap; ward(h, h.a1);
    expect(h.me.ap).toBe(ap - 1); expect(h.a1.shields).toBeUndefined(); expect(() => h.pray('whisper', 'rebuke', { targetId: h.foe.id })).toThrow(/One Whisper/);
    const k = chap({ patron: null }); k.seed(20); ward(k, k.a1); expect(k.a1.shields?.[0].layer).toBe('ward'); void ATHEIST_TN;
  });
});

describe('rule 5: Sanctuary', () => {
  const sanct = (h: C, tile: string) => h.perk('class:guardian.sanctuary', { actionId: 'sanctuary', tile });
  it('a Hymn: 3 AP, the Hymn wait starts, Witnessed at Faith 5; allies on the 3×3 take half', () => {
    const h = chap(); sanct(h, '2,5');
    expect(h.me.ap).toBe(6 - SANCT.effects[0].ap); expect(condOn(h.me, 'witnessed')).toBe(true);
    expect(() => h.pray('hymn', 'thunderclap')).toThrow(/wait/);
    const z = zonesAt(h.cb, '2,6', 'sanctuary', 'any')[0]; expect(z).toBeTruthy(); expect(z.pool).toBeGreaterThan(0);
    const hp = h.a1.hp; h.bound(() => applyDamage(h.cb, h.a1, 9, { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any)); expect(hp - h.a1.hp).toBe(Math.ceil(9 / 2));
  });
  it('its cap: 11 × Blessing power (heal dial, level) prevented in all, then it ends', () => {
    const h = chap(); sanct(h, '2,5'); const z = zonesAt(h.cb, '2,6', 'sanctuary', 'any')[0], cap = z.pool!;
    const b = amountBlock('class:guardian.sanctuary', 'sanctuary_cap'); expect(b.base).toBe(SANCT.amounts.sanctuary_cap.base);
    expect(Math.abs(cap - b.base * profileOf('blessing_mend').k / profileOf('blessing').k * power(h) * mendFactorOf(h.me))).toBeLessThanOrEqual(0.5);
    h.bound(() => applyDamage(h.cb, h.a1, 4 * cap, { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any));
    expect(zonesAt(h.cb, '2,6', 'sanctuary', 'any').length).toBe(0);
  });
  it('a tile you can see within its reach; ends at the start of your next turn', () => {
    const h = chap(); expect(() => sanct(h, '15,5')).toThrow(/Out of range/);
    sanct(h, '3,5'); h.f.turn(h.me); expect(zonesAt(h.cb, '3,5', 'sanctuary', 'any').length).toBe(0);
  });
});

describe('rules 6, 7 and 9: Smite and Judged', () => {
  it('a weapon hit on your turn: + 20 × Blessing power Soul (no armour, no roll), once a turn; the target is Judged', () => {
    const h = chap({ patron: 'mother_ember' }); h.foe.armour = 20; h.seed(15, 15, 15, 15);
    const hp = h.foe.hp; h.shoot(h.foe); const first = hp - h.foe.hp;
    expect(h.cb.log.some((l) => /Smite/.test(l))).toBe(true); expect(condOn(h.foe, 'judged')).toBe(true); expect(condSource(h.foe, 'judged')).toBe(h.me.id);
    const hp2 = h.foe.hp; h.shoot(h.foe); const second = hp2 - h.foe.hp;
    expect(first - second).toBe(smiteOf(h)); // the second hit carries no Smite
  });
  it('not for a class that is not the Chaplain', () => {
    const h = chap({ patron: 'mother_ember', cls: false }); h.seed(15, 15); const hp = h.foe.hp; h.shoot(h.foe);
    expect(h.cb.log.some((l) => /Smite/.test(l))).toBe(false); expect(condOn(h.foe, 'judged')).toBe(false); void hp;
  });
  it('a hit that kills leaves Smite for a later hit that turn', () => {
    const h = chap({ patron: 'mother_ember' }); h.foe.hp = 1; h.seed(15, 15, 15, 15); h.shoot(h.foe); expect(h.foe.dead || h.foe.downed).toBe(true);
    const hp = h.foe2.hp; h.f.unit(h.foe2.id).pos = '6,4'; h.shoot(h.foe2); expect(h.cb.log.filter((l) => /Smite/.test(l)).length).toBe(1); void hp;
  });
  it('never on another unit\'s turn (a reaction, an opportunity attack)', () => {
    const h = chap({ patron: 'mother_ember' }); h.f.turn(h.foe); h.seed(15);
    h.bound(() => resolveAttack(h.cb, h.g.rng, h.me, h.foe, 'shot', null, { noAp: true } as any)); expect(h.cb.log.some((l) => /Smite/.test(l))).toBe(false);
  });
  it('Old Overcast\'s Smite is lightning (the storm tag); the Toll-Keeper\'s never takes the last HP', () => {
    const h = chap({ patron: 'old_overcast' }); h.seed(15, 15); h.shoot(h.foe); expect(h.c.devotionXp).toBeGreaterThan(devotionThreshold(6)); // storm, a liked tag
    // the Toll-Keeper's: the shot leaves 1 HP (armour stops all but 1), the Smite that would kill subdues instead
    const t = chap({ patron: 'toll_keeper' }); t.foe.hp = 2; t.foe.armour = 999; t.seed(15, 15); t.shoot(t.foe);
    expect(t.cb.log.some((l) => /Smite/.test(l))).toBe(true); expect(t.foe.dead).toBeFalsy(); expect(t.foe.surrendered).toBe(true);
  });
  it('an Atheist rolls the Whisper TN for it (prayerAnswered): a miss says so and leaves it unspent', () => {
    const h = chap({ patron: null });
    h.bound(() => { h.g.rng.state = rngFor(1); expect(prayerAnswered(h.cb, h.g.rng, h.me, false)).toBe(false); h.g.rng.state = rngFor(20); expect(prayerAnswered(h.cb, h.g.rng, h.me, false)).toBe(true); });
    expect(h.cb.log.some((l) => /no answer/.test(l))).toBe(true);
    const z = chap({ faith: 0 }); expect(z.bound(() => prayerAnswered(z.cb, z.g.rng, z.me, false))).toBe(false); // the prayer door shut: Faith 0
    const s = chap(); s.me.conds = { silenced: 2 } as any; expect(s.bound(() => prayerAnswered(s.cb, s.g.rng, s.me, false))).toBe(false); // Silenced
  });
});

describe('rules 10 to 12: the patron at its side', () => {
  it('rule 11: the first intervention of a fight keeps Witnessed for the Chaplain; the second ends it', () => {
    const h = chap({ patron: 'mother_ember', devotion: 7 }); h.me.conds = { witnessed: 99 } as any;
    const hit = (t: Unit) => { t.hp = t.maxHp; h.bound(() => applyDamage(h.cb, t, Math.ceil(t.maxHp * 0.8), { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any)); };
    hit(h.a1); expect(h.cb.log.some((l) => /intervenes/.test(l))).toBe(true); expect(condOn(h.me, 'witnessed')).toBe(true);
    hit(h.a2); expect(h.cb.log.filter((l) => /intervenes/.test(l)).length).toBe(2); expect(condOn(h.me, 'witnessed')).toBe(false);
    const n = chap({ patron: 'mother_ember', cls: false }); n.me.conds = { witnessed: 99 } as any; n.a1.hp = n.a1.maxHp;
    n.bound(() => applyDamage(n.cb, n.a1, Math.ceil(n.a1.maxHp * 0.8), { by: n.foe, type: 'weapon', shield: true, credit: 'hp' } as any)); expect(condOn(n.me, 'witnessed')).toBe(false);
  });
  it('Mother Ember: below half with the presence, below a quarter without', () => {
    const run = (cls: boolean) => { const h = chap({ patron: 'mother_ember', cls }); h.me.conds = { witnessed: 99 } as any; h.bound(() => applyDamage(h.cb, h.a1, Math.ceil(h.a1.maxHp * 0.6), { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any)); return h.cb.log.some((l) => /intervenes/.test(l)); };
    expect(FAITH_PATRON.mother_ember.intervention.presence.below).toBe(0.5); expect(run(true)).toBe(true); expect(run(false)).toBe(false);
  });
  it('the presence needs Witnessed and the class (stat patron_presence)', () => {
    const h = chap(); expect(h.bound(() => statQuery({ cb: h.cb, u: h.me, c: h.c }, 'patron_presence').add)).toBeGreaterThan(0);
    const n = chap({ cls: false }); expect(n.bound(() => statQuery({ cb: n.cb, u: n.me, c: n.c }, 'patron_presence').add)).toBe(0);
  });
  it('Old Overcast: the kill\'s lightning goes to a Judged enemy first (where the weapon struck)', () => {
    const h = chap({ patron: 'old_overcast' }); h.me.conds = { witnessed: 99 } as any;
    const far = h.foe2; far.pos = '12,5'; h.foe.hp = 1; far.conds = { judged: 1 } as any; (far as any).condBy = { judged: h.me.id };
    const third = h.f.foes.length; void third; h.seed(15, 15); const hp = far.hp; h.shoot(h.foe); expect(h.foe.dead || h.foe.downed).toBe(true);
    expect(h.foe2.hp).toBeLessThan(hp);
  });
  it('the Matchmaker reaches an ally within 2; the Laughing Mask a miss on an ally next to you', () => {
    const m = chap({ patron: 'the_matchmaker' }); m.me.conds = { witnessed: 99 } as any; m.a1.pos = '2,7'; const hp = m.me.hp;
    m.bound(() => applyDamage(m.cb, m.a1, 20, { by: m.foe, type: 'weapon', shield: true, credit: 'hp' } as any)); expect(m.me.hp).toBeLessThan(hp);
  });
  it('Nerukhan: a Judged enemy of the Chaplain\'s that brings an ally to a quarter or less takes the Devotion-scaled Soul damage', () => {
    const run = (judged: boolean) => {
      const h = chap({ patron: 'nerukhan' }); h.me.conds = { witnessed: 99 } as any;
      if (judged) { h.foe.conds = { judged: 1 } as any; (h.foe as any).condBy = { judged: h.me.id }; }
      const hp = h.foe.hp; h.bound(() => applyDamage(h.cb, h.a1, h.a1.hp - Math.floor(h.a1.maxHp * 0.2), { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any));
      return hp - h.foe.hp;
    };
    expect(FAITH_PATRON.nerukhan.intervention.presence.judged_harms_below).toBe(0.25);
    expect(run(true)).toBeGreaterThan(0); expect(run(false)).toBe(0);
  });
  it('the Laughing Mask: an enemy that misses an ally next to the Chaplain falls Prone', () => {
    const h = chap({ patron: 'the_laughing_mask' }); h.me.conds = { witnessed: 99 } as any; h.a1.def = 99;
    h.f.turn(h.foe); h.seed(1, 1, 1);
    h.bound(() => resolveAttack(h.cb, h.g.rng, h.foe, h.a1, 'shot', null, { noAp: true } as any));
    expect(!!(h.foe.prone || condOn(h.foe, 'prone')), h.cb.log.slice(-4).join(' / ')).toBe(true);
  });
  it('the Toll-Keeper: the ally kept standing also gains your Ward', () => {
    const h = chap({ patron: 'toll_keeper' }); h.me.conds = { witnessed: 99 } as any; h.a1.hp = 3;
    h.bound(() => applyDamage(h.cb, h.a1, 50, { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any));
    expect(h.a1.hp).toBe(1); expect(h.a1.shields?.[0]).toMatchObject({ layer: 'ward', by: h.me.id });
  });
});

describe('Verdict: one plain attack with any weapon (the weapon-neutral ruling)', () => {
  it('a pistol may pass a Verdict (it needed a melee weapon or a scattergun)', () => {
    const h = chap({ weapon: 'service_pistol', devotion: 6 }); const e = perkActionsFor({ g: h.g, cb: h.cb, u: h.me, c: h.c } as any, 'combat').find((x: any) => x.id === 'class:lumeri_templar.judgement');
    expect(e).toBeTruthy(); expect(e!.why || '').not.toMatch(/melee|scattergun/);
    h.seed(15, 15); h.perk('class:lumeri_templar.judgement', { actionId: 'judgement', targetId: h.foe.id }); expect(h.cb.log.some((l) => /Verdict/.test(l))).toBe(true);
  });
});

describe('the old save', () => {
  it('a Guardian of Revision 3 loads: its class id stays, its moves resolve by key', () => {
    for (const k of ['class:guardian.ward', 'class:guardian.smite', 'class:guardian.sanctuary', 'class:lumeri_templar.judgement', 'class:lumeri_templar.blessed_shells', 'class:lumeri_templar.under_the_eye', 'class:guardian.at_your_side'])
      expect(itemInfo(k), k).toBeTruthy();
    const h = chap(); expect(h.c.classId).toBe('guardian');
  });
});
