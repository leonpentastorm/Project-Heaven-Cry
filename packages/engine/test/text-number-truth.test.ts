// @ts-nocheck (reads source files with node:fs, as test/golden/compare.ts does; the engine tsconfig has no node types)
// Text and number truth (docs/design/handoffs/text-number-truth.md): what the engine prints must name a rule the
// way the data names it today. These are the engine-side checks; the data-side guard is tools/validate.py.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';
import classesJ from '../../../data/classes.json';
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
  // The old name of a renamed skill is its id in title case (proficiency -> Proficiency), so the table builds itself:
  // a skill renamed tomorrow is guarded the same day. A word that is also plain English is checked only next to a
  // number or a check ("Analysis 3", "Sensory check"), where it can only be the skill.
  const OLD: Record<string, string> = Object.fromEntries(Object.values(SKILL as any).map((k: any) => [k.id.split('_').map((w: string) => w[0].toUpperCase() + w.slice(1)).join(' '), k.id]).filter(([old, id]: any) => (SKILL as any)[id].name !== old));
  const PLAIN = ['Analysis', 'Sensory', 'Implication'];
  const typed = (old: string, line: string) => new RegExp(PLAIN.includes(old) ? '\\b' + old + '\\s+(\\d|check|roll|modifier|points?)\\b' : '\\b' + old + '\\b').test(line);
  it('the table of old names builds itself from data', () => {
    expect(Object.keys(OLD).sort()).toEqual(['Analysis', 'Implication', 'Proficiency', 'Sensory', 'Vigilant']);
  });
  it('the renamed skills carry their new names in data', () => {
    expect(SKILL.proficiency.name).toBe('Improvisation');
    expect(SKILL.vigilant.name).toBe('Vigilance');
  });
  it('no engine string types a renamed skill\'s old name (read SKILL.<id>.name)', () => {
    const hits: string[] = [];
    // the engine, the client (not its tests) and the engine's balance tools that print documents
    const WEB = join(__dirname, '..', '..', '..', 'apps', 'web', 'src');
    const srcs = [...files(SRC), ...files(WEB).filter((f) => !/\.test\.ts$/.test(f)), join(__dirname, 'balance', 'price-list.test.ts')];
    for (const f of srcs) readFileSync(f, 'utf8').split('\n').forEach((l, i) => {
      for (const old of Object.keys(OLD)) if (typed(old, code(l))) hits.push(f.slice(f.indexOf('/packages/') >= 0 ? f.indexOf('/packages/') + 1 : f.indexOf('/apps/') + 1) + ':' + (i + 1) + ' ' + old);
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
    // and the engine reads those gates from classes.json (not a fallback): the wiki is compared with the data itself
    const lv = (classesJ as any).assignment.rank_levels;
    expect([RANK_LEVEL.II, RANK_LEVEL.III]).toEqual([lv.II, lv.III]); expect(lv.II).toBeGreaterThan(1);
    for (const c of CLASSES as any[]) expect([c.ranks.II.threshold, c.ranks.III.threshold]).toEqual([RANK_ATTR.II, RANK_ATTR.III]);
  });
});
