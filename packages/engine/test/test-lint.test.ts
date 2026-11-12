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
/** The line with every string literal blanked, so a // inside a string or a URL is not read as a comment. */
const noStrings = (l: string) => l.replace(/'(?:\\.|[^'\\])*'|"(?:\\.|[^"\\])*"|`(?:\\.|[^`\\])*`/g, (m) => 'S'.repeat(m.length));
/** The text of a trailing comment on a line that also holds code, or null. */
export function trailingComment(line: string): string | null {
  const s = noStrings(line), m = /(?<![:\\])\/\//.exec(s);
  return !m || !s.slice(0, m.index).trim() ? null : line.slice(m.index + 2);
}
/** A trailing comment that holds a statement: an expect( anywhere in it, or a call "name(...);" at its end. */
export const swallows = (line: string) => { const c = trailingComment(line); return c != null && (/\bexpect\s*\(/.test(c) || /[\w.\]]\((?:[^()]|\([^()]*\))*\)\s*;\s*$/.test(c)); };
const DATED = /\b\d{1,2} (Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\w* 20\d\d\b|\b20\d\d-\d\d-\d\d\b/;
const SHELVED = /\b(it|test|describe)\.(skip|todo|only)\s*\(/;

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
        if (!DATED.test(c)) hits.push(relative(ROOT, f) + ':' + (i + 1));
      });
    }
    expect(hits).toEqual([]);
  });
});
