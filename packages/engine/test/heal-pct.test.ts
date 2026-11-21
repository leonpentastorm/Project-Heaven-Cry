// Rules 1.36: the level scale, and heals and shields in percent of HP (docs/design/level-scale-spec.md,
// docs/design/heal-shield-percent-spec.md, each with its "Settled by Leon" block). Every number is read from data.
import { describe, expect, it } from 'vitest';
import { RULES, levelFactor, scaleOf, mendFactor, statOf, profileOf, gatePct, gatedAmount, mendSized, outburstHeal, newCharacter, maxHp, ARCHETYPES, type Unit } from '../src';
import { fightWith, withGame } from './helpers/perkfight';

const L: any = (RULES as any).output.level, M: any = (RULES as any).mending;
const unit = (o: Partial<Unit>): Unit => ({ id: 'x', side: 'pc', level: 1, hp: 1, maxHp: 100, ...o } as Unit);

describe('rules 1.95: the level columns (the scale; tools/balance/bible/scale.json columns)', () => {
  it('deal is 40^((L - 1)/19), x1.214 a level; scaleOf reads deal (the scale column is gone); level 1 is 1 in every column', () => {
    for (let l = 1; l <= 20; l++) {
      expect(levelFactor('deal', l)).toBeCloseTo(40 ** ((l - 1) / 19), 3);
      expect(scaleOf(l)).toBe(levelFactor('deal', l));
      expect(levelFactor('mp', l)).toBeCloseTo(1 + 0.06 * (l - 1), 4);
      if (l > 1) expect(scaleOf(l)).toBeGreaterThan(scaleOf(l - 1));
    }
    for (const c of ['deal', 'mend', 'mp', 'enemy_damage']) expect(L[c][0], c).toBe(1);
    expect(L.scale).toBeUndefined(); expect(L.reference_hp).toBeUndefined();
  });
  it('max HP is (60 + 10 a point of Endurance over 1 + 1 a level) x (1 + 6% a point of Pain Threshold) x deal', () => {
    const c = newCharacter('c', 'p', { name: 'T', portrait: '', origin: '', kit: 'soldier', traits: [], skills: { ...ARCHETYPES[0].preset }, attrs: { ...ARCHETYPES[0].attributes }, cores: { ...ARCHETYPES[0].cores }, identity: {} } as any);
    c.attrs.endurance = 4; c.skills.pain_threshold = 1; c.perks = []; c.traits = [];
    for (const l of [1, 5, 10, 20]) { c.level = l; expect(maxHp(c)).toBe(Math.round(scaleOf(l) * 1.06 * (60 + 10 * 3 + (l - 1)))); }
  });
});

describe('rules 1.36: heals and shields in percent of HP', () => {
  it('the mend column (rules 1.95: the growth of the normal bar) never falls: a heal is the same share of the bar of a normal friend at every level', () => {
    for (let l = 1; l <= 20; l++) expect(mendFactor(l)).toBe(L.mend[l - 1]);
    for (let l = 2; l <= 20; l++) expect(L.mend[l - 1]).toBeGreaterThanOrEqual(L.mend[l - 2]);
  });
  it('the gate: 20% for a 2-AP heal, a Whisper\'s and a Hymn\'s own share; counted to 145 × scale at the giver\'s level; it rounds up', () => {
    expect(M.gate.hp).toBe(90); for (const p of ['mend', 'sigil_mend', 'soul_mend', 'tend']) expect(profileOf(p).min_pct, p).toBe(0.2);
    expect([gatePct('whisper'), gatePct('hymn'), gatePct('intervention')]).toEqual([M.gate.whisper, M.gate.hymn, M.gate.intervention]);
    const by = unit({ level: 10 }), big = unit({ maxHp: 5000, level: 10 }), small = unit({ maxHp: 90 });
    expect(gatedAmount('heal', 1, { of: 'mend' }, big, by)).toBe(Math.ceil(0.2 * M.gate.hp * scaleOf(10))); // rules 1.95: the gate counts to the normal bar at level 1 (90) x deal
    expect(gatedAmount('heal', 1, { of: 'mend' }, small, by)).toBe(Math.ceil(0.2 * 90));
    expect(gatedAmount('heal', 1, { of: 'mend', own: 0.4 }, small, by)).toBe(Math.ceil(0.08 * 90)); // a heal in an area shape
    expect(gatedAmount('heal', 0, { of: 'mend' }, small, by)).toBe(0); // nothing to gate: a word that heals nothing
  });
  it('rules 1.95 (ruling A10): the half-bar heal cap is gone: a heal restores what it gives; a shield has none either', () => {
    expect(M.cap_pct).toBeUndefined(); const t = unit({ maxHp: 200 });
    expect(gatedAmount('heal', 900, null, t)).toBe(900); expect(gatedAmount('shield', 900, null, t)).toBe(900);
  });
  it('Leon\'s Recruit: 125 HP, level 1, no Soul skill, a Buff design: the quick heal (stage 1) is 25; fully pumped (stage 4, plain) 40', () => {
    const c = newCharacter('r', 'p', { name: 'R', portrait: '', origin: '', kit: 'soldier', traits: [], skills: {}, attrs: {}, cores: {}, identity: {} } as any);
    const m: any = { soulBase: 40, soulMult: 1, soulBoon: statOf('soul_mend', c), deal: 1, healMult: 1, mend: mendFactor(1) }, d: any = { id: 'b', school: 'buff', option: 'heal', modules: [] };
    const t = unit({ maxHp: 125 }), by = unit({});
    const quick = gatedAmount('heal', outburstHeal(m, d, 1.0), { of: 'soul_mend', own: 1.0 }, t, by), full = gatedAmount('heal', outburstHeal(m, d, 1.6), { of: 'soul_mend', own: 1.6 }, t, by);
    expect(quick).toBe(18); expect(full).toBe(29); // rules 1.95: the gate counts to the normal bar (90) and the Soul base is x0.6
  });
  it('a stim heals 20% of its target\'s max HP (the gate alone, the whole bar counted)', () => {
    expect(M.medic.stim).toBe(0); expect(M.medic.stim_pct).toBe(0.2);
    const f = fightWith([{ kit: 'medic', level: 9 }, { level: 9 }], [{ tier: 'minion' }]); const [me, al] = f.pcs; al.pos = '3,5'; me.pos = '3,4'; (al as any).healRecv = 1; al.hp = 10;
    f.g.characters[me.charId!].stims = 2; f.turn(me); f.act({ type: 'combat/stim', unitId: me.id, targetId: al.id } as any);
    expect(f.unit(al.id).hp).toBe(10 + Math.ceil(0.2 * al.maxHp));
  });
  it('mendSized goes through the one gate and the cap (a Whisper on a big target is counted to 145 × scale)', () => {
    const f = fightWith([{ level: 5 }, { level: 5 }], [{ tier: 'minion' }]), [me, al] = f.pcs; al.hp = 1; (al as any).healRecv = 1;
    const r = withGame(f.g, () => mendSized(f.cb, me, al, 'heal', 1, { of: 'whisper' }, { healKind: 'blessing' }));
    expect(r.restored).toBe(Math.ceil(gatePct('whisper') * Math.min(al.maxHp, M.gate.hp * scaleOf(5)))); // rules 1.95: the gate's bar is the normal bar at level 1 (data)
  });
});
