// @ts-nocheck (it reads the engine's own source files: node's fs, which the engine's tsconfig does not know)
// Step a6 of the damage-formula migration (docs/design/handoffs/unified-damage-stage-a.md): the numbers an item deals,
// heals or shields with live in its DATA (an `amounts` block), read through effects/amounts.ts. Three cheap checks:
//   1. THE LEDGER: every number moved out of TypeScript is still the number the code had (the old literal is written
//      here, once, as it stood on the day it moved: 12 Nov 2026). A re-fit changes the data AND this line, on purpose.
//   2. Every (key, name) the engine's source asks itemAmount / amountMult / amountBlock for exists in the data.
//   3. THE LINT: no numeric literal in the amount handed to a damage, heal or shield sink (harm, hurtUnit, heal,
//      healUnit, grantShield, applyDamage) anywhere in src/, and no HP or shield written with one in classes/ or
//      perks/. 0, 1 and 100 are not amounts (a guard, an identity, a percent). What is still written in code, and why,
//      is the short ALLOWED list below: a new line there needs a reason.
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync, statSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { join, relative } from 'node:path';
import { amountBlock, amountMult, itemAmount } from '../src/effects/amounts';
import { term } from '../src/effects/output';

const SRC = fileURLToPath(new URL('../src', import.meta.url));
const files = (dir: string): string[] => readdirSync(dir).flatMap((f) => { const p = join(dir, f); return statSync(p).isDirectory() ? files(p) : p.endsWith('.ts') ? [p] : []; });
const SOURCES = files(SRC).map((p) => ({ rel: relative(SRC, p).replace(/\\/g, '/'), text: readFileSync(p, 'utf8') }));

