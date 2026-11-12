// @ts-nocheck (drives the recording tool in helpers/replay.ts)
// THE REPLAY GUARD: whole seeded games with the enemy AI on, compared hash for hash with test/golden/replays.json.
//
// What it is for: a change that is meant to move NOTHING in play (performance work, a refactor, a cache). The golden
// damage tables cannot see a path tie broken differently, a reaction fired in another order, one more die rolled or
// an effect emitted earlier; this can. See helpers/replay.ts for what a replay holds and the list of scenarios.
//
//   npm run check                                   the default set (6 games), compared
//   REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash     the larger set too (20 games; before merging engine work)
//   REPLAY_RECORD=1 REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash     writes the fixture anew, ON PURPOSE ONLY
//   REPLAY_DUMP=<dir> npm test -w @phc/engine -- replay-hash     also writes each game's last state as <dir>/<name>.json
//                                                   (run it on the old code and the new, then diff the two files)
//
// WHEN IT FAILS. The message names the game and the first mark (every 25 actions) whose hash moved: the change began
// in the 25 actions before it. `stream` moved: something in play is different (an action refused, an effect, a log
// line, a die). Only `state` moved: play looked the same but the state holds something else (a field added, dropped
// or reordered). Then decide:
//   1. The change was meant to move nothing: it is a bug in the change. Fix the change. Do NOT record.
//   2. A rule, a number, a policy of the simulator or the saved shape was changed on purpose: record on purpose (the
//      line above, always with REPLAY_FULL=1 so both sets are written) and say in the commit what moved and why.
import { describe, expect, it } from 'vitest';
import { readFileSync, writeFileSync, existsSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { SCENARIOS, type Replay } from './helpers/replay';

const FILE = fileURLToPath(new URL('./golden/replays.json', import.meta.url));
const RECORD = process.env.REPLAY_RECORD === '1', FULL = process.env.REPLAY_FULL === '1' || RECORD, DUMP = process.env.REPLAY_DUMP || '';
const want: Record<string, Replay> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
const got: Record<string, Replay> = {};
const tally: Record<string, number> = {}; let maxFoes = 0; // what the default set really sent and was allowed (the coverage test)

function compare(name: string, now: Replay) {
  const was = want[name];
  if (!was) expect.fail('replay "' + name + '" is not in test/golden/replays.json (a new scenario: record on purpose, see the top of this file)');
  if (was.state === now.state && was.stream === now.stream && was.actions === now.actions) return;
  const i = now.marks.findIndex((m, k) => !was.marks[k] || was.marks[k][1] !== m[1] || was.marks[k][2] !== m[2]);
  const at = i >= 0 ? now.marks[i] : null, wm = i >= 0 ? was.marks[i] : null;
  expect.fail('replay "' + name + '" no longer plays as recorded.\n'
    + '  actions: was ' + was.actions + ', now ' + now.actions + '\n'
    + '  stream ' + (was.stream === now.stream ? 'the same' : 'MOVED') + ', final state ' + (was.state === now.state ? 'the same' : 'MOVED') + '\n'
    + (at ? '  first mark that differs: action ' + at[0] + ' (' + (wm && wm[2] !== at[2] ? 'the stream' : 'only the state') + '): the change began in actions ' + (at[0] - 24) + ' to ' + at[0] + '\n' : '  every mark agrees: the change is after action ' + (now.marks.length ? now.marks[now.marks.length - 1][0] : 0) + '\n')
    + '  If nothing was meant to change, this is a bug in the change. If a rule, a number or the saved shape was changed on purpose:\n'
    + '  REPLAY_RECORD=1 REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash   (and say what moved in the commit)');
}

describe('whole-game replays (enemy AI on) play exactly as recorded', () => {
  for (const s of SCENARIOS) {
    if (s.full && !FULL) continue;
    it(s.name, () => {
      const r = s.run(), now = r.done(); got[s.name] = now;
      if (!s.full) { maxFoes = Math.max(maxFoes, r.maxFoes); for (const [k, v] of Object.entries(r.tally)) tally[k] = (tally[k] || 0) + v[0]; }
      expect(r.errors, 'the scenario itself was refused').toEqual([]);
      expect(now.actions).toBeGreaterThan(10);
      if (DUMP) { mkdirSync(DUMP, { recursive: true }); writeFileSync(DUMP + '/' + s.name + '.json', JSON.stringify(r.g, null, 1)); }
      if (!RECORD) compare(s.name, now);
    }, 120_000);
  }
  it('the default set plays what it says it plays', () => {
    // Accepted actions of each kind over the default set. A policy that stops casting, praying or moving would leave the
    // hashes "stable" while proving nothing: this fails first.
    for (const k of ['combat/move', 'combat/attack', 'combat/technique', 'combat/draw', 'combat/evoke', 'combat/outburst', 'combat/pump', 'combat/release', 'combat/pray', 'combat/call', 'combat/reload',
      'sandbox/spawn', 'sandbox/wave', 'story/move', 'world/act', 'rest']) expect(tally[k] || 0, k).toBeGreaterThan(0);
    expect(tally['combat/move']).toBeGreaterThan(30);
    expect(maxFoes).toBe(10); // 4 v 10 in the Proving Ground
  });
  it('a save and a load in the middle changes nothing: serialised, parsed and continued, the same hashes', () => {
    // twice in each of two games (a story fight with casters; the Proving Ground across a change of wave)
    for (const name of ['cover-4v7-casters', 'proving-waves']) {
      const s = SCENARIOS.find((x) => x.name === name)!, plain = got[name] || s.run().done(), re = s.run([7, 40, 90]).done();
      expect(re, name).toEqual(plain);
    }
  }, 120_000);
  it('the fixture holds every scenario and nothing else', () => {
    if (RECORD) {
      writeFileSync(FILE, '{\n' + SCENARIOS.map((s) => JSON.stringify(s.name) + ': ' + JSON.stringify(got[s.name])).join(',\n') + '\n}\n');
      console.log('REPLAY_RECORD: wrote test/golden/replays.json (' + SCENARIOS.length + ' games)');
      return;
    }
    expect(Object.keys(want).sort()).toEqual(SCENARIOS.map((s) => s.name).sort());
  });
});
