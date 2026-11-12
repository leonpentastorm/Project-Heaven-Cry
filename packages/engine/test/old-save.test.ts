// @ts-nocheck (drives the recording tool in helpers/replay.ts)
// OLD SAVES KEEP LOADING. test/fixtures/save-0.22-*.json are whole GameStates written by the engine as it stood on
// 12 Nov 2026 (version 0.22.0, before the performance work): one in the middle of a fight (round 7, casters on both
// sides, glyphs and an Outburst on the field), one back in the story with the finished fight still in `combat`.
// Each is loaded the way the client loads a save (parsed, migrateLoaded) and played on. NEVER regenerate these files:
// they are what an old save looks like. When the saved shape changes, add a NEW fixture beside them and a migration,
// and these must still pass.
import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { migrateLoaded, apply, viewFor } from '../src';
import { Rec, fightTurn, type Pc } from './helpers/replay';

const load = (name: string) => migrateLoaded(JSON.parse(readFileSync(fileURLToPath(new URL('./fixtures/' + name + '.json', import.meta.url)), 'utf8')));
const MIXED: Pc[] = [{ build: 'calls', level: 12 }, { build: 'sigil', level: 12 }, { build: 'outburst', level: 12 }, { build: 'opt_gun', level: 12 }];
const GUNS: Pc[] = [{ build: 'opt_gun', level: 9 }, { build: 'opt_blade', level: 9 }, { build: 'plain_gun', level: 9 }, { build: 'plain_blade', level: 9 }];

describe('a save from 0.22.0 loads and plays on', () => {
  it('in the middle of a fight: the fight goes on to its end and back to the story', () => {
    const g0 = load('save-0.22-mid-fight');
    expect(g0.phase).toBe('combat'); expect(g0.combat.over).toBeFalsy();
    const r = new Rec(g0, MIXED), round = g0.combat.round;
    r.fight(12);
    expect(r.errors).toEqual([]);
    expect(r.g.combat.round > round || !!r.g.combat.over).toBe(true);
    expect(r.tally['combat/end-turn'][0]).toBeGreaterThan(3);
    if (r.g.phase !== 'combat') { r.must({ type: 'narrator/turn', turn: { narration: 'It is over.' } }); expect(r.errors).toEqual([]); expect(r.g.phase).toBe('story'); }
    expect(() => viewFor(r.g, 'host')).not.toThrow();
  }, 60_000);
  it('after a fight: the story goes on, the finished fight still reads as finished, and the next fight starts from the same ground', () => {
    const g0 = load('save-0.22-after-fight');
    expect(g0.phase).toBe('story'); expect(g0.combat.over).toBe('win');
    const summary = g0.combat.summary, name = g0.combat.name, round = g0.combat.round;
    const r = new Rec(g0, GUNS);
    r.must({ type: 'narrator/turn', turn: { narration: 'You catch your breath.' } });
    // what the screens and the Narrator read of a finished fight is still there after an action on the new engine
    expect(r.g.combat.over).toBe('win'); expect(r.g.combat.summary).toBe(summary); expect(r.g.combat.name).toBe(name); expect(r.g.combat.round).toBe(round);
    expect(Array.isArray(r.g.combat.units)).toBe(true); expect(Array.isArray(r.g.combat.log)).toBe(true);
    expect(() => viewFor(r.g, 'host')).not.toThrow();
    r.must({ type: 'story/speak', text: 'Onward.' });
    r.must({ type: 'narrator/turn', turn: { narration: 'More of them.' } });
    r.must(fightTurn(GUNS, ['minion', 'soldier', 'minion'], 'cover', 'The second fight'));
    expect(r.g.phase).toBe('combat');
    r.fight(8);
    expect(r.errors).toEqual([]);
    expect(r.tally['combat/attack'][0]).toBeGreaterThan(3);
  }, 60_000);
  it('a trivial action on an old save changes nothing but the version counter', () => {
    for (const name of ['save-0.22-mid-fight', 'save-0.22-after-fight']) {
      const g0 = load(name), g1 = apply(g0, { type: 'player/online', id: 'host', online: true }, 'host');
      expect(Object.keys(g1.characters)).toEqual(Object.keys(g0.characters));
      expect(g1.story.entries.length).toBe(g0.story.entries.length);
      expect(g1.rng).toEqual(g0.rng);
      expect(g1.v).toBe(g0.v + 1);
    }
  }, 60_000);
});
