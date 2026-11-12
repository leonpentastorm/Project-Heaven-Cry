// @ts-nocheck (reads source files with node:fs, as test/golden/compare.ts does; the engine tsconfig has no node types)
// A lint over every test file in the repo (engine, web, server, the browser suites). Two shapes are refused:
//
// 1. A statement after a // comment on the same line. The house style puts several statements on one line; a comment
//    added in the middle of such a line turns everything after it into comment text, and the suite stays green. Eight
//    assertions were dead this way on 12 Nov 2026 (docs/design/handoffs/text-number-truth.md). Put the comment at the
//    END of the line, or the next statement on its own line.
// 2. it.skip( / describe.skip( / test.skip( / .todo( / .only( with no dated reason. A shelved test needs a comment on
//    its own line or the line above that holds a date ("12 Nov 2026" or "2026-11-12") and says why. A switch is not a
//    shelved test and needs none: (FLAG ? it : it.skip)(...) and it.skipIf(cond)(...).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync, existsSync } from 'node:fs';
import { join, relative } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');
const DIRS = ['packages/engine/test', 'apps/web/src', 'apps/web/e2e', 'apps/server/src', 'apps/server/test'];
const isTest = (p: string) => /\.test\.(ts|tsx|js|mjs)$/.test(p) || /[\\/](test|e2e)[\\/].*\.(ts|tsx|js|mjs)$/.test(p);
const walk = (dir: string): string[] => (!existsSync(dir) ? [] : readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return f === 'node_modules' ? [] : statSync(p).isDirectory() ? walk(p) : isTest(p) ? [p] : [];
}));
const FILES = DIRS.flatMap((d) => walk(join(ROOT, d)));
/** The line with every string and regex literal blanked, so a // inside a string or a URL, or a quote inside a regex,
 * is not read as a comment or as the start of a string. A small scanner: a "/" opens a regex only where a value may
 * start (after an operator, an opening bracket, a comma, or at the start of the line). */
export function noStrings(l: string): string {
  let out = '', i = 0, prev = '';
  while (i < l.length) {
    const c = l[i];
    if (c === '/' && l[i + 1] === '/') { out += l.slice(i); break; }
    if (c === "'" || c === '"' || c === '`' || (c === '/' && l[i + 1] !== '*' && (prev === '' || '(,=:[!&|?{};+-*%<>~^'.includes(prev)))) {
      let j = i + 1, cls = false;
      for (; j < l.length; j++) {
        if (l[j] === '\\') { j++; continue; }
        if (c === '/') { if (l[j] === '[') cls = true; else if (l[j] === ']') cls = false; else if (l[j] === '/' && !cls) break; } else if (l[j] === c) break;
      }
      if (j >= l.length && c === '/') { out += c; prev = c; i++; continue; } // not a regex after all (a division)
      out += 'S'.repeat(Math.min(j, l.length - 1) - i + 1); i = j + 1; prev = 'S'; continue;
    }
    out += c; if (c.trim()) prev = c; i++;
  }
  return out;
}
/** The text of a trailing comment on a line that also holds code, or null. */
export function trailingComment(line: string): string | null {
  const s = noStrings(line), m = /(?<![:\\])\/\//.exec(s);
  return !m || !s.slice(0, m.index).trim() ? null : line.slice(m.index + 2);
}
/** A trailing comment that holds a statement. Any of: an expect( or an assert anywhere in it; an await; a call
 * "name(...);" at its end, or with no semicolon when words come before it (a lone formula, "// floor(x / 2)", is a note); an assignment or an increment that ends in a semicolon; a
 * semicolon followed by something that starts a statement ("; u.ap = 0", "; f.cb.round++", "; go(x)"). */
export const swallows = (line: string) => {
  const c = trailingComment(line); if (c == null) return false;
  return /\bexpect\s*\(/.test(c) || /\bassert(\.\w+)?\s*\(/.test(c) || /\bawait\s+[\w$.]+\s*[.(]/.test(c)
    || /[\w$\]]\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)\s*;\s*$/.test(c) || /[A-Za-z,:]\s+[\w$.]*[\w$\]]\((?:[^()]|\((?:[^()]|\([^()]*\))*\))*\)\s*$/.test(c)
    || /[\w$.\]]+\s*(\+\+|--)\s*;/.test(c) || /(^|[\s;])[\w$.[\]]+\s*[-+*/]?=\s*[^=;][^;]*;\s*$/.test(c)
    || /;\s*[\w$.[\]]+\s*(\+\+|--|[-+*/]?=[^=]|\()/.test(c);
};
const DATED = /\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* 20\d\d\b|\b20\d\d-\d\d-\d\d\b/;
/** A shelved test, in every spelling vitest has: it.skip( / .todo( / .only( / .fails(, with modifiers between
 * (it.concurrent.skip(, it.skip.each(), xit( / xdescribe( / xtest(, a switch whose condition is a literal
 * ((false ? it : it.skip)(), and runIf(false) / skipIf(true). A real switch is not one: (FULL ? it : it.skip)(. */