// ---------------------------------------------------------------------------------------------- 1. the ledger
/** [key, block, what the TypeScript said before step a6]. `base`, or per.<of>, or mults.<name>. */
const LEDGER: [string, string, Record<string, number>][] = [
  ['rule:flux_overload', 'damage', { base: 0, 'per.flux_over': 10 }],                                 // magic.ts flux(), classes/i.ts addFlux: 10 * over
  ['rule:school_rider', 'heal', { base: 30 }],                                                        // classes/soul.ts: 30 * healMult * sm * f
  ['condition:bleeding', 'tick', { base: 5 }], ['condition:burning', 'tick', { base: 10 }], ['condition:corroded', 'tick', { base: 5 }],
  ['feeling:love', 'heal', { 'mults.along_the_chain': 0.5 }],                                         // magic.ts: loveHeal(...) * 0.5
  ['class:warden.ward', 'shield', { base: 0, 'per.charge': 10 }],                                     // 10 * n * Healing given
  ['class:trickster.rewrite', 'shield_turned', { base: 30 }],                                         // floor(30 * Sigil multiplier)
  ['class:bard.mend', 'heal', { base: 9 }], // (Will Shield left in rules 1.31: the Chaplain's Ward is data)
  ['class:banner_dancer.rally_banner', 'shield', { base: 10 }], ['class:banner_dancer.sweep', 'heal', { base: 10 }],
  ['class:rtc_contractor.strike_call', 'damage', { base: 50 }], ['class:siege_engineer.sentry_turret', 'damage', { base: 20 }],
  ['class:spellslinger.inscribed_rounds', 'damage', { 'mults.word_share': 0.5 }],                     // floor(word damage / 2)
  ['class:storm_hand.gauntlet_infusion', 'damage', { base: 10 }], ['class:storm_hand.gauntlet_infusion', 'fire_extra', { base: 5 }], ['class:storm_hand.gauntlet_infusion', 'arc', { base: 5 }],
  ['class:storm_hand.discharge', 'damage', { base: 0, 'per.charge': 20 }],
  ['class:adamantile_knight.bulwark_of_will', 'shield', { base: 20 }], ['class:adamantile_knight.adamantile_plate', 'shield', { base: 0, 'per.guard': 10 }],
  ['class:grand_sigilist.enlarge', 'lava', { base: 10 }], ['class:grand_sigilist.enlarge', 'storm', { base: 15 }], ['class:grand_sigilist.enlarge', 'dome', { base: 20 }],
  ['class:grand_sigilist.enlarge', 'mend', { base: 10 }], ['class:grand_sigilist.enlarge', 'crush', { base: 10 }], ['class:grand_sigilist.enlarge', 'tripwire', { base: 10 }],
  ['class:grand_sigilist.enlarge', 'mortar', { base: 15 }], ['class:grand_sigilist.enlarge', 'mortar_splash', { base: 5 }], ['class:grand_sigilist.enlarge', 'sentinel', { base: 15 }],
  ['class:grand_sigilist.enlarge', 'sentinel_leaving', { base: 10 }], ['class:grand_sigilist.enlarge', 'bloodwell', { base: 5 }], ['class:grand_sigilist.enlarge', 'arc', { base: 10 }],
  ['class:grand_sigilist.enlarge', 'bloom', { base: 10 }],
  ['class:heartbinder.through', 'mirror', { 'mults.share': 0.5 }],                                    // floor(n / 2)
  ['class:vessel.inner_charge', 'heartbeat', { base: 0, 'per.forms': 10 }], ['class:vessel.release_strike', 'damage', { base: 15 }],
  ['class:infiltrator.field_fix', 'repair', { base: 20 }], ['class:infiltrator.sabotage', 'damage', { base: 30 }],
  ['perk:shrug_it_off', 'shield', { base: 0, 'per.max_hp': 0.1 }],
  ['perk:last_charge', 'shield', { base: 15 }], ['perk:last_charge', 'shield_by_armour', { base: 0, 'per.armour_class': 15 }],
  ['perk:trick_shot', 'ricochet', { 'mults.share': 0.5 }], ['perk:breaching_strike', 'slam', { 'mults.share': 0.5 }],
  ['perk:field_surgeon', 'patch', { base: 0, 'per.max_hp': 0.5 }],
  ['perk:clean_hands', 'shield', { 'mults.pct_of_max_hp_I': 15, 'mults.pct_of_max_hp_II': 25 }],
  ['trait:factory_made', 'repair', { base: 0, 'per.improvisation': 10 }],
  ['trait:crawler_blooded', 'chitin', { base: 0, 'per.damage': 0.3 }], ['trait:crawler_blooded', 'blessing_burn', { base: 10 }],
  ['trait:grenadiers_arm', 'damage', { base: 10, 'per.kg': 0.25 }],                                   // (10 + kg / 4) * Physical multiplier
  ['trait:drone_handler', 'repair', { base: 0, 'per.mastery': 10 }],
];
describe('a6: the ledger (what moved from TypeScript into data is the same number)', () => {
  it('every block holds the number the code had', () => {
    for (const [key, name, want] of LEDGER) {
      const b: any = amountBlock(key, name);
      for (const [path, v] of Object.entries(want)) {
        const got = path === 'base' ? b.base : path.startsWith('per.') ? (b.per || []).find((p: any) => p.of === path.slice(4))?.value : b.mults?.[path.slice(6)];
        expect(got, key + ' ' + name + ' ' + path).toBe(v);
      }
    }
  });
  it('itemAmount is the base, its per-point parts, then each multiplier in turn; a missing block or multiplier throws', () => {
    expect(itemAmount('class:storm_hand.discharge', 'damage', [term(1.35, 'stat')], { charge: 3 })).toBe(20 * 3 * 1.35);
    expect(itemAmount('trait:grenadiers_arm', 'damage', [term(1.6, 'stat')], { kg: 70 })).toBe((10 + 70 / 4) * 1.6);
    expect(itemAmount('perk:shrug_it_off', 'shield', [], { max_hp: 145 })).toBe(0.1 * 145);
    expect(amountMult('perk:trick_shot', 'ricochet', 'share')).toBe(0.5);
    expect(() => amountBlock('perk:shrug_it_off', 'nothing')).toThrow(/No amount block/);
    expect(() => amountBlock('perk:no_such_perk', 'shield')).toThrow(/No amount block/);
    expect(() => amountMult('perk:trick_shot', 'ricochet', 'nothing')).toThrow(/No multiplier/);
  });
});

