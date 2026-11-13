// @ts-nocheck (it reads the engine's own source files: node's fs, which the engine's tsconfig does not know)
// Base classes are weapon-neutral (Leon, 13 Nov 2026; docs/design/rev4-weapon-neutral-audit.md section 5,
// docs/design/rev4-moves-and-rename.md section 5). Every move a base class lists in its ranks, and every class-level
// `effects` block, must work with whatever the character attacks with: a gun, a bow, a blade, a fist or a thrown weapon.
// Three guards:
//   1. data: no effect (with its `and`, nested `effects`, `toggles[].effects`, and the condition rows it grants) reads a
//      weapon family: `if` with `melee`, `damage` melee/ranged, or a `mode` other than the move's allow-listed technique;
//      no `context`, `requires`, `needs` or `target` string that names a family;
//   2. text: no family word in a move's text, unless the move and the word are allow-listed with a reason;
//   3. code: a handler in packages/engine/src/classes/*.ts registered for a base-class move may not call isMelee(,
//      isRanged(, isHandgun(, shotgun(, test `category` or match /bow|thrown/, beyond its allow-listed count (a ratchet).
// The allow-list has two parts. DOOR: a move whose family word is its door's own (Momentum is melee's meter) or the
// incoming attack's; these stay. PENDING: moves locked today that other Classes 3.0 steps fix (the Skirmisher's step,
// Shadow, the Chaplain); each entry names its step. PENDING must be EMPTY by the end of the patch: when a step fixes a
// move, delete its entries here in the same commit (the test fails on an entry that no longer matches anything).
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { CLASSES, CONDITION_ROWS } from '../src';

