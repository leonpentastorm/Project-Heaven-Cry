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
// THE RATCHETS' NUMBERS (each test says what is counted and what to call instead). Never raise one to make a test pass.
const LEFT_AP_READS: Record<string, number> = { 'actions.ts': 1, 'ai-sigil.ts': 2, 'ai-soul.ts': 6, 'calls/rules.ts': 1, 'classes/i.ts': 3, 'classes/j.ts': 2, 'classes/k.ts': 2, 'combat.ts': 4, 'effects/actions.ts': 6, 'faith.ts': 3, 'game.ts': 9,
  'glossary.ts': 5, 'perks/c.ts': 1, 'perks/e.ts': 2, 'perks/h.ts': 1, 'physical/melee/links.ts': 1, 'physical/melee/shield.ts': 1, 'preview.ts': 2, 'sigil.ts': 7, 'world.ts': 2 }; // (glossary.ts: `t` there is a technique's data, counted all the same)
const LEFT_RES_SPENT: Record<string, number> = { 'classes/i.ts': 6, 'classes/j.ts': 4, 'classes/k.ts': 10, 'classes/rev3.ts': 1, 'combat.ts': 2, 'game.ts': 3, 'magic.ts': 3, 'perks/a.ts': 1, 'perks/c.ts': 2, 'perks/d.ts': 1, 'perks/e.ts': 2, 'perks/f.ts': 1 };
const LEFT_HAND_COOLDOWNS: Record<string, number> = { 'classes/k.ts': 1, 'faith.ts': 2, 'perks/b.ts': 2 };
const LEFT_AP_DELTAS: Record<string, number> = { 'faith.ts': 1, 'game.ts': 2, 'preview.ts': 1, 'world.ts': 1 };
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
    for (const f of FILES) { if (AP(f.rel)) continue; for (const m of f.code.matchAll(/([A-Za-z_][\w.!\]\)]*)\.ap\s*(\+=|-=|\*=|\/=|\+\+|--|=(?!=))/g)) if (!NOT_A_UNIT.has(m[1])) bad.push(f.rel + ': ' + m[0]); }
    expect(bad).toEqual([]);
    // the same write spelled another way (review): `--u.ap`, `Object.assign(u, { ap: … })`
    expect(hits(/(\+\+|--)\s*[A-Za-z_][\w.!]*\.ap\b/, AP)).toEqual([]);
    expect(hits(/Object\.assign\(\s*[A-Za-z_][\w.!]*\s*,\s*\{[^{}\n]*\bap\s*:/, AP)).toEqual([]);
  });
  it('RATCHET: a unit\'s AP is READ through whyNot() / canPay() / apFor() / apMeter() (never raise a number)', () => {
    // The review showed the rules above only knew the old spellings: `u.ap <= 1`, `!(u.ap > 2)`, `const left = u.ap - 2`
    // all passed. So every read of a unit's `.ap` outside effects/cost.ts and effects/ap.ts is COUNTED here, file by
    // file, whatever is done with it. A unit is a receiver named as units are named in this engine (UNIT below; a cast
    // `(u as any).ap` counts too). What is left: the AI asking "is it nearly out" (not a price), a turn's loop
    // `u.ap > 0`, a preview measuring what a dry run took, a log line, a window's saved pool.
    //   To ask "can it pay n":            canPay(cb, u, n) / whyNot(cb, u, n)      (they count Encore's and a Brief's credit)
    //   "how much can it put toward it":  apFor(cb, u)                             (never u.ap: a credit pays first)
    //   "what did that take":             const taken = apMeter(cb, u); …; taken()
    // A NEW read fails here. Use one of the three; only if it really is none of them, raise the file's number in the
    // same change and say why in the hand-off.
    const UNIT = /(?:^|[.(\s])(?:u|t|v|e|x|f|me|ally|foe|target|unit|actor|who|by|src|caster|owner|mover|victim|holder|shooter|attacker|defender|u2|t2|v2|e2|u0|u1)[!?]*$|as any\)[!?]*$|\bunits?\b[^.]*$/;
    const LEFT: Record<string, number> = LEFT_AP_READS;
    const got: Record<string, number> = {};
    for (const f of FILES) {
      if (AP(f.rel)) continue; let n = 0;
      for (const m of f.code.matchAll(/([A-Za-z_(][\w.!?\]\)\[' ]*?)\.ap\b(?![_(:\w])(?!\s*(\+=|-=|\*=|\/=|\+\+|--|=(?!=)))/g)) { const r = m[1].trim(); if (UNIT.test(r) && !/\bctx$|\bpv$/.test(r)) n++; }
      if (n) got[f.rel] = n;
    }
    expect(got).toEqual(LEFT);
  });
  it('the refusal sentence is built in one place: needs(n) / whyNot() (no \'Needs \' + n + \' AP.\')', () => {
    expect(hits(/'Needs '\s*\+[^;\n]{0,60}' AP\b|['`]Needs \d+ AP\./, COST)).toEqual([]);
  });
  it('a price is asked WITH the fight: price({ cb, u }, …), so every unit\'s items and every engine listener hear the `cost` hook', () => {
    // price({ u }, …) asks the unit's own items only (review: Reload, Analyze, a stim, Vent, a core change and every
    // weapon row were priced that way inside the action, so an ally's item changed Prone and not Reload). A helper that
    // prices takes the fight as its last argument (reloadAp(u, cb)) and passes it on; with no fight at hand it passes
    // the `cb` it was given, which may be null (a card outside a fight).
    expect(hits(/\b(?:price|priced)\(\s*\{(?![^{}]*\bcb\b)[^{}]*\}/, COST)).toEqual([]);
    expect(hits(/\b(?:whyNot|canPay)\(\s*null\s*,/, COST).map((x) => x.split(':')[0])).toEqual(['ai-sigil.ts']); // a planner's sum, checked again by the action
  });
  it('a cost is measured with apMeter(), never as `ap0 - u.ap` (a Brief or Encore pays first and would be left out)', () => {
    // what is left: the area map and a dry run on a copy (no reducer action, so no credit is open), Encore's own mark
    const LEFT: Record<string, number> = LEFT_AP_DELTAS;
    const got: Record<string, number> = {};
    for (const f of FILES) { if (AP(f.rel)) continue; const n = [...f.code.matchAll(/\b(?:ap0|before|was|apMark|own|start)\b\s*-\s*[A-Za-z_][\w.!?]*\.ap\b|\.apMark\s*-\s*[A-Za-z_][\w.!?]*\.ap\b/g)].length; if (n) got[f.rel] = n; }
    expect(got).toEqual(LEFT);
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
    const LEFT: Record<string, number> = LEFT_RES_SPENT;
    const got: Record<string, number> = {};
    // Every resource of data/actions.json (its last path segment), spelled any of the ways a subtraction is spelled:
    // `x.mp -= n`, `x.cores--`, `x.mp = x.mp - n`, `x.charge = Math.max(0, x.charge - n)`, `x.parts = (x.parts || 0) - 1`.
    const R = '(' + [...new Set(Object.values(RESOURCES).map((r: any) => r.path.split('.').pop()))].join('|') + ')';
    const SUB = new RegExp('\\.' + R + '!?\\s*(-=|--)|\\.' + R + '!?\\s*=(?!=)[^;\\n]{0,80}?\\.\\3\\b[^;\\n]{0,24}?\\s-\\s', 'g');
    for (const f of FILES) { if (COST(f.rel)) continue; const n = [...f.code.matchAll(SUB)].length; if (n) got[f.rel] = n; }
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
    const LEFT: Record<string, number> = { 'ai-sigil.ts': 2, 'ai-soul.ts': 1, 'calls/core.ts': 1, 'calls/handlers.ts': 1, 'classes/i.ts': 2, 'classes/j.ts': 1, 'classes/k.ts': 7, 'classes/rev3.ts': 3, 'combat.ts': 3, 'deeds.ts': 1,
      'effects/mending.ts': 1, 'faith.ts': 4, 'feelings.ts': 1, 'fighttalk.ts': 1, 'game.ts': 2, 'magic.ts': 2, 'perks/b.ts': 1, 'perks/c.ts': 1, 'perks/d.ts': 3, 'perks/e.ts': 4, 'perks/g.ts': 2, 'perks/skeleton.ts': 1, 'physical/core.ts': 2,
      'physical/ranged/press.ts': 2, 'sigil.ts': 3, 'tactics.ts': 2 };
    const got: Record<string, number> = {};
    for (const f of FILES) { const n = [...f.code.matchAll(/[!=]== ?(cb|ctx\.cb|h\.cb!?|t\.cb|c)\.round\b|\b(cb|ctx\.cb|h\.cb!?|t\.cb)\.round ?[!=]==/g)].length; if (n) got[f.rel] = n; }
    expect(got).toEqual(LEFT);
  });
  it('RATCHET: a cooldown or a per-turn stamp kept by hand (the review\'s spellings; never raise a number)', () => {
    // The ratchet above only sees `=== cb.round`. These are the other ways the same thing is written:
    //   a cooldown by subtraction      cb.round - st.last < 3        (the old prayedRound check)  ->  uses(h).cool(turns, key) / coolLeft
    //   a cooldown by addition         st.last + 3 > cb.round                                      ->  the same
    //   a stamp of the turn            st.t === cb.round + ':' + cb.turn, === turnKey(cb)          ->  uses(h).take('per_turn', n, key)
    // uses.ts itself, and the one door of each counter that is not moved yet, are what is counted.
    const RE = /\b(?:cb|ctx\.cb|h\.cb!?|t\.cb|g\.story)\.round\s*-\s*[\w.!?\[\]'()| ]+?\s*(?:<|>)=?|[\w.!?\]]+\s*\+\s*[\w.!?()]+\s*(?:<|>)=?\s*(?:cb|ctx\.cb|h\.cb!?|t\.cb|g\.story)\.round\b|[!=]==\s*(?:cb|ctx\.cb|h\.cb!?|t\.cb)\.round\s*\+\s*':'|[!=]==\s*turnKey\(|turnKey\([^)]*\)\s*[!=]==/g;
    const LEFT: Record<string, number> = LEFT_HAND_COOLDOWNS;
    const got: Record<string, number> = {};
    for (const f of FILES) { if (f.rel === 'effects/uses.ts') continue; const n = [...f.code.matchAll(RE)].length; if (n) got[f.rel] = n; }
    expect(got).toEqual(LEFT);
  });
});