export const shelved = (code: string) => /\b(it|test|describe)(\.\w+)*\.(skip|todo|only|fails)\s*[.(]/.test(code) || /\bx(it|test|describe)\s*\(/.test(code)
  || /\(\s*(false|true|0|1)\s*\?\s*(it|test|describe)\b/.test(code) || /\.runIf\(\s*(false|0)\s*\)|\.skipIf\(\s*(true|1)\s*\)/.test(code);
const SHELVED = { test: shelved };
/** A dated reason: a date, and at least three more words that say why. */
const reasoned = (c: string) => DATED.test(c) && c.replace(DATED, ' ').split(/\s+/).filter((w) => /[A-Za-z]{2,}/.test(w)).length >= 3;

describe('test lint', () => {
  it('finds the test files', () => {
    expect(FILES.length).toBeGreaterThan(100);
  });
  it('the two shapes are recognised (the lint tests itself)', () => {
    expect(swallows('expect(a).toBe(1); // the first expect(b).toBe(2);')).toBe(true);
    expect(swallows('const x = 1; // set up order(f, d, foe);')).toBe(true);
    expect(swallows('expect(a).toBe(1); // a note at the end (rules 1.19)')).toBe(false);
    expect(swallows('// a whole-line comment about expect(x)')).toBe(false);
    expect(swallows('a.pos = 1; // 2 from the holder (behind the wall); 4 from the mate (sight 2)')).toBe(false);
    expect(swallows("go('http://host/x'); expect(a).toBe(1);")).toBe(false);
    expect(SHELVED.test("it.skip('x', () => {})")).toBe(true);
    expect(SHELVED.test("(FULL ? it : it.skip)('x', () => {})")).toBe(false);
    expect(SHELVED.test("it.skipIf(!on)('x', () => {})")).toBe(false);
    // the shapes the first lint let through (the review of 12 Nov 2026)
    expect(swallows('u.hp = 5; // wounded f.cb.round++; u.ap = 0;')).toBe(true);
    expect(swallows('const a = 1; // set up act(f, u, {...})')).toBe(true);
    expect(swallows('x(); // then await page.click(sel); assert.ok(v)')).toBe(true);
    expect(swallows("expect(a).toMatch(/it's/); // note expect(b).toBe(2); x('y');")).toBe(true);
    expect(swallows('const r = a / b; // half of it (rounded down)')).toBe(false);
    expect(swallows('expect(v).toMatch(/range 6/); // floor(Rumination 2 / 2)')).toBe(false);
    expect(swallows('at(f, u, tile); // next to the wall; the foe is 2 tiles off')).toBe(false);
    for (const t of ["it.skip.each([1])('x', () => {})", "it.concurrent.skip('x', () => {})", "xit('x', () => {})", "xdescribe('x', () => {})", "it.fails('x', () => {})", "it.runIf(false)('x', () => {})", "(false ? it : it.skip)('x', () => {})"]) expect(SHELVED.test(t), t).toBe(true);
    expect(reasoned('12 Nov 2026')).toBe(false); expect(reasoned('12 Nov 2026: waits for the height rule')).toBe(true);
  });
  it('no statement after a // comment on the same line (a dead assertion)', () => {
    const hits: string[] = [];
    for (const f of FILES) {
      if (f === __filename) continue;
      readFileSync(f, 'utf8').split('\n').forEach((l, i) => { if (swallows(l)) hits.push(relative(ROOT, f) + ':' + (i + 1)); });
    }
    expect(hits).toEqual([]);
  });
  it('no skipped, todo or only test without a dated reason', () => {
    const hits: string[] = [];
    for (const f of FILES) {
      if (f === __filename) continue;
      const lines = readFileSync(f, 'utf8').split('\n');
      lines.forEach((l, i) => {
        if (!SHELVED.test(noStrings(l))) return;
        const c = (trailingComment(l) || '') + ' ' + (/^\s*\/\//.test(lines[i - 1] || '') ? lines[i - 1] : '');
        if (!reasoned(c)) hits.push(relative(ROOT, f) + ':' + (i + 1));
      });
    }
    expect(hits).toEqual([]);
  });
});
