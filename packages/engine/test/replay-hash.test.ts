// @ts-nocheck (drives the recording tool in helpers/replay.ts)
// THE REPLAY GUARD: whole seeded games with the enemy AI on, compared hash for hash with test/golden/replays.json.
//
// What it is for: a change that is meant to move NOTHING in play (performance work, a refactor, a cache). The golden
// damage tables cannot see a path tie broken differently, a reaction fired in another order, one more die rolled or
// an effect emitted earlier; this can. See helpers/replay.ts for what a replay holds and the list of scenarios.
//
//   npm run check                                   the default set (8 games), compared
//   REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash     the larger set too (24 games; before merging engine work)
//   REPLAY_COVER=1 npm test -w @phc/engine -- replay-hash    also prints what each game really played (effects, log
//                                                   lines, actions sent with a unit Hidden or a door open…)
//   REPLAY_RECORD=1 REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash     writes the fixture anew, ON PURPOSE ONLY
//   REPLAY_DUMP=<dir> npm test -w @phc/engine -- replay-hash     also writes each game's last state as <dir>/<name>.json
//                                                   (run it on the old code and the new, then diff the two files)
//
// WHAT IT DOES NOT PIN, AND WHAT DOES (found by mutation, 12 Nov 2026):
//   - the order of two equal paths: a subtle change of the tie-break moves one or two games here, and only their stream.
//     The pin for paths() is test/paths-order.test.ts (the plain search as the oracle, on 300 grounds).
//   - who is sighted on any ground: test/sight-order.test.ts (visibility() as the oracle, on 400 grounds).
//   - which hand an Answer is called with after a reaction changed what a unit holds: test/phys-dispatch-answers.test.ts.
//   - what a preview leaves behind: the policies read a COPY of the game (helpers/replay.ts), so these hashes are what
//     apply() did; the test "what the policies read…" below holds reads to "empty bags and nothing else".
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
import { SCENARIOS, withoutPs, type Replay } from './helpers/replay';

const FILE = fileURLToPath(new URL('./golden/replays.json', import.meta.url));
const RECORD = process.env.REPLAY_RECORD === '1', FULL = process.env.REPLAY_FULL === '1' || RECORD, DUMP = process.env.REPLAY_DUMP || '', COVER = process.env.REPLAY_COVER === '1';
const want: Record<string, Replay> = existsSync(FILE) ? JSON.parse(readFileSync(FILE, 'utf8')) : {};
const got: Record<string, Replay> = {}, last: Record<string, any> = {}; // each game's result, and its last state (for the tests that play a game again another way)
const tally: Record<string, number> = {}; let maxFoes = 0; // what the default set really sent and was allowed (the coverage test)
// per default game: the effects emitted by kind, the log lines by LOG_MARKS, the actions sent in a given situation
const played: Record<string, { kinds: Record<string, number>; lines: Record<string, number>; during: Record<string, number> }> = {};
/** In how many default games something happened at least `min` times, and how often in all. */
const games = (of: 'kinds' | 'lines' | 'during', k: string, min = 1) => Object.values(played).filter((p) => (p[of][k] || 0) >= min).length;
const total = (of: 'kinds' | 'lines' | 'during', k: string) => Object.values(played).reduce((n, p) => n + (p[of][k] || 0), 0);

function compare(name: string, now: Replay) {
  const was = want[name];
  if (!was) expect.fail('replay "' + name + '" is not in test/golden/replays.json (a new scenario: record on purpose, see the top of this file)');
  // the marks are compared too: a state that differs in the middle of a game and comes back together by its end (a
  // fight's own fields are gone once the Proving Ground closes) is still a game that played differently
  if (was.state === now.state && was.stream === now.stream && was.actions === now.actions && JSON.stringify(was.marks) === JSON.stringify(now.marks)) return;
  const i = now.marks.findIndex((m, k) => !was.marks[k] || was.marks[k][1] !== m[1] || was.marks[k][2] !== m[2]);
  const at = i >= 0 ? now.marks[i] : null, wm = i >= 0 ? was.marks[i] : null;
  expect.fail('replay "' + name + '" no longer plays as recorded.\n'
    + '  actions: was ' + was.actions + ', now ' + now.actions + '\n'
    + '  stream ' + (was.stream === now.stream ? 'the same' : 'MOVED') + ', final state ' + (was.state === now.state ? 'the same' : 'MOVED') + (was.state === now.state && was.stream === now.stream ? ' (the state differed on the way and came back together)' : '') + '\n'
    + (at ? '  first mark that differs: action ' + at[0] + ' (' + (wm && wm[2] !== at[2] ? 'the stream' : 'only the state') + '): the change began in actions ' + (at[0] - 24) + ' to ' + at[0] + '\n' : '  every mark agrees: the change is after action ' + (now.marks.length ? now.marks[now.marks.length - 1][0] : 0) + '\n')
    + '  If nothing was meant to change, this is a bug in the change. If a rule, a number or the saved shape was changed on purpose:\n'
    + '  REPLAY_RECORD=1 REPLAY_FULL=1 npm test -w @phc/engine -- replay-hash   (and say what moved in the commit)');
}