// ---------------------------------------------------------------------------------------------- 2. every block asked for exists
describe('a6: every amount block the source asks for is in the data', () => {
  it('itemAmount, amountMult and amountBlock name blocks (and multipliers) that exist', () => {
    let n = 0;
    for (const f of SOURCES) {
      for (const m of f.text.matchAll(/\b(itemAmount|amountBlock)\('([^']+)', '([^']+)'/g)) { expect(() => amountBlock(m[2], m[3]), f.rel + ': ' + m[0]).not.toThrow(); n++; }
      for (const m of f.text.matchAll(/\bamountMult\('([^']+)', '([^']+)', '([^']+)'/g)) { expect(() => amountMult(m[1], m[2], m[3]), f.rel + ': ' + m[0]).not.toThrow(); n++; }
      // a key or a name that is not a plain string cannot be checked here: write them out
      for (const m of f.text.matchAll(/\b(itemAmount|amountBlock|amountMult)\((?!')[^)]{0,40}/g)) if (f.rel !== 'effects/amounts.ts' && f.rel !== 'effects/core.ts' && f.rel !== 'effects/triggers.ts' /* the generic deal / mend ops (and the item ops' deal / mend): the name comes from data, which the validator checks */) expect.fail(f.rel + ': ' + m[0] + ' (write the key and the name as plain strings, so that this test can check them)');
    }
    expect(n).toBeGreaterThan(50);
  });
});

// ---------------------------------------------------------------------------------------------- 3. the lint
/** Which argument of each sink is the amount. */
const AMOUNT_ARG: Record<string, number> = { harm: 4, hurtUnit: 1, heal: 1, healUnit: 2, grantShield: 2, applyDamage: 2 };
const NOT_AN_AMOUNT = new Set(['0', '1', '100']);
/** Still written in code, with the reason. Key: file + the amount as written. */
const ALLOWED: Record<string, string> = {
  'classes/j.ts: o.hp + 20': 'Bulwark Line: an object\'s HP (cover), which has a sink of its own on purpose (objects have no armour types or shields)',
};
function calls(text: string): { fn: string; arg: string; at: number }[] {
  const out: { fn: string; arg: string; at: number }[] = [];
  for (const m of text.matchAll(/(?<![\w.])(harm|hurtUnit|heal|healUnit|grantShield|applyDamage)\(/g)) {
    const fn = m[1]; let i = m.index! + m[0].length, depth = 1, cur = '', q = ''; const args: string[] = [];
    if (/function\s+$/.test(text.slice(Math.max(0, m.index! - 12), m.index!))) continue; // its own definition
    const ls = text.lastIndexOf('\n', m.index!) + 1; if (/^\s*(\/\/|\*|\/\*)/.test(text.slice(ls, m.index!))) continue; // a comment
    while (i < text.length && depth > 0) {
      const ch = text[i];
      if (q) { cur += ch; if (ch === '\\') { cur += text[++i]; } else if (ch === q) q = ''; }
      else if (ch === "'" || ch === '"' || ch === '`') { q = ch; cur += ch; }
      else if ('([{'.includes(ch)) { depth++; cur += ch; }
      else if (')]}'.includes(ch)) { depth--; if (depth > 0) cur += ch; }
      else if (ch === ',' && depth === 1) { args.push(cur); cur = ''; }
      else cur += ch;
      i++;
    }
    args.push(cur);
    if (args.length > AMOUNT_ARG[fn]) out.push({ fn, arg: args[AMOUNT_ARG[fn]].trim(), at: m.index! });
  }
  return out;
}
const literals = (expr: string): string[] => [...expr.replace(/'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"/g, "''").matchAll(/(?<![\w.$])(\d+(?:\.\d+)?)(?![\w])/g)].map((m) => m[1]).filter((x) => !NOT_AN_AMOUNT.has(x));
describe('a6: the lint (no new numeric damage, heal or shield literal in TypeScript)', () => {
  it('the lint sees what it is meant to see', () => {
    expect(calls("x = harm(cb, rng, u, t, 20 * n * (u.mg?.elemMult || 1), 'elemental');")[0].arg).toBe('20 * n * (u.mg?.elemMult || 1)');
    expect(literals('20 * n * (u.mg?.elemMult || 1)')).toEqual(['20']);
    expect(literals("itemAmount('class:storm_hand.discharge', 'damage', [term(u.mg?.elemMult || 1, 'stat')], { charge: n })")).toEqual([]);
    expect(literals('Math.floor(ctx.n / 2)')).toEqual(['2']);
    expect(calls('hurtUnit(v, 50, false, cb)')[0].arg).toBe('50');
    expect(SOURCES.reduce((n, f) => n + calls(f.text).length, 0)).toBeGreaterThan(100);
  });
  it('no numeric literal in the amount handed to harm, hurtUnit, heal, healUnit, grantShield or applyDamage', () => {
    const found: string[] = [];
    for (const f of SOURCES) {
      if (f.rel === 'effects/output.ts' || f.rel === 'effects/damage.ts') continue;
      for (const c of calls(f.text)) { const lits = literals(c.arg); if (lits.length && !ALLOWED[f.rel + ': ' + c.arg]) found.push(f.rel + ':' + (f.text.slice(0, c.at).split('\n').length) + '  ' + c.fn + '( … ' + c.arg.slice(0, 140) + ' … )  literal ' + lits.join(', ')); }
    }
    expect(found, 'A number an item deals, heals or shields with belongs in its data (an `amounts` block, read with itemAmount: effects/amounts.ts):\n' + found.join('\n')).toEqual([]);
  });
  it('no HP or shield written with a numeric literal in classes/ or perks/', () => {
    const found: string[] = [];
    for (const f of SOURCES) {
      if (!/^(classes|perks)\//.test(f.rel)) continue;
      f.text.split('\n').forEach((line, i) => {
        if (/^\s*(\/\/|\*)/.test(line)) return;
        for (const m of line.matchAll(/\.(hp|shield)\s*(?:\+|-)?=(?!=)\s*([^;]*);/g)) { const lits = literals(m[2]); if (lits.length && !ALLOWED[f.rel + ': ' + m[2].trim()]) found.push(f.rel + ':' + (i + 1) + '  .' + m[1] + ' = ' + m[2].trim().slice(0, 140) + '  literal ' + lits.join(', ')); }
      });
    }
    expect(found, 'HP and shields are written by the sinks, from an amount in data:\n' + found.join('\n')).toEqual([]);
  });
});
