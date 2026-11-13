// @ts-nocheck (runs tools/validate.py on a copy of data/: node's fs and child_process)
// Classes 3.0 step 1a: the validator accepts the new words of the closed lists and refuses their misuse. A copy of
// data/ gets one test perk whose effects use each new word wrongly (and one that uses each rightly); the validator's
// errors must name every wrong one and none of the right ones.
import { describe, it, expect } from 'vitest';
import { cpSync, mkdtempSync, readFileSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { execFileSync } from 'node:child_process';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
function validateWith(perks: any[]): string {
  const dir = mkdtempSync(join(tmpdir(), 'phc-validate-')), data = join(dir, 'data');
  try {
    cpSync(join(ROOT, 'data'), data, { recursive: true });
    const p = JSON.parse(readFileSync(join(data, 'perks.json'), 'utf8')); p.items.push(...perks); writeFileSync(join(data, 'perks.json'), JSON.stringify(p));
    try { return execFileSync('python3', [join(ROOT, 'tools/validate.py'), data], { encoding: 'utf8', cwd: ROOT }); } catch (e: any) { return String(e.stdout || '') + String(e.stderr || ''); }
  } finally { rmSync(dir, { recursive: true, force: true }); }
}
const perk = (id: string, effects: any[]) => ({ id, name: id, skills: ['raw_power'], tier: 'mastered', text: 'test', adjudication: 'engine', effects });

/** Each case: an effect that uses a new word wrongly, and what the validator must say. */
export const BAD: [string, any, RegExp][] = [
  ['by_cover word', { op: 'mark', when: 'moved', flag: 'x', if: { by_cover: ['middle'] } }, /if\.by_cover` takes only/],
  ['patron id', { op: 'mark', when: 'hit', flag: 'x', if: { patron: ['nobody_at_all'] } }, /if\.patron` takes only/],
  ['deal via', { op: 'deal', when: 'hit', amount: { kind: 'damage', base: 1 }, via: 3 }, /deal's `via`/],
  ['deal nonlethal', { op: 'deal', when: 'hit', amount: { kind: 'damage', base: 1 }, nonlethal: 'yes' }, /deal's `nonlethal`/],
  ['resource word', { op: 'resource', when: 'hit', resource: 'guard', value: 'everything' }, /needs a numeric value|must be a number/],
  ['number block of a plain name', { op: 'damage_mult', when: 'dealing', value: { base: 1, per: [{ of: 'momentum', value: 0.1 }] } }, /name a source/],
  ['number block namespace', { op: 'damage_mult', when: 'dealing', value: { base: 1, per: [{ of: 'pocket:coins', value: 0.1 }] } }, /name a source/],
  ['number block shape', { op: 'grant_ap', when: 'turn_start', value: { base: 'one' } }, /is a number block/],
  ['reaction limit without a kind', { op: 'damage_mult', when: 'taking', value: 0.5, limit: { reaction: 1 } }, /names its kind/],
  ['sight word', { op: 'mark', when: 'turn_start', flag: 'x', if: { self_sight: ['hidden'] } }, /if\.self_sight` takes only/],
  ['reaction limit of three', { op: 'damage_mult', when: 'taking', value: 0.5, limit: { reaction: 3, kind: 'protect' } }, /spends 1 or 2/],
];
/** Each case: the same words used rightly (the validator says nothing about them). */
export const GOOD: any[] = [
  { op: 'mark', when: 'moved', flag: 'x', if: { by_cover: ['from', 'to'] } },
  { op: 'deal', when: 'hit', amount: { kind: 'damage', base: 0, per: [{ of: 'self:max_hp', value: 0.15 }] }, via: 'faith', nonlethal: true },
  { op: 'resource', when: 'combat_end', resource: 'guard', value: 'zero' },
  { op: 'resource', when: 'hit', resource: 'pressure', value: 1, target: 'target' },
  { op: 'damage_mult', when: 'dealing', value: { base: 1, per: [{ of: 'res:momentum', value: 0.15 }, { of: 'event:ambush', value: 0.5 }, { of: 'target:marked', value: 0.15 }], max: 2 } },
  { op: 'grant_ap', when: 'acted', if: { action: ['reload'] }, value: 1 },
  { op: 'roll_mod', when: 'spot', value: -2 },
  { op: 'damage_mult', when: 'taking', value: 0.5, limit: { reaction: 1, kind: 'protect' } },
  { op: 'mark', when: 'reaction', flag: 'x', if: { how: ['protect'] } },
];

describe('the validator and the new words (Classes 3.0 step 1a)', () => {
  it('refuses each misuse, by name, and passes each right use', () => {
    const out = validateWith([...BAD.map(([n, e], i) => perk('test_bad_' + i, [e])), perk('test_good', GOOD)]);
    for (const [i, [name, , re]] of BAD.entries()) expect(out.split('\n').filter((l) => l.includes('test_bad_' + i + ':') || l.includes('test_bad_' + i + ' ')).join('\n'), name).toMatch(re);
    expect(out.split('\n').filter((l) => l.includes('test_good')), 'the right uses').toEqual([]);
  }, 60000);
});
