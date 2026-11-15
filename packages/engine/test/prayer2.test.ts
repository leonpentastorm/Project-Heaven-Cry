// Prayer 2.0 (rules 1.56, prayer 2.0; docs/design/proposals/2026-11-prayer-2.0.md): the Chaplain's Canticle and its
// verses, the song breaking, Amen, Holy Dread, Last Rites, and the fx rows of Smite and Ward. Through the reducer, with
// the numbers read from the data.
import { describe, expect, it } from 'vitest';
import './helpers/yard16';
import { CLASS, condOn, applyDamage, d20, setDevotionXp, devotionThreshold, actionsFor, CONDITION_ROWS, type Unit, type Character, type Action } from '../src';
import { fightWith, withGame, type CharSpec } from './helpers/perkfight';

function rngFor(...ns: number[]): number { for (let s = 1; s < 5_000_000; s++) { const r = { state: s }; if (ns.every((n) => d20(r) === n)) return s; } throw new Error('no seed'); }
const GAIN = Object.fromEntries(((CLASS.guardian as any).gain as any[]).map((m) => [m.id, m]));
const CANT = GAIN.canticle, SUNG: any[] = CANT.effects[0].effects;
const VERSE_IN = SUNG.find((e) => e.op === 'condition' && e.condition === 'canticle_old_overcast').targets.within as number;
const CRESC = SUNG.find((e) => e.condition === 'canticle_crescendo');
const verseOf = (p: string) => (p ? 'canticle_' + p : 'canticle_plain');

type Opt = { patron?: string | null; faith?: number; cls?: boolean };
/** A Chaplain (Virtue 8: rank III) and two allies against two soldiers, on the Chaplain's turn. */
function chap(o: Opt = {}) {
  const spec: CharSpec = { name: 'Chaplain', skills: { faith: o.faith ?? 6 }, attrs: { virtue: 8 }, level: 12, ...(o.cls === false ? {} : { classId: 'guardian' }) };
  const f = fightWith([spec, { name: 'Medic' }, { name: 'Gunner' }], [{ at: 'F6' }, { at: 'G6' }], { level: 12 });
  const c = f.g.characters[f.pc.charId!];
  if (o.patron === null) { c.belief = { kind: 'atheist' }; c.patron = null; c.devotion = 0; }
  else { const p = o.patron || 'old_overcast'; c.belief = { kind: 'faithful', patron: p }; c.patron = p; setDevotionXp(c, devotionThreshold(6)); c.devotion = 6; }
  const [me, a1, a2] = f.pcs, [f0, f1] = f.foes;
  me.pos = '2,5'; a1.pos = '2,6'; a2.pos = '9,9'; f0.pos = '6,5'; f1.pos = '7,5';
  for (const u of f.cb.units) { u.hp = u.maxHp; u.conds = {}; u.shield = 0; delete u.shields; }
  for (const u of f.foes) { u.hp = u.maxHp = 2000; u.def = -40; u.armour = 0; }
  f.turn(me);
  return {
    f, get g() { return f.g; }, get cb() { return f.cb; }, get c(): Character { return f.g.characters[c.id]; },
    get me(): Unit { return f.unit(me.id); }, get a1(): Unit { return f.unit(a1.id); }, get a2(): Unit { return f.unit(a2.id); },
    get foe(): Unit { return f.unit(f0.id); },
    sing: () => f.act({ type: 'combat/perk', unitId: me.id, id: 'class:guardian.canticle', actionId: 'canticle' } as Action, 'host'),
    pray: (kind: string, id: string, x: any = {}) => f.act({ type: 'faith/pray', unitId: me.id, kind, id, ...x } as Action, 'host'),
    shoot: (by: Unit, t: Unit) => f.act({ type: 'combat/attack', unitId: by.id, targetId: t.id, mode: 'shot' } as Action, 'host'),
    /** End the Chaplain's turn through the reducer (its turn_end runs), then make it the Chaplain's turn again. Its HP is
     * kept above harm by a shield (a shield that holds does not break the song). */
    nextTurn() {
      const r0 = f.cb.round; this.me.shield = 99999;
      for (let i = 0; i < 12 && !(f.cb.round > r0 && f.cb.order[f.cb.turn] === me.id); i++) {
        const id = f.cb.order[f.cb.turn], u = f.unit(id); if (u.side !== 'pc') break;
        f.act({ type: 'combat/end-turn', unitId: id } as Action, f.g.characters[u.charId!]?.owner || 'host');
      }
      if (f.cb.order[f.cb.turn] !== me.id) f.turn(me);
    },
    seed: (...ns: number[]) => { f.g.rng.state = rngFor(...ns); },
    fx: (k: string) => ((f.cb.fx || []) as any[]).filter((e) => e.k === k),
  };
}

