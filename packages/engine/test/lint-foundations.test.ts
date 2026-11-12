// @ts-nocheck (it reads the source files: this package has no node types; vitest runs it)
// THE FOUNDATION LINT (engine foundations 1). These tests read the engine's SOURCE and fail when someone goes round
// one of the shared primitives. Each failure message says what to call instead. See
// docs/design/handoffs/engine-foundations-1.md, "How to add things".
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { STATS, STAT_FAMILIES, COST_SITE_IDS, COST_SITES, IMMUNE_IDS, isStatId, isCondition } from '../src';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
function walk(dir: string): string[] { return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? walk(p) : p.endsWith('.ts') ? [p] : []; }); }
export const FILES: { path: string; rel: string; text: string; code: string }[] = walk(SRC).map((path) => {
  const text = readFileSync(path, 'utf8');
  // code: the text with comments blanked (same length and line numbers), so a rule never trips on prose
  const code = text.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/[^\n]*/g, (m, a) => a + ' '.repeat(m.length - a.length));
  return { path, rel: relative(SRC, path).replace(/\\/g, '/'), text, code };
});
const lineOf = (text: string, i: number) => text.slice(0, i).split('\n').length;
export function hits(re: RegExp, allow: (rel: string) => boolean = () => false): string[] {
  const out: string[] = [];
  for (const f of FILES) { if (allow(f.rel)) continue; for (const m of f.code.matchAll(new RegExp(re.source, re.flags.includes('g') ? re.flags : re.flags + 'g'))) out.push(f.rel + ':' + lineOf(f.code, m.index!) + '  ' + m[0].slice(0, 80)); }
  return out;
}

