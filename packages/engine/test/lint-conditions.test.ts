// @ts-nocheck (it reads the source files: this package has no node types; vitest runs it)
// THE LINT of engine foundations 2 (conditions; the area shapes of the kit). Each test fails with a sentence that says
// what to call instead. See docs/design/handoffs/engine-foundations-2-conditions.md, "How to add things".
import { describe, expect, it } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { CONDITION_NAMES, CONDITION_IDS, CONDITION_ROWS, condDef, condMods, isCondition } from '../src';

const SRC = fileURLToPath(new URL('../src', import.meta.url)), DATA = fileURLToPath(new URL('../../../data', import.meta.url));
function files(dir: string, ext: string): string[] { return readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p, ext) : p.endsWith(ext) ? [p] : []; }); }
/** Code only: comments and the bodies of string literals in backticks are left; `//` comments and block comments go. */
const code = (s: string) => s.replace(/\/\*[\s\S]*?\*\//g, (m) => m.replace(/[^\n]/g, ' ')).replace(/(^|[^:'"`\\])\/\/.*$/gm, '$1');
const SOURCES = files(SRC, '.ts').map((p) => ({ file: relative(SRC, p).replace(/\\/g, '/'), text: code(readFileSync(p, 'utf8')) }));
function hits(re: RegExp, skip: string[] = []): string[] {
  const out: string[] = [];
  // (u.condAt ||= {}).prone = … is the order book of a condition, not the flag: taken out of the line before it is read
  const clean = (l: string) => l.replace(/\(?[\w.!?]+\.condAt\b(?: \|\|= \{\}\))?[!?]*\.(prone|bleeding|dazed)\b/g, 'ORDER');
  for (const { file, text } of SOURCES) { if (skip.includes(file)) continue; text.split('\n').forEach((l, i) => { if (re.test(clean(l))) out.push(file + ':' + (i + 1) + ': ' + l.trim().slice(0, 140)); }); }
  return out;
}

const FLAG_WRITE = /\.(bleed|dazedNext|stunnedNext|prone|braced|nailed|downed|guardBrace)\b\s*(=[^=>]|\+=|-=|\+\+|--|\|\|=|\?\?=)|delete [\w.!?[\]]+\.(bleed|dazedNext|stunnedNext|prone|braced|nailed|downed|guardBrace)\b/;
const CONDS_WRITE = /\.conds\b[!?]*(\[[^\]]+\]|\.\w+)\s*(=[^=>]|\+\+|--|\+=|-=|\|\|=|\?\?=)|delete [\w.!?[\]]+\.conds\b|\.conds\s*(\|\||\?\?)?=[^=>]|\(\s*[\w.!]+\.conds\s*\|\|=|\.condFresh\b[^;]*?[^=!<>]=[^=>]/;
describe('F4: a condition goes on with applyCond and comes off with endCond', () => {
  it('the patterns bite: each kind of direct write is caught, and a read is not', () => {
    for (const bad of ['t.bleed = 3;', 'u.dazedNext = 1;', 'tgt.prone = true;', 'h.u!.braced = false;', 'delete target.nailed;', 't.downed = true;', 'u.bleed--;', 'att.stunnedNext = 1;', 'delete u.guardBrace;']) expect(FLAG_WRITE.test(bad), bad).toBe(true);
    for (const ok of ['if (u.bleed === 3) x();', 'const p = t.prone ? 1 : 0;', 'if (u.braced && !u.prone) y();', '{ downed: false, prone: true }', 'u.downedFails = 0;', 'if (t.bleed >= 2) z();']) expect(FLAG_WRITE.test(ok), ok).toBe(false);
    for (const bad of ['t.conds!.burning = 2;', '(t.conds ||= {}).commanded = 1;', 'delete u.conds!.disarmed;', 'u.conds = {};', 't.conds[id]++;', 'u.condFresh = u.condFresh.filter((x) => x !== id);', "h.u!.conds.augment_offline = 2;"]) expect(CONDS_WRITE.test(bad), bad).toBe(true);
    for (const ok of ['if (u.conds?.lowered != null) x();', 'const n = t.conds![boon];', 'Object.keys(t.conds || {})', 'if (t.conds[id] > 0 && t.conds[id] < 99) y();', 'const fresh = new Set(t.condFresh || []);', '{ conds: {}, shield: 0 }']) expect(CONDS_WRITE.test(ok), ok).toBe(false);
  });
  it('no file writes a condition flag or a unit state directly: unitstate.ts holds the one write of each', () => {
    const bad = hits(FLAG_WRITE, ['unitstate.ts']);
    expect(bad, 'Do not write u.bleed / u.dazedNext / u.prone / u.braced / u.nailed / u.downed / u.stunnedNext yourself.\n'
      + 'A CONDITION (Bleeding, Dazed, Prone): applyCond(cb, rng, by, target, \'bleeding\' | \'dazed\' | \'prone\', …, { skipSave: true }) and endCond(target, id, cb).\n'
      + 'The unit\'s own choice: setProne(cb, u, on). A UNIT STATE: setBraced(u, on), stagger(u, n), setDowned(u, on), setNailed(u, nail) (src/unitstate.ts).').toEqual([]);
  });
  it('Hidden is written only by rawHidden / startHidden; every other `.hidden =` is an object, an NPC, a hazard or a zone (counted)', () => {
    // .hidden is also a field of map objects, story NPCs, hazards, Sigil zones and piles. Those writes are counted here,
    // file by file; a new one in a file that is not listed, or one more in a listed file, is read as a unit's.
    const OBJECTS: Record<string, number> = { 'world.ts': 7, 'hazards.ts': 2, 'sigil.ts': 2, 'combat.ts': 4, 'game.ts': 8, 'containers.ts': 2, 'perks/g.ts': 1, 'perks/d.ts': 1, 'magic.ts': 1 };
    const got: Record<string, number> = {};
    for (const h of hits(/\.hidden\s*=[^=>]|delete [\w.!?[\]]+\.hidden\b/, ['unitstate.ts'])) { const f = h.split(':')[0]; got[f] = (got[f] || 0) + 1; }
    expect(got, 'A unit becomes Hidden with hide(cb, u) (tactics.ts: its own action), applyCond(…, \'hidden\') or hideAgain(cb, u); it is revealed with reveal(cb, u, why) or endCond(u, \'hidden\', cb). '
      + 'Never `u.hidden = …`. If the write you added is an object\'s, an NPC\'s, a hazard\'s or a zone\'s, raise that file\'s count in this test.').toEqual(OBJECTS);
  });
  it('the raw flag writes are called only by the condition block and the three places that own Hidden', () => {
    const ALLOWED: Record<string, string[]> = {
      rawBleed: ['magic.ts', 'combat.ts'], rawDazed: ['magic.ts', 'combat.ts'], rawProne: ['magic.ts'],
      rawHidden: ['magic.ts', 'tactics.ts', 'sigil.ts', 'effects/damage.ts'],
    };
    for (const [fn, ok] of Object.entries(ALLOWED)) {
      const users = [...new Set(hits(new RegExp('\\b' + fn + '\\('), ['unitstate.ts']).map((h) => h.split(':')[0]))].sort();
      expect(users, fn + ' is a raw write (no item is asked, nothing is logged). Call applyCond / endCond (magic.ts), or hide / reveal (tactics.ts).').toEqual([...ok].sort());
    }
  });
  it('no file but magic.ts (the condition block) writes u.conds or u.condFresh', () => {
    const bad = hits(CONDS_WRITE, ['magic.ts']);
    expect(bad, 'u.conds is written only in magic.ts. To put a condition on: applyCond. To end one: endCond. To change its rounds: setCondRounds(u, id, n). '
      + 'To put back ones it carried, or an item\'s own marker: restoreConds(u, { id: rounds }). To set some aside for a moment: condsAside(u, ids). To clear a unit: clearConds(u, cb).').toEqual([]);
  });
  it('one table: nothing but condtable.ts loads data/conditions.json, and no condition is described in TypeScript', () => {
    const loaders = hits(/conditions\.json['"]/).map((h) => h.split(':')[0]);
    expect([...new Set(loaders)], 'Read conditions through src/condtable.ts (CONDS, condDef, condMods, CONDITION_ROWS).').toEqual(['condtable.ts']);
    expect(hits(/\bconst (CONDS|FLAG_CONDS|ALIAS)\b/, ['condtable.ts']), 'The condition table is data/conditions.json; add a row there.').toEqual([]);
  });
  it('one injury table: rollInjury (combat.ts)', () => {
    expect(hits(/function \w*[iI]njur\w*\(/).map((h) => h.split(':')[0] + ' ' + (/function (\w+)/.exec(h) || [])[1]).sort(), 'An injury is rollInjury(rng, target, cb, by, called?) (combat.ts). Do not write a second table.').toEqual(['combat.ts rollInjury']);
  });
});

describe('F4: every condition id in code is a row of the data, and every row is used', () => {
  // the ids handed to the condition functions as a literal, and the names read off u.conds / condBy / condArg / condAt / condVia
  const arg = String.raw`(?:[^(),']|\((?:[^()]|\([^()]*\))*\))*`;
  const PATTERNS: RegExp[] = [
    new RegExp(String.raw`\bapplyCond(?:ition)?\(${arg},${arg},${arg},${arg},\s*'([a-z_]+)'`, 'g'),
    new RegExp(String.raw`\b(?:condOn|endCond|condSource|condArg|setCondRounds|condNotFresh|freshSave)\(${arg},\s*'([a-z_]+)'`, 'g'),
    /\b(?:condMods|condDef|condName|condText|condFamily|condRoundsOf|isBoon)\(\s*'([a-z_]+)'/g,
    /\.cond(?:s|By|Via|Arg|At)\b[!?]*\.([a-z_]+)\b/g,
  ];
  const used = new Map<string, string>();
  for (const { file, text } of SOURCES) for (const re of PATTERNS) for (const m of text.matchAll(re)) if (!used.has(m[1])) used.set(m[1], file);
  it('finds the ids (the scan works)', () => { expect(used.size).toBeGreaterThan(30); for (const id of ['bleeding', 'prone', 'guarded', 'fear', 'ldebuff', 'marked']) expect(used.has(id), id).toBe(true); });
  it('no condition id is used in code that the data does not have', () => {
    const names = new Set(CONDITION_NAMES);
    const unknown = [...used].filter(([id]) => !names.has(id)).map(([id, file]) => id + ' (' + file + ')');
    expect(unknown, 'These condition ids are not rows of data/conditions.json (nor a row\'s `key` or `aliases`). Add the row: the engine has no other table.').toEqual([]);
  });
  it('no row of the data is unused: something in the engine or the data applies, reads or ends it', () => {
    const others = files(DATA, '.json').filter((p) => !p.endsWith('conditions.json')).map((p) => readFileSync(p, 'utf8')).join('\n');
    const all = SOURCES.filter((s) => s.file !== 'condtable.ts').map((s) => s.text).join('\n');
    const orphan = CONDITION_ROWS.filter((r) => { const names = [r.id, r.key, ...(r.aliases || [])].filter(Boolean); return !names.some((n: string) => used.has(n) || new RegExp('[\'"]' + n + '[\'"]').test(all) || new RegExp('"' + n + '"').test(others)); }).map((r) => r.id);
    expect(orphan, 'A row of data/conditions.json that nothing in the engine or the data names. Use it or remove it.').toEqual([]);
  });
  it('every row loads, by one name each; a unit state is not a condition applyCond puts on', () => {
    expect(CONDITION_ROWS.length).toBeGreaterThanOrEqual(42);
    for (const r of CONDITION_ROWS) { const d = condDef(r.id)!; expect(d, r.id).toBeTruthy(); expect(d.id).toBe(r.id); expect(isCondition(r.id), r.id).toBe(r.engine !== 'state'); expect(CONDITION_IDS.includes(d.key), r.id).toBe(r.engine !== 'state'); }
    expect(CONDITION_ROWS.filter((r) => r.engine === 'state').map((r) => r.id).sort()).toEqual(['braced', 'downed', 'overwatch']);
    expect(CONDITION_ROWS.filter((r) => r.engine === 'flag').map((r) => r.id).sort()).toEqual(['bleeding', 'dazed', 'hidden', 'injured', 'prone']);
  });
  it('the numbers are the data\'s: what the engine applies is what the row says', () => {
    const row = (id: string) => CONDITION_ROWS.find((r) => r.id === id), eff = (id: string, op: string, key: string, val: string) => row(id).effects.find((e: any) => e.op === op && (e.stat || e.context || 'own_attacks') === key)?.[val];
    expect(condMods('guarded').defense).toBe(eff('guarded', 'stat_mod', 'defense', 'value')); expect(condMods('corroded').defense).toBe(eff('corroded', 'stat_mod', 'defense', 'value'));
    expect(condMods('slowed').moveMult).toBe(eff('slowed', 'stat_mod', 'move_mult', 'value')); expect(condMods('blinded').vision).toBe(eff('blinded', 'stat_mod', 'vision', 'value'));
    expect(condMods('shaken').save?.heart).toBe(eff('shaken', 'stat_mod', 'save_heart', 'value')); expect(condMods('weakened').dealtMult).toBe(1 + eff('weakened', 'stat_mod', 'damage_dealt_pct', 'value') / 100);
    expect(condMods('pinned').hit?.own_attacks).toBe(eff('pinned', 'attack_mod', 'own_attacks', 'value')); expect(condMods('fear').hit?.not_vs_source).toBe(eff('fear', 'attack_mod', 'not_vs_source', 'value'));
    expect(condMods('ldebuff').skills).toEqual([{ tag: 'core:mind', value: -2 }]); expect(condMods('dazed').ap).toBe(-2); expect(condMods('nausea').ap).toBe(-1);
    for (const id of ['slowed', 'blinded', 'guarded', 'withdrawing', 'corroded', 'nausea', 'suppressed', 'dazed', 'shaken', 'weakened', 'ldebuff', 'rdebuff', 'pinned', 'inspired', 'sharpened', 'hopeful', 'fear', 'grappled', 'scorned', 'marked', 'prone'])
      expect(Object.keys(condMods(id)).length, id + ' has numbers').toBeGreaterThan(0);
  });
});

describe('F6: an area is described once (kit.ts Area) and asked with tilesIn / unitsIn', () => {
  it('no private cone test, and no private coneUnits', () => {
    expect(hits(/[<>]=?\s*0\.7\b/, ['kit.ts']).filter((l) => /hypot|dl\)|\* dl|cos/i.test(l)), 'The cone is kit.ts: inArea({ shape: \'cone\', from, toward, n }, tile), tilesIn(cb, area), unitsIn(cb, area).').toEqual([]);
    expect(hits(/function coneUnits|const coneUnits/), 'unitsIn(cb, { shape: \'cone\', from, toward, n }) (kit.ts).').toEqual([]);
  });
  it('"everyone within r of a tile" is unitsIn(cb, { shape: \'burst\', at, r }): the five blast sites of 12 Nov stay gone', () => {
    const bad = hits(/cb\.units\.filter\(\(v\) => [^)]*dist\(v\.pos, tile\) <= (r|radius)\)/);
    expect(bad, 'unitsIn(cb, { shape: \'burst\', at: tile, r }, { downed: true }) (kit.ts).').toEqual([]);
  });
});