describe('the data', () => {
  it('the Chaplain\'s gains: the presence, the Canticle, Amen, Holy Dread, Last Rites; ten verse rows, every one a boon', () => {
    expect(Object.keys(GAIN)).toEqual(['at_your_side', 'canticle', 'amen', 'holy_dread', 'last_rites']);
    const rows = (CONDITION_ROWS as any[]).filter((r) => r.id.startsWith('canticle_'));
    expect(rows.length).toBe(10); for (const r of rows) { expect(r.boon).toBe(true); expect(r.adjudication).toBe('engine'); }
    for (const g of Object.values(GAIN)) expect((g as any).adjudication).toBe('engine');
    expect(typeof CANT.door_line).toBe('string');
  });
});

describe('the Canticle', () => {
  it('1 AP: the singer and allies within reach carry the patron\'s verse; a foe and a far ally do not; once a turn', () => {
    const h = chap(), ap = h.me.ap; h.sing();
    expect(h.me.ap).toBe(ap - CANT.effects[0].ap);
    expect(condOn(h.me, 'canticle_old_overcast')).toBe(true); expect(condOn(h.a1, 'canticle_old_overcast')).toBe(true);
    expect(condOn(h.a2, 'canticle_old_overcast')).toBe(false); expect(condOn(h.foe, 'canticle_old_overcast')).toBe(false);
    expect(VERSE_IN).toBeLessThan(7);
    expect(h.fx('canticle').at(-1)).toMatchObject({ verse: 1, target: h.me.id });
    expect(() => h.sing()).toThrow(/sang this turn/);
  });
  it('each patron sings its own verse; an Atheist rolls for the plain one', () => {
    for (const p of ['nerukhan', 'mother_ember', 'the_matchmaker', 'counting_weaver']) { const h = chap({ patron: p }); h.sing(); expect(condOn(h.a1, verseOf(p)), p).toBe(true); }
    const a = chap({ patron: null }); a.seed(20); a.sing(); expect(condOn(a.a1, 'canticle_plain')).toBe(true);
    const b = chap({ patron: null }); b.seed(1); b.sing(); expect(condOn(b.a1, 'canticle_plain')).toBe(false);
    expect(b.fx('roll').some((e) => e.why === 'pray')).toBe(true); // the Atheist's roll is an event the client draws
  });
  it('refused with no point of Faith, with the data\'s reason', () => {
    const h = chap({ faith: 0 }); expect(() => h.sing()).toThrow(/needs a point of Faith/);
  });
  it('three turns in a row reach verse III (Crescendo within its reach at Faith 5); a skipped turn starts again', () => {
    const h = chap(); h.sing(); h.nextTurn(); h.sing();
    expect(h.fx('canticle').at(-1).verse).toBe(2); expect(condOn(h.a1, 'canticle_crescendo')).toBe(false);
    h.nextTurn(); h.sing();
    expect(h.fx('canticle').at(-1).verse).toBe(3); expect(condOn(h.a1, 'canticle_crescendo')).toBe(true); expect(CRESC.targets.within).toBeGreaterThan(VERSE_IN);
    h.nextTurn(); h.nextTurn(); h.sing(); expect(h.fx('canticle').at(-1).verse).toBe(1);
  });
  it('verse III needs Faith 5', () => {
    const h = chap({ faith: CRESC.if.self_skill.faith - 1 }); h.sing(); h.nextTurn(); h.sing(); h.nextTurn(); h.sing();
    expect(h.fx('canticle').at(-1).verse).toBe(3); expect(condOn(h.a1, 'canticle_crescendo')).toBe(false);
  });
  it('a blow that takes the singer\'s HP breaks the song: every verse near it ends; a shield that holds does not', () => {
    const h = chap(); h.sing(); h.nextTurn(); h.sing();
    h.me.shield = 50; withGame(h.g, () => applyDamage(h.cb, h.me, 10, { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any));
    expect(condOn(h.a1, 'canticle_old_overcast')).toBe(true); expect(h.fx('canticle_break').length).toBe(0);
    h.me.shield = 0; withGame(h.g, () => applyDamage(h.cb, h.me, 10, { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any));
    expect(condOn(h.a1, 'canticle_old_overcast')).toBe(false); expect(condOn(h.me, 'canticle_old_overcast')).toBe(false);
    expect(h.fx('canticle_break').length).toBe(1); expect(h.cb.log.some((l) => /Canticle breaks/.test(l))).toBe(true);
    h.nextTurn(); h.sing(); expect(h.fx('canticle').at(-1).verse).toBe(1); // it starts again
  });
  it('Nerukhan\'s verse: damage taken ×0.9 (rounded up)', () => {
    const h = chap({ patron: 'nerukhan' }); h.sing(); const hp = h.a1.hp;
    withGame(h.g, () => applyDamage(h.cb, h.a1, 20, { by: h.foe, type: 'weapon', shield: true, credit: 'hp' } as any));
    const v = (CONDITION_ROWS as any[]).find((r) => r.id === 'canticle_nerukhan').effects[0].value;
    expect(hp - h.a1.hp).toBe(Math.ceil(20 * v));
  });
  it('only the Chaplain sings', () => {
    const h = chap({ cls: false }); expect(() => h.sing()).toThrow();
    const c = chap(); const ds = withGame(c.g, () => actionsFor(c.g, c.me.id, null)); expect(ds.some((d: any) => /Canticle/.test(d.name))).toBe(true);
  });
});

describe('Amen, Holy Dread, Last Rites', () => {
  it('Amen: after a prayer, an ally\'s first hit on a standing enemy adds the patron\'s blow; once', () => {
    const h = chap({ patron: 'mother_ember' }); h.pray('whisper', 'rebuke', { targetId: h.foe.id });
    h.a1.pos = '5,5'; h.f.turn(h.a1); h.seed(15, 15, 15, 15);
    h.shoot(h.a1, h.foe); expect(h.cb.log.some((l) => /\(Amen\)/.test(l))).toBe(true); expect(h.fx('amen').length).toBe(1);
    h.shoot(h.a1, h.foe); expect(h.cb.log.filter((l) => /\(Amen\)/.test(l)).length).toBe(1);
  });
  it('no Amen without a prayer first', () => {
    const h = chap({ patron: 'mother_ember' }); h.a1.pos = '5,5'; h.f.turn(h.a1); h.seed(15, 15); h.shoot(h.a1, h.foe);
    expect(h.cb.log.some((l) => /\(Amen\)/.test(l))).toBe(false);
  });
  it('Holy Dread: a Rebuke that leaves a foe at half HP or less: Heart save or Shaken', () => {
    const h = chap(); h.foe.hp = Math.floor(h.foe.maxHp * 0.5); h.seed(1, 1, 1, 1);
    h.pray('whisper', 'rebuke', { targetId: h.foe.id });
    expect(condOn(h.foe, 'shaken')).toBe(true); expect(h.fx('holy_dread').length).toBe(1);
    const k = chap(); k.seed(1, 1, 1, 1); k.pray('whisper', 'rebuke', { targetId: k.foe.id }); expect(condOn(k.foe, 'shaken')).toBe(false); // a full-HP foe
  });
  it('Last Rites: a prayer\'s heal on a Downed ally is ×1.5', () => {
    const run = (cls: boolean) => {
      const h = chap({ patron: 'mother_ember', cls, faith: 1 }); const t = h.a1; t.maxHp = 5000; t.hp = 0; t.downed = true as any; // a big body: the Whisper's cap (a share of max HP) stays out of it
      h.pray('whisper', 'health', { targetId: t.id }); return h.f.unit(t.id).hp;
    };
    const with_ = run(true), without = run(false); 
    expect(without).toBeGreaterThan(0); expect(with_).toBeGreaterThan(without); // (below the Whisper's own cap of a share of max HP: Faith 1)
    expect(Math.abs(with_ - Math.floor(without * GAIN.last_rites.effects[0].value))).toBeLessThanOrEqual(1);
  });
});

describe('Smite and Ward carry their own effect', () => {
  it('Smite: a smite event in the same beat as the damage on the foe', () => {
    const h = chap({ patron: 'mother_ember' }); h.seed(15, 15, 15, 15); h.shoot(h.me, h.foe);
    expect(h.fx('smite').length).toBe(1);
  });
  it('Ward: a ward_seal event before the shield on the ally', () => {
    const h = chap(); h.f.act({ type: 'combat/perk', unitId: h.me.id, id: 'class:guardian.ward', actionId: 'ward', targetId: h.a1.id } as Action, 'host');
    expect(h.fx('ward_seal').length).toBe(1);
  });
});
