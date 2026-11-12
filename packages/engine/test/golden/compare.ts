// @ts-nocheck (a recording tool; see harness.ts)
// The golden tables against their files (test/golden/<section>.json), exactly.
//   npm run check                                   compares (the golden-damage*.test.ts files)
//   GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage     writes the files anew, ON PURPOSE ONLY:
// a re-expression of the damage formula (stage (a) of docs/design/proposals/2026-11-unified-damage.md) must leave
// every line as it is, so a line that moves there is a bug in the change, not a reason to record. Record only when a
// rule or a number was changed deliberately (a re-fit, a new weapon, a new reference build), and say so in the commit.
import { expect } from 'vitest';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { recordSection, type Table } from './record';

const fileOf = (name: string) => fileURLToPath(new URL('./' + name + '.json', import.meta.url));
const RECORD = process.env.GOLDEN_RECORD === '1';
/** One line per action, sorted by key: a change shows as that action's line in a diff. */
const write = (name: string, t: Record<string, any>) => writeFileSync(fileOf(name), '{\n' + Object.entries(t).map(([k, v]) => JSON.stringify(k) + ': ' + JSON.stringify(v)).join(',\n') + '\n}\n');
const read = (name: string): Record<string, any> => (existsSync(fileOf(name)) ? JSON.parse(readFileSync(fileOf(name), 'utf8')) : {});

/** Play a section and compare it with its file (or write the file when GOLDEN_RECORD=1). Returns the number of actions. */
export function golden(name: string): number {
  const { table, counts } = recordSection(name);
  // what was tried and gave no number to hold (a stance, a set-up, a reaction nobody triggered): kept in the file, so the gap is on record
  if (counts) table['#coverage'] = Object.values(counts).filter((n) => n > 0).length + ' of ' + Object.keys(counts).length + ' produced a number here. None from: ' + Object.keys(counts).filter((k) => !counts[k]).sort().join(', ');
  if (RECORD) {
    write(name, table);
    console.log('GOLDEN_RECORD: wrote test/golden/' + name + '.json (' + Object.keys(table).length + ' actions)');
    return Object.keys(table).length;
  }
  const want: Table = read(name), diffs: string[] = [];
  for (const k of Object.keys(want)) if (!(k in table)) diffs.push('GONE     ' + k + '\n    was: ' + want[k]); else if (table[k] !== want[k]) diffs.push('CHANGED  ' + k + '\n    was: ' + want[k] + '\n    now: ' + table[k]);
  for (const k of Object.keys(table)) if (!(k in want)) diffs.push('NEW      ' + k + '\n    now: ' + table[k]);
  if (diffs.length) expect.fail('golden table "' + name + '": ' + diffs.length + ' of ' + Object.keys(want).length + ' actions differ from test/golden/' + name + '.json. The first ' + Math.min(12, diffs.length) + ':\n' + diffs.slice(0, 12).join('\n')
    + '\n(If a number was meant to move, record on purpose: GOLDEN_RECORD=1 npm test -w @phc/engine -- golden-damage)');
  expect(Object.keys(want).length).toBeGreaterThan(0);
  return Object.keys(table).length;
}
