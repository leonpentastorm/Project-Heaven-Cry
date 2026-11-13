// @ts-nocheck (it reads the engine's own source files: node's fs, which the engine's tsconfig does not know)
// THE ITEM-OPS RATCHET (engine foundations 3: docs/design/handoffs/engine-foundations-3-item-ops.md). An item whose
// behaviour is "when X, if Y, do Z, at most N" is written in data (effects/triggers.ts runs it), never as a new handler.
//   1. The lane handlers (register blocks in src/perks and src/classes) are the list in lint-item-ops.baseline.json, per
//      file: a NEW one fails (write the item in data; if it truly cannot be, the message says what to do), and one that
//      is gone must leave the list too (the list only shrinks).
//   2. Numeric literals inside handlers (outside strings and comments; 0 and 1 are not counted) only shrink, per file:
//      a handler reads its numbers from its data (effects/num.ts num(h, 'key'), or its effects' own fields).
//   3. Every num(h, '<key>') a handler asks for is in its item's data.
//   4. The items moved into data have no handler left, and the runner owns every effect they have.
//   LINT_RECORD=1 npx vitest run --root packages/engine test/lint-item-ops   writes the baseline (ON PURPOSE: after a
//   conversion, the list and the counts go DOWN; read the diff before committing it).
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import '../src';
import { handlerOf, itemInfo, coverageOf } from '../src/effects';
import { rawItem, splitKey } from '../src/effects/collect';
import { TRIGGERS } from '../src/effects/triggers';
import LINT_PATTERNS from './lint-patterns.json';
/** Patterns shared with tools/built_from.py (test/lint-patterns.json): one list, read by both. */
const PAT = (id: string) => (LINT_PATTERNS as any).patterns[id];
const REG_START = new RegExp(PAT('register_block').re);

const SRC = fileURLToPath(new URL('../src/', import.meta.url));
const BASE = fileURLToPath(new URL('./lint-item-ops.baseline.json', import.meta.url));
const FILES = [...readdirSync(SRC + 'perks').map((f) => 'perks/' + f), ...readdirSync(SRC + 'classes').map((f) => 'classes/' + f)].filter((f) => f.endsWith('.ts')).sort();

