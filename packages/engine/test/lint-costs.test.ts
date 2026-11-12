// @ts-nocheck (it reads the source files: this package has no node types; vitest runs it)
// THE COST AND COUNTER LINT (engine foundations 2). These tests read the engine's SOURCE and fail when someone goes
// round effects/cost.ts (paying a cost) or effects/uses.ts (a limit, a cooldown). Each failure says what to call
// instead. See docs/design/handoffs/engine-foundations-2-costs.md, "How to add things".
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import ACTIONS_JSON from '../../../data/actions.json';
import { COST_SITE_IDS, RESOURCES, costOf, hasCost, registered, handlerOf, itemInfo, dataAp, PERK } from '../src';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
function walk(dir: string): string[] { return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; }); }
/** Every source file; `code` is the text with comments blanked (same length and line numbers), so a rule never trips on prose. */
const FILES: { rel: string; text: string; code: string }[] = walk(SRC).map((path) => {
  const text = readFileSync(path, 'utf8');
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
  return { rel: relative(SRC, path).replace(/\\/g, '/'), text, code };
});
const lineOf = (text: string, i: number) => text.slice(0, i).split('\n').length;
function hits(re: RegExp, allow: (rel: string) => boolean = () => false): string[] {
  const out: string[] = [];
  for (const f of FILES) { if (allow(f.rel)) continue; for (const m of f.code.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) out.push(f.rel + ':' + lineOf(f.code, m.index!) + '  ' + m[0].slice(0, 80)); }
  return out;
}
const COST = (rel: string) => rel === 'effects/cost.ts';
const AP = (rel: string) => rel === 'effects/cost.ts' || rel === 'effects/ap.ts';