const FAMILY = /\b(guns?|rifles?|pistols?|revolvers?|shotguns?|scatterguns?|bows?|arrows?|quivers?|magazines?|shells?|rounds?|blades?|melee|ranged|thrown|darts?)\b/gi;
const CODE = /isMelee\(|isRanged\(|isHandgun\(|shotgun\(|\bcategory\b|\/[^/\n]*\b(bow|thrown)\b[^/\n]*\//g;

interface Allow { words?: string[]; modes?: string[]; context?: boolean; code?: number; why: string }
/** Door's own and incoming attacks (audit section 5): these stay. */
const DOOR: Record<string, Allow> = {
  'class:fighter.lunge': { words: ['melee'], code: 2, why: 'Momentum is melee\'s door: Lunge strikes with the melee weapon or fists (reachOf, meleeAp); its hit builds Momentum only as a melee hit (isMelee)' },
  'class:fighter.riposte': { words: ['melee'], modes: ['riposte'], why: 'Momentum\'s door: a Riposte answers a melee miss; folded into the Answer (rules 1.30): its riders read the technique (mode riposte), the handler is gone' },
  'class:fighter.finisher': { words: ['melee'], code: 1, why: 'Momentum\'s door: the Finisher is a melee strike' },
  'class:defender.anchor': { words: ['melee'], why: 'every opportunity attack is a melee strike (base rule), not the class\'s choice' },
  'class:defender.brace': { words: ['weapon attack'], why: 'Interpose answers an enemy\'s weapon attack (the incoming attack)' },
  // The Skirmisher's step (rules 1.30): neutral in rule; what stays is a door or a branch, never a lock.
  'class:marksman.fire_discipline': { modes: ['aimed'], why: 'the lead\'s ruling (13 Nov 2026): Aimed is the technique\'s own mode (+1 to hit); the 3-AP discount is any family\'s; Heat (the gun\'s door) is read from the weapon\'s heat_limit, not its family' },
  'class:marksman.special_ammo': { words: ['magazine', 'quiver'], code: 1, why: 'any weapon takes a load; the text says the form it takes (a magazine, a quiver, else a load of attacks); the one code read is the reload effect\'s art (fx cat)' },
  'class:marksman.killzone': { code: 2, why: 'any weapon holds: a melee weapon holds strikes at its reach (a branch, not a refusal); an aimed hold needs a weapon that aims (the Aimed technique)' },
  'class:gunslinger.called_shot': { code: 2, why: 'any weapon (rules 1.32): it reads the family only to make the weapon\'s plain attack (a strike in reach, a throw, else a shot): a branch, never a refusal' },
  'class:marksman.duck_and_roll': { words: ['ranged'], code: 1, why: 'it answers an enemy\'s ranged attack at you (the incoming attack)' },
  // Field Fix left the Operative (rules 1.32): its entry comes back with the Rigger's step (8), worded as it was:
  // { words: ['jammed weapon', 'gun'], why: 'support: it clears an ally\'s jam (a gun\'s own state), not a hit' }
};
/** Locked today; fixed by another Classes 3.0 step. MUST shrink to empty before the patch ships. */
const PENDING: Record<string, Allow> = {
  // The Shadow step (rules 1.32) put Called Shot in the Operative and made Toxin coat any weapon: both left this list.
  // The Chaplain's step (chaplain-spec.md, audit 4.7)
  'class:lumeri_templar.judgement': { words: ['melee', 'scattergun', 'shotgun'], code: 5, why: 'Chaplain step: Verdict, one attack with any weapon; the shotgun gate goes' },
  // Blessed Shells is neutral in rule, text and code (any weapon hit releases it); its name, tag `guns` and story action
  // say guns: the Chaplain step renames them (Blessed Arms, tag weapon). Nothing here guards a name or a tag.
};
const ALLOW = (key: string): Allow | undefined => DOOR[key] || PENDING[key];

/** Every move a base class lists in its ranks (resolved refs: the old key the engine runs). */
const MOVES: { cls: string; rank: string; m: any }[] = CLASSES.flatMap((c: any) => ['I', 'II', 'III'].flatMap((r) => (c.ranks?.[r]?.moves || []).map((m: any) => ({ cls: c.id, rank: r, m }))));
/** Class-level effects blocks (Revision 4 "better": none in data yet; the walk covers them when they come). */
const CLASS_BLOCKS: { cls: string; effects: any[] }[] = CLASSES.filter((c: any) => Array.isArray(c.effects)).map((c: any) => ({ cls: c.id, effects: c.effects }));
const ROW: Record<string, any> = Object.fromEntries(CONDITION_ROWS.map((r: any) => [r.id, r]));

/** Every effect under a list: `and`, nested `effects`, `toggles[].effects`, and the condition rows an op `condition` grants (once). */
function walk(effects: any[], seen = new Set<string>()): any[] {
  const out: any[] = [];
  for (const e of effects || []) {
    if (!e || typeof e !== 'object') continue;
    out.push(e);
    if (Array.isArray(e.and)) out.push(...walk(e.and, seen));
    if (Array.isArray(e.effects)) out.push(...walk(e.effects, seen));
    for (const t of e.toggles || []) out.push(...walk(t.effects || [], seen));
    if (e.op === 'condition' && typeof e.condition === 'string' && ROW[e.condition] && !seen.has(e.condition)) { seen.add(e.condition); out.push(...walk(ROW[e.condition].effects || [], seen)); }
  }
  return out;
}
/** A round of time ("for 1 round", "each round") is not a round of ammunition: those are taken out before the word test. */
const TIME = /\b(#|\d+|a|an|one|two|three|each|per|every|this|that|next|same|following)\s+rounds?\b|\brounds?\s+(after|later|running|in a row)\b|\bend of (the|its|your) round\b/gi;
const words = (s: string) => [...String(s).replace(/_/g, ' ').replace(TIME, ' ').matchAll(FAMILY)].map((x) => x[0].toLowerCase());

function dataProblems(key: string, effects: any[], toggles: any[] = []): string[] {
  const a = ALLOW(key), out: string[] = [];
  for (const e of walk([...effects, ...toggles.flatMap((t: any) => t.effects || [])])) {
    const c = e.if || {};
    if (c.melee != null) out.push(key + ': if.melee');
    for (const d of [].concat(c.damage || [])) if (d === 'melee' || d === 'ranged') out.push(key + ': if.damage ' + d);
    for (const m of [].concat(c.mode || [])) if (!(a?.modes || []).includes(m)) out.push(key + ': if.mode ' + m);
    for (const f of ['context', 'requires', 'needs', 'target']) {
      const v = e[f]; if (typeof v !== 'string') continue;
      if (words(v).length && !a?.context) out.push(key + ': ' + f + ' "' + v + '"');
    }
  }
  return out;
}
function textProblems(key: string, text: string): string[] {
  const a = ALLOW(key), ok = (a?.words || []).map((w) => w.toLowerCase());
  const t = String(text || '').replace(/\{=[^}]*\}/g, '#').toLowerCase();
  const left = ok.reduce((s, w) => s.split(w).join(' '), t); // an allowed phrase ("weapon attack", "jammed weapon") is taken out whole
  return [...new Set(words(left))].map((w) => key + ': text "' + w + '"');
}

// ---------- the code: each handler's block in classes/*.ts ----------
const DIR = fileURLToPath(new URL('../src/classes/', import.meta.url));
const code = (s: string) => s.split('\n').filter((l) => !/^\s*(\/\/|\*)/.test(l)).map((l) => l.replace(/\/\/ .*$/, '')).join('\n');
/** handler id ("fighter.lunge") → the count of family reads in its register({...}) block, plus those of the file's
 * one-line top-level helpers it calls (`const coatable = (u) => … isMelee(w) …`, the way Toxin reads the family). */
function codeReads(): Record<string, number> {
  const out: Record<string, number> = {};
  for (const f of readdirSync(DIR).filter((x) => x.endsWith('.ts'))) {
    const src = readFileSync(DIR + f, 'utf8'), parts = src.split(/\nregister\(\{\n/);
    const helpers: Record<string, number> = {};
    for (const m of src.matchAll(/^(?:export )?const (\w+) = (.*)$/gm)) { const n = [...code(m[2]).matchAll(CODE)].length; if (n) helpers[m[1]] = n; }
    for (const p of parts.slice(1)) {
      const id = p.match(/^\s*id: '([a-z_]+\.[a-z_]+)'/)?.[1]; if (!id) continue;
      const body = code(p.split(/\n\}\);\n/)[0]);
      let n = [...body.matchAll(CODE)].length;
      for (const [h, k] of Object.entries(helpers)) if (new RegExp('\\b' + h + '\\(').test(body)) n += k;
      out[id] = (out[id] || 0) + n;
    }
  }
  return out;
}

describe('base classes are weapon-neutral (Leon, 13 Nov 2026; rev4-weapon-neutral-audit.md section 5)', () => {
  it('the walk reaches every base-class move (54) and no class-level block names a family in data', () => {
    expect(MOVES.length).toBe(54);
    const bad = CLASS_BLOCKS.flatMap((b) => dataProblems('class:' + b.cls, b.effects));
    expect(bad).toEqual([]);
  });
  it('1. data: no move reads a weapon family (if melee, damage melee/ranged, mode, or a family in context/requires/needs/target)', () => {
    const bad = MOVES.flatMap(({ m }) => dataProblems(m.key, m.effects || [], m.toggles || []));
    expect(bad).toEqual([]);
  });
  it('2. text: no family word in a move\'s text outside the allow-list', () => {
    const bad = MOVES.flatMap(({ m }) => textProblems(m.key, m.text));
    expect(bad).toEqual([]);
  });
  it('3. code: no base-class move\'s handler reads a weapon family beyond its allowed count (a ratchet: counts only go down)', () => {
    const reads = codeReads(), bad: string[] = [];
    for (const { m } of MOVES) {
      const id = m.key.slice('class:'.length), n = reads[id] || 0, a = ALLOW(m.key), max = a?.code ?? 0;
      if (n > max) bad.push(m.key + ': ' + n + ' family reads in its handler, ' + max + ' allowed');
      if (a?.code != null && n < a.code) bad.push(m.key + ': ' + n + ' family reads now, the allow-list says ' + a.code + ': lower it (the ratchet only goes down)');
    }
    expect(bad).toEqual([]);
  });
  it('the allow-list names only base-class moves, and every PENDING entry still matches something (fixed moves leave the list)', () => {
    const keys = new Set(MOVES.map(({ m }) => m.key)), reads = codeReads(), stale: string[] = [];
    for (const k of [...Object.keys(DOOR), ...Object.keys(PENDING)]) expect(keys.has(k), k).toBe(true);
    for (const [k, a] of Object.entries(PENDING)) {
      const m = MOVES.find((x) => x.m.key === k)!.m;
      const saved = PENDING[k]; delete PENDING[k];
      const still = textProblems(k, m.text).length + dataProblems(k, m.effects || [], m.toggles || []).length + (reads[k.slice(6)] || 0);
      PENDING[k] = saved;
      if (!still) stale.push(k + ' (' + a.why + ')');
    }
    expect(stale).toEqual([]);
  });
});
