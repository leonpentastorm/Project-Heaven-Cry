// @ts-nocheck (it reads the source files: this package has no node types; vitest runs it)
// THE FOUNDATION LINT (engine foundations 1). These tests read the engine's SOURCE and fail when someone goes round
// one of the shared primitives. Each failure message says what to call instead. See
// docs/design/handoffs/engine-foundations-1.md, "How to add things".
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { STATS, STAT_FAMILIES, COST_SITE_IDS, COST_SITES, IMMUNE_IDS, isStatId, isCondition } from '../src';
import ACTIONS_JSON from '../../../data/actions.json';
import CLASSES_JSON from '../../../data/classes.json';
import TENDING_JSON from '../../../data/tending.json';
import LINT_PATTERNS from './lint-patterns.json';
/** A pattern shared with tools/built_from.py (test/lint-patterns.json): one list, read by both. */
const RE = (id: string) => new RegExp((LINT_PATTERNS as any).patterns[id].re);

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
const SITE_OF: Record<string, string> = Object.fromEntries([...(ACTIONS_JSON as any).items, ...Object.entries((ACTIONS_JSON as any).costs || {}).map(([id, v]: any) => ({ id, ...v }))].filter((x: any) => x.site).map((x: any) => [x.id, x.site]));
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
    // cost sites: price(x, '<action>', …) (effects/cost.ts) asks 'ap_cost:<site>' for the action's site (data/actions.json `site`, default the id)
    for (const m of f.code.matchAll(/\b(?:price|affords)\(\s*(?:\{[^{}]*\}|cb, u),\s*([^,)]+)[,)]/g)) { if (f.rel === 'effects/cost.ts') continue; const lit = [...m[1].matchAll(/'([a-z_0-9]+)'/g)].map((x) => x[1]); for (const s of lit) costSites.add(SITE_OF[s] || s); if (!lit.length && !/^def\.id$|^action$|^id$|^site$|^h\.key/.test(m[1].trim())) throw new Error('price() with an action the lint cannot read: ' + f.rel + ':' + lineOf(f.code, m.index!) + ' ' + m[0]); }
    // actions.ts prices the basic actions from data/actions.json (`site as CostSite`, asked only when the site is declared)
    // rules 1.33: a data grant_action that names its cost site (Triage: 'triage') is priced there (effects/actions.ts costOf)
    if (f.rel === 'effects/actions.ts') { const walk = (o: any): void => { if (Array.isArray(o)) o.forEach(walk); else if (o && typeof o === 'object') { if (o.op === 'grant_action' && typeof o.site === 'string') costSites.add(o.site); Object.values(o).forEach(walk); } }; walk([CLASSES_JSON, TENDING_JSON]); }
    if (f.rel === 'actions.ts') for (const x of (ACTIONS_JSON as any).items) { const site = x.site || x.id; if ((COST_SITE_IDS as readonly string[]).includes(site)) costSites.add(site); } // (a row with no site of its own and no fixed AP is priced by its own pipeline: Move by tiles)
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
  it('RATCHET (Classes 3.0 P5): a lane walks cb.units by hand to pick a set of units: count per file, only ever lower', () => {
    // The door is an item op's `targets` (effects/triggers.ts selectUnits, over kit.ts unitsIn / foesOf / alliesOf): an
    // item that does "to every enemy within 3 of the body" is data. Each number is what the perks and class lanes still
    // walk by hand (the six aura items, Rally, Rally Cry, Grim Reaper, The Name They Whisper, Lingering Dread... see the
    // step 1a hand-off for why each could not move yet). Never raise one; lower it when a lane moves onto targets.
    const LEFT: Record<string, number> = { 'classes/i.ts': 10, 'classes/j.ts': 15, 'classes/k.ts': 20, 'classes/rev3.ts': 2, 'perks/a.ts': 2, 'perks/b.ts': 9, 'perks/c.ts': 15, 'perks/d.ts': 11,
      'perks/e.ts': 13, 'perks/f.ts': 17, 'perks/g.ts': 8, 'perks/h.ts': 4, 'perks/skeleton.ts': 4 };
    const got: Record<string, number> = {};
    for (const h of hits(/\bcb!?\.units\.(?:filter|find|some|every|forEach)\b|\bof cb!?\.units\b/, (rel) => !/^(perks|classes)\//.test(rel))) { const f = h.split(':')[0]; got[f] = (got[f] || 0) + 1; }
    expect(got).toEqual(LEFT);
  });
  it('no lane writes its own say() or unitById(): they are in kit.ts', () => {
    expect(hits(/^const (?:say|unitById) = \((?:cb: Combat)/m, notKit)).toEqual([]);
  });
  it('nothing rolls on a fixed seed: { state: 1 } is only the scratch rng of a preview', () => {
    const allowed: Record<string, number> = { 'calls/core.ts': 2, 'physical/core.ts': 2, 'perks/h.ts': 1, 'preview.ts': 2 } // (preview.ts: the one engine dry run, on a copy);
    const found: Record<string, number> = {}; for (const h of hits(/\{ state: 1 \}/)) { const f = h.split(':')[0]; found[f] = (found[f] || 0) + 1; }
    expect(found, 'a new { state: 1 }: use rngOf(h, ctx) from kit.ts (it throws when no rng is in reach); a preview that must not move the dice is the one exception, and is counted here').toEqual(allowed);
  });
});

// ============================================================================================ F1: the rolls
describe('F1: every d20 goes through src/rolls.ts', () => {
  const rolls = (rel: string) => rel === 'rolls.ts' || rel === 'rng.ts';
  it('no raw d20( outside rolls.ts: roll a save with saveAgainst / rollSave, anything else with rollVs or contest', () => {
    expect(hits(RE('raw_d20'), rolls)).toEqual([]);
  });
  it('the bare die (rollD20) is only for the rolls that are not "d20 + modifier against a number": each use is counted here', () => {
    // combat.ts: initiative ×2, the weapon attack (its own hooks: attack_roll), the death save (a hook sees the die first)
    // game.ts: asking a voice (it may have no hook to roll against), the story check (its own hooks: check_post), staying hidden (its own hook)
    // tactics.ts: spotting (the 'spot' hook may change the die); sigil.ts and magic.ts: a spell's to-hit ('spell_roll' sees the die first)
    // classes/k.ts: the Stitch (a bare d20 read off a table) and its reroll; classes/i.ts: story Puppet (the Narrator adds the target's modifier)
    // perks/b.ts: a night's Vigilance (the modifier is gathered after the die, as it always was)
    const allowed: Record<string, number> = { 'combat.ts': 4, 'game.ts': 3, 'tactics.ts': 1, 'sigil.ts': 1, 'magic.ts': 1, 'classes/k.ts': 2, 'classes/i.ts': 1, 'perks/b.ts': 1 };
    const found: Record<string, number> = {}; for (const h of hits(RE('bare_die'), rolls)) { const f = h.split(':')[0]; found[f] = (found[f] || 0) + 1; }
    expect(found, 'a new rollD20(): if it is d20 + a modifier against a number, call rollVs / saveAgainst instead; if it truly is a bare die, add it to this table with the reason').toEqual(allowed);
  });
  it('no hand-written pass / fail: "die === 20 || (die !== 1 && …)" is judge() in rolls.ts', () => {
    expect(hits(/=== 20 \|\| \(\s*\w+ !== 1 &&/, rolls)).toEqual([]);
    expect(hits(/=== 1 \|\| \(\s*!?\w+(?: !== 20)? && \w+ < /, rolls)).toEqual([]);
  });
  it('no private tier table and no literal save base: tierSave / tierStrength / saveTn / SAVE_TN', () => {
    expect(hits(/\b(?:TIER_SAVE|NPC_SAVE|TIER_DEBUFF)\b/, rolls)).toEqual([]);
    expect(hits(/\b12 \+ (?:unitStrength|strengthFor|strengthOf)\(/, rolls)).toEqual([]);
  });
});

// ============================================================================================ F2: forced movement
describe('F2: a unit changes tile by moveUnit (it walks) or displace / swapUnits (it is moved): combat.ts', () => {
  it('no new write to `.pos`: every one left is counted here, with what it is', () => {
    // A unit is moved with displace(cb, rng, unit, { away | toward | tile }, { by, how, source }) or swapUnits(...)
    // (combat.ts): they ask Nailed, the knockback immunity and the 'forced_move' hook, use the one "can it stand
    // there" rule, and run the trap, the field and the hazard of every tile entered. A bare `unit.pos = tile` skips
    // all of that. What is counted below is NOT a move:
    //   combat.ts 11   moveUnit's step (1) and its opportunity-strike replay (2), displace (2) and swapUnits (2), the fog's "as if it walked there" probe (2), an opportunity strike struck from the tile it left (2)
    //   game.ts 2      the area map: an NPC walks, characters are placed when a scratch fight is built
    //   scratch tiles  "stand it there, measure, put it back" (a set and a restore each): sigil.ts 2, ai-sigil.ts 2, ai-soul.ts 2, calls/rules.ts 2,
    //                  physical/core.ts 2 (standingAt), physical/ranged/takes.ts 1 (restored by Object.assign), physical/ranged/sets.ts 2, classes/i.ts 2, classes/k.ts 2 (fromLink), classes/rev3.ts 4
    //   a walk vetoed  inside 'move_step' the walker is put back on the tile it came from: physical/melee/links.ts 1, classes/k.ts 1, perks/d.ts 1
    //   not a unit     a glyph, an object, a False Image: classes/k.ts 1, perks/c.ts 1, classes/rev3.ts 1
    const allowed: Record<string, number> = { 'combat.ts': 11, 'game.ts': 2, 'sigil.ts': 2, 'ai-sigil.ts': 2, 'ai-soul.ts': 2, 'calls/rules.ts': 2, 'physical/core.ts': 2, 'physical/ranged/takes.ts': 1, 'physical/ranged/sets.ts': 2,
      'physical/melee/links.ts': 1, 'classes/i.ts': 2, 'classes/k.ts': 4, 'classes/rev3.ts': 5, 'perks/d.ts': 1, 'perks/c.ts': 1 };
    const found: Record<string, number> = {}; for (const h of hits(RE('pos_write'))) { const f = h.split(':')[0]; found[f] = (found[f] || 0) + 1; }
    expect(found, 'a new `.pos = `: move the unit with displace() or swapUnits() (combat.ts), or moveUnit() if it walks. If it truly is not a move (a scratch tile put back, an object), add it to this table and say what it is').toEqual(allowed);
  });
  it('nothing fires the forced_move hook but displace and swapUnits', () => {
    expect(hits(/emit\(cb, 'forced_move'/, (rel) => rel === 'combat.ts')).toEqual([]);
  });
  it('one blocker list: no regex of object kinds decides where a unit may land', () => {
    expect(hits(/\/(?:barricade|pillar|crate)\|[a-z_|]+\/\.test\(o\.kind\)/)).toEqual([]);
  });
});

// ============================================================================================ the fight log (item 1600 a)
// Every line of a fight's log is written by say / sayOf / sayAt / unsay (log.ts), which keep each line's mark of who
// saw what it names (cb.logSee) beside it: fog.ts sends a player only the lines about what their side saw. A raw push,
// unshift or splice on a log writes a line every player reads, whatever it names, and shifts the marks off their lines.
describe('the fight log is written through say()', () => {
  it('no raw push, unshift or splice on a log outside the primitive (memory.ts\'s thread logs are not a fight\'s): call say(cb, line)', () => {
    const raw = hits(RE('log_raw'), (rel) => rel === 'memory.ts');
    expect(raw.map((h) => h.replace(/:\d+ /, ' '))).toEqual([
      'log.ts  .log.push(', 'log.ts  .log.push(', 'log.ts  .log.splice(', 'log.ts  .log.splice(', // say, sayOf, sayAt, unsay
    ]);
  });
});