interface Block { file: string; id: string; text: string; hooks: string[]; actions: boolean; rest: boolean }
/** The register blocks of a lane file: a line that starts `register({` to the line that starts `});` (or one line). */
export function blocks(file: string): Block[] {
  const L = readFileSync(SRC + file, 'utf8').split('\n'), out: Block[] = [];
  for (let i = 0; i < L.length; i++) {
    if (!REG_START.test(L[i])) continue;
    let j = i; if (!/\}\);\s*(\/\/.*)?$/.test(L[i])) { j = i + 1; while (j < L.length && !L[j].startsWith('});')) j++; }
    const text = L.slice(i, j + 1).join('\n'), id = /id:\s*'([^']+)'/.exec(text)?.[1] || /id:\s*([A-Z_]+)/.exec(text)?.[1] || '?';
    out.push({ file, id, text, hooks: [...new Set([...text.matchAll(/(?:^|[\s{,])(\w+):\s*\(ctx/g)].map((m) => m[1]))], actions: /\bactions:|\btoggles:/.test(text), rest: /\bstat[:(]|checkMod|pendRuling|\bnote\(|narrator:/.test(text) });
    i = j;
  }
  return out;
}
/** Numeric literals in code (strings, template strings and comments taken out first; 0 and 1 not counted). */
export function literals(text: string): number {
  const code = text.replace(/\/\/[^\n]*/g, '').replace(/'(?:[^'\\\n]|\\.)*'/g, "''").replace(/"(?:[^"\\\n]|\\.)*"/g, '""').replace(/`(?:[^`\\]|\\.)*`/g, '``');
  return [...code.matchAll(new RegExp(PAT('handler_literal').re, 'g'))].filter((m) => !PAT('handler_literal').ignore_values.includes(m[1])).length;
}
const HOOKS_OF_TRIGGERS = new Set(Object.values(TRIGGERS).map((t) => t.hook));
const now = () => {
  const handlers: Record<string, string[]> = {}, lits: Record<string, number> = {};
  for (const f of FILES) { const b = blocks(f); if (!b.length) continue; handlers[f] = b.map((x) => x.id).sort(); lits[f] = b.reduce((t, x) => t + literals(x.text), 0); }
  return { handlers, literals: lits };
};

/** The items written in data only by engine foundations 3 (no handler; the runner owns every effect). */
export const DATA_ONLY = ['trait:pain_eater', 'trait:right_of_way', 'perk:siege_engine', 'perk:hot_swap', 'perk:last_wall', 'perk:used_to_the_pain',
  'class:adamantile_knight.unbroken', 'class:mage.core_change', 'class:marksman.speed_loader', 'class:mage.barrage', 'class:trickster.blind_and_slow',
  'class:marksman.run_and_gun', 'class:marksman.reflex', 'class:fighter.riposte']; // rules 1.30

describe('item ops: the ratchet on lane handlers', () => {
  const cur = now();
  if (process.env.LINT_RECORD === '1') writeFileSync(BASE, JSON.stringify(cur, null, 1) + '\n');
  const base = existsSync(BASE) ? JSON.parse(readFileSync(BASE, 'utf8')) : { handlers: {}, literals: {} };
  it('no new lane handler (a "when X, if Y, do Z" item is data); a gone one leaves the list', () => {
    const bad: string[] = [];
    for (const f of new Set([...Object.keys(cur.handlers), ...Object.keys(base.handlers)])) {
      const had = new Set(base.handlers[f] || []), has = new Set(cur.handlers[f] || []);
      for (const id of has) if (!had.has(id)) {
        const b = blocks(f).find((x) => x.id === id)!;
        const shape = !b.actions && !b.rest && b.hooks.length > 0 && b.hooks.every((k) => HOOKS_OF_TRIGGERS.has(k));
        bad.push(f + ': NEW handler ' + id + (shape ? ' listens only on hooks the item ops cover (' + b.hooks.join(', ') + '): write it in data (when / if / limit and an op; docs/design/handoffs/engine-foundations-3-item-ops.md "How to add")'
          : ' (if it truly cannot be data: name the op or trigger it needs in the hand-off, then LINT_RECORD=1 on purpose)'));
      }
      for (const id of had) if (!has.has(id)) bad.push(f + ': ' + id + ' is gone: good. Take it off the list: LINT_RECORD=1 npx vitest run --root packages/engine test/lint-item-ops');
    }
    expect(bad).toEqual([]);
  });
  it('numeric literals in handlers only go down (read them from the item\'s data)', () => {
    const bad: string[] = [];
    for (const f of new Set([...Object.keys(cur.literals), ...Object.keys(base.literals)])) {
      const a = base.literals[f] ?? 0, b = cur.literals[f] ?? 0;
      if (b > a) bad.push(f + ': ' + b + ' numeric literals in handlers, the list allows ' + a + '. Put the number in the item\'s data and read it (num(h, \'key\') or the effect\'s own field).');
      if (b < a) bad.push(f + ': ' + b + ' numeric literals, down from ' + a + ': good. Lower the list: LINT_RECORD=1 npx vitest run --root packages/engine test/lint-item-ops');
    }
    expect(bad).toEqual([]);
  });
  it('every num(h, key) a handler asks for is in its item\'s data', () => {
    const bad: string[] = [];
    for (const f of FILES) for (const b of blocks(f)) for (const m of b.text.matchAll(/\bnum\(\s*\w+\s*,\s*'([a-z_0-9]+)'/g)) {
      const kind = b.id.includes('.') ? 'class' : undefined, key = (kind ? 'class:' : '') + b.id, it0 = rawItem(key.includes(':') ? key : (splitKey(key)[0] + ':' + b.id));
      const has = it0 && (typeof it0.numbers?.[m[1]] === 'number' || Object.values(it0.tiers || {}).some((t: any) => typeof t?.numbers?.[m[1]] === 'number'));
      if (!has) bad.push(f + ': ' + b.id + ' asks num(h, \'' + m[1] + '\'), which is not in its data');
    }
    expect(bad).toEqual([]);
  });
  it('the items moved into data have no handler, and the runner owns every effect they have', () => {
    for (const k of DATA_ONLY) {
      expect(handlerOf(k), k + ' has a handler again').toBeFalsy();
      const tiers = rawItem(k)?.tiers ? Object.keys(rawItem(k).tiers) : [undefined];
      for (const t of tiers) { const info = itemInfo(k, t as any)!; expect(info, k).toBeTruthy(); for (const r of coverageOf(info)) expect(r.owner, k + '@' + t + ' #' + r.index + ' ' + r.op).toBe('generic'); }
    }
  });
});
