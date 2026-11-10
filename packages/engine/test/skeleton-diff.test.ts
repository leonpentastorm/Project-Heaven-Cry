// @ts-nocheck (a tool run by hand: it reads the engine by name and writes a file)
// Skeleton 2.0, Stage 0: the check tool. Every derived number for all 46 archetypes at levels 1, 6, 12 and 20, written
// as JSON so the pass can be compared before and after:
//   SKELETON_DIFF=/path/out.json npx vitest run --root packages/engine test/skeleton-diff.test.ts
// then tools/skeleton_diff.py before.json after.json. Without the variable it only checks that the table builds.
// Functions are read by name from the engine's exports, so the tool runs on the old and the new skill web alike (a
// name that doesn't exist yet is written as null).
import { describe, it, expect } from 'vitest';
import { writeFileSync } from 'node:fs';
import * as E from '../src';

const A: any = E as any;
const SKILLS: any[] = A.SKILLS, ARCH: any[] = A.ARCHETYPES;
const call = (name: string, ...args: any[]) => { try { const f = A[name]; if (typeof f !== 'function') return null; const v = f(...args); return typeof v === 'number' ? Math.round(v * 1000) / 1000 : v; } catch { return null; } };
/** The archetype's sheet grown to a level: the points a career gives by then (rules 1.11: odd levels 2 Skill points,
 * even levels 1 Skill and 1 Attribute point), put where the archetype already leans, highest first. Legality isn't
 * checked beyond Skill ≤ Attribute ≤ 10: this is a yardstick, not a build planner. */
function grown(a: any, level: number) {
  const skills: Record<string, number> = { ...a.preset }, attrs: Record<string, number> = { ...a.attributes };
  const order = Object.keys(skills).sort((x, y) => skills[y] - skills[x] || (x < y ? -1 : 1));
  let sp = 0; for (let l = 2; l <= level; l++) sp += l % 2 ? 2 : 1;
  for (let i = 0, guard = 0; sp > 0 && guard < 400; guard++, i = (i + 1) % order.length) { const s = order[i]; if (skills[s] < 10) { skills[s]++; sp--; } else if (order.every((k) => skills[k] >= 10)) break; }
  for (const s of order) { const at = SKILLS.find((k) => k.id === s)?.attribute; if (at && (attrs[at] || 1) < skills[s]) attrs[at] = skills[s]; }
  return { skills, attrs };
}
function row(a: any, level: number) {
  const g = grown(a, level);
  const c: any = A.newCharacter('x', 'p', { name: a.name, portrait: '', origin: 'Thousand-Planet frontier', kit: 'soldier', traits: [], skills: { ...a.preset }, attrs: { ...a.attributes }, cores: { ...(a.cores || {}) }, identity: {} });
  Object.assign(c.skills, g.skills); Object.assign(c.attrs, g.attrs); c.level = level;
  const out: Record<string, any> = { id: a.id, level };
  for (const f of ['maxHp', 'hpPerLevel', 'initiativeBonus', 'movement', 'carryLimit', 'physicalMult', 'critMult', 'healingMult', 'healReceivedMult', 'shieldReceivedMult', 'maxMp', 'sigilMult', 'soulMult', 'elementalMult',
    'sigilCoreSaving', 'sigilRangeBonus', 'soulRangeBonus', 'readyDesigns', 'critTakenPct', 'ambushTakenPct', 'maxSigilWords', 'glyphAp', 'soulCostSaving', 'syphonMult', 'prayerCooldown', 'injuryResistPct']) out[f] = call(f, c);
  for (const fam of ['body', 'brain', 'heart']) { out['save_' + fam] = call('saveBonus', c, fam); } // debuff_<family> is gone (rules 1.13): strengths are by source, below
  // strengths by source (Skeleton 2.0's strengthOf), once it exists
  for (const s of SKILLS) if (s.slot === 'alpha' || s.slot === 'gamma') { const v = call('strengthOf', c, s.id); if (v != null) out['strength_' + s.id] = v; }
  for (const s of SKILLS) { out['mod_' + s.id] = call('mod', c.skills[s.id] || 0); const cm = call('checkMod', c, s.id); if (cm != null) out['check_' + s.id] = cm; out['passive_' + s.id] = call('passive', c, s.id); }
  return out;
}

describe('Skeleton 2.0 check tool', () => {
  it('builds the table for every archetype at levels 1, 6, 12 and 20', () => {
    const rows = ARCH.flatMap((a) => [1, 6, 12, 20].map((l) => row(a, l)));
    expect(rows.length).toBe(ARCH.length * 4);
    expect(rows.every((r) => typeof r.maxHp === 'number')).toBe(true);
    if (process.env.SKELETON_DIFF) writeFileSync(process.env.SKELETON_DIFF, JSON.stringify(rows));
  });
});
