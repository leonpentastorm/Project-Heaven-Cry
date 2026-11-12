// @ts-nocheck (reads source files with node:fs, as test/golden/compare.ts does; the engine tsconfig has no node types)
// Text and number truth (docs/design/handoffs/text-number-truth.md): what the engine prints must name a rule the
// way the data names it today. These are the engine-side checks; the data-side guard is tools/validate.py.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { SKILL, CLASSES, ATTR, RANK_ATTR, RANK_LEVEL, wikiLookup } from '../src';

const SRC = join(__dirname, '..', 'src');
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => {
  const p = join(dir, f);
  return statSync(p).isDirectory() ? files(p) : /\.ts$/.test(f) ? [p] : [];
});
/** A source line with its comments taken off (a whole-line comment, a block comment's body, a trailing // note). */
const code = (line: string) => (/^\s*(\/\/|\*|\/\*)/.test(line) ? '' : line.replace(/\s\/\/ .*$/, ''));

describe('the engine names a skill by its name in data', () => {
  // Rules 1.13 renamed these skills; the id stayed. A string that types the old name is wrong on the player's screen.
  const OLD: Record<string, string> = { Proficiency: 'proficiency', Vigilant: 'vigilant' };
  it('the renamed skills carry their new names in data', () => {
    expect(SKILL.proficiency.name).toBe('Improvisation');
    expect(SKILL.vigilant.name).toBe('Vigilance');
  });
  it('no engine string types a renamed skill\'s old name (read SKILL.<id>.name)', () => {
    const hits: string[] = [];
    for (const f of files(SRC)) readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      for (const old of Object.keys(OLD)) if (new RegExp('\\b' + old + '\\b').test(code(l)) && SKILL[OLD[old]].name !== old) hits.push(f.slice(SRC.length + 1) + ':' + (i + 1) + ' ' + old);
    });
    expect(hits).toEqual([]);
  });
});

describe('the wiki states a class rank the way the engine reads it', () => {
  it('every base class entry names the attribute and the level of ranks II and III', () => {
    for (const c of CLASSES as any[]) {
      const t = wikiLookup('class:' + c.id)!.text, a = ATTR[c.attribute].name;
      expect(t).toContain('rank II at ' + a + ' ' + RANK_ATTR.II + ' and level ' + RANK_LEVEL.II);
      expect(t).toContain('rank III at ' + RANK_ATTR.III + ' and level ' + RANK_LEVEL.III);
    }
  });
});
