// @ts-nocheck (pokes at whole states)
// WHAT apply() SHARES WITH THE STATE IT WAS GIVEN (game.ts, workingCopy): the campaign, the lines of the archive, and
// the campaign a Proving Ground parked in sandbox.saved. Everything else is copied. Two things must hold for each:
//   1. the result is exactly what a full deep copy would have given (the same JSON, the same key order), and
//   2. the state passed in is not changed by the action (the store keeps it for a reroll; React is drawing it).
// The suite's freeze (helpers/setup.ts) makes a write into a shared part throw; this file checks the outcome itself.
import { describe, expect, it } from 'vitest';
import { apply, newGame, BUILT_IN_CAMPAIGNS, _freezeShared } from '../src';
import { buildCharacter, BUILD } from './balance/builds';

const clone = (x: any) => JSON.parse(JSON.stringify(x));
function room(seed: string) {
  const g = newGame(seed, { id: 'host', name: 'Host' });
  ['opt_gun', 'tank'].forEach((b, i) => { const c = buildCharacter(b, 'normal', 6).c; c.id = 'c' + (i + 1); c.owner = 'host'; c.name = BUILD[b].label; g.characters[c.id] = c; });
  return g;
}
/** The same action on the state and on a deep copy of it: the result is the same JSON, and the state given is untouched. */
function sameAsDeepCopy(g: any, action: any, what: string) {
  const before = JSON.stringify(g), shared = apply(g, action, 'host'), copied = apply(clone(g), action, 'host');
  expect(JSON.stringify(g) === before, what + ': the state passed in was changed').toBe(true);
  expect(JSON.stringify(shared) === JSON.stringify(copied), what + ': not what a deep copy gives').toBe(true);
  return shared;
}

describe('the archive: its lines are shared between states, and the result is what a deep copy gives', () => {
  it('a story that runs past 400 lines: every action equals the deep-copy result, the earlier state is untouched, the archive only grows', () => {
    let g = room('SHARED-ARCHIVE');
    g = apply(g, { type: 'session/start' }, 'host');
    g = apply(g, { type: 'narrator/turn', turn: { narration: 'It begins.', sceneTitle: 'Archive' } }, 'host');
    const kept: any[] = [];
    for (let i = 0; i < 230; i++) {
      // every 10th pair of actions goes through the full check; the rest just play (the check is two applies and three stringifies)
      const step = (a: any) => { g = i % 10 === 0 || i > 220 ? sameAsDeepCopy(g, a, 'line ' + i) : apply(g, a, 'host'); };
      step({ type: 'story/speak', text: 'Line ' + i + ' from the party.' });
      step({ type: 'narrator/turn', turn: { narration: 'The Narrator answers line ' + i + '.' } });
      if (i === 215 || i === 225) kept.push([g, JSON.stringify(g)]);
    }
    expect(g.story.entries.length).toBeLessThanOrEqual(400);
    expect((g.archive || []).length, 'the story ran past the 400-line cap into the archive').toBeGreaterThan(20);
    // the two states kept from earlier hold what they held then, and share their lines with the last one
    for (const [old, json] of kept) { expect(JSON.stringify(old) === json).toBe(true); expect(old.archive.length).toBeLessThan(g.archive.length); expect(g.archive[0]).toBe(old.archive[0]); expect(g.archive).not.toBe(old.archive); }
    // a save and a load in the middle (JSON) gives the same game from there on
    const a = apply(clone(g), { type: 'story/speak', text: 'After the load.' }, 'host'), b = apply(g, { type: 'story/speak', text: 'After the load.' }, 'host');
    expect(JSON.stringify(a) === JSON.stringify(b)).toBe(true);
  }, 60_000);
});

describe('the Proving Ground over a custom campaign: the room\'s own campaign parked in sandbox.saved is shared, not copied on every action', () => {
  const start = () => {
    let g = room('SHARED-SANDBOX');
    g = apply(g, { type: 'campaign/load', campaign: { ...clone(BUILT_IN_CAMPAIGNS[0]), title: 'Mine' } }, 'host');
    const mine = JSON.stringify(g.campaign);
    return { g: apply(g, { type: 'sandbox/start' }, 'host'), mine };
  };
  it('a practice action keeps the same parked campaign object, in the same place among the keys', () => {
    const { g, mine } = start();
    expect(JSON.stringify(g.sandbox.saved.campaign)).toBe(mine);
    const next = sameAsDeepCopy(g, { type: 'sandbox/stage', wave: 2 }, 'sandbox/stage');
    expect(next.sandbox.saved.campaign, 'the parked campaign went through the copy').toBe(g.sandbox.saved.campaign);
    expect(Object.keys(next.sandbox.saved)).toEqual(Object.keys(g.sandbox.saved));
    expect(Object.keys(next.sandbox)).toEqual(Object.keys(g.sandbox));
    expect(Object.isFrozen(g.sandbox.saved.campaign), 'the suite freezes what is shared').toBe(true);
  });
  it('a whole practice session (a wave fought, objectives set, the session ended) equals the deep-copy result at every step, and the room gets its campaign back', () => {
    let { g, mine } = start();
    for (const a of [{ type: 'sandbox/stage', wave: 1 }, { type: 'sandbox/fight' }]) g = sameAsDeepCopy(g, a, a.type);
    for (let i = 0; i < 12 && g.phase === 'combat' && !g.combat.over; i++) g = sameAsDeepCopy(g, { type: 'combat/end-turn', unitId: g.combat.order[g.combat.turn] }, 'end-turn ' + i);
    if (g.phase === 'combat') g = sameAsDeepCopy(g, { type: 'sandbox/stop' }, 'sandbox/stop');
    const parked = g.sandbox.saved.campaign;
    g = sameAsDeepCopy(g, { type: 'sandbox/end' }, 'sandbox/end');
    expect(g.sandbox).toBeNull();
    expect(g.campaign).toBe(parked);
    expect(JSON.stringify(g.campaign)).toBe(mine);
    // and the room goes on from there: the session starts on the campaign it had
    g = sameAsDeepCopy(g, { type: 'session/start' }, 'session/start');
    expect(g.campaign.title).toBe('Mine');
  }, 60_000);
  it('with the freeze off too (the game as it ships): the same results', () => {
    const was = _freezeShared(false), glob = (globalThis as any).__PHC_FREEZE_SHARED; (globalThis as any).__PHC_FREEZE_SHARED = false;
    try {
      let { g, mine } = start();
      g = sameAsDeepCopy(g, { type: 'sandbox/stage', wave: 3 }, 'sandbox/stage');
      g = sameAsDeepCopy(g, { type: 'sandbox/end' }, 'sandbox/end');
      expect(JSON.stringify(g.campaign)).toBe(mine);
    } finally { _freezeShared(was); (globalThis as any).__PHC_FREEZE_SHARED = glob; }
  });
});
