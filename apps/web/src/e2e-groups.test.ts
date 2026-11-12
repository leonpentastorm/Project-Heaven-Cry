// The browser suites' estate (apps/web/e2e), held to its rules without a browser, so `npm run check` says so the moment
// one is broken (docs/TESTING.md, "The browser suites"; apps/web/e2e/README.md, "A suite that does not flake"):
//   1. every suite is in a group (`rules` or `anim` in apps/web/e2e/groups.json): a suite nobody runs rots;
//   2. every suite prints named checks, and has an entry in the README;
//   3. no suite sleeps on this script's clock (page.waitForTimeout): the count is 0 and stays 0;
//   4. a wait that fails when its time runs out is given at least 30 s (a shorter one is a wall-clock assertion in
//      disguise, and fails on a busy machine).
import { describe, expect, it } from 'vitest';
import { readdirSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const DIR = fileURLToPath(new URL('../e2e/', import.meta.url));
const G = JSON.parse(readFileSync(DIR + 'groups.json', 'utf8')) as { smoke: string[]; rules: string[]; anim: string[] };
const SUITES = readdirSync(DIR).filter((f) => f.endsWith('.mjs') && f !== 'lib.mjs').map((f) => f.slice(0, -4)).sort();
const src = (n: string) => readFileSync(DIR + n + '.mjs', 'utf8');
const README = readFileSync(DIR + 'README.md', 'utf8');

describe('the browser suites (apps/web/e2e)', () => {
  it('every suite is in exactly one of the groups rules / anim, and every name in a group is a suite', () => {
    const inNone = SUITES.filter((n) => !G.rules.includes(n) && !G.anim.includes(n));
    expect(inNone, 'in no group: add each to "rules" or "anim" in apps/web/e2e/groups.json, or delete it').toEqual([]);
    expect(G.rules.filter((n) => G.anim.includes(n)), 'in both rules and anim').toEqual([]);
    expect([...G.rules, ...G.anim, ...G.smoke].filter((n) => !SUITES.includes(n)), 'named in a group, and there is no such file').toEqual([]);
    expect(new Set([...G.rules, ...G.anim]).size).toBe(G.rules.length + G.anim.length);
  });
  it('smoke is small, and made of suites that are in a group', () => {
    expect(G.smoke.length).toBeGreaterThan(0);
    expect(G.smoke.length).toBeLessThanOrEqual(6);
    expect(G.smoke.filter((n) => !G.rules.includes(n) && !G.anim.includes(n))).toEqual([]);
  });
  it('every suite prints named checks (a green line must mean something was looked at)', () => {
    // (a printer of 'ok   ' / 'FAIL ' lines, and at least three calls to it)
    const none = SUITES.filter((n) => !/\? 'ok +' : 'FAIL +'/.test(src(n)) || (src(n).match(/\b(ok|check)\(/g) || []).length < 3);
    expect(none, 'these print no "ok   <label>" line').toEqual([]);
  });
  it('every suite has an entry in apps/web/e2e/README.md', () => {
    expect(SUITES.filter((n) => !README.includes('`' + n + '.mjs`')), 'no README entry').toEqual([]);
  });
  it('no suite sleeps on the script\'s clock: page.waitForTimeout is not used (lib.mjs settle, pause, until, fxIdle)', () => {
    const sleepers = [...SUITES, 'lib'].map((n) => [n, (src(n).match(/\.waitForTimeout\(/g) || []).length] as const).filter(([, c]) => c > 0);
    expect(sleepers, 'use until() for a state, settle() after a click, pause() inside an animation').toEqual([]);
  });
  it('a wait that fails when its time runs out has at least 30 s (an optional wait, followed by .catch, may be shorter)', () => {
    const short: string[] = [];
    for (const n of SUITES) {
      const s = src(n);
      for (const m of s.matchAll(/timeout: (\d+) \}\)/g)) {
        if (Number(m[1]) < 30000 && !s.slice(m.index! + m[0].length, m.index! + m[0].length + 7).startsWith('.catch(')) short.push(n + ': timeout ' + m[1]);
      }
    }
    expect(short).toEqual([]);
  });
});
