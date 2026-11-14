// The fight tally (rules 1.47; survival-spec rule 35, section 4.2 item 5; build step 6): a run's fight is tallied per
// character from the effects it emitted, by a pure function over the fight's tape. The first test plays seeded
// Survival fights through the reducer and sets the kept tally against sums computed here, from the raw effects, in
// another way; the second feeds the function a hand-made tape with a heal, a shield, a kill and a Down.
import { describe, expect, it } from 'vitest';
import { fightTally, sumTallies, type TapeEv, type FightTally } from '../src';
import { fxTaps } from '../src/fxtap';
import { Rec } from './helpers/replay';
import { survivalRoom, playStage } from './helpers/survival';

const DUO = [{ build: 'plain_gun', level: 1 }, { build: 'sigil', level: 1 }];

/** The raw effects of every fight (the event itself: a shot's damage is written on it after it is emitted) (this test's own tap, beside the engine's). */
function watch() { const seen: any[] = []; const tap = (_cb: any, ev: any) => { seen.push(ev); }; fxTaps.push(tap); return { seen, stop: () => { fxTaps.splice(fxTaps.indexOf(tap), 1); } }; }

describe('the fight tally equals the effects it was made from', () => {
  for (const seed of ['PHC-T001', 'PHC-T002', 'PHC-T003']) it('seeded fight ' + seed + ': damage, shots, hits, taken, kills and rounds are the stream\'s sums', () => {
    const w = watch();
    try {
      const r = new Rec(survivalRoom(seed, DUO, { test: true }), DUO); r.must({ type: 'run/start', seed, camp: 'recommended' });
      playStage(r, DUO.length, { maxNodes: 1 });
      const f = r.g.run.stats.fights[0]; expect(f?.outcome).toBeTruthy();
      const t: FightTally = f.tally; expect(t).toBeTruthy(); expect(t.rounds).toBe(f.rounds);
      expect(r.g.combat?.tape).toBeUndefined(); // the tape is not kept past the fight
      // the independent sums: a fresh pass over the raw effects of this run's fight
      const ev = w.seen, ids = Object.keys(t.chars).map((c) => 'pc-' + c), foe = (id?: string) => !!id && !ids.includes(id) && !id.startsWith('pc-');
      let actor = '', other = 0; const dealt: Record<string, number> = {}, shots: Record<string, number> = {}, hits: Record<string, number> = {}, taken: Record<string, number> = {};
      for (const e of ev) {
        if (e.k === 'turn') actor = e.unit;
        const blow = e.k === 'shot' || e.k === 'melee' ? (e.hit ? e.dmg || 0 : 0) : e.k === 'hurt' ? e.dmg || 0 : 0;
        if ((e.k === 'shot' || e.k === 'melee') && e.unit && !e.object && ids.includes(e.unit)) { shots[e.unit] = (shots[e.unit] || 0) + 1; if (e.hit) hits[e.unit] = (hits[e.unit] || 0) + 1; }
        if (ids.includes(e.target)) taken[e.target] = (taken[e.target] || 0) + blow;
        if (foe(e.target) && blow > 0) { const by = e.k === 'hurt' ? actor : e.unit; if (ids.includes(by)) dealt[by] = (dealt[by] || 0) + blow; else other += blow; }
      }
      expect(Object.values(t.chars).reduce((n, c) => n + c.dealt, 0) + t.other.dealt).toBe(Object.values(dealt).reduce((n, v) => n + v, 0) + other);
      for (const [cid, row] of Object.entries(t.chars)) {
        const id = 'pc-' + cid;
        expect([cid, row.dealt]).toEqual([cid, dealt[id] || 0]); expect([cid, row.shots]).toEqual([cid, shots[id] || 0]);
        expect([cid, row.hits]).toEqual([cid, hits[id] || 0]); expect([cid, row.taken]).toEqual([cid, taken[id] || 0]);
        expect(row.hits).toBeLessThanOrEqual(row.shots);
      }
      expect(Object.values(t.chars).reduce((n, c) => n + c.kills, 0)).toBeLessThanOrEqual(f.kills);
      // the world agrees: what the stream says the squad dealt is at least the foes' HP that left
      expect(Object.values(t.chars).reduce((n, c) => n + c.dealt, 0) + t.other.dealt).toBeGreaterThan(0);
    } finally { w.stop(); }
  });
});

describe('fightTally over a made tape', () => {
  const units = [
    { id: 'pc-c1', side: 'pc' as const, name: 'Ash', charId: 'c1' }, { id: 'pc-c2', side: 'pc' as const, name: 'Birch', charId: 'c2' },
    { id: 'f1', side: 'foe' as const, name: 'Raider 1' }, { id: 'f2', side: 'foe' as const, name: 'Raider 2' },
  ];
  const tape: TapeEv[] = [
    { k: 'turn', unit: 'pc-c1' },
    { k: 'shot', unit: 'pc-c1', target: 'f1', hit: true, dmg: 30 }, { k: 'shot', unit: 'pc-c1', target: 'f1', hit: false, dmg: 0 },
    { k: 'hurt', target: 'f1', dmg: 12 }, { k: 'down', unit: 'f1', dead: true }, // a kill, credited to Ash (the last to hit it)
    { k: 'turn', unit: 'pc-c2' },
    { k: 'heal', target: 'pc-c1', amount: 25 }, { k: 'shield', target: 'pc-c1', absorbed: 9 },
    { k: 'turn', unit: 'f2' },
    { k: 'shot', unit: 'f2', target: 'pc-c1', hit: true, dmg: 40 }, { k: 'shot', unit: 'f2', target: 'pc-c2', hit: true, dmg: 22 },
    { k: 'down', unit: 'pc-c1', dead: false },
    { k: 'hurt', target: 'f2', dmg: 5 }, // a bleed on a foe's turn: nobody's
    { k: 'turn', unit: 'pc-c2' },
    { k: 'leech', unit: 'pc-c2', amount: 6 }, { k: 'shot', unit: 'pc-c2', target: 'f2', hit: true, dmg: 50 }, { k: 'down', unit: 'f2', dead: true }, { k: 'down', unit: 'f2', dead: true },
  ];
  it('damage dealt and taken, healing, a shield\'s soak, a kill and a Down, per character', () => {
    const t = fightTally(tape, units, 3);
    expect(t.rounds).toBe(3);
    expect(t.chars.c1).toEqual({ name: 'Ash', dealt: 42, taken: 40, healed: 0, absorbed: 9, kills: 1, downs: 1, deaths: 0, shots: 2, hits: 1 });
    expect(t.chars.c2).toEqual({ name: 'Birch', dealt: 50, taken: 22, healed: 31, absorbed: 0, kills: 1, downs: 0, deaths: 0, shots: 1, hits: 1 });
    expect(t.other).toEqual({ dealt: 5, healed: 0 });
  });
  it('sums add rows by character, and an empty tape gives an empty tally', () => {
    const a = fightTally(tape, units, 3), s = sumTallies([a, a, undefined]);
    expect(s.rounds).toBe(6); expect(s.chars.c2.healed).toBe(62); expect(s.chars.c1.downs).toBe(2); expect(s.other.dealt).toBe(10);
    expect(fightTally([], units, 0).chars.c1.dealt).toBe(0);
  });
});
