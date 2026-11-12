// @ts-nocheck (node:fs and node:child_process, as test/golden/compare.ts; the engine tsconfig has no node types)
// Texts read their numbers (docs/design/handoffs/text-number-truth.md, second pass). A number in a data text is a
// {=placeholder} naming a field of its item; src/datatext.ts fills them when the data loads, and tools/text_numbers.py
// fills them the same way for the validator and the web's protodata.json. This test holds the two equal and runs the
// guard's own mutation test.
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { join } from 'node:path';
import { renderText, resolveTexts, fmtNumber, PERK, WEAPON, TRAIT } from '../src';
import * as SRC from '../src';

const ROOT = join(__dirname, '..', '..', '..');
const py = (...args: string[]) => execFileSync('python3', [join(ROOT, 'tools', 'text_numbers.py'), ...args], { encoding: 'utf8', maxBuffer: 64 << 20 });
const hasId = (o: any) => o && typeof o === 'object' && !Array.isArray(o) && (typeof o.id === 'string' || typeof o.id === 'number');
/** Every string of the raw pack that holds a placeholder, keyed as the Python tool keys it, rendered by the engine. */
function engineRender(): Record<string, string> {
  const out: Record<string, string> = {};
  const strings = (node: any, item: any, key: string, path: string, top: boolean) => {
    if (!node || typeof node !== 'object') return;
    if (!top && hasId(node)) return;
    for (const k of Object.keys(node)) {
      const v = node[k], p = path ? path + '.' + k : k;
      if (typeof v === 'string') { if (/\{=/.test(v)) out[key + ':' + p] = renderText(v, item, node); } else strings(v, item, key, p, false);
    }
  };
  const items = (node: any, chain: string[], stem: string) => {
    if (!node || typeof node !== 'object') return;
    const here = hasId(node) ? [...chain, String(node.id)] : chain;
    if (here !== chain) strings(node, node, stem + ':' + here.join('/'), '', true);
    for (const k of Object.keys(node)) items(node[k], here, stem);
  };
  for (const f of readdirSync(join(ROOT, 'data')).filter((x) => x.endsWith('.json')).sort()) items(JSON.parse(readFileSync(join(ROOT, 'data', f), 'utf8')), [], f.replace(/\.json$/, ''));
  return out;
}

describe('texts read their numbers', () => {
  it('a number prints the same way in both programs', () => {
    expect([fmtNumber(3), fmtNumber(0.5), fmtNumber(-2), fmtNumber(-2, 'abs'), fmtNumber(2, 'signed'), fmtNumber(0.25, 'pct'), fmtNumber(1.25, 'more'), fmtNumber(0.75, 'less'), fmtNumber(1.1, 'more')])
      .toEqual(['3', '0.5', '−2', '2', '+2', '25', '25', '25', '10']);
  });
  it('the engine and tools/text_numbers.py render every text alike', () => {
    const tool = JSON.parse(py('--render')), mine = engineRender();
    expect(Object.keys(mine).length).toBeGreaterThan(500);
    expect(Object.keys(mine).sort()).toEqual(Object.keys(tool).sort());
    for (const k of Object.keys(tool)) expect(mine[k], k).toBe(tool[k]);
    for (const k of Object.keys(mine)) expect(mine[k], k).not.toMatch(/\{=/);
  });
  it('no text the engine hands out still holds a placeholder', () => {
    const left: string[] = [];
    const scan = (o: any, at: string) => { if (typeof o === 'string') { if (o.includes('{=')) left.push(at); } else if (o && typeof o === 'object') for (const k of Object.keys(o)) scan(o[k], at + '.' + k); };
    scan(PERK, 'PERK'); scan(WEAPON, 'WEAPON'); scan(TRAIT, 'TRAIT');
    // truth pass 3 (the review): every table the engine exports from data, not three of them
    for (const [k, v] of Object.entries(SRC)) if (/^[A-Z][A-Z_]+$/.test(k) && v && typeof v === 'object') scan(v, k);
    expect(left).toEqual([]);
  });
  it('every engine file that imports a data JSON imports datatext first (else its texts could reach the screen unfilled)', () => {
    const bad: string[] = [];
    const walk = (dir: string) => { for (const f of readdirSync(dir, { withFileTypes: true })) { const p = join(dir, f.name); if (f.isDirectory()) walk(p); else if (/\.ts$/.test(f.name) && f.name !== 'datatext.ts') {
      const src = readFileSync(p, 'utf8'), d = src.search(/^import [^\n]*data\/[a-z_]+\.json'/m); if (d < 0) continue;
      const t = src.search(/^import '\.{1,2}\/(?:\.\.\/)*datatext';/m); if (t < 0 || t > d) bad.push(p.slice(ROOT.length + 1));
    } } };
    walk(join(ROOT, 'packages', 'engine', 'src'));
    expect(bad).toEqual([]);
  });
  it('filling is in place and filling twice changes nothing', () => {
    const item = { id: 'x', text: 'Deals +{=effect.mult|more}% for {=ap} AP; {name} stays.', effect: { mult: 1.5 }, ap: 2 };
    resolveTexts({ items: [item] }); const once = item.text; resolveTexts({ items: [item] });
    expect(once).toBe('Deals +50% for 2 AP; {name} stays.'); expect(item.text).toBe(once);
  });
  it('the guard catches its own mutations: +1 on every bound field changes the text, and a typed digit is an error', () => {
    const r = JSON.parse(py('--mutate'));
    expect(r.bound_fields).toBeGreaterThan(500);
    expect(r.bound_missed).toBe(0); expect(r.typed_missed).toBe(0);
  });
});