// ============================================================================================ F14: stat ids
const FAMS = Object.keys(STAT_FAMILIES);
/** 'skill:guts' → ['skill:', 'guts']; 'hp' → ['hp', '']. A template or a concatenation gives the family and ''. */
const split = (id: string): [string, string] => { const f = FAMS.find((p) => id.startsWith(p)); return f ? [f, id.slice(f.length).replace(/\$\{.*$/, '')] : [id, '']; };

describe('F14: stat ids are declared, asked and answered', () => {
  const asked = new Set<string>(), askedFam = new Set<string>(), costSites = new Set<string>(), immuneAsked = new Set<string>();
  const answered: { id: string; at: string }[] = [];
  for (const f of FILES) {
    // askers: statQuery(x, '<id>' | `<fam>${…}`), character.ts fx(c, …), onStat is an ANSWER (an engine system's)
    for (const m of f.code.matchAll(/\b(?:statQuery|fx)\(\s*(?:\{[^{}]*\}|[\w.]+)(?:\s+as any)?,\s*(['`])([^'`]+)\1/g)) {
      if (f.rel !== 'character.ts' && m[0].startsWith('fx(')) continue;
      const [a, b] = split(m[2]); if (b) asked.add(a + b); else if (FAMS.includes(a)) askedFam.add(a); else asked.add(a);
    }
    for (const m of f.code.matchAll(/\bactionAp\(\s*\{[^{}]*\},\s*([^,]+),/g)) { const lit = [...m[1].matchAll(/'([a-z_]+)'/g)].map((x) => x[1]); for (const s of lit) costSites.add(s); if (!lit.length && !/def\.id as CostSite|action\b/.test(m[1])) throw new Error('actionAp with a site the lint cannot read: ' + f.rel + ' ' + m[0]); }
    for (const m of f.code.matchAll(/AP_BY_NAME[^=]*= new Set<CostSite>\(\[([^\]]+)\]/g)) for (const x of m[1].matchAll(/'([a-z_]+)'/g)) costSites.add(x[1]);
    for (const m of f.code.matchAll(/\bimmune\(\s*\{[^{}]*\},\s*'([a-z_]+)'/g)) immuneAsked.add(m[1]);
    // answerers: every string a `stat` is compared with
    for (const m of f.code.matchAll(/(?<![.\w])stat\s*[!=]==\s*'([^']+)'|'([^']+)'\s*[!=]==\s*stat\b|(?<![.\w])stat\.startsWith\('([^']+)'\)|onStat\('([^']+)'/g)) answered.push({ id: m[1] || m[2] || m[3] || m[4], at: f.rel + ':' + lineOf(f.code, m.index!) });
    for (const m of f.code.matchAll(/\[((?:'[a-z_:]+',?\s*)+)\]\.includes\(stat\)/g)) for (const x of m[1].matchAll(/'([^']+)'/g)) answered.push({ id: x[1], at: f.rel + ':' + lineOf(f.code, m.index!) });
  }
  for (const s of costSites) asked.add('ap_cost:' + s);
  for (const s of immuneAsked) asked.add('immune:' + s);
  const isAsked = (id: string): boolean => {
    if (asked.has(id)) return true;
    const [fam, rest] = split(id); if (!FAMS.includes(fam)) return false;
    if (fam === 'ap_cost:') return costSites.has(rest); // each cost site is its own question
    if (fam === 'immune:') return immuneAsked.has(rest) || isCondition(rest); // applyCond asks every condition id
    return askedFam.has(fam) || [...asked].some((a) => a.startsWith(fam)); // skill:, save_, passive:, technique:, momentum_needed: are asked for any suffix
  };

  it('the lint reads the source: it finds askers and answerers', () => {
    expect(asked.size).toBeGreaterThan(40); expect(answered.length).toBeGreaterThan(50); expect(costSites.size).toBeGreaterThan(15);
  });
  it('every id an item answers is declared (a typo, or a stat nobody added to effects/stats.ts)', () => {
    expect(answered.filter((a) => !isStatId(a.id) && !FAMS.includes(a.id)).map((a) => a.id + ' @ ' + a.at)).toEqual([]);
  });
  it('every id an item answers is ASKED somewhere (an answer nobody asks does nothing: the Field Medic bug)', () => {
    expect(answered.filter((a) => !FAMS.includes(a.id) && !isAsked(a.id)).map((a) => a.id + ' @ ' + a.at + ': nothing calls statQuery / actionAp / immune with it')).toEqual([]);
  });
  it('every id the engine asks is declared', () => {
    expect([...asked].filter((id) => !isStatId(id))).toEqual([]);
    expect([...askedFam].filter((f) => !FAMS.includes(f))).toEqual([]);
  });
  it('every declared plain stat is asked (a declared stat nothing reads is dead)', () => {
    expect(Object.keys(STATS).filter((id) => !asked.has(id))).toEqual([]);
  });
  it('COST_SITES is exactly the set of sites actionAp() is called with, plus the one alias "heal"', () => {
    expect([...costSites].sort()).toEqual([...COST_SITE_IDS].sort());
    expect([...COST_SITES].sort()).toEqual([...COST_SITE_IDS, 'heal'].sort());
  });
  it('immune() is asked only about declared things', () => {
    expect([...immuneAsked].filter((w) => !(IMMUNE_IDS as readonly string[]).includes(w) && !isCondition(w))).toEqual([]);
  });
});

// ============================================================================================ F6: the kit
describe('F6: the kit is the only home of the lane helpers (src/kit.ts)', () => {
  const notKit = (rel: string) => rel === 'kit.ts';
  it('no private copy of a kit helper: import it from kit.ts', () => {
    const copies = hits(/^(?:export )?(?:const|function) (?:overworld|isOverworld|rngOf|foesOf|alliesOf|around|tilesWithin|areaOf|lineTiles|segTiles|freeTile|onMap|tileOf|inBounds|canStand|tilesAround|tilesLine)\b/m, notKit);
    expect(copies.filter((c) => !/perks\/f\.ts:\d+\s+const onMap/.test(c) /* a story NPC lookup that shares the name */ && !/classes\/i\.ts:\d+\s+const freeTile/.test(c) /* "an EMPTY tile to place an object on", not "can a unit stand" */ && !/ai-sigil\.ts:\d+\s+function lineTiles/.test(c) /* the caster AI's walkable Line */)).toEqual([]);
  });
  it('no lane writes its own say() or unitById(): they are in kit.ts', () => {
    expect(hits(/^const (?:say|unitById) = \((?:cb: Combat)/m, notKit)).toEqual([]);
  });
  it('nothing rolls on a fixed seed: { state: 1 } is only the scratch rng of a preview', () => {
    const allowed: Record<string, number> = { 'calls/core.ts': 2, 'physical/core.ts': 2, 'perks/h.ts': 1 };
    const found: Record<string, number> = {}; for (const h of hits(/\{ state: 1 \}/)) { const f = h.split(':')[0]; found[f] = (found[f] || 0) + 1; }
    expect(found, 'a new { state: 1 }: use rngOf(h, ctx) from kit.ts (it throws when no rng is in reach); a preview that must not move the dice is the one exception, and is counted here').toEqual(allowed);
  });
});