describe('whole-game replays (enemy AI on) play exactly as recorded', () => {
  for (const s of SCENARIOS) {
    if (s.full && !FULL) continue;
    it(s.name, () => {
      const r = s.run(), now = r.done(); got[s.name] = now; last[s.name] = r.g;
      if (!s.full) { maxFoes = Math.max(maxFoes, r.maxFoes); for (const [k, v] of Object.entries(r.tally)) tally[k] = (tally[k] || 0) + v[0]; played[s.name] = { kinds: r.kinds, lines: r.lines, during: r.during }; }
      if (COVER) console.log(s.name + ' (' + now.actions + ' actions)\n  lines ' + JSON.stringify(r.lines) + '\n  during ' + JSON.stringify(r.during) + '\n  effects ' + JSON.stringify(r.kinds));
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
  it('the default set really plays sight, doors, hiding, held shots, hazards and reactions (not just a map that has them)', () => {
    // A map with doors on it proves nothing if no door is ever opened. Each line below is something a mutation of the
    // sight or reaction code slipped past before it was driven (the review of 12 Nov 2026). If a rule change makes one
    // of these stop happening, change the scripted games in helpers/replay.ts until it happens again; do not lower it.
    for (const k of ['combat/door', 'combat/hide', 'combat/overwatch', 'sandbox/hazard']) expect(tally[k] || 0, k + ' accepted').toBeGreaterThan(0);
    // effects: a door opened, a held shot set and sprung (the technique's Watch and the older stance), a hazard crossed,
    // units coming into and going out of sight
    for (const k of ['door', 'watch_set', 'overwatch', 'hazard', 'sight', 'stance', 'guard']) expect(total('kinds', k), 'effect ' + k).toBeGreaterThan(0);
    expect(total('kinds', 'sight'), 'sight events').toBeGreaterThan(15);
    // actions sent while a living unit was Hidden, held a Watch, with a door open, with a living hostile not yet sighted;
    // and hostiles that were first sighted after the fight began (through the opened door, round a wall)
    expect(total('during', 'hiddenPc'), 'actions with a player\'s unit Hidden').toBeGreaterThan(20);
    expect(total('during', 'watch'), 'actions with a Watch held').toBeGreaterThan(5);
    expect(total('during', 'doorOpen'), 'actions with a door open').toBeGreaterThan(20);
    expect(total('during', 'unsighted'), 'actions with a living hostile nobody has seen yet').toBeGreaterThan(20);
    expect(total('during', 'sightedLate'), 'hostiles first sighted after the fight began').toBeGreaterThan(2);
    // reactions: the enemies' opportunity attacks and the squad's Answers, in more than one game each
    expect(total('lines', 'opportunity'), '"takes an opportunity attack" lines').toBeGreaterThan(5);
    expect(games('lines', 'opportunity'), 'games with an opportunity attack').toBeGreaterThanOrEqual(2);
    expect(total('lines', 'answer'), '"answers with" lines').toBeGreaterThan(15);
    expect(games('lines', 'answer', 3), 'games with three Answers or more').toBeGreaterThanOrEqual(2);
    expect(total('lines', 'hides'), 'units that went to ground').toBeGreaterThan(1);
  });
  it('what the policies read changes only the items\' bags, never the recorded game, and never the play', () => {
    // Reading a preview creates an item's bag on the unit it read, and some items fill theirs on a read (effects/index.ts
    // stateOf; see the top of helpers/replay.ts). That is why a policy is handed a copy. This holds the rest, on two
    // whole games:
    //   1. after every read, the policy's copy differs from the recorded game under `ps` and nowhere else, and the
    //      recorded game not at all;
    //   2. the same game with the policies reading the recorded game itself (what a screen does to the host's state)
    //      plays the same stream, action for action, and ends in the same state outside `ps`.
    // If 1 fails, a preview WROTE a rule's state: a bug in the preview. If 2 fails, what was previewed changed what
    // happened: a bug in the item whose bag it is (the message names the first mark that differs).
    let reads = 0, bags = 0, moved = 0;
    for (const name of ['cover-4v7-casters', 'proving-doors-hiding-watches']) {
      const s = SCENARIOS.find((x) => x.name === name)!; if (!got[name]) { const r0 = s.run(); got[name] = r0.done(); last[name] = r0.g; }
      const plain = got[name], plainG = last[name];
      const checked = s.run([], 'check'); expect(checked.errors, name).toEqual([]); expect(checked.done(), name + ': checking the reads changed the game').toEqual(plain);
      reads += checked.reads; bags += checked.bagsMade;
      const inPlace = s.run([], 'in-place'), ip = inPlace.done();
      expect(inPlace.errors, name).toEqual([]);
      expect([ip.actions, ip.stream, ip.marks.map((m) => m[2])], name + ': reading the game in place changed the play').toEqual([plain.actions, plain.stream, plain.marks.map((m) => m[2])]);
      expect(withoutPs(inPlace.g) === withoutPs(plainG), name + ': reading the game in place changed the state outside the items\' bags').toBe(true);
      if (ip.state !== plain.state) moved++;
    }
    expect(reads).toBeGreaterThan(100);
    // if both are 0 the engine no longer writes on a read: say so in helpers/replay.ts and hand the policies the game itself again
    expect(bags + moved, 'reads that left a bag behind').toBeGreaterThan(0);
  }, 240_000);
  it('a save and a load in the middle changes nothing: serialised, parsed and continued, the same hashes', () => {
    // three times in each of three games (a story fight with casters; the Proving Ground across a change of wave; the
    // sight game: with a unit Hidden, a Watch held, a door open)
    for (const name of ['cover-4v7-casters', 'proving-waves', 'proving-doors-hiding-watches']) {
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