describe('F3: one way to price, check, pay and give AP', () => {
  it('no hand-written AP check: ask whyNot(cb, u, price) / canPay(cb, u, price) (effects/cost.ts)', () => {
    // `u.ap < AP_MAX` is "is there room for a grant", not a price
    expect(hits(/\.ap\s*<(?!=)(?!\s*AP_MAX\b)/, AP)).toEqual([]);
    expect(hits(/\.ap\s*>=/, AP)).toEqual([]);
    expect(hits(/[^=!<>\-]>\s*[\w.!]+\.ap\b|<=\s*[\w.!]+\.ap\b/, AP)).toEqual([]);
  });
  it('nothing writes a unit\'s AP by hand: pay() / refund() / grantAp() / loseAp() / setAp() / freely() / withAp()', () => {
    // what is left are not units: a hook's context (ctx), a preview (pv, out), a cost being built (c), the area map's round
    // pool (g.story.ap, one door of its own: game.ts apLeft / spendAp), a fight ruling's record (fr)
    const NOT_A_UNIT = new Set(['ctx', 'g.story', 't.pv', 'out', 'fr', 'c']);
    const bad: string[] = [];
    for (const f of FILES) { if (AP(f.rel)) continue; for (const m of f.code.matchAll(/([A-Za-z_][\w.!\]\)]*)\.ap\s*(\+=|-=|=(?!=))/g)) if (!NOT_A_UNIT.has(m[1])) bad.push(f.rel + ': ' + m[0]); }
    expect(bad).toEqual([]);
  });
  it('the refusal sentence is built in one place: needs(n) / whyNot() (no \'Needs \' + n + \' AP.\')', () => {
    expect(hits(/'Needs '\s*\+[^;\n]{0,60}' AP\b|['`]Needs \d+ AP\./, COST)).toEqual([]);
  });
  it('actionAp() is called by price() only', () => {
    expect(hits(/\bactionAp\(/, (rel) => rel === 'effects/cost.ts' || rel === 'effects/core.ts')).toEqual([]);
  });
  it('the loan is gone: no AP is lent before an action and taken back after it', () => {
    expect(hits(/\b(encoreBefore|encoreAfter|briefBefore|briefAfter)\b/)).toEqual([]);
    expect(hits(/\.ap\s*=\s*(99|999)\b/, AP)).toEqual([]);
  });
  it('every price() with no base names an action whose AP is in data/actions.json', () => {
    const missing: string[] = [];
    for (const f of FILES) for (const m of f.code.matchAll(/\b(?:price|affords)\(\s*(?:\{[^{}]*\}|cb, u),\s*'([a-z_0-9]+)'\s*\)/g)) if (!hasCost(m[1])) missing.push(f.rel + ': ' + m[0]);
    expect(missing).toEqual([]);
  });
  it('data/actions.json: every cost is a whole number, every site is declared, every resource has a home', () => {
    const J: any = ACTIONS_JSON;
    for (const [id, v] of Object.entries(J.costs) as [string, any][]) {
      for (const [k, n] of Object.entries(v)) if (k === 'ap' || k.startsWith('ap_') || k === 'min') expect(Number.isInteger(n) && (n as number) >= 0, 'costs.' + id + '.' + k).toBe(true);
      expect(typeof costOf(id), id).toBe('number');
      expect(J.items.some((a: any) => a.id === id), 'costs.' + id + ' repeats a row of items').toBe(false);
    }
    for (const a of [...J.items, ...Object.entries(J.costs).map(([id, v]: any) => ({ id, ...v }))]) if (a.site) expect((COST_SITE_IDS as readonly string[]).includes(a.site), a.id + '.site ' + a.site).toBe(true);
    for (const [id, r] of Object.entries(RESOURCES) as [string, any][]) { expect(['unit', 'character']).toContain(r.on); expect(r.name, id).toBeTruthy(); expect(r.path, id).toMatch(/^[a-z]+(\.[a-zA-Z]+)*$/); }
  });
  it('a resource is spent through pay() (an action\'s declared `res`) or spend(): the hand-written ones left are counted', () => {
    // RATCHET. These are payments of MP, charge, cores, stims, spare parts and Echo still made by hand inside a run() or
    // a built-in verb (they have their own refusal words, or a price worked out in the action). Moving one to `res` or
    // spend() lowers its file's number here; a NEW hand-written payment raises it and fails. Never raise a number.
    const LEFT: Record<string, number> = { 'classes/i.ts': 4, 'classes/j.ts': 4, 'classes/k.ts': 6, 'classes/rev3.ts': 1, 'combat.ts': 2, 'game.ts': 2, 'magic.ts': 3, 'perks/a.ts': 1, 'perks/c.ts': 1, 'perks/d.ts': 1, 'perks/e.ts': 2, 'perks/f.ts': 1 };
    const got: Record<string, number> = {};
    for (const f of FILES) { if (COST(f.rel)) continue; const n = [...f.code.matchAll(/\.(mp|charge|cores)\s*(-=|--)|\.stims--|\.echo--|\.parts = \([^;\n]*- 1/g)].length; if (n) got[f.rel] = n; }
    expect(got).toEqual(LEFT);
  });
});

describe('F3: an item action reads its AP from its data', () => {
  it('every action that says ap: \'data\' has a number in data/*.json, at every tier', () => {
    let n = 0;
    for (const key of registered()) for (const d of handlerOf(key)?.actions || []) {
      if (d.ap !== 'data') continue; n++;
      const [kind, id] = key.split(':'), tiers = kind === 'perk' && (PERK as any)[id]?.tiers ? Object.keys((PERK as any)[id].tiers) : [undefined];
      for (const tier of tiers) { const info = itemInfo(key, tier as any); if (info) expect(() => dataAp(info, d.id), key + '#' + d.id).not.toThrow(); }
    }
    expect(n).toBeGreaterThan(80);
  });
  it('RATCHET: the lane actions that still type a number the data also holds (never raise it)', () => {
    // An action whose literal AP equals its item's data AP should say ap: 'data'. What is left here is written by a
    // helper (a map over toxins, an on / off pair) where the codemod could not reach the literal.
    let same = 0;
    for (const key of registered()) for (const d of handlerOf(key)?.actions || []) {
      if (typeof d.ap !== 'number') continue;
      const [kind, id] = key.split(':'), tiers = kind === 'perk' && (PERK as any)[id]?.tiers ? Object.keys((PERK as any)[id].tiers) : [undefined];
      let all = true, any = false;
      for (const tier of tiers) { try { const info = itemInfo(key, tier as any); if (!info) { all = false; continue; } any = true; const v = dataAp(info, d.id); if (v !== d.ap) all = false; } catch { all = false; } }
      if (any && all) same++;
    }
    expect(same).toBeLessThanOrEqual(28);
  });
});

describe('F8: every limit and cooldown goes through uses() (effects/uses.ts)', () => {
  it('the stores that were moved stay gone: the AP perks\' cooldown, the prayer limits, QUICKEN\'s round', () => {
    expect(hits(/\b(prayedRound|whisperTurn|whisperRound|hymnRound|ownHymn|quickRound)\b/)).toEqual([]);
    expect(hits(/\)\.cd\b\s*(\|\|=|=)|\.cd\s*\|\|=/)).toEqual([]); // stateOf(h).cd: uses(h).cool(turns, key)
  });
  it('a read never creates a bag: only take / refund / cool write (uses.ts makes cells in one place)', () => {
    const f = FILES.find((x) => x.rel === 'effects/uses.ts')!;
    expect([...f.code.matchAll(/\.uses \|\|= \{\}/g)].length).toBe(2); // the bag of a unit or a character, and the story's: both inside cellsOf(…, create)
    // (game.ts copies a foreseen action's cells from one game to another; sigilgrowth.ts's `uses` is how often a Sigil word was used: another thing)
    expect(hits(/\.uses \|\|= \{\}/, (rel) => rel === 'effects/uses.ts').map((x) => x.split(':')[0])).toEqual(['game.ts', 'sigilgrowth.ts']);
  });
  it('RATCHET: a round number kept by hand and compared with cb.round (never raise a number; move one to uses() and lower it)', () => {
    // What is left is counted file by file. Most are not plain limits: a per-target map on a zone, a record that is
    // only valid this round, an AI's "already tried this round" note, the reactions and Call counters (each already
    // one door: tactics.ts useReaction, calls/core.ts). A NEW hand-kept round compare fails here: write
    // uses(h).take('per_round', n, key) / uses(h).on(target).take('per_round') / uses(h).cool(turns, key) instead.
    const LEFT: Record<string, number> = { 'ai-sigil.ts': 2, 'ai-soul.ts': 1, 'calls/core.ts': 3, 'calls/handlers.ts': 1, 'classes/i.ts': 2, 'classes/j.ts': 1, 'classes/k.ts': 7, 'classes/rev3.ts': 3, 'combat.ts': 3, 'deeds.ts': 1,
      'effects/mending.ts': 1, 'faith.ts': 4, 'feelings.ts': 1, 'fighttalk.ts': 1, 'game.ts': 2, 'magic.ts': 2, 'perks/b.ts': 1, 'perks/c.ts': 1, 'perks/d.ts': 3, 'perks/e.ts': 4, 'perks/g.ts': 2, 'perks/skeleton.ts': 1, 'physical/core.ts': 2,
      'physical/ranged/press.ts': 2, 'sigil.ts': 3, 'tactics.ts': 2 };
    const got: Record<string, number> = {};
    for (const f of FILES) { const n = [...f.code.matchAll(/[!=]== ?(cb|ctx\.cb|h\.cb!?|t\.cb|c)\.round\b|\b(cb|ctx\.cb|h\.cb!?|t\.cb)\.round ?[!=]==/g)].length; if (n) got[f.rel] = n; }
    expect(got).toEqual(LEFT);
  });
});
